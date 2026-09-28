/*
 * mtg-table — arena/scene/figureRigs.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The figure ref map**, exactly as `rigs.ts` is the card ref map (report 09
 * §11, E3): pose key → the objects one figure owns, so that the arena's single
 * `useFrame` can write `figurePose ⊕ offsets[card.id]` onto an `Object3D`
 * without React being involved (§9.2 rules 7 and 8).
 *
 * Keyed by **card id** rather than by placement key, which is the one difference
 * from `rigs.ts` and is not an accident: a card can be *mounted* twice (the
 * battlefield copy and the stack copy, hence `c:` / `s:` keys there) but it
 * **stands** in exactly one place. `figure-pose.test.ts` asserts one pose per
 * battlefield creature over all 3,679 board frames.
 *
 * The mixer lives here and is advanced **only** from `CueRunner.tsx`. drei's
 * `useAnimations` would put a `useFrame` behind every creature on the table
 * (report 12 §5.4, measured in `@react-three/drei@9.122.0`), which is the rule
 * report 09 §9.2 exists to keep: one frame loop, in one file, auditable.
 */

import type * as THREE from 'three';

import type { FigurePose } from '../figures/pose.ts';
import type { FigureMaterial } from './figureMaterial.ts';

export interface FigureRig {
  /** The group that carries the pose. One per figure with a model. */
  root: THREE.Object3D;
  /**
   * The mixer, built by hand in `FigureLayer` and ticked with a **zero delta**
   * from the one `useFrame` — the cue owns `action.time` (§3.4), the mixer never
   * owns a clock of its own. T2 holds a static `idle`; T3 drives `t`.
   */
  mixer: THREE.AnimationMixer;
  /** Clip key (`idle`, `attack`, an alias) → its action on this figure: the CUE lane's. */
  actions: Map<string, THREE.AnimationAction>;
  /**
   * The same keys → the REST lane's actions, each on the clip's `restTwin`
   * (`models.ts`). Two maps so that `rest` and `clip` are never one action, even
   * when the stance and the cue name the same clip: their weights then always sum
   * to 1 and the stance is always a pose of its own to blend from.
   */
  restActions: Map<string, THREE.AnimationAction>;
  /**
   * **The clip lane's two live actions** (report 13 §3.3, T3).
   *
   * `rest` is the stance the snapshot says this figure holds — pose, so it
   * survives `skip all` and a backwards scrub — and `clip` is the transient a cue
   * is playing over it, at `1 − weight` / `weight`. They are held here rather
   * than looked up each frame so that `enabled` is toggled **only when the
   * selection changes**: an action left `enabled` is one the mixer interpolates
   * every tick, and twelve figures × twelve clips is the difference between
   * "ticking two actions" and "ticking a hundred and forty-four".
   */
  rest: THREE.AnimationAction | null;
  clip: THREE.AnimationAction | null;
  /**
   * §8.3 rule 1's middle path, and **user decision 7**: how far this figure has
   * breathed. It advances **only while the queue is non-idle** — i.e. only while
   * the frame loop is awake anyway — so the measured zero idle frames of
   * `frameloop='demand'` are untouched, and it is *held* rather than reset when
   * the queue empties, so a figure does not snap back to frame 0 of its idle the
   * moment the last cue ends.
   */
  restTime: number;
  /** This figure's own holographic material. One program, one instance per tint. */
  material: FigureMaterial;
  /** The pose of the frame currently on screen. Replaced, never merged (P5). */
  pose: FigurePose;
  /**
   * The tint string last written into the uniform.
   *
   * `THREE.Color.set('#f6f0d8')` parses a string every call, and the frame loop
   * would do it once per figure per frame for a value that changes about once a
   * game. Caching the string is the same discipline as `SceneStage`'s pooled
   * `Offset`: §9.2 rule 6 is about the hot path, and this is the hot path.
   */
  appliedTint: string | null;
  /** Whether §6.4's freeze wash was folded into the tint last written. */
  appliedFrozen: boolean;
}

export type FigureRigMap = Map<number, FigureRig>;

/**
 * §3.6's clip ladder on a mounted figure — **three rungs, and it always
 * terminates**.
 *
 *  1. the cue's own `alias` (`params.clip` in `cues.json`: `"pistolDraw"`);
 *  2. this card's alias for that clip (`figures.json`'s `clips` map);
 *  3. the generic {@link ClipName} (`"attack"`).
 *
 * `null` is rung 4 and is the important one: **a missing clip never removes the
 * animation**, it removes only the part a model was going to add. The corpus has
 * live data for it — the drone has no `hit` and the insect no `summon` at all,
 * left deliberately absent in `models.json` (T2's report) so that this rung is
 * exercised rather than asserted.
 *
 * `lane` picks the map: `'clip'` (the default) is the cue's, `'rest'` the
 * stance's twins — the same ladder over either.
 */
export function actionFor(
  rig: FigureRig,
  clip: string,
  alias: string | null,
  cardAliases: Readonly<Record<string, string>>,
  lane: 'clip' | 'rest' = 'clip',
): THREE.AnimationAction | null {
  const actions = lane === 'rest' ? rig.restActions : rig.actions;
  if (alias !== null) {
    const byCue = actions.get(alias);
    if (byCue !== undefined) return byCue;
  }
  const byCard = cardAliases[clip];
  if (byCard !== undefined) {
    const found = actions.get(byCard);
    if (found !== undefined) return found;
  }
  return actions.get(clip) ?? null;
}
