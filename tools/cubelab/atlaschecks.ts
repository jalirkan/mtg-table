// mtg-table — the cube lab: the move atlas's post-spine checks over the frame logs (D451, D466; D480 runs them in parallel).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// After a spine's games, every rows file is checked (rowscheck.ts: shape, then ids against each seat's own frame log), every
// random seat's frame log is read back for the guardrails (G1, G4; G3, G5 and G6's counts) and every Forge seat's for D465's
// pay cap, and every frame log goes through tools/check-redaction.mjs.  Through J162 all of it ran on one core while the
// workers sat idle -- about a fifth of each spine's wall (atlas-review 2026-10-24, 2a).  D480's --checks-parallel n hands the
// rows' id checks and the guardrail reads to n worker threads (atlaschecks-worker.ts), in contiguous slices of the serial order,
// and runs n redaction batches at once; the parts are put back together in the serial order, so atlas.json's checks are the
// serial run's, byte for byte, but for the redaction's wall time (`redactionMs`).

import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';

import { applyGameIds, checkGameIds, checkRowsDir, collectRows, frameLogReader, type GameIds, type GameIdsResult, type RowsCheck } from './rowscheck.ts';
import { redactionCheck, redactionCheckParallel } from './censusplay.ts';

// ------------------------------------------------------------------
// The guardrails, checked from the recordings
// ------------------------------------------------------------------

export interface GuardrailCheck { logs: number; priority: number; landOffered: number; landTaken: number; mulligans: number; kept: number;
  /** The first GUARDRAIL_VIOLATIONS_LISTED violations, named. */
  violations: string[];
  /** D466: every violation, G1's and G4's, however many the list leaves out. */
  violationCount?: { G1: number; G4: number };
  /** D458: the random seats' own guardrail counts, summed from each log's `decisions` summary (protocol M71): G3's `noRepeatNoOp`, G5's `refusedCast` and `noRepeatRefused`; D471 (M73): G6's `xDrawn`, `zeroXLeftOut` and its violation `zeroX`. */
  counted?: Record<string, number> }

/** How many guardrail violations a check names; D466: the count past it is still counted (`violationCount`). */
export const GUARDRAIL_VIOLATIONS_LISTED = 50;

/**
 * D458: the guardrail counts every atlas reports, zero when no log counted one (G3; G5's refused picks and the removals after them).
 * D471: G6's -- the seat's own X plays with X drawn from 1..max (`xDrawn`), the plays left out because only X = 0 was payable
 * (`zeroXLeftOut`), and its violation, an own X play the engine paid at X = 0 (`zeroX`, a problem when above 0).
 */
export const COUNTED_GUARDRAILS = ['noRepeatNoOp', 'refusedCast', 'noRepeatRefused', 'xDrawn', 'zeroXLeftOut', 'zeroX'] as const;

/**
 * D451's guardrails, read back from a random seat's own frame log (its D347 decision records): G1, every
 * priority decision that offered a land (`land:<id>` among the legal options) was answered with a land;
 * G4, every opening-hand decision was `keep`.  (G2 is G1 itself, with no code of its own; G3 needs the engine's fingerprint and
 * is counted by the worker, `noRepeatNoOp`.)  D466: the decision record's land options and the seat's are one listing
 * (mtgtable.ai.Decisions.landPlays, the land drop checked), so a land offered is a land the seat could have played; the first
 * GUARDRAIL_VIOLATIONS_LISTED violations are named, and every one is counted (`violationCount`).  D458: the seat's own counts -- G3's and G5's, a play the engine refused to pay
 * for (`refusedCast`) and each later removal of it in that priority window (`noRepeatRefused`) -- are summed from the log's
 * `decisions` summary (`explore.guardrails`, protocol M71) into `counted`.  `where` names the log in a violation.
 */
export function guardrailCheck(text: string, where: string, out: GuardrailCheck): void {
  out.logs++;
  out.counted ??= {};
  const vc = (out.violationCount ??= { G1: 0, G4: 0 });
  for (const line of text.split('\n')) {
    if (line.includes('"type":"decisions"')) {
      let o: { body?: { explore?: { guardrails?: Record<string, unknown> } } };
      try { o = JSON.parse(line) as typeof o; } catch { continue; }
      for (const [k, v] of Object.entries(o.body?.explore?.guardrails ?? {})) if (typeof v === 'number') out.counted[k] = (out.counted[k] ?? 0) + v;
      continue;
    }
    if (!line.includes('"type":"decision"')) continue;
    let o: { body?: { kind?: string; options?: string[]; chosen?: string; n?: number } };
    try { o = JSON.parse(line) as typeof o; } catch { continue; }
    const b = o.body;
    if (!b) continue;
    if (b.kind === 'priority') {
      out.priority++;
      if ((b.options ?? []).some((t) => t.startsWith('land:'))) {
        out.landOffered++;
        if (String(b.chosen).startsWith('land:')) out.landTaken++;
        else {
          vc.G1++;
          if (out.violations.length < GUARDRAIL_VIOLATIONS_LISTED) out.violations.push(`${where}: decision ${String(b.n)} offered a land and played ${String(b.chosen)} (G1)`);
        }
      }
    } else if (b.kind === 'mulligan') {
      out.mulligans++;
      if (b.chosen === 'keep') out.kept++;
      else {
        vc.G4++;
        if (out.violations.length < GUARDRAIL_VIOLATIONS_LISTED) out.violations.push(`${where}: decision ${String(b.n)} took a mulligan (G4)`);
      }
    }
  }
}


