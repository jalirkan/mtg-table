#!/usr/bin/env node
// mtg-table — tools/bug-reports-selftest.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Bug reports from the board (D411; gate step 12f, CI's redaction job).  It holds:
//
//   1. the pure pieces: what a report must be, the images checked against their own
//      magic numbers, secrets scrubbed (the presented token, keys, URL tokens, token
//      fields -- a card's `token: true` kept), the id's shape;
//   2. the store: a report and its images saved, the images out of the JSON, the
//      folder's caps (507), a folder outside var/ refused;
//   3. the coach helper's POST /bug: through its door as it is (a tunnel's headers,
//      a foreign Host refused), the body cap, the method, the rate limit, /health;
//   4. the room listener's POST /room/<id>/bug: a seat token always (none, wrong:
//      refused), the seat and the room recorded, the token scrubbed out of the
//      report, the per-seat limit, a listener with no store (404 off); a Funnel
//      visitor's headers are not refused there (that door is meant for the tunnel);
//   5. tools/bugs-sync.mjs against a local bare repository: the reports on the
//      branch under bugs/ (fewer frames, the thumbnail, INDEX.md), nothing twice,
//      .synced kept, pc-jobs and main refused, and the CLI end to end.
//
// Its files are under var/bug-reports-selftest/.  No network, no engine, no claude.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startHelper } from './coach-helper.mjs';
import { createRoomStore, startRoomServer } from './draft-room.mjs';
import { BUG_ID, MAX_BUG_BODY, checkBug, createBugStore, newBugId, scrubKeys, scrubText } from './bug-reports.mjs';
import { SYNC_FRAMES, SYNC_JSON, compactForSync, indexLine, mdLine, pending, pushReports } from './bugs-sync.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const VAR = join(ROOT, 'var', 'bug-reports-selftest');
const ORIGINS = ['http://127.0.0.1:*', 'http://localhost:*', 'https://jalirkan.github.io'];
let checks = 0;
let failed = 0;
const ok = (cond, what) => {
  checks++;
  if (cond) console.log(`  ok    ${what}`);
  else { failed++; console.log(`  FAIL  ${what}`); }
};
const eq = (a, b, what) => ok(JSON.stringify(a) === JSON.stringify(b), what + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` (got ${JSON.stringify(a)?.slice(0, 200)}, want ${JSON.stringify(b)?.slice(0, 200)})`));
const section = (s) => console.log(`\n== ${s}`);

rmSync(VAR, { recursive: true, force: true });
mkdirSync(VAR, { recursive: true });

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 7)]).toString('base64');
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(44, 9)]).toString('base64');
const SECRET = 'Zq3xV9kLm2Pw8RtY6uIo0a';   // shaped like a room token (22 base64url characters)
const frame = (n) => ({ type: 'state', seq: n, t: 1000 + n, body: { gameId: 'human-ws-7', turn: Math.ceil(n / 10), phase: 'MAIN1', players: [{ id: 0, hand: [{ id: n, name: 'Grizzly Bears', token: false }] }], filler: 'x'.repeat(2000) } });
const report = (over = {}) => ({
  kind: 'forgecoach-bug', schema: 1, title: '  The pass button  did nothing ', details: 'I pressed OK.\nNothing happened.', severity: 'major', surface: 'play',
  game: { gameId: 'human-ws-7', seat: 0, turn: 5, phase: 'MAIN1', priority: 0 },
  ask: null, log: { total: 300, from: 0, frames: Array.from({ length: 300 }, (_, i) => frame(i + 1)) },
  console: [{ t: 1, level: 'error', text: 'boom' }], client: { build: 'abc1234', skin: 'classic' },
  ...over,
});

