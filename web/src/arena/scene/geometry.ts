/*
 * mtg-table — arena/scene/geometry.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **One quad for every card in the game** (report 09 §4.1).
 *
 * Every card mesh uses this geometry and sets `scale.set(w, 1, 1)`, where `w`
 * is the loaded texture's aspect. 40 cards are therefore **1 geometry, 1 vertex
 * buffer and 40 draw calls**. `new THREE.PlaneGeometry` per card would be 40
 * buffers and 40 uploads of an identical quad — the single easiest way to make
 * a scene this small cost something.
 *
 * It is never disposed: it is module scope, it outlives every component, and
 * the page owns exactly one of it.
 */

import * as THREE from 'three';

/** The unit quad, 1 × 1, in the XY plane with its normal on +Z. */
export const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);

/**
 * The aspect of a texture, or the physical card ratio when there is none yet.
 * Total over a `CanvasTexture` (whose `image` is a canvas) and an image texture.
 */
export function textureAspect(texture: THREE.Texture | null, fallback: number): number {
  const image = texture?.image as { width?: number; height?: number } | undefined;
  const w = image?.width ?? 0;
  const h = image?.height ?? 0;
  return w > 0 && h > 0 ? w / h : fallback;
}
