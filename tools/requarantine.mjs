#!/usr/bin/env node
/*
 * mtg-table -- tools/requarantine.mjs
 * Copyright (C) 2026 mtg-table contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Re-checks a queue night's quarantined recordings with the current redaction
 * checker, and puts back the ones that now pass every check (D371: the A9 rule
 * that quarantined most of nights 1 and 2 was the checker's false positive).
 *
 *   node tools/requarantine.mjs check   --night N --quarantine DIR --queue DIR --out DIR
 *                                       [--old-checker FILE] [--limit K] [--jobs J]
 *   node tools/requarantine.mjs restore --night N --quarantine DIR --queue DIR --out DIR [--dry-run]
 *   node tools/requarantine.mjs undo    --manifest FILE [--dry-run]
 *
 * A queue night's redaction pass (J020/J029, J059, J061) moved each failing
 * recording from <queue>/<rel> to <quarantine>/<rel> and listed the original
 * paths in <quarantine>/failed.txt.  Night 1's failed.txt was rewritten by its
 * second run (J029), so `check` walks the quarantine folder itself.
 *
 * `check` runs tools/check-redaction.mjs (and, with --old-checker, the checker
 * the night ran) over every *.jsonl.gz under the quarantine folder and writes
 *   <out>/results.jsonl  one line per recording: {night, rel, sha256, bytes,
 *                        before: [kinds], after: "pass"|"fail", kinds: [kinds],
 *                        messages: [the first few new messages]}
 *   <out>/report.json    per night, per failure kind (the old checker's when
 *                        given, else the new one's): how many, how many now pass
 *   <out>/report.md      the same, as a table
 * and moves nothing.
 *
 * `restore` reads <out>/results.jsonl and moves back ONLY the recordings whose
 * `after` is "pass" and whose bytes still hash to the recorded sha256, to
 * <queue>/<rel>, never over an existing file.  Each move is one line of
 * <out>/manifest.jsonl (appended, so a crash leaves a true record).  The
 * quarantine's failed.txt is rewritten without the restored paths, after a
 * copy is kept as failed.before-restore.txt.  Recordings that still fail stay
 * where they are, and their new messages go to <quarantine>/recheck.jsonl.
 *
 * `undo` reads a manifest backwards and moves each restored recording back into
 * quarantine (only if it is still where restore put it, with the same hash),
 * then puts failed.txt back from its copy.
 */

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECKER = join(HERE, 'check-redaction.mjs');
const BATCH = 40;
const KEEP_MESSAGES = 5;

// ---------------------------------------------------------------------------
// Parsing the checker's output.
// ---------------------------------------------------------------------------

/**
 * A failure message's kind: the rule tag the checker writes in parentheses
 * ("(A9)", "(A9, D371)", "(A3)"), else a named phrase, else "other".
 */
export function kindOf(msg) {
  const tag = /\((A\d+|P\d+|M\d+)[,)]/.exec(msg);
  if (tag) return tag[1];
  if (/own hand card \d+ has no name/.test(msg)) return 'own-hand-no-name';
  if (/proves nothing|not one card was redacted/.test(msg)) return 'proves-nothing';
  if (/seq=|dropped frame/.test(msg)) return 'seq';
  if (/is missing "|leaks extra keys|has an unexpected key|is not a/.test(msg)) return 'shape';
  return 'other';
}

/** The checker's stdout -> Map(path -> {pass, messages}). */
export function parseCheckerOutput(text) {
  const out = new Map();
  let cur = null;
  for (const line of text.split('\n')) {
    const head = /^(PASS|FAIL) {2}(.+)$/.exec(line);
    if (head) {
      cur = { pass: head[1] === 'PASS', messages: [] };
      out.set(head[2], cur);
      continue;
    }
    const bang = /^\s+! (.*)$/.exec(line);
    if (bang && cur && !/^\.\.\. and \d+ more/.test(bang[1])) {
      // "<path>:<line>: msg" or "<path>: msg"
      const m = /^.*?\.jsonl(?:\.gz)?(?::\d+)?: (.*)$/.exec(bang[1]);
      cur.messages.push(m ? m[1] : bang[1]);
    }
  }
  return out;
}

function runChecker(checker, files) {
  return new Promise((resolveP, reject) => {
    const p = spawn(process.execPath, [checker, ...files], { stdio: ['ignore', 'pipe', 'pipe'] });
    let text = '';
    p.stdout.on('data', (d) => { text += d; });
    p.stderr.on('data', (d) => { text += d; });
    p.on('error', reject);
    p.on('close', () => resolveP(parseCheckerOutput(text)));
  });
}

async function checkAll(checker, files, jobs) {
  const batches = [];
  for (let i = 0; i < files.length; i += BATCH) batches.push(files.slice(i, i + BATCH));
  const results = new Map();
  let next = 0;
  const worker = async () => {
    while (next < batches.length) {
      const b = batches[next++];
      const r = await runChecker(checker, b);
      for (const f of b) results.set(f, r.get(f) ?? { pass: false, messages: ['the checker printed no verdict for this file'] });
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, jobs) }, worker));
  return results;
}

