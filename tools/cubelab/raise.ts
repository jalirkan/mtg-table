// mtg-table — the cube lab: raising the ratings of the low-rated cards exploration found underrated (D360).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh ratings apply <cube.md> --from <evolve-dir | changelog.md> --rule explore-eb --out <tsv>
//
// D356's exploration forces a low-rated card into a deck in place of the
// builder's lowest-rated spell of its mana value and measures `delta`, the win
// rate with the card minus without it.  A card that "holds its own" has had
// "delta <= -margin" rejected (BH): it is not much worse than the card the
// builder chose instead, and its rating (under deadMinRating) says otherwise.
// This file turns those verdicts into ratings, by one rule (`explore-eb`):
//
//   1. ONLY a card whose verdict is `holds` moves; undecided, too few and weak
//      (Fire // Ice in J039) keep their rating, and so does every card Forge
//      flags AI:RemoveDeck (All or Random: D343), whatever its row says.
//   2. SHRINK each delta toward 0 (0 = "as good as the builder's choice"):
//      empirical Bayes over every judged card, d_c ~ N(theta_c, se_c^2),
//      theta_c ~ N(0, tau^2), tau^2 by the method of moments about 0
//      (max(0, (sum w d^2 - k) / sum w), w = 1/se^2); shrunk = d tau^2/(tau^2+se^2).
//   3. ANCHOR: the mean rating of the spells it replaced in its forced decks
//      (what delta was measured against).  TARGET = anchor + K * shrunk, K the
//      rating points per unit of win rate: (top line - mean anchor of the moved
//      cards) / effect, i.e. a card shown to beat the builder's choice by
//      `effect` (the evolve's dominantEffect, 0.1) is worth a top pick.
//   4. CAP: below the cube's top-pick line (the 90th percentile of its nonland
//      ratings) unless the evidence is strong (the 95% interval of delta is
//      above 0), and then at most the cube's best nonland rating.
//   5. ONLY RAISE: new = max(old, min(target, cap)), to 0.1.
//
// Pure: no engine, no file system (cli.ts reads the files).

import { judgeExplored, mergeTables, type ExploreJudgement, type ExploreTable, type ExploreVerdict } from './explore.ts';

export const RAISE_RULES = ['explore-eb'] as const;
export type RaiseRule = typeof RAISE_RULES[number];

export interface RaiseOptions {
  /** The rule's win-rate effect that maps the mean anchor to the top-pick line (the evolve's dominantEffect). */
  effect: number;
  /** The top-pick line: this quantile of the cube's nonland ratings. */
  topQuantile: number;
  /** Rating points per unit of win rate; null = auto ((top line - mean anchor) / effect). */
  pointsPerWin: number | null;
}

export const RAISE_DEFAULTS: RaiseOptions = { effect: 0.1, topQuantile: 0.9, pointsPerWin: null };

/** One judged card, from an evolve folder's pooled tables or a changelog's pooled table. */
export interface JudgedRow {
  name: string;
  forcedDecks: number;
  forcedGames: number;
  expected: number;
  delta: number;
  se: number;
  lo: number;
  hi: number;
  verdict: ExploreVerdict;
}

/** What each forced card replaced: decks it was forced into, the replaced spells' mean rating and counts. */
export interface Anchor { forced: number; mean: number; outs: Record<string, number> }

// ------------------------------------------------------------------ reading the evidence

const VERDICT_OF: Array<[RegExp, ExploreVerdict]> = [
  [/^holds its own/, 'holds'], [/^weak when played/, 'weak'], [/^undecided/, 'undecided'], [/^too few/, 'too-few'],
];

/** A changelog's "Low-rated cards, judged by exploration" table and its generations' discovery seeds. */
export interface ChangelogExplore {
  rows: JudgedRow[];
  /** "In X of Y drafts": explored and all discovery drafts. */
  explored: number;
  drafts: number;
  /** Each generation's discovery seeds [first, last], in order. */
  seeds: Array<[number, number]>;
  provisional: boolean;
}

const num = (s: string): number => Number(s.replace('−', '-'));

