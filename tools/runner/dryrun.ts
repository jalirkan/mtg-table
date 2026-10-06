// mtg-table — the lab runner: `tools/runner.sh dry-run` (D397).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/runner.sh dry-run jobs/J096-queue-night-4.md --root ~/code/lab/mtg-table [--max-seconds 60]
//
// Runs a job's blocks the way the runner would ({workers}, the checkout paths, JOBS,
// LAB_CONTROL, the thread caps, `set -eo pipefail`, cwd the mtg-table checkout) but
// against a THROWAWAY view of the real data, and says which `check:` lines would pass.
// The point is to trip, in a minute, what the pilot did not: a tool's guard on an
// existing folder (J096, D341's version check), "Argument list too long" (J086), a path
// the lane does not have (J088), a `timeout 10h30m` (J093).
//
// Two sandboxes, chosen by --sandbox (auto: the first that works):
//
//   ns    a user + mount namespace (unshare -Urm; no root needed where the kernel allows
//         unprivileged user namespaces).  An overlayfs over the checkout and over the real
//         var/ it points to: every write lands in the scratch folder, the real tree is the
//         read-only lower layer and is never written.  The rest of the file system is
//         remounted read-only (but /tmp and the scratch folder), and each block runs in a
//         network namespace of its own with only loopback up: no push, no fetch, no port
//         clash with a bridge the real runner started.  The checkout may be the lane's own
//         clone: a different commit than the job pins is checked out (and built, unless
//         --no-build) INSIDE the overlay.  Here the `## Commands` blocks run too, each
//         stopped after --max-seconds: long enough for a tool to start, read its inputs and
//         refuse, never long enough to do the work.
//   none  no namespace (an unprivileged user namespace is refused, as on an Ubuntu with
//         apparmor_restrict_unprivileged_userns=1).  --root must then be a scratch checkout
//         (git worktree add ...) whose var/ the dry run builds itself: a folder of symlinks
//         to the real var/'s entries, except below the paths the job's blocks visibly write
//         (lint.ts's writeTargets: mkdir, redirects, --out, clean: ...), which are copied (a
//         file over --max-copy-mb is left out, and said).  A tool that writes somewhere the
//         lint cannot see writes through a symlink into the real var/, exactly as a pilot
//         on the PC does today; so here only the PILOT runs, never `## Commands`.
//
// What it is not: a run of the job.  A block stopped at --max-seconds proves only that it
// got that far; final checks after cut-short blocks are listed as what they would read,
// not as a verdict.  Memory (J087) shows only if a block reaches its peak in time.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluate, parse as parseExpr, type Verdict } from './expr.ts';
import { parseJobFile, type JobFile, type MetricSpec } from './jobfile.ts';
import { lintJob, lintText, writeTargets } from './lint.ts';
import { EXTRACTORS, flatten, place, type Flat } from './metrics.ts';
import { stderrGist, threadCaps, verdictText } from './runner.ts';

export interface DryRunOptions {
  file: string;
  /** The mtg-table checkout the blocks run in (cwd). */
  root: string;
  /** The real var/ (default: what <root>/var is or points to). */
  varDir: string | null;
  /** Where the overlay's writes, the scripts and the logs go (default: a new folder under the OS temp dir). */
  scratch: string | null;
  maxSeconds: number;
  workers: number;
  /** Run `## Commands` too: null = yes in the ns sandbox, no otherwise; true = refused without it. */
  commands: boolean | null;
  sandbox: 'auto' | 'ns' | 'none';
  keep: boolean;
  jobsDir: string | null;
  forgecoach: string | null;
  /** Build (./bridge/build.sh) after checking out the pinned commit inside the overlay. */
  build: boolean;
  /** none sandbox: copy files up to this size below the folders the job writes. */
  maxCopyMb?: number;
  /** Keep the host's network (no per-block network namespace). */
  network?: boolean;
  print?: (s: string) => void;
}