// ---------------------------------------------------------------------------

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.isFile() && (e.name.endsWith('.jsonl.gz') || e.name.endsWith('.jsonl'))) out.push(p);
  }
  return out.sort();
}

const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const uniq = (xs) => [...new Set(xs)].sort();

function args(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--dry-run') a.dryRun = true;
    else if (k.startsWith('--')) a[k.slice(2)] = argv[++i];
    else a._.push(k);
  }
  return a;
}

function need(a, ...keys) {
  for (const k of keys) {
    if (a[k] === undefined) throw new Error(`--${k} is required`);
  }
}

export async function check(a) {
  need(a, 'night', 'quarantine', 'queue', 'out');
  const night = Number(a.night);
  let files = walk(a.quarantine);
  if (a.limit !== undefined) files = files.slice(0, Number(a.limit));
  const jobs = Number(a.jobs ?? 1);
  const after = await checkAll(CHECKER, files, jobs);
  const before = a['old-checker'] ? await checkAll(resolve(a['old-checker']), files, jobs) : null;
  mkdirSync(a.out, { recursive: true });
  const lines = [];
  for (const f of files) {
    const r = after.get(f);
    const b = before?.get(f);
    lines.push({
      night, rel: relative(a.quarantine, f), sha256: sha256(f), bytes: statSync(f).size,
      before: b ? (b.pass ? ['passed-then'] : uniq(b.messages.map(kindOf))) : null,
      after: r.pass ? 'pass' : 'fail',
      kinds: uniq(r.messages.map(kindOf)),
      messages: r.messages.slice(0, KEEP_MESSAGES),
    });
  }
  writeFileSync(join(a.out, 'results.jsonl'), lines.map((l) => JSON.stringify(l)).join('\n') + (lines.length ? '\n' : ''));
  const report = summarise(night, lines);
  writeFileSync(join(a.out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(join(a.out, 'report.md'), reportMd(report));
  process.stdout.write(reportMd(report));
  return report;
}

/** Per failure kind (the old checker's when known): how many recordings, how many now pass. */
export function summarise(night, lines) {
  const byKind = {};
  for (const l of lines) {
    const kinds = l.before ?? (l.after === 'pass' ? ['(unknown: no old checker)'] : l.kinds);
    for (const k of kinds.length ? kinds : ['other']) {
      byKind[k] ??= { recordings: 0, nowPass: 0, stillFail: 0, stillFailKinds: {} };
      const e = byKind[k];
      e.recordings++;
      if (l.after === 'pass') e.nowPass++;
      else {
        e.stillFail++;
        for (const s of l.kinds) e.stillFailKinds[s] = (e.stillFailKinds[s] ?? 0) + 1;
      }
    }
  }
  const nowPass = lines.filter((l) => l.after === 'pass').length;
  return { night, recordings: lines.length, nowPass, stillFail: lines.length - nowPass, byKind };
}

function reportMd(r) {
  const rows = Object.entries(r.byKind).sort((x, y) => y[1].recordings - x[1].recordings)
    .map(([k, e]) => `| ${k} | ${e.recordings} | ${e.nowPass} | ${e.stillFail} | ${Object.entries(e.stillFailKinds).map(([s, n]) => `${s} ${n}`).join(', ')} |`);
  return [
    `## Night ${r.night}: ${r.recordings} quarantined recordings, ${r.nowPass} now pass, ${r.stillFail} still fail`,
    '',
    '| failure kind (then) | recordings | now pass | still fail | still failing on |',
    '|---|---:|---:|---:|---|',
    ...rows,
    '',
  ].join('\n');
}

export function restore(a) {
  need(a, 'night', 'quarantine', 'queue', 'out');
  const night = Number(a.night);
  const results = readFileSync(join(a.out, 'results.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const manifest = join(a.out, 'manifest.jsonl');
  const failedTxt = join(a.quarantine, 'failed.txt');
  const failedCopy = join(a.quarantine, 'failed.before-restore.txt');
  const restored = [];
  const skipped = [];
  const recheck = [];
  if (!a.dryRun && existsSync(failedTxt) && !existsSync(failedCopy)) copyFileSync(failedTxt, failedCopy);
  for (const r of results) {
    if (r.night !== night) continue;
    const from = join(a.quarantine, r.rel);
    const to = join(a.queue, r.rel);
    if (r.after !== 'pass') {
      recheck.push({ night, rel: r.rel, kinds: r.kinds, messages: r.messages });
      continue;
    }
    if (!existsSync(from)) { skipped.push([r.rel, 'not in quarantine any more']); continue; }
    if (existsSync(to)) { skipped.push([r.rel, 'the queue already has a file there']); continue; }
    if (sha256(from) !== r.sha256) { skipped.push([r.rel, 'changed since it was checked']); continue; }
    restored.push(r.rel);
    if (a.dryRun) continue;
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
    appendFileSync(manifest, JSON.stringify({
      night, from, to, sha256: r.sha256, failedTxt, failedCopy, at: new Date().toISOString(),
    }) + '\n');
  }
  if (!a.dryRun) {
    if (existsSync(failedTxt)) {
      const gone = new Set(restored.map((rel) => join(a.queue, rel)));
      const kept = readFileSync(failedTxt, 'utf8').split('\n').filter((l) => l && !gone.has(l));
      writeFileSync(failedTxt, kept.join('\n') + (kept.length ? '\n' : ''));
    }
    writeFileSync(join(a.quarantine, 'recheck.jsonl'), recheck.map((l) => JSON.stringify(l)).join('\n') + (recheck.length ? '\n' : ''));
  }
  const summary = { night, dryRun: !!a.dryRun, restored: restored.length, stillQuarantined: recheck.length, skipped };
  console.log(JSON.stringify(summary));
  return summary;
}

export function undo(a) {
  need(a, 'manifest');
  const moves = readFileSync(a.manifest, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).reverse();
  let undone = 0;
  const skipped = [];
  const failedFiles = new Map();
  for (const m of moves) {
    if (!existsSync(m.to)) { skipped.push([m.to, 'not where restore put it']); continue; }
    if (existsSync(m.from)) { skipped.push([m.to, 'quarantine already has a file there']); continue; }
    if (sha256(m.to) !== m.sha256) { skipped.push([m.to, 'changed since restore']); continue; }
    undone++;
    failedFiles.set(m.failedTxt, m.failedCopy);
    if (a.dryRun) continue;
    mkdirSync(dirname(m.from), { recursive: true });
    renameSync(m.to, m.from);
  }
  if (!a.dryRun) {
    for (const [txt, copy] of failedFiles) if (existsSync(copy)) copyFileSync(copy, txt);
  }
  const summary = { dryRun: !!a.dryRun, undone, skipped };
  console.log(JSON.stringify(summary));
  return summary;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = args(process.argv.slice(2));
  const cmd = a._[0];
  try {
    if (cmd === 'check') await check(a);
    else if (cmd === 'restore') restore(a);
    else if (cmd === 'undo') undo(a);
    else {
      console.error('usage: node tools/requarantine.mjs check|restore|undo ... (see the header)');
      process.exit(2);
    }
  } catch (e) {
    console.error(`requarantine: ${e.message}`);
    process.exit(1);
  }
}
