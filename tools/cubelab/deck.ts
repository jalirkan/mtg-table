// mtg-table — the cube lab: build a 40-card deck from a drafted pool.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Every two-colour pair is tried, each with no splash and with every splash
// colour the pool has the fixing for.  For each, the spells are chosen greedily
// by rating plus synergy with the other candidates, against a curve target, and
// the build is scored by what a person building it would look at: how good the
// spells are, how many are real playables, how dense its best themes are, how
// close it sits to the curve, whether it has enough creatures, and how many
// cards it splashes (D294).  Forge's own evaluator (LimitedDeckEvaluator) liked
// an 11-spell, 29-land deck; this one cannot build one, because a deck here is
// always 40 cards with 16 or 17 lands — `checkDeck` is the rule and the tests
// hold it.  A pool too thin for any two-colour build to reach 23 spells gets a
// second pass (D298) that also tries a wider splash, 18 lands with 22 spells,
// and three full colours; the deck says `stretched`.  Forge's
// BoosterDeckBuilder still runs beside it in the engine (the JSONL's `forge`
// block) and plays instead under `--builder forge`, or when even the second
// pass finds nothing.

import { BASIC_OF, castableIn, colourPairs, COLOURS, type Colour, type LabCard } from './cards.ts';
import { splashColourOf, synergyCount } from './pick.ts';
import type { Weights } from './weights.ts';

export const DECK_SIZE = 40;
/** Curve target per mana-value bucket (0-1, 2, 3, 4, 5, 6+) for 23 spells. */
export const CURVE_TARGET = [3, 6, 5, 4, 3, 2];
export const bucketOf = (cmc: number): number => Math.min(5, Math.max(0, cmc - 1));

export interface DeckBuild {
  builder: 'lab';
  /** The main colours (WUBRG order): two, or three for a thin pool's three-colour build. */
  colors: string;
  splash: string | null;
  /** [count, name], spells first (in choice order), then nonbasic lands, then basics. */
  main: Array<[number, string]>;
  spells: number;
  lands: number;
  basics: Partial<Record<Colour, number>>;
  /** Spells per bucket 0-1, 2, 3, 4, 5, 6+. */
  curve: number[];
  avgCmc: number;
  creatures: number;
  /** The deck's themes by how many spells carry each, best first. */
  themes: Array<[string, number]>;
  score: number;
  parts: Record<string, number>;
  /** The next best builds, for the report: colours, splash and score. */
  alternatives: Array<{ colors: string; splash: string | null; score: number }>;
  /**
   * Built on the second pass, for a pool where no two-colour build reaches 23
   * spells (D298): a splash of up to `maxSplashStretch` cards, 18 lands, or three colours.
   */
  stretched: boolean;
}

interface Candidate { card: LabCard; splashing: boolean }

/** Count each name in a pool. */
export function countNames(cards: LabCard[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of cards) m.set(c.name, (m.get(c.name) ?? 0) + 1);
  return m;
}

/** Can a land (or fixer) make colour `c` for this deck? */
const makes = (card: LabCard, c: string): boolean => card.produces.includes(c);

/** The ten three-colour sets, WUBRG-ordered strings. */
export function colourTriples(): string[] {
  const out: string[] = [];
  for (let i = 0; i < 5; i++) for (let k = i + 1; k < 5; k++) for (let m = k + 1; m < 5; m++) out.push(`${COLOURS[i]}${COLOURS[k]}${COLOURS[m]}`);
  return out;
}

/** How many of `spells` a two-colour subset of `colors` cannot cast (0 for two colours). */
export function thirdColourCards(spells: LabCard[], colors: string): number {
  if (colors.length < 3) return 0;
  let best = 0;
  for (const pair of colourPairs()) {
    if (![...pair].every((k) => colors.includes(k))) continue;
    best = Math.max(best, spells.filter((c) => castableIn(c, pair)).length);
  }
  return spells.length - best;
}

interface BuildOpts { maxSplash: number; eighteen: boolean; stretched: boolean }

