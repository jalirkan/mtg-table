/*
 * mtg-table — web/test/cubelab-balance-model.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * D473: the library card model and the balanced-cube generator (tools/cubelab/balance-model.ts):
 *
 *  - the ridge linear-probability fit recovers planted card values on synthetic random decks, and is
 *    antisymmetric (the same games written from the other side give the same values);
 *  - the deck bootstrap's intervals cover planted values at about the nominal rate, and the split-half
 *    reliability is high with a signal and near 0 without one;
 *  - held-out cross-validation prefers a finite penalty when cards matter, and reports skill over the
 *    makeup-only model;
 *  - predicted payoffs: equal class values give .5 everywhere; a stronger colour wins more, its pairs too;
 *    play weights move a class's mean toward its played cards;
 *  - the generator fills the plan exactly, pulls every class toward its target, keeps the creature floor, and
 *    the balance search narrows the predicted gaps;
 *  - the programme simulation: a perfect model with huge measurements confirms on night 2, a rule nothing can
 *    meet never confirms;
 *  - by deck: the CV holds out a game only when both its decks are held out, and the split-half keeps every deck
 *    on one side; the balance search stops at its tolerance;
 *  - the exclusion list: its parser, and cubes/library/powered-exclude.txt is the census's POWERED list exactly;
 *  - every committed cube under cubes/library/balanced/ is what `cubelab.sh run`/`draft` load: 180 cards, no
 *    parse warning, the two-colour plan exact, every card a supported library row and not AI:RemoveDeck:All, no
 *    ratings file beside it (so Forge's ranks), loadCube finds every card, the lab drafts and builds two 40-card
 *    decks from it, and a -nopower cube holds no card of the exclusion list.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  agreement, BALANCE_TOL, balanceSearch, bootstrapFit, buildDesign, cardEffects, classSummary, clusterParts, crossValidate, DEFAULT_GEN, DEFAULT_PENALTY, generateCube, groupOf,
  maxGap, parseExcludeList, pearson, playCurve, predictPayoffs, shareBin, simulateProgramme, solveRidge, splitHalf,
  type GenCard, type MDeck, type MGame,
} from '../../tools/cubelab/balance-model.ts';
import type { Fact } from '../../tools/cubelab/cards.ts';
import { POWERED_NAMES } from '../../tools/cubelab/census.ts';
import { parseCube } from '../../tools/cubelab/cube.ts';
import { writeCubeDoc } from '../../tools/cubelab/cubedoc.ts';
import { loadCube, runDraft } from '../../tools/cubelab/lab.ts';
import { parseLibraryPool, type LibraryCard } from '../../tools/cubelab/library-candidates.ts';
import { defaultRatings } from '../../tools/cubelab/run.ts';
import { DEFAULT_WEIGHTS } from '../../tools/cubelab/weights.ts';
import { rng } from '../../tools/cubelab/rng.ts';
import { MONO, PAIRS, planErrors } from '../../tools/cubelab/skeleton.ts';
import { structurePlan } from '../../tools/cubelab/sample.ts';

/** Random 20-card decks from 120 cards with planted values (pts per game), one-colour makeups, games by the linear model. */
function synth(seed: number, signal: number, nDecks = 600, nGames = 6000): { decks: MDeck[]; games: MGame[]; truth: Map<string, number> } {
  const r = rng(seed, 'synth');
  const cards = Array.from({ length: 120 }, (_, i) => `c${i}`);
  const truth = new Map(cards.map((c) => [c, signal * (r.next() * 2 - 1)]));
  const decks: MDeck[] = Array.from({ length: nDecks }, (_, i) => {
    const set = new Set<string>();
    while (set.size < 20) set.add(cards[r.int(cards.length)] as string);
    return { id: `d${i}`, spells: [...set], colours: 'WUBRG'[i % 5] as string, mainShare: 1, cluster: `d${i}` };
  });
  const val = (d: MDeck): number => d.spells.reduce((s, c) => s + (truth.get(c) as number), 0);
  const games: MGame[] = Array.from({ length: nGames }, () => {
    const a = decks[r.int(nDecks)] as MDeck;
    let b = decks[r.int(nDecks)] as MDeck;
    while (b === a) b = decks[r.int(nDecks)] as MDeck;
    const p = Math.min(0.95, Math.max(0.05, 0.5 + val(a) - val(b)));
    return { a: a.id, b: b.id, winner: r.next() < p ? 'a' : 'b', first: r.next() < 0.5 ? 'a' : 'b' };
  });
  return { decks, games, truth };
}

