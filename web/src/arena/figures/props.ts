/*
 * mtg-table — arena/figures/props.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The prop kit, as data** (Tier 2 slice 3 — per-card identity, T9 and T10).
 *
 * `[NO three]`, `[NO React]`, `[NO DOM]`, no clock — the same split as the rest
 * of `figures/`: this file says WHICH props exist, WHERE each one sits on each
 * body, and HOW a swarm is arranged; `scene/props.ts` builds the geometry and
 * draws it. So `web/test/traits.test.ts` can resolve every card's props over the
 * whole corpus under `node --test`, with no browser and no GPU.
 *
 * ---------------------------------------------------------------------------
 * **Identity is data, and a prop is a SHARED kind.** The user's verdict on
 * slice 2 was "everything still looks very generic" — every card was one of five
 * bodies in a colour. This slice makes each of the deck's cards read as itself
 * through a small kit of props that any card may name in `traits.json`: Wasp's
 * wings, Ant-Man's helmet, Fury's coat and eyepatch, Coulson's badge. A prop is
 * a procedural primitive, instanced per kind, so a prop costs **one draw call
 * per kind on the table, not one per figure** — and none of them is a model used
 * by exactly one card (report 13 §12's Tier 3 seam): every kind here is
 * available to every row.
 *
 * **Figure space.** Every anchor below is written in the space `scene/models.ts`
 * normalises a model into: **one unit tall, feet at y = 0, facing +z** (the
 * face is at +z — measured on the Kenney heads, whose face detail sits on the
 * z = +0.25 plane, and on the drone's eye and the bee's mouth). A joint anchor
 * is re-expressed in its joint's bind frame once at load, so the prop then
 * follows whatever the clip lane does to that joint; `root` follows the figure's
 * whole transform (its lunge included); `stand` sits at the pose's stand point
 * and ignores the cue offset (a lab bench does not lunge with its scientist).
 * ---------------------------------------------------------------------------
 */

import type { ModelData } from './types.ts';

/**
 * The kinds a `traits.json` row may name in `props`. Closed: a kind nobody
 * built is a validation error, and the ladder falls through.
 */
export const PROP_KINDS = [
  'wings',
  'helmet',
  'hood',
  'jetpack',
  'exhaust',
  'laserEye',
  'pistol',
  'coat',
  'eyepatch',
  'badge',
  'gauntlets',
  'shield',
  'rider',
  'labBench',
  // Slice 3's verification pass: three more cues a card needed to read as ITSELF
  // from the table camera (Agent 13's lit muzzle, Coulson's shirt and tie, Peggy's
  // red hat) — each a shared kind like every other, open to any row.
  'muzzle',
  'tie',
  'hat',
  // The second verification pass: a robot's eye as a lit band round its head, so
  // the Doombot reads as red-eyed from BEHIND as well (its eye is on its face).
  'visor',
] as const;
export type PropKind = (typeof PROP_KINDS)[number];

/**
 * The kinds a trait produces WITHOUT naming them: a squad's followers
 * (`formation: "squad"`), a swarm's members (`formation: "ring"`) and a vehicle's
 * silhouette (`silhouette: "carrier"`). They are drawn by the same field, at one
 * draw call per kind, and are never written in a `props` list.
 */
export const DERIVED_KINDS = ['squad', 'swarmBee', 'carrier'] as const;
export type DerivedKind = (typeof DERIVED_KINDS)[number];

export type SceneKind = PropKind | DerivedKind;

/** Every kind the prop field can draw, in the order it builds them. */
export const SCENE_KINDS: readonly SceneKind[] = [...PROP_KINDS, ...DERIVED_KINDS];

const PROP_KIND_SET: ReadonlySet<string> = new Set<string>(PROP_KINDS);

export function isPropKind(value: string): value is PropKind {
  return PROP_KIND_SET.has(value);
}

/** The vehicle silhouettes. One today, and it is an archetype (`subtype:vehicle`), not a card. */
export const SILHOUETTES = ['carrier'] as const;
export type Silhouette = (typeof SILHOUETTES)[number];

/** How a figure holds itself when nothing is happening (a trait's `idle`). */
export const IDLE_STYLES = ['static', 'hover'] as const;
export type IdleStyle = (typeof IDLE_STYLES)[number];

