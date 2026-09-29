#!/usr/bin/env node
/*
 * mtg-table — tools/personal/check.mjs
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The personal tier, step 3: prove a prepared model takes OUR clips** (D191;
 * `docs/guides/personal-tier.md` is the manual).
 *
 *   node tools/personal/check.mjs <slug> [--no-preview] [--port 9008] [--cdp-port 9009]
 *        [--gpu swiftshader|gl] [--chromium chromium]
 *
 * In Node, with three's own `GLTFLoader` and `MeshoptDecoder` (as `traits.test.ts`
 * and `prop-raster.ts` load `figures.glb`):
 *
 *   0. the retarget is the build's: `agent`'s baked clips carried onto `hero` by
 *      `retarget.mjs` must reproduce `hero`'s own baked clips (both were baked
 *      from the same library clip, and the world-space delta composes);
 *   1. `personal/models/<slug>/model.glb` loads, its manifest validates, its
 *      skeleton is `root` + our 22 joints, and at rest its skin is the identity
 *      (every vertex drawn where the file puts it, to 0.1% of the height);
 *   2. OUR clip set — `figures.glb`'s `agent` clips for idle, attack, hit, die and
 *      the kneel (`crouch`), named by `models.json` — is carried onto it with
 *      that same retarget, and played at t = 0, 0.5 and 1 (and every frame, for
 *      "moved"), asserting: every one of our joints MOVED — turned on its own,
 *      not only carried by a parent — wherever the agent's did, and its
 *      world-space delta from bind is the agent's (the definition of the
 *      retarget); no NaN in a bone or a skinned vertex; the skinned mesh's
 *      bounds stay within 1.5× the rest bounds' largest side (no exploded
 *      skinning; a lying-down death is still inside that cube); and every mesh
 *      the prepare step skinned by rule (the cloak) FOLLOWS the spine — its
 *      centroid within 10% of the height of where spine_02's own motion carries
 *      it, and moving when the spine moves;
 *   3. prints the joint-coverage table.
 *
 * Then, unless `--no-preview`, it renders turntables — front, side, back and a
 * mid-attack frame, plus a sheet of all four, and the kneel and the death from
 * the side (where a cloak skinned by rule shows what it does) — to
 * `personal/models/<slug>/preview/*.png` through headless Chromium over CDP, the
 * way `tools/arena-bench.mjs` drives it: a small page written to
 * `var/personal-tier/preview/` that loads the GLB with three from
 * `web/node_modules`, served by a loopback server this script starts and stops.
 * No network: every request the page makes is to 127.0.0.1.
 *
 * Exit 0 when every assertion holds, 1 otherwise.
 */

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { insideSlug, OUR_JOINTS, REPO, slugDir, THREE, validateManifest, WEB } from './lib.mjs';
import { worldDeltaRetarget } from './retarget.mjs';

const { GLTFLoader } = await import(pathToFileURL(join(WEB, 'node_modules/three/examples/jsm/loaders/GLTFLoader.js')).href);
const { MeshoptDecoder } = await import(pathToFileURL(join(WEB, 'node_modules/three/examples/jsm/libs/meshopt_decoder.module.js')).href);

const argv = process.argv.slice(2);
const slug = argv[0];
if (!slug || slug.startsWith('--')) {
  console.error('usage: node tools/personal/check.mjs <slug> [--no-preview] [--port 9008] [--cdp-port 9009] [--gpu swiftshader|gl]');
  process.exit(2);
}
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};
const PREVIEW = !argv.includes('--no-preview');
const PORT = Number(opt('port', '9008'));
const CDP_PORT = Number(opt('cdp-port', '9009'));
const GPU = opt('gpu', 'swiftshader');
const dir = slugDir(slug);
const modelPath = join(dir, 'model.glb');
if (!existsSync(modelPath)) {
  console.error(`check: no ${relative(REPO, modelPath)} — run tools/personal/prepare.mjs ${slug} first`);
  process.exit(2);
}

/** The clips we check, by `models.json` clip key → the label the table prints. */
const CLIPS = [
  ['idle', 'idle'],
  ['attack', 'attack'],
  ['hit', 'hit'],
  ['die', 'die'],
  ['crouch', 'kneel'],
];
const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
  return ok;
};