test('groups: colour and makeup keys, the share bins, the stratum', () => {
  assert.equal(groupOf({ colours: 'WU', mainShare: 0.6 }, 'colour'), 'WU');
  assert.equal(groupOf({ colours: '', mainShare: 1 }, 'colour'), 'C');
  assert.equal(groupOf({ colours: 'WUB', mainShare: 0.95 }, 'makeup'), 'k3:.9');
  assert.equal(groupOf({ colours: 'R', mainShare: 1, stratum: 'legacy' }, 'makeup'), 'legacy/k1:mono');
  assert.deepEqual([0.3, 0.5, 0.7, 0.9, 1].map(shareBin), ['<.5', '.5', '.7', '.9', 'mono']);
});

test('the fit recovers planted card values and is antisymmetric', () => {
  const { decks, games, truth } = synth(1, 0.03);
  const ds = buildDesign(decks, games, 'makeup');
  const beta = solveRidge(ds, { ...DEFAULT_PENALTY, card: 50 });
  const est = ds.cards.map((_, i) => beta[i] as number);
  assert.ok(pearson(est, ds.cards.map((c) => truth.get(c) as number)) > 0.7, 'planted values recovered');
  const flipped = games.map((g) => ({ a: g.b, b: g.a, winner: g.winner === 'a' ? 'b' : 'a', first: g.first === 'a' ? 'b' : 'a' }) as MGame);
  const beta2 = solveRidge(buildDesign(decks, flipped, 'makeup'), { ...DEFAULT_PENALTY, card: 50 });
  for (let i = 0; i < ds.cards.length; i++) assert.ok(Math.abs((beta[i] as number) - (beta2[i] as number)) < 1e-6);
});

test('the bootstrap covers planted values; split-half reliability tracks the signal', () => {
  const { decks, games, truth } = synth(2, 0.03);
  const ds = buildDesign(decks, games, 'makeup');
  const pen = { ...DEFAULT_PENALTY, card: 50 };
  const beta = solveRidge(ds, pen);
  const eff = cardEffects({ design: ds, pen, beta, reps: bootstrapFit(ds, pen, beta, 60, 3) });
  // Ridge shrinks toward 0, so coverage of the raw truth is a little under nominal; it must still be most of the cards.
  const covered = eff.filter((e) => e.lo <= (truth.get(e.card) as number) + 0.01 && (truth.get(e.card) as number) - 0.01 <= e.hi).length / eff.length;
  assert.ok(covered > 0.75, `coverage ${covered}`);
  assert.ok(splitHalf(ds, pen, 0).full > 0.6);
  const nul = synth(3, 0);
  const dn = buildDesign(nul.decks, nul.games, 'makeup');
  assert.ok(Math.abs(splitHalf(dn, pen, 0).full) < 0.35);
});

test('cross-validation prefers a finite penalty when cards matter and reports skill', () => {
  const { decks, games } = synth(4, 0.03);
  const cv = crossValidate(buildDesign(decks, games, 'makeup'), [10, 50, 200, 1e6], 4, 1);
  assert.notEqual(cv.lambda, 1e6);
  assert.ok(cv.skill > 0 && cv.brier < cv.brierGroupsOnly);
});

