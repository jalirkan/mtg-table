/*
 * mtg-table — web/test/cubelab-watch.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The cube lab's `watch` (D440, tools/cubelab/watch.ts), its engine-free half:
 *
 *  - draft.json's shape, from real lab drafts of a synthetic cube: every pick's
 *    grid has nine slots, the opener's are all full, the second drafter's grid is
 *    exactly what the opener left, every line taken is 0-5 and holds what the log
 *    says was taken, the pools are the sum of the picks, the decks are 40 -- and
 *    the checker's own negative cases;
 *  - match.json's state machine: drafting -> playing -> done | error | stopped,
 *    a terminal status stays, games are appended one at a time and a finished one
 *    never changes, the wins are the finished games, nothing is played past the
 *    decision; and the best-of result;
 *  - the players (`search` or a profile) and RecordMatch's summary lines;
 *  - the drafters (D443: lab, or one side forge-ranks / llm:<model> / human-picks), and a watch whose
 *    llm: drafter stops it -- the fallback stop and the spend cap -- run for real through watch() and
 *    the lab's run, with no engine (cached invented facts; it stops before any game): match.json ends
 *    `error` in the drafter's own words, with the cube, players, drafters and the real `cost`;
 *  - D444: a custom cube is the watch folder's own cube.md (the coach helper writes it first): the watch
 *    keeps it, drafts from it with no ratings file (Forge's ranks), and names it in match.json; a cube.md
 *    that is not the watch's cube is a file the watch did not write.
 *
 * The end-to-end run (the engine, the games, the redaction check) is the smoke in
 * docs/guides/cube-lab.md's watch section; the helper's routes are
 * tools/watch-runner-selftest.mjs (gate 12f).
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import type { LabCard } from '../../tools/cubelab/cards.ts';
import { parseCube, type Cube } from '../../tools/cubelab/cube.ts';
import { runDraft, type LoadedCube } from '../../tools/cubelab/lab.ts';
import { defaultRatings, type DraftRecord } from '../../tools/cubelab/run.ts';
import { DEFAULT_WEIGHTS } from '../../tools/cubelab/weights.ts';
import { fakeDraftModel, type DraftModel } from '../../tools/cubelab/llmdraft.ts';
import {
  draftProblems, parsePlayer, parseSummary, parseWatchDrafters, resultOf, seatSpecOf, sideboardOf, transitionProblem, watch, WATCH_LLM_CAPS, watchDeck, watchPicks,
  type WatchDraft, type WatchGame, type WatchMatch,
} from '../../tools/cubelab/watch.ts';

const THEMES = ['SAC', 'TOK', 'ETB', 'GY', 'SPL', 'ART'];
function card(name: string, colors: string, o: Partial<LabCard> = {}): LabCard {
  const pips: Partial<Record<'W' | 'U' | 'B' | 'R' | 'G', number>> = {};
  for (const c of colors) pips[c as 'W'] = 1;
  return {
    name, section: colors, themes: [], roles: [], colors, cmc: 2, pips, type: 'Creature',
    land: false, creature: true, planeswalker: false, produces: '', fixer: false, rating: 50, remAIDeck: false, ...o,
  };
}
function cube(): LoadedCube {
  const cards: LabCard[] = [];
  let i = 0;
  for (const c of 'WUBRG') {
    for (let k = 0; k < 30; k++, i++) {
      cards.push(card(`${c} card ${k}`, c, { cmc: 1 + (k % 6), rating: 30 + ((i * 37) % 60), themes: [THEMES[k % 6] as string], creature: k % 3 !== 0 }));
    }
  }
  for (const p of ['WU', 'UB', 'BR', 'RG', 'WG', 'WB', 'UR', 'BG', 'WR', 'UG']) {
    cards.push(card(`${p} dual`, '', { land: true, creature: false, produces: p, rating: 80, type: 'Land', cmc: 0, pips: {} }));
    cards.push(card(`${p} gold`, p, { cmc: 3, rating: 70, themes: ['TOK'] }));
  }
  return { cube: { title: 'T' } as Cube, cards, byName: new Map(cards.map((c) => [c.name, c])), missing: [], ratedFromFile: cards.length };
}

/** A drafts.jsonl line as `run --games 0` writes it, from a lab draft. */
function record(seed: number): DraftRecord {
  const d = runDraft(cube(), 'grid', seed, DEFAULT_WEIGHTS);
  return {
    v: 1, cube: 'T', ...d,
    drafters: d.drafters.map((dr) => ({ ...dr, played: 'lab', deckFile: `decks/${seed}-${dr.seat}.dck`, forgeDeckFile: `decks/${seed}-${dr.seat}-forge.dck`, forge: null })),
    match: { games: [], winsA: 0, winsB: 0, winner: 'draw', worker: 0 },
    ms: { ...d.ms, match: 0 },
  } as unknown as DraftRecord;
}

