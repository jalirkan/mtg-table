// mtg-table — the cube lab: an append-only .jsonl read a chunk at a time.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// drafts.jsonl grows all night and is never rewritten: the Synergy filler's
// folder reached 560 MB (36,210 drafts) on 2026-10-10, and every reader that
// did `fs.readFileSync(file, 'utf8').split('\n')` died there with Node's
// `Cannot create a string longer than 0x1fffffe8 characters` -- `run`'s
// resume first.  These readers never hold the whole file: they read
// CHUNK_BYTES at a time and decode a line only once its newline is in (a
// UTF-8 character never contains byte 0x0a, so cutting there is safe).
//
// `fileLines` gives exactly what `readFileSync(file, 'utf8').split('\n')` gave
// -- every segment, blank ones and the unterminated tail included, `\r` left
// on the line -- so each caller keeps its own filter and its own handling of a
// torn last line; `{ complete: true }` drops the unterminated tail, as
// `text.slice(0, text.lastIndexOf('\n') + 1).split('\n')` did.

import fs from 'node:fs';

/** Bytes read at a time: memory is this plus the longest line, whatever the file's size. */
export const CHUNK_BYTES = 8 << 20;

export interface LineOptions {
  /** Leave out the text after the last newline (a line still being written). */
  complete?: boolean;
  chunkBytes?: number;
}

/** The file's lines, as `readFileSync(file, 'utf8').split('\n')` would give them, without the one big string. */
export function* fileLines(file: string, opt: LineOptions = {}): Generator<string, void, undefined> {
  const size = Math.max(1, opt.chunkBytes ?? CHUNK_BYTES);
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.allocUnsafe(size);
    let carry: Buffer[] = [];
    for (;;) {
      const n = fs.readSync(fd, buf, 0, size, null);
      if (n <= 0) break;
      let start = 0;
      for (let nl = buf.indexOf(0x0a, 0); nl >= 0 && nl < n; nl = buf.indexOf(0x0a, start)) {
        const piece = buf.subarray(start, nl);
        const line = (carry.length ? Buffer.concat([...carry, piece]) : piece).toString('utf8');
        carry = [];
        start = nl + 1;
        yield line;
      }
      if (start < n) carry.push(Buffer.from(buf.subarray(start, n)));
    }
    // split('\n') always ends with the text after the last newline, '' when the file ends in one.
    if (!opt.complete) yield carry.length ? Buffer.concat(carry).toString('utf8') : '';
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Every non-empty line parsed, as `readFileSync(file, 'utf8').split('\n').filter(Boolean).map(JSON.parse)`
 * did -- a torn last line throws as it did.  The records are held; the text never is as one string.
 */
export function readJsonLines<T>(file: string, opt: LineOptions = {}): T[] {
  const out: T[] = [];
  for (const line of fileLines(file, opt)) if (line) out.push(JSON.parse(line) as T);
  return out;
}
