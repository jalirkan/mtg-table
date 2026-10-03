// mtg-table — the lab runner: the pool control file (D337).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A worker pool that runs engine games (the cube lab's runPool, ai-bench's
// `play`, the AI ladder's drive) reads ONE small JSON file before it hands out
// the next game or match:
//
//   { "paused": false, "maxWorkers": 5 }
//
// at the path in the LAB_CONTROL environment variable.  `paused` holds the
// pool: the games in flight finish, no new one starts.  `maxWorkers` caps the
// worker processes alive at once; a pool above it lets a worker go when that
// worker's game ends (its JVM exits, so its memory comes back) and starts one
// again when the cap rises.  Absent variable, absent file, unreadable or
// half-written file: the pool behaves exactly as it did before this file
// existed.  The runner (tools/runner/) is the only writer; it writes a
// `.part` file and renames it, so a reader never sees a torn one.
//
// The Java side (tools/ai-bench/AiBench.java) reads the same two keys with
// mtgtable.Json.

import fs from 'node:fs';
import path from 'node:path';

export interface Control {
  paused: boolean;
  /** null: no cap. */
  maxWorkers: number | null;
}

export const FREE: Control = { paused: false, maxWorkers: null };

/** Parse a control file's text; anything unexpected reads as "no control". */
export function parseControl(text: string): Control {
  let o: unknown;
  try {
    o = JSON.parse(text);
  } catch {
    return FREE;
  }
  if (!o || typeof o !== 'object') return FREE;
  const r = o as Record<string, unknown>;
  const mw = r.maxWorkers;
  return {
    paused: r.paused === true,
    maxWorkers: typeof mw === 'number' && Number.isFinite(mw) ? Math.max(1, Math.floor(mw)) : null,
  };
}

export function readControl(file: string | undefined | null): Control {
  if (!file) return FREE;
  try {
    return parseControl(fs.readFileSync(file, 'utf8'));
  } catch {
    return FREE;
  }
}

/**
 * A cached reader for a pool's hot path: re-reads the file at most every `ms`.
 * With no path (LAB_CONTROL unset) it always answers FREE without touching the disk.
 */
export function controlReader(file: string | undefined | null = process.env.LAB_CONTROL, ms = 1000, now: () => number = Date.now): () => Control {
  if (!file) return () => FREE;
  let at = -Infinity;
  let last: Control = FREE;
  return () => {
    const t = now();
    if (t - at >= ms) {
      last = readControl(file);
      at = t;
    }
    return last;
  };
}

export function writeControl(file: string, c: Control): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const part = `${file}.${process.pid}.part`;
  fs.writeFileSync(part, `${JSON.stringify({ paused: c.paused, maxWorkers: c.maxWorkers })}\n`);
  fs.renameSync(part, file);
}

// `node tools/runner/control.ts get <file>` prints "<paused 0|1> <maxWorkers or 0>"
// for tools/ai-bench.sh's supervisor loop.
if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === 'get') {
  const c = readControl(process.argv[3]);
  process.stdout.write(`${c.paused ? 1 : 0} ${c.maxWorkers ?? 0}\n`);
}
