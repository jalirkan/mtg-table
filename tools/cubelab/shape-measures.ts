// mtg-table — the cube lab: the shape measures (D446 point 6) for `compare`, `report` and `cubelab.sh shapes`.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Read from compare.ts's draft units (one per draft, both played decks), every measure a flat key:
//
//   cc<g>_all|_forced|_unforced   the decks' MATCH win rate (matches won over decisive matches; a drawn match
//                                 left out) by the deck's colour count g -- its main colours, a splash not
//                                 counted: cc1, cc2, cc3, cc4p (four or five) -- over all decks, the seats the
//                                 shape exploration forced, and the rest
//   spread                        max - min of cc<g>_all over the colour counts with min-pair-games decisive
//                                 matches (its bootstrap recentred, as D441 recentres pair_spread)
//   pw5_cc<g>                     the share of colour combinations (the deck's main colours) with
//                                 min-pair-games decisive GAMES whose game win rate is within 5 points of 50%
//   flow_cc<g>, flow_<shape>      the mean card-flow count of a played deck (cardflow.ts), by colour count (all
//                                 decks) and by shape (the by-shape decks below); only when the run marked flow
//   label_<shape>                 BY SHAPE: the decks of seats drafted and built to the shape (forced, or given it
//                                 by --shape-a/-b; a fallback deck is not one), their match win rate, a match
//                                 between two seats of the same non-auto shape left out; label_auto: the auto seats
//   fallback_<shape>              the share of that shape's seats whose shape had no build (today's deck played)
//
// Each with its 95% percentile interval from a draft-clustered bootstrap (a replicate draws whole drafts) and `n`,
// its denominator (decisive matches; decks for flow; colour combinations for pw5; seats for fallback).  Pure.

import type { DraftUnit } from './compare.ts';
import type { Shape } from './shapes.ts';
import { rng } from './rng.ts';

export const CC_KEYS = ['cc1', 'cc2', 'cc3', 'cc4p'] as const;
export const LABELS = ['mono', 'two-colour', 'three-colour', 'good-stuff', 'auto'] as const;
/** A shape as a key: `two-colour` -> `two_colour`. */
export const labelKey = (s: string): string => s.replace(/-/g, '_');
export const ccOf = (main: number): string | null => (main <= 0 ? null : main >= 4 ? 'cc4p' : `cc${main}`);

export interface ShapeOptions { minPairGames: number }

/** Sums for one multiset of drafts; `values` turns them into the measures. */
function sums(drafts: DraftUnit[]): Map<string, [number, number]> {
  const m = new Map<string, [number, number]>();
  const add = (k: string, a: number, b: number): void => { const t = m.get(k) ?? [0, 0]; t[0] += a; t[1] += b; m.set(k, t); };
  for (const d of drafts) {
    const [x, y] = d.decks;
    const mirror = x.shape !== undefined && x.shape === y.shape && x.shape !== 'auto' && !x.fallback && !y.fallback;
    for (const deck of d.decks) {
      const cc = ccOf(deck.main);
      const decisive = deck.match === 'W' || deck.match === 'L';
      const won = deck.match === 'W' ? 1 : 0;
      if (cc && decisive) {
        add(`${cc}_all`, won, 1);
        if (deck.shape !== undefined) add(`${cc}_${deck.forced ? 'forced' : 'unforced'}`, won, 1);
      }
      if (cc && deck.decisive > 0) add(`combo:${cc}:${deck.key}`, deck.wins, deck.decisive);
      if (cc && deck.flow !== null && deck.flow !== undefined) add(`flow_${cc}`, deck.flow, 1);
      if (deck.shape === undefined) continue;
      const lk = labelKey(deck.shape);
      if (deck.shape !== 'auto') add(`fallback_${lk}`, deck.fallback ? 1 : 0, 1);
      if (deck.fallback) continue;
      if (deck.flow !== null && deck.flow !== undefined) add(`flow_${lk}`, deck.flow, 1);
      if (!mirror && decisive) add(`label_${lk}`, won, 1);
    }
  }
  return m;
}

