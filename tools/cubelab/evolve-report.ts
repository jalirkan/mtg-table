// mtg-table — the cube lab: `evolve`'s words — the iteration-log entry, the changelog and the HTML.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Pure: a generation's Decision (evolve.ts) in, text out.  The HTML is one
// self-contained page (inline CSS, nothing loaded from anywhere), a section per
// generation, light and dark.

import { pooledTest, priorAttempts, ruleWords, type Balance, type CardStat, type ConfirmAttempt, type Confirmation, type Decision, type Group } from './evolve.ts';
import { exploreHealth, judgeExplored, mergeTables, type ExploreJudgeOptions, type ExploreTable } from './explore.ts';
import type { BalanceDecision } from './evolve-balance.ts';

export interface GenSummary {
  gen: number;
  /** The cube's version going in, and coming out (the same when nothing swapped). */
  versionIn: number;
  versionOut: number;
  date: string;
  /** The discovery batch: this generation's own drafts (never pooled with another generation's, D331). */
  drafts: number;
  seeds: [number, number];
  games: number;
  decision: Decision;
  balance: Balance;
  stats: CardStat[];
  /** D356: the discovery batch's exploration (absent when it did not explore): its plain drafts and the explored comparisons. */
  explore?: { plain: number; table: ExploreTable };
}

const r2 = (x: number): string => x.toFixed(2);
const pv = (p: number): string => (p < 0.001 ? p.toExponential(1) : p.toFixed(3));
const confirmHead = (g: GenSummary): string => {
  const c = g.decision.confirmBatch;
  return c ? `; confirmation ${c.drafts} fresh drafts, seeds ${c.seeds[0]}–${c.seeds[1]}, ${c.games} decisive games` : '';
};

/** What discovery vs confirmed means, in plain words (the changelog's and the page's preamble). */
export const stagesInWords = (q: number): string => 'A card is cut on the AI\'s evidence only after two separate looks. **Discovery**: in this generation\'s drafts the card stands out by more than chance can explain, '
  + 'allowing for the fact that some 180 cards are looked at at once (a false-discovery rate of ' + `${Math.round(q * 100)}%: of the cards flagged, at most about ${q > 0.5 ? `${Math.round(q * 100)}%` : `one in ${Math.round(1 / q)}`} could be a fluke` + '). A discovery is a *candidate*, not a verdict. '
  + '**Confirmed**: the candidate stands out again, the same way, in a second batch of fresh drafts that played no part in finding it. Only confirmed cards are cut; a candidate that does not confirm stays, and is reported. '
  + 'Win rates count each deck\'s match as one clump of games (the same deck against the same opponent), so their intervals are wider than a count of games would make them.';

/** dominant-win's null in words: D377's colour pairs, or (absent, before D377) the batch mean. */
function nullHead(d: Decision): string {
  return d.winNull === 'colour' ? "; dominant-win against each card's colour pairs (D377)" : '';
}

/** A candidate's earlier attempts and this one pooled (D357), in words: "attempt 2 (g3, g4): won 319 of 612 (0.52 vs 0.50), p 0.15". */
function pooledWords(c: Confirmation, rule: Decision['confirmRule']): string {
  const j = c.attempt ?? (c.confirm ? 1 : 0);
  if (j <= 1 || !c.pooled) return j === 1 ? 'first attempt' : '—';
  const gens = [...(c.history ?? []).map((h) => `g${h.gen}`), c.thisAttempt ? `g${c.thisAttempt.gen}` : 'now'].join(', ');
  return `attempt ${j} (${gens}): ${ruleWords(c.pooled)}${rule === 'D357' ? `, tested at level / ${2 ** (j - 1)}` : ' (reported only: D331 decides on this batch alone)'}`;
}

/** One candidate as a table row: card, rule, discovery numbers, confirmation numbers, every attempt pooled, the outcome. */
function candidateRow(c: Confirmation, rule: Decision['confirmRule']): string[] {
  return [c.name, c.rule, `${ruleWords(c.discovery)}${c.discovery.qValue !== undefined ? `, q ${pv(c.discovery.qValue)}` : ''}`,
    c.confirm ? `${ruleWords(c.confirm)}${(c.attempt ?? 1) > 1 && rule === 'D357' ? '' : `, Holm p ${pv(c.holmP as number)}`}` : '—',
    `${pooledWords(c, rule)}${(c.attempt ?? 1) > 1 && rule === 'D357' && c.holmP !== null ? `, Holm p ${pv(c.holmP)}` : ''}`,
    c.confirmed ? 'confirmed' : `not confirmed: ${c.reason}`];
}

/**
 * Every card's confirmation history over the run (D357): each attempt with its
 * batch's own numbers and outcome, and every attempt pooled.  Empty when no
 * candidate was ever confirmed or refused on a batch.
 */
