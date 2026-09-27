/*
 * mtg-table — arena/figures/clips.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The clip lane's pure half** (report 13 §3.3, §3.5, §3.6): which cue plays
 * which clip, how two requests on one figure arbitrate, and the envelope that
 * makes a clip decay to the resting stance exactly as an offset decays to
 * identity.
 *
 * `[NO three]`, `[NO React]`, `[NO DOM]`, **no clock** — like everything else in
 * this directory, which is why `web/test/clips.test.ts` runs the real
 * arbitration over shuffled permutations in bare Node.
 *
 * ---------------------------------------------------------------------------
 * **Offsets compose; clips arbitrate** (§3.3), and the difference is not
 * stylistic. `composeInto` adds translations and multiplies scales because two
 * cues on one card in one batch is reachable — a creature that takes damage
 * *and* dies — and last-writer-wins would make the animation depend on the order
 * the queue happened to iterate. A *pose* cannot be added: a figure cannot be
 * 30% dying and 70% attacking. So one request wins, and it wins by a **total
 * order that is a pure function of the requests** ({@link CLIP_PRIORITY}) rather
 * than of arrival. {@link chooseClip} is that function and it is tested over
 * every permutation of its inputs.
 * ---------------------------------------------------------------------------
 *
 * **Why the table is keyed by cue id and not by event kind** (§3.5). The ladder
 * has already run by the time a cue exists, so the cue id is the most specific
 * thing anyone said about this card and this event: Ant-Man's
 * `attackers:alone → attack.shrink` and Peggy's `attackers:alone → attack.aegis`
 * are different entries for the *same* kind, and this table gives them `shrink`
 * and `attack` with no new data. The practical payoff is large — **`cues.json`'s
 * existing 28 cards and 7 archetypes light up figures with no edit to
 * `cues.json` at all.**
 */

import { isClipName, type ClipName, type Stance } from './types.ts';

/**
 * §3.5 — cue id → the clip a figure plays while that cue runs.
 *
 * A cue id that is **not** in this table plays no clip at all, and that is the
 * common case: `tap.rotate`, `life.tick`, `turn.banner` and the whole HUD lane
 * are about cards and numbers, not about bodies. §3.6 rung 3 is the same rule
 * one level down — *a missing clip never removes the animation, it removes only
 * the part a model was going to add.*
 */
export const CLIP_FOR: Readonly<Record<string, ClipName>> = Object.freeze({
  // Arrival.
  'zone.enters': 'summon',
  'fx.flyIn': 'summon',
  'fx.agents': 'summon',
  'fx.swarm': 'summon',

  // Combat.
  'attack.lunge': 'attack',
  'attack.jet': 'attack',
  'attack.aegis': 'attack',
  'attack.shrink': 'shrink',
  'block.interpose': 'block',

  // Damage.
  'damage.hit': 'hit',
  'damage.lethal': 'hit',

  // Leaving.
  'zone.dissolve': 'die',
  'sacrifice.crush': 'die',
  'zone.exile': 'die',

  // Counters, stats and the per-card flourishes.
  'counters.pop': 'grow',
  'counters.drop': 'shrink',
  'fx.badge': 'channel',
  'fx.scaleBeam': 'grow',
  'fx.collapse': 'shrink',
  'fx.circuit': 'channel',
  'fx.hologram': 'channel',
  'stats.flip': 'channel',
  'phased.fade': 'channel',
});

/**
 * §3.3's total order, **most specific first**. `die` beats `hit` because a
 * creature that takes lethal damage is dying, not flinching; `attacking` beats
 * `summon` because a creature that was cast and attacked in one snapshot is, by
 * the time you look at it, attacking.
 *
 * `idle` is last and is never requested by a cue — it is the resting stance, and
 * a figure with no live clip request is already in it.
 */
export const CLIP_PRIORITY: readonly ClipName[] = [
  'die',
  'hit',
  'block',
  'attack',
  'summon',
  'shrink',
  'grow',
  'channel',
  'crouch',
  'idle',
];

const PRIORITY_OF: Readonly<Record<string, number>> = Object.freeze(
  Object.fromEntries(CLIP_PRIORITY.map((clip, i) => [clip, i])),
);

/** Lower is stronger. An unknown clip name sorts last but still plays. */
export function clipRank(clip: string): number {
  return PRIORITY_OF[clip] ?? CLIP_PRIORITY.length;
}

/**
 * One cue's request for a figure's pose (§3.3).
 *
 * `t` is **the cue's own progress**, which is the load-bearing decision of the
 * whole tier (§3.4): the mixer never ticks a clock of its own, so pause,
 * 0.5×–4×, "step one batch", skip, the 2500/1200/250 ms budgets and reduced
 * motion are all already implemented — by the cue queue's virtual clock — and
 * none of that code is written twice.
 */
