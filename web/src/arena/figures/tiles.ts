/*
 * mtg-table — arena/figures/tiles.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Lands as terrain** (report 13 §5), and the pure half of it: which tile a land
 * gets, what colour it is, and whether it is spent. `[NO three]`, `[NO React]`,
 * `[NO DOM]`, no clock — so `web/test/tiles.test.ts` resolves every land of every
 * committed recording in bare Node.
 *
 * ---------------------------------------------------------------------------
 * **A tile is a POSE** (§5.1, §1.3). A land is on the battlefield and its type
 * line is in the snapshot, so its tile is derived from the frame on screen and is
 * immortal across `skip all`, a backwards scrub and a `resync`. `fx.terrain` and
 * `land.rise` stay exactly as they are: they animate the **arrival** of a tile
 * that then simply exists.
 *
 * **Tapped is a pose too**, and that is the whole reason this is not a cue: a
 * board scrubbed to mid-turn shows the right lands spent with no cue history at
 * all. The untap is the transition and is a cue (`land.untap`, T4).
 * ---------------------------------------------------------------------------
 *
 * **Three tile kinds, not §5.2's five, and the reason is the draw call.** §5.2's
 * table gives Mountain a `crag` and Forest a `grove`; both are probe-deck lands
 * ("the fallback proves itself" is the table's own note on them) and a fourth and
 * fifth `InstancedMesh` would be a fourth and fifth draw call for two lands that
 * are not in the deck this is for. A kind here is a **geometry-and-material
 * family**; the difference between a crag and a grove is a tint, and a tint is
 * per-instance and free. So the kinds are the two the deck actually wants — a
 * plateau and the water shader — plus the neutral slab everything else lands on,
 * and 21 lands cost 3 draw calls plus 1 for every two-tone rim on the table.
 */

import { isHidden, type AnyCard } from '../../protocol.ts';
import { isLandTypeLine } from '../../render/labels.ts';
import { colourHex, colourIdOf } from '../colour.ts';
import { seatSpin, type Layout, type Placement, type Seat } from '../layout.ts';
import type { ArtPalette } from './palette.ts';
import type { TileData, TileKind, TileSpec } from './types.ts';

/**
 * §5.2 — the land subtypes this ladder recognises, in the order a type line is
 * searched. A closed list for the same reason `SUBTYPE_ORDER` is one: an
 * open-ended rung would make the data file a place to add a tile per land, which
 * is Tier 3 arriving one row at a time inside Tier 2.
 */
export const LAND_SUBTYPE_ORDER = ['plains', 'island', 'swamp', 'mountain', 'forest'] as const;
export type LandSubtype = (typeof LAND_SUBTYPE_ORDER)[number];

/** The data key a land-subtype rung is written as. */
export function landSubtypeKey(subtype: string): string {
  return `subtype:${subtype}`;
}

/** Which rung of the tile ladder answered. A category, never a name (§3.10 rule 1). */
export type TileRung = 'card' | `subtype:${string}` | 'any' | 'default';

export interface TileMatch {
  spec: TileSpec;
  rung: TileRung;
}

/**
 * The subtypes of a land's type line, lowercased.
 *
 * Measured: the corpus has exactly five land type lines — `Basic Land - Island`
 * (9,511 frame-instances), `- Mountain` (8,309), `- Plains` (5,560), `- Forest`
 * (3,718) and a bare **`Land`** (2,291, which is both *Thriving* lands). So the
 * subtype rung answers for every basic and the per-name rung is what the two
 * dual lands need — which is why the per-name rung comes first.
 */
export function landSubtypesOf(card: AnyCard): LandSubtype[] {
  if (isHidden(card)) return [];
  const types = (card as { types?: string }).types ?? '';
  const dash = types.search(/[—–-]/);
  if (dash < 0) return [];
  const words = new Set(
    types
      .slice(dash + 1)
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word !== ''),
  );
  return LAND_SUBTYPE_ORDER.filter((subtype) => words.has(subtype));
}

