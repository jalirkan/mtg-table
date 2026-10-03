// mtg-table — the cube lab's `learn` and `selfplay` commands (D301, D302).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   learn    <run-dir...> --out <x.ratings.tsv> [--cube <cube.md>] [--prior <tsv>]
//            [--synergy-out <tsv>] [--learn name=value]...
//            -> x.ratings.tsv, x.synergy.tsv, x.learn.md (+ .html), x.learn.json.  No engine.
//   selfplay <cube.md> [--iterations 2] [--drafts-per-iter 30] [--h2h N] [--deck-h2h 0]
//            [--deck-synergy on|off] [--control on|off] [--from <run-dir>]... [--seed 1] [--jobs K] [--games 3]
//            [--format grid] [--out <dir>] [--ratings <tsv>] [--learn name=value]...
//            [--profiles A,B] [--game-timeout <sec>] [--weights <json>] [--weight name=value]...
//
// learn.ts is the model and selfplay.ts the head-to-head; this file reads and
// writes the folders.  docs/guides/cube-lab.md's "Learning" is the manual.

import fs from 'node:fs';
import path from 'node:path';

import { engineEnv, type EngineEnv } from './engine.ts';
import {
  DEFAULT_LEARN, gamesOf, learn, learnedRatingsTsv, learnSummaryMd, mergeLearn, priorsFrom, synergyTsv,
  type Game, type Learned, type LearnOptions,
} from './learn.ts';
import { parseSynergy } from './pairs.ts';
import { parseRatings } from './ratings.ts';
import { defaultRatings, loadForRun, runLab, type DraftRecord, type RunMeta, type RunOptions } from './run.ts';
import { deckQuality, gamesForHalfWidth, headToHead, pairedVsControl, reRated, writeJson, type DeckQuality, type H2H, type Paired } from './selfplay.ts';
import { DEFAULT_WEIGHTS, mergeWeights, parseWeightArgs, type Weights } from './weights.ts';

type Flags = Map<string, string[]>;
const one = (f: Flags, k: string): string | undefined => f.get(k)?.at(-1);
function int(f: Flags, k: string, d: number): number {
  const v = one(f, k);
  if (v === undefined) return d;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error(`--${k} wants a whole number, got "${v}"`);
  return n;
}
function onOff(f: Flags, k: string, d: boolean): boolean {
  const v = one(f, k);
  if (v === undefined) return d;
  if (v !== 'on' && v !== 'off') throw new Error(`--${k} is on or off, got "${v}"`);
  return v === 'on';
}

export function learnOptions(f: Flags): LearnOptions {
  const over: Record<string, number> = {};
  for (const a of f.get('learn') ?? []) {
    const m = /^([A-Za-z0-9]+)=(.+)$/.exec(a);
    if (!m?.[1] || m[2] === undefined) throw new Error(`--learn wants name=value, got "${a}"`);
    over[m[1]] = Number(m[2]);
  }
  return mergeLearn(DEFAULT_LEARN, over);
}

export function weightsOf(f: Flags): Weights {
  let w = DEFAULT_WEIGHTS;
  for (const wf of f.get('weights') ?? []) w = mergeWeights(w, JSON.parse(fs.readFileSync(wf, 'utf8')) as Record<string, unknown>);
  return mergeWeights(w, parseWeightArgs(f.get('weight') ?? []));
}

interface RunData { dir: string; meta: RunMeta; cards: Record<string, { rating: number; remAIDeck: boolean; land: boolean }>; recs: DraftRecord[] }

export function readRunData(dir: string): RunData {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8')) as RunMeta;
  const cards = JSON.parse(fs.readFileSync(path.join(dir, 'cards.json'), 'utf8')) as RunData['cards'];
  const jsonl = path.join(dir, 'drafts.jsonl');
  const recs = fs.existsSync(jsonl) ? fs.readFileSync(jsonl, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as DraftRecord) : [];
  return { dir, meta, cards, recs };
}

