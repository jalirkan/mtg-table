/*
 * mtg-table — arena/cues/queue.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The cue queue** (report 09 §5.2, §5.3): steps, stagger, overlap, time
 * compression, the 24-step cap, skip and flush — and the liveness rule that
 * makes all of it safe.
 *
 * Pure TypeScript. No three, no React, no DOM, and **no timer**: the clock is
 * injected (`tick(now)`), which is the entire reason the whole animation system
 * is testable in bare Node against every committed recording (§10.3).
 *
 * ---------------------------------------------------------------------------
 * **The queue cannot block input, and not because it is careful.**
 *
 * The decision layer reads `state.input`; the hit proxies are parked at
 * `layout(state)` and are never gated on `selectable` (amendment M8). There is
 * no code path from anything in this file to `onAct`. The budgets below are
 * about *comfort* — a two-second flourish over a board the engine is waiting on
 * feels like a hang even though every click still lands — and §5.3 makes that
 * concrete: while {@link awaitingHuman} is true the whole remaining queue is
 * re-compressed into 250 ms and keeps playing over a fully interactive board.
 * ---------------------------------------------------------------------------
 */

import type { GameEvent, GameStateBody } from '../../protocol.ts';
import type { ClientState } from '../../reduce.ts';
import { isDeathCue } from '../figures/clips.ts';
import { cuesFor } from './resolve.ts';
import type { CueContext, CueImpl, CueRegistry, Stage } from './stage.ts';
import { EMPTY_CUE_DATA, type Cue, type CueData, type Step } from './types.ts';

// ---------------------------------------------------------------------------
// The numbers, all of them from §5.2 / §5.3
// ---------------------------------------------------------------------------

/** Step *n+1* starts at `(1 − OVERLAP) × step[n].ms`. Cinematic, and ~2× faster. */
export const OVERLAP = 0.35;
/** §5.2 — beyond this many pending steps, flush and snap. A turn is not a cutscene. */
export const MAX_PENDING_STEPS = 24;
/** The default gap between the cues of one coalesced step. */
export const STAGGER_MS = 40;
/** …capped, so eight taps take 240 ms of stagger and not 320. */
export const STAGGER_CAP_MS = 240;
/** §6 — attackers get a longer beat than a row of tapping lands. */
export const STAGGER_BY_CUE: Readonly<Record<string, number>> = { 'attack.lunge': 60 };

/** §5.2 / §5.3 — the three budgets. */
export const BUDGET_MS = { replay: 2500, live: 1200, awaitingHuman: 250 } as const;

/** §5.2 — below this compression factor, cues snap instead of being squeezed flat. */
export const MIN_COMPRESSION = 0.25;

/**
 * **The most real time one tick may add to the cue clock** (slice-2 verification
 * fix). A defence, not the mechanism: the mechanism is that a batch arriving on
 * an IDLE queue starts its own clock (`enqueueBatch`), because the frame loop is
 * parked while the queue is idle and the first frame after it is a gap, not
 * elapsed film. This clamp is for the frames that are late while the queue is
 * NOT idle — a hidden tab coming back, a loop that some future defect parks
 * mid-cue — so a late frame resumes the film instead of swallowing it. 100 ms is
 * six frames at 60 Hz: below 10 fps the film slows down rather than skipping.
 */
export const MAX_TICK_MS = 100;

/**
 * §8 rule 7, **as written**: `prefers-reduced-motion: reduce` *"disables shake
 * entirely and scales all cue durations to 30%"*.
 *
 * The arena first shipped the harder reading — every cue collapsed to a snap —
 * on the argument that a renderer whose vocabulary is motion should honour "no
 * motion" as *no motion*. The verification pass measured what that actually
 * does: the same four stepped frames of `g1.jsonl` queue **12 steps / 3050 ms**
 * with reduced motion off and **0 steps / 0 ms** with it on. That is a silent
 * divergence from the spec paragraph the code cites, and it is the worse
 * behaviour in one concrete way: several cues are the only channel for a **fact**
 * — the damage number, the counter pip, the life delta — so collapsing them to
 * zero does not slow the film down, it removes information from it.
 *
 * So the spec wins, and the two halves of rule 7 are now separate: durations
 * scale by this factor, and **shake and camera moves remain hard off** (the cue
 * implementations gate every shake on `ctx.reducedMotion`, and
 * `CameraDirector.request` drops every move outright). The scene still lands on
 * `layout(state)` either way, because that is §5.1 and not a cue's decision.
 */
export const REDUCED_MOTION_SCALE = 0.3;

