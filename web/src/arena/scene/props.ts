/*
 * mtg-table — arena/scene/props.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The prop field** (Tier 2 slice 3 — per-card identity, T9 and T10).
 *
 * Every prop on the table — Wasp's wings, Ant-Man's helmet, Fury's coat and
 * eyepatch, Coulson's badge (chest and back) and tie, Quake's gauntlets, Peggy's
 * shield and hat, Agent 13's pistol and its lit muzzle, the Doombot's eye, visor,
 * thrusters and exhaust, the scientists' bench and the Biochemist's lab coat,
 * A.I.M.'s hood, the giant ant's rider, the Air Force's bees, the Agents' squad
 * and the Helicarrier's silhouette — is drawn here, as **one `InstancedMesh` per
 * kind**. A kind costs one draw call when anything on the table carries it and
 * nothing when nothing does (`visible = false`), so the field's cost is bounded by
 * the NUMBER OF KINDS in play, never by the number of figures (the budget line of
 * report 13 §8.2, which this slice measures at `g1.jsonl`@355).
 *
 * `figures/props.ts` is the data (which kinds, where on which body); this file
 * builds each kind's geometry — procedural primitives, merged per kind, plus two
 * kinds BAKED once from the loaded library (the squad's followers and the ant's
 * rider are the humanoid bodies frozen in a pose) — and writes the instances.
 *
 * ---------------------------------------------------------------------------
 * Four rules, each an arena rule this file is bound by:
 *
 *  1. **One frame loop.** {@link PropField.bind} is called from `DiscField.bind`,
 *     i.e. from `CueRunner`'s single `useFrame`, after `applyFigures` has written
 *     every rig — the same seam the departing bodies use. It reads, per joint
 *     prop, the joint's world matrix (so a pistol follows the arm the clip lane
 *     just posed) and allocates nothing: every binding, matrix and colour is built
 *     at COMMIT time ({@link PropField.commit}, from `FigureLayer`'s layout
 *     effect), and the frame loop walks fixed arrays by index
 *     (`liveness.test.ts` reads its body).
 *  2. **A pose, not a cue.** What a figure carries is decided by `figurePose`
 *     from the snapshot; the only things here that are functions of time — the
 *     wings' flutter, the ring's turn, a glow's flicker — move only while frames
 *     are being drawn (like the `presence` bob), and never under
 *     `prefers-reduced-motion`. The clock is the one the frame loop hands in.
 *  3. **One program.** Every kind is the same `ShaderMaterial` source
 *     (`propMaterial.ts`, Lane LOOK's since report 15 §9.4: the hologram's
 *     fresnel or the comic look's bands, plus instancing, a per-instance colour
 *     and a per-instance opacity) with its own uniforms, so three compiles one
 *     program for the whole field (primed at mount, see
 *     {@link PropField.setPrimeVisible}). This file picks each kind's preset
 *     (`LOOKS`) and never writes a uniform: the look reaches the kinds through
 *     {@link PropField.setLook}, at commit.
 *  4. **Hard rule 8.** A prop is only ever bound for a pose that `figurePose`
 *     gave props, and it gives none to an anonymous figure; a prop takes no
 *     click (`raycast` is cleared on every mesh) and carries no name.
 * ---------------------------------------------------------------------------
 */

import * as THREE from 'three';

import type { ClipRequest } from '../figures/clips.ts';
import type { FigureLayout, FigurePose } from '../figures/pose.ts';
import {
  CARVED_HAIR,
  COAT_PANEL,
  HANG_FROM,
  HAIR_KIND,
  HEAD_SHAPE,
  PROP_KIT,
  RING_RADIUS,
  SCENE_KINDS,
  SWARM_BEE_RATIO,
  anchorsOf,
  familyOf,
  swarmMembers,
  type HairStyle,
  type PropAnchor,
  type SceneKind,
  type SwarmMember,
} from '../figures/props.ts';
import { baseModelOf, restOfModel } from '../figures/rests.ts';
import type { ModelData } from '../figures/types.ts';
import { parsedColour } from './colourCache.ts';
import type { FigureRigMap } from './figureRigs.ts';
import { PROP_LOOK, applyPropLook, makePropMaterial, type PropLook, type PropMaterial } from './propMaterial.ts';
import { COSTUME_ATTRIBUTE } from './figureMaterial.ts';
import type { MaterialLook } from '../look.ts';
import { baseName, instantiateFigure, sampleClipInto, type LoadedModel, type ModelLibrary } from './models.ts';

export { baseName };

/** The slice of `SceneStage` the field reads — handed in, never imported. */
export interface PropOffsetSource {
  offsetOf(cardId: number): {
    dx: number;
    dy: number;
    dz: number;
    scale: number;
    opacity: number;
    dissolve: number;
    glow: number;
    /** The figure's turn about y (an attack facing its defender); a card ignores it. */
    dRotY: number;
  };
  clipOf(cardId: number): ClipRequest | null;
}

/**
 * **A body the props ride**: a living figure's rig (`figureRigs.ts`'s `FigureRig`
 * has exactly these three fields) or a DYING figure's (D64's departing body,
 * `FigureLayer`'s `DepartureField.bodies()`). The prop follows its joints, fades
 * with its holographic material's opacity, and — for a departing body — is drawn
 * only while the body is.
 */
export interface PropBody {
  readonly root: THREE.Object3D;
  readonly material: { readonly uniforms: { readonly uOpacity: { value: number } } };
  readonly pose: FigurePose;
}

/**
 * How many instances one kind's buffer holds. Slice 3 sized it for two per figure
 * (gauntlets) × 12 figures, with room: 32. **Lane BODIES' fix pass (D162) doubled
 * it**: a long coat's body and skirt are fourteen panels of ONE kind, the corpus
 * already puts two coats on the table at once (28), and the mirror the gate plays
 * by default can put four (56) — at 32 the third coat lost its skirt. 64 × 16
 * floats a kind is ~4 kB; `traits.test.ts` holds the mirror to it.
 */
export const PROP_CAPACITY = 64;
/** How many bindings the field holds in all — a binding is one instance of one kind. */
export const MAX_BINDINGS = 192;
/** The ring's turn, radians a second — slow enough to read as a hover, not a spin. */
const RING_SPEED = 0.55;
/** Drawn after the figure bodies (renderOrder 0), so an eyepatch lands on its face. */
const PROP_ORDER = 1;
/** §6.4's freeze wash, the same grey `CueRunner` lerps a frozen figure toward. */
const FREEZE_WASH = new THREE.Color('#8d949e');
const FREEZE_MIX = 0.45;
/** The clips that make a glowing prop flare — the emitter hook (traits.json `_hooks`). */
const FLARE_CLIPS: ReadonlySet<string> = new Set(['attack', 'summon', 'channel', 'grow']);

// ---------------------------------------------------------------------------
// The paint: which preset each kind wears (the shader is `propMaterial.ts`'s)
// ---------------------------------------------------------------------------

/**
 * **Each kind's material preset** — Lane LOOK's `propMaterial.ts` owns the shader
 * and the presets (report 15 §9.4); this table is the kit's choice of one per
 * kind. A new kind picks a preset here and needs no shader change.
 */
const LOOKS: Readonly<Record<SceneKind, PropLook>> = {
  wings: PROP_LOOK.membrane,
  helmet: PROP_LOOK.glass,
  hood: PROP_LOOK.solid,
  jetpack: PROP_LOOK.solid,
  exhaust: PROP_LOOK.glow,
  laserEye: PROP_LOOK.glow,
  pistol: PROP_LOOK.metal,
  sidearm: PROP_LOOK.metal,
  coat: PROP_LOOK.cloth,
  eyepatch: PROP_LOOK.dark,
  badge: PROP_LOOK.badge,
  gauntlets: PROP_LOOK.glow,
  shield: PROP_LOOK.emblem,
  rider: PROP_LOOK.body,
  labBench: PROP_LOOK.solid,
  muzzle: PROP_LOOK.glow,
  tie: PROP_LOOK.fabric,
  hat: PROP_LOOK.fabric,
  visor: PROP_LOOK.glow,
  squad: PROP_LOOK.body,
  swarmBee: PROP_LOOK.body,
  carrier: PROP_LOOK.hull,
  // Lane BODIES: a coat's skirt and a cloak are cloth like the coat; hair and the
  // face read as their own colours, like a shirt-front.
  coatTails: PROP_LOOK.cloth,
  cape: PROP_LOOK.cloth,
  face: PROP_LOOK.fabric,
  facePatched: PROP_LOOK.fabric,
  faceGrit: PROP_LOOK.fabric,
  facePatchedGrit: PROP_LOOK.fabric,
  hairParted: PROP_LOOK.fabric,
  hairLong: PROP_LOOK.fabric,
  hairCrop: PROP_LOOK.fabric,
  hairBob: PROP_LOOK.fabric,
  hairWaves: PROP_LOOK.fabric,
  hairBun: PROP_LOOK.fabric,
  // Villain identity (D221): Doom's iron faceplate, and every mask after it; the
  // hood over it is cloth.
  mask: PROP_LOOK.metal,
  hairCowl: PROP_LOOK.cloth,
};

// ---------------------------------------------------------------------------
// Geometry — procedural, merged per kind, with a per-vertex colour
// ---------------------------------------------------------------------------

type RGB = readonly [number, number, number];
const WHITE: RGB = [1, 1, 1];

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const P = new THREE.Vector3();
const S = new THREE.Vector3();

/** A part: a built-in geometry, coloured, placed by translate / Euler / scale. */
function part(
  geometry: THREE.BufferGeometry,
  colour: RGB = WHITE,
  at: readonly [number, number, number] = [0, 0, 0],
  turn: readonly [number, number, number] = [0, 0, 0],
  size: readonly [number, number, number] = [1, 1, 1],
): THREE.BufferGeometry {
  const flat = geometry.index === null ? geometry : geometry.toNonIndexed();
  if (flat !== geometry) geometry.dispose();
  flat.deleteAttribute('uv');
  const count = flat.getAttribute('position').count;
  const colours = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colours[i * 3] = colour[0];
    colours[i * 3 + 1] = colour[1];
    colours[i * 3 + 2] = colour[2];
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  E.set(turn[0], turn[1], turn[2]);
  Q.setFromEuler(E);
  M.compose(P.set(at[0], at[1], at[2]), Q, S.set(size[0], size[1], size[2]));
  flat.applyMatrix4(M);
  return flat;
}

