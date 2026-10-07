#!/usr/bin/env node
// mtg-table — tools/bugs-sync.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// BUG REPORTS TO THE CLOUD SESSION (D411).  The board's "Report a bug" panel saves
// reports on this machine, in var/bugs/ (tools/bug-reports.mjs).  This copies the
// new ones to the `pc-results` branch, under bugs/, where the cloud session reads
// them:
//
//   bugs/<id>.json    the report, made smaller: the last SYNC_FRAMES frames of its
//                     log at most and SYNC_JSON bytes in all (the whole report stays
//                     in var/bugs/ on this machine)
//   bugs/<id>.jpg     its screenshot's small copy (the thumbnail the page made), when
//                     one came and it is at most SYNC_IMAGE bytes
//   bugs/INDEX.md     one line a report, oldest first
//
//   node tools/bugs-sync.mjs              what would go (nothing is written or pushed)
//   node tools/bugs-sync.mjs --push       copy and push them; prints the ids
//   node tools/bugs-sync.mjs --push --if-new --quiet    scripts/play.sh on exit: silent with nothing new
//   --max N (default 40 a push), --dir <var/bugs>, --remote origin, --branch pc-results
//
// THE GIT FLOW is the lab runner's `approve` (tools/runner/runner.ts): fetch the
// branch, a temporary DETACHED worktree of it under var/bugs-sync/ (never this
// checkout's working tree, never a branch of it), write, commit, push
// HEAD:refs/heads/pc-results; a refused push is fetched, re-applied and tried
// again, three times; the worktree is removed whatever happens.  Only bugs/ is
// written, so it never meets the runner's files.  Git never asks for a password
// here (GIT_TERMINAL_PROMPT=0, ssh BatchMode): with no credentials the push fails
// at once and says so.  A report already on the branch is never written again
// (var/bugs/.synced lists what went; the branch's own bugs/ is checked too).
//
// It never pushes anywhere but pc-results, and never pc-jobs.  Run from the repo
// root (hard rule 9).  Self-test: tools/bug-reports-selftest.mjs (against a local
// bare repository).

import { spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUG_ID, bugFolder } from './bug-reports.mjs';

export const SYNC_FRAMES = 120;
export const SYNC_JSON = 512 * 1024;
export const SYNC_IMAGE = 320 * 1024;
export const SYNC_MAX = 40;
export const SYNCED_FILE = '.synced';
const INDEX_HEAD = `# Bug reports from the board (D411)

Written by \`tools/bugs-sync.mjs\` on Justin's PC: one line a report, oldest first.
Each \`<id>.json\` is the report as ForgeCoach sent it (the game's position as that seat
saw it, its ask, the last frames of its log, console errors, build and settings),
trimmed to the last ${SYNC_FRAMES} frames; the whole report stays in \`var/bugs/\` on the PC.
\`<id>.jpg\` is a small screenshot, when one came.

`;