/**
 * §6 — `outcome.finish` is exempt from the live budget. The game is over, so by
 * definition nothing is waiting on the human.
 */
export const UNCOMPRESSIBLE: ReadonlySet<string> = new Set(['outcome.finish']);

export type QueueMode = 'replay' | 'live';

// ---------------------------------------------------------------------------
// §5.3 — the liveness predicate
// ---------------------------------------------------------------------------

/**
 * **Is the engine waiting on the human right now?**
 *
 * Note `selectable.cardIds.length > 0` explicitly: protocol §4.2's invariant is
 * that a **disabled OK button with a non-empty selectable list means the engine
 * wants a card click** — precisely the state where a two-second cue would feel
 * like a hang. A predicate that only looked at the buttons would call that
 * state idle and give it the full budget.
 *
 * Pure, and deliberately readable from a test: `liveness.test.ts` (E6) builds
 * exactly that stall case and asserts `true`.
 */
export function awaitingHuman(state: ClientState): boolean {
  if (state.ask !== null) return true;
  const input = state.input;
  if (input == null) return false;
  return (
    input.buttons.ok.enabled ||
    input.buttons.cancel.enabled ||
    input.selectable.cardIds.length > 0
  );
}

/** Which budget a batch gets (§5.3). A replay has no human seat and no hurry. */
export function budgetFor(state: ClientState, mode: QueueMode): number {
  if (mode === 'replay') return BUDGET_MS.replay;
  return awaitingHuman(state) ? BUDGET_MS.awaitingHuman : BUDGET_MS.live;
}

// ---------------------------------------------------------------------------
// Planning a batch: events (engine order) → steps
// ---------------------------------------------------------------------------

/**
 * §5.2 — walk the batch **in engine order**, resolve each event through the
 * ladder, apply the four suppression rules, and coalesce consecutive same-cue
 * events into one staggered step.
 *
 * Pure: `(events, state, data, previous) → Step[]`, no clock, no stage. The
 * fixture sweep calls it 3,291 times.
 *
 * `previous` is the board of the frame **immediately before** this batch, or
 * `null` when there is none (the first frame, or the frame after a flush). Only
 * `resolved` reads it — T6's strike, which aims at what the resolving item
 * targeted one frame earlier (`resolve.ts`'s `strikeParams`). A batch *is* the
 * transition between those two frames, so this is the transition's own other end,
 * not a history.
 */
export function planBatch(
  events: readonly GameEvent[],
  state: ClientState,
  data: CueData = EMPTY_CUE_DATA,
  previous: GameStateBody | null = null,
): Step[] {
  const raw: Cue[] = [];
  for (const event of events) {
    // §3.6: `GameEventTurnPhase` fires on every step — 4,049 in the committed
    // corpus. A queued phase cue would dominate the queue and nothing else
    // would ever play, so it is dropped here rather than given a duration of
    // zero and scheduled anyway.
    if (event.kind === 'phase') continue;
    raw.push(...cuesFor(event, state, data, previous));
  }

  const cues = suppress(raw);
  const steps: Step[] = [];
  for (const cue of cues) {
    const last = steps[steps.length - 1];
    if (last !== undefined && last.cues[0]!.id === cue.id && last.cues.length < 24) {
      last.cues.push(cue);
      retimeStep(last);
    } else {
      const step: Step = { cues: [cue], staggerMs: 0, ms: cue.ms };
      retimeStep(step);
      steps.push(step);
    }
  }
  return steps;
}

function retimeStep(step: Step): void {
  const id = step.cues[0]!.id;
  const n = step.cues.length;
  const nominal = STAGGER_BY_CUE[id] ?? STAGGER_MS;
  const stagger = n <= 1 ? 0 : Math.min(nominal, STAGGER_CAP_MS / (n - 1));
  let longest = 0;
  for (const cue of step.cues) longest = Math.max(longest, cue.ms);
  step.staggerMs = stagger;
  step.ms = longest + stagger * (n - 1);
}

