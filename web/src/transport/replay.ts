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
 *
 * **Follow mode** (spectating, D118/D120). A transport made with
 * `{ follow: true }` is a replay whose log is still being written: frames arrive
 * through {@link LogReplayTransport.append} (from `transport/follow.ts`'s poller,
 * never from a renderer), the cursor waits at the end instead of pausing there,
 * and playback runs on the **recorder's** clock: live, each frame plays
 * {@link FOLLOW_LIVE_DELAY_MS} after the recorder wrote it (so every frame keeps
 * its recorder gap from the one before, and the lag cannot grow); behind — after
 * a pause, or slower than 1× — each keeps its gap from the cursor. What the arena
 * animates is the game at the pace the engine played it. When the log ends
 * (`endLive()`, called when an `over` arrives), the frames still queued play out
 * and the transport is an ordinary replay from then on.
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
    const parsed = parseLogLine(lines[i]!, i + 1);
    if (parsed.kind === 'blank') continue;
    if (parsed.kind === 'junk') {
      warnings.push(parsed.warning);
      continue;
    }
    if (parsed.kind === 'header') {
      if (header === null) {
        header = parsed.header;
        if (i !== 0) warnings.push(`line ${String(i + 1)}: session header is not line 1`);
      } else {
        warnings.push(`line ${String(i + 1)}: a second session header — skipped`);
      }
      continue;
    }
    frames.push(parsed.frame);
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

/** One line of a frame log, classified — {@link parseFrameLog}'s rule, one line at a time. */
export type ParsedLine =
  | { kind: 'blank' }
  | { kind: 'header'; header: SessionHeader }
  | { kind: 'frame'; frame: Frame }
  | { kind: 'junk'; warning: string };

/**
 * Classify one line of a `.jsonl` frame log (§8). The whole-file parser and the
 * follow-mode poller (`transport/follow.ts`) both read lines through this, so a
 * log read in one piece and the same log read as it grows cannot disagree about
 * what a line is. `lineNo` is 1-based and only used in the warning.
 */
export function parseLogLine(raw: string, lineNo: number): ParsedLine {
  const line = raw.trim();
  if (line === '') return { kind: 'blank' };
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch (err) {
    return { kind: 'junk', warning: `line ${String(lineNo)}: not valid JSON (${(err as Error).message}) — skipped` };
  }
  if (isSessionHeader(value)) return { kind: 'header', header: value };
  if (!looksLikeFrame(value)) {
    return { kind: 'junk', warning: `line ${String(lineNo)}: not a frame envelope (§1) — skipped` };
  }
  return { kind: 'frame', frame: value };
}

/**
 * The URL a `?replay=` path is served at. `spectate/<name>.jsonl` is a recording
 * `scripts/spectate.sh` wrote into `var/spectate/` and the dev server mounts at
 * `/spectate/` (never in a build); everything else is under `fixtures/`, mounted
 * at `/fixtures/`. `fixtures/` has no `spectate/` directory, so the prefix is
 * unambiguous — and must stay so.
 */
export function logUrlFor(path: string): string {
  const clean = path.replace(/^\/+/, '');
  if (clean.startsWith('spectate/')) return `/${clean}`;
  return `/fixtures/${clean}`;
}

