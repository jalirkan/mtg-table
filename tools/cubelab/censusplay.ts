// mtg-table — the cube lab: the DECK CENSUS's games (D447): deck against deck, best of one, numbers only.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh census-play --decks <dir> --pairs M --seed S --jobs K --out <dir>
//                                [--policy-a plain|search] [--policy-b plain|search] [--game-timeout 300]
//   tools/cubelab.sh census-play --decks <dir> --replay <games.jsonl> --jobs K --out <dir> [--policy-a ...] [--policy-b ...]
//
// THE PAIRING (pairingOf).  The decks of the folder (decks.jsonl, `cubelab.sh decks`) are laid out as
// a run of seeded permutations, rng(S, 'census-play/pairs/<r>') for permutation r, one after another,
// and game g (1-based) is the g-th consecutive pair of that run: side a the first deck, side b the
// second.  A pair that would be one deck against itself (where two permutations meet) takes the
// next deck instead, which swaps it forward.  Every permutation holds every deck once, so after M
// games every deck has played at least floor(2M / N) - 1 games and at most ceil(2M / N) + 1.
// Game g's seed is S x 1,000,000 + g (so M < 1,000,000): the worker plays it as CubeLab.java plays
// game 1 of a draft with that seed -- MyRandom seeded from it, and side a on the play exactly when
// the seed is even ((seed + 1) mod 2 == 1).  So the seed alone names the shuffles and the first player.
//
// THE PILOTS.  --policy-a / --policy-b: `plain` (default) is Forge's own AI under the Default profile
// through Bootstrap.createAiPlayer (D107); `search` is the live search seat, built as `RecordMatch
// --policy search` builds it (the outlet policy on, SearchConfig.parseLive(null): search-v2 at the
// 1.5 s budget).  A search seat's row carries its game's searched and changed decisions and its mean
// ms per decision (search.{p,a,b}.us, as the ladder's match file counts them), and its raw counters.
//
// REPLAY (--replay <games.jsonl>): exactly the games listed there -- the same game numbers, deck ids
// on the same sides, the same seeds, so the same first player -- under this run's pilots, for
// comparing a slice of games pair for pair (J141).  Every listed deck id must be in --decks.
//
// ONE ROW A GAME, appended to <out>/games.jsonl as each finishes (never in game order):
//   {v, g, seed, a, b, policyA, policyB, winner: 'a'|'b'|'draw'|null, first: 'a'|'b'|null, turns, ms,
//    timeout, reason, error, engineError, worker, searchA?, searchB?, replayOf?}
// `first` is read back from the game (onPlayVerified).  No recording, no frame log: numbers only.
// The decks' lists are decks.jsonl's, bound by its sha256 in <out>/plan.json.
//
// ENGINE ERRORS (a worker died, or gave no game row) are retried ONCE, on fresh workers after the run's
// other games, and the row written is the retry's, marked `retried: true`; a game that errs twice keeps
// its engineError and counts as played (census-read leaves it out).  A timeout is a result, never retried.
//
// RESUMABLE.  plan.json holds the options; a second run with the same --out and the same options
// skips every game whose row is in games.jsonl (a torn last line is cut off first) and plays the
// rest; different options are refused, except a LARGER --pairs on the same seed: the pairing is
// prefix-stable (game g's pair does not depend on M), so the run is extended to the new M, plan.json
// records it under `extended`, and only the new games are played.  A smaller --pairs is refused.
// census-play.json is the run's tally, rewritten at the end.
//
// THE PLAY/DRAW.  Side a is on the play when the game's seed is even, so over a run each side is on
// the play in half the games, but a given deck is not balanced between play and draw: `first` is
// recorded on every row, and a reader that wants it controls for it (D447).
//
// RECORDING THE CAKE (--record, D450).  `none` is the numbers-only census above.  `rows` (the default)
// keeps the game itself as data, not only its result:
//   <out>/rows/rows-<pid>.jsonl   every p, a and b decision of BOTH seats as a D435 row (DistillRows),
//                                 each from its own seat's view: the state (D361's encoder: the other
//                                 hand and every library by size only), the candidates' vectors and
//                                 tokens, the index played, `policy` (forge, or search for a search
//                                 seat).  Each game's rows follow a `begin` line, its recipe (seed, deck
//                                 ids and files, pilots, who was on the play), and end with an `end` line.
//   <out>/ledger.jsonl            one line a game: per turn, per seat, the public numbers (life, hand,
//                                 library, lands / creatures / other permanents, spells cast, lands
//                                 played, mana spent, damage dealt; mtgtable.ai.GameLedger).
// `full` adds both seats' frame logs, <out>/frames/g<g>-seat{0,1}.jsonl.gz (the bridge's own recorder,
// SeatRecorder: each redacted for its seat).  A plain seat that records is our controller with an
// observing search (observe=1): the search's candidates, generated inside Decisions.quiet, and Forge's
// answer played -- so a rows game is meant to be the game `none` plays; the D450 smoke measured that.
// At the end of a run the record is checked: every rows file by rowscheck.ts (shape, and with frames
// every id a row names is one its seat's own log shows), every frame log by tools/check-redaction.mjs,
// and with --rows-check-every N (default 50 in rows mode; off in full mode, where its zone swaps would be
// in the logs) the engine's RowsLeakCheck on every N-th row.  A problem fails the run (exit 3).  The
// sizes per game land in census-play.json's `record`.  A folder keeps one --record mode (plan.json).

