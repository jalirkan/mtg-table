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
 *        [--drop <regex>]… [--bind <regex>=<our joint>]… [--joints bind|rest]
 *        [--exposure auto|off|<gain>]
 *        [--card "<card name>"]… [--seat you|opp|director|villain]…
 *        [--disabled ["<reason>"] | --enabled]
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
 *     dropped and named in the manifest. Then **the paint step** (D194, D240):
 *     every part merged into ONE skinned primitive under ONE material — a model of
 *     several paints packed into one atlas (a repeating paint laid out over the UV
 *     tiles it spans), at most `ATLAS_MAX` (2048) px a side — so a dressed figure
 *     is one draw call; the normal maps go (the arena draws base colour only).
 *  8. **Bake OUR clip set into it** (phase 2, D194): every clip `figures.glb`'s
 *     `agent` carries (`models.json`'s twelve keys — idle, attack, block, hit,
 *     die, the kneel and the rest), carried onto this skeleton with
 *     `retarget.mjs` (the build's world-space delta, the pelvis scaled by the two
 *     hip heights) and written as the file's own animations, named by key. The
 *     rotations are the agent's by construction (step 2); the pelvis is NOT — a
 *     body whose hip stands 6 cm higher than the agent's would sink into the
 *     table on the agent's own track — so the arena binds these, never
 *     `figures.glb`'s, and needs no retarget of its own.
 *  9. **Expose the paint** (fix pass 1, D198): the arena draws a personal model
 *     UNLIT, so its base colour IS what the table shows. A texture authored for a
 *     lit PBR renderer can be far darker than that — Doom's covers 85% of his
 *     surface under linear luminance 0.02 — and under the comic look a paint that
 *     dark is all shadow. The surface is measured (area-weighted, four samples a
 *     triangle, a cutout's discarded texels left out) and, when its 90th
 *     percentile is under 0.2, every paint's texels are multiplied by ONE gain in
 *     linear light (at most ×8; hue kept, no channel pushed past 1), so the
 *     paints keep their values relative to each other. `--exposure off` keeps the
 *     texture as it came; a number sets the gain. The manifest records both
 *     percentiles and the gain (`paint.exposure`).
 * 10. **meshopt LAST** (`gltf-transform meshopt`, the Tier 2 trap: nothing after it).
 *
 * Two more rules (D194): a material in the spec/gloss workflow (Character
 * Creator's) has its diffuse texture and factor read as base colour first; and a
 * part the simplifier cannot bring to its share (a game export whose every
 * triangle carries its own normals is all seams) is WELDED on position and UV —
 * its normals averaged, so a hard edge goes soft — and simplified again.
 *
 * `--joints bind` (the default) reads the joints AND the vertices at the skin's
 * bind pose; `--joints rest` reads both at the file's rest pose (its nodes as
 * they stand). They are the same file when the rest pose is the bind pose; when
 * they differ (a model exported posed), one of them is the pose the mesh was
 * made in, and `inspect.json`'s `bind vs rest` spread says there is a choice.
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
  ATLAS_GUTTER,
  ATLAS_MAX,
  ATLAS_SWATCH,
  boneFinder,
  BY_POSITION_LIMIT,
  controlReason,
  CORE_JOINTS,
  detectRigMap,
  EXPOSURE_MAX,
  EXPOSURE_TARGET,
  exposeTexels,
  exposureGain,
  findSourceModel,
  GLTF,
  heightWeights,
  GLTF_FUNCTIONS,
  insideSlug,
  inspectDocument,
  loadThree,
  m4,
  MANIFEST_VERSION,
  OUR_JOINTS,
  OUR_PARENT,
  packAtlas,
  personalIO,
  rawJsonOf,
  readDocument,
  REPO,
  restVertexData,
  round,
  SEATS,
  SEAT_LOOKS,
  seatOf,
  texelLuminance,
  skinAtRest,
  slugDir,
  snapshot,
  THREE,
  tileTexels,
  trianglesOf,
  uvSpanOf,
  validateManifest,
  vrmHumanBonesOf,
  WEB,
  weightedJoints,
  weightedQuantile,
} from './lib.mjs';
import { worldDeltaRetarget } from './retarget.mjs';

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const slug = argv[0];
if (!slug || slug.startsWith('--')) {
  console.error(
    'usage: node tools/personal/prepare.mjs <slug> [--budget 6000] [--pose t|none] [--map auto|<file>] [--cloak-to <joint>] [--height <m>] [--drop <regex>]… [--bind <regex>=<joint>]… [--joints bind|rest] [--exposure auto|off|<gain>] [--card "<name>"]… [--seat you|opp|director|villain]… [--disabled ["<reason>"]|--enabled]',
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
/** `--joints bind|rest`: which pose the joints AND the vertices are read in (see the header). */
const JOINTS_AT = opt('joints', 'bind');
/**
 * `--exposure auto|off|<gain>` (fix pass 1, D198): `auto` lifts a paint authored
 * too dark for an unlit figure (see the exposure step), `off` keeps it as it came,
 * a number multiplies it by exactly that, in linear light.
 */
const EXPOSURE = opt('exposure', 'auto');
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
for (const seat of many('seat')) if (seatOf(seat) === null) fail(`--seat must be one of ${[...SEATS, ...Object.values(SEAT_LOOKS)].join(', ')}`);
if (!['bind', 'rest'].includes(JOINTS_AT)) fail('--joints must be bind or rest');
if (!['auto', 'off'].includes(EXPOSURE) && !(Number(EXPOSURE) >= 0.25 && Number(EXPOSURE) <= 16)) fail('--exposure must be auto, off, or a gain between 0.25 and 16');
if (argv.includes('--disabled') && argv.includes('--enabled')) fail('--disabled and --enabled together');
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
// Character Creator exports in the spec/gloss workflow: its diffuse IS the base
// colour. Read it so, and drop the extension (the arena draws base colour only).
const specGloss = root.listExtensionsUsed().find((e) => e.extensionName === 'KHR_materials_pbrSpecularGlossiness');
const specGlossed = [];
if (specGloss !== undefined) {
  for (const material of root.listMaterials()) {
    const sg = material.getExtension('KHR_materials_pbrSpecularGlossiness');
    if (sg === null) continue;
    if (material.getBaseColorTexture() === null && sg.getDiffuseTexture() !== null) {
      material.setBaseColorTexture(sg.getDiffuseTexture());
      material.getBaseColorTextureInfo().setTexCoord(sg.getDiffuseTextureInfo().getTexCoord());
    }
    material.setBaseColorFactor(sg.getDiffuseFactor());
    material.setExtension('KHR_materials_pbrSpecularGlossiness', null);
    specGlossed.push(material.getName());
  }
  specGloss.dispose();
}
const skins = root.listSkins();
if (skins.length === 0) fail('the model has no skin — it is not rigged (the tier retargets rigs; a static model is a different job)');
const weightedBySkin = new Map(skins.map((s) => [s, weightedJoints(doc, s)]));
const skinInfo = new Map(skins.map((s) => [s, skinAtRest(s, weightedBySkin.get(s))]));
// `--joints bind` reads the vertices where the bind matrices put them too (every
// joint's K is the reference one); `--joints rest` reads the joints where the
// file's nodes stand, with the vertices as the skin draws them there. Either way
// the two agree — a posed export whose rest is not its bind once had its arms
// read at rest and its joints at bind, and the arms were not where the bones were.
const vertexInfo = new Map(skins.map((s) => {
  const info = skinInfo.get(s);
  return [s, JOINTS_AT === 'bind' ? { ...info, K: info.K.map(() => info.ref) } : info];
}));
const bindSpread = Math.max(0, ...skins.map((s) => skinInfo.get(s).bindSpread));

// Every joint of every skin, by name (a name used by two skins must be one joint).
const jointByName = new Map();
const bindOf = new Map();
for (const s of skins) {
  const info = skinInfo.get(s);
  s.listJoints().forEach((j, i) => {
    if (!jointByName.has(j.getName())) {
      jointByName.set(j.getName(), j);
      bindOf.set(j.getName(), JOINTS_AT === 'bind' ? info.bind[i].clone() : new THREE.Vector3().setFromMatrixPosition(m4(j.getWorldMatrix())));
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
    const data = restVertexData(node, prim, skin === null ? null : vertexInfo.get(skin));
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
// The source's own animations (a Mixamo take, a game's idle) drive ITS skeleton,
// which is not in the output: they go, and our clip set is baked in below.
const droppedAnimations = root.listAnimations().map((a) => a.getName() || '(unnamed)');
for (const animation of root.listAnimations()) animation.dispose();
for (const s of root.listScenes()) for (const child of s.listChildren()) s.removeChild(child);
for (const s of root.listScenes()) if (s !== scene) s.dispose();
const buffer = root.listBuffers()[0] ?? doc.createBuffer();
const modelNode = doc.createNode(slug);
scene.addChild(modelNode);

/** Our joint → its bind world matrix: the source's position, OUR rotation. */
const WORLD = new Map(OUT_JOINTS.map((j) => [j, new THREE.Matrix4().compose(j === 'root' ? new THREE.Vector3() : P.get(j), AGENT.get(j).q, new THREE.Vector3(1, 1, 1))]));
const jointNodes = new Map();
/** Each joint's local rest (translation, rotation), for the clip bake's mirror of this skeleton. */
const jointLocal = new Map();
for (const joint of OUT_JOINTS) {
  const parent = joint === 'root' ? null : OUR_PARENT[joint];
  const local = parent === null ? WORLD.get(joint).clone() : WORLD.get(parent).clone().invert().multiply(WORLD.get(joint));
  const t = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  local.decompose(t, q, s);
  const node = doc.createNode(joint).setTranslation(t.toArray()).setRotation(q.toArray());
  jointNodes.set(joint, node);
  jointLocal.set(joint, { t, q });
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
// OUR clip set, baked in (D194): figures.glb's agent clips → this skeleton
// ---------------------------------------------------------------------------

/** 24 frames a second: the build's own sampling rate (`build-figures.mjs`'s humanClips). */
const CLIP_FPS = 24;
const bakedClips = await bakeClips();

/**
 * Carry every clip `models.json` gives the `agent` onto this skeleton with
 * `retarget.mjs` — the build's formula, proven equal to it by check.mjs step 0 —
 * and write each as an animation of this document, named by its clip key. The
 * target is a three mirror of the skeleton just built (the same local rest, joint
 * for joint), so the clip's tracks name our joints and the pelvis track carries
 * THIS body's hip, scaled by the two hip heights.
 */
async function bakeClips() {
  const figures3 = await loadThree(join(WEB, 'public/models/figures.glb'));
  const agentRoot = figures3.scene.getObjectByName(models.models.agent.node);
  if (agentRoot === undefined) fail('figures.glb has no agent node (three)');
  const agent = { root: agentRoot, bone: boneFinder(agentRoot) };
  const agentRest = snapshot(agentRoot);
  const mirrorRoot = new THREE.Group();
  mirrorRoot.name = slug;
  const mirror = new Map();
  for (const joint of OUT_JOINTS) {
    const bone = new THREE.Bone();
    bone.name = joint;
    const { t, q } = jointLocal.get(joint);
    bone.position.copy(t);
    bone.quaternion.copy(q);
    mirror.set(joint, bone);
    (joint === 'root' ? mirrorRoot : mirror.get(OUR_PARENT[joint])).add(bone);
  }
  mirrorRoot.updateMatrixWorld(true);
  const target = { root: mirrorRoot, bone: (name) => mirror.get(name) ?? null };
  const out = [];
  for (const [key, name] of Object.entries(models.models.agent.clips)) {
    const source = figures3.animations.find((a) => a.name === name);
    if (source === undefined) fail(`figures.glb has no clip ${name} (the agent's "${key}")`);
    agentRest();
    const clip = worldDeltaRetarget(THREE, { source: agent, target, clip: source, joints: OUR_JOINTS, fps: CLIP_FPS, name: key });
    const animation = doc.createAnimation(key);
    let times = null;
    for (const track of clip.tracks) {
      const dot = track.name.lastIndexOf('.');
      const node = jointNodes.get(track.name.slice(0, dot));
      const path = track.name.slice(dot + 1) === 'quaternion' ? 'rotation' : 'translation';
      if (node === undefined) fail(`the baked ${key} names a joint this skeleton lacks: ${track.name}`);
      times ??= doc.createAccessor().setType('SCALAR').setArray(Float32Array.from(track.times)).setBuffer(buffer);
      const output = doc.createAccessor().setType(path === 'rotation' ? 'VEC4' : 'VEC3').setArray(Float32Array.from(track.values)).setBuffer(buffer);
      const sampler = doc.createAnimationSampler().setInput(times).setOutput(output).setInterpolation('LINEAR');
      animation.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(sampler));
    }
    out.push({ key, from: name, duration: Number(clip.duration.toFixed(4)), tracks: clip.tracks.length });
  }
  agentRest();
  return out;
}

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
  // A part the simplifier could not bring near its share is all seams — a game
  // export whose every triangle carries its own normals locks every vertex. Weld
  // it on position and UV (its normals averaged: a hard edge goes soft) and ask again.
  for (const part of cut) {
    const row = decimation.find((d) => d.part === part.name);
    if (row.after <= 1.15 * Math.max(12, Math.floor(row.before * share))) continue;
    const before_ = part.out.getAttribute('POSITION').getCount();
    const merged = weld(part.out);
    row.welded = { vertices: before_, after: merged };
    row.after = simplify(part.out, Math.max(12, Math.floor(row.before * share)));
    console.log(`  welded    ${part.name}: ${String(before_)} → ${String(merged)} vertices (position + UV; normals averaged) — the simplifier had stopped at the seams`);
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

/**
 * **Weld a primitive on position and UV** — every vertex that shares both with
 * another becomes one, its normal the normalised sum, its skin the first one's
 * (a split vertex carries the same skin on every copy), its tangent dropped. The
 * indices are remapped; a triangle that collapses is dropped. Returns the vertex
 * count after.
 */
function weld(prim) {
  const pos = readAll(prim.getAttribute('POSITION'));
  const count = pos.length / 3;
  const nor = prim.getAttribute('NORMAL') !== null ? readAll(prim.getAttribute('NORMAL')) : null;
  const uvA = prim.getAttribute('TEXCOORD_0');
  const uv = uvA !== null ? readAll(uvA) : null;
  const keyOf = (i) => {
    const q = (x) => Math.round(x * 1e6);
    let key = `${q(pos[i * 3])},${q(pos[i * 3 + 1])},${q(pos[i * 3 + 2])}`;
    if (uv !== null) key += `|${q(uv[i * 2])},${q(uv[i * 2 + 1])}`;
    return key;
  };
  const first = new Map();
  const remap = new Uint32Array(count);
  const keep = [];
  for (let i = 0; i < count; i += 1) {
    const key = keyOf(i);
    let at = first.get(key);
    if (at === undefined) {
      at = keep.length;
      first.set(key, at);
      keep.push(i);
    }
    remap[i] = at;
  }
  const n = keep.length;
  const pick = (accessor, size, Ctor) => {
    const all = readAll(accessor);
    const out = new Ctor(n * size);
    keep.forEach((src, k) => {
      for (let c = 0; c < size; c += 1) out[k * size + c] = all[src * size + c];
    });
    return out;
  };
  const summed = nor === null ? null : new Float32Array(n * 3);
  if (summed !== null) {
    for (let i = 0; i < count; i += 1) for (let c = 0; c < 3; c += 1) summed[remap[i] * 3 + c] += nor[i * 3 + c];
    for (let k = 0; k < n; k += 1) {
      const l = Math.hypot(summed[k * 3], summed[k * 3 + 1], summed[k * 3 + 2]) || 1;
      for (let c = 0; c < 3; c += 1) summed[k * 3 + c] /= l;
    }
  }
  for (const semantic of prim.listSemantics()) {
    const accessor = prim.getAttribute(semantic);
    if (semantic === 'TANGENT') {
      prim.setAttribute('TANGENT', null);
      continue;
    }
    const size = accessor.getElementSize();
    const array = semantic === 'NORMAL' && summed !== null ? summed : pick(accessor, size, semantic.startsWith('JOINTS_') ? Uint8Array : Float32Array);
    prim.setAttribute(semantic, doc.createAccessor().setType(accessor.getType()).setArray(array).setBuffer(buffer));
  }
  const old = prim.getIndices().getArray();
  const index = [];
  for (let t = 0; t + 2 < old.length; t += 3) {
    const a = remap[old[t]];
    const b = remap[old[t + 1]];
    const c = remap[old[t + 2]];
    if (a !== b && b !== c && a !== c) index.push(a, b, c);
  }
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(index)).setBuffer(buffer));
  return n;
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
// The paint (D194, D240): ONE primitive under ONE material — every paint in one atlas
// ---------------------------------------------------------------------------

const paint = await paintStep();

// ---------------------------------------------------------------------------
// The exposure (fix pass 1, D198): an unlit figure's paint IS its value
// ---------------------------------------------------------------------------

paint.exposure = await exposureStep();
if (paint.atlas !== null) for (const region of paint.atlas.regions) region.gain = paint.exposure.gain;

/**
 * **Measure the painted surface and lift it when it is too dark to read unlit**
 * (D198; `lib.mjs`'s `exposureGain`, `exposeTexels`). Every paint primitive's
 * triangles, weighted by area, four samples each (the centroid and three toward
 * the corners) at the texel their UV names, a repeating UV wrapped; a texel a
 * cutout discards (alpha under half) is not surface. One gain for the model,
 * applied to every paint's texels in linear light with each texel's hue held.
 * Returns the manifest's record; the textures are rewritten in place.
 */
async function exposureStep() {
  const decoded = new Map();
  const imageOf = async (texture) => {
    if (!decoded.has(texture)) {
      const { data, info } = await sharp(Buffer.from(texture.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      decoded.set(texture, { data, info });
    }
    return decoded.get(texture);
  };
  const W3 = [
    [1 / 3, 1 / 3, 1 / 3],
    [2 / 3, 1 / 6, 1 / 6],
    [1 / 6, 2 / 3, 1 / 6],
    [1 / 6, 1 / 6, 2 / 3],
  ];
  const measure = async () => {
    const samples = [];
    for (const prim of bodyMesh.listPrimitives()) {
      const texture = prim.getMaterial()?.getBaseColorTexture() ?? null;
      if (texture === null) continue;
      const { data, info } = await imageOf(texture);
      const pos = readAll(prim.getAttribute('POSITION'));
      const uv = readAll(prim.getAttribute('TEXCOORD_0'));
      const index = prim.getIndices() !== null ? prim.getIndices().getArray() : Array.from({ length: pos.length / 3 }, (_, i) => i);
      for (let t = 0; t + 2 < index.length; t += 3) {
        const [a, b, c] = [index[t], index[t + 1], index[t + 2]];
        const e1 = [0, 1, 2].map((k) => pos[b * 3 + k] - pos[a * 3 + k]);
        const e2 = [0, 1, 2].map((k) => pos[c * 3 + k] - pos[a * 3 + k]);
        const area = 0.5 * Math.hypot(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]);
        if (!(area > 0)) continue;
        for (const w of W3) {
          let u = w[0] * uv[a * 2] + w[1] * uv[b * 2] + w[2] * uv[c * 2];
          let v = w[0] * uv[a * 2 + 1] + w[1] * uv[b * 2 + 1] + w[2] * uv[c * 2 + 1];
          u -= Math.floor(u);
          v -= Math.floor(v);
          const x = Math.min(info.width - 1, Math.floor(u * info.width));
          const y = Math.min(info.height - 1, Math.floor(v * info.height));
          const o = (y * info.width + x) * 4;
          if (data[o + 3] < 128) continue;
          samples.push([texelLuminance(data[o], data[o + 1], data[o + 2]), area]);
        }
      }
    }
    return { p10: round(weightedQuantile(samples, 0.1), 4), p50: round(weightedQuantile(samples, 0.5), 4), p90: round(weightedQuantile(samples, 0.9), 4) };
  };
  const before = await measure();
  const gain = exposureGain(EXPOSURE, before.p90);
  const record = { mode: EXPOSURE, target: EXPOSURE_TARGET, max: EXPOSURE_MAX, gain: round(gain, 3), before, after: before, capped: 0 };
  if (Math.abs(gain - 1) > 1e-3) {
    for (const [texture, { data, info }] of decoded) {
      record.capped += exposeTexels(data, gain);
      const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
      texture.setImage(new Uint8Array(png));
      const name = basename(texture.getURI() || texture.getName() || 'texture');
      for (const t of textures) if (t.name === name) t.bytes = png.byteLength;
    }
    record.after = await measure();
  }
  console.log(
    `  exposure    surface p10/p50/p90 ${String(before.p10)}/${String(before.p50)}/${String(before.p90)} (linear)` +
      (record.after === before
        ? ` — kept (${EXPOSURE === 'off' ? '--exposure off' : `p90 at or over ${String(EXPOSURE_TARGET)}`})`
        : ` ×${String(record.gain)} → ${String(record.after.p10)}/${String(record.after.p50)}/${String(record.after.p90)}${record.capped > 0 ? ` (${String(record.capped)} texels held under white)` : ''}`),
  );
  return record;
}

/**
 * **One draw call a figure** (D194, and since D240 exactly one). three draws a
 * primitive per call, and the arena draws each figure with its own material, so
 * a model of fourteen textured parts (Character Creator's Coulson) would cost
 * fourteen calls a figure, and a model of two paints (Doom's hood and tunic) two
 * — the one call over report 13 §8.2's line the personal tier's worst case paid
 * (PLAN follow-up 33). This step makes every prepared model ONE skinned primitive
 * under ONE material:
 *
 *  - it groups the parts by what they paint with — the base-colour texture, the
 *    factor, and whether the texture's alpha cuts (MASK or BLEND with an alpha
 *    channel: hair cards, lashes; the arena discards below 0.5);
 *  - with ONE group, that paint is the model's: its own texture (the factor
 *    baked into a copy), repeating as it came — or, untextured, its factor alone,
 *    the UVs kept as they are;
 *  - with more, every group is a REGION of one ATLAS (`lib.mjs`'s `packAtlas`):
 *    the paint's texture, factor multiplied in, repeated over as many whole UV
 *    tiles as its parts' UVs span (`uvSpanOf` — Doom's tunic wraps to `u` 1.87 on
 *    a repeating texture, so its region is the tunic twice side by side), an
 *    untextured part a swatch of its factor; `ATLAS_GUTTER` px of copied edge
 *    round each (wrapped, for a repeating paint), on a sheet of at most
 *    `ATLAS_MAX` px a side, every region scaled alike when they would not fit at
 *    their own size. Each part's UVs are remapped from its own tile into its
 *    group's region, so the texel a vertex names is the one it named before;
 *    a region that does not cut has its alpha set opaque, so the one material
 *    may be a cutout (MASK) for the hair cards alone;
 *  - merges every part into ONE primitive under ONE material, `paint-0`, base
 *    colour only — the arena draws no normal map, so the normal textures and
 *    tangents are dropped (named in the manifest); double-sided if any part was;
 *  - records every part's vertex range in it (`manifest.paint`, so check.mjs can
 *    still follow a rule-skinned cloak) and, for an atlas, the sheet's size, the
 *    scale and every region: its source, factor, span, rectangle and parts.
 *
 * The exposure step (D198) runs AFTER this, on the one texture: its one gain
 * reaches every source's region alike, and the record names it per region.
 * Returns the manifest's `paint` record.
 */
async function paintStep() {
  const prims = bodyMesh.listPrimitives();
  const partOf = new Map(parts.map((part) => [part.out, part]));
  const alphaOf = new Map();
  const hasAlpha = async (texture) => {
    if (!alphaOf.has(texture)) {
      const meta = await sharp(Buffer.from(texture.getImage())).metadata();
      alphaOf.set(texture, meta.hasAlpha === true);
    }
    return alphaOf.get(texture);
  };
  const uvRange = (prim, set) => {
    const uv = prim.getAttribute(`TEXCOORD_${String(set)}`);
    if (uv === null) return null;
    const lo = [Infinity, Infinity];
    const hi = [-Infinity, -Infinity];
    const e = [0, 0];
    for (let i = 0; i < uv.getCount(); i += 1) {
      uv.getElement(i, e);
      for (let k = 0; k < 2; k += 1) {
        lo[k] = Math.min(lo[k], e[k]);
        hi[k] = Math.max(hi[k], e[k]);
      }
    }
    return { lo, hi };
  };
  // 1 — what each primitive paints with, and the whole UV tiles it spans.
  const groups = new Map();
  for (const prim of prims) {
    const m = prim.getMaterial();
    const texture = m?.getBaseColorTexture() ?? null;
    const set = m?.getBaseColorTextureInfo()?.getTexCoord() ?? 0;
    const factor = (m?.getBaseColorFactor() ?? [1, 1, 1, 1]).slice(0, 3).map((x) => Math.round(x * 255) / 255);
    const mode = m?.getAlphaMode() ?? 'OPAQUE';
    const cutout = texture !== null && mode !== 'OPAQUE' && (await hasAlpha(texture));
    const range = texture === null ? null : uvRange(prim, set);
    const { origin, span } = range === null ? { origin: [0, 0], span: [1, 1] } : uvSpanOf(range.lo, range.hi);
    const key = `${texture === null ? 'swatch' : String(doc.getRoot().listTextures().indexOf(texture))}|${factor.join(',')}|${cutout ? 'cut' : 'solid'}`;
    const group = groups.get(key) ?? { key, texture, factor, cutout, members: [], span: [1, 1], doubleSided: false };
    group.members.push({ prim, set, origin, part: partOf.get(prim) });
    group.span = group.span.map((s, k) => Math.max(s, span[k]));
    group.doubleSided ||= m?.getDoubleSided() === true;
    groups.set(key, group);
  }
  const all = [...groups.values()];
  const useAtlas = all.length >= 2;
  const toSrgb = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  const isWhite = (f) => f.every((x) => x > 0.999);
  const nameOf = (texture) => basename(texture.getURI() || texture.getName() || 'texture');
  /** The image as RGBA texels, a glTF base-colour factor multiplied in (in sRGB, the factor converted). */
  const tinted = async (bytes, f) => {
    const { data, info } = await sharp(Buffer.from(bytes)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (!isWhite(f)) {
      const k = f.map(toSrgb);
      for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c += 1) data[i + c] = Math.round(data[i + c] * k[c]);
    }
    return { data, width: info.width, height: info.height };
  };
  const cutout = all.some((g) => g.cutout);
  const doubleSided = all.some((g) => g.doubleSided);
  let texture = null;
  let atlas = null;
  let outTexture = null;
  // 2a — one paint: the model's own texture (or its factor alone).
  if (!useAtlas) {
    const g = all[0];
    texture = g.texture;
    if (texture !== null && !isWhite(g.factor)) {
      const { data, width, height } = await tinted(texture.getImage(), g.factor);
      const img = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
      texture = doc.createTexture('paint-0').setImage(new Uint8Array(img)).setMimeType('image/png').setURI('paint-0.png');
    }
    if (texture !== null) {
      const size = GLTF.ImageUtils.getSize(texture.getImage(), texture.getMimeType());
      outTexture = { name: nameOf(texture), slot: 'baseColor', size, bytes: texture.getImage().byteLength, downscaled: false };
    }
  } else {
    // 2b — every paint a region of one sheet.
    const natural = [];
    for (const g of all) {
      if (g.texture === null) {
        natural.push({ w: ATLAS_SWATCH, h: ATLAS_SWATCH });
        continue;
      }
      const size = GLTF.ImageUtils.getSize(g.texture.getImage(), g.texture.getMimeType()) ?? [512, 512];
      natural.push({ w: size[0] * g.span[0], h: size[1] * g.span[1] });
    }
    const packed = packAtlas(natural, { max: ATLAS_MAX, gutter: ATLAS_GUTTER });
    if (packed === null) fail(`the paints do not pack into one ${String(ATLAS_MAX)} px sheet even at 1/64 — ${String(all.length)} paints`);
    const composites = [];
    for (let k = 0; k < all.length; k += 1) {
      const g = all[k];
      const r = packed.rects[k];
      let raw;
      if (g.texture === null) {
        const c = g.factor.map((x) => Math.round(255 * toSrgb(x)));
        raw = await sharp({ create: { width: r.w, height: r.h, channels: 4, background: { r: c[0], g: c[1], b: c[2], alpha: 1 } } })
          .extend({ top: ATLAS_GUTTER, bottom: ATLAS_GUTTER, left: ATLAS_GUTTER, right: ATLAS_GUTTER, extendWith: 'copy' })
          .raw()
          .toBuffer();
      } else {
        const { data, width, height } = await tinted(g.texture.getImage(), g.factor);
        // A region that does not cut is opaque: the one material may be a cutout for the hair cards alone.
        if (!g.cutout) for (let i = 3; i < data.length; i += 4) data[i] = 255;
        const tiled = tileTexels(data, width, height, g.span[0], g.span[1]);
        const wraps = g.span[0] > 1 || g.span[1] > 1;
        raw = await sharp(Buffer.from(tiled.buffer, tiled.byteOffset, tiled.byteLength), { raw: { width: width * g.span[0], height: height * g.span[1], channels: 4 } })
          .resize(r.w, r.h, { fit: 'fill' })
          .extend({ top: ATLAS_GUTTER, bottom: ATLAS_GUTTER, left: ATLAS_GUTTER, right: ATLAS_GUTTER, extendWith: wraps ? 'repeat' : 'copy' })
          .raw()
          .toBuffer();
      }
      composites.push({ input: raw, raw: { width: r.w + 2 * ATLAS_GUTTER, height: r.h + 2 * ATLAS_GUTTER, channels: 4 }, left: r.x - ATLAS_GUTTER, top: r.y - ATLAS_GUTTER });
      g.region = r;
    }
    const png = await sharp({ create: { width: packed.width, height: packed.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
      .composite(composites)
      .png()
      .toBuffer();
    texture = doc.createTexture('atlas').setImage(new Uint8Array(png)).setMimeType('image/png').setURI('atlas.png');
    outTexture = { name: 'atlas.png', slot: 'atlas', size: [packed.width, packed.height], bytes: png.byteLength, downscaled: packed.scale < 1, tiles: all.length };
    atlas = {
      size: [packed.width, packed.height],
      budget: ATLAS_MAX,
      scale: packed.scale,
      gutter: ATLAS_GUTTER,
      regions: all.map((g) => ({
        source: g.texture === null ? null : nameOf(g.texture),
        factor: g.factor,
        cutout: g.cutout,
        span: g.span,
        rect: [g.region.x, g.region.y, g.region.w, g.region.h],
        parts: g.members.map((m) => m.part?.name ?? '(part)'),
      })),
    };
  }
  // 3 — ONE primitive, ONE material.
  const material = doc.createMaterial('paint-0').setBaseColorFactor(texture === null ? [...all[0].factor, 1] : [1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(1).setDoubleSided(doubleSided);
  if (texture !== null) material.setBaseColorTexture(texture);
  if (cutout) material.setAlphaMode('MASK').setAlphaCutoff(0.5);
  // An untextured single paint keeps its UVs as they came (nothing samples them; a
  // test traces its vertices by them), a part that had none at the centre.
  const keepUv = texture === null && prims.some((p) => p.getAttribute('TEXCOORD_0') !== null);
  const writeUv = texture !== null || keepUv;
  const P = [];
  const N = [];
  const UV = [];
  const JO = [];
  const WE = [];
  const IX = [];
  const ranges = [];
  for (const g of all) {
    for (const member of g.members) {
      const prim = member.prim;
      const base = P.length / 3;
      const pos = readAll(prim.getAttribute('POSITION'));
      const count = pos.length / 3;
      const index = prim.getIndices() !== null ? Array.from(prim.getIndices().getArray()) : Array.from({ length: count }, (_, i) => i);
      const nor = prim.getAttribute('NORMAL') !== null ? readAll(prim.getAttribute('NORMAL')) : faceNormals(pos, index);
      const uvA = prim.getAttribute(`TEXCOORD_${String(keepUv ? 0 : member.set)}`);
      const uv = uvA !== null ? readAll(uvA) : new Float32Array(count * 2).fill(0.5);
      const jo = readAll(prim.getAttribute('JOINTS_0'));
      const we = readAll(prim.getAttribute('WEIGHTS_0'));
      for (let i = 0; i < count; i += 1) {
        P.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        N.push(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]);
        let u = uv[i * 2];
        let v = uv[i * 2 + 1];
        if (useAtlas) {
          const r = g.region;
          const c = g.texture === null ? 0.5 : Math.min(1, Math.max(0, (u - member.origin[0]) / g.span[0]));
          const w = g.texture === null ? 0.5 : Math.min(1, Math.max(0, (v - member.origin[1]) / g.span[1]));
          u = (r.x + c * r.w) / atlas.size[0];
          v = (r.y + w * r.h) / atlas.size[1];
        } else if (g.texture === null && !keepUv) {
          u = 0.5;
          v = 0.5;
        }
        UV.push(u, v);
        for (let c = 0; c < 4; c += 1) {
          JO.push(jo[i * 4 + c]);
          WE.push(we[i * 4 + c]);
        }
      }
      for (const x of index) IX.push(base + x);
      ranges.push({ part: member.part?.name ?? '(part)', material: member.part?.material ?? null, first: base, count });
    }
  }
  const prim = doc
    .createPrimitive()
    .setMaterial(material)
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(P)).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(N)).setBuffer(buffer))
    .setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(new Uint8Array(JO)).setBuffer(buffer))
    .setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(new Float32Array(WE)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(P.length / 3 <= 65534 ? new Uint16Array(IX) : new Uint32Array(IX)).setBuffer(buffer));
  if (writeUv) prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(UV)).setBuffer(buffer));
  const droppedNormals = [];
  for (const old of prims) {
    const m = old.getMaterial();
    if (m?.getNormalTexture() !== null && m?.getNormalTexture() !== undefined) droppedNormals.push(`${m.getName()}.normal`);
    bodyMesh.removePrimitive(old);
    old.dispose();
  }
  bodyMesh.addPrimitive(prim);
  await doc.transform(GLTF_FUNCTIONS.prune({ keepAttributes: true }));
  textures.length = 0;
  if (outTexture !== null) textures.push(outTexture);
  const record = [{ material: 'paint-0', atlas: useAtlas, cutout, texture: outTexture?.name ?? null, triangles: IX.length / 3, parts: ranges }];
  console.log(
    `  paint       ${String(prims.length)} part(s), ${String(all.length)} paint(s) → ONE primitive, ONE material: ` +
      (useAtlas
        ? `an atlas of ${String(all.length)} region(s), ${atlas.size.join('×')} px at ×${String(atlas.scale)}${all.some((g) => g.span[0] > 1 || g.span[1] > 1) ? ` (repeating: ${all.filter((g) => g.span[0] > 1 || g.span[1] > 1).map((g) => `${g.texture === null ? 'swatch' : nameOf(g.texture)} ${g.span.join('×')} tiles`).join(', ')})` : ''}`
        : outTexture !== null
          ? `its own ${outTexture.name} (${outTexture.size?.join('×') ?? '?'})`
          : 'untextured (its factor)') +
      `${cutout ? ', cutout' : ''}${doubleSided ? ', double-sided' : ''}, ${String(IX.length / 3)} tris`,
  );
  return { primitives: record, atlas, droppedNormalTextures: [...new Set(droppedNormals)] };
}

/** Area-weighted vertex normals for a part that brought none. */
function faceNormals(pos, index) {
  const out = new Float32Array(pos.length);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t + 2 < index.length; t += 3) {
    a.fromArray(pos, index[t] * 3);
    b.fromArray(pos, index[t + 1] * 3);
    c.fromArray(pos, index[t + 2] * 3);
    const n = b.sub(a).cross(c.sub(a));
    for (const k of [index[t], index[t + 1], index[t + 2]]) for (let e = 0; e < 3; e += 1) out[k * 3 + e] += n.getComponent(e);
  }
  for (let i = 0; i < out.length; i += 3) {
    const l = Math.hypot(out[i], out[i + 1], out[i + 2]) || 1;
    out[i] /= l;
    out[i + 1] /= l;
    out[i + 2] /= l;
  }
  return out;
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
  paint,
  clips: {
    keys: bakedClips.map((c) => c.key),
    source: "figures.glb's agent clips (models.json), retargeted by tools/personal/retarget.mjs",
    fps: CLIP_FPS,
    baked: bakedClips,
    dropped: droppedAnimations,
  },
};
// `--disabled` keeps it out of the game's index; `--enabled` lets it back; neither keeps the last manifest's word.
const disabledAt = argv.indexOf('--disabled');
const disabledReason = disabledAt >= 0 && argv[disabledAt + 1] !== undefined && !argv[disabledAt + 1].startsWith('--') ? argv[disabledAt + 1] : null;
const disabled = disabledAt >= 0 ? (disabledReason ?? true) : argv.includes('--enabled') ? false : (previous?.disabled ?? false);
if (disabled !== false) manifest.disabled = disabled;
if (JOINTS_AT !== 'bind' || bindSpread > 1e-4) manifest.rig.jointsAt = { pose: JOINTS_AT, bindVsRestSpread: round(bindSpread, 6) };
if (specGlossed.length > 0) manifest.dropped.specularGlossiness = specGlossed;
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
// A forearm that had to turn most of the way round pointed back along its upper
// arm: the arm is folded, which is a swapped map far more often than a pose.
// check.mjs's limb check (D193) judges it; this says so where the map is made.
const folded = Object.entries(turns).filter(([j, d]) => /^lowerarm_/.test(j) && d > 120);
if (folded.length > 0) {
  console.log(
    `  WARN        ${folded.map(([j, d]) => `${j} turned ${String(d)}°`).join(', ')} onto the agent's forearm: the forearm pointed back along the upper arm, so the arm is FOLDED — a map that swaps the forearm and the hand does this; check.mjs's limb check will fail it`,
  );
}
for (const s of skinnedParts) console.log(`  skinned     ${s.part} (${n(s.vertices)} vertices) by ${s.rule}`);
console.log(`  units       ${round(sourceHeight, 3)} source units tall → ${String(HEIGHT)} m (×${round(scale, 4)}), facing +z, feet at 0`);
console.log(`  joints at   the ${JOINTS_AT} pose (bind vs rest spread ${String(round(bindSpread, 6))}${bindSpread > 1e-4 ? ' — the file\'s rest pose is NOT its bind pose; the other --joints reads the other one' : ''})`);
console.log(`  clips       baked: ${bakedClips.map((c) => c.key).join(', ')} (${String(CLIP_FPS)} fps, figures.glb's agent → this skeleton)${droppedAnimations.length > 0 ? `; the source's own dropped: ${droppedAnimations.join(', ')}` : ''}`);
if (specGlossed.length > 0) console.log(`  spec/gloss  diffuse read as base colour: ${specGlossed.join(', ')}`);
if (disabled !== false) console.log(`  DISABLED    ${typeof disabled === 'string' ? disabled : 'the manifest says disabled'} — the dev route's index skips this model (--enabled lets it back)`);
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
