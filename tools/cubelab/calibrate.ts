// mtg-table — the cube lab: `calibrate`, two batches with nothing changed, read against the binomial (D376).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   node tools/cubelab/calibrate.ts <runA> <runB> --cube cubes/omega-cube-180.md \
//       --pool cubes/omega-seed-pool.tsv [--notes cubes/omega-notes.tsv] [--min-games 100] [--json out.json]
//       [--first N] [--slice N] [--flat]
//
// The calibration job's reader (J072; the methods review of 2026-10-04, rec. 1,
// and docs/evidence/evolve-calibration.md).  Two cube-lab run folders that
// differ only in their seeds (same cube, ratings, builder, best-of, AI) are
// two draws of the same thing.  The reader reports:
//
//   per card, per colour, per colour pair: the win-rate difference between the
//     batches against what the binomial alone allows.  `dispersion` is the mean
//     of z^2, z = (r_A - r_B) / sqrt(p(1-p)(1/n_A + 1/n_B)) over the groups with
//     at least --min-games decisive games in both batches: about 1 when the
//     binomial describes the data, the realised design effect when it does not.
//     `sdRatio` is the RMS difference over its binomial RMS (sqrt(dispersion)
//     with the groups weighted alike);
//   per batch: evolve's own deck-level design effect (batchDeff), the mean card
//     win rate, and evolve's discovery stage run on it (discoveryStage, the
//     exact code a generation runs): its candidates are discoveries in a cube
//     where nothing changed, so each one's rate in the OTHER batch is shown,
//     with the rate its decks' colour pairs would give it (the colour-adjusted
//     expectation the evidence file argues for);
//   per batch, the same discovery stage on D377's colour-adjusted null
//     (colour-null.ts; `winNull: 'colour'`, what a new evolve run uses): in a
//     cube where nothing changed every one of its candidates is a FALSE
//     candidate, so `colourCandidates` is the rule's false-candidate count per
//     batch -- D377's simulation expects about 0.05 a batch (P(>= 1) about
//     0.05) at J039's size, where the mean null's expects about 3;
//   --first N: each batch is read as its first N drafts by seed (a
//     discovery-sized batch);
//   --slice N (D377): each batch is also cut, by seed, into disjoint slices of
//     N drafts (a remainder under N is dropped), and both nulls' discovery
//     stage is run on every slice, so one night gives several discovery-sized
//     replications of the false-candidate count (`slices` in the JSON;
//     `slices`, `slice_false_colour_*` and `slice_false_mean_*` in --flat);
//   the pool's load and the games' AI clocks (D376 stamps, when present):
//     matches in progress and the 1-minute load average when each match ended,
//     watchdog timeouts, and the game thread's CPU share of wall time.
//
// Nothing here is a test with a verdict: it is the number D331, D357 and the
// SPRT floor should have been calibrated on.

import fs from 'node:fs';
import path from 'node:path';

import { parseCube } from './cube.ts';
import { balanceOf, batchDeff, batchStats, discoveryStage, EVOLVE_DEFAULTS, evolveCards, parseNotes, parsePool, type Balance, type CardStat } from './evolve.ts';
import { playedDeck, type CardInfo } from './report.ts';
import type { DraftRecord, RunMeta } from './run.ts';

export interface Batch { dir: string; meta: RunMeta; cards: Record<string, CardInfo>; recs: DraftRecord[] }

export function readBatch(dir: string): Batch {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8')) as RunMeta;
  const cf = path.join(dir, 'cards.json');
  const cards = (fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf, 'utf8')) : {}) as Record<string, CardInfo>;
  const jl = path.join(dir, 'drafts.jsonl');
  const recs = fs.existsSync(jl) ? fs.readFileSync(jl, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as DraftRecord) : [];
  return { dir, meta, cards, recs };
}

export interface Tally { wins: number; games: number }
export interface GroupDiff { key: string; a: Tally; b: Tally; rA: number; rB: number; z: number }
export interface Dispersion { groups: number; dispersion: number; sdRatio: number; rmsDiff: number; rmsBinomial: number; worst: GroupDiff[] }

