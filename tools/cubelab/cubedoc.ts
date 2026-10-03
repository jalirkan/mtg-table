// mtg-table — the cube lab: write a cube document back after its list changed.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The evolve loop (D299) swaps cards in a cube markdown file (cube.ts's format)
// and writes the next version in the same shape.  Only three things change:
//
//   1. the `## The list` block: every card that stays is written back as it
//      was written (cube.ts keeps each card's item text, source line, prefix
//      and separator), on the line it came from; a card cut is dropped from
//      its line (a line left empty goes); a card added joins its section — a
//      gold card the line of its pair (or a new `XY: ` line), a land a line of
//      its own, anything else the section's last line — and each `### Name (N)`
//      heading is recounted;
//   2. the title's `version N` and any `| Section | N |` row of a table whose
//      first cell is a section's name (the format-counts table), and its
//      `**Total**` row;
//   3. one entry appended to the `## Iteration log` section (created at the end
//      when the file has none).
//
// Every other line is copied as it is.  Pure: text in, text out.
//
// Round trip: parseCube(writeCubeDoc(text, parseCube(text).cards, …)) lists the
// same cards in the same sections with the same tags (web/test/cubelab-evolve.test.ts).

import { parseCube, type Cube, type CubeCard } from './cube.ts';

/** The item text to write for a card: as written, else `Name — TAGS roles`. */
export function itemText(c: CubeCard): string {
  if (c.src?.item) return c.src.item;
  const tags = [...c.themes, ...c.roles];
  return tags.length ? `${c.name} — ${tags.join(' ')}` : c.name;
}

interface Line { key: string; prefix: string; sep: string; end: string; cards: CubeCard[] }

/** The list block for `cards`, in the sections of `before` (a parsed cube), as lines. */
function listLines(before: Cube, cards: CubeCard[]): Map<string, Line[]> {
  const out = new Map<string, Line[]>();
  for (const s of before.sections) out.set(s.name, []);
  const lineOf = (section: string, key: string, mk: () => Omit<Line, 'cards' | 'key'>): Line => {
    const ls = out.get(section) ?? [];
    if (!out.has(section)) out.set(section, ls);
    let l = ls.find((x) => x.key === key);
    if (!l) { l = { key, ...mk(), cards: [] }; ls.push(l); }
    return l;
  };
  // Lines in source order first, so a section keeps its layout.
  const kept = cards.filter((c) => c.src).sort((a, b) => (a.src?.line ?? 0) - (b.src?.line ?? 0));
  for (const c of kept) {
    const s = c.src as NonNullable<CubeCard['src']>;
    lineOf(c.section, `L${s.line}`, () => ({ prefix: s.prefix, sep: s.sep, end: s.end })).cards.push(c);
  }
  // New cards (no src): gold by pair, lands on a line of their own, the rest on the section's last line.
  for (const c of cards.filter((x) => !x.src)) {
    const ls = out.get(c.section) ?? [];
    if (c.pair) {
      const l = ls.find((x) => x.prefix.trim() === `${c.pair}:`) ?? lineOf(c.section, `P${c.pair}`, () => ({ prefix: `${c.pair}: `, sep: ' · ', end: '' }));
      l.cards.push(c);
    } else if (/land/i.test(c.section)) {
      lineOf(c.section, 'new-lands', () => ({ prefix: '', sep: ' · ', end: '' })).cards.push(c);
    } else {
      const plain = [...ls].reverse().find((x) => !/^[WUBRG]{2}:/.test(x.prefix.trim()) && x.prefix === '');
      (plain ?? lineOf(c.section, 'new', () => ({ prefix: '', sep: ' · ', end: '' }))).cards.push(c);
    }
  }
  return out;
}

function renderLine(l: Line): string {
  // A group line split on commas can only stay one if no item holds a comma or a dash.
  let sep = l.sep || ' · ';
  if (sep === ', ' && l.cards.some((c) => /,| — /.test(itemText(c)))) sep = ' · ';
  if (l.cards.length === 1 && l.prefix === '') sep = ' · ';
  return `${l.prefix}${l.cards.map(itemText).join(sep)}${l.end}`;
}

export interface DocEdit {
  /** The new version number for the title's `version N` (omit to leave it). */
  version?: number;
  /** One iteration-log entry, appended as a list item (omit for none). */
  logEntry?: string;
}

/**
 * The cube document `text` with its list replaced by `cards` (each with a
 * `section`; a card from parseCube keeps its `src`), the section counts and
 * format-counts rows recounted, the title's version bumped and a log entry added.
 */
