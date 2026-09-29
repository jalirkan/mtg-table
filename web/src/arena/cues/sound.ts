/*
 * mtg-table — arena/cues/sound.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Sound as a cue param** (D250): the closed clip vocabulary, the sound ladder,
 * the concealed-card gate, and the fixed-size buffer a stage collects one frame's
 * sounds in. Pure — no three, no React, no DOM, no clock, no Web Audio — so the
 * corpus sweeps run it under `node --test` exactly as they run the rest of
 * `cues/`. The one module that makes a noise is `scene/audio.ts`, and it is bound
 * from `CueRunner`'s frame loop and nowhere else.
 *
 * ---------------------------------------------------------------------------
 * **A sound is a renderer too, so hard rule 8's renderer half holds here.** A
 * per-card sound is a card's name by another spelling: a `comms` chirp on a
 * face-down creature entering says "that is Nick Fury" as plainly as his art
 * would. So the sound a cue plays is decided by {@link soundFor}, and for a
 * CONCEALED subject — a redacted stub or any face-down card — it reads no row at
 * all: the sound is the DEFAULT for the event's own selectors (`defaults.ts`'s
 * `DEFAULT_SOUNDS`, or the cue file's `defaults` override), never a card's or an
 * archetype's, and never a row's gain or timing either (a distinct gain is a
 * spelling too). The gate reads the concealment flags, never the name, so it holds
 * for a stub a hostile stream named — `sound.test.ts` sweeps the corpus made
 * hostile, with an ungated control that the sweep must catch.
 * ---------------------------------------------------------------------------
 *
 * The ladder, for a face-up subject:
 *
 *     the row the cue ladder found (card or archetype):  sound · soundAt · soundGain
 *       └ each key the row does not set falls through to →
 *     the default for the event's selectors, most specific first
 *       └ no default → no sound
 *
 * so every card that enters makes the enter sound unless its own row names
 * another (or `"sound": "none"`), however its CUE was chosen. That is the one
 * place this ladder differs from the cue ladder, which takes a whole row: a
 * card's row that retints its arrival should not also silence it.
 */

import { isFaceDown, isHidden, type AnyCard } from '../../protocol.ts';
import { DEFAULT_SOUNDS } from './defaults.ts';
import type { CueData, CueParams } from './types.ts';

// ---------------------------------------------------------------------------
// The vocabulary
// ---------------------------------------------------------------------------

/**
 * **Every clip the arena can play, and nothing else** — each one a file
 * `web/public/audio/<id>.ogg` (`scene/audio.ts`'s `SOUND_FILES`) with its
 * provenance in `tools/assets-manifest.json`. The first seven are the defaults'
 * (`defaults.ts`'s `DEFAULT_SOUNDS`); the last four are per-card — S.H.I.E.L.D.'s
 * headline cues in `cues.json` — and so are exactly the ids a concealed card must
 * never play (`PER_CARD_SOUNDS`).
 */
export const SOUND_IDS = [
  'enter',
  'lunge',
  'hit',
  'death',
  'resolve',
  'victory',
  'defeat',
  'comms',
  'laser',
  'rumble',
  'sting',
] as const;
export type SoundId = (typeof SOUND_IDS)[number];

/** The explicit silence a row may name: `"sound": "none"`. Not a clip. */
export const SOUND_NONE = 'none';

const SOUND_SET: ReadonlySet<string> = new Set<string>(SOUND_IDS);

export function isSoundId(value: unknown): value is SoundId {
  return typeof value === 'string' && SOUND_SET.has(value);
}

/** What `validate.ts` accepts for the `sound` param: a clip id or `none`. */
export function isSoundParam(value: unknown): boolean {
  return value === SOUND_NONE || isSoundId(value);
}

/** `soundAt`: where in the cue the sound starts, as a fraction of the cue. */
export const SOUND_AT_RANGE = [0, 1] as const;
/** `soundGain`: the voice's gain before the master gain. Above 1 is allowed a little. */
export const SOUND_GAIN_RANGE = [0, 1.5] as const;

/** One row of `DEFAULT_SOUNDS`, and what a cue-file `defaults` row may set. */
export interface SoundSpec {
  sound: SoundId | typeof SOUND_NONE;
  /** Fraction of the cue at which it starts. Absent is 0. */
  at?: number;
  /** Absent is 1. */
  gain?: number;
}

/** A decided sound: a real clip, a start and a gain. */
export interface SoundPlay {
  sound: SoundId;
  at: number;
  gain: number;
}

// ---------------------------------------------------------------------------
// The gate and the ladder
// ---------------------------------------------------------------------------

/**
 * **Hard rule 8's renderer half, for a sound**: a redacted stub, or ANY face-down
 * card (the same two gates `layout.ts` sets `Placement.back` from). Decided from
 * the flags the wire carries, never from whether a name is present.
 */
export function isConcealed(card: AnyCard | null): boolean {
  return card !== null && (isHidden(card) || isFaceDown(card));
}

function numberIn(value: unknown, range: readonly [number, number]): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= range[0] && value <= range[1]
    ? value
    : null;
}