/** Parse evolve-report.ts's pooled exploration table (deltas and intervals as printed: two decimals). */
export function parseExploreChangelog(text: string): ChangelogExplore {
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((l) => l.startsWith('## Low-rated cards, judged by exploration'));
  if (at < 0) throw new Error('no "Low-rated cards, judged by exploration" section: not an evolve changelog with --explore');
  const provisional = /provisional/.test(lines[at] as string);
  let explored = NaN, drafts = NaN;
  const rows: JudgedRow[] = [];
  for (let i = at + 1; i < lines.length; i++) {
    const l = lines[i] as string;
    if (l.startsWith('## ')) break;
    const m = /In (\d+) of (\d+) drafts/.exec(l);
    if (m) { explored = Number(m[1]); drafts = Number(m[2]); }
    if (!l.startsWith('| ') || l.startsWith('| Card ') || l.startsWith('|---')) continue;
    const c = l.slice(1, l.lastIndexOf('|')).split('|').map((x) => x.trim());
    if (c.length !== 8) throw new Error(`changelog line ${i + 1}: want 8 cells, got ${c.length}`);
    const fd = /^(\d+) \((\d+)\)$/.exec(c[2] as string);
    const dm = /^([-+−]?\d+\.\d+) \(([-+−]?\d+\.\d+) to ([-+−]?\d+\.\d+)\)$/.exec(c[6] as string);
    const v = VERDICT_OF.find(([re]) => re.test(c[7] as string))?.[1];
    if (!fd || !v) throw new Error(`changelog line ${i + 1}: cannot read "${l}"`);
    const [delta, lo, hi] = dm ? [num(dm[1] as string), num(dm[2] as string), num(dm[3] as string)] : [NaN, NaN, NaN];
    rows.push({
      name: c[0] as string, forcedDecks: Number(fd[1]), forcedGames: Number(fd[2]), expected: Number(c[3]),
      delta, lo, hi, se: (hi - lo) / (2 * 1.96), verdict: v,
    });
  }
  if (!rows.length) throw new Error('the exploration table has no rows');
  const seeds: Array<[number, number]> = [];
  for (const l of lines) {
    const m = /^Discovery: \d+ grid drafts, seeds (\d+)[–-](\d+)/.exec(l);
    if (m) seeds.push([Number(m[1]), Number(m[2])]);
  }
  return { rows, explored, drafts, seeds, provisional };
}

/** Exact rows from an evolve folder's per-generation tables, pooled and judged as the changelog judges them. */
export function rowsFromTables(tables: ExploreTable[], o: { margin: number; minDecks: number; q: number }): JudgedRow[] {
  if (!tables.length) throw new Error('no generation explored');
  const j = judgeExplored(tables.reduce(mergeTables), o);
  return j.map((x: ExploreJudgement) => ({
    name: x.name, forcedDecks: x.treatedDecks, forcedGames: x.treatedGames, expected: x.expected,
    delta: x.delta, se: x.se, lo: x.lo, hi: x.hi, verdict: x.verdict,
  }));
}

/** What every forced card replaced, from explored drafts' seats (drafts.jsonl's `explore.seats`, or a replay). */
export function anchorsOf(seats: Iterable<{ in: string | null; out: string | null } | null>, rating: (name: string) => number | undefined): Map<string, Anchor> {
  const acc = new Map<string, { forced: number; sum: number; outs: Record<string, number> }>();
  for (const s of seats) {
    if (!s?.in || !s.out) continue;
    const r = rating(s.out);
    if (r === undefined) throw new Error(`anchor: no rating for ${s.out} (replaced by ${s.in})`);
    const a = acc.get(s.in) ?? { forced: 0, sum: 0, outs: {} };
    a.forced++; a.sum += r; a.outs[s.out] = (a.outs[s.out] ?? 0) + 1;
    acc.set(s.in, a);
  }
  return new Map([...acc].map(([n, a]) => [n, { forced: a.forced, mean: a.sum / a.forced, outs: a.outs }]));
}

// ------------------------------------------------------------------ the rule

/** tau^2 of the deltas about 0, by the method of moments over the judged cards (never negative). */
export function tau2About0(rows: Array<Pick<JudgedRow, 'delta' | 'se'>>): number {
  const ok = rows.filter((r) => Number.isFinite(r.delta) && r.se > 0);
  if (!ok.length) return 0;
  let sw = 0, swd2 = 0;
  for (const r of ok) { const w = 1 / (r.se * r.se); sw += w; swd2 += w * r.delta * r.delta; }
  return Math.max(0, (swd2 - ok.length) / sw);
}

export const shrink = (delta: number, se: number, tau2: number): number => (tau2 + se * se > 0 ? delta * tau2 / (tau2 + se * se) : 0);