function draftOf(rec: DraftRecord): WatchDraft {
  const decks = {
    A: { name: 'Drafter A', file: 'deck-A.dck', ...watchDeck(rec, 0) },
    B: { name: 'Drafter B', file: 'deck-B.dck', ...watchDeck(rec, 1) },
  };
  return {
    v: 1, kind: 'watch-draft', id: 'watch-t-1', faceUp: true, cube: { title: 'T', file: 'cubes/t.md', sha256: 'x' }, format: 'grid',
    seed: rec.seed, startedAt: '2026-10-15T00:00:00.000Z', draftedMs: 1, drafters: { A: { drafter: 'lab' }, B: { drafter: 'lab' } },
    firstSeat: rec.aOpens ? 'A' : 'B', grids: 18, picks: watchPicks(rec), pools: { A: rec.drafters[0].pool, B: rec.drafters[1].pool }, decks,
  };
}

test('draft.json: 36 picks of nine-slot grids, valid lines, pools the sum of the picks, 40-card decks -- for several seeds', () => {
  let checked = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const rec = record(seed);
    if (rec.drafters.some((d) => !d.deck || d.deckErrors.length > 0)) continue;   // run would play Forge's build; the shape is the same
    const d = draftOf(rec);
    assert.deepEqual(draftProblems(d), [], `seed ${seed}`);
    assert.equal(d.picks.length, 36);
    assert.ok(d.picks.every((p) => p.slots.length === 9 && p.line >= 0 && p.line <= 5 && p.took.length >= 2 && p.took.length <= 3));
    // the opener alternates grid by grid, and the seed's parity opens grid 1 (lab.ts)
    assert.equal(d.picks[0]?.seat, seed % 2 === 0 ? 'A' : 'B');
    assert.equal(d.picks[2]?.seat, seed % 2 === 0 ? 'B' : 'A');
    // a second pick crossing the first takes 2, a parallel one 3
    for (const p of d.picks.filter((x) => x.order === 2)) {
      const first = d.picks[p.n - 2] as (typeof d.picks)[number];
      assert.equal(p.took.length, (first.line < 3) === (p.line < 3) ? 3 : 2);
    }
    assert.equal(d.decks.A.cards, 40);
    assert.ok(d.decks.A.why && d.decks.A.why.spells + d.decks.A.why.lands === 40);
    checked++;
  }
  assert.ok(checked >= 3, `only ${checked} seeds built two lab decks`);
});

