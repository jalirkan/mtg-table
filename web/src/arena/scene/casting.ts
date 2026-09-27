/*
 * mtg-table — arena/scene/casting.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The casting anchor, drawn** (report 13 §5.4, §6.2, §6.3; user decision 9):
 * the floating mana standing at each seat's anchor, the **five spell forms** of
 * §6.2 hanging at the caster's side, and §6.3's **tethers** from a form to what
 * its stack item targets.
 *
 * Seven `InstancedMesh`es, none of them drawn while empty — five form kinds, the
 * motes and the tethers — so a frame with one instant on the stack aimed at one
 * creature costs **three** draw calls and an idle table costs **none**.
 *
 * ---------------------------------------------------------------------------
 * **Everything in this file is a POSE, and that is the point** (report 13 §1.3).
 *
 * The motes are `PlayerState.manaPool`, the forms are `state.stack`, and the
 * tethers are `stack[].targetCardIds` / `targetPlayerIds` — so a backwards scrub,
 * a `skip all` and a `resync` all show exactly the mana, the spells and the
 * targeting the frame on screen has, with no history. The *flight* of a mote from
 * a tapped land is the cue (`land.tap`, through the pooled `mote` primitive in
 * `effects.ts`); the *strike*, the *fizzle* and the *shatter* are cues at this
 * same anchor (`resolved.pop`, `resolved.fizzle`, `unstacked.shatter`). **Nothing
 * in this file remembers anything.**
 *
 * `figures/casting.ts` measured what that buys and what it costs: the pool is
 * non-zero in **47 of 3,679 corpus frames (1.3%)**, because Forge's AI taps and
 * spends inside one engine step. So the standing pool is a rare sight and the
 * flight is the common one — which is exactly why the flight is not built on this
 * data.
 *
 * **The creature form is not here.** §6.2's creature row is "the creature's own
 * figure, ghosted at 40%", and that is a `FigurePose` with `ghost: true`
 * (`figures/pose.ts`) drawn by `FigureLayer` through the one card-renderer of the
 * arena — because a second surface that drew a creature would be a second figure
 * renderer, which is M7 convention 2's whole point. A `figure` form therefore
 * draws **nothing** here, and when no model resolves the ghost is its stand disc,
 * which is the declared fallback (§9.4).
 * ---------------------------------------------------------------------------
 */

import * as THREE from 'three';

import type { AnchorRef } from '../cues/stage.ts';
import type { ManaMote, SpellForm, TetherRef } from '../figures/casting.ts';
import type { FigureLayout } from '../figures/pose.ts';
import { anchorsFor } from '../layout.ts';
import { parsedColour } from './colourCache.ts';
import { UNIT_PLANE } from './geometry.ts';
import { initTexture } from './useCardTexture.ts';

/** Two seats × {@link MAX_MOTES_PER_SEAT}, with room. */
export const MOTE_CAPACITY = 16;
/** Report 13 §6.1's measured ceiling is a stack depth of 4. */
export const FORM_CAPACITY = 8;
/** 44 target-bearing stack-item instances in the whole corpus; 8 is plenty. */
export const TETHER_CAPACITY = 8;

/** How the cluster of one seat's motes is laid out around its anchor. */
const MOTE_SPREAD = 0.17;
const MOTE_SIZE = 0.13;
/** A slow, tiny orbit so the pool reads as *floating* rather than as stuck. */
const MOTE_DRIFT = 0.035;
/**
 * **§6's "motes consumed by the form"**, and it claims nothing the engine did not
 * say. A mote and a form at the same anchor are two poses of the same frame — this
 * player has mana, this player has a spell on the stack — so the mote leans toward
 * the form and dims. No link between a particular mote and a particular spell is
 * asserted anywhere, which is the same care §5.4 takes with the land→spell link it
 * refused to invent.
 */
const MOTE_PULL = 0.55;
const MOTE_CONSUMED_DIM = 0.7;

/**
 * The form hangs just above the anchor and climbs with the stack.
 *
 * Taller than it is wide, and tilted on two axes, because an octahedron seen
 * face-on and unlit is **a white square** — photographed at g1 index 72 on
 * 2026-09-26, where T4's placeholder read as a paper cut-out floating over the
 * lands. Every one of §6.2's five shapes carries the same vertical vertex-colour
 * ramp for the same reason.
 */
const FORM_W = 0.32;
const FORM_H = 0.48;
const FORM_STEP_Y = 0.3;
/**
 * Just above the anchor, so the strike's bolt and the fizzle's fall — cues that
 * name the anchor and not the form (`resolved.pop`, `resolved.fizzle`) — leave
 * from where the form visibly stood. At 0.3 they left from 0.3 units below it.
 */
