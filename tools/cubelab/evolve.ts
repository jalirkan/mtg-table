// mtg-table — the cube lab: `evolve`, the pure half — from a generation's run to its swaps.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The evolve loop (D299, D300) plays N drafts of a cube, reads what happened
// (meta.ts's buildMeta, plus who took each card first), and proposes at most
// `swaps` swaps of a cube card for a card of the seed pool.  This module is
// every decision of that loop and nothing else: no engine, no file system.
//
// A CUT needs evidence that passes a test twice (D331), or a note.  Each rule is
// a one-sided exact binomial test of the card against a null boundary:
//
//   dead           H0: of the drafters' pools whose played deck could cast it
//                  (its colours within the deck's, splash included), at least
//                  deadPlayRateHi played it.  Tested once it sat in minOnColour
//                  such pools (a gold card of a pair nobody drafts is not dead:
//                  it never had the chance);
//   dominant-win   H0: its win rate over decisive games in played decks is at
//                  most the run's mean.  Its games come in clumps (one deck,
//                  one opponent, ~2.4 games a match), so the counts are divided
//                  by the generation's design effect first (evolve-stats.ts).
//                  Tested once it played minGames games; a rejection counts only
//                  when its rate is at least dominantMargin over the mean;
//   dominant-pick  H0: the share of its grids in which it went in the FIRST line
//                  taken is at most dominantFirstPickLo (tested once dealt in
//                  minSeen drafts); counts only when its shrunk win rate is at
//                  least the mean (a card everyone grabs that also wins);
//   note           cubes/<cube>-notes.tsv says `cut` (Justin's real games).
//
// DISCOVERY: every test a cut could follow from (the cards no rule below
// protects) is one family, and Benjamini–Hochberg at fdrQ decides which pass --
// about 180 cards are looked at, so a per-card 95% test would flag several by
// chance every generation.  Only the generation's own drafts count: nothing is
// pooled across generations, so a card is never re-tested on data it was
// already tested on.  A discovery is a CANDIDATE.
//
// CONFIRMATION: the candidates are tested again, the same rule, on a batch of
// fresh drafts with a disjoint seed range (sized by confirmPlan for the effect
// that matters, at power confirmPower), with Holm at confirmAlpha across the
// candidates.  Only a confirmed candidate is cut.

// A lead that does not pass is `watch` ("insufficient data"), with an estimate
// of the drafts per generation it would take to discover.  Never cut:
//
//   - a card the notes file says `keep`;
//   - an AI-LIMITED card (Forge's AI:RemoveDeck All or Random, the pool's
//     forge_ai_flag) on AI evidence: its numbers are reported apart, marked
//     AI-limited, and only a note can cut it;
//   - a LAND on AI evidence (`builder-limited`; a note decides): the lab's
//     deckbuilder plays a dual or a fetchland only in its own pair's decks and
//     a land that makes fewer than two colours (Mutavault) never, so a land's
//     deck rate and win rate measure its pair, not the land;
//   - a card whose RATING is under deadMinRating on deck-rate evidence
//     (`rating-limited`): the drafters pick by rating, so a low-rated card that
//     is never played may be weak or may be underrated, and the data cannot
//     tell which — raise its rating in the cube's ratings TSV to test it.
//
// An ADD comes from the pool: supported by Forge, not in the cube, at most two
// colours, rated at least deadMinRating (a card the drafters undervalue would
// only come back as rating-limited), never cut by an earlier generation or a note, and never an
// AI:RemoveDeck:All card (the AI cannot evaluate it) unless the notes say
// `try`; those are listed as HUMAN-TEST candidates instead.  Candidates are
// ranked by fit with the card they replace — the same colour class, shared
// themes and roles, mana value, rating (for a dominant cut, rating up to a
// ceiling below the cut's) — plus how much they help the weakest archetypes
// (themes and colours whose shrunk win rate is below the mean), and the best
// one that keeps every constraint wins:
//
//   exactly `size` cards, singleton; each colour's nonland count within
//   colourSlack of its target (the starting cube's); the land count exactly the
//   target; fixing (lands and nonland cards that make two or more colours) at
//   least the target; every colour pair keeps min(minSignposts, its starting
//   count) gold signposts.  A swap may never add a violation the cube did not
//   already have.
//
// Every number is a knob in EVOLVE_DEFAULTS (`--evolve name=value`), recorded in
// <out>/evolve.json and documented in docs/guides/cube-lab.md's *Evolve*.

import type { Fact } from './cards.ts';
import { producesOf } from './cards.ts';
import type { Cube, CubeCard } from './cube.ts';
import { sectionFor } from './cubedoc.ts';
import { SHRINK_K } from './meta.ts';
import { initialRating } from './ratings.ts';
import { benjaminiHochberg, binomLower, binomUpper, designEffect, holm, requiredN, type DeckGames } from './evolve-stats.ts';
import { playedDeck, wilson, type CardInfo } from './report.ts';
import type { DraftRecord } from './run.ts';

export interface EvolveKnobs {
  swaps: number;
  minSeen: number;
  minGames: number;
  minOnColour: number;
  deadPlayRateHi: number;
  deadMinRating: number;
  dominantMargin: number;
  dominantFirstPickLo: number;
  fdrQ: number;
  confirmAlpha: number;
  confirmPower: number;
  dominantEffect: number;
  deadEffect: number;
  pickEffect: number;
  confirmMinDrafts: number;
  confirmMaxDrafts: number;
  confirmSeedOffset: number;
  watchWinMargin: number;
  colourSlack: number;
  minSignposts: number;
  fitSameClass: number;
  fitTheme: number;
  fitRole: number;
  fitMv: number;
  fitRating: number;
  fitBalance: number;
  fitTry: number;
  dominantReplaceRatio: number;
  humanTest: number;
}

export const EVOLVE_DEFAULTS: EvolveKnobs = {
  swaps: 6,
  minSeen: 15,
  minGames: 20,
  minOnColour: 8,
  deadPlayRateHi: 0.35,
  deadMinRating: 60,
  dominantMargin: 0.05,
  dominantFirstPickLo: 0.75,
  fdrQ: 0.1,
  confirmAlpha: 0.05,
  confirmPower: 0.8,
  dominantEffect: 0.1,
  deadEffect: 0.1,
  pickEffect: 0.9,
  confirmMinDrafts: 20,
  confirmMaxDrafts: 300,
  confirmSeedOffset: 1000000,
  watchWinMargin: 0.12,
  colourSlack: 2,
  minSignposts: 2,
  fitSameClass: 4,
  fitTheme: 3,
  fitRole: 2,
  fitMv: 1,
  fitRating: 4,
  fitBalance: 3,
  fitTry: 20,
  dominantReplaceRatio: 0.9,
  humanTest: 10,
};

