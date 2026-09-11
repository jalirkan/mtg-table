/*
 * mtg-table — reduce.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The whole client is `render(frames.reduce(reduce, initialState()))`.
 *
 * This file is PURE: no DOM, no fetch, no timers, no console. It is imported by
 * the browser, by `node --test`, and (later) by anything that wants to audit a
 * frame log. Keep it that way — the replay transport's "step back" is literally
 * "replay from the session header to index-1 through this function", which only
 * works because it has no side effects.
 *
 * docs/protocol.md §1: the client never silently ignores a frame it does not
 * understand. An unknown `type`, an unknown `ask.kind`, or a `v` major mismatch
 * THROWS. §3.6 rule 3 is the single deliberate exception: an unknown *event*
 * kind is dropped (and recorded in `droppedEventKinds`), never thrown.
 *
 * ---------------------------------------------------------------------------
 * §9 invariant 10 (amendment P5) — **a `hidden` card REPLACES; it never merges.**
 *
 * Forge card ids are stable across zone changes (`GameAction` re-copies a card
 * through `CardCopyService`, which reuses `copyFrom.getId()`) and across
 * face-down transitions, so the *worst* remaining hidden-information leak in
 * this design lives in this file rather than in `Snap.java` (report 06 §0.6): a
 * reducer that merged card objects by id would keep the `name` it learned while
 * an opponent's hand was legitimately revealed — `tempShowCards` windows last
 * exactly as long as one dialog — and keep rendering it for the rest of the
 * game.
 *
 * The rule is kept the cheapest possible way: **this reducer stores no card map
 * at all.** `state` is a full snapshot (§3.5), so `board` is replaced wholesale
 * by each `state` frame and a card object never outlives the frame that carried
 * it. Nothing here indexes, caches or memoises a card by id, and nothing later
 * may: if a future renderer wants a lookup table it must build it from the
 * current frame and throw it away with the frame. `web/test/reduce.test.ts`
 * pins the behaviour with a reveal-then-conceal pair of hand-built frames.
 * ---------------------------------------------------------------------------
 */

import {
  PROTOCOL_VERSION,
  isAskKind,
  isKnownEventKind,
  type ActBody,
  type AskBody,
  type Envelope,
  type Frame,
  type FrameType,
  type GameEvent,
  type GameStateBody,
  type HelloOkBody,
  type InputBody,
  type NoticeLevel,
  type OverBody,
  type SessionHeader,
} from './protocol.ts';

/** docs/protocol.md §6 — a notice, plus the envelope fields the UI shows. */
export interface TimestampedNotice {
  seq: number;
  t: number;
  level: NoticeLevel;
  title: string;
  text: string;
}

/** How many notices the client keeps. Older ones are dropped from the front. */
export const MAX_NOTICES = 50;

/** How many distinct unknown event kinds we bother to remember. */
const MAX_DROPPED_EVENT_KINDS = 32;

/**
 * How many log entries the ring keeps (amendment P20). 500 is roughly two
 * turns of a busy game at ~9 events per frame, and it is a *ring*: a whole
 * recording is ~3,000 events and keeping all of them would make every step-back
 * (which re-folds from the session header) quadratic in the log.
 */
export const MAX_LOG_ENTRIES = 500;

/**
 * §3.6 — one line of the running game log, derived from one `GameEvent`.
 *
 * **Ids only.** An event carries no names (`cast.text` is the one string, and it
 * is gated), so a log entry carries the ids it mentioned and the renderer
 * resolves them against the frame it is *currently* showing. Resolving late is
 * what keeps the log honest: an id whose card is concealed in the frame the user
 * is looking at prints as `#42`, not as the name it had ten frames ago.
 */
export interface LogEntry {
  /** The `seq` of the `state` frame this event arrived in. */
  seq: number;
  /** That frame's `t`, epoch ms. */
  t: number;
  kind: GameEvent['kind'];
  /** Every card id the event mentioned, in the order the event lists them. */
  cardIds: number[];
  /** Every player id the event mentioned. */
  playerIds: number[];
}

