/*
 * mtg-table — web/test/personal-tier.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The personal tier's committed half** (D190, D191; `docs/guides/personal-tier.md`).
 *
 * The tier's MODELS are never in the repo — they live in the gitignored
 * `personal/` folder on the user's machine — so nothing here reads one. What is
 * committed is the pipeline (`tools/personal/`), and these tests hold its rules:
 *
 *   - `personal/` is ignored by git, and `tools/personal/` (the pipeline) is not
 *     — the negative control, because an unanchored `personal/` pattern hides both;
 *   - the slug rule and the one folder a slug may write into;
 *   - the manifest schema's validator, one defect at a time;
 *   - our 22 joints are the build's (`tools/assets-manifest.json`) and the
 *     committed `figures.glb` agent's hierarchy;
 *   - the rig-map auto-detection over synthetic joint-name lists in each
 *     convention (Auto-Rig Pro, Mixamo, Unreal, VRM), a VRM humanoid table, and
 *     a `bones.json` override;
 *   - the A-pose detection, the control-mesh, unskinned-mesh and game-name flags
 *     on a tiny skinned GLB built HERE — a box on two bones, CC0 by construction;
 *   - `tools/personal/retarget.mjs` is still the build's retarget: `agent`'s
 *     baked clips carried onto `hero` reproduce `hero`'s own;
 *   - the cloak's height rule, and `judgeBody` — the checks a WRONG rig map
 *     fails (weight, sides, facing, shape; D192) — on synthetic bodies, and the
 *     net-log reader that proves the preview browser stayed on the loopback;
 *   - the WHOLE PIPELINE end to end — import, prepare, check — on a 22-joint
 *     Mixamo-named figure of boxes built here in an A-pose with an unskinned
 *     cape (CC0 by construction), in a throwaway slug under `personal/models/`
 *     that the test deletes: the 45° arm comes out at 0° with the skin the
 *     identity at rest, the cape binds to the spine by height, check.mjs passes
 *     — and fails on the two wrong maps a verifier found passing (the hand on a
 *     bone with no weight, the arms swapped side for side).
 *
 * `tools/personal/*.mjs` are loaded with a computed specifier, so the type
 * checker does not follow them (they are plain JavaScript, like the build); the
 * `Lib` interface below is the slice of them these tests call.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';

const REPO = fileURLToPath(new URL('../../', import.meta.url));

interface RigJoint {
  primary: string | null;
  followers: string[];
  by: string | null;
}
interface RigMap {
  convention: string;
  joints: Record<string, RigJoint>;
  missing: string[];
}
interface Inspection {
  restPose: { l: number | null; r: number | null; verdict: string } | null;
  rigMap: RigMap | null;
  triangles: { total: number; render: number; control: number };
  flags: {
    controlMeshes: { node: string; reason: string }[];
    unskinnedMeshes: { node: string }[];
    gameAssetNames: { name: string; reason: string }[];
  };
}
interface Mass {
  at: number[];
  n: number;
  weight: number;
}
interface BodyStats {
  joints: Record<string, number[]>;
  mass: Record<string, Mass>;
  totalWeight: number;
  height: number;
}
interface Judgement {
  problems: string[];
  warnings: string[];
  facing: Record<string, { forward: number | null; agent: number | null }>;
  segments: { a: string; b: string; deg: number | null }[];
}
interface NetReport {
  loopback: number;
  attempted: Map<string, number>;
  answered: string[];
  dnsQueries: number;
  tcpAway: string[];
  udpAway: string[];
  sentAway: string[];
}
interface Lib {
  heightWeights(y: number, heights: Record<string, number>): Record<string, number>;
  judgeBody(body: BodyStats, agent: BodyStats, rig?: unknown): Judgement;
  netLogReport(text: string): NetReport;
  inspectDocument(doc: unknown, raw: unknown, ...rest: unknown[]): Inspection;
  slugOf(name: string): string;
  isSlug(value: unknown): boolean;
  slugDir(slug: string): string;
  insideSlug(slug: string, path: string): string;
  gitIgnores(path: string): boolean;
  validateManifest(m: unknown): string[];
  detectRigMap(names: string[], options?: { vrmHumanBones?: Record<string, string> | null; file?: unknown }): RigMap;
  armAngles(positions: Record<string, number[]>): { l: number | null; r: number | null; verdict: string };
  readDocument(bytes: Uint8Array | string): Promise<unknown>;
  rawJsonOf(bytes: Uint8Array): unknown;
  OUR_JOINTS: string[];
  OUR_PARENT: Record<string, string>;
  CORE_JOINTS: string[];
  MODELS_DIR: string;
}

const lib = (await import(new URL('../../tools/personal/lib.mjs', import.meta.url).href)) as Lib;

// ---------------------------------------------------------------------------
// git: personal/ is never committed; the pipeline is
// ---------------------------------------------------------------------------

const insideGit = (() => {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: REPO, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

test('personal-tier: git ignores personal/ and everything under it', { skip: insideGit ? false : 'not a git checkout' }, () => {
  for (const path of [
    'personal/models/doctor-doom/model.glb',
    'personal/models/doctor-doom/doctor_doom.zip',
    'personal/models/doctor-doom/source/scene.gltf',
    'personal/models/any-slug/manifest.json',
    'personal/anything-else.txt',
  ]) {
    assert.equal(lib.gitIgnores(path), true, `${path} is NOT ignored — a personal model could be committed by \`git add -A\``);
  }
});

test('personal-tier: the negative control — the pipeline and its docs are NOT ignored', { skip: insideGit ? false : 'not a git checkout' }, () => {
  // An unanchored `personal/` in .gitignore matches tools/personal/ too; this is
  // the half of the rule that catches it. `gitIgnores` asks with `--no-index`:
  // git never reports a TRACKED file as ignored, so once tools/personal/ was
  // committed, asking without it let the unanchored rule through (fix pass 1).
  for (const path of ['tools/personal/lib.mjs', 'tools/personal/prepare.mjs', 'docs/guides/personal-tier.md', 'web/test/personal-tier.test.ts']) {
    assert.equal(lib.gitIgnores(path), false, `${path} is ignored — the committed pipeline would vanish`);
  }
  const tracked = execFileSync('git', ['ls-files', '--', 'personal'], { cwd: REPO, encoding: 'utf8' }).trim();
  assert.equal(tracked, '', `git tracks files under personal/: ${tracked}`);
});

// ---------------------------------------------------------------------------
// The slug
// ---------------------------------------------------------------------------

test('personal-tier: the slug rule', () => {
  const cases: [string, string][] = [
    ['Doctor Doom', 'doctor-doom'],
    ['Nick Fury, Spymaster', 'nick-fury-spymaster'],
    ['Ant-Man, Reformed Rogue', 'ant-man-reformed-rogue'],
    ["T'Challa, the Black Panther", 'tchalla-the-black-panther'],
    ['S.H.I.E.L.D. Helicarrier', 'shield-helicarrier'],
    ['  Wasp   //  Shrinking Savior ', 'wasp-shrinking-savior'],
    ['Élan Vital', 'elan-vital'],
    ['Agent 13, Sharon Carter', 'agent-13-sharon-carter'],
  ];
  for (const [name, slug] of cases) {
    assert.equal(lib.slugOf(name), slug, name);
    assert.ok(lib.isSlug(slug), `${slug} is not a slug by isSlug`);
  }
  for (const bad of ['', 'Doctor-Doom', '../x', 'a/b', 'a.b', '-a', 'a-', 'a--b', 'a b']) {
    assert.equal(lib.isSlug(bad), false, `"${bad}" passed as a slug`);
  }
});

test('personal-tier: a slug writes only inside its own folder', () => {
  assert.throws(() => lib.slugDir('../escape'), /not a slug/);
  assert.throws(() => lib.insideSlug('doctor-doom', '../other/model.glb'), /outside/);
  assert.throws(() => lib.insideSlug('doctor-doom', '/tmp/model.glb'), /outside/);
  assert.ok(lib.insideSlug('doctor-doom', 'preview/front.png').startsWith(lib.slugDir('doctor-doom')));
  assert.ok(lib.slugDir('doctor-doom').startsWith(lib.MODELS_DIR));
});

// ---------------------------------------------------------------------------
// The manifest
// ---------------------------------------------------------------------------

function validManifest(): Record<string, unknown> {
  const joints = Object.fromEntries(lib.OUR_JOINTS.map((j) => [j, { primary: `${j}.src`, followers: [], by: 'name' }]));
  return {
    _what: 'a test manifest',
    version: 1,
    slug: 'doctor-doom',
    dresses: [{ card: 'Doctor Doom' }, { seat: 'opp' }],
    model: 'model.glb',
    source: { file: 'doctor_doom.zip', bytes: 3429964, sha256: 'a'.repeat(64), sourceTxt: 'SOURCE.txt' },
    credits: 'This work is based on "X" by Y licensed under CC-BY-4.0',
    licence: 'CC-BY-4.0',
    rig: { convention: 'autoRigPro', mapFile: null, joints },
    triangles: { source: 17473, render: 14614, budget: 6000, after: 5996 },
    pose: { before: { verdict: 'A' }, fix: 't', after: { verdict: 'T' } },
    skinned: [{ part: 'CLOAK', rule: 'height:spine_03/spine_02/pelvis', vertices: 324 }],
    textures: [{ name: 'HOOD_baseColor.png', slot: 'baseColor', size: [1024, 1024], bytes: 1, downscaled: false }],
    dropped: { controlMeshes: 59 },
    units: { height: 1.9139, facing: '+z' },
    prepared: { tool: 'tools/personal/prepare.mjs', date: '2026-09-28T00:00:00.000Z', budget: 6000 },
  };
}

test('personal-tier: a well-formed manifest validates', () => {
  assert.deepEqual(lib.validateManifest(validManifest()), []);
});

test('personal-tier: the manifest validator names each defect', () => {
  const defects: [string, (m: Record<string, unknown>) => void, RegExp][] = [
    ['an unknown key', (m) => (m['colour'] = 'green'), /unknown key "colour"/],
    ['a missing key', (m) => delete m['credits'], /missing "credits"/],
    ['a bad slug', (m) => (m['slug'] = 'Doctor Doom'), /slug/],
    ['no dresses', (m) => (m['dresses'] = []), /at least one/],
    ['card and seat in one entry', (m) => (m['dresses'] = [{ card: 'X', seat: 'opp' }]), /exactly one/],
    ['a seat that is not one', (m) => (m['dresses'] = [{ seat: 'villain' }]), /seat must be one of/],
    ['a model path that climbs out', (m) => (m['model'] = '../model.glb'), /relative \.glb/],
    ['a model that is not a .glb', (m) => (m['model'] = 'model.fbx'), /relative \.glb/],
    ['a source with no sha256', (m) => (m['source'] = { file: 'x.zip', bytes: 1 }), /source/],
    ['an empty credit', (m) => (m['credits'] = ' '), /credit/],
    ['a joint missing from the rig', (m) => delete (m['rig'] as { joints: Record<string, unknown> }).joints['Head'], /rig\.joints\.Head is missing/],
    ['a joint that is not ours', (m) => ((m['rig'] as { joints: Record<string, unknown> }).joints['tail_01'] = { primary: null, followers: [] }), /not one of our joints/],
    ['over the budget', (m) => (m['triangles'] = { source: 1, render: 1, budget: 6000, after: 6001 }), /over the budget/],
    ['an unknown pose fix', (m) => (m['pose'] = { before: {}, fix: 'a', after: {} }), /pose/],
    ['a 2048 px texture', (m) => (m['textures'] = [{ name: 'x', slot: 'baseColor', size: [2048, 2048] }]), /1024/],
    ['a texture in another slot', (m) => (m['textures'] = [{ name: 'x', slot: 'emissive', size: [16, 16] }]), /baseColor or normal/],
    ['a model not facing +z', (m) => (m['units'] = { height: 1.9, facing: '-z' }), /facing/],
    ['version 2', (m) => (m['version'] = 2), /version/],
  ];
  for (const [what, spoil, expect] of defects) {
    const m = validManifest();
    spoil(m);
    const errors = lib.validateManifest(m);
    assert.ok(errors.length > 0, `${what}: the validator passed it`);
    assert.ok(
      errors.some((e) => expect.test(e)),
      `${what}: expected an error matching ${String(expect)}, got ${JSON.stringify(errors)}`,
    );
  }
  assert.deepEqual(lib.validateManifest('not an object'), ['the manifest is not a JSON object']);
});

// ---------------------------------------------------------------------------
// Our joints are the build's
// ---------------------------------------------------------------------------

test("personal-tier: our 22 joints are the build's retarget joints, and the agent's hierarchy", async () => {
  const manifest = JSON.parse(readFileSync(new URL('../../tools/assets-manifest.json', import.meta.url), 'utf8')) as {
    rigs: { ubc: { retarget: { joints: string[] } } };
  };
  assert.deepEqual(lib.OUR_JOINTS, manifest.rigs.ubc.retarget.joints, 'lib.mjs OUR_JOINTS drifted from tools/assets-manifest.json');
  const bytes = readFileSync(new URL('../public/models/figures.glb', import.meta.url));
  const doc = (await lib.readDocument(new Uint8Array(bytes))) as Document;
  const agent = doc.getRoot().listNodes().find((n) => n.getName() === 'agent');
  assert.ok(agent !== undefined, 'figures.glb has no agent');
  const skin = agent.listChildren().find((n) => n.getSkin() !== null)?.getSkin();
  assert.ok(skin, 'the agent has no skin');
  for (const joint of skin.listJoints()) {
    const ours = lib.OUR_PARENT[joint.getName()];
    if (ours === undefined) continue;
    assert.equal(joint.getParentNode()?.getName(), ours, `${joint.getName()}'s parent in figures.glb is not OUR_PARENT's ${ours}`);
  }
});

// ---------------------------------------------------------------------------
// The rig map, over synthetic joint lists
// ---------------------------------------------------------------------------

/** Auto-Rig Pro's names as a Sketchfab export spells them (Doom's, suffixes and controllers included). */
const ARP = [
  'GLTF_created_0_rootJoint',
  'c_pos_367',
  'c_traj_362',
  'root.x_139',
  'thigh.l_159',
  'thigh_twist.l_160',
  'thigh_stretch.l_258',
  'leg_stretch.l_255',
  'leg_twist.l_254',
  'foot.l_146',
  'toes_01.l_144',
  'thigh.r_185',
  'thigh_twist.r_186',
  'thigh_stretch.r_259',
  'leg_stretch.r_257',
  'leg_twist.r_256',
  'foot.r_172',
  'toes_01.r_170',
  'spine_01.x_191',
  'spine_02.x_193',
  'spine_03.x_246',
  'neck.x_198',
  'neck_twist.x_197',
  'head.x_251',
  'shoulder.l_222',
  'arm_twist.l_227',
  'c_arm_twist_offset.l_226',
  'arm_stretch.l_260',
  'forearm_stretch.l_263',
  'forearm_twist.l_262',
  'hand.l_312',
  'c_index1_base.l_301',
  'shoulder.r_205',
  'arm_twist.r_212',
  'c_arm_twist_offset.r_211',
  'arm_stretch.r_261',
  'forearm_stretch.r_265',
  'forearm_twist.r_264',
  'hand.r_360',
  'c_foot_ik.l_406',
  'c_hand_ik.r_408',
];
const MIXAMO = [
  'mixamorig:Hips',
  'mixamorig:Spine',
  'mixamorig:Spine1',
  'mixamorig:Spine2',
  'mixamorig:Neck',
  'mixamorig:Head',
  'mixamorig:HeadTop_End',
  ...['Left', 'Right'].flatMap((s) => [
    `mixamorig:${s}Shoulder`,
    `mixamorig:${s}Arm`,
    `mixamorig:${s}ForeArm`,
    `mixamorig:${s}Hand`,
    `mixamorig:${s}HandIndex1`,
    `mixamorig:${s}UpLeg`,
    `mixamorig:${s}Leg`,
    `mixamorig:${s}Foot`,
    `mixamorig:${s}ToeBase`,
    `mixamorig:${s}Toe_End`,
  ]),
];
/** UE5's mannequin (spine_01..05, neck_01..02, twist bones, IK bones). */
const UNREAL = [
  'root',
  'pelvis',
  'spine_01',
  'spine_02',
  'spine_03',
  'spine_04',
  'spine_05',
  'neck_01',
  'neck_02',
  'head',
  ...['l', 'r'].flatMap((s) => [
    `clavicle_${s}`,
    `upperarm_${s}`,
    `upperarm_twist_01_${s}`,
    `lowerarm_${s}`,
    `lowerarm_twist_01_${s}`,
    `hand_${s}`,
    `index_01_${s}`,
    `thigh_${s}`,
    `thigh_twist_01_${s}`,
    `calf_${s}`,
    `calf_twist_01_${s}`,
    `foot_${s}`,
    `ball_${s}`,
  ]),
  'ik_foot_root',
  'ik_hand_root',
];
/** VRoid Studio's export of a VRM humanoid. */
const VROID = [
  'Root',
  'J_Bip_C_Hips',
  'J_Bip_C_Spine',
  'J_Bip_C_Chest',
  'J_Bip_C_UpperChest',
  'J_Bip_C_Neck',
  'J_Bip_C_Head',
  ...['L', 'R'].flatMap((s) => [
    `J_Bip_${s}_Shoulder`,
    `J_Bip_${s}_UpperArm`,
    `J_Bip_${s}_LowerArm`,
    `J_Bip_${s}_Hand`,
    `J_Bip_${s}_Index1`,
    `J_Bip_${s}_UpperLeg`,
    `J_Bip_${s}_LowerLeg`,
    `J_Bip_${s}_Foot`,
    `J_Bip_${s}_ToeBase`,
  ]),
  'J_Sec_Hair1_01',
];

