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
 * **Which look the arena draws when nobody said** (Lane LOOK, **D137**): the comic
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
 * **Whether the comic look draws its ink line** (**D139**, **D146**): the
 * depth-edge pass (`scene/Post.tsx`'s `InkEffect`), which rides bloom's composer —
 * `postprocessing` merges it into the one `EffectPass` bloom already pays for, so
 * with bloom on it costs **no** draw call and no triangle. **`'post'` means on
 * bloom's composer and nowhere else** (D146): with bloom off the arena mounts no
 * composer and draws no line, because a composer for the ink alone measured
 * **+2.4 ms p95** over the hologram on the GTX 1080 at `g1`@316 (report 15
 * §9.1's line is +1.5; `docs/evidence/look.md`). `?ink=always` draws it anyway,
 * for measurement; `?ink=none` never. The governor's rung below the floor drops
 * bloom, and the ink with it ({@link postOnFloor}): the bands, the rim and the
 * shadow still read without a line.
 */
export const INK_DEFAULT: 'post' | 'always' | 'none' = 'post';

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


/**
 * **The personal tier's budget** (phase 2, **D195**; its triangle line is **D197**,
 * `docs/guides/personal-tier.md`). A personal model (`personal/models/<slug>/`,
 * dev server only, D190) replaces a CC0 body of 1,400 triangles and one draw call
 * — and its props — with one of up to {@link PERSONAL_TRI_CAP} triangles and, since
 * **D240**, exactly one draw call too: prepare folds every paint into one atlas
 * under one material, so a dressed figure is ONE skinned primitive (its own
 * texture, its own program variant).
 *
 * **Report 13 §8.2's 30,000 triangles is the REPOSITORY tier's line** — the CC0
 * table, the build, what anyone else can run — and it has no headroom at
 * `g1`@316 (26,315). The personal tier never ships (it exists only on the user's
 * own dev server), so it has a line of its own, and that line is a SUM, not a
 * product of caps: at most {@link PERSONAL_TABLE_TRIS} personal triangles on the
 * table at once, the duelists' models counted first. The worst case is therefore
 * that number exactly — measured with `tools/arena-bench.mjs --index 316
 * --personal`, the budget filled by six 6,000-triangle models (both duelists and
 * four creatures), on the GTX 1080 and on SwiftShader
 * (`docs/evidence/personal-tier.md` §18; they were two-paint models then, and a
 * dressed figure has been one call since D240 —
 * `docs/evidence/arena-personal-polish.md`). A model over either per-model cap is
 * never loaded (the dev route and the overlay both say why); a creature whose
 * model would cross the sum, or past {@link PERSONAL_MAX_FIGURES}, keeps its CC0
 * figure, in placement order — "degrade, don't stutter" (report 09 §9.2 rule 9).
 */
export const PERSONAL_TRI_CAP = 8000;
/**
 * **The draw calls a personal model may cost a figure: ONE** (**D240**, PLAN
 * follow-up 33). `tools/personal/prepare.mjs` packs every paint into one atlas and
 * merges every part into one skinned primitive under one material, and
 * `check.mjs` fails a file that draws more; the dev route counts the primitives
 * in the very `model.glb` it would serve and skips a file of more (a model
 * prepared before D240 — Doom's hood and tunic were two), and the arena's reader
 * holds the index to the same number. It was 2 (D195): a two-paint figure was one
 * call more than the CC0 body it replaced, and the worst case crossed report 13
 * §8.2's 90-call line by that.
 */
export const PERSONAL_CALL_CAP = 1;
/** The most creatures dressed in personal models at once (the two duelists are not counted). */
export const PERSONAL_MAX_FIGURES = 4;
/**
 * **The personal tier's triangle line** (**D197**): the most personal triangles
 * on the table at once — both duelists' models and every dressed creature's,
 * summed. Two duelists and four creatures at 6,000 each; two duelists and two
 * creatures at the 8,000 cap. The table's own line with it is report 13 §8.2's
 * 30,000 (`tools/assets-manifest.json`'s `budget.triangles`, D161) plus this —
 * the line `tools/arena-bench.mjs --personal` holds a frame to.
 */
export const PERSONAL_TABLE_TRIS = 36000;

/**
 * **The relief window** (D225, D226): the workshop's INSPECT view draws the
 * card's painting as a displaced plane — the personal tier's depth map
 * (`tools/personal/relief.mjs`, never committed) sending each vertex back from
 * the window along its ray from the camera's seat. Two numbers, and both are the
 * page's cost as much as its look:
 *
 * - `RELIEF_DEPTH` — how far the painting's farthest point stands behind its
 *   nearest, as a fraction of the backdrop's HEIGHT (1.45 × the figure's): 0.3 is
 *   ~0.44 of a figure. The nearest point stays on the window, where the flat
 *   picture stood, so the figure in front is as clear of it as before
 *   (`workshop.test.ts` measures every figure).
 * - `RELIEF_GRID` — the plane's segments across and down: 128 × 96 is 12,288
 *   quads, 24,576 triangles in ONE draw call, built once per card at commit (the
 *   map is ~410 × 301 px, so a vertex every ~3.2 px of it). The pedestal draws one
 *   card; the arena draws none of it.
 */
export const RELIEF_DEPTH = 0.3;
export const RELIEF_GRID: readonly [number, number] = Object.freeze([128, 96] as [number, number]);
/**
 * **Where the painting is CUT** (D227): a grid vertex whose depth and its four
 * neighbours one cell away differ by more than this — a fraction of the map's
 * range, ~0.12 × `RELIEF_DEPTH` of the backdrop's height across ~3.2 px of
 * the map — stands at a silhouette, and the FRONT layer is not drawn there, so
 * an orbit shows the BACK layer (what the subject hides, filled in) instead of
 * the subject's edge stretched across the gap. A floor or a sky ramps far under
 * it (a whole-height ramp is ~0.02 a cell); a subject's silhouette jumps far
 * over it (0.4–0.9). `tools/personal/relief.mjs` predicts the same cells when it
 * builds the back layer (it reads this number and `RELIEF_GRID`, and a change to
 * either makes every map stale).
 */
export const RELIEF_CLIFF = 0.12;
/**
 * **The depth map's version** (D228): what its three channels mean to the
 * shader. 3 is red the front's depth, green the back's, blue the FRONT's keep
 * mask (255 drawn, 0 cut — cut pixel for pixel by `tools/personal/relief.mjs`,
 * which builds the back image to exactly that cut). A version-2 map's blue is the
 * painting's own depth, which the shader would misread as a mask, so the dev
 * route serves a map of any other version without its back layer and the inspect
 * view draws that painting flat until the tool runs again. `relief.mjs`'s
 * `RECIPE_VERSION` is the tool's copy; `web/test/relief.test.ts` holds them equal.
 */
export const RELIEF_MAP_VERSION = 3;
