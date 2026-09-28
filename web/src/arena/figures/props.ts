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

import { baseModelOf } from './rests.ts';
import type { ModelData, Stance } from './types.ts';

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
  // Lane BODIES (D143): a long coat's skirt as panels that follow the legs, and a
  // cloak's panels down the back — the drape is the clip lane's own pose.
  'coatTails',
  'cape',
  // Lane BODIES: a realistic-sized pistol in the hand (Peggy at the ready) — the
  // `pistol`'s geometry at 60%, with no lit muzzle: a detail, where Agent 13's
  // `pistol` is an identity.
  'sidearm',
] as const;
export type PropKind = (typeof PROP_KINDS)[number];

/**
 * The kinds a trait produces WITHOUT naming them: a squad's followers
 * (`formation: "squad"`), a swarm's members (`formation: "ring"`) and a vehicle's
 * silhouette (`silhouette: "carrier"`). They are drawn by the same field, at one
 * draw call per kind, and are never written in a `props` list.
 */
export const DERIVED_KINDS = [
  'squad',
  'swarmBee',
  'carrier',
  // Lane BODIES: a person's face (D142) and hair (D141), from the trait's `face`
  // and `hair`, on every proportioned body that is not anonymous. `facePatched`
  // is the face with HIS left eye left out, for a card that wears an eyepatch
  // over it (Fury) — the patch floats in front of the face, and from the table
  // view's height the eye under it showed above it.
  'face',
  'facePatched',
  // The second fix pass (D149): the same two faces set in GRIT — brows down in a
  // V, eyes narrowed, teeth set — worn while the snapshot says the figure is
  // kneeling (tapped), attacking or blocking. An expression is a pose.
  'faceGrit',
  'facePatchedGrit',
  'hairParted',
  'hairLong',
  'hairCrop',
  'hairBob',
  'hairWaves',
  'hairBun',
] as const;
export type DerivedKind = (typeof DERIVED_KINDS)[number];

// ---------------------------------------------------------------------------
// Lane BODIES — hair (D141) and the face (D142)
// ---------------------------------------------------------------------------

/**
 * **The hairstyles** a `traits.json` row may name in `hair`. Each is a SHARED
 * kind drawn by the prop field — one draw call per style on the table, never one
 * per figure — rigid on the `Head` joint, in the costume's `hair` colour.
 *
 *  - `parted` and `long` are the Universal Base Characters' own two hairstyles
 *    (Hair_SimpleParted on the man, Hair_Long on the woman — the only two the
 *    committed `figures.glb` carries). `scene/models.ts` carves them off the
 *    bodies at load (every vertex of each is weighted 100% to `Head`, so each is
 *    rigid by construction), and a figure stands in the bald body with its hair
 *    as a prop.
 *  - `crop`, `bob`, `waves` and `bun` are procedural shells round the same head,
 *    built by `scene/props.ts` — until the pack's other hairstyles are in the
 *    library (PLAN.md's lane BODIES follow-up 2: it needs the user's approval
 *    in chat to download the pack again).
 *  - `none` is bald: the body's skin, and no hair kind at all.
 */
export const HAIR_STYLES = ['parted', 'long', 'crop', 'bob', 'waves', 'bun', 'none'] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

const HAIR_STYLE_SET: ReadonlySet<string> = new Set<string>(HAIR_STYLES);

export function isHairStyle(value: string): value is HairStyle {
  return HAIR_STYLE_SET.has(value);
}

/** A style → the scene kind that draws it (`none` draws nothing). */
export const HAIR_KIND: Readonly<Record<Exclude<HairStyle, 'none'>, DerivedKind>> = {
  parted: 'hairParted',
  long: 'hairLong',
  crop: 'hairCrop',
  bob: 'hairBob',
  waves: 'hairWaves',
  bun: 'hairBun',
};

/** The two styles carved off the library's bodies, and which body each comes from. */
export const CARVED_HAIR: Readonly<Partial<Record<HairStyle, string>>> = { parted: 'agent', long: 'hero' };

/**
 * **A body's own hair**, when no rung names one: the style the Universal Base
 * Character wore in the pack — the man's parted, the woman's long — so a card
 * with no `hair` row looks exactly as it did before the carve. Keyed by the BASE
 * model id (`models.json`'s); a body not named here wears none.
 */
export const BODY_HAIR: Readonly<Record<string, HairStyle>> = { agent: 'parted', scientist: 'parted', hero: 'long' };

/**
 * Whether a figure has a face: `on` for every person unless a row says `none` (a
 * hood, a helm); `patched` is the face without HIS left eye, under an eyepatch.
 */
export const FACE_STYLES = ['on', 'patched', 'none'] as const;
export type FaceStyle = (typeof FACE_STYLES)[number];

