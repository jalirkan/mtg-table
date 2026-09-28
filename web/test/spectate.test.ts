/*
 * mtg-table — web/test/spectate.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Spectating: follow mode, end to end, offline** (decisions D118, D120, D122;
 * `docs/evidence/spectate.md`).
 *
 * `./scripts/spectate.sh` records an AI-vs-AI game into `var/spectate/` while
 * the page follows it. Four pieces make that work, and each is pinned here
 * without a JVM:
 *
 *   1. the dev route (`web/src/spectate/devRoute.ts`) serves COMPLETE lines
 *      only, from a byte offset, and answers 404 / 416 for "not yet" and
 *      "re-recorded";
 *   2. the poller (`transport/follow.ts`) reads a file that GROWS under a real
 *      HTTP server — half-written lines included — and hands the frames to a
 *      follow-mode transport, and stops at `over`;
 *   3. the transport (`transport/replay.ts`) plays them on the RECORDER'S clock:
 *      the recorder's `t` gaps, the live edge that waits instead of pausing, and
 *      an ordinary replay once the log has ended;
 *   4. the route is Node-only and dev-only (D92's rule): no browser module
 *      imports it, and `vite.config.ts` mounts it in `configureServer` alone.
 *
 * The growing file is built from real frames — the first lines of the committed
 * `fixtures/games/g1.jsonl` — so every frame the poller parses is one the
 * reducer has already folded a thousand times.
 */

import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import type { Frame } from '../src/protocol.ts';
import { createSpectateMiddleware, MAX_CHUNK_BYTES, readCompleteLines } from '../src/spectate/devRoute.ts';
import { canFollow, LogFollower, logUrlFor, type FollowStatus } from '../src/transport/follow.ts';
import {
  BASE_FRAME_INTERVAL_MS,
  FOLLOW_LIVE_DELAY_MS,
  FOLLOW_MAX_GAP_MS,
  FOLLOW_MIN_GAP_MS,
  LogReplayTransport,
  parseFrameLog,
  parseLogLine,
} from '../src/transport/replay.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const G1 = readFileSync(join(REPO, 'fixtures/games/g1.jsonl'), 'utf8').split('\n').filter((l) => l !== '');

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'mtg-spectate-'));
}

// ---------------------------------------------------------------------------
// 1. The route
// ---------------------------------------------------------------------------

