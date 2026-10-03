/*
 * mtg-table — arena/personal.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The personal tier, as the arena reads it** (phase 2 — **D194**, **D195**;
 * the tier itself is **D190**, `docs/guides/personal-tier.md` its manual).
 *
 * The personal tier is `personal/models/<slug>/`: rigged models of the actual
 * characters that the user downloaded for their own use, gitignored, never
 * committed, published or sold. The Vite DEV server alone builds an index of the
 * ones `tools/personal/check.mjs` passed and serves it and their `model.glb`
 * (`web/src/personal/devRoute.ts`, D92's rule); `scene/personalModels.ts` fetches
 * both, under `import.meta.env.DEV`, so a build carries none of it. This module is
 * the pure half — no three, no React, no DOM, no clock (`liveness.test.ts`):
 *
 *  - {@link personalOverlayOf} is THE reader of the index. Every entry is checked
 *    (a same-origin relative `.glb` path, a triangle and a draw-call count, a card
 *    or a seat), and one over `perf.ts`'s caps is dropped with its reason — since
 *    D240 a model is one draw call a figure, and an entry of more is dropped. Each
 *    entry's id is OPAQUE (`p0`, `p1`, … in the index's order): nothing in the
 *    arena ever holds a slug, and no id reaches an op log, a label or the wire.
 *  - {@link personalChoicesOf} is THE lookup, and it is hard rule 8's renderer
 *    half for this tier: a personal model is a statement about what a card is,
 *    so the lookup keys off the card's FACE-UP name and runs only where
 *    `figurePose` already places a NAMED figure. A face-down card, a redacted
 *    stub, an anonymous figure, a swarm, a silhouette — each is decided before
 *    the name is read, so the overlay is never asked about it
 *    (`personal.test.ts` sweeps the corpus with a hostile overlay that answers
 *    every name, negative-controlled).
 *  - {@link dressPoses} turns a choice into a POSE once its model has loaded:
 *    the opaque id, no props, no costume, no hair (the model brings its own look;
 *    ours are not added), and the height refitted to the model's own resting
 *    width — `layout.ts`'s width clamp stays strict (D65). Everything else about
 *    the pose is ours: the stand point, the stance, the kneel, the translucency
 *    of the summoning-sick, the departure, the offsets.
 */

import { isHidden } from '../protocol.ts';
import { budgetOrderOf, fitHeight, type FigureLayout, type FigurePose } from './figures/pose.ts';
import { restModelId } from './figures/rests.ts';
import type { Layout, Placement, Seat } from './layout.ts';
import { PERSONAL_CALL_CAP, PERSONAL_MAX_FIGURES, PERSONAL_TABLE_TRIS, PERSONAL_TRI_CAP } from './perf.ts';

/** One personal model the arena may load. */
export interface PersonalEntry {
  /** Opaque (`p0`, `p1`, …): the index's order. Never a slug, a file name or a card name. */
  readonly id: string;
  /** Same-origin and relative — the dev route's path to its `model.glb`. */
  readonly url: string;
  /** Triangles after prepare's decimation. */
  readonly triangles: number;
  /** The draw calls a figure costs: one since D240 (prepare's paint step folds every paint into one atlas). */
  readonly calls: number;
  /** The credit line the model's licence asks for (shown in the workshop only). */
  readonly credits: string;
}

/** What the index says, read once: which name and which seat wear which model. */
export interface PersonalOverlay {
  readonly entries: readonly PersonalEntry[];
  /** Exact card name → its model. */
  readonly cards: ReadonlyMap<string, PersonalEntry>;
  /** Duelist seat → its model (`you` wears the director's look, `opp` the villain's, D99). */
  readonly seats: ReadonlyMap<Seat, PersonalEntry>;
  /** Entries the index listed and this reader left out, and why (the workshop says so). */
  readonly skipped: readonly string[];
  /** Models the index itself skipped (disabled, failed check, …), with the index's reasons. */
  readonly withheld: readonly string[];
}

export const EMPTY_PERSONAL: PersonalOverlay = Object.freeze({
  entries: Object.freeze([]) as readonly PersonalEntry[],
  cards: new Map<string, PersonalEntry>(),
  seats: new Map<Seat, PersonalEntry>(),
  skipped: Object.freeze([]) as readonly string[],
  withheld: Object.freeze([]) as readonly string[],
});