test('agreement: a source against itself', () => {
  const e = [0.01, -0.02, 0.03, 0, 0.02].map((est, i) => ({ card: `c${i}`, est, sd: 0.01, lo: est - 0.02, hi: est + 0.02, decks: 10, deckGames: 300 }));
  const a = agreement(e, e, 200, 0.8, 0.8);
  assert.ok(Math.abs(a.pearson - 1) < 1e-12 && Math.abs(a.slope - 1) < 1e-12 && Math.abs(a.trueCorrelation - 1.25) < 1e-9);
});

const mix = { perColour: 9, gold: 0.5, colourless: 4 };
const cubeOf = (vals: Record<string, number>): { cards: Array<{ name: string; colors: string; land: boolean }>; value: (n: string) => number } => {
  const cards: Array<{ name: string; colors: string; land: boolean }> = [];
  const v = new Map<string, number>();
  for (const k of [...MONO, ...PAIRS, '']) for (let i = 0; i < 3; i++) { const name = `${k || 'C'}${i}`; cards.push({ name, colors: k, land: false }); v.set(name, vals[k] ?? 0); }
  return { cards, value: (n) => v.get(n) ?? 0 };
};

test('predicted payoffs: even classes are .5; a stronger colour wins more; weights move a class mean', () => {
  const even = cubeOf({});
  const p0 = predictPayoffs(even.cards, (n) => even.value(n), 0, mix);
  assert.ok(maxGap(p0.colour) < 1e-12 && maxGap(p0.pair) < 1e-12);
  const red = cubeOf({ R: 0.01 });
  const p1 = predictPayoffs(red.cards, (n) => red.value(n), 0, mix);
  assert.ok((p1.colour.R as { est: number }).est > 0.5 && (p1.colour.W as { est: number }).est < 0.5);
  assert.ok((p1.pair.BR as { est: number }).est > 0.5 && (p1.pair.WU as { est: number }).est < 0.5);
  // R's deck carries 9 R cards worth .01 each = .09; R pairs beat the 6 non-R pairs by .09, and 3 other R pairs tie.
  assert.ok(Math.abs((p1.pair.BR as { est: number }).est - (0.5 + 0.09 - (3 * 0.09) / 9)) < 1e-9);
  // Weighting: one R card at .1 and two at 0; all weight on the first makes R's mean .1.
  const w = cubeOf({});
  const val = (n: string): number => (n === 'R0' ? 0.1 : w.value(n));
  const pw = predictPayoffs(w.cards, (n) => val(n), 0, mix, (n) => (n.startsWith('R') && n !== 'R0' ? 0 : 1));
  const pu = predictPayoffs(w.cards, (n) => val(n), 0, mix);
  assert.ok((pw.colour.R as { est: number }).est > (pu.colour.R as { est: number }).est);
  assert.deepEqual(playCurve([{ rating: 40, rate: 0.1 }, { rating: 60, rate: 0.3 }, { rating: 80, rate: 0.5 }]).weight(100), 0.7);
});

function synthPool(seed: number): GenCard[] {
  const r = rng(seed, 'pool');
  const out: GenCard[] = [];
  let id = 0;
  const add = (colors: string, n: number): void => {
    for (let i = 0; i < n; i++) out.push({ name: `n${id++}`, colors, mv: i % 8, land: false, produces: '', creature: i % 3 !== 0, rating: 40 + r.int(60), value: (r.next() - 0.5) * 0.06, sd: 0.008 });
  };
  for (const k of MONO) add(k, 80);
  for (const p of PAIRS) add(p, 16);
  add('', 60);
  for (const p of PAIRS) for (let i = 0; i < 3; i++) out.push({ name: `l${id++}`, colors: '', mv: 0, land: true, produces: p, creature: false, rating: 50 + i, value: null, sd: null });
  for (let i = 0; i < 4; i++) out.push({ name: `l${id++}`, colors: '', mv: 0, land: true, produces: '', creature: false, rating: 50, value: null, sd: null });
  return out;
}

