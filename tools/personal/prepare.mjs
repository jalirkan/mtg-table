#!/usr/bin/env node
/*
 * mtg-table — tools/personal/prepare.mjs
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The personal tier, step 2: make a downloaded rig a figure the arena can
 * drive** (D190, D191; `docs/guides/personal-tier.md` is the manual).
 *
 *   node tools/personal/prepare.mjs <slug> [--budget 6000] [--pose t|none]
 *        [--map auto|<bones.json>] [--cloak-to <our joint>] [--height <m>]
 *        [--drop <regex>]… [--bind <regex>=<our joint>]…
 *        [--card "<card name>"]… [--seat you|opp]…
 *   node tools/personal/prepare.mjs doctor-doom --card "Doctor Doom" --seat opp
 *
 * It reads `personal/models/<slug>/source/` (import.mjs unpacked it) and writes
 * ONLY `personal/models/<slug>/model.glb` and `manifest.json` (every path goes
 * through `insideSlug`; its scratch file lives in the same folder and is deleted).
 * D191 is the decision; in order:
 *
 *  1. **Strip** every rig control mesh and every node that draws nothing: the
 *     scene becomes `<slug>` → { `<slug>-body` (one skinned mesh, a primitive
 *     per part), `root` → our 22 joints } — the shape of `figures.glb`'s `agent`.
 *  2. **Map** the skeleton onto OUR retarget table, the 22 joints
 *     `tools/build-figures.mjs` drives (`tools/assets-manifest.json`
 *     `rigs.ubc.retarget.joints`): auto-detected from the joint names (Auto-Rig
 *     Pro, Mixamo, Unreal, VRM, Character Creator — `lib.mjs`'s CONVENTIONS),
 *     `personal/models/<slug>/bones.json` when it exists, or `--map <file>`. The
 *     skeleton is REBUILT on our names, not driven through the source's own
 *     hierarchy: Auto-Rig Pro exports its deform bones hanging from the rig's
 *     root, so rotating the shoulder would move no arm. Every weighted source
 *     joint is merged into one of ours — its map list first, then its nearest
 *     mapped ancestor (the fingers into the hand), then the nearest of our
 *     segments by position — and every placement is written down. Each joint
 *     keeps the source's POSITION (the pelvis sits between the two thigh
 *     pivots) and takes OUR bind rotation from `figures.glb`'s `agent`, so the
 *     world-space-delta retarget of the build is the identity on rotations.
 *  3. **Re-pose A → T** (`--pose t`, the default): each upper arm, then each
 *     forearm, is turned about its own joint onto the direction `agent`'s bone
 *     has in its T bind pose; the vertices are baked through their skin
 *     (linear blend, the same sum the renderer does), and the inverse bind
 *     matrices are written from the new pose — so at rest the model draws
 *     exactly the baked mesh, now in T. The angle is measured before and after.
 *  4. **Skin what has no skin**: a mesh with no skin (Doom's cloak) is bound by
 *     HEIGHT to our spine — above `spine_03` all `spine_03`, between `spine_02`
 *     and `spine_03` a linear blend, between `pelvis` and `spine_02` a linear
 *     blend, below the pelvis all `pelvis` — or wholly to `--cloak-to <joint>`.
 *     A mesh parented under a joint is bound rigidly to that joint's segment,
 *     and `--bind <regex>=<joint>` binds a named part wholly to one joint (the
 *     Wasp's wings to `spine_03`). `--drop <regex>` leaves a render mesh out
 *     (a base plane, a shadow disc, Character Creator's eye-occlusion layers).
 *  5. **Normalise**: +Y up, facing +Z (the character's left at +x — D81), feet
 *     at y = 0, the pelvis over the origin, and scaled to `--height` (default:
 *     `agent`'s own bind height from `models.json`, so the clips' hip
 *     translation needs no second scale).
 *  6. **Decimate** to `--budget` triangles with meshopt's simplifier — the copy
 *     nested under `@gltf-transform/cli`, the one `build-figures.mjs` uses — each
 *     part simplified with its normals and UVs as attributes (so seams and
 *     shading hold) and collapsing onto EXISTING vertices, so every survivor
 *     keeps its skin weights and UVs exactly. Parts under 300 triangles are kept
 *     whole; the rest share what is left in proportion.
 *  7. **Textures**: base colour and normal kept (a larger one downscaled to fit
 *     1024 with the `sharp` the CLI already carries); every other texture slot is
 *     dropped and named in the manifest.
 *  8. **meshopt LAST** (`gltf-transform meshopt`, the Tier 2 trap: nothing after it).
 *
 * The manifest (`lib.mjs`'s `validateManifest` is its schema) records what it
 * dresses, the source's bytes and sha256, the credit line, the rig map used and
 * how every joint was placed, the triangle counts, the pose fix and both angles,
 * what was skinned and how, the textures kept, and what was dropped.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import {
  armAngles,
  BY_POSITION_LIMIT,
  controlReason,
  CORE_JOINTS,
  detectRigMap,
  findSourceModel,
  GLTF,
  heightWeights,
  GLTF_FUNCTIONS,
  insideSlug,
  inspectDocument,
  m4,
  MANIFEST_VERSION,
  OUR_JOINTS,
  OUR_PARENT,
  personalIO,
  rawJsonOf,
  readDocument,
  REPO,
  restVertexData,
  round,
  SEATS,
  skinAtRest,
  slugDir,
  THREE,
  trianglesOf,
  validateManifest,
  vrmHumanBonesOf,
  WEB,
  weightedJoints,
} from './lib.mjs';

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const slug = argv[0];
if (!slug || slug.startsWith('--')) {
  console.error(
    'usage: node tools/personal/prepare.mjs <slug> [--budget 6000] [--pose t|none] [--map auto|<file>] [--cloak-to <joint>] [--height <m>] [--drop <regex>]… [--bind <regex>=<joint>]… [--card "<name>"]… [--seat you|opp]…',
  );
  process.exit(2);
}
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};
const many = (name) => argv.flatMap((a, i) => (a === `--${name}` && argv[i + 1] !== undefined ? [argv[i + 1]] : []));
const BUDGET = Number(opt('budget', '6000'));
const POSE = opt('pose', 't');
const MAP = opt('map', 'auto');
const CLOAK_TO = opt('cloak-to', null);
/** `--drop <regex>`: render meshes to leave out (a base plane, a shadow disc, eye-occlusion layers). */
const DROP = many('drop').map((r) => new RegExp(r, 'i'));
/** `--bind <regex>=<our joint>`: an unskinned part bound wholly to one joint (a pair of wings to spine_03). */
const BIND = many('bind').map((spec) => {
  const at = spec.lastIndexOf('=');
  if (at <= 0) fail(`--bind wants <regex>=<our joint>, got "${spec}"`);
  const joint = spec.slice(at + 1);
  if (!OUR_JOINTS.includes(joint)) fail(`--bind ${spec}: "${joint}" is not one of our joints`);
  return { pattern: new RegExp(spec.slice(0, at), 'i'), joint };
});
const dir = slugDir(slug);
if (!Number.isInteger(BUDGET) || BUDGET < 500) fail('--budget must be a whole number of triangles, at least 500');
if (!['t', 'none'].includes(POSE)) fail('--pose must be t or none');
if (CLOAK_TO !== null && !OUR_JOINTS.includes(CLOAK_TO)) fail(`--cloak-to must be one of our joints: ${OUR_JOINTS.join(', ')}`);
for (const seat of many('seat')) if (!SEATS.includes(seat)) fail(`--seat must be one of ${SEATS.join(', ')}`);
/** Parts smaller than this are kept whole by the decimator (pins, a buckle, a rope). */
const KEEP_WHOLE = 300;

