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
import type { ClipRequest } from '../figures/clips.ts';
import type { FigureLayout, FigurePose } from '../figures/pose.ts';
import { ON_CARD_DISC_ORDER } from '../layout.ts';
import { COMIC, paintsFigure, type MaterialLook } from '../look.ts';
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
  /** T8 — the clip lane, read by the departing figures (see {@link DepartureBinder}). */
  clipOf(cardId: number): ClipRequest | null;
}

/**
 * **T8 fix — the queue's answer to "is this card's death still to come?"**
 * (`CueQueue.deathPending`). Typed here, by shape, so that neither this file nor
 * `FigureLayer.tsx` imports the cue engine: `CueRunner` hands the queue in.
 */
export interface DeathSource {
  deathPending(cardId: number): boolean;
}

/**
 * **T8 — the departing figures' per-frame half** (Tier 2 follow-up 2).
 *
 * A figure whose creature has just left the battlefield has no pose, so
 * `CueRunner.applyFigures` — which walks the living rigs — never sees it. Its
 * body is drawn from the snapshot it departs in until its own death cue has
 * ended (`figures/clips.ts`'s `stepDeparture`), and the thing that reads the queue
 * and the clip lane each frame is bound HERE, from inside the one `useFrame`'s call
 * to {@link DiscField.bind}: a dying creature's stand disc and its dying body are
 * the same layer of the table.
 *
 * The implementation lives in `FigureLayer.tsx` (which builds the bodies and is
 * one of the two files allowed to tick a mixer); this file only knows the shape,
 * so it imports nothing from React and the frame loop stays auditable.
 */
export interface DepartureBinder {
  bind(source: OffsetSource, deaths: DeathSource): void;
  /** How many departing bodies drew last frame — `?glinfo=1`'s census. */
  drawn(): number;
}

/**
 * **Slice 3 — the prop field's per-frame half** (`scene/props.ts`): every
 * figure's props, swarms, squads and vehicle silhouettes, one instanced mesh per
 * kind. Bound HERE, from inside the one `useFrame`'s call to {@link DiscField.bind}
 * and after `CueRunner.applyFigures` has posed every rig, exactly as the departing
 * bodies are: a figure's footprint and what it carries are the same layer of the
 * table. Typed by shape so this file imports nothing from the prop field.
 */
