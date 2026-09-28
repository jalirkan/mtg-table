#!/usr/bin/env node
/*
 * mtg-table — tools/build-figures.mjs
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The Tier 2 figure pipeline** (report 13 §9.3, report 12 §5.7): verified CC0
 * sources in, **one** `web/public/models/figures.glb` out, plus the measured
 * half of `web/src/arena/figures/models.json`.
 *
 *   node tools/build-figures.mjs                       # verify, build, assert, write models.json
 *   node tools/build-figures.mjs --verify-only         # check the sources and stop
 *   node tools/build-figures.mjs --src var/assets/figures
 *   node tools/build-figures.mjs --no-manifest         # do not rewrite models.json
 *   node tools/build-figures.mjs --clip-source experiment --no-manifest \
 *        --out var/assets/figures/build/figures-ual.glb   # T8's retarget experiment
 *
 * It is a **build-box tool, run by hand**: it is not in `check-all.sh` and the
 * app never runs it. `tools/assets-manifest.json` says where every source came
 * from and what its licence badge said on the day; this script says what is
 * actually inside the result — and, since T8, refuses to build from anything that
 * is not byte-for-byte the file the manifest recorded.
 *
 * ---------------------------------------------------------------------------
 * T8 changed five things, and each one answers a finding:
 *
 *  1. **Every source is verified before anything is built** (Tier 2 follow-up
 *     9). Each archive's byte count and sha256 are checked against the manifest,
 *     and a zip is no longer unzipped by hand: the member the model needs is
 *     read OUT OF THE VERIFIED ZIP by the small reader below (central directory,
 *     local header, `inflateRawSync`, CRC-32 checked), so no loose file on disk
 *     can stand in for it. The built file's own byte count and sha256 are written
 *     into `models.json`'s `library` block, so a rebuild can be compared with a
 *     `sha256sum`.
 *  2. **The humanoids share one rig and one clip set** (T8). Three Kenney Mini
 *     characters — agent, hero, scientist — have identical joints, and the clip
 *     set is written once in the manifest's `rigs` block. A clip spelled
 *     `ual:<name>` is **retargeted** from Quaternius's CC0 Universal Animation
 *     Library with `SkeletonUtils.retargetClip`, here, offline, with three running
 *     in Node — so the browser never ships the library's 7.6 MB source rig.
 *  3. **One plain material, no texture** — `palette` is gone. The runtime replaces
 *     every figure material with the holographic `ShaderMaterial`, which reads
 *     position, normal and skin and nothing else; the palette texture and the UVs
 *     were bytes no pixel ever sampled. Every primitive now gets one shared unlit
 *     material, which is also all the skin-aware join needs.
 *  4. **Width and height are measured on the SKINNED mesh, in three** (Tier 2
 *     follow-up 11). `getBounds()` applies a skinned mesh's own node transform,
 *     which glTF says is ignored for a skinned mesh — so the drone, whose mesh node
 *     carries a ×100 scale and a turn, was measured 2.27 wide and 0.76 tall when it
 *     is DRAWN 1.29 × 0.77. The pose clamp believed the wrong number, and every
 *     "overlap" it reported was partly that. Height is now the bind-pose height
 *     three itself normalises by at runtime (`Box3.setFromObject` on the unposed
 *     source), and width is the widest RESTING stance (the clips `REST_CLIP_FOR`
 *     rests `ready` and `crouch` in, at `REST_PHASE_FOR`), along the axis that
 *     becomes x once `facing` is turned to +Z — which also retires follow-up 18's
 *     wrong comment about `max(x, z)`.
 *  5. **NaN skin weights are repaired.** The Quaternius bee carries 12 of them; a
 *     NaN weight makes three's skinned bounding box NaN. They are rebound to the
 *     first joint, and the count is printed.
 *
 * **Slice 4 added the proportioned bodies** (the user: "the avatars are still
 * pretty generic") — Quaternius's CC0 Universal Base Characters, on the SAME
 * 65-joint rig as the Universal Animation Library (see section 4 below):
 *
 *  6. a `.gltf` + `.bin` member is read out of the verified zip, both halves;
 *  7. a hairstyle "rigged to head bone" is GRAFTED onto the body's skin, its
 *     joints remapped by name and its bind shape asserted to be the body's;
 *  8. every humanoid vertex gets its COSTUME SLOT (`_REGION`, the index into
 *     `figures/props.ts`'s `COSTUME_SLOTS`) from the joint that moves it plus two
 *     measured bands (the shirt's V, the belt) — the chibi fallbacks too;
 *  9. the head is scaled ×`headScale` about the Head joint (heroic-miniature
 *     proportions, so what a card wears on its head has a head to sit on);
 * 10. the library's clips are retargeted by WORLD-SPACE DELTA over the whole major
 *     skeleton — no 7-joint chibi in between, so no face-plant — and a clip may be
 *     COMPOSED (`A+B`: A's legs under B's torso; the tapped kneel);
 * 11. meshopt DECIMATES each body to the manifest's `triangles` over its costume
 *     slots (the shirt and belt locked), so twelve figures stay in §8.2's budget;
 *     the drone and the bee are decimated too. The Kenney chibis stay in the
 *     library as `<id>-chibi`, a traits.json `body: chibi` away.
 * ---------------------------------------------------------------------------
 *
 * The pipeline, per model, in order:
 *
 *   extract   the member, out of its verified archive
 *   repair    NaN / zero-sum skin weights → the first joint
 *   prune     drop everything nothing references
 *   dedup     one accessor per identical buffer
 *   material  ONE unlit material for every primitive; no textures, no UVs, no
 *             vertex colours (see 3)
 *   join      skin-aware: `gltf-transform join` skips any node carrying a skin
 *             (`@gltf-transform/functions/dist/index.js:3511`, `if (node.getSkin())
 *             continue;`), so the join is done here with `joinPrimitives` — legal
 *             only when every source primitive is bound to the same skeleton, and
 *             that is ASSERTED
 *   clips     the model's clip set: the pack's own (renamed `<id>_<clip>`, every
 *             other clip dropped) plus the retargeted ones
 *   weld · unlit · resample · prune (keep attributes — see the NORMAL note)
 *   measure   bind height + resting width, in three (see 4)
 * then, for the library:
 *   merge (one scene) · prune · meshopt — and NOTHING after meshopt.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crc32, inflateRawSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const WEB = join(REPO, 'web');

/**
 * `@gltf-transform/*` is a **web/ dev dependency**, and this script lives in
 * `tools/`, so Node's upward `node_modules` walk from here never finds it.
 * Resolving against `web/package.json` is what makes one install serve both.
 */
const require = createRequire(join(WEB, 'package.json'));
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { compactPrimitive, joinPrimitives } = require('@gltf-transform/functions');
/**
 * **Slice 4 — the simplifier the CLI itself runs.** `@gltf-transform/cli` pins
 * its own `meshoptimizer` (~1.2.0, nested under the CLI) while `web/` also has
 * an older copy at the top level; the build resolves the CLI's, so a decimated
 * body is exactly what `gltf-transform simplify` would make of it. meshopt's
 * simplifier is deterministic, which is what keeps two builds byte-identical.
 */
const { MeshoptSimplifier } = await import(
  pathToFileURL(createRequire(join(WEB, 'node_modules/@gltf-transform/cli/package.json')).resolve('meshoptimizer')).href
);
await MeshoptSimplifier.ready;

/**
 * **three, in Node, for the two jobs only three can do right**: retargeting
 * (`SkeletonUtils.retargetClip`) and measuring a SKINNED mesh
 * (`SkinnedMesh.computeBoundingBox`). It is the installed `three@0.186.0` — the
 * same code the arena runs — imported by file URL because `three`'s `exports` map
 * does not export `package.json` and `require('three')` is its deprecated CJS
 * build. `GLTFLoader` then resolves its own bare `'three'` to the same URL, so
 * there is one module instance.
 */
const THREE_DIR = join(WEB, 'node_modules/three/');
const THREE = await import(pathToFileURL(join(THREE_DIR, 'build/three.module.js')).href);
const { GLTFLoader } = await import(pathToFileURL(join(THREE_DIR, 'examples/jsm/loaders/GLTFLoader.js')).href);
const SkeletonUtils = await import(pathToFileURL(join(THREE_DIR, 'examples/jsm/utils/SkeletonUtils.js')).href);
/**
 * The resting stances are the RENDERER's, read from the one place they are
 * defined (`figures/clips.ts`) — Node 24 imports TypeScript by type stripping,
 * and that module imports nothing but `./types.ts`.
 */
const { REST_CLIP_FOR, REST_PHASE_FOR } = await import(
  pathToFileURL(join(WEB, 'src/arena/figures/clips.ts')).href
);
/**
 * **Slice 4 — the costume regions**, read from the one place their order is
 * defined (`figures/props.ts`'s `COSTUME_SLOTS`): the build writes each vertex's
 * slot INDEX as the custom attribute `_REGION`, and the holographic shader looks
 * the slot's colour up in the figure's palette. The two cannot drift apart.
 */
const { COSTUME_SLOTS } = await import(pathToFileURL(join(WEB, 'src/arena/figures/props.ts')).href);
const SLOT = Object.fromEntries(COSTUME_SLOTS.map((slot, i) => [slot, i]));

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const SRC = resolve(arg('src', join(REPO, 'var/assets/figures')));
const OUT = resolve(arg('out', join(WEB, 'public/models/figures.glb')));
const WORK = resolve(arg('work', join(REPO, 'var/assets/figures/build/work')));
const MANIFEST = join(REPO, 'tools/assets-manifest.json');
const MODELS_JSON = join(WEB, 'src/arena/figures/models.json');
const CLI = join(WEB, 'node_modules/.bin/gltf-transform');
const WRITE_MANIFEST = !args.includes('--no-manifest');
const VERIFY_ONLY = args.includes('--verify-only');
/** `chosen` (the manifest's `clips`) or `experiment` (every clip the library can supply). */
const CLIP_SOURCE = arg('clip-source', 'chosen');
/** The resting stances whose width a neighbour must clear (see header, point 4). */
const WIDTH_STANCES = ['ready', 'crouch'];

