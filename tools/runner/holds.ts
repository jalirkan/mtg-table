// mtg-table — the lab runner: admission holds (D401).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A HOLD stops the runner from ADMITTING a job -- starting one from the queue --
// and does nothing else: a running job keeps running, its step goes on, its pool
// keeps its workers (unlike `pause`, which holds every pool, and `stop`, which
// TERMs a job).  `scripts/play.sh --pause-lab` takes one when it starts and gives
// it back when it exits, so people playing get the machine's spare cores without
// a lab job being touched.
//
//   <state>/holds/<pid>.json   {"pid": <the holder's pid>, "by": "play.sh", "since": "<ISO>"}
//
// One file per holder, so two play.sh runs never undo each other and a manual
// `tools/runner.sh pause` is never resumed by one.  A hold whose pid is gone (a
// play.sh killed -9, a reboot) is stale: it holds nothing and the next read
// removes it -- a crash can never park the lab for good.

import fs from 'node:fs';
import path from 'node:path';

export interface Hold {
  pid: number;
  by: string;
  since: string;
}

export const holdsDir = (stateDir: string): string => path.join(stateDir, 'holds');

/** Is a process alive?  EPERM: it exists, under another user. */
export function pidAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === 'EPERM'; }
}

/** Take a hold for `pid` (written atomically; taking it again just refreshes it). */
export function takeHold(stateDir: string, pid: number, by: string, now = Date.now()): Hold {
  if (!Number.isInteger(pid) || pid <= 1) throw new Error(`a hold needs the holder's pid (got ${pid})`);
  const clean = by.replace(/[^\w .:/-]/g, '').slice(0, 60) || 'unknown';
  const dir = holdsDir(stateDir);
  fs.mkdirSync(dir, { recursive: true });
  const h: Hold = { pid, by: clean, since: new Date(now).toISOString() };
  const f = path.join(dir, `${pid}.json`);
  fs.writeFileSync(`${f}.part`, `${JSON.stringify(h)}\n`);
  fs.renameSync(`${f}.part`, f);
  return h;
}

/** Give back `pid`'s hold.  True when there was one. */
export function releaseHold(stateDir: string, pid: number): boolean {
  const f = path.join(holdsDir(stateDir), `${pid}.json`);
  if (!fs.existsSync(f)) return false;
  fs.rmSync(f, { force: true });
  return true;
}

/** The live holds, oldest first; stale ones (dead pid, unreadable) are removed as they are found. */
export function activeHolds(stateDir: string, alive: (pid: number) => boolean = pidAlive): Hold[] {
  const dir = holdsDir(stateDir);
  let names: string[];
  try { names = fs.readdirSync(dir); } catch { return []; }
  const out: Hold[] = [];
  for (const n of names) {
    if (!/^\d+\.json$/.test(n)) continue;
    const f = path.join(dir, n);
    let h: Hold | null = null;
    try {
      const raw = JSON.parse(fs.readFileSync(f, 'utf8')) as Partial<Hold>;
      if (Number.isInteger(raw.pid) && `${raw.pid}.json` === n) h = { pid: raw.pid as number, by: String(raw.by ?? 'unknown'), since: String(raw.since ?? '') };
    } catch { /* torn or foreign: stale */ }
    if (!h || !alive(h.pid)) { fs.rmSync(f, { force: true }); continue; }
    out.push(h);
  }
  return out.sort((a, b) => a.since.localeCompare(b.since));
}

/** The schedule's words for the holds, or null when there are none. */
export function holdReason(holds: Hold[]): string | null {
  if (!holds.length) return null;
  return `new jobs held by ${holds.map((h) => `${h.by} (pid ${h.pid})`).join(', ')}: running jobs carry on`;
}
