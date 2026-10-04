#!/usr/bin/env node
// mtg-table — tools/decisions.mjs's own controls: every problem `check` exists for fails it.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// D379.  Builds small scratch trees (a DECISIONS.md and a docs/decisions/) in the
// OS temp directory, runs the real CLI over each with --root, and requires:
// the clean tree passes and `next` / `has` / `list` read both sources; each
// defect (a number twice across or within the sources, a file name and heading
// that disagree, a malformed heading, a stray file, no date line, two headings
// in one file) makes `check` exit 1 naming it; and the checkout itself passes.
// Plain Node, no dependencies, well under a second.
//
// Usage:  node tools/decisions-selftest.mjs
// Exit:   0 every case held; 1 otherwise.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, 'decisions.mjs');
const REPO = resolve(HERE, '..');
const BASE = mkdtempSync(join(tmpdir(), 'decisions-selftest-'));

let checks = 0;
let failed = 0;
const ok = (msg) => { checks++; console.log(`  ok    ${msg}`); };
const bad = (msg, out) => {
  checks++; failed++;
  console.log(`  FAIL  ${msg}`);
  if (out) console.log(out.replace(/^/gm, '        | '));
};

const entry = (n, title = `decision ${n}`) => `## D${n} — ${title}\n\n**2026-10-01**\n\nBody.\n\n`;
const LEGACY = `# mtg-table — decisions\n\nPreamble.\n\n---\n\n${entry(1)}${entry(2)}`;

let seq = 0;
/** A scratch tree: `legacy` is DECISIONS.md's text (null: none), `files` maps docs/decisions/ names to text. */
function tree(legacy, files = {}) {
  const root = join(BASE, `t${++seq}`);
  mkdirSync(join(root, 'docs/decisions'), { recursive: true });
  if (legacy !== null) writeFileSync(join(root, 'DECISIONS.md'), legacy);
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, 'docs/decisions', name), text);
  return root;
}
function run(root, ...args) {
  const r = spawnSync(process.execPath, [CLI, '--root', root, ...args], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}
function expect(label, root, args, code, pattern) {
  const r = run(root, ...args);
  if (r.code === code && (!pattern || pattern.test(r.out))) ok(label);
  else bad(`${label} -- exit ${r.code}, want ${code}${pattern ? ` and ${pattern}` : ''}`, r.out);
}

console.log('decisions-selftest: the checkout');
expect('the repository passes check', REPO, ['check'], 0, /^decisions OK/m);

console.log('decisions-selftest: a clean tree, both sources');
const clean = tree(LEGACY, { 'D003-three.md': entry(3, 'the third, as a file') });
expect('check passes', clean, ['check'], 0, /3 decisions, 1 under docs\/decisions\//);
expect('next is one above the highest file', clean, ['next'], 0, /^D4$/m);
expect('has D2 (DECISIONS.md)', clean, ['has', 'D2'], 0);
expect('has D3 (docs/decisions/ only)', clean, ['has', 'D3'], 0);
expect('has 3 (no D prefix)', clean, ['has', '3'], 0);
expect('has D4 is false', clean, ['has', 'D4'], 1);
expect('list names both sources, in number order', clean, ['list'], 0,
  /^D1\tDECISIONS\.md\t.*\nD2\tDECISIONS\.md\t.*\nD3\tdocs\/decisions\/D003-three\.md\tthe third, as a file$/m);
expect('next is one above the highest legacy entry when it is higher',
  tree(`${LEGACY}${entry(40)}`, { 'D003-three.md': entry(3) }), ['next'], 0, /^D41$/m);
expect('no DECISIONS.md and no files: next is D1', tree(null), ['next'], 0, /^D1$/m);
expect('a four-digit file name', tree(LEGACY, { 'D1000-big.md': entry(1000) }), ['check'], 0);
expect('an unknown command is a usage error', clean, ['frobnicate'], 2, /usage/);

console.log('decisions-selftest: every defect fails check');
const defects = [
  ['a number in both sources', tree(LEGACY, { 'D002-again.md': entry(2) }), /D2 is used twice: DECISIONS\.md:\d+ and docs\/decisions\/D002-again\.md/],
  ['a number twice in DECISIONS.md', tree(`${LEGACY}${entry(2, 'again')}`), /D2 is used twice: DECISIONS\.md:\d+ and DECISIONS\.md:\d+/],
  ['a number twice under docs/decisions/', tree(LEGACY, { 'D003-a.md': entry(3), 'D003-b.md': entry(3) }), /D3 is used twice/],
  ['a file name and heading that disagree', tree(LEGACY, { 'D004-four.md': entry(5) }), /file name says D4, its heading says D5/],
  ['a malformed heading in DECISIONS.md (hyphen, not em dash)', tree(`${LEGACY}## D3 - hyphen\n\n**2026-10-01**\n`), /DECISIONS\.md:\d+: malformed heading/],
  ['a malformed heading in DECISIONS.md (no space)', tree(`${LEGACY}##D3 — tight\n`), /malformed heading/],
  ['a file that does not start with the heading', tree(LEGACY, { 'D003-late.md': `Intro.\n\n${entry(3)}` }), /must start with "## D<n> — <title>"/],
  ['a file whose heading is malformed', tree(LEGACY, { 'D003-bad.md': '## D3 – en dash\n\n**2026-10-01**\n' }), /must start with/],
  ['a file name with two digits', tree(LEGACY, { 'D03-short.md': entry(3) }), /not a decision file name/],
  ['a file name with an upper-case slug', tree(LEGACY, { 'D003-Upper.md': entry(3) }), /not a decision file name/],
  ['a stray file', tree(LEGACY, { 'README.md': '# notes\n' }), /README\.md: not a decision file name/],
  ['a file with no date line', tree(LEGACY, { 'D003-nodate.md': '## D3 — undated\n\nBody.\n' }), /no date line/],
  ['two decisions in one file', tree(LEGACY, { 'D003-two.md': `${entry(3)}${entry(4)}` }), /a second decision heading/],
];
for (const [label, root, pattern] of defects) expect(label, root, ['check'], 1, pattern);

rmSync(BASE, { recursive: true, force: true });
if (failed) {
  console.error(`decisions-selftest FAILED: ${failed} of ${checks} check(s)`);
  process.exit(1);
}
console.log(`decisions-selftest OK: ${checks} checks`);