export function confirmHistorySection(gens: GenSummary[]): string {
  const all = priorAttempts(gens);
  if (!all.length) return '';
  const by = new Map<string, ConfirmAttempt[]>();
  for (const a of all) by.set(`${a.name}|${a.rule}`, [...(by.get(`${a.name}|${a.rule}`) ?? []), a]);
  const pooledRule = gens.some((g) => g.decision.confirmRule === 'D357');
  const rows = [...by.values()].sort((a, b) => b.length - a.length || ((a[0] as ConfirmAttempt).name < (b[0] as ConfirmAttempt).name ? -1 : 1));
  const out = ['## Confirmation history (every attempt, pooled)', '',
    'Each generation gives a candidate a fresh confirmation batch, so a card that is a candidate again and again gets several chances to confirm by luck. '
    + (pooledRule
      ? 'Under D357 a repeat attempt is judged on every one of the card\'s confirmation batches pooled — a failed one counts against it — at a level halved for each earlier attempt (attempt j at the confirmation level / 2^(j−1)), so over any number of attempts a card with no real effect is cut with a chance of at most twice the level. A first attempt is judged exactly as before.'
      : 'This run uses D331\'s rule (each batch alone); the pooled column is reported, not used.'),
    '', '| Card | Rule | Attempts (each batch alone) | Every attempt pooled | Outcome |', '|---|---|---|---|---|'];
  for (const r of rows) {
    const first = r[0] as ConfirmAttempt;
    const each = r.map((a) => `g${a.gen}: ${ruleWords({ rule: a.rule, n: a.n, x: a.x, rate: a.x / a.n, p0: a.p0, deff: a.deff, p: a.p })} — ${a.confirmed ? 'confirmed' : 'not confirmed'}`).join('; ');
    const pooled = pooledTest(first.rule, r);
    const cut = r.find((a) => a.confirmed);
    out.push(`| ${first.name} | ${first.rule} | ${each} | ${pooled ? ruleWords(pooled) : '—'} (${r.length} attempt${r.length > 1 ? 's' : ''}) | ${cut ? `cut in generation ${cut.gen}` : 'kept'} |`);
  }
  out.push('');
  return out.join('\n');
}
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The one line appended to the cube document's `## Iteration log`. */
export function logEntry(g: GenSummary): string {
  const head = `v${g.versionOut} (${g.date}, cube lab evolve generation ${g.gen}: ${g.drafts} grid drafts, seeds ${g.seeds[0]}–${g.seeds[1]}, ${g.games} decisive games${confirmHead(g)})`;
  if (!g.decision.swaps.length) return `${head}: no swaps, v${g.versionIn} unchanged. ${g.decision.verdict}`;
  const sw = g.decision.swaps.map((s) => `**${s.out}** → **${s.in}** (${s.why}: ${s.evidence}; in: ${s.fit})`).join('; ');
  return `${head}: ${sw}.`;
}

function groupRows(gs: Group[]): string[] {
  return gs.map((x) => `| ${x.key} | ${x.decks} | ${x.games} | ${x.games ? r2(x.rate) : '–'} | ${r2(x.ci[0])}–${r2(x.ci[1])} | ${r2(x.shrunk)} |`);
}

const r3 = (x: number | null): string => (x === null ? '–' : x.toFixed(3));

/** D469: the balance rule's read, as table rows: pair, deck-games, payoff, 95% interval, |payoff − 0.5|, label, qualifies. */
function balancePairRows(b: BalanceDecision): string[][] {
  return b.pairs.map((r) => [r.pair, String(r.n), r3(r.est), `${r3(r.lo)}–${r3(r.hi)}`, r3(r.gap), r.label, r.qualifies ? (r.pair === b.worst ? 'yes, the worst' : 'yes') : `no (under ${b.minGames})`]);
}

/** D469: the balance rule's paragraph (the read, the target, the candidate set, the confirmation gate). */
function balanceWords(b: BalanceDecision): string[] {
  const c = b.candidates;
  return [
    `Read: ${b.source} (${b.job}, cube ${b.cube}), payoff arm ${b.arm}; pairs qualify at ${b.minGames}+ drafted deck-games; OFF / EVEN / UNCLEAR at ±${b.band} (J145's rule); at most ${b.budget} swap(s). `
      + `Colours: ${b.colours.map((r) => `${r.colour} ${r3(r.est)} (${r3(r.lo)}–${r3(r.hi)}) ${r.label}`).join(', ')}.`,
    ...(b.refusal ? [`No swap: ${b.refusal}.`] : []),
    ...(c ? [`Candidate set (${c.pair}): cuts ${c.cuts.map((x) => `${x.name} (rated ${x.rating}, on colour ${x.onColour}, played ${x.onColourDecks})`).join(', ') || 'none'}`
      + `${c.cutsExcluded.length ? `; not cut: ${c.cutsExcluded.map((x) => `${x.name} (${x.reason})`).join(', ')}` : ''}; additions ${c.additions.join(', ') || 'none'}`
      + `${c.additionsExcluded.length ? `; not added: ${c.additionsExcluded.map((x) => `${x.name} (${x.reason})`).join(', ')}` : ''}.`] : []),
    ...(b.unmatched.length ? [`Cuts with no addition keeping the constraints: ${b.unmatched.map((u) => `${u.name} (${u.reason})`).join('; ')}.`] : []),
    `Confirmation (the lab's): ${b.gate}.`,
  ];
}

