#!/usr/bin/env node
// mtg-table — tools/llm-seat/replay.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE POSITIONS MODE (D418): the same recorded positions posed to every
// context arm, for PAIRED grading.  Twenty games an arm give a win rate
// within about ±22 points, which cannot separate arms; the same position
// answered by every arm, each answer graded by the engine, can.
//
//   node tools/llm-seat/replay.mjs --replay var/games/<id>/frames.jsonl \
//        --arms fresh,session:10,game --model sonnet --run arms-replay-1 \
//        [--history chain|transcript] [--deck D] [--opp-deck D] [--limit N] [--print-prompts]
//   node tools/llm-seat/replay.mjs join --choices var/llm-seat/<run>/choices.jsonl \
//        --graded var/llm-seat/<run>/graded.jsonl
//
// Output under var/llm-seat/<run>/:
//   choices.jsonl   one line per (position, arm): the option chosen, its label,
//                   its coach-grade token, how (model / fallback), the session
//                   position, prompt bytes, usage, latency -- and the move the
//                   game actually made at that position
//   moments.jsonl   one coach-grade moment per gradeable position (spell /
//                   attack / block / target), every arm's token and the actual
//                   one in `extra` so all of them are graded; feed it to
//                   ./tools/coach-grade.sh batch --moments … --out …/graded.jsonl
//   prompts.txt     with --print-prompts / --save-prompts
//
// How a session arm sees earlier positions (`--history`):
//   chain (default)  one real CLI session walked through the positions in
//                    order: the model answers each, and the next message
//                    starts with the move the game actually made when it
//                    differed ("the game continued from that"); a session
//                    restarts every N positions with the history re-supplied.
//                    One call per (position, arm), like the live seat.
//   transcript       each (position, arm) is ONE fresh call whose prompt holds
//                    the session as it would have been: the full context at the
//                    session's start, then each earlier position's delta and
//                    the move actually made, then this one.  Independent calls,
//                    but the earlier turns are text in one message, not turns.
//
// Use the BRIDGE's log of the game (var/games/<gameId>/frames.jsonl): its
// header names the seat's deck, which coach-grade needs; a client's log
// (`recordedBy: "client"`) works for the choices, and then --deck is needed
// for the grading.

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Arm, parseArm } from './lib/arms.mjs';
import { readLog } from './lib/frames.mjs';
import { makeClaudeModel, makeFakeModel } from './lib/model.mjs';
import { openOracle } from './lib/oracle.mjs';
import { positionsOf } from './lib/positions.mjs';
import { SYSTEM_PROMPT, deltaPrompt, fullPrompt } from './lib/prompt.mjs';
import { tokenFor } from './lib/decision.mjs';

export function parseArgs(argv) {
  const a = {
    cmd: 'run', replay: null, arms: ['fresh'], model: 'fake', thinking: 'low', oracle: null, run: null, out: 'var/llm-seat',
    history: 'chain', deck: null, oppDeck: null, limit: 0, printPrompts: false, savePrompts: false, fakeScript: null,
    modelTimeoutS: 180, choices: null, graded: null, battlefieldAbilities: true,
  };
  let i = 0;
  if (argv[0] === 'join') { a.cmd = 'join'; i = 1; }
  for (; i < argv.length; i++) {
    const k = argv[i];
    const v = () => { const x = argv[++i]; if (x === undefined) throw new Error(`${k} needs a value`); return x; };
    switch (k) {
      case '--replay': a.replay = v(); break;
      case '--arms': a.arms = v().split(',').map((s) => s.trim()).filter(Boolean); break;
      case '--model': a.model = v(); break;
      case '--thinking': a.thinking = v(); break;
      case '--oracle': a.oracle = v(); break;
      case '--run': a.run = v(); break;
      case '--out': a.out = v(); break;
      case '--history': a.history = v(); break;
      case '--deck': a.deck = v(); break;
      case '--opp-deck': a.oppDeck = v(); break;
      case '--limit': a.limit = Number(v()); break;
      case '--print-prompts': a.printPrompts = true; break;
      case '--save-prompts': a.savePrompts = true; break;
      case '--dry-run': a.model = 'fake'; a.printPrompts = true; break;
      case '--fake-script': a.fakeScript = v(); break;
      case '--model-timeout': a.modelTimeoutS = Number(v()); break;
      case '--no-battlefield-abilities': a.battlefieldAbilities = false; break;
      case '--choices': a.choices = v(); break;
      case '--graded': a.graded = v(); break;
      default: throw new Error(`unknown flag ${k}`);
    }
  }
  if (a.cmd === 'join') {
    if (!a.choices || !a.graded) throw new Error('join needs --choices and --graded');
    return a;
  }
  if (!a.replay) throw new Error('--replay <frames.jsonl> is required');
  for (const s of a.arms) parseArm(s);
  if (!['chain', 'transcript'].includes(a.history)) throw new Error('--history is chain or transcript');
  if (!a.run) a.run = `replay-${basename(a.replay).replace(/\.jsonl(\.gz)?$/, '')}-${a.model}`;
  if (!/^[A-Za-z0-9._-]+$/.test(a.run)) throw new Error('--run must be a plain name');
  return a;
}

