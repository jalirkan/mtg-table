#!/usr/bin/env node
// mtg-table — tools/watch-runner-selftest.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The watch runner's self-test (D439): tools/watch-runner.mjs and the coach
// helper's /watch routes, against a FAKE watch -- a small bash script that
// writes match.json, draft.json and a game log the way tools/cubelab.sh watch
// does, at a speed its seed picks (seed 1: done at once; 2: plays until it is
// stopped; 3: dies without saying so).  Everything goes under
// var/watch-runner-selftest/.  No Forge, no network.
//
// What it holds: the body's validation (cube ids from cubes/, never a path;
// seeds in the lab's range; best of 1/3/5/7; players a profile or search;
// unknown fields refused); one watch at a time (409 with the running id); stop
// (200, then match.json says "stopped"); a watch that dies is marked "error";
// the game log served as COMPLETE lines by ?from= and by Range (206, its first
// byte the newline ForgeCoach's live.ts asks for again), 404 before it starts and
// 416 past its end; and the helper's door on every route: /health's "watch",
// 405s, a foreign Origin 403, a foreign Host 403, a tunnel's header 403, the
// preflight allowing Range, --no-watch 503, and -- when this machine has a
// non-loopback address -- a LAN peer without the token 403 and with it 200.
//
//   node tools/watch-runner-selftest.mjs      # exit 0 iff every check passes; ~5 s
//
// Run from the repo root (hard rule 9).  Gate step 12f.

import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { networkInterfaces } from 'node:os';
import { join, resolve } from 'node:path';
import { createWatchRunner, readCompleteLines, validateWatch, WATCH_ID } from './watch-runner.mjs';
import { startHelper } from './coach-helper.mjs';

const DIR = resolve('var/watch-runner-selftest');
rmSync(DIR, { recursive: true, force: true });
const ROOT = join(DIR, 'root');
for (const d of ['cubes', 'forge-home/res/ai', 'var/spectate']) mkdirSync(join(ROOT, d), { recursive: true });
for (const c of ['fair-fight-cube-180', 'pauper-cube-180']) writeFileSync(join(ROOT, 'cubes', `${c}.md`), '# a cube\n');
for (const p of ['Default', 'Reckless']) writeFileSync(join(ROOT, 'forge-home/res/ai', `${p}.ai`), '');

let checks = 0;
let failures = 0;
const check = (ok, what) => {
  checks++;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await sleep(50); } return f(); };

// 1. The body.
console.log('the body');
const ctx = { cubes: ['fair-fight-cube-180', 'pauper-cube-180'], profiles: ['Default', 'Reckless'] };
const ok = validateWatch({ cube: 'fair-fight-cube-180', seed: 7, games: 3, playerA: 'reckless', playerB: 'search-v2', pace: 0 }, ctx).req;
check(ok && ok.id === 'watch-fair-fight-cube-180-7' && ok.playerA === 'Reckless' && ok.playerB === 'search' && ok.pace === 0 && WATCH_ID.test(ok.id), 'a full body: the id, the canonical profile, search');
const dflt = validateWatch({ cube: 'pauper-cube-180.md' }, ctx).req;
check(dflt && dflt.games === 3 && dflt.playerA === 'Default' && dflt.playerB === 'Default' && dflt.pace === 600 && dflt.seed >= 1, 'defaults: best of 3, Default vs Default, 600 ms, a random seed; ".md" accepted');
const bad = (q, what) => check(validateWatch(q, ctx).req === undefined && validateWatch(q, ctx).status === 400, `400: ${what}`);
bad(null, 'no object');
bad({ cube: '../cubes/fair-fight-cube-180' }, 'a path for the cube');
bad({ cube: 'nope-cube' }, 'a cube that is not in cubes/');
bad({ cube: 'fair-fight-cube-180', seed: 0 }, 'seed 0');
bad({ cube: 'fair-fight-cube-180', seed: 900000000 }, 'a reserved seed');
bad({ cube: 'fair-fight-cube-180', seed: 1.5 }, 'a fractional seed');
bad({ cube: 'fair-fight-cube-180', games: 2 }, 'an even best-of');
bad({ cube: 'fair-fight-cube-180', playerA: 'Godlike' }, 'an unknown profile');
bad({ cube: 'fair-fight-cube-180', playerB: 3 }, 'a player that is not a string');
bad({ cube: 'fair-fight-cube-180', pace: 99999 }, 'a pace past 5 s');
bad({ cube: 'fair-fight-cube-180', deck: 'x.dck' }, 'an unknown field');