function buildOne(pool: LabCard[], pair: string, splash: string | null, w: Weights, o: BuildOpts): DeckBuild | null {
  const { maxSplash } = o;
  const allowed = pair + (splash ?? '');
  // Candidates: castable in the pair, or a legal splash card of `splash`.
  const cands: Candidate[] = [];
  for (const c of pool) {
    if (c.land) continue;
    if (castableIn(c, pair)) cands.push({ card: c, splashing: false });
    else if (splash && splashColourOf(c, pair) === splash && castableIn(c, allowed)) cands.push({ card: c, splashing: true });
  }
  const everyone = cands.map((x) => x.card);
  const base = (x: Candidate): number => x.card.rating
    + w.buildSynergy * synergyCount(x.card, everyone, w.synergyCap)
    - (x.card.remAIDeck ? w.remAIDeck : 0)
    - (x.splashing ? w.deckSplash : 0);
  const value = new Map<Candidate, number>(cands.map((x) => [x, base(x)]));

  const choose = (nSpells: number): Candidate[] => {
    const chosen: Candidate[] = [];
    const left = new Set(cands);
    const curve = [0, 0, 0, 0, 0, 0];
    let splashN = 0;
    while (chosen.length < nSpells && left.size > 0) {
      let best: Candidate | null = null;
      let bv = -Infinity;
      for (const x of left) {
        if (x.splashing && splashN >= maxSplash) continue;
        const b = bucketOf(x.card.cmc);
        const target = (CURVE_TARGET[b] ?? 0) * nSpells / 23;
        const over = Math.max(0, (curve[b] ?? 0) + 1 - target);
        const v = (value.get(x) ?? 0) - w.deckCurve * 4 * over;
        if (v > bv) { bv = v; best = x; }
      }
      if (!best) break;
      left.delete(best);
      chosen.push(best);
      const bb = bucketOf(best.card.cmc);
      curve[bb] = (curve[bb] ?? 0) + 1;
      if (best.splashing) splashN++;
    }
    return chosen;
  };

  let landCount = o.eighteen ? 18 : 17;
  let chosen = choose(DECK_SIZE - landCount);
  if (chosen.length < DECK_SIZE - landCount) return null;
  const avg = chosen.reduce((s, x) => s + x.card.cmc, 0) / chosen.length;
  if (!o.eighteen && avg <= w.sixteenLandsAt) {
    const more = choose(24);
    if (more.length === 24) { chosen = more; landCount = 16; }
  }
  const spells = chosen.map((x) => x.card);

  // Lands: every nonbasic in the pool that makes two deck colours (a fetch
  // counts the basic types it finds), or that makes the splash colour at all.
  // At most landCount - 7, so the main colours keep basics.  A three-colour
  // build needs at least one land or fixer making its least-used colour, and
  // every colour used by some spell; three colours on basics alone is not a deck.
  const nonbasic = pool.filter((c) => c.land
    && ([...allowed].filter((k) => makes(c, k)).length >= 2 || (splash !== null && makes(c, splash))));
  nonbasic.sort((x, y) => [...pair].filter((k) => makes(y, k)).length - [...pair].filter((k) => makes(x, k)).length || y.rating - x.rating);
  const lands = nonbasic.slice(0, Math.max(0, landCount - 7));

  // Basics by pip weight; the splash colour gets just enough to reach its source count.
  const pipW: Record<string, number> = {};
  for (const c of spells) for (const k of COLOURS) pipW[k] = (pipW[k] ?? 0) + (c.pips[k] ?? 0);
  const basics: Partial<Record<Colour, number>> = {};
  let slots = landCount - lands.length;
  if (splash) {
    const have = lands.filter((l) => makes(l, splash)).length + spells.filter((c) => c.fixer && makes(c, splash)).length;
    const need = Math.max(0, w.splashDeckSources - have);
    if (need > 2) return null;                       // a splash on basics alone is not a splash
    if (need > 0) { basics[splash as Colour] = need; slots -= need; }
  }
  if (pair.length === 3) {
    for (const k of pair) {
      if (spells.every((c) => !(c.pips[k as Colour] ?? 0))) return null;     // a colour no spell uses: build the pair instead
      const src = lands.filter((l) => makes(l, k)).length + spells.filter((c) => c.fixer && makes(c, k)).length;
      const minor = (pipW[k] ?? 0) <= Math.min(...[...pair].map((x) => pipW[x] ?? 0));
      if (minor && src === 0) return null;
    }
  }
  // Basics split across the main colours by pip weight (largest remainder; ties in WUBRG order).
  const ws = [...pair].map((k) => Math.max(1, pipW[k] ?? 0));
  const wsum = ws.reduce((s, x) => s + x, 0);
  const exact = ws.map((x) => slots * x / wsum);
  const n = exact.map(Math.floor);
  const order = exact.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let r = slots - n.reduce((s, x) => s + x, 0), j = 0; r > 0; r--, j++) {
    const i = order[j % order.length]?.[1] ?? 0;
    n[i] = (n[i] ?? 0) + 1;
  }
  [...pair].forEach((k, i) => { basics[k as Colour] = (basics[k as Colour] ?? 0) + (n[i] ?? 0); });

  // Score.
  const curve = [0, 0, 0, 0, 0, 0];
  for (const c of spells) { const b = bucketOf(c.cmc); curve[b] = (curve[b] ?? 0) + 1; }
  const curvePenalty = curve.reduce((s, n, i) => s + Math.abs(n - (CURVE_TARGET[i] ?? 0) * spells.length / 23), 0);
  const playables = spells.filter((c) => c.rating >= w.playable).length;
  const themeCount = new Map<string, number>();
  for (const c of spells) for (const t of c.themes) themeCount.set(t, (themeCount.get(t) ?? 0) + 1);
  const themes = [...themeCount.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const density = (themes[0]?.[1] ?? 0) + 0.5 * (themes[1]?.[1] ?? 0);
  const creatures = spells.filter((c) => c.creature).length;
  const splashCards = chosen.filter((x) => x.splashing).length;
  const meanRating = spells.reduce((s, c) => s + c.rating, 0) / spells.length;
  const parts = {
    meanRating,
    playables: w.deckPlayable * playables,
    theme: w.deckTheme * density,
    curve: -w.deckCurve * curvePenalty,
    creatures: -w.deckCreatures * Math.max(0, w.creaturesMin - creatures),
    splash: -w.deckSplash * splashCards,
    threeColour: -w.deckThreeColour * thirdColourCards(spells, pair),
    eighteenLands: o.eighteen ? -w.deckEighteenLands : 0,
  };
  const score = Object.values(parts).reduce((s, x) => s + x, 0);

  const main: Array<[number, string]> = [];
  for (const [name, n] of countNames(spells)) main.push([n, name]);
  for (const [name, n] of countNames(lands)) main.push([n, name]);
  for (const k of COLOURS) if ((basics[k] ?? 0) > 0) main.push([basics[k] ?? 0, BASIC_OF[k]]);
  return {
    builder: 'lab', colors: pair, splash, main,
    spells: spells.length, lands: landCount, basics, curve,
    avgCmc: Math.round(spells.reduce((s, c) => s + c.cmc, 0) / spells.length * 100) / 100,
    creatures, themes, score: Math.round(score * 10) / 10,
    parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v * 10) / 10])),
    alternatives: [],
    stretched: o.stretched,
  };
}

