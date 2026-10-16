/*
 * mtg-table — web/test/cubelab-compare.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * D441: `tools/cubelab.sh compare` (tools/cubelab/compare.ts) and its port of ForgeCoach's
 * card-rate flatness (tools/cubelab/flatness.ts):
 *
 *  - the port gives ForgeCoach's own numbers on two metas (a synthetic run's meta.json and the
 *    shipped Synergy meta, stripped to what the spread reads): fixtures/cubelab/compare/
 *    flatness-golden.json holds ForgeCoach's output.  To regenerate it from a ForgeCoach checkout:
 *      CUBELAB_FC_ROOT=<ForgeCoach> CUBELAB_GOLDEN_WRITE=1 node --test web/test/cubelab-compare.test.ts
 *    (with CUBELAB_FC_ROOT alone, the test also runs ForgeCoach's file live and compares);
 *  - compare's own path from the drafts gives exactly what the port gives on buildMeta's meta.json;
 *  - two synthetic run folders with known rates: the measures read them back, and the paired
 *    draft-clustered bootstrap's interval on a known difference excludes 0 (and on none, holds 0);
 *  - every population must hold the same seeds (asserted), compare.json is numbers only, and a
 *    rule delivers a verdict only when the margin and the interval both say so.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { cubeSpread, spreadOf, type SpreadMeta, type SpreadStats } from '../../tools/cubelab/flatness.ts';
import {
  assertNumbersOnly, commonSeeds, compare, compareJson, compareMd, flatnessOf, labelOf, measuresOf, nameOf,
  parseRule, parseVariant, populationOf, readPopulation, ruleOutcome, type Population,
} from '../../tools/cubelab/compare.ts';
import { buildMeta } from '../../tools/cubelab/meta.ts';
import { rng } from '../../tools/cubelab/rng.ts';
import type { DraftRecord } from '../../tools/cubelab/run.ts';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const GOLDEN = path.join(REPO, 'fixtures/cubelab/compare/flatness-golden.json');

import { FLAT, SEEDS, SPREAD, synthRun, type Synth } from './cubelab-compare-synth.ts';

function popOf(name: string, s: Synth, seeds = SEEDS, stream = name): Population {
  const { run, info, recs } = synthRun(s, seeds, stream);
  return populationOf(name, `synth/${name}`, run, info, recs);
}

/** The part of a meta.json the spread reads (and the golden keeps). */
function stripMeta(m: Record<string, unknown>): SpreadMeta {
  const cards: SpreadMeta['cards'] = {};
  for (const [k, v] of Object.entries(m.cards as Record<string, Record<string, unknown>>)) cards[k] = { games: v.games, wins: v.wins, winRate: v.winRate, winRateShrunk: v.winRateShrunk, inDecks: v.inDecks, ...(v.seen !== undefined ? { seen: v.seen, picked: v.picked } : {}) } as SpreadMeta['cards'][string];
  const archetypes = (m.archetypes as Array<Record<string, unknown>>).map((a) => ({ id: a.id as string, colors: a.colors, games: a.games, winRate: a.winRate, decks: a.decks }));
  const sample = m.sample as Record<string, unknown> | undefined;
  return { sample: { shrinkage: sample?.shrinkage as { mean?: unknown; strength?: unknown } }, cards, archetypes } as SpreadMeta;
}

const NUMERIC = ['total', 'n', 'minGames', 'meanRate', 'sd', 'q1', 'q3', 'iqr', 'aboveShare', 'aboveCount', 'noiseAboveShare', 'noiseSd', 'binomialNoiseSd', 'designEffect', 'excessVar', 'trueSd'] as const;
type Golden = Record<string, unknown>;
const pick = (s: SpreadStats | null): Golden | null => (s ? { ...Object.fromEntries(NUMERIC.map((k) => [k, s[k]])), noiseSource: s.noiseSource, trueSdCi: s.trueSdCi, verdict: s.verdict } : null);

