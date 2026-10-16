#!/usr/bin/env node
// mtg-table — tools/watch-runner-selftest.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The watch runner's self-test (D440): tools/watch-runner.mjs and the coach
// helper's /watch routes, against a FAKE watch -- a small bash script that
// writes match.json, draft.json and a game log the way tools/cubelab.sh watch
// does, at a speed its seed picks (seed 1: done at once; 2: plays until it is
// stopped; 3: dies without saying so; 5: exits on SIGTERM and leaves a child
// that ignores it; 6: ignores SIGTERM itself; 7: gains a line the fake check
// fails; 10: the REAL checker, staged: two lines, more, a planted leak; 11: a
// claude -p in its own group, with a grandchild, under a watch that ignores SIGTERM).  Everything goes under
// var/watch-runner-selftest/.  No Forge, no network.
//
// What it holds: the body's validation (cube ids from cubes/, never a path;
// seeds in the lab's range; best of 1/3/5/7; D443's drafter and player ids,
// an unknown one a 400 listing the known ones, two non-lab drafters refused;
// unknown fields refused); /health's watchDrafters, watchPlayers and
// watchLlmCap; the argv (an llm: drafter's cap only with one); match.json from
// the moment POST answers, kept by a watch that dies; one watch at a time (409 with the running id); stop
// (200, then match.json says "stopped"); a watch that dies is marked "error";
// redaction as served (only lines that passed tools/check-redaction.mjs are sent;
// a log that fails is a 500 from then on, and the watch is stopped with error);
// the cleanup (a new watch keeps the 10 most recent watch folders, --watch-keep);
// the kill escalation (a stop's SIGKILL still reaches a child the leader left
// behind, and close() SIGKILLs a watch that ignores SIGTERM after the grace);
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

import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
check(ok && ok.id === 'watch-fair-fight-cube-180-7' && ok.playerA.id === 'Reckless' && ok.playerB.id === 'search-v2' && ok.playerB.policy === 'search' && ok.pace === 0 && WATCH_ID.test(ok.id), 'a full body: the id, the canonical profile, search');
const dflt = validateWatch({ cube: 'pauper-cube-180.md' }, ctx).req;
check(dflt && dflt.games === 3 && dflt.playerA.id === 'Default' && dflt.playerB.id === 'Default' && dflt.drafterA === 'lab' && dflt.drafterB === 'lab' && !dflt.llm && dflt.pace === 600 && dflt.seed >= 1,
  'defaults: best of 3, lab drafts and Default plays both sides, 600 ms, a random seed; ".md" accepted');
const withLlm = validateWatch({ cube: 'fair-fight-cube-180', drafterB: 'llm:sonnet', playerA: 'search' }, ctx).req;
check(withLlm && withLlm.drafterB === 'llm:sonnet' && withLlm.drafterA === 'lab' && withLlm.llm === true && withLlm.playerA.id === 'search-v2', 'drafterB llm:sonnet; the older "search" still names search-v2');
check(validateWatch({ cube: 'fair-fight-cube-180', drafterA: 'forge-ranks' }, ctx).req?.drafterA === 'forge-ranks', 'drafterA forge-ranks');
const unknownD = validateWatch({ cube: 'fair-fight-cube-180', drafterA: 'llm:opus' }, ctx);
check(unknownD.status === 400 && /"drafterA" is one of lab, forge-ranks, llm:haiku, llm:sonnet/.test(unknownD.message), `400: an unknown drafter id, listing the known ones (${unknownD.message})`);
const unknownP = validateWatch({ cube: 'fair-fight-cube-180', playerB: 'sonnet' }, ctx);
check(unknownP.status === 400 && /"playerB" is one of Default, Reckless, search-v2/.test(unknownP.message), `400: an unknown player id, listing the known ones (${unknownP.message})`);
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
bad({ cube: 'fair-fight-cube-180', drafterA: 'forge-ranks', drafterB: 'llm:sonnet' }, 'two sides that are not lab');
bad({ cube: 'fair-fight-cube-180', drafterB: 'llm:fake' }, 'llm:fake (the CLI\'s only)');
bad({ cube: 'fair-fight-cube-180', drafterA: 'human-picks:/etc/passwd' }, 'human-picks (a path)');
bad({ cube: 'fair-fight-cube-180', drafterA: 'LAB' }, 'a drafter id in another case');
bad({ cube: 'fair-fight-cube-180', playerA: 'llm:sonnet' }, 'a Claude player (RecordMatch seats Forge AIs only)');
// the choices /health lists
const hl = createWatchRunner({ repoRoot: ROOT, available: () => true }).health();
check(JSON.stringify(hl.watchDrafters.map((d) => d.id)) === JSON.stringify(['lab', 'forge-ranks', 'llm:haiku', 'llm:sonnet'])
  && hl.watchDrafters.every((d) => typeof d.label === 'string' && Object.keys(d).every((k) => ['id', 'label', 'costNote'].includes(k)))
  && hl.watchDrafters.filter((d) => d.costNote).map((d) => d.id).join() === 'llm:haiku,llm:sonnet'
  && hl.watchDrafters.every((d) => !d.costNote || (/\$1 and 40 calls a watch/.test(d.costNote) && /confirm/.test(d.costNote))), 'watchDrafters: {id, label, costNote?}, the cost note on the llm ones (the cap, a confirm)');
