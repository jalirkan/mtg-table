/*
 * mtg-table — transport/ws.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The live transport: `ws://127.0.0.1:<port>/ws`, driving exactly the reducer
 * `replay.ts` drives (docs/protocol.md §8.6 — the board component cannot tell
 * them apart).
 *
 * What this file is responsible for, and what it deliberately is not:
 *
 *   - it owns the **client-side `seq`** (§1: monotonic, per direction, starting
 *     at 1). A caller hands `send()` a frame with whatever `seq`/`t` it likes
 *     and this stamps its own, because "per direction" means one counter per
 *     socket and there is exactly one place that can hold it;
 *   - it owns **reconnection**, and sends `resync` (§2.4) on every reconnect —
 *     never on the first connect, because §2.1 already promises `hello_ok`, a
 *     full `state` and the current `input` the moment the socket opens;
 *   - it owns **`ping`/`pong`**: an inbound `ping` is answered with a `pong`
 *     before the frame reaches `reduce()`, which ignores both (§2.5);
 *   - it does **not** interpret game state. Everything a frame means happens in
 *     `reduce()`, and an unknown `type`, an unknown `ask.kind` or a `v` major
 *     mismatch **throws** out of it (§1). This catches that throw so the page
 *     survives to render the banner, stores it, and stops folding — every later
 *     frame would be reduced against a state the engine never produced. That is
 *     the same decision `LogReplayTransport` makes, for the same reason.
 *
 * **Acts are never queued across a disconnect.** A click is a statement about
 * the board the user was looking at; replaying it into a game that has moved on
 * is how a client plays a card the player never chose. While the socket is not
 * open, `send()` drops the frame and records a client-side notice saying so.
 *
 * No DOM: the only host APIs here are `WebSocket`, `setTimeout` and
 * `clearTimeout`, and the socket itself is injectable so `node --test` can drive
 * the whole state machine without a server (`web/test/ws.test.ts`).
 */