function fail(message) {
  console.error(`prepare: ${message}`);
  process.exit(1);
}

const sourceModel = findSourceModel(join(dir, 'source'));
if (sourceModel === null) fail(`no model under ${relative(REPO, join(dir, 'source'))}/ — run tools/personal/import.mjs first`);
const inspectPath = join(dir, 'inspect.json');
const inspected = existsSync(inspectPath) ? JSON.parse(readFileSync(inspectPath, 'utf8')) : null;
const previous = existsSync(join(dir, 'manifest.json')) ? JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) : null;
const dresses = [...many('card').map((card) => ({ card })), ...many('seat').map((seat) => ({ seat }))];
if (dresses.length === 0 && previous?.dresses) dresses.push(...previous.dresses);
if (dresses.length === 0) fail('say what it dresses: --card "<exact card name>" and/or --seat you|opp');

// ---------------------------------------------------------------------------
// Our rig: the agent's bind pose, from the committed figures.glb
// ---------------------------------------------------------------------------

const io = await personalIO();
const models = JSON.parse(readFileSync(join(WEB, 'src/arena/figures/models.json'), 'utf8'));
const HEIGHT = Number(opt('height', String(models.models.agent.height)));
if (!(HEIGHT > 0.2 && HEIGHT < 5)) fail('--height is in metres, between 0.2 and 5');
const figures = await io.read(join(WEB, 'public/models/figures.glb'));
const agentNode = figures.getRoot().listScenes()[0].listChildren().find((n) => n.getName() === models.models.agent.node);
if (agentNode === undefined) fail('figures.glb has no agent node');
const agentSkin = agentNode.listChildren().find((n) => n.getSkin() !== null)?.getSkin();
/** Our joint → the agent's bind world { position, quaternion } (the agent node is at the origin). */
const AGENT = new Map();
for (const joint of agentSkin.listJoints()) {
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  m4(joint.getWorldMatrix()).decompose(p, q, new THREE.Vector3());
  AGENT.set(joint.getName(), { p, q });
}
for (const j of ['root', ...OUR_JOINTS]) if (!AGENT.has(j)) fail(`figures.glb's agent has no joint "${j}"`);

// ---------------------------------------------------------------------------
// The source
// ---------------------------------------------------------------------------

const originalName = inspected?.original?.file ?? null;
const originalBytes = originalName !== null && existsSync(join(dir, originalName)) ? readFileSync(join(dir, originalName)) : null;
const doc = await readDocument(sourceModel);
const raw = rawJsonOf(sourceModel);
const before = inspectDocument(doc, raw);
const root = doc.getRoot();
const skins = root.listSkins();
if (skins.length === 0) fail('the model has no skin — it is not rigged (the tier retargets rigs; a static model is a different job)');
const weightedBySkin = new Map(skins.map((s) => [s, weightedJoints(doc, s)]));
const skinInfo = new Map(skins.map((s) => [s, skinAtRest(s, weightedBySkin.get(s))]));

// Every joint of every skin, by name (a name used by two skins must be one joint).
const jointByName = new Map();
const bindOf = new Map();
for (const s of skins) {
  const info = skinInfo.get(s);
  s.listJoints().forEach((j, i) => {
    if (!jointByName.has(j.getName())) {
      jointByName.set(j.getName(), j);
      bindOf.set(j.getName(), info.bind[i].clone());
    }
  });
}
const weightedNames = new Set(skins.flatMap((s) => [...weightedBySkin.get(s).keys()]));

// The rig map: bones.json beside the model, --map <file>, or the names.
let mapFile = null;
let mapJson = null;
if (MAP !== 'auto') mapFile = MAP;
else if (existsSync(join(dir, 'bones.json'))) mapFile = join(dir, 'bones.json');
if (mapFile !== null) mapJson = JSON.parse(readFileSync(mapFile, 'utf8'));
const rigMap = detectRigMap([...jointByName.keys()], { vrmHumanBones: vrmHumanBonesOf(raw), file: mapJson });
const missingCore = CORE_JOINTS.filter((j) => rigMap.joints[j].primary === null);
if (missingCore.length > 0) {
  fail(
    `the rig map (${rigMap.label}) found no bone for ${missingCore.join(', ')}.\n` +
      `  Write personal/models/${slug}/bones.json — { "joints": { "<our joint>": "<bone>" | ["<primary>", "<follower>", …] } } —\n` +
      `  naming a bone of this skin for each (inspect.json lists them), and run again.`,
  );
}