import fs from 'node:fs';
import path from 'node:path';

import { spawn, spawnSync } from 'node:child_process';

import { engineEnv, runPool, type MatchJob, type MatchResult, type RecordSpec } from './engine.ts';
import { fileLines } from './lines.ts';
import { rng, shuffle } from './rng.ts';
import { sha12, type DeckRecord } from './deckcensus.ts';
import { labDataDir, labPath, recipePath, shownPath } from './labdata.ts';
import { checkRowsDir, rowBytesByGame } from './rowscheck.ts';

export const RECORD_MODES = ['none', 'rows', 'full'] as const;
export type RecordMode = (typeof RECORD_MODES)[number];

export const POLICIES = ['plain', 'search'] as const;
export type Policy = (typeof POLICIES)[number];
export const SEED_STRIDE = 1_000_000;

export interface PlannedGame { g: number; seed: number; a: string; b: string }

/** Rule: M games over the deck ids, as consecutive pairs of a run of seeded permutations. */
export function pairingOf(ids: readonly string[], games: number, seed: number): PlannedGame[] {
  if (ids.length < 2) throw new Error('census-play: a pairing needs at least two decks');
  if (games >= SEED_STRIDE) throw new Error(`census-play: --pairs must be under ${SEED_STRIDE}`);
  const seq: string[] = [];
  for (let r = 0; seq.length < 2 * games + ids.length; r++) seq.push(...shuffle([...ids], rng(seed, `census-play/pairs/${r}`)));
  const out: PlannedGame[] = [];
  let at = 0;
  for (let g = 1; g <= games; g++) {
    const a = seq[at] as string;
    let j = at + 1;
    while (seq[j] === a) j++;
    if (j !== at + 1) { const t = seq[at + 1] as string; seq[at + 1] = seq[j] as string; seq[j] = t; }
    out.push({ g, seed: seed * SEED_STRIDE + g, a, b: seq[at + 1] as string });
    at += 2;
  }
  return out;
}

/** Whether a run's plan.json (`was`) admits these options (`now`): the same run, a larger --pairs on the same seed (extended), or not (error). */
export function planExtension(was: Record<string, unknown>, now: Record<string, unknown>): { extended: boolean; error: string | null } {
  const keys = ['decksSha', 'replaySha', 'seed', 'pairs', 'policyA', 'policyB', 'games', 'record'] as const;
  // D450: a plan written before --record existed recorded nothing
  const val = (o: Record<string, unknown>, k: string): unknown => (k === 'record' ? (o.record ?? 'none') : o[k]);
  const diff = keys.filter((k) => JSON.stringify(val(was, k)) !== JSON.stringify(val(now, k)));
  if (!diff.length) return { extended: false, error: null };
  const grows = now.replay === null && was.replay === null && diff.every((k) => k === 'pairs' || k === 'games')
    && typeof was.pairs === 'number' && typeof now.pairs === 'number' && now.pairs > was.pairs;
  if (grows) return { extended: true, error: null };
  const text = diff.map((k) => `${k} ${JSON.stringify(val(was, k))} -> ${JSON.stringify(val(now, k))}`).join(', ');
  return { extended: false, error: typeof was.pairs === 'number' && typeof now.pairs === 'number' && now.pairs < was.pairs && diff.every((k) => k === 'pairs' || k === 'games') ? `${text}: a smaller --pairs would leave played games outside the plan` : text };
}

/** CubeLab.java's rule for game 1 of a seed: side A on the play exactly when the seed is even. */
export const aOnPlayFor = (seed: number): boolean => ((seed + 1) % 2) === 1;

export interface SearchSummary { searched: number; changed: number; msPerDecision: number | null; counts: Record<string, number> }