/** The transcript prompt of position i for a session arm of size n (pure). */
export function transcriptPrompt(positions, i, n) {
  const start = Number.isFinite(n) ? i - (i % n) : 0;
  if (start === i) return { user: fullPrompt(positions[i].snap), sessionPos: 0 };
  const parts = [fullPrompt(positions[start].snap).replace(/\nDECISION[\s\S]*$/, '').trimEnd()];
  parts.push('', 'EARLIER DECISIONS IN THIS GAME (what you were asked, and the move that was made)');
  for (let j = start; j < i; j++) {
    const p = positions[j];
    parts.push('', `--- decision ${j - start + 1} ---`, p.snap.decision);
    parts.push(`Move made: ${p.actual ? p.actual.map((x) => `${x}. ${p.d.options[x - 1]?.label ?? '?'}`).join(' + ') : '(not one of the options)'}`);
  }
  const shown = new Set(positions[start].snap.names);
  for (let j = start + 1; j < i; j++) for (const nm of positions[j].snap.names) shown.add(nm);
  parts.push('', '--- now ---', deltaPrompt(positions[i].snap, { since: positions[i - 1].snap.mark, shown }));
  return { user: parts.join('\n'), sessionPos: i - start };
}

function actualNote(p, chosen) {
  if (!p.actual || JSON.stringify(p.actual) === JSON.stringify(chosen)) return null;
  return `Note: at your previous decision the move actually made was ${p.actual.map((x) => `${x}. ${p.d.options[x - 1]?.label ?? '?'}`).join(' + ')}; the game continued from that.`;
}

