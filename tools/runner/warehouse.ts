// mtg-table — the lab runner: the public, sanitised copy of the lab warehouse's summary (D363).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// `python3 tools/lab/warehouse.py export` writes var/warehouse/warehouse.json
// (schema 1).  The runner publishes a copy beside status.json and ladder.json
// on ForgeCoach's public `lab-status` branch, for the `#lab/data` page,
// whenever the file changes.  This module is that copy's ALLOWLIST, as
// ladder.ts is the ladder's.
//
// Schema 1 (fixed with ForgeCoach's page):
//   schema, generatedAt, warehouseVer,
//   tables[] {name, rows, bytes},
//   nights[] {night (int, or a word such as "other"), drafts, games, recorded, quarantined, engineErrors},
//   archive {gzipBytes, zstdBytes} | null,  disk {freeGB, usedPct} | null,
//   cubes[] {cube, drafts, games, avgTurns, onPlayWinRate},
//   pairs[] {cube, pair, games, winRate, lo, hi},
//   cards[] {cube, card, games, winRate, lo, hi}.
// Everything else is dropped.  Counts are non-negative integers; rates, lo and
// hi are in [0, 1] (a row with one outside is dropped).  Strings are checked
// against patterns: a table name and a cube id are lower-case tokens, a pair
// is WUBRG letters, a card name is letters, digits, spaces and the punctuation
// card names use (`//` only as a split card's " // "), at most 60 characters.
// No deck, seed, pick, hand, path or recording can pass: there is no field for
// one, and a card name never holds `/` otherwise, `@`, `\` or a control
// character.  warehouse.py's export names cards only as the cube documents do.

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const TABLE = /^[a-z][a-z_]{0,29}$/;
const CUBE = /^[a-z0-9][a-z0-9:+-]{0,59}$/;
const PAIR = /^[WUBRG]{1,5}$/;
const VER = /^[A-Za-z0-9._-]{1,40}$/;
const NIGHT_WORD = /^[a-z]{1,12}$/;
/** Card names as the cube documents write them: letters (any script), digits, spaces, , ' ’ - : ! ? . ( ) & + and " // ". */
const CARD = /^[\p{L}\p{N}][\p{L}\p{N} ,'’:!?.()&+-]{0,59}$/u;
const MAX = { tables: 40, nights: 500, cubes: 60, pairs: 60 * 32, cards: 60 * 50 };

export interface PublicWarehouse {
  schema: 1;
  generatedAt: string;
  warehouseVer: string;
  tables: Array<{ name: string; rows: number; bytes: number }>;
  nights: Array<{ night: number | string; drafts: number; games: number; recorded: number; quarantined: number; engineErrors: number }>;
  archive: { gzipBytes: number; zstdBytes: number } | null;
  disk: { freeGB: number; usedPct: number } | null;
  cubes: Array<{ cube: string; drafts: number; games: number; avgTurns: number | null; onPlayWinRate: number | null }>;
  pairs: Array<{ cube: string; pair: string; games: number; winRate: number; lo: number; hi: number }>;
  cards: Array<{ cube: string; card: string; games: number; winRate: number; lo: number; hi: number }>;
}

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
/** A count: a non-negative integer, else null. */
const count = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= Number.MAX_SAFE_INTEGER ? v : null);
const rate = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : null);
const pos = (v: unknown, max = 1e9): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : null);
const tok = (v: unknown, re: RegExp): string | null => (typeof v === 'string' && re.test(v) ? v : null);

export function cardName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const parts = v.split(' // ');
  if (parts.length > 2 || v.length > 60) return null;
  return parts.every((p) => CARD.test(p)) ? v : null;
}

/** null when the input is not a warehouse.json of schema 1. */
export function sanitiseWarehouse(raw: unknown): PublicWarehouse | null {
  const d = obj(raw);
  if (d.schema !== 1) return null;
  const generatedAt = typeof d.generatedAt === 'string' && ISO.test(d.generatedAt) ? d.generatedAt : null;
  const warehouseVer = tok(d.warehouseVer, VER);
  if (!generatedAt || !warehouseVer) return null;
  const tables = arr(d.tables).slice(0, MAX.tables).flatMap((x) => {
    const t = obj(x);
    const name = tok(t.name, TABLE), rows = count(t.rows), bytes = count(t.bytes);
    return name && rows !== null && bytes !== null ? [{ name, rows, bytes }] : [];
  });
  const nights = arr(d.nights).slice(0, MAX.nights).flatMap((x) => {
    const n = obj(x);
    const night = count(n.night) ?? tok(n.night, NIGHT_WORD);
    const drafts = count(n.drafts), games = count(n.games), recorded = count(n.recorded);
    const quarantined = count(n.quarantined), engineErrors = count(n.engineErrors);
    if (night === null || drafts === null || games === null || recorded === null || quarantined === null || engineErrors === null) return [];
    return [{ night, drafts, games, recorded, quarantined, engineErrors }];
  });
  const a = d.archive ? obj(d.archive) : null;
  const archive = a && count(a.gzipBytes) !== null && count(a.zstdBytes) !== null ? { gzipBytes: a.gzipBytes as number, zstdBytes: a.zstdBytes as number } : null;
  const k = d.disk ? obj(d.disk) : null;
  const disk = k && pos(k.freeGB, 1e7) !== null && pos(k.usedPct, 100) !== null ? { freeGB: k.freeGB as number, usedPct: k.usedPct as number } : null;
  const cubes = arr(d.cubes).slice(0, MAX.cubes).flatMap((x) => {
    const c = obj(x);
    const cube = tok(c.cube, CUBE), drafts = count(c.drafts), games = count(c.games);
    if (!cube || drafts === null || games === null) return [];
    return [{ cube, drafts, games, avgTurns: c.avgTurns === null ? null : pos(c.avgTurns, 1000), onPlayWinRate: c.onPlayWinRate === null ? null : rate(c.onPlayWinRate) }];
  });
  const rated = <T extends Record<string, unknown>>(x: unknown, key: string, check: (v: unknown) => string | null): Array<T> => {
    const r = obj(x);
    const cube = tok(r.cube, CUBE), label = check(r[key]), games = count(r.games), winRate = rate(r.winRate), lo = rate(r.lo), hi = rate(r.hi);
    if (!cube || !label || games === null || winRate === null || lo === null || hi === null || lo > hi) return [];
    return [{ cube, [key]: label, games, winRate, lo, hi } as unknown as T];
  };
  const pairs = arr(d.pairs).slice(0, MAX.pairs).flatMap((x) => rated<PublicWarehouse['pairs'][number]>(x, 'pair', (v) => tok(v, PAIR)));
  const cards = arr(d.cards).slice(0, MAX.cards).flatMap((x) => rated<PublicWarehouse['cards'][number]>(x, 'card', cardName));
  return { schema: 1, generatedAt, warehouseVer, tables, nights, archive, disk, cubes, pairs, cards };
}
