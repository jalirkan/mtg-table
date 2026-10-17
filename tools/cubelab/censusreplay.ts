// mtg-table — the cube lab: a census game played again from its recipe (D450, "recipe -> cake").
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh census-replay <rows-file> --game <key> [--record full|rows] [--out <dir>] [--game-timeout 300]
//
// A census game recorded with --record rows keeps its decisions (the rows) and its recipe (the `begin`
// line before them: the census seed, the deck files, the pilots, who was on the play).  Forge is
// deterministic for a fixed seed and the same decks and pilots, so the frame logs need not be kept for
// every game: this command plays the game named by --game (its rows key, `census:<seed>`) again, from
// the begin line, with --record full (default) -- the two frame logs, the rows again and the ledger --
// into --out (default var/cubelab/census-replay/<key>), and then ASSERTS the replay is the game: every
// row the same (seat, kind, turn, candidates' tokens and vectors, the state, the index played; only the
// wall time `ms` may differ) and the same winner.  It exits 0 on a match and 4 on a difference, naming
// the first row that differs, and writes <out>/replay.json either way.
//
// What can break determinism: Forge's AI has a per-decision wall-clock limit (5 s), and a search seat
// is wall-clock bound (1.5 s), so a replay is exact for plain pilots on a machine that is not starved;
// a search pilot is refused.  The rows mode's leak check (RowsLeakCheck) swaps hidden zones and puts
// them back; a replay in full mode does not swap, so a match also says the swaps changed nothing.

import fs from 'node:fs';
import path from 'node:path';

import { engineEnv, runPool, type MatchJob, type MatchResult } from './engine.ts';
import { recordBlocks, ledgerOf, type Policy, type RecordMode, type PlannedGame } from './censusplay.ts';
import { labPath, shownPath } from './labdata.ts';
import { checkRowsDir } from './rowscheck.ts';
import { redactionCheck } from './censusplay.ts';
import { readMaybeGz } from './rowscheck.ts';

export interface RowLine { type: string; game: string; seat: string; kind: string; turn: number; n: number; chosen: number; tokens: string[]; s: number[][]; c: number[][]; policy?: string; ms?: number }
export interface GameLines { begin: Record<string, unknown> | null; rows: RowLine[]; end: Record<string, unknown> | null }

/** One game's begin, rows and end out of a rows file's text (the LAST complete run of them: a retried game is written twice). */
export function gameLines(text: string, key: string): GameLines {
  let cur: GameLines = { begin: null, rows: [], end: null };
  let last: GameLines | null = null;
  for (const line of text.split('\n')) {
    if (!line.includes(`"game":"${key}"`)) continue;
    let o: Record<string, unknown>;
    try { o = JSON.parse(line) as Record<string, unknown>; } catch { continue; }
    if (o.game !== key) continue;
    if (o.type === 'begin') cur = { begin: o, rows: [], end: null };
    else if (o.type === 'row') cur.rows.push(o as unknown as RowLine);
    else if (o.type === 'end') { cur.end = o; if (o.ok === true) last = cur; cur = { begin: null, rows: [], end: null }; }
  }
  return last ?? cur;
}

/** The comparable part of a row: everything but the wall time. */
export function rowFace(r: RowLine): string {
  return JSON.stringify([r.seat, r.kind, r.turn, r.n, r.chosen, r.tokens, r.s, r.c, r.policy ?? 'search']);
}

/**
 * A frame log's comparable lines: the session header (its wall-clock fields) left out, every line's `t`
 * dropped, the `decisions` summary's timings (recordMs, buildMs) dropped, and the stack's instance ids
 * (`stack[].id`, `stackId`) renumbered in order of first appearance -- Forge counts those per PROCESS, so
 * a game played as a worker's 40th has other numbers than the same game played first -- and an event's
 * `cardIds` compared as a set (D121: their order follows HotSpot's identity hashes).  Two recordings of
 * one game are equal under this.
 */