/**
 * The seven suppression rules. Each one is a thing the engine legitimately says
 * twice, and each would otherwise animate twice.
 *
 *  1. **`zone` → stack is folded into `cast`** (§6). Forge emits both for every
 *     spell cast; without this the card flies to the stack, then flies to the
 *     stack again.
 *  2. **`unstacked` is dropped when `resolved` covers it.**
 *     `GameEventSpellRemovedFromStack` fires for *every* spell that leaves the
 *     stack, resolution included — the corpus has 412 of each, exactly — so a
 *     resolving spell would pop and then shatter.
 *  3. **`stats` gives up any card another cue already owns.** It is the
 *     commonest kind in the stream and the quietest cue in the table; a rim
 *     flash on a creature that is at that moment dying is noise on top of the
 *     shot that matters.
 *  4. **A cue with nothing to play is dropped** — no targets and no players.
 *  5. **`cast` gives way to an arrival on the battlefield** (E5). A snapshot can
 *     cover several engine steps, and a permanent that was cast *and resolved*
 *     since the last one carries both events: the card then plays `cast.rise`
 *     (which decays out of the caster's hand) **and** its arrival cue, and §5.1
 *     composes them by **adding** the two translations — so the card rises out
 *     of a hand it has already left while descending onto the table. Measured
 *     at frame 175 of `g1.jsonl`, where the S.H.I.E.L.D. Helicarrier does
 *     exactly this: peak `dz` **−2.33 → −1.18** with the rule on, and four cues
 *     on one card become two. The arrival is the newer truth, so it wins.
 *  6. **An exact duplicate is played once.** Same cue, same selector, same
 *     targets, same batch. Frame 175 again: two `resolved` events for one card,
 *     which composed into a pop **twice** the size of either — `scale` is
 *     multiplied by `composeOffsets`, not taken once.
 *  7. **One card's `cast` and `resolved` that name the same cue play once**
 *     (Tier 2 slice 3). Slice 3 keyed a card's RESOLUTION to its own cue (Web
 *     Up's wrap, Wasp's beam, Quake's shockwave), and an enchantment whose spell
 *     resolves and whose enter trigger goes on the stack in one snapshot then
 *     plays the same cue twice on one card under two selectors — `g1.jsonl`
 *     frame 139, Web Up: its spell's `resolved`, then its trigger's `cast` — and
 *     two lifts compose into one twice as high. The survivor is the one that
 *     carries an AIM (`beamTo` / `strikeCard`), because that is the one with
 *     something to show; failing that, the first in engine order.
 *
 * And two about the DUELISTS (Tier 2 slice 4, T13), which move no card and so
 * change no film but the one at the table ends:
 *
 *  5b. **A `cast` rule 5 drops hands its gesture to the arrival that replaced
 *     it.** The AI casts and resolves inside one snapshot as a matter of course
 *     (it is how it plays), so without this its duelist would never raise a hand
 *     for a creature: the arrival carries `gesture: "cast"` and the caster as
 *     `gesturePlayer`, and `registry.ts`'s `playGesture` raises THAT seat's hand.
 *     A `cast` a data row silenced (`gesture: "none"`) carries nothing.
 *  8. **One flinch per player per batch.** Damage to a player and the life loss
 *     it causes arrive together, and two overlapping flinches on one body read as
 *     two blows — the second starting over the first. The damage keeps its
 *     flinch; the `life` cue for the same player gives its up (`gesture: "none"`)
 *     and keeps its number, which is the part that carries the fact.
 */
