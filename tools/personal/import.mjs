#!/usr/bin/env node
/*
 * mtg-table — tools/personal/import.mjs
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The personal tier, step 1: unpack and INSPECT a model the user downloaded**
 * (D190; `docs/guides/personal-tier.md` is the manual).
 *
 *   node tools/personal/import.mjs <file.zip | file.gltf | file.glb | file.vrm> <slug>
 *   node tools/personal/import.mjs personal/models/doctor-doom/doctor_doom.zip doctor-doom
 *
 * What it does, and all it writes (everything under `personal/models/<slug>/`,
 * which `.gitignore` keeps out of git):
 *
 *   1. the downloaded original, byte for byte, into the folder (if it is not
 *      there already) — it is never modified;
 *   2. its contents into `source/` (a zip's members, CRC-checked, each path held
 *      inside the folder; or the .gltf and every file it references);
 *   3. `SOURCE.txt` — drafted from what the file says about itself (a Sketchfab
 *      export carries title, author, licence and URL in `asset.extras`, and its
 *      zip a `license.txt`) ONLY if the folder has none: yours is never
 *      overwritten;
 *   4. `inspect.json` — scenes, nodes, meshes (names, triangles, materials,
 *      textures), skins (joint names, count, hierarchy, which carry weight),
 *      animations, bounds and units, the REST POSE (T or A, the upper arm's angle
 *      measured from the bind matrices), `asset.extras` and the generator, the
 *      auto rig map, and three kinds of flag — rig CONTROL meshes (Auto-Rig Pro's
 *      `cs_*`, Rigify's `WGT-*`, `*_shape`, `ctrl`, `MCH-`, `ORG-`), UNSKINNED
 *      meshes (they will not follow the skeleton), and GAME-ASSET name patterns;
 *   5. and prints the same as a readable report.
 *
 * It fetches nothing, accepts nothing and refuses nothing: every flag is
 * information for the user, whose download and whose call it is (D190).
 */

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { crc32, inflateRawSync } from 'node:zlib';

import { findSourceModel, insideSlug, inspectDocument, OUR_JOINTS, rawJsonOf, readDocument, REPO, slugDir } from './lib.mjs';

const [input, slug] = process.argv.slice(2);
if (!input || !slug) {
  console.error('usage: node tools/personal/import.mjs <file.zip|.gltf|.glb|.vrm> <slug>');
  process.exit(2);
}
const dir = slugDir(slug);
const from = resolve(input);
if (!existsSync(from)) {
  console.error(`import: no such file ${from}`);
  process.exit(2);
}
mkdirSync(dir, { recursive: true });

const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const original = readFileSync(from);

// 1 — the original, untouched, beside everything made from it.
const kept = insideSlug(slug, basename(from));
if (resolve(kept) !== from) {
  if (existsSync(kept) && sha256(readFileSync(kept)) !== sha256(original)) {
    console.error(`import: ${relative(REPO, kept)} exists and is a different file; move it aside first`);
    process.exit(2);
  }
  copyFileSync(from, kept);
}
console.log(`original  ${relative(REPO, kept)}  ${original.byteLength.toLocaleString('en')} B  sha256 ${sha256(original)}`);

// 2 — unpack into source/.
const written = [];
const put = (rel, bytes) => {
  const path = insideSlug(slug, join('source', rel));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  written.push(rel);
};
let licenceText = null;
if (original.readUInt32LE(0) === 0x04034b50) {
  for (const [name, bytes] of unzip(original)) {
    put(name, bytes);
    if (/^licen[cs]e\.txt$/i.test(basename(name))) licenceText = bytes.toString('utf8');
  }
} else if (/\.gltf$/i.test(from)) {
  put(basename(from), original);
  const json = JSON.parse(original.toString('utf8'));
  for (const uri of [...(json.buffers ?? []), ...(json.images ?? [])].map((x) => x.uri).filter((u) => u && !u.startsWith('data:'))) {
    put(decodeURIComponent(uri), readFileSync(join(dirname(from), decodeURIComponent(uri))));
  }
} else {
  put(basename(from), original);
}
console.log(`unpacked  ${String(written.length)} files into ${relative(REPO, join(dir, 'source'))}/`);

const modelPath = findSourceModel(join(dir, 'source'));
if (modelPath === null) {
  console.error('import: no .gltf, .glb or .vrm in what was unpacked');
  process.exit(1);
}

