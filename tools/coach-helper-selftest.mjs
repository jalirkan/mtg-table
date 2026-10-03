#!/usr/bin/env node
// mtg-table — tools/coach-helper-selftest.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// tools/coach-helper.mjs's self-test (D292), against a FAKE `claude`: a small
// Node script written to var/coach-helper-selftest/bin/claude and put first on
// the helper's PATH, which answers --version and --help, records how it was
// called (argv, stdin, working directory) and plays canned stream-json chosen by
// a `MODE:<name>` word in the user text -- an answer, an answer with no partial
// messages, a logged-out CLI, a usage limit, an old CLI that does not know a
// flag, and a slow stream that never ends (with a grandchild in its process
// group).  It never runs the real CLI and needs no network and no engine.
//
// What it holds: /health (ok, claude missing, `claude --version` failing); the
// stream translated to the contract's NDJSON with exactly one terminal line; the
// flags (every tool off, no MCP, no session, dontAsk, one turn, never
// --dangerously-skip-permissions), the user text on stdin and not argv, an empty
// temp working directory removed afterwards, a big system prompt by file; the
// Origin rules and the private-network preflight; the body limit; one question
// at a time with the rest queued (D325: the queued and running lines, positions,
// a full queue's 429, superseding by key, a queued client leaving, /health's
// queue, --queue-max 0); a client that disconnects kills the child and
// its grandchild; and in --lan mode, from this machine's non-loopback address,
// the token rule (query or header, loopback exempt), the LAN page's origin, and
// no Origin refused off loopback.  The LAN half is skipped, and says so, on a
// machine with no non-loopback IPv4 address.
//
//   node tools/coach-helper-selftest.mjs      # exit 0 iff every check passes; ~5 s
//
// Run from the repo root (hard rule 9).  Gate step 12f; CI's redaction job.

import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { networkInterfaces } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';

const DIR = resolve('var/coach-helper-selftest');
const BIN = join(DIR, 'bin');
const CALLS = join(DIR, 'calls');
const NODE_ONLY = join(DIR, 'node-only');   // a PATH with node and no claude
rmSync(DIR, { recursive: true, force: true });
for (const d of [BIN, CALLS, NODE_ONLY]) mkdirSync(d, { recursive: true });
symlinkSync(process.execPath, join(NODE_ONLY, 'node'));