/** A seat's search.* counters, summed as the ladder's match file sums them (p + a + b). */
export function searchSummary(counts: Record<string, number> | undefined): SearchSummary | undefined {
  if (!counts) return undefined;
  const n = (k: string): number => (typeof counts[k] === 'number' ? counts[k] as number : 0);
  const searched = n('search.p.considered') + n('search.a.considered') + n('search.b.considered');
  const changed = n('search.p.changed') + n('search.a.changed') + n('search.b.changed');
  const us = n('search.p.us') + n('search.a.us') + n('search.b.us');
  const ms = n('search.p.ms') + n('search.a.ms') + n('search.b.ms');
  const msPerDecision = searched === 0 ? null : Math.round(((us > 0 ? us / 1000 : ms) / searched) * 1000) / 1000;
  return { searched, changed, msPerDecision, counts };
}

export interface GameRowOut {
  v: 1;
  g: number;
  seed: number;
  a: string;
  b: string;
  policyA: Policy;
  policyB: Policy;
  winner: 'a' | 'b' | 'draw' | null;
  first: 'a' | 'b' | null;
  turns: number | null;
  ms: number | null;
  timeout: boolean;
  reason: string | null;
  error: string | null;
  engineError: string | null;
  worker: number;
  searchA?: SearchSummary;
  searchB?: SearchSummary;
  replayOf?: string;
  /** The game hit an engine error and was played again (its row is the retry's). */
  retried?: boolean;
  /** D450: the game's rows (its key in the rows files, rows per seat, row errors). */
  rows?: { key: string; rowsA: number; rowsB: number; errorsA: number; errorsB: number };
  /** D450: the engine's leak check on this game's rows (--rows-check-every). */
  rowsCheck?: { checks: number; leaks: number; controls: number; controlMoved: number; candidates?: number };
  /** D450: the frame logs (--record full): folder, bytes, state frames, snapshot errors, decision records. */
  recorded?: { dir: string; bytes: number; frames: number; errors: number; decisions?: number; decisionErrors?: number };
  /** D450: turns in the game's ledger line (ledger.jsonl). */
  ledgerTurns?: number;
}

/** The per-turn ledger CubeLab.java returns on a game row (mtgtable.ai.GameLedger). */
export interface Ledger { v: 1; seats: number; errors: number; fields: string[]; turns: Array<{ t: number; active: number; s: number[][] }> }

/** A worker's match result (one game) as the census's row. */
export function rowOf(p: PlannedGame, r: MatchResult, worker: number, policyA: Policy, policyB: Policy, replayOf?: string): GameRowOut {
  const g = r.games[0] as (MatchResult['games'][number] & { searchA?: Record<string, number>; searchB?: Record<string, number> }) | undefined;
  const side = (x: string | null | undefined): 'a' | 'b' | null => (x === 'A' ? 'a' : x === 'B' ? 'b' : null);
  const row: GameRowOut = {
    v: 1, g: p.g, seed: p.seed, a: p.a, b: p.b, policyA, policyB,
    winner: g ? (g.winner === 'draw' ? 'draw' : side(g.winner)) : null,
    first: g ? side(g.onPlayVerified) : null,
    turns: g?.turns ?? null, ms: g?.ms ?? null, timeout: g?.timeout ?? false, reason: g?.reason ?? null, error: g?.error ?? null,
    engineError: r.engineError ?? (g ? null : 'no game row'), worker,
  };
  const sa = searchSummary(g?.searchA), sb = searchSummary(g?.searchB);
  if (sa) row.searchA = sa;
  if (sb) row.searchB = sb;
  if (replayOf) row.replayOf = replayOf;
  const x = g as (typeof g & { rows?: GameRowOut['rows']; rowsCheck?: GameRowOut['rowsCheck']; ledger?: Ledger }) | undefined;
  if (x?.rows) row.rows = x.rows;
  if (x?.rowsCheck) row.rowsCheck = x.rowsCheck;
  if (x?.recorded) row.recorded = x.recorded;
  if (x?.ledger) row.ledgerTurns = x.ledger.turns.length;
  return row;
}

/** The ledger a worker returned for the game, or null. */
export function ledgerOf(r: MatchResult): Ledger | null {
  const g = r.games[0] as (MatchResult['games'][number] & { ledger?: Ledger }) | undefined;
  return g?.ledger ?? null;
}

/** The rows key of a census game: its seed is unique in the run (S x 1,000,000 + g) and across replays of it. */
export const rowsKeyOf = (p: PlannedGame): string => `census:${p.seed}`;

