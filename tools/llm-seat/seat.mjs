#!/usr/bin/env node
// mtg-table — tools/llm-seat/seat.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE LLM SEAT (D418): a model plays the human seat against Forge over the
// bridge's `/ws`, one game per connection.  The bridge is any `MtgTable
// --transport ws` (run-match.mjs starts one per game; ./scripts/play.sh
// --engine-only works too).  This file is the socket and the files; the
// decisions are lib/plan-core.mjs's (--mode plan, the default: D419, the
// model plans a turn in plain words and the code carries the steps out) or
// lib/seat-core.mjs's (--mode decision: D418, one call per engine prompt, a
// numbered option list), the words lib/plan-prompt.mjs's / lib/prompt.mjs's.
//
//   node tools/llm-seat/seat.mjs --port 8642 --model fake --run pilot     # no spend
//   node tools/llm-seat/seat.mjs --port 8642 --model sonnet --context session:10 --run arms-1
//   node tools/llm-seat/seat.mjs --port 8642 --dry-run                    # fake model, prints every prompt
//
// Flags: --url ws://… | --port N; --mode plan|decision (plan);
// --model fake|sonnet|opus|haiku (fake);
// --context fresh|session:N|game (fresh); --thinking off|low|default (low:
// coach-helper's D346 mapping); --oracle FILE (.jsonl Scryfall objects or the
// card library's .sqlite; default var/cards/cards.sqlite when present);
// --run NAME (var/llm-seat/<NAME>/); --fake-script FILE (JSON array of
// replies); --no-stops (leave Forge's stops alone); --no-battlefield-abilities;
// --print-prompts; --save-prompts; --timeout S (whole game, 0 = none; 7200);
// --model-timeout S (one call; 180); --quiet.
//
// Files (var/llm-seat/<run>/): decisions.jsonl (one line per decision, D418's
// fields), games.jsonl (one line per game), frames/<gameId>.jsonl (this
// client's frame log, §8: `recordedBy: "client"`), prompts/<gameId>/ with
// --save-prompts.  Exit 0 on `over`, 3 on a protocol failure, 4 on timeout, 5
// on a socket that never opened.
//
// It never touches `/observe`, never edits a deck and never concedes on its
// own (a stuck game ends by --timeout and says so).

