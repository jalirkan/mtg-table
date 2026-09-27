/*
 * mtg-table — arena/scene/busts.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The duelist silhouettes, drawn** (report 13 §7; user decision 8): one
 * billboarded quad per seat at `playerAnchorFor(seat)`, dark, unlit, no rig.
 *
 * **One `InstancedMesh` for both seats — one draw call, where §7 budgets two.**
 * The silhouette is a canvas texture drawn once for the page (the same technique
 * `discs.ts`, `overlays.ts` and `numberSprite.ts` use, and the same reason: drei's
 * `<Text>` and drei's `useGLTF` both reach a CDN, and a local-only game whose
 * duelists need a network is a game that loses them offline).
 *
 * It draws **no name and no number**. The player's name and life total are the
 * HUD's, in the DOM layer, where the 2D board already draws them; a bust is a
 * presence, and a texture is not where identity belongs.
 */

import * as THREE from 'three';

import type { Effect } from '../cues/stage.ts';
import { bustReactionInto, type BustReaction, type DuelistBust } from '../figures/duelists.ts';
import { playerAnchorFor } from '../layout.ts';
import { parsedColour } from './colourCache.ts';
import { UNIT_PLANE } from './geometry.ts';
import { initTexture } from './useCardTexture.ts';

/** Two seats. The protocol is two-player by construction (README's NON-GOALS). */
export const BUST_CAPACITY = 4;

/** How tall a bust is, in world units — about one and a half card heights. */
const BUST_H = 1.55;
const BUST_W = 1.22;
/** Set back behind the HUD anchor so the life plate reads in front of it. */
const BUST_BACK = 0.55;
const BUST_LIFT = 0.42;
/** A silhouette is a presence, not a lamp: it never brightens past this. */
const BUST_STRENGTH = 0.52;
/** How far a worn-down seat dims. `vigour` is life against the table's highest. */
const VIGOUR_FLOOR = 0.45;
/**
 * §7's flinch: at a full-strength hit the bust recoils this far away from the
 * table and grows this much, and its rim takes this much of the hit's colour.
 */
const FLINCH_BACK = 0.18;
const FLINCH_SCALE = 0.07;
const FLINCH_TINT = 0.75;
const FLINCH_BRIGHT = 0.9;

let bustTex: THREE.Texture | null | undefined;

/**
 * A head-and-shoulders silhouette: bright at the rim, hollow inside.
 *
 * Hollow rather than solid because the material is **additive** — the arena has no
 * lights and nothing to make a dark shape read against a dark table — so the
 * silhouette is drawn as its own outline, which is the Yu-Gi-Oh reading
 * `arena-mode.md` reaches for rather than a black hole in the scene.
 */
function bustTexture(): THREE.Texture | null {
  if (bustTex !== undefined) return bustTex;
  if (typeof document === 'undefined') return (bustTex = null);
  const w = 256;
  const h = 320;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return (bustTex = null);

  ctx.clearRect(0, 0, w, h);
  // The shoulders: a wide arc rising from the bottom edge.
  const body = new Path2D();
  body.moveTo(w * 0.06, h);
  body.bezierCurveTo(w * 0.1, h * 0.62, w * 0.3, h * 0.52, w * 0.5, h * 0.52);
  body.bezierCurveTo(w * 0.7, h * 0.52, w * 0.9, h * 0.62, w * 0.94, h);
  body.closePath();
  // The head: an ellipse above them, with a gap so the two read as two shapes.
  const head = new Path2D();
  head.ellipse(w * 0.5, h * 0.29, w * 0.19, h * 0.2, 0, 0, Math.PI * 2);

  // A soft interior wash, so the shape is a *presence* and not only an outline…
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fill(body);
  ctx.fill(head);
  // …and a bright rim, which is what actually reads at the rest camera's distance.
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 7;
  ctx.stroke(body);
  ctx.stroke(head);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 16;
  ctx.stroke(body);
  ctx.stroke(head);

  const texture = new THREE.CanvasTexture(canvas);
  initTexture(texture, null);
  return (bustTex = texture);
}

