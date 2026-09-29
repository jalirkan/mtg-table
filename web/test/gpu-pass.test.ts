/*
 * mtg-table — web/test/gpu-pass.test.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The GPU pass's mechanical fixes, held** (D271; `docs/evidence/gpu-pass.md`).
 * Each one is a cost the frame loop paid for nothing, and each is held here by
 * behaviour with a negative control, in node and three — no GPU, no DOM:
 *
 *  1. **An empty tile kind is not drawn.** An `InstancedMesh` at count 0 is
 *     still set up every frame — three binds its program, uploads its uniforms and
 *     binds its vertex array — and issues no draw (so `gl.info` never counted it);
 *     `g1`@316 has no slab land and set one up every frame.
 *  2. **A frame that moved nothing uploads nothing** — the tile field, the prop
 *     field and the status strip flag a buffer only when a value changed, and the
 *     arrays they write are bit for bit what three's setters would have left. Each
 *     field is driven through frames that change nothing, then one thing, and every
 *     buffer is held to "flagged iff its array changed" (`uploadViolations`); the
 *     controls are the two ways it breaks — a buffer flagged every frame (the fields
 *     as they were) and a write that changes the array without flagging it.
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
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import * as THREE from 'three';

import type { FigureLayout } from '../src/arena/figures/pose.ts';
import type { StatusLayout } from '../src/arena/figures/status.ts';
import type { TileLayout, TilePose } from '../src/arena/figures/tiles.ts';
import type { FigureRigMap } from '../src/arena/scene/figureRigs.ts';
import { writeColourAt, writeMatrixAt, writeScalarAt } from '../src/arena/scene/instanceWrite.ts';
import { hideBoneTrees, instantiateFigure } from '../src/arena/scene/models.ts';
import { PropField, type PropOffsetSource } from '../src/arena/scene/props.ts';
import { StatusField } from '../src/arena/scene/status.ts';
import { TileField } from '../src/arena/scene/tiles.ts';
import { refreshWorld, worldChainOf } from '../src/arena/scene/worldChain.ts';
import type { Frame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';
import { MODELS, loadLibrary, posesOf, rigOf } from './prop-raster.ts';

/**
 * **"Flagged iff its array changed"** — the whole of D271.5 as one check. `before`
 * and `after` are snapshots of named buffers (`version`, and a copy of the array)
 * either side of one frame; a buffer whose version moved must have a changed array
 * (else an upload of bytes the GPU holds), and a changed array must have a moved
 * version (else the GPU draws a stale value). Returns what broke, empty when none.
 */
interface BufferShot {
  version: number;
  array: Float32Array;
}
type Shot = Map<string, BufferShot>;

function shoot(buffers: ReadonlyMap<string, THREE.BufferAttribute>): Shot {
  const out: Shot = new Map();
  for (const [name, attribute] of buffers) out.set(name, { version: attribute.version, array: (attribute.array as Float32Array).slice() });
  return out;
}

function changedArray(a: Float32Array, b: Float32Array): boolean {
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return true;
  return false;
}

function uploadViolations(before: Shot, after: Shot): string[] {
  const out: string[] = [];
  for (const [name, was] of before) {
    const now = after.get(name)!;
    const flagged = now.version !== was.version;
    const changed = changedArray(was.array, now.array);
    if (flagged && !changed) out.push(`${name}: flagged for upload with its bytes unchanged`);
    if (changed && !flagged) out.push(`${name}: changed and not flagged — the GPU draws a stale value`);
  }
  return out;
}