test('the generator fills the plan exactly, near its target, with the creature floor; the search narrows the gaps', () => {
  const pool = synthPool(5);
  const plan = structurePlan('two-colour');
  const cube = generateCube(pool, plan, { ...DEFAULT_GEN, target: 0.01, minCreaturesPerColour: 16 });
  assert.equal(cube.length, 180);
  assert.deepEqual(planErrors(cube.map((c) => ({ ...c })), plan), []);
  for (const s of classSummary(cube).filter((x) => x.cls.length === 1 && x.cls !== 'C')) {
    assert.ok(Math.abs(s.meanValue - 0.01) < 0.004, `${s.cls} mean ${s.meanValue}`);
    assert.ok(s.creatures >= 16, `${s.cls} creatures ${s.creatures}`);
  }
  const value = (n: string): number => pool.find((c) => c.name === n)?.value ?? 0;
  const before = predictPayoffs(cube, (n) => value(n), 0, mix);
  const searched = balanceSearch(cube, pool, value, mix, () => 1, { target: 0.01, band: 0.02, minCreaturesPerColour: 16, maxSwaps: 20, tol: 1e-6 });
  const after = predictPayoffs(searched.cards, (n) => value(n), 0, mix);
  assert.ok(maxGap(after.colour) + maxGap(after.pair) <= maxGap(before.colour) + maxGap(before.pair));
  assert.deepEqual(planErrors(searched.cards.map((c) => ({ ...c })), plan), []);
});

test('the programme: a perfect model confirms on night 2; an impossible rule never does', () => {
  const base = { perNight: 2, sigmaColour: 0, sigmaPair: 0, kappa: 0, colourN: 1e7, pairN: PAIRS.map(() => 1e7), deff: 1, band: 0.05, minPairN: 400, rule: 'all-even' as const, maxNights: 10, sims: 50, seed: 1 };
  const ok = simulateProgramme(base);
  assert.equal(ok.median, 2);
  assert.equal(ok.truePass, 1);
  const never = simulateProgramme({ ...base, colourN: 50 });
  assert.equal(never.within, 0);
});

test('by deck: the CV scores only games whose two decks were both held out; the split-half keeps every deck on one side', () => {
  const { decks, games } = synth(6, 0.03);
  const ds = buildDesign(decks, games, 'makeup');
  const byGame = crossValidate(ds, [50, 1e6], 5, 1);
  const byDeck = crossValidate(ds, [50, 1e6], 5, 1, DEFAULT_PENALTY, 'deck');
  assert.equal(byGame.by, 'game');
  assert.equal(byGame.tested, ds.y.length);
  const part = clusterParts(ds, 5, 1, 'balance-model/cv-deck');
  let same = 0;
  for (let g = 0; g < ds.y.length; g++) if (part[ds.deckCluster[ds.ga[g] as number] as number] === part[ds.deckCluster[ds.gb[g] as number] as number]) same++;
  assert.equal(byDeck.tested, same, 'by deck: a game is scored only when both its decks sit in the held-out fold');
  assert.ok(byDeck.tested > 0.1 * ds.y.length && byDeck.tested < 0.35 * ds.y.length, `about a fifth of random pairings: ${byDeck.tested}`);
  assert.ok(byDeck.skill > 0, 'planted card values still predict games between unseen decks');
  const pen = { ...DEFAULT_PENALTY, card: 50 };
  const strong = synth(8, 0.05, 600, 12000);
  const ds2 = buildDesign(strong.decks, strong.games, 'makeup');
  const sh = splitHalf(ds2, pen, 0, 'deck', 1);
  assert.equal(sh.by, 'deck');
  assert.ok(sh.games[0] + sh.games[1] < ds2.y.length, 'games between the halves are in neither');
  assert.ok(sh.k > 3 && sh.k < 5, `k ${sh.k}: about 4 for random pairings`);
  assert.ok(sh.half > 0.2 && sh.full > sh.half, `stepped up ${sh.half} -> ${sh.full}`);
  const nul = synth(9, 0, 600, 12000);
  assert.ok(Math.abs(splitHalf(buildDesign(nul.decks, nul.games, 'makeup'), pen, 0, 'deck', 1).half) < 0.25, 'no signal, no repeatability');
  // Clusters that hold both decks of every game (a draft) put every game in a half: k = 2.
  const drafted = decks.map((d, i) => ({ ...d, cluster: `draft:${Math.floor(i / 2)}` }));
  const inDraft: MGame[] = [];
  for (let i = 0; i + 1 < drafted.length; i += 2) for (let k = 0; k < 10; k++) inDraft.push({ a: (drafted[i] as MDeck).id, b: (drafted[i + 1] as MDeck).id, winner: k % 2 ? 'a' : 'b', first: k % 3 ? 'a' : 'b' });
  const sd = splitHalf(buildDesign(drafted, inDraft, 'makeup'), pen, 0, 'deck', 1);
  assert.equal(sd.games[0] + sd.games[1], inDraft.length);
  assert.ok(Math.abs(sd.k - 2) < 1e-12);
});