/** How a `swarm` is laid out. */
export const FORMATIONS = ['ring', 'squad'] as const;
export type Formation = (typeof FORMATIONS)[number];

/**
 * The body families a prop is fitted to. The three humanoid models share one
 * 7-joint rig (D73), so they share every anchor; the drone and the bee have
 * skeletons of their own.
 */
export type Family = 'humanoid' | 'drone' | 'insect';

/** A model id → the family its props are fitted to, or `null` for the disc. */
export function familyOf(modelId: string | null, models?: ModelData): Family | null {
  if (modelId === null) return null;
  const entry = models?.models[modelId];
  if (entry?.rig === 'kenney-mini') return 'humanoid';
  if (modelId === 'agent' || modelId === 'hero' || modelId === 'scientist') return 'humanoid';
  if (modelId === 'drone') return 'drone';
  if (modelId === 'insect') return 'insect';
  return null;
}

/**
 * Where one prop sits. `joint` is a joint's BASE name (GLTFLoader suffixes a
 * repeated name, `head_1`; the field strips `_<n>` before it looks), or `root` /
 * `stand` (see the header). `at`, `turn` (Euler XYZ, radians) and `size` place
 * the kind's unit geometry in figure space.
 */
export interface PropAnchor {
  joint: string;
  at: readonly [number, number, number];
  turn?: readonly [number, number, number];
  size: number | readonly [number, number, number];
}

/** How a kind is drawn. Every kind shares one shader program (`scene/props.ts`). */
export type PropBlend = 'normal' | 'additive';

/**
 * A kind's colour when the row gives no `accent`: `accent` (the row's accent,
 * falling back to the body tint), `tint` (always the body tint) or a fixed hex —
 * an eyepatch is black and a laser is red whatever the card's colour is.
 */
export type PropColour = 'accent' | 'tint' | `#${string}`;

export interface PropKitEntry {
  blend: PropBlend;
  colour: PropColour;
  /**
   * Does this kind glow — i.e. does its brightness follow the clip lane and the
   * cue's `glow` (the emitter hook, `scene/props.ts`'s `intensityOf`)? A glow is
   * lit at `rest` with no cue at all, because it is a pose (the Doombot's eye is
   * on whether or not it is attacking).
   */
  glow: { rest: number; boost: number } | null;
  /** Anchors per family; `any` is used for a family with no row of its own. */
  anchors: Partial<Record<Family | 'any', readonly PropAnchor[]>>;
}

// -- figure-space landmarks, measured on the committed figures.glb -----------
// (docs/evidence/m7-tier2-slice3.md §1 prints how.) Kenney chibi: head y 0.511–1.0,
// ±0.338 wide, face plane z = +0.25, eyes at y ≈ 0.73, x ≈ ±0.14; torso y
// 0.263–0.511, chest front z ≈ +0.16, back z ≈ −0.24; hands (bind pose) at
// (±0.53, 0.43, 0.09). Drone: body sphere centred (0, 0.585, 0), r ≈ 0.30; eye at
// (0, 0.473, 0.233). Bee: body y 0–0.42, head chain to y 1.0, wings at the sides
// y 0.37–0.58.
const HEAD_CENTRE: readonly [number, number, number] = [0, 0.755, 0];

/**
 * The pistol, in figure space: its grip at her RIGHT HIP, out beside the body,
 * the barrel turned {@link PISTOL_YAW} out from straight ahead, {@link PISTOL_SIZE}
 * long in its own units — and the muzzle's point, derived from the three so the
 * lit tip and the barrel cannot drift apart (`scene/props.ts` builds the barrel's
 * tip at unit z = 1.25, y = 0.25, and `web/test/facing.test.ts` holds the cue's
 * muzzle flash to this point).
 *
 * **Out to the side, and angled, since the second verification pass.** Slice 3's
 * fix raised it at the right of the CHEST, barrel forward: from the table view
 * your own Agent 13's pistol pointed at the camera (a foreshortened stick) and
 * the opponent's was under her head and behind her body — a plain indigo agent
 * from that side. At the hip and beside the body the chibi's head (half the
 * figure, and wider than the torso) no longer covers it from above, and at 49°
 * out from straight ahead the barrel shows most of its length from the front, the
 * back and side-on (views 1 and 4); `traits.test.ts` rasterises it from both
 * seats. The tip stays inside the body's own width (the D65 clamp is honest).
 */
