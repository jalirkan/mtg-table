/*
 * mtg-table — arena/inspect.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Inspect from the table** (**D241**): the card under the pointer — or, with
 * nothing under it, the last card clicked, else the last one pointed at (so the
 * pointer can travel to the chip) — opens the workshop's INSPECT view
 * (`#workshop?card=<name>&view=inspect`: the figure in its signature pose in
 * front of its card's painting, dressed in the user's own model where the
 * personal tier has one, D196, D225–D228). It is NAVIGATION and nothing else: no
 * act, no rules, no engine string branched on; the arena's `I` row
 * (`web/src/keys.ts`'s `inspectCard`) and the chip beside the art credit both
 * read {@link inspectTargetOf}, and the workshop's back link returns to the arena
 * at the same frame (`main.tsx`'s `replayCursors`, D128).
 *
 * **Hard rule 8, the renderer's half, again.** The inspect view names a card and
 * draws its art, so asking for it is a statement about what a card is — the
 * same statement `personal.ts`'s lookup makes, gated the same way: the
 * placement's gates (drawn face up, not a redacted stub) are decided BEFORE the
 * name is read, and a face-down or hidden card is `inert` with the reason, never
 * a link. `web/test/inspect.test.ts` sweeps the corpus made hostile (every back
 * and stub handed a real name) and holds that no hidden placement ever yields an
 * inspect, with an ungated control that would.
 *
 * Pure — no three, no React, no DOM, no clock (`liveness.test.ts`). The href is
 * spelled here and not imported from `workshop/links.ts` because nothing under
 * `arena/` imports `workshop/` (D102); `inspect.test.ts` holds the two spellings
 * equal (`workshopHref(name, 'inspect')`, and `cardFromLocation` reads it back).
 */

import { isHidden } from '../protocol.ts';
import type { FigurePose } from './figures/pose.ts';
import type { Placement } from './layout.ts';

/** What `I` (and the chip) would do: open the inspect view on a named card, or nothing — with why. */
export type InspectTarget = { readonly kind: 'inspect'; readonly name: string; readonly href: string } | { readonly kind: 'inert'; readonly why: string };

/** The workshop's view word for its inspect camera (`workshop/links.ts`'s `WORKSHOP_VIEW_INSPECT`). */
export const INSPECT_VIEW = 'inspect';

/** `#workshop?card=<name>&view=inspect` — the workshop's own deep link, with its inspect view asked for. */
export function inspectHref(name: string): string {
  return `#workshop?${new URLSearchParams({ card: name, view: INSPECT_VIEW }).toString()}`;
}

/** Why a card with nothing under the pointer and nothing clicked is not inspected. */
export const NOTHING_TO_INSPECT = 'no card under the pointer and none clicked — hover or click a face-up card, then press I';
/** Why a face-down, hidden or redacted card is never inspected (hard rule 8). */
export const HIDDEN_NOT_INSPECTED = 'a face-down or hidden card is never inspected — what it is is not yours to see';

/**
 * **THE planner.** `placement` is the card under the pointer (else the last one
 * clicked, else `null`); `pose` is its figure, if `figurePose` placed one. The
 * gates, in order, all before the name is read: something to inspect; drawn face
 * up and not a redacted stub; a NAMED figure to stand in front of the painting
 * (the inspect view is the figure against its card's art — a land, an instant or
 * the anonymous disc has none; `W` opens the workshop on anything). Only then is
 * the face-up name read, and an empty one is inert too.
 */
export function inspectTargetOf(placement: Placement | null, pose: FigurePose | undefined): InspectTarget {
  if (placement === null) return { kind: 'inert', why: NOTHING_TO_INSPECT };
  if (placement.back || isHidden(placement.card)) return { kind: 'inert', why: HIDDEN_NOT_INSPECTED };
  if (pose === undefined || pose.anonymous || pose.modelId === null) {
    return {
      kind: 'inert',
      why: 'this card has no figure to inspect — the inspect view stands a card’s figure in front of its painting (W opens the workshop on any card)',
    };
  }
  const name = (placement.card as { name?: unknown }).name;
  if (typeof name !== 'string' || name === '') return { kind: 'inert', why: HIDDEN_NOT_INSPECTED };
  return { kind: 'inspect', name, href: inspectHref(name) };
}

/** The planner's answer as the key context carries it (`web/src/keys.ts`'s `KeyContext.inspect`). */
export function inspectContextOf(target: InspectTarget): { href: string; name: string } | { why: string } {
  return target.kind === 'inspect' ? { href: target.href, name: target.name } : { why: target.why };
}
