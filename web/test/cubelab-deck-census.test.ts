/*
 * mtg-table — web/test/cubelab-deck-census.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The deck census (tools/cubelab/deckcensus.ts, censusplay.ts, censusread.ts; D447), engine-free:
 *
 *  - the generator: deterministic by seed (decks and the command's bytes), every deck of every band
 *    40 cards with every spell castable from its own lands, the prior's coverage over 1,000 decks
 *    (every k, two-colour main shares spread over [0.5, 1], the main-share bins all reached), the
 *    cross-band slice near its ask, and the powered band drawn with legacy;
 *  - the mana-cost reader and the land formula on fixture decks (the land count, no fixer for a
 *    mono deck, F = round(L x (1 - s_max)) capped by supply, a double pip's minimum sources, a
 *    deck whose minimums exceed its basics rejected);
 *  - the pairing: deterministic, no deck against itself, every deck within one game of 2M / N,
 *    and a replay's plan the pairing exactly; the search summary's arithmetic;
 *  - the read on a synthetic games folder with planted effects: a mono advantage shows in its bin
 *    with a deck-bootstrap interval clear of 0.5, a planted card's shrunk rate stands out, the
 *    within-band rate is 0.5, and the JSON is strict.
 *
 * The real library's mana costs come from Forge's card scripts when this checkout has them
 * (forge-home/res or the jar's res/); without them (CI's web job) every card is costed by its
 * printed colours, and every property here still holds.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  castable, censusPopulation, CARD_FLOW_STUDY, decksCommand, defaultScriptsZip, generateDeck, landCount, landPlan, parseManaCost, poolBands, crossBands,
  scriptManaCost, sourcesOf, type CensusCard, type DeckRecord, type Makeup,
} from '../../tools/cubelab/deckcensus.ts';
import { pairingOf, replayPlan, rowOf, searchSummary, type GameRowOut } from '../../tools/cubelab/censusplay.ts';
import { readCensus, shareBin, strictJson, SHARE_BINS } from '../../tools/cubelab/censusread.ts';
import { rng } from '../../tools/cubelab/rng.ts';
import { openForgeScripts } from '../../tools/forge-scripts.ts';
import { BANDS } from '../../tools/cubelab/census.ts';

const REPO = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const poolText = readFileSync(join(REPO, 'cubes', 'library', 'library-pool.tsv'), 'utf8');
const censusText = readFileSync(join(REPO, 'cubes', 'library', 'census.tsv'), 'utf8');
let zip: string | null = null;
try { zip = defaultScriptsZip(REPO); } catch { zip = null; }
const scripts = (zip ? openForgeScripts(zip) : null) ?? openForgeScripts(join(REPO, 'forge-home/res/cardsfolder/cardsfolder.zip'));
const costOf = (n: string): string | null => {
  if (!scripts) return null;
  const s = scripts.scriptOf(n) ?? (n.includes(' // ') ? scripts.scriptOf(n.split(' // ')[0] as string) : null);
  return s === null ? null : scriptManaCost(s);
};
const { lib } = censusPopulation(poolText, censusText, costOf);
const byName = new Map(lib.map((c) => [c.name, c]));
const quiet = (): void => {};

test('mana costs: plain, hybrid, Phyrexian and {2/C} symbols', () => {
  assert.deepEqual(parseManaCost('1 W W'), { plain: { W: 2 }, hybrid: [], share: { W: 2 } });
  assert.deepEqual(parseManaCost('2 W/U'), { plain: {}, hybrid: ['WU'], share: { W: 0.5, U: 0.5 } });
  assert.deepEqual(parseManaCost('3 U/P'), { plain: {}, hybrid: [], share: { U: 1 } });
  assert.deepEqual(parseManaCost('2/G 2/G 2/G'), { plain: {}, hybrid: [], share: { G: 3 } });
  assert.deepEqual(parseManaCost('no cost'), { plain: {}, hybrid: [], share: {} });
  assert.equal(scriptManaCost('Name:Lightning Bolt\nManaCost:R\nTypes:Instant\n'), 'R');
});

test('the generator is deterministic by seed, and the command writes the same bytes twice', () => {
  for (const band of BANDS) {
    const a = generateDeck(lib, { band, seed: 7, crossBand: 0.1 }, 3);
    const b = generateDeck(lib, { band, seed: 7, crossBand: 0.1 }, 3);
    assert.deepEqual(a, b, `${band}: the same deck`);
    assert.notDeepEqual(generateDeck(lib, { band, seed: 8, crossBand: 0.1 }, 3).spells, a.spells, `${band}: another seed, another deck`);
  }
  if (!scripts) return;
  const dir = mkdtempSync(join(tmpdir(), 'deck-census-'));
  try {
    for (const k of ['x', 'y']) decksCommand(REPO, new Map([['band', ['pauper']], ['count', ['12']], ['seed', ['3']], ['out', [join(dir, k)]], ['scripts', [scripts.path]]]), quiet);
    assert.equal(readFileSync(join(dir, 'x', 'decks.jsonl'), 'utf8'), readFileSync(join(dir, 'y', 'decks.jsonl'), 'utf8'));
    assert.equal(readFileSync(join(dir, 'x', 'decks', 'pauper-3-00007.dck'), 'utf8'), readFileSync(join(dir, 'y', 'decks', 'pauper-3-00007.dck'), 'utf8'));
    // a larger count keeps the first decks
    decksCommand(REPO, new Map([['band', ['pauper']], ['count', ['14']], ['seed', ['3']], ['out', [join(dir, 'z')]], ['scripts', [scripts.path]]]), quiet);
    const first = (k: string): string[] => readFileSync(join(dir, k, 'decks.jsonl'), 'utf8').trim().split('\n').slice(0, 12);
    assert.deepEqual(first('z'), first('x'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('every deck of every band is 40 cards, singleton, every spell castable from its own lands', () => {
  for (const band of BANDS) {
    for (let i = 1; i <= 120; i++) {
      const d = generateDeck(lib, { band, seed: 11, crossBand: 0.1 }, i);
      assert.equal(d.main.reduce((a, [n]) => a + n, 0), 40, `${d.id}: 40 cards`);
      assert.equal(d.spells.length + d.lands, 40);
      assert.equal(d.fixers.length + Object.values(d.basics).reduce((a, b) => a + b, 0), d.lands);
      const names = [...d.spells, ...d.fixers];
      assert.equal(new Set(names).size, names.length, `${d.id}: one of each card`);
      const src = sourcesOf({ fixers: d.fixers.map((n) => ({ card: byName.get(n) as CensusCard, role: 'in' as const })), basics: d.basics });
      for (const n of d.spells) {
        const c = byName.get(n) as CensusCard;
        assert.ok(c.supported && !c.land && c.aiFlag !== 'All', `${d.id}: ${n} is a drawable spell`);
        assert.ok(castable(c, src), `${d.id}: ${n} castable`);
        for (const x of c.colors) assert.ok(d.makeup.colours.includes(x), `${d.id}: ${n}'s colours are the makeup's`);
      }
      assert.equal(d.castable, d.spells.length);
      assert.ok(d.lands >= 15 && d.lands <= 18);
    }
  }
});

test('the prior covers the spectrum over 1,000 decks', () => {
  const ds: DeckRecord[] = [];
  for (let i = 1; i <= 1000; i++) ds.push(generateDeck(lib, { band: 'legacy', seed: 1000, crossBand: 0.1 }, i));
  const byK = [1, 2, 3, 4, 5].map((k) => ds.filter((d) => d.makeup.k === k).length);
  for (const n of byK) assert.ok(n >= 150 && n <= 250, `every k about a fifth: ${byK.join('/')}`);
  const two = ds.filter((d) => d.makeup.k === 2).map((d) => Math.max(...Object.values(d.makeup.shares).map((x) => x ?? 0)));
  assert.ok(Math.min(...two) < 0.53 && Math.max(...two) > 0.97, 'two-colour makeups from 50/50 to near-mono');
  const q = (lo: number, hi: number): number => two.filter((s) => s >= lo && s < hi).length / two.length;
  for (const [lo, hi] of [[0.5, 0.625], [0.625, 0.75], [0.75, 0.875], [0.875, 1]] as Array<[number, number]>) assert.ok(q(lo, hi) > 0.15, `two-colour main shares spread: ${lo}-${hi} ${q(lo, hi)}`);
  const bins = new Set(ds.map((d) => shareBin(d.profile.mainShare)));
  for (const b of SHARE_BINS) assert.ok(bins.has(b), `realised main share reaches bin ${b}`);
  for (const k of [1, 2, 3, 4, 5]) assert.ok(ds.some((d) => d.profile.coloursWith3 === k), `realised colours with 3+ spells: ${k}`);
  const cross = ds.reduce((a, d) => a + d.cross.length, 0) / ds.reduce((a, d) => a + d.spells.length, 0);
  assert.ok(cross > 0.08 && cross < 0.12, `cross-band share of spells near 0.10: ${cross}`);
  // the colour shares: every colour main about a fifth of the time
  for (const c of 'WUBRG') { const n = ds.filter((d) => d.makeup.colours.includes(c)).length; assert.ok(n > 520 && n < 680, `${c} in about 3/5 of makeups: ${n}`); }
});

test('the bands: powered is drawn with legacy, the cross slice from the neighbours', () => {
  assert.deepEqual(poolBands(lib, 'powered'), ['powered', 'legacy']);
  assert.deepEqual(poolBands(lib, 'pauper'), ['pauper']);
  assert.deepEqual(crossBands(['powered', 'legacy']), ['peasant']);
  assert.deepEqual(crossBands(['peasant']), ['pauper', 'legacy']);
  for (let i = 1; i <= 50; i++) {
    const d = generateDeck(lib, { band: 'pauper', seed: 5, crossBand: 0 }, i);
    for (const n of d.spells) assert.equal((byName.get(n) as CensusCard).band, 'pauper', `${d.id}: no slice, every spell in band`);
  }
});

// ---------------------------------------------------------------- the land formula on fixture decks

const fx = (name: string, colors: string, cost: string, mv: number, extra: Partial<CensusCard> = {}): CensusCard => ({
  name, listed: [name], identity: colors, type: 'Creature', mv, tags: [], sources: [], supported: true, aiFlag: 'none', colors, produces: '', land: false, basic: false,
  labGames: 0, labWr: null, labCubes: [], band: 'pauper', cost: parseManaCost(cost), ...extra,
});
const land = (name: string, produces: string): CensusCard => fx(name, '', 'no cost', 0, { land: true, produces, type: 'Land' });
const mono: Makeup = { k: 1, colours: 'R', shares: { R: 1 } };

test('the land count: 17 at mean mana value 3, two a mana value, 15 to 18', () => {
  assert.equal(landCount(3), 17);
  assert.equal(landCount(2.5), 16);
  assert.equal(landCount(2.74), 16, 'round(-0.52) = -1');
  assert.equal(landCount(2.76), 17);
  assert.equal(landCount(3.25), 18);
  assert.equal(landCount(1.2), 15);
  assert.equal(landCount(5), 18);
});

test('the land formula on fixture decks', () => {
  const lands = [land('Rakdos Guildgate', 'BR'), land('Bloodfell Caves', 'BR'), land('Azorius Guildgate', 'WU'), land('Command Tower', 'WUBRG')];
  const ctx = { lib: lands, pool: ['pauper'] as const as unknown as ['pauper'], fill: [] };
  // mono red: no fixer, all Mountains
  const red = Array.from({ length: 23 }, (_, i) => fx(`r${i}`, 'R', '1 R', 2));
  const p1 = landPlan(ctx, red, 16, mono, rng(1))!;
  assert.equal(p1.fixers.length, 0);
  assert.deepEqual(p1.basics, { W: 0, U: 0, B: 0, R: 16, G: 0 });
  // 50/50 black-red at 17 lands: F = round(17 x 0.5) = 9 asked, 3 fixers make two of B, R (the two Rakdos lands and Command Tower)
  const br = [...Array.from({ length: 12 }, (_, i) => fx(`b${i}`, 'B', '1 B', 3)), ...Array.from({ length: 11 }, (_, i) => fx(`r${i}`, 'R', '1 R', 3)), fx('rr', 'R', 'R', 1)];
  const p2 = landPlan(ctx, br, 17, { k: 2, colours: 'BR', shares: { B: 0.5, R: 0.5 } }, rng(2))!;
  assert.equal(p2.fixerTarget, 9);
  assert.deepEqual(p2.fixers.map((f) => f.card.name).sort(), ['Bloodfell Caves', 'Command Tower', 'Rakdos Guildgate']);
  assert.equal(p2.basics.B + p2.basics.R, 14);
  assert.deepEqual([p2.basics.B, p2.basics.R], [7, 7], 'basics by pip share, 12 to 12');
  // a red deck splashing one {W}{W} card: White gets at least two sources however small its share
  const splash = [...Array.from({ length: 22 }, (_, i) => fx(`r${i}`, 'R', '2 R R', 4)), fx('ww', 'W', 'W W', 2)];
  const p3 = landPlan({ lib: [], pool: ['pauper'] as unknown as ['pauper'], fill: [] }, splash, 17, { k: 2, colours: 'WR', shares: { W: 0.05, R: 0.95 } }, rng(3))!;
  assert.equal(p3.basics.W, 2, 'a double pip needs two sources');
  assert.equal(p3.basics.R, 15);
  assert.ok(castable(splash[22] as CensusCard, sourcesOf(p3)));
  // five colours each needing three sources cannot fit in 15 basics with no fixer: rejected
  const greedy = 'WUBRG'.split('').map((c) => fx(`${c}3`, c, `${c} ${c} ${c} ${c}`, 4));
  assert.equal(landPlan({ lib: [], pool: ['pauper'] as unknown as ['pauper'], fill: [] }, greedy, 15, { k: 5, colours: 'WUBRG', shares: { W: 0.2, U: 0.2, B: 0.2, R: 0.2, G: 0.2 } }, rng(4)), null);
});

test('card flow: the study\'s list is library cards', () => {
  assert.equal(CARD_FLOW_STUDY.length, 17);
  for (const n of CARD_FLOW_STUDY) assert.ok(byName.has(n), `${n} is in the library`);
});

// ---------------------------------------------------------------- the pairing

test('the pairing: deterministic, no self-pairs, every deck within one game of 2M / N; a replay plans the same games', () => {
  const ids = Array.from({ length: 41 }, (_, i) => `legacy-1-${String(i + 1).padStart(5, '0')}`);
  const p = pairingOf(ids, 328, 9);
  assert.deepEqual(p, pairingOf(ids, 328, 9));
  assert.notDeepEqual(p, pairingOf(ids, 328, 10));
  const n = new Map<string, number>();
  for (const g of p) { assert.notEqual(g.a, g.b); n.set(g.a, (n.get(g.a) ?? 0) + 1); n.set(g.b, (n.get(g.b) ?? 0) + 1); assert.equal(g.seed, 9 * 1_000_000 + g.g); }
  const counts = [...n.values()];
  assert.equal(n.size, 41);
  assert.ok(Math.min(...counts) >= 15 && Math.max(...counts) <= 17, `2M/N = 16: ${Math.min(...counts)}-${Math.max(...counts)}`);
  const firsts = p.filter((g) => (g.seed + 1) % 2 === 1).length;
  assert.ok(Math.abs(firsts - 164) <= 1, 'side a on the play in half the games');
  const dir = mkdtempSync(join(tmpdir(), 'deck-census-'));
  try {
    const file = join(dir, 'games.jsonl');
    // rows land in finishing order, not game order, and a replay plans them back in game order
    const rows = p.map((g) => rowOf(g, { type: 'match', id: `g${g.g}`, forge: [], games: [{ n: 1, onPlay: 'A', onPlayVerified: 'A', winner: 'A', turns: 9, ms: 900, timeout: false, reason: 'x', error: null }] }, 0, 'plain', 'plain'));
    writeFileSync(file, `${[...rows].reverse().map((r) => JSON.stringify(r)).join('\n')}\n`);
    assert.deepEqual(replayPlan(file), p);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the search summary: searched, changed and ms a decision over p + a + b, as the ladder counts them', () => {
  const s = searchSummary({ 'search.p.considered': 10, 'search.a.considered': 4, 'search.b.considered': 6, 'search.p.changed': 3, 'search.b.changed': 1, 'search.p.us': 15_000_000, 'search.a.us': 2_000_000, 'search.b.us': 3_000_000 })!;
  assert.equal(s.searched, 20);
  assert.equal(s.changed, 4);
  assert.equal(s.msPerDecision, 1000);
  assert.equal(searchSummary(undefined), undefined);
  assert.equal(searchSummary({})!.msPerDecision, null);
});

// ---------------------------------------------------------------- the read, on planted effects

function synthDeck(id: string, mainShare: number, coloursWith3: number, k: number, spells: string[]): DeckRecord {
  return {
    v: 1, id, band: 'pauper', seed: 1, index: 0, makeup: { k, colours: 'R', shares: { R: 1 } }, rejections: 0, makeupRedraws: 0, main: [], spells, fixers: [], basics: { W: 0, U: 0, B: 0, R: 16, G: 0 },
    lands: 16, fixerTarget: 0, avgMv: 2.5, avgMvDrawn: 2.5, cardFlow: 0, cross: [], fill: [], castable: spells.length, file: '',
    profile: { pipShare: { W: 0, U: 0, B: 0, R: 1, G: 0 }, mainColour: 'R', mainShare, coloursWith3, pipColours: 'R', spellsByColour: { W: 0, U: 0, B: 0, R: 0, G: 0 }, colourless: 0 },
  };
}

test('the read on a synthetic games folder: a planted mono advantage and a planted card stand out, the JSON is strict', () => {
  const r = rng(77);
  const decks: DeckRecord[] = [];
  for (let i = 0; i < 120; i++) {
    const isMono = i < 40;
    const spells = [...new Set(Array.from({ length: 8 }, () => `c${r.int(20)}`))].slice(0, 6);
    if (i % 4 === 0) spells.push('Planted Bomb');
    decks.push(synthDeck(`pauper-1-${String(i).padStart(5, '0')}`, isMono ? 1 : 0.5 + (i % 5) / 10, isMono ? 1 : 2 + (i % 3), isMono ? 1 : 2 + (i % 4), spells));
  }
  const strength = (d: DeckRecord): number => (d.profile.mainShare === 1 ? 0.85 : 0) + (d.spells.includes('Planted Bomb') ? 1.2 : 0);
  const rows: GameRowOut[] = pairingOf(decks.map((d) => d.id), 3000, 4).map((g) => {
    const a = decks.find((d) => d.id === g.a)!, b = decks.find((d) => d.id === g.b)!;
    const pa = 1 / (1 + Math.exp(strength(b) - strength(a)));
    return { v: 1, g: g.g, seed: g.seed, a: g.a, b: g.b, policyA: 'plain', policyB: 'plain', winner: r.next() < pa ? 'a' : 'b', first: g.seed % 2 === 0 ? 'a' : 'b', turns: 10, ms: 1000, timeout: false, reason: null, error: null, engineError: null, worker: 0 };
  });
  rows.push({ ...rows[0]!, g: 99999, winner: 'draw', timeout: true });
  rows.push({ ...rows[1]!, g: 99998, winner: null, engineError: 'worker exited' });
  const { doc, cards } = readCensus(decks, rows, { boot: 400, bootSeed: 1, shrink: 20 });
  const b = doc.bands.pauper!;
  assert.equal(b.games, 3002);
  assert.equal(b.engineErrors, 1);
  assert.equal(b.timeouts, 1);
  assert.equal(b.draws, 1);
  const all = Object.values(b.byPriorK).reduce((a, c) => ({ w: a.w + c.wins, d: a.d + c.decisive }), { w: 0, d: 0 });
  assert.equal(all.w * 2, all.d, 'within a band every decisive game is a win and a loss: 0.5');
  const mono = b.byMainShare.eq100!;
  assert.ok(mono.wr! > 0.6, `mono's planted edge: ${mono.wr}`);
  assert.ok(mono.bootLo! > 0.5, `its deck-clustered interval clears 0.5: ${mono.bootLo}`);
  assert.ok(mono.bootHi! - mono.bootLo! >= mono.wilsonHi! - mono.wilsonLo! - 0.02, 'the clustered interval is not narrower than the naive one');
  assert.ok(b.byColours['1']!.wr! > 0.6);
  for (const k of ['2', '3', '4']) assert.ok(b.byColours[k]!.wr! < 0.5, `the others pay for it (${k})`);
  const bomb = cards.find((c) => c.card === 'Planted Bomb')!;
  const rest = cards.filter((c) => c.card !== 'Planted Bomb' && c.deckGames >= 30).map((c) => c.wrShrunk!);
  assert.ok(bomb.wrShrunk! > 0.65, `the planted card: ${bomb.wrShrunk}`);
  assert.ok(rest.filter((x) => x >= bomb.wrShrunk!).length === 0, 'and no other card reaches it');
  assert.equal(bomb.decks, 30);
  const text = strictJson(doc);
  assert.doesNotMatch(text, /NaN|Infinity/);
  JSON.parse(text);
  assert.throws(() => strictJson({ x: Number.NaN }));
});
