#!/usr/bin/env node
/*
 * mtg-table — tools/arena-bench.mjs
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Report 09 §9.4's measurement, run.** Headless Chromium over CDP with the
 * SwiftShader software rasteriser, the arena loaded from a PRODUCTION build,
 * scrubbed to a busy combat frame, sampling the real frame loop for five
 * seconds. The gate is §9.4's: **p95 ≤ 20 ms and max ≤ 50 ms**.
 *
 * Why SwiftShader: the dev box has a GeForce GTX 1080 and is explicitly NOT the
 * target (§9's own note). A software rasteriser is a hard lower bound and a fair
 * proxy for weak integrated graphics — if it passes there, an iGPU passes.
 *
 *   node tools/arena-bench.mjs --url http://127.0.0.1:5182/?replay=games/g1.jsonl#arena
 *
 * Node 24 has a global `WebSocket` and `fetch`, so this needs no dependency.
 * It starts its own Chromium and kills it by pid on the way out.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};

/**
 * **`?glinfo=1` is appended unless it is already there** (verification fix).
 *
 * This script measures a PRODUCTION build, and the arena's `window.__mtgArena`
 * handle is `import.meta.env.DEV`-only — so the draw-call / triangle line below
 * printed nothing here and the figures that reached `docs/evidence/m7-arena.md`
 * came from a dev build while the frame times beside them came from this one.
 * The flag exposes `window.__mtgArena.info()` and nothing else. `--no-glinfo`
 * turns it off, to measure exactly what a user's URL renders.
 */
function withGlInfo(raw) {
  if (args.includes('--no-glinfo')) return raw;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has('glinfo')) url.searchParams.set('glinfo', '1');
    return url.toString();
  } catch {
    return raw;
  }
}

const URL_ = withGlInfo(arg('url', 'http://127.0.0.1:5182/?replay=games/g1.jsonl#arena'));
const PORT = Number(arg('port', '9223'));
const SAMPLE_MS = Number(arg('ms', '5000'));
/**
 * How long to let the scrubbed-to frame settle before sampling.
 *
 * **It matters more than it looks.** The scrub jumps to a frame whose cards have
 * never been drawn, and their Scryfall textures are uploaded to the GPU on their
 * FIRST render — which under a CPU rasteriser costs tens of milliseconds each.
 * Measured at the default 600 ms: every frame over 40 ms in a 958-frame sample
 * was in the first twelve, and three of the four coincided with `gl.info.memory
 * .textures` going up. So the default measures a cold table on purpose (it is a
 * hitch a user really sees the first time a card appears), and `--settle 4000`
 * measures the steady state, which is what §9.4's p95 is actually about. Say
 * which one you ran.
 */
const SETTLE_MS = Number(arg('settle', '600'));
const PROFILE = resolve(arg('profile', 'var/bench/profile-bench'));
const WIDTH = Number(arg('width', '1920'));
const HEIGHT = Number(arg('height', '1080'));
/** §9.4's gate. */
const P95_MS = Number(arg('p95', '20'));
const MAX_MS = Number(arg('max', '50'));

rmSync(PROFILE, { recursive: true, force: true });
mkdirSync(PROFILE, { recursive: true });

const chromium = spawn(
  arg('chromium', 'chromium'),
  [
    '--headless=new',
    '--use-gl=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    // **Without these the measurement measures the compositor, not us.** With
    // vsync on, every `requestAnimationFrame` delta is a multiple of 16.7 ms, so
    // p95 is either 16.7 (perfect) or 33.4 (one slipped frame) and §9.4's 20 ms
    // gate cannot tell a slow renderer from a single hiccup. Measured before
    // adding them: p50 16.70 · p95 33.40 · max 133.30, every value a multiple of
    // one refresh.
    '--disable-gpu-vsync',
    '--disable-frame-rate-limit',
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
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(`page threw: ${JSON.stringify(result.exceptionDetails.exception?.description ?? result.exceptionDetails)}`);
  }
  return result.result.value;
}