test('the balance search stops at its tolerance', () => {
  const pool = synthPool(7);
  const plan = structurePlan('two-colour');
  const cube = generateCube(pool, plan, { ...DEFAULT_GEN, target: 0.01, minCreaturesPerColour: 16 });
  const value = (n: string): number => pool.find((c) => c.name === n)?.value ?? 0;
  const o = { target: 0.01, band: 0.02, minCreaturesPerColour: 16, maxSwaps: 40 };
  const start = predictPayoffs(cube, (n) => value(n), 0, mix);
  const startGap = maxGap(start.colour) + maxGap(start.pair);
  const loose = balanceSearch(cube, pool, value, mix, () => 1, { ...o, tol: startGap + 1 });
  assert.equal(loose.swaps.length, 0, 'already within the tolerance: no swap');
  assert.ok(Math.abs(loose.gap - startGap) < 1e-12);
  const dflt = balanceSearch(cube, pool, value, mix, () => 1, o);
  const tight = balanceSearch(cube, pool, value, mix, () => 1, { ...o, tol: 0 });
  assert.equal(BALANCE_TOL, 0.008);
  assert.ok(dflt.swaps.length <= tight.swaps.length);
  if (dflt.swaps.length) {
    // every swap but the last was taken while the gap was still above the tolerance
    assert.ok(dflt.gap <= BALANCE_TOL || dflt.swaps.length === o.maxSwaps || tight.swaps.length === dflt.swaps.length);
    const beforeLast = dflt.gap + (dflt.swaps.at(-1) as { gain: number }).gain;
    assert.ok(beforeLast > BALANCE_TOL, `the last swap started above the tolerance (${beforeLast})`);
  }
});

const REPO = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const LIB = join(REPO, 'cubes', 'library');

test('the exclusion list: its parser, and powered-exclude.txt is the census\'s POWERED list', () => {
  assert.deepEqual(parseExcludeList('# a comment\nBlack Lotus\n\n  Sol Ring  # trailing\nBlack Lotus\n'), ['Black Lotus', 'Sol Ring']);
  const list = parseExcludeList(readFileSync(join(LIB, 'powered-exclude.txt'), 'utf8'));
  assert.deepEqual([...list].sort(), [...POWERED_NAMES].sort(), 'cubes/library/powered-exclude.txt = tools/cubelab/census.ts POWERED (D445)');
});

