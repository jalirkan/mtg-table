/*
 * mtg-table — arena/scene/SceneStage.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The `Stage` the browser gets** (report 09 §2.4): the same interface the
 * fixture sweep drives with a `NullStage`, backed by the frame that is actually
 * on screen.
 *
 * It holds no scene objects and mutates nothing: it collects this frame's
 * offsets and effects into two maps and answers `deltaTo` out of `layout.ts`.
 * `CueRunner.tsx` is what turns those maps into `Object3D` writes, in one
 * `useFrame`. Keeping the two apart is what lets the cue engine be tested with
 * no WebGL and lets the renderer be read without reading the cues.
 */

import { clipBeats, NO_CLIP, type ClipRequest } from '../figures/clips.ts';
import {
  IDENTITY,
  bucketSize,
  composeInto,
  effectBucketOf,
  effectCapOf,
  resetOffset,
  type AnchorRef,
  type CameraRequest,
  type Effect,
  type Offset,
  type Stage,
  type Vec3,
} from '../cues/stage.ts';
import { anchorDelta, anchorPosition, figureYawTo, type Layout } from '../layout.ts';

const EMPTY_LAYOUT_DELTA: Vec3 = [0, 0, 0];

export class SceneStage implements Stage {
  /** The frame the cues are animating *into*. Replaced whenever `state` changes. */
  layout: Layout;
  /** This frame's card offsets, composed. Keyed by card id (§5.1). */
  readonly offsets = new Map<number, Offset>();
  /** Live effects, keyed by `<cue key>:<suffix>`. */
  readonly effects = new Map<string, Effect>();
  /**
   * **The clip lane** (report 13 §3.3): this frame's winning pose request per
   * card id. Cleared by `beginFrame` like the offsets, so a cue that has ended
   * contributes nothing because it is no longer applied — never because anything
   * remembered to undo it.
   */
  readonly clips = new Map<number, ClipRequest>();
  /**
   * §8 — this frame's camera request, or `null`.
   *
   * **Per-frame, exactly like an offset** (E5). A cue re-asks on every one of
   * its frames and `beginFrame` clears the slot, which is what makes rule 2
   * work without a subscription: while the cue runs the same request arrives
   * again and is *dropped* as equal-priority; when the cue ends the requests
   * simply stop, and the director plays the move out and goes home.
   */
  camera: CameraRequest | null = null;
  /**
   * Whether a cue touched the camera lane this frame at all.
   *
   * `camera === null` is ambiguous on its own — it is both "nobody asked" and
   * `turn.banner`'s deliberate *release* of the lane — and the difference is
   * the whole of §8 rule 1's "always returns to it".
   */
  cameraTouched = false;
  /** How many effects the §9.3 cap refused, for the dev overlay. */
  refusedEffects = 0;
  /**
   * §9.2 rule 6 — **one `Offset` object per card id, for the life of the page.**
   *
   * `setOffset` is called once per running cue per target per frame, and the
   * obvious spelling (`composeOffsets(existing, offsetFrom(partial))`) allocated
   * two objects every time: at 60 fps with a busy batch that is a few hundred
   * short-lived objects a second feeding a GC sawtooth, in the one function the
   * whole frame budget lives in. The objects here are handed out by
   * {@link offsetOf} and read within the same frame by `CueRunner`; nothing
   * retains one, which is what makes reuse safe.
   */
  readonly #pool = new Map<number, Offset>();
  /** The same trick for the clip lane: one mutable request object per card id. */
  readonly #clipPool = new Map<number, ClipRequest>();

  constructor(layout: Layout) {
    this.layout = layout;
  }

  /**
   * Start a frame: drop the previous frame's contributions.
   *
   * Offsets are re-derived from scratch every tick — every running cue writes
   * its own each time `apply` is called — so this is what makes two cues on one
   * card **compose** rather than race. A cue that has ended contributes nothing
   * because it is no longer applied, not because anything remembered to undo
   * it, which is §5.1 stated as code.
   */
  beginFrame(layout?: Layout): void {
    if (layout !== undefined) this.layout = layout;
    this.offsets.clear();
    this.clips.clear();
    this.camera = null;
    this.cameraTouched = false;
  }

