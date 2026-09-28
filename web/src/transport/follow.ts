/*
 * mtg-table — transport/follow.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Follow mode: a replay of a log that is still being written** (spectating,
 * decisions D118 and D120, `docs/evidence/spectate.md`).
 *
 * `./scripts/spectate.sh` starts `mtgtable.RecordMatch` in the background —
 * two AI seats, paced with `--pace` so the engine plays at a watchable speed —
 * and opens `/?replay=spectate/<name>.jsonl&follow=1#arena` at once. The page
 * cannot wait for the file to be finished, so this module polls it:
 *
 *     GET /spectate/<name>.jsonl?from=<byte offset>
 *
 * every {@link FOLLOW_POLL_MS}, from the offset the last answer ended at. The
 * dev route (`web/src/spectate/devRoute.ts`) answers with the COMPLETE lines
 * written since then and says where they end (`X-Log-Next`), so a line the
 * recorder is half way through writing is never parsed. Each line goes through
 * `parseLogLine` — the rule the whole-file parser uses — and the frames go to a
 * `LogReplayTransport` made in follow mode, which plays them on the recorder's
 * clock. An `over` frame ends it: polling stops, the transport plays out what it
 * holds and is an ordinary replay from then on.
 *
 * **Where this lives is the rule** (M7 convention 1). It is a transport: the
 * arena and the reducer never poll, never fetch and never learn that frames are
 * arriving late — the arena is handed a `ClientState` and, as plain data, a
 * word saying whether the log is still live. `liveness.test.ts` holds both.
 *
 * No DOM. The host APIs are `fetch`, `setTimeout` and `TextDecoder`, and the
 * first two are injectable so `web/test/spectate.test.ts` can drive a file that
 * grows under a real HTTP server.
 */

import type { Frame, SessionHeader } from '../protocol.ts';
import { LogReplayTransport, parseLogLine } from './replay.ts';

// `logUrlFor` and `canFollow` live in replay.ts, beside the other path rules, so
// the 2D entry chunk can decide "is this a follow URL?" without carrying this
// module: `main.tsx` imports it lazily, only when a page follows a log.
export { canFollow, logUrlFor } from './replay.ts';

/** How often the poller asks for new lines. Half the default pace (`spectate.sh --pace 600`). */
export const FOLLOW_POLL_MS = 500;
/**
 * No new line for this long, while following, is **stalled**: the page says so
 * (and names the recorder's log) but keeps polling, because a Forge AI can think
 * for a long time and a recorder that comes back should not need a reload.
 */
export const FOLLOW_STALL_MS = 30_000;

/**
 * - `waiting` — the file is not there yet (404), or holds no complete line: the
 *   recorder is still booting the engine (~10 s).
 * - `following` — lines are arriving.
 * - `stalled` — following, and nothing new for {@link FOLLOW_STALL_MS}.
 * - `ended` — an `over` frame arrived; polling has stopped.
 * - `stopped` — {@link LogFollower.stop} was called before the end.
 * - `error` — the last poll failed; `detail` says how. Polling continues.
 * - `lost` — a 416: the file SHRANK, so it was re-recorded under the same name
 *   and this page's offsets describe a game that is no longer on disk. Polling
 *   has STOPPED for good and the transport is an ordinary replay of what it
 *   read; only a reload follows the new game. Its own word, never `error`'s
 *   (polish-1, spectating's skeptic): `main.tsx`'s `followWordOf` once folded it
 *   into "stalled", and the page kept a live "● following" over a follower that
 *   had stopped.
 */
export type FollowStatus = 'waiting' | 'following' | 'stalled' | 'ended' | 'stopped' | 'error' | 'lost';

