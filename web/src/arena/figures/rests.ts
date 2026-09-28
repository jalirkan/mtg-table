/*
 * mtg-table — arena/figures/rests.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Signature resting poses, as data** (lane BODIES, report 15 §6.2 and §9.3;
 * **D156**).
 *
 * `[NO three]`, `[NO React]`, `[NO DOM]`, no clock — the same split as the rest
 * of `figures/`: this file says WHICH resting poses exist and HOW each one is
 * made from the clip library; `scene/models.ts` derives the clips at load and the
 * arena's one clip lane plays them. So `web/test/clips.test.ts` can hold every
 * pose's source clips and joints to the committed library under `node --test`.
 *
 * ---------------------------------------------------------------------------
 * **Why a pose.** The card art gives every hero an attitude — Fury with his arms
 * folded, Peggy at the ready, Quake braced — and a figure standing in the stock
 * `Idle_Loop` between cues has none (report 15 §1.3, cause 8). A resting pose is
 * what a card holds whenever nothing is happening to it, so it is a POSE (**D56**):
 * the snapshot says "this card is untapped on the battlefield", `traits.json`
 * says which of these poses the card rests in, and a skip, a backwards scrub and
 * a `resync` all draw it with no history.
 *
 * **How it reaches the clip lane — a model VARIANT, and the one reason why.** A
 * pose is a clip, derived once at load (`scene/models.ts`'s `deriveRestClip`):
 * the joints the pose HOLDS take one frame of a library clip (`from` at `phase`)
 * with the `aims` turned on top, and every other joint keeps breathing with the
 * body's own loop (`breathe`). The derived clip is the variant's `idle`, and the
 * pose's `modelId` names the variant — `agent@folded` — rather than aliasing the
 * base body's `idle`, because the figure layer plays a body's `idle` the moment it
 * mounts and the clip lane only ever stops the rest action IT started: an alias
 * would have left that first idle running at full weight under the signature pose
 * for the figure's whole life (a 50/50 blend — PLAN.md's lane BODIES follow-up 1
 * has the one-line fix for the same latent defect in a figure that mounts kneeling).
 * The breathing is the clip lane's own (`CueRunner`'s `restTime`, advanced only
 * while the queue is awake, **D58**); a held joint does not move, which is what
 * "a pose" means.
 *
 * **What it may not be.** A pose is chosen from the clip library the build
 * already retargets (report 15 §11: "a pose chosen from the library's clips is
 * data; a pose estimated from the art is a derivative"): a frame of a clip, turned
 * by a handful of joint aims written here, and never a new cue id and never a
 * ticked clock. Every pose is open to every card, like a prop kind.
 * ---------------------------------------------------------------------------
 */

/**
 * The resting poses a `traits.json` row may name in `rest`. Closed: a name nobody
 * derived is a validation error, and the ladder falls through. `stand` is the
 * body's own idle, unchanged — the pose of a card with no row.
 */
export const REST_POSES = [
  'stand',
  'folded',
  'ready',
  'aim',
  'highReady',
  'akimbo',
  'clasped',
  'braced',
  'working',
  'atEase',
] as const;
export type RestPose = (typeof REST_POSES)[number];

const REST_POSE_SET: ReadonlySet<string> = new Set<string>(REST_POSES);

export function isRestPose(value: string): value is RestPose {
  return REST_POSE_SET.has(value);
}

/**
 * Which joints a pose freezes at its `from` frame. The rest breathe.
 *
 *  - `none`: only the aimed joints are held (the arms of a fold);
 *  - `arms`: both arms, clavicle to hand;
 *  - `upper`: the spine, the neck, the head and both arms (a two-handed aim);
 *  - `all`: every joint.
 */
export type JointGroup = 'none' | 'arms' | 'upper' | 'all';

