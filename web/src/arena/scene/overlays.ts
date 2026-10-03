/*
 * mtg-table — arena/scene/overlays.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The pose overlays, as two `InstancedMesh`es** (report 13 §4.4, T5): the ring
 * at an enchanted figure's feet and the glow at its chest, for every attachment
 * the frame on screen says is there.
 *
 * ---------------------------------------------------------------------------
 * **Why this is not an `Effect`, and it is the same argument `discs.ts` makes.**
 *
 * `MAX_LIVE_EFFECTS = 8` (`cues/stage.ts`) caps *blended transients* and was
 * sized against full-size additive quads. A halo is **steady state**: it is on
 * screen for as long as the Aura is attached, which is 985 of the corpus's 3,679
 * frames, and the measured ceiling is 4 at once. Taking one of the cue engine's
 * eight slots per aura would starve it of its own budget for a thing that is not
 * a cue at all — so the overlays get their own pool, their own cap
 * (`MAX_POSE_OVERLAYS = 12`, `figures/attach.ts`) and **two draw calls whatever
 * is on the table**.
 *
 * **What it draws.** T5 implemented §4.3's two kinds: `shrink` (Quantum
 * Reduction — a ring that closes slowly at the figure's feet, over a host figure
 * the *pose* has already halved) and the default `halo` (a ring plus a soft chest
 * glow, in the ATTACHING card's colour, with §4.4's metallic variant for an
 * Equipment). **T12 (Tier 2 slice 3) draws the other four** — each keeps the ring
 * at the host's feet and replaces the chest glow with its own look:
 *
 * | kind | the look | per attachment |
 * |---|---|---|
 * | `shell` | an armour capsule around the whole figure, plated, metal-cooled | 1 billboard |
 * | `circuit` | circuit traces over the body, pulsing | 1 billboard |
 * | `glints` | three gadget glints orbiting the figure's hands | 3 billboards |
 * | `cocoon` | webbing wrapped over the body | 1 billboard |
 *
 * …and T12's two **stations** (`figures/attach.ts`'s `stationsOf`): the ops
 * console in Strategic Intervention's rank slot and the cocoon in Web Up's.
 * Every look is one `InstancedMesh` for the whole table — **one draw call per KIND,
 * never per figure**, and none at all while no card on the table wears it (an
 * invisible `InstancedMesh` is skipped by the renderer outright). An **anonymous**
 * host — a face-down creature — wears the halo ring and nothing else: a look is
 * drawn ON a body, and hard rule 8 gives a concealed card none (§1.4).
 *
 * **The time term is gated, like everything else that moves with no cue behind
 * it.** `CueRunner` passes `dt` and passes **0 while the queue is idle** (user
 * decision 7, §8.3 rule 1), so the ring's slow contraction costs no idle frames:
 * a still table shows a still ring, and that is not a defect.
 * ---------------------------------------------------------------------------
 */

import * as THREE from 'three';

import { STATION_SIZE, type AttachmentManifestation, type StationPose } from '../figures/attach.ts';
import type { FigureLayout, FigurePose } from '../figures/pose.ts';
import { parsedColour } from './colourCache.ts';
import { shapeTexture } from './effects.ts';
import { UNIT_PLANE } from './geometry.ts';
import type { OffsetSource } from './discs.ts';
import { initTexture } from './useCardTexture.ts';

/** §4.4's cap, with room: four is the measured ceiling and twelve is the budget. */
export const OVERLAY_CAPACITY = 16;

/** T12 — the glints are three per Spy Kit. */
const GLINTS_PER = 3;

/** An empty station list, shared — the frame loop passes it when there is none. */
const NO_STATIONS: readonly StationPose[] = Object.freeze([]) as readonly StationPose[];

/** Flat on the table, like every other ring in the arena. */
const FLAT = -Math.PI / 2;

/** Just above the stand disc, so the two read as two things and never z-fight. */
const RING_LIFT = 0.008;

/** Where the chest glow sits, as a fraction of the host figure's height. */
const GLOW_AT_HEIGHT = 0.62;

/**
 * How wide the ring is against the host's stand disc, and the band it is kept in.
 *
 * Bounded because the disc grows with power/toughness: at a flat 2.6× the hovering
 * Aerial Doombot's halo (disc radius 0.371) was a hoop **1.93 units across** —
 * wider than two cards — measured off the instance matrix at g1 frame 266. A halo
 * belongs to one figure, so it never outgrows the rank slot.
 */