function suppress(cues: Cue[]): Cue[] {
  const castCards = new Set<number>();
  const resolvedCards = new Set<number>();
  const ownedByOthers = new Set<number>();
  const entering = new Set<number>();
  for (const cue of cues) {
    if (cue.kind === 'cast') for (const id of cue.targets) castCards.add(id);
    if (cue.kind === 'resolved') for (const id of cue.targets) resolvedCards.add(id);
    if (cue.kind !== 'stats' && cue.kind !== 'phase') for (const id of cue.targets) ownedByOthers.add(id);
    // The `zone` event's own body, not its selector: a cue file is free to name
    // the transition differently and the suppression must not depend on it.
    if (cue.kind === 'zone' && cue.params['toZone'] === 'battlefield') {
      for (const id of cue.targets) entering.add(id);
    }
  }

  // Rule 5b's carriers: an entering card → the seat whose `cast` of it rule 5 drops.
  const carried = new Map<number, number>();
  for (const cue of cues) {
    if (cue.kind !== 'cast' || cue.params['gesture'] !== 'cast') continue;
    const caster = cue.players[0];
    if (caster === undefined) continue;
    for (const id of cue.targets) if (entering.has(id) && !carried.has(id)) carried.set(id, caster);
  }

  // Rule 7's winners: `<cue id>|<card>` → the one cast-or-resolved cue that plays.
  const castOrResolved = new Map<string, Cue>();
  for (const cue of cues) {
    if (cue.kind !== 'cast' && cue.kind !== 'resolved') continue;
    const card = cue.targets[0];
    if (card === undefined) continue;
    const key = `${cue.id}|${String(card)}`;
    const incumbent = castOrResolved.get(key);
    if (incumbent === undefined || (!isAimed(incumbent) && isAimed(cue))) castOrResolved.set(key, cue);
  }

  const seen = new Set<string>();
  const claimed = new Map<string, Set<number>>();
  const out: Cue[] = [];
  for (const cue of cues) {
    if ((cue.kind === 'cast' || cue.kind === 'resolved') && cue.targets[0] !== undefined) {
      if (castOrResolved.get(`${cue.id}|${String(cue.targets[0])}`) !== cue) continue;
    }
    if (cue.kind === 'zone' && cue.id === 'zone.toStack' && cue.targets.some((id) => castCards.has(id))) {
      continue;
    }
    if (cue.kind === 'unstacked' && cue.targets.some((id) => resolvedCards.has(id))) continue;
    if (cue.kind === 'cast' && cue.targets.some((id) => entering.has(id))) continue;
    let targets = cue.targets;
    if (cue.kind === 'stats') targets = targets.filter((id) => !ownedByOthers.has(id));

    /**
     * **Rule 6 — one card, one cue of a kind, per batch.**
     *
     * Keyed by cue id **and selector**, so a card that taps and untaps in one
     * snapshot still plays both (`tap:on` and `tap:off` are different
     * selectors) while a card named by four `stats` events plays one flash.
     * It is written as a per-CARD claim rather than a whole-cue signature
     * because the repeats overlap rather than match: `stats` arrives as
     * `[65, 70]` and then `[65]`, and comparing whole cues lets card 65 flash
     * twice.
     */
    const claim = `${cue.id}|${cue.selector}`;
    if (targets.length > 0) {
      const already = claimed.get(claim) ?? new Set<number>();
      targets = targets.filter((id) => !already.has(id));
      if (targets.length === 0) continue;
      for (const id of targets) already.add(id);
      claimed.set(claim, already);
    } else {
      if (cue.players.length === 0) continue;
      const signature = `${claim}|p${cue.players.join(',')}`;
      if (seen.has(signature)) continue;
      seen.add(signature);
    }
    let kept = targets === cue.targets ? cue : { ...cue, targets };
    // Rule 5b: the arrival raises its caster's hand, unless its own row says otherwise.
    if (cue.kind === 'zone' && kept.params['gesture'] === undefined) {
      for (const id of kept.targets) {
        const caster = carried.get(id);
        if (caster === undefined) continue;
        kept = { ...kept, params: { ...kept.params, gesture: 'cast', gesturePlayer: caster } };
        carried.delete(id);
        break;
      }
    }
    out.push(kept);
  }
  return oneFlinchPerPlayer(out);
}

/** Rule 8: a player's `damage` flinch stands for the `life` loss it caused in the same batch. */
function oneFlinchPerPlayer(cues: Cue[]): Cue[] {
  const flinched = new Set<number>();
  for (const cue of cues) {
    if (cue.kind === 'damage' && cue.params['gesture'] === 'flinch') for (const player of cue.players) flinched.add(player);
  }
  if (flinched.size === 0) return cues;
  return cues.map((cue) =>
    cue.kind === 'life' && cue.params['gesture'] === 'flinch' && cue.players.some((player) => flinched.has(player))
      ? { ...cue, params: { ...cue.params, gesture: 'none' } }
      : cue,
  );
}

/** Rule 7: does this cue carry an aim the wire stated — a stack target, now or a frame ago? */
function isAimed(cue: Cue): boolean {
  const beam = cue.params['beamTo'];
  const strike = cue.params['strikeCard'];
  return (typeof beam === 'number' && beam >= 0) || (typeof strike === 'number' && strike >= 0);
}

/**
 * How long a batch takes to play out, with the overlap applied.
 *
 * §5.2 writes this as `Σ step.ms × 0.65 + last.ms`, and **that formula is wrong
 * whenever a long step is followed by a short one** — which is the commonest
 * shape in the corpus. A 700 ms `turn.banner` overlapped by a 180 ms
 * `tap.rotate` finishes at 700, not at 455 + 180 = 635, so a budget computed
 * from the sum let a batch run 275 ms inside a 250 ms budget. Measured on
 * `fixtures/games/human-comfort-13.jsonl` by §10.3's budget assertion, which is
 * exactly the sort of thing that assertion is for.
 *
 * The honest length is the latest finish of any step, and the schedule in
 * `enqueueBatch` lays cues out with the same arithmetic — so compressing by
 * `budget / naturalMs` now really does fit inside the budget.
 */