/** The measures of a multiset of drafts (a key with no denominator is absent), and each one's n. */
export function shapeValues(drafts: DraftUnit[], o: ShapeOptions): { v: Record<string, number>; n: Record<string, number> } {
  const s = sums(drafts);
  const v: Record<string, number> = {};
  const n: Record<string, number> = {};
  const combos = new Map<string, number[]>();
  for (const [k, [a, b]] of s) {
    if (k.startsWith('combo:')) {
      const cc = k.split(':')[1] as string;
      if (b >= o.minPairGames) (combos.get(cc) ?? combos.set(cc, []).get(cc) as number[]).push(a / b);
      continue;
    }
    if (b > 0) { v[k] = a / b; n[k] = b; }
  }
  const rates = CC_KEYS.filter((cc) => (n[`${cc}_all`] ?? 0) >= o.minPairGames).map((cc) => v[`${cc}_all`] as number);
  if (rates.length >= 2) { v.spread = Math.max(...rates) - Math.min(...rates); n.spread = rates.length; }
  for (const [cc, rs] of combos) {
    v[`pw5_${cc}`] = rs.filter((r) => Math.abs(r - 0.5) <= 0.05 + 1e-12).length / rs.length;
    n[`pw5_${cc}`] = rs.length;
  }
  return { v, n };
}

export interface ShapeInterval { est?: number; lo?: number; hi?: number; valid: number; n: number }