/**
 * D465: the pay-cap passes a Forge-piloted branch seat counted, from its log's `decisions` summary (`guardrails.forgePayCap`,
 * protocol M72); 0 for a log without one.
 */
export function forgePayCapOf(text: string): number {
  let n = 0;
  for (const line of text.split('\n')) {
    if (!line.includes('"type":"decisions"')) continue;
    try {
      const v = (JSON.parse(line) as { body?: { guardrails?: { forgePayCap?: unknown } } }).body?.guardrails?.forgePayCap;
      if (typeof v === 'number') n += v;
    } catch { /* a torn line: the redaction check reports it */ }
  }
  return n;
}


/** The guardrails' empty tally. */
export const emptyGuardrails = (): GuardrailCheck => ({ logs: 0, priority: 0, landOffered: 0, landTaken: 0, mulligans: 0, kept: 0, violations: [], violationCount: { G1: 0, G4: 0 }, counted: {} });

/**
 * The frame-log pass over `files` (in order): a random seat's log -- phase A's (under `aFrames`) or a random branch's --
 * read back for the guardrails, a Forge branch seat's for its pay-cap passes; any other log is not read.  `read` returns null
 * for a log it cannot inflate (D466: named elsewhere).
 */
export function guardrailPass(files: string[], aFrames: string, read: (file: string) => string | null): { gc: GuardrailCheck; forgePayCap: number } {
  const gc = emptyGuardrails();
  let forgePayCap = 0;
  for (const f of files) {
    const base = path.basename(f);
    const random = f.startsWith(aFrames) || /^d\d+-random-/.test(base);
    if (!random && !/^d\d+-forge-/.test(base)) continue;
    const text = read(f);
    if (text === null) continue;   // D466: named below
    if (random) guardrailCheck(text, base, gc);
    else forgePayCap += forgePayCapOf(text);   // D465: the Forge seats' pay-cap passes
  }
  return { gc, forgePayCap };
}

/**
 * D480: the guardrail tallies of contiguous slices of the files, in order, as one pass over them all would have made it:
 * counts summed, the named violations the first GUARDRAIL_VIOLATIONS_LISTED in order (each slice names at most that many
 * of its own, which holds every one the whole pass would name), the logs' own counts summed in first-seen order.
 */
export function mergeGuardrails(parts: GuardrailCheck[]): GuardrailCheck {
  const out = emptyGuardrails();
  const vc = out.violationCount as { G1: number; G4: number };
  const counted = out.counted as Record<string, number>;
  for (const p of parts) {
    out.logs += p.logs; out.priority += p.priority; out.landOffered += p.landOffered; out.landTaken += p.landTaken; out.mulligans += p.mulligans; out.kept += p.kept;
    for (const v of p.violations) if (out.violations.length < GUARDRAIL_VIOLATIONS_LISTED) out.violations.push(v);
    vc.G1 += p.violationCount?.G1 ?? 0;
    vc.G4 += p.violationCount?.G4 ?? 0;
    for (const [k, v] of Object.entries(p.counted ?? {})) counted[k] = (counted[k] ?? 0) + v;
  }
  return out;
}

// ------------------------------------------------------------------
// The checks, serial and parallel
// ------------------------------------------------------------------

/** What writeAtlas reads from the checks: the three rows checks, the guardrails, the pay cap, the unreadable logs, the redaction. */
export interface CheckParts {
  rc: RowsCheck[];
  gc: GuardrailCheck;
  forgePayCap: number;
  /** Frame log -> zlib's reason, for every log a reader could not inflate (D466). */
  unreadable: Map<string, string>;
  redA: { checked: number; failed: string[]; ms: number };
  redB: { checked: number; failed: string[]; ms: number };
}

/** The checks' inputs: each rows folder with its frame-log naming, the frame logs (phase A's and the baseline's; the branches'), and where phase A's live. */
export interface CheckInputs {
  rowsDirs: Array<{ dir: string; logOf: (b: Record<string, unknown>, s: number) => string }>;
  frames: string[];
  branchFrames: string[];
  aFrames: string;
}

/** The worker's job: a slice of games for the id check, or a slice of frame logs for the guardrail pass. */
export type CheckTask = { kind: 'ids'; games: GameIds[] } | { kind: 'guardrails'; files: string[]; aFrames: string };
export type CheckAnswer = { kind: 'ids'; results: GameIdsResult[]; unreadable: Array<[string, string]> } | { kind: 'guardrails'; gc: GuardrailCheck; forgePayCap: number; unreadable: Array<[string, string]> };