/** A face style → the scene kind that draws it (`none` draws nothing). */
export const FACE_KIND: Readonly<Record<Exclude<FaceStyle, 'none'>, DerivedKind>> = {
  on: 'face',
  patched: 'facePatched',
};

export function isFaceStyle(value: string): value is FaceStyle {
  return (FACE_STYLES as readonly string[]).includes(value);
}

/**
 * **A face's expression** (the second fix pass, D149; report 15 §6.2's neutral /
 * grit / pain): `neutral` at rest, `grit` while the figure kneels, attacks or
 * blocks — a POSE, read off the stance the snapshot gives (`expressionOf`), so a
 * skip, a scrub and a resync all draw it. Pain on a hit is a CUE (the clip lane's
 * `hit`) and lane MOTION's; it is not here.
 */
export const EXPRESSIONS = ['neutral', 'grit'] as const;
export type Expression = (typeof EXPRESSIONS)[number];

/** The stance → the expression a face wears in it. */
export function expressionOf(stance: Stance): Expression {
  return stance === 'crouch' || stance === 'attacking' || stance === 'blocking' ? 'grit' : 'neutral';
}

/** A face style in grit → the scene kind that draws it (`FACE_KIND` is neutral's). */
export const GRIT_FACE_KIND: Readonly<Record<Exclude<FaceStyle, 'none'>, DerivedKind>> = {
  on: 'faceGrit',
  patched: 'facePatchedGrit',
};

/** The kind a face style draws in an expression, or `null` for `none`. */
export function faceKindOf(style: FaceStyle, expression: Expression): DerivedKind | null {
  if (style === 'none') return null;
  return expression === 'grit' ? GRIT_FACE_KIND[style] : FACE_KIND[style];
}

/**
 * Whether the art rung speaks for a card (lane BODIES, D144): `art` lets its
 * painting colour what no hand-written row does (the default); `off` keeps the
 * colour identity.
 */
export const PALETTE_USES = ['art', 'off'] as const;
export type PaletteUse = (typeof PALETTE_USES)[number];

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
 * **Slice 4 — the costume slots**, in the order a body's vertices carry them.
 *
 * `tools/build-figures.mjs` writes every humanoid vertex's slot INDEX into the
 * custom attribute `_REGION` (from the joint that moves it — the head, the
 * spine, a hand, a thigh, a foot — and two measured bands: a V down the chest
 * front for the shirt, a band at the waist for the belt; the hair is its own
 * mesh), and `scene/holoMaterial.ts` looks the slot's colour up in the figure's
 * own palette. So a card's `traits.json` `costume` paints a person — Peggy's blue
 * jacket over a white shirt — with no texture, one program and no per-frame work.
 * **The order is the contract**: the build imports this array, the shader
 * indexes by it, and `traits.test.ts` holds the two together.
 */
export const COSTUME_SLOTS = ['skin', 'hair', 'top', 'shirt', 'legs', 'shoes', 'gloves', 'belt'] as const;
export type CostumeSlot = (typeof COSTUME_SLOTS)[number];

/**
 * **Slice 4 — which body a humanoid card stands in**: the proportioned
 * `human` bodies (Quaternius's Universal Base Characters — the default), or the
 * Kenney `chibi` bodies slices 1–3 used, kept in the library as the fallback a
 * `traits.json` row may ask for with `"body": "chibi"` (nothing was lost).
 */
export const BODY_STYLES = ['human', 'chibi'] as const;
export type BodyStyle = (typeof BODY_STYLES)[number];

/**
 * The body families a prop is fitted to. **`human`** (slice 4) is the
 * proportioned body — Quaternius's Universal Base Characters on the animation
 * library's 65-joint rig, the default for every humanoid card; **`humanoid`** is
 * the chibi fallback (the three Kenney bodies share one 7-joint rig, D73), kept
 * for a `traits.json` row that asks for `"body": "chibi"`; the drone and the bee
 * have skeletons of their own.
 */
export type Family = 'human' | 'humanoid' | 'drone' | 'insect';

/** A model id → the family its props are fitted to, or `null` for the disc. */
export function familyOf(variantId: string | null, models?: ModelData): Family | null {
  if (variantId === null) return null;
  // Lane BODIES (D140): a resting-pose variant (`agent@folded`) is its body's.
  const modelId = baseModelOf(variantId);
  const entry = models?.models[modelId];
  if (entry?.rig === 'ubc') return 'human';
  if (entry?.rig === 'kenney-mini') return 'humanoid';
  if (entry !== undefined) {
    if (modelId === 'drone') return 'drone';
    if (modelId === 'insect') return 'insect';
    return null;
  }
  // No manifest (a test that does not load one): the ids say it.
  if (modelId === 'agent' || modelId === 'hero' || modelId === 'scientist') return 'human';
  if (modelId.endsWith('-chibi')) return 'humanoid';
  if (modelId === 'drone') return 'drone';
  if (modelId === 'insect') return 'insect';
  return null;
}

