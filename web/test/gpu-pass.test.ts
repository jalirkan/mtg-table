/*
 * mtg-table — web/test/gpu-pass.test.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The GPU pass's mechanical fixes, held** (D271; `docs/evidence/gpu-pass.md`).
 * Each one is a cost the frame loop paid for nothing, and each is held here by
 * behaviour with a negative control, in node and three — no GPU, no DOM:
 *
 *  1. **An empty tile kind is not drawn.** An `InstancedMesh` at count 0 still
 *     costs a draw call; `g1`@316 has no slab land and drew one every frame.
 *  2. **A frame that moved nothing uploads nothing** — the tile field, the prop
 *     field and the status strip flag a buffer only when a value changed, and the
 *     arrays they write are bit for bit what three's setters would have left.
 *  3. **The prop field refreshes only the joints it reads** — the chains from each
 *     rig's root to its props' joints — and every matrix it reads is the one
 *     `updateMatrixWorld(true)` over the whole rig would have given.
 *  4. **A figure's bone trees are hidden from the renderer's walk** — and a
 *     drawable object hung under a bone keeps its tree walked.
 *
 * `liveness.test.ts` holds the source half (the allocation scan's new bodies, and
 * no colour string parsed in the frame loop).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as THREE from 'three';

import type { TileLayout, TilePose } from '../src/arena/figures/tiles.ts';
import { writeColourAt, writeMatrixAt, writeScalarAt } from '../src/arena/scene/instanceWrite.ts';
import { hideBoneTrees, instantiateFigure } from '../src/arena/scene/models.ts';
import { TileField } from '../src/arena/scene/tiles.ts';
import { refreshWorld, worldChainOf } from '../src/arena/scene/worldChain.ts';
import { loadLibrary } from './prop-raster.ts';

/** The one offset every tile reads: identity, until a test moves it. */
const OFFSET = {
  dx: 0,
  dy: 0,
  dz: 0,
  glow: 0,
  glowColour: null as string | null,
};
const OFFSETS = { offsetOf: () => OFFSET } as unknown as Parameters<TileField['bind']>[1];

function tile(cardId: number, kind: TilePose['kind'], x: number, rim: string | null = null): TilePose {
  return {
    cardId,
    seat: 'you',
    position: [x, 0.006, 1.2],
    rotationY: 0,
    kind,
    tint: '#6f8f5a',
    rim,
    tapped: false,
  } as unknown as TilePose;
}

function meshesOf(field: TileField): THREE.InstancedMesh[] {
  return field.group.children as THREE.InstancedMesh[];
}

test('gpu-pass: an empty tile kind is not drawn, and prime shows every kind once (D271)', () => {
  const field = new TileField();
  const tiles: TileLayout = new Map([
    [1, tile(1, 'plateau', -1)],
    [2, tile(2, 'plateau', 0)],
    [3, tile(3, 'water', 1)],
  ]);
  field.bind(tiles, OFFSETS, 0);
  const drawn = meshesOf(field).filter((m) => m.visible);
  // What three would draw: one call per visible mesh. Two kinds on the table → two calls.
  assert.deepEqual(
    drawn.map((m) => m.count).sort(),
    [1, 2],
    'the tile field draws a kind that has no tile on the table',
  );
  assert.equal(meshesOf(field).length, 4, 'the tile field is no longer three kinds and a rim');
  for (const mesh of meshesOf(field)) assert.equal(mesh.visible, mesh.count > 0, 'a bucket is visible with nothing in it, or hidden with something');
  // The mount-time prime shows every bucket, so every kind's program compiles there…
  field.prime();
  assert.ok(meshesOf(field).every((m) => m.visible), 'prime does not show every bucket');
  // …and the next frame hides the empty ones again.
  field.bind(tiles, OFFSETS, 0);
  assert.equal(meshesOf(field).filter((m) => m.visible).length, 2, 'the next bind does not hide the primed empty buckets');

  // The negative control: the field as it was — `count` written, `visible` left
  // alone — draws all four (two calls for nothing).
  for (const mesh of meshesOf(field)) mesh.visible = true;
  assert.equal(meshesOf(field).filter((m) => m.visible).length, 4);
});