test('personal-tier: Auto-Rig Pro is detected, with the joint at each head (twist first up top, stretch first below)', () => {
  const map = lib.detectRigMap(ARP);
  assert.equal(map.convention, 'autoRigPro');
  assert.deepEqual(map.missing, []);
  assert.equal(map.joints['pelvis']?.primary, 'root.x_139');
  assert.equal(map.joints['upperarm_l']?.primary, 'arm_twist.l_227', 'the shoulder is arm_twist’s head, not arm_stretch’s');
  assert.deepEqual(map.joints['upperarm_l']?.followers, ['arm_stretch.l_260', 'c_arm_twist_offset.l_226']);
  assert.equal(map.joints['lowerarm_r']?.primary, 'forearm_stretch.r_265');
  assert.equal(map.joints['thigh_l']?.primary, 'thigh_twist.l_160', 'not the unweighted mechanism bone thigh.l');
  assert.equal(map.joints['calf_l']?.primary, 'leg_stretch.l_255');
  assert.equal(map.joints['ball_r']?.primary, 'toes_01.r_170');
  assert.equal(map.joints['neck_01']?.primary, 'neck.x_198');
  assert.equal(map.joints['Head']?.primary, 'head.x_251');
});

test('personal-tier: Mixamo is detected through its namespace', () => {
  const map = lib.detectRigMap(MIXAMO);
  assert.equal(map.convention, 'mixamo');
  assert.deepEqual(map.missing, []);
  assert.equal(map.joints['pelvis']?.primary, 'mixamorig:Hips');
  assert.equal(map.joints['spine_03']?.primary, 'mixamorig:Spine2');
  assert.equal(map.joints['upperarm_l']?.primary, 'mixamorig:LeftArm');
  assert.equal(map.joints['lowerarm_r']?.primary, 'mixamorig:RightForeArm');
  assert.equal(map.joints['thigh_r']?.primary, 'mixamorig:RightUpLeg');
  assert.equal(map.joints['ball_l']?.primary, 'mixamorig:LeftToeBase');
  // A second Mixamo namespace (`mixamorig1:`, from a re-upload) reads the same.
  assert.equal(lib.detectRigMap(MIXAMO.map((n) => n.replace('mixamorig:', 'mixamorig1:'))).convention, 'mixamo');
});

