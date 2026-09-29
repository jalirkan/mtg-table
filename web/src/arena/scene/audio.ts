/*
 * mtg-table — arena/scene/audio.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **THE audio module** (D250, D251): one Web Audio graph for the page, a fixed
 * pool of voices, the decoded clips keyed by id, and a `play` that allocates
 * nothing. It is the arena's sound RENDERER, and it obeys the renderer's rules:
 *
 *  - **It is bound from `CueRunner`'s frame loop and nowhere else** (`bind`,
 *    once a frame, after `queue.tick`). The cue queue decides WHEN — a cue's
 *    `sound` fires when its progress crosses `soundAt` (`cues/queue.ts`) — so this
 *    module has no clock and starts no timer; an idle table makes no sound and
 *    runs no loop.
 *  - **It imports no three and no React**, and it names no URL scheme: the clips
 *    are same-origin files under `web/public/audio/` (`SOUND_FILES`, a path SHAPE
 *    `liveness.test.ts`'s load-path clause allows for this file alone), and the
 *    bytes come through a loader the caller hands in — `scene/models.ts`'s
 *    `loadAssetBytes`, three's own `FileLoader`, the arena's one way to a file.
 *  - **It decides nothing about a card.** It is handed a clip id from the closed
 *    list, a gain and a pan; which clip a concealed card may play was decided
 *    long before it got here (`cues/sound.ts`'s gate, hard rule 8's renderer half).
 *
 * **Muted by default, and created on a gesture** (D251). No `AudioContext` exists
 * until `unlock()` is called from inside a user gesture's handler (browsers refuse
 * to start one otherwise): the sound checkbox, the `M` key, or — when the viewer
 * turned sound on in an earlier visit — the first pointer or key press on the
 * page. A viewer who never turns sound on never gets a context at all. The choice
 * is kept in this browser by `Arena.tsx` (`mtg-table.arena.sound`, D71's pattern:
 * every access inside `try`); {@link soundOn} is how the choice and
 * `prefers-reduced-motion` combine.
 *
 * **The voices** (D251): {@link MAX_VOICES} of them, each a gain and a stereo
 * panner built once at unlock, each holding one ARMED buffer source — created and
 * connected ahead of time, because a Web Audio source plays once and cannot be
 * reused. `play` takes a free voice's armed source, sets its buffer, gain and pan
 * and starts it: no allocation. A voice re-arms when its source ENDS (the
 * source's own `onended`, an event, never the frame loop) or when `stopAll` cuts
 * it. With every voice busy a new sound is DROPPED and counted — it never waits,
 * never steals, never blocks the frame.
 */

import { SOUND_IDS, type PendingSounds, type SoundId } from '../cues/sound.ts';

// ---------------------------------------------------------------------------
// The numbers
// ---------------------------------------------------------------------------

/** How many sounds can ring at once. A ninth is dropped, never queued. */
export const MAX_VOICES = 8;
/** The master gain under every voice: the clips are mixed to sit under the table, not over it. */
export const MASTER_GAIN = 0.7;
/** How far a sound may pan toward one ear: never fully, so both ears hear every sound. */
export const PAN_LIMIT = 0.8;
/** The loudest a single voice may be (the validator's `soundGain` ceiling). */
export const VOICE_GAIN_MAX = 1.5;

/**
 * **Sound is off until the viewer turns it on** (D251). Kept beside the module
 * rather than in the component so reading it loads nothing.
 */
export const SOUND_DEFAULT = false;

/**
 * **Every clip file, by id** — same-origin paths under `web/public/audio/`, OGG
 * Opus (decoded by Chromium and Firefox here; `docs/evidence/sound-cues.md`), each
 * with its provenance in `tools/assets-manifest.json`. `liveness.test.ts` allows
 * exactly this path shape, in this file.
 */