interface Spec extends Omit<DryRunOptions, 'print'> { mode: 'ns' | 'none'; scratch: string; realVar: string | null; pinned: string | null }

const HERE = path.dirname(fileURLToPath(import.meta.url));
const q = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;

/** A user + mount namespace with an overlayfs works here (a real test mount in a temp folder). */
export function namespaceWorks(tmp = os.tmpdir()): { ok: boolean; why: string } {
  const d = fs.mkdtempSync(path.join(tmp, 'runner-dry-probe-'));
  try {
    for (const x of ['lo', 'up', 'wk', 'mnt']) fs.mkdirSync(path.join(d, x));
    fs.writeFileSync(path.join(d, 'lo', 'f'), 'lower\n');
    const r = spawnSync('unshare', ['-Urm', 'sh', '-c',
      `mount -t overlay overlay -o lowerdir=${q(`${d}/lo`)},upperdir=${q(`${d}/up`)},workdir=${q(`${d}/wk`)} ${q(`${d}/mnt`)} && echo upper >> ${q(`${d}/mnt/f`)}`], { encoding: 'utf8', timeout: 20_000 });
    const lowerUntouched = fs.readFileSync(path.join(d, 'lo', 'f'), 'utf8') === 'lower\n';
    const upperWritten = fs.existsSync(path.join(d, 'up', 'f'));
    if (r.error) return { ok: false, why: `unshare: ${r.error.message}` };
    if (r.status !== 0) return { ok: false, why: (r.stderr || `unshare exited ${r.status}`).trim().split('\n').pop() as string };
    if (!lowerUntouched || !upperWritten) return { ok: false, why: 'the overlay did not keep the lower layer untouched' };
    return { ok: true, why: 'user + mount namespace with overlayfs' };
  } finally {
    spawnSync('rm', ['-rf', d]);
  }
}

/** {workers}, {mtg-table}, {ForgeCoach} and Justin's checkout paths, as the runner fills them (runner.ts substitute). */
export function fillFor(text: string, o: { workers: number; root: string; forgecoach: string | null }): string {
  let t = text.replace(/\{workers\}/g, String(o.workers)).split('{mtg-table}').join(o.root);
  if (o.forgecoach) t = t.split('{ForgeCoach}').join(o.forgecoach);
  t = t.replace(/(~|\$HOME|\$\{HOME\})\/code\/mtg-table(?![\w-])/g, o.root);
  if (o.forgecoach) t = t.replace(/(~|\$HOME|\$\{HOME\})\/code\/ForgeCoach(?![\w-])/g, o.forgecoach);
  return t;
}

