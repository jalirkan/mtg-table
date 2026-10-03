/*
 * mtg-table — web/test/cubelab-explore.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Controlled exploration in the cube lab's deckbuilder (tools/cubelab/explore.ts,
 * D356), engine-free:
 *
 *  - off is off: share 0 returns the draft untouched, and the evolve's batch
 *    numbers with no explored draft are exactly cardStats over buildMeta;
 *  - a seeded draw: the same seed explores the same way twice; the drafts, picks
 *    and choice decks are those of an unexplored run; the forced card is an
 *    eligible target (rated under the bar, on colour, not chosen, not
 *    AI-limited); the deck that plays is legal and differs by that one card;
 *  - over many seeds the explored share and the forced decks match what the
 *    recorded probabilities say;
 *  - the batch split: counting numbers from every draft's choice decks, game
 *    numbers from the plain drafts only;
 *  - the estimator: exact arithmetic on hand-made decks, generations pool by
 *    adding sums, and on a simulated batch where decks with fewer eligible cards
 *    are weaker (so the raw forced-vs-not comparison is biased) the weighted
 *    delta recovers the true effect;
 *  - the verdicts: holds, weak, undecided, too few;
 *  - the changelog's pooled table and explore-health.ts's flat numbers (the PC
 *    jobs' checks) on a hand-made evolve folder.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import type { LabCard } from '../../tools/cubelab/cards.ts';
import { castableIn } from '../../tools/cubelab/cards.ts';
import { checkDeck, type DeckBuild } from '../../tools/cubelab/deck.ts';
import { batchStats, cardStats, type MetaDoc } from '../../tools/cubelab/evolve.ts';
import { parseExploreArgs, EVOLVE_EXPLORE_DEFAULTS } from '../../tools/cubelab/evolve-run.ts';
import { exploreSection, type GenSummary } from '../../tools/cubelab/evolve-report.ts';
import { evolveExploreHealth } from '../../tools/cubelab/explore-health.ts';
import {
  choiceRecord, exploreDraft, exploreHealth, exploreTable, isPlain, judgeExplored, mergeTables, propensities, ratio,
  type ExploreOptions, type ExploreRecord, type ExploreSeat, type ExploreTable,
} from '../../tools/cubelab/explore.ts';
import { runDraft, type DraftOut, type LoadedCube } from '../../tools/cubelab/lab.ts';
import { buildMeta } from '../../tools/cubelab/meta.ts';
import type { CardInfo } from '../../tools/cubelab/report.ts';
import { rng } from '../../tools/cubelab/rng.ts';
import type { DraftRecord, RunMeta } from '../../tools/cubelab/run.ts';
import { DEFAULT_WEIGHTS } from '../../tools/cubelab/weights.ts';

const W = DEFAULT_WEIGHTS;
const maxSplash = (stretched: boolean): number => (stretched ? W.maxSplashStretch : W.maxSplash);

// ------------------------------------------------------------ a synthetic cube (ratings spread across the bar)

function card(name: string, colors: string, cmc: number, o: Partial<LabCard> = {}): LabCard {
  const pips: Partial<Record<'W' | 'U' | 'B' | 'R' | 'G', number>> = {};
  for (const c of colors) pips[c as 'W'] = 1;
  return {
    name, section: colors || 'Colorless', themes: [], roles: [], colors, cmc, pips, type: 'Creature',
    land: false, creature: true, planeswalker: false, produces: '', fixer: false, rating: 50, remAIDeck: false, ...o,
  };
}
function cube(): LoadedCube {
  const cards: LabCard[] = [];
  let i = 0;
  for (const c of 'WUBRG') {
    for (let k = 0; k < 30; k++, i++) {
      cards.push(card(`${c} card ${k}`, c, 1 + (k % 6), { rating: 20 + ((i * 37) % 70), themes: [['SAC', 'TOK', 'ETB'][k % 3] as string], creature: k % 3 !== 0, remAIDeck: k === 29 }));
    }
  }
  for (const p of ['WU', 'UB', 'BR', 'RG', 'WG', 'WB', 'UR', 'BG', 'WR', 'UG']) {
    cards.push(card(`${p} gold`, p, 3, { rating: 70 }), card(`${p} gold low`, p, 2, { rating: 35 }));
  }
  for (let k = 0; k < 10; k++) cards.push(card(`Relic ${k}`, '', 2 + (k % 3), { rating: 30 + k * 4, creature: false }));
  return { cube: { title: 'Synthetic', cards: [], themeNames: {}, archetypes: {}, warnings: [] } as unknown as LoadedCube['cube'], cards, byName: new Map(cards.map((c) => [c.name, c])), missing: [], ratedFromFile: 0 };
}
const LC = cube();
const OPT: ExploreOptions = { share: 1, cap: 4, gold: 4, below: 60 };

/** A draft with a fake match: seat A wins each of three games with probability `pA`. */
function record(d: DraftOut, pA = 0.5): DraftRecord {
  const r = rng(d.seed, 'test-match');
  const games = [1, 2, 3].map((n) => ({ n, onPlay: 'A', onPlayVerified: null, winner: r.next() < pA ? 'A' : 'B', turns: 9, ms: 1, timeout: false, reason: null }));
  return {
    v: 1, cube: 'Synthetic', ...d,
    drafters: d.drafters.map((dr) => ({ ...dr, played: 'lab', deckFile: null, forgeDeckFile: '', forge: null })),
    match: { games, winsA: 0, winsB: 0, winner: 'A', worker: 0 },
    ms: { ...d.ms, match: 0 },
  } as unknown as DraftRecord;
}
const INFO: Record<string, CardInfo> = Object.fromEntries(LC.cards.map((c) => [c.name, { section: c.section, colors: c.colors, cmc: c.cmc, land: c.land, themes: c.themes, rating: c.rating, remAIDeck: c.remAIDeck, type: c.type }]));
const META = { cube: 'Synthetic', cubeFile: 'synthetic.md', format: 'grid', profiles: ['Default', 'Default'], seed: 1, drafts: 1 } as unknown as RunMeta;

