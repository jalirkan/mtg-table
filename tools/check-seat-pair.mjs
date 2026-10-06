#!/usr/bin/env node
// mtg-table -- the two logs of a game between two people, read against each other.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Amendment M59, decision D402.  A table of two writes one frame log per seat,
// each redacted for its seat (`var/games/<gameId>-seat0/` and `-seat1/`), and
// tools/check-redaction.mjs audits each on its own: no full card of the other
// seat's in a hidden zone, every string swept, and the rest.  What one log
// cannot show is what the OTHER seat held.  This reads both:
//
//   node tools/check-seat-pair.mjs <seat0 frames.jsonl> <seat1 frames.jsonl>
//
// For each direction (the viewer V, the other seat O):
//
//   1. O's names: every card name O's own log shows on a card O owns (not a
//      token, which is made in play and named by the public card that makes it), minus the
//      names of V's own cards (V built that deck and knows its list).  Each is
//      secret to V until the first frame of V's log that shows V a card of
//      that name in full -- the bridge's gate decided V may see it then, and
//      check-redaction holds each such card to its zone.
//   2. No name appears in ANY string of V's log before that frame (or at all,
//      when V never sees it) -- a prompt, an option label, a notice, an
//      event's text, a stack item's text -- as a whole word.  That is the
//      channel hard rule 8 says the leak will actually come through.
//   3. No full card O owns appears in V's log in a hidden zone (hand, library):
//      check-redaction's rule, held across the two files by owner.
//   4. Both logs are the same game: one gameId, the same seed, `humans: 2`, and
//      the two viewers are the two players.
//
// Exit 0 when every check holds for both directions, 1 otherwise.
// tools/check-seat-pair-selftest.mjs plants each defect in a synthetic pair.

import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const PUBLIC = new Set(['battlefield', 'graveyard', 'exile', 'stack', 'command']);
const HIDDEN = new Set(['hand', 'library']);

export function readLog(path) {
  const raw = readFileSync(path);
  const text = path.endsWith('.gz') ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  const header = JSON.parse(lines[0]);
  const frames = lines.slice(1).map((l) => JSON.parse(l)).filter((f) => f.dir === 's2c' || f.dir === undefined);
  return { header, frames };
}

const isCard = (o) => o && typeof o === 'object' && !Array.isArray(o) && Number.isInteger(o.id)
  && typeof o.name === 'string' && o.name !== '' && Number.isInteger(o.owner);

/** Every full card object in a frame body, with its zone. */
function* cards(v) {
  if (Array.isArray(v)) {
    for (const x of v) yield* cards(x);
  } else if (v && typeof v === 'object') {
    if (isCard(v)) yield v;
    for (const [k, x] of Object.entries(v)) if (k !== 'name') yield* cards(x);
  }
}