/** The files `learn` writes next to `out` (x.ratings.tsv -> x.synergy.tsv, x.learn.md, x.learn.json). */
export function learnPaths(out: string, synergyOut?: string): { ratings: string; synergy: string; md: string; json: string } {
  const base = out.replace(/\.ratings\.tsv$/, '').replace(/\.tsv$/, '');
  return { ratings: out, synergy: synergyOut ?? `${base}.synergy.tsv`, md: `${base}.learn.md`, json: `${base}.learn.json` };
}

/** Learn from run folders against a prior ratings TSV; write the four files; return the fit. */
export function learnFromRuns(repo: string, dirs: string[], prior: string | null, out: string, o: LearnOptions, say: (s: string) => void, synergyOut?: string): Learned {
  const runs = dirs.map(readRunData);
  const cards: RunData['cards'] = {};
  for (const r of runs) Object.assign(cards, r.cards);
  const priorFile = prior ?? (runs[0]?.meta.ratingsFile ? path.join(repo, runs[0].meta.ratingsFile) : null);
  const priors = priorsFrom(priorFile && fs.existsSync(priorFile) ? fs.readFileSync(priorFile, 'utf8') : null, cards);
  const games: Game[] = [];
  for (const r of runs) games.push(...gamesOf(r.recs, `${path.basename(r.dir)}:`));
  if (games.length === 0) throw new Error(`no decisive game in ${dirs.join(', ')}`);
  const l = learn(games, priors, o);
  const title = runs[0]?.meta.cube ?? '';
  const p = learnPaths(out, synergyOut);
  const inputs = dirs.map((d) => path.relative(repo, path.resolve(d)));
  fs.mkdirSync(path.dirname(path.resolve(p.ratings)), { recursive: true });
  fs.writeFileSync(p.ratings, learnedRatingsTsv(title, l, inputs));
  fs.writeFileSync(p.synergy, synergyTsv(title, l));
  fs.writeFileSync(p.md, learnSummaryMd(title, l));
  fs.writeFileSync(p.md.replace(/\.md$/, '.html'), mdPage(`Learned ratings — ${title}`, learnSummaryMd(title, l)));
  writeJson(p.json, { inputs, prior: priorFile ? path.relative(repo, path.resolve(priorFile)) : null, ...l });
  say(`learn: ${l.drafts} draft(s), ${l.games} decisive game(s), ${l.cards.filter((c) => c.status === 'learned').length} card(s) learned, ${l.pairsConsidered} pair(s); alpha ${l.alpha.value.toFixed(4)} +/- ${l.alpha.sd.toFixed(4)}; ${l.pointsPerLogit} points/logit (${l.pointsPerLogitSource})`);
  if (l.cv) say(`learn: held-out log loss ${l.cv.logLossLearned.toFixed(4)} learned vs ${l.cv.logLossPrior.toFixed(4)} prior-only (coin ${l.cv.logLossCoin.toFixed(4)}; difference +/- ${(1.96 * l.cv.diffSe).toFixed(4)} at 95%), ${l.cv.folds}-fold by draft over ${l.cv.games} games`);
  say(`learn: wrote ${p.ratings}, ${p.synergy}, ${p.md}, ${p.json}`);
  return l;
}

export function learnCommand(repo: string, pos: string[], f: Flags, say: (s: string) => void): number {
  const out = one(f, 'out');
  if (pos.length === 0 || !out) throw new Error('learn <run-dir...> --out <x.ratings.tsv> [--cube <cube.md>] [--prior <tsv>]');
  const cube = one(f, 'cube');
  const prior = one(f, 'prior') ?? (cube ? defaultRatings(cube) : null);
  learnFromRuns(repo, pos, prior, out, learnOptions(f), say, one(f, 'synergy-out'));
  return 0;
}

// ------------------------------------------------------------ selfplay

