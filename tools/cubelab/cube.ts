// mtg-table — the cube lab: read a cube design markdown into a card list.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The format is the one Justin's two cube files under cubes/ use (D293):
//
//   ## The list (name — themes)          <- any `## The list…` heading opens the list
//   ### White (24)                       <- a section, with the count it promises
//   Thraben Inspector — ART ETB SAC · Spirited Companion — ETB SAC · …
//   WU: Reflector Mage — ETB removal · Soulherder — ETB CTR      <- a gold pair prefix
//   Shocklands: Hallowed Fountain, Watery Grave, …               <- a land line, `,` or ` · `
//   Pathways: Hengegate 4.85 · Clearwater 4.47 · …               <- front-face shorthand
//
// Items are separated by ` · `.  After a name, ` — ` starts its tags: UPPER-CASE
// codes of two to four letters are THEMES (SAC, TOK, LIFE …; a two-letter colour
// pair like WU is not one), lower-case words are ROLES (removal, counter, ramp,
// discard).  A trailing number is a price and is dropped.  A Pathway listed by
// its first word becomes "<word> Pathway", its front face — the name Forge keys
// a modal double-faced card by.  A `| Code | Theme |` table anywhere in the
// file names the themes, and a `| WU | <plan> |` table the colour pairs'
// archetypes.  Nothing here touches the engine.

export interface CubeCard {
  /** The name as Forge should look it up (front face for an MDFC). */
  name: string;
  /** The section it was listed under (`White`, `Gold`, `Lands`, …). */
  section: string;
  themes: string[];
  roles: string[];
  /** The gold pair prefix (`WU`) when the line had one. */
  pair?: string;
}

export interface CubeSection { name: string; expected: number; parsed: number }

export interface Cube {
  title: string;
  cards: CubeCard[];
  sections: CubeSection[];
  /** Theme code -> its name from the file's theme table (may be empty). */
  themeNames: Record<string, string>;
  /** Colour pair -> its plan from the file's archetype table (`| WU | Fliers, flash, tempo | … |`). */
  archetypes: Record<string, string>;
  warnings: string[];
}

const COLOUR_PAIR = /^[WUBRG]{2}$/;

/** Split one item into a name and its tags; drop a trailing price. */
export function splitItem(item: string): { name: string; themes: string[]; roles: string[] } {
  const trimmed = item.trim().replace(/\.$/, '');
  const m = /^(.*?)\s+—\s+(.*)$/.exec(trimmed);
  let name = (m ? m[1] : trimmed) ?? '';
  const tags = (m ? m[2] : '') ?? '';
  name = name.replace(/\s+\d+(\.\d+)?$/, '').trim();
  const themes: string[] = [];
  const roles: string[] = [];
  for (const t of tags.split(/\s+/).filter(Boolean)) {
    if (/^[A-Z]{2,4}$/.test(t) && !COLOUR_PAIR.test(t)) themes.push(t);
    else if (/^[a-z][a-z-]*$/.test(t)) roles.push(t);
  }
  return { name, themes, roles };
}

export function parseCube(text: string): Cube {
  const cards: CubeCard[] = [];
  const sections: CubeSection[] = [];
  const themeNames: Record<string, string> = {};
  const archetypes: Record<string, string> = {};
  const warnings: string[] = [];
  let title = '';
  let inList = false;
  let section: CubeSection | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!title) {
      const t = /^#\s+(.+)$/.exec(line);
      if (t?.[1]) { title = t[1].trim(); continue; }
    }
    const th = /^\|\s*([A-Z]{2,4})\s*\|\s*([^|]+?)\s*\|/.exec(line);
    if (th?.[1] && th[2] && !COLOUR_PAIR.test(th[1]) && th[1] !== 'Code') themeNames[th[1]] = th[2];
    if (th?.[1] && th[2] && COLOUR_PAIR.test(th[1])) archetypes[th[1]] = th[2];
    const h2 = /^##\s+(?!#)(.*)$/.exec(line);
    if (h2) { inList = /^the list/i.test(h2[1] ?? ''); section = null; continue; }
    const h3 = /^###\s+(.+?)\s*\((\d+)\)\s*$/.exec(line);
    if (h3?.[1] && inList) {
      section = { name: h3[1], expected: Number(h3[2]), parsed: 0 };
      sections.push(section);
      continue;
    }
    if (!inList || !section || !line.trim()) continue;
    const pairM = /^([WUBRG]{2}):\s*/.exec(line);
    let body = pairM ? line.slice(pairM[0].length) : line;
    const landM = /^([A-Z][A-Za-z ]*(?:lands|Lands|ways)):\s*(.*)$/.exec(body);
    let landKind: string | null = null;
    if (!pairM && landM?.[1] && landM[2] !== undefined && !landM[1].includes(' — ')) {
      landKind = landM[1];
      body = landM[2];
    }
    const items = body.includes(' · ') ? body.split(' · ') : landKind ? body.split(',') : [body];
    for (const item of items) {
      const { name: n0, themes, roles } = splitItem(item);
      if (!n0) continue;
      let name = n0;
      if (landKind && /^pathways?$/i.test(landKind) && !/Pathway$/.test(name)) name = `${name} Pathway`;
      const card: CubeCard = { name, section: section.name, themes, roles };
      if (pairM?.[1]) card.pair = pairM[1];
      cards.push(card);
      section.parsed++;
    }
  }
  for (const s of sections) {
    if (s.parsed !== s.expected) warnings.push(`section ${s.name}: parsed ${s.parsed}, the heading says ${s.expected}`);
  }
  const seen = new Set<string>();
  for (const c of cards) {
    if (seen.has(c.name)) warnings.push(`listed twice: ${c.name}`);
    seen.add(c.name);
  }
  if (sections.length === 0) warnings.push('no "## The list" section with "### Section (N)" headings found');
  return { title, cards, sections, themeNames, archetypes, warnings };
}
