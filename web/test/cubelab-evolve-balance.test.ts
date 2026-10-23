/*
 * mtg-table — web/test/cubelab-evolve-balance.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * evolve's balance mode (D469, tools/cubelab/evolve-balance.ts): the
 * registered Omega swap rule on J145's real read, engine-free.
 *
 *  - the OFF / EVEN / UNCLEAR classifier reproduces every label J145's read
 *    printed (payoff at ±0.05 around 0.5, pull at ±0.08 around 0.4);
 *  - the objective: seven pairs have 400+ deck-games, and UG (.423) is the
 *    furthest from .5; a pair under 400 is never the target, a worst pair whose
 *    interval includes .5 or a colour OFF yields no swap;
 *  - the candidate set on Omega v1, its seed pool, its notes and the engine's
 *    facts for the pool's UG cards (fixtures/cubelab/balance/): Uro and Mystic
 *    Snake out, Risen Reef the one addition; a `keep` on Uro takes it out of
 *    the set, a `try` admits a low-rated card;
 *  - the swap keeps evolve's five constraints, a rating under deadMinRating
 *    does not shield a cut, and no other rule swaps in balance mode;
 *  - mode off: selectSwaps, the log entry, the changelog and the page are byte
 *    for byte what they were before D469 (a digest taken on db496097), and
 *    evolve.json's knobs are the 30 they were.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import type { Fact } from '../../tools/cubelab/cards.ts';
import { parseCube } from '../../tools/cubelab/cube.ts';
import {
  BALANCE_KNOBS, constraintsOf, enrichPool, EVOLVE_DEFAULTS, evolveCards, mergeKnobs, parseNotes, parsePool, recordedKnobs, selectSwaps, violations,
  type Balance, type CardStat, type EvolveCard, type Note, type PoolCard, type SelectInput,
} from '../../tools/cubelab/evolve.ts';
import {
  balanceCandidates, balanceTarget, HOLD_REASON, parseBalanceRead, payoffLabel, selectBalanceSwaps, type BalanceRead, type PayoffLabel,
} from '../../tools/cubelab/evolve-balance.ts';
import { changelog, htmlPage, logEntry, type GenSummary } from '../../tools/cubelab/evolve-report.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const read = (f: string): string => readFileSync(join(REPO, f), 'utf8');
const K = EVOLVE_DEFAULTS;
const READ_FILE = 'fixtures/cubelab/balance/j145-balance.json';
const READ_TEXT = read(READ_FILE);
const READ = parseBalanceRead(READ_TEXT, READ_FILE);

// Omega v1 and its seed pool; the pool's UG-identity cards carry the engine's facts (printed colours, Forge's rank, AI flags).
const FACTS = (JSON.parse(read('fixtures/cubelab/balance/ug-facts.json')) as { cards: Fact[] }).cards;
const UG_NAMES = new Set(FACTS.map((f) => f.listed));
const TSV_POOL = parsePool(read('cubes/omega-seed-pool.tsv'), 70);
const UG_POOL = new Map(enrichPool(TSV_POOL.filter((p) => UG_NAMES.has(p.name)), FACTS, 40).map((p) => [p.name, p]));
const POOL: PoolCard[] = TSV_POOL.map((p) => UG_POOL.get(p.name) ?? p);
const POOL_BY = new Map(POOL.map((p) => [p.name, p]));
const OMEGA = parseCube(read('cubes/omega-cube-180.md'));
const CARDS = evolveCards(OMEGA, POOL_BY);
const C0 = constraintsOf(CARDS, K);
const NOTES = parseNotes(read('cubes/omega-notes.tsv'));
const BAL: Balance = { mean: 0.5, colours: [], pairs: [], themes: [] };

/** Every card average: dealt 27 times, on colour in 10 pools and played in 8, 20 decisive games at 10 wins. */
function stats(over: Record<string, Partial<CardStat>> = {}, cube = OMEGA): Map<string, CardStat> {
  const m = new Map<string, CardStat>();
  for (const c of cube.cards) {
    const s: CardStat = {
      name: c.name, seen: 27, picked: 16, pickRate: 0.59, firstTakes: 9, firstPickRate: 1 / 3, inDecks: 8, deckRate: 8 / 27, onColour: 10, onColourDecks: 8,
      games: 20, wins: 10, winRate: 0.5, shrunk: 0.5, ci: [0.3, 0.7], ...over[c.name],
    };
    s.deckRate = s.inDecks / s.seen;
    s.firstPickRate = s.firstTakes / s.seen;
    m.set(c.name, s);
  }
  return m;
}
function input(over: Partial<SelectInput> = {}): SelectInput {
  return { cube: OMEGA, cards: CARDS, pool: POOL, stats: stats(), balance: BAL, drafts: 30, constraints: C0, notes: NOTES, tabu: new Set(), knobs: K, ...over };
}
/** The J145 read with one pair's or colour's cell replaced. */
function readWith(edit: (d: { payoff: Record<string, { colour: Record<string, object>; pairs: Record<string, object> }> }) => void): BalanceRead {
  const d = JSON.parse(READ_TEXT) as { payoff: Record<string, { colour: Record<string, object>; pairs: Record<string, object> }> };
  edit(d);
  return parseBalanceRead(JSON.stringify(d), READ_FILE);
}
const URO = "Uro, Titan of Nature's Wrath";