// ---------------------------------------------------------------------------
// Loading, in Node
// ---------------------------------------------------------------------------

/**
 * A .glb with every image and texture reference taken out of its JSON chunk:
 * three cannot decode an image in Node (no `createImageBitmap`), and nothing
 * checked here reads one (`build-figures.mjs`'s `withoutImages`, generalised to
 * texture references inside material extensions).
 */
function withoutImages(glb) {
  const jsonLength = glb.readUInt32LE(12);
  const json = JSON.parse(glb.toString('utf8', 20, 20 + jsonLength));
  delete json.images;
  delete json.textures;
  delete json.samplers;
  const strip = (o) => {
    if (o === null || typeof o !== 'object') return;
    for (const key of Object.keys(o)) {
      if (/Texture$/.test(key)) delete o[key];
      else strip(o[key]);
    }
  };
  for (const material of json.materials ?? []) strip(material);
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
  return Buffer.concat([header, text, rest]);
}

async function load(path) {
  const bytes = withoutImages(readFileSync(path));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return new Promise((ok, bad) => loader.parse(buffer, '', ok, bad));
}

/** A joint by our name inside a subtree (GLTFLoader suffixes a repeated name `_1`, as for `hero`'s joints). */
function boneFinder(root) {
  const cache = new Map();
  return (name) => {
    if (!cache.has(name)) {
      let found = null;
      root.traverse((o) => {
        if (found === null && (o.name === name || new RegExp(`^${name}_\\d+$`).test(o.name)) && o.isBone) found = o;
      });
      cache.set(name, found);
    }
    return cache.get(name);
  };
}

/** Every local TRS under a root, to put a subtree back at rest after a mixer has had it. */
function snapshot(root) {
  const saved = [];
  root.traverse((o) => saved.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]));
  return () => {
    for (const [o, p, q, s] of saved) {
      o.position.copy(p);
      o.quaternion.copy(q);
      o.scale.copy(s);
    }
    root.updateMatrixWorld(true);
  };
}

function sample(root, clip, time) {
  const mixer = new THREE.AnimationMixer(root);
  const action = mixer.clipAction(clip);
  action.play();
  action.time = Math.min(time, clip.duration - 1e-7);
  mixer.update(0);
  root.updateMatrixWorld(true);
  return () => {
    mixer.stopAllAction();
    mixer.uncacheRoot(root);
  };
}

const deg = (rad) => (rad * 180) / Math.PI;
/** The angle of a rotation, in degrees. */
const angleOf = (q) => deg(2 * Math.acos(Math.min(1, Math.abs(q.w))));

const models = JSON.parse(readFileSync(join(WEB, 'src/arena/figures/models.json'), 'utf8'));
const figures = await load(join(WEB, 'public/models/figures.glb'));
const agentRoot = figures.scene.getObjectByName(models.models.agent.node);
const heroRoot = figures.scene.getObjectByName(models.models.hero.node);
const agent = { root: agentRoot, bone: boneFinder(agentRoot) };
const hero = { root: heroRoot, bone: boneFinder(heroRoot) };
const agentRest = snapshot(agentRoot);
const heroRest = snapshot(heroRoot);
const clipNamed = (name) => {
  const clip = figures.animations.find((a) => a.name === name);
  if (clip === undefined) throw new Error(`figures.glb has no clip ${name}`);
  return clip;
};

// ---------------------------------------------------------------------------
// 0 — the retarget is the build's
// ---------------------------------------------------------------------------

