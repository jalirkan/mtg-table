// mtg-table — the lab runner: the job lint (D397).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// `tools/runner.sh check <job.md>` runs it after the parse; `tools/runner.sh lint
// <job.md>...` runs it over many files; `dry-run` (dryrun.ts) runs it first.  Every
// rule comes from a job that failed on the PC for a reason a reader of the job file
// could have seen (pc-results, results/J070-J096; the outside review's §4):
//
//   timeout-duration   `timeout 10h30m` (J093): GNU timeout and sleep take ONE number with one
//                      unit (s, m, h, d); `10h30m` is "invalid time interval" at once.
//   argmax-glob        `$(ls -d var/cubelab/queue/normal/*/games/*)` (J086): an unquoted glob two or
//                      more folders deep, passed to a program (not a builtin such as printf or for),
//                      grows with every night until execve fails with "Argument list too long".
//                      With --var, the glob is expanded over the real data and its size compared
//                      with ARG_MAX.
//   light-var          a `cpu: light` job whose blocks or metrics read var/: before D392 the light
//                      lane had a var/ of its own, empty (J088, J090).  A warning: since D392 it is
//                      lane 1's.
//   metric-self-count  a metric that counts files in a folder the job's own blocks write into (a
//                      redirect, tee, mkdir, cp, --out ..., or a clean: / collect: path): the count
//                      includes the job's own output (J084's 44 against 45; J082's newKinds).
//   after-missing      `after:` naming a job with no file in the jobs folder (--jobs-dir): the
//                      runner waits on it for ever, or a typo goes past the order it meant.
//   placeholder-id     `J0XX`, `J###`, `followup: -`, `repos: mtg-table@<sha>`: a placeholder left in;
//                      after: drops anything that is not J + digits without a word.
//   bash-syntax        `bash -n` on every block and every `metrics: sh:` line, and a here-document
//                      that never ends.
//   python-syntax      Python's own compile() on every here-document fed to python (or written to a
//                      .py file, or delimited PY) and every `python3 -c '...'` whose text is literal.
//
// What it cannot see, the dry run (dryrun.ts) is for: a guard in a tool that refuses an existing
// folder (J096, D341's version check), a dataset bigger than a memory cap (J087), a path missing
// in a lane (J088).  A lint finding names the rule, the block (pilot1, run2 -- the runner's step
// names) and the line inside it.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import type { JobFile, MetricSpec } from './jobfile.ts';
import { expandGlob } from './metrics.ts';
import { BUILTINS, commandName, nameIndex, resolver, scanShell, type Scan, type Word } from './shscan.ts';

export type Severity = 'error' | 'warning';
export type RuleId = 'timeout-duration' | 'argmax-glob' | 'light-var' | 'metric-self-count' | 'after-missing' | 'placeholder-id' | 'bash-syntax' | 'python-syntax';

export const LINT_RULES: Record<RuleId, string> = {
  'timeout-duration': 'timeout / sleep durations GNU accepts: one number, one unit (s m h d)',
  'argmax-glob': 'an unquoted glob two or more folders deep passed to a program (ARG_MAX)',
  'light-var': 'a cpu: light job that reads var/ (warning; the light lane shares lane 1\'s var/ since D392)',
  'metric-self-count': 'a metric that counts files in a folder the job\'s own blocks write into',
  'after-missing': 'after: names a job with no file in the jobs folder (--jobs-dir)',
  'placeholder-id': 'a placeholder id or ref (J0XX, J###, followup: -, @<sha>)',
  'bash-syntax': 'bash -n on every block and metrics sh: line; here-documents that never end',
  'python-syntax': 'compile() on every Python here-document and literal python3 -c',
};

export interface Finding { rule: RuleId; severity: Severity; where: string; message: string }