/** Concatenate non-indexed parts into one non-indexed geometry (position, normal, color). */
function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let total = 0;
  for (const p of parts) total += p.getAttribute('position').count;
  const position = new Float32Array(total * 3);
  const normal = new Float32Array(total * 3);
  const color = new Float32Array(total * 3);
  let offset = 0;
  for (const p of parts) {
    const n = p.getAttribute('position').count;
    position.set((p.getAttribute('position') as THREE.BufferAttribute).array as Float32Array, offset * 3);
    normal.set((p.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array, offset * 3);
    color.set((p.getAttribute('color') as THREE.BufferAttribute).array as Float32Array, offset * 3);
    offset += n;
    p.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(position, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  out.setAttribute('color', new THREE.BufferAttribute(color, 3));
  out.computeBoundingSphere();
  return out;
}

/**
 * **A geometry made a figure**: one unit tall, feet at y = 0 — and no wider than
 * `maxRatio` of its height, squeezing x if it is, because the pose's width clamp
 * (`figures/props.ts`'s `SWARM_BEE_RATIO`) is only honest if the drawn thing is no
 * wider than it assumed.
 */
function unitFigure(geometry: THREE.BufferGeometry, maxRatio: number): THREE.BufferGeometry {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const height = box.max.y - box.min.y;
  const scale = height > 0 ? 1 / height : 1;
  const width = (box.max.x - box.min.x) * scale;
  const squeeze = width > maxRatio ? maxRatio / width : 1;
  geometry.translate(-(box.max.x + box.min.x) / 2, -box.min.y, 0);
  geometry.scale(scale * squeeze, scale, scale);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** An insect-wing blade: an ellipse from the origin along +y, `length` long, in the xy plane. */
function blade(length: number, width: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.absellipse(0, length / 2, width / 2, length / 2, 0, Math.PI * 2, false, 0);
  return new THREE.ShapeGeometry(shape, 10);
}

/** A flat regular star (the shield's), `points` points, in the xy plane. */
function star(points: number, outer: number, inner: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2;
    const x = Math.sin(a) * r;
    const y = Math.cos(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

const RED: RGB = [0.95, 0.16, 0.18];
const BLUE: RGB = [0.22, 0.38, 1];
const OFF_WHITE: RGB = [0.96, 0.96, 0.96];

/**
 * **The kinds that carry a LINING** (lane BODIES' second fix pass, D163): a sheet
 * of cloth seen from both sides — a coat's panels and a cloak's. The prop field
 * draws every kind `DoubleSide` (`makePropMaterial`) and asks for none; a renderer
 * that culls back faces — the duelists' bake, drawn in the figures' own
 * `FrontSide` material (`DuelistLayer`) — gets the sheet's inside as a second,
 * reversed sheet, so from three-quarters behind the director's coat is a coat and
 * not three planks with the table between them, and the villain's cloak is a cloak
 * from the front (the verifier's second round; PLAN.md's lane BODIES follow-up 17).
 */
const LINED_KINDS: ReadonlySet<SceneKind> = new Set<SceneKind>(['coatTails', 'cape']);

/**
 * **The coat's YOKE, cut to the body** (lane BODIES' third fix pass), in the
 * kind's own units at size 1 (figure units on the proportioned body, the anchor
 * at the shoulders, `figures/props.ts`'s `coat` at z −0.005): 0.16 long, 0.15
 * across at the shoulders and 0.128 at the hem, where it overlaps the body link
 * (`COAT_CHEST`: its top at 0.70, 0.114 there, round z −0.024). Its DEPTH and
 * CENTRE vary down its length — 0.72 of its width round z −0.035 at the shoulders
 * (the shoulders measured −0.11…+0.04), round and a little forward of the body
 * link's axis at the hem (the chest rests pitched forward, which tucks the hem's
 * front in) — so the hem wraps the body link's top with no ledge and no gap.
 * `traits.test.ts`'s yoke-seam test holds it, with D163's flared cut as control.
 */
export const YOKE_CUT = {
  length: 0.16,
  top: 0.15,
  hem: 0.128,
  depth: [0.72, 1],
  z: [-0.035, -0.018],
  anchorZ: -0.005,
} as const;

/** Bend a yoke part to `YOKE_CUT`: depth and centre interpolated from the shoulders (y 0) to the hem. Build time only. */
function tailorYoke(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const [depthTop, depthHem] = YOKE_CUT.depth;
  const [zTop, zHem] = YOKE_CUT.z;
  for (let i = 0; i < position.count; i++) {
    const t = Math.min(1, Math.max(0, -position.getY(i) / YOKE_CUT.length));
    const depth = depthTop + (depthHem - depthTop) * t;
    position.setZ(i, position.getZ(i) * depth + (zTop + (zHem - zTop) * t) - YOKE_CUT.anchorZ);
    const nz = normal.getZ(i) / depth;
    const k = 1 / Math.hypot(normal.getX(i), normal.getY(i), nz);
    normal.setXYZ(i, normal.getX(i) * k, normal.getY(i) * k, nz * k);
  }
  return geometry;
}

/** How far inside its sheet a lining lies, in the kind's own units: hidden behind it from outside, in front of it from inside. */
const LINING_INSET = 0.0025;

export interface KindGeometryOptions {
  /**
   * Add the lining to a cloth kind ({@link LINED_KINDS}) — the default, for a
   * renderer that culls back faces. The prop field, drawn `DoubleSide`, passes
   * `false` and pays for one sheet.
   */
  lining?: boolean;
}

/**
 * Every procedural kind's geometry, in its own unit space — the anchor's `at`,
 * `turn` and `size` (`figures/props.ts`) place it on a body. Exported for
 * `web/test/traits.test.ts`, which measures the bee and the carrier against the
 * numbers the pose's width clamp assumes, and for the duelists' bake.
 */
export function buildKindGeometry(kind: SceneKind, options: KindGeometryOptions = {}): THREE.BufferGeometry | null {
  const geometry = proceduralKind(kind);
  if (geometry === null || options.lining === false || !LINED_KINDS.has(kind)) return geometry;
  return withLining(geometry);
}

/**
 * A sheet and its lining: every triangle again, `LINING_INSET` inside it along its
 * own normal, wound the other way and facing in, in the same vertex colour (so a
 * baker that reads a slot off the colour puts the lining in the same slot).
 */
function withLining(sheet: THREE.BufferGeometry): THREE.BufferGeometry {
  const position = sheet.getAttribute('position');
  const normal = sheet.getAttribute('normal');
  const colour = sheet.getAttribute('color');
  const count = position.count;
  const pos = new Float32Array(count * 6);
  const nor = new Float32Array(count * 6);
  const col = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    pos.set([position.getX(i), position.getY(i), position.getZ(i)], i * 3);
    nor.set([normal.getX(i), normal.getY(i), normal.getZ(i)], i * 3);
    col.set([colour.getX(i), colour.getY(i), colour.getZ(i)], i * 3);
  }
  for (let t = 0; t + 2 < count; t += 3) {
    // (a, b, c) → (a, c, b): the other winding.
    const order = [t, t + 2, t + 1];
    for (let k = 0; k < 3; k++) {
      const src = order[k]!;
      const dst = count + t + k;
      const nx = normal.getX(src);
      const ny = normal.getY(src);
      const nz = normal.getZ(src);
      pos.set([position.getX(src) - nx * LINING_INSET, position.getY(src) - ny * LINING_INSET, position.getZ(src) - nz * LINING_INSET], dst * 3);
      nor.set([-nx, -ny, -nz], dst * 3);
      col.set([colour.getX(src), colour.getY(src), colour.getZ(src)], dst * 3);
    }
  }
  sheet.dispose();
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

/** {@link buildKindGeometry}'s switch: one sheet of every procedural kind. */
function proceduralKind(kind: SceneKind): THREE.BufferGeometry | null {
  switch (kind) {
    case 'wings': {
      // Two pairs, the upper ones longer, splayed wide so they show round a chibi's
      // head from the front; each darkens toward its root (a wasp's black and gold).
      const pair = (length: number, width: number, angle: number, dy: number, dz: number): THREE.BufferGeometry[] =>
        [1, -1].map((side) => {
          const wing = part(blade(length, width), WHITE, [side * 0.04, dy, dz], [0, 0, -side * angle]);
          const pos = wing.getAttribute('position');
          const col = wing.getAttribute('color') as THREE.BufferAttribute;
          for (let i = 0; i < pos.count; i++) {
            const reach = Math.min(1, Math.hypot(pos.getX(i), pos.getY(i) - dy) / length);
            const shade = 0.3 + 0.8 * reach;
            col.setXYZ(i, shade, shade, shade);
          }
          return wing;
        });
      return mergeParts([...pair(1, 0.38, 0.92, 0, 0), ...pair(0.62, 0.3, 2.15, -0.04, 0.01)]);
    }
    case 'helmet': {
      // A glass dome over the whole head, a bright crest over its crown, two
      // thick antennae with lit tips, two red lenses. The crest and the antennae
      // are what the table view's steep camera sees of him — slice 3's first
      // helmet was a bubble from there (the verification pass).
      const antenna = (side: number): THREE.BufferGeometry[] => [
        part(new THREE.CylinderGeometry(0.075, 0.1, 0.8, 6), [1.35, 1.35, 1.35], [side * 0.48, 1.2, 0.16], [0.25, 0, -side * 0.45]),
        part(new THREE.SphereGeometry(0.16, 8, 6), [1.9, 1.7, 1.6], [side * 0.66, 1.55, 0.26]),
      ];
      return mergeParts([
        part(new THREE.SphereGeometry(1, 14, 10)),
        // The crest: a raised silver fin from the brow over the crown to the nape.
        // (a half-ring round x: theta 0..π is the upper half, front to back.)
        part(new THREE.CylinderGeometry(1.03, 1.03, 0.28, 16, 1, true, 0, Math.PI), [1.5, 1.5, 1.5], [0, 0.02, 0], [0, 0, Math.PI / 2]),
        part(new THREE.BoxGeometry(0.2, 0.18, 1.5), [1.5, 1.5, 1.5], [0, 1.02, -0.05], [0.1, 0, 0]),
        ...antenna(1),
        ...antenna(-1),
        part(new THREE.CircleGeometry(0.42, 16), [2.4, 0.4, 0.35], [0.37, -0.04, 1.03]),
        part(new THREE.CircleGeometry(0.42, 16), [2.4, 0.4, 0.35], [-0.37, -0.04, 1.03]),
      ]);
    }
    case 'hood': {
      // A.I.M.'s bucket: a cylinder over the head, flat-topped, with a dark visor.
      return mergeParts([
        part(new THREE.CylinderGeometry(1, 1.06, 2, 16, 1)),
        part(new THREE.BoxGeometry(1.25, 0.34, 0.12), [0.06, 0.06, 0.08], [0, 0.08, 1.02]),
      ]);
    }
    case 'jetpack': {
      return mergeParts([
        part(new THREE.CapsuleGeometry(0.3, 1.1, 3, 8), [1, 1, 1], [0.52, 0, 0]),
        part(new THREE.CapsuleGeometry(0.3, 1.1, 3, 8), [1, 1, 1], [-0.52, 0, 0]),
        part(new THREE.BoxGeometry(1.1, 0.5, 0.34), [0.8, 0.8, 0.8], [0, 0.15, 0.1]),
        // Nozzle rings, brighter: where the flame starts.
        part(new THREE.CylinderGeometry(0.34, 0.26, 0.18, 10, 1, true), [1.4, 1.1, 0.8], [0.52, -0.9, 0]),
        part(new THREE.CylinderGeometry(0.34, 0.26, 0.18, 10, 1, true), [1.4, 1.1, 0.8], [-0.52, -0.9, 0]),
      ]);
    }
    case 'exhaust': {
      // Two flames pointing down from the nozzles; the frame loop stretches them.
      const flame = (x: number): THREE.BufferGeometry => {
        const cone = new THREE.ConeGeometry(0.27, 1.8, 10, 4, true);
        // Hot white at the nozzle, orange, then nothing (additive) at the tip.
        const flat = part(cone, WHITE, [x, -0.9, 0], [Math.PI, 0, 0]);
        const pos = flat.getAttribute('position');
        const col = flat.getAttribute('color') as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const t = Math.min(1, Math.max(0, -pos.getY(i) / 1.8)); // 0 at the nozzle → 1 at the tip
          col.setXYZ(i, 1.5 * (1 - t) + 0.9 * t * (1 - t), 1.25 * (1 - t) * (1 - t) + 0.2 * (1 - t), 0.7 * (1 - t) * (1 - t));
        }
        return flat;
      };
      return mergeParts([flame(0.52), flame(-0.52)]);
    }
    case 'laserEye': {
      return mergeParts([
        part(new THREE.SphereGeometry(1, 10, 6)),
        part(new THREE.SphereGeometry(0.5, 8, 4), [1.8, 1.8, 1.8], [0, 0, 0.6]),
      ]);
    }
    case 'pistol':
    case 'sidearm': {
      // Grip at the origin, barrel along +z to its tip at (0, 0.25, 1.25) —
      // `figures/props.ts`'s PISTOL_TIP_LOCAL, where the lit muzzle sits.
      // **The third fix pass gives it a pistol's profile** (the verifier read
      // Peggy's sidearm as "a grey brick"): a slide a little narrower than it is
      // tall, a DARK grip raked back under it, a trigger guard between them, and
      // a hammer — two tones, so the grip reads against the slide at the size a
      // figure holds it; 90 triangles (it was 64).
      return mergeParts([
        part(new THREE.BoxGeometry(0.46, 0.5, 1.4), WHITE, [0, 0.25, 0.5]),
        part(new THREE.BoxGeometry(0.42, 1, 0.48), [0.32, 0.3, 0.3], [0, -0.3, -0.06], [-0.32, 0, 0]),
        part(new THREE.TorusGeometry(0.2, 0.05, 3, 5, Math.PI * 1.2), [0.32, 0.3, 0.3], [0, -0.02, 0.3], [0, Math.PI / 2, Math.PI * 0.9]),
        part(new THREE.BoxGeometry(0.2, 0.18, 0.16), [0.32, 0.3, 0.3], [0, 0.52, -0.18], [0.5, 0, 0]),
        part(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 6), [0.35, 0.35, 0.35], [0, 0.25, 1.2], [Math.PI / 2, 0, 0]),
      ]);
    }
    case 'coat': {
      // **Slice 4: a coat cut for the PROPORTIONED body**, in its figure units at
      // size 1, from the shoulders (the anchor): an open shell a little wider than
      // the shoulders at the top (0.15), squashed front-to-back toward the body's
      // depth; it wraps round the front to a 40° opening, and its arms-free cut
      // lets the hanging arms show at its sides. A stand-up collar at the neck (no
      // higher than the jaw — slice 3's chibi collar, scaled to a person, was a
      // bell over the head), TRIM strips down the opening, round the collar and the
      // hem. The trim's vertex colour is ×30 of the coat's own: white on any coat
      // that is not black, a light slate on Fury's black one (the second
      // verification pass). **Lane BODIES (D159): it is the YOKE** — 0.16 below
      // the shoulders, to the chest, flaring to 0.165 — and overlaps the top of
      // `coatTails`, whose body link hangs from the lowest spine joint and whose
      // skirt follows the legs, so a pose that bends the chest bends the coat
      // there instead of tilting one shell from the shoulders to the hip. The
      // chibi wears the same coat through a wider anchor.
      // Lane BODIES: open wider at the front (64°, from 40°), worn open, so a
      // resting pose's folded arms show through it.
      // **The third fix pass TAPERS it to the body** (`YOKE_CUT`): D163 flared the
      // yoke to 0.165 at its hem, 5 cm off the chest all round and a ledge over
      // the narrower body link below — the verifier's "stepped ledge at the
      // shoulder" on Doom's cloak, and the Bold Biochemist's lean swinging that
      // flare out as a second cape. Now it narrows from the shoulders to meet the
      // body link it overlaps, and its depth and centre follow the torso's.
      const gap = (64 / 180) * Math.PI;
      const edge = gap / 2;
      const TRIM: RGB = [30, 30, 30];
      const { length: LENGTH, top: TOP, hem: HEM } = YOKE_CUT;
      const lapel = (from: number): THREE.BufferGeometry =>
        tailorYoke(part(new THREE.CylinderGeometry(TOP + 0.003, HEM + 0.003, LENGTH, 1, 1, true, from, 0.12), TRIM, [0, -LENGTH / 2, 0]));
      return mergeParts([
        tailorYoke(part(new THREE.CylinderGeometry(TOP, HEM, LENGTH, 22, 1, true, edge, Math.PI * 2 - gap), WHITE, [0, -LENGTH / 2, 0])),
        lapel(edge),
        lapel(Math.PI * 2 - edge - 0.12),
        // The collar: stands up round the neck, open at the throat.
        part(new THREE.CylinderGeometry(0.085, 0.1, 0.07, 18, 1, true, edge * 1.4, Math.PI * 2 - gap * 1.4), [1.3, 1.3, 1.3], [0, 0.03, -0.005], [0, 0, 0], [1, 1, 0.9]),
        part(new THREE.CylinderGeometry(0.088, 0.086, 0.012, 18, 1, true, edge * 1.4, Math.PI * 2 - gap * 1.4), TRIM, [0, 0.066, -0.005], [0, 0, 0], [1, 1, 0.9]),
      ]);
    }
    case 'coatTails':
    case 'cape': {
      // **Lane BODIES (D159) — one panel of a skirt or a cloak**: an arc of a
      // flared cone centred on +Z, its top at y = 0 and its hem COAT_PANEL.length
      // below. The kit's anchors turn it round the body and hang each one on the
      // bone under it (D162: from the pelvis, following or hanging). A cloak's
      // panel carries a trim at its hem — the villain's gold — and a skirt's does
      // not (the fix pass tried: see `coatPanel`).
      return coatPanel(kind === 'cape');
    }
    case 'eyepatch': {
      // **Slice 4: in UNIT-HEAD space** — the anchor's size is the head's own
      // half-extents (a person's 0.064 × 0.09 × 0.078, the chibi's 0.338 × 0.245 ×
      // 0.27), so one geometry fits both. The kit colour is white and the colours
      // are the vertices' own: a big BLACK patch with a pale rim over HIS left eye
      // (+x), and a black strap round the head that runs DIAGONALLY — low over the
      // patch and up across the forehead on the other side (a level band across
      // both eyes read as sunglasses) — and shows all the way round, from behind too.
      const strap = part(
        new THREE.CylinderGeometry(1.08, 1.08, 0.3, 20, 1, true),
        [0.03, 0.03, 0.04],
        [0, 0.1, 0],
        [0, 0, -0.5],
      );
      // **Lane BODIES, at merge: the band lies ON the head.** A cylinder has one
      // radius and a head narrows toward the crown, so the tilted band's high side
      // stood off the skull (and off Fury's bald crown most of all). Each vertex is
      // pushed along its own ray onto the unit head's sphere, just outside it — the
      // anchor's size is the head's half-extents, so this is the head's own
      // ellipsoid in figure space, whichever head (`PropAnchor.bald`) it is on.
      onHeadSphere(strap, STRAP_RADIUS);
      return mergeParts([
        // No pale rim any more (slice 4): on a proportioned face a ringed disc
        // read as a monocle — the patch is a black oval with a slate edge.
        part(new THREE.CircleGeometry(0.42, 20), [0.015, 0.016, 0.02], [0.4, 0.07, 1.03]),
        part(new THREE.RingGeometry(0.42, 0.49, 22), [0.09, 0.1, 0.12], [0.4, 0.07, 1.025]),
        strap,
      ]);
    }
    case 'visor': {
      // A robot's eye as a band of light round its head at eye height: a short
      // open cylinder of unit radius, scaled to the head by its anchor (a round
      // drone, an ellipse on a humanoid). Hot at its centre line, soft at its edges.
      const ring = part(new THREE.CylinderGeometry(1, 1, 0.3, 36, 2, true), WHITE);
      const pos = ring.getAttribute('position');
      const col = ring.getAttribute('color') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const k = pos.getY(i) === 0 ? 2.2 : 0.7;
        col.setXYZ(i, k, k, k);
      }
      return mergeParts([ring]);
    }
    case 'badge': {
      // A shield-shaped plate: a bright gold rim, a deeper gold field, a dark
      // eagle-roundel in the middle — gold at rest, not white.
      const shield = (k: number): THREE.Shape => {
        const plate = new THREE.Shape();
        plate.moveTo(-0.8 * k, 0.9 * k);
        plate.lineTo(0.8 * k, 0.9 * k);
        plate.lineTo(0.8 * k, 0.0);
        plate.quadraticCurveTo(0.75 * k, -0.7 * k, 0, -1.05 * k);
        plate.quadraticCurveTo(-0.75 * k, -0.7 * k, -0.8 * k, 0.0);
        plate.closePath();
        return plate;
      };
      return mergeParts([
        part(new THREE.ShapeGeometry(shield(1), 6), [1.18, 1.1, 0.95]),
        part(new THREE.ShapeGeometry(shield(0.78), 6), [0.72, 0.62, 0.42], [0, 0, 0.01]),
        part(new THREE.CircleGeometry(0.3, 12), [0.16, 0.18, 0.28], [0, 0.05, 0.02]),
      ]);
    }
    case 'tie': {
      // Figure units × the anchor's size: a white shirt-front V, a dark tie.
      const vee = new THREE.Shape();
      vee.moveTo(-0.34, 0.5);
      vee.lineTo(0.34, 0.5);
      vee.lineTo(0, -0.62);
      vee.closePath();
      const tie = new THREE.Shape();
      tie.moveTo(-0.07, 0.42);
      tie.lineTo(0.07, 0.42);
      tie.lineTo(0.1, -0.5);
      tie.lineTo(0, -0.64);
      tie.lineTo(-0.1, -0.5);
      tie.closePath();
      return mergeParts([
        part(new THREE.ShapeGeometry(vee)),
        part(new THREE.ShapeGeometry(tie), [0.07, 0.08, 0.14], [0, 0, 0.015]),
      ]);
    }
    case 'hat': {
      // A crown and a brim, with a darker band — the brim is the part the table
      // view's steep camera sees, so it is wider than the head.
      return mergeParts([
        part(new THREE.CylinderGeometry(0.6, 0.7, 0.5, 16), WHITE, [0, 0.28, 0]),
        part(new THREE.CylinderGeometry(0.62, 0.62, 0.02, 16, 1, false), WHITE, [0, 0.54, 0]),
        part(new THREE.CylinderGeometry(0.72, 0.72, 0.14, 16, 1, true), [0.42, 0.42, 0.42], [0, 0.1, 0]),
        part(new THREE.CylinderGeometry(1.1, 1.14, 0.06, 20), [0.9, 0.9, 0.9], [0, 0.02, 0]),
      ]);
    }
    case 'muzzle': {
      // A hot core and a soft halo, additive: the lit tip of a drawn pistol.
      return mergeParts([
        part(new THREE.SphereGeometry(1, 10, 6), [1.6, 1.5, 1.3]),
        part(new THREE.SphereGeometry(1.9, 10, 6), [0.36, 0.3, 0.2]),
      ]);
    }
    case 'gauntlets': {
      return mergeParts([
        part(new THREE.SphereGeometry(1, 10, 6), [1.3, 1.3, 1.3]),
        part(new THREE.SphereGeometry(1.55, 10, 6), [0.32, 0.32, 0.32]),
      ]);
    }
    case 'shield': {
      // Concentric red, white, red, a blue centre and a white star.
      return mergeParts([
        part(new THREE.RingGeometry(0.78, 1, 28), RED),
        part(new THREE.RingGeometry(0.56, 0.78, 28), OFF_WHITE, [0, 0, 0.004]),
        part(new THREE.RingGeometry(0.34, 0.56, 28), RED, [0, 0, 0.008]),
        part(new THREE.CircleGeometry(0.34, 20), BLUE, [0, 0, 0.012]),
        part(star(5, 0.3, 0.12), OFF_WHITE, [0, 0, 0.02]),
      ]);
    }
    case 'labBench': {
      // Figure units (size 1): a slab on four legs, a flask and three lit vials.
      // 0.58 wide, so beside a figure it stays inside the figure's own rank slot.
      const leg = (x: number, z: number): THREE.BufferGeometry =>
        part(new THREE.BoxGeometry(0.03, 0.34, 0.03), [0.8, 0.8, 0.8], [x, 0.17, z]);
      return mergeParts([
        part(new THREE.BoxGeometry(0.58, 0.035, 0.26), WHITE, [0, 0.34, 0]),
        leg(0.26, 0.11),
        leg(-0.26, 0.11),
        leg(0.26, -0.11),
        leg(-0.26, -0.11),
        part(new THREE.ConeGeometry(0.075, 0.16, 10), [0.5, 1.7, 0.7], [0.16, 0.438, -0.02]),
        part(new THREE.CylinderGeometry(0.022, 0.022, 0.13, 6), [0.4, 1.6, 1.8], [-0.2, 0.423, 0.04]),
        part(new THREE.CylinderGeometry(0.022, 0.022, 0.13, 6), [1.7, 0.5, 1.6], [-0.13, 0.423, -0.03]),
        part(new THREE.CylinderGeometry(0.022, 0.022, 0.13, 6), [1.6, 1.5, 0.4], [-0.06, 0.423, 0.05]),
      ]);
    }
    case 'swarmBee': {
      // A small striped bee, one unit tall, feet at 0, facing +z, wings out to ±x.
      // Its width over its height is SWARM_BEE_RATIO (the pose's clamp reads it).
      const body = part(new THREE.SphereGeometry(1, 12, 8), WHITE, [0, 0.42, 0], [0, 0, 0], [0.3, 0.26, 0.42]);
      const pos = body.getAttribute('position');
      const col = body.getAttribute('color') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const band = Math.floor((pos.getZ(i) + 0.42) / 0.14) % 2 === 0 ? 1.15 : 0.35;
        col.setXYZ(i, band, band, band);
      }
      const wingLength = SWARM_BEE_RATIO / 2 - 0.04;
      return unitFigure(mergeParts([
        body,
        part(new THREE.SphereGeometry(0.2, 10, 6), [1.1, 1.1, 1.1], [0, 0.5, 0.46]),
        part(blade(wingLength, 0.34), [0.9, 0.9, 0.9], [0.04, 0.66, -0.04], [Math.PI / 2 - 0.3, 0, -Math.PI / 2]),
        part(blade(wingLength, 0.34), [0.9, 0.9, 0.9], [-0.04, 0.66, -0.04], [Math.PI / 2 - 0.3, 0, Math.PI / 2]),
        // Feet-to-top is 1 unit: a stinger below, antennae above.
        part(new THREE.ConeGeometry(0.06, 0.16, 6), [0.6, 0.6, 0.6], [0, 0.08 + 0.08, -0.36], [-2.2, 0, 0]),
        part(new THREE.CylinderGeometry(0.015, 0.015, 0.36, 4), WHITE, [0.07, 0.82, 0.52], [0.5, 0, -0.25]),
        part(new THREE.CylinderGeometry(0.015, 0.015, 0.36, 4), WHITE, [-0.07, 0.82, 0.52], [0.5, 0, 0.25]),
      ]), SWARM_BEE_RATIO);
    }
    case 'carrier': {
      // In units of its own length, centred on its hull, bow at +x: a hull, a
      // flight deck, an island and four rotor pods on outriggers.
      const pod = (x: number, z: number): THREE.BufferGeometry[] => [
        part(new THREE.BoxGeometry(0.035, 0.014, Math.abs(z) - 0.1), [0.8, 0.8, 0.8], [x, 0.0, z / 2 + Math.sign(z) * 0.05]),
        part(new THREE.CylinderGeometry(0.11, 0.11, 0.024, 14, 1, true), [1.25, 1.25, 1.25], [x, 0.0, z]),
        part(new THREE.CircleGeometry(0.104, 14), [0.65, 0.75, 0.85], [x, 0.0, z], [-Math.PI / 2, 0, 0]),
      ];
      const light = (x: number, z: number): THREE.BufferGeometry =>
        part(new THREE.BoxGeometry(0.018, 0.006, 0.018), [2.4, 2.2, 1.6], [x, 0.054, z]);
      const lights: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 7; i++) lights.push(light(-0.42 + i * 0.13, 0.13), light(-0.42 + i * 0.13, -0.05));
      return mergeParts([
        part(new THREE.BoxGeometry(0.84, 0.075, 0.2), WHITE, [-0.05, 0, 0]),
        part(new THREE.CylinderGeometry(0.1, 0.1, 0.075, 3), WHITE, [0.4, 0, 0], [0, Math.PI / 2, 0], [1.5, 1, 1]),
        part(new THREE.BoxGeometry(1.0, 0.012, 0.3), [1.2, 1.2, 1.2], [0.0, 0.045, 0]),
        part(new THREE.BoxGeometry(0.78, 0.004, 0.012), [1.8, 1.8, 1.8], [0.02, 0.053, 0.04]),
        ...lights,
        part(new THREE.BoxGeometry(0.13, 0.1, 0.055), [1.1, 1.1, 1.1], [-0.08, 0.1, -0.12]),
        part(new THREE.BoxGeometry(0.012, 0.08, 0.012), [1.3, 1.3, 1.3], [-0.08, 0.19, -0.12]),
        ...pod(0.3, 0.24),
        ...pod(0.3, -0.24),
        ...pod(-0.34, 0.24),
        ...pod(-0.34, -0.24),
      ]);
    }
    case 'face':
    case 'facePatched':
    case 'faceGrit':
    case 'facePatchedGrit': {
      // **Lane BODIES (D158) — a comic face**, in figure units on the
      // proportioned head's front (HEAD_SHAPE, measured on both bodies): two white
      // eyes with ink pupils, two brows set low at the inner end (a steady look),
      // and a mouth line. Each feature is turned with the face's curve. No texture
      // and no shader of its own: the vertices carry the colours, the kit's is white.
      // `facePatched` leaves out HIS left eye (+x) and keeps its brow: the eyepatch
      // is over it, and an eye under a patch showed from above it.
      const patched = kind === 'facePatched' || kind === 'facePatchedGrit';
      // **Grit (D165)**: the brows pulled down into a V over narrowed eyes, and
      // the mouth a band of set teeth between two ink lines — the comic's
      // gritted jaw — where neutral's is one line. The same triangles' budget.
      const grit = kind === 'faceGrit' || kind === 'facePatchedGrit';
      const { eye, brow, mouth } = HEAD_SHAPE;
      const INK: RGB = [0.03, 0.035, 0.05];
      const EYE: RGB = [1.2, 1.2, 1.15];
      // Tipped up toward the lens: the table view looks down at every face.
      const PITCH = -FACE_PITCH;
      const eyeTall = grit ? 0.0048 : 0.0078;
      const browTilt = grit ? 0.62 : 0.24;
      const browDrop = grit ? -0.0015 : 0.002;
      const parts: THREE.BufferGeometry[] = [];
      for (const side of [1, -1]) {
        const x = side * eye.x * FACE_SCALE;
        const yaw = side * 0.34;
        if (!(patched && side === 1)) {
          parts.push(part(new THREE.CircleGeometry(1, 14), EYE, [x, eye.y, eye.z], [PITCH, yaw, 0], [0.0106 * FACE_SCALE, eyeTall * FACE_SCALE, 1]));
          parts.push(
            part(
              new THREE.CircleGeometry(1, 12),
              INK,
              [x - side * 0.0009, eye.y - 0.0006, eye.z + 0.0014],
              [PITCH, yaw, 0],
              [0.0052 * FACE_SCALE, Math.min(0.006, eyeTall * 0.8) * FACE_SCALE, 1],
            ),
          );
        }
        parts.push(
          part(
            new THREE.BoxGeometry(1, 1, 1),
            INK,
            [x + side * 0.001, brow.y + browDrop, brow.z],
            [PITCH, yaw, side * browTilt],
            [0.022 * FACE_SCALE, (grit ? 0.0065 : 0.0055) * FACE_SCALE, 0.003],
          ),
        );
      }
      if (grit) {
        // Set teeth: a white band, inked above and below, a little wider than a smile.
        const w = 0.028 * FACE_SCALE;
        parts.push(part(new THREE.BoxGeometry(1, 1, 1), EYE, [0, mouth.y, mouth.z], [PITCH, 0, 0], [w, 0.0062 * FACE_SCALE, 0.003]));
        for (const dy of [0.0036, -0.0036]) {
          parts.push(part(new THREE.BoxGeometry(1, 1, 1), INK, [0, mouth.y + dy * FACE_SCALE, mouth.z + 0.0004], [PITCH, 0, 0], [w * 1.04, 0.0022 * FACE_SCALE, 0.003]));
        }
      } else {
        parts.push(part(new THREE.BoxGeometry(1, 1, 1), INK, [0, mouth.y, mouth.z], [PITCH, 0, 0], [0.024 * FACE_SCALE, 0.0042 * FACE_SCALE, 0.003]));
      }
      return mergeParts(parts);
    }
    case 'hairCrop':
      // Close-cropped: a thin cap over the crown and the back, above the ears.
      return hairShell({ front: 56, side: 86, back: 108, scale: 1.035, flare: 0, strands: 0.1 });
    case 'hairBob':
      // A bob: the sides and back to the jaw, a side-swept fringe. **The second fix
      // pass (D165)**: the verifier read Quake's bob "like a helmet … [that] hides
      // her face from above" — a fringe to the brows (63°), sides to 122° and a
      // hem flared 14% out made a dome with a visor. The fringe now stops high on
      // the forehead and sweeps (lower over her right brow than her left), the
      // hairline rises at the temples so the cheeks show from above, the hem
      // flares half as much, and a band of lit locks across the crown (`sheen`)
      // says hair where a smooth dark shell said helmet.
      return hairShell({
        front: 50,
        side: 114,
        back: 126,
        scale: 1.1,
        flare: 0.1,
        sweep: 9,
        tips: { count: 20, length: 14 },
        strands: 0.2,
        sheen: 1.8,
      });
    case 'hairWaves':
      // Swept-back waves with rolls at the nape — what shows under a hat.
      return mergeParts([hairShell({ front: 50, side: 104, back: 114, scale: 1.08, flare: 0.04, strands: 0.25 }), hairRolls()]);
    case 'hairBun':
      // Pulled back into a bun at the crown's back.
      return mergeParts([
        hairShell({ front: 55, side: 92, back: 110, scale: 1.05, flare: 0, strands: 0.22 }),
        part(
          new THREE.SphereGeometry(1, 8, 6),
          [0.9, 0.9, 0.9],
          [HEAD_SHAPE.centre[0], HEAD_SHAPE.centre[1] + 0.035, HEAD_SHAPE.centre[2] - 0.074],
          [0, 0, 0],
          [0.03, 0.028, 0.026],
        ),
      ]);
    case 'hairCowl':
      // Villain identity (D221): a HOOD, not hair — smooth (no strands, no sheen,
      // no tips), from high on the brow round the cheeks to under the jaw, down
      // the nape to the shoulders and flaring out there, so the neck never shows
      // between it and a cloak. Over a `mask` (which tucks under its brow) it is
      // Doom's hood; alone it is a cowl with the face in its opening.
      return mergeParts([
        hairShell({ front: 44, side: 122, back: 168, scale: 1.13, flare: 0.3, strands: 0 }),
        cowlMantle(),
      ]);
    case 'mask':
      return maskGeometry();
    // Baked from the library at load (`bakePose`, `bakeHair`), not built here.
    case 'rider':
    case 'squad':
    case 'hairParted':
    case 'hairLong':
      return null;
  }
}