function git(dir: string, ...a: string[]): string {
  const r = spawnSync('git', ['-C', dir, ...a], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
}

/** The outer step: the lint, the sandbox, then the inner run (in the namespace, or here). Returns the exit code. */
export function dryRun(o: DryRunOptions): number {
  const print = o.print ?? ((s: string) => process.stdout.write(`${s}\n`));
  const job = parseJobFile(o.file, fs.readFileSync(o.file, 'utf8'), parseExpr);
  const root = path.resolve(o.root);
  if (!fs.existsSync(root)) { print(`dry run: no checkout at ${root}`); return 2; }
  const own = fs.existsSync(path.join(root, 'var')) ? fs.realpathSync(path.join(root, 'var')) : null;
  const realVarRaw = o.varDir ? fs.realpathSync(path.resolve(o.varDir)) : own;
  print(`dry run: ${job.id} ${job.title}`);
  if (job.errors.length) { print(`job file ERRORS:\n  ${job.errors.join('\n  ')}`); return 1; }
  const found = lintJob(job, { jobsDir: o.jobsDir, varDir: realVarRaw });
  print(lintText(found).trimEnd());

  let mode: 'ns' | 'none' = 'none';
  if (o.sandbox !== 'none') {
    const p = namespaceWorks();
    if (p.ok) mode = 'ns';
    else if (o.sandbox === 'ns') { print(`sandbox: --sandbox ns, but ${p.why}`); return 2; }
    else print(`sandbox: no namespace (${p.why}); falling back to --sandbox none`);
  }
  const scratch = path.resolve(o.scratch ?? fs.mkdtempSync(path.join(os.tmpdir(), `runner-dry-${job.id}-`)));
  fs.mkdirSync(scratch, { recursive: true });
  for (const [what, p] of [['the checkout', root], ['the real var/', realVarRaw]] as const) {
    if (p && (scratch === p || scratch.startsWith(`${p}/`))) { print(`dry run: the scratch folder ${scratch} is inside ${what} (${p}); give --scratch elsewhere`); return 2; }
  }
  if (mode === 'ns' && own && realVarRaw !== own) { print(`dry run: ${root}/var is ${own}, not --var ${realVarRaw}: give --var only for a checkout with no var/ (or the one it points to)`); return 2; }
  const pin = job.repos.find((r) => r.repo === 'mtg-table')?.ref ?? null;
  const pinned = pin ? (git(root, 'rev-parse', '-q', '--verify', `origin/${pin}^{commit}`) || git(root, 'rev-parse', '-q', '--verify', `${pin}^{commit}`) || null) : null;
  if (pin && !pinned) print(`checkout: the job pins mtg-table@${pin}, which ${root} does not have${mode === 'ns' ? ' (fetched inside the overlay)' : ''}`);
  const spec: Spec = { ...o, root, scratch, mode, realVar: realVarRaw, pinned: pinned ?? (pin && mode === 'ns' ? pin : null) };
  delete (spec as Partial<DryRunOptions>).print;
  fs.writeFileSync(path.join(scratch, 'spec.json'), JSON.stringify(spec, null, 1));
  let rc: number;
  if (mode === 'ns') {
    const r = spawnSync('unshare', ['-Urm', '--', process.execPath, path.join(HERE, 'cli.ts'), 'dry-run-inner', path.join(scratch, 'spec.json')], { stdio: 'inherit' });
    rc = r.status ?? 1;
  } else {
    rc = dryRunInner(path.join(scratch, 'spec.json'), print);
  }
  if (found.some((f) => f.severity === 'error') && rc === 0) rc = 1;
  if (!o.keep) spawnSync('rm', ['-rf', scratch]);
  else print(`kept: ${scratch} (the scripts, the logs${mode === 'ns' ? ', and the overlay\'s upper layers: everything the blocks wrote' : ''})`);
  return rc;
}

// ------------------------------------------------------------------ inside the sandbox

function sh(cmd: string[], print: (s: string) => void, quiet = false): boolean {
  const r = spawnSync(cmd[0] as string, cmd.slice(1), { encoding: 'utf8' });
  if (r.status !== 0 && !quiet) print(`  ${cmd.join(' ')}: ${(r.stderr || r.error?.message || `exit ${r.status}`).trim().split('\n').pop()}`);
  return r.status === 0;
}

/** The mount points of this namespace (mountinfo's fifth field), octal escapes decoded. */
function mountPoints(): string[] {
  return fs.readFileSync('/proc/self/mountinfo', 'utf8').split('\n').filter(Boolean)
    .map((l) => (l.split(' ')[4] ?? '').replace(/\\(\d{3})/g, (_, o: string) => String.fromCharCode(parseInt(o, 8))));
}

const inside = (p: string, dir: string): boolean => p === dir || p.startsWith(dir === '/' ? '/' : `${dir}/`);

/** ns: binds, overlays and read-only remounts; returns lines for the report. */
function setupNamespace(s: Spec, print: (l: string) => void): { ok: boolean; lines: string[] } {
  const lines: string[] = [];
  // 1. the writable places, as mounts of their own, parents first (a later bind of a parent would hide them)
  const rw = ['/tmp', '/var/tmp', '/dev/shm', s.scratch].filter((p) => fs.existsSync(p)).sort((a, b) => a.length - b.length);
  for (const p of rw) if (!sh(['mount', '--bind', p, p], print)) return { ok: false, lines };
  // 2. the overlays: the checkout, the real var/ when it lies outside it, the ForgeCoach checkout
  const overlay = (name: string, dir: string): boolean => {
    const up = path.join(s.scratch, 'upper', name), wk = path.join(s.scratch, 'work', name);
    fs.mkdirSync(up, { recursive: true }); fs.mkdirSync(wk, { recursive: true });
    const ok = sh(['mount', '-t', 'overlay', 'overlay', '-o', `lowerdir=${dir},upperdir=${up},workdir=${wk}`, dir], print);
    if (ok) lines.push(`overlay: ${dir} (writes go to ${up})`);
    return ok;
  };
  if (!overlay('checkout', s.root)) return { ok: false, lines };
  const varLink = path.join(s.root, 'var');
  if (!fs.existsSync(varLink) && s.realVar) fs.symlinkSync(s.realVar, varLink);
  const v = fs.existsSync(varLink) ? fs.realpathSync(varLink) : null;
  if (v && !inside(v, s.root)) { if (!overlay('var', v)) return { ok: false, lines }; }
  else if (v) lines.push(`var/: inside the checkout's overlay (${v})`);
  else lines.push('var/: none (the blocks see no var/)');
  if (s.forgecoach && fs.existsSync(s.forgecoach) && !overlay('forgecoach', path.resolve(s.forgecoach))) return { ok: false, lines };
  // 3. everything else read-only (best effort: a mount that refuses is named)
  const mine = new Set([...rw, s.root, v ?? '', s.forgecoach ? path.resolve(s.forgecoach) : ''].filter(Boolean));
  const skip = (m: string): boolean => /^\/(proc|sys|dev)(\/|$)/.test(m) || [...mine].some((x) => inside(m, x));
  const refused: string[] = [];
  for (const m of [...new Set(mountPoints())]) if (!skip(m) && !sh(['mount', '-o', 'remount,bind,ro', m], print, true)) refused.push(m);
  lines.push(refused.length ? `read-only: every other mount but ${refused.slice(0, 5).join(', ')}${refused.length > 5 ? ', ...' : ''} (those refused the remount)` : 'read-only: every other mount (but /tmp, /var/tmp, /dev/shm and the scratch folder)');
  return { ok: true, lines };
}

/** none: build <root>/var as symlinks to the real var/'s entries, copies below the folders the job writes. */
export function linkVar(root: string, realVar: string, job: JobFile, maxCopyMb: number): string[] {
  const lines: string[] = [];
  const dest = path.join(root, 'var');
  const MARK = '.runner-dry-run-var';
  if (fs.existsSync(dest) || fs.lstatSync(dest, { throwIfNoEntry: false })) {
    if (!fs.existsSync(path.join(dest, MARK))) throw new Error(`${dest} exists: --sandbox none builds its own var/ there; give a scratch checkout (git worktree add <dir> <sha>) whose var/ is absent`);
    spawnSync('rm', ['-rf', dest]);
  }
  const written = writeTargets(job).map((t) => t.path).filter((p) => p.startsWith('var/')).map((p) => p.slice(4));
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, MARK), 'built by tools/runner.sh dry-run --sandbox none: symlinks to the real var/ and copies\n');
  let copied = 0, skipped = 0, links = 0;
  const copyTree = (from: string, to: string): void => {
    const st = fs.lstatSync(from);
    if (st.isDirectory()) { fs.mkdirSync(to, { recursive: true }); for (const e of fs.readdirSync(from)) copyTree(path.join(from, e), path.join(to, e)); return; }
    if (st.isSymbolicLink()) { fs.symlinkSync(fs.readlinkSync(from), to); return; }
    if (st.size > maxCopyMb * 1024 * 1024) { skipped++; return; }
    fs.copyFileSync(from, to, fs.constants.COPYFILE_FICLONE); copied++;
  };
  const walk = (rel: string): void => {
    const real = path.join(realVar, rel);
    for (const e of fs.readdirSync(real)) {
      const r = rel ? `${rel}/${e}` : e;
      const to = path.join(dest, r);
      const isWritten = written.some((w) => w === r || r.startsWith(`${w}/`));
      const holdsWritten = written.some((w) => w.startsWith(`${r}/`));
      const st = fs.lstatSync(path.join(real, e));
      if (isWritten) copyTree(path.join(real, e), to);
      else if (holdsWritten && st.isDirectory()) { fs.mkdirSync(to, { recursive: true }); walk(r); }
      else { fs.symlinkSync(path.join(real, e), to); links++; }
    }
  };
  walk('');
  lines.push(`var/: ${links} symlink(s) into ${realVar} (read through), ${copied} file(s) copied below the folders the job writes (${written.length ? written.slice(0, 4).map((w) => `var/${w}`).join(', ') + (written.length > 4 ? ', ...' : '') : 'none'})${skipped ? `, ${skipped} file(s) over ${maxCopyMb} MB left out` : ''}`);
  return lines;
}

