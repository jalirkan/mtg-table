// mtg-table — the lab runner: the daemon's pid lock (D337).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// One runner per state directory.  The lock is a pid file, and a pid in it
// counts only while that process is alive AND its command line is a runner's
// (`runner/cli.ts`): after a reboot the pid is reused by something else, and
// a pid file that blocked on any live process would keep the service failing
// at start (Restart=on-failure) forever.

import fs from 'node:fs';

/** /proc/<pid>/cmdline as text, or null when there is no such process. */
export function procCmdline(pid: number): string | null {
  try { return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' '); } catch { return null; }
}

export const isRunnerCmdline = (cmd: string | null): boolean => !!cmd && /runner\/cli\.ts/.test(cmd);

/**
 * Take the lock for `pid`.  Returns null when taken, else the pid that holds it.  A pid file naming a
 * dead process, or a live process that is not a runner, is stale and replaced.
 */
export function acquireLock(file: string, pid: number, cmdlineOf: (pid: number) => string | null = procCmdline): number | null {
  let held = 0;
  try { held = Number(fs.readFileSync(file, 'utf8').trim()); } catch { /* none */ }
  if (held && held !== pid && isRunnerCmdline(cmdlineOf(held))) return held;
  // Write a private name, then rename over the lock; the read-back says who won a race.
  const part = `${file}.${pid}`;
  fs.writeFileSync(part, String(pid));
  fs.renameSync(part, file);
  return Number(fs.readFileSync(file, 'utf8').trim()) === pid ? null : held;
}

export function releaseLock(file: string, pid: number): void {
  try { if (Number(fs.readFileSync(file, 'utf8').trim()) === pid) fs.rmSync(file); } catch { /* gone */ }
}