if (!existsSync(CLI)) fail(`@gltf-transform/cli is not installed. Run: npm --prefix web install`);
if (CLIP_SOURCE !== 'chosen' && CLIP_SOURCE !== 'experiment') {
  fail(`--clip-source must be "chosen" or "experiment" (got "${CLIP_SOURCE}")`);
}

function fail(message) {
  console.error(`build-figures: ${message}`);
  process.exit(1);
}

function cli(command, input, output, extra = []) {
  const out = execFileSync(CLI, [command, input, output, ...extra], { encoding: 'utf8' });
  const line = out.trim().split('\n').filter((l) => l.includes('→')).pop();
  console.log(`  ${command.padEnd(9)} ${line ?? ''}`.trimEnd());
  return output;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/** The IO the whole script shares: **with every extension registered.** */
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

// ---------------------------------------------------------------------------
// 1 — the sources, verified
// ---------------------------------------------------------------------------

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
if (manifest.version !== 2) fail(`tools/assets-manifest.json is version ${String(manifest.version)}; this script reads 2`);

/** pack id → the verified bytes of its file. Read once, hashed once. */
const verified = new Map();

function verifiedPack(packId) {
  const cached = verified.get(packId);
  if (cached !== undefined) return cached;
  const pack = manifest.packs[packId];
  if (pack === undefined) fail(`no pack "${packId}" in the manifest`);
  const path = join(SRC, pack.file);
  const howTo =
    `  Download ${pack.downloadUrl}\n` +
    (pack._download ? `  (${pack._download})\n` : '') +
    `  into ${SRC} as "${pack.file}" — do NOT unzip it — and run again.`;
  if (!existsSync(path)) fail(`${packId}: missing source ${path}\n${howTo}`);
  const bytes = readFileSync(path);
  const digest = sha256(bytes);
  if (bytes.byteLength !== pack.bytes || digest !== pack.sha256) {
    fail(
      `${packId}: ${pack.file} is NOT the file the manifest recorded\n` +
        `  expected ${String(pack.bytes)} bytes, sha256 ${pack.sha256}\n` +
        `  found    ${String(bytes.byteLength)} bytes, sha256 ${digest}\n` +
        `  Refusing to build from an unverified source (Tier 2 follow-up 9).\n${howTo}`,
    );
  }
  console.log(`  verified  ${pack.file.padEnd(44)} ${String(bytes.byteLength).padStart(9)} B  sha256 ${digest.slice(0, 16)}…  ${pack.licence}`);
  const entry = { pack, bytes, zip: pack.archive === 'zip' ? readZipDirectory(bytes, packId) : null };
  verified.set(packId, entry);
  return entry;
}

/**
 * **A zip reader, twenty lines, no dependency and no shell.** `unzip -p` would
 * do, except that `[` and `]` are wildcards to it and the library's own file is
 * called `Universal Animation Library[Standard].zip` — and, more to the point, a
 * build that reads out of the verified archive cannot be fooled by whatever was
 * unzipped next to it last month.
 */
function readZipDirectory(buffer, packId) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) fail(`${packId}: not a zip (no end-of-central-directory record)`);
  const count = buffer.readUInt16LE(eocd + 10);
  let p = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(p) !== 0x02014b50) fail(`${packId}: corrupt central directory`);
    const nameLength = buffer.readUInt16LE(p + 28);
    const name = buffer.toString('utf8', p + 46, p + 46 + nameLength);
    entries.set(name, {
      method: buffer.readUInt16LE(p + 10),
      crc: buffer.readUInt32LE(p + 16),
      compressed: buffer.readUInt32LE(p + 20),
      size: buffer.readUInt32LE(p + 24),
      offset: buffer.readUInt32LE(p + 42),
    });
    p += 46 + nameLength + buffer.readUInt16LE(p + 30) + buffer.readUInt16LE(p + 32);
  }
  return entries;
}

/** The bytes of one source file: a member of a verified zip, or the verified file itself. */
function sourceBytes(packId, member) {
  const { pack, bytes, zip } = verifiedPack(packId);
  if (zip === null) {
    if (member !== null && member !== undefined) fail(`${packId}: "${pack.file}" is not an archive; member "${member}" is meaningless`);
    return bytes;
  }
  const entry = zip.get(member);
  if (entry === undefined) fail(`${packId}: the verified archive has no member "${member}"`);
  const at = entry.offset;
  if (bytes.readUInt32LE(at) !== 0x04034b50) fail(`${packId}: bad local header for "${member}"`);
  const start = at + 30 + bytes.readUInt16LE(at + 26) + bytes.readUInt16LE(at + 28);
  const raw = bytes.subarray(start, start + entry.compressed);
  const data = entry.method === 0 ? Buffer.from(raw) : entry.method === 8 ? inflateRawSync(raw) : null;
  if (data === null) fail(`${packId}: "${member}" uses zip method ${String(entry.method)}`);
  if (data.byteLength !== entry.size || crc32(data) !== entry.crc) fail(`${packId}: "${member}" fails its CRC-32`);
  return data;
}

console.log('sources');
for (const [id, spec] of Object.entries(manifest.models)) {
  if (id.startsWith('_') || spec.sameAs !== undefined) continue;
  verifiedPack(spec.pack);
}
for (const [rigId, rig] of Object.entries(manifest.rigs ?? {})) {
  if (rigId.startsWith('_')) continue;
  const clips = CLIP_SOURCE === 'experiment' ? { ...rig.clips, ...rig.experiment } : rig.clips;
  if (Object.values(clips).some((c) => typeof c === 'string' && c.startsWith('ual:'))) {
    verifiedPack(rig.retarget.pack);
  }
}
if (VERIFY_ONLY) {
  console.log('\nevery source matches tools/assets-manifest.json — nothing built (--verify-only)');
  process.exit(0);
}

rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
mkdirSync(dirname(OUT), { recursive: true });

// ---------------------------------------------------------------------------
// three in Node
// ---------------------------------------------------------------------------

/**
 * A `gltf-transform` document → three's `GLTFLoader` result. Textures are the one
 * thing three cannot decode in Node (no `createImageBitmap`), and nothing measured
 * here reads one, so a copy is written without them.
 */
async function toThree(doc) {
  // A copy by round trip — `Document` has no `clone()` in gltf-transform 4.
  const copy = await io.readBinary(await io.writeBinary(doc));
  for (const texture of copy.getRoot().listTextures()) texture.dispose();
  const glb = await io.writeBinary(copy);
  const buffer = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength);
  return new Promise((ok, bad) => new GLTFLoader().parse(buffer, '', ok, bad));
}

function firstSkinned(root) {
  let found = null;
  root.traverse((o) => {
    if (found === null && o.isSkinnedMesh) found = o;
  });
  return found;
}

/**
 * The bounding box of what three would DRAW: every mesh under `root`, skinned by
 * its bones' current world matrices. Non-finite vertices are skipped (and there
 * are none after `repairWeights`).
 */
function drawnBox(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const position = o.geometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      if (o.isSkinnedMesh) o.getVertexPosition(i, v);
      else v.fromBufferAttribute(position, i);
      v.applyMatrix4(o.matrixWorld);
      if (Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)) box.expandByPoint(v);
    }
  });
  return box;
}

// ---------------------------------------------------------------------------
// 2 — the retarget (report 13 §9.5), once per rig
// ---------------------------------------------------------------------------

/** rig id → Map(source clip name → { tracks: [{ joint, path, times, values }], duration }) */
const retargetCache = new Map();

/**
 * **`SkeletonUtils.retargetClip`, and the one trap in it that cost a morning.**
 *
 * The source it animates must be an object whose `updateMatrixWorld()` reaches
 * the BONES. `retargetClip` builds its mixer on `source` and calls
 * `source.updateMatrixWorld()` after every step — and in a GLTFLoader scene the
 * bones are the skinned mesh's SIBLINGS (`Armature → {Mannequin, root → pelvis →
 * …}`), not its children. Passing the SkinnedMesh therefore leaves every
 * unmapped ancestor's world matrix at its bind pose: the pelvis and spine never
 * move, and every clip retargets UPRIGHT — a death that never falls. The fix is
 * to pass the scene root with the skeleton hung on it.
 */