interface BlockResult { name: string; rc: number; seconds: number; cut: boolean; tail: string }

function runBlock(s: Spec, job: JobFile, name: string, text: string, print: (l: string) => void): BlockResult {
  const script = path.join(s.scratch, `${name}.sh`);
  const log = path.join(s.scratch, `${name}.log`);
  fs.writeFileSync(script, `#!/usr/bin/env bash\n# dry run: ${job.id} ${name} (generated from ${s.file})\nset -eo pipefail\ncd ${q(s.root)}\n${fillFor(text, s)}\n`);
  const control = path.join(s.scratch, 'control.json');
  fs.writeFileSync(control, JSON.stringify({ paused: false, maxWorkers: s.workers }));
  const cache = path.join(s.scratch, 'cache');
  fs.mkdirSync(cache, { recursive: true });
  const env = {
    ...process.env, JOBS: String(s.workers), LAB_WORKERS: String(s.workers), LAB_CONTROL: control, LAB_JOB: job.id, LAB_STEP: name, LAB_DRY_RUN: '1',
    MTG_TABLE: s.root, ...(s.forgecoach ? { FORGECOACH: s.forgecoach } : {}), ...threadCaps(s.workers),
    XDG_CACHE_HOME: cache, PYTHONPYCACHEPREFIX: path.join(cache, 'pycache'), MPLCONFIGDIR: path.join(cache, 'mpl'), npm_config_cache: path.join(cache, 'npm'),
  };
  // A network namespace of its own, loopback up (ip, else Python's ioctl): no push, no fetch, no port clash.
  const LO_UP = `ip link set lo up 2>/dev/null || python3 -c 'import socket,fcntl,struct;s=socket.socket();f=struct.unpack("16sH",fcntl.ioctl(s,0x8913,struct.pack("16sH",b"lo",0)))[1];fcntl.ioctl(s,0x8914,struct.pack("16sH",b"lo",f|1))' 2>/dev/null || true`;
  const inner = s.mode === 'ns' && !s.network ? ['unshare', '-n', 'bash', '-c', `${LO_UP}; exec bash ${q(script)}`] : ['bash', script];
  const t0 = Date.now();
  const fd = fs.openSync(log, 'w');
  const r = spawnSync('timeout', ['-k', '10', String(s.maxSeconds), ...inner], { cwd: s.root, env, stdio: ['ignore', fd, fd] });
  fs.closeSync(fd);
  const seconds = Math.round((Date.now() - t0) / 1000);
  const rc = r.status ?? (r.signal ? 128 : 1);
  const cut = rc === 124 || rc === 137;
  const tail = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).slice(-12).join('\n');
  print(`${name}: ${rc === 0 ? `ok in ${seconds} s` : cut ? `stopped at ${s.maxSeconds} s with no error before it` : `FAILED: exit ${rc} after ${seconds} s`}`);
  if (rc !== 0 && !cut && tail) print(tail.split('\n').map((l) => `   | ${l}`).join('\n'));
  return { name, rc, seconds, cut, tail };
}