console.log(`check ${slug}\n\n0. the retarget is the build's: agent's baked clips → hero, against hero's own`);
let worstSelf = 0;
for (const [key] of CLIPS) {
  const source = clipNamed(models.models.agent.clips[key]);
  const baked = clipNamed(models.models.hero.clips[key]);
  agentRest();
  heroRest();
  const ours = worldDeltaRetarget(THREE, { source: agent, target: hero, clip: source, joints: OUR_JOINTS });
  let worst = 0;
  for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
    const t = phase * source.duration;
    heroRest();
    let stop = sample(heroRoot, baked, t);
    const want = OUR_JOINTS.map((j) => hero.bone(j).quaternion.clone());
    stop();
    heroRest();
    stop = sample(heroRoot, ours, t);
    OUR_JOINTS.forEach((j, i) => {
      worst = Math.max(worst, angleOf(want[i].clone().invert().multiply(hero.bone(j).quaternion)));
    });
    stop();
  }
  heroRest();
  worstSelf = Math.max(worstSelf, worst);
  console.log(`   ${key.padEnd(7)} ${models.models.agent.clips[key].padEnd(40)} worst joint ${worst.toFixed(2)}°`);
}
check(worstSelf < 2, `the retarget does not reproduce the build's hero clips (worst ${worstSelf.toFixed(2)}° ≥ 2°)`);
console.log(`   worst over five clips × five phases × 22 joints: ${worstSelf.toFixed(2)}° (the clips are meshopt-compressed, so not 0)`);

// ---------------------------------------------------------------------------
// 1 — the prepared model
// ---------------------------------------------------------------------------

const manifestPath = join(dir, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
check(manifest !== null, 'no manifest.json');
const manifestErrors = manifest === null ? ['missing'] : validateManifest(manifest);
check(manifestErrors.length === 0, `manifest.json does not validate: ${manifestErrors.join('; ')}`);
const gltf = await load(modelPath);
const modelRoot = gltf.scene.getObjectByName(slug) ?? gltf.scene;
const target = { root: modelRoot, bone: boneFinder(modelRoot) };
const meshes = [];
modelRoot.traverse((o) => {
  if (o.isSkinnedMesh) meshes.push(o);
});
const skeletonNames = meshes[0]?.skeleton.bones.map((b) => b.name) ?? [];
console.log(`\n1. ${relative(REPO, modelPath)}: ${String(meshes.length)} skinned primitives, skeleton ${String(skeletonNames.length)} joints, manifest ${manifestErrors.length === 0 ? 'valid' : 'INVALID'}`);
check(meshes.length > 0, 'no skinned mesh in model.glb');
check(JSON.stringify(skeletonNames) === JSON.stringify(['root', ...OUR_JOINTS]), `the skeleton is not root + our 22 joints: ${skeletonNames.join(', ')}`);
for (const j of OUR_JOINTS) check(target.bone(j) !== null, `model.glb has no joint ${j}`);
if (meshes.length === 0 || OUR_JOINTS.some((j) => target.bone(j) === null)) finish(); // nothing below can run
const modelRest = snapshot(modelRoot);

/** The skinned mesh as drawn now: its box and whether every vertex is finite. */
function drawn(list = meshes) {
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  let finite = true;
  for (const mesh of list) {
    const count = mesh.geometry.getAttribute('position').count;
    for (let i = 0; i < count; i += 1) {
      mesh.getVertexPosition(i, v);
      v.applyMatrix4(mesh.matrixWorld);
      if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) finite = false;
      else box.expandByPoint(v);
    }
  }
  return { box, finite };
}
function centroid(list) {
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  let n = 0;
  for (const mesh of list) {
    const count = mesh.geometry.getAttribute('position').count;
    for (let i = 0; i < count; i += 1) {
      mesh.getVertexPosition(i, v);
      c.add(v.applyMatrix4(mesh.matrixWorld));
      n += 1;
    }
  }
  return c.multiplyScalar(1 / Math.max(1, n));
}

