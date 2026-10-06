#!/usr/bin/env node
// mtg-table — the decision index: DECISIONS.md (D1–D378, frozen) plus docs/decisions/.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// D379.  Every PR used to append its decision to the end of DECISIONS.md, so two
// PRs open at once conflicted on that file every time one merged.  From D379 on,
// each decision is a file of its own, `docs/decisions/D<nnn>-<slug>.md`, whose
// first line is `## D<nnn> — <title>` and whose date line is `**YYYY-MM-DD**`,
// as the old entries.  DECISIONS.md keeps D1–D378 as they were.  Numbers stay
// final (D200), so a D<n> is resolved in BOTH places, and this tool is the one
// that knows how:
//
//   node tools/decisions.mjs list    every decision, one line each: number, source, title
//   node tools/decisions.mjs next    the next free number above the highest in either source
//   node tools/decisions.mjs check   exit 1 on a number used twice (across or within the
//                                    sources), a file whose name and heading disagree, a
//                                    malformed heading, or a stray file in docs/decisions/
//   node tools/decisions.mjs has D<n>   exit 0 when D<n> is a decision heading, 1 when not
//
// `--root <dir>` reads another tree (tools/decisions-selftest.mjs uses it).
// No dependencies; any Node with ES modules runs it.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LEGACY = 'DECISIONS.md';
export const DIR = 'docs/decisions';
/** `## D<n> — <title>`: the one heading shape, old and new. */
const HEADING = /^## D(\d+) — (\S.*)$/;
/** Any line that looks like it means to be a decision heading. */
const HEADING_ISH = /^##\s*D\d/;
/** `D<nnn>-<slug>.md`: at least three digits, a lower-case slug. */
const FILE = /^D(\d{3,})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
const DATE = /^\*\*\d{4}-\d{2}-\d{2}\b/m;

/**
 * Reads both sources.  Returns { entries, problems }: entries are
 * { n, title, source, line }, problems are strings (empty when the index is sound).
 */
export function readIndex(root) {
  const entries = [];
  const problems = [];
  const legacy = join(root, LEGACY);
  if (existsSync(legacy)) {
    const lines = readFileSync(legacy, 'utf8').split('\n');
    lines.forEach((text, i) => {
      if (!HEADING_ISH.test(text)) return;
      const m = HEADING.exec(text);
      if (!m) {
        problems.push(`${LEGACY}:${i + 1}: malformed heading (want "## D<n> — <title>"): ${text}`);
        return;
      }
      entries.push({ n: Number(m[1]), title: m[2], source: LEGACY, line: i + 1 });
    });
  }
  const dir = join(root, DIR);
  if (existsSync(dir)) {
    for (const name of readdirSync(dir).sort()) {
      const rel = `${DIR}/${name}`;
      const f = FILE.exec(name);
      if (!f) {
        problems.push(`${rel}: not a decision file name (want D<nnn>-<slug>.md, slug in a-z0-9 and -)`);
        continue;
      }
      const text = readFileSync(join(dir, name), 'utf8');
      const lines = text.split('\n');
      const first = lines.findIndex((l) => l.trim() !== '');
      const m = first >= 0 ? HEADING.exec(lines[first]) : null;
      if (!m) {
        problems.push(`${rel}:${first + 1}: the file must start with "## D<n> — <title>"`);
        continue;
      }
      const n = Number(m[1]);
      if (n !== Number(f[1])) {
        problems.push(`${rel}: the file name says D${Number(f[1])}, its heading says D${n}`);
      }
      const more = lines.findIndex((l, i) => i > first && HEADING_ISH.test(l));
      if (more >= 0) {
        problems.push(`${rel}:${more + 1}: a second decision heading -- one decision per file`);
      }
      if (!DATE.test(text)) {
        problems.push(`${rel}: no date line (**YYYY-MM-DD**)`);
      }
      entries.push({ n, title: m[2], source: rel, line: first + 1 });
    }
  }
  const seen = new Map();
  for (const e of entries) {
    const prev = seen.get(e.n);
    if (prev) {
      problems.push(`D${e.n} is used twice: ${prev.source}:${prev.line} and ${e.source}:${e.line} (numbers are final, D200)`);
    } else {
      seen.set(e.n, e);
    }
  }
  entries.sort((a, b) => a.n - b.n);
  return { entries, problems };
}

/** The source that holds D<n>, or null.  The one resolver every reader shares. */
export function resolveDecision(root, id) {
  const m = /^D?(\d+)$/.exec(String(id));
  if (!m) return null;
  const n = Number(m[1]);
  const hit = readIndex(root).entries.find((e) => e.n === n);
  return hit ? hit.source : null;
}

export function nextNumber(entries) {
  return entries.reduce((max, e) => Math.max(max, e.n), 0) + 1;
}

function main(argv) {
  let root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const args = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') root = resolve(argv[++i] ?? '.');
    else args.push(argv[i]);
  }
  const [cmd, arg] = args;
  const { entries, problems } = readIndex(root);
  switch (cmd) {
    case 'list':
      for (const e of entries) console.log(`D${e.n}\t${e.source}\t${e.title}`);
      return 0;
    case 'next':
      console.log(`D${nextNumber(entries)}`);
      return 0;
    case 'has':
      return resolveDecision(root, arg ?? '') ? 0 : 1;
    case 'check':
      if (problems.length) {
        for (const p of problems) console.error(`decisions: ${p}`);
        console.error(`decisions check FAILED: ${problems.length} problem(s)`);
        return 1;
      }
      console.log(`decisions OK: ${entries.length} decisions, ${entries.filter((e) => e.source !== LEGACY).length} under ${DIR}/, next is D${nextNumber(entries)}`);
      return 0;
    default:
      console.error('usage: node tools/decisions.mjs [--root <dir>] list | next | check | has D<n>');
      return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
