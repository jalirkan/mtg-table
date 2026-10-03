// mtg-table — the cube lab: `evolve`, the pure half — from a generation's run to its swaps.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The evolve loop (D299, D300) plays N drafts of a cube, reads what happened
// (meta.ts's buildMeta, plus who took each card first), and proposes at most
// `swaps` swaps of a cube card for a card of the seed pool.  This module is
// every decision of that loop and nothing else: no engine, no file system.
//
// A CUT needs evidence that passes a threshold (the knobs below), or a note:
//
//   dead           in a drafter's pool whose played deck could cast it (its
//                  colours within the deck's, splash included) at least
//                  minOnColour times, and the Wilson 95% upper bound of the
//                  share of those decks that played it is at most
//                  deadPlayRateHi — passed over when it was there to play, and
//                  we are sure of it (a gold card of a pair nobody drafts is
//                  not dead: it never had the chance);
//   dominant-win   >= minGames decisive games in played decks, and the Wilson
//                  lower bound of its win rate is at least the run's mean +
//                  dominantLoMargin — wins more, and we are sure of it;
//   dominant-pick  dealt in >= minSeen drafts, the Wilson lower bound of the
//                  share of its grids in which it went in the FIRST line taken
//                  is at least dominantFirstPickLo, and its shrunk win rate is
//                  at least the mean (a card everyone grabs that also wins);
//   note           cubes/<cube>-notes.tsv says `cut` (Justin's real games).
//
// A lead that does not pass is `watch` ("insufficient data"), with an estimate
// of the drafts it would take to settle.  Never cut:
//
//   - a card the notes file says `keep`;
//   - an AI-LIMITED card (Forge's AI:RemoveDeck All or Random, the pool's
//     forge_ai_flag) on AI evidence: its numbers are reported apart, marked
//     AI-limited, and only a note can cut it;
//   - a LAND on deck-rate evidence (`builder-limited`): the lab's deckbuilder
//     plays a dual or a fetchland only in its own pair's decks and a land that
//     makes fewer than two colours (Mutavault) never, so a land's deck rate
//     measures how often its pair was drafted, not the land;
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
import { playedDeck, wilson, type CardInfo } from './report.ts';
import type { DraftRecord } from './run.ts';