export function naturalMs(steps: readonly Step[]): number {
  let cursor = 0;
  let end = 0;
  for (const step of steps) {
    end = Math.max(end, cursor + step.ms);
    cursor += (1 - OVERLAP) * step.ms;
  }
  return end;
}

// ---------------------------------------------------------------------------
// The queue itself
// ---------------------------------------------------------------------------

interface Scheduled {
  cue: Cue;
  impl: CueImpl;
  ctx: CueContext;
  start: number;
  ms: number;
  batch: number;
  step: number;
  started: boolean;
  done: boolean;
  /**
   * **T8 fix — a death cue that will write a `die` clip** (`figures/clips.ts`'s
   * `isDeathCue`), stamped at enqueue. Under reduced motion no clip is ever
   * written, so no body is ever drawn dying either — the figure snaps, exactly
   * as its stance does.
   */
  dies: boolean;
}

export interface CueQueueOptions {
  stage: Stage;
  registry: CueRegistry;
  data?: CueData;
  mode?: QueueMode;
  /**
   * `prefers-reduced-motion: reduce` — §8 rule 7: every cue's duration scales to
   * {@link REDUCED_MOTION_SCALE} and every shake and camera move is dropped.
   */
  reducedMotion?: boolean;
  /** Diagnostics. Called at most once per distinct message. */
  onNote?: (message: string) => void;
}

/**
 * The queue. One per arena; created once and kept in a ref.
 *
 * **The clock is virtual.** `tick(now)` advances an internal millisecond count
 * by `(now − last) × speed`, and every scheduled time is in that count — so
 * pause, 0.5×…4× speed and "step one batch" are three lines each instead of a
 * scheduler, and a test drives the whole thing with a plain number.
 */
export class CueQueue {
  readonly stage: Stage;
  readonly registry: CueRegistry;
  data: CueData;
  mode: QueueMode;
  reducedMotion: boolean;

  #scheduled: Scheduled[] = [];
  #virtualNow = 0;
  #lastReal: number | null = null;
  #endOfQueue = 0;
  #speed = 1;
  #paused = false;
  #batchSeq = 0;
  #cueSeq = 0;
  #notes = new Set<string>();
  #onNote: ((message: string) => void) | null;
  #listeners = new Set<() => void>();
  /** Cue ids whose kind resolved to something; the coverage table's raw data. */
  readonly seen = new Map<string, number>();

  constructor(options: CueQueueOptions) {
    this.stage = options.stage;
    this.registry = options.registry;
    this.data = options.data ?? EMPTY_CUE_DATA;
    this.mode = options.mode ?? 'replay';
    this.reducedMotion = options.reducedMotion ?? false;
    this.#onNote = options.onNote ?? null;
  }

  // -- observation ---------------------------------------------------------

  /** Fired on enqueue, skip, flush and on the transition to and from idle. */
  onChange(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  get now(): number {
    return this.#virtualNow;
  }
  get speed(): number {
    return this.#speed;
  }
  get paused(): boolean {
    return this.#paused;
  }
  /** True when nothing is running and nothing is pending (§5.4's frameloop rule). */
  get idle(): boolean {
    return this.#scheduled.length === 0;
  }
  get length(): number {
    return this.#scheduled.length;
  }
  /** How many distinct steps have not finished — the §5.2 cap's counter. */
  get pendingSteps(): number {
    const keys = new Set<string>();
    for (const item of this.#scheduled) {
      if (!item.done) keys.add(`${String(item.batch)}:${String(item.step)}`);
    }
    return keys.size;
  }
  /** §10.3's budget assertion reads this. */
  totalRemainingMs(): number {
    return Math.max(0, this.#endOfQueue - this.#virtualNow);
  }

  /**
   * **T8 fix — is this card's death still to come, or playing?** True while a
   * death cue (`zone.dissolve`, `sacrifice.crush`, `zone.exile` — every cue
   * `CLIP_FOR` maps to `die`) that targets it is scheduled and not finished,
   * whether it has started or is still waiting behind the rest of its batch.
   *
   * It is what `DepartureField` decides a departing figure's fate by
   * (`figures/clips.ts`'s `stepDeparture`): the snapshot that carries a death has
   * already removed the living figure, and the death cue plays after the batch's
   * damage cues — so a body drawn only once its `die` REQUEST appeared vanished
   * when the blow landed and popped back to fall. Called once per departing body
   * per frame from the one `useFrame`, so it is an indexed loop over the schedule
   * and allocates nothing.
   */
  deathPending(cardId: number): boolean {
    const items = this.#scheduled;
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      if (!item.dies || item.done) continue;
      const targets = item.cue.targets;
      for (let j = 0; j < targets.length; j++) if (targets[j] === cardId) return true;
    }
    return false;
  }

  /**
   * **T13 — is a cue carrying this `gesture` param still to come, or playing?**
   * The duelist field asks it for `outcome`: the snapshot that ends the game
   * already says who won, so the loser's POSE is slumped before the batch's
   * damage cues have played — and a body that slumped under the killing blow and
   * then stood up for the outcome cue to slump it again would be the pose
   * contradicting the film (`figures/duelists.ts`'s `stanceEntry`, the D64 lesson
   * for a body that does not die). Called once per duelist per frame from the one
   * `useFrame`, so it is an indexed loop over the schedule and allocates nothing.
   */
  gesturePending(gesture: string): boolean {
    const items = this.#scheduled;
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      if (!item.done && item.cue.params['gesture'] === gesture) return true;
    }
    return false;
  }