export const PISTOL_GRIP: readonly [number, number, number] = [-0.29, 0.31, 0.07];
export const PISTOL_YAW = -0.85;
export const PISTOL_SIZE = 0.32;
export const PISTOL_TIP_LOCAL: readonly [number, number, number] = [0, 0.25, 1.25];
export const PISTOL_MUZZLE: readonly [number, number, number] = [
  PISTOL_GRIP[0] + PISTOL_SIZE * PISTOL_TIP_LOCAL[2] * Math.sin(PISTOL_YAW),
  PISTOL_GRIP[1] + PISTOL_SIZE * PISTOL_TIP_LOCAL[1],
  PISTOL_GRIP[2] + PISTOL_SIZE * PISTOL_TIP_LOCAL[2] * Math.cos(PISTOL_YAW),
];

export const PROP_KIT: Readonly<Record<SceneKind, PropKitEntry>> = {
  // Wasp's four insect wings on her back; an extra, larger pair on a bee.
  wings: {
    blend: 'normal',
    colour: 'accent',
    glow: null,
    anchors: {
      humanoid: [{ joint: 'torso', at: [0, 0.5, -0.24], turn: [-0.25, 0, 0], size: 0.74 }],
      insect: [{ joint: 'Head', at: [0, 0.6, -0.22], turn: [-0.5, 0, 0], size: 0.62 }],
      drone: [{ joint: 'Head', at: [0, 0.66, -0.28], turn: [-0.4, 0, 0], size: 0.45 }],
    },
  },
  // Ant-Man's helmet: a glass shell over the whole head, two antennae, red lenses.
  helmet: {
    blend: 'normal',
    colour: 'accent',
    glow: null,
    anchors: { humanoid: [{ joint: 'head', at: HEAD_CENTRE, size: [0.385, 0.285, 0.3] }] },
  },
  // A.I.M.'s beekeeper bucket: a cylinder over the head with a dark visor slot.
  hood: {
    blend: 'normal',
    colour: 'accent',
    glow: null,
    anchors: { humanoid: [{ joint: 'head', at: [0, 0.77, 0], size: [0.37, 0.28, 0.3] }] },
  },
  // Twin thrusters on the back.
  jetpack: {
    blend: 'normal',
    colour: 'tint',
    glow: null,
    anchors: {
      drone: [{ joint: 'Head', at: [0, 0.6, -0.34], size: 0.2 }],
      humanoid: [{ joint: 'torso', at: [0, 0.4, -0.3], size: 0.15 }],
    },
  },
  // The flame under the thrusters: lit at rest (a pose), flaring with the clip lane.
  exhaust: {
    blend: 'additive',
    colour: '#ffb46a',
    glow: { rest: 0.7, boost: 1.0 },
    anchors: {
      drone: [{ joint: 'Head', at: [0, 0.44, -0.34], size: 0.2 }],
      humanoid: [{ joint: 'torso', at: [0, 0.28, -0.3], size: 0.15 }],
    },
  },
  // The Doombot's laser eye — and every robot's, in its own accent. It is on the
  // FACE, so it reads from the front; its `visor` reads from every side.
  laserEye: {
    blend: 'additive',
    colour: 'accent',
    glow: { rest: 0.9, boost: 1.4 },
    anchors: {
      drone: [{ joint: 'Eye', at: [0, 0.473, 0.25], size: [0.1, 0.1, 0.05] }],
      humanoid: [{ joint: 'head', at: [-0.14, 0.735, 0.26], size: [0.06, 0.06, 0.03] }],
    },
  },
  // Agent 13's sidearm, RAISED at the ready: held at chest height on her right,
  // barrel forward and a little out, on the torso so it reads in every stance.
  // Slice 3 first hung a 0.17 pistol at her right hand in the body's own colour —
  // invisible from the table view, and a grey box at her feet side-on (the
  // verification pass). 0.3, silver, with a lit muzzle ({@link PROP_KIT}.muzzle).
  pistol: {
    blend: 'normal',
    colour: 'accent',
    glow: null,
    anchors: { humanoid: [{ joint: 'torso', at: PISTOL_GRIP, turn: [0, PISTOL_YAW, 0], size: PISTOL_SIZE }] },
  },
  // The pistol's muzzle, lit at rest (a pose: the gun is drawn) and flaring with
  // the clip lane — her attack's pistolDraw is the `attack` request, so the
  // emitter hook fires it with the muzzle-flash cue.
  muzzle: {
    blend: 'additive',
    colour: '#ffcf7a',
    glow: { rest: 1.0, boost: 1.3 },
    anchors: { humanoid: [{ joint: 'torso', at: PISTOL_MUZZLE, size: 0.06 }] },
  },
  // A robot's eye as a lit band round its head at eye height (second verification
  // pass): the drone's eye is on its face, so from the opponent's side of the
  // table view — whose figures show you their backs — the Doombot was a green
  // drone with thrusters and no red at all. The band is its eye's glow, read from
  // behind and from above; `additive`, lit at rest, flaring with the eye.
  visor: {
    blend: 'additive',
    colour: 'accent',
    glow: { rest: 0.7, boost: 1.2 },
    anchors: {
      drone: [{ joint: 'Head', at: [0, 0.47, 0], size: [0.318, 0.4, 0.318] }],
      humanoid: [{ joint: 'head', at: [0, 0.735, 0], size: [0.35, 0.3, 0.262] }],
    },
  },
  // Fury's long coat: a shell from the shoulders to the ankles, flared wider than
  // the chibi's head at the hem so it shows round the figure from above, wrapped
  // round the front with two lit lapels, and a stand-up collar with a lit rim that
  // reads from behind (the second verification pass: from the table view his coat
  // was behind your own Fury and out of view).
  coat: {
    blend: 'normal',
    colour: 'accent',
    glow: null,
    anchors: { humanoid: [{ joint: 'torso', at: [0, 0.52, -0.035], size: 1 }] },
  },
  // Fury's eyepatch, on HIS left (+x) eye, and the strap round his head — the
  // patch big and black with a pale rim, the strap pale, so both read on a dark
  // head, and the strap from BEHIND (the second verification pass).
  eyepatch: {
    blend: 'normal',
    // White: the geometry carries its own colours (a black patch, a pale rim and
    // strap), which a dark kit colour would have multiplied back to black.
    colour: '#ffffff',
    glow: null,
    anchors: { humanoid: [{ joint: 'head', at: HEAD_CENTRE, size: 1 }] },
  },
  // Coulson's badge: a gold shield with a bright rim, on his left breast AND —
  // since the second verification pass — as a larger S.H.I.E.L.D. emblem between
  // his shoulder blades, tilted up to the camera, because the opponent's figures
  // show the table view their backs and the chest badge alone made the opponent's
  // Coulson a plain navy agent. The chest badge moved down out from under the
  // chibi's chin, which hid most of it from your own seat. Normal blend —
  // additive gold over a navy body summed to WHITE (the first verification pass).
  // It still flares with the clip lane (his `channel` gesture, the counters'
  // badge cue) through `glow`. The FIRST anchor is the chest: the cue's badge
  // flash lands on the front (`facing.test.ts`).
  badge: {
    blend: 'normal',
    colour: '#e8b43c',
    glow: { rest: 1, boost: 0.55 },
    anchors: {
      humanoid: [
        { joint: 'torso', at: [0.13, 0.385, 0.165], turn: [-0.35, 0, 0], size: 0.155 },
        { joint: 'torso', at: [0, 0.34, -0.262], turn: [0.55, Math.PI, 0], size: 0.17 },
      ],
    },
  },
  // A white shirt-front and a dark tie down the chest: the suit, read at 45 px.
  // A FRONT detail by nature (the badge's back emblem reads from behind), long
  // and low since the second verification pass — down to the belt, tilted up to
  // the camera — because the chibi's big head hid all but a corner of it.
  tie: {
    blend: 'normal',
    colour: '#ffffff',
    glow: null,
    anchors: { humanoid: [{ joint: 'torso', at: [-0.02, 0.35, 0.17], turn: [-0.55, 0, 0], size: 0.26 }] },
  },
  // Quake's gauntlets: one glowing fist per hand.
  gauntlets: {
    blend: 'additive',
    colour: 'accent',
    glow: { rest: 0.75, boost: 1.2 },
    anchors: {
      humanoid: [
        { joint: 'arm-left', at: [0.53, 0.43, 0.09], size: 0.1 },
        { joint: 'arm-right', at: [-0.53, 0.43, 0.09], size: 0.1 },
      ],
    },
  },
  // Peggy's round shield on her left arm, red, white and blue — 1.5× slice 3's
  // first roundel, held a little in front and turned out, so it shows side-on too.
  shield: {
    blend: 'normal',
    colour: '#ffffff',
    glow: null,
    anchors: { humanoid: [{ joint: 'arm-left', at: [0.46, 0.4, 0.27], turn: [0, 0.45, 0], size: 0.25 }] },
  },
  // A hat with a crown and a brim, on top of the head — the part of a figure the
  // table view's steep camera sees most of. Peggy's is red.
  hat: {
    blend: 'normal',
    colour: 'accent',
    glow: null,
    anchors: { humanoid: [{ joint: 'head', at: [0, 0.975, -0.01], turn: [-0.1, 0, 0.08], size: 0.33 }] },
  },
  // A tiny crouching rider on the giant ant's back (the hero body, baked), in a
  // warm colour of its own so it reads against any cool mount.
  rider: {
    blend: 'normal',
    colour: '#ff7a64',
    glow: null,
    anchors: { insect: [{ joint: 'Head3', at: [0, 0.9, -0.02], size: 0.52 }] },
  },
  // The scientists' lab bench, at the figure's LEFT hand, inside its own rank
  // slot: behind it (toward the centre line) the chibi's head hides it from a
  // seat's own camera, and in front it would lie over its card's name.
  labBench: {
    blend: 'normal',
    colour: 'accent',
    glow: null,
    anchors: { any: [{ joint: 'stand', at: [0.3, 0, 0.03], size: 1 }] },
  },
  // -- derived kinds: placed by the field from `swarm` / `silhouette` ----------
  squad: { blend: 'normal', colour: 'tint', glow: null, anchors: {} },
  swarmBee: { blend: 'normal', colour: 'tint', glow: null, anchors: {} },
  carrier: { blend: 'normal', colour: 'tint', glow: null, anchors: {} },
};