/** One line of text for a Markdown list item: no newlines, no link or code syntax. */
export function mdLine(s, max = 120) {
  return [...String(s ?? '').replace(/[\r\n\t]+/g, ' ').replace(/[`[\]|<>*_]/g, (c) => `\\${c}`).trim()].slice(0, max).join('');
}

/** INDEX.md's line for a report (as written to the branch). */
export function indexLine(r, hasImage) {
  const g = r.game && typeof r.game === 'object' ? r.game : null;
  const where = g ? [g.gameId ? `game ${mdLine(g.gameId, 60)}` : null, Number.isInteger(g.turn) ? `turn ${g.turn}` : null, g.phase ? mdLine(g.phase, 30) : null].filter(Boolean).join(' ') : '';
  const via = r.received?.via === 'room' ? `room ${mdLine(r.received.room, 20)} seat ${r.received.seat}` : mdLine(r.received?.via ?? '?', 20);
  const sev = r.severity ? `[${mdLine(r.severity, 10)}] ` : '';
  const surface = r.surface ? `${mdLine(r.surface, 20)} · ` : '';
  return `- \`${r.id}\` ${sev}${surface}**${mdLine(r.title)}**${where ? ` — ${where}` : ''} · via ${via} · [json](${r.id}.json)${hasImage ? ` · [screenshot](${r.id}.jpg)` : ''}`;
}

/**
 * The report as it goes to the branch: its log's frames cut to the last SYNC_FRAMES, then
 * older ones dropped until the JSON is at most SYNC_JSON bytes; the big screenshot's entry
 * replaced by a note.  Returns {text, kept, dropped}.
 */
export function compactForSync(report, { maxFrames = SYNC_FRAMES, maxBytes = SYNC_JSON } = {}) {
  const r = JSON.parse(JSON.stringify(report));
  const log = r.log && typeof r.log === 'object' && Array.isArray(r.log.frames) ? r.log : null;
  let dropped = 0;
  if (log && log.frames.length > maxFrames) { dropped += log.frames.length - maxFrames; log.frames = log.frames.slice(-maxFrames); }
  const sync = () => ({ framesKept: log ? log.frames.length : 0, framesDropped: dropped, whole: `var/bugs/${r.id}.json on the PC` });
  r.synced = sync();
  let text = JSON.stringify(r, null, 1);
  while (log && Buffer.byteLength(text) > maxBytes && log.frames.length > 0) {
    const cut = Math.max(1, Math.ceil(log.frames.length / 8));
    log.frames = log.frames.slice(cut);
    dropped += cut;
    r.synced = sync();
    text = JSON.stringify(r, null, 1);
  }
  if (Buffer.byteLength(text) > maxBytes) {
    // Still too large without frames: the console and the client's extra context go too.
    for (const k of ['console', 'extra', 'ask', 'input']) delete r[k];
    r.synced = { ...sync(), cut: 'console, extra, ask and input left out (too large)' };
    text = JSON.stringify(r, null, 1);
  }
  if (Buffer.byteLength(text) > maxBytes) {
    text = JSON.stringify({ id: r.id, kind: r.kind, schema: r.schema, title: r.title, details: String(r.details ?? '').slice(0, 4000), severity: r.severity, surface: r.surface, game: r.game, received: r.received, synced: { ...sync(), cut: 'only the summary fits' } }, null, 1);
  }
  return { text: text + '\n', kept: log ? log.frames.length : 0, dropped };
}

/** The small image to push for a report: its thumbnail, else its screenshot when small enough; null if none fits. */
export function imageFor(dir, report) {
  if (!BUG_ID.test(report?.id ?? '')) return null;
  for (const [k, name] of [['thumbnail', `${report.id}.thumb.jpg`], ['screenshot', `${report.id}.jpg`]]) {
    const e = report[k];
    if (!e || e.file !== name) continue;   // only a JPEG goes, under the name the store gave it
    const p = join(dir, e.file);
    try { if (statSync(p).size <= SYNC_IMAGE) return p; } catch { /* gone */ }
  }
  return null;
}

/** The ids var/bugs/.synced lists. */
export function syncedIds(dir) {
  try { return new Set(readFileSync(join(dir, SYNCED_FILE), 'utf8').split('\n').map((l) => l.trim()).filter((l) => BUG_ID.test(l))); } catch { return new Set(); }
}

/** Reports in `dir` not yet synced, oldest first: [{id, report}] (unreadable ones skipped with a note). */
export function pending(dir, notes = []) {
  const done = syncedIds(dir);
  const out = [];
  for (const id of bugFolder(dir).ids) {
    if (done.has(id)) continue;
    try {
      const report = JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8'));
      if (report?.id !== id) { notes.push(`${id}: its id does not match its file name; skipped`); continue; }
      out.push({ id, report });
    } catch (e) { notes.push(`${id}: unreadable (${e.message}); skipped`); }
  }
  return out;
}

function git(cwd, args, timeoutMs = 120_000) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND ?? 'ssh -o BatchMode=yes' };
  const r = spawnSync('git', args, { cwd, env, encoding: 'utf8', timeout: timeoutMs });
  return { code: r.status ?? (r.error ? 1 : 0), stdout: r.stdout ?? '', stderr: (r.stderr ?? '') + (r.error ? ` ${r.error.message}` : '') };
}

/**
 * Push `items` ([{id, report}]) to the branch.  Returns {pushed: [ids], skipped: [ids already there]}; throws on failure.
 * opts: { repo, dir, remote, branch, log }
 */
export function pushReports(items, { repo, dir, remote = 'origin', branch = 'pc-results', log = () => {} }) {
  if (!/^[A-Za-z0-9._-]+$/.test(remote) || !/^[A-Za-z0-9._/-]+$/.test(branch)) throw new Error('bad remote or branch name');
  if (branch === 'pc-jobs' || branch === 'main') throw new Error(`bugs-sync never writes ${branch}`);
  const tracking = `refs/remotes/${remote}/${branch}`;
  const work = join(repo, 'var', 'bugs-sync');
  mkdirSync(work, { recursive: true });
  const tmp = join(work, `wt-${process.pid}`);
  const must = (what, r) => { if (r.code !== 0) throw new Error(`${what} failed: ${r.stderr.trim().split('\n').at(-1) ?? ''}`); return r; };
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      must(`git fetch ${remote} ${branch}`, git(repo, ['fetch', '--quiet', remote, `+refs/heads/${branch}:${tracking}`]));
      rmSync(tmp, { recursive: true, force: true });
      git(repo, ['worktree', 'prune']);
      must('git worktree add', git(repo, ['worktree', 'add', '--quiet', '--detach', tmp, tracking]));
      const bdir = join(tmp, 'bugs');
      mkdirSync(bdir, { recursive: true });
      const indexFile = join(bdir, 'INDEX.md');
      if (!existsSync(indexFile)) writeFileSync(indexFile, INDEX_HEAD);
      const pushed = [];
      const skipped = [];
      for (const { id, report } of items) {
        if (existsSync(join(bdir, `${id}.json`))) { skipped.push(id); continue; }
        const { text } = compactForSync(report);
        writeFileSync(join(bdir, `${id}.json`), text);
        const img = imageFor(dir, report);
        if (img) copyFileSync(img, join(bdir, `${id}.jpg`));
        appendFileSync(indexFile, `${indexLine(report, !!img)}\n`);
        pushed.push(id);
      }
      if (!pushed.length) return { pushed, skipped };
      must('git add', git(tmp, ['add', 'bugs']));
      must('git commit', git(tmp, ['-c', 'user.name=forgecoach-bugs', '-c', 'user.email=runner@localhost', 'commit', '--quiet', '-m', `bugs: ${pushed.length} report${pushed.length === 1 ? '' : 's'} from the board (${pushed.join(', ')})`]));
      const p = git(tmp, ['push', '--quiet', remote, `HEAD:refs/heads/${branch}`]);
      if (p.code === 0) return { pushed, skipped };
      log(`bugs-sync: the push was refused (attempt ${attempt + 1}): ${p.stderr.trim().split('\n').at(-1) ?? ''}; fetching and trying again`);
      git(repo, ['worktree', 'remove', '--force', tmp]);
    }
    throw new Error(`the push to ${branch} was refused three times`);
  } finally {
    git(repo, ['worktree', 'remove', '--force', tmp]);
    rmSync(tmp, { recursive: true, force: true });
    git(repo, ['worktree', 'prune']);
  }
}

