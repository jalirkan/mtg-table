// mtg-table — the cube lab: are the Forge and search seats untouched?  (D451's byte-identical self-test)
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh seat-identity [--write] [--out <dir>]
//
// The move atlas (D451) added the random seat to the exploration path and an observe hook to the search;
// the record lane (D450) added the observing seat.  None of it may change how a Forge seat, a search seat
// or a D358 exploring seat plays.  This command plays four fixed games on the cube lab's worker -- the
// same decks, seeds and seat specs every time -- and compares what each game was with a committed golden,
// fixtures/cubelab/seat-identity.json, which was made from the code BEFORE D450 (origin/main at 7a87bb02,
// its own classes on the worker, this driver unchanged):
//
//   forge    Default vs Default, both chairs recorded (our controller with no policy, D315/D347)
//   search   a deterministic search seat (search-v1's loop at a fixed two rounds, seed 1, a budget it never
//            reaches) vs Default, both chairs recorded -- its decision records carry the search's numbers
//   explore  Default vs Default with D358's play exploration (epsilon 0.05, close calls 0.02, opening on)
//   plain    Default vs Default through Forge's own controller, unrecorded (D447's census seat): its result
//
// A recorded game's identity is both seats' DECISIONS -- every decision record (the legal options, the
// answer, who answered, the search's numbers but its wall time `ms`), without the frame numbers it points
// at -- and each seat's last state and `over`, under census-replay's normalisation (D450).  Not every
// state frame: the recorder cuts frames on a 500 ms clock, so where they are cut moves with the machine
// (measured: one more cut in the mulligans on a cold JVM) while the game does not.  An unrecorded game's
// identity is its winner, turns, first player and reason.  Exit 0 when every game is the golden's, 4 otherwise (naming the first different line).
// --write makes the golden (from whatever classes CUBELAB_CP names).  Not in the gate: it boots Forge.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { engineEnv, runPool, type MatchJob, type MatchResult } from './engine.ts';
import { framesFace } from './censusreplay.ts';
import { readMaybeGz } from './rowscheck.ts';

export const GOLDEN = 'fixtures/cubelab/seat-identity.json';
const DECK_A = 'decks/pacho-shield.dck';
const DECK_B = 'decks/doom-legion.dck';

export interface IdentityGame { name: string; profileA: string; profileB: string; seed: number; record: boolean; playExplore?: Record<string, unknown> }

export const GAMES: IdentityGame[] = [
  { name: 'forge', profileA: 'Default', profileB: 'Default', seed: 4511, record: true },
  { name: 'search', profileA: 'Default+search:ms=60000,cands=4,rounds=2,maxrounds=2,seed=1', profileB: 'Default', seed: 4512, record: true },
  { name: 'explore', profileA: 'Default', profileB: 'Default', seed: 4513, record: true, playExplore: { epsilon: 0.05, closeCall: 0.02, opening: true } },
  { name: 'plain', profileA: 'Default', profileB: 'Default', seed: 4514, record: false },
];

/** A frame log's identity lines: census-replay's normalisation, plus the search's own timings dropped. */
export function identityLines(text: string): string[] {
  return framesFace(text).map((l) => {
    if (!l.includes('"type":"decision"')) return l;
    const o = JSON.parse(l) as { body?: { search?: Record<string, unknown> } };
    const s = o.body?.search;
    if (s) delete s.ms;   // the search's wall time; every other number of a fixed-round, seeded search is the game's
    return JSON.stringify(o);
  });
}

/**
 * A recorded game's identity lines: its decision records without the frame numbers they point at, and
 * the seat's last state and `over`.  The recorder cuts state frames on a 500 ms clock, so WHERE the frames
 * are cut moves with the machine while the game does not.
 */
export function decisionLines(lines: string[]): string[] {
  const out = lines.filter((l) => l.includes('"type":"decision"')).map((l) => l.replace(/"seq":\d+,/, '').replace(/"frame":\d+,/, '').replace(/"stateSeq":\d+,/, ''));
  const states = lines.filter((l) => l.includes('"type":"state"'));
  const last = states.at(-1);
  if (last) out.push(last.replace(/"seq":\d+,/, ''));
  out.push(...lines.filter((l) => l.includes('"type":"over"')).map((l) => l.replace(/"seq":\d+,/, '')));
  return out;
}