/** Does this family wear a costume — i.e. do its vertices carry costume slots? */
export function wearsCostume(family: Family | null): boolean {
  return family === 'human' || family === 'humanoid';
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
  /**
   * **Slice 4 — the pose the anchor is written in**, when it is not the bind
   * pose: the body's own clip key and a phase, 0…1. A prop held in a hand is
   * placed where the hand IS in that pose (Agent 13's pistol in her two-handed
   * aim) and then follows the hand wherever the clip lane takes it — at rest it
   * hangs at her side, pointing down. Joint anchors only.
   */
  pose?: { readonly clip: string; readonly phase: number };
  /**
   * **Lane BODIES' fix pass — a panel that FOLLOWS a second joint part-way**
   * (D143, amended by D146): the prop sits where `joint` puts it, turned `weight`
   * (0…1) of the way toward where `follow.joint` would put it — each joint's own
   * skinning of the SAME anchor, the rotations slerped and the positions and
   * scales lerped. A rigid panel skinned to two bones, which is what a skirt over
   * a thigh is: the coat's front follows its leg about half-way and its side a
   * third, so a kneel or a lunge turns a panel by a FRACTION of the leg's angle
   * and never edge-on to the lens. A renderer that bakes props rigidly (the
   * duelists, `DuelistLayer`) ignores it and keeps the panel on `joint` alone —
   * which is why `joint` is the steady bone (the pelvis) and `follow` the moving
   * one. Joint anchors only, and not with `pose`.
   */
  follow?: { readonly joint: string; readonly weight: number };
  /**
   * **… and a panel that HANGS from the anchor before it** in the kind's list
   * (D146): its top at that panel's lower edge (`HANG_FROM` × `COAT_PANEL.length`
   * below the parent's top, in the parent's own units), turned `hang` (0…1) of the way from the
   * parent's angle back toward the figure's UPRIGHT — gravity as a pose, not a
   * simulation, and no clock. The skirt's lower link rides the upper one and falls
   * from the knee, so a calf that lies flat in a kneel, or kicks back in a lunge,
   * carries no panel with it (the first cut rode the calf bone, and a kneeling
   * Fury trailed an edge-on sliver across his card). `joint` and `at` are where a
   * rigid baker puts it: directly under its parent in the bind pose. Joint
   * anchors only; a panel kind only (`coatTails`, `cape` — `traits.test.ts`).
   */
  hang?: number;
}

/** How a kind is drawn. Every kind shares one shader program (`scene/props.ts`). */
export type PropBlend = 'normal' | 'additive';

/**
 * A kind's colour when the row gives no `accent`: `accent` (the row's accent,
 * falling back to the body tint), `tint` (always the body tint), `hair` (the
 * costume's `hair` slot — lane BODIES' hairstyles) or a fixed hex — an eyepatch
 * is black and a laser is red whatever the card's colour is.
 */
export type PropColour = 'accent' | 'tint' | 'hair' | `#${string}`;

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

// Slice 4 — the proportioned bodies (Universal Base Characters, head ×1.3),
// measured in their BIND (T-)pose by docs/evidence/m7-tier2-slice4.md's scratch
// measure, both bodies within 0.01 of each other: the head (face and hair) spans
// y 0.81–1.0, ±0.061 wide, face front z +0.079, back −0.07 (the woman's long hair
// −0.11); the Head joint at (0, 0.84, −0.01); the chest (spine_03) at y 0.69,
// front z +0.065, back −0.084; the pelvis at (0, 0.50, −0.02); the shoulders
// (upperarm) at x ±0.11, y 0.765; the hands, T-posed, at x ±0.37. In the resting
// idle the arms hang: the hands at (±0.16, 0.51), the head top at 0.98.
const HUMAN_HEAD: readonly [number, number, number] = [0, 0.905, 0.004];

/**
 * The pistol, in figure space: its grip in her RIGHT HAND **in her aim** — the
 * body's `pistolDraw` (the library's Pistol_Shoot) at `attacking`'s resting phase
 * — barrel straight ahead, {@link PISTOL_SIZE} long in its own units, and the
 * muzzle's point derived from the three so the lit tip and the barrel cannot drift
 * apart (`scene/props.ts` builds the barrel's tip at unit z = 1.25, y = 0.25, and
 * `web/test/facing.test.ts` holds the cue's muzzle flash to this point).
 *
 * **Slice 4: in her hand, not at her hip.** A proportioned body aims with its
 * arms, and a pistol pinned to the torso floated at her hip while she aimed with
 * empty hands (photographed at `g2`@157). The anchor is written in the AIM pose
 * ({@link PropAnchor.pose}) on the `hand_r` joint, so the pistol is in her hands
 * while she attacks — which is when the cue's muzzle flash, at this point, fires —
 * and hangs at her side, pointing down, while she rests. Measured on the woman's
 * body: her right hand at (−0.070, 0.750, 0.191) in the aim, her left at
 * (−0.063, 0.719, 0.172), her forearm pointing straight ahead. The chibi fallback
 * carries the same numbers on its torso, so the flash is on its pistol too.
 */
