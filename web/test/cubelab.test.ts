/*
 * mtg-table — web/test/cubelab.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The cube lab's engine-free half (tools/cubelab/, D293–D296): everything the
 * lab decides before Forge plays a game, and everything the report says after.
 *
 *  - parsing: both committed cubes read as 180 cards in the sections their
 *    headings promise, with themes, roles, gold pairs, prices dropped and the
 *    Pathways by their front faces;
 *  - mana: pips, and what a dual, a fetchland, a Prism or a land search makes;
 *  - the seeded generator: a draft is a function of its seed;
 *  - GRID rules: 18 grids of 9 from 162, a row or column each, 3 then 2-or-3
 *    cards, the first pick alternating, nothing taken twice;
 *  - WINSTON rules: 90 cards, three piles, a passed pile grows by one, a taken
 *    pile is replaced by one, all-pass takes the top card blind, the last pile
 *    is forced once the stack is empty, every card ends in a pool;
 *  - deck legality: 40 cards, 16–17 lands, two colours plus a legal splash,
 *    nothing the pool does not hold — for every deck of 30 AI drafts, and the
 *    checker's own negative cases;
 *  - pick scoring: synergy grows with shared themes, colours commit after a
 *    third of the picks, a splash needs rating and sources, a dual in the pair
 *    is worth more; the ratings TSV round-trips; weights refuse unknown names;
 *  - the report: fixtures/cubelab/mini/ (three hand-written drafts) aggregated
 *    and compared with summary.golden.json, a few of its numbers checked by
 *    arithmetic, and the HTML loads nothing from anywhere.
 *
 * Change the aggregation on purpose, then regenerate the golden from the repo
 * root and read its diff:  CUBELAB_GOLDEN_WRITE=1 node --test web/test/cubelab.test.ts
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { castableIn, pipsOf, producesOf, type Fact, type LabCard } from '../../tools/cubelab/cards.ts';
import { parseCube, splitItem } from '../../tools/cubelab/cube.ts';
import { buildDeck, checkDeck, countNames } from '../../tools/cubelab/deck.ts';
import { aiChooser, gridDraft, LINES, winstonDraft, type Chooser } from '../../tools/cubelab/draft.ts';
import { scoreCard, synergyCount, topPair, type DrafterState } from '../../tools/cubelab/pick.ts';
import { initialRating, parseRatings, ratingsTsv } from '../../tools/cubelab/ratings.ts';
import { aggregate, renderHtml, renderMarkdown, wilson, type CardInfo, type Recording } from '../../tools/cubelab/report.ts';
import { rng } from '../../tools/cubelab/rng.ts';
import type { DraftRecord, RunMeta } from '../../tools/cubelab/run.ts';
import { DEFAULT_WEIGHTS, mergeWeights } from '../../tools/cubelab/weights.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const W = DEFAULT_WEIGHTS;

// ------------------------------------------------------------ a synthetic cube

const THEMES = ['SAC', 'TOK', 'ETB', 'GY', 'SPL', 'ART'];
function card(name: string, colors: string, cmc: number, o: Partial<LabCard> = {}): LabCard {
  const pips: Partial<Record<'W' | 'U' | 'B' | 'R' | 'G', number>> = {};
  for (const c of colors) pips[c as 'W'] = 1;
  return {
    name, section: colors || 'Colorless', themes: [], roles: [], colors, cmc, pips, type: 'Creature',
    land: false, creature: true, planeswalker: false, produces: '', fixer: false, rating: 50, remAIDeck: false, ...o,
  };
}
/** 180 cards: 26 per colour, 10 gold, 10 colourless, 10 two-colour duals, 10 fetch-like lands. */
function syntheticCube(): LabCard[] {
  const out: LabCard[] = [];
  let i = 0;
  for (const c of 'WUBRG') {
    for (let k = 0; k < 26; k++, i++) {
      out.push(card(`${c} card ${k}`, c, 1 + (k % 6), {
        rating: 30 + ((i * 37) % 60), themes: [THEMES[k % 6] as string, THEMES[(k + 2) % 6] as string].slice(0, 1 + (k % 2)),
        creature: k % 3 !== 0,
      }));
    }
  }
  const pairs = ['WU', 'UB', 'BR', 'RG', 'WG', 'WB', 'UR', 'BG', 'WR', 'UG'];
  for (const p of pairs) out.push(card(`${p} gold`, p, 3, { rating: 70, themes: ['TOK'] }));
  for (let k = 0; k < 10; k++) out.push(card(`Relic ${k}`, '', 2 + (k % 3), { rating: 45, themes: ['ART'], creature: false }));
  for (const p of pairs) out.push(card(`${p} dual`, '', 0, { land: true, creature: false, produces: p, rating: 80, type: 'Land' }));
  for (const p of pairs) out.push(card(`${p} fetch`, '', 0, { land: true, creature: false, produces: p, rating: 85, type: 'Land' }));
  return out;
}