/** The slice of `Response` the poller reads — what a test's fake must provide. */
export interface FollowResponse {
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type FollowFetch = (url: string) => Promise<FollowResponse>;

export interface LogFollowerOptions {
  /** The served log, e.g. `/spectate/pacho-shield-vs-doom-legion-7.jsonl` (see {@link logUrlFor}). */
  url: string;
  intervalMs?: number;
  stallMs?: number;
  /** Start the transport playing as soon as it exists. Default true. */
  autoplay?: boolean;
  fetchImpl?: FollowFetch;
  now?: () => number;
  /** Called once, with the transport, the moment the session header has arrived. */
  onTransport?: (transport: LogReplayTransport) => void;
  /** Called on every status change and after every poll that brought lines. */
  onChange?: (follower: LogFollower) => void;
}

/**
 * Polls a growing frame log and feeds a follow-mode {@link LogReplayTransport}.
 * One per page view: `stop()` it in the effect's cleanup.
 */
export class LogFollower {
  readonly url: string;
  #intervalMs: number;
  #stallMs: number;
  #autoplay: boolean;
  #fetch: FollowFetch;
  #now: () => number;
  #onTransport: ((transport: LogReplayTransport) => void) | null;
  #onChange: ((follower: LogFollower) => void) | null;

  #status: FollowStatus = 'waiting';
  #detail: string | null = null;
  #offset = 0;
  #lineNo = 0;
  #pending = '';
  #decoder = new TextDecoder();
  #timer: ReturnType<typeof setTimeout> | null = null;
  #running = false;
  #inFlight = false;
  #transport: LogReplayTransport | null = null;
  #warnings: string[] = [];
  #framesSeen = 0;
  #polls = 0;
  #lastLineAt: number | null = null;
  /** Arrival lag: the poll that brought a frame, minus its `t`. The last 512. */
  #arrivalLags: number[] = [];

  constructor(options: LogFollowerOptions) {
    this.url = options.url;
    this.#intervalMs = options.intervalMs ?? FOLLOW_POLL_MS;
    this.#stallMs = options.stallMs ?? FOLLOW_STALL_MS;
    this.#autoplay = options.autoplay ?? true;
    this.#fetch =
      options.fetchImpl ??
      ((url: string) => fetch(url, { cache: 'no-store', headers: { Accept: 'application/x-ndjson' } }));
    this.#now = options.now ?? (() => Date.now());
    this.#onTransport = options.onTransport ?? null;
    this.#onChange = options.onChange ?? null;
  }

