// mtg-table — the cube lab: `ratings apply`, the reproducible step that turns D356's exploration verdicts into a ratings TSV (D360).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh ratings apply <cube.md> --from <evolve-dir | changelog.md> --rule explore-eb --out <tsv>
//       [--base <tsv>]            the ratings the evolve drafted with (default: Forge's ranks, as `ratings init`)
//       [--report <md>]           the diff report (default: <out> with .md for .tsv); a .json beside it
//       [--from-label <text>]     how the report names the evidence (e.g. where a PC job's changelog came from)
//       [--raise name=value]...   effect=0.1 topQuantile=0.9 pointsPerWin=auto
//       [--explore name=value]... the evolve's exploration, for a changelog's replay: share=0.3 cap=4 gold=4 below=60
//
// EVIDENCE.  An evolve folder (`--from var/cubelab/evolve/<x>`) is read exactly:
// every generation's explored table (gen-NN/summary.json) pooled and judged as
// the changelog judges it (evolve.json's margin, minDecks and fdrQ), and what
// each forced card replaced from gen-NN/run/drafts.jsonl.  A changelog alone (a
// PC job's collected `changelog.md`) gives the pooled table as printed (deltas
// and intervals to two decimals; se = interval width / 3.92) and the
// generations' discovery seeds; what each forced card replaced is then
// REPLAYED: drafts and decks are a pure function of the cube, ratings, weights
// and seed (D294) and exploration's draws have streams of their own (D356), so
// the explored decks are re-made without the engine's games.  The replay must
// reproduce the changelog's explored-draft count and every card's forced decks
// and expected count, or the command refuses: a replay that differs is not the
// run's.

import fs from 'node:fs';
import path from 'node:path';

import type { Fact } from './cards.ts';
import { parseCube } from './cube.ts';
import { engineEnv, engineFacts } from './engine.ts';
import { EXPLORE_DEFAULTS, exploreDraft, type ExploreSeat, type ExploreTable } from './explore.ts';
import { loadCube, runDraft } from './lab.ts';
import {
  anchorsOf, applyToTsv, parseExploreChangelog, raiseRatings, raiseReport, rowsFromTables, RAISE_DEFAULTS, RAISE_RULES,
  type Anchor, type ChangelogExplore, type JudgedRow, type RaiseOptions, type RaiseResult, type RaiseRule,
} from './raise.ts';
import { initialRating, parseRatings, ratingsTsv } from './ratings.ts';
import { DEFAULT_WEIGHTS, type Weights } from './weights.ts';
import { fileLines } from './lines.ts';

export interface Evidence { rows: JudgedRow[]; anchors: Map<string, Anchor>; from: string; anchorsFrom: string }

interface SeatLine { explore?: { seats: Array<ExploreSeat | null> } }

/** An evolve folder's pooled exploration, judged, and what every forced card replaced. */
export function evidenceFromFolder(dir: string, rating: (name: string) => number | undefined): Evidence {
  const st = JSON.parse(fs.readFileSync(path.join(dir, 'evolve.json'), 'utf8')) as {
    explore?: { margin: number; minDecks: number }; knobs?: { fdrQ?: number };
  };
  if (!st.explore) throw new Error(`${dir}: the evolve did not explore (no "explore" in evolve.json)`);
  const gens = fs.readdirSync(dir).filter((g) => /^gen-\d+$/.test(g)).sort();
  const tables: ExploreTable[] = [];
  const seats: Array<ExploreSeat | null> = [];
  for (const g of gens) {
    const sf = path.join(dir, g, 'summary.json');
    if (!fs.existsSync(path.join(dir, g, 'result.json')) || !fs.existsSync(sf)) continue;   // decided generations only
    const s = JSON.parse(fs.readFileSync(sf, 'utf8')) as { explore?: { table: ExploreTable } };
    if (!s.explore) continue;
    tables.push(s.explore.table);
    const jf = path.join(dir, g, 'run', 'drafts.jsonl');
    if (!fs.existsSync(jf)) throw new Error(`${jf} is missing: the anchors need the explored drafts`);
    for (const l of fileLines(jf)) if (l.trim()) seats.push(...((JSON.parse(l) as SeatLine).explore?.seats ?? []));
  }
  const rows = rowsFromTables(tables, { margin: st.explore.margin, minDecks: st.explore.minDecks, q: st.knobs?.fdrQ ?? 0.1 });
  return { rows, anchors: anchorsOf(seats, rating), from: `${dir} (${tables.length} generation(s), pooled exactly)`, anchorsFrom: `${dir}/gen-*/run/drafts.jsonl` };
}

/** What a replay of the explored drafts found, to hold against the changelog. */
export interface Replay { drafts: number; explored: number; forced: Map<string, number>; expected: Map<string, number>; seats: Array<ExploreSeat | null> }