// ------------------------------------------------------------ parsing

test('both committed cubes parse to 180 cards in the sections their headings promise', () => {
  for (const f of ['cubes/synergy-cube-180.md', 'cubes/modern-era-cube-180.md']) {
    const c = parseCube(readFileSync(join(REPO, f), 'utf8'));
    assert.equal(c.cards.length, 180, f);
    assert.deepEqual(c.warnings, [], f);
    for (const s of c.sections) assert.equal(s.parsed, s.expected, `${f} ${s.name}`);
    assert.equal(new Set(c.cards.map((x) => x.name)).size, 180, `${f}: a name twice`);
  }
});

test('themes, roles, gold pairs, prices and Pathways', () => {
  const syn = parseCube(readFileSync(join(REPO, 'cubes/synergy-cube-180.md'), 'utf8'));
  const by = new Map(syn.cards.map((c) => [c.name, c]));
  assert.deepEqual(by.get('Blood Artist')?.themes, ['SAC', 'TOK', 'LIFE']);
  assert.deepEqual(by.get('Swords to Plowshares')?.roles, ['removal']);
  assert.equal(by.get('Reflector Mage')?.pair, 'WU');
  assert.deepEqual(by.get('Reflector Mage')?.themes, ['ETB']);
  assert.ok(by.has('Misty Rainforest') && by.get('Misty Rainforest')?.section === 'Lands');
  assert.equal(Object.keys(syn.themeNames).length, 9);
  const mod = parseCube(readFileSync(join(REPO, 'cubes/modern-era-cube-180.md'), 'utf8'));
  const names = new Set(mod.cards.map((c) => c.name));
  assert.ok(names.has('Esper Sentinel'), 'price dropped');
  assert.ok(names.has('Minsc & Boo, Timeless Heroes'));
  assert.ok(names.has('Hengegate Pathway') && names.has('Barkchannel Pathway'), 'Pathways by front face');
  assert.equal(Object.keys(mod.archetypes).length, 10);
  assert.deepEqual(splitItem('Lightning Helix — removal LIFE SPL'), { name: 'Lightning Helix', themes: ['LIFE', 'SPL'], roles: ['removal'] });
  assert.deepEqual(splitItem('The One Ring 117.87'), { name: 'The One Ring', themes: [], roles: [] });
  const bad = parseCube('# T\n## The list\n### White (2)\nA · B · C\n');
  assert.deepEqual(bad.warnings, ['section White: parsed 3, the heading says 2']);
});

// ------------------------------------------------------------ mana

test('pips and what a card can make', () => {
  assert.deepEqual(pipsOf('1 {G} {U}'), { U: 1, G: 1 });
  assert.deepEqual(pipsOf('{W} {W}'), { W: 2 });
  assert.deepEqual(pipsOf('2'), {});
  const f = (o: Partial<Fact>): Fact => ({ listed: 'x', found: true, ...o });
  assert.equal(producesOf(f({ land: true, identity: 'WU', oracle: '({T}: Add {W} or {U}.)' })), 'WU');
  assert.equal(producesOf(f({ land: true, identity: '', oracle: '{T}, Pay 1 life, Sacrifice Flooded Strand: Search your library for a Plains or Island card, put it onto the battlefield, then shuffle.' })), 'WU');
  assert.equal(producesOf(f({ oracle: 'When Prophetic Prism enters, draw a card.\n{1}, {T}: Add one mana of any color.' })), 'WUBRG');
  assert.equal(producesOf(f({ oracle: 'Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.' })), 'WUBRG');
  assert.equal(producesOf(f({ oracle: 'Exalted\n{T}: Add {G}, {W}, or {U}.' })), 'WUG');
  assert.equal(producesOf(f({ oracle: 'Flying' })), '');
  assert.ok(castableIn(card('x', 'WU', 2), 'WUB') && !castableIn(card('x', 'WR', 2), 'WU') && castableIn(card('x', '', 2), 'BG'));
});

