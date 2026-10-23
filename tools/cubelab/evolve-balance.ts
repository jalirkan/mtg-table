// mtg-table — the cube lab: `evolve --balance`, the balance rule (D469) — one gold swap in the worst colour pair.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The registered Omega swap rule (pc-results study/omega-swap-rule.md, accepted
// by Justin on 2026-10-23), as code.  Pure: a J145-shaped balance read
// (`balance.json`) and evolve's own SelectInput in, a Decision out.
//
// THE OBJECTIVE.  Over the colour pairs with at least balanceMinGames (400)
// drafted lab-vs-lab deck-games on the read's judged payoff arm (its
// `verdict.judgedPayoff`, `Blab` in J145), minimise max |pair payoff - 0.5|.
// The pair furthest from 0.5 is the target.
//
// WHEN IT ACTS.  Never on pull (only payoff is read).  It refuses, with the
// reason written down, when:
//   - a colour is OFF on that arm: the rule is written for a cube balanced at
//     colour level, and colour payoff must not drive a swap;
//   - no pair has balanceMinGames deck-games: nothing qualifies;
//   - the worst qualifying pair's interval includes 0.5: nothing to fix;
//   - a label the read carries disagrees with this file's classifier at
//     balanceBand: the band is not the read's, or the read is not J145's shape.
// OFF / EVEN / UNCLEAR is J145's registered classifier (payoffLabel below, the
// one copy in this repository; J145's read is a Python job script outside it):
// OFF when the 95% interval excludes the target AND the point is at least the
// band from it; EVEN when the interval sits inside [target - band, target +
// band]; else UNCLEAR.  The tests hold it to every label J145's read printed.
//
// THE CANDIDATE SET.  Cuts: the cube's gold cards of that pair (nonland, its
// two colours exactly, as evolve counts a pair's signposts).  Additions: the
// pool's gold cards of that pair that evolve's own add rules admit (addRules:
// Forge supports it, no `cut` note, not AI:RemoveDeck:All and rated at least
// deadMinRating unless a note says `try`, never cut before).  Gold for gold in
// one pair, so the pair's signposts and every colour count are unchanged.
// A balance swap is a rule of its own, not `dead`: a rating under deadMinRating
// does NOT shield a cut (`rating-limited` is the dead rule's guard).  The notes
// file wins as everywhere: `keep` (or `try`, for a card already in) takes a cut
// out of the set, `cut` keeps an addition out, `try` admits one and adds
// fitTry to its fit.  An AI-limited cube card is not a balance cut: only a note
// cuts one (evolve's rule for AI evidence; a pair's payoff is AI evidence).
//
// THE CHOICE.  Cuts in order of the generation's own evidence that the slot
// adds least to the pair's decks: the lowest on-colour play rate first (a card
// never on colour this generation last), then the lowest rating, then the
// name.  For each, evolve's existing fit ranks the additions, and the first
// that keeps every constraint (violations(): size and singleton, colour counts
// within colourSlack, lands exact, fixing at least the start, minSignposts gold
// a pair) is the swap.  At most balanceSwaps (1) a generation.
//
// WHAT IT LEAVES TO THE LAB.  Confirmation: a fresh-seed, J145-shaped
// re-measure keeps the swap only if the pair's interval then includes 0.5, no
// colour is OFF and no qualifying pair is OFF; else the cube reverts.  The
// stopping rule (success, two generations without a confirmed improvement, the
// candidate set used up) is the lab's too.  In balance mode no other rule
// swaps (their cuts are held and listed), so a move in the pair can be
// attributed to the one swap.

import {
  addRules, firstKeeping, fit, needOf, selectSwaps, violations,
  type Candidate, type Decision, type EvolveCard, type EvolveKnobs, type PoolCard, type SelectInput, type Swap,
} from './evolve.ts';

/** The read's own target for every payoff cell (J145's `target`: a win rate of one half). */
export const PAYOFF_TARGET = 0.5;
const PAIRS = ['WU', 'WB', 'WR', 'WG', 'UB', 'UR', 'UG', 'BR', 'BG', 'RG'];
const COLOURS = ['W', 'U', 'B', 'R', 'G'];

export type PayoffLabel = 'OFF' | 'EVEN' | 'UNCLEAR';