// ------------------------------------------------------------ the draw

test('explore: share 0 leaves the draft untouched; the options parse', () => {
  const d = runDraft(LC, 'grid', 7, W);
  assert.equal(exploreDraft(d, { ...OPT, share: 0 }, LC.byName, maxSplash), d);
  assert.equal(parseExploreArgs([]), null);
  assert.deepEqual(parseExploreArgs(['on']), EVOLVE_EXPLORE_DEFAULTS);
  assert.equal(parseExploreArgs(['share=0.5', 'cap=3'])?.cap, 3);
  assert.throws(() => parseExploreArgs(['share=0']), /share/);
  assert.throws(() => parseExploreArgs(['shares=0.2']), /unknown/);
});

test('explore: seeded, the choice deck is the unexplored one, and the forced card is an eligible target', () => {
  let forced = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const d0 = runDraft(LC, 'grid', seed, W);
    const d = exploreDraft(d0, OPT, LC.byName, maxSplash);
    const again = exploreDraft(runDraft(LC, 'grid', seed, W), OPT, LC.byName, maxSplash);
    assert.deepEqual({ ...again, ms: null }, { ...d, ms: null }, `seed ${seed} draws the same twice`);
    const ex = d.explore as ExploreRecord;
    assert.ok(ex, 'share 1 explores every draft');
    d.drafters.forEach((dr, k) => {
      assert.deepEqual(dr.picks, d0.drafters[k]?.picks);
      assert.deepEqual(dr.pool, d0.drafters[k]?.pool);
      const s = ex.seats[k] as ExploreSeat;
      if (!s) return;
      assert.deepEqual(s.choice, d0.drafters[k]?.deck, 'the choice deck is what the builder made');
      const sum = s.eligible.reduce((a, [, p]) => a + p, 0);
      assert.ok(sum <= 1 + 1e-12);
      for (const [n] of s.eligible) {
        const c = LC.byName.get(n) as LabCard;
        assert.ok(c.rating < OPT.below && !c.land && !c.remAIDeck && castableIn(c, s.choice.colors), n);
        assert.ok(!s.choice.main.some(([, m]) => m === n), `${n} is not in the choice deck`);
      }
      if (!s.in) { assert.deepEqual(dr.deck, s.choice); return; }
      forced++;
      assert.ok(s.eligible.some(([n]) => n === s.in));
      const played = (dr.deck as DeckBuild).main.map(([, n]) => n);
      const chose = s.choice.main.map(([, n]) => n);
      assert.ok(played.includes(s.in) && !played.includes(s.out as string) && chose.includes(s.out as string));
      assert.equal(played.filter((n) => !chose.includes(n)).length, 1);
      const pool = dr.pool.map((n) => LC.byName.get(n) as LabCard);
      assert.deepEqual(checkDeck(dr.deck as DeckBuild, pool, LC.byName, maxSplash(false)), [], 'the deck that plays is legal');
      assert.deepEqual(choiceRecord(record(d)).drafters[k]?.deck, s.choice);
    });
  }
  assert.ok(forced > 40, `forced ${forced}`);
});

