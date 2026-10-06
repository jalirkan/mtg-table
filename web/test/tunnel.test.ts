/*
 * mtg-table — web/test/tunnel.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The Cloudflare Tunnel policy (D405, docs/cloudflare.md), offline:
 *
 *  - scripts/tunnel/config.yml.example's ingress list IS scripts/tunnel/policy.mjs's
 *    `expectedIngress()` -- with the game seat (D402), and again without it (a config
 *    copied before Phase 2) -- so the template and the allowlist cannot drift apart;
 *  - checkConfig() refuses every way a config goes wrong: a never-port (the bridge, the
 *    coach helper, Vite), `localhost`, a second or wildcard hostname, no catch-all 404, a
 *    Host rewrite, warp-routing, no Access check in cloudflared, a dropped edge-deny rule;
 *  - the edge-deny regexes catch every never-path and spare the room's routes and the site;
 *  - the small YAML reader, the verdicts, the `ss` reader, the Cloudflare ranges, the CLI;
 *  - end to end, in this process: the REAL draft-room listener (tools/draft-room.mjs) with a
 *    live room passes tunnel-check's --local doors, and a listener that answers everything
 *    (a tunnel pointed at the bridge, say) and a helper that answers a tunnel's Host fail them.
 *
 * The policy and the check are plain .mjs (they run with no npm install), loaded with a
 * computed specifier and typed here, as personal-tier.test.ts does.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createServer, request, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../..', import.meta.url));

interface Rule { hostname: string; path: string | null; service: string }
interface Checked { problems: string[]; warnings: string[]; hostname: string | null; gameSeat: boolean }
interface Answer { status?: number; headers?: Record<string, string>; body?: string }
interface Verdict { ok: boolean; note: string }
interface Policy {
  HOST_PLACEHOLDER: string;
  ROOM: { port: number };
  GAME_SEAT: { port: number; path: string; placeholder: boolean };
  NEVER_PORTS: ReadonlyArray<{ port: number; name: string; why: string }>;
  NEVER_PATHS: ReadonlyArray<{ method: string; path: string; why: string }>;
  TUNNEL_HEADERS: readonly string[];
  DENY_SEGMENTS: readonly string[];
  ROOM_ROOT_DENY: string;
  denyPath(): string;
  expectedIngress(hostname: string, opts?: { gameSeat?: boolean }): Rule[];
  enableGameSeat(text: string): string;
  parseYaml(text: string): unknown;
  checkConfig(text: string, opts?: { template?: boolean }): Checked;
  accessAnswered(a: Answer): boolean;
  verdictNever(a: Answer): Verdict;
  verdictRoomNoToken(a: Answer): Verdict;
  verdictNoUpgrade(a: Answer): Verdict;
}
interface Result { level: 'PASS' | 'FAIL' | 'WARN' | 'SKIP' | 'NOTE'; name: string; note: string }
interface Check {
  TABLE_NEVER: readonly string[];
  runChecks(opts: Record<string, unknown>): Promise<Result[]>;
  bindsFrom(ssText: string, ports: number[]): Map<number, string[]>;
  inCloudflareV4(ip: string): boolean | null;
  parseArgs(argv: string[]): Record<string, unknown>;
}
interface HelperLib {
  TUNNEL_HEADERS: readonly string[];
  startHelper(opts: Record<string, unknown>): { listen(): Promise<number>; close(): void };
}
interface RoomLib {
  createRoomStore(opts?: Record<string, unknown>): unknown;
  createRoomOwner(opts: Record<string, unknown>): { post(body: unknown): { status: number; body: { id: string; token: string; friendToken: string } } };
  startRoomServer(opts: Record<string, unknown>): { listen(): Promise<number>; close(): void };
}

const P = (await import(new URL('../../scripts/tunnel/policy.mjs', import.meta.url).href)) as Policy;
const C = (await import(new URL('../../scripts/tunnel/tunnel-check.mjs', import.meta.url).href)) as Check;
const R = (await import(new URL('../../tools/draft-room.mjs', import.meta.url).href)) as RoomLib;
const H = (await import(new URL('../../tools/coach-helper.mjs', import.meta.url).href)) as HelperLib;
const viaTunnel = (h: Record<string, unknown>): boolean => P.TUNNEL_HEADERS.some((x) => h[x] !== undefined);

const TEMPLATE = readFileSync(join(REPO, 'scripts/tunnel/config.yml.example'), 'utf8');
const HOST = 'play.jalirkan-test.net';
const fill = (t: string): string =>
  t.replaceAll('<TUNNEL-UUID>', '6ff42ae2-765d-4adf-8112-31c55c1551ef')
    .replaceAll(P.HOST_PLACEHOLDER, HOST)
    .replace('teamName: your-team', 'teamName: jteam')
    .replace('<AUD-TAG>', 'a1b2c3d4e5f6');
const FILLED = fill(TEMPLATE);

function rulesOf(text: string): Rule[] {
  const doc = P.parseYaml(text) as { ingress: Array<{ hostname?: string; path?: string; service: string }> };
  return doc.ingress.slice(0, -1).map((r) => ({ hostname: r.hostname ?? '', path: r.path ?? null, service: r.service }));
}

// ---------------------------------------------------------------------------
// The template is the policy.
// ---------------------------------------------------------------------------

test('the template\'s ingress list is exactly the policy\'s, and passes the check as a template', () => {
  assert.deepEqual(rulesOf(TEMPLATE), P.expectedIngress(P.HOST_PLACEHOLDER));
  const r = P.checkConfig(TEMPLATE, { template: true });
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.gameSeat, true);
  const doc = P.parseYaml(TEMPLATE) as { ingress: Array<Record<string, unknown>> };
  assert.deepEqual(doc.ingress.at(-1), { service: 'http_status:404' });
});

/** The template as it was before Phase 2: the GAME SEAT block's lines commented out. */
function commentGameSeat(text: string): string {
  let inside = false;
  return text.split('\n').map((line) => {
    const t = line.trim();
    if (t.startsWith('# >>> GAME SEAT')) { inside = true; return line; }
    if (t.startsWith('# <<< GAME SEAT')) { inside = false; return line; }
    return inside && !t.startsWith('#') ? line.replace(/^(\s*)/, '$1# ') : line;
  }).join('\n');
}