interface IterRow {
  iteration: number;
  selfplay: string;
  values: { ratings: string; synergy: string };
  learned: { drafts: number; games: number; alpha: number; alphaSd: number; pointsPerLogit: number; cv: Learned['cv']; medianCardGames: number; pairs: number; rankCorrWithPrior: number | null };
  h2h: H2H & { dir: string };
  /** Paired by seed with the control (both seats baseline), when there is one. */
  paired: Paired | null;
}

export interface SelfplaySummary {
  cube: string;
  options: Record<string, unknown>;
  baseline: string;
  /** Both seats baseline on the head-to-head seeds: what seat A wins with no learning. */
  control: (H2H & { dir: string }) | null;
  iterations: IterRow[];
  deckH2H: (H2H & { dir: string }) | null;
  deckQuality: DeckQuality | null;
  /** Decisive games for a 95% interval of +/-5 and +/-3 points around 50%. */
  gamesNeeded: { halfWidth5: number; halfWidth3: number; gamesPerDraft: number | null };
}

export async function selfplayCommand(repo: string, cubeFile: string, f: Flags, say: (s: string) => void): Promise<number> {
  const env: EngineEnv = engineEnv(repo);
  const iterations = int(f, 'iterations', 2);
  const n = int(f, 'drafts-per-iter', 30);
  const h = int(f, 'h2h', n);
  const deckH = int(f, 'deck-h2h', 0);
  const seed = int(f, 'seed', 1);
  const deckSyn = onOff(f, 'deck-synergy', false);
  const format = (one(f, 'format') ?? 'grid') as 'grid' | 'winston';
  if (format !== 'grid' && format !== 'winston') throw new Error(`--format is grid or winston, got ${format}`);
  const profiles = (one(f, 'profiles') ?? 'Default,Default').split(',') as [string, string];
  const out = one(f, 'out') ?? path.join('var/cubelab/selfplay', `${path.basename(cubeFile, '.md')}-${seed}`);
  const baseline = one(f, 'ratings') ?? defaultRatings(cubeFile);
  if (!baseline) throw new Error(`no ratings TSV beside ${cubeFile}: run \`tools/cubelab.sh ratings init ${cubeFile}\` first (it is the baseline and the prior)`);
  const lo = learnOptions(f);
  const w = weightsOf(f);
  const from = f.get('from') ?? [];
  const common = (): Omit<RunOptions, 'drafts' | 'seed' | 'out' | 'ratingsFile'> => ({
    cubeFile, format, games: int(f, 'games', 3), jobs: Math.max(1, int(f, 'jobs', 1)), profiles, record: 0,
    builder: 'lab', gameTimeoutSec: int(f, 'game-timeout', 300), winstonCards: int(f, 'winston-cards', 90), weights: w,
  });
  fs.mkdirSync(out, { recursive: true });
  say(`selfplay: ${cubeFile}, ${iterations} iteration(s) x ${n} self-play draft(s) + ${h} head-to-head draft(s)${deckH ? ` + ${deckH} deck-only head-to-head` : ''}, baseline ${baseline}, deck pairs ${deckSyn ? 'on' : 'off'}, out ${out}`);
  const data = [...from];
  const heldOut: string[] = [];
  let cur: { ratings: string; synergy: string | null } = { ratings: baseline, synergy: null };
  const rows: IterRow[] = [];
  let control: SelfplaySummary['control'] = null;
  const controlDir = path.join(out, 'control');
  if (h > 0 && onOff(f, 'control', true)) {
    say(`== control: ${h} draft(s) on the head-to-head seeds, both seats baseline`);
    await runLab(env, { ...common(), drafts: h, seed: seed + 500_000, out: controlDir, ratingsFile: baseline }, say);
    control = { ...headToHead(readRunData(controlDir).recs), dir: controlDir };
    say(`control: A won ${control.winsA} of ${control.winsA + control.winsB} = ${pct(control.rate)} [${pct(control.lo)}, ${pct(control.hi)}]`);
  }
  if (from.length > 0) {
    const p = learnPaths(path.join(out, 'values-0.ratings.tsv'));
    learnFromRuns(repo, from, baseline, p.ratings, lo, say);
    cur = { ratings: p.ratings, synergy: p.synergy };
  }
  for (let i = 1; i <= iterations; i++) {
    const sp = path.join(out, `iter-${i}`, 'selfplay');
    say(`== iteration ${i}: ${n} self-play draft(s) with ${cur.ratings}${cur.synergy ? ` + ${cur.synergy}` : ''}`);
    if (n > 0) {
      await runLab(env, { ...common(), drafts: n, seed: seed + 1000 * i, out: sp, ratingsFile: cur.ratings, synergyFile: cur.synergy, deckSynergy: deckSyn && !!cur.synergy }, say);
      data.push(sp);
    }
    if (data.length === 0) throw new Error('nothing to learn from: pass --drafts-per-iter > 0 or --from <run-dir>');
    const p = learnPaths(path.join(out, `values-${i}.ratings.tsv`));
    const l = learnFromRuns(repo, data, baseline, p.ratings, lo, say);
    cur = { ratings: p.ratings, synergy: p.synergy };
    const hd = path.join(out, `iter-${i}`, 'h2h');
    let hh: H2H = headToHead([]);
    if (h > 0) {
      say(`== iteration ${i}: head-to-head, ${h} draft(s): A learned (${p.ratings}), B baseline`);
      await runLab(env, { ...common(), drafts: h, seed: seed + 500_000, out: hd, ratingsFile: baseline,
        mixed: { mode: 'draft+deck', ratingsFile: p.ratings, synergyFile: p.synergy, deckSynergy: deckSyn } }, say);
      hh = headToHead(readRunData(hd).recs);
      // Never learned from: the head-to-head seeds repeat every iteration, so
      // learning from them would test the next values on deals they were fitted to.
      heldOut.push(hd);
      say(`head-to-head ${i}: A (learned) won ${hh.winsA} of ${hh.winsA + hh.winsB} decisive games = ${pct(hh.rate)} [${pct(hh.lo)}, ${pct(hh.hi)}]; matches ${hh.matchesA}-${hh.matchesB}`);
    }
    const ess = l.cards.filter((c) => c.status === 'learned').map((c) => c.games).sort((a, b) => a - b);
    rows.push({
      iteration: i, selfplay: sp, values: { ratings: p.ratings, synergy: p.synergy },
      learned: { drafts: l.drafts, games: l.games, alpha: l.alpha.value, alphaSd: l.alpha.sd, pointsPerLogit: l.pointsPerLogit, cv: l.cv, medianCardGames: ess[Math.floor(ess.length / 2)] ?? 0, pairs: l.pairsConsidered, rankCorrWithPrior: l.rankCorrWithPrior },
      h2h: { ...hh, dir: hd },
      paired: control && h > 0 ? pairedVsControl(readRunData(hd).recs, readRunData(controlDir).recs) : null,
    });
    writeSummary(out, summaryOf(cubeFile, f, baseline, control, rows, null, null));
  }
  let deckRow: (H2H & { dir: string }) | null = null;
  if (deckH > 0) {
    const dd = path.join(out, 'deck-h2h');
    say(`== deckbuilder head-to-head, ${deckH} draft(s): both draft with the baseline; A builds with ${cur.ratings}${deckSyn ? ' + pairs' : ''}`);
    await runLab(env, { ...common(), drafts: deckH, seed: seed + 700_000, out: dd, ratingsFile: baseline,
      mixed: { mode: 'deck', ratingsFile: cur.ratings, synergyFile: cur.synergy, deckSynergy: deckSyn } }, say);
    deckRow = { ...headToHead(readRunData(dd).recs), dir: dd };
    say(`deck head-to-head: A won ${deckRow.winsA} of ${deckRow.winsA + deckRow.winsB} = ${pct(deckRow.rate)} [${pct(deckRow.lo)}, ${pct(deckRow.hi)}]`);
  }
  // Offline: every self-play pool rebuilt both ways (no games, so no noise from Forge -- and no proof of strength).
  const { lc } = loadForRun(env, cubeFile, baseline, w, say);
  const learnedLc = reRated(lc, parseRatings(fs.readFileSync(cur.ratings, 'utf8')));
  const table = deckSyn && cur.synergy ? parseSynergy(fs.readFileSync(cur.synergy, 'utf8')) : undefined;
  const pools: string[][] = [];
  for (const d of [...data, ...heldOut]) for (const r of readRunData(d).recs) for (const dr of r.drafters) pools.push(dr.pool);
  const dq = deckQuality(pools, lc, learnedLc, w, table);
  const s = summaryOf(cubeFile, f, baseline, control, rows, deckRow, dq);
  writeSummary(out, s);
  say(`selfplay: ${path.join(out, 'summary.md')}`);
  return 0;
}