// 2. Complete lines.
console.log('complete lines');
const f = join(DIR, 'lines.jsonl');
writeFileSync(f, '{"a":1}\n{"b":2}\n{"c":');
const c0 = readCompleteLines(f, 0);
check(c0.status === 200 && c0.body.toString() === '{"a":1}\n{"b":2}\n' && c0.next === 16 && c0.size === 21, 'the half-written last line is not sent');
check(readCompleteLines(f, 8).body.toString() === '{"b":2}\n', 'from a byte offset');
check(readCompleteLines(f, 16).body.length === 0 && readCompleteLines(f, 16).status === 200, 'nothing new: 200, empty');
check(readCompleteLines(f, 99).status === 416, 'past the end: 416');
check(readCompleteLines(join(DIR, 'none.jsonl'), 0).status === 404, 'no file: 404');

// 3. The runner, with a fake watch.
console.log('the runner');
const FAKE = join(DIR, 'fake-watch.sh');
writeFileSync(FAKE, `#!/usr/bin/env bash
# $1 the watch folder, $2 the seed
set -u
dir="$1"; seed="$2"; id="$(basename "$dir")"
m() { printf '%s\\n' "$1" > "$dir/match.json.tmp" && mv "$dir/match.json.tmp" "$dir/match.json"; }
m '{"v":1,"kind":"watch-match","id":"'"$id"'","status":"drafting","games":[],"wins":{"A":0,"B":0,"draws":0},"winner":null,"current":null}'
[ "$seed" = 3 ] && exit 3
printf '{"v":1,"kind":"watch-draft","id":"%s","picks":[]}\\n' "$id" > "$dir/draft.json"
m '{"v":1,"kind":"watch-match","id":"'"$id"'","status":"playing","games":[{"n":1,"file":"'"$id"'-g1.jsonl","status":"playing"}],"wins":{"A":0,"B":0,"draws":0},"winner":null,"current":1}'
printf '{"v":1,"kind":"session","gameId":"%s-g1","seat":0}\\n{"v":1,"seq":1,"type":"hello_ok"}\\n{"v":1,"seq":2,"ty' "$id" > "$dir/$id-g1.jsonl"
if [ "$seed" = 2 ]; then
  trap 'm "{\\"v\\":1,\\"kind\\":\\"watch-match\\",\\"id\\":\\"$id\\",\\"status\\":\\"stopped\\",\\"games\\":[],\\"current\\":null}"; exit 130' TERM
  while :; do sleep 0.1; done
fi
printf 'pe":"over"}\\n' >> "$dir/$id-g1.jsonl"
m '{"v":1,"kind":"watch-match","id":"'"$id"'","status":"done","games":[{"n":1,"file":"'"$id"'-g1.jsonl","status":"done","winner":"A"}],"wins":{"A":1,"B":0,"draws":0},"winner":"A","current":null}'
`);
chmodSync(FAKE, 0o755);
const argvs = [];
const mk = (o = {}) => createWatchRunner({ repoRoot: ROOT, available: () => true, killGraceMs: 1000,
  command: (q, dir) => { argvs.push([q, dir]); return ['bash', FAKE, dir, String(q.seed)]; }, ...o });
