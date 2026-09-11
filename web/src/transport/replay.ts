/*
 * mtg-table — transport/replay.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The log-replay transport: a recorded `.jsonl` frame log (docs/protocol.md §8)
 * driving exactly the reducer a live socket drives. This is what lets every
 * front-end evening run with no JVM (synthesis §4).
 *
 * "Step back" is the interesting part. `reduce` has no inverse, so going back
 * one frame means **replaying from the session header to index-1** through the
 * pure reducer. That is `replayFrames`, and it is why `reduce.ts` is forbidden
 * from having side effects. A 605-frame game re-folds in well under a
 * millisecond, so there is no reason to be cleverer.
 *
 * No DOM: this module is imported by `node --test` as well as by the browser.
 * The only host API it touches is `setTimeout`/`clearTimeout`.
 */

import { PROTOCOL_VERSION, type Frame, type SessionHeader } from '../protocol.ts';
import { initialState, reduce, replayFrames, type ClientState } from '../reduce.ts';
import type { FrameHandler, Transport } from './transport.ts';

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * A parsed frame log. Unlike the strict §8 shape in `protocol.ts`, `header` may
 * be `null` here: a log whose line 0 is not a session header is malformed, but
 * we would rather render it with a visible warning than refuse to open it.
 */
export interface ParsedFrameLog {
  header: SessionHeader | null;
  frames: Frame[];
  /** Non-fatal complaints: a missing header, a skipped junk line. */
  warnings: string[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSessionHeader(value: unknown): value is SessionHeader {
  return isObject(value) && value['kind'] === 'session';
}

/**
 * Minimal structural check. Deliberately shallow: anything deeper is the
 * reducer's job, and the reducer's job is to THROW loudly (docs/protocol.md §1)
 * rather than to let a malformed frame render as an empty board.
 */
function looksLikeFrame(value: unknown): value is Frame {
  return (
    isObject(value) &&
    typeof value['v'] === 'number' &&
    typeof value['seq'] === 'number' &&
    typeof value['t'] === 'number' &&
    typeof value['type'] === 'string' &&
    isObject(value['body'])
  );
}

/**
 * Parse the text of a `.jsonl` frame log (docs/protocol.md §8).
 *
 * Line 0 is the session header (`"kind":"session"`), every later line a §1
 * envelope plus `dir`. Blank lines are skipped. A line that is not valid JSON,
 * or is JSON but not shaped like a frame, is recorded in `warnings` and skipped
 * — a truncated last line is the normal way a killed JVM ends a log.
 */
export function parseFrameLog(text: string): ParsedFrameLog {
  const warnings: string[] = [];
  const frames: Frame[] = [];
  let header: SessionHeader | null = null;

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line === '') continue;

    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch (err) {
      warnings.push(`line ${String(i + 1)}: not valid JSON (${(err as Error).message}) — skipped`);
      continue;
    }

    if (isSessionHeader(value)) {
      if (header === null) {
        header = value;
        if (i !== 0) warnings.push(`line ${String(i + 1)}: session header is not line 1`);
      } else {
        warnings.push(`line ${String(i + 1)}: a second session header — skipped`);
      }
      continue;
    }

    if (!looksLikeFrame(value)) {
      warnings.push(`line ${String(i + 1)}: not a frame envelope (§1) — skipped`);
      continue;
    }

    frames.push(value);
  }

  if (header === null) {
    warnings.push('no session header (docs/protocol.md §8.1 line 0) in this log');
  } else if (header.v !== PROTOCOL_VERSION) {
    warnings.push(
      `session header declares v=${String(header.v)}; this client speaks v=${String(PROTOCOL_VERSION)}`,
    );
  }

  return { header, frames, warnings };
}

// ---------------------------------------------------------------------------
// The transport
// ---------------------------------------------------------------------------

export type StateHandler = (state: ClientState, index: number) => void;

/**
 * What the reducer threw, plus where in the file it happened.
 *
 * docs/protocol.md §1 wants a loud red banner, not a silent skip. The transport
 * catches the throw so one bad frame does not take the page down with it, then
 * stops playback and hands this to the UI to render. `reduce()` itself still
 * throws — that is what `web/test/reduce.test.ts` asserts.
 */
export interface ReplayError {
  message: string;
  /** Index of the frame that threw, i.e. the `frames[]` position. */
  frameIndex: number;
  frame: Frame | null;
}

/** Milliseconds per frame at speed 1. Speed is a multiplier over this. */
export const BASE_FRAME_INTERVAL_MS = 400;

export interface LogReplayOptions {
  /** Playback multiplier; 2 means twice as fast. Defaults to 1. */
  speed?: number;
  /** Start playing immediately. Defaults to false. */
  autoplay?: boolean;
}

/**
 * Replays a parsed frame log through the reducer with play / pause / step /
 * scrub / speed.
 *
 * `index` is the number of frames applied, i.e. a cursor **between** frames:
 * 0 is "before the first frame", `total` is "after the last". `state` is always
 * `replayFrames(frames, index)`.
 */
export class LogReplayTransport implements Transport {
  readonly header: SessionHeader | null;
  readonly frames: readonly Frame[];
  readonly warnings: readonly string[];

  /** Frames handed to `send()`. A replay has no server, so they go nowhere. */
  readonly sent: Frame[] = [];