test('personal-tier: Unreal (UE5) is detected, the extra spine and neck joints merged', () => {
  const map = lib.detectRigMap(UNREAL);
  assert.equal(map.convention, 'unreal');
  assert.deepEqual(map.missing, []);
  assert.equal(map.joints['Head']?.primary, 'head');
  assert.deepEqual(map.joints['spine_03']?.followers, ['spine_04', 'spine_05']);
  assert.deepEqual(map.joints['neck_01']?.followers, ['neck_02']);
  assert.deepEqual(map.joints['upperarm_l']?.followers, ['upperarm_twist_01_l']);
  // A Sketchfab export's `_<n>` suffix is read through; `spine_01` is not read as `spine` + `_01`.
  const suffixed = lib.detectRigMap(UNREAL.map((n, i) => `${n}_${String(100 + i)}`));
  assert.equal(suffixed.convention, 'unreal');
  assert.equal(suffixed.joints['spine_01']?.primary, 'spine_01_102');
});

test('personal-tier: VRM (VRoid names) is detected, and a VRM humanoid table wins', () => {
  const map = lib.detectRigMap(VROID);
  assert.equal(map.convention, 'vrm');
  assert.deepEqual(map.missing, []);
  assert.equal(map.joints['spine_02']?.primary, 'J_Bip_C_Chest');
  assert.equal(map.joints['clavicle_r']?.primary, 'J_Bip_R_Shoulder');
  // A file whose node names are nothing like any convention, with its own table.
  const odd = ['n0', 'n1', 'n2', 'n3'];
  const table = lib.detectRigMap(odd, { vrmHumanBones: { hips: 'n0', head: 'n1', leftUpperArm: 'n2', leftLowerArm: 'n3' } });
  assert.equal(table.joints['pelvis']?.primary, 'n0');
  assert.equal(table.joints['pelvis']?.by, 'vrm');
  assert.equal(table.joints['lowerarm_l']?.primary, 'n3');
  assert.ok(table.missing.includes('thigh_l'));
});