/**
 * **The cowl's MANTLE** (villain identity, D221): the hood's hem carried down
 * over the neck to the top of the shoulders — an open cone round the neck, in
 * figure units like the hood above it, open at the front (the jaw and a mask's
 * chin show there). The head's ellipsoid stops at the chin, so without it the
 * nape showed as a band of skin between the hood and a cloak (`cape` starts at
 * the shoulders, `CAPE_SHOULDERS`).
 */
function cowlMantle(): THREE.BufferGeometry {
  const [cx, cy, cz] = HEAD_SHAPE.centre;
  const [rx, , rz] = HEAD_SHAPE.radii;
  const top = cy - HEAD_SHAPE.radii[1] * 0.72;
  const bottom = 0.765;
  const open = 1.9;
  const mantle = part(
    new THREE.CylinderGeometry(1, 1.55, 1, 18, 1, true, open / 2, Math.PI * 2 - open),
    [0.8, 0.8, 0.8],
    [cx, (top + bottom) / 2, cz - 0.006],
    [0, Math.PI, 0],
    [rx * 1.05, top - bottom, rz * 1.02],
  );
  return mantle;
}

/**
 * **Villain identity (D221) — the mask's surface**, in UNIT-HEAD space (the
 * anchor's size is the head's half-extents, `figures/props.ts`'s `mask`): just
 * outside the skull at its rim, where it meets the `crop` hairstyle's shell (1.035)
 * from under it, and standing proud of the face at the front, where the nose (the
 * face's front is 1.17 of the head's depth) would otherwise come through it.
 */