/**
 * The single object the view renders. `input` and `ask` live *inside* it
 * (docs/protocol.md §4.1): two frames on the wire, one object in the client, so
 * `render(state)` is total and there is no correlation state machine.
 */
export interface ClientState {
  /** §8.1 — set by the replay transport from line 0; `null` for a live socket. */
  session: SessionHeader | null;
  /** §2.1 — the handshake, including `you`, the seat this stream was redacted for. */
  hello: HelloOkBody | null;
  /** §3 — the last full snapshot. `null` until the first `state` frame. */
  board: GameStateBody | null;
  /** §4 — what the engine currently wants. Replaced wholesale by each `input`. */
  input: InputBody | null;
  /** §5 — the outstanding blocking question, or `null`. */
  ask: AskBody | null;
  /** §7 — set by `over`, and by any `state` whose `gameOver` is non-null. Sticky. */
  gameOver: OverBody | null;
  /** §6 — capped at {@link MAX_NOTICES}, oldest first. */
  notices: TimestampedNotice[];
  /** §3.6 — the event batch the most recent `state` reflected, known kinds only. */
  events: GameEvent[];
  /**
   * The running game log: every event of every `state` frame folded so far,
   * capped at {@link MAX_LOG_ENTRIES}, oldest first (amendment P20).
   *
   * It lives here, in the reducer, for one reason: `reduce()` is the only
   * function that sees **every** frame, and because it is pure the replay
   * transport's "step back" — which re-folds from the session header — rebuilds
   * the log exactly as it was rather than leaving a log that only grows. A ring
   * accumulated in a React component would be wrong the first time the user
   * scrubbed backwards.
   */
  log: LogEntry[];
  /** §3.6 rule 3 — event kinds this client dropped, so drift is visible not silent. */
  droppedEventKinds: string[];
  /** The last client→server action seen (frame logs carry them; §8.2). */
  lastAct: ActBody | null;
  /** How many frames have been folded in. Handy for the replay scrubber. */
  framesApplied: number;
}

export function initialState(session: SessionHeader | null = null): ClientState {
  return {
    session,
    hello: null,
    board: null,
    input: null,
    ask: null,
    gameOver: null,
    notices: [],
    events: [],
    log: [],
    droppedEventKinds: [],
    lastAct: null,
    framesApplied: 0,
  };
}

/** A short human description of a frame, for error messages. */
function describe(frame: Envelope<FrameType, unknown>): string {
  const dir = frame.dir ? `${frame.dir} ` : '';
  return `${dir}frame #${String(frame.seq)} type=${JSON.stringify(frame.type)} t=${String(frame.t)}`;
}

/**
 * The reducer. Pure: `reduce(state, frame)` returns a new state and never
 * mutates its arguments.
 *
 * @throws if `frame.v` is not {@link PROTOCOL_VERSION}, if `frame.type` is not
 *   one of the ten types in §2, or if an `ask` carries a kind outside the eleven
 *   in §5.1. The error message always names the frame.
 */
