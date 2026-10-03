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
// hold it.  Forge's BoosterDeckBuilder still runs beside it in the engine (the
// JSONL's `forge` block) and plays instead under `--builder forge`, or when
// this builder cannot reach 23 castable spells.

import { BASIC_OF, castableIn, colourPairs, COLOURS, type Colour, type LabCard } from './cards.ts';
import { splashColourOf, synergyCount } from './pick.ts';
import type { Weights } from './weights.ts';

export const DECK_SIZE = 40;
/** Curve target per mana-value bucket (0-1, 2, 3, 4, 5, 6+) for 23 spells. */
export const CURVE_TARGET = [3, 6, 5, 4, 3, 2];
export const bucketOf = (cmc: number): number => Math.min(5, Math.max(0, cmc - 1));

export interface DeckBuild {
  builder: 'lab';
  /** The two main colours (WUBRG order). */
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
  /** Built on the second pass, which allows `maxSplashStretch` splash cards (the pool was thin). */
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

function buildOne(pool: LabCard[], pair: string, splash: string | null, w: Weights, maxSplash: number): DeckBuild | null {
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

  let chosen = choose(23);
  if (chosen.length < 23) return null;
  const avg = chosen.reduce((s, x) => s + x.card.cmc, 0) / chosen.length;
  let landCount = 17;
  if (avg <= w.sixteenLandsAt) {
    const more = choose(24);
    if (more.length === 24) { chosen = more; landCount = 16; }
  }
  const spells = chosen.map((x) => x.card);

  // Lands: every nonbasic in the pool that makes two deck colours (a fetch
  // counts the basic types it finds), or that makes the splash colour at all.
  // At most landCount - 7, so the main colours keep basics.
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
  const p0 = pair[0] as Colour;
  const p1 = pair[1] as Colour;
  const w0 = Math.max(1, pipW[p0] ?? 0);
  const w1 = Math.max(1, pipW[p1] ?? 0);
  const n0 = Math.round(slots * w0 / (w0 + w1));
  basics[p0] = (basics[p0] ?? 0) + n0;
  basics[p1] = (basics[p1] ?? 0) + (slots - n0);

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
    stretched: maxSplash > w.maxSplash,
  };
}

/**
 * The best deck the pool makes.  A first pass allows `maxSplash` splash cards; a
 * pool too thin for any pair to reach 23 spells gets a second pass allowing
 * `maxSplashStretch` (the deck says `stretched`); null when that fails too.
 */
export function buildDeck(pool: LabCard[], w: Weights): DeckBuild | null {
  return buildPass(pool, w, w.maxSplash) ?? buildPass(pool, w, w.maxSplashStretch);
}

function buildPass(pool: LabCard[], w: Weights, maxSplash: number): DeckBuild | null {
  const builds: DeckBuild[] = [];
  for (const pair of colourPairs()) {
    const splashes: Array<string | null> = [null];
    for (const s of COLOURS) {
      if (pair.includes(s)) continue;
      const sources = pool.filter((c) => (c.land || c.fixer) && makes(c, s) && (c.fixer || [...pair].some((k) => makes(c, k)))).length;
      const worth = pool.some((c) => !c.land && splashColourOf(c, pair) === s && c.rating >= w.splashMinRating);
      if (sources >= 1 && worth) splashes.push(s);
    }
    for (const s of splashes) {
      const b = buildOne(pool, pair, s, w, maxSplash);
      if (b) builds.push(b);
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
}

/**
 * The lab's deck rules, as a list of what is wrong (empty = legal): exactly 40
 * cards; 16 or 17 lands; no nonbasic card more often than the pool holds it;
 * every spell castable in the two colours plus the splash; a splash is one
 * colour, at most `maxSplash` cards, each needing at most one pip of it.
 */
export function checkDeck(d: DeckCheckInput, pool: LabCard[], byName: Map<string, LabCard>, maxSplash: number): string[] {
  const errs: string[] = [];
  const total = d.main.reduce((s, [n]) => s + n, 0);
  if (total !== DECK_SIZE) errs.push(`${total} cards, not ${DECK_SIZE}`);
  const basicNames = new Set(Object.values(BASIC_OF));
  const have = countNames(pool);
  let lands = 0;
  let splashN = 0;
  if (d.colors.length !== 2) errs.push(`main colours "${d.colors}" are not two colours`);
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
  if (lands < 16 || lands > 17) errs.push(`${lands} lands, not 16-17`);
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