export function mergeKnobs(base: EvolveKnobs, args: string[]): EvolveKnobs {
  const out: EvolveKnobs = { ...base };
  for (const a of args) {
    const m = /^([A-Za-z]+)=(-?[\d.]+)$/.exec(a);
    if (!m) throw new Error(`--evolve wants name=value, got "${a}"`);
    const k = m[1] as keyof EvolveKnobs;
    if (!(k in base)) throw new Error(`--evolve: unknown knob ${k} (known: ${Object.keys(base).join(', ')})`);
    out[k] = Number(m[2]);
  }
  return out;
}

// ------------------------------------------------------------------ the pool

export type AiFlag = 'All' | 'Random' | 'none';

export interface PoolCard {
  name: string;
  /** Colours, WUBRG order ('' colourless; a land is ''). */
  colors: string;
  type: string;
  mv: number;
  themes: string[];
  roles: string[];
  sources: string[];
  supported: boolean;
  aiFlag: AiFlag;
  land: boolean;
  /** Makes or fetches two or more colours (a dual, a fetchland, Birds, a Prism). */
  fixing: boolean;
  rating: number;
}

const wubrg = (s: string): string => [...new Set(s)].filter((c) => 'WUBRG'.includes(c)).sort((a, b) => 'WUBRG'.indexOf(a) - 'WUBRG'.indexOf(b)).join('');

/** omega-seed-pool.tsv: name, colour_identity, type, mana_value, theme_tags, sources, forge_supported, forge_ai_flag, …  */
export function parsePool(text: string, unrated = 40): PoolCard[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  const head = (lines.shift() ?? '').split('\t');
  const col = (n: string): number => {
    const i = head.indexOf(n);
    if (i < 0) throw new Error(`pool: no ${n} column (have ${head.join(', ')})`);
    return i;
  };
  const [cName, cId, cType, cMv, cTags, cSrc, cSup, cAi] = ['name', 'colour_identity', 'type', 'mana_value', 'theme_tags', 'sources', 'forge_supported', 'forge_ai_flag'].map(col) as number[];
  return lines.map((l) => {
    const f = l.split('\t');
    const tags = (f[cTags as number] ?? '').split(/\s+/).filter(Boolean);
    const type = f[cType as number] ?? '';
    const land = /\bLand\b/.test(type) && !/Creature/.test(type.split('Land')[0] ?? '');
    const themes = tags.filter((t) => /^[A-Z]{2,6}$/.test(t));
    const ai = f[cAi as number] ?? 'none';
    const ident = wubrg(f[cId as number] ?? '');
    return {
      name: f[cName as number] ?? '',
      colors: land ? '' : ident,
      type,
      mv: Number(f[cMv as number] ?? 0) || 0,
      themes,
      roles: tags.filter((t) => /^[a-z][a-z-]*$/.test(t)),
      sources: (f[cSrc as number] ?? '').split(/\s+/).filter(Boolean),
      supported: (f[cSup as number] ?? '') === 'yes',
      aiFlag: ai === 'All' || ai === 'Random' ? ai : 'none',
      land,
      // Without the engine's facts: a two-colour land, or a fetchland by its tags.
      fixing: land && (ident.length >= 2 || (themes.includes('LND') && themes.includes('GY'))),
      rating: unrated,
    } satisfies PoolCard;
  }).filter((c) => c.name);
}

/** The engine's facts win over the TSV: printed colours, mana value, what it makes, Forge's rank and AI flags. */
export function enrichPool(pool: PoolCard[], facts: Fact[], unrated: number): PoolCard[] {
  const by = new Map<string, Fact>();
  for (const f of facts) { by.set(f.listed, f); if (f.name) by.set(f.name, f); }
  return pool.map((c) => {
    const f = by.get(c.name);
    if (!f || !f.found) return { ...c, supported: false };
    const land = !!f.land;
    const produces = producesOf(f);
    const aiFlag: AiFlag = f.remAIDeck ? 'All' : f.remRandomDeck ? 'Random' : c.aiFlag;
    return {
      ...c, colors: land ? '' : wubrg(f.colors ?? c.colors), mv: land ? 0 : (f.cmc ?? c.mv), land,
      fixing: produces.length >= 2, rating: initialRating(f, unrated).rating, aiFlag,
    };
  });
}

// ------------------------------------------------------------------ notes

export type Verdict = 'keep' | 'cut' | 'try';
export interface Note { card: string; verdict: Verdict; note: string }

/** cubes/<cube>-notes.tsv: `card<TAB>verdict<TAB>note`, verdict keep | cut | try; `#` comments; a `card` header row is skipped. */
export function parseNotes(text: string): Map<string, Note> {
  const out = new Map<string, Note>();
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim() || line.startsWith('#')) return;
    const [card, verdict, ...rest] = line.split('\t');
    if (card === 'card' && verdict === 'verdict') return;
    if (!card || !['keep', 'cut', 'try'].includes(verdict ?? '')) throw new Error(`notes line ${i + 1}: want card<TAB>keep|cut|try<TAB>note, got "${line}"`);
    out.set(card.trim(), { card: card.trim(), verdict: verdict as Verdict, note: rest.join('\t').trim() });
  });
  return out;
}

// ------------------------------------------------------------------ the cube, as the loop sees it

export interface EvolveCard extends CubeCard {
  colors: string;
  mv: number;
  land: boolean;
  fixing: boolean;
  aiFlag: AiFlag;
  rating: number;
}

export function evolveCards(cube: Cube, pool: Map<string, PoolCard>): EvolveCard[] {
  const SEC: Record<string, string> = { White: 'W', Blue: 'U', Black: 'B', Red: 'R', Green: 'G' };
  return cube.cards.map((c) => {
    const p = pool.get(c.name);
    const land = p?.land ?? /land/i.test(c.section);
    return {
      ...c,
      colors: p?.colors ?? (c.pair ?? SEC[c.section] ?? ''),
      mv: p?.mv ?? 0, land, fixing: p?.fixing ?? false, aiFlag: p?.aiFlag ?? 'none', rating: p?.rating ?? 40,
    };
  });
}

/** W, U, B, R, G for a mono card; `WU` for gold; C colourless; L land. */
export function colourClass(c: { colors: string; land: boolean }): string {
  return c.land ? 'L' : c.colors === '' ? 'C' : c.colors;
}

// ------------------------------------------------------------------ constraints

export interface Constraints {
  size: number;
  colourTarget: Record<string, number>;
  colourSlack: number;
  lands: number;
  fixingMin: number;
  /** Gold cards each colour pair must keep. */
  pairMin: Record<string, number>;
}

const PAIRS = ['WU', 'WB', 'WR', 'WG', 'UB', 'UR', 'UG', 'BR', 'BG', 'RG'];

function counts(cards: EvolveCard[]): { colour: Record<string, number>; lands: number; fixing: number; pairs: Record<string, number> } {
  const colour: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const pairs: Record<string, number> = Object.fromEntries(PAIRS.map((p) => [p, 0]));
  let lands = 0, fixing = 0;
  for (const c of cards) {
    if (c.land) lands++;
    if (c.fixing) fixing++;
    if (!c.land) for (const k of c.colors) colour[k] = (colour[k] ?? 0) + 1;
    if (!c.land && c.colors.length === 2) pairs[c.colors] = (pairs[c.colors] ?? 0) + 1;
  }
  return { colour, lands, fixing, pairs };
}

