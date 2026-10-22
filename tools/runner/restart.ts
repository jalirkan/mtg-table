// mtg-table — the lab runner: why the daemon (re)started.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// J141's run1 stopped on 2026-10-17 and nothing played until a runner restart two days later,
// and its STATUS said only "the runner restarted during run1": nobody could tell a crash from a
// `systemctl stop`, an OOM kill or a reboot.  So every daemon keeps one small file,
// <state>/last-exit.json:
//
//   - at start it is written `state: running` (pid, commit, boot id, systemd invocation id);
//   - on the way out, `state: exited` with the reason: the signal (SIGTERM, SIGINT), an uncaught
//     error and its message, or `exit <code>`, plus whether the runner was paused
//     (`tools/runner.sh pause`/`stop`) and a note `install` leaves before it restarts the service.
//
// A SIGKILL, an OOM kill, a power cut or a kernel panic writes nothing, so the next start finds
// `state: running`: "no record".  The boot id (/proc/sys/kernel/random/boot_id) then tells a
// reboot from a service restart.  The next start reads the file BEFORE it overwrites it and
// writes one line from it -- into the journal and into every running job's STATUS
// (`restart_reason:`).  Nothing here decides anything.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { isoLocal } from './statusjson.ts';

export const EXIT_FILE = 'last-exit.json';
/** What `install` leaves before `systemctl restart` (the exit that follows reads and removes it). */
export const EXIT_NOTE_FILE = 'exit-note.txt';
/** A note older than this is not about the exit at hand. */
export const EXIT_NOTE_MAX_AGE_MS = 10 * 60_000;

export interface ExitRecord {
  state: 'running' | 'exited';
  pid: number;
  commit: string;
  startedAt: string;
  bootId: string | null;
  invocationId: string | null;
  exitedAt?: string;
  reason?: string;
}

export interface StartFacts {
  pid: number;
  now: number;
  bootId: string | null;
  invocationId: string | null;
  uptimeS: number;
}

export function startFacts(env: NodeJS.ProcessEnv = process.env, read: (f: string) => string = (f) => fs.readFileSync(f, 'utf8'), uptimeS: number = os.uptime()): StartFacts {
  let bootId: string | null = null;
  try { bootId = read('/proc/sys/kernel/random/boot_id').trim() || null; } catch { /* not Linux */ }
  return { pid: process.pid, now: Date.now(), bootId, invocationId: env.INVOCATION_ID?.trim() || null, uptimeS: Math.round(uptimeS) };
}

/** The previous record, or null when there is none; an unreadable one says so in `reason`. */
export function readExit(stateDir: string): ExitRecord | null {
  let text: string;
  try { text = fs.readFileSync(path.join(stateDir, EXIT_FILE), 'utf8'); } catch { return null; }
  try {
    const o = JSON.parse(text) as Partial<ExitRecord>;
    if (o.state !== 'running' && o.state !== 'exited') throw new Error('no state');
    return { state: o.state, pid: Number(o.pid) || 0, commit: String(o.commit ?? '?'), startedAt: String(o.startedAt ?? '?'), bootId: o.bootId ?? null, invocationId: o.invocationId ?? null, ...(o.exitedAt ? { exitedAt: String(o.exitedAt) } : {}), ...(o.reason ? { reason: String(o.reason) } : {}) };
  } catch {
    return { state: 'running', pid: 0, commit: '?', startedAt: '?', bootId: null, invocationId: null, reason: `${EXIT_FILE} unreadable` };
  }
}