export const PISTOL_GRIP: readonly [number, number, number] = [-0.068, 0.742, 0.205];
export const PISTOL_YAW = 0;
export const PISTOL_SIZE = 0.14;
/** The pose the pistol and its muzzle are written in (see {@link PISTOL_GRIP}). */
export const PISTOL_POSE = { clip: 'pistolDraw', phase: 0.45 } as const;
export const PISTOL_TIP_LOCAL: readonly [number, number, number] = [0, 0.25, 1.25];
export const PISTOL_MUZZLE: readonly [number, number, number] = [
  PISTOL_GRIP[0] + PISTOL_SIZE * PISTOL_TIP_LOCAL[2] * Math.sin(PISTOL_YAW),
  PISTOL_GRIP[1] + PISTOL_SIZE * PISTOL_TIP_LOCAL[1],
  PISTOL_GRIP[2] + PISTOL_SIZE * PISTOL_TIP_LOCAL[2] * Math.cos(PISTOL_YAW),
];

/** Degrees → radians, for the anchors written below. */
function rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * **Lane BODIES — where the coat's skirt and the cloak hang from**, in figure
 * units on the proportioned body: the waist a little above the hip joints (the
 * thighs pivot at y 0.51) and on the body's centre line, so every panel's arc is
 * centred on the body whichever leg bone carries it. The chibi's hips are at 0.26.
 */
export const COAT_WAIST: readonly [number, number, number] = [0, 0.525, -0.03];
/**
 * **The coat's BODY link** (lane BODIES' second pass): where the panels between
 * the coat's yoke and its skirt hang from — just inside the yoke's hem, on
 * `spine_01` (at y 0.565, the lowest spine joint), so a pose that bends the
 * chest (the scientists' `working` lean, the kneel) swings the yoke with the
 * chest and leaves the body of the coat hanging with the hips. A rigid shell
 * from the shoulders to the hip tilted as a whole and stood out behind the back
 * like a barrel. `COAT_BODY` scales `COAT_PANEL` to reach the skirt's top.
 */
export const COAT_CHEST: readonly [number, number, number] = [0, 0.675, -0.024];
const COAT_BODY: readonly [number, number, number] = [0.9, 0.75, 0.9];
/**
 * **Where a hanging panel meets the one above it** (D146): this far down the
 * parent's length, not at its very hem — so the lower link wraps OUTSIDE the
 * parent's last eighth, and when the leg turns the upper link the seam between
 * them is an overlap, never a gap. `scene/props.ts` hangs the child from here.
 */
export const HANG_FROM = 0.88;
/**
 * The two links of a skirt panel, as scales of `COAT_PANEL`: hip→knee, then knee
 * to just below it. **The second fix pass (D147) cut the coat to the body**: the
 * verifier found Fury's coat "a wide bell that hides his legs" and the Bold
 * Biochemist's "a huge white bell … that swallows the figure" — the panels were
 * 0.16–0.26 from the body's axis round a waist 0.08 wide and 0.13 deep (measured
 * on the bodies, docs/evidence/bodies.md §8), on an axis 2 cm in front of the
 * body's own. Now the axis is the body's (`COAT_WAIST`'s z), the skirt stands a
 * finger's width off the hips and flares only to cover a stance's knees, and the
 * hem is just below the knee (y ≈ 0.25), where it was mid-calf (0.16).
 */
const COAT_UPPER: readonly [number, number, number] = [1.04, 0.91, 1.04];
// D146's rule, D147's numbers: the lower link's top (0.145) just outside the
// upper link's radius where it hangs from it (0.144), and 0.1 long.
const COAT_LOWER: readonly [number, number, number] = [1.16, 0.45, 1.16];
/**
 * The knee: where a skirt's lower link hangs from — `HANG_FROM` down the upper
 * link from the waist (the calves pivot at y 0.29). A rigid baker (the duelists)
 * puts the lower link here; the prop field hangs it from the upper link's own
 * point there, wherever the thigh has taken it.
 */
export const COAT_KNEE: readonly [number, number, number] = [0, 0.525 - 0.22 * 0.91 * HANG_FROM, -0.03];
/**
 * **How much of its leg a skirt panel follows** (D146), measured in the workshop
 * at ready, kneeling and attacking, from the table view and at 1×: the FRONT
 * panels drape over the thigh and follow it about half-way; the SIDE panels a
 * third, so a stride opens the coat without swinging its sides out as flaps; the
 * back hangs from the pelvis alone. The lower link hangs from the upper one's
 * hem, turned most of the way back to the upright.
 */