// ------------------------------------------------------------ the classifier and the read

test('the classifier is J145\'s: every label its read printed, payoff (±0.05 of 0.5) and pull (±0.08 of 0.4)', () => {
  const d = JSON.parse(READ_TEXT) as { payoff: Record<string, { colour: Record<string, { est: number; lo: number; hi: number; target: number; label: PayoffLabel }> }>; pull: Record<string, { twoColour: Record<string, { est: number; lo: number; hi: number; target: number; label: PayoffLabel }> }> };
  let n = 0;
  for (const arm of Object.values(d.payoff)) for (const [c, x] of Object.entries(arm.colour)) { assert.equal(payoffLabel(x.est, x.lo, x.hi, x.target, 0.05), x.label, `payoff ${c}`); n++; }
  for (const arm of Object.values(d.pull)) for (const [c, x] of Object.entries(arm.twoColour)) { assert.equal(payoffLabel(x.est, x.lo, x.hi, x.target, 0.08), x.label, `pull ${c}`); n++; }
  assert.equal(n, 35, 'J145 printed 35 labels (its `labels` block)');
  assert.equal(payoffLabel(null, 0.4, 0.6, 0.5, 0.05), 'UNCLEAR');
  assert.deepEqual([READ.job, READ.cube, READ.arm], ['J145', 'omega-cube-180', 'Blab']);
  assert.throws(() => parseBalanceRead('{"payoff":{}}', 'x'), /no payoff\.Blab/);
  assert.throws(() => parseBalanceRead(JSON.stringify({ payoff: { Blab: { colour: {}, pairs: {} } } }), 'x'), /lacks colour W/);
});

test('the objective on J145: seven pairs with 400+ deck-games, UG the worst at .077 off .5, OFF; no colour OFF', () => {
  const t = balanceTarget(READ, K);
  assert.equal(t.refusal, null);
  assert.deepEqual(t.pairs.filter((r) => r.qualifies).map((r) => r.pair), ['WU', 'WB', 'WR', 'WG', 'UB', 'UR', 'UG']);
  assert.deepEqual(t.pairs.filter((r) => !r.qualifies).map((r) => `${r.pair} ${r.n}`), ['BR 238', 'BG 382', 'RG 350']);
  assert.equal(t.worst?.pair, 'UG');
  assert.equal(t.worst?.n, 544);
  assert.equal((t.worst?.gap as number).toFixed(4), '0.0772');
  assert.equal(t.worst?.label, 'OFF');
  assert.deepEqual(t.pairs.filter((r) => r.label === 'OFF').map((r) => r.pair), ['UG'], 'the band would call UG alone OFF');
  const next = t.pairs.filter((r) => r.qualifies && r.pair !== 'UG').sort((a, b) => (b.gap as number) - (a.gap as number))[0];
  assert.equal(next?.pair, 'WR');
  assert.deepEqual(t.colours.map((c) => `${c.colour} ${c.label}`), ['W EVEN', 'U EVEN', 'B EVEN', 'R EVEN', 'G UNCLEAR']);
});

