/*
 * mtg-table — workshop/catalogBuild.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **How `catalog.json` is made** — the pure half of `tools/build-workshop-catalog.ts`,
 * and the half `web/test/workshop.test.ts` re-runs to prove the committed file is
 * the one the decks and the corpus produce.
 *
 * The workshop needs, for every card it can put on the pedestal, the facts a
 * `Card` carries on the wire — the type line, the mana cost, power and toughness,
 * whether it is a token. `art.json` has none of them (it is a name → image map),
 * and the workshop runs with **no engine**. So the facts are read once, offline,
 * out of the committed recordings (`fixtures/games/*.jsonl`): every one of them is
 * something Forge itself put on the wire, which is what makes a synthetic card
 * built from them the same shape the arena draws in a real game.
 *
 * Two rules keep it honest:
 *
 *  - **Off the battlefield first, then the most common spelling.** On the
 *    battlefield a card's P/T carries every continuous effect on it — Peggy spends
 *    most of the corpus under Quantum Reduction, so her MODAL battlefield power is
 *    −3 — while in a hand, a graveyard, exile or on the stack it is the printing.
 *    So the modal (types, cost, P/T) over the off-battlefield sightings wins, and
 *    the battlefield's is the fallback (a token is never anywhere else).
 *  - **Only face-up, named cards are read.** A redacted stub and a face-down card
 *    carry no identity (hard rule 8), and are never a source of facts about one.
 *
 * **And one thing the card browser asks** (`threeD`): of each card the list
 * names, what the workshop can show of it in 3D — a body, or the card's own cues —
 * which is whether `#cards`' *View in 3D* button is live (`links.ts`). For that
 * the tool also reads the card names `web/src/arena/cues/cues.json` has an entry
 * for; the card browser imports none of the arena, so the answer is written here.
 *
 * Pure: no `node:fs`, no DOM. The tool and the test do the reading.
 */

/** One `.dck` file, parsed. */
export interface DeckList {
  /** The file's basename, e.g. `pacho-shield.dck`. */
  file: string;
  /** `[metadata] Name=…`, or the basename. */
  name: string;
  cards: DeckCard[];
}

export interface DeckCard {
  name: string;
  count: number;
  section: string;
}

/** What a `Card` on the wire says about a printing — and nothing about a game. */
export interface CardFacts {
  types: string;
  manaCost: string | null;
  power: string | null;
  toughness: string | null;
  token: boolean;
  setCode: string | null;
}

/**
 * **What the workshop can show of a card in 3D** — and so whether the card
 * browser's *View in 3D* is live for it (`links.ts`):
 *
 *  - `figure` — a creature or a Vehicle: a body (or a carrier) on the pedestal,
 *    with its clips, its cues, its tuning and its legibility;
 *  - `cues` — any other card with a per-card `cues.json` entry (an Aura, an
 *    Equipment, a land, a spell): its own cues, rehearsed;
 *  - `null` — a card the list names that has neither: the pedestal would show only
 *    the defaults every card of its kind shares.
 */
export type ThreeD = 'figure' | 'cues' | null;

export interface CatalogFile {
  version: 1;
  _generated: string;
  decks: Array<{ file: string; name: string; cards: DeckCard[] }>;
  cards: Record<string, CardFacts>;
  /** Every token the corpus has seen, with how many recordings it appears in. */
  tokens: Array<{ name: string; recordings: number }>;
  /** Deck names the corpus never showed face up — they preview as a generic card. */
  missing: string[];
  /** Every deck card and token by name → {@link ThreeD}, in name order. */
  threeD: Record<string, ThreeD>;
}

export const GENERATED_NOTE =
  'WRITTEN BY tools/build-workshop-catalog.ts from decks/*.dck, fixtures/games/*.jsonl and the card names in web/src/arena/cues/cues.json — do not edit by hand; web/test/workshop.test.ts fails when it drifts';

/**
 * A creature or a Vehicle, from its type line — **`catalog.ts`'s `roleOf`, rule
 * for rule** (`creature` or `vehicle`); written again because this file imports
 * nothing, and `workshop.test.ts` holds the two to the same answer for every entry.
 */
export function isBodiedTypeLine(types: string): boolean {
  if (/(^|\s)Creature(\s|$|—|-)/.test(types)) return true;
  const lower = types.toLowerCase();
  if (/\bland\b/.test(lower) || /\binstant\b|\bsorcery\b/.test(lower)) return false;
  const dash = lower.search(/[—–-]/);
  const sub = dash >= 0 ? lower.slice(dash + 1) : '';
  if (/\baura\b|\bequipment\b/.test(sub)) return false;
  return /\bvehicle\b/.test(sub);
}

/** {@link ThreeD} for one card: its facts (or `null`, never seen face up) and whether `cues.json` names it. */
export function threeDOf(facts: CardFacts | null, hasCueEntry: boolean): ThreeD {
  if (facts !== null && isBodiedTypeLine(facts.types)) return 'figure';
  return hasCueEntry ? 'cues' : null;
}

/**
 * Forge's `.dck`: `[section]` headers, `N Card Name|SET|ART` lines, and a
 * `[metadata]` block of `Key=Value` pairs. The same grammar `tools/fetch-art.ts`
 * reads — written again here because `web/src` never imports from `tools/`.
 */
