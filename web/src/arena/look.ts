/*
 * mtg-table — arena/look.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The art-direction SPIKE's switch** (`docs/research/15-art-direction.md` §2,
 * §3 and §10). Throwaway quality, kept in the tree so the lanes can read it.
 *
 * Two looks for every figure the arena draws: `holo` — **D53** and **D97**'s
 * holographic costume, the default and unchanged — and `comic`, the report's
 * proposal: a two-to-three band cel ramp from one lens-fixed key light, a rim in
 * the card's own colour, a specular dot, a halftone screen in the shadow band, a
 * contact shadow under the feet, and an ink line (`ink`) drawn either by a
 * post-process edge pass over the depth buffer (`post`, the default — one full
 * screen pass that bloom's composer already pays for) or by an inverted hull per
 * figure (`hull`, one more draw call per figure). Both are here so the report's
 * measurement can be repeated.
 *
 * Pure: no three, no React, no DOM beyond the query string it is handed, no clock.
 * The look reaches the scene as ONE NUMBER per material (`uLook`, 0 … 1), written
 * at commit — never from the frame loop — so every figure is still one program and
 * an idle table still renders nothing (D58). A number rather than a flag on
 * purpose: §5 proposes that a summon plays the hologram resolving into ink.
 *
 * URL: `?look=comic` (ink `post`), `?look=comic&ink=hull`, `?look=comic&ink=none`.
 * The workshop also has a toolbar toggle. `main.tsx` does not read the flag yet —
 * `Arena.tsx` reads `window.location.search` itself (spike only: Lane LOOK moves
 * it into `arenaFlagsFromQuery`).
 */

export type Look = 'holo' | 'comic';
export type InkMode = 'post' | 'hull' | 'none';

export interface LookSpec {
  readonly look: Look;
  readonly ink: InkMode;
}

export const HOLO_LOOK: LookSpec = Object.freeze({ look: 'holo', ink: 'none' });
export const COMIC_LOOK: LookSpec = Object.freeze({ look: 'comic', ink: 'post' });

/** `?look=comic[&ink=post|hull|none]` → a spec; anything else is the hologram. */
export function lookFromSearch(search: string): LookSpec {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return HOLO_LOOK;
  }
  if (params.get('look') !== 'comic') return HOLO_LOOK;
  const ink = params.get('ink');
  return { look: 'comic', ink: ink === 'hull' || ink === 'none' ? ink : 'post' };
}

/**
 * **The numbers a material takes at commit** (Lane LOOK) — every figure, prop
 * and duelist material reads these three and nothing else of a look.
 */
export interface MaterialLook {
  /** 0 the hologram … 1 the comic look (`uLook`). */
  readonly look: number;
  /** 0 or 1: the halftone screen in the core shadow. */
  readonly halftone: number;
  /** 0 the lens-fixed key light, 1 the world-fixed one. */
  readonly keyWorld: number;
}

export function materialLookOf(spec: LookSpec): MaterialLook {
  const comic = spec.look === 'comic';
  return { look: comic ? 1 : 0, halftone: comic ? 1 : 0, keyWorld: 0 };
}

/** The number a material carries: 0 the hologram, 1 the comic look. */
export function lookValue(spec: LookSpec): number {
  return spec.look === 'comic' ? 1 : 0;
}

/** Does this spec want the post-process ink pass (and so a composer, bloom or not)? */
export function wantsInkPass(spec: LookSpec): boolean {
  return spec.look === 'comic' && spec.ink === 'post';
}

/** Does this spec want an inverted-hull ink line on every figure? */
export function wantsHull(spec: LookSpec): boolean {
  return spec.look === 'comic' && spec.ink === 'hull';
}

/**
 * **The comic look's numbers**, in one place so the workshop and the report quote
 * the same ones. The key light is in VIEW space (x right, y up, z toward the
 * lens): upper left and a little in front, the comic-panel convention — the light
 * belongs to the panel, not to the world, so both seats' figures read the same.
 */
export const COMIC = Object.freeze({
  /** View-space key light direction (normalised in the shader). */
  key: [-0.45, 0.72, 0.52] as const,
  /** The shadow band's colour multiplier: darker AND cooler, never grey. */
  shadowTone: [0.46, 0.44, 0.66] as const,
  /** Saturation push on the costume palette before shading (1 = as painted). */
  saturation: 1.25,
  /** The halftone cell, in device pixels. */
  dotPx: 5,
  /** The ink colour: near-black with a little blue, like a printed K plate. */
  ink: '#0e1016',
  /** Ink width in CSS pixels (the post pass samples this far; the hull extrudes it). */
  inkPx: 1.6,
  /** Contact shadow: its colour, darkness and radius as a fraction of the figure's height. */
  shadow: '#05060a',
  shadowAlpha: 0.72,
  shadowRadius: 0.34,
});
