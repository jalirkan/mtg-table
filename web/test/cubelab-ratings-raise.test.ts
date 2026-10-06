/*
 * mtg-table — web/test/cubelab-ratings-raise.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * `ratings apply --rule explore-eb` (tools/cubelab/raise.ts, raisecmd.ts; D360),
 * engine-free:
 *
 *  - the shrinkage: tau^2 about 0 by the method of moments (hand values, never
 *    negative, 0 when the deltas are noise), and a noisier delta moves less;
 *  - the rule: only `holds` moves; undecided, too few, weak (never lowered) and
 *    AI-limited (D343) cards stay; the target is the replaced spells' mean
 *    rating plus K x shrunk delta; the cap holds a card under the top-pick
 *    line unless its interval is above 0; a rating is never lowered;
 *  - the changelog: the pooled table evolve-report.ts prints is read back to
 *    the exact rows within its two decimals, with the generations' seeds;
 *  - the replay check names every way a replay differs from the changelog;
 *  - the apply step on a hand-made evolve folder: the TSV differs from the
 *    base in exactly the raised lines, and the report lists every judged card;
 *  - the A/B reading (ratings-verify.ts, PC job J064): played rates, the
 *    D357-pooled weak / dominant tests with look 2's spend, a design effect,
 *    and the pairs' spread and de-noised SD.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import type { Fact } from '../../tools/cubelab/cards.ts';
import type { DeckBuild } from '../../tools/cubelab/deck.ts';
import { exploreSection, type GenSummary } from '../../tools/cubelab/evolve-report.ts';
import { exploreTable, type ExploreRecord, type ExploreSeat, type ExploreTable } from '../../tools/cubelab/explore.ts';
import {
  anchorsOf, applyToTsv, parseExploreChangelog, quantile, raiseRatings, rowsFromTables, shrink, tau2About0,
  RAISE_DEFAULTS, type Anchor, type JudgedRow, type RaiseInput,
} from '../../tools/cubelab/raise.ts';
import { applyRaise, evidenceFromFolder, replayProblems, type Replay } from '../../tools/cubelab/raisecmd.ts';
import { parseRatings } from '../../tools/cubelab/ratings.ts';
import { verifyRaise, verifyReport, type BatchView, type CardVerdict } from '../../tools/cubelab/ratings-verify.ts';
import { pooledTest } from '../../tools/cubelab/evolve.ts';
import { binomLower } from '../../tools/cubelab/evolve-stats.ts';

const close = (a: number, b: number, eps = 1e-9): void => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);

function row(name: string, delta: number, se: number, verdict: JudgedRow['verdict'], o: Partial<JudgedRow> = {}): JudgedRow {
  return { name, forcedDecks: 40, forcedGames: 100, expected: 40, delta, se, lo: delta - 1.96 * se, hi: delta + 1.96 * se, verdict, ...o };
}
const anchor = (mean: number, forced = 40): Anchor => ({ forced, mean, outs: { Filler: forced } });

// A cube whose nonland ratings run 1..100: the top-pick line (90th percentile) is 90, the best 100.
const NONLAND = Array.from({ length: 100 }, (_, i) => i + 1);

function input(rows: JudgedRow[], anchors: Record<string, number>, base: Record<string, number>, aiLimited: string[] = []): RaiseInput {
  return {
    rows, anchors: new Map(Object.entries(anchors).map(([n, m]) => [n, anchor(m)])),
    base: new Map(Object.entries(base)), nonlandRatings: NONLAND, aiLimited: new Set(aiLimited),
  };
}

// ------------------------------------------------------------ shrinkage

test('tau^2 about 0: hand values, never negative, and 0 when the deltas are noise', () => {
  // w = 1/se^2 = 100 each; sum w d^2 = 100 (0.04 + 0.04 + 0) = 8; k = 3; sum w = 300: (8 - 3) / 300.
  close(tau2About0([{ delta: 0.2, se: 0.1 }, { delta: -0.2, se: 0.1 }, { delta: 0, se: 0.1 }]), 5 / 300);
  assert.equal(tau2About0([{ delta: 0.01, se: 0.1 }, { delta: -0.02, se: 0.1 }]), 0);
  assert.equal(tau2About0([]), 0);
  assert.equal(tau2About0([{ delta: NaN, se: 0.1 }]), 0);
  // Shrinkage: tau^2 / (tau^2 + se^2) of the delta, so a noisier one keeps less of it.
  close(shrink(0.1, 0.1, 0.01), 0.05);
  assert.ok(shrink(0.1, 0.2, 0.01) < shrink(0.1, 0.05, 0.01));
  assert.equal(shrink(0.3, 0.1, 0), 0);
  assert.equal(quantile(NONLAND, 0.9), 90);
});

// ------------------------------------------------------------ the rule

test('no change without evidence: only holds moves; weak is never lowered; AI-limited stays', () => {
  const rows = [
    row('Holder', 0.05, 0.04, 'holds'),
    row('Unsure', 0.08, 0.09, 'undecided'),
    row('Rare', 0.3, 0.2, 'too-few'),
    row('Weak', -0.16, 0.066, 'weak'),
    row('Flagged', 0.1, 0.04, 'holds'),
    row('Spread', -0.1, 0.03, 'undecided'),
  ];
  const r = raiseRatings(input(rows, { Holder: 70, Unsure: 70, Rare: 70, Weak: 70, Flagged: 70, Spread: 70 },
    { Holder: 40, Unsure: 40, Rare: 40, Weak: 40, Flagged: 40, Spread: 40 }, ['Flagged']));
  assert.deepEqual(r.changes.map((c) => c.name), ['Holder']);
  const why = new Map(r.kept.map((k) => [k.name, k.why]));
  assert.match(why.get('Unsure') as string, /^undecided/);
  assert.match(why.get('Rare') as string, /^too few/);
  assert.match(why.get('Weak') as string, /never lowered/);
  assert.match(why.get('Flagged') as string, /AI-limited/);
  assert.equal(r.kept.find((k) => k.name === 'Weak')?.rating, 40);
  assert.equal(r.judged, 5);                     // too few is not part of the shrinkage
  // No holder at all: nothing changes.
  assert.equal(raiseRatings(input(rows.filter((x) => x.verdict !== 'holds'), {}, { Unsure: 40 })).changes.length, 0);
});

test('the target is the replaced spells\' rating plus K x shrunk delta, and shrinkage orders the raises', () => {
  // Two holders with the same delta; B is noisier, so it keeps less of it.  Spread rows give tau^2 > 0.
  const rows = [
    row('A', 0.1, 0.03, 'holds'), row('B', 0.1, 0.08, 'holds'),
    row('S1', 0.15, 0.03, 'undecided'), row('S2', -0.12, 0.03, 'undecided'), row('S3', 0, 0.05, 'undecided'),
  ];
  const r = raiseRatings(input(rows, { A: 60, B: 60 }, { A: 30, B: 30, S1: 30, S2: 30, S3: 30 }));
  const tau2 = tau2About0(rows);
  assert.ok(tau2 > 0);
  close(r.tau2, tau2);
  close(r.meanAnchor, 60);
  close(r.pointsPerWin, (90 - 60) / 0.1);      // auto: (top-pick line - mean anchor) / effect
  const a = r.changes.find((c) => c.name === 'A');
  const b = r.changes.find((c) => c.name === 'B');
  assert.ok(a && b);
  close(a.shrunk, shrink(0.1, 0.03, tau2));
  close(a.target, 60 + 300 * a.shrunk);
  assert.equal(a.new, Math.round(a.target * 10) / 10);
  assert.ok(b.shrunk < a.shrunk && b.new < a.new && b.new > 60);
  // tau^2 = 0 (every delta is noise): the target is the anchor itself, for every holder.
  const flat = raiseRatings(input([row('C', 0.01, 0.05, 'holds'), row('D', -0.01, 0.05, 'holds')], { C: 55, D: 65 }, { C: 20, D: 20 }));
  assert.equal(flat.tau2, 0);
  assert.deepEqual(flat.changes.map((c) => [c.name, c.new]), [['D', 65], ['C', 55]]);
  // A fixed exchange rate overrides the auto one.
  const fixed = raiseRatings(input(rows, { A: 60, B: 60 }, { A: 30, B: 30 }), { ...RAISE_DEFAULTS, pointsPerWin: 100 });
  assert.equal(fixed.pointsPerWin, 100);
});

test('the cap: under the top-pick line unless the interval is above 0, then at most the best card', () => {
  const rows = [
    row('Weakish', 0.04, 0.03, 'holds'),            // interval includes 0: not strong
    row('Strong', 0.3, 0.05, 'holds'),              // interval above 0: strong
    row('S1', 0.25, 0.03, 'undecided'), row('S2', -0.25, 0.03, 'undecided'),
  ];
  const r = raiseRatings(input(rows, { Weakish: 88, Strong: 88 }, { Weakish: 50, Strong: 50, S1: 50, S2: 50 }),
    { ...RAISE_DEFAULTS, pointsPerWin: 1000 });
  const w = r.changes.find((c) => c.name === 'Weakish');
  const s = r.changes.find((c) => c.name === 'Strong');
  assert.ok(w && s);
  assert.equal(w.strong, false);
  assert.equal(w.capped, true);
  assert.equal(w.new, 89.9);                     // one step under the line (90)
  assert.equal(s.strong, true);
  assert.equal(s.capped, true);
  assert.equal(s.new, 100);                      // above the line, never above the best card
});

test('a rating is only ever raised', () => {
  // Holds its own, but its rating already sits above what it replaced (and its shrunk delta is negative).
  const r = raiseRatings(input([row('High', -0.05, 0.03, 'holds'), row('S', 0.2, 0.03, 'undecided')], { High: 60 }, { High: 75, S: 40 }));
  assert.equal(r.changes.length, 0);
  assert.match(r.kept.find((k) => k.name === 'High')?.why as string, /not above its rating/);
});

test('anchors: the mean rating of the spells each forced card replaced', () => {
  const rating = new Map([['Low1', 60], ['Low2', 70]]);
  const a = anchorsOf([{ in: 'X', out: 'Low1' }, { in: 'X', out: 'Low2' }, { in: null, out: null }, null, { in: 'Y', out: 'Low2' }], (n) => rating.get(n));
  close((a.get('X') as Anchor).mean, 65);
  assert.deepEqual((a.get('X') as Anchor).outs, { Low1: 1, Low2: 1 });
  assert.equal((a.get('Y') as Anchor).forced, 1);
  assert.throws(() => anchorsOf([{ in: 'X', out: 'Nobody' }], () => undefined), /no rating for Nobody/);
});

// ------------------------------------------------------------ evidence: a hand-made explored batch

const deck = (meanRating: number): DeckBuild => ({ parts: { meanRating } } as unknown as DeckBuild);
function seat(eligible: Array<[string, number]>, inCard: string | null, out: string | null = inCard ? 'Filler' : null): ExploreSeat {
  return { eligible, in: inCard, out, choice: deck(70) };
}
/** n explored drafts: seat A forced `card` in the first `forced` of them; A wins `win(i)` of 3 games. */
function batch(card: string, n: number, forced: number, winForced: number, winControl: number): Array<{ explore: ExploreRecord; match: { games: Array<{ winner: string }> } }> {
  const out = [];
  for (let i = 0; i < n; i++) {
    const isIn = i < forced;
    const wins = isIn ? (i % 10 < winForced * 10 ? 2 : 1) : (i % 10 < winControl * 10 ? 2 : 1);
    const games = [...Array.from({ length: wins }, () => ({ winner: 'A' })), ...Array.from({ length: 3 - wins }, () => ({ winner: 'B' }))];
    out.push({ explore: { share: 0.3, cap: 4, gold: 4, below: 60, seats: [seat([[card, 0.25]], isIn ? card : null), null] as [ExploreSeat | null, ExploreSeat | null] }, match: { games } });
  }
  return out;
}