/** Every weighted source joint → our joint, and how it was placed. */
const assign = new Map();
const placedBy = new Map(OUR_JOINTS.map((j) => [j, { ancestry: [], position: [] }]));
for (const joint of OUR_JOINTS) {
  const m = rigMap.joints[joint];
  for (const bone of [m.primary, ...m.followers]) if (bone !== null) assign.set(bone, joint);
}

// ---------------------------------------------------------------------------
// The figure transform: +Y up, facing +Z, feet at 0, pelvis over the origin
// ---------------------------------------------------------------------------

const P = new Map(); // our joint → position, in the SOURCE's world space for now
for (const joint of OUR_JOINTS) {
  const primary = rigMap.joints[joint].primary;
  if (primary !== null) P.set(joint, bindOf.get(primary).clone());
}
// The pelvis sits between the two thigh pivots (our clips' hip is there; Auto-Rig
// Pro's root.x sits at the waist).
P.set('pelvis', P.get('thigh_l').clone().add(P.get('thigh_r')).multiplyScalar(0.5));

// The render parts, drawn at rest, in world space.
const parts = [];
const droppedMeshes = [];
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (mesh === null) continue;
  const ancestors = [];
  for (let p = node.getParentNode(); p !== null; p = p.getParentNode()) ancestors.push(p.getName());
  const materials = mesh.listPrimitives().map((pr) => pr.getMaterial()?.getName() ?? null);
  if (controlReason([node.getName(), mesh.getName(), ...materials, ...ancestors]) !== null) continue;
  const names = [node.getName(), mesh.getName(), ...materials, ...ancestors];
  if (DROP.some((re) => names.some((n) => re.test(n ?? '')))) {
    droppedMeshes.push(node.getName());
    continue;
  }
  const skin = node.getSkin();
  let rigid = null;
  if (skin === null) {
    for (let p = node.getParentNode(); p !== null && rigid === null; p = p.getParentNode()) if (jointByName.get(p.getName()) === p) rigid = p.getName();
  }
  for (const prim of mesh.listPrimitives()) {
    if (prim.getMode() !== 4) {
      console.log(`  skip      ${node.getName()}: a mode-${String(prim.getMode())} primitive (not triangles)`);
      continue;
    }
    const data = restVertexData(node, prim, skin === null ? null : skinInfo.get(skin));
    parts.push({ node, prim, skin, rigid, ancestors, data, name: partName(node, ancestors, prim), material: prim.getMaterial()?.getName() ?? null });
  }
}
if (parts.length === 0) fail('nothing to draw once the control shapes are gone');
const partNames = new Set();
for (const part of parts) {
  let name = part.name;
  for (let k = 2; partNames.has(name); k += 1) name = `${part.name}-${String(k)}`;
  part.name = name;
  partNames.add(name);
}

// up: from the feet to the head. A rig lying on its back (a Z-up export) is stood up.
const feet = P.get('foot_l').clone().add(P.get('foot_r')).multiplyScalar(0.5);
const upSource = P.get('Head').clone().sub(feet).normalize();
const R = new THREE.Quaternion();
if (upSource.angleTo(new THREE.Vector3(0, 1, 0)) > Math.PI / 6) {
  R.setFromUnitVectors(upSource, new THREE.Vector3(0, 1, 0));
  console.log(`  up        the head is not above the feet on +Y; the model is stood up (${round((upSource.angleTo(new THREE.Vector3(0, 1, 0)) * 180) / Math.PI, 1)}°)`);
}
const left = P.get('upperarm_l').clone().sub(P.get('upperarm_r')).applyQuaternion(R).setY(0);
const forward = left.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
const yaw = Math.atan2(forward.x, forward.z);
R.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -yaw));
const sourceBox = new THREE.Box3();
const v = new THREE.Vector3();
for (const part of parts) for (let i = 0; i < part.data.positions.length; i += 3) sourceBox.expandByPoint(v.fromArray(part.data.positions, i).applyQuaternion(R));
const sourceHeight = sourceBox.max.y - sourceBox.min.y;
const scale = HEIGHT / sourceHeight;
const pelvisR = P.get('pelvis').clone().applyQuaternion(R);
const F = new THREE.Matrix4().compose(new THREE.Vector3(-pelvisR.x * scale, -sourceBox.min.y * scale, -pelvisR.z * scale), R, new THREE.Vector3(scale, scale, scale));
const FN = new THREE.Matrix3().getNormalMatrix(F);
for (const part of parts) {
  const { positions, normals, tangents } = part.data;
  for (let i = 0; i < positions.length; i += 3) v.fromArray(positions, i).applyMatrix4(F).toArray(positions, i);
  if (normals !== null) for (let i = 0; i < normals.length; i += 3) v.fromArray(normals, i).applyMatrix3(FN).normalize().toArray(normals, i);
  if (tangents !== null) for (let i = 0; i < tangents.length; i += 4) v.fromArray(tangents, i).transformDirection(F).toArray(tangents, i);
}
for (const [joint, p] of P) P.set(joint, p.applyMatrix4(F));
const allBind = new Map([...bindOf].map(([n, p]) => [n, p.clone().applyMatrix4(F)]));

// Our joints the source lacks, synthesised between their neighbours.
const synthesised = [];
const lerp = (a, b, t) => P.get(a).clone().lerp(P.get(b), t);
const synth = (joint, make) => {
  if (P.has(joint)) return;
  P.set(joint, make());
  synthesised.push(joint);
};
synth('spine_02', () => (P.has('spine_01') && P.has('spine_03') ? lerp('spine_01', 'spine_03', 0.5) : lerp('pelvis', 'Head', 0.45)));
synth('spine_01', () => lerp('pelvis', 'spine_02', 0.5));
synth('spine_03', () => lerp('spine_02', 'Head', 0.45));
synth('neck_01', () => lerp('spine_03', 'Head', 0.6));
for (const s of ['l', 'r']) {
  synth(`clavicle_${s}`, () => lerp('neck_01', `upperarm_${s}`, 0.25));
  synth(`ball_${s}`, () => P.get(`foot_${s}`).clone().add(new THREE.Vector3(0, -P.get(`foot_${s}`).y * 0.7, 0.07 * HEIGHT)));
}

