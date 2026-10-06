// mtg-table — scripts/tunnel/policy.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE TUNNEL POLICY, in one place (D405, docs/cloudflare.md).  What a Cloudflare
// Tunnel in front of this machine may carry, and what it must never carry, as
// data that three things read:
//
//   - scripts/tunnel/config.yml.example, the cloudflared config Justin copies
//     (web/test/tunnel.test.ts requires that its ingress list is exactly
//     `expectedIngress()` -- the template cannot drift from this file);
//   - checkConfig(), which tunnel-check.sh runs over the config cloudflared will
//     actually use (~/.cloudflared/config.yml, or --config);
//   - tunnel-check.mjs's probes, which hit every NEVER path and port from outside
//     (or from this machine with the tunnel's Host) before a session.
//
// The premise (docs/security/endpoints.md, headline risk 1): cloudflared runs on
// this machine and connects to every origin FROM 127.0.0.1, so whatever the
// tunnel forwards arrives as loopback.  The bridge's LanGate and the coach
// helper both trust loopback.  So the tunnel may point only at a listener that
// trusts nobody by address: the draft room's (8644, D400: a seat token on every
// room route) and, once Phase 2 lands, the table's game seat (a token per seat
// per game, its own port -- a PLACEHOLDER below until it is merged).
//
// One hostname, path-routed: the Access cookie is per hostname, and a WebSocket
// upgrade cannot follow Access's login redirect, so the friend's page, its room
// calls and its game seat all live on the one name they logged in to.
//
// No dependencies (a small YAML reader for the config's own shape is below), so
// it runs on any Node 24 with no npm install.

/** The template's hostname; checkConfig() refuses it outside the template. */
export const HOST_PLACEHOLDER = 'play.example.com';

/** The draft room's player listener (D400): every /room/<id> route needs X-Room-Token; `/` is ForgeCoach's public build. */
export const ROOM = Object.freeze({ name: 'draft room (D400)', port: 8644 });

/**
 * The game seat (Phase 2).  A PLACEHOLDER: the port and path are the Phase 2
 * branch's plan (`tablePort` 8646, `/ws` with a per-seat token) and are
 * confirmed only when that lands.  The template carries the rule commented out
 * between the GAME SEAT markers; nothing routes to it until it is uncommented.
 */
export const GAME_SEAT = Object.freeze({ name: 'game seat (Phase 2, placeholder)', port: 8646, path: '^/ws$', placeholder: true });

/** Ports a tunnel rule must never name, and why. */
export const NEVER_PORTS = Object.freeze([
  { port: 8642, name: 'bridge (wsPort)', why: 'LanGate admits any loopback peer with no token, so a tunnel here hands the seat, /observe (your hand) and the site to anyone' },
  { port: 8643, name: 'coach helper (coachPort)', why: '/coach and /vision spend your Claude usage; /match and /engine/start restart the engine; /review returns your games' },
  { port: 8645, name: 'lab runner status', why: 'already public through the lab-status branch; nothing to gain' },
  { port: 5173, name: 'Vite dev server', why: 'serves the personal tier and your spectate recordings (D190)' },
  { port: 4173, name: 'Vite preview', why: 'serves fixtures; a dev tool, never public' },
  { port: 9238, name: 'build-sounds', why: 'a build tool, a run long' },
]);

/**
 * Paths the edge answers 404 itself, before anything reaches an origin --
 * defence in depth: the room listener would 404 them too, but a rule here keeps
 * them dead even if the service line is ever pointed somewhere else.  `ws` is
 * here until Phase 2: the GAME SEAT rule sits above this one, so uncommenting it
 * shadows this entry and nothing else needs editing.
 */
export const DENY_SEGMENTS = Object.freeze([
  'coach', 'vision', 'match', 'engine', 'review', 'eval', 'observe', 'health', 'ws',
  'api', 'personal', 'spectate', 'cards', 'fixtures',
]);

/** cloudflared matches `path` as a regex against the URL path (no query). */
export function denyPath() {
  return `^/(${DENY_SEGMENTS.join('|')})(/.*)?$`;
}

