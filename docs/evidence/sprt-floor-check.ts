// mtg-table — the SPRT's error rates on synthetic mirror pairs, old and new minPairs / variance floor (D373).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   node docs/evidence/sprt-floor-check.ts [runs]
//
// A mirror pair is two games on one deal, A in the deal's favoured seat in one
// and B in the other.  A game is "deal-decided" with probability `c` (the
// favoured seat wins whoever sits there), otherwise A wins with the probability
// that makes A's expected score score(elo).  So most pairs split 1-1 when c is
// high, which is what the lab's mirrored search-vs-search games look like (two
// configurations that share most of their decisions).  Each setting is run at
// true Elo = elo0 (every H1 is false: alpha) and at true Elo = elo1 (every H0 is
// false: beta).

import { score, sprtState, type PairScore, type SprtParams } from '../../tools/ai-ladder/sprt.ts';
import { rng } from '../../tools/cubelab/rng.ts';

const RUNS = Number(process.argv[2] ?? 2000);

function run(trueElo: number, c: number, p: SprtParams, seed: number): { result: string; games: number } {
  const r = rng(seed, `sprt-check:${c}:${trueElo}`);
  const s = score(trueElo);
  const q = Math.min(1, Math.max(0, 0.5 + (s - 0.5) / (1 - c)));
  const pairs: PairScore[] = [];
  for (;;) {
    let w = 0;
    for (let g = 0; g < 2; g++) {
      const aFavoured = g === 0;
      w += r.next() < c ? (aFavoured ? 1 : 0) : r.next() < q ? 1 : 0;
    }
    pairs.push({ x: w / 2, games: 2 });
    const st = sprtState(pairs, p);
    if (st.result !== 'continue') return { result: st.result, games: st.games };
  }
}

const OLD = { minPairs: 8, varFloor: 0.01 };
const NEW = { minPairs: 100, varFloor: 0.05 };
const rows: string[] = [];
for (const [elo0, elo1] of [[0, 20], [20, 40]] as Array<[number, number]>) {
  for (const c of [0.5, 0.8, 0.9]) {
    for (const [name, k] of [['old (8, 0.01)', OLD], ['new (100, 0.05)', NEW]] as const) {
      const p: SprtParams = { elo0, elo1, alpha: 0.05, beta: 0.05, maxGames: 4000, ...k };
      const at = (trueElo: number) => {
        let h1 = 0, h0 = 0, games = 0, early = 0;
        for (let i = 0; i < RUNS; i++) {
          const o = run(trueElo, c, p, i);
          if (o.result === 'H1') h1++; else if (o.result === 'H0') h0++;
          games += o.games;
          if (o.games <= 60) early++;
        }
        return { h1: h1 / RUNS, h0: h0 / RUNS, games: Math.round(games / RUNS), early: early / RUNS };
      };
      const n = at(elo0), a = at(elo1);
      rows.push(`| ${elo0}/${elo1} | ${c} | ${name} | ${n.h1.toFixed(3)} | ${n.games} | ${n.early.toFixed(3)} | ${a.h0.toFixed(3)} | ${a.games} | ${a.early.toFixed(3)} |`);
    }
  }
}
console.log(`${RUNS} runs per cell; nominal alpha = beta = 0.05; at most 4,000 games.\n`);
console.log('| elo0/elo1 | deal-decided share c | minPairs, floor | false H1 at elo0 | mean games | ended by 60 games | false H0 at elo1 | mean games | ended by 60 games |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const r of rows) console.log(r);
