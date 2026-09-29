/*
 * mtg-table — tools/personal/lib.mjs
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The personal tier's shared half** (D190, D191; `docs/guides/personal-tier.md`).
 *
 * The personal tier is a gitignored folder, `personal/models/<slug>/`, of rigged
 * models the USER downloaded for their own use under whatever licence the source
 * grants. It is never committed, never published and never sold — the user's own
 * words are "this can never ever ever be sold or published". The repository tier
 * stays CC0-only (D54). This module is what `import.mjs`, `prepare.mjs` and
 * `check.mjs` share, and what `web/test/personal-tier.test.ts` tests:
 *
 *   - the SLUG rule and the one directory a slug may write into;
 *   - the MANIFEST schema and its validator;
 *   - the RIG MAP: our 22 retarget joints (`tools/assets-manifest.json`'s
 *     `rigs.ubc.retarget.joints`, the joints `tools/build-figures.mjs` drives)
 *     and the naming conventions a downloaded rig arrives in — Auto-Rig Pro,
 *     Mixamo, Unreal (the UAL's own), VRM / VRoid and Character Creator;
 *   - INSPECTION: what is in a glTF — meshes, skins, the rest pose (T or A,
 *     measured from the bind matrices), control meshes, unskinned meshes, and
 *     game-asset name patterns (informational only: the tooling never refuses a
 *     file, and it never fetches one either);
 *   - the JUDGEMENTS `check.mjs` makes of a prepared body against the `agent`'s:
 *     `judgeBody` (weight, sides, facing, shape — D192) and `judgeLimbs` (each
 *     spine, arm and leg link's direction, length and flesh, and the chains'
 *     ends at attack t = 0.5 — D193), and `netLogReport` (the preview browser's
 *     own net log) and `profileReport` (what its profile kept).
 *
 * Nothing here writes a file. Nothing here touches the network.
 *
 * `@gltf-transform/*` and `three` are `web/` dependencies, resolved against
 * `web/package.json` exactly as `tools/build-figures.mjs` resolves them.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const WEB = join(REPO, 'web');
/** The personal tier's root. `.gitignore` names it (`personal/`); a test holds that. */
export const PERSONAL_DIR = join(REPO, 'personal');
export const MODELS_DIR = join(PERSONAL_DIR, 'models');

const require = createRequire(join(WEB, 'package.json'));
export const GLTF = require('@gltf-transform/core');
export const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
export const GLTF_FUNCTIONS = require('@gltf-transform/functions');
export const THREE = await import(pathToFileURL(join(WEB, 'node_modules/three/build/three.module.js')).href);

/** The IO every personal tool shares: every extension registered, and meshopt's decoder for a prepared file. */
let ioPromise = null;
export function personalIO() {
  ioPromise ??= (async () => {
    const { MeshoptDecoder, MeshoptEncoder } = await import(
      pathToFileURL(createRequire(join(WEB, 'node_modules/@gltf-transform/cli/package.json')).resolve('meshoptimizer')).href
    );
    await MeshoptDecoder.ready;
    await MeshoptEncoder.ready;
    return new GLTF.NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
  })();
  return ioPromise;
}

// ---------------------------------------------------------------------------
// The slug, and the one folder it may write into
// ---------------------------------------------------------------------------

/**
 * **The slug rule.** Lowercase the name; fold accents to their letters; drop
 * every character that is not a letter, a digit, a space or a hyphen; spaces to
 * hyphens; collapse repeated hyphens; trim them from the ends.
 *
 *   Doctor Doom               → doctor-doom
 *   Nick Fury, Spymaster      → nick-fury-spymaster
 *   Ant-Man, Reformed Rogue   → ant-man-reformed-rogue   (a hyphen is kept)
 *   T'Challa, the Black Panther → tchalla-the-black-panther
 *   S.H.I.E.L.D. Helicarrier  → shield-helicarrier
 */
export function slugOf(name) {
  if (typeof name !== 'string') throw new TypeError('slugOf: a name is a string');
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 \t-]/g, '')
    .trim()
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** A slug is lowercase letters and digits in hyphen-separated runs: no dot, no slash, nothing empty. */
export function isSlug(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
}

/** `personal/models/<slug>/`, refusing anything that is not a slug. */
export function slugDir(slug) {
  if (!isSlug(slug)) throw new Error(`"${String(slug)}" is not a slug (lowercase letters, digits and hyphens; see slugOf)`);
  return join(MODELS_DIR, slug);
}

/**
 * **The write guard.** Every path a personal tool writes goes through this: it
 * must resolve INSIDE `personal/models/<slug>/`, or the tool stops. prepare.mjs
 * "must NOT write anything outside personal/models/<slug>/", and a relative path
 * with a `..` in it is exactly how one would.
 */
export function insideSlug(slug, path) {
  const dir = slugDir(slug);
  const full = resolve(dir, path);
  if (full !== dir && !full.startsWith(dir + sep)) {
    throw new Error(`refusing to write ${full}: it is outside ${relative(REPO, dir)}/`);
  }
  return full;
}

/**
 * Would `.gitignore` keep this path out of git? `git check-ignore` exits 0 for
 * yes, 1 for no. `--no-index` judges the PATTERNS alone: without it a tracked
 * file is never reported ignored, so once `tools/personal/` was committed an
 * unanchored `personal/` rule could no longer be caught by asking about it
 * (fix pass 1 found the negative control had gone blind that way).
 */