export async function runReplay(a, deps = {}) {
  const log = deps.log ?? readLog(a.replay);
  const oracle = deps.oracle ?? openOracle(a.oracle);
  let positions = positionsOf(log, { oracle, opts: { battlefieldAbilities: a.battlefieldAbilities } });
  if (a.limit > 0) positions = positions.slice(0, a.limit);
  const runDir = join(a.out, a.run);
  mkdirSync(runDir, { recursive: true });
  const promptsFile = join(runDir, 'prompts.txt');
  if (a.savePrompts) writeFileSync(promptsFile, '');
  const rows = [];
  const sizes = {};
  const say = deps.say ?? ((l) => process.stderr.write(`[llm-replay] ${l}\n`));
  say(`${positions.length} positions in ${a.replay}; arms ${a.arms.join(', ')}; history ${a.history}; model ${a.model}`);

  for (const armSpec of a.arms) {
    const spec = parseArm(armSpec);
    const model = deps.model ?? (a.model === 'fake'
      ? makeFakeModel({ script: a.fakeScript ? JSON.parse(readFileSync(a.fakeScript, 'utf8')) : [] })
      : makeClaudeModel({ model: a.model, thinking: a.thinking, cwd: join(runDir, 'claude-cwd'), timeoutS: a.modelTimeoutS }));
    const onPrompt = (p) => {
      const text = `\n===== ${spec.name} pos ${p.pos ?? '?'} attempt ${p.attempt}${p.session ? ` session ${p.session.resume ? 'resume' : 'start'}` : ''} =====\n${p.user}\n`;
      if (a.printPrompts) process.stdout.write(text);
      if (a.savePrompts) appendFileSync(promptsFile, text);
    };
    sizes[spec.name] = [];
    const transcript = spec.kind === 'session' && a.history === 'transcript';
    // transcript mode: each position is a fresh call carrying its own session text
    const arm = new Arm(transcript ? 'fresh' : spec.name, model, { onPrompt: (p) => onPrompt({ ...p, pos: cur }) });
    let cur = 0;
    let prevNote = null;
    for (const p of positions) {
      cur = p.pos;
      let res;
      if (transcript) {
        const { user, sessionPos } = transcriptPrompt(positions, p.pos, spec.n);
        res = await arm.decide(p.snap, p.d, { user });
        res.sessionPos = sessionPos;
      } else {
        res = await arm.decide(p.snap, p.d, { previous: prevNote });
        prevNote = actualNote(p, res.chosen);
      }
      const chosenLabels = (res.chosen ?? []).map((n) => p.d.options[n - 1]?.label ?? `?${n}`);
      const row = {
        run: a.run, log: a.replay, pos: p.pos, frame: p.frame, stateSeq: p.stateSeq, turn: p.turn, phase: p.phase,
        kind: p.d.kind, gradeType: p.d.gradeType, options: p.d.options.length, arm: spec.name, history: spec.kind === 'session' ? a.history : null,
        sessionPos: res.sessionPos, full: res.full ?? null, how: res.how, chosen: res.chosen, chosenLabels,
        token: tokenFor(p.d, res.chosen), actual: p.actual, actualToken: p.actualToken, retries: res.retries,
        promptBytes: res.calls.reduce((t, c) => t + (c.promptBytes ?? 0), 0), calls: res.calls,
      };
      rows.push(row);
      sizes[spec.name].push(row.promptBytes);
      appendFileSync(join(runDir, 'choices.jsonl'), `${JSON.stringify(row)}\n`);
    }
  }

  // coach-grade moments: one per gradeable position, every arm's token and the actual one graded
  const moments = [];
  for (const p of positions) {
    if (!p.d.gradeType) continue;
    const tokens = new Set(rows.filter((r) => r.pos === p.pos && r.token).map((r) => r.token));
    if (p.actualToken) tokens.add(p.actualToken);
    const m = { id: `${basename(a.replay)}#${p.pos}`, log: a.replay, frame: p.frame, mode: 'live', type: p.d.gradeType, extra: [...tokens].sort() };
    if (p.actualToken) m.played = p.actualToken;
    if (p.d.gradeType === 'spell' && [...tokens].some((t) => t.startsWith('land:'))) m.lands = true;
    if (a.deck) m.deck = a.deck;
    if (a.oppDeck) m.oppDeck = a.oppDeck;
    moments.push(m);
  }
  writeFileSync(join(runDir, 'moments.jsonl'), moments.map((m) => JSON.stringify(m)).join('\n') + (moments.length ? '\n' : ''));
  const summary = {
    run: a.run, positions: positions.length, gradeable: moments.length,
    underDefaultStops: positions.filter((p) => p.underDefaultStops).length,
    lastTurn: positions.length ? positions[positions.length - 1].turn : null, arms: {},
  };
  for (const [name, list] of Object.entries(sizes)) {
    const s = [...list].sort((x, y) => x - y);
    const sum = s.reduce((t, x) => t + x, 0);
    summary.arms[name] = {
      calls: s.length, totalBytes: sum, meanBytes: s.length ? Math.round(sum / s.length) : 0,
      medianBytes: s.length ? s[Math.floor(s.length / 2)] : 0, maxBytes: s.length ? s[s.length - 1] : 0,
      fallbacks: rows.filter((r) => r.arm === name && r.how === 'fallback').length,
      agreeWithActual: rows.filter((r) => r.arm === name && r.actual && JSON.stringify(r.actual) === JSON.stringify(r.chosen)).length,
    };
  }
  writeFileSync(join(runDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  return { positions, rows, moments, summary };
}

/** Per-arm regret from coach-grade's batch output, paired by position (pure). */
export function joinGraded(choices, graded) {
  const byId = new Map();
  for (const g of graded) if (g.id && g.grade?.status === 'ok') byId.set(g.id, g.grade);
  const perArm = {};
  const perPos = new Map();
  for (const c of choices) {
    const id = `${basename(c.log)}#${c.pos}`;
    const g = byId.get(id);
    if (!g || !c.token) continue;
    const opt = (g.options ?? []).find((o) => o.token === c.token) ?? null;
    if (!opt || typeof opt.regret !== 'number') continue;
    (perArm[c.arm] ??= []).push(opt.regret);
    if (!perPos.has(id)) perPos.set(id, {});
    perPos.get(id)[c.arm] = opt.regret;
  }
  const stat = (xs) => {
    const n = xs.length;
    const m = n ? xs.reduce((t, x) => t + x, 0) / n : null;
    const sd = n > 1 ? Math.sqrt(xs.reduce((t, x) => t + (x - m) ** 2, 0) / (n - 1)) : null;
    return { n, mean: m, lo: sd === null ? null : m - 1.96 * sd / Math.sqrt(n), hi: sd === null ? null : m + 1.96 * sd / Math.sqrt(n) };
  };
  const arms = Object.keys(perArm).sort();
  const out = { arms: {}, paired: {} };
  for (const a of arms) out.arms[a] = stat(perArm[a]);
  for (let i = 0; i < arms.length; i++) {
    for (let j = i + 1; j < arms.length; j++) {
      const d = [];
      for (const r of perPos.values()) if (arms[i] in r && arms[j] in r) d.push(r[arms[j]] - r[arms[i]]);
      out.paired[`${arms[j]} - ${arms[i]}`] = stat(d);
    }
  }
  return out;
}

async function main() {
  let a;
  try { a = parseArgs(process.argv.slice(2)); } catch (e) {
    process.stderr.write(`llm-replay: ${e.message}\n`);
    process.exit(2);
  }
  if (a.cmd === 'join') {
    const read = (p) => readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
    process.stdout.write(`${JSON.stringify(joinGraded(read(a.choices), read(a.graded)), null, 2)}\n`);
    return;
  }
  const { summary } = await runReplay(a);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolvePath(process.argv[1])) main();

export { SYSTEM_PROMPT };
