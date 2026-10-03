// mtg-table — the cube lab: `evolve`'s words — the iteration-log entry, the changelog and the HTML.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Pure: a generation's Decision (evolve.ts) in, text out.  The HTML is one
// self-contained page (inline CSS, nothing loaded from anywhere), a section per
// generation, light and dark.

import type { Balance, CardStat, Decision, Group } from './evolve.ts';

export interface GenSummary {
  gen: number;
  /** The cube's version going in, and coming out (the same when nothing swapped). */
  versionIn: number;
  versionOut: number;
  date: string;
  /** Drafts the decision read: this generation's, plus those of the generations before it that drafted the same list. */
  drafts: number;
  seeds: [number, number];
  /** The first generation whose drafts were pooled (= gen when none were). */
  pooledFrom?: number;
  games: number;
  decision: Decision;
  balance: Balance;
  stats: CardStat[];
}

const r2 = (x: number): string => x.toFixed(2);
const pooled = (g: GenSummary): string => (g.pooledFrom !== undefined && g.pooledFrom < g.gen ? ` (generations ${g.pooledFrom}–${g.gen} on the same list)` : '');
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The one line appended to the cube document's `## Iteration log`. */
export function logEntry(g: GenSummary): string {
  const head = `v${g.versionOut} (${g.date}, cube lab evolve generation ${g.gen}: ${g.drafts} grid drafts${pooled(g)}, seeds ${g.seeds[0]}–${g.seeds[1]}, ${g.games} decisive games)`;
  if (!g.decision.swaps.length) return `${head}: no swaps, v${g.versionIn} unchanged. ${g.decision.verdict}`;
  const sw = g.decision.swaps.map((s) => `**${s.out}** → **${s.in}** (${s.why}: ${s.evidence}; in: ${s.fit})`).join('; ');
  return `${head}: ${sw}.`;
}

function groupRows(gs: Group[]): string[] {
  return gs.map((x) => `| ${x.key} | ${x.decks} | ${x.games} | ${x.games ? r2(x.rate) : '–'} | ${r2(x.ci[0])}–${r2(x.ci[1])} | ${r2(x.shrunk)} |`);
}

