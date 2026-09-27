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
const { joinPrimitives } = require('@gltf-transform/functions');

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
  if (id.startsWith('_')) continue;
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
// Build
// ---------------------------------------------------------------------------

/** id → the single-model document, after the per-model half of the pipeline. */
const built = new Map();

for (const [id, spec] of Object.entries(manifest.models)) {
  if (id.startsWith('_')) continue;
  const pack = manifest.packs[spec.pack];
  console.log(`\n${id} — ${pack.title} by ${pack.creator} (${pack.licence})${spec.member ? ` · ${spec.member}` : ''}`);

  // -- extract + repair -------------------------------------------------------
  const srcBytes = sourceBytes(spec.pack, spec.member ?? null);
  const src = await io.readBinary(withoutImages(srcBytes));
  const repaired = repairWeights(src);
  if (repaired > 0) console.log(`  repair    ${String(repaired)} vertices had NaN / zero skin weights → bound to the first joint`);
  const step = (n, name) => join(WORK, `${id}.${String(n)}.${name}.glb`);
  await io.write(step(0, 'source'), src);

  // -- the CLI half, in report 12 §5.7's order ------------------------------
  cli('prune', step(0, 'source'), step(1, 'prune'), ['--keep-attributes', 'false']);
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
  const { joined, joints } = joinSkinned(root, id);
  console.log(`  join      ${String(joined)} primitives → 1 (skin-aware; \`gltf-transform join\` skips skins)`);

  // **One rig, asserted.** A model on a rig must have exactly the rig's joints,
  // in its order — that is what makes one clip set valid for all of them.
  if (spec.rig !== undefined) {
    const expected = manifest.rigs[spec.rig].joints;
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
    const rig = manifest.rigs[spec.rig];
    const cache = await retargetedClips(spec.rig, rig, [...new Set(ual)]);
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
  cli('unlit', step(5, 'weld'), step(6, 'unlit'));
  cli('resample', step(6, 'unlit'), step(7, 'resample'));
  // **`--keep-attributes true`, and it is load-bearing.** `prune`'s default is
  // to drop any vertex attribute the *material* does not use, and `unlit` has
  // just declared that this material uses no normals — so the default strips
  // `NORMAL` from every figure. The runtime material is not the file's: the
  // holographic treatment is a **fresnel** shader and fresnel is a dot product
  // with the normal. Measured the hard way: with normals gone,
  // `normalize(vec3(0))` is NaN, every figure rendered as a solid black
  // silhouette, and the file still validated and still loaded.
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
    library: { path: 'models/figures.glb', bytes, sha256: digest },
    clipLibraries,
    models,
  };
  writeFileSync(MODELS_JSON, `${JSON.stringify(header, null, 2)}\n`, 'utf8');
  console.log(`wrote ${MODELS_JSON.replace(REPO + '/', '')}`);
}
