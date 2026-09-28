/*
 * mtg-table — web/test/clip-lane.test.tsx
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The clip lane's weights sum to 1 when the stance's rest clip IS the
 * transient's** (D95, PLAN.md's slice-4 follow-up 8).
 *
 * `CueRunner.driveClips` blends two actions: the stance the snapshot says the
 * figure holds (`REST_CLIP_FOR`) at `1 − weight`, and the clip a cue is playing
 * at `weight`. When both named the SAME clip — an attacking creature whose
 * attack cue plays `attack` — they were one action, and it carried only the
 * transient's ramp weight. Three's `PropertyMixer` fills whatever the weights
 * leave below 1 with the pose it found when the action first played, which on a
 * model with no `idle` clip is the bind (T-)pose. D95 hid that by starting every
 * clone at its idle's first frame; the first test holds the fix on a model that
 * has no idle to hide behind.
 *
 * The second test is why the fix is two actions and not one at full weight (the
 * hardening pass's first verification round). One action has one time, so at
 * full weight the figure snapped from its held stance frame to the clip's first
 * frame when an attack or block cue started, and back when it ended — on EVERY
 * model, because every attack and block cue on an attacking or blocking figure
 * is this case. The rest lane now holds the stance on the clip's `restTwin`
 * (`models.ts`, FigureLayer's second action map), so the stance and the cue are
 * two actions at two times and the cue crossfades off the held pose and back.
 * The test walks a cue's whole envelope, stance to stance, and asserts no frame
 * jumps.
 *
 * Vitest only because `driveClips` lives in a `.tsx` file and Node's type
 * stripping does not load one. Nothing is rendered: a one-bone `Object3D`, a
 * real `AnimationMixer`, and the same `mixer.update(0)` the frame loop calls.
 * fiber is stubbed: `driveClips` uses none of it, and its CJS build, which is
 * what the node environment loads, `require`s a second copy of three.
 */

import * as THREE from 'three';
import { expect, test, vi } from 'vitest';

vi.mock('@react-three/fiber', () => ({ useFrame: () => undefined, useThree: () => undefined }));

import { clipEnvelope, REST_CLIP_FOR, REST_PHASE_FOR, type ClipRequest } from '../src/arena/figures/clips.ts';
import type { FigurePose } from '../src/arena/figures/pose.ts';
import { driveClips } from '../src/arena/scene/CueRunner.tsx';
import type { FigureMaterial } from '../src/arena/scene/figureMaterial.ts';
import type { FigureRig } from '../src/arena/scene/figureRigs.ts';
import { restTwin } from '../src/arena/scene/models.ts';

/** The bone's bind height, and the height the clip holds it at from start to end. */
const BIND_Y = 1;
const CLIP_Y = 0.2;

/** A one-bone rig standing in `stance`, whose only clip is `clip`. */
function oneBoneRig(clip: THREE.AnimationClip, stance: FigurePose['stance']): { rig: FigureRig; hips: THREE.Bone } {
  const root = new THREE.Object3D();
  const hips = new THREE.Bone();
  hips.name = 'hips';
  hips.position.set(0, BIND_Y, 0);
  root.add(hips);
  const mixer = new THREE.AnimationMixer(root);
  const pose = { stance, clips: {}, frozen: false } as Pick<FigurePose, 'stance' | 'clips' | 'frozen'> as FigurePose;
  const rig: FigureRig = {
    root,
    mixer,
    // FigureLayer's build: the cue lane's action and the rest lane's, on the twin.
    actions: new Map([[clip.name, mixer.clipAction(clip)]]),
    restActions: new Map([[clip.name, mixer.clipAction(restTwin(clip))]]),
    rest: null,
    clip: null,
    restTime: 0,
    material: null as unknown as FigureMaterial, // never read by the clip lane
    pose,
    appliedTint: null,
    appliedFrozen: false,
  };
  return { rig, hips };
}