const pct = (x: number | null): string => (x === null ? '-' : `${(x * 100).toFixed(1)}%`);

function summaryOf(cube: string, f: Flags, baseline: string, control: SelfplaySummary['control'], rows: IterRow[], deckRow: SelfplaySummary['deckH2H'], dq: DeckQuality | null): SelfplaySummary {
  const games = rows.reduce((s, r) => s + r.h2h.games, 0);
  const drafts = rows.reduce((s, r) => s + r.h2h.drafts, 0);
  return {
    cube, options: Object.fromEntries([...f.entries()].map(([k, v]) => [k, v.length === 1 ? v[0] : v])), baseline,
    control, iterations: rows, deckH2H: deckRow, deckQuality: dq,
    gamesNeeded: { halfWidth5: gamesForHalfWidth(0.05), halfWidth3: gamesForHalfWidth(0.03), gamesPerDraft: drafts ? Math.round(games / drafts * 100) / 100 : null },
  };
}

export function renderSelfplayMd(s: SelfplaySummary): string {
  const o: string[] = [`# Self-play — ${path.basename(s.cube)}`, '', `Baseline (and prior): \`${s.baseline}\`. Options: \`${JSON.stringify(s.options)}\`.`, ''];
  o.push('## Learned drafter (A) against the baseline drafter (B)', '');
  if (s.control) o.push(`**Control** (both seats baseline, the same seeds): A won ${s.control.winsA}–${s.control.winsB} = ${pct(s.control.rate)} [${pct(s.control.lo)}, ${pct(s.control.hi)}] — what seat A wins on these deals with nothing learned.`, '');
  o.push('| iteration | learned from (drafts / games) | alpha ± 95% | held-out log loss learned / prior-only | median games per card | A win rate (decisive games) | 95% CI | matches A–B | paired with the control: loss→win / win→loss, sign-test p |', '|---|---|---|---|---|---|---|---|---|');
  for (const r of s.iterations) {
    const cv = r.learned.cv ? `${r.learned.cv.logLossLearned.toFixed(4)} / ${r.learned.cv.logLossPrior.toFixed(4)}` : '-';
    const pr = r.paired ? `${r.paired.lossToWin} / ${r.paired.winToLoss}, p = ${r.paired.p === null ? '-' : r.paired.p.toPrecision(2)}` : '-';
    o.push(`| ${r.iteration} | ${r.learned.drafts} / ${r.learned.games} | ${r.learned.alpha.toFixed(4)} ± ${(1.96 * r.learned.alphaSd).toFixed(4)} | ${cv} | ${r.learned.medianCardGames} | ${r.h2h.winsA}–${r.h2h.winsB} = ${pct(r.h2h.rate)} | [${pct(r.h2h.lo)}, ${pct(r.h2h.hi)}] | ${r.h2h.matchesA}–${r.h2h.matchesB} | ${pr} |`);
  }
  if (s.deckH2H) {
    const d = s.deckH2H;
    o.push('', '## Deckbuilder alone (both draft with the baseline; A builds with the learned values)', '', `A won ${d.winsA}–${d.winsB} = ${pct(d.rate)} [${pct(d.lo)}, ${pct(d.hi)}] over ${d.drafts} drafts; matches ${d.matchesA}–${d.matchesB}.`);
  }
  if (s.deckQuality) {
    const q = s.deckQuality;
    o.push('', '## Deck quality, offline (every pool rebuilt both ways, no games)', '',
      `${q.pools} pools. Learned build minus baseline build, mean per pool: **${q.learnedView >= 0 ? '+' : ''}${q.learnedView}** rating points per spell judged by the learned values${s.options['deck-synergy'] === 'on' ? ' and pairs' : ''}; **${q.baselineView >= 0 ? '+' : ''}${q.baselineView}** judged by the baseline ratings. ${q.cardsChanged} spells changed per deck; ${q.coloursChanged} of ${q.pools} pools changed colours or splash. (Each builder is best by its own measure by construction; this says how far apart they are, not which is stronger — the head-to-head is that.)`);
  }
  const g = s.gamesNeeded;
  o.push('', '## How much data is signal', '', `A 95% interval of ±5 points around 50% needs ${g.halfWidth5} decisive games${g.gamesPerDraft ? ` (≈ ${Math.ceil(g.halfWidth5 / g.gamesPerDraft)} head-to-head drafts at ${g.gamesPerDraft} games a draft)` : ''}; ±3 points needs ${g.halfWidth3}${g.gamesPerDraft ? ` (≈ ${Math.ceil(g.halfWidth3 / g.gamesPerDraft)} drafts)` : ''}.`);
  return `${o.join('\n')}\n`;
}

