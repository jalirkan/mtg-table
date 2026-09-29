#!/usr/bin/env node
/*
 * mtg-table — tools/sound-probe.mjs
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **What a headless browser can say about the arena's sound** (D250, D251) — it
 * cannot hear, so it counts.
 *
 *     npm --prefix web run dev -- --port 5218      # a DEV server (the probe reads window.__mtgArena)
 *     node tools/sound-probe.mjs --vite 5218 --replay games/g1.jsonl --from 150 --frames 80
 *
 * Run from the repo root (hard rule 9). Not in the gate: it needs a dev server and
 * a headless Chromium, like `tools/arena-bench.mjs`.
 *
 * It opens the arena on a replay, reads `__mtgArena.audio.describe()` BEFORE any
 * gesture (no context may exist), presses `M` through DevTools' input domain (a
 * trusted key press — the gesture a browser needs), waits for the eleven clips to
 * decode, scrubs to `--from`, then steps `--frames` frames one at a time with the
 * replay bar's own button, waits for each batch's cues to drain, and prints, per
 * batch, the events and what the audio module counted: sounds the film asked for,
 * sounds a voice started, dropped (every voice busy) and silenced. Then it checks
 * the three cuts — `K` (skip all) mid-batch, a scrub, and `M` again (mute) — and a
 * reload: the stored ON builds no context until the first press on the page.
 * Everything is a number from the page's own counters; nothing here is a claim
 * about what the clips sound like.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : fallback;
};
const VITE = Number(arg('vite', '5218'));
const PORT = Number(arg('port', '9237'));
const REPLAY = arg('replay', 'games/g1.jsonl');
const FROM = Number(arg('from', '150'));
const FRAMES = Number(arg('frames', '80'));
const OUT = resolve(arg('out', 'var/sounds/probe.json'));
const PROFILE = resolve('var/sounds/probe-profile');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(PROFILE, { recursive: true, force: true });
mkdirSync(PROFILE, { recursive: true });
const url = `http://127.0.0.1:${String(VITE)}/?replay=${REPLAY}#arena`;
const chrome = spawn(
  arg('chromium', 'chromium'),
  ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1600,900', `--remote-debugging-port=${String(PORT)}`, `--user-data-dir=${PROFILE}`, 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);
let chromeErr = '';
chrome.stderr.on('data', (b) => (chromeErr += String(b)));

let target = null;
for (let i = 0; i < 100 && target === null; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${String(PORT)}/json/list`)).json();
    target = list.find((t) => t.type === 'page') ?? null;
  } catch {
    /* not up yet */
  }
  if (target === null) await sleep(200);
}
if (target === null) throw new Error(`chromium never answered\n${chromeErr}`);
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => socket.addEventListener('open', () => r(undefined)));
let nextId = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const msg = JSON.parse(String(event.data));
  const entry = pending.get(msg.id);
  if (entry === undefined) return;
  pending.delete(msg.id);
  entry(msg);
});
const send = (method, params = {}) =>
  new Promise((r) => {
    nextId += 1;
    pending.set(nextId, r);
    socket.send(JSON.stringify({ id: nextId, method, params }));
  });
const evaluate = async (expression) => {
  const msg = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (msg.result?.exceptionDetails) throw new Error(JSON.stringify(msg.result.exceptionDetails.exception?.description ?? msg.result.exceptionDetails));
  return msg.result.result.value;
};
const waitFor = async (expression, ms = 20000) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await evaluate(expression)) return true;
    await sleep(100);
  }
  return false;
};
/** A TRUSTED key press, as the user's own — what lets a page start its audio. */
const press = async (key, code, keyCode) => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, text: key });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
};
const stats = () => evaluate('({ ...window.__mtgArena.audio.stats, ...window.__mtgArena.audio.describe() })');
const step = () => evaluate(`document.querySelector('button[title="Step forward one frame"]').click()`);
const drained = () => waitFor('window.__mtgArena.queue.idle', 8000);