/** Atomic (a temp file and a rename): an exit cut short leaves the old record, never half a new one. */
export function writeExit(stateDir: string, rec: ExitRecord): void {
  fs.mkdirSync(stateDir, { recursive: true });
  const f = path.join(stateDir, EXIT_FILE);
  const tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(rec, null, 1)}\n`);
  fs.renameSync(tmp, f);
}

/** `install` calls this just before it restarts the service. */
export function noteExit(stateDir: string, note: string): void {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, EXIT_NOTE_FILE), `${note.replace(/\s+/g, ' ').trim()}\n`);
}

/** The note `install` left, if it is recent; removed either way. */
function takeNote(stateDir: string, now: number): string | null {
  const f = path.join(stateDir, EXIT_NOTE_FILE);
  try {
    const age = now - fs.statSync(f).mtimeMs;
    const text = fs.readFileSync(f, 'utf8').trim();
    fs.rmSync(f, { force: true });
    return age <= EXIT_NOTE_MAX_AGE_MS && text ? text : null;
  } catch { return null; }
}

/** What else was true at the exit: paused (`tools/runner.sh pause` or `stop`), an `install` note. */
export function exitContext(stateDir: string, now: number = Date.now()): string[] {
  const out: string[] = [];
  try {
    const since = fs.readFileSync(path.join(stateDir, 'paused'), 'utf8').trim();
    out.push(`the runner was paused${since ? ` since ${since}` : ''} (tools/runner.sh pause or stop)`);
  } catch { /* not paused */ }
  const note = takeNote(stateDir, now);
  if (note) out.push(note);
  return out;
}

/**
 * Marks this daemon `running`, and records its exit: `signal()` from the daemon's own SIGTERM/SIGINT
 * handlers, `fatal()` for an error main() gave up on; an uncaught exception is seen on its own
 * (`uncaughtExceptionMonitor`, which changes nothing about how Node handles it).
 */
export function exitRecorder(stateDir: string, commit: string, facts: StartFacts, proc: NodeJS.Process = process): { signal: (name: string) => void; fatal: (e: unknown) => void } {
  const base: ExitRecord = { state: 'running', pid: facts.pid, commit, startedAt: isoLocal(facts.now), bootId: facts.bootId, invocationId: facts.invocationId };
  writeExit(stateDir, base);
  let why: string | null = null;
  const message = (e: unknown): string => (e instanceof Error ? e.message : String(e)).split('\n')[0]?.slice(0, 300) ?? '';
  proc.on('uncaughtExceptionMonitor', (e) => { why = `uncaught error: ${message(e)}`; });
  proc.on('exit', (code) => {
    const now = Date.now();
    const reason = [why ?? `exit ${code}`, ...exitContext(stateDir, now)].join('; ');
    try { writeExit(stateDir, { ...base, state: 'exited', exitedAt: isoLocal(now), reason }); } catch { /* the next start says "no record" */ }
  });
  return {
    signal: (name) => { why ??= name; },
    fatal: (e) => { why ??= `error: ${message(e)}`; },
  };
}

export function uptimeText(s: number): string {
  const d = Math.floor(s / 86_400), h = Math.floor((s % 86_400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d} d ${h} h ${m} min` : h ? `${h} h ${m} min` : `${m} min`;
}

const short = (id: string | null): string => (id ? id.replace(/-/g, '').slice(0, 8) : '?');

/**
 * The one line a start writes: the previous instance's exit, reboot or not, this start's invocation and
 * uptime, and (D461) the clock's state as the daemon started (`clockText`: synced, how long the unit waited).
 */
export function restartReason(prev: ExitRecord | null, now: StartFacts, clock: string | null = null): string {
  let what: string;
  if (!prev) what = `no record of a previous runner (no ${EXIT_FILE}: the first start that keeps one, or a new state folder)`;
  else if (prev.state === 'exited') what = `the previous runner (pid ${prev.pid}, ${prev.commit}) exited at ${prev.exitedAt ?? '?'}: ${prev.reason ?? 'no reason recorded'}`;
  else what = `no record: the previous runner (pid ${prev.pid}, ${prev.commit}, started ${prev.startedAt}) ended without writing its exit -- a SIGKILL, an OOM kill, a power loss or a crash${prev.reason ? ` (${prev.reason})` : ''}`;
  let boot: string;
  if (!prev?.bootId || !now.bootId) boot = `boot ${short(now.bootId)}`;
  else if (prev.bootId === now.bootId) boot = `same boot ${short(now.bootId)}: the service restarted, not the machine`;
  else boot = `the machine rebooted since (boot ${short(prev.bootId)} -> ${short(now.bootId)})`;
  return `${what}; ${boot}; up ${uptimeText(now.uptimeS)}; invocation ${now.invocationId ? short(now.invocationId) : 'none (not under systemd)'}${clock ? `; ${clock}` : ''}`;
}