export function framesFace(text: string): string[] {
  const out: string[] = [];
  const stackIds = new Map<number, number>();
  const sid = (n: unknown): unknown => {
    if (typeof n !== 'number') return n;
    if (!stackIds.has(n)) stackIds.set(n, stackIds.size + 1);
    return stackIds.get(n);
  };
  const canon = (x: unknown, inStack: boolean): void => {
    if (Array.isArray(x)) { for (const y of x) canon(y, inStack); return; }
    if (!x || typeof x !== 'object') return;
    const o = x as Record<string, unknown>;
    if (inStack && 'id' in o) o.id = sid(o.id);
    if ('stackId' in o) o.stackId = sid(o.stackId);
    // D121's lesson: the order of the ids inside an event's list follows HotSpot's identity hashes
    if (Array.isArray(o.cardIds)) o.cardIds = [...(o.cardIds as unknown[])].sort((p, q) => Number(p) - Number(q));
    for (const [k, v] of Object.entries(o)) canon(v, k === 'stack');
  };
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let o: Record<string, unknown>;
    try { o = JSON.parse(line) as Record<string, unknown>; } catch { out.push(line); continue; }
    if (o.kind === 'session') continue;
    delete o.t;
    canon(o.body, false);
    if (o.type === 'decisions' && o.body && typeof o.body === 'object') {
      const b = o.body as Record<string, unknown>;
      for (const k of Object.keys(b)) if (/Ms$|Us$|Nanos$/.test(k)) delete b[k];
    }
    out.push(JSON.stringify(o));
  }
  return out;
}

/** The first differing line of two frame logs under {@link framesFace} (null: equal). */
export function compareFrames(a: string, b: string): string | null {
  const x = framesFace(a), y = framesFace(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] !== y[i]) return `line ${i + 1} of ${x.length} / ${y.length}: ${(x[i] ?? '(none)').slice(0, 120)} vs ${(y[i] ?? '(none)').slice(0, 120)}`;
  }
  return null;
}

/** The first difference between two games' rows (null: the same game), and the winners'. */
export function compareGames(a: GameLines, b: GameLines): { same: boolean; rows: number; firstDiff: string | null } {
  const n = Math.max(a.rows.length, b.rows.length);
  for (let i = 0; i < n; i++) {
    const x = a.rows[i], y = b.rows[i];
    if (!x || !y) return { same: false, rows: Math.min(a.rows.length, b.rows.length), firstDiff: `row ${i + 1}: the ${x ? 'replay' : 'original'} has no row here (${a.rows.length} rows against ${b.rows.length})` };
    if (rowFace(x) !== rowFace(y)) {
      const what = x.seat !== y.seat || x.kind !== y.kind || x.turn !== y.turn ? `${x.seat} ${x.kind} t${x.turn} vs ${y.seat} ${y.kind} t${y.turn}`
        : JSON.stringify(x.tokens) !== JSON.stringify(y.tokens) ? `tokens ${JSON.stringify(x.tokens)} vs ${JSON.stringify(y.tokens)}`
          : x.chosen !== y.chosen ? `played ${x.chosen} vs ${y.chosen}` : 'the state or a candidate vector';
      return { same: false, rows: i, firstDiff: `row ${i + 1} (${x.seat}, ${x.kind}, turn ${x.turn}): ${what}` };
    }
  }
  const wa = a.end?.winner ?? null, wb = b.end?.winner ?? null;
  if (wa !== wb) return { same: false, rows: n, firstDiff: `the winner: ${String(wa)} vs ${String(wb)}` };
  return { same: true, rows: n, firstDiff: null };
}

/**
 * Why --out must not be used, or null.  A replay clears <out>/rows and <out>/frames before it plays, so
 * --out naming a census folder (its plan.json or games.jsonl) or any folder holding the input rows file
 * would delete the night it replays (the #160 review: a 131-row night became 41 rows).
 */
