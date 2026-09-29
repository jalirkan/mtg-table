/*
 * mtg-table — arena/figures/status.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The status strip as a POSE** (the status layer, amendment M49, D210–D212):
 * for every creature figure on the table, the small strip the owner asked for
 * with a Final Fantasy XIII screenshot — its keyword icons, a bar of what is left
 * of its toughness, a pip per counter and a mark per attachment — as a list of
 * pixel quads over one glyph atlas, anchored above the figure.
 *
 * It is a pure function of the frame on screen: `statusLayout(layout(state),
 * figurePose(…))`, read once per snapshot by `FigureLayer` and committed into
 * `scene/status.ts`'s field. So a skip, a scrub backwards, a `resync` and a new
 * `gameId` draw it with no history — it has no transition of its own (the bar
 * shows the snapshot's damage; D211) and remembers nothing (report 13 §1.3).
 *
 * **Hard rule 8, three times over.** A strip is laid out only for a pose that is
 * not anonymous and not a ghost, whose placement is not a back, and whose card
 * `status.ts`'s `cardStatus` answers for — which is `null` for a redacted stub
 * and for EVERY face-down card whatever it carries, reading keywords through
 * `protocol.ts`'s `keywordsOf` (itself `[]` for both). `status.test.ts` sweeps the
 * corpus, and a hostile copy of it that hands every card keywords, and asserts
 * every strip belongs to a face-up card.
 *
 * **Where it is.** The anchor is `layout.ts`'s `statusAnchorOf` — the one world
 * coordinate; everything above it is SCREEN pixels (`STATUS_PX`), because the
 * strip is a billboard read at a fixed size, like a HUD: an icon is 16 CSS px from
 * every view (the owner's floor is 14 px at the table view, 1600 × 1000), and the
 * bottom of the strip sits `STATUS_PX.lift` px above the anchor, which is above
 * the head — `status.test.ts` measures both through `prop-raster.ts`'s camera.
 *
 * `[NO three]`, `[NO React]`, no DOM, no clock — the `figures/` purity scan in
 * `liveness.test.ts` holds it.
 */

import { cardStatus, GLYPHS, HP_COLOURS, PIP_COLOURS, hpColour, type CardStatus, type GlyphId, type StatusHp } from '../../status.ts';
import { isFaceDown, isHidden, type AnyCard } from '../../protocol.ts';
import { statusAnchorOf, type Layout, type Placement, type Seat } from '../layout.ts';
import type { FigureLayout, FigurePose } from './pose.ts';
import { CARRIER_TOP } from './props.ts';

/**
 * The strip's metrics, in CSS pixels. An icon is 16 px — the owner's floor is 14
 * at the table view — and four of them with their gaps are 70 px, inside the
 * ~78 px between two figures of the FAR rank at 1600 × 1000 (the near rank's are
 * ~95 px apart), so neighbouring strips do not overlap on a full rank.
 */
export const STATUS_PX = Object.freeze({
  /** A keyword icon. */
  icon: 16,
  /** An attachment mark. */
  mark: 12,
  /** Between two icons, and between the two rows. */
  gap: 2,
  /** The bar's inside. */
  barW: 38,
  barH: 5,
  /** A counter pip, and how far apart pips stand. */
  pip: 8,
  pipStep: 7,
  /**
   * From the anchor up to the strip's lowest pixel. 8, by measurement: at 4 a
   * helmet (Ant-Man's), the flying ant's own head and rider and a swarm's bees
   * grazed the strip by up to 1.8 px at the table view (`status.test.ts`).
   */
  lift: 8,
});

/** How many keyword icons a strip shows before the rest fold into `more`. */
export const STATUS_MAX_ICONS = 4;
/** How many counter pips it draws before a `more`. */
export const STATUS_MAX_PIPS = 5;
/** How many attachment marks. */
export const STATUS_MAX_MARKS = 3;

/**
 * **The atlas's cells, in order**: every glyph drawn as a badge (a dark disc, a
 * ring and the glyph, tinted as a whole), except `pip`, which is the bare
 * diamond; then `solid`, a white square the bar is made of. `scene/status.ts`
 * paints exactly this list, once per page.
 */
export const STATUS_CELLS: readonly StatusCell[] = [...(Object.keys(GLYPHS) as GlyphId[]), 'solid'];