/** The q-quantile of xs (nearest rank on the sorted list, q in 0..1). */
export function quantile(xs: number[], q: number): number {
  if (!xs.length) throw new Error('quantile of nothing');
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))] as number;
}

export const round1 = (x: number): number => Math.round(x * 10) / 10;

export interface RaiseInput {
  rows: JudgedRow[];
  anchors: Map<string, Anchor>;
  /** Every cube card's current rating. */
  base: Map<string, number>;
  /** The cube's nonland cards' current ratings (the top-pick line and the cap). */
  nonlandRatings: number[];
  /** Cards Forge flags AI:RemoveDeck All or Random (D343): never moved. */
  aiLimited: Set<string>;
}

export interface RaiseChange {
  name: string; old: number; new: number;
  delta: number; lo: number; hi: number; se: number; shrunk: number;
  anchor: number; target: number; cap: number; strong: boolean; capped: boolean;
  forcedDecks: number; forcedGames: number;
}

export interface RaiseKept { name: string; rating: number | null; verdict: ExploreVerdict; why: string; delta: number; lo: number; hi: number; forcedDecks: number }

export interface RaiseResult {
  rule: RaiseRule;
  tau2: number; judged: number; top: number; best: number; pointsPerWin: number; meanAnchor: number;
  options: RaiseOptions;
  changes: RaiseChange[];
  kept: RaiseKept[];
}

/** The `explore-eb` rule (D360): see the file header. */
export function raiseRatings(inp: RaiseInput, o: RaiseOptions = RAISE_DEFAULTS, rule: RaiseRule = 'explore-eb'): RaiseResult {
  if (!RAISE_RULES.includes(rule)) throw new Error(`unknown rule ${rule} (known: ${RAISE_RULES.join(', ')})`);
  if (!(o.effect > 0) || !(o.topQuantile > 0 && o.topQuantile <= 1)) throw new Error('raise: effect > 0 and topQuantile in (0, 1]');
  const judged = inp.rows.filter((r) => r.verdict !== 'too-few');
  const tau2 = tau2About0(judged);
  const top = quantile(inp.nonlandRatings, o.topQuantile);
  const best = Math.max(...inp.nonlandRatings);
  const kept: RaiseKept[] = [];
  const keep = (r: JudgedRow, why: string): void => {
    kept.push({ name: r.name, rating: inp.base.get(r.name) ?? null, verdict: r.verdict, why, delta: r.delta, lo: r.lo, hi: r.hi, forcedDecks: r.forcedDecks });
  };
  const movers: JudgedRow[] = [];
  for (const r of inp.rows) {
    if (r.verdict === 'weak') keep(r, 'weak when played: a human test for the notes; never lowered by this rule');
    else if (r.verdict === 'undecided') keep(r, 'undecided: a loss of more than the margin is not ruled out (BH)');
    else if (r.verdict === 'too-few') keep(r, 'too few forced decks to judge');
    else if (inp.aiLimited.has(r.name)) keep(r, 'AI-limited (AI:RemoveDeck, D343): its games are about Forge, not the card');
    else if (!inp.base.has(r.name)) keep(r, 'not in the cube\'s ratings');
    else if (!inp.anchors.get(r.name)?.forced) keep(r, 'no record of what it replaced');
    else movers.push(r);
  }
  const meanAnchor = movers.length ? movers.reduce((s, r) => s + (inp.anchors.get(r.name) as Anchor).mean, 0) / movers.length : NaN;
  const k = o.pointsPerWin ?? Math.max(0, (top - meanAnchor) / o.effect);
  const changes: RaiseChange[] = [];
  for (const r of movers) {
    const old = inp.base.get(r.name) as number;
    const a = inp.anchors.get(r.name) as Anchor;
    const s = shrink(r.delta, r.se, tau2);
    const target = a.mean + k * s;
    const strong = r.lo > 0;
    // Below the top-pick line (one step under it) unless the evidence is strong; never above the best card.
    const cap = strong ? best : Math.min(best, round1(top - 0.1));
    const capped = target > cap;
    const now = round1(Math.max(old, Math.min(target, cap)));
    if (now <= old) { keep(r, `holds its own, but the rule's target ${round1(target)} is not above its rating`); continue; }
    changes.push({
      name: r.name, old, new: now, delta: r.delta, lo: r.lo, hi: r.hi, se: r.se, shrunk: s,
      anchor: a.mean, target, cap, strong, capped, forcedDecks: r.forcedDecks, forcedGames: r.forcedGames,
    });
  }
  changes.sort((x, y) => y.new - y.old - (x.new - x.old) || (x.name < y.name ? -1 : 1));
  kept.sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0));
  return { rule, tau2, judged: judged.length, top, best, pointsPerWin: k, meanAnchor, options: o, changes, kept };
}