test('personal-tier: bones.json overrides the auto map joint by joint, and is checked', () => {
  const map = lib.detectRigMap(ARP, { file: { joints: { pelvis: 'c_traj_362', hand_l: ['hand.l_312', 'c_index1_base.l_301'] } } });
  assert.equal(map.joints['pelvis']?.primary, 'c_traj_362');
  assert.equal(map.joints['pelvis']?.by, 'file');
  assert.deepEqual(map.joints['hand_l']?.followers, ['c_index1_base.l_301']);
  assert.equal(map.joints['Head']?.by, 'name', 'a joint the file does not name keeps the auto map');
  assert.throws(() => lib.detectRigMap(ARP, { file: { joints: { tail: 'root.x_139' } } }), /not one of our joints/);
  assert.throws(() => lib.detectRigMap(ARP, { file: { joints: { pelvis: 'no_such_bone' } } }), /not a joint of this skin/);
  assert.throws(() => lib.detectRigMap(ARP, { file: { pelvis: 'root.x_139' } }), /bones\.json must be/);
});

test('personal-tier: an unknown rig maps nothing, and says which core joints are missing', () => {
  const map = lib.detectRigMap(['Bone', 'Bone.001', 'Bone.002']);
  assert.equal(map.convention, 'none');
  for (const core of lib.CORE_JOINTS) assert.ok(map.missing.includes(core), `${core} not reported missing`);
});

// ---------------------------------------------------------------------------
// Inspection, on a tiny skinned GLB made here (a box on two bones: CC0 by construction)
// ---------------------------------------------------------------------------

/**
 * A box on two bones — `upperarm_l` at the shoulder and `lowerarm_l` at the
 * elbow, the arm `angle` degrees below the horizontal — plus an unskinned
 * `Cape` quad, an Auto-Rig Pro control shape under `cs_grp` and a mesh with an
 * Unreal content name. Inverse bind matrices are the inverse of each joint's
 * world transform, so the rest pose is the bind pose.
 */
async function fixture(angle: number): Promise<Uint8Array> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const rad = (angle * Math.PI) / 180;
  const shoulder = [0.2, 1.4, 0];
  const len = 0.3;
  const elbowLocal = [len * Math.cos(rad), -len * Math.sin(rad), 0];
  const elbow = shoulder.map((v, i) => v + (elbowLocal[i] ?? 0));
  const armature = doc.createNode('Armature');
  const upper = doc.createNode('upperarm_l').setTranslation(shoulder as [number, number, number]);
  const lower = doc.createNode('lowerarm_l').setTranslation(elbowLocal as [number, number, number]);
  armature.addChild(upper);
  upper.addChild(lower);
  const ibm = new Float32Array(32);
  for (const [k, p] of [shoulder, elbow].entries()) {
    ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -(p[0] ?? 0), -(p[1] ?? 0), -(p[2] ?? 0), 1], k * 16);
  }
  const skin = doc
    .createSkin('arm')
    .addJoint(upper)
    .addJoint(lower)
    .setSkeleton(upper)
    .setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buffer));
  // The box: its four shoulder-end corners on joint 0, its four elbow-end corners on joint 1.
  const positions: number[] = [];
  const joints: number[] = [];
  const weights: number[] = [];
  for (const [k, c] of [shoulder, elbow].entries()) {
    for (const [dy, dz] of [
      [-0.04, -0.04],
      [0.04, -0.04],
      [0.04, 0.04],
      [-0.04, 0.04],
    ] as const) {
      positions.push(c[0] ?? 0, (c[1] ?? 0) + dy, (c[2] ?? 0) + dz);
      joints.push(k, 0, 0, 0);
      weights.push(1, 0, 0, 0);
    }
  }
  const quads = [
    [0, 1, 5, 4],
    [1, 2, 6, 5],
    [2, 3, 7, 6],
    [3, 0, 4, 7],
    [0, 3, 2, 1],
    [4, 5, 6, 7],
  ];
  const indices = quads.flatMap(([a, b, c, d]) => [a, b, c, a, c, d] as number[]);
  const material = doc.createMaterial('Skin');
  const prim = doc
    .createPrimitive()
    .setMaterial(material)
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(positions)).setBuffer(buffer))
    .setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(new Uint8Array(joints)).setBuffer(buffer))
    .setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(new Float32Array(weights)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(indices)).setBuffer(buffer));
  const quad = (name: string, y: number): ReturnType<Document['createMesh']> =>
    doc
      .createMesh(name)
      .addPrimitive(
        doc
          .createPrimitive()
          .setMaterial(material)
          .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array([0, y, 0, 0.2, y, 0, 0.2, y + 0.2, 0, 0, y + 0.2, 0])).setBuffer(buffer))
          .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array([0, 1, 2, 0, 2, 3])).setBuffer(buffer)),
      );
  const scene = doc.createScene('Scene');
  const controls = doc.createNode('cs_grp').addChild(doc.createNode('cs_circle_ik').setMesh(quad('Object_1', 0)));
  scene
    .addChild(armature)
    .addChild(doc.createNode('Arm').setMesh(doc.createMesh('Arm').addPrimitive(prim)).setSkin(skin))
    .addChild(doc.createNode('Cape').setMesh(quad('Cape', 0.5)))
    .addChild(doc.createNode('SK_Hero_Belt').setMesh(quad('SK_Hero_Belt', 1.0)).setSkin(null))
    .addChild(controls);
  return new NodeIO().writeBinary(doc);
}

test('personal-tier: the rest pose is measured from the bind matrices — A, T and arms down', async () => {
  for (const [angle, verdict] of [
    [45, 'A'],
    [30, 'A'],
    [0, 'T'],
    [8, 'T'],
    [80, 'down'],
  ] as const) {
    const bytes = await fixture(angle);
    const report = lib.inspectDocument(await lib.readDocument(bytes), lib.rawJsonOf(bytes));
    assert.ok(report.restPose !== null, 'no rest pose measured');
    assert.equal(report.restPose.verdict, verdict, `${String(angle)}° read as ${report.restPose.verdict}`);
    assert.ok(Math.abs((report.restPose.l ?? NaN) - angle) < 0.2, `${String(angle)}° measured as ${String(report.restPose.l)}°`);
    assert.equal(report.restPose.r, null, 'a right arm the fixture does not have was measured');
    assert.equal(report.rigMap?.convention, 'unreal');
  }
  // One arm down and one up is not an A-pose.
  assert.equal(lib.armAngles({ upperarm_l: [0, 1, 0], lowerarm_l: [0.3, 0.7, 0], upperarm_r: [0, 1, 0], lowerarm_r: [-0.3, 1, 0] }).verdict, 'posed');
});