/**
 * The DEFAULT sound for an event's selectors, most specific first: at each
 * selector the cue file's `defaults` override (a row whose params name a
 * `sound`) and then the built-in `DEFAULT_SOUNDS`. `null` is silence.
 */
export function defaultSoundFor(selectors: readonly string[], data: CueData): SoundPlay | null {
  for (const selector of selectors) {
    const override = data.defaults?.[selector]?.params;
    if (override !== undefined && override['sound'] !== undefined) {
      return playOf(override['sound'], override['soundAt'], override['soundGain']);
    }
    const spec = DEFAULT_SOUNDS[selector];
    if (spec !== undefined) return playOf(spec.sound, spec.at, spec.gain);
  }
  return null;
}

function playOf(sound: unknown, at: unknown, gain: unknown): SoundPlay | null {
  if (!isSoundId(sound)) return null;
  return {
    sound,
    at: numberIn(at, SOUND_AT_RANGE) ?? 0,
    gain: numberIn(gain, SOUND_GAIN_RANGE) ?? 1,
  };
}

/** What `resolve.ts`'s ladder found, as much of it as the sound needs. */
export interface FoundRow {
  source: 'card' | 'archetype' | 'default' | 'none';
  params?: CueParams;
}

/**
 * **The sound one cue plays** — the ladder in this file's header, behind the gate.
 *
 * `concealed` is {@link isConcealed} of the cue's subject, computed by the caller
 * from the same subject the cue ladder read; with it `true` no row is consulted.
 * The workshop's and the tests' ungated control passes `false` for a concealed
 * subject, which is exactly the defect the corpus sweep has to catch.
 */
export function soundFor(
  selectors: readonly string[],
  found: FoundRow,
  concealed: boolean,
  data: CueData,
): SoundPlay | null {
  const fallback = defaultSoundFor(selectors, data);
  if (concealed || (found.source !== 'card' && found.source !== 'archetype')) return fallback;
  const row = found.params;
  if (row === undefined) return fallback;
  const named = row['sound'];
  if (named === SOUND_NONE) return null;
  if (named !== undefined) {
    // The row names its own clip: its timing and gain are its own, or neutral.
    return playOf(named, row['soundAt'], row['soundGain']);
  }
  if (fallback === null) return null;
  // The row keeps the default clip and may move or scale it.
  return {
    sound: fallback.sound,
    at: numberIn(row['soundAt'], SOUND_AT_RANGE) ?? fallback.at,
    gain: numberIn(row['soundGain'], SOUND_GAIN_RANGE) ?? fallback.gain,
  };
}

/**
 * The sound a planned cue carries, read back off its params (`resolve.ts` writes
 * the DECIDED sound there, overwriting whatever the row said). `null` is none.
 */
export function soundOfParams(params: CueParams): SoundPlay | null {
  return playOf(params['sound'], params['soundAt'], params['soundGain']);
}

/** Every clip id the defaults name — the only ids a concealed card may play. */
export function defaultSoundIds(): ReadonlySet<SoundId> {
  const out = new Set<SoundId>();
  for (const spec of Object.values(DEFAULT_SOUNDS)) if (isSoundId(spec.sound)) out.add(spec.sound);
  return out;
}

// ---------------------------------------------------------------------------
// One frame's sounds, collected without allocating
// ---------------------------------------------------------------------------

/** How many sounds one frame may ask for. More are dropped, never queued. */
export const MAX_PENDING_SOUNDS = 16;

/** One requested sound: numbers and a clip id — never a card, never a name. */
export interface SoundSlot {
  sound: SoundId;
  gain: number;
  /** The card it is about (for its pan), or −1. */
  cardId: number;
  /** The player it is about, or −1. */
  playerId: number;
}

/**
 * **The stage's sound buffer**: a fixed array of {@link MAX_PENDING_SOUNDS}
 * slots filled by the queue during `tick` and drained by the audio module in the
 * same frame (`ArenaAudio.bind`). A request past the cap is DROPPED — a sound
 * never waits — and `cut` is a flush's "stop every voice", honoured before the
 * frame's new sounds play. Nothing here allocates after construction.
 */
export class PendingSounds {
  readonly slots: SoundSlot[];
  count = 0;
  /** A flush, a skip or a pause asked for silence; the audio module clears it. */
  cut = false;
  /** Requests refused by the cap, for the probe. */
  dropped = 0;

  constructor(capacity = MAX_PENDING_SOUNDS) {
    this.slots = [];
    for (let i = 0; i < capacity; i++) this.slots.push({ sound: 'hit', gain: 0, cardId: -1, playerId: -1 });
  }

  push(sound: SoundId, gain: number, cardId: number, playerId: number): boolean {
    if (this.count >= this.slots.length) {
      this.dropped += 1;
      return false;
    }
    const slot = this.slots[this.count]!;
    slot.sound = sound;
    slot.gain = gain;
    slot.cardId = cardId;
    slot.playerId = playerId;
    this.count += 1;
    return true;
  }

  /** Stop everything: the pending requests go, and the voices are cut on the next bind. */
  cutAll(): void {
    this.count = 0;
    this.cut = true;
  }

  /** Forget the pending requests (a frame loop with no audio module to hand them to). */
  drop(): void {
    this.count = 0;
    this.cut = false;
  }
}