function maskRadius(z: number): number {
  return MASK_RIM + MASK_BULGE * Math.max(0, z) ** 4;
}
const MASK_RIM = 1.02;
const MASK_BULGE = 0.22;
/**
 * Where the plate stops, degrees off the crown: the `cowl`'s brow (44°) and a
 * little under it — front, side and back as `hairShell` reads them — so a cowl
 * over the mask covers its edge (the plate's rim is 1.02 of the head, the cowl
 * 1.13) and a bald wearer shows skin above it, as a mask on a bare head would.
 */
const MASK_HAIRLINE = { front: 40, side: 80, back: 100, tuck: 0 } as const;

/**
 * The mask: a faceplate over the front of the head from under the hairline to
 * under the chin, round to just behind the ears — the unit sphere's triangles in
 * that band, pushed out to {@link maskRadius} — and its features laid ON it: two
 * dark eye slits slanting down toward the nose, a shadowed brow, a pale nose
 * ridge and a dark mouth grille with three bars. The plate is white (× the
 * figure's tint), a little darker toward its rim so the comic bands have a form
 * to follow. ~260 triangles.
 */
function maskGeometry(): THREE.BufferGeometry {
  const sphere = new THREE.SphereGeometry(1, 24, 14);
  const flat = sphere.toNonIndexed();
  sphere.dispose();
  const src = flat.getAttribute('position');
  const positions: number[] = [];
  const normals: number[] = [];
  const colours: number[] = [];
  const { front, side, back, tuck } = MASK_HAIRLINE;
  const limit = (phi: number): number => {
    const c = Math.cos(phi);
    return (c >= 0 ? side + (front - side) * c : side + (back - side) * -c) - tuck;
  };
  for (let t = 0; t + 2 < src.count; t += 3) {
    let mx = 0;
    let my = 0;
    let mz = 0;
    for (let k = 0; k < 3; k++) {
      mx += src.getX(t + k);
      my += src.getY(t + k);
      mz += src.getZ(t + k);
    }
    const len = Math.hypot(mx, my, mz) || 1;
    const phi = Math.atan2(mx, mz);
    const theta = (Math.acos(Math.max(-1, Math.min(1, my / len))) * 180) / Math.PI;
    // Front and sides only (to just behind the ears), from the hairline to under the chin.
    if (Math.cos(phi) < -0.25 || theta < limit(phi) || theta > 150) continue;
    for (let k = 0; k < 3; k++) {
      const x = src.getX(t + k);
      const y = src.getY(t + k);
      const z = src.getZ(t + k);
      const r = maskRadius(z);
      positions.push(x * r, y * r, z * r);
      normals.push(x, y, z);
      const shade = 0.84 + 0.2 * Math.max(0, z);
      colours.push(shade, shade, shade);
    }
  }
  flat.dispose();
  const plate = new THREE.BufferGeometry();
  plate.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  plate.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
  plate.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colours), 3));
  const INK: RGB = [0.03, 0.035, 0.05];
  // A feature: a flat patch at z = 1, pushed along its rays onto the plate, `lift` proud of it.
  const feature = (w: number, h: number, colour: RGB, at: readonly [number, number], tilt: number, lift: number): THREE.BufferGeometry => {
    const patch = part(new THREE.PlaneGeometry(w, h, 2, 1), colour, [at[0], at[1], 1], [0, 0, tilt]);
    const position = patch.getAttribute('position');
    const normal = patch.getAttribute('normal');
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      const l = Math.hypot(x, y, z) || 1;
      const r = maskRadius(z / l) + lift;
      position.setXYZ(i, (x / l) * r, (y / l) * r, (z / l) * r);
      normal.setXYZ(i, x / l, y / l, z / l);
    }
    return patch;
  };
  return mergeParts([
    plate,
    // The brow's shadow, then the eye slits under it, slanting down toward the nose.
    feature(0.92, 0.08, [0.6, 0.6, 0.62], [0, 0.27], 0, 0.006),
    feature(0.34, 0.12, INK, [0.36, 0.09], -0.22, 0.012),
    feature(0.34, 0.12, INK, [-0.36, 0.09], 0.22, 0.012),
    // The nose ridge, lighter than the plate.
    feature(0.1, 0.42, [1.2, 1.2, 1.2], [0, -0.14], 0, 0.008),
    // The grille: a dark slot, and three bars across it.
    feature(0.52, 0.16, INK, [0, -0.5], 0, 0.01),
    feature(0.05, 0.18, [1.1, 1.1, 1.1], [-0.13, -0.5], 0, 0.016),
    feature(0.05, 0.18, [1.1, 1.1, 1.1], [0, -0.5], 0, 0.016),
    feature(0.05, 0.18, [1.1, 1.1, 1.1], [0.13, -0.5], 0, 0.016),
  ]);
}

