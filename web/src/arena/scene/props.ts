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
 *  3. **Unlit, one program.** Every kind is the same `ShaderMaterial` source — a
 *     view-space fresnel like `holoMaterial.ts`, plus instancing, a per-instance
 *     colour and a per-instance opacity — with its own uniforms, so three
 *     compiles one program for the whole field (primed at mount, see
 *     {@link PropField.setPrimeVisible}).
 *  4. **Hard rule 8.** A prop is only ever bound for a pose that `figurePose`
 *     gave props, and it gives none to an anonymous figure; a prop takes no
 *     click (`raycast` is cleared on every mesh) and carries no name.
 * ---------------------------------------------------------------------------
 */

import * as THREE from 'three';

import type { ClipRequest } from '../figures/clips.ts';
import type { FigureLayout, FigurePose } from '../figures/pose.ts';
import {
  PROP_KIT,
  PROP_KINDS,
  RING_RADIUS,
  SWARM_BEE_RATIO,
  anchorsOf,
  familyOf,
  swarmMembers,
  type PropAnchor,
  type SceneKind,
  type SwarmMember,
} from '../figures/props.ts';
import type { ModelData } from '../figures/types.ts';
import { parsedColour } from './colourCache.ts';
import type { FigureRigMap } from './figureRigs.ts';
import { COSTUME_ATTRIBUTE } from './holoMaterial.ts';
import { instantiateFigure, sampleClipInto, type LoadedModel, type ModelLibrary } from './models.ts';

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

/** How many instances one kind's buffer holds. Two per figure (gauntlets) × 12 figures, with room. */
export const PROP_CAPACITY = 32;
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
// The one shader
// ---------------------------------------------------------------------------

const VERTEX = /* glsl */ `
  #include <common>
  #include <color_pars_vertex>
  attribute float aOpacity;

  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  varying float vLocalY;
  varying float vOpacity;

  void main() {
    #include <color_vertex>
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <project_vertex>
    vViewNormal = normalize( transformedNormal );
    vViewDir = normalize( -mvPosition.xyz );
    vLocalY = transformed.y;
    vOpacity = aOpacity;
  }
`;

const FRAGMENT = /* glsl */ `
  #include <color_pars_fragment>
  uniform float uCore;
  uniform float uRim;
  uniform float uRimBoost;
  uniform float uRimLift;
  uniform float uAlpha;
  uniform float uAlphaRim;
  uniform float uGlow;
  uniform float uScan;

  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  varying float vLocalY;
  varying float vOpacity;

  void main() {
    float facing = abs( dot( normalize( vViewNormal ), normalize( vViewDir ) ) );
    float fresnel = pow( 1.0 - facing, uRim );
    // A function of the prop's own y, never of time (the holo figure's rule).
    float scan = 1.0 - uScan * step( 0.5, fract( vLocalY * 30.0 ) ) * 0.3;
    // three 0.186 declares vColor as a vec4 (vertex colour times instance colour).
    vec3 base = vColor.rgb;
    vec3 rimColour = mix( base, vec3( 1.0 ), uRimLift );
    vec3 colour = ( base * uCore + rimColour * fresnel * uRimBoost ) * scan * uGlow;
    float alpha = clamp( vOpacity * ( uAlpha + fresnel * uAlphaRim ), 0.0, 1.0 );
    gl_FragColor = vec4( colour, alpha );
    #include <colorspace_fragment>
  }
`;

/** A kind's look: every number is a uniform, so every kind is the same program. */
interface Look {
  core: number;
  rim: number;
  rimBoost: number;
  rimLift: number;
  alpha: number;
  alphaRim: number;
  glow: number;
  scan: number;
  depthWrite: boolean;
}

