// mtg-table — tools/llm-seat/test/context.test.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The context builder for each arm, against a GOLDEN file of the prompts the
// first positions of fixtures/games/human-auto-42.jsonl produce (fresh,
// session:3 in chain mode, game, and session:3 in transcript mode), and the
// replay (positions) mode on that fixture.  UPDATE_GOLDEN=1 rewrites the
// golden file; read the diff before committing it.

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { readLog } from '../lib/frames.mjs';
import { makeFakeModel } from '../lib/model.mjs';
import { openOracle } from '../lib/oracle.mjs';
import { positionsOf } from '../lib/positions.mjs';
import { SYSTEM_PROMPT } from '../lib/prompt.mjs';
import { joinGraded, runReplay } from '../replay.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = join(here, '..', '..', '..');
const FIXTURE = join(repo, 'fixtures/games/human-auto-42.jsonl');
const ORACLE_FILE = join(repo, 'fixtures/cards/oracle-cards.slice.jsonl');
const GOLDEN = join(here, 'golden', 'human-auto-42.prompts.txt');
const LIMIT = 8;

async function promptsFor(arms, history) {
  const out = [];
  const a = {
    replay: 'fixtures/games/human-auto-42.jsonl', arms, model: 'fake', run: `ctx-${history}`, out: mkdtempSync(join(tmpdir(), 'llm-seat-ctx-')),
    history, limit: LIMIT, printPrompts: false, savePrompts: false, battlefieldAbilities: true, deck: null, oppDeck: null,
  };
  const deps = { log: readLog(FIXTURE), oracle: openOracle(ORACLE_FILE), say: () => {} };
  // capture every prompt through a model that records what it is sent
  const fake = makeFakeModel();
  deps.model = { name: 'fake', call: async (q) => { out.push(q); return fake.call(q); } };
  const res = await runReplay(a, deps);
  return { prompts: out, res };
}

test('golden prompts: fresh, session:3 (chain and transcript), game', async () => {
  const chain = await promptsFor(['fresh', 'session:3', 'game'], 'chain');
  const transcript = await promptsFor(['session:3'], 'transcript');
  const all = [...chain.prompts.map((p, i) => ({ p, tag: `chain ${chain.res.rows[i].arm} pos ${chain.res.rows[i].pos}` })),
    ...transcript.prompts.map((p, i) => ({ p, tag: `transcript ${transcript.res.rows[i].arm} pos ${transcript.res.rows[i].pos}` }))];
  const text = [`SYSTEM\n${SYSTEM_PROMPT}`, ...all.map(({ p, tag }) => `===== ${tag}${p.session ? ` (session ${p.session.resume ? 'resume' : 'start'})` : ''} =====\n${p.user}`)].join('\n\n') + '\n';
  if (process.env.UPDATE_GOLDEN === '1' || !existsSync(GOLDEN)) writeFileSync(GOLDEN, text);
  assert.equal(text, readFileSync(GOLDEN, 'utf8'));
  // the arms differ in how the context is carried, never in the decision posed
  const decisionOf = (u) => u.slice(u.lastIndexOf('DECISION'));
  for (let i = 0; i < LIMIT; i++) {
    const [f, s, g] = ['fresh', 'session:3', 'game'].map((arm) => chain.prompts[chain.res.rows.findIndex((r) => r.arm === arm && r.pos === i)].user);
    assert.equal(decisionOf(f), decisionOf(s));
    assert.equal(decisionOf(f), decisionOf(g));
  }
  // a session restarts every 3 calls with the whole history: positions 0, 3, 6 are full messages
  const s3 = chain.res.rows.filter((r) => r.arm === 'session:3');
  assert.deepEqual(s3.map((r) => r.sessionPos), [0, 1, 2, 0, 1, 2, 0, 1]);
  assert.deepEqual(s3.map((r) => r.full), [true, false, false, true, false, false, true, false]);
  assert.deepEqual(transcript.res.rows.map((r) => r.sessionPos), [0, 1, 2, 0, 1, 2, 0, 1]);
  // fresh is the biggest per call; game the smallest after its first
  const bytes = (arm) => chain.res.rows.filter((r) => r.arm === arm).map((r) => r.promptBytes);
  assert.ok(bytes('game').slice(1).every((b, i) => b < bytes('fresh')[i + 1]));
});

test('positions of a recorded game: frames point at the act, actual moves map to options', () => {
  const log = readLog(FIXTURE);
  const ps = positionsOf(log, { oracle: openOracle(ORACLE_FILE) });
  assert.ok(ps.length > 50, `positions: ${ps.length}`);
  for (const p of ps) {
    const f = log.frames[p.frame];
    assert.equal(f.dir, 'c2s', `position ${p.pos}: frame ${p.frame} is the seat's line`);
    assert.ok(p.actual === null || p.actual.every((n) => n >= 1 && n <= p.d.options.length));
    // the state the grader reads (the last one before the line) is the one the position was posed on
    let last = null;
    for (let i = 0; i < p.frame; i++) if (log.frames[i].type === 'state') last = log.frames[i].seq;
    assert.equal(last, p.stateSeq);
  }
  const kinds = new Set(ps.map((p) => p.d.kind));
  for (const k of ['priority', 'attack', 'block', 'ask:choose_list']) assert.ok(kinds.has(k), `a ${k} position`);
  const attack = ps.find((p) => p.d.kind === 'attack');
  assert.match(attack.actualToken, /^attack:/);
  assert.ok(ps.filter((p) => p.actual === null).length <= 2);
});

test('replay writes choices and coach-grade moments; join pairs the arms by position', async () => {
  const out = mkdtempSync(join(tmpdir(), 'llm-seat-replay-'));
  const a = { replay: FIXTURE, arms: ['fresh', 'game'], model: 'fake', run: 'r', out, history: 'chain', limit: 30, printPrompts: false, savePrompts: false, battlefieldAbilities: true, deck: 'decks/pacho-shield.dck', oppDeck: null };
  const { rows, moments } = await runReplay(a, { oracle: openOracle(ORACLE_FILE), say: () => {} });
  assert.equal(rows.length, 60);
  const lines = readFileSync(join(out, 'r', 'moments.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(lines.length, moments.length);
  for (const m of lines) {
    assert.equal(m.mode, 'live');
    assert.ok(['spell', 'attack', 'block', 'target'].includes(m.type));
    assert.ok(Number.isInteger(m.frame));
    assert.equal(m.deck, 'decks/pacho-shield.dck');
    const tokens = rows.filter((r) => `${r.log.split('/').pop()}#${r.pos}` === m.id && r.token).map((r) => r.token);
    for (const t of tokens) assert.ok(m.extra.includes(t));
  }
  // a fake grade: every option of a moment, regret 0.1 for the fresh arm's token, 0.3 for game's
  const graded = lines.map((m) => {
    const id = m.id;
    const f = rows.find((r) => `${r.log.split('/').pop()}#${r.pos}` === id && r.arm === 'fresh');
    const g = rows.find((r) => `${r.log.split('/').pop()}#${r.pos}` === id && r.arm === 'game');
    const options = [];
    if (f.token) options.push({ token: f.token, regret: 0.1 });
    if (g.token && g.token !== f.token) options.push({ token: g.token, regret: 0.3 });
    return { id, grade: { status: 'ok', options } };
  });
  const j = joinGraded(rows, graded);
  assert.equal(j.arms.fresh.n, lines.length);
  assert.ok(Math.abs(j.arms.fresh.mean - 0.1) < 1e-9);
  assert.ok('game - fresh' in j.paired);
});