/** Every string in a frame body except a full card's own `name` (which item 3 and check-redaction judge). */
function* strings(v, path = '') {
  if (typeof v === 'string') {
    yield [path, v];
  } else if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) yield* strings(v[i], `${path}[${i}]`);
  } else if (v && typeof v === 'object') {
    const card = isCard(v);
    for (const [k, x] of Object.entries(v)) {
      if (card && k === 'name') continue;
      yield* strings(x, path ? `${path}.${k}` : k);
    }
  }
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The problems with viewer `v` (a log) against the other seat `o` (a log). */
export function auditDirection(v, o) {
  const problems = [];
  const vSeat = v.header.seat;
  const oSeat = o.header.seat;
  const oNames = new Set();
  // A token is made in play, never drawn: its name is printed on the public card that makes it.
  for (const f of o.frames) for (const c of cards(f.body)) if (c.owner === oSeat && c.token !== true) oNames.add(c.name);
  const mine = new Set();
  for (const f of v.frames) for (const c of cards(f.body)) if (c.owner === vSeat) mine.add(c.name);
  for (const f of o.frames) for (const c of cards(f.body)) if (c.owner === vSeat) mine.add(c.name);
  const firstSeen = new Map();
  v.frames.forEach((f, i) => {
    for (const c of cards(f.body)) if (!firstSeen.has(c.name)) firstSeen.set(c.name, i);
  });
  const secret = [...oNames].filter((name) => !mine.has(name) && name.length >= 3);
  const res = secret.map((name) => [name, new RegExp(`(^|[^A-Za-z0-9])${escapeRe(name)}($|[^A-Za-z0-9])`),
    firstSeen.has(name) ? firstSeen.get(name) : Infinity]);
  const known = mine.size;
  // A secret name inside a longer name V may know ("Doombot" in "Aerial Doombot")
  // is that name, not a leak: names V knows by this frame are masked first, longest first.
  const byFrame = [...firstSeen.entries()].sort((x, y) => x[1] - y[1]);
  const knownNow = [...mine];
  let next = 0;
  let n = 0;
  let secretFrames = 0;
  for (const f of v.frames) {
    n++;
    while (next < byFrame.length && byFrame[next][1] <= n - 1) knownNow.push(byFrame[next++][0]);
    const live = res.filter(([, , at]) => n - 1 < at);
    secretFrames += live.length;
    const masks = knownNow.filter((k) => live.some(([name]) => k !== name && k.includes(name)))
      .sort((x, y) => y.length - x.length);
    for (const [where, raw] of live.length === 0 ? [] : strings(f.body)) {
      let s = raw;
      for (const k of masks) if (s.includes(k)) s = s.split(k).join('\u0000');
      for (const [name, re] of live) {
        if (s.includes(name) && re.test(s)) {
          problems.push(`seat ${vSeat}'s log, frame ${n} (${f.type} seq ${f.seq}) ${where}: names "${name}", `
            + `a card only seat ${oSeat} ever held (hard rule 8)`);
        }
      }
    }
    for (const c of cards(f.body)) {
      if (c.owner === oSeat && HIDDEN.has(c.zone)) {
        problems.push(`seat ${vSeat}'s log, frame ${n} (${f.type} seq ${f.seq}): seat ${oSeat}'s card ${c.id} `
          + `in full in zone ${c.zone}`);
      }
    }
  }
  const never = res.filter(([, , at]) => at === Infinity).length;
  return { problems, secret: secret.length, never, known, secretFrames, frames: v.frames.length };
}

export function auditPair(a, b) {
  const problems = [];
  if (a.header.humans !== 2 || b.header.humans !== 2) problems.push('both session headers must say humans: 2 (M59)');
  if (a.header.gameId !== b.header.gameId) problems.push(`two games: ${a.header.gameId} and ${b.header.gameId}`);
  if (a.header.seed !== b.header.seed) problems.push(`two seeds: ${a.header.seed} and ${b.header.seed}`);
  if (a.header.seat === b.header.seat) problems.push(`both logs are seat ${a.header.seat}'s`);
  const ab = auditDirection(a, b);
  const ba = auditDirection(b, a);
  return { problems: [...problems, ...ab.problems, ...ba.problems], ab, ba };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [p0, p1] = process.argv.slice(2);
  if (!p0 || !p1) {
    console.error('usage: node tools/check-seat-pair.mjs <seat0 frames.jsonl> <seat1 frames.jsonl>');
    process.exit(2);
  }
  const a = readLog(p0);
  const b = readLog(p1);
  const r = auditPair(a, b);
  const line = (d, x) => `      seat ${d[0]} reading seat ${d[1]}: ${x.frames} frames; ${x.secret} name(s) of the other `
    + `seat's cards not in this seat's deck, ${x.never} never shown to it; ${x.secretFrames} (frame, secret name) pairs `
    + `scanned; ${x.known} name(s) of its own`;
  console.log(`${r.problems.length === 0 ? 'PASS' : 'FAIL'}  ${p0} + ${p1}`);
  console.log(line([a.header.seat, b.header.seat], r.ab));
  console.log(line([b.header.seat, a.header.seat], r.ba));
  for (const p of r.problems.slice(0, 40)) console.log(`      ! ${p}`);
  if (r.problems.length > 40) console.log(`      ! ... and ${r.problems.length - 40} more`);
  process.exit(r.problems.length === 0 ? 0 : 1);
}