async function retargetedClips(rigId, rig, names) {
  let cache = retargetCache.get(rigId);
  if (cache === undefined) {
    cache = new Map();
    retargetCache.set(rigId, cache);
  }
  const missing = names.filter((n) => !cache.has(n));
  if (missing.length === 0) return cache;

  const spec = rig.retarget;
  const source = await toThree(await io.readBinary(withoutImages(sourceBytes(spec.pack, spec.member))));
  const sourceMesh = firstSkinned(source.scene);
  if (sourceMesh === null) fail(`${rigId}: the retarget source has no skinned mesh`);
  source.scene.skeleton = sourceMesh.skeleton; // see the doc comment: the ROOT carries the skeleton

  // The target is the rig itself: any model naming it will do, since the build
  // asserts they are identical. The first one is used.
  const [firstId, firstSpec] = Object.entries(manifest.models).find(([, m]) => m.rig === rigId);
  const target = await toThree(await io.readBinary(withoutImages(sourceBytes(firstSpec.pack, firstSpec.member))));
  const targetMesh = firstSkinned(target.scene);
  source.scene.updateMatrixWorld(true);
  target.scene.updateMatrixWorld(true);

  // `names` is target joint → source bone. The rig's root is deliberately NOT in
  // it (it takes translation only — see `hip`), and SkeletonUtils falls back to a
  // same-name lookup for an unmapped bone — the library HAS a bone called `root`,
  // whose world rotation is the file's Z-up turn — so it is mapped to nothing.
  const map = { ...spec.names, [spec.hip.joint]: '__not-a-bone__' };
  const localOffsets = {};
  const q1 = new THREE.Quaternion();
  const q2 = new THREE.Quaternion();
  for (const [joint, bone] of Object.entries(spec.names)) {
    const s = source.scene.getObjectByName(bone);
    const t = target.scene.getObjectByName(joint);
    if (!s || !t) fail(`${rigId}: cannot map ${joint} ← ${bone}`);
    s.getWorldQuaternion(q1);
    t.getWorldQuaternion(q2);
    // targetWorld(t) = sourceWorld(t) × inverse(sourceBind) × targetBind: the
    // bone's world-space delta from its T-pose, carried onto the other T-pose.
    localOffsets[joint] = new THREE.Matrix4().makeRotationFromQuaternion(q1.clone().invert().multiply(q2));
  }
  const hipBone = source.scene.getObjectByName(spec.hip.source);
  const hipJoint = target.scene.getObjectByName(spec.hip.joint);
  const hipBind = new THREE.Vector3().setFromMatrixPosition(hipBone.matrixWorld);
  // The hip HEIGHT ratio: the chibi's legs hang from `torso`'s pivot.
  const legPivot = new THREE.Vector3().setFromMatrixPosition(target.scene.getObjectByName('torso').matrixWorld);
  const scale = legPivot.y / hipBind.y;
  const rootBind = hipJoint.position.clone();

  for (const name of missing) {
    const clip = source.animations.find((a) => a.name === name);
    if (clip === undefined) fail(`${rigId}: the retarget source has no clip "${name}"`);
    const out = SkeletonUtils.retargetClip(targetMesh, source.scene, clip, {
      names: map,
      localOffsets,
      hip: '__no-hip__',
      fps: spec.fps,
    });
    const tracks = [];
    for (const track of out.tracks) {
      const m = /^\.bones\[(.+)\]\.quaternion$/.exec(track.name);
      if (m === null || m[1] === spec.hip.joint) continue;
      tracks.push({ joint: m[1], path: 'rotation', times: Float32Array.from(track.times), values: Float32Array.from(track.values) });
    }
    // The hip's translation, sampled on retargetClip's own frame grid.
    const frames = Math.round(clip.duration * spec.fps);
    const delta = clip.duration / (frames - 1);
    const mixer = new THREE.AnimationMixer(source.scene);
    const action = mixer.clipAction(clip);
    action.play();
    const times = new Float32Array(frames);
    const values = new Float32Array(frames * 3);
    const p = new THREE.Vector3();
    for (let f = 0; f < frames; f += 1) {
      action.time = Math.min(f * delta, clip.duration - 1e-7);
      mixer.update(0);
      source.scene.updateMatrixWorld(true);
      p.setFromMatrixPosition(hipBone.matrixWorld).sub(hipBind).multiplyScalar(scale).add(rootBind);
      times[f] = f * delta;
      p.toArray(values, f * 3);
    }
    mixer.stopAllAction();
    mixer.uncacheRoot(source.scene);
    tracks.push({ joint: spec.hip.joint, path: 'translation', times, values });
    cache.set(name, { tracks, duration: clip.duration });
    console.log(
      `  retarget  ${rigId} ← ${name.padEnd(20)} ${clip.duration.toFixed(2)} s · ${String(frames)} frames · ` +
        `${String(tracks.length)} tracks (onto ${firstId}'s rig, hip scale ${scale.toFixed(4)})`,
    );
  }
  return cache;
}

// ---------------------------------------------------------------------------
// 3 — per-model steps
// ---------------------------------------------------------------------------

/**
 * **Drop every image and texture reference from a `.glb`'s JSON chunk**, before
 * gltf-transform ever sees it.
 *
 * The Kenney files reference their colormap as an EXTERNAL file
 * (`Textures/colormap.png`), which `NodeIO.readBinary` cannot resolve — and
 * nothing here needs it, because the figure library carries no texture at all
 * (header, point 3). The binary chunk is untouched.
 */
function withoutImages(glb) {
  if (glb.readUInt32LE(0) !== 0x46546c67) fail('not a .glb (bad magic)');
  const jsonLength = glb.readUInt32LE(12);
  if (glb.readUInt32LE(16) !== 0x4e4f534a) fail('.glb: the first chunk is not JSON');
  const json = JSON.parse(glb.toString('utf8', 20, 20 + jsonLength));
  delete json.images;
  delete json.textures;
  delete json.samplers;
  for (const material of json.materials ?? []) {
    const pbr = material.pbrMetallicRoughness;
    if (pbr) {
      delete pbr.baseColorTexture;
      delete pbr.metallicRoughnessTexture;
    }
    delete material.normalTexture;
    delete material.occlusionTexture;
    delete material.emissiveTexture;
  }
  let text = Buffer.from(JSON.stringify(json), 'utf8');
  const pad = (4 - (text.byteLength % 4)) % 4;
  if (pad > 0) text = Buffer.concat([text, Buffer.alloc(pad, 0x20)]);
  const rest = glb.subarray(20 + jsonLength);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + text.byteLength + rest.byteLength, 8);
  header.writeUInt32LE(text.byteLength, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  return new Uint8Array(Buffer.concat([header, text, rest]));
}

/** Rebind every vertex whose skin weights are NaN or sum to zero to the first joint. */
function repairWeights(doc) {
  let repaired = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const weights = prim.getAttribute('WEIGHTS_0');
      const joints = prim.getAttribute('JOINTS_0');
      if (weights === null || joints === null) continue;
      const w = [0, 0, 0, 0];
      for (let i = 0; i < weights.getCount(); i += 1) {
        weights.getElement(i, w);
        const sum = w[0] + w[1] + w[2] + w[3];
        if (Number.isFinite(sum) && sum > 1e-6) continue;
        weights.setElement(i, [1, 0, 0, 0]);
        joints.setElement(i, [0, 0, 0, 0]);
        repaired += 1;
      }
    }
  }
  return repaired;
}

/**
 * **One material, and no texture** (header, point 3). Every primitive under the
 * model gets the same unlit stencil material; UVs and vertex colours go, because
 * the holographic `ShaderMaterial` the runtime swaps in reads neither.
 */
function oneMaterial(doc, id) {
  const material = doc.createMaterial(`${id}-stencil`).setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(1);
  let primitives = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      prim.setMaterial(material);
      for (const semantic of prim.listSemantics()) {
        if (/^(TEXCOORD|COLOR)_\d+$/.test(semantic)) prim.setAttribute(semantic, null);
      }
      primitives += 1;
    }
  }
  for (const old of doc.getRoot().listMaterials()) if (old !== material) old.dispose();
  for (const texture of doc.getRoot().listTextures()) texture.dispose();
  return primitives;
}

/**
 * Merge every skinned primitive under `root` into one, or explain why not.
 *
 * The legality condition is the skeleton: `joinPrimitives` concatenates vertex
 * attributes, and `JOINTS_0` indexes into the *skin's* joint list, so two
 * primitives may only be joined when their skins name the same joints in the
 * same order. That is checked rather than hoped for — the Kenney character has
 * two skins that happen to be identical, and a pack that did not would have
 * produced a figure whose head animated with its legs' bones.
 */
function joinSkinned(root, id) {
  const skinned = [];
  const walk = (node) => {
    if (node.getMesh() !== null && node.getSkin() !== null) skinned.push(node);
    for (const child of node.listChildren()) walk(child);
  };
  walk(root);
  if (skinned.length === 0) fail(`${id}: no skinned mesh under "${root.getName()}"`);

  const joints = skinned[0].getSkin().listJoints();
  for (const node of skinned.slice(1)) {
    const other = node.getSkin().listJoints();
    if (other.length !== joints.length || other.some((j, i) => j !== joints[i])) {
      fail(`${id}: two skins with different joint lists — refusing to join primitives across them`);
    }
  }

  // **Same joints is not same skin** (T8's measurement, a slice-1 defect). A
  // skin is its joints AND its inverse bind matrices, and FBX2glTF bakes each
  // mesh's own bind transform into its skin's IBMs: the drone's two skins name
  // the same eleven joints with IBMs 0.28 units apart, so joining the body's
  // primitives under the eyes' skin moved the whole body. Each other skin is
  // therefore REBASED onto the first: for every joint `C = IBM_dst⁻¹ · IBM_src`
  // must be one and the same matrix (else the join is refused), and applying `C`
  // to the primitive's positions and normals makes it draw exactly as it did.
  const rebased = [];
  const dstIbm = skinned[0].getSkin().getInverseBindMatrices()?.getArray() ?? null;
  for (const node of skinned.slice(1)) {
    const srcIbm = node.getSkin().getInverseBindMatrices()?.getArray() ?? null;
    if (dstIbm === null || srcIbm === null) continue;
    let common = null;
    for (let j = 0; j < joints.length; j += 1) {
      const c = new THREE.Matrix4().fromArray(dstIbm, j * 16).invert().multiply(new THREE.Matrix4().fromArray(srcIbm, j * 16));
      if (common === null) common = c;
      else if (!c.elements.every((e, k) => Math.abs(e - common.elements[k]) < 1e-4)) {
        fail(`${id}: two skins whose bind matrices differ by more than one common transform — refusing to join`);
      }
    }
    if (common === null || common.equals(new THREE.Matrix4())) continue;
    if (common.elements.every((e, k) => Math.abs(e - new THREE.Matrix4().elements[k]) < 1e-7)) continue;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(common);
    const v = new THREE.Vector3();
    for (const prim of node.getMesh().listPrimitives()) {
      for (const [semantic, apply] of [
        ['POSITION', (x) => x.applyMatrix4(common)],
        ['NORMAL', (x) => x.applyMatrix3(normalMatrix).normalize()],
      ]) {
        const accessor = prim.getAttribute(semantic);
        if (accessor === null) continue;
        const copy = accessor.clone();
        const el = [0, 0, 0];
        for (let i = 0; i < copy.getCount(); i += 1) {
          copy.getElement(i, el);
          apply(v.set(el[0], el[1], el[2])).toArray(el);
          copy.setElement(i, el);
        }
        prim.setAttribute(semantic, copy);
      }
    }
    const t = new THREE.Vector3().setFromMatrixPosition(common);
    rebased.push(`${node.getName()} by (${t.toArray().map((n) => n.toFixed(4)).join(', ')})`);
  }
  if (rebased.length > 0) console.log(`  rebase    ${rebased.join('; ')} — a second skin's bind shape, carried onto the first`);

  const prims = [];
  for (const node of skinned) prims.push(...node.getMesh().listPrimitives());
  const materials = new Set(prims.map((p) => p.getMaterial()));
  if (materials.size !== 1) fail(`${id}: ${String(materials.size)} materials — one figure would be ${String(materials.size)} draw calls`);
  if (prims.length === 1) return { joined: 1, joints };

  const dstMesh = skinned[0].getMesh();
  for (const node of skinned) {
    for (const prim of node.getMesh().listPrimitives()) node.getMesh().removePrimitive(prim);
  }
  dstMesh.addPrimitive(joinPrimitives(prims));
  for (const node of skinned.slice(1)) {
    node.setMesh(null);
    node.setSkin(null);
    node.dispose();
  }
  return { joined: prims.length, joints };
}