export function replayOutRefusal(out: string, rowsFile: string): string | null {
  const real = (p: string): string => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
  const o = real(out);
  for (const f of ['plan.json', 'games.jsonl']) {
    if (fs.existsSync(path.join(o, f))) return `census-replay: --out ${out} holds ${f}, so it is a census folder; a replay clears <out>/rows and <out>/frames and would delete its recordings. Give --out a folder of its own`;
  }
  const rel = path.relative(o, real(rowsFile));
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) return `census-replay: --out ${out} contains the rows file being replayed (${rowsFile}); a replay clears <out>/rows and <out>/frames. Give --out a folder of its own`;
  return null;
}

export async function censusReplayCommand(repo: string, pos: string[], f: Map<string, string[]>, say: (s: string) => void): Promise<number> {
  const one = (k: string): string | undefined => f.get(k)?.at(-1);
  const fileArg = pos[0];
  const key = one('game');
  if (!fileArg || !key) throw new Error('census-replay: <rows-file> and --game <key> are required (the key is the rows\' game, census:<seed>)');
  const file = labPath(repo, fileArg, 'read');
  const mode = (one('record') ?? 'full') as RecordMode;
  if (mode !== 'full' && mode !== 'rows') throw new Error('census-replay: --record is full or rows');
  const orig = gameLines(fs.readFileSync(file, 'utf8'), key);
  if (!orig.begin) throw new Error(`census-replay: ${fileArg} has no begin line for ${key} (rows written before D450 carry no recipe)`);
  if (!orig.end || orig.end.ok !== true) throw new Error(`census-replay: ${key} did not end cleanly in ${fileArg}`);
  const b = orig.begin;
  const policyA = String(b.policyA ?? 'plain') as Policy, policyB = String(b.policyB ?? 'plain') as Policy;
  if (policyA !== 'plain' || policyB !== 'plain') throw new Error('census-replay: a search pilot is wall-clock bound and does not replay exactly; only plain pilots are replayed');
  const deckA = labPath(repo, String(b.deckFileA), 'read'), deckB = labPath(repo, String(b.deckFileB), 'read');
  for (const d of [deckA, deckB]) if (!fs.existsSync(d)) throw new Error(`census-replay: the recipe's deck ${d} is not there`);
  const p: PlannedGame = { g: Number(b.g), seed: Number(b.seed), a: String(b.a), b: String(b.b) };
  const out = labPath(repo, one('out') ?? path.join('var/cubelab/census-replay', key.replace(/[^A-Za-z0-9_-]/g, '_')), 'write');
  const refusal = replayOutRefusal(out, file);
  if (refusal) throw new Error(refusal);
  fs.rmSync(path.join(out, 'rows'), { recursive: true, force: true });
  fs.rmSync(path.join(out, 'frames'), { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const timeout = Number(one('game-timeout') ?? '300');
  const job: MatchJob & Record<string, unknown> = {
    id: `g${p.g}`,   // census-play's own id, so the logs' gameId is the original's
    seed: p.seed, games: 1, gameTimeoutSec: timeout, profileA: 'Default', profileB: 'Default', builder: 'lab',
    deckA, deckB, poolA: [], poolB: [], forgeDeckOutA: '', forgeDeckOutB: '', policyA, policyB,
    ...recordBlocks(mode, out, p, { a: deckA, b: deckB, sha: String(b.decksSha ?? ''), dir: path.dirname(deckA) }, policyA, policyB, 0, repo),
  };
  const env = engineEnv(repo);
  say(`census-replay: ${key} (g${p.g}, seed ${p.seed}, ${p.a} vs ${p.b}) from ${shownPath(repo, file)}: ${orig.rows.length} rows, winner ${String(orig.end.winner)}; playing it again with --record ${mode} into ${shownPath(repo, out)}`);
  let result: MatchResult | null = null;
  const t0 = Date.now();
  await runPool({ ...env, homes: env.homes.slice(0, 1) }, [job], path.join(out, 'logs'), (_j, r) => { result = r; }, say);
  const r = result as MatchResult | null;
  if (!r || r.engineError || !r.games[0]) throw new Error(`census-replay: the replay did not finish (${r?.engineError ?? 'no game row'})`);
  const rowsDir = path.join(out, 'rows');
  const files = fs.existsSync(rowsDir) ? fs.readdirSync(rowsDir).filter((x) => /^rows-.*\.jsonl$/.test(x)) : [];
  const again = gameLines(files.map((x) => fs.readFileSync(path.join(rowsDir, x), 'utf8')).join('\n'), key);
  const cmp = compareGames(orig, again);
  const frames = mode === 'full' ? [0, 1].map((s) => path.join(out, 'frames', `g${p.g}-seat${s}.jsonl.gz`)) : [];
  const red = frames.length ? redactionCheck(repo, frames.filter((x) => fs.existsSync(x))) : null;
  const rc = checkRowsDir(rowsDir, mode === 'full' ? (_b, seat) => frames[seat] ?? null : undefined);
  const g = r.games[0];
  // A recording of the original, beside its rows (census-play --record full): the replay's logs must equal it.
  const origFrames = [0, 1].map((k) => path.join(path.dirname(path.dirname(file)), 'frames', `g${p.g}-seat${k}.jsonl.gz`));
  const framesDiff = mode === 'full' && origFrames.every((x) => fs.existsSync(x))
    ? origFrames.map((x, k) => compareFrames(readMaybeGz(x), readMaybeGz(frames[k] as string))).map((d, k) => (d ? `seat ${k}: ${d}` : null)).filter(Boolean)
    : null;
  const doc = {
    v: 1, decision: 'D450', key, from: shownPath(repo, file), record: mode, same: cmp.same, rows: { original: orig.rows.length, replay: again.rows.length, compared: cmp.rows },
    firstDiff: cmp.firstDiff, winner: { original: orig.end.winner ?? null, replay: again.end?.winner ?? null }, turns: g.turns, ms: Date.now() - t0,
    frames: frames.filter((x) => fs.existsSync(x)).map((x) => ({ file: shownPath(repo, x), bytes: fs.statSync(x).size })),
    redaction: red ? { logs: red.checked, failed: red.failed.length } : null, rowsCheck: { rows: rc.rows, problems: rc.problems },
    framesAgainstOriginal: framesDiff === null ? 'no original frame logs beside the rows' : framesDiff.length ? framesDiff : 'equal (but for wall-clock fields)',
    ledgerTurns: ledgerOf(r)?.turns.length ?? null,
  };
  fs.writeFileSync(path.join(out, 'replay.json'), `${JSON.stringify(doc, null, 2)}\n`);
  const ledger = ledgerOf(r);
  if (ledger) fs.writeFileSync(path.join(out, 'ledger.json'), `${JSON.stringify(ledger)}\n`);
  if (cmp.same) say(`census-replay: SAME GAME -- ${again.rows.length} rows identical (only the wall time differs), winner ${String(again.end?.winner)}, ${g.turns} turns; frame logs ${doc.frames.map((x) => `${x.file} (${(x.bytes / 1024).toFixed(1)} KB)`).join(', ') || 'none'}`);
  else say(`census-replay: DIFFERENT -- ${cmp.firstDiff}`);
  if (red && red.failed.length) say(`census-replay: ${red.failed.length} frame log(s) FAILED the redaction check`);
  if (rc.problems.length) say(`census-replay: rows check: ${rc.problems.slice(0, 3).join('; ')}`);
  if (framesDiff) say(framesDiff.length ? `census-replay: the frame logs DIFFER from the original recording: ${framesDiff.join('; ')}` : 'census-replay: both frame logs equal the original recording (but for wall-clock fields)');
  return cmp.same && !(red && red.failed.length) && rc.problems.length === 0 && !(framesDiff && framesDiff.length) ? 0 : 4;
}
