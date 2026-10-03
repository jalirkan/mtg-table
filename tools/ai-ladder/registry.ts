// mtg-table — the AI ladder: the player registry (tools/ai-ladder/players.json).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A player is a NAME for a config: `{name, kind, params, anchor?, note?,
// from?}`.  Its identity in the results log is the name plus `hash`, the first
// 12 hex digits of the sha256 of `{kind, params}` with the kind's defaults
// filled in and the keys sorted — so a later edit of a played config cannot
// silently merge two different AIs' games (the old games keep the old hash and
// are rated as `name@hash`, a historical player).  The registry is committed;
// `tune` and `league` only ever APPEND to it (`addPlayer` refuses a taken name).
// An unknown kind is not an error here: it is listed, with its reason, and never
// scheduled (kinds.ts).

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

import { KINDS, resolveParams, unavailable, type Params } from './kinds.ts';

export interface PlayerDef {
  name: string;
  kind: string;
  params: Params;
  anchor?: boolean;
  note?: string;
  /** Where the entry came from when a tool wrote it ("tune <id>"). */
  from?: string;
  /** League mode tests it against the current best (league.ts) until it is decided. */
  candidate?: boolean;
}

export interface Player extends PlayerDef {
  /** Params with the kind's defaults filled (the raw params when the kind is unknown). */
  resolved: Params;
  hash: string;
  /** The ai-bench seat config; null when unavailable. */
  cfg: string | null;
  /** null = playable here. */
  unavailable: string | null;
}

export interface Registry {
  version: 1;
  comment?: string;
  players: PlayerDef[];
}

export const ANCHOR = 'forge-default';
const NAME_RE = /^[a-z0-9][a-z0-9._+-]{0,63}$/;

function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

export function configHash(kind: string, resolved: Params): string {
  return createHash('sha256').update(canonical({ kind, params: resolved })).digest('hex').slice(0, 12);
}

export function resolvePlayer(d: PlayerDef, repo: string): Player {
  if (!NAME_RE.test(d.name)) throw new Error(`player name "${d.name}" must match ${NAME_RE}`);
  let resolved: Params = d.params ?? {};
  let why = unavailable(d.kind, repo);
  if (KINDS[d.kind]) {
    resolved = resolveParams(d.kind, d.params ?? {});   // a bad param in a known kind IS an error
  }
  let cfg: string | null = null;
  if (!why) {
    try {
      cfg = (KINDS[d.kind] as (typeof KINDS)[string]).cfg(resolved);
    } catch (e) {
      why = String((e as Error).message);
    }
  }
  return { ...d, resolved, hash: configHash(d.kind, resolved), cfg, unavailable: why };
}

export function parseRegistry(text: string): Registry {
  const r = JSON.parse(text) as Registry;
  if (r.version !== 1 || !Array.isArray(r.players)) throw new Error('players.json: want {"version":1,"players":[...]}');
  const seen = new Set<string>();
  for (const p of r.players) {
    if (seen.has(p.name)) throw new Error(`players.json: ${p.name} is listed twice`);
    seen.add(p.name);
  }
  if (!seen.has(ANCHOR)) throw new Error(`players.json: the anchor ${ANCHOR} is missing`);
  return r;
}

export function loadRegistry(file: string): Registry {
  return parseRegistry(readFileSync(file, 'utf8'));
}

export function players(reg: Registry, repo: string): Player[] {
  return reg.players.map((d) => resolvePlayer(d, repo));
}

/** One player per line: a tool's append is a one-line diff. */
export function writeRegistry(file: string, reg: Registry): void {
  const lines = reg.players.map((p) => `    ${JSON.stringify(p)}`);
  const head = `{\n  "version": 1,\n${reg.comment ? `  "comment": ${JSON.stringify(reg.comment)},\n` : ''}  "players": [\n`;
  writeFileSync(file, `${head}${lines.join(',\n')}\n  ]\n}\n`);
}

/** Append a player; never overwrite.  A taken name gets -2, -3, ... (returns the name used). */
export function addPlayer(reg: Registry, def: PlayerDef): string {
  const taken = new Set(reg.players.map((p) => p.name));
  let name = def.name;
  for (let i = 2; taken.has(name); i++) name = `${def.name}-${i}`;
  reg.players.push({ ...def, name });
  return name;
}

/** A free name for a tuned config: `<base>-t<n>`. */
export function nextName(reg: Registry, base: string, tag = 't'): string {
  const taken = new Set(reg.players.map((p) => p.name));
  for (let i = 1; ; i++) if (!taken.has(`${base}-${tag}${i}`)) return `${base}-${tag}${i}`;
}
