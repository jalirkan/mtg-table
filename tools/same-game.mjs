#!/usr/bin/env node
// mtg-table — tools/same-game.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// ARE TWO RECORDINGS THE SAME GAME?  Whichever seat each one was recorded from.
//
//   node tools/same-game.mjs var/spectate/a-vs-b-7.jsonl var/spectate/a-vs-b-7-seat1.jsonl
//
// Why this exists (spectating, docs/evidence/spectate.md section D).
// `scripts/spectate.sh --seat 1` records a seed from the other deck's side, and
// the claim worth making to a player is "the same seed is the same game, seen
// from the other chair".  `tools/fixture-multiset-diff.mjs` cannot say that:
// two viewpoints of one game differ BY DESIGN in every frame -- each seat's hand
// is full in its own log and a five-key stub in the other's (hard rule 8).  So
// this compares what both chairs can see, frame by frame, in order, and says
// how much it had to set aside as viewer-dependent:
//
//   hand cards        reduced to {id, zone, owner, controller} (a stub's keys)
//   library.cards     reduced to ids (what a continuous may-look static reveals
//                     is the viewer's)
//   a face-down card  reduced to {id, zone, owner, controller} (its face is the
//                     controller's alone, section 3.3)
//   engine strings    `text` on stack items and `cast` events: swept per viewer
//                     by Snap.sweepText, so one seat's copy may be "" where the
//                     other's names a card it may see (section 3.6 rule 1)
//   per-run stamps    t, gameId, and the handshake's viewer (you / seat / the
//                     viewing deck's path)
//
// and ONE canonicalisation that is not about viewpoint: the ids inside a
// `stats` event are compared as a SET.  Their order is a hash-set iteration
// inside Forge over identity-hashed objects and moves between runs of one seed
// for reasons that have nothing to do with the game (decision D121).
//
// Everything else -- phases, turns, priority, life, poison, counters, mana,
// every zone count, every public card with every field, the stack's sources and
// targets, combat, every event's kind and ids, the outcome -- must be EQUAL, and
// the first frame where it is not is printed.  Exit 0 = the same game, 1 = not,
// 2 = usage.  Two logs of the same seat compare the same way (nothing is set
// aside that both would not agree on), so this is also the right tool for "did
// pacing change the game?".

import { readFileSync } from 'node:fs';

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const quiet = process.argv.includes('--quiet');
if (files.length !== 2) {
  console.error('usage: node tools/same-game.mjs <a.jsonl> <b.jsonl> [--quiet]');
  process.exit(2);
}

const counts = { handCards: 0, libraryCards: 0, faceDown: 0, texts: 0, statsIds: 0 };

function read(path) {
  const lines = readFileSync(path, 'utf8').split('\n').filter((l) => l.trim() !== '');
  const header = JSON.parse(lines[0]);
  const frames = lines.slice(1).map((l) => JSON.parse(l)).filter((f) => f.dir !== 'c2s');
  return { header, frames };
}

const STUB = (c) => ({ id: c.id, zone: c.zone, owner: c.owner, controller: c.controller });

function card(c, zone) {
  if (zone === 'hand') {
    counts.handCards++;
    return STUB(c);
  }
  if (c.hidden === true) return STUB(c);
  if (c.faceDown === true) {
    // The face is the controller's; and in exile one chair may get a stub
    // where the other gets the card, so the stub's keys are all both share.
    counts.faceDown++;
    return STUB(c);
  }
  return c;
}

function state(body) {
  const players = [...body.players]
    .sort((a, b) => a.id - b.id)
    .map((p) => {
      const zones = {};
      for (const [name, z] of Object.entries(p.zones)) {
        if (name === 'library') {
          counts.libraryCards += (z.cards ?? []).length;
          zones.library = { count: z.count, cards: (z.cards ?? []).map((c) => c.id) };
          continue;
        }
        zones[name] = { count: z.count, cards: (z.cards ?? []).map((c) => card(c, name)) };
      }
      return { ...p, zones };
    });
  const stack = (body.stack ?? []).map((s) => {
    if (typeof s.text === 'string') counts.texts++;
    const { text: _text, ...rest } = s;
    return rest;
  });
  const events = (body.events ?? []).map((e) => {
    const out = { ...e };
    if (typeof out.text === 'string') {
      counts.texts++;
      delete out.text;
    }
    if (out.kind === 'stats' && Array.isArray(out.cardIds)) {
      counts.statsIds++;
      out.cardIds = [...out.cardIds].sort((x, y) => x - y);
    }
    return out;
  });
  const stackCards = (body.stackCards ?? []).map((c) => card(c, 'stack'));
  const { gameId: _gameId, ...rest } = body;
  return { ...rest, players, stack, stackCards, events };
}