const report = { url, chromium: '', before: null, unlocked: null, batches: [], cuts: {}, reload: {} };
try {
  report.chromium = await evaluate('navigator.userAgent').catch(() => '');
  await send('Page.enable');
  await send('Page.navigate', { url });
  if (!(await waitFor('!!(window.__mtgArena && window.__mtgArena.audio && window.__mtgArena.queue)'))) throw new Error('the arena never mounted');
  report.chromium = await evaluate('navigator.userAgent');
  // 1 — before any gesture: muted, and no context at all.
  report.before = await stats();
  // 2 — M, a trusted key press: sound on, the context built inside the gesture.
  await press('m', 'KeyM', 77);
  await waitFor('window.__mtgArena.audio.describe().clips === 11', 15000);
  report.unlocked = await stats();
  // 3 — scrub to --from (a flush), then step a frame at a time.
  await evaluate(
    `(() => { const r = document.querySelector('input[aria-label="Frame"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(r, '${String(FROM)}'); r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); })()`,
  );
  await drained();
  for (let i = 0; i < FRAMES; i++) {
    const a = await stats();
    await step();
    await sleep(40);
    await drained();
    await sleep(30);
    const b = await stats();
    const events = await evaluate('(window.__mtgArena.state.events || []).map((e) => e.kind).filter((k) => k !== "phase")');
    const row = {
      events: events.length,
      kinds: [...new Set(events)].join(','),
      requested: b.requested - a.requested,
      played: b.played - a.played,
      dropped: b.dropped - a.dropped,
      silenced: b.silenced - a.silenced,
    };
    report.batches.push(row);
  }
  // 4 — the cuts. K mid-batch: find a batch that plays a sound, stop half way, skip all.
  let cutK = null;
  for (let i = 0; i < 60 && cutK === null; i++) {
    const a = await stats();
    await step();
    await sleep(60);
    const mid = await stats();
    if (mid.played > a.played && !(await evaluate('window.__mtgArena.queue.idle'))) {
      await press('k', 'KeyK', 75);
      await sleep(80);
      const b = await stats();
      cutK = { cutsBefore: mid.cuts, cutsAfter: b.cuts, busyAfter: b.busy, playedAfterSkip: b.played - mid.played };
    }
    await drained();
  }
  report.cuts.skipAll = cutK;
  const s1 = await stats();
  await evaluate(`document.querySelector('button[title="Step back one frame"]').click()`);
  await sleep(150);
  const s2 = await stats();
  report.cuts.scrubBack = { cuts: s2.cuts - s1.cuts, busy: s2.busy };
  await press('m', 'KeyM', 77);
  await sleep(100);
  const muted = await stats();
  report.cuts.mute = { enabled: muted.enabled, busy: muted.busy, stored: await evaluate("localStorage.getItem('mtg-table.arena.sound')") };
  // 5 — the stored choice survives a reload, and still waits for a gesture.
  await press('m', 'KeyM', 77);
  await sleep(100);
  await send('Page.reload');
  await sleep(500);
  await waitFor('!!(window.__mtgArena && window.__mtgArena.audio)');
  report.reload.beforePress = await stats();
  report.reload.stored = await evaluate("localStorage.getItem('mtg-table.arena.sound')");
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 800, y: 450, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 800, y: 450, button: 'left', clickCount: 1 });
  await waitFor('window.__mtgArena.audio.describe().clips === 11', 15000);
  report.reload.afterPress = await stats();
} finally {
  try {
    const version = await (await fetch(`http://127.0.0.1:${String(PORT)}/json/version`)).json();
    const closer = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((r) => closer.addEventListener('open', () => r(undefined)));
    closer.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
    await sleep(600);
    closer.close();
  } catch {
    /* already gone */
  }
  socket.close();
}

mkdirSync(join(OUT, '..'), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
const sounding = report.batches.filter((b) => b.requested > 0);
const sum = (k) => report.batches.reduce((a, b) => a + b[k], 0);
console.log(`chromium: ${report.chromium}`);
console.log(`before a gesture: ${JSON.stringify(report.before)}`);
console.log(`after M:          ${JSON.stringify(report.unlocked)}`);
console.log(
  `${String(report.batches.length)} frames stepped from ${String(FROM)}: ${String(report.batches.filter((b) => b.events > 0).length)} batches with events, ` +
    `${String(sounding.length)} with a sound; requested ${String(sum('requested'))}, played ${String(sum('played'))}, dropped ${String(sum('dropped'))}, silenced ${String(sum('silenced'))}`,
);
for (const [i, b] of report.batches.entries()) if (b.requested > 0) console.log(`  +${String(i + 1)}: ${b.kinds} → ${String(b.played)} played`);
console.log(`cuts: ${JSON.stringify(report.cuts)}`);
console.log(`reload: ${JSON.stringify(report.reload)}`);
console.log(`report → ${OUT}`);
