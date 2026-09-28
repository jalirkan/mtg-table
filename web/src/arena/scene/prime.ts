/*
 * mtg-table — arena/scene/prime.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **§8.3 rule 3's warm-up, for the target the frames are DRAWN INTO** (Lane LOOK,
 * D139). three compiles a program per material *and per output colour space*:
 * drawn to the canvas a material gets the sRGB variant, drawn into a render
 * target — which is where bloom's and the ink's composer draws the scene — the
 * linear one. `gl.compile` compiles for whichever target is bound, and a React
 * effect runs with the canvas bound, so a mount-time prime that ignores the
 * composer warms a variant nothing draws and leaves the one that IS drawn to the
 * first frame an object appears on: measured, the combat burst's first combat
 * linked a program mid-game (`docs/evidence/look.md`).
 *
 * `composer` says where the frames go: `bloom || ink`, which the arena knows
 * before the lazy composer's chunk has even loaded (`Arena.tsx`, `Pedestal.tsx`).
 * The callers re-prime when it changes — the governor's floor rung, the bloom
 * checkbox, the workshop's toggles — which is one compile at the moment of the
 * switch rather than a link on the first frame each hidden object is drawn.
 *
 * Why not simply both targets, every time: that was this file's first form, and
 * it cached every primed program twice — 16 → 29 programs at `g1`@316 with no
 * composer mounted at all (the evidence has both censuses).
 *
 * Called from layout and passive effects at mount — never from the frame loop
 * (`liveness.test.ts`).
 */

import * as THREE from 'three';

/** One 1×1 target for the whole page: its only job is to make `compile` pick the linear variant. */
let target: THREE.WebGLRenderTarget | null = null;

export function compileFor(
  gl: THREE.WebGLRenderer,
  scene: THREE.Object3D,
  camera: THREE.Camera,
  composer: boolean,
): void {
  if (!composer) {
    gl.compile(scene, camera);
    return;
  }
  const previous = gl.getRenderTarget();
  target ??= new THREE.WebGLRenderTarget(1, 1);
  gl.setRenderTarget(target);
  try {
    gl.compile(scene, camera);
  } finally {
    gl.setRenderTarget(previous);
  }
}