test('the generator is a function of its seed and stream', () => {
  const a = rng(42, 'draft:grid');
  const b = rng(42, 'draft:grid');
  const c = rng(42, 'draft:winston');
  const xa = Array.from({ length: 20 }, () => a.next());
  assert.deepEqual(xa, Array.from({ length: 20 }, () => b.next()));
  assert.notDeepEqual(xa, Array.from({ length: 20 }, () => c.next()));
  assert.ok(xa.every((x) => x >= 0 && x < 1));
});

// ------------------------------------------------------------ grid

test('grid: 18 grids of 9 from 162, a line each, 3 then 2 or 3, first pick alternating', () => {
  const cube = syntheticCube();
  for (const seed of [1, 2, 3]) {
    const d = gridDraft(cube, rng(seed, 'g'), aiChooser(W), W, seed % 2 === 0);
    assert.equal(d.dealt.length, 162);
    assert.equal(new Set(d.dealt).size, 162);
    const [a, b] = d.drafters;
    assert.equal(a.log.length, 18);
    assert.equal(b.log.length, 18);
    for (let g = 1; g <= 18; g++) {
      const ra = a.log.find((p) => p.at === g);
      const rb = b.log.find((p) => p.at === g);
      assert.ok(ra && rb);
      const [first, second] = ra.seen.length === 9 ? [ra, rb] : [rb, ra];
      assert.equal(first.seen.length, 9, `grid ${g}: the first drafter sees the whole grid`);
      assert.equal(first.took.length, 3);
      assert.equal(second.seen.length, 6);
      assert.ok(second.took.length === 2 || second.took.length === 3);
      const parallel = /row/.test(first.how) === /row/.test(second.how);
      assert.equal(second.took.length, parallel ? 3 : 2, `grid ${g}: ${first.how} then ${second.how}`);
      // A opens odd grids when it opens at all, and the opener alternates.
      const aFirst = first === ra;
      assert.equal(aFirst, (g % 2 === 1) === (seed % 2 === 0), `grid ${g}`);
    }
    const all = [...a.state.picks, ...b.state.picks].map((c) => c.name);
    assert.equal(new Set(all).size, all.length, 'no card taken twice');
    assert.ok(all.every((n) => d.dealt.includes(n)));
  }
  // A scripted chooser that always takes row 1 then column 1: 3 + 2 every grid.
  const script: Chooser = { gridLine: (_d, _g, taken) => (taken === null ? 0 : 3), takePile: () => true };
  const s = gridDraft(cube, rng(9), script, W, true);
  assert.equal(s.drafters[0].state.picks.length + s.drafters[1].state.picks.length, 18 * 5);
  assert.deepEqual(LINES[3], [0, 3, 6]);
});

test('a draft and its decks are the same for the same seed', () => {
  const cube = syntheticCube();
  const one = gridDraft(cube, rng(5, 'g'), aiChooser(W), W, true);
  const two = gridDraft(cube, rng(5, 'g'), aiChooser(W), W, true);
  assert.deepEqual(one.drafters[0].log, two.drafters[0].log);
  assert.deepEqual(buildDeck(one.drafters[1].state.picks, W), buildDeck(two.drafters[1].state.picks, W));
  const three = gridDraft(cube, rng(6, 'g'), aiChooser(W), W, true);
  assert.notDeepEqual(one.drafters[0].log, three.drafters[0].log);
});

// ------------------------------------------------------------ winston

test('winston: always pass -> blind cards, then the last pile is forced; every card ends in a pool', () => {
  const cube = syntheticCube();
  const pass: Chooser = { gridLine: () => 0, takePile: () => false };
  const d = winstonDraft(cube, rng(1, 'w'), pass, W, true, 90);
  const [a, b] = d.drafters;
  const all = [...a.state.picks, ...b.state.picks].map((c) => c.name);
  assert.equal(all.length, 90);
  assert.equal(new Set(all).size, 90);
  assert.deepEqual([...all].sort(), [...d.dealt].sort());
  const log = [...a.log, ...b.log];
  // While the stack lasts a passed pile grows by one card per look.
  const pile1 = a.log.filter((p) => p.kind === 'pile' && p.at === 1).slice(0, 4).map((p) => p.seen.length);
  assert.ok(pile1[1] !== undefined && (pile1[1] as number) > (pile1[0] as number), `pile 1 grows: ${pile1.join(',')}`);
  assert.ok(log.some((p) => p.kind === 'blind' && p.took.length === 1));
  assert.ok(log.some((p) => p.kind === 'forced'), 'with the stack empty the last pile is taken');
});