// ---------------------------------------------------------------------------
section('1. the pure pieces');
{
  const c = checkBug(report({ screenshot: { mediaType: 'image/png', data: PNG, width: 800, height: 600, how: 'dom' }, thumbnail: { mediaType: 'image/jpeg', data: JPG, width: 400, height: 300 } }));
  ok(!c.problem, 'a good report passes');
  eq(c.report.title, 'The pass button did nothing', 'the title is one clean line');
  ok(c.shot?.ext === 'png' && c.thumb?.ext === 'jpg', 'the screenshot and the thumbnail are split out by type');
  ok(!('screenshot' in c.report) && !('thumbnail' in c.report), 'the images are out of the report');
  ok(checkBug(report({ kind: 'x' })).problem, 'another kind is refused');
  ok(checkBug(report({ schema: 2 })).problem, 'another schema is refused');
  ok(checkBug(report({ title: '   ' })).problem, 'an empty title is refused');
  ok(checkBug(report({ severity: 'urgent' })).problem, 'an unknown severity is refused');
  ok(!checkBug(report({ severity: null })).problem, 'no severity is fine');
  ok(checkBug(report({ details: 5 })).problem, 'details that are not text are refused');
  ok(checkBug(report({ screenshot: { mediaType: 'image/png', data: JPG } })).problem, 'a JPEG that says it is a PNG is refused');
  ok(checkBug(report({ screenshot: { mediaType: 'image/gif', data: PNG } })).problem, 'a GIF is refused');
  ok(checkBug(report({ screenshot: { mediaType: 'image/png', data: 'not base64!!' } })).problem, 'data that is not base64 is refused');
  ok(checkBug(report({ thumbnail: { mediaType: 'image/jpeg', data: 'A'.repeat(400 * 1024) } })).problem, 'a thumbnail over its cap is refused');
  ok(checkBug([]).problem && checkBug(null).problem, 'a body that is not an object is refused');
  eq(checkBug(report({ title: 'x'.repeat(500) })).report.title.length, 120, 'a long title is cut to 120 characters');
  // Secrets.
  const t = scrubText(JSON.stringify({ a: `the link #draft/friend/join?room=rAbc12345&t=${SECRET}`, b: `ws://h/ws?seat=${encodeURIComponent(SECRET)}x`, c: 'key sk-ant-api03-AbCdEf123456_-xyz', d: `plain ${SECRET} here` }), [SECRET]);
  ok(!t.includes(SECRET), 'the presented token is gone wherever it was');
  ok(!t.includes('sk-ant-api03'), 'an Anthropic-shaped key is gone');
  ok(t.includes('t=[redacted]') && t.includes('seat=[redacted]'), 'URL token parameters are redacted');
  const k = scrubKeys({ apiKey: 'k', seatToken: 'x', nested: [{ token: true, name: 'Goblin token', authorization: 'Bearer y' }], deck: 'ok' });
  eq(k, { apiKey: '[redacted]', seatToken: '[redacted]', nested: [{ token: true, name: 'Goblin token', authorization: '[redacted]' }], deck: 'ok' }, 'token-named string fields are redacted; a card\'s token: true is kept');
  ok(BUG_ID.test(newBugId(Date.UTC(2026, 9, 7, 15, 30, 12, 345))) && newBugId(Date.UTC(2026, 9, 7, 15, 30, 12, 345)).startsWith('20261007T153012345Z-'), 'the id is the UTC time to the millisecond plus six characters');
  {
    const s = createBugStore({ dir: join(VAR, 'order', 'bugs'), varRoot: VAR, now: () => 1_000 });
    const ids = Array.from({ length: 5 }, () => s.save({ body: report(), via: 'helper' }).body.id);
    eq([...ids].sort(), ids, 'reports saved in the same millisecond still sort in the order they came');
  }
}

// ---------------------------------------------------------------------------
section('2. the store');
{
  const dir = join(VAR, 'store', 'bugs');
  const store = createBugStore({ dir, varRoot: VAR, maxFiles: 2 });
  const r = store.save({ body: report({ details: `token ${SECRET}`, screenshot: { mediaType: 'image/png', data: PNG }, thumbnail: { mediaType: 'image/jpeg', data: JPG } }), via: 'helper', secrets: [SECRET] });
  eq(r.status, 201, 'a report is saved (201)');
  const id = r.body.id;
  ok(BUG_ID.test(id) && r.body.screenshot === true, 'the answer carries the id and says a screenshot came');
  const files = readdirSync(dir).sort();
  eq(files, [`${id}.json`, `${id}.png`, `${id}.thumb.jpg`], 'the JSON, the screenshot and the thumbnail are on disk');
  const saved = JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8'));
  ok(saved.id === id && saved.received.via === 'helper' && !saved.received.room, 'the report says where it came from');
  ok(saved.screenshot.file === `${id}.png` && !('data' in saved.screenshot), 'the JSON names the screenshot and holds none of its bytes');
  ok(!JSON.stringify(saved).includes(SECRET), 'the token in the details is scrubbed');
  eq(readFileSync(join(dir, `${id}.png`)).toString('base64'), PNG, 'the screenshot is the bytes sent');
  ok(store.save({ body: { kind: 'nope' }, via: 'helper' }).status === 400, 'a bad body is 400');
  store.save({ body: report(), via: 'helper' });
  const full = store.save({ body: report(), via: 'helper' });
  ok(full.status === 507 && full.body.code === 'full', 'a full folder is 507 {code: full}');
  let threw = false;
  try { createBugStore({ dir: join(ROOT, 'docs'), varRoot: VAR }); } catch { threw = true; }
  ok(threw, 'a folder outside var/ is refused');
}

