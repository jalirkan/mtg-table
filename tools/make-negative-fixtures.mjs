#!/usr/bin/env node
/*
 * mtg-table -- tools/make-negative-fixtures.mjs
 * Copyright (C) 2026 mtg-table contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Generates fixtures/negative/redaction/: a NEGATIVE CONTROL CORPUS for
 * tools/check-redaction.mjs.  Every file here is a short, otherwise-valid slice
 * of a real recording with EXACTLY ONE defect injected, and every one of them
 * must make the checker fail (or, for the two marked `warn`, must make it say
 * something out loud while still passing).
 *
 * WHY.  check-redaction.mjs is the thing standing between an emitter regression
 * and a hidden-information leak in a committed file, and for one afternoon it
 * silently downgraded the ABSENCE of every field the 2026-09-11 amendments added
 * to a per-file WARN.  Five one-defect probes against fixtures/games/g1.jsonl --
 * delete `owner` from a stub, delete `token`, delete `alt`, delete
 * `library.cards`, revive an eleven-key `faceDownHidden` object -- all PASSED.
 * A checker nobody tests is a checker nobody can rely on, so its own regressions
 * now have a corpus of their own.
 *
 *   node tools/make-negative-fixtures.mjs [source.jsonl]   # regenerate
 *   node tools/check-redaction-selftest.mjs                # assert they fail
 *
 * Regenerate whenever the card shape changes: the baseline is a REAL slice of a
 * real recording, so it must keep passing the current checker, and the
 * self-test's first assertion is exactly that.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const SOURCE = process.argv[2] ?? 'fixtures/games/g1.jsonl';
const OUT_DIR = 'fixtures/negative/redaction';
/** How many `state` frames the slice keeps. Three is enough for every probe. */
const STATE_FRAMES = 3;

const lines = readFileSync(SOURCE, 'utf8').split('\n').filter((l) => l.length > 0);
const header = JSON.parse(lines[0]);
const frames = lines.slice(1).map((l) => JSON.parse(l));

const helloOk = frames.find((f) => f.type === 'hello_ok');
const over = frames.find((f) => f.type === 'over');
const allStates = frames.filter((f) => f.type === 'state');

// Not the FIRST three states: an opening hand has no battlefield, and half the
// probes need a full card in play to break. Take the first window in which the
// viewing seat has permanents AND the opponent still holds a concealed hand --
// i.e. a frame that looks like a game rather than like a mulligan.
const seat = JSON.parse(lines[0]).seat;
const playable = (f) => {
  const me = f.body.players.find((p) => p.id === seat);
  const them = f.body.players.find((p) => p.id !== seat);
  return me !== undefined && them !== undefined &&
    me.zones.battlefield.cards.length >= 2 &&
    them.zones.hand.cards.some((c) => c.hidden === true);
};
const start = allStates.findIndex(playable);
const states = start < 0 ? [] : allStates.slice(start, start + STATE_FRAMES);
if (helloOk === undefined || states.length < STATE_FRAMES || over === undefined) {
  throw new Error(`${SOURCE} does not contain a hello_ok, ${STATE_FRAMES} usable states and an over`);
}

/** A deep copy of the slice, with s2c seq renumbered so the envelope is valid. */
function slice() {
  const out = [helloOk, ...states, over].map((f) => structuredClone(f));
  out.forEach((f, i) => { f.seq = i + 1; });
  return out;
}

const write = (name, framesOut) => {
  const text = [header, ...framesOut].map((f) => JSON.stringify(f)).join('\n') + '\n';
  writeFileSync(`${OUT_DIR}/${name}`, text, 'utf8');
  return text.length;
};

// ---------------------------------------------------------------------------
// Finding things to break.  Each helper returns the FIRST match in the slice, so
// every probe injects exactly one defect into exactly one frame.
// ---------------------------------------------------------------------------

/** Every (player, zoneName, card) in one state body, library included. */
function* cardsOf(body) {
  for (const p of body.players) {
    for (const [zname, z] of Object.entries(p.zones)) {
      for (const c of (z.cards ?? [])) yield { player: p, zname, card: c, zone: z };
    }
  }
}

const isViewerSeat = (p) => p.id === header.seat;
const statesOf = (fs) => fs.filter((f) => f.type === 'state');
const firstStub = (fs) => {
  for (const f of statesOf(fs)) {
    for (const hit of cardsOf(f.body)) if (hit.card.hidden === true) return hit;
  }
  throw new Error('no redacted stub in the slice');
};
const firstFull = (fs) => {
  for (const f of statesOf(fs)) {
    for (const hit of cardsOf(f.body)) {
      if (hit.card.hidden !== true && hit.zname === 'battlefield') return hit;
    }
  }
  throw new Error('no full battlefield card in the slice');
};
const firstViewerNamed = (fs) => {
  for (const f of statesOf(fs)) {
    for (const hit of cardsOf(f.body)) {
      if (isViewerSeat(hit.player) && typeof hit.card.name === 'string' && hit.card.name !== '') {
        return hit;
      }
    }
  }
  throw new Error('no named viewer card in the slice');
};

// ---------------------------------------------------------------------------
// The probes.
// ---------------------------------------------------------------------------

const manifest = [];
const probe = (name, why, expect, mutate, level = 'fail') => {
  const fs = slice();
  mutate(fs);
  const bytes = write(name, fs);
  manifest.push({ file: name, level, expect, why });
  console.log(`  ${level === 'fail' ? 'FAIL' : 'WARN'}  ${name}  (${bytes} bytes)  ${why}`);
};

