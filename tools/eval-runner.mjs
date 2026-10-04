// mtg-table — tools/eval-runner.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE WIN CHANCE (D361): the coach helper's POST /eval -- the learned position
// evaluator's P(the viewing seat wins) for one position ForgeCoach is showing.
// Imported by tools/coach-helper.mjs (its --eval-model, --no-eval,
// --eval-python, --eval-schema and --eval-cube); self-test
// tools/eval-runner-selftest.mjs (gate step 12f, CI).
//
// The model is a train_eval.py export (D316) that lives on this machine only
// (var/ml/models/, gitignored): it is never served, and no weight leaves the
// process.  The default is var/ml/models/night-1-ensemble.json when that manifest
// exists (D368), else var/ml/models/night-1-eval.json when that file exists.
//
// AN ENSEMBLE (D368).  --eval-model may name several exports of one schema
// (seeds of one training config): `a.json,b.json`, a directory, or an
// `ensemble.json` manifest (tools/ml/eval_serve.py's header).  The answer's `p`
// is then the members' mean, `sd` their sample standard deviation, `n` their
// number.  `explain: true` adds the attributions (tools/ml/attribution.py).
//
// HOW.  One child process, tools/ml/eval_serve.py, holds the model and answers
// JSON lines: it IS encode.py's encoder and evalnet.py's forward pass (nothing
// is ported, so the features are the training rows' by construction;
// tools/ml/tests/test_eval_serve.py proves it on every committed recording).
// Its first line says whether the model loaded; /health says "eval": 1 only
// after that line said ready.  Python: --eval-python, else var/ml/venv/bin/python3
// when it exists (README of tools/ml: numpy lives there), else python3.
//
// THE CONTRACT (ForgeCoach's src/evalClient.ts is built against exactly this):
//
//   GET  /health  ->  ... "eval": 1, "evalModel": "<sha-256 of the model file, 12 hex>",
//                         "evalSchema": "<schemaId, 16 hex>",
//                         "evalEnsemble": <the number of models; 2+ means answers carry sd>,
//                         "evalExplain": 1 | 0   (D368: whether "explain" is answered)
//                  or ... "eval": 0, "evalError"?: "<plain words>"   (off, loading, or refused)
//   POST /eval    {"seat": <the viewing seat's player id>,
//                  "state": <a protocol state body, exactly as that seat received it>,
//                  "history"?: [{"events": [...], "stack": [...]}, ...],
//                  "explain"?: true}       (D368; or POST /eval?explain=1)
//                 (at most 2 MB; no other field)
//                 -> 200 {"ok": true, "p": <0..1, P(seat wins); an ensemble's mean>,
//                         "n": <models>, "sd"?: <their sample sd, when n >= 2>,
//                         "model": "<12 hex>",
//                         "schema": "<16 hex>", "turn": <state.turn>,
//                         "decision": <true when the state is a decision row as the
//                                      training data picks them>,
//                         "featureHash": "<16 hex>", "ms": <time taken>,
//                         "explain"?: {"method", "baseline": {"what", "p", "logit"}, "p", "logit",
//                                      "members", "buckets": [{"key", "label", "pts", "logit"}, ...]}}
//                 `buckets` is every bucket with a share, largest first; their `pts`
//                 sum to 100 (p - baseline.p) and their `logit` to logit - baseline.logit.
//                 400 a body that is not that, or a state not redacted for `seat`
//                 413 too large; 429 too many waiting; 503 eval off / not ready;
//                 504 no answer in time -- each {"ok": false, "type": "error", "message"}.
//
//   `history` is the game's earlier `state` frames, oldest first, each as its
//   `events` and `stack`; a client may leave out every frame none of whose
//   events is a `turn`, `land`, `cast` or `mulligan` (they cannot change the
//   answer).  It feeds the counters the training rows carry (this turn's land
//   drop, lands and spells).  Without it those read as zero.
//
//   HIDDEN INFORMATION.  The only state the evaluator reads is the one the
//   request carries -- the viewing seat's redacted view, what its board shows --
//   and it reads it as dataset.py's rows do: the opponent's hand and both
//   libraries are counts, a stub is a count, a face-down card is anonymous.  No
//   field takes anything else (an unknown field is 400), and a state whose
//   viewer's own hand is redacted (a state made for the other seat) is refused.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const MAX_EVAL_BODY = 2 * 1024 * 1024;
export const DEFAULT_EVAL_MODEL = 'var/ml/models/night-1-eval.json';
export const DEFAULT_EVAL_ENSEMBLE = 'var/ml/models/night-1-ensemble.json';
export const VENV_PYTHON = 'var/ml/venv/bin/python3';
const MAX_WAITING = 32;
const MAX_HISTORY = 20000;
const MAX_RESTARTS = 3;
const FIELDS = new Set(['seat', 'state', 'history', 'explain']);

/** How many models a ready line says it serves (an older eval_serve.py says nothing: one). */
const members = (o) => (Number.isInteger(o?.n) && o.n >= 1 ? o.n : 1);