function sameSpread(got: SpreadStats | null, want: Golden | null, what: string, tol = 0): void {
  if (want === null) { assert.equal(got, null, what); return; }
  assert.ok(got, `${what}: null`);
  const g = pick(got) as Golden;
  for (const k of [...NUMERIC, 'trueSdCi']) {
    const a = k === 'trueSdCi' ? (g[k] as number[]) : [g[k] as number], b = k === 'trueSdCi' ? (want[k] as number[]) : [want[k] as number];
    a.forEach((x, i) => assert.ok(Math.abs(x - (b[i] as number)) <= tol, `${what}.${k}: ${x} vs ForgeCoach ${b[i]}`));
  }
  assert.equal(g.noiseSource, want.noiseSource, `${what}.noiseSource`);
  assert.equal(g.verdict, want.verdict, `${what}.verdict`);
}

function synthMeta(): Record<string, unknown> {
  const { run, info, recs } = synthRun(SPREAD, SEEDS, 'spread');
  return JSON.parse(JSON.stringify(buildMeta(run, info, recs, null))) as Record<string, unknown>;
}

// ---------------------------------------------------------------- the flatness port

test('the flatness port gives ForgeCoach\'s numbers on its golden metas', async () => {
  const fcRoot = process.env.CUBELAB_FC_ROOT;
  if (fcRoot) {
    // live: ForgeCoach's own file on the synthetic meta and the shipped Synergy meta
    const F = await import(path.join(fcRoot, 'src/cube/flatness.ts')) as { cubeSpread: (m: unknown) => { cards: SpreadStats | null; archetypes: SpreadStats | null } };
    const M = await import(path.join(fcRoot, 'src/cube/meta.ts')) as { parseMeta: (m: unknown) => unknown };
    const metas: Record<string, SpreadMeta> = {
      synthetic: stripMeta(synthMeta()),
      synergy: stripMeta(JSON.parse(fs.readFileSync(path.join(fcRoot, 'public/cubes/synergy-cube-180.meta.json'), 'utf8')) as Record<string, unknown>),
    };
    const golden: Record<string, unknown> = { source: 'ForgeCoach src/cube/flatness.ts cubeSpread, default options', metas: {} };
    for (const [k, meta] of Object.entries(metas)) {
      const fc = F.cubeSpread(M.parseMeta({ schema: 1, cube: { name: k }, pairs: [], ...meta }));
      (golden.metas as Record<string, unknown>)[k] = { meta, cards: pick(fc.cards), archetypes: pick(fc.archetypes) };
      const mine = cubeSpread(meta);
      sameSpread(mine.cards, pick(fc.cards), `${k} cards (live)`);
      sameSpread(mine.archetypes, pick(fc.archetypes), `${k} archetypes (live)`);
    }
    if (process.env.CUBELAB_GOLDEN_WRITE) {
      fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
      fs.writeFileSync(GOLDEN, `${JSON.stringify(golden)}\n`);
    }
  }
  const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8')) as { metas: Record<string, { meta: SpreadMeta; cards: Golden | null; archetypes: Golden | null }> };
  assert.deepEqual(Object.keys(golden.metas).sort(), ['synergy', 'synthetic']);
  for (const [k, g] of Object.entries(golden.metas)) {
    const mine = cubeSpread(g.meta);
    sameSpread(mine.cards, g.cards, `${k} cards`);
    sameSpread(mine.archetypes, g.archetypes, `${k} archetypes`);
    assert.ok((g.cards?.n as number) >= 12, `${k}: a readable spread (${g.cards?.n} cards)`);
  }
  // the golden's synthetic meta is still what buildMeta writes for the synthetic run
  assert.deepEqual(golden.metas.synthetic?.meta, JSON.parse(JSON.stringify(stripMeta(synthMeta()))));
});