// --- the fake claude --------------------------------------------------------
const FAKE = String.raw`#!/usr/bin/env node
// A fake claude for tools/coach-helper-selftest.mjs.  Not the real CLI.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const argv = process.argv.slice(2);
if (argv[0] === '--version') {
  if (process.env.FAKE_CLAUDE_VERSION_FAIL) { process.stderr.write('fake: version broke\n'); process.exit(3); }
  process.stdout.write('9.9.9 (Claude Code)\n'); process.exit(0);
}
if (argv[0] === '--help') { process.stdout.write('  --safe-mode   x\n  --disable-slash-commands   y\n'); process.exit(0); }
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { input += d; }).on('end', () => go(input));
const out = (o) => process.stdout.write(JSON.stringify(o) + '\n');
const ev = (event) => out({ type: 'stream_event', event, session_id: 's', parent_tool_use_id: null });
function go(user) {
  const mode = (/MODE:(\w+)/.exec(user) || [])[1] || 'ok';
  const sp = argv.indexOf('--system-prompt-file');
  fs.writeFileSync(path.join(process.env.FAKE_CLAUDE_CALLS, 'call-' + process.pid + '.json'), JSON.stringify({
    argv, stdin: user, cwd: process.cwd(), cwdEntries: fs.readdirSync(process.cwd()), pid: process.pid,
    systemFile: sp >= 0 ? fs.readFileSync(argv[sp + 1], 'utf8').length : null,
  }));
  out({ type: 'system', subtype: 'init', model: 'claude-fake-1', tools: [] });
  if (mode === 'ok' || mode === 'slowfinish') {
    const rest = () => {
      ev({ type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } });
      ev({ type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: '' } });
      ev({ type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'weighing it' } });
      ev({ type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'Hello' } });
      ev({ type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: ' world' } });
      out({ type: 'assistant', message: { model: 'claude-fake-1', content: [{ type: 'text', text: 'Hello world' }] } });
      ev({ type: 'message_delta', delta: { stop_reason: 'end_turn' } });
      ev({ type: 'message_stop' });
      out({ type: 'result', subtype: 'success', is_error: false, stop_reason: 'end_turn', result: 'Hello world' });
    };
    ev({ type: 'message_start', message: { model: 'claude-fake-1', content: [] } });
    if (mode === 'slowfinish') setTimeout(rest, 700); else rest();
  } else if (mode === 'nopartial') {
    out({ type: 'result', subtype: 'success', is_error: false, stop_reason: 'end_turn', result: 'Plain answer', modelUsage: { 'claude-fake-2': {} } });
  } else if (mode === 'auth') {
    out({ type: 'assistant', error: 'authentication_failed', is_api_error_message: true,
      message: { model: '<synthetic>', content: [{ type: 'text', text: 'Not logged in · Please run /login' }] } });
    out({ type: 'result', subtype: 'success', is_error: true, api_error_status: 401, result: 'Not logged in · Please run /login' });
    process.exitCode = 1;
  } else if (mode === 'ratelimit') {
    out({ type: 'assistant', error: 'rate_limit', is_api_error_message: true,
      message: { model: '<synthetic>', content: [{ type: 'text', text: "You've hit your usage limit · resets 5pm" }] } });
    out({ type: 'result', subtype: 'success', is_error: true, api_error_status: 429, result: "You've hit your usage limit · resets 5pm" });
    process.exitCode = 1;
  } else if (mode === 'oldcli') {
    process.stderr.write("error: unknown option '--tools'\n");
    process.exit(1);
  } else if (mode === 'slow') {
    const g = cp.spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    fs.writeFileSync(path.join(process.env.FAKE_CLAUDE_CALLS, 'slow-pids.json'), JSON.stringify([process.pid, g.pid]));
    ev({ type: 'message_start', message: { model: 'claude-fake-1', content: [] } });
    ev({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'thinking about it' } });
    setInterval(() => {}, 1000);
  }
}
`;
writeFileSync(join(BIN, 'claude'), FAKE);
chmodSync(join(BIN, 'claude'), 0o755);
// `#!/usr/bin/env node` needs node on PATH: the fake's PATH puts it first and
// adds node's own directory (which may hold the REAL claude, so it comes after).
const FAKE_PATH = [BIN, dirname(process.execPath), '/usr/bin', '/bin'].join(delimiter);