/** The changelog section for one generation (Markdown). */
export function changelogSection(g: GenSummary): string {
  const d = g.decision;
  const out: string[] = [];
  out.push(`## Generation ${g.gen} — v${g.versionIn} → v${g.versionOut} (${g.date})`, '');
  out.push(`Discovery: ${g.drafts} grid drafts, seeds ${g.seeds[0]}–${g.seeds[1]}, ${g.games} decisive games; mean card win rate ${r2(g.balance.mean)}; `
    + `${d.discovery.family} tests at a false-discovery rate of ${d.discovery.q}; design effect of a card's games ${d.discovery.deff.toFixed(2)}${nullHead(d)}${confirmHead(g)}.`, '');
  if (g.explore) {
    const t = g.explore.table;
    const forced = Object.values(t.cells).reduce((s, c) => s + c.treated.decks, 0);
    out.push(`Exploration (D356): ${t.explored} of ${g.drafts} drafts explored, ${forced} deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other ${g.explore.plain} drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).`, '');
  }
  out.push(`**Verdict.** ${d.verdict}`, '');
  if (d.balance) {
    out.push('**The balance rule (D469).** ' + balanceWords(d.balance).join(' '), '',
      '| Pair | Deck-games | Payoff | 95% CI | Off 0.5 by | Label | Qualifies |', '|---|---|---|---|---|---|---|',
      ...balancePairRows(d.balance).map((r) => `| ${r.join(' | ')} |`), '');
  }
  if (d.confirmations.length) {
    out.push(`**Discovered, then confirmed or not** (${d.discovery.candidates} candidate(s); ${d.confirmBatch ? `the confirmation batch was sized for ${d.plan.drafts} drafts${d.plan.underpowered.length ? `, under-powered for ${d.plan.underpowered.join(', ')}` : ''}` : `a ${d.plan.drafts}-draft confirmation batch is due`}):`, '',
      '| Card | Rule | Discovery (this generation\'s drafts) | Confirmation (fresh drafts) | Every confirmation attempt pooled | Outcome |', '|---|---|---|---|---|---|');
    for (const c of d.confirmations) out.push(`| ${candidateRow(c, d.confirmRule).join(' | ')} |`);
    out.push('');
  }
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
    out.push(`**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — \`tools/cubelab.sh ratings init <cube.md>\` writes one — and pass \`--ratings <tsv>\`):`, '');
    out.push(rated.map((a) => a.name).join(', ') + '.', '');
  }
  const unplayed = d.assessments.filter((a) => a.status === 'builder-limited' && / in 0 deck\(s\)/.test(a.evidence));
  if (unplayed.length) out.push(`**Lands never played** (lands go by notes only: the lab's deckbuilder plays a dual or fetchland only in its own pair's decks and a colourless land never, so a land's numbers are its pair's): ${unplayed.map((a) => a.name).join(', ')}.`, '');
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

const VERDICT_WORDS: Record<string, string> = {
  holds: 'holds its own when played (underrated by its rating)',
  weak: 'weak when played (a human test: the notes decide)',
  undecided: 'undecided',
  'too-few': 'too few forced decks',
};