// ---------------------------------------------------------------------------
// HTTP helpers.
function call(port, path, { method = 'POST', headers = {}, body } = {}) {
  return new Promise((res, rej) => {
    const data = body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body));
    const q = request({ host: '127.0.0.1', port, path, method, headers: { Host: `127.0.0.1:${port}`, ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}), ...headers } }, (r) => {
      let t = '';
      r.on('data', (c) => { t += c; });
      r.on('end', () => { let j = null; try { j = JSON.parse(t); } catch { /* text */ } res({ status: r.statusCode, json: j, text: t }); });
    });
    q.on('error', rej);
    if (data) q.write(data);
    q.end();
  });
}

// ---------------------------------------------------------------------------
section('3. the coach helper: POST /bug');
{
  const dir = join(VAR, 'helper', 'bugs');
  const bugs = createBugStore({ dir, varRoot: VAR });
  const h = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins: ORIGINS, timeoutS: 5, bugs, bugsBurst: 3, bugsPerMinute: 1, log: () => {} });
  const port = await h.listen();
  try {
    const health = await call(port, '/health', { method: 'GET' });
    eq(health.json?.bugs, 1, '/health says "bugs": 1');
    const r = await call(port, '/bug', { headers: { Origin: 'https://jalirkan.github.io' }, body: report({ thumbnail: { mediaType: 'image/jpeg', data: JPG } }) });
    ok(r.status === 201 && BUG_ID.test(r.json?.id ?? ''), 'github.io\'s page, from loopback: 201 with an id');
    const saved = JSON.parse(readFileSync(join(dir, `${r.json.id}.json`), 'utf8'));
    eq([saved.received.via, saved.log.frames.length], ['helper', 300], 'saved whole, via the helper');
    eq((await call(port, '/bug', { headers: { 'Tailscale-Funnel-Request': '?1' }, body: report() })).status, 403, 'a Funnel request is refused at the door (unchanged)');
    eq((await call(port, '/bug', { headers: { 'CF-Connecting-IP': '198.51.100.1' }, body: report() })).status, 403, 'a Cloudflare request is refused at the door (unchanged)');
    eq((await call(port, '/bug', { headers: { Host: 'pc.tail1234.ts.net' }, body: report() })).status, 403, 'a tunnel\'s Host is refused at the door (unchanged)');
    eq((await call(port, '/bug', { headers: { Origin: 'https://evil.example' }, body: report() })).status, 403, 'a foreign page is refused');
    eq((await call(port, '/bug', { method: 'GET' })).status, 405, 'GET /bug is 405');
    eq((await call(port, '/bug', { body: 'not json' })).status, 400, 'a body that is not JSON is 400');
    eq((await call(port, '/bug', { headers: { 'Content-Length': String(MAX_BUG_BODY + 1) }, body: undefined })).status, 413, 'a body over 6 MB is 413');
    eq((await call(port, '/bug', { body: report() })).status, 429, 'past the burst: 429');
  } finally { h.close(); }
}