modelRest();
for (const mesh of meshes) mesh.skeleton.update();
// At rest the skin is the identity: every joint's `boneWorld × boneInverse` is
// one and the same matrix (the file's dequantization, after meshopt), so every
// vertex is drawn where each of its joints — and `root`, which moves nothing —
// would put it. An inverse bind matrix that disagrees with its joint shows here,
// before any clip plays, even on a vertex bound wholly to that joint.
let restError = 0;
{
  const K = new THREE.Matrix4();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (const mesh of meshes) {
    const bones = mesh.skeleton.bones;
    const inverses = mesh.skeleton.boneInverses;
    const ref = new THREE.Matrix4().multiplyMatrices(bones[0].matrixWorld, inverses[0]);
    const place = (m, v, out) => out.copy(v).applyMatrix4(mesh.bindMatrix).applyMatrix4(m).applyMatrix4(mesh.bindMatrixInverse).applyMatrix4(mesh.matrixWorld);
    const position = mesh.geometry.getAttribute('position');
    const si = mesh.geometry.getAttribute('skinIndex');
    const sw = mesh.geometry.getAttribute('skinWeight');
    const v = new THREE.Vector3();
    for (let i = 0; i < position.count; i += 1) {
      v.fromBufferAttribute(position, i);
      place(ref, v, b);
      for (let k = 0; k < 4; k += 1) {
        if (sw.getComponent(i, k) <= 0) continue;
        const j = si.getComponent(i, k);
        K.multiplyMatrices(bones[j].matrixWorld, inverses[j]);
        restError = Math.max(restError, place(K, v, a).distanceTo(b));
      }
    }
  }
}
const rest = drawn();
const restSize = rest.box.getSize(new THREE.Vector3());
const restSide = Math.max(restSize.x, restSize.y, restSize.z);
const restCentre = rest.box.getCenter(new THREE.Vector3());
const height = restSize.y;
const cloakMaterials = new Set((manifest?.skinned ?? []).map((s) => s.material).filter(Boolean));
const cloak = meshes.filter((m) => cloakMaterials.has(m.material?.name));
const cloakRest = cloak.length > 0 ? centroid(cloak) : null;
const spineRest = target.bone('spine_02').matrixWorld.clone();
const bindWorld = new Map(OUR_JOINTS.map((j) => [j, target.bone(j).getWorldQuaternion(new THREE.Quaternion())]));
const bindLocal = new Map(OUR_JOINTS.map((j) => [j, target.bone(j).quaternion.clone()]));
agentRest();
const agentBind = new Map(OUR_JOINTS.map((j) => [j, agent.bone(j).getWorldQuaternion(new THREE.Quaternion())]));
const agentBindLocal = new Map(OUR_JOINTS.map((j) => [j, agent.bone(j).quaternion.clone()]));
console.log(
  `   rest: ${restSize.toArray().map((x) => x.toFixed(3)).join(' × ')} m, finite ${String(rest.finite)}, skinned-vs-file ${(restError * 1000).toFixed(3)} mm; cloak (rule-skinned) primitives: ${cloak.length > 0 ? cloak.map((m) => m.material.name).join(', ') : 'none'}`,
);
check(rest.finite, 'the rest pose has a non-finite vertex');
check(restError <= 0.001 * height, `at rest the skin moves a vertex ${restError.toFixed(4)} m from where the file puts it (an inverse bind matrix disagrees with its joint)`);

// ---------------------------------------------------------------------------
// 2 — OUR clips, on it
// ---------------------------------------------------------------------------