// Weighted joints no map list names: nearest mapped ancestor, else nearest segment.
const segmentDistance = (joint, p) => {
  const a = P.get(joint);
  const child = OUR_JOINTS.find((j) => OUR_PARENT[j] === joint);
  if (child === undefined) return a.distanceTo(p);
  const b = P.get(child);
  const ab = b.clone().sub(a);
  const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / Math.max(1e-9, ab.lengthSq())));
  return a.clone().addScaledVector(ab, t).distanceTo(p);
};
const placeByPosition = (name) => {
  const p = allBind.get(name);
  let best = 'pelvis';
  let bestD = Infinity;
  for (const joint of OUR_JOINTS) {
    const d = segmentDistance(joint, p);
    if (d < bestD) {
      bestD = d;
      best = joint;
    }
  }
  return best;
};
for (const name of weightedNames) {
  if (assign.has(name)) continue;
  // The nearest ancestor a map list names (a finger's hand). Only a LISTED bone
  // counts: a bone placed by position is no evidence for its children.
  const listed = new Set(OUR_JOINTS.flatMap((j) => [rigMap.joints[j].primary, ...rigMap.joints[j].followers]).filter(Boolean));
  let placed = null;
  for (let p = jointByName.get(name).getParentNode(); p !== null && placed === null; p = p.getParentNode()) {
    if (listed.has(p.getName())) placed = assign.get(p.getName());
  }
  if (placed !== null) {
    assign.set(name, placed);
    placedBy.get(placed).ancestry.push(name);
  } else {
    const joint = placeByPosition(name);
    assign.set(name, joint);
    placedBy.get(joint).position.push(name);
  }
}

// How much of the skin weight the map placed, and how much was placed by guess
// (check.mjs fails a body with more than BY_POSITION_LIMIT of it by position).
const sourceWeight = new Map();
for (const s of skins) for (const [name, st] of weightedBySkin.get(s)) sourceWeight.set(name, (sourceWeight.get(name) ?? 0) + st.weight);
const totalSourceWeight = [...sourceWeight.values()].reduce((a, w) => a + w, 0);
const byPositionNames = OUR_JOINTS.flatMap((j) => placedBy.get(j).position);
const placement = {
  byAncestry: OUR_JOINTS.reduce((a, j) => a + placedBy.get(j).ancestry.length, 0),
  byPosition: byPositionNames.length,
  byPositionWeight: round(byPositionNames.reduce((a, n) => a + (sourceWeight.get(n) ?? 0), 0) / Math.max(1e-12, totalSourceWeight), 6),
};
const unweightedPrimaries = OUR_JOINTS.filter((j) => rigMap.joints[j].primary !== null && !weightedNames.has(rigMap.joints[j].primary));

// ---------------------------------------------------------------------------
// Weights on OUR joints (index 0 is `root`, 1.. are OUR_JOINTS)
// ---------------------------------------------------------------------------

const OUT_JOINTS = ['root', ...OUR_JOINTS];
const INDEX = new Map(OUT_JOINTS.map((j, i) => [j, i]));
const skinnedParts = [];
for (const part of parts) {
  const count = part.data.positions.length / 3;
  const joints = new Uint8Array(count * 4);
  const weights = new Float32Array(count * 4);
  const acc = new Float32Array(OUT_JOINTS.length);
  if (part.skin !== null) {
    const names = part.skin.listJoints().map((j) => j.getName());
    const J = [part.prim.getAttribute('JOINTS_0'), part.prim.getAttribute('JOINTS_1')];
    const W = [part.prim.getAttribute('WEIGHTS_0'), part.prim.getAttribute('WEIGHTS_1')];
    const j = [0, 0, 0, 0];
    const w = [0, 0, 0, 0];
    for (let i = 0; i < count; i += 1) {
      acc.fill(0);
      for (let set = 0; set < 2; set += 1) {
        if (J[set] === null || W[set] === null) continue;
        J[set].getElement(i, j);
        W[set].getElement(i, w);
        for (let k = 0; k < 4; k += 1) {
          if (!(w[k] > 0)) continue;
          const ours = assign.get(names[j[k]]) ?? placeByPosition(names[j[k]]);
          acc[INDEX.get(ours)] += w[k];
        }
      }
      topFour(acc, joints, weights, i);
    }
  } else {
    const partNames = [part.name, part.node.getName(), part.material ?? '', ...part.ancestors];
    const bound = BIND.find((b) => partNames.some((n) => b.pattern.test(n)));
    const rule =
      bound !== undefined
        ? `joint:${bound.joint}`
        : CLOAK_TO !== null
          ? `joint:${CLOAK_TO}`
          : part.rigid !== null
            ? `rigid:${assign.get(part.rigid) ?? placeByPosition(part.rigid)}`
            : 'height:spine_03/spine_02/pelvis';
    for (let i = 0; i < count; i += 1) {
      acc.fill(0);
      if (rule.startsWith('joint:') || rule.startsWith('rigid:')) acc[INDEX.get(rule.slice(rule.indexOf(':') + 1))] = 1;
      else heightRule(part.data.positions[i * 3 + 1], acc);
      topFour(acc, joints, weights, i);
    }
    skinnedParts.push({ part: part.name, material: part.material, rule, vertices: count });
  }
  part.joints = joints;
  part.weights = weights;
}

/** The cloak rule (D191, `lib.mjs`'s `heightWeights`): above spine_03 → spine_03; spine_02..spine_03 and pelvis..spine_02 blend linearly; below the pelvis → pelvis. */
function heightRule(y, acc) {
  const weights = heightWeights(y, { pelvis: P.get('pelvis').y, spine_02: P.get('spine_02').y, spine_03: P.get('spine_03').y });
  for (const [joint, w] of Object.entries(weights)) acc[INDEX.get(joint)] = w;
}

