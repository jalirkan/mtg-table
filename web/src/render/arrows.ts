/*
 * mtg-table — render/arrows.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The arrow geometry (report 10 §9.2), and the pure function that turns one
 * `state` frame plus a rect lookup into a list of paths.
 *
 * It is a separate `.ts` file from `ArrowsOverlay.tsx` for the same reason
 * `wedge.ts` is separate from `DecisionPanel.tsx`: Node's type stripping does
 * not transform JSX, so anything in a `.tsx` file can only be tested through
 * vitest. Here the *shapes* — which arrow is drawn, from what to what, and where
 * the head points — are testable from `node --test` with a hand-built rect
 * lookup, and `web/test/arrows.test.ts` does exactly that over the fixture
 * corpus.
 *
 * Three rules this file keeps:
 *
 *   - **Everything goes through the namespaced registry** (`c:` / `p:` / `s:`,
 *     `rects.ts`). `stack[].id` and `Card.id` collide (§10.1); an arrow that
 *     resolved a stack id against card rects would point at a random permanent,
 *     and report 10 §17 names that as the failure to watch for.
 *   - **An endpoint that is not on the board is not an arrow.** The stack panel
 *     can be collapsed, a target can be in a zone this board does not draw, and
 *     a defender can be a planeswalker that has already died. Every one of those
 *     is a missing rect, and a missing rect drops the arrow silently — the fact
 *     is still text in `StackPanel`'s target chips and in the tiles' combat
 *     notes (§14 rule 4), which is where it is *supposed* to live.
 *   - **No rules, no inference.** Three lists are read — `stack[].target*Ids`,
 *     `combat.bands[].attackerIds` and `.blockerIds` — and nothing is computed
 *     from them beyond a curve. `combat` is `null` outside a combat phase and
 *     `defender` is nullable on every band (§3.1); both are guarded.
 */

import type { GameStateBody } from '../protocol.ts';
import { cardKey, playerKey, stackKey, type RectBox, type RectKey } from './rects.ts';

/**
 * The three classes of report 10 §9.2 — three colours, three curvatures — plus
 * **M5's fourth**: `pending`, the target being chosen right now out of
 * `input.selectable` or an ask picker. `PLAN.md` "What M4 hands to M5" names it
 * as the one arrow M4 did not draw: *"What M5 adds is an arrow for a pending
 * target — the one being chosen out of `selectable` — not the resolved ones."*
 *
 * It is the same geometry with a different stroke, and it is still decoration
 * (§14 rule 4): the count and the candidate list are text in the decision panel,
 * so a pending arrow that cannot be drawn loses nothing.
 */
export type ArrowClass = 'target' | 'attack' | 'block' | 'pending';

/** How much of the full bow each class uses. A block is nearly straight. */
const BOW_SCALE: Record<ArrowClass, number> = {
  target: 1,
  attack: 0.5,
  block: 0.25,
  pending: 0.8,
};

export interface ArrowSpec {
  /** Stable across frames, so React keys do not churn: `target:s12>c34`. */
  key: string;
  cls: ArrowClass;
  from: RectKey;
  to: RectKey;
  /** `M … Q …` — one quadratic, the under-stroke and the over-stroke share it. */
  path: string;
  /** The head triangle, as an SVG `points` list. */
  head: string;
  /** A `<title>`; the SVG is aria-hidden, but a DOM inspector should say what it is. */
  title: string;
}

interface Point {
  x: number;
  y: number;
}

export function centre(box: RectBox): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Where the ray from `from` toward `toward` leaves the box — the standard
 * ray/rectangle intersection, clamping the direction against the half-extents.
 * `from` is the box's own centre in every call here.
 */
export function edgePoint(box: RectBox, from: Point, toward: Point): Point {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  if (dx === 0 && dy === 0) return from;
  const hw = box.width / 2;
  const hh = box.height / 2;
  const sx = dx === 0 ? Number.POSITIVE_INFINITY : hw / Math.abs(dx);
  const sy = dy === 0 ? Number.POSITIVE_INFINITY : hh / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: from.x + dx * s, y: from.y + dy * s };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** The 9 px head, as a triangle rotated to `angle`. */
export function headPoints(tip: Point, angle: number, size = 9): string {
  const back = angle + Math.PI;
  const spread = 0.42;
  const p1 = { x: tip.x + Math.cos(back - spread) * size, y: tip.y + Math.sin(back - spread) * size };
  const p2 = { x: tip.x + Math.cos(back + spread) * size, y: tip.y + Math.sin(back + spread) * size };
  return [tip, p1, p2].map((p) => `${String(round(p.x))},${String(round(p.y))}`).join(' ');
}