console.log('\n2. our clips on it (figures.glb agent → model.glb, the same world-space delta)');
/** Per joint: its OWN (local) rotation away from bind, on the model and on the agent, and how far apart their world deltas ever were. */
const moved = new Map(OUR_JOINTS.map((j) => [j, { doom: 0, agent: 0, mismatch: 0 }]));
const retargeted = new Map();
const rows = [];
for (const [key, label] of CLIPS) {
  const source = clipNamed(models.models.agent.clips[key]);
  agentRest();
  modelRest();
  const clip = worldDeltaRetarget(THREE, { source: agent, target, clip: source, joints: OUR_JOINTS, name: `${slug}_${label}` });
  retargeted.set(label, clip);
  const frames = Math.max(2, Math.round(source.duration * 30) + 1);
  for (let f = 0; f < frames; f += 1) {
    const t = (f / (frames - 1)) * source.duration;
    agentRest();
    modelRest();
    const stopA = sample(agentRoot, source, t);
    const stopD = sample(modelRoot, clip, t);
    for (const j of OUR_JOINTS) {
      const dAgent = agent.bone(j).getWorldQuaternion(new THREE.Quaternion()).multiply(agentBind.get(j).clone().invert());
      const dDoom = target.bone(j).getWorldQuaternion(new THREE.Quaternion()).multiply(bindWorld.get(j).clone().invert());
      const m = moved.get(j);
      m.agent = Math.max(m.agent, angleOf(agentBindLocal.get(j).clone().invert().multiply(agent.bone(j).quaternion)));
      m.doom = Math.max(m.doom, angleOf(bindLocal.get(j).clone().invert().multiply(target.bone(j).quaternion)));
      m.mismatch = Math.max(m.mismatch, angleOf(dAgent.clone().invert().multiply(dDoom)));
    }
    stopA();
    stopD();
  }
  for (const phase of [0, 0.5, 1]) {
    modelRest();
    const stop = sample(modelRoot, clip, phase * source.duration);
    for (const mesh of meshes) mesh.skeleton.update();
    let bonesFinite = true;
    for (const j of ['root', ...OUR_JOINTS]) if (!target.bone(j).matrixWorld.elements.every(Number.isFinite)) bonesFinite = false;
    const posed = drawn();
    const size = posed.box.getSize(new THREE.Vector3());
    const side = Math.max(size.x, size.y, size.z);
    const drift = posed.box.getCenter(new THREE.Vector3()).distanceTo(restCentre);
    let cloakOff = null;
    let cloakMoved = null;
    let spineMoved = null;
    if (cloakRest !== null) {
      const spineDelta = target.bone('spine_02').matrixWorld.clone().multiply(spineRest.clone().invert());
      const expected = cloakRest.clone().applyMatrix4(spineDelta);
      const now = centroid(cloak);
      cloakOff = now.distanceTo(expected);
      cloakMoved = now.distanceTo(cloakRest);
      spineMoved = new THREE.Vector3().setFromMatrixPosition(target.bone('spine_02').matrixWorld).distanceTo(new THREE.Vector3().setFromMatrixPosition(spineRest));
    }
    stop();
    const where = `${label} @ ${phase.toFixed(1)}`;
    check(bonesFinite, `${where}: a bone matrix is not finite`);
    check(posed.finite, `${where}: a skinned vertex is not finite`);
    check(side <= 1.5 * restSide, `${where}: the posed bounds' largest side ${side.toFixed(3)} is over 1.5× the rest's ${restSide.toFixed(3)}`);
    check(drift <= 1.5 * restSide, `${where}: the posed bounds moved ${drift.toFixed(3)} from the rest (over 1.5× ${restSide.toFixed(3)})`);
    if (cloakOff !== null) check(cloakOff <= 0.1 * height, `${where}: the cloak is ${cloakOff.toFixed(3)} m off where the spine carries it (over 10% of ${height.toFixed(3)})`);
    rows.push({ where, size, side, drift, finite: posed.finite && bonesFinite, cloakOff, cloakMoved, spineMoved });
  }
}
modelRest();
for (const r of rows) {
  console.log(
    `   ${r.where.padEnd(13)} bounds ${r.size.toArray().map((x) => x.toFixed(2)).join('×').padEnd(15)} largest ${(r.side / restSide).toFixed(2)}× rest  centre +${r.drift.toFixed(2)} m  finite ${r.finite ? 'yes' : 'NO'}` +
      (r.cloakOff !== null ? `  cloak ${r.cloakOff.toFixed(3)} m off spine_02's carry (moved ${r.cloakMoved.toFixed(2)} m, spine ${r.spineMoved.toFixed(2)} m)` : ''),
  );
}
if (cloakRest !== null) {
  const die = rows.filter((r) => r.where.startsWith('die'));
  const most = die.reduce((a, r) => (r.spineMoved > a.spineMoved ? r : a), die[0]);
  check(most.cloakMoved >= 0.5 * most.spineMoved, `the cloak did not follow the spine in the death (moved ${most.cloakMoved.toFixed(2)} m, spine ${most.spineMoved.toFixed(2)} m)`);
}

// ---------------------------------------------------------------------------
// 3 — joint coverage
// ---------------------------------------------------------------------------