/** `POST /room` makes a room on the coach helper only; on the room listener `/room` itself is never a route. */
export const ROOM_ROOT_DENY = '^/room/?$';

const svc = (port) => `http://127.0.0.1:${port}`;
export const DENY_SERVICE = 'http_status:404';

/** The ingress rules in order, without the catch-all: [{hostname, path, service}]. */
export function expectedIngress(hostname, { gameSeat = false } = {}) {
  const rules = [];
  if (gameSeat) rules.push({ hostname, path: GAME_SEAT.path, service: svc(GAME_SEAT.port) });
  rules.push({ hostname, path: denyPath(), service: DENY_SERVICE });
  rules.push({ hostname, path: ROOM_ROOT_DENY, service: DENY_SERVICE });
  rules.push({ hostname, path: null, service: svc(ROOM.port) });
  return rules;
}

/** Ports a rule may name. */
export function allowedPorts({ gameSeat = false } = {}) {
  return gameSeat ? [ROOM.port, GAME_SEAT.port] : [ROOM.port];
}

/** Paths a probe asks for that must never reach an origin: [{method, path, why}]. */
export const NEVER_PATHS = Object.freeze([
  { method: 'GET', path: '/health', why: 'the bridge/helper health (never tunnelled)' },
  { method: 'POST', path: '/coach', why: 'spends your Claude usage' },
  { method: 'POST', path: '/vision', why: 'spends your Claude usage' },
  { method: 'GET', path: '/match', why: 'the match launcher' },
  { method: 'POST', path: '/match', why: 'restarts the engine on new decks' },
  { method: 'POST', path: '/engine/start', why: 'wakes the engine' },
  { method: 'GET', path: '/review', why: 'your post-game reports' },
  { method: 'POST', path: '/eval', why: 'the win-chance model' },
  { method: 'POST', path: '/room', why: 'only you make rooms, on the helper' },
  { method: 'GET', path: '/observe', why: 'one seat\u2019s view, your hand' },
  { method: 'GET', path: '/personal/', why: 'the personal tier (D190)' },
  { method: 'GET', path: '/spectate/', why: 'your recordings' },
]);

/** The template marks the Phase 2 rule; enableGameSeat uncomments it (the test and the runbook's step). */
export const GAME_SEAT_BEGIN = '# >>> GAME SEAT (Phase 2)';
export const GAME_SEAT_END = '# <<< GAME SEAT';