const BODY: Look = { core: 0.55, rim: 2.1, rimBoost: 1.7, rimLift: 0, alpha: 0.38, alphaRim: 0.85, glow: 1, scan: 1, depthWrite: true };
const SOLID: Look = { core: 0.8, rim: 2, rimBoost: 1.1, rimLift: 0.35, alpha: 0.66, alphaRim: 0.45, glow: 1, scan: 0.5, depthWrite: true };
const DARK: Look = { core: 1, rim: 2.5, rimBoost: 0.5, rimLift: 0.25, alpha: 0.92, alphaRim: 0.08, glow: 1, scan: 0, depthWrite: true };
const GLASS: Look = { core: 0.4, rim: 1.8, rimBoost: 1.5, rimLift: 0.4, alpha: 0.2, alphaRim: 0.85, glow: 1, scan: 0, depthWrite: false };
const MEMBRANE: Look = { core: 0.95, rim: 1.6, rimBoost: 1.1, rimLift: 0.3, alpha: 0.46, alphaRim: 0.45, glow: 1, scan: 0, depthWrite: false };
/**
 * A garment that reads as its own colour: Fury's black coat, the Biochemist's
 * white one. Nearly opaque, and rim-lit only at its SILHOUETTE (a steep fresnel,
 * power 3) — the second verification pass found a soft 0.6 rim lift turning
 * Fury's black coat into a pale grey bell from the table view's steep camera,
 * where most of a flared coat is at a grazing angle; with no rim at all it was a
 * black shape on a black table. Its shape is drawn by that edge and its trim.
 */
const CLOTH: Look = { core: 1, rim: 3, rimBoost: 0.9, rimLift: 0.45, alpha: 0.93, alphaRim: 0.07, glow: 1, scan: 0.15, depthWrite: true };
/** A small hard object that has to read at table distance: the pistol. */
const METAL: Look = { core: 0.9, rim: 1.5, rimBoost: 1.3, rimLift: 0.55, alpha: 0.9, alphaRim: 0.1, glow: 1, scan: 0, depthWrite: true };
/**
 * A lit emblem — gold, not blown out to white. Normal blend since the
 * verification pass: additive gold over a navy body summed to white.
 */
const BADGE: Look = { core: 1, rim: 2, rimBoost: 0.35, rimLift: 0.15, alpha: 0.95, alphaRim: 0.05, glow: 1, scan: 0, depthWrite: true };
/** Cloth that has to read as a colour, not a sheen: the shirt-front and tie, the hat. */
const FABRIC: Look = { core: 0.95, rim: 2, rimBoost: 0.55, rimLift: 0.35, alpha: 0.94, alphaRim: 0.06, glow: 1, scan: 0, depthWrite: true };
/** The carrier: the body look, a little more solid, so it reads against the dark table from above. */
const HULL: Look = { core: 0.72, rim: 2, rimBoost: 1.6, rimLift: 0.2, alpha: 0.55, alphaRim: 0.7, glow: 1, scan: 0.6, depthWrite: true };
const EMBLEM: Look = { core: 0.95, rim: 2, rimBoost: 0.5, rimLift: 0.2, alpha: 0.82, alphaRim: 0.15, glow: 1, scan: 0, depthWrite: true };
const GLOW: Look = { core: 1, rim: 2, rimBoost: 0.6, rimLift: 0.3, alpha: 0.9, alphaRim: 0.1, glow: 1.5, scan: 0, depthWrite: false };

const LOOKS: Readonly<Record<SceneKind, Look>> = {
  wings: MEMBRANE,
  helmet: GLASS,
  hood: SOLID,
  jetpack: SOLID,
  exhaust: GLOW,
  laserEye: GLOW,
  pistol: METAL,
  coat: CLOTH,
  eyepatch: DARK,
  badge: BADGE,
  gauntlets: GLOW,
  shield: EMBLEM,
  rider: BODY,
  labBench: SOLID,
  muzzle: GLOW,
  tie: FABRIC,
  hat: FABRIC,
  visor: GLOW,
  squad: BODY,
  swarmBee: BODY,
  carrier: HULL,
};

export type PropMaterial = THREE.ShaderMaterial & {
  uniforms: Record<'uCore' | 'uRim' | 'uRimBoost' | 'uRimLift' | 'uAlpha' | 'uAlphaRim' | 'uGlow' | 'uScan', { value: number }>;
};

