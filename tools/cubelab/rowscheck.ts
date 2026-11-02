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
//      D499: a game is ONE play -- the rows between a `begin` and its `end` in the same rows file.  A killed worker leaves a
//      `begin` with no `end`; when its key ended in another file (D465's re-run), that play is abandoned and left out
//      (`abandoned`).  A play that ended `ok:false` beside one that ended `ok:true` (census-play's retry of a stuck game) is
//      superseded and left out (`superseded`); a key that ended `ok:true` in two files is a problem (`playedTwice`); a row
//      outside any begin..end of its key in its file is counted (`orphanRows`), never id-checked.
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
  skipped?: Array<{ game: string; log: string }>;
  /**
   * D499: the plays a killed attempt abandoned -- a `begin` with no `end` after it in its own rows file, whose game key has a
   * play that ended in another file (D465's re-run of the unit) -- with the file and the rows each holds. Their rows are left out
   * of the id check (the frame logs on disk are the re-run's). Set by collectRows when it collects games for the id check.
   */
  abandoned?: Array<{ game: string; file: string; rows: number }>;
  /**
   * D499 (the review): the plays that ended `ok:false` in a file while their key ended `ok:true` in another -- census-play's
   * retry of a game that timed out and whose thread would not stop (CubeLab writes the `end`, the worker exits 3, the pool
   * calls it an engine error, census retries it under the same key) -- with the file and the rows each holds; left out of the
   * id check, never a problem.
   */
  superseded?: Array<{ game: string; file: string; rows: number }>;
  /** D499: the game keys that ended `ok:true` in more than one rows file, with those files: one key, two games; each a problem. */
  playedTwice?: Array<{ game: string; files: string[] }>;
  /** D499 (the review): rows outside any `begin`..`end` of their key in their file (no writer makes one); counted, never id-checked. */
  orphanRows?: number }

/**
 * D499: one play of a game in one rows file -- its `begin`, its rows, and whether its `end` followed in that file. A game's rows
 * are the rows between a `begin` and its `end` in the SAME file: a worker writes one game at a time into its own
 * rows-<pid>.jsonl, and a worker the pool killed leaves a `begin` there with no `end`.
 */
export interface RowsPlay { key: string; file: string; begin: Record<string, unknown>; rows: Array<{ seat: string; tokens: string[] }>; ended: boolean;
  /** The `end` line's `ok` (null while the play has not ended). */
  ok: boolean | null }

