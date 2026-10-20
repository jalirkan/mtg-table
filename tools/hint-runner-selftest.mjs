#!/usr/bin/env node
// mtg-table — tools/hint-runner-selftest.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The search hint's self-test (D429): tools/hint-runner.mjs and the coach
// helper's /hint route, against a FAKE `coach-grade.sh serve` -- a bash script
// that runs a small Node fake printing the real one's ready line and answering
// each request line by the game id in the moment's header: "slow-..." sleeps
// 1.2 s, "refuse-..." answers refused, "trivial-..." one option, "none-..."
// unsupported, "crash-..." exits.  Everything goes under var/hint-runner-selftest/.
// No Forge, no claude, no network.
//
// What it holds: the request's validation (no field takes the AI's deck; the
// review's own pool / known / game-id rules; stateSeq, inputSeq, budget
// ranges); the moment pinned in the bridge's own log by seq (ok, moved on, not
// there yet, a half-written last line, a finished game); the answer's words
// never stronger than the intervals (best / tie / close / worse; clear only
// when every other option is worse; the runner-up the best tie or close call);
// the request the engine gets (type auto, the frame count, the pool a file,
// the known picks, the budget); the line (D454: only the pick's, every name
// one the moment shows this seat, a planted hidden name withheld); a game between two people refused; the seat;
// supersede (waiting and running); the queue and 429; refused -> 403; a dead
// engine -> 500 and a restart; the default spawn under nice; and the helper's
// route (/health, POST, 405, Origin, --no-hint); and D453's draft room route,
// each seat's hint from its own seat log of the room's game, never the other's.
//
//   node tools/hint-runner-selftest.mjs      # exit 0 iff every check passes; ~10 s
//
// Run from the repo root (hard rule 9).  Gate step 12f; CI.

import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { join, resolve } from 'node:path';
import { checkLine, createHintRunner, hintOf, momentOf, optionVerdict, validateHint, visibleNames } from './hint-runner.mjs';
import { startHelper } from './coach-helper.mjs';
import { checkCreate, createRoomStore, lineCards, startRoomServer } from './draft-room.mjs';

const REL = 'var/hint-runner-selftest';
const DIR = resolve(REL);
rmSync(DIR, { recursive: true, force: true });
mkdirSync(join(DIR, 'games'), { recursive: true });