export type StatusCell = GlyphId | 'solid';

/** One quad of a strip: a cell, where it sits above the anchor (px, its centre), its size and its colour. */
export interface StatusQuad {
  cell: StatusCell;
  /** Centre, CSS px right of the anchor. */
  x: number;
  /** Centre, CSS px ABOVE the anchor. */
  y: number;
  w: number;
  h: number;
  /** `#rrggbb`. */
  colour: string;
  alpha: number;
}

export interface StatusPose {
  cardId: number;
  seat: Seat;
  /** World: the figure's position, up its standing height and `STATUS_LIFT`. */
  anchor: [number, number, number];
  /** The figure's own bob, so the strip rides a hovering figure. A function of time, added in the frame loop. */
  bobAmp: number;
  bobHz: number;
  quads: StatusQuad[];
  /** What it shows, for the census and the tests — constants and counts, never a name. */
  keywords: readonly string[];
  hp: StatusHp | null;
  pips: number;
  marks: number;
}

export type StatusLayout = ReadonlyMap<number, StatusPose>;

const EMPTY: StatusLayout = new Map();

/** Every card on the table by id, for the attachment marks. */
function cardsById(placed: Layout): Map<number, AnyCard> {
  const out = new Map<number, AnyCard>();
  for (const p of placed.placements) if (!out.has(p.cardId)) out.set(p.cardId, p.card);
  return out;
}

/** The battlefield placement each figure stands for. */
function placementsById(placed: Layout): Map<number, Placement> {
  const out = new Map<number, Placement>();
  for (const p of placed.placements) {
    if (p.kind === 'stack') continue;
    if (!out.has(p.cardId)) out.set(p.cardId, p);
  }
  return out;
}

/**
 * **May this pose carry a strip at all?** The three gates, in order: the figure
 * (an anonymous figure and a ghosted spell carry nothing; an uncrewed vehicle is
 * not a creature), the placement (a back is concealed), and the card (a stub, or
 * any face-down card). Exported so the corpus sweep asks the same question.
 */
export function strippable(pose: FigurePose, placement: Placement | undefined): boolean {
  if (pose.anonymous || pose.ghost || pose.vehicle) return false;
  if (placement === undefined || placement.back) return false;
  return !isHidden(placement.card) && !isFaceDown(placement.card);
}

/**
 * **The strip's quads for one card's status** — pure layout in pixels, y up from
 * the anchor. Row one is the bar with the pips to its right; row two, above it,
 * the keyword icons and then the attachment marks. Each row is centred on the
 * anchor. In the arena every keyword the strip has no glyph for folds into ONE
 * `ability` icon (the board, which has tooltips, draws one per keyword).
 */