/** The four largest influences, renormalised (a vertex with none is bound to the pelvis). */
function topFour(acc, joints, weights, i) {
  const order = [...acc.keys()].filter((k) => acc[k] > 1e-6).sort((a, b) => acc[b] - acc[a]).slice(0, 4);
  if (order.length === 0) order.push(INDEX.get('pelvis'));
  const total = order.reduce((s, k) => s + (acc[k] > 1e-6 ? acc[k] : 1), 0);
  order.forEach((k, n) => {
    joints[i * 4 + n] = k;
    weights[i * 4 + n] = (acc[k] > 1e-6 ? acc[k] : 1) / total;
  });
}

// ---------------------------------------------------------------------------
// A → T: turn each arm onto the agent's bind direction, and bake it
// ---------------------------------------------------------------------------

const poseBefore = armAngles(Object.fromEntries([...P].map(([j, p]) => [j, p.toArray()])));
const delta = new Map(OUT_JOINTS.map((j) => [j, new THREE.Matrix4()]));
const turns = {};
if (POSE === 't') {
  for (const s of ['l', 'r']) {
    const chain = [`upperarm_${s}`, `lowerarm_${s}`, `hand_${s}`];
    for (let k = 0; k < 2; k += 1) {
      const joint = chain[k];
      const child = chain[k + 1];
      const have = P.get(child).clone().sub(P.get(joint)).normalize();
      const want = AGENT.get(child).p.clone().sub(AGENT.get(joint).p).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(have, want);
      const pivot = P.get(joint).clone();
      const M = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
      for (const moved of chain.slice(k)) {
        delta.get(moved).premultiply(M);
        if (moved !== joint) P.get(moved).applyMatrix4(M);
      }
      turns[joint] = round((2 * Math.acos(Math.min(1, Math.abs(q.w))) * 180) / Math.PI, 1);
    }
  }
  const D = OUT_JOINTS.map((j) => delta.get(j));
  const isMoved = D.map((d) => !d.equals(new THREE.Matrix4()));
  const blend = new THREE.Matrix4();
  const B = new THREE.Matrix3();
  for (const part of parts) {
    const { positions, normals, tangents } = part.data;
    for (let i = 0; i < positions.length / 3; i += 1) {
      const el = blend.elements;
      el.fill(0);
      let moved = false;
      for (let n = 0; n < 4; n += 1) {
        const w = part.weights[i * 4 + n];
        if (w <= 0) continue;
        const d = D[part.joints[i * 4 + n]];
        if (isMoved[part.joints[i * 4 + n]]) moved = true;
        for (let e = 0; e < 16; e += 1) el[e] += w * d.elements[e];
      }
      if (!moved) continue;
      v.fromArray(positions, i * 3).applyMatrix4(blend).toArray(positions, i * 3);
      B.getNormalMatrix(blend);
      if (normals !== null) v.fromArray(normals, i * 3).applyMatrix3(B).normalize().toArray(normals, i * 3);
      if (tangents !== null) v.fromArray(tangents, i * 4).transformDirection(blend).toArray(tangents, i * 4);
    }
  }
}
const poseAfter = armAngles(Object.fromEntries([...P].map(([j, p]) => [j, p.toArray()])));

// ---------------------------------------------------------------------------
// The new document: <slug> → { parts…, root → our joints }
// ---------------------------------------------------------------------------

const scene = root.listScenes()[0] ?? doc.createScene('Scene');
for (const s of root.listScenes()) for (const child of s.listChildren()) s.removeChild(child);
for (const s of root.listScenes()) if (s !== scene) s.dispose();
const buffer = root.listBuffers()[0] ?? doc.createBuffer();
const modelNode = doc.createNode(slug);
scene.addChild(modelNode);

/** Our joint → its bind world matrix: the source's position, OUR rotation. */
const WORLD = new Map(OUT_JOINTS.map((j) => [j, new THREE.Matrix4().compose(j === 'root' ? new THREE.Vector3() : P.get(j), AGENT.get(j).q, new THREE.Vector3(1, 1, 1))]));
const jointNodes = new Map();
for (const joint of OUT_JOINTS) {
  const parent = joint === 'root' ? null : OUR_PARENT[joint];
  const local = parent === null ? WORLD.get(joint).clone() : WORLD.get(parent).clone().invert().multiply(WORLD.get(joint));
  const t = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  local.decompose(t, q, s);
  const node = doc.createNode(joint).setTranslation(t.toArray()).setRotation(q.toArray());
  jointNodes.set(joint, node);
  (parent === null ? modelNode : jointNodes.get(parent)).addChild(node);
}
const ibm = new Float32Array(OUT_JOINTS.length * 16);
OUT_JOINTS.forEach((j, i) => WORLD.get(j).clone().invert().toArray(ibm, i * 16));
const skinOut = doc.createSkin(`${slug}-skin`).setSkeleton(jointNodes.get('root')).setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buffer));
for (const j of OUT_JOINTS) skinOut.addJoint(jointNodes.get(j));