test('winston: always take pile 1 -> it is replaced by exactly one card each time', () => {
  const cube = syntheticCube();
  const take1: Chooser = { gridLine: () => 0, takePile: (_d, _p, i) => i === 0 };
  const d = winstonDraft(cube, rng(2, 'w'), take1, W, false, 90);
  const takes = [...d.drafters[0].log, ...d.drafters[1].log].filter((p) => p.how === 'take' && p.at === 1);
  assert.ok(takes.length > 40);
  // Until the stack runs out, pile 1 is only ever one card.
  assert.ok(takes.slice(0, 40).every((p) => p.took.length === 1));
  const all = [...d.drafters[0].state.picks, ...d.drafters[1].state.picks];
  assert.equal(all.length, 90);
  // B opens when aOpens is false: B's first decision comes first.
  assert.equal(d.drafters[1].log[0]?.n, 1);
});

test('winston with the AI chooser deals the whole stack', () => {
  const cube = syntheticCube();
  for (const seed of [1, 2]) {
    const d = winstonDraft(cube, rng(seed, 'w'), aiChooser(W), W, true, 90);
    assert.equal(d.drafters[0].state.picks.length + d.drafters[1].state.picks.length, 90);
  }
});

// ------------------------------------------------------------ decks

test('every AI-drafted deck is legal: 40 cards, 16-17 lands, two colours plus a legal splash', () => {
  const cube = syntheticCube();
  const byName = new Map(cube.map((c) => [c.name, c]));
  let built = 0;
  for (let seed = 1; seed <= 15; seed++) {
    for (const fmt of ['grid', 'winston'] as const) {
      const d = fmt === 'grid'
        ? gridDraft(cube, rng(seed, fmt), aiChooser(W), W, seed % 2 === 0)
        : winstonDraft(cube, rng(seed, fmt), aiChooser(W), W, seed % 2 === 0, 90);
      for (const dr of d.drafters) {
        const deck = buildDeck(dr.state.picks, W);
        if (!deck) continue;
        built++;
        assert.deepEqual(checkDeck(deck, dr.state.picks, byName, deck.stretched ? W.maxSplashStretch : W.maxSplash), [], `${fmt} ${seed} ${dr.seat}`);
        assert.equal(deck.main.reduce((s, [n]) => s + n, 0), 40);
        assert.ok(deck.lands === 16 || deck.lands === 17);
        assert.equal(deck.spells + deck.lands, 40);
      }
    }
  }
  assert.ok(built >= 50, `built ${built} of 60`);
});

test('the deck checker rejects what is not a deck', () => {
  const pool = [card('W1', 'W', 1), card('U1', 'U', 2), card('R1', 'R', 3), card('B1', 'B', 2, { rating: 90 })];
  const byName = new Map(pool.map((c) => [c.name, c]));
  const ok = { colors: 'WU', splash: null, main: [[1, 'W1'], [1, 'U1'], [21, 'Plains'], [17, 'Island']] as Array<[number, string]> };
  assert.match(checkDeck(ok, pool, byName, 3).join(), /38 lands/);
  const legal = { colors: 'WU', splash: null, main: [[1, 'W1'], [1, 'U1'], [22, 'Wastes'], [8, 'Plains'], [8, 'Island']] as Array<[number, string]> };
  assert.match(checkDeck(legal, pool, byName, 3).join(), /unknown card Wastes/);
  const off = { colors: 'WU', splash: null, main: [[1, 'R1'], [22, 'W1'], [9, 'Plains'], [8, 'Island']] as Array<[number, string]> };
  const e = checkDeck(off, pool, byName, 3).join(' | ');
  assert.match(e, /R1 \(R\) is off-colour/);
  assert.match(e, /22 W1 but the pool holds 1/);
  const splashed = { colors: 'WU', splash: 'B', main: [[1, 'B1'], [1, 'W1'], [21, 'Plains'], [17, 'Island']] as Array<[number, string]> };
  assert.deepEqual(checkDeck(splashed, pool, byName, 3).filter((x) => !/lands/.test(x)), []);
  assert.match(checkDeck(splashed, pool, byName, 0).join(), /1 splash cards, more than 0/);
  assert.match(checkDeck({ ...ok, main: [[1, 'W1'], [40, 'Plains']] }, pool, byName, 3).join(), /41 cards/);
  assert.equal(countNames([pool[0] as LabCard, pool[0] as LabCard]).get('W1'), 2);
});