export interface ClipRequest {
  clip: ClipName;
  /** 0…1 through the clip. **THE CUE OWNS THIS** (§3.4). */
  t: number;
  /** 0…1 against the resting stance. Identity is 0. */
  weight: number;
  /** A per-card alias the figure layer resolves against the model (§3.6 rung 1). */
  alias: string | null;
  /**
   * **Which running cue asked** — `CueContext.key`, unique per live cue.
   *
   * It is what makes the arbitration a rule about *cues* rather than about
   * frames. A cue re-asks on every one of its frames with a **falling** weight
   * near the end (the envelope), so a rule that only compared ranks and weights
   * would refuse a cue's own later, weaker request and freeze the figure at the
   * first weight it ever saw. `SceneStage` happens to hide that — `beginFrame`
   * empties the map, so there is never an incumbent from a previous frame — but
   * `NullStage` does not, and a test double that drifts from the real stage is
   * worth nothing. Same key replaces; different keys arbitrate.
   */
  key: string;
}

/** The identity of the lane: no clip, the figure holds its stance. */
export const NO_CLIP: ClipRequest = Object.freeze({
  clip: 'idle',
  t: 0,
  weight: 0,
  alias: null,
  key: '',
});

/**
 * **The arbitration, as a pure function.** Ties are broken by `weight` and then
 * by clip name, so the winner never depends on insertion order — which is what
 * `web/test/clips.test.ts` asserts over shuffled permutations.
 *
 * Returns `null` for an empty list, which the caller reads as "hold the stance".
 */
export function chooseClip(requests: readonly ClipRequest[]): ClipRequest | null {
  let best: ClipRequest | null = null;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const request of requests) {
    const rank = clipRank(request.clip);
    if (best === null || rank < bestRank) {
      best = request;
      bestRank = rank;
      continue;
    }
    if (rank > bestRank) continue;
    if (request.weight > best.weight) {
      best = request;
      continue;
    }
    if (request.weight === best.weight && request.clip < best.clip) best = request;
  }
  return best;
}

/**
 * Does `candidate` beat `incumbent`? The same total order, in the shape
 * `SceneStage.setClip` wants so that it can keep **one** request per card
 * without allocating an array (report 09 §9.2 rule 6).
 */
export function clipBeats(candidate: ClipRequest, incumbent: ClipRequest): boolean {
  // A cue's own later request always wins over its own earlier one; see
  // {@link ClipRequest.key}.
  if (candidate.key === incumbent.key) return true;
  const a = clipRank(candidate.clip);
  const b = clipRank(incumbent.clip);
  if (a !== b) return a < b;
  if (candidate.weight !== incumbent.weight) return candidate.weight > incumbent.weight;
  return candidate.clip < incumbent.clip;
}

/**
 * **The envelope that makes a clip decay to identity** (§1.1, generalised).
 *
 * `replay-cues.test.ts` asserts `stage.clips` is empty after every batch drains,
 * and `clearClip` is what empties the map — but a clip whose weight was still 1
 * on its last frame would *snap* back to the stance the frame after, which is
 * the pose equivalent of a cue that does not decay. So the weight fades in over
 * the first sixth and out over the last quarter, and the value at `t = 1` is
 * already 0: the clip is at the stance before it is released, and a **skipped**
 * cue (which is applied once at `t = 1` and then ended, `queue.ts`'s
 * `#snapGroup`) leaves the figure standing exactly as `figurePose` says.
 */
export function clipEnvelope(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  if (x < 0.16) return x / 0.16;
  if (x < 0.76) return 1;
  return 1 - (x - 0.76) / 0.24;
}

/**
 * §3.9's stance → the clip a figure **rests** in.
 *
 * This is the pose half of the lane and it is why a tapped creature reads as
 * tapped after `skip all`, a backwards scrub and a `resync`: the resting clip is
 * recomputed from the frame on screen and never from a history. A stance whose
 * model has no such clip falls through to `idle`, and a model with no `idle`
 * falls through to its bind pose — §3.6 rung 3 again.
 *
 * `attacking` deliberately rests in `attack` rather than in `idle`: `card.attacking`
 * is on the wire for the whole of combat while `attack.lunge` is 850 ms, so a
 * creature that has charged stays leaning forward until combat ends.
 */
export const REST_CLIP_FOR: Readonly<Record<Stance, ClipName>> = Object.freeze({
  ready: 'idle',
  crouch: 'crouch',
  attacking: 'attack',
  blocking: 'block',
  sick: 'idle',
});

/**
 * How far into its resting clip a stance sits, 0…1.
 *
 * A stance is a **held pose**, not a loop: `crouch` holds the kneel at the end
 * of the clip, `attack` holds the lean near its middle, `idle` starts at the
 * top. §8.3 rule 1's breathing adds a *time* term to this on top, and only while
 * the queue is awake (decision 7) — see `CueRunner.applyFigures`.
 */
export const REST_PHASE_FOR: Readonly<Record<Stance, number>> = Object.freeze({
  ready: 0,
  crouch: 0.85,
  attacking: 0.45,
  blocking: 0.6,
  sick: 0,
});

/** Only clips a stance may rest in breathe; a held combat pose does not. */
export const BREATHING_STANCES: ReadonlySet<Stance> = new Set<Stance>(['ready', 'sick']);

/** Every clip name {@link CLIP_FOR} can produce. The coverage test's input. */
export function clipsRequestedByCues(): ClipName[] {
  return [...new Set(Object.values(CLIP_FOR))].sort();
}

/** Total, and it never throws: an unknown name is simply not a clip name. */
export function clipForCue(cueId: string): ClipName | null {
  const clip = CLIP_FOR[cueId];
  return clip !== undefined && isClipName(clip) ? clip : null;
}
