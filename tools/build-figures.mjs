#!/usr/bin/env node
/*
 * mtg-table — tools/build-figures.mjs
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The Tier 2 figure pipeline** (report 13 §9.3, report 12 §5.7): third-party
 * CC0 `.glb`s in, **one** `web/public/models/figures.glb` out, plus the measured
 * half of `web/src/arena/figures/models.json`.
 *
 *   node tools/build-figures.mjs                       # build + assert
 *   node tools/build-figures.mjs --src var/assets/figures
 *   node tools/build-figures.mjs --no-manifest         # do not rewrite models.json
 *
 * It is a **build-box tool, run by hand**: it is not in `check-all.sh` and the
 * app never runs it. `tools/assets-manifest.json` says where every source came
 * from and what its licence badge said on the day; this script says what is
 * actually inside the result.
 *
 * ---------------------------------------------------------------------------
 * The pipeline, and why each step (report 12 §5.7's list, in its order):
 *
 *   prune     drop everything nothing references — including the 22 Kenney clips
 *             the manifest does not name
 *   dedup     one accessor per identical buffer
 *   palette   **the draw-call fix.** Quaternius's meshes are vertex-coloured
 *             with one material per colour (8 on the drone, 6 on the bee);
 *             `palette` bakes them into one palette texture and one material
 *   join      …which `gltf-transform join` then REFUSES to act on, because it
 *             skips any node carrying a skin (verified in the installed
 *             @gltf-transform/functions/dist/index.js:3511 — `if (node.getSkin())
 *             continue;`). So the skinned join is done here with
 *             `joinPrimitives`, which is legal only when every source primitive
 *             is bound to the same skeleton — ASSERTED, not assumed
 *   weld      merge equivalent vertices
 *   unlit     KHR_materials_unlit, so nothing in the library can drag a light
 *             into a scene that has none (report 09 §9.2 rule 3)
 *   resample  losslessly deduplicate animation keyframes
 *   merge     three models into one file: one fetch, one parse, one cache entry
 *   meshopt   EXT_meshopt_compression — 29 kB of decoder and no file to host
 *   inspect   **the assertion**: one glPrimitive per model, i.e. one draw call
 *             per figure, which is the number T0's go/no-go was about
 * ---------------------------------------------------------------------------
 *
 * Two more things happen here that are not in that list and are load-bearing:
 *
 *  - **Clips are renamed `<modelId>_<clip>` and unnamed clips are dropped.** One
 *    merged library means one flat `gltf.animations`, and a clip called `idle`
 *    from one pack and `Idle` from another is one rename away from colliding.
 *    The prefix also means `models.json` never has to carry an `Armature|`
 *    prefix — report 12 §2.4's measured trap, where FBX2glTF writes
 *    `"CharacterArmature|Attack"` and a naive map silently misses.
 *  - **Each model's root node is renamed to its model id**, so the loader's
 *    `scene.getObjectByName('agent')` is the whole of "find my archetype".
 */

import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const WEB = join(REPO, 'web');

/**
 * `@gltf-transform/*` is a **web/ dev dependency**, and this script lives in
 * `tools/`, so Node's upward `node_modules` walk from here never finds it.
 * Resolving against `web/package.json` is what makes one install serve both.
 */
const require = createRequire(join(WEB, 'package.json'));
const { NodeIO, getBounds } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { joinPrimitives } = require('@gltf-transform/functions');

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const SRC = resolve(arg('src', join(REPO, 'var/assets/figures')));
const OUT = resolve(arg('out', join(WEB, 'public/models/figures.glb')));
const WORK = resolve(arg('work', join(REPO, 'var/assets/figures/build')));
const MANIFEST = join(REPO, 'tools/assets-manifest.json');
const MODELS_JSON = join(WEB, 'src/arena/figures/models.json');
const CLI = join(WEB, 'node_modules/.bin/gltf-transform');
const WRITE_MANIFEST = !args.includes('--no-manifest');