/** FBX2glTF prefixes the armature: `"CharacterArmature|Attack"` (report 12 §2.4). */
function normaliseClipName(name) {
  const bar = name.lastIndexOf('|');
  return bar < 0 ? name : name.slice(bar + 1);
}

/** The clip map a model is built with: its own, or its rig's. */
function clipMapOf(id, spec) {
  if (spec.rig === undefined) return spec.clips ?? {};
  const rig = manifest.rigs?.[spec.rig];
  if (rig === undefined) fail(`${id}: no rig "${spec.rig}" in the manifest`);
  if (spec.clips !== undefined) fail(`${id}: a model on a rig takes the rig's clip set; it may not carry its own`);
  return CLIP_SOURCE === 'experiment' ? { ...rig.clips, ...rig.experiment } : rig.clips;
}

/**
 * The model's width in its widest RESTING stance and its bind-pose height, as
 * three draws them (header, point 4). Returns model units.
 */
async function measure(doc, id, clipMap, facing) {
  const gltf = await toThree(doc);
  const scene = gltf.scene;
  // Bind pose: what `models.ts` normalises by (`Box3.setFromObject` on the unposed
  // source). Its min.y is also what lifts the figure's feet to the table.
  const bind = drawnBox(scene);
  const height = bind.max.y - bind.min.y;
  const across = facing === '+z' || facing === '-z' ? 'x' : 'z';
  const mixer = new THREE.AnimationMixer(scene);
  const widths = {};
  let width = 0;
  for (const stance of WIDTH_STANCES) {
    // `REST_CLIP_FOR` names a clip; a model without it rests in `idle`, and one
    // with no idle holds its bind pose — CueRunner's own fall-through.
    const want = clipMap[REST_CLIP_FOR[stance]] !== undefined ? REST_CLIP_FOR[stance] : 'idle';
    const clip = gltf.animations.find((a) => a.name === `${id}_${clipKeyName(clipMap, want)}`);
    mixer.stopAllAction();
    if (clip !== undefined) {
      const action = mixer.clipAction(clip);
      action.play();
      action.time = REST_PHASE_FOR[stance] * clip.duration;
      mixer.update(0);
    }
    const box = drawnBox(scene);
    const w = across === 'x' ? box.max.x - box.min.x : box.max.z - box.min.z;
    widths[stance] = w;
    width = Math.max(width, w);
  }
  return { height, width, bindWidth: across === 'x' ? bind.max.x - bind.min.x : bind.max.z - bind.min.z, widths };
}

/** The file-side clip name a clip key ends up under (see the `clips` step). */
function clipKeyName(clipMap, key) {
  const raw = clipMap[key];
  if (raw === undefined) return undefined;
  return raw.startsWith('ual:') ? `ual-${raw.slice(4)}` : normaliseClipName(raw);
}

// ---------------------------------------------------------------------------
// 4 — slice 4: the proportioned bodies (Quaternius's Universal Base Characters)
// ---------------------------------------------------------------------------
//
// The user's verdict on slice 3 was "the avatars are still pretty generic": the
// chibi bodies were toys whose only identity was a tint and what they carried.
// A proportioned body in a painted costume reads as a PERSON in a costume. The
// Universal Base Characters are CC0, glTF, on the SAME 65-joint humanoid rig as
// the Universal Animation Library (same author, same joint names) — so the
// library's clips land on them joint for joint instead of through a 7-joint
// chibi, which is what face-planted the head in slice 2 (D68). Six steps are
// new, each below: the member is a `.gltf` + `.bin` pair; a hairstyle is grafted
// onto the body's skin; the head is scaled up a little (heroic miniature
// proportions, so a hat, a helmet or an eyepatch has a head to sit on at 60 px);
// every vertex is given its costume slot; the clips are retargeted by world-space
// delta over the whole major skeleton; and the result is decimated with meshopt's
// simplifier to a triangle target that keeps twelve figures inside the budget.

/** Strip everything a texture needs from a glTF JSON (the library carries none — header, point 3). */
function stripImages(json) {
  delete json.images;
  delete json.textures;
  delete json.samplers;
  for (const material of json.materials ?? []) {
    const pbr = material.pbrMetallicRoughness;
    if (pbr) {
      delete pbr.baseColorTexture;
      delete pbr.metallicRoughnessTexture;
    }
    delete material.normalTexture;
    delete material.occlusionTexture;
    delete material.emissiveTexture;
    delete material.extensions;
  }
  return json;
}

/**
 * A member of a verified archive → a gltf-transform document. A `.gltf` member's
 * buffers are read OUT OF THE SAME VERIFIED ZIP, relative to it, so no loose file
 * on disk can stand in for either half (the `.glb` rule, header point 1).
 */
async function readMemberDocument(packId, member) {
  if (!member.endsWith('.gltf')) return io.readBinary(withoutImages(sourceBytes(packId, member)));
  const json = stripImages(JSON.parse(sourceBytes(packId, member).toString('utf8')));
  const dir = member.slice(0, member.lastIndexOf('/') + 1);
  const resources = {};
  for (const buffer of json.buffers ?? []) {
    resources[buffer.uri] = new Uint8Array(sourceBytes(packId, dir + decodeURIComponent(buffer.uri)));
  }
  return io.readJSON({ json, resources });
}

/** Every node under the scene, depth first. */
function allNodes(doc) {
  const out = [];
  const walk = (node) => {
    out.push(node);
    for (const child of node.listChildren()) walk(child);
  };
  for (const scene of doc.getRoot().listScenes()) for (const node of scene.listChildren()) walk(node);
  return out;
}

/**
 * **Keep one skinned mesh** — the body — and drop the rest (the eyes and the
 * eyebrows: at 60 px a figure's head is 12 px tall, and each is a thousand
 * triangles the budget would rather spend on the silhouette).
 */
function keepBody(doc, bodyName, id) {
  let body = null;
  for (const node of allNodes(doc)) {
    if (node.getMesh() === null) continue;
    if (node.getName() === bodyName) {
      body = node;
      continue;
    }
    node.setMesh(null);
    node.setSkin(null);
    node.dispose();
  }
  if (body === null || body.getSkin() === null) fail(`${id}: no skinned body mesh "${bodyName}"`);
  return body;
}

/** A skin's inverse bind matrix for one joint, as a three `Matrix4`. */
function ibmOf(skin, index) {
  return new THREE.Matrix4().fromArray(skin.getInverseBindMatrices().getArray(), index * 16);
}

/**
 * **Graft a hairstyle onto the body's skin.** The pack ships each hairstyle
 * "rigged to head bone" on the same 65-joint armature (measured: every hair
 * vertex is weighted 100% to `Head`, and the male and female hairstyles carry the
 * male and female bodies' own `Head` bind matrices). Its joints are remapped to
 * the body skin's order BY NAME, and its bind shape is carried onto the body's
 * head by `C = IBM_body(Head)⁻¹ · IBM_hair(Head)` — the identity for a hairstyle
 * made for this body, and asserted to be one common transform for every joint the
 * hair uses. Returns the new primitive, so its vertices can be given the `hair`
 * slot.
 */
function graftHair(doc, body, hairDoc, id) {
  const hairNode = allNodes(hairDoc).find((n) => n.getMesh() !== null && n.getSkin() !== null);
  if (hairNode === undefined) fail(`${id}: the hairstyle has no skinned mesh`);
  const bodySkin = body.getSkin();
  const bodyJoints = bodySkin.listJoints().map((j) => j.getName());
  const hairSkin = hairNode.getSkin();
  const hairJoints = hairSkin.listJoints().map((j) => j.getName());
  const remap = hairJoints.map((name) => bodyJoints.indexOf(name));
  const buffer = doc.getRoot().listBuffers()[0];
  const grafted = [];
  for (const prim of hairNode.getMesh().listPrimitives()) {
    const joints = prim.getAttribute('JOINTS_0');
    const weights = prim.getAttribute('WEIGHTS_0');
    const used = new Set();
    const j = [0, 0, 0, 0];
    const w = [0, 0, 0, 0];
    for (let i = 0; i < joints.getCount(); i += 1) {
      joints.getElement(i, j);
      weights.getElement(i, w);
      for (let k = 0; k < 4; k += 1) if (w[k] > 0) used.add(j[k]);
    }
    let common = null;
    for (const index of used) {
      if (remap[index] < 0) fail(`${id}: the hairstyle is weighted to "${hairJoints[index]}", which the body has no joint for`);
      const c = ibmOf(bodySkin, remap[index]).invert().multiply(ibmOf(hairSkin, index));
      if (common === null) common = c;
      else if (!c.elements.every((e, k) => Math.abs(e - common.elements[k]) < 1e-4)) {
        fail(`${id}: the hairstyle's bind shape differs from the body's by more than one transform`);
      }
    }
    common ??= new THREE.Matrix4();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(common);
    const positions = prim.getAttribute('POSITION');
    const normals = prim.getAttribute('NORMAL');
    const count = positions.getCount();
    const pos = new Float32Array(count * 3);
    const nor = new Float32Array(count * 3);
    // The body's own component type (unsigned bytes in this pack): the join
    // groups primitives by it, and 65 joints fit a byte.
    const JointArray = body.getMesh().listPrimitives()[0].getAttribute('JOINTS_0').getArray().constructor;
    const jnt = new JointArray(count * 4);
    const wgt = new Float32Array(count * 4);
    const v = new THREE.Vector3();
    const e = [0, 0, 0];
    for (let i = 0; i < count; i += 1) {
      positions.getElement(i, e);
      v.set(e[0], e[1], e[2]).applyMatrix4(common).toArray(pos, i * 3);
      normals.getElement(i, e);
      v.set(e[0], e[1], e[2]).applyMatrix3(normalMatrix).normalize().toArray(nor, i * 3);
      joints.getElement(i, j);
      weights.getElement(i, w);
      for (let k = 0; k < 4; k += 1) {
        jnt[i * 4 + k] = w[k] > 0 ? remap[j[k]] : 0;
        wgt[i * 4 + k] = w[k];
      }
    }
    const indices = prim.getIndices();
    const out = doc
      .createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buffer))
      .setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(jnt).setBuffer(buffer))
      .setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(wgt).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(indices.getArray())).setBuffer(buffer))
      .setMaterial(body.getMesh().listPrimitives()[0].getMaterial());
    body.getMesh().addPrimitive(out);
    grafted.push(out);
  }
  return grafted;
}