/** Plain checks of a /eval body; eval_serve.py checks the state itself. */
export function validateEval(q) {
  if (!q || typeof q !== 'object' || Array.isArray(q)) return { problem: 'the body must be a JSON object {seat, state, history?, explain?}' };
  const extra = Object.keys(q).filter((k) => !FIELDS.has(k));
  if (extra.length) return { problem: `unknown field${extra.length > 1 ? 's' : ''} ${extra.map((k) => JSON.stringify(k)).join(', ')}: the request is {seat, state, history?, explain?}` };
  if (!Number.isInteger(q.seat) || q.seat < 0 || q.seat > 64) return { problem: '"seat" must be the viewing seat\'s player id' };
  if (!q.state || typeof q.state !== 'object' || Array.isArray(q.state) || !Array.isArray(q.state.players)) return { problem: '"state" must be a protocol state body (with "players")' };
  if (q.history !== undefined && q.history !== null) {
    if (!Array.isArray(q.history)) return { problem: '"history" must be a list of {events, stack}' };
    if (q.history.length > MAX_HISTORY) return { problem: `"history" holds at most ${MAX_HISTORY} frames` };
    for (const h of q.history) {
      if (!h || typeof h !== 'object' || Array.isArray(h)) return { problem: '"history" must be a list of {events, stack}' };
      if (h.events !== undefined && !Array.isArray(h.events)) return { problem: 'a history frame\'s "events" must be a list' };
      if (h.stack !== undefined && h.stack !== null && !Array.isArray(h.stack)) return { problem: 'a history frame\'s "stack" must be a list' };
    }
  }
  if (q.explain !== undefined && typeof q.explain !== 'boolean') return { problem: '"explain" must be true or false' };
  const req = { seat: q.seat, state: q.state, history: q.history ?? [] };
  if (q.explain === true) req.explain = true;
  return { req };
}

/**
 * The model to load: the flag (one path, a comma-separated list, a directory or a
 * manifest; each path resolved against the repo), else the default ensemble manifest
 * when it exists, else the default model when it exists, else none.
 */
export function resolveEvalModel(repoRoot, flag) {
  if (flag) return flag.split(',').map((p) => p.trim()).filter(Boolean).map((p) => resolve(repoRoot, p)).join(',');
  for (const d of [DEFAULT_EVAL_ENSEMBLE, DEFAULT_EVAL_MODEL]) {
    const p = resolve(repoRoot, d);
    if (existsSync(p)) return p;
  }
  return null;
}

/** The Python that runs eval_serve.py: the flag, else the repo's venv when present, else python3. */
export function resolveEvalPython(repoRoot, flag) {
  if (flag) return flag;
  const v = resolve(repoRoot, VENV_PYTHON);
  return existsSync(v) ? v : 'python3';
}

/**
 * opts: { repoRoot, model (absolute path, or null: eval off), python, expectSchema?, cube?,
 *         script = 'tools/ml/eval_serve.py', spawnImpl, readyTimeoutMs, requestTimeoutMs, log }.
 * start() spawns the process (once ready, health() says eval: 1); post(body) -> {status, body}.
 */