const off = createWatchRunner({ repoRoot: ROOT, available: () => false });
check(off.health().watch === 0 && off.post({ cube: 'fair-fight-cube-180' }).status === 503, 'not built: "watch": 0, POST 503');
// the real argv, unfaked: the cube lab's watch, nothing from the request in a path but the checked id
const real = createWatchRunner({ repoRoot: ROOT, available: () => true });
check(typeof real.post === 'function', 'the default runner is built');
const w = mk();
const a = w.post({ cube: 'fair-fight-cube-180', seed: 1, games: 1 });
check(a.status === 202 && a.body.id === 'watch-fair-fight-cube-180-1' && a.body.state === '/watch/watch-fair-fight-cube-180-1', 'POST: 202 and the id');
check(w.post({ cube: 'pauper-cube-180', seed: 5 }).status === 409, 'a second watch while one runs: 409');
check(w.post({ cube: 'pauper-cube-180', seed: 5 }).body.running === 'watch-fair-fight-cube-180-1', '409 names the running watch');
await until(() => w.running() === null);
const done = w.get('watch-fair-fight-cube-180-1');
check(done.status === 200 && done.body.match?.status === 'done' && done.body.draft?.kind === 'watch-draft' && done.body.running === false, 'GET: match.json done, draft.json, not running');
check(w.get('watch-nope-1').status === 404 && w.get('../etc').status === 404 && w.get('watch-x/../../y-1').status === 404, 'an unknown or malformed id: 404');
const g = w.game('watch-fair-fight-cube-180-1', '1');
check(g.status === 200 && g.body.toString().split('\n').length === 4 && g.headers['X-Log-Next'] === String(g.body.length), 'the game log: every complete line, X-Log-Next');
const gr = w.game('watch-fair-fight-cube-180-1', '1', { range: `bytes=${g.body.indexOf('\n')}-` });
check(gr.status === 206 && gr.body[0] === 0x0a && /^bytes \d+-\d+\/\d+$/.test(gr.headers['Content-Range']), 'Range: 206 from the newline asked for, Content-Range');
check(w.game('watch-fair-fight-cube-180-1', '1', { range: `bytes=${g.body.length}-` }).status === 416, 'Range at the end of a finished log: 416');
check(w.game('watch-fair-fight-cube-180-1', '1', { from: '99999' }).status === 416, '?from past the end: 416 (re-recorded)');
check(w.game('watch-fair-fight-cube-180-1', '1', { from: '-1' }).status === 400, '?from not a number: 400');
check(w.game('watch-fair-fight-cube-180-1', '2').status === 404 && w.game('watch-fair-fight-cube-180-1', '../x').status === 404, 'a game not started, or a bad number: 404');
check(w.list().body.watches.length === 1 && w.list().body.watches[0].status === 'done', 'GET /watch lists it');
// stop
const s = w.post({ cube: 'pauper-cube-180', seed: 2 });
check(s.status === 202, 'a long watch starts');
await until(() => existsSync(join(ROOT, 'var/spectate/watch-pauper-cube-180-2/watch-pauper-cube-180-2-g1.jsonl')));
const live = w.game('watch-pauper-cube-180-2', '1');
check(live.status === 200 && !live.body.toString().includes('"seq":2') && live.body.toString().endsWith('"hello_ok"}\n'), 'while it is written: the half line is held back');
check(w.stop('watch-fair-fight-cube-180-1').status === 409, 'stop a watch that is not running: 409');
check(w.stop('watch-pauper-cube-180-2').status === 200, 'stop the running one: 200');
await until(() => w.running() === null);
check(w.get('watch-pauper-cube-180-2').body.match?.status === 'stopped', 'then match.json says stopped');
// a watch that dies
w.post({ cube: 'pauper-cube-180', seed: 3 });
await until(() => w.running() === null);
const dead = w.get('watch-pauper-cube-180-3').body.match;
check(dead?.status === 'error' && /exited \(code 3\)/.test(dead.error ?? ''), 'a watch that dies is marked error, with why');
// a re-run replaces the folder
writeFileSync(join(ROOT, 'var/spectate/watch-fair-fight-cube-180-1/stale.txt'), 'x');
w.post({ cube: 'fair-fight-cube-180', seed: 1 });
await until(() => w.running() === null);
check(!existsSync(join(ROOT, 'var/spectate/watch-fair-fight-cube-180-1/stale.txt')), 'the same cube and seed again replace the old folder');
check(argvs.every(([q, dir]) => dir === join(ROOT, 'var/spectate', q.id)), 'every run in var/spectate/<id>');
// a command that cannot start frees the slot
const nostart = createWatchRunner({ repoRoot: ROOT, available: () => true, command: () => [join(DIR, 'no-such-program')] });
check(nostart.post({ cube: 'pauper-cube-180', seed: 4 }).status === 202, 'a watch whose program is missing: 202 (spawn fails later)');
await until(() => nostart.running() === null);
check(nostart.running() === null && nostart.get('watch-pauper-cube-180-4').body.match?.status === 'error', 'then the slot is free and match.json says error');

