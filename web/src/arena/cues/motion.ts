/*
 * mtg-table — arena/cues/motion.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The comic motion lane's two switches, and the one function that steps a cue**
 * (`docs/research/15-art-direction.md` §3.7 and §9.2; D149 and
 * D152).
 *
 *  - **Comic FX** — the new vocabulary: impact bursts and their lettering, ink
 *    splats, halftone dots, speed lines, the hologram-to-ink summon and the impact
 *    shakes. `registry.ts` puts every one of them behind `CueContext.comic`, so
 *    *off* is the film exactly as it was before the lane.
 *  - **On twos** — the comic's stepped motion (Spider-Verse animates its characters
 *    "on twos", twelve drawings a second): each cue's progress is QUANTISED before
 *    its `apply` sees it. The camera, the idle breathing and the HUD's DOM are not
 *    cues and stay on ones.
 *
 * `[NO three]`, `[NO React]`, `[NO DOM]`, **no clock**: {@link onTwos} is a pure
 * function of a cue's own progress, its played length and the step, so it pauses,
 * scrubs, skips, compresses and slows down exactly as the cue does — the virtual
 * clock is still the only clock (D57, D72), and an idle table still renders
 * nothing. {@link motionFromSearch} reads a query string it is handed.
 */

/** Comic FX is the lane's deliverable: on unless `?fx=classic` or the cue strip says otherwise. */
export const COMIC_FX_DEFAULT = true;

/** On twos is on by default (the brief), and always off under `prefers-reduced-motion`. */
export const ON_TWOS_DEFAULT = true;

/** Twelve drawings a second of SCREEN time — "on twos" at a 24 fps film rate. */
export const TWOS_FPS = 12;
export const TWOS_MS = 1000 / TWOS_FPS;

/**
 * **The fewest drawings a cue is stepped into.** A tap compressed into a 250 ms
 * live budget is 60 ms long — under one twelfth of a second — and quantising it at
 * 83 ms would show its first drawing and then snap to its last, deleting the
 * middle of the only beat that says "this land tapped". So a short cue is drawn in
 * at least this many steps, faster than twelve a second; a long one is on twos.
 */
export const TWOS_MIN_STEPS = 4;

/**
 * **A cue's progress, on twos.** `t` is the cue's own linear progress (0…1), `ms`
 * its played length in the queue's virtual milliseconds and `stepMs` one drawing's
 * length in the same units (`TWOS_MS × speed`, so a 4× replay is still twelve
 * drawings a second of screen time).
 *
 * `t = 1` is returned as `1` exactly — a cue's last frame is identity, and on twos
 * must not hold it a step short of that (§5.1). Everything below it is floored to
 * the start of its drawing, so the pose holds for a step and then jumps: the
 * stepped motion IS the look.
 */
export function onTwos(t: number, ms: number, stepMs: number): number {
  if (t >= 1) return 1;
  if (t <= 0) return 0;
  if (!(ms > 0) || !(stepMs > 0)) return t;
  let steps = Math.round(ms / stepMs);
  if (steps < TWOS_MIN_STEPS) steps = TWOS_MIN_STEPS;
  return Math.floor(t * steps) / steps;
}

/** The lane's two settings, as the URL states them. */
export interface MotionFlags {
  /** `?fx=comic` (the default) or `?fx=classic` — the new vocabulary, or the film before it. */
  comic: boolean;
  /** `?twos=1` (the default) or `?twos=0`. Reduced motion turns it off whatever this says. */
  twos: boolean;
}

export const DEFAULT_MOTION: MotionFlags = Object.freeze({ comic: COMIC_FX_DEFAULT, twos: ON_TWOS_DEFAULT });

/**
 * `?fx=classic|comic` and `?twos=0|1` → the two settings. Anything else is the
 * default; a malformed query is the default. Pure: the caller reads
 * `window.location.search` (inside `try`) and hands it in.
 */
export function motionFromSearch(search: string): MotionFlags {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return DEFAULT_MOTION;
  }
  const fx = params.get('fx');
  const twos = params.get('twos');
  return {
    comic: fx === 'classic' ? false : fx === 'comic' ? true : COMIC_FX_DEFAULT,
    twos: twos === '0' ? false : twos === '1' ? true : ON_TWOS_DEFAULT,
  };
}