const FORM_BASE_Y = 0.1;
/** Additive and white is a lamp; the form is a *presence*, not a light. */
const FORM_STRENGTH = 0.42;
/** A tether is a thin band; the beam primitive uses the same half-width. */
const TETHER_RADIUS = 0.022;
const TETHER_STRENGTH = 0.5;
/**
 * Where on a target FIGURE a tether lands, as a fraction of its drawn height —
 * the chest, so the beam reads as aimed at the creature and not at its feet.
 */
const TETHER_CHEST = 0.55;

let moteTex: THREE.Texture | null | undefined;

/** A soft dot with a bright core — a mote of mana, drawn once for the page. */
function moteTexture(): THREE.Texture | null {
  if (moteTex !== undefined) return moteTex;
  if (typeof document === 'undefined') return (moteTex = null);
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return (moteTex = null);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.65)');
  g.addColorStop(0.72, 'rgba(255,255,255,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  initTexture(texture, null);
  return (moteTex = texture);
}

/**
 * **A vertical ramp in vertex colours, because the scene has no lights.**
 *
 * An unlit solid is one flat colour on every face, so it reads as its silhouette.
 * `vertexColors` multiplies into the instance colour, so one attribute gives a
 * form a lit top and a dark underside for nothing: no light, no second material,
 * no extra draw call.
 */
function ramped(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const min = box?.min.y ?? -0.5;
  const max = box?.max.y ?? 0.5;
  const span = max - min > 1e-6 ? max - min : 1;
  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const t = (position.getY(i) - min) / span;
    const k = 0.45 + 0.55 * t;
    colours[i * 3] = k;
    colours[i * 3 + 1] = k;
    colours[i * 3 + 2] = k;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return geometry;
}

/**
 * §6.2's five shapes, and each one is a handful of triangles.
 *
 * A **dart** aims (it is the only form that reads as *pointed at* something, and
 * the only one that turns to face its tether); a **sigil** is flat and turns in
 * the table plane; a **ring** is a torus for an Aura or an Enchantment; a
 * **shard** is T4's octahedron, kept for an Artifact or an Equipment; an **orb**
 * is the declared fallback for everything else and for a source card this viewer
 * may not see.
 */
const FORM_GEOMETRY: Readonly<Record<string, THREE.BufferGeometry>> = {
  dart: ramped(new THREE.ConeGeometry(0.42, 1, 5)),
  sigil: ramped(new THREE.RingGeometry(0.26, 0.5, 7)),
  ring: ramped(new THREE.TorusGeometry(0.38, 0.09, 4, 9)),
  shard: ramped(new THREE.OctahedronGeometry(0.5, 0)),
  orb: ramped(new THREE.IcosahedronGeometry(0.5, 0)),
};

/** The kinds this file draws — §6.2's five minus the creature, which is a figure. */
const DRAWN_FORMS = ['dart', 'sigil', 'ring', 'shard', 'orb'] as const;

/** §9.2 rule 6 — scratch at module scope, never inside the frame loop. */
const MATRIX = new THREE.Matrix4();
const POSITION = new THREE.Vector3();
const QUATERNION = new THREE.Quaternion();
const EULER = new THREE.Euler();
const SCALE = new THREE.Vector3();
const COLOUR = new THREE.Color();
const FROM = new THREE.Vector3();
const TO = new THREE.Vector3();
const DIR = new THREE.Vector3();
const MID = new THREE.Vector3();
const NORM = new THREE.Vector3();
const AIM = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

function additive(map: THREE.Texture | null): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
  });
}

/** How a tether or a dart finds the other end. `layout.ts` answers, never this file. */
export type ResolveAnchor = (anchor: AnchorRef) => [number, number, number] | null;

interface Bucket {
  kind: string;
  mesh: THREE.InstancedMesh;
  count: number;
}

export class CastingField {
  readonly group = new THREE.Group();
  #motes: THREE.InstancedMesh | null = null;
  #tethers: THREE.InstancedMesh | null = null;
  readonly #forms: Bucket[] = [];
  #moteCount = 0;
  #tetherCount = 0;
  /** Advanced by the frame's `dt`, and **`CueRunner` passes 0 while idle**. */
  #clock = 0;

  constructor() {
    this.group.name = 'arena-casting';
    this.#build();
  }