function q7(xs: number[], q: number): number {
  const pos = (xs.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return (xs[lo] as number) + ((xs[hi] as number) - (xs[lo] as number)) * (pos - lo);
}

/**
 * Every shape measure with its 95% interval.  `picks` are the bootstrap's replicates as draft indices (compare passes
 * its own, so the shape intervals are on the same replicates as D441's measures); without them, `boot` replicates from
 * rng(bootSeed, 'shapes:bootstrap').
 */
export function shapeTable(drafts: DraftUnit[], o: ShapeOptions & { boot: number; bootSeed: number }, picks?: number[][]): Record<string, ShapeInterval> {
  const { v, n } = shapeValues(drafts, o);
  let reps: number[][] = picks ?? [];
  if (!picks) {
    const r = rng(o.bootSeed, 'shapes:bootstrap');
    reps = Array.from({ length: o.boot }, () => Array.from({ length: drafts.length }, () => r.int(drafts.length)));
  }
  const repVals = reps.map((p) => shapeValues(p.map((i) => drafts[i] as DraftUnit), o).v);
  // spread is a max minus a min: recentred on its estimate, as D441 recentres pair_spread
  if (v.spread !== undefined) {
    const ok = repVals.map((x) => x.spread).filter((x): x is number => x !== undefined);
    const shift = ok.length ? ok.reduce((t, x) => t + x, 0) / ok.length - v.spread : 0;
    for (const x of repVals) if (x.spread !== undefined) x.spread = Math.min(1, Math.max(0, x.spread - shift));
  }
  const keys = new Set<string>([...Object.keys(v), ...repVals.flatMap((x) => Object.keys(x))]);
  const out: Record<string, ShapeInterval> = {};
  for (const k of [...keys].sort()) {
    const ok = repVals.map((x) => x[k]).filter((x): x is number => x !== undefined && Number.isFinite(x)).sort((a, b) => a - b);
    const iv: ShapeInterval = { valid: ok.length, n: n[k] ?? 0 };
    if (v[k] !== undefined) iv.est = v[k];
    if (ok.length >= 2) { iv.lo = q7(ok, 0.025); iv.hi = q7(ok, 0.975); }
    out[k] = iv;
  }
  return out;
}

/** J140's labels from a by-shape interval (D446 point 7): VIABLE iff it contains 0.5, DOMINANT iff wholly above `dominant`, NOT VIABLE iff wholly below `notViable`; none under `minN` decisive matches. */
export function shapeLabels(iv: ShapeInterval | undefined, t: { viable: number; dominant: number; notViable: number; minN?: number }): { viable: number; dominant: number; not_viable: number; read: number } {
  // a row with fewer than minN decisive matches (default 30, compare's min-pair-games) gets no label: its interval is not one
  if (!iv || iv.lo === undefined || iv.hi === undefined || iv.n < (t.minN ?? 30)) return { viable: 0, dominant: 0, not_viable: 0, read: 0 };
  return { viable: iv.lo <= t.viable && iv.hi >= t.viable ? 1 : 0, dominant: iv.lo > t.dominant ? 1 : 0, not_viable: iv.hi < t.notViable ? 1 : 0, read: 1 };
}

const pct = (x: number | undefined): string => (x === undefined ? '-' : (x * 100).toFixed(1));

/** A markdown block of one population's shape table. */
export function shapeTableMd(t: Record<string, ShapeInterval>, flowOn: boolean): string[] {
  const L: string[] = [];
  const row = (label: string, k: string, unit = '%'): string => {
    const x = t[k];
    if (!x || x.est === undefined) return `| ${label} | - | - | ${x?.n ?? 0} |`;
    const f = unit === '%' ? pct : (y: number | undefined) => (y === undefined ? '-' : y.toFixed(2));
    return `| ${label} | ${f(x.est)} | ${x.lo !== undefined ? `[${f(x.lo)}, ${f(x.hi)}]` : '-'} | ${x.n} |`;
  };
  L.push('Match win rate by the played deck\'s colour count (main colours; a splash not counted), over decisive matches:');
  L.push('');
  L.push('| colours | all | forced | unforced |');
  L.push('|---|---|---|---|');
  for (const cc of CC_KEYS) {
    const cell = (k: string): string => { const x = t[k]; return x?.est === undefined ? '-' : `${pct(x.est)} ${x.lo !== undefined ? `[${pct(x.lo)}, ${pct(x.hi)}]` : ''} (${x.n})`; };
    L.push(`| ${cc === 'cc4p' ? '4+' : cc.slice(2)} | ${cell(`${cc}_all`)} | ${cell(`${cc}_forced`)} | ${cell(`${cc}_unforced`)} |`);
  }
  L.push('');
  L.push(`Spread (max - min over colour counts with enough matches): ${t.spread?.est === undefined ? '-' : `${pct(t.spread.est)} points [${pct(t.spread.lo)}, ${pct(t.spread.hi)}]`}.`);
  L.push('');
  L.push('| measure | estimate | 95% interval | n |');
  L.push('|---|---|---|---|');
  for (const cc of CC_KEYS) L.push(row(`colour combinations within 5 points of 50%, ${cc === 'cc4p' ? '4+' : cc.slice(2)} colours`, `pw5_${cc}`));
  for (const s of LABELS) L.push(row(`by shape: ${s} (match win rate; built to the shape, no mirror)`, `label_${labelKey(s)}`));
  for (const s of LABELS.filter((x) => x !== 'auto')) L.push(row(`fallback rate: ${s}`, `fallback_${labelKey(s)}`));
  if (flowOn) {
    for (const cc of CC_KEYS) L.push(row(`card flow per deck, ${cc === 'cc4p' ? '4+' : cc.slice(2)} colours`, `flow_${cc}`, 'n'));
    for (const s of LABELS) L.push(row(`card flow per deck, ${s}`, `flow_${labelKey(s)}`, 'n'));
  }
  return L;
}

/** The shape measures as compare.json's numbers: {key: {est, lo, hi, valid, n}}. */
export function shapeJson(t: Record<string, ShapeInterval>): Record<string, Record<string, number>> {
  const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
  const out: Record<string, Record<string, number>> = {};
  for (const [k, x] of Object.entries(t)) {
    const o: Record<string, number> = { valid: x.valid, n: x.n };
    if (x.est !== undefined) o.est = r6(x.est);
    if (x.lo !== undefined) o.lo = r6(x.lo);
    if (x.hi !== undefined) o.hi = r6(x.hi);
    out[k] = o;
  }
  return out;
}

/** What shape a draft line's drafter had (undefined: the run had shapes off). */
export function deckShape(dr: { shape?: Shape; shapeForced?: boolean; shapeFallback?: true }): { shape?: Shape; forced: boolean; fallback: boolean } {
  return { ...(dr.shape !== undefined ? { shape: dr.shape } : {}), forced: !!dr.shapeForced, fallback: !!dr.shapeFallback };
}
