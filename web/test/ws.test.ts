/*
 * mtg-table — web/test/ws.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * `WebSocketTransport` (M3) driven against a stub socket.
 *
 * The state machine this file covers is the one that cannot be tested against a
 * real bridge without making a JVM part of `npm test`: a socket that opens,
 * drops, reopens and refuses. Every rule asserted here is one the protocol
 * states and nothing would otherwise notice:
 *
 *   - §1: the client owns a monotonic per-direction `seq`, starting at 1;
 *   - §2.1: a FIRST connect sends nothing — the server volunteers `hello_ok`,
 *     `state` and `input` — and §2.4: a RECONNECT sends `resync`;
 *   - §2.5: a `ping` is answered with a `pong`;
 *   - §1's unknown-frame policy: a `v` mismatch and an unknown `type` stop the
 *     fold and surface as an error, rather than being skipped;
 *   - contract (c): a ≥ 4000 close code is the server refusing a second client,
 *     and is terminal — retrying it would fight a bridge that already said no;
 *   - acts are dropped, never queued, while the socket is shut.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Frame } from '../src/protocol.ts';
import {
  DEFAULT_WS_PORT,
  WebSocketTransport,
  wsUrl,
  type WebSocketLike,
} from '../src/transport/ws.ts';

// ---------------------------------------------------------------------------
// A stub socket: no network, no timers of its own, every transition explicit.
// ---------------------------------------------------------------------------

class StubSocket implements WebSocketLike {
  readyState = 0;
  readonly sent: string[] = [];
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code?: number; reason?: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  closedWith: number | null = null;
  /** Node's type stripping has no parameter properties, so this is written out. */
  readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    if (this.readyState !== 1) throw new Error('send on a socket that is not open');
    this.sent.push(data);
  }

  close(code?: number): void {
    this.closedWith = code ?? 1000;
    this.readyState = 3;
  }

  // -- test drivers --
  open(): void {
    this.readyState = 1;
    this.onopen?.({});
  }
  deliver(frame: unknown): void {
    this.onmessage?.({ data: typeof frame === 'string' ? frame : JSON.stringify(frame) });
  }
  drop(code = 1006, reason = 'gone'): void {
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }
  get frames(): Frame[] {
    return this.sent.map((text) => JSON.parse(text) as Frame);
  }
}

function harness(options: { maxAttempts?: number } = {}): {
  transport: WebSocketTransport;
  sockets: StubSocket[];
  last: () => StubSocket;
} {
  const sockets: StubSocket[] = [];
  const transport = new WebSocketTransport({
    url: 'ws://127.0.0.1:9999/ws',
    maxBackoffMs: 1,
    maxAttempts: options.maxAttempts ?? 12,
    socketFactory: (url) => {
      const socket = new StubSocket(url);
      sockets.push(socket);
      return socket;
    },
  });
  return { transport, sockets, last: () => sockets[sockets.length - 1]! };
}

const HELLO = {
  v: 1,
  seq: 1,
  t: 1,
  type: 'hello_ok',
  body: {
    gameId: 'g1',
    you: 0,
    seed: 42,
    forgeVersion: '2.0.14',
    forgeJarSha256: 'abc',
    unsupportedCards: [],
    players: [
      { id: 0, name: 'Pacho', isAi: false },
      { id: 1, name: 'Forge AI', isAi: true },
    ],
  },
};

const INPUT = {
  v: 1,
  seq: 2,
  t: 2,
  type: 'input',
  body: {
    prompt: 'Main phase, precombat',
    focusCardId: null,
    focusCard: null,
    buttons: { ok: { label: 'OK', enabled: true }, cancel: { label: 'End Turn', enabled: true } },
    selectable: { cardIds: [], min: 0, max: 0, mode: 'none' },
    highlighted: [],
    weak: [],
    openZones: [],
  },
};

// ---------------------------------------------------------------------------

test('the default URL is loopback, on config.json\'s wsPort', () => {
  assert.equal(wsUrl(), `ws://127.0.0.1:${String(DEFAULT_WS_PORT)}/ws`);
  assert.equal(DEFAULT_WS_PORT, 8642);
  // Loopback is a decision (README NON-GOALS), so it is asserted, not assumed.
  assert.match(wsUrl(1234), /^ws:\/\/127\.0\.0\.1:1234\/ws$/);
});

test('a FIRST connect sends nothing — §2.1 volunteers hello_ok, state and input', () => {
  const { transport, last } = harness();
  transport.connect();
  assert.equal(transport.status.status, 'connecting');
  last().open();
  assert.equal(transport.status.status, 'open');
  assert.deepEqual(last().sent, []);

  last().deliver(HELLO);
  assert.equal(transport.state.hello?.you, 0);
  assert.equal(transport.status.framesIn, 1);
  transport.close();
});