/** Every id a token names. */
export function tokenIds(tok: string): number[] {
  return (tok.replace(/#\d+$/, '').match(/\d+/g) ?? []).map(Number);
}

/**
 * Check one rows file's shape; `plays` (D499) collects the file's plays, in order, for the id check: a `begin` opens its key's
 * play, a row joins its key's open play, an `end` closes it; a play still open at the end of the file (or when its key begins
 * again in the same file) never ended. A row whose key has no open play -- before its begin, or after its end -- is an orphan:
 * counted (`out.orphanRows`), never id-checked (before D499 it joined its key's merged game); no writer makes one. An `end` with
 * no open play (a branch whose game never began) closes nothing.
 */
export function checkRowsText(text: string, where: string, out: RowsCheck, plays?: RowsPlay[]): void {
  out.files++;
  const open = new Map<string, RowsPlay>();
  const playOf = (key: string, begin: Record<string, unknown>): void => {
    const p: RowsPlay = { key, file: where, begin, rows: [], ended: false, ok: null };
    plays?.push(p);
    open.set(key, p);
  };
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
    if (t === 'end') {
      const p = typeof o.game === 'string' ? open.get(o.game) : undefined;
      if (p) { p.ended = true; p.ok = o.ok === true; open.delete(p.key); }
      continue;
    }
    if (t === 'begin') {
      if (typeof o.game !== 'string') bad(i, 'begin has no string game key');
      for (const [k, v] of Object.entries(o)) {
        if (v !== null && typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') bad(i, `begin.${k} is not a plain value`);
        if (BEGIN_BANNED.test(k) && !/^deck(File)?[AB]$|^decks?$/.test(k)) bad(i, `begin names a card-bearing key ${k}`);
      }
      if (typeof o.game === 'string') playOf(o.game, o);   // D499: a begin again in one file leaves the earlier play unended
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
    if (typeof o.game === 'string') {
      const p = open.get(o.game);
      if (!p) out.orphanRows = (out.orphanRows ?? 0) + 1;   // D499 (the review): outside any begin..end of its key
      else if (plays) p.rows.push({ seat: o.seat as string, tokens: tokens as string[] });
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
 * D499: which of a key's plays are its game, from each play's `end` alone (nothing in a rows folder orders plays across files).
 *   - no play ended: every play is kept -- the truncated case (the night ended on it, or its unit was given up), as before;
 *   - some play ended `ok:true`: those are the game; the plays that never ended are abandoned (a killed attempt's, D465's
 *     re-run replayed it over frame logs it rewrote) and those that ended `ok:false` are superseded (census-play's retry of a
 *     stuck game); two `ok:true` ends are a key played twice;
 *   - plays ended, none `ok:true`: the ended plays are kept (each checked on its own: a game that timed out twice, which census
 *     retries under one key, or an atlas branch the 120 s timeout ended) and the unended ones abandoned; never a problem.
 * Generic over the play so rowBytesByGame picks the same plays.
 */
export function gamePlays<P extends { ended: boolean; ok: boolean | null }>(plays: P[]): { kept: P[]; abandoned: P[]; superseded: P[]; twice: boolean } {
  const ended = plays.filter((p) => p.ended);
  if (!ended.length) return { kept: plays, abandoned: [], superseded: [], twice: false };
  const abandoned = plays.filter((p) => !p.ended);
  const good = ended.filter((p) => p.ok === true);
  if (!good.length) return { kept: ended, abandoned, superseded: [], twice: false };
  return { kept: good, abandoned, superseded: ended.filter((p) => p.ok !== true), twice: good.length > 1 };
}

/**
 * The shape check of every rows file under `rowsDir` (into `out`), and the games for the id check, in the order checkRowsDir
 * has always walked them (D480: split out so the post-spine checks can hand the games to several workers).  D499: a game is
 * one play's rows, never a key's rows from several files merged -- see gamePlays; the abandoned and superseded plays and the
 * keys played twice go into `out` (a key played twice is a problem; each of its plays is id-checked on its own).
 */
export function collectRows(rowsDir: string, logOf?: (begin: Record<string, unknown>, seat: number) => string | null): { out: RowsCheck; games: GameIds[] } {
  const out: RowsCheck = { files: 0, rows: 0, games: 0, problems: [] };
  if (!fs.existsSync(rowsDir)) return { out, games: [] };
  const plays: RowsPlay[] | undefined = logOf ? [] : undefined;
  for (const f of fs.readdirSync(rowsDir).filter((x) => /^rows-.*\.jsonl$/.test(x)).sort()) {
    checkRowsText(fs.readFileSync(path.join(rowsDir, f), 'utf8'), f, out, plays);
  }
  const games: GameIds[] = [];
  if (plays && logOf) {
    const byKey = new Map<string, RowsPlay[]>();   // in the order the keys first appear, as the games always were
    for (const p of plays) { const ps = byKey.get(p.key); if (ps) ps.push(p); else byKey.set(p.key, [p]); }
    out.abandoned = [];
    out.superseded = [];
    out.playedTwice = [];
    out.orphanRows ??= 0;
    for (const [key, ps] of byKey) {
      const { kept, abandoned, superseded, twice } = gamePlays(ps);
      for (const p of abandoned) out.abandoned.push({ game: key, file: p.file, rows: p.rows.length });
      for (const p of superseded) out.superseded.push({ game: key, file: p.file, rows: p.rows.length });
      if (twice) {
        const files = kept.map((p) => p.file);
        out.playedTwice.push({ game: key, files });
        if (out.problems.length < 200) out.problems.push(`${key}: ended ok:true ${kept.length} times (${files.join(', ')}) -- one game key, ${kept.length} games (D499); each play's ids checked on its own`);
      }
      for (const p of kept) {
        const b = p.begin as Record<string, unknown>;
        out.games++;
        games.push({ key, seats: [b.seat0, b.seat1], rows: p.rows, logs: [logOf(b, 0), logOf(b, 1)] });
      }
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

/**
 * Bytes each game's lines take in the rows files of `rowsDir` (begin, rows and end), by game key.  D499: per play, as the id
 * check reads them -- the plays gamePlays keeps (a killed attempt's unended play and a superseded `ok:false` one are not
 * counted; a row outside any begin..end is not counted), and of those the largest, so a game's size is one play's even when
 * it kept two (a game that timed out twice, or a key played twice, which the check makes a problem).
 */
export function rowBytesByGame(rowsDir: string): Map<string, number> {
  const m = new Map<string, number>();
  if (!fs.existsSync(rowsDir)) return m;
  type BytesPlay = { bytes: number; ended: boolean; ok: boolean | null };
  const byKey = new Map<string, BytesPlay[]>();
  for (const f of fs.readdirSync(rowsDir).filter((x) => /^rows-.*\.jsonl$/.test(x))) {
    const open = new Map<string, BytesPlay>();
    for (const line of fs.readFileSync(path.join(rowsDir, f), 'utf8').split('\n')) {
      if (!line) continue;
      const k = /"game":"([^"]*)"/.exec(line)?.[1];
      if (!k) continue;
      const n = Buffer.byteLength(line) + 1;
      const t = /^\{"type":"(begin|end)"/.exec(line)?.[1];
      if (t === 'begin') {
        const p: BytesPlay = { bytes: n, ended: false, ok: null };
        open.set(k, p);
        const ps = byKey.get(k);
        if (ps) ps.push(p); else byKey.set(k, [p]);
        continue;
      }
      const p = open.get(k);
      if (!p) continue;   // an orphan row, or an end with no begin: no play
      p.bytes += n;
      if (t === 'end') { p.ended = true; p.ok = /"ok":true/.test(line); open.delete(k); }
    }
  }
  for (const [k, ps] of byKey) m.set(k, Math.max(...gamePlays(ps).kept.map((p) => p.bytes)));
  return m;
}
