#!/usr/bin/env node
/*
 * mtg-table — tools/profile-top.mjs
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The top self-time functions of a CPU profile, named through the build's own
 * source maps** (the GPU pass, D270). `tools/arena-bench.mjs --cpu-profile <f>`
 * records the DevTools protocol's profile of its sample against a PRODUCTION build,
 * whose functions are minified; this reads `web/dist/assets/*.js.map` (the build
 * writes them) and names each sampled function by its ORIGINAL source file, line
 * and identifier, then sums self time per function.
 *
 *   node tools/profile-top.mjs var/gpu/g1-316.cpuprofile [--top 10] [--dist web/dist]
 *
 * Self time is the profile's own: each sample is charged to the frame on top of
 * its stack, weighted by the interval to the next sample. `(idle)` and `(program)`
 * are printed as they are — the time the renderer's main thread was not running
 * our JavaScript — so a share is always a share of the whole sample.
 * No dependency: Node's own `module.SourceMap` reads the maps.
 */
import { existsSync, readFileSync } from 'node:fs';
import { SourceMap } from 'node:module';
import { basename, resolve } from 'node:path';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
if (file === undefined) {
  console.error('usage: node tools/profile-top.mjs <profile.cpuprofile> [--top 10] [--dist web/dist]');
  process.exit(2);
}
const TOP = Number(opt('top', '10'));
const DIST = resolve(opt('dist', 'web/dist'));

const profile = JSON.parse(readFileSync(file, 'utf8'));
const byId = new Map(profile.nodes.map((n) => [n.id, n]));

/** One parsed map per bundle file, or null when the build carries none. */
const maps = new Map();
function mapFor(url) {
  const name = basename(new URL(url, 'http://x/').pathname);
  if (maps.has(name)) return maps.get(name);
  const path = resolve(DIST, 'assets', `${name}.map`);
  const map = existsSync(path) ? new SourceMap(JSON.parse(readFileSync(path, 'utf8'))) : null;
  maps.set(name, map);
  return map;
}
const sources = new Map();
/** The identifier a function is declared with, read off its original source line. */
function declaredName(sourceFile, line, column) {
  let text = sources.get(sourceFile);
  if (text === undefined) {
    const local = resolve('web', sourceFile.replace(/^(\.\.\/)+/, '').replace(/^web\//, ''));
    const candidates = [resolve(DIST, 'assets', sourceFile), local, resolve(sourceFile.replace(/^(\.\.\/)+/, ''))];
    const found = candidates.find((c) => existsSync(c));
    text = found ? readFileSync(found, 'utf8').split('\n') : null;
    sources.set(sourceFile, text);
  }
  if (text === null) return null;
  const src = text[line] ?? '';
  const tail = src.slice(Math.max(0, column - 40), column + 60);
  const m =
    /(?:function\s*\*?\s*|(?:get|set|static|async)\s+|#)([A-Za-z_$][\w$]*)\s*\(/.exec(src.slice(column)) ??
    /([A-Za-z_$#][\w$]*)\s*\([^)]*\)\s*(?::[^{=]*)?\{/.exec(src.slice(column)) ??
    /([A-Za-z_$][\w$]*)\s*[:=]\s*(?:async\s*)?(?:function|\()/.exec(tail);
  return m ? m[1] : null;
}

function nameOf(frame) {
  const { url, functionName, lineNumber, columnNumber } = frame;
  if (!url) return functionName || '(anonymous)';
  const map = /\/assets\//.test(url) ? mapFor(url) : null;
  if (map === null) return `${functionName || '(anonymous)'} ${url.replace(/^.*\//, '')}:${lineNumber + 1}`;
  const entry = map.findEntry(lineNumber, columnNumber);
  if (!entry || entry.originalSource === undefined) return `${functionName || '(anonymous)'} [unmapped]`;
  const source = entry.originalSource.replace(/^.*?node_modules\//, 'node_modules/').replace(/^(\.\.\/)+/, '');
  const declared = entry.name ?? declaredName(entry.originalSource, entry.originalLine, entry.originalColumn);
  return `${declared ?? functionName ?? '(anonymous)'}  ${source}:${entry.originalLine + 1}`;
}

// Self time: each sample's top node, weighted by the time to the next sample.
const self = new Map();
let total = 0;
for (let i = 0; i < profile.samples.length; i++) {
  const dt = (profile.timeDeltas[i + 1] ?? 0) / 1000;
  const node = byId.get(profile.samples[i]);
  if (!node) continue;
  const key = nameOf(node.callFrame);
  self.set(key, (self.get(key) ?? 0) + dt);
  total += dt;
}
const rows = [...self.entries()].sort((a, b) => b[1] - a[1]);
const idle = (self.get('(idle)') ?? 0);
console.log(`${file}: ${total.toFixed(1)} ms sampled, ${(total - idle).toFixed(1)} ms not idle (${profile.samples.length} samples)`);
console.log('rank  self ms   % busy  function  original source');
let rank = 0;
for (const [key, ms] of rows) {
  if (key === '(idle)') continue;
  rank += 1;
  console.log(`${String(rank).padStart(4)}  ${ms.toFixed(1).padStart(7)}  ${((100 * ms) / Math.max(1e-9, total - idle)).toFixed(1).padStart(6)}  ${key}`);
  if (rank >= TOP) break;
}