export interface PropBinder {
  bind(source: OffsetSource, seconds: number): void;
  /** Prop instances drawn last frame, and how many kinds — `?glinfo=1`'s census. */
  drawn(): number;
  kindsDrawn(): number;
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

// ---------------------------------------------------------------------------
// **The contact shadow** (Lane LOOK, **D123**, report 15 §3.5): a flat dark
// ellipse on the table under every PAINTED figure — the comic look's grounding,
// where the hologram's additive disc lit the table and every figure floated. One
// instanced draw call for all of them, no texture (the falloff is computed from
// the quad's UV), no clock, and a pose layer: written in `DiscField.bind` from
// the pose and the live offset, so a lunging figure's shadow lunges with it. Its
// strength rides `instanceColor.r`. Empty — and so not drawn — under the
// hologram, and never under an anonymous figure or a ghost (D125: a hologram
// casts no shadow). It is NOT drei's `ContactShadows`, which renders the scene a
// second time into a target (report 09 §9.2 rule 3).
// ---------------------------------------------------------------------------

const SHADOW_VERTEX = /* glsl */ `
  #include <common>
  #include <color_pars_vertex>
  varying vec2 vUv;
  void main() {
    #include <color_vertex>
    vUv = uv;
    #include <begin_vertex>
    #include <project_vertex>
  }
`;

const SHADOW_FRAGMENT = /* glsl */ `
  #include <color_pars_fragment>
  uniform vec3 uShadow;
  varying vec2 vUv;
  void main() {
    float r = length( vUv - 0.5 ) * 2.0;
    // A comic shadow is a SHAPE, not a gradient: flat to 70%, then a short edge.
    float a = ( 1.0 - smoothstep( 0.7, 1.0, r ) ) * vColor.r;
    gl_FragColor = vec4( uShadow, a );
    #include <colorspace_fragment>
  }
`;

function shadowMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: SHADOW_VERTEX,
    fragmentShader: SHADOW_FRAGMENT,
    uniforms: { uShadow: { value: new THREE.Color(COMIC.shadow) } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** §9.2 rule 6 — scratch at module scope, never inside the frame loop. */
const MATRIX = new THREE.Matrix4();
const POSITION = new THREE.Vector3();
const QUATERNION = new THREE.Quaternion();
const EULER = new THREE.Euler();
const SCALE = new THREE.Vector3();
const COLOUR = new THREE.Color();
/** The shadow's turn and lean, refreshed once a frame from the camera (never allocated there). */
const KEY = new THREE.Vector3();
const FLAT_QUAT = new THREE.Quaternion();
const YAW_QUAT = new THREE.Quaternion();
const SHADOW_QUAT = new THREE.Quaternion();
const UP_AXIS = new THREE.Vector3(0, 1, 0);
const LENS_KEY = new THREE.Vector3(COMIC.key[0], COMIC.key[1], COMIC.key[2]).normalize();
const WORLD_KEY = new THREE.Vector3(COMIC.keyWorld[0], COMIC.keyWorld[1], COMIC.keyWorld[2]).normalize();

export class DiscField {
  /** The front row's discs — and every disc that is not standing on a card. */
  readonly mesh: THREE.InstancedMesh;
  /**
   * **T8 fix — the discs of figures standing ON their own card** (a wrapped
   * rank's back row, `FigurePose.onCard`), drawn in a second pass at
   * `ON_CARD_DISC_ORDER`, after the cards. In the first pass the back-row card
   * (`renderOrder` 20 + i) painted over its own disc. Empty — and so not drawn —
   * on every frame of the corpus that does not wrap a rank.
   */
  readonly onCardMesh: THREE.InstancedMesh;
  /** D123: the contact shadows, drawn before the discs. Empty under the hologram. */
  readonly shadowMesh: THREE.InstancedMesh;
  /** 0 the hologram (full discs), 1 the comic look. Written at commit ({@link DiscField.setLook}). */
  private look = 0;
  /** Whether the look draws contact shadows (`look.ts`'s `wantsShadows`). */
  private shadows = false;
  /** 1 when the key light is world-fixed (the workshop's toggle), else it turns with the lens. */
  private keyWorld = 0;
  /** The camera the lens-fixed key belongs to — handed in at commit, read once a frame. */
  private camera: THREE.Camera | null = null;
  /** How many instances the buffers hold. `mesh.count` is how many are drawn. */
  readonly capacity: number;
  /** T8 — the departing figures, installed by `FigureLayer` for its lifetime. */
  private departures: DepartureBinder | null = null;
  /** Slice 3 — the prop field, installed by `FigureLayer` for its lifetime. */
  private props: PropBinder | null = null;
  /**
   * The poses of the layout last bound, as an ARRAY — refilled only when the
   * layout object changes (once per snapshot), so the frame loop walks a fixed
   * array instead of allocating a `Map` iterator every frame (§9.2 rule 6).
   */
  private readonly list: FigurePose[] = [];
  private listOf: FigureLayout | null = null;

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
    this.mesh = discMesh(material, capacity, 5);
    // The same material, so the second pass is the same program: one more draw
    // call on a frame that wraps a rank, and none on any other.
    this.onCardMesh = discMesh(material, capacity, ON_CARD_DISC_ORDER);
    this.onCardMesh.name = 'discs:on-card';
    this.shadowMesh = discMesh(shadowMaterial(), capacity, 4);
    this.shadowMesh.name = 'discs:contact-shadows';
  }

  /**
   * **The look, at COMMIT** (`FigureLayer`'s layout effect, never the frame
   * loop): how far a painted figure's glowing disc steps back, whether shadows
   * are drawn, and the camera whose lens the key light rides — the frame loop
   * reads numbers and one camera's quaternion.
   */
  setLook(look: MaterialLook, shadows: boolean, camera: THREE.Camera | null): void {
    this.look = look.look;
    this.keyWorld = look.keyWorld;
    this.shadows = shadows && look.look > 0;
    this.camera = camera;
  }

  /** §8.3 rule 3's warm-up: the shadow program is compiled at mount (`FigureLayer`), not on first use. */
  setPrimeVisible(on: boolean): void {
    this.shadowMesh.visible = on || this.shadowMesh.count > 0;
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
  bind(poses: FigureLayout, offsets: OffsetSource, seconds: number, deaths: DeathSource): void {
    if (poses !== this.listOf) this.refill(poses);
    const list = this.list;
    let front = 0;
    let onCard = 0;
    let shadows = 0;
    // D123: where the key light is, put on the table — the shadow falls away from
    // it, so the bands and the ground agree. Once a frame, from the camera's own
    // quaternion (a lens-fixed key turns with it); no allocation.
    let leanX = 0;
    let leanZ = 0;
    if (this.shadows) {
      if (this.keyWorld > 0 || this.camera === null) KEY.copy(WORLD_KEY);
      else KEY.copy(LENS_KEY).applyQuaternion(this.camera.quaternion);
      const flat = Math.hypot(KEY.x, KEY.z);
      if (flat > 1e-3) {
        leanX = -KEY.x / flat;
        leanZ = -KEY.z / flat;
      }
      EULER.set(FLAT, 0, 0);
      FLAT_QUAT.setFromEuler(EULER);
      YAW_QUAT.setFromAxisAngle(UP_AXIS, Math.atan2(-leanZ, leanX));
      SHADOW_QUAT.multiplyQuaternions(YAW_QUAT, FLAT_QUAT);
    }
    for (let n = 0; n < list.length; n++) {
      const pose = list[n]!;
      // T10: a vehicle's silhouette flies; it has no footprint on the table.
      if (pose.silhouette !== null) continue;
      const mesh = pose.onCard ? this.onCardMesh : this.mesh;
      const i = pose.onCard ? onCard : front;
      if (i >= this.capacity) continue;
      const offset = offsets.offsetOf(pose.cardId);
      const radius = pose.radius * offset.scale;
      // The card's own `presence` bob, so a hovering Helicarrier's footprint
      // rides with it instead of staying nailed to the table. **Slice 3:** a
      // flier's own hover (`pose.lift`) is taken back out — its disc stays on the
      // ground under it, where it would stand, and does not bob with it.
      const bob =
        pose.bobAmp > 0 && pose.lift === 0
          ? pose.bobAmp * Math.sin(seconds * 2 * Math.PI * pose.bobHz)
          : 0;
      POSITION.set(
        pose.position[0] + offset.dx,
        pose.position[1] - pose.lift + offset.dy + bob + DISC_LIFT,
        pose.position[2] + offset.dz,
      );
      EULER.set(FLAT, 0, 0);
      QUATERNION.setFromEuler(EULER);
      SCALE.set(radius * 2, radius * 2, 1);
      MATRIX.compose(POSITION, QUATERNION, SCALE);
      mesh.setMatrixAt(i, MATRIX);

      // Additive blending has no alpha to fade, so the opacity is folded into
      // the colour — which is also how a summoning-sick creature's disc reads
      // as "not there yet" rather than "a different colour".
      COLOUR.copy(parsedColour(pose.tint));
      const strength = pose.opacity * offset.opacity * (1 - offset.dissolve);
      // D123: under the comic look a PAINTED figure's footprint is its shadow, so
      // its glowing disc steps back to a faint ring in its colour. An anonymous
      // figure and a ghost keep the hologram's disc (D125).
      const painted = this.look > 0 && paintsFigure(pose);
      const faint = painted ? 1 - (1 - COMIC.discUnderComic) * this.look : 1;
      COLOUR.multiplyScalar(Math.max(0, Math.min(1, strength)) * (pose.modelId === null ? 0.85 : 0.55) * faint);
      mesh.setColorAt(i, COLOUR);
      if (pose.onCard) onCard += 1;
      else front += 1;

      // D123: the contact shadow — on the GROUND under the figure (its hover taken
      // out), smaller and fainter the higher it flies, leaning away from the key.
      if (this.shadows && painted && shadows < this.capacity) {
        // Its height above its own ground: a flier's hover and a cue's lift — the
        // stand point itself sits on its card's plane (y 0.02), not in the air.
        const lift = Math.max(0, pose.lift + offset.dy);
        const fall = 1 / (1 + COMIC.shadowFalloff * lift);
        const size = pose.height * COMIC.shadowRadius * 2 * offset.scale * (0.55 + 0.45 * fall);
        const lean = size * COMIC.shadowLean * 0.5;
        POSITION.set(pose.position[0] + offset.dx + leanX * lean, DISC_LIFT * 0.5, pose.position[2] + offset.dz + leanZ * lean);
        SCALE.set(size * COMIC.shadowSquash, size, 1);
        MATRIX.compose(POSITION, SHADOW_QUAT, SCALE);
        this.shadowMesh.setMatrixAt(shadows, MATRIX);
        COLOUR.setRGB(COMIC.shadowAlpha * this.look * fall * Math.max(0, Math.min(1, strength)), 0, 0);
        this.shadowMesh.setColorAt(shadows, COLOUR);
        shadows += 1;
      }
    }
    commitCount(this.mesh, front);
    commitCount(this.onCardMesh, onCard);
    commitCount(this.shadowMesh, shadows);
    // T8: the bodies of the creatures that just left, drawn until their deaths end.
    this.departures?.bind(offsets, deaths);
    // Slice 3: what every figure carries — AFTER the rigs are posed this frame.
    this.props?.bind(offsets, seconds);
  }

  /**
   * Once per snapshot, never per frame: copy the layout's poses into the reused
   * array the frame loop walks. (A `Map` iterator is an allocation, and `bind`
   * runs sixty times a second.)
   */
  private refill(poses: FigureLayout): void {
    this.listOf = poses;
    this.list.length = 0;
    for (const pose of poses.values()) this.list.push(pose);
  }

  /**
   * Install (or, with `null`, remove) the departing figures. `FigureLayer` calls
   * it on mount and unmount; the frame loop never does.
   */
  setDepartures(binder: DepartureBinder | null): void {
    this.departures = binder;
  }

  /** Install (or, with `null`, remove) the prop field. `FigureLayer` calls it; the frame loop never does. */
  setProps(binder: PropBinder | null): void {
    this.props = binder;
  }

  /** How many discs (and T8's departing bodies) were drawn last frame — `?glinfo=1`'s census. */
  counts(): { discs: number; onCardDiscs: number; departures: number; props: number; propKinds: number } {
    return {
      discs: this.mesh.count + this.onCardMesh.count,
      onCardDiscs: this.onCardMesh.count,
      departures: this.departures?.drawn() ?? 0,
      // Slice 3: prop instances and the kinds they fill — each kind one draw call.
      props: this.props?.drawn() ?? 0,
      propKinds: this.props?.kindsDrawn() ?? 0,
    };
  }

  dispose(): void {
    this.mesh.dispose();
    this.onCardMesh.dispose();
    this.shadowMesh.dispose();
    (this.mesh.material as THREE.Material).dispose();
    (this.shadowMesh.material as THREE.Material).dispose();
  }
}

function discMesh(material: THREE.Material, capacity: number, renderOrder: number): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(UNIT_PLANE, material, capacity);
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.renderOrder = renderOrder;
  // A figure is never a click target (§3.10 rule 2) and neither is its
  // footprint: `HitProxy` is the only thing the raycaster sees.
  mesh.raycast = () => {};
  // `InstancedMesh` allocates `instanceColor` lazily on the first
  // `setColorAt`; doing it here means the frame loop never allocates.
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return mesh;
}

/** An empty pass is not drawn at all: `visible` false costs the renderer nothing. */
function commitCount(mesh: THREE.InstancedMesh, count: number): void {
  mesh.count = count;
  mesh.visible = count > 0;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
}