test('clip lane: a stance and a cue on the same clip still sum to full weight — a model with no idle never shows its bind pose (D95)', () => {
  // The only clip this model has is the attacking stance's own. No `idle`.
  const clipName = REST_CLIP_FOR.attacking;
  const clip = new THREE.AnimationClip(clipName, 1, [
    new THREE.VectorKeyframeTrack('hips.position', [0, 1], [0, CLIP_Y, 0, 0, CLIP_Y, 0]),
  ]);
  // `driveClips` reads only the stance, the card's clip aliases and the freeze.
  const { rig, hips } = oneBoneRig(clip, 'attacking');
  const { mixer } = rig;

  // The attack cue's envelope: in, held, out — every weight below 1.
  const heights: number[] = [];
  for (const [t, weight] of [
    [0.05, 0.1],
    [0.3, 0.6],
    [0.5, 0.95],
    [0.8, 0.4],
    [0.97, 0.05],
  ] as const) {
    const request: ClipRequest = { clip: clipName, t, weight, alias: null, key: 'attack#1' };
    driveClips(rig, request, 16, true);
    mixer.update(0);
    heights.push(hips.position.y);
  }
  // One clip in both lanes, which is the case under test — on two actions.
  expect(rig.rest).not.toBeNull();
  expect(rig.clip).not.toBeNull();
  expect(rig.rest).not.toBe(rig.clip);
  expect(rig.rest!.getClip().tracks).toBe(rig.clip!.getClip().tracks);
  // Without the fix y = w·CLIP_Y + (1 − w)·BIND_Y at every frame: partway to the bind pose.
  const shown = heights.map((y) => y.toFixed(3)).join(' ');
  for (const y of heights) {
    expect(y, `the bone left the clip for its bind pose (y per frame: ${shown})`).toBeCloseTo(CLIP_Y, 6);
  }
});

test('clip lane: when the stance and the cue play the same clip, the cue leaves the held stance frame and comes back to it with no snap', () => {
  // hips.y is the clip's own time: y = x at time x, so a frame's height says
  // which frame of the clip is showing.
  for (const stance of ['attacking', 'blocking'] as const) {
    const clipName = REST_CLIP_FOR[stance];
    const clip = new THREE.AnimationClip(clipName, 1, [
      new THREE.VectorKeyframeTrack('hips.position', [0, 1], [0, 0, 0, 0, 1, 0]),
    ]);
    const { rig, hips } = oneBoneRig(clip, stance);
    const held = REST_PHASE_FOR[stance];
    const frame = (request: ClipRequest | null): number => {
      driveClips(rig, request, 16, true);
      rig.mixer.update(0);
      return hips.position.y;
    };
    const ys: number[] = [frame(null)];
    // The stance alone: the held frame.
    expect(ys[0], `${stance}: the stance holds its frame`).toBeCloseTo(held, 6);
    // The cue, t = 0 … 1 at the envelope the registry gives it, then the stance again.
    for (let i = 0; i <= 100; i += 1) {
      const t = i / 100;
      ys.push(frame({ clip: clipName, t, weight: clipEnvelope(t), alias: null, key: `${stance}#1` }));
    }
    ys.push(frame(null));
    expect(rig.rest, `${stance}: the rest lane holds the stance on the twin`).toBe(rig.mixer.existingAction(restTwin(clip)));
    // At full weight the cue shows its own frame…
    expect(ys[1 + 50], `${stance}: mid-cue is the cue's own frame`).toBeCloseTo(0.5, 6);
    // …and it starts and ends on the held one.
    expect(ys[1], `${stance}: the cue starts on the held frame`).toBeCloseTo(held, 6);
    expect(ys[1 + 100], `${stance}: the cue ends on the held frame`).toBeCloseTo(held, 6);
    expect(ys[ys.length - 1], `${stance}: the stance again`).toBeCloseTo(held, 6);
    // No frame-to-frame jump anywhere, the stance → cue and cue → stance edges
    // included (the clip moves 0.01 a step; the envelope's ramps add at most 0.03).
    let worst = 0;
    for (let i = 1; i < ys.length; i += 1) worst = Math.max(worst, Math.abs(ys[i]! - ys[i - 1]!));
    expect(worst, `${stance}: largest step between frames (${ys.map((y) => y.toFixed(2)).join(' ')})`).toBeLessThan(0.05);
  }
});