/** §9.2 rule 6 — scratch at module scope, never inside the frame loop. */
const MATRIX = new THREE.Matrix4();
const POSITION = new THREE.Vector3();
const QUATERNION = new THREE.Quaternion();
const SCALE = new THREE.Vector3();
const COLOUR = new THREE.Color();
const REACTION: BustReaction = { strength: 0, colour: null };

export class BustField {
  readonly group = new THREE.Group();
  #mesh: THREE.InstancedMesh | null = null;
  #count = 0;

  constructor() {
    this.group.name = 'arena-busts';
    this.#build();
  }

  #build(): void {
    const material = new THREE.MeshBasicMaterial({
      map: bustTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
    });
    const mesh = new THREE.InstancedMesh(UNIT_PLANE, material, BUST_CAPACITY);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.visible = false;
    mesh.renderOrder = 270;
    // §3.10 rule 2 — never a click target. A bust stands where the life plate is,
    // and the plate is a DOM widget in `.arena__layer` with its own hit testing.
    mesh.raycast = () => {};
    mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(BUST_CAPACITY * 3),
      3,
    );
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(mesh);
    this.#mesh = mesh;
  }

  /**
   * Write this frame's busts. Called once per frame from `CueRunner`'s single
   * `useFrame` and from nowhere else.
   *
   * `camera` is taken because a bust is billboarded — it is the one thing in the
   * arena that is meant to face the viewer however the table is orbited. Nothing
   * about it is a function of time: no bob, no breath, no clip. The one motion it
   * has — §7's flinch — is `effects`, read through `bustReactionInto`, so it is
   * exactly as long as the `damage.player` / `life.tick` / strike cue behind it.
   */
  bind(
    busts: readonly DuelistBust[],
    camera: THREE.Camera,
    effects: ReadonlyMap<string, Effect>,
  ): void {
    if (this.group.children.length === 0) this.#build();
    const mesh = this.#mesh;
    if (mesh === null) return;
    let i = 0;
    for (const bust of busts) {
      if (i >= BUST_CAPACITY) break;
      const anchor = playerAnchorFor(bust.seat);
      // Behind the HUD anchor, away from the table centre, so the life plate and
      // the rising damage number read in front of the body they belong to.
      const away = anchor.z >= 0 ? 1 : -1;
      const hit = bustReactionInto(REACTION, effects, bust.player);
      const k = hit.strength;
      POSITION.set(
        anchor.x,
        anchor.y + BUST_LIFT,
        anchor.z + away * (BUST_BACK + FLINCH_BACK * k),
      );
      QUATERNION.copy(camera.quaternion);
      SCALE.set(BUST_W * (1 + FLINCH_SCALE * k), BUST_H * (1 + FLINCH_SCALE * k), 1);
      MATRIX.compose(POSITION, QUATERNION, SCALE);
      mesh.setMatrixAt(i, MATRIX);
      COLOUR.copy(parsedColour(bust.colour));
      // §7's red rim: the hit's own colour — red for damage, green for a gain —
      // for as long as the cue that caused it is playing, and not a frame longer.
      if (hit.colour !== null && k > 0) COLOUR.lerp(parsedColour(hit.colour), FLINCH_TINT * k);
      // Additive has no alpha, so `vigour` is in the colour: a seat that is being
      // worn down dims. The number itself is still the HUD's, from the wire.
      COLOUR.multiplyScalar(
        BUST_STRENGTH * (VIGOUR_FLOOR + (1 - VIGOUR_FLOOR) * bust.vigour) * (1 + FLINCH_BRIGHT * k),
      );
      mesh.setColorAt(i, COLOUR);
      i += 1;
    }
    this.#count = i;
    mesh.count = i;
    mesh.visible = i > 0;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
  }

  /**
   * T7 — draw every parked mesh once so its program compiles at mount rather than
   * on first use (see `EffectPool.prime`). `count` is untouched, so a bucket that
   * is empty draws nothing; the next `bind()` parks it again.
   */
  prime(): void {
    for (const child of this.group.children) child.visible = true;
  }

  /** What was drawn last frame — the evidence document's numbers. */
  counts(): { busts: number } {
    return { busts: this.#count };
  }

  dispose(): void {
    const mesh = this.#mesh;
    if (mesh !== null) {
      mesh.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.#mesh = null;
    this.group.clear();
  }
}