// --- harness -----------------------------------------------------------------
let failed = 0;
let passed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log(`  ok    ${name}`); } else { failed++; console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const helpers = [];

async function startHelper(args, env = {}) {
  const p = spawn(process.execPath, ['tools/coach-helper.mjs', '--port', '0', ...args], {
    env: { ...process.env, PATH: FAKE_PATH, FAKE_CLAUDE_CALLS: CALLS, MTG_TABLE_CONFIG: join(DIR, 'config.json'), ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  helpers.push(p);
  let log = '';
  p.stdout.on('data', (d) => { log += d; });
  p.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 100; i++) {
    const m = /COACH LISTENING http:\/\/127\.0\.0\.1:(\d+)/.exec(log);
    if (m) return { port: Number(m[1]), proc: p, log: () => log };
    if (p.exitCode !== null) break;
    await sleep(50);
  }
  throw new Error(`the helper did not start: ${log}`);
}

/** One HTTP exchange; resolves with status, headers and the whole body. */
function http({ host = '127.0.0.1', port, method = 'GET', path = '/health', headers = {}, body, localAddress }) {
  return new Promise((res, rej) => {
    const r = request({ host, port, method, path, headers, localAddress }, (resp) => {
      let b = '';
      resp.setEncoding('utf8');
      resp.on('data', (d) => { b += d; });
      resp.on('end', () => res({ status: resp.statusCode, headers: resp.headers, body: b }));
    });
    r.on('error', rej);
    if (body !== undefined) r.write(body);
    r.end();
  });
}
const json = (s) => { try { return JSON.parse(s); } catch { return null; } };
const lines = (s) => s.split('\n').filter(Boolean).map((l) => json(l));
const coach = (port, q, headers = {}) => http({ port, method: 'POST', path: '/coach', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(q) });
const lastCall = () => {
  const f = readdirSync(CALLS).filter((n) => n.startsWith('call-')).map((n) => json(readFileSync(join(CALLS, n), 'utf8')));
  rmSync(CALLS, { recursive: true, force: true });
  mkdirSync(CALLS, { recursive: true });
  return f[f.length - 1];
};
/** A /coach request read line by line as it streams: evs(), until(pred), done, destroy(). */
function stream(port, q) {
  const evs = [];
  let status = null;
  let waiters = [];
  const kick = () => { waiters = waiters.filter((w) => !(w.pred(evs) && (w.res(), true))); };
  const req = request({ host: '127.0.0.1', port, method: 'POST', path: '/coach', headers: { 'Content-Type': 'application/json' } });
  const done = new Promise((resDone) => {
    req.on('response', (resp) => {
      status = resp.statusCode;
      resp.setEncoding('utf8');
      let b = '';
      resp.on('data', (d) => {
        b += d;
        let i;
        while ((i = b.indexOf('\n')) >= 0) { evs.push(json(b.slice(0, i))); b = b.slice(i + 1); }
        kick();
      });
      resp.on('end', resDone);
      resp.on('error', resDone);
      resp.on('close', resDone);
    });
    req.on('error', resDone);
  });
  req.end(JSON.stringify(q));
  return {
    evs: () => evs,
    status: () => status,
    done,
    destroy: () => req.destroy(),
    until: (pred, ms = 3000) => new Promise((res, rej) => {
      if (pred(evs)) { res(); return; }
      waiters.push({ pred, res });
      setTimeout(() => rej(new Error(`timed out waiting; got ${JSON.stringify(evs)}`)), ms).unref();
    }),
  };
}
const terminalCount = (evs) => evs.filter((e) => e && (e.type === 'done' || e.type === 'error')).length;
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

writeFileSync(join(DIR, 'config.json'), JSON.stringify({
  coachPort: 8643, wsPort: 8642,
  wsAllowedOrigins: ['http://127.0.0.1:*', 'http://localhost:*', 'https://jalirkan.github.io'],
}));

try {
  // ------------------------------------------------------------- health
  console.log('== /health');
  const h = await startHelper(['--queue-max', '2']);
  const P = h.port;
  let r = await http({ port: P });
  check('ok with the CLI there', r.status === 200 && json(r.body)?.ok === true && json(r.body)?.helper === 1
    && json(r.body)?.claude === '9.9.9 (Claude Code)' && JSON.stringify(json(r.body)?.models) === '["opus","sonnet","haiku"]', r.body);

  const hMissing = await startHelper([], { PATH: NODE_ONLY });
  r = await http({ port: hMissing.port });
  check('ok:false when claude is not on PATH', r.status === 200 && json(r.body)?.ok === false && /not installed or not on PATH/.test(json(r.body)?.error ?? ''), r.body);
  r = await coach(hMissing.port, { system: 's', user: 'u' });
  check('/coach without the CLI: one error line', r.status === 200 && terminalCount(lines(r.body)) === 1 && lines(r.body)[0]?.type === 'error', r.body);

  const hBroken = await startHelper([], { FAKE_CLAUDE_VERSION_FAIL: '1' });
  r = await http({ port: hBroken.port });
  check('ok:false when claude --version fails', r.status === 200 && json(r.body)?.ok === false && /--version` failed/.test(json(r.body)?.error ?? ''), r.body);

  // ------------------------------------------------------------- streaming
  console.log('== /coach, the stream');
  r = await coach(P, { system: 'You are a coach.', user: 'What now? MODE:ok', model: 'haiku' });
  let evs = lines(r.body);
  check('200 application/x-ndjson', r.status === 200 && r.headers['content-type'] === 'application/x-ndjson', `${r.status} ${r.headers['content-type']}`);
  check('thinking, two text deltas, then done', JSON.stringify(evs) === JSON.stringify([
    { type: 'thinking', text: 'weighing it' }, { type: 'text', text: 'Hello' }, { type: 'text', text: ' world' },
    { type: 'done', stopReason: 'end_turn', model: 'claude-fake-1' }]), r.body);
  let c = lastCall();
  const flag = (f) => c.argv.indexOf(f);
  check('-p, stream-json, partial messages, verbose', flag('-p') === 0 && c.argv[flag('--output-format') + 1] === 'stream-json'
    && flag('--include-partial-messages') > 0 && flag('--verbose') > 0, c.argv.join(' '));
  check('--model haiku and --system-prompt <system>', c.argv[flag('--model') + 1] === 'haiku' && c.argv[flag('--system-prompt') + 1] === 'You are a coach.');
  check('every tool off: --tools ""', c.argv[flag('--tools') + 1] === '');
  check('no MCP, no session, dontAsk, one turn', flag('--strict-mcp-config') > 0 && flag('--no-session-persistence') > 0
    && c.argv[flag('--permission-mode') + 1] === 'dontAsk' && c.argv[flag('--max-turns') + 1] === '1');
  check('--safe-mode and --disable-slash-commands when --help has them', flag('--safe-mode') > 0 && flag('--disable-slash-commands') > 0);
  check('never --dangerously-skip-permissions', !c.argv.some((a) => /dangerously|bypass/i.test(a)));
  check('the user text on stdin, not argv', c.stdin === 'What now? MODE:ok' && !c.argv.some((a) => a.includes('What now?')));
  for (let i = 0; i < 40 && existsSync(c.cwd); i++) await sleep(50);   // removed when the child has exited
  check('an empty temp working directory, removed afterwards', c.cwdEntries.length === 0 && /forgecoach-coach-/.test(c.cwd) && !existsSync(c.cwd), `${c.cwd} ${c.cwdEntries}`);

  r = await coach(P, { system: 'x'.repeat(150 * 1024), user: 'MODE:ok' });
  c = lastCall();
  check('a system prompt over 100 KB goes by --system-prompt-file', c.systemFile === 150 * 1024 && !c.argv.includes('--system-prompt') && terminalCount(lines(r.body)) === 1);

  r = await coach(P, { system: 's', user: 'MODE:ok' });
  c = lastCall();
  check('the model defaults to sonnet', c.argv[c.argv.indexOf('--model') + 1] === 'sonnet');

  r = await coach(P, { system: 's', user: 'MODE:nopartial' });
  check('no partial messages: the result text, then done', JSON.stringify(lines(r.body)) === JSON.stringify([
    { type: 'text', text: 'Plain answer' }, { type: 'done', stopReason: 'end_turn', model: 'claude-fake-1' }]), r.body);

  r = await coach(P, { system: 's', user: 'MODE:auth' });
  evs = lines(r.body);
  check('logged out: exactly one error line, in plain words', evs.length === 1 && evs[0].type === 'error'
    && evs[0].message === 'not logged in — run `claude` once in a terminal to log in', r.body);
  r = await coach(P, { system: 's', user: 'MODE:ratelimit' });
  evs = lines(r.body);
  check('usage limit: one error line naming it', evs.length === 1 && evs[0].type === 'error' && /usage limit/.test(evs[0].message) && /resets 5pm/.test(evs[0].message), r.body);
  r = await coach(P, { system: 's', user: 'MODE:oldcli' });
  evs = lines(r.body);
  check('an old CLI: one error line saying update', evs.length === 1 && evs[0].type === 'error' && /update Claude Code/.test(evs[0].message), r.body);

  // ------------------------------------------------------------- requests
  console.log('== /coach, the request');
  r = await http({ port: P, method: 'POST', path: '/coach', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: 's', user: 'x'.repeat(600 * 1024) }) });
  check('over 512 KB: 413', r.status === 413 && json(r.body)?.type === 'error', `${r.status}`);
  r = await http({ port: P, method: 'POST', path: '/coach', body: '{nope' });
  check('not JSON: 400', r.status === 400);
  r = await coach(P, { system: 's', user: 'u', model: 'gpt' });
  check('an unknown model: 400', r.status === 400 && /opus, sonnet, haiku/.test(json(r.body)?.message ?? ''));
  r = await coach(P, { system: 's' });
  check('no user text: 400', r.status === 400);
  r = await http({ port: P, path: '/coach' });
  check('GET /coach: 405', r.status === 405);
  r = await http({ port: P, path: '/nope' });
  check('another path: 404', r.status === 404);

  // ------------------------------------------------------------- origins
  console.log('== Origin and CORS');
  r = await http({ port: P, headers: { Origin: 'https://jalirkan.github.io' } });
  check('ForgeCoach on github.io: allowed and echoed', r.status === 200 && r.headers['access-control-allow-origin'] === 'https://jalirkan.github.io' && /Origin/.test(r.headers.vary ?? ''));
  r = await http({ port: P, headers: { Origin: 'http://localhost:5173' } });
  check('http://localhost:5173 (a :* entry): allowed', r.status === 200 && r.headers['access-control-allow-origin'] === 'http://localhost:5173');
  r = await http({ port: P, headers: { Origin: 'https://evil.example' } });
  check('another site: 403, no CORS header', r.status === 403 && !r.headers['access-control-allow-origin']);
  r = await http({ port: P, headers: { Origin: 'null' } });
  check('Origin "null": 403', r.status === 403);
  r = await http({ port: P, headers: { Origin: 'https://jalirkan.github.io.evil.example' } });
  check('a look-alike of an entry: 403', r.status === 403);
  lastCall();   // empties the call log
  r = await coach(P, { system: 's', user: 'MODE:ok' }, { Origin: 'https://evil.example' });
  check('another site may not POST /coach (no child started)', r.status === 403 && readdirSync(CALLS).length === 0);
  r = await http({ port: P });
  check('no Origin from loopback (curl, Node): allowed', r.status === 200);
  r = await http({ port: P, method: 'OPTIONS', path: '/coach', headers: {
    Origin: 'https://jalirkan.github.io', 'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type,x-forgecoach-token', 'Access-Control-Request-Private-Network': 'true' } });
  check('preflight: 204 with methods, headers and private network', r.status === 204
    && r.headers['access-control-allow-origin'] === 'https://jalirkan.github.io'
    && r.headers['access-control-allow-methods'] === 'GET, POST, OPTIONS'
    && r.headers['access-control-allow-headers'] === 'Content-Type, X-ForgeCoach-Token'
    && r.headers['access-control-allow-private-network'] === 'true', JSON.stringify(r.headers));
  r = await http({ port: P, method: 'OPTIONS', path: '/coach', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } });
  check('preflight from another site: 403', r.status === 403 && !r.headers['access-control-allow-private-network']);

  // ------------------------------------------------------------- one at a time, the queue (D325), disconnect
  console.log('== one question at a time; the queue; superseding; a client that leaves');
  lastCall();
  const slow = stream(P, { system: 's', user: 'MODE:slow' });
  await slow.until((evs) => evs.length >= 1);
  check('a slow stream arrives as it is written', slow.evs()[0]?.text === 'thinking about it', JSON.stringify(slow.evs()));
  const pids = json(readFileSync(join(CALLS, 'slow-pids.json'), 'utf8'));
  check('the child and its grandchild are running', pids.every(alive));
  const q1 = stream(P, { system: 's', user: 'MODE:ok q1' });
  await q1.until((evs) => evs.length >= 1);
  check('a second question is queued: 200, then {"type":"queued","position":1}', q1.status() === 200 && JSON.stringify(q1.evs()) === '[{"type":"queued","position":1}]', JSON.stringify(q1.evs()));
  const q2 = stream(P, { system: 's', user: 'MODE:ok q2', supersedes: 'tab-1' });
  await q2.until((evs) => evs.length >= 1);
  check('a third: position 2', JSON.stringify(q2.evs()) === '[{"type":"queued","position":2}]', JSON.stringify(q2.evs()));
  r = await http({ port: P });
  check('/health: concurrency 1, the queue, running, supersedes', json(r.body)?.concurrency === 1 && json(r.body)?.queue?.max === 2
    && json(r.body)?.queue?.length === 2 && json(r.body)?.running === 1 && json(r.body)?.supersedes === 1, r.body);
  r = await coach(P, { system: 's', user: 'MODE:ok' });
  check('past --queue-max: 429 with Retry-After', r.status === 429 && json(r.body)?.type === 'error' && r.headers['retry-after'] === '2', `${r.status} ${r.body}`);
  r = await coach(P, { system: 's', user: 'MODE:ok', supersedes: 7 });
  check('"supersedes" that is not a string: 400', r.status === 400, `${r.status} ${r.body}`);
  const q3 = stream(P, { system: 's', user: 'MODE:ok q3', supersedes: 'tab-1' });
  await q2.done;
  await q3.until((evs) => evs.length >= 1);
  check('the same key supersedes the queued one: one terminal error, code "superseded"', terminalCount(q2.evs()) === 1
    && JSON.stringify(q2.evs().at(-1)) === '{"type":"error","code":"superseded","message":"superseded by a newer question"}', JSON.stringify(q2.evs()));
  check('the newcomer takes the back of the queue', JSON.stringify(q3.evs()) === '[{"type":"queued","position":2}]', JSON.stringify(q3.evs()));
  q1.destroy();
  await q3.until((evs) => evs.length >= 2);
  check('a queued client that leaves is dropped; the one behind moves up', JSON.stringify(q3.evs()[1]) === '{"type":"queued","position":1}', JSON.stringify(q3.evs()));
  check('the running question is never superseded', pids.every(alive) && slow.evs().length === 1);
  slow.destroy();
  let gone = false;
  for (let i = 0; i < 60 && !gone; i++) { await sleep(50); gone = !pids.some(alive); }
  check('the client left: the child AND its grandchild are killed', gone, pids.filter(alive).join(' '));
  await q3.done;
  check('the queued question then runs: running, the stream, done', JSON.stringify(q3.evs().slice(2)) === JSON.stringify([
    { type: 'running' }, { type: 'thinking', text: 'weighing it' }, { type: 'text', text: 'Hello' }, { type: 'text', text: ' world' },
    { type: 'done', stopReason: 'end_turn', model: 'claude-fake-1' }]) && terminalCount(q3.evs()) === 1, JSON.stringify(q3.evs()));
  const ran = readdirSync(CALLS).filter((n) => n.startsWith('call-')).map((n) => json(readFileSync(join(CALLS, n), 'utf8')).stdin);
  check('neither the dropped nor the superseded question ever ran claude', ran.includes('MODE:ok q3') && !ran.includes('MODE:ok q1') && !ran.includes('MODE:ok q2'), ran.join(' | '));
  check('the helper logged the cancel and the drops', /cancelled: the client left/.test(h.log()) && /client left while queued/.test(h.log()) && /superseded while queued/.test(h.log()));
  r = await http({ port: P });
  check('/health: the queue is empty again', json(r.body)?.queue?.length === 0 && json(r.body)?.running === 0, r.body);

  const h0 = await startHelper(['--queue-max', '0', '--busy-wait', '400']);
  const s1 = coach(h0.port, { system: 's', user: 'MODE:slowfinish' });
  await sleep(150);
  r = await coach(h0.port, { system: 's', user: 'MODE:ok' });
  const r1 = await s1;
  check('--queue-max 0: no queue, a second question is 429 at once (and the old --busy-wait is still accepted)', r.status === 429 && lines(r1.body).at(-1)?.type === 'done');
  check('the token never appears in a log line', !/token=/.test(h.log()));

  // ------------------------------------------------------------- LAN
  console.log('== --lan: the token and the LAN page');
  const ip = Object.values(networkInterfaces()).flat().find((a) => a && a.family === 'IPv4' && !a.internal)?.address;
  const TOKEN = 'selftestTokenAbcdefghij0123';
  check('--lan refuses to start without a token', await new Promise((res) => {
    const p = spawn(process.execPath, ['tools/coach-helper.mjs', '--port', '0', '--lan'], { env: { ...process.env, COACH_HELPER_TOKEN: '', MTG_TABLE_CONFIG: join(DIR, 'config.json') }, stdio: 'ignore' });
    p.on('exit', (code) => res(code === 2));
  }));
  if (!ip) {
    console.log('  SKIP  the LAN half: this machine has no non-loopback IPv4 address');
  } else {
    const L = await startHelper(['--lan', '--ws-port', '8642'], { COACH_HELPER_TOKEN: TOKEN });
    const LP = L.port;
    const far = (o) => http({ host: ip, port: LP, localAddress: ip, ...o });
    r = await far({ headers: { Origin: `http://${ip}:8642` } });
    check(`from ${ip} with no token: 403`, r.status === 403 && /token/.test(json(r.body)?.message ?? ''));
    r = await far({ path: '/health?token=wrong-token-0123456789', headers: { Origin: `http://${ip}:8642` } });
    check('a wrong token: 403', r.status === 403);
    r = await far({ path: `/health?token=${TOKEN}`, headers: { Origin: `http://${ip}:8642` } });
    check('?token= and the LAN page (http://<host>:<wsPort>): 200, echoed', r.status === 200 && r.headers['access-control-allow-origin'] === `http://${ip}:8642`);
    r = await far({ headers: { Origin: `http://${ip}:8642`, 'X-ForgeCoach-Token': TOKEN } });
    check('the X-ForgeCoach-Token header: 200', r.status === 200);
    r = await far({ path: `/health?token=${TOKEN}`, headers: { Origin: `http://${ip}:${LP}` } });
    check('http://<Host> itself (M51 verbatim): 200', r.status === 200);
    r = await far({ path: `/health?token=${TOKEN}`, headers: { Origin: 'http://192.0.2.77:8642' } });
    check('another host on the ws port: 403', r.status === 403);
    r = await far({ path: `/health?token=${TOKEN}` });
    check('no Origin from another machine, even with the token: 403', r.status === 403);
    r = await far({ path: `/health?token=${TOKEN}`, headers: { Origin: 'https://jalirkan.github.io' } });
    check('github.io from another machine with the token: 200', r.status === 200);
    r = await far({ method: 'OPTIONS', path: '/coach', headers: { Origin: `http://${ip}:8642`, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Private-Network': 'true' } });
    check('a preflight needs no token, only the origin', r.status === 204 && r.headers['access-control-allow-private-network'] === 'true');
    r = await far({ method: 'POST', path: `/coach?token=${TOKEN}`, headers: { Origin: `http://${ip}:8642`, 'Content-Type': 'application/json' }, body: JSON.stringify({ system: 's', user: 'MODE:ok' }) });
    check('a phone\'s whole question: streamed, done', r.status === 200 && lines(r.body).at(-1)?.type === 'done');
    r = await http({ port: LP, headers: { Origin: 'https://jalirkan.github.io' } });
    check('loopback needs no token', r.status === 200);
    r = await http({ port: LP, headers: { Origin: `http://${ip}:8642`, Host: `${ip}:${LP}` } });
    check('the LAN page origin from loopback (a rebinding name): 403', r.status === 403);
    check('the token is never logged', !L.log().includes(TOKEN) && !/token=/.test(L.log()));
  }
} catch (e) {
  failed++;
  console.log(`  FAIL  the self-test threw: ${e.stack}`);
} finally {
  for (const p of helpers) p.kill('SIGTERM');
}

console.log(failed === 0 ? `coach-helper-selftest OK (${passed} checks)` : `coach-helper-selftest FAILED (${failed} of ${passed + failed})`);
process.exit(failed === 0 ? 0 : 1);