/** Which buffers moved version between two snapshots. */
function flaggedOf(before: Shot, after: Shot): string[] {
  return [...before].filter(([name, was]) => after.get(name)!.version !== was.version).map(([name]) => name);
}

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
  const buffers = new Map<string, THREE.BufferAttribute>();
  for (const m of meshesOf(field)) {
    buffers.set(`${m.name || String(m.id)}:matrix`, m.instanceMatrix);
    buffers.set(`${m.name || String(m.id)}:colour`, m.instanceColor!);
  }
  const first = versions();
  const still = shoot(buffers);
  field.bind(tiles, OFFSETS, 0.016);
  assert.deepEqual(versions(), first, 'an unchanged frame flagged a tile buffer for upload');
  assert.deepEqual(uploadViolations(still, shoot(buffers)), []);

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
  const afterMove = shoot(buffers);
  assert.deepEqual(uploadViolations(still, afterMove), [], 'a tile buffer was flagged without changing, or changed without a flag');

  // The negative controls, on one more still frame: the field as it was (every
  // buffer flagged every frame), and a write that changes the array unflagged.
  field.bind(tiles, OFFSETS, 0.016);
  const settled = shoot(buffers);
  for (const m of meshesOf(field)) {
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor!.needsUpdate = true;
  }
  assert.ok(uploadViolations(settled, shoot(buffers)).length >= 8, 'the check no longer sees a buffer flagged every frame');
  const quiet = shoot(buffers);
  const colours = meshesOf(field)[0]!.instanceColor!.array as Float32Array;
  colours[0] = (colours[0] ?? 0) + 0.25;
  assert.deepEqual(uploadViolations(quiet, shoot(buffers)).length, 1, 'the check no longer sees a write that was never flagged');

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

/** `g1.jsonl`'s board around the bench frame with the most props on it — the prop field's real load. */
function benchBoard(): ClientState {
  const log = parseFrameLog(readFileSync(fileURLToPath(new URL('../../fixtures/games/g1.jsonl', import.meta.url)), 'utf8'));
  const frames = log.frames as Frame[];
  let state = initialState(log.header);
  let best: { state: ClientState; props: number } | null = null;
  for (let i = 0; i < Math.min(frames.length, 380); i++) {
    state = reduce(state, frames[i]!);
    if (i < 300 || frames[i]!.type !== 'state') continue;
    let props = 0;
    for (const pose of posesOf(state).values()) if (pose.modelId !== null) props += pose.props.length;
    if (best === null || props > best.props) best = { state, props };
  }
  assert.ok(best !== null && best.props >= 10, 'g1 has no board with props near the bench frame');
  return best.state;
}

