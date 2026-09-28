/*
 * mtg-table — workshop/clipCue.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **One clip, played through the real clip lane and nothing else.**
 *
 * A game never plays a clip on its own: every clip rides a cue (`figures/clips.ts`'s
 * `CLIP_FOR`, keyed by cue id), and the cue brings its offsets and effects with it —
 * the attack clip comes with a lunge, the hit with a flinch. To look at the CLIP,
 * the workshop adds one entry to a copy of the arena's registry:
 * `workshop.clip`, which writes a `ClipRequest` for its targets with the same
 * envelope (`clipEnvelope`), the same scratch-object discipline and the same
 * reduced-motion rule as the registry's own `playClip`, and writes no offset and
 * no effect. It is enqueued like any cue — a synthetic `stats` event resolved to it
 * by a one-row cue-data override — so the queue's clock, pause, step, skip, speed
 * and reduced motion all apply to it exactly as they do in a game (report 13 §3.4).
 *
 * `REGISTRY` itself is never touched: the workshop's queue is handed
 * {@link workshopRegistry}, a new map with the arena's entries plus this one.
 *
 * `[NO three]`, `[NO React]`, no clock: `node --test` drives it with `NullStage`.
 */

import { clipEnvelope, type ClipRequest } from '../arena/figures/clips.ts';
import { isClipName, type ClipName } from '../arena/figures/types.ts';
import { REGISTRY } from '../arena/cues/registry.ts';
import { clamp01, type CueImpl, type CueRegistry } from '../arena/cues/stage.ts';
import type { CueData, CueSpec } from '../arena/cues/types.ts';

export const WORKSHOP_CLIP_CUE = 'workshop.clip';

/** One request for the whole page, filled in place — the registry's own rule (§9.2 rule 6). */
const SCRATCH: ClipRequest = { clip: 'idle', t: 0, weight: 0, alias: null, key: '' };

/**
 * `params.wsClip` is the generic `ClipName` (the arbitration's rank); `params.clip`
 * the alias the figure resolves first (§3.6 rung 1) — `pistolDraw`, `radioCall`.
 */
export const CLIP_CUE: CueImpl = {
  lane: 'card',
  apply(ctx, t, stage) {
    if (ctx.reducedMotion) return;
    const generic = ctx.params['wsClip'];
    const alias = ctx.params['clip'];
    SCRATCH.clip = typeof generic === 'string' && isClipName(generic) ? generic : 'idle';
    SCRATCH.t = clamp01(t);
    SCRATCH.weight = clipEnvelope(t);
    SCRATCH.alias = typeof alias === 'string' && alias !== '' ? alias : null;
    SCRATCH.key = ctx.key;
    for (const id of ctx.targets) stage.setClip(id, SCRATCH);
  },
  end(ctx, stage) {
    for (const id of ctx.targets) stage.clearClip(id);
  },
};

/** The arena's registry plus {@link CLIP_CUE}. A new map; `REGISTRY` is not mutated. */
export function workshopRegistry(): CueRegistry {
  return new Map([...REGISTRY, [WORKSHOP_CLIP_CUE, CLIP_CUE]]);
}

/**
 * Which request a model clip key makes: a `ClipName` is itself; an alias
 * (`pistolDraw`) is asked for AS the alias, over the generic clip it stands in for
 * where the model says so, else over `idle`.
 */
export function requestFor(key: string, aliases: Readonly<Record<string, string>> = {}): { clip: ClipName; alias: string | null } {
  if (isClipName(key)) return { clip: key, alias: null };
  for (const [generic, alias] of Object.entries(aliases)) {
    if (alias === key && isClipName(generic)) return { clip: generic, alias: key };
  }
  return { clip: 'idle', alias: key };
}

/**
 * The cue data the queue plans a clip batch against: the game's own, with this
 * card's `stats` (and the defaults' `stats`, for a card with no name) resolved to
 * {@link WORKSHOP_CLIP_CUE}. The queue's `data` is swapped to it for the one
 * `enqueueBatch` call and swapped back — planning is synchronous.
 */
export function clipCueData(base: CueData, name: string, key: string, ms: number, aliases: Readonly<Record<string, string>> = {}): CueData {
  const request = requestFor(key, aliases);
  const spec: CueSpec = {
    cue: WORKSHOP_CLIP_CUE,
    ms: Math.max(120, Math.round(ms)),
    params: { wsClip: request.clip, clip: request.alias ?? '' },
  };
  const cards = { ...base.cards };
  if (name !== '') cards[name] = { ...(base.cards[name] ?? {}), stats: spec, 'stats:*': spec };
  return {
    ...base,
    cards,
    defaults: { ...(base.defaults ?? {}), stats: spec, 'stats:*': spec },
  };
}