/** Every way the replay differs from the changelog's table (empty: it is the run's). */
export function replayProblems(cl: ChangelogExplore, r: Replay): string[] {
  const out: string[] = [];
  if (Number.isFinite(cl.drafts) && r.drafts !== cl.drafts) out.push(`replayed ${r.drafts} drafts, the changelog has ${cl.drafts}`);
  if (Number.isFinite(cl.explored) && r.explored !== cl.explored) out.push(`replay explored ${r.explored} drafts, the changelog ${cl.explored}`);
  for (const row of cl.rows) {
    const f = r.forced.get(row.name) ?? 0;
    const e = r.expected.get(row.name) ?? 0;
    if (f !== row.forcedDecks) out.push(`${row.name}: replay forced ${f} deck(s), the changelog ${row.forcedDecks}`);
    if (Math.abs(e - row.expected) > 0.05 + 1e-9) out.push(`${row.name}: replay expected ${e.toFixed(2)}, the changelog ${row.expected}`);
  }
  for (const n of r.expected.keys()) if (!cl.rows.some((x) => x.name === n)) out.push(`${n}: a target in the replay, not in the changelog`);
  return out;
}

/** Re-make the explored drafts of the changelog's discovery seeds (no games: drafts and decks only). */
export function replayExplored(cubeText: string, facts: Fact[], ratings: Map<string, number> | null, w: Weights,
  seeds: Array<[number, number]>, ex: { share: number; cap: number; gold: number; below: number }): Replay {
  const lc = loadCube(parseCube(cubeText), facts, ratings, w);
  const maxSplash = (s: boolean): number => (s ? w.maxSplashStretch : w.maxSplash);
  const r: Replay = { drafts: 0, explored: 0, forced: new Map(), expected: new Map(), seats: [] };
  for (const [a, b] of seeds) {
    for (let s = a; s <= b; s++) {
      r.drafts++;
      const d = exploreDraft(runDraft(lc, 'grid', s, w, 90), ex, lc.byName, maxSplash);
      if (!d.explore) continue;
      r.explored++;
      for (const seat of d.explore.seats) {
        r.seats.push(seat);
        if (!seat) continue;
        for (const [n, p] of seat.eligible) r.expected.set(n, (r.expected.get(n) ?? 0) + p);
        if (seat.in) r.forced.set(seat.in, (r.forced.get(seat.in) ?? 0) + 1);
      }
    }
  }
  return r;
}

export interface Applied { result: RaiseResult; tsv: string; report: string; json: string }

/** The rule on the evidence, and the files it writes. */
export function applyRaise(inp: {
  facts: Fact[]; cubeNames: string[]; baseText: string; baseName: string; evidence: Evidence;
  rule: RaiseRule; options: RaiseOptions; date: string;
}): Applied {
  const base = parseRatings(inp.baseText);
  const byListed = new Map(inp.facts.map((f) => [f.listed, f]));
  const nonland: number[] = [];
  const aiLimited = new Set<string>();
  for (const n of inp.cubeNames) {
    const f = byListed.get(n);
    if (!f?.found) continue;
    const name = f.name ?? n;
    if (f.remAIDeck || f.remRandomDeck) aiLimited.add(name);
    const r = base.get(name) ?? base.get(n);
    if (!f.land && r !== undefined) nonland.push(r);
  }
  const result = raiseRatings({ rows: inp.evidence.rows, anchors: inp.evidence.anchors, base, nonlandRatings: nonland, aiLimited }, inp.options, inp.rule);
  const header = [
    `D360 (${inp.date}): ${result.changes.length} rating(s) raised by \`ratings apply --rule ${inp.rule}\` from ${inp.evidence.from};`,
    `base ${inp.baseName}. Every other line is the base's. The report beside this file lists each change with its evidence.`,
  ];
  const tsv = applyToTsv(inp.baseText, result.changes, header);
  const report = raiseReport(result, { from: inp.evidence.from, base: inp.baseName, anchors: inp.evidence.anchorsFrom });
  const json = `${JSON.stringify({ v: 1, decision: 'D360', date: inp.date, from: inp.evidence.from, anchors: inp.evidence.anchorsFrom, base: inp.baseName, ...result }, null, 1)}\n`;
  return { result, tsv, report, json };
}

function parseKv(args: string[], into: Record<string, number | null>, what: string): void {
  for (const a of args) for (const part of a.split(',')) {
    const m = /^([A-Za-z]+)=(.+)$/.exec(part.trim());
    if (!m || !((m[1] as string) in into)) throw new Error(`--${what}: want name=value with name one of ${Object.keys(into).join(', ')}, got "${part}"`);
    const v = m[2] === 'auto' ? null : Number(m[2]);
    if (v !== null && !Number.isFinite(v)) throw new Error(`--${what} ${m[1]}: not a number: ${m[2]}`);
    into[m[1] as string] = v;
  }
}

