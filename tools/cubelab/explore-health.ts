// mtg-table — the cube lab: an evolve folder's exploration health, as flat JSON (D356).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   node tools/cubelab/explore-health.ts <evolve-dir>
//
// Prints one JSON object of numbers for the lab runner's `metrics: x = sh: …`
// lines (PC jobs J038, J039): every finished generation's explored tables
// pooled (explore.ts's exploreHealth and judgeExplored, with the evolve.json's
// exploration settings and fdrQ), the plain drafts' design effect and mean
// card win rate per generation (their worst), and engine errors and timeouts
// split by explored and plain draft over every discovery drafts.jsonl, finished
// or not.  D356's "what would show it broken" list is what these numbers check.
// Reads files only; never starts the engine.

import fs from 'node:fs';
import path from 'node:path';

import type { GenSummary } from './evolve-report.ts';
import { exploreHealth, judgeExplored, mergeTables, type ExploreTable } from './explore.ts';

export type Flat = Record<string, number>;

interface Line { explore?: unknown; match?: { engineError?: string; games?: Array<{ timeout?: boolean }> } }

export function evolveExploreHealth(dir: string): Flat {
  const st = JSON.parse(fs.readFileSync(path.join(dir, 'evolve.json'), 'utf8')) as {
    explore?: { share: number; margin: number; minDecks: number }; knobs?: { fdrQ?: number; deadMinRating?: number };
  };
  const gens = fs.readdirSync(dir).filter((g) => /^gen-\d+$/.test(g)).sort();
  const out: Flat = { explore_on: st.explore ? 1 : 0, generations_done: 0 };
  // Engine errors and timeouts, explored vs plain, over every discovery batch written so far.
  const c = { explored: 0, plain: 0, exErr: 0, plErr: 0, exTo: 0, plTo: 0, exGames: 0, plGames: 0 };
  for (const g of gens) {
    const f = path.join(dir, g, 'run', 'drafts.jsonl');
    if (!fs.existsSync(f)) continue;
    for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!l.trim()) continue;
      const r = JSON.parse(l) as Line;
      const ex = !!r.explore;
      const games = r.match?.games ?? [];
      const to = games.filter((x) => x.timeout).length;
      if (ex) { c.explored++; c.exGames += games.length; c.exTo += to; if (r.match?.engineError) c.exErr++; } else { c.plain++; c.plGames += games.length; c.plTo += to; if (r.match?.engineError) c.plErr++; }
    }
  }
  Object.assign(out, {
    explored_drafts: c.explored, plain_drafts: c.plain,
    explored_engine_error_rate: c.explored ? c.exErr / c.explored : 0, plain_engine_error_rate: c.plain ? c.plErr / c.plain : 0,
    explored_timeout_rate: c.exGames ? c.exTo / c.exGames : 0, plain_timeout_rate: c.plGames ? c.plTo / c.plGames : 0,
  });
  // The decided generations' explored tables, pooled, and the plain drafts' numbers.
  let pooled: ExploreTable | null = null;
  let maxDeff = 0, minMean = 1, maxMean = 0, limited = 0;
  const limitedNames = new Set<string>();
  for (const g of gens) {
    const sf = path.join(dir, g, 'summary.json');
    if (!fs.existsSync(path.join(dir, g, 'result.json')) || !fs.existsSync(sf)) continue;
    const s = JSON.parse(fs.readFileSync(sf, 'utf8')) as GenSummary;
    out.generations_done = (out.generations_done ?? 0) + 1;
    maxDeff = Math.max(maxDeff, s.decision.discovery.deff);
    minMean = Math.min(minMean, s.balance.mean);
    maxMean = Math.max(maxMean, s.balance.mean);
    for (const a of s.decision.assessments) if (a.status === 'rating-limited') limitedNames.add(a.name);
    if (s.explore) pooled = pooled ? mergeTables(pooled, s.explore.table) : s.explore.table;
  }
  limited = limitedNames.size;
  Object.assign(out, { plain_deff_max: maxDeff, plain_mean_min: out.generations_done ? minMean : 0, plain_mean_max: maxMean, rating_limited: limited });
  if (pooled && st.explore) {
    const h = exploreHealth(pooled, st.explore.share);
    const j = judgeExplored(pooled, { margin: st.explore.margin, minDecks: st.explore.minDecks, q: st.knobs?.fdrQ ?? 0.1 });
    const lim = j.filter((x) => limitedNames.has(x.name));
    Object.assign(out, {
      share: h.share, share_z: h.shareZ, treated: h.treated, expected: h.expected, treated_z: h.treatedZ,
      pooled_delta: Number.isFinite(h.pooledDelta) ? h.pooledDelta : 0, pooled_se: Number.isFinite(h.pooledSe) ? h.pooledSe : 0,
      balance_diff: h.balanceDiff, targets: j.length,
      holds: j.filter((x) => x.verdict === 'holds').length, weak: j.filter((x) => x.verdict === 'weak').length,
      undecided: j.filter((x) => x.verdict === 'undecided').length, too_few: j.filter((x) => x.verdict === 'too-few').length,
      limited_judged: lim.filter((x) => x.verdict !== 'too-few').length,
      limited_min_treated: lim.length ? Math.min(...lim.map((x) => x.treatedDecks)) : 0,
      limited_median_treated: lim.length ? ([...lim].map((x) => x.treatedDecks).sort((a, b) => a - b)[Math.floor(lim.length / 2)] ?? 0) : 0,
    });
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const dir = process.argv[2];
  if (!dir) { process.stderr.write('usage: node tools/cubelab/explore-health.ts <evolve-dir>\n'); process.exit(2); }
  process.stdout.write(`${JSON.stringify(evolveExploreHealth(dir))}\n`);
}