export function constraintsOf(start: EvolveCard[], k: EvolveKnobs): Constraints {
  const n = counts(start);
  return {
    size: start.length, colourTarget: n.colour, colourSlack: k.colourSlack, lands: n.lands, fixingMin: n.fixing,
    pairMin: Object.fromEntries(PAIRS.map((p) => [p, Math.min(k.minSignposts, n.pairs[p] ?? 0)])),
  };
}

/** What the list breaks, one line each (empty = it keeps every constraint). */
export function violations(cards: EvolveCard[], c: Constraints): string[] {
  const out: string[] = [];
  if (cards.length !== c.size) out.push(`size ${cards.length}, want ${c.size}`);
  const seen = new Set<string>();
  for (const x of cards) { if (seen.has(x.name)) out.push(`twice: ${x.name}`); seen.add(x.name); }
  const n = counts(cards);
  for (const [k, t] of Object.entries(c.colourTarget)) {
    const v = n.colour[k] ?? 0;
    if (Math.abs(v - t) > c.colourSlack) out.push(`colour ${k}: ${v}, want ${t} ± ${c.colourSlack}`);
  }
  if (n.lands !== c.lands) out.push(`lands ${n.lands}, want ${c.lands}`);
  if (n.fixing < c.fixingMin) out.push(`fixing ${n.fixing}, want at least ${c.fixingMin}`);
  for (const [p, min] of Object.entries(c.pairMin)) if ((n.pairs[p] ?? 0) < min) out.push(`pair ${p}: ${n.pairs[p] ?? 0} gold, want at least ${min}`);
  return out;
}

// ------------------------------------------------------------------ the statistics

/** buildMeta's card entry (schema 1). */
interface MetaCard { picked: number; seen: number; pickRate: number; inDecks: number; inclusionRate: number; games: number; wins: number; winRate: number; winRateShrunk: number; ci: [number, number] }
interface MetaArchetype { id: string; colors: string; primaryTheme: string; decks: number; games: number; winRate: number }
export interface MetaDoc { sample: { drafts: number; games: number; seedRange: [number, number]; shrinkage: { mean: number } }; cards: Record<string, MetaCard>; archetypes: MetaArchetype[] }

export interface CardStat {
  name: string;
  seen: number;
  picked: number;
  pickRate: number;
  /** Grids in which it went in the first line taken. */
  firstTakes: number;
  firstPickRate: number;
  inDecks: number;
  /** Played decks per draft dealt in. */
  deckRate: number;
  /** Times it sat in a pool whose played deck could cast it, and how many of those decks played it. */
  onColour: number;
  onColourDecks: number;
  games: number;
  wins: number;
  winRate: number;
  shrunk: number;
  ci: [number, number];
}

/** For each card, how often it went in the first line taken from its grid (grid drafts only). */
export function firstTakes(recs: DraftRecord[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const rec of recs) {
    if (rec.format !== 'grid') continue;
    const byGrid = new Map<number, Array<{ seen: number; seat: number; took: string[] }>>();
    rec.drafters.forEach((dr, seat) => {
      for (const p of dr.picks) if (p.kind === 'grid') byGrid.set(p.at, [...(byGrid.get(p.at) ?? []), { seen: p.seen.length, seat, took: p.took }]);
    });
    for (const takes of byGrid.values()) {
      const first = [...takes].sort((a, b) => b.seen - a.seen || a.seat - b.seat)[0];
      for (const n of first?.took ?? []) out.set(n, (out.get(n) ?? 0) + 1);
    }
  }
  return out;
}

/**
 * Every card's numbers.  meta.json counts a card's decks and games over a played
 * deck's NONLAND cards (its pairs and key cards are about spells), so a land
 * would read as never played; with `info` (cards.json), a land's decks, games
 * and wins are counted from the played decks' full lists instead.
 */
export function cardStats(meta: MetaDoc, recs: DraftRecord[], info?: Record<string, CardInfo>): Map<string, CardStat> {
  const ft = firstTakes(recs);
  const lands = new Map<string, { decks: number; games: number; wins: number }>();
  const onCol = new Map<string, { pools: number; decks: number }>();
  if (info) {
    for (const rec of recs) for (const k of [0, 1] as const) {
      const me = k === 0 ? 'A' : 'B';
      const decisive = rec.match.games.filter((g) => g.winner !== 'draw');
      const won = decisive.filter((g) => g.winner === me).length;
      const pd = playedDeck(rec, k, info);
      const main = new Set(pd.main.map(([, n]) => n));
      const cols = `${pd.key}${pd.splash ?? ''}`;
      for (const name of new Set(rec.drafters[k].pool)) {
        const i = info[name];
        if (!i || i.land || ![...i.colors].every((c) => cols.includes(c))) continue;
        const o = onCol.get(name) ?? { pools: 0, decks: 0 };
        o.pools++;
        if (main.has(name)) o.decks++;
        onCol.set(name, o);
      }
      for (const name of main) {
        if (!info[name]?.land) continue;
        const o = lands.get(name) ?? { decks: 0, games: 0, wins: 0 };
        o.decks++; o.games += decisive.length; o.wins += won;
        lands.set(name, o);
      }
    }
  }
  const m = meta.sample.shrinkage.mean;
  const out = new Map<string, CardStat>();
  for (const [name, c0] of Object.entries(meta.cards)) {
    let c = c0;
    if (info?.[name]?.land) {
      const o = lands.get(name) ?? { decks: 0, games: 0, wins: 0 };
      const w = wilson(o.wins, o.games);
      c = { ...c0, inDecks: o.decks, games: o.games, wins: o.wins, winRate: o.games ? o.wins / o.games : 0,
        winRateShrunk: (o.wins + SHRINK_K * m) / (o.games + SHRINK_K), ci: [w.lo ?? 0, w.hi ?? 1] };
    }
    const f = ft.get(name) ?? 0;
    out.set(name, {
      name, seen: c.seen, picked: c.picked, pickRate: c.pickRate, firstTakes: f, firstPickRate: c.seen ? f / c.seen : 0,
      inDecks: c.inDecks, deckRate: c.seen ? c.inDecks / c.seen : 0,
      onColour: onCol.get(name)?.pools ?? 0, onColourDecks: onCol.get(name)?.decks ?? 0, games: c.games, wins: c.wins, winRate: c.winRate,
      shrunk: c.winRateShrunk, ci: c.ci,
    });
  }
  return out;
}

/** Each played deck's decisive games and wins (two a draft), for the design effect of a card's win rate. */
export function deckGamesOf(recs: DraftRecord[]): DeckGames[] {
  const out: DeckGames[] = [];
  for (const rec of recs) {
    const decisive = rec.match.games.filter((g) => g.winner === 'A' || g.winner === 'B');
    if (!decisive.length) continue;
    const a = decisive.filter((g) => g.winner === 'A').length;
    out.push({ games: decisive.length, wins: a }, { games: decisive.length, wins: decisive.length - a });
  }
  return out;
}