/** `ratings apply`: the CLI glue (engine facts from the cache, files in and out). */
export function ratingsApply(repo: string, cubeFile: string, f: Map<string, string[]>, say: (s: string) => void): number {
  const one = (k: string): string | undefined => f.get(k)?.at(-1);
  const from = one('from');
  const out = one('out');
  const rule = (one('rule') ?? '') as RaiseRule;
  if (!from || !out || !RAISE_RULES.includes(rule)) throw new Error(`ratings apply <cube.md> --from <evolve-dir|changelog.md> --rule ${RAISE_RULES.join('|')} --out <tsv> [--base <tsv>] [--report <md>]`);
  const options: RaiseOptions = { ...RAISE_DEFAULTS };
  parseKv(f.get('raise') ?? [], options as unknown as Record<string, number | null>, 'raise');
  const ex: Record<string, number | null> = { ...EXPLORE_DEFAULTS, below: 60 };
  parseKv(f.get('explore') ?? [], ex, 'explore');
  const env = engineEnv(repo);
  const cubeText = fs.readFileSync(cubeFile, 'utf8');
  const cube = parseCube(cubeText);
  const names = cube.cards.map((c) => c.name);
  const facts = engineFacts(env, names, say);
  const baseFile = one('base');
  const baseText = baseFile ? fs.readFileSync(baseFile, 'utf8')
    : ratingsTsv(cube.title, facts.filter((x) => x.found).map((x) => initialRating(x, DEFAULT_WEIGHTS.unrated)), DEFAULT_WEIGHTS.unrated);
  const baseName = baseFile ? path.relative(repo, path.resolve(baseFile)) : "Forge's ranks (as `ratings init` writes them)";
  const base = parseRatings(baseText);
  let evidence: Evidence;
  if (fs.statSync(from).isDirectory()) {
    evidence = evidenceFromFolder(from, (n) => base.get(n));
    if (one('from-label')) evidence.from = `${one('from-label')} (${evidence.from})`;
  } else {
    const cl = parseExploreChangelog(fs.readFileSync(from, 'utf8'));
    if (cl.provisional) throw new Error(`${from}: the exploration table is provisional (generations still to run); D356 reads it once, at the end`);
    if (!cl.seeds.length) throw new Error(`${from}: no "Discovery: ... seeds a–b" lines to replay`);
    say(`replaying ${cl.seeds.reduce((s, [a, b]) => s + b - a + 1, 0)} discovery draft(s) (${cl.seeds.map(([a, b]) => `${a}–${b}`).join(', ')}) without games, for what each forced card replaced ...`);
    const r = replayExplored(cubeText, facts, baseFile ? base : null, DEFAULT_WEIGHTS, cl.seeds,
      { share: ex.share as number, cap: ex.cap as number, gold: ex.gold as number, below: ex.below as number });
    const bad = replayProblems(cl, r);
    if (bad.length) throw new Error(`the replay is not the run's (cube, ratings, weights or exploration differ), so its anchors would be wrong:\n  ${bad.slice(0, 12).join('\n  ')}`);
    say(`replay matches the changelog: ${r.explored} of ${r.drafts} drafts explored, every card's forced and expected decks`);
    evidence = {
      rows: cl.rows, anchors: anchorsOf(r.seats, (n) => base.get(n)),
      from: `${one('from-label') ?? path.relative(repo, path.resolve(from))} (pooled table as printed)`,
      anchorsFrom: `a replay of seeds ${cl.seeds.map(([a, b]) => `${a}–${b}`).join(', ')} (no games), matched to the changelog`,
    };
  }
  const date = one('date') ?? new Date().toISOString().slice(0, 10);
  const a = applyRaise({ facts, cubeNames: names, baseText, baseName, evidence, rule, options, date });
  const reportFile = one('report') ?? out.replace(/\.tsv$/, '') + '.md';
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, a.tsv);
  fs.writeFileSync(reportFile, a.report);
  fs.writeFileSync(reportFile.replace(/\.md$/, '') + '.json', a.json);
  say(`${a.result.changes.length} rating(s) raised, ${a.result.kept.length} judged card(s) unchanged (tau ${Math.sqrt(a.result.tau2).toFixed(3)}, ${a.result.pointsPerWin.toFixed(0)} points per unit of win rate, top-pick line ${a.result.top})`);
  for (const c of a.result.changes) say(`  ${c.name}: ${c.old} -> ${c.new}  (delta ${c.delta.toFixed(2)}, shrunk ${c.shrunk.toFixed(3)}, replaced ${c.anchor.toFixed(1)})`);
  say(`wrote ${out}, ${reportFile} and its .json`);
  return 0;
}