  // -- controls (E4's replay strip) ----------------------------------------

  setSpeed(speed: number): void {
    this.#speed = speed > 0 ? speed : 1;
    this.#changed();
  }
  setPaused(paused: boolean): void {
    this.#paused = paused;
    this.#changed();
  }
  setMode(mode: QueueMode): void {
    this.mode = mode;
  }
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  /**
   * Snap the step that is playing now and pull everything after it forward.
   * "Skip cue" in the control strip.
   */
  skipCurrent(): void {
    const first = this.#scheduled.find((item) => !item.done);
    if (first === undefined) return;
    this.#snapGroup(first.batch, first.step);
    this.#changed();
  }

  /** Snap the whole of the earliest batch. "Step one batch", while paused. */
  stepBatch(): void {
    const first = this.#scheduled.find((item) => !item.done);
    if (first === undefined) return;
    const batch = first.batch;
    for (const item of [...this.#scheduled]) {
      if (item.batch === batch && !item.done) this.#snapGroup(item.batch, item.step);
    }
    this.#changed();
  }

  /** "Skip all": every pending cue snaps, the stage returns to identity. */
  skipAll(): void {
    this.flushAndSnap();
  }

  /**
   * **§5.1's whole model in one method.** Snap every running cue to its final
   * frame, end it, drop the queue and clear the stage. Because offsets are
   * transient, the scene is then *exactly* `layout(state)` — which is why a
   * replay scrub, a `resync`, a reconnect and a new `gameId` are all this one
   * call and none of them needs a rewind path.
   */
  flushAndSnap(): void {
    for (const item of this.#scheduled) {
      if (item.done) continue;
      try {
        item.impl.apply(item.ctx, 1, this.stage);
      } catch {
        // A cue that throws must not take the frame with it (§7.3: nothing in
        // the ladder can fail, and nothing downstream of it may either).
      }
      this.#end(item);
    }
    this.#scheduled = [];
    this.#endOfQueue = this.#virtualNow;
    this.stage.clearAll();
    this.#changed();
  }

  // -- intake --------------------------------------------------------------

  /**
   * §5.2 — plan, compress to the budget, and append to the timeline.
   *
   * Appending rather than interrupting is deliberate: the batches are the
   * engine's own order and a batch that arrives while the previous one is still
   * playing is the *next thing that happened*, not a correction. The tail is
   * re-compressed on arrival, so a queue that is falling behind gets faster
   * rather than longer.
   */
  enqueueBatch(
    events: readonly GameEvent[],
    state: ClientState,
    budgetMs?: number,
    previous: GameStateBody | null = null,
  ): number {
    const steps = planBatch(events, state, this.data, previous);
    if (steps.length === 0) {
      // Still re-budget: a batch of nothing but `phase` events is exactly when
      // the engine hands priority back, and the tail should hurry up.
      this.retimeToBudget(budgetFor(state, this.mode));
      return 0;
    }

    for (const step of steps) {
      for (const cue of step.cues) this.seen.set(cue.kind, (this.seen.get(cue.kind) ?? 0) + 1);
    }

    const budget = budgetMs ?? budgetFor(state, this.mode);
    const scale = compressionFor(steps, budget, this.reducedMotion);
    const batch = this.#batchSeq++;
    let cursor = Math.max(this.#virtualNow, this.#endOfQueue);
    // **A batch that lands on an idle queue starts its own clock** (see `tick`):
    // the real time since the last drain is the loop being parked, not film.
    if (this.#scheduled.length === 0) this.#lastReal = null;

    for (let s = 0; s < steps.length; s++) {
      const step = steps[s]!;
      for (let i = 0; i < step.cues.length; i++) {
        const cue = step.cues[i]!;
        const impl = this.registry.get(cue.id);
        if (impl === undefined) {
          this.note(`cue "${cue.id}" is not in the registry — ${cue.kind} animates as nothing`);
          continue;
        }
        const ms = durationOf(cue, scale, this.reducedMotion);
        const start = cursor + step.staggerMs * scale * i;
        this.#scheduled.push({
          cue,
          impl,
          ctx: {
            // Report 13 §3.5 — the clip lane is keyed on the cue id, so the
            // running cue has to know its own. It is the registry key, which is
            // what `CLIP_FOR` is indexed by.
            id: cue.id,
            targets: cue.targets,
            players: cue.players,
            params: cue.params,
            ms,
            key: `q${String(this.#cueSeq++)}`,
            reducedMotion: this.reducedMotion,
          },
          start,
          ms,
          batch,
          step: s,
          started: false,
          done: false,
          dies: !this.reducedMotion && isDeathCue(cue.id),
        });
      }
      cursor += (1 - OVERLAP) * step.ms * scale;
    }

    this.#endOfQueue = this.#scheduled.reduce(
      (max, item) => Math.max(max, item.start + item.ms),
      this.#virtualNow,
    );

    // §5.2 — the hard cap. A pathological turn degrades to "the board just
    // updated", never to a three-minute cutscene.
    if (this.pendingSteps > MAX_PENDING_STEPS) {
      this.note(
        `queue exceeded ${String(MAX_PENDING_STEPS)} pending steps — flushed and snapped (§5.2)`,
      );
      this.flushAndSnap();
      return 0;
    }

    this.#changed();
    return steps.length;
  }

