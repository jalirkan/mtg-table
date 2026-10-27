// mtg-table — the cube lab: the redaction check for decision rows (D450).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A row (mtgtable.ai.DistillRows, J126's exporter; D450's observing seats) is ONE seat's decision: its
// state from that seat's knowledge (D361's encoder: other hands and every library by size only), each
// candidate's vector, the candidates' tokens (wire ids: `cast:<id>`, `attack:<ids>`, `block:<b>><a>`),
// the index played.  What could leak is a name, a string the engine built, or an id the seat never saw.
// This file checks the files, with no engine:
//
//   1. SHAPE.  Every line is JSON of a known type (header, begin, row, end).  A row has exactly the
//      known keys; its tokens match the token grammar and nothing else (no names, no text); `s` is
//      [index, number] pairs inside the header's state size; `c` is n vectors of numbers of the kind's
//      width; `chosen` indexes a candidate.  A `begin` line holds strings and numbers only, and no key
//      that names cards.
//   2. IDS (when the game's frame logs exist: census-play --record full, the move atlas).  Every id a
//      row's tokens name must be one the deciding seat's OWN log shows as a card it may see (a full,
//      not hidden, card object -- or, D491, its own token the zone events show born onto its battlefield
//      and left there or in its graveyard) -- so a row can never be the place a hidden card's id first appears.
//
// The engine half -- the state must not move when only the opponent's hidden cards do -- is
// mtgtable.ai.RowsLeakCheck (census-play --rows-check-every N).

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export const TOKEN = /^(pass|\?|land:\d+|cast:\d+|activate:\d+(#\d+)?|attack:(none|\d+(,\d+)*)|block:(none|\d+>\d+(,\d+>\d+)*))$/;
const ROW_KEYS = new Set(['type', 'v', 'game', 'seat', 'kind', 'turn', 'n', 'chosen', 'overrode', 'fallback', 'ms', 'policy', 'tokens', 's', 'c']);
const BEGIN_BANNED = /name|card|hand|library|list/i;

export interface RowsCheck { files: number; rows: number; games: number; problems: string[];
  /** D466 (#184's review): the games whose id check was skipped because `read` could not read the seat's frame log, with that log. */
  skipped?: Array<{ game: string; log: string }> }

/** Every id a token names. */
export function tokenIds(tok: string): number[] {
  return (tok.replace(/#\d+$/, '').match(/\d+/g) ?? []).map(Number);
}

/** Check one rows file's shape; `seen` collects each game's rows by key for the id check. */
export function checkRowsText(text: string, where: string, out: RowsCheck, byGame?: Map<string, { begin: Record<string, unknown> | null; rows: Array<{ seat: string; tokens: string[] }> }>): void {
  out.files++;
  let header = null as { stateSize?: number; cand?: Record<string, string[]> } | null;
  const lines = text.split('\n');
  const bad = (i: number, why: string): void => { if (out.problems.length < 200) out.problems.push(`${where}:${i + 1}: ${why}`); };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (!line.trim()) continue;
    let o: Record<string, unknown>;
    try { o = JSON.parse(line) as Record<string, unknown>; } catch {
      if (i >= lines.length - 2) continue;   // a torn last line: a worker killed mid-write
      bad(i, 'not JSON');
      continue;
    }
    const t = o.type;
    if (t === 'header') { header = o as { stateSize?: number; cand?: Record<string, string[]> }; continue; }
    if (t === 'end') continue;
    if (t === 'begin') {
      if (typeof o.game !== 'string') bad(i, 'begin has no string game key');
      for (const [k, v] of Object.entries(o)) {
        if (v !== null && typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') bad(i, `begin.${k} is not a plain value`);
        if (BEGIN_BANNED.test(k) && !/^deck(File)?[AB]$|^decks?$/.test(k)) bad(i, `begin names a card-bearing key ${k}`);
      }
      if (byGame && typeof o.game === 'string') {
        const g = byGame.get(o.game) ?? { begin: null, rows: [] };
        g.begin = o;
        byGame.set(o.game, g);
      }
      continue;
    }
    if (t !== 'row') { bad(i, `unknown line type ${String(t)}`); continue; }
    out.rows++;
    for (const k of Object.keys(o)) if (!ROW_KEYS.has(k)) bad(i, `unknown row key ${k}`);
    const tokens = o.tokens as unknown;
    const c = o.c as unknown;
    const n = o.n as number;
    if (!Array.isArray(tokens) || tokens.length !== n || !Array.isArray(c) || c.length !== n) { bad(i, 'tokens / c / n disagree'); continue; }
    for (const tok of tokens) if (typeof tok !== 'string' || !TOKEN.test(tok)) bad(i, `token outside the grammar: ${JSON.stringify(tok).slice(0, 60)}`);
    const width = header?.cand?.[o.kind as string]?.length;
    for (const v of c as unknown[]) {
      if (!Array.isArray(v) || v.some((x) => typeof x !== 'number') || (width !== undefined && v.length !== width)) { bad(i, 'a candidate vector is not numbers of the kind\'s width'); break; }
    }
    const s = o.s as unknown;
    const size = header?.stateSize ?? Infinity;
    if (!Array.isArray(s) || s.some((p) => !Array.isArray(p) || p.length !== 2 || !Number.isInteger(p[0]) || p[0] < 0 || p[0] >= size || typeof p[1] !== 'number')) bad(i, 'the state is not [index, number] pairs');
    const ch = o.chosen as number;
    if (!Number.isInteger(ch) || ch < 0 || ch >= n) bad(i, `chosen ${String(ch)} is not a candidate`);
    if (typeof o.seat !== 'string' || typeof o.game !== 'string') bad(i, 'seat / game missing');
    if (byGame && typeof o.game === 'string') {
      const g = byGame.get(o.game) ?? { begin: null, rows: [] };
      g.rows.push({ seat: o.seat as string, tokens: tokens as string[] });
      byGame.set(o.game, g);
    }
  }
  if (!header && out.rows > 0) out.problems.push(`${where}: rows with no header line`);
}

/**
 * The ids a seat's own frame log shows as cards it may see (full, not hidden) -- and, given the viewer's `seat`, the
 * viewer's own tokens the state frames' zone events show born onto its battlefield (`from: null`) whose latest move
 * left them there or in its graveyard: an object made and gone inside one engine step, which no snapshot lists but the
 * seat could act on (D491, the rows' half of D481's first shape; J173 s04's Food Token, made and sacrificed between
 * frames). The window is the whole log: the id is the viewer's own object in a public zone whenever it exists.
 */
export function visibleIds(logText: string, seat?: number): Set<number> {
  const ids = new Set<number>();
  // D491: the viewer's own tokens born between frames (D481's first shape), from the state frames' zone events.
  const born = new Set<number>();
  const latest = new Map<number, { zone?: string; player?: number } | null>();
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) { for (const y of x) walk(y); return; }
    if (x && typeof x === 'object') {
      const o = x as Record<string, unknown>;
      if (typeof o.id === 'number' && o.hidden !== true && typeof o.zone === 'string' && typeof o.name === 'string') ids.add(o.id);
      for (const v of Object.values(o)) walk(v);
    }
  };
  const moves = (frame: unknown): void => {
    if (seat === undefined || !frame || typeof frame !== 'object') return;
    const f = frame as { type?: unknown; body?: { events?: unknown } };
    if (f.type !== 'state' || !Array.isArray(f.body?.events)) return;
    for (const e of f.body.events as Array<Record<string, unknown>>) {
      if (!e || e.kind !== 'zone' || typeof e.cardId !== 'number') continue;
      const to = (e.to && typeof e.to === 'object' ? e.to : null) as { zone?: string; player?: number } | null;
      if (e.from === null && to?.zone === 'battlefield' && to.player === seat) born.add(e.cardId);
      if (to) latest.set(e.cardId, to);   // as the checker: the latest move WITH a destination
    }
  };
  for (const line of logText.split('\n')) {
    if (!line.trim()) continue;
    try { const frame = JSON.parse(line); walk(frame); moves(frame); } catch { /* a torn line: the redaction checker's business */ }
  }
  for (const id of born) {
    const to = latest.get(id);
    if (to && to.player === seat && (to.zone === 'battlefield' || to.zone === 'graveyard')) ids.add(id);
  }
  return ids;
}

export function readMaybeGz(file: string): string {
  const b = fs.readFileSync(file);
  return file.endsWith('.gz') ? zlib.gunzipSync(b).toString('utf8') : b.toString('utf8');
}

/**
 * D466: a frame log a reader can skip.  A worker the pool's watchdog killed mid-branch leaves its two
 * frame logs truncated, and gunzip throws on them ("unexpected end of file", zlib's Z_BUF_ERROR); J156's
 * spine 458 lost its whole end-of-spine check, and so its atlas.json, to two such files.  `read` returns
 * a log's text, or null for one zlib cannot inflate, which it records in `unreadable` with zlib's reason;
 * any other error (a missing file, a permission) still throws.
 */
export function frameLogReader(): { read: (file: string) => string | null; unreadable: Map<string, string> } {
  const unreadable = new Map<string, string>();
  const read = (file: string): string | null => {
    if (unreadable.has(file)) return null;
    try {
      return readMaybeGz(file);
    } catch (e) {
      const code = (e as { code?: unknown }).code;
      if (typeof code !== 'string' || !code.startsWith('Z_')) throw e;
      unreadable.set(file, (e as Error).message);
      return null;
    }
  };
  return { read, unreadable };
}

/**
 * Check every rows-*.jsonl under `rowsDir`; with `logOf(begin, seatIndex)` naming a game's frame log for
 * a seat (or null), also the ids.  The seats are the rows' `seat` names in the begin line's `seat0` /
 * `seat1` order.  `read` reads a log (D466: the atlas passes `frameLogReader`'s, which skips a truncated
 * one -- its rows go unchecked, and the atlas names the log as a problem of its own).
 */
export function checkRowsDir(rowsDir: string, logOf?: (begin: Record<string, unknown>, seat: number) => string | null,
  read: (file: string) => string | null = readMaybeGz): RowsCheck {
  const { out, games } = collectRows(rowsDir, logOf);
  for (const g of games) applyGameIds(out, g.key, checkGameIds(g, read));
  return out;
}

/** D480: one game's rows for the id check, with its two seats' frame logs named (`logOf`, resolved up front: it reads nothing). */
export interface GameIds { key: string; seats: unknown[]; rows: Array<{ seat: string; tokens: string[] }>; logs: Array<string | null> }

/** D480: what one game's id check found: its problems in order (`capped` ones count against the 200), and the log it skipped. */
export interface GameIdsResult { entries: Array<{ capped: boolean; text: string }>; skipped: Array<{ game: string; log: string }> }

/**
 * The shape check of every rows file under `rowsDir` (into `out`), and the games for the id check, in the order checkRowsDir
 * has always walked them (D480: split out so the post-spine checks can hand the games to several workers).
 */
export function collectRows(rowsDir: string, logOf?: (begin: Record<string, unknown>, seat: number) => string | null): { out: RowsCheck; games: GameIds[] } {
  const out: RowsCheck = { files: 0, rows: 0, games: 0, problems: [] };
  if (!fs.existsSync(rowsDir)) return { out, games: [] };
  const byGame = logOf ? new Map<string, { begin: Record<string, unknown> | null; rows: Array<{ seat: string; tokens: string[] }> }>() : undefined;
  for (const f of fs.readdirSync(rowsDir).filter((x) => /^rows-.*\.jsonl$/.test(x)).sort()) {
    checkRowsText(fs.readFileSync(path.join(rowsDir, f), 'utf8'), f, out, byGame);
  }
  const games: GameIds[] = [];
  if (byGame && logOf) {
    for (const [key, g] of byGame) {
      if (!g.begin) continue;
      out.games++;
      games.push({ key, seats: [g.begin.seat0, g.begin.seat1], rows: g.rows, logs: [logOf(g.begin, 0), logOf(g.begin, 1)] });
    }
  }
  return { out, games };
}

/** One game's id check: every id its rows name must be one the deciding seat's own log shows (`read` null: a log it skips). */
export function checkGameIds(g: GameIds, read: (file: string) => string | null): GameIdsResult {
  const res: GameIdsResult = { entries: [], skipped: [] };
  let capped = 0;
  const vis = new Map<number, Set<number> | null>();
  for (const r of g.rows) {
    const k = g.seats.indexOf(r.seat);
    if (k < 0) { res.entries.push({ capped: false, text: `${g.key}: a row from seat ${r.seat}, which the begin line does not name` }); continue; }
    if (!vis.has(k)) {
      const log = g.logs[k] ?? null;
      const text = log && fs.existsSync(log) ? read(log) : null;   // D466: null for a log the reader cannot inflate
      if (log && text === null && fs.existsSync(log)) res.skipped.push({ game: g.key, log });
      vis.set(k, text === null ? null : visibleIds(text, k));   // D491: seat k's own born tokens count as shown
    }
    const v = vis.get(k);
    if (!v) continue;
    for (const tok of r.tokens) {
      for (const id of tokenIds(tok)) {
        // at most 200 a game: the whole check keeps 200
        if (!v.has(id) && capped < 200) { res.entries.push({ capped: true, text: `${g.key}: seat ${r.seat}'s row names id ${id} (${tok}), which its own log never shows it` }); capped++; }
      }
    }
  }
  return res;
}

/** One game's id check into `out`, as checkRowsDir has always written it: the capped problems only while the check holds fewer than 200. */
export function applyGameIds(out: RowsCheck, _key: string, r: GameIdsResult): void {
  for (const e of r.entries) if (!e.capped || out.problems.length < 200) out.problems.push(e.text);
  if (r.skipped.length) (out.skipped ??= []).push(...r.skipped);
}

/** Bytes each game's lines take in the rows files of `rowsDir` (begin, rows and end), by game key. */
export function rowBytesByGame(rowsDir: string): Map<string, number> {
  const m = new Map<string, number>();
  if (!fs.existsSync(rowsDir)) return m;
  for (const f of fs.readdirSync(rowsDir).filter((x) => /^rows-.*\.jsonl$/.test(x))) {
    for (const line of fs.readFileSync(path.join(rowsDir, f), 'utf8').split('\n')) {
      if (!line) continue;
      const k = /"game":"([^"]*)"/.exec(line)?.[1];
      if (k) m.set(k, (m.get(k) ?? 0) + Buffer.byteLength(line) + 1);
    }
  }
  return m;
}