/** Each joint's bind position (the inverse bind matrix's inverse), by name, in the mesh's bind space. */
function bindPositions(skin) {
  const out = new Map();
  skin.listJoints().forEach((joint, i) => {
    out.set(joint.getName(), new THREE.Vector3().setFromMatrixPosition(ibmOf(skin, i).invert()));
  });
  return out;
}

/**
 * **Heroic-miniature proportions** (`headScale`, the manifest's): every vertex
 * moves away from the `Head` joint's bind position by `(s − 1) × w_head`, where
 * `w_head` is its skin weight on the head — so the hair and the face grow as one
 * and the neck, weighted partly to the head, blends into it with no seam. A
 * superhero body is 8.6 heads tall; at 60 px on the table its head is a 7-pixel
 * dot and nothing a card wears on it can be seen. Tabletop miniatures solve the
 * same problem the same way (a head and a half, roughly). Normals are unchanged by
 * a uniform scale. Returns the head's bind position.
 */
function scaleHead(body, factor, id) {
  const skin = body.getSkin();
  const names = skin.listJoints().map((j) => j.getName());
  const head = names.indexOf('Head');
  if (head < 0) fail(`${id}: no Head joint to scale about`);
  const pivot = new THREE.Vector3().setFromMatrixPosition(ibmOf(skin, head).invert());
  if (factor === 1) return pivot;
  const e = [0, 0, 0];
  const j = [0, 0, 0, 0];
  const w = [0, 0, 0, 0];
  for (const prim of body.getMesh().listPrimitives()) {
    const positions = prim.getAttribute('POSITION').clone();
    const joints = prim.getAttribute('JOINTS_0');
    const weights = prim.getAttribute('WEIGHTS_0');
    for (let i = 0; i < positions.getCount(); i += 1) {
      joints.getElement(i, j);
      weights.getElement(i, w);
      let onHead = 0;
      for (let k = 0; k < 4; k += 1) if (j[k] === head) onHead += w[k];
      if (onHead <= 0) continue;
      positions.getElement(i, e);
      const k = (factor - 1) * onHead;
      positions.setElement(i, [e[0] + k * (e[0] - pivot.x), e[1] + k * (e[1] - pivot.y), e[2] + k * (e[2] - pivot.z)]);
    }
    prim.setAttribute('POSITION', positions);
  }
  return pivot;
}

/**
 * **The costume slot of a joint**, per rig — the part of the body that joint
 * moves. The two measured bands (the shirt's V, the belt) are applied after, by
 * position, because no joint moves a shirt front.
 */
const SLOT_OF_JOINT = {
  ubc: (name) => {
    if (name === 'Head' || name === 'neck_01') return 'skin';
    if (/^(spine_0[123]|clavicle_[lr]|upperarm_[lr]|lowerarm_[lr])$/.test(name)) return 'top';
    if (/^(hand_[lr]|(thumb|index|middle|ring|pinky)_\d\d(_leaf)?_[lr])$/.test(name)) return 'gloves';
    if (/^(pelvis|thigh_[lr]|calf_[lr])$/.test(name)) return 'legs';
    if (/^(foot_[lr]|ball_[lr]|ball_leaf_[lr])$/.test(name)) return 'shoes';
    return 'top';
  },
  'kenney-mini': (name) => {
    if (name === 'head') return 'skin';
    if (name === 'torso' || name === 'arm-left' || name === 'arm-right') return 'top';
    if (name === 'leg-left' || name === 'leg-right') return 'legs';
    return 'top';
  },
};

/**
 * **Every vertex's costume slot**, as the custom attribute `_REGION` (an unsigned
 * byte, the slot's index in `COSTUME_SLOTS`). The dominant joint says which part
 * of the body a vertex is; then, by bind position in this body's own proportions:
 *
 *  - the **shirt** is a V down the front of the chest, from the collar to the
 *    sternum, on front-facing vertices — a white shirt under a jacket, the one
 *    detail that makes a suit a suit;
 *  - the **belt** is a band at the waist, where the base body's own waistband is;
 *  - on the chibi fallback (its head is half the figure and its texture is gone)
 *    the face is the front of the head below the brow, the rest of the head is
 *    hair, the ends of the arms are hands, and the soles are shoes.
 *
 * `hair` is not decided here: a grafted hairstyle is the `hair` slot whole.
 */
function writeRegions(doc, body, rigId, hairPrims, id) {
  const skin = body.getSkin();
  const names = skin.listJoints().map((j) => j.getName());
  const slotOf = SLOT_OF_JOINT[rigId];
  if (slotOf === undefined) fail(`${id}: no costume slots for rig "${rigId}"`);
  const bind = bindPositions(skin);
  const counts = Object.fromEntries(COSTUME_SLOTS.map((s) => [s, 0]));
  // The body's bind bounds, for the chibi's proportional rules.
  let minY = Infinity;
  let maxY = -Infinity;
  const e = [0, 0, 0];
  for (const prim of body.getMesh().listPrimitives()) {
    const p = prim.getAttribute('POSITION');
    for (let i = 0; i < p.getCount(); i += 1) {
      p.getElement(i, e);
      minY = Math.min(minY, e[1]);
      maxY = Math.max(maxY, e[1]);
    }
  }
  const height = maxY - minY;
  const buffer = body.getMesh().listPrimitives()[0].getAttribute('POSITION').getBuffer();
  const j = [0, 0, 0, 0];
  const w = [0, 0, 0, 0];
  const n = [0, 0, 0];
  for (const prim of body.getMesh().listPrimitives()) {
    const positions = prim.getAttribute('POSITION');
    const normals = prim.getAttribute('NORMAL');
    const joints = prim.getAttribute('JOINTS_0');
    const weights = prim.getAttribute('WEIGHTS_0');
    const count = positions.getCount();
    const region = new Uint8Array(count);
    const isHair = hairPrims.includes(prim);
    for (let i = 0; i < count; i += 1) {
      let slot;
      if (isHair) slot = 'hair';
      else {
        joints.getElement(i, j);
        weights.getElement(i, w);
        let best = 0;
        for (let k = 1; k < 4; k += 1) if (w[k] > w[best]) best = k;
        const joint = names[j[best]];
        slot = slotOf(joint);
        positions.getElement(i, e);
        normals.getElement(i, n);
        if (rigId === 'ubc') {
          const neck = bind.get('neck_01');
          const chest = bind.get('spine_03');
          const pelvis = bind.get('pelvis');
          const spine1 = bind.get('spine_01');
          // The shirt: a V from the collar (half-width 0.1 m) down to a point 9 cm
          // under the chest joint, front-facing only.
          const apex = chest.y - 0.09;
          const top = neck.y + 0.02;
          if ((slot === 'top' || slot === 'skin') && joint !== 'Head' && n[2] > 0.3 && e[2] > chest.z && e[1] > apex && e[1] < top) {
            const half = 0.1 * ((e[1] - apex) / (top - apex));
            if (Math.abs(e[0]) < half) slot = 'shirt';
          }
          // The belt: the base body's waistband — a band between the pelvis and
          // spine_01, measured on the bodies' own bind positions.
          const beltLo = pelvis.y + 0.25 * (spine1.y - pelvis.y);
          const beltHi = pelvis.y + 0.85 * (spine1.y - pelvis.y);
          if ((slot === 'top' || slot === 'legs') && e[1] > beltLo && e[1] < beltHi) slot = 'belt';
        } else {
          const y = (e[1] - minY) / height;
          if (joint === 'head') {
            // Face: the front of the head, below the brow.
            slot = n[2] > 0.35 && y < 0.83 ? 'skin' : 'hair';
          } else if (joint === 'arm-left' || joint === 'arm-right') {
            if (Math.abs(e[0]) / height > 0.47) slot = 'gloves';
          } else if (joint === 'torso') {
            if (y < 0.3) slot = 'belt';
            else if (n[2] > 0.4 && Math.abs(e[0]) / height < 0.07 * ((y - 0.3) / 0.21) + 0.005) slot = 'shirt';
          } else if (slot === 'legs' && y < 0.06) slot = 'shoes';
        }
      }
      region[i] = SLOT[slot];
      counts[slot] += 1;
    }
    prim.setAttribute('_REGION', doc.createAccessor().setType('SCALAR').setArray(region).setBuffer(buffer));
  }
  return counts;
}

/**
 * **The Universal Animation Library's clips on a Universal Base Character**, by
 * world-space delta over the whole major skeleton (report 13 §9.5's experiment,
 * the second time and with the rig it was made for).
 *
 * Both are T-posed and face +Z with their left at +x, and they share joint NAMES
 * — but not rest orientations (measured: `neck_01` 17–23°, `spine_03` 12–14°,
 * `Head` 6–15° apart), so copying local rotations would bend every spine. So, per
 * frame and per joint, parents first:
 *
 *     targetWorld(j, t) = sourceWorld(j, t) · sourceBindWorld(j)⁻¹ · targetBindWorld(j)
 *     targetLocal(j, t) = targetWorld(parent(j), t)⁻¹ · targetWorld(j, t)
 *
 * — the bone's world-space rotation away from its T-pose, carried onto the other
 * T-pose — and the pelvis alone moves, by the source's world-space hip delta
 * scaled by the two hip heights. Every other joint keeps its own bind offset, so a
 * shorter body keeps its own limb lengths. The fingers are not driven (a thousand
 * tracks nobody sees at 60 px); they hold the body's bind. `root` is never
 * animated: it is the file's Z-up turn, and root motion is refused (§3.4).
 */