  /**
   * §5.3 — re-compress everything that has not finished into `budgetMs`.
   *
   * Called whenever a new `state` arrives, which is how "the engine started
   * waiting on the human" turns into "the rest of the queue now fits in
   * 250 ms". A running cue keeps its progress across the change: its start is
   * moved, not its phase, so nothing jumps.
   */
  retimeToBudget(budgetMs: number): void {
    const remaining = this.totalRemainingMs();
    if (remaining <= budgetMs || remaining <= 0) return;
    const factor = budgetMs / remaining;
    if (factor < MIN_COMPRESSION) {
      this.flushAndSnap();
      return;
    }
    const now = this.#virtualNow;
    for (const item of this.#scheduled) {
      if (item.done || UNCOMPRESSIBLE.has(item.cue.id)) continue;
      const newMs = item.ms * factor;
      if (item.started && item.start <= now) {
        const progress = item.ms <= 0 ? 1 : Math.min(1, (now - item.start) / item.ms);
        item.start = now - progress * newMs;
      } else {
        item.start = now + (item.start - now) * factor;
      }
      item.ms = newMs;
      item.ctx.ms = newMs;
    }
    this.#endOfQueue = this.#scheduled.reduce(
      (max, item) => (item.done ? max : Math.max(max, item.start + item.ms)),
      now,
    );
    this.#changed();
  }

  // -- the clock -----------------------------------------------------------

  /**
   * Advance to real time `now` and drive every live cue. Called from the
   * arena's **one** `useFrame` and from tests; it allocates nothing per cue and
   * touches React not at all (§9.2 rules 6 and 7).
   *
   * **The clock only runs while there is film to play** (slice-2 verification
   * fix). An idle queue lets `frameloop="demand"` park the loop, so the next
   * tick can arrive seconds after the last one; that gap used to be added to the
   * cue clock whole, and the first frame of the next batch jumped past its own
   * start — the damage `hit`, the death cue and with it the departing body, all
   * consumed before they were drawn (measured: `human-auto-7` 794→795 stepped
   * after a 3 s pause drew its two dying bodies on 0 frames, against 84 of 87
   * after a 30 ms one). So an idle tick forgets the real time it saw, and
   * `enqueueBatch` does the same when a batch lands on an idle queue: the first
   * tick after it is that batch's `t = 0`. A late frame while cues ARE running
   * adds at most {@link MAX_TICK_MS}.
   */
  tick(now: number): void {
    if (this.#scheduled.length === 0) {
      this.#lastReal = null;
      return;
    }
    const last = this.#lastReal;
    this.#lastReal = now;
    if (last !== null && !this.#paused) {
      const dt = Math.min(now - last, MAX_TICK_MS);
      if (dt > 0) this.#virtualNow += dt * this.#speed;
    }
    this.#drive();
  }

  /** For tests and for "step one batch": advance the virtual clock directly. */
  advance(ms: number): void {
    if (ms > 0) this.#virtualNow += ms;
    this.#drive();
  }

  #drive(): void {
    if (this.#scheduled.length === 0) return;
    const now = this.#virtualNow;
    let anyDone = false;
    for (const item of this.#scheduled) {
      if (item.done || now < item.start) continue;
      item.started = true;
      const progress = item.ms <= 0 ? 1 : Math.min(1, (now - item.start) / item.ms);
      try {
        item.impl.apply(item.ctx, progress, this.stage);
      } catch (err) {
        this.note(`cue "${item.cue.id}" threw: ${(err as Error).message}`);
        item.done = true;
        anyDone = true;
        continue;
      }
      if (progress >= 1) {
        this.#end(item);
        anyDone = true;
      }
    }
    if (!anyDone) return;
    this.#scheduled = this.#scheduled.filter((item) => !item.done);
    if (this.#scheduled.length === 0) {
      // The net under §5.1: when the queue empties, the stage is returned to
      // identity whatever any individual `end()` did or forgot. `end()` is
      // still expected to be total — this is the assertion, not the mechanism.
      this.stage.clearAll();
      this.#endOfQueue = this.#virtualNow;
      this.#changed();
    }
  }

  #snapGroup(batch: number, step: number): void {
    let groupEnd = this.#virtualNow;
    for (const item of this.#scheduled) {
      if (item.done || item.batch !== batch || item.step !== step) continue;
      groupEnd = Math.max(groupEnd, item.start + item.ms);
      try {
        item.impl.apply(item.ctx, 1, this.stage);
      } catch {
        /* a cue that throws is still ended */
      }
      this.#end(item);
    }
    const saved = groupEnd - this.#virtualNow;
    if (saved > 0) {
      for (const item of this.#scheduled) {
        if (!item.done) item.start = Math.max(this.#virtualNow, item.start - saved);
      }
      this.#endOfQueue = Math.max(this.#virtualNow, this.#endOfQueue - saved);
    }
    this.#scheduled = this.#scheduled.filter((item) => !item.done);
    if (this.#scheduled.length === 0) this.stage.clearAll();
  }

  #end(item: Scheduled): void {
    try {
      item.impl.end(item.ctx, this.stage);
    } catch {
      /* end() is total by construction; a throw here must not stop the others */
    }
    item.done = true;
  }

  note(message: string): void {
    if (this.#notes.has(message)) return;
    this.#notes.add(message);
    this.#onNote?.(message);
  }

  /** Every distinct note, for the dev overlay and the tests. */
  get notes(): string[] {
    return [...this.#notes];
  }

  #changed(): void {
    for (const listener of this.#listeners) listener();
  }
}

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------

/**
 * §5.2 — the time-compression factor for one batch.
 *
 * **Compressing rather than dropping** is what makes §10.3's coverage assertion
 * meaningful: nothing ever silently vanishes, so "did we animate this kind?" is
 * a question the fixture sweep can answer by looking at what was queued. Below
 * {@link MIN_COMPRESSION} the cues snap instead — a 20 ms dissolve is not a
 * dissolve — and a snapped cue is still a cue that ran.
 */
export function compressionFor(
  steps: readonly Step[],
  budgetMs: number,
  reducedMotion = false,
): number {
  const natural = naturalMs(steps);
  let scale = 1;
  if (natural > budgetMs && natural > 0) {
    scale = budgetMs / natural;
    if (scale < MIN_COMPRESSION) scale = 0;
  }
  // §8 rule 7, on top of the budget rather than instead of it: a reduced-motion
  // batch that is *also* over budget gets both factors, and one that is already
  // snapped stays snapped.
  return reducedMotion ? scale * REDUCED_MOTION_SCALE : scale;
}

/**
 * One cue's played duration.
 *
 * `prefers-reduced-motion: reduce` scales it to {@link REDUCED_MOTION_SCALE} —
 * §8 rule 7's own number — and the scale it is handed already carries that
 * factor. The one branch that has to apply it by hand is the uncompressible
 * cue, which by definition ignores the scale.
 */
export function durationOf(cue: Cue, scale: number, reducedMotion: boolean): number {
  if (UNCOMPRESSIBLE.has(cue.id)) {
    return reducedMotion ? cue.ms * REDUCED_MOTION_SCALE : cue.ms;
  }
  return Math.max(0, cue.ms * scale);
}