test('the game seat (D402) is on: /ws first, to the table port; a config from before it still passes, and enableGameSeat turns it on', () => {
  assert.equal(P.GAME_SEAT.placeholder, false, 'Phase 2 confirmed the table port and its /ws');
  assert.deepEqual([P.GAME_SEAT.port, P.GAME_SEAT.path], [8646, '^/ws$']);
  assert.equal(rulesOf(TEMPLATE)[0]!.path, P.GAME_SEAT.path, 'the /ws rule comes before the edge deny that lists ws');
  assert.equal(rulesOf(TEMPLATE)[0]!.service, `http://127.0.0.1:${P.GAME_SEAT.port}`);
  const off = commentGameSeat(TEMPLATE);
  assert.notEqual(off, TEMPLATE);
  assert.deepEqual(rulesOf(off), P.expectedIngress(P.HOST_PLACEHOLDER, { gameSeat: false }));
  const r = P.checkConfig(off, { template: true });
  assert.deepEqual(r.problems, []);
  assert.equal(r.gameSeat, false);
  assert.equal(P.enableGameSeat(off), TEMPLATE, 'uncommenting the old block gives exactly the template');
  assert.equal(P.enableGameSeat(TEMPLATE), TEMPLATE, 'and an uncommented one is left as it is');
});

test('the template names no never-port in a service, and mentions each one it warns about', () => {
  for (const line of TEMPLATE.split('\n').filter((l) => /^\s*service:/.test(l))) {
    for (const n of P.NEVER_PORTS) assert.ok(!line.includes(`:${n.port}`), `${line} names ${n.name}`);
  }
  for (const port of [8642, 8643, 5173]) assert.ok(TEMPLATE.includes(String(port)), `the template's header explains ${port}`);
});