function makePropMaterial(kind: SceneKind): PropMaterial {
  const look = LOOKS[kind];
  const additive = PROP_KIT[kind].blend === 'additive';
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uCore: { value: look.core },
      uRim: { value: look.rim },
      uRimBoost: { value: look.rimBoost },
      uRimLift: { value: look.rimLift },
      uAlpha: { value: look.alpha },
      uAlphaRim: { value: look.alphaRim },
      uGlow: { value: look.glow },
      uScan: { value: look.scan },
    },
    vertexColors: true,
    transparent: true,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: look.depthWrite && !additive,
    // DoubleSide for EVERY kind: `side` is part of the program key, and one
    // program for the whole field is the point. A wing is a single sheet anyway.
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  return material as PropMaterial;
}

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
 * Every procedural kind's geometry, in its own unit space — the anchor's `at`,
 * `turn` and `size` (`figures/props.ts`) place it on a body. Exported for
 * `web/test/traits.test.ts`, which measures the bee and the carrier against the
 * numbers the pose's width clamp assumes.
 */
export function buildKindGeometry(kind: SceneKind): THREE.BufferGeometry | null {
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
    case 'pistol': {
      // Grip at the origin, barrel along +z to its tip at (0, 0.25, 1.25) —
      // `figures/props.ts`'s PISTOL_TIP_LOCAL, where the lit muzzle sits.
      return mergeParts([
        part(new THREE.BoxGeometry(0.5, 0.5, 1.4), WHITE, [0, 0.25, 0.5]),
        part(new THREE.BoxGeometry(0.44, 0.95, 0.5), [0.72, 0.72, 0.72], [0, -0.28, -0.02], [-0.25, 0, 0]),
        part(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10), [0.35, 0.35, 0.35], [0, 0.25, 1.2], [Math.PI / 2, 0, 0]),
      ]);
    }
    case 'coat': {
      // **Slice 4: a long coat cut for the PROPORTIONED body**, in its figure
      // units at size 1, from the shoulders (the anchor) to below the knee: an
      // open shell a little wider than the shoulders at the top (0.15) and flared
      // at the hem (0.25), squashed front-to-back to the body's depth; it wraps
      // round the front to a 40° opening, and its arms-free cut lets the hanging
      // arms show at its sides. A stand-up collar at the neck (no higher than the
      // jaw — slice 3's chibi collar, scaled to a person, was a bell over the
      // head), TRIM strips down the opening, round the collar and the hem. The
      // trim's vertex colour is ×30 of the coat's own: white on any coat that is not
      // black, a light slate on Fury's black one (the second verification pass).
      // The chibi fallback wears the same coat through a wider anchor.
      const gap = (40 / 180) * Math.PI;
      const edge = gap / 2;
      const TRIM: RGB = [30, 30, 30];
      const DEPTH: readonly [number, number, number] = [1, 1, 0.72];
      const lapel = (from: number): THREE.BufferGeometry =>
        part(new THREE.CylinderGeometry(0.153, 0.253, 0.56, 1, 1, true, from, 0.12), TRIM, [0, -0.28, 0], [0, 0, 0], DEPTH);
      return mergeParts([
        part(new THREE.CylinderGeometry(0.15, 0.25, 0.56, 22, 3, true, edge, Math.PI * 2 - gap), WHITE, [0, -0.28, 0], [0, 0, 0], DEPTH),
        lapel(edge),
        lapel(Math.PI * 2 - edge - 0.12),
        // The collar: stands up round the neck, open at the throat.
        part(new THREE.CylinderGeometry(0.085, 0.1, 0.07, 18, 1, true, edge * 1.4, Math.PI * 2 - gap * 1.4), [1.3, 1.3, 1.3], [0, 0.03, -0.005], [0, 0, 0], [1, 1, 0.9]),
        part(new THREE.CylinderGeometry(0.088, 0.086, 0.012, 18, 1, true, edge * 1.4, Math.PI * 2 - gap * 1.4), TRIM, [0, 0.066, -0.005], [0, 0, 0], [1, 1, 0.9]),
        // The hem's trim.
        part(new THREE.CylinderGeometry(0.252, 0.252, 0.018, 22, 1, true, edge, Math.PI * 2 - gap), TRIM, [0, -0.551, 0], [0, 0, 0], DEPTH),
      ]);
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
        new THREE.CylinderGeometry(1.08, 1.08, 0.26, 20, 1, true),
        [0.03, 0.03, 0.04],
        [0, 0.1, 0],
        [0, 0, -0.5],
      );
      return mergeParts([
        // No pale rim any more (slice 4): on a proportioned face a ringed disc
        // read as a monocle — the patch is a black oval with a slate edge.
        part(new THREE.CircleGeometry(0.36, 20), [0.015, 0.016, 0.02], [0.4, 0.07, 1.03]),
        part(new THREE.RingGeometry(0.36, 0.42, 22), [0.09, 0.1, 0.12], [0.4, 0.07, 1.025]),
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
    // Baked from the library at load (`bakePose`), not built here.
    case 'rider':
    case 'squad':
      return null;
  }
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
}