// 4 — inspect.
const doc = await readDocument(modelPath);
const report = inspectDocument(doc, rawJsonOf(modelPath));
const inspect = {
  _what: 'Written by tools/personal/import.mjs. What is in the downloaded model, as read; prepare.mjs reads it again itself.',
  slug,
  original: { file: basename(kept), bytes: original.byteLength, sha256: sha256(original) },
  model: relative(dir, modelPath),
  inspectedAt: new Date().toISOString(),
  ...report,
};
writeFileSync(insideSlug(slug, 'inspect.json'), `${JSON.stringify(inspect, null, 2)}\n`);

// 3 — SOURCE.txt, drafted only if there is none.
const sourceTxt = insideSlug(slug, 'SOURCE.txt');
if (!existsSync(sourceTxt)) {
  const x = report.asset.extras ?? {};
  const date = statSync(from).mtime.toISOString().slice(0, 10);
  const lines = [
    `title:    ${x.title ?? '(unknown — fill in)'}`,
    `url:      ${x.source ?? '(unknown — fill in)'}`,
    `author:   ${x.author ?? '(unknown — fill in)'}`,
    `licence:  ${x.license ?? '(as shown on the page — fill in)'}`,
    `date:     ${date} (the download's file date)`,
    `file:     ${basename(kept)} (${String(original.byteLength)} bytes, sha256 ${sha256(original)})`,
    '',
    'Drafted by tools/personal/import.mjs from what the file says about itself;',
    'check it against the page you downloaded from. PERSONAL USE ONLY: never',
    'committed, never published, never sold (docs/guides/personal-tier.md).',
  ];
  if (licenceText !== null) lines.push('', '--- license.txt, as shipped in the download ---', licenceText.trim());
  writeFileSync(sourceTxt, `${lines.join('\n')}\n`);
  console.log(`drafted   ${relative(REPO, sourceTxt)} (from the file's own asset.extras${licenceText !== null ? ' and license.txt' : ''})`);
} else {
  console.log(`kept      ${relative(REPO, sourceTxt)} (yours; not touched)`);
}

printReport(inspect);
console.log(`\nwrote     ${relative(REPO, insideSlug(slug, 'inspect.json'))}`);

// ---------------------------------------------------------------------------

/**
 * A zip's members, each CRC-checked. The same small reader `build-figures.mjs`
 * uses (central directory, local header, `inflateRawSync`), plus the one rule a
 * download needs: a member whose path is absolute or climbs out with `..` is
 * refused rather than written (and `insideSlug` would stop it anyway).
 */
function unzip(buffer) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('not a zip (no end-of-central-directory record)');
  const count = buffer.readUInt16LE(eocd + 10);
  let p = buffer.readUInt32LE(eocd + 16);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(p) !== 0x02014b50) throw new Error('corrupt central directory');
    const method = buffer.readUInt16LE(p + 10);
    const crc = buffer.readUInt32LE(p + 16);
    const compressed = buffer.readUInt32LE(p + 20);
    const size = buffer.readUInt32LE(p + 24);
    const nameLength = buffer.readUInt16LE(p + 28);
    const offset = buffer.readUInt32LE(p + 42);
    const name = buffer.toString('utf8', p + 46, p + 46 + nameLength);
    p += 46 + nameLength + buffer.readUInt16LE(p + 30) + buffer.readUInt16LE(p + 32);
    if (name.endsWith('/')) continue;
    if (name.startsWith('/') || name.split(/[\\/]/).includes('..')) throw new Error(`zip member "${name}" would land outside the folder`);
    if (buffer.readUInt32LE(offset) !== 0x04034b50) throw new Error(`bad local header for "${name}"`);
    const start = offset + 30 + buffer.readUInt16LE(offset + 26) + buffer.readUInt16LE(offset + 28);
    const raw = buffer.subarray(start, start + compressed);
    const data = method === 0 ? Buffer.from(raw) : method === 8 ? inflateRawSync(raw) : null;
    if (data === null) throw new Error(`"${name}" uses zip method ${String(method)}`);
    if (data.byteLength !== size || crc32(data) !== crc) throw new Error(`"${name}" fails its CRC-32`);
    out.push([name, data]);
  }
  return out;
}

