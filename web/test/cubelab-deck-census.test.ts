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
 *    within-band rate is 0.5, and the JSON is strict;
 *  - a cube's census (`decks --cube`, D456): Omega's 180 cards yield 40-card decks of 1, 2 and 3
 *    colours, every one castable by the independent checker and drawn from the cube alone; band decks
 *    are unchanged by it; the repeat cap holds where it binds (a mono-heavy cube) and changes nothing
 *    where it does not (Omega); census-read reads the cube's group;
 *  - the engine-unplayable list (D482): a listed card (J166's Scute Swarm, and a planted fixer and
 *    colourless spell) is never dealt and every skip is counted; a deck none of whose picks landed on
 *    one is byte for byte the deck drawn without the list; J166's s04 deck 1 loses its Scute Swarm and
 *    deck 2 is unchanged; the command reports the list and its skips, `--unplayable none` is D447's draw.
 *
 * The real library's mana costs and lands come from Forge's card scripts (the zip beside $FORGE_JAR or
 * config.json's jar, else forge-home/res).  WITHOUT THEM THE SUITE FAILS (#154 review): costed by
 * printed colours, castability would "pass" without one real cost.  So it needs the engine's res/,
 * which CI's web job does not have.
 *
 * Castability is checked by an INDEPENDENT checker below (`independentCheck`), which shares no code with
 * deckcensus.ts: a land's colours from its script's ability lines (`A:AB$ Mana ... Produced$`, `ChangeZone
 * ... ChangeType$`, `K:TypeCycling:Basic`) and its `Types:`, a spell's from its raw `ManaCost:` tokens
 * (a split card every face), a fetcher resolved through the deck's own lands it can find.  400 decks a
 * band pass it.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  castable, censusPopulation, CARD_FLOW_STUDY, landSources, decksCommand, defaultScriptsZip, generateDeck, landCount, landPlan, parseManaCost, poolBands, crossBands,
  scriptCost, scriptLookup, scriptManaCost, sourcesOf, type CensusCard, type DeckRecord, type Makeup,
  coloursOf, cubeCtx, cubeNameOf, cubePool, drawCubeRun, drawDeck, makeupOf, repeatCapCount, CUBE_KS, DEFAULT_MAX_SHARE_K1, REPEAT_CAP_FLOOR,
  ENGINE_UNPLAYABLE_FILE, loadEngineUnplayable, parseEngineUnplayable,
} from '../../tools/cubelab/deckcensus.ts';
import { pairingOf, planExtension, replayPlan, rowOf, searchSummary, type GameRowOut, type PlannedGame } from '../../tools/cubelab/censusplay.ts';
import { cardsTsv, censusReadCommand, dedupe, readCensus, shareBin, spectrumMd, strictJson, SHARE_BINS } from '../../tools/cubelab/censusread.ts';
import { rng } from '../../tools/cubelab/rng.ts';
import { openForgeScripts } from '../../tools/forge-scripts.ts';
import { BANDS, type Band } from '../../tools/cubelab/census.ts';
import { unusedPositionals } from '../../tools/cubelab/cli.ts';

const REPO = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const poolText = readFileSync(join(REPO, 'cubes', 'library', 'library-pool.tsv'), 'utf8');
const censusText = readFileSync(join(REPO, 'cubes', 'library', 'census.tsv'), 'utf8');
let zip: string | null = null;
try { zip = defaultScriptsZip(REPO); } catch { zip = null; }
const scripts = (zip ? openForgeScripts(zip) : null) ?? openForgeScripts(join(REPO, 'forge-home/res/cardsfolder/cardsfolder.zip'));
if (!scripts) throw new Error('cubelab-deck-census: no Forge card scripts (FORGE_JAR / config.json forgeJar beside res/cardsfolder/cardsfolder.zip, or forge-home/res): the deck census needs real costs, and this suite fails rather than fall back to printed colours');
const scriptOf = scriptLookup(scripts);
const { lib, noScript } = censusPopulation(poolText, censusText, scriptOf);
const byName = new Map(lib.map((c) => [c.name, c]));
const quiet = (): void => {};

test('mana costs, as Forge writes them: plain, hybrid GW, Phyrexian BP, two-brid 2W, CW, X; a split card both faces', () => {
  assert.deepEqual(parseManaCost('1 W W'), { plain: { W: 2 }, hybrid: [], share: { W: 2 }, x: 0 });
  assert.deepEqual(parseManaCost('1 GW GW'), { plain: {}, hybrid: ['WG', 'WG'], share: { W: 1, G: 1 }, x: 0 }, 'Kitchen Finks: two hybrid symbols, not four pips');
  assert.deepEqual(parseManaCost('1 BP BP'), { plain: {}, hybrid: [], share: { B: 2 }, x: 0 }, 'Dismember: payable with life');
  assert.deepEqual(parseManaCost('GWP'), { plain: {}, hybrid: [], share: { W: 0.5, G: 0.5 }, x: 0 }, 'Phyrexian hybrid');
  assert.deepEqual(parseManaCost('PRG'), { plain: {}, hybrid: [], share: { R: 0.5, G: 0.5 }, x: 0 }, "Lukka's spelling");
  assert.deepEqual(parseManaCost('2U 2U 2U'), { plain: {}, hybrid: [], share: { U: 3 }, x: 0 }, 'two-brid: payable with {2}');
  assert.deepEqual(parseManaCost('2 CW'), { plain: { W: 1 }, hybrid: [], share: { W: 1 }, x: 0 }, 'colourless hybrid: a W pip');
  assert.deepEqual(parseManaCost('X X R'), { plain: { R: 1 }, hybrid: [], share: { R: 1 }, x: 2 });
  assert.deepEqual(parseManaCost('2 C S'), { plain: {}, hybrid: [], share: {}, x: 0 }, '{C} and snow: latent, not counted');
  assert.deepEqual(parseManaCost('2/B W/U W/P'), parseManaCost('2B WU WP'), 'the three slash tokens of the zip read the same');
  assert.deepEqual(parseManaCost('no cost'), { plain: {}, hybrid: [], share: {}, x: 0 });
  assert.equal(scriptManaCost('Name:Lightning Bolt\nManaCost:R\nTypes:Instant\n'), 'R');
  const fireIce = 'Name:Fire\nManaCost:1 R\nTypes:Instant\nAlternateMode:Split\nALTERNATE\nName:Ice\nManaCost:1 U\nTypes:Instant\n';
  assert.deepEqual(scriptCost(fireIce), { plain: { R: 1, U: 1 }, hybrid: [], share: { R: 1, U: 1 }, x: 0 }, 'a split card needs both faces');
  const adventure = 'Name:Bonecrusher Giant\nManaCost:2 R\nAlternateMode:Adventure\nALTERNATE\nName:Stomp\nManaCost:1 R\n';
  assert.deepEqual(scriptCost(adventure), parseManaCost('2 R'), 'an adventure is an option: the front face only');
  const real = (n: string): CensusCard => byName.get(n) as CensusCard;
  assert.deepEqual(real('Fire // Ice').cost.plain, { U: 1, R: 1 }, 'Fire // Ice from the real script');
  assert.deepEqual(real('Kitchen Finks').cost.hybrid, ['WG', 'WG']);
  assert.deepEqual(real('Dismember').cost.plain, {});
  assert.deepEqual(noScript, [], 'every supported library card has a script');
});