/** The anchors a kind has on a family: its own row, else `any`, else none. */
export function anchorsOf(kind: SceneKind, family: Family | null): readonly PropAnchor[] {
  const entry = PROP_KIT[kind];
  if (family !== null) {
    const own = entry.anchors[family];
    if (own !== undefined) return own;
  }
  return entry.anchors.any ?? [];
}

/**
 * Can this kind be drawn on this body at all? A joint anchor needs a model; a
 * `stand` anchor (the lab bench) is drawn even over the disc, because it needs
 * no rig.
 */
export function fitsFamily(kind: SceneKind, family: Family | null): boolean {
  const anchors = anchorsOf(kind, family);
  if (anchors.length === 0) return false;
  if (family !== null) return true;
  return anchors.every((anchor) => anchor.joint === 'stand');
}

/** One prop on one pose: its kind and the colour it is drawn in. Never a name. */
export interface FigureProp {
  kind: SceneKind;
  colour: string;
}

// ---------------------------------------------------------------------------
// Swarms and squads (T9: Ant-Man's Air Force; the Agents of S.H.I.E.L.D.)
// ---------------------------------------------------------------------------

/** How far the ring's members stand from its centre, in figure units. */
export const RING_RADIUS = 0.42;
/** A ring member's own height, in figure units. */
export const RING_MEMBER = 0.42;
/**
 * The procedural bee's width over its height (its wingspan): `scene/props.ts`
 * builds it to exactly this, and the clamp below is only honest if the two agree
 * (`web/test/traits.test.ts` holds them together).
 */