/**
 * The best deck the pool makes.  A first pass builds two colours plus at most a
 * `maxSplash`-card splash on 16-17 lands.  A pool too thin for any pair to reach
 * 23 spells gets a second pass (D298) scoring three kinds of build together: a
 * splash of up to `maxSplashStretch` cards, 18 lands with 22 spells, and three
 * full colours on 17 or 18 lands (the deck says `stretched`).  Null when that
 * fails too.
 */
export function buildDeck(pool: LabCard[], w: Weights): DeckBuild | null {
  return buildPass(pool, w, false) ?? buildPass(pool, w, true);
}

function buildPass(pool: LabCard[], w: Weights, thin: boolean): DeckBuild | null {
  const builds: DeckBuild[] = [];
  const tries: BuildOpts[] = thin
    ? [{ maxSplash: w.maxSplashStretch, eighteen: false, stretched: true }, { maxSplash: w.maxSplash, eighteen: true, stretched: true }]
    : [{ maxSplash: w.maxSplash, eighteen: false, stretched: false }];
  for (const pair of colourPairs()) {
    const splashes: Array<string | null> = [null];
    for (const s of COLOURS) {
      if (pair.includes(s)) continue;
      const sources = pool.filter((c) => (c.land || c.fixer) && makes(c, s) && (c.fixer || [...pair].some((k) => makes(c, k)))).length;
      const worth = pool.some((c) => !c.land && splashColourOf(c, pair) === s && c.rating >= w.splashMinRating);
      if (sources >= 1 && worth) splashes.push(s);
    }
    for (const s of splashes) {
      for (const o of tries) {
        const b = buildOne(pool, pair, s, w, o);
        if (b) builds.push(b);
      }
    }
  }
  if (thin) {
    for (const triple of colourTriples()) {
      for (const eighteen of [false, true]) {
        const b = buildOne(pool, triple, null, w, { maxSplash: 0, eighteen, stretched: true });
        if (b) builds.push(b);
      }
    }
  }
  if (builds.length === 0) return null;
  builds.sort((a, b) => b.score - a.score);
  const best = builds[0] as DeckBuild;
  best.alternatives = builds.slice(1, 4).map((b) => ({ colors: b.colors, splash: b.splash, score: b.score }));
  return best;
}