export interface LintOptions {
  /** The pc-jobs jobs/ folder: after: targets must have a file there. */
  jobsDir?: string | null;
  /** The real var/ (a lane's): globs are expanded over it and measured against ARG_MAX. */
  varDir?: string | null;
  /** ARG_MAX in bytes (default: getconf ARG_MAX, else 2 MiB). */
  argMax?: number;
  /** Run bash -n and Python's compile (default true; tests of other rules may turn them off). */
  syntax?: boolean;
  bash?: string;
  python?: string;
}

/** The job's shell texts: each block (the runner's step names) and each metrics sh: line. */
export interface ShellUnit { where: string; text: string; kind: 'block' | 'metric'; phase: 'pilot' | 'commands' | 'header'; metric?: MetricSpec }

/** {workers} and the checkout placeholders as the runner fills them (a fixed stand-in: the lint never runs anything). */
export function fillPlaceholders(t: string): string {
  return t.replace(/\{workers\}/g, '2').replace(/\{logs\}/g, 'var/runner/jobs/J000/*.log').replace(/\{mtg-table\}/g, '/lab/mtg-table').replace(/\{ForgeCoach\}/g, '/lab/ForgeCoach');
}

export function shellUnits(job: JobFile): ShellUnit[] {
  const out: ShellUnit[] = [];
  (job.pilot?.blocks ?? []).forEach((b, k) => out.push({ where: `pilot${k + 1}`, text: fillPlaceholders(b), kind: 'block', phase: 'pilot' }));
  (job.commands?.blocks ?? []).forEach((b, k) => out.push({ where: `run${k + 1}`, text: fillPlaceholders(b), kind: 'block', phase: 'commands' }));
  const metric = (m: MetricSpec, phase: ShellUnit['phase']): void => {
    if (m.kind === 'sh') out.push({ where: `metrics ${m.name ?? '(unnamed)'}`, text: fillPlaceholders(m.command ?? ''), kind: 'metric', phase, metric: m });
  };
  for (const m of job.metrics) metric(m, 'header');
  for (const m of job.pilot?.metrics ?? []) metric(m, 'pilot');
  for (const m of job.commands?.metrics ?? []) metric(m, 'commands');
  return out;
}

// ------------------------------------------------------------------ durations

/** A duration GNU timeout / sleep accept: a (floating) number and at most one unit; or inf. */
export function gnuDuration(s: string): boolean {
  return /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?[smhd]?$/.test(s) || /^inf(inity)?$/i.test(s);
}

function timeoutFindings(u: ShellUnit, sc: Scan, add: (f: Omit<Finding, 'rule'>) => void): void {
  const res = resolver(sc.cmds);
  for (const c of sc.cmds) {
    const k = nameIndex(c.words);
    if (k < 0) continue;
    const name = ((c.words[k] as Word).text.split('/').pop() ?? '');
    const ws = c.words.slice(k + 1).map((w) => res(w, c));
    const check = (w: Word | undefined, what: string): void => {
      if (!w || w.dynamic) return;
      if (!gnuDuration(w.text)) {
        const fix = /^\d+[hms]\d+[ms]?$/.test(w.text) ? ` (write it in one unit: ${toOneUnit(w.text)})` : '';
        add({ severity: 'error', where: `${u.where} line ${c.line}`, message: `${what} "${w.text}" is not a duration GNU ${name} accepts: one number and one unit (s, m, h, d)${fix}` });
      }
    };
    if (name === 'timeout') {
      let j = 0;
      while (j < ws.length) {
        const t = (ws[j] as Word).text;
        if (t === '-s' || t === '--signal') { j += 2; continue; }
        if (t === '-k' || t === '--kill-after') { check(ws[j + 1], 'timeout -k'); j += 2; continue; }
        if (/^--kill-after=/.test(t)) { check({ ...(ws[j] as Word), text: t.slice('--kill-after='.length) }, 'timeout --kill-after'); j++; continue; }
        if (/^-k./.test(t)) { check({ ...(ws[j] as Word), text: t.slice(2) }, 'timeout -k'); j++; continue; }
        if (/^-/.test(t) && t !== '-') { j++; continue; }      // --signal=TERM, -sTERM, --preserve-status, --foreground, -v
        break;
      }
      check(ws[j], 'timeout');
    } else if (name === 'sleep') {
      for (const w of ws) if (!/^-/.test(w.text)) check(w, 'sleep');
    }
  }
}

