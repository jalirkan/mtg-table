#!/usr/bin/env node
// mtg-table — scripts/tunnel/tunnel-check.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE PRE-SESSION CHECK for a Cloudflare Tunnel (D405, docs/cloudflare.md).  Run
// it through scripts/tunnel/tunnel-check.sh before you send a friend a link.
// The policy -- what may go through and what must not -- is
// scripts/tunnel/policy.mjs; this file only asks.
//
//   tunnel-check.sh <hostname>            FROM OUTSIDE (a phone hotspot is ideal,
//                                         your home network works too):
//     - the name resolves, and to Cloudflare (not to your own IP);
//     - with no login, every path -- the page, a room, every never-path, a
//       WebSocket -- is answered by Cloudflare Access, never by this machine;
//     - plain http:// never reaches the origin;
//     - nothing answers on the hostname's 8642/8643/8644/8646/5173, nor (with
//       --ip <your public IP>) on your router's;
//     - WITH an Access login (CF_ACCESS_CLIENT_ID + CF_ACCESS_CLIENT_SECRET, a
//       service token; or CF_AUTHORIZATION, the CF_Authorization cookie copied
//       from your browser -- in the environment, never on the command line):
//       every never-path is a 404, a room route without the seat's token is
//       refused (403 token / 404 gone), a foreign Origin is refused, /observe
//       and /ws open no socket.
//
//   tunnel-check.sh --local <hostname>    ON THIS MACHINE, no internet needed:
//     - ~/.cloudflared/config.yml (or --config) against the policy, and, when
//       cloudflared is installed, its own `ingress validate` and `ingress rule`
//       for every never-path (the routing as cloudflared will do it);
//     - each listener's door as the tunnel would reach it -- from 127.0.0.1
//       with Host: <hostname> and Origin: https://<hostname>: the room listener
//       wants a seat token, the coach helper refuses the tunnel's Host (D386);
//     - the owner's doors refuse Cloudflare's headers whatever the Host (D402's
//       TunnelGate on the bridge, D404's `admit` on the coach helper): each of
//       CF-Connecting-IP, CF-Ray and Cf-Access-Jwt-Assertion, with a loopback Host;
//     - the game seat (D402, while a game between two people runs): /ws with no
//       or a wrong seat token opens nothing, /observe opens nothing, and every
//       other path is 404 -- the table serves /ws only; the room's own /ws
//       (passed to the table, D404) opens nothing without a token either;
//     - which ports listen beyond loopback (--lan is not needed for a tunnel).
//
//   tunnel-check.sh --local --funnel <machine>.<tailnet>.ts.net   TAILSCALE FUNNEL (D409,
//   docs/tailscale-funnel.md), on this machine: no cloudflared config; instead
//   `tailscale serve status --json` must route the Funnel name to the room listener
//   alone (`/` -> http://127.0.0.1:8644, nothing else on any Funnel port, no TCP
//   forward, no handler naming a never-port), then the same doors as above, with
//   the ts.net Host and https:// Origin tailscaled passes through.  Funnel has no
//   login gate: the seat tokens are the only lock.
//
// Exit 0 when nothing FAILed, 1 when something did, 2 on a usage error.  Wrong-
// token probes are few (4) because the room listener counts 10 a minute per
// address before it answers 429.

import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { existsSync, readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GAME_SEAT, NEVER_PATHS, NEVER_PORTS, ROOM, TUNNEL_HEADERS, accessAnswered, checkConfig,
  verdictNever, verdictNoUpgrade, verdictRoomNoToken,
} from './policy.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FAKE_ROOM = 'rAAAAAAAA';   // a well-formed room id no store will have minted twice

// Cloudflare's published IPv4 ranges (https://www.cloudflare.com/ips-v4); only a WARN when outside them.
const CF_V4 = ['173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18', '108.162.192.0/18',
  '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14',
  '172.64.0.0/13', '131.0.72.0/22'];

export function inCloudflareV4(ip) {
  const n = (s) => s.split('.').reduce((a, x) => (a << 8n) | BigInt(Number(x)), 0n);
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return null;
  const v = n(ip);
  return CF_V4.some((c) => {
    const [base, bits] = c.split('/');
    const shift = 32n - BigInt(bits);
    return (v >> shift) === (n(base) >> shift);
  });
}

function configPorts() {
  try {
    const c = JSON.parse(readFileSync(join(REPO, 'config.json'), 'utf8'));
    return { ws: c.wsPort ?? 8642, coach: c.coachPort ?? 8643, room: c.roomPort ?? ROOM.port };
  } catch {
    return { ws: 8642, coach: 8643, room: ROOM.port };
  }
}

