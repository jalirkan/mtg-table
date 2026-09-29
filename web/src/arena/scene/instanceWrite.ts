/*
 * mtg-table — arena/scene/instanceWrite.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Write an instance's numbers only where they changed, and say whether they did**
 * (the GPU pass, D271).
 *
 * Every pose layer on the frame loop is an `InstancedMesh` whose buffers it rewrites
 * each frame, and three uploads a buffer whenever its `needsUpdate` is set. The
 * layers set it every frame, so a table whose tiles, prop colours and prop opacities
 * had not moved re-sent every one of those buffers sixty times a second — the GPU
 * pass counted 70 `bufferSubData` a frame at `g1`@370, about 45 of them carrying
 * the bytes the GPU already held (`docs/evidence/gpu-pass.md`).
 *
 * These write exactly what `InstancedMesh.setMatrixAt` / `setColorAt` and
 * `BufferAttribute.setX` would — the value as a 32-bit float — and return `true`
 * when any element differs from what the array held, so the caller flags the
 * buffer only then. The comparison is against `Math.fround(v)`, the number the
 * `Float32Array` actually stores: comparing the float64 would call every
 * inexact value "changed" on every frame. So the array ends a frame bit for bit
 * what the setters would have left, and what three draws is always the array: it
 * uploads a flagged buffer before the next draw that reads it.
 *
 * Numbers only: no allocation, no clock (the frame loop's allocation scan reads
 * all three bodies — `liveness.test.ts`).
 */

import type * as THREE from 'three';

/** `mesh.setMatrixAt(index, m)`, into `array`; whether any of the 16 changed. */
export function writeMatrixAt(array: Float32Array, index: number, m: THREE.Matrix4): boolean {
  const e = m.elements;
  const at = index * 16;
  let changed = false;
  for (let k = 0; k < 16; k++) {
    const v = Math.fround(e[k]!);
    if (array[at + k] !== v) {
      array[at + k] = v;
      changed = true;
    }
  }
  return changed;
}

/** `mesh.setColorAt(index, c)`, into `array`; whether r, g or b changed. */
export function writeColourAt(array: Float32Array, index: number, c: THREE.Color): boolean {
  const at = index * 3;
  let changed = false;
  const r = Math.fround(c.r);
  const g = Math.fround(c.g);
  const b = Math.fround(c.b);
  if (array[at] !== r) {
    array[at] = r;
    changed = true;
  }
  if (array[at + 1] !== g) {
    array[at + 1] = g;
    changed = true;
  }
  if (array[at + 2] !== b) {
    array[at + 2] = b;
    changed = true;
  }
  return changed;
}

/** `attribute.setX(index, v)` on a one-component attribute's `array`; whether it changed. */
export function writeScalarAt(array: Float32Array, index: number, value: number): boolean {
  const v = Math.fround(value);
  if (array[index] === v) return false;
  array[index] = v;
  return true;
}