/** `10h30m` -> `630m`; `1h30` -> `90m`. */
export function toOneUnit(s: string): string {
  const m = /^(\d+)([hms])(\d+)([ms]?)$/.exec(s);
  if (!m) return s;
  const secs = (n: number, u: string): number => n * (u === 'h' ? 3600 : u === 'm' ? 60 : 1);
  const second = m[4] || (m[2] === 'h' ? 'm' : 's');
  const total = secs(Number(m[1]), m[2] as string) + secs(Number(m[3]), second);
  return total % 3600 === 0 ? `${total / 3600}h` : total % 60 === 0 ? `${total / 60}m` : `${total}s`;
}

// ------------------------------------------------------------------ globs

/** Segments of a glob pattern (`\*` is literal) that hold a wildcard. */
export function wildSegments(pattern: string): number {
  return pattern.split('/').filter((seg) => /(^|[^\\])[*?[]/.test(seg)).length;
}

/** A glob pattern (`\*` literal; `*`, `?`, `[...]` wild within one segment) as a RegExp over a whole path. */
export function globRe(pattern: string, slashWild = false): RegExp {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i] as string;
    if (c === '\\' && i + 1 < pattern.length) { re += (pattern[++i] as string).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'); continue; }
    if (c === '*') { re += slashWild ? '.*' : '[^/]*'; if (pattern[i + 1] === '*') i++; continue; }
    if (c === '?') { re += slashWild ? '.' : '[^/]'; continue; }
    if (c === '[') {
      const e = pattern.indexOf(']', i + 2);
      if (e > 0) { re += `[${pattern.slice(i + 1, e).replace(/^!/, '^').replace(/\\/g, '\\\\')}]`; i = e; continue; }
    }
    re += c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

let argMaxCache: number | null = null;
export function argMax(): number {
  if (argMaxCache !== null) return argMaxCache;
  const r = spawnSync('getconf', ['ARG_MAX'], { encoding: 'utf8' });
  const n = Number(r.stdout?.trim());
  argMaxCache = Number.isFinite(n) && n > 0 ? n : 2 * 1024 * 1024;
  return argMaxCache;
}

/** The glob over the real data: the paths and their bytes on an argv (each path and its NUL). */
export function measureGlob(pattern: string, varDir: string): { paths: number; bytes: number } | null {
  const m = /^(?:\.\/)?var\/(.*)$/.exec(pattern);
  if (!m) return null;
  // expandGlob treats * and ? as wild and [ ] as literal; an escaped char is literal.
  const rest = (m[1] as string).replace(/\\(.)/g, '$1');
  const found = expandGlob(varDir, rest);
  let bytes = 0;
  for (const f of found) bytes += `var/${path.relative(varDir, f)}`.length + 1;
  return { paths: found.length, bytes };
}

function argmaxFindings(u: ShellUnit, sc: Scan, opts: LintOptions, targets: Target[], add: (f: Omit<Finding, 'rule'>) => void): void {
  const res = resolver(sc.cmds);
  for (const c of sc.cmds) {
    const k = nameIndex(c.words);
    if (k < 0) continue;
    const name = commandName(c);
    if (BUILTINS.has(name)) continue;
    for (const raw of c.words.slice(k + 1)) {
      const w = res(raw, c);
      if (!w.glob || !w.pattern.includes('/')) continue;
      const deep = wildSegments(w.pattern);
      const last = w.pattern.split('/').pop() ?? '';
      const measured = opts.varDir ? measureGlob(w.pattern, opts.varDir) : null;
      const limit = opts.argMax ?? argMax();
      const where = `${u.where} line ${c.line}`;
      const fix = `list it with a builtin or find instead (printf '%s\\n' ${w.text} | ..., or find ... -print), never as a program's arguments`;
      // A tree this job makes (mkdir, --out, clean:) is as big as the job makes it; one it only reads
      // (the queue, the runs of earlier jobs) grows with every night until execve refuses it.
      const base = normPath(globBase(w.pattern));
      const own = base !== null && targets.some((t) => t.kind === 'dir' && (base === t.path || under(base, t.path)));
      const today = measured ? ` (on the real data today: ${measured.paths} paths, ${Math.round(measured.bytes / 1024)} KiB)` : '';
      if (measured && measured.bytes > limit / 2) {
        add({ severity: 'error', where, message: `\`${name} ... ${w.text}\`${c.inSubst ? ' (in a command substitution)' : ''}: the glob expands to ${measured.paths} paths, ${Math.round(measured.bytes / 1024)} KiB on the real data -- over half of ARG_MAX (${Math.round(limit / 1024)} KiB): "Argument list too long". ${fix}` });
      } else if (deep >= 2 && own) {
        add({ severity: 'warning', where, message: `\`${name} ... ${w.text}\`: an unquoted glob ${deep} folders deep, passed to a program, over ${base}, a tree this job makes: as long as the job's own output stays small it fits ARG_MAX${today}; ${fix}` });
      } else if (deep >= 2 && /(^|[^\\])[*?[]/.test(last)) {
        add({ severity: 'error', where, message: `\`${name} ... ${w.text}\`${c.inSubst ? ' (in a command substitution)' : ''}: an unquoted glob ${deep} folders deep over data this job does not make is passed to a program; every night adds to it until execve fails with "Argument list too long" (J086)${today}. ${fix}` });
      } else if (deep >= 2) {
        add({ severity: 'warning', where, message: `\`${name} ... ${w.text}\`: an unquoted glob ${deep} folders deep passed to a program; it ends in a fixed name, so it grows by folders, not files -- check it stays small${today}` });
      }
    }
  }
}

// ------------------------------------------------------------------ what the job writes, what a metric counts

export interface Target { path: string; kind: 'file' | 'dir'; from: string }

/** `./a//b/` -> `a/b`; null for an absolute path, an unresolved variable or a home path. */
export function normPath(p: string): string | null {
  if (!p || /[$`~]/.test(p) || p.startsWith('/') || p === '-') return null;
  const n = path.posix.normalize(p).replace(/\/+$/, '').replace(/^\.\//, '');
  return n === '.' || n.startsWith('..') ? null : n;
}

const OUT_FLAGS = new Set(['--out', '--out-dir', '--outdir', '--output', '--output-dir', '-o', '--dest', '--save', '--model-out', '--report']);
const looksFile = (p: string): boolean => /\.[A-Za-z0-9]{1,8}$/.test(path.basename(p));
/** The literal folder a glob starts from: `var/a/*\/b` -> `var/a`. */
const globBase = (pattern: string): string => {
  const segs = pattern.split('/');
  const k = segs.findIndex((s) => /(^|[^\\])[*?[]/.test(s));
  return segs.slice(0, k < 0 ? segs.length : k).join('/').replace(/\\(.)/g, '$1');
};

/** Paths the job's blocks write, and its clean: and collect: paths. */
export function writeTargets(job: JobFile): Target[] {
  const out: Target[] = [];
  const push = (p: string | null, kind: Target['kind'] | null, from: string): void => {
    const n = p === null ? null : normPath(p);
    if (n) out.push({ path: n, kind: kind ?? (looksFile(n) ? 'file' : 'dir'), from });
  };
  for (const u of shellUnits(job).filter((x) => x.kind === 'block')) {
    const sc = scanShell(u.text);
    const res = resolver(sc.cmds);
    for (const c of sc.cmds) {
      const at = `${u.where} line ${c.line}`;
      for (const r of c.redirects) if (/>/.test(r.op) && !/&$/.test(r.op) && !/^\d+$/.test(r.target.text)) { const t = res(r.target, c); if (!t.glob) push(t.text, 'file', at); }
      const k = nameIndex(c.words);
      if (k < 0) continue;
      const name = commandName(c);
      const args = c.words.slice(k + 1).map((w) => res(w, c));
      const plain = args.filter((w) => !/^-/.test(w.text) && !w.glob);
      if (name === 'tee' || name === 'touch') for (const w of plain) push(w.text, 'file', at);
      if (name === 'mkdir') for (const w of plain) push(w.text, 'dir', at);
      if (['cp', 'mv', 'ln', 'rsync', 'install'].includes(name)) {
        const t = args.findIndex((w) => w.text === '-t' || w.text === '--target-directory');
        if (t >= 0) push(args[t + 1]?.text ?? null, 'dir', at);
        else if (plain.length >= 2) push((plain.at(-1) as Word).text, null, at);
      }
      for (let j = 0; j < args.length; j++) {
        const t = (args[j] as Word).text;
        const eq = /^(--[a-z-]+)=(.+)$/.exec(t);
        if (eq && OUT_FLAGS.has(eq[1] as string)) push(eq[2] as string, null, at);
        else if (OUT_FLAGS.has(t) && args[j + 1] && !(args[j + 1] as Word).glob) push((args[j + 1] as Word).text, null, at);
      }
    }
  }
  for (const c of job.clean) push(globBase(c), c.includes('*') ? 'dir' : null, 'clean:');
  (job.commands?.blockClean ?? []).forEach((cs, k) => { for (const c of cs) push(globBase(c), c.includes('*') ? 'dir' : null, `run${k + 1} clean:`); });
  for (const c of job.collect) push(globBase(c), c.includes('*') ? 'dir' : null, 'collect:');
  return out;
}

/** A folder a metric enumerates, and whether a path the job writes would be counted in it. */
export interface Enumeration { dir: string; desc: string; counts: (t: Target) => boolean }

const under = (p: string, dir: string): boolean => p.startsWith(`${dir}/`);

function globEnumeration(pattern: string, desc: string): Enumeration | null {
  const base = normPath(globBase(pattern));
  if (!base) return null;
  const re = globRe(pattern);
  return { dir: base, desc, counts: (t) => under(t.path, base) && re.test(t.path) };
}

/** What a metrics sh: line enumerates (find, ls, du, a glob, Python's glob / listdir), and the files: / count: extractors' globs. */
export function enumerations(m: MetricSpec): Enumeration[] {
  const out: Enumeration[] = [];
  if (m.kind === 'files' || m.kind === 'count' || m.kind === 'lines') {
    for (const a of m.kind === 'count' ? m.args.slice(0, -1) : m.args) { const e = globEnumeration(fillPlaceholders(a), `${m.kind} ${a}`); if (e) out.push(e); }
    return out;
  }
  if (m.kind !== 'sh') return out;
  const text = fillPlaceholders(m.command ?? '');
  const sc = scanShell(text);
  const res = resolver(sc.cmds);
  for (const c of sc.cmds) {
    const k = nameIndex(c.words);
    if (k < 0) continue;
    const name = commandName(c);
    const args = c.words.slice(k + 1).map((w) => res(w, c));
    if (name === 'find') {
      const starts: string[] = [];
      let j = 0;
      while (j < args.length && !/^[-(!]/.test((args[j] as Word).text)) starts.push((args[j++] as Word).text);
      const names: RegExp[] = [];
      const paths: RegExp[] = [];
      for (; j < args.length; j++) {
        const t = (args[j] as Word).text;
        const v = args[j + 1]?.text;
        if ((t === '-name' || t === '-iname') && v) names.push(new RegExp(globRe(v).source, t === '-iname' ? 'i' : ''));
        if ((t === '-path' || t === '-wholename') && v) paths.push(globRe(v, true));
      }
      const maxDepth = Number(args.find((_w, i) => args[i - 1]?.text === '-maxdepth')?.text ?? Infinity);
      for (const s of starts) {
        const dir = normPath(s);
        if (!dir) continue;
        out.push({
          dir, desc: `find ${s}${names.length ? ` -name ...` : ''}`,
          counts: (t) => {
            if (!under(t.path, dir)) return false;
            const depth = t.path.slice(dir.length + 1).split('/').length;
            if (depth > maxDepth) return false;
            if (paths.length && !paths.some((p) => p.test(t.path))) return false;
            return !names.length || names.some((n) => n.test(path.basename(t.path)));
          },
        });
      }
      continue;
    }
    for (const w of args) {
      if (/^-/.test(w.text)) continue;
      if (w.glob) { const e = globEnumeration(w.pattern, `${name} ${w.text}`); if (e) out.push(e); continue; }
      if ((name === 'ls' || name === 'du') && !w.dynamic) {
        const dir = normPath(w.text);
        if (!dir) continue;
        const recursive = name === 'du' || args.some((a) => /^-[A-Za-z]*R/.test(a.text));
        out.push({ dir, desc: `${name} ${w.text}`, counts: (t) => under(t.path, dir) && (recursive || !t.path.slice(dir.length + 1).includes('/')) });
      }
    }
    if (/^python/.test(name)) {
      const ci = args.findIndex((w) => w.text === '-c');
      const code = ci >= 0 ? args[ci + 1]?.text ?? '' : '';
      for (const g of code.matchAll(/\bglob(?:\.glob|\.iglob)?\(\s*f?['"]([^'"]+)['"]/g)) { const e = globEnumeration(g[1] as string, `glob ${g[1]}`); if (e) out.push(e); }
      for (const g of code.matchAll(/\b(?:listdir|scandir)\(\s*['"]([^'"]+)['"]/g)) {
        const dir = normPath(g[1] as string);
        if (dir) out.push({ dir, desc: `listdir ${g[1]}`, counts: (t) => under(t.path, dir) && !t.path.slice(dir.length + 1).includes('/') });
      }
    }
  }
  return out;
}

// ------------------------------------------------------------------ syntax

/** bash -n over a text; the problems it prints (syntax errors, a here-document ended by end-of-file). */
export function bashN(text: string, bash = 'bash'): string[] {
  const r = spawnSync(bash, ['-n'], { input: text, encoding: 'utf8' });
  if (r.error) return [`bash -n could not run: ${r.error.message}`];
  const lines = (r.stderr ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (r.status !== 0) return lines.length ? lines : [`bash -n exited ${r.status}`];
  return lines.filter((l) => /warning: here-document/.test(l));
}

/** The Python a block holds: here-documents fed to python / written to .py / delimited PY, and literal `python3 -c` texts. */
export function pythonSnippets(u: ShellUnit): Array<{ where: string; code: string }> {
  const out: Array<{ where: string; code: string }> = [];
  const sc = scanShell(u.text);
  for (const h of sc.heredocs) {
    const name = commandName(h.cmd);
    const toPy = h.cmd.redirects.some((r) => />/.test(r.op) && /\.py$/.test(r.target.text));
    if (!/^python/.test(name) && !toPy && !/^PY(THON)?\d*$/i.test(h.delim)) continue;
    if (!h.quoted && /[$`]/.test(h.body)) continue;            // bash expands it first: not the text Python reads
    out.push({ where: `${u.where} line ${h.line} (here-document ${h.delim})`, code: h.body });
  }
  for (const c of sc.cmds) {
    if (!/^python/.test(commandName(c))) continue;
    const k = nameIndex(c.words);
    const ws = c.words.slice(k + 1);
    const ci = ws.findIndex((w) => w.text === '-c');
    const code = ci >= 0 ? ws[ci + 1] : undefined;
    if (code && !code.dynamic) out.push({ where: `${u.where} line ${c.line} (python -c)`, code: code.text });
  }
  return out;
}

const COMPILE = `import json, sys
out = []
for s in json.load(sys.stdin):
    try:
        compile(s['code'], s['where'], 'exec')
    except SyntaxError as e:
        out.append({'where': s['where'], 'message': '%s (line %s of the snippet)' % (e.msg, e.lineno)})
    except Exception as e:
        out.append({'where': s['where'], 'message': str(e)})
print(json.dumps(out))
`;

/** Compile every snippet with one python; the failures. null: no python to compile with. */
export function compilePython(snippets: Array<{ where: string; code: string }>, python = 'python3'): Array<{ where: string; message: string }> | null {
  if (!snippets.length) return [];
  const r = spawnSync(python, ['-I', '-c', COMPILE], { input: JSON.stringify(snippets), encoding: 'utf8' });
  if (r.error || r.status !== 0) return null;
  try { return JSON.parse(r.stdout) as Array<{ where: string; message: string }>; } catch { return null; }
}

// ------------------------------------------------------------------ ids

/** A job id with a placeholder in it: J0XX, J###, J09?. */
export const PLACEHOLDER_ID = /(?<![A-Za-z0-9])J(?=[0-9]*[Xx#?])[0-9Xx#?]{3}(?![A-Za-z0-9])/;
const NOTHING = /^(-+|none|tbd|todo|\?+|n\/a|na|xxx)$/i;
const PLACEHOLDER_REF = /^(x{3,}|<[^>]*>|tbd|todo|sha|commit|ref)$/i;

// ------------------------------------------------------------------ the lint

export function lintJob(job: JobFile, opts: LintOptions = {}): Finding[] {
  const out: Finding[] = [];
  const add = (rule: RuleId) => (f: Omit<Finding, 'rule'>): void => { out.push({ rule, ...f }); };
  const units = shellUnits(job);
  const scans = new Map(units.map((u) => [u, scanShell(u.text)]));
  const targets = writeTargets(job);

  for (const u of units) {
    const sc = scans.get(u) as Scan;
    timeoutFindings(u, sc, add('timeout-duration'));
    argmaxFindings(u, sc, opts, targets, add('argmax-glob'));
    for (const h of sc.heredocs) if (h.unterminated) add('bash-syntax')({ severity: 'error', where: `${u.where} line ${h.line}`, message: `the here-document <<${h.delim} never ends: no line is exactly "${h.delim}"` });
  }

  // light-var
  if (job.cpu === 'light') {
    const reads = units.filter((u) => /(^|[\s"'=(:])(\.\/)?var\//m.test(u.text)).map((u) => u.where);
    if (reads.length) add('light-var')({ severity: 'warning', where: reads.slice(0, 4).join(', ') + (reads.length > 4 ? ', ...' : ''), message: 'a cpu: light job reads var/: since D392 the light lane\'s var/ is a symlink to lane 1\'s, so it sees what the heavy jobs wrote (and may see it half-written while one runs); a runner before 8961fd5 gave it an empty var/ of its own (J088, J090)' });
  }

  // metric-self-count: only a file the job writes, by name, that the count would take in.  A folder
  // the job writes below a counted one is not flagged: counting what the job makes is what metrics are for.
  const metrics = [...job.metrics, ...(job.pilot?.metrics ?? []), ...(job.commands?.metrics ?? [])];
  for (const m of metrics) {
    for (const e of enumerations(m)) {
      const sure = targets.filter((t) => t.kind === 'file' && e.counts(t));
      if (sure.length) add('metric-self-count')({ severity: 'error', where: `metrics ${m.name ?? '(unnamed)'}`, message: `\`${e.desc}\` counts ${e.dir}, and the job writes ${sure.slice(0, 3).map((t) => `${t.path} (${t.from})`).join(', ')} into it: the number includes the job's own output (J084, J082). Count only the files you mean (find ... -name 'g*.jsonl.gz'), or write outputs elsewhere` });
    }
  }

  // after-missing, placeholder-id
  const afterRaw = (job.header.after ?? '').split(/[,\s]+/).filter(Boolean);
  for (const a of afterRaw) {
    if (/^J\d{3,}$/.test(a)) continue;
    if (PLACEHOLDER_ID.test(a)) add('placeholder-id')({ severity: 'error', where: 'after:', message: `"${a}" is a placeholder: the runner reads only J + digits, drops it without a word, and the job would not wait for anything` });
    else if (NOTHING.test(a)) add('placeholder-id')({ severity: 'warning', where: 'after:', message: `"${a}": leave the after: line out when the job waits for nothing` });
    else add('placeholder-id')({ severity: 'error', where: 'after:', message: `"${a}" is not a job id (J + three digits): the runner drops it, and the job would not wait for it` });
  }
  if (opts.jobsDir) {
    let files: string[] = [];
    try { files = fs.readdirSync(opts.jobsDir); } catch { /* none */ }
    for (const a of job.after) {
      if (!files.some((f) => f === `${a}.md` || f.startsWith(`${a}-`))) add('after-missing')({ severity: 'error', where: 'after:', message: `${a} has no job file in ${opts.jobsDir} (${a}-*.md): the runner waits for a STATUS that never comes` });
    }
  }
  for (const f of (job.header.followup ?? '').split(',').map((x) => x.trim()).filter(Boolean)) {
    if (NOTHING.test(f)) add('placeholder-id')({ severity: 'error', where: 'followup:', message: `"${f}" is a placeholder: the ledger refuses it; leave the followup: line out when nothing follows` });
    else if (PLACEHOLDER_ID.test(f)) add('placeholder-id')({ severity: 'error', where: 'followup:', message: `"${f}" names a placeholder job id` });
  }
  for (const m of (job.header.repos ?? '').matchAll(/\b(mtg-table|ForgeCoach)@(\S+)/g)) {
    const ref = (m[2] as string).replace(/[.,;)]+$/, '');
    if (PLACEHOLDER_REF.test(ref) || /^<.*>?$/.test(ref)) add('placeholder-id')({ severity: 'error', where: 'repos:', message: `${m[1]}@${ref} is a placeholder ref: pin the commit the job was checked on` });
  }
  if (PLACEHOLDER_ID.test(job.header.id ?? '')) add('placeholder-id')({ severity: 'error', where: 'id:', message: `"${job.header.id}" is a placeholder id` });
  for (const u of units) {
    const hit = PLACEHOLDER_ID.exec(u.text);
    if (hit) add('placeholder-id')({ severity: 'error', where: u.where, message: `"${hit[0]}" is a placeholder job id` });
  }
  for (const c of [...job.clean, ...job.collect]) {
    const hit = PLACEHOLDER_ID.exec(c);
    if (hit) add('placeholder-id')({ severity: 'error', where: 'clean:/collect:', message: `"${hit[0]}" in ${c} is a placeholder job id` });
  }

  // syntax
  if (opts.syntax !== false) {
    for (const u of units) for (const p of bashN(u.text, opts.bash)) add('bash-syntax')({ severity: 'error', where: u.where, message: `bash -n: ${p.replace(/^bash: /, '')}` });
    const snippets = units.flatMap((u) => pythonSnippets(u));
    const bad = compilePython(snippets, opts.python);
    if (bad === null) add('python-syntax')({ severity: 'warning', where: 'python', message: `no python3 to compile ${snippets.length} Python snippet(s) with: not checked` });
    else for (const b of bad) add('python-syntax')({ severity: 'error', where: b.where, message: `Python: ${b.message}` });
  }
  return out;
}

export function lintText(fs_: Finding[]): string {
  const e = fs_.filter((f) => f.severity === 'error').length;
  const w = fs_.length - e;
  if (!fs_.length) return 'lint: clean\n';
  return `lint: ${e} error(s), ${w} warning(s)\n${fs_.map((f) => `  ${f.severity === 'error' ? 'ERROR  ' : 'WARNING'} [${f.rule}] ${f.where}: ${f.message}`).join('\n')}\n`;
}