/** The design effect of a batch's card win rates (evolve-stats.ts's designEffect over its played decks). */
export const batchDeff = (recs: DraftRecord[]): number => designEffect(deckGamesOf(recs));

export interface Group { key: string; decks: number; games: number; wins: number; rate: number; shrunk: number; ci: [number, number] }
export interface Balance { mean: number; colours: Group[]; pairs: Group[]; themes: Group[] }

/** Win rates by colour, by pair and by primary theme, from meta.json's archetypes. */
export function balanceOf(meta: MetaDoc): Balance {
  const m = meta.sample.shrinkage.mean;
  const acc = (keyOf: (a: MetaArchetype) => string[]): Group[] => {
    const t = new Map<string, { decks: number; games: number; wins: number }>();
    for (const a of meta.archetypes) for (const k of keyOf(a)) {
      const g = t.get(k) ?? { decks: 0, games: 0, wins: 0 };
      g.decks += a.decks; g.games += a.games; g.wins += Math.round(a.winRate * a.games);
      t.set(k, g);
    }
    return [...t.entries()].map(([key, g]) => {
      const w = wilson(g.wins, g.games);
      return { key, ...g, rate: g.games ? g.wins / g.games : 0, shrunk: (g.wins + SHRINK_K * m) / (g.games + SHRINK_K), ci: [w.lo ?? 0, w.hi ?? 1] as [number, number] };
    }).sort((a, b) => b.decks - a.decks || (a.key < b.key ? -1 : 1));
  };
  return {
    mean: m,
    colours: acc((a) => [...a.colors].filter((c) => 'WUBRG'.includes(c))),
    pairs: acc((a) => [a.colors]),
    themes: acc((a) => (a.primaryTheme && a.primaryTheme !== 'none' ? [a.primaryTheme] : [])),
  };
}

/** 0..1: how far a group's shrunk win rate sits below the mean (a tenth below is 1). */
function needOf(groups: Group[], mean: number): Map<string, number> {
  return new Map(groups.filter((g) => g.games > 0).map((g) => [g.key, Math.max(0, Math.min(1, (mean - g.shrunk) / 0.1))]));
}

// ------------------------------------------------------------------ the tests

/** The three rules a card can be cut on from AI evidence. */
export type Rule = 'dominant-win' | 'dominant-pick' | 'dead';
export const RULES: Rule[] = ['dominant-win', 'dominant-pick', 'dead'];

/** One rule's one-sided exact binomial test of one card. */
export interface RuleTest {
  rule: Rule;
  /** Observations and successes (games and wins, grids dealt and first-line takes, on-colour pools and plays). */
  n: number;
  x: number;
  /** x / n. */
  rate: number;
  /** The null's boundary: the mean (win), dominantFirstPickLo (pick), deadPlayRateHi (dead). */
  p0: number;
  /** The design effect the counts were divided by (games only; 1 otherwise). */
  deff: number;
  /** P(a result at least this extreme | the boundary). */
  p: number;
}

/** A rule's test of a card's numbers; `gate` false skips the minimum-sample check (confirmation tests at any size). */
export function ruleTest(rule: Rule, card: { land: boolean }, s: CardStat, mean: number, deff: number, k: EvolveKnobs, gate = true): RuleTest | null {
  const d = Math.max(1, deff);
  if (rule === 'dominant-win') {
    if (s.games === 0 || (gate && s.games < k.minGames)) return null;
    return { rule, n: s.games, x: s.wins, rate: s.wins / s.games, p0: mean, deff: d, p: binomUpper(s.wins / d, s.games / d, mean) };
  }
  if (rule === 'dominant-pick') {
    if (s.seen === 0 || (gate && s.seen < k.minSeen)) return null;
    return { rule, n: s.seen, x: s.firstTakes, rate: s.firstTakes / s.seen, p0: k.dominantFirstPickLo, deff: 1, p: binomUpper(s.firstTakes, s.seen, k.dominantFirstPickLo) };
  }
  if (card.land || s.onColour === 0 || (gate && s.onColour < k.minOnColour)) return null;
  return { rule, n: s.onColour, x: s.onColourDecks, rate: s.onColourDecks / s.onColour, p0: k.deadPlayRateHi, deff: 1, p: binomLower(s.onColourDecks, s.onColour, k.deadPlayRateHi) };
}

/** The size filter a significant test must also pass: a dominant card wins dominantMargin over the mean; a first-pick card wins at least the mean. */
export function passesSize(t: RuleTest, s: CardStat, mean: number, k: EvolveKnobs): boolean {
  if (t.rule === 'dominant-win') return t.rate >= mean + k.dominantMargin;
  if (t.rule === 'dominant-pick') return s.shrunk >= mean;
  return true;
}

/** Wilson's interval with the counts divided by a design effect (the interval a clumped win rate deserves). */
export function clusteredCi(wins: number, games: number, deff: number): [number, number] {
  const d = Math.max(1, deff);
  const w = wilson(wins / d, games / d);
  return [w.lo ?? 0, w.hi ?? 1];
}

/** Can a cut follow from this rule's evidence on this card?  Only those tests are the discovery family. */
export function cuttable(card: EvolveCard, note: Note | undefined, rule: Rule, k: EvolveKnobs): boolean {
  if (note || card.aiFlag !== 'none' || card.land) return false;
  return rule !== 'dead' || card.rating >= k.deadMinRating;
}

export interface Discovery {
  /** The tests a cut could follow from (one BH family). */
  family: number;
  q: number;
  /** BH's p-value cutoff (0: no discovery). */
  cutoff: number;
  /** The design effect of this batch's games. */
  deff: number;
  /** `${card}|${rule}` -> its test and BH q-value, for every test of the family. */
  tests: Map<string, RuleTest & { qValue: number; reject: boolean }>;
  /** Tests outside the family (AI-limited, lands, noted, low-rated), for the report only. */
  outside: Map<string, RuleTest>;
}

/** Discovery: every card's tests on this batch, and BH over the ones a cut could follow from. */
export function discover(cards: EvolveCard[], stats: Map<string, CardStat>, mean: number, deff: number, notes: Map<string, Note>, k: EvolveKnobs): Discovery {
  const fam: Array<{ key: string; t: RuleTest }> = [];
  const outside = new Map<string, RuleTest>();
  for (const c of cards) {
    const s = stats.get(c.name);
    if (!s || s.seen === 0) continue;
    for (const rule of RULES) {
      const t = ruleTest(rule, c, s, mean, deff, k);
      if (!t) continue;
      if (cuttable(c, notes.get(c.name), rule, k)) fam.push({ key: `${c.name}|${rule}`, t });
      else outside.set(`${c.name}|${rule}`, t);
    }
  }
  const bh = benjaminiHochberg(fam.map((f) => f.t.p), k.fdrQ);
  const tests = new Map(fam.map((f, i) => [f.key, { ...f.t, qValue: bh.q[i] as number, reject: bh.reject[i] as boolean }]));
  return { family: fam.length, q: k.fdrQ, cutoff: bh.cutoff, deff, tests, outside };
}