test('compare\'s flatness from the drafts is the port on buildMeta\'s meta.json, exactly', () => {
  for (const [name, s] of [['spread', SPREAD], ['flat', FLAT]] as const) {
    const { run, info, recs } = synthRun(s, SEEDS, name);
    const pop = populationOf(name, name, run, info, recs);
    const viaMeta = cubeSpread(stripMeta(JSON.parse(JSON.stringify(buildMeta(run, info, recs, null))) as Record<string, unknown>)).cards;
    const direct = flatnessOf(pop, [...pop.drafts.values()]);
    sameSpread(direct, pick(viaMeta), `${name}: drafts vs meta.json`, 1e-12);
  }
});

test('spreadOf: a flat population of independent games reads near zero, a spread one near its truth', () => {
  const r = rng(5, 'flat-check');
  const units = (sd: number) => Array.from({ length: 180 }, (_, i) => {
    const p = 0.5 + sd * (((i * 53) % 180) / 180 - 0.5) * Math.sqrt(12);
    let w = 0;
    for (let g = 0; g < 400; g++) if (r.next() < p) w++;
    return { name: `c${i}`, games: 400, wins: w, shrunk: (w + 20 * 0.5) / 420, clumps: 400 };
  });
  const flat = spreadOf(units(0), { minGames: 10, priorMean: 0.5, priorStrength: 20 }) as SpreadStats;
  const lumpy = spreadOf(units(0.06), { minGames: 10, priorMean: 0.5, priorStrength: 20 }) as SpreadStats;
  assert.ok(flat.trueSd < 0.015, `flat ${flat.trueSd}`);
  assert.ok(Math.abs(lumpy.trueSd - 0.06) < 0.01, `lumpy ${lumpy.trueSd}`);
});

// ---------------------------------------------------------------- the measures and the bootstrap

test('the measures read two synthetic populations back', () => {
  const a = popOf('spread', SPREAD), b = popOf('flat', FLAT);
  const va = measuresOf(a, [...a.drafts.values()], { minPairGames: 30 });
  const vb = measuresOf(b, [...b.drafts.values()], { minPairGames: 30 });
  assert.equal(va.draw_rate, 0);
  assert.equal(va.timeout_rate, 0);
  assert.ok((vb.draw_rate as number) > 0.05 && (vb.draw_rate as number) < 0.15, `draws ${vb.draw_rate}`);
  assert.ok((vb.timeout_rate as number) > 0 && (vb.timeout_rate as number) < (vb.draw_rate as number));
  assert.ok(Math.abs((va.game_turns as number) - 9) < 0.5 && Math.abs((vb.game_turns as number) - 12) < 0.5, `turns ${va.game_turns} ${vb.game_turns}`);
  assert.ok((va.lands as number) > 16 && (va.lands as number) < 17);
  assert.equal(va.two_colour, 1);
  assert.ok((vb.two_colour as number) < 0.95 && (vb.two_colour as number) > 0.8, `two colours ${vb.two_colour}`);
  assert.ok(Math.abs((va.splash as number) - 0.1) < 0.05 && Math.abs((vb.splash as number) - 0.36) < 0.08, `splash ${va.splash} ${vb.splash}`);
  assert.ok(Math.abs((va.colours as number) - 2.1) < 0.05, `colours ${va.colours}`);
  // first picks: A's opener always takes the line with the best card, so a few cards own its first lines
  assert.ok((va.first_pick_top10 as number) > (vb.first_pick_top10 as number) + 0.05, `first picks ${va.first_pick_top10} vs ${vb.first_pick_top10}`);
  assert.ok((va.flatness as number) > 0.03 && (vb.flatness as number) < 0.02, `flatness ${va.flatness} vs ${vb.flatness}`);
  assert.ok(va.pair_spread !== undefined && vb.pair_within5 !== undefined);
  // a population with no decisive games has no card flatness and no pair rates, but still counts its draws
  const none = measuresOf(b, [], { minPairGames: 30 });
  assert.deepEqual(none, {});
});