test('a RECONNECT sends resync (§2.4), and the client seq is monotonic from 1 (§1)', () => {
  const { transport, sockets, last } = harness();
  transport.connect();
  last().open();
  last().deliver(HELLO);
  transport.act({ action: 'clickCard', cardId: 41 });
  transport.act({ action: 'buttonOk' });

  const firstFrames = last().frames;
  assert.deepEqual(
    firstFrames.map((f) => [f.type, f.seq]),
    [
      ['act', 1],
      ['act', 2],
    ],
  );
  assert.equal((firstFrames[0]!.body as { cardId: number }).cardId, 41);
  assert.ok(firstFrames[0]!.t > 0, 't is stamped by the transport, not by the caller');

  // The socket drops; the transport retries and this time announces itself.
  last().drop(1006);
  assert.equal(sockets.length, 1, 'the retry is scheduled, not immediate');
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      assert.equal(sockets.length, 2, 'the backoff fired and a second socket was made');
      last().open();
      const resync = last().frames;
      assert.equal(resync.length, 1);
      assert.equal(resync[0]!.type, 'resync');
      // §1: per DIRECTION, per connection — the counter does not restart, because
      // a gap is how the server sees a dropped frame.
      assert.equal(resync[0]!.seq, 3);
      transport.close();
      resolve();
    }, 20);
  });
});

test('a ping is answered with a pong (§2.5) and the reducer ignores both', () => {
  const { transport, last } = harness();
  transport.connect();
  last().open();
  last().deliver({ v: 1, seq: 3, t: 3, type: 'ping', body: {} });
  const sent = last().frames;
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.type, 'pong');
  assert.equal(transport.error, null);
  transport.close();
});

test('a v mismatch stops the fold and surfaces as an error, not a skip (§1)', () => {
  const { transport, last } = harness();
  transport.connect();
  last().open();
  last().deliver(HELLO);
  last().deliver({ ...INPUT, v: 2 });

  assert.notEqual(transport.error, null);
  assert.match(transport.error!.message, /protocol major mismatch/);
  assert.equal(transport.state.input, null, 'the bad frame was not applied');

  // Folding has stopped: a later good frame is counted but not applied, because
  // it would be reduced against a state the engine never produced.
  last().deliver(INPUT);
  assert.equal(transport.state.input, null);
  assert.ok(transport.status.framesIn >= 3);

  // …and the user can carry on: §2.4's full snapshot is always correct.
  transport.clearErrorAndResync();
  assert.equal(transport.error, null);
  assert.equal(last().frames.at(-1)?.type, 'resync');
  last().deliver(INPUT);
  // A fresh read: `assert.equal(x, null)` above narrowed the old one to `null`.
  const recovered = transport.state;
  assert.equal(recovered.input?.prompt, 'Main phase, precombat');
  transport.close();
});

test('an unknown frame type surfaces the same way', () => {
  const { transport, last } = harness();
  transport.connect();
  last().open();
  last().deliver({ v: 1, seq: 1, t: 1, type: 'state_patch', body: {} });
  assert.match(transport.error!.message, /unknown frame type/);
  transport.close();
});

test('a frame that is not a §1 envelope is rejected before reduce() sees it', () => {
  const { transport, last } = harness();
  transport.connect();
  last().open();
  last().deliver('{"hello":true}');
  assert.match(transport.error!.message, /not a §1 envelope/);
  transport.close();
});

test('a ≥4000 close code is the server refusing a second client — terminal (contract c)', () => {
  const { transport, sockets, last } = harness();
  transport.connect();
  last().open();
  last().drop(4009, 'another client is connected');
  assert.equal(transport.status.status, 'refused');
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      assert.equal(sockets.length, 1, 'a refusal is not retried in a loop');
      assert.ok(
        transport.clientNotices.some((n) => n.title === 'Connection refused'),
        'the user is told, in the toast list',
      );
      // …but the button is still there.
      transport.reconnect();
      assert.equal(sockets.length, 2);
      transport.close();
      resolve();
    }, 20);
  });
});

test('an act sent while the socket is shut is DROPPED, never queued', () => {
  const { transport, last } = harness();
  transport.connect();
  last().open();
  last().drop(1006);
  transport.act({ action: 'clickCard', cardId: 7 });
  assert.equal(transport.status.dropped, 1);
  assert.ok(transport.clientNotices.some((n) => n.title === 'Not connected'));
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      last().open();
      // The reconnect's resync, and nothing else: the click described a board
      // that is now two frames old.
      assert.deepEqual(
        last().frames.map((f) => f.type),
        ['resync'],
      );
      transport.close();
      resolve();
    }, 20);
  });
});