let ualSource = null;
async function humanClips(rigId, rig, targetDoc, names, id) {
  const spec = rig.retarget;
  if (ualSource === null) {
    const gltf = await toThree(await io.readBinary(withoutImages(sourceBytes(spec.pack, spec.member))));
    const mesh = firstSkinned(gltf.scene);
    if (mesh === null) fail(`${rigId}: the clip library has no skinned mesh`);
    gltf.scene.skeleton = mesh.skeleton; // the ROOT carries the skeleton (see retargetedClips)
    gltf.scene.updateMatrixWorld(true);
    ualSource = gltf;
  }
  const source = ualSource;
  const target = await toThree(targetDoc);
  target.scene.updateMatrixWorld(true);

  const joints = spec.joints;
  const sBones = joints.map((name) => source.scene.getObjectByName(name));
  const tBones = joints.map((name) => target.scene.getObjectByName(name));
  joints.forEach((name, i) => {
    if (!sBones[i]) fail(`${rigId}: the clip library has no bone "${name}"`);
    if (!tBones[i]) fail(`${id}: no bone "${name}" to retarget onto`);
  });
  // Parents first, and every driven joint's parent is driven too — or is an
  // undriven ancestor (root) whose world rotation is its bind rotation.
  const parentIndex = tBones.map((bone) => joints.indexOf(bone.parent?.name ?? ''));
  joints.forEach((name, i) => {
    if (parentIndex[i] > i) fail(`${rigId}: "${name}" is listed before its parent`);
  });
  const sBind = sBones.map((b) => b.getWorldQuaternion(new THREE.Quaternion()));
  const tBind = tBones.map((b) => b.getWorldQuaternion(new THREE.Quaternion()));
  const tParentBind = tBones.map((b) => b.parent.getWorldQuaternion(new THREE.Quaternion()));
  const offset = sBind.map((q, i) => q.clone().invert().multiply(tBind[i]));
  const hip = joints.indexOf(spec.hip.joint);
  const sHip0 = new THREE.Vector3().setFromMatrixPosition(sBones[hip].matrixWorld);
  const tHip0 = new THREE.Vector3().setFromMatrixPosition(tBones[hip].matrixWorld);
  const hipScale = tHip0.y / sHip0.y;
  const tHipParentInverse = tBones[hip].parent.matrixWorld.clone().invert();

  const out = new Map();
  const q = new THREE.Quaternion();
  const world = joints.map(() => new THREE.Quaternion());
  const inv = new THREE.Quaternion();
  const p = new THREE.Vector3();
  // A COMPOSED clip (`A+B`): A's pelvis and legs under B's torso, arms and head —
  // each retargeted on its own first (below), then merged track by track.
  const plain = [...new Set(names.flatMap((name) => name.split('+')))];
  for (const name of plain) {
    const clip = source.animations.find((a) => a.name === name);
    if (clip === undefined) fail(`${rigId}: the clip library has no clip "${name}"`);
    const frames = Math.max(2, Math.round(clip.duration * spec.fps) + 1);
    const delta = clip.duration / (frames - 1);
    const mixer = new THREE.AnimationMixer(source.scene);
    const action = mixer.clipAction(clip);
    action.play();
    const times = new Float32Array(frames);
    const rotations = joints.map(() => new Float32Array(frames * 4));
    const hipValues = new Float32Array(frames * 3);
    for (let f = 0; f < frames; f += 1) {
      action.time = Math.min(f * delta, clip.duration - 1e-7);
      mixer.update(0);
      source.scene.updateMatrixWorld(true);
      times[f] = f * delta;
      for (let i = 0; i < joints.length; i += 1) {
        sBones[i].getWorldQuaternion(q);
        world[i].copy(q).multiply(offset[i]);
        const parent = parentIndex[i] >= 0 ? world[parentIndex[i]] : tParentBind[i];
        inv.copy(parent).invert().multiply(world[i]);
        // Keep the quaternion's sign continuous frame to frame, so LINEAR
        // interpolation (and meshopt's filter) never takes the long way round.
        if (f > 0) {
          const r = rotations[i];
          const dot = r[(f - 1) * 4] * inv.x + r[(f - 1) * 4 + 1] * inv.y + r[(f - 1) * 4 + 2] * inv.z + r[(f - 1) * 4 + 3] * inv.w;
          if (dot < 0) inv.set(-inv.x, -inv.y, -inv.z, -inv.w);
        }
        inv.toArray(rotations[i], f * 4);
      }
      p.setFromMatrixPosition(sBones[hip].matrixWorld).sub(sHip0).multiplyScalar(hipScale).add(tHip0).applyMatrix4(tHipParentInverse);
      p.toArray(hipValues, f * 3);
    }
    mixer.stopAllAction();
    mixer.uncacheRoot(source.scene);
    const tracks = joints.map((joint, i) => ({ joint, path: 'rotation', times, values: rotations[i] }));
    tracks.push({ joint: spec.hip.joint, path: 'translation', times, values: hipValues });
    out.set(name, { tracks, duration: clip.duration });
    console.log(
      `  retarget  ${id} ← ${name.padEnd(20)} ${clip.duration.toFixed(2)} s · ${String(frames)} frames · ` +
        `${String(tracks.length)} tracks (world-space delta, hip scale ${hipScale.toFixed(4)})`,
    );
  }
  for (const name of names) {
    if (!name.includes('+')) continue;
    const [lowerName, upperName] = name.split('+');
    const lower = out.get(lowerName);
    const upper = out.get(upperName);
    const upperSet = new Set(spec.upper ?? []);
    if (upperSet.size === 0) fail(`${rigId}: a composed clip "${name}" needs the rig's retarget.upper joint list`);
    const pelvis = joints.indexOf(spec.hip.joint);
    const bindInverse = tBind[pelvis].clone().invert();
    const parentInverse = tParentBind[pelvis].clone().invert();
    /** B's rotation track for `joint`, sampled at `time` (looped), into `into`. */
    const sampleB = (joint, time, into) => {
      const from = upper.tracks.find((t) => t.joint === joint && t.path === 'rotation');
      const t = upper.duration > 0 ? time % upper.duration : 0;
      let k = 0;
      while (k + 1 < from.times.length && from.times[k + 1] <= t) k += 1;
      const k2 = Math.min(k + 1, from.times.length - 1);
      const span = from.times[k2] - from.times[k];
      into.fromArray(from.values, k * 4).slerp(new THREE.Quaternion().fromArray(from.values, k2 * 4), span > 0 ? (t - from.times[k]) / span : 0);
      return into;
    };
    const continuous = (values, f, q) => {
      if (f > 0 && values[(f - 1) * 4] * q.x + values[(f - 1) * 4 + 1] * q.y + values[(f - 1) * 4 + 2] * q.z + values[(f - 1) * 4 + 3] * q.w < 0) {
        q.set(-q.x, -q.y, -q.z, -q.w);
      }
      q.toArray(values, f * 4);
    };
    // A's hips, with their TURN taken out: the part of each frame's world-space
    // rotation away from the bind that is a twist about the vertical is removed,
    // and the swing (the pitch and roll the legs are posed against) is kept — so
    // a kneel faces where the body faces.
    const hipTrack = lower.tracks.find((t) => t.joint === spec.hip.joint && t.path === 'rotation');
    const hips = new Float32Array(hipTrack.values.length);
    {
      const local = new THREE.Quaternion();
      const delta = new THREE.Quaternion();
      const twist = new THREE.Quaternion();
      for (let f = 0; f < hipTrack.times.length; f += 1) {
        local.fromArray(hipTrack.values, f * 4);
        delta.copy(tParentBind[pelvis]).multiply(local).multiply(bindInverse);
        twist.set(0, delta.y, 0, delta.w);
        if (twist.lengthSq() < 1e-12) twist.identity();
        else twist.normalize();
        delta.multiply(twist.invert());
        local.copy(parentInverse).multiply(delta).multiply(tBind[pelvis]);
        continuous(hips, f, local);
      }
    }
    const tracks = lower.tracks.map((track) => {
      if (track.path !== 'rotation') return track;
      if (track.joint === spec.hip.joint) return { ...track, values: hips };
      if (!upperSet.has(track.joint)) return track;
      const values = new Float32Array(track.values.length);
      const q = new THREE.Quaternion();
      const bPelvis = new THREE.Quaternion();
      const aPelvis = new THREE.Quaternion();
      // The upper body's ROOT joint (its parent is the hips) keeps B's WORLD
      // rotation — upright, whatever A's hips pitch — so its local is taken
      // against A's hips: inv(A'_hips) · B_hips · B_joint. Every joint above it
      // keeps B's local rotation, and so B's whole torso.
      const onHips = tBones[joints.indexOf(track.joint)].parent?.name === spec.hip.joint;
      for (let f = 0; f < track.times.length; f += 1) {
        sampleB(track.joint, track.times[f], q);
        if (onHips) {
          sampleB(spec.hip.joint, track.times[f], bPelvis);
          aPelvis.fromArray(hips, f * 4).invert();
          q.premultiply(bPelvis).premultiply(aPelvis);
        }
        continuous(values, f, q);
      }
      return { ...track, values };
    });
    out.set(name, { tracks, duration: lower.duration });
    console.log(`  compose   ${id} ← ${lowerName}'s legs and hips (turn removed) under ${upperName}'s upright torso (${String(upperSet.size)} joints)`);
  }
  return out;
}

/**
 * **Decimate** — meshopt's simplifier, to `target` triangles, unconstrained by
 * error (the triangle count is the budget line). It collapses edges onto EXISTING
 * vertices, so every surviving vertex keeps its skin weights and its costume slot
 * exactly; a figure is 60–100 px tall, where a 12,000-triangle base body and a
 * 1,400-triangle one draw the same silhouette.
 *
 * **A body with costume slots is simplified WITH them** (`simplifyWithAttributes`):
 * each vertex's slot is a one-hot attribute, so collapsing a face vertex into a
 * hair vertex, or a jacket into a trouser, costs what moving the silhouette would
 * — the borders between slots survive — and the two SMALL slots (the shirt's V
 * and the belt) are LOCKED, because at a tenth of the triangles a plain
 * simplify kept 6 of the shirt's 58 vertices and the white shirt was a smear.
 * Returns [before, after].
 */