test('the paired bootstrap: a known difference excludes 0, no difference holds 0', () => {
  const a = popOf('spread', SPREAD), b = popOf('flat', FLAT), b2 = popOf('flat_again', FLAT, SEEDS, 'flat-3');
  const c = compare([a, b, b2], { minPairGames: 30, boot: 300, bootSeed: 7 }, { seed: 1001, drafts: 600 });
  const ab = c.diff.spread?.flat, bb = c.diff.flat?.flat_again;
  assert.ok(ab && bb);
  for (const m of ['flatness', 'draw_rate', 'timeout_rate', 'game_turns', 'two_colour', 'splash', 'first_pick_top10'] as const) {
    assert.equal(ab[m]?.excludesZero, true, `spread - flat ${m}: ${JSON.stringify(ab[m])}`);
  }
  assert.ok((ab.flatness?.lo as number) > 0 && (ab.draw_rate?.hi as number) < 0);
  for (const m of ['flatness', 'draw_rate', 'lands', 'splash', 'game_turns'] as const) {
    assert.equal(bb[m]?.excludesZero, false, `flat - flat_again ${m}: ${JSON.stringify(bb[m])}`);
    assert.ok((bb[m]?.lo as number) <= 0 && (bb[m]?.hi as number) >= 0);
  }
  // the interval brackets the estimate, and the replicates were all valid where the measure is always defined
  for (const p of c.pops) {
    const x = p.ci.lands;
    assert.ok(x && (x.lo as number) <= (x.est as number) && (x.est as number) <= (x.hi as number));
    assert.equal(x?.valid, 300);
  }
  // the three recentred measures (D441): the estimate sits inside its own interval, a flat cube's flatness interval starts at 0
  for (const p of c.pops) for (const m of ['flatness', 'pair_spread', 'first_pick_top10'] as const) {
    const x = p.ci[m];
    assert.ok(x && (x.lo as number) <= (x.est as number) + 1e-12 && (x.est as number) <= (x.hi as number) + 1e-12, `${p.name} ${m}: ${JSON.stringify(x)}`);
  }
  assert.equal(c.pops[1]?.ci.flatness?.lo, 0);
  // the same bootstrap seed gives the same intervals
  const again = compare([a, b, b2], { minPairGames: 30, boot: 300, bootSeed: 7 });
  assert.deepEqual(again.diff, c.diff);
});

test('every population must hold the same seeds', () => {
  const a = popOf('spread', SPREAD), b = popOf('flat', FLAT, SEEDS.slice(0, -1));
  assert.throws(() => commonSeeds([a, b]), /did not draft the same seeds.*spread has 1 seed\(s\) flat lacks \(1600\)/);
  const c = popOf('flat', FLAT, SEEDS.map((s) => s + 1));
  assert.throws(() => compare([a, c], { minPairGames: 30, boot: 100, bootSeed: 1 }), /same seeds/);
  assert.deepEqual(commonSeeds([a, popOf('flat', FLAT)]), SEEDS);
  assert.throws(() => commonSeeds([a, popOf('flat', FLAT)], { seed: 1, drafts: 600 }), /not the block 1\.\.600/);
});

