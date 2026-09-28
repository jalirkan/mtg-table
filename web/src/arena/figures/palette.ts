/*
 * mtg-table — arena/figures/palette.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **An art-derived palette** (lane BODIES, report 15 §7; **D160**): the colours of
 * a card's own Scryfall painting, read at load, as the LOWEST rung of the identity
 * ladder — so a card with no hand-written row (a new set's) still gets colours of
 * its own, and a hand-written row always wins.
 *
 * `[NO three]`, `[NO React]`, `[NO DOM]`, no clock: a pure function of a
 * `Uint8ClampedArray`, so `web/test/palette.test.ts` holds it to determinism and
 * to the corpus with no browser. The pixels come from `arena/art.ts`, which reads
 * the image the card plane already fetched, off the hot path, once per card.
 *
 * ---------------------------------------------------------------------------
 * **The finding that shapes it** (report 15 §7.1, measured on four cards): the
 * DOMINANT colour of a card's art is its BACKGROUND — Coulson's is the cyan glass
 * behind him, the Doombot's the grey sky. So a raw palette never paints a
 * costume. What it is good for is accent and atmosphere, and three roles come
 * out of it:
 *
 *  - `accent` — the most VIVID colour (share × (0.3 + saturation) × (0.4 +
 *    value), saturation over 0.45): Fury's explosion orange, Coulson's teal. The
 *    colour a colourist picks for a card's effects — a prop's accent, an aura's
 *    colour, a disc. The brightness term is the second fix pass's (D164,
 *    PLAN.md's lane BODIES follow-up 7): without it a large muted cluster beat a
 *    bright one of the same saturation, and Fury's accent was `#867448`, the
 *    khaki round his explosion, rather than the explosion.
 *  - `terrain` — the largest cluster that is neither near-black nor near-white:
 *    what a LAND's painting is mostly of, its tile's colour.
 *  - `dominant` — the largest cluster, whatever it is: for the workshop's strip.
 *
 * **Nothing here is committed.** A palette is derived from Marvel art at runtime,
 * in the viewer's browser, from an image `art.json` already names (report 12 §9's
 * line: runtime or gitignored, never in the repo). The test's pixels are
 * synthetic.
 * ---------------------------------------------------------------------------
 */

/** One cluster of the art's colours. */
export interface Swatch {
  /** `#rrggbb`, the cluster's mean. */
  hex: string;
  /** Its share of the sampled pixels, 0…1. */
  share: number;
  /** HSV saturation, 0…1. */
  saturation: number;
  /** HSV value (brightness), 0…1. */
  value: number;
}

/** A card's art, as the ladder reads it. */
export interface ArtPalette {
  /** Every cluster, largest first. */
  swatches: readonly Swatch[];
  /** The largest cluster — usually the background. */
  dominant: string;
  /**
   * The most vivid cluster (see the header); if nothing is vivid, the most
   * colourful cluster that is not near-black; the dominant only if all are.
   */
  accent: string;
  /** Whether {@link ArtPalette.accent} passed the vividness bar. */
  vivid: boolean;
  /** The largest cluster that is neither near-black nor near-white: a land's tile. */
  terrain: string;
}

/**
 * **The art box of a Scryfall `normal` image** (488 × 680), as fractions: x 8–92 %,
 * y 11–55 % — the painting, not the frame, the name bar or the rules text
 * (report 15 §7.1's window, measured on the M15-frame cards of this deck).
 */
export const ART_WINDOW = { x0: 0.08, x1: 0.92, y0: 0.11, y1: 0.55 } as const;

/** The clustering's fixed numbers — part of the determinism `palette.test.ts` holds. */
export const PALETTE_K = 6;
export const PALETTE_ITERATIONS = 12;
/** The vividness bar (report 15 §7.1): saturation over this, and not near-black. */
export const VIVID_SATURATION = 0.45;
export const VIVID_VALUE = 0.3;
/** What a terrain colour may not be: near-black or near-white. */
const TERRAIN_VALUE = [0.22, 0.97] as const;

