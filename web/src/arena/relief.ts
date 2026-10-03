/*
 * mtg-table — arena/relief.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The relief index, read** (D225–D228; since the portrait standee, **D260**,
 * the arena's as well as the workshop's). `[NO three]`, `[NO React]`, `[NO DOM]`,
 * no clock: `node --test` drives every line.
 *
 * The personal tier's relief cache (`personal/relief/`, `tools/personal/relief.mjs`)
 * holds, per card print, a depth map cut from the card's own painting and the
 * back layer's colour — card-art-derived, so never committed and never published
 * (D190, D225), and served by the Vite dev server alone (D92,
 * `web/src/personal/devRoute.ts`). Two things draw from it: the workshop's
 * inspect view (the relief WINDOW, D226–D228) and the arena's STANDEE (D260 —
 * the painting's near subjects cut out and stood on the table where no personal
 * model dresses a face-up creature). Both read the served index through
 * {@link reliefIndexOf}, and nothing else does: it lives here, on the arena's
 * side of D102's line, so the arena can use it and the workshop (downstream)
 * still imports the one reader (`workshop/relief.ts` re-exports it).
 *
 * {@link ART_BOX} moved here with it: the art box of a card image is what a map
 * is cut with and what a standee's colour is read through, and the arena cannot
 * import `workshop/framing.ts` (which re-exports it, so `relief.mjs` and every
 * workshop reader still find it there).
 */

/**
 * **The art box of a card image**, as fractions of a Scryfall `normal` image
 * (488 × 680, the modern frame): left, right, top and bottom of the painting.
 * Measured on the frame, not per card; a full-art or showcase frame is a
 * follow-up (PLAN.md, the relief window). `tools/personal/relief.mjs` cuts its
 * depth maps with this same box and records it, so moving it makes every map
 * stale ({@link reliefIndexOf} then drops it: the inspect view draws the backdrop
 * flat and no standee stands until the tool runs again).
 */
export const ART_BOX = Object.freeze({ left: 0.08, right: 0.92, top: 0.112, bottom: 0.555 });

/**
 * **Where a standee is cut from its painting** (D260) — what the dev route
 * measured on the map (`arena/standee.ts`'s `standeeCutOf`), in the map's own
 * fractions (0–1 across and DOWN, the image's rows): the box round the painting's
 * near subjects, the depth (0–1, near = 1) at which a texel counts as near, and
 * the share of the art box the cut keeps. `null` on an entry: nothing in the
 * painting stands in front of anything (a flat map, a landscape) — no standee.
 */
export interface StandeeCut {
  box: { left: number; right: number; top: number; bottom: number };
  near: number;
  share: number;
}

/** One depth map the dev route serves: `<route><file>`, the art box's size in pixels, and its back layer. */
export interface ReliefEntry {
  id: string;
  file: string;
  width: number;
  height: number;
  /** The back layer's colour: `<route><file>`, its size — the art box plus `margin` pixels on every side. */
  back: { file: string; width: number; height: number; margin: number };
  /** D260: the standee's cut, or `null` when the painting has no near subject (or the route measured none). */
  standee: StandeeCut | null;
}

/** The served index, read: Scryfall id → map. */
export interface ReliefIndex {
  byId: ReadonlyMap<string, ReliefEntry>;
  /** Maps the reader refused, and why — for the console, never for the wire. */
  dropped: readonly string[];
}

export const EMPTY_RELIEF: ReliefIndex = Object.freeze({ byId: new Map<string, ReliefEntry>(), dropped: [] });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFraction = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

/** The box a map was cut with is THIS art box, to a millionth. */
export function isArtBox(box: unknown): boolean {
  if (!isRecord(box)) return false;
  return (['left', 'right', 'top', 'bottom'] as const).every((k) => {
    const v = box[k];
    return typeof v === 'number' && Math.abs(v - ART_BOX[k]) < 1e-6;
  });
}

/**
 * **A standee cut, as the index carries it**, or `null` — a box of four
 * fractions with some width and height (left < right, top < bottom), a `near` and
 * a `share` in 0–1. Anything else is no standee (the painting still draws in the
 * inspect view: the cut is the standee's alone).
 */
export function standeeCutFrom(raw: unknown): StandeeCut | null {
  if (!isRecord(raw) || !isRecord(raw['box'])) return null;
  const box = raw['box'];
  const { left, right, top, bottom } = box;
  if (!isFraction(left) || !isFraction(right) || !isFraction(top) || !isFraction(bottom)) return null;
  if (!(right - left > 0.02) || !(bottom - top > 0.02)) return null;
  const near = raw['near'];
  const share = raw['share'];
  if (!isFraction(near) || !isFraction(share) || share <= 0) return null;
  return { box: { left, right, top, bottom }, near, share };
}

/**
 * **THE reader of the relief index** the dev route serves
 * (`{version: 1, reliefs: {<id>: {file, width, height, box, back, standee}}}`).
 * Anything it cannot vouch for is dropped: a key that is not a Scryfall id, a
 * file that is not `<id>.png` or a back that is not `<id>.back.jpg` (no path can
 * be smuggled through the index), a size that is not a whole number of pixels, a
 * back whose margin is not the same whole number of pixels on every side, a map
 * cut with another art box, a map made before the back layer (the route serves an
 * older recipe's map without one, `perf.ts`'s `RELIEF_MAP_VERSION`). A standee
 * cut that is not one is `null` — the map stays, for the inspect view.
 */
export function reliefIndexOf(data: unknown): ReliefIndex {
  if (!isRecord(data) || data['version'] !== 1 || !isRecord(data['reliefs'])) return EMPTY_RELIEF;
  const byId = new Map<string, ReliefEntry>();
  const dropped: string[] = [];
  for (const [id, raw] of Object.entries(data['reliefs'])) {
    if (!UUID.test(id) || !isRecord(raw)) {
      dropped.push(`${id.slice(0, 40)}: not a Scryfall id`);
      continue;
    }
    const { file, width, height, box } = raw;
    if (file !== `${id}.png`) {
      dropped.push(`${id}: its file is not ${id}.png`);
      continue;
    }
    if (!Number.isInteger(width) || !Number.isInteger(height) || (width as number) <= 0 || (height as number) <= 0) {
      dropped.push(`${id}: no size`);
      continue;
    }
    if (!isArtBox(box)) {
      dropped.push(`${id}: cut with another art box — run tools/personal/relief.mjs again`);
      continue;
    }
    const back = raw['back'];
    if (!isRecord(back) || back['file'] !== `${id}.back.jpg`) {
      dropped.push(`${id}: made before the back layer (D227) or its keep mask (D228) — run tools/personal/relief.mjs again`);
      continue;
    }
    const bw = back['width'];
    const bh = back['height'];
    const margin = Number.isInteger(bw) ? ((bw as number) - (width as number)) / 2 : NaN;
    if (!Number.isInteger(bh) || !Number.isInteger(margin) || margin < 0 || (bh as number) - (height as number) !== 2 * margin) {
      dropped.push(`${id}: its back layer is not the art box with one margin on every side`);
      continue;
    }
    byId.set(id, {
      id,
      file,
      width: width as number,
      height: height as number,
      back: { file: `${id}.back.jpg`, width: bw as number, height: bh as number, margin },
      standee: standeeCutFrom(raw['standee']),
    });
  }
  return { byId, dropped };
}