/**
 * The ladder: **per-name → land subtype → `*` → the declared default.** Total,
 * never `undefined`, never throws.
 *
 * A **concealed** land never reaches the per-name rung, for the reason §1.4 gives
 * for figures: choosing a distinctive tile for a card is a statement about what
 * that card is. (Measured: the corpus has no face-down land at all, so this is a
 * branch rather than a behaviour — and it is the branch that is wrong to leave
 * implicit.)
 */
export function tileFor(card: AnyCard, data: TileData): TileMatch {
  const fallback: TileMatch = { spec: data.default, rung: 'default' };
  if (isHidden(card)) return fallback;

  const name = (card as { name?: string }).name;
  if (typeof name === 'string' && name !== '') {
    const byName = data.lands[name];
    if (byName !== undefined) return { spec: byName, rung: 'card' };
  }
  for (const subtype of landSubtypesOf(card)) {
    const bySubtype = data.lands[landSubtypeKey(subtype)];
    if (bySubtype !== undefined) return { spec: bySubtype, rung: `subtype:${subtype}` };
  }
  const any = data.lands['*'];
  if (any !== undefined) return { spec: any, rung: 'any' };
  return fallback;
}

export interface TilePose {
  cardId: number;
  seat: Seat;
  /** The card's own slot. The tile's own thickness is the renderer's business. */
  position: [number, number, number];
  /**
   * The seat's half-turn (`layout.ts`'s {@link seatSpin}), so a two-tone rim and
   * a directional shader read the same way round on both sides of the table —
   * the same fact `layoutAttachments` had to learn about its host.
   */
  rotationY: number;
  kind: TileKind;
  tint: string;
  /** A second colour band at the rim — the *Thriving* lands. `null` for one tone. */
  rim: string | null;
  /** **Pose, not cue:** a scrubbed board shows the right lands spent (§5.3). */
  tapped: boolean;
  rung: TileRung;
}

export type TileLayout = Map<number, TilePose>;

/**
 * §8.2's budget, applied to the terrain. The measured ceiling is **21 lands in
 * one frame**; above the cap the surplus are simply not drawn, in placement
 * order, which is deterministic — "degrade, don't stutter".
 */
export const MAX_TILES = 24;

/** Is this placement a land the terrain layer draws? */
function isTileCard(placement: Placement): boolean {
  if (placement.kind !== 'land') return false;
  const card = placement.card;
  if (isHidden(card)) return false;
  return isLandTypeLine((card as { types?: string }).types ?? '');
}

/**
 * The terrain of one frame, keyed by card id.
 *
 * It takes the already-computed {@link Layout} for the three reasons `figurePose`
 * does (§3.8): `layout.ts` stays the only module that knows a coordinate,
 * `presence` and the wrap rows have already happened, and `Placement.back` is
 * already decided.
 */
export function tilePose(
  placed: Layout,
  data: TileData,
  /**
   * Lane BODIES (D160): the art-derived palettes by card name. A land with no
   * hand-written tint — the `*` rung's, a new set's non-basic — takes its
   * painting's TERRAIN colour over the bare colour identity. Looked up only for a
   * land drawn face up (hard rule 8).
   */
  palettes?: ReadonlyMap<string, ArtPalette>,
): TileLayout {
  const out: TileLayout = new Map();
  if (placed.placements.length === 0) return out;
  for (const placement of placed.placements) {
    if (out.size >= MAX_TILES) break;
    if (!isTileCard(placement)) continue;
    if (out.has(placement.cardId)) continue;
    const card = placement.card;
    const match = tileFor(card, data);
    const name = (card as { name?: string }).name;
    const art =
      palettes !== undefined && !placement.back && typeof name === 'string' && name !== ''
        ? (palettes.get(name) ?? null)
        : null;
    out.set(placement.cardId, {
      cardId: placement.cardId,
      seat: placement.seat,
      position: [placement.position[0], placement.position[1], placement.position[2]],
      rotationY: seatSpin(placement.seat),
      kind: match.spec.tile,
      tint:
        match.spec.tint ??
        art?.terrain ??
        colourHex(colourIdOf((card as { manaCost?: string | null }).manaCost ?? null)),
      rim: match.spec.rim,
      tapped: placement.tapped,
      rung: match.rung,
    });
  }
  return out;
}