import {
  PROTOCOL_VERSION,
  type ActBody,
  type AnswerValue,
  type Frame,
  type FrameType,
} from '../protocol.ts';
import {
  initialState,
  reduce,
  type ClientState,
  type TimestampedNotice,
} from '../reduce.ts';
import type { FrameHandler, Transport } from './transport.ts';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * The default port, as a build-time constant (`config.json`'s `wsPort`).
 *
 * `?port=` overrides it at runtime, which is what makes two bridges on one
 * machine debuggable. `import.meta.env` only exists under Vite, so this reads it
 * defensively: the same module is imported by `node --test`, where there is no
 * `import.meta.env` at all.
 */
export const DEFAULT_WS_PORT: number = readEnvPort() ?? 8642;

function readEnvPort(): number | null {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  const raw = env?.['VITE_WS_PORT'];
  if (raw === undefined) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** `ws://127.0.0.1:<port>/ws` — loopback only, and that is a decision (README NON-GOALS). */
export function wsUrl(port: number = DEFAULT_WS_PORT): string {
  return `ws://127.0.0.1:${String(port)}/ws`;
}

// ---------------------------------------------------------------------------
// The socket seam
// ---------------------------------------------------------------------------

/**
 * The subset of `WebSocket` this transport uses.
 *
 * Node 24 has a global `WebSocket` and so does every browser we care about, so
 * this exists for one reason: a test needs to open, close, fail and reopen a
 * connection deterministically, and it cannot do that against a real server
 * without a JVM in the loop.
 */
export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code?: number; reason?: string; wasClean?: boolean }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

export type SocketFactory = (url: string) => WebSocketLike;

/** `WebSocket.OPEN`. Spelled out so this module needs no DOM lib at runtime. */
const OPEN = 1;

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/**
 * Where the connection is.
 *
 * `refused` is its own state because contract (c) gives it its own meaning:
 * only one client at a time, and a second connection is closed with an
 * application close code (≥ 4000) and a notice. Retrying that in a loop would
 * hammer a server that already said no, so it is terminal until the user asks
 * for another attempt.
 */
export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'closed'
  | 'refused';

export interface WsStatus {
  status: ConnectionStatus;
  url: string;
  /** How many connection attempts have been made since the last clean open. */
  attempts: number;
  /** The close code / error text of the last failure, or `null`. */
  lastError: string | null;
  /** Milliseconds until the next reconnect attempt, or `null` when not waiting. */
  retryInMs: number | null;
  /** Frames received on this connection, all types. */
  framesIn: number;
  /** Frames sent on this connection. */
  framesOut: number;
  /** Acts and answers dropped because the socket was not open. */
  dropped: number;
}

/** What `reduce()` threw, plus the frame that caused it (§1's red banner). */
export interface TransportError {
  message: string;
  frame: Frame | null;
  /** How many frames had been folded when it happened — the replay's frameIndex. */
  frameIndex: number;
}

export type StateHandler = (state: ClientState) => void;
export type StatusHandler = (status: WsStatus) => void;

export interface WebSocketTransportOptions {
  /** Full URL. Overrides `port`. */
  url?: string;
  /** Port on 127.0.0.1; defaults to {@link DEFAULT_WS_PORT}. */
  port?: number;
  /** Injected for tests; defaults to the global `WebSocket`. */
  socketFactory?: SocketFactory;
  /** Backoff ceiling. */
  maxBackoffMs?: number;
  /** Give up (status `closed`) after this many consecutive failures. */
  maxAttempts?: number;
  /** Injected for tests. */
  now?: () => number;
}

/** 250 ms, 500, 1000, 2000, 4000, then the ceiling. */
const BASE_BACKOFF_MS = 250;

// ---------------------------------------------------------------------------
// The transport
// ---------------------------------------------------------------------------

export class WebSocketTransport implements Transport {
  readonly url: string;

  #factory: SocketFactory;
  #now: () => number;
  #maxBackoffMs: number;
  #maxAttempts: number;

  #socket: WebSocketLike | null = null;
  #state: ClientState = initialState(null);
  #status: ConnectionStatus = 'idle';
  #attempts = 0;
  #lastError: string | null = null;
  #retryTimer: ReturnType<typeof setTimeout> | null = null;
  #retryAt: number | null = null;
  #framesIn = 0;
  #framesOut = 0;
  #dropped = 0;
  #seq = 0;
  #error: TransportError | null = null;
  /** True once a socket has opened at least once: the next open is a *re*connect. */
  #everOpened = false;
  /** Set by `close()`; stops every reconnect. */
  #shutDown = false;

  #frameHandlers = new Set<FrameHandler>();
  #stateHandlers = new Set<StateHandler>();
  #statusHandlers = new Set<StatusHandler>();
  /** Client-side complaints (a dropped click, a socket error). Not engine notices. */
  #clientNotices: TimestampedNotice[] = [];

  constructor(options: WebSocketTransportOptions = {}) {
    this.url = options.url ?? wsUrl(options.port ?? DEFAULT_WS_PORT);
    this.#factory =
      options.socketFactory ??
      ((url: string) => new WebSocket(url) as unknown as WebSocketLike);
    this.#now = options.now ?? (() => Date.now());
    this.#maxBackoffMs = options.maxBackoffMs ?? 5_000;
    this.#maxAttempts = options.maxAttempts ?? 12;
  }

  // -- Transport ------------------------------------------------------------

  onFrame(cb: FrameHandler): () => void {
    this.#frameHandlers.add(cb);
    return () => {
      this.#frameHandlers.delete(cb);
    };
  }

  /**
   * Send one client→server frame. `seq` and `t` are stamped here (§1), so a
   * caller may pass zeros.
   *
   * Dropped, never queued, when the socket is not open: see the file header.
   */
  send(frame: Frame): void {
    const socket = this.#socket;
    if (socket === null || socket.readyState !== OPEN) {
      this.#dropped += 1;
      this.#note(
        'warn',
        'Not connected',
        `${frame.type} was not sent — the socket is ${this.#status}. ` +
          `Nothing was queued: a click describes the board you were looking at.`,
      );
      this.#emitStatus();
      return;
    }
    this.#seq += 1;
    const stamped = { ...frame, v: PROTOCOL_VERSION, seq: this.#seq, t: this.#now() } as Frame;
    try {
      socket.send(JSON.stringify(stamped));
    } catch (err) {
      this.#dropped += 1;
      this.#note('error', 'Send failed', String(err));
      this.#emitStatus();
      return;
    }
    this.#framesOut += 1;
    // A frame log reads both directions (§8.2), and so does anything watching
    // this transport: hand the sent frame to the same handlers.
    for (const cb of this.#frameHandlers) cb({ ...stamped, dir: 'c2s' } as Frame);
    // …and fold it into our own state, exactly as replaying this session's log
    // would. That is not symmetry for its own sake: §2.3's "exactly one answer
    // per ask" is enforced in `reduce()`, which clears `state.ask` when it sees
    // the `answer` — and **nothing the server sends ever says "that question is
    // closed"**. Without this the ask modal stayed on screen after it had been
    // answered, over a board that had already moved on. Measured in the browser
    // against a live `order` ask, 2026-09-11.
    if (this.#error === null) {
      try {
        this.#state = reduce(this.#state, stamped);
      } catch {
        // A c2s frame we built ourselves cannot be drift; if it somehow is,
        // the socket is still the source of truth and the next `state` wins.
      }
      this.#emitState();
    }
    this.#emitStatus();
  }

  close(): void {
    this.#shutDown = true;
    this.#clearRetry();
    const socket = this.#socket;
    this.#socket = null;
    if (socket !== null) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      try {
        socket.close(1000, 'client closed');
      } catch {
        /* a socket that is already gone is exactly what we wanted */
      }
    }
    this.#setStatus('closed');
    this.#frameHandlers.clear();
    this.#stateHandlers.clear();
    this.#statusHandlers.clear();
  }

  // -- Convenience senders --------------------------------------------------

  /** §2.2 — an unsolicited user action. Never expects a reply. */
  act(body: ActBody): void {
    this.send(frame('act', body));
  }

  /** §2.3 — exactly one per `ask`; `value` is per-kind (§5.2). */
  answer(askId: string, value: AnswerValue): void {
    this.send(frame('answer', { askId, value }));
  }

  /** §2.4 — ask for a fresh `state` + `input`; also clears a stale reducer error. */
  resync(): void {
    this.send(frame('resync', {}));
  }

  /** §2.5 — keepalive. The peer replies `pong`. */
  ping(): void {
    this.send(frame('ping', {}));
  }

  // -- Connection -----------------------------------------------------------

  /** Open the socket. Idempotent while one is open or opening. */
  connect(): void {
    if (this.#shutDown) return;
    if (this.#socket !== null) return;
    this.#clearRetry();
    this.#attempts += 1;
    this.#setStatus(this.#everOpened ? 'reconnecting' : 'connecting');

    let socket: WebSocketLike;
    try {
      socket = this.#factory(this.url);
    } catch (err) {
      this.#lastError = String(err);
      this.#scheduleRetry();
      return;
    }
    this.#socket = socket;

    socket.onopen = () => {
      if (this.#socket !== socket) return;
      this.#attempts = 0;
      this.#lastError = null;
      this.#framesIn = 0;
      this.#framesOut = 0;
      const reconnected = this.#everOpened;
      this.#everOpened = true;
      this.#setStatus('open');
      if (reconnected) {
        // §2.4 — the server replies with a fresh full state, the current input
        // and any outstanding ask. A first connect needs none: §2.1 sends all
        // three unasked.
        this.resync();
      }
    };

    socket.onmessage = (event: { data: unknown }) => {
      if (this.#socket !== socket) return;
      this.#receive(event.data);
    };

    socket.onerror = () => {
      if (this.#socket !== socket) return;
      // The browser deliberately gives no detail here (it is a security
      // boundary); `onclose` follows and carries the code.
      this.#lastError = `socket error on ${this.url}`;
      this.#emitStatus();
    };

    socket.onclose = (event: { code?: number; reason?: string; wasClean?: boolean }) => {
      if (this.#socket !== socket) return;
      this.#socket = null;
      const code = event.code ?? 0;
      const reason = event.reason ?? '';
      this.#lastError = `closed ${String(code)}${reason === '' ? '' : ` — ${reason}`}`;
      if (this.#shutDown) {
        this.#setStatus('closed');
        return;
      }
      if (code >= 4000) {
        // Contract (c): one client at a time. An application close code is the
        // server saying no, not a network hiccup — retrying it in a loop would
        // fight a bridge that already answered.
        this.#note('error', 'Connection refused', this.#lastError);
        this.#setStatus('refused');
        return;
      }
      if (this.#state.gameOver !== null) {
        // The server plays one game and exits (contract (a)). Reconnecting to a
        // process that is gone would spin forever under the final board.
        this.#setStatus('closed');
        return;
      }
      this.#scheduleRetry();
    };
  }

  /** Drop the socket and reconnect from scratch. The UI's "Reconnect" button. */
  reconnect(): void {
    this.#shutDown = false;
    this.#clearRetry();
    const socket = this.#socket;
    this.#socket = null;
    if (socket !== null) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      try {
        socket.close(1000, 'reconnecting');
      } catch {
        /* already gone */
      }
    }
    this.#attempts = 0;
    this.connect();
  }

  // -- Readouts -------------------------------------------------------------

  get state(): ClientState {
    return this.#state;
  }

  get status(): WsStatus {
    return {
      status: this.#status,
      url: this.url,
      attempts: this.#attempts,
      lastError: this.#lastError,
      retryInMs: this.#retryAt === null ? null : Math.max(0, this.#retryAt - this.#now()),
      framesIn: this.#framesIn,
      framesOut: this.#framesOut,
      dropped: this.#dropped,
    };
  }

  get connected(): boolean {
    return this.#status === 'open';
  }

  /** Non-null once `reduce()` rejected a frame (§1). Folding stops; the UI shouts. */
  get error(): TransportError | null {
    return this.#error;
  }

  /** Client-side complaints, oldest first. Engine notices live in `state.notices`. */
  get clientNotices(): readonly TimestampedNotice[] {
    return this.#clientNotices;
  }

  /**
   * Clear a reducer error and ask the server for a fresh snapshot.
   *
   * It is a deliberate two-step: the frame that threw is still drift, and the
   * banner stays until a human decides to carry on. Re-folding from a full
   * `state` is always correct (§2.4), so there is nothing to repair by hand.
   */
  clearErrorAndResync(): void {
    this.#error = null;
    this.resync();
    this.#emitState();
  }

  onState(cb: StateHandler): () => void {
    this.#stateHandlers.add(cb);
    cb(this.#state);
    return () => {
      this.#stateHandlers.delete(cb);
    };
  }

  onStatus(cb: StatusHandler): () => void {
    this.#statusHandlers.add(cb);
    cb(this.status);
    return () => {
      this.#statusHandlers.delete(cb);
    };
  }

  // -- internals ------------------------------------------------------------

  #receive(data: unknown): void {
    this.#framesIn += 1;
    if (typeof data !== 'string') {
      // The protocol is JSON **text** frames (§1's preamble). A binary frame is
      // drift, not something to guess at.
      this.#fail(`received a non-text frame (${typeof data}) — §1 is JSON text frames`, null);
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch (err) {
      this.#fail(`frame is not valid JSON: ${String(err)}`, null);
      return;
    }
    if (!looksLikeFrame(parsed)) {
      this.#fail(
        `frame is not a §1 envelope {v,seq,t,type,body}: ${JSON.stringify(parsed).slice(0, 200)}`,
        null,
      );
      return;
    }
    const incoming = parsed;

    // §2.5 — answer a ping before anything else can go wrong, and answer it even
    // while a reducer error is standing: a keepalive is not game state.
    if (incoming.type === 'ping') {
      this.send(frame('pong', {}));
    }

    for (const cb of this.#frameHandlers) cb(incoming);

    if (this.#error !== null) {
      // Folding stopped at the frame that threw. Keep counting and keep the
      // socket alive so the user can read the banner and hit Resync.
      this.#emitStatus();
      return;
    }

    try {
      this.#state = reduce(this.#state, incoming);
    } catch (err) {
      this.#fail(err instanceof Error ? err.message : String(err), incoming);
      return;
    }
    this.#emitState();
    this.#emitStatus();
  }

  #fail(message: string, badFrame: Frame | null): void {
    this.#error = { message, frame: badFrame, frameIndex: this.#state.framesApplied };
    this.#emitState();
    this.#emitStatus();
  }

  #note(level: TimestampedNotice['level'], title: string, text: string): void {
    const next = [
      ...this.#clientNotices,
      { seq: -this.#clientNotices.length - 1, t: this.#now(), level, title, text },
    ];
    this.#clientNotices = next.length > 20 ? next.slice(next.length - 20) : next;
  }

  #scheduleRetry(): void {
    if (this.#shutDown) return;
    if (this.#attempts >= this.#maxAttempts) {
      this.#note(
        'error',
        'Giving up',
        `${String(this.#attempts)} attempts on ${this.url} failed. Is the bridge running? ` +
          `./scripts/play.sh starts it.`,
      );
      this.#setStatus('closed');
      return;
    }
    const delay = Math.min(this.#maxBackoffMs, BASE_BACKOFF_MS * 2 ** Math.max(0, this.#attempts - 1));
    this.#retryAt = this.#now() + delay;
    this.#setStatus('reconnecting');
    this.#retryTimer = setTimeout(() => {
      this.#retryTimer = null;
      this.#retryAt = null;
      this.connect();
    }, delay);
  }

  #clearRetry(): void {
    if (this.#retryTimer !== null) {
      clearTimeout(this.#retryTimer);
      this.#retryTimer = null;
    }
    this.#retryAt = null;
  }

  #setStatus(status: ConnectionStatus): void {
    this.#status = status;
    this.#emitStatus();
  }

  #emitState(): void {
    for (const cb of this.#stateHandlers) cb(this.#state);
  }

  #emitStatus(): void {
    const snapshot = this.status;
    for (const cb of this.#statusHandlers) cb(snapshot);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build an envelope; `seq` and `t` are stamped by `send()`. */
function frame<T extends FrameType>(type: T, body: object): Frame {
  return { v: PROTOCOL_VERSION, seq: 0, t: 0, type, body } as unknown as Frame;
}

/**
 * The same shallow check `replay.ts` uses. Deliberately shallow: anything
 * deeper is the reducer's job, and the reducer's job is to throw loudly.
 */
function looksLikeFrame(value: unknown): value is Frame {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['v'] === 'number' &&
    typeof v['seq'] === 'number' &&
    typeof v['t'] === 'number' &&
    typeof v['type'] === 'string' &&
    typeof v['body'] === 'object' &&
    v['body'] !== null &&
    !Array.isArray(v['body'])
  );
}