  #build(): void {
    this.#motes = this.#add(UNIT_PLANE, additive(moteTexture()), MOTE_CAPACITY, 280);
    this.#tethers = this.#add(UNIT_PLANE, additive(moteTexture()), TETHER_CAPACITY, 278);
    for (const kind of DRAWN_FORMS) {
      const material = additive(null);
      material.vertexColors = true;
      const mesh = this.#add(FORM_GEOMETRY[kind]!, material, FORM_CAPACITY, 281);
      this.#forms.push({ kind, mesh, count: 0 });
    }
  }

  /**
   * **Re-add the meshes if `dispose()` emptied the group** — `effects.ts`'s
   * documented `<StrictMode>` defect, which `tiles.ts` hit again and
   * `overlays.ts` a third time.
   */
  #remount(): void {
    if (this.group.children.length > 0) return;
    this.#forms.length = 0;
    this.#build();
  }

  #add(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    capacity: number,
    renderOrder: number,
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.visible = false;
    mesh.renderOrder = renderOrder;
    // Never a click target (§3.10 rule 2): `HitProxy` is the only thing the
    // raycaster sees, and a mote or a tether hanging over the land rank would
    // otherwise sit between the camera and a card.
    mesh.raycast = () => {};
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(mesh);
    return mesh;
  }

  /**
   * Write this frame's motes, forms and tethers. Called once per frame from
   * `CueRunner`'s single `useFrame` and from nowhere else.
   *
   * It takes no `Stage` at all — there is no cue that addresses a mote, a form or
   * a tether, because none of them has an id a cue could name. `resolve` is
   * `SceneStage.positionOf`, a bound property rather than a closure built per
   * frame (§9.2 rule 6). The far end of a tether is either that resolver's answer
   * or, when the target has a figure, that figure's own pose — both computed
   * elsewhere, so this file still never invents a coordinate.
   *
   * The motes are **not billboarded**: they are flat on the table plane like every
   * other additive quad in the arena, which keeps them reading as part of the
   * table rather than as HUD.
   */
  bind(
    motes: readonly ManaMote[],
    forms: readonly SpellForm[],
    resolve: ResolveAnchor,
    figures: FigureLayout,
    dt: number,
  ): void {
    this.#remount();
    const moteMesh = this.#motes;
    const tetherMesh = this.#tethers;
    if (moteMesh === null || tetherMesh === null) return;
    this.#clock += dt;

    // -- the forms, and where each one hangs --------------------------------
    for (const bucket of this.#forms) bucket.count = 0;
    let tether = 0;
    for (const form of forms) {
      const anchor = anchorsFor(form.seat).casting;
      const y = anchor.y + FORM_BASE_Y + form.index * FORM_STEP_Y;
      POSITION.set(anchor.x, y, anchor.z);

      // The tethers first, because the dart aims along the first of them.
      let aimed = false;
      for (const target of form.tethers) {
        if (tether >= TETHER_CAPACITY) break;
        // **§6.3: "a thin beam from the form to the target's figure (or the
        // player anchor)".** A card target that has a figure — a battlefield
        // creature, or a ghosted creature spell — is aimed at the figure's chest;
        // anything else (a land, an artifact, a player) at `layout.ts`'s anchor.
        // Both ends are poses of this frame, so a scrub draws the tether exactly.
        const figure = target.kind === 'card' ? figures.get(target.id) : undefined;
        if (figure !== undefined) {
          TO.set(
            figure.position[0],
            figure.position[1] + figure.height * TETHER_CHEST,
            figure.position[2],
          );
        } else {
          const to = resolve(anchorOf(target));
          if (to === null) continue;
          TO.set(to[0], to[1] + 0.05, to[2]);
        }
        FROM.copy(POSITION);
        DIR.subVectors(TO, FROM);
        const length = DIR.length();
        if (length < 1e-4) continue;
        // §9.2 rule 6: every vector here is module scratch, so a tether costs no
        // allocation in the frame loop. `effects.ts`'s `beam` is the same shape.
        NORM.copy(DIR).normalize();
        MID.copy(FROM).addScaledVector(DIR, 0.5);
        AIM.setFromUnitVectors(UP, NORM);
        MATRIX.compose(MID, AIM, SCALE.set(TETHER_RADIUS * 2, length, 1));
        tetherMesh.setMatrixAt(tether, MATRIX);
        COLOUR.copy(parsedColour(form.colour)).multiplyScalar(TETHER_STRENGTH);
        tetherMesh.setColorAt(tether, COLOUR);
        tether += 1;
        if (!aimed) {
          // The dart points along its tether; every other form ignores this.
          QUATERNION.copy(AIM);
          aimed = true;
        }
      }

      if (form.kind === 'figure') continue; // the ghost figure IS the form (§6.2)
      const bucket = this.#formBucket(form.kind);
      if (bucket === null || bucket.count >= FORM_CAPACITY) continue;
      const spin = this.#clock * 0.7 + form.index;
      if (!aimed || form.kind !== 'dart') {
        // A sigil lies flat and turns in the table plane; a ring stands facing the
        // rest camera and wobbles, because a torus seen edge-on is a white sliver
        // (photographed at g1 frame 266, T6); everything else tumbles slowly on
        // two axes so an unlit solid still reads as a solid.
        if (form.kind === 'sigil') EULER.set(-Math.PI / 2, 0, spin);
        else if (form.kind === 'ring') EULER.set(-0.55 + 0.12 * Math.sin(spin), 0.25 * Math.sin(spin * 0.7), 0);
        else EULER.set(0.42, spin, 0.38);
        QUATERNION.setFromEuler(EULER);
      }
      SCALE.set(FORM_W, form.kind === 'sigil' || form.kind === 'ring' ? FORM_W : FORM_H, FORM_W);
      MATRIX.compose(POSITION, QUATERNION, SCALE);
      bucket.mesh.setMatrixAt(bucket.count, MATRIX);
      COLOUR.copy(parsedColour(form.colour));
      // Additive has no alpha to fade, so the "ghosted" reading is in the colour.
      COLOUR.multiplyScalar(FORM_STRENGTH);
      bucket.mesh.setColorAt(bucket.count, COLOUR);
      bucket.count += 1;
    }
    this.#tetherCount = tether;

    // -- the motes ----------------------------------------------------------
    let i = 0;
    for (const mote of motes) {
      if (i >= MOTE_CAPACITY) break;
      const anchor = anchorsFor(mote.seat).casting;
      // Centred on the anchor, spread along x, with a small vertical drift whose
      // phase is the mote's index — so a pool of three does not pulse as one.
      const offsetX = (mote.index - (mote.count - 1) / 2) * MOTE_SPREAD;
      const bob = Math.sin(this.#clock * 1.6 + mote.index * 1.9) * MOTE_DRIFT;
      // A form standing at this same anchor pulls the mote toward it (§6).
      const form = lowestFormAt(forms, mote.player);
      const pull = form === null ? 0 : MOTE_PULL;
      const formY = anchor.y + FORM_BASE_Y + (form?.index ?? 0) * FORM_STEP_Y;
      POSITION.set(
        anchor.x + offsetX * (1 - pull),
        anchor.y + bob + (formY - anchor.y) * pull,
        anchor.z,
      );
      EULER.set(-Math.PI / 2, 0, 0);
      QUATERNION.setFromEuler(EULER);
      SCALE.set(MOTE_SIZE, MOTE_SIZE, 1);
      MATRIX.compose(POSITION, QUATERNION, SCALE);
      moteMesh.setMatrixAt(i, MATRIX);
      COLOUR.copy(parsedColour(mote.colour));
      if (form !== null) COLOUR.multiplyScalar(MOTE_CONSUMED_DIM);
      moteMesh.setColorAt(i, COLOUR);
      i += 1;
    }
    this.#moteCount = i;

    this.#flush(moteMesh, i);
    this.#flush(tetherMesh, tether);
    for (const bucket of this.#forms) this.#flush(bucket.mesh, bucket.count);
  }

  /**
   * An empty bucket is made **invisible** rather than left at `count: 0`: three
   * skips an invisible object in `projectObject`, while an `InstancedMesh` with
   * zero instances still costs a draw call in `gl.info.render` — and this file
   * has seven buckets of which a quiet frame uses none.
   */
  #flush(mesh: THREE.InstancedMesh, count: number): void {
    mesh.count = count;
    mesh.visible = count > 0;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
  }

  #formBucket(kind: string): Bucket | null {
    for (const bucket of this.#forms) {
      if (bucket.kind === kind) return bucket;
    }
    return null;
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
  counts(): Record<string, number> {
    const out: Record<string, number> = { motes: this.#moteCount, tethers: this.#tetherCount };
    for (const bucket of this.#forms) out[bucket.kind] = bucket.count;
    return out;
  }

  dispose(): void {
    for (const mesh of [this.#motes, this.#tethers, ...this.#forms.map((b) => b.mesh)]) {
      if (mesh === null) continue;
      mesh.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.#motes = null;
    this.#tethers = null;
    this.#forms.length = 0;
    this.group.clear();
  }
}

/**
 * A tether's far end, in the anchor vocabulary `layout.ts` resolves.
 *
 * Two pooled refs rather than a literal per tether per frame (§9.2 rule 6): the
 * resolver reads the ref synchronously and keeps nothing, so reuse is exact.
 */
const CARD_REF: { kind: 'card'; id: number } = { kind: 'card', id: -1 };
const PLAYER_REF: { kind: 'player'; id: number } = { kind: 'player', id: -1 };
function anchorOf(target: TetherRef): AnchorRef {
  if (target.kind === 'card') {
    CARD_REF.id = target.id;
    return CARD_REF;
  }
  PLAYER_REF.id = target.id;
  return PLAYER_REF;
}

/** The bottom-most form of one player, which is the one a mote leans toward. */
function lowestFormAt(forms: readonly SpellForm[], player: number): SpellForm | null {
  let best: SpellForm | null = null;
  for (const form of forms) {
    if (form.player !== player) continue;
    if (best === null || form.index < best.index) best = form;
  }
  return best;
}
