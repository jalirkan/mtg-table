#!/usr/bin/env node
/*
 * mtg-table — tools/story-shot.mjs
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **A picture of the `#story` page, and what was on it** (D125's evidence).
 * Headless Chromium over CDP, driven the way `tools/arena-bench.mjs` drives it
 * (no dependency: Node 24's global `WebSocket` and `fetch`), pointed at a dev
 * server you already run:
 *
 *   (cd web && ./node_modules/.bin/vite --port 5196 --strictPort) &
 *   node tools/story-shot.mjs --url 'http://127.0.0.1:5196/?replay=games/g1.jsonl#story' \
 *       --frame 200 --out var/story/story-g1.png
 *
 *   --url <url>        the page (required)
 *   --frame <n>        move the replay cursor to n through the replay bar's own
 *                      scrubber (the range input, as a person drags it)
 *   --keys <k,k,...>   then press these keys, in order (`ArrowRight`, `ArrowDown`,
 *                      `End`, `v` …), through CDP's Input domain
 *   --click <text>     then click the first link or button whose text contains
 *                      this (e.g. `arena`, `story`), and wait for the page to settle
 *   --wait <ms>        after each step (default 400)
 *   --follow-for <ms>  sample the page every second for this long (follow mode):
 *                      the cursor, the moment count, the tail line
 *   --out <png>        the screenshot (default var/story/story.png)
 *   --width / --height the window (default 1600 × 1000)
 *   --port <n>         Chromium's debugging port (default 8744)
 *
 * It prints one JSON object: the cursor and total the replay bar says, the
 * moment on screen, how many moments and turns the column holds, how many card
 * names it marked (`data-card-id`), and the follow line if there is one — the
 * numbers `docs/evidence/story.md` quotes — and, pointed at `#arena`, the caption
 * strip's lines (D255; `docs/evidence/arena-story-caption.md`). Not in the gate:
 * it wants a dev server and a browser.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};

const URL_ = arg('url', null);
if (URL_ === null) {
  console.error('usage: node tools/story-shot.mjs --url <page> [--frame n] [--keys a,b] [--click text] [--out png]');
  process.exit(2);
}
const FRAME = arg('frame', null);
const KEYS = (arg('keys', '') ?? '').split(',').filter((k) => k.length > 0);
const CLICK = arg('click', null);
const WAIT = Number(arg('wait', '400'));
const FOLLOW_FOR = Number(arg('follow-for', '0'));
const OUT = resolve(arg('out', 'var/story/story.png'));
const WIDTH = Number(arg('width', '1600'));
const HEIGHT = Number(arg('height', '1000'));
const PORT = Number(arg('port', '8744'));
const PROFILE = resolve('var/story/chromium-profile');

rmSync(PROFILE, { recursive: true, force: true });
mkdirSync(PROFILE, { recursive: true });

const chromium = spawn(
  arg('chromium', 'chromium'),
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    `--remote-debugging-port=${String(PORT)}`,
    `--window-size=${String(WIDTH)},${String(HEIGHT)}`,
    `--user-data-dir=${PROFILE}`,
    'about:blank',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);
let chromiumErr = '';
chromium.stderr.on('data', (b) => (chromiumErr += String(b)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDevTools() {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${String(PORT)}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      /* not up yet */
    }
    await sleep(200);
  }
  throw new Error(`chromium devtools never answered on ${String(PORT)}\n${chromiumErr}`);
}

