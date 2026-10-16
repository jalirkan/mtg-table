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
// RESUMABLE.  plan.json holds the options; a second run with the same --out and the same options
// skips every game whose row is in games.jsonl (a torn last line is cut off first) and plays the
// rest; different options are refused.  census-play.json is the run's tally, rewritten at the end.

import fs from 'node:fs';
import path from 'node:path';

import { engineEnv, runPool, type MatchJob, type MatchResult } from './engine.ts';
import { fileLines } from './lines.ts';
import { rng, shuffle } from './rng.ts';
import { sha12, type DeckRecord } from './deckcensus.ts';

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
}

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
  return row;
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
  const decksDir = path.resolve(repo, decksArg);
  const out = path.resolve(repo, outArg);
  const policy = (k: string): Policy => {
    const v = (one(k) ?? 'plain') as Policy;
    if (!POLICIES.includes(v)) throw new Error(`census-play: --${k} is plain or search, got ${v}`);
    return v;
  };
  const policyA = policy('policy-a'), policyB = policy('policy-b');
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
    const rf = path.resolve(repo, replay);
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
  const planDoc = { v: 1, decision: 'D447', decks: path.relative(repo, decksDir), decksSha: sha, replay: replay ? path.relative(repo, path.resolve(repo, replay)) : null, replaySha, seed, pairs, policyA, policyB, profile: 'Default', games: plan.length, gameTimeoutSec: timeout };
  const planFile = path.join(out, 'plan.json');
  if (fs.existsSync(planFile)) {
    const was = JSON.parse(fs.readFileSync(planFile, 'utf8')) as Record<string, unknown>;
    const keys = ['decksSha', 'replaySha', 'seed', 'pairs', 'policyA', 'policyB', 'games'] as const;
    const diff = keys.filter((k) => JSON.stringify(was[k]) !== JSON.stringify(planDoc[k]));
    if (diff.length) throw new Error(`census-play: ${outArg} holds another run (${diff.map((k) => `${k} ${JSON.stringify(was[k])} -> ${JSON.stringify(planDoc[k])}`).join(', ')}); use another --out`);
  } else fs.writeFileSync(planFile, `${JSON.stringify(planDoc, null, 2)}\n`);
  const gamesFile = path.join(out, 'games.jsonl');
  const done = doneGames(gamesFile);
  const todo = plan.filter((p) => !done.has(p.g));
  say(`census-play: ${plan.length} game(s) planned over ${decks.length} deck(s)${replay ? ` (a replay of ${replay})` : `, seed ${seed}`}; ${done.size} already played, ${todo.length} to play on ${Math.min(jobs, Math.max(1, todo.length))} worker(s); pilots a ${policyA}, b ${policyB}`);
  if (todo.length === 0) { writeTally(out, gamesFile, null, say); return 0; }

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
    return job;
  });
  const homes = env.homes.slice(0, Math.max(1, Math.min(jobs, jobsList.length)));
  const t0 = Date.now();
  let n = 0;
  const fd = fs.openSync(gamesFile, 'a');
  try {
    await runPool({ ...env, homes }, jobsList, path.join(out, 'logs'), (job, r, worker) => {
      const p = byJob.get(job.id) as PlannedGame;
      const row = rowOf(p, r, worker, policyA, policyB, replay ? `${planDoc.replay}#g${p.g}` : undefined);
      fs.writeSync(fd, `${JSON.stringify(row)}\n`);
      n++;
      if (n % 100 === 0 || n === jobsList.length || row.engineError) {
        const h = (Date.now() - t0) / 3_600_000;
        say(`[${n}/${jobsList.length}] ${(n / h).toFixed(0)} games/h${row.engineError ? `  g${p.g} ENGINE ERROR: ${row.engineError}` : ''}`);
      }
    }, say);
  } finally {
    fs.closeSync(fd);
  }
  for (const h of homes) {
    const prefs = path.join(path.dirname(h), 'forge', 'preferences');
    const saved = fs.existsSync(prefs) ? fs.readdirSync(prefs) : [];
    if (saved.length > 0) throw new Error(`a worker SAVED Forge preferences under ${prefs} (${saved.join(', ')}) -- a run must never save prefs (CLAUDE.md hard rule 11, D107)`);
  }
  writeTally(out, gamesFile, { games: n, ms: Date.now() - t0, workers: homes.length }, say);
  return 0;
}

/** census-play.json: the folder's rows counted, and this session's rate. */
export function writeTally(out: string, gamesFile: string, session: { games: number; ms: number; workers: number } | null, say: (s: string) => void): void {
  const t = { games: 0, decisive: 0, draws: 0, timeouts: 0, engineErrors: 0, errors: 0, firstWins: 0, aWins: 0, searchSeats: 0, turnsSum: 0 };
  if (fs.existsSync(gamesFile)) {
    for (const l of fileLines(gamesFile, { complete: true })) {
      if (!l) continue;
      const r = JSON.parse(l) as GameRowOut;
      t.games++;
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
    v: 1, games: t.games, decisive: t.decisive, draws: t.draws, timeouts: t.timeouts, engineErrors: t.engineErrors, gameErrors: t.errors,
    engineErrorRate: t.games ? Math.round((t.engineErrors / t.games) * 1e6) / 1e6 : 0,
    firstPlayerWinRate: t.decisive ? Math.round((t.firstWins / t.decisive) * 1e4) / 1e4 : null,
    meanTurns: t.games - t.engineErrors > 0 ? Math.round((t.turnsSum / (t.games - t.engineErrors)) * 100) / 100 : null,
    searchSeats: t.searchSeats, sessions,
  };
  fs.writeFileSync(prevFile, `${JSON.stringify(doc, null, 2)}\n`);
  say(`census-play: ${t.games} game(s) in ${path.basename(out)}/games.jsonl: ${t.decisive} decisive, ${t.draws} drawn (${t.timeouts} timeouts), ${t.engineErrors} engine error(s)${session ? `; this session ${session.games} in ${(session.ms / 1000).toFixed(0)} s on ${session.workers} worker(s) = ${doc.sessions.at(-1) && (doc.sessions.at(-1) as { gamesPerHour: number | null }).gamesPerHour} games/h` : ''}`);
}
