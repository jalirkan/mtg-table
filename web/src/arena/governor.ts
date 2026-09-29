/*
 * mtg-table — arena/governor.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The DPR governor's window and its one decision per frame — pure** (the GPU
 * pass, D272). It was inline in `Arena.tsx`'s `DprGovernor`, where no test could
 * run it; `perf.ts` keeps the ladder and the numbers ({@link GOVERNOR}), and this
 * file keeps the state machine, beside them and apart from them for one mechanical
 * reason: `perf.ts` is imported by the scene (`look.ts`), so what it holds rides
 * the shared `arena-scene` chunk, and only the arena runs a governor.
 *
 * No three, no React, no DOM beyond `perf.ts`'s one `devicePixelRatio` read, and
 * no allocation per frame: the window is a fixed ring written in place.
 */

import { DPR_FLOOR, GOVERNOR, dprCeiling } from './perf.ts';

/** The governor's numbers, as {@link GOVERNOR} or a variant of it (a test's control). */
export type GovernorConfig = { readonly [K in keyof typeof GOVERNOR]: number };

/**
 * **The governor's window, and its one decision per frame — pure** (D272; it was
 * inline in `Arena.tsx`'s `DprGovernor`, where no test could run it). A fixed ring
 * of frame intervals, the step's clock and the settle's counters: allocated once,
 * written in place, so {@link governorFrame} allocates nothing.
 */
export interface GovernorWindow {
  readonly samples: Float64Array;
  count: number;
  at: number;
  last: number;
  lastStep: number;
  /** Frames still to discard after a step, and the time already discarded. */
  skip: number;
  skipMs: number;
}

export function governorWindow(config: GovernorConfig = GOVERNOR): GovernorWindow {
  return { samples: new Float64Array(config.window), count: 0, at: 0, last: 0, lastStep: 0, skip: 0, skipMs: 0 };
}

/** A step was taken at `now`: measure the rung it produced, from scratch, after the settle. */
export function restartWindow(w: GovernorWindow, now: number, config: GovernorConfig = GOVERNOR): void {
  w.lastStep = now;
  w.count = 0;
  w.at = 0;
  w.skip = config.settleFrames;
  w.skipMs = 0;
}

/**
 * What the governor does this frame: `'down'` / `'up'` a rung (the window has
 * restarted), `'floor'` (late at {@link DPR_FLOOR}: the caller drops the composer
 * — {@link postOnFloor} — and restarts the window if that changed anything), or
 * `null`. The arithmetic is `DprGovernor`'s as it was — a rate of late frames down,
 * a clean full window up, the cooldown, the quiet before a climb, the parked-loop
 * gap — with two changes, both for a machine drawing slow frames: a verdict is
 * taken on the frame that decides it, and the settle after a step is counted in
 * time as well as in frames.
 */
export function governorFrame(
  w: GovernorWindow,
  now: number,
  dpr: number,
  config: GovernorConfig = GOVERNOR,
  /** Take a decided verdict early (D272). `false` is the window as it was — a test's control. */
  early = true,
): 'down' | 'up' | 'floor' | null {
  const previous = w.last;
  w.last = now;
  if (previous === 0) return null;
  const delta = now - previous;
  // `frameloop="demand"` parks the loop whenever the queue drains, so the first
  // frame after a batch arrives is a gap and not a slow frame.
  if (delta > config.parkedMs) return null;
  if (w.skip > 0) {
    w.skip -= 1;
    w.skipMs += delta;
    if (config.settleFrames - w.skip >= config.settleMinFrames && w.skipMs >= config.settleMs) w.skip = 0;
    return null;
  }
  const size = config.window;
  if (w.count < size) {
    w.samples[w.count] = delta;
    w.count += 1;
  } else {
    w.samples[w.at] = delta;
    w.at = (w.at + 1) % size;
  }
  let late = 0;
  let worst = 0;
  for (let i = 0; i < w.count; i++) {
    const d = w.samples[i] ?? 0;
    if (d > config.downMs) late += 1;
    if (d > worst) worst = d;
  }
  // **A verdict the next frames cannot change is taken now** (D272): once more
  // frames are late than `lateFraction` of `minSamples`, the window's answer at
  // `minSamples` is "down" whatever the frames still to come — so the step is
  // taken on the frame that decides it, not seven frames later. On a machine at
  // 135 ms a frame that is a second a rung; a burst of uploads the count rule
  // would let pass, this lets pass too.
  const enough = w.count >= config.minSamples || (early && late > config.lateFraction * config.minSamples);
  if (!enough) return null;
  if (now - w.lastStep < config.cooldownMs) return null;
  let direction = 0;
  if (late / w.count > config.lateFraction) direction = -1;
  else if (w.count === size && worst <= config.upMs && now - w.lastStep >= config.upQuietMs) direction = 1;
  if (direction === 0) return null;
  // **A step that cannot move is not a step**: at a ladder's end the window is
  // left alone, so the other direction's decision stays in reach.
  const stuck = direction < 0 ? dpr <= DPR_FLOOR + 1e-6 : dpr >= dprCeiling() - 1e-6;
  if (stuck) return direction < 0 ? 'floor' : null;
  restartWindow(w, now, config);
  return direction < 0 ? 'down' : 'up';
}

