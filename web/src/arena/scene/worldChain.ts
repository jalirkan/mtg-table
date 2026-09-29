/*
 * mtg-table — arena/scene/worldChain.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The world matrices a pose layer READS, fresh for this frame — and only those**
 * (the GPU pass, D271).
 *
 * The prop field places a joint prop by its joint's world matrix, which must be the
 * one of THIS frame's pose — `CueRunner.applyFigures` has just written every rig's
 * transform and scrubbed its mixer. The field used to get it by calling
 * `root.updateMatrixWorld(true)` on every rig a prop rides: about 68 nodes a
 * figure, recomputed again moments later by the renderer's own
 * `scene.updateMatrixWorld()`. The CPU profile of the bench frame put that first
 * pass at 7.4% of the main thread (`docs/evidence/gpu-pass.md`).
 *
 * A prop reads a handful of joints — a head, a hand, a spine joint — so the field
 * now refreshes exactly the nodes on the chains from each rig's root to those
 * joints, parents first, in a list built at COMMIT ({@link worldChainOf}); the
 * frame loop walks the list with {@link refreshWorld}, which is
 * `Object3D.updateMatrixWorld(true)`'s arithmetic for one node — the same local
 * compose, the same `parent.matrixWorld × matrix` — so every matrix a prop reads is
 * the number it was before, and the renderer's pass still updates the whole scene
 * after.
 */

import type * as THREE from 'three';

/**
 * **Commit time**: each of `roots`, then every node on the chain from a root down
 * to each of `reads` (a node under no root is ignored), each once, a node's
 * parent always before it. Written into `into` (cleared first), which is
 * returned. Allocates (a `Set`, the chains); never call it from the frame loop.
 */
export function worldChainOf(
  roots: readonly THREE.Object3D[],
  reads: readonly THREE.Object3D[],
  into: THREE.Object3D[] = [],
): THREE.Object3D[] {
  into.length = 0;
  const listed = new Set<THREE.Object3D>();
  for (const root of roots) if (!listed.has(root)) listed.add(root) && into.push(root);
  const rootSet = new Set(roots);
  for (const node of reads) {
    // Up from the joint to its rig's root; then down again, parents first.
    const chain: THREE.Object3D[] = [];
    let at: THREE.Object3D | null = node;
    for (; at !== null && !rootSet.has(at); at = at.parent) chain.push(at);
    if (at === null) continue;
    for (let i = chain.length - 1; i >= 0; i--) if (!listed.has(chain[i]!)) listed.add(chain[i]!) && into.push(chain[i]!);
  }
  return into;
}

/**
 * **The frame loop's half**: one node's local and world matrix, exactly as
 * `Object3D.updateMatrixWorld(true)` computes them for it (three@0.186.0,
 * `three.core.js`) — its parent's world matrix as it stands, which a chain from
 * {@link worldChainOf} has refreshed first. Numbers only; allocates nothing.
 */
export function refreshWorld(node: THREE.Object3D): void {
  if (node.matrixAutoUpdate) node.updateMatrix();
  if (node.matrixWorldAutoUpdate) {
    const parent = node.parent;
    if (parent === null) node.matrixWorld.copy(node.matrix);
    else node.matrixWorld.multiplyMatrices(parent.matrixWorld, node.matrix);
  }
  node.matrixWorldNeedsUpdate = false;
}