/** Would a test outside the family have been a discovery?  Its p at or under the family's cutoff, or under the lone-test BH bar. */
function wouldPass(t: RuleTest, d: Discovery): boolean {
  return t.p <= Math.max(d.cutoff, d.q / (d.family + 1));
}

// ------------------------------------------------------------------ assessing a card

export type Status = 'note-cut' | 'note-keep' | 'dominant-win' | 'dominant-pick' | 'dead' | 'watch' | 'ai-limited' | 'builder-limited' | 'rating-limited' | 'ok' | 'no-data';

export interface Assessment {
  name: string;
  /** dominant-win / dominant-pick / dead: a discovery, i.e. a CANDIDATE -- cut only once confirmed (Decision.confirmations). */
  status: Status;
  /** What the AI evidence alone would say (for an AI-limited or noted card too). */
  signal: 'dead' | 'dominant-win' | 'dominant-pick' | 'lean-dead' | 'lean-dominant' | 'none';
  evidence: string;
  aiFlag: AiFlag;
  note?: string;
  /** The discovery test behind the signal, with its BH q-value when it was in the family. */
  test?: RuleTest & { qValue?: number };
  /** For a watch: drafts per generation that would likely make it a discovery (null = not reachable). */
  draftsNeeded?: number | null;
  /** How strong the case is (sorts the cuts). */
  strength: number;
}

const pct = (x: number): string => x.toFixed(2);
const pv = (p: number): string => (p < 0.001 ? p.toExponential(1) : p.toFixed(3));

/** The smallest n at which Wilson's bound for a steady rate p crosses `target` (upper bound <= target when below, lower >= target when above). */
export function sampleToSettle(p: number, target: number, below: boolean, cap = 20000): number | null {
  if (below ? p >= target : p <= target) return null;
  for (let n = 1; n <= cap; n = n < 50 ? n + 1 : Math.ceil(n * 1.02)) {
    const w = wilson(Math.round(p * n), n);
    if (below ? (w.hi ?? 1) <= target : (w.lo ?? 0) >= target) return n;
  }
  return null;
}

/** "p 2.1e-5, q 0.004" for a test (q only when it was in the family). */
export function testWords(t: RuleTest & { qValue?: number }): string {
  return `p ${pv(t.p)}${t.qValue !== undefined ? `, q ${pv(t.qValue)}` : ''}`;
}

export function assess(card: EvolveCard, s: CardStat | undefined, mean: number, drafts: number, note: Note | undefined, k: EvolveKnobs, disc?: Discovery): Assessment {
  const base = { name: card.name, aiFlag: card.aiFlag, ...(note ? { note: note.note } : {}) };
  if (!s || s.seen === 0) {
    const st: Status = note?.verdict === 'cut' ? 'note-cut' : note?.verdict === 'keep' ? 'note-keep' : 'no-data';
    return { ...base, status: st, signal: 'none', evidence: 'never dealt', strength: st === 'note-cut' ? 100 : 0 };
  }
  const d = disc ?? discover([card], new Map([[card.name, s]]), mean, 1, note ? new Map([[card.name, note]]) : new Map(), k);
  const deff = d.deff;
  const play = wilson(s.onColourDecks, s.onColour);
  const playRate = s.onColour ? s.onColourDecks / s.onColour : 0;
  const ci = clusteredCi(s.wins, s.games, deff);
  const ev = `dealt ${s.seen}, picked ${s.picked}, first line ${s.firstTakes}, in ${s.inDecks} deck(s); `
    + (card.land ? '' : s.onColour ? `on colour in ${s.onColour} pool(s), played in ${s.onColourDecks} (${pct(playRate)}, CI ${pct(play.lo ?? 0)}–${pct(play.hi ?? 1)}); ` : 'never in a pool whose deck could cast it; ')
    + (s.games ? `won ${s.wins} of ${s.games} decisive games (${pct(s.winRate)}, CI ${pct(ci[0])}–${pct(ci[1])} by deck${deff > 1.005 ? `, design effect ${deff.toFixed(2)}` : ''}, shrunk ${pct(s.shrunk)}) vs mean ${pct(mean)}` : 'no decisive games in a deck');
  // What the AI evidence says: the first rule whose test is a discovery and passes its size filter.
  let signal: Assessment['signal'] = 'none';
  let strength = 0;
  let test: Assessment['test'];
  let draftsNeeded: number | null | undefined;
  for (const rule of RULES) {
    const key = `${card.name}|${rule}`;
    const inFam = d.tests.get(key);
    const t = inFam ?? d.outside.get(key);
    if (!t) continue;
    const hit = inFam ? inFam.reject : wouldPass(t, d);
    if (hit && passesSize(t, s, mean, k)) {
      signal = rule;
      test = inFam ? { ...t, qValue: inFam.qValue } : t;
      // Strength sorts cuts within a rule: the smaller the p, the stronger.
      strength = { 'dominant-win': 10, 'dominant-pick': 5, dead: 1 }[rule] + Math.min(4, -Math.log10(Math.max(t.p, 1e-300)) / 10);
      break;
    }
  }
  // A lead that is not (yet) a discovery: the drafts a generation would need for it to pass BH's bar for one discovery.
  const alphaOne = k.fdrQ / Math.max(1, d.family);
  if (signal === 'none' && s.games > 0 && s.winRate >= mean + k.watchWinMargin) {
    signal = 'lean-dominant';
    const perDraft = s.games / Math.max(1, drafts);
    const n = requiredN(mean, Math.min(0.999, s.winRate), alphaOne, 0.5) * Math.max(1, deff);
    draftsNeeded = !Number.isFinite(n) || perDraft === 0 ? null : Math.max(Math.ceil(Math.max(n, k.minGames) / perDraft), drafts + 1);
  } else if (signal === 'none' && !card.land && s.onColour > 0 && playRate <= k.deadPlayRateHi) {
    signal = 'lean-dead';
    const perDraft = s.onColour / Math.max(1, drafts);
    const n = requiredN(k.deadPlayRateHi, Math.max(playRate, 0.001), alphaOne, 0.5);
    draftsNeeded = !Number.isFinite(n) ? null : Math.max(Math.ceil(Math.max(n, k.minOnColour) / perDraft), drafts + 1);
  }
  const evidence = test ? `${ev}; ${test.rule} ${testWords(test)}` : ev;
  const out: Assessment = { ...base, status: 'ok', signal, evidence, strength, ...(test ? { test } : {}), ...(draftsNeeded !== undefined ? { draftsNeeded } : {}) };
  if (note?.verdict === 'cut') return { ...out, status: 'note-cut', strength: 100 };
  if (note?.verdict === 'keep' || note?.verdict === 'try') return { ...out, status: 'note-keep', strength: 0 };
  if (card.aiFlag !== 'none') return { ...out, status: 'ai-limited', strength: 0 };
  // A land's decks, games and wins are its pair's: it goes by a note only.
  if (card.land) return { ...out, status: 'builder-limited', strength: 0 };
  if ((signal === 'dead' || signal === 'lean-dead') && card.rating < k.deadMinRating) {
    const { draftsNeeded: _dn, ...rest } = out;
    return { ...rest, signal: 'dead', status: 'rating-limited', strength: 0, evidence: `${evidence}; rated ${card.rating}, under ${k.deadMinRating}` };
  }
  if (signal === 'dominant-win' || signal === 'dominant-pick' || signal === 'dead') return { ...out, status: signal };
  if (signal === 'lean-dead' || signal === 'lean-dominant') return { ...out, status: 'watch', strength: 0 };
  return out;
}