/** How far outside the unit head the eyepatch's strap lies: a strap's thickness. */
const STRAP_RADIUS = 1.035;

/**
 * Push every vertex of `geometry` along its own ray from the origin to `radius`,
 * with the ray as its normal: a band drawn round the unit head then lies on the
 * head's surface (the anchor's size turns the unit sphere into the head's own
 * ellipsoid). Commit-time geometry, built once per kind.
 */
function onHeadSphere(geometry: THREE.BufferGeometry, radius: number): void {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const length = Math.hypot(x, y, z) || 1;
    position.setXYZ(i, (x / length) * radius, (y / length) * radius, (z / length) * radius);
    normal.setXYZ(i, x / length, y / length, z / length);
  }
  position.needsUpdate = true;
  normal.needsUpdate = true;
}

/**
 * **The face's size for the table view** (D158): the features at comic scale —
 * eyes a third of the face wide — and tipped this far (radians) up toward a lens
 * that looks down at every figure. `traits.test.ts` measures what they reach.
 */
const FACE_SCALE = 1.15;
const FACE_PITCH = 0.3;

/**
 * One skirt or cloak panel at size 1 (`figures/props.ts`'s `COAT_PANEL`): 6 × 1
 * segments, 12 triangles — a long coat's body and skirt is fourteen of them, and
 * both duelists wear one (lined, D163), so at `g1`@316 a panel is paid for about
 * thirty times. A cone's side is straight from top to hem, so a second ring of
 * segments down its length (the 6 × 2 of D162) bought no shape — only the shading
 * gradient, which one segment interpolates the same.
 */
function coatPanel(trim: boolean): THREE.BufferGeometry {
  const { top, hem, length, arc } = COAT_PANEL;
  const a = (arc / 180) * Math.PI;
  const cloth = part(new THREE.CylinderGeometry(top, hem, length, 6, 1, true, -a / 2, a), WHITE, [0, -length / 2, 0]);
  // A little darker toward the waist, where the coat's own hem overlaps it.
  const pos = cloth.getAttribute('position');
  const col = cloth.getAttribute('color') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const k = 0.82 + 0.18 * Math.min(1, -pos.getY(i) / length);
    col.setXYZ(i, k, k, k);
  }
  // No hem trim on a SKIRT: its panels are links of a chain, and a trim at every
  // link's hem draws a stripe across the knee. The fix pass tried tucking every
  // hem but the last under the link below it (`HANG_FROM`) and a smaller body
  // link: from the table view the upper links' bands still showed as rings round
  // the coat — blown white on the Biochemist's (var/bodies/fix1/coat-v3/). The ink
  // line and the costume carry the edge; a hem trim on the chain's LAST links is
  // PLAN.md's lane BODIES follow-up 14. A CLOAK's trim (×30, the coat's lapel
  // rule: the duelist's baker reads it as the look's trim slot, gold) is a strip
  // just outside the hem; its shoulder panels hang inside its hip panels, so only
  // the cloak's own hem shows one (figures/props.ts's cape anchors).
  if (!trim) return mergeParts([cloth]);
  const band = part(
    new THREE.CylinderGeometry(hem + 0.003, hem + 0.003, 0.03, 6, 1, true, -a / 2, a),
    [30, 30, 30],
    [0, -length + 0.015, 0],
  );
  return mergeParts([cloth, band]);
}

/** The hair highlight's hue, per channel (the third fix pass): cooler than the hair it lights. */
const SHEEN_COOL: RGB = [0.8, 1, 1.6];

/**
 * **A procedural hairstyle** (lane BODIES, D157): a shell round the measured head
 * (HEAD_SHAPE), `scale` × its radii, kept above a HAIRLINE that runs from `front`
 * (degrees from the crown, over the forehead) through `side` (over the ears) to
 * `back` (the nape), and pushed out by `flare` toward its lower edge. The normals
 * are the ellipsoid's, so the shading is smooth; the vertices are a little darker
 * underneath, for volume.
 */