function tables(): ExploreTable {
  return exploreTable([
    ...batch('Good', 200, 50, 0.9, 0.5),
    ...batch('Even', 200, 50, 0.5, 0.5),
    ...batch('Bad', 200, 50, 0.0, 0.9),
    ...batch('Rare', 40, 3, 0.9, 0.5),
  ]);
}

test('the changelog\'s pooled table reads back to the exact rows within its two decimals', () => {
  const t = tables();
  const exact = rowsFromTables([t], { margin: 0.1, minDecks: 10, q: 0.1 });
  const gen = (g: number): GenSummary => ({
    gen: g, versionIn: 1, versionOut: 1, date: '2026-10-04', drafts: 640, seeds: [1, 640], games: 3,
    decision: { discovery: { deff: 1 }, assessments: [] }, balance: { mean: 0.5 }, stats: [], explore: { plain: 0, table: t },
  }) as unknown as GenSummary;
  const md = exploreSection([gen(1)], { margin: 0.1, minDecks: 10, q: 0.1, share: 0.3, final: true });
  const text = `# title\n\n${md}\n## Generation 1 — v1 → v1 (2026-10-04)\n\nDiscovery: 640 grid drafts, seeds 3000001–3000640, 1 decisive games\n`;
  const cl = parseExploreChangelog(text);
  assert.equal(cl.provisional, false);
  assert.equal(cl.explored, 640);
  assert.deepEqual(cl.seeds, [[3000001, 3000640]]);
  assert.equal(cl.rows.length, exact.length);
  for (const e of exact) {
    const p = cl.rows.find((x) => x.name === e.name) as JudgedRow;
    assert.equal(p.verdict, e.verdict, e.name);
    assert.equal(p.forcedDecks, e.forcedDecks);
    assert.equal(p.forcedGames, e.forcedGames);
    close(p.delta, e.delta, 0.005 + 1e-9);
    close(p.se, e.se, 0.01 / 3.92 + 1e-9);
  }
  assert.deepEqual(Object.fromEntries(exact.map((e) => [e.name, e.verdict])), { Bad: 'weak', Even: 'holds', Good: 'holds', Rare: 'too-few' });
  // A provisional table is flagged; a changelog without the section is refused.
  assert.equal(parseExploreChangelog(text.replace('(D356)', '(D356) — provisional: generations still to run')).provisional, true);
  assert.throws(() => parseExploreChangelog('# nothing here\n'), /no "Low-rated cards/);
});

test('the replay check names every way a replay differs from the changelog', () => {
  const cl = { rows: [row('X', 0, 0.05, 'holds', { forcedDecks: 5, expected: 4.2 })], explored: 10, drafts: 30, seeds: [[1, 30]] as Array<[number, number]>, provisional: false };
  const good: Replay = { drafts: 30, explored: 10, forced: new Map([['X', 5]]), expected: new Map([['X', 4.23]]), seats: [] };
  assert.deepEqual(replayProblems(cl, good), []);
  const bad: Replay = { drafts: 29, explored: 9, forced: new Map([['X', 4]]), expected: new Map([['X', 4.4], ['Z', 1]]), seats: [] };
  const p = replayProblems(cl, bad);
  assert.equal(p.length, 5);
  assert.match(p.join('\n'), /replayed 29 drafts[\s\S]*explored 9[\s\S]*X: replay forced 4[\s\S]*X: replay expected 4.40[\s\S]*Z: a target in the replay/);
});

// ------------------------------------------------------------ the apply step on a fixture evolve folder

test('ratings apply on an evolve folder: exactly the holders change, with their evidence', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ratings-raise-'));
  try {
    writeFileSync(join(dir, 'evolve.json'), JSON.stringify({ explore: { share: 0.3, cap: 4, gold: 4, margin: 0.1, minDecks: 10 }, knobs: { fdrQ: 0.1 } }));
    const recs = [...batch('Good', 200, 50, 0.9, 0.5), ...batch('Even', 200, 50, 0.5, 0.5), ...batch('Bad', 200, 50, 0.0, 0.9), ...batch('Rare', 40, 3, 0.9, 0.5)];
    // Two generations, half the drafts each: the pooled table is the one batch's.
    for (const [g, part] of [['gen-01', recs.filter((_, i) => i % 2 === 0)], ['gen-02', recs.filter((_, i) => i % 2 === 1)]] as const) {
      mkdirSync(join(dir, g, 'run'), { recursive: true });
      writeFileSync(join(dir, g, 'summary.json'), JSON.stringify({ explore: { plain: 0, table: exploreTable(part) } }));
      writeFileSync(join(dir, g, 'result.json'), '{}');
      writeFileSync(join(dir, g, 'run', 'drafts.jsonl'), part.map((r) => JSON.stringify(r)).join('\n') + '\n');
    }
    // An undecided generation is not read (no result.json).
    mkdirSync(join(dir, 'gen-03', 'run'), { recursive: true });
    writeFileSync(join(dir, 'gen-03', 'summary.json'), JSON.stringify({ explore: { plain: 0, table: exploreTable(batch('Good', 50, 50, 0, 0)) } }));

    const names = ['Good', 'Even', 'Bad', 'Rare', 'Filler', 'Top', 'Island'];
    const baseText = [
      '# cube lab ratings for: Fixture', '# name\trating\tforge\tsource',
      'Good\t30\t30\tcube:X', 'Even\t45\t45\tcube:X', 'Bad\t40\t40\tcube:X', 'Rare\t35\t35\tcube:X',
      'Filler\t70\t70\tcube:X', 'Top\t99\t99\tcube:X', 'Island\t10\t10\tcube:X',
    ].join('\n') + '\n';
    const base = parseRatings(baseText);
    const facts = names.map((n) => ({ listed: n, found: true, name: n, land: n === 'Island', remAIDeck: false, remRandomDeck: false }) as Fact);
    const ev = evidenceFromFolder(dir, (n) => base.get(n));
    assert.deepEqual(Object.fromEntries(ev.rows.map((r) => [r.name, r.verdict])), { Bad: 'weak', Even: 'holds', Good: 'holds', Rare: 'too-few' });
    assert.equal((ev.anchors.get('Good') as Anchor).forced, 50);
    close((ev.anchors.get('Good') as Anchor).mean, 70);

    const a = applyRaise({ facts, cubeNames: names, baseText, baseName: 'fixture.tsv', evidence: ev, rule: 'explore-eb', options: RAISE_DEFAULTS, date: '2026-10-04' });
    assert.deepEqual(a.result.changes.map((c) => c.name).sort(), ['Even', 'Good']);
    const good = a.result.changes.find((c) => c.name === 'Good');
    // It won far more than what it replaced (interval above 0): strong, so capped at the best card, not the line.
    assert.ok(good && good.strong && good.capped && good.new === 99);
    const even = a.result.changes.find((c) => c.name === 'Even');
    assert.ok(even && !even.strong && even.new > 45 && even.new < 99);
    const out = parseRatings(a.tsv);
    for (const n of names) {
      const c = a.result.changes.find((x) => x.name === n);
      assert.equal(out.get(n), c ? c.new : base.get(n), n);
    }
    // Every non-comment line but the raised ones is byte for byte the base's; the header says what made it.
    const lines = (t: string): string[] => t.split('\n').filter((l) => l && !l.startsWith('#'));
    const diff = lines(a.tsv).filter((l, i) => l !== lines(baseText)[i]);
    assert.equal(diff.length, 2);
    assert.match(a.tsv, /^# D360 \(2026-10-04\): 2 rating\(s\) raised/m);
    assert.match(a.report, /\| Good \| 30 \| [\d.]+ \| \+/);
    assert.match(a.report, /\| Bad \| 40 \| weak \|/);
    assert.match(a.report, /\| Rare \| 35 \| too-few \|/);
    assert.equal(JSON.parse(a.json).changes.length, 2);
    // A card the base file does not list cannot be written.
    assert.throws(() => applyToTsv('Other\t1\n', a.result.changes, []), /not in the base ratings file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------ the A/B reading (ratings-verify.ts)

function bv(drafts: number, deff: number, cards: Record<string, [number, number, number, number]>, pairs: Record<string, [number, number]> = {}): BatchView {
  return {
    drafts, mean: 0.5, deff,
    stats: new Map(Object.entries(cards).map(([n, [onColour, onColourDecks, games, wins]]) => [n, { onColour, onColourDecks, games, wins, inDecks: onColourDecks, picked: onColour }])),
    pairs: Object.entries(pairs).map(([key, [games, wins]]) => ({ key, games, wins })),
  };
}

test('the A/B reading: played rates, D357-pooled weak and dominant tests with the spend, and pair balance', () => {
  const raised = [{ name: 'Bad', old: 40, new: 70 }, { name: 'Fine', old: 40, new: 70 }, { name: 'Hot', old: 40, new: 70 }];
  const pairs = { WU: [1000, 520], UB: [1000, 480], RG: [1000, 450], WB: [1000, 550] } as Record<string, [number, number]>;
  const a = [bv(1000, 1, { Bad: [100, 5, 10, 5], Fine: [100, 10, 20, 10], Hot: [100, 5, 10, 5] }, pairs), bv(1000, 1, { Bad: [100, 5, 10, 5], Fine: [100, 10, 20, 10], Hot: [100, 5, 10, 5] }, pairs)];
  // Batch 1: Bad wins 0.43 of 300 (not enough alone); batch 2: 0.42 of 300.  Pooled: 0.425 of 600 vs 0.45.
  const b = [
    bv(1000, 1, { Bad: [100, 80, 300, 129], Fine: [100, 90, 300, 150], Hot: [100, 90, 300, 190] }, pairs),
    bv(1000, 1, { Bad: [100, 80, 300, 126], Fine: [100, 90, 300, 151], Hot: [100, 90, 300, 189] }, pairs),
  ];
  const r = verifyRaise(a, b, raised);
  const F = (k: string): number => r.flat[k] as number;
  assert.equal(F('raised'), 3);
  close(F('a_played_rate'), Math.round((10 + 20 + 10) / 600 * 1e4) / 1e4);
  close(F('b_played_rate'), Math.round((160 + 180 + 180) / 600 * 1e4) / 1e4);
  const by = new Map(r.cards.map((c) => [c.name, c]));
  // Look 2 is the pooled test (effective counts add), spent at 2x.
  const pooled = pooledTest('dead', [
    { n: 300, x: 129, p0: 0.45, deff: 1, p: binomLower(129, 300, 0.45) },
    { n: 300, x: 126, p0: 0.45, deff: 1, p: binomLower(126, 300, 0.45) },
  ]);
  close((by.get('Bad') as CardVerdict).look2.weakP, Math.min(1, 2 * (pooled?.p as number)));
  close((by.get('Bad') as CardVerdict).look1.weakP, binomLower(129, 300, 0.45));
  assert.equal((by.get('Hot') as CardVerdict).dominant, true);       // 0.63 against 0.55: shown at both looks
  assert.equal((by.get('Fine') as CardVerdict).weak, false);
  assert.equal((by.get('Fine') as CardVerdict).dominant, false);
  assert.equal(F('dominant'), 1);
  // A design effect shrinks the evidence: the same counts at deff 3 show nothing.
  const b3 = b.map((x) => ({ ...x, deff: 3 }));
  assert.equal((verifyRaise(a, b3, raised).flat.dominant as number), 0);
  // Pair balance: spread of the shrunk rates and the de-noised SD; the same pairs in both arms change nothing.
  assert.equal(F('pair_spread_change'), 0);
  assert.ok(F('a_pair_spread') > 0.08 && F('a_pair_spread') < 0.1);
  const raw = [0.52, 0.48, 0.45, 0.55];
  const m = raw.reduce((s, x) => s + x, 0) / 4;
  const v = raw.reduce((s, x) => s + (x - m) ** 2, 0) / 3 - raw.reduce((s, x) => s + x * (1 - x) / 2000, 0) / 4;
  close(F('a_pair_sd_pts'), Math.round(Math.sqrt(v) * 100 * 1e4) / 1e4, 1e-4);
  assert.match(verifyReport(r), /\| Hot \| 40 → 70 \|[\s\S]*\| DOMINANT \|/);
});