test('draft.json: the checker catches a moved slot, a wrong take, the opener\'s line again, a pool and a deck count', () => {
  const rec = [1, 2, 3, 4, 5, 6].map(record).find((r) => r.drafters.every((d) => d.deck && d.deckErrors.length === 0)) as DraftRecord;
  const base = draftOf(rec);
  const clone = (): WatchDraft => JSON.parse(JSON.stringify(base)) as WatchDraft;
  let d = clone();
  d.picks[1]!.slots = [...d.picks[1]!.slots].reverse();
  assert.ok(draftProblems(d).some((p) => /not the grid the opener left/.test(p)));
  d = clone();
  d.picks[0]!.took = d.picks[0]!.took.slice(1);
  assert.ok(draftProblems(d).some((p) => /took/.test(p)));
  d = clone();
  d.picks[1]!.line = d.picks[0]!.line;
  assert.ok(draftProblems(d).some((p) => /opener's own line|empty/.test(p)));
  d = clone();
  d.picks[0]!.slots = d.picks[0]!.slots.slice(0, 8);
  assert.ok(draftProblems(d).some((p) => /8 slots/.test(p)));
  d = clone();
  d.pools.A = d.pools.A.slice(1);
  assert.ok(draftProblems(d).some((p) => /pool A/.test(p)));
  d = clone();
  d.decks.B.cards = 39;
  assert.ok(draftProblems(d).some((p) => /deck B has 39/.test(p)));
  d = clone();
  d.picks.pop();
  assert.ok(draftProblems(d).length > 0);
});

test('watchPicks refuses a log whose second look is not what the first pick left', () => {
  const rec = record(2);
  const bad = JSON.parse(JSON.stringify(rec)) as DraftRecord;
  const second = bad.drafters.find((d) => d.picks[0]?.seen.length !== 9) as DraftRecord['drafters'][number];
  second.picks[0]!.seen = [...second.picks[0]!.seen].reverse();
  assert.throws(() => watchPicks(bad), /second look/);
});

test('the deck that plays: the lab\'s, else Forge\'s; the sideboard is the pool minus the main', () => {
  const rec = record(4);
  const lab = watchDeck(rec, 0);
  assert.equal(lab.builder, rec.drafters[0].deck ? 'lab' : 'forge');
  const forged = JSON.parse(JSON.stringify(rec)) as DraftRecord;
  forged.drafters[1].played = 'forge';
  forged.drafters[1].forge = { side: 'B', colors: 'WU', main: [[17, 'Plains'], [23, forged.drafters[1].pool[0] as string]] };
  const f = watchDeck(forged, 1);
  assert.equal(f.builder, 'forge');
  assert.equal(f.why, null);
  assert.equal(f.cards, 40);
  forged.drafters[1].forge = { side: 'B', error: 'no build' };
  assert.throws(() => watchDeck(forged, 1), /no deck/);
  assert.deepEqual(sideboardOf(['a', 'b', 'b', 'c'], [[1, 'b'], [16, 'Island']]), ['a', 'b', 'c']);
});

// ------------------------------------------------------------ match.json

const game = (n: number, o: Partial<WatchGame> = {}): WatchGame => ({
  n, file: `watch-t-1-g${n}.jsonl`, seed: 10 + n, status: 'playing', winner: null, reason: null, turns: null, startedMs: n * 1000, endedMs: null, redaction: null, ...o,
});
const finished = (n: number, winner: 'A' | 'B' | 'draw'): WatchGame => game(n, { status: 'done', winner, reason: 'AllOpponentsLost', turns: 12, endedMs: n * 1000 + 500, redaction: 'pass' });
function match(o: Partial<WatchMatch> = {}): WatchMatch {
  return {
    v: 1, kind: 'watch-match', id: 'watch-t-1', status: 'drafting', startedAt: 'x', updatedAt: 'x', cube: { title: 'T', file: 'cubes/t.md' }, seed: 1,
    bestOf: 3, need: 2, paceMs: 600, view: { seat: 0, side: 'A' },
    players: { A: { player: 'Default', profile: 'Default', policy: 'plain', deck: null }, B: { player: 'search', profile: 'Default', policy: 'search', deck: null } },
    drafters: { A: { drafter: 'lab' }, B: { drafter: 'lab' } }, cost: null,
    games: [], wins: { A: 0, B: 0, draws: 0 }, winner: null, current: null, ...o,
  };
}

test('match.json: the legal path, write by write, of a 2-1 best of three', () => {
  const steps: WatchMatch[] = [
    match(),
    match({ status: 'playing' }),
    match({ status: 'playing', games: [game(1)], current: 1 }),
    match({ status: 'playing', games: [finished(1, 'A')], wins: { A: 1, B: 0, draws: 0 } }),
    match({ status: 'playing', games: [finished(1, 'A'), game(2)], wins: { A: 1, B: 0, draws: 0 }, current: 2 }),
    match({ status: 'playing', games: [finished(1, 'A'), finished(2, 'B')], wins: { A: 1, B: 1, draws: 0 } }),
    match({ status: 'playing', games: [finished(1, 'A'), finished(2, 'B'), game(3)], wins: { A: 1, B: 1, draws: 0 }, current: 3 }),
    match({ status: 'playing', games: [finished(1, 'A'), finished(2, 'B'), finished(3, 'A')], wins: { A: 2, B: 1, draws: 0 }, winner: 'A' }),
    match({ status: 'done', games: [finished(1, 'A'), finished(2, 'B'), finished(3, 'A')], wins: { A: 2, B: 1, draws: 0 }, winner: 'A' }),
  ];
  let prev: WatchMatch | null = null;
  for (const s of steps) {
    assert.equal(transitionProblem(prev, s), null, JSON.stringify(s.games.map((g) => g.status)));
    prev = s;
  }
});

test('match.json: what the state machine refuses', () => {
  const playing = match({ status: 'playing', games: [game(1)], current: 1 });
  const done = match({ status: 'done', games: [finished(1, 'A'), finished(2, 'A')], wins: { A: 2, B: 0, draws: 0 }, winner: 'A' });
  assert.match(transitionProblem(null, playing) ?? '', /first match.json/);
  assert.match(transitionProblem(done, { ...done, status: 'playing' }) ?? '', /done -> playing/);
  assert.match(transitionProblem(match(), match({ status: 'done', winner: 'A' })) ?? '', /drafting -> done/);
  assert.match(transitionProblem(match(), match({ games: [game(1)] })) ?? '', /while drafting/);
  assert.match(transitionProblem(playing, match({ status: 'playing', games: [game(1), game(2)] })) ?? '', /two games playing/);
  assert.match(transitionProblem(match({ status: 'playing' }), match({ status: 'playing', games: [game(1), game(2)] })) ?? '', /two games started/);
  const one = match({ status: 'playing', games: [finished(1, 'A')], wins: { A: 1, B: 0, draws: 0 } });
  assert.match(transitionProblem(one, { ...one, games: [finished(1, 'B')], wins: { A: 0, B: 1, draws: 0 } }) ?? '', /finished game 1 changed/);
  assert.match(transitionProblem(one, { ...one, games: [] }) ?? '', /vanished/);
  assert.match(transitionProblem(playing, match({ status: 'playing', games: [finished(1, 'A')] })) ?? '', /wins are not/);
  assert.match(transitionProblem(playing, match({ status: 'done', games: [game(1)], winner: 'A' })) ?? '', /still playing/);
  const twoOh = match({ status: 'playing', games: [finished(1, 'A'), finished(2, 'A')], wins: { A: 2, B: 0, draws: 0 }, winner: 'A' });
  assert.match(transitionProblem(twoOh, match({ status: 'playing', games: [finished(1, 'A'), finished(2, 'A'), finished(3, 'A')], wins: { A: 3, B: 0, draws: 0 } })) ?? '', /past the decision/);
  assert.match(transitionProblem(twoOh, { ...twoOh, status: 'done', winner: null }) ?? '', /no result/);
  // error and stopped are reachable from drafting and playing, and stay
  assert.equal(transitionProblem(match(), match({ status: 'error', error: 'x' })), null);
  assert.equal(transitionProblem(playing, match({ status: 'stopped', games: [game(1, { status: 'error', error: 'stopped' })] })), null);
  assert.match(transitionProblem(match({ status: 'stopped' }), match({ status: 'playing' })) ?? '', /stopped -> playing/);
});

test('the best-of result', () => {
  const r = (A: number, B: number, draws: number, played: number, bestOf = 3): string | null =>
    resultOf({ wins: { A, B, draws }, need: Math.floor(bestOf / 2) + 1, bestOf, games: Array.from({ length: played }, (_, i) => finished(i + 1, 'A')) });
  assert.equal(r(2, 0, 0, 2), 'A');
  assert.equal(r(1, 2, 0, 3), 'B');
  assert.equal(r(1, 1, 0, 2), null);
  assert.equal(r(1, 1, 1, 3), 'draw');
  assert.equal(r(1, 0, 2, 3), 'A');
  assert.equal(r(1, 0, 0, 1, 1), 'A');
  assert.equal(r(0, 0, 1, 1, 1), 'draw');
});

test('players: a profile in any case, or search; RecordMatch\'s summary read back', () => {
  const profiles = ['Cautious', 'Default', 'Experimental', 'Reckless'];
  assert.deepEqual(parsePlayer('reckless', profiles), { player: 'Reckless', profile: 'Reckless', policy: 'plain' });
  assert.deepEqual(parsePlayer('search', profiles), { player: 'search', profile: 'Default', policy: 'search' });
  assert.deepEqual(parsePlayer('Search-V2', profiles), { player: 'search', profile: 'Default', policy: 'search' });
  assert.throws(() => parsePlayer('Godlike', profiles), /not search or one of/);
  assert.equal(seatSpecOf(parsePlayer('search', profiles)), 'Default+outlets+search:anytime=1');
  assert.equal(seatSpecOf(parsePlayer('Cautious', profiles)), 'Cautious');
  const out = 'player turns   = 18 (round 9)\nwinner         = AI-Seat1, reason = AllOpponentsLost\ngame wall time = 9 ms\nRECORD OK\n';
  assert.deepEqual(parseSummary(out), { winner: 'B', reason: 'AllOpponentsLost', turns: 18, ok: true });
  assert.equal(parseSummary('winner         = (draw), reason = Draw\nRECORD OK\n').winner, 'draw');
  assert.deepEqual(parseSummary('RECORD FAILED: x\n'), { winner: null, reason: null, turns: null, ok: false });
});

// ------------------------------------------------------------ the drafters (D443) and an llm: drafter's stop

test('the drafters: lab, or one side forge-ranks / llm:<model> / human-picks; two non-lab sides or an unknown one refused', () => {
  assert.deepEqual(parseWatchDrafters('lab', 'lab'), { drafters: { A: 'lab', B: 'lab' }, option: null });
  assert.deepEqual(parseWatchDrafters('forge-ranks', 'lab').option, { kind: 'forge-ranks', seat: 'A' });
  assert.deepEqual(parseWatchDrafters('lab', 'llm:sonnet').option, { kind: 'llm', model: 'sonnet', thinking: 'low', seat: 'B', seesOpponent: false });
  assert.deepEqual(parseWatchDrafters('lab', 'llm:haiku:thinking=off').option, { kind: 'llm', model: 'haiku', thinking: 'off', seat: 'B', seesOpponent: false });
  assert.deepEqual(parseWatchDrafters('human-picks:x.json', 'lab').option, { kind: 'human-picks', file: 'x.json', seat: 'A' });
  assert.throws(() => parseWatchDrafters('forge-ranks', 'llm:sonnet'), /one side at most/);
  assert.throws(() => parseWatchDrafters('lab', 'llm:gpt'), /--drafter-b is lab, forge-ranks, llm:/);
  assert.throws(() => parseWatchDrafters('ranks', 'lab'), /--drafter-a/);
  assert.deepEqual(WATCH_LLM_CAPS, { maxCalls: 40, maxUsd: 1, maxFallbackRate: 0.25 });
  assert.deepEqual(parsePlayer('search-v2', ['Default']), { player: 'search', profile: 'Default', policy: 'search' });
});

const CUBE_FILE = fileURLToPath(new URL('../../cubes/pauper-cube-180.md', import.meta.url));

/** A scratch repo whose cached facts answer the cube's lookup with invented cards, so the lab's run drafts with no engine. */
function factsRepo(): { repo: string; env: { cp: string; homes: string[]; repo: string } } {
  const repo = mkdtempSync(join(tmpdir(), 'cubelab-watch-'));
  const names = parseCube(readFileSync(CUBE_FILE, 'utf8')).cards.map((c) => c.name);
  const key = createHash('sha1').update([process.env.FORGE_JAR ?? '', '', ...names].join('\n')).digest('hex').slice(0, 16);
  mkdirSync(join(repo, 'var/cubelab/facts'), { recursive: true });
  const cards = names.map((n, i) => ({ listed: n, found: true, name: n, colors: 'WUBRG'[i % 5], manaCost: `1 ${'WUBRG'[i % 5]}`, cmc: 1 + (i % 5), type: 'Creature', creature: true, land: false, rank: { source: 'set', edition: 'X', defaultEdition: 'X', rawScore: 50 + (i % 40) } }));
  writeFileSync(join(repo, 'var/cubelab/facts', `${key}.json`), JSON.stringify({ cards }));
  const git = (...a: string[]): void => { execFileSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { stdio: 'ignore' }); };
  git('init', '-q');
  git('commit', '-q', '--allow-empty', '-m', 'scratch');
  return { repo, env: { cp: '', homes: [join(repo, 'home')], repo } };
}

async function stoppedWatch(model: DraftModel, caps = WATCH_LLM_CAPS): Promise<{ m: WatchMatch; e: unknown }> {
  const { repo, env } = factsRepo();
  try {
    const out = join(repo, 'var/spectate/watch-pauper-cube-180-12');
    const profiles = ['Default', 'Reckless'];
    const e = await watch(env, {
      cubeFile: CUBE_FILE, seed: 12, games: 3, players: { A: parsePlayer('Reckless', profiles), B: parsePlayer('search-v2', profiles) },
      drafters: { A: 'lab', B: 'llm:sonnet' }, paceMs: 0, out, ratingsFile: null, gameTimeoutSec: 60, llmCaps: caps, llmModel: async () => model,
    }, () => {}).then(() => null, (x: unknown) => x);
    const m = JSON.parse(readFileSync(join(out, 'match.json'), 'utf8')) as WatchMatch;
    return { m, e };
  } finally { rmSync(repo, { recursive: true, force: true }); }
}

test('a watch whose llm: drafter falls back too often ends error in its own words, never lab vs lab; match.json says what it was and what it cost', async () => {
  const loggedOut: DraftModel = { name: 'out', call: async () => { throw new Error('claude exited 1 with no output: Invalid API key · Please run /login'); } };
  const { m, e } = await stoppedWatch(loggedOut);
  assert.ok(e instanceof Error);
  assert.equal(m.status, 'error');
  assert.match(m.error ?? '', /^drafter B \(llm:sonnet\) stopped the watch -- the fallback stop: 3 of 3 decision\(s\) fell back .* is the Claude Code CLI logged in\?/);
  assert.equal(m.games.length, 0, 'no game was played');
  // what it was, though the draft never finished: the cube's title, the seed, the players, the drafters, the start
  assert.equal(m.cube.title, parseCube(readFileSync(CUBE_FILE, 'utf8')).title);
  assert.ok(m.cube.title.length > 0);
  assert.equal(m.seed, 12);
  assert.deepEqual([m.players.A.player, m.players.B.player, m.players.B.policy], ['Reckless', 'search', 'search']);
  assert.deepEqual(m.drafters, { A: { drafter: 'lab' }, B: { drafter: 'llm:sonnet' } });
  assert.ok(!Number.isNaN(Date.parse(m.startedAt)));
  // the real cost
  assert.ok(m.cost);
  assert.deepEqual([m.cost.side, m.cost.drafter, m.cost.calls, m.cost.callErrors, m.cost.decisions, m.cost.fallbacks, m.cost.usd, m.cost.stopped],
    ['B', 'llm:sonnet', 6, 6, 3, 3, 0, 'fallbacks']);
  assert.deepEqual(m.cost.caps, WATCH_LLM_CAPS);
  assert.match(m.cost.why ?? '', /^the fallback stop/);
});

test('a watch whose llm: drafter reaches the dollar cap stops before the call that would pass it; the cost is under the cap', async () => {
  const inner = fakeDraftModel();
  const priced: DraftModel = { name: 'priced', call: async (a) => ({ ...(await inner.call(a)), usage: { input: 10, cacheRead: 0, cacheCreate: 3000, output: 300 }, costUsd: 0.03 }) };
  const { m } = await stoppedWatch(priced, { ...WATCH_LLM_CAPS, maxUsd: 0.1 });
  assert.equal(m.status, 'error');
  assert.match(m.error ?? '', /^drafter B \(llm:sonnet\) stopped the watch -- the spend cap: \$0\.0900 spent of at most \$0\.1000 at list price/);
  assert.equal(m.cost?.calls, 3);
  assert.ok((m.cost?.usd ?? 1) <= 0.1);
  assert.deepEqual([m.cost?.cacheCreate, m.cost?.tokensOut, m.cost?.stopped], [9000, 900, 'max-usd']);
});

test('D444: a custom cube in the watch folder (cube.md, written by the helper first) is kept and drafted from, with no ratings file', async () => {
  const { repo, env } = factsRepo();
  try {
    const id = 'watch-my-pauper-copy-12';
    const out = join(repo, 'var/spectate', id);
    mkdirSync(out, { recursive: true });
    const text = readFileSync(CUBE_FILE, 'utf8').replace(/^# .*$/m, '# My Pauper Copy');
    const own = join(out, 'cube.md');
    writeFileSync(own, text);
    writeFileSync(join(out, 'watch.log'), '');
    writeFileSync(join(out, 'match.json'), '{"v":1,"kind":"watch-match","status":"drafting"}\n');
    assert.equal(defaultRatings(own), null, 'no ratings beside it: the lab drafts with Forge\'s ranks');
    const profiles = ['Default'];
    const loggedOut: DraftModel = { name: 'out', call: async () => { throw new Error('logged out'); } };
    const e = await watch(env, {
      cubeFile: own, seed: 12, games: 1, players: { A: parsePlayer('Default', profiles), B: parsePlayer('Default', profiles) },
      drafters: { A: 'lab', B: 'llm:sonnet' }, paceMs: 0, out, ratingsFile: defaultRatings(own), gameTimeoutSec: 60, llmCaps: WATCH_LLM_CAPS, llmModel: async () => loggedOut,
    }, () => {}).then(() => null, (x: unknown) => x);
    assert.ok(e instanceof Error, 'it stops at the fallback stop, before any game (no engine here)');
    assert.equal(readFileSync(own, 'utf8'), text, 'cube.md is still there, unchanged');
    const m = JSON.parse(readFileSync(join(out, 'match.json'), 'utf8')) as WatchMatch;
    assert.deepEqual(m.cube, { title: 'My Pauper Copy', file: `var/spectate/${id}/cube.md` });
    assert.match(m.error ?? '', /the fallback stop/, 'it got as far as drafting from the custom cube');
    assert.ok(existsSync(join(out, 'lab')), 'the lab ran in the folder');
    // the same folder with the cube given from elsewhere: its cube.md is not the watch's, and is refused as foreign
    await assert.rejects(watch(env, {
      cubeFile: CUBE_FILE, seed: 12, games: 1, players: { A: parsePlayer('Default', profiles), B: parsePlayer('Default', profiles) },
      drafters: { A: 'lab', B: 'lab' }, paceMs: 0, out, ratingsFile: null, gameTimeoutSec: 60,
    }, () => {}), /holds files a watch did not write \(cube\.md\)/);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('#150 review: match.json keeps the helper\'s unknownCards over the watch\'s first write, while it drafts', async () => {
  const { repo, env } = factsRepo();
  try {
    const id = 'watch-pauper-cube-180-14';
    const out = join(repo, 'var/spectate', id);
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'watch.log'), '');
    // the helper's first word, before its 202 (its own index's guess)
    writeFileSync(join(out, 'match.json'), `${JSON.stringify({ v: 1, kind: 'watch-match', status: 'drafting', unknownCards: ['From The Helper'] })}\n`);
    const profiles = ['Default'];
    const seen: Array<string[] | null | undefined> = [];
    const loggedOut: DraftModel = { name: 'out', call: async () => {
      seen.push((JSON.parse(readFileSync(join(out, 'match.json'), 'utf8')) as WatchMatch).unknownCards);
      throw new Error('logged out');
    } };
    const e = await watch(env, {
      cubeFile: CUBE_FILE, seed: 14, games: 1, players: { A: parsePlayer('Default', profiles), B: parsePlayer('Default', profiles) },
      drafters: { A: 'lab', B: 'llm:sonnet' }, paceMs: 0, out, ratingsFile: null, gameTimeoutSec: 60, llmCaps: WATCH_LLM_CAPS, llmModel: async () => loggedOut,
    }, () => {}).then(() => null, (x: unknown) => x);
    assert.ok(e instanceof Error);
    assert.deepEqual(seen[0], ['From The Helper'], 'while it drafts: the helper\'s list, carried over the watch\'s first write');
    // (after the draft, watch.ts sets it to run.json's `missing`, the engine's own list: that needs the
    // engine, so it is the real-engine smoke's, docs/decisions/D444's 2026-10-16 note)
  } finally { rmSync(repo, { recursive: true, force: true }); }
});
