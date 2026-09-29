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
 *     baked clips carried onto `hero` reproduce `hero`'s own.
 *
 * `tools/personal/*.mjs` are loaded with a computed specifier, so the type
 * checker does not follow them (they are plain JavaScript, like the build); the
 * `Lib` interface below is the slice of them these tests call.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
interface Lib {
  slugOf(name: string): string;
  isSlug(value: unknown): boolean;
  slugDir(slug: string): string;
  insideSlug(slug: string, path: string): string;
  gitIgnores(path: string): boolean;
  validateManifest(m: unknown): string[];
  detectRigMap(names: string[], options?: { vrmHumanBones?: Record<string, string> | null; file?: unknown }): RigMap;
  armAngles(positions: Record<string, number[]>): { l: number | null; r: number | null; verdict: string };
  readDocument(bytes: Uint8Array): Promise<unknown>;
  inspectDocument(doc: unknown, raw: unknown): Inspection;
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
  // the half of the rule that catches it.
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
