#!/usr/bin/env node
// mtg-table — tools/llm-seat/run-match.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// GAMES OF THE LLM SEAT AGAINST FORGE (D418): a fixed deck pair at fixed seeds,
// mirrored (each seed played twice with the decks swapped, as ai-bench
// --mirror deals a pair, D398), once per context arm.  For each game it starts
// one bridge -- `./bridge/run.sh mtgtable.MtgTable --transport ws` with the
// AI on Forge's Default profile and plain policy (no search), one game, no
// keep-open -- waits for its /health, plays the seat (seat.mjs's runSeat),
// and waits for the JVM to exit.  One game at a time: the model is the
// bottleneck and the CLI runs one question at a time anyway.
//
//   node tools/llm-seat/run-match.mjs --deck decks/pacho-shield.dck --ai-deck decks/doom-legion.dck \
//        --seeds 1,2 --context fresh --model sonnet --run pilot-1           # the pilot: 2 games
//   node tools/llm-seat/run-match.mjs --pairs tools/ai-bench/pairs-dev.txt --pair 0 --seeds 1-10 --mirror \
//        --context fresh,session:10,game --model sonnet --run arms-1        # the arm comparison
//   … --dry-run   prints the schedule and the bridge commands, starts nothing
//
// Flags: --deck/--ai-deck or --pairs FILE [--pair I] (a pairs file's I-th
// line, ai-bench's format); --seeds 1,2,5 or 1-10; --mirror; --context
// (comma list of arms); --model, --thinking, --oracle, --no-stops (seat.mjs);
// --ai-profile (Default); --port (8650); --run NAME; --health-timeout S (180);
// --game-timeout S (7200); --dry-run.  Everything lands in var/llm-seat/<run>/
// (seat.mjs's files, plus bridge/<gameId>.log and schedule.json); the bridge
// writes its own frame log to var/games/<gameId>/frames.jsonl, the one to
// grade (replay.mjs --replay).

import { spawn } from 'node:child_process';
import { mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseArm } from './lib/arms.mjs';
import { runSeat } from './seat.mjs';

export function parseSeeds(spec) {
  const out = [];
  for (const part of String(spec).split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = /^(\d+)-(\d+)$/.exec(part);
    if (m) for (let s = Number(m[1]); s <= Number(m[2]); s++) out.push(s);
    else if (/^\d+$/.test(part)) out.push(Number(part));
    else throw new Error(`bad seed ${JSON.stringify(part)}`);
  }
  return out;
}

export function readPairs(text) {
  return text.split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean).map((l) => {
    const [a, b] = l.split(/\s+/);
    return { a, b };
  });
}

export function parseArgs(argv) {
  const a = {
    deck: null, aiDeck: null, pairs: null, pair: 0, seeds: [1], mirror: false, arms: ['fresh'], model: 'fake', thinking: 'low',
    oracle: null, stops: true, aiProfile: 'Default', port: 8650, run: null, healthTimeoutS: 180, gameTimeoutS: 7200, dryRun: false, out: 'var/llm-seat',
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => { const x = argv[++i]; if (x === undefined) throw new Error(`${k} needs a value`); return x; };
    switch (k) {
      case '--deck': a.deck = v(); break;
      case '--ai-deck': a.aiDeck = v(); break;
      case '--pairs': a.pairs = v(); break;
      case '--pair': a.pair = Number(v()); break;
      case '--seeds': a.seeds = parseSeeds(v()); break;
      case '--mirror': a.mirror = true; break;
      case '--context': a.arms = v().split(',').map((s) => s.trim()).filter(Boolean); break;
      case '--model': a.model = v(); break;
      case '--thinking': a.thinking = v(); break;
      case '--oracle': a.oracle = v(); break;
      case '--no-stops': a.stops = false; break;
      case '--ai-profile': a.aiProfile = v(); break;
      case '--port': a.port = Number(v()); break;
      case '--run': a.run = v(); break;
      case '--out': a.out = v(); break;
      case '--health-timeout': a.healthTimeoutS = Number(v()); break;
      case '--game-timeout': a.gameTimeoutS = Number(v()); break;
      case '--dry-run': a.dryRun = true; break;
      default: throw new Error(`unknown flag ${k}`);
    }
  }
  if (a.pairs) {
    const p = readPairs(readFileSync(a.pairs, 'utf8'))[a.pair];
    if (!p) throw new Error(`${a.pairs} has no pair ${a.pair}`);
    a.deck = p.a; a.aiDeck = p.b;
  }
  if (!a.deck || !a.aiDeck) throw new Error('--deck and --ai-deck (or --pairs) are required');
  for (const s of a.arms) parseArm(s);
  if (!a.run) a.run = `match-${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}`;
  if (!/^[A-Za-z0-9._-]+$/.test(a.run)) throw new Error('--run must be a plain name');
  return a;
}