test('gpu-pass: a still frame of the prop field uploads nothing; a moved body, a fade and a wash flag exactly what they changed (D271)', async () => {
  const library = await loadLibrary();
  const poses: FigureLayout = posesOf(benchBoard());
  const rigs: FigureRigMap = new Map();
  for (const pose of poses.values()) {
    const rig = rigOf(pose, library);
    if (rig !== null) rigs.set(pose.cardId, rig);
  }
  const field = new PropField();
  field.setLibrary(library, MODELS);
  field.commit(poses, rigs, MODELS);
  // Each card's live offset: identity, until a frame below moves one.
  const identity = { dx: 0, dy: 0, dz: 0, scale: 1, opacity: 1, dissolve: 0, glow: 0, dRotY: 0 };
  const live = new Map<number, typeof identity>();
  const offsets: PropOffsetSource = { offsetOf: (id) => live.get(id) ?? identity, clipOf: () => null };
  const buffers = new Map<string, THREE.BufferAttribute>();
  for (const child of field.group.children) {
    const mesh = child as THREE.InstancedMesh;
    if (mesh.isInstancedMesh !== true) continue;
    buffers.set(`${mesh.name}:matrix`, mesh.instanceMatrix);
    buffers.set(`${mesh.name}:colour`, mesh.instanceColor!);
    buffers.set(`${mesh.name}:opacity`, mesh.geometry.getAttribute('aOpacity') as THREE.BufferAttribute);
  }
  const drawnKinds = (): number => field.group.children.filter((c) => c.visible && (c as THREE.InstancedMesh).count > 0).length;
  // A frame: the same clock, so only what the test changes can move. (The clock
  // moves a bee's ring, a wing's beat and an emitter's flicker, each of which is a
  // change the field must upload.)
  const frame = (): { flagged: string[]; broken: string[] } => {
    const before = shoot(buffers);
    field.bind(offsets, 0);
    const after = shoot(buffers);
    return { flagged: flaggedOf(before, after), broken: uploadViolations(before, after) };
  };

  field.bind(offsets, 0);
  assert.ok(drawnKinds() >= 4, `only ${String(drawnKinds())} prop kinds drawn on the bench board`);
  const still = frame();
  assert.deepEqual(still.flagged, [], 'a frame that moved nothing flagged a prop buffer for upload');
  assert.deepEqual(still.broken, []);

  // One body moves — its offset and its rig, as `CueRunner.applyFigures` writes them.
  const [cardId, rig] = [...rigs].find(([id]) => (poses.get(id)?.props.length ?? 0) >= 2)!;
  live.set(cardId, { ...identity, dx: 0.05 });
  rig.root.position.x += 0.05;
  rig.root.updateMatrix();
  const moved = frame();
  assert.deepEqual(moved.broken, [], 'a moved body left a buffer flagged unchanged or changed unflagged');
  assert.ok(moved.flagged.length >= 1 && moved.flagged.every((n) => n.endsWith(':matrix')), `a move flagged ${moved.flagged.join(', ') || 'nothing'}`);
  assert.ok(moved.flagged.length < drawnKinds(), 'one body moved and every drawn kind was flagged');
  assert.deepEqual(frame().flagged, [], 'the frame after a move, with nothing moving, flagged a buffer');

  // It fades: the opacity buffers of its kinds, and nothing else.
  live.set(cardId, { ...identity, dx: 0.05, opacity: 0.5 });
  rig.material.uniforms.uOpacity.value = 0.5;
  const faded = frame();
  assert.deepEqual(faded.broken, [], 'a fade left a buffer flagged unchanged or changed unflagged');
  assert.ok(faded.flagged.length >= 1 && faded.flagged.every((n) => n.endsWith(':opacity')), `a fade flagged ${faded.flagged.join(', ') || 'nothing'}`);

  // The freeze washes its colours: the colour buffers of its kinds, and nothing else.
  (poses.get(cardId) as { frozen: boolean }).frozen = true;
  const washed = frame();
  assert.deepEqual(washed.broken, [], 'a wash left a buffer flagged unchanged or changed unflagged');
  assert.ok(washed.flagged.length >= 1 && washed.flagged.every((n) => n.endsWith(':colour')), `a wash flagged ${washed.flagged.join(', ') || 'nothing'}`);

  // The negative controls, on a still frame: every drawn kind's three buffers
  // flagged (`commitKind` as it was), and an opacity written without its flag.
  const settled = shoot(buffers);
  field.bind(offsets, 0);
  for (const child of field.group.children) {
    const mesh = child as THREE.InstancedMesh;
    if (!mesh.visible || mesh.isInstancedMesh !== true) continue;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor!.needsUpdate = true;
    (mesh.geometry.getAttribute('aOpacity') as THREE.BufferAttribute).needsUpdate = true;
  }
  assert.ok(uploadViolations(settled, shoot(buffers)).length >= 3 * drawnKinds(), 'the check no longer sees every drawn kind re-sent');
  const quiet = shoot(buffers);
  const first = field.group.children.find((c) => c.visible) as THREE.InstancedMesh;
  ((first.geometry.getAttribute('aOpacity') as THREE.BufferAttribute).array as Float32Array)[0] = 0.25;
  assert.equal(uploadViolations(quiet, shoot(buffers)).length, 1, 'the check no longer sees an opacity written without its flag');
  field.dispose();
});