// ---------------------------------------------------------------------------
section('4. the room listener: POST /room/<id>/bug');
{
  const dir = join(VAR, 'room', 'bugs');
  const bugs = createBugStore({ dir, varRoot: VAR });
  const store = createRoomStore({ dir: null });
  const made = store.create({ cubeId: 'synergy', cubeTitle: 'Synergy', cards: Array.from({ length: 60 }, (_, i) => `Card ${i}`), name: 'Justin' });
  const { id, friendToken } = made.body;
  const srv = startRoomServer({ store, port: 0, origins: ORIGINS, bugs, log: () => {} });
  const port = await srv.listen();
  const bare = startRoomServer({ store, port: 0, origins: ORIGINS, bugs: null, log: () => {} });
  const barePort = await bare.listen();
  try {
    const body = report({ surface: 'table', details: `my link was …#draft/friend/join?room=${id}&t=${friendToken}` });
    eq((await call(port, `/room/${id}/bug`, { body })).status, 403, 'no seat token: 403 (no loopback trust)');
    eq((await call(port, `/room/${id}/bug`, { headers: { 'X-Room-Token': 'A'.repeat(22) }, body })).status, 403, 'a wrong token: 403');
    eq((await call(port, `/room/${id}/bug`, { method: 'GET', headers: { 'X-Room-Token': friendToken } })).status, 405, 'GET is 405');
    const r = await call(port, `/room/${id}/bug`, { headers: { 'X-Room-Token': friendToken, Origin: 'https://pc.tail1234.ts.net', Host: 'pc.tail1234.ts.net', 'Tailscale-Funnel-Request': '?1', 'X-Forwarded-For': '198.51.100.2' }, body });
    ok(r.status === 201 && BUG_ID.test(r.json?.id ?? ''), 'the friend\'s seat, through Funnel: 201 with an id');
    const saved = JSON.parse(readFileSync(join(dir, `${r.json.id}.json`), 'utf8'));
    eq([saved.received.via, saved.received.room, saved.received.seat], ['room', id, 1], 'the room and the seat are recorded');
    ok(!readFileSync(join(dir, `${r.json.id}.json`), 'utf8').includes(friendToken), 'the seat\'s own token is scrubbed out of the report');
    ok(!readFileSync(join(dir, `${r.json.id}.json`), 'utf8').includes('198.51.100.2'), 'the visitor\'s address is not stored');
    eq((await call(port, `/room/${id}/bug`, { headers: { 'X-Room-Token': friendToken }, body: { kind: 'x' } })).status, 400, 'a bad report is 400');
    eq((await call(port, `/room/${id}/bug`, { headers: { 'X-Room-Token': friendToken, 'Content-Length': String(MAX_BUG_BODY + 1) } })).status, 413, 'over 6 MB is 413');
    const limited = await call(port, `/room/${id}/bug`, { headers: { 'X-Room-Token': friendToken }, body });
    ok(limited.status === 429 && limited.json?.code === 'slow', 'past three in a burst: 429 {code: slow} for this seat');
    const owner = await call(port, `/room/${id}/bug`, { headers: { 'X-Room-Token': made.body.token }, body });
    ok(owner.status === 201, 'the other seat has its own limit');
    const off = await call(barePort, `/room/${id}/bug`, { headers: { 'X-Room-Token': friendToken }, body });
    ok(off.status === 404 && off.json?.code === 'off', 'a listener with no bug store: 404 {code: off}');
  } finally { srv.close(); bare.close(); }
}

