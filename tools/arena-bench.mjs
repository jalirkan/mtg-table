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
 *
 * ---------------------------------------------------------------------------
 * **T7 (Tier 2) added four things, and each one is a claim report 13 §8.5 asks
 * for.**
 *
 *   --index <n>        Scrub the replay slider to exactly this transport index
 *                      before sampling (it wins over the 0.55 heuristic, and over
 *                      the `--figures` search, which then only reports). T7's
 *                      bench frame is `g1.jsonl` at 316 — the first of the 61
 *                      consecutive frames (316–376) that carry >= 10 modelled
 *                      figures, so a 4x replay from there stays on a crowded board
 *                      for the whole sample.
 *   --figures <n>      **Scrub to a frame that has at least n FIGURES on it**, by
 *                      stepping the replay slider and reading the layer census off
 *                      `?glinfo=1`. §8.5's first bullet is "the frame must have
 *                      figures on it", and the old 0.55-of-the-way-in heuristic
 *                      could not know: T2's own evidence found that
 *                      `human-sideboard-7`'s most crowded frame is 21 creatures of
 *                      which **zero** carry a model, while `g1.jsonl@355` has 12
 *                      figures and 11 models. Prints the census it settled on.
 *   --bloom            Append `?bloom=1` — user decision 6's condition, measured
 *                      rather than assumed. `--no-bloom` appends `?bloom=0`; with
 *                      neither, the app's own default is measured (ON since T7).
 *                      With bloom on, `gl.info.render` counts only the composer's
 *                      last pass (`calls: 1`), so read draw calls with it off.
 *   --reduced-motion   Emulate `prefers-reduced-motion: reduce` through CDP, which
 *                      is the only way to measure §8 rule 7's path: every cue
 *                      collapses to a snap and the clip lane collapses with it.
 *   --gpu <mode>       Which rasteriser Chromium uses: `swiftshader` (the default,
 *                      and the lower bound every earlier number in this repo is),
 *                      `gl` (ANGLE on the machine's OpenGL driver) or `vulkan`
 *                      (ANGLE on Vulkan). T7 found the sandbox CAN reach a real
 *                      GPU headlessly — `--gpu gl` renders on the GeForce GTX 1080
 *                      this machine has — and the report prints WebGL's unmasked
 *                      renderer string so a number always says what drew it.
 *   --dpr <n>          Pin `?dpr=` so the governor's decision can be compared
 *                      against a fixed rung. Unpinned is the default and the
 *                      governor's chosen rung is printed either way.
 *
 * **The triangle line** (the personal tier's fix pass, D197). A benched frame
 * with `?glinfo=1` (bloom off) is also held to report 13 §8.2's triangle line —
 * `tools/assets-manifest.json`'s `budget.triangles` (D161), 30,000 — which had
 * been printed and never checked. `--personal` says the page may draw the user's
 * own models (a DEV server with `personal/`, D195): the line is then that PLUS
 * `arena/perf.ts`'s `PERSONAL_TABLE_TRIS`, the personal tier's own (D197).
 *
 * **The GPU pass (2026-09-29, D270) added four more**, each because a number could
 * not otherwise say what drew it:
 *
 *   --speed <n>        The replay speed the sample plays at (default 4, as ever).
 *                      `--speed 1` from just before a combat plays that combat's
 *                      own cues for the whole sample rather than fifty frames.
 *   RENDERED frames    Every sample now also counts the frames the ARENA drew
 *                      (`gl.info.render.frame` moved) and prints a second line —
 *                      p50/p95/max over back-to-back rendered frames only. Under
 *                      `frameloop='demand'` a replay idles between batches, and
 *                      an idle rAF with `--disable-frame-rate-limit` is a ~0.1 ms
 *                      interval that says nothing about the renderer: on the GTX
 *                      1080 at `g1`@316 most of the old line's frames were those.
 *                      The first line is kept byte for byte, so old numbers still
 *                      compare.
 *   --json <file>      Write the sample's numbers (both lines, the counters, the
 *                      renderer, the render dpr, the caption) as one JSON object.
 *   --cpu-profile <f>  Record the DevTools protocol's CPU profile over the sample
 *                      (100 µs sampling) and write it as a `.cpuprofile`.
 *                      `tools/profile-top.mjs` names its top self-time functions
 *                      through the build's own source maps.
 *   --vsync            (the GPU pass's fix pass, D273) Keep Chromium's own pacing:
 *                      the frame-rate limit and vsync stay on, as in a browser.
 *                      Every interval is then a multiple of the ~16.7 ms beat, so
 *                      p95 says whether one frame in twenty missed a beat — the
 *                      reason the default turns both off (below). It is where a
 *                      REAL GPU's §9.4 is read: unthrottled, the page draws ~740
 *                      frames a second, fills the WebGL command buffer every few
 *                      dozen frames and waits for the GPU process to drain it
 *                      (`CommandBufferHelper::WaitForAvailableEntries` in a trace)
 *                      — a 35–53 ms frame bloom off and over 100 ms bloom on at
 *                      `g1`@316 and Wakanda on the GTX 1080, in every build,
 *                      which no browser's pacing produces. `docs/evidence/gpu-pass.md` §10.
 *
 * It stays **out of `check-all.sh`** (M7 follow-up 10): it wants a built `dist`, a
 * `vite preview` server and a headless Chromium.
 * ---------------------------------------------------------------------------
 */

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PERSONAL_TABLE_TRIS } from '../web/src/arena/perf.ts';

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

/** `--bloom` / `--dpr` are URL flags of the app, so they go in the URL. */
function withAppFlags(raw) {
  try {
    const url = new URL(raw);
    // Both spellings, because the app's default is ON since T7 (`perf.ts`'s
    // BLOOM_DEFAULT): a bench that says nothing measures the default.
    if (args.includes('--bloom')) url.searchParams.set('bloom', '1');
    if (args.includes('--no-bloom')) url.searchParams.set('bloom', '0');
    const dpr = arg('dpr', null);
    if (dpr !== null) url.searchParams.set('dpr', String(dpr));
    return url.toString();
  } catch {
    return raw;
  }
}

const URL_ = withAppFlags(
  withGlInfo(arg('url', 'http://127.0.0.1:5182/?replay=games/g1.jsonl#arena')),
);
/** T7 — §8.5's "the frame must have figures on it", as a number and a search. */
const WANT_FIGURES = Number(arg('figures', '0'));
/** T7 — an exact transport index to bench, or -1 for the search / the 0.55 heuristic. */
const INDEX = Number(arg('index', '-1'));
const REDUCED_MOTION = args.includes('--reduced-motion');
/** Report 13 §8.2's triangle line, where the asset pipeline keeps it (D161): the repository tier's table. */
const TABLE_TRIS = JSON.parse(readFileSync(new URL('./assets-manifest.json', import.meta.url), 'utf8')).budget.triangles;
/** `--personal`: the user's own models may be on the table (D195) — their line is added to §8.2's (D197). */
const PERSONAL = args.includes('--personal');
const TRI_LINE = TABLE_TRIS + (PERSONAL ? PERSONAL_TABLE_TRIS : 0);
const TRI_WHY = PERSONAL
  ? `§8.2's ${String(TABLE_TRIS)} + the personal tier's ${String(PERSONAL_TABLE_TRIS)} (D197)`
  : `§8.2's ${String(TABLE_TRIS)}`;
const PORT = Number(arg('port', '9223'));
/**
 * T7 — the rasteriser. SwiftShader stays the default so an old command line keeps
 * measuring what it always measured; `gl` / `vulkan` are the real-GPU runs.
 */
const GPU = arg('gpu', 'swiftshader');
const GPU_FLAGS = {
  swiftshader: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  gl: ['--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu'],
  vulkan: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist'],
}[GPU];
if (GPU_FLAGS === undefined) {
  console.error(`arena-bench: --gpu must be swiftshader, gl or vulkan (got ${GPU})`);
  process.exit(2);
}
const SAMPLE_MS = Number(arg('ms', '5000'));
/** D270 — the replay speed the sample plays at; 4 unless asked. */
const SPEED = String(arg('speed', '4'));
/** D270 — where to write the sample's numbers as JSON, or null. */
const JSON_OUT = arg('json', null);
/** D270 — where to write a CPU profile of the sample, or null. */
const CPU_PROFILE = arg('cpu-profile', null);
/** The GPU pass's fix pass — Chromium's own pacing (vsync and the frame-rate limit on), for the max. */
const VSYNC = args.includes('--vsync');
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
    ...GPU_FLAGS,
    '--no-sandbox',
    '--disable-dev-shm-usage',
    // **Without these the measurement measures the compositor, not us.** With
    // vsync on, every `requestAnimationFrame` delta is a multiple of 16.7 ms, so
    // p95 is either 16.7 (perfect) or 33.4 (one slipped frame) and §9.4's 20 ms
    // gate cannot tell a slow renderer from a single hiccup. Measured before
    // adding them: p50 16.70 · p95 33.40 · max 133.30, every value a multiple of
    // one refresh.
    // `--vsync` keeps both (the GPU pass's fix pass): a browser's own pacing,
    // for the max on a real GPU, where the unthrottled loop's max is the WebGL
    // command buffer's drain rather than a frame (the header).
    ...(VSYNC ? [] : ['--disable-gpu-vsync', '--disable-frame-rate-limit']),
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

  /**
   * **§8 rule 7's path, and CDP is the only way in.** `prefers-reduced-motion` is
   * a media query: there is no URL flag and no app setting for it, and the arena
   * reads it with `matchMedia` at mount. Emulating it here is what makes "reduced
   * motion collapses every cue to a snap" a measurement rather than a claim — the
   * frame times below are then of a table that is *snapping* rather than animating.
   */
  if (REDUCED_MOTION) {
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
  }

  // The arena chunk is lazy and the textures are fetched from Scryfall, so give
  // it a real chance to settle before measuring anything.
  await sleep(6000);
  const ready = await evaluate(
    cdp,
    `(() => ({ canvas: !!document.querySelector('canvas'), handle: typeof window.__mtgArena }))()`,
  );
  if (!ready.canvas) throw new Error('no <canvas>: the arena did not mount');

  /**
   * **T7 — find a frame with figures on it, and say which one** (report 13 §8.5).
   *
   * The slider is the replay's own transport index, so this steps it across the
   * middle of the recording and reads the layer census off `?glinfo=1`'s
   * `info().layers` — a count of figures, discs, tiles, forms and busts, written by
   * the frame loop. Two `requestAnimationFrame`s per step, because under
   * `frameloop='demand'` the counts are only current once a frame has actually
   * rendered.
   *
   * It is a search rather than a hard-coded index because the index depends on the
   * recording: `--url` names the fixture and `--figures` names the load.
   */
  let chosen = null;
  if (INDEX >= 0) {
    chosen = await evaluate(
      cdp,
      `(async () => {
        const range = document.querySelector('input[type=range]');
        if (!range) return null;
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        set.call(range, String(${String(INDEX)}));
        range.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const info = window.__mtgArena && window.__mtgArena.info;
        const layers = info ? (info().layers ?? null) : null;
        return { index: ${String(INDEX)}, figures: layers ? layers.figures : -1, layers, total: Number(range.max) };
      })()`,
    );
    if (chosen !== null) {
      console.log(
        `arena-bench: scrubbed to transport index ${String(chosen.index)} of ${String(chosen.total)} — ` +
          `${String(chosen.figures)} figures · layers ${JSON.stringify(chosen.layers)}`,
      );
    }
  } else if (WANT_FIGURES > 0) {
    chosen = await evaluate(
      cdp,
      `(async () => {
        const range = document.querySelector('input[type=range]');
        if (!range) return null;
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        const total = Number(range.max);
        const info = window.__mtgArena && window.__mtgArena.info;
        if (!info) return null;
        const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        let best = { index: -1, figures: -1, layers: null };
        for (let i = 0; i <= 48; i++) {
          const index = Math.round((total * (0.25 + (0.7 * i) / 48)));
          set.call(range, String(index));
          range.dispatchEvent(new Event('input', { bubbles: true }));
          await frame();
          const layers = info().layers ?? {};
          const figures = layers.figures ?? 0;
          if (figures > best.figures) best = { index, figures, layers };
          if (figures >= ${String(WANT_FIGURES)}) break;
        }
        // Leave the slider on the best frame found.
        set.call(range, String(best.index));
        range.dispatchEvent(new Event('input', { bubbles: true }));
        await frame();
        return { ...best, total };
      })()`,
    );
    if (chosen !== null) {
      console.log(
        `arena-bench: scrubbed to transport index ${String(chosen.index)} of ${String(chosen.total)} — ` +
          `${String(chosen.figures)} figures · layers ${JSON.stringify(chosen.layers)}`,
      );
    }
  }

  /**
   * Scrub to the busiest frame of the recording — §9.4 says "a fixture scrubbed
   * to its busiest frame (a full combat)" — then play the replay at 4× so the
   * cue queue is never empty, and sample `requestAnimationFrame` deltas.
   *
   * **T7:** when `--figures` already scrubbed to a figure-rich frame, that frame is
   * kept and the 0.55 heuristic is skipped — a bench of a frame with no figures on
   * it is exactly the mistake §8.5 exists to prevent.
   */
  if (CPU_PROFILE !== null) {
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
    await cdp.send('Profiler.start');
  }
  const sample = await evaluate(
    cdp,
    `(async () => {
      const range = document.querySelector('input[type=range]');
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const total = Number(range.max);
      if (${String(WANT_FIGURES)} <= 0 && ${String(INDEX)} < 0) {
        // 0.55 of the way in: the corpus' combats are in the middle third.
        set.call(range, String(Math.round(total * 0.55)));
        range.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await new Promise((r) => setTimeout(r, ${String(SETTLE_MS)}));
      // Play, fast, so the queue always has something to animate.
      const speed = [...document.querySelectorAll('select')][0];
      if (speed) { const s = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set; s.call(speed, ${JSON.stringify(SPEED)}); speed.dispatchEvent(new Event('change', { bubbles: true })); }
      const play = [...document.querySelectorAll('button')].find((b) => /play/i.test(b.title ?? '') || /play/i.test(b.innerText));
      if (play) play.click();

      const deltas = [];
      // The texture count beside each frame, so a spike can be told apart from a
      // slow renderer: a first upload of a 745x1040 card face is not fill rate.
      const textures = [];
      // …and the program count, so a first-use shader compile is told apart from
      // an upload (T7: the bloom run's one long frame).
      const programs = [];
      // D270 — the renderer's own frame counter beside each tick, so the frames
      // the arena DREW can be told from an idle rAF under frameloop='demand'.
      const drawn = [];
      // …and whether the arena's caption strip (D255) was on screen, per tick.
      let captionTicks = 0;
      const infoFn = window.__mtgArena && window.__mtgArena.info;
      let last = null;
      await new Promise((done) => {
        const stop = performance.now() + ${String(SAMPLE_MS)};
        const tick = (now) => {
          if (last !== null) {
            deltas.push(now - last);
            const mem = infoFn ? infoFn().memory : null;
            textures.push(mem ? mem.textures : -1);
            programs.push(mem ? (mem.programs ?? -1) : -1);
            const counters = infoFn ? infoFn().render : null;
            drawn.push(counters ? (counters.frame ?? -1) : -1);
            if (document.querySelector('.arena__caption') !== null) captionTicks += 1;
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
        programs,
        drawn,
        caption: deltas.length > 0 ? captionTicks / deltas.length : 0,
        // Where the replay's slider stood when the counters below were read.
        endIndex: Number(range.value),
        body,
        render: counters ? counters.render : gl ? { ...gl.info.render } : null,
        memory: counters ? counters.memory : gl ? { ...gl.info.memory } : null,
        // T7's layer census: how many instances each pose layer drew. Numbers only.
        layers: counters ? (counters.layers ?? null) : null,
        dpr: window.devicePixelRatio,
        // The dev handle does not exist in a production build, so the render
        // resolution is read off the canvas itself: backing pixels / CSS pixels.
        renderDpr: (() => {
          const c = document.querySelector('canvas');
          return c && c.clientWidth > 0 ? Number((c.width / c.clientWidth).toFixed(2)) : null;
        })(),
        size: [window.innerWidth, window.innerHeight],
        // What actually rasterised the frames above — SwiftShader or a real GPU.
        renderer: (() => {
          const c = document.querySelector('canvas');
          const g = c && (c.getContext('webgl2') || c.getContext('webgl'));
          if (!g) return null;
          const x = g.getExtension('WEBGL_debug_renderer_info');
          return x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER);
        })(),
        // Dev-only: the queue is not on the production handle (the draw-call
        // counters are; a cue census is a debugging aid and stays behind DEV).
        cues: handle?.queue ? Object.fromEntries(handle.queue.seen) : null,
      };
    })()`,
  );

  if (CPU_PROFILE !== null) {
    const { profile } = await cdp.send('Profiler.stop');
    writeFileSync(CPU_PROFILE, JSON.stringify(profile));
    console.log(`arena-bench: CPU profile of the sample → ${CPU_PROFILE}`);
  }
  // Ordered, for the spike diagnostic below; sorted, for the percentiles.
  const ordered = sample.deltas;
  const deltas = sample.deltas.filter((d) => d > 0).sort((a, b) => a - b);
  if (deltas.length < 30) throw new Error(`only ${String(deltas.length)} frames in ${String(SAMPLE_MS)} ms — the loop never ran`);
  const at = (p) => deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * p))];
  const p50 = at(0.5);
  const p95 = at(0.95);
  const max = deltas[deltas.length - 1];
  const fps = 1000 / p50;
  // D270 — back-to-back RENDERED frames only: tick i counts when the renderer's
  // frame counter moved on it AND on the tick before, so an idle stretch under
  // frameloop='demand' (a ~0.1 ms rAF) and the gap that ends it are both left out.
  const rendered = [];
  {
    const drawn = sample.drawn ?? [];
    for (let i = 1; i < ordered.length; i++) {
      const moved = (drawn[i] ?? -1) !== (drawn[i - 1] ?? -1);
      const movedBefore = i >= 2 && (drawn[i - 1] ?? -1) !== (drawn[i - 2] ?? -1);
      if (moved && movedBefore && ordered[i] > 0) rendered.push(ordered[i]);
    }
    rendered.sort((a, b) => a - b);
  }
  const rAt = (p) => rendered[Math.min(rendered.length - 1, Math.floor(rendered.length * p))];

  console.log(`arena-bench — report 09 §9.4, --gpu ${GPU}`);
  console.log(`  renderer   ${String(sample.renderer)}`);
  console.log(`  url        ${URL_}`);
  console.log(
    `  viewport   ${sample.size[0]}x${sample.size[1]} @ device dpr ${String(sample.dpr)} · RENDER dpr ${String(sample.renderDpr)} (§9.2 rule 9 adapts it)`,
  );
  console.log(`  frames     ${String(deltas.length)} in ${String(SAMPLE_MS)} ms`);
  console.log(`  frame ms   p50 ${p50.toFixed(2)} · p95 ${p95.toFixed(2)} · max ${max.toFixed(2)}`);
  console.log(`  fps (p50)  ${fps.toFixed(1)}`);
  if (rendered.length > 0) {
    console.log(
      `  RENDERED   ${String(rendered.length)} back-to-back drawn frames · p50 ${rAt(0.5).toFixed(2)} · p95 ${rAt(0.95).toFixed(2)} · max ${rendered[rendered.length - 1].toFixed(2)} ms (D270)`,
    );
  } else {
    console.log('  RENDERED   no back-to-back drawn frames (the loop idled, or ?glinfo=1 is off)');
  }
  console.log(`  caption    on screen for ${(100 * sample.caption).toFixed(0)}% of the sampled frames · speed ${SPEED}× · counters read at transport index ${String(sample.endIndex)}`);
  if (sample.body) {
    console.log(
      `  frame body p50 ${sample.body.p50.toFixed(3)} · p95 ${sample.body.p95.toFixed(3)} · max ${sample.body.max.toFixed(3)} ms (§9.1 budget: 2 ms CPU)`,
    );
  }
  console.log(
    `  mode       ${REDUCED_MOTION ? 'prefers-reduced-motion: REDUCE' : 'normal motion'} · ` +
      `${args.includes('--bloom') ? 'BLOOM on' : args.includes('--no-bloom') ? 'bloom off' : 'bloom = app default'} · settle ${String(SETTLE_MS)} ms ` +
      `(${SETTLE_MS >= 2000 ? 'warm' : 'COLD'}) · pacing ${VSYNC ? 'VSYNC (the browser\'s own; every interval a multiple of the beat)' : 'unthrottled'}`,
  );
  if (sample.layers) {
    console.log(`  layers     ${JSON.stringify(sample.layers)}`);
  }
  if (sample.render) {
    console.log(
      `  draw calls ${String(sample.render.calls)} · triangles ${String(sample.render.triangles)} (line ${String(TRI_LINE)}) · geometries ${String(sample.memory.geometries)} · textures ${String(sample.memory.textures)}`,
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
    const prog = sample.programs ?? [];
    const withCompile = slow.filter((i) => i > 0 && (prog[i] ?? 0) > (prog[i - 1] ?? 0));
    const lastSlow = slow.length > 0 ? slow[slow.length - 1] : -1;
    console.log(
      `  over ${String(MAX_MS)} ms  ${String(slow.length)} of ${String(ordered.length)} frames` +
        (slow.length === 0
          ? ''
          : ` · last at frame ${String(lastSlow)} of ${String(ordered.length)}` +
            ` · ${String(withUpload.length)} coincide with a new texture, ${String(withCompile.length)} with a new program` +
            ` (settle was ${String(SETTLE_MS)} ms)`),
    );
    if (prog.length > 0) {
      console.log(`  programs   ${String(prog[0])} at the first sampled frame → ${String(prog[prog.length - 1])} at the last`);
    }
  }

  if (JSON_OUT !== null) {
    writeFileSync(
      JSON_OUT,
      JSON.stringify(
        {
          url: URL_,
          gpu: GPU,
          pacing: VSYNC ? 'vsync' : 'unthrottled',
          renderer: sample.renderer,
          index: INDEX,
          speed: Number(SPEED),
          endIndex: sample.endIndex,
          settleMs: SETTLE_MS,
          renderDpr: sample.renderDpr,
          size: sample.size,
          caption: sample.caption,
          frames: deltas.length,
          p50,
          p95,
          max,
          rendered: rendered.length > 0
            ? { frames: rendered.length, p50: rAt(0.5), p95: rAt(0.95), max: rendered[rendered.length - 1] }
            : null,
          render: sample.render,
          memory: sample.memory,
          layers: sample.layers,
          programs: [sample.programs?.[0] ?? -1, sample.programs?.[sample.programs.length - 1] ?? -1],
          over50: ordered.filter((d) => d > MAX_MS).length,
          // The raw intervals in order, and the renderer's frame counter beside each.
          deltas: ordered.map((d) => Number(d.toFixed(2))),
          drawn: sample.drawn,
        },
        null,
        2,
      ),
    );
  }

  const failures = [];
  // **T7's own gate**: a bench of a frame with no figures on it is not a Tier 2
  // measurement at all (report 13 §8.5), so asking for figures and not getting
  // them is a failure rather than a footnote.
  if (WANT_FIGURES > 0) {
    const got = sample.layers?.figures ?? (chosen ? chosen.figures : 0);
    if (got < WANT_FIGURES) {
      failures.push(`${String(got)} figures on the benched frame, asked for ${String(WANT_FIGURES)}`);
    }
  }
  if (p95 > P95_MS) failures.push(`p95 ${p95.toFixed(2)} ms > ${String(P95_MS)} ms`);
  if (max > MAX_MS) failures.push(`max ${max.toFixed(2)} ms > ${String(MAX_MS)} ms`);
  if (sample.render && sample.render.calls > 120) failures.push(`${String(sample.render.calls)} draw calls > 120`);
  if (sample.render && sample.render.triangles > TRI_LINE) failures.push(`${String(sample.render.triangles)} triangles > ${String(TRI_LINE)} (${TRI_WHY}${PERSONAL ? '' : '; a page that draws personal models is benched with --personal'})`);
  if (failures.length > 0) {
    console.error(`\nFAIL: ${failures.join('; ')}`);
    if (max > MAX_MS && GPU !== 'swiftshader' && !VSYNC) {
      // D273: on a real GPU the unthrottled loop outruns the GPU, fills the WebGL
      // command buffer and waits for it to drain every few dozen frames — that
      // wait is this max, not a frame a browser would show. The line stands.
      console.error('  (the max, unthrottled on a real GPU, is the WebGL command buffer draining — D273; --vsync reads it at a browser\'s pacing)');
    }
    code = 1;
  } else {
    console.log(`\nOK: inside §9.4’s gate (p95 ≤ 20 ms, max ≤ 50 ms), §9.1’s draw-call budget and the triangle line (${TRI_WHY})`);
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
