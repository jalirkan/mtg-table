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
 *   3. judges the RIG MAP against the `agent` body (`lib.mjs`'s `judgeBody`,
 *      D192), because step 2's rotations hold by construction for ANY map
 *      (prepare builds every skeleton in the agent's bind rotations): every
 *      core joint the agent's skin uses carries skin weight on the model; the
 *      weighted source bones placed by position carry at most 2% of the weight;
 *      every `_l` joint, and the vertices it carries, is on the agent's side
 *      (+x); each foot's vertices are in front of its ankle (a left/right swap
 *      turns the whole figure round, and the feet then point backwards); and
 *      the branches (pelvis → thigh, spine_03 → clavicle) and the toes point
 *      within 60° of the agent's. Prints the joint-coverage table (weight,
 *      vertices, rotation) and the side, facing and shape lines;
 *  3b. judges the LIMBS against the `agent` body (`judgeLimbs`, D193), because a
 *      map that swaps two joints of a chain — the forearm and the hand — passes
 *      step 3 and the bounds: each link of the spine (pelvis … Head), the arms
 *      (upperarm → lowerarm → hand) and the legs (thigh → calf → foot) points
 *      within 25° (the limbs) or 45° (the spine and the neck) of the agent's —
 *      the arm links by construction under `--pose t`, which turns them — each
 *      limb's second link is within 1/1.6–1.6× the agent's proportion to its
 *      first, each limb joint's vertices lie AHEAD of it along its link (a fold
 *      carries them behind), and at attack t = 0.5 both hands, both feet and
 *      the head move into the agent's half-space.
 *  2c. (phase 2, D194) the clips BAKED into `model.glb` — the ones the arena
 *      binds — are the ones this check just carried on: every key the manifest
 *      names is in the file, and each of our five clips sampled at five phases
 *      puts every joint within 2° and the pelvis within 1% of the height of the
 *      retarget's (the meshopt quantisation, not 0).
 *
 * The closing OK line lists what was judged and nothing else: the rotation
 * columns hold by construction and are printed as a sanity check, not claimed.
 *
 * **The verdict is written down** (phase 2, D194): `check.json` beside the model
 * — pass or fail, the failures, what was judged, and the sha256 of the
 * `model.glb` it judged. The dev route's index loads a model only when that file
 * says it passed and names the model on disk, so a model that fails this check,
 * or was prepared again since, is never loaded.
 *
 * Then, unless `--no-preview`, it renders turntables — front, side, back and a
 * mid-attack frame, plus a sheet of all four, and the kneel and the death from
 * the side (where a cloak skinned by rule shows what it does) — to
 * `personal/models/<slug>/preview/*.png` through headless Chromium over CDP, the
 * way `tools/arena-bench.mjs` drives it: a small page, answered from memory by a
 * loopback server this script starts and stops, that loads the GLB with three
 * from `web/node_modules`. **It writes nothing outside the slug's folder**: the
 * browser's profile is `personal/models/<slug>/.preview-profile/` for the run
 * and is deleted after it, its disk cache is sized to nothing, and every answer
 * is `no-store`. **No network**: background services are off and every host
 * name resolves to nothing (`--host-resolver-rules`), and Chromium's own net
 * log, read back before the profile goes, must show no connection, byte, DNS
 * query or answer beyond 127.0.0.1, and an HTTP cache that keyed no entry for
 * any other host (D193: the omnibox's AI-mode eligibility request keyed one for
 * www.google.com until `AimServerRequestOnStartupEnabled` was turned off). The
 * profile itself is read before it is deleted, and must hold no copy of
 * `model.glb`.
 *
 * Exit 0 when every assertion holds, 1 otherwise.
 */

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, relative, resolve, sep } from 'node:path';

import {
  boneFinder,
  CORE_JOINTS,
  END_MOVE_MIN,
  FLESH_AGENT_MIN,
  insideSlug,
  judgeBody,
  judgeLimbs,
  LIMB_LENGTH_BAND,
  loadThree,
  netLogReport,
  OUR_JOINTS,
  profileReport,
  REPO,
  SEGMENT_LIMIT_DEG,
  slugDir,
  snapshot,
  THREE,
  validateManifest,
  WEB,
} from './lib.mjs';
import { worldDeltaRetarget } from './retarget.mjs';

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
/** What was judged, for the closing line: each entry says what held (filled in as the steps run). */
const judgedList = [];

// ---------------------------------------------------------------------------
// Loading, in Node
// ---------------------------------------------------------------------------