export const SOUND_FILES: Readonly<Record<SoundId, string>> = {
  enter: 'audio/enter.ogg',
  lunge: 'audio/lunge.ogg',
  hit: 'audio/hit.ogg',
  death: 'audio/death.ogg',
  resolve: 'audio/resolve.ogg',
  victory: 'audio/victory.ogg',
  defeat: 'audio/defeat.ogg',
  comms: 'audio/comms.ogg',
  laser: 'audio/laser.ogg',
  rumble: 'audio/rumble.ogg',
  sting: 'audio/sting.ogg',
};

// ---------------------------------------------------------------------------
// The choice (D251)
// ---------------------------------------------------------------------------

/** What this browser was told: on, off, or nothing yet. */
export type SoundChoice = 'on' | 'off' | null;

export function isSoundChoice(value: unknown): value is 'on' | 'off' {
  return value === 'on' || value === 'off';
}

/**
 * **Whether the arena makes a sound.** An explicit choice always wins — a viewer
 * who turned sound ON hears it under `prefers-reduced-motion` too (sound is not
 * motion, and they asked). With no choice the default holds, and under reduced
 * motion no default ever turns sound on. Today the default is off, so the arena
 * is silent until the viewer says otherwise, reduced motion or not.
 */
export function soundOn(choice: SoundChoice, reducedMotion: boolean): boolean {
  if (choice !== null) return choice === 'on';
  return SOUND_DEFAULT && !reducedMotion;
}

// ---------------------------------------------------------------------------
// The slice of Web Audio this module touches — typed by hand, so a test can
// hand in a fake and count what was built and started.
// ---------------------------------------------------------------------------

export interface AudioParamLike {
  value: number;
}
export interface AudioNodeLike {
  connect(destination: AudioNodeLike): unknown;
}
export interface GainNodeLike extends AudioNodeLike {
  readonly gain: AudioParamLike;
}
export interface PannerNodeLike extends AudioNodeLike {
  readonly pan: AudioParamLike;
}
export interface AudioBufferLike {
  readonly duration: number;
}
export interface SourceNodeLike extends AudioNodeLike {
  buffer: AudioBufferLike | null;
  onended: ((event: { target: unknown }) => void) | null;
  start(): void;
  stop(): void;
}
export interface AudioContextLike {
  readonly state: string;
  readonly sampleRate: number;
  readonly destination: AudioNodeLike;
  createGain(): GainNodeLike;
  createStereoPanner?(): PannerNodeLike;
  createBufferSource(): SourceNodeLike;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBufferLike>;
  resume(): Promise<void>;
}

/** Where a clip's bytes come from. The page hands in `scene/models.ts`'s `loadAssetBytes`. */
export type ClipLoader = (path: string) => Promise<ArrayBuffer>;
/** A sound's pan in [−1, 1] from what it is about. `CueRunner` projects the card. */
export type SoundPan = (cardId: number, playerId: number) => number;

interface Voice {
  gain: GainNodeLike;
  panner: PannerNodeLike | null;
  /** A fresh source, connected to `gain`, waiting to be started. */
  armed: SourceNodeLike | null;
  /** The source now sounding, or `null` when the voice is free. */
  playing: SourceNodeLike | null;
  /** Made once per voice: frees and re-arms it when ITS source ends. */
  ended: (event: { target: unknown }) => void;
}

/** What the probe and the tests read. Counters only — never a card, never a name. */
export interface AudioStats {
  /** Sounds the film asked for. */
  requested: number;
  /** Sounds a voice started. */
  played: number;
  /** Refused: every voice was busy. */
  dropped: number;
  /** Not played: muted, not unlocked, or the clip not decoded yet. */
  silenced: number;
  /** `stopAll` calls: flushes, skips, pauses, mute, unmount. */
  cuts: number;
  /** Clips decoded, and clips that failed to load or decode. */
  loaded: number;
  failed: number;
}

export interface AudioOptions {
  /** Builds the context. Called once, from `unlock()`, i.e. inside a gesture. */
  context?: () => AudioContextLike | null;
  /** Where the clips' bytes come from; `null` loads nothing (a test, or no page). */
  load?: ClipLoader | null;
}

