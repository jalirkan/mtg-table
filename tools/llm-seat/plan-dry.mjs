#!/usr/bin/env node
// mtg-table — tools/llm-seat/plan-dry.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// PLAN MODE'S DRY RUN (D419): a recorded game walked through the plan-mode
// seat with the fake model, so a person can read the prompts it would send
// and see how many calls and bytes a game takes.  No engine, no spend.
//
//   node tools/llm-seat/plan-dry.mjs --replay fixtures/games/human-auto-42.jsonl \
//        --oracle fixtures/cards/oracle-cards.slice.jsonl [--print 3] [--context fresh]
//
// How: the recording's frames are fed to a PlanCore in order, and the core is
// ticked at each point where the recorded seat made a move, as if the engine
// were waiting on it there.  The GAME follows the recording; the core's own
// moves are thrown away.  So the moments (turn, mulligan, response, blocks,
// end step) are the ones the live seat would meet in this game; a step the
// fake planned that the recording did not play can make a "correction" the
// live seat would not have needed -- they are counted apart, and the honest
// numbers per game are the real-engine fake games in docs/llm-seat.md.

import { resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readLog } from './lib/frames.mjs';
import { makeFakeModel } from './lib/model.mjs';
import { openOracle } from './lib/oracle.mjs';
import { PlanAsker, PlanCore } from './lib/plan-core.mjs';
import { PLAN_SYSTEM } from './lib/plan-prompt.mjs';

export function parseArgs(argv) {
  const a = { replay: null, oracle: null, print: 2, context: 'fresh' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => { const x = argv[++i]; if (x === undefined) throw new Error(`${k} needs a value`); return x; };
    switch (k) {
      case '--replay': a.replay = v(); break;
      case '--oracle': a.oracle = v(); break;
      case '--print': a.print = Number(v()); break;
      case '--context': a.context = v(); break;
      default: throw new Error(`unknown flag ${k}`);
    }
  }
  if (!a.replay) throw new Error('--replay <frames.jsonl> is required');
  return a;
}

/** dryRun(log, {oracle, context}) -> {prompts: [{kind, system, user}], stats, games} */
export async function dryRun({ header, frames }, { oracle, context = 'fresh' } = {}) {
  const prompts = [];
  const fake = makeFakeModel();
  const model = { name: 'fake', call: async (q) => { prompts.push({ system: q.system, user: q.user }); return fake.call(q); } };
  const asker = new PlanAsker(context, model);
  let t = 0;
  const core = new PlanCore({ send: () => {}, asker, oracle, now: () => t, useStops: false });
  core.onFrame({ v: 1, seq: 0, type: 'hello_ok', body: { you: typeof header.seat === 'number' ? header.seat : 0, gameId: header.gameId } });
  for (const f of frames) {
    if (f.dir !== 'c2s') { core.onFrame(f); continue; }
    if (f.type !== 'act' && f.type !== 'answer') continue;
    if (f.type === 'act' && f.body?.action === 'setPhaseStop') continue;
    // the engine waits on the seat here: let the core decide, then forget its move
    t += 10_000;
    core.pending = null;
    core.exec = null;
    core.queue = [];
    core.movedAt = null;
    await core.tick();
    if (f.type === 'answer') { core.asks.delete(String(f.body.askId)); core.answered.add(String(f.body.askId)); }
  }
  return { prompts, stats: core.stats, systemBytes: Buffer.byteLength(PLAN_SYSTEM, 'utf8') };
}

async function main() {
  let a;
  try { a = parseArgs(process.argv.slice(2)); } catch (e) {
    process.stderr.write(`plan-dry: ${e.message}\n`);
    process.exit(2);
  }
  const log = readLog(a.replay);
  const { prompts, stats, systemBytes } = await dryRun(log, { oracle: openOracle(a.oracle), context: a.context });
  process.stdout.write(`===== SYSTEM PROMPT (${systemBytes} bytes) =====\n${PLAN_SYSTEM}\n`);
  prompts.slice(0, a.print).forEach((p, i) => process.stdout.write(`\n===== PROMPT ${i + 1} =====\n${p.user}\n`));
  const bytes = prompts.reduce((s, p) => s + Buffer.byteLength(p.user, 'utf8'), 0);
  const read = bytes + systemBytes * prompts.length;
  process.stdout.write(`\n===== ${a.replay} =====\n`);
  process.stdout.write(`calls ${prompts.length} (moments ${JSON.stringify(stats.moments)}; of them corrections ${stats.corrections}, from steps the recording did not play)\n`);
  process.stdout.write(`user bytes: total ${bytes}, mean ${Math.round(bytes / Math.max(1, prompts.length))}, max ${Math.max(0, ...prompts.map((p) => Buffer.byteLength(p.user, 'utf8')))}\n`);
  process.stdout.write(`bytes read with the system prompt: ${read} (~${Math.round(read / 4 / 1000)}k tokens at 4 bytes a token)\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolvePath(process.argv[1])) main();