function hex2(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

export function rgbHex(r: number, g: number, b: number): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/** HSV saturation and value of an 0…255 colour. */
export function saturationValue(r: number, g: number, b: number): { saturation: number; value: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return { saturation: max <= 0 ? 0 : (max - min) / max, value: max / 255 };
}

/** Rec. 709 luma, for the deterministic seeding. */
function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export interface PaletteOptions {
  k?: number;
  iterations?: number;
  /** The sub-rectangle to read, as fractions; the whole image when absent. */
  window?: { x0: number; x1: number; y0: number; y1: number };
  /** Read every `stride`-th pixel in each direction. */
  stride?: number;
}

/**
 * **The palette of an RGBA pixel buffer** — k-means over the window's pixels,
 * SEEDED along the luminance order (the k seeds are the samples at the k evenly
 * spaced luminance quantiles), a fixed number of iterations, and ties broken by
 * index: the same pixels always give the same palette, in any engine. Fully
 * transparent pixels are skipped. `null` for an image with no opaque pixel in its
 * art box. Pure; allocates only its result and its scratch arrays.
 */
export function paletteFromPixels(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  options: PaletteOptions = {},
): ArtPalette | null {
  const k = Math.max(1, Math.floor(options.k ?? PALETTE_K));
  const iterations = Math.max(1, Math.floor(options.iterations ?? PALETTE_ITERATIONS));
  const stride = Math.max(1, Math.floor(options.stride ?? 1));
  const w = options.window ?? { x0: 0, x1: 1, y0: 0, y1: 1 };
  const xs = Math.max(0, Math.floor(w.x0 * width));
  const xe = Math.min(width, Math.ceil(w.x1 * width));
  const ys = Math.max(0, Math.floor(w.y0 * height));
  const ye = Math.min(height, Math.ceil(w.y1 * height));

  const samples: number[] = [];
  for (let y = ys; y < ye; y += stride) {
    for (let x = xs; x < xe; x += stride) {
      const i = (y * width + x) * 4;
      if ((rgba[i + 3] ?? 255) < 8) continue;
      samples.push(rgba[i] ?? 0, rgba[i + 1] ?? 0, rgba[i + 2] ?? 0);
    }
  }
  const n = samples.length / 3;
  if (n === 0) return null;

  // Seeds: the samples at k evenly spaced luminance quantiles (each luma computed
  // once, not once per comparison — the same order, a fraction of the sort).
  const lumas = new Float64Array(n);
  for (let i = 0; i < n; i++) lumas[i] = luma(samples[i * 3]!, samples[i * 3 + 1]!, samples[i * 3 + 2]!);
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => {
    const d = lumas[a]! - lumas[b]!;
    return d !== 0 ? d : a - b;
  });
  const centres: number[] = [];
  for (let c = 0; c < k; c++) {
    const pick = order[Math.min(n - 1, Math.floor(((c + 0.5) / k) * n))]!;
    centres.push(samples[pick * 3]!, samples[pick * 3 + 1]!, samples[pick * 3 + 2]!);
  }

  const assign = new Int32Array(n);
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < n; i++) {
      const r = samples[i * 3]!;
      const g = samples[i * 3 + 1]!;
      const b = samples[i * 3 + 2]!;
      let best = 0;
      let bestD = Number.POSITIVE_INFINITY;
      for (let c = 0; c < k; c++) {
        const dr = r - centres[c * 3]!;
        const dg = g - centres[c * 3 + 1]!;
        const db = b - centres[c * 3 + 2]!;
        const d = dr * dr + dg * dg + db * db;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      assign[i] = best;
    }
    const sums = new Float64Array(k * 4);
    for (let i = 0; i < n; i++) {
      const c = assign[i]! * 4;
      sums[c] = sums[c]! + samples[i * 3]!;
      sums[c + 1] = sums[c + 1]! + samples[i * 3 + 1]!;
      sums[c + 2] = sums[c + 2]! + samples[i * 3 + 2]!;
      sums[c + 3] = sums[c + 3]! + 1;
    }
    for (let c = 0; c < k; c++) {
      const count = sums[c * 4 + 3]!;
      if (count === 0) continue; // an empty cluster keeps its centre
      centres[c * 3] = sums[c * 4]! / count;
      centres[c * 3 + 1] = sums[c * 4 + 1]! / count;
      centres[c * 3 + 2] = sums[c * 4 + 2]! / count;
    }
  }

  const counts = new Array<number>(k).fill(0);
  for (let i = 0; i < n; i++) {
    const c = assign[i]!;
    counts[c] = (counts[c] ?? 0) + 1;
  }
  const swatches: Swatch[] = [];
  for (let c = 0; c < k; c++) {
    if (counts[c] === 0) continue;
    const r = centres[c * 3]!;
    const g = centres[c * 3 + 1]!;
    const b = centres[c * 3 + 2]!;
    const { saturation, value } = saturationValue(r, g, b);
    swatches.push({ hex: rgbHex(r, g, b), share: counts[c]! / n, saturation, value });
  }
  // Largest first; ties by the colour itself, so the order never depends on k's layout.
  swatches.sort((a, b) => (b.share !== a.share ? b.share - a.share : a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0));
  return paletteOf(swatches);
}

/** The three roles, from swatches already sorted largest first. Pure. */
export function paletteOf(swatches: readonly Swatch[]): ArtPalette | null {
  if (swatches.length === 0) return null;
  const dominant = swatches[0]!.hex;
  let accent: Swatch | null = null;
  let score = -1;
  for (const s of swatches) {
    if (s.saturation <= VIVID_SATURATION || s.value < VIVID_VALUE) continue;
    const v = s.share * (0.3 + s.saturation) * (0.4 + s.value);
    if (v > score) {
      score = v;
      accent = s;
    }
  }
  const terrain = swatches.find((s) => s.value >= TERRAIN_VALUE[0] && s.value <= TERRAIN_VALUE[1]) ?? swatches[0]!;
  // Nothing vivid (a sepia or grey-sky painting): the accent is still the most
  // colourful cluster that is not near-black — never the dark background, which
  // is what a sepia painting's largest cluster is (measured: Peggy's is #1f130c).
  let muted: Swatch | null = null;
  let mutedScore = -1;
  for (const s of swatches) {
    if (s.value < VIVID_VALUE) continue;
    const v = s.share * (0.3 + s.saturation);
    if (v > mutedScore) {
      mutedScore = v;
      muted = s;
    }
  }
  return {
    swatches,
    dominant,
    accent: accent?.hex ?? muted?.hex ?? dominant,
    vivid: accent !== null,
    terrain: terrain.hex,
  };
}

/**
 * **The art rung of the identity ladder** (`figures/traits.ts`): what a card's
 * painting says when no hand-written row does. It carries the ACCENT only — a
 * tint here would outrank `figures.json`'s hand-written tints, which sit below
 * `traits.json` in `figurePose` (see {@link artTint} for the tint's own rung).
 */
export function artRow(palette: ArtPalette): { accent: string } {
  return { accent: palette.accent };
}

/**
 * **The art's tint**, for `figurePose`'s tint ladder: below every hand-written
 * tint (a `traits.json` row, then a `figures.json` row), above the bare colour
 * identity — so a creature with no row anywhere (a disc, a new set's card) takes
 * its painting's vivid colour. `null` when the art has nothing vivid: the colour
 * identity then says more than a grey sky does.
 */
export function artTint(palette: ArtPalette): string | null {
  return palette.vivid ? palette.accent : null;
}
