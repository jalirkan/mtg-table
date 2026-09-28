/*
 * mtg-table — web/test/clip-lane.test.tsx
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The clip lane's weights sum to 1 when the stance's rest action IS the
 * transient** (D95, PLAN.md's slice-4 follow-up 8).
 *
 * `CueRunner.driveClips` blends two actions: the stance the snapshot says the
 * figure holds (`REST_CLIP_FOR`) at `1 − weight`, and the clip a cue is playing
 * at `weight`. When both are the SAME action — an attacking creature whose
 * attack cue plays `attack` — there is one action, and it used to carry only the
 * transient's ramp weight. Three's `PropertyMixer` fills whatever the weights
 * leave below 1 with the pose it found when the action first played, which on a
 * model with no `idle` clip is the bind (T-)pose. D95 hid that by starting every
 * clone at its idle's first frame; this holds the fix, on a model that has no
 * idle to hide behind.
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

import { REST_CLIP_FOR, type ClipRequest } from '../src/arena/figures/clips.ts';
import type { FigurePose } from '../src/arena/figures/pose.ts';
import { driveClips } from '../src/arena/scene/CueRunner.tsx';
import type { FigureRig } from '../src/arena/scene/figureRigs.ts';
import type { HoloMaterial } from '../src/arena/scene/holoMaterial.ts';

/** The bone's bind height, and the height the clip holds it at from start to end. */
const BIND_Y = 1;
const CLIP_Y = 0.2;

test('clip lane: a stance whose rest IS the transient takes full weight — a model with no idle never shows its bind pose (D95)', () => {
  const root = new THREE.Object3D();
  const hips = new THREE.Bone();
  hips.name = 'hips';
  hips.position.set(0, BIND_Y, 0);
  root.add(hips);

  // The only clip this model has is the attacking stance's own. No `idle`.
  const clipName = REST_CLIP_FOR.attacking;
  const clip = new THREE.AnimationClip(clipName, 1, [
    new THREE.VectorKeyframeTrack('hips.position', [0, 1], [0, CLIP_Y, 0, 0, CLIP_Y, 0]),
  ]);
  const mixer = new THREE.AnimationMixer(root);
  // `driveClips` reads only the stance, the card's clip aliases and the freeze.
  const pose = { stance: 'attacking', clips: {}, frozen: false } as Pick<
    FigurePose,
    'stance' | 'clips' | 'frozen'
  > as FigurePose;
  const rig: FigureRig = {
    root,
    mixer,
    actions: new Map([[clipName, mixer.clipAction(clip)]]),
    rest: null,
    clip: null,
    restTime: 0,
    material: null as unknown as HoloMaterial, // never read by the clip lane
    pose,
    appliedTint: null,
    appliedFrozen: false,
  };

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
  // It is one action in both lanes, which is the case under test.
  expect(rig.rest).not.toBeNull();
  expect(rig.rest).toBe(rig.clip);
  // Without the fix y = w·CLIP_Y + (1 − w)·BIND_Y at every frame: partway to the bind pose.
  const shown = heights.map((y) => y.toFixed(3)).join(' ');
  for (const y of heights) {
    expect(y, `the bone left the clip for its bind pose (y per frame: ${shown})`).toBeCloseTo(CLIP_Y, 6);
  }
});