let checks = 0;
let failures = 0;
const check = (ok, what) => {
  checks++;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- games: a header, a state (seq 5), an input (seq 6), an act ---------------------------------
const header = (id, seat = 0) => JSON.stringify({ v: 1, kind: 'session', gameId: id, seat, decks: [{ player: seat, path: 'decks/x.dck' }] });
const frames = [
  { v: 1, seq: 1, dir: 's2c', type: 'hello_ok', body: { gameId: 'x', you: 0 } },
  { v: 1, seq: 5, dir: 's2c', type: 'state', body: { turn: 3, phase: 'MAIN1', players: [
    { id: 0, zones: { hand: { count: 1, cards: [{ id: 9, zone: 'hand', name: 'Reanimate' }] },
      graveyard: { count: 1, cards: [{ id: 12, zone: 'graveyard', name: 'Griselbrand' }] },
      battlefield: { count: 2, cards: [{ id: 13, zone: 'battlefield', name: 'Memnite' }, { id: 14, zone: 'battlefield', name: 'Crossbones, Malicious Mercenary' }] } } },
    { id: 1, zones: { hand: { count: 1, cards: [{ id: 20, zone: 'hand', owner: 1, controller: 1, hidden: true }] },
      battlefield: { count: 1, cards: [{ id: 21, zone: 'battlefield', faceDown: true, name: '', setCode: '???' }] } } }] } },
  { v: 1, seq: 6, dir: 's2c', type: 'input', body: { prompt: 'Priority: You' } },
  { v: 1, seq: 2, dir: 'c2s', type: 'act', body: { action: 'clickCard', cardId: 9 } },
].map((f) => JSON.stringify(f));
const game = (id, seat = 0) => {
  mkdirSync(join(DIR, 'games', id), { recursive: true });
  writeFileSync(join(DIR, 'games', id, 'frames.jsonl'), `${header(id, seat)}\n${frames.join('\n')}\n`);
};
for (const id of ['g1', 'g2', 'g3', 'slow-1', 'slow-2', 'slow-3', 'refuse-1', 'trivial-1', 'none-1', 'crash-1', 'friend-m1234567890123',
  'leak-1', 'leakid-1', 'other-1']) game(id);
game('seat1', 1);
// D453: a table of two writes a log per seat (D402); the room asks for one seat's alone.
game('friend-m1234567890123-seat0', 0);
game('friend-m1234567890123-seat1', 1);

// --- the fake coach-grade.sh serve ----------------------------------------------------------------
const FAKE_JS = join(DIR, 'fake-serve.mjs');
writeFileSync(FAKE_JS, `// A fake \`coach-grade.sh serve\` for hint-runner-selftest.mjs.  Not the grader.
import { appendFileSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
if (process.argv[2] !== 'serve') { console.error('not serve'); process.exit(2); }
if (process.env.FAKE_BOOT_FAIL) { console.error('COACH-GRADE FAILED: no engine'); process.exit(2); }
console.log('[noise] Forge prints to stderr, but a stray line here is skipped');
console.log(JSON.stringify({ ready: true }));
const rl = createInterface({ input: process.stdin });
const opt = (token, winRate, regret, lo, hi, best, n = 8, extra = {}) => ({ token, label: token + ' label', forge: false, n, winRate, winLo: winRate - 0.1, winHi: winRate + 0.1, regret, regretLo: lo, regretHi: hi, best, ...extra });
rl.on('line', async (line) => {
  const q = JSON.parse(line);
  appendFileSync(${JSON.stringify(join(DIR, 'requests.jsonl'))}, line + '\\n');
  const text = readFileSync(q.log, 'utf8');
  const head = JSON.parse(text.split('\\n')[0]);
  const id = head.gameId;
  const nFrames = text.trim().split('\\n').length - 1;
  const base = { id: q.id, v: 1, type: 'spell', turn: 3, phase: 'MAIN1', seat: head.seat, opponent: q.oppPool ? 'pool:' + q.oppPool + ' minus ...' : 'unknown', ownDeck: 'deck:decks/x.dck', frame: q.frame, wallMs: 3100 };
  if (id.startsWith('slow-')) await new Promise((r) => setTimeout(r, 1200));
  if (id.startsWith('crash-')) process.exit(3);
  let a;
  if (id.startsWith('refuse-')) a = { id: q.id, v: 1, status: 'refused', error: 'live analysis does not take the opponent deck list' };
  else if (id.startsWith('none-')) a = { id: q.id, v: 1, status: 'unsupported', error: 'no decision the analysis grades is open here', frame: q.frame };
  else if (id.startsWith('trivial-')) a = { ...base, status: 'trivial', options: [{ token: 'pass', label: 'pass', forge: true }], line: [], lineFor: 'pass', lineStop: 'passed' };
  else a = { ...base, status: 'ok', measure: 'leaf', rounds: 6, playouts: 30, best: 'cast:9', forgeChoice: 'pass', landFirst: 4, nFrames,
    lineFor: id.startsWith('other-') ? 'pass' : 'cast:9', lineStop: 'passed',
    line: [{ kind: 'target', text: 'Reanimate → Griselbrand', ids: [9, 12] }, { kind: 'sacrifice', text: 'sacrifice → Crossbones, Malicious Mercenary', ids: [14] },
      { kind: 'x', text: 'X = 3', ids: [] },
      // PLANTED (leak-1): a name the seat was never shown, in the text; (leakid-1) behind the id of a hidden stub
      ...(id.startsWith('leak-') ? [{ kind: 'target', text: 'Reanimate → Lightning Bolt', ids: [9] }] : []),
      ...(id.startsWith('leakid-') ? [{ kind: 'choose', text: 'choose → Lightning Bolt', ids: [20] }] : []),
      { kind: 'then', text: 'then equip an unseen card → Memnite', ids: [13] }],
    options: [opt('pass', 0.50, 0.04, 0.01, 0.07, false, 8, { forge: true }), opt('cast:9', 0.54, 0, 0, 0.02, true),
      opt('cast:10', 0.52, 0.02, -0.01, 0.05, false), { token: 'cast:11', label: 'x', forge: false, alias: 'cast:10', n: 8, winRate: 0.52 }] };
  console.log(JSON.stringify(a));
});
`);
const FAKE = join(DIR, 'fake-grade.sh');
writeFileSync(FAKE, `#!/usr/bin/env bash\n# A fake tools/coach-grade.sh for hint-runner-selftest.mjs.\nexec node ${JSON.stringify(FAKE_JS)} "$@"\n`);
chmodSync(FAKE, 0o755);

const mk = (extra = {}) => createHintRunner({ repoRoot: process.cwd(), gamesDir: `${REL}/games`, workDir: `${REL}/work`, script: FAKE,
  prefix: [], waitLogMs: 200, log: () => {}, ...extra });
const requests = () => (existsSync(join(DIR, 'requests.jsonl')) ? readFileSync(join(DIR, 'requests.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []);
const pool = Array.from({ length: 40 }, (_, i) => [2, `Card Number ${String.fromCharCode(65 + (i % 26))}${i}`]);

// 1. Validation.
console.log('validation');
const v = (q) => validateHint(q);
check(v({ gameId: 'g1', stateSeq: 5 }).req?.budgetMs === 3000, 'a plain request: the budget defaults to 3000 ms');
const deck = v({ gameId: 'g1', stateSeq: 5, oppDeck: 'decks/doom-legion.dck' });
check(!deck.req && /AI's deck is never accepted/.test(deck.problems[0]), 'oppDeck: refused, and the refusal says the AI\'s deck is never accepted');
check(!v({ gameId: 'g1', stateSeq: 5, oppDeckPublic: true }).req, 'oppDeckPublic: refused (no field marks a list public here)');
check(!v({ gameId: 'g1' }).req && !v({ gameId: 'g1', stateSeq: 0 }).req && !v({ gameId: 'g1', stateSeq: 1.5 }).req, 'stateSeq: required, a whole number from 1');
check(!v({ gameId: 'g1', stateSeq: 5, inputSeq: 'x' }).req && v({ gameId: 'g1', stateSeq: 5, inputSeq: 6 }).req?.inputSeq === 6, 'inputSeq: optional, a whole number');
check(!v({ gameId: 'g1', stateSeq: 5, budgetMs: 1000 }).req && !v({ gameId: 'g1', stateSeq: 5, budgetMs: 7000 }).req
  && v({ gameId: 'g1', stateSeq: 5, budgetMs: 6000 }).req?.budgetMs === 6000, 'budgetMs: 1500-6000');
check(!v({ gameId: '../x', stateSeq: 5 }).req && !v({ gameId: 'a/b', stateSeq: 5 }).req, 'the game id: the review\'s rule (no traversal)');
check(!v({ gameId: 'g1', stateSeq: 5, oppPool: [[40, 'Swamp']] }).req, 'a pool under 80 cards (a deck): refused, the review\'s rule');
check(v({ gameId: 'g1', stateSeq: 5, oppPool: pool, oppKnown: ['Shock'] }).req?.pool.length === 40, 'a cube pool and known picks: taken');
check(!v({ gameId: 'g1', stateSeq: 5, seat: 2 }).req && !v([]).req && !v(null).req, 'seat 0|1; the body an object');

// 2. The moment.
console.log('the moment');
const T = `${header('g1')}\n${frames.join('\n')}\n`;
const m = momentOf(T, 5, 6);
check(m.state === 'ok' && m.frames === 4 && m.seat === 0 && m.text === T, 'the log at the board\'s state and input: ok, every frame (acts too), the header\'s seat');
check(momentOf(T, 5).state === 'ok', 'without inputSeq: the state alone');
check(momentOf(T, 4).state === 'moved' && momentOf(T, 5, 3).state === 'moved', 'a newer state or input in the log: moved on');
check(momentOf(T, 9).state === 'behind' && momentOf(T, 5, 8).state === 'behind', 'a state or input the log has not reached: behind');
check(momentOf(`${T}{"v":1,"seq":7,"dir":"s2c","type":"sta`, 5, 6).state === 'ok' && momentOf(`${T}{"v":1,"seq":7,"dir":"s2c","type":"sta`, 5, 6).frames === 4,
  'a half-written last line is not read');
check(momentOf(`${T}{"v":1,"seq":7,"dir":"s2c","type":"over","body":{}}\n`, 5, 6).state === 'moved', 'a finished game: moved on');
check(momentOf('{"v":1}\n', 5).state === 'bad' && momentOf('', 5).state === 'bad', 'no session header: bad');

// 3. The words.
console.log('the words');
const o = (regret, lo, best = false, n = 8) => ({ token: 't', n, winRate: 0.5, regret, regretLo: lo, best });
check(optionVerdict(o(0, 0, true)) === 'best' && optionVerdict(o(0.003, 0)) === 'tie' && optionVerdict(o(0.03, 0)) === 'close'
  && optionVerdict(o(0.03, 0.01)) === 'worse' && optionVerdict(o(0.03, 0.01, false, 0)) === 'not-graded',
  'best; a regret under 0.005 a tie; an interval including zero close; excluding it worse; no playouts not graded');
const g0 = { status: 'ok', measure: 'leaf', rounds: 4, playouts: 12, opponent: null, options: [
  { token: 'attack:none', label: 'no attack', n: 4, winRate: 0.4, regret: 0.1, regretLo: 0.02, regretHi: 0.2, best: false },
  { token: 'attack:1,2', label: 'attack with both', n: 4, winRate: 0.5, regret: 0, regretLo: 0, regretHi: 0, best: true }] };
const h0 = hintOf(g0, { gameId: 'g1', seat: 0, stateSeq: 5, inputSeq: 6, frame: 4, budgetMs: 3000 });
check(h0.pick === 'attack:1,2' && h0.strength === 'clear' && h0.runnerUp === undefined && h0.options[0].token === 'attack:1,2'
  && h0.options[1].verdict === 'worse', 'every other option worse: the pick is clear, no runner-up, the best first');
check(h0.knowledge.opponentModel === 'basic-lands' && h0.measure === 'leaf', 'no pool: knowledge says basic lands; the measure says leaf');
const g1 = { ...g0, opponent: 'pool:x minus', options: [...g0.options, { token: 'attack:1', label: 'attack with one', n: 4, winRate: 0.48, regret: 0.02, regretLo: 0, regretHi: 0.05, best: false }] };
const h1 = hintOf(g1, { gameId: 'g1', seat: 0, stateSeq: 5, frame: 4, budgetMs: 3000 });
check(h1.strength === 'close' && h1.runnerUp === 'attack:1' && h1.knowledge.opponentModel === 'pool',
  'a close call among the others: too close to call, that option named as the runner-up');
const g2 = { ...g0, options: [...g1.options, { token: 'attack:2', label: 'attack with two', n: 4, winRate: 0.499, regret: 0.001, regretLo: 0, regretHi: 0.01, best: false }] };
check(hintOf(g2, { gameId: 'g1', seat: 0, stateSeq: 5, frame: 4, budgetMs: 3000 }).runnerUp === 'attack:2', 'a tie outranks a close call as the runner-up');
const gt = hintOf({ status: 'trivial', options: [{ token: 'pass', label: 'pass' }] }, { gameId: 'g1', seat: 0, stateSeq: 5, frame: 4, budgetMs: 3000 });
check(gt.pick === 'pass' && gt.strength === 'only', 'one legal option: picked, strength "only"');
const gu = hintOf({ status: 'unsupported', error: 'no decision' }, { gameId: 'g1', seat: 0, stateSeq: 5, frame: 4, budgetMs: 3000 });
check(gu.status === 'unsupported' && gu.pick === undefined && /no decision/.test(gu.message), 'unsupported: no pick, the reason');

// 3b. The line (D454): only names the moment shows this seat; a planted hidden name fails it.
console.log('the line');
const ST = JSON.parse(frames[1]).body;
const vis = visibleNames(ST);
check(vis.get(9) === 'Reanimate' && vis.get(14) === 'Crossbones, Malicious Mercenary' && !vis.has(20) && !vis.has(21),
  'the visible names: the seat\'s cards and public ones; never a hidden stub or a face-down card without its face');
const okLine = [{ kind: 'target', text: 'Reanimate → Griselbrand', ids: [9, 12] }, { kind: 'sacrifice', text: 'sacrifice → Memnite, an unseen card', ids: [13] },
  { kind: 'x', text: 'X = 2', ids: [] }, { kind: 'choose', text: 'choose → Crossbones, Malicious Mercenary, a token', ids: [14] },
  { kind: 'trigger', text: 'Memnite trigger → the opponent', ids: [13] }, { kind: 'mode', text: 'mode → Destroy target artifact.', ids: [] },
  { kind: 'then', text: 'then cast Reanimate', ids: [9] }, { kind: 'number', text: 'number = 4', ids: [] }];
const cl = checkLine(okLine, ST);
check(cl.ok && cl.line.length === 8, `every shape of step passes when it names only visible cards (${cl.why ?? ''})`);
const bad = (step) => checkLine([step], ST);
check(!bad({ kind: 'target', text: 'Reanimate → Lightning Bolt', ids: [9] }).ok, 'PLANTED: a hidden card\'s name in the text fails the line');
check(!bad({ kind: 'choose', text: 'choose → Lightning Bolt', ids: [20] }).ok, 'PLANTED: a name behind a hidden stub\'s id fails the line');
check(!bad({ kind: 'choose', text: 'choose → an unseen card', ids: [21] }).ok, 'a face-down card\'s id fails the line (it is not shown by name)');
check(!bad({ kind: 'target', text: 'Reanimate → Griselbrand', ids: [9] }).ok && !bad({ kind: 'target', text: 'Reanimate → Memnite', ids: [9, 12] }).ok,
  'a visible name its ids do not list, or an id its text does not name: fails');
check(!bad({ kind: 'mode', text: 'mode → Reanimate', ids: [9] }).ok && !bad({ kind: 'whatever', text: 'X = 1', ids: [] }).ok
  && !bad({ kind: 'x', text: 'X = three', ids: [] }).ok, 'a mode lists no ids; an unknown kind or shape fails');
check(!checkLine(Array.from({ length: 9 }, () => ({ kind: 'x', text: 'X = 1', ids: [] })), ST).ok, 'more than 8 steps: fails');
const gl = { ...g0, line: okLine.slice(0, 2), lineFor: 'attack:1,2', lineStop: 'applied' };
const hl = hintOf(gl, { gameId: 'g1', seat: 0, stateSeq: 5, frame: 4, budgetMs: 3000, state: ST });
check(hl.line?.length === 2 && hl.lineStop === 'applied' && hl.line[0].text === 'Reanimate → Griselbrand', 'the pick\'s line rides on the answer');
check(hintOf({ ...gl, lineFor: 'attack:none' }, { gameId: 'g1', seat: 0, stateSeq: 5, frame: 4, budgetMs: 3000, state: ST }).line === undefined,
  'a line for another option than the pick: withheld');
check(hintOf({ ...gl, line: [{ kind: 'target', text: 'Reanimate → Lightning Bolt', ids: [9] }] }, { gameId: 'g1', seat: 0, stateSeq: 5, frame: 4, budgetMs: 3000, state: ST }).line === undefined,
  'PLANTED through hintOf: the line is withheld, and lineWithheld names no card');

// 4. The runner against the fake engine.
console.log('the runner');
const hr = mk();
check(hr.health().hint === 1 && hr.health().hintEngine === 'idle' && hr.health().hintBudgetMs.max === 6000, '/health: hint 1, engine idle until the first hint');
const r1 = await hr.post({ gameId: 'g1', seat: 0, stateSeq: 5, inputSeq: 6, oppPool: pool, oppKnown: ['Shock', 'Lightning Bolt'], budgetMs: 2500 });
check(r1.status === 200 && r1.body.kind === 'search-hint' && r1.body.status === 'ok' && r1.body.pick === 'cast:9' && r1.body.strength === 'close'
  && r1.body.runnerUp === 'cast:10' && r1.body.landFirst === 4 && r1.body.forgeChoice === 'pass', `an answer: the pick, too close to call, the runner-up, the land first (${JSON.stringify(r1.body).slice(0, 160)})`);
check(r1.body.options.find((x) => x.token === 'cast:10')?.same?.[0] === 'cast:11' && !r1.body.options.some((x) => x.token === 'cast:11'),
  'another copy of a card: reported under the option it is the same as');
check(r1.body.knowledge.opponentModel === 'pool' && r1.body.stateSeq === 5 && r1.body.budgetMs === 2500 && typeof r1.body.wallMs === 'number',
  'the knowledge used, the moment and the budget in the answer');
const q1 = requests().at(-1);
check(q1.type === 'auto' && q1.frame === 4 && q1.budgetMs === 2500 && q1.log === `${REL}/work/moment.jsonl` && q1.oppPool === `${REL}/work/pool.txt`
  && Array.isArray(q1.oppKnown) && q1.oppKnown[1] === 'Lightning Bolt' && q1.oppDeck === undefined && q1.deck === undefined,
  'the engine is asked type auto at the log\'s frame count, the moment a file of the hint\'s own, the pool a file, no deck field');
check(readFileSync(join(DIR, 'work', 'pool.txt'), 'utf8').split('\n')[0] === '2 Card Number A0', 'the pool file: "n Name" lines');
check(hr.health().hintEngine === 'ready', 'the engine stays up for the next hint');
const r2 = await hr.post({ gameId: 'g1', stateSeq: 5 });
check(r2.status === 200 && r2.body.knowledge.opponentModel === 'basic-lands', 'no pool: basic lands, said in the answer');
check(r1.body.line?.length === 4 && r1.body.line[1].text === 'sacrifice → Crossbones, Malicious Mercenary' && r1.body.lineStop === 'passed',
  'the engine\'s line for the pick rides on the answer, checked against the moment in the bridge\'s own log');
for (const id of ['leak-1', 'leakid-1']) {
  const lk = await hr.post({ gameId: id, stateSeq: 5 });
  check(lk.status === 200 && lk.body.pick === 'cast:9' && lk.body.line === undefined && typeof lk.body.lineWithheld === 'string'
    && !JSON.stringify(lk.body).includes('Lightning Bolt'), `PLANTED (${id}): a line naming a card the seat cannot see is withheld, the hint still answers, the name appears nowhere`);
}
const ot = await hr.post({ gameId: 'other-1', stateSeq: 5 });
check(ot.status === 200 && ot.body.line === undefined && /not the pick/.test(ot.body.lineWithheld ?? ''), 'a line for another option: withheld');
check((await hr.post({ gameId: 'friend-m1234567890123', stateSeq: 5 })).status === 403, 'a game between two people: 403');
check((await hr.post({ gameId: 'friend-m1234567890123-seat0', seat: 0, stateSeq: 5 })).status === 403
  && (await hr.post({ gameId: 'friend-m1234567890123-seat0', seat: 0, stateSeq: 5 }, { room: 'yes' })).status === 403,
  "a seat's log of a game between two people, without the draft room's own option: 403");
const fr0 = await hr.post({ gameId: 'friend-m1234567890123-seat0', seat: 0, stateSeq: 5 }, { room: true });
check(fr0.status === 200 && fr0.body.gameId === 'friend-m1234567890123-seat0' && fr0.body.seat === 0 && fr0.body.status === 'ok',
  "D453: the draft room's call (room: true) for seat 0's own log: answered");
check((await hr.post({ gameId: 'friend-m1234567890123-seat1', seat: 0, stateSeq: 5 }, { room: true })).status === 400,
  "the room's call naming seat 1's log for seat 0: 400 (the header's seat decides)");
check((await hr.post({ gameId: 'nope', stateSeq: 5 })).status === 404, 'no such game: 404');
check((await hr.post({ gameId: 'seat1', seat: 0, stateSeq: 5 })).status === 400, 'a seat other than the log\'s: 400');
const mv = await hr.post({ gameId: 'g1', stateSeq: 4 });
check(mv.status === 409 && mv.body.code === 'moved-on', 'the game moved on: 409 moved-on');
const t0 = Date.now();
const ny = await hr.post({ gameId: 'g1', stateSeq: 9 });
check(ny.status === 409 && ny.body.code === 'not-yet' && Date.now() - t0 >= 190, 'a moment the log has not reached: waited for, then 409 not-yet');
const rf = await hr.post({ gameId: 'refuse-1', stateSeq: 5 });
check(rf.status === 403 && rf.body.status === 'refused', 'the live guard refuses: 403 refused');
const tv = await hr.post({ gameId: 'trivial-1', stateSeq: 5 });
check(tv.status === 200 && tv.body.status === 'trivial' && tv.body.pick === 'pass' && Array.isArray(tv.body.line) && tv.body.line.length === 0,
  'one option: trivial, picked; its line rides too (empty: nothing to choose)');
const nn = await hr.post({ gameId: 'none-1', stateSeq: 5 });
check(nn.status === 200 && nn.body.status === 'unsupported' && !nn.body.pick, 'no decision the analysis grades: unsupported');

// Supersede: the same game, three requests; the first runs, the second waits, the third replaces it.
console.log('supersede and the queue');
const s1 = hr.post({ gameId: 'slow-1', stateSeq: 5 });
await sleep(100);
const s2 = hr.post({ gameId: 'slow-1', stateSeq: 5 });
const s3 = hr.post({ gameId: 'slow-1', stateSeq: 5 });
const [a1, a2, a3] = await Promise.all([s1, s2, s3]);
check(a2.status === 409 && a2.body.code === 'superseded', 'a waiting hint replaced by a newer one for the same game: 409 superseded at once');
check(a1.status === 409 && a1.body.code === 'superseded', 'a running hint a newer one replaced: 409 superseded when it ends');
check(a3.status === 200 && a3.body.status === 'ok', 'the newest gets the answer');
const hq = mk({ queueMax: 1 });
const x1 = hq.post({ gameId: 'slow-2', stateSeq: 5 });
await sleep(100);
const x2 = hq.post({ gameId: 'slow-3', stateSeq: 5 });
const x3 = await hq.post({ gameId: 'g2', stateSeq: 5 });
check(x3.status === 429, 'other games past the queue: 429');
check((await x1).status === 200 && (await x2).status === 200, 'the ones in the queue are answered in turn');
hq.close();

// A dead engine.
console.log('a dead engine');
const cr = await hr.post({ gameId: 'crash-1', stateSeq: 5 });
check(cr.status === 500 && /stopped/.test(cr.body.message), 'the engine dies mid-hint: 500, says so');
const after = await hr.post({ gameId: 'g3', stateSeq: 5 });
check(after.status === 200 && after.body.status === 'ok', 'the next hint starts the engine again');
hr.close();
check(hr.health().hintEngine === 'idle', 'close() stops the engine');
const bf = createHintRunner({ repoRoot: process.cwd(), gamesDir: `${REL}/games`, workDir: `${REL}/work`, script: FAKE, prefix: [], log: () => {}, env: { FAKE_BOOT_FAIL: '1' } });
const bfr = await bf.post({ gameId: 'g1', stateSeq: 5 });
check(bfr.status === 503 && /stopped while starting/.test(bfr.body.message), 'an engine that cannot start: 503, with its last line');
const off = mk({ available: () => false });
check(off.health().hint === 0 && (await off.post({ gameId: 'g1', stateSeq: 5 })).status === 503, 'the bridge not built: hint 0 and 503');
// The default spawn: under nice, detached, the serve command, a Forge home of its own.
let spied = null;
const spy = createHintRunner({ repoRoot: process.cwd(), gamesDir: `${REL}/games`, workDir: `${REL}/work`, log: () => {},
  spawnImpl: (cmd, args, o2) => { spied = { cmd, args, o2 }; throw new Error('spy'); } });
await spy.post({ gameId: 'g1', stateSeq: 5 });
check(spied && spied.cmd === 'nice' && spied.args.join(' ') === '-n 10 bash tools/coach-grade.sh serve' && spied.o2.detached === true
  && spied.o2.env.COACH_GRADE_HOME === 'hint-home', 'the default spawn: nice -n 10 bash tools/coach-grade.sh serve, detached, its own Forge home');

// 5. Through the helper.
console.log('the helper route');
const origins = ['http://127.0.0.1:*'];
const call = (port, method, path, body, headers = {}) => new Promise((res, rej) => {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const r = request({ host: '127.0.0.1', port, method, path, headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...headers } }, (resp) => {
    let t = '';
    resp.on('data', (x) => { t += x; });
    resp.on('end', () => { let j2 = null; try { j2 = JSON.parse(t); } catch { /* not json */ } res({ status: resp.statusCode, body: j2 }); });
  });
  r.on('error', rej);
  if (data) r.write(data);
  r.end();
});
const hint = mk();
const h = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins, timeoutS: 5, hint, log: () => {} });
const port = await h.listen();
const hh = await call(port, 'GET', '/health');
check(hh.status === 200 && hh.body.hint === 1 && hh.body.hintEngine === 'idle' && hh.body.hintBudgetMs?.default === 3000, '/health carries "hint": 1');
const p = await call(port, 'POST', '/hint', { gameId: 'g1', stateSeq: 5, inputSeq: 6 }, { Origin: 'http://127.0.0.1:5173' });
check(p.status === 200 && p.body.pick === 'cast:9', 'POST /hint: 200 with the hint');
check((await call(port, 'GET', '/hint')).status === 405, 'GET /hint: 405');
check((await call(port, 'POST', '/hint', { gameId: 'g1', stateSeq: 5, oppDeck: 'x' })).status === 400, 'an opponent deck through the route: 400');
check((await call(port, 'POST', '/hint', { gameId: 'g1', stateSeq: 5 }, { Origin: 'http://evil.example' })).status === 403, 'another Origin: 403');
check((await call(port, 'POST', '/hint', { gameId: 'friend-m1234567890123-seat0', seat: 0, stateSeq: 5 })).status === 403,
  "the helper's own door: a seat's log of a game between two people is still 403 (D453 goes through the room)");
h.close();
const h2 = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins, timeoutS: 5, hint: null, log: () => {} });
const port2 = await h2.listen();
check((await call(port2, 'GET', '/health')).body.hint === 0 && (await call(port2, 'POST', '/hint', { gameId: 'g1', stateSeq: 5 })).status === 503,
  '--no-hint: "hint": 0 and 503');