export function digest(lines: string[]): string {
  return createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16);
}

export async function seatIdentityCommand(repo: string, f: Map<string, string[]>, say: (s: string) => void): Promise<number> {
  const write = f.has('write');
  const out = path.resolve(repo, f.get('out')?.at(-1) ?? 'var/cubelab/seat-identity');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const env = engineEnv(repo);
  const jobs: MatchJob[] = GAMES.map((g) => {
    const j: MatchJob & Record<string, unknown> = {
      id: g.name, seed: g.seed, games: 1, gameTimeoutSec: 900, profileA: g.profileA, profileB: g.profileB, builder: 'lab',
      deckA: path.join(repo, DECK_A), deckB: path.join(repo, DECK_B), poolA: [], poolB: [], forgeDeckOutA: '', forgeDeckOutB: '',
    };
    if (g.record) j.record = { dir: path.join(out, g.name), rel: g.name, run: 'seat-identity', cube: '', cubeFile: '', cubeSha: '', format: 'identity', deckNameA: 'A', deckNameB: 'B' };
    if (g.playExplore) j.playExplore = g.playExplore as unknown as MatchJob['playExplore'];
    return j;
  });
  const got = new Map<string, MatchResult>();
  await runPool({ ...env, homes: env.homes.slice(0, Math.min(env.homes.length, jobs.length)) }, jobs, path.join(out, 'logs'), (j, r) => { got.set(j.id, r); }, say);
  const now: Record<string, { winner: string | null; turns: number | null; first: string | null; reason: string | null; digest?: string; lines?: number }> = {};
  const linesOf: Record<string, string[]> = {};
  for (const g of GAMES) {
    const r = got.get(g.name);
    const x = r?.games[0];
    if (!r || r.engineError || !x) throw new Error(`seat-identity: game ${g.name} did not finish (${r?.engineError ?? 'no row'})`);
    const e: (typeof now)[string] = { winner: x.winner, turns: x.turns, first: x.onPlayVerified, reason: x.reason };
    if (g.record) {
      const lines = [0, 1].flatMap((s) => {
        const ls = identityLines(readMaybeGz(path.join(out, g.name, `g1-seat${s}.jsonl.gz`)));
        return decisionLines(ls).map((l) => `${s} ${l}`);
      });
      e.digest = digest(lines);
      e.lines = lines.length;
      linesOf[g.name] = lines;
      fs.writeFileSync(path.join(out, `${g.name}.identity.txt`), `${lines.join('\n')}\n`);
    }
    now[g.name] = e;
  }
  const golden = path.join(repo, GOLDEN);
  if (write) {
    fs.mkdirSync(path.dirname(golden), { recursive: true });
    fs.writeFileSync(golden, `${JSON.stringify({ v: 1, decision: 'D451', decks: [DECK_A, DECK_B], games: GAMES, results: now }, null, 2)}\n`);
    say(`seat-identity: wrote ${GOLDEN}: ${Object.entries(now).map(([k, v]) => `${k} ${v.winner} in ${v.turns}${v.digest ? ` ${v.digest}` : ''}`).join(', ')}`);
    return 0;
  }
  const want = JSON.parse(fs.readFileSync(golden, 'utf8')) as { results: typeof now };
  let bad = 0;
  for (const g of GAMES) {
    const a = want.results[g.name], b = now[g.name];
    const same = !!a && !!b && a.winner === b.winner && a.turns === b.turns && a.first === b.first && a.reason === b.reason && a.digest === b.digest;
    say(`seat-identity: ${g.name}: ${same ? 'the same game' : 'DIFFERENT'} (${b?.winner} in ${b?.turns} turns${b?.digest ? `, ${b.lines} lines, digest ${b.digest}` : ''}; golden ${a?.winner} in ${a?.turns}${a?.digest ? `, ${a.lines} lines, ${a.digest}` : ''})`);
    if (!same) bad++;
  }
  say(bad ? `seat-identity: ${bad} game(s) differ from ${GOLDEN} -- see ${path.relative(repo, out)}/<game>.identity.txt` : `seat-identity: all ${GAMES.length} games are the golden's`);
  return bad ? 4 : 0;
}
