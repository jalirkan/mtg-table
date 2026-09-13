/*
 * mtg-table — arena/scene/cardMaterial.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The one shader Tier 1 writes** (report 09 §12.1): a noise-mask dissolve,
 * patched into the card's `meshBasicMaterial` rather than replacing it.
 *
 * `zone.dissolve` — a creature dying — is the only cue that needs a fragment to
 * disappear rather than to fade, and a fade is visibly not the same thing. The
 * cheapest honest way to get it is `onBeforeCompile`: three hands us the stock
 * shader, we prepend two uniforms and inject four lines after `map_fragment`,
 * and every card keeps the **one** material and the one program it already had.
 * The alternatives were a second material per card (40 more programs, and two
 * places where "is this card hidden?" is decided) or drei's `shaderMaterial`
 * (a whole second card renderer).
 *
 * Three things make it safe:
 *
 *  1. **`uDissolve` is 0 for every card, always, except while a dissolve cue is
 *     running on that card.** The branch is `if (uDissolve > 0.0)`, so the
 *     steady state costs one uniform compare per fragment.
 *  2. **`customProgramCacheKey` is a constant**, so all 40 card materials share
 *     one compiled program (`WebGLPrograms.js:386,436` includes it in the key).
 *     Without it three would happily compile one program per material.
 *  3. **It is guarded by `#ifdef USE_MAP`.** `vMapUv` only exists when the
 *     material has a map (`map_fragment.glsl.js:4`), and a card with no texture
 *     at all — the instant before its first face or text frame arrives — must
 *     still compile.
 */

import * as THREE from 'three';

import { initTexture } from './useCardTexture.ts';

export interface CardUniforms {
  uDissolve: { value: number };
  uNoise: { value: THREE.Texture | null };
}

const CACHE_KEY = 'mtg-table/card-dissolve/1';

let noise: THREE.Texture | null | undefined;

/**
 * A small value-noise texture, generated once. Not white noise: a per-pixel
 * hash dissolves like TV static, and a blurred lattice dissolves like burning
 * paper, which is the beat §6 asks for.
 */
function noiseTexture(): THREE.Texture | null {
  if (noise !== undefined) return noise;
  if (typeof document === 'undefined') return (noise = null);
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return (noise = null);

  // Three octaves of blocky value noise, drawn as rectangles and smoothed by
  // the canvas' own bilinear scaling — ~15 lines instead of a noise library.
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';
  let seed = 0x2f6e2b1;
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (const [cells, weight] of [
    [8, 0.55],
    [16, 0.3],
    [32, 0.15],
  ] as Array<[number, number]>) {
    const step = size / cells;
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const v = Math.round(rand() * 255 * weight);
        ctx.fillStyle = `rgb(${String(v)},${String(v)},${String(v)})`;
        ctx.fillRect(x * step, y * step, step + 1, step + 1);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // Data, not colour: like the corner alpha map, it must stay linear.
  initTexture(texture, null);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return (noise = texture);
}

/**
 * Patch a card material once and return its uniforms. Idempotent: a second call
 * on the same material returns the uniforms the first call made.
 */
export function patchCardMaterial(material: THREE.MeshBasicMaterial): CardUniforms {
  const existing = (material.userData as { cardUniforms?: CardUniforms }).cardUniforms;
  if (existing !== undefined) return existing;

  const uniforms: CardUniforms = {
    uDissolve: { value: 0 },
    uNoise: { value: noiseTexture() },
  };
  (material.userData as { cardUniforms?: CardUniforms }).cardUniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    shader.uniforms['uDissolve'] = uniforms.uDissolve;
    shader.uniforms['uNoise'] = uniforms.uNoise;
    shader.fragmentShader =
      'uniform float uDissolve;\nuniform sampler2D uNoise;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      #ifdef USE_MAP
      if ( uDissolve > 0.0 ) {
        float mtgNoise = texture2D( uNoise, vMapUv * 1.7 ).r;
        if ( mtgNoise < uDissolve ) discard;
        float mtgEdge = smoothstep( uDissolve, uDissolve + 0.14, mtgNoise );
        diffuseColor.rgb += ( 1.0 - mtgEdge ) * vec3( 1.0, 0.52, 0.18 ) * 1.7;
      }
      #endif`,
    );
  };
  material.customProgramCacheKey = () => CACHE_KEY;
  material.needsUpdate = true;
  return uniforms;
}