/** The changelog section for one generation (Markdown). */
export function changelogSection(g: GenSummary): string {
  const d = g.decision;
  const out: string[] = [];
  out.push(`## Generation ${g.gen} — v${g.versionIn} → v${g.versionOut} (${g.date})`, '');
  out.push(`${g.drafts} grid drafts${pooled(g)}, seeds ${g.seeds[0]}–${g.seeds[1]}, ${g.games} decisive games; mean card win rate ${r2(g.balance.mean)}.`, '');
  out.push(`**Verdict.** ${d.verdict}`, '');
  if (d.swaps.length) {
    out.push('| Out | Why | Evidence | In | Why this card |', '|---|---|---|---|---|');
    for (const s of d.swaps) out.push(`| ${s.out} (${s.outSection}) | ${s.why} | ${s.evidence} | ${s.in} (${s.inSection}) | ${s.fit} |`);
    out.push('');
  }
  if (d.unmatched.length) {
    out.push('**Supported cuts not made:** ' + d.unmatched.map((u) => `${u.name} (${u.why}: ${u.reason})`).join('; ') + '.', '');
  }
  if (d.watch.length) {
    out.push('**Insufficient data (watch).** Leads that did not pass their threshold:', '', '| Card | Lean | Evidence | Drafts per generation to settle |', '|---|---|---|---|');
    for (const w of d.watch.slice(0, 15)) out.push(`| ${w.name} | ${w.signal} | ${w.evidence} | ${w.draftsNeeded ?? 'not at this rate'} |`);
    if (d.watch.length > 15) out.push(`| … ${d.watch.length - 15} more in stats.json | | | |`);
    out.push('');
  }
  const ai = d.aiLimited;
  if (ai.length) {
    out.push('**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):', '');
    for (const a of ai) out.push(`- ${a.name} (AI:RemoveDeck:${a.aiFlag}) — ${a.status}${a.signal !== 'none' ? `, the AI evidence alone says ${a.signal}` : ''}: ${a.evidence}${a.note ? `; note: ${a.note}` : ''}`);
    out.push('');
  }
  const rated = d.assessments.filter((a) => a.status === 'rating-limited');
  if (rated.length) {
    out.push('**Rating-limited** (never or almost never played, but rated low: the drafters pick by rating, so these may be weak or only underrated. Raise a rating in the cube\'s ratings TSV — `tools/cubelab.sh ratings init` writes one — to test it; never cut on this evidence):', '');
    out.push(rated.map((a) => a.name).join(', ') + '.', '');
  }
  const builder = d.assessments.filter((a) => a.status === 'builder-limited');
  if (builder.length) out.push(`**Builder-limited lands** (the lab's deckbuilder plays a dual or fetchland only in its own pair's decks, and a colourless land never, so a land's deck rate measures its pair's popularity): ${builder.map((a) => a.name).join(', ')}.`, '');
  if (d.humanTest.length) {
    out.push('**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):', '');
    for (const h of d.humanTest) out.push(`- ${h.name} (${h.colors}) — ${h.why}`);
    out.push('');
  }
  if (d.pendingTries.length) out.push(`**Notes say try, not yet in:** ${d.pendingTries.join(', ')} (a try needs a supported cut to replace).`, '');
  const PAIRS = ['WU', 'UB', 'BR', 'RG', 'WG', 'WB', 'UR', 'BG', 'WR', 'UG'];
  const never = PAIRS.filter((p) => !g.balance.pairs.some((x) => x.key === p));
  if (never.length) out.push(`**Pairs no played deck used:** ${never.join(', ')} — their gold cards and duals never had a deck to be in; a balance question for the pair, not the cards.`, '');
  out.push('**Balance by colour pair** (decisive games of the played decks):', '', '| Pair | Decks | Games | Win rate | 95% CI | Shrunk |', '|---|---|---|---|---|---|', ...groupRows(g.balance.pairs), '');
  if (d.violationsAfter.length) out.push(`**Constraints:** ${d.violationsAfter.join('; ')}.`, '');
  return out.join('\n');
}

export function changelog(title: string, gens: GenSummary[]): string {
  return [`# ${title} — evolve changelog`, '',
    'Written by `tools/cubelab.sh evolve` (D299–D300). Each generation plays its drafts on the cube going in and swaps only what the evidence supports; docs/guides/cube-lab.md *Evolve* says how.', '',
    ...gens.map(changelogSection)].join('\n');
}