function hairShell(style: {
  front: number;
  side: number;
  back: number;
  scale: number;
  flare: number;
  /**
   * Strand TIPS round the hem — a comic artist's zig-zag of hair ends, so a bob
   * reads as hair and not as a helmet (the resumed pass's judgement from the
   * workshop's close framing). `count` tips spaced round the head, `length`
   * degrees below the hairline at the back and shorter toward the temples, and
   * none over the forehead: the table view looks DOWN at every face, and a
   * fringe of tips hid Quake's eyes from it (the face raster in traits.test.ts
   * fell from 5 px to 3). One triangle a tip.
   */
  tips?: { count: number; length: number };
  /** How much darker every other lock is at the hem (0 = a smooth shell). */
  strands?: number;
  /**
   * **A comic hair highlight** (D165): every other lock LIGHTER by up to this
   * much (× the hair colour) in a band across the crown — the lit streaks an
   * inker leaves white on black hair. A vertex colour over 1 lifts the costume's
   * hair slot there, as the coat's trim does (×30) at a larger scale.
   */
  sheen?: number;
  /**
   * **A side-swept fringe** (D165), degrees: the front hairline lower over the
   * figure's right brow (−x) and higher over its left by this much, so a fringe
   * has a part and a direction rather than the straight brim of a helmet.
   */
  sweep?: number;
}): THREE.BufferGeometry {
  // 24 × 14: ~270–520 triangles a style — report 15 §9.3's 200–600 an instance,
  // measured by traits.test.ts (a first cut at 40 × 28 was 1,000–1,400 each and
  // put g1@355 over the 30,000 line).
  const sphere = new THREE.SphereGeometry(1, 24, 14);
  const flat = sphere.toNonIndexed();
  sphere.dispose();
  const src = flat.getAttribute('position');
  const positions: number[] = [];
  const normals: number[] = [];
  const colours: number[] = [];
  const [cx, cy, cz] = HEAD_SHAPE.centre;
  const [rx, ry, rz] = HEAD_SHAPE.radii;
  const limit = (phi: number): number => {
    const c = Math.cos(phi);
    // The sweep: +x is the figure's left, so sin(phi) > 0 raises the fringe there.
    const front = style.front - (style.sweep ?? 0) * Math.sin(phi);
    return c >= 0 ? style.side + (front - style.side) * c : style.side + (style.back - style.side) * -c;
  };
  const degrees = (y: number): number => (Math.acos(Math.max(-1, Math.min(1, y))) * 180) / Math.PI;
  for (let t = 0; t + 2 < src.count; t += 3) {
    let mx = 0;
    let my = 0;
    let mz = 0;
    for (let k = 0; k < 3; k++) {
      mx += src.getX(t + k);
      my += src.getY(t + k);
      mz += src.getZ(t + k);
    }
    const len = Math.hypot(mx, my, mz) || 1;
    if (degrees(my / len) > limit(Math.atan2(mx, mz))) continue;
    for (let k = 0; k < 3; k++) {
      const x = src.getX(t + k);
      const y = src.getY(t + k);
      const z = src.getZ(t + k);
      const theta = degrees(y);
      const r = style.scale + style.flare * Math.max(0, theta - 80) / 45;
      positions.push(cx + rx * x * r, cy + ry * y * r, cz + rz * z * r);
      const nx = x / rx;
      const ny = y / ry;
      const nz = z / rz;
      const nl = Math.hypot(nx, ny, nz) || 1;
      normals.push(nx / nl, ny / nl, nz / nl);
      // Strands (the fix pass: a smooth shell read as a helmet in comic): every
      // other meridian a little darker, deepening toward the hem, so the cel
      // bands break into combed locks radiating from the crown. The sphere's 24
      // meridians sit at 15° steps, so cos(12·azimuth) alternates ±1 exactly.
      const lock = Math.cos(12 * Math.atan2(x, z));
      const strand = (style.strands ?? 0) * (0.5 + 0.5 * Math.min(1, theta / 90)) * lock;
      // The sheen: the OTHER locks, lit in a band from 25° to 75° off the crown.
      const band = Math.max(0, 1 - Math.abs(theta - 50) / 25);
      // The third fix pass: the lit locks are COOL — an inker's blue-white on
      // black hair — so Quake's bob can be the near-black her painting draws and
      // still show its locks (a grey lift on near-black stayed near-black).
      const glint = (style.sheen ?? 0) * band * Math.max(0, -lock);
      const shade = (0.74 + 0.32 * ((y + 1) / 2)) * (1 - Math.max(0, strand));
      colours.push(shade * (1 + glint * SHEEN_COOL[0]), shade * (1 + glint * SHEEN_COOL[1]), shade * (1 + glint * SHEEN_COOL[2]));
    }
  }
  flat.dispose();
  if (style.tips !== undefined) {
    // Each tip hangs from a few degrees ABOVE the hairline (so it overlaps the
    // shell's stepped lower edge rather than floating under it) to `length`
    // below it, its base the full spacing wide so the tips meet in a zig-zag.
    const { count, length } = style.tips;
    const push = (phiDeg: number, thetaDeg: number, out: number, shade: number): void => {
      const phi = (phiDeg * Math.PI) / 180;
      const theta = (thetaDeg * Math.PI) / 180;
      const x = Math.sin(theta) * Math.sin(phi);
      const y = Math.cos(theta);
      const z = Math.sin(theta) * Math.cos(phi);
      const r = style.scale + style.flare * Math.max(0, thetaDeg - 80) / 45 + out;
      positions.push(cx + rx * x * r, cy + ry * y * r, cz + rz * z * r);
      const nx = x / rx;
      const ny = y / ry;
      const nz = z / rz;
      const nl = Math.hypot(nx, ny, nz) || 1;
      normals.push(nx / nl, ny / nl, nz / nl);
      colours.push(shade, shade, shade);
    };
    const step = 360 / count;
    for (let i = 0; i < count; i++) {
      const mid = i * step;
      const a = mid - step / 2;
      const b = mid + step / 2;
      const phi = (mid * Math.PI) / 180;
      // No tip over the forehead: the table view looks DOWN at every face, and
      // even a short fringe of tips took a pixel of Quake's five (the face
      // raster in traits.test.ts).
      if (Math.cos(phi) > 0.8) continue;
      const hem = limit(phi);
      const drop = length * (0.3 + 0.7 * (1 - Math.max(0, Math.cos(phi))));
      push(a, limit((a * Math.PI) / 180) - 6, 0, 0.8);
      push(b, limit((b * Math.PI) / 180) - 6, 0, 0.8);
      push(mid, hem + drop, 0.03, 0.7);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  out.computeBoundingSphere();
  return out;
}

/** Waves' rolls: a half-ring round the back of the head at the nape, ear to ear. */
function hairRolls(): THREE.BufferGeometry {
  const [cx, cy, cz] = HEAD_SHAPE.centre;
  const ring = new THREE.TorusGeometry(1, 0.2, 6, 14, Math.PI * 1.15);
  // Lie it flat, its arc round the BACK (−Z), ends at the ears.
  return part(ring, [0.86, 0.86, 0.86], [cx, cy - 0.052, cz - 0.006], [-Math.PI / 2, 0, -0.075 * Math.PI], [0.069, 0.074, 0.06]);
}

// ---------------------------------------------------------------------------
// Baking a body into a static pose (the rider, the squad's followers)
// ---------------------------------------------------------------------------

/**
 * **Each costume slot's shade on a baked body** (slice 4), in `COSTUME_SLOTS`
 * order: skin, hair, top, shirt, legs, shoes, gloves, belt. A baked body is one
 * instanced kind for every card that bakes it, so it cannot carry a card's
 * palette — it carries these multipliers of its instance colour instead.
 */
const SLOT_SHADE: readonly number[] = [1.35, 0.42, 1, 1.75, 0.72, 0.32, 1.35, 0.5];

/**
 * **A skinned body frozen in one frame of one clip, as a static geometry** in
 * figure space (one unit tall, feet at 0, facing +z) — so a follower or a rider
 * costs an instance of one draw call rather than a rig of its own.
 *
 * The clip is SAMPLED by hand (each track's own interpolant at one time) rather
 * than played through a mixer: this runs once per model at load, and the arena's
 * mixers are ticked in exactly two files (liveness).
 */
export function bakePose(model: LoadedModel, clipKey: string, phase: number): THREE.BufferGeometry | null {
  const instance = posedInstance(model, clipKey, phase);
  const parts: THREE.BufferGeometry[] = [];
  const v = new THREE.Vector3();
  instance.object.traverse((child) => {
    const mesh = child as THREE.SkinnedMesh;
    if (mesh.isSkinnedMesh !== true) return;
    const source = mesh.geometry;
    const count = source.getAttribute('position').count;
    const position = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      mesh.getVertexPosition(i, v);
      v.applyMatrix4(mesh.matrixWorld);
      position[i * 3] = v.x;
      position[i * 3 + 1] = v.y;
      position[i * 3 + 2] = v.z;
    }
    const baked = new THREE.BufferGeometry();
    baked.setAttribute('position', new THREE.BufferAttribute(position, 3));
    const region = source.getAttribute(COSTUME_ATTRIBUTE);
    if (region !== undefined) {
      // Read, not `clone()`d: the file's attributes are interleaved (meshopt), and
      // three warns on every clone of one.
      const slots = new Float32Array(count);
      for (let i = 0; i < count; i++) slots[i] = region.getX(i);
      baked.setAttribute(COSTUME_ATTRIBUTE, new THREE.BufferAttribute(slots, 1));
    }
    if (source.index !== null) baked.setIndex(source.index.clone());
    baked.computeVertexNormals();
    const flat = part(baked);
    // Slice 4: a baked body wears its costume as SHADE — the instance colour is
    // the costume's top (a squad's suit), and each slot is lighter or darker than
    // it, so a follower has a white shirt-front, dark shoes and a face.
    const slots = flat.getAttribute(COSTUME_ATTRIBUTE);
    if (slots !== undefined) {
      const colour = flat.getAttribute('color') as THREE.BufferAttribute;
      for (let i = 0; i < colour.count; i++) {
        const k = SLOT_SHADE[Math.round(slots.getX(i))] ?? 1;
        colour.setXYZ(i, k, k, k);
      }
      flat.deleteAttribute(COSTUME_ATTRIBUTE);
    }
    parts.push(flat);
  });
  instance.mixer.stopAllAction();
  return parts.length === 0 ? null : mergeParts(parts);
}

/**
 * **Lane BODIES (D157) — a body's own hairstyle as a static kind**, in figure
 * space at the body's BIND pose (so the prop field's `Head` anchor, written at
 * the origin, puts it back exactly where the pack's artist put it): the triangles
 * `scene/models.ts` carved off the body (`LoadedModel.hairIndex`), with smooth
 * normals and a white vertex colour — the kit's colour is the costume's hair.
 */
export function bakeHair(model: LoadedModel): THREE.BufferGeometry | null {
  const index = model.hairIndex ?? null;
  if (index === null || index.length === 0) return null;
  const instance = instantiateFigure(model, { pose: 'bind' });
  instance.object.updateMatrixWorld(true);
  let out: THREE.BufferGeometry | null = null;
  const v = new THREE.Vector3();
  instance.object.traverse((child) => {
    const mesh = child as THREE.SkinnedMesh;
    if (out !== null || mesh.isSkinnedMesh !== true || mesh.geometry.getAttribute(COSTUME_ATTRIBUTE) === undefined) return;
    const remap = new Map<number, number>();
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i < index.length; i++) {
      const source = index[i]!;
      let mapped = remap.get(source);
      if (mapped === undefined) {
        mapped = remap.size;
        remap.set(source, mapped);
        mesh.getVertexPosition(source, v);
        v.applyMatrix4(mesh.matrixWorld);
        positions.push(v.x, v.y, v.z);
      }
      indices.push(mapped);
    }
    const hair = new THREE.BufferGeometry();
    hair.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    hair.setIndex(indices);
    hair.computeVertexNormals();
    out = mergeParts([part(hair, [0.95, 0.95, 0.95])]);
  });
  instance.mixer.stopAllAction();
  return out;
}

/**
 * A fresh instance of `model` held in one frame of one of its clips (`idle` if
 * it has no such clip), its world matrices up to date. The clip is SAMPLED by hand
 * — each track's own interpolant at one time — not played through a mixer: this
 * runs at load and at commit, and the arena's mixers are ticked in exactly two
 * files (liveness).
 */
function posedInstance(model: LoadedModel, clipKey: string, phase: number): ReturnType<typeof instantiateFigure> {
  const instance = instantiateFigure(model, { pose: 'bind' });
  const clip = model.clips.get(clipKey) ?? model.clips.get('idle') ?? null;
  if (clip !== null) sampleClipInto(instance.object, clip, Math.max(0, Math.min(1, phase)) * clip.duration);
  instance.object.updateMatrixWorld(true);
  return instance;
}

/** Every joint of an instance: its world matrix in figure space, inverted, by base name. */
function jointInverses(object: THREE.Object3D): JointBinds {
  const out: JointBinds = new Map();
  object.traverse((child) => {
    if ((child as THREE.Bone).isBone !== true) return;
    out.set(baseName(child.name), child.matrixWorld.clone().invert());
  });
  return out;
}

// ---------------------------------------------------------------------------
// The field
// ---------------------------------------------------------------------------

/** One kind's instanced mesh and its per-instance opacity. */
interface KindMesh {
  kind: SceneKind;
  mesh: THREE.InstancedMesh;
  opacity: THREE.InstancedBufferAttribute;
  material: PropMaterial;
  /** Instances written this frame. */
  count: number;
}

const MODE_JOINT = 0;
const MODE_ROOT = 1;
const MODE_STAND = 2;
/** A departing body's non-joint prop: its root's world matrix × the anchor (D64's body stands still). */
const MODE_BODY = 3;

/**
 * One instance of one kind, bound at commit. Every field the frame loop reads is
 * here, preallocated, so `bind` walks an array and allocates nothing.
 */
interface Binding {
  mode: number;
  target: KindMesh | null;
  pose: FigurePose | null;
  rig: PropBody | null;
  joint: THREE.Object3D | null;
  /** Joint mode: the joint's bind inverse × the anchor. Root/stand: the anchor, in figure space. */
  local: THREE.Matrix4;
  colour: THREE.Color;
  /** A swarm member (ring) — `null` for everything else. */
  member: SwarmMember | null;
  /** The pose's scale term: its height, or a carrier's length. */
  scaleByWidth: boolean;
  glowRest: number;
  glowBoost: number;
  flutter: boolean;
  flame: boolean;
  phase: number;
  /** Rides a DEPARTING body: drawn only while that body is (its `root.visible`). */
  departed: boolean;
  /**
   * **D162 — the second joint a panel follows part-way** (`PropAnchor.follow`):
   * its bind inverse × the anchor, and how far toward it (0 = `joint` alone).
   */
  jointB: THREE.Object3D | null;
  localB: THREE.Matrix4;
  weight: number;
  /** **D162 — the panel this one HANGS from** (`PropAnchor.hang`), bound just before it. */
  parent: Binding | null;
  hang: number;
  /** A hanging panel's anchor in figure space: its upright, turned and sized. */
  upright: THREE.Matrix4;
  /** This binding's world matrix as drawn this frame — what a panel hanging from it reads. */
  world: THREE.Matrix4;
}

function blankBinding(): Binding {
  return {
    mode: MODE_ROOT,
    target: null,
    pose: null,
    rig: null,
    joint: null,
    jointB: null,
    localB: new THREE.Matrix4(),
    weight: 0,
    parent: null,
    hang: 0,
    upright: new THREE.Matrix4(),
    world: new THREE.Matrix4(),
    local: new THREE.Matrix4(),
    colour: new THREE.Color(),
    member: null,
    scaleByWidth: false,
    glowRest: 0,
    glowBoost: 0,
    flutter: false,
    flame: false,
    phase: 0,
    departed: false,
  };
}

/** Per model: joint base name → the joint's bind matrix in figure space, inverted. */
type JointBinds = Map<string, THREE.Matrix4>;

/*
 * `baseName` — `head_1` → `head`: GLTFLoader suffixes a repeated node name with
 * `_<n>`, n from 1. **Slice 4: only a suffix with no leading zero** — the
 * proportioned bodies' own joints end in digits (`spine_03`, `neck_01`), and slice
 * 3's `/_\d+$/` turned all three spine joints into one `spine`. `spine_03_1` →
 * `spine_03`, and `spine_03` stays itself. Lane BODIES moved it to `models.ts`
 * (the rest-pose derivation reads joints by it at load) and re-exports it here.
 */

/** §9.2 rule 6 — the frame loop's scratch, at module scope. */
const ROOT = new THREE.Matrix4();
const WORLD = new THREE.Matrix4();
const MEMBER = new THREE.Matrix4();
const WAVE = new THREE.Matrix4();
const POS = new THREE.Vector3();
const QUAT = new THREE.Quaternion();
const SCL = new THREE.Vector3();
const COLOUR = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);
/** D162's scratch: the two skinnings of a followed panel, or a hanging one's parent and upright. */
const BLEND = new THREE.Matrix4();
const POS_B = new THREE.Vector3();
const QUAT_B = new THREE.Quaternion();
const SCL_B = new THREE.Vector3();

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

