// mtg-table — the cube lab: what a card IS, from the engine's facts.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// `CubeLab.java facts` writes one record per listed name (Forge's own card
// database: colours, cost, type, oracle text, its draft rank, the AI hints).
// This module turns a record plus the cube's tags plus a rating into the
// LabCard every other module reads, and holds the two mana questions the
// drafters and the deckbuilder ask: which colours a card's cost needs (pips),
// and which colours a card can MAKE (a dual, a fetchland's two basic types, a
// mana creature, a Prism, a land-search spell).  Pure functions, no I/O.

import type { CubeCard } from './cube.ts';

export const COLOURS = ['W', 'U', 'B', 'R', 'G'] as const;
export type Colour = (typeof COLOURS)[number];
export const BASIC_OF: Record<Colour, string> = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };

/** One record of `CubeLab.java facts`. */
export interface Fact {
  listed: string;
  found: boolean;
  exact?: boolean;
  suggestions?: string[];
  name?: string;
  colors?: string;
  identity?: string;
  manaCost?: string;
  cmc?: number;
  type?: string;
  land?: boolean;
  basicLand?: boolean;
  creature?: boolean;
  planeswalker?: boolean;
  instant?: boolean;
  sorcery?: boolean;
  artifact?: boolean;
  enchantment?: boolean;
  power?: string | null;
  toughness?: string | null;
  oracle?: string;
  otherFace?: string | null;
  otherFaceType?: string | null;
  unsupported?: boolean;
  remAIDeck?: boolean;
  remRandomDeck?: boolean;
  rank?: { source: 'cube' | 'set' | 'none'; edition: string; defaultEdition: string; rawScore: number };
}

export interface LabCard {
  /** Forge's name (an MDFC's front face). */
  name: string;
  section: string;
  themes: string[];
  roles: string[];
  /** The card's colours, WUBRG order; '' is colourless. */
  colors: string;
  cmc: number;
  /** Coloured pips of the cost, e.g. { W: 2 }. */
  pips: Partial<Record<Colour, number>>;
  type: string;
  land: boolean;
  creature: boolean;
  planeswalker: boolean;
  /** Colours this card can make or fetch, WUBRG order (lands and mana fixers). */
  produces: string;
  /** A nonland card that makes or fetches more than one colour (Prism, Birds, Rampant Growth). */
  fixer: boolean;
  rating: number;
  remAIDeck: boolean;
}

export function colourString(set: Iterable<string>): string {
  const s = new Set(set);
  return COLOURS.filter((c) => s.has(c)).join('');
}

/** Coloured pips of a Forge short cost string (`1 {G} {U}`, `{W/U}`, `{B/P}`). */
export function pipsOf(cost: string): Partial<Record<Colour, number>> {
  const out: Partial<Record<Colour, number>> = {};
  for (const m of cost.matchAll(/\{([^}]+)\}/g)) {
    const sym = m[1] ?? '';
    // A hybrid pip counts once for each of its colours: either pays it.
    for (const c of COLOURS) if (sym.includes(c)) out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}

const TYPE_COLOUR: Record<string, Colour> = { Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G' };

/**
 * The colours a card can produce or fetch.  A land: its colour identity (a
 * shockland's or a Pathway's two), plus the basic land types its text searches
 * for (a fetchland has no identity of its own).  Any card: every colour of an
 * `Add {X}` clause, all five for "mana of any color", and all five for a search
 * for "a basic land card" (Rampant Growth, Sakura-Tribe Elder).
 */
export function producesOf(f: Fact): string {
  const out = new Set<string>();
  const oracle = normaliseOracle(f.oracle ?? '');
  if (f.land) for (const c of f.identity ?? '') out.add(c);
  if (f.land || /search your library/i.test(oracle)) {
    const search = /search your library for (?:an? |up to \w+ )?([^.]*?)card/gi;
    for (const m of oracle.matchAll(search)) {
      const what = m[1] ?? '';
      if (/basic land/i.test(what)) COLOURS.forEach((c) => out.add(c));
      for (const [t, c] of Object.entries(TYPE_COLOUR)) if (new RegExp(`\\b${t}\\b`).test(what)) out.add(c);
    }
  }
  for (const m of oracle.matchAll(/\badd ([^.]*)/gi)) {
    const clause = m[1] ?? '';
    if (/any colou?r/i.test(clause)) COLOURS.forEach((c) => out.add(c));
    for (const s of clause.matchAll(/\{([WUBRG])\}/g)) out.add(s[1] ?? '');
  }
  return colourString(out);
}

export function normaliseOracle(s: string): string {
  return s.replace(/\\n/g, '\n');
}

/** A Fact plus the cube's tags plus a rating -> the lab's card. */
export function labCard(f: Fact, tags: CubeCard | undefined, rating: number): LabCard {
  if (!f.found || !f.name) throw new Error(`labCard: ${f.listed} is not in the engine`);
  const land = !!f.land;
  const produces = producesOf(f);
  return {
    name: f.name,
    section: tags?.section ?? '',
    themes: tags?.themes ?? [],
    roles: tags?.roles ?? [],
    colors: land ? '' : (f.colors ?? ''),
    cmc: land ? 0 : (f.cmc ?? 0),
    pips: land ? {} : pipsOf(f.manaCost ?? ''),
    type: f.type ?? '',
    land,
    creature: !!f.creature,
    planeswalker: !!f.planeswalker,
    produces,
    fixer: !land && produces.length >= 2,
    rating,
    remAIDeck: !!f.remAIDeck,
  };
}

/** Is every colour of this card in `allowed` (a colour string)? Colourless always is. */
export function castableIn(card: LabCard, allowed: string): boolean {
  for (const c of card.colors) if (!allowed.includes(c)) return false;
  return true;
}

/** The ten two-colour pairs, WUBRG-ordered strings. */
export function colourPairs(): string[] {
  const out: string[] = [];
  for (let i = 0; i < 5; i++) for (let k = i + 1; k < 5; k++) out.push(`${COLOURS[i]}${COLOURS[k]}`);
  return out;
}

export const GUILD: Record<string, string> = {
  WU: 'Azorius', UB: 'Dimir', BR: 'Rakdos', RG: 'Gruul', WG: 'Selesnya',
  WB: 'Orzhov', UR: 'Izzet', BG: 'Golgari', WR: 'Boros', UG: 'Simic',
};