export const SKIRT_FOLLOW = { front: 0.38, side: 0.22, hang: 0.8 } as const;
export const CAPE_SHOULDERS: readonly [number, number, number] = [0, 0.79, -0.018];
const CHIBI_WAIST: readonly [number, number, number] = [0, 0.29, -0.035];
const CHIBI_CHEST: readonly [number, number, number] = [0, 0.4, -0.035];
const CHIBI_BODY: readonly [number, number, number] = [1.5, 0.45, 1.5];
const CHIBI_TAIL: readonly [number, number, number] = [1.5, 0.95, 1.5];

/**
 * **One panel of a coat's skirt or a cloak**, in its own units at size 1: an arc
 * of a flared cone centred on +Z, its top edge at y = 0 and its hem `COAT_PANEL.
 * length` below, from radius `top` to `hem`, `arc` degrees wide. `scene/props.ts`
 * builds it to these numbers and `traits.test.ts` holds the two together.
 */
export const COAT_PANEL = { top: 0.125, hem: 0.14, length: 0.22, arc: 80 } as const;

/**
 * **The coat's front panels' yaw**, degrees either side of the figure's front
 * (D147): 54°, so with an 80° arc the coat is open 28° down the front — worn open,
 * as a trench coat and a lab coat are. D146's 46° left it 12° open, and a closed
 * bell is what the verifier read from above.
 */
export const COAT_FRONT = 54;

/**
 * **One side of a skirt, as two links** (D146): hip → knee on the pelvis,
 * following `thigh` by `follow`; then knee → calf, hanging from it. Written as a
 * pair because the second anchor HANGS from the one before it in the list.
 */
function skirtLink(degrees: number, thigh: string, follow: number): readonly PropAnchor[] {
  return [
    { joint: 'pelvis', follow: { joint: thigh, weight: follow }, at: COAT_WAIST, turn: [0, rad(degrees), 0], size: COAT_UPPER },
    { joint: 'pelvis', hang: SKIRT_FOLLOW.hang, at: COAT_KNEE, turn: [0, rad(degrees), 0], size: COAT_LOWER },
  ];
}

/**
 * Lane BODIES — a face or a hairstyle is written in FIGURE units round the
 * proportioned head, so its anchor is the head joint with no offset.
 */
const HEAD_ORIGIN: PropAnchor = { joint: 'Head', at: [0, 0, 0], size: 1 };

/**
 * **The proportioned head, measured** (lane BODIES, on the committed
 * `figures.glb` in its bind pose — docs/evidence/bodies.md): the skull's centre
 * and half-extents that the procedural hairstyles are shells round, and the face
 * landmarks the procedural face is laid on. Both bodies agree within 0.01.
 */
export const HEAD_SHAPE = {
  centre: [0, 0.905, -0.004] as readonly [number, number, number],
  radii: [0.064, 0.088, 0.071] as readonly [number, number, number],
  /** Eye centres (x ±), their height, and the face's front there. */
  eye: { x: 0.0225, y: 0.912, z: 0.061 },
  brow: { y: 0.927, z: 0.062 },
  mouth: { y: 0.862, z: 0.056 },
} as const;