/** D450: the match line's recording blocks for one game under a --record mode. */
export function recordBlocks(mode: RecordMode, out: string, p: PlannedGame, decks: { a: string; b: string; sha: string; dir: string },
  policyA: Policy, policyB: Policy, rowsCheckEvery: number, repo: string, root: string | null = labDataDir(repo)): Partial<MatchJob> & Record<string, unknown> {
  if (mode === 'none') return {};
  const blocks: Record<string, unknown> = {
    rows: {
      dir: path.join(out, 'rows'),
      key: rowsKeyOf(p),
      begin: { source: 'census-play', g: p.g, seed: p.seed, a: p.a, b: p.b, deckFileA: recipePath(repo, decks.a, root), deckFileB: recipePath(repo, decks.b, root),
        decksSha: decks.sha, policyA, policyB, record: mode },
    },
    ledger: true,
    rowsCheckEvery: mode === 'full' ? 0 : rowsCheckEvery,
  };
  if (mode === 'full') {
    const record: RecordSpec & Record<string, unknown> = {
      dir: path.join(out, 'frames'), rel: 'frames', run: path.basename(out), cube: '', cubeFile: '', cubeSha: '', format: 'census',
      deckNameA: p.a, deckNameB: p.b, name: `g${p.g}`, census: { seed: p.seed, g: p.g, a: p.a, b: p.b },
    };
    blocks.record = record;
  }
  return blocks;
}

/** The g of every complete row of a games.jsonl, after cutting off a torn last line. */
export function doneGames(file: string): Set<number> {
  const done = new Set<number>();
  if (!fs.existsSync(file)) return done;
  const text = fs.readFileSync(file);
  const last = text.lastIndexOf(0x0a);
  if (last + 1 < text.length) fs.truncateSync(file, last + 1);
  for (const l of fileLines(file, { complete: true })) if (l) done.add((JSON.parse(l) as GameRowOut).g);
  return done;
}

export function readDecks(dir: string): { decks: DeckRecord[]; sha: string } {
  const file = path.join(dir, 'decks.jsonl');
  if (!fs.existsSync(file)) throw new Error(`census-play: no decks.jsonl in ${dir} (make one with tools/cubelab.sh decks)`);
  const text = fs.readFileSync(file, 'utf8');
  return { decks: text.split('\n').filter(Boolean).map((l) => JSON.parse(l) as DeckRecord), sha: sha12(text) };
}

/** A replay's games: every row's g, seed and deck ids, in g order (a row listed twice once). */
export function replayPlan(file: string): PlannedGame[] {
  const byG = new Map<number, PlannedGame>();
  for (const l of fileLines(file, { complete: true })) {
    if (!l.trim()) continue;
    const r = JSON.parse(l) as GameRowOut;
    if (!byG.has(r.g)) byG.set(r.g, { g: r.g, seed: r.seed, a: r.a, b: r.b });
  }
  return [...byG.values()].sort((x, y) => x.g - y.g);
}