/** three's own loader, as the arena loads a model (lib.mjs `loadThree`: images stripped, meshopt decoded). */
const load = (path) => loadThree(path);

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
judgedList.push(`the retarget reproduces the build's own hero clips (worst joint ${worstSelf.toFixed(2)}°)`);
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
// ONE draw call a figure (D240): one skinned primitive under one material, and
// nothing else that draws — prepare's paint step folds every paint into one atlas.
{
  const drawn = [];
  modelRoot.traverse((o) => {
    if (o.isMesh) drawn.push(o);
  });
  const materials = new Set(drawn.flatMap((o) => (Array.isArray(o.material) ? o.material : [o.material])));
  const groups = drawn.reduce((a, o) => a + (Array.isArray(o.material) ? Math.max(1, o.geometry.groups.length) : 1), 0);
  console.log(`   draws: ${String(drawn.length)} mesh(es), ${String(meshes.length)} skinned, ${String(materials.size)} material(s) — ${String(groups)} draw call(s) a figure`);
  check(
    drawn.length === 1 && meshes.length === 1 && materials.size === 1 && groups === 1,
    `model.glb draws ${String(groups)} call(s) a figure (${String(drawn.length)} mesh(es), ${String(materials.size)} material(s)): since D240 a prepared model is ONE skinned primitive under ONE material — run prepare.mjs again`,
  );
  if (drawn.length === 1 && materials.size === 1) judgedList.push('one skinned primitive under one material: one draw call a figure (D240)');
}
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
/** The centroid of some spans of vertices — `{ mesh, first, count }`, a whole mesh when `first`/`count` are absent. */
function centroid(list) {
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  let n = 0;
  for (const span of list) {
    const mesh = span.mesh ?? span;
    const first = span.first ?? 0;
    const count = span.count ?? mesh.geometry.getAttribute('position').count;
    for (let i = first; i < first + count; i += 1) {
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
// The rule-skinned parts (a cloak): whole primitives by material, or — since the
// paint step merges parts (D194) — each part's vertex range in its paint's primitive.
const cloak = [];
if (Array.isArray(manifest?.paint?.primitives)) {
  for (const skinned of manifest?.skinned ?? []) {
    for (const record of manifest.paint.primitives) {
      const range = record.parts.find((r) => r.part === skinned.part);
      const mesh = meshes.find((m) => m.material?.name === record.material);
      if (range !== undefined && mesh !== undefined) cloak.push({ mesh, first: range.first, count: range.count, name: `${skinned.part} in ${record.material}` });
    }
  }
} else {
  const cloakMaterials = new Set((manifest?.skinned ?? []).map((x) => x.material).filter(Boolean));
  for (const mesh of meshes) if (cloakMaterials.has(mesh.material?.name)) cloak.push({ mesh, name: mesh.material.name });
}
const cloakRest = cloak.length > 0 ? centroid(cloak) : null;
const spineRest = target.bone('spine_02').matrixWorld.clone();
const bindWorld = new Map(OUR_JOINTS.map((j) => [j, target.bone(j).getWorldQuaternion(new THREE.Quaternion())]));
const bindLocal = new Map(OUR_JOINTS.map((j) => [j, target.bone(j).quaternion.clone()]));
agentRest();
const agentBind = new Map(OUR_JOINTS.map((j) => [j, agent.bone(j).getWorldQuaternion(new THREE.Quaternion())]));
const agentBindLocal = new Map(OUR_JOINTS.map((j) => [j, agent.bone(j).quaternion.clone()]));
console.log(
  `   rest: ${restSize.toArray().map((x) => x.toFixed(3)).join(' × ')} m, finite ${String(rest.finite)}, skinned-vs-file ${(restError * 1000).toFixed(3)} mm; cloak (rule-skinned) parts: ${cloak.length > 0 ? cloak.map((x) => x.name).join(', ') : 'none'}`,
);
check(rest.finite, 'the rest pose has a non-finite vertex');
check(restError <= 0.001 * height, `at rest the skin moves a vertex ${restError.toFixed(4)} m from where the file puts it (an inverse bind matrix disagrees with its joint)`);
judgedList.push(`the skeleton is root + our 22 joints and the skin draws every vertex where the file puts it at rest (${(restError * 1000).toFixed(3)} mm)`);

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
judgedList.push(
  `our five clips at t = 0, 0.5 and 1 draw finite bones and vertices inside 1.5× the rest's largest side (at most ${Math.max(...rows.map((r) => r.side / restSide)).toFixed(2)}×)${cloakRest !== null ? ', and the rule-skinned parts follow the spine' : ''}`,
);
if (cloakRest !== null) {
  const die = rows.filter((r) => r.where.startsWith('die'));
  const most = die.reduce((a, r) => (r.spineMoved > a.spineMoved ? r : a), die[0]);
  check(most.cloakMoved >= 0.5 * most.spineMoved, `the cloak did not follow the spine in the death (moved ${most.cloakMoved.toFixed(2)} m, spine ${most.spineMoved.toFixed(2)} m)`);
}

// ---------------------------------------------------------------------------
// 2c — the clips baked into model.glb are the ones just carried on (D194)
// ---------------------------------------------------------------------------

console.log('\n2c. the clips baked into model.glb (what the arena binds) against the retarget above');
{
  const baked = new Map(gltf.animations.map((a) => [a.name, a]));
  const keys = manifest?.clips?.keys ?? [];
  const missing = keys.filter((k) => !baked.has(k));
  check(keys.length > 0, 'the manifest names no baked clip (phase 1\'s prepare): run prepare.mjs again');
  check(missing.length === 0, `model.glb lacks the baked clip(s) ${missing.join(', ')} the manifest names`);
  const agentKeys = Object.keys(models.models.agent.clips);
  const notBaked = agentKeys.filter((k) => !baked.has(k));
  check(notBaked.length === 0, `model.glb lacks ${notBaked.join(', ')} of the agent's clip set`);
  let worstDeg = 0;
  let worstHip = 0;
  for (const [key, label] of CLIPS) {
    const ours = retargeted.get(label);
    const file = baked.get(key);
    if (ours === undefined || file === undefined) continue;
    let deg_ = 0;
    let hip = 0;
    for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
      const t = phase * Math.min(ours.duration, file.duration);
      modelRest();
      let stop = sample(modelRoot, ours, t);
      const want = OUR_JOINTS.map((j) => target.bone(j).quaternion.clone());
      const wantHip = target.bone('pelvis').position.clone();
      stop();
      modelRest();
      stop = sample(modelRoot, file, t);
      OUR_JOINTS.forEach((j, i) => {
        deg_ = Math.max(deg_, angleOf(want[i].clone().invert().multiply(target.bone(j).quaternion)));
      });
      hip = Math.max(hip, wantHip.distanceTo(target.bone('pelvis').position));
      stop();
    }
    modelRest();
    worstDeg = Math.max(worstDeg, deg_);
    worstHip = Math.max(worstHip, hip);
    console.log(`   ${key.padEnd(7)} worst joint ${deg_.toFixed(2)}°, pelvis ${(hip * 1000).toFixed(1)} mm`);
  }
  check(worstDeg < 2, `a baked clip is ${worstDeg.toFixed(2)}° off the retarget (≥ 2°): model.glb's clips are not ours`);
  check(worstHip < 0.01 * height, `a baked clip's pelvis is ${(worstHip * 1000).toFixed(1)} mm off the retarget's (over 1% of the height)`);
  console.log(`   ${String(keys.length)} clips baked (${keys.join(', ')}); worst over five clips × five phases: ${worstDeg.toFixed(2)}°, pelvis ${(worstHip * 1000).toFixed(1)} mm`);
  judgedList.push(
    `the ${String(keys.length)} clips baked into model.glb are the retarget's (worst joint ${worstDeg.toFixed(2)}°, pelvis ${(worstHip * 1000).toFixed(1)} mm over five clips × five phases)`,
  );
}

// ---------------------------------------------------------------------------
// 3 — joint coverage, sides, facing and shape: the checks a wrong map fails
// ---------------------------------------------------------------------------

// The rotation columns above hold BY CONSTRUCTION: prepare builds every
// skeleton in the agent's bind rotations and the clips are the agent's, so a
// joint turns as the agent's does whichever source bone it was mapped to (the
// verifier's two wrong maps both read "moved yes", 21/22). What a wrong map
// changes is where the skin WEIGHT goes and where the joints STAND, so that is
// what is judged here, against the agent body (lib.mjs `judgeBody`, D192).

/** Our joint a bone counts as: itself, or its nearest ancestor among ours (the agent's fingers → its hand). */
const OURS = new Set(['root', ...OUR_JOINTS]);
function ourOf(bone) {
  for (let b = bone; b !== null && b !== undefined; b = b.parent) {
    const name = OURS.has(b.name) ? b.name : b.name.replace(/_\d+$/, '');
    if (OURS.has(name) && b.isBone) return name;
  }
  return 'root';
}

/** A body at rest: our joints' positions, and per joint the vertices it dominates (centroid, count) and the weight it carries. */
function bodyStats(root, list, bone) {
  root.updateMatrixWorld(true);
  for (const mesh of list) mesh.skeleton.update();
  const joints = {};
  for (const j of OUR_JOINTS) joints[j] = new THREE.Vector3().setFromMatrixPosition(bone(j).matrixWorld).toArray();
  const acc = new Map();
  const slot = (j) => {
    if (!acc.has(j)) acc.set(j, { at: new THREE.Vector3(), n: 0, weight: 0 });
    return acc.get(j);
  };
  let totalWeight = 0;
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (const mesh of list) {
    const names = mesh.skeleton.bones.map(ourOf);
    const si = mesh.geometry.getAttribute('skinIndex');
    const sw = mesh.geometry.getAttribute('skinWeight');
    for (let i = 0; i < si.count; i += 1) {
      mesh.getVertexPosition(i, v);
      v.applyMatrix4(mesh.matrixWorld);
      box.expandByPoint(v);
      let best = 0;
      for (let k = 0; k < 4; k += 1) {
        const w = sw.getComponent(i, k);
        if (w > sw.getComponent(i, best)) best = k;
        if (w <= 0) continue;
        slot(names[si.getComponent(i, k)]).weight += w;
        totalWeight += w;
      }
      const d = slot(names[si.getComponent(i, best)]);
      d.at.add(v);
      d.n += 1;
    }
  }
  const mass = {};
  for (const [j, d] of acc) mass[j] = { at: d.n > 0 ? d.at.multiplyScalar(1 / d.n).toArray() : null, n: d.n, weight: d.weight };
  return { joints, mass, totalWeight, height: box.max.y - box.min.y };
}

modelRest();
agentRest();
const agentMeshes = [];
agentRoot.traverse((o) => {
  if (o.isSkinnedMesh) agentMeshes.push(o);
});
const bodyModel = bodyStats(modelRoot, meshes, target.bone);
const bodyAgent = bodyStats(agentRoot, agentMeshes, agent.bone);
const judged = judgeBody(bodyModel, bodyAgent, manifest?.rig ?? {});
for (const p of judged.problems) failures.push(p);

const vertices = Object.values(bodyModel.mass).reduce((a, m) => a + m.n, 0);
const f1 = (x) => (100 * x).toFixed(1).padStart(5);
console.log('\n3. joint coverage — the skin weight each joint carries on the model and on the agent (the agent\'s fingers, twists and extra spine counted');
console.log('   as their joint of ours), the share of vertices it dominates, and its own rotation from bind, largest over every frame of the five clips');
console.log('   (model° = agent° and Δ ≈ 0 BY CONSTRUCTION — a sanity check of the retarget, not of the map; the weight, side and facing checks are the map\'s)');
console.log(`   ${'joint'.padEnd(11)} ${'source bone (+ merged)'.padEnd(36)} ${'weight%'.padStart(7)} ${'agent%'.padStart(7)} ${'verts%'.padStart(6)} ${'model°'.padStart(7)} ${'agent°'.padStart(7)} ${'Δ°'.padStart(5)}  moved`);
for (const j of OUR_JOINTS) {
  const m = moved.get(j);
  const r = manifest?.rig?.joints?.[j] ?? {};
  const merged = (r.followers?.length ?? 0) + (r.byAncestry?.length ?? 0) + (r.byPosition?.length ?? 0);
  const synth = (manifest?.rig?.synthesised ?? []).includes(j);
  const src = synth ? '(synthesised)' : `${r.primary ?? '(none)'}${r.primaryWeighted === false ? ' [UNWEIGHTED]' : ''}${merged > 0 ? ` (+${String(merged)})` : ''}`;
  // 1°: the agent's own clips carry compression noise of about half a degree on a joint that does not move.
  const didMove = m.doom > 1;
  const shouldMove = m.agent > 1;
  check(!shouldMove || didMove, `${j} did not move where the agent's did (${m.doom.toFixed(1)}° vs ${m.agent.toFixed(1)}°)`);
  check(m.mismatch < 1, `${j}'s world-space delta differs from the agent's by ${m.mismatch.toFixed(2)}°`);
  const w = judged.weight[j];
  const flag = w.agent >= 0.001 && w.share < 0.0001 ? (CORE_JOINTS.includes(j) && !synth ? '  NO WEIGHT' : '  no weight') : '';
  console.log(
    `   ${j.padEnd(11)} ${src.slice(0, 36).padEnd(36)} ${f1(w.share).padStart(7)} ${f1(w.agent).padStart(7)} ${f1(w.verts / Math.max(1, vertices)).padStart(6)} ${m.doom.toFixed(1).padStart(7)} ${m.agent.toFixed(1).padStart(7)} ${m.mismatch.toFixed(2).padStart(5)}  ${didMove ? 'yes' : shouldMove ? 'NO' : 'still (as on the agent)'}${flag}`,
  );
}
const unmoved = OUR_JOINTS.filter((j) => moved.get(j).doom <= 1);
const weighted = OUR_JOINTS.filter((j) => judged.weight[j].share >= 0.0001).length;
const placement = manifest?.rig?.placement;
console.log(
  `   ${String(OUR_JOINTS.length - unmoved.length)}/${String(OUR_JOINTS.length)} joints turned${unmoved.length > 0 ? ` (still: ${unmoved.join(', ')})` : ''}; ${String(weighted)}/${String(OUR_JOINTS.length)} carry weight; ${String(vertices)} vertices` +
    (placement ? `; source bones placed by ancestry ${String(placement.byAncestry)}, by position ${String(placement.byPosition)} (${(100 * placement.byPositionWeight).toFixed(2)}% of the weight)` : ''),
);

const sideRows = judged.sides.filter((x) => x.judged);
console.log(
  `\n   sides   ${String(sideRows.filter((x) => x.ok).length)}/${String(sideRows.length)} judged on the agent's side (every _l joint and the vertices it carries at +x, the character's left)` +
    (sideRows.some((x) => !x.ok) ? `; WRONG: ${sideRows.filter((x) => !x.ok).map((x) => x.what).join(', ')}` : ''),
);
console.log(
  `   facing  the feet's vertices in front of the ankle: left ${judged.facing.l.forward?.toFixed(3) ?? '—'} m (agent ${judged.facing.l.agent?.toFixed(3) ?? '—'}), right ${judged.facing.r.forward?.toFixed(3) ?? '—'} m (agent ${judged.facing.r.agent?.toFixed(3) ?? '—'}) — positive is +z, the way the figure faces`,
);
const worstSegment = judged.segments.filter((x) => x.deg !== null).reduce((a, x) => (x.deg > a.deg ? x : a), { deg: -1 });
console.log(
  `   shape   ${String(judged.segments.filter((x) => x.deg !== null && x.deg <= SEGMENT_LIMIT_DEG).length)}/${String(judged.segments.length)} branches and toes (pelvis → thigh, spine_03 → clavicle, foot → ball) within ${String(SEGMENT_LIMIT_DEG)}° of the agent's; widest ${worstSegment.a} → ${worstSegment.b} ${worstSegment.deg.toFixed(1)}° (the chains are 3b's)`,
);
for (const w of judged.warnings) console.log(`   WARN    ${w}`);
for (const p of judged.problems) console.log(`   FAIL    ${p}`);
const sidesOk = sideRows.filter((x) => x.ok).length;
const feetForward = ['l', 'r'].filter((x) => (judged.facing[x]?.forward ?? 0) > 0.005 * bodyModel.height && (judged.facing[x]?.agent ?? 0) > 0).length;
judgedList.push(
  `the rig map, against the agent body: ${String(weighted)}/${String(OUR_JOINTS.length)} joints carry weight, ${String(sidesOk)}/${String(sideRows.length)} sides the agent's, ${String(feetForward)}/2 feet in front of their ankles, ${String(judged.segments.filter((x) => x.deg !== null && x.deg <= SEGMENT_LIMIT_DEG).length)}/${String(judged.segments.length)} branches and toes within ${String(SEGMENT_LIMIT_DEG)}°`,
);

// ---------------------------------------------------------------------------
// 3b — the limbs: each link's direction, length and flesh, and the ends at attack t = 0.5 (D193)
// ---------------------------------------------------------------------------

// A map that swaps two joints of a chain (the forearm and the hand) passes every
// check above: the rotations by construction, the weight still on 22 joints, the
// sides right, and the bounds cannot see a fold — the arm gets SHORTER. What it
// changes is where each link points, how long it is against its neighbour, and
// which side of its joint its flesh lies on (lib.mjs `judgeLimbs`).
modelRest();
agentRest();
const attackClip = retargeted.get('attack');
const agentAttackClip = clipNamed(models.models.agent.clips.attack);
const jointsNow = (bone) => Object.fromEntries(OUR_JOINTS.map((j) => [j, new THREE.Vector3().setFromMatrixPosition(bone(j).matrixWorld).toArray()]));
let stopAttack = sample(modelRoot, attackClip, 0.5 * agentAttackClip.duration);
const attackModel = jointsNow(target.bone);
stopAttack();
modelRest();
stopAttack = sample(agentRoot, agentAttackClip, 0.5 * agentAttackClip.duration);
const attackAgent = jointsNow(agent.bone);
stopAttack();
agentRest();
const fix = manifest?.pose?.fix ?? 't';
const limbs = judgeLimbs(bodyModel, bodyAgent, { rig: manifest?.rig ?? {}, fix, attack: { body: attackModel, agent: attackAgent } });
for (const p of limbs.problems) failures.push(p);
console.log('\n3b. limbs — each link of the spine, the arms and the legs at rest against the agent\'s: where it points (child joint − joint), how long it is');
console.log('   against the link before it, and where the vertices its joint carries lie along it (0 at the joint, 1 at the child; below 0 the');
console.log(`   limb is folded back on itself); then where each chain's end moved at attack t = 0.5 (the cosine against the agent's move)`);
console.log(`   ${'link'.padEnd(24)} ${'dir°'.padStart(6)} ${'limit'.padStart(5)} ${'length×'.padStart(8)} ${'flesh'.padStart(6)} ${'agent'.padStart(6)}`);
for (const l of limbs.links) {
  const length = limbs.lengths.find((x) => x.second === `${l.a} → ${l.b}`);
  const note = l.skipped ? '  (a synthesised joint: not judged)' : l.turned && l.deg !== null ? '  (turned onto the agent\'s by prepare\'s A → T: by construction)' : '';
  console.log(
    `   ${`${l.a} → ${l.b}`.padEnd(24)} ${(l.deg === null ? '—' : l.deg.toFixed(1)).padStart(6)} ${String(l.limit).padStart(5)} ${(length ? `${length.times.toFixed(2)}` : '—').padStart(8)} ${(l.flesh === null ? '—' : l.flesh.toFixed(2)).padStart(6)} ${(l.agentFlesh === null ? '—' : l.agentFlesh.toFixed(2)).padStart(6)}${note}`,
  );
}
const dirJudged = limbs.links.filter((l) => l.deg !== null);
const dirMeasured = dirJudged.filter((l) => !l.turned);
const fleshJudged = limbs.links.filter((l) => l.flesh !== null && l.agentFlesh !== null && l.agentFlesh >= FLESH_AGENT_MIN);
const endsJudged = limbs.ends.filter((e) => e.judged);
console.log(
  `   direction ${String(dirJudged.filter((l) => l.deg <= l.limit).length)}/${String(dirJudged.length)} links within their limit (${String(dirMeasured.length)} measured, ${String(dirJudged.length - dirMeasured.length)} arm links turned by prepare); ` +
    `length ${String(limbs.lengths.filter((x) => x.ok).length)}/${String(limbs.lengths.length)} limbs inside ${(1 / LIMB_LENGTH_BAND).toFixed(2)}–${LIMB_LENGTH_BAND.toFixed(1)}× the agent's proportion; ` +
    `flesh ${String(fleshJudged.filter((l) => l.flesh > 0).length)}/${String(fleshJudged.length)} limb joints carry their vertices ahead of them`,
);
console.log(
  `   ends at attack t = 0.5: ${limbs.ends.map((e) => `${e.joint} ${e.cos === null ? '—' : e.cos.toFixed(2)}${e.judged ? '' : ' (moved under ' + String(END_MOVE_MIN * 100) + '%: not judged)'}`).join(', ')}`,
);
for (const w of limbs.warnings) console.log(`   WARN    ${w}`);
for (const p of limbs.problems) console.log(`   FAIL    ${p}`);
judgedList.push(
  `the limbs, against the agent body: ${String(dirJudged.filter((l) => l.deg <= l.limit).length)}/${String(dirJudged.length)} links point within their limit (${String(dirMeasured.length)} measured, the arm links turned by prepare), ` +
    `${String(limbs.lengths.filter((x) => x.ok).length)}/${String(limbs.lengths.length)} limbs in proportion, ${String(fleshJudged.filter((l) => l.flesh > 0).length)}/${String(fleshJudged.length)} limb joints carry their flesh ahead of them, ` +
    `and ${String(endsJudged.filter((e) => e.ok).length)}/${String(endsJudged.length)} chain ends move the agent's way at attack t = 0.5`,
);
modelRest();
agentRest();

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
  verdict(failures.length === 0);
  if (failures.length > 0) {
    console.log(`\nFAIL — ${String(failures.length)} assertion(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
  // Only what was judged (the rotation columns hold by construction and are not a finding).
  console.log(`\nOK — ${slug}: every assertion above held —\n  ${judgedList.join(';\n  ')}.`);
  console.log(`  How it looks is the previews' to show (${PREVIEW ? `personal/models/${slug}/preview/` : 'not rendered: --no-preview'}).`);
  process.exit(0);
}

/**
 * **The verdict, beside the model** (D194): what the dev route's index reads
 * before it will load `model.glb`. It names the bytes it judged, so a model
 * prepared again since is not loaded on an old pass.
 */
function verdict(ok) {
  const bytes = readFileSync(modelPath);
  const record = {
    _what: 'Written by tools/personal/check.mjs. PERSONAL USE ONLY (D190). The dev route loads model.glb only when ok is true and model.sha256 is the file on disk (D194).',
    version: 1,
    slug,
    ok,
    date: new Date().toISOString(),
    model: { bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') },
    previews: PREVIEW,
    failures,
    judged: judgedList,
  };
  writeFileSync(insideSlug(slug, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
}

// ---------------------------------------------------------------------------

async function previews() {
  // The page is answered from memory and every answer is `no-store`: check.mjs
  // writes nothing outside the slug's folder, and nothing the browser is handed
  // may be kept by it.
  const html = page();
  const clipJson = new Map([...retargeted].map(([label, clip]) => [`/clip/${label}.json`, JSON.stringify(THREE.AnimationClip.toJSON(clip))]));
  const threeDir = join(WEB, 'node_modules/three');
  const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.glb': 'model/gltf-binary' };
  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${String(PORT)}`);
    const send = (type, body) => {
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(body);
    };
    if (url.pathname === '/' || url.pathname === '/index.html') return send('text/html', html);
    if (clipJson.has(url.pathname)) return send('application/json', clipJson.get(url.pathname));
    let file = null;
    if (url.pathname === '/model.glb') file = modelPath;
    else if (url.pathname.startsWith('/three/')) {
      const p = normalize(join(threeDir, decodeURIComponent(url.pathname.slice('/three/'.length))));
      if (p.startsWith(threeDir + sep)) file = p;
    }
    if (file === null || !existsSync(file)) {
      res.writeHead(404, { 'cache-control': 'no-store' });
      res.end();
      return;
    }
    send(types[extname(file)] ?? 'application/octet-stream', readFileSync(file));
  });
  await new Promise((ok, bad) => {
    server.once('error', bad);
    server.listen(PORT, '127.0.0.1', ok);
  });
  // The browser's profile lives INSIDE the slug's folder for the run, and is
  // deleted after it (a profile under var/ once kept a 2.3 MB copy of model.glb
  // in its HTTP cache); the disk cache is also sized to nothing. Chromium's own
  // net log is written into it and read back before it goes: every request the
  // browser made must have been to 127.0.0.1.
  const profile = insideSlug(slug, '.preview-profile');
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const netLog = join(profile, 'netlog.json');
  const gpuFlags = { swiftshader: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], gl: ['--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu'] }[GPU];
  const chromium = spawn(
    opt('chromium', 'chromium'),
    [
      '--headless=new',
      ...gpuFlags,
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--remote-debugging-port=${String(CDP_PORT)}`,
      '--window-size=900,900',
      `--user-data-dir=${profile}`,
      '--disk-cache-size=1',
      '--media-cache-size=1',
      // No network but the loopback: no background services, no component or
      // spellcheck downloads, and every host name resolves to nothing.
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-sync',
      '--disable-domain-reliability',
      '--disable-client-side-phishing-detection',
      '--disable-breakpad',
      '--metrics-recording-only',
      '--no-first-run',
      '--no-default-browser-check',
      '--no-proxy-server',
      // AimServerRequestOnStartupEnabled: the omnibox's AI-mode eligibility
      // request (www.google.com/async/folae) — without it off, the HTTP cache
      // keyed a google.com entry even though the resolver answered "not found".
      '--disable-features=SpellcheckService,OptimizationHints,Translate,MediaRouter,AutofillServerCommunication,CertificateTransparencyComponentUpdater,NetworkTimeServiceQuerying,AimServerRequestOnStartupEnabled',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--incognito',
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
      `--log-net-log=${netLog}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let chromiumErr = '';
  chromium.stderr.on('data', (b) => (chromiumErr += String(b)));
  const exited = new Promise((ok) => chromium.once('exit', () => ok(true)));
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
      await Promise.race([exited, sleep(10000)]);
      closer.close();
    } catch {
      /* already gone */
    }
    if (chromium.exitCode === null && chromium.signalCode === null) {
      chromium.kill('SIGTERM'); // the one process this script started
      await Promise.race([exited, sleep(5000)]);
    }
    server.close();
    let net = null;
    try {
      net = netLogReport(readFileSync(netLog, 'utf8'));
    } catch (err) {
      failures.push(`preview: Chromium's net log could not be read (${err.message}), so "no network" is not proven`);
    }
    // What the profile kept, read before it goes: the HTTP cache's entry files,
    // and any file holding a copy of the model (three 64-byte cuts of its binary chunk).
    const glb = readFileSync(modelPath);
    const binAt = 20 + glb.readUInt32LE(12) + 8;
    const samples = [0.25, 0.5, 0.75].map((f) => glb.subarray(binAt + Math.floor(f * (glb.length - binAt - 64)), binAt + Math.floor(f * (glb.length - binAt - 64)) + 64));
    const kept = profileReport(profile, { samples, skip: [netLog] });
    rmSync(profile, { recursive: true, force: true });
    console.log(
      `   profile (read before it is deleted): ${String(kept.files)} files, ${(kept.bytes / 1e6).toFixed(2)} MB; HTTP cache entry files left ${String(kept.cacheFiles.length)}; files holding a copy of model.glb ${String(kept.copies.length)}${kept.copies.length > 0 ? ` (${kept.copies.join(', ')})` : ''}`,
    );
    if (kept.copies.length > 0) failures.push(`preview: the browser's profile kept a copy of model.glb: ${kept.copies.join(', ')}`);
    if (net !== null) {
      const tried = [...net.attempted].map(([h, n]) => `${h} ×${String(n)}`).join(', ');
      console.log(
        `   network (Chromium's own net log): ${String(net.loopback)} requests to 127.0.0.1; ${tried === '' ? 'no other request' : `background requests Chromium tried, each answered "not found" by the resolver rule before any DNS query: ${tried}`}; ` +
          `${String(net.dnsQueries)} DNS queries; TCP connections beyond the loopback ${String(net.tcpAway.length)}; UDP sockets beyond it ${String(net.udpAway.length)}${net.udpAway.length > 0 ? ` (${[...new Set(net.udpAway)].join(', ')} — connect() only, the resolver's IPv6-reachability probe)` : ''}, bytes sent on one ${String(net.sentAway.length)}. The profile (${relative(REPO, profile)}/) is deleted.`,
      );
      if (net.tcpAway.length > 0) failures.push(`preview: the browser opened a TCP connection beyond the loopback: ${net.tcpAway.join(', ')}`);
      if (net.sentAway.length > 0) failures.push(`preview: the browser sent bytes beyond the loopback: ${net.sentAway.join(', ')}`);
      if (net.dnsQueries > 0) failures.push(`preview: the browser made ${String(net.dnsQueries)} DNS queries (the resolver rule should answer every name)`);
      if (net.answered.length > 0) failures.push(`preview: a request beyond the loopback was answered: ${net.answered.join(', ')}`);
      console.log(
        `   HTTP cache (Chromium's own net log): ${String(net.cacheEntries)} entries keyed, by host: ${[...net.cacheHosts].map(([h, n]) => `${h} ×${String(n)}`).join(', ') || 'none'}`,
      );
      if (net.cacheAway.length > 0) failures.push(`preview: the browser's HTTP cache keyed an entry for a host beyond the loopback: ${net.cacheAway.join(', ')}`);
      judgedList.push(
        `the preview browser opened no TCP connection, sent no byte and made no DNS query beyond 127.0.0.1, its HTTP cache keyed ${String(net.cacheEntries)} entries, all for 127.0.0.1, and its profile held no copy of model.glb before it was deleted`,
      );
    }
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