export function reduce(state: ClientState, frame: Frame): ClientState {
  if (frame.v !== PROTOCOL_VERSION) {
    throw new Error(
      `reduce: protocol major mismatch — ${describe(frame)} has v=${JSON.stringify(frame.v)}, ` +
        `this client speaks v=${String(PROTOCOL_VERSION)}. Regenerate the log or update web/src/protocol.ts.`,
    );
  }

  const applied = state.framesApplied + 1;

  switch (frame.type) {
    case 'hello_ok':
      return { ...state, hello: frame.body, framesApplied: applied };

    case 'state':
      return applyState(state, frame.body, frame.seq, frame.t, applied);

    case 'input':
      return { ...state, input: frame.body, framesApplied: applied };

    case 'ask':
      return applyAsk(state, frame.body, frame, applied);

    case 'notice':
      return {
        ...state,
        notices: appendNotice(state.notices, {
          seq: frame.seq,
          t: frame.t,
          level: frame.body.level,
          title: frame.body.title,
          text: frame.body.text,
        }),
        framesApplied: applied,
      };

    case 'over':
      // The question, if any, dies with the game: nothing can answer it now.
      return { ...state, gameOver: frame.body, ask: null, framesApplied: applied };

    case 'act':
      // §2.2 — client→server. Carried in frame logs so a replay can show what
      // the player did; it changes no board state of its own.
      return { ...state, lastAct: frame.body, framesApplied: applied };

    case 'answer':
      // §2.3 — exactly one per ask. A second for a completed askId is ignored.
      return state.ask !== null && state.ask.askId === frame.body.askId
        ? { ...state, ask: null, framesApplied: applied }
        : { ...state, framesApplied: applied };

    case 'resync':
      // §2.4 — a request, not an effect. The fresh state/input frames follow.
      return { ...state, framesApplied: applied };

    case 'ping':
    case 'pong':
      // §2.5 — keepalive only; it carries no game meaning.
      return { ...state, framesApplied: applied };

    default: {
      const unknown = frame as Envelope<FrameType, unknown>;
      throw new Error(
        `reduce: unknown frame type — ${describe(unknown)} is not one of the ten types in ` +
          `docs/protocol.md §2. The bridge and web/src/protocol.ts have drifted.`,
      );
    }
  }
}

function applyState(
  state: ClientState,
  body: GameStateBody,
  seq: number,
  t: number,
  applied: number,
): ClientState {
  const { events, dropped } = partitionEvents(body.events);
  return {
    ...state,
    // P5: the board is REPLACED, never merged into. See the header of this file.
    board: { ...body, events },
    events,
    log: appendLog(state.log, events, seq, t),
    droppedEventKinds: mergeDropped(state.droppedEventKinds, dropped),
    // §3.1 — `gameOver` mirrors the `over` body once set, and is sticky: a later
    // snapshot never un-ends a game.
    gameOver: body.gameOver ?? state.gameOver,
    framesApplied: applied,
  };
}

/**
 * §3.6 — the ids one event mentions, so the log ring can carry a summary
 * without carrying a name. Total over every event shape the protocol allows,
 * `null`s included: a `zone` event with no `from` is a token arriving from
 * nowhere, and it still has a card id.
 */
export function eventIds(event: GameEvent): { cardIds: number[]; playerIds: number[] } {
  const cardIds: number[] = [];
  const playerIds: number[] = [];
  const entity = (ref: { kind: 'player' | 'card'; id: number } | null): void => {
    if (ref === null) return;
    (ref.kind === 'player' ? playerIds : cardIds).push(ref.id);
  };

  switch (event.kind) {
    case 'zone':
      cardIds.push(event.cardId);
      if (event.from?.player != null) playerIds.push(event.from.player);
      if (event.to?.player != null) playerIds.push(event.to.player);
      break;
    case 'cast':
      cardIds.push(event.cardId);
      playerIds.push(event.controller);
      break;
    case 'resolved':
    case 'unstacked':
    case 'sacrificed':
      cardIds.push(event.cardId);
      break;
    case 'attackers':
      playerIds.push(event.player);
      for (const band of event.bands) {
        cardIds.push(...band.attackerIds);
        entity(band.defender);
      }
      break;
    case 'blockers':
      playerIds.push(event.defendingPlayer);
      for (const block of event.blocks) {
        cardIds.push(block.attackerId, ...block.blockerIds);
      }
      break;
    case 'damage':
      entity(event.target);
      cardIds.push(event.sourceCardId);
      break;
    case 'life':
    case 'shuffle':
    case 'mulligan':
    case 'turn':
    case 'phase':
    case 'scry':
    case 'surveil':
    case 'foretold':
      playerIds.push(event.player);
      break;
    case 'poison':
      playerIds.push(event.player);
      if (event.sourcePlayer !== null) playerIds.push(event.sourcePlayer);
      break;
    case 'tap':
    case 'counters':
    case 'phased':
      cardIds.push(event.cardId);
      break;
    case 'attach':
      cardIds.push(event.cardId);
      entity(event.to);
      break;
    case 'land':
      playerIds.push(event.player);
      cardIds.push(event.cardId);
      break;
    case 'stats':
      cardIds.push(...event.cardIds);
      break;
    case 'combat_end':
      cardIds.push(...event.attackerIds, ...event.blockerIds);
      break;
    case 'outcome':
      if (event.winner !== null) playerIds.push(event.winner);
      break;
  }
  return { cardIds, playerIds };
}