/** Can this `?replay=` path be followed? Only a spectate recording is served with `?from=`. */
export function canFollow(path: string): boolean {
  return path.replace(/^\/+/, '').startsWith('spectate/');
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

/**
 * **Follow mode's floor between two frames**, whatever the recorder's gap was.
 * It is not a pace: it is what keeps each frame in a React commit of its own, so
 * the arena's intake sees every batch rather than the last of a burst (a burst
 * of more than `JUMP_FRAMES` in one commit is a flush — `arena/cues/intake.ts`).
 */
export const FOLLOW_MIN_GAP_MS = 50;
/**
 * **Follow mode's ceiling between two frames.** Only reachable after a pause:
 * at the live edge a frame is never due later than it arrives. An AI that
 * thought for twelve seconds is not replayed as twelve seconds of nothing.
 */
export const FOLLOW_MAX_GAP_MS = 5000;
/**
 * **Follow mode's delay behind the recorder, when it is live.** A frame the
 * recorder wrote at `t` plays at `t + FOLLOW_LIVE_DELAY_MS` on this machine's
 * clock (the bridge's `System.currentTimeMillis` and the page's `Date.now` are
 * the same clock on loopback, which is the only place the dev route exists). The
 * poller asks every 500 ms, so a frame is in hand at most ~520 ms after it was
 * written; 600 ms is that plus a margin, and every frame then plays exactly its
 * recorder gap after the one before it. A frame that arrives later than its slot
 * plays on arrival, and the next ones are back on the schedule — the lag never
 * accumulates (`docs/evidence/spectate.md` §F measured the two cuts before this
 * one: paced from the last frame played, the lag crept 0.3 → 0.6 s over a game;
 * paced from a fixed anchor, it stuck at the first poll's 0.83 s).
 */
export const FOLLOW_LIVE_DELAY_MS = 600;
/**
 * **How far behind the live schedule still counts as live.** A page whose first
 * poll was slow (it was still loading: measured 0.83 s) is a few hundred ms
 * behind the live slot from its first frame, and would stay there — every later
 * frame is in hand before its anchored time, so nothing ever catches it up. Up
 * to this much behind, the next frame snaps to its live slot (one gap shortened,
 * once). Further behind — a late join, a pause, a slower speed — the cursor stays
 * on the recorder's pace from where it is, and a faster speed catches it up.
 */
export const FOLLOW_SNAP_MS = 1000;

export interface LogReplayOptions {
  /** Playback multiplier; 2 means twice as fast. Defaults to 1. */
  speed?: number;
  /** Start playing immediately. Defaults to false. */
  autoplay?: boolean;
  /**
   * **Follow mode** (spectating): the log is still being written. Frames arrive
   * through {@link LogReplayTransport.append}, the cursor waits at the end for
   * more instead of pausing, and playback runs on the recorder's clock until
   * {@link LogReplayTransport.endLive} and the last queued frame.
   */
  follow?: boolean;
  /** The clock follow mode paces against — `Date.now` unless a test injects one. */
  now?: () => number;
}

/** Follow mode's measured lag: frame written (its `t`) → frame applied, in ms. */
export interface FollowLag {
  n: number;
  p50: number;
  p95: number;
  max: number;
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
  readonly warnings: readonly string[];

  /** Frames handed to `send()`. A replay has no server, so they go nowhere. */
  readonly sent: Frame[] = [];

  /** Mutable only through {@link append}; everyone else reads {@link frames}. */
  #frames: Frame[];
  #index = 0;
  #state: ClientState;
  #speed: number;
  #playing = false;
  #error: ReplayError | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #frameHandlers = new Set<FrameHandler>();
  #stateHandlers = new Set<StateHandler>();
  /** Follow mode: more frames may still come (until {@link endLive}). */
  #live: boolean;
  /** Follow mode: playback is on the recorder's clock (until the live tail has played). */
  #paced: boolean;
  #now: () => number;
  /** When the play loop last applied a frame, on {@link #now}'s clock. */
  #lastAppliedAt = 0;
  /**
   * Follow mode **behind the live edge** (a late join, a pause, a slower
   * speed): a wall-clock moment and the recorder `t` it stands for, so a frame
   * is due at `wall + (t - anchor.t) / speed` — the recorder's pace, from where
   * the cursor is. A frame that plays late (the floor between frames, a busy
   * main thread) does not push the later ones back; they catch up. `null` until
   * there is a frame to anchor to.
   */
  #anchor: { wall: number; t: number } | null = null;
  /**
   * Follow mode **on the live schedule**: each frame plays at its own `t` plus
   * {@link FOLLOW_LIVE_DELAY_MS}. Entered as soon as the anchored schedule would
   * play a frame no later than that (a live start, or a faster speed catching
   * up); left on PLAY after a pause and on a speed change, which re-anchor.
   */
  #onLiveSchedule = false;
  /**
   * Follow mode, and the viewer has not paused, scrubbed or changed the speed:
   * the page is JOINING the live game. While it is, a cursor more than
   * {@link FOLLOW_SNAP_MS} behind the live schedule jumps to the edge — see
   * {@link LogReplayTransport.#joinLive}.
   */
  #joining: boolean;
  /** Follow mode's lag samples (ms, frame `t` → applied), the most recent 512. */
  #lags: number[] = [];

  constructor(log: ParsedFrameLog, options: LogReplayOptions = {}) {
    this.header = log.header;
    this.#frames = [...log.frames];
    this.warnings = log.warnings;
    this.#speed = options.speed ?? 1;
    this.#live = options.follow === true;
    this.#paced = this.#live;
    this.#joining = this.#live;
    this.#now = options.now ?? (() => Date.now());
    this.#state = initialState(log.header);
    if (options.autoplay === true) this.play();
  }

  get frames(): readonly Frame[] {
    return this.#frames;
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
  /** Follow mode, and the log is still being written: the end is not the end. */
  get live(): boolean {
    return this.#live;
  }
  /** Playback is on the recorder's clock (follow mode, until its tail has played). */
  get paced(): boolean {
    return this.#paced;
  }

  /**
   * Follow mode's lag so far — how long after the recorder WROTE a frame (its
   * `t`) the play loop applied it. Both clocks are this machine's (the bridge's
   * `System.currentTimeMillis`, the page's `Date.now`), so the difference is
   * meaningful on loopback and nowhere else. `null` before the first sample.
   */
  followLag(): FollowLag | null {
    if (this.#lags.length === 0) return null;
    const sorted = [...this.#lags].sort((a, b) => a - b);
    const at = (q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
    return { n: sorted.length, p50: at(0.5), p95: at(0.95), max: sorted[sorted.length - 1]! };
  }

  /**
   * **Follow mode: frames the recorder has written since the last call**, in
   * file order. Appending never moves the cursor by itself; a transport that is
   * playing and waiting at the end picks the first new frame up on the
   * recorder's clock. A transport not in follow mode refuses — a finished log
   * does not grow, and a caller that thinks otherwise has the wrong object.
   */
  append(frames: readonly Frame[]): void {
    if (!this.#live) {
      throw new Error('LogReplayTransport.append: this transport is not following a live log');
    }
    if (frames.length === 0) return;
    // Waiting at the live edge: the first new frame is scheduled now (on the
    // live schedule it is due at its own `t` plus the live delay, or at once if
    // that has passed).
    const waiting = this.#playing && this.#timer === null && this.#error === null && this.atEnd;
    this.#frames.push(...frames);
    if (waiting) this.#schedule();
    this.#emitState();
  }

  /**
   * **Follow mode: the log has ended** (an `over` arrived, or following was
   * stopped). The frames already appended still play on the recorder's clock;
   * once the cursor reaches the end the transport is an ordinary replay.
   */
  endLive(): void {
    if (!this.#live) return;
    this.#live = false;
    if (this.atEnd) {
      this.#paced = false;
      this.pause();
    }
    this.#emitState();
  }

  play(): void {
    if (this.#playing || (this.atEnd && !this.#live) || this.#error !== null) return;
    this.#playing = true;
    this.#lastAppliedAt = this.#now();
    // Resume on the recorder's clock from where the cursor stands: the next
    // frame is due its own gap from now — which is back on the live schedule at
    // once when the pause was shorter than the live delay.
    const previous = this.#frames[this.#index - 1];
    this.#anchor = previous !== undefined ? { wall: this.#lastAppliedAt, t: previous.t } : null;
    this.#onLiveSchedule = false;
    this.#schedule();
    this.#emitState();
  }

  pause(): void {
    // A viewer who pauses has chosen where to be: no jump back to the live edge.
    this.#joining = false;
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
    this.#joining = false;
    // Follow mode: rescale from the last frame played, not from an anchor that
    // was set at the old speed.
    const previous = this.#frames[this.#index - 1];
    if (this.#paced) {
      this.#anchor = previous !== undefined ? { wall: this.#lastAppliedAt, t: previous.t } : null;
      this.#onLiveSchedule = false;
    }
    if (this.#playing) {
      if (this.#timer !== null) clearTimeout(this.#timer);
      this.#schedule();
    }
    this.#emitState();
  }

  /**
   * Apply the next frame. Returns false at the end of the log — which, while a
   * followed log is still live, is "nothing yet" rather than the end, and does
   * not pause.
   */
  stepForward(): boolean {
    if (this.#error !== null || (this.atEnd && !this.#live)) {
      this.pause();
      return false;
    }
    if (this.atEnd) return false;
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
    this.#lastAppliedAt = this.#now();
    if (this.#paced) {
      this.#lags.push(this.#lastAppliedAt - frame.t);
      if (this.#lags.length > 512) this.#lags.shift();
    }
    for (const cb of this.#frameHandlers) cb(frame);
    if (this.atEnd && !this.#live) {
      // The live tail has played: from here on this is an ordinary replay.
      this.#paced = false;
      this.pause();
    }
    this.#emitState();
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
    // A followed log whose live tail was scrubbed through by hand is as played
    // out as one that reached the end on its own.
    if (!this.#live && this.atEnd) this.#paced = false;
    this.#emitState();
  }

  /** Back to the session header. */
  reset(): void {
    this.scrubTo(0);
  }

  // -- internals ------------------------------------------------------------

  #schedule(): void {
    // At the live edge there is nothing to schedule: `append` picks it up.
    if (this.atEnd && this.#live) {
      this.#timer = null;
      return;
    }
    if (this.#paced && this.#joining && !this.#joinLive()) return;
    const delay = this.#paced ? this.#recorderDelay() : Math.max(1, Math.round(BASE_FRAME_INTERVAL_MS / this.#speed));
    this.#timer = setTimeout(() => {
      this.#timer = null;
      if (!this.#playing) return;
      this.stepForward();
      if (this.#playing) this.#schedule();
    }, delay);
  }

  /**
   * **Joining a game already under way.** Following means watching the game as
   * it happens, so a page that opens (or falls) more than {@link FOLLOW_SNAP_MS}
   * behind the live schedule does not crawl through the backlog at the
   * recorder's pace: it folds every stale frame at once — the arena reads a jump
   * of more than a dozen frames as a scrub and snaps to the board — and plays
   * the newest one it holds now, on the live schedule. The scrubber still has
   * the whole game. Only until the viewer first pauses, scrubs or changes the
   * speed; after that the cursor is theirs (**D120**). Returns false if the fold
   * failed (the transport is then stopped on a reducer error).
   */
  #joinLive(): boolean {
    const now = this.#now();
    const stale = (i: number): boolean =>
      this.#frames[i]!.t + FOLLOW_LIVE_DELAY_MS + FOLLOW_SNAP_MS < now;
    let k = this.#index;
    while (k < this.#frames.length - 1 && stale(k)) k += 1;
    if (k === this.#index) return true;
    try {
      this.#state = replayFrames(this.#frames, k, this.header);
    } catch (err) {
      this.#fail(err, k - 1, this.#frames[k - 1] ?? null);
      return false;
    }
    this.#index = k;
    this.#onLiveSchedule = true;
    this.#emitState();
    return true;
  }

  /** When `frame` is due on the recorder's clock, from the anchor. */
  #dueOf(frame: Frame): number {
    const anchor = this.#anchor;
    if (anchor === null || !Number.isFinite(frame.t)) return this.#now();
    return anchor.wall + (frame.t - anchor.t) / this.#speed;
  }

  /**
   * **The recorder's clock.** On the live schedule a frame is due at its own
   * `t` plus {@link FOLLOW_LIVE_DELAY_MS}. Behind it, a frame is due where the
   * anchor puts it — its `t` gap from the anchoring frame, over the speed — and
   * the moment that is no more than {@link FOLLOW_SNAP_MS} after the live slot,
   * the transport is back on the live schedule. Either way a frame is never due sooner than
   * {@link FOLLOW_MIN_GAP_MS} after the frame before it (a render of its own),
   * and behind the live edge never later than {@link FOLLOW_MAX_GAP_MS} after it
   * (an AI that thought for a minute is not replayed as a minute of nothing; the
   * anchor moves to the capped frame, so the ones after it keep their gaps).
   */
  #recorderDelay(): number {
    const next = this.#frames[this.#index];
    if (next === undefined) return 0;
    const now = this.#now();
    const liveSlot = next.t + FOLLOW_LIVE_DELAY_MS;
    // A slot further off than the cap is not "live": this machine's clock and
    // the recorder's disagree, and the anchored schedule is the safe reading.
    const liveUsable = Number.isFinite(liveSlot) && liveSlot - now <= FOLLOW_MAX_GAP_MS;
    let due: number;
    if (this.#onLiveSchedule && liveUsable) {
      due = liveSlot;
    } else {
      if (this.#anchor === null) this.#anchor = { wall: now, t: next.t };
      due = this.#dueOf(next);
      if (liveUsable && this.#speed >= 1 && due <= liveSlot + FOLLOW_SNAP_MS) {
        this.#onLiveSchedule = true;
        due = liveSlot;
      } else {
        const ceiling = this.#lastAppliedAt + FOLLOW_MAX_GAP_MS;
        if (due > ceiling) {
          due = ceiling;
          this.#anchor = { wall: ceiling, t: next.t };
        }
      }
    }
    due = Math.max(due, this.#lastAppliedAt + FOLLOW_MIN_GAP_MS);
    return Math.max(0, Math.round(due - now));
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
