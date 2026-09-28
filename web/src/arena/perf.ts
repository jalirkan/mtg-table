/*
 * mtg-table — arena/perf.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The resolution policy** — report 09 §2.4's `perf.ts` ("dpr/frameloop
 * policy"), §9.2 rule 9 ("degrade, don't stutter") and §9.4's gate.
 *
 * Pure arithmetic and one `window.devicePixelRatio` read, so `node --test` can
 * import it with nothing but type stripping: the ladder is the one part of the
 * performance work that can be checked without a GPU, and the rung arithmetic
 * is exactly the part that was wrong (see {@link dprRungs}).
 *
 * `Arena.tsx` owns the `useFrame` that feeds this; nothing here touches three,
 * React or the DOM beyond that one read.
 */

/**
 * §9.2 rule 9's floor: below this the card art is mush and the scene has
 * stopped being worth rendering at all. `<Canvas performance={{ min: 0.5 }}>`
 * is the same number from the other end.
 */
/**
 * **Whether bloom is on when nobody said** (user decision 6, `scene/Post.tsx`):
 * "default ON if the bench stays within budget on this machine (GeForce GTX 1080
 * present; the sandbox bench uses SwiftShader as a lower bound), else default off
 * with a toggle".
 *
 * **It is ON, because the bench on this machine's GTX 1080 says so** — measured by
 * T7 with `tools/arena-bench.mjs --gpu gl` (headless Chromium, ANGLE on the NVIDIA
 * driver) at `g1.jsonl` transport index 316 with 11 figures on the table, warm,
 * 1920×993 at render dpr 1: **p95 1.1 ms, max 18.1–19.3 ms over three runs**, all
 * inside §9.4's gate (p95 ≤ 20, max ≤ 50), against p95 0.4 ms with bloom off. The
 * max passed only after `EffectPool.prime` moved a lazy shader compile to mount;
 * before that one frame per run landed at 52–62 ms.
 *
 * **Under SwiftShader it fails by four times** — p95 82.3 ms at the dpr-0.6 floor,
 * against 16.4 ms without it — which is why the DPR governor has a rung below its
 * floor that turns bloom off on a machine that is still late there (`Arena.tsx`'s
 * `onFloor`), and why the cue controls carry the checkbox. `?bloom=0` / `?bloom=1`
 * set where it starts. Numbers and caveats: `docs/evidence/m7-tier2.md`, T7.
 *
 * It lives here rather than beside the component for one mechanical reason: the
 * component is **lazily imported**, so reading its default would load the 16.5 kB
 * (gzip) of `postprocessing` before anyone had decided to use it.
 */
export const BLOOM_DEFAULT = true;

/**
 * **Which look the arena draws when nobody said** (Lane LOOK, **D120**): the comic
 * look — ink, three cel bands from one lens-fixed key light, a rim in the card's
 * colour, a specular dot, halftone in the shadow band, a contact shadow and a
 * mid-value stage (`arena/look.ts`). The user judged report 15's spike beside
 * their card art on 2026-09-27 and approved the direction; `?look=holo` restores
 * **D53**'s hologram, and the workshop's toolbar switches the two live.
 *
 * It is here, beside {@link BLOOM_DEFAULT}, for the same two reasons: the default
 * is a MEASUREMENT as much as a preference — at `g1.jsonl`@355 with bloom off the
 * comic look draws within §8.2's lines (≤ 90 calls, ≤ 30,000 triangles) and on the
 * GTX 1080 its p95 at @316 is within 1.5 ms of the hologram's
 * (`docs/evidence/look.md`) — and reading it must not load a renderer module.
 */
export const LOOK_DEFAULT: 'comic' | 'holo' = 'comic';

/**
 * **Whether the comic look draws its ink line** (**D122**): the depth-edge pass
 * (`scene/Post.tsx`'s `InkEffect`), which rides bloom's composer — `postprocessing`
 * merges it into the one `EffectPass` bloom already pays for, so with bloom on it
 * costs **no** draw call and no triangle. `?ink=none` turns it off. On a machine
 * still late at the DPR floor the governor's rung below the floor drops it
 * together with bloom ({@link postOnFloor}): the bands, the rim and the shadow
 * still read without a line.
 */
