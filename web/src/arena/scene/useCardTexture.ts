/*
 * mtg-table — arena/scene/useCardTexture.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The texture pipeline** (report 09 §4.2), and the four non-obvious lines in
 * it. Every one was verified against the installed `three@0.186.0`:
 *
 *  1. **`colorSpace` must be set by hand.** `Texture`'s constructor defaults it
 *     to `NoColorSpace` and `TextureLoader` never touches it, so a card left
 *     alone renders washed out. Every texture here — loaded or canvas-drawn —
 *     gets `SRGBColorSpace`.
 *  2. **Mipmaps are already on and NPOT is legal.** `generateMipmaps` defaults
 *     true with `LinearMipmapLinearFilter`, and three 0.186's renderer is WebGL
 *     2 only, which does NPOT mipmaps. 488×680 needs no resize and no filter
 *     hack.
 *  3. **Anisotropy is the single biggest visual win and is off by default.** The
 *     table camera views cards at ~50° from their normal — exactly the case
 *     trilinear filtering blurs — so every texture gets
 *     `gl.capabilities.getMaxAnisotropy()` (typically 16). It costs nothing at
 *     28 textures.
 *  4. **`gl.initTexture(tex)`** uploads immediately rather than at first draw,
 *     which is what stops a frame hitch when a card enters the battlefield
 *     mid-cue. drei's own `useTexture` does the same thing for the same reason.
 *
 * **The cache is keyed by URL, never by card id** (§9.2 rule 2): seven `Plains`
 * share one texture and one upload. At 28 distinct names in the deck that is
 * ~47 MiB of VRAM including mip chains, against ~90 MiB if we had reached for
 * the `large` variant.
 *
 * CORS is not a problem and was verified live: `cards.scryfall.io` answers
 * `access-control-allow-origin: *` with a year of `cache-control`, and three's
 * `Loader` sets `crossOrigin = 'anonymous'` by default — without that header the
 * texture would fail to upload to WebGL entirely, not merely taint a canvas.
 */

import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

/** URL → the in-flight or finished upload. Module scope: one per page, not per component. */
const textureCache = new Map<string, Promise<THREE.Texture>>();
/** URLs that failed. A miss is cosmetic — the caller draws the text frame instead. */
const failed = new Set<string>();
/**
 * The textures that have already finished, so a component that re-mounts (every
 * one of them, under `<StrictMode>`) draws the face immediately instead of
 * flashing its text frame for a frame or two.
 */
const resolved = new Map<string, THREE.Texture>();

function peekTexture(url: string): THREE.Texture | null {
  return resolved.get(url) ?? null;
}

/** Apply the four rules above to any texture, however it was made. */
export function initTexture(texture: THREE.Texture, gl: THREE.WebGLRenderer | null): THREE.Texture {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = gl?.capabilities.getMaxAnisotropy() ?? 1;
  texture.needsUpdate = true;
  gl?.initTexture(texture);
  return texture;
}

/**
 * Load one card image. Shared by URL, so the second `Plains` joins the first
 * one's request rather than starting another.
 */
export function loadCardTexture(url: string, gl: THREE.WebGLRenderer | null): Promise<THREE.Texture> {
  const cached = textureCache.get(url);
  if (cached !== undefined) return cached;
  const pending = new THREE.TextureLoader()
    .loadAsync(url)
    .then((texture) => {
      initTexture(texture, gl);
      resolved.set(url, texture);
      return texture;
    })
    .catch((err: unknown) => {
      // A 404, a dropped connection, an art.json entry that has rotted. The
      // card falls back to its text frame; nothing blocks and nothing throws.
      failed.add(url);
      textureCache.delete(url);
      throw err;
    });
  textureCache.set(url, pending);
  return pending;
}

/**
 * `url` → `Texture`, or `null` while it loads and forever if it fails.
 *
 * `null` is not an error state the caller has to handle specially: `CardPlane`
 * draws its text frame until a face arrives, which is also what it draws for a
 * token, an `art.json` miss and a fresh checkout with no `art.json` at all.
 */
export function useCardTexture(url: string | null): THREE.Texture | null {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const [texture, setTexture] = useState<THREE.Texture | null>(() =>
    url === null ? null : peekTexture(url),
  );

  useEffect(() => {
    if (url === null) {
      setTexture(null);
      return;
    }
    if (failed.has(url)) {
      setTexture(null);
      return;
    }
    let live = true;
    void loadCardTexture(url, gl)
      .then((loaded) => {
        if (!live) return;
        setTexture(loaded);
        // Under `frameloop='demand'` (E3) a texture arriving is the one change
        // React does not cause, so it has to ask for the repaint itself.
        invalidate();
      })
      .catch(() => {
        if (live) setTexture(null);
      });
    return () => {
      live = false;
    };
  }, [url, gl, invalidate]);

  return texture;
}

// ---------------------------------------------------------------------------
// The shared rounded-corner alpha map (§4.3)
// ---------------------------------------------------------------------------

let cornerAlpha: THREE.CanvasTexture | null = null;

/**
 * **Rounded corners without paying for the PNG.**
 *
 * Scryfall's `normal` JPEG has square corners; the `png` variant has a real
 * rounded-corner alpha but is 605,487 bytes against 73,417 — 8.2× the bytes and
 * ~2× the VRAM, per card. Instead: **one** 256×256 rounded-rect alpha texture,
 * drawn once at startup and used as the `alphaMap` of every card in the scene.
 * One asset, correct silhouette, no per-card cost.
 */
export function cornerAlphaTexture(gl: THREE.WebGLRenderer | null): THREE.Texture | null {
  if (cornerAlpha !== null) return cornerAlpha;
  if (typeof document === 'undefined') return null;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#fff';
  // The alpha map is stretched over a 0.716 × 1.0 quad, so a circular corner in
  // texture space is a slightly squashed one on screen. At this radius the
  // difference is under a pixel at any table distance.
  roundedRect(ctx, 2, 2, size - 4, size - 4, size * 0.055);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  // An alpha map is data, not colour: it must stay linear. This is the one
  // texture in the arena that does NOT get SRGBColorSpace.
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = gl?.capabilities.getMaxAnisotropy() ?? 1;
  texture.needsUpdate = true;
  gl?.initTexture(texture);
  cornerAlpha = texture;
  return texture;
}

/** A rounded rectangle path. `roundRect` exists in modern browsers; this is total. */
export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