// ------------------------------------------------------------------ confirmation

export interface ConfirmNeed {
  name: string;
  rule: Rule;
  /** Drafts the confirmation batch needs for this candidate (null: not reachable at any size). */
  drafts: number | null;
}

export interface ConfirmPlan {
  /** Drafts in the confirmation batch: the largest candidate's need, within confirmMinDrafts..confirmMaxDrafts (0: no candidate). */
  drafts: number;
  /** Each candidate's need: observations for power confirmPower at the effect that matters, at Holm's first-step level. */
  needs: ConfirmNeed[];
  /** Candidates whose need is over confirmMaxDrafts: tested anyway, with less power. */
  underpowered: string[];
}

/**
 * The confirmation batch's size.  Each candidate's rule is tested again at
 * confirmAlpha / (candidates) (Holm's strictest step), and must be found with
 * power confirmPower when the card is as far from the null as matters:
 * dominant-win at mean + dominantEffect, dominant-pick at pickEffect, dead at
 * deadEffect.  Observations per draft come from the discovery batch (games,
 * grids dealt, on-colour pools); a card's games are counted at the design
 * effect.  The effect is the knob's, never the discovery's estimate, which is
 * biased upward by having been selected.
 */
export function confirmPlan(candidates: Assessment[], stats: Map<string, CardStat>, drafts: number, mean: number, deff: number, k: EvolveKnobs): ConfirmPlan {
  const cands = candidates.filter((a) => a.status === 'dominant-win' || a.status === 'dominant-pick' || a.status === 'dead');
  if (!cands.length) return { drafts: 0, needs: [], underpowered: [] };
  const alpha = k.confirmAlpha / cands.length;
  const needs = cands.map((a): ConfirmNeed => {
    const rule = a.status as Rule;
    const s = stats.get(a.name) as CardStat;
    const [p0, p1, perDraft, d] = rule === 'dominant-win' ? [mean, Math.min(0.99, mean + k.dominantEffect), s.games / Math.max(1, drafts), Math.max(1, deff)]
      : rule === 'dominant-pick' ? [k.dominantFirstPickLo, k.pickEffect, s.seen / Math.max(1, drafts), 1]
        : [k.deadPlayRateHi, k.deadEffect, s.onColour / Math.max(1, drafts), 1];
    const n = requiredN(p0, p1, alpha, k.confirmPower) * d;
    return { name: a.name, rule, drafts: !Number.isFinite(n) || perDraft === 0 ? null : Math.ceil(n / perDraft) };
  });
  const most = Math.max(...needs.map((x) => x.drafts ?? Infinity));
  return {
    drafts: Math.max(k.confirmMinDrafts, Math.min(k.confirmMaxDrafts, most)),
    needs,
    underpowered: needs.filter((x) => x.drafts === null || x.drafts > k.confirmMaxDrafts).map((x) => x.name),
  };
}

/** The confirmation batch as the decision reads it: its own stats, mean and design effect, never pooled with discovery. */
export interface ConfirmInput {
  stats: Map<string, CardStat>;
  mean: number;
  deff: number;
  drafts: number;
  seeds: [number, number];
  games: number;
}

export interface Confirmation {
  name: string;
  rule: Rule;
  discovery: RuleTest & { qValue?: number };
  /** The same test on the fresh seeds (null: no batch, or the card was never dealt there). */
  confirm: RuleTest | null;
  /** Holm-adjusted p of the confirmation test. */
  holmP: number | null;
  confirmed: boolean;
  /** Why not, in words, when not. */
  reason: string;
}

/** Each candidate's rule on the fresh batch; Holm at confirmAlpha across them; the size filter again. */
export function confirmCandidates(candidates: Assessment[], cards: EvolveCard[], c: ConfirmInput | undefined, k: EvolveKnobs): Confirmation[] {
  const byName = new Map(cards.map((x) => [x.name, x]));
  const cands = candidates.filter((a) => a.test && (a.status === 'dominant-win' || a.status === 'dominant-pick' || a.status === 'dead'));
  const tests = cands.map((a) => {
    const s = c?.stats.get(a.name);
    return c && s && s.seen > 0 ? ruleTest(a.status as Rule, byName.get(a.name) as EvolveCard, s, c.mean, c.deff, k, false) : null;
  });
  const h = holm(tests.map((t) => t?.p ?? 1), k.confirmAlpha);
  return cands.map((a, i) => {
    const t = tests[i] ?? null;
    const s = c?.stats.get(a.name);
    const sig = !!t && (h.reject[i] as boolean);
    const sized = !!t && !!s && !!c && passesSize(t, s, c.mean, k);
    const confirmed = sig && sized;
    const reason = !c ? 'no confirmation batch was run' : !t ? 'no observations in the confirmation batch'
      : !sig ? `not significant on the fresh seeds (Holm p ${pv(h.adjusted[i] as number)} > ${k.confirmAlpha})`
        : !sized ? (a.status === 'dominant-win' ? `won ${pct(t.rate)}, under the mean + ${k.dominantMargin}` : 'its shrunk win rate fell under the mean') : '';
    return { name: a.name, rule: a.status as Rule, discovery: a.test as RuleTest, confirm: t, holmP: t ? (h.adjusted[i] as number) : null, confirmed, reason };
  });
}

/** "won 41 of 52 (0.79), p 3e-6" for a test, in the rule's own words. */
export function ruleWords(t: RuleTest): string {
  const what = t.rule === 'dominant-win' ? `won ${t.x} of ${t.n} decisive games` : t.rule === 'dominant-pick' ? `first line in ${t.x} of ${t.n} grids` : `played in ${t.x} of ${t.n} on-colour pools`;
  return `${what} (${pct(t.rate)} vs ${pct(t.p0)}), p ${pv(t.p)}`;
}

// ------------------------------------------------------------------ choosing the swaps

export interface Swap {
  out: string;
  outSection: string;
  in: string;
  inSection: string;
  /** Why the card went: its status. */
  why: Status;
  evidence: string;
  /** Why this card came in. */
  fit: string;
}