const SEAT_OF: Readonly<Record<string, Seat>> = Object.freeze({ you: 'you', opp: 'opp', director: 'you', villain: 'opp' });

/**
 * **A path the arena may load a model from**: relative (no scheme, no `//`, no
 * leading `/`), no `..`, no query, ending in `.glb` — so an index can never point
 * the loader off this origin or out of the route.
 */
export function isLocalModelPath(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    /^[A-Za-z0-9._/-]+\.glb$/.test(path) &&
    !path.startsWith('/') &&
    !path.split('/').some((segment) => segment === '..' || segment === '' || segment === '.')
  );
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

/**
 * **THE reader of the dev route's index** (`personal/index.json`). Anything that
 * is not the index's shape is the empty overlay; an entry that is not a valid
 * entry, or is over `perf.ts`'s caps, is left out and named in `skipped`. The
 * first entry to name a card or a seat keeps it (the route already resolves
 * conflicts in slug order; this holds if two entries ever still collide).
 */
export function personalOverlayOf(raw: unknown): PersonalOverlay {
  if (!isRecord(raw) || raw['version'] !== 1 || !Array.isArray(raw['models'])) return EMPTY_PERSONAL;
  const entries: PersonalEntry[] = [];
  const cards = new Map<string, PersonalEntry>();
  const seats = new Map<Seat, PersonalEntry>();
  const skipped: string[] = [];
  raw['models'].forEach((model: unknown, i: number) => {
    const where = `models[${String(i)}]`;
    if (!isRecord(model)) return void skipped.push(`${where}: not an object`);
    const url = model['model'];
    if (!isLocalModelPath(url)) return void skipped.push(`${where}: its model path is not a same-origin relative .glb`);
    const triangles = model['triangles'];
    const calls = model['calls'];
    if (!isCount(triangles) || !isCount(calls) || calls === 0) return void skipped.push(`${where}: no triangle or draw-call count`);
    if (triangles > PERSONAL_TRI_CAP) {
      return void skipped.push(`${where}: ${String(triangles)} triangles, over PERSONAL_TRI_CAP (${String(PERSONAL_TRI_CAP)})`);
    }
    if (calls > PERSONAL_CALL_CAP) {
      return void skipped.push(`${where}: ${String(calls)} draw calls a figure, over PERSONAL_CALL_CAP (${String(PERSONAL_CALL_CAP)}) — prepare it again (D240)`);
    }
    const names = Array.isArray(model['cards']) ? model['cards'].filter((c): c is string => typeof c === 'string' && c !== '') : [];
    const seatNames = Array.isArray(model['seats']) ? model['seats'].filter((s): s is string => typeof s === 'string') : [];
    const seatList = seatNames.map((s) => SEAT_OF[s]).filter((s): s is Seat => s !== undefined);
    if (names.length === 0 && seatList.length === 0) return void skipped.push(`${where}: dresses no card and no seat`);
    const entry: PersonalEntry = Object.freeze({
      id: `p${String(entries.length)}`,
      url,
      triangles,
      calls,
      credits: typeof model['credits'] === 'string' ? model['credits'] : '',
    });
    entries.push(entry);
    for (const name of names) if (!cards.has(name)) cards.set(name, entry);
    for (const seat of seatList) if (!seats.has(seat)) seats.set(seat, entry);
  });
  const withheld = Array.isArray(raw['skipped'])
    ? raw['skipped'].filter(isRecord).map((s) => `${String(s['why'] ?? 'skipped')}`)
    : [];
  return { entries, cards, seats, skipped, withheld };
}

/**
 * **Whether this figure may wear a personal model at all** — decided from the
 * pose and the placement BEFORE any name is read: a named figure `figurePose`
 * placed (a model, not the anonymous figure, not a disc), one body (no swarm, no
 * silhouette), on a placement drawn face up that is not a redacted stub.
 */
function mayDress(placement: Placement, pose: FigurePose): boolean {
  if (pose.anonymous || pose.modelId === null || pose.silhouette !== null || pose.swarm > 0 || pose.vehicle) return false;
  if (placement.back || isHidden(placement.card)) return false;
  return true;
}