test('explore: propensity is v / max(sum v, cap), a gold target weighs `gold`', () => {
  const mono = LC.byName.get('W card 0') as LabCard;
  const gold = LC.byName.get('WU gold low') as LabCard;
  assert.deepEqual(propensities([mono], OPT), [['W card 0', 0.25]]);
  assert.deepEqual(propensities([mono, gold], OPT), [['W card 0', 0.2], ['WU gold low', 0.8]]);
  const five = 'WWWWW'.split('').map((_, i) => LC.byName.get(`W card ${i}`) as LabCard);
  for (const [, p] of propensities(five, OPT)) assert.equal(p, 0.2);
});

test('explore: over many seeds the share and the forced decks are what the probabilities say', () => {
  const recs: DraftRecord[] = [];
  const share = 0.3;
  for (let seed = 1000; seed < 1600; seed++) recs.push(record(exploreDraft(runDraft(LC, 'grid', seed, W), { ...OPT, share }, LC.byName, maxSplash)));
  const h = exploreHealth(exploreTable(recs), share);
  assert.equal(h.drafts, 600);
  assert.ok(Math.abs(h.shareZ) < 4, `share z ${h.shareZ}`);
  assert.ok(h.treated > 50 && Math.abs(h.treatedZ) < 4, `treated ${h.treated} vs ${h.expected}`);
  assert.ok(Math.abs(h.balanceDiff) < 3, `balance ${h.balanceDiff}`);
});

// ------------------------------------------------------------ the batch split

test('batchStats: no exploration is exactly the old numbers; with it, counts from choice decks and games from plain drafts', () => {
  const plainRecs: DraftRecord[] = [];
  const explored: DraftRecord[] = [];
  for (let seed = 1; seed <= 40; seed++) {
    const d0 = runDraft(LC, 'grid', seed, W);
    const pA = 0.3 + (seed % 5) / 10;
    plainRecs.push(record(d0, pA));
    explored.push(record(exploreDraft(d0, { ...OPT, share: 0.5 }, LC.byName, maxSplash), pA));
  }
  const old = cardStats(buildMeta(META, INFO, plainRecs, null) as MetaDoc, plainRecs, INFO);
  const b0 = batchStats(META, INFO, plainRecs, null);
  assert.equal(b0.explore, null);
  assert.deepEqual([...b0.stats.entries()], [...old.entries()]);

  const b = batchStats(META, INFO, explored, null);
  const nPlain = explored.filter(isPlain).length;
  assert.ok(nPlain > 5 && nPlain < 35 && b.plain === nPlain && b.explore?.explored === 40 - nPlain);
  const seedsPlain = new Set(explored.filter(isPlain).map((r) => r.seed));
  const gamesRef = cardStats(buildMeta(META, INFO, plainRecs.filter((r) => seedsPlain.has(r.seed)), null) as MetaDoc, plainRecs.filter((r) => seedsPlain.has(r.seed)), INFO);
  for (const [name, s] of b.stats) {
    const o = old.get(name);
    assert.ok(o);
    for (const k of ['seen', 'picked', 'firstTakes', 'inDecks', 'onColour', 'onColourDecks'] as const) assert.equal(s[k], o[k], `${name} ${k} reads the choice decks`);
    const g = gamesRef.get(name);
    assert.equal(s.games, g?.games ?? 0, `${name} games read the plain drafts`);
    assert.equal(s.wins, g?.wins ?? 0);
  }
  assert.equal(b.metaDoc.sample.drafts, nPlain);
});