function table(head: string[], rows: string[][]): string {
  return `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

/** One generation as an HTML section. */
export function htmlSection(g: GenSummary): string {
  const d = g.decision;
  const parts: string[] = [];
  parts.push(`<section><h2>Generation ${g.gen} <span class="dim">v${g.versionIn} → v${g.versionOut} · ${esc(g.date)}</span></h2>`);
  parts.push(`<p class="dim">${g.drafts} grid drafts${esc(pooled(g))}, seeds ${g.seeds[0]}–${g.seeds[1]}, ${g.games} decisive games, mean card win rate ${r2(g.balance.mean)}</p>`);
  parts.push(`<p class="verdict">${esc(d.verdict)}</p>`);
  if (d.swaps.length) parts.push('<h3>Swaps</h3>', table(['Out', 'Why', 'Evidence', 'In', 'Why this card'], d.swaps.map((s) => [s.out, s.why, s.evidence, s.in, s.fit])));
  if (d.watch.length) parts.push('<h3>Insufficient data</h3>', table(['Card', 'Lean', 'Evidence', 'Drafts to settle'], d.watch.slice(0, 15).map((w) => [w.name, w.signal, w.evidence, String(w.draftsNeeded ?? '—')])));
  if (d.aiLimited.length) parts.push('<h3>AI-limited (never cut on AI stats)</h3>', table(['Card', 'Flag', 'Status', 'AI evidence says', 'Evidence'], d.aiLimited.map((a) => [a.name, a.aiFlag, a.status, a.signal, a.evidence])));
  const rl = d.assessments.filter((a) => a.status === 'rating-limited');
  if (rl.length) parts.push('<h3>Rating-limited (a ratings question, not a drafts one)</h3>', `<p>${esc(rl.map((a) => a.name).join(', '))}</p>`);
  if (d.humanTest.length) parts.push('<h3>Human-test candidates</h3>', table(['Card', 'Colours', 'Why'], d.humanTest.map((h) => [h.name, h.colors, h.why])));
  parts.push('<h3>Balance</h3><div class="row">',
    table(['Pair', 'Decks', 'Games', 'Win', 'Shrunk'], g.balance.pairs.map((x) => [x.key, String(x.decks), String(x.games), x.games ? r2(x.rate) : '–', r2(x.shrunk)])),
    table(['Colour', 'Decks', 'Games', 'Win', 'Shrunk'], g.balance.colours.map((x) => [x.key, String(x.decks), String(x.games), x.games ? r2(x.rate) : '–', r2(x.shrunk)])),
    table(['Theme', 'Decks', 'Games', 'Win', 'Shrunk'], g.balance.themes.map((x) => [x.key, String(x.decks), String(x.games), x.games ? r2(x.rate) : '–', r2(x.shrunk)])), '</div>');
  const top = [...g.stats].filter((s) => s.games > 0).sort((a, b) => b.shrunk - a.shrunk || (a.name < b.name ? -1 : 1));
  const row = (s: CardStat): string[] => [s.name, String(s.seen), String(s.inDecks), r2(s.deckRate), String(s.games), r2(s.winRate), r2(s.shrunk)];
  const head = ['Card', 'Dealt', 'Decks', 'Deck rate', 'Games', 'Win', 'Shrunk'];
  parts.push('<div class="row"><div><h3>Highest shrunk win rate</h3>', table(head, top.slice(0, 10).map(row)), '</div><div><h3>Lowest</h3>', table(head, top.slice(-10).reverse().map(row)), '</div></div>');
  parts.push('</section>');
  return parts.join('\n');
}

export function htmlPage(title: string, gens: GenSummary[]): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cube evolve</title>
<style>
:root{--bg:#fbfaf7;--fg:#1d1d1b;--dim:#6b6a65;--line:#dedbd2;--accent:#8a4b12;--head:#f1eee6}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#171716;--fg:#e9e7e1;--dim:#a19f97;--line:#36352f;--accent:#e0a463;--head:#22211f}}
:root[data-theme="dark"]{--bg:#171716;--fg:#e9e7e1;--dim:#a19f97;--line:#36352f;--accent:#e0a463;--head:#22211f}
body{background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;margin:0 auto;max-width:1100px;padding:16px}
h1{font-size:22px;margin:8px 0 4px}h2{font-size:18px;border-top:1px solid var(--line);padding-top:16px;margin-top:28px}h3{font-size:14px;margin:18px 0 6px;color:var(--accent)}
.dim{color:var(--dim);font-weight:normal}.verdict{font-weight:600}
table{border-collapse:collapse;margin:4px 0 8px;font-size:12.5px;max-width:100%}th,td{border-bottom:1px solid var(--line);padding:3px 8px;text-align:left;vertical-align:top}
th{background:var(--head);font-weight:600}td:nth-child(n+2){font-variant-numeric:tabular-nums}
.row{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}section{overflow-x:auto}
</style></head><body>
<h1>${esc(title)}</h1>
<p class="dim">The cube lab's evolve loop (D299–D300): each generation drafts the cube going in, plays the decks on Forge, and swaps only what the evidence supports. Win rates are over decisive games with Wilson 95% intervals; "shrunk" is the Beta-shrunk rate of meta.json (prior 20 games at the mean).</p>
${gens.map(htmlSection).join('\n')}
</body></html>
`;
}
