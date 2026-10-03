// mtg-table — the cube lab: which code, engine and inputs produced a run's drafts.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Nightly runs append to one folder per pool key (queue.ts), and the PC pulls
// main before its jobs, so the code can change between two nights of one
// folder.  A drafter, builder, recorder or bridge fix between nights would
// silently mix two populations in a model that assumes one, and nothing could
// tell them apart afterwards (methodology review 2, N5).  So every run stamps
// its VERSION (D333):
//
//   gitSha          HEAD of the checkout, recorded (not compared: a docs-only commit changes it)
//   codeTree        sha256 of `git ls-tree HEAD` over the paths that make a draft or a game:
//                   bridge/src, tools/cubelab, forge-home -- compared
//   dirty, diffSha  uncommitted changes under those paths (new files too), and a hash of the diff and the
//                   new files' contents -- compared
//   forgeJarSha256  the engine's jar (FORGE_JAR), hashed, not named -- compared
//   ratingsSha256   the ratings file (a bridge run: every source's, in order) -- compared
//   cubeSha         the cube's markdown (a bridge run: every source's) -- compared
//   weightsSha      the drafter and builder weights -- compared
//   node            the Node version, recorded
//
// `id` is the first 12 hex of a hash over the compared fields.  run.json keeps
// `versions` (every version that wrote to the folder, in order, with the first
// seed it drafted and whether it was let in by --allow-version-change) and
// every drafts.jsonl line carries `ver: <id>`, so a reader can filter or split
// by it (tools/ml/matchup_data.py, dataset.py).  run.ts's resume check refuses
// to append under a different id unless --allow-version-change, and logs the
// change in run.json and on stdout when it is allowed.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';

export const CODE_PATHS = ['bridge/src', 'tools/cubelab', 'forge-home'];

export interface LabVersion {
  id: string;
  gitSha: string | null;
  codeTree: string | null;
  dirty: boolean;
  diffSha: string | null;
  forgeJarSha256: string | null;
  ratingsSha256: string | null;
  cubeSha: string;
  weightsSha: string;
  node: string;
}

/** One entry of run.json's `versions`: a version, when it first wrote, and how it got in. */
export interface VersionEntry extends LabVersion {
  since: string;
  firstSeed: number;
  /** Set when this version was appended to a folder another version wrote: the flag that allowed it and what changed. */
  allowedChange?: { flag: '--allow-version-change'; changed: string[]; from: string };
}

const COMPARED = ['codeTree', 'dirty', 'diffSha', 'forgeJarSha256', 'ratingsSha256', 'cubeSha', 'weightsSha'] as const;

const sha256 = (s: string | Buffer): string => createHash('sha256').update(s).digest('hex');

const fileCache = new Map<string, string>();
/** sha256 of a file, cached by path, size and mtime (the jar is 39 MB and a night runs hundreds of chunks). */
export function fileSha(file: string | null | undefined): string | null {
  if (!file || !fs.existsSync(file)) return null;
  const st = fs.statSync(file);
  const key = `${file}|${st.size}|${st.mtimeMs}`;
  let h = fileCache.get(key);
  if (!h) { h = sha256(fs.readFileSync(file)); fileCache.set(key, h); }
  return h;
}

export function codeVersion(repo: string): { gitSha: string | null; codeTree: string | null; dirty: boolean; diffSha: string | null } {
  const git = (args: string[]): string => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  try {
    const gitSha = git(['rev-parse', 'HEAD']).trim();
    const codeTree = sha256(git(['ls-tree', '-r', 'HEAD', '--', ...CODE_PATHS]));
    // tracked changes AND new files under the code paths (a new module the lab imports is code too)
    const st = git(['status', '--porcelain', '--', ...CODE_PATHS]).trim();
    const dirty = st.length > 0;
    if (!dirty) return { gitSha, codeTree, dirty, diffSha: null };
    const untracked = git(['ls-files', '--others', '--exclude-standard', '--', ...CODE_PATHS]).split('\n').filter(Boolean).sort();
    const h = createHash('sha256').update(git(['diff', 'HEAD', '--', ...CODE_PATHS]));
    for (const f of untracked) h.update(`\0${f}\0`).update(fs.readFileSync(`${repo}/${f}`));
    return { gitSha, codeTree, dirty, diffSha: h.digest('hex').slice(0, 16) };
  } catch {
    return { gitSha: null, codeTree: null, dirty: true, diffSha: null };
  }
}

export function versionId(v: Omit<LabVersion, 'id'>): string {
  return sha256(JSON.stringify(COMPARED.map((k) => v[k]))).slice(0, 12);
}

export function labVersion(repo: string, x: { cubeShas: string[]; ratingsFiles: Array<string | null>; weights: unknown; forgeJar?: string | null }): LabVersion {
  const code = codeVersion(repo);
  const ratings = x.ratingsFiles.map((f) => fileSha(f));
  const v = {
    ...code,
    forgeJarSha256: fileSha(x.forgeJar ?? process.env.FORGE_JAR ?? null),
    ratingsSha256: ratings.length === 1 ? ratings[0] ?? null : ratings.every((r) => r === null) ? null : sha256(ratings.map((r) => r ?? '-').join(',')),
    cubeSha: x.cubeShas.length === 1 ? x.cubeShas[0] as string : sha256(x.cubeShas.join(',')),
    weightsSha: sha256(JSON.stringify(x.weights)).slice(0, 16),
    node: process.version,
  };
  return { id: versionId(v), ...v };
}

/** The compared fields that differ between two versions. */
export function versionDiff(a: Partial<LabVersion>, b: Partial<LabVersion>): string[] {
  return COMPARED.filter((k) => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null));
}

/**
 * The resume rule: the folder's newest version must be this one, unless `allow` (--allow-version-change).
 * Returns the `versions` list to write; throws when the change is not allowed.  `old` is null for a new
 * folder; a folder from before D333 (run.json with no `versions`) passes undefined and counts as a
 * different, unknown version.
 */
export function resumeVersions(old: VersionEntry[] | null | undefined, cur: LabVersion, firstSeed: number, allow: boolean, out: string,
  say: (s: string) => void, now = new Date().toISOString()): VersionEntry[] {
  if (old === null) return [{ ...cur, since: now, firstSeed }];
  const list = [...(old ?? [])];
  const last = list.at(-1);
  if (last && last.id === cur.id) return list;
  const changed = last ? versionDiff(last, cur) : ['(the folder predates version stamps)'];
  const from = last?.id ?? 'unversioned';
  if (!allow) {
    throw new Error(`${out} was written by lab version ${from}; this checkout is ${cur.id} (changed: ${changed.join(', ')}). `
      + 'Appending would mix two versions in one folder -- use a new --out (or --root), or pass --allow-version-change to append anyway (logged in run.json; readers can split by `ver`).');
  }
  say(`VERSION CHANGE allowed by --allow-version-change: ${out} ${from} -> ${cur.id} (changed: ${changed.join(', ')}); logged in run.json`);
  list.push({ ...cur, since: now, firstSeed, allowedChange: { flag: '--allow-version-change', changed, from } });
  return list;
}