function project(frame) {
  const out = { type: frame.type, dir: frame.dir ?? 's2c' };
  if (frame.type === 'state') out.body = state(frame.body);
  else if (frame.type === 'hello_ok') {
    const b = frame.body;
    out.body = {
      seed: b.seed,
      forgeVersion: b.forgeVersion,
      forgeJarSha256: b.forgeJarSha256,
      players: b.players,
      // The match as a table would describe it, by seat rather than by viewer.
      decks: b.match === undefined ? null : Object.fromEntries(
        b.players.map((p) => {
          const mine = p.id === b.you;
          const deck = mine ? b.match.yourDeck : b.match.aiDeck;
          return [p.id, { name: deck.name, cards: deck.cards,
            profile: mine ? (b.match.yourProfile ?? null) : b.match.aiProfile }];
        }),
      ),
    };
  } else out.body = frame.body;
  return out;
}

const a = read(files[0]);
const b = read(files[1]);
const problems = [];
if (a.header.seed !== b.header.seed) problems.push(`different seeds: ${a.header.seed} vs ${b.header.seed}`);
const cardsA = (a.header.decks ?? []).map((d) => [d.player, d.cards]);
const cardsB = (b.header.decks ?? []).map((d) => [d.player, d.cards]);
if (JSON.stringify(cardsA) !== JSON.stringify(cardsB)) {
  problems.push(`different deck sizes per seat: ${JSON.stringify(cardsA)} vs ${JSON.stringify(cardsB)}`);
}

// A recording made without `--match` says nothing about decks by name; that is
// a difference in what was WRITTEN, not in the game, so the names are compared
// only when both handshakes carry them.
const bothNamed = [a, b].every((log) => log.frames.some((f) => f.type === 'hello_ok' && f.body.match !== undefined));
const view = (frame) => {
  const p = project(frame);
  if (!bothNamed && p.type === 'hello_ok') p.body.decks = null;
  return p;
};
/*
 * Two readings, and the verdict is the second.
 *
 * FRAME BY FRAME: every projected frame equal, in order.  This is what two
 * recordings of one seed normally are.
 *
 * AS A GAME: the same EVENTS in the same order (every frame's events, joined),
 * the same state at every PHASE BOUNDARY (a `state` whose last event is a
 * `phase`, `turn` or `outcome` -- the frames RecordMatch's BoundaryFlusher
 * writes -- plus the last), the same handshake and the same `over`.
 * GameEventForwarder also flushes on a 500 ms wall clock (javap, 2.0.14), so on
 * a loaded machine one recording can cut a batch in two where the other did not:
 * an extra frame mid-phase, the same events, the same game.  Measured once in
 * 41 seed-42 re-recordings (docs/evidence/spectate.md, section D).
 * That is framing, not a different game, and the verdict says which it was.
 */
const n = Math.max(a.frames.length, b.frames.length);
let first = -1;
for (let i = 0; i < n; i++) {
  const x = a.frames[i] === undefined ? null : JSON.stringify(view(a.frames[i]));
  const y = b.frames[i] === undefined ? null : JSON.stringify(view(b.frames[i]));
  if (x !== y) {
    first = i;
    break;
  }
}