// ---------------------------------------------------------------------------
// Asking.
// ---------------------------------------------------------------------------

/**
 * One request, never following a redirect.  {status, headers, body} or {error}.
 * target: {url} (http/https) or {port, path, host} (127.0.0.1 with that Host).
 * upgrade: send a WebSocket upgrade; a 101 is reported as status 101 and the socket closed.
 */
export function ask({ url, port, path = '/', host, method = 'GET', headers = {}, upgrade = false, body, timeoutMs = 8000 }) {
  return new Promise((done) => {
    const h = { 'user-agent': 'mtg-table tunnel-check (D405)', ...headers };
    if (upgrade) Object.assign(h, { connection: 'Upgrade', upgrade: 'websocket', 'sec-websocket-version': '13', 'sec-websocket-key': randomBytes(16).toString('base64') });
    let opts;
    let lib = http;
    if (url) {
      const u = new URL(url);
      lib = u.protocol === 'https:' ? https : http;
      opts = { hostname: u.hostname, port: u.port || undefined, path: u.pathname + u.search, method, headers: h, agent: false };
    } else {
      opts = { hostname: '127.0.0.1', port, path, method, headers: { ...h, host }, agent: false };
    }
    if (body !== undefined) opts.headers['content-type'] = 'application/json';
    let settled = false;
    const finish = (r) => { if (!settled) { settled = true; done(r); } };
    const req = lib.request(opts, (res) => {
      const chunks = [];
      let n = 0;
      res.on('data', (c) => { if (n < 65536) chunks.push(c); n += c.length; });
      res.on('end', () => finish({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', () => finish({ status: res.statusCode, headers: res.headers, body: '' }));
      // An event stream that opened would never end: a status is enough.
      if (/event-stream/.test(String(res.headers['content-type'] ?? ''))) { finish({ status: res.statusCode, headers: res.headers, body: '' }); res.destroy(); }
    });
    req.on('upgrade', (res, socket) => { socket.destroy(); finish({ status: 101, headers: res.headers, body: '' }); });
    req.on('error', (e) => finish({ error: e.code ?? e.message }));
    req.setTimeout(timeoutMs, () => { req.destroy(); finish({ error: 'timeout' }); });
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

/** 'open' | 'closed' | 'timeout' | an error code. */
export function tcp(host, port, timeoutMs = 4000) {
  return new Promise((done) => {
    const s = net.connect({ host, port });
    const end = (r) => { s.destroy(); done(r); };
    s.setTimeout(timeoutMs, () => end('timeout'));
    s.on('connect', () => end('open'));
    s.on('error', (e) => end(e.code === 'ECONNREFUSED' ? 'closed' : (e.code ?? 'error')));
  });
}

// ---------------------------------------------------------------------------
// The checks.
// ---------------------------------------------------------------------------

/**
 * opts: {hostname, local, configPath, room, gameSeat, ip, ports: {ws, coach, room, seat}, env,
 *        cloudflared (path | null), ss (bool), timeoutMs}
 * Returns [{level: 'PASS'|'FAIL'|'WARN'|'SKIP'|'NOTE', name, note}].
 */
export async function runChecks(opts) {
  const out = [];
  const add = (level, name, note = '') => out.push({ level, name, note });
  const ok = (cond, name, note) => add(cond ? 'PASS' : 'FAIL', name, note);
  const host = opts.hostname;
  const ports = { ...configPorts(), seat: GAME_SEAT.port, ...(opts.ports ?? {}) };
  const roomId = opts.room ?? FAKE_ROOM;
  const t = opts.timeoutMs ?? 8000;
  const env = opts.env ?? process.env;

  if (opts.funnel) {
    // D409: Tailscale Funnel -- tailscaled's own routing instead of a cloudflared config.
    const r = opts.serveStatus !== undefined ? { json: opts.serveStatus } : serveStatus(opts.tailscale ?? 'tailscale');
    if (r.error) add('FAIL', 'tailscale serve status', r.error);
    else for (const x of funnelRules(r.json, host, ports.room)) add(x.level, x.name, x.note);
    await localDoors(host, ports, roomId, false, t, add, ok);
    if (opts.ss !== false) binds(ports, add);
    return out;
  }

  // --- the config (always when there is one; required with --local) ---
  const cfgPath = opts.configPath ?? join(homedir(), '.cloudflared', 'config.yml');
  let gameSeat = !!opts.gameSeat;
  if (existsSync(cfgPath)) {
    const r = checkConfig(readFileSync(cfgPath, 'utf8'));
    for (const p of r.problems) add('FAIL', `config ${cfgPath}`, p);
    for (const w of r.warnings) add('WARN', `config ${cfgPath}`, w);
    if (r.problems.length === 0) add('PASS', `config ${cfgPath}`, `the policy's rules${r.gameSeat ? ', game seat on' : ''}`);
    if (r.hostname && r.hostname !== host) add('FAIL', 'config hostname', `the config names ${r.hostname}, you asked about ${host}`);
    gameSeat = gameSeat || r.gameSeat;
    if (opts.cloudflared) cloudflaredRules(opts.cloudflared, cfgPath, host, gameSeat, add);
    else if (opts.local) add('SKIP', 'cloudflared ingress rule', 'cloudflared is not on PATH (--cloudflared <path>)');
  } else {
    add(opts.local ? 'FAIL' : 'SKIP', 'config', `no ${cfgPath} (--config <path>)`);
  }

  if (opts.local) await localDoors(host, ports, roomId, gameSeat, t, add, ok);
  else await outside(host, roomId, gameSeat, opts.ip, t, env, add, ok);

  if (opts.ss !== false) binds(ports, add);
  return out;
}

function cloudflaredRules(bin, cfgPath, host, gameSeat, add) {
  const v = spawnSync(bin, ['tunnel', '--config', cfgPath, 'ingress', 'validate'], { encoding: 'utf8' });
  if (v.error) { add('SKIP', 'cloudflared ingress validate', String(v.error.message)); return; }
  add(v.status === 0 ? 'PASS' : 'FAIL', 'cloudflared ingress validate', v.status === 0 ? 'OK' : (v.stderr || v.stdout).trim().split('\n').pop());
  if (/unused keys/i.test(v.stdout + v.stderr)) add('WARN', 'cloudflared ingress validate', 'cloudflared ignores some keys in the config (run it by hand to see which)');
  const ruleFor = (url) => {
    const r = spawnSync(bin, ['tunnel', '--config', cfgPath, 'ingress', 'rule', url], { encoding: 'utf8' });
    return /service:\s*(\S+)/.exec(r.stdout + r.stderr)?.[1] ?? '?';
  };
  const room = `http://127.0.0.1:${ROOM.port}`;
  const cases = [
    ...[...new Set(NEVER_PATHS.map((p) => p.path))].map((p) => [p, 'http_status:404']),
    ['/ws', gameSeat ? `http://127.0.0.1:${GAME_SEAT.port}` : 'http_status:404'],
    ['/', room], [`/room/${FAKE_ROOM}`, room], [`/room/${FAKE_ROOM}/events`, room],
  ];
  for (const [path, want] of cases) {
    const got = ruleFor(`https://${host}${path}`);
    add(got === want ? 'PASS' : 'FAIL', `route ${path}`, got === want ? got : `goes to ${got}, want ${want}`);
  }
  const other = ruleFor(`https://not-${host}/`);
  add(other === 'http_status:404' ? 'PASS' : 'FAIL', 'route another hostname', other);
}

async function localDoors(host, ports, roomId, gameSeat, t, add, ok) {
  const origin = `https://${host}`;
  const base = { host, headers: { origin }, timeoutMs: t };
  // The room listener: the one thing the tunnel carries today.
  const up = await tcp('127.0.0.1', ports.room, 2000);
  if (up !== 'open') {
    add('WARN', `room listener 127.0.0.1:${ports.room}`, 'not running -- start ./scripts/play.sh --engine-only --draft-room, then run this again');
  } else {
    const site = await ask({ ...base, port: ports.room, path: '/' });
    if (site.status === 200) add('PASS', 'room listener /', '200, ForgeCoach’s site (public bytes)');
    else add('WARN', 'room listener /', `${site.status ?? site.error} -- no site: the friend has no page to open (play.sh fetches it; or --site-dir)`);
    const v = verdictRoomNoToken(await ask({ ...base, port: ports.room, path: `/room/${roomId}` }));
    ok(v.ok, `room listener /room/<id> with no token`, v.note);
    const evil = await ask({ ...base, port: ports.room, path: `/room/${roomId}`, headers: { origin: 'https://evil.example' } });
    ok(evil.status === 403, 'room listener, a foreign Origin', `${evil.status ?? evil.error}`);
    for (const p of NEVER_PATHS) {
      const r = await ask({ ...base, port: ports.room, path: p.path, method: p.method, body: p.method === 'POST' ? {} : undefined });
      const v2 = verdictNever(r);
      ok(v2.ok, `room listener ${p.method} ${p.path}`, v2.note);
    }
  }
  // The coach helper: never tunnelled, and its D386 Host check refuses a tunnel's name.
  const helper = await ask({ host, port: ports.coach, path: '/health', timeoutMs: t });
  if (helper.error) add('PASS', `coach helper 127.0.0.1:${ports.coach}, Host ${host}`, `not answering (${helper.error})`);
  else {
    ok(helper.status === 403, `coach helper 127.0.0.1:${ports.coach}, Host ${host}`, helper.status === 403 ? '403: it refuses a tunnel’s Host (D386)' : `${helper.status} -- it answered a tunnel's Host; never point a tunnel at it`);
    // D404: with a loopback Host too, a request carrying any one of Cloudflare's headers is refused (`admit`, first).
    for (const h of TUNNEL_HEADERS) {
      const r = await ask({ host: `127.0.0.1:${ports.coach}`, port: ports.coach, path: '/health', headers: { [h]: CF_VALUE[h] }, timeoutMs: t });
      ok(r.status === 403, `coach helper, Host 127.0.0.1, ${h}`, r.error ?? (r.status === 403 ? '403: it refuses what came through Cloudflare' : `${r.status} -- it answered a request carrying ${h}: this helper predates D404's refusal (update mtg-table)`));
    }
  }
  // The bridge: it trusts loopback by design, so the config's rules keep the tunnel off it -- and, since
  // D402's TunnelGate, it refuses anything carrying Cloudflare's headers, whatever the Host.
  const bridge = await ask({ host, port: ports.ws, path: '/health', timeoutMs: t });
  if (bridge.error) add('PASS', `bridge 127.0.0.1:${ports.ws}`, `not answering (${bridge.error})`);
  else {
    for (const h of TUNNEL_HEADERS) {
      const r = await ask({ host: `127.0.0.1:${ports.ws}`, port: ports.ws, path: '/health', headers: { [h]: CF_VALUE[h] }, timeoutMs: t });
      if (r.status === 403) { add('PASS', `bridge, Host 127.0.0.1, ${h}`, '403: it refuses what came through Cloudflare (D402)'); continue; }
      if (r.error) { add('FAIL', `bridge, Host 127.0.0.1, ${h}`, r.error); continue; }
      // A table of two (D402): the bridge's own port is a loopback /health and nothing else, without the gate.
      const table = r.status === 200 && /game between two people/.test((await ask({ host: `127.0.0.1:${ports.ws}`, port: ports.ws, path: '/', headers: { [h]: CF_VALUE[h] }, timeoutMs: t })).body ?? '');
      if (table) add('WARN', `bridge, Host 127.0.0.1, ${h}`, `${r.status}: at a table of two the bridge's port answers /health ("ok") even to a tunnel's headers -- it serves nothing else there, and no rule may name it (docs/security/endpoints.md, D408)`);
      else add('FAIL', `bridge, Host 127.0.0.1, ${h}`, `${r.status} -- it answered a request carrying ${h}: this bridge predates D402's TunnelGate (rebuild: ./bridge/build.sh)`);
    }
  }
  if (gameSeat) {
    const seat = await tcp('127.0.0.1', ports.seat, 2000);
    if (seat !== 'open') add('WARN', `game seat 127.0.0.1:${ports.seat}`, 'not running (it exists only while a game between two people runs)');
    else {
      // D402: the table serves /ws by token and nothing else -- no /observe, no /health, no site.
      const v = verdictNoUpgrade(await ask({ ...base, port: ports.seat, path: '/ws', upgrade: true }));
      ok(v.ok, 'game seat /ws with no seat token', v.note);
      const wrong = verdictNoUpgrade(await ask({ ...base, port: ports.seat, path: `/ws?seat=${randomBytes(16).toString('base64url')}`, upgrade: true }));
      ok(wrong.ok, 'game seat /ws with a wrong seat token', wrong.note);
      const obs = verdictNoUpgrade(await ask({ ...base, port: ports.seat, path: '/observe', upgrade: true }));
      ok(obs.ok, 'game seat /observe (a watcher would see a hand)', obs.note);
      for (const p of TABLE_NEVER) {
        const r = await ask({ ...base, port: ports.seat, path: p });
        ok(r.status === 404, `game seat GET ${p}`, r.error ?? (r.status === 404 ? '404: the table serves /ws only' : `${r.status} -- the table port answers more than /ws`));
      }
    }
  }
  // D404: the room's own port passes /ws to the table; without a valid seat token nothing opens there either.
  if (up === 'open') {
    const v = verdictNoUpgrade(await ask({ ...base, port: ports.room, path: '/ws', upgrade: true }));
    ok(v.ok, 'room listener /ws with no seat token (passed to the table)', v.note);
  }
}

/** `tailscale serve status --json`, parsed: {json} or {error}. */
function serveStatus(bin) {
  const r = spawnSync(bin, ['serve', 'status', '--json'], { encoding: 'utf8', timeout: 10000 });
  if (r.error) return { error: `${bin}: ${r.error.code === 'ENOENT' ? 'not installed' : r.error.message}` };
  if (r.status !== 0) return { error: (r.stderr || r.stdout || `exit ${r.status}`).trim().split('\n').pop() };
  const text = r.stdout.trim();
  if (text === '' || text === '{}') return { json: {} };
  try { return { json: JSON.parse(text) }; } catch { return { error: 'its output is not JSON (an old tailscale? 1.52 or later is needed)' }; }
}

/**
 * D409: Tailscale Funnel's routing (tailscaled's ServeConfig, from `tailscale serve status --json`, the background
 * config and every foreground session's) against the policy: on each host:port Funnel is on for, exactly one
 * handler, `/` -> http://127.0.0.1:<room> (or localhost), and no TCP forward; the name asked about among them; no
 * handler anywhere (Funnel or tailnet-only) naming a never-port.  [{level, name, note}].
 */
export function funnelRules(sc, host, roomPort) {
  const out = [];
  const configs = [sc ?? {}, ...Object.values(sc?.Foreground ?? {})];
  const funnel = new Set();
  for (const c of configs) for (const [hp, on] of Object.entries(c.AllowFunnel ?? {})) if (on) funnel.add(hp.toLowerCase());
  const never = new Set(NEVER_PORTS.map((x) => x.port));
  const portOf = (target) => {
    const m = /^(?:https?(?:\+insecure)?:\/\/)?(?:[^/:]+|\[[^\]]+\])?:?(\d+)?/i.exec(String(target ?? ''));
    return m?.[1] ? Number(m[1]) : /^\d+$/.test(String(target)) ? Number(target) : null;
  };
  const roomTarget = new RegExp(`^http://(127\\.0\\.0\\.1|localhost):${roomPort}/?$`, 'i');
  let routed = false;
  for (const c of configs) {
    for (const [port, tcp] of Object.entries(c.TCP ?? {})) {
      const fwd = tcp?.TCPForward;
      if (!fwd) continue;
      const p = portOf(fwd);
      const onFunnel = [...funnel].some((hp) => hp.endsWith(`:${port}`));
      if (onFunnel || never.has(p)) out.push({ level: 'FAIL', name: `funnel TCP :${port}`, note: `a raw TCP forward to ${fwd}${never.has(p) ? ' -- a never-port' : ''}; the policy routes HTTPS / to the room listener only` });
    }
    for (const [hp, web] of Object.entries(c.Web ?? {})) {
      const onFunnel = funnel.has(hp.toLowerCase());
      for (const [path, h] of Object.entries(web?.Handlers ?? {})) {
        const target = h?.Proxy ?? (h?.Path ? `file ${h.Path}` : h?.Text !== undefined ? 'text' : '?');
        const p = h?.Proxy ? portOf(h.Proxy) : null;
        if (p !== null && never.has(p)) { out.push({ level: 'FAIL', name: `serve ${hp}${path}`, note: `-> ${target}: a never-port (${NEVER_PORTS.find((x) => x.port === p).name})${onFunnel ? ', on the public internet' : ''}` }); continue; }
        if (!onFunnel) continue;
        if (path === '/' && h?.Proxy && roomTarget.test(h.Proxy)) {
          if (hp.toLowerCase() === `${host}:443`) routed = true;
          out.push({ level: 'PASS', name: `funnel ${hp}${path}`, note: `-> ${h.Proxy}, the room listener` });
        } else out.push({ level: 'FAIL', name: `funnel ${hp}${path}`, note: `-> ${target}: Funnel may carry / -> http://127.0.0.1:${roomPort} and nothing else` });
      }
    }
  }
  if (!routed) out.push({ level: 'FAIL', name: `funnel https://${host}/`, note: `not routed to http://127.0.0.1:${roomPort} (run: tailscale funnel ${roomPort})` });
  return out;
}

/** Paths the table port must answer 404 (D402): it serves `/ws` and nothing else. */
export const TABLE_NEVER = Object.freeze(['/', '/health', '/observe', '/index.html']);
/** Made-up values for Cloudflare's headers, as a tunnel daemon would add them. */
const CF_VALUE = { 'cf-connecting-ip': '203.0.113.7', 'cf-ray': '8c0ffee000000000-AMS', 'cf-access-jwt-assertion': 'eyJhbGciOiJSUzI1NiJ9.e30.x',
  // D409: what tailscaled's serve/funnel proxy adds.
  'tailscale-funnel-request': '?1', 'tailscale-user-login': 'friend@example.com', 'x-forwarded-for': '203.0.113.7', 'x-forwarded-host': 'pc.tail1234.ts.net' };

async function outside(host, roomId, gameSeat, ip, t, env, add, ok) {
  let addrs = [];
  try {
    addrs = (await lookup(host, { all: true })).map((a) => a.address);
    add('PASS', `DNS ${host}`, addrs.join(', '));
  } catch (e) {
    add('FAIL', `DNS ${host}`, `${e.code ?? e.message} -- the tunnel's DNS route is missing (cloudflared tunnel route dns <tunnel> ${host})`);
    return;
  }
  const v4 = addrs.filter((a) => inCloudflareV4(a) !== null);
  if (v4.length && v4.some((a) => !inCloudflareV4(a))) add('WARN', `DNS ${host}`, `${v4.filter((a) => !inCloudflareV4(a)).join(', ')} is not a Cloudflare address -- is the record proxied (orange cloud) and a tunnel route?`);

  // 1. No login: Access answers everything.
  const url = (p) => `https://${host}${p}`;
  const paths = [{ method: 'GET', path: '/' }, { method: 'GET', path: `/room/${roomId}` }, ...NEVER_PATHS];
  for (const p of paths) {
    const r = await ask({ url: url(p.path), method: p.method, timeoutMs: t, body: p.method === 'POST' ? {} : undefined });
    if (r.error) { add('FAIL', `no login: ${p.method} ${p.path}`, r.error); continue; }
    ok(accessAnswered(r), `no login: ${p.method} ${p.path}`, accessAnswered(r) ? `${r.status}, Cloudflare Access` : `${r.status} -- answered WITHOUT an Access login: Access is not in front of the whole hostname`);
  }
  for (const p of ['/ws', '/observe']) {
    const r = await ask({ url: url(p), upgrade: true, timeoutMs: t });
    ok(r.status !== 101 && (r.error || accessAnswered(r)), `no login: WebSocket ${p}`, r.error ?? `${r.status}${accessAnswered(r) ? ', Cloudflare Access' : ''}`);
  }
  const plain = await ask({ url: `http://${host}/`, timeoutMs: t });
  const toHttps = plain.status >= 300 && plain.status < 400 && /^https:/i.test(String(plain.headers?.location ?? ''));
  ok(!!plain.error || toHttps || accessAnswered(plain), 'plain http://', plain.error ?? `${plain.status} ${plain.headers?.location ?? ''}`.trim());

  // 2. Ports: nothing but Cloudflare's web ports on the name, and nothing on your router.
  const watch = [...new Set([8642, 8643, ROOM.port, GAME_SEAT.port, ...NEVER_PORTS.map((x) => x.port)])];
  for (const port of watch) {
    const s = await tcp(host, port);
    ok(s !== 'open', `${host}:${port}`, s === 'open' ? 'something answers -- the name points at your own IP, not only the tunnel' : s);
  }
  if (ip) {
    for (const port of watch) {
      const s = await tcp(ip, port);
      ok(s !== 'open', `your IP ${ip}:${port}`, s === 'open' ? 'OPEN -- your router forwards this port; remove the forward' : s);
    }
  }

  // 3. With a login: the origin's own refusals.
  const cred = {};
  if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
    cred['cf-access-client-id'] = env.CF_ACCESS_CLIENT_ID;
    cred['cf-access-client-secret'] = env.CF_ACCESS_CLIENT_SECRET;
  } else if (env.CF_AUTHORIZATION) cred.cookie = `CF_Authorization=${env.CF_AUTHORIZATION}`;
  if (!Object.keys(cred).length) {
    add('SKIP', 'with a login', 'set CF_ACCESS_CLIENT_ID + CF_ACCESS_CLIENT_SECRET (a service token) or CF_AUTHORIZATION (your browser’s cookie) to check behind Access');
    return;
  }
  const origin = `https://${host}`;
  const site = await ask({ url: url('/'), headers: { ...cred }, timeoutMs: t });
  if (accessAnswered(site)) { add('FAIL', 'with a login: /', `${site.status} -- Access did not accept the credentials (expired cookie? service token not in the policy?)`); return; }
  if (site.status === 200) add('PASS', 'with a login: /', '200, ForgeCoach’s site');
  else add('WARN', 'with a login: /', `${site.status ?? site.error} -- no site (is play.sh running with --draft-room?)`);
  for (const p of NEVER_PATHS) {
    const v = verdictNever(await ask({ url: url(p.path), method: p.method, headers: { ...cred, origin }, timeoutMs: t, body: p.method === 'POST' ? {} : undefined }));
    ok(v.ok, `with a login: ${p.method} ${p.path}`, v.note);
  }
  const noTok = verdictRoomNoToken(await ask({ url: url(`/room/${roomId}`), headers: { ...cred, origin }, timeoutMs: t }));
  ok(noTok.ok, 'with a login: /room/<id>, no seat token', noTok.note);
  const bad = verdictRoomNoToken(await ask({ url: url(`/room/${roomId}`), headers: { ...cred, origin, 'x-room-token': randomBytes(16).toString('base64url') }, timeoutMs: t }));
  ok(bad.ok, 'with a login: /room/<id>, a wrong seat token', bad.note);
  const pick = verdictRoomNoToken(await ask({ url: url(`/room/${roomId}/pick`), method: 'POST', headers: { ...cred, origin }, body: { line: 0, expect: 0 }, timeoutMs: t }));
  ok(pick.ok, 'with a login: POST /room/<id>/pick, no seat token', pick.note);
  const evil = await ask({ url: url(`/room/${roomId}`), headers: { ...cred, origin: 'https://evil.example' }, timeoutMs: t });
  ok(evil.status === 403, 'with a login: a foreign Origin', `${evil.status ?? evil.error}`);
  const obs = verdictNoUpgrade(await ask({ url: url('/observe'), headers: { ...cred, origin }, upgrade: true, timeoutMs: t }));
  ok(obs.ok, 'with a login: WebSocket /observe', obs.note);
  const ws = await ask({ url: url('/ws'), headers: { ...cred, origin }, upgrade: true, timeoutMs: t });
  const wsv = gameSeat ? verdictNoUpgrade(ws) : verdictNever(ws);
  ok(wsv.ok, `with a login: WebSocket /ws, no seat token${gameSeat ? '' : ' (no game seat yet: 404)'}`, wsv.note);
}

/** Which of our ports listen beyond loopback (ss -ltnH). */
export function bindsFrom(ssText, ports) {
  const wide = new Map();
  for (const line of ssText.split('\n')) {
    const f = line.trim().split(/\s+/);
    const local = f[3];
    if (!local) continue;
    const m = /^(.*):(\d+)$/.exec(local);
    if (!m) continue;
    const port = Number(m[2]);
    const addr = m[1].replace(/^\[|\]$/g, '').replace(/%.*$/, '');
    if (!ports.includes(port)) continue;
    if (/^127\.|^::1$|^::ffff:127\./.test(addr)) continue;
    if (!wide.has(port)) wide.set(port, []);
    wide.get(port).push(addr);
  }
  return wide;
}

function binds(ports, add) {
  let text;
  try { text = execFileSync('ss', ['-ltnH'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { add('SKIP', 'listening ports', '`ss` is not available'); return; }
  const watch = [ports.ws, ports.coach, ports.room, ports.seat, 5173, 4173, 8645];
  const wide = bindsFrom(text, watch);
  if (wide.size === 0) { add('PASS', 'listening ports', 'every mtg-table port is on loopback only (cloudflared reaches loopback; --lan is not needed)'); return; }
  for (const [port, addrs] of wide) {
    const vite = port === 5173 || port === 4173;
    add(vite ? 'FAIL' : 'WARN', `port ${port} on ${addrs.join(', ')}`, vite
      ? 'the Vite server is reachable beyond this machine: it serves private files (D190)'
      : 'reachable from your network (--lan) -- not needed for the tunnel, and every device on the Wi-Fi can try it');
  }
}

// ---------------------------------------------------------------------------
// The command line.
// ---------------------------------------------------------------------------

const USAGE = `usage: scripts/tunnel/tunnel-check.sh [--local] <hostname> [options]

  <hostname>           the public name, e.g. play.example.com
  --local              check this machine only (the config, cloudflared's routing, each door
                       with the tunnel's Host); default: probe from outside through Cloudflare
  --funnel             with --local: Tailscale Funnel instead of Cloudflare (D409) -- tailscaled's
                       routing (tailscale serve status --json) and the doors; <hostname> is the ts.net name
  --tailscale <path>   the tailscale CLI (default: the one on PATH)
  --config <path>      the cloudflared config (default ~/.cloudflared/config.yml)
  --room <id>          a live room's id (from the friend's link, room=...): its routes must refuse no token
  --game-seat          the Phase 2 game seat is routed (on by itself when the config routes /ws)
  --ip <address>       your home's public IP: nothing may answer on it (router port forwards)
  --cloudflared <path> the cloudflared binary (default: the one on PATH)
  --timeout <ms>       per request (default 8000)
  --room-port, --coach-port, --ws-port, --seat-port <n>
                       --local: where the listeners are (default config.json's, and 8646)

  Behind Access (outside mode): CF_ACCESS_CLIENT_ID + CF_ACCESS_CLIENT_SECRET (a service token)
  or CF_AUTHORIZATION (the CF_Authorization cookie from your browser), in the environment.`;

function which(cmd) {
  for (const d of String(process.env.PATH ?? '').split(':')) {
    const p = join(d, cmd);
    if (d && existsSync(p)) return p;
  }
  return null;
}

export function parseArgs(argv) {
  const a = { local: false, funnel: false, tailscale: undefined, hostname: null, configPath: undefined, room: undefined, gameSeat: false, ip: null, cloudflared: undefined, timeoutMs: 8000, ports: {} };
  const port = (v, f) => { const n = Number(v); if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`${f} wants a port`); return n; };
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i];
    const val = () => { if (i + 1 >= argv.length) throw new Error(`${f} needs a value`); return argv[++i]; };
    if (f === '--local') a.local = true;
    else if (f === '--funnel') a.funnel = true;   // D409
    else if (f === '--tailscale') a.tailscale = val();
    else if (f === '--config') a.configPath = val();
    else if (f === '--room') a.room = val();
    else if (f === '--game-seat') a.gameSeat = true;
    else if (f === '--ip') a.ip = val();
    else if (f === '--cloudflared') a.cloudflared = val();
    else if (f === '--timeout') a.timeoutMs = Number(val());
    else if (f === '--room-port') a.ports.room = port(val(), f);
    else if (f === '--coach-port') a.ports.coach = port(val(), f);
    else if (f === '--ws-port') a.ports.ws = port(val(), f);
    else if (f === '--seat-port') a.ports.seat = port(val(), f);
    else if (f === '-h' || f === '--help') return { help: true };
    else if (f.startsWith('-')) throw new Error(`unknown flag ${f}`);
    else if (a.hostname === null) a.hostname = f;
    else throw new Error(`one hostname only (got ${a.hostname} and ${f})`);
  }
  if (!a.hostname) throw new Error('give the public hostname, e.g. play.example.com');
  if (a.funnel && !a.local) throw new Error('--funnel checks this machine: add --local (an outside check through Funnel is not built)');
  a.hostname = a.hostname.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(a.hostname) || !a.hostname.includes('.')) throw new Error(`${a.hostname} is not a hostname`);
  if (a.room !== undefined && !/^r[A-Za-z0-9_-]{8}$/.test(a.room)) throw new Error('--room wants a room id like rAbC12_xY (the room= of a link)');
  if (a.ip !== null && net.isIP(a.ip) === 0) throw new Error(`--ip ${a.ip} is not an IP address`);
  if (!Number.isFinite(a.timeoutMs) || a.timeoutMs < 100) throw new Error('--timeout wants milliseconds');
  return a;
}

async function main() {
  let a;
  try {
    a = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`tunnel-check: ${e.message}\n\n${USAGE}`);
    process.exit(2);
  }
  if (a.help) { console.log(USAGE); return; }
  const cloudflared = a.cloudflared ?? which('cloudflared');
  console.log(`tunnel-check: ${a.funnel ? 'this machine, as Tailscale Funnel reaches it' : a.local ? 'this machine, as the tunnel reaches it' : 'from outside, through Cloudflare'} -- ${a.hostname}\n`);
  const results = await runChecks({ ...a, cloudflared });
  const width = Math.min(52, Math.max(...results.map((r) => r.name.length)));
  for (const r of results) console.log(`${r.level.padEnd(4)}  ${r.name.padEnd(width)}  ${r.note}`);
  const fails = results.filter((r) => r.level === 'FAIL').length;
  const warns = results.filter((r) => r.level === 'WARN').length;
  console.log(`\n${fails ? `${fails} FAILED` : 'nothing failed'}${warns ? `, ${warns} warning${warns === 1 ? '' : 's'}` : ''}.${fails ? ` Do not send the link until these pass (${a.funnel ? 'docs/tailscale-funnel.md' : 'docs/cloudflare.md, "Security checklist"'}).` : ''}`);
  process.exit(fails ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