/** Fold one frame's events into the ring, dropping the oldest past the cap. */
function appendLog(log: LogEntry[], events: GameEvent[], seq: number, t: number): LogEntry[] {
  if (events.length === 0) return log;
  const next = [...log];
  for (const event of events) {
    const { cardIds, playerIds } = eventIds(event);
    next.push({ seq, t, kind: event.kind, cardIds, playerIds });
  }
  return next.length > MAX_LOG_ENTRIES ? next.slice(next.length - MAX_LOG_ENTRIES) : next;
}

function applyAsk(
  state: ClientState,
  body: AskBody,
  frame: Envelope<FrameType, unknown>,
  applied: number,
): ClientState {
  const kind: string = body.kind;
  if (!isAskKind(kind)) {
    throw new Error(
      `reduce: unknown ask.kind ${JSON.stringify(kind)} on ${describe(frame)} — not one of the ` +
        `eleven kinds in docs/protocol.md §5.1 (open_zones was deleted: it is a non-blocking ` +
        `input.openZones hint, not a question). A new blocking IGuiGame method reached the wire ` +
        `without the reducer learning about it; the game thread is now blocked on a question ` +
        `this client cannot render.`,
    );
  }
  return { ...state, ask: body, framesApplied: applied };
}

/** §3.6 rule 3 — unknown event kinds are dropped, not thrown. */
function partitionEvents(raw: GameEvent[] | undefined): {
  events: GameEvent[];
  dropped: string[];
} {
  if (!Array.isArray(raw)) return { events: [], dropped: [] };
  const events: GameEvent[] = [];
  const dropped: string[] = [];
  for (const event of raw) {
    const kind: string = (event as { kind?: unknown }).kind as string;
    if (typeof kind === 'string' && isKnownEventKind(kind)) events.push(event);
    else dropped.push(typeof kind === 'string' ? kind : '(no kind)');
  }
  return { events, dropped };
}

function mergeDropped(existing: string[], incoming: string[]): string[] {
  if (incoming.length === 0) return existing;
  const seen = new Set(existing);
  let out: string[] | null = null;
  for (const kind of incoming) {
    if (seen.has(kind)) continue;
    seen.add(kind);
    out ??= [...existing];
    if (out.length < MAX_DROPPED_EVENT_KINDS) out.push(kind);
  }
  return out ?? existing;
}

function appendNotice(
  notices: TimestampedNotice[],
  notice: TimestampedNotice,
): TimestampedNotice[] {
  const next = [...notices, notice];
  return next.length > MAX_NOTICES ? next.slice(next.length - MAX_NOTICES) : next;
}

/**
 * Fold a run of frames. This is how the replay transport steps *backwards*:
 * there is no inverse of `reduce`, so "back" is "replay from the session header
 * to index-1". Cheap, and correct by construction.
 */
export function replayFrames(
  frames: readonly Frame[],
  upToExclusive: number,
  session: SessionHeader | null = null,
): ClientState {
  let state = initialState(session);
  const end = Math.max(0, Math.min(upToExclusive, frames.length));
  for (let i = 0; i < end; i++) {
    state = reduce(state, frames[i]!);
  }
  return state;
}