export const INK_DEFAULT: 'post' | 'none' = 'post';

/**
 * **The rung below the DPR floor** (§9.2 rule 9, one step further): the arena's
 * one optional composer — bloom and the ink riding it — is dropped whole, because
 * the composer's full-screen passes are the fill a CPU rasteriser cannot pay for
 * (report 15 §3.4: SwiftShader +14 to +24 ms p50 for the composer at dpr 1).
 * Returns what to switch off, or `null` when nothing optional is on — the
 * governor then has no rung left and says so once.
 */
export function postOnFloor(bloom: boolean, ink: boolean): { bloom: false; ink: false } | null {
  return bloom || ink ? { bloom: false, ink: false } : null;
}

export const DPR_FLOOR = 0.6;

/** Never render more pixels than the screen can show. A ceiling is not a target. */
export function dprCeiling(): number {
  return Math.min(1.5, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
}

/**
 * **The rungs**, from {@link dprCeiling} down to {@link DPR_FLOOR}.
 *
 * A ladder and not an arithmetic step, because the floor is not on the step
 * grid: stepping down by 0.25 from a ceiling of 1.0 gives 0.75 and then 0.5,
 * which clamps to the 0.6 floor — and stepping back *up* from there by 0.25
 * lands on **0.85**, a rung that is not on the ladder at all and that is a
 * measurably worse place to sit than the 0.75 below it (measured: p95 16.80 at
 * 0.85, p95 14.00 at 0.75). Moving by index cannot do that.
 */
export function dprRungs(ceiling: number = dprCeiling()): number[] {
  const rungs: number[] = [];
  for (let v = Math.max(ceiling, DPR_FLOOR); v > DPR_FLOOR + 1e-6; v -= GOVERNOR.step) {
    rungs.push(Number(v.toFixed(2)));
  }
  rungs.push(DPR_FLOOR);
  return rungs;
}

/** One rung down (`direction < 0`) or up, clamped at both ends. */
export function rungFrom(
  current: number,
  direction: number,
  ceiling: number = dprCeiling(),
): number {
  const rungs = dprRungs(ceiling);
  let index = 0;
  let best = Infinity;
  for (let k = 0; k < rungs.length; k++) {
    const d = Math.abs((rungs[k] ?? 0) - current);
    if (d < best) {
      best = d;
      index = k;
    }
  }
  const next = Math.min(rungs.length - 1, Math.max(0, index + (direction < 0 ? 1 : -1)));
  return rungs[next] ?? current;
}

/**
 * **The resolution ladder, driven by what the gate measures** (verification fix;
 * §9.2 rule 9 and §9.4).
 *
 * The arena first shipped drei's `<PerformanceMonitor>` here, on its own
 * `bounds={() => [55, 60]}`. It does not work for this scene, and the reason is
 * mechanical rather than a matter of tuning:
 *
 *  - **It averages, slowly.** It buckets frames into ≥250 ms windows, keeps ten
 *    of them, and acts only when more than 7.5 of the ten are outside the bound
 *    — so one decision costs **2.5 seconds of continuous rendering**, and under
 *    `frameloop="demand"` that is 2.5 s of *animating*, not of wall clock.
 *  - **§9.4's gate is a tail statistic and an average is blind to it.** Measured
 *    here (production build, `vite preview`, headless Chromium + SwiftShader,
 *    `--settle 4000 --ms 6000`, 1920×993 at device dpr 1): **p50 19.40 ms /
 *    p95 22.40 ms** — a failing p95. Where the p50 is better still, the fps
 *    average sits above the lower bound, `onDecline` has nothing to fire on, and
 *    one frame in twenty is late anyway. Over a 20 s run the drei ladder did
 *    eventually reach 0.75 — and the run still reported p95 22.40, because
 *    "eventually" was most of the run.
 *
 * So the governor below samples the same thing the bench samples — the frame
 * interval — and decides on **how many frames were late**, not on their mean.
 * The scene is fill-rate bound (identical 35 draw calls / 70 triangles at every
 * resolution; only the pixel count changes), so resolution is the right thing to
 * give back.
 *
 * **The trigger is a rate, not a percentile of the window**, and that is a
 * correction the measurement forced. A p95 taken over 16–48 samples is within a
 * frame or two of the *maximum* of that window, so a single 31 ms outlier — and
 * SwiftShader has them at every resolution — reads as "still too slow": the
 * first version of this walked straight past the rung it wanted, down to the 0.6
 * floor. A rate separates the two cases by an order of magnitude. Measured over
 * 48-frame windows on the same replay:
 *
 * | render dpr | frames late (> 17 ms) | worst window | gate |
 * |---|---:|---:|---|
 * | 1.00 | **292 of 293 (99.7%)** | 100% late | FAIL, p95 23.10 |
 * | 0.75 | **12 of 488 (2.5%)** | 18.8% late | OK, p95 14.00 |
 *
 * {@link GOVERNOR.lateFraction} is set at **0.5**, in the middle of that gap: a
 * step down means the renderer is *consistently* missing, never that it spiked.
 *
 * **What it deliberately does not do**: climb back on a vsync-locked display. A
 * browser pinned to 60 Hz reports 16.7 ms whether the GPU had 2 ms of work or
 * 16, so a frame-interval governor cannot see headroom there and must not
 * invent it. It therefore sits still at 60 Hz — which is the right answer for
 * the common case (the ladder never declined, so it is already at the ceiling)
 * and is a stale low resolution only for a machine that was slow earlier in the
 * same session and is not any more. A reload starts at {@link dprCeiling} again,
 * and `?dpr=` pins it outright.
 */
export const GOVERNOR = {
  /** The rolling window, in frames. ~0.8 s at 60 fps. */
  window: 48,
  /** Enough to act on. ~0.25 s: a stutter should not have to be tolerated for a second. */
  minSamples: 16,
  /** A step needs this long to show up in the measurement before the next one. */
  cooldownMs: 500,
  /**
   * Frames discarded immediately after a step.
   *
   * **Changing `dpr` reallocates the drawing buffer**, and the frame that does
   * it is a reallocation rather than a render. Without this the governor reads
   * its own resize hitch as evidence and takes a second step it did not need.
   */
  settleFrames: 5,
  /**
   * A frame longer than this is **late**. §9.4's gate is 20 ms; act before
   * failing it, not after — a governor that triggers exactly at the threshold
   * spends its life on the wrong side of it.
   */
  downMs: 17,
  /**
   * Step down once more than this fraction of the window is late. Half, because
   * the two regimes are 99.7% and 2.5% and anything in between is an outlier
   * cluster rather than a renderer that cannot keep up (see the table above).
   */
  lateFraction: 0.5,
  /**
   * Climb only when **every** frame in a full window came in under this. It is
   * below `downMs` by a clear margin on purpose: the gap between the two is the
   * hysteresis, and without it a machine sitting on the boundary oscillates.
   */
  upMs: 13,
  /** …and only this long after the last step of either kind. */
  upQuietMs: 3000,
  /** The gap between rungs. 0.25 of dpr is ~25–40% of the pixels. */
  step: 0.25,
  /** A frame interval longer than this is the loop having been parked, not a slow frame. */
  parkedMs: 250,
} as const;

/** How much of the window missed {@link GOVERNOR.downMs}. */
export function lateRate(samples: readonly number[], lateMs: number): number {
  if (samples.length === 0) return 0;
  let late = 0;
  for (const delta of samples) if (delta > lateMs) late += 1;
  return late / samples.length;
}

/** The worst frame in the window. */
export function worstOf(samples: readonly number[]): number {
  let worst = 0;
  for (const delta of samples) if (delta > worst) worst = delta;
  return worst;
}