const RING_SCALE = 1.5;
const RING_MIN = 0.18;
const RING_MAX = 0.5;
/** The `shrink` ring's slow breath: it closes to this and opens again. */
const SHRINK_PERIOD_S = 2.6;
const SHRINK_MIN = 0.42;

/** An Equipment reads colder and harder than an Aura (§4.4). */
const METAL_MIX = 0.55;
const METAL = '#cdd6e0';

let ringTex: THREE.Texture | null | undefined;
let glowTex: THREE.Texture | null | undefined;

/** A thin bright annulus — the ring at a figure's feet. Drawn once for the page. */
function ringTexture(): THREE.Texture | null {
  if (ringTex !== undefined) return ringTex;
  if (typeof document === 'undefined') return (ringTex = null);
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return (ringTex = null);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.62, 'rgba(255,255,255,0.05)');
  g.addColorStop(0.84, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.93, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  initTexture(texture, null);
  return (ringTex = texture);
}

/** A soft dot — the chest glow. */
function glowTexture(): THREE.Texture | null {
  if (glowTex !== undefined) return glowTex;
  if (typeof document === 'undefined') return (glowTex = null);
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return (glowTex = null);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.4)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.09)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  initTexture(texture, null);
  return (glowTex = texture);
}

/** §9.2 rule 6 — scratch at module scope, never inside the frame loop. */
const MATRIX = new THREE.Matrix4();
const POSITION = new THREE.Vector3();
const QUATERNION = new THREE.Quaternion();
const EULER = new THREE.Euler();
const SCALE = new THREE.Vector3();
const TOWARD = new THREE.Vector3();
const COLOUR = new THREE.Color();
const METAL_COLOUR = new THREE.Color(METAL);

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

export class OverlayField {
  readonly group = new THREE.Group();
  readonly capacity: number;
  #rings: THREE.InstancedMesh | null = null;
  #glows: THREE.InstancedMesh | null = null;
  #ringCount = 0;
  #glowCount = 0;
  // T12's looks and stations — one instanced mesh per kind (see the header).
  #shells: THREE.InstancedMesh | null = null;
  #circuits: THREE.InstancedMesh | null = null;
  #glints: THREE.InstancedMesh | null = null;
  #webs: THREE.InstancedMesh | null = null;
  #consoles: THREE.InstancedMesh | null = null;
  #cocoons: THREE.InstancedMesh | null = null;
  #looks = { shells: 0, circuits: 0, glints: 0, webs: 0, consoles: 0, cocoons: 0 };
  /** Advanced by the frame's `dt`; **`CueRunner` passes 0 while idle**. */
  #clock = 0;

  constructor(capacity = OVERLAY_CAPACITY) {
    this.capacity = capacity;
    this.group.name = 'arena-overlays';
    this.#build();
  }

