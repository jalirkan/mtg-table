/**
 * mtg-table — web/test/cubelab-llmdraft.test.ts
 *
 * The cube lab's LLM drafter and forge-ranks seat (tools/cubelab/llmdraft.ts, drafters.ts, D439),
 * with no API: a fake model answering canned JSON (valid; malformed then valid; malformed twice ->
 * the lab drafter's line, counted), the prompt builder on a fixture grid (nine cards, no hidden
 * information, the opponent's pool only when asked), the strict parse, the fallback's determinism
 * (a model that never answers drafts the plain draft), the replay of <out>/llm/<seed>.json, and the
 * run plumbing (spec parsing, the folder's identity and version).
 *
 * Copyright (C) 2026 mtg-table contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import type { Fact, LabCard } from '../../tools/cubelab/cards.ts';
import { aiChooser, gridDraft, newDrafter, type GridAsk } from '../../tools/cubelab/draft.ts';
import { forgeRanked, parseDrafter, runForgeRanksDraft } from '../../tools/cubelab/drafters.ts';
import type { LoadedCube } from '../../tools/cubelab/lab.ts';
import {
  buildPrompt, cardTexts, costText, fakeDraftModel, legalLines, LLM_SYSTEM, oracleText, parseLlmSpec, parseReply,
  runLlmDraft, themeSummary, type CardText, type DraftModel, type LlmDrafterOptions,
} from '../../tools/cubelab/llmdraft.ts';
import { rng } from '../../tools/cubelab/rng.ts';
import { identityDiff, mapLimit, versionWeights } from '../../tools/cubelab/run.ts';
import { DEFAULT_WEIGHTS } from '../../tools/cubelab/weights.ts';

const W = DEFAULT_WEIGHTS;

function card(name: string, colors: string, cmc: number, o: Partial<LabCard> = {}): LabCard {
  return {
    name, section: '', themes: [], roles: [], colors, cmc, pips: {}, type: 'Creature', land: false, creature: true,
    planeswalker: false, produces: '', fixer: false, rating: 50, remAIDeck: false, ...o,
  };
}

/** 180 toy cards (humanpicks' test cube): five colours, ten gold, ten colourless, ten duals. */
function cube(): LoadedCube {
  const cards: LabCard[] = [];
  for (let i = 0; i < 180; i++) {
    const colors = i < 150 ? 'WUBRG'[i % 5]! : i < 165 ? ['WU', 'UB', 'BR', 'RG', 'WG'][i % 5]! : '';
    const land = i >= 170;
    cards.push(card(`card ${i}`, land ? '' : colors, land ? 0 : 1 + (i % 6), {
      rating: 30 + ((i * 37) % 70), land, creature: !land, type: land ? 'Land' : 'Creature',
      produces: land ? ['WU', 'UB', 'BR', 'RG', 'WG'][i % 5]! : '', pips: land || !colors ? {} : Object.fromEntries([...colors].map((c) => [c, 1])),
    }));
  }
  return { cube: { title: 'Toy Cube' } as LoadedCube['cube'], cards, byName: new Map(cards.map((c) => [c.name, c])), missing: [], ratedFromFile: 0 };
}

function texts(lc: LoadedCube): Map<string, CardText> {
  return new Map(lc.cards.map((c) => [c.name, { cost: c.land ? '' : `{${c.cmc - 1 || ''}}{${c.colors[0] ?? 'C'}}`.replace('{}', ''), type: c.type, pt: c.land ? null : '2/2', oracle: `Text of ${c.name}.` }]));
}

const plainDraft = (lc: LoadedCube, seed: number) => gridDraft(lc.cards, rng(seed, 'draft:grid'), aiChooser(W, lc.pairs), W, seed % 2 === 0);

function opts(lc: LoadedCube, model: DraftModel, o: Partial<LlmDrafterOptions> = {}): LlmDrafterOptions {
  return {
    lc, seat: 'A', spec: { kind: 'llm', model: 'fake', thinking: 'low' }, model: async () => model, texts: texts(lc), summary: 'A toy cube.',
    seesOpponent: false, w: W, cacheDir: null, ...o,
  };
}