export async function censusPlayCommand(repo: string, f: Map<string, string[]>, say: (s: string) => void): Promise<number> {
  const one = (k: string): string | undefined => f.get(k)?.at(-1);
  const decksArg = one('decks');
  const outArg = one('out');
  if (!decksArg || !outArg) throw new Error('census-play: --decks <dir> and --out <dir> are required');
  const decksDir = labPath(repo, decksArg, 'read');     // D450: LAB_DATA_DIR re-roots var/ paths
  const out = labPath(repo, outArg, 'write');
  const policy = (k: string): Policy => {
    const v = (one(k) ?? 'plain') as Policy;
    if (!POLICIES.includes(v)) throw new Error(`census-play: --${k} is plain or search, got ${v}`);
    return v;
  };
  const policyA = policy('policy-a'), policyB = policy('policy-b');
  const record = (one('record') ?? 'rows') as RecordMode;
  if (!RECORD_MODES.includes(record)) throw new Error(`census-play: --record is none, rows or full, got ${record}`);
  const rowsCheckEvery = Number(one('rows-check-every') ?? (record === 'rows' ? '50' : '0'));
  if (!Number.isInteger(rowsCheckEvery) || rowsCheckEvery < 0) throw new Error('census-play: --rows-check-every wants a whole number (0 = off)');
  if (record === 'full' && rowsCheckEvery > 0) throw new Error('census-play: --rows-check-every is for --record rows: in full mode its zone swaps would be written into the frame logs (the id check covers full mode)');
  if (record === 'none' && f.has('rows-check-every')) throw new Error('census-play: --rows-check-every needs --record rows');
  const jobs = Number(one('jobs') ?? '1');
  const timeout = Number(one('game-timeout') ?? '300');
  if (!Number.isInteger(jobs) || jobs < 1 || !Number.isInteger(timeout) || timeout < 10) throw new Error('census-play: --jobs wants a positive whole number and --game-timeout one of 10 or more');
  const { decks, sha } = readDecks(decksDir);
  const byId = new Map(decks.map((d) => [d.id, d]));
  const replay = one('replay');
  let plan: PlannedGame[];
  let replaySha: string | null = null;
  let seed: number | null = null, pairs: number | null = null;
  if (replay) {
    if (f.has('pairs') || f.has('seed')) throw new Error('census-play: --replay takes its games, seeds and pairs from the file; leave out --pairs and --seed');
    const rf = labPath(repo, replay, 'read');
    replaySha = sha12(fs.readFileSync(rf));
    plan = replayPlan(rf);
    const missing = [...new Set(plan.flatMap((p) => [p.a, p.b]).filter((id) => !byId.has(id)))];
    if (missing.length) throw new Error(`census-play: the replay names ${missing.length} deck id(s) not in ${decksArg}: ${missing.slice(0, 5).join(', ')}`);
  } else {
    seed = Number(one('seed'));
    pairs = Number(one('pairs'));
    if (!Number.isInteger(seed) || seed < 0 || !Number.isInteger(pairs) || pairs < 1) throw new Error('census-play: --seed wants a whole number and --pairs a positive one');
    plan = pairingOf(decks.map((d) => d.id), pairs, seed);
  }
  fs.mkdirSync(out, { recursive: true });
  const planDoc = { v: 1, decision: 'D447', decks: shownPath(repo, decksDir), decksSha: sha, replay: replay ? shownPath(repo, labPath(repo, replay, 'read')) : null, replaySha, seed, pairs, policyA, policyB, profile: 'Default', games: plan.length, gameTimeoutSec: timeout, record, rowsCheckEvery };
  const planFile = path.join(out, 'plan.json');
  if (fs.existsSync(planFile)) {
    const was = JSON.parse(fs.readFileSync(planFile, 'utf8')) as Record<string, unknown>;
    const ext = planExtension(was, planDoc);
    if (ext.error) throw new Error(`census-play: ${outArg} holds another run (${ext.error}); use another --out`);
    if (ext.extended) {
      const extended = [...((was.extended as unknown[] | undefined) ?? []), { from: was.pairs, to: pairs, at: new Date().toISOString() }];
      fs.writeFileSync(planFile, `${JSON.stringify({ ...was, pairs, games: plan.length, extended }, null, 2)}\n`);
      say(`census-play: extending ${outArg} from ${String(was.pairs)} to ${pairs} games (the pairing is prefix-stable: the first ${String(was.pairs)} are the same games)`);
    }
  } else fs.writeFileSync(planFile, `${JSON.stringify(planDoc, null, 2)}\n`);
  const gamesFile = path.join(out, 'games.jsonl');
  const done = doneGames(gamesFile);
  const todo = plan.filter((p) => !done.has(p.g));
  say(`census-play: ${plan.length} game(s) planned over ${decks.length} deck(s)${replay ? ` (a replay of ${replay})` : `, seed ${seed}`}; ${done.size} already played, ${todo.length} to play on ${Math.min(jobs, Math.max(1, todo.length))} worker(s); pilots a ${policyA}, b ${policyB}; record ${record}${out !== path.resolve(repo, outArg) ? ` (under LAB_DATA_DIR: ${out})` : ''}`);
  if (todo.length === 0) { writeTally(out, gamesFile, null, say); return recordReport(repo, out, record, say); }

  const env = engineEnv(repo);
  const byJob = new Map<string, PlannedGame>();
  const jobsList: MatchJob[] = todo.map((p) => {
    const id = `g${p.g}`;
    byJob.set(id, p);
    const job: MatchJob & { policyA: Policy; policyB: Policy } = {
      id, seed: p.seed, games: 1, gameTimeoutSec: timeout, profileA: 'Default', profileB: 'Default', builder: 'lab',
      deckA: path.join(decksDir, (byId.get(p.a) as DeckRecord).file), deckB: path.join(decksDir, (byId.get(p.b) as DeckRecord).file),
      poolA: [], poolB: [], forgeDeckOutA: '', forgeDeckOutB: '', policyA, policyB,
    };
    Object.assign(job, recordBlocks(record, out, p, { a: job.deckA as string, b: job.deckB as string, sha, dir: decksDir }, policyA, policyB, rowsCheckEvery, repo));
    return job;
  });
  const homes = env.homes.slice(0, Math.max(1, Math.min(jobs, jobsList.length)));
  const t0 = Date.now();
  let n = 0;
  const retry: MatchJob[] = [];
  const fd = fs.openSync(gamesFile, 'a');
  const ledgerFd = record === 'none' ? -1 : fs.openSync(path.join(out, 'ledger.jsonl'), 'a');
  const writeLedger = (p: PlannedGame, r: MatchResult): void => {
    const l = ledgerOf(r);
    if (ledgerFd >= 0 && l) fs.writeSync(ledgerFd, `${JSON.stringify({ v: 1, g: p.g, seed: p.seed, a: p.a, b: p.b, key: rowsKeyOf(p), ledger: l })}\n`);
  };
  try {
    await runPool({ ...env, homes }, jobsList, path.join(out, 'logs'), (job, r, worker) => {
      const p = byJob.get(job.id) as PlannedGame;
      const row = rowOf(p, r, worker, policyA, policyB, replay ? `${planDoc.replay}#g${p.g}` : undefined);
      if (row.engineError) {                                        // retried once, after the others; no row yet
        retry.push(job);
        say(`  g${p.g} ENGINE ERROR: ${row.engineError} (will retry once)`);
        return;
      }
      writeLedger(p, r);                                            // the ledger first: a row means its ledger is on disk
      fs.writeSync(fd, `${JSON.stringify(row)}\n`);
      n++;
      if (n % 100 === 0 || n === jobsList.length) {
        const h = (Date.now() - t0) / 3_600_000;
        say(`[${n}/${jobsList.length}] ${(n / h).toFixed(0)} games/h`);
      }
    }, say);
    if (retry.length) {
      say(`census-play: retrying ${retry.length} game(s) that hit an engine error, once, on fresh workers`);
      await runPool({ ...env, homes: env.homes.slice(0, Math.max(1, Math.min(jobs, retry.length))) }, retry, path.join(out, 'logs'), (job, r, worker) => {
        const p = byJob.get(job.id) as PlannedGame;
        const row: GameRowOut = { ...rowOf(p, r, worker, policyA, policyB, replay ? `${planDoc.replay}#g${p.g}` : undefined), retried: true };
        if (!row.engineError) writeLedger(p, r);
        fs.writeSync(fd, `${JSON.stringify(row)}\n`);
        n++;
        say(`  g${p.g} retried: ${row.engineError ? `ENGINE ERROR again (${row.engineError}); marked` : 'played'}`);
      }, say);
    }
  } finally {
    fs.closeSync(fd);
    if (ledgerFd >= 0) fs.closeSync(ledgerFd);
  }
  for (const h of homes) {
    const prefs = path.join(path.dirname(h), 'forge', 'preferences');
    const saved = fs.existsSync(prefs) ? fs.readdirSync(prefs) : [];
    if (saved.length > 0) throw new Error(`a worker SAVED Forge preferences under ${prefs} (${saved.join(', ')}) -- a run must never save prefs (CLAUDE.md hard rule 11, D107)`);
  }
  writeTally(out, gamesFile, { games: n, ms: Date.now() - t0, workers: homes.length }, say);
  return recordReport(repo, out, record, say);
}

