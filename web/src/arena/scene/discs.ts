/*
 * mtg-table — arena/scene/discs.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The stand disc, as one `InstancedMesh`** (report 13 §9.4, §4.4).
 *
 * Every battlefield creature has a disc at its stand point, in the card's colour
 * identity, sized by power/toughness. It is two things at once, and both are
 * deliberate:
 *
 *  - **the figure's footprint**, under whatever model stands on it — it is what
 *    ties a figure to the card 0.52 units behind it;
 *  - **the whole figure** when no model resolves (§9.4's declared fallback): no
 *    manifest entry, no file, a 404, a parse failure. The card plane is
 *    untouched, every cue still plays, and the game is fully readable, which is
 *    what lets the repo ship with no binaries at all.
 *
 * ---------------------------------------------------------------------------
 * Two costs it deliberately does not pay.
 *
 * **It is not an `Effect`.** `MAX_LIVE_EFFECTS = 8` caps *blended transients*
 * (`cues/stage.ts`); a disc is steady state and there can be 21 of them, so
 * taking one of those eight slots per creature would starve the cue engine of
 * its own budget. Report 13 §4.4 says this in as many words and gives pose
 * overlays their own cap.
 *
 * **It is one draw call, not N.** `InstancedMesh` with `instanceColor`
 * (verified against the installed `three@0.186.0`: `setMatrixAt`, `setColorAt`,
 * `instanceMatrix.needsUpdate`) draws every disc on the table in one call, so
 * the whole layer costs the scene **1** of §8.2's 90.
 * ---------------------------------------------------------------------------
 */

import * as THREE from 'three';

import type { Offset } from '../cues/stage.ts';
import type { FigureLayout } from '../figures/pose.ts';
import { parsedColour } from './colourCache.ts';
import { UNIT_PLANE } from './geometry.ts';
import { initTexture } from './useCardTexture.ts';

/**
 * How many discs the buffer holds. The measured ceiling is **21** creatures in
 * one frame (`human-sideboard-7.jsonl`, report 13 §2); 24 is that with room, and
 * an `InstancedMesh` costs its capacity in buffer bytes and nothing in draw
 * calls, so the slack is free.
 */
export const DISC_CAPACITY = 24;

/** Flat on the table, like every other permanent (`layout.ts`'s `FLAT`). */
const FLAT = -Math.PI / 2;

/** Just clear of the card plane it belongs to, so the two never z-fight. */
const DISC_LIFT = 0.003;

/** The minimal read of a `SceneStage` this file needs. Passed, never closed over. */
export interface OffsetSource {
  offsetOf(cardId: number): Offset;
}

let discTex: THREE.Texture | null | undefined;

/**
 * A soft footprint: transparent in the middle, brightest at the rim, gone at the
 * edge. Drawn once for the whole page, exactly as `effects.ts` draws its three.
 */
function discTexture(): THREE.Texture | null {
  if (discTex !== undefined) return discTex;
  if (typeof document === 'undefined') return (discTex = null);
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return (discTex = null);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.30)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.16)');
  g.addColorStop(0.82, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.94, 'rgba(255,255,255,0.30)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  initTexture(texture, null);
  return (discTex = texture);
}

/** §9.2 rule 6 — scratch at module scope, never inside the frame loop. */
const MATRIX = new THREE.Matrix4();
const POSITION = new THREE.Vector3();
const QUATERNION = new THREE.Quaternion();
const EULER = new THREE.Euler();
const SCALE = new THREE.Vector3();
const COLOUR = new THREE.Color();

export class DiscField {
  readonly mesh: THREE.InstancedMesh;
  /** How many instances the buffers hold. `mesh.count` is how many are drawn. */
  readonly capacity: number;

  constructor(capacity = DISC_CAPACITY) {
    this.capacity = capacity;
    const material = new THREE.MeshBasicMaterial({
      map: discTexture(),
      transparent: true,
      // Additive, like every other glow in the arena: the disc lights the table
      // up rather than painting over it, and an unlit scene has nothing else to
      // make one object read as *above* another.
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
    });
    this.mesh = new THREE.InstancedMesh(UNIT_PLANE, material, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.renderOrder = 5;
    // A figure is never a click target (§3.10 rule 2) and neither is its
    // footprint: `HitProxy` is the only thing the raycaster sees.
    this.mesh.raycast = () => {};
    // `InstancedMesh` allocates `instanceColor` lazily on the first
    // `setColorAt`; doing it here means the frame loop never allocates.
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }

  /**
   * Write this frame's discs. Called once per frame from `CueRunner`'s single
   * `useFrame` and from nowhere else.
   *
   * `figurePose ⊕ offsets[id]` is §1.1's equation for a figure, and this is the
   * disc's half of it: the card's live offset moves and scales the footprint
   * with the card, so a lunging creature's disc lunges too and a dissolving one
   * fades with it.
   */
  bind(poses: FigureLayout, offsets: OffsetSource, seconds: number): void {
    let i = 0;
    for (const pose of poses.values()) {
      if (i >= this.capacity) break;
      const offset = offsets.offsetOf(pose.cardId);
      const radius = pose.radius * offset.scale;
      // The card's own `presence` bob, so a hovering Helicarrier's footprint
      // rides with it instead of staying nailed to the table.
      const bob =
        pose.bobAmp > 0 ? pose.bobAmp * Math.sin(seconds * 2 * Math.PI * pose.bobHz) : 0;
      POSITION.set(
        pose.position[0] + offset.dx,
        pose.position[1] + offset.dy + bob + DISC_LIFT,
        pose.position[2] + offset.dz,
      );
      EULER.set(FLAT, 0, 0);
      QUATERNION.setFromEuler(EULER);
      SCALE.set(radius * 2, radius * 2, 1);
      MATRIX.compose(POSITION, QUATERNION, SCALE);
      this.mesh.setMatrixAt(i, MATRIX);

      // Additive blending has no alpha to fade, so the opacity is folded into
      // the colour — which is also how a summoning-sick creature's disc reads
      // as "not there yet" rather than "a different colour".
      COLOUR.copy(parsedColour(pose.tint));
      const strength = pose.opacity * offset.opacity * (1 - offset.dissolve);
      COLOUR.multiplyScalar(Math.max(0, Math.min(1, strength)) * (pose.modelId === null ? 0.85 : 0.55));
      this.mesh.setColorAt(i, COLOUR);
      i += 1;
    }
    this.mesh.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor !== null) this.mesh.instanceColor.needsUpdate = true;
  }

  /** How many discs were drawn last frame — `?glinfo=1`'s layer census (T7). */
  counts(): { discs: number } {
    return { discs: this.mesh.count };
  }

  dispose(): void {
    this.mesh.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