// ------------------------------------------------------------ the spec

test('--drafter specs: llm:<model>[:thinking=...], forge-ranks, human-picks; anything else is refused', () => {
  assert.deepEqual(parseLlmSpec('llm:haiku'), { kind: 'llm', model: 'haiku', thinking: 'low' });
  assert.deepEqual(parseLlmSpec('llm:sonnet:thinking=off'), { kind: 'llm', model: 'sonnet', thinking: 'off' });
  assert.deepEqual(parseLlmSpec('llm:opus:thinking=default'), { kind: 'llm', model: 'opus', thinking: 'default' });
  assert.equal(parseLlmSpec('llm:gpt'), null);
  assert.equal(parseLlmSpec('llm:sonnet:thinking=high'), null);
  assert.equal(parseLlmSpec('llm:'), null);
  assert.deepEqual(parseDrafter('forge-ranks'), { kind: 'forge-ranks' });
  assert.deepEqual(parseDrafter('llm:fake'), { kind: 'llm', model: 'fake', thinking: 'low' });
  assert.deepEqual(parseDrafter('human-picks:x.json'), { kind: 'human-picks', file: 'x.json' });
  assert.equal(parseDrafter('ranks'), null);
});

// ------------------------------------------------------------ card text and the summary

test('card text: Forge costs as {1}{U}, oracle on one line and cut at 200 characters', () => {
  assert.equal(costText('1 {U}'), '{1}{U}');
  assert.equal(costText('{W/U} {W/U}'), '{W/U}{W/U}');
  assert.equal(costText('no cost'), '');
  assert.equal(costText('-1'), '', 'a land');
  assert.equal(costText(undefined), '');
  assert.equal(oracleText('Flash\\nWhen it enters, draw.'), 'Flash / When it enters, draw.');
  const long = oracleText('word '.repeat(80));
  assert.ok(long.length <= 200 && long.endsWith('…'), long);
  const f: Fact = { listed: 'Snapcaster Mage', found: true, name: 'Snapcaster Mage', manaCost: '1 {U}', type: 'Creature - Human Wizard', power: '2', toughness: '1', oracle: 'Flash\\nWhen Snapcaster Mage enters, ...' };
  assert.deepEqual(cardTexts([f, { listed: 'Nope', found: false }]).get('Snapcaster Mage'), { cost: '{1}{U}', type: 'Creature — Human Wizard', pt: '2/1', oracle: 'Flash / When Snapcaster Mage enters, ...' });
});