// ONE mesh, a primitive per part (per material), under one node — the shape of
// the agent's body. Separate mesh nodes would each be quantized by meshopt with
// a transform of their own, and each would then need a copy of the skin.
const bodyMesh = doc.createMesh(`${slug}-body`);
modelNode.addChild(doc.createNode(`${slug}-body`).setMesh(bodyMesh).setSkin(skinOut));
const droppedSlots = [];
for (const part of parts) {
  const material = part.prim.getMaterial();
  const texCoords = new Set([0]);
  if (material !== null) {
    for (const [slot, get, set] of [
      ['metallicRoughness', 'getMetallicRoughnessTexture', 'setMetallicRoughnessTexture'],
      ['occlusion', 'getOcclusionTexture', 'setOcclusionTexture'],
      ['emissive', 'getEmissiveTexture', 'setEmissiveTexture'],
    ]) {
      if (material[get]() !== null) {
        droppedSlots.push(`${material.getName()}.${slot}`);
        material[set](null);
      }
    }
    for (const info of [material.getBaseColorTextureInfo(), material.getNormalTextureInfo()]) if (info !== null) texCoords.add(info.getTexCoord());
  }
  const prim = doc
    .createPrimitive()
    .setMaterial(material)
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(part.data.positions).setBuffer(buffer))
    .setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(part.joints).setBuffer(buffer))
    .setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(part.weights).setBuffer(buffer));
  if (part.data.normals !== null) prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(part.data.normals).setBuffer(buffer));
  if (part.data.tangents !== null) prim.setAttribute('TANGENT', doc.createAccessor().setType('VEC4').setArray(part.data.tangents).setBuffer(buffer));
  for (const n of texCoords) {
    const uv = part.prim.getAttribute(`TEXCOORD_${String(n)}`);
    if (uv !== null) prim.setAttribute(`TEXCOORD_${String(n)}`, doc.createAccessor().setType('VEC2').setArray(Float32Array.from(readAll(uv))).setBuffer(buffer));
  }
  const indices = part.prim.getIndices();
  const index = indices !== null ? Uint32Array.from(indices.getArray()) : Uint32Array.from({ length: part.data.positions.length / 3 }, (_, i) => i);
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(index).setBuffer(buffer));
  bodyMesh.addPrimitive(prim);
  part.out = prim;
}

// Everything the old scene held and the new one does not reference goes.
const nodesBefore = before.nodes.total;
await doc.transform(GLTF_FUNCTIONS.prune({ keepAttributes: true, keepLeaves: false }));

// ---------------------------------------------------------------------------
// Decimate to the budget
// ---------------------------------------------------------------------------

const { MeshoptSimplifier } = await import(
  pathToFileURL(createRequire(join(WEB, 'node_modules/@gltf-transform/cli/package.json')).resolve('meshoptimizer')).href
);
await MeshoptSimplifier.ready;
const renderTriangles = parts.reduce((a, p) => a + trianglesOf(p.out), 0);
const decimation = [];
if (renderTriangles > BUDGET) {
  const whole = parts.filter((p) => trianglesOf(p.out) < KEEP_WHOLE);
  const cut = parts.filter((p) => trianglesOf(p.out) >= KEEP_WHOLE);
  const kept = whole.reduce((a, p) => a + trianglesOf(p.out), 0);
  const cutTotal = cut.reduce((a, p) => a + trianglesOf(p.out), 0);
  const share = Math.max(0, BUDGET - kept) / Math.max(1, cutTotal);
  for (const part of whole) decimation.push({ part: part.name, material: part.material, before: trianglesOf(part.out), after: trianglesOf(part.out), kept: true });
  for (const part of cut) {
    const target = Math.max(12, Math.floor(trianglesOf(part.out) * share));
    decimation.push({ part: part.name, material: part.material, before: trianglesOf(part.out), after: simplify(part.out, target), kept: false });
  }
  // meshopt may stop a little above a target (a seam it will not break); take the excess off the largest part.
  for (let round_ = 0; round_ < 6; round_ += 1) {
    const total = parts.reduce((a, p) => a + trianglesOf(p.out), 0);
    if (total <= BUDGET) break;
    const largest = [...cut].sort((a, b) => trianglesOf(b.out) - trianglesOf(a.out))[0];
    const row = decimation.find((d) => d.part === largest.name);
    row.after = simplify(largest.out, trianglesOf(largest.out) - (total - BUDGET) - 8);
  }
}
const afterTriangles = parts.reduce((a, p) => a + trianglesOf(p.out), 0);
if (afterTriangles > BUDGET) fail(`decimation stopped at ${String(afterTriangles)} triangles, over the ${String(BUDGET)} budget`);

/**
 * meshopt's simplifier with the part's normals and UVs as attributes, locked to
 * nothing, error unconstrained (the triangle count is the budget line, as in the
 * build). Returns the triangles after.
 */
function simplify(prim, target) {
  const indices = prim.getIndices();
  const position = Float32Array.from(readAll(prim.getAttribute('POSITION')));
  const count = position.length / 3;
  const normal = prim.getAttribute('NORMAL');
  const uv = prim.getAttribute('TEXCOORD_0');
  const stride = (normal !== null ? 3 : 0) + (uv !== null ? 2 : 0);
  const attributes = new Float32Array(Math.max(1, count * stride));
  const weights = [...(normal !== null ? [0.25, 0.25, 0.25] : []), ...(uv !== null ? [0.5, 0.5] : [])];
  if (stride > 0) {
    const n = normal !== null ? readAll(normal) : null;
    const t = uv !== null ? readAll(uv) : null;
    for (let i = 0; i < count; i += 1) {
      let o = i * stride;
      if (n !== null) for (let k = 0; k < 3; k += 1) attributes[o++] = n[i * 3 + k];
      if (t !== null) for (let k = 0; k < 2; k += 1) attributes[o++] = t[i * 2 + k];
    }
  }
  const [dst] =
    stride > 0
      ? MeshoptSimplifier.simplifyWithAttributes(Uint32Array.from(indices.getArray()), position, 3, attributes, stride, weights, null, Math.floor(target) * 3, 1, [])
      : MeshoptSimplifier.simplify(Uint32Array.from(indices.getArray()), position, 3, Math.floor(target) * 3, 1, []);
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(dst)).setBuffer(buffer));
  if (indices.listParents().length <= 1) indices.dispose();
  GLTF_FUNCTIONS.compactPrimitive(prim);
  return trianglesOf(prim);
}

function readAll(accessor) {
  const size = accessor.getElementSize();
  const out = new Float32Array(accessor.getCount() * size);
  const el = new Array(size).fill(0);
  for (let i = 0; i < accessor.getCount(); i += 1) {
    accessor.getElement(i, el);
    for (let k = 0; k < size; k += 1) out[i * size + k] = el[k];
  }
  return out;
}