function blankBinding(): Binding {
  return {
    mode: MODE_ROOT,
    target: null,
    pose: null,
    rig: null,
    joint: null,
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

/**
 * `head_1` → `head`: GLTFLoader suffixes a repeated node name with `_<n>`, n from
 * 1. **Slice 4: only a suffix with no leading zero** — the proportioned bodies'
 * own joints end in digits (`spine_03`, `neck_01`), and slice 3's `/_\d+$/` turned
 * all three spine joints into one `spine`. `spine_03_1` → `spine_03`, and
 * `spine_03` stays itself.
 */
export function baseName(name: string): string {
  return name.replace(/_[1-9]\d*$/, '');
}

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
    for (const kind of [...PROP_KINDS, 'swarmBee', 'carrier'] as const) {
      const geometry = buildKindGeometry(kind);
      if (geometry !== null) this.addKind(kind, kind, geometry);
    }
  }

  private addKind(key: string, kind: SceneKind, geometry: THREE.BufferGeometry): KindMesh {
    const opacity = new THREE.InstancedBufferAttribute(new Float32Array(PROP_CAPACITY), 1);
    opacity.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aOpacity', opacity);
    const material = makePropMaterial(kind);
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
    this.kinds.set(key, entry);
    this.list.push(entry);
    this.group.add(mesh);
    return entry;
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
        const key = prop.kind === 'squad' ? `squad:${pose.modelId ?? ''}` : 'swarmBee';
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
      for (const anchor of anchorsOf(prop.kind, family)) {
        if (n >= MAX_BINDINGS) break;
        const b = this.bindings[n]!;
        if (anchor.joint === 'stand' || anchor.joint === 'root') {
          this.reset(b, departed ? MODE_BODY : anchor.joint === 'stand' ? MODE_STAND : MODE_ROOT, target, pose, prop.colour);
          anchorMatrix(anchor, b.local);
          this.ride(b, body, departed);
        } else {
          const joint = body === null ? null : this.jointOf(body, anchor.joint);
          const bind =
            pose.modelId === null
              ? undefined
              : anchor.pose !== undefined
                ? this.posedInverses(pose.modelId, anchor.pose.clip, anchor.pose.phase)?.get(anchor.joint)
                : this.binds.get(pose.modelId)?.get(anchor.joint);
          if (joint === null || bind === undefined || body === null) continue;
          this.reset(b, MODE_JOINT, target, pose, prop.colour);
          b.joint = joint;
          anchorMatrix(anchor, M);
          b.local.multiplyMatrices(bind, M);
          this.ride(b, body, departed);
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
    b.colour.copy(parsedColour(colour));
  }

  private clear(b: Binding): void {
    b.target = null;
    b.pose = null;
    b.rig = null;
    b.joint = null;
    b.member = null;
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
        WORLD.multiplyMatrices(b.joint.matrixWorld, b.local);
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