// ---------------------------------------------------------------------------
section('5. tools/bugs-sync.mjs');
{
  const big = report({ id: '20261007T153012345Z-abc123', received: { at: 'x', via: 'room', room: 'rAbc12345', seat: 1 } });
  const c = compactForSync(big);
  ok(Buffer.byteLength(c.text) <= SYNC_JSON + 1, `a compacted report is at most ${SYNC_JSON / 1024} KB`);
  const back = JSON.parse(c.text);
  ok(back.log.frames.length <= SYNC_FRAMES && back.log.frames.at(-1).seq === 300, 'it keeps the newest frames');
  eq(back.synced.framesKept + back.synced.framesDropped, 300, 'it says how many frames it kept and dropped');
  const huge = compactForSync({ ...big, details: 'y'.repeat(700 * 1024) });
  ok(Buffer.byteLength(huge.text) <= SYNC_JSON + 1, 'a report too large even without frames is cut to its summary');
  eq(mdLine('a `b` [c](d) | e\nf'), 'a \\`b\\` \\[c\\](d) \\| e f', 'INDEX.md lines cannot carry links, code or new lines from a title');
  ok(indexLine(big, true).includes('via room rAbc12345 seat 1') && indexLine(big, true).includes('[screenshot](20261007T153012345Z-abc123.jpg)'), 'an INDEX line names the room, the seat and the screenshot');

  // A remote with a pc-results branch, and a clone of it (Justin's checkout).
  const remote = join(VAR, 'remote.git');
  const clone = join(VAR, 'clone');
  const sh = (cwd, ...args) => {
    const r = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
    if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
    return r.stdout.trim();
  };
  sh(VAR, 'init', '--quiet', '--bare', remote);
  sh(VAR, 'init', '--quiet', clone);
  writeFileSync(join(clone, 'HEARTBEAT.md'), '# Heartbeat\n');
  sh(clone, 'add', 'HEARTBEAT.md');
  sh(clone, '-c', 'user.name=t', '-c', 'user.email=t@localhost', 'commit', '--quiet', '-m', 'heartbeat');
  sh(clone, 'remote', 'add', 'origin', remote);
  sh(clone, 'push', '--quiet', 'origin', 'HEAD:refs/heads/pc-results');
  sh(clone, 'push', '--quiet', 'origin', 'HEAD:refs/heads/pc-jobs');
  const before = sh(clone, 'rev-parse', 'HEAD');
  const dir = join(clone, 'var', 'bugs');
  const store = createBugStore({ dir, varRoot: join(clone, 'var') });
  const a = store.save({ body: report({ thumbnail: { mediaType: 'image/jpeg', data: JPG } }), via: 'helper' }).body.id;
  const b = store.save({ body: report({ title: 'Second', severity: null }), via: 'room', room: 'rAbc12345', seat: 1 }).body.id;
  eq(pending(dir).map((x) => x.id), [a, b], 'both reports are pending, oldest first');
  let refused = 0;
  for (const branch of ['pc-jobs', 'main']) { try { pushReports([], { repo: clone, dir, branch }); } catch { refused++; } }
  eq(refused, 2, 'pc-jobs and main are refused');
  const r = pushReports(pending(dir), { repo: clone, dir });
  eq(r.pushed, [a, b], 'both are pushed');
  const tree = sh(clone, 'ls-tree', '-r', '--name-only', 'origin/pc-results').split('\n');
  eq(tree.filter((f) => f.startsWith('bugs/')).sort(), ['bugs/INDEX.md', `bugs/${a}.jpg`, `bugs/${a}.json`, `bugs/${b}.json`].sort(), 'the branch has bugs/INDEX.md, both reports and the thumbnail');
  ok(tree.includes('HEARTBEAT.md'), 'the runner\'s files are untouched');
  const index = sh(clone, 'show', 'origin/pc-results:bugs/INDEX.md');
  ok(index.includes(a) && index.includes(b) && index.split('\n').filter((l) => l.startsWith('- ')).length === 2, 'INDEX.md has one line a report');
  const onBranch = JSON.parse(sh(clone, 'show', `origin/pc-results:bugs/${a}.json`));
  ok(onBranch.log.frames.length === SYNC_FRAMES, `the branch copy keeps the last ${SYNC_FRAMES} frames`);
  eq(sh(clone, 'rev-parse', 'HEAD'), before, 'the checkout\'s own HEAD did not move');
  ok(!existsSync(join(clone, 'var', 'bugs-sync', `wt-${process.pid}`)), 'the temporary worktree is gone');
  eq(sh(clone, 'worktree', 'list').split('\n').length, 1, 'no worktree is left registered');
  eq(pushReports(pending(dir), { repo: clone, dir }).skipped, [a, b], 'a second push writes nothing twice');
  // The CLI: .synced, then nothing new.
  const cli = (...args) => spawnSync(process.execPath, [join(ROOT, 'tools', 'bugs-sync.mjs'), ...args], { cwd: clone, encoding: 'utf8' });
  const c1 = cli('--push');
  ok(c1.status === 0 && /already there/.test(c1.stdout), 'the CLI marks reports already on the branch as sent');
  const c2 = cli('--push', '--if-new', '--quiet');
  ok(c2.status === 0 && c2.stdout === '', '--if-new --quiet: silent with nothing new');
  const d = store.save({ body: report({ title: 'Third' }), via: 'helper' }).body.id;
  const c3 = cli();
  ok(c3.status === 0 && c3.stdout.includes(d) && c3.stdout.includes('--push'), 'without --push it only lists what would go');
  const c4 = cli('--push');
  ok(c4.status === 0 && c4.stdout.includes(d), 'the CLI pushes the new one');
  ok(readFileSync(join(dir, '.synced'), 'utf8').includes(d), '.synced lists it');
  const c5 = spawnSync(process.execPath, [join(ROOT, 'tools', 'bugs-sync.mjs'), '--push'], { cwd: clone, encoding: 'utf8', env: { ...process.env } });
  ok(c5.status === 0 && /nothing new/.test(c5.stdout), 'then nothing is new');
  // A push that cannot go (no such remote) fails with the one command to run later.
  store.save({ body: report({ title: 'Fourth' }), via: 'helper' });
  const c6 = cli('--push', '--remote', 'nowhere');
  ok(c6.status === 1 && c6.stderr.includes('node tools/bugs-sync.mjs --push'), 'a failed push says how to send them later');
}

console.log(`\n${checks - failed}/${checks} checks passed${failed ? ` -- ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