for (const part of parts) {
  const idx = part.out.getIndices();
  if (part.out.getAttribute('POSITION').getCount() <= 65534 && !(idx.getArray() instanceof Uint16Array)) idx.setArray(new Uint16Array(idx.getArray()));
}

// ---------------------------------------------------------------------------
// Textures: base colour and normal, no larger than 1024
// ---------------------------------------------------------------------------

// Doom's cloak carries a byte-identical copy of the hood's base colour: one image is enough.
await doc.transform(
  GLTF_FUNCTIONS.dedup({ propertyTypes: [GLTF.PropertyType.TEXTURE, GLTF.PropertyType.ACCESSOR] }),
  GLTF_FUNCTIONS.prune({ keepAttributes: true }),
);
const sharp = createRequire(join(WEB, 'package.json'))('sharp');
const textures = [];
for (const texture of doc.getRoot().listTextures()) {
  const slots = new Set();
  for (const m of doc.getRoot().listMaterials()) {
    if (m.getBaseColorTexture() === texture) slots.add('baseColor');
    if (m.getNormalTexture() === texture) slots.add('normal');
  }
  let image = texture.getImage();
  let size = GLTF.ImageUtils.getSize(image, texture.getMimeType());
  let downscaled = false;
  if (size !== null && (size[0] > 1024 || size[1] > 1024)) {
    const format = texture.getMimeType() === 'image/jpeg' ? 'jpeg' : texture.getMimeType() === 'image/webp' ? 'webp' : 'png';
    image = new Uint8Array(await sharp(Buffer.from(image)).resize(1024, 1024, { fit: 'inside' }).toFormat(format).toBuffer());
    texture.setImage(image);
    size = GLTF.ImageUtils.getSize(image, texture.getMimeType());
    downscaled = true;
  }
  for (const slot of slots) textures.push({ name: basename(texture.getURI() || texture.getName() || 'texture'), slot, size, bytes: image.byteLength, downscaled });
}

// ---------------------------------------------------------------------------
// Write: a scratch .glb in the folder, then meshopt LAST into model.glb
// ---------------------------------------------------------------------------

const scratch = insideSlug(slug, '.prepare-scratch');
rmSync(scratch, { recursive: true, force: true });
mkdirSync(scratch, { recursive: true });
const unpacked = insideSlug(slug, '.prepare-scratch/unpacked.glb');
writeFileSync(unpacked, await io.writeBinary(doc));
const out = insideSlug(slug, 'model.glb');
const CLI = join(WEB, 'node_modules/.bin/gltf-transform');
const cliOut = execFileSync(CLI, ['meshopt', unpacked, out], { encoding: 'utf8' });
rmSync(scratch, { recursive: true, force: true });
console.log(`  meshopt   ${cliOut.trim().split('\n').filter((l) => l.includes('→')).pop() ?? ''}`.trimEnd());

// ---------------------------------------------------------------------------
// Read it back, measure it, write the manifest
// ---------------------------------------------------------------------------

const result = await io.read(out);
const afterInspect = inspectDocument(result, rawJsonOf(out));
const bytesOut = readFileSync(out).byteLength;
if (afterInspect.skins.length !== 1 || afterInspect.skins[0].joints !== OUT_JOINTS.length) fail('the written model does not carry exactly our skeleton');
if (afterInspect.flags.unskinnedMeshes.length > 0) fail('the written model still has an unskinned mesh');
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const extras = before.asset.extras ?? {};
const sourceTxt = existsSync(join(dir, 'SOURCE.txt')) ? 'SOURCE.txt' : null;
const credits =
  extras.title && extras.source && extras.author && extras.license
    ? `This work is based on "${extras.title}" (${extras.source}) by ${extras.author} licensed under ${extras.license}`
    : (previous?.credits ?? `(fill in from ${sourceTxt ?? 'the page you downloaded from'})`);