test('personal-tier: control shapes, unskinned meshes and game-asset names are flagged (never refused)', async () => {
  const bytes = await fixture(45);
  const report = lib.inspectDocument(await lib.readDocument(bytes), lib.rawJsonOf(bytes));
  assert.deepEqual(
    report.flags.controlMeshes.map((c) => c.node),
    ['cs_circle_ik'],
    'the Auto-Rig Pro control shape under cs_grp was not flagged',
  );
  assert.ok(/cs_/.test(report.flags.controlMeshes[0]?.reason ?? ''), 'the control reason does not name the pattern');
  assert.deepEqual(report.flags.unskinnedMeshes.map((u) => u.node).sort(), ['Cape', 'SK_Hero_Belt']);
  assert.ok(
    report.flags.gameAssetNames.some((g) => g.name === 'SK_Hero_Belt'),
    'an Unreal content name was not reported',
  );
  assert.equal(report.triangles.total, 12 + 2 + 2 + 2);
  assert.equal(report.triangles.control, 2);
  assert.equal(report.triangles.render, 16);
});

// ---------------------------------------------------------------------------
// The retarget is the build's
// ---------------------------------------------------------------------------

test("personal-tier: retarget.mjs reproduces the build's clips (agent → hero ≡ the library → hero)", async () => {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
  const { worldDeltaRetarget } = (await import(new URL('../../tools/personal/retarget.mjs', import.meta.url).href)) as {
    worldDeltaRetarget: (three: unknown, spec: Record<string, unknown>) => THREE.AnimationClip;
  };
  const models = JSON.parse(readFileSync(new URL('../src/arena/figures/models.json', import.meta.url), 'utf8')) as {
    models: Record<string, { node: string; clips: Record<string, string> }>;
  };
  const bytes = readFileSync(new URL('../public/models/figures.glb', import.meta.url));
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] }>((ok, bad) =>
    loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', ok as never, bad),
  );
  const rig = (id: string) => {
    const root = gltf.scene.getObjectByName(models.models[id]!.node)!;
    const bone = (name: string): THREE.Object3D | null => {
      let found: THREE.Object3D | null = null;
      root.traverse((o) => {
        if (found === null && (o as THREE.Bone).isBone && (o.name === name || new RegExp(`^${name}_\\d+$`).test(o.name))) found = o;
      });
      return found;
    };
    return { root, bone };
  };
  const agent = rig('agent');
  const hero = rig('hero');
  const angle = (a: THREE.Quaternion, b: THREE.Quaternion): number => (2 * Math.acos(Math.min(1, Math.abs(a.clone().invert().multiply(b).w))) * 180) / Math.PI;
  let worst = 0;
  for (const key of ['attack', 'die']) {
    const source = gltf.animations.find((a) => a.name === models.models['agent']!.clips[key])!;
    const baked = gltf.animations.find((a) => a.name === models.models['hero']!.clips[key])!;
    const ours = worldDeltaRetarget(THREE, { source: agent, target: hero, clip: source, joints: lib.OUR_JOINTS });
    for (const phase of [0.3, 0.7]) {
      const pose = (clip: THREE.AnimationClip): THREE.Quaternion[] => {
        const mixer = new THREE.AnimationMixer(hero.root);
        const action = mixer.clipAction(clip);
        action.play();
        action.time = phase * clip.duration;
        mixer.update(0);
        const out = lib.OUR_JOINTS.map((j) => hero.bone(j)!.quaternion.clone());
        mixer.stopAllAction();
        mixer.uncacheRoot(hero.root);
        return out;
      };
      const want = pose(baked);
      const got = pose(ours);
      want.forEach((q, i) => (worst = Math.max(worst, angle(q, got[i]!))));
    }
  }
  assert.ok(worst < 2, `the retarget drifted from the build's: worst joint ${worst.toFixed(2)}° (the clip compression alone is under 1°)`);
});

// ---------------------------------------------------------------------------
// The cloak's height rule
// ---------------------------------------------------------------------------