/** Every game: arm-major, then seed, then the mirrored deal (pure). */
export function schedule(a) {
  const games = [];
  for (const arm of a.arms) {
    for (const seed of a.seeds) {
      const deals = a.mirror ? [[a.deck, a.aiDeck, false], [a.aiDeck, a.deck, true]] : [[a.deck, a.aiDeck, false]];
      for (const [deck, aiDeck, mirrored] of deals) {
        const n = games.length + 1;
        games.push({ n, arm, seed, deck, aiDeck, mirrored, gameId: `llm-${a.run}-${String(n).padStart(3, '0')}` });
      }
    }
  }
  return games;
}

/** The bridge's command line for one game (pure). */
export function bridgeCommand(a, g) {
  return ['./bridge/run.sh', 'mtgtable.MtgTable', '--transport', 'ws', '--port', String(a.port), '--seed', String(g.seed),
    '--deck', g.deck, '--ai-deck', g.aiDeck, '--ai-profile', a.aiProfile, '--ai-policy', 'plain',
    '--game-id', g.gameId, '--games', '1'];
}

async function waitHealth(port, timeoutS) {
  const until = Date.now() + timeoutS * 1000;
  while (Date.now() < until) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.status === 200) return true;
    } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  let a;
  try { a = parseArgs(process.argv.slice(2)); } catch (e) {
    process.stderr.write(`llm-match: ${e.message}\n`);
    process.exit(2);
  }
  const games = schedule(a);
  const runDir = join(a.out, a.run);
  mkdirSync(join(runDir, 'bridge'), { recursive: true });
  writeFileSync(join(runDir, 'schedule.json'), `${JSON.stringify({ args: a, games }, null, 2)}\n`);
  if (a.dryRun) {
    for (const g of games) process.stdout.write(`${g.gameId}  arm=${g.arm}  seed=${g.seed}${g.mirrored ? ' (mirrored)' : ''}\n  ${bridgeCommand(a, g).join(' ')}\n`);
    return;
  }
  const results = [];
  for (const g of games) {
    process.stderr.write(`[llm-match] game ${g.n}/${games.length}: ${g.gameId} arm ${g.arm} seed ${g.seed}${g.mirrored ? ' mirrored' : ''}\n`);
    const logFd = openSync(join(runDir, 'bridge', `${g.gameId}.log`), 'w');
    const [cmd, ...args] = bridgeCommand(a, g);
    const jvm = spawn(cmd, args, { stdio: ['ignore', logFd, logFd], detached: true });
    const exited = new Promise((r) => jvm.on('close', (code) => r(code)));
    if (!(await waitHealth(a.port, a.healthTimeoutS))) {
      process.stderr.write(`[llm-match] the bridge never answered /health on ${a.port}; see ${join(runDir, 'bridge', `${g.gameId}.log`)}\n`);
      try { process.kill(-jvm.pid, 'SIGTERM'); } catch { /* gone */ }
      results.push({ ...g, result: 'no-bridge' });
      continue;
    }
    const summary = await runSeat({
      url: null, port: a.port, model: a.model, context: g.arm, thinking: a.thinking, oracle: a.oracle, run: a.run, out: a.out,
      fakeScript: null, stops: a.stops, battlefieldAbilities: true, printPrompts: false, savePrompts: false,
      timeoutS: a.gameTimeoutS, modelTimeoutS: 180, quiet: false,
    }, { match: { gameId: g.gameId, seed: g.seed, deck: g.deck, aiDeck: g.aiDeck, mirrored: g.mirrored, aiProfile: a.aiProfile } });
    const code = await Promise.race([exited, new Promise((r) => setTimeout(() => r('killed'), 60_000))]);
    if (code === 'killed') { try { process.kill(-jvm.pid, 'SIGKILL'); } catch { /* gone */ } }
    results.push({ ...g, result: summary.result, turns: summary.turns, modelCalls: summary.modelCalls, fallbacks: summary.fallbacks,
      tokensIn: summary.tokensIn, cacheRead: summary.cacheRead, cacheCreate: summary.cacheCreate, tokensOut: summary.tokensOut, ms: summary.ms,
      bridgeLog: `var/games/${g.gameId}/frames.jsonl`, bridgeExit: code });
  }
  const byArm = {};
  for (const r of results) {
    const s = (byArm[r.arm] ??= { games: 0, win: 0, loss: 0, draw: 0, other: 0, turns: 0, modelCalls: 0, fallbacks: 0, tokensIn: 0, cacheRead: 0, cacheCreate: 0, tokensOut: 0, ms: 0 });
    s.games += 1;
    if (['win', 'loss', 'draw'].includes(r.result)) s[r.result] += 1; else s.other += 1;
    for (const k of ['turns', 'modelCalls', 'fallbacks', 'tokensIn', 'cacheRead', 'cacheCreate', 'tokensOut', 'ms']) s[k] += r[k] ?? 0;
  }
  writeFileSync(join(runDir, 'results.json'), `${JSON.stringify({ results, byArm }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(byArm, null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolvePath(process.argv[1])) main();