/** J145's registered classifier (its read's `label`), transcribed: OFF, EVEN or UNCLEAR. */
export function payoffLabel(est: number | null, lo: number | null, hi: number | null, target: number, band: number): PayoffLabel {
  if (est === null || lo === null || hi === null) return 'UNCLEAR';
  if ((lo > target || hi < target) && Math.abs(est - target) >= band - 1e-12) return 'OFF';
  if (lo >= target - band - 1e-12 && hi <= target + band + 1e-12) return 'EVEN';
  return 'UNCLEAR';
}

/** One payoff cell of the read: n deck-games, hits won, the point and its 95% interval (and, on a colour, its label). */
export interface PayoffCell { n: number; hits: number; est: number | null; lo: number | null; hi: number | null; target?: number; label?: PayoffLabel }

/** A J145-shaped balance read, the parts the rule uses. */
export interface BalanceRead {
  /** Where it was read from (a path, for the record). */
  source: string;
  job: string;
  cube: string;
  /** The judged payoff arm (`verdict.judgedPayoff`; `Blab` when the read names none). */
  arm: string;
  colours: Record<string, PayoffCell>;
  pairs: Record<string, PayoffCell>;
}

function cellOf(v: unknown, where: string): PayoffCell {
  const o = v as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') throw new Error(`balance read: ${where} is not a cell`);
  const num = (k: string, nullable: boolean): number | null => {
    const x = o[k];
    if (x === null && nullable) return null;
    if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error(`balance read: ${where}.${k} is not a number`);
    return x;
  };
  const label = o.label;
  if (label !== undefined && label !== 'OFF' && label !== 'EVEN' && label !== 'UNCLEAR') throw new Error(`balance read: ${where}.label is ${String(label)}`);
  return {
    n: num('n', false) as number, hits: num('hits', false) as number, est: num('est', true), lo: num('lo', true), hi: num('hi', true),
    ...(typeof o.target === 'number' ? { target: o.target } : {}), ...(label ? { label: label as PayoffLabel } : {}),
  };
}

/** A balance.json (J145's shape: `payoff.<arm>.colour` and `.pairs`, `verdict.judgedPayoff`) as the rule reads it. */
export function parseBalanceRead(text: string, source: string): BalanceRead {
  const d = JSON.parse(text) as Record<string, unknown>;
  const verdict = (d.verdict ?? {}) as Record<string, unknown>;
  const arm = typeof verdict.judgedPayoff === 'string' ? verdict.judgedPayoff : 'Blab';
  const payoff = (d.payoff ?? {}) as Record<string, Record<string, unknown>>;
  const a = payoff[arm];
  if (!a || typeof a !== 'object') throw new Error(`balance read ${source}: no payoff.${arm} (a J145-shaped balance.json has payoff.<arm>.colour and .pairs)`);
  const colour = (a.colour ?? {}) as Record<string, unknown>;
  const pairs = (a.pairs ?? {}) as Record<string, unknown>;
  const missing = [...COLOURS.filter((c) => !(c in colour)).map((c) => `colour ${c}`), ...PAIRS.filter((p) => !(p in pairs)).map((p) => `pair ${p}`)];
  if (missing.length) throw new Error(`balance read ${source}: payoff.${arm} lacks ${missing.join(', ')}`);
  return {
    source, job: typeof d.job === 'string' ? d.job : '?', cube: typeof d.cube === 'string' ? d.cube : '?', arm,
    colours: Object.fromEntries(COLOURS.map((c) => [c, cellOf(colour[c], `payoff.${arm}.colour.${c}`)])),
    pairs: Object.fromEntries(PAIRS.map((p) => [p, cellOf(pairs[p], `payoff.${arm}.pairs.${p}`)])),
  };
}

// ------------------------------------------------------------------ the target

export interface PairRow { pair: string; n: number; est: number | null; lo: number | null; hi: number | null; gap: number | null; label: PayoffLabel; qualifies: boolean }
export interface ColourRow { colour: string; n: number; est: number | null; lo: number | null; hi: number | null; label: PayoffLabel }

