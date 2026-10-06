/*
 * mtg-table — web/test/cubelab-evolve.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The cube lab's evolve loop (tools/cubelab/evolve.ts, cubedoc.ts,
 * evolve-report.ts; D299–D300), engine-free:
 *
 *  - the cube document round trip: every committed cube written back with no
 *    change is the same bytes, and parse → write → parse lists the same cards;
 *    a swap moves the cards, recounts the headings and the format-counts table,
 *    bumps the title's version and appends one iteration-log entry;
 *  - the seed pool and the notes file parse;
 *  - swap selection on Omega v1 with hand-made statistics: a card the AI
 *    evidence would cut is a candidate until a confirmation batch (fresh seeds)
 *    shows it again (D331); the constraints hold
 *    after every swap, an AI-limited card is never cut on AI numbers, a lead
 *    below its threshold is `watch` and never a cut, the swap budget, notes
 *    (keep, cut, try), no AI:RemoveDeck:All card is auto-added, a card cut
 *    before is not re-added, a land the builder cannot use is not cut, and the
 *    same input gives the same decision; a land is never cut on its deck rate,
 *    and a never-played card rated under deadMinRating is rating-limited;
 *  - first-line takes and card stats over the mini fixture (a land's decks counted
 *    from the played lists: meta.json counts spells only), and the renderers.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseCube, type Cube } from '../../tools/cubelab/cube.ts';
import { sectionFor, writeCubeDoc } from '../../tools/cubelab/cubedoc.ts';
import {
  applySwaps, balanceOf, cardStats, constraintsOf, EVOLVE_DEFAULTS, evolveCards, firstTakes, mergeKnobs, parseNotes, parsePool,
  sampleToSettle, selectSwaps, violations, type Balance, type CardStat, type ConfirmInput, type EvolveCard, type MetaDoc, type Note, type PoolCard, type SelectInput,
} from '../../tools/cubelab/evolve.ts';
import { changelog, htmlPage, logEntry, type GenSummary } from '../../tools/cubelab/evolve-report.ts';
import { buildMeta } from '../../tools/cubelab/meta.ts';
import type { CardInfo } from '../../tools/cubelab/report.ts';
import type { DraftRecord, RunMeta } from '../../tools/cubelab/run.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const read = (f: string): string => readFileSync(join(REPO, f), 'utf8');
const K = EVOLVE_DEFAULTS;

// ------------------------------------------------------------ the document

const shape = (c: Cube): unknown => c.cards.map((x) => [x.name, x.section, x.themes, x.roles, x.pair ?? '']);

test('every committed cube writes back byte for byte, and parse -> write -> parse is identical', () => {
  const cubes = readdirSync(join(REPO, 'cubes')).filter((f) => f.endsWith('.md'));
  assert.ok(cubes.includes('omega-cube-180.md') && cubes.length >= 5);
  for (const f of cubes) {
    const text = read(`cubes/${f}`);
    const a = parseCube(text);
    const w = writeCubeDoc(text, a.cards);
    assert.equal(w, text, f);
    // Even with every card's source position forgotten, the cards come back the same.
    const bare = a.cards.map(({ src: _src, ...c }) => c);
    const b = parseCube(writeCubeDoc(text, bare));
    assert.deepEqual(shape(parseCube(writeCubeDoc(text, b.cards))), shape(b), `${f}: a second write is stable`);
    assert.deepEqual(new Set(b.cards.map((c) => c.name)), new Set(a.cards.map((c) => c.name)), f);
    assert.deepEqual(b.warnings, [], f);
    for (const c of a.cards) {
      const d = b.cards.find((x) => x.name === c.name);
      assert.ok(d, `${f}: ${c.name}`);
      assert.deepEqual([d.section, d.themes, d.roles, d.pair ?? ''], [c.section, c.themes, c.roles, c.pair ?? ''], `${f}: ${c.name}`);
    }
  }
});

test('a swap: cards move, headings and the format-counts table recount, the version bumps, one log entry', () => {
  const text = read('cubes/omega-cube-180.md');
  const cube = parseCube(text);
  const cards = cube.cards.filter((c) => !['Tundra', 'Doom Blade', 'Fire // Ice', 'Ponder'].includes(c.name));
  cards.push(
    { name: 'Hallowed Fountain', section: 'Lands', themes: ['LND'], roles: [] },
    { name: 'Go for the Throat', section: 'Black', themes: [], roles: ['removal'] },
    { name: 'Izzet Charm', section: 'Gold', themes: ['SPL'], roles: ['removal'], pair: 'UR' },
    { name: 'Mana Drain', section: 'Gold', themes: ['CTRL'], roles: ['counter'] },
  );
  const out = writeCubeDoc(text, cards, { version: 2, logEntry: 'v2 (test): Tundra -> Hallowed Fountain.' });
  const b = parseCube(out);
  assert.deepEqual(b.warnings, []);
  assert.equal(b.cards.length, 180);
  assert.match(b.title, /version 2 /);
  const by = new Map(b.cards.map((c) => [c.name, c]));
  assert.equal(by.get('Hallowed Fountain')?.section, 'Lands');
  assert.deepEqual(by.get('Hallowed Fountain')?.themes, ['LND']);
  assert.equal(by.get('Izzet Charm')?.pair, 'UR');
  assert.equal(by.get('Go for the Throat')?.section, 'Black');
  assert.ok(!by.has('Tundra') && !by.has('Ponder'));
  assert.ok(by.get('Mana Drain')?.section === 'Gold');
  // The UR line holds Expressive Iteration and Izzet Charm; Fire // Ice is gone.
  assert.ok(out.includes('UR: Expressive Iteration — SPL · Izzet Charm — SPL removal'));
  assert.ok(out.includes('### Blue (23)') && out.includes('### Gold (21)'));
  assert.ok(out.includes('| Blue | 23 |') && out.includes('| Gold (2 per colour pair) | 21 |') && out.includes('| **Total** | **180** |'));
  assert.ok(out.includes('Original duals (LND): Underground Sea, Badlands'), 'Tundra left its group line');
  const log = out.slice(out.indexOf('## Iteration log'));
  assert.deepEqual(log.split('\n').filter((l) => l.startsWith('- ')), [
    '- v1 (2026-10-03): initial list. 180 cards from a 938-card seed pool; Power Nine out; 8 archetypes; original duals plus fetchlands.',
    '- v2 (test): Tundra -> Hallowed Fountain.',
  ]);
  // Every other line is copied: the doc outside the list and the counts is unchanged.
  const strip = (s: string): string[] => s.split('\n').filter((l) => !/^#|^\||^- v|·|:\s|^(Mana Drain|Hallowed Fountain) — /.test(l));
  assert.deepEqual(strip(out), strip(text));
  // A doc with no iteration log gets one.
  const bare = '# T version 3\n## The list\n### White (1)\nA — removal\n';
  const w2 = writeCubeDoc(bare, [{ name: 'B', section: 'White', themes: [], roles: [] }], { version: 4, logEntry: 'x' });
  assert.equal(w2, '# T version 4\n## The list\n### White (1)\nB\n\n## Iteration log\n- x\n');
});

test('sectionFor: a colour, gold, colourless or a land, as the cube names them', () => {
  const cube = parseCube(read('cubes/omega-cube-180.md'));
  assert.equal(sectionFor(cube, { colors: 'R', land: false }, 'x'), 'Red');
  assert.equal(sectionFor(cube, { colors: 'UR', land: false }, 'x'), 'Gold');
  assert.equal(sectionFor(cube, { colors: '', land: false }, 'x'), 'Colorless');
  assert.equal(sectionFor(cube, { colors: '', land: true }, 'x'), 'Lands');
});

// ------------------------------------------------------------ pool and notes

// Every card rated 70 (Forge's ranks need the engine): over deadMinRating, so a dead card is a cut.
const POOL = parsePool(read('cubes/omega-seed-pool.tsv'), 70);
const POOL_BY = new Map(POOL.map((p) => [p.name, p]));

test('the seed pool parses: 938 cards, WUBRG colours, flags, fixing lands', () => {
  assert.equal(POOL.length, 938);
  assert.equal(POOL_BY.get('Aang, Swift Savior')?.colors, 'WU', 'identity UW is written WU');
  assert.equal(POOL_BY.get('Goblin Bombardment')?.aiFlag, 'All');
  assert.equal(POOL_BY.get('Demonic Tutor')?.aiFlag, 'Random');
  assert.equal(POOL.filter((p) => p.aiFlag === 'All').length, 43);
  assert.ok(POOL_BY.get('Tundra')?.land && POOL_BY.get('Tundra')?.fixing && POOL_BY.get('Tundra')?.colors === '');
  assert.ok(POOL_BY.get('Flooded Strand')?.fixing, 'a fetchland by its LND GY tags');
  assert.ok(POOL_BY.get('Mutavault')?.land && !POOL_BY.get('Mutavault')?.fixing);
  assert.deepEqual(POOL_BY.get('Swords to Plowshares')?.roles, ['removal']);
});

test('notes: keep, cut, try; the header row and comments skipped; a bad verdict is an error', () => {
  const n = parseNotes('# c\ncard\tverdict\tnote\nA\tkeep\tgreat in paper\nB\tcut\t\nC\ttry\tx\ty\n');
  assert.deepEqual([...n.values()], [
    { card: 'A', verdict: 'keep', note: 'great in paper' }, { card: 'B', verdict: 'cut', note: '' }, { card: 'C', verdict: 'try', note: 'x\ty' },
  ]);
  assert.throws(() => parseNotes('A\tmaybe\t\n'), /keep\|cut\|try/);
  assert.equal(parseNotes(read('cubes/omega-notes.tsv')).get('Black Lotus')?.verdict, 'cut');
  assert.throws(() => mergeKnobs(K, ['nope=1']), /unknown knob/);
  assert.equal(mergeKnobs(K, ['swaps=2']).swaps, 2);
});

// ------------------------------------------------------------ selection

const OMEGA = parseCube(read('cubes/omega-cube-180.md'));
const CARDS = evolveCards(OMEGA, POOL_BY);
const C0 = constraintsOf(CARDS, K);

/** Every card average: dealt 27 times, on colour in 10 pools and played in 8 of them, 20 decisive games at 10 wins. */
function stats(over: Record<string, Partial<CardStat>> = {}): Map<string, CardStat> {
  const m = new Map<string, CardStat>();
  for (const c of OMEGA.cards) {
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
const BAL: Balance = { mean: 0.5, colours: [], pairs: [], themes: [] };
/** On colour in 30 pools and never played: p = 0.65^30, a discovery among ~500 tests. */
const DEAD: Partial<CardStat> = { inDecks: 0, onColour: 30, onColourDecks: 0, games: 0, wins: 0, winRate: 0, ci: [0, 1] };
function input(over: Partial<SelectInput> = {}): SelectInput {
  return { cube: OMEGA, cards: CARDS, pool: POOL, stats: stats(), balance: BAL, drafts: 30, constraints: C0, notes: new Map(), tabu: new Set(), knobs: K, ...over };
}
/** A confirmation batch on fresh seeds that shows the same numbers. */
const conf = (st: Map<string, CardStat>): ConfirmInput => ({ stats: st, mean: 0.5, deff: 1, drafts: 60, seeds: [1000001, 1000060], games: 150 });
/** input() with a confirmation batch that repeats its stats. */
function confirmed(over: Partial<SelectInput> = {}): SelectInput {
  const i = input(over);
  return { ...i, confirmation: conf(i.stats) };
}
function after(sel: ReturnType<typeof selectSwaps>): EvolveCard[] {
  const outs = new Set(sel.swaps.map((s) => s.out));
  return [...CARDS.filter((c) => !outs.has(c.name)), ...sel.swaps.map((s) => evolveCards({ ...OMEGA, cards: [{ name: s.in, section: s.inSection, themes: [], roles: [] }] }, POOL_BY)[0] as EvolveCard)];
}

test('the starting cube keeps its own constraints: 180, colour targets, 22 lands, 20 fixing, two signposts a pair', () => {
  assert.deepEqual(violations(CARDS, C0), []);
  assert.equal(C0.size, 180);
  assert.equal(C0.lands, 22);
  assert.equal(C0.fixingMin, 20);
  assert.deepEqual(Object.values(C0.pairMin), Array(10).fill(2));
});

test('an average cube: no swaps, and no leads', () => {
  const d = selectSwaps(input());
  assert.deepEqual(d.swaps, []);
  assert.deepEqual(d.watch, []);
  assert.match(d.verdict, /^No swaps/);
});

const TUNDRA_CUT = new Map<string, Note>([['Tundra', { card: 'Tundra', verdict: 'cut', note: 'test' }]]);
const BIG = (): Map<string, CardStat> => stats({
  'Doom Blade': DEAD,
  'Fire // Ice': DEAD,
  'Tundra': DEAD,
  "Umezawa's Jitte": { games: 60, wins: 50, winRate: 50 / 60, shrunk: 0.75, ci: [0.72, 0.9] },
  'Ponder': { firstTakes: 58, seen: 60 },
});
test('dead and dominant cards are cut, each for a fitting pool card, and every constraint holds', () => {
  const d = selectSwaps(confirmed({ notes: TUNDRA_CUT, stats: BIG() }));
  const outs = new Map(d.swaps.map((s) => [s.out, s]));
  assert.deepEqual([...outs.keys()].sort(), ['Doom Blade', 'Fire // Ice', 'Ponder', 'Tundra', "Umezawa's Jitte"]);
  assert.equal(outs.get("Umezawa's Jitte")?.why, 'dominant-win');
  assert.equal(outs.get('Ponder')?.why, 'dominant-pick');
  assert.equal(outs.get('Doom Blade')?.why, 'dead');
  assert.equal(outs.get('Tundra')?.why, 'note-cut');
  // The order: notes, dominant wins, first picks, then the dead.
  assert.deepEqual(d.swaps.map((s) => s.why).slice(0, 3), ['note-cut', 'dominant-win', 'dominant-pick']);
  const inn = (o: string): PoolCard => POOL_BY.get(outs.get(o)?.in as string) as PoolCard;
  assert.equal(inn('Fire // Ice').colors, 'UR', 'a signpost is replaced in its pair');
  assert.ok(inn('Tundra').land && inn('Tundra').fixing, 'a dual for a dual');
  assert.equal(inn('Doom Blade').colors, 'B');
  for (const s of d.swaps) assert.notEqual(POOL_BY.get(s.in)?.aiFlag, 'All', s.in);
  assert.deepEqual(d.violationsAfter, []);
  assert.deepEqual(violations(after(d), C0), []);
  assert.equal(new Set(after(d).map((c) => c.name)).size, 180);
  // The same input, the same decision.
  assert.deepEqual(selectSwaps(confirmed({ notes: TUNDRA_CUT, stats: BIG() })), d);
  // Every cut names both batches.
  for (const s of d.swaps.filter((x) => x.why !== 'note-cut')) assert.match(s.evidence, /^discovery \(30 drafts\): .*, q [\d.e-]+; confirmed on fresh seeds 1000001–1000060 \(60 drafts\): .*Holm p/, s.out);
});

test('discovery alone cuts nothing: a candidate waits for its confirmation batch, and one that does not repeat stays', () => {
  const st = BIG();
  const d = selectSwaps(input({ notes: TUNDRA_CUT, stats: st }));
  assert.deepEqual(d.swaps.map((s) => [s.out, s.why]), [['Tundra', 'note-cut']], 'a note needs no confirmation');
  assert.deepEqual(d.confirmations.map((c) => c.name).sort(), ['Doom Blade', 'Fire // Ice', 'Ponder', "Umezawa's Jitte"]);
  assert.ok(d.confirmations.every((c) => !c.confirmed && /no confirmation batch/.test(c.reason)));
  assert.equal(d.discovery.candidates, 4);
  assert.ok(d.discovery.family > 300 && d.discovery.family < 540, String(d.discovery.family));
  assert.ok(d.plan.drafts >= K.confirmMinDrafts && d.plan.drafts <= K.confirmMaxDrafts, String(d.plan.drafts));
  assert.match(d.verdict, /4 candidate\(s\) of \d+ tests at a false-discovery rate of 0.1; not yet confirmed/);
  // The confirmation batch shows Doom Blade played like any card, and Jitte winning like any card: those two stay.
  const fresh = stats({ 'Fire // Ice': DEAD, Ponder: { firstTakes: 58, seen: 60 } });
  const c = selectSwaps({ ...input({ notes: TUNDRA_CUT, stats: st }), confirmation: conf(fresh) });
  const outs = c.swaps.map((s) => s.out).sort();
  assert.deepEqual(outs, ['Fire // Ice', 'Ponder', 'Tundra']);
  const db = c.confirmations.find((x) => x.name === 'Doom Blade');
  assert.equal(db?.confirmed, false);
  assert.match(db?.reason ?? '', /not significant on the fresh seeds/);
  assert.equal(db?.confirm?.n, 10, 'the confirmation counts are the fresh batch\'s own, never pooled');
  assert.match(c.verdict, /confirmation on 60 fresh drafts: 2 confirmed, 2 not/);
});

test('an AI-limited card is never cut on AI evidence; a note can; a land is never cut on its deck rate', () => {
  assert.equal(POOL_BY.get('Demonic Tutor')?.aiFlag, 'Random');
  const d = selectSwaps(input({ stats: stats({ 'Demonic Tutor': DEAD, 'Mutavault': DEAD, 'Tundra': DEAD, 'Marsh Flats': DEAD }) }));
  assert.deepEqual(d.swaps, []);
  const dt = d.aiLimited.find((a) => a.name === 'Demonic Tutor');
  assert.equal(dt?.status, 'ai-limited');
  assert.equal(dt?.signal, 'dead', 'its numbers are still reported');
  for (const n of ['Mutavault', 'Tundra', 'Marsh Flats']) assert.equal(d.assessments.find((a) => a.name === n)?.status, 'builder-limited', n);
  const notes = new Map<string, Note>([['Demonic Tutor', { card: 'Demonic Tutor', verdict: 'cut', note: 'Justin: too swingy in paper' }]]);
  const d2 = selectSwaps(input({ stats: stats({ 'Demonic Tutor': DEAD }), notes }));
  assert.deepEqual(d2.swaps.map((s) => [s.out, s.why]), [['Demonic Tutor', 'note-cut']]);
  assert.match(d2.swaps[0]?.evidence ?? '', /^notes: Justin/);
});

test('thresholds: too few drafts, too few games or a wide interval is watch, never a cut', () => {
  const d = selectSwaps(input({ stats: stats({
    'Doom Blade': { ...DEAD, onColour: 5 },                                  // never played, but on colour only 5 times
    'Mana Leak': { onColourDecks: 3 },                                       // 3 of 10: the interval reaches past 0.35
    'Sheoldred, the Apocalypse': { games: 12, wins: 10, winRate: 10 / 12, shrunk: 0.6, ci: [0.55, 0.95] }, // few games
    'Grave Titan': { games: 30, wins: 20, winRate: 2 / 3, shrunk: 0.6, ci: [0.49, 0.8] },                  // CI touches the mean
  }) }));
  assert.deepEqual(d.swaps, []);
  assert.deepEqual(d.watch.map((w) => w.name).sort(), ['Doom Blade', 'Grave Titan', 'Mana Leak', 'Sheoldred, the Apocalypse']);
  for (const w of d.watch) assert.ok(w.draftsNeeded === null || (w.draftsNeeded as number) > 30, w.name);
  assert.match(d.verdict, /^Insufficient data/);
  // Knobs move the thresholds.
  const loose = selectSwaps(confirmed({ stats: stats({ 'Doom Blade': { ...DEAD, onColour: 5 } }), knobs: { ...K, minOnColour: 5, deadPlayRateHi: 0.9 } }));
  assert.deepEqual(loose.swaps.map((s) => s.out), ['Doom Blade']);
});

test('the swap budget; notes keep and try; no AI:RemoveDeck:All add; tabu; human-test candidates', () => {
  const dead = ['Doom Blade', 'Incinerate', 'Arc Trail', 'Mana Leak', 'Preordain', 'Acidic Slime', 'Shriekmaw', 'Man-o\'-War'];
  const d = selectSwaps(confirmed({ stats: stats(Object.fromEntries(dead.map((n) => [n, DEAD]))) }));
  assert.equal(d.swaps.length, 6);
  assert.equal(d.unmatched.length, 2);
  assert.ok(d.unmatched.every((u) => /budget/.test(u.reason)));
  assert.ok(d.humanTest.length > 0 && d.humanTest.every((h) => POOL_BY.get(h.name)?.aiFlag === 'All'));
  // keep wins over the numbers.
  const keep = new Map<string, Note>([['Doom Blade', { card: 'Doom Blade', verdict: 'keep', note: '' }]]);
  assert.deepEqual(selectSwaps(input({ stats: stats({ 'Doom Blade': DEAD }), notes: keep })).swaps, []);
  // try brings in an AI:RemoveDeck:All card when a cut makes room; without it, never.
  const tryIt = new Map<string, Note>([['Toxic Deluge', { card: 'Toxic Deluge', verdict: 'try', note: 'paper favourite' }]]);
  const t = selectSwaps(confirmed({ stats: stats({ 'Doom Blade': DEAD }), notes: tryIt }));
  assert.equal(t.swaps[0]?.in, 'Toxic Deluge');
  assert.match(t.swaps[0]?.fit ?? '', /notes say try/);
  const plain = selectSwaps(confirmed({ stats: stats({ 'Doom Blade': DEAD }) }));
  const first = plain.swaps[0]?.in as string;
  assert.notEqual(POOL_BY.get(first)?.aiFlag, 'All');
  // A card cut by an earlier generation is not re-added; a notes cut is never added.
  const tabu = selectSwaps(confirmed({ stats: stats({ 'Doom Blade': DEAD }), tabu: new Set([first]) }));
  assert.notEqual(tabu.swaps[0]?.in, first);
  const ban = selectSwaps(confirmed({ stats: stats({ 'Doom Blade': DEAD }), notes: new Map([[first, { card: first, verdict: 'cut', note: '' }]]) }));
  assert.notEqual(ban.swaps[0]?.in, first);
  // A pending try with nothing to replace is reported.
  assert.deepEqual(selectSwaps(input({ notes: tryIt })).pendingTries, ['Toxic Deluge']);
});

test('a weak archetype pulls the add toward its themes and colours', () => {
  const weak: Balance = { mean: 0.5, colours: [{ key: 'B', decks: 20, games: 50, wins: 15, rate: 0.3, shrunk: 0.36, ci: [0.2, 0.45] }],
    pairs: [], themes: [{ key: 'SAC', decks: 10, games: 40, wins: 12, rate: 0.3, shrunk: 0.37, ci: [0.2, 0.45] }] };
  const d = selectSwaps(confirmed({ stats: stats({ 'Doom Blade': DEAD }), balance: weak }));
  assert.match(d.swaps[0]?.fit ?? '', /helps weak/);
});

test('a card that was never on colour is not dead (its pair was not drafted); an add is rated at least deadMinRating', () => {
  const d = selectSwaps(input({ stats: stats({ "Kolaghan's Command": { ...DEAD, onColour: 0 } }) }));
  assert.deepEqual(d.swaps, []);
  const kc = d.assessments.find((a) => a.name === "Kolaghan's Command");
  assert.equal(kc?.status, 'ok');
  assert.match(kc?.evidence ?? '', /never in a pool whose deck could cast it/);
  // Rate every pool card under the bar: a dead card finds no replacement.
  const lowPool = POOL.map((p) => ({ ...p, rating: 50 }));
  const none = selectSwaps(confirmed({ pool: lowPool, stats: stats({ 'Doom Blade': DEAD }) }));
  assert.deepEqual(none.swaps, []);
  assert.deepEqual(none.unmatched.map((u) => u.name), ['Doom Blade']);
});

test('a dead card rated under deadMinRating is rating-limited: reported, never cut, no more drafts asked for', () => {
  const low = CARDS.map((c) => (c.name === 'Doom Blade' || c.name === 'Mana Leak' ? { ...c, rating: 35 } : c));
  const d = selectSwaps(confirmed({ cards: low, stats: stats({ 'Doom Blade': DEAD, 'Mana Leak': { onColourDecks: 3 }, Ponder: DEAD }) }));
  assert.deepEqual(d.swaps.map((s) => s.out), ['Ponder']);
  for (const n of ['Doom Blade', 'Mana Leak']) {
    const a = d.assessments.find((x) => x.name === n);
    assert.equal(a?.status, 'rating-limited', n);
    assert.match(a?.evidence ?? '', /rated 35, under 60/);
  }
  assert.ok(!d.watch.some((w) => w.name === 'Mana Leak'), 'a lean on a low-rated card is not a watch');
  assert.match(d.verdict, /2 card\(s\) are rarely or never played on colour but rated under 60/);
  assert.deepEqual(selectSwaps(confirmed({ cards: low, stats: stats({ 'Doom Blade': DEAD }), knobs: { ...K, deadMinRating: 0 } })).swaps.map((s) => s.out), ['Doom Blade']);
});

test('applySwaps then writeCubeDoc: a clean 180-card document with the adds in their sections', () => {
  const d = selectSwaps(confirmed({ notes: TUNDRA_CUT, stats: stats({ 'Doom Blade': DEAD, 'Fire // Ice': DEAD, 'Tundra': DEAD }) }));
  const text = writeCubeDoc(read('cubes/omega-cube-180.md'), applySwaps(OMEGA, d.swaps, POOL_BY), { version: 2, logEntry: 'v2' });
  const c = parseCube(text);
  assert.deepEqual(c.warnings, []);
  assert.equal(c.cards.length, 180);
  for (const s of d.swaps) assert.equal(c.cards.find((x) => x.name === s.in)?.section, s.inSection);
});

// ------------------------------------------------------------ stats and words

test('first-line takes and card stats over the mini fixture; the settle estimate', () => {
  const dir = join(REPO, 'fixtures/cubelab/mini');
  const meta = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8')) as RunMeta;
  const info = JSON.parse(readFileSync(join(dir, 'cards.json'), 'utf8')) as Record<string, CardInfo>;
  const recs = readFileSync(join(dir, 'drafts.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as DraftRecord);
  const ft = firstTakes(recs);
  // The first line of a grid is the take that saw the most cards: seed 1 grid 1 is A's (6 seen to B's 3),
  // grid 2 A's only take; seed 2 A's (4 to 1); seed 3 A's (3 to 2), where B's Wing Scout came second.
  assert.equal(ft.get('Sky Herald'), 2);
  assert.equal(ft.get('Wing Scout'), 1);
  assert.equal(ft.get('Tide Mage'), 1);
  assert.equal(ft.get('Grave Imp'), 1);
  assert.equal(ft.get('Moss Beast'), undefined);
  const doc = buildMeta(meta, info, recs, null) as MetaDoc;
  // meta.json counts a nonbasic land's decks and games like a spell's (D380), with or without cards.json.
  assert.equal(cardStats(doc, recs).get('Mist Fountain')?.inDecks, 1);
  const st = cardStats(doc, recs, info);
  const mf = st.get('Mist Fountain') as CardStat;
  assert.deepEqual([mf.inDecks, mf.games, mf.wins], [1, 3, 2], 'seed 1 A played it: A won games 1 and 3');
  assert.equal(st.get('Wing Scout')?.inDecks, cardStats(doc, recs).get('Wing Scout')?.inDecks, 'a spell is as meta.json counts it');
  // On colour: Wing Scout sat in two pools whose decks could cast it (seed 1 A, seed 3 B) and both played it.
  const wsc = st.get('Wing Scout') as CardStat;
  assert.deepEqual([wsc.onColour, wsc.onColourDecks], [2, 2]);
  for (const x of st.values()) assert.ok(x.onColourDecks <= x.onColour && x.onColourDecks <= x.inDecks, x.name);
  assert.equal(mf.onColour, 0, 'a land has no on-colour count');
  const ws = st.get('Wing Scout') as CardStat;
  assert.equal(ws.firstTakes, 1);
  assert.equal(ws.deckRate, ws.inDecks / ws.seen);
  const bal = balanceOf(doc);
  assert.equal(bal.mean, doc.sample.shrinkage.mean);
  assert.ok(bal.pairs.length > 0);
  assert.equal(sampleToSettle(0.5, 0.15, true), null, 'a rate above the bar never settles below it');
  const n = sampleToSettle(0.02, 0.15, true) as number;
  assert.ok(n > 15 && n < 40, String(n));
});

test('the log entry, the changelog and a self-contained page', () => {
  const d = selectSwaps(confirmed({ stats: stats({ 'Doom Blade': DEAD }) }));
  const g: GenSummary = { gen: 1, versionIn: 1, versionOut: 2, date: '2026-10-03', drafts: 30, seeds: [1, 30], games: 80, decision: d, balance: BAL, stats: [...stats().values()] };
  assert.match(logEntry(g), /^v2 \(2026-10-03, cube lab evolve generation 1: 30 grid drafts, seeds 1–30, 80 decisive games; confirmation 60 fresh drafts, seeds 1000001–1000060, 150 decisive games\): \*\*Doom Blade\*\* → \*\*/);
  const none: GenSummary = { ...g, versionOut: 1, decision: selectSwaps(input()) };
  assert.match(logEntry(none), /no swaps, v1 unchanged/);
  const cl = changelog('Omega', [g, none]);
  assert.match(cl, /## Generation 1 — v1 → v2[\s\S]*\| Doom Blade \(Black\) \| dead \|/);
  // Discovery and confirmation, in plain words and in numbers.
  assert.match(cl, /\*\*Discovery\*\*: in this generation's drafts[\s\S]*\*\*Confirmed\*\*: the candidate stands out again/);
  assert.match(cl, /\| Doom Blade \| dead \| played in 0 of 30 on-colour pools \(0.00 vs 0.35\), p [\d.e-]+, q [\d.e-]+ \| played in 0 of 30 on-colour pools \(0.00 vs 0.35\), p [\d.e-]+, Holm p [\d.e-]+ \| first attempt \| confirmed \|/);
  const html = htmlPage('Omega', [g]);
  assert.match(html, /<h3>Discovered, then confirmed or not<\/h3>/);
  assert.match(html, /<b>Confirmed<\/b>: the candidate stands out again/);
  assert.ok(!/\b(src|href)=|https?:\/\//.test(html.replace(/name="viewport"[^>]*>/, '')), 'nothing loaded from anywhere');
  assert.match(html, /prefers-color-scheme:dark/);
});