test('personal-tier: the height rule binds an unskinned part to the spine by height', () => {
  const heights = { pelvis: 1.0, spine_02: 1.2, spine_03: 1.4 };
  const near = (a: Record<string, number>, b: Record<string, number>): void => {
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), `${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
    for (const k of Object.keys(b)) assert.ok(Math.abs((a[k] ?? NaN) - (b[k] ?? NaN)) < 1e-9, `${k}: ${String(a[k])} vs ${String(b[k])}`);
  };
  near(lib.heightWeights(1.6, heights), { spine_03: 1 });
  near(lib.heightWeights(1.4, heights), { spine_03: 1 });
  near(lib.heightWeights(1.3, heights), { spine_02: 0.5, spine_03: 0.5 });
  near(lib.heightWeights(1.25, heights), { spine_02: 0.75, spine_03: 0.25 });
  near(lib.heightWeights(1.1, heights), { pelvis: 0.5, spine_02: 0.5 });
  near(lib.heightWeights(1.0, heights), { pelvis: 1 });
  near(lib.heightWeights(0.2, heights), { pelvis: 1 });
  assert.throws(() => lib.heightWeights(1, { pelvis: 1 }), /heights are needed/);
});

// ---------------------------------------------------------------------------
// judgeBody: the checks a wrong rig map fails (D192)
// ---------------------------------------------------------------------------

/** A stick figure's body stats, facing +z with its left at +x: every joint weighted, each foot's mass in front of its ankle. */
function stick(): BodyStats {
  const joints: Record<string, number[]> = {
    pelvis: [0, 1.0, 0],
    spine_01: [0, 1.1, 0],
    spine_02: [0, 1.22, 0],
    spine_03: [0, 1.34, 0],
    neck_01: [0, 1.5, 0],
    Head: [0, 1.6, 0],
  };
  for (const [s, x] of [
    ['l', 1],
    ['r', -1],
  ] as const) {
    Object.assign(joints, {
      [`clavicle_${s}`]: [0.05 * x, 1.45, 0],
      [`upperarm_${s}`]: [0.18 * x, 1.45, 0],
      [`lowerarm_${s}`]: [0.46 * x, 1.45, 0],
      [`hand_${s}`]: [0.72 * x, 1.45, 0],
      [`thigh_${s}`]: [0.1 * x, 0.95, 0],
      [`calf_${s}`]: [0.1 * x, 0.5, 0],
      [`foot_${s}`]: [0.1 * x, 0.08, 0],
      [`ball_${s}`]: [0.1 * x, 0.02, 0.12],
    });
  }
  const mass: Record<string, Mass> = {};
  for (const [j, p] of Object.entries(joints)) {
    const forward = /^(foot|ball)_/.test(j) ? 0.06 : 0;
    mass[j] = { at: [p[0] ?? 0, p[1] ?? 0, (p[2] ?? 0) + forward], n: 100, weight: 100 };
  }
  return { joints, mass, totalWeight: 100 * Object.keys(joints).length, height: 1.8 };
}
const placementOk = { byAncestry: 0, byPosition: 0, byPositionWeight: 0 };
const swapSides = (b: BodyStats, stems: string[]): BodyStats => {
  const out = structuredClone(b);
  for (const stem of stems) {
    for (const [a, c] of [
      [`${stem}_l`, `${stem}_r`],
      [`${stem}_r`, `${stem}_l`],
    ] as const) {
      out.joints[a] = b.joints[c]!;
      out.mass[a] = b.mass[c]!;
    }
  }
  return out;
};
/** Turned round (as prepare turns a figure whose map named its arms the wrong way round). */
const turned = (b: BodyStats): BodyStats => {
  const out = structuredClone(b);
  for (const p of [...Object.values(out.joints), ...Object.values(out.mass).map((m) => m.at)]) {
    p[0] = -(p[0] ?? 0);
    p[2] = -(p[2] ?? 0);
  }
  return out;
};

test('personal-tier: judgeBody passes a body shaped like the agent', () => {
  const j = lib.judgeBody(stick(), stick(), { placement: placementOk });
  assert.deepEqual(j.problems, []);
  assert.deepEqual(j.warnings, []);
  assert.ok((j.facing['l']?.forward ?? 0) > 0);
});

test('personal-tier: judgeBody fails a core joint with no weight, and warns for a synthesised one', () => {
  const body = stick();
  body.mass['hand_l'] = { at: [0.72, 1.45, 0], n: 0, weight: 0 };
  const j = lib.judgeBody(body, stick(), { placement: placementOk, joints: { hand_l: { primary: 'c_hand_fk.l', followers: [], primaryWeighted: false } } });
  assert.ok(j.problems.some((p) => /hand_l ← c_hand_fk\.l carries no skin weight/.test(p)), JSON.stringify(j.problems));
  assert.ok(j.warnings.some((w) => /hand_l stands where c_hand_fk\.l stands, which carries no weight/.test(w)));
  const clav = stick();
  clav.mass['clavicle_l'] = { at: [0.05, 1.45, 0], n: 0, weight: 0 };
  const s = lib.judgeBody(clav, stick(), { placement: placementOk, synthesised: ['clavicle_l'] });
  assert.deepEqual(s.problems, [], 'a synthesised joint with no weight is not a failure');
  assert.ok(s.warnings.some((w) => /clavicle_l was synthesised/.test(w)));
  const notCore = lib.judgeBody(clav, stick(), { placement: placementOk });
  assert.deepEqual(notCore.problems, [], 'a non-core joint with no weight is a warning');
  assert.ok(notCore.warnings.some((w) => /clavicle_l ← .* carries no skin weight/.test(w)));
});

test('personal-tier: judgeBody fails bones placed by position over the limit', () => {
  const over = lib.judgeBody(stick(), stick(), { placement: { byAncestry: 19, byPosition: 20, byPositionWeight: 0.0945 } });
  assert.ok(over.problems.some((p) => /20 weighted source bone\(s\), 9\.4% .* by POSITION/.test(p)), JSON.stringify(over.problems));
  const under = lib.judgeBody(stick(), stick(), { placement: { byAncestry: 0, byPosition: 1, byPositionWeight: 0.005 } });
  assert.deepEqual(under.problems, []);
  assert.ok(under.warnings.some((w) => /by POSITION/.test(w)));
  assert.ok(lib.judgeBody(stick(), stick(), {}).warnings.some((w) => /no rig\.placement/.test(w)), 'an old manifest is named');
});

test('personal-tier: judgeBody fails swapped sides, a figure facing backwards, and a bone mapped up the wrong segment', () => {
  // The arms named the wrong way round: prepare turns the figure to put "upperarm_l" at +x, so the legs land on the wrong side.
  const arms = turned(swapSides(stick(), ['upperarm', 'lowerarm', 'hand']));
  const a = lib.judgeBody(arms, stick(), { placement: placementOk });
  assert.ok(a.problems.some((p) => /thigh_l stands on the figure's right of thigh_r/.test(p)), JSON.stringify(a.problems));
  assert.ok(a.problems.some((p) => /the vertices thigh_l carries sit at x -/.test(p)));
  assert.ok(a.problems.some((p) => /left foot points BACKWARDS/.test(p)));
  // EVERY side swapped: the sides agree after the turn, and only the facing (and the toes) say so.
  const mirror = turned(swapSides(stick(), ['clavicle', 'upperarm', 'lowerarm', 'hand', 'thigh', 'calf', 'foot', 'ball']));
  const m = lib.judgeBody(mirror, stick(), { placement: placementOk });
  assert.ok(!m.problems.some((p) => /stands on the figure's/.test(p)), 'a full mirror keeps its sides consistent');
  assert.ok(m.problems.some((p) => /right foot points BACKWARDS/.test(p)), JSON.stringify(m.problems));
  assert.ok(m.problems.some((p) => /foot_l → ball_l points/.test(p)));
  // The thigh and the calf mapped to each other.
  const legs = stick();
  [legs.joints['thigh_l'], legs.joints['calf_l']] = [legs.joints['calf_l']!, legs.joints['thigh_l']!];
  const l = lib.judgeBody(legs, stick(), { placement: placementOk });
  assert.ok(l.problems.some((p) => /thigh_l → calf_l points 1\d\d° away/.test(p)), JSON.stringify(l.problems));
});

// ---------------------------------------------------------------------------
// The preview browser stayed on the loopback: its net log, read back
// ---------------------------------------------------------------------------

test("personal-tier: the net-log reader tells tried from reached", () => {
  const T = { URL_REQUEST_START_JOB: 1, UDP_CONNECT: 2, UDP_BYTES_SENT: 3, TCP_CONNECT_ATTEMPT: 4, DNS_TRANSACTION: 5, HTTP_TRANSACTION_READ_RESPONSE_HEADERS: 6 };
  const ev = (type: number, id: number, params: Record<string, unknown> = {}, phase = 0) => ({ type, source: { id, type: 0 }, phase, params });
  const clean = [
    ev(T.URL_REQUEST_START_JOB, 1, { url: 'http://127.0.0.1:9008/model.glb' }),
    ev(T.URL_REQUEST_START_JOB, 2, { url: 'https://accounts.google.com/ListAccounts' }),
    ev(T.UDP_CONNECT, 3, { address: '[2001:4860:4860::8888]:443' }, 1),
  ];
  const log = (events: unknown[]) => JSON.stringify({ constants: { logEventTypes: T }, events });
  const ok = lib.netLogReport(log(clean));
  assert.equal(ok.loopback, 1);
  assert.deepEqual([...ok.attempted], [['accounts.google.com', 1]]);
  assert.deepEqual(ok.udpAway, ['2001:4860:4860::8888']);
  assert.deepEqual([ok.tcpAway, ok.sentAway, ok.answered, ok.dnsQueries], [[], [], [], 0]);
  // A log the browser's exit cut short still reads.
  const cut = log(clean).replace(/\]\}$/, ',');
  assert.equal(lib.netLogReport(cut).loopback, 1);
  // What check.mjs fails on: a TCP connection, a byte sent, a DNS query, an answer.
  const bad = lib.netLogReport(
    log([
      ...clean,
      ev(T.TCP_CONNECT_ATTEMPT, 4, { address: '142.250.1.1:443' }),
      ev(T.UDP_BYTES_SENT, 3, { byte_count: 40 }),
      ev(T.DNS_TRANSACTION, 5, { hostname: 'accounts.google.com' }, 1),
      ev(T.HTTP_TRANSACTION_READ_RESPONSE_HEADERS, 2, {}),
      ev(T.TCP_CONNECT_ATTEMPT, 6, { address: '127.0.0.1:9008' }),
    ]),
  );
  assert.deepEqual(bad.tcpAway, ['142.250.1.1']);
  assert.deepEqual(bad.sentAway, ['2001:4860:4860::8888']);
  assert.equal(bad.dnsQueries, 1);
  assert.deepEqual(bad.answered, ['accounts.google.com']);
});

// ---------------------------------------------------------------------------
// The whole pipeline, end to end, on a figure of boxes (CC0 by construction)
// ---------------------------------------------------------------------------

const MIXAMO_PARENT: Record<string, string | null> = { Hips: null, Spine: 'Hips', Spine1: 'Spine', Spine2: 'Spine1', Neck: 'Spine2', Head: 'Neck', HeadTop_End: 'Head' };
for (const s of ['Left', 'Right']) {
  Object.assign(MIXAMO_PARENT, {
    [`${s}Shoulder`]: 'Spine2',
    [`${s}Arm`]: `${s}Shoulder`,
    [`${s}ForeArm`]: `${s}Arm`,
    [`${s}Hand`]: `${s}ForeArm`,
    [`${s}HandIndex1`]: `${s}Hand`,
    [`${s}UpLeg`]: 'Hips',
    [`${s}Leg`]: `${s}UpLeg`,
    [`${s}Foot`]: `${s}Leg`,
    [`${s}ToeBase`]: `${s}Foot`,
  });
}

/**
 * A figure of boxes on a 23-bone Mixamo skeleton — 1.8 m, facing +z, the arms
 * `armDeg` below the horizontal — one box per bone from its head towards its
 * child (weighted wholly to it), `HandIndex1` a leaf with NO weight (the bone a
 * wrong map will name), and a `Cape` behind the back with no skin at all.
 */
async function boxFigure(armDeg: number): Promise<Uint8Array> {
  const rad = (armDeg * Math.PI) / 180;
  const P: Record<string, number[]> = { Hips: [0, 1.0, 0], Spine: [0, 1.1, 0], Spine1: [0, 1.22, 0], Spine2: [0, 1.34, 0], Neck: [0, 1.5, 0], Head: [0, 1.6, 0], HeadTop_End: [0, 1.8, 0] };
  for (const [s, x] of [
    ['Left', 1],
    ['Right', -1],
  ] as const) {
    const at = (from: number[], len: number) => [(from[0] ?? 0) + x * len * Math.cos(rad), (from[1] ?? 0) - len * Math.sin(rad), 0];
    P[`${s}Shoulder`] = [0.05 * x, 1.45, 0];
    P[`${s}Arm`] = [0.18 * x, 1.45, 0];
    P[`${s}ForeArm`] = at(P[`${s}Arm`]!, 0.28);
    P[`${s}Hand`] = at(P[`${s}ForeArm`]!, 0.26);
    P[`${s}HandIndex1`] = at(P[`${s}Hand`]!, 0.08);
    P[`${s}UpLeg`] = [0.1 * x, 0.95, 0];
    P[`${s}Leg`] = [0.1 * x, 0.5, 0];
    P[`${s}Foot`] = [0.1 * x, 0.08, 0];
    P[`${s}ToeBase`] = [0.1 * x, 0.03, 0.13];
  }
  const names = Object.keys(MIXAMO_PARENT);
  const doc = new Document();
  const buffer = doc.createBuffer();
  const nodes = new Map<string, ReturnType<Document['createNode']>>();
  const armature = doc.createNode('Armature');
  for (const name of names) {
    const parent = MIXAMO_PARENT[name];
    const p = P[name]!;
    const q = parent === null || parent === undefined ? [0, 0, 0] : P[parent]!;
    const node = doc.createNode(`mixamorig:${name}`).setTranslation([(p[0] ?? 0) - (q[0] ?? 0), (p[1] ?? 0) - (q[1] ?? 0), (p[2] ?? 0) - (q[2] ?? 0)]);
    nodes.set(name, node);
    (parent === null || parent === undefined ? armature : nodes.get(parent)!).addChild(node);
  }
  const ibm = new Float32Array(names.length * 16);
  names.forEach((name, k) => {
    const p = P[name]!;
    ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -(p[0] ?? 0), -(p[1] ?? 0), -(p[2] ?? 0), 1], k * 16);
  });
  const skin = doc.createSkin('body').setSkeleton(nodes.get('Hips')!).setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buffer));
  for (const name of names) skin.addJoint(nodes.get(name)!);
  // One box per weighted bone, from its head towards its (first) child; a leaf's box points on along its parent's line.
  const positions: number[] = [];
  const normals: number[] = [];
  const joints: number[] = [];
  const weights: number[] = [];
  const indices: number[] = [];
  const box = (a: number[], b: number[], half: number, joint: number): void => {
    const d = [(b[0] ?? 0) - (a[0] ?? 0), (b[1] ?? 0) - (a[1] ?? 0), (b[2] ?? 0) - (a[2] ?? 0)];
    const len = Math.hypot(d[0]!, d[1]!, d[2]!);
    const u = d.map((x) => x / len);
    const helper = Math.abs(u[1]!) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const cross = (x: number[], y: number[]) => [x[1]! * y[2]! - x[2]! * y[1]!, x[2]! * y[0]! - x[0]! * y[2]!, x[0]! * y[1]! - x[1]! * y[0]!];
    const v = cross(u, helper).map((x, _, arr) => x / Math.hypot(arr[0]!, arr[1]!, arr[2]!));
    const w = cross(u, v);
    const base = positions.length / 3;
    for (const [t, sv, sw] of [
      [0, -1, -1],
      [0, 1, -1],
      [0, 1, 1],
      [0, -1, 1],
      [1, -1, -1],
      [1, 1, -1],
      [1, 1, 1],
      [1, -1, 1],
    ] as const) {
      for (let k = 0; k < 3; k += 1) positions.push((a[k] ?? 0) + t * (d[k] ?? 0) + half * (sv * v[k]! + sw * w[k]!));
      const n = [sv * v[0]! + sw * w[0]!, sv * v[1]! + sw * w[1]!, sv * v[2]! + sw * w[2]!];
      const nl = Math.hypot(n[0]!, n[1]!, n[2]!);
      normals.push(n[0]! / nl, n[1]! / nl, n[2]! / nl);
      joints.push(joint, 0, 0, 0);
      weights.push(1, 0, 0, 0);
    }
    for (const [p, q, r, s] of [
      [0, 1, 5, 4],
      [1, 2, 6, 5],
      [2, 3, 7, 6],
      [3, 0, 4, 7],
      [0, 3, 2, 1],
      [4, 5, 6, 7],
    ] as const) {
      indices.push(base + p, base + q, base + r, base + p, base + r, base + s);
    }
  };
  names.forEach((name, k) => {
    if (/HandIndex1$/.test(name)) return; // the unweighted leaf
    const child = names.find((c) => MIXAMO_PARENT[c] === name && !/HandIndex1$/.test(c));
    const a = P[name]!;
    const parent = MIXAMO_PARENT[name];
    let b: number[];
    if (/Hand$/.test(name)) b = P[`${name}Index1`]!;
    else if (/^(Left|Right)(Arm|UpLeg)$/.test(name) || child === undefined) {
      b = child !== undefined ? P[child]! : a.map((x, i) => x + (x - (P[parent!]![i] ?? 0)) * 0.6);
    } else if (name === 'Hips') b = P['Spine']!;
    else b = P[child]!;
    if (name === 'Spine2') b = P['Neck']!;
    box(a, b, name === 'Hips' || /^Spine/.test(name) ? 0.12 : /Head/.test(name) ? 0.09 : 0.04, k);
  });
  const body = doc.createMaterial('Body');
  const prim = doc
    .createPrimitive()
    .setMaterial(body)
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(positions)).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(normals)).setBuffer(buffer))
    .setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(new Uint8Array(joints)).setBuffer(buffer))
    .setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(new Float32Array(weights)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(indices)).setBuffer(buffer));
  // The cape: an unskinned sheet behind the back, rows from the pelvis to the shoulders.
  const cape: number[] = [];
  const capeIdx: number[] = [];
  const rows = [0.6, 0.9, 1.1, 1.3, 1.45];
  for (const y of rows) cape.push(-0.15, y, -0.16, 0.15, y, -0.16);
  for (let r = 0; r < rows.length - 1; r += 1) capeIdx.push(2 * r, 2 * r + 1, 2 * r + 3, 2 * r, 2 * r + 3, 2 * r + 2);
  const capeMesh = doc
    .createMesh('Cape')
    .addPrimitive(
      doc
        .createPrimitive()
        .setMaterial(doc.createMaterial('Cape'))
        .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(cape)).setBuffer(buffer))
        .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(capeIdx)).setBuffer(buffer)),
    );
  doc
    .createScene('Scene')
    .addChild(armature)
    .addChild(doc.createNode('Body').setMesh(doc.createMesh('Body').addPrimitive(prim)).setSkin(skin))
    .addChild(doc.createNode('Cape').setMesh(capeMesh));
  return new NodeIO().writeBinary(doc);
}

const SLUG = `selftest-${String(process.pid)}`;
const node = (args: string[]): { status: number | null; out: string } => {
  try {
    return { status: 0, out: execFileSync(process.execPath, args, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    const e = err as { status: number | null; stdout?: string; stderr?: string };
    return { status: e.status, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

test('personal-tier: the whole pipeline on a figure of boxes — import, prepare (A → T, the cape by height), check, and the wrong maps it fails', { timeout: 120_000 }, async () => {
  const dir = lib.slugDir(SLUG);
  const createdPersonal = !existsSync(join(REPO, 'personal'));
  const createdModels = !existsSync(lib.MODELS_DIR);
  mkdirSync(dir, { recursive: true });
  try {
    writeFileSync(join(dir, 'figure.glb'), await boxFigure(45));
    const imported = node(['tools/personal/import.mjs', join(dir, 'figure.glb'), SLUG]);
    assert.equal(imported.status, 0, imported.out);
    assert.match(imported.out, /rig map\s+auto: Mixamo .* 22\/22/);
    assert.match(imported.out, /rest pose\s+A — upper arm 45° \(left\) \/ 45° \(right\)/);
    assert.match(imported.out, /unskinned\s+Cape .*follows nothing/);

    const prepared = node(['tools/personal/prepare.mjs', SLUG, '--card', 'Selftest Figure', '--budget', '600']);
    assert.equal(prepared.status, 0, prepared.out);
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as {
      pose: { before: { verdict: string }; after: { verdict: string; measuredFromWrittenFile: { l: number; r: number } } };
      skinned: { rule: string }[];
      rig: { convention: string; placement: { byPosition: number } };
    };
    assert.deepEqual(lib.validateManifest(manifest), []);
    assert.equal(manifest.rig.convention, 'mixamo');
    assert.equal(manifest.rig.placement.byPosition, 0);
    assert.equal(manifest.pose.before.verdict, 'A');
    assert.equal(manifest.pose.after.verdict, 'T');
    assert.ok(Math.abs(manifest.pose.after.measuredFromWrittenFile.l) < 0.5 && Math.abs(manifest.pose.after.measuredFromWrittenFile.r) < 0.5, JSON.stringify(manifest.pose));
    assert.deepEqual(manifest.skinned.map((x) => x.rule), ['height:spine_03/spine_02/pelvis']);

    // The written file, read back: the arm is level and the skin draws it there at rest; the cape's top binds to spine_03, its hem to the pelvis.
    const doc = (await lib.readDocument(join(dir, 'model.glb'))) as Document;
    const report = lib.inspectDocument(doc, {});
    assert.equal(report.restPose?.verdict, 'T');
    const skin = doc.getRoot().listSkins()[0]!;
    const jointNames = skin.listJoints().map((j) => j.getName());
    const capePrim = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).find((p) => p.getMaterial()?.getName() === 'Cape')!;
    const J = capePrim.getAttribute('JOINTS_0')!;
    const W = capePrim.getAttribute('WEIGHTS_0')!;
    const dominant = new Set<string>();
    for (let i = 0; i < J.getCount(); i += 1) {
      const j = J.getElement(i, [0, 0, 0, 0]);
      const w = W.getElement(i, [0, 0, 0, 0]);
      const k = w.indexOf(Math.max(...w));
      dominant.add(jointNames[j[k] ?? 0]!);
    }
    assert.deepEqual([...dominant].sort(), ['pelvis', 'spine_02', 'spine_03'], 'the cape binds to the spine by height');

    const checked = node(['tools/personal/check.mjs', SLUG, '--no-preview']);
    assert.equal(checked.status, 0, checked.out);
    assert.match(checked.out, /skinned-vs-file 0\.0\d\d mm/);
    assert.match(checked.out, /22\/22 carry weight/);
    assert.match(checked.out, /sides\s+(\d+)\/\1 judged on the agent's side/);
    assert.match(checked.out, /^OK — /m);

    // The verifier's two wrong maps, which the first check.mjs passed.
    const wrong: [string, Record<string, unknown>, RegExp][] = [
      ['the hand on a bone with no weight', { hand_l: 'mixamorig:LeftHandIndex1' }, /FAIL\s+hand_l ← mixamorig:LeftHandIndex1 carries no skin weight/],
      [
        'the arms swapped side for side',
        Object.fromEntries(['Arm', 'ForeArm', 'Hand'].flatMap((b) => [[`${b === 'Arm' ? 'upperarm' : b === 'ForeArm' ? 'lowerarm' : 'hand'}_l`, `mixamorig:Right${b}`], [`${b === 'Arm' ? 'upperarm' : b === 'ForeArm' ? 'lowerarm' : 'hand'}_r`, `mixamorig:Left${b}`]])),
        /FAIL\s+the (left|right) foot points BACKWARDS/,
      ],
    ];
    for (const [what, joints, expect] of wrong) {
      writeFileSync(join(dir, 'bones.json'), JSON.stringify({ joints }));
      const p = node(['tools/personal/prepare.mjs', SLUG, '--budget', '600']);
      assert.equal(p.status, 0, `${what}: prepare ${p.out}`);
      const c = node(['tools/personal/check.mjs', SLUG, '--no-preview']);
      assert.equal(c.status, 1, `${what}: check passed it\n${c.out}`);
      assert.match(c.out, expect, what);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
    if (createdModels) rmSync(lib.MODELS_DIR, { recursive: true, force: true });
    if (createdPersonal) rmSync(join(REPO, 'personal'), { recursive: true, force: true });
  }
});