function decimate(doc, target, id) {
  const prims = [];
  for (const mesh of doc.getRoot().listMeshes()) prims.push(...mesh.listPrimitives());
  if (prims.length !== 1) fail(`${id}: decimate expects one joined primitive, saw ${String(prims.length)}`);
  const prim = prims[0];
  const indices = prim.getIndices();
  const before = indices.getCount() / 3;
  if (before <= target) return [before, before];
  const positionAccessor = prim.getAttribute('POSITION');
  const position = positionAccessor.getArray() instanceof Float32Array ? positionAccessor.getArray() : Float32Array.from(positionAccessor.getArray());
  const source = Uint32Array.from(indices.getArray());
  const targetIndexCount = Math.floor(target) * 3;
  const region = prim.getAttribute('_REGION');
  let result;
  if (region === null) {
    result = MeshoptSimplifier.simplify(source, position, 3, targetIndexCount, 1, []);
  } else {
    const count = region.getCount();
    const slots = COSTUME_SLOTS.length;
    const attributes = new Float32Array(count * slots);
    const lock = new Uint8Array(count);
    const small = new Set([SLOT.shirt, SLOT.belt]);
    for (let i = 0; i < count; i += 1) {
      const slot = region.getScalar(i);
      attributes[i * slots + slot] = 1;
      if (small.has(slot)) lock[i] = 1;
    }
    result = MeshoptSimplifier.simplifyWithAttributes(
      source,
      position,
      3,
      attributes,
      slots,
      new Array(slots).fill(SLOT_WEIGHT),
      lock,
      targetIndexCount,
      1,
      [],
    );
  }
  const [dst] = result;
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(dst)).setBuffer(indices.getBuffer()));
  if (indices.listParents().length === 1) indices.dispose();
  compactPrimitive(prim);
  const after = prim.getIndices().getCount() / 3;
  if (prim.getAttribute('POSITION').getCount() <= 65534) prim.getIndices().setArray(new Uint16Array(prim.getIndices().getArray()));
  return [before, after];
}
/** How much crossing a costume-slot border costs the simplifier, against moving the silhouette. */
const SLOT_WEIGHT = 0.6;

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

/** id → the single-model document, after the per-model half of the pipeline. */
const built = new Map();
/**
 * **Slice 4 — model ids that are another model's BODY** (`sameAs` in the
 * manifest): the scientist stands in the agent's body, so it is one node in the
 * library and one row per id in `models.json` — never a second copy of the mesh
 * and its clips. Its costume, not its mesh, is what makes it a scientist.
 */
const aliases = new Map();
/** The clip library's own joint list — what a body on the `ubc` rig must have exactly. */
let libraryJoints = null;

for (const [id, spec] of Object.entries(manifest.models)) {
  if (id.startsWith('_')) continue;
  if (spec.sameAs !== undefined) {
    aliases.set(id, spec);
    console.log(`\n${id} — the "${spec.sameAs}" body (one node in the library; its costume is its own)`);
    continue;
  }
  const pack = manifest.packs[spec.pack];
  const rig = spec.rig === undefined ? undefined : manifest.rigs[spec.rig];
  /** A proportioned body on the clip library's own rig (slice 4) rather than a pack's own model. */
  const human = rig?.kind === 'ubc';
  console.log(`\n${id} — ${pack.title} by ${pack.creator} (${pack.licence})${spec.member ? ` · ${spec.member}` : ''}`);
  const step = (n, name) => join(WORK, `${id}.${String(n)}.${name}.glb`);

  // -- extract + repair (+ slice 4: the body, its hair, its slots, its head) ----
  let src;
  let slotsWritten = false;
  if (human) {
    src = await readMemberDocument(spec.pack, spec.member);
    const body = keepBody(src, spec.body, id);
    const hair = [];
    if (spec.hair !== undefined) {
      hair.push(...graftHair(src, body, await readMemberDocument(spec.pack, spec.hair), id));
      const hairTris = hair.reduce((n, prim) => n + prim.getIndices().getCount() / 3, 0);
      console.log(`  hair      ${spec.hair.slice(spec.hair.lastIndexOf('/') + 1)} → grafted onto the body's skin (${String(hairTris)} triangles)`);
    }
    const counts = writeRegions(src, body, spec.rig, hair, id);
    slotsWritten = true;
    console.log(`  slots     ${Object.entries(counts).map(([slot, n]) => `${slot} ${String(n)}`).join(' · ')} vertices`);
    const pivot = scaleHead(body, spec.headScale ?? 1, id);
    console.log(`  head      ×${String(spec.headScale ?? 1)} about the Head joint at (${pivot.toArray().map((n) => n.toFixed(3)).join(', ')})`);
  } else {
    src = await io.readBinary(withoutImages(sourceBytes(spec.pack, spec.member ?? null)));
  }
  const repaired = repairWeights(src);
  if (repaired > 0) console.log(`  repair    ${String(repaired)} vertices had NaN / zero skin weights → bound to the first joint`);
  await io.write(step(0, 'source'), src);

  // -- the CLI half, in report 12 §5.7's order ------------------------------
  // (A body whose costume slots are already written keeps its attributes here:
  // `_REGION` is used by no material, and the default would drop it.)
  cli('prune', step(0, 'source'), step(1, 'prune'), ['--keep-attributes', slotsWritten ? 'true' : 'false']);
  cli('dedup', step(1, 'prune'), step(2, 'dedup'));

  // -- material, join, clips --------------------------------------------------
  const doc = await io.read(step(2, 'dedup'));
  const materialised = oneMaterial(doc, id);
  console.log(`  material  ${String(materialised)} primitives → one unlit stencil material, no texture, no UV (the runtime draws them holographic)`);
  const scene = doc.getRoot().listScenes()[0];
  if (scene === undefined) fail(`${id}: the file has no scene`);
  const roots = scene.listChildren();
  if (roots.length !== 1) fail(`${id}: expected one root node, saw ${String(roots.length)}`);
  const root = roots[0];
  // Slice 4: the chibi fallback's costume slots, written on its own skin before the join.
  if (!slotsWritten && rig !== undefined && SLOT_OF_JOINT[spec.rig] !== undefined) {
    const skinned = allNodes(doc).filter((n) => n.getMesh() !== null && n.getSkin() !== null);
    const counts = Object.fromEntries(COSTUME_SLOTS.map((slot) => [slot, 0]));
    for (const node of skinned) {
      for (const [slot, n] of Object.entries(writeRegions(doc, node, spec.rig, [], id))) counts[slot] += n;
    }
    console.log(`  slots     ${Object.entries(counts).map(([slot, n]) => `${slot} ${String(n)}`).join(' · ')} vertices`);
  }
  const { joined, joints } = joinSkinned(root, id);
  console.log(`  join      ${String(joined)} primitives → 1 (skin-aware; \`gltf-transform join\` skips skins)`);

  // **One rig, asserted.** A model on a rig must have exactly the rig's joints,
  // in its order — that is what makes one clip set valid for all of them. A body
  // on the `ubc` rig must have exactly the CLIP LIBRARY's joints (slice 4): that is
  // what "the same rig as the animation library" means, measured.
  if (rig !== undefined) {
    let expected = rig.joints;
    if (human) {
      if (libraryJoints === null) {
        const library = await readMemberDocument(rig.retarget.pack, rig.retarget.member);
        libraryJoints = library.getRoot().listSkins()[0].listJoints().map((j) => j.getName());
      }
      expected = libraryJoints;
    }
    const actual = joints.map((j) => j.getName());
    if (actual.join(',') !== expected.join(',')) {
      fail(`${id}: its skin is [${actual.join(', ')}], not the ${spec.rig} rig [${expected.join(', ')}]`);
    }
  }

  const clipMap = clipMapOf(id, spec);
  // The pack's own clips: only the ones the map names survive, renamed so the
  // merged library has one flat, collision-free namespace.
  const native = new Map();
  const ual = [];
  for (const [key, raw] of Object.entries(clipMap)) {
    if (key.startsWith('_')) continue;
    if (raw.startsWith('ual:')) ual.push(raw.slice(4));
    else native.set(normaliseClipName(raw), key);
  }
  const kept = new Map();
  for (const animation of doc.getRoot().listAnimations()) {
    const name = normaliseClipName(animation.getName());
    if (!native.has(name)) {
      animation.dispose();
      continue;
    }
    animation.setName(`${id}_${name}`);
    kept.set(name, `${id}_${name}`);
  }
  for (const [name, key] of native) {
    if (!kept.has(name)) fail(`${id}: the manifest names clip "${name}" (as ${key}) and the file has none`);
  }
  // The retargeted ones, baked onto THIS model's joints by name.
  if (ual.length > 0) {
    const cache = human
      ? await humanClips(spec.rig, rig, doc, [...new Set(ual)], id)
      : await retargetedClips(spec.rig, rig, [...new Set(ual)]);
    const buffer = doc.getRoot().listBuffers()[0];
    const byName = new Map();
    const walk = (node) => {
      byName.set(node.getName(), node);
      for (const child of node.listChildren()) walk(child);
    };
    walk(root);
    for (const name of new Set(ual)) {
      const baked = cache.get(name);
      const animation = doc.createAnimation(`${id}_ual-${name}`);
      for (const track of baked.tracks) {
        const node = byName.get(track.joint);
        if (node === undefined) fail(`${id}: no joint "${track.joint}" for the retargeted ${name}`);
        const input = doc.createAccessor().setArray(track.times).setType('SCALAR').setBuffer(buffer);
        const output = doc.createAccessor().setArray(track.values).setType(track.path === 'rotation' ? 'VEC4' : 'VEC3').setBuffer(buffer);
        const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
        animation.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(track.path).setSampler(sampler));
      }
      kept.set(`ual-${name}`, `${id}_ual-${name}`);
    }
  }

  root.setName(id);
  const staged = join(WORK, `${id}.4.joined.glb`);
  await io.write(staged, doc);

  cli('weld', staged, step(5, 'weld'));
  // -- slice 4: decimate, to the manifest's triangle target -------------------
  let welded = step(5, 'weld');
  if (spec.triangles !== undefined) {
    const lean = await io.read(welded);
    const [before, after] = decimate(lean, spec.triangles, id);
    welded = step(5, 'decimate');
    await io.write(welded, lean);
    console.log(`  decimate  ${String(before)} → ${String(after)} triangles (meshopt ${human ? 'simplifyWithAttributes over the costume slots, the shirt and belt locked' : 'simplify'}, target ${String(spec.triangles)})`);
  }
  cli('unlit', welded, step(6, 'unlit'));
  // A rig may relax the resampler's per-value tolerance (slice 4: the retargeted
  // clips are baked at 30 fps over 23 joints, and 0.001 of a quaternion — well
  // under a tenth of a degree — halves the keyframes without a visible change).
  const tolerance = rig?.resampleTolerance;
  cli('resample', step(6, 'unlit'), step(7, 'resample'), tolerance === undefined ? [] : ['--tolerance', String(tolerance)]);
  // **`--keep-attributes true`, and it is load-bearing.** `prune`'s default is
  // to drop any vertex attribute the *material* does not use, and `unlit` has
  // just declared that this material uses no normals — so the default strips
  // `NORMAL` from every figure. The runtime material is not the file's: the
  // holographic treatment is a **fresnel** shader and fresnel is a dot product
  // with the normal. Measured the hard way: with normals gone,
  // `normalize(vec3(0))` is NaN, every figure rendered as a solid black
  // silhouette, and the file still validated and still loaded. (The same
  // default would drop slice 4's `_REGION`: no material reads it either.)
  cli('prune', step(7, 'resample'), step(8, 'prune2'), ['--keep-attributes', 'true']);

  // **Measured HERE, before `meshopt`**, whose int16 quantisation would put a
  // bounding box read off the finished file in quantisation units.
  const measuredDoc = await io.read(step(8, 'prune2'));
  const m = await measure(measuredDoc, id, clipMap, spec.facing);
  console.log(
    `  measure   bind height ${m.height.toFixed(3)} · resting width ${m.width.toFixed(3)} ` +
      `(${Object.entries(m.widths).map(([s, w]) => `${s} ${w.toFixed(3)}`).join(', ')}; bind ${m.bindWidth.toFixed(3)}) · ` +
      `ratio ${(m.width / m.height).toFixed(2)}`,
  );
  built.set(id, { spec, pack, file: step(8, 'prune2'), clips: kept, clipMap, ...m });
}
for (const [id, spec] of aliases) {
  if (!built.has(spec.sameAs)) fail(`${id}: sameAs "${spec.sameAs}", which is not a built model`);
}