function quantile(xs: number[], q: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1) + 0.5))] as number;
}

/** Per-game sizes of one artifact: total, mean, median, p90, max (bytes). */
export function sizeStats(xs: number[]): { games: number; total: number; mean: number | null; median: number | null; p90: number | null; max: number | null } {
  const total = xs.reduce((a, b) => a + b, 0);
  return { games: xs.length, total, mean: xs.length ? Math.round(total / xs.length) : null, median: quantile(xs, 0.5), p90: quantile(xs, 0.9), max: xs.length ? Math.max(...xs) : null };
}

/**
 * Run tools/check-redaction.mjs over `files`, a batch at a time; the files that failed.  `flags` go to
 * every call (the atlas's branch logs pass `--empty-hand-ok`, D460; nothing else passes any).
 */
export function redactionCheck(repo: string, files: string[], batch = 100, flags: string[] = []): { checked: number; failed: string[]; ms: number } {
  const t0 = Date.now();
  const failed: string[] = [];
  for (let i = 0; i < files.length; i += batch) {
    const part = files.slice(i, i + batch);
    const r = spawnSync('node', [path.join(repo, 'tools/check-redaction.mjs'), ...flags, ...part], { cwd: repo, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    if (r.status === 0) continue;
    // which ones: the checker names a failing file on its FAIL lines; else check them one by one
    for (const f of part) {
      const one = spawnSync('node', [path.join(repo, 'tools/check-redaction.mjs'), ...flags, f], { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      if (one.status !== 0) failed.push(f);
    }
  }
  return { checked: files.length, failed, ms: Date.now() - t0 };
}

/**
 * D480: redactionCheck with `n` batches at a time.  The same batches, the same calls and the same one-by-one pass over a
 * failed batch; the failed files come back in the serial order, so only `ms` (wall time) differs from redactionCheck's.
 */
export async function redactionCheckParallel(repo: string, files: string[], batch = 100, flags: string[] = [], n = 1): Promise<{ checked: number; failed: string[]; ms: number }> {
  const t0 = Date.now();
  const script = path.join(repo, 'tools/check-redaction.mjs');
  const run = (args: string[]): Promise<number> => new Promise((resolve, reject) => {
    const p = spawn('node', [script, ...flags, ...args], { cwd: repo, stdio: ['ignore', 'ignore', 'ignore'] });
    p.once('error', reject);
    p.once('close', (code) => resolve(code ?? 1));
  });
  const parts: string[][] = [];
  for (let i = 0; i < files.length; i += batch) parts.push(files.slice(i, i + batch));
  const failed: string[][] = parts.map(() => []);
  let next = 0;
  const one = async (): Promise<void> => {
    while (next < parts.length) {
      const j = next++;
      const part = parts[j] as string[];
      if ((await run(part)) === 0) continue;
      // which ones: check them one by one, as redactionCheck does
      for (const f of part) if ((await run([f])) !== 0) (failed[j] as string[]).push(f);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, parts.length)) }, one));
  return { checked: files.length, failed: failed.flat(), ms: Date.now() - t0 };
}

/**
 * D450: check and measure what a --record run kept: the rows (shape; ids against the frame logs in full
 * mode), the frame logs (tools/check-redaction.mjs), the engine's leak check counts, and each artifact's
 * size per game.  Into census-play.json's `record`; 3 when anything failed.
 */
export function recordReport(repo: string, out: string, record: RecordMode, say: (s: string) => void): number {
  if (record === 'none') return 0;
  const gamesFile = path.join(out, 'games.jsonl');
  const rows: GameRowOut[] = fs.existsSync(gamesFile) ? [...fileLines(gamesFile, { complete: true })].filter(Boolean).map((l) => JSON.parse(l) as GameRowOut) : [];
  const ok = rows.filter((r) => !r.engineError);
  const frames = (g: number, seat: number): string => path.join(out, 'frames', `g${g}-seat${seat}.jsonl.gz`);
  const rowsDir = path.join(out, 'rows');
  const rc = checkRowsDir(rowsDir, record === 'full' ? (b, seat) => frames(Number(b.g), seat) : undefined);
  const byKey = rowBytesByGame(rowsDir);
  const ledgerBytes = new Map<number, number>();
  const lf = path.join(out, 'ledger.jsonl');
  if (fs.existsSync(lf)) for (const l of fileLines(lf, { complete: true })) if (l) ledgerBytes.set((JSON.parse(l) as { g: number }).g, Buffer.byteLength(l) + 1);
  const sz = { rows: [] as number[], ledger: [] as number[], full: [] as number[] };
  const logs: string[] = [];
  let leaks = 0, checks = 0, controls = 0, controlMoved = 0, candidates = 0, rowsMissing = 0;
  for (const r of ok) {
    const key = r.rows?.key ?? rowsKeyOf(r);
    const rb = byKey.get(key);
    if (rb === undefined) rowsMissing++; else sz.rows.push(rb);
    const lb = ledgerBytes.get(r.g);
    if (lb !== undefined) sz.ledger.push(lb);
    if (record === 'full') {
      const fs2 = [frames(r.g, 0), frames(r.g, 1)].filter((f) => fs.existsSync(f));
      logs.push(...fs2);
      sz.full.push(fs2.reduce((a, f) => a + fs.statSync(f).size, 0));
    }
    if (r.rowsCheck) { leaks += r.rowsCheck.leaks; checks += r.rowsCheck.checks; controls += r.rowsCheck.controls; controlMoved += r.rowsCheck.controlMoved; candidates += r.rowsCheck.candidates ?? 0; }
  }
  const red = record === 'full' ? redactionCheck(repo, logs) : null;
  const problems = [...rc.problems];
  if (leaks > 0) problems.push(`the engine's leak check: ${leaks} of ${checks} rows' states or candidate vectors moved when only the opponent's hidden cards did`);
  if (red && red.failed.length) problems.push(`${red.failed.length} frame log(s) failed tools/check-redaction.mjs: ${red.failed.slice(0, 5).map((f) => path.basename(f)).join(', ')}`);
  if (rowsMissing > 0) problems.push(`${rowsMissing} game(s) with no rows in ${path.basename(rowsDir)}/`);
  const doc = {
    mode: record, games: ok.length,
    sizes: { rows: sizeStats(sz.rows), ledger: sizeStats(sz.ledger), ...(record === 'full' ? { full: sizeStats(sz.full) } : {}) },
    rowsCheck: { files: rc.files, rows: rc.rows, gamesIdChecked: rc.games, problems: rc.problems.length },
    leakCheck: { checks, leaks, controls, controlMoved, candidates },
    redaction: red ? { logs: red.checked, failed: red.failed.length, ms: red.ms } : null,
    problems: problems.slice(0, 50),
  };
  const tallyFile = path.join(out, 'census-play.json');
  const tally = fs.existsSync(tallyFile) ? JSON.parse(fs.readFileSync(tallyFile, 'utf8')) as Record<string, unknown> : {};
  fs.writeFileSync(tallyFile, `${JSON.stringify({ ...tally, record: doc }, null, 2)}\n`);
  const kb = (x: number | null): string => (x === null ? '-' : `${(x / 1024).toFixed(1)} KB`);
  say(`census-play: record ${record}: per game rows ${kb(doc.sizes.rows.mean)} (median ${kb(doc.sizes.rows.median)}), ledger ${kb(doc.sizes.ledger.mean)}${record === 'full' ? `, frames ${kb(doc.sizes.full?.mean ?? null)}` : ''}; rows checked ${rc.rows} in ${rc.files} file(s)${checks ? `, leak check ${leaks}/${checks} (candidates compared in ${candidates}; controls moved ${controlMoved}/${controls})` : ''}${red ? `, ${red.checked} frame log(s) redaction-checked in ${(red.ms / 1000).toFixed(0)} s` : ''}`);
  if (problems.length) {
    for (const pr of problems.slice(0, 20)) say(`  RECORD PROBLEM: ${pr}`);
    return 3;
  }
  return 0;
}

/** census-play.json: the folder's rows counted, and this session's rate. */
export function writeTally(out: string, gamesFile: string, session: { games: number; ms: number; workers: number } | null, say: (s: string) => void): void {
  const t = { games: 0, decisive: 0, draws: 0, timeouts: 0, engineErrors: 0, errors: 0, firstWins: 0, aWins: 0, searchSeats: 0, turnsSum: 0, retried: 0 };
  if (fs.existsSync(gamesFile)) {
    for (const l of fileLines(gamesFile, { complete: true })) {
      if (!l) continue;
      const r = JSON.parse(l) as GameRowOut;
      t.games++;
      if (r.retried) t.retried++;
      if (r.engineError) { t.engineErrors++; continue; }
      if (r.error) t.errors++;
      if (r.timeout) t.timeouts++;
      if (r.winner === 'a' || r.winner === 'b') {
        t.decisive++;
        if (r.winner === 'a') t.aWins++;
        if (r.first && r.winner === r.first) t.firstWins++;
      } else t.draws++;
      if (r.searchA) t.searchSeats++;
      if (r.searchB) t.searchSeats++;
      t.turnsSum += r.turns ?? 0;
    }
  }
  const prevFile = path.join(out, 'census-play.json');
  const prev = fs.existsSync(prevFile) ? (JSON.parse(fs.readFileSync(prevFile, 'utf8')) as { sessions?: unknown[] }) : {};
  const sessions = [...(prev.sessions ?? []), ...(session ? [{ ...session, gamesPerHour: session.ms > 0 ? Math.round(session.games / (session.ms / 3_600_000)) : null, at: new Date().toISOString() }] : [])];
  const doc = {
    v: 1, games: t.games, decisive: t.decisive, draws: t.draws, timeouts: t.timeouts, engineErrors: t.engineErrors, retried: t.retried, gameErrors: t.errors,
    engineErrorRate: t.games ? Math.round((t.engineErrors / t.games) * 1e6) / 1e6 : 0,
    firstPlayerWinRate: t.decisive ? Math.round((t.firstWins / t.decisive) * 1e4) / 1e4 : null,
    meanTurns: t.games - t.engineErrors > 0 ? Math.round((t.turnsSum / (t.games - t.engineErrors)) * 100) / 100 : null,
    searchSeats: t.searchSeats, sessions,
  };
  fs.writeFileSync(prevFile, `${JSON.stringify(doc, null, 2)}\n`);
  say(`census-play: ${t.games} game(s) in ${path.basename(out)}/games.jsonl: ${t.decisive} decisive, ${t.draws} drawn (${t.timeouts} timeouts), ${t.engineErrors} engine error(s)${session ? `; this session ${session.games} in ${(session.ms / 1000).toFixed(0)} s on ${session.workers} worker(s) = ${doc.sessions.at(-1) && (doc.sessions.at(-1) as { gamesPerHour: number | null }).gamesPerHour} games/h` : ''}`);
}