export interface EvolveKnobs {
  swaps: number;
  minSeen: number;
  minGames: number;
  minOnColour: number;
  deadPlayRateHi: number;
  deadMinRating: number;
  dominantLoMargin: number;
  dominantFirstPickLo: number;
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
  dominantLoMargin: 0.05,
  dominantFirstPickLo: 0.75,
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

// ------------------------------------------------------------------ assessing a card

export type Status = 'note-cut' | 'note-keep' | 'dominant-win' | 'dominant-pick' | 'dead' | 'watch' | 'ai-limited' | 'builder-limited' | 'rating-limited' | 'ok' | 'no-data';

export interface Assessment {
  name: string;
  status: Status;
  /** What the AI evidence alone would say (for an AI-limited or noted card too). */
  signal: 'dead' | 'dominant-win' | 'dominant-pick' | 'lean-dead' | 'lean-dominant' | 'none';
  evidence: string;
  aiFlag: AiFlag;
  note?: string;
  /** For a watch: drafts per generation that would likely settle it (null = not reachable). */
  draftsNeeded?: number | null;
  /** How strong the case is (sorts the cuts). */
  strength: number;
}

const pct = (x: number): string => x.toFixed(2);

/** The smallest n at which Wilson's bound for a steady rate p crosses `target` (upper bound <= target when below, lower >= target when above). */
export function sampleToSettle(p: number, target: number, below: boolean, cap = 20000): number | null {
  if (below ? p >= target : p <= target) return null;
  for (let n = 1; n <= cap; n = n < 50 ? n + 1 : Math.ceil(n * 1.02)) {
    const w = wilson(Math.round(p * n), n);
    if (below ? (w.hi ?? 1) <= target : (w.lo ?? 0) >= target) return n;
  }
  return null;
}

export function assess(card: EvolveCard, s: CardStat | undefined, mean: number, drafts: number, note: Note | undefined, k: EvolveKnobs): Assessment {
  const base = { name: card.name, aiFlag: card.aiFlag, ...(note ? { note: note.note } : {}) };
  if (!s || s.seen === 0) {
    const st: Status = note?.verdict === 'cut' ? 'note-cut' : note?.verdict === 'keep' ? 'note-keep' : 'no-data';
    return { ...base, status: st, signal: 'none', evidence: 'never dealt', strength: st === 'note-cut' ? 100 : 0 };
  }
  const play = wilson(s.onColourDecks, s.onColour);
  const playRate = s.onColour ? s.onColourDecks / s.onColour : 0;
  const first = wilson(s.firstTakes, s.seen);
  const ev = `dealt ${s.seen}, picked ${s.picked}, first line ${s.firstTakes}, in ${s.inDecks} deck(s); `
    + (card.land ? '' : s.onColour ? `on colour in ${s.onColour} pool(s), played in ${s.onColourDecks} (${pct(playRate)}, CI ${pct(play.lo ?? 0)}–${pct(play.hi ?? 1)}); ` : 'never in a pool whose deck could cast it; ')
    + (s.games ? `won ${s.wins} of ${s.games} decisive games (${pct(s.winRate)}, CI ${pct(s.ci[0])}–${pct(s.ci[1])}, shrunk ${pct(s.shrunk)}) vs mean ${pct(mean)}` : 'no decisive games in a deck');
  // What the AI evidence says.
  let signal: Assessment['signal'] = 'none';
  let strength = 0;
  let draftsNeeded: number | null | undefined;
  const perDraftOnColour = s.onColour / Math.max(1, drafts);
  const perDraftGames = s.games / Math.max(1, drafts);
  const builderBlind = card.land;
  if (s.games >= k.minGames && s.ci[0] >= mean + k.dominantLoMargin) { signal = 'dominant-win'; strength = 10 + (s.ci[0] - mean) * 10; }
  else if (s.seen >= k.minSeen && (first.lo ?? 0) >= k.dominantFirstPickLo && s.shrunk >= mean) { signal = 'dominant-pick'; strength = 5 + (first.lo ?? 0); }
  else if (!card.land && s.onColour >= k.minOnColour && (play.hi ?? 1) <= k.deadPlayRateHi) { signal = 'dead'; strength = 1 + (k.deadPlayRateHi - (play.hi ?? 1)); }
  else if (s.games > 0 && s.winRate >= mean + k.watchWinMargin) {
    signal = 'lean-dominant';
    const n = sampleToSettle(s.winRate, mean + k.dominantLoMargin, false);
    draftsNeeded = n === null || perDraftGames === 0 ? null : Math.max(Math.ceil(Math.max(n, k.minGames) / perDraftGames), drafts + 1);
  } else if (!card.land && s.onColour > 0 && playRate <= k.deadPlayRateHi) {
    signal = 'lean-dead';
    const n = sampleToSettle(Math.max(playRate, 0.001), k.deadPlayRateHi, true);
    draftsNeeded = n === null ? null : Math.max(Math.ceil(Math.max(n, k.minOnColour) / perDraftOnColour), drafts + 1);
  }
  const out: Assessment = { ...base, status: 'ok', signal, evidence: ev, strength, ...(draftsNeeded !== undefined ? { draftsNeeded } : {}) };
  if (note?.verdict === 'cut') return { ...out, status: 'note-cut', strength: 100 };
  if (note?.verdict === 'keep' || note?.verdict === 'try') return { ...out, status: 'note-keep', strength: 0 };
  if (card.aiFlag !== 'none') return { ...out, status: 'ai-limited', strength: 0 };
  if (builderBlind && s.inDecks / Math.max(1, s.seen) <= k.deadPlayRateHi) return { ...out, status: 'builder-limited', strength: 0 };
  if ((signal === 'dead' || signal === 'lean-dead') && card.rating < k.deadMinRating) {
    return { ...out, signal: 'dead', status: 'rating-limited', strength: 0, evidence: `${ev}; rated ${card.rating}, under ${k.deadMinRating}` };
  }
  if (signal === 'dominant-win' || signal === 'dominant-pick' || signal === 'dead') return { ...out, status: signal };
  if (signal === 'lean-dead' || signal === 'lean-dominant') return { ...out, status: 'watch', strength: 0 };
  return out;
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

export function selectSwaps(x: SelectInput): Decision {
  const k = x.knobs;
  const mean = x.balance.mean;
  const assessments = x.cards.map((c) => assess(c, x.stats.get(c.name), mean, x.drafts, x.notes.get(c.name), k))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
  const byName = new Map(x.cards.map((c) => [c.name, c]));
  const cuts = assessments.filter((a) => CUT_ORDER.includes(a.status))
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
    swaps.push({ out: cut.name, outSection: cut.section, in: chosen.card.name, inSection: chosen.card.section, why: a.status,
      evidence: a.note ? `notes: ${a.note}; ${a.evidence}` : a.evidence, fit: chosen.cand.parts });
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
  const ratedNote = rated ? ` ${rated} card(s) are never played but rated under ${k.deadMinRating}: a ratings question, not a drafts one (see rating-limited).` : '';
  const verdict = (swaps.length
    ? `${swaps.length} swap(s) passed the evidence threshold${unmatched.length ? `; ${unmatched.length} supported cut(s) left for later` : ''}${watch.length ? `; ${watch.length} more lead(s) are insufficient data` : ''}.`
    : watch.length
      ? `Insufficient data: no card passed a threshold at ${x.drafts} drafts; ${watch.length} lead(s) to watch${settleAt ? ` — about ${settleAt} drafts per generation would settle half of them` : ''}. Run more drafts.`
      : `No swaps: nothing is dead or dominant at ${x.drafts} drafts, and nothing leans that way.`) + ratedNote;
  return { swaps, assessments, unmatched, watch, aiLimited, humanTest, pendingTries, verdict, violationsBefore: before, violationsAfter: violations(current, x.constraints) };
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