/** A minimal CDP client: one socket, one id counter, awaited replies. */
function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  let id = 0;
  const ready = new Promise((res, rej) => {
    socket.addEventListener('open', () => res(undefined));
    socket.addEventListener('error', (e) => rej(new Error(`ws error: ${String(e.message ?? e.type)}`)));
  });
  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(String(event.data));
    const entry = pending.get(msg.id);
    if (entry === undefined) return;
    pending.delete(msg.id);
    if (msg.error) entry.reject(new Error(JSON.stringify(msg.error)));
    else entry.resolve(msg.result);
  });
  return {
    ready,
    send(method, params = {}) {
      id += 1;
      const mine = id;
      return new Promise((resolve_, reject) => {
        pending.set(mine, { resolve: resolve_, reject });
        socket.send(JSON.stringify({ id: mine, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    throw new Error(`page threw: ${JSON.stringify(result.exceptionDetails.exception?.description ?? result.exceptionDetails)}`);
  }
  return result.result.value;
}

/** What the page shows: read off the DOM, never off a dev handle. */
const READ = `(() => {
  const q = (s) => document.querySelector(s);
  const count = q('.replay__count')?.textContent ?? '';
  const m = /frame\\s*(\\d+)\\s*\\/\\s*(\\d+)/.exec(count);
  const now = [...document.querySelectorAll('.story__moment[data-now="true"]')].map((el) => el.textContent.trim());
  return {
    hash: location.hash,
    title: q('.app__bar h1')?.textContent ?? null,
    cursor: m ? Number(m[1]) : null,
    total: m ? Number(m[2]) : null,
    moments: document.querySelectorAll('.story__moment').length,
    momentsAhead: document.querySelectorAll('.story__moment--ahead').length,
    turns: document.querySelectorAll('.story__turn').length,
    markedNames: document.querySelectorAll('.story__card[data-card-id]').length,
    cardImages: document.querySelectorAll('.story__cardimg').length,
    now,
    onScreen: q('.story__at')?.innerText?.split('\\n').slice(0, 6) ?? null,
    result: q('.story__result')?.textContent ?? null,
    tail: q('.story__tail')?.textContent ?? null,
    follow: q('.follow')?.textContent ?? null,
    arena: !!q('canvas'),
    board: !!q('[data-readonly]'),
    // D255: the arena's caption strip — its turn marker and lines, or null when hidden.
    caption: q('.arena__caption')?.innerText?.split('\\n') ?? null,
  };
})()`;

let code = 0;
try {
  await waitForDevTools();
  const target = await (
    await fetch(`http://127.0.0.1:${String(PORT)}/json/new?${encodeURIComponent(URL_)}`, { method: 'PUT' })
  ).json();
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });

  // The page is ready when the replay bar is (a story or a replay) and, on
  // #story, the column has drawn.
  for (let i = 0; i < 150; i++) {
    const ok = await evaluate(cdp, `!!document.querySelector('.replay__scrub') && (location.hash !== '#story' || !!document.querySelector('.story__column'))`);
    if (ok) break;
    await sleep(200);
  }
  await sleep(WAIT);

  if (FRAME !== null) {
    await evaluate(
      cdp,
      `(() => {
        const el = document.querySelector('.replay__scrub');
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        set.call(el, ${JSON.stringify(String(FRAME))});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return el.value;
      })()`,
    );
    await sleep(WAIT);
  }
  // Take focus off the scrubber, so the keys below are the page's.
  await evaluate(cdp, `document.activeElement && document.activeElement.blur && document.activeElement.blur()`);
  for (const key of KEYS) {
    const text = key.length === 1 ? key : undefined;
    const code_ = key.length === 1 ? `Key${key.toUpperCase()}` : key;
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: code_, text, windowsVirtualKeyCode: 0 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: code_ });
    await sleep(WAIT);
  }
  if (CLICK !== null) {
    const clicked = await evaluate(
      cdp,
      `(() => {
        const el = [...document.querySelectorAll('a, button')].find((x) => x.textContent.includes(${JSON.stringify(CLICK)}));
        if (!el) return false;
        el.click();
        return el.textContent.trim();
      })()`,
    );
    if (clicked === false) throw new Error(`nothing to click that says ${JSON.stringify(CLICK)}`);
    for (let i = 0; i < 100; i++) {
      if (await evaluate(cdp, `!!document.querySelector('.replay__scrub')`)) break;
      await sleep(100);
    }
    await sleep(Math.max(WAIT, 1500));
  }
  const samples = [];
  for (let t = 0; t < FOLLOW_FOR; t += 1000) {
    const s = await evaluate(cdp, READ);
    samples.push({ at: t, cursor: s.cursor, total: s.total, moments: s.moments, now: s.now[0] ?? null, tail: s.tail });
    await sleep(1000);
  }
  // Card images come from Scryfall's CDN: give them a moment to arrive, so the
  // picture shows what a person would see (the page draws a text frame under
  // each, so a slow or failed one is still a card).
  for (let i = 0; i < 50; i++) {
    const pending = await evaluate(cdp, `[...document.images].filter((img) => !img.complete).length`);
    if (pending === 0) break;
    await sleep(100);
  }
  const report = await evaluate(cdp, READ);
  if (samples.length > 0) report.samples = samples;
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  report.screenshot = OUT;
  console.log(JSON.stringify(report, null, 2));
  cdp.close();
} catch (err) {
  console.error(`story-shot failed: ${err.message}`);
  code = 1;
} finally {
  // `Browser.close`, not a signal: Chromium here is a snap, re-exec'd out of this
  // process's group (arena-bench.mjs's note), so asking it over CDP is the way.
  try {
    const version = await (await fetch(`http://127.0.0.1:${String(PORT)}/json/version`)).json();
    const closer = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((r) => closer.addEventListener('open', () => r(undefined)));
    closer.send(JSON.stringify({ id: 9999, method: 'Browser.close' }));
    await sleep(1200);
    closer.close();
  } catch {
    /* it is already gone */
  }
}
process.exit(code);