// 4. Through the helper.
console.log('the helper route');
const origins = ['http://127.0.0.1:*'];
const call = (port, method, path, body, headers = {}, host = '127.0.0.1') => new Promise((res, rej) => {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const r = request({ host, port, method, path, headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...headers } }, (resp) => {
    const chunks = [];
    resp.on('data', (x) => chunks.push(x));
    resp.on('end', () => { const t = Buffer.concat(chunks).toString(); let j = null; try { j = JSON.parse(t); } catch { /* not json */ } res({ status: resp.statusCode, body: j, text: t, headers: resp.headers }); });
  });
  r.on('error', rej);
  if (data) r.write(data);
  r.end();
});
const wh = mk();
const h = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins, timeoutS: 5, watch: wh, log: () => {} });
const port = await h.listen();
const hh = await call(port, 'GET', '/health');
check(hh.status === 200 && hh.body.watch === 1 && hh.body.watchRunning === null, '/health carries "watch": 1');
const p = await call(port, 'POST', '/watch', { cube: 'fair-fight-cube-180', seed: 2 });
check(p.status === 202 && p.body.id === 'watch-fair-fight-cube-180-2', 'POST /watch: 202');
check((await call(port, 'POST', '/watch', { cube: 'pauper-cube-180', seed: 9 })).status === 409, 'POST /watch again: 409');
check((await call(port, 'GET', '/health')).body.watchRunning === 'watch-fair-fight-cube-180-2', '/health names the running watch');
await until(() => existsSync(join(ROOT, 'var/spectate/watch-fair-fight-cube-180-2/watch-fair-fight-cube-180-2-g1.jsonl')));
const gg = await call(port, 'GET', '/watch/watch-fair-fight-cube-180-2/game/1', undefined, { Origin: 'http://127.0.0.1:5173' });
check(gg.status === 200 && gg.headers['content-type'].startsWith('application/x-ndjson') && gg.headers['access-control-allow-origin'] === 'http://127.0.0.1:5173'
  && /X-Log-Next/.test(gg.headers['access-control-expose-headers'] ?? ''), 'GET a game: ndjson, the Origin echoed, X-Log-Next exposed');