test('outside template mode, its placeholders are problems; filled in, it is clean', () => {
  const raw = P.checkConfig(TEMPLATE);
  for (const want of [/hostname .* placeholder/, /teamName\/audTag/, /^tunnel:/, /^credentials-file:/]) {
    assert.ok(raw.problems.some((p) => want.test(p)), `no problem matching ${want}: ${raw.problems.join(' | ')}`);
  }
  const r = P.checkConfig(FILLED);
  assert.deepEqual(r.problems, []);
  assert.equal(r.hostname, HOST);
  assert.deepEqual(P.checkConfig(P.enableGameSeat(FILLED)).problems, []);
});

// ---------------------------------------------------------------------------
// Every way a config goes wrong.
// ---------------------------------------------------------------------------

const ROOM_SVC = `service: http://127.0.0.1:${P.ROOM.port}`;
const BROKEN: Array<[string, (t: string) => string, RegExp]> = [
  ['the coach helper', (t) => t.replace(ROOM_SVC, 'service: http://127.0.0.1:8643'), /8643 is the coach helper/],
  ['the bridge', (t) => t.replace(ROOM_SVC, 'service: http://127.0.0.1:8642'), /8642 is the bridge/],
  ['the Vite dev server', (t) => t.replace(ROOM_SVC, 'service: http://127.0.0.1:5173'), /5173 is the Vite dev server/],
  ['a port off the list', (t) => t.replace(ROOM_SVC, 'service: http://127.0.0.1:9000'), /9000 is not on the allowlist/],
  ['localhost', (t) => t.replace(ROOM_SVC, `service: http://localhost:${P.ROOM.port}`), /not localhost/],
  ['https to the origin', (t) => t.replace(ROOM_SVC, `service: https://127.0.0.1:${P.ROOM.port}`), /only http_status:404 or http:\/\/127/],
  ['a raw TCP service', (t) => t.replace(ROOM_SVC, 'service: tcp://127.0.0.1:22'), /not tcp\/ssh\/unix/],
  ['the catch-all to the room', (t) => t.replace(/- service: http_status:404\s*$/, `- ${ROOM_SVC}\n`), /last rule must be the catch-all/],
  ['no catch-all', (t) => t.replace(/\n {2}# Anything else[\s\S]*$/, '\n'), /last rule must be the catch-all/],
  ['a second hostname', (t) => t.replace(`- hostname: ${HOST}\n    ${ROOM_SVC}`, `- hostname: other.jalirkan-test.net\n    ${ROOM_SVC}`), /same one hostname/],
  ['a wildcard hostname', (t) => t.replaceAll(`hostname: ${HOST}`, "hostname: '*.jalirkan-test.net'"), /no wildcards/],
  ['a Host rewrite', (t) => t.replace('  access:\n', '  httpHostHeader: 127.0.0.1\n  access:\n'), /never rewrite Host/],
  ['warp-routing', (t) => `${t}\nwarp-routing:\n  enabled: true\n`, /warp-routing/],
  ['no Access check in cloudflared', (t) => t.replace(/originRequest:\n {2}access:\n {4}required: true\n {4}teamName: jteam\n {4}audTag:\n {6}- a1b2c3d4e5f6\n/, ''), /cloudflared must check the Access token/],
  ['Access not required', (t) => t.replace('required: true', 'required: false'), /needs required: true/],
  ['the edge deny dropped', (t) => t.replace(/ {2}- hostname: \S+\n {4}path: \^\/\(coach[^\n]*\n {4}service: http_status:404\n/, ''), /not the policy's/],
  ['the room-root deny dropped', (t) => t.replace(/ {2}- hostname: \S+\n {4}path: \^\/room\/\?\$\n {4}service: http_status:404\n/, ''), /not the policy's/],
  ['a path on the room rule', (t) => t.replace(`- hostname: ${HOST}\n    ${ROOM_SVC}`, `- hostname: ${HOST}\n    path: ^/room/.*$\n    ${ROOM_SVC}`), /not the policy's/],
  ['/ws routed to the room', (t) => t.replace(`- hostname: ${HOST}\n    path: ^/ws$\n    service: http://127.0.0.1:${P.GAME_SEAT.port}`, `- hostname: ${HOST}\n    path: ^/ws$\n    ${ROOM_SVC}`), /not the policy's/],
  ['an unknown rule key', (t) => t.replace(`- hostname: ${HOST}\n    ${ROOM_SVC}`, `- hostname: ${HOST}\n    ${ROOM_SVC}\n    extra: 1`), /unexpected key "extra"/],
  ['a YAML anchor', (t) => t.replace('teamName: jteam', 'teamName: &t jteam'), /cannot read the config/],
];

for (const [what, mutate, want] of BROKEN) {
  test(`checkConfig refuses ${what}`, () => {
    const text = mutate(FILLED);
    assert.notEqual(text, FILLED, `the mutation for "${what}" changed nothing`);
    const r = P.checkConfig(text);
    assert.ok(r.problems.some((p) => want.test(p)), `"${what}": no problem matching ${want}; got ${JSON.stringify(r.problems)}`);
  });
}

test('every never-port is refused by checkConfig, and the list holds the bridge and the coach helper', () => {
  const ports = P.NEVER_PORTS.map((n) => n.port);
  for (const p of [8642, 8643, 5173]) assert.ok(ports.includes(p));
  assert.ok(!ports.includes(P.ROOM.port) && !ports.includes(P.GAME_SEAT.port));
  for (const n of P.NEVER_PORTS) {
    const r = P.checkConfig(FILLED.replace(ROOM_SVC, `service: http://127.0.0.1:${n.port}`));
    assert.ok(r.problems.some((p) => p.includes(`port ${n.port} is the ${n.name}`)), n.name);
  }
});

// ---------------------------------------------------------------------------
// The edge-deny regexes (cloudflared's Go RE2 reads these the same way here).
// ---------------------------------------------------------------------------

test('the edge-deny paths catch every never-path and spare the room routes and the site', () => {
  const deny = new RegExp(P.denyPath());
  const root = new RegExp(P.ROOM_ROOT_DENY);
  const denied = (p: string): boolean => deny.test(p) || root.test(p);
  for (const n of P.NEVER_PATHS) assert.ok(denied(n.path), `${n.method} ${n.path} reaches the room listener`);
  for (const p of ['/coach', '/coach/x', '/engine/start', '/observe', '/ws', '/health', '/match', '/review/abc', '/eval', '/room', '/room/', '/vision']) {
    assert.ok(denied(p), p);
  }
  for (const p of ['/', '/index.html', '/assets/index-abc.js', '/room/rAAAAAAAA', '/room/rAAAAAAAA/events', '/room/rAAAAAAAA/join', '/room/rAAAAAAAA/pick', '/cubes/synergy.md', '/coaching-notes', '/wss']) {
    assert.ok(!denied(p), `${p} is denied at the edge`);
  }
  assert.ok(P.DENY_SEGMENTS.includes('ws'), 'ws stays denied until the game-seat rule shadows it');
});

// ---------------------------------------------------------------------------
// The YAML reader.
// ---------------------------------------------------------------------------

test('parseYaml reads the config shape and refuses what it cannot read', () => {
  const doc = P.parseYaml([
    'a: 1  # a comment',
    "b: 'it''s # not a comment'",
    'c: "q\\"x"',
    'd: [x, \'y\', 3]',
    'e:',
    '- k: v',
    '  n: true',
    '-   plain',
    'f:',
    '  g:',
    '    - 1',
    'h:',
  ].join('\n'));
  assert.deepEqual(doc, { a: 1, b: "it's # not a comment", c: 'q"x', d: ['x', 'y', 3], e: [{ k: 'v', n: true }, 'plain'], f: { g: [1] }, h: null });
  assert.throws(() => P.parseYaml('a:\n\tb: 1'), /tab/);
  assert.throws(() => P.parseYaml('a: &x 1'), /anchors/);
  assert.throws(() => P.parseYaml('a: |\n  text'), /block strings/);
  assert.throws(() => P.parseYaml('a: 1\na: 2'), /twice/);
  assert.throws(() => P.parseYaml('a: 1\n   b: 2'), /indentation/);
  assert.throws(() => P.parseYaml("a: 'open"), /unterminated/);
});

// ---------------------------------------------------------------------------
// Verdicts, ss, Cloudflare ranges, arguments.
// ---------------------------------------------------------------------------

test('accessAnswered: a redirect to the Access login or an Access 401/403, nothing else', () => {
  assert.ok(P.accessAnswered({ status: 302, headers: { location: 'https://jteam.cloudflareaccess.com/cdn-cgi/access/login/play.x?kid=1' } }));
  assert.ok(P.accessAnswered({ status: 302, headers: { location: 'https://play.x/cdn-cgi/access/login?redirect_url=%2F' } }));
  assert.ok(P.accessAnswered({ status: 403, headers: { 'cf-access-domain': 'play.x' } }));
  assert.ok(!P.accessAnswered({ status: 200, headers: {} }), 'the origin answered');
  assert.ok(!P.accessAnswered({ status: 404, headers: {} }), 'the edge 404 is not Access');
  assert.ok(!P.accessAnswered({ status: 302, headers: { location: 'https://evil.example/' } }));
  assert.ok(!P.accessAnswered({ status: 403, headers: { 'content-type': 'application/json' } }), 'the room listener\'s 403 is not Access');
  assert.ok(P.accessAnswered({ status: 403, headers: { server: 'cloudflare' }, body: '<html>Forbidden' }), 'Access\'s plain refusal');
  assert.ok(!P.accessAnswered({ status: 403, headers: { server: 'cloudflare' }, body: '{"ok":false,"code":"token"}' }), 'the room listener through the tunnel');
});

test('the verdicts', () => {
  assert.ok(P.verdictNever({ status: 404 }).ok);
  assert.ok(P.verdictNever({ status: 405 }).ok);
  assert.ok(!P.verdictNever({ status: 200 }).ok);
  assert.ok(!P.verdictNever({ status: 101 }).ok);
  assert.ok(!P.verdictNever({ status: 403 }).ok, 'a 403 means it reached a door, not the edge deny');
  assert.ok(P.verdictRoomNoToken({ status: 403, body: '{"ok":false,"code":"token"}' }).ok);
  assert.ok(P.verdictRoomNoToken({ status: 404, body: '{"ok":false,"code":"gone"}' }).ok);
  assert.ok(!P.verdictRoomNoToken({ status: 200, body: '{"v":1}' }).ok);
  assert.ok(!P.verdictRoomNoToken({ status: 404, body: 'not found' }).ok, 'a plain 404 is not the room listener');
  assert.ok(P.verdictNoUpgrade({ status: 403 }).ok);
  assert.ok(!P.verdictNoUpgrade({ status: 101 }).ok);
});

test('bindsFrom: only our ports, only beyond loopback', () => {
  const ss = [
    'LISTEN 0 511 127.0.0.1:8642 0.0.0.0:*',
    'LISTEN 0 511 0.0.0.0:8643 0.0.0.0:*',
    'LISTEN 0 511 [::]:8644 [::]:*',
    'LISTEN 0 511 [::1]:5173 [::]:*',
    'LISTEN 0 511 192.168.1.5:5173 0.0.0.0:*',
    'LISTEN 0 128 0.0.0.0:22 0.0.0.0:*',
    'LISTEN 0 511 [::ffff:127.0.0.1]:8646 [::]:*',
  ].join('\n');
  const w = C.bindsFrom(ss, [8642, 8643, 8644, 8646, 5173]);
  assert.deepEqual([...w.entries()].sort(), [[5173, ['192.168.1.5']], [8643, ['0.0.0.0']], [8644, ['::']]]);
});

test('inCloudflareV4', () => {
  assert.equal(C.inCloudflareV4('104.21.3.4'), true);
  assert.equal(C.inCloudflareV4('172.67.1.1'), true);
  assert.equal(C.inCloudflareV4('81.2.69.160'), false);
  assert.equal(C.inCloudflareV4('2606:4700::1'), null);
});

test('parseArgs', () => {
  const a = C.parseArgs(['--local', 'https://Play.Example.org/x', '--room', 'rAbC12_xY', '--room-port', '18644', '--ip', '81.2.69.160']);
  assert.equal(a.hostname, 'play.example.org');
  assert.equal(a.local, true);
  assert.deepEqual(a.ports, { room: 18644 });
  assert.throws(() => C.parseArgs([]), /hostname/);
  assert.throws(() => C.parseArgs(['localhost']), /not a hostname/);
  assert.throws(() => C.parseArgs(['a.b', '--room', '../x']), /room id/);
  assert.throws(() => C.parseArgs(['a.b', '--ip', 'nope']), /IP address/);
  assert.throws(() => C.parseArgs(['a.b', '--room-port', '0']), /port/);
  assert.throws(() => C.parseArgs(['a.b', '--wat']), /unknown flag/);
});

// ---------------------------------------------------------------------------
// End to end: the real room listener passes the --local doors; open doors fail them.
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join(tmpdir(), 'tunnel-test-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

function listen(handler: Parameters<typeof createServer>[1]): Promise<{ server: Server; port: number }> {
  return new Promise((done) => {
    const server = createServer(handler);
    server.listen(0, '127.0.0.1', () => done({ server, port: (server.address() as { port: number }).port }));
  });
}

/** A port nothing listens on (bound, read, released). */
async function deadPort(): Promise<number> {
  const { server, port } = await listen(() => {});
  await new Promise((r) => server.close(r));
  return port;
}

test('tunnel-check --local: the real draft-room listener with a live room passes; open doors fail', async () => {
  const site = join(scratch, 'site');
  mkdirSync(site);
  writeFileSync(join(site, 'index.html'), '<!doctype html><title>ForgeCoach</title>');
  const cfg = join(scratch, 'config.yml');
  writeFileSync(cfg, FILLED);

  const store = R.createRoomStore();
  const room = R.startRoomServer({ store, port: 0, origins: ['https://jalirkan.github.io'], siteDir: site, log: () => {} });
  const roomPort = await room.listen();
  const owner = R.createRoomOwner({ store, roomPort });
  const made = owner.post({ cubeId: 'synergy', cards: 'abcdefghij'.split(''), name: 'Justin' });
  assert.equal(made.status, 201);
  // A coach helper that refuses a tunnel's Host (its D386 door, in miniature) and Cloudflare's headers (D404).
  const helper = await listen((req, res) => { res.statusCode = /^(localhost|127\.)/.test(String(req.headers.host)) && !viaTunnel(req.headers) ? 200 : 403; res.end(); });
  const dead = await deadPort();
  const base = { hostname: HOST, local: true, configPath: cfg, cloudflared: null, ss: false, timeoutMs: 3000 };
  try {
    const good = await C.runChecks({ ...base, room: made.body.id, ports: { room: roomPort, coach: helper.port, ws: dead, seat: dead } });
    const fails = good.filter((r) => r.level === 'FAIL');
    assert.deepEqual(fails, [], JSON.stringify(fails));
    const noTok = good.find((r) => r.name.startsWith('room listener /room/<id>'));
    assert.equal(noTok?.note, '403 token', 'a live room\'s route refuses a request with no seat token');
    assert.ok(good.some((r) => r.level === 'PASS' && /refuses a tunnel/.test(r.note)));

    // A listener that answers everything (what a tunnel pointed at the bridge or a dev server sees),
    // and a helper that answers a tunnel's Host (an httpHostHeader rewrite, or no D386 check).
    const open = await listen((_req, res) => { res.setHeader('content-type', 'application/json'); res.end('{"ok":true}'); });
    const lax = await listen((_req, res) => { res.end('ok'); });
    try {
      const bad = await C.runChecks({ ...base, ports: { room: open.port, coach: lax.port, ws: dead, seat: dead } });
      const failed = bad.filter((r) => r.level === 'FAIL').map((r) => r.name);
      assert.ok(failed.includes('room listener /room/<id> with no token'), failed.join(' | '));
      assert.ok(failed.includes('room listener, a foreign Origin'));
      assert.ok(failed.includes('room listener POST /coach'));
      assert.ok(failed.some((n) => n.startsWith('coach helper')));
    } finally {
      open.server.close();
      lax.server.close();
    }

    // The config check is part of --local: a config pointing at the coach helper fails it.
    writeFileSync(cfg, FILLED.replace(ROOM_SVC, 'service: http://127.0.0.1:8643'));
    const misrouted = await C.runChecks({ ...base, ports: { room: dead, coach: dead, ws: dead, seat: dead } });
    assert.ok(misrouted.some((r) => r.level === 'FAIL' && /8643 is the coach helper/.test(r.note)));
  } finally {
    room.close();
    helper.server.close();
  }
});

// ---------------------------------------------------------------------------
// D408: the CF-header refusals and the table port (8646), end to end.
// ---------------------------------------------------------------------------

test("Cloudflare's headers are one list: the policy's, the coach helper's and the bridge's TunnelGate's", () => {
  assert.deepEqual([...P.TUNNEL_HEADERS], [...H.TUNNEL_HEADERS]);
  const java = readFileSync(join(REPO, 'bridge/src/mtgtable/WsTransport.java'), 'utf8');
  const m = /TUNNEL_HEADERS = List\.of\(([^)]*)\)/.exec(java);
  assert.ok(m, 'WsTransport.TUNNEL_HEADERS');
  assert.deepEqual(m[1]!.split(',').map((x) => x.trim().replace(/^"|"$/g, '')), [...P.TUNNEL_HEADERS]);
});

/** A stand-in for the bridge's port (8642): D402's TunnelGate, then /health. */
function bridgeLike(gate: boolean) {
  return listen((req, res) => {
    if (gate && viaTunnel(req.headers)) { res.statusCode = 403; res.end('this port is never tunnelled'); return; }
    res.end(req.url === '/health' ? 'ok' : 'site');
  });
}

/**
 * A stand-in for the table port (D402's TableDoor): /ws by token and nothing else.  `lax` answers /health and
 * opens /observe, as a table port that served more than /ws would.
 */
function tableLike(token: string, lax = false) {
  return new Promise<{ server: Server; port: number }>((done) => {
    const server = createServer((req, res) => {
      const path = (req.url ?? '/').split('?')[0];
      if (lax && path === '/health') { res.end('ok'); return; }
      res.statusCode = path === '/ws' ? 403 : 404;
      res.end();
    });
    server.on('upgrade', (req, socket) => {
      const u = new URL(req.url ?? '/', 'http://x');
      const open = (u.pathname === '/ws' && u.searchParams.get('seat') === token) || (lax && u.pathname === '/observe');
      socket.end(open
        ? 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n'
        : `HTTP/1.1 ${u.pathname === '/ws' ? '403 Forbidden' : '404 Not Found'}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`);
    });
    server.listen(0, '127.0.0.1', () => done({ server, port: (server.address() as { port: number }).port }));
  });
}

test('tunnel-check --local: the real coach helper and a gated bridge refuse every Cloudflare header; an ungated one fails', async () => {
  const cfg = join(scratch, 'config-cf.yml');
  writeFileSync(cfg, FILLED);
  const helper = H.startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins: ['https://jalirkan.github.io'], queueMax: 1, timeoutS: 5, room: null, review: null, evaluator: null, log: () => {} });
  const helperPort = await helper.listen();
  const gated = await bridgeLike(true);
  const open = await bridgeLike(false);
  const dead = await deadPort();
  const base = { hostname: HOST, local: true, configPath: cfg, cloudflared: null, ss: false, timeoutMs: 3000 };
  try {
    const good = await C.runChecks({ ...base, ports: { room: dead, coach: helperPort, ws: gated.port, seat: dead } });
    assert.deepEqual(good.filter((r) => r.level === 'FAIL'), []);
    for (const h of P.TUNNEL_HEADERS) {
      assert.ok(good.some((r) => r.level === 'PASS' && r.name === `coach helper, Host 127.0.0.1, ${h}`), `the real helper refuses ${h}`);
      assert.ok(good.some((r) => r.level === 'PASS' && r.name === `bridge, Host 127.0.0.1, ${h}`), `the gated bridge refuses ${h}`);
    }
    const bad = await C.runChecks({ ...base, ports: { room: dead, coach: dead, ws: open.port, seat: dead } });
    const failed = bad.filter((r) => r.level === 'FAIL').map((r) => r.name);
    assert.deepEqual(failed, P.TUNNEL_HEADERS.map((h) => `bridge, Host 127.0.0.1, ${h}`), 'a bridge without the gate fails once per header');
  } finally {
    helper.close();
    gated.server.close();
    open.server.close();
  }
});

test('tunnel-check --local: the table port (8646) serves /ws by token and nothing else; the room passes /ws to it; a lax table fails', async () => {
  const cfg = join(scratch, 'config-seat.yml');
  writeFileSync(cfg, FILLED);
  const seatToken = 'S'.repeat(22);
  const table = await tableLike(seatToken);
  const store = R.createRoomStore();
  const room = R.startRoomServer({ store, port: 0, origins: ['https://jalirkan.github.io'], tablePort: table.port, log: () => {} });
  const roomPort = await room.listen();
  const dead = await deadPort();
  const base = { hostname: HOST, local: true, configPath: cfg, cloudflared: null, ss: false, timeoutMs: 3000 };
  try {
    const good = await C.runChecks({ ...base, ports: { room: roomPort, coach: dead, ws: dead, seat: table.port } });
    assert.deepEqual(good.filter((r) => r.level === 'FAIL'), []);
    const names = good.filter((r) => r.level === 'PASS').map((r) => r.name);
    for (const n of ['game seat /ws with no seat token', 'game seat /ws with a wrong seat token', 'game seat /observe (a watcher would see a hand)',
      ...C.TABLE_NEVER.map((p) => `game seat GET ${p}`), 'room listener /ws with no seat token (passed to the table)']) {
      assert.ok(names.includes(n), `${n}: ${names.join(' | ')}`);
    }
    // The stand-in is a real door: the right token opens it, through the room's port as well.
    const through = await new Promise<number>((done) => {
      const q = request({ host: '127.0.0.1', port: roomPort, path: `/ws?seat=${seatToken}`, headers: { connection: 'Upgrade', upgrade: 'websocket' } });
      q.on('upgrade', (_res, sock) => { sock.destroy(); done(101); });
      q.on('response', (r) => done(r.statusCode ?? 0));
      q.end();
    });
    assert.equal(through, 101, 'the seat token opens the seat through the room listener');

    const lax = await tableLike(seatToken, true);
    try {
      const bad = await C.runChecks({ ...base, ports: { room: dead, coach: dead, ws: dead, seat: lax.port } });
      const failed = bad.filter((r) => r.level === 'FAIL').map((r) => r.name);
      assert.deepEqual(failed.sort(), ['game seat /observe (a watcher would see a hand)', 'game seat GET /health'].sort());
    } finally {
      lax.server.close();
    }
  } finally {
    room.close();
    table.server.close();
  }
});

// ---------------------------------------------------------------------------
// D408: play.sh --tunnel / --room-public-url refuse what they must, before anything starts.
// ---------------------------------------------------------------------------

test('play.sh: --tunnel refuses --lan and a non-https address; --room-public-url wants the draft room', () => {
  const run = (...args: string[]) => spawnSync('bash', ['scripts/play.sh', ...args], { cwd: REPO, encoding: 'utf8', timeout: 30_000, env: { ...process.env, MTGTABLE_TEST_FAKE_ENGINE: '' } });
  const cases: Array<[string[], RegExp]> = [
    [['--tunnel', 'https://play.example.org', '--lan'], /--tunnel and --lan do not mix/],
    [['--lan', '--tunnel', 'https://play.example.org'], /--tunnel and --lan do not mix/],
    [['--tunnel', 'http://play.example.org'], /--tunnel wants your tunnel's https:\/\/ address/],
    [['--tunnel', 'https://play.example.org/#draft'], /--tunnel wants/],
    [['--tunnel', 'https://play.example.org', '--room-public-url', 'https://other.example.org'], /disagree/],
    [['--engine-only', '--room-public-url', 'https://play.example.org'], /add --draft-room/],
    [['--engine-only', '--draft-room', '--room-public-url', 'https://play.example.org/x'], /must be an origin/],
    [['--engine-only', '--tunnel-config', '/tmp/x.yml'], /goes with --tunnel/],
    [['--tunnel', 'https://play.example.org', '--no-coach'], /drop --no-coach/],
  ];
  for (const [args, want] of cases) {
    const r = run(...args);
    assert.equal(r.status, 1, `${args.join(' ')}: exit ${r.status}\n${r.stdout}${r.stderr}`);
    assert.match(r.stderr, want, args.join(' '));
    assert.doesNotMatch(r.stdout, /== check-forge|== build/, `${args.join(' ')} got as far as the build`);
  }
});
