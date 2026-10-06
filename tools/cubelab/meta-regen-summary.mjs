#!/usr/bin/env node
// mtg-table — tools/cubelab/meta-regen-summary.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A folder of ForgeCoach meta.json files (D297), summed up: the pc-jobs job that
// regenerates them (D380) reads its metrics and checks from this.
//
//   node tools/cubelab/meta-regen-summary.mjs <dir>         # one JSON line (the job's metrics)
//   node tools/cubelab/meta-regen-summary.mjs <dir> --md    # a Markdown table, for summary.md
//
// Per file: drafts, decisive games, nonbasic lands with inDecks > 0 (of the
// cube's lands), nonland cards picked > 10 with inDecks 0, keys outside the
// cube (orphans: a lost name, D380), and Σ inDecks / decks.  Totals: written,
// min_drafts, orphans, lands_counted (files with at least one land counted),
// bad_schema.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('usage: meta-regen-summary.mjs <dir> [--md]'); process.exit(2); }
const rows = [];
let badSchema = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.meta.json')).sort()) {
  let m;
  try { m = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { badSchema++; continue; }
  if (m?.schema !== 1 || !m.cube?.cards || !m.cards || !Array.isArray(m.archetypes)) { badSchema++; continue; }
  const types = new Map(m.cube.cards.map((c) => [c.name, c.types ?? []]));
  const isLand = (n) => (types.get(n) ?? []).includes('Land');
  const lands = m.cube.cards.filter((c) => isLand(c.name)).map((c) => c.name);
  const decks = m.archetypes.reduce((s, a) => s + a.decks, 0);
  const sum = Object.values(m.cards).reduce((s, c) => s + (c.inDecks ?? 0), 0);
  rows.push({
    file: f,
    drafts: m.sample?.drafts ?? 0,
    games: m.sample?.games ?? 0,
    lands: lands.length,
    landsPlayed: lands.filter((n) => (m.cards[n]?.inDecks ?? 0) > 0).length,
    pickedNeverBuilt: Object.entries(m.cards).filter(([n, c]) => !isLand(n) && c.picked > 10 && c.inDecks === 0).length,
    orphans: Object.keys(m.cards).filter((n) => !types.has(n)).length,
    perDeck: decks ? Math.round((sum / decks) * 100) / 100 : 0,
    kb: Math.round(statSync(join(dir, f)).size / 1024),
  });
}
const out = {
  written: rows.length,
  min_drafts: rows.length ? Math.min(...rows.map((r) => r.drafts)) : 0,
  orphans: rows.reduce((s, r) => s + r.orphans, 0),
  lands_counted: rows.filter((r) => r.landsPlayed > 0).length,
  bad_schema: badSchema,
};
if (process.argv.includes('--md')) {
  console.log('| file | drafts | decisive games | lands played / in cube | nonland picked > 10, never built | keys outside the cube | Σ inDecks / deck | KB |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.file} | ${r.drafts} | ${r.games} | ${r.landsPlayed} / ${r.lands} | ${r.pickedNeverBuilt} | ${r.orphans} | ${r.perDeck} | ${r.kb} |`);
  console.log('');
  console.log(`totals: ${JSON.stringify(out)}${badSchema ? ` (${badSchema} file(s) not schema 1)` : ''}`);
} else {
  console.log(JSON.stringify(out));
}