test('giving up after maxAttempts says so instead of retrying forever', () => {
  const { transport, sockets, last } = harness({ maxAttempts: 3 });
  transport.connect();
  last().open();
  return new Promise<void>((resolve) => {
    const dropAgain = (n: number): void => {
      if (n === 0) {
        assert.equal(transport.status.status, 'closed');
        assert.ok(transport.clientNotices.some((n2) => n2.title === 'Giving up'));
        assert.ok(sockets.length <= 4);
        transport.close();
        resolve();
        return;
      }
      last().drop(1006);
      setTimeout(() => {
        dropAgain(n - 1);
      }, 15);
    };
    dropAgain(5);
  });
});

test('after `over` the transport stops reconnecting — the bridge plays one game and exits', () => {
  const { transport, sockets, last } = harness();
  transport.connect();
  last().open();
  last().deliver(HELLO);
  last().deliver({
    v: 1,
    seq: 9,
    t: 9,
    type: 'over',
    body: { winner: 0, reason: 'AllOpponentsLost', matchOver: true },
  });
  assert.equal(transport.state.gameOver?.winner, 0);
  last().drop(1000, 'server exiting');
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      assert.equal(sockets.length, 1);
      assert.equal(transport.status.status, 'closed');
      transport.close();
      resolve();
    }, 20);
  });
});

test('answer() and resync() are the §2.3 / §2.4 envelopes, with ask-local values', () => {
  const { transport, last } = harness();
  transport.connect();
  last().open();
  transport.answer('a17', [0, 3]);
  transport.answer('a18', { ordered: [1, 0], remember: false });
  transport.resync();
  const sent = last().frames;
  assert.deepEqual(
    sent.map((f) => f.type),
    ['answer', 'answer', 'resync'],
  );
  assert.deepEqual(sent[0]!.body, { askId: 'a17', value: [0, 3] });
  assert.deepEqual(sent[1]!.body, { askId: 'a18', value: { ordered: [1, 0], remember: false } });
  assert.deepEqual(sent[2]!.body, {});
  transport.close();
});

test('answering an ask clears it locally — nothing the server sends ever will', () => {
  /*
   * The bug this pins, measured in a browser against a live `order` ask on
   * 2026-09-11: the ask modal stayed on screen after it had been answered, over
   * a board that had already moved on.
   *
   * §2.3 is "exactly one `answer` per ask", and `reduce()` enforces it by
   * clearing `state.ask` when it folds the `answer` — which a REPLAY does,
   * because a frame log carries both directions (§8.2). A live client's answer
   * goes out on the socket and never comes back, and **no server frame says
   * "that question is closed"**: the game thread simply unparks and the next
   * `state` arrives. So the transport folds its own c2s frames too, and the live
   * session behaves exactly like a replay of its own log.
   */
  const { transport, last } = harness();
  transport.connect();
  last().open();
  last().deliver({
    v: 1,
    seq: 4,
    t: 4,
    type: 'ask',
    body: {
      askId: 'a1',
      kind: 'order',
      timeoutMs: 0,
      prompt: 'Select order for replacement effects',
      destLabel: 'Apply first',
      dest: [{ id: 0, label: 'enters tapped', kind: 'other' }],
      source: [{ id: 1, label: 'choose a color', kind: 'other' }],
      min: -1,
      max: -1,
      referenceCardId: null,
      sideboardMode: false,
      showRemember: true,
    },
  });
  assert.equal(transport.state.ask?.askId, 'a1');

  transport.answer('a1', { ordered: [0, 1], remember: false });
  assert.equal(transport.state.ask, null, 'the answered question is gone from the board');

  // An act folds too, so `lastAct` is live-accurate the way a replay's is.
  transport.act({ action: 'clickCard', cardId: 9 });
  assert.deepEqual(transport.state.lastAct, { action: 'clickCard', cardId: 9 });
  transport.close();
});

test('sent frames reach onFrame with dir:"c2s", so a watcher sees both directions (§8.2)', () => {
  const { transport, last } = harness();
  const seen: string[] = [];
  transport.onFrame((f) => seen.push(`${f.dir ?? 's2c'} ${f.type}`));
  transport.connect();
  last().open();
  last().deliver(HELLO);
  transport.act({ action: 'concede' });
  assert.deepEqual(seen, ['s2c hello_ok', 'c2s act']);
  transport.close();
});