export class PropField {
  readonly group = new THREE.Group();
  private readonly kinds = new Map<string, KindMesh>();
  /** Fixed for the life of the field: the frame loop walks it by index. */
  private readonly list: KindMesh[] = [];
  private readonly bindings: Binding[] = [];
  private bound = 0;
  /** The rig roots a joint prop reads this frame — refreshed once each before reading. */
  private readonly roots: THREE.Object3D[] = [];
  private rootCount = 0;
  private readonly binds = new Map<string, JointBinds>();
  /**
   * Slice 4: per model and pose (`id|clip|phase`), each joint's matrix in THAT
   * pose, inverted — for an anchor written in a pose rather than at bind
   * (`PropAnchor.pose`: the pistol in Agent 13's aim). Built at commit, once.
   */
  private readonly posed = new Map<string, JointBinds>();
  private readonly jointsOf = new WeakMap<THREE.Object3D, Map<string, THREE.Object3D>>();
  private library: ModelLibrary | null = null;
  private clock = 0;
  private last = -1;
  /**
   * 0 under `prefers-reduced-motion: reduce`, else 1 — and it FOLLOWS the setting:
   * slice 3 read the query once at construction, so a user who turned reduced
   * motion on mid-game kept the flutter and the ring's turn (the verification
   * pass). The frame loop reads the number; the listener writes it.
   */
  private motion = 1;
  private motionQuery: MediaQueryList | null = null;
  private readonly onMotion = (): void => {
    this.motion = this.motionQuery?.matches === true ? 0 : 1;
  };
  private drawnLast = 0;
  /** The look, written at commit by `FigureLayer` (`setLook`); a kind built later takes it too. */
  private look: MaterialLook = { look: 0, halftone: 0, keyWorld: 0 };

  constructor() {
    this.group.name = 'props';
    for (let i = 0; i < MAX_BINDINGS; i++) this.bindings.push(blankBinding());
    this.ensure();
  }

  /** Subscribe to the reduced-motion setting (once; again after a {@link dispose}). */
  private watchMotion(): void {
    if (this.motionQuery !== null) return;
    try {
      if (typeof matchMedia !== 'function') return;
      const query = matchMedia(REDUCED_MOTION);
      this.motionQuery = query;
      this.motion = query.matches ? 0 : 1;
      query.addEventListener('change', this.onMotion);
    } catch {
      this.motionQuery = null;
      this.motion = 1;
    }
  }

  private unwatchMotion(): void {
    try {
      this.motionQuery?.removeEventListener('change', this.onMotion);
    } catch {
      // A query that cannot be unsubscribed is one nobody is listening through.
    }
    this.motionQuery = null;
  }

  /** Is the field following reduced motion right now — for `web/test/traits.test.ts`. */
  reducedMotion(): boolean {
    return this.motion === 0;
  }

  /**
   * Build the procedural kinds if they are not built — at construction, and
   * again after a {@link dispose} (an unmount and remount of the layer, as React's
   * StrictMode rehearses one, hands the same field back to the disc field).
   */
  private ensure(): void {
    this.watchMotion();
    if (this.list.length > 0) return;
    for (const kind of SCENE_KINDS) {
      // Drawn DoubleSide (`makePropMaterial`): a cloth kind needs no lining here.
      const geometry = buildKindGeometry(kind, { lining: false });
      if (geometry !== null) this.addKind(kind, kind, geometry);
    }
  }