// -- merge -------------------------------------------------------------------

console.log('\nlibrary');
const ids = [...built.keys()];
const merged = join(WORK, 'merged.glb');
// **`merge` takes its output LAST**, and `--merge-scenes` is the flag that makes
// the models share one scene. The loader reads one scene, so without it
// `scene.getObjectByName('drone')` would find nothing at all.
{
  const inputs = ids.map((id) => built.get(id).file);
  execFileSync(CLI, ['merge', ...inputs, merged, '--merge-scenes'], { encoding: 'utf8' });
  console.log(`  merge     ${String(inputs.length)} models → merged.glb (one scene)`);
}

cli('prune', merged, join(WORK, 'library.glb'), ['--keep-attributes', 'true']);
// **`meshopt` is the last step and nothing may follow it.** A `prune` after it
// rewrote the file without the extension and the library went from 116,592
// bytes back to 260,104 — compression undone by a step that looked harmless.
cli('meshopt', join(WORK, 'library.glb'), OUT);

// ---------------------------------------------------------------------------
// Measure, assert, and write models.json
// ---------------------------------------------------------------------------

// **The assertions read the pre-`meshopt` library**, which is the same content
// in a form `NodeIO` can open without registering a decoder.
const final = await io.read(join(WORK, 'library.glb'));
const finalScene = final.getRoot().listScenes()[0];
const finalRoots = new Map(finalScene.listChildren().map((n) => [n.getName(), n]));
const clipNames = new Set(final.getRoot().listAnimations().map((a) => a.getName()));
if (final.getRoot().listTextures().length !== 0) fail('the library carries a texture — nothing draws one');

const models = {};
let totalPrimitives = 0;
let totalTriangles = 0;

for (const id of ids) {
  const node = finalRoots.get(id);
  if (node === undefined) fail(`${id}: the merged library has no root node called "${id}"`);
  const { spec, pack, clips, clipMap } = built.get(id);

  let primitives = 0;
  let triangles = 0;
  let bones = 0;
  const walk = (n) => {
    const mesh = n.getMesh();
    if (mesh !== null) {
      for (const prim of mesh.listPrimitives()) {
        primitives += 1;
        const indices = prim.getIndices();
        triangles += (indices ? indices.getCount() : prim.getAttribute('POSITION').getCount()) / 3;
      }
    }
    const skin = n.getSkin();
    if (skin !== null) bones = Math.max(bones, skin.listJoints().length);
    for (const child of n.listChildren()) walk(child);
  };
  walk(node);

  // **The assertion T0's go/no-go was about.** One primitive is one draw call.
  if (primitives !== 1) fail(`${id}: ${String(primitives)} primitives — one figure would cost ${String(primitives)} draw calls, not 1`);
  totalPrimitives += primitives;
  totalTriangles += triangles;

  const clipMapOut = {};
  const retargeted = {};
  for (const [key, raw] of Object.entries(clipMap)) {
    if (key.startsWith('_')) continue;
    const fileName = clipKeyName(clipMap, key);
    const renamed = clips.get(fileName);
    if (renamed === undefined || !clipNames.has(renamed)) fail(`${id}: clip "${raw}" did not survive the pipeline`);
    clipMapOut[key] = renamed;
    if (raw.startsWith('ual:')) retargeted[key] = raw;
  }

  const { height, width } = built.get(id);
  models[id] = {
    path: 'models/figures.glb',
    node: id,
    height: round(height, 4),
    width: round(width, 4),
    facing: spec.facing,
    rootMotion: false,
    bones,
    triangles,
    clips: clipMapOut,
    ...(spec.rig !== undefined ? { rig: spec.rig } : {}),
    ...(Object.keys(retargeted).length > 0 ? { retargeted } : {}),
    source: pack.page,
    licence: pack.licence,
    licenceUrl: pack.licenceUrl,
    licenceBadge: pack.licenceBadge,
    retrieved: pack.retrieved,
    committable: pack.committable === true,
  };
  console.log(
    `  ${id.padEnd(9)} 1 primitive · ${String(triangles).padStart(4)} tris · ${String(bones).padStart(2)} bones · ` +
      `height ${height.toFixed(3)} · width ${width.toFixed(3)} (ratio ${(width / height).toFixed(2)}) · ` +
      `${String(Object.keys(clipMapOut).length)} clips${Object.keys(retargeted).length > 0 ? ` (${Object.keys(retargeted).join(', ')} retargeted)` : ''}`,
  );
}
// Slice 4: an id that is another model's body — its row, pointing at that node.
for (const [id, spec] of aliases) {
  const body = models[spec.sameAs];
  models[id] = { ...body, clips: { ...body.clips } };
  console.log(`  ${id.padEnd(9)} → the "${spec.sameAs}" node (${String(body.triangles)} tris, no second copy)`);
}

function round(n, places) {
  const k = 10 ** places;
  return Math.round(n * k) / k;
}

const outBytes = readFileSync(OUT);
const bytes = outBytes.byteLength;
const digest = sha256(outBytes);
console.log(
  `\n${OUT.replace(REPO + '/', '')}: ${String(bytes)} bytes · sha256 ${digest} · ${String(ids.length)} models · ` +
    `${String(totalPrimitives)} primitives · ${String(totalTriangles)} triangles · ${String(clipNames.size)} clips`,
);

// §8.2's budget, checked where it is cheap to check.
if (bytes > 400 * 1024) fail(`the library is ${String(bytes)} bytes — §8.2 budgets ≤ 400 kB per .glb`);
if (totalTriangles > 30000) fail(`${String(totalTriangles)} triangles — §8.2 budgets ≤ 30,000`);

if (WRITE_MANIFEST) {
  const clipLibraries = {};
  for (const rig of Object.values(manifest.rigs ?? {})) {
    if (typeof rig !== 'object' || rig.retarget === undefined) continue;
    const pack = manifest.packs[rig.retarget.pack];
    clipLibraries.ual = {
      title: pack.title,
      source: pack.page,
      licence: pack.licence,
      licenceUrl: pack.licenceUrl,
      licenceBadge: pack.licenceBadge,
      retrieved: pack.retrieved,
      committable: pack.committable === true,
    };
  }
  const header = {
    version: 1,
    _generated: 'WRITTEN BY tools/build-figures.mjs — do not edit by hand. The hand-written half (where each file came from, what its licence badge said) is tools/assets-manifest.json; everything here was measured from the built figures.glb.',
    _fallback: 'A model id named here that has no file on disk is not an error: scene/models.ts falls back to the glow disc (report 13 §9.4), which is also what a fresh checkout with no binaries gets.',
    _measure: '`height` is the bind-pose height three normalises by at load; `width` is the widest RESTING stance (idle, crouch) along the axis that becomes x once `facing` is turned to +Z — both measured on the SKINNED mesh, in three, before meshopt.',
    _slice4: 'Slice 4: `agent` and `hero` are the proportioned bodies (rig `ubc`, the clip library\'s own 65 joints; every clip retargeted from it, `triangles` after decimation), `scientist` is the `agent` node again, and the `-chibi` ids are slices 1–3\'s Kenney bodies kept as the fallback a traits.json `body: chibi` stands a card in. Every humanoid vertex carries a costume slot (`_REGION` in the file, `costumeRegion` in the arena).',
    library: { path: 'models/figures.glb', bytes, sha256: digest },
    clipLibraries,
    models,
  };
  writeFileSync(MODELS_JSON, `${JSON.stringify(header, null, 2)}\n`, 'utf8');
  console.log(`wrote ${MODELS_JSON.replace(REPO + '/', '')}`);
}