let code = 0;
try {
  await waitForDevTools();
  const target = await (
    await fetch(`http://127.0.0.1:${String(PORT)}/json/new?${encodeURIComponent(URL_)}`, {
      method: 'PUT',
    })
  ).json();
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  // The arena chunk is lazy and the textures are fetched from Scryfall, so give
  // it a real chance to settle before measuring anything.
  await sleep(6000);
  const ready = await evaluate(
    cdp,
    `(() => ({ canvas: !!document.querySelector('canvas'), handle: typeof window.__mtgArena }))()`,
  );
  if (!ready.canvas) throw new Error('no <canvas>: the arena did not mount');

  /**
   * Scrub to the busiest frame of the recording — §9.4 says "a fixture scrubbed
   * to its busiest frame (a full combat)" — then play the replay at 4× so the
   * cue queue is never empty, and sample `requestAnimationFrame` deltas.
   */
  const sample = await evaluate(
    cdp,
    `(async () => {
      const range = document.querySelector('input[type=range]');
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const total = Number(range.max);
      // 0.55 of the way in: the corpus' combats are in the middle third.
      set.call(range, String(Math.round(total * 0.55)));
      range.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, ${String(SETTLE_MS)}));
      // Play, fast, so the queue always has something to animate.
      const speed = [...document.querySelectorAll('select')][0];
      if (speed) { const s = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set; s.call(speed, '4'); speed.dispatchEvent(new Event('change', { bubbles: true })); }
      const play = [...document.querySelectorAll('button')].find((b) => /play/i.test(b.title ?? '') || /play/i.test(b.innerText));
      if (play) play.click();

      const deltas = [];
      // The texture count beside each frame, so a spike can be told apart from a
      // slow renderer: a first upload of a 745x1040 card face is not fill rate.
      const textures = [];
      const infoFn = window.__mtgArena && window.__mtgArena.info;
      let last = null;
      await new Promise((done) => {
        const stop = performance.now() + ${String(SAMPLE_MS)};
        const tick = (now) => {
          if (last !== null) {
            deltas.push(now - last);
            textures.push(infoFn ? infoFn().memory.textures : -1);
          }
          last = now;
          if (now < stop) requestAnimationFrame(tick);
          else done();
        };
        requestAnimationFrame(tick);
      });
      // The second number, and the one §9.1's CPU budget is actually about:
      // the cost of the frame BODY -- beginFrame + queue.tick + the offset
      // write + pool.bind + the camera + gl.render -- with the compositor taken
      // out of it entirely. (No backticks in here: this whole block is inside a
      // template literal, and one closes it.)
      let body = null;
      try {
        const fiberUrl = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /fiber/.test(n));
        if (fiberUrl) {
          const fiber = await import(fiberUrl);
          const times = [];
          for (let i = 0; i < 240; i++) {
            const t0 = performance.now();
            fiber.advance(performance.now(), true);
            times.push(performance.now() - t0);
          }
          times.sort((a, b) => a - b);
          body = { p50: times[120], p95: times[228], max: times[239] };
        }
      } catch { /* the bundle may not expose it; the rAF numbers stand alone */ }

      // ?glinfo=1 in a production build, or the whole dev handle in a dev one.
      // (No backticks in here: this block is inside a template literal.)
      const handle = window.__mtgArena;
      const counters = handle && typeof handle.info === 'function' ? handle.info() : null;
      const gl = handle?.gl;
      return {
        deltas,
        textures,
        body,
        render: counters ? counters.render : gl ? { ...gl.info.render } : null,
        memory: counters ? counters.memory : gl ? { ...gl.info.memory } : null,
        dpr: window.devicePixelRatio,
        // The dev handle does not exist in a production build, so the render
        // resolution is read off the canvas itself: backing pixels / CSS pixels.
        renderDpr: (() => {
          const c = document.querySelector('canvas');
          return c && c.clientWidth > 0 ? Number((c.width / c.clientWidth).toFixed(2)) : null;
        })(),
        size: [window.innerWidth, window.innerHeight],
        // Dev-only: the queue is not on the production handle (the draw-call
        // counters are; a cue census is a debugging aid and stays behind DEV).
        cues: handle?.queue ? Object.fromEntries(handle.queue.seen) : null,
      };
    })()`,
  );

  // Ordered, for the spike diagnostic below; sorted, for the percentiles.
  const ordered = sample.deltas;
  const deltas = sample.deltas.filter((d) => d > 0).sort((a, b) => a - b);
  if (deltas.length < 30) throw new Error(`only ${String(deltas.length)} frames in ${String(SAMPLE_MS)} ms — the loop never ran`);
  const at = (p) => deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * p))];
  const p50 = at(0.5);
  const p95 = at(0.95);
  const max = deltas[deltas.length - 1];
  const fps = 1000 / p50;

  console.log('arena-bench — report 09 §9.4, SwiftShader');
  console.log(`  url        ${URL_}`);
  console.log(
    `  viewport   ${sample.size[0]}x${sample.size[1]} @ device dpr ${String(sample.dpr)} · RENDER dpr ${String(sample.renderDpr)} (§9.2 rule 9 adapts it)`,
  );
  console.log(`  frames     ${String(deltas.length)} in ${String(SAMPLE_MS)} ms`);
  console.log(`  frame ms   p50 ${p50.toFixed(2)} · p95 ${p95.toFixed(2)} · max ${max.toFixed(2)}`);
  console.log(`  fps (p50)  ${fps.toFixed(1)}`);
  if (sample.body) {
    console.log(
      `  frame body p50 ${sample.body.p50.toFixed(3)} · p95 ${sample.body.p95.toFixed(3)} · max ${sample.body.max.toFixed(3)} ms (§9.1 budget: 2 ms CPU)`,
    );
  }
  if (sample.render) {
    console.log(
      `  draw calls ${String(sample.render.calls)} · triangles ${String(sample.render.triangles)} · geometries ${String(sample.memory.geometries)} · textures ${String(sample.memory.textures)}`,
    );
  } else {
    console.log(
      '  draw calls (not available — pass a URL with ?glinfo=1, or drop --no-glinfo)',
    );
  }
  if (sample.cues) {
    const total = Object.values(sample.cues).reduce((a, b) => a + b, 0);
    console.log(`  cues       ${String(total)} across ${String(Object.keys(sample.cues).length)} event kinds`);
  }

  // **Where the outliers are, and whether a texture arrived on them.** A single
  // number cannot tell "this renderer is slow" from "this frame paid for an
  // upload"; this line can, and every claim in docs/evidence/m7-arena.md about
  // the max is made from it.
  {
    const tex = sample.textures ?? [];
    const slow = [];
    for (let i = 0; i < ordered.length; i++) if (ordered[i] > MAX_MS) slow.push(i);
    const withUpload = slow.filter((i) => i > 0 && (tex[i] ?? 0) > (tex[i - 1] ?? 0));
    const lastSlow = slow.length > 0 ? slow[slow.length - 1] : -1;
    console.log(
      `  over ${String(MAX_MS)} ms  ${String(slow.length)} of ${String(ordered.length)} frames` +
        (slow.length === 0
          ? ''
          : ` · last at frame ${String(lastSlow)} of ${String(ordered.length)}` +
            ` · ${String(withUpload.length)} coincide with a new texture (settle was ${String(SETTLE_MS)} ms)`),
    );
  }

  const failures = [];
  if (p95 > P95_MS) failures.push(`p95 ${p95.toFixed(2)} ms > ${String(P95_MS)} ms`);
  if (max > MAX_MS) failures.push(`max ${max.toFixed(2)} ms > ${String(MAX_MS)} ms`);
  if (sample.render && sample.render.calls > 120) failures.push(`${String(sample.render.calls)} draw calls > 120`);
  if (failures.length > 0) {
    console.error(`\nFAIL: ${failures.join('; ')}`);
    code = 1;
  } else {
    console.log('\nOK: inside §9.4’s gate (p95 ≤ 20 ms, max ≤ 50 ms) and §9.1’s draw-call budget');
  }
  cdp.close();
} catch (err) {
  console.error(`arena-bench failed: ${err.message}`);
  code = 1;
} finally {
  // **`Browser.close`, not a signal.** Chromium here is a snap: the browser
  // process is re-exec'd out of this process's group and `kill(2)` answers
  // EACCES even for our own uid. Asking it to close over CDP is the only way
  // that works, and it is the tidier one anyway.
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
