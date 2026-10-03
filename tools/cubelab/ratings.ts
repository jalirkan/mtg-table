// mtg-table — the cube lab: the ratings TSV.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// One line per card, `name<TAB>rating<TAB>forge<TAB>source`, `#` comments.
// `ratings init` writes it from the engine's facts: the rating starts as
// Forge's raw draft score for the card's best-ranked printing (CubeCobra's cube
// list first, then the set's own rank file — CardRanker.getRawScore) and as
// `unrated` (40) for a card Forge has no rank for, where Forge itself would
// score it -100 and draft it last.  Only the second column is read back: edit
// it to teach the drafters what you think a card is worth.  `forge` and
// `source` are there so an edited file still says where it started.

import type { Fact } from './cards.ts';

export interface RatingRow { name: string; rating: number; forge: number | null; source: string }

export function initialRating(f: Fact, unrated: number): RatingRow {
  const raw = f.rank?.rawScore;
  const ranked = f.rank && f.rank.source !== 'none' && raw !== undefined && raw > -100;
  return {
    name: f.name ?? f.listed,
    rating: ranked ? Math.round((raw as number) * 10) / 10 : unrated,
    forge: ranked ? Math.round((raw as number) * 10) / 10 : null,
    source: ranked ? `${f.rank?.source}:${f.rank?.edition}` : 'none',
  };
}

export function ratingsTsv(title: string, rows: RatingRow[], unrated: number): string {
  const out = [
    `# cube lab ratings for: ${title}`,
    '# Seeded by `tools/cubelab.sh ratings init` from Forge\'s draft ranks (CardRanker.getRawScore of the',
    `# best-ranked printing; source cube = CubeCobra's list, set = that set's rank file). A card Forge has no`,
    `# rank for starts at ${unrated}. Edit the rating column; the other two say where it started.`,
    '# name\trating\tforge\tsource',
  ];
  for (const r of rows) out.push(`${r.name}\t${r.rating}\t${r.forge ?? ''}\t${r.source}`);
  return `${out.join('\n')}\n`;
}

export function parseRatings(text: string): Map<string, number> {
  const m = new Map<string, number>();
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim() || line.startsWith('#')) return;
    const [name, rating] = line.split('\t');
    const n = Number(rating);
    if (!name || !Number.isFinite(n)) throw new Error(`ratings line ${i + 1}: want name<TAB>rating, got "${line}"`);
    m.set(name, n);
  });
  return m;
}
