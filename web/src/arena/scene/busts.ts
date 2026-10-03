/*
 * mtg-table — arena/scene/busts.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The duelists' pose layer, bound from the one frame loop** — and slice 1's
 * silhouette busts, kept as its fallback (report 13 §7; user decision 8; T13).
 *
 * `CueRunner` binds this field once a frame, exactly as it always has
 * (`bustField.bind(busts, camera, effects)`). Since T13 the field first binds the
 * **duelist figures** installed into it by `scene/DuelistLayer.tsx`
 * ({@link DuelistBinder}, the way `FigureLayer` installs the departing bodies into
 * the disc field), and then draws a bust only for a seat that has no figure — no
 * figure library yet, a library that failed, or a look whose body the library
 * does not hold. A fresh checkout with no `figures.glb` therefore draws the two
 * busts, as slice 1 did.
 *
 * **Both stand where the duelists stand** (`figures/duelists.ts`'s
 * `duelistStand`), which moves the opponent's bust out from under the arena's
 * chrome as well (Tier 2 follow-up 10: 37–89% of it was covered at the HUD
 * anchor).
 *
 * **One `InstancedMesh` for both busts — one draw call**, drawn only while some
 * seat has no figure. The silhouette is a canvas texture drawn once for the page
 * (the same technique `discs.ts`, `overlays.ts` and `numberSprite.ts` use, and the
 * same reason: drei's `<Text>` and drei's `useGLTF` both reach a CDN, and a
 * local-only game whose duelists need a network is a game that loses them
 * offline). It draws **no name and no number** — the HUD's, in the DOM layer.
 */

import * as THREE from 'three';

import type { Effect } from '../cues/stage.ts';
import { bustReactionInto, duelistStand, type BustReaction, type DuelistBust } from '../figures/duelists.ts';
import type { Seat } from '../layout.ts';
import { parsedColour } from './colourCache.ts';
import { UNIT_PLANE } from './geometry.ts';
import { initTexture } from './useCardTexture.ts';

/** Two seats. The protocol is two-player by construction (README's NON-GOALS). */
export const BUST_CAPACITY = 4;

/** How tall a bust is, in world units — about one and a half card heights. */
const BUST_H = 1.55;
const BUST_W = 1.22;
/** Its centre above the duelist's stand point: the bust stands where the body would. */
const BUST_LIFT = 0.8;
/** A silhouette is a presence, not a lamp: it never brightens past this. */
const BUST_STRENGTH = 0.52;
/** How far a worn-down seat dims. `vigour` is life against the table's highest. */
const VIGOUR_FLOOR = 0.45;
/**
 * §7's flinch: at a full-strength hit the bust recoils this far away from the
 * table's centre and grows this much, and its rim takes this much of the hit's
 * colour.
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

/**
 * **The duelist figures, as the bust field sees them** — installed by
 * `scene/DuelistLayer.tsx` for the layer's lifetime and bound from {@link
 * BustField.bind}, i.e. from `CueRunner`'s one `useFrame`.
 */
export interface DuelistBinder {
  /** The frame loop's half: pose, gesture, stance, lean, tint; `mixer.update(0)`. */
  bind(): void;
  /** Does this seat have a figure drawn this frame — so its bust must not be? */
  covers(seat: Seat): boolean;
  /** T7's prime pass: show every body for the compile. */
  prime(): void;
  /** How many figures were drawn last frame. */
  counts(): number;
}

export class BustField {
  readonly group = new THREE.Group();
  #mesh: THREE.InstancedMesh | null = null;
  #count = 0;
  #duelists: DuelistBinder | null = null;

  constructor() {
    this.group.name = 'arena-busts';
    this.#build();
  }

  /** T13 — install (or, with `null`, remove) the duelist figures this field binds first. */
  setDuelists(duelists: DuelistBinder | null): void {
    this.#duelists = duelists;
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
    // §3.10 rule 2 — never a click target. A bust stands where a duelist would,
    // beside the table, and the raycaster must never see it.
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
   * Write this frame's duelists. Called once per frame from `CueRunner`'s single
   * `useFrame` and from nowhere else.
   *
   * **The figures first** ({@link DuelistBinder}); then a bust for every seat
   * that has none. `camera` is taken because a bust is billboarded — the one thing
   * in the arena meant to face the viewer however the table is orbited. Nothing
   * about a bust is a function of time: its one motion, §7's flinch, is
   * `effects`, read through `bustReactionInto`, so it is exactly as long as the
   * `damage.player` / `life.tick` / strike cue behind it.
   */
  bind(
    busts: readonly DuelistBust[],
    camera: THREE.Camera,
    effects: ReadonlyMap<string, Effect>,
  ): void {
    if (this.group.children.length === 0) this.#build();
    const duelists = this.#duelists;
    if (duelists !== null) duelists.bind();
    const mesh = this.#mesh;
    if (mesh === null) return;
    let i = 0;
    for (let b = 0; b < busts.length; b++) {
      const bust = busts[b]!;
      if (i >= BUST_CAPACITY) break;
      if (duelists !== null && duelists.covers(bust.seat)) continue;
      duelistStandInto(STAND, bust.seat);
      // Away from the table's centre along z, so a flinch recoils off the table.
      const away = STAND[2] >= 0 ? 1 : -1;
      const hit = bustReactionInto(REACTION, effects, bust.player);
      const k = hit.strength;
      POSITION.set(STAND[0], STAND[1] + BUST_LIFT, STAND[2] + away * FLINCH_BACK * k);
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
    this.#duelists?.prime();
  }

  /** What was drawn last frame — the evidence document's numbers. */
  counts(): { busts: number; duelists: number } {
    return { busts: this.#count, duelists: this.#duelists === null ? 0 : this.#duelists.counts() };
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

/** Scratch for a stand point (§9.2 rule 6). */
const STAND: [number, number, number] = [0, 0, 0];

/**
 * `duelistStand` into a scratch triple. The two stand points are constants of the
 * layout, so they are read once per seat at module load and copied per frame.
 */
const STANDS: Readonly<Record<Seat, readonly [number, number, number]>> = {
  you: duelistStand('you'),
  opp: duelistStand('opp'),
};

function duelistStandInto(out: [number, number, number], seat: Seat): void {
  const stand = STANDS[seat];
  out[0] = stand[0];
  out[1] = stand[1];
  out[2] = stand[2];
}