export interface BalanceTarget {
  colours: ColourRow[];
  /** Every pair, in evolve's pair order, labelled and marked qualifying (n >= balanceMinGames). */
  pairs: PairRow[];
  /** The qualifying pair furthest from 0.5 (null: none qualifies). */
  worst: PairRow | null;
  /** Why the rule does not act (null: it acts on `worst`). */
  refusal: string | null;
}

const f3 = (x: number | null): string => (x === null ? '–' : x.toFixed(3));

/** The objective over the read: the qualifying pairs, the worst of them, and whether the rule may act. */
export function balanceTarget(read: BalanceRead, k: EvolveKnobs): BalanceTarget {
  const t = PAYOFF_TARGET;
  const band = k.balanceBand;
  const mismatch: string[] = [];
  const colours = COLOURS.map((c): ColourRow => {
    const x = read.colours[c] as PayoffCell;
    const label = payoffLabel(x.est, x.lo, x.hi, x.target ?? t, band);
    if (x.label && x.label !== label) mismatch.push(`colour ${c}: the read says ${x.label}, D469's classifier at band ${band} says ${label}`);
    return { colour: c, n: x.n, est: x.est, lo: x.lo, hi: x.hi, label };
  });
  const pairs = PAIRS.map((p): PairRow => {
    const x = read.pairs[p] as PayoffCell;
    const label = payoffLabel(x.est, x.lo, x.hi, t, band);
    if (x.label && x.label !== label) mismatch.push(`pair ${p}: the read says ${x.label}, D469's classifier at band ${band} says ${label}`);
    return { pair: p, n: x.n, est: x.est, lo: x.lo, hi: x.hi, gap: x.est === null ? null : Math.abs(x.est - t), label, qualifies: x.n >= k.balanceMinGames && x.est !== null && x.lo !== null && x.hi !== null };
  });
  const q = pairs.filter((r) => r.qualifies);
  const worst = q.reduce<PairRow | null>((w, r) => (w === null || (r.gap as number) > (w.gap as number) ? r : w), null);
  const off = colours.filter((c) => c.label === 'OFF');
  const refusal = mismatch.length ? `the read's own labels disagree with D469's classifier (${mismatch.join('; ')})`
    : off.length ? `colour ${off.map((c) => `${c.colour} is OFF (${f3(c.est)}, ${f3(c.lo)}–${f3(c.hi)})`).join(', ')} on ${read.arm}: the rule is written for a cube balanced at colour level, and colour payoff must not drive a swap -- a new report and a new rule`
      : !worst ? `no colour pair has ${k.balanceMinGames} drafted deck-games on ${read.arm} (the most: ${[...pairs].sort((a, b) => b.n - a.n)[0]?.pair ?? '?'} with ${Math.max(...pairs.map((r) => r.n))})`
        : (worst.lo as number) <= t && t <= (worst.hi as number) ? `the worst qualifying pair, ${worst.pair} (${f3(worst.est)}, ${f3(worst.lo)}–${f3(worst.hi)}, ${worst.n} deck-games), has an interval that includes ${t}: nothing to fix`
          : null;
  return { colours, pairs, worst, refusal };
}

// ------------------------------------------------------------------ the candidate set

export interface BalanceCut { name: string; rating: number; onColour: number; onColourDecks: number }
export interface BalanceCandidates {
  pair: string;
  /** The cube's gold cards of the pair the rule may cut, in the order it tries them. */
  cuts: BalanceCut[];
  cutsExcluded: Array<{ name: string; reason: string }>;
  /** The pool's gold cards of the pair the add rules admit, by name. */
  additions: string[];
  /** Every other pool card of the pair (nonland, its two colours), with the first rule that keeps it out. */
  additionsExcluded: Array<{ name: string; reason: string }>;
}