h2.close();

// 6. D453: through the draft room's listener, wired as the coach helper wires it (hint.post(q, {room: true})).
console.log('the draft room route (D453)');
{
  const rh = mk();
  const cards = Array.from({ length: 240 }, (_, i) => `Cube Card ${i + 1}`);
  const store = createRoomStore({ dir: null, log: () => {},
    startGame: async () => ({ ok: true, matchId: 'm1234567890123', tablePort: 8646 }), gameRunning: () => true,
    hint: (q) => rh.post(q, { room: true }), hintOn: () => rh.available() });
  const srv = startRoomServer({ store, port: 0, origins, log: () => {}, pollMs: 3_600_000 });
  const rport = await srv.listen();
  const c = {};
  checkCreate({ cubeId: 'c', cards, name: 'Justin', firstSeat: 0 }, c);
  const mkr = store.create(c);
  const rid = mkr.body.id;
  store.join(rid, 1, 'Sam');
  for (let v = store.view(rid, 0); !v.done; v = store.view(rid, 0)) {
    store.pick(rid, v.toAct, [0, 1, 2, 3, 4, 5].find((l) => l !== v.firstLine && lineCards(v.slots, l).length > 0), v.version);
  }
  const picks = store.view(rid, 0).seats.map((x) => x.picks);
  for (const seat of [0, 1]) store.deck(rid, seat, { name: 'D', main: [...picks[seat].slice(0, 23).map((n) => [1, n]), [17, 'Plains']] });
  for (let i = 0; i < 200 && store.view(rid, 0).game?.state !== 'ready'; i++) await sleep(5);
  check(store.view(rid, 1).hint === 1 && store.view(rid, 0).game?.matchId === 'm1234567890123', 'the game is on, and the state says the hint can answer');
  for (const [seat, token] of [[0, mkr.body.token], [1, mkr.body.friendToken]]) {
    const before = requests().length;
    const a = await call(rport, 'POST', `/room/${rid}/hint`, { stateSeq: 5, inputSeq: 6 }, { 'X-Room-Token': token });
    const q = requests().slice(before);
    const moment = readFileSync(join(DIR, 'work', 'moment.jsonl'), 'utf8');
    check(a.status === 200 && a.body.kind === 'search-hint' && a.body.gameId === `friend-m1234567890123-seat${seat}` && a.body.seat === seat
      && a.body.knowledge.opponentModel === 'pool', `seat ${seat}: its own hint, from its own log, the opponent modelled from the room's pool`);
    check(q.length === 1 && JSON.parse(moment.split('\n')[0]).gameId === `friend-m1234567890123-seat${seat}`, `seat ${seat}: the engine read seat ${seat}'s log and no other`);
    const poolTxt = readFileSync(join(DIR, 'work', 'pool.txt'), 'utf8');
    check(!picks[seat].some((n) => poolTxt.includes(`1 ${n}\n`)) && JSON.stringify(q[0].oppKnown) === JSON.stringify(picks[1 - seat]),
      `seat ${seat}: the pool leaves out its own picks; the known cards are the other seat's picks`);
  }
  const no = await call(rport, 'POST', `/room/${rid}/hint`, { stateSeq: 5 });
  check(no.status === 403, 'no seat token: 403, loopback or not');
  srv.close();
  rh.close();
}

rmSync(DIR, { recursive: true, force: true });
console.log(`hint-runner-selftest ${failures ? 'FAILED' : 'OK'} (${checks} checks, ${failures} failure(s))`);
process.exit(failures ? 1 : 0);
