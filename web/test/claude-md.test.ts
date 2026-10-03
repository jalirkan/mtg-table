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
 * Two kinds of entry are checked, outside fenced code blocks:
 *
 *  - a RULE LINE starts with a bold marker (`**…`), a numbered convention
 *    (`3. …`) or a bold bullet (`- **…`). That is the first line of every hard
 *    rule, every numbered convention and every bolded rule sentence that opens
 *    a line; the manifest records that first line, and a rule's continuation
 *    lines are the rule's own business;
 *  - a BOLD SPAN is any `**…**` of at least 20 characters, wherever it sits —
 *    the middle of a paragraph included, which the rule lines cannot see (the
 *    docs block's review took the bold off a mid-paragraph rule and this test
 *    stayed green). A span may cross a line break, never a blank line.
 *
 * `docs/claude-md-rules.txt` is the committed manifest: one normalised entry per
 * line (markdown link targets dropped, so a moved file may re-point its links,
 * and runs of whitespace folded), bold spans prefixed `span: `. Its rule lines
 * were generated from the single CLAUDE.md before the split; its spans were
 * added by the docs block's fix pass, from the split tree, after every span of
 * the pre-split file was accounted for (in the rules, moved to an evidence file,
 * or reworded on purpose — that commit's message lists them). The checks:
 *
 *  - no rule line, and no bold span, appears twice across all the CLAUDE.md
 *    files;
 *  - every entry in the manifest appears in one of them (a rule that vanished);
 *  - every entry in them is in the manifest (a new or reworded rule is written
 *    down on purpose, in the same change);
 *  - every relative markdown link in them resolves to a file, and every
 *    `#anchor` on a link to a markdown file names a heading of that file (by
 *    GitHub's slug) or an `<a id>` in it;
 *  - the root file stays under 9,000 words — the per-directory files are where
 *    detail goes.
 *
 * What it cannot see: a rule written in plain text with no bold and not at the
 * start of a line, and a bold span shorter than 20 characters.
 *
 * Changing a rule on purpose: edit the CLAUDE.md, then regenerate the manifest
 * with `CLAUDE_MD_RULES_WRITE=1 node --test web/test/claude-md.test.ts` (from
 * the repo root) and let the diff of `docs/claude-md-rules.txt` show the change.
 */

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const MANIFEST = join(REPO, 'docs/claude-md-rules.txt');
const ROOT_WORD_CAP = 9000;
/** A bold span shorter than this is emphasis (`**D54**`, `**not**`), not a rule. */
const SPAN_MIN = 20;
const SPAN = 'span: ';

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

/** Every text line outside a fenced code block; a fenced line becomes blank. */
function unfenced(text: string): string[] {
  let fenced = false;
  return text.split('\n').map((raw) => {
    if (raw.trim().startsWith('```')) {
      fenced = !fenced;
      return '';
    }
    return fenced ? '' : raw;
  });
}

/** The bold spans of one file of at least SPAN_MIN characters, in order, normalised. */
function spansOf(text: string): string[] {
  const spans: string[] = [];
  for (const paragraph of unfenced(text).join('\n').split(/\n\s*\n/)) {
    // An asterisk inside an inline code span is code, not a bold marker.
    const masked = paragraph.replace(/`[^`\n]*`/g, (code) => code.replace(/\*/g, '\u0000'));
    for (const match of masked.matchAll(/\*\*([^]+?)\*\*/g)) {
      const span = normalise((match[1] ?? '').replace(/\u0000/g, '*'));
      if (span.length >= SPAN_MIN) spans.push(SPAN + span);
    }
  }
  return spans;
}

/** GitHub's heading slug: lower case, punctuation dropped (hyphens kept), spaces to hyphens. */
function slug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\s-]/gu, '')
    .replace(/\s/g, '-');
}

/** Every anchor a link may name in one markdown file: its headings' slugs and its `<a id>`s. */
function anchorsOf(file: string): Set<string> {
  const anchors = new Set<string>();
  const seen = new Map<string, number>();
  const lines = unfenced(readFileSync(file, 'utf8'));
  for (const line of lines) {
    const heading = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading !== null) {
      const base = slug(heading[1] ?? '');
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      anchors.add(n === 0 ? base : `${base}-${String(n)}`);
    }
    for (const a of line.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) anchors.add(a[1] ?? '');
  }
  return anchors;
}

function readManifest(): string[] {
  return readFileSync(MANIFEST, 'utf8')
    .split('\n')
    .filter((line) => line !== '' && !line.startsWith('#'));
}

const FILES = claudeFiles();
const RULES = FILES.map((file) => ({ file, rules: rulesOf(readFileSync(join(REPO, file), 'utf8')) }));
const SPANS = FILES.map((file) => ({ file, rules: spansOf(readFileSync(join(REPO, file), 'utf8')) }));

if (process.env.CLAUDE_MD_RULES_WRITE === '1') {
  const header = [
    '# docs/claude-md-rules.txt — every rule line and bold span of the CLAUDE.md files, one per line.',
    '# Checked by web/test/claude-md.test.ts; regenerate with',
    '# CLAUDE_MD_RULES_WRITE=1 node --test web/test/claude-md.test.ts',
    '# (a rule line starts with **, "N. " or "- **"; a "span: " entry is a bold span of',
    `# ${String(SPAN_MIN)}+ characters anywhere; link targets dropped, whitespace folded)`,
  ];
  writeFileSync(MANIFEST, [...header, ...RULES.flatMap((r) => r.rules), ...SPANS.flatMap((r) => r.rules), ''].join('\n'));
}

test('claude-md: the root CLAUDE.md is found, and every CLAUDE.md has rules to check', () => {
  assert.equal(FILES[0], 'CLAUDE.md', 'no root CLAUDE.md');
  for (const { file, rules } of RULES) assert.ok(rules.length > 0, `${file} has no rule lines — is it a CLAUDE.md?`);
});

test('claude-md: no rule is written twice, in one file or across two', () => {
  const where = new Map<string, string[]>();
  for (const { file, rules } of [...RULES, ...SPANS]) for (const rule of rules) where.set(rule, [...(where.get(rule) ?? []), file]);
  const twice = [...where].filter(([, files]) => files.length > 1).map(([rule, files]) => `${files.join(' + ')}: ${rule}`);
  assert.deepEqual(twice, [], 'a rule appears more than once — keep one copy and point at it');
});

test('claude-md: every rule in the manifest is still written somewhere, and nothing unrecorded is', () => {
  const manifest = readManifest();
  const lines = manifest.filter((rule) => !rule.startsWith(SPAN)).length;
  assert.ok(lines > 100, `the manifest has ${String(lines)} rule lines — was it truncated?`);
  assert.ok(manifest.length - lines > 100, `the manifest has ${String(manifest.length - lines)} bold spans — was it truncated?`);
  assert.equal(new Set(manifest).size, manifest.length, 'the manifest lists a rule twice');
  const written = new Set([...RULES, ...SPANS].flatMap((r) => r.rules));
  const vanished = manifest.filter((rule) => !written.has(rule));
  assert.deepEqual(vanished, [], 'these rules are in docs/claude-md-rules.txt and in no CLAUDE.md (a move dropped them?)');
  const recorded = new Set(manifest);
  const unrecorded = [...RULES, ...SPANS].flatMap(({ file, rules }) =>
    rules.filter((rule) => !recorded.has(rule)).map((rule) => `${file}: ${rule}`),
  );
  assert.deepEqual(unrecorded, [], 'these rules are not in docs/claude-md-rules.txt — regenerate it on purpose (see the header)');
});

test('claude-md: every relative link in every CLAUDE.md resolves, #anchor included', () => {
  const broken: string[] = [];
  for (const file of FILES) {
    const text = unfenced(readFileSync(join(REPO, file), 'utf8')).join('\n');
    for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const link = match[1] ?? '';
      if (/^[a-z]+:/i.test(link)) continue;
      const [target = '', anchor = ''] = link.split('#');
      const path = target === '' ? join(REPO, file) : resolve(REPO, dirname(file), decodeURIComponent(target));
      if (!existsSync(path)) {
        broken.push(`${file}: ${link} (no such file)`);
        continue;
      }
      if (anchor !== '' && path.endsWith('.md') && statSync(path).isFile() && !anchorsOf(path).has(anchor)) {
        broken.push(`${file}: ${link} (no such heading or <a id>)`);
      }
    }
  }
  assert.deepEqual(broken, []);
});

test('claude-md: the root file stays small — the detail lives beside the code it governs', () => {
  if (FILES.length === 1) return; // before the split, there is only the one file
  const words = readFileSync(join(REPO, 'CLAUDE.md'), 'utf8').split(/\s+/).filter((w) => w !== '').length;
  assert.ok(words < ROOT_WORD_CAP, `the root CLAUDE.md is ${String(words)} words (cap ${String(ROOT_WORD_CAP)}) — move detail into a nested CLAUDE.md`);
});