// ------------------------------------------------------------------ writing

/** A ratings TSV (ratings.ts's format) with the changes applied; every other line as it was. */
export function applyToTsv(baseText: string, changes: RaiseChange[], header: string[]): string {
  const by = new Map(changes.map((c) => [c.name, c]));
  const seen = new Set<string>();
  const out: string[] = [];
  let headerDone = false;
  for (const line of baseText.replace(/\n$/, '').split(/\r?\n/)) {
    if (!line.startsWith('#') && !headerDone) { out.push(...header.map((h) => `# ${h}`)); headerDone = true; }
    if (!line.trim() || line.startsWith('#')) { out.push(line); continue; }
    const cells = line.split('\t');
    const c = by.get(cells[0] as string);
    if (c) { cells[1] = String(c.new); seen.add(c.name); }
    out.push(cells.join('\t'));
  }
  if (!headerDone) out.push(...header.map((h) => `# ${h}`));
  const missing = changes.filter((c) => !seen.has(c.name)).map((c) => c.name);
  if (missing.length) throw new Error(`not in the base ratings file: ${missing.join(', ')}`);
  return `${out.join('\n')}\n`;
}

const sg = (x: number): string => `${x >= 0 ? '+' : ''}${x.toFixed(2)}`;
const sg3 = (x: number): string => `${x >= 0 ? '+' : ''}${x.toFixed(3)}`;

/** The diff report: every change with its evidence, every judged card left alone and why. */
export function raiseReport(r: RaiseResult, src: { from: string; base: string; anchors: string }): string {
  const out = [
    `# Ratings raised by exploration (D360, rule \`${r.rule}\`)`, '',
    `Evidence: ${src.from}. Base ratings: ${src.base}. Anchors (what each forced card replaced): ${src.anchors}.`, '',
    `Rule: only cards that **hold their own when played** (D356's verdict) move. Each delta is shrunk toward 0 by empirical Bayes over the ${r.judged} judged cards (tau ${Math.sqrt(r.tau2).toFixed(3)}); the target is the mean rating of the spells it replaced plus ${r.pointsPerWin.toFixed(0)} rating points per unit of shrunk win rate ((top-pick line ${r.top} − mean anchor ${r.meanAnchor.toFixed(1)}) / ${r.options.effect}); the cap is just under the top-pick line (the ${Math.round(r.options.topQuantile * 100)}th percentile of the cube's nonland ratings) unless the 95% interval is above 0, then the best nonland rating (${r.best}); a rating is only ever raised.`, '',
    `## Raised (${r.changes.length})`, '',
    '| Card | Old | New | Raise | Delta (95% CI) | Shrunk | Replaced (mean rating) | Target | Forced decks (games) | Note |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const c of r.changes) {
    const note = [c.strong ? 'strong: interval above 0' : '', c.capped ? `capped at ${c.cap}` : ''].filter(Boolean).join('; ');
    out.push(`| ${c.name} | ${c.old} | ${c.new} | +${round1(c.new - c.old)} | ${sg(c.delta)} (${sg(c.lo)} to ${sg(c.hi)}) | ${sg3(c.shrunk)} | ${c.anchor.toFixed(1)} | ${c.target.toFixed(1)} | ${c.forcedDecks} (${c.forcedGames}) | ${note} |`);
  }
  out.push('', `## Unchanged (${r.kept.length} judged or listed)`, '', '| Card | Rating | Verdict | Delta (95% CI) | Forced decks | Why |', '|---|---|---|---|---|---|');
  for (const k of r.kept) {
    const d = Number.isFinite(k.delta) ? `${sg(k.delta)} (${sg(k.lo)} to ${sg(k.hi)})` : '–';
    out.push(`| ${k.name} | ${k.rating ?? '–'} | ${k.verdict} | ${d} | ${k.forcedDecks} | ${k.why} |`);
  }
  out.push('');
  return out.join('\n');
}