test('gpu-pass: a frame that moved no tile uploads nothing, and one that moved a tile uploads it (D271)', () => {
  const field = new TileField();
  const tiles: TileLayout = new Map([
    [1, tile(1, 'plateau', -1, '#c0a060')],
    [2, tile(2, 'slab', 0)],
  ]);
  field.bind(tiles, OFFSETS, 0);
  const versions = (): number[] =>
    meshesOf(field).flatMap((m) => [m.instanceMatrix.version, m.instanceColor?.version ?? -1]);
  const first = versions();
  field.bind(tiles, OFFSETS, 0.016);
  assert.deepEqual(versions(), first, 'an unchanged frame flagged a tile buffer for upload');

  // A cue moves the land: its bucket's matrices are flagged, and only its.
  OFFSET.dy = 0.05;
  try {
    field.bind(tiles, OFFSETS, 0.016);
  } finally {
    OFFSET.dy = 0;
  }
  const moved = versions();
  const changed = moved.map((v, i) => v !== first[i]);
  // [plateau m, c, water m, c, slab m, c, rim m, c]: every moved matrix, no colour.
  assert.deepEqual(changed, [true, false, false, false, true, false, true, false], 'the flags are not exactly the moved buffers');

  // The array is what `setMatrixAt` would have written, bit for bit.
  const plateau = meshesOf(field)[0]!;
  const reference = new THREE.InstancedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial(), 2);
  const m = new THREE.Matrix4();
  plateau.getMatrixAt(0, m);
  reference.setMatrixAt(0, m);
  assert.deepEqual(
    Array.from(plateau.instanceMatrix.array.slice(0, 16)),
    Array.from(reference.instanceMatrix.array.slice(0, 16)),
  );
});

test('gpu-pass: the instance writers store what the setters would, and say "changed" only when it did (D271)', () => {
  const mesh = new THREE.InstancedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial(), 4);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(12), 3);
  const ours = new Float32Array(mesh.instanceMatrix.array.length);
  ours.set(mesh.instanceMatrix.array);
  const colours = new Float32Array(12);
  // An inexact matrix (a rotation by 0.1 rad): float64 elements that no float32 holds.
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(0.1, 0.2, 0.3),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.1),
    new THREE.Vector3(1.1, 1.1, 1.1),
  );
  const c = new THREE.Color(0.1, 0.7, 0.3);
  mesh.setMatrixAt(2, m);
  mesh.setColorAt(2, c);
  assert.equal(writeMatrixAt(ours, 2, m), true);
  assert.equal(writeColourAt(colours, 2, c), true);
  assert.deepEqual(Array.from(ours), Array.from(mesh.instanceMatrix.array), 'writeMatrixAt stores other bits than setMatrixAt');
  assert.deepEqual(Array.from(colours), Array.from(mesh.instanceColor.array), 'writeColourAt stores other bits than setColorAt');
  // The same values again: nothing changed, so nothing is to be uploaded.
  assert.equal(writeMatrixAt(ours, 2, m), false, 'an unchanged matrix reads as changed');
  assert.equal(writeColourAt(colours, 2, c), false, 'an unchanged colour reads as changed');
  const opacity = new Float32Array(4);
  assert.equal(writeScalarAt(opacity, 1, 0.3), true);
  assert.equal(writeScalarAt(opacity, 1, 0.3), false, 'an unchanged opacity reads as changed');

  // The negative control: comparing the float64 against the stored float32 — the
  // obvious spelling — calls this unchanged matrix "changed" on every frame.
  let naiveChanged = false;
  for (let k = 0; k < 16; k++) if (ours[2 * 16 + k] !== m.elements[k]) naiveChanged = true;
  assert.ok(naiveChanged, 'the control no longer shows why the writers round');
});