/** The pair's cuts and additions under the notes and evolve's add rules (see the header). */
export function balanceCandidates(x: SelectInput, pair: string): BalanceCandidates {
  const k = x.knobs;
  const gold = (c: { colors: string; land: boolean }): boolean => !c.land && c.colors === pair;
  const cuts: BalanceCut[] = [];
  const cutsExcluded: BalanceCandidates['cutsExcluded'] = [];
  for (const c of x.cards.filter(gold)) {
    const n = x.notes.get(c.name);
    if (n?.verdict === 'keep' || n?.verdict === 'try') { cutsExcluded.push({ name: c.name, reason: `notes: ${n.verdict}${n.note ? ` (${n.note})` : ''}` }); continue; }
    if (c.aiFlag !== 'none' && n?.verdict !== 'cut') { cutsExcluded.push({ name: c.name, reason: `AI:RemoveDeck:${c.aiFlag}: only a note cuts it` }); continue; }
    const s = x.stats.get(c.name);
    cuts.push({ name: c.name, rating: c.rating, onColour: s?.onColour ?? 0, onColourDecks: s?.onColourDecks ?? 0 });
  }
  const rate = (c: BalanceCut): number => (c.onColour > 0 ? c.onColourDecks / c.onColour : Infinity);
  cuts.sort((a, b) => rate(a) - rate(b) || a.rating - b.rating || (a.name < b.name ? -1 : 1));
  const { tries, noteCut, eligible } = addRules(x);
  const inCube = new Set(x.cards.map((c) => c.name));
  const additions: string[] = [];
  const additionsExcluded: BalanceCandidates['additionsExcluded'] = [];
  for (const p of x.pool.filter(gold)) {
    if (eligible(p)) { additions.push(p.name); continue; }
    const t = tries.has(p.name);
    const reason = inCube.has(p.name) ? 'in the cube' : !p.supported ? 'Forge does not support it' : noteCut.has(p.name) ? 'notes: cut'
      : x.tabu.has(p.name) && !t ? 'cut by an earlier generation' : p.aiFlag === 'All' && !t ? 'AI:RemoveDeck:All'
        : p.rating < k.deadMinRating && !t ? `rated ${p.rating}, under deadMinRating ${k.deadMinRating}` : 'not eligible';
    additionsExcluded.push({ name: p.name, reason });
  }
  additions.sort();
  additionsExcluded.sort((a, b) => (a.name < b.name ? -1 : 1));
  return { pair, cuts, cutsExcluded, additions, additionsExcluded };
}

// ------------------------------------------------------------------ the decision

/** A balance swap's evidence, as numbers (Swap.balance; evolve.json records it). */
export interface BalanceEvidence {
  rule: 'balance';
  /** The read: its job and its judged arm. */
  read: string;
  arm: string;
  pair: string;
  payoff: number;
  interval: [number, number];
  /** Drafted deck-games behind the pair's payoff. */
  n: number;
  /** |payoff - 0.5|, the largest over `qualifying` pairs. */
  gap: number;
  qualifying: number;
  minGames: number;
  band: number;
  cut: string;
  addition: string;
}

/** The balance rule's account of a generation (Decision.balance). */
export interface BalanceDecision {
  source: string;
  job: string;
  cube: string;
  arm: string;
  band: number;
  minGames: number;
  budget: number;
  colours: ColourRow[];
  pairs: PairRow[];
  worst: string | null;
  /** Why it did not act (null: it acted, or tried to). */
  refusal: string | null;
  candidates: BalanceCandidates | null;
  /** Cuts of the set that found no addition keeping the constraints. */
  unmatched: Array<{ name: string; reason: string }>;
  /** What the lab's fresh-seed re-measure must show to keep the swap. */
  gate: string;
}

export const HOLD_REASON = 'balance mode (D469): this generation swaps by the balance rule alone, so a move in the pair\'s payoff can be attributed';

/**
 * selectSwaps in balance mode: every rule assessed and reported as usual, no
 * cut but the balance rule's (the others held, in `unmatched`), and at most
 * balanceSwaps gold-for-gold swaps in the read's worst qualifying pair.
 */