  #index = 0;
  #state: ClientState;
  #speed: number;
  #playing = false;
  #error: ReplayError | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #frameHandlers = new Set<FrameHandler>();
  #stateHandlers = new Set<StateHandler>();

  constructor(log: ParsedFrameLog, options: LogReplayOptions = {}) {
    this.header = log.header;
    this.frames = log.frames;
    this.warnings = log.warnings;
    this.#speed = options.speed ?? 1;
    this.#state = initialState(log.header);
    if (options.autoplay === true) this.play();
  }

  /** Convenience: parse and wrap in one call. */
  static fromText(text: string, options: LogReplayOptions = {}): LogReplayTransport {
    return new LogReplayTransport(parseFrameLog(text), options);
  }

  // -- Transport ------------------------------------------------------------

  onFrame(cb: FrameHandler): () => void {
    this.#frameHandlers.add(cb);
    return () => {
      this.#frameHandlers.delete(cb);
    };
  }

  /**
   * A replay has no server. We record the frame so the UI can show that a click
   * *would* have been sent, and drop it. When `ws.ts` lands in M3 the board
   * component does not change.
   */
  send(frame: Frame): void {
    this.sent.push(frame);
  }

  close(): void {
    this.pause();
    this.#frameHandlers.clear();
    this.#stateHandlers.clear();
  }

  // -- State subscription ---------------------------------------------------

  /** Subscribe to the reduced state. Fires immediately with the current one. */
  onState(cb: StateHandler): () => void {
    this.#stateHandlers.add(cb);
    cb(this.#state, this.#index);
    return () => {
      this.#stateHandlers.delete(cb);
    };
  }

  // -- Controls -------------------------------------------------------------

  get total(): number {
    return this.frames.length;
  }
  get index(): number {
    return this.#index;
  }
  get state(): ClientState {
    return this.#state;
  }
  get playing(): boolean {
    return this.#playing;
  }
  get speed(): number {
    return this.#speed;
  }
  get atEnd(): boolean {
    return this.#index >= this.frames.length;
  }
  /** Non-null once the reducer rejected a frame. Playback stops; the UI shouts. */
  get error(): ReplayError | null {
    return this.#error;
  }
  /** The frame that produced the current state, or null at index 0. */
  get currentFrame(): Frame | null {
    return this.#index > 0 ? (this.frames[this.#index - 1] ?? null) : null;
  }

  play(): void {
    if (this.#playing || this.atEnd || this.#error !== null) return;
    this.#playing = true;
    this.#schedule();
    this.#emitState();
  }

  pause(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    if (!this.#playing) return;
    this.#playing = false;
    this.#emitState();
  }

  toggle(): void {
    if (this.#playing) this.pause();
    else this.play();
  }

  setSpeed(speed: number): void {
    if (!(speed > 0)) throw new Error(`LogReplayTransport.setSpeed: speed must be > 0, got ${String(speed)}`);
    this.#speed = speed;
    if (this.#playing) {
      if (this.#timer !== null) clearTimeout(this.#timer);
      this.#schedule();
    }
    this.#emitState();
  }

  /** Apply the next frame. Returns false at the end of the log. */
  stepForward(): boolean {
    if (this.atEnd || this.#error !== null) {
      this.pause();
      return false;
    }
    const frame = this.frames[this.#index]!;
    // reduce() throws on an unknown type / ask.kind / v mismatch (§1). Catch it
    // here so the page survives to render the banner, and stop dead: every later
    // frame would be reduced against a state the engine never produced.
    let next: ClientState;
    try {
      next = reduce(this.#state, frame);
    } catch (err) {
      this.#fail(err, this.#index, frame);
      return false;
    }
    this.#state = next;
    this.#index += 1;
    for (const cb of this.#frameHandlers) cb(frame);
    this.#emitState();
    if (this.atEnd) this.pause();
    return true;
  }

  /**
   * Go back one frame by replaying from the session header to index-1 through
   * the pure reducer. There is no inverse of `reduce`, and there does not need
   * to be one.
   */
  stepBack(): boolean {
    if (this.#index === 0) return false;
    this.scrubTo(this.#index - 1);
    return true;
  }

  /** Jump to an absolute cursor position, re-folding from the header. */
  scrubTo(index: number): void {
    const target = Math.max(0, Math.min(Math.trunc(index), this.frames.length));
    if (target === this.#index && this.#error === null) return;
    this.pause();
    try {
      this.#state = replayFrames(this.frames, target, this.header);
    } catch (err) {
      this.#fail(err, target - 1, this.frames[target - 1] ?? null);
      return;
    }
    this.#error = null;
    this.#index = target;
    this.#emitState();
  }

  /** Back to the session header. */
  reset(): void {
    this.scrubTo(0);
  }

  // -- internals ------------------------------------------------------------

  #schedule(): void {
    const delay = Math.max(1, Math.round(BASE_FRAME_INTERVAL_MS / this.#speed));
    this.#timer = setTimeout(() => {
      this.#timer = null;
      if (!this.#playing) return;
      this.stepForward();
      if (this.#playing) this.#schedule();
    }, delay);
  }

  #fail(err: unknown, frameIndex: number, frame: Frame | null): void {
    this.#error = {
      message: err instanceof Error ? err.message : String(err),
      frameIndex,
      frame,
    };
    this.pause();
    this.#emitState();
  }

  #emitState(): void {
    for (const cb of this.#stateHandlers) cb(this.#state, this.#index);
  }
}