export interface DeckCheckInput {
  main: Array<[number, string]>;
  colors: string;
  splash: string | null;
  /** A thin pool's build (D298): 18 lands and three main colours are allowed too. */
  stretched?: boolean;
}

/**
 * The lab's deck rules, as a list of what is wrong (empty = legal): exactly 40
 * cards; 16 or 17 lands (up to 18 when `stretched`); no nonbasic card more
 * often than the pool holds it; two main colours (or three when `stretched`,
 * with no splash), every spell castable in them plus the splash; a splash is
 * one colour, at most `maxSplash` cards, each needing at most one pip of it.
 */
export function checkDeck(d: DeckCheckInput, pool: LabCard[], byName: Map<string, LabCard>, maxSplash: number): string[] {
  const errs: string[] = [];
  const total = d.main.reduce((s, [n]) => s + n, 0);
  if (total !== DECK_SIZE) errs.push(`${total} cards, not ${DECK_SIZE}`);
  const basicNames = new Set(Object.values(BASIC_OF));
  const have = countNames(pool);
  let lands = 0;
  let splashN = 0;
  const maxLands = d.stretched ? 18 : 17;
  if (d.colors.length === 3 && d.stretched) {
    if (d.splash) errs.push(`a three-colour deck "${d.colors}" with a splash "${d.splash}"`);
  } else if (d.colors.length !== 2) errs.push(`main colours "${d.colors}" are not two colours`);
  if (d.splash && (d.splash.length !== 1 || d.colors.includes(d.splash))) errs.push(`splash "${d.splash}" is not one other colour`);
  for (const [n, name] of d.main) {
    if (basicNames.has(name)) { lands += n; continue; }
    const card = byName.get(name);
    if (!card) { errs.push(`unknown card ${name}`); continue; }
    if (n > (have.get(name) ?? 0)) errs.push(`${n} ${name} but the pool holds ${have.get(name) ?? 0}`);
    if (card.land) { lands += n; continue; }
    if (castableIn(card, d.colors)) continue;
    if (d.splash && splashColourOf(card, d.colors) === d.splash) { splashN += n; continue; }
    errs.push(`${name} (${card.colors}) is off-colour for ${d.colors}${d.splash ? `+${d.splash}` : ''}`);
  }
  if (lands < 16 || lands > maxLands) errs.push(`${lands} lands, not 16-${maxLands}`);
  if (splashN > maxSplash) errs.push(`${splashN} splash cards, more than ${maxSplash}`);
  return errs;
}

/** Forge's .dck text (DeckSerializer reads it; names only, so Forge picks the printing). */
export function dckText(name: string, main: Array<[number, string]>, sideboard: string[]): string {
  const lines = ['[metadata]', `Name=${name}`, '[Main]'];
  for (const [n, card] of main) lines.push(`${n} ${card}`);
  lines.push('[Sideboard]');
  for (const [card, n] of countNamesStr(sideboard)) lines.push(`${n} ${card}`);
  return `${lines.join('\n')}\n`;
}

function countNamesStr(names: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const n of names) m.set(n, (m.get(n) ?? 0) + 1);
  return m;
}