/** The template's text with the GAME SEAT block uncommented (each `#` that starts a block line removed once). */
export function enableGameSeat(text) {
  const out = [];
  let inside = false;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t.startsWith(GAME_SEAT_BEGIN)) { inside = true; out.push(line); continue; }
    if (t.startsWith(GAME_SEAT_END)) { inside = false; out.push(line); continue; }
    out.push(inside ? line.replace(/^(\s*)# ?/, '$1') : line);
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// A YAML reader for the shape a cloudflared config has: block maps and lists,
// `- key: value` list items, plain / 'single' / "double" scalars, a one-line
// [flow, list], comments.  Anything else (anchors, multi-line strings, tags) is
// an error -- the check would rather refuse a config than misread one.
// ---------------------------------------------------------------------------

function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'") q = c;
    else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function scalar(s, n) {
  s = s.trim();
  if (s.startsWith("'")) {
    if (!s.endsWith("'") || s.length < 2) throw new Error(`line ${n}: unterminated quote`);
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (s.startsWith('"')) {
    if (!s.endsWith('"') || s.length < 2) throw new Error(`line ${n}: unterminated quote`);
    return s.slice(1, -1).replace(/\\(["\\])/g, '$1');
  }
  if (s.startsWith('[')) {
    if (!s.endsWith(']')) throw new Error(`line ${n}: a [flow list] must end on its line`);
    const inner = s.slice(1, -1).trim();
    return inner === '' ? [] : inner.split(',').map((x) => scalar(x, n));
  }
  if (/^[&*!|>{]/.test(s)) throw new Error(`line ${n}: anchors, tags, block strings and flow maps are not read here`);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  if (/^-?[0-9]+$/.test(s)) return Number(s);
  return s;
}

const KEY = /^([A-Za-z0-9_.-]+):(?:\s+(.*))?$/;
const isItem = (t) => t === '-' || t.startsWith('- ');

/** Parses the config's YAML; throws Error('line N: …') on what it does not read. */
export function parseYaml(text) {
  const lines = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const s = stripComment(raw).replace(/\s+$/, '');
    if (s.trim() === '') return;
    const lead = /^[ \t]*/.exec(s)[0];
    if (lead.includes('\t')) throw new Error(`line ${i + 1}: a tab in the indentation`);
    if (s.trim() === '---') return;
    lines.push({ indent: lead.length, text: s.trim(), n: i + 1 });
  });
  let pos = 0;
  const block = () => (isItem(lines[pos].text) ? list(lines[pos].indent) : map(lines[pos].indent));
  function map(indent) {
    const out = {};
    while (pos < lines.length && lines[pos].indent === indent && !isItem(lines[pos].text)) {
      const { text, n } = lines[pos];
      const m = KEY.exec(text);
      if (!m) throw new Error(`line ${n}: expected "key: value", got ${JSON.stringify(text)}`);
      if (Object.hasOwn(out, m[1])) throw new Error(`line ${n}: "${m[1]}" twice`);
      pos++;
      if (m[2] !== undefined && m[2] !== '') out[m[1]] = scalar(m[2], n);
      else if (pos < lines.length && (lines[pos].indent > indent || (lines[pos].indent === indent && isItem(lines[pos].text)))) out[m[1]] = block();
      else out[m[1]] = null;
    }
    if (pos < lines.length && lines[pos].indent > indent) throw new Error(`line ${lines[pos].n}: unexpected indentation`);
    return out;
  }
  function list(indent) {
    const out = [];
    while (pos < lines.length && lines[pos].indent === indent && isItem(lines[pos].text)) {
      const line = lines[pos];
      const rest = line.text === '-' ? '' : line.text.slice(1).trimStart();
      if (rest === '') {
        pos++;
        if (pos >= lines.length || lines[pos].indent <= indent) throw new Error(`line ${line.n}: an empty list item`);
        out.push(block());
      } else if (KEY.test(rest)) {
        const child = indent + (line.text.length - rest.length);
        lines[pos] = { indent: child, text: rest, n: line.n };
        out.push(map(child));
      } else {
        out.push(scalar(rest, line.n));
        pos++;
      }
    }
    if (pos < lines.length && lines[pos].indent > indent) throw new Error(`line ${lines[pos].n}: unexpected indentation`);
    return out;
  }
  if (lines.length === 0) return {};
  const doc = block();
  if (pos < lines.length) throw new Error(`line ${lines[pos].n}: unexpected indentation`);
  return doc;
}

// ---------------------------------------------------------------------------
// The config check.
// ---------------------------------------------------------------------------

const TOP_KEYS = new Set(['tunnel', 'credentials-file', 'ingress', 'originRequest', 'loglevel', 'transport-loglevel', 'logfile',
  'log-directory', 'metrics', 'no-autoupdate', 'autoupdate-freq', 'protocol', 'edge-ip-version', 'retries', 'grace-period', 'region']);
const SERVICE = /^http:\/\/127\.0\.0\.1:([0-9]{1,5})$/;
const PLACEHOLDER = /<[^>]*>|example\.com|your-team/i;

function accessOk(a) {
  return !!a && typeof a === 'object' && a.required === true && typeof a.teamName === 'string' && a.teamName !== ''
    && Array.isArray(a.audTag) && a.audTag.length > 0 && a.audTag.every((x) => typeof x === 'string' && x !== '');
}

function walk(o, f, path = '') {
  if (!o || typeof o !== 'object') return;
  for (const [k, v] of Object.entries(o)) {
    f(k, v, path ? `${path}.${k}` : k);
    walk(v, f, path ? `${path}.${k}` : k);
  }
}

/**
 * Checks a cloudflared config against the policy.
 * opts.template: the shipped template (its placeholders are expected, not problems).
 * Returns {problems: string[], warnings: string[], hostname, gameSeat}.
 */
export function checkConfig(text, { template = false } = {}) {
  const problems = [];
  const warnings = [];
  let doc;
  try {
    doc = parseYaml(text);
  } catch (e) {
    return { problems: [`cannot read the config: ${e.message}`], warnings, hostname: null, gameSeat: false };
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return { problems: ['the config is not a YAML map'], warnings, hostname: null, gameSeat: false };
  for (const k of Object.keys(doc)) {
    if (k === 'warp-routing') problems.push('warp-routing: private-network routing would put your whole LAN behind the tunnel; remove it');
    else if (!TOP_KEYS.has(k)) warnings.push(`unknown top-level key "${k}" (cloudflared may ignore it)`);
  }
  if (typeof doc.tunnel !== 'string' || doc.tunnel === '') problems.push('tunnel: the named tunnel\u2019s UUID is missing');
  if (typeof doc['credentials-file'] !== 'string' || doc['credentials-file'] === '') problems.push('credentials-file: the tunnel\u2019s credentials file is missing');
  walk(doc, (k, _v, p) => {
    if (k === 'httpHostHeader') problems.push(`${p}: never rewrite Host -- the coach helper's D386 Host check is what refuses a mis-pointed tunnel`);
    if (k === 'bastionMode' || k === 'proxyType') problems.push(`${p}: a bastion or proxy mode reaches arbitrary hosts; remove it`);
  });
  const rules = doc.ingress;
  if (!Array.isArray(rules) || rules.length === 0) {
    problems.push('ingress: no rules');
    return { problems, warnings, hostname: null, gameSeat: false };
  }
  if (rules.some((r) => !r || typeof r !== 'object' || Array.isArray(r))) {
    problems.push('ingress: every rule must be a map');
    return { problems, warnings, hostname: null, gameSeat: false };
  }
  const last = rules[rules.length - 1];
  if (last.hostname !== undefined || last.path !== undefined || last.service !== DENY_SERVICE) {
    problems.push(`ingress: the last rule must be the catch-all "- service: ${DENY_SERVICE}" with no hostname or path`);
  }
  const body = rules.slice(0, -1);
  const names = [...new Set(body.map((r) => r.hostname))];
  let hostname = null;
  if (names.length !== 1 || typeof names[0] !== 'string' || names[0] === '') {
    problems.push(`ingress: every rule but the catch-all names the same one hostname (found ${names.map((x) => JSON.stringify(x ?? null)).join(', ') || 'none'})`);
  } else {
    hostname = names[0];
    if (hostname.includes('*')) problems.push(`ingress: hostname ${hostname}: no wildcards -- one name, the one Access protects`);
    if (!template && PLACEHOLDER.test(hostname)) problems.push(`ingress: hostname ${hostname} is still the template's placeholder`);
  }
  const topAccess = accessOk(doc.originRequest?.access);
  const gameSeat = body.some((r) => typeof r.service === 'string' && SERVICE.exec(r.service)?.[1] === String(GAME_SEAT.port));
  const allowed = allowedPorts({ gameSeat });
  body.forEach((r, i) => {
    const where = `ingress rule ${i + 1}`;
    for (const k of Object.keys(r)) if (!['hostname', 'path', 'service', 'originRequest'].includes(k)) problems.push(`${where}: unexpected key "${k}"`);
    if (r.service === DENY_SERVICE) return;
    const m = typeof r.service === 'string' ? SERVICE.exec(r.service) : null;
    if (!m) {
      problems.push(`${where}: service ${JSON.stringify(r.service)} -- only ${DENY_SERVICE} or http://127.0.0.1:<${allowed.join('|')}> (not localhost, not another host, not tcp/ssh/unix)`);
      return;
    }
    const port = Number(m[1]);
    const never = NEVER_PORTS.find((x) => x.port === port);
    if (never) problems.push(`${where}: port ${port} is the ${never.name} -- never through a tunnel: ${never.why}`);
    else if (!allowed.includes(port)) problems.push(`${where}: port ${port} is not on the allowlist (${allowed.join(', ')})`);
    if (!topAccess && !accessOk(r.originRequest?.access)) problems.push(`${where}: no originRequest.access {required: true, teamName, audTag} -- cloudflared must check the Access token itself`);
  });
  if (doc.originRequest?.access !== undefined && !topAccess) problems.push('originRequest.access: needs required: true, a teamName and at least one audTag');
  if (!template) {
    const a = JSON.stringify(doc.originRequest?.access ?? body.map((r) => r.originRequest?.access ?? null));
    if (PLACEHOLDER.test(a)) problems.push('originRequest.access: teamName/audTag are still the template\u2019s placeholders (Zero Trust -> Access -> your application -> Overview: "Application Audience (AUD) Tag")');
    if (typeof doc.tunnel === 'string' && PLACEHOLDER.test(doc.tunnel)) problems.push('tunnel: still the template\u2019s placeholder');
    if (typeof doc['credentials-file'] === 'string' && PLACEHOLDER.test(doc['credentials-file'])) problems.push('credentials-file: still the template\u2019s placeholder');
  }
  if (hostname) {
    const want = expectedIngress(hostname, { gameSeat });
    const got = body.map((r) => ({ hostname: r.hostname, path: r.path ?? null, service: r.service }));
    const show = (xs) => xs.map((x) => `${x.path ?? '(everything else)'} -> ${x.service}`).join('; ');
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      problems.push(`ingress: the rules are not the policy's.\n    want: ${show(want)}\n    got:  ${show(got)}`);
    }
  }
  return { problems, warnings, hostname, gameSeat };
}

// ---------------------------------------------------------------------------
// Verdicts on a probe's answer (pure, so the test can feed them).
// ---------------------------------------------------------------------------

/** Did Cloudflare Access answer instead of the origin?  {status, headers} with lower-case header names. */
export function accessAnswered({ status, headers = {}, body = '' }) {
  const loc = String(headers.location ?? '');
  if (status >= 300 && status < 400 && /cloudflareaccess\.com|\/cdn-cgi\/access\//i.test(loc)) return true;
  if (status !== 401 && status !== 403) return false;
  if (Object.keys(headers).some((h) => h.startsWith('cf-access-'))) return true;
  // Access's own refusal of a non-browser request: Cloudflare's page, not one of our JSON doors ({"code": ...}).
  return /cloudflare/i.test(String(headers.server ?? '')) && !/"code"\s*:/.test(String(body));
}

/** A path that must never reach an origin, asked WITH an Access login: 404 (or 405) and nothing else. */
export function verdictNever({ status }) {
  if (status === 404 || status === 405) return { ok: true, note: `${status}` };
  if (status === 101) return { ok: false, note: '101 -- a WebSocket opened' };
  return { ok: false, note: `${status} -- it reached something` };
}

/** A room route asked without the seat's token: 403 {code:token} or 404 {code:gone}, never 2xx. */
export function verdictRoomNoToken({ status, body = '' }) {
  let code = null;
  try { code = JSON.parse(body).code ?? null; } catch { /* not JSON */ }
  if ((status === 403 && code === 'token') || (status === 404 && code === 'gone')) return { ok: true, note: `${status} ${code}` };
  if (status >= 200 && status < 300) return { ok: false, note: `${status} -- answered without a seat token` };
  return { ok: false, note: `${status}${code ? ` ${code}` : ''} -- not the room listener's refusal (is the tunnel pointed at ${ROOM.port}?)` };
}

/** A WebSocket upgrade with no seat token: anything but 101. */
export function verdictNoUpgrade({ status }) {
  return status === 101 ? { ok: false, note: '101 -- the socket opened with no token' } : { ok: true, note: `${status}` };
}