mkdirSync(OUT_DIR, { recursive: true });
console.log(`slicing ${SOURCE}: 1 header + hello_ok + ${STATE_FRAMES} states + over`);

// The control: no defect at all. If THIS stops passing, every probe below is
// failing for the wrong reason and the corpus needs regenerating.
write('baseline.jsonl', slice());
manifest.push({
  file: 'baseline.jsonl', level: 'pass', expect: 'PASS',
  why: 'an unmodified slice of a real recording -- the control for every probe below',
});
console.log('  PASS  baseline.jsonl  (no defect)');

probe('p1-stub-without-owner.jsonl',
  'amendment P1: the redacted stub is five keys, and `owner` is the fifth',
  'is missing "owner"',
  (fs) => { delete firstStub(fs).card.owner; });

probe('p15-card-without-token.jsonl',
  'amendment P15: every full card carries `token` (CardView.isToken)',
  'is missing "token"',
  (fs) => { delete firstFull(fs).card.token; });

probe('p3-card-without-alt.jsonl',
  'amendment P3: every full card carries `alt`, `null` unless the seat may flip it',
  'is missing "alt"',
  (fs) => { delete firstFull(fs).card.alt; });

probe('p2-library-without-cards.jsonl',
  'amendment P2: a library is {count, cards}, not a bare count',
  'has no "cards" array',
  (fs) => {
    for (const f of fs) {
      if (f.type !== 'state') continue;
      delete f.body.players[0].zones.library.cards;
    }
  });

probe('p3-facedownhidden-revived.jsonl',
  'amendment P3 retired the eleven-key faceDownHidden object; no emitter writes one',
  'faceDownHidden',
  (fs) => {
    const hit = firstFull(fs);
    const { id, zone, controller } = hit.card;
    const revived = {
      id, zone, controller, faceDownHidden: true,
      tapped: false, attacking: false, blocking: false,
      damage: 0, counters: {}, power: '2', toughness: '2',
    };
    const list = hit.zone.cards;
    list[list.indexOf(hit.card)] = revived;
  });

probe('a1-stub-with-a-name.jsonl',
  'A1: a sixth key on a stub is a leak, and a name is the worst one',
  'leaks extra keys: name',
  (fs) => { firstStub(fs).card.name = 'Agent Phil Coulson'; });

probe('a6-opponent-hand-named.jsonl',
  'A4/A6: a full named card in the opponent hand, for an id nothing ever revealed',
  'carries a name',
  (fs) => {
    for (const f of fs) {
      if (f.type !== 'state') continue;
      const opponent = f.body.players.find((p) => !isViewerSeat(p));
      const stub = opponent.zones.hand.cards.find((c) => c.hidden === true);
      if (stub === undefined) continue;
      const donor = structuredClone(firstViewerNamed(fs).card);
      Object.assign(donor, { id: stub.id, zone: 'hand', controller: opponent.id, owner: opponent.id });
      opponent.zones.hand.cards[opponent.zones.hand.cards.indexOf(stub)] = donor;
      return;
    }
    throw new Error('no opponent hand stub in the slice');
  });

// A3 / finding 5: legitimately reachable (Opposition Agent, Bribery), so it is
// a WARNING rather than a failure -- but it must not be SILENT, and the ids in
// it must not buy a permanent name-before-reveal exemption.
probe('a3-opponent-library-revealed.jsonl',
  'A3: an opponent library dumped as full cards -- legal but the largest surface there is',
  'NOT the viewing seat',
  (fs) => {
    for (const f of fs) {
      if (f.type !== 'state') continue;
      const opponent = f.body.players.find((p) => !isViewerSeat(p));
      const donor = structuredClone(firstViewerNamed(fs).card);
      Object.assign(donor, { id: 90001, zone: 'library', controller: opponent.id, owner: opponent.id });
      opponent.zones.library.cards = [donor];
      return;
    }
  },
  'warn');

// The other half of finding 5: an opponent-library reveal is TRANSIENT (the
// search ends), so it must not confer a permanent name-before-reveal exemption.
// Before the fix, adding an id to the opponent's library.cards whitelisted it in
// `everRevealed` for the whole log, and the same card could then appear NAMED in
// their hand with no complaint at all.
probe('a6-library-reveal-is-not-a-whitelist.jsonl',
  'A6: an opponent-library reveal must not excuse the same id later in their HAND',
  'nothing earlier in this log',
  (fs) => {
    const sts = statesOf(fs);
    const donor = structuredClone(firstViewerNamed(fs).card);
    const opponentOf = (f) => f.body.players.find((p) => !isViewerSeat(p));
    const them0 = opponentOf(sts[0]);
    Object.assign(donor, { id: 90002, controller: them0.id, owner: them0.id });
    them0.zones.library.cards = [{ ...donor, zone: 'library' }];
    // ... and now the same id, named, in their hand two frames later.
    const them2 = opponentOf(sts[2]);
    const stub = them2.zones.hand.cards.find((c) => c.hidden === true);
    if (stub === undefined) throw new Error('no opponent hand stub in the last slice frame');
    them2.zones.hand.cards[them2.zones.hand.cards.indexOf(stub)] =
      { ...donor, zone: 'hand' };
  });

writeFileSync(`${OUT_DIR}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`wrote ${manifest.length} files + manifest.json to ${OUT_DIR}/`);