  get status(): FollowStatus {
    return this.#status;
  }
  /** What went wrong, or where the stall is; `null` when there is nothing to say. */
  get detail(): string | null {
    return this.#detail;
  }
  /** Bytes of the log consumed so far (always the end of a complete line). */
  get offset(): number {
    return this.#offset;
  }
  get framesSeen(): number {
    return this.#framesSeen;
  }
  get polls(): number {
    return this.#polls;
  }
  get transport(): LogReplayTransport | null {
    return this.#transport;
  }
  /** Milliseconds since the last complete line arrived, or `null` before the first. */
  sinceLastLine(): number | null {
    return this.#lastLineAt === null ? null : this.#now() - this.#lastLineAt;
  }
  /** Median and worst arrival lag (frame written → frame polled), ms. */
  arrivalLag(): { n: number; p50: number; max: number } | null {
    if (this.#arrivalLags.length === 0) return null;
    const sorted = [...this.#arrivalLags].sort((a, b) => a - b);
    return { n: sorted.length, p50: sorted[Math.floor(sorted.length / 2)]!, max: sorted[sorted.length - 1]! };
  }

  start(): void {
    if (this.#running || this.#status === 'ended') return;
    this.#running = true;
    void this.#poll();
  }

  /** Stop polling. The transport, if any, keeps what it has and stops waiting for more. */
  stop(): void {
    this.#running = false;
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    if (this.#status !== 'ended') {
      this.#transport?.endLive();
      if (this.#set('stopped', null)) this.#onChange?.(this);
    }
  }

  // -- internals ------------------------------------------------------------

  /** Returns whether anything changed; the poll reports once, at its end. */
  #set(status: FollowStatus, detail: string | null): boolean {
    const changed = status !== this.#status || detail !== this.#detail;
    this.#status = status;
    this.#detail = detail;
    return changed;
  }

  #next(): void {
    if (!this.#running) return;
    this.#timer = setTimeout(() => {
      this.#timer = null;
      void this.#poll();
    }, this.#intervalMs);
  }

  async #poll(): Promise<void> {
    if (!this.#running || this.#inFlight) return;
    this.#inFlight = true;
    this.#polls += 1;
    let brought = false;
    let changed = false;
    let failed = false;
    try {
      const response = await this.#fetch(`${this.url}?from=${String(this.#offset)}`);
      if (!this.#running) return;
      if (response.status === 404) {
        failed = this.#transport !== null;
        changed = this.#set(failed ? 'error' : 'waiting', failed ? 'the log disappeared (404)' : null);
      } else if (response.status === 416) {
        // The file is shorter than what this page has read: re-recorded.
        this.#set('lost', 'the recording restarted under the same name — reload the page to follow the new game');
        this.#running = false;
        this.#transport?.endLive();
        this.#onChange?.(this);
        return;
      } else if (response.status < 200 || response.status >= 300) {
        failed = true;
        changed = this.#set('error', `HTTP ${String(response.status)} from ${this.url}`);
      } else {
        const bytes = new Uint8Array(await response.arrayBuffer());
        const next = Number(response.headers.get('X-Log-Next'));
        this.#offset = Number.isFinite(next) && next >= this.#offset ? next : this.#offset + bytes.byteLength;
        brought = this.#consume(this.#decoder.decode(bytes, { stream: true }));
      }
    } catch (err) {
      failed = true;
      if (this.#running) changed = this.#set('error', `could not reach ${this.url}: ${(err as Error).message}`);
    } finally {
      this.#inFlight = false;
    }
    if (this.#status === 'ended') {
      this.#onChange?.(this);
      return;
    }
    if (!this.#running) return;
    if (brought) {
      this.#lastLineAt = this.#now();
      changed = this.#set('following', null) || true;
    } else if (this.#transport !== null && !failed) {
      const quiet = this.sinceLastLine() ?? 0;
      changed =
        quiet >= this.#stallMs
          ? this.#set('stalled', `no new frame for ${String(Math.round(quiet / 1000))} s — is the recorder still running?`) || changed
          : this.#set('following', null) || changed;
    }
    if (changed) this.#onChange?.(this);
    this.#next();
  }

  /** Split, parse and hand over. Returns whether any complete line arrived. */
  #consume(text: string): boolean {
    const chunk = this.#pending + text;
    const cut = chunk.lastIndexOf('\n');
    if (cut < 0) {
      this.#pending = chunk;
      return false;
    }
    this.#pending = chunk.slice(cut + 1);
    const lines = chunk.slice(0, cut).split('\n');
    const frames: Frame[] = [];
    let header: SessionHeader | null = null;
    let sawHeaderLine = false;
    let over = false;
    const arrived = this.#now();
    for (const raw of lines) {
      this.#lineNo += 1;
      const parsed = parseLogLine(raw, this.#lineNo);
      if (parsed.kind === 'blank') continue;
      if (parsed.kind === 'junk') {
        this.#warnings.push(parsed.warning);
        continue;
      }
      if (parsed.kind === 'header') {
        sawHeaderLine = true;
        if (this.#transport === null && header === null) header = parsed.header;
        else this.#warnings.push(`line ${String(this.#lineNo)}: a second session header — skipped`);
        continue;
      }
      frames.push(parsed.frame);
      this.#arrivalLags.push(arrived - parsed.frame.t);
      if (this.#arrivalLags.length > 512) this.#arrivalLags.shift();
      if (parsed.frame.type === 'over') over = true;
    }
    this.#framesSeen += frames.length;

    if (this.#transport === null) {
      if (header === null && !sawHeaderLine && frames.length === 0) return lines.some((l) => l.trim() !== '');
      if (header === null) {
        // Line 0 was not a header. GameLog never writes such a file (§8.1); if
        // one turns up, render it with a warning, as the whole-file parser does.
        this.#warnings.push('no session header (docs/protocol.md §8.1 line 0) in this log');
      }
      this.#transport = new LogReplayTransport(
        { header, frames, warnings: [...this.#warnings] },
        { follow: true, now: this.#now },
      );
      this.#onTransport?.(this.#transport);
      if (this.#autoplay) this.#transport.play();
    } else {
      this.#transport.append(frames);
    }

    if (over) {
      this.#running = false;
      this.#transport.endLive();
      this.#set('ended', null);
    }
    return true;
  }
}