/** Between-batch dispersion of grouped win rates against the binomial (groups with >= minGames decisive games in both). */
export function dispersion(a: Map<string, Tally>, b: Map<string, Tally>, minGames: number): Dispersion {
  const rows: GroupDiff[] = [];
  let sq = 0, bin = 0;
  for (const [key, ta] of a) {
    const tb = b.get(key);
    if (!tb || ta.games < minGames || tb.games < minGames) continue;
    const rA = ta.wins / ta.games, rB = tb.wins / tb.games;
    const p = (ta.wins + tb.wins) / (ta.games + tb.games);
    const v = p * (1 - p) * (1 / ta.games + 1 / tb.games);
    if (!(v > 0)) continue;
    rows.push({ key, a: ta, b: tb, rA, rB, z: (rA - rB) / Math.sqrt(v) });
    sq += (rA - rB) ** 2;
    bin += v;
  }
  const n = rows.length;
  const disp = n ? rows.reduce((s, r) => s + r.z * r.z, 0) / n : NaN;
  return {
    groups: n, dispersion: disp, sdRatio: n ? Math.sqrt(sq / bin) : NaN,
    rmsDiff: n ? Math.sqrt(sq / n) : NaN, rmsBinomial: n ? Math.sqrt(bin / n) : NaN,
    worst: [...rows].sort((x, y) => Math.abs(y.z) - Math.abs(x.z)).slice(0, 8),
  };
}

const isPlain = (r: DraftRecord): boolean => !(r as { explore?: unknown }).explore;

/** Decisive games and wins of each colour, each colour pair (the deck's main colours), from the plain drafts. */
export function deckTallies(recs: DraftRecord[], cards: Record<string, CardInfo>): { colours: Map<string, Tally>; pairs: Map<string, Tally> } {
  const colours = new Map<string, Tally>(), pairs = new Map<string, Tally>();
  const add = (m: Map<string, Tally>, k: string, w: number, g: number): void => { const t = m.get(k) ?? { wins: 0, games: 0 }; t.wins += w; t.games += g; m.set(k, t); };
  for (const rec of recs.filter(isPlain)) {
    const dec = rec.match.games.filter((g) => g.winner === 'A' || g.winner === 'B');
    if (!dec.length) continue;
    const winsA = dec.filter((g) => g.winner === 'A').length;
    for (const k of [0, 1] as const) {
      const key = playedDeck(rec, k, cards).key;
      const w = k === 0 ? winsA : dec.length - winsA;
      add(pairs, key, w, dec.length);
      for (const c of new Set(key.split('')).values()) if ('WUBRG'.includes(c)) add(colours, c, w, dec.length);
    }
  }
  return { colours, pairs };
}

/** Each card's expected win rate if it won exactly as its decks' colour pairs did in this batch (its own games left in). */
export function colourExpected(recs: DraftRecord[], cards: Record<string, CardInfo>, pairRate: Map<string, number>): Map<string, number> {
  const num = new Map<string, number>(), den = new Map<string, number>();
  for (const rec of recs.filter(isPlain)) {
    const n = rec.match.games.filter((g) => g.winner === 'A' || g.winner === 'B').length;
    if (!n) continue;
    for (const k of [0, 1] as const) {
      const d = playedDeck(rec, k, cards);
      const r = pairRate.get(d.key);
      if (r === undefined) continue;
      for (const [, name] of d.main) {
        num.set(name, (num.get(name) ?? 0) + n * r);
        den.set(name, (den.get(name) ?? 0) + n);
      }
    }
  }
  return new Map([...num].map(([k, v]) => [k, v / (den.get(k) as number)]));
}

interface LoadSummary { matches: number; stamped: number; busyMean: number | null; load1Mean: number | null; load1Max: number | null; timeouts: number; games: number; cpuShare: number | null }

/** The D376 stamps and the games' clocks: what the pool looked like while this batch played. */
export function loadSummary(recs: DraftRecord[]): LoadSummary {
  const st = recs.map((r) => r.match.load).filter((x): x is NonNullable<typeof x> => !!x);
  const games = recs.flatMap((r) => r.match.games);
  const cpu = games.filter((g) => g.gameCpuMs !== undefined && g.ms > 0);
  const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return {
    matches: recs.length, stamped: st.length, busyMean: mean(st.map((x) => x.busy)), load1Mean: mean(st.map((x) => x.load1 / Math.max(1, x.cpus))),
    load1Max: st.length ? Math.max(...st.map((x) => x.load1 / Math.max(1, x.cpus))) : null,
    timeouts: games.filter((g) => g.timeout).length, games: games.length,
    cpuShare: cpu.length ? cpu.reduce((s, g) => s + (g.gameCpuMs as number), 0) / cpu.reduce((s, g) => s + g.ms, 0) : null,
  };
}

export interface Opts { cube: string; pool: string; notes?: string; minGames: number; first?: number; slice?: number }