import { appendFileSync, createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';

import { Arm, parseArm } from './lib/arms.mjs';
import { PlanAsker, PlanCore } from './lib/plan-core.mjs';
import { makeClaudeModel, makeFakeModel } from './lib/model.mjs';
import { openOracle } from './lib/oracle.mjs';
import { SETTLE_MS, SeatCore } from './lib/seat-core.mjs';

/** The same ask kind this many times in a row with no state frame between ends the game as stuck. */
const MAX_REPEAT_ASKS = 50;

export function parseArgs(argv) {
  const a = {
    url: null, port: 8642, mode: 'plan', model: 'fake', context: 'fresh', thinking: 'low', oracle: null, run: null,
    fakeScript: null, stops: true, battlefieldAbilities: true, printPrompts: false, savePrompts: false,
    timeoutS: 7200, modelTimeoutS: 180, quiet: false, out: 'var/llm-seat',
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => { const x = argv[++i]; if (x === undefined) throw new Error(`${k} needs a value`); return x; };
    switch (k) {
      case '--url': a.url = v(); break;
      case '--port': a.port = Number(v()); break;
      case '--mode': a.mode = v(); break;
      case '--model': a.model = v(); break;
      case '--context': a.context = v(); break;
      case '--thinking': a.thinking = v(); break;
      case '--oracle': a.oracle = v(); break;
      case '--run': a.run = v(); break;
      case '--out': a.out = v(); break;
      case '--fake-script': a.fakeScript = v(); break;
      case '--no-stops': a.stops = false; break;
      case '--no-battlefield-abilities': a.battlefieldAbilities = false; break;
      case '--print-prompts': a.printPrompts = true; break;
      case '--save-prompts': a.savePrompts = true; break;
      case '--dry-run': a.model = 'fake'; a.printPrompts = true; break;
      case '--timeout': a.timeoutS = Number(v()); break;
      case '--model-timeout': a.modelTimeoutS = Number(v()); break;
      case '--quiet': a.quiet = true; break;
      default: throw new Error(`unknown flag ${k}`);
    }
  }
  parseArm(a.context);
  if (!['plan', 'decision'].includes(a.mode)) throw new Error('--mode is plan or decision');
  if (!['fake', 'sonnet', 'opus', 'haiku'].includes(a.model)) throw new Error('--model is fake, sonnet, opus or haiku');
  if (!['off', 'low', 'default'].includes(a.thinking)) throw new Error('--thinking is off, low or default');
  if (!a.run) a.run = `${a.model}-${a.context.replace(':', '')}-${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}`;
  if (!/^[A-Za-z0-9._-]+$/.test(a.run)) throw new Error('--run must be a plain name');
  return a;
}

export function makeModel(a, runDir) {
  if (a.model === 'fake') {
    return makeFakeModel({ script: a.fakeScript ? JSON.parse(readFileSync(a.fakeScript, 'utf8')) : [] });
  }
  return makeClaudeModel({ model: a.model, thinking: a.thinking, cwd: join(runDir, 'claude-cwd'), timeoutS: a.modelTimeoutS });
}

/**
 * Plays one game on one socket.  Resolves to the game summary.  `deps` lets a
 * test hand in its own WebSocket class, model and clock.
 */
export function runSeat(a, deps = {}) {
  const WS = deps.WebSocket ?? globalThis.WebSocket;
  const runDir = join(a.out, a.run);
  mkdirSync(join(runDir, 'frames'), { recursive: true });
  const model = deps.model ?? makeModel(a, runDir);
  const oracle = deps.oracle ?? openOracle(a.oracle);
  const say = a.quiet ? () => {} : (line) => process.stderr.write(`[llm-seat ${String(Date.now() - t0).padStart(7)}ms] ${line}\n`);
  const t0 = Date.now();
  let gameId = null;
  let promptNo = 0;
  const onPrompt = (p) => {
    promptNo += 1;
    if (a.printPrompts) process.stdout.write(`\n===== PROMPT ${promptNo} (${p.arm}${p.session ? `, session ${p.session.resume ? 'resume' : 'start'}` : ''}, attempt ${p.attempt}) =====\n${p.user}\n`);
    if (a.savePrompts) {
      const d = join(runDir, 'prompts', gameId ?? 'unknown');
      mkdirSync(d, { recursive: true });
      writeFileSync(join(d, `${String(promptNo).padStart(4, '0')}.txt`), `${p.system}\n\n----- USER -----\n${p.user}\n`);
    }
  };
  const arm = a.mode === 'decision' ? new Arm(a.context, model, { onPrompt }) : new PlanAsker(a.context, model, { onPrompt });
  const url = a.url ?? `ws://127.0.0.1:${a.port}/ws`;

  return new Promise((resolve) => {
    let socket;
    let seq = 0;
    let logStream = null;
    const held = [];
    let settleTimer = null;
    let finished = false;
    let opened = false;
    let repeatAsks = 0;
    let repeatKind = null;

    const writeLine = (o) => {
      const line = `${JSON.stringify(o)}\n`;
      if (logStream) logStream.write(line); else held.push(line);
    };
    const send = (move) => {
      if (!socket || socket.readyState !== 1) return;
      seq += 1;
      const type = move.type === 'answer' ? 'answer' : 'act';
      const body = move.type === 'answer' ? { askId: move.askId, value: move.value } : (({ type: _t, ...rest }) => rest)(move);
      const frame = { v: 1, seq, t: Date.now(), type, body };
      socket.send(JSON.stringify(frame));
      writeLine({ ...frame, dir: 'c2s' });
    };
    const Core = a.mode === 'decision' ? SeatCore : PlanCore;
    const core = new Core({
      send, arm, asker: arm, oracle, say, useStops: a.stops, opts: { battlefieldAbilities: a.battlefieldAbilities },
      log: (rec) => appendFileSync(join(runDir, 'decisions.jsonl'), `${JSON.stringify({ run: a.run, model: model.name, t: Date.now(), ...rec })}\n`),
    });

    const tick = async () => {
      settleTimer = null;
      if (finished) return;
      try { await core.tick(); } catch (e) { say(`TICK ERROR ${e.stack ?? e}`); }
      if (core.fatal) { finish(6, core.fatal); return; }
      if (!finished && settleTimer === null) settleTimer = setTimeout(tick, 1000);   // the stall clock
    };
    const settle = () => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(tick, SETTLE_MS);
    };

    const finish = (code, why) => {
      if (finished) return;
      finished = true;
      if (settleTimer) clearTimeout(settleTimer);
      clearTimeout(wall);
      const st = core.state;
      const result = core.over ? (core.over.winner === core.me ? 'win' : core.over.winner === null || core.over.winner === undefined ? 'draw' : 'loss') : 'unfinished';
      const summary = {
        run: a.run, game: core.gameId, seat: core.me, arm: arm.spec.name, model: model.name, result, reason: core.over?.reason ?? why,
        turns: st?.turn ?? null, rounds: st?.round ?? null, ms: Date.now() - t0, exit: code,
        decisions: core.stats.decisions, auto: core.stats.auto, modelDecisions: core.stats.model, fallbacks: core.stats.fallback,
        retries: core.stats.retries, refused: core.stats.refused, stale: core.stats.stale, modelCalls: core.stats.modelCalls,
        sessionResets: arm.resets, promptBytes: core.stats.promptBytes, tokensIn: core.stats.tokensIn, tokensOut: core.stats.tokensOut,
        cacheRead: core.stats.cacheRead, cacheCreate: core.stats.cacheCreate, costUsd: core.stats.costUsd, modelMs: core.stats.modelMs,
        mode: a.mode, ...(core.extraSummary ? core.extraSummary() : {}),
        match: deps.match ?? null,
      };
      appendFileSync(join(runDir, 'games.jsonl'), `${JSON.stringify(summary)}\n`);
      say(`OVER ${result} (${summary.reason}) after ${summary.turns} turns; ${summary.modelCalls} model calls, ${summary.fallbacks} fallbacks`);
      try { socket?.close(); } catch { /* closed */ }
      if (logStream) logStream.end();
      resolve(summary);
    };
    const wall = a.timeoutS > 0 ? setTimeout(() => finish(4, `timeout after ${a.timeoutS} s`), a.timeoutS * 1000) : null;

    socket = new WS(url);
    socket.addEventListener('open', () => { opened = true; say(`connected ${url} (mode ${a.mode}, arm ${arm.spec.name}, model ${model.name}, oracle ${oracle.source})`); });
    socket.addEventListener('error', () => { if (!opened) finish(5, `could not connect to ${url}`); });
    socket.addEventListener('close', () => { if (!finished) finish(core.over ? 0 : 3, 'socket closed before over'); });
    socket.addEventListener('message', (ev) => {
      let frame;
      try { frame = JSON.parse(String(ev.data)); } catch { finish(3, 'a frame that is not JSON'); return; }
      if (frame.v !== 1) { finish(3, `protocol v${frame.v}`); return; }
      if (frame.type === 'ping') {
        seq += 1;
        socket.send(JSON.stringify({ v: 1, seq, t: Date.now(), type: 'pong', body: {} }));
        return;
      }
      if (frame.seq !== 0) writeLine({ ...frame, dir: 's2c' });
      // Stuck guard (s20): the same ask kind back-to-back, with no state frame
      // between, MAX_REPEAT_ASKS times means the engine and the seat are in a
      // loop: end the game (exit 7) instead of spinning until the timeout.
      if (frame.type === 'state') repeatAsks = 0;
      else if (frame.type === 'ask') {
        const k = String(frame.body?.kind);
        repeatAsks = k === repeatKind ? repeatAsks + 1 : 1;
        repeatKind = k;
        if (repeatAsks >= MAX_REPEAT_ASKS) { finish(7, `stuck: ${repeatAsks} ${k} asks in a row with no state change`); return; }
      }
      if (frame.type === 'hello_ok' && !logStream) {
        gameId = String(frame.body.gameId ?? 'unknown');
        logStream = createWriteStream(join(runDir, 'frames', `${gameId}.jsonl`));
        logStream.write(`${JSON.stringify({
          v: 1, kind: 'session', gameId, startedAt: new Date(t0).toISOString(), seed: frame.body.seed ?? null,
          forgeVersion: frame.body.forgeVersion ?? '', forgeJarSha256: frame.body.forgeJarSha256 ?? '',
          seat: frame.body.you ?? 0, transport: 'ws', recordedBy: 'client', decks: [],
        })}\n`);
        for (const l of held) logStream.write(l);
        held.length = 0;
      }
      core.onFrame(frame);
      if (frame.type === 'over') { finish(0, 'over'); return; }
      // Every frame restarts the settle clock, a re-pushed input too: after a move the
      // bridge sends a burst (the old prompt again, the state, the new prompt) within a few
      // ms, and the seat decides on the burst's end, never inside it.  Forge's own re-push
      // runs every 250 ms, so a quiet SETTLE_MS still comes between two of them.
      settle();
    });
  });
}

async function main() {
  let a;
  try { a = parseArgs(process.argv.slice(2)); } catch (e) {
    process.stderr.write(`llm-seat: ${e.message}\n`);
    process.exit(2);
  }
  const summary = await runSeat(a);
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  process.exit(summary.exit);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolvePath(process.argv[1])) main();