function parseArgs(argv) {
  const a = { push: false, ifNew: false, quiet: false, max: SYNC_MAX, dir: 'var/bugs', remote: 'origin', branch: 'pc-results' };
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i];
    const val = () => { if (i + 1 >= argv.length) throw new Error(`${f} needs a value`); return argv[++i]; };
    if (f === '--push') a.push = true;
    else if (f === '--if-new') a.ifNew = true;
    else if (f === '--quiet') a.quiet = true;
    else if (f === '--max') a.max = Number(val());
    else if (f === '--dir') a.dir = val();
    else if (f === '--remote') a.remote = val();
    else if (f === '--branch') a.branch = val();
    else if (f === '--help' || f === '-h') a.help = true;
    else throw new Error(`unknown flag ${f} (--help)`);
  }
  if (!Number.isInteger(a.max) || a.max < 1 || a.max > 200) throw new Error('--max must be 1-200');
  return a;
}

function main() {
  let a;
  try { a = parseArgs(process.argv.slice(2)); } catch (e) { console.error(`bugs-sync: ${e.message}`); process.exit(2); }
  if (a.help) {
    const src = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
    console.log(src.slice(4, src.findIndex((l) => l.startsWith('import '))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    return;
  }
  const repo = resolve('.');
  const dir = resolve(a.dir);
  const notes = [];
  const all = pending(dir, notes);
  for (const n of notes) console.error(`bugs-sync: ${n}`);
  if (!all.length) { if (!a.ifNew) console.log(`bugs-sync: nothing new in ${a.dir}`); return; }
  const items = all.slice(0, a.max);
  if (!a.push) {
    console.log(`bugs-sync: ${all.length} new report${all.length === 1 ? '' : 's'} in ${a.dir} (run with --push to send ${items.length === all.length ? 'them' : `the first ${items.length}`} to ${a.branch}):`);
    for (const { report } of items) console.log(`  ${indexLine(report, !!imageFor(dir, report))}`);
    return;
  }
  if (!a.quiet) console.log(`bugs-sync: sending ${items.length} report${items.length === 1 ? '' : 's'} to ${a.remote}/${a.branch} ...`);
  let r;
  try { r = pushReports(items, { repo, dir, remote: a.remote, branch: a.branch, log: (s) => console.error(s) }); } catch (e) {
    console.error(`bugs-sync: ${e.message}`);
    console.error(`bugs-sync: the reports are still in ${a.dir}; run \`node tools/bugs-sync.mjs --push\` from the repo root when the network (or git's credentials) is back`);
    process.exit(1);
  }
  const done = [...r.pushed, ...r.skipped];
  if (done.length) appendFileSync(join(dir, SYNCED_FILE), done.map((id) => `${id}\n`).join(''));
  console.log(`bugs-sync: ${r.pushed.length} report${r.pushed.length === 1 ? '' : 's'} on ${a.branch} under bugs/${r.pushed.length ? `: ${r.pushed.join(', ')}` : ''}${r.skipped.length ? ` (${r.skipped.length} already there)` : ''}${all.length > items.length ? `; ${all.length - items.length} more wait for the next run` : ''}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