export const PROP_KIT: Readonly<Record<SceneKind, PropKitEntry>> = {
  // Wasp's four insect wings on her back; an extra, larger pair on a bee.
  wings: {
    blend: 'normal',
    colour: 'accent',
    glow: null,
    anchors: {
      human: [{ joint: 'spine_03', at: [0, 0.76, -0.09], turn: [-0.25, 0, 0], size: 0.46 }],
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
    anchors: {
      human: [{ joint: 'Head', at: HUMAN_HEAD, size: [0.08, 0.1, 0.09] }],
      humanoid: [{ joint: 'head', at: HEAD_CENTRE, size: [0.385, 0.285, 0.3] }] },
  },
  // A.I.M.'s beekeeper bucket: a cylinder over the head with a dark visor slot.
  hood: {
    blend: 'normal',
    colour: 'accent',
    glow: null,
    anchors: {
      human: [{ joint: 'Head', at: [0, 0.915, 0.004], size: [0.082, 0.105, 0.092] }],
      humanoid: [{ joint: 'head', at: [0, 0.77, 0], size: [0.37, 0.28, 0.3] }] },
  },
  // Twin thrusters on the back.
  jetpack: {
    blend: 'normal',
    colour: 'tint',
    glow: null,
    anchors: {
      human: [{ joint: 'spine_03', at: [0, 0.7, -0.115], size: 0.08 }],
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
      human: [{ joint: 'spine_03', at: [0, 0.62, -0.115], size: 0.08 }],
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
      human: [{ joint: 'Head', at: [-0.026, 0.915, 0.077], size: [0.02, 0.02, 0.01] }],
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
    anchors: {
      human: [{ joint: 'hand_r', at: PISTOL_GRIP, turn: [0, PISTOL_YAW, 0], size: PISTOL_SIZE, pose: PISTOL_POSE }],
      humanoid: [{ joint: 'torso', at: PISTOL_GRIP, turn: [0, PISTOL_YAW, 0], size: PISTOL_SIZE }] },
  },
  // **Lane BODIES — a sidearm**: the pistol's own geometry at 60% in the right
  // hand, gunmetal whatever the card's accent (Peggy's accent is her red hat),
  // gripped exactly as the pistol is — its anchor is written in the same aim pose
  // — so it follows the hand into any resting pose (`figures/rests.ts`).
  sidearm: {
    blend: 'normal',
    colour: '#8f98a8',
    glow: null,
    anchors: {
      human: [{ joint: 'hand_r', at: PISTOL_GRIP, turn: [0, PISTOL_YAW, 0], size: PISTOL_SIZE * 0.6, pose: PISTOL_POSE }],
      humanoid: [{ joint: 'torso', at: PISTOL_GRIP, turn: [0, PISTOL_YAW, 0], size: PISTOL_SIZE * 0.6 }] },
  },
  // The pistol's muzzle, lit at rest (a pose: the gun is drawn) and flaring with
  // the clip lane — her attack's pistolDraw is the `attack` request, so the
  // emitter hook fires it with the muzzle-flash cue.
  muzzle: {
    blend: 'additive',
    colour: '#ffcf7a',
    glow: { rest: 1.0, boost: 1.3 },
    anchors: {
      human: [{ joint: 'hand_r', at: PISTOL_MUZZLE, size: 0.04, pose: PISTOL_POSE }],
      humanoid: [{ joint: 'torso', at: PISTOL_MUZZLE, size: 0.06 }] },
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
      human: [{ joint: 'Head', at: [0, 0.915, 0.004], size: [0.072, 0.1, 0.085] }],
      drone: [{ joint: 'Head', at: [0, 0.47, 0], size: [0.318, 0.4, 0.318] }],
      humanoid: [{ joint: 'head', at: [0, 0.735, 0], size: [0.35, 0.3, 0.262] }],
    },
  },
  // Fury's long coat: a shell from the shoulders, wrapped round the front with two
  // lit lapels, and a stand-up collar with a lit rim that reads from behind (the
  // second verification pass: from the table view his coat was behind your own
  // Fury and out of view). **Lane BODIES (D143): it is the YOKE** — shoulders to
  // the chest — and the coat's body and skirt below are `coatTails`, panels on
  // the spine and the legs, because a rigid shell to the knee was a white box to
  // the floor under a kneeling Biochemist (D97's known cost), and a rigid shell
  // to the hip swung out behind a Biochemist bent over his bench.
  coat: {
    blend: 'normal',
    colour: 'accent',
    glow: null,
    anchors: {
      human: [{ joint: 'spine_03', at: [0, 0.79, -0.005], size: 1 }],
      humanoid: [{ joint: 'torso', at: [0, 0.52, -0.035], size: [1.75, 0.9, 2.0] }] },
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
    anchors: {
      human: [{ joint: 'Head', at: HUMAN_HEAD, size: [0.078, 0.1, 0.088] }],
      humanoid: [{ joint: 'head', at: HEAD_CENTRE, size: [0.338, 0.245, 0.27] }] },
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
      human: [
        { joint: 'spine_03', at: [0.045, 0.72, 0.075], turn: [-0.35, 0, 0], size: 0.065 },
        { joint: 'spine_03', at: [0, 0.7, -0.1], turn: [0.45, Math.PI, 0], size: 0.1 },
      ],
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
    anchors: {
      human: [{ joint: 'spine_03', at: [-0.005, 0.72, 0.09], turn: [-0.15, 0, 0], size: 0.13 }],
      humanoid: [{ joint: 'torso', at: [-0.02, 0.35, 0.17], turn: [-0.55, 0, 0], size: 0.26 }] },
  },
  // Quake's gauntlets: one glowing fist per hand.
  gauntlets: {
    blend: 'additive',
    colour: 'accent',
    glow: { rest: 0.75, boost: 1.2 },
    anchors: {
      human: [
        { joint: 'hand_l', at: [0.4, 0.765, -0.02], size: 0.035 },
        { joint: 'hand_r', at: [-0.4, 0.765, -0.02], size: 0.035 },
      ],
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
    anchors: {
      human: [{ joint: 'lowerarm_l', at: [0.3, 0.765, 0.05], turn: [0, 0.45, 0], size: 0.11 }],
      humanoid: [{ joint: 'arm-left', at: [0.46, 0.4, 0.27], turn: [0, 0.45, 0], size: 0.25 }] },
  },
  // A hat with a crown and a brim, on top of the head — the part of a figure the
  // table view's steep camera sees most of. Peggy's is red.
  hat: {
    blend: 'normal',
    colour: 'accent',
    glow: null,
    anchors: {
      human: [{ joint: 'Head', at: [0, 0.95, -0.005], turn: [-0.1, 0, 0.08], size: 0.105 }],
      humanoid: [{ joint: 'head', at: [0, 0.975, -0.01], turn: [-0.1, 0, 0.08], size: 0.33 }] },
  },
  // A tiny crouching rider on the giant ant's back (the hero body, baked), in a
  // warm colour of its own so it reads against any cool mount.
  rider: {
    blend: 'normal',
    colour: '#ff7a64',
    glow: null,
    anchors: { insect: [{ joint: 'Head3', at: [0, 0.9, -0.02], size: 0.46 }] },
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
  // **Lane BODIES — the body and skirt of a long coat, which DRAPE** (D143,
  // D146): panels of one flared arc — a ring of five on the lowest spine joint
  // from the chest to the hip (the coat's body, which hangs with the hips when
  // the chest bends), then the skirt: a two-link chain front and side on each
  // leg and one panel at the back, all hanging from the PELVIS. Each upper link
  // follows its thigh part-way and each lower link hangs from the upper one's hem
  // toward the upright, so a kneeling figure's coat drapes over its knee instead
  // of standing to the floor as a box (report 15 §1.3, cause 10), a lunge opens
  // it without flinging flaps, and no panel ever rides the calf edge-on (the
  // verifier's sliver, D146). No simulation and no clock: the clip lane poses the
  // joints and the panels are where the joints put them. The front is left open
  // between the two front panels, as a coat's is. Worn with `coat`, which since
  // this lane is the YOKE: shoulders, collar and lapels.
  coatTails: {
    blend: 'normal',
    colour: 'accent',
    glow: null,
    anchors: {
      // Each side is a two-link chain — hip to knee on the thigh, knee to calf on
      // the calf — so a kneeling figure's coat falls from its knee instead of
      // standing out from its thigh as a shelf; the back hangs whole from the pelvis.
      human: [
        // The body link, chest to hip, on the lowest spine joint (COAT_CHEST).
        { joint: 'spine_01', at: COAT_CHEST, turn: [0, rad(COAT_FRONT), 0], size: COAT_BODY },
        { joint: 'spine_01', at: COAT_CHEST, turn: [0, rad(118), 0], size: COAT_BODY },
        { joint: 'spine_01', at: COAT_CHEST, turn: [0, rad(180), 0], size: COAT_BODY },
        { joint: 'spine_01', at: COAT_CHEST, turn: [0, rad(-118), 0], size: COAT_BODY },
        { joint: 'spine_01', at: COAT_CHEST, turn: [0, rad(-COAT_FRONT), 0], size: COAT_BODY },
        // The skirt, D146: each link hangs from the PELVIS; the upper one follows
        // its thigh part-way (SKIRT_FOLLOW), and the lower one hangs from the
        // upper one's hem toward the upright — never from the calf bone.
        ...skirtLink(COAT_FRONT, 'thigh_l', SKIRT_FOLLOW.front),
        ...skirtLink(118, 'thigh_l', SKIRT_FOLLOW.side),
        // The back: one link, from the waist to the lower links' hem (D147).
        { joint: 'pelvis', at: COAT_WAIST, turn: [0, rad(180), 0], size: [1.08, 1.25, 1.08] },
        ...skirtLink(-118, 'thigh_r', SKIRT_FOLLOW.side),
        ...skirtLink(-COAT_FRONT, 'thigh_r', SKIRT_FOLLOW.front),
      ],
      humanoid: [
        { joint: 'torso', at: CHIBI_CHEST, turn: [0, rad(46), 0], size: CHIBI_BODY },
        { joint: 'torso', at: CHIBI_CHEST, turn: [0, rad(118), 0], size: CHIBI_BODY },
        { joint: 'torso', at: CHIBI_CHEST, turn: [0, rad(180), 0], size: CHIBI_BODY },
        { joint: 'torso', at: CHIBI_CHEST, turn: [0, rad(-118), 0], size: CHIBI_BODY },
        { joint: 'torso', at: CHIBI_CHEST, turn: [0, rad(-46), 0], size: CHIBI_BODY },
        { joint: 'leg-left', at: CHIBI_WAIST, turn: [0, rad(46), 0], size: CHIBI_TAIL },
        { joint: 'leg-left', at: CHIBI_WAIST, turn: [0, rad(118), 0], size: CHIBI_TAIL },
        { joint: 'root', at: CHIBI_WAIST, turn: [0, rad(180), 0], size: CHIBI_TAIL },
        { joint: 'leg-right', at: CHIBI_WAIST, turn: [0, rad(-118), 0], size: CHIBI_TAIL },
        { joint: 'leg-right', at: CHIBI_WAIST, turn: [0, rad(-46), 0], size: CHIBI_TAIL },
      ],
    },
  },
  // **Lane BODIES — a cloak** (D143, D146): the same arc panel, down the BACK —
  // two from the shoulders on the chest bone, three from the hip on the pelvis,
  // the outer two following their thighs a third of the way, overlapping — so it
  // swings a little with the stride. Unlike the coat's panels it carries a TRIM
  // at its hem (the villain's gold). Doom's cloak on the villain duelist
  // (`duelists.json`), and open to any row.
  cape: {
    blend: 'normal',
    colour: 'accent',
    glow: null,
    anchors: {
      human: [
        // The shoulder panels hang INSIDE the hip panels where they overlap (D147:
        // a hem radius of 0.134 at y 0.51 against the hip panels' 0.15 top at
        // 0.525), so their trim — the cape's hem trim is on every panel — is hidden
        // under them and the gold shows only at the cape's own hem (D146). The
        // shoulders' pair stands 0.12 off the spine (the back of the shoulders is
        // 0.10 behind it); the hip panels outside every coat's back panel (0.135).
        { joint: 'spine_03', at: CAPE_SHOULDERS, turn: [0, rad(145), 0], size: [0.96, 1.27, 0.96] },
        { joint: 'spine_03', at: CAPE_SHOULDERS, turn: [0, rad(215), 0], size: [0.96, 1.27, 0.96] },
        {
          joint: 'pelvis',
          follow: { joint: 'thigh_l', weight: SKIRT_FOLLOW.side },
          at: COAT_WAIST,
          turn: [0, rad(135), 0],
          size: [1.2, 1.25, 1.2],
        },
        { joint: 'pelvis', at: COAT_WAIST, turn: [0, rad(180), 0], size: [1.22, 1.27, 1.22] },
        {
          joint: 'pelvis',
          follow: { joint: 'thigh_r', weight: SKIRT_FOLLOW.side },
          at: COAT_WAIST,
          turn: [0, rad(225), 0],
          size: [1.2, 1.25, 1.2],
        },
      ],
      humanoid: [
        { joint: 'torso', at: [0, 0.52, -0.035], turn: [0, rad(150), 0], size: [1.6, 0.95, 1.6] },
        { joint: 'torso', at: [0, 0.52, -0.035], turn: [0, rad(210), 0], size: [1.6, 0.95, 1.6] },
        { joint: 'root', at: CHIBI_WAIST, turn: [0, rad(180), 0], size: CHIBI_TAIL },
      ],
    },
  },
  // -- derived kinds: placed by the field from `swarm` / `silhouette` ----------
  squad: { blend: 'normal', colour: 'tint', glow: null, anchors: {} },
  swarmBee: { blend: 'normal', colour: 'tint', glow: null, anchors: {} },
  carrier: { blend: 'normal', colour: 'tint', glow: null, anchors: {} },
  // -- lane BODIES: derived from the trait's `face` and `hair` -----------------
  // **The face** (D142): eyes, brows and a mouth line on the proportioned head's
  // front, drawn in their own vertex colours (white eyes, ink features), rigid on
  // `Head`. Built in figure units (`scene/props.ts`), so its anchor is the origin.
  face: { blend: 'normal', colour: '#ffffff', glow: null, anchors: { human: [HEAD_ORIGIN] } },
  // The same face with HIS left eye left out, under an eyepatch (`face: patched`).
  facePatched: { blend: 'normal', colour: '#ffffff', glow: null, anchors: { human: [HEAD_ORIGIN] } },
  // Both in grit (D149): the pose's expression while kneeling, attacking or blocking.
  faceGrit: { blend: 'normal', colour: '#ffffff', glow: null, anchors: { human: [HEAD_ORIGIN] } },
  facePatchedGrit: { blend: 'normal', colour: '#ffffff', glow: null, anchors: { human: [HEAD_ORIGIN] } },
  // **The hairstyles** (D141), each rigid on `Head` in the costume's hair colour.
  hairParted: { blend: 'normal', colour: 'hair', glow: null, anchors: { human: [HEAD_ORIGIN] } },
  hairLong: { blend: 'normal', colour: 'hair', glow: null, anchors: { human: [HEAD_ORIGIN] } },
  hairCrop: { blend: 'normal', colour: 'hair', glow: null, anchors: { human: [HEAD_ORIGIN] } },
  hairBob: { blend: 'normal', colour: 'hair', glow: null, anchors: { human: [HEAD_ORIGIN] } },
  hairWaves: { blend: 'normal', colour: 'hair', glow: null, anchors: { human: [HEAD_ORIGIN] } },
  hairBun: { blend: 'normal', colour: 'hair', glow: null, anchors: { human: [HEAD_ORIGIN] } },
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
export const SQUAD_OFFSET_X = 0.34;
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