export interface Decision {
  swaps: Swap[];
  assessments: Assessment[];
  /** Discovery on this generation's own drafts: the BH family, its level and cutoff, the design effect. */
  discovery: { drafts: number; family: number; q: number; cutoff: number; deff: number; candidates: number };
  /** The confirmation batch the candidates call for (drafts 0: none). */
  plan: ConfirmPlan;
  /** The confirmation batch that was run (absent: none). */
  confirmBatch?: { drafts: number; seeds: [number, number]; games: number; mean: number; deff: number };
  /** Every candidate, confirmed or not, with both batches' numbers. */
  confirmations: Confirmation[];
  /** Cuts the evidence supported that found no replacement keeping the constraints. */
  unmatched: Array<{ name: string; why: Status; reason: string }>;
  /** Leads that did not pass their threshold. */
  watch: Assessment[];
  aiLimited: Assessment[];
  humanTest: Array<{ name: string; colors: string; themes: string[]; why: string }>;
  pendingTries: string[];
  /** One sentence: what the generation found and what to do next. */
  verdict: string;
  violationsBefore: string[];
  violationsAfter: string[];
}

export interface SelectInput {
  cube: Cube;
  cards: EvolveCard[];
  pool: PoolCard[];
  stats: Map<string, CardStat>;
  balance: Balance;
  drafts: number;
  constraints: Constraints;
  notes: Map<string, Note>;
  /** Cards cut by an earlier generation (never re-added unless a note says try). */
  tabu: Set<string>;
  knobs: EvolveKnobs;
  /** The design effect of the discovery batch's games (designEffect over its played decks; 1 if absent). */
  deff?: number;
  /** The confirmation batch: fresh seeds, read on their own.  Absent: the candidates stay candidates. */
  confirmation?: ConfirmInput;
}

interface Candidate { card: PoolCard; score: number; parts: string }

function fit(cut: EvolveCard, why: Status, cand: PoolCard, need: { theme: Map<string, number>; colour: Map<string, number> }, tryIt: boolean, k: EvolveKnobs): Candidate {
  const same = colourClass(cand) === colourClass(cut);
  const themes = cand.themes.filter((t) => cut.themes.includes(t));
  const roles = cand.roles.filter((r) => cut.roles.includes(r));
  const mvGap = cut.land || cand.land ? 0 : Math.abs(cand.mv - cut.mv);
  const ceiling = why === 'dominant-win' || why === 'dominant-pick' ? cut.rating * k.dominantReplaceRatio : Infinity;
  const rated = Math.min(cand.rating, ceiling) - Math.max(0, cand.rating - ceiling);
  const tn = cand.themes.length ? cand.themes.reduce((s, t) => s + (need.theme.get(t) ?? 0), 0) / cand.themes.length : 0;
  const cn = cand.colors.length ? [...cand.colors].reduce((s, c) => s + (need.colour.get(c) ?? 0), 0) / cand.colors.length : 0;
  const balance = (tn + cn) / 2;
  const score = (same ? k.fitSameClass : 0) + k.fitTheme * themes.length + k.fitRole * roles.length - k.fitMv * mvGap
    + k.fitRating * rated / 100 + k.fitBalance * balance + (tryIt ? k.fitTry : 0);
  const parts = [
    same ? 'same colour class' : `colour ${colourClass(cand)} for ${colourClass(cut)}`,
    themes.length ? `shares ${themes.join(' ')}` : 'no shared theme',
    ...(roles.length ? [`role ${roles.join(' ')}`] : []),
    ...(cut.land ? [] : [`mv ${cand.mv} for ${cut.mv}`]),
    `rating ${cand.rating}`,
    ...(balance > 0 ? [`helps weak ${[...cand.themes.filter((t) => (need.theme.get(t) ?? 0) > 0), ...[...cand.colors].filter((c) => (need.colour.get(c) ?? 0) > 0)].join(' ')} (${balance.toFixed(2)})`] : []),
    ...(tryIt ? ['notes say try'] : []),
  ].join('; ');
  return { card: cand, score: Math.round(score * 1000) / 1000, parts };
}

const CUT_ORDER: Status[] = ['note-cut', 'dominant-win', 'dominant-pick', 'dead'];

/** The first stage alone: every card assessed on the discovery batch, the candidates, and the confirmation batch they call for. */
export function discoveryStage(x: Pick<SelectInput, 'cards' | 'stats' | 'balance' | 'drafts' | 'notes' | 'knobs' | 'deff'>): { disc: Discovery; assessments: Assessment[]; candidates: Assessment[]; plan: ConfirmPlan } {
  const k = x.knobs;
  const mean = x.balance.mean;
  const disc = discover(x.cards, x.stats, mean, x.deff ?? 1, x.notes, k);
  const assessments = x.cards.map((c) => assess(c, x.stats.get(c.name), mean, x.drafts, x.notes.get(c.name), k, disc))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
  const candidates = assessments.filter((a) => a.status === 'dominant-win' || a.status === 'dominant-pick' || a.status === 'dead');
  return { disc, assessments, candidates, plan: confirmPlan(candidates, x.stats, x.drafts, mean, disc.deff, k) };
}