// ------------------------------------------------------------ scoring and ratings

test('synergy grows with shared themes; colours commit after a third; a splash needs rating and sources', () => {
  const sac = (n: string, c = 'B'): LabCard => card(n, c, 2, { themes: ['SAC'], rating: 50 });
  const target = card('Payoff', 'B', 3, { themes: ['SAC', 'TOK'], rating: 50 });
  assert.equal(synergyCount(target, [sac('a'), sac('b'), sac('c'), sac('d')], 6), 2);
  const st = (picks: LabCard[], expected = 45): DrafterState => ({ picks, expected });
  const s1 = scoreCard(target, st([sac('a')]), W).synergy;
  const s4 = scoreCard(target, st([sac('a'), sac('b'), sac('c'), sac('d')]), W).synergy;
  assert.ok(s4 > s1 && s1 > 0, `${s1} < ${s4}`);
  // 16 black and red picks of 45: committed to BR; a green card is off-colour, a black one is not.
  const br = [...Array.from({ length: 8 }, (_, i) => card(`b${i}`, 'B', 2, { rating: 70 })), ...Array.from({ length: 8 }, (_, i) => card(`r${i}`, 'R', 2, { rating: 70 }))];
  assert.equal(topPair(br), 'BR');
  assert.equal(scoreCard(card('g', 'G', 2), st(br), W).colour, -W.offColour);
  assert.equal(scoreCard(card('b', 'B', 2), st(br), W).colour, 0);
  // Before commitment (2 picks of 45) a green card only leans.
  assert.ok(scoreCard(card('g', 'G', 2), st(br.slice(0, 2)), W).colour >= 0);
  // A strong one-pip green card with two green sources is a splash, not off-colour.
  const bomb = card('Bomb', 'G', 4, { rating: 90 });
  assert.equal(scoreCard(bomb, st(br), W).colour, -W.offColour, 'no sources yet');
  const fixed = [...br, card('BG land', '', 0, { land: true, produces: 'BG' }), card('Prism', '', 2, { fixer: true, produces: 'WUBRG' })];
  assert.equal(scoreCard(bomb, st(fixed), W).colour, -W.splash);
  assert.equal(scoreCard(card('Weak', 'G', 4, { rating: 40 }), st(fixed), W).colour, -W.offColour, 'too weak to splash');
  // A dual in the pair beats one outside it.
  const dualIn = card('BR land', '', 0, { land: true, produces: 'BR', rating: 80 });
  const dualOut = card('WU land', '', 0, { land: true, produces: 'WU', rating: 80 });
  assert.ok(scoreCard(dualIn, st(br), W).total > scoreCard(dualOut, st(br), W).total);
});

test('ratings: Forge rank or the unrated default; the TSV round-trips; weights refuse unknown names', () => {
  const ranked: Fact = { listed: 'A', name: 'A', found: true, rank: { source: 'cube', edition: 'X', defaultEdition: 'Y', rawScore: 91.234 } };
  const none: Fact = { listed: 'B', name: 'B', found: true, rank: { source: 'none', edition: 'Y', defaultEdition: 'Y', rawScore: -100 } };
  assert.equal(initialRating(ranked, 40).rating, 91.2);
  assert.equal(initialRating(none, 40).rating, 40);
  const tsv = ratingsTsv('T', [initialRating(ranked, 40), initialRating(none, 40)], 40);
  assert.deepEqual([...parseRatings(tsv)], [['A', 91.2], ['B', 40]]);
  assert.throws(() => parseRatings('A\tlots\n'), /want name<TAB>rating/);
  assert.equal(mergeWeights(W, { synergy: 9 }).synergy, 9);
  assert.throws(() => mergeWeights(W, { synergyy: 9 }), /unknown weight/);
  assert.throws(() => mergeWeights(W, { synergy: 'x' }), /must be a number/);
});

// ------------------------------------------------------------ the report

