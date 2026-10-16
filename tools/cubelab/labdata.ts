// mtg-table — the cube lab: where its heavy outputs live (D450, LAB_DATA_DIR).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A lab run's heavy outputs -- census games, rows, ledgers, frame logs, run folders -- default to the
// repo's var/, as they always have.  LAB_DATA_DIR (the environment) or config.json's `labDataDir` names
// another directory, typically a large drive, and then a RELATIVE path the lab is given under var/ is
// re-rooted there:
//
//   var/census/legacy/games   ->  $LAB_DATA_DIR/census/legacy/games
//
// - WRITE paths (an --out, a --root) always go to the re-rooted place.
// - READ paths (a --decks, a --games, a --replay, a row file) go to the re-rooted place when it exists,
//   and to the repo's var/ otherwise, so data made before the setting (or committed under var/) is
//   still found.
// - An absolute path, and a relative one outside var/ (cubes/..., decks/..., tools/...), is never moved.
// - The setting must name an existing directory: a drive that is not mounted is an error, never a new
//   folder on the system disk.
// - The Forge homes (var/cubelab/homes/<k>/, D129: small, and forge_home_make keeps them under the repo)
//   and the compiled classes stay in the repo's var/.
//
// Unset (the default), every path resolves exactly as before: path.resolve(repo, p).

import fs from 'node:fs';
import path from 'node:path';

export const LAB_DATA_ENV = 'LAB_DATA_DIR';

/** The lab data root, or null: the environment wins, then config.json's `labDataDir`. */
export function labDataDir(repo: string, env: NodeJS.ProcessEnv = process.env): string | null {
  let v = env[LAB_DATA_ENV];
  let from = LAB_DATA_ENV;
  if (!v) {
    const cfgFile = env.MTG_TABLE_CONFIG && fs.existsSync(env.MTG_TABLE_CONFIG) ? env.MTG_TABLE_CONFIG : path.join(repo, 'config.json');
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')) as { labDataDir?: unknown };
      if (typeof cfg.labDataDir === 'string' && cfg.labDataDir) { v = cfg.labDataDir; from = `config.json's labDataDir`; }
    } catch { /* no config: no setting */ }
  }
  if (!v) return null;
  const root = path.resolve(repo, v);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`${from} names ${root}, which is not an existing directory (is the drive mounted?)`);
  }
  return root;
}

/** The part of a relative path under var/, or null when it is absolute or outside var/. */
export function underVar(p: string): string | null {
  if (path.isAbsolute(p)) return null;
  const n = path.normalize(p).split(path.sep).filter((x) => x && x !== '.');
  if (n.length < 2 || n[0] !== 'var' || n.includes('..')) return null;
  return n.slice(1).join(path.sep);
}

/**
 * Where a lab path given on the command line lives.  `write`: the re-rooted place when LAB_DATA_DIR is
 * set and the path is under var/; `read`: that place if it exists, else the repo's.  `root` overrides
 * the lookup (tests).
 */
export function labPath(repo: string, p: string, mode: 'read' | 'write', root: string | null = labDataDir(repo)): string {
  const rest = root ? underVar(p) : null;
  if (root && rest !== null) {
    const moved = path.join(root, rest);
    if (mode === 'write' || fs.existsSync(moved)) return moved;
  }
  return path.resolve(repo, p);
}

/** A path for a report: relative to the repo when inside it, else absolute. */
export function shownPath(repo: string, abs: string): string {
  const r = path.relative(repo, abs);
  return r && !r.startsWith('..') && !path.isAbsolute(r) ? r : abs;
}

/**
 * {@link labPath} for the commands that keep a path as given (run, evolve, queue: their folders are
 * recorded relative to the repo): the path itself, unchanged, unless LAB_DATA_DIR re-roots it.
 */
export function labArg(repo: string, p: string, mode: 'read' | 'write', root: string | null = labDataDir(repo)): string {
  const rest = root ? underVar(p) : null;
  if (!root || rest === null) return p;
  const moved = path.join(root, rest);
  return mode === 'write' || fs.existsSync(moved) ? moved : p;
}
