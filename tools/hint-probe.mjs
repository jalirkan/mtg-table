#!/usr/bin/env node
// mtg-table — tools/hint-probe.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE SEARCH HINT ON THE REAL ENGINE (D429): a whole game against Forge with
// a scripted seat (tools/ws-auto-play.mjs) that, at real decisions -- main
// phase spells, attacks, blocks, targets -- stays parked while it asks the
// coach helper's POST /hint, exactly as ForgeCoach's button does.  NOT in the
// gate (it boots the engine twice: the bridge and the analysis); the gate's
// half is tools/hint-runner-selftest.mjs.
//
//   node tools/hint-probe.mjs [--ws-port 8850] [--coach-port 8851] [--seed 7]
//        [--ai-deck decks/doom-legion.dck] [--budget-ms 3000] [--out var/hint-probe/report.json]
//
// What it asserts, and prints as a report:
//   - every hint answers 200 with a pick (or "trivial" / "unsupported"), and
//     each of the four kinds is answered at least once when the game offers it;
//   - the time a hint takes, the engine's start included on the first one; the
//     bridge's own GET /health latency while each hint runs (the live game is
//     not slowed);
//   - hidden information: the bridge's log of the game passes
//     tools/check-redaction.mjs, every moment file the helper handed the
//     analysis is a prefix of that log, every answer's `knowledge` is the
//     basic-lands or pool model (never a deck), and NO card name of the bot's
//     real deck that the player had not seen by that moment -- and that is not
//     in the pool or the player's own deck -- appears anywhere in any answer;
//   - knowledge: every second hint carries a pool (three other decks, 120
//     cards, disjoint from the bot's) and says "pool"; the rest say "basic-lands".
//
// The hook half: ws-auto-play's --hold-hook imports this file and calls its
// default export at each new decision (HINT_PROBE_* in the environment).

import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAIN = ['MAIN1', 'MAIN2'];

/** Review.kindOf, in JS: the kind of decision an input asks for, or null. */
export function kindOf(state, input, seat) {
  if (!state || !input || !state.phase || !(state.turn > 0)) return null;
  const prompt = String(input.prompt ?? '').trim();
  if (prompt.startsWith('Select creatures to attack')) return 'attack';
  if (prompt.startsWith('Select creatures to block')) return 'block';
  const sel = input.selectable;
  const lines = prompt.split('\n').filter((l) => l.trim());
  if (sel && sel.mode !== 'none' && !(sel.mode === 'cards' && !(sel.cardIds ?? []).length)
      && !/^priority:/i.test(prompt) && /\btargets?\b/i.test(lines.at(-1) ?? '')) return 'target';
  if (/^priority:/i.test(prompt) && MAIN.includes(state.phase) && state.activePlayer === seat && !(state.stack ?? []).length) return 'spell';
  return null;
}