export function writeCubeDoc(text: string, cards: CubeCard[], edit: DocEdit = {}): string {
  const before = parseCube(text);
  const lines = text.split('\n');
  const startIdx = lines.findIndex((l) => /^##\s+(?!#)the list/i.test(l.trimEnd()));
  if (startIdx < 0) throw new Error('cubedoc: no "## The list" heading');
  let endIdx = lines.findIndex((l, i) => i > startIdx && /^##\s+(?!#)/.test(l));
  if (endIdx < 0) endIdx = lines.length;
  const bySection = listLines(before, cards);
  const count = new Map<string, number>();
  for (const c of cards) count.set(c.section, (count.get(c.section) ?? 0) + 1);

  // Rebuild the block: headings recounted, each section's lines, blank lines as they were between sections.
  const block: string[] = [lines[startIdx] as string];
  const sectionHeads: number[] = [];
  for (let i = startIdx + 1; i < endIdx; i++) if (/^###\s+.+?\s*\(\d+\)\s*$/.test((lines[i] as string).trimEnd())) sectionHeads.push(i);
  // Anything between the `## The list` heading and the first section is kept.
  const firstHead = sectionHeads[0] ?? endIdx;
  for (let i = startIdx + 1; i < firstHead; i++) block.push(lines[i] as string);
  sectionHeads.forEach((h, k) => {
    const m = /^###\s+(.+?)\s*\((\d+)\)\s*$/.exec((lines[h] as string).trimEnd()) as RegExpExecArray;
    const name = m[1] as string;
    block.push(`### ${name} (${count.get(name) ?? 0})`);
    for (const l of bySection.get(name) ?? []) if (l.cards.length) block.push(renderLine(l));
    // The blank lines (and any non-list text) after the section's last item line.
    const next = sectionHeads[k + 1] ?? endIdx;
    let tail = next;
    while (tail > h + 1 && (lines[tail - 1] as string).trim() === '') tail--;
    for (let i = tail; i < next; i++) block.push(lines[i] as string);
  });
  let out = [...lines.slice(0, startIdx), ...block, ...lines.slice(endIdx)];

  // Format-counts rows: `| <Section>… | N |` where <Section> is a section name; and the bold Total row.
  const names = before.sections.map((s) => s.name);
  out = out.map((l) => {
    const m = /^\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*$/.exec(l);
    if (!m) return l;
    const cell = m[1] as string;
    const sec = names.find((n) => cell === n || cell.startsWith(`${n} (`));
    if (sec) return l.replace(/\|\s*\d+\s*\|\s*$/, `| ${count.get(sec) ?? 0} |`);
    if (/^\*\*Total\*\*$/.test(cell)) return l.replace(/\|\s*\*\*\d+\*\*\s*\|\s*$|\|\s*\d+\s*\|\s*$/, `| **${cards.length}** |`);
    return l;
  });
  out = out.map((l) => {
    const m = /^\|\s*\*\*Total\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*$/.exec(l);
    return m ? `| **Total** | **${cards.length}** |` : l;
  });

  if (edit.version !== undefined) {
    const t = out.findIndex((l) => /^#\s+/.test(l));
    if (t >= 0) out[t] = (out[t] as string).replace(/\bversion \d+\b/, `version ${edit.version}`);
  }
  if (edit.logEntry) {
    const li = out.findIndex((l) => /^##\s+iteration log/i.test(l));
    const entry = `- ${edit.logEntry}`;
    if (li < 0) {
      while (out.length && (out[out.length - 1] as string).trim() === '') out.pop();
      out.push('', '## Iteration log', entry, '');
    } else {
      let end = out.findIndex((l, i) => i > li && /^##\s+(?!#)/.test(l));
      if (end < 0) end = out.length;
      let at = end;
      while (at > li + 1 && (out[at - 1] as string).trim() === '') at--;
      out.splice(at, 0, entry);
    }
  }
  return out.join('\n');
}

/** The section a new card goes in: its colour's, Gold, Colorless or Lands, as the cube names them. */
export function sectionFor(cube: Cube, card: { colors: string; land: boolean }, fallback: string): string {
  const have = new Set(cube.sections.map((s) => s.name));
  const pick = (...names: string[]): string => names.find((n) => have.has(n)) ?? fallback;
  if (card.land) return pick('Lands', 'Land');
  const NAME: Record<string, string> = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };
  if (card.colors.length === 1) return pick(NAME[card.colors] as string);
  if (card.colors.length >= 2) return pick('Gold', 'Multicolor', 'Multicolour');
  return pick('Colorless', 'Colourless', 'Artifacts');
}