/** A batch's first `n` drafts by seed (all of them when n is absent). */
export function firstDrafts(X: Batch, n?: number): Batch {
  if (!n) return X;
  return { ...X, recs: [...X.recs].sort((a, b) => a.seed - b.seed).slice(0, n) };
}

/** A batch cut by seed into disjoint slices of `n` drafts; a remainder under n is dropped. */
export function slicesOf(X: Batch, n: number): Batch[] {
  const recs = [...X.recs].sort((a, b) => a.seed - b.seed);
  const out: Batch[] = [];
  for (let i = 0; i + n <= recs.length; i += n) out.push({ ...X, dir: `${X.dir}#${out.length + 1}`, recs: recs.slice(i, i + n) });
  return out;
}

export interface SliceCount { dir: string; drafts: number; seeds: [number, number]; mean: number; colour: number; colourNames: string[]; colourWinTests: number }

export function calibrate(A0: Batch, B0: Batch, o: Opts): Record<string, unknown> {
  const A = firstDrafts(A0, o.first), B = firstDrafts(B0, o.first);
  const cube = parseCube(fs.readFileSync(o.cube, 'utf8'));
  const pool = parsePool(fs.readFileSync(o.pool, 'utf8'));
  const poolBy = new Map(pool.map((p) => [p.name, p]));
  const notes = o.notes ? parseNotes(fs.readFileSync(o.notes, 'utf8')) : new Map();
  const cards = evolveCards(cube, poolBy);
  const one = (X: Batch) => {
    const b = batchStats(X.meta, X.cards, X.recs, cube);
    const balance: Balance = balanceOf(b.metaDoc);
    const stage = discoveryStage({ cards, stats: b.stats, balance, drafts: X.recs.length, notes, knobs: EVOLVE_DEFAULTS, deff: b.deff, winNull: 'mean' });
    const colourStage = discoveryStage({ cards, stats: b.stats, balance, drafts: X.recs.length, notes, knobs: EVOLVE_DEFAULTS, deff: b.deff, winNull: 'colour' });
    const t = deckTallies(X.recs, X.cards);
    const pairRate = new Map([...t.pairs].map(([k, v]) => [k, v.wins / v.games]));
    const winTests = [...stage.disc.tests.entries()].filter(([k]) => k.endsWith('|dominant-win')).map(([, v]) => v);
    const colourWinTests = [...colourStage.disc.tests.entries()].filter(([k]) => k.endsWith('|dominant-win')).map(([, v]) => v);
    return { b, balance, stage, colourStage, t, colourExp: colourExpected(X.recs, X.cards, pairRate), winTests, colourWinTests, deff: batchDeff(X.recs.filter(isPlain)) };
  };
  const a = one(A), b = one(B);
  // D377: both nulls' discovery on every discovery-sized slice (nothing changed between them, so every candidate is false).
  const slices: SliceCount[] = o.slice ? [A, B].flatMap((X) => slicesOf(X, o.slice as number)).map((X) => {
    const st = batchStats(X.meta, X.cards, X.recs, cube);
    const balance = balanceOf(st.metaDoc);
    const stage = (winNull: 'mean' | 'colour') => discoveryStage({ cards, stats: st.stats, balance, drafts: X.recs.length, notes, knobs: EVOLVE_DEFAULTS, deff: st.deff, winNull });
    const m = stage('mean'), c = stage('colour');
    return {
      dir: X.dir, drafts: X.recs.length, seeds: [X.recs[0]?.seed ?? 0, X.recs[X.recs.length - 1]?.seed ?? 0], mean: balance.mean,
      colour: c.candidates.length, colourNames: c.candidates.map((x) => x.name), colourWinTests: [...c.disc.tests.keys()].filter((k) => k.endsWith('|dominant-win')).length,
      meanCandidates: m.candidates.length, meanNames: m.candidates.map((x) => x.name),
    } as SliceCount & { meanCandidates: number; meanNames: string[] };
  }) : [];
  const cardTally = (s: Map<string, CardStat>): Map<string, Tally> => new Map([...s.values()].filter((c) => cards.some((x) => x.name === c.name && !x.land)).map((c) => [c.name, { wins: c.wins, games: c.games }]));
  const cand = (from: typeof a, other: typeof a, otherStats: Map<string, CardStat>, nul: 'mean' | 'colour' = 'mean') => (nul === 'mean' ? from.stage : from.colourStage).candidates.map((c) => {
    const s = from.b.stats.get(c.name) as CardStat;
    const t = otherStats.get(c.name);
    return {
      name: c.name, status: c.status, rate: s.games ? s.wins / s.games : null, games: s.games, colourExpected: from.colourExp.get(c.name) ?? null,
      otherRate: t && t.games ? t.wins / t.games : null, otherGames: t?.games ?? 0, otherColourExpected: other.colourExp.get(c.name) ?? null,
      // D377's own baseline (its matches left out, shrunk) and test, in this batch and the other
      colourNull: s.colour?.p0 ?? null, otherColourNull: t?.colour?.p0 ?? null, test: c.test ?? null,
    };
  });
  return {
    batches: [A, B].map((X, i) => {
      const s = i === 0 ? a : b;
      return {
        dir: X.dir, drafts: X.recs.length, plain: X.recs.filter(isPlain).length, seeds: [Math.min(...X.recs.map((r) => r.seed)), Math.max(...X.recs.map((r) => r.seed))],
        mean: s.balance.mean, deff: s.deff, family: s.stage.disc.family, candidates: s.stage.candidates.length,
        winTestsAtP002: s.winTests.filter((t) => t.p <= 0.002).length, winTests: s.winTests.length,
        // D377: the colour-adjusted rule on the same batch; every candidate is a false one
        colourCandidates: s.colourStage.candidates.length, colourFamily: s.colourStage.disc.family,
        colourWinTestsAtP05: s.colourWinTests.filter((t) => t.p <= 0.05).length,
        colourWinTestsAtP002: s.colourWinTests.filter((t) => t.p <= 0.002).length, colourWinTests: s.colourWinTests.length,
        load: loadSummary(X.recs),
      };
    }),
    cards: dispersion(cardTally(a.b.stats), cardTally(b.b.stats), o.minGames),
    colours: dispersion(a.t.colours, b.t.colours, o.minGames),
    pairs: dispersion(a.t.pairs, b.t.pairs, o.minGames),
    candidatesA: cand(a, b, b.b.stats),
    candidatesB: cand(b, a, a.b.stats),
    colourCandidatesA: cand(a, b, b.b.stats, 'colour'),
    colourCandidatesB: cand(b, a, a.b.stats, 'colour'),
    slices,
  };
}