export const SWARM_BEE_RATIO = 1.4;
/**
 * A squad follower's size against its leader, and where it stands: a WEDGE —
 * one each side, a step back (the second verification pass). Slice 3 stood them
 * 0.16 to the side and 0.32 behind, almost along the camera's axis, and from the
 * table view the Agents were one agent with a doubled outline. 0.46 apart the
 * three heads are three heads from every view; the width clamp (D65, strict)
 * shrinks the whole squad to fit its one rank slot, which is the honest price of
 * three bodies in one slot. `traits.test.ts` rasterises the three heads from
 * both seats.
 */
export const SQUAD_MEMBER = 0.78;
export const SQUAD_OFFSET_X = 0.46;
export const SQUAD_OFFSET_Z = -0.2;

export interface SwarmMember {
  /** Figure-space offset from the figure's root, before the ring turns. */
  x: number;
  y: number;
  z: number;
  /** The member's own size, in figure units. */
  size: number;
  /** A per-member phase, so the ring does not bob in lockstep. */
  phase: number;
}

/**
 * **The members of a swarm, as offsets** — a pure function of the count and the
 * formation, so the width clamp and the census can read it with no renderer.
 *
 * A `ring` is `count` members evenly round the figure's root at
 * {@link RING_RADIUS}, stepped in height so it reads as a cloud; the renderer
 * turns the ring slowly while frames are being drawn (a function of time, like
 * the `presence` bob). A `squad` is `count` followers behind the leader —
 * alternately left and right, each rank further back.
 */