const BOUNDARY = new Set(['phase', 'turn', 'outcome']);
function asGame(log) {
  const projected = log.frames.map(view);
  const states = projected.filter((f) => f.type === 'state');
  const events = states.flatMap((f) => f.body.events);
  const boundaries = states
    .filter((f, i) => i === states.length - 1 || BOUNDARY.has(f.body.events.at(-1)?.kind))
    .map((f) => ({ ...f.body, events: null }));
  const others = projected.filter((f) => f.type !== 'state');
  return { events, boundaries, others };
}
const firstDiff = (xs, ys) => {
  for (let i = 0; i < Math.max(xs.length, ys.length); i++) {
    if (JSON.stringify(xs[i]) !== JSON.stringify(ys[i])) return i;
  }
  return -1;
};
// The frame-by-frame pass above projected every frame once already; count the
// set-aside values over the game pass alone.
for (const k of Object.keys(counts)) counts[k] = 0;
const ga = asGame(a);
const gb = asGame(b);
const eventDiff = firstDiff(ga.events, gb.events);
const boundaryDiff = firstDiff(ga.boundaries, gb.boundaries);
const otherDiff = firstDiff(ga.others, gb.others);
const sameGame = eventDiff < 0 && boundaryDiff < 0 && otherDiff < 0;

const seatOf = (h) => `seat ${h.seat}`;
console.log(`same-game: ${files[0]} (${seatOf(a.header)}, ${a.frames.length} frames)`);
console.log(`       vs  ${files[1]} (${seatOf(b.header)}, ${b.frames.length} frames)`);
if (!sameGame) {
  if (otherDiff >= 0) problems.push(`the handshake or the outcome differs: ${JSON.stringify(ga.others[otherDiff])?.slice(0, 160)} vs ${JSON.stringify(gb.others[otherDiff])?.slice(0, 160)}`);
  if (eventDiff >= 0) {
    problems.push(`event ${eventDiff + 1} of ${ga.events.length} differs: ${JSON.stringify(ga.events[eventDiff])?.slice(0, 120)} vs ` +
      `${JSON.stringify(gb.events[eventDiff])?.slice(0, 120)}`);
  }
  if (boundaryDiff >= 0) {
    const x = ga.boundaries[boundaryDiff];
    const y = gb.boundaries[boundaryDiff];
    problems.push(`phase boundary ${boundaryDiff + 1} of ${ga.boundaries.length} differs: turn ${x?.turn ?? '-'} ${x?.phase ?? ''} vs turn ${y?.turn ?? '-'} ${y?.phase ?? ''}`);
  }
}
if (!sameGame && first >= 0) {
  const fa = a.frames[first];
  const fb = b.frames[first];
  problems.push(`first divergence at frame ${first + 1}: ` +
    `${fa === undefined ? '(none)' : `${fa.type} turn ${fa.body?.turn ?? '-'} ${fa.body?.phase ?? ''}`} vs ` +
    `${fb === undefined ? '(none)' : `${fb.type} turn ${fb.body?.turn ?? '-'} ${fb.body?.phase ?? ''}`}`);
  if (!quiet && fa !== undefined && fb !== undefined) {
    const pa = view(fa);
    const pb = view(fb);
    const paths = [];
    const walk = (x, y, p) => {
      if (JSON.stringify(x) === JSON.stringify(y) || paths.length >= 8) return;
      if (typeof x !== 'object' || x === null || typeof y !== 'object' || y === null) {
        paths.push(`${p}: ${JSON.stringify(x)?.slice(0, 80)} vs ${JSON.stringify(y)?.slice(0, 80)}`);
        return;
      }
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], `${p}.${k}`);
    };
    walk(pa, pb, 'frame');
    for (const p of paths) problems.push(`    ${p}`);
  }
}

console.log(`  set aside as viewer-dependent: ${counts.handCards} hand card(s), ${counts.libraryCards} ` +
  `revealed library card(s), ${counts.faceDown} face-down face(s), ${counts.texts} engine string(s); ` +
  `${counts.statsIds} stats event(s) compared as id sets`);
if (problems.length > 0) {
  for (const p of problems) console.log(`  ! ${p}`);
  console.log('NOT THE SAME GAME');
  process.exit(1);
}
const over = a.frames.at(-1);
console.log(`  ${ga.events.length} events and ${ga.boundaries.length} phase-boundary states equal` +
  (over?.type === 'over' ? `; outcome ${JSON.stringify(over.body)}` : ''));
console.log(first < 0
  ? `  framing: identical -- every one of the ${n} frames equal`
  : `  framing: DIFFERENT from frame ${first + 1} (${a.frames.length} vs ${b.frames.length} frames) -- the same events ` +
    'batched differently, which is GameEventForwarder\'s 500 ms flush clock under load, not the game');
console.log('SAME GAME');