// ------------------------------------------------------------ the estimator

function seat(eligible: Array<[string, number]>, forced: string | null, meanRating = 50): ExploreSeat {
  return { eligible, in: forced, out: forced ? 'x' : null, choice: { parts: { meanRating } } as unknown as DeckBuild };
}
function exRec(seats: [ExploreSeat | null, ExploreSeat | null], winsA: number, games = 3): { explore: ExploreRecord; match: { games: Array<{ winner: string }> } } {
  return {
    explore: { share: 1, cap: 4, gold: 4, below: 60, seats },
    match: { games: Array.from({ length: games }, (_, i) => ({ winner: i < winsA ? 'A' : 'B' })) },
  };
}

test('explore estimator: exact sums, weights, and generations pool by adding', () => {
  // Card X: forced in deck 1 (p 0.25, 2 of 3 won), eligible not forced in decks 2 and 3 (p 0.25 and 0.5; 1 of 3, 0 of 3).
  const recs = [
    exRec([seat([['X', 0.25]], 'X'), null], 2),
    exRec([seat([['X', 0.25]], null), null], 1),
    exRec([seat([['X', 0.5], ['Y', 0.5]], 'Y'), null], 0),
    { match: { games: [{ winner: 'A' }] } },
  ];
  const t = exploreTable(recs);
  assert.equal(t.drafts, 4);
  assert.equal(t.explored, 3);
  const x = t.cells.X;
  assert.ok(x);
  assert.equal(x.treated.decks, 1);
  assert.equal(x.control.decks, 2);
  assert.equal(x.expected, 1);
  assert.ok(Math.abs(ratio(x.treated).r - 2 / 3) < 1e-12);
  // control weights 1/0.75 and 1/0.5: (4/3 * 1 + 2 * 0) / (4/3 * 3 + 2 * 3) = (4/3) / 10
  assert.ok(Math.abs(ratio(x.control).r - (4 / 3) / 10) < 1e-12);
  const merged = mergeTables(exploreTable(recs.slice(0, 2)), exploreTable(recs.slice(2)));
  assert.deepEqual(merged.cells.X, t.cells.X);
  assert.equal(merged.drafts, 4);
});

test('explore estimator: the weighted delta recovers the effect where the raw comparison is biased', () => {
  // A deck with m eligible targets is weaker the fewer it has (thin pools), and X is
  // forced with probability 1/max(m, cap): more often in weak decks.  True effect +0.05.
  const r = rng(42, 'sim');
  const truth = 0.05;
  const recs: Array<ReturnType<typeof exRec>> = [];
  let rawT = 0, rawTn = 0, rawC = 0, rawCn = 0;
  for (let i = 0; i < 60000; i++) {
    const m = 1 + r.int(8);
    const p = 1 / Math.max(m, 4);
    const forced = r.next() < p;
    const base = 0.3 + 0.04 * m;
    const pw = base + (forced ? truth : 0);
    let w = 0;
    for (let g = 0; g < 3; g++) if (r.next() < pw) w++;
    const elig: Array<[string, number]> = [['X', p], ...Array.from({ length: m - 1 }, (_, k): [string, number] => [`o${k}`, p])];
    recs.push(exRec([seat(elig, forced ? 'X' : null), null], w));
    if (forced) { rawT += w; rawTn += 3; } else { rawC += w; rawCn += 3; }
  }
  const j = judgeExplored(exploreTable(recs)).find((x) => x.name === 'X');
  assert.ok(j);
  assert.ok(Math.abs(j.delta - truth) < 3 * j.se, `weighted delta ${j.delta} (se ${j.se}) vs ${truth}`);
  const raw = rawT / rawTn - rawC / rawCn;
  assert.ok(raw < truth - 0.02, `the raw comparison is biased low: ${raw}`);
});

