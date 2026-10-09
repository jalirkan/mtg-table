// mtg-table — tools/llm-seat/test/fake-bridge.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A FAKE BRIDGE for the seat's end-to-end test: a minimal RFC 6455 server
// (text frames, masks, close; no extensions) on node:http's upgrade, and a
// scripted engine behind it.  It is not Forge: each step sends the frames a
// real bridge would send at that point (shapes from docs/protocol.md and the
// fixtures) and waits for the c2s frame the step expects.  Node has a
// WebSocket client and no server, and the repo takes no npm dependency.

import { createHash } from 'node:crypto';
import { createServer } from 'node:http';

function encode(text) {
  const payload = Buffer.from(text, 'utf8');
  const n = payload.length;
  let head;
  if (n < 126) head = Buffer.from([0x81, n]);
  else if (n < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 126; head.writeUInt16BE(n, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 127; head.writeBigUInt64BE(BigInt(n), 2); }
  return Buffer.concat([head, payload]);
}

function* decode(state) {
  for (;;) {
    const b = state.buf;
    if (b.length < 2) return;
    const op = b[0] & 0x0f;
    let len = b[1] & 0x7f;
    let off = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
    const masked = (b[1] & 0x80) !== 0;
    const mask = masked ? b.subarray(off, off + 4) : null;
    if (masked) off += 4;
    if (b.length < off + len) return;
    const data = Buffer.from(b.subarray(off, off + len));
    if (mask) for (let i = 0; i < data.length; i++) data[i] ^= mask[i % 4];
    state.buf = b.subarray(off + len);
    yield { op, data };
  }
}

/**
 * startFakeBridge(script) -> {port, close, received}
 * script(conn) is an async function given {send(type, body), next(predicate) -> c2s frame}.
 */
export function startFakeBridge(script) {
  const received = [];
  const server = createServer();
  let seq = 0;
  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    const accept = createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const st = { buf: Buffer.alloc(0) };
    const waiting = [];
    const inbox = [];
    const deliver = () => {
      while (waiting.length && inbox.length) {
        const w = waiting[0];
        const i = inbox.findIndex(w.pred);
        if (i < 0) {
          inbox.length = 0;   // frames that no step waits for (phase stops, a pong) are dropped
          return;
        }
        const [f] = inbox.splice(0, i + 1).slice(-1);
        waiting.shift();
        w.resolve(f);
      }
    };
    socket.on('data', (d) => {
      st.buf = Buffer.concat([st.buf, d]);
      for (const { op, data } of decode(st)) {
        if (op === 0x8) { socket.end(); return; }
        if (op !== 0x1) continue;
        const f = JSON.parse(data.toString('utf8'));
        received.push(f);
        inbox.push(f);
        deliver();
      }
    });
    socket.on('error', () => {});
    const conn = {
      send(type, body) { seq += 1; socket.write(encode(JSON.stringify({ v: 1, seq, t: Date.now(), type, body }))); },
      next(pred, ms = 5000) {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error(`fake bridge: no matching frame within ${ms} ms; got ${JSON.stringify(received.slice(-5))}`)), ms);
          waiting.push({ pred, resolve: (f) => { clearTimeout(timer); resolve(f); } });
          deliver();
        });
      },
      close() { socket.write(Buffer.from([0x88, 0x00])); socket.end(); },
    };
    script(conn).then(() => conn.close(), (e) => { conn.error = e; server.emit('script-error', e); conn.close(); });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ port: server.address().port, received, server, close: () => new Promise((r) => server.close(() => r())) });
    });
  });
}
