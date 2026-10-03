/*
 * mtg-table — tools/personal/retarget.mjs
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The build's retarget, as a function of two three.js skeletons** (D191).
 *
 * `tools/build-figures.mjs`'s `humanClips` carries the Universal Animation
 * Library's clips onto the UBC bodies by WORLD-SPACE DELTA, per frame and per
 * joint, parents first:
 *
 *     targetWorld(j, t) = sourceWorld(j, t) · sourceBindWorld(j)⁻¹ · targetBindWorld(j)
 *     targetLocal(j, t) = targetWorld(parent(j), t)⁻¹ · targetWorld(j, t)
 *
 * and moves the pelvis alone, by the source's world-space hip delta scaled by
 * the two hip heights. This module is that formula, line for line, over any
 * source and target that name the same joints — so `check.mjs` can carry OUR
 * clip set (the clips `figures.glb` already holds, baked onto `agent`) onto a
 * prepared personal model with the arithmetic the build uses.
 *
 * **Why a second copy and not a shared one.** The build runs as a script (its
 * work is top-level code that verifies its CC0 sources and writes the library the
 * moment it is imported), so it cannot be imported for one function; and a
 * refactor of it could only be proven byte-identical by rebuilding `figures.glb`
 * from the CC0 downloads, which live outside this lane's checkout. So the formula
 * is copied, and `check.mjs` PROVES the copy: the build baked the same library
 * clip onto both `agent` and `hero`, and because the delta composes
 * (UAL → agent → hero ≡ UAL → hero), retargeting `agent`'s clip onto `hero` here
 * must reproduce `hero`'s own baked clip. It does, to the clip compression's
 * rounding (`docs/evidence/personal-tier.md` §4). Factoring the build to import
 * this module is PLAN.md's personal-tier follow-up, to be done beside a rebuild.
 */

/**
 * @param THREE     three's module (the caller's, so there is one instance)
 * @param source    { root: Object3D the clip animates, bone(name): Object3D }
 * @param target    { root: Object3D, bone(name): Object3D } — both AT REST
 * @param clip      a THREE.AnimationClip that animates `source.root`
 * @param joints    the driven joints, parents first (our 22)
 * @param hip       the joint that alone translates ('pelvis')
 * @param fps       the sampling rate (the build's is 24)
 * @returns         a THREE.AnimationClip for `target`, tracks named by its bones
 */
export function worldDeltaRetarget(THREE, { source, target, clip, joints, hip = 'pelvis', fps = 24, name = clip.name }) {
  const sBones = joints.map((j) => source.bone(j));
  const tBones = joints.map((j) => target.bone(j));
  joints.forEach((j, i) => {
    if (!sBones[i]) throw new Error(`retarget: the source has no joint "${j}"`);
    if (!tBones[i]) throw new Error(`retarget: the target has no joint "${j}"`);
  });
  source.root.updateMatrixWorld(true);
  target.root.updateMatrixWorld(true);
  // Parents first, and each driven joint's parent is driven too — or is an
  // undriven ancestor (root) whose world rotation is its bind rotation.
  const parentIndex = tBones.map((bone) => tBones.indexOf(bone.parent));
  joints.forEach((j, i) => {
    if (parentIndex[i] > i) throw new Error(`retarget: "${j}" is listed before its parent`);
  });
  const sBind = sBones.map((b) => b.getWorldQuaternion(new THREE.Quaternion()));
  const tBind = tBones.map((b) => b.getWorldQuaternion(new THREE.Quaternion()));
  const tParentBind = tBones.map((b) => b.parent.getWorldQuaternion(new THREE.Quaternion()));
  const offset = sBind.map((q, i) => q.clone().invert().multiply(tBind[i]));
  const h = joints.indexOf(hip);
  const sHip0 = new THREE.Vector3().setFromMatrixPosition(sBones[h].matrixWorld);
  const tHip0 = new THREE.Vector3().setFromMatrixPosition(tBones[h].matrixWorld);
  const hipScale = tHip0.y / sHip0.y;
  const tHipParentInverse = tBones[h].parent.matrixWorld.clone().invert();

  const frames = Math.max(2, Math.round(clip.duration * fps) + 1);
  const delta = clip.duration / (frames - 1);
  const mixer = new THREE.AnimationMixer(source.root);
  const action = mixer.clipAction(clip);
  action.play();
  const times = new Float32Array(frames);
  const rotations = joints.map(() => new Float32Array(frames * 4));
  const hipValues = new Float32Array(frames * 3);
  const q = new THREE.Quaternion();
  const inv = new THREE.Quaternion();
  const world = joints.map(() => new THREE.Quaternion());
  const p = new THREE.Vector3();
  for (let f = 0; f < frames; f += 1) {
    action.time = Math.min(f * delta, clip.duration - 1e-7);
    mixer.update(0);
    source.root.updateMatrixWorld(true);
    times[f] = f * delta;
    for (let i = 0; i < joints.length; i += 1) {
      sBones[i].getWorldQuaternion(q);
      world[i].copy(q).multiply(offset[i]);
      const parent = parentIndex[i] >= 0 ? world[parentIndex[i]] : tParentBind[i];
      inv.copy(parent).invert().multiply(world[i]);
      // Keep the sign continuous frame to frame (the build's rule), so linear
      // interpolation never takes the long way round.
      if (f > 0) {
        const r = rotations[i];
        const dot = r[(f - 1) * 4] * inv.x + r[(f - 1) * 4 + 1] * inv.y + r[(f - 1) * 4 + 2] * inv.z + r[(f - 1) * 4 + 3] * inv.w;
        if (dot < 0) inv.set(-inv.x, -inv.y, -inv.z, -inv.w);
      }
      inv.toArray(rotations[i], f * 4);
    }
    p.setFromMatrixPosition(sBones[h].matrixWorld).sub(sHip0).multiplyScalar(hipScale).add(tHip0).applyMatrix4(tHipParentInverse);
    p.toArray(hipValues, f * 3);
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(source.root);
  const tracks = joints.map((j, i) => new THREE.QuaternionKeyframeTrack(`${tBones[i].name}.quaternion`, times, rotations[i]));
  tracks.push(new THREE.VectorKeyframeTrack(`${tBones[h].name}.position`, times, hipValues));
  return new THREE.AnimationClip(name, clip.duration, tracks);
}