export function createEvalRunner(opts) {
  const {
    repoRoot, model, python = 'python3', expectSchema = null, cube = null,
    script = 'tools/ml/eval_serve.py', spawnImpl = spawn,
    readyTimeoutMs = 60_000, requestTimeoutMs = 15_000, log = () => {},
  } = opts;
  let state = model ? 'idle' : 'off';   // off | idle | loading | ready | failed
  let error = model ? null : 'no model: pass --eval-model, or put one at ' + DEFAULT_EVAL_MODEL;
  let info = null;                      // the ready line
  let child = null;
  let restarts = 0;
  let crashed = false;                  // it was ready and then exited: worth a restart
  let nextId = 1;
  const pending = new Map();            // id -> { resolve, timer, t0 }
  let starting = null;

  const fail = (why) => {
    state = 'failed';
    error = why;
    info = null;
    for (const [, w] of pending) { clearTimeout(w.timer); w.resolve(unavailable()); }
    pending.clear();
  };
  const unavailable = () => ({ status: 503, body: { ok: false, type: 'error', message: `the win chance is not available: ${error ?? 'the evaluator is loading'}` } });

  function start() {
    if (!model) return Promise.resolve(false);
    if (starting) return starting;
    state = 'loading';
    error = null;
    starting = new Promise((done) => {
      const args = [resolve(repoRoot, script), '--model', model];
      if (expectSchema) args.push('--expect-schema', expectSchema);
      if (cube) args.push('--cube', resolve(repoRoot, cube));
      let c;
      try {
        c = spawnImpl(python, args, { cwd: repoRoot, stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (e) {
        fail(`could not start ${python}: ${e.message}`);
        starting = null;
        done(false);
        return;
      }
      child = c;
      let buf = '';
      let stderr = '';
      let ready = false;
      const readyTimer = setTimeout(() => {
        if (ready) return;
        fail(`the evaluator did not load within ${Math.round(readyTimeoutMs / 1000)} s`);
        try { c.kill('SIGKILL'); } catch { /* gone */ }
        starting = null;
        done(false);
      }, readyTimeoutMs);
      readyTimer.unref?.();
      c.stdin.on('error', () => { /* a child that died */ });
      c.stderr.setEncoding('utf8');
      c.stderr.on('data', (d) => { stderr = (stderr + d).slice(-4096); });
      c.stdout.setEncoding('utf8');
      c.stdout.on('data', (d) => {
        buf += d;
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          let o;
          try { o = JSON.parse(line); } catch { continue; }
          if (!ready) {
            clearTimeout(readyTimer);
            if (o && o.ready === true && /^[0-9a-f]{12}$/.test(o.model) && /^[0-9a-f]{16}$/.test(o.schema)) {
              ready = true;
              state = 'ready';
              info = o;
              log(`EVAL ready: model ${o.model}, schema ${o.schema}, ${o.boardColumns} board columns, ${o.vocab} cards${members(o) > 1 ? `, an ensemble of ${members(o)}` : ''}${o.explain === true ? ', explains' : ''}`);
              starting = null;
              done(true);
            } else {
              fail(o && typeof o.error === 'string' ? o.error : 'the evaluator said something else than ready');
              starting = null;
              done(false);
            }
            continue;
          }
          const w = o && pending.get(o.id);
          if (!w) continue;
          pending.delete(o.id);
          clearTimeout(w.timer);
          const ms = Date.now() - w.t0;
          if (o.ok === true && typeof o.p === 'number' && o.p >= 0 && o.p <= 1) {
            const body = { ok: true, p: o.p, n: members(info), model: info.model, schema: info.schema, turn: o.turn, decision: o.decision === true, featureHash: o.featureHash, ms };
            if (typeof o.sd === 'number' && Number.isFinite(o.sd) && o.sd >= 0) body.sd = o.sd;
            if (o.explain && typeof o.explain === 'object' && Array.isArray(o.explain.buckets)) body.explain = o.explain;
            w.resolve({ status: 200, body });
          } else {
            const status = o.status === 400 ? 400 : 500;
            w.resolve({ status, body: { ok: false, type: 'error', message: typeof o.error === 'string' ? o.error.slice(0, 400) : 'the evaluator failed' } });
          }
        }
      });
      c.on('error', (e) => {
        clearTimeout(readyTimer);
        if (c !== child) return;
        child = null;
        fail(e.code === 'ENOENT' ? `${python} not found (install Python 3 with numpy, or pass --eval-python)` : `the evaluator failed: ${e.message}`);
        starting = null;
        done(false);
      });
      c.on('close', (code, signal) => {
        clearTimeout(readyTimer);
        if (c !== child) return;
        child = null;
        if (state === 'failed') return;
        const said = stderr.trim().split('\n').filter(Boolean).slice(-1)[0];
        crashed = ready;
        fail(`the evaluator exited (${signal ?? `status ${code}`})${said ? `: ${said.slice(0, 240)}` : ''}`);
        if (!ready) { starting = null; done(false); }
      });
    });
    return starting;
  }

  return {
    start,
    available: () => state === 'ready',
    health() {
      if (state === 'ready') return { eval: 1, evalModel: info.model, evalSchema: info.schema, evalEnsemble: members(info), evalExplain: info.explain === true ? 1 : 0 };
      return state === 'off' ? { eval: 0 } : { eval: 0, evalError: state === 'loading' ? 'loading the model' : error };
    },
    describe() {
      if (state === 'off') return `/eval off (${error})`;
      if (state === 'ready') return `/eval on: model ${info.model}, schema ${info.schema}${members(info) > 1 ? `, ${members(info)} models (mean and sd)` : ''}${info.explain === true ? ', explain on' : ''}`;
      return `/eval ${state}${error ? `: ${error}` : ''}`;
    },
    async post(q) {
      if (state === 'off') return { status: 503, body: { ok: false, type: 'error', message: `the win chance is off here: ${error}` } };
      const { req, problem } = validateEval(q);
      if (!req) return { status: 400, body: { ok: false, type: 'error', message: problem } };
      if (state === 'failed' && crashed && !child && restarts < MAX_RESTARTS) {
        restarts++;
        crashed = false;
        log(`EVAL restarting the evaluator (${restarts}/${MAX_RESTARTS}) after: ${error}`);
        await start();
      }
      if (state !== 'ready' || !child) return unavailable();
      if (pending.size >= MAX_WAITING) return { status: 429, body: { ok: false, type: 'error', message: 'too many win-chance questions waiting' } };
      const id = nextId++;
      return new Promise((resolveP) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          resolveP({ status: 504, body: { ok: false, type: 'error', message: `the evaluator did not answer within ${Math.round(requestTimeoutMs / 1000)} s` } });
        }, requestTimeoutMs);
        pending.set(id, { resolve: resolveP, timer, t0: Date.now() });
        child.stdin.write(JSON.stringify({ id, ...req }) + '\n');
      });
    },
    close() {
      const c = child;
      child = null;
      state = model ? 'failed' : 'off';
      for (const [, w] of pending) { clearTimeout(w.timer); w.resolve(unavailable()); }
      pending.clear();
      if (c) { try { c.kill('SIGTERM'); } catch { /* gone */ } }
    },
  };
}