function printReport(r) {
  const n = (x) => Number(x).toLocaleString('en');
  const x = r.asset.extras ?? {};
  console.log(`\n${r.slug} — ${r.model}`);
  console.log(`  asset       ${r.asset.generator ?? '?'} · glTF ${r.asset.version}${x.title ? ` · "${x.title}"` : ''}${x.author ? ` by ${x.author}` : ''}${x.license ? ` · ${x.license}` : ''}`);
  console.log(`  scenes      ${r.scenes.map((s) => `${s.name || '(unnamed)'} → ${s.roots.join(', ')}`).join('; ')}`);
  console.log(`  nodes       ${n(r.nodes.total)} (${n(r.nodes.joints)} joints, ${n(r.nodes.meshNodes)} mesh nodes)`);
  console.log(`  triangles   ${n(r.triangles.total)} in all = ${n(r.triangles.render)} to render + ${n(r.triangles.control)} in rig control shapes`);
  console.log('  meshes      (render)');
  for (const m of r.meshes.filter((m) => m.control === null)) {
    const mats = [...new Set(m.primitives.map((p) => p.material))].join(', ');
    const how = m.skinned ? 'skinned  ' : m.rigidParent ? `rigid → ${m.rigidParent}` : 'UNSKINNED';
    console.log(`              ${m.path.split(' / ').slice(-2).join(' / ').padEnd(44)} ${how.padEnd(10)} ${n(m.triangles).padStart(6)} tris  ${mats}`);
  }
  if (r.flags.controlMeshes.length > 0) {
    const reasons = [...new Set(r.flags.controlMeshes.map((c) => c.reason.replace(/: ".*"$/, '')))];
    console.log(`  control     ${String(r.flags.controlMeshes.length)} meshes, ${n(r.triangles.control)} tris — ${reasons.join('; ')} — prepare.mjs strips them`);
  }
  console.log(`  materials   ${String(r.materials.length)}: ${r.materials.map((m) => m.name).join(', ')}`);
  console.log(`  textures    ${String(r.textures.length)}`);
  for (const t of r.textures) {
    console.log(`              ${(t.uri || t.name).padEnd(34)} ${t.size ? `${t.size[0]}×${t.size[1]}` : '?'}  ${n(t.bytes)} B  ${t.usedBy.join(', ')}`);
  }
  for (const s of r.skins) {
    console.log(`  skin        ${s.name || '(unnamed)'}: ${String(s.joints)} joints, ${String(s.weighted.length)} carry weight (${String(s.joints - s.weighted.length)} are controllers, IK, poles or references); root ${s.roots.join(', ')}`);
    console.log(`              bind vs rest: the largest K = jointWorld × IBM spread is ${String(s.bindSpread)} (0 = the rest pose IS the bind pose)`);
  }
  if (r.rigMap !== null) {
    const found = OUR_JOINTS.length - r.rigMap.missing.length;
    console.log(`  rig map     auto: ${r.rigMap.label} — ${String(found)}/${String(OUR_JOINTS.length)} of our joints (scores ${Object.entries(r.rigMap.scores).map(([k, v]) => `${k} ${String(v)}`).join(', ')})`);
    for (const j of OUR_JOINTS) {
      const m = r.rigMap.joints[j];
      console.log(`              ${j.padEnd(11)} ← ${m.primary ?? '(none)'}${m.followers.length > 0 ? `  + ${m.followers.join(', ')}` : ''}`);
    }
    if (r.unassignedWeightedJoints.length > 0) {
      console.log(`              ${String(r.unassignedWeightedJoints.length)} weighted joints no list names (prepare places them by ancestry, then by position): ${r.unassignedWeightedJoints.slice(0, 12).join(', ')}${r.unassignedWeightedJoints.length > 12 ? ', …' : ''}`);
    }
  }
  if (r.restPose !== null) {
    console.log(`  rest pose   ${r.restPose.verdict} — upper arm ${String(r.restPose.l)}° (left) / ${String(r.restPose.r)}° (right) below the horizontal, from the bind matrices`);
  }
  console.log(`  bounds      ${r.bounds.size.map((v) => v.toFixed(3)).join(' × ')} (x × y × z), height ${r.bounds.height.toFixed(3)} — ${r.bounds.units}`);
  console.log(`  animations  ${r.animations.length === 0 ? 'none' : r.animations.map((a) => `${a.name} (${String(a.duration)} s)`).join(', ')}`);
  const unskinned = r.flags.unskinnedMeshes;
  console.log(`  unskinned   ${unskinned.length === 0 ? 'none' : unskinned.map((u) => `${u.path.split(' / ').slice(-2).join(' / ')} (${n(u.triangles)} tris${u.rigidParent ? `, rigid on ${u.rigidParent}` : ', follows nothing'})`).join('; ')}`);
  const game = r.flags.gameAssetNames;
  console.log(`  game names  ${game.length === 0 ? 'none of the known patterns' : game.map((g) => `${g.name} (${g.reason})`).join('; ')}  [informational only]`);
}