check(JSON.stringify(hl.watchPlayers.map((p) => p.id)) === JSON.stringify(['Default', 'Reckless', 'search-v2']) && hl.watchPlayers.every((p) => typeof p.label === 'string' && !('costNote' in p)),
  'watchPlayers: the profiles from forge-home/res/ai and search-v2, no Claude seat');
check(JSON.stringify(hl.watchLlmCap) === JSON.stringify({ maxUsd: 1, maxCalls: 40, maxFallbackRate: 0.25 }), 'watchLlmCap: the defaults');
const hl2 = createWatchRunner({ repoRoot: ROOT, available: () => true, llmCap: { maxUsd: 0.5, maxCalls: 20, maxFallbackRate: 0.25 } }).health();
check(hl2.watchLlmCap.maxUsd === 0.5 && /\$0\.50 and 20 calls/.test(hl2.watchDrafters[3].costNote), 'a configured cap is the one /health and the notes say');
let capThrew = false;
try { createWatchRunner({ repoRoot: ROOT, llmCap: { maxUsd: 0, maxCalls: 40, maxFallbackRate: 0.25 } }); } catch { capThrew = true; }
check(capThrew, 'a cap of $0 is refused');

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
printf '{"v":1,"kind":"session","gameId":"%s-g1","seat":0}\\n{"v":1,"seq":1,"type":"hello_ok"}\\n{"v":1,"seq":2,"type":"state"}\\n{"v":1,"seq":3,"ty' "$id" > "$dir/$id-g1.jsonl"
if [ "$seed" = 10 ]; then
  # the REAL checker, staged ($3 holds the stages): a real recording's first two lines (the session
  # line and hello_ok, as every game opens), then its next lines, then a line that leaks
  log="$dir/$id-g1.jsonl"
  cat "$3/two.jsonl" > "$log"
  trap 'exit 130' TERM
  while [ ! -e "$dir/go1" ]; do sleep 0.05; done
  cat "$3/more.jsonl" >> "$log"
  while [ ! -e "$dir/go2" ]; do sleep 0.05; done
  cat "$3/leak.jsonl" >> "$log"
  while :; do sleep 0.1; done
fi
if [ "$seed" = 5 ]; then
  # a leader that exits on TERM, leaving a child (the JVM, say) that ignores it
  bash -c 'trap "" TERM; echo $$ > "$0/straggler.pid"; while :; do sleep 0.1; done' "$dir" &
  trap 'exit 130' TERM
  while :; do sleep 0.1; done
fi
if [ "$seed" = 7 ]; then
  # a game whose log gains a line that fails the redaction check while it is followed
  trap 'm "{\\"v\\":1,\\"kind\\":\\"watch-match\\",\\"id\\":\\"$id\\",\\"status\\":\\"stopped\\",\\"games\\":[{\\"n\\":1,\\"status\\":\\"error\\"}],\\"current\\":null}"; exit 130' TERM
  while [ ! -e "$dir/go" ]; do sleep 0.05; done
  printf 'pe":"state"}\\n{"v":1,"seq":4,"note":"LEAK"}\\n' >> "$dir/$id-g1.jsonl"
  while :; do sleep 0.1; done