test('theme summary: the cube document\'s own words, markdown dropped, at most 600 characters', () => {
  const md = ['# The Toy Cube', '', '*Designed for two. Grid draft.*', '', '## What it is', '', 'A **toy** cube about [tokens](x) and sacrifice.', '', '## The list (name — themes)', '', '### White (1)', 'Card — TOK'].join('\n');
  assert.equal(themeSummary(md), 'A toy cube about tokens and sacrifice. Designed for two. Grid draft.');
  const big = ['# Big', '## Design principles', ...Array.from({ length: 40 }, (_, i) => `${i + 1}. **Principle ${i}.** ${'Long words here. '.repeat(3)}`)].join('\n');
  const s = themeSummary(big);
  assert.ok(s.length <= 600 && s.endsWith('…') && s.startsWith('Principle 0.'), s.slice(0, 80));
  const repo = new URL('../../', import.meta.url);
  for (const c of ['vintage-cube-180', 'synergy-cube-180', 'evybaby-cube-360']) {
    const t = themeSummary(readFileSync(new URL(`cubes/${c}.md`, repo), 'utf8'));
    assert.ok(t.length >= 100 && t.length <= 600, `${c}: ${t.length}`);
    assert.ok(!/[*#|]/.test(t), `${c}: markdown left: ${t}`);
  }
});

// ------------------------------------------------------------ the prompt

function fixtureAsk(lc: LoadedCube, taken: number | null): GridAsk {
  const grid: (LabCard | null)[] = lc.cards.slice(0, 9);
  if (taken !== null) for (const i of [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8]][taken]!) grid[i] = null;
  const d = newDrafter('A', 45);
  d.state.picks.push(lc.cards[20]!, lc.cards[171]!, lc.cards[151]!);
  const other = newDrafter('B', 45);
  other.state.picks.push(lc.cards[40]!, lc.cards[41]!);
  return { d, grid, taken, at: 3, of: 18, other };
}

test('the prompt on a fixture grid: nine cards with text, the legal lines, the pool by colour, the reply format', () => {
  const lc = cube();
  const tx = texts(lc);
  const p = buildPrompt({ cube: 'Toy Cube', summary: 'A toy cube.', ask: fixtureAsk(lc, null), texts: tx, seesOpponent: false });
  assert.equal(p.system, LLM_SYSTEM);
  assert.match(p.system, /REPLY FORMAT/);
  assert.match(p.user, /^CUBE: Toy Cube\nABOUT THIS CUBE: A toy cube\./);
  assert.match(p.user, /GRID 3 of 18\. You pick FIRST/);
  const cells = p.user.split('\n').filter((l) => /^\[\d,\d\] /.test(l));
  assert.equal(cells.length, 9, 'nine cells');
  for (let i = 0; i < 9; i++) {
    const c = lc.cards[i]!;
    assert.ok(cells[i]!.startsWith(`[${Math.floor(i / 3)},${i % 3}] ${c.name} — `), cells[i]);
    assert.ok(cells[i]!.includes(`Text of ${c.name}.`), 'oracle text');
  }
  assert.deepEqual(p.legal, [0, 1, 2, 3, 4, 5]);
  assert.match(p.user, /LINES YOU MAY TAKE:\nrow 0: card 0 \| card 1 \| card 2\nrow 1: /);
  assert.match(p.user, /YOUR POOL SO FAR \(3 cards\):\n {2}White \(1\): card 20 \(MV 3, Creature\)\n {2}Multicolour \(1\): card 151 \(MV 2, Creature\)\n {2}Lands \(1\): card 171 \(Land\)/);
  // No hidden information: a grid is face up, so the prompt names only the nine dealt cards and the pools.
  // The opponent's pool is public in a grid draft, but it is left out unless asked for.
  assert.ok(!p.user.includes('OPPONENT'), 'no opponent pool by default');
  assert.ok(!p.user.includes('card 40') && !p.user.includes('card 41'), 'the opponent\'s picks are not named');
  const named = new Set([...p.user.matchAll(/card \d+/g)].map((m) => m[0]));
  assert.deepEqual([...named].sort(), ['card 0', 'card 1', 'card 151', 'card 171', 'card 2', 'card 20', 'card 3', 'card 4', 'card 5', 'card 6', 'card 7', 'card 8'].sort(), 'only the grid and the seat\'s own pool');
  const seen = buildPrompt({ cube: 'Toy Cube', summary: '', ask: fixtureAsk(lc, null), texts: tx, seesOpponent: true });
  assert.match(seen.user, /THE OPPONENT'S POOL SO FAR \(2 cards; grid picks are public\):\n {2}White \(1\): card 40/);
  assert.ok(!seen.user.includes('ABOUT THIS CUBE'), 'an empty summary is left out');
});

test('the prompt after the opponent picked: its line is gone, a crossing line holds 2 cards', () => {
  const lc = cube();
  const p = buildPrompt({ cube: 'Toy Cube', summary: '', ask: fixtureAsk(lc, 1), texts: texts(lc), seesOpponent: false });
  assert.match(p.user, /The opponent picked first and took row 1\./);
  assert.equal(p.user.split('\n').filter((l) => l.endsWith('(taken by the opponent)')).length, 3);
  assert.deepEqual(p.legal, [0, 2, 3, 4, 5]);
  assert.match(p.user, /col 0: card 0 \| card 6\n/);
  assert.deepEqual(legalLines(fixtureAsk(lc, 1).grid, 1), [0, 2, 3, 4, 5]);
});

// ------------------------------------------------------------ the parse

test('the strict parse: one JSON object (or one fence), take/index/reason, a legal line, every fault named', () => {
  const all = [0, 1, 2, 3, 4, 5];
  assert.deepEqual(parseReply('{"take":"row","index":2,"reason":"Power."}', all), { ok: true, line: 2, reason: 'Power.' });
  assert.deepEqual(parseReply('  {"take": "col", "index": 0} ', all), { ok: true, line: 3, reason: '' });
  assert.deepEqual(parseReply('```json\n{"take":"col","index":1,"reason":"x"}\n```', all), { ok: true, line: 4, reason: 'x' });
  const long = parseReply(JSON.stringify({ take: 'row', index: 0, reason: 'w '.repeat(30) }), all);
  assert.ok(long.ok && long.reason.split(' ').length === 20, 'a long reason is cut at 20 words');
  const bad: Array<[string, RegExp]> = [
    ['I take row 1. {"take":"row","index":1}', /single JSON object/],
    ['{"take":"row","index":1} because', /single JSON object/],
    ['{"take":"row","index":1,}', /did not parse/],
    ['[1]', /single JSON object/],
    ['{"take":"diagonal","index":1}', /"take"/],
    ['{"take":"row","index":"1"}', /"index"/],
    ['{"take":"row","index":3}', /"index"/],
    ['{"take":"row","index":1.5}', /"index"/],
    ['{"take":"row","index":1,"card":"Bolt"}', /unexpected key/],
    ['{"take":"row","index":1,"reason":7}', /"reason"/],
    ['', /single JSON object/],
  ];
  for (const [t, why] of bad) {
    const r = parseReply(t, all);
    assert.ok(!r.ok && why.test(r.error), `${JSON.stringify(t)} -> ${JSON.stringify(r)}`);
  }
  const taken = parseReply('{"take":"row","index":1}', [0, 2, 3, 4, 5]);
  assert.ok(!taken.ok && /cannot be taken now/.test(taken.error) && /allowed: row 0, row 2, col 0, col 1, col 2/.test(taken.error), JSON.stringify(taken));
});

// ------------------------------------------------------------ a draft with the fake model

test('a fake model answering valid JSON: one call a decision, no retries, the deal and the other seat a plain run\'s', async () => {
  const lc = cube();
  for (const seed of [4, 7]) {
    for (const seat of ['A', 'B'] as const) {
      const m = fakeDraftModel();
      const d = await runLlmDraft(opts(lc, m, { seat }), seed);
      const s = d.llm!;
      assert.equal(s.decisions, 18);
      assert.equal(m.calls, 18);
      assert.deepEqual([s.calls, s.retries, s.fallbacks, s.callErrors], [18, 0, 0, 0]);
      assert.ok(s.picks.every((p) => p.by === 'model' && p.reason === 'fake model: the first line listed'));
      assert.equal(s.costUsd, null, 'the fake reports no cost');
      const plain = plainDraft(lc, seed);
      assert.equal(d.dealt, plain.dealt.length);
      assert.equal(d.aOpens, seed % 2 === 0);
      for (const n of [...d.drafters[0].pool, ...d.drafters[1].pool]) assert.ok(plain.dealt.includes(n), 'every pick from the same deal');
      const llmSeat = d.drafters[seat === 'A' ? 0 : 1];
      assert.equal(llmSeat.picks.length, 18);
      // the fake takes the first legal line: row 0 when it opens, else the first line the opponent left
      for (const p of llmSeat.picks) assert.ok(p.how === 'row 1' || p.how === 'row 2' || p.how === 'col 1', p.how);
      assert.ok(d.drafters.every((x) => x.deck), 'both seats build with the lab builder');
    }
  }
});

test('malformed then valid: the retry names the fault and counts; malformed twice: the lab drafter\'s line, counted', async () => {
  const lc = cube();
  const seed = 4;
  const seen: string[] = [];
  const valid = '{"take":"row","index":0,"reason":"ok"}';
  const script = ['Sure! I would take row 0.', valid];                    // decision 1: malformed, then valid
  script.push('{"take":"row","index":9}', '!claude exited 1 with no output'); // decision 2: bad index, then a failed call
  const inner = fakeDraftModel(script);
  const m: DraftModel = { name: 'fake', call: async (a) => { seen.push(a.user); return inner.call(a); } };
  const d = await runLlmDraft(opts(lc, m), seed);
  const s = d.llm!;
  assert.equal(s.decisions, 18);
  assert.deepEqual([s.calls, s.retries, s.fallbacks, s.callErrors], [20, 2, 1, 1]);
  assert.equal(s.picks[0]!.by, 'retry');
  assert.equal(s.picks[0]!.line, 'row 1');
  assert.deepEqual(s.picks[0]!.errors, ['the reply was not a single JSON object (no text before or after it)']);
  assert.match(seen[1]!, /YOUR LAST REPLY COULD NOT BE USED: the reply was not a single JSON object.*Reply again with only the JSON object\.$/s);
  assert.ok(seen[1]!.startsWith(seen[0]!), 'the retry is the same prompt plus the fault');
  assert.equal(s.picks[1]!.by, 'fallback');
  assert.equal(s.picks[1]!.errors?.length, 2);
  assert.match(s.picks[1]!.errors![1]!, /the call failed: claude exited 1/);
  // the fallback is the lab drafter's own line at that moment: the second decision of a plain draft's seat A
  const plain = plainDraft(lc, seed);
  assert.equal(s.picks[1]!.line, plain.drafters[0].log[1]!.how);
  assert.ok(s.picks.slice(2).every((p) => p.by === 'model'));
});

test('the fallback is deterministic: a model that never answers drafts exactly the plain draft, twice', async () => {
  const lc = cube();
  const never: DraftModel = { name: 'never', call: async () => ({ text: 'no.', usage: null, costUsd: null, ms: 0 }) };
  for (const seed of [4, 7]) {
    const plain = plainDraft(lc, seed);
    const a = await runLlmDraft(opts(lc, never), seed);
    const b = await runLlmDraft(opts(lc, never), seed);
    assert.equal(a.llm!.fallbacks, 18);
    assert.equal(a.llm!.calls, 36);
    for (const d of [a, b]) {
      assert.deepEqual(d.drafters.map((x) => x.pool), plain.drafters.map((x) => x.state.picks.map((c) => c.name)), `seed ${seed}: every fallback is the lab drafter's line`);
      assert.deepEqual(d.drafters.map((x) => x.picks.map((p) => p.how)), plain.drafters.map((x) => x.log.map((p) => p.how)));
    }
  }
});

test('the usage is summed; a finished draft is written to <out>/llm/<seed>.json and replayed without a call', async () => {
  const lc = cube();
  const dir = mkdtempSync(join(tmpdir(), 'llmdraft-'));
  try {
    let calls = 0;
    const inner = fakeDraftModel();
    const m: DraftModel = {
      name: 'counted',
      call: async (a) => { calls++; const r = await inner.call(a); return { ...r, usage: { input: 3, cacheRead: 100, cacheCreate: 1000, output: 20 }, costUsd: 0.001, ms: 5, model: 'claude-haiku-x' }; },
    };
    const first = await runLlmDraft(opts(lc, m, { cacheDir: dir }), 7);
    const s = first.llm!;
    assert.deepEqual([s.tokensIn, s.cacheRead, s.cacheCreate, s.tokensOut, s.modelMs], [54, 1800, 18000, 360, 90]);
    assert.ok(Math.abs((s.costUsd ?? 0) - 0.018) < 1e-9);
    assert.equal(s.resolved, 'claude-haiku-x');
    assert.equal(s.replayed, false);
    assert.equal(calls, 18);
    const throws: DraftModel = { name: 'x', call: async () => { throw new Error('a replay must not call the model'); } };
    const again = await runLlmDraft(opts(lc, throws, { cacheDir: dir }), 7);
    assert.equal(again.llm!.replayed, true);
    assert.equal(again.llm!.calls, 18, 'the replay carries the original counts');
    assert.deepEqual(again.drafters.map((x) => x.pool), first.drafters.map((x) => x.pool));
    await assert.rejects(runLlmDraft(opts(lc, throws, { cacheDir: dir, seat: 'B' }), 7), /another LLM drafter/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('mapLimit keeps the order and the limit', async () => {
  let live = 0;
  let peak = 0;
  const out = await mapLimit([5, 1, 4, 2, 3], 2, async (x) => { live++; peak = Math.max(peak, live); await new Promise((r) => setTimeout(r, x)); live--; return x * 10; });
  assert.deepEqual(out, [50, 10, 40, 20, 30]);
  assert.equal(peak, 2);
});

// ------------------------------------------------------------ forge-ranks

test('forge-ranks: Forge\'s scores in place of the cube\'s ratings, no synergy, an early commit; the other seat plain', () => {
  const lc = cube();
  const facts: Fact[] = lc.cards.map((c, i) => ({ listed: c.name, found: true, name: c.name, rank: i % 3 === 0 ? { source: 'set', edition: 'X', defaultEdition: 'X', rawScore: 100 - (i % 90) } : { source: 'none', edition: '', defaultEdition: '', rawScore: -100 } }));
  const fr = forgeRanked(lc, facts, W.unrated);
  assert.equal(fr.ranked, 60);
  assert.equal(fr.byName.get('card 1')?.rating, W.unrated, 'unranked at `unrated`, as ratings init');
  assert.equal(fr.byName.get('card 3')?.rating, 97);
  const d = runForgeRanksDraft(lc, fr, 'A', 4, W);
  const plain = plainDraft(lc, 4);
  assert.notDeepEqual(d.drafters[0].pool, plain.drafters[0].state.picks.map((c) => c.name), 'the forge-ranks seat drafts differently');
  assert.equal(d.drafters[0].picks.length, 18);
  assert.deepEqual(runForgeRanksDraft(lc, fr, 'A', 4, W).drafters.map((x) => x.pool), d.drafters.map((x) => x.pool), 'a seed is a draft');
});

// ------------------------------------------------------------ run plumbing

test('run plumbing: each drafter is part of the folder identity and the version; D416\'s version is unchanged', () => {
  const llm = { kind: 'llm' as const, seat: 'A' as const, model: 'sonnet' as const, thinking: 'low' as const, seesOpponent: false, promptVersion: 1, fallback: 'lab' as const, summaryChars: 400 };
  assert.deepEqual(identityDiff({ drafter: llm }, { drafter: { ...llm, model: 'haiku' } }), ['drafter']);
  assert.deepEqual(identityDiff({ drafter: llm }, { drafter: { ...llm } }), []);
  assert.deepEqual(versionWeights(W, { drafter: { seat: 'A', sha: 'y' } }), { ...W, drafter: { kind: 'human-picks', seat: 'A', sha: 'y' } });
  assert.deepEqual(versionWeights(W, { drafter: { kind: 'human-picks', seat: 'A', sha: 'y' } }), versionWeights(W, { drafter: { seat: 'A', sha: 'y' } }));
  assert.notDeepEqual(versionWeights(W, { drafter: llm }), versionWeights(W, { drafter: { ...llm, model: 'haiku' } }));
  assert.notDeepEqual(versionWeights(W, { drafter: llm }), versionWeights(W, { drafter: { ...llm, seesOpponent: true } }));
  assert.deepEqual(versionWeights(W, { drafter: { kind: 'forge-ranks', seat: 'B' } }), { ...W, drafter: { kind: 'forge-ranks', seat: 'B' } });
  assert.equal(versionWeights(W, {}), W);
});