function writeSummary(out: string, s: SelfplaySummary): void {
  writeJson(path.join(out, 'summary.json'), s);
  const md = renderSelfplayMd(s);
  fs.writeFileSync(path.join(out, 'summary.md'), md);
  fs.writeFileSync(path.join(out, 'summary.html'), mdPage(`Self-play — ${path.basename(s.cube)}`, md));
}

/**
 * The summary's own Markdown (headings, paragraphs, pipe tables, `code`, **bold**,
 * fenced code) as one self-contained HTML page: no script, font or style from anywhere.
 */
export function mdPage(title: string, md: string): string {
  const esc = (x: string): string => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (x: string): string => esc(x).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  const html: string[] = [];
  const lines = md.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i] as string;
    if (l.startsWith('```')) {
      const body: string[] = [];
      for (i++; i < lines.length && !(lines[i] as string).startsWith('```'); i++) body.push(esc(lines[i] as string));
      html.push(`<pre>${body.join('\n')}</pre>`);
    } else if (/^#{1,3} /.test(l)) {
      const n = (/^#+/.exec(l) as RegExpExecArray)[0].length;
      html.push(`<h${n}>${inline(l.slice(n + 1))}</h${n}>`);
    } else if (l.startsWith('|')) {
      const rows: string[][] = [];
      for (; i < lines.length && (lines[i] as string).startsWith('|'); i++) rows.push((lines[i] as string).slice(1, -1).split(' | ').map((c) => c.trim()));
      i--;
      const [head, , ...body] = rows;
      html.push(`<table><tr>${(head ?? []).map((c) => `<th>${inline(c)}</th>`).join('')}</tr>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</table>`);
    } else if (l.startsWith('- ')) {
      html.push(`<li>${inline(l.slice(2))}</li>`);
    } else if (l.trim()) html.push(`<p>${inline(l)}</p>`);
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:1100px;margin:0 auto;padding:16px;color:#1d1d1f;background:#fff}
table{border-collapse:collapse;margin:8px 0;font-size:13px;display:block;overflow-x:auto}td,th{border:1px solid #ccc;padding:3px 7px;text-align:left}
th{background:#f2f2f2}code,pre{font:12px ui-monospace,monospace;background:#f6f6f6}pre{padding:8px;overflow-x:auto}
@media (prefers-color-scheme:dark){body{background:#161618;color:#e6e6e6}th{background:#26262a}td,th{border-color:#444}code,pre{background:#222}}</style></head>
<body>${html.join('\n')}</body></html>
`;
}