fi
if [ "$seed" = 8 ]; then
  # what watch.ts writes when its llm: drafter's fallback stop ends the watch (web/test/cubelab-watch.test.ts runs the real one)
  m '{"v":1,"kind":"watch-match","id":"'"$id"'","status":"error","error":"drafter B (llm:sonnet) stopped the watch -- the fallback stop: 3 of 3 decision(s) fell back","games":[],"current":null,"drafters":{"A":{"drafter":"lab"},"B":{"drafter":"llm:sonnet"}},"cost":{"side":"B","drafter":"llm:sonnet","calls":6,"callErrors":6,"decisions":3,"fallbacks":3,"usd":0,"stopped":"fallbacks"}}'
  exit 1
fi
if [ "$seed" = 6 ]; then echo $$ > "$dir/leader.pid"; trap '' TERM; while :; do sleep 0.1; done; fi
if [ "$seed" = 11 ]; then
  # an llm: drafter's claude -p, in a process group of its own (model.mjs), with a grandchild; the
  # watch ignores SIGTERM, so only the runner's SIGKILL ends it
  echo $$ > "$dir/leader.pid"; trap '' TERM
  node "$3/llm-call.mjs" "$3/claude" "$dir" &
  while :; do sleep 0.1; done
fi
if [ "$seed" = 2 ]; then
  trap 'm "{\\"v\\":1,\\"kind\\":\\"watch-match\\",\\"id\\":\\"$id\\",\\"status\\":\\"stopped\\",\\"games\\":[],\\"current\\":null}"; exit 130' TERM
  while :; do sleep 0.1; done