/** The proportioned body's joints, by group (the Universal Animation Library's own names). */
export const HOLD_JOINTS: Readonly<Record<Exclude<JointGroup, 'all'>, readonly string[]>> = {
  none: [],
  arms: ['clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'clavicle_r', 'upperarm_r', 'lowerarm_r', 'hand_r'],
  upper: [
    'spine_01',
    'spine_02',
    'spine_03',
    'neck_01',
    'Head',
    'clavicle_l',
    'upperarm_l',
    'lowerarm_l',
    'hand_l',
    'clavicle_r',
    'upperarm_r',
    'lowerarm_r',
    'hand_r',
  ],
};

/**
 * **Turn `joint` so the line to `child` points along `aim`** — a direction in
 * FIGURE space (+Y up, +Z the figure's front, +X its LEFT hand), the duelists'
 * own convention (`figures/duelists.json`'s `aim`). Written as a direction rather
 * than as a rotation because a direction is what an art director can read: "the
 * left forearm across the chest, toward the right hand" is `[-1, 0.2, 0.3]`, on
 * any rig whose joints carry these names, whatever their local axes are.
 */
export interface RestAim {
  joint: string;
  child: string;
  aim: readonly [number, number, number];
  /**
   * Radians the joint then ROLLS about that line (right-handed about `aim`): the
   * one degree of freedom a direction leaves open, and the one a held thing on the
   * limb shows — which way Peggy's shield faces on her raised forearm.
   */
  twist?: number;
}

export interface RestSpec {
  /** The clip key (`models.json`'s `clips`) whose frame the held joints take. */
  from: string;
  /** How far into `from`, 0…1. */
  phase: number;
  hold: JointGroup;
  /** The clip key the other joints loop — the breathing. */
  breathe: string;
  /** Applied in order, parents first, on top of `from` at `phase`. */
  aims: readonly RestAim[];
  /** What it is, for the workshop's panel and the census. */
  what: string;
}

const UP_ARM = (side: 'l' | 'r', aim: readonly [number, number, number]): RestAim => ({
  joint: `upperarm_${side}`,
  child: `lowerarm_${side}`,
  aim,
});
const FORE_ARM = (side: 'l' | 'r', aim: readonly [number, number, number], twist?: number): RestAim => ({
  joint: `lowerarm_${side}`,
  child: `hand_${side}`,
  aim,
  ...(twist === undefined ? {} : { twist }),
});

/**
 * **THE table.** Each pose's aims were set from renders at the workshop's 1×
 * framing and at the table view (docs/evidence/bodies.md), against the body's
 * measured landmarks: shoulders at (±0.11, 0.765), elbows 0.131 below them,
 * forearms 0.127 long, the pelvis at 0.50, the head's front at z +0.06 (figure
 * units: one unit tall, feet at 0, facing +Z, the figure's left at +X).
 */
export const REST_KIT: Readonly<Record<RestPose, RestSpec>> = {
  stand: { from: 'idle', phase: 0, hold: 'none', breathe: 'idle', aims: [], what: 'the body\'s own idle' },
  // Nick Fury: arms folded high across the chest, the director waiting.
  folded: {
    from: 'idle',
    phase: 0,
    hold: 'arms',
    breathe: 'idle',
    aims: [
      UP_ARM('l', [0.3, -0.72, 0.62]),
      FORE_ARM('l', [-0.9, 0.2, 0.4]),
      UP_ARM('r', [-0.3, -0.7, 0.65]),
      FORE_ARM('r', [0.9, 0.3, 0.32]),
    ],
    what: 'arms folded across the chest',
  },
  // Peggy Carter: the pistol at the low ready in her right hand, the shield arm
  // across her front.
  ready: {
    from: 'idle',
    phase: 0,
    hold: 'arms',
    breathe: 'idle',
    aims: [
      UP_ARM('r', [-0.22, -0.84, 0.5]),
      FORE_ARM('r', [0.02, -0.42, 0.9]),
      UP_ARM('l', [0.5, -0.66, 0.56]),
      FORE_ARM('l', [-0.42, 0.52, 0.74], -2.3),
    ],
    what: 'pistol up at the ready, shield arm raised across the front',
  },
  // The library's two-handed pistol aim, held. Open to any row; Agent 13 rested in
  // it until the verifier's second round, which read it from above as "the pistol
  // low at her hip" — the barrel points at a lens that looks down on it, and a gun
  // pointed at the camera is foreshortened to a stub (`highReady` below).
  aim: {
    from: 'pistolDraw',
    phase: 0.45,
    hold: 'upper',
    breathe: 'idle',
    aims: [],
    what: 'a two-handed pistol aim, held',
  },
  // **Agent 13 (the second fix pass, D165): the pistol at the HIGH READY** — the
  // spy-poster stance: her right hand up beside her face, the barrel pointing at
  // the sky, her left arm easy at her side. The arms start from the aim's own frame
  // (`pistolDraw` at the phase `PISTOL_POSE` names), so the hand keeps its grip and
  // the pistol, rigid on the hand, turns up with the forearm; the spine breathes.
  // A vertical gun beside a head reads in silhouette from every camera the table
  // has, where the aim's barrel pointed at the lens and vanished into itself.
  highReady: {
    from: 'pistolDraw',
    phase: 0.45,
    hold: 'arms',
    breathe: 'idle',
    aims: [
      UP_ARM('r', [-0.5, -0.7, 0.5]),
      FORE_ARM('r', [-0.14, 0.96, 0.24]),
      UP_ARM('l', [0.2, -0.97, 0.12]),
      FORE_ARM('l', [0.02, -0.86, 0.5]),
    ],
    what: 'the pistol at the high ready, barrel up beside the face',
  },
  // A hero's hands on the hips.
  akimbo: {
    from: 'idle',
    phase: 0,
    hold: 'arms',
    breathe: 'idle',
    aims: [
      UP_ARM('l', [0.66, -0.66, -0.36]),
      FORE_ARM('l', [-0.46, -0.72, 0.52]),
      UP_ARM('r', [-0.66, -0.66, -0.36]),
      FORE_ARM('r', [0.46, -0.72, 0.52]),
    ],
    what: 'hands on the hips',
  },
  // Coulson: relaxed, hands clasped in front. The fix pass raised them from the
  // crotch to the buckle; the verifier's second round still read them "low at the
  // groin" from above, where a lens looking down puts anything in front of the
  // belly lower on the screen than it stands. The second fix pass (D165) lifts the
  // clasp above the belt (the hands at y 0.63, the belt at 0.53) with the elbows
  // out, so the arms make a diamond round the shirt-front that the camera sees
  // from above; at the solar plexus (0.665, tried) he clutched his chest.
  clasped: {
    from: 'idle',
    phase: 0,
    hold: 'arms',
    breathe: 'idle',
    aims: [
      UP_ARM('l', [0.3, -0.86, 0.4]),
      FORE_ARM('l', [-0.74, -0.15, 0.65]),
      UP_ARM('r', [-0.3, -0.86, 0.4]),
      FORE_ARM('r', [0.74, -0.11, 0.66]),
    ],
    what: 'relaxed, hands clasped at the belt',
  },
  // Quake: the library's guard stance, both palms pushed forward. The second fix
  // pass (D165) lifts her head off the guard's downward look — the neck upright
  // and a little forward — so a lens above her finds a face under the fringe.
  braced: {
    from: 'block',
    phase: 0,
    hold: 'none',
    breathe: 'block',
    aims: [
      { joint: 'neck_01', child: 'Head', aim: [0, 0.97, 0.24] },
      UP_ARM('l', [0.42, -0.4, 0.81]),
      FORE_ARM('l', [0.08, 0.2, 0.98]),
      UP_ARM('r', [-0.42, -0.4, 0.81]),
      FORE_ARM('r', [-0.08, 0.2, 0.98]),
    ],
    what: 'a braced guard, both palms forward',
  },
  // The scientists: leaning over the bench at their left hand, hands at work on it.
  // **The third fix pass bends him from the WAIST** as well as at the chest: the
  // lean was all at `spine_03` and the neck, so the coat's body link (on
  // `spine_01`) stood upright while the chest leaned out of it, and from above
  // the verifier read that as "a separate grey panel fanning out" with "a white
  // arc beside his head". A man bent over a bench bends at the lower back too.
  working: {
    from: 'idle',
    phase: 0,
    hold: 'upper',
    breathe: 'idle',
    aims: [
      { joint: 'spine_01', child: 'spine_02', aim: [0.09, 0.96, 0.25] },
      { joint: 'spine_02', child: 'spine_03', aim: [0.12, 0.94, 0.3] },
      { joint: 'spine_03', child: 'neck_01', aim: [0.2, 0.92, 0.33] },
      { joint: 'neck_01', child: 'Head', aim: [0.34, 0.78, 0.52] },
      UP_ARM('l', [0.5, -0.74, 0.45]),
      FORE_ARM('l', [0.46, -0.62, 0.62]),
      UP_ARM('r', [0.05, -0.8, 0.6]),
      FORE_ARM('r', [0.62, -0.42, 0.66]),
    ],
    what: 'bent over the bench, hands at work',
  },
  // A soldier at ease: hands behind the back. The second fix pass (D165) brings
  // the elbows DOWN to the waist: the first aims swung the upper arms 25° back,
  // and a lens looking down from in front draws anything behind a figure HIGHER on
  // the screen, so the elbows rose beside the head and the verifier read the
  // Soldier tokens as "hands on head". Now the upper arms hang almost straight and
  // only the forearms fold in behind the small of the back.
  atEase: {
    from: 'idle',
    phase: 0,
    hold: 'arms',
    breathe: 'idle',
    aims: [
      UP_ARM('l', [0.1, -0.98, -0.16]),
      FORE_ARM('l', [-0.7, -0.46, -0.55]),
      UP_ARM('r', [-0.1, -0.98, -0.16]),
      FORE_ARM('r', [0.7, -0.46, -0.55]),
    ],
    what: 'at ease, hands behind the back',
  },
};

/** Every clip key a pose reads (`from` and `breathe`) — what `clips.test.ts` holds to the library. */
export function restClipsNeeded(): string[] {
  const out = new Set<string>();
  for (const name of REST_POSES) {
    out.add(REST_KIT[name].from);
    out.add(REST_KIT[name].breathe);
  }
  return [...out].sort();
}

/** Every joint a pose names — what `clips.test.ts` holds to the rig. */
export function restJointsNamed(): string[] {
  const out = new Set<string>();
  for (const name of REST_POSES) {
    const spec = REST_KIT[name];
    if (spec.hold !== 'all') for (const joint of HOLD_JOINTS[spec.hold]) out.add(joint);
    for (const aim of spec.aims) {
      out.add(aim.joint);
      out.add(aim.child);
    }
  }
  return [...out].sort();
}

// ---------------------------------------------------------------------------
// The variant id — `<body>@<pose>`
// ---------------------------------------------------------------------------

/**
 * The separator between a body and its resting pose in a variant id. A model id
 * in `models.json` is `[a-z0-9-]` (the build writes them), so it can never
 * contain one.
 */
export const VARIANT_SEPARATOR = '@';

/** `agent` + `folded` → `agent@folded`: the library entry `scene/models.ts` derives. */
export function restModelId(body: string, rest: RestPose): string {
  return `${body}${VARIANT_SEPARATOR}${rest}`;
}

/** `agent@folded` → `agent`; a plain id is itself. What `models.json` knows it by. */
export function baseModelOf(modelId: string): string;
export function baseModelOf(modelId: string | null): string | null;
export function baseModelOf(modelId: string | null): string | null {
  if (modelId === null) return null;
  const at = modelId.indexOf(VARIANT_SEPARATOR);
  return at < 0 ? modelId : modelId.slice(0, at);
}

/** `agent@folded` → `folded`; a plain id rests in its idle, so `null`. */
export function restOfModel(modelId: string | null): RestPose | null {
  if (modelId === null) return null;
  const at = modelId.indexOf(VARIANT_SEPARATOR);
  if (at < 0) return null;
  const rest = modelId.slice(at + 1);
  return isRestPose(rest) ? rest : null;
}