test('the generator is deterministic by seed, and the command writes the same bytes twice', () => {
  for (const band of BANDS) {
    const a = generateDeck(lib, { band, seed: 7, crossBand: 0.1 }, 3);
    const b = generateDeck(lib, { band, seed: 7, crossBand: 0.1 }, 3);
    assert.deepEqual(a, b, `${band}: the same deck`);
    assert.notDeepEqual(generateDeck(lib, { band, seed: 8, crossBand: 0.1 }, 3).spells, a.spells, `${band}: another seed, another deck`);
  }
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

test('every deck of every band is 40 cards, singleton, every spell castable from its own lands (the independent checker)', () => {
  for (const band of BANDS) {
    for (let i = 1; i <= 120; i++) {
      const d = generateDeck(lib, { band, seed: 11, crossBand: 0.1 }, i);
      assert.equal(d.main.reduce((a, [n]) => a + n, 0), 40, `${d.id}: 40 cards`);
      assert.equal(d.spells.length + d.lands, 40);
      assert.equal(d.fixers.length + Object.values(d.basics).reduce((a, b) => a + b, 0), d.lands);
      const names = [...d.spells, ...d.fixers];
      assert.equal(new Set(names).size, names.length, `${d.id}: one of each card`);
      for (const n of d.spells) {
        const c = byName.get(n) as CensusCard;
        assert.ok(c.supported && !c.land && c.aiFlag !== 'All', `${d.id}: ${n} is a drawable spell`);
        for (const x of c.colors) assert.ok(d.makeup.colours.includes(x), `${d.id}: ${n}'s colours are the makeup's`);
      }
      const ind = independentCheck(d.main, scriptOf);
      assert.deepEqual([...ind.zeroSource, ...ind.short], [], `${d.id}: every spell castable (the independent checker)`);
      assert.equal(d.castable, d.spells.length);
      assert.ok(d.lands >= 15 && d.lands <= 18);
    }
  }
});

// ---------------------------------------------------------------- the independent castability checker

const BASIC_TYPE: Record<string, string> = { Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G' };
interface ILand { name: string; basic: boolean; direct: Set<string>; types: Set<string>; fetch: Array<{ type: string; basicOnly: boolean }> }

/** A land from its Forge script's ability lines and Types, as the engine reads them (not its oracle text). */
function independentLand(name: string, script: string): ILand {
  const l: ILand = { name, basic: false, direct: new Set(), types: new Set(), fetch: [] };
  for (const line of script.split('\n')) {
    const t = /^Types:(.*)$/.exec(line);
    if (t) for (const w of (t[1] ?? '').trim().split(/\s+/)) { const c = BASIC_TYPE[w]; if (c) { l.types.add(c); l.direct.add(c); } }
    if (/^A:AB\$ Mana\b/.test(line)) {
      const p = (/Produced\$ ([^|]*)/.exec(line)?.[1] ?? '').trim();
      for (const w of p === 'Any' ? ['W', 'U', 'B', 'R', 'G'] : p.split(/\s+/)) if (/^[WUBRG]$/.test(w)) l.direct.add(w);
    }
    if (/ChangeZone/.test(line) && /Origin\$ Library/.test(line)) {
      for (const ct of (/ChangeType\$ ([^|]*)/.exec(line)?.[1] ?? '').trim().split(',')) {
        const [ty, q] = ct.split('.');
        if (ty === 'Land' && q === 'Basic') for (const c of 'WUBRG') l.fetch.push({ type: c, basicOnly: true });
        else if (ty && BASIC_TYPE[ty]) l.fetch.push({ type: BASIC_TYPE[ty] as string, basicOnly: q === 'Basic' });
      }
    }
    if (/^K:TypeCycling:Basic\b/.test(line)) for (const c of 'WUBRG') l.fetch.push({ type: c, basicOnly: true });
  }
  return l;
}

/** Every spell of a deck list castable from its own lands, by the rules above: the spells with a colour of zero sources, and those short of a colour's pips. */
function independentCheck(main: Array<[number, string]>, scriptOfName: (n: string) => string | null): { zeroSource: string[]; short: string[]; reach: string[] } {
  const lands: ILand[] = [];
  const spells: Array<[string, string]> = [];
  for (const [n, name] of main) {
    const bc = { Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G' }[name];
    if (bc) { for (let i = 0; i < n; i++) lands.push({ name, basic: true, direct: new Set([bc]), types: new Set([bc]), fetch: [] }); continue; }
    const sc = scriptOfName(name);
    if (sc === null) throw new Error(`no script for ${name}`);
    if (/^Types:.*\bLand\b/m.test(sc.split('\nALTERNATE')[0] as string)) lands.push(independentLand(name, sc)); else spells.push([name, sc]);
  }
  const src: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const reach: string[] = [];
  lands.forEach((l, i) => {
    const r = new Set(l.direct);
    for (const f of l.fetch) lands.forEach((o, j) => { if (j !== i && o.types.has(f.type) && (!f.basicOnly || o.basic)) for (const c of o.direct) r.add(c); });
    for (const c of r) src[c] = (src[c] as number) + 1;
    if (!l.basic) reach.push([...r].sort().join(''));
  });
  const zeroSource: string[] = [], short: string[] = [];
  for (const [name, sc] of spells) {
    const faces = [...sc.matchAll(/^ManaCost:(.*)$/gm)].map((m) => (m[1] ?? '').trim().split(/\s+/));
    for (const face of /^AlternateMode:Split/m.test(sc) ? faces : faces.slice(0, 1)) {
      const pips: Record<string, number> = {};
      for (const tok of face) {
        if (/^C?[WUBRG]$/.test(tok)) { const c = tok.slice(-1); pips[c] = (pips[c] ?? 0) + 1; }
        else if (/^[WUBRG]{2}$/.test(tok) && !((src[tok[0] as string] as number) > 0 || (src[tok[1] as string] as number) > 0)) zeroSource.push(`${name} {${tok}}`);
      }
      for (const [c, n] of Object.entries(pips)) {
        if (src[c] === 0) zeroSource.push(`${name} {${c}}`);
        else if ((src[c] as number) < n) short.push(`${name} ${n}x{${c}} from ${src[c]}`);
      }
    }
  }
  return { zeroSource, short, reach };
}

test('the independent checker catches what it should: a splash behind a fetcher with no basic, a split card\'s other face', () => {
  assert.deepEqual(independentCheck([[1, 'Qasali Pridemage'], [1, 'Evolving Wilds'], [15, 'Plains']], scriptOf).zeroSource, ['Qasali Pridemage {G}']);
  assert.deepEqual(independentCheck([[1, 'Qasali Pridemage'], [1, 'Evolving Wilds'], [14, 'Plains'], [1, 'Forest']], scriptOf).zeroSource, []);
  assert.deepEqual(independentCheck([[1, 'Fire // Ice'], [16, 'Mountain']], scriptOf).zeroSource, ['Fire // Ice {U}']);
  assert.deepEqual(independentCheck([[1, 'Kitchen Finks'], [16, 'Forest']], scriptOf).zeroSource, [], 'hybrid: either colour');
  assert.deepEqual(independentCheck([[1, 'Counterspell'], [1, 'Flooded Strand'], [1, 'Tundra'], [14, 'Plains']], scriptOf).short, [], 'Flooded Strand finds the Tundra: two blue sources');
  assert.deepEqual(independentCheck([[1, 'Counterspell'], [1, 'Tranquil Landscape'], [1, 'Tundra'], [14, 'Plains']], scriptOf).short, ['Counterspell 2x{U} from 1'], 'a Landscape finds basics only');
});

test('400 decks a band pass the independent checker: no spell without a real source, none short of its pips', () => {
  let decks = 0, fixers = 0, fixersOneColour = 0;
  const bad: string[] = [];
  for (const band of BANDS) {
    for (let i = 1; i <= 400; i++) {
      const d = generateDeck(lib, { band, seed: 77, crossBand: 0.1 }, i);
      const r = independentCheck(d.main, scriptOf);
      decks++;
      if (r.zeroSource.length || r.short.length) bad.push(`${d.id}: ${[...r.zeroSource, ...r.short].join(', ')}`);
      for (const x of r.reach) { fixers++; if ([...x].filter((c) => d.profile.pipColours.includes(c)).length < 2) fixersOneColour++; }
    }
  }
  assert.equal(decks, 1600);
  assert.deepEqual(bad, [], `decks with an uncastable spell: ${bad.length}`);
  assert.ok(fixers > 5000, `the decks hold fixers: ${fixers}, ${fixersOneColour} of them reaching one colour of their deck`);
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

test('a fetcher or a cycler is a source only of the colours of the deck\'s lands it can find', () => {
  const plainsOnly = { W: 2, U: 0, B: 0, R: 0, G: 0 };
  const wilds = { ...land('Evolving Wilds', 'WUBRG'), mana: { direct: '', fetch: { types: 'WUBRG', basicOnly: true }, types: '' } };
  const strand = { ...land('Flooded Strand', 'WU'), mana: { direct: '', fetch: { types: 'WU', basicOnly: false }, types: '' } };
  const scape = { ...land('Tranquil Landscape', 'WUG'), mana: { direct: '', fetch: { types: 'WUG', basicOnly: true }, types: '' } };
  const tundra = { ...land('Tundra', 'WU'), mana: { direct: 'WU', fetch: null, types: 'WU' } };
  assert.deepEqual(landSources([wilds], plainsOnly).reach, ['W'], 'Evolving Wilds with Plains alone: W only');
  assert.deepEqual(landSources([strand, tundra], { W: 0, U: 0, B: 0, R: 0, G: 0 }).reach, ['WU', 'WU'], 'Flooded Strand finds a Tundra');
  assert.deepEqual(landSources([scape, tundra], { W: 0, U: 0, B: 0, R: 0, G: 0 }).reach, ['', 'WU'], 'a Landscape finds only basics');
  // the review's case (pauper-77-00047): a white-blue deck splashing one {G}, its fixers all fetchers; they
  // used to count as green sources, so green got no basic and the splash had no real source
  const wug = [...Array.from({ length: 10 }, (_, i) => fx(`w${i}`, 'W', '1 W W', 2)), ...Array.from({ length: 10 }, (_, i) => fx(`u${i}`, 'U', '1 U U', 2)), fx('Qasali Pridemage', 'WG', 'G W', 2)];
  const fetchers = Array.from({ length: 10 }, (_, i) => ({ ...wilds, name: `Wilds ${i}` }));
  const p = landPlan({ lib: fetchers, pool: ['pauper'] as unknown as ['pauper'], fill: [] }, wug, 16, { k: 3, colours: 'WUG', shares: { W: 0.45, U: 0.45, G: 0.1 } }, rng(5))!;
  assert.equal(p.fixers.length, 8, 'F = round(16 x (1 - 20.5/41))');
  assert.ok(p.basics.G >= 1, `a Forest for the fetchers to find: ${JSON.stringify(p.basics)}`);
  assert.ok(sourcesOf(p).G >= 1 + 8, 'and then every fetcher is a green source too');
  assert.ok(castable(wug[20] as CensusCard, sourcesOf(p)));
});

test('card flow is #153\'s rule on the scripts: 40 library cards, the study\'s 17 among them', () => {
  assert.equal(CARD_FLOW_STUDY.length, 17);
  for (const n of CARD_FLOW_STUDY) assert.ok(byName.get(n)?.flow, `${n}: the rule still covers the study`);
  const flow = lib.filter((c) => c.flow).map((c) => c.name);
  assert.equal(flow.length, 40, `the rule names 40 library cards (D446 point 5): ${flow.length}`);
  for (const n of ['Preordain', "Night's Whisper", "Sensei's Divining Top", 'Wheel of Fortune']) assert.ok(flow.includes(n), n);
  for (const n of ['Counterspell', 'Lightning Bolt', 'Mulldrifter']) assert.equal(byName.get(n)?.flow, n === 'Mulldrifter', n);
});

test('every deck row carries its variables: colours, creatures, the mana-value histogram, X spells, card flow, fixers', () => {
  for (const band of BANDS) {
    for (let i = 1; i <= 60; i++) {
      const d = generateDeck(lib, { band, seed: 13, crossBand: 0.1 }, i);
      const spells = d.spells.map((n) => byName.get(n) as CensusCard);
      assert.equal(d.v, 2);
      assert.equal(d.mvHist.length, 7);
      assert.equal(d.mvHist.reduce((a, b) => a + b, 0), d.spells.length, `${d.id}: every spell in the histogram`);
      assert.equal(d.creatures, spells.filter((c) => /Creature/.test(c.type)).length);
      assert.equal(d.xSpells, spells.filter((c) => c.cost.x > 0).length);
      assert.equal(d.cardFlow, spells.filter((c) => c.flow).length);
      assert.equal(d.nColours, d.profile.pipColours.length);
      assert.ok(d.fixersReal <= d.fixers.length);
      assert.ok(Math.abs(Object.values(d.profile.pipShare).reduce((a, b) => a + b, 0) - (d.nColours ? 1 : 0)) < 0.001, `${d.id}: colour shares`);
    }
  }
  const legacy = Array.from({ length: 200 }, (_, i) => generateDeck(lib, { band: 'legacy', seed: 13, crossBand: 0.1 }, i + 1));
  assert.ok(legacy.some((d) => d.xSpells > 0) && legacy.some((d) => d.cardFlow > 0), 'X spells and card flow occur');
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

test('the pairing is prefix-stable, so --pairs can be extended on resume; a smaller --pairs or another seed is refused', () => {
  const ids = Array.from({ length: 37 }, (_, i) => `pauper-3-${String(i + 1).padStart(5, '0')}`);
  assert.deepEqual(pairingOf(ids, 500, 3).slice(0, 120), pairingOf(ids, 120, 3), 'the first 120 games of 500 are the 120-game run');
  const was = { decksSha: 'x', replaySha: null, replay: null, seed: 3, pairs: 120, policyA: 'plain', policyB: 'plain', games: 120 };
  assert.deepEqual(planExtension(was, { ...was }), { extended: false, error: null });
  assert.deepEqual(planExtension(was, { ...was, pairs: 500, games: 500 }), { extended: true, error: null });
  assert.match(planExtension(was, { ...was, pairs: 100, games: 100 }).error ?? '', /smaller --pairs/);
  assert.ok(planExtension(was, { ...was, seed: 4, pairs: 500, games: 500 }).error);
  assert.ok(planExtension(was, { ...was, policyA: 'search' }).error);
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
    lands: 16, fixerTarget: 0, avgMv: 2.5, avgMvDrawn: 2.5, cardFlow: 0, nColours: 1, creatures: 3, mvHist: [0, 2, 2, 1, 1, 0, 0], xSpells: 0, fixersReal: 0,
    cross: [], fill: [], castable: spells.length, file: '',
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
  for (let i = 0; i < 10; i++) decks[i * 7]!.rejections = i % 3;          // a weak-deck tail: 9 rejected draws over 6 decks
  decks[5]!.makeupRedraws = 1;
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
  assert.deepEqual(b.redraws, { decks: 120, rejections: 9, makeupRedraws: 1, decksRedrawn: 7, rejectedShare: 0.0698 }, 'the weak-deck tail, counted over the band\'s decks');
  const md = spectrumMd(doc);
  assert.match(md, /in a random deck of this makeup/);
  assert.match(md, /\*\*The weak-deck tail\*\*.*9 rejected draw\(s\) and 1 new makeup\(s\) over the band's 120 decks/);
  const text = strictJson(doc);
  assert.doesNotMatch(text, /NaN|Infinity/);
  JSON.parse(text);
  assert.throws(() => strictJson({ x: Number.NaN }));
  // cards.tsv carries the deck variables as context columns
  const tsv = cardsTsv(cards).trim().split('\n').map((l) => l.split('\t'));
  const head = tsv[0] as string[];
  for (const col of ['n_colours', 'creatures', 'mv0', 'mv6p', 'x_spells', 'card_flow', 'fixers', 'fixers_real', 'lands', 'share_r']) assert.ok(head.includes(col), col);
  const bombRow = tsv.find((r) => r[1] === 'Planted Bomb') as string[];
  assert.equal(bombRow[head.indexOf('creatures')], '3');
  assert.equal(bombRow[head.indexOf('mv2')], '2');
  assert.equal(bombRow[head.indexOf('share_r')], '1');
});

test('census-read de-duplicates: a folder and its replay count 30 games, not 36; a --decks folder named twice counts once; mixed pilots refused unless asked', () => {
  const decks = Array.from({ length: 12 }, (_, i) => synthDeck(`pauper-9-${String(i + 1).padStart(5, '0')}`, 0.5 + (i % 5) / 10, 2, 2, [`c${i}`, `c${i + 1}`]));
  const plan = pairingOf(decks.map((d) => d.id), 30, 9);
  const row = (g: PlannedGame, k: number, policyA: 'plain' | 'search' = 'plain', replayOf?: string): GameRowOut => ({
    v: 1, g: g.g, seed: g.seed, a: g.a, b: g.b, policyA, policyB: 'plain', winner: k % 3 === 0 ? 'b' : 'a', first: g.seed % 2 === 0 ? 'a' : 'b', turns: 9, ms: 900,
    timeout: false, reason: null, error: null, engineError: null, worker: 0, ...(replayOf ? { replayOf } : {}),
  });
  const dir = mkdtempSync(join(tmpdir(), 'census-read-'));
  const write = (sub: string, file: string, lines: unknown[]): string => { mkdirSync(join(dir, sub), { recursive: true }); writeFileSync(join(dir, sub, file), `${lines.map((l) => JSON.stringify(l)).join('\n')}\n`); return join(dir, sub); };
  try {
    const D = write('decks', 'decks.jsonl', decks);
    const main = write('main', 'games.jsonl', plan.map((g, k) => row(g, k)));
    const replay = write('replay', 'games.jsonl', plan.slice(0, 6).map((g, k) => row(g, k, 'plain', `main/games.jsonl#g${g.g}`)));
    const search = write('search', 'games.jsonl', plan.slice(0, 6).map((g, k) => row(g, k, 'search', `main/games.jsonl#g${g.g}`)));
    const read = (games: string[], extra: Array<[string, string[]]> = []): { games: number; decks: number; dropped: { decks: number; rows: number }; pilots: string[] } => {
      const out = join(dir, `out-${Math.random().toString(36).slice(2)}`);
      censusReadCommand(REPO, new Map<string, string[]>([['games', games], ['decks', [D, D]], ['out', [out]], ['boot', ['20']], ...extra]), quiet);
      return JSON.parse(readFileSync(join(out, 'spectrum.json'), 'utf8')) as never;
    };
    const a = read([main, replay]);
    assert.equal(a.games, 30, 'the main folder plus its replay: 30 games');
    assert.equal(a.decks, 12, 'a --decks folder named twice: 12 decks');
    assert.deepEqual(a.dropped, { decks: 12, rows: 6 });
    assert.deepEqual(a.pilots, ['plain/plain']);
    assert.throws(() => read([main, search]), /pairs of pilots .*--mixed-pilots/);
    const m = read([main, search], [['mixed-pilots', ['1']]]);
    assert.equal(m.games, 36, 'asked for: both pilots, each game once per pilot pair');
    assert.deepEqual(m.pilots, ['plain/plain', 'search/plain']);
    // an engine error and its good row: the good one is kept, whichever comes first
    const err = { ...row(plan[0] as PlannedGame, 0), winner: null, engineError: 'worker exited' } as GameRowOut;
    const kept = dedupe(decks, [err, row(plan[0] as PlannedGame, 0)], { mixedPilots: false });
    assert.equal(kept.rows.length, 1);
    assert.equal(kept.rows[0]!.engineError, null);
    // one id, two lists; one game key, two deck pairs: refused
    assert.throws(() => dedupe([decks[0]!, { ...decks[0]!, spells: ['other'] }], [], { mixedPilots: false }), /two different lists/);
    assert.throws(() => dedupe(decks, [row(plan[0] as PlannedGame, 0), { ...row(plan[0] as PlannedGame, 0), b: 'pauper-9-00099' }], { mixedPilots: false }), /two deck pairs/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('census-read reads two bands played on the same --seed together; two runs of one band on one seed are still refused', () => {
  const band = (b: 'pauper' | 'peasant'): DeckRecord[] => Array.from({ length: 12 }, (_, i) => ({ ...synthDeck(`${b}-1401-${String(i + 1).padStart(5, '0')}`, 0.5 + (i % 5) / 10, 2, 2, [`${b}${i}`]), band: b }));
  const pauper = band('pauper'), peasant = band('peasant');
  const rowsOf = (decks: DeckRecord[]): GameRowOut[] => pairingOf(decks.map((d) => d.id), 30, 1401).map((g, k) => ({
    v: 1, g: g.g, seed: g.seed, a: g.a, b: g.b, policyA: 'plain', policyB: 'plain', winner: k % 2 ? 'a' : 'b', first: 'a', turns: 9, ms: 900,
    timeout: false, reason: null, error: null, engineError: null, worker: 0,
  }));
  const pRows = rowsOf(pauper), qRows = rowsOf(peasant);
  // the guide's example seed, 1401, for both bands: the same (seed, g) on every row of each
  assert.deepEqual(pRows.map((r) => `${r.seed}/${r.g}`), qRows.map((r) => `${r.seed}/${r.g}`));
  const both = dedupe([...pauper, ...peasant], [...pRows, ...qRows], { mixedPilots: false });
  assert.equal(both.rows.length, 60, 'two bands on one seed: 30 games each, none dropped');
  assert.deepEqual(both.dropped, { decks: 0, rows: 0 });
  const { doc } = readCensus(both.decks, both.rows, { boot: 20, bootSeed: 1, shrink: 20 });
  assert.equal(doc.bands['pauper']?.games, 30);
  assert.equal(doc.bands['peasant']?.games, 30);
  // read twice (a folder and itself), each band's games still count once
  assert.equal(dedupe([...pauper, ...peasant], [...pRows, ...qRows, ...pRows, ...qRows], { mixedPilots: false }).rows.length, 60);
  // one band, one seed, a different pairing (another run): refused, and the message says what to do
  const other = rowsOf([...pauper].reverse());
  const clash = other.findIndex((r, i) => r.a !== pRows[i]!.a || r.b !== pRows[i]!.b);
  assert.ok(clash >= 0);
  assert.throws(() => dedupe(pauper, [...pRows, other[clash]!], { mixedPilots: false }), /of band pauper names two deck pairs .*its own --seed/);
});

test('the cube lab CLI refuses a positional argument its command would ignore: --games A B', () => {
  assert.equal(unusedPositionals('census-read', []), null);
  assert.match(unusedPositionals('census-read', ['B']) ?? '', /census-read takes no positional argument, and "B" would be ignored -- a flag takes one value, so repeat it/);
  assert.match(unusedPositionals('report', ['run1', 'run2']) ?? '', /report takes 1 positional argument, and "run2" would be ignored/);
  assert.equal(unusedPositionals('ratings', ['init', 'cube.md']), null);
  assert.match(unusedPositionals('ratings', ['init', 'cube.md', 'x']) ?? '', /takes 2 positional arguments/);
  for (const variadic of ['learn', 'compare', 'shapes']) assert.equal(unusedPositionals(variadic, ['a', 'b', 'c']), null, variadic);
  assert.equal(unusedPositionals('no-such-command', ['a']), null, 'an unknown command is usage()\'s, not this');
  // the real CLI: exit 2 before anything is read
  const r = spawnSync(process.execPath, [join(REPO, 'tools/cubelab/cli.ts'), 'census-read', '--games', 'A', 'B', '--decks', 'D', '--out', join(tmpdir(), 'cubelab-cli-never')], { encoding: 'utf8' });
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /cubelab: census-read takes no positional argument, and "B" would be ignored/);
  const s = spawnSync(process.execPath, [join(REPO, 'tools/cubelab/cli.ts'), 'decks', '--band', 'pauper', 'extra', '--count', '1'], { encoding: 'utf8' });
  assert.equal(s.status, 2, s.stderr);
  assert.match(s.stderr, /decks takes no positional argument, and "extra" would be ignored/);
});

// ---------------------------------------------------------------- a cube's census (D456)

const omegaText = readFileSync(join(REPO, 'cubes', 'omega-cube-180.md'), 'utf8');

test('decks --cube: Omega\'s 180 cards yield castable 1-, 2- and 3-colour decks at every k, from the cube alone', () => {
  const pool = cubePool(omegaText, lib, 'omega-cube-180');
  assert.equal(pool.listed, 180);
  assert.equal(pool.cards.length, 180, 'every Omega card is a supported library card the AI may play');
  assert.deepEqual([pool.notInLibrary, pool.unsupported, pool.aiRemoved, pool.basics], [[], [], [], []]);
  const inCube = new Set(pool.cards.map((c) => c.name));
  const ctx = cubeCtx(pool);
  assert.ok(ctx.colourlessShare > 0.09 && ctx.colourlessShare < 0.14, `q is the cube's own colourless share: ${ctx.colourlessShare}`);
  const byK = new Map<number, number>();
  const monoColours = new Set<string>();
  const bad: string[] = [];
  for (let i = 1; i <= 450; i++) {
    const d = drawDeck(ctx, 'cube:omega-cube-180', 1601, i, CUBE_KS);
    assert.equal(d.id, `omega-cube-180-1601-${String(i).padStart(5, '0')}`);
    assert.equal(d.band, 'cube:omega-cube-180');
    assert.ok(CUBE_KS.includes(d.makeup.k), `${d.id}: k ${d.makeup.k}`);
    assert.equal(d.makeup.colours.length, d.makeup.k);
    byK.set(d.makeup.k, (byK.get(d.makeup.k) ?? 0) + 1);
    if (d.makeup.k === 1) monoColours.add(d.makeup.colours);
    assert.equal(d.main.reduce((a, [n]) => a + n, 0), 40, `${d.id}: 40 cards`);
    assert.ok(d.lands >= 15 && d.lands <= 18);
    const names = [...d.spells, ...d.fixers];
    assert.equal(new Set(names).size, names.length, `${d.id}: one of each card`);
    for (const n of names) assert.ok(inCube.has(n), `${d.id}: ${n} is an Omega card`);
    assert.deepEqual([d.cross, d.fill], [[], []], 'no cross-band slice, nothing filled from outside the cube');
    for (const n of d.spells) for (const x of coloursOf(byName.get(n) as CensusCard)) assert.ok(d.makeup.colours.includes(x), `${d.id}: ${n} fits ${d.makeup.colours}`);
    assert.ok(d.profile.coloursWith3 <= d.makeup.k && d.nColours <= d.makeup.k);
    const r = independentCheck(d.main, scriptOf);
    if (r.zeroSource.length || r.short.length) bad.push(`${d.id}: ${[...r.zeroSource, ...r.short].join(', ')}`);
    assert.equal(d.castable, d.spells.length);
  }
  assert.deepEqual(bad, [], 'every spell castable from its own lands (the independent checker)');
  for (const k of CUBE_KS) assert.ok((byK.get(k) ?? 0) >= 120, `k = ${k}: ${byK.get(k)} decks of 450`);
  assert.equal(monoColours.size, 5, 'a mono deck of every colour');
  // a cube's k is uniform on its own list; with the band's list it is D447's draw for draw
  const r1 = rng(5, 'x'), r2 = rng(5, 'x');
  assert.deepEqual(makeupOf(r1), makeupOf(r2, [1, 2, 3, 4, 5]));
});

test('decks --cube: the command writes the same bytes twice, reports every card\'s share, refuses band flags', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cube-census-'));
  const quiet = (): void => {};
  try {
    const run = (out: string, extra: Array<[string, string[]]> = []): number => decksCommand(REPO, new Map<string, string[]>([['cube', ['cubes/omega-cube-180.md']], ['count', ['120']], ['seed', ['1601']], ['out', [join(dir, out)]], ['scripts', [scripts.path]], ...extra]), quiet);
    assert.equal(run('a'), 0);
    assert.equal(run('b'), 0);
    for (const f of ['decks.jsonl', 'decks.json', 'card-shares.tsv']) assert.equal(readFileSync(join(dir, 'a', f), 'utf8'), readFileSync(join(dir, 'b', f), 'utf8'), f);
    const m = JSON.parse(readFileSync(join(dir, 'a', 'decks.json'), 'utf8'));
    assert.equal(m.decision, 'D456');
    assert.equal(m.cubeName, 'omega-cube-180');
    assert.deepEqual(m.ks, [1, 2, 3]);
    assert.equal(m.decksOf40, 120);
    assert.equal(m.makeupK.k1 + m.makeupK.k2 + m.makeupK.k3, 120);
    assert.equal(m.coloursWith3.c4 + m.coloursWith3.c5, 0, 'no 4- or 5-colour deck');
    assert.equal(m.repeatCap.maxShare, DEFAULT_MAX_SHARE_K1);
    assert.equal(m.repeatCap.perCard, repeatCapCount(DEFAULT_MAX_SHARE_K1, m.makeupK.k1));
    assert.ok(m.repeatCap.maxK1Uses <= m.repeatCap.perCard);
    const tsv = readFileSync(join(dir, 'a', 'card-shares.tsv'), 'utf8').trim().split('\n');
    assert.equal(tsv.length, 181, 'a row for each of the 180 cards');
    const head = (tsv[0] as string).split('\t');
    assert.deepEqual(head.slice(0, 6), ['card', 'colours', 'mv', 'land', 'decks', 'share']);
    assert.ok(head.includes('k1_share_of_admitting') && head.includes('k3_share'));
    // the shares add up: each deck holds its spells and fixers once
    const decks = readFileSync(join(dir, 'a', 'decks.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as DeckRecord);
    const held = decks.reduce((a, d) => a + d.spells.length + d.fixers.length, 0);
    assert.equal(tsv.slice(1).reduce((a, l) => a + Number(l.split('\t')[4]), 0), held);
    // flags that belong to a band, and a k outside 1..5
    assert.throws(() => run('c', [['band', ['pauper']]]), /--band is a band's/);
    assert.throws(() => run('c', [['cross-band', ['0.1']]]), /--cross-band is a band's/);
    assert.throws(() => run('c', [['k', ['0,1']]]), /--k wants distinct numbers/);
    assert.throws(() => decksCommand(REPO, new Map([['band', ['pauper']], ['count', ['1']], ['seed', ['1']], ['out', [join(dir, 'd')]], ['k', ['1,2']]]), quiet), /--k is for --cube/);
    assert.throws(() => cubeNameOf('cubes/Omega Cube.md'), /lower-case letters/);
    assert.throws(() => cubeNameOf('x/pauper.md'), /named after a band/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the repeat cap: it changes no Omega deck, and it holds on a mono-heavy cube where it binds', () => {
  // Omega at J145's size: no card reaches a quarter of the k = 1 decks (a coloured card's ceiling there is
  // about a fifth: its colour's mono decks are a fifth of them), so the run is the uncapped draw.  (A run
  // of a few hundred decks can reach it by chance: a colour's share of ~130 mono decks has an SD of 0.035.)
  const omega = cubeCtx(cubePool(omegaText, lib, 'omega-cube-180'));
  const capped = drawCubeRun(omega, 'cube:omega-cube-180', 1601, 2000, CUBE_KS, DEFAULT_MAX_SHARE_K1);
  assert.equal(capped.capped.size, 0);
  assert.equal(capped.rounds, 1);
  assert.ok(Math.max(...capped.k1Uses.values()) / capped.decks.filter((d) => d.makeup.k === 1).length < 0.21);
  for (let i = 1; i <= 2000; i++) assert.deepEqual(capped.decks[i - 1], drawDeck(omega, 'cube:omega-cube-180', 1601, i, CUBE_KS), `deck ${i} is the uncapped draw's`);
  // a mono-heavy cube: 60 white cards, 15 of each other colour, so only white has mono decks and they repeat white's cards
  const spellsOf = (c: string, n: number): string[] => lib.filter((x) => x.supported && x.aiFlag !== 'All' && !x.land && x.colors === c && coloursOf(x) === c).slice(0, n).map((x) => x.name);
  const colourless = lib.filter((x) => x.supported && x.aiFlag !== 'All' && !x.land && coloursOf(x) === '').slice(0, 12).map((x) => x.name);
  const sections: Array<[string, string[]]> = [['White', spellsOf('W', 60)], ['Blue', spellsOf('U', 15)], ['Black', spellsOf('B', 15)], ['Red', spellsOf('R', 15)], ['Green', spellsOf('G', 15)], ['Colorless', colourless]];
  const doc = `# Heavy\n\n## The list\n\n${sections.map(([t, ns]) => `### ${t} (${ns.length})\n${ns.join(' · ')}\n`).join('\n')}`;
  const heavy = cubePool(doc, lib, 'heavy-test');
  assert.equal(heavy.cards.length, 132);
  const ctx = cubeCtx(heavy);
  const free = drawCubeRun(ctx, 'cube:heavy-test', 9, 300, CUBE_KS, 1);
  const k1Free = free.decks.filter((d) => d.makeup.k === 1);
  assert.ok(k1Free.every((d) => d.makeup.colours === 'W'), 'only white can be drawn mono');
  const maxFree = Math.max(...free.k1Uses.values());
  assert.ok(maxFree / k1Free.length > 0.3, `uncapped, a white card is in ${maxFree} of ${k1Free.length} mono decks`);
  const run = drawCubeRun(ctx, 'cube:heavy-test', 9, 300, CUBE_KS, DEFAULT_MAX_SHARE_K1);
  const k1 = run.decks.filter((d) => d.makeup.k === 1);
  assert.ok(run.capped.size > 0, 'the cap binds');
  assert.equal(run.capCount, repeatCapCount(DEFAULT_MAX_SHARE_K1, k1.length), 'the cap is the run\'s own: max(floor, floor(share x N1))');
  for (const [n, u] of run.k1Uses) assert.ok(u <= run.capCount, `${n} is in ${u} k = 1 decks, the cap is ${run.capCount}`);
  assert.ok(Math.max(...run.k1Uses.values()) <= Math.max(REPEAT_CAP_FLOOR, DEFAULT_MAX_SHARE_K1 * k1.length));
  for (const d of run.decks) assert.equal(d.castable, d.spells.length);
});

test('census-read reads a cube\'s group beside the bands, and its cards are keyed by it', () => {
  const cube = Array.from({ length: 12 }, (_, i) => ({ ...synthDeck(`omega-cube-180-1601-${String(i + 1).padStart(5, '0')}`, 0.5 + (i % 5) / 10, 1 + (i % 3), 1 + (i % 3), [`card${i % 4}`]), band: 'cube:omega-cube-180' as const }));
  const rows: GameRowOut[] = pairingOf(cube.map((d) => d.id), 30, 1601).map((g, k) => ({
    v: 1, g: g.g, seed: g.seed, a: g.a, b: g.b, policyA: 'plain', policyB: 'plain', winner: k % 2 ? 'a' : 'b', first: 'a', turns: 9, ms: 900,
    timeout: false, reason: null, error: null, engineError: null, worker: 0,
  }));
  const { doc, cards } = readCensus(cube, rows, { boot: 20, bootSeed: 1, shrink: 20 });
  assert.deepEqual(Object.keys(doc.bands), ['cube:omega-cube-180']);
  assert.equal(doc.bands['cube:omega-cube-180']?.games, 30);
  assert.equal(doc.bands['cube:omega-cube-180']?.decks, 12);
  assert.ok(cards.length === 4 && cards.every((c) => c.band === 'cube:omega-cube-180'));
  assert.doesNotThrow(() => strictJson(doc));
  assert.match(spectrumMd(doc), /## cube:omega-cube-180/);
});

test('the engine-unplayable list (D482): the committed file, its shape, every card in the library', () => {
  const u = loadEngineUnplayable(REPO, undefined);
  assert.ok(u, 'the committed list loads');
  assert.equal(u.file, ENGINE_UNPLAYABLE_FILE);
  assert.deepEqual([...u.cards.keys()], ['Scute Swarm', 'Chain of Smog', 'Emeritus of Abundance', 'Elite Interceptor', 'Emeritus of Ideation', 'Studious First-Year'], 'the list: J166\'s Scute Swarm (D482), J173\'s Chain of Smog (D490) and J176\'s four Prepare cards (D492)');
  assert.equal(u.cards.get('Scute Swarm')?.since, 'J166');
  assert.equal(u.cards.get('Chain of Smog')?.since, 'J173');
  assert.equal(u.cards.get('Studious First-Year')?.since, 'J176');
  for (const n of u.cards.keys()) assert.ok(byName.has(n), `${n} is a library card`);
  assert.equal(loadEngineUnplayable(REPO, 'none'), null);
  assert.throws(() => parseEngineUnplayable('{"cards":{"X":{"since":"J1","why":"w"}}}', 't.json'), /X has no evidence/);
  assert.throws(() => parseEngineUnplayable('{"cards":{"X":{"since":"","why":"w","evidence":"e"}}}', 't.json'), /X has no since/);
  assert.throws(() => parseEngineUnplayable('{"X":{}}', 't.json'), /wants \{ "cards"/);
});

test('the engine-unplayable list (D482): a listed card is never dealt, every skip counted, every other deck unchanged', () => {
  // J166's spine s04: deck 1 drew Scute Swarm third; with the list it is redrawn from there on, and deck 2 never met it
  const scute = new Set(['Scute Swarm']);
  const j166 = (i: number, unplayable?: ReadonlySet<string>): DeckRecord => generateDeck(lib, { band: 'powered', seed: 2004, crossBand: 0.1, ...(unplayable ? { unplayable } : {}) }, i);
  assert.equal(j166(1).spells[2], 'Scute Swarm', "J166's deck: Scute Swarm the third spell");
  assert.deepEqual(j166(1, scute).engineSkips, { 'Scute Swarm': 1 });
  assert.ok(!j166(1, scute).spells.includes('Scute Swarm'));
  assert.deepEqual(j166(1, scute).spells.slice(0, 2), j166(1).spells.slice(0, 2), 'the picks before the skip are the same');
  assert.deepEqual(j166(2, scute), j166(2), 'deck 2 is the same row');
  // 300 decks of the two bands that hold it, and the same with a planted fixer and colourless spell listed
  const plain = (band: Band, i: number): DeckRecord => generateDeck(lib, { band, seed: 482, crossBand: 0.1 }, i);
  const freq = (pick: (d: DeckRecord) => string[]): string => {
    const n = new Map<string, number>();
    for (let i = 1; i <= 150; i++) for (const c of pick(plain('legacy', i))) n.set(c, (n.get(c) ?? 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] as string;
  };
  const fixer = freq((d) => d.fixers);
  const colourless = freq((d) => d.spells.filter((n) => coloursOf(byName.get(n) as CensusCard) === ''));
  for (const listed of [scute, new Set(['Scute Swarm', fixer, colourless])]) {
    let skipped = 0, same = 0, hadListed = 0;
    for (const band of ['legacy', 'powered'] as Band[]) {
      for (let i = 1; i <= 150; i++) {
        const before = plain(band, i);
        const d = generateDeck(lib, { band, seed: 482, crossBand: 0.1, unplayable: listed }, i);
        for (const n of listed) assert.ok(!d.spells.includes(n) && !d.fixers.includes(n), `${d.id}: ${n} is never dealt`);
        assert.ok(d.main.every(([, n]) => !listed.has(n)));
        if ([...before.spells, ...before.fixers].some((n) => listed.has(n))) { hadListed++; assert.ok(d.engineSkips, `${d.id}: the deck that held a listed card counts its skip`); }
        if (d.engineSkips) {
          skipped++;
          assert.ok(Object.keys(d.engineSkips).every((n) => listed.has(n)) && Object.values(d.engineSkips).every((k) => k >= 1));
        } else { same++; assert.deepEqual(d, before, `${d.id}: no pick landed on a listed card, so it is the deck drawn without the list`); }
      }
    }
    assert.ok(hadListed >= 1 && skipped >= hadListed, `${[...listed].join(', ')}: ${hadListed} deck(s) held one without the list, ${skipped} skipped`);
    assert.ok(same >= 200, `most decks never meet the list: ${same} of 300`);
  }
});

test('decks writes the list it applied and its skips; --unplayable none is D447\'s draw; --cube refuses it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'deck-census-'));
  try {
    const run = (out: string, extra: Array<[string, string[]]> = []): string[] => {
      const said: string[] = [];
      decksCommand(REPO, new Map<string, string[]>([['band', ['powered']], ['count', ['2']], ['seed', ['2004']], ['cross-band', ['0.10']], ['out', [join(dir, out)]], ['scripts', [scripts.path]], ...extra]), (x) => said.push(x));
      return said;
    };
    const said = run('d');
    assert.match(said.join('\n'), /engine-unplayable \(D482\) tools\/cubelab\/engine-unplayable\.json: Scute Swarm \(1 skip\(s\)\), Chain of Smog \(0 skip\(s\)\), Emeritus of Abundance \(0 skip\(s\)\), Elite Interceptor \(0 skip\(s\)\), Emeritus of Ideation \(0 skip\(s\)\), Studious First-Year \(0 skip\(s\)\), 1 deck\(s\) with a skip/);
    const m = JSON.parse(readFileSync(join(dir, 'd', 'decks.json'), 'utf8')) as { engineUnplayable: { decision: string; cards: string[]; skips: number; skipsByCard: Record<string, number>; decksWithSkip: number; notInLibrary: string[] }; rules: Record<string, string> };
    assert.deepEqual(m.engineUnplayable, { ...m.engineUnplayable, decision: 'D482', cards: ['Scute Swarm', 'Chain of Smog', 'Emeritus of Abundance', 'Elite Interceptor', 'Emeritus of Ideation', 'Studious First-Year'], skips: 1, skipsByCard: { 'Scute Swarm': 1, 'Chain of Smog': 0, 'Emeritus of Abundance': 0, 'Elite Interceptor': 0, 'Emeritus of Ideation': 0, 'Studious First-Year': 0 }, decksWithSkip: 1, notInLibrary: [] });
    assert.match(m.rules.engineUnplayable as string, /never dealt/);
    const rows = readFileSync(join(dir, 'd', 'decks.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as DeckRecord);
    assert.deepEqual(rows.map((r) => r.engineSkips ?? null), [{ 'Scute Swarm': 1 }, null]);
    assert.ok(!readFileSync(join(dir, 'd', 'decks', 'powered-2004-00001.dck'), 'utf8').includes('Scute Swarm'));
    run('none', [['unplayable', ['none']]]);
    assert.match(readFileSync(join(dir, 'none', 'decks', 'powered-2004-00001.dck'), 'utf8'), /^1 Scute Swarm$/m, 'without the list, J166\'s deck');
    assert.equal(JSON.parse(readFileSync(join(dir, 'none', 'decks.json'), 'utf8')).engineUnplayable, null);
    assert.equal(readFileSync(join(dir, 'none', 'decks', 'powered-2004-00002.dck'), 'utf8'), readFileSync(join(dir, 'd', 'decks', 'powered-2004-00002.dck'), 'utf8'));
    assert.throws(() => decksCommand(REPO, new Map([['cube', ['cubes/omega-cube-180.md']], ['count', ['1']], ['seed', ['1']], ['out', [join(dir, 'c')]], ['unplayable', ['none']]]), quiet), /--unplayable is a band's \(D482\)/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