test('a pair under balanceMinGames is never the target, however far off; with none at N, no swap', () => {
  // BR at .30 on 238 deck-games: far further off than UG, and still not chosen.
  const far = readWith((d) => { (d.payoff.Blab as { pairs: Record<string, object> }).pairs.BR = { n: 238, hits: 71, est: 0.3, lo: 0.24, hi: 0.36 }; });
  const t = balanceTarget(far, K);
  assert.equal(t.worst?.pair, 'UG');
  assert.equal(t.pairs.find((r) => r.pair === 'BR')?.qualifies, false);
  assert.equal(selectBalanceSwaps(input(), far).swaps[0]?.balance?.pair, 'UG');
  // The knob moves the bar: at 200, BR qualifies and is the target.
  assert.equal(balanceTarget(far, { ...K, balanceMinGames: 200 }).worst?.pair, 'BR');
  const none = selectBalanceSwaps(input({ knobs: { ...K, balanceMinGames: 5000 } }), READ);
  assert.deepEqual(none.swaps, []);
  assert.match(none.balance?.refusal ?? '', /^no colour pair has 5000 drafted deck-games on Blab \(the most: UB with 1616\)/);
  assert.match(none.verdict, /^Balance rule \(D469\): no swap — no colour pair has 5000/);
});

test('a worst pair whose interval includes .5 yields no swap; so does a colour OFF, or a label the classifier disagrees with', () => {
  const wide = readWith((d) => { (d.payoff.Blab as { pairs: Record<string, object> }).pairs.UG = { n: 544, hits: 230, est: 0.4228, lo: 0.37, hi: 0.505 }; });
  const t = balanceTarget(wide, K);
  assert.equal(t.worst?.pair, 'UG', 'still the furthest from .5');
  assert.match(t.refusal ?? '', /^the worst qualifying pair, UG \(0\.423, 0\.370–0\.505, 544 deck-games\), has an interval that includes 0\.5: nothing to fix$/);
  const d = selectBalanceSwaps(input(), wide);
  assert.deepEqual(d.swaps, []);
  assert.equal(d.balance?.candidates, null);
  assert.match(d.verdict, /^Balance rule \(D469\): no swap — the worst qualifying pair, UG/);
  // Green OFF on Blab: the rule is written for a cube balanced at colour level.
  const offG = readWith((d) => { (d.payoff.Blab as { colour: Record<string, object> }).colour.G = { n: 1938, hits: 800, est: 0.4128, lo: 0.39, hi: 0.435, target: 0.5, label: 'OFF' }; });
  assert.match(balanceTarget(offG, K).refusal ?? '', /^colour G is OFF \(0\.413, 0\.390–0\.435\) on Blab: .*colour payoff must not drive a swap/);
  assert.deepEqual(selectBalanceSwaps(input(), offG).swaps, []);
  // A band other than the read's relabels its cells: refused, not silently re-judged.
  assert.match(balanceTarget(READ, { ...K, balanceBand: 0.01 }).refusal ?? '', /the read's own labels disagree with D469's classifier \(colour W: the read says EVEN, D469's classifier at band 0\.01 says UNCLEAR/);
});

// ------------------------------------------------------------ the candidate set

test('the pool\'s UG cards as evolve sees them: printed colours from the engine, Forge\'s ranks, the notes', () => {
  const at = (n: string): PoolCard => POOL_BY.get(n) as PoolCard;
  assert.deepEqual([at(URO).colors, at(URO).rating], ['UG', 54.2]);
  assert.deepEqual([at('Mystic Snake').colors, at('Mystic Snake').rating], ['UG', 44]);
  assert.equal(at('Talisman of Curiosity').colors, '', 'a colourless artifact: not a UG gold card in evolve\'s colour model');
  assert.equal(at('Tamiyo, Inquisitive Student').colors, 'U', 'printed blue (a double-faced card): not UG gold either');
  assert.equal(at('Tamiyo, Collector of Tales').aiFlag, 'All');
  assert.deepEqual(violations(CARDS, C0), [], 'the starting cube keeps its own constraints');
});

test('the candidate set is Uro and Mystic Snake out, Risen Reef in: exactly what the filter yields', () => {
  const c = balanceCandidates(input(), 'UG');
  assert.deepEqual(c.cuts.map((x) => x.name), ['Mystic Snake', URO], 'equal play: the lower-rated slot first');
  assert.deepEqual(c.cutsExcluded, []);
  assert.deepEqual(c.additions, ['Risen Reef']);
  assert.deepEqual(c.additionsExcluded, [
    { name: 'Lonis, Cryptozoologist', reason: 'rated 38.8, under deadMinRating 60' },
    { name: 'Mystic Snake', reason: 'in the cube' },
    { name: 'Nadu, Winged Wisdom', reason: 'notes: cut' },
    { name: 'Oko, Thief of Crowns', reason: 'notes: cut' },
    { name: 'Tamiyo, Collector of Tales', reason: 'AI:RemoveDeck:All' },
    { name: URO, reason: 'in the cube' },
    { name: 'Wistfulness', reason: 'rated 44.9, under deadMinRating 60' },
  ]);
  // Before the rating filter: Lonis, Risen Reef, Wistfulness (Talisman and Tamiyo, Inquisitive Student are not printed UG).
  const preRating = [...c.additions, ...c.additionsExcluded.filter((x) => /under deadMinRating/.test(x.reason)).map((x) => x.name)].sort();
  assert.deepEqual(preRating, ['Lonis, Cryptozoologist', 'Risen Reef', 'Wistfulness']);
});

test('a keep note on Uro takes it out of the set; keep on both leaves nothing to cut; try admits a low-rated card', () => {
  const keep = new Map<string, Note>([...NOTES, [URO, { card: URO, verdict: 'keep', note: 'Justin: the deck needs it' }]]);
  const c = balanceCandidates(input({ notes: keep }), 'UG');
  assert.deepEqual(c.cuts.map((x) => x.name), ['Mystic Snake']);
  assert.deepEqual(c.cutsExcluded, [{ name: URO, reason: 'notes: keep (Justin: the deck needs it)' }]);
  // With Uro the evidence's first choice (never played on colour), keep still binds: Mystic Snake goes.
  const uroIdle = stats({ [URO]: { onColour: 30, onColourDecks: 0, inDecks: 0 } });
  assert.equal(balanceCandidates(input({ stats: uroIdle }), 'UG').cuts[0]?.name, URO);
  assert.deepEqual(selectBalanceSwaps(input({ stats: uroIdle, notes: keep }), READ).swaps.map((s) => s.out), ['Mystic Snake']);
  const both = new Map<string, Note>([...keep, ['Mystic Snake', { card: 'Mystic Snake', verdict: 'keep', note: '' }]]);
  const d = selectBalanceSwaps(input({ notes: both }), READ);
  assert.deepEqual(d.swaps, []);
  assert.match(d.verdict, /no swap — no UG gold card may be cut \(Uro, Titan of Nature's Wrath: notes: keep \(Justin: the deck needs it\); Mystic Snake: notes: keep\): the candidate set is used up/);
  // try binds: Lonis (rated 38.8) is admitted, and its fitTry makes it the addition.
  const tryLonis = new Map<string, Note>([...NOTES, ['Lonis, Cryptozoologist', { card: 'Lonis, Cryptozoologist', verdict: 'try', note: 'paper' }]]);
  assert.deepEqual(balanceCandidates(input({ notes: tryLonis }), 'UG').additions, ['Lonis, Cryptozoologist', 'Risen Reef']);
  assert.equal(selectBalanceSwaps(input({ notes: tryLonis }), READ).swaps[0]?.in, 'Lonis, Cryptozoologist');
});

// ------------------------------------------------------------ the swap

test('the swap: Mystic Snake for Risen Reef, its evidence recorded, every one of the five constraints kept', () => {
  const d = selectBalanceSwaps(input(), READ);
  assert.equal(d.swaps.length, 1, 'balanceSwaps 1');
  const s = d.swaps[0];
  assert.ok(s);
  assert.deepEqual([s.out, s.outSection, s.in, s.inSection, s.why], ['Mystic Snake', 'Gold', 'Risen Reef', 'Gold', 'balance']);
  assert.deepEqual(s.balance, {
    rule: 'balance', read: 'J145', arm: 'Blab', pair: 'UG', payoff: 0.4228, interval: [0.3819, 0.4647], n: 544, gap: 0.0772, qualifying: 7,
    minGames: 400, band: 0.05, cut: 'Mystic Snake', addition: 'Risen Reef',
  });
  assert.equal(s.evidence, 'balance (D469): J145 Blab, UG pays 0.423 (0.382–0.465, 544 deck-games), OFF; |payoff − 0.5| 0.077, the largest of 7 pair(s) with at least 400; '
    + 'colours W EVEN, U EVEN, B EVEN, R EVEN, G UNCLEAR; the cut: UG gold, on colour in 10 pool(s) this generation, played in 8, rated 44');
  assert.match(s.fit, /^same colour class; shares ETB; mv 3 for 4; rating 88\.4/);
  // The five constraints, one by one, on the cube after the swap.
  const after: EvolveCard[] = [...CARDS.filter((c) => c.name !== s.out), evolveCards({ ...OMEGA, cards: [{ name: s.in, section: s.inSection, themes: [], roles: [] }] }, POOL_BY)[0] as EvolveCard];
  assert.deepEqual(violations(after, C0), []);
  assert.deepEqual(d.violationsAfter, []);
  assert.equal(after.length, 180, 'size');
  assert.equal(new Set(after.map((c) => c.name)).size, 180, 'singleton');
  const count = (cs: EvolveCard[], f: (c: EvolveCard) => boolean): number => cs.filter(f).length;
  for (const k of 'WUBRG') assert.equal(count(after, (c) => !c.land && c.colors.includes(k)), C0.colourTarget[k], `colour ${k}`);
  assert.equal(count(after, (c) => c.land), C0.lands, 'lands');
  assert.ok(count(after, (c) => c.fixing) >= C0.fixingMin, 'fixing');
  for (const p of Object.keys(C0.pairMin)) assert.ok(count(after, (c) => !c.land && c.colors === p) >= (C0.pairMin[p] as number), `pair ${p}`);
  assert.equal(count(after, (c) => !c.land && c.colors === 'UG'), 2, 'UG keeps two signposts');
  // The decision records the read, the set and the lab's gate.
  assert.equal(d.balance?.worst, 'UG');
  assert.equal(d.balance?.source, READ_FILE);
  assert.match(d.balance?.gate ?? '', /^kept only if a fresh-seed, J145-shaped re-measure of the swapped cube shows UG's Blab interval including 0\.5, no colour OFF and no pair with 400\+ deck-games OFF/);
  assert.match(d.verdict, /^Balance rule \(D469\): UG pays 0\.423 \(0\.382–0\.465, 544 deck-games on J145 Blab\), the furthest from 0\.5 of 7 pair\(s\) with at least 400; Mystic Snake → Risen Reef — kept only if/);
  // The same input, the same decision.
  assert.deepEqual(selectBalanceSwaps(input(), READ), d);
});

test('a rating under deadMinRating does not shield a balance cut; no other rule swaps in balance mode', () => {
  // Mystic Snake never played on colour: the dead rule calls it rating-limited (rated 44) and never cuts it ...
  const dead = { onColour: 30, onColourDecks: 0, inDecks: 0, games: 0, wins: 0, winRate: 0, ci: [0, 1] as [number, number] };
  const st = stats({ 'Mystic Snake': dead, 'Doom Blade': dead });
  const plain = selectSwaps({ ...input({ stats: st }), confirmation: { stats: st, mean: 0.5, deff: 1, drafts: 60, seeds: [1000001, 1000060], games: 150 } });
  assert.equal(plain.assessments.find((a) => a.name === 'Mystic Snake')?.status, 'rating-limited');
  assert.ok(!plain.swaps.some((s) => s.out === 'Mystic Snake'));
  assert.ok(plain.swaps.some((s) => s.out === 'Doom Blade' && s.why === 'dead'));
  // ... and the balance rule cuts it; Doom Blade's dead cut and a note cut are held, listed, not made.
  const tundra = new Map<string, Note>([...NOTES, ['Tundra', { card: 'Tundra', verdict: 'cut', note: 'test' }]]);
  const d = selectBalanceSwaps({ ...input({ stats: st, notes: tundra }), confirmation: { stats: st, mean: 0.5, deff: 1, drafts: 60, seeds: [1000001, 1000060], games: 150 } }, READ);
  assert.deepEqual(d.swaps.map((s) => [s.out, s.why]), [['Mystic Snake', 'balance']]);
  assert.deepEqual(d.unmatched.map((u) => [u.name, u.why, u.reason]).sort(), [['Doom Blade', 'dead', HOLD_REASON], ['Tundra', 'note-cut', HOLD_REASON]]);
  assert.match(d.verdict, /— kept only if .*\. The AI rules, reported only: /);
});

test('the swap in the iteration log, the changelog and the page', () => {
  const d = selectBalanceSwaps(input(), READ);
  const g: GenSummary = { gen: 1, versionIn: 1, versionOut: 2, date: '2026-10-23', drafts: 30, seeds: [1, 30], games: 80, decision: d, balance: BAL, stats: [...stats().values()] };
  assert.match(logEntry(g), /: \*\*Mystic Snake\*\* → \*\*Risen Reef\*\* \(balance: balance \(D469\): J145 Blab, UG pays 0\.423/);
  const cl = changelog('Omega', [g]);
  assert.match(cl, /\*\*The balance rule \(D469\)\.\*\* Read: fixtures\/cubelab\/balance\/j145-balance\.json \(J145, cube omega-cube-180\), payoff arm Blab;/);
  assert.match(cl, /Candidate set \(UG\): cuts Mystic Snake \(rated 44, on colour 10, played 8\), Uro, Titan of Nature's Wrath \(rated 54\.2, on colour 10, played 8\); additions Risen Reef; not added: Lonis/);
  assert.match(cl, /\| UG \| 544 \| 0\.423 \| 0\.382–0\.465 \| 0\.077 \| OFF \| yes, the worst \|/);
  assert.match(cl, /\| BR \| 238 \| 0\.563 \| 0\.496–0\.634 \| 0\.063 \| UNCLEAR \| no \(under 400\) \|/);
  assert.match(cl, /\| Mystic Snake \(Gold\) \| balance \| balance \(D469\)/);
  const html = htmlPage('Omega', [g]);
  assert.match(html, /<h3>The balance rule \(D469\)<\/h3>/);
});

// ------------------------------------------------------------ mode off

test('balance mode off: the decision and its words are byte for byte the pre-D469 ones; evolve.json\'s knobs too', () => {
  // The fixture of cubelab-evolve.test.ts's "dead and dominant" case, every pool card rated 70; its digest was taken on db496097.
  const pool = TSV_POOL;
  const by = new Map(pool.map((p) => [p.name, p]));
  const cards = evolveCards(OMEGA, by);
  const DEAD: Partial<CardStat> = { inDecks: 0, onColour: 30, onColourDecks: 0, games: 0, wins: 0, winRate: 0, ci: [0, 1] };
  const st = stats({ 'Doom Blade': DEAD, 'Fire // Ice': DEAD, Tundra: DEAD, "Umezawa's Jitte": { games: 60, wins: 50, winRate: 50 / 60, shrunk: 0.75, ci: [0.72, 0.9] }, Ponder: { firstTakes: 58, seen: 60 } });
  const x: SelectInput = {
    cube: OMEGA, cards, pool, stats: st, balance: BAL, drafts: 30, constraints: constraintsOf(cards, K), notes: new Map([['Tundra', { card: 'Tundra', verdict: 'cut', note: 'test' }]]),
    tabu: new Set(), knobs: K, confirmation: { stats: st, mean: 0.5, deff: 1, drafts: 60, seeds: [1000001, 1000060], games: 150 },
  };
  const d = selectSwaps(x);
  assert.equal(d.swaps.length, 5);
  assert.ok(!('balance' in d) && d.swaps.every((s) => !('balance' in s)));
  const g: GenSummary = { gen: 1, versionIn: 1, versionOut: 2, date: '2026-10-23', drafts: 30, seeds: [1, 30], games: 80, decision: d, balance: BAL, stats: [...st.values()] };
  const out = [JSON.stringify(d), logEntry(g), changelog('Omega', [g]), htmlPage('Omega', [g])].join('\n');
  assert.equal(createHash('sha256').update(out).digest('hex'), '3c8c90ba135ced17b147ca3facd2cda700f3b9fd76b667047fe8c1ee02ae665b',
    'selectSwaps and the report changed for a run without --balance: if on purpose, take the new digest');
  // evolve.json records the knobs it recorded before D469 when the mode is off, and all of them when it is on.
  assert.deepEqual(Object.keys(recordedKnobs(K, false)), [
    'swaps', 'minSeen', 'minGames', 'minOnColour', 'deadPlayRateHi', 'deadMinRating', 'dominantMargin', 'dominantFirstPickLo', 'fdrQ', 'confirmAlpha',
    'confirmPower', 'dominantEffect', 'deadEffect', 'pickEffect', 'confirmMinDrafts', 'confirmMaxDrafts', 'confirmSeedOffset', 'confirmPool', 'watchWinMargin',
    'colourSlack', 'minSignposts', 'fitSameClass', 'fitTheme', 'fitRole', 'fitMv', 'fitRating', 'fitBalance', 'fitTry', 'dominantReplaceRatio', 'humanTest',
  ]);
  assert.deepEqual(recordedKnobs(K, true), K);
  assert.deepEqual([...BALANCE_KNOBS].map((b) => K[b]), [400, 1, 0.05]);
  assert.equal(mergeKnobs(K, ['balanceSwaps=2']).balanceSwaps, 2);
  assert.throws(() => mergeKnobs(K, ['balanceSwaps=0']), /balanceSwaps/);
  assert.throws(() => mergeKnobs(K, ['balanceBand=0.6']), /balanceBand/);
  assert.throws(() => mergeKnobs(K, ['balanceMinGames=0.5']), /balanceMinGames/);
});