  /**
   * `effects.ts`'s documented `<StrictMode>` defect, for the third time: a
   * cleanup that disposes a field the re-mounted tree goes on using leaves it
   * silently drawing nothing. Rebuild rather than guard the caller.
   */
  #build(): void {
    this.#rings = this.#add(additive(ringTexture()), 12);
    this.#glows = this.#add(additive(glowTexture()), 13);
    this.#shells = this.#add(additive(shapeTexture('capsule')), 14);
    this.#circuits = this.#add(additive(shapeTexture('circuit')), 14);
    this.#glints = this.#add(additive(shapeTexture('star')), 15, this.capacity * GLINTS_PER);
    this.#webs = this.#add(additive(shapeTexture('web')), 14);
    this.#consoles = this.#add(additive(shapeTexture('console')), 16);
    this.#cocoons = this.#add(additive(shapeTexture('cocoon')), 16);
  }

  #add(material: THREE.Material, renderOrder: number, capacity = this.capacity): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(UNIT_PLANE, material, capacity);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.visible = false;
    mesh.renderOrder = renderOrder;
    // §3.10 rule 2 — never a click target. `HitProxy` sits at `layout(state)`
    // and is the only thing the raycaster sees; an aura's halo hangs over the
    // card whose click it would otherwise steal.
    mesh.raycast = () => {};
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(mesh);
    return mesh;
  }

  /**
   * Write this frame's overlays. Called once per frame from `CueRunner`'s single
   * `useFrame` and from nowhere else.
   *
   * It takes the figure layout because an overlay is a fact about a **host**: the
   * ring is sized against that figure's own stand disc and the glow sits at a
   * fraction of its height, so a shrunk creature's halo shrinks with it for free
   * — which is the whole reason `hostScale` is folded into the pose rather than
   * applied here.
   *
   * `offsets` is the card's live cue offset, so an enchanted creature that lunges
   * takes its aura with it. The camera is taken so the chest glow can billboard;
   * everything else is flat on the table like the disc.
   */
  bind(
    poses: FigureLayout,
    offsets: OffsetSource,
    camera: THREE.Camera,
    dt: number,
    stations: readonly StationPose[] = NO_STATIONS,
  ): void {
    if (this.group.children.length === 0) this.#build();
    const rings = this.#rings;
    const glows = this.#glows;
    if (rings === null || glows === null) return;
    this.#clock += dt;
    const breath = 0.5 + 0.5 * Math.cos((this.#clock / SHRINK_PERIOD_S) * Math.PI * 2);
    const looks = this.#looks;
    looks.shells = 0;
    looks.circuits = 0;
    looks.glints = 0;
    looks.webs = 0;
    looks.consoles = 0;
    looks.cocoons = 0;

    let ring = 0;
    let glow = 0;
    for (const pose of poses.values()) {
      if (pose.attachments.length === 0) continue;
      const offset = offsets.offsetOf(pose.cardId);
      const alpha = Math.max(
        0,
        Math.min(1, pose.opacity * offset.opacity * (1 - offset.dissolve)),
      );
      if (alpha <= 0.01) continue;

      for (const attachment of pose.attachments) {
        if (ring >= this.capacity) break;
        const shrink = attachment.kind === 'shrink';
        // The `shrink` ring closes and opens slowly — the Quantum Realm still
        // pulling — while every other kind is a steady band.
        const base = Math.min(RING_MAX, Math.max(RING_MIN, pose.radius * RING_SCALE));
        const radius = base * (shrink ? SHRINK_MIN + (1 - SHRINK_MIN) * breath : 1);
        POSITION.set(
          pose.position[0] + offset.dx,
          pose.position[1] + offset.dy + RING_LIFT,
          pose.position[2] + offset.dz,
        );
        EULER.set(FLAT, 0, 0);
        QUATERNION.setFromEuler(EULER);
        SCALE.set(radius * 2, radius * 2, 1);
        MATRIX.compose(POSITION, QUATERNION, SCALE);
        rings.setMatrixAt(ring, MATRIX);
        this.#tint(attachment, alpha, shrink ? 1.15 : 1);
        rings.setColorAt(ring, COLOUR);
        ring += 1;

        // T12: a look drawn ON the body replaces the chest glow. An anonymous host
        // (a face-down creature) wears none — only the ring above (§1.4).
        if (attachment.kind !== 'halo' && attachment.kind !== 'shrink' && !pose.anonymous) {
          this.#look(attachment, pose, offset, alpha, camera);
          continue;
        }

        // The chest glow is what makes a halo read as *on the creature* rather
        // than as a mark on the table. `shrink` deliberately has none: the thing
        // that reads there is how small the host has become.
        if (shrink || glow >= this.capacity) continue;
        POSITION.set(
          pose.position[0] + offset.dx,
          pose.position[1] + offset.dy + pose.height * GLOW_AT_HEIGHT,
          pose.position[2] + offset.dz,
        );
        QUATERNION.copy(camera.quaternion);
        // Half the figure's height and a low boost: at 0.8× and 0.85 a colourless
        // Equipment's glow was a white blob over the opponent's card art
        // (photographed at g1 frame 266, T5).
        const size = Math.max(0.14, pose.height * 0.5);
        SCALE.set(size, size, 1);
        MATRIX.compose(POSITION, QUATERNION, SCALE);
        glows.setMatrixAt(glow, MATRIX);
        this.#tint(attachment, alpha, 0.5);
        glows.setColorAt(glow, COLOUR);
        glow += 1;
      }
    }

    // T12's stations: a pose of the card itself, over its own rest position.
    for (let i = 0; i < stations.length; i++) this.#station(stations[i]!, offsets, camera);

    this.#ringCount = ring;
    this.#glowCount = glow;
    rings.count = ring;
    glows.count = glow;
    // An empty bucket is skipped by the renderer outright when it is invisible —
    // `projectObject` never reaches it — where an `InstancedMesh` with `count: 0`
    // still costs a draw call in `gl.info.render`.
    rings.visible = ring > 0;
    glows.visible = glow > 0;
    rings.instanceMatrix.needsUpdate = true;
    glows.instanceMatrix.needsUpdate = true;
    if (rings.instanceColor !== null) rings.instanceColor.needsUpdate = true;
    if (glows.instanceColor !== null) glows.instanceColor.needsUpdate = true;
    commit(this.#shells, looks.shells);
    commit(this.#circuits, looks.circuits);
    commit(this.#glints, looks.glints);
    commit(this.#webs, looks.webs);
    commit(this.#consoles, looks.consoles);
    commit(this.#cocoons, looks.cocoons);
  }

  /**
   * **T12 — one attachment's look on its host's body** (report 13 §4.3's table).
   * Billboards, sized in the host's drawn height (so a Quantum-Reduced host wears
   * a smaller shell), riding the host's live offset (so the look goes where the
   * figure goes), in the ATTACHING card's colour (§4.4) — cooled toward metal for
   * an Equipment, exactly as the halo is.
   */
  #look(
    attachment: AttachmentManifestation,
    pose: FigurePose,
    offset: { dx: number; dy: number; dz: number; scale: number },
    alpha: number,
    camera: THREE.Camera,
  ): void {
    const h = pose.height * offset.scale;
    const x = pose.position[0] + offset.dx;
    const y = pose.position[1] + offset.dy;
    const z = pose.position[2] + offset.dz;
    const looks = this.#looks;
    const kind = attachment.kind;
    if (kind === 'shell') {
      // Super Suit: a plated capsule the shape of a standing body's box, a
      // little larger than the figure, so the figure reads as INSIDE armour.
      const mesh = this.#shells;
      if (mesh === null || looks.shells >= this.capacity) return;
      const width = Math.max(pose.width * 1.08, h * 0.7);
      this.#billboard(mesh, looks.shells, x, y + h * 0.54, z, width, h * 1.16, camera, h * 0.42);
      this.#tint(attachment, alpha, 1.05);
      mesh.setColorAt(looks.shells, COLOUR);
      looks.shells += 1;
      return;
    }
    if (kind === 'circuit') {
      // Robotics Mastery: traces over the body, pulsing slowly (on the gated
      // clock — a still table shows still traces).
      const mesh = this.#circuits;
      if (mesh === null || looks.circuits >= this.capacity) return;
      const beat = 0.72 + 0.28 * Math.sin(this.#clock * Math.PI * 1.4);
      this.#billboard(mesh, looks.circuits, x, y + h * 0.52, z, h * 1.12, h * 1.2, camera, h * 0.45);
      this.#tint(attachment, alpha, 1.7 * beat);
      mesh.setColorAt(looks.circuits, COLOUR);
      looks.circuits += 1;
      return;
    }
    if (kind === 'glints') {
      // The Spy Kit: three gadget glints orbiting at hand height, each on its
      // own phase so they twinkle rather than blink together.
      const mesh = this.#glints;
      if (mesh === null) return;
      const reach = Math.max(pose.width * 0.48, h * 0.32);
      for (let i = 0; i < GLINTS_PER; i++) {
        if (looks.glints >= this.capacity * GLINTS_PER) return;
        const a = this.#clock * 1.7 + (i * Math.PI * 2) / GLINTS_PER;
        const twinkle = 0.55 + 0.45 * Math.abs(Math.sin(this.#clock * 3.1 + i * 1.9));
        const size = Math.max(0.12, h * 0.34) * (0.8 + 0.4 * twinkle);
        this.#billboard(
          mesh,
          looks.glints,
          x + Math.cos(a) * reach,
          y + h * (0.44 + 0.05 * Math.sin(this.#clock * 2.3 + i)),
          z + Math.sin(a) * reach,
          size,
          size,
          camera,
        );
        this.#tint(attachment, alpha, 1.3 * twinkle);
        mesh.setColorAt(looks.glints, COLOUR);
        looks.glints += 1;
      }
      return;
    }
    if (kind === 'cocoon') {
      const mesh = this.#webs;
      if (mesh === null || looks.webs >= this.capacity) return;
      this.#billboard(mesh, looks.webs, x, y + h * 0.5, z, h * 0.78, h * 1.08, camera, h * 0.42);
      this.#tint(attachment, alpha, 1);
      mesh.setColorAt(looks.webs, COLOUR);
      looks.webs += 1;
    }
  }

  /**
   * **T12 — a station in its own rank slot**: Strategic Intervention's ops
   * console, Web Up's cocoon, figure-sized at the slot's stand point
   * (`figures/attach.ts`'s `STATION_SIZE` / `STATION_LIFT`). It rides its card's
   * live offset (a cast rising, a snap), so it never floats away from the card it
   * belongs to.
   */
  #station(station: StationPose, offsets: OffsetSource, camera: THREE.Camera): void {
    const offset = offsets.offsetOf(station.cardId);
    const alpha = Math.max(0, Math.min(1, offset.opacity * (1 - offset.dissolve)));
    if (alpha <= 0.01) return;
    const x = station.position[0] + offset.dx;
    const y = station.position[1] + offset.dy + station.lift;
    const z = station.position[2] + offset.dz;
    const looks = this.#looks;
    if (station.kind === 'missionControl') {
      const mesh = this.#consoles;
      if (mesh === null || looks.consoles >= this.capacity) return;
      const size = STATION_SIZE.missionControl;
      this.#billboard(mesh, looks.consoles, x, y, z, size.w * station.scale, size.h * station.scale, camera);
      COLOUR.copy(parsedColour(station.colour)).multiplyScalar(1.05 * alpha);
      mesh.setColorAt(looks.consoles, COLOUR);
      looks.consoles += 1;
      return;
    }
    const mesh = this.#cocoons;
    if (mesh === null || looks.cocoons >= this.capacity) return;
    const size = STATION_SIZE.cocoon;
    this.#billboard(mesh, looks.cocoons, x, y, z, size.w * station.scale, size.h * station.scale, camera);
    COLOUR.copy(parsedColour(station.colour)).multiplyScalar(1.1 * alpha);
    mesh.setColorAt(looks.cocoons, COLOUR);
    looks.cocoons += 1;
  }

  /**
   * A camera-facing quad of `w × h` at `(x, y, z)`, written into instance `i` —
   * pulled `toward` world units toward the camera first. A look worn ON a body
   * (the shell's glass, the circuit traces) is drawn in front of it that way:
   * the holographic figure writes depth, and a billboard through its centre is
   * hidden by the half of the body in front of it (measured in the browser —
   * Robotics Mastery's traces were invisible on Wasp until this).
   */
  #billboard(
    mesh: THREE.InstancedMesh,
    i: number,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    camera: THREE.Camera,
    toward = 0,
  ): void {
    POSITION.set(x, y, z);
    if (toward > 0) {
      TOWARD.subVectors(camera.position, POSITION);
      const length = TOWARD.length();
      if (length > 1e-4) POSITION.addScaledVector(TOWARD, toward / length);
    }
    QUATERNION.copy(camera.quaternion);
    SCALE.set(w, h, 1);
    MATRIX.compose(POSITION, QUATERNION, SCALE);
    mesh.setMatrixAt(i, MATRIX);
  }

  /** The attaching card's colour, cooled toward metal for an Equipment (§4.4). */
  #tint(attachment: AttachmentManifestation, alpha: number, boost: number): void {
    COLOUR.copy(parsedColour(attachment.colour));
    if (attachment.metal) COLOUR.lerp(METAL_COLOUR, METAL_MIX);
    // Additive blending has no alpha to fade, so the strength is in the colour —
    // the same trick `discs.ts` and `casting.ts` use.
    COLOUR.multiplyScalar(Math.max(0, Math.min(1.4, attachment.strength * alpha * boost)));
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
  counts(): {
    rings: number;
    glows: number;
    shells: number;
    circuits: number;
    glints: number;
    webs: number;
    consoles: number;
    cocoons: number;
  } {
    return { rings: this.#ringCount, glows: this.#glowCount, ...this.#looks };
  }

  dispose(): void {
    for (const mesh of [
      this.#rings,
      this.#glows,
      this.#shells,
      this.#circuits,
      this.#glints,
      this.#webs,
      this.#consoles,
      this.#cocoons,
    ]) {
      if (mesh === null) continue;
      mesh.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.#rings = null;
    this.#glows = null;
    this.#shells = null;
    this.#circuits = null;
    this.#glints = null;
    this.#webs = null;
    this.#consoles = null;
    this.#cocoons = null;
    this.group.clear();
  }
}

/** Park or show one look's mesh for this frame, and flag its buffers. */
function commit(mesh: THREE.InstancedMesh | null, count: number): void {
  if (mesh === null) return;
  mesh.count = count;
  mesh.visible = count > 0;
  if (count === 0) return;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
}