export function selectBalanceSwaps(x: SelectInput, read: BalanceRead): Decision {
  const k = x.knobs;
  const base = selectSwaps({ ...x, holdCuts: HOLD_REASON });
  const t = balanceTarget(read, k);
  const w = t.worst;
  const gate = w
    ? `kept only if a fresh-seed, ${read.job}-shaped re-measure of the swapped cube shows ${w.pair}'s ${read.arm} interval including ${PAYOFF_TARGET}, no colour OFF and no pair with ${k.balanceMinGames}+ deck-games OFF (band ±${k.balanceBand}); else the cube reverts`
    : 'no swap to confirm';
  const acc: BalanceDecision = {
    source: read.source, job: read.job, cube: read.cube, arm: read.arm, band: k.balanceBand, minGames: k.balanceMinGames, budget: k.balanceSwaps,
    colours: t.colours, pairs: t.pairs, worst: w?.pair ?? null, refusal: t.refusal, candidates: null, unmatched: [], gate,
  };
  const others = `The AI rules, reported only: ${base.verdict}`;
  if (t.refusal || !w) return { ...base, balance: acc, verdict: `Balance rule (D469): no swap — ${t.refusal ?? 'nothing qualifies'}. ${others}` };

  const cand = balanceCandidates(x, w.pair);
  acc.candidates = cand;
  const mean = x.balance.mean;
  const need = { theme: needOf(x.balance.themes, mean), colour: needOf(x.balance.colours, mean) };
  const { tries } = addRules(x);
  const themeCodes = new Set(Object.keys(x.cube.themeNames));
  const byName = new Map(x.cards.map((c) => [c.name, c]));
  const poolBy = new Map(x.pool.map((p) => [p.name, p]));
  const qualifying = t.pairs.filter((r) => r.qualifies).length;
  let current = [...x.cards];
  const swaps: Swap[] = [];
  const added = new Set<string>();
  for (const c of cand.cuts) {
    if (swaps.length >= k.balanceSwaps) break;
    const cut = byName.get(c.name) as EvolveCard;
    const ranked: Candidate[] = cand.additions.filter((n) => !added.has(n)).map((n) => fit(cut, 'balance', poolBy.get(n) as PoolCard, need, tries.has(n), k))
      .sort((p, q) => q.score - p.score || (p.card.name < q.card.name ? -1 : 1));
    const chosen = firstKeeping(x, current, cut, ranked, themeCodes);
    if (!chosen) { acc.unmatched.push({ name: c.name, reason: cand.additions.length ? 'no addition of the pair keeps the constraints' : 'the pool has no eligible gold card of the pair' }); continue; }
    current = chosen.next;
    added.add(chosen.card.name);
    const ev: BalanceEvidence = {
      rule: 'balance', read: read.job, arm: read.arm, pair: w.pair, payoff: w.est as number, interval: [w.lo as number, w.hi as number], n: w.n,
      gap: Math.round((w.gap as number) * 10000) / 10000, qualifying, minGames: k.balanceMinGames, band: k.balanceBand, cut: cut.name, addition: chosen.card.name,
    };
    const play = c.onColour ? `on colour in ${c.onColour} pool(s) this generation, played in ${c.onColourDecks}` : 'never on colour this generation';
    const evidence = `balance (D469): ${read.job} ${read.arm}, ${w.pair} pays ${f3(w.est)} (${f3(w.lo)}–${f3(w.hi)}, ${w.n} deck-games), ${w.label}; `
      + `|payoff − ${PAYOFF_TARGET}| ${f3(w.gap)}, the largest of ${qualifying} pair(s) with at least ${k.balanceMinGames}; `
      + `colours ${t.colours.map((r) => `${r.colour} ${r.label}`).join(', ')}; the cut: ${w.pair} gold, ${play}, rated ${cut.rating}`;
    swaps.push({ out: cut.name, outSection: cut.section, in: chosen.card.name, inSection: chosen.card.section, why: 'balance', evidence, fit: chosen.cand.parts, balance: ev });
  }
  const head = `${w.pair} pays ${f3(w.est)} (${f3(w.lo)}–${f3(w.hi)}, ${w.n} deck-games on ${read.job} ${read.arm}), the furthest from ${PAYOFF_TARGET} of ${qualifying} pair(s) with at least ${k.balanceMinGames}`;
  const verdict = swaps.length
    ? `Balance rule (D469): ${head}; ${swaps.map((s) => `${s.out} → ${s.in}`).join(', ')} — ${gate}. ${others}`
    : `Balance rule (D469): ${head}; no swap — ${!cand.cuts.length ? `no ${w.pair} gold card may be cut (${cand.cutsExcluded.map((e) => `${e.name}: ${e.reason}`).join('; ') || 'the cube has none'})` : !cand.additions.length ? `the pool has no eligible ${w.pair} gold card` : 'no addition keeps the constraints'}: the candidate set is used up. ${others}`;
  return { ...base, swaps, balance: acc, verdict, violationsAfter: violations(current, x.constraints) };
}
