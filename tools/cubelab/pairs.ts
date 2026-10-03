// mtg-table — the cube lab: a learned pair-synergy table (the synergy TSV).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// `tools/cubelab.sh learn` writes it (learn.ts, D301); `run --synergy <tsv>`
// hands it to the drafters (pick.ts) and `run --deck-synergy` to the
// deckbuilder (deck.ts).  One line per pair, `a<TAB>b<TAB>points<TAB>...`,
// `#` comments; only the first three columns are read.  Pure, no I/O.

/** Pair points by name: get(a) is a Map of partner -> points (both directions). */
export type PairTable = Map<string, Map<string, number>>;

export function parseSynergy(text: string): PairTable {
  const t: PairTable = new Map();
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim() || line.startsWith('#')) return;
    const [a, b, pts] = line.split('\t');
    const n = Number(pts);
    if (!a || !b || !Number.isFinite(n)) throw new Error(`synergy line ${i + 1}: want a<TAB>b<TAB>points, got "${line}"`);
    if (!t.has(a)) t.set(a, new Map());
    if (!t.has(b)) t.set(b, new Map());
    (t.get(a) as Map<string, number>).set(b, n);
    (t.get(b) as Map<string, number>).set(a, n);
  });
  return t;
}

/** Sum of pair points between `name` and each of `among` (by name). */
export function pairPoints(t: PairTable | undefined, name: string, among: Iterable<{ name: string }>): number {
  const row = t?.get(name);
  if (!row) return 0;
  let s = 0;
  for (const c of among) if (c.name !== name) s += row.get(c.name) ?? 0;
  return s;
}

