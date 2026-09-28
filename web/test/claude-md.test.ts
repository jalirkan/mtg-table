/*
 * mtg-table — web/test/claude-md.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Every rule in the CLAUDE.md files is written exactly once, and none of them
 * vanished.** The working conventions are split across a root `CLAUDE.md` and
 * nested ones beside the code they govern (`bridge/`, `web/`, `web/src/arena/`,
 * `tools/`), which Claude Code loads when it works under that directory. A split
 * like that fails in two quiet ways — a rule copied into two files drifts apart,
 * and a rule dropped in a move is simply gone — and nothing else in the repo
 * would notice either, because no code reads these files.
 *
 * A RULE, for this test, is a line (outside a fenced code block) that starts
 * with a bold marker (`**…`), a numbered convention (`3. …`) or a bold bullet
 * (`- **…`). That is the first line of every hard rule, every numbered
 * convention and every bolded rule sentence; the manifest records that first
 * line, and a rule's continuation lines are the rule's own business.
 *
 * `docs/claude-md-rules.txt` is the committed manifest: one normalised rule per
 * line (markdown link targets dropped, so a moved file may re-point its links,
 * and runs of whitespace folded). It was generated from the single CLAUDE.md
 * before the split. The checks:
 *
 *  - no rule appears twice across all the CLAUDE.md files;
 *  - every rule in the manifest appears in one of them (a rule that vanished);
 *  - every rule in them is in the manifest (a new or reworded rule is written
 *    down on purpose, in the same change);
 *  - every relative markdown link in them resolves to a file;
 *  - the root file stays under 9,000 words — the per-directory files are where
 *    detail goes.
 *
 * Changing a rule on purpose: edit the CLAUDE.md, then regenerate the manifest
 * with `CLAUDE_MD_RULES_WRITE=1 node --test web/test/claude-md.test.ts` (from
 * the repo root) and let the diff of `docs/claude-md-rules.txt` show the change.
 */

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const MANIFEST = join(REPO, 'docs/claude-md-rules.txt');
const ROOT_WORD_CAP = 9000;

/** Directories the walk never enters: generated, vendored or local-only trees. */
const SKIP = new Set(['node_modules', '.git', 'var', 'dist', '.vite']);

/** Every CLAUDE.md in the repository, root first, the rest in path order. */
function claudeFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue; // forge-home/res is the user's Forge install
      if (entry.isDirectory()) {
        if (!SKIP.has(entry.name)) walk(join(dir, entry.name));
      } else if (entry.name === 'CLAUDE.md') {
        found.push(relative(REPO, join(dir, entry.name)));
      }
    }
  };
  walk(REPO);
  return found.sort((a, b) => (a === 'CLAUDE.md' ? -1 : b === 'CLAUDE.md' ? 1 : a.localeCompare(b)));
}

function normalise(line: string): string {
  return line.trim().replace(/\]\([^)]*\)/g, '](…)').replace(/\s+/g, ' ');
}

/** The rule lines of one file, in order, normalised. */
function rulesOf(text: string): string[] {
  const rules: string[] = [];
  let fenced = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    if (line.startsWith('**') || /^\d+\.\s/.test(line) || /^-\s+\*\*/.test(line)) rules.push(normalise(line));
  }
  return rules;
}

function readManifest(): string[] {
  return readFileSync(MANIFEST, 'utf8')
    .split('\n')
    .filter((line) => line !== '' && !line.startsWith('#'));
}

const FILES = claudeFiles();
const RULES = FILES.map((file) => ({ file, rules: rulesOf(readFileSync(join(REPO, file), 'utf8')) }));

if (process.env.CLAUDE_MD_RULES_WRITE === '1') {
  const header = [
    '# docs/claude-md-rules.txt — every rule line of the CLAUDE.md files, one per line.',
    '# Checked by web/test/claude-md.test.ts; regenerate with',
    '# CLAUDE_MD_RULES_WRITE=1 node --test web/test/claude-md.test.ts',
    '# (a rule line starts with **, "N. " or "- **"; link targets dropped, whitespace folded)',
  ];
  writeFileSync(MANIFEST, [...header, ...RULES.flatMap((r) => r.rules), ''].join('\n'));
}

test('claude-md: the root CLAUDE.md is found, and every CLAUDE.md has rules to check', () => {
  assert.equal(FILES[0], 'CLAUDE.md', 'no root CLAUDE.md');
  for (const { file, rules } of RULES) assert.ok(rules.length > 0, `${file} has no rule lines — is it a CLAUDE.md?`);
});

test('claude-md: no rule is written twice, in one file or across two', () => {
  const where = new Map<string, string[]>();
  for (const { file, rules } of RULES) for (const rule of rules) where.set(rule, [...(where.get(rule) ?? []), file]);
  const twice = [...where].filter(([, files]) => files.length > 1).map(([rule, files]) => `${files.join(' + ')}: ${rule}`);
  assert.deepEqual(twice, [], 'a rule appears more than once — keep one copy and point at it');
});

test('claude-md: every rule in the manifest is still written somewhere, and nothing unrecorded is', () => {
  const manifest = readManifest();
  assert.ok(manifest.length > 100, `the manifest has ${String(manifest.length)} rules — was it truncated?`);
  assert.equal(new Set(manifest).size, manifest.length, 'the manifest lists a rule twice');
  const written = new Set(RULES.flatMap((r) => r.rules));
  const vanished = manifest.filter((rule) => !written.has(rule));
  assert.deepEqual(vanished, [], 'these rules are in docs/claude-md-rules.txt and in no CLAUDE.md (a move dropped them?)');
  const recorded = new Set(manifest);
  const unrecorded = RULES.flatMap(({ file, rules }) => rules.filter((rule) => !recorded.has(rule)).map((rule) => `${file}: ${rule}`));
  assert.deepEqual(unrecorded, [], 'these rules are not in docs/claude-md-rules.txt — regenerate it on purpose (see the header)');
});

test('claude-md: every relative link in every CLAUDE.md resolves', () => {
  const broken: string[] = [];
  for (const file of FILES) {
    const text = readFileSync(join(REPO, file), 'utf8');
    for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = (match[1] ?? '').split('#')[0] ?? '';
      if (target === '' || /^[a-z]+:/i.test(target)) continue;
      if (!existsSync(resolve(REPO, dirname(file), target))) broken.push(`${file}: ${target}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('claude-md: the root file stays small — the detail lives beside the code it governs', () => {
  if (FILES.length === 1) return; // before the split, there is only the one file
  const words = readFileSync(join(REPO, 'CLAUDE.md'), 'utf8').split(/\s+/).filter((w) => w !== '').length;
  assert.ok(words < ROOT_WORD_CAP, `the root CLAUDE.md is ${String(words)} words (cap ${String(ROOT_WORD_CAP)}) — move detail into a nested CLAUDE.md`);
});