export function selectSwaps(x: SelectInput): Decision {
  const k = x.knobs;
  const mean = x.balance.mean;
  const { disc, assessments, candidates, plan } = discoveryStage(x);
  const confirmations = confirmCandidates(candidates, x.cards, x.confirmation, k);
  const confirmed = new Map(confirmations.filter((c) => c.confirmed).map((c) => [c.name, c]));
  const byName = new Map(x.cards.map((c) => [c.name, c]));
  const cb = x.confirmation;
  const cuts = assessments.filter((a) => a.status === 'note-cut' || confirmed.has(a.name))
    .sort((a, b) => CUT_ORDER.indexOf(a.status) - CUT_ORDER.indexOf(b.status) || b.strength - a.strength || (a.name < b.name ? -1 : 1));
  const need = { theme: needOf(x.balance.themes, mean), colour: needOf(x.balance.colours, mean) };
  const inCube = new Set(x.cards.map((c) => c.name));
  const themeCodes = new Set(Object.keys(x.cube.themeNames));
  const tries = new Set([...x.notes.values()].filter((n) => n.verdict === 'try').map((n) => n.card));
  const noteCut = new Set([...x.notes.values()].filter((n) => n.verdict === 'cut').map((n) => n.card));
  const eligible = (p: PoolCard): boolean => p.supported && !inCube.has(p.name) && p.colors.length <= 2
    && !noteCut.has(p.name) && (!x.tabu.has(p.name) || tries.has(p.name)) && (p.aiFlag !== 'All' || tries.has(p.name))
    && (p.rating >= k.deadMinRating || tries.has(p.name))
    && !['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'].includes(p.name);
  const pool = x.pool.filter(eligible);

  let current = [...x.cards];
  const before = violations(current, x.constraints);
  const swaps: Swap[] = [];
  const unmatched: Decision['unmatched'] = [];
  const added = new Set<string>();
  for (const a of cuts) {
    if (swaps.length >= k.swaps) { unmatched.push({ name: a.name, why: a.status, reason: `over the ${k.swaps}-swap budget` }); continue; }
    const cut = byName.get(a.name) as EvolveCard;
    const ranked = pool.filter((p) => !added.has(p.name)).map((p) => fit(cut, a.status, p, need, tries.has(p.name), k))
      .sort((p, q) => q.score - p.score || (p.card.name < q.card.name ? -1 : 1));
    let chosen: { cand: Candidate; next: EvolveCard[]; card: EvolveCard } | null = null;
    const baseV = new Set(violations(current, x.constraints));
    for (const cand of ranked) {
      const section = sectionFor(x.cube, cand.card, cut.section);
      const card: EvolveCard = {
        name: cand.card.name, section, themes: cand.card.themes.filter((t) => !themeCodes.size || themeCodes.has(t)), roles: cand.card.roles,
        ...(cand.card.colors.length === 2 && !cand.card.land ? { pair: cand.card.colors } : {}),
        colors: cand.card.colors, mv: cand.card.mv, land: cand.card.land, fixing: cand.card.fixing, aiFlag: cand.card.aiFlag, rating: cand.card.rating,
      };
      const next = [...current.filter((c) => c.name !== cut.name), card];
      if (violations(next, x.constraints).every((v) => baseV.has(v))) { chosen = { cand, next, card }; break; }
    }
    if (!chosen) { unmatched.push({ name: a.name, why: a.status, reason: 'no pool card keeps the constraints' }); continue; }
    current = chosen.next;
    added.add(chosen.card.name);
    const conf = confirmed.get(a.name);
    const evidence = a.note ? `notes: ${a.note}; ${a.evidence}`
      : conf && cb ? `discovery (${x.drafts} drafts): ${ruleWords(conf.discovery)}${conf.discovery.qValue !== undefined ? `, q ${pv(conf.discovery.qValue)}` : ''}; confirmed on fresh seeds ${cb.seeds[0]}–${cb.seeds[1]} (${cb.drafts} drafts): ${ruleWords(conf.confirm as RuleTest)}, Holm p ${pv(conf.holmP as number)}`
        : a.evidence;
    swaps.push({ out: cut.name, outSection: cut.section, in: chosen.card.name, inSection: chosen.card.section, why: a.status,
      evidence, fit: chosen.cand.parts });
  }
  const watch = assessments.filter((a) => a.status === 'watch').sort((a, b) => (a.draftsNeeded ?? 1e9) - (b.draftsNeeded ?? 1e9) || (a.name < b.name ? -1 : 1));
  const aiLimited = assessments.filter((a) => a.aiFlag !== 'none');
  const humanTest = x.pool.filter((p) => p.supported && p.aiFlag === 'All' && !inCube.has(p.name) && !noteCut.has(p.name) && p.colors.length <= 2)
    .map((p) => {
      const tn = p.themes.length ? p.themes.reduce((s, t) => s + (need.theme.get(t) ?? 0), 0) / p.themes.length : 0;
      const cn = p.colors.length ? [...p.colors].reduce((s, c) => s + (need.colour.get(c) ?? 0), 0) / p.colors.length : 0;
      return { p, score: k.fitBalance * (tn + cn) / 2 + k.fitRating * p.rating / 100 };
    })
    .sort((a, b) => b.score - a.score || (a.p.name < b.p.name ? -1 : 1)).slice(0, k.humanTest)
    .map(({ p, score }) => ({ name: p.name, colors: p.colors || 'C', themes: p.themes, why: `AI:RemoveDeck:All — the AI cannot judge it; fit ${score.toFixed(2)} (rating ${p.rating}${p.themes.length ? `, ${p.themes.join(' ')}` : ''})` }));
  const pendingTries = [...tries].filter((t) => !inCube.has(t) && !added.has(t)).sort();
  const settle = watch.map((w) => w.draftsNeeded).filter((d): d is number => typeof d === 'number');
  const settleAt = settle.length ? settle[Math.min(settle.length - 1, Math.floor(settle.length / 2))] : null;
  const rated = assessments.filter((a) => a.status === 'rating-limited').length;
  const ratedNote = rated ? ` ${rated} card(s) are rarely or never played on colour but rated under ${k.deadMinRating}: a ratings question, not a drafts one (see rating-limited).` : '';
  const nConf = confirmed.size;
  const stage = candidates.length
    ? ` Discovery: ${candidates.length} candidate(s) of ${disc.family} tests at a false-discovery rate of ${k.fdrQ}; `
      + (cb ? `confirmation on ${cb.drafts} fresh drafts: ${nConf} confirmed, ${candidates.length - nConf} not.` : `not yet confirmed (a ${plan.drafts}-draft confirmation batch is needed); nothing is cut on them.`)
    : '';
  const verdict = (swaps.length
    ? `${swaps.length} swap(s): ${nConf ? `${nConf} card(s) found and then confirmed on fresh drafts` : ''}${nConf && swaps.length > nConf ? ', and ' : ''}${swaps.length > nConf ? `${swaps.length - nConf} by the notes` : ''}${unmatched.length ? `; ${unmatched.length} supported cut(s) left for later` : ''}${watch.length ? `; ${watch.length} more lead(s) are insufficient data` : ''}.`
    : watch.length
      ? `Insufficient data: no card was confirmed at ${x.drafts} drafts; ${watch.length} lead(s) to watch${settleAt ? ` — about ${settleAt} drafts per generation would find half of them` : ''}. Run more drafts.`
      : candidates.length ? `No swaps: nothing was confirmed.` : `No swaps: nothing is dead or dominant at ${x.drafts} drafts, and nothing leans that way.`) + stage + ratedNote;
  return {
    swaps, assessments,
    discovery: { drafts: x.drafts, family: disc.family, q: k.fdrQ, cutoff: disc.cutoff, deff: disc.deff, candidates: candidates.length },
    plan, ...(cb ? { confirmBatch: { drafts: cb.drafts, seeds: cb.seeds, games: cb.games, mean: cb.mean, deff: cb.deff } } : {}), confirmations,
    unmatched, watch, aiLimited, humanTest, pendingTries, verdict, violationsBefore: before, violationsAfter: violations(current, x.constraints),
  };
}

/** The cube's cards after the swaps, as CubeCards for writeCubeDoc (cut cards gone, added ones without src). */
export function applySwaps(cube: Cube, swaps: Swap[], pool: Map<string, PoolCard>): CubeCard[] {
  const outs = new Set(swaps.map((s) => s.out));
  const themeCodes = new Set(Object.keys(cube.themeNames));
  const kept = cube.cards.filter((c) => !outs.has(c.name));
  const adds = swaps.map((s): CubeCard => {
    const p = pool.get(s.in);
    const themes = (p?.themes ?? []).filter((t) => !themeCodes.size || themeCodes.has(t));
    return { name: s.in, section: s.inSection, themes, roles: p?.roles ?? [], ...(p && p.colors.length === 2 && !p.land ? { pair: p.colors } : {}) };
  });
  return [...kept, ...adds];
}