fi
printf 'pe":"over"}\\n' >> "$dir/$id-g1.jsonl"
m '{"v":1,"kind":"watch-match","id":"'"$id"'","status":"done","games":[{"n":1,"file":"'"$id"'-g1.jsonl","status":"done","winner":"A"}],"wins":{"A":1,"B":0,"draws":0},"winner":"A","current":null}'
`);
chmodSync(FAKE, 0o755);
const argvs = [];
// The fake logs are not frame logs, so the runner's redaction check is a fake too: a log passes unless
// it holds LEAK (the real checker is held at the end, on a real recording and a negative fixture).
const redChecks = [];
const fakeCheck = async (buf) => { redChecks.push(buf.length); return { ok: !buf.includes('LEAK'), out: buf.includes('LEAK') ? '      ! x.jsonl:3: an opponent hand card named Secret Card' : 'PASS' }; };
const mk = (o = {}) => createWatchRunner({ repoRoot: ROOT, available: () => true, killGraceMs: 1000, redactionCheck: fakeCheck,
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
const g = await w.game('watch-fair-fight-cube-180-1', '1');
check(g.status === 200 && g.body.toString().split('\n').length === 5 && g.headers['X-Log-Next'] === String(g.body.length), 'the game log: every complete line, X-Log-Next');
const gr = await w.game('watch-fair-fight-cube-180-1', '1', { range: `bytes=${g.body.indexOf('\n')}-` });
check(gr.status === 206 && gr.body[0] === 0x0a && /^bytes \d+-\d+\/\d+$/.test(gr.headers['Content-Range']), 'Range: 206 from the newline asked for, Content-Range');
check((await w.game('watch-fair-fight-cube-180-1', '1', { range: `bytes=${g.body.length}-` })).status === 416, 'Range at the end of a finished log: 416');
check((await w.game('watch-fair-fight-cube-180-1', '1', { from: '99999' })).status === 416, '?from past the end: 416 (re-recorded)');
check((await w.game('watch-fair-fight-cube-180-1', '1', { from: '-1' })).status === 400, '?from not a number: 400');
check((await w.game('watch-fair-fight-cube-180-1', '2')).status === 404 && (await w.game('watch-fair-fight-cube-180-1', '../x')).status === 404, 'a game not started, or a bad number: 404');
check(w.list().body.watches.length === 1 && w.list().body.watches[0].status === 'done', 'GET /watch lists it');
// stop
const s = w.post({ cube: 'pauper-cube-180', seed: 2 });
check(s.status === 202, 'a long watch starts');
await until(() => existsSync(join(ROOT, 'var/spectate/watch-pauper-cube-180-2/watch-pauper-cube-180-2-g1.jsonl')));
const live = await w.game('watch-pauper-cube-180-2', '1');
check(live.status === 200 && !live.body.toString().includes('"seq":3') && live.body.toString().endsWith('"type":"state"}\n'), 'while it is written: the half line is held back');
check(w.stop('watch-fair-fight-cube-180-1').status === 409, 'stop a watch that is not running: 409');
check(w.stop('watch-pauper-cube-180-2').status === 200, 'stop the running one: 200');
await until(() => w.running() === null);
check(w.get('watch-pauper-cube-180-2').body.match?.status === 'stopped', 'then match.json says stopped');
// a watch that dies
w.post({ cube: 'pauper-cube-180', seed: 3 });
await until(() => w.running() === null);
const dead = w.get('watch-pauper-cube-180-3').body.match;
check(dead?.status === 'error' && /exited \(code 3\)/.test(dead.error ?? ''), 'a watch that dies is marked error, with why');
// kill escalation: the stop's SIGKILL is not cancelled when the leader exits with its group still alive
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
w.post({ cube: 'pauper-cube-180', seed: 5 });
const strag = join(ROOT, 'var/spectate/watch-pauper-cube-180-5/straggler.pid');
await until(() => existsSync(strag) && readFileSync(strag, 'utf8').trim() !== '');
const sp = Number(readFileSync(strag, 'utf8').trim());
check(alive(sp) && w.stop('watch-pauper-cube-180-5').status === 200, 'a watch whose child ignores SIGTERM: stop 200');
await until(() => w.running() === null);
check(alive(sp), 'the leader exited on SIGTERM, its child did not');
await until(() => !alive(sp), 3000);
check(!alive(sp), 'the armed SIGKILL still reached the child after the grace');
// close(): SIGTERM, then SIGKILL after the grace; it resolves once the group is gone
const wc = mk();
wc.post({ cube: 'pauper-cube-180', seed: 6 });
await until(() => existsSync(join(ROOT, 'var/spectate/watch-pauper-cube-180-6/watch-pauper-cube-180-6-g1.jsonl')));
const t0 = Date.now();
await wc.close();
const closedMs = Date.now() - t0;
await until(() => wc.running() === null);
check(closedMs >= 900 && closedMs < 3000 && wc.running() === null, `close() on a watch that ignores SIGTERM: SIGKILL after the grace (${closedMs} ms), then nothing runs`);
check((await mk().close()) === undefined, 'close() with nothing running resolves at once');
// the watch's SIGKILL reaches the claude -p groups its llm: drafter started (their own groups, registered)
const K = join(DIR, 'kill-stage');
mkdirSync(K, { recursive: true });
writeFileSync(join(K, 'claude'), `#!/usr/bin/env bash
[ "\${1:-}" = --help ] && { echo "usage: claude"; exit 0; }
trap '' TERM
echo $$ > claude.pid
bash -c 'trap "" TERM; echo $$ > grand.pid; while :; do sleep 0.1; done' &
cat > /dev/null
while :; do sleep 0.1; done
`);
chmodSync(join(K, 'claude'), 0o755);
writeFileSync(join(K, 'llm-call.mjs'), `import { makeClaudeModel } from ${JSON.stringify(resolve('tools/llm-seat/lib/model.mjs'))};
const m = makeClaudeModel({ model: 'haiku', bin: process.argv[2], cwd: process.argv[3], timeoutS: 120 });
await m.call({ system: 'S', user: 'U' });
`);
const wk = createWatchRunner({ repoRoot: ROOT, available: () => true, killGraceMs: 1000, redactionCheck: fakeCheck, command: (q, dir) => ['bash', FAKE, dir, String(q.seed), K] });
wk.post({ cube: 'pauper-cube-180', seed: 11 });
const kdir = join(ROOT, 'var/spectate/watch-pauper-cube-180-11');
const kpid = (f) => (existsSync(join(kdir, f)) ? Number(readFileSync(join(kdir, f), 'utf8').trim()) || null : null);
const kgroups = () => { try { return readdirSync(join(kdir, '.child-groups')); } catch { return []; } };
await until(() => kpid('claude.pid') && kpid('grand.pid') && kgroups().length === 1, 8000);
const [kc, kg] = [kpid('claude.pid'), kpid('grand.pid')];
check(kc && kg && alive(kc) && alive(kg) && kgroups()[0] === String(kc), 'an llm: call in flight: claude -p and its grandchild run, its own group registered in the watch folder');
await wk.close();
await until(() => !alive(kc) && !alive(kg), 3000);
check(!alive(kc) && !alive(kg), 'the watch\'s SIGKILL (it ignored SIGTERM) reached claude -p\'s own group, the grandchild included');
for (const pid of [kc, kg]) if (pid && pid > 1) { try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } }

// whatever a failed check above left behind is this test's own: never leave it running
for (const f of [strag, join(ROOT, 'var/spectate/watch-pauper-cube-180-6/leader.pid'), join(ROOT, 'var/spectate/watch-pauper-cube-180-11/leader.pid')]) {
  try { const pid = Number(readFileSync(f, 'utf8').trim()); if (pid > 1) { try { process.kill(-pid, 'SIGKILL'); } catch { /* not a group */ } try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } } } catch { /* no file */ }
}
// redaction as served: only lines that passed are sent; a failing prefix is never sent, and stops the watch
const rid = 'watch-pauper-cube-180-7';
w.post({ cube: 'pauper-cube-180', seed: 7 });
await until(() => existsSync(join(ROOT, `var/spectate/${rid}/${rid}-g1.jsonl`)));
const n0 = redChecks.length;
const r1 = await w.game(rid, '1');
check(r1.status === 200 && r1.body.toString().endsWith('"type":"state"}\n') && redChecks.length === n0 + 1, 'a live game: its complete lines checked once, then sent');
const r1b = await w.game(rid, '1', { from: String(r1.body.length) });
check(r1b.status === 200 && r1b.body.length === 0 && redChecks.length === n0 + 1, 'nothing new: no second check');
writeFileSync(join(ROOT, `var/spectate/${rid}/go`), '');
await until(() => readFileSync(join(ROOT, `var/spectate/${rid}/${rid}-g1.jsonl`), 'utf8').includes('LEAK'));
const r2 = await w.game(rid, '1', { from: String(r1.body.length) });
check(r2.status === 500 && r2.json?.code === 'redaction-failed' && !/Secret Card/.test(JSON.stringify(r2.json)), 'a line that fails: 500 redaction-failed, and the checker\'s words (a card name) are not in it');
check((await w.game(rid, '1')).status === 500, 'from then on the whole game is refused, from byte 0 too');
await until(() => w.running() === null);
const rm = w.get(rid).body.match;
check(rm?.status === 'error' && /game 1 failed tools\/check-redaction\.mjs as it was served/.test(rm.error ?? '') && !/Secret Card/.test(rm.error), 'the watch was stopped, and match.json says error naming the game (over the watch\'s own "stopped")');
// a game that has only opened (the session line, hello_ok; Forge's first state is ~10 s away): 0 bytes
// passed and no check at all -- not a failure; its first state line is checked and sent
const oid = 'watch-opened-1';
const odir = join(ROOT, 'var/spectate', oid);
mkdirSync(odir, { recursive: true });
writeFileSync(join(odir, `${oid}-g1.jsonl`), '{"v":1,"kind":"session","seat":0}\n{"v":1,"seq":1,"type":"hello_ok"}\n');
const o0 = redChecks.length;
const o1 = await w.game(oid, '1');
const o1r = await w.game(oid, '1', { range: 'bytes=0-' });
check(o1.status === 200 && o1.body.length === 0 && o1.headers['X-Log-Next'] === '0' && o1r.status === 206 && o1r.body.length === 0 && redChecks.length === o0,
  'a game with no state frame yet: 200 / 206 with nothing in it, X-Log-Next 0, the checker never asked');
writeFileSync(join(odir, `${oid}-g1.jsonl`), '{"v":1,"kind":"session","seat":0}\n{"v":1,"seq":1,"type":"hello_ok"}\n{"v":1,"seq":2,"type":"state"}\n', { flag: 'w' });
const o2 = await w.game(oid, '1');
check(o2.status === 200 && o2.body.toString().endsWith('"type":"state"}\n') && redChecks.length === o0 + 1, 'its first state frame: checked once, then all three lines sent');

// the real checker, on a real recording and on a negative fixture
const realLog = [];
const real2 = createWatchRunner({ repoRoot: ROOT, available: () => true, command: () => ['true'], log: (x) => realLog.push(x) });
const realDir = join(ROOT, 'var/spectate/watch-real-1');
mkdirSync(realDir, { recursive: true });
writeFileSync(join(realDir, 'watch-real-1-g1.jsonl'), readFileSync(resolve('fixtures/games/g1.jsonl')));
writeFileSync(join(realDir, 'watch-real-1-g2.jsonl'), readFileSync(resolve('fixtures/negative/redaction/a6-opponent-hand-named.jsonl')));
const rg1 = await real2.game('watch-real-1', '1');
check(rg1.status === 200 && rg1.body.length === readFileSync(resolve('fixtures/games/g1.jsonl')).length, 'the real check: a real recording passes and is sent whole');
const half = readFileSync(resolve('fixtures/games/g1.jsonl'));
writeFileSync(join(realDir, 'watch-real-1-g3.jsonl'), half.subarray(0, Math.floor(half.length / 2)));
const rg3 = await real2.game('watch-real-1', '3');
check(rg3.status === 200 && rg3.body.length > 0 && rg3.body.at(-1) === 0x0a, 'the real check: half a recording (a game in progress) passes, whole lines only');
check((await real2.game('watch-real-1', '2')).status === 500 && realLog.some((x) => /REDACTION FAIL on game 2 .*: .*a6-|REDACTION FAIL on game 2 \(\d+ bytes\): (?!see )/.test(x)),
  'the real check: a log that names an opponent\'s hand card is refused, for the checker\'s own reason (on the console only)');
// the REAL checker on a RUNNING watch, as a live game grows: two lines, then more, then a planted leak
// (fixtures/negative/redaction/: baseline.jsonl, and a1-stub-with-a-name.jsonl's leaking state)
const STAGE = join(DIR, 'stage');
mkdirSync(STAGE, { recursive: true });
const base = readFileSync(resolve('fixtures/negative/redaction/baseline.jsonl'), 'utf8').split('\n').filter(Boolean);
const leaky = readFileSync(resolve('fixtures/negative/redaction/a1-stub-with-a-name.jsonl'), 'utf8').split('\n').filter(Boolean);
writeFileSync(join(STAGE, 'two.jsonl'), `${base.slice(0, 2).join('\n')}\n`);
writeFileSync(join(STAGE, 'more.jsonl'), `${base.slice(2, 4).join('\n')}\n`);
// the leaking state, renumbered to follow the two states before it (so the leak is the only fault)
const leakLine = JSON.parse(leaky[2]);
leakLine.seq = JSON.parse(base[3]).seq + 1;
writeFileSync(join(STAGE, 'leak.jsonl'), `${JSON.stringify(leakLine)}\n`);
const liveLog = [];
const wr = createWatchRunner({ repoRoot: ROOT, available: () => true, killGraceMs: 1000, log: (x) => liveLog.push(x),
  command: (q, dir) => ['bash', FAKE, dir, String(q.seed), STAGE] });
const lid = 'watch-pauper-cube-180-10';
const lfile = join(ROOT, `var/spectate/${lid}/${lid}-g1.jsonl`);
check(wr.post({ cube: 'pauper-cube-180', seed: 10 }).status === 202, 'the real checker on a running watch: it starts');
await until(() => existsSync(lfile) && readFileSync(lfile, 'utf8').split('\n').filter(Boolean).length === 2 && readFileSync(lfile, 'utf8').startsWith('{"v":1,"kind":"session"'));
const l1 = await wr.game(lid, '1');
check(l1.status === 200 && l1.body.length === 0 && l1.headers['X-Log-Next'] === '0' && wr.running() === lid && !liveLog.some((x) => /REDACTION FAIL/.test(x)),
  'the real checker: a 2-line prefix (session, hello_ok) is 0 bytes passed, no error, the watch still running');
writeFileSync(join(ROOT, `var/spectate/${lid}/go1`), '');
await until(() => readFileSync(lfile, 'utf8').split('\n').filter(Boolean).length === 4);
const l2 = await wr.game(lid, '1');
check(l2.status === 200 && l2.body.toString() === `${base.slice(0, 4).join('\n')}\n` && wr.running() === lid,
  `the real checker: a healthy 4-line prefix (two states) is served whole (${l2.body.length} bytes), the watch still running`);
writeFileSync(join(ROOT, `var/spectate/${lid}/go2`), '');
await until(() => readFileSync(lfile, 'utf8').split('\n').filter(Boolean).length === 5);
const l3 = await wr.game(lid, '1', { from: String(l2.body.length) });
check(l3.status === 500 && l3.json?.code === 'redaction-failed' && !/Agent Phil Coulson/.test(JSON.stringify(l3.json)),
  'the real checker: the planted leak (a named stub) is a 500 redaction-failed, the card not in it');
await until(() => wr.running() === null);
const lm = wr.get(lid).body.match;
check(wr.running() === null && lm?.status === 'error' && /game 1 failed tools\/check-redaction\.mjs/.test(lm.error ?? '') && liveLog.some((x) => /REDACTION FAIL on game 1 .*leaks extra keys: name/.test(x)),
  'the real checker: the watch is stopped, match.json says error, and the console names A1 (leaks extra keys: name)');
check(!existsSync(join(ROOT, 'var/watch-check')) || readdirSync(join(ROOT, 'var/watch-check')).length === 0, 'the checker\'s scratch copies are gone');
// cleanup: starting a watch keeps only the `keep` most recent watch folders, the new one included
const pruneRoot = join(DIR, 'prune-root');
for (const d of ['cubes', 'var/spectate']) mkdirSync(join(pruneRoot, d), { recursive: true });
writeFileSync(join(pruneRoot, 'cubes', 'pauper-cube-180.md'), '# a cube\n');
for (let k = 1; k <= 5; k++) {
  const d = join(pruneRoot, 'var/spectate', `watch-old-cube-${k}`);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'match.json'), JSON.stringify({ status: 'done', updatedAt: `2026-10-0${k}T00:00:00.000Z` }));
}
mkdirSync(join(pruneRoot, 'var/spectate', 'not-a-watch'), { recursive: true });
writeFileSync(join(pruneRoot, 'var/spectate', 'pacho-vs-doom-1.jsonl'), '');
const pruneLog = [];
const wp = createWatchRunner({ repoRoot: pruneRoot, available: () => true, keep: 3, redactionCheck: fakeCheck, log: (x) => pruneLog.push(x), command: (q, dir) => ['bash', FAKE, dir, '1'] });
wp.post({ cube: 'pauper-cube-180', seed: 1 });
await until(() => wp.running() === null);
const left = readdirSync(join(pruneRoot, 'var/spectate')).sort();
check(JSON.stringify(left) === JSON.stringify(['not-a-watch', 'pacho-vs-doom-1.jsonl', 'watch-old-cube-4', 'watch-old-cube-5', 'watch-pauper-cube-180-1']),
  `keep 3: the new watch and the two most recent old ones stay, the rest go, nothing else is touched (${left.join(', ')})`);
check(pruneLog.filter((x) => /removed \(only the 3 most recent/.test(x)).length === 3, 'each removal is logged');
let threw = false;
try { createWatchRunner({ repoRoot: pruneRoot, keep: 0 }); } catch { threw = true; }
check(threw, 'keep 0 is refused');
// a re-run replaces the folder
writeFileSync(join(ROOT, 'var/spectate/watch-fair-fight-cube-180-1/stale.txt'), 'x');
w.post({ cube: 'fair-fight-cube-180', seed: 1 });
await until(() => w.running() === null);
check(!existsSync(join(ROOT, 'var/spectate/watch-fair-fight-cube-180-1/stale.txt')), 'the same cube and seed again replace the old folder');
check(argvs.every(([q, dir]) => dir === join(ROOT, 'var/spectate', q.id)), 'every run in var/spectate/<id>');
// the command: drafters, players and (only with an llm: drafter) the configured cap reach the watch's argv
const argvSeen = [];
const wa = createWatchRunner({ repoRoot: ROOT, available: () => true, redactionCheck: fakeCheck, llmCap: { maxUsd: 0.75, maxCalls: 30, maxFallbackRate: 0.2 },
  command: (q, dir, args) => { argvSeen.push(args); return ['bash', FAKE, dir, '1']; } });
wa.post({ cube: 'pauper-cube-180', seed: 21, drafterB: 'llm:sonnet', playerA: 'Reckless', playerB: 'search-v2' });
await until(() => wa.running() === null);
wa.post({ cube: 'pauper-cube-180', seed: 22, drafterA: 'forge-ranks' });
await until(() => wa.running() === null);
const flag = (args, k) => args[args.indexOf(k) + 1];
const [a1, a2] = argvSeen;
check(a1[0] === 'watch' && a1[1] === 'cubes/pauper-cube-180.md' && flag(a1, '--drafter-a') === 'lab' && flag(a1, '--drafter-b') === 'llm:sonnet'
  && flag(a1, '--player-a') === 'Reckless' && flag(a1, '--player-b') === 'search-v2'
  && flag(a1, '--llm-max-usd') === '0.75' && flag(a1, '--llm-max-calls') === '30' && flag(a1, '--llm-fallback-rate') === '0.2', `an llm: drafter: its id and the cap in the argv (${a1.join(' ')})`);
check(flag(a2, '--drafter-a') === 'forge-ranks' && !a2.includes('--llm-max-usd') && flag(a2, '--player-a') === 'Default', 'no llm: drafter, no cap flags');
// the fallback stop, as the watch reports it, comes through unchanged
w.post({ cube: 'pauper-cube-180', seed: 8, drafterB: 'llm:sonnet' });
await until(() => w.running() === null);
const fb = w.get('watch-pauper-cube-180-8').body.match;
check(fb?.status === 'error' && /the fallback stop/.test(fb.error) && fb.cost?.fallbacks === 3 && fb.cost?.stopped === 'fallbacks', 'an llm: drafter\'s fallback stop: error with its reason and the cost, as the watch wrote it');
// match.json from the start: a watch that dies before it writes anything still says what it was
const early = createWatchRunner({ repoRoot: ROOT, available: () => true, redactionCheck: fakeCheck, command: () => ['bash', '-c', 'sleep 0.3; exit 4'] });
early.post({ cube: 'pauper-cube-180', seed: 31, games: 5, drafterA: 'forge-ranks', playerB: 'search-v2', pace: 150 });
const m0 = early.get('watch-pauper-cube-180-31').body.match;
check(m0?.status === 'drafting' && m0.cube?.title === 'a cube' && m0.cube?.file === 'cubes/pauper-cube-180.md' && m0.seed === 31 && m0.bestOf === 5 && m0.need === 3 && m0.paceMs === 150
  && m0.players?.A?.player === 'Default' && m0.players?.B?.player === 'search' && m0.players?.B?.policy === 'search' && m0.drafters?.A?.drafter === 'forge-ranks'
  && !Number.isNaN(Date.parse(m0.startedAt)) && m0.cost === null && Array.isArray(m0.games), 'match.json the moment POST answers: cube, seed, best of, pace, players, drafters, startedAt');
await until(() => early.running() === null);
const m1 = early.get('watch-pauper-cube-180-31').body.match;
check(m1?.status === 'error' && /exited \(code 4\)/.test(m1.error) && m1.cube?.title === 'a cube' && m1.drafters?.A?.drafter === 'forge-ranks' && m1.startedAt === m0.startedAt, 'and when it dies: error, with everything it said at the start');
// a command that cannot start frees the slot
const nostart = createWatchRunner({ repoRoot: ROOT, available: () => true, redactionCheck: fakeCheck, command: () => [join(DIR, 'no-such-program')] });
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
check(Array.isArray(hh.body.watchDrafters) && hh.body.watchDrafters[0]?.id === 'lab' && hh.body.watchPlayers?.at(-1)?.id === 'search-v2' && hh.body.watchLlmCap?.maxUsd === 1, '/health carries watchDrafters, watchPlayers and watchLlmCap');
const p400 = await call(port, 'POST', '/watch', { cube: 'fair-fight-cube-180', drafterA: 'gpt' });
check(p400.status === 400 && /one of lab, forge-ranks, llm:haiku, llm:sonnet/.test(p400.body.message), 'POST /watch with an unknown drafter: 400 naming the known ones');
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