/** One task, as a worker runs it (the serial run's own functions, on its slice). */
export function runCheckTask(t: CheckTask): CheckAnswer {
  const reader = frameLogReader();
  if (t.kind === 'ids') {
    return { kind: 'ids', results: t.games.map((g) => checkGameIds(g, reader.read)), unreadable: [...reader.unreadable] };
  }
  const x = guardrailPass(t.files, t.aFrames, reader.read);
  return { kind: 'guardrails', gc: x.gc, forgePayCap: x.forgePayCap, unreadable: [...reader.unreadable] };
}

/** `xs` in `n` contiguous slices, as even as they come (none empty unless `xs` is). */
export function slices<T>(xs: T[], n: number): T[][] {
  const k = Math.max(1, Math.min(n, xs.length));
  const out: T[][] = [];
  for (let j = 0; j < k; j++) out.push(xs.slice(Math.floor((j * xs.length) / k), Math.floor(((j + 1) * xs.length) / k)));
  return out;
}

/** Run `tasks` on up to `n` worker threads; the answers in the tasks' order. */
export async function runTasks(tasks: CheckTask[], n: number): Promise<CheckAnswer[]> {
  const answers = new Array<CheckAnswer>(tasks.length);
  let next = 0;
  const one = async (): Promise<void> => {
    while (next < tasks.length) {
      const j = next++;
      answers[j] = await new Promise<CheckAnswer>((resolve, reject) => {
        const w = new Worker(new URL('./atlaschecks-worker.ts', import.meta.url), { workerData: tasks[j] });
        w.once('message', (m: CheckAnswer) => { resolve(m); void w.terminate(); });
        w.once('error', reject);
        w.once('exit', (code) => { if (code !== 0 && answers[j] === undefined) reject(new Error(`atlas checks: a worker exited ${code}`)); });
      });
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, tasks.length)) }, one));
  return answers;
}

/** The checks one after another on one core, as writeAtlas has always run them (D466: one reader for every frame log). */
export function checksSerial(repo: string, inp: CheckInputs): CheckParts {
  const reader = frameLogReader();
  const rc = inp.rowsDirs.map((r) => checkRowsDir(r.dir, r.logOf, reader.read));
  const { gc, forgePayCap } = guardrailPass([...inp.frames, ...inp.branchFrames], inp.aFrames, reader.read);
  // D460: a branch starts from a fork late in a game, and a short one can end with seat B's hand empty in every frame --
  // nothing to redact.  Its logs pass --empty-hand-ok, which excuses the two coverage checks only where the file proves that
  // hand empty; phase A's games and the baseline pass nothing.  D466: a log the reader could not inflate is not sent.
  const readable = (f: string): boolean => !reader.unreadable.has(f);
  const redA = redactionCheck(repo, inp.frames.filter(readable));
  const redB = redactionCheck(repo, inp.branchFrames.filter(readable), 100, ['--empty-hand-ok']);
  return { rc, gc, forgePayCap, unreadable: reader.unreadable, redA, redB };
}

/**
 * D480: the checks on `n` workers.  The rows files' shape is checked here (it reads only the rows); the id checks and the
 * guardrail pass go to the workers in contiguous slices, each with its own frame-log reader; the redaction batches run `n`
 * at a time.  Then everything is put back in the serial order.
 */
export async function checksParallel(repo: string, inp: CheckInputs, n: number): Promise<CheckParts> {
  const collected = inp.rowsDirs.map((r) => collectRows(r.dir, r.logOf));
  const workers = Math.max(1, Math.min(n, os.availableParallelism?.() ?? n));
  const tasks: CheckTask[] = [];
  const idSlices = collected.map((c) => slices(c.games, workers));
  for (const s of idSlices) for (const g of s) tasks.push({ kind: 'ids', games: g });
  const all = [...inp.frames, ...inp.branchFrames];
  for (const f of slices(all, workers)) tasks.push({ kind: 'guardrails', files: f, aFrames: inp.aFrames });
  const answers = await runTasks(tasks, workers);
  const unreadable = new Map<string, string>();
  let t = 0;
  const rc: RowsCheck[] = collected.map((c, j) => {
    for (const games of idSlices[j] as GameIds[][]) {
      const a = answers[t++] as Extract<CheckAnswer, { kind: 'ids' }>;
      for (const [f, why] of a.unreadable) unreadable.set(f, why);
      a.results.forEach((r, i) => applyGameIds(c.out, (games[i] as GameIds).key, r));
    }
    return c.out;
  });
  const gparts: GuardrailCheck[] = [];
  let forgePayCap = 0;
  for (; t < answers.length; t++) {
    const a = answers[t] as Extract<CheckAnswer, { kind: 'guardrails' }>;
    for (const [f, why] of a.unreadable) unreadable.set(f, why);
    gparts.push(a.gc);
    forgePayCap += a.forgePayCap;
  }
  // D460 / D466: a branch's logs pass --empty-hand-ok; a log no reader could inflate is not sent
  const readable = (f: string): boolean => !unreadable.has(f);
  const redA = await redactionCheckParallel(repo, inp.frames.filter(readable), 100, [], workers);
  const redB = await redactionCheckParallel(repo, inp.branchFrames.filter(readable), 100, ['--empty-hand-ok'], workers);
  return { rc, gc: mergeGuardrails(gparts), forgePayCap, unreadable, redA, redB };
}