test('explore verdicts: holds, weak, undecided, too few', () => {
  // Each deck has one eligible card, forced with probability 1/2; without it the deck wins 0.4 of its games.
  const recs: Array<ReturnType<typeof exRec>> = [];
  const r = rng(7, 'verdicts');
  const plan: Array<[string, number, number]> = [['Good', 0.8, 240], ['Bad', 0.1, 240], ['Even', 0.4, 30], ['Rare', 0.9, 12]];
  for (const [name, withIt, decks] of plan) {
    for (let i = 0; i < decks; i++) {
      const forced = i % 2 === 0;
      const p = forced ? withIt : 0.4;
      let w = 0;
      for (let g = 0; g < 3; g++) if (r.next() < p) w++;
      recs.push(exRec([seat([[name, 0.5]], forced ? name : null), null], w));
    }
  }
  const by = new Map(judgeExplored(exploreTable(recs)).map((j) => [j.name, j]));
  assert.equal(by.get('Good')?.verdict, 'holds');
  assert.equal(by.get('Bad')?.verdict, 'weak');
  assert.equal(by.get('Even')?.verdict, 'undecided');
  assert.equal(by.get('Rare')?.verdict, 'too-few');
  const t: ExploreTable = { drafts: 0, explored: 0, cells: {} };
  assert.deepEqual(judgeExplored(t), []);
});

test('the changelog table pools generations, and explore-health reads an evolve folder', () => {
  const recs = [
    exRec([seat([['X', 0.25]], 'X'), seat([['Y', 0.5]], null)], 2),
    exRec([seat([['X', 0.25]], null), null], 1),
  ];
  const t = exploreTable([...recs, { match: { games: [{ winner: 'A' }] } }]);
  const gen = (g: number): GenSummary => ({
    gen: g, versionIn: 1, versionOut: 1, date: '2026-10-03', drafts: 3, seeds: [1, 3], games: 3,
    decision: { discovery: { deff: 1.1 }, assessments: [{ name: 'X', status: 'rating-limited' }] },
    balance: { mean: 0.5 }, stats: [], explore: { plain: 1, table: t },
  }) as unknown as GenSummary;
  const md = exploreSection([gen(1), gen(2)], { margin: 0.1, minDecks: 10, q: 0.1, share: 0.3, final: false });
  assert.match(md, /Low-rated cards, judged by exploration \(D356\) — provisional/);
  assert.match(md, /In 4 of 6 drafts/);
  assert.match(md, /\| X \| yes \| 2 \(6\) \|/);
  assert.equal(exploreSection([{ ...gen(1), explore: undefined }], { margin: 0.1, minDecks: 10, q: 0.1, share: 0.3, final: true }), '');

  const dir = mkdtempSync(join(tmpdir(), 'explore-health-'));
  try {
    writeFileSync(join(dir, 'evolve.json'), JSON.stringify({ explore: { share: 0.3, cap: 4, gold: 4, margin: 0.1, minDecks: 10 }, knobs: { fdrQ: 0.1 } }));
    mkdirSync(join(dir, 'gen-01', 'run'), { recursive: true });
    const line = (ex: boolean, err: boolean): string => JSON.stringify({ ...(ex ? { explore: {} } : {}), match: { games: [{ timeout: false }, { timeout: ex }], ...(err ? { engineError: 'x' } : {}) } });
    writeFileSync(join(dir, 'gen-01', 'run', 'drafts.jsonl'), [line(true, false), line(true, true), line(false, false)].join('\n') + '\n');
    writeFileSync(join(dir, 'gen-01', 'summary.json'), JSON.stringify(gen(1)));
    writeFileSync(join(dir, 'gen-01', 'result.json'), '{}');
    const h = evolveExploreHealth(dir);
    assert.equal(h.explore_on, 1);
    assert.equal(h.generations_done, 1);
    assert.equal(h.explored_drafts, 2);
    assert.equal(h.plain_drafts, 1);
    assert.equal(h.explored_engine_error_rate, 0.5);
    assert.equal(h.explored_timeout_rate, 0.5);
    assert.equal(h.plain_timeout_rate, 0);
    assert.equal(h.plain_deff_max, 1.1);
    assert.equal(h.treated, 1);
    assert.equal(h.expected, 1);
    assert.equal(h.rating_limited, 1);
    assert.equal(h.limited_min_treated, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