export function stripQuads(status: CardStatus): StatusQuad[] {
  const px = STATUS_PX;
  const out: StatusQuad[] = [];

  // Row one: the bar and the pips.
  const pipCount = status.pips.reduce((n, p) => n + p.count, 0);
  const pipsShown = Math.min(pipCount, STATUS_MAX_PIPS);
  const pipMore = pipCount > STATUS_MAX_PIPS;
  const barOuterW = status.hp === null ? 0 : px.barW + 2;
  const barOuterH = px.barH + 2;
  const pipsW = pipsShown === 0 ? 0 : (pipsShown - 1) * px.pipStep + px.pip + (pipMore ? px.pipStep + 2 : 0);
  const rowOneW = barOuterW + (barOuterW > 0 && pipsW > 0 ? 3 : 0) + pipsW;
  const rowOneH = rowOneW === 0 ? 0 : Math.max(status.hp === null ? 0 : barOuterH, pipsW > 0 ? px.pip + (pipMore ? 1 : 0) : 0);
  let x = -rowOneW / 2;
  const rowOneY = px.lift + rowOneH / 2;
  if (status.hp !== null) {
    const hp = status.hp;
    const left = x + 1;
    out.push({ cell: 'solid', x: x + barOuterW / 2, y: rowOneY, w: barOuterW, h: barOuterH, colour: HP_COLOURS.back, alpha: 0.9 });
    // The damaged part, then what is left over it — a picture of two numbers (D211).
    out.push({ cell: 'solid', x: left + px.barW / 2, y: rowOneY, w: px.barW, h: px.barH, colour: HP_COLOURS.damage, alpha: 1 });
    const fillW = px.barW * hp.fraction;
    if (fillW > 0.25) {
      out.push({ cell: 'solid', x: left + fillW / 2, y: rowOneY, w: fillW, h: px.barH, colour: hpColour(hp.fraction), alpha: 1 });
    }
    x += barOuterW + (pipsW > 0 ? 3 : 0);
  }
  let drawn = 0;
  for (const pip of status.pips) {
    for (let k = 0; k < pip.count && drawn < pipsShown; k++, drawn++) {
      out.push({ cell: 'pip', x: x + px.pip / 2, y: rowOneY, w: px.pip, h: px.pip, colour: PIP_COLOURS[pip.kind], alpha: 1 });
      x += px.pipStep;
    }
  }
  if (pipMore) {
    x += 2;
    out.push({ cell: 'more', x: x + px.pip / 2, y: rowOneY, w: px.pip + 1, h: px.pip + 1, colour: GLYPHS.more.colour, alpha: 1 });
  }

  // Row two: the keyword icons, then the marks.
  const icons: GlyphId[] = [];
  let generic = false;
  for (const icon of status.icons) {
    if (icon.glyph === 'ability') generic = true;
    else if (!icons.includes(icon.glyph)) icons.push(icon.glyph);
  }
  if (generic) icons.push('ability');
  const shown = icons.length > STATUS_MAX_ICONS ? [...icons.slice(0, STATUS_MAX_ICONS - 1), 'more' as GlyphId] : icons;
  const marks = status.marks.slice(0, STATUS_MAX_MARKS);
  const rowTwoW =
    shown.length * px.icon + marks.length * px.mark + Math.max(0, shown.length + marks.length - 1) * px.gap;
  if (rowTwoW > 0) {
    const rowTwoY = px.lift + rowOneH + (rowOneH > 0 ? px.gap : 0) + px.icon / 2;
    x = -rowTwoW / 2;
    for (const glyph of shown) {
      out.push({ cell: glyph, x: x + px.icon / 2, y: rowTwoY, w: px.icon, h: px.icon, colour: GLYPHS[glyph].colour, alpha: 1 });
      x += px.icon + px.gap;
    }
    for (const mark of marks) {
      out.push({ cell: mark.kind, x: x + px.mark / 2, y: rowTwoY, w: px.mark, h: px.mark, colour: GLYPHS[mark.kind].colour, alpha: 1 });
      x += px.mark + px.gap;
    }
  }
  return out;
}

/**
 * **THE strip layout of a frame**: one {@link StatusPose} per figure that may
 * carry one and has something to show. Pure; the same layout and poses give the
 * same strips.
 */
export function statusLayout(placed: Layout, poses: FigureLayout): StatusLayout {
  if (poses.size === 0) return EMPTY;
  const placements = placementsById(placed);
  const cards = cardsById(placed);
  const out = new Map<number, StatusPose>();
  for (const pose of poses.values()) {
    const placement = placements.get(pose.cardId);
    if (!strippable(pose, placement)) continue;
    const status = cardStatus(placement!.card, (id) => cards.get(id));
    if (status === null) continue;
    const quads = stripQuads(status);
    if (quads.length === 0) continue;
    out.set(pose.cardId, {
      cardId: pose.cardId,
      seat: pose.seat,
      // A carrier's `height` is its hull's thickness: its strip goes over the island.
      anchor: statusAnchorOf(pose.position, pose.silhouette !== null ? pose.width * CARRIER_TOP : pose.height),
      bobAmp: pose.bobAmp,
      bobHz: pose.bobHz,
      quads,
      keywords: status.icons.map((i) => i.keyword),
      hp: status.hp,
      pips: status.pips.reduce((n, p) => n + p.count, 0),
      marks: status.marks.length,
    });
  }
  return out;
}

/** The pixel box a strip covers above its anchor: `[minX, minY, maxX, maxY]`, y up. */
export function stripBounds(quads: readonly StatusQuad[]): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const q of quads) {
    minX = Math.min(minX, q.x - q.w / 2);
    maxX = Math.max(maxX, q.x + q.w / 2);
    minY = Math.min(minY, q.y - q.h / 2);
    maxY = Math.max(maxY, q.y + q.h / 2);
  }
  return [minX, minY, maxX, maxY];
}