test('route: readCompleteLines sends whole lines only, and says where the next read starts', () => {
  const dir = tempDir();
  try {
    const file = join(dir, 'a.jsonl');
    assert.equal(readCompleteLines(file, 0).status, 404, 'no file yet is a 404 — follow mode reads it as "waiting"');

    writeFileSync(file, '');
    const empty = readCompleteLines(file, 0);
    assert.deepEqual([empty.status, empty.body.length, empty.next], [200, 0, 0]);

    // Line 0, and half of line 1: only line 0 goes out.
    writeFileSync(file, `${G1[0]!}\n${G1[1]!.slice(0, 40)}`);
    const first = readCompleteLines(file, 0);
    assert.equal(first.status, 200);
    assert.equal(first.body.toString('utf8'), `${G1[0]!}\n`);
    assert.equal(first.next, Buffer.byteLength(`${G1[0]!}\n`));

    // The rest of line 1 arrives: the next read, from `next`, is exactly it.
    appendFileSync(file, `${G1[1]!.slice(40)}\n`);
    const second = readCompleteLines(file, first.next);
    assert.equal(second.body.toString('utf8'), `${G1[1]!}\n`);
    assert.equal(second.next, statSync(file).size);

    // Nothing new: an empty 200 that stays where it was.
    const idle = readCompleteLines(file, second.next);
    assert.deepEqual([idle.status, idle.body.length, idle.next], [200, 0, second.next]);

    // Past the end: the file shrank under a reader — it was re-recorded.
    writeFileSync(file, `${G1[0]!}\n`);
    assert.equal(readCompleteLines(file, second.next).status, 416);

    // A cap cuts at the last whole line inside it, never mid-line…
    writeFileSync(file, `${G1[0]!}\n${G1[1]!}\n${G1[2]!}\n`);
    const capped = readCompleteLines(file, 0, Buffer.byteLength(`${G1[0]!}\n${G1[1]!}\n`) + 10);
    assert.equal(capped.body.toString('utf8'), `${G1[0]!}\n${G1[1]!}\n`);
    // …and one line longer than the cap is still delivered, rather than "nothing new" for ever.
    const long = readCompleteLines(file, 0, 16);
    assert.equal(long.body.toString('utf8'), `${G1[0]!}\n${G1[1]!}\n${G1[2]!}\n`);
    assert.ok(MAX_CHUNK_BYTES >= 1024 * 1024);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** A loopback server with the spectate middleware and nothing else; `url` is its origin. */
async function serve(dir: string): Promise<{ server: Server; origin: string }> {
  const middleware = createSpectateMiddleware(REPO, { dir });
  const server = createServer((req, res) => {
    middleware(req, res, () => {
      res.statusCode = 418;
      res.end('not the spectate route');
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address !== null && typeof address === 'object');
  return { server, origin: `http://127.0.0.1:${String(address.port)}` };
}

test('route: the middleware serves one directory, one segment, and passes every other path on', async () => {
  const dir = tempDir();
  const { server, origin } = await serve(dir);
  try {
    writeFileSync(join(dir, 'x-vs-y-7.jsonl'), `${G1[0]!}\n${G1[1]!}\n`);
    const whole = await fetch(`${origin}/spectate/x-vs-y-7.jsonl`);
    assert.equal(whole.status, 200);
    assert.equal(whole.headers.get('cache-control'), 'no-store');
    assert.match(whole.headers.get('content-type') ?? '', /ndjson/);
    assert.equal(await whole.text(), `${G1[0]!}\n${G1[1]!}\n`);
    assert.equal(Number(whole.headers.get('x-log-next')), statSync(join(dir, 'x-vs-y-7.jsonl')).size);

    const tail = await fetch(`${origin}/spectate/x-vs-y-7.jsonl?from=${String(Buffer.byteLength(`${G1[0]!}\n`))}`);
    assert.equal(await tail.text(), `${G1[1]!}\n`);

    assert.equal((await fetch(`${origin}/spectate/not-yet.jsonl`)).status, 404);
    assert.equal((await fetch(`${origin}/spectate/x-vs-y-7.jsonl?from=99999999`)).status, 416);
    assert.equal((await fetch(`${origin}/spectate/x-vs-y-7.jsonl?from=-3`)).status, 400);
    // One segment, `.jsonl`, no traversal — whatever the encoding.
    for (const bad of ['..%2Fconfig.json', '%2e%2e%2fsecret.jsonl', 'sub%2Fa.jsonl', 'a.json', '.hidden.jsonl']) {
      assert.equal((await fetch(`${origin}/spectate/${bad}`)).status, 404, bad);
    }
    // Not ours: handed to the next middleware.
    assert.equal((await fetch(`${origin}/fixtures/games/g1.jsonl`)).status, 418);
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('route: devRoute.ts is Node-only — vite.config.ts mounts it in configureServer alone', () => {
  const src = join(REPO, 'web/src');
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(name) ? [full] : [];
    });
  for (const file of walk(src)) {
    if (file.endsWith('spectate/devRoute.ts')) continue;
    const imports = [...readFileSync(file, 'utf8').matchAll(/^import[^;]*?from\s+'([^']+)'|import\('([^']+)'\)/gm)].map(
      (m) => m[1] ?? m[2] ?? '',
    );
    assert.ok(!imports.some((i) => i.includes('devRoute')), `${file} imports the Node-only spectate route`);
  }
  const config = readFileSync(join(REPO, 'web/vite.config.ts'), 'utf8');
  assert.match(config, /from '\.\/src\/spectate\/devRoute\.ts'/);
  const plugin = config.split('function spectatePlugin')[1]?.split('export default')[0] ?? '';
  assert.match(plugin, /configureServer/);
  assert.doesNotMatch(plugin, /configurePreviewServer/, 'var/spectate/ must never be reachable from `vite preview`');
  // …and the fixtures middleware (which IS in preview) knows nothing of var/.
  const fixtures = config.split('function fixturesPlugin')[1]?.split('/**')[0] ?? '';
  assert.match(fixtures, /configurePreviewServer/, 'the fixtures middleware moved — move this check with it');
  assert.doesNotMatch(fixtures, /spectate|var\/spectate/);
});

test('route: a ?replay= path maps to its URL, and only a spectate recording can be followed', () => {
  assert.equal(logUrlFor('games/g1.jsonl'), '/fixtures/games/g1.jsonl');
  assert.equal(logUrlFor('/games/g1.jsonl'), '/fixtures/games/g1.jsonl');
  assert.equal(logUrlFor('spectate/pacho-shield-vs-doom-legion-7.jsonl'), '/spectate/pacho-shield-vs-doom-legion-7.jsonl');
  assert.equal(canFollow('spectate/a.jsonl'), true);
  assert.equal(canFollow('games/g1.jsonl'), false);
  // The prefix is unambiguous only while fixtures/ has no spectate/ directory.
  assert.ok(!readdirSync(join(REPO, 'fixtures')).includes('spectate'), 'fixtures/spectate/ would shadow the route');
});

// ---------------------------------------------------------------------------
// 2. The poller over a file that grows
// ---------------------------------------------------------------------------

/** Wait until `predicate` holds, polling every 5 ms, or fail after `ms`. */
async function until(predicate: () => boolean, ms = 4000, what = 'condition'): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > ms) assert.fail(`timed out after ${String(ms)} ms waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test('follow: a growing file — waiting, then frames as they are written, half-lines held back, over ends it', async () => {
  const dir = tempDir();
  const { server, origin } = await serve(dir);
  const name = 'grow-1.jsonl';
  const file = join(dir, name);
  const statuses: FollowStatus[] = [];
  let transport: LogReplayTransport | null = null;
  const follower = new LogFollower({
    url: `${origin}/spectate/${name}`,
    intervalMs: 10,
    autoplay: false,
    onTransport: (t) => {
      transport = t;
    },
    onChange: (f) => {
      if (statuses.at(-1) !== f.status) statuses.push(f.status);
    },
  });
  try {
    follower.start();
    await until(() => follower.polls >= 3, 4000, 'three polls of a missing file');
    assert.equal(follower.status, 'waiting');
    assert.equal(transport, null, 'no transport until the session header exists');

    // The recorder writes its header and the first two frames — and half a third.
    const body = G1.slice(1, 40);
    writeFileSync(file, `${G1[0]!}\n${body[0]!}\n${body[1]!}\n${body[2]!.slice(0, 100)}`);
    await until(() => transport !== null, 4000, 'the transport');
    const t = transport as unknown as LogReplayTransport;
    assert.equal(t.live, true);
    assert.equal(t.header?.kind, 'session');
    await until(() => t.total === 2, 4000, 'two frames');
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(t.total, 2, 'a half-written line is never parsed');

    // The rest of that line, and more, as a recorder would.
    appendFileSync(file, `${body[2]!.slice(100)}\n`);
    for (const line of body.slice(3)) appendFileSync(file, `${line}\n`);
    await until(() => t.total === body.length, 4000, 'every appended frame');
    assert.deepEqual(
      t.frames.map((f) => f.seq),
      body.map((l) => (JSON.parse(l) as Frame).seq),
      'the frames arrive complete and in file order',
    );
    assert.equal(follower.status, 'following');

    // The last frame of a recording is `over`: following stops and the
    // transport stops waiting for more.
    appendFileSync(file, `${G1.at(-1)!}\n`);
    await until(() => follower.status === 'ended', 4000, 'the end');
    assert.equal(t.live, false);
    assert.equal(t.frames.at(-1)?.type, 'over');
    const polls = follower.polls;
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(follower.polls, polls, 'no poll after `over`');
    assert.deepEqual(statuses, ['following', 'ended']);
    // The whole file, read in pieces, is the file read at once.
    const whole = parseFrameLog(readFileSync(file, 'utf8'));
    assert.deepEqual(t.frames, whole.frames);
    assert.ok((follower.arrivalLag()?.n ?? 0) > 0);
  } finally {
    follower.stop();
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('follow: a recorder that goes quiet is STALLED (and polled still); a re-recorded file is LOST (and polled no more)', async () => {
  const dir = tempDir();
  const { server, origin } = await serve(dir);
  const file = join(dir, 'quiet.jsonl');
  writeFileSync(file, `${G1[0]!}\n${G1[1]!}\n`);
  const follower = new LogFollower({ url: `${origin}/spectate/quiet.jsonl`, intervalMs: 10, stallMs: 80, autoplay: false });
  try {
    follower.start();
    await until(() => follower.status === 'stalled', 4000, 'a stall');
    assert.match(follower.detail ?? '', /no new frame/);
    const polls = follower.polls;
    await until(() => follower.polls > polls + 2, 4000, 'polling to go on');
    // It comes back: following again.
    appendFileSync(file, `${G1[2]!}\n`);
    await until(() => follower.status === 'following', 4000, 'following again');

    // The file shrinks under the reader: the page's offsets describe another
    // game. That is LOST -- its own status, never `error`'s, whose polls go on
    // (polish-1: the page used to call it "stalled" and keep a live word).
    writeFileSync(file, `${G1[0]!}\n`);
    await until(() => follower.status === 'lost', 4000, 'the 416');
    assert.match(follower.detail ?? '', /restarted/);
    assert.equal(follower.transport?.live, false);
    const lostAt = follower.polls;
    await new Promise((resolve) => setTimeout(resolve, 100)); // ten poll intervals
    assert.equal(follower.polls, lostAt, 'a lost follower polled again');
    assert.equal(follower.status, 'lost', 'a lost follower changed its word');
  } finally {
    follower.stop();
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * **The word the page shows for each status** (polish-1, spectating's skeptic).
 * `followWordOf` and `arenaFollowOf` live in `main.tsx`, which a test cannot
 * import (it mounts the app), so they are EVALUATED FROM THAT FILE'S SOURCE:
 * each body is plain JavaScript under its typed signature. Every status in
 * `FollowStatus` must have a row here, so a new one cannot slip into the
 * `default:` branch's live word unnoticed.
 */
test('follow word: a 416 reads "lost" on the strip and on #story, and the arena gets no live word for it', () => {
  const main = readFileSync(join(REPO, 'web/src/main.tsx'), 'utf8');
  const bodyOf = (name: string): string => {
    const m = new RegExp(`\\nfunction ${name}\\((?:status|word): [^)]*\\): [^{]*\\{([\\s\\S]*?)\\n\\}\\n`).exec(main);
    assert.ok(m !== null, `could not find ${name} in main.tsx — move this test with it`);
    return m[1]!;
  };
  const followWordOf = new Function('status', bodyOf('followWordOf')) as (s: FollowStatus | null) => string | null;
  const arenaFollowOf = new Function('word', bodyOf('arenaFollowOf')) as (w: string | null) => string | null;

  const want: Record<FollowStatus, string> = {
    waiting: 'following',
    following: 'following',
    stalled: 'stalled',
    error: 'stalled', // a failed poll is retried: gone quiet, not gone
    ended: 'finished',
    stopped: 'finished',
    lost: 'lost',
  };
  const followTs = readFileSync(join(REPO, 'web/src/transport/follow.ts'), 'utf8');
  const union = /export type FollowStatus = ([^;]+);/.exec(followTs)?.[1] ?? '';
  const statuses = [...union.matchAll(/'([a-z]+)'/g)].map((m) => m[1]!);
  assert.ok(statuses.length >= 7, `could not read FollowStatus from follow.ts (${union})`);
  assert.deepEqual([...statuses].sort(), Object.keys(want).sort(), 'FollowStatus changed: give every status its word here');
  assert.equal(followWordOf(null), null, 'an ordinary replay has no word');
  for (const status of statuses) {
    assert.equal(followWordOf(status as FollowStatus), want[status as FollowStatus], `followWordOf('${status}')`);
  }
  // The arena's three words have none for `lost`: it gets none at all, and
  // every other word unchanged.
  assert.equal(arenaFollowOf('lost'), null);
  for (const w of ['following', 'stalled', 'finished', null]) assert.equal(arenaFollowOf(w), w);
  assert.match(main, /follow=\{arenaFollowOf\(followWord\)\}/, 'the arena is handed its follow word through arenaFollowOf');

  // The strip (the app bar's FollowChip): `lost` is its own case, says so, and
  // carries no "●" -- the dot is the live word.
  const chip = main.split('function FollowChip(')[1]?.split('\nfunction ')[0] ?? '';
  const lostCase = chip.split("case 'lost':")[1]?.split('case ')[0] ?? '';
  assert.ok(lostCase.length > 0, 'FollowChip has no `lost` case');
  assert.match(lostCase, /recording lost/);
  assert.doesNotMatch(lostCase, /●/, 'a lost follow still shows the live dot');
});

// ---------------------------------------------------------------------------
// 3. The recorder's clock
// ---------------------------------------------------------------------------

/** Real g1 frames, re-stamped so frame i was written at `stamps[i]`. */
function stamped(stamps: number[], from = 1): Frame[] {
  return stamps.map((t, i) => ({ ...(JSON.parse(G1[from + i]!) as Frame), t }));
}

/**
 * Drive a follow-mode transport through a timeline in 50 ms steps: at each step
 * the frames whose `arrive` time it is are appended (a poll bringing them), and
 * the `at` actions run. Returns when each frame was applied, relative to `base`.
 */
function timeline(
  ctx: { mock: { timers: { tick(ms: number): void } } },
  t: LogReplayTransport,
  base: number,
  until: number,
  arrivals: Array<{ at: number; frames: Frame[] }>,
  actions: Array<{ at: number; run: () => void }> = [],
): void {
  for (let now = 0; now <= until; now += 50) {
    for (const a of actions) if (a.at === now) a.run();
    for (const a of arrivals) if (a.at === now) t.append(a.frames);
    ctx.mock.timers.tick(0);
    if (now < until) ctx.mock.timers.tick(50);
  }
  void base;
}

test('pace: LIVE — each frame plays 600 ms after the recorder wrote it, a late one on arrival, and the lag never grows', (ctx) => {
  ctx.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  const base = Date.now();
  // hello_ok was written 100 ms before the poll that brought it.
  const header = JSON.parse(G1[0]!) as never;
  const [hello] = stamped([base - 100]);
  const t = new LogReplayTransport({ header, frames: [hello!], warnings: [] }, { follow: true, now: () => Date.now() });
  const appliedAt: number[] = [];
  t.onFrame(() => appliedAt.push(Date.now() - base));
  t.play();
  ctx.mock.timers.tick(499);
  assert.equal(t.index, 0);
  ctx.mock.timers.tick(1);
  assert.equal(t.index, 1, 'its slot: written at -100, played at +500');
  ctx.mock.timers.tick(5000);
  assert.equal(t.playing, true, 'at the live edge a followed log WAITS — it does not pause');

  // A poll at +5500 brings three frames written at +5000, +5150 and +5153:
  // each plays at its own slot, the 3 ms one held to the floor.
  const rest = stamped([base + 5000, base + 5150, base + 5153, base + 8000, base + 8700], 2);
  t.append(rest.slice(0, 3));
  ctx.mock.timers.tick(99);
  assert.equal(t.index, 1);
  ctx.mock.timers.tick(1);
  assert.equal(t.index, 2);
  ctx.mock.timers.tick(150);
  assert.equal(t.index, 3);
  ctx.mock.timers.tick(FOLLOW_MIN_GAP_MS);
  assert.equal(t.index, 4);

  // A frame that arrives AFTER its slot (a slow poll) plays on arrival…
  ctx.mock.timers.tick(9000 - 5800);
  t.append(rest.slice(3, 4));
  ctx.mock.timers.tick(0);
  assert.equal(t.index, 5);
  // …and the next is back on schedule, not held a gap behind it.
  t.append(rest.slice(4));
  ctx.mock.timers.tick(299);
  assert.equal(t.index, 5);
  ctx.mock.timers.tick(1);
  assert.equal(t.index, 6);
  assert.deepEqual(appliedAt, [500, 5600, 5750, 5800, 9000, 9300]);
  const lag = t.followLag();
  assert.ok(lag !== null && lag.p50 === FOLLOW_LIVE_DELAY_MS, `the lag is the live delay: ${JSON.stringify(lag)}`);

  // The log ends at the edge: an ordinary replay from here on, at 400 ms / speed.
  t.endLive();
  assert.deepEqual([t.live, t.paced, t.playing], [false, false, false]);
  t.setSpeed(2);
  t.scrubTo(1);
  t.play();
  ctx.mock.timers.tick(BASE_FRAME_INTERVAL_MS / 2 - 1);
  assert.equal(t.index, 1);
  ctx.mock.timers.tick(1);
  assert.equal(t.index, 2);
  t.close();
});

test('pace: a slow first poll snaps to the live schedule; a burst is spread by the floor and caught up', (ctx) => {
  ctx.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 4_000_000 });
  const base = Date.now();
  // The first poll arrives 650 ms after the first frame was written (the page
  // was still loading): a burst written 3 ms apart (a size flush), then +600.
  const frames = stamped([base - 650, base - 647, base - 644, base - 641, base - 50]);
  const header = JSON.parse(G1[0]!) as never;
  const t = new LogReplayTransport({ header, frames, warnings: [] }, { follow: true, now: () => Date.now() });
  const appliedAt: number[] = [];
  t.onFrame(() => appliedAt.push(Date.now() - base));
  t.play();
  for (let i = 0; i < 40 && t.index < 5; i++) ctx.mock.timers.tick(25);
  // Behind its slot (-50) by less than the snap, so it is LIVE at once: the
  // burst takes one render each, and the fifth frame is on its own slot (+550),
  // not 600 ms after a fourth that had to wait.
  assert.deepEqual(appliedAt, [50, 100, 150, 200, 550]);
  t.close();
});

test('pace: a LATE JOIN jumps to the live edge — folds the backlog, plays the newest frame, then the live schedule', (ctx) => {
  ctx.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 2_000_000 });
  const base = Date.now();
  // Written well before the page opened (a reload twenty seconds into a game).
  const frames = stamped([base - 20000, base - 19900, base - 19800, base - 8000, base - 7900]);
  const header = JSON.parse(G1[0]!) as never;
  const t = new LogReplayTransport({ header, frames, warnings: [] }, { follow: true, now: () => Date.now() });
  const appliedAt: number[] = [];
  t.onFrame(() => appliedAt.push(Date.now() - base));
  t.play();
  assert.equal(t.index, 4, 'the four stale frames are folded at once (the arena reads it as a scrub and snaps)');
  ctx.mock.timers.tick(FOLLOW_MIN_GAP_MS);
  assert.equal(t.index, 5);
  assert.deepEqual(appliedAt, [FOLLOW_MIN_GAP_MS], 'only the newest frame is PLAYED');
  // From here it is live: the next frame, written now, plays 600 ms later.
  t.append(stamped([base + FOLLOW_MIN_GAP_MS], 6));
  ctx.mock.timers.tick(FOLLOW_LIVE_DELAY_MS - 1);
  assert.equal(t.index, 5);
  ctx.mock.timers.tick(1);
  assert.equal(t.index, 6);
  // The backlog is still the scrubber's: nothing was dropped.
  assert.equal(t.total, 6);
  t.scrubTo(1);
  assert.equal(t.index, 1);
  t.close();
});

test('pace: a paused follower does NOT jump — behind the live edge is where the viewer chose to be; the cap bounds a long think', (ctx) => {
  ctx.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 5_000_000 });
  const base = Date.now();
  const frames = stamped([base - 20000, base - 19900, base - 8000]);
  const header = JSON.parse(G1[0]!) as never;
  const t = new LogReplayTransport({ header, frames, warnings: [] }, { follow: true, now: () => Date.now() });
  const appliedAt: number[] = [];
  t.onFrame(() => appliedAt.push(Date.now() - base));
  t.pause(); // the viewer took the controls before PLAY
  t.play();
  for (let i = 0; i < 400 && t.index < 3; i++) ctx.mock.timers.tick(25);
  assert.deepEqual(appliedAt, [50, 100, 100 + FOLLOW_MAX_GAP_MS], 'the recorder pace from frame 0, an 11.9 s think capped');
  t.close();
});

test('pace: after a PAUSE the recorder pace resumes from the cursor, and 2× catches up to live', (ctx) => {
  ctx.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 3_000_000 });
  const base = Date.now();
  // A frame every second, each polled 50 ms after it was written.
  const frames = stamped([0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000].map((ms) => base + ms));
  const header = JSON.parse(G1[0]!) as never;
  ctx.mock.timers.tick(50);
  const t = new LogReplayTransport({ header, frames: [frames[0]!], warnings: [] }, { follow: true, now: () => Date.now() });
  const appliedAt: number[] = [];
  t.onFrame(() => appliedAt.push(Date.now() - base));
  t.play();
  timeline(
    ctx,
    t,
    base,
    9000 - 50,
    frames.slice(1).map((f, i) => ({ at: 1000 * (i + 1) + 50 - 50, frames: [f] })),
    [
      { at: 1650, run: () => t.pause() },
      { at: 4050, run: () => t.play() },
      { at: 5050, run: () => t.setSpeed(2) },
    ],
  );
  // Live (600 behind) → paused at +1700 → PLAY at +4100: the recorder's pace
  // from the cursor, 2.5 s behind → 2× from +5100 gains 500 ms a frame and,
  // within the snap, returns to the live slots.
  assert.deepEqual(appliedAt, [600, 1600, 5100, 5600, 6100, 6150, 6600, 7600, 8600]);
  t.close();
});

test('pace: an ordinary replay is untouched — append refuses, the end pauses, 400 ms a frame', (ctx) => {
  ctx.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 3_000_000 });
  const t = LogReplayTransport.fromText(G1.slice(0, 4).join('\n'));
  assert.equal(t.live, false);
  assert.equal(t.paced, false);
  assert.throws(() => t.append([]), /not following/);
  t.play();
  for (let i = 0; i < 3; i++) ctx.mock.timers.tick(BASE_FRAME_INTERVAL_MS);
  assert.equal(t.index, 3);
  assert.equal(t.playing, false);
  assert.equal(t.followLag(), null);
  t.close();
});

test('parse: parseLogLine is parseFrameLog, one line at a time', () => {
  const kinds = G1.slice(0, 5).map((line, i) => parseLogLine(line, i + 1).kind);
  assert.deepEqual(kinds, ['header', 'frame', 'frame', 'frame', 'frame']);
  assert.equal(parseLogLine('   ', 9).kind, 'blank');
  const junk = parseLogLine('{"not":"a frame"}', 12);
  assert.equal(junk.kind, 'junk');
  assert.match(junk.kind === 'junk' ? junk.warning : '', /line 12/);
  const truncated = parseLogLine(G1[3]!.slice(0, 50), 4);
  assert.equal(truncated.kind, 'junk', 'a half-written line is junk, never a frame');
});