/** Every generation's explored drafts pooled, each low-rated card judged (D356); empty when nothing explored. */
export function exploreSection(gens: GenSummary[], o: ExploreJudgeOptions & { share: number; final: boolean }): string {
  const tables = gens.flatMap((g) => (g.explore ? [g.explore.table] : []));
  if (!tables.length) return '';
  const pooled = tables.reduce(mergeTables);
  const h = exploreHealth(pooled, o.share);
  const judged = judgeExplored(pooled, o);
  const limited = new Set(gens.flatMap((g) => g.decision.assessments.filter((a) => a.status === 'rating-limited').map((a) => a.name)));
  const order: Record<string, number> = { weak: 0, holds: 1, undecided: 2, 'too-few': 3 };
  const rows = [...judged].sort((a, b) => (order[a.verdict] ?? 9) - (order[b.verdict] ?? 9) || b.treatedDecks - a.treatedDecks || (a.name < b.name ? -1 : 1));
  const pc = (x: number): string => (Number.isFinite(x) ? x.toFixed(2) : '–');
  const sd = (x: number): string => (Number.isFinite(x) ? `${x >= 0 ? '+' : ''}${x.toFixed(2)}` : '–');
  const out = [`## Low-rated cards, judged by exploration (D356)${o.final ? '' : ' — provisional: generations still to run'}`, '',
    `The deckbuilder plays by rating, so a card rated under the rating-limited bar is rarely played and its "dead" signal says nothing. In ${h.explored} of ${h.drafts} drafts (share ${h.share.toFixed(3)}, z ${h.shareZ.toFixed(1)} against the ${o.share} asked), one such card that sat on colour in a pool was forced into the deck in place of the builder's lowest-rated choice of its mana value, at random with a recorded probability: ${h.treated} forced deck(s) against ${h.expected.toFixed(1)} expected (z ${h.treatedZ.toFixed(1)}). `
      + `A card's *delta* compares the decks it was forced into with the decks where it could have been and was not, weighted by those probabilities, one deck's match as one unit: its win rate in place of the builder's choice. It **holds its own** when delta is shown above −${o.margin} (BH at ${o.q}), it is **weak when played** when delta is shown below 0. Neither verdict cuts a card: a weak one is for Justin's notes, a holding one for its rating. `
      + `Every forced card pooled: delta ${sd(h.pooledDelta)} ± ${pc(1.96 * h.pooledSe)}; choice-deck mean rating, forced minus not (a balance check, ~0): ${h.balanceDiff.toFixed(2)}.`, '',
    '| Card | Rating-limited | Forced decks (games) | Expected | Win rate with it | Without | Delta (95% CI) | Verdict |', '|---|---|---|---|---|---|---|---|'];
  for (const j of rows) {
    out.push(`| ${j.name} | ${limited.has(j.name) ? 'yes' : ''} | ${j.treatedDecks} (${j.treatedGames}) | ${j.expected.toFixed(1)} | ${pc(j.withIt)} | ${pc(j.without)} | ${sd(j.delta)} (${sd(j.lo)} to ${sd(j.hi)}) | ${VERDICT_WORDS[j.verdict] ?? j.verdict} |`);
  }
  out.push('');
  return out.join('\n');
}

export function changelog(title: string, gens: GenSummary[], explore?: ExploreJudgeOptions & { share: number; final: boolean }): string {
  const ex = explore ? exploreSection(gens, explore) : '';
  const hist = confirmHistorySection(gens);
  return [`# ${title} — evolve changelog`, '',
    'Written by `tools/cubelab.sh evolve` (D299–D300, D331, D357). Each generation plays its drafts on the cube going in and swaps only what the evidence supports; docs/guides/cube-lab.md *Evolve* says how.', '',
    stagesInWords(gens[0]?.decision.discovery.q ?? 0.1), '',
    ...(hist ? [hist] : []),
    ...(ex ? [ex] : []),
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
  parts.push(`<p class="dim">Discovery: ${g.drafts} grid drafts, seeds ${g.seeds[0]}–${g.seeds[1]}, ${g.games} decisive games, mean card win rate ${r2(g.balance.mean)}, ${d.discovery.family} tests at FDR ${d.discovery.q}, design effect ${d.discovery.deff.toFixed(2)}${esc(nullHead(d))}${esc(confirmHead(g))}</p>`);
  parts.push(`<p class="verdict">${esc(d.verdict)}</p>`);
  if (d.balance) parts.push('<h3>The balance rule (D469)</h3>', `<p>${esc(balanceWords(d.balance).join(' '))}</p>`, table(['Pair', 'Deck-games', 'Payoff', '95% CI', 'Off 0.5 by', 'Label', 'Qualifies'], balancePairRows(d.balance)));
  if (d.confirmations.length) parts.push('<h3>Discovered, then confirmed or not</h3>', table(['Card', 'Rule', 'Discovery (this generation\'s drafts)', 'Confirmation (fresh drafts)', 'Every confirmation attempt pooled', 'Outcome'], d.confirmations.map((c) => candidateRow(c, d.confirmRule))));
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
<p class="dim">The cube lab's evolve loop (D299–D300, D331): each generation drafts the cube going in, plays the decks on Forge, and swaps only what the evidence supports. Win rates are over decisive games with Wilson 95% intervals; "shrunk" is the Beta-shrunk rate of meta.json (prior 20 games at the mean).</p>
<p>${esc(stagesInWords(gens[0]?.decision.discovery.q ?? 0.1)).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>')}</p>
${gens.map(htmlSection).join('\n')}
</body></html>
`;
}