const MINI = join(REPO, 'fixtures/cubelab/mini');
function mini() {
  const meta = JSON.parse(readFileSync(join(MINI, 'run.json'), 'utf8')) as RunMeta;
  const cards = JSON.parse(readFileSync(join(MINI, 'cards.json'), 'utf8')) as Record<string, CardInfo>;
  const recs = readFileSync(join(MINI, 'drafts.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as DraftRecord);
  const recordings = JSON.parse(readFileSync(join(MINI, 'recordings.json'), 'utf8')) as Recording[];
  return aggregate(meta, cards, recs, recordings, { pairs: { WU: 'Azorius: Fliers' }, themes: meta.themeNames });
}

test('report: the mini fixture by arithmetic', () => {
  const s = mini();
  const pair = (k: string) => s.byPair.find((g) => g.key === k);
  assert.deepEqual([pair('WU')?.wins, pair('WU')?.losses, pair('WU')?.draws, pair('WU')?.decks, pair('WU')?.matchWins, pair('WU')?.splashed], [2, 5, 1, 3, 1, 1]);
  assert.deepEqual([pair('BR')?.wins, pair('BR')?.losses, pair('BR')?.draws], [3, 2, 1]);
  assert.deepEqual([pair('BG')?.wins, pair('BG')?.losses], [2, 0], 'the Forge-built deck is keyed by its colours');
  const theme = (k: string) => s.byTheme.find((g) => g.key === k);
  assert.deepEqual([theme('TOK')?.wins, theme('TOK')?.losses, theme('TOK')?.draws], [2, 3, 1]);
  assert.deepEqual([theme('SAC')?.wins, theme('SAC')?.losses], [3, 2]);
  assert.deepEqual([theme('none')?.wins, theme('none')?.losses, theme('none')?.decks], [2, 2, 2], 'below PRIMARY_MIN is none');
  assert.deepEqual([s.totals.onPlay.wins, s.totals.onPlay.losses, s.totals.onPlay.draws], [3, 4, 1]);
  assert.deepEqual([s.totals.games, s.totals.decisive, s.totals.timeouts, s.totals.engineErrors, s.totals.forgeDecks], [8, 7, 1, 1, 1]);
  const scout = s.cards.find((c) => c.name === 'Wing Scout');
  assert.deepEqual([scout?.dealt, scout?.picked, scout?.inDeck, scout?.games.wins, scout?.games.losses], [2, 2, 2, 2, 3]);
  assert.deepEqual(s.neverPlayed, [{ name: 'Unseen Relic', dealt: 0, picked: 0 }]);
  assert.equal(s.recordings.length, 1);
  assert.deepEqual(wilson(0, 0), { lo: null, hi: null });
  const w = wilson(5, 10);
  assert.ok(w.lo !== null && w.hi !== null && Math.abs(w.lo - 0.237) < 0.002 && Math.abs(w.hi - 0.763) < 0.002);
});

test('report: the mini fixture matches summary.golden.json', () => {
  const s = mini();
  const golden = join(MINI, 'summary.golden.json');
  const text = `${JSON.stringify(s, null, 1)}\n`;
  if (process.env.CUBELAB_GOLDEN_WRITE === '1' || !existsSync(golden)) writeFileSync(golden, text);
  assert.equal(text, readFileSync(golden, 'utf8'), 'the aggregation changed -- if on purpose, CUBELAB_GOLDEN_WRITE=1 and read the diff');
});

test('report: the HTML is self-contained, and the Markdown names the recordings', () => {
  const s = mini();
  const html = renderHtml(s);
  assert.ok(html.startsWith('<!doctype html>'));
  assert.doesNotMatch(html, /<script[^>]+src=|<link\b|@import|url\(|<img\b|<iframe\b/i, 'nothing loaded from anywhere');
  assert.deepEqual([...html.matchAll(/https?:\/\/[^"'<\s]+/g)].map((m) => m[0]), ['https://jalirkan.github.io/ForgeCoach/'], 'one plain link, to ForgeCoach');
  assert.match(html, /Load file/);
  assert.match(html, /frames\/draft-1-g1\.jsonl/);
  const md = renderMarkdown(s, 1);
  assert.match(md, /\*\*Load file\*\*/);
  assert.match(md, /\| WU \(Azorius: Fliers\) \| 3 \| 1\/3 \| 2–5–1 \|/);
});