test('compare.json is numbers only, compare.md tables every measure, and a rule decides only past its margin', () => {
  const a = popOf('spread', SPREAD), b = popOf('flat', FLAT);
  const c = compare([a, b], { minPairGames: 30, boot: 200, bootSeed: 3 });
  const plain = compareJson(c, []);
  assertNumbersOnly(plain);
  assert.equal(JSON.parse(JSON.stringify(plain)).same_seeds, 1);
  assert.equal(plain.verdict, undefined);
  assert.equal((plain.rank as Record<string, Record<string, number>>).draw_rate?.spread, 1);
  const md = compareMd(c, [a, b].map(labelOf), []);
  assert.match(md, /No `--rule` was given/);
  assert.doesNotMatch(md, /Verdict/);
  assert.match(md, /\| spread - flat \| \+\d/);
  for (const id of ['flatness', 'pair_spread', 'pair_within5', 'draw_rate', 'timeout_rate', 'game_turns', 'lands', 'colours', 'two_colour', 'splash', 'first_pick_top10']) assert.match(md, new RegExp(`\`${id}\``));
  // flatness: B (flat) is lower by about 6 points; a 1-point margin passes, a 50-point one does not
  const ruled = compareJson(c, [parseRule('flatness:lower-better:margin=1.0'), parseRule('draw_rate:lower-better:margin=50')]);
  const v = ruled.verdict as Record<string, Record<string, unknown>>;
  assert.equal((v.flatness?.spread as Record<string, number>).flat, -1);
  assert.equal((v.draw_rate?.spread as Record<string, number>).flat, 0);
  assert.match(compareMd(c, [a, b].map(labelOf), [parseRule('flatness:lower-better:margin=1.0')]), /\*\*Verdict\*\* \(rule flatness:lower-better:margin=1 pts\): flat beats spread/);
  // the rule's arithmetic
  const R = parseRule('pair_within5:higher-better:margin=2');
  assert.equal(ruleOutcome(R, { est: 0.05, lo: 0.01, hi: 0.09, valid: 100 }), 1);
  assert.equal(ruleOutcome(R, { est: 0.05, lo: -0.01, hi: 0.09, valid: 100 }), 0);
  assert.equal(ruleOutcome(R, { est: 0.015, lo: 0.01, hi: 0.02, valid: 100 }), 0);
  assert.equal(ruleOutcome(R, { est: -0.05, lo: -0.09, hi: -0.01, valid: 100 }), -1);
  assert.throws(() => parseRule('flatness:better'), /lower-better or higher-better/);
  assert.throws(() => parseRule('nonsense:lower-better'), /unknown measure/);
  assert.throws(() => assertNumbersOnly({ a: Number.NaN }), /not strict JSON/);
  assert.throws(() => assertNumbersOnly({ a: 'x' }), /numbers only/);
  assert.throws(() => assertNumbersOnly({ a: [1] }), /an array/);
});

test('names and variants', () => {
  assert.equal(nameOf('cubes/synergy-cube-180.md'), 'synergy');
  assert.equal(nameOf('cubes/fair-fight-cube-180.md'), 'fair_fight');
  assert.deepEqual(parseVariant('syn17=cubes/synergy-cube-180.md,weight.sixteenLandsAt=0'), { name: 'syn17', cube: 'cubes/synergy-cube-180.md', weights: ['sixteenLandsAt=0'] });
  assert.deepEqual(parseVariant('v1=var/x/synergy-v1-cube-180.md,ratings=var/x/v1.tsv'), { name: 'v1', cube: 'var/x/synergy-v1-cube-180.md', ratings: 'var/x/v1.tsv', weights: [] });
  assert.throws(() => parseVariant('v1=a.md,colour=W'), /unknown option/);
});

test('readPopulation reads a run folder and leaves exploring drafts out', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cubelab-compare-'));
  try {
    const { run, info, recs } = synthRun(FLAT, SEEDS.slice(0, 20), 'disk');
    (recs[3] as DraftRecord & { playExplore?: unknown }).playExplore = { epsilon: 0.05, closeCall: 0.02, opening: false };
    fs.writeFileSync(path.join(dir, 'run.json'), JSON.stringify(run));
    fs.writeFileSync(path.join(dir, 'cards.json'), JSON.stringify(info));
    fs.writeFileSync(path.join(dir, 'drafts.jsonl'), recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
    const p = readPopulation('disk', dir);
    assert.equal(p.drafts.size, 19);
    assert.equal(p.exploreDropped, 1);
    assert.equal(labelOf(p).weights, 'defaults');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