export function parseDck(file: string, text: string): DeckList {
  const cards: DeckCard[] = [];
  let section = '';
  let name = file;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      section = line.slice(1, -1).toLowerCase();
      continue;
    }
    if (section === 'metadata') {
      const eq = line.indexOf('=');
      if (eq > 0 && line.slice(0, eq).trim().toLowerCase() === 'name') name = line.slice(eq + 1).trim() || file;
      continue;
    }
    if (section === '') continue;
    const match = /^(\d+)\s+(.*)$/.exec(line);
    if (match === null) continue;
    const cardName = (match[2] ?? '').split('|')[0]?.trim() ?? '';
    if (cardName === '') continue;
    cards.push({ name: cardName, count: Number.parseInt(match[1] ?? '0', 10), section });
  }
  return { file, name, cards };
}

/** The card zones of one `state` body, with no assumption about its shape beyond the protocol's. */
function cardsOfState(body: unknown): unknown[] {
  const out: unknown[] = [];
  const b = body as { players?: Array<{ zones?: Record<string, { cards?: unknown[] }> }>; stackCards?: unknown[] };
  for (const player of b.players ?? []) {
    for (const zone of Object.values(player.zones ?? {})) out.push(...(zone.cards ?? []));
  }
  out.push(...(b.stackCards ?? []));
  return out;
}

/** A face-up, named card's facts, or `null` for anything that carries no identity. */
export function factsOf(card: unknown): { name: string; zone: string; facts: CardFacts } | null {
  if (typeof card !== 'object' || card === null) return null;
  const c = card as Record<string, unknown>;
  if (c['hidden'] === true || c['faceDownHidden'] === true || c['faceDown'] === true) return null;
  const name = c['name'];
  const types = c['types'];
  if (typeof name !== 'string' || name === '' || typeof types !== 'string' || types === '') return null;
  const str = (key: string): string | null => (typeof c[key] === 'string' ? (c[key] as string) : null);
  return {
    name,
    zone: typeof c['zone'] === 'string' ? c['zone'] : '',
    facts: {
      types,
      manaCost: str('manaCost'),
      power: str('power'),
      toughness: str('toughness'),
      token: c['token'] === true,
      setCode: str('setCode'),
    },
  };
}

/**
 * The catalog, from the decks and every `state` body of every recording.
 *
 * `recordings` is `[file, bodies]` in a stable order (the tool sorts by name), so
 * the output is a pure function of the committed files.
 */
export function buildCatalog(
  decks: readonly DeckList[],
  recordings: ReadonlyArray<readonly [string, Iterable<unknown>]>,
  /** The card names `cues.json`'s `cards` block has an entry for (for {@link ThreeD}). */
  cueCards: readonly string[] = [],
): CatalogFile {
  // name → facts-key → count, and the facts behind each key — twice: off the
  // battlefield (the printing) and on it (the printing plus whatever is on it).
  const tallies = new Map<string, Map<string, number>>();
  const fieldTallies = new Map<string, Map<string, number>>();
  const spelled = new Map<string, CardFacts>();
  const tokenIn = new Map<string, Set<string>>();
  for (const [file, bodies] of recordings) {
    for (const body of bodies) {
      for (const card of cardsOfState(body)) {
        const seen = factsOf(card);
        if (seen === null) continue;
        const key = JSON.stringify(seen.facts);
        spelled.set(key, seen.facts);
        const into = seen.zone === 'battlefield' ? fieldTallies : tallies;
        const tally = into.get(seen.name) ?? new Map<string, number>();
        tally.set(key, (tally.get(key) ?? 0) + 1);
        into.set(seen.name, tally);
        if (seen.facts.token) {
          const where = tokenIn.get(seen.name) ?? new Set<string>();
          where.add(file);
          tokenIn.set(seen.name, where);
        }
      }
    }
  }

  const modal = (name: string): CardFacts | null => {
    const tally = tallies.get(name) ?? fieldTallies.get(name);
    if (tally === undefined) return null;
    let best: string | null = null;
    let bestCount = -1;
    // Ties broken by the key's own spelling, so the answer never depends on Map order.
    for (const [key, count] of [...tally].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) {
      if (count > bestCount) {
        best = key;
        bestCount = count;
      }
    }
    return best === null ? null : (spelled.get(best) ?? null);
  };

  const ordered = [...decks].sort((a, b) => {
    // The deck in play first (CLAUDE.md), then the probe decks by name.
    const rank = (d: DeckList): number => (d.file === 'pacho-shield.dck' ? 0 : 1);
    return rank(a) - rank(b) || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
  });

  const cards: Record<string, CardFacts> = {};
  const missing: string[] = [];
  const threeD: Record<string, ThreeD> = {};
  const cued = new Set(cueCards);
  const want = new Set<string>();
  for (const deck of ordered) for (const card of deck.cards) want.add(card.name);
  const tokens = [...tokenIn.keys()].sort();
  for (const token of tokens) want.add(token);
  for (const name of [...want].sort()) {
    const facts = modal(name);
    if (facts === null) missing.push(name);
    else cards[name] = facts;
    threeD[name] = threeDOf(facts, cued.has(name));
  }

  return {
    version: 1,
    _generated: GENERATED_NOTE,
    decks: ordered.map((deck) => ({ file: deck.file, name: deck.name, cards: deck.cards })),
    cards,
    tokens: tokens.map((name) => ({ name, recordings: tokenIn.get(name)?.size ?? 0 })),
    missing,
    threeD,
  };
}