export function swarmMembers(count: number, formation: Formation): SwarmMember[] {
  const out: SwarmMember[] = [];
  const n = Math.max(0, Math.floor(count));
  for (let i = 0; i < n; i++) {
    if (formation === 'ring') {
      const angle = (i / n) * Math.PI * 2;
      out.push({
        x: Math.sin(angle) * RING_RADIUS,
        y: 0.06 + 0.16 * ((i * 3) % n) / Math.max(1, n - 1),
        z: Math.cos(angle) * RING_RADIUS,
        size: RING_MEMBER,
        phase: angle,
      });
    } else {
      const side = i % 2 === 0 ? 1 : -1;
      const rank = Math.floor(i / 2) + 1;
      out.push({
        x: side * SQUAD_OFFSET_X * rank,
        y: 0,
        z: SQUAD_OFFSET_Z * rank,
        size: SQUAD_MEMBER,
        phase: i,
      });
    }
  }
  return out;
}

/**
 * **How wide a swarm is, in figure units** — what `figures/pose.ts` feeds the
 * width clamp (D65, strict for every archetype, and so for a swarm too).
 *
 * `memberRatio` is a member's width over its height; `leaderRatio` the leader's
 * (0 for a ring, whose leader is not drawn). A ring's members turn, so its span
 * is the ring's diameter plus one member whichever way it faces.
 */
export function swarmSpan(
  count: number,
  formation: Formation,
  memberRatio: number,
  leaderRatio: number,
): number {
  let half = formation === 'ring' ? 0 : leaderRatio / 2;
  for (const member of swarmMembers(count, formation)) {
    const reach = formation === 'ring' ? RING_RADIUS : Math.abs(member.x);
    half = Math.max(half, reach + (member.size * memberRatio) / 2);
  }
  return half * 2;
}

// ---------------------------------------------------------------------------
// The carrier (T10)
// ---------------------------------------------------------------------------

/**
 * The carrier silhouette's proportions, in units of its own LENGTH (`pose.width`
 * is that length in world units): the hull's thickness is what `pose.height`
 * carries, so a tether aimed at a Helicarrier hits the hull and not the air above
 * it. `scene/props.ts` builds the geometry to these numbers.
 *
 * 1.5 world units long (slice 3 drew it 1.85 and the verification pass found its
 * rotor pods over the heads of the figures below it — see `layout.ts`'s
 * `SILHOUETTE_ALTITUDE`, which rose by 0.4 in the same change): still two rank
 * slots long, which is what makes it read as a ship rather than a drone.
 */
export const CARRIER_LENGTH = 1.5;
export const CARRIER_THICKNESS = 0.2;

/**
 * The carrier geometry's bounds, in units of its LENGTH (bow at +x, before the
 * pose turns it): what `figure-pose.test.ts` projects through the table camera to
 * prove the silhouette covers no figure, and what `traits.test.ts` holds the
 * built geometry to — so the two cannot drift apart.
 */
export const CARRIER_BOUNDS = {
  x: [-0.52, 0.56],
  y: [-0.045, 0.24],
  z: [-0.36, 0.36],
} as const;