/**
 * One arc between two boxes (report 10 §9.2). The bow is clamped so a short
 * arrow between two neighbouring tiles does not loop and a long one across the
 * board does not go flat.
 */
export function arcBetween(
  a: RectBox,
  b: RectBox,
  cls: ArrowClass,
): { path: string; head: string } {
  const ac = centre(a);
  const bc = centre(b);
  const s = edgePoint(a, ac, bc);
  const e = edgePoint(b, bc, ac);
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const d = Math.hypot(dx, dy) || 1;
  const bow = Math.min(90, Math.max(24, d * 0.18)) * BOW_SCALE[cls];
  const c = { x: (s.x + e.x) / 2 - (dy / d) * bow, y: (s.y + e.y) / 2 + (dx / d) * bow };
  const angle = Math.atan2(e.y - c.y, e.x - c.x);
  const path = `M${String(round(s.x))} ${String(round(s.y))} Q${String(round(c.x))} ${String(
    round(c.y),
  )} ${String(round(e.x))} ${String(round(e.y))}`;
  return { path, head: headPoints(e, angle) };
}

/** What `buildArrows` needs from the registry: a box, or nothing. */
export type RectLookup = (key: RectKey) => RectBox | undefined;

/**
 * Every arrow this frame draws, in paint order (targets first, combat over
 * them). Pure: board in, rect lookup in, specs out.
 */
export function buildArrows(board: GameStateBody, get: RectLookup): ArrowSpec[] {
  const out: ArrowSpec[] = [];
  const seen = new Set<string>();

  const push = (cls: ArrowClass, from: RectKey, to: RectKey, title: string): void => {
    if (from === to) return;
    const key = `${cls}:${from}>${to}`;
    if (seen.has(key)) return;
    const a = get(from);
    const b = get(to);
    // A missing endpoint is not a bug: the stack panel may be collapsed, the
    // target may be in a zone this board does not draw. The fact stays text.
    if (a === undefined || b === undefined) return;
    seen.add(key);
    out.push({ key, cls, from, to, title, ...arcBetween(a, b, cls) });
  };

  // ---- §9.2 targets: the stack item, or its source card if the panel is shut.
  for (const item of board.stack) {
    const anchor: RectKey | null =
      get(stackKey(item.id)) !== undefined
        ? stackKey(item.id)
        : item.sourceCardId !== null && get(cardKey(item.sourceCardId)) !== undefined
          ? cardKey(item.sourceCardId)
          : null;
    if (anchor === null) continue;
    for (const target of item.targetCardIds) {
      push('target', anchor, cardKey(target), `stack #${String(item.id)} targets card #${String(target)}`);
    }
    for (const target of item.targetPlayerIds) {
      push('target', anchor, playerKey(target), `stack #${String(item.id)} targets player #${String(target)}`);
    }
  }

  // ---- §9.2 combat. `combat` is null outside a combat phase (§3.1).
  for (const band of board.combat?.bands ?? []) {
    const defender = band.defender;
    for (const attacker of band.attackerIds) {
      if (defender !== null) {
        const to = defender.kind === 'player' ? playerKey(defender.id) : cardKey(defender.id);
        push(
          'attack',
          cardKey(attacker),
          to,
          `card #${String(attacker)} attacks ${defender.kind} #${String(defender.id)}`,
        );
      }
      for (const blocker of band.blockerIds) {
        push(
          'block',
          cardKey(blocker),
          cardKey(attacker),
          `card #${String(blocker)} blocks card #${String(attacker)}`,
        );
      }
    }
  }

  return out;
}

/**
 * M5 — the arrow from the source of a pending choice to the candidate under the
 * pointer. `null` for every reason the others drop an arrow, plus two more: no
 * source (the engine has pushed no focus card and the stack is empty) and no
 * hover (the pointer is not on a candidate at all).
 *
 * Pure, like the rest of this file, so `web/test/arrows.test.ts` can build one
 * without a browser.
 */
export function pendingArrow(
  from: RectKey | null,
  to: RectKey | null,
  get: RectLookup,
  title = 'pending target',
): ArrowSpec | null {
  if (from === null || to === null || from === to) return null;
  const a = get(from);
  const b = get(to);
  if (a === undefined || b === undefined) return null;
  return { key: `pending:${from}>${to}`, cls: 'pending', from, to, title, ...arcBetween(a, b, 'pending') };
}
