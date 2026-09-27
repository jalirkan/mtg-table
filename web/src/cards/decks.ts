/*
 * mtg-table — cards/decks.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Decks, as the card browser needs them**: which deck files a card is in and
 * how many (`in decks/pacho-shield.dck ×7`), the in-deck filter, and the line
 * the "copy .dck line" button writes.
 *
 * The parser is deliberately small — Forge's `.dck` grammar as report 03 §3.7
 * and §4.9 describe it, and nothing more: `[section]` headers matched
 * case-insensitively, `[metadata]` as `Key=Value`, every other line
 * `<count> <request>` with the request split on `|` (`Name`, `Name|SET`,
 * `Name|SET|3`, `Name|SET|[316]`) and a trailing `+` (foil) stripped. It never
 * throws: a deck list is user input.
 *
 * **Names, not prints.** A `.dck` line without `|SET` (ten of the deck's 28)
 * means "any print Forge has", so a card is "in the deck" by NAME and the count
 * is the same for every print of it — which is also how Forge reads it.
 *
 * Pure: no React, no DOM, no fs. The dev route reads the files and hands the
 * text in (`devApi.ts`); `node --test` does the same with fixtures.
 */

import type { DeckFile, DeckLine, LibraryCard } from './model.ts';

/** Parse one `.dck` file's text. `file` is the repo-relative path it came from. */
export function parseDck(file: string, text: string): DeckFile {
  const lines: DeckLine[] = [];
  let section = '';
  let name = '';
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const header = /^\[(.+)\]$/.exec(line);
    if (header !== null) {
      section = (header[1] ?? '').trim().toLowerCase();
      continue;
    }
    if (section === 'metadata') {
      const eq = line.indexOf('=');
      if (eq > 0 && line.slice(0, eq).trim().toLowerCase() === 'name') name = line.slice(eq + 1).trim();
      continue;
    }
    if (section === '') continue;
    const match = /^(\d+)\s*[xX]?\s+(.+)$/.exec(line);
    if (match === null) continue;
    const count = Number.parseInt(match[1] ?? '', 10);
    const parts = (match[2] ?? '').split('|');
    let cardName = (parts[0] ?? '').trim();
    if (cardName.endsWith('+')) cardName = cardName.slice(0, -1).trim();
    if (cardName === '' || !Number.isFinite(count) || count <= 0) continue;
    const set = (parts[1] ?? '').trim();
    lines.push({ count, name: cardName, set: set === '' ? null : set, section });
  }
  const base = file.split('/').pop() ?? file;
  return { file, name: name === '' ? base.replace(/\.dck$/i, '') : name, lines };
}

/** One use of a card in one deck file: `decks/pacho-shield.dck`, main, ×7. */
export interface DeckUse {
  file: string;
  section: string;
  count: number;
}

/** Lower-cased card name → every deck file and section it appears in. */
export type DeckIndex = ReadonlyMap<string, readonly DeckUse[]>;

export function buildDeckIndex(decks: readonly DeckFile[]): DeckIndex {
  const index = new Map<string, DeckUse[]>();
  for (const deck of decks) {
    for (const line of deck.lines) {
      const key = line.name.toLowerCase();
      const uses = index.get(key) ?? [];
      const existing = uses.find((u) => u.file === deck.file && u.section === line.section);
      if (existing !== undefined) existing.count += line.count;
      else uses.push({ file: deck.file, section: line.section, count: line.count });
      index.set(key, uses);
    }
  }
  return index;
}

/**
 * The names a deck file could spell this card by, most specific first: the full
 * Scryfall name, then each face's (Forge writes a transform or adventure card by
 * its FRONT face only — report 03 §3.4).
 */
export function namesOf(card: Pick<LibraryCard, 'name' | 'faces'>): string[] {
  const out = [card.name];
  for (const face of card.faces) if (!out.includes(face.name)) out.push(face.name);
  const slash = card.name.indexOf(' // ');
  if (slash > 0) {
    const front = card.name.slice(0, slash);
    if (!out.includes(front)) out.push(front);
  }
  return out;
}

/** Every deck use of this card, by any of its names. `[]` when it is in no deck. */
export function deckUsesOf(index: DeckIndex, card: Pick<LibraryCard, 'name' | 'faces'>): DeckUse[] {
  const seen = new Set<string>();
  const out: DeckUse[] = [];
  for (const name of namesOf(card)) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    for (const use of index.get(key) ?? []) out.push(use);
  }
  return out;
}

/** `in decks/pacho-shield.dck ×7` — one phrase per use; the sideboard says so. */
export function deckUseLabel(use: DeckUse): string {
  const where = use.section === 'main' || use.section === '' ? '' : ` (${use.section})`;
  return `in ${use.file} ×${String(use.count)}${where}`;
}

/**
 * The in-deck filter. `'any'` is every deck file under `decks/`; a path is that
 * one file. `null` is "no filter".
 */
export function inDeck(index: DeckIndex, card: Pick<LibraryCard, 'name' | 'faces'>, deck: string | null): boolean {
  if (deck === null) return true;
  const uses = deckUsesOf(index, card);
  return deck === 'any' ? uses.length > 0 : uses.some((u) => u.file === deck);
}

/**
 * The name Forge's `.dck` expects. Report 03 §3.4: Forge's edition files write a
 * **split** card as `A // B` and every other multi-face layout (transform,
 * modal DFC, adventure, flip, meld) by its front face only.
 */
export function forgeName(card: Pick<LibraryCard, 'name' | 'layout'>): string {
  const slash = card.name.indexOf(' // ');
  if (slash < 0 || card.layout === 'split') return card.name;
  return card.name.slice(0, slash);
}

/**
 * The sets whose Scryfall code is KNOWN to equal Forge's edition `Code`, so an
 * upper-cased Scryfall code is a valid `|SET` in a `.dck` line. Report 03 §3.3
 * checked MSH and MSC (`ScryfallCode` = `Code` in Forge's own edition files);
 * for any other set the two can differ (Forge has its own codes for many old
 * and promo sets), and a wrong `|SET` is a line Forge cannot resolve.
 */
export const FORGE_SET_CODES_CHECKED: ReadonlySet<string> = new Set(['msh', 'msc']);

/**
 * The "copy .dck line" text: `1 Agent Phil Coulson|MSH` — the same
 * `<count> <Name>|<SET>` shape `decks/pacho-shield.dck` is written in, with the
 * set code upper-cased as Forge's own files write it. **Only for a set in
 * {@link FORGE_SET_CODES_CHECKED}**: any other print gets the bare name, which
 * Forge reads as "any print I have" — always a valid line, where a guessed
 * `|SET` might not be.
 */
export function dckLine(card: Pick<LibraryCard, 'name' | 'layout' | 'set'>, count = 1): string {
  const code = card.set.trim().toLowerCase();
  const set = FORGE_SET_CODES_CHECKED.has(code) ? code.toUpperCase() : '';
  const n = Number.isFinite(count) && count > 0 ? Math.floor(count) : 1;
  return `${String(n)} ${forgeName(card)}${set === '' ? '' : `|${set}`}`;
}

/** Why {@link dckLine} left the set off, or null when it did not. */
export function dckLineNote(card: Pick<LibraryCard, 'set'>): string | null {
  const code = card.set.trim().toLowerCase();
  if (code === '' || FORGE_SET_CODES_CHECKED.has(code)) return null;
  return `No |${code.toUpperCase()}: Scryfall's set code is only checked against Forge's for MSH and MSC, so this line asks Forge for any print.`;
}
