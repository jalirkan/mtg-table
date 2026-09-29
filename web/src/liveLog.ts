/*
 * mtg-table — liveLog.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **A live seat's frames, kept for the arena's caption** (D255). The WebSocket
 * transport folds each frame into one `ClientState` and keeps no list of them
 * (`transport/ws.ts`), so a replay's caption — the narrator over the log's
 * frames — has nothing to read at a live seat. `main.tsx` puts one of these on
 * the page's socket when it opens it (`liveTransport`) and pushes every inbound
 * frame into it through `onFrame`, so it hears exactly what the reducer hears,
 * in the same order, for as long as the socket lives (a trip to `#cards`,
 * `#workshop` or `#story` unmounts the seat, and the recording goes on).
 *
 * **One game, whole, and nothing else.** A `hello_ok` whose `gameId` changed
 * starts a new list (D44: a new game is a reset, and the story of the last one
 * is not this one's); a `hello_ok` with the same id is a `resync`'s verbatim
 * re-delivery and is kept, as a client log keeps it, for the narrator to skip by
 * its `seq`. Pings and a refusal (`seq` 0) are not the game. Why the whole game
 * and not the last N frames: the narrator's text depends on what came before —
 * a trigger quoted once is "triggers again" the second time, the kept hands and
 * who goes first are told at turn 1, a spell's cast and its payment can span two
 * flushes — so a window would caption some moments differently from the story
 * the CLI and `#story` tell of the same frames. The cost is the parsed frames of
 * the game in progress (a replay's transport holds a whole log the same way) and
 * a re-narration per frame while the caption is on (~4 ms at g1's length).
 *
 * Pure: no DOM, no React, no clock. `web/test/caption.test.ts` drives it.
 */

import type { Frame } from './protocol.ts';

/**
 * The session header a live seat's log stands behind — `recordedBy: "client"`,
 * because that is what these frames are (amendment M17): what one client heard
 * on its socket, re-deliveries and gaps included.
 */
export interface LiveHeader {
  kind: 'session';
  recordedBy: 'client';
  gameId: string | null;
  seat: number | null;
}

export class LiveFrameLog {
  #frames: Frame[] = [];
  #gameId: string | null = null;
  #seat: number | null = null;
  #version = 0;

  /** One inbound frame, in wire order. */
  push(frame: Frame): void {
    if (frame.dir === 'c2s') return;
    if (frame.type === 'ping' || frame.type === 'pong') return;
    if (frame.seq === 0) return;
    if (frame.type === 'hello_ok') {
      const gameId = frame.body.gameId;
      if (this.#frames.length === 0 || gameId !== this.#gameId) {
        this.#frames = [frame];
        this.#gameId = gameId;
        this.#seat = frame.body.you;
        this.#version += 1;
        return;
      }
    }
    if (this.#frames.length === 0) return; // nothing before a handshake is a game
    this.#frames.push(frame);
    this.#version += 1;
  }

  /** The game in progress, from its `hello_ok`. The array is replaced at a new game, appended to otherwise. */
  get frames(): readonly Frame[] {
    return this.#frames;
  }

  get header(): LiveHeader {
    return { kind: 'session', recordedBy: 'client', gameId: this.#gameId, seat: this.#seat };
  }

  /** Bumped by every frame kept: what a memo keys on. */
  get version(): number {
    return this.#version;
  }
}