const dominant = new Map(['root', ...OUR_JOINTS].map((j) => [j, 0]));
let vertices = 0;
for (const mesh of meshes) {
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  for (let i = 0; i < si.count; i += 1) {
    let best = 0;
    for (let k = 1; k < 4; k += 1) if (sw.getComponent(i, k) > sw.getComponent(i, best)) best = k;
    const name = mesh.skeleton.bones[si.getComponent(i, best)].name;
    dominant.set(name, (dominant.get(name) ?? 0) + 1);
    vertices += 1;
  }
}
console.log("\n3. joint coverage (each joint's OWN rotation from bind, max over every frame of the five clips; Δ = the largest gap between its world-space delta and the agent's)");
console.log(`   ${'joint'.padEnd(11)} ${'source bone (+ merged)'.padEnd(40)} ${'verts'.padStart(6)} ${'model°'.padStart(7)} ${'agent°'.padStart(7)} ${'Δ°'.padStart(6)}  moved`);
for (const j of OUR_JOINTS) {
  const m = moved.get(j);
  const r = manifest?.rig?.joints?.[j] ?? {};
  const merged = (r.followers?.length ?? 0) + (r.byAncestry?.length ?? 0) + (r.byPosition?.length ?? 0);
  const src = `${r.primary ?? '(synthesised)'}${merged > 0 ? ` (+${String(merged)})` : ''}`;
  // 1°: the agent's own clips carry compression noise of about half a degree on a joint that does not move.
  const didMove = m.doom > 1;
  const shouldMove = m.agent > 1;
  check(!shouldMove || didMove, `${j} did not move where the agent's did (${m.doom.toFixed(1)}° vs ${m.agent.toFixed(1)}°)`);
  check(m.mismatch < 1, `${j}'s world-space delta differs from the agent's by ${m.mismatch.toFixed(2)}°`);
  const pct = ((100 * (dominant.get(j) ?? 0)) / Math.max(1, vertices)).toFixed(1);
  console.log(
    `   ${j.padEnd(11)} ${src.padEnd(40)} ${`${pct}%`.padStart(6)} ${m.doom.toFixed(1).padStart(7)} ${m.agent.toFixed(1).padStart(7)} ${m.mismatch.toFixed(2).padStart(6)}  ${didMove ? 'yes' : shouldMove ? 'NO' : 'still (as on the agent)'}`,
  );
}
const unmoved = OUR_JOINTS.filter((j) => moved.get(j).doom <= 1);
console.log(`   ${String(OUR_JOINTS.length - unmoved.length)}/${String(OUR_JOINTS.length)} joints moved${unmoved.length > 0 ? `; still: ${unmoved.join(', ')}` : ''}; ${String(vertices)} vertices`);

// ---------------------------------------------------------------------------
// 4 — previews through headless Chromium
// ---------------------------------------------------------------------------

if (PREVIEW) {
  try {
    await previews();
  } catch (err) {
    failures.push(`preview: ${err.message}`);
  }
}

finish();