  deltaTo(cardId: number, anchor: AnchorRef): Vec3 {
    if (this.layout.placements.length === 0) return EMPTY_LAYOUT_DELTA;
    return anchorDelta(this.layout, cardId, anchor);
  }

  /** The turn that faces this card's figure toward `anchor` — `layout.ts`'s answer, never the cue's. */
  yawTo(cardId: number, anchor: AnchorRef): number {
    if (this.layout.placements.length === 0) return 0;
    return figureYawTo(this.layout, cardId, anchor);
  }

  /**
   * Resolve an anchor for the effect pool. `null` = this frame cannot place it.
   *
   * **An arrow property, not a method**, so `pool.bind(effects, stage.positionOf,
   * camera)` passes a stable reference instead of building a fresh
   * `(ref) => stage.positionOf(ref)` closure on every one of the frame loop's
   * sixty passes a second (§9.2 rule 6).
   */
  readonly positionOf = (anchor: AnchorRef): [number, number, number] | null =>
    anchorPosition(this.layout, anchor);

  setOffset(cardId: number, offset: Partial<Offset>): void {
    let target = this.offsets.get(cardId);
    if (target === undefined) {
      // First writer this frame: take this card's pooled object, wipe it back to
      // identity and compose onto that. `composeInto(identity, partial)` is
      // exactly `offsetFrom(partial)` — every op in `composeOffsets` has
      // identity's value as its neutral element — so there is one code path.
      target = this.#pool.get(cardId);
      if (target === undefined) {
        target = { ...IDENTITY };
        this.#pool.set(cardId, target);
      }
      resetOffset(target);
      this.offsets.set(cardId, target);
    }
    composeInto(target, offset);
  }

  clearOffset(cardId: number): void {
    this.offsets.delete(cardId);
  }

  setEffect(key: string, effect: Effect): void {
    // Two buckets, not one (report 13 §5.4): a `mote` is a 0.07-unit dot and the
    // eight-slot cap was sized against full-size blended quads. See
    // `cues/stage.ts`'s `EffectKind`.
    if (
      !this.effects.has(key) &&
      bucketSize(this.effects, effectBucketOf(effect.kind)) >= effectCapOf(effect.kind)
    ) {
      // §9.3 rule 1: over budget, an effect is simply not drawn. The cue keeps
      // playing — "degrade, don't stutter" — and the card motion, which is the
      // part that carries the meaning, is untouched.
      this.refusedEffects += 1;
      return;
    }
    this.effects.set(key, effect);
  }

  clearEffect(key: string): void {
    this.effects.delete(key);
  }

  /**
   * **One request per card, chosen by a total order** (report 13 §3.3).
   *
   * The arbitration is `figures/clips.ts`'s `clipBeats` — the same function
   * `NullStage` uses and the one `clips.test.ts` drives over shuffled
   * permutations — so the pose a figure holds when two cues want it is a pure
   * function of the two requests and not of which cue the queue reached first.
   *
   * The stored object is pooled per card id for the same reason `setOffset`'s is
   * (§9.2 rule 6): this is called once per running cue per target per frame.
   */
  setClip(cardId: number, request: ClipRequest): void {
    const incumbent = this.clips.get(cardId);
    if (incumbent !== undefined && !clipBeats(request, incumbent)) return;
    let target = this.#clipPool.get(cardId);
    if (target === undefined) {
      target = { ...NO_CLIP };
      this.#clipPool.set(cardId, target);
    }
    target.clip = request.clip;
    target.t = request.t;
    target.weight = request.weight;
    target.alias = request.alias;
    target.key = request.key;
    this.clips.set(cardId, target);
  }

  clearClip(cardId: number): void {
    this.clips.delete(cardId);
  }

  /** The winning clip for one card this frame, or `null` — hold the stance. */
  clipOf(cardId: number): ClipRequest | null {
    return this.clips.get(cardId) ?? null;
  }

  requestCamera(request: CameraRequest | null): void {
    this.camera = request;
    this.cameraTouched = true;
  }

  clearAll(): void {
    this.offsets.clear();
    this.effects.clear();
    this.clips.clear();
    this.camera = null;
    this.cameraTouched = false;
  }

  /** The offset for one card, or identity. Allocation-free on the common path. */
  offsetOf(cardId: number): Offset {
    return this.offsets.get(cardId) ?? IDENTITY;
  }
}