export class ArenaAudio {
  readonly stats: AudioStats = { requested: 0, played: 0, dropped: 0, silenced: 0, cuts: 0, loaded: 0, failed: 0 };
  readonly #make: () => AudioContextLike | null;
  readonly #load: ClipLoader | null;
  #ctx: AudioContextLike | null = null;
  readonly #voices: Voice[] = [];
  readonly #buffers = new Map<SoundId, AudioBufferLike>();
  #enabled = false;

  constructor(options: AudioOptions = {}) {
    this.#make = options.context ?? browserContext;
    this.#load = options.load ?? null;
  }

  /** Whether sound is on (the viewer's choice through {@link soundOn}). */
  get enabled(): boolean {
    return this.#enabled;
  }

  /** Whether a context exists — i.e. a gesture has unlocked the page. */
  get unlocked(): boolean {
    return this.#ctx !== null;
  }

  /** On or off. Off cuts every voice at once and makes `play` a no-op. */
  setEnabled(on: boolean): void {
    if (this.#enabled === on) return;
    this.#enabled = on;
    if (!on) this.stopAll();
  }

  /**
   * **Create the graph — call this from INSIDE a user gesture's handler.** The
   * first call builds the context, the master gain and the voices and starts
   * loading every clip (once a page); a later call resumes a context the browser
   * suspended. Returns whether a context exists.
   */
  unlock(): boolean {
    if (this.#ctx === null) {
      let ctx: AudioContextLike | null = null;
      try {
        ctx = this.#make();
      } catch {
        ctx = null;
      }
      if (ctx === null) return false;
      this.#ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(ctx.destination);
      for (let i = 0; i < MAX_VOICES; i++) {
        const gain = ctx.createGain();
        const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
        if (panner === null) gain.connect(master);
        else {
          gain.connect(panner);
          panner.connect(master);
        }
        const voice: Voice = {
          gain,
          panner,
          armed: null,
          playing: null,
          ended: (event) => {
            // Only the source this voice is still playing frees it: a source that
            // `stopAll` already let go of ends later and must not touch the voice.
            if (event.target !== voice.playing) return;
            voice.playing = null;
            if (voice.armed === null) this.#arm(voice);
          },
        };
        this.#arm(voice);
        this.#voices.push(voice);
      }
      this.#loadAll(ctx);
    }
    if (this.#ctx.state === 'suspended') {
      this.#ctx.resume().catch(() => {
        // A browser that still refuses stays silent; the next gesture tries again.
      });
    }
    return true;
  }

  /**
   * **One sound, now — and nothing allocated.** Takes a free voice's armed
   * source, sets its buffer, gain and pan, and starts it. Returns `false` (and
   * counts why) when muted, before a gesture, before the clip is decoded, or when
   * every voice is busy — a sound that cannot play is dropped, never queued.
   */
  play(sound: SoundId, gain: number, pan: number): boolean {
    this.stats.requested += 1;
    if (!this.#enabled || this.#ctx === null) {
      this.stats.silenced += 1;
      return false;
    }
    const buffer = this.#buffers.get(sound);
    if (buffer === undefined) {
      this.stats.silenced += 1;
      return false;
    }
    const voice = this.#free();
    if (voice === null) {
      this.stats.dropped += 1;
      return false;
    }
    const source = voice.armed!;
    voice.armed = null;
    source.buffer = buffer;
    voice.gain.gain.value = gain <= 0 ? 0 : gain >= VOICE_GAIN_MAX ? VOICE_GAIN_MAX : gain;
    if (voice.panner !== null) voice.panner.pan.value = pan <= -PAN_LIMIT ? -PAN_LIMIT : pan >= PAN_LIMIT ? PAN_LIMIT : pan;
    voice.playing = source;
    source.start();
    this.stats.played += 1;
    return true;
  }

  /**
   * **Cut every voice** — a flush, a skip, a pause, mute, unmount. Each cut voice
   * is free again at once (re-armed here, not when its source's `ended` event
   * arrives), so the sounds of the batch that follows a flush in the same frame
   * find their voices.
   */
  stopAll(): void {
    this.stats.cuts += 1;
    for (let i = 0; i < this.#voices.length; i++) {
      const voice = this.#voices[i]!;
      const playing = voice.playing;
      if (playing === null) continue;
      voice.playing = null;
      playing.onended = null;
      try {
        playing.stop();
      } catch {
        // Already stopped: nothing to do.
      }
      if (voice.armed === null) this.#arm(voice);
    }
  }

  /**
   * **The frame loop's one call** (`CueRunner`, after `queue.tick`): honour a cut,
   * then play this frame's sounds, then empty the buffer. Allocation-free on
   * every path; the pan resolver is a stable function the runner built once.
   */
  bind(pending: PendingSounds, pan: SoundPan): void {
    if (pending.cut) {
      pending.cut = false;
      this.stopAll();
    }
    const n = pending.count;
    if (n === 0) return;
    pending.count = 0;
    if (!this.#enabled || this.#ctx === null) {
      this.stats.requested += n;
      this.stats.silenced += n;
      return;
    }
    const slots = pending.slots;
    for (let i = 0; i < n; i++) {
      const slot = slots[i]!;
      this.play(slot.sound, slot.gain, pan(slot.cardId, slot.playerId));
    }
  }

  /** How many voices are sounding. For the probe and the tests. */
  busyVoices(): number {
    let busy = 0;
    for (let i = 0; i < this.#voices.length; i++) if (this.#voices[i]!.playing !== null) busy += 1;
    return busy;
  }

  /** The graph, as numbers and words — the probe's `window.__mtgArena.audio.describe()`. */
  describe(): { state: string; sampleRate: number; voices: number; busy: number; clips: number; enabled: boolean } {
    return {
      state: this.#ctx?.state ?? 'none',
      sampleRate: this.#ctx?.sampleRate ?? 0,
      voices: this.#voices.length,
      busy: this.busyVoices(),
      clips: this.#buffers.size,
      enabled: this.#enabled,
    };
  }

  #free(): Voice | null {
    for (let i = 0; i < this.#voices.length; i++) {
      const voice = this.#voices[i]!;
      if (voice.playing === null && voice.armed !== null) return voice;
    }
    return null;
  }

  /** A fresh source for a voice: created, connected, waiting. Off the play path. */
  #arm(voice: Voice): void {
    const ctx = this.#ctx;
    if (ctx === null) return;
    const source = ctx.createBufferSource();
    source.connect(voice.gain);
    source.onended = voice.ended;
    voice.armed = source;
  }

  /** Every clip, once a page, decoded into the pool. A clip that fails stays silent. */
  #loadAll(ctx: AudioContextLike): void {
    const load = this.#load;
    if (load === null) return;
    for (const sound of SOUND_IDS) {
      load(SOUND_FILES[sound])
        .then((bytes) => ctx.decodeAudioData(bytes))
        .then((buffer) => {
          this.#buffers.set(sound, buffer);
          this.stats.loaded += 1;
        })
        .catch(() => {
          this.stats.failed += 1;
        });
    }
  }
}

/** The browser's own context, or `null` where there is none (a test, an old browser). */
function browserContext(): AudioContextLike | null {
  const scope = globalThis as unknown as {
    AudioContext?: new () => unknown;
    webkitAudioContext?: new () => unknown;
  };
  const Ctor = scope.AudioContext ?? scope.webkitAudioContext;
  return Ctor === undefined ? null : (new Ctor() as AudioContextLike);
}

let shared: ArenaAudio | null = null;

/**
 * **The page's one audio module.** The arena and the workshop's pedestal are never
 * mounted together, and a page gets ONE `AudioContext` (browsers cap how many a
 * page may open), so both ask for this one. The first caller's loader is the one
 * it keeps.
 */
export function sharedAudio(load: ClipLoader): ArenaAudio {
  shared ??= new ArenaAudio({ load });
  return shared;
}