/** The runner's flat numbers (pc-jobs `metrics:`). */
export function flat(r: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  const bs = r.batches as Array<Record<string, unknown>>;
  bs.forEach((x, i) => {
    const k = i === 0 ? 'a' : 'b';
    for (const f of ['drafts', 'plain', 'mean', 'deff', 'family', 'candidates', 'winTestsAtP002']) out[`${k}_${f}`] = Number(x[f]);
    out[`${k}_colour_candidates`] = Number(x.colourCandidates);
    out[`${k}_colour_win_tests`] = Number(x.colourWinTests);
    out[`${k}_colour_win_p05`] = Number(x.colourWinTestsAtP05);
    out[`${k}_colour_win_p002`] = Number(x.colourWinTestsAtP002);
    const l = x.load as LoadSummary;
    out[`${k}_load_stamped`] = l.stamped;
    out[`${k}_timeouts`] = l.timeouts;
  });
  for (const g of ['cards', 'colours', 'pairs']) {
    const d = r[g] as Dispersion;
    out[`${g}_groups`] = d.groups; out[`${g}_dispersion`] = d.dispersion; out[`${g}_sd_ratio`] = d.sdRatio;
  }
  const sl = (r.slices ?? []) as Array<SliceCount & { meanCandidates: number }>;
  out.slices = sl.length;
  if (sl.length) {
    const col = sl.map((x) => x.colour), mean = sl.map((x) => x.meanCandidates);
    const avg = (xs: number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;
    out.slice_false_colour_mean = avg(col);
    out.slice_false_colour_max = Math.max(...col);
    out.slice_false_colour_any = col.filter((x) => x > 0).length;
    out.slice_false_mean_mean = avg(mean);
    out.slice_false_mean_max = Math.max(...mean);
  }
  return out;
}

function main(argv: string[]): number {
  const pos: string[] = [];
  const f = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i] as string;
    if (x.startsWith('--')) f.set(x.slice(2), argv[++i] ?? '');
    else pos.push(x);
  }
  if (pos.length !== 2 || !f.get('cube') || !f.get('pool')) {
    console.error('usage: node tools/cubelab/calibrate.ts <runA> <runB> --cube <cube.md> --pool <seed-pool.tsv> [--notes <notes.tsv>] [--min-games 100] [--json out.json] [--first N] [--slice N] [--flat]');
    return 2;
  }
  const r = calibrate(readBatch(pos[0] as string), readBatch(pos[1] as string),
    { cube: f.get('cube') as string, pool: f.get('pool') as string, notes: f.get('notes'), minGames: Number(f.get('min-games') ?? 100),
      ...(f.has('first') ? { first: Number(f.get('first')) } : {}), ...(f.has('slice') ? { slice: Number(f.get('slice')) } : {}) });
  if (f.has('json')) fs.writeFileSync(f.get('json') as string, `${JSON.stringify(r, null, 1)}\n`);
  if (f.has('flat')) { console.log(JSON.stringify(flat(r))); return 0; }
  const p = (x: number | null): string => (x === null || !Number.isFinite(x) ? '-' : x.toFixed(3));
  for (const b of r.batches as Array<Record<string, any>>) {
    console.log(`${b.dir}: ${b.drafts} drafts (${b.plain} plain), seeds ${b.seeds[0]}-${b.seeds[1]}; mean ${p(b.mean)}, deck-level design effect ${p(b.deff)}; `
      + `discovery: ${b.candidates} candidate(s) of ${b.family} tests, ${b.winTestsAtP002} dominant-win test(s) at p <= 0.002 of ${b.winTests}`);
    console.log(`  colour-adjusted null (D377): ${b.colourCandidates} FALSE candidate(s) of ${b.colourFamily} tests; dominant-win tests at p <= 0.05: `
      + `${b.colourWinTestsAtP05} of ${b.colourWinTests} (uniform: ${(0.05 * b.colourWinTests).toFixed(1)}), at p <= 0.002: ${b.colourWinTestsAtP002} (uniform: ${(0.002 * b.colourWinTests).toFixed(2)})`);
    const l = b.load as LoadSummary;
    console.log(`  load (D376): ${l.stamped} of ${l.matches} matches stamped; busy ${p(l.busyMean)}, load1/core mean ${p(l.load1Mean)} max ${p(l.load1Max)}; `
      + `${l.timeouts} watchdog timeout(s) in ${l.games} games; game-thread CPU / wall ${p(l.cpuShare)}`);
  }
  for (const g of ['cards', 'colours', 'pairs']) {
    const d = r[g] as Dispersion;
    console.log(`${g}: ${d.groups} groups with >= ${f.get('min-games') ?? 100} games in both; dispersion (mean z^2, 1 = binomial) ${p(d.dispersion)}; `
      + `RMS difference ${p(d.rmsDiff)} vs binomial ${p(d.rmsBinomial)} (ratio ${p(d.sdRatio)})`);
    for (const w of d.worst.slice(0, 4)) console.log(`    ${w.key}: ${p(w.rA)} (${w.a.games}) vs ${p(w.rB)} (${w.b.games}), z ${w.z.toFixed(2)}`);
  }
  for (const x of (r.slices ?? []) as Array<SliceCount & { meanCandidates: number; meanNames: string[] }>) {
    console.log(`slice ${x.dir}: ${x.drafts} drafts, seeds ${x.seeds[0]}-${x.seeds[1]}, mean ${p(x.mean)}; FALSE candidates on the colour null (D377) ${x.colour}`
      + `${x.colour ? ` (${x.colourNames.join(', ')})` : ''}, on the mean null ${x.meanCandidates}${x.meanCandidates ? ` (${x.meanNames.join(', ')})` : ''}`);
  }
  for (const [lab, list] of [['A', r.colourCandidatesA], ['B', r.colourCandidatesB]] as const) {
    for (const c of list as Array<Record<string, any>>) {
      console.log(`FALSE candidate in ${lab} on the colour-adjusted null (D377): ${c.name} ${c.status} ${p(c.rate)} over ${c.games} against ${p(c.colourNull)}; `
        + `in the other batch ${p(c.otherRate)} over ${c.otherGames} against ${p(c.otherColourNull)}`);
    }
  }
  for (const [lab, list] of [['A', r.candidatesA], ['B', r.candidatesB]] as const) {
    for (const c of list as Array<Record<string, any>>) {
      console.log(`candidate in ${lab} (nothing changed): ${c.name} ${c.status} ${p(c.rate)} over ${c.games} (colour pairs say ${p(c.colourExpected)}); `
        + `in the other batch ${p(c.otherRate)} over ${c.otherGames} (colour pairs say ${p(c.otherColourExpected)})`);
    }
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));