export function gitIgnores(path, cwd = REPO) {
  try {
    execFileSync('git', ['check-ignore', '-q', '--no-index', path], { cwd, stdio: 'ignore' });
    return true;
  } catch (err) {
    if (err.status === 1) return false;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// The manifest
// ---------------------------------------------------------------------------

/** The duelist seats a personal model may dress: `duelists.json`'s own `seats` (you → director, opp → villain). */
export const SEATS = Object.keys(
  JSON.parse(readFileSync(join(WEB, 'src/arena/figures/duelists.json'), 'utf8')).seats,
).filter((k) => !k.startsWith('_'));

/**
 * **A seat by its LOOK's name** (D99, D195): `duelists.json`'s `seats` map says
 * `you` wears the `director` look and `opp` the `villain`, so a manifest may name
 * a seat either way — `{ seat: "opp" }` and `{ seat: "villain" }` dress the same
 * duelist. `seatOf` is the one place the two spellings meet.
 */
export const SEAT_LOOKS = Object.fromEntries(
  Object.entries(JSON.parse(readFileSync(join(WEB, 'src/arena/figures/duelists.json'), 'utf8')).seats).filter(([k]) => !k.startsWith('_')),
);
/** `you` / `opp` for a seat named by itself or by its look (`director` / `villain`); `null` for anything else. */
export function seatOf(value) {
  if (typeof value !== 'string') return null;
  if (SEATS.includes(value)) return value;
  for (const [seat, look] of Object.entries(SEAT_LOOKS)) if (look === value) return seat;
  return null;
}

/**
 * **Version 2** (phase 2, D194): the model carries OUR clip set baked in
 * (`clips`), so the arena binds it with no retarget of its own. A version-1
 * manifest (phase 1's prepare) is a model with no clips: the dev route's index
 * skips it and says to run prepare again.
 */
export const MANIFEST_VERSION = 2;

/**
 * **The manifest schema**, version 1 — `personal/models/<slug>/manifest.json`,
 * written by prepare.mjs and read by phase 2's loader. Keys starting with `_` are
 * comments. Every other key is listed here; an unknown key is an error, as in
 * `cues.json` and `traits.json`.
 *
 *   version      2
 *   slug         the folder's own name
 *   dresses      [{ card: "<exact card name>" } | { seat: "you" | "opp" | "director" | "villain" }, …] — at least one
 *                (a seat by itself or by its duelist look's name — `seatOf`)
 *   model        "model.glb" — a relative path inside the folder
 *   source       { file, bytes, sha256, sourceTxt } — the downloaded original, untouched
 *   credits      the credit line the licence asks for (CC-BY: title, author, URL, licence)
 *   licence      the licence as the source showed it
 *   rig          { convention, mapFile, joints: { <our joint>: { primary, followers, by, primaryWeighted } },
 *                  synthesised, placement: { byAncestry, byPosition, byPositionWeight } }
 *   triangles    { source, render, budget, after }
 *   pose         { before: { verdict, upperArmDeg:{l,r} }, fix: "t"|"none", after: { … } }
 *   skinned      [{ part, rule, vertices }] — every mesh the tool gave weights to
 *   textures     [{ name, slot, size:[w,h], bytes, downscaled }]
 *   dropped      { controlMeshes, nodes, joints, textureSlots }
 *   units        { sourceHeight, height, scale, facing }
 *   prepared     { tool, date, budget }
 *   clips        { keys: [our clip keys], source, fps, retarget } — the clip set baked into model.glb (v2, D194)
 *   disabled     optional: true, or the reason as a sentence — keeps the model out of the game's index (the dev
 *                route skips it and prints the reason)
 *   paint        optional: { primitives: [{ material, atlas, cutout, texture, triangles, parts: [{ part, first, count }] }],
 *                atlas, droppedNormalTextures, exposure } — since D240 exactly ONE primitive under one material (a
 *                figure is one draw call); `atlas` null for a model of one paint, else { size: [w, h], budget,
 *                scale, gutter, regions: [{ source, factor, cutout, span, rect, parts, gain }] }. A manifest from
 *                before D240 may carry two primitives or `paint: null`: check.mjs fails its model and the dev
 *                route skips it — prepare it again
 */
export const MANIFEST_KEYS = [
  'version',
  'slug',
  'dresses',
  'model',
  'source',
  'credits',
  'licence',
  'rig',
  'triangles',
  'pose',
  'skinned',
  'textures',
  'dropped',
  'units',
  'prepared',
  'clips',
];
/** Keys a manifest MAY carry (every other key is required). */
export const MANIFEST_OPTIONAL = ['disabled', 'paint'];

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v) => Number.isInteger(v) && v >= 0;

/** Every problem with a manifest, as sentences. An empty list is a valid manifest. */
export function validateManifest(m) {
  const errors = [];
  if (!isObject(m)) return ['the manifest is not a JSON object'];
  for (const key of Object.keys(m)) {
    if (!key.startsWith('_') && !MANIFEST_KEYS.includes(key) && !MANIFEST_OPTIONAL.includes(key)) errors.push(`unknown key "${key}"`);
  }
  for (const key of MANIFEST_KEYS) if (!(key in m)) errors.push(`missing "${key}"`);
  if (m.version !== MANIFEST_VERSION) {
    errors.push(
      m.version === 1
        ? `version must be ${MANIFEST_VERSION} — this is phase 1's manifest, whose model carries no clips: run prepare.mjs again`
        : `version must be ${MANIFEST_VERSION}`,
    );
  }
  if (!isSlug(m.slug)) errors.push('slug must be a slug (lowercase letters, digits, hyphens)');
  if (!Array.isArray(m.dresses) || m.dresses.length === 0) errors.push('dresses must name at least one card or seat');
  else {
    m.dresses.forEach((d, i) => {
      if (!isObject(d)) return errors.push(`dresses[${i}] is not an object`);
      const keys = Object.keys(d);
      if (keys.length !== 1 || !['card', 'seat'].includes(keys[0])) {
        return errors.push(`dresses[${i}] must be exactly one of {card} or {seat}`);
      }
      if (keys[0] === 'card' && (typeof d.card !== 'string' || d.card.trim() === '')) errors.push(`dresses[${i}].card is empty`);
      if (keys[0] === 'seat' && seatOf(d.seat) === null) {
        errors.push(`dresses[${i}].seat must be one of ${[...SEATS, ...Object.values(SEAT_LOOKS)].join(', ')}`);
      }
    });
  }
  if (typeof m.model !== 'string' || !/\.glb$/.test(m.model) || m.model.startsWith('/') || m.model.split(/[\\/]/).includes('..')) {
    errors.push('model must be a relative .glb path inside the folder');
  }
  if (!isObject(m.source) || typeof m.source.file !== 'string' || !/^[0-9a-f]{64}$/.test(String(m.source.sha256)) || !isCount(m.source.bytes)) {
    errors.push('source must be { file, bytes, sha256 } of the downloaded original');
  }
  if (typeof m.credits !== 'string' || m.credits.trim() === '') errors.push('credits must carry the credit line');
  if (typeof m.licence !== 'string' || m.licence.trim() === '') errors.push('licence must be the licence as shown');
  if (!isObject(m.rig) || typeof m.rig.convention !== 'string' || !isObject(m.rig.joints)) {
    errors.push('rig must be { convention, joints }');
  } else {
    for (const joint of OUR_JOINTS) {
      const j = m.rig.joints[joint];
      if (!isObject(j)) errors.push(`rig.joints.${joint} is missing`);
      else if (!(j.primary === null || typeof j.primary === 'string') || !Array.isArray(j.followers)) {
        errors.push(`rig.joints.${joint} must be { primary, followers, by }`);
      }
    }
    for (const joint of Object.keys(m.rig.joints)) if (!OUR_JOINTS.includes(joint)) errors.push(`rig.joints.${joint} is not one of our joints`);
    const p = m.rig.placement;
    if (p !== undefined && (!isObject(p) || !isCount(p.byAncestry) || !isCount(p.byPosition) || !(p.byPositionWeight >= 0 && p.byPositionWeight <= 1))) {
      errors.push('rig.placement must be { byAncestry, byPosition, byPositionWeight } (counts, and a share of the skin weight from 0 to 1)');
    }
  }
  const t = m.triangles;
  if (!isObject(t) || !isCount(t.source) || !isCount(t.render) || !isCount(t.after) || !isCount(t.budget)) {
    errors.push('triangles must be { source, render, budget, after } counts');
  } else if (t.after > t.budget) errors.push(`triangles.after (${t.after}) is over the budget (${t.budget})`);
  if (!isObject(m.pose) || !['t', 'none'].includes(m.pose.fix) || !isObject(m.pose.before) || !isObject(m.pose.after)) {
    errors.push('pose must be { before, fix: "t"|"none", after }');
  }
  if (!Array.isArray(m.skinned)) errors.push('skinned must be a list');
  if (!Array.isArray(m.textures)) errors.push('textures must be a list');
  else {
    m.textures.forEach((x, i) => {
      const most = x?.slot === 'atlas' ? ATLAS_MAX : 1024;
      if (!isObject(x) || !['baseColor', 'normal', 'atlas'].includes(x.slot) || !Array.isArray(x.size) || x.size.some((n) => !isCount(n) || n > most)) {
        errors.push(`textures[${i}] must be a baseColor or normal texture no larger than 1024 px, or an atlas no larger than 2048`);
      }
    });
  }
  if (!isObject(m.dropped)) errors.push('dropped must be an object');
  if (!isObject(m.units) || typeof m.units.height !== 'number' || !['+z'].includes(m.units.facing)) {
    errors.push('units must be { height, facing: "+z", … }');
  }
  if (!isObject(m.prepared) || typeof m.prepared.date !== 'string') errors.push('prepared must be { tool, date, budget }');
  const c = m.clips;
  if (!isObject(c) || !Array.isArray(c.keys) || c.keys.length === 0 || c.keys.some((k) => typeof k !== 'string' || k === '') || !(c.fps > 0)) {
    errors.push('clips must be { keys: [the baked clip keys], source, fps } — the clip set prepare baked into model.glb');
  } else if (!c.keys.includes('idle')) errors.push('clips.keys must include idle (a body with no idle shows its bind pose)');
  if ('disabled' in m && typeof m.disabled !== 'boolean' && !(typeof m.disabled === 'string' && m.disabled.trim() !== '')) {
    errors.push('disabled must be true, false or the reason (a sentence)');
  }
  if ('paint' in m && m.paint !== null && (!isObject(m.paint) || !Array.isArray(m.paint.primitives) || m.paint.primitives.length === 0)) {
    errors.push('paint must be null or { primitives: [one per base colour], atlas }');
  } else if (isObject(m.paint) && m.paint.primitives.length !== 1) {
    errors.push(`paint.primitives has ${String(m.paint.primitives.length)} entries: since D240 a prepared model is ONE primitive under one material (one draw call a figure) — prepare it again`);
  } else if (isObject(m.paint) && isObject(m.paint.atlas)) {
    const size = m.paint.atlas.size;
    if (!Array.isArray(size) || size.length !== 2 || size.some((n) => !isCount(n) || n < 1 || n > ATLAS_MAX)) {
      errors.push(`paint.atlas.size must be [width, height], each at most ${String(ATLAS_MAX)} px (D240's texture budget)`);
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// The rig map
// ---------------------------------------------------------------------------

/**
 * **Our 22 joints, parents first** — the joints `tools/build-figures.mjs` drives
 * (`rigs.ubc.retarget.joints` in `tools/assets-manifest.json`; a test holds the
 * two lists equal). A prepared model's skeleton is exactly `root` plus these.
 */
export const OUR_JOINTS = [
  'pelvis',
  'spine_01',
  'spine_02',
  'spine_03',
  'neck_01',
  'Head',
  'clavicle_l',
  'upperarm_l',
  'lowerarm_l',
  'hand_l',
  'clavicle_r',
  'upperarm_r',
  'lowerarm_r',
  'hand_r',
  'thigh_l',
  'calf_l',
  'foot_l',
  'ball_l',
  'thigh_r',
  'calf_r',
  'foot_r',
  'ball_r',
];

/** Each joint's parent in our rig (the UAL's own hierarchy; `pelvis` hangs from `root`). */
export const OUR_PARENT = {
  pelvis: 'root',
  spine_01: 'pelvis',
  spine_02: 'spine_01',
  spine_03: 'spine_02',
  neck_01: 'spine_03',
  Head: 'neck_01',
  clavicle_l: 'spine_03',
  upperarm_l: 'clavicle_l',
  lowerarm_l: 'upperarm_l',
  hand_l: 'lowerarm_l',
  clavicle_r: 'spine_03',
  upperarm_r: 'clavicle_r',
  lowerarm_r: 'upperarm_r',
  hand_r: 'lowerarm_r',
  thigh_l: 'pelvis',
  calf_l: 'thigh_l',
  foot_l: 'calf_l',
  ball_l: 'foot_l',
  thigh_r: 'pelvis',
  calf_r: 'thigh_r',
  foot_r: 'calf_r',
  ball_r: 'foot_r',
};

/** The joints no model may lack (the rest can be synthesised between their neighbours). */
export const CORE_JOINTS = ['pelvis', 'Head', 'upperarm_l', 'lowerarm_l', 'hand_l', 'upperarm_r', 'lowerarm_r', 'hand_r', 'thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r'];

/** Builds a convention's two sides from one function of the side's spellings. */
function sided(build) {
  return {
    ...build({ our: 'l', ue: 'l', arp: 'l', mixamo: 'Left', vrm: 'left', vroid: 'L', cc: 'L' }),
    ...build({ our: 'r', ue: 'r', arp: 'r', mixamo: 'Right', vrm: 'right', vroid: 'R', cc: 'R' }),
  };
}

/**
 * **The naming conventions**, each a map of OUR joint → the source bones that
 * make it up, in order: the FIRST one present is the joint's PRIMARY (its bind
 * position becomes our joint's), and every other one present is a FOLLOWER whose
 * skin weights are merged into it. A weighted bone no list names is placed by the
 * rules in `assignWeightedJoints` (its nearest mapped ancestor, else the nearest
 * segment by position), and every such placement is written down.
 *
 * Names are compared by `boneMatches`: case-insensitively, with a namespace
 * (`mixamorig:`, `Armature|`) dropped, `.` read as `_`, and an exporter's
 * trailing `_<number>` (Sketchfab's `spine_01.x_191`) allowed.
 */
export const CONVENTIONS = {
  /** Unreal's mannequin names — the Universal Animation Library's and the UBC bodies' own (UE4 and UE5). */
  unreal: {
    label: 'Unreal (UE mannequin; the UAL rig itself)',
    joints: {
      pelvis: ['pelvis'],
      spine_01: ['spine_01'],
      spine_02: ['spine_02'],
      spine_03: ['spine_03', 'spine_04', 'spine_05'],
      neck_01: ['neck_01', 'neck_02'],
      Head: ['head'],
      ...sided((s) => ({
        [`clavicle_${s.our}`]: [`clavicle_${s.ue}`],
        [`upperarm_${s.our}`]: [`upperarm_${s.ue}`, `upperarm_twist_01_${s.ue}`, `upperarm_twist_02_${s.ue}`],
        [`lowerarm_${s.our}`]: [`lowerarm_${s.ue}`, `lowerarm_twist_01_${s.ue}`, `lowerarm_twist_02_${s.ue}`],
        [`hand_${s.our}`]: [`hand_${s.ue}`],
        [`thigh_${s.our}`]: [`thigh_${s.ue}`, `thigh_twist_01_${s.ue}`, `thigh_twist_02_${s.ue}`],
        [`calf_${s.our}`]: [`calf_${s.ue}`, `calf_twist_01_${s.ue}`, `calf_twist_02_${s.ue}`],
        [`foot_${s.our}`]: [`foot_${s.ue}`],
        [`ball_${s.our}`]: [`ball_${s.ue}`],
      })),
    },
  },
  /**
   * **Auto-Rig Pro** (Blender), as its DEFORM bones are named. ARP splits a limb
   * into a stretch bone and a twist bone, and exports them with no anatomical
   * parent — the arm's deform bones hang from the rig's root, not from the
   * shoulder — which is why prepare.mjs REBUILDS the skeleton instead of driving
   * the source's own hierarchy. `c_arm_twist_offset` is a controller that
   * carries weights in some exports (Doom's does).
   */
  autoRigPro: {
    label: 'Auto-Rig Pro (Blender; deform bones)',
    joints: {
      pelvis: ['root.x'],
      spine_01: ['spine_01.x'],
      spine_02: ['spine_02.x'],
      spine_03: ['spine_03.x'],
      neck_01: ['neck.x', 'neck_twist.x', 'subneck_1.x'],
      Head: ['head.x'],
      ...sided((s) => ({
        [`clavicle_${s.our}`]: [`shoulder.${s.arp}`],
        // The PRIMARY is the bone whose head is the joint: ARP puts the upper
        // limbs' twist bone first (shoulder → mid upper arm, hip → mid thigh) and
        // the lower limbs' stretch bone first (elbow → mid forearm, knee → mid
        // calf). Measured on Doom: arm_twist.l's head is the shoulder, arm_stretch.l's
        // is halfway to the elbow. With no twist bones, the stretch bone is the whole limb.
        [`upperarm_${s.our}`]: [`arm_twist.${s.arp}`, `arm_stretch.${s.arp}`, `c_arm_twist_offset.${s.arp}`, `arm_twist_twk.${s.arp}`, `arm_twist_2.${s.arp}`, `arm_twist_3.${s.arp}`],
        [`lowerarm_${s.our}`]: [`forearm_stretch.${s.arp}`, `forearm_twist.${s.arp}`, `forearm_twist_2.${s.arp}`, `forearm_twist_3.${s.arp}`],
        [`hand_${s.our}`]: [`hand.${s.arp}`],
        [`thigh_${s.our}`]: [`thigh_twist.${s.arp}`, `thigh_stretch.${s.arp}`, `thigh_twist_2.${s.arp}`, `thigh_twist_3.${s.arp}`],
        [`calf_${s.our}`]: [`leg_stretch.${s.arp}`, `leg_twist.${s.arp}`, `leg_twist_2.${s.arp}`, `leg_twist_3.${s.arp}`],
        [`foot_${s.our}`]: [`foot.${s.arp}`],
        [`ball_${s.our}`]: [`toes_01.${s.arp}`],
      })),
    },
  },
  /** **Mixamo** (`mixamorig:` — the most common rig a downloaded humanoid arrives on). */
  mixamo: {
    label: 'Mixamo (mixamorig:)',
    joints: {
      pelvis: ['Hips'],
      spine_01: ['Spine'],
      spine_02: ['Spine1'],
      spine_03: ['Spine2'],
      neck_01: ['Neck'],
      Head: ['Head', 'HeadTop_End'],
      ...sided((s) => ({
        [`clavicle_${s.our}`]: [`${s.mixamo}Shoulder`],
        [`upperarm_${s.our}`]: [`${s.mixamo}Arm`],
        [`lowerarm_${s.our}`]: [`${s.mixamo}ForeArm`],
        [`hand_${s.our}`]: [`${s.mixamo}Hand`],
        [`thigh_${s.our}`]: [`${s.mixamo}UpLeg`],
        [`calf_${s.our}`]: [`${s.mixamo}Leg`],
        [`foot_${s.our}`]: [`${s.mixamo}Foot`],
        [`ball_${s.our}`]: [`${s.mixamo}ToeBase`, `${s.mixamo}Toe_End`],
      })),
    },
  },
  /**
   * **VRM** — the humanoid bone names (`hips`, `leftUpperArm`, …) as node names,
   * and VRoid Studio's `J_Bip_*` spellings of the same bones. A VRM file's own
   * `humanBones` table, when present, is read first (`vrmHumanBones`).
   */
  vrm: {
    label: 'VRM humanoid (and VRoid J_Bip_*)',
    joints: {
      pelvis: ['hips', 'J_Bip_C_Hips'],
      spine_01: ['spine', 'J_Bip_C_Spine'],
      spine_02: ['chest', 'J_Bip_C_Chest'],
      spine_03: ['upperChest', 'J_Bip_C_UpperChest'],
      neck_01: ['neck', 'J_Bip_C_Neck'],
      Head: ['head', 'J_Bip_C_Head'],
      ...sided((s) => ({
        [`clavicle_${s.our}`]: [`${s.vrm}Shoulder`, `J_Bip_${s.vroid}_Shoulder`],
        [`upperarm_${s.our}`]: [`${s.vrm}UpperArm`, `J_Bip_${s.vroid}_UpperArm`],
        [`lowerarm_${s.our}`]: [`${s.vrm}LowerArm`, `J_Bip_${s.vroid}_LowerArm`],
        [`hand_${s.our}`]: [`${s.vrm}Hand`, `J_Bip_${s.vroid}_Hand`],
        [`thigh_${s.our}`]: [`${s.vrm}UpperLeg`, `J_Bip_${s.vroid}_UpperLeg`],
        [`calf_${s.our}`]: [`${s.vrm}LowerLeg`, `J_Bip_${s.vroid}_LowerLeg`],
        [`foot_${s.our}`]: [`${s.vrm}Foot`, `J_Bip_${s.vroid}_Foot`],
        [`ball_${s.our}`]: [`${s.vrm}Toes`, `J_Bip_${s.vroid}_ToeBase`],
      })),
    },
  },
  /** **Reallusion Character Creator** (`CC_Base_*`): the survey's Coulson arrives on it. */
  characterCreator: {
    label: 'Character Creator (CC_Base_*)',
    joints: {
      pelvis: ['CC_Base_Hip', 'CC_Base_Pelvis'],
      spine_01: ['CC_Base_Waist'],
      spine_02: ['CC_Base_Spine01'],
      spine_03: ['CC_Base_Spine02'],
      neck_01: ['CC_Base_NeckTwist01', 'CC_Base_NeckTwist02'],
      Head: ['CC_Base_Head'],
      ...sided((s) => ({
        [`clavicle_${s.our}`]: [`CC_Base_${s.cc}_Clavicle`],
        [`upperarm_${s.our}`]: [`CC_Base_${s.cc}_Upperarm`, `CC_Base_${s.cc}_UpperarmTwist01`, `CC_Base_${s.cc}_UpperarmTwist02`],
        [`lowerarm_${s.our}`]: [`CC_Base_${s.cc}_Forearm`, `CC_Base_${s.cc}_ForearmTwist01`, `CC_Base_${s.cc}_ForearmTwist02`, `CC_Base_${s.cc}_ElbowShareBone`],
        [`hand_${s.our}`]: [`CC_Base_${s.cc}_Hand`],
        [`thigh_${s.our}`]: [`CC_Base_${s.cc}_Thigh`, `CC_Base_${s.cc}_ThighTwist01`, `CC_Base_${s.cc}_ThighTwist02`],
        [`calf_${s.our}`]: [`CC_Base_${s.cc}_Calf`, `CC_Base_${s.cc}_CalfTwist01`, `CC_Base_${s.cc}_CalfTwist02`, `CC_Base_${s.cc}_KneeShareBone`],
        [`foot_${s.our}`]: [`CC_Base_${s.cc}_Foot`],
        [`ball_${s.our}`]: [`CC_Base_${s.cc}_ToeBase`],
      })),
    },
  },
};

/** VRM's humanoid bone names → our joints (for a file that carries its own `humanBones` table). */
export const VRM_HUMAN_BONE = {
  hips: 'pelvis',
  spine: 'spine_01',
  chest: 'spine_02',
  upperChest: 'spine_03',
  neck: 'neck_01',
  head: 'Head',
  leftShoulder: 'clavicle_l',
  leftUpperArm: 'upperarm_l',
  leftLowerArm: 'lowerarm_l',
  leftHand: 'hand_l',
  rightShoulder: 'clavicle_r',
  rightUpperArm: 'upperarm_r',
  rightLowerArm: 'lowerarm_r',
  rightHand: 'hand_r',
  leftUpperLeg: 'thigh_l',
  leftLowerLeg: 'calf_l',
  leftFoot: 'foot_l',
  leftToes: 'ball_l',
  rightUpperLeg: 'thigh_r',
  rightLowerLeg: 'calf_r',
  rightFoot: 'foot_r',
  rightToes: 'ball_r',
};

/** A bone name as the matcher reads it: namespace dropped, lowercase, `.` and spaces as `_`. */
export function normaliseBoneName(name) {
  const bare = String(name).replace(/^.*[:|]/, '');
  return bare.toLowerCase().replace(/[.\s]+/g, '_');
}

/** Does this bone carry that candidate name (exactly, or with an exporter's trailing `_<number>`)? */
export function boneMatches(bone, candidate) {
  const b = normaliseBoneName(bone);
  const c = normaliseBoneName(candidate);
  if (b === c) return true;
  return b.startsWith(c) && /^_\d+$/.test(b.slice(c.length));
}

/** The first joint name in `names` that carries `candidate`, or null. */
function findBone(names, candidate) {
  for (const name of names) if (boneMatches(name, candidate)) return name;
  return null;
}

/**
 * **The auto map.** Scores every convention by how many of our 22 joints find a
 * bone, picks the best, and reads each joint's primary and followers out of it.
 * `vrmHumanBones` (humanoid bone → node name, from a VRM file's own table) wins
 * for the joints it names. `file` (a parsed `bones.json`) overrides joint by
 * joint: `{ "joints": { "<our joint>": "<bone>" | ["<primary>", "<follower>", …] } }`.
 *
 * Returns `{ convention, label, scores, joints: { <our>: { primary, followers, by } }, missing }`,
 * where `by` is `"name"`, `"vrm"` or `"file"`. Nothing here decides whether the
 * map is good enough — `prepare.mjs` refuses a model missing a CORE joint.
 */
export function detectRigMap(jointNames, { vrmHumanBones = null, file = null } = {}) {
  const names = [...jointNames];
  const scores = {};
  for (const [id, conv] of Object.entries(CONVENTIONS)) {
    let score = 0;
    for (const joint of OUR_JOINTS) if (conv.joints[joint].some((c) => findBone(names, c) !== null)) score += 1;
    scores[id] = score;
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [convention, best] = ranked[0];
  const conv = CONVENTIONS[convention];
  const joints = {};
  const used = new Set();
  for (const joint of OUR_JOINTS) {
    const present = [];
    if (best > 0) {
      for (const c of conv.joints[joint]) {
        const bone = findBone(names, c);
        if (bone !== null && !present.includes(bone) && !used.has(bone)) present.push(bone);
      }
    }
    for (const b of present) used.add(b);
    joints[joint] = { primary: present[0] ?? null, followers: present.slice(1), by: present.length > 0 ? 'name' : null };
  }
  if (vrmHumanBones !== null) {
    for (const [human, node] of Object.entries(vrmHumanBones)) {
      const joint = VRM_HUMAN_BONE[human];
      if (joint === undefined || !names.includes(node)) continue;
      const followers = joints[joint].followers.filter((f) => f !== node);
      joints[joint] = { primary: node, followers, by: 'vrm' };
    }
  }
  if (file !== null) {
    if (!isObject(file) || !isObject(file.joints)) throw new Error('bones.json must be { "joints": { "<our joint>": "<bone>" | ["<primary>", …] } }');
    for (const [joint, value] of Object.entries(file.joints)) {
      if (!OUR_JOINTS.includes(joint)) throw new Error(`bones.json: "${joint}" is not one of our joints (${OUR_JOINTS.join(', ')})`);
      const list = (Array.isArray(value) ? value : [value]).filter((v) => v !== null);
      for (const bone of list) if (!names.includes(bone)) throw new Error(`bones.json: ${joint} → "${bone}" is not a joint of this skin`);
      joints[joint] = { primary: list[0] ?? null, followers: list.slice(1), by: 'file' };
    }
  }
  const missing = OUR_JOINTS.filter((j) => joints[j].primary === null);
  return { convention: best > 0 ? convention : 'none', label: best > 0 ? conv.label : 'no convention matched', scores, joints, missing };
}

// ---------------------------------------------------------------------------
// Classification: control meshes, unskinned meshes, game-asset names
// ---------------------------------------------------------------------------

/**
 * **A rig's control shapes are not the character.** Auto-Rig Pro exports its
 * `cs_*` widgets (grouped under `cs_grp`), Rigify its `WGT-*` (under `WGTS_*`),
 * and other rigs `*_shape`, `ctrl_*`, `MCH-*` or `ORG-*` objects. They render as
 * geometry in a converted glTF. A mesh is a control mesh when its node, its mesh,
 * its material or any ancestor carries one of these.
 */
export const CONTROL_PATTERNS = [
  [/^cs_/i, 'Auto-Rig Pro control shape (cs_*)'],
  [/^wgts?[-_]/i, 'Rigify widget (WGT-*)'],
  [/widget/i, 'a widget'],
  [/_shape(_\d+)?$/i, 'a control shape (*_shape)'],
  [/^(ctrl|ctl)[-_.]|[-_.](ctrl|ctl)(_\d+)?$/i, 'a controller (ctrl)'],
  [/^mch[-_.]/i, 'a mechanism object (MCH-*)'],
  [/^org[-_.]/i, 'an original-bone object (ORG-*)'],
];

export function controlReason(names) {
  for (const name of names) {
    if (typeof name !== 'string') continue;
    for (const [pattern, reason] of CONTROL_PATTERNS) if (pattern.test(name)) return `${reason}: "${name}"`;
  }
  return null;
}

/**
 * **Name patterns games leave in their assets.** INFORMATIONAL ONLY: the tool
 * prints them and writes them down, and never refuses a file — what the user
 * downloads and keeps on their machine is the user's call (D190). They are here
 * because a name is the only provenance a file carries.
 */
export const GAME_ASSET_PATTERNS = [
  [/M-FF_|_iOS_HERO_/i, 'Marvel Future Fight asset naming'],
  [/^Char_[A-Za-z]+_Skin\d+|_PREFAB\b/, 'Marvel Strike Force asset naming (Char_*_Skin*, *_PREFAB)'],
  [/^T_[A-Z]_[A-Z]{2,4}_/, 'Fortnite texture naming (T_M_MED_*)'],
  [/_LW(\.|$)/, 'Contest of Champions-style _LW rig naming'],
  [/^sv_[a-z]+\d+_s\d+/i, 'a game part pattern (sv_<name>01_s01_*)'],
  [/_LOD_?\d+$/i, 'an LOD-suffixed game mesh'],
  [/^(SK|SM|MI)_[A-Z]/, 'Unreal content naming (SK_/SM_/MI_) — games use it, and so do some fan artists'],
  [/^\d{8}(\.fbx)?$/i, 'numeric part names (Marvel Super War style)'],
  [/^Character_\d{10,}|^Mesh_\d+$/, 'image-to-3D generator naming (Meshy-style)'],
  [/\.igb$/i, 'Marvel Ultimate Alliance .igb'],
];

export function gameAssetHits(names) {
  const hits = [];
  const seen = new Set();
  for (const name of names) {
    if (typeof name !== 'string' || name === '') continue;
    for (const [pattern, reason] of GAME_ASSET_PATTERNS) {
      if (pattern.test(name) && !seen.has(`${reason}|${name}`)) {
        seen.add(`${reason}|${name}`);
        hits.push({ name, reason });
      }
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Geometry helpers (three's math, in Node)
// ---------------------------------------------------------------------------

export const m4 = (array) => new THREE.Matrix4().fromArray(array);
export const round = (n, places = 4) => (Number.isFinite(n) ? Number(n.toFixed(places)) : n);

/** Triangles in one primitive (TRIANGLES, STRIP and FAN; 0 for points and lines). */
export function trianglesOf(prim) {
  const mode = prim.getMode();
  const count = prim.getIndices() !== null ? prim.getIndices().getCount() : prim.getAttribute('POSITION').getCount();
  if (mode === 4) return Math.floor(count / 3);
  if (mode === 5 || mode === 6) return Math.max(0, count - 2);
  return 0;
}

/** Every node under the document's scenes, depth first, with its ancestors' names. */
export function allNodes(doc) {
  const out = [];
  const walk = (node, ancestors) => {
    out.push({ node, ancestors });
    for (const child of node.listChildren()) walk(child, [...ancestors, node.getName()]);
  };
  for (const scene of doc.getRoot().listScenes()) for (const node of scene.listChildren()) walk(node, []);
  return out;
}

/**
 * **The skin's matrices at rest.** For each joint, `K = jointWorld × IBM` — the
 * matrix a vertex bound 100% to that joint is drawn with when nothing is posed.
 * When the rest pose IS the bind pose every K is the same matrix (the "bind
 * shape", usually the identity); `bindSpread` says how far from that they are.
 */
export function skinAtRest(skin, weighted = null) {
  const joints = skin.listJoints();
  const ibms = skin.getInverseBindMatrices();
  const ibmOf = (i) => (ibms !== null ? new THREE.Matrix4().fromArray(ibms.getArray(), i * 16) : new THREE.Matrix4());
  const K = joints.map((joint, i) => m4(joint.getWorldMatrix()).multiply(ibmOf(i)));
  // Only a joint that moves a vertex has to be at its bind: a rig's controllers
  // and IK targets are often somewhere else (Doom's c_toes_track.l is 2 units off).
  const judged = joints.map((j, i) => i).filter((i) => weighted === null || weighted.has(joints[i].getName()));
  const ref = K[judged[0] ?? 0];
  let spread = 0;
  for (const i of judged) for (let e = 0; e < 16; e += 1) spread = Math.max(spread, Math.abs(K[i].elements[e] - ref.elements[e]));
  /** Each joint's BIND position, as the bind matrices place it: K_ref × IBM⁻¹. */
  const bind = joints.map((_, i) => new THREE.Vector3().setFromMatrixPosition(ref.clone().multiply(ibmOf(i).invert())));
  return { joints, K, ref, bindSpread: spread, bind };
}

/**
 * **A primitive's vertices as DRAWN at rest, in world space**: positions,
 * normals and (when present) tangents. A skinned vertex is drawn with the blend
 * of its joints' K matrices (see `skinAtRest`), an unskinned one with its node's
 * world matrix. Normals and tangents take the same blend's linear part and are
 * renormalised; a tangent keeps its handedness (w).
 */
export function restVertexData(node, prim, skinInfo) {
  const pos = prim.getAttribute('POSITION');
  const nor = prim.getAttribute('NORMAL');
  const tan = prim.getAttribute('TANGENT');
  const count = pos.getCount();
  const positions = new Float32Array(count * 3);
  const normals = nor === null ? null : new Float32Array(count * 3);
  const tangents = tan === null ? null : new Float32Array(count * 4);
  const e = [0, 0, 0];
  const t4 = [0, 0, 0, 0];
  const v = new THREE.Vector3();
  const M = new THREE.Matrix4();
  const N = new THREE.Matrix3();
  const blend = new Float32Array(16);
  const skinned = skinInfo !== null && prim.getAttribute('JOINTS_0') !== null;
  const world = skinned ? null : m4(node.getWorldMatrix());
  const J = [prim.getAttribute('JOINTS_0'), prim.getAttribute('JOINTS_1')];
  const W = [prim.getAttribute('WEIGHTS_0'), prim.getAttribute('WEIGHTS_1')];
  const j = [0, 0, 0, 0];
  const w = [0, 0, 0, 0];
  for (let i = 0; i < count; i += 1) {
    if (skinned) {
      blend.fill(0);
      let total = 0;
      for (let set = 0; set < 2; set += 1) {
        if (J[set] === null || W[set] === null) continue;
        J[set].getElement(i, j);
        W[set].getElement(i, w);
        for (let k = 0; k < 4; k += 1) {
          if (!(w[k] > 0)) continue;
          const el = skinInfo.K[j[k]].elements;
          for (let n = 0; n < 16; n += 1) blend[n] += w[k] * el[n];
          total += w[k];
        }
      }
      if (total > 0) {
        for (let n = 0; n < 16; n += 1) blend[n] /= total;
        M.fromArray(blend);
      } else M.copy(skinInfo.ref);
    } else M.copy(world);
    pos.getElement(i, e);
    v.set(e[0], e[1], e[2]).applyMatrix4(M).toArray(positions, i * 3);
    if (normals !== null || tangents !== null) N.getNormalMatrix(M);
    if (normals !== null) {
      nor.getElement(i, e);
      v.set(e[0], e[1], e[2]).applyMatrix3(N).normalize().toArray(normals, i * 3);
    }
    if (tangents !== null) {
      tan.getElement(i, t4);
      v.set(t4[0], t4[1], t4[2]).transformDirection(M).toArray(tangents, i * 4);
      tangents[i * 4 + 3] = t4[3];
    }
  }
  return { positions, normals, tangents };
}

// ---------------------------------------------------------------------------
// three, in Node: a .glb loaded the way the arena loads it (images stripped)
// ---------------------------------------------------------------------------

/**
 * A .glb with every image and texture reference taken out of its JSON chunk:
 * three cannot decode an image in Node (no `createImageBitmap`), and nothing the
 * tools read here needs one (`build-figures.mjs`'s `withoutImages`, generalised to
 * texture references inside material extensions).
 */
export function withoutImages(glb) {
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

let threeLoaders = null;
/**
 * **A .glb (a path or its bytes) through three's own `GLTFLoader` and
 * `MeshoptDecoder`** — the loader and decoder the arena uses (`scene/models.ts`),
 * so a tool measures what the arena draws. Images are stripped first.
 */
export async function loadThree(pathOrBytes) {
  threeLoaders ??= (async () => {
    const { GLTFLoader } = await import(pathToFileURL(join(WEB, 'node_modules/three/examples/jsm/loaders/GLTFLoader.js')).href);
    const { MeshoptDecoder } = await import(pathToFileURL(join(WEB, 'node_modules/three/examples/jsm/libs/meshopt_decoder.module.js')).href);
    return { GLTFLoader, MeshoptDecoder };
  })();
  const { GLTFLoader, MeshoptDecoder } = await threeLoaders;
  const bytes = withoutImages(typeof pathOrBytes === 'string' ? readFileSync(pathOrBytes) : Buffer.from(pathOrBytes));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return new Promise((ok, bad) => loader.parse(buffer, '', ok, bad));
}

/** A joint by our name inside a subtree (GLTFLoader suffixes a repeated name `_1`, as for `hero`'s joints). */
export function boneFinder(root) {
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

/** Every local TRS under a root, to put a subtree back at rest after a mixer has had it. Returns the restorer. */
export function snapshot(root) {
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

/** A primitive's vertex positions as drawn at rest, in world space. */
export function restPositions(node, prim, skinInfo) {
  return restVertexData(node, prim, skinInfo).positions;
}

/** The weighted joints of a skin, over every primitive bound to it: name → { weight, vertices, dominant }. */
export function weightedJoints(doc, skin) {
  const joints = skin.listJoints();
  const stats = new Map();
  for (const { node } of allNodes(doc)) {
    if (node.getSkin() !== skin || node.getMesh() === null) continue;
    for (const prim of node.getMesh().listPrimitives()) {
      for (const [JS, WS] of [
        ['JOINTS_0', 'WEIGHTS_0'],
        ['JOINTS_1', 'WEIGHTS_1'],
      ]) {
        const J = prim.getAttribute(JS);
        const W = prim.getAttribute(WS);
        if (J === null || W === null) continue;
        const j = [0, 0, 0, 0];
        const w = [0, 0, 0, 0];
        for (let i = 0; i < J.getCount(); i += 1) {
          J.getElement(i, j);
          W.getElement(i, w);
          let best = -1;
          for (let k = 0; k < 4; k += 1) {
            if (w[k] <= 0) continue;
            const name = joints[j[k]].getName();
            const s = stats.get(name) ?? { weight: 0, vertices: 0, dominant: 0 };
            s.weight += w[k];
            s.vertices += 1;
            stats.set(name, s);
            if (best < 0 || w[k] > w[best]) best = k;
          }
          if (best >= 0 && JS === 'JOINTS_0') stats.get(joints[j[best]].getName()).dominant += 1;
        }
      }
    }
  }
  return stats;
}

// ---------------------------------------------------------------------------
// The rest pose: T or A, from the bind matrices
// ---------------------------------------------------------------------------

/**
 * **The upper arm's angle below the horizontal, per side**, from two bind
 * positions (the shoulder joint and the elbow joint), in world space with +Y up.
 * `T` is under 15° on both arms, `A` 15–65° on both and within 15° of each other,
 * `down` over 65°, and anything else `posed` (one hand on a hip, say).
 */
export function armAngles(positions) {
  const angle = (side) => {
    const s = positions[`upperarm_${side}`];
    const e = positions[`lowerarm_${side}`];
    if (!s || !e) return null;
    const dx = e[0] - s[0];
    const dy = e[1] - s[1];
    const dz = e[2] - s[2];
    return (Math.atan2(-dy, Math.hypot(dx, dz)) * 180) / Math.PI;
  };
  const l = angle('l');
  const r = angle('r');
  const sides = [l, r].filter((a) => a !== null);
  let verdict = 'unknown';
  if (sides.length > 0) {
    if (sides.every((a) => a < 15)) verdict = 'T';
    else if (sides.every((a) => a >= 15 && a <= 65) && (sides.length < 2 || Math.abs(l - r) <= 15)) verdict = 'A';
    else if (sides.every((a) => a > 65)) verdict = 'down';
    else verdict = 'posed';
  }
  return { l: l === null ? null : round(l, 1), r: r === null ? null : round(r, 1), verdict };
}

// ---------------------------------------------------------------------------
// The cloak rule
// ---------------------------------------------------------------------------

/**
 * **The height rule for a mesh with no skin** (D191), pure: a vertex's height →
 * its weights on `pelvis` / `spine_02` / `spine_03`, given those joints' bind
 * heights. At or above `spine_03`: all `spine_03`. Between `spine_02` and
 * `spine_03`, and between `pelvis` and `spine_02`: a linear blend of the two. At
 * or below the pelvis: all `pelvis`. The weights sum to 1.
 */
export function heightWeights(y, heights) {
  const chain = ['pelvis', 'spine_02', 'spine_03'];
  const ys = chain.map((j) => heights[j]);
  if (ys.some((h) => !Number.isFinite(h))) throw new Error('heightWeights: pelvis, spine_02 and spine_03 heights are needed');
  if (y >= ys[2]) return { spine_03: 1 };
  if (y <= ys[0]) return { pelvis: 1 };
  const k = y >= ys[1] ? 1 : 0;
  const t = (y - ys[k]) / Math.max(1e-9, ys[k + 1] - ys[k]);
  return { [chain[k]]: 1 - t, [chain[k + 1]]: t };
}

// ---------------------------------------------------------------------------
// Judging a prepared body against the agent's: weight, sides, facing, shape
// ---------------------------------------------------------------------------

/**
 * **Why these checks exist** (D192). `prepare.mjs` builds every skeleton in the
 * `agent`'s bind rotations and `check.mjs` plays the `agent`'s clips on it, so a
 * joint's rotation on the model equals the agent's for ANY rig map — a map that
 * names the wrong bone passes every rotation test. What a wrong map changes is
 * where the WEIGHT goes and where the joints STAND. So a prepared body is judged
 * against the agent body, from its skin and its bind positions:
 *
 *   - **weight**: a joint the agent's skin uses must carry weight on the model
 *     (a core joint with none fails: the map named a bone that deforms nothing);
 *     weighted source bones placed "by position" rather than by the map are a
 *     warning, and a failure over `BY_POSITION_LIMIT` of the skin weight;
 *   - **sides**: every `_l` joint, and the vertices it carries, on the side the
 *     agent's is (+x, the character's left — D81);
 *   - **facing**: each foot's vertices in FRONT of its ankle, as the agent's are —
 *     a map with left and right swapped everywhere passes the side test (prepare
 *     turns the whole figure round to match it) and fails this one;
 *   - **shape**: the skeleton's branches — pelvis → thigh, spine_03 → clavicle
 *     — and each foot → ball point within `SEGMENT_LIMIT_DEG` of the agent's (the
 *     links of the spine, the arms and the legs are `judgeLimbs`'s, D193).
 *
 * `body` and `agent` are `{ joints: { <our joint>: [x, y, z] }, mass: { <our
 * joint>: { at: [x, y, z], n, weight } }, totalWeight, height }`: bind positions,
 * and for each joint the centroid and count of the vertices it dominates and the
 * skin weight it carries (a joint outside our 22 counted as its nearest ancestor
 * of ours — the agent's fingers as its hand). `rig` is the manifest's `rig`.
 */
export const SIDED_STEMS = ['clavicle', 'upperarm', 'lowerarm', 'hand', 'thigh', 'calf', 'foot', 'ball'];
/**
 * Our skeleton's segments judged here by direction: the branches and the toes.
 * The links of the spine, the arms and the legs are `judgeLimbs`'s (D193), with
 * tighter limits and their lengths and flesh; until D193 the spine and leg links
 * were judged here too, at 60°, and a fold in them failed twice.
 */
export const SEGMENTS = ['l', 'r'].flatMap((s) => [
  ['pelvis', `thigh_${s}`],
  ['spine_03', `clavicle_${s}`],
  [`foot_${s}`, `ball_${s}`],
]);
/** A joint "carries weight" on the agent at this share of its skin weight … */
export const AGENT_WEIGHT_MIN = 0.001;
/** … and "carries none" on the model under this. */
export const MODEL_WEIGHT_NONE = 0.0001;
/** Weighted source bones placed by position (not by the map) may carry at most this share of the skin weight. */
export const BY_POSITION_LIMIT = 0.02;
/** A segment may point at most this far from the agent's. */
export const SEGMENT_LIMIT_DEG = 60;

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len3 = (a) => Math.hypot(a[0], a[1], a[2]);
const pct = (x) => `${(100 * x).toFixed(x < 0.001 && x > 0 ? 3 : 1)}%`;

export function judgeBody(body, agent, rig = {}) {
  const problems = [];
  const warnings = [];
  const share = (b, j) => (b.mass[j]?.weight ?? 0) / Math.max(1e-12, b.totalWeight);
  const synthesised = new Set(rig?.synthesised ?? []);

  // Weight.
  const weight = {};
  for (const j of OUR_JOINTS) {
    const mine = share(body, j);
    const theirs = share(agent, j);
    const primary = rig?.joints?.[j]?.primary ?? null;
    weight[j] = { share: mine, agent: theirs, verts: body.mass[j]?.n ?? 0 };
    if (theirs >= AGENT_WEIGHT_MIN && mine < MODEL_WEIGHT_NONE) {
      if (synthesised.has(j)) {
        warnings.push(`${j} was synthesised (the source has no such bone), so it carries no weight; the agent's carries ${pct(theirs)} — its neighbours move those vertices`);
      } else {
        const message = `${j} ← ${primary ?? '(unmapped)'} carries no skin weight (the agent's ${j} carries ${pct(theirs)}): its vertices went to another joint, so the map names a bone that deforms nothing`;
        (CORE_JOINTS.includes(j) ? problems : warnings).push(message);
      }
    }
    if (rig?.joints?.[j]?.primaryWeighted === false) {
      warnings.push(
        `${j} stands where ${primary} stands, which carries no weight in the source: right when that bone marks the joint (Auto-Rig Pro's arm_twist does, its weight on c_arm_twist_offset), wrong when it is a controller somewhere else — look at the joint in the previews`,
      );
    }
  }
  const placement = rig?.placement ?? null;
  if (placement === null) warnings.push('the manifest has no rig.placement (it predates it): re-run prepare.mjs to judge what was placed by position');
  else if (placement.byPosition > 0) {
    const message = `${String(placement.byPosition)} weighted source bone(s), ${pct(placement.byPositionWeight)} of the skin weight, were placed by POSITION, not by the map: list them in bones.json as followers of the joint they belong to, or fix the map`;
    (placement.byPositionWeight > BY_POSITION_LIMIT ? problems : warnings).push(message);
  }

  // Sides: every _l joint, and the vertices it carries, where the agent's are.
  const sides = [];
  const sideMin = (b) => 0.01 * b.height;
  for (const stem of SIDED_STEMS) {
    const l = `${stem}_l`;
    const r = `${stem}_r`;
    if (!body.joints[l] || !body.joints[r] || !agent.joints[l] || !agent.joints[r]) continue;
    const dx = body.joints[l][0] - body.joints[r][0];
    const adx = agent.joints[l][0] - agent.joints[r][0];
    const judged = Math.abs(dx) >= sideMin(body) && Math.abs(adx) >= sideMin(agent);
    const ok = !judged || Math.sign(dx) === Math.sign(adx);
    sides.push({ what: `${l} vs ${r}`, x: dx, agent: adx, judged, ok });
    if (!ok) problems.push(`${l} stands on the figure's ${dx > 0 ? 'left' : 'right'} of ${r} (x ${dx.toFixed(3)}), the agent's on its ${adx > 0 ? 'left' : 'right'}: the map has swapped a side`);
    for (const j of [l, r]) {
      const m = body.mass[j];
      const a = agent.mass[j];
      if (!m || !a || m.n === 0 || a.n === 0) continue;
      const x = m.at[0];
      const ax = a.at[0];
      const judgedMass = Math.abs(x) >= sideMin(body) && Math.abs(ax) >= sideMin(agent);
      const okMass = !judgedMass || Math.sign(x) === Math.sign(ax);
      sides.push({ what: `${j}'s vertices`, x, agent: ax, judged: judgedMass, ok: okMass });
      if (!okMass) problems.push(`the vertices ${j} carries sit at x ${x.toFixed(3)}, the agent's at x ${ax.toFixed(3)}: they are on the other side`);
    }
  }

  // Facing: each foot's vertices in front of its ankle.
  const facing = {};
  for (const s of ['l', 'r']) {
    const fwd = (b) => {
      const parts = [b.mass[`foot_${s}`], b.mass[`ball_${s}`]].filter((m) => m && m.n > 0);
      const n = parts.reduce((a, m) => a + m.n, 0);
      if (n === 0 || !b.joints[`foot_${s}`]) return null;
      const z = parts.reduce((a, m) => a + m.at[2] * m.n, 0) / n;
      return z - b.joints[`foot_${s}`][2];
    };
    const mine = fwd(body);
    const theirs = fwd(agent);
    facing[s] = { forward: mine, agent: theirs };
    if (mine === null || theirs === null || Math.abs(theirs) < 0.005 * agent.height) {
      warnings.push(`the ${s === 'l' ? 'left' : 'right'} foot carries no vertices to judge the facing by`);
    } else if (Math.abs(mine) < 0.005 * body.height) {
      warnings.push(`the ${s === 'l' ? 'left' : 'right'} foot's vertices are level with its ankle (${mine.toFixed(3)} m): the facing is not judged by it`);
    } else if (Math.sign(mine) !== Math.sign(theirs)) {
      problems.push(
        `the ${s === 'l' ? 'left' : 'right'} foot points BACKWARDS: its vertices are ${Math.abs(mine).toFixed(3)} m ${mine < 0 ? 'behind' : 'in front of'} the ankle, the agent's ${Math.abs(theirs).toFixed(3)} m ${theirs < 0 ? 'behind' : 'in front'} — the figure faces the wrong way, so the map has swapped left and right`,
      );
    }
  }

  // Shape: every segment points roughly where the agent's does.
  const segments = [];
  for (const [a, b] of SEGMENTS) {
    if (!body.joints[a] || !body.joints[b] || !agent.joints[a] || !agent.joints[b]) continue;
    const d = sub3(body.joints[b], body.joints[a]);
    const e = sub3(agent.joints[b], agent.joints[a]);
    const ld = len3(d);
    const le = len3(e);
    if (ld < 1e-9 || le < 1e-9) {
      segments.push({ a, b, deg: null });
      warnings.push(`${a} and ${b} stand at one point, so ${a} → ${b} has no direction`);
      continue;
    }
    const cos = Math.max(-1, Math.min(1, (d[0] * e[0] + d[1] * e[1] + d[2] * e[2]) / (ld * le)));
    const deg = (Math.acos(cos) * 180) / Math.PI;
    segments.push({ a, b, deg });
    if (deg > SEGMENT_LIMIT_DEG) problems.push(`${a} → ${b} points ${deg.toFixed(0)}° away from the agent's (over ${String(SEGMENT_LIMIT_DEG)}°): a joint is mapped to the wrong bone`);
  }

  return { problems, warnings, weight, sides, facing, segments };
}

// ---------------------------------------------------------------------------
// Judging a prepared body's LIMBS against the agent's: direction, length, flesh
// ---------------------------------------------------------------------------

/**
 * **Why this check exists** (D193, the third skeptic round). A map that swaps
 * the forearm and the hand passed every check above: the rotations hold by
 * construction, the weight still lands on 22 joints, the sides are right, and
 * the bounds test cannot see a fold (the arm gets SHORTER). It fails here.
 *
 * Each LINK of a chain — the spine `pelvis → spine_01 → … → neck_01 → Head`,
 * each arm `upperarm → lowerarm → hand`, each leg `thigh → calf → foot` — is a
 * bone from a joint to its child, at rest, judged against the agent's same
 * link:
 *
 *   - **direction**: the unit vector child joint − joint points within
 *     `LIMB_DIRECTION_DEG` (arms and legs) or `SPINE_DIRECTION_DEG` (the spine
 *     and the neck, whose joints each convention spaces and bends its own way —
 *     Doom's `neck_01 → Head` is 36°) of the agent's. A link with a synthesised
 *     end is not judged (it was placed between its neighbours). Under `--pose t`
 *     prepare turns each arm link onto the agent's direction, so the arm
 *     directions pass BY CONSTRUCTION there — the next two checks are the arm's
 *     measurement — and under `--pose none` they are measured;
 *   - **length**: the second link of each limb against the first — the forearm
 *     over the upper arm, the calf over the thigh — as a multiple of the agent's
 *     same proportion, inside `LIMB_LENGTH_BAND` either way. A swap of two
 *     joints makes one link span two bones and the next run back over one, so
 *     the proportion halves or doubles (the forearm↔hand swap: 0.52×). The
 *     spine is not judged by length: its joint spacing is a rig convention
 *     (Doom's neck is 2.06× the agent's proportion, Hulk's 0.49×);
 *   - **flesh**: where the vertices a limb joint dominates lie along its link —
 *     `s` = (their centroid − the joint) · link / |link|², 0 at the joint, 1 at
 *     the child. The agent's are 0.32–0.60; a folded limb carries its flesh
 *     BEHIND its joint (s ≤ 0; the forearm↔hand swap: −0.42), which no turn of
 *     the skeleton can hide, because prepare turns the flesh with the joint.
 *
 * And at t = 0.5 of the attack clip (`attack`, when given), each chain's END
 * joint — both hands, both feet and the head — must have moved into the same
 * half-space as the agent's did (cosine > 0), wherever the agent's moved at
 * least `END_MOVE_MIN` of its height.
 *
 * `body` and `agent` are `judgeBody`'s (bind positions, and per joint the
 * centroid of the vertices it dominates); `rig` is the manifest's `rig`, `fix`
 * the manifest's `pose.fix`, and `attack` is `{ body: { <joint>: [x, y, z] },
 * agent: { … } }`, the joints' positions at attack t = 0.5.
 */
export const LIMB_CHAINS = [
  ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head'],
  ...['l', 'r'].flatMap((s) => [
    [`upperarm_${s}`, `lowerarm_${s}`, `hand_${s}`],
    [`thigh_${s}`, `calf_${s}`, `foot_${s}`],
  ]),
];
/** A limb link may point at most this far from the agent's … */
export const LIMB_DIRECTION_DEG = 25;
/** … and a spine or neck link at most this far. */
export const SPINE_DIRECTION_DEG = 45;
/** A limb's second link over its first, as a multiple of the agent's: inside [1 / band, band]. */
export const LIMB_LENGTH_BAND = 1.6;
/** A limb joint's flesh must lie ahead of it (s above this) wherever the agent's lies at least FLESH_AGENT_MIN along its link. */
export const FLESH_MIN = 0;
export const FLESH_AGENT_MIN = 0.1;
/** The chain ends judged at attack t = 0.5, where the agent's moved at least this share of its height. */
export const END_JOINTS = ['hand_l', 'hand_r', 'foot_l', 'foot_r', 'Head'];
export const END_MOVE_MIN = 0.02;
const ARM_STEMS = ['upperarm', 'lowerarm', 'hand'];

export function judgeLimbs(body, agent, { rig = {}, fix = 't', attack = null } = {}) {
  const problems = [];
  const warnings = [];
  const synthesised = new Set(rig?.synthesised ?? []);
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const links = [];
  const lengths = [];

  for (const chain of LIMB_CHAINS) {
    const spine = chain[0] === 'pelvis';
    const limit = spine ? SPINE_DIRECTION_DEG : LIMB_DIRECTION_DEG;
    const inChain = [];
    for (let k = 0; k + 1 < chain.length; k += 1) {
      const a = chain[k];
      const b = chain[k + 1];
      if (!body.joints[a] || !body.joints[b] || !agent.joints[a] || !agent.joints[b]) continue;
      const d = sub3(body.joints[b], body.joints[a]);
      const e = sub3(agent.joints[b], agent.joints[a]);
      const ld = len3(d);
      const le = len3(e);
      const skipped = synthesised.has(a) || synthesised.has(b);
      const turned = fix === 't' && ARM_STEMS.includes(a.replace(/_[lr]$/, ''));
      const link = { a, b, limit, deg: null, length: ld, agentLength: le, flesh: null, agentFlesh: null, turned, skipped };
      links.push(link);
      inChain.push(link);
      if (skipped) continue;
      if (ld < 1e-9 || le < 1e-9) {
        // A limb link of no length is a map that gave two of our joints one bone's
        // position: the limb cannot bend there. The spine's is a warning, as in judgeBody.
        const message = `${a} and ${b} stand at one point, so ${a} → ${b} has no direction or length`;
        if (spine) warnings.push(message);
        else problems.push(`${message}: the map names one bone for two joints of the limb`);
        continue;
      }
      link.deg = (Math.acos(Math.max(-1, Math.min(1, dot3(d, e) / (ld * le)))) * 180) / Math.PI;
      if (link.deg > limit) {
        problems.push(`${a} → ${b} points ${link.deg.toFixed(0)}° away from the agent's (over ${String(limit)}°): the chain is folded or a joint is mapped to the wrong bone`);
      }
      if (spine) continue;
      // Flesh: where the vertices this joint dominates lie along its link.
      const m = body.mass[a];
      const n = agent.mass[a];
      if (m?.at && m.n > 0) link.flesh = dot3(sub3(m.at, body.joints[a]), d) / (ld * ld);
      if (n?.at && n.n > 0) link.agentFlesh = dot3(sub3(n.at, agent.joints[a]), e) / (le * le);
      if (link.flesh !== null && link.agentFlesh !== null && link.agentFlesh >= FLESH_AGENT_MIN && !(link.flesh > FLESH_MIN)) {
        problems.push(
          `the vertices ${a} carries lie BEHIND it on ${a} → ${b} (at ${link.flesh.toFixed(2)} of the link; the agent's at ${link.agentFlesh.toFixed(2)}): the limb is folded back on itself — two of its joints are swapped`,
        );
      }
    }
    // Length: a limb's second link against its first, against the agent's same proportion.
    if (!spine && inChain.length === 2 && inChain.every((l) => !l.skipped && l.length > 1e-9 && l.agentLength > 1e-9)) {
      const [first, second] = inChain;
      const mine = second.length / first.length;
      const theirs = second.agentLength / first.agentLength;
      const times = mine / theirs;
      const ok = times >= 1 / LIMB_LENGTH_BAND && times <= LIMB_LENGTH_BAND;
      lengths.push({ first: `${first.a} → ${first.b}`, second: `${second.a} → ${second.b}`, mine, theirs, times, ok });
      if (!ok) {
        problems.push(
          `${second.a} → ${second.b} is ${mine.toFixed(2)}× as long as ${first.a} → ${first.b}, the agent's ${theirs.toFixed(2)}× — ${times.toFixed(2)}× the agent's proportion, outside ${(1 / LIMB_LENGTH_BAND).toFixed(2)}–${LIMB_LENGTH_BAND.toFixed(1)}×: a link spans two bones, so two joints of the chain are swapped or misplaced`,
        );
      }
    }
  }

  // The chains' ends, at attack t = 0.5: moved the agent's way.
  const ends = [];
  if (attack !== null) {
    for (const j of END_JOINTS) {
      const p = body.joints[j];
      const q = agent.joints[j];
      const p5 = attack.body?.[j];
      const q5 = attack.agent?.[j];
      if (!p || !q || !p5 || !q5) continue;
      const mine = sub3(p5, p);
      const theirs = sub3(q5, q);
      const judged = len3(theirs) >= END_MOVE_MIN * agent.height;
      const cos = len3(mine) < 1e-9 || len3(theirs) < 1e-9 ? null : dot3(mine, theirs) / (len3(mine) * len3(theirs));
      const ok = !judged || (cos !== null && cos > 0);
      ends.push({ joint: j, cos, moved: len3(mine), agentMoved: len3(theirs), judged, ok });
      if (!ok) {
        problems.push(
          `at attack t = 0.5 ${j} moved ${cos === null ? 'not at all' : `against the agent's (cosine ${cos.toFixed(2)})`}: ${len3(mine).toFixed(3)} m, the agent's ${len3(theirs).toFixed(3)} m — the clip carries this end the other way, so its chain is mapped wrong`,
        );
      }
    }
  }

  return { problems, warnings, links, lengths, ends };
}

// ---------------------------------------------------------------------------
// The preview browser's network, from its own net log (check.mjs)
// ---------------------------------------------------------------------------

/** An address as the net log writes it (`1.2.3.4:80`, `[2001:db8::1]:443`) → its host. */
export function hostOf(address) {
  return String(address).replace(/^\[([^\]]*)\](:\d+)?$/, '$1').replace(/^([^:]+):\d+$/, '$1');
}

/**
 * **What Chromium's net log says the browser did on the network** (D192):
 * requests to the loopback; requests elsewhere (and whether any got an answer);
 * real DNS queries; TCP connections and UDP sockets to anything but the
 * loopback, and whether a byte was sent on one. `check.mjs` fails on a TCP
 * connection, a byte sent, a DNS query or an answer beyond the loopback. A log
 * cut short by the browser's exit is closed before it is parsed. Pure over the
 * log's text; `personal-tier.test.ts` holds it on a synthetic log.
 */
export function netLogReport(text) {
  const LOOPBACK = /^(127\.\d+\.\d+\.\d+|::1|localhost)$/;
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = JSON.parse(`${text.replace(/,\s*$/, '')}]}`);
  }
  const type = Object.fromEntries(Object.entries(json.constants.logEventTypes).map(([k, v]) => [v, k]));
  const report = { loopback: 0, attempted: new Map(), answered: [], dnsQueries: 0, tcpAway: [], udpAway: [], sentAway: [], cacheEntries: 0, cacheHosts: new Map() };
  const urlOf = new Map(); // source id → url host
  const peerOf = new Map(); // source id → a non-loopback peer
  for (const event of json.events ?? []) {
    const name = type[event.type] ?? '';
    const params = event.params ?? {};
    const id = event.source?.id;
    if (name === 'URL_REQUEST_START_JOB' && typeof params.url === 'string') {
      const host = new URL(params.url).hostname.replace(/^\[|\]$/g, '');
      urlOf.set(id, host);
      if (LOOPBACK.test(host)) report.loopback += 1;
      else report.attempted.set(host, (report.attempted.get(host) ?? 0) + 1);
    }
    if (name === 'HTTP_TRANSACTION_READ_RESPONSE_HEADERS' && urlOf.has(id) && !LOOPBACK.test(urlOf.get(id))) report.answered.push(urlOf.get(id));
    if (/^(DNS_TRANSACTION|HOST_RESOLVER_SYSTEM_TASK|HOST_RESOLVER_DNS_TASK|HOST_RESOLVER_MANAGER_DNS_TASK)/.test(name) && event.phase !== 2) report.dnsQueries += 1;
    if (/^TCP_CONNECT/.test(name)) {
      for (const a of [params.address, ...(Array.isArray(params.address_list) ? params.address_list : [])]) {
        if (a !== undefined && !LOOPBACK.test(hostOf(a))) report.tcpAway.push(hostOf(a));
      }
    }
    if (name === 'UDP_CONNECT' && params.address !== undefined && !LOOPBACK.test(hostOf(params.address))) {
      report.udpAway.push(hostOf(params.address));
      peerOf.set(id, hostOf(params.address));
    }
    if (/BYTES_SENT$/.test(name) && peerOf.has(id)) report.sentAway.push(peerOf.get(id));
    // The HTTP cache: every entry it keyed (the disk cache's SET_KEY, the memory
    // cache's ENTRY_IMPL), by the host of the URL its key ends in
    // (`1/0/_dk_<site> <site> <url>`).
    if (/^(SIMPLE_CACHE_ENTRY_SET_KEY|DISK_CACHE_ENTRY_IMPL|DISK_CACHE_MEM_ENTRY_IMPL)$/.test(name) && typeof params.key === 'string') {
      const url = params.key.trim().split(/\s+/).pop() ?? '';
      let host = '(unparsed)';
      try {
        host = new URL(url).hostname.replace(/^\[|\]$/g, '');
      } catch {
        /* a key that is not a URL is counted as unparsed, and is not the loopback */
      }
      report.cacheEntries += 1;
      report.cacheHosts.set(host, (report.cacheHosts.get(host) ?? 0) + 1);
    }
  }
  report.cacheAway = [...report.cacheHosts.keys()].filter((h) => !LOOPBACK.test(h));
  return report;
}

/**
 * **What the preview browser's profile kept on disk** (D193), read before it is
 * deleted: its files and bytes, the HTTP cache entries still in
 * `Default/Cache/Cache_Data/` (a simple-cache entry file per URL), and every
 * file that holds a copy of the model — any of `samples` (byte strings cut from
 * `model.glb`'s binary chunk) found in it. `skip` names files not to read (the
 * net log, which is ours). Reads files; writes nothing.
 */
export function profileReport(dir, { samples = [], skip = [] } = {}) {
  const report = { files: 0, bytes: 0, cacheFiles: [], copies: [] };
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const path = join(d, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && !skip.includes(path)) {
        const bytes = readFileSync(path);
        report.files += 1;
        report.bytes += bytes.length;
        const rel = relative(dir, path);
        if (/(^|\/)Cache_Data\/[0-9a-f]{16}_\d+$/.test(rel)) report.cacheFiles.push(rel);
        if (samples.some((sample) => sample.length > 0 && bytes.indexOf(sample) >= 0)) report.copies.push(rel);
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return report;
}

// ---------------------------------------------------------------------------
// Inspection
// ---------------------------------------------------------------------------

/** A glTF's JSON, raw, for what gltf-transform does not keep (a VRM's `humanBones`). */
export function rawJsonOf(bytesOrPath) {
  const bytes = typeof bytesOrPath === 'string' ? readFileSync(bytesOrPath) : Buffer.from(bytesOrPath);
  if (bytes.readUInt32LE(0) === 0x46546c67) {
    const length = bytes.readUInt32LE(12);
    return JSON.parse(bytes.toString('utf8', 20, 20 + length));
  }
  return JSON.parse(bytes.toString('utf8'));
}

/** A VRM file's own humanoid table (VRM 1.0 `VRMC_vrm` or 0.x `VRM`), as humanoid bone → node name. */
export function vrmHumanBonesOf(json) {
  const nodes = json.nodes ?? [];
  const name = (i) => nodes[i]?.name ?? null;
  const v1 = json.extensions?.VRMC_vrm?.humanoid?.humanBones;
  if (isObject(v1)) {
    const out = {};
    for (const [bone, spec] of Object.entries(v1)) if (name(spec.node) !== null) out[bone] = name(spec.node);
    return out;
  }
  const v0 = json.extensions?.VRM?.humanoid?.humanBones;
  if (Array.isArray(v0)) {
    const out = {};
    for (const spec of v0) if (name(spec.node) !== null) out[spec.bone] = name(spec.node);
    return out;
  }
  return null;
}

/** Read a .gltf (with its resources beside it) or a .glb, from a path or from bytes. */
export async function readDocument(pathOrBytes) {
  const io = await personalIO();
  // A .vrm is a .glb by another name; NodeIO picks the format by extension.
  if (typeof pathOrBytes === 'string' && !/\.vrm$/i.test(pathOrBytes)) return io.read(pathOrBytes);
  const bytes = typeof pathOrBytes === 'string' ? readFileSync(pathOrBytes) : pathOrBytes;
  return io.readBinary(new Uint8Array(bytes));
}

/**
 * **What is in this file** — every fact `import.mjs` prints and writes to
 * `inspect.json`. Pure over the document (and the raw JSON, for a VRM table).
 */
export function inspectDocument(doc, rawJson = {}) {
  const root = doc.getRoot();
  const asset = root.getAsset();
  const nodes = allNodes(doc);
  const skins = root.listSkins();
  const jointSet = new Set(skins.flatMap((s) => s.listJoints()));

  // Meshes, one row per mesh NODE (a mesh used twice is drawn twice).
  const skinInfos = new Map(skins.map((s) => [s, skinAtRest(s, weightedJoints(doc, s))]));
  const meshes = [];
  const box = new THREE.Box3();
  const renderBox = new THREE.Box3();
  const v = new THREE.Vector3();
  for (const { node, ancestors } of nodes) {
    const mesh = node.getMesh();
    if (mesh === null) continue;
    const skin = node.getSkin();
    const materials = mesh.listPrimitives().map((p) => p.getMaterial()?.getName() ?? null);
    const control = controlReason([node.getName(), mesh.getName(), ...materials, ...ancestors]);
    const rigidParent = skin === null ? ([...ancestors].reverse().find((a) => [...jointSet].some((j) => j.getName() === a)) ?? null) : null;
    const primitives = mesh.listPrimitives().map((prim) => {
      const positions = restPositions(node, prim, skin === null ? null : skinInfos.get(skin));
      for (let i = 0; i < positions.length; i += 3) {
        v.fromArray(positions, i);
        box.expandByPoint(v);
        if (control === null) renderBox.expandByPoint(v);
      }
      return {
        material: prim.getMaterial()?.getName() ?? null,
        triangles: trianglesOf(prim),
        vertices: prim.getAttribute('POSITION').getCount(),
        attributes: prim.listSemantics(),
        mode: prim.getMode(),
      };
    });
    meshes.push({
      node: node.getName(),
      mesh: mesh.getName(),
      path: [...ancestors, node.getName()].join(' / '),
      skinned: skin !== null,
      rigidParent,
      control,
      triangles: primitives.reduce((a, p) => a + p.triangles, 0),
      primitives,
    });
  }

  const materials = root.listMaterials().map((m) => ({
    name: m.getName(),
    baseColorTexture: m.getBaseColorTexture()?.getURI() || m.getBaseColorTexture()?.getName() || null,
    normalTexture: m.getNormalTexture()?.getURI() || m.getNormalTexture()?.getName() || null,
    metallicRoughnessTexture: m.getMetallicRoughnessTexture()?.getURI() || null,
    occlusionTexture: m.getOcclusionTexture()?.getURI() || null,
    emissiveTexture: m.getEmissiveTexture()?.getURI() || null,
    alphaMode: m.getAlphaMode(),
    baseColorFactor: m.getBaseColorFactor().map((x) => round(x, 3)),
  }));
  const textures = root.listTextures().map((t) => {
    const image = t.getImage();
    const size = image === null ? null : GLTF.ImageUtils.getSize(image, t.getMimeType());
    const usedBy = [];
    for (const m of root.listMaterials()) {
      if (m.getBaseColorTexture() === t) usedBy.push(`${m.getName()}.baseColor`);
      if (m.getNormalTexture() === t) usedBy.push(`${m.getName()}.normal`);
      if (m.getMetallicRoughnessTexture() === t) usedBy.push(`${m.getName()}.metallicRoughness`);
      if (m.getOcclusionTexture() === t) usedBy.push(`${m.getName()}.occlusion`);
      if (m.getEmissiveTexture() === t) usedBy.push(`${m.getName()}.emissive`);
    }
    return { name: t.getName(), uri: t.getURI(), mimeType: t.getMimeType(), size, bytes: image?.byteLength ?? 0, usedBy };
  });

  // Skins: joints, their hierarchy, which carry weight.
  const skinRows = skins.map((skin) => {
    const info = skinInfos.get(skin);
    const joints = skin.listJoints();
    const inSkin = new Set(joints);
    const weighted = weightedJoints(doc, skin);
    const hierarchy = joints.map((j) => {
      let parent = j.getParentNode();
      while (parent !== null && !inSkin.has(parent)) parent = parent.getParentNode();
      return { name: j.getName(), parent: parent?.getName() ?? null, weighted: weighted.has(j.getName()) };
    });
    const roots = hierarchy.filter((h) => h.parent === null).map((h) => h.name);
    return {
      name: skin.getName(),
      joints: joints.length,
      jointNames: joints.map((j) => j.getName()),
      roots,
      hierarchy,
      weighted: [...weighted.entries()]
        .map(([name, s]) => ({ name, weight: round(s.weight, 2), vertices: s.vertices, dominant: s.dominant }))
        .sort((a, b) => b.weight - a.weight),
      bindSpread: round(info.bindSpread, 6),
    };
  });

  // The rig map and the rest pose, from the first skin.
  let rigMap = null;
  let restPose = null;
  let unassigned = [];
  const vrmHumanBones = vrmHumanBonesOf(rawJson);
  if (skins.length > 0) {
    const skin = skins[0];
    const info = skinInfos.get(skin);
    const names = skin.listJoints().map((j) => j.getName());
    rigMap = detectRigMap(names, { vrmHumanBones });
    const positions = {};
    for (const joint of OUR_JOINTS) {
      const primary = rigMap.joints[joint].primary;
      if (primary !== null) positions[joint] = info.bind[names.indexOf(primary)].toArray();
    }
    restPose = { ...armAngles(positions), method: 'the bind matrices: shoulder → elbow, from each joint’s inverse bind matrix', bindSpread: round(info.bindSpread, 6) };
    const weighted = weightedJoints(doc, skin);
    const mapped = new Set(OUR_JOINTS.flatMap((j) => [rigMap.joints[j].primary, ...rigMap.joints[j].followers]).filter(Boolean));
    unassigned = [...weighted.keys()].filter((n) => !mapped.has(n));
  }

  const size = renderBox.isEmpty() ? [0, 0, 0] : renderBox.getSize(new THREE.Vector3()).toArray();
  const height = size[1];
  const units = height >= 1 && height <= 3 ? 'metres' : height >= 100 && height <= 300 ? 'centimetres' : `unknown (${round(height, 3)} units tall)`;
  const triangles = {
    total: meshes.reduce((a, m) => a + m.triangles, 0),
    render: meshes.filter((m) => m.control === null).reduce((a, m) => a + m.triangles, 0),
    control: meshes.filter((m) => m.control !== null).reduce((a, m) => a + m.triangles, 0),
  };
  const allNames = [
    ...nodes.map((n) => n.node.getName()),
    ...root.listMeshes().map((m) => m.getName()),
    ...root.listMaterials().map((m) => m.getName()),
    ...root.listTextures().flatMap((t) => [t.getName(), t.getURI()]),
  ];
  return {
    // gltf-transform stamps its own generator on read, so the file's own words come from the raw JSON.
    asset: {
      generator: rawJson.asset?.generator ?? asset.generator ?? null,
      version: rawJson.asset?.version ?? asset.version,
      copyright: rawJson.asset?.copyright ?? asset.copyright ?? null,
      extras: rawJson.asset?.extras ?? asset.extras ?? {},
    },
    scenes: root.listScenes().map((s) => ({ name: s.getName(), roots: s.listChildren().map((n) => n.getName()) })),
    nodes: { total: nodes.length, joints: jointSet.size, meshNodes: meshes.length },
    triangles,
    meshes,
    materials,
    textures,
    skins: skinRows,
    animations: root.listAnimations().map((a) => ({
      name: a.getName(),
      channels: a.listChannels().length,
      duration: round(Math.max(0, ...a.listSamplers().map((s) => s.getInput()?.getMax([0])[0] ?? 0)), 3),
    })),
    bounds: {
      min: renderBox.isEmpty() ? null : renderBox.min.toArray().map((x) => round(x)),
      max: renderBox.isEmpty() ? null : renderBox.max.toArray().map((x) => round(x)),
      size: size.map((x) => round(x)),
      height: round(height),
      units,
      withControlShapes: box.isEmpty() ? null : box.getSize(new THREE.Vector3()).toArray().map((x) => round(x)),
    },
    rigMap,
    unassignedWeightedJoints: unassigned,
    vrmHumanBones,
    restPose,
    flags: {
      controlMeshes: meshes.filter((m) => m.control !== null).map((m) => ({ node: m.node, reason: m.control, triangles: m.triangles })),
      unskinnedMeshes: meshes
        .filter((m) => m.control === null && !m.skinned)
        .map((m) => ({ node: m.node, path: m.path, triangles: m.triangles, rigidParent: m.rigidParent })),
      gameAssetNames: gameAssetHits(allNames),
      controlJoints: skinRows.length > 0 ? skinRows[0].joints - skinRows[0].weighted.length : 0,
    },
  };
}

/** Where a slug's source file is: the one .gltf / .glb / .vrm under `source/` (the shallowest). */
export function findSourceModel(dir) {
  const found = [];
  const walk = (d, depth) => {
    if (!existsSync(d)) return;
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p, depth + 1);
      else if (/\.(gltf|glb|vrm)$/i.test(entry.name)) found.push({ p, depth });
    }
  };
  walk(dir, 0);
  found.sort((a, b) => a.depth - b.depth || a.p.localeCompare(b.p));
  return found.length > 0 ? found[0].p : null;
}

// ---------------------------------------------------------------------------
// The exposure (fix pass 1, D198): an unlit figure's paint IS its value
// ---------------------------------------------------------------------------

/** sRGB 8-bit → linear, as a table (the exposure step reads millions of texels). */
export const SRGB_TO_LINEAR = Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

/** Linear → sRGB 8-bit, rounded and clamped. */
export function linearToSrgb8(x) {
  const c = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(255 * c)));
}

/** A texel's linear luminance (Rec. 709 weights, as the arena's shader reads it). */
export function texelLuminance(r8, g8, b8) {
  return 0.2126 * SRGB_TO_LINEAR[r8] + 0.7152 * SRGB_TO_LINEAR[g8] + 0.0722 * SRGB_TO_LINEAR[b8];
}

/**
 * **Multiply RGBA texels by one gain in linear light, in place** (D198): each
 * channel converted to linear, multiplied, and — when any channel would pass 1 —
 * the texel scaled back down as a whole, so its hue holds and nothing clips to
 * white. Alpha is untouched. Returns how many texels were scaled back.
 */
export function exposeTexels(rgba, gain) {
  let capped = 0;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const r = SRGB_TO_LINEAR[rgba[i]] * gain;
    const g = SRGB_TO_LINEAR[rgba[i + 1]] * gain;
    const b = SRGB_TO_LINEAR[rgba[i + 2]] * gain;
    const k = Math.max(1, r, g, b);
    if (k > 1) capped += 1;
    rgba[i] = linearToSrgb8(r / k);
    rgba[i + 1] = linearToSrgb8(g / k);
    rgba[i + 2] = linearToSrgb8(b / k);
  }
  return capped;
}

/** The value at quantile `q` of `[value, weight]` pairs (sorted in place by value). */
export function weightedQuantile(samples, q) {
  if (samples.length === 0) return 0;
  samples.sort((a, b) => a[0] - b[0]);
  const total = samples.reduce((acc, s) => acc + s[1], 0);
  let acc = 0;
  for (const [value, weight] of samples) {
    acc += weight;
    if (acc >= q * total) return value;
  }
  return samples[samples.length - 1][0];
}

/**
 * **The gain `--exposure` asks for** (D198): `off` 1; a number, that number; `auto`
 * lifts a surface whose 90th-percentile linear luminance is under `target` up to
 * it, by at most `max` — and never darkens one.
 */
export const EXPOSURE_TARGET = 0.2;
export const EXPOSURE_MAX = 8;
export function exposureGain(mode, p90, { target = EXPOSURE_TARGET, max = EXPOSURE_MAX } = {}) {
  if (mode === 'off') return 1;
  if (mode !== 'auto') return Number(mode);
  if (!(p90 > 0) || p90 >= target) return 1;
  return Math.min(max, target / p90);
}

// ---------------------------------------------------------------------------
// The atlas (D240): one material a figure, every paint in one sheet
// ---------------------------------------------------------------------------

/**
 * **The texture budget of a prepared model** (D240): its one base-colour texture
 * is at most `ATLAS_MAX` px a side — 2048², 16 MiB of RGBA8 on the GPU before
 * mipmaps. A model of one paint keeps its own texture (≤ 1024 px since D191, so
 * well inside it); a model of several is packed into one sheet no larger than
 * this, scaled down as a whole when its paints would not fit at their own size.
 */
export const ATLAS_MAX = 2048;
/** The copied (or, for a repeating paint, wrapped) edge around every region: mip levels 0–3 stay inside it. */
export const ATLAS_GUTTER = 8;
/** A swatch region's side, for a part painted by its factor alone. */
export const ATLAS_SWATCH = 16;

/**
 * **Which whole UV tiles a primitive's UVs cover** (D240): the integer tile its
 * range starts in, give or take 1% (an exporter's −0.004 or 1.0005 is not a
 * wrap), and how many tiles each axis spans from there — 1 for a paint whose UVs
 * sit in one tile, 2 for Doom's tunic (`u` up to 1.87 on a repeating texture).
 */
export function uvSpanOf(lo, hi) {
  const origin = lo.map((x) => Math.floor(x + 0.01));
  const span = hi.map((x, k) => Math.max(1, Math.ceil(x - origin[k] - 0.01)));
  return { origin, span };
}

/**
 * **Pack regions into one sheet** (D240) — a skyline packer, bottom-left, the
 * tallest region first. `regions` are natural sizes in px (a paint's texture
 * times the tiles its UVs span); each is placed with `gutter` px on every side.
 * At scale 1, every sheet width from the widest region up to `max` (in steps of
 * 16) is tried and the sheet of least area whose height fits `max` is kept (the
 * squarer on a tie) — so Peggy's 1024² beside her two 512² is 1568 × 1040, not a
 * 2048 square. When nothing fits at scale 1, the largest scale (to 1/1000) at
 * which they fit a `max`-wide sheet — every region scaled alike, so the paints
 * keep their texel density relative to each other. The height is cut to what the
 * regions use (a multiple of 4). Returns the inner rectangle of each region, in
 * input order, or `null` when nothing fits even at 1/64.
 */
export function packAtlas(regions, { max = ATLAS_MAX, gutter = ATLAS_GUTTER } = {}) {
  const order = regions.map((_, i) => i).sort((a, b) => regions[b].h - regions[a].h || regions[b].w - regions[a].w || a - b);
  /** The regions on a sheet `width` wide at `scale`, bottom-left on the skyline; `null` if one is wider than the sheet or the stack is taller than `max`. */
  const tryPack = (width, scale) => {
    const rects = new Array(regions.length);
    let skyline = [{ x: 0, y: 0, w: width }];
    let height = 0;
    for (const i of order) {
      const w = Math.max(1, Math.round(regions[i].w * scale));
      const h = Math.max(1, Math.round(regions[i].h * scale));
      const cw = w + 2 * gutter;
      const ch = h + 2 * gutter;
      if (cw > width) return null;
      let best = null;
      for (let k = 0; k < skyline.length; k += 1) {
        const x = skyline[k].x;
        if (x + cw > width) break;
        let y = 0;
        for (let j = k; j < skyline.length && skyline[j].x < x + cw; j += 1) y = Math.max(y, skyline[j].y);
        if (best === null || y < best.y || (y === best.y && x < best.x)) best = { x, y };
      }
      if (best === null || best.y + ch > max) return null;
      rects[i] = { x: best.x + gutter, y: best.y + gutter, w, h };
      height = Math.max(height, best.y + ch);
      // The skyline under the new region is its top; what it covers of the segments either side is cut away.
      const next = [];
      for (const seg of skyline) {
        const end = seg.x + seg.w;
        if (end <= best.x || seg.x >= best.x + cw) next.push(seg);
        else {
          if (seg.x < best.x) next.push({ x: seg.x, y: seg.y, w: best.x - seg.x });
          if (end > best.x + cw) next.push({ x: best.x + cw, y: seg.y, w: end - best.x - cw });
        }
      }
      next.push({ x: best.x, y: best.y + ch, w: cw });
      next.sort((p, q) => p.x - q.x);
      skyline = [];
      for (const seg of next) {
        const last = skyline[skyline.length - 1];
        if (last !== undefined && last.y === seg.y && last.x + last.w === seg.x) last.w += seg.w;
        else skyline.push({ ...seg });
      }
    }
    return { width, height: Math.min(max, Math.ceil(height / 4) * 4), scale, rects };
  };
  const widest = Math.max(...regions.map((r) => r.w)) + 2 * gutter;
  let best = null;
  for (let width = Math.ceil(Math.max(16, widest) / 16) * 16; width <= max; width += 16) {
    const packed = tryPack(width, 1);
    if (packed === null) continue;
    const area = packed.width * packed.height;
    const bestArea = best === null ? Infinity : best.width * best.height;
    if (area < bestArea || (area === bestArea && Math.max(packed.width, packed.height) < Math.max(best.width, best.height))) best = packed;
  }
  if (best !== null) return best;
  let lo = 1 / 64;
  if (tryPack(max, lo) === null) return null;
  let hi = 1;
  for (let k = 0; k < 20; k += 1) {
    const mid = (lo + hi) / 2;
    if (tryPack(max, mid) !== null) lo = mid;
    else hi = mid;
  }
  return tryPack(max, Math.floor(lo * 1000) / 1000);
}

/** RGBA texels (`w` × `h`) repeated `su` × `sv` times — a repeating paint laid out over the tiles its UVs span. */
export function tileTexels(rgba, w, h, su, sv) {
  if (su === 1 && sv === 1) return rgba;
  const W = w * su;
  const out = new Uint8Array(W * h * sv * 4);
  for (let ty = 0; ty < sv; ty += 1) {
    for (let y = 0; y < h; y += 1) {
      const row = rgba.subarray(y * w * 4, (y + 1) * w * 4);
      for (let tx = 0; tx < su; tx += 1) out.set(row, ((ty * h + y) * W + tx * w) * 4);
    }
  }
  return out;
}
