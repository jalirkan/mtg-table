/*
 * mtg-table — tools/card-library/deck.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Deck lists in, entries out — both formats in `decks/` (report 03 §4.9). Pure;
 * a deck list is user input, so nothing here throws on a bad line: it is
 * counted in `skipped` and the rest of the deck still parses.
 *
 * **Forge `.dck`** — `[section]` blocks (matched case-insensitively: this repo
 * writes `[main]`, Forge's cubes `[Main]`); `[metadata]` is `Key=Value`; every
 * other block is `<count> <request>`, where the request is Forge's
 * `CardDb.CardRequest` (`|` separates, report 03 §3.7):
 *
 *     Name
 *     Name|SET
 *     Name|SET|3        ← an art index, 1-based
 *     Name|SET|[316]    ← a collector number in brackets
 *     Name+             ← foil (stripped before matching)
 *
 * The set suffix is optional **and its absence means something**: the ten
 * lines of `pacho-shield.dck` without `|MSH` are exactly the ten cards that are
 * not in MSH (they are in MSC).
 *
 * **Plain text** — `4 Island`, `4x Island`, `Island` (count 1); `#` and `//`
 * comment lines; `Sideboard` / `SB:` switch section. A ` // ` INSIDE a line is
 * a card name (`Fire // Ice`), not a comment — only a line that STARTS with
 * `//` is one.
 */

export interface DeckEntry {
  count: number;
  /** The name as written, foil marker removed. */
  name: string;
  /** Lower-cased set code (Forge's `Code`, which is the Scryfall code for MSH/MSC), or null. */
  set: string | null;
  /** Forge's 1-based art index within the set, or null. */
  artIndex: number | null;
  collectorNumber: string | null;
  foil: boolean;
  /** `main`, `sideboard`, `commander`, … lower-cased. */
  section: string;
  /** 1-based line number in the source, for error messages. */
  line: number;
}

export interface ParsedDeck {
  format: 'dck' | 'txt';
  name: string | null;
  metadata: Record<string, string>;
  entries: DeckEntry[];
  /** Lines that were neither blank, comment, header nor a card: `[line, text]`. */
  skipped: [number, string][];
}

/** `Name|SET|art-or-[cn]` with an optional trailing `+`. */
export function parseCardRequest(request: string): Pick<DeckEntry, 'name' | 'set' | 'artIndex' | 'collectorNumber' | 'foil'> {
  const parts = request.split('|').map((p) => p.trim());
  let name = parts[0] ?? '';
  let foil = false;
  if (name.endsWith('+')) {
    foil = true;
    name = name.slice(0, -1).trim();
  }
  const setPart = parts[1];
  const set = setPart === undefined || setPart === '' ? null : setPart.toLowerCase();
  let artIndex: number | null = null;
  let collectorNumber: string | null = null;
  const third = parts[2];
  if (third !== undefined && third !== '') {
    const bracket = /^\[(.+)\]$/.exec(third);
    if (bracket !== null) collectorNumber = bracket[1]!.trim();
    else if (/^\d+$/.test(third)) artIndex = Number.parseInt(third, 10);
  }
  return { name, set, artIndex, collectorNumber, foil };
}

export function parseDck(text: string): ParsedDeck {
  const entries: DeckEntry[] = [];
  const metadata: Record<string, string> = {};
  const skipped: [number, string][] = [];
  let section = '';
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;
    const header = /^\[(.+)\]$/.exec(line);
    if (header !== null) {
      section = header[1]!.trim().toLowerCase();
      return;
    }
    if (section === 'metadata') {
      const eq = line.indexOf('=');
      if (eq > 0) metadata[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
      return;
    }
    const m = /^(\d+)\s+(.+)$/.exec(line);
    if (section === '' || m === null) {
      skipped.push([i + 1, raw]);
      return;
    }
    const request = parseCardRequest(m[2]!);
    if (request.name === '') {
      skipped.push([i + 1, raw]);
      return;
    }
    entries.push({ count: Number.parseInt(m[1]!, 10), ...request, section, line: i + 1 });
  });
  return { format: 'dck', name: metadata['Name'] ?? null, metadata, entries, skipped };
}

const TXT_LINE = /^(?:(\d+)\s*[xX]?\s+)?(.+?)\s*$/;

export function parseTxt(text: string): ParsedDeck {
  const entries: DeckEntry[] = [];
  const skipped: [number, string][] = [];
  let section = 'main';
  text.split(/\r?\n/).forEach((raw, i) => {
    let line = raw.trim();
    if (line === '' || line.startsWith('#') || line.startsWith('//')) return;
    if (/^(sideboard|sb)\s*:?\s*$/i.test(line)) {
      section = 'sideboard';
      return;
    }
    if (/^(deck|main|maindeck|mainboard)\s*:?\s*$/i.test(line)) {
      section = 'main';
      return;
    }
    let lineSection = section;
    if (/^SB:\s*/i.test(line)) {
      lineSection = 'sideboard';
      line = line.replace(/^SB:\s*/i, '');
    }
    const m = TXT_LINE.exec(line);
    if (m === null || m[2] === undefined) {
      skipped.push([i + 1, raw]);
      return;
    }
    const request = parseCardRequest(m[2]);
    if (request.name === '') {
      skipped.push([i + 1, raw]);
      return;
    }
    entries.push({ count: m[1] === undefined ? 1 : Number.parseInt(m[1], 10), ...request, section: lineSection, line: i + 1 });
  });
  return { format: 'txt', name: null, metadata: {}, entries, skipped };
}

/** By extension, then by content: a `[section]` header anywhere means `.dck`. */
export function parseDeck(text: string, fileName = ''): ParsedDeck {
  if (fileName.toLowerCase().endsWith('.dck')) return parseDck(text);
  if (fileName.toLowerCase().endsWith('.txt')) return parseTxt(text);
  return /^\s*\[[^\]]+\]\s*$/m.test(text) ? parseDck(text) : parseTxt(text);
}

export function totalCards(deck: ParsedDeck, section?: string): number {
  return deck.entries.filter((e) => section === undefined || e.section === section).reduce((n, e) => n + e.count, 0);
}