test('every committed balanced cube loads as `cubelab.sh run` and `draft` load it, and drafts two decks', () => {
  const pool = parseLibraryPool(readFileSync(join(LIB, 'library-pool.tsv'), 'utf8'));
  const row = new Map(pool.map((c) => [c.name, c]));
  const powered = new Set(parseExcludeList(readFileSync(join(LIB, 'powered-exclude.txt'), 'utf8')));
  const dir = join(LIB, 'balanced');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  for (const want of ['balanced-legacy-even-high.md', 'balanced-legacy-even-mid.md', 'balanced-pauper-even.md', 'balanced-legacy-even-high-nopower.md', 'balanced-legacy-even-mid-nopower.md']) {
    assert.ok(files.includes(want), `${want} is committed`);
  }
  const plan = structurePlan('two-colour');
  // Facts as the engine would give them, from the library's own rows (no engine here); a rank so the drafter has an order.
  const factOf = (c: LibraryCard, i: number): Fact => {
    const generic = Math.max(0, c.mv - c.colors.length);
    return {
      listed: c.name, name: c.name, found: true, colors: c.colors, identity: c.land ? c.produces : c.colors, cmc: c.mv, type: c.type,
      manaCost: c.land ? '' : `${generic ? `{${generic}}` : ''}${[...c.colors].map((x) => `{${x}}`).join('')}`,
      land: c.land, creature: /\bCreature\b/.test(c.type), remAIDeck: c.aiFlag === 'All',
      rank: { source: 'cube', edition: 'X', defaultEdition: 'X', rawScore: 30 + ((i * 37) % 60) },
    };
  };
  for (const f of files) {
    const file = join(dir, f);
    const text = readFileSync(file, 'utf8');
    const cube = parseCube(text);
    assert.deepEqual(cube.warnings, [], `${f}: parse warnings`);
    assert.equal(cube.cards.length, 180, `${f}: 180 cards`);
    assert.equal(new Set(cube.cards.map((c) => c.name)).size, 180, `${f}: no card twice`);
    for (const s of cube.sections) assert.equal(s.parsed, s.expected, `${f}: section ${s.name} ${s.parsed}/${s.expected}`);
    assert.match(cube.title, /version \d+/, `${f}: a version for evolve to bump`);
    assert.equal(writeCubeDoc(text, cube.cards), text, `${f}: evolve's writer gives back the same bytes`);
    const rows = cube.cards.map((c) => row.get(c.name));
    for (const [i, r] of rows.entries()) {
      assert.ok(r, `${f}: ${cube.cards[i]?.name} is a library card`);
      assert.ok(r.supported, `${f}: ${r.name} is supported by Forge 2.0.14`);
      assert.notEqual(r.aiFlag, 'All', `${f}: ${r.name} is not AI:RemoveDeck:All`);
    }
    assert.deepEqual(planErrors(rows as LibraryCard[], plan), [], `${f}: the two-colour plan, exact`);
    assert.equal(defaultRatings(file), null, `${f}: no ratings file beside it, so run drafts on Forge's ranks`);
    if (f.includes('-nopower')) for (const c of cube.cards) assert.ok(!powered.has(c.name), `${f}: ${c.name} is on the exclusion list`);
    const facts = (rows as LibraryCard[]).map(factOf);
    const lc = loadCube(cube, facts, null, DEFAULT_WEIGHTS);
    assert.equal(lc.cards.length, 180, `${f}: loadCube keeps every card`);
    assert.equal(lc.missing.length, 0);
    assert.equal(lc.ratedFromFile, 0);
    for (const seed of [1, 2]) {
      const d = runDraft(lc, 'grid', seed, DEFAULT_WEIGHTS);
      assert.equal(d.dealt, 162, `${f}: a full grid draft deals 18 grids`);
      for (const dr of d.drafters) {
        assert.ok(dr.deck, `${f} seed ${seed}: seat ${dr.seat} builds a deck`);
        assert.equal(dr.deck.main.reduce((s, [k]) => s + k, 0), 40);
        assert.deepEqual(dr.deckErrors, [], `${f} seed ${seed}: seat ${dr.seat}'s deck is legal`);
      }
    }
  }
});