/** The face-up name of a placement that {@link mayDress} passed, or `null`. */
function faceUpName(placement: Placement): string | null {
  const name = (placement.card as { name?: unknown }).name;
  return typeof name === 'string' && name !== '' ? name : null;
}

/**
 * **What the seats' models spend of the table's personal line** (**D197**): each
 * seat draws its own instance, so a model that dresses both seats counts twice.
 * The duelists are dressed first — they are always on the table.
 */
export function seatTriangles(overlay: PersonalOverlay): number {
  let sum = 0;
  for (const entry of overlay.seats.values()) sum += entry.triangles;
  return sum;
}

/**
 * **THE lookup** — card id → the personal model it may wear. Placements in
 * budget order (your seat's ranks, the other seat's, then the stack — as
 * `figurePose` spends its figures, D266), each
 * card once; at most `max` creatures (`PERSONAL_MAX_FIGURES`) and at most
 * `triangles` personal triangles between them (`PERSONAL_TABLE_TRIS` less what
 * the seats' models spend, **D197**) — a creature whose model would cross either
 * keeps its CC0 figure, and a smaller model later in the order may still fit. The
 * overlay is asked about a name only after {@link mayDress} has passed — that
 * ordering IS hard rule 8 here.
 */
export function personalChoicesOf(
  placed: Layout,
  poses: FigureLayout,
  overlay: PersonalOverlay,
  max: number = PERSONAL_MAX_FIGURES,
  triangles: number = PERSONAL_TABLE_TRIS - seatTriangles(overlay),
): ReadonlyMap<number, PersonalEntry> {
  const out = new Map<number, PersonalEntry>();
  if (overlay.cards.size === 0 || max <= 0) return out;
  const seen = new Set<number>();
  let left = triangles;
  for (const placement of budgetOrderOf(placed.placements)) {
    if (out.size >= max) break;
    if (placement.kind !== 'creature' && placement.kind !== 'stack') continue;
    if (seen.has(placement.cardId)) continue;
    seen.add(placement.cardId);
    const pose = poses.get(placement.cardId);
    if (pose === undefined || !mayDress(placement, pose)) continue;
    const name = faceUpName(placement);
    if (name === null) continue;
    const entry = overlay.cards.get(name);
    if (entry === undefined || entry.triangles > left) continue;
    left -= entry.triangles;
    out.set(placement.cardId, entry);
  }
  return out;
}

/** What the loader measured of a loaded personal model: its widest resting width over its height. */
export interface PersonalFit {
  readonly ratio: number;
}

/**
 * **The dressed poses**: each chosen figure whose model has LOADED (it has a
 * fit) becomes that model's pose — the opaque id, no props, no costume and no
 * hair (the model brings its own), its height refitted so its own resting width
 * stays inside the rank slot (the width clamp, strict: `fitHeight` again, from
 * the pose's own height, so it only ever shrinks). A figure whose model has not
 * loaded — or failed — keeps its CC0 pose. With nothing to dress, the SAME map
 * comes back, so a memo downstream does not see a change.
 */
export function dressPoses(
  poses: FigureLayout,
  choices: ReadonlyMap<number, PersonalEntry>,
  fits: ReadonlyMap<string, PersonalFit>,
): FigureLayout {
  let out: FigureLayout | null = null;
  for (const [cardId, entry] of choices) {
    const pose = poses.get(cardId);
    const fit = fits.get(entry.id);
    if (pose === undefined || fit === undefined || !(fit.ratio > 0)) continue;
    out ??= new Map(poses);
    const height = fitHeight(pose.height, fit.ratio);
    out.set(cardId, {
      ...pose,
      personal: entry.id,
      props: [],
      costume: null,
      hair: null,
      height,
      width: height * fit.ratio,
    });
  }
  return out ?? poses;
}

/**
 * **The library key a dressed pose mounts**: its model's resting-pose variant
 * (`p0@folded`, the same `figures/rests.ts` table the CC0 bodies use), or `null`
 * for a pose that is not dressed.
 */
export function personalModelKey(pose: Pick<FigurePose, 'personal' | 'rest'>): string | null {
  if (pose.personal === undefined) return null;
  return pose.rest === null ? pose.personal : restModelId(pose.personal, pose.rest);
}