function finish() {
  if (failures.length > 0) {
    console.log(`\nFAIL — ${String(failures.length)} assertion(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`\nOK — ${slug} takes our clip set: every joint that moves on the agent moves on it, by the same world-space delta; nothing exploded; the rule-skinned parts follow the spine.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------

async function previews() {
  const pageDir = resolve(REPO, 'var/personal-tier/preview');
  mkdirSync(pageDir, { recursive: true });
  writeFileSync(join(pageDir, 'index.html'), page());
  const clipJson = new Map([...retargeted].map(([label, clip]) => [`/clip/${label}.json`, JSON.stringify(THREE.AnimationClip.toJSON(clip))]));
  const threeDir = join(WEB, 'node_modules/three');
  const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.glb': 'model/gltf-binary' };
  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${String(PORT)}`);
    let file = null;
    if (url.pathname === '/' || url.pathname === '/index.html') file = join(pageDir, 'index.html');
    else if (url.pathname === '/model.glb') file = modelPath;
    else if (clipJson.has(url.pathname)) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(clipJson.get(url.pathname));
      return;
    } else if (url.pathname.startsWith('/three/')) {
      const p = normalize(join(threeDir, decodeURIComponent(url.pathname.slice('/three/'.length))));
      if (p.startsWith(threeDir + sep)) file = p;
    }
    if (file === null || !existsSync(file)) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise((ok, bad) => {
    server.once('error', bad);
    server.listen(PORT, '127.0.0.1', ok);
  });
  const profile = resolve(REPO, 'var/personal-tier/chromium-profile');
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const gpuFlags = { swiftshader: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], gl: ['--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu'] }[GPU];
  const chromium = spawn(
    opt('chromium', 'chromium'),
    ['--headless=new', ...gpuFlags, '--no-sandbox', '--disable-dev-shm-usage', `--remote-debugging-port=${String(CDP_PORT)}`, '--window-size=900,900', `--user-data-dir=${profile}`, 'about:blank'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let chromiumErr = '';
  chromium.stderr.on('data', (b) => (chromiumErr += String(b)));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    let version = null;
    for (let i = 0; i < 100 && version === null; i += 1) {
      try {
        const res = await fetch(`http://127.0.0.1:${String(CDP_PORT)}/json/version`);
        if (res.ok) version = await res.json();
      } catch {
        /* not up yet */
      }
      if (version === null) await sleep(200);
    }
    if (version === null) throw new Error(`chromium never answered on ${String(CDP_PORT)}\n${chromiumErr}`);
    const pageUrl = `http://127.0.0.1:${String(PORT)}/`;
    const tab = await (await fetch(`http://127.0.0.1:${String(CDP_PORT)}/json/new?${encodeURIComponent(pageUrl)}`, { method: 'PUT' })).json();
    const cdp = connect(tab.webSocketDebuggerUrl);
    await cdp.ready;
    await cdp.send('Runtime.enable');
    let ready = false;
    for (let i = 0; i < 150 && !ready; i += 1) {
      const r = await cdp.send('Runtime.evaluate', { expression: 'window.__ready === true || window.__error || false', returnByValue: true });
      if (typeof r.result.value === 'string') throw new Error(`the preview page failed: ${r.result.value}`);
      ready = r.result.value === true;
      if (!ready) await sleep(200);
    }
    if (!ready) throw new Error('the preview page never got ready');
    const r = await cdp.send('Runtime.evaluate', { expression: 'window.__render()', awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`render threw: ${JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails)}`);
    const shots = r.result.value;
    if (shots.lost || shots.calls === 0) {
      throw new Error(`the WebGL context was lost or nothing was drawn (${String(shots.calls)} calls); Chromium said:\n${chromiumErr.split('\n').filter((l) => /gpu|webgl|context|gl_|angle|swiftshader|crash/i.test(l)).slice(-12).join('\n')}`);
    }
    const outDir = insideSlug(slug, 'preview');
    mkdirSync(outDir, { recursive: true });
    console.log(`\n4. previews (headless Chromium: ${shots.renderer}; last view ${String(shots.calls)} draw calls, ${String(shots.triangles)} triangles, centre pixel ${shots.centre.join(',')}, context lost ${String(shots.lost)}, gl error ${String(shots.error)})`);
    for (const [name, dataUrl] of Object.entries(shots.images)) {
      const file = insideSlug(slug, `preview/${name}.png`);
      writeFileSync(file, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
      console.log(`   ${relative(REPO, file)}`);
    }
    cdp.close();
  } finally {
    try {
      const v = await (await fetch(`http://127.0.0.1:${String(CDP_PORT)}/json/version`)).json();
      const closer = new WebSocket(v.webSocketDebuggerUrl);
      await new Promise((ok) => closer.addEventListener('open', () => ok(undefined)));
      closer.send(JSON.stringify({ id: 9999, method: 'Browser.close' }));
      await sleep(1200);
      closer.close();
    } catch {
      /* already gone */
    }
    server.close();
  }
}

/** A minimal CDP client (tools/arena-bench.mjs's): one socket, awaited replies. */
function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  let id = 0;
  const ready = new Promise((res, rej) => {
    socket.addEventListener('open', () => res(undefined));
    socket.addEventListener('error', (e) => rej(new Error(`ws error: ${String(e.message ?? e.type)}`)));
  });
  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(String(event.data));
    const entry = pending.get(msg.id);
    if (entry === undefined) return;
    pending.delete(msg.id);
    if (msg.error) entry.reject(new Error(JSON.stringify(msg.error)));
    else entry.resolve(msg.result);
  });
  return {
    ready,
    send(method, params = {}) {
      id += 1;
      const mine = id;
      return new Promise((res, rej) => {
        pending.set(mine, { resolve: res, reject: rej });
        socket.send(JSON.stringify({ id: mine, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

/**
 * The preview page. three from web/node_modules through an import map, the
 * model and the retargeted attack clip from this script's own loopback server —
 * nothing else. Four views at 800 × 800, lit plainly (a hemisphere and two
 * directional lights: this is a look at the model and its textures, not at the
 * arena's comic shading), and a sheet of the four.
 */
function page() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>personal preview</title>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<style>html,body{margin:0;background:#2b2f36}</style></head>
<body>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const SIZE = 800;
try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2b2f36);
  scene.add(new THREE.HemisphereLight(0xe4ecff, 0x3b342c, 1.8));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(2, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 1.4);
  rim.position.set(-3, 3, -4);
  scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), new THREE.MeshStandardMaterial({ color: 0x4a4f58, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync('/model.glb');
  scene.add(gltf.scene);
  const clips = {};
  for (const label of ['attack', 'kneel', 'die']) clips[label] = THREE.AnimationClip.parse(await (await fetch('/clip/' + label + '.json')).json());
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const h = box.max.y - box.min.y;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  const d = (h * 1.2) / 2 / Math.tan(THREE.MathUtils.degToRad(15));
  const view = (x, z, label, phase) => {
    mixer.stopAllAction();
    if (label) {
      const action = mixer.clipAction(clips[label]);
      action.play();
      action.time = Math.min(phase * clips[label].duration, clips[label].duration - 1e-4);
      mixer.update(0);
    }
    gltf.scene.updateMatrixWorld(true);
    // Standing views share one framing; a pose that leaves it (the death) is framed on its own skinned bounds.
    const posed = new THREE.Box3().setFromObject(gltf.scene, true);
    const c = posed.getCenter(new THREE.Vector3());
    const span = Math.max(h, posed.max.y - posed.min.y, posed.max.x - posed.min.x, posed.max.z - posed.min.z);
    const fit = label === 'die';
    const dist = fit ? (span * 1.15) / 2 / Math.tan(THREE.MathUtils.degToRad(15)) : d;
    const aim = fit ? c : new THREE.Vector3(0, h * 0.5, 0);
    camera.position.set(aim.x + x * dist, aim.y + h * 0.05 + (fit ? span * 0.25 : 0), aim.z + z * dist);
    camera.lookAt(aim);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  };
  window.__render = async () => {
    const s30 = Math.sin(Math.PI / 6);
    const c30 = Math.cos(Math.PI / 6);
    const images = {
      front: view(0, 1),
      side: view(1, 0),
      back: view(0, -1),
      attack: view(s30, c30, 'attack', 0.5),
    };
    const sheet = document.createElement('canvas');
    sheet.width = SIZE * 4;
    sheet.height = SIZE;
    const g = sheet.getContext('2d');
    let i = 0;
    for (const url of Object.values(images)) {
      const img = new Image();
      img.src = url;
      await img.decode();
      g.drawImage(img, i * SIZE, 0);
      i += 1;
    }
    g.fillStyle = '#e8ecf2';
    g.font = '22px sans-serif';
    ['front', 'side (its left)', 'back', 'attack, t = 0.5'].forEach((label, k) => g.fillText(label, k * SIZE + 16, 34));
    images.sheet = sheet.toDataURL('image/png');
    // Two more, not on the sheet: the cloak under the kneel and the death, from the side.
    images.kneel = view(c30, s30, 'kneel', 0.5);
    images.die = view(1, 0, 'die', 0.7);
    const gl = renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const px = new Uint8Array(4);
    gl.readPixels(SIZE / 2, SIZE / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return {
      images,
      renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      lost: gl.isContextLost(),
      error: gl.getError(),
      centre: Array.from(px),
    };
  };
  window.__ready = true;
} catch (err) {
  window.__error = String(err && err.stack || err);
}
</script>
</body></html>
`;
}