test('gpu-pass: the prop field’s joint chains give the matrices the whole-rig refresh gives, on every body (D271)', async () => {
  const library = await loadLibrary();
  const joints = ['Head', 'hand_r', 'hand_l', 'spine_03', 'spine_01', 'lowerarm_l', 'head', 'arm-right', 'torso', 'Eye', 'Head3'];
  let checked = 0;
  let saved = 0;
  let total = 0;
  for (const [id, model] of library) {
    const instance = instantiateFigure(model);
    const root = instance.object;
    const idle = model.clips.get('idle') ?? model.clips.get('attack') ?? null;
    if (idle !== null) {
      const action = instance.mixer.clipAction(idle);
      action.play();
      action.time = idle.duration * 0.37;
      instance.mixer.update(0);
    }
    root.position.set(0.3, 0.02, -1.1);
    root.rotation.set(0, 2.1, 0);
    root.scale.setScalar(0.62);
    const parent = new THREE.Group();
    parent.position.set(0.5, 0, 0);
    parent.add(root);
    parent.updateMatrixWorld(true);
    const reads: THREE.Object3D[] = [];
    root.traverse((node) => {
      if ((node as THREE.Bone).isBone === true && joints.some((j) => node.name === j || node.name.startsWith(`${j}_`))) reads.push(node);
    });
    if (reads.length === 0) continue;
    const truth = reads.map((node) => node.matrixWorld.clone());

    // Spoil every world matrix of the rig, then refresh the chains alone.
    root.traverse((node) => node.matrixWorld.identity());
    const chain = worldChainOf([root], reads);
    for (const node of chain) refreshWorld(node);
    reads.forEach((node, i) => {
      assert.deepEqual(Array.from(node.matrixWorld.elements), Array.from(truth[i]!.elements), `${id}: ${node.name} differs from the whole-rig refresh`);
    });
    // Parents first, and the root first of all.
    assert.equal(chain[0], root, `${id}: the chain does not start at the root`);
    for (let i = 1; i < chain.length; i++) assert.ok(chain.indexOf(chain[i]!.parent!) < i, `${id}: ${chain[i]!.name} comes before its parent`);

    // The negative control: a chain missing one link reads a stale matrix.
    root.traverse((node) => node.matrixWorld.identity());
    const broken = chain.filter((node) => node !== reads[0]!.parent);
    for (const node of broken) refreshWorld(node);
    assert.notDeepEqual(
      Array.from(reads[0]!.matrixWorld.elements),
      Array.from(truth[0]!.elements),
      `${id}: the control no longer shows that the chain needs every link`,
    );

    let nodes = 0;
    root.traverse(() => (nodes += 1));
    total += nodes;
    saved += nodes - chain.length;
    checked += 1;
  }
  assert.ok(checked >= 6, `only ${String(checked)} bodies had a joint to read`);
  console.log(`# gpu-pass: ${String(checked)} bodies — the chains refresh ${String(total - saved)} of ${String(total)} nodes (${((100 * saved) / total).toFixed(0)}% fewer)`);
});

test('gpu-pass: a figure’s bone trees are hidden from the render walk, and a drawable under a bone keeps its tree (D271)', async () => {
  const library = await loadLibrary();
  let bodies = 0;
  for (const [id, model] of library) {
    const instance = instantiateFigure(model);
    let bones = 0;
    let walked = 0;
    let drawables = 0;
    // three's `projectObject`: an invisible object ends the walk down its subtree.
    const walk = (node: THREE.Object3D): void => {
      if (!node.visible) return;
      walked += 1;
      if ((node as THREE.Bone).isBone === true) bones += 1;
      const n = node as THREE.Mesh;
      if (n.isMesh === true) drawables += 1;
      for (const child of node.children) walk(child);
    };
    walk(instance.object);
    assert.equal(bones, 0, `${id}: the render walk still visits a bone`);
    assert.equal(drawables, instance.meshes.length, `${id}: the render walk lost a mesh`);
    let all = 0;
    instance.object.traverse(() => (all += 1));
    assert.ok(walked < all, `${id}: nothing was taken out of the walk`);
    bodies += 1;
  }
  assert.ok(bodies >= 6, 'the library has fewer bodies than it should');

  // The control: a mesh hung under a bone keeps its whole tree walked.
  const armature = new THREE.Object3D();
  const rootBone = new THREE.Bone();
  const child = new THREE.Bone();
  rootBone.add(child);
  armature.add(rootBone);
  const sword = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  child.add(sword);
  const bare = new THREE.Bone();
  bare.add(new THREE.Bone());
  armature.add(bare);
  assert.equal(hideBoneTrees(armature), 1, 'hideBoneTrees hid a tree with a mesh in it, or missed a bare one');
  assert.equal(rootBone.visible, true, 'a bone tree carrying a mesh was hidden');
  assert.equal(bare.visible, false, 'a bare bone tree was left in the walk');
});