/** "N Name|SET" lines of a .dck's main deck -> [[n, name]]. */
export function deckList(path) {
  const out = [];
  let main = false;
  for (const l of readFileSync(path, 'utf8').split('\n')) {
    const t = l.trim();
    if (/^\[/.test(t)) { main = /^\[main\]$/i.test(t); continue; }
    const m = /^(\d+)\s+(.+?)(\|[A-Z0-9]+)?$/.exec(t);
    if (main && m) out.push([Number(m[1]), m[2]]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The hook (inside ws-auto-play)
// ---------------------------------------------------------------------------

/** Graded answers wanted per kind; every moment is asked until then, a main phase once, 30 asks at most. */
const CAP = { spell: 3, attack: 3, block: 3, target: 3 };
const graded = { spell: 0, attack: 0, block: 0, target: 0 };
const mainsAsked = new Set();
let hints = 0;

export default async function hold(ctx) {
  const kind = kindOf(ctx.state, ctx.input, ctx.me);
  if (!kind || graded[kind] >= CAP[kind] || hints >= 30) return;
  if (kind === 'spell') {
    const k = `${ctx.state.turn}:${ctx.state.phase}`;
    if (mainsAsked.has(k)) return;
    mainsAsked.add(k);
  }
  const port = Number(process.env.HINT_PROBE_COACH_PORT);
  const wsPort = Number(process.env.HINT_PROBE_WS_PORT);
  const usePool = hints++ % 2 === 1;
  const body = { gameId: ctx.gameId, seat: ctx.me, stateSeq: ctx.stateSeq, inputSeq: ctx.inputSeq, budgetMs: Number(process.env.HINT_PROBE_BUDGET_MS ?? 3000) };
  if (usePool) body.oppPool = JSON.parse(process.env.HINT_PROBE_POOL);
  // The bridge's own /health while the hint runs: the live game's latency.
  const lat = [];
  let polling = true;
  const poll = (async () => {
    while (polling) {
      const t = Date.now();
      try { await fetch(`http://127.0.0.1:${wsPort}/health`); lat.push(Date.now() - t); } catch { lat.push(-1); }
      await new Promise((r) => setTimeout(r, 250));
    }
  })();
  const t0 = Date.now();
  let status = 0;
  let answer = null;
  try {
    const r = await fetch(`http://127.0.0.1:${port}/hint`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    status = r.status;
    answer = await r.json();
  } catch (e) { answer = { error: String(e) }; }
  const ms = Date.now() - t0;
  if (answer?.status === 'ok') graded[kind]++;
  polling = false;
  await poll;
  // What the analysis read: the helper's moment file must be the bridge's own log, cut at this moment.
  let prefix = null;
  try {
    const moment = readFileSync('var/coach-grade/hint/moment.jsonl', 'utf8');
    prefix = readFileSync(`var/games/${ctx.gameId}/frames.jsonl`, 'utf8').startsWith(moment) && moment.length > 0;
  } catch { prefix = null; }
  appendFileSync(process.env.HINT_PROBE_OUT, JSON.stringify({ kind, pool: usePool, status, ms, turn: ctx.state.turn, phase: ctx.state.phase,
    prompt: String(ctx.input.prompt ?? '').split('\n')[0].slice(0, 80), stateSeq: ctx.stateSeq, inputSeq: ctx.inputSeq,
    healthMs: lat, prefix, answer }) + '\n');
  process.stderr.write(`HINT ${kind} turn ${ctx.state.turn} -> ${status} ${answer?.status ?? ''} ${answer?.pick ?? answer?.message ?? ''} (${answer?.strength ?? ''}) ${ms} ms\n`);
}

// ---------------------------------------------------------------------------
// The driver
// ---------------------------------------------------------------------------

async function waitFor(pred, ms, step = 250) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await pred()) return true;
    await new Promise((r) => setTimeout(r, step));
  }
  return false;
}

async function main() {
  const a = { wsPort: 8850, coachPort: 8851, seed: 7, aiDeck: 'decks/doom-legion.dck', budgetMs: 3000, out: 'var/hint-probe/report.json',
    recorded: 'fixtures/games/human-auto-42.jsonl' };
  for (let i = 2; i < process.argv.length; i++) {
    const f = process.argv[i];
    const v = () => process.argv[++i];
    if (f === '--ws-port') a.wsPort = Number(v());
    else if (f === '--coach-port') a.coachPort = Number(v());
    else if (f === '--seed') a.seed = Number(v());
    else if (f === '--ai-deck') a.aiDeck = v();
    else if (f === '--budget-ms') a.budgetMs = Number(v());
    else if (f === '--out') a.out = v();
    else if (f === '--recorded') a.recorded = v() || null;
    else { console.error(`hint-probe: unknown flag ${f}`); process.exit(2); }
  }
  const dir = resolve('var/hint-probe');
  mkdirSync(dir, { recursive: true });
  const gameId = `hint-probe-${a.seed}`;
  const results = resolve(dir, `hints-${a.seed}.jsonl`);
  rmSync(results, { force: true });
  rmSync(resolve('var/games', gameId), { recursive: true, force: true });
  // The pool: three other decks of the repo, none of the bot's cards.
  const pool = new Map();
  for (const d of ['decks/masters-of-evil.dck', 'decks/hulk-family.dck', 'decks/wakanda.dck']) {
    for (const [n, name] of deckList(d)) pool.set(name, (pool.get(name) ?? 0) + n);
  }
  const poolList = [...pool.entries()].map(([name, n]) => [n, name]);
  const kids = [];
  const stopAll = () => { for (const k of kids) { try { process.kill(-k.pid, 'SIGTERM'); } catch { try { k.kill('SIGTERM'); } catch { /* gone */ } } } };
  process.on('exit', stopAll);
  const bridge = spawn('./bridge/run.sh', ['mtgtable.MtgTable', '--transport', 'ws', '--seed', String(a.seed), '--port', String(a.wsPort),
    '--game-id', gameId, '--ai-deck', a.aiDeck, '--keep-open'], { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  kids.push(bridge);
  let bridgeOut = '';
  bridge.stdout.on('data', (d) => { bridgeOut = (bridgeOut + d).slice(-20000); });
  bridge.stderr.on('data', (d) => { bridgeOut = (bridgeOut + d).slice(-20000); });
  if (!await waitFor(async () => { try { return (await fetch(`http://127.0.0.1:${a.wsPort}/health`)).status === 200; } catch { return false; } }, 120_000)) {
    console.error(`hint-probe: the bridge never answered /health on ${a.wsPort}\n${bridgeOut.slice(-3000)}`);
    process.exit(1);
  }
  const helper = spawn('node', ['tools/coach-helper.mjs', '--port', String(a.coachPort), '--ws-port', String(a.wsPort), '--no-review', '--no-eval', '--no-auto-review'],
    { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  kids.push(helper);
  let helperOut = '';
  helper.stdout.on('data', (d) => { helperOut = (helperOut + d).slice(-40000); });
  helper.stderr.on('data', (d) => { helperOut = (helperOut + d).slice(-40000); });
  if (!await waitFor(() => /COACH LISTENING/.test(helperOut), 30_000)) { console.error(`hint-probe: the helper did not start\n${helperOut}`); process.exit(1); }
  const health = await (await fetch(`http://127.0.0.1:${a.coachPort}/health`)).json();
  const t0 = Date.now();
  const seat = spawnSync('node', ['tools/ws-auto-play.mjs', '--port', String(a.wsPort), '--timeout', '900', '--quiet', '--hold-hook', 'tools/hint-probe.mjs',
    '--log', resolve(dir, `seat-${a.seed}.jsonl`)], {
    stdio: ['ignore', 'inherit', 'pipe'], encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, HINT_PROBE_COACH_PORT: String(a.coachPort), HINT_PROBE_WS_PORT: String(a.wsPort), HINT_PROBE_OUT: results,
      HINT_PROBE_POOL: JSON.stringify(poolList), HINT_PROBE_BUDGET_MS: String(a.budgetMs) } });
  const gameMs = Date.now() - t0;
  for (const l of (seat.stderr ?? '').split('\n')) if (/^HINT |OVER|HOLD/.test(l)) console.log(`  seat: ${l}`);
  // Part 2: recorded moments the live game did not offer -- a committed human-seat recording cut just
  // before its first attack and its first block prompt, put where the engine keeps its logs, asked the same way.
  const recorded = [];
  if (a.recorded) {
    const lines = readFileSync(a.recorded, 'utf8').split('\n').filter(Boolean);
    for (const want of ['attack', 'block']) {
      let st = null;
      for (let i = 1; i < lines.length; i++) {
        const f = JSON.parse(lines[i]);
        if (f.type === 'state') st = f;
        if (f.type !== 'input' || !st || kindOf(st.body, f.body, JSON.parse(lines[0]).seat) !== want) continue;
        const id = `hint-probe-rec-${want}`;
        mkdirSync(resolve('var/games', id), { recursive: true });
        writeFileSync(resolve('var/games', id, 'frames.jsonl'), `${lines.slice(0, i + 1).join('\n')}\n`);
        const body = { gameId: id, stateSeq: st.seq, inputSeq: f.seq, budgetMs: a.budgetMs, ...(want === 'block' ? { oppPool: poolList } : {}) };
        const t1 = Date.now();
        const r = await fetch(`http://127.0.0.1:${a.coachPort}/hint`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const answer = await r.json();
        recorded.push({ kind: want, pool: want === 'block', status: r.status, ms: Date.now() - t1, turn: st.body.turn, phase: st.body.phase,
          prompt: String(f.body.prompt).split('\n')[0].slice(0, 80), stateSeq: st.seq, inputSeq: f.seq, healthMs: [], answer, recorded: a.recorded });
        console.log(`  recorded: HINT ${want} turn ${st.body.turn} -> ${r.status} ${answer.status} ${answer.pick ?? answer.message ?? ''} (${answer.strength ?? ''}) ${Date.now() - t1} ms`);
        rmSync(resolve('var/games', id), { recursive: true, force: true });
        break;
      }
    }
  }
  stopAll();
  rmSync(resolve(dir, `seat-${a.seed}.jsonl`), { force: true });

  // --- the checks ------------------------------------------------------------
  let failures = 0;
  const check = (ok, what) => { if (!ok) failures++; console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}`); };
  check(seat.status === 0, `the scripted seat finished its game (exit ${seat.status})`);
  check(health.hint === 1, '/health says "hint": 1');
  const hintsRun = existsSync(results) ? readFileSync(results, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const logPath = resolve('var/games', gameId, 'frames.jsonl');
  const logText = existsSync(logPath) ? readFileSync(logPath, 'utf8') : '';
  const red = spawnSync('node', ['tools/check-redaction.mjs', logPath], { encoding: 'utf8' });
  check(red.status === 0, `the bridge's log of the game -- what every hint read -- passes check-redaction (${(red.stdout || red.stderr).trim().split('\n').at(-1)})`);
  // The cards the player could have seen by a moment: every card with a name in the states up to that seq.
  const frames = logText.split('\n').slice(1).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const seenBy = (seq) => {
    const names = new Set();
    const walk = (x) => {
      if (Array.isArray(x)) { for (const y of x) walk(y); return; }
      if (x && typeof x === 'object') { if (typeof x.name === 'string' && x.name) names.add(x.name); for (const v of Object.values(x)) walk(v); }
    };
    for (const f of frames) if (f.dir !== 'c2s' && f.seq <= seq) walk(f.body);
    return names;
  };
  const own = new Set(deckList('decks/pacho-shield.dck').map(([, n]) => n));
  const basics = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);
  const botCards = deckList(a.aiDeck).map(([, n]) => n).filter((n) => !own.has(n) && !pool.has(n) && !basics.has(n));
  let leaks = 0;
  let unseenTotal = 0;
  for (const h of hintsRun) {
    const seen = seenBy(h.stateSeq);
    const unseen = botCards.filter((n) => !seen.has(n));
    unseenTotal += unseen.length;
    const text = JSON.stringify(h.answer);
    const hit = unseen.filter((n) => text.includes(n));
    if (hit.length) { leaks++; console.log(`  LEAK at state ${h.stateSeq}: ${hit.join(', ')}`); }
  }
  check(hintsRun.length > 0 && leaks === 0, `no card of the bot's deck the player had not seen appears in any answer (${hintsRun.length} answers, ${unseenTotal} unseen-card checks)`);
  check(hintsRun.length > 0 && hintsRun.every((h) => h.status !== 200 || h.prefix === true),
    'every moment the analysis read is the bridge\'s own log of the game, cut at that moment (a prefix of it)');
  check(hintsRun.every((h) => h.status !== 200 || (h.answer.knowledge?.opponentModel === (h.pool ? 'pool' : 'basic-lands'))),
    'knowledge: "pool" when the request carried the pool, "basic-lands" otherwise -- never a deck');
  const ok = hintsRun.filter((h) => h.status === 200);
  check(ok.length === hintsRun.length, `every hint answered 200 (${ok.length}/${hintsRun.length}; others: ${hintsRun.filter((h) => h.status !== 200).map((h) => `${h.status} ${h.answer?.message ?? ''}`).join('; ')})`);
  for (const k of ['spell', 'attack', 'block', 'target']) {
    const of = [...ok, ...recorded.filter((h) => h.status === 200)].filter((h) => h.kind === k);
    console.log(`  ${k}: ${of.length} hint(s), statuses ${[...new Set(of.map((h) => h.answer.status))].join('/') || '-'}`);
  }
  check(recorded.every((h) => h.status === 200 && h.answer.type === h.kind && h.answer.knowledge?.opponentModel === (h.pool ? 'pool' : 'basic-lands')),
    `recorded moments: ${recorded.map((h) => `${h.kind} ${h.status} ${h.answer.status}`).join(', ') || 'none'} -- the decision's own kind, the knowledge said`);
  check(ok.some((h) => h.answer.status === 'ok' && h.answer.pick), 'at least one graded hint with a pick');
  const warm = ok.slice(1).map((h) => h.ms);
  const maxHealth = Math.max(0, ...hintsRun.flatMap((h) => h.healthMs));
  check(hintsRun.every((h) => h.healthMs.every((x) => x >= 0)) && maxHealth < 500, `the bridge's /health answered throughout every hint (slowest ${maxHealth} ms)`);
  const report = {
    v: 1, seed: a.seed, aiDeck: a.aiDeck, budgetMs: a.budgetMs, gameMs, failures,
    firstHintMs: ok[0]?.ms ?? null, warmHintMs: warm.length ? { min: Math.min(...warm), median: warm.slice().sort((x, y) => x - y)[Math.floor(warm.length / 2)], max: Math.max(...warm) } : null,
    bridgeHealthMaxMs: maxHealth,
    hints: [...hintsRun, ...recorded].map((h) => ({ ...(h.recorded ? { recorded: h.recorded } : {}), kind: h.kind, turn: h.turn, phase: h.phase, prompt: h.prompt, pool: h.pool, http: h.status, ms: h.ms,
      status: h.answer.status, type: h.answer.type, pick: h.answer.pick, strength: h.answer.strength, runnerUp: h.answer.runnerUp,
      landFirst: h.answer.landFirst, knowledge: h.answer.knowledge?.opponentModel, rounds: h.answer.rounds, playouts: h.answer.playouts,
      options: (h.answer.options ?? []).map((o) => `${o.token} = ${o.label}${o.verdict ? ` [${o.verdict}${o.winRate != null ? ` ${o.winRate.toFixed(3)}` : ''}]` : ''}`),
      message: h.answer.message })),
  };
  writeFileSync(resolve(a.out), JSON.stringify(report, null, 2) + '\n');
  console.log(`hint-probe ${failures ? 'FAILED' : 'OK'}: ${hintsRun.length} hint(s), first ${report.firstHintMs} ms, warm ${JSON.stringify(report.warmHintMs)}; report ${a.out}`);
  rmSync(resolve('var/coach-grade/hint'), { recursive: true, force: true });
  process.exit(failures ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
