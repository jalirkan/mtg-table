/*
 * mtg-table — workshop/facing.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **PLAN question 13, previewed without changing the arena.**
 *
 * Today every figure faces its OWN player (`layout.ts`'s `seatFacingY`: yours at
 * 0, toward your camera; the opponent's at π, away from it), and D81 records that
 * turning them to face the other seat "is this one line, and it moves every prop
 * and every T11 anchor with it". The workshop previews that line without writing
 * it, in the two places the arena reads a figure's facing:
 *
 *  - **the pose** — {@link turnPoses} adds the turn to every `FigurePose.facingY`,
 *    which is the one field the rig, the prop field, the departing bodies and the
 *    effect pool's `figure` anchor all read (D81: one definition of a front);
 *  - **the attack turn** — `Stage.yawTo` is `layout.ts`'s `figureYawTo`, measured
 *    from `seatFacingY`, i.e. from the UNTURNED facing. {@link PreviewStage}
 *    subtracts the preview's turn from it, so an attacker still ends its lunge
 *    facing its defender (D82) whichever way the preview stands it.
 *
 * With the turn at 0 both are the identity, and the pedestal is the arena.
 *
 * `[NO three]` — `SceneStage` itself imports none — so `node --test` drives both.
 */

import type { AnchorRef } from '../arena/cues/stage.ts';
import type { FigureLayout } from '../arena/figures/pose.ts';
import { SceneStage } from '../arena/scene/SceneStage.ts';

/** Wrap an angle into (−π, π], as `layout.ts`'s `yawToward` does. */
export function wrapAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a <= -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Every pose turned by `turn` about y. `turn === 0` returns the same map. Pure. */
export function turnPoses(poses: FigureLayout, turn: number): FigureLayout {
  if (turn === 0) return poses;
  const out: FigureLayout = new Map();
  for (const [id, pose] of poses) out.set(id, { ...pose, facingY: pose.facingY + turn });
  return out;
}

/** The arena's stage, with the preview's turn taken out of the attack turn. */
export class PreviewStage extends SceneStage {
  /** The preview's turn, radians — `0` (the arena) or `π` (question 13). */
  turn = 0;

  override yawTo(cardId: number, anchor: AnchorRef): number {
    const yaw = super.yawTo(cardId, anchor);
    return this.turn === 0 ? yaw : wrapAngle(yaw - this.turn);
  }
}