const manifest = {
  _what:
    'Written by tools/personal/prepare.mjs. PERSONAL USE ONLY — never committed, never published, never sold (docs/guides/personal-tier.md, D190). Schema: lib.mjs validateManifest.',
  version: MANIFEST_VERSION,
  slug,
  dresses,
  model: 'model.glb',
  source: {
    file: originalName ?? relative(dir, sourceModel),
    bytes: originalBytes?.byteLength ?? readFileSync(sourceModel).byteLength,
    sha256: sha256(originalBytes ?? readFileSync(sourceModel)),
    model: relative(dir, sourceModel),
    sourceTxt,
  },
  credits,
  licence: extras.license ?? previous?.licence ?? '(as shown on the page — fill in)',
  rig: {
    convention: rigMap.convention,
    label: rigMap.label,
    mapFile: mapFile === null ? null : relative(dir, mapFile).startsWith('..') ? mapFile : relative(dir, mapFile),
    joints: Object.fromEntries(
      OUR_JOINTS.map((j) => [
        j,
        {
          primary: rigMap.joints[j].primary,
          followers: rigMap.joints[j].followers,
          by: rigMap.joints[j].by,
          primaryWeighted: rigMap.joints[j].primary === null ? null : weightedNames.has(rigMap.joints[j].primary),
          byAncestry: placedBy.get(j).ancestry,
          byPosition: placedBy.get(j).position,
        },
      ]),
    ),
    synthesised,
    placement,
    pelvis: 'placed between the two thigh pivots',
    rotations: "our bind rotations (figures.glb's agent), so the world-space-delta retarget is the identity on rotations",
    sourceJoints: jointByName.size,
    weightedSourceJoints: weightedNames.size,
  },
  triangles: { source: before.triangles.total, render: renderTriangles, budget: BUDGET, after: afterTriangles, parts: decimation },
  pose: {
    before: { verdict: poseBefore.verdict, upperArmDeg: { l: poseBefore.l, r: poseBefore.r } },
    fix: POSE,
    turnsDeg: turns,
    after: { verdict: poseAfter.verdict, upperArmDeg: { l: poseAfter.l, r: poseAfter.r }, measuredFromWrittenFile: { l: afterInspect.restPose?.l ?? null, r: afterInspect.restPose?.r ?? null } },
    target: "figures.glb agent's bind directions (upper arm and forearm)",
  },
  skinned: skinnedParts,
  textures,
  dropped: {
    controlMeshes: before.flags.controlMeshes.length,
    meshesByFlag: droppedMeshes,
    controlTriangles: before.triangles.control,
    nodes: nodesBefore - afterInspect.nodes.total,
    joints: jointByName.size - OUT_JOINTS.length,
    textureSlots: droppedSlots,
  },
  units: { sourceHeight: round(sourceHeight, 4), height: round(HEIGHT, 4), scale: round(scale, 6), facing: '+z', up: '+y' },
  prepared: { tool: 'tools/personal/prepare.mjs', date: new Date().toISOString(), budget: BUDGET, bytes: bytesOut, sha256: sha256(readFileSync(out)) },
};
const errors = validateManifest(manifest);
if (errors.length > 0) fail(`the manifest would not validate:\n  ${errors.join('\n  ')}`);
writeFileSync(insideSlug(slug, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

// ---------------------------------------------------------------------------
// Before / after
// ---------------------------------------------------------------------------

const n = (x) => Number(x).toLocaleString('en');
console.log(`\n${slug}: ${relative(REPO, sourceModel)} → ${relative(REPO, out)} (${n(bytesOut)} B)`);
console.log(`  rig map     ${rigMap.label}${mapFile !== null ? ` + ${relative(REPO, mapFile)}` : ''}; ${n(jointByName.size)} source joints (${n(weightedNames.size)} weighted) → root + ${String(OUR_JOINTS.length)}`);
for (const j of OUR_JOINTS) {
  const m = rigMap.joints[j];
  const pb = placedBy.get(j);
  const extra = [
    m.followers.length > 0 ? `+${String(m.followers.length)} listed` : '',
    pb.ancestry.length > 0 ? `+${String(pb.ancestry.length)} by ancestry` : '',
    pb.position.length > 0 ? `+${String(pb.position.length)} by position (${pb.position.join(', ')})` : '',
    synthesised.includes(j) ? 'SYNTHESISED' : '',
  ].filter(Boolean);
  console.log(`              ${j.padEnd(11)} ← ${(m.primary ?? '—').padEnd(24)} ${extra.join(', ')}`);
}
if (unweightedPrimaries.length > 0) {
  console.log(
    `  WARN        a joint stands where an UNWEIGHTED bone stands (right if the bone marks the joint, as Auto-Rig Pro's arm_twist does; wrong for a controller elsewhere — check.mjs judges it): ${unweightedPrimaries.map((j) => `${j} ← ${rigMap.joints[j].primary}`).join(', ')}`,
  );
}
if (placement.byPosition > 0) {
  console.log(
    `  WARN        ${String(placement.byPosition)} weighted bone(s), ${(100 * placement.byPositionWeight).toFixed(2)}% of the skin weight, placed by POSITION, not by the map — check.mjs fails over ${String(100 * BY_POSITION_LIMIT)}%; list them in bones.json`,
  );
}
console.log(`  placement   ${String(placement.byAncestry)} weighted bone(s) by ancestry, ${String(placement.byPosition)} by position`);
console.log(`  triangles   ${n(before.triangles.total)} → ${n(renderTriangles)} without the control shapes → ${n(afterTriangles)} (budget ${n(BUDGET)})`);
for (const d of decimation) console.log(`              ${d.part.padEnd(28)} ${n(d.before).padStart(6)} → ${n(d.after).padStart(6)}${d.kept ? '  (kept whole)' : ''}`);
console.log(`  pose        ${poseBefore.verdict} → ${poseAfter.verdict}: upper arm ${String(poseBefore.l)}° / ${String(poseBefore.r)}° → ${String(poseAfter.l)}° / ${String(poseAfter.r)}° below the horizontal (read back from the file: ${String(afterInspect.restPose?.l)}° / ${String(afterInspect.restPose?.r)}°)`);
if (POSE === 't') console.log(`              turned ${Object.entries(turns).map(([j, d]) => `${j} ${String(d)}°`).join(', ')}`);
for (const s of skinnedParts) console.log(`  skinned     ${s.part} (${n(s.vertices)} vertices) by ${s.rule}`);
console.log(`  units       ${round(sourceHeight, 3)} source units tall → ${String(HEIGHT)} m (×${round(scale, 4)}), facing +z, feet at 0`);
console.log(`  textures    ${textures.map((t) => `${t.name} ${t.slot} ${t.size?.join('×') ?? '?'}${t.downscaled ? ' (downscaled)' : ''}`).join('; ') || 'none'}`);
if (droppedSlots.length > 0) console.log(`  dropped     texture slots ${droppedSlots.join(', ')}`);
if (droppedMeshes.length > 0) console.log(`  dropped     by --drop: ${droppedMeshes.join(', ')}`);
console.log(`  dropped     ${n(before.flags.controlMeshes.length)} control meshes (${n(before.triangles.control)} tris), ${n(manifest.dropped.nodes)} nodes, ${n(manifest.dropped.joints)} joints`);
console.log(`  wrote       ${relative(REPO, out)}, ${relative(REPO, join(dir, 'manifest.json'))}`);

// ---------------------------------------------------------------------------

/** A readable name for a part: its own or its nearest meaningful ancestor's name (`ancestors` is nearest first; Sketchfab's `_<n>` dropped), else its material. */
function partName(node, ancestors, prim) {
  const meaningful = (name) => name && !/^(Object_\d+|GLTF_created_\d+.*|GLTF_SceneRootNode|RootNode|root|Sketchfab_model|rig(_\d+)?|Armature(_\d+)?)$/i.test(name);
  for (const name of [node.getName(), ...ancestors]) {
    if (meaningful(name) && !jointByName.has(name)) return name.replace(/_\d+$/, '').replace(/[^A-Za-z0-9_.-]+/g, '_');
  }
  return (prim.getMaterial()?.getName() ?? 'part').replace(/[^A-Za-z0-9_.-]+/g, '_');
}