function metricsHere(s: Spec, specs: MetricSpec[], errors: string[]): Flat {
  const out: Flat = {};
  for (const m of specs) {
    try {
      if (m.kind === 'sh') {
        const r = spawnSync('bash', ['-c', fillFor(m.command ?? '', s)], { cwd: s.root, encoding: 'utf8', timeout: Math.max(30, s.maxSeconds) * 1000 });
        if (r.status !== 0) throw new Error(`exit ${r.status}: ${stderrGist(r.stderr ?? '')}`);
        const v = JSON.parse(r.stdout.trim()) as unknown;
        place(m.name, typeof v === 'number' ? v : flatten(v), out);
      } else {
        const ex = EXTRACTORS[m.kind];
        if (!ex) throw new Error(`no extractor called ${m.kind}`);
        place(m.name, ex(s.root, m.args.map((a) => fillFor(a, s))), out);
      }
    } catch (e) {
      out.metrics_errors = (typeof out.metrics_errors === 'number' ? out.metrics_errors : 0) + 1;
      errors.push(`metrics: ${m.line}: ${(e as Error).message}`);
    }
  }
  return out;
}

/** The inner step (in the namespace for ns, in-process for none): returns the exit code. */
export function dryRunInner(specFile: string, print: (s: string) => void = (s) => process.stdout.write(`${s}\n`)): number {
  const s = JSON.parse(fs.readFileSync(specFile, 'utf8')) as Spec;
  const job = parseJobFile(s.file, fs.readFileSync(s.file, 'utf8'), parseExpr);
  const runCommands = s.commands ?? s.mode === 'ns';
  if (s.mode === 'ns') {
    const ns = setupNamespace(s, print);
    print(`sandbox: user + mount namespace; ${s.network ? 'the host\'s network' : 'each block in a network namespace of its own (loopback only)'}`);
    for (const l of ns.lines) print(`  ${l}`);
    if (!ns.ok) { print('sandbox: could not be set up; nothing ran'); return 2; }
    const head = git(s.root, 'rev-parse', 'HEAD');
    if (s.pinned && head !== s.pinned && !head.startsWith(s.pinned)) {
      print(`checkout: ${head.slice(0, 7)} -> the job's ${s.pinned.slice(0, 7)} (inside the overlay)`);
      if (!git(s.root, 'rev-parse', '-q', '--verify', `${s.pinned}^{commit}`)) sh(['git', '-C', s.root, 'fetch', '--quiet', 'origin', '+refs/heads/*:refs/remotes/origin/*'], print);
      const sha = git(s.root, 'rev-parse', '-q', '--verify', `origin/${s.pinned}^{commit}`) || git(s.root, 'rev-parse', '-q', '--verify', `${s.pinned}^{commit}`);
      if (!sha || !sh(['git', '-C', s.root, 'checkout', '--quiet', '--force', '--detach', sha], print)) { print('checkout: failed; nothing ran'); return 2; }
      if (s.build && fs.existsSync(path.join(s.root, 'bridge', 'build.sh'))) {
        const b = spawnSync('bash', ['-c', `cd ${q(s.root)} && ./bridge/build.sh`], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 20 * 60_000 });
        print(`build: ./bridge/build.sh ${b.status === 0 ? 'ok' : `FAILED (exit ${b.status}): ${stderrGist(b.stderr ?? '')}`}`);
        if (b.status !== 0) return 2;
      }
    } else print(`checkout: ${head.slice(0, 7)}${s.pinned ? ' (the commit the job pins)' : ''}`);
  } else {
    print('sandbox: none (no namespace): the PILOT runs, never ## Commands; outside var/ nothing is protected');
    if (s.realVar) {
      try { for (const l of linkVar(s.root, s.realVar, job, s.maxCopyMb ?? 64)) print(`  ${l}`); } catch (e) { print(`  ${(e as Error).message}`); return 2; }
    } else print('  var/: none (no --var and no var/ in the checkout)');
    const head = git(s.root, 'rev-parse', 'HEAD');
    if (s.pinned && head && !head.startsWith(s.pinned)) print(`WARNING checkout: ${head.slice(0, 7)} is not the commit the job pins (${s.pinned.slice(0, 7)}): check that one out in the scratch checkout`);
    if (s.commands === true) print('commands: refused without a namespace (a tool could write through a symlink into the real var/); pilot only');
  }

  const summary: string[] = [];
  let failed = false;
  print(`pilot (each block stopped after ${s.maxSeconds} s, {workers} = ${s.workers}):`);
  let pilotCut = false;
  for (const [k, b] of (job.pilot?.blocks ?? []).entries()) {
    const r = runBlock(s, job, `pilot${k + 1}`, b, print);
    if (r.cut) pilotCut = true;
    if (r.rc !== 0 && !r.cut) { failed = true; summary.push(`pilot${k + 1} exited ${r.rc}`); break; }
  }
  const errs: string[] = [];
  const pm = metricsHere(s, [...job.metrics, ...(job.pilot?.metrics ?? [])], errs);
  for (const e of errs) print(`  ${e}`);
  const pv: Verdict[] = (job.pilot?.checks ?? []).map((c) => evaluate(c, pm));
  print(`pilot checks${pilotCut ? ' (a pilot block was cut short: what it had written by then)' : ''}:`);
  print(verdictText(pv).trimEnd().replace(/^/gm, '  '));
  const bad = pv.filter((v) => v.result !== true);
  if (!failed && bad.length) summary.push(`${bad.length} pilot check(s) would not pass`);

  if (runCommands && s.mode === 'ns' && !failed) {
    print(`commands (each block stopped after ${s.maxSeconds} s: enough to start, read its inputs and refuse):`);
    let cut = false;
    let ranAll = true;
    for (const [k, b] of (job.commands?.blocks ?? []).entries()) {
      const r = runBlock(s, job, `run${k + 1}`, b, print);
      if (r.cut) cut = true;
      if (r.rc !== 0 && !r.cut) { failed = true; ranAll = false; summary.push(`run${k + 1} exited ${r.rc}`); break; }
    }
    const ferrs: string[] = [];
    const fm = metricsHere(s, [...job.metrics, ...(job.commands?.metrics ?? [])], ferrs);
    print(`final checks over what the cut-short blocks wrote (${!ranAll ? 'NOT a verdict: a block failed' : cut ? 'NOT a verdict: the blocks did not finish' : 'every block finished'}):`);
    print(verdictText((job.commands?.checks ?? []).map((c) => evaluate(c, fm))).trimEnd().replace(/^/gm, '  '));
    for (const e of ferrs) print(`  ${e}`);
  } else if (!runCommands) print('commands: not run (--pilot-only, or no namespace)');

  const lintBad = lintJob(job, { jobsDir: s.jobsDir, varDir: s.realVar, syntax: false }).some((f) => f.severity === 'error');
  if (failed || bad.length || lintBad) {
    print(`dry run: WOULD FAIL${summary.length ? `: ${summary.join('; ')}` : ''}${lintBad ? `${summary.length ? '; ' : ': '}lint errors above` : ''}`);
    return 1;
  }
  print(`dry run: no failure seen (pilot checks pass${runCommands && s.mode === 'ns' ? `; every commands block ran ${s.maxSeconds} s or finished without an error` : ''})`);
  return 0;
}
