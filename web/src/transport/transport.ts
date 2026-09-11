/*
 * mtg-table — transport/transport.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The one seam between "where frames come from" and "what the board renders".
 *
 * There are exactly two implementations, and the board component cannot tell
 * them apart (docs/research/05-architecture-synthesis.md §4):
 *
 *   transport/replay.ts  LogReplayTransport  — a .jsonl frame log.       [M1]
 *   transport/ws.ts      WebSocketTransport  — ws://127.0.0.1:8642/ws.   [M3]
 *
 * M1 ships only the replay one. Do not write the WebSocket one yet.
 */

import type { Frame } from '../protocol.ts';

export type FrameHandler = (frame: Frame) => void;

export interface Transport {
  /**
   * Subscribe to inbound frames. Returns an unsubscribe function, so a React
   * effect can clean up without the transport growing a `removeListener`.
   *
   * A handler is called with frames in wire order. It must not throw; a throwing
   * handler is the caller's bug, and a transport is free to let it propagate.
   */
  onFrame(cb: FrameHandler): () => void;

  /**
   * Send a client→server frame (§2.2 `act`, §2.3 `answer`, §2.4 `resync`).
   *
   * docs/protocol.md §9 invariant 1: client→server messages never expect a
   * reply, so this returns nothing. The effect arrives as the next `state` /
   * `input`. A replay has no server, so its `send` records and discards.
   */
  send(frame: Frame): void;

  /** Release resources. Optional: a replay has none worth the ceremony. */
  close?(): void;
}