const nl = gg.text.indexOf('\n');
const g206 = await call(port, 'GET', '/watch/watch-fair-fight-cube-180-2/game/1', undefined, { Range: `bytes=${nl}-` });
check(g206.status === 206 && g206.text.startsWith('\n') && g206.headers['content-range'], 'Range through the route: 206, Content-Range');
check((await call(port, 'GET', '/watch/watch-fair-fight-cube-180-2/game/1?from=0')).text === gg.text, '?from=0 through the route');
const st = await call(port, 'GET', '/watch/watch-fair-fight-cube-180-2');
check(st.status === 200 && st.body.running === true && st.body.match.status === 'playing', 'GET /watch/<id> while it plays');
check((await call(port, 'GET', '/watch')).body.running === 'watch-fair-fight-cube-180-2', 'GET /watch');
check((await call(port, 'PUT', '/watch')).status === 405, 'PUT /watch: 405');
check((await call(port, 'POST', '/watch/watch-fair-fight-cube-180-2', {})).status === 405, 'POST to one watch: 405');
check((await call(port, 'GET', '/watch/watch-fair-fight-cube-180-2/stop')).status === 405, 'GET stop: 405 (a GET never stops)');
check((await call(port, 'GET', '/watch/watch-fair-fight-cube-180-2/other')).status === 404, 'an unknown sub-route: 404');
check((await call(port, 'GET', '/watch', undefined, { Origin: 'http://evil.example' })).status === 403, 'another Origin: 403');
check((await call(port, 'GET', '/watch/watch-fair-fight-cube-180-2/game/1', undefined, { Host: 'evil.example' })).status === 403, 'a foreign Host (DNS rebinding): 403');
check((await call(port, 'GET', '/watch', undefined, { 'CF-Connecting-IP': '1.2.3.4' })).status === 403, "a tunnel's header: 403");
const pre = await call(port, 'OPTIONS', '/watch/watch-fair-fight-cube-180-2/game/1', undefined, { Origin: 'https://jalirkan.github.io', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'range' });
check(pre.status === 204 || pre.status === 403, `the preflight answers (${pre.status})`);
const pre2 = await call(port, 'OPTIONS', '/watch', undefined, { Origin: 'http://127.0.0.1:5173', 'Access-Control-Request-Method': 'GET' });
check(pre2.status === 204 && /Range/.test(pre2.headers['access-control-allow-headers'] ?? ''), 'the preflight allows Range');
check((await call(port, 'POST', '/watch/watch-fair-fight-cube-180-2/stop', {})).status === 200, 'POST stop: 200');
await until(() => wh.running() === null);
check((await call(port, 'GET', '/watch/watch-fair-fight-cube-180-2')).body.match.status === 'stopped', 'stopped through the route');
h.close();
const h2 = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins, timeoutS: 5, watch: null, log: () => {} });
const port2 = await h2.listen();
check((await call(port2, 'GET', '/health')).body.watch === 0 && (await call(port2, 'POST', '/watch', { cube: 'fair-fight-cube-180' })).status === 503, '--no-watch: "watch": 0 and 503');
h2.close();

// 5. A LAN peer (D386's door): without the token 403, with it 200.
const lanIp = Object.values(networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
if (!lanIp) {
  console.log('  SKIP  the LAN peer: no non-loopback IPv4 address');
} else {
  const T = 'watch-selftest-token-0123456789';
  const h3 = startHelper({ port: 0, lan: true, token: T, wsPort: 8642, origins, timeoutS: 5, watch: mk(), log: () => {} });
  const port3 = await h3.listen();
  check((await call(port3, 'GET', '/watch', undefined, { Origin: `http://${lanIp}:8642` }, lanIp)).status === 403, `a LAN peer (${lanIp}) without the token: 403`);
  check((await call(port3, 'GET', '/watch', undefined, { 'X-ForgeCoach-Token': T, Origin: `http://${lanIp}:8642` }, lanIp)).status === 200, 'with the token (from the LAN page): 200');
  check((await call(port3, 'GET', `/watch?token=${T}x`, undefined, { Origin: `http://${lanIp}:8642` }, lanIp)).status === 403, 'a wrong token: 403');
  h3.close();
  const h4 = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins, timeoutS: 5, bindHost: '0.0.0.0', watch: mk(), log: () => {} });
  const port4 = await h4.listen();
  check((await call(port4, 'GET', '/watch', undefined, {}, lanIp)).status === 403, 'a non-loopback peer of a helper without --lan: 403');
  h4.close();
}

console.log(`watch-runner-selftest ${failures ? 'FAILED' : 'OK'} (${checks} checks, ${failures} failure(s))`);
if (existsSync(DIR) && !failures) rmSync(DIR, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
