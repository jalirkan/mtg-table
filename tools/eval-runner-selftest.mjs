#!/usr/bin/env node
// mtg-table — tools/eval-runner-selftest.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The win chance's self-test (D361): tools/eval-runner.mjs and the coach
// helper's /eval route.
//
// Part 1, always: against a FAKE tools/ml/eval_serve.py (a small Node script
// that speaks its JSON-lines protocol; a model file's name picks its behaviour):
// the request's validation (no field but seat, state, history); /health's
// "eval" only once the model is ready, with its sha and schema; a refused model
// (eval 0 with the reason, POST 503); a process that never says ready (timeout);
// one that dies (503, then one restart); one that never answers (504); the
// route (POST, 405, 413 past 2 MB, Origin refused, --no-eval 503).
//
// Part 2, when this python3 has numpy: the REAL eval_serve.py with
// fixtures/eval/model.json (the parity fixture the Java evaluator is held to)
// through the helper's /eval, over two committed recordings: every decision row
// sent as a client sends it (the state and the reduced history, built here as
// ForgeCoach's src/winChance.ts builds it) must come back with the golden
// feature hash and P(win) to 1e-9; a tampered schema id and --eval-schema with
// another id must both leave "eval": 0.
//
//   node tools/eval-runner-selftest.mjs        # exit 0 iff every check passes; a few seconds
//
// Run from the repo root (hard rule 9).  Gate step 12f; CI.  Its files go under
// var/eval-runner-selftest/.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { join, resolve } from 'node:path';
import { createEvalRunner, validateEval, MAX_EVAL_BODY, resolveEvalModel, labRoot, DEFAULT_EVAL_MODEL, DEFAULT_EVAL_ENSEMBLE } from './eval-runner.mjs';
import { startHelper } from './coach-helper.mjs';

const REL = 'var/eval-runner-selftest';
const DIR = resolve(REL);
const ROOT = resolve('.');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });

let checks = 0;
let failures = 0;
const check = (ok, what) => {
  checks++;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}`);
};

// --- the fake eval_serve.py ------------------------------------------------------
const FAKE = join(DIR, 'fake-serve.mjs');
writeFileSync(FAKE, `// A fake tools/ml/eval_serve.py for eval-runner-selftest.mjs.  Not the evaluator.
const model = process.argv[process.argv.indexOf('--model') + 1];
const kind = model.split('/').pop().replace('.json', '');
const say = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
if (kind === 'refused') { say({ ready: false, error: 'the model reads live-unsafe features' }); process.exit(2); }
if (kind === 'never') { setInterval(() => {}, 1000); }
else {
  const ens = kind === 'ens';
  say({ ready: true, model: 'abcdef012345', schema: '0123456789abcdef', nFeatures: 10, boardColumns: 3, vocab: 4, ...(ens ? { n: 3, explain: true } : {}) });
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\\n')) >= 0) {
      const q = JSON.parse(buf.slice(0, i));
      buf = buf.slice(i + 1);
      if (kind === 'dies') process.exit(3);
      if (kind === 'mute') continue;
      if (q.state.players.length === 0) { say({ id: q.id, ok: false, status: 400, error: 'seat 0 is not a player of this state' }); continue; }
      if (!ens && 'explain' in q) { say({ id: q.id, ok: false, status: 500, error: 'an old evaluator was sent explain' }); continue; }
      const extra = ens ? { n: 3, sd: 0.04, ...(q.explain ? { explain: { method: 'x', baseline: { p: 0.5 }, buckets: [{ key: 'me.board', label: 'your board', pts: -9, logit: -0.4 }] } } : {}) } : {};
      say({ id: q.id, ok: true, p: 0.25 + 0.5 * q.seat, turn: q.state.turn ?? 0, decision: q.history.length > 0, featureHash: '00000000000000aa', ...extra });
    }
  });
}
`);
const fakeRunner = (kind, extra = {}) => createEvalRunner({
  repoRoot: ROOT, model: join(DIR, `${kind}.json`), python: process.execPath, script: FAKE,
  readyTimeoutMs: 1500, requestTimeoutMs: 800, ...extra,
});
const STATE = { turn: 3, players: [{ id: 0, zones: {} }, { id: 1, zones: {} }] };

// --- HTTP ----------------------------------------------------------------------
function http(port, method, path, body, headers = {}) {
  return new Promise((done) => {
    const data = body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body);
    const r = request({ host: '127.0.0.1', port, method, path, headers: { ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}), ...headers } }, (res) => {
      let s = '';
      res.setEncoding('utf8');
      res.on('data', (d) => { s += d; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(s); } catch { /* not JSON */ }
        done({ status: res.statusCode, json, headers: res.headers });
      });
    });
    r.on('error', (e) => done({ status: 0, json: null, error: e }));
    if (data) r.write(data);
    r.end();
  });
}
async function helper(evaluator) {
  const h = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins: ['http://127.0.0.1:*', 'https://jalirkan.github.io'], timeoutS: 5, evaluator, log: () => {} });
  const port = await h.listen();
  return { h, port };
}

// --- part 1 --------------------------------------------------------------------
console.log('eval-runner-selftest: part 1, a fake evaluator');

// D369: the model is looked up in this checkout, then in the lab clone the PC's jobs write to.
{
  const home = join(DIR, 'code', 'mtg-table'), lab = join(DIR, 'code', 'lab', 'mtg-table');
  mkdirSync(join(lab, 'var', 'ml', 'models'), { recursive: true });
  mkdirSync(join(home, 'var', 'ml', 'models'), { recursive: true });
  const env = {};
  check(labRoot(home, env) === lab, 'the lab clone is ../lab/mtg-table beside the checkout');
  check(labRoot(home, { MTGTABLE_LAB_ROOT: join(DIR, 'elsewhere') }) === join(DIR, 'elsewhere'), '$MTGTABLE_LAB_ROOT names another lab clone');
  check(resolveEvalModel(home, undefined, env) === null, 'no model in either place: none (eval off)');
  writeFileSync(join(lab, DEFAULT_EVAL_MODEL), '{}');
  check(resolveEvalModel(home, undefined, env) === join(lab, DEFAULT_EVAL_MODEL), 'the default model only in the lab clone: the lab clone\'s');
  writeFileSync(join(lab, 'var/ml/models/eval-abc.json'), '{}');
  check(resolveEvalModel(home, 'var/ml/models/eval-abc.json', env) === join(lab, 'var/ml/models/eval-abc.json'), 'a relative --eval-model only in the lab clone: the lab clone\'s');
  writeFileSync(join(home, DEFAULT_EVAL_MODEL), '{}');
  check(resolveEvalModel(home, undefined, env) === join(home, DEFAULT_EVAL_MODEL), 'in both places: this checkout\'s wins');
  check(resolveEvalModel(home, 'var/ml/models/missing.json', env) === join(home, 'var/ml/models/missing.json'), 'a flag that is nowhere stays as given (reported missing)');
  // D368: the ensemble default is looked for the same way, in both places before the single model.
  writeFileSync(join(lab, DEFAULT_EVAL_ENSEMBLE), '{}');
  check(resolveEvalModel(home, undefined, env) === join(lab, DEFAULT_EVAL_ENSEMBLE), 'D368: the ensemble manifest only in the lab clone: it wins over this checkout\'s single model');
  writeFileSync(join(home, DEFAULT_EVAL_ENSEMBLE), '{}');
  check(resolveEvalModel(home, undefined, env) === join(home, DEFAULT_EVAL_ENSEMBLE), 'D368: the ensemble in both places: this checkout\'s wins');
  check(resolveEvalModel(home, 'var/ml/models/eval-abc.json, var/ml/models/missing.json', env)
    === [join(lab, 'var/ml/models/eval-abc.json'), join(home, 'var/ml/models/missing.json')].join(','), 'D368: each path of a comma list is looked up on its own');
}

check(!validateEval(null).req && !validateEval([]).req, 'validate: a body that is not an object is refused');
check(/unknown field/.test(validateEval({ seat: 0, state: STATE, oppHand: [] }).problem ?? ''), 'validate: an unknown field (e.g. oppHand) is refused');
check(!validateEval({ seat: -1, state: STATE }).req && !validateEval({ seat: 0.5, state: STATE }).req && !validateEval({ seat: '0', state: STATE }).req, 'validate: seat must be a small whole number');
check(!validateEval({ seat: 0, state: {} }).req && !validateEval({ seat: 0, state: [] }).req, 'validate: state must carry players');
check(!validateEval({ seat: 0, state: STATE, history: {} }).req && !validateEval({ seat: 0, state: STATE, history: [{ events: 1 }] }).req
  && !validateEval({ seat: 0, state: STATE, history: [{ events: [], stack: 2 }] }).req, 'validate: history must be a list of {events, stack}');
check(validateEval({ seat: 0, state: STATE, explain: true }).req?.explain === true && !('explain' in validateEval({ seat: 0, state: STATE, explain: false }).req)
  && /explain/.test(validateEval({ seat: 0, state: STATE, explain: 1 }).problem ?? ''), 'validate (D368): explain is a boolean, passed on only when true');
check(validateEval({ seat: 1, state: STATE }).req?.history.length === 0 && !!validateEval({ seat: 0, state: STATE, history: [{ events: [], stack: null }] }).req, 'validate: history may be absent, and a stack null');

{
  const off = createEvalRunner({ repoRoot: ROOT, model: null });
  check(off.health().eval === 0 && !('evalError' in off.health()), 'no model: /health eval 0');
  check((await off.post({ seat: 0, state: STATE })).status === 503, 'no model: POST 503');
}
{
  const r = fakeRunner('ok');
  check(r.health().eval === 0, 'before start: eval 0');
  const p = r.start();
  check(r.health().eval === 0 && r.health().evalError === 'loading the model', 'while loading: eval 0, "loading the model"');
  check(await p === true, 'the fake model loads');
  const hl = r.health();
  check(hl.eval === 1 && hl.evalModel === 'abcdef012345' && hl.evalSchema === '0123456789abcdef', 'ready: eval 1 with the model sha and schema');
  check(hl.evalEnsemble === 1 && hl.evalExplain === 0, 'an evaluator that says nothing of n or explain: evalEnsemble 1, evalExplain 0');
  const a = await r.post({ seat: 1, state: STATE, history: [{ events: [{ kind: 'turn' }], stack: [] }] });
  check(a.status === 200 && a.body.ok === true && a.body.p === 0.75 && a.body.turn === 3 && a.body.decision === true
    && a.body.model === 'abcdef012345' && a.body.schema === '0123456789abcdef' && typeof a.body.ms === 'number', 'POST: the answer with p, turn, decision, model, schema, ms');
  check(a.body.n === 1 && !('sd' in a.body) && !('explain' in a.body), 'one model: n 1, no sd, no explain');
  const many = await Promise.all([0, 1, 0, 1].map((seat) => r.post({ seat, state: STATE })));
  check(many.map((x) => x.body.p).join() === '0.25,0.75,0.25,0.75', 'answers in flight together come back to their own requests');
  const bad = await r.post({ seat: 0, state: { players: [] } });
  check(bad.status === 400 && /not a player/.test(bad.body.message), "the evaluator's 400 is passed on");
  r.close();
}
{
  const r = fakeRunner('ens');
  await r.start();
  const hl = r.health();
  check(hl.evalEnsemble === 3 && hl.evalExplain === 1, 'D368: an ensemble that explains: evalEnsemble 3, evalExplain 1');
  const a = await r.post({ seat: 0, state: STATE });
  check(a.status === 200 && a.body.n === 3 && a.body.sd === 0.04 && !('explain' in a.body), 'D368: the answer carries n and sd');
  const e = await r.post({ seat: 0, state: STATE, explain: true });
  check(e.status === 200 && e.body.explain?.buckets?.[0]?.label === 'your board', 'D368: explain: true passes the attributions on');
  const { h, port } = await helper(r);
  const q = await http(port, 'POST', '/eval?explain=1', { seat: 0, state: STATE });
  check(q.status === 200 && Array.isArray(q.json.explain?.buckets), 'D368 route: ?explain=1 is explain: true');
  check((await http(port, 'POST', '/eval', { seat: 0, state: STATE, explain: 'yes' })).status === 400, 'D368 route: explain that is not a boolean is 400');
  h.close();
  r.close();
}
{
  const r = fakeRunner('refused');
  check(await r.start() === false, 'a refused model does not load');
  const hl = r.health();
  check(hl.eval === 0 && /live-unsafe/.test(hl.evalError), 'refused: eval 0 with the reason');
  check((await r.post({ seat: 0, state: STATE })).status === 503, 'refused: POST 503');
}
{
  const r = fakeRunner('never');
  check(await r.start() === false && /did not load within/.test(r.health().evalError), 'a process that never says ready: eval 0 after the timeout');
  r.close();
}
{
  const r = fakeRunner('dies');
  await r.start();
  const a = await r.post({ seat: 0, state: STATE });
  check(a.status === 503 && r.health().eval === 0 && /exited/.test(r.health().evalError), 'a process that dies mid-request: 503, eval 0');
  const b = await r.post({ seat: 0, state: STATE });
  check(b.status === 503 && /exited/.test(r.health().evalError), 'it is restarted once asked again (and here dies again)');
  r.close();
}
{
  const r = fakeRunner('mute');
  await r.start();
  const a = await r.post({ seat: 0, state: STATE });
  check(a.status === 504, 'no answer in time: 504');
  r.close();
}
{
  const r = fakeRunner('ok');
  await r.start();
  const { h, port } = await helper(r);
  const hl = await http(port, 'GET', '/health');
  check(hl.status === 200 && hl.json.eval === 1 && hl.json.evalModel === 'abcdef012345', 'route: /health carries eval 1');
  const a = await http(port, 'POST', '/eval', { seat: 0, state: STATE });
  check(a.status === 200 && a.json.p === 0.25, 'route: POST /eval answers');
  check((await http(port, 'GET', '/eval')).status === 405, 'route: GET /eval is 405');
  check((await http(port, 'POST', '/eval', '{nope')).status === 400, 'route: a body that is not JSON is 400');
  check((await http(port, 'POST', '/eval', { seat: 0, state: STATE, deck: 'x' })).status === 400, 'route: an unknown field is 400');
  const big = await http(port, 'POST', '/eval', JSON.stringify({ seat: 0, state: STATE, pad: 'x'.repeat(MAX_EVAL_BODY) }));
  check(big.status === 413, 'route: a body over 2 MB is 413');
  const cors = await http(port, 'POST', '/eval', { seat: 0, state: STATE }, { Origin: 'https://jalirkan.github.io' });
  check(cors.status === 200 && cors.headers['access-control-allow-origin'] === 'https://jalirkan.github.io', "route: ForgeCoach's origin is allowed (CORS)");
  check((await http(port, 'POST', '/eval', { seat: 0, state: STATE }, { Origin: 'https://evil.example' })).status === 403, 'route: another origin is 403');
  h.close();
  r.close();
}
{
  const { h, port } = await helper(null);
  check((await http(port, 'GET', '/health')).json?.eval === 0, '--no-eval: /health eval 0');
  check((await http(port, 'POST', '/eval', { seat: 0, state: STATE })).status === 503, '--no-eval: POST /eval 503');
  h.close();
}

// --- part 2 --------------------------------------------------------------------
let numpy = false;
try {
  execFileSync('python3', ['-c', 'import numpy'], { stdio: 'ignore' });
  numpy = true;
} catch { /* none */ }
if (!numpy) {
  console.log('eval-runner-selftest: part 2 skipped -- this python3 has no numpy (tools/ml/tests/test_eval_serve.py holds the same parity in Python)');
} else {
  console.log('eval-runner-selftest: part 2, the real eval_serve.py with fixtures/eval/model.json');
  const MODEL = join(ROOT, 'fixtures', 'eval', 'model.json');
  const golden = JSON.parse(readFileSync(join(ROOT, 'fixtures', 'eval', 'golden.json'), 'utf8'));
  const r = createEvalRunner({ repoRoot: ROOT, model: MODEL, python: 'python3', readyTimeoutMs: 60_000 });
  check(await r.start() === true && r.health().evalSchema === golden.schemaId, `the parity model loads, schema ${golden.schemaId}`);
  const { h, port } = await helper(r);

  // The client's request, as ForgeCoach builds it: s2c frames of the game read once
  // each (encode.py's read_games), the earlier state frames with a tally event as history.
  const TALLY = new Set(['turn', 'land', 'cast', 'mulligan']);
  const requestsOf = (file) => {
    const lines = readFileSync(join(ROOT, file), 'utf8').split('\n').filter((l) => l.trim());
    const header = JSON.parse(lines[0]);
    const seen = new Set();
    const history = [];
    const out = new Map();
    for (const l of lines.slice(1)) {
      let f;
      try { f = JSON.parse(l); } catch { continue; }
      if ((f.dir ?? 's2c') !== 's2c') continue;
      if (Number.isInteger(f.seq)) { if (seen.has(f.seq)) continue; seen.add(f.seq); }
      if (f.type !== 'state') continue;
      out.set(f.seq, { seat: header.seat, state: f.body, history: history.slice() });
      const ev = f.body.events ?? [];
      if (ev.some((e) => TALLY.has(e?.kind))) history.push({ events: ev, stack: f.body.stack ?? [] });
    }
    return out;
  };
  let n = 0;
  let bad = 0;
  for (const file of ['fixtures/games/g1.jsonl', 'fixtures/games/human-auto-42.jsonl']) {
    const lg = golden.logs.find((x) => x.file === file && x.game === 0);
    const reqs = requestsOf(file);
    for (const w of lg.rows) {
      const a = await http(port, 'POST', '/eval', reqs.get(w.seq));
      n++;
      if (a.status !== 200 || a.json.featureHash !== w.hash || Math.abs(a.json.p - w.p) > 1e-9 || a.json.decision !== true) {
        bad++;
        if (bad <= 3) console.log(`        ${file} seq ${w.seq}: ${JSON.stringify(a.json)} vs golden ${w.hash} ${w.p}`);
      }
    }
  }
  check(n > 100 && bad === 0, `${n} decision rows of two recordings through /eval: the golden feature hash and P(win) to 1e-9`);
  h.close();
  r.close();

  const tampered = join(DIR, 'tampered.json');
  const m = JSON.parse(readFileSync(MODEL, 'utf8'));
  m.schemaId = '0000000000000000';
  writeFileSync(tampered, JSON.stringify(m));
  const t = createEvalRunner({ repoRoot: ROOT, model: tampered, python: 'python3' });
  check(await t.start() === false && /encoder changed/.test(t.health().evalError), 'a model whose schema id is not the encoder\'s: eval 0, refused');
  const e = createEvalRunner({ repoRoot: ROOT, model: MODEL, python: 'python3', expectSchema: '82815752c2f5e346' });
  check(await e.start() === false && /not the expected/.test(e.health().evalError), '--eval-schema with another id: eval 0, refused');

  // D368: an ensemble of the parity model and two copies with another output layer.
  const paths = [MODEL];
  for (const [i, sc] of [[1, 1.3], [2, 0.7]]) {
    const v = JSON.parse(readFileSync(MODEL, 'utf8'));
    const last = v.layers[v.layers.length - 1];
    last.W = last.W.map((row) => (Array.isArray(row) ? row.map((w) => w * sc) : row * sc));
    last.b = last.b.map((b) => b + 0.1 * i);
    const p = join(DIR, `member-${i}.json`);
    writeFileSync(p, JSON.stringify(v));
    paths.push(p);
  }
  const en = createEvalRunner({ repoRoot: ROOT, model: paths.join(','), python: 'python3', readyTimeoutMs: 60_000 });
  check(await en.start() === true && en.health().evalEnsemble === 3 && en.health().evalExplain === 1, 'D368: three models of one schema load as an ensemble; /health says evalEnsemble 3, evalExplain 1');
  const one = createEvalRunner({ repoRoot: ROOT, model: MODEL, python: 'python3', readyTimeoutMs: 60_000 });
  await one.start();
  const reqs = requestsOf('fixtures/games/g1.jsonl');
  const lg = golden.logs.find((x) => x.file === 'fixtures/games/g1.jsonl' && x.game === 0);
  let worstSum = 0;
  let sdOk = true;
  let n2 = 0;
  for (const w of lg.rows.filter((_, i) => i % 10 === 0)) {
    const a = await en.post({ ...reqs.get(w.seq), explain: true });
    const s = await one.post({ ...reqs.get(w.seq), explain: true });
    n2++;
    if (a.status !== 200 || s.status !== 200 || a.body.n !== 3 || !(a.body.sd > 0) || s.body.n !== 1 || 'sd' in s.body
      || Math.abs(s.body.p - w.p) > 1e-9) sdOk = false;
    for (const b of [a.body, s.body]) {
      const sum = b.explain.buckets.reduce((t, x) => t + x.pts, 0);
      worstSum = Math.max(worstSum, Math.abs(sum - 100 * (b.p - b.explain.baseline.p)));
    }
  }
  check(n2 > 5 && sdOk, `D368: ${n2} rows: the ensemble answers n 3 and an sd; the single model still answers the golden P(win), n 1, no sd`);
  check(worstSum < 1e-6, `D368: the attributions' points sum to 100 (p - baseline) on every answer (worst ${worstSum.toExponential(1)})`);
  en.close();
  one.close();
}

rmSync(DIR, { recursive: true, force: true });
console.log(`eval-runner-selftest: ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