test('gpu-pass: the status strip flags its anchors only when a strip moved — an offset or a bob (D271)', () => {
  const quad = { x: 0, y: 0, w: 16, h: 16, cell: 0, colour: '#ffffff', alpha: 1 };
  const strip = (cardId: number, x: number, bobAmp = 0): StatusLayout extends ReadonlyMap<number, infer P> ? P : never =>
    ({ cardId, seat: 'you', anchor: [x, 1, 0], bobAmp, bobHz: bobAmp > 0 ? 0.5 : 0, quads: [quad, quad], keywords: [], hp: null, pips: 0, marks: 0 }) as never;
  const field = new StatusField();
  const layoutOf: StatusLayout = new Map([
    [7, strip(7, -1)],
    [8, strip(8, 1)],
  ]);
  field.commit(layoutOf);
  const anchors = field.mesh.geometry.getAttribute('aAnchor') as THREE.BufferAttribute;
  const buffers = new Map<string, THREE.BufferAttribute>([['anchors', anchors]]);
  const identity = { dx: 0, dy: 0, dz: 0, scale: 1, opacity: 1, dissolve: 0, glow: 0, dRotY: 0 };
  const live = new Map<number, typeof identity>();
  const offsets = { offsetOf: (id: number) => live.get(id) ?? identity, clipOf: () => null } as never;
  const frame = (seconds: number): { flagged: string[]; broken: string[] } => {
    const before = shoot(buffers);
    field.bind(offsets, seconds);
    const after = shoot(buffers);
    return { flagged: flaggedOf(before, after), broken: uploadViolations(before, after) };
  };
  // The first frame after the commit writes what the commit wrote: nothing to send.
  assert.deepEqual(frame(0), { flagged: [], broken: [] }, 'the first still frame re-sent the committed anchors');
  assert.deepEqual(frame(0.016), { flagged: [], broken: [] }, 'a still frame re-sent the anchors');
  // A cue moves card 7: the anchors are sent, card 7's two quads moved and card 8's did not.
  live.set(7, { ...identity, dy: 0.3 });
  assert.deepEqual(frame(0.033), { flagged: ['anchors'], broken: [] }, 'a moved strip did not send its anchors');
  const a = anchors.array as Float32Array;
  assert.deepEqual([a[1], a[4], a[7], a[10]], [Math.fround(1.3), Math.fround(1.3), 1, 1]);
  assert.deepEqual(frame(0.05), { flagged: [], broken: [] }, 'a held offset re-sent the anchors');

  // A hovering figure's strip bobs with it: every frame is a move.
  const bobbing = new StatusField();
  bobbing.commit(new Map([[9, strip(9, 0, 0.02)]]));
  const bobAnchors = bobbing.mesh.geometry.getAttribute('aAnchor') as THREE.BufferAttribute;
  const bobBuffers = new Map<string, THREE.BufferAttribute>([['anchors', bobAnchors]]);
  for (const seconds of [0.1, 0.2, 0.3]) {
    const before = shoot(bobBuffers);
    bobbing.bind(offsets, seconds);
    assert.deepEqual(flaggedOf(before, shoot(bobBuffers)), ['anchors'], `a bobbing strip at ${String(seconds)} s did not send its anchors`);
    assert.deepEqual(uploadViolations(before, shoot(bobBuffers)), []);
  }

  // The negative controls: the strip as it was (anchors flagged every frame), and
  // an anchor written without its flag.
  const settled = shoot(buffers);
  field.bind(offsets, 0.066);
  anchors.needsUpdate = true;
  assert.equal(uploadViolations(settled, shoot(buffers)).length, 1, 'the check no longer sees anchors re-sent on a still frame');
  const quiet = shoot(buffers);
  const anchorArray = anchors.array as Float32Array;
  anchorArray[0] = (anchorArray[0] ?? 0) + 0.5;
  assert.equal(uploadViolations(quiet, shoot(buffers)).length, 1, 'the check no longer sees an anchor written without its flag');
  field.dispose();
  bobbing.dispose();
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