  private addKind(key: string, kind: SceneKind, geometry: THREE.BufferGeometry): KindMesh {
    const opacity = new THREE.InstancedBufferAttribute(new Float32Array(PROP_CAPACITY), 1);
    opacity.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aOpacity', opacity);
    const material = makePropMaterial(LOOKS[kind], PROP_KIT[kind].blend === 'additive');
    const mesh = new THREE.InstancedMesh(geometry, material, PROP_CAPACITY);
    mesh.name = `props:${key}`;
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.visible = false;
    mesh.renderOrder = PROP_ORDER;
    // §3.10 rule 2 — a prop is never a click target; `HitProxy` is.
    mesh.raycast = () => {};
    // Allocated now so the program is the instanced-colour variant from its first
    // compile, and so the frame loop never allocates it.
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PROP_CAPACITY * 3), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const entry: KindMesh = { kind, mesh, opacity, material, count: 0 };
    applyPropLook(material, this.look);
    this.kinds.set(key, entry);
    this.list.push(entry);
    this.group.add(mesh);
    return entry;
  }

  /**
   * **The look, at COMMIT** (`FigureLayer`'s layout effect — never the frame
   * loop): every kind's material takes it through `propMaterial.ts`'s
   * `applyPropLook`, which knows which kinds are paint and which are lights.
   */
  setLook(look: MaterialLook): void {
    this.look = look;
    for (let i = 0; i < this.list.length; i++) applyPropLook(this.list[i]!.material, look);
  }

  /**
   * **Load time, once per library**: each model's joints' bind matrices (so a
   * joint prop can be re-expressed in its joint's frame), and the two BAKED kinds
   * — the rider (the hero body crouching) and a squad follower per humanoid body.
   */
  setLibrary(library: ModelLibrary, models: ModelData): void {
    this.ensure();
    if (this.library === library) return;
    this.library = library;
    this.posed.clear();
    for (const [id, model] of library) {
      // Lane BODIES: a resting-pose variant (`agent@folded`) shares its body's
      // bind pose and joints; the base answers for it (`baseModelOf`).
      if (restOfModel(id) !== null) continue;
      // The BIND pose: every anchor in figures/props.ts is written in it.
      const instance = instantiateFigure(model, { pose: 'bind' });
      instance.object.updateMatrixWorld(true);
      this.binds.set(id, jointInverses(instance.object));
      instance.mixer.stopAllAction();
      const family = familyOf(id, models);
      if ((family === 'humanoid' || family === 'human') && !this.kinds.has(`squad:${id}`)) {
        const follower = bakePose(model, 'idle', 0);
        if (follower !== null) this.addKind(`squad:${id}`, 'squad', follower);
      }
    }
    // Lane BODIES (D157): the two hairstyles the library's bodies came with,
    // carved off them at load (`scene/models.ts`) and baked here into kinds.
    for (const [style, bodyId] of Object.entries(CARVED_HAIR) as Array<[HairStyle, string]>) {
      if (style === 'none') continue;
      const kind = HAIR_KIND[style];
      const model = library.get(bodyId);
      if (model === undefined || this.kinds.has(kind)) continue;
      const hair = bakeHair(model);
      if (hair !== null) this.addKind(kind, kind, hair);
    }
    const hero = library.get('hero');
    if (hero !== undefined && !this.kinds.has('rider')) {
      // Slice 4: the proportioned body HUNCHED (the `shrink` clip, the library's
      // crouch) — its `crouch` is an upright kneel now, which stood a rider up tall
      // on the ant's back.
      const rider = bakePose(hero, 'shrink', 0.5);
      if (rider !== null) this.addKind('rider', 'rider', rider);
    }
  }

  /**
   * **Commit time** (FigureLayer's layout effect, once per snapshot — never the
   * frame loop): turn this frame's poses into bindings. A joint prop needs its
   * figure's rig (a figure with no model has none, so only its `stand` and `root`
   * props draw); every other kind is placed from the pose alone.
   *
   * `departed` are the bodies of the creatures dying in this snapshot (D64's
   * `DepartureField`): a dying figure KEEPS its props — the Doombot falls with its
   * eye and thrusters — riding the body's own joints and fading with it, and drawn
   * only on the frames the body is (slice 3 dropped them the frame the creature
   * left the snapshot: the verification pass).
   */
  commit(poses: FigureLayout, rigs: FigureRigMap, models: ModelData, departed: readonly PropBody[] = NO_BODIES): void {
    this.ensure();
    let n = 0;
    this.rootCount = 0;
    for (const pose of poses.values()) {
      if (pose.anonymous || pose.props.length === 0) continue;
      const rig = rigs.get(pose.cardId) ?? null;
      const liveRig = rig !== null && rig.pose.modelId === pose.modelId ? rig : null;
      n = this.bindPose(n, pose, liveRig, false, models);
    }
    for (const body of departed) {
      const pose = body.pose;
      if (pose.anonymous || pose.props.length === 0 || poses.has(pose.cardId)) continue;
      n = this.bindPose(n, pose, body, true, models);
    }
    for (let i = n; i < this.bound; i++) this.clear(this.bindings[i]!);
    this.bound = n;
  }

  /** One pose's props → bindings from `n`; returns the next free index. Commit time only. */
  private bindPose(n: number, pose: FigurePose, body: PropBody | null, departed: boolean, models: ModelData): number {
    const family = familyOf(pose.modelId, models);
    // A departing body's non-joint props ride its root: it stands where it fell.
    const rootMode = departed ? MODE_BODY : MODE_ROOT;
    for (const prop of pose.props) {
      if (n >= MAX_BINDINGS) break;
      if (prop.kind === 'swarmBee' || prop.kind === 'squad') {
        // A ring swarm has no body to die (FigureLayer skips it); a squad's
        // followers fall in with their leader.
        if (departed && prop.kind === 'swarmBee') continue;
        const key = prop.kind === 'squad' ? `squad:${baseModelOf(pose.modelId) ?? ''}` : 'swarmBee';
        const target = this.kinds.get(key) ?? null;
        if (target === null) continue;
        const formation = prop.kind === 'squad' ? 'squad' : 'ring';
        for (const member of swarmMembers(pose.swarm, formation)) {
          if (n >= MAX_BINDINGS) break;
          const b = this.bindings[n]!;
          this.reset(b, rootMode, target, pose, prop.colour);
          b.member = formation === 'ring' ? member : null;
          b.phase = member.phase;
          b.local.compose(P.set(member.x, member.y, member.z), Q.identity(), S.setScalar(member.size));
          this.ride(b, body, departed);
          n += 1;
        }
        continue;
      }
      if (prop.kind === 'carrier') {
        if (departed) continue;
        const target = this.kinds.get('carrier') ?? null;
        if (target === null) continue;
        const b = this.bindings[n]!;
        this.reset(b, MODE_ROOT, target, pose, prop.colour);
        b.scaleByWidth = true;
        b.local.identity();
        n += 1;
        continue;
      }
      const target = this.kinds.get(prop.kind) ?? null;
      if (target === null) continue;
      const kit = PROP_KIT[prop.kind];
      // D162: the joint binding just made for this kind — what a hanging panel hangs from.
      let previous: Binding | null = null;
      // A head's own anchors (the eyepatch's strap on a bald head): `hair` null is bald.
      for (const anchor of anchorsOf(prop.kind, family, pose.hair === null)) {
        if (n >= MAX_BINDINGS) break;
        const b = this.bindings[n]!;
        if (anchor.joint === 'stand' || anchor.joint === 'root') {
          this.reset(b, departed ? MODE_BODY : anchor.joint === 'stand' ? MODE_STAND : MODE_ROOT, target, pose, prop.colour);
          anchorMatrix(anchor, b.local);
          this.ride(b, body, departed);
          previous = null;
        } else {
          const joint = body === null ? null : this.jointOf(body, anchor.joint);
          const base = baseModelOf(pose.modelId);
          const bind =
            base === null
              ? undefined
              : anchor.pose !== undefined
                ? this.posedInverses(base, anchor.pose.clip, anchor.pose.phase)?.get(anchor.joint)
                : this.binds.get(base)?.get(anchor.joint);
          if (joint === null || bind === undefined || body === null) {
            previous = null;
            continue;
          }
          this.reset(b, MODE_JOINT, target, pose, prop.colour);
          b.joint = joint;
          anchorMatrix(anchor, M);
          b.local.multiplyMatrices(bind, M);
          // D162: a panel that follows a second joint part-way — that joint's own
          // skinning of the same anchor, blended in the frame loop.
          const follow = anchor.follow;
          if (follow !== undefined && anchor.pose === undefined && base !== null) {
            const jointB = this.jointOf(body, follow.joint);
            const bindB = this.binds.get(base)?.get(follow.joint);
            if (jointB !== null && bindB !== undefined) {
              b.jointB = jointB;
              b.localB.multiplyMatrices(bindB, M);
              b.weight = Math.max(0, Math.min(1, follow.weight));
            }
          }
          // …and a panel that hangs from the one bound just before it.
          if (anchor.hang !== undefined && previous !== null) {
            b.parent = previous;
            b.hang = Math.max(0, Math.min(1, anchor.hang));
            b.upright.copy(M);
          }
          this.ride(b, body, departed);
          previous = b;
        }
        b.glowRest = kit.glow?.rest ?? 0;
        b.glowBoost = kit.glow?.boost ?? 0;
        b.flutter = prop.kind === 'wings';
        b.flame = prop.kind === 'exhaust';
        b.phase = (pose.cardId % 7) * 0.9;
        n += 1;
      }
    }
    return n;
  }

  /** A model's joints in one pose of one clip, inverted — built once per pose, at commit. */
  private posedInverses(modelId: string, clip: string, phase: number): JointBinds | null {
    const key = `${modelId}|${clip}|${String(phase)}`;
    const cached = this.posed.get(key);
    if (cached !== undefined) return cached;
    const model = this.library?.get(modelId);
    if (model === undefined) return null;
    const instance = posedInstance(model, clip, phase);
    const inverses = jointInverses(instance.object);
    instance.mixer.stopAllAction();
    this.posed.set(key, inverses);
    return inverses;
  }

  /** Bind `b` to the body it rides (a departing one's root is refreshed each frame). */
  private ride(b: Binding, body: PropBody | null, departed: boolean): void {
    b.departed = departed;
    if (body === null || (b.mode !== MODE_JOINT && b.mode !== MODE_BODY)) return;
    b.rig = body;
    this.noteRoot(body.root);
  }

  private reset(b: Binding, mode: number, target: KindMesh, pose: FigurePose, colour: string): void {
    b.mode = mode;
    b.target = target;
    b.pose = pose;
    b.rig = null;
    b.joint = null;
    b.member = null;
    b.scaleByWidth = false;
    b.glowRest = 0;
    b.glowBoost = 0;
    b.flutter = false;
    b.flame = false;
    b.phase = 0;
    b.departed = false;
    b.jointB = null;
    b.weight = 0;
    b.parent = null;
    b.hang = 0;
    b.colour.copy(parsedColour(colour));
  }

  private clear(b: Binding): void {
    b.target = null;
    b.pose = null;
    b.rig = null;
    b.joint = null;
    b.member = null;
    b.jointB = null;
    b.parent = null;
  }

  private noteRoot(root: THREE.Object3D): void {
    for (let i = 0; i < this.rootCount; i++) if (this.roots[i] === root) return;
    this.roots[this.rootCount] = root;
    this.rootCount += 1;
  }

  /** A body's joint by base name, looked up once per body. */
  private jointOf(rig: PropBody, name: string): THREE.Object3D | null {
    let map = this.jointsOf.get(rig.root);
    if (map === undefined) {
      map = new Map();
      rig.root.traverse((child) => {
        if ((child as THREE.Bone).isBone === true) map!.set(baseName(child.name), child);
      });
      this.jointsOf.set(rig.root, map);
    }
    return map.get(name) ?? null;
  }

  /**
   * **The frame loop's half** — called once per frame from `DiscField.bind`, after
   * `CueRunner.applyFigures` has written every rig's transform and pose. Indexed
   * walks over fixed arrays; no allocation (liveness reads this body).
   */
  bind(offsets: PropOffsetSource, seconds: number): void {
    const dt = this.last < 0 ? 0 : Math.min(0.05, Math.max(0, seconds - this.last));
    this.last = seconds;
    this.clock += dt * this.motion;
    const clock = this.clock;
    const list = this.list;
    for (let k = 0; k < list.length; k++) list[k]!.count = 0;
    // The rigs a joint prop reads: their world matrices, fresh for THIS frame's pose.
    for (let r = 0; r < this.rootCount; r++) this.roots[r]!.updateMatrixWorld(true);

    let drawn = 0;
    for (let i = 0; i < this.bound; i++) {
      const b = this.bindings[i]!;
      const target = b.target;
      const pose = b.pose;
      if (target === null || pose === null || target.count >= PROP_CAPACITY) continue;
      // A dying body's props are drawn exactly while the body is (D64's lane).
      if (b.departed && (b.rig === null || !b.rig.root.visible)) continue;
      const offset = offsets.offsetOf(pose.cardId);

      let opacity: number;
      if (b.mode === MODE_JOINT && b.rig !== null && b.joint !== null) {
        // The rig's own opacity, already folded by the frame loop (sickness, a
        // ghost, a dissolve) — the prop fades exactly with its body.
        opacity = b.rig.material.uniforms.uOpacity.value;
        const parent = b.parent;
        if (parent !== null) {
          // D162 — HANGS from its parent panel, bound (and so drawn) just before
          // it this frame: its top at the parent's hem, turned `hang` of the way
          // from the parent's angle back to the figure's upright; its own size.
          parent.world.decompose(POS, QUAT, SCL);
          POS.set(0, -COAT_PANEL.length * HANG_FROM, 0).applyMatrix4(parent.world);
          BLEND.multiplyMatrices(b.rig.root.matrixWorld, b.upright);
          BLEND.decompose(POS_B, QUAT_B, SCL_B);
          QUAT.slerp(QUAT_B, b.hang);
          WORLD.compose(POS, QUAT, SCL_B);
        } else if (b.jointB !== null) {
          // D162 — FOLLOWS a second joint part-way: both skinnings of the one
          // anchor, the turn slerped and the place and size lerped.
          WORLD.multiplyMatrices(b.joint.matrixWorld, b.local);
          WORLD.decompose(POS, QUAT, SCL);
          BLEND.multiplyMatrices(b.jointB.matrixWorld, b.localB);
          BLEND.decompose(POS_B, QUAT_B, SCL_B);
          POS.lerp(POS_B, b.weight);
          QUAT.slerp(QUAT_B, b.weight);
          SCL.lerp(SCL_B, b.weight);
          WORLD.compose(POS, QUAT, SCL);
        } else {
          WORLD.multiplyMatrices(b.joint.matrixWorld, b.local);
        }
        b.world.copy(WORLD);
      } else if (b.mode === MODE_BODY && b.rig !== null) {
        // A departing body's follower or bench: its root, where it fell.
        opacity = b.rig.material.uniforms.uOpacity.value;
        WORLD.multiplyMatrices(b.rig.root.matrixWorld, b.local);
      } else {
        const moving = b.mode === MODE_ROOT;
        const bob =
          moving && pose.bobAmp > 0 ? pose.bobAmp * Math.sin(seconds * 2 * Math.PI * pose.bobHz) : 0;
        const scale = (b.scaleByWidth ? pose.width : pose.height) * (moving ? offset.scale : 1);
        POS.set(
          pose.position[0] + (moving ? offset.dx : 0),
          pose.position[1] + (moving ? offset.dy : 0) + bob,
          pose.position[2] + (moving ? offset.dz : 0),
        );
        // A root prop turns with its body: the figure's facing, plus an attack's
        // turn toward its defender (`dRotY`) — a `stand` prop (the bench) does not.
        QUAT.setFromAxisAngle(UP, pose.facingY + (moving ? offset.dRotY : 0));
        SCL.set(scale, scale, scale);
        ROOT.compose(POS, QUAT, SCL);
        const member = b.member;
        if (member !== null) {
          // A ring member: round the ring with the clock, bobbing on its own phase.
          const angle = member.phase + clock * RING_SPEED;
          POS.set(
            Math.sin(angle) * RING_RADIUS,
            member.y + 0.035 * Math.sin(clock * 2.3 + member.phase * 1.7) * this.motion,
            Math.cos(angle) * RING_RADIUS,
          );
          QUAT.setFromAxisAngle(UP, angle + Math.PI / 2);
          SCL.set(member.size, member.size, member.size);
          MEMBER.compose(POS, QUAT, SCL);
          WORLD.multiplyMatrices(ROOT, MEMBER);
        } else {
          WORLD.multiplyMatrices(ROOT, b.local);
        }
        opacity = Math.max(0, Math.min(1, pose.opacity * offset.opacity * (1 - offset.dissolve)));
      }
      if (opacity <= 0.01) continue;

      // -- the emitter hook: a glowing prop's level, from the clip lane and the cue
      let level = 1;
      if (b.glowRest > 0) {
        const request = offsets.clipOf(pose.cardId);
        let drive = offset.glow > 0 ? Math.min(1, offset.glow) : 0;
        if (request !== null && FLARE_CLIPS.has(request.clip)) drive = Math.max(drive, request.weight);
        const flicker = 1 + 0.12 * Math.sin(clock * 23 + b.phase) * this.motion;
        level = (b.glowRest + b.glowBoost * drive) * flicker;
        if (b.flame) {
          // The flame stretches as it burns: about its nozzle, which is the origin.
          SCL.set(1, 0.5 + 0.55 * level, 1);
          WAVE.makeScale(SCL.x, SCL.y, SCL.z);
          WORLD.multiply(WAVE);
        }
      }
      if (b.flutter) {
        // Wings beat by folding in x — a function of the frame clock, and still
        // under reduced motion.
        const beat = 1 - 0.3 * Math.abs(Math.sin(clock * 24 + b.phase)) * this.motion;
        WAVE.makeScale(beat, 1, 1);
        WORLD.multiply(WAVE);
      }

      const slot = target.count;
      target.mesh.setMatrixAt(slot, WORLD);
      COLOUR.copy(b.colour);
      if (pose.frozen) COLOUR.lerp(FREEZE_WASH, FREEZE_MIX);
      if (level !== 1) COLOUR.multiplyScalar(level);
      target.mesh.setColorAt(slot, COLOUR);
      target.opacity.setX(slot, opacity);
      target.count = slot + 1;
      drawn += 1;
    }

    for (let k = 0; k < list.length; k++) commitKind(list[k]!);
    this.drawnLast = drawn;
  }

  /** How many prop instances drew last frame, and how many kinds — `?glinfo=1`'s census. */
  drawn(): number {
    return this.drawnLast;
  }

  kindsDrawn(): number {
    let n = 0;
    for (let k = 0; k < this.list.length; k++) if (this.list[k]!.count > 0) n += 1;
    return n;
  }

  /**
   * **§8.3 rule 3's warm-up**: `renderer.compile` compiles only what is visible,
   * so `FigureLayer` shows every kind for one compile at mount (they share one
   * program) and hides them again — the first Doombot on the table must not be the
   * frame the prop program compiles on.
   */
  setPrimeVisible(on: boolean): void {
    this.ensure();
    for (const entry of this.list) entry.mesh.visible = on || entry.mesh.count > 0;
  }

  /** Release every kind's GPU resources. The field rebuilds itself on its next commit. */
  dispose(): void {
    for (const entry of this.list) {
      entry.mesh.geometry.dispose();
      entry.material.dispose();
      entry.mesh.dispose();
      this.group.remove(entry.mesh);
    }
    this.list.length = 0;
    this.kinds.clear();
    this.library = null;
    this.posed.clear();
    this.unwatchMotion();
    for (let i = 0; i < this.bound; i++) this.clear(this.bindings[i]!);
    this.bound = 0;
    this.rootCount = 0;
  }
}

/** No departing bodies — the default, shared. */
const NO_BODIES: readonly PropBody[] = Object.freeze([]) as readonly PropBody[];

/** An anchor → its matrix in figure space. Commit time only. */
function anchorMatrix(anchor: PropAnchor, into: THREE.Matrix4): THREE.Matrix4 {
  const turn = anchor.turn ?? [0, 0, 0];
  E.set(turn[0], turn[1], turn[2]);
  Q.setFromEuler(E);
  if (typeof anchor.size === 'number') S.setScalar(anchor.size);
  else S.set(anchor.size[0], anchor.size[1], anchor.size[2]);
  return into.compose(P.set(anchor.at[0], anchor.at[1], anchor.at[2]), Q, S);
}

/** An empty kind is not drawn at all: `visible` false costs the renderer nothing. */
function commitKind(entry: KindMesh): void {
  const mesh = entry.mesh;
  mesh.count = entry.count;
  mesh.visible = entry.count > 0;
  if (entry.count === 0) return;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
  entry.opacity.needsUpdate = true;
}