if (!existsSync(CLI)) {
  fail(`@gltf-transform/cli is not installed. Run: npm --prefix web install`);
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

/** The IO the whole script shares: **with every extension registered.** */
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

// ---------------------------------------------------------------------------
// The skinned join (see the header)
// ---------------------------------------------------------------------------

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
function joinSkinned(doc, root, id) {
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

  const prims = [];
  for (const node of skinned) prims.push(...node.getMesh().listPrimitives());
  const materials = new Set(prims.map((p) => p.getMaterial()));
  if (materials.size !== 1) {
    fail(`${id}: ${materials.size} materials after \`palette\` — one figure would be ${materials.size} draw calls`);
  }
  if (prims.length === 1) return 1;

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
  return prims.length;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
mkdirSync(dirname(OUT), { recursive: true });

/** id → the single-model document, after the per-model half of the pipeline. */
const built = new Map();

for (const [id, spec] of Object.entries(manifest.models)) {
  if (id.startsWith('_')) continue;
  const pack = manifest.packs[spec.pack];
  if (pack === undefined) fail(`${id}: no pack "${spec.pack}" in the manifest`);
  const source = join(SRC, spec.source);
  if (!existsSync(source)) {
    fail(
      `${id}: missing source ${source}\n` +
        `  Download ${pack.downloadUrl}\n` +
        `  into ${SRC} (sha256 ${pack.sha256}), unzip it if it is a zip, and run again.`,
    );
  }
  console.log(`\n${id} — ${pack.title} by ${pack.creator} (${pack.licence})`);

  // -- the CLI half, in report 12 §5.7's order ------------------------------
  const step = (n, name) => join(WORK, `${id}.${n}.${name}.glb`);
  cli('prune', source, step(1, 'prune'), ['--keep-attributes', 'false']);
  cli('dedup', step(1, 'prune'), step(2, 'dedup'));
  cli('palette', step(2, 'dedup'), step(3, 'palette'), ['--min', '2']);

  // -- the skin-aware join, which the CLI's `join` will not do --------------
  const doc = await io.read(step(3, 'palette'));
  const scene = doc.getRoot().listScenes()[0];
  if (scene === undefined) fail(`${id}: the file has no scene`);
  const roots = scene.listChildren();
  if (roots.length !== 1) fail(`${id}: expected one root node, saw ${roots.length}`);
  const root = roots[0];
  const joined = joinSkinned(doc, root, id);
  console.log(`  join      ${joined} primitives → 1 (skin-aware; \`gltf-transform join\` skips skins)`);

  // Only the clips the manifest names survive, renamed so the merged library
  // has one flat, collision-free namespace.
  const wanted = new Map();
  for (const [key, clip] of Object.entries(spec.clips ?? {})) {
    if (key.startsWith('_')) continue;
    wanted.set(normaliseClipName(clip), key);
  }
  const kept = new Map();
  for (const animation of doc.getRoot().listAnimations()) {
    const name = normaliseClipName(animation.getName());
    if (!wanted.has(name)) {
      animation.dispose();
      continue;
    }
    animation.setName(`${id}_${name}`);
    kept.set(name, `${id}_${name}`);
  }
  for (const [name, key] of wanted) {
    if (!kept.has(name)) fail(`${id}: the manifest names clip "${name}" (as ${key}) and the file has none`);
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

  // **Height is measured HERE, before `meshopt`.** Meshopt quantises positions
  // into int16 and carries the dequantisation in the accessor, so a bounding box
  // read off the finished file is in quantisation units and not in the model's
  // own — which is how `agent` first measured 1.75 units tall instead of 0.671.
  // `getBounds(scene)`, not `getBounds(node)`: on a **skinned** node the latter
  // expands the box over the skeleton as well and reported the Kenney character
  // as 1.750 units tall against `inspect`'s own 0.671.
  const measured = await io.read(step(8, 'prune2'));
  const box = getBounds(measured.getRoot().listScenes()[0]);
  built.set(id, {
    spec,
    pack,
    file: step(8, 'prune2'),
    clips: kept,
    height: box.max[1] - box.min[1],
    /**
     * **T7's tuning measurement, and it is measured for the same reason the
     * height is** (report 13 §3.1, and the T2 evidence's §4.2 finding).
     *
     * The Kenney Mini character is a chibi: 0.767 wide against 0.671 tall. Scaling
     * it by HEIGHT alone to `FIGURE_HEIGHT` 0.85 therefore makes it **0.97 units
     * wide** against a creature-rank pitch of 0.796, and neighbours in a crowded
     * rank overlap by ~0.18 — photographed at T3's attack shot, two Soldier Tokens
     * shoulder to shoulder. The renderer needs the width to clamp against the
     * pitch, so the pipeline measures it here where the bounding box is in the
     * model's own units.
     *
     * The wider of x and z, because a figure turns to face the other seat and its
     * footprint has to fit either way round.
     */
    width: Math.max(box.max[0] - box.min[0], box.max[2] - box.min[2]),
  });
}

/** FBX2glTF prefixes the armature: `"CharacterArmature|Attack"` (report 12 §2.4). */
function normaliseClipName(name) {
  const bar = name.lastIndexOf('|');
  return bar < 0 ? name : name.slice(bar + 1);
}

// -- merge -------------------------------------------------------------------

console.log('\nlibrary');
const ids = [...built.keys()];
const merged = join(WORK, 'merged.glb');
// **`merge` takes its output LAST**, and `--merge-scenes` is the flag that makes
// the three models share one scene. The loader reads one scene, so without it
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
// in a form `NodeIO` can open without registering a decoder — the compression is
// an encoding, and none of what is checked below is about the encoding.
const final = await io.read(join(WORK, 'library.glb'));
const finalScene = final.getRoot().listScenes()[0];
const finalRoots = new Map(finalScene.listChildren().map((n) => [n.getName(), n]));
const clipNames = new Set(final.getRoot().listAnimations().map((a) => a.getName()));

const models = {};
let totalPrimitives = 0;
let totalTriangles = 0;

for (const id of ids) {
  const node = finalRoots.get(id);
  if (node === undefined) fail(`${id}: the merged library has no root node called "${id}"`);
  const { spec, pack, clips } = built.get(id);

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

  // **The assertion T0's go/no-go was about.** One primitive is one draw call,
  // so 12 figures are 12 draw calls and `SkeletonUtils.clone` shares the one
  // geometry and the one material between them.
  if (primitives !== 1) {
    fail(`${id}: ${primitives} primitives — one figure would cost ${primitives} draw calls, not 1`);
  }
  totalPrimitives += primitives;
  totalTriangles += triangles;

  const height = built.get(id).height;
  const width = built.get(id).width;

  const clipMap = {};
  for (const [key, raw] of Object.entries(spec.clips ?? {})) {
    if (key.startsWith('_')) continue;
    const renamed = clips.get(normaliseClipName(raw));
    if (renamed === undefined || !clipNames.has(renamed)) {
      fail(`${id}: clip "${raw}" did not survive the pipeline`);
    }
    clipMap[key] = renamed;
  }

  models[id] = {
    path: 'models/figures.glb',
    node: id,
    height: round(height, 4),
    width: round(width, 4),
    facing: spec.facing,
    rootMotion: false,
    bones,
    triangles,
    clips: clipMap,
    source: pack.page,
    licence: pack.licence,
    licenceUrl: pack.licenceUrl,
    licenceBadge: pack.licenceBadge,
    retrieved: pack.retrieved,
    committable: pack.committable === true,
  };
  console.log(
    `  ${id.padEnd(8)} 1 primitive · ${String(triangles)} tris · ${String(bones)} bones · ` +
      `height ${height.toFixed(3)} · width ${width.toFixed(3)} (ratio ${(width / height).toFixed(2)}) · ` +
      `${String(Object.keys(clipMap).length)} clips`,
  );
}

function round(n, places) {
  const k = 10 ** places;
  return Math.round(n * k) / k;
}

// `inspect` is run for the record as well as for the numbers above: it is the
// command a human reads when this script says something is wrong.
const inspected = execFileSync(CLI, ['inspect', join(WORK, 'library.glb')], { encoding: 'utf8' });
const glPrimitives = [...inspected.matchAll(/│\s*(\d[\d,]*)\s*│\s*[\d,]+\s*│\s*u(?:8|16|32)/g)];
const bytes = readFileSync(OUT).byteLength;

console.log(
  `\n${OUT.replace(REPO + '/', '')}: ${String(bytes)} bytes · ${String(ids.length)} models · ` +
    `${String(totalPrimitives)} primitives · ${String(totalTriangles)} triangles · ` +
    `${String(clipNames.size)} clips`,
);
if (glPrimitives.length === 0) console.log('(inspect printed no mesh table — the numbers above are from the document)');

// §8.2's budget, checked where it is cheap to check.
if (bytes > 4 * 1024 * 1024) fail(`the library is ${String(bytes)} bytes — §8.2 budgets ≤ 4 MB`);
if (totalTriangles > 30000) fail(`${String(totalTriangles)} triangles — §8.2 budgets ≤ 30,000`);

if (WRITE_MANIFEST) {
  const header = {
    version: 1,
    _generated: 'WRITTEN BY tools/build-figures.mjs — do not edit by hand. The hand-written half (where each file came from, what its licence badge said) is tools/assets-manifest.json; everything here was measured from the built figures.glb.',
    _fallback: 'A model id named here that has no file on disk is not an error: scene/models.ts falls back to the glow disc (report 13 §9.4), which is also what a fresh checkout with no binaries gets.',
    models,
  };
  writeFileSync(MODELS_JSON, `${JSON.stringify(header, null, 2)}\n`, 'utf8');
  console.log(`wrote ${MODELS_JSON.replace(REPO + '/', '')}`);
}
