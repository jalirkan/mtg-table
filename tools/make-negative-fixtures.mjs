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

const write = (name, framesOut, headerOut = header) => {
  const text = [headerOut, ...framesOut].map((f) => JSON.stringify(f)).join('\n') + '\n';
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

// A3 / finding 5. Legitimately reachable (Opposition Agent, Bribery, Gonti),
// and it used to be a WARNING for exactly that reason -- which meant the single
// largest hidden-information surface in the game was guarded by a line of text
// in a 1,200-line script's output. It now FAILS by default, and a recording
// that really does open an opponent's library declares that with
// `--opponent-library-ok` (2026-09-11, M1 follow-up 1). The selftest asserts
// both halves: rejected by default, a WARN under the flag.
probe('a3-opponent-library-revealed.jsonl',
  'A3: an opponent library dumped as full cards -- reachable, but it must be declared',
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
  });

// D315 (the cube lab's follow-up 1): Courser of Kruphix and its kind make the
// top card of their controller's library PUBLIC, so the opponent's
// library.cards may carry that one card while one is on their battlefield --
// and not two cards, and not without the permanent (the probe above).
const withRevealer = (fs, n, name = 'Courser of Kruphix') => {
  for (const f of fs) {
    if (f.type !== 'state') continue;
    const opponent = f.body.players.find((p) => !isViewerSeat(p));
    const proto = structuredClone(firstFull(fs).card);
    Object.assign(proto, { id: 90010, name, controller: opponent.id, owner: opponent.id, zone: 'battlefield',
      faceDown: false, alt: null, attachedToId: null, attachmentIds: [] });
    opponent.zones.battlefield.cards.push(proto);
    opponent.zones.battlefield.count = opponent.zones.battlefield.cards.length;
    opponent.zones.library.cards = [];
    for (let i = 0; i < n; i++) {
      const donor = structuredClone(firstViewerNamed(fs).card);
      Object.assign(donor, { id: 90011 + i, zone: 'library', controller: opponent.id, owner: opponent.id });
      opponent.zones.library.cards.push(donor);
    }
    return;
  }
};
{
  const fs = slice();
  withRevealer(fs, 1);
  write('a3-revealed-top-under-courser.jsonl', fs);
  manifest.push({
    file: 'a3-revealed-top-under-courser.jsonl', level: 'pass', expect: 'PASS',
    why: 'A3, D315: the opponent controls Courser of Kruphix, so their library\'s top card is public -- one ' +
      'card in their library.cards is not a leak (the control for the two probes below)',
  });
  console.log('  PASS  a3-revealed-top-under-courser.jsonl  (a revealed top card, no defect)');
}
probe('a3-revealed-top-two-cards.jsonl',
  'A3, D315: Courser reveals ONE card; a second card of the opponent\'s library is a leak',
  'NOT the viewing seat',
  (fs) => withRevealer(fs, 2));
probe('a3-revealed-top-look-is-private.jsonl',
  'A3, D315: Experimental Frenzy says "you may look" -- private, even though Forge scripts it MayLookAt$ Player',
  'NOT the viewing seat',
  (fs) => withRevealer(fs, 1, 'Experimental Frenzy'));

// D371 (the lab's night-2 A9 finding): who may see a face-down card's face.
// Forge's canFaceDownBeShownTo is mayPlayerLook(viewer) first, then "in play
// and you control it".  Gonti, Lord of Luxury and Thief of Sanity exile an
// OPPONENT's card face down and let their controller look at it, so that card
// carries an alt in the Gonti player's log -- legitimately.  The control: the
// dig, while the viewer's trigger resolves, alt from the first frame on.  The
// probes: the same alt with no dig, with the opponent's trigger, appearing
// after the dig, and the in-play rule (an opponent's morph; a stolen morph,
// whose OWNER does not see its face).
const ELVES = { name: 'Llanowar Elves', manaCost: '{G}', types: 'Creature - Elf Druid', power: '1', toughness: '1' };
const faceDownCard = (fs, id, zone, owner, controller, alt) => {
  const c = structuredClone(firstFull(fs).card);
  const inPlay = zone === 'battlefield';
  Object.assign(c, {
    id, name: '', setCode: '???', manaCost: null, types: inPlay ? 'Creature' : '',
    power: inPlay ? '2' : null, toughness: inPlay ? '2' : null, loyalty: null,
    damage: 0, counters: {}, tapped: false, sick: false, attacking: false, blocking: false,
    faceDown: true, token: false, alt: alt ? { ...ELVES } : null,
    attachedToId: null, attachmentIds: [], controller, owner, zone, abilities: [],
  });
  if ('keywords' in c) c.keywords = [];
  return c;
};
const putCard = (player, zone, card) => {
  player.zones[zone].cards.push(card);
  player.zones[zone].count = player.zones[zone].cards.length;
};
/** Frame 0: a stack item (the viewer's or the opponent's); frame 1: the dig; frames 1-2: the card in exile. */
const withGontiExile = (fs, { stackBy = 'viewer', dig = true, altFrom = 1 } = {}) => {
  const sts = statesOf(fs);
  const viewerOf = (f) => f.body.players.find((p) => isViewerSeat(p));
  const opponentOf = (f) => f.body.players.find((p) => !isViewerSeat(p));
  if (stackBy !== null) {
    const me = viewerOf(sts[0]);
    const source = me.zones.battlefield.cards.find((c) => c.hidden !== true);
    sts[0].body.stack.push({
      id: 90031, sourceCardId: source.id,
      controller: stackBy === 'viewer' ? me.id : opponentOf(sts[0]).id,
      text: 'When Gonti, Lord of Luxury enters, look at the top four cards of target opponent\'s library, ' +
        'exile one of them face down, then put the rest on the bottom of that library in a random order.',
      targetCardIds: [], targetPlayerIds: [opponentOf(sts[0]).id],
    });
  }
  const them = opponentOf(sts[1]).id;
  if (dig) {
    sts[1].body.events.push({ kind: 'zone', cardId: 90030,
      from: { zone: 'library', player: them }, to: { zone: 'exile', player: them } });
  }
  for (let i = 1; i < sts.length; i++) {
    putCard(opponentOf(sts[i]), 'exile', faceDownCard(fs, 90030, 'exile', them, them, i >= altFrom));
  }
};
{
  const fs = slice();
  withGontiExile(fs);
  write('a9-look-permission-under-gonti.jsonl', fs);
  manifest.push({
    file: 'a9-look-permission-under-gonti.jsonl', level: 'pass', expect: 'PASS',
    why: 'A9, D371: the viewer\'s Gonti exiled the opponent\'s top card face down and may look at it -- ' +
      'an alt on an opponent-owned card in exile, dug from a library while the viewer\'s trigger resolved ' +
      '(the control for the a9 probes below)',
  });
  console.log('  PASS  a9-look-permission-under-gonti.jsonl  (a look permission, no defect)');
}
probe('a9-exiled-face-down-named-without-a-dig.jsonl',
  'A9, D371: an opponent\'s face-down card in exile with an alt, and no dig from a library behind it',
  'only a look permission',
  (fs) => withGontiExile(fs, { dig: false }));
probe('a9-dig-by-the-opponent.jsonl',
  'A9, D371: the dig was the OPPONENT\'s effect -- their look permission is not the viewer\'s',
  'only a look permission',
  (fs) => withGontiExile(fs, { stackBy: 'opponent' }));
probe('a9-alt-appears-after-the-dig.jsonl',
  'A9, D371: a look permission comes with the dig; an alt that appears a frame later has no source',
  'only a look permission',
  (fs) => withGontiExile(fs, { altFrom: 2 }));
probe('a9-opponent-morph-named.jsonl',
  'A9: the opponent\'s face-down permanent carries its face -- the leak canFaceDownBeShownTo exists for',
  'not the viewing seat',
  (fs) => {
    const st = statesOf(fs)[1];
    const them = st.body.players.find((p) => !isViewerSeat(p));
    putCard(them, 'battlefield', faceDownCard(fs, 90032, 'battlefield', them.id, them.id, true));
  });
probe('a9-stolen-morph-named-for-its-owner.jsonl',
  'A9, D371: in play a face-down card\'s face is its CONTROLLER\'s -- the owner of a stolen morph does not see it',
  'not the viewing seat',
  (fs) => {
    const st = statesOf(fs)[1];
    const me = st.body.players.find((p) => isViewerSeat(p));
    const them = st.body.players.find((p) => !isViewerSeat(p));
    putCard(them, 'battlefield', faceDownCard(fs, 90033, 'battlefield', me.id, them.id, true));
  });

// The other night-2 finding (D371): the viewer's own hand card as a stub.  It
// must fail, and the message must say which shape it was -- the clue to the cause.
probe('own-hand-card-redacted.jsonl',
  'the viewer\'s own hand card served as a redacted stub: over-redaction, and the checker names the stub\'s controller',
  'has no name -- redaction is too aggressive (it is a redacted stub',
  (fs) => {
    for (const f of statesOf(fs)) {
      const me = f.body.players.find((p) => isViewerSeat(p));
      const them = f.body.players.find((p) => !isViewerSeat(p));
      const i = me.zones.hand.cards.findIndex((c) => c.hidden !== true);
      if (i < 0) continue;
      const c = me.zones.hand.cards[i];
      me.zones.hand.cards[i] = { id: c.id, zone: 'hand', owner: me.id, controller: them.id, hidden: true };
      return;
    }
    throw new Error('no named card in the viewer\'s hand');
  });

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

// ---------------------------------------------------------------------------
// The M2 frame types.  g1 is an AI-vs-AI recording and carries no `notice` and
// no `ask` at all (section 8.4), so these three probes INJECT one frame rather
// than mutating one -- the only kind of defect this corpus cannot express by
// editing what is already there.  They are still one defect each, in an
// otherwise real slice, and each is a rule that had no test until M2 shipped
// the emitter that can break it.
// ---------------------------------------------------------------------------

/** Splice a frame in just before `over`, then renumber the s2c sequence. */
function inject(fs, frame) {
  const at = fs.findIndex((f) => f.type === 'over');
  fs.splice(at < 0 ? fs.length : at, 0, frame);
  let seq = 0;
  for (const f of fs) {
    if (f.dir !== 'c2s') f.seq = ++seq;
  }
}

probe('notice-names-a-concealed-card.jsonl',
  'section 6: both notice strings go through Snap.sweepText, so an id here is OUR gate failing',
  'notice.title names card',
  (fs) => {
    // Exactly the leak measured in five recordings: Forge's
    // PlayerControllerHuman.notifyOfValue passes
    // CardView.get(sa.getHostCard()).toString() -- `name (id)` -- as the title,
    // for a card the same frame conceals.
    const stub = firstStub(fs).card;
    inject(fs, {
      v: 1, seq: 0, t: over.t - 1, dir: 's2c', type: 'notice',
      body: { level: 'info', title: `Thriving Isle (${stub.id})`, text: 'Forge AI picked White' },
    });
  });

probe('ask-text-initial-null.jsonl',
  'section 5.2: `text.initial` is a string, "" when Forge has none -- never null',
  'ask.text.initial',
  (fs) => {
    inject(fs, {
      v: 1, seq: 0, t: over.t - 1, dir: 's2c', type: 'ask',
      body: {
        askId: 'n1', kind: 'text', timeoutMs: 120000,
        prompt: 'Name a card', title: 'Choose a card name',
        initial: null, suggestions: [], numeric: false,
      },
    });
  });

probe('ask-ability-menu-cardid-null.jsonl',
  'section 5.2: `ability_menu.cardId` is a number -- with no host there is no ask to send',
  'ask.ability_menu.cardId',
  (fs) => {
    inject(fs, {
      v: 1, seq: 0, t: over.t - 1, dir: 's2c', type: 'ask',
      body: {
        askId: 'n2', kind: 'ability_menu', timeoutMs: 120000,
        cardId: null,
        options: [{ id: 0, label: 'Equip {1}', kind: 'ability', abilityId: 7, canPlay: true, isSpell: false }],
      },
    });
  });

/*
 * The two probes that guard 2026-09-12's ONE-FRAME LOOKAHEAD.
 *
 * `WireGuiGame.ask()` flushes a `state` BEFORE it emits the ask (report 06 W4:
 * that is the snapshot in which a temporarily revealed card is visible), so a
 * legitimate hand-reveal shows the card one frame before the ask that justifies
 * it. check-redaction.mjs therefore lets an `ask` justify the `state`
 * IMMEDIATELY before it, and treats a `choose_list` with `reveal: true` as its
 * own delayed reveal. Both relaxations are exactly one step wide, and these two
 * probes are what keep them that way: move the ask one frame further, or turn
 * the flag off, and the checker must still fail.
 */
const revealProbe = (name, why, expect, mutate) =>
  probe(name, why, expect, (fs) => {
    // Name an opponent hand card in the LAST state of the slice, exactly the way
    // a6-opponent-hand-named.jsonl does, and remember which id.
    const states = fs.filter((f) => f.type === 'state');
    const last = states[states.length - 1];
    const opponent = last.body.players.find((p) => !isViewerSeat(p));
    const stub = opponent.zones.hand.cards.find((c) => c.hidden === true);
    if (stub === undefined) throw new Error('no opponent hand stub in the last state');
    const donor = structuredClone(firstViewerNamed(fs).card);
    Object.assign(donor, { id: stub.id, zone: 'hand', controller: opponent.id, owner: opponent.id });
    opponent.zones.hand.cards[opponent.zones.hand.cards.indexOf(stub)] = donor;
    mutate(fs, structuredClone(donor));
  });

revealProbe('a6-reveal-ask-one-frame-too-late.jsonl',
  'the lookahead is ONE frame: a reveal ask two frames after the state does not justify it',
  'carries a name',
  (fs, card) => {
    // The ask that WOULD justify it -- but a `notice` is emitted in between, so
    // it is no longer the frame this snapshot was flushed for.
    inject(fs, {
      v: 1, seq: 0, t: over.t - 2, dir: 's2c', type: 'notice',
      body: { level: 'info', title: 'spacer', text: 'one frame of distance' },
    });
    inject(fs, {
      v: 1, seq: 0, t: over.t - 1, dir: 's2c', type: 'ask',
      body: {
        askId: 'n3', kind: 'choose_list', timeoutMs: 0,
        prompt: "Looking at cards in the opponent's hand",
        options: [{ id: 0, label: card.name, kind: 'card', cardId: card.id, card }],
        preselected: [], min: -1, max: -1, reveal: true,
      },
    });
  });

revealProbe('p12-choose-list-reveals-without-the-flag.jsonl',
  'P12: only `reveal: true` (or a delayedReveal) lets a list-shaped ask carry an opponent hand card',
  'an option list may only show what the effect reveals',
  (fs, card) => {
    inject(fs, {
      v: 1, seq: 0, t: over.t - 1, dir: 's2c', type: 'ask',
      body: {
        askId: 'n4', kind: 'choose_list', timeoutMs: 0,
        prompt: 'Choose a card',
        options: [{ id: 0, label: card.name, kind: 'card', cardId: card.id, card }],
        preselected: [], min: 1, max: 1, reveal: false,
      },
    });
  });

/*
 * The second signature on that same relaxation (M6 verification finding 8).
 * `reveal` is a flag the EMITTER writes, and `reveal: true` switches P12's
 * option-card audit off for the ask that carries it -- an argument made for
 * `choose_list` alone, because `reveal` is only ever `getChoices(min < 0)`,
 * Forge's own `AbstractGuiGame.reveal` channel. This probe is the flag having
 * spread: a `manipulate_list` that claims to be a reveal. The exact-key-set
 * check would also catch this one, and that is the point of having both -- the
 * key set is a table somebody can edit, and this check is not.
 */
probe('a7-reveal-flag-on-the-wrong-ask-kind.jsonl',
  'amendment A7: `reveal: true` is Forge\'s getChoices(min < 0) channel and is a `choose_list` only',
  'ask.reveal is true on kind',
  (fs) => {
    inject(fs, {
      v: 1, seq: 0, t: over.t - 1, dir: 's2c', type: 'ask',
      body: {
        askId: 'n5', kind: 'manipulate_list', timeoutMs: 0,
        prompt: 'Reorder these', cards: [], manipulable: [],
        toTop: true, toBottom: false, toAnywhere: false,
        reveal: true,
      },
    });
  });

/*
 * Amendment M44 -- `hello_ok.match`, the first frame the client reads, names
 * each seat's deck.  The AI's is `{name, cards}` and NOTHING else: a `path`, a
 * hash or a list there hands the player the opponent's decklist before a card
 * is drawn -- protocol section 8.1's reason for nulling the session header's
 * entry for that seat, arriving by a second channel (hard rule 8).  The audit is
 * optional-when-absent (the whole committed corpus predates it), so a probe has
 * to ADD the block before it can break it -- and the first file below is the
 * block as the bridge writes it, the control that proves the three probes fail
 * for the reason chosen rather than for carrying a `match` at all.
 *
 * The values are the session header's own (the source is g1, whose header has
 * the viewing seat on decks/pacho-shield.dck and the other seat's path nulled),
 * so the cross-checks against the header pass in the control.
 */
const matchBlock = () => {
  const mine = header.decks.find((d) => d.player === header.seat);
  const theirs = header.decks.find((d) => d.player !== header.seat);
  if (mine === undefined || theirs === undefined || typeof mine.path !== 'string') {
    throw new Error(`${SOURCE}'s session header has no viewing-seat deck path to build hello_ok.match from`);
  }
  return {
    yourDeck: { name: 'Pacho SHIELD (Marvel Super Heroes)', path: mine.path, cards: mine.cards },
    aiDeck: { name: 'Doom Legion (Marvel Super Heroes villains)', cards: theirs.cards },
    aiProfile: 'Reckless',
    games: 1,
  };
};
const withMatch = (fs, edit) => {
  const hello = fs.find((f) => f.type === 'hello_ok');
  const m = matchBlock();
  edit(m);
  hello.body.match = m;
};

{
  const fs = slice();
  withMatch(fs, () => {});
  write('m44-match-present.jsonl', fs);
  manifest.push({
    file: 'm44-match-present.jsonl', level: 'pass', expect: 'PASS',
    why: 'amendment M44: the baseline plus a hello_ok.match exactly as the bridge writes it -- ' +
      'the control for the three m44 probes below',
  });
  console.log('  PASS  m44-match-present.jsonl  (a well-formed hello_ok.match, no defect)');
}

probe('m44-aideck-carries-path.jsonl',
  'amendment M44: the AI\'s deck is its NAME and card COUNT; a path identifies the opponent\'s decklist',
  'aiDeck carries "path"',
  (fs) => withMatch(fs, (m) => { m.aiDeck.path = 'decks/doom-legion.dck'; }));

probe('m44-aideck-cards-is-a-list.jsonl',
  'amendment M44: aiDeck.cards is a COUNT; a list of names there is the opponent\'s decklist on the wire',
  'aiDeck.cards must be an integer',
  (fs) => withMatch(fs, (m) => {
    m.aiDeck.cards = ['Doctor Doom', 'Kang the Conqueror', 'Loki, God of Mischief'];
  }));

probe('m44-yourdeck-path-mismatch.jsonl',
  'amendment M44: hello_ok.match and the session header are written from the same Deck objects; ' +
    'a different yourDeck.path means one of them describes a different match',
  'but the session header says',
  (fs) => withMatch(fs, (m) => { m.yourDeck.path = 'decks/other.dck'; }));

/*
 * Amendment M47 -- a spectated recording (`mtgtable.RecordMatch --match
 * --pace`, `scripts/spectate.sh`).  `hello_ok.match` gains ONE key, the viewing
 * seat's own profile, which is only ever true of an AI viewer; and the session
 * header gains an optional `paceMs`.  The control is both, exactly as the
 * recorder writes them over an AI-vs-AI slice (g1's two seats are AIs).
 */
const pacedHeader = (paceMs) => ({ ...structuredClone(header), paceMs });
{
  const fs = slice();
  withMatch(fs, (m) => { m.yourProfile = 'Default'; });
  write('m47-spectated-present.jsonl', fs, pacedHeader(600));
  manifest.push({
    file: 'm47-spectated-present.jsonl', level: 'pass', expect: 'PASS',
    why: 'amendment M47: the baseline plus hello_ok.match.yourProfile on an AI viewer and a paced ' +
      'session header, exactly as RecordMatch --match --pace writes them -- the control for the m47 probes',
  });
  console.log('  PASS  m47-spectated-present.jsonl  (a well-formed spectated recording, no defect)');
}

probe('m47-yourprofile-on-a-human-seat.jsonl',
  'amendment M47: yourProfile is a fact about an AI seat; on a viewer players[] marks human it describes a ' +
    'different match',
  'does not mark the viewing seat',
  (fs) => {
    withMatch(fs, (m) => { m.yourProfile = 'Default'; });
    const hello = fs.find((f) => f.type === 'hello_ok');
    const me = hello.body.players.find((p) => p.id === hello.body.you);
    me.isAi = false;
  });

probe('m47-yourprofile-is-a-path.jsonl',
  'amendment M47: yourProfile is the base name of a .ai file, never a path',
  'yourProfile must be a Forge AI profile name',
  (fs) => withMatch(fs, (m) => { m.yourProfile = 'forge-home/res/ai/Default.ai'; }));

/*
 * Amendment M56 -- `hello_ok.match.aiPolicy`, who answers for the AI seat
 * (MtgTable --ai-policy: plain | outlets | search).  Optional, so the control
 * adds it as the bridge writes it; the probe puts a knob string there, the
 * shape a flag smuggled through the launcher would take.
 */
{
  const fs = slice();
  withMatch(fs, (m) => { m.aiPolicy = 'search'; });
  write('m56-aipolicy-present.jsonl', fs);
  manifest.push({
    file: 'm56-aipolicy-present.jsonl', level: 'pass', expect: 'PASS',
    why: 'amendment M56: the baseline plus hello_ok.match.aiPolicy exactly as MtgTable writes it -- ' +
      'the control for the m56 probe',
  });
  console.log('  PASS  m56-aipolicy-present.jsonl  (a well-formed hello_ok.match.aiPolicy, no defect)');
}

probe('m56-aipolicy-not-a-policy.jsonl',
  'amendment M56: aiPolicy is one word of plain, outlets, search -- never a knob string or a path',
  'aiPolicy must be one of plain, outlets, search',
  (fs) => withMatch(fs, (m) => { m.aiPolicy = 'search ms=3000'; }));

{
  const name = 'm47-pace-not-a-number.jsonl';
  const fs = slice();
  const bytes = write(name, fs, pacedHeader('fast'));
  const why = 'amendment M47: the session header\'s paceMs is a positive integer of milliseconds';
  manifest.push({ file: name, level: 'fail', expect: '"paceMs" must be a positive integer', why });
  console.log(`  FAIL  ${name}  (${bytes} bytes)  ${why}`);
}

/*
 * Amendment M49 -- the status layer's `keywords` on every full card.  The whole
 * committed corpus predates it, so, like M44's block, a probe has to ADD the key
 * before it can break it: `withKeywords` writes it exactly as `Snap.card` does --
 * after `loyalty`, `[]` on a face-down card and on every card with no keyword,
 * and two constants on the first full battlefield card (a fiction: g1 has no
 * keyword on the wire at all) -- on EVERY full card of every frame, so the control
 * passes the per-file all-or-none rule.  Four one-defect probes follow.
 */
const withKeyword = (card, keywords) => {
  const out = {};
  for (const [k, v] of Object.entries(card)) {
    if (k === 'keywords') continue;
    out[k] = v;
    if (k === 'loyalty') out.keywords = keywords;
  }
  return out;
};
const keywordsFor = (card, subject) =>
  card.faceDown === true ? [] : card.id === subject ? ['FLYING', 'VIGILANCE'] : [];
const withKeywords = (fs) => {
  const subject = firstFull(fs).card.id;
  const rewrite = (list) => {
    if (!Array.isArray(list)) return;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c === null || typeof c !== 'object' || c.hidden === true || c.faceDownHidden === true) continue;
      list[i] = withKeyword(c, keywordsFor(c, subject));
    }
  };
  for (const f of statesOf(fs)) {
    for (const p of f.body.players) for (const z of Object.values(p.zones)) rewrite(z.cards);
    rewrite(f.body.stackCards);
  }
  return subject;
};
/** The first full battlefield card of the first state, AFTER `withKeywords` replaced the objects. */
const firstFullNow = (fs) => firstFull(fs);

{
  const fs = slice();
  withKeywords(fs);
  write('m49-keywords-present.jsonl', fs);
  manifest.push({
    file: 'm49-keywords-present.jsonl', level: 'pass', expect: 'PASS',
    why: 'amendment M49: the baseline with `keywords` on every full card exactly as Snap.card writes it -- ' +
      'the control for the four m49 probes below',
  });
  console.log('  PASS  m49-keywords-present.jsonl  (keywords on every full card, no defect)');
}

probe('m49-stub-carries-keywords.jsonl',
  'amendment M49: a redacted stub is five keys -- a keyword on it is a sixth key, and a fact about a hidden card',
  'leaks extra keys: keywords',
  (fs) => { withKeywords(fs); firstStub(fs).card.keywords = ['FLYING']; });

probe('m49-keyword-is-a-display-string.jsonl',
  'amendment M49: a keyword is a Keyword constant\'s name() -- a display string (or a card name) is not one',
  '.keywords = ["Flying"] does not match the type',
  (fs) => { withKeywords(fs); firstFullNow(fs).card.keywords = ['Flying']; });

probe('m49-face-down-carries-keywords.jsonl',
  'amendment M49: a face-down card\'s keywords are [] in both branches of gate 2, like its name',
  'is face down and carries keywords',
  (fs) => {
    withKeywords(fs);
    const hit = firstFullNow(fs);
    Object.assign(hit.card, { faceDown: true, name: '', setCode: '???', manaCost: null, alt: null, keywords: ['FLYING'] });
  });

probe('m49-keywords-half-present.jsonl',
  'amendment M49: every full card carries keywords or none does -- some of each is a Snap.card branch that forgot it',
  'keywords are HALF PRESENT',
  (fs) => { withKeywords(fs); delete firstFullNow(fs).card.keywords; });

// ---------------------------------------------------------------------------
// Amendment M55 (D347): an AI seat's decision records, `dir:"ai"` lines in its
// OWN recording.  The control carries one priority decision over the viewer's
// own hand, taken at the first state of the slice, and the summary line; each
// probe breaks one rule -- the planted leaks are another seat's record and an
// option naming the opponent's concealed hand card.
// ---------------------------------------------------------------------------

/** Insert a decision (and the summary) after the slice's first state; returns the decision's body. */
function withDecision(fs) {
  const at = fs.findIndex((f) => f.type === 'state');
  const st = fs[at];
  const me = st.body.players.find((p) => p.id === header.seat);
  const mine = [...me.zones.hand.cards, ...me.zones.battlefield.cards].filter((c) => c.hidden !== true).map((c) => c.id);
  const body = {
    seat: header.seat, n: 0, kind: 'priority', frame: at, stateSeq: st.seq, turn: st.body.turn, phase: st.body.phase ?? 'MAIN1',
    options: ['pass', ...mine.slice(0, 2).map((id) => `cast:${id}`)], chosen: 'pass', by: 'search',
    search: {
      options: [{ token: 'pass', n: 3, meanLeaf: 120.5, win: 0.574 }, ...mine.slice(0, 1).map((id) => ({ token: `cast:${id}`, n: 3, meanLeaf: 98, win: 0.55 }))],
      forge: 0, best: 0, rounds: 3, playouts: 6, ms: 1480, budgetMs: 1500, timedOut: true, overrode: false, fallback: null,
    },
  };
  const t = st.t;
  fs.splice(at + 1, 0, { v: 1, seq: 1, t, dir: 'ai', type: 'decision', body });
  const overAt = fs.findIndex((f) => f.type === 'over');
  fs.splice(overAt, 0, { v: 1, seq: 2, t, dir: 'ai', type: 'decisions',
    body: { seat: header.seat, written: 1, searched: 1, errors: 0, recordMs: 1, byKind: { priority: 1 }, byPolicy: { search: 1 }, forced: { priority: 4 } } });
  return body;
}

{
  const fs = slice();
  withDecision(fs);
  write('m55-decisions-present.jsonl', fs);
  manifest.push({
    file: 'm55-decisions-present.jsonl', level: 'pass', expect: 'PASS',
    why: 'amendment M55: the baseline with one decision record of the viewing seat and its summary -- the control for the m55 probes',
  });
  console.log('  PASS  m55-decisions-present.jsonl  (a decision record, no defect)');
}

probe('m55-decision-of-the-other-seat.jsonl',
  'amendment M55 / D347: a seat\'s legal options name its hand -- the OTHER seat\'s record in this log is a leak',
  'record of seat',
  (fs) => { withDecision(fs).seat = header.decks.find((d) => d.player !== header.seat).player; });

probe('m55-option-names-the-opponent-hand.jsonl',
  'amendment M55 / D347: an option naming a card the viewer cannot see (the opponent\'s concealed hand) is a leak',
  'which its state frame does not show',
  (fs) => {
    const b = withDecision(fs);
    const st = fs.find((f) => f.type === 'state');
    const them = st.body.players.find((p) => p.id !== header.seat);
    b.options.push(`cast:${them.zones.hand.cards.find((c) => c.hidden === true).id}`);
  });

probe('m55-decision-carries-a-label.jsonl',
  'amendment M55 / D347: a decision record is tokens and numbers -- a label is an engine string that can name a card',
  'unexpected key "label"',
  (fs) => { withDecision(fs).label = 'cast a card'; });

probe('m55-chosen-is-not-an-option.jsonl',
  'amendment M55 / D347: the answer is one of the legal options',
  'not among its options',
  (fs) => { withDecision(fs).chosen = 'attack:none'; });

probe('m55-frame-is-not-a-state.jsonl',
  'amendment M55 / D347: a decision points at the state frame it was taken in',
  'not an earlier state frame',
  (fs) => { withDecision(fs).frame = 0; });

{
  const name = 'm55-decision-in-a-seat-recording.jsonl';
  const why = 'amendment M55 / D347: decision records belong to AI-vs-AI recordings, never a human seat\'s log';
  const fs = slice();
  withDecision(fs);
  const bytes = write(name, fs, { ...header, transport: 'ws' });
  manifest.push({ file: name, level: 'fail', expect: 'in a seat recording', why });
  console.log(`  FAIL  ${name}  (${bytes} bytes)  ${why}`);
}

// D481: ENTERED BETWEEN FRAMES.  A permanent made and gone inside one resolution
// (the legend rule's Boo token, J166) is in no state frame; the first state frame
// after the decision carries its zone events onto the viewer's own battlefield and
// into its own graveyard, and the audit counts it rather than failing it; so is
// the viewer's own spell its latest zone event put on the stack.  The controls:
// the same id with no events at all, an id the events deal into the opponent's
// hand, a spell from the opponent's hand or the viewer's own library, a token born
// onto the opponent's battlefield (and one then taken by the viewer), one taken
// by the opponent or exiled, a card
// never born, a token whose latest move is into the opponent's hand, and the
// viewer's own token whose events sit one state too late.

/** The decision with an option naming a fresh id, and the state frames after it (in order). */
function withFreshOption(fs) {
  const b = withDecision(fs);
  const ids = statesOf(fs).flatMap((f) => [...cardsOf(f.body)].map((h) => h.card.id));
  const fresh = Math.max(...ids) + 1;
  b.options.push(`option:${fresh}`);
  const at = fs.findIndex((f) => f.dir === 'ai' && f.type === 'decision');
  return { fresh, after: fs.slice(at + 1).filter((f) => f.type === 'state') };
}
const bornAndGone = (id, seat) => [
  { kind: 'zone', cardId: id, from: null, to: { zone: 'battlefield', player: seat } },
  { kind: 'zone', cardId: id, from: { zone: 'battlefield', player: seat }, to: { zone: 'graveyard', player: seat } },
];

{
  const name = 'm55-option-entered-between-frames.jsonl';
  const fs = slice();
  const { fresh, after } = withFreshOption(fs);
  after[0].body.events.push(...bornAndGone(fresh, header.seat));
  write(name, fs);
  manifest.push({
    file: name, level: 'pass', expect: 'PASS',
    why: 'D481: an option naming the viewer\'s own token made and gone between two state frames -- the next state frame\'s zone events put it on the viewer\'s battlefield and in its graveyard; counted, not a problem',
  });
  console.log(`  PASS  ${name}  (a token entered between frames, no defect)`);
}

probe('m55-option-never-shown.jsonl',
  'D481: an option naming an id no state frame shows and no zone event moves into the viewer\'s public zones is still a failure',
  'which its state frame does not show',
  (fs) => { withFreshOption(fs); });

probe('m55-option-entered-the-opponent-hand.jsonl',
  'D481: an id the next state frame\'s events deal into the OPPONENT\'s hand is hidden -- a decision naming it is a leak',
  'which its state frame does not show',
  (fs) => {
    const { fresh, after } = withFreshOption(fs);
    const them = header.decks.find((d) => d.player !== header.seat).player;
    after[0].body.events.push({ kind: 'zone', cardId: fresh, from: { zone: 'library', player: them }, to: { zone: 'hand', player: them } });
  });

// The spell half (s02's Tear Asunder): the viewer's own card moved from its own hand
// to the stack, in the decision's OWN state frame, with no stack instance -- the
// latest zone event, looked up backwards from the first state after the decision.
{
  const name = 'm55-option-cast-between-frames.jsonl';
  const fs = slice();
  const { fresh } = withFreshOption(fs);
  statesOf(fs)[0].body.events.push({ kind: 'zone', cardId: fresh, from: { zone: 'hand', player: header.seat }, to: { zone: 'stack', player: null } });
  write(name, fs);
  manifest.push({
    file: name, level: 'pass', expect: 'PASS',
    why: 'D481: an option naming the viewer\'s own spell that no zone lists -- its latest zone event moved it from the viewer\'s hand to the stack; counted, not a problem',
  });
  console.log(`  PASS  ${name}  (the viewer's own spell on the stack between frames, no defect)`);
}

probe('m55-option-cast-from-the-opponent-hand.jsonl',
  'D481: a card moved to the stack from ANOTHER seat\'s hand is not vouched for -- it can be cast face down',
  'which its state frame does not show',
  (fs) => {
    const { fresh } = withFreshOption(fs);
    const them = header.decks.find((d) => d.player !== header.seat).player;
    statesOf(fs)[0].body.events.push({ kind: 'zone', cardId: fresh, from: { zone: 'hand', player: them }, to: { zone: 'stack', player: null } });
  });

probe('m55-option-entered-then-went-to-the-opponent-hand.jsonl',
  'D481: only the LATEST zone event counts -- a token on the viewer\'s battlefield that then went to the opponent\'s hand is hidden',
  'which its state frame does not show',
  (fs) => {
    const { fresh, after } = withFreshOption(fs);
    const them = header.decks.find((d) => d.player !== header.seat).player;
    after[0].body.events.push(bornAndGone(fresh, header.seat)[0],
      { kind: 'zone', cardId: fresh, from: { zone: 'battlefield', player: header.seat }, to: { zone: 'hand', player: them } });
  });

// s02's real shape: the vouching event (hand -> stack) sits in the state frame
// BEFORE the decision's own state frame, so the window walks back past it.
{
  const name = 'm55-option-cast-a-frame-before-the-decision.jsonl';
  const fs = slice();
  const { fresh } = withFreshOption(fs);
  const at = fs.findIndex((f) => f.dir === 'ai' && f.type === 'decision');
  const [line] = fs.splice(at, 1);
  const second = fs.indexOf(statesOf(fs)[1]);
  fs.splice(second + 1, 0, line);
  Object.assign(line.body, { frame: second, stateSeq: fs[second].seq, turn: fs[second].body.turn, phase: fs[second].body.phase ?? 'MAIN1' });
  statesOf(fs)[0].body.events.push({ kind: 'zone', cardId: fresh, from: { zone: 'hand', player: header.seat }, to: { zone: 'stack', player: null } });
  write(name, fs);
  manifest.push({
    file: name, level: 'pass', expect: 'PASS',
    why: 'D481: the viewer\'s own spell moved hand -> stack in the state frame BEFORE the decision\'s own (s02: event at seq 323, decision at 324) -- the window walks back; counted, not a problem',
  });
  console.log(`  PASS  ${name}  (the viewer's own spell, its event a frame before the decision's state, no defect)`);
}

// F5: a token whose last event is `to: null` (it ceased to exist) is judged by
// the zone it was in before -- here the viewer's graveyard -- and still passes.
{
  const name = 'm55-option-entered-then-ceased-to-exist.jsonl';
  const fs = slice();
  const { fresh, after } = withFreshOption(fs);
  after[0].body.events.push(...bornAndGone(fresh, header.seat),
    { kind: 'zone', cardId: fresh, from: { zone: 'graveyard', player: header.seat }, to: null });
  write(name, fs);
  manifest.push({
    file: name, level: 'pass', expect: 'PASS',
    why: 'D481: a token born onto the viewer\'s battlefield, put in its graveyard, then gone (to: null) -- judged by its last zone, counted, not a problem',
  });
  console.log(`  PASS  ${name}  (a between-frames token that ceased to exist, no defect)`);
}

probe('m55-option-born-on-the-opponent-battlefield.jsonl',
  'D481: a token born onto the OPPONENT\'s battlefield and gone to their graveyard is not the viewer\'s own -- not vouched for',
  'which its state frame does not show',
  (fs) => {
    const { fresh, after } = withFreshOption(fs);
    const them = header.decks.find((d) => d.player !== header.seat).player;
    after[0].body.events.push(...bornAndGone(fresh, them));
  });

probe('m55-option-born-then-taken-by-the-opponent.jsonl',
  'D481: a token born onto the viewer\'s battlefield whose latest move is onto the OPPONENT\'s battlefield is not vouched for',
  'which its state frame does not show',
  (fs) => {
    const { fresh, after } = withFreshOption(fs);
    const them = header.decks.find((d) => d.player !== header.seat).player;
    after[0].body.events.push(bornAndGone(fresh, header.seat)[0],
      { kind: 'zone', cardId: fresh, from: { zone: 'battlefield', player: header.seat }, to: { zone: 'battlefield', player: them } });
  });

probe('m55-option-born-on-the-opponent-then-taken.jsonl',
  'D481: the birth must be onto the VIEWER\'s battlefield -- a token born onto the opponent\'s and then taken by the viewer is not vouched for',
  'which its state frame does not show',
  (fs) => {
    const { fresh, after } = withFreshOption(fs);
    const them = header.decks.find((d) => d.player !== header.seat).player;
    after[0].body.events.push({ kind: 'zone', cardId: fresh, from: null, to: { zone: 'battlefield', player: them } },
      { kind: 'zone', cardId: fresh, from: { zone: 'battlefield', player: them }, to: { zone: 'battlefield', player: header.seat } });
  });

probe('m55-option-entered-the-viewer-exile.jsonl',
  'D481: exile is never accepted (a card can go there face down) -- a token born onto the viewer\'s battlefield and exiled is not vouched for',
  'which its state frame does not show',
  (fs) => {
    const { fresh, after } = withFreshOption(fs);
    after[0].body.events.push(bornAndGone(fresh, header.seat)[0],
      { kind: 'zone', cardId: fresh, from: { zone: 'battlefield', player: header.seat }, to: { zone: 'exile', player: header.seat } });
  });

probe('m55-option-cast-from-the-viewer-library.jsonl',
  'D481: a card moved to the stack from the viewer\'s own LIBRARY is not vouched for -- the viewer could not see it when the option was offered',
  'which its state frame does not show',
  (fs) => {
    const { fresh } = withFreshOption(fs);
    statesOf(fs)[0].body.events.push({ kind: 'zone', cardId: fresh, from: { zone: 'library', player: header.seat }, to: { zone: 'stack', player: null } });
  });

probe('m55-option-not-born-in-the-graveyard.jsonl',
  'D481: the token branch needs a birth (from: null onto the viewer\'s battlefield) -- a card merely moved into the viewer\'s graveyard from its library is not vouched for',
  'which its state frame does not show',
  (fs) => {
    const { fresh, after } = withFreshOption(fs);
    after[0].body.events.push({ kind: 'zone', cardId: fresh, from: { zone: 'library', player: header.seat }, to: { zone: 'graveyard', player: header.seat } });
  });

probe('m55-option-entered-a-state-too-late.jsonl',
  'D481: only the FIRST state frame after the decision vouches for a between-frames token -- events in a later one do not',
  'which its state frame does not show',
  (fs) => {
    const { fresh, after } = withFreshOption(fs);
    after[1].body.events.push(...bornAndGone(fresh, header.seat));
  });

// D485: STALE TARGETS.  Forge's AI can leave a target list on a play that names
// the viewer's own token long gone (J168: FightAi appends Troll Negotiations'
// "creature you control" target at every evaluation), and the decision record
// of that play's targets names it.  No state frame the decision can use lists
// it, and a token older than the log has no birth event; the vouching facts are
// a state in the window listing it as the viewer's own token and its latest
// move, from the viewer's battlefield into the viewer's own graveyard or hand.
// Five state frames: the token on the viewer's battlefield in the first, its
// move in the second, a target decision at the fourth naming it (complete:
// false), the window ending at the fifth.  The controls: it bounced to the
// opponent's hand, it was the opponent's token, it was exiled, it was no token,
// and the only listing of it as the viewer's token comes after the window.

/** The slice with `n` state frames: the extra ones copies of the last, with no events (nothing happened). */
function longSlice(n) {
  const fs = slice();
  while (statesOf(fs).length < n) {
    const c = structuredClone(statesOf(fs).at(-1));
    c.body.events = [];
    fs.splice(fs.findIndex((f) => f.type === 'over'), 0, c);
  }
  fs.forEach((f, i) => { f.seq = i + 1; });
  return fs;
}

/**
 * A target decision at state `at` (its frame) naming one of the viewer's live
 * permanents and a fresh token id, listed by the states in `showIn` on
 * `owner`'s battlefield (`token` its flag) and moved by `move` in state 1.
 */
function withStaleTarget(fs, { owner = header.seat, token = true, showIn = [0], move, at = 3 }) {
  const sts = statesOf(fs);
  const fresh = Math.max(...sts.flatMap((f) => [...cardsOf(f.body)].map((h) => h.card.id))) + 1;
  for (const k of showIn) {
    const p = sts[k].body.players.find((q) => q.id === owner);
    const proto = p.zones.battlefield.cards.find((c) => c.hidden !== true);
    p.zones.battlefield.cards.push({ ...structuredClone(proto), id: fresh, name: 'Spider Token', setCode: 'TMSH', manaCost: null,
      types: 'Token Creature - Spider', token, controller: owner, owner, attachedToId: null, attachmentIds: [] });
    p.zones.battlefield.count = p.zones.battlefield.cards.length;
  }
  sts[1].body.events.push({ kind: 'zone', cardId: fresh, ...move(owner) });
  const b = withDecision(fs);
  const line = fs.splice(fs.findIndex((f) => f.dir === 'ai' && f.type === 'decision'), 1)[0];
  const st = statesOf(fs)[at];
  const idx = fs.indexOf(st);
  fs.splice(idx + 1, 0, line);
  const me = st.body.players.find((q) => q.id === header.seat);
  const live = me.zones.battlefield.cards.find((c) => c.hidden !== true && c.id !== fresh).id;
  delete b.search;
  Object.assign(b, { kind: 'target', frame: idx, stateSeq: st.seq, turn: st.body.turn, phase: st.body.phase ?? 'MAIN1',
    options: [`target:${live}`, `target:${fresh}`], chosen: [`target:${live}`, `target:${fresh}`], complete: false, by: 'forge', source: 'targets' });
  return fresh;
}
const died = (seat) => ({ from: { zone: 'battlefield', player: seat }, to: { zone: 'graveyard', player: seat } });

{
  const name = 'stale-token-died-earlier.jsonl';
  const fs = longSlice(5);
  withStaleTarget(fs, { move: died });
  write(name, fs);
  manifest.push({
    file: name, level: 'pass', expect: 'PASS',
    why: 'D485: a target decision naming the viewer\'s own token (listed as its own from the first state, no birth event) that died to its own graveyard two states before -- a stale target list; counted, not a problem',
  });
  console.log(`  PASS  ${name}  (a stale target: the viewer's own dead token, no defect)`);
}

{
  const name = 'stale-token-bounced-to-own-hand.jsonl';
  const fs = longSlice(5);
  withStaleTarget(fs, { move: (seat) => ({ from: { zone: 'battlefield', player: seat }, to: { zone: 'hand', player: seat } }) });
  write(name, fs);
  manifest.push({
    file: name, level: 'pass', expect: 'PASS',
    why: 'D485: a stale target naming the viewer\'s own token that was returned to its own hand (where a token ceases to exist); counted, not a problem',
  });
  console.log(`  PASS  ${name}  (a stale target: the viewer's own token bounced to its own hand, no defect)`);
}

const staleProbe = (name, why, opts) => {
  const fs = longSlice(5);
  withStaleTarget(fs, opts);
  const bytes = write(name, fs);
  manifest.push({ file: name, level: 'fail', expect: 'which its state frame does not show', why });
  console.log(`  FAIL  ${name}  (${bytes} bytes)  ${why}`);
};
const themOf = () => header.decks.find((d) => d.player !== header.seat).player;

staleProbe('stale-token-bounced-to-the-opponent-hand.jsonl',
  'D485: a stale target whose latest move is into the OPPONENT\'s hand is hidden -- not vouched for',
  { move: (seat) => ({ from: { zone: 'battlefield', player: seat }, to: { zone: 'hand', player: themOf() } }) });
staleProbe('stale-token-of-the-opponent.jsonl',
  'D485: only the viewer\'s OWN token is vouched for -- the opponent\'s token, dead in the opponent\'s graveyard, is not',
  { owner: themOf(), move: died });
staleProbe('stale-token-then-exiled.jsonl',
  'D485: exile is never accepted (a card can go there face down) -- the viewer\'s token exiled is not vouched for',
  { move: (seat) => ({ from: { zone: 'battlefield', player: seat }, to: { zone: 'exile', player: seat } }) });
staleProbe('stale-nontoken-ghost.jsonl',
  'D485: only a TOKEN ceases to exist -- a nontoken card (token: false) last moved to the graveyard is listed there or it is not the viewer\'s to name',
  { token: false, move: died });
staleProbe('stale-token-shown-only-after-the-window.jsonl',
  'D485: the listing as the viewer\'s own token must be in the window (up to the first state after the decision) -- one only later does not vouch',
  { showIn: [4], at: 2, move: died });

// D495: A SPELL COPY ON THE STACK.  A copy (replicate, storm, a Fork) is made on
// the stack: no zone list, no stackCards entry and no zone event names it, and it
// chooses its targets before it is cast, so the `cast` event naming it lands in
// the state after the decision (J176 s09: Lose Focus's copies 96 and 97, copy
// 97's target decision offering target:96).  Vouched for by a `cast` event in
// the window -- up to the first state after the decision that records any
// event -- by either seat (the stack is public), when the whole log never lists
// it as a stub, lists it nowhere before its cast, moves it only among the stack,
// battlefields and graveyards, and it was not taken off the stack in or before
// the decision's state; a copy of a permanent spell that resolves into a token
// passes too.  The controls: no cast at all is m55-option-never-shown; a cast
// one engine step too late; a later move into the opponent's hand; an
// opponent's cast naming its own concealed hand card (an ability of a card in
// hand, ninjutsu's shape) -- and the same in the log's first state, where only
// the stub rejects it; a face-down exiled card listed before its cast, where
// only the earlier listing rejects it; a card cast from a library; a copy
// already off the stack.

/** A target decision at the first state naming one of the viewer's permanents and a fresh id. */
function withCopyTarget(fs) {
  const { fresh, after } = withFreshOption(fs);
  const b = fs.find((f) => f.dir === 'ai' && f.type === 'decision').body;
  const me = statesOf(fs)[0].body.players.find((p) => p.id === header.seat);
  const live = me.zones.battlefield.cards.find((c) => c.hidden !== true).id;
  delete b.search;
  Object.assign(b, { kind: 'target', options: [`target:${live}`, `target:${fresh}`], chosen: `target:${live}`, by: 'forge', source: 'chooseTargets' });
  return { fresh, after, b };
}
/** A copy's life on the stack as the next state frame records it: cast (text "" as s09's), resolved, unstacked. */
const copyCast = (id, controller) => [
  { kind: 'cast', stackId: 9000 + id, cardId: id, controller, text: '' },
  { kind: 'resolved', cardId: id, fizzled: false },
  { kind: 'unstacked', cardId: id },
];
const copyPass = (name, why, mutate) => {
  const fs = slice();
  mutate(fs);
  write(name, fs);
  manifest.push({ file: name, level: 'pass', expect: 'PASS', why });
  console.log(`  PASS  ${name}  (${why.split(' -- ')[0]})`);
};

copyPass('stack-copy-cast-by-the-viewer.jsonl',
  'D495: a target decision naming the viewer\'s own spell copy, cast in the first state after the decision and never in a zone -- counted, not a problem',
  (fs) => { const { fresh, after } = withCopyTarget(fs); after[0].body.events.push(...copyCast(fresh, header.seat)); });
copyPass('stack-copy-cast-by-the-opponent.jsonl',
  'D495: the same with the OPPONENT\'s copy -- the stack is public and a copy has no hidden face, so it is a visible object for both seats; counted, not a problem',
  (fs) => { const { fresh, after } = withCopyTarget(fs); after[0].body.events.push(...copyCast(fresh, themOf())); });
copyPass('stack-copy-cast-after-empty-states.jsonl',
  'D495: three copies choose targets one after another and the recorder flushes an EMPTY state before each decision -- the window runs to the first state after the decision that records an event; counted, not a problem',
  (fs) => {
    const { fresh, after } = withCopyTarget(fs);
    after[0].body.events = [];
    after[1].body.events.push(...copyCast(fresh, header.seat));
  });
copyPass('stack-copy-resolves-into-a-token.jsonl',
  'D495: a copy of a permanent spell resolves into a token -- its one zone event goes from the stack to a battlefield, which is public; counted, not a problem',
  (fs) => {
    const { fresh, after } = withCopyTarget(fs);
    after[0].body.events.push(copyCast(fresh, themOf())[0],
      { kind: 'zone', cardId: fresh, from: { zone: 'stack', player: null }, to: { zone: 'battlefield', player: themOf() } });
  });

probe('stack-copy-cast-a-step-too-late.jsonl',
  'D495: the cast must be in the window -- one in the second state after the decision, when the first records an engine step, does not vouch',
  'which its state frame does not show',
  (fs) => { const { fresh, after } = withCopyTarget(fs); after[1].body.events.push(...copyCast(fresh, header.seat)); });
probe('stack-copy-then-into-the-opponent-hand.jsonl',
  'D495: a copy is never in a zone -- an id with a cast event AND a later zone event into the opponent\'s hand is a card, not a copy, and hidden',
  'which its state frame does not show',
  (fs) => {
    const { fresh, after } = withCopyTarget(fs);
    after[0].body.events.push(copyCast(fresh, header.seat)[0]);
    after[1].body.events.push({ kind: 'zone', cardId: fresh, from: { zone: 'stack', player: null }, to: { zone: 'hand', player: themOf() } });
  });
probe('stack-copy-is-an-opponent-hand-stub.jsonl',
  'D495: an opponent\'s cast event naming a card its hand lists as a stub (an ability of a card in hand, ninjutsu\'s shape) is not a copy -- the stub is listed, so the cast vouches for nothing',
  'which its state frame does not show',
  (fs) => {
    const { after, b } = withCopyTarget(fs);
    const stub = statesOf(fs)[0].body.players.find((p) => p.id !== header.seat).zones.hand.cards.find((c) => c.hidden === true).id;
    b.options[1] = `target:${stub}`;
    after[0].body.events.push(...copyCast(stub, themOf()));
  });
probe('stack-copy-is-a-card-from-a-library.jsonl',
  'D495: a cast whose id a zone event moved from a LIBRARY onto the stack is a card the viewer could not see, not a copy -- not vouched for',
  'which its state frame does not show',
  (fs) => {
    const { fresh, after } = withCopyTarget(fs);
    after[0].body.events.push({ kind: 'zone', cardId: fresh, from: { zone: 'library', player: themOf() }, to: { zone: 'stack', player: null } },
      copyCast(fresh, themOf())[0]);
  });
// Guards 2 and 3 alone (the #223 review): each has a control the other cannot catch.
probe('stack-copy-hand-stub-cast-in-the-first-state.jsonl',
  'D495 guard 2: the opponent activates an ability of a card in its hand (ninjutsu\'s shape) in the log\'s FIRST state -- the cast and the stub are in the same state, so nothing lists it BEFORE the cast; the stub alone rejects it',
  'which its state frame does not show',
  (fs) => {
    const { b } = withCopyTarget(fs);
    const stub = statesOf(fs)[0].body.players.find((p) => p.id !== header.seat).zones.hand.cards.find((c) => c.hidden === true).id;
    b.options[1] = `target:${stub}`;
    statesOf(fs)[0].body.events.push(copyCast(stub, themOf())[0]);
  });
{
  const name = 'stack-copy-face-down-exile-listed-before-its-cast.jsonl';
  const why = 'D495 guard 3: the opponent\'s face-down exiled card, listed with a blank face (a full card, not a stub) in the first state and in none after, then a cast naming it with no zone event -- it was in a zone before its cast, so it is a card, not a copy';
  const fs = longSlice(5);
  const sts = statesOf(fs);
  const fresh = Math.max(...sts.flatMap((f) => [...cardsOf(f.body)].map((h) => h.card.id))) + 1;
  putCard(sts[0].body.players.find((p) => p.id === themOf()), 'exile', faceDownCard(fs, fresh, 'exile', themOf(), themOf(), false));
  const b = withDecision(fs);
  const line = fs.splice(fs.findIndex((f) => f.dir === 'ai' && f.type === 'decision'), 1)[0];
  const st = statesOf(fs)[2];
  const idx = fs.indexOf(st);
  fs.splice(idx + 1, 0, line);
  const live = st.body.players.find((q) => q.id === header.seat).zones.battlefield.cards.find((c) => c.hidden !== true).id;
  delete b.search;
  Object.assign(b, { kind: 'target', frame: idx, stateSeq: st.seq, turn: st.body.turn, phase: st.body.phase ?? 'MAIN1',
    options: [`target:${live}`, `target:${fresh}`], chosen: `target:${live}`, by: 'forge', source: 'chooseTargets' });
  statesOf(fs)[3].body.events.push(copyCast(fresh, themOf())[0]);
  const bytes = write(name, fs);
  manifest.push({ file: name, level: 'fail', expect: 'which its state frame does not show', why });
  console.log(`  FAIL  ${name}  (${bytes} bytes)  ${why}`);
}
probe('stack-copy-already-off-the-stack.jsonl',
  'D495: a copy cast and taken off the stack in or before the decision\'s own state is gone -- naming it is not vouched for',
  'which its state frame does not show',
  (fs) => { const { fresh } = withCopyTarget(fs); statesOf(fs)[0].body.events.push(...copyCast(fresh, header.seat)); });

// D496 (amendment M78): REVEALED TO THE SEAT IN THE STEP.  A cascade asks "cast it
// without paying?" inside the resolution that revealed the card, and the recorder
// can hold the batch (MidMove), so the decision names a state frame from before
// the reveal -- J177 s02's decision 15, option:59, the seat's own library card.
// The seat's recorder now writes Forge's own reveal call as a `reveal` line where
// it happens, and a line of this seat between the decision's state frame and the
// decision, naming the id, vouches for it.  The controls: the reveal before the
// decision's state frame, after the decision, of another id, of another seat, with
// a key beyond the four (a card name), and with no ids.

/** The cascade's choice at the first state: pass, or the fresh id (a card no state lists). */
function withCascadeChoice(fs) {
  const { fresh } = withFreshOption(fs);
  const b = fs.find((f) => f.dir === 'ai' && f.type === 'decision').body;
  delete b.search;
  Object.assign(b, { kind: 'choice', options: ['pass', `option:${fresh}`], chosen: 'pass', by: 'forge', source: 'entity' });
  return { fresh, b };
}
/** Insert a `reveal` line at `at` (a frame index) and number the `ai` lines again in file order. */
function insertReveal(fs, at, body) {
  fs.splice(at, 0, { v: 1, seq: 0, t: fs[Math.max(0, at - 1)].t, dir: 'ai', type: 'reveal', body });
  let n = 0;
  for (const f of fs) if (f.dir === 'ai') f.seq = ++n;
}
const revealOf = (ids, owner = header.seat) => ({ seat: header.seat, cardIds: ids, zone: 'library', owner });
const decisionAt = (fs) => fs.findIndex((f) => f.dir === 'ai' && f.type === 'decision');

copyPass('reveal-vouches-the-option.jsonl',
  'D496: the cascade\'s choice names a card no state frame lists, and a reveal line of the seat between the decision\'s state frame and the decision names it -- the engine showed it to the seat in that step; counted, not a problem',
  (fs) => { const { fresh } = withCascadeChoice(fs); insertReveal(fs, decisionAt(fs), revealOf([fresh])); });

probe('reveal-before-the-decision-state.jsonl',
  'D496: a reveal BEFORE the decision\'s state frame does not vouch -- a card still public then would be in that state',
  'which its state frame does not show',
  (fs) => {
    const { fresh, b } = withCascadeChoice(fs);
    insertReveal(fs, fs.findIndex((f) => f.type === 'state'), revealOf([fresh]));
    b.frame += 1;   // the line went in ahead of the decision's state frame, which moved down one
  });
probe('reveal-after-the-decision.jsonl',
  'D496: a reveal AFTER the decision does not vouch -- the seat was offered the card before the engine showed it',
  'which its state frame does not show',
  (fs) => { const { fresh } = withCascadeChoice(fs); insertReveal(fs, decisionAt(fs) + 1, revealOf([fresh])); });
probe('reveal-names-another-id.jsonl',
  'D496: a reveal in the window vouches only for the ids it names -- one naming another card does not vouch for the option',
  'which its state frame does not show',
  (fs) => { const { fresh } = withCascadeChoice(fs); insertReveal(fs, decisionAt(fs), revealOf([fresh + 1])); });
probe('reveal-of-another-seat.jsonl',
  'D496: a reveal line is the seat\'s own private record -- another seat\'s in this log is a leak, and vouches for nothing',
  'reveal record of seat',
  (fs) => { const { fresh } = withCascadeChoice(fs); insertReveal(fs, decisionAt(fs), { ...revealOf([fresh]), seat: themOf() }); });
probe('reveal-with-an-unexpected-key.jsonl',
  'D496: a reveal line is ids, a zone word and a player -- a fifth key (a card name) is an engine string, and the line vouches for nothing',
  'reveal carries an unexpected key "name"',
  (fs) => { const { fresh } = withCascadeChoice(fs); insertReveal(fs, decisionAt(fs), { ...revealOf([fresh]), name: 'Spicy Oatmeal Pizza' }); });
probe('reveal-empty-card-ids.jsonl',
  'D496: a reveal line names at least one card -- an empty one is not a reveal (the decision beside it names only cards its state shows, so the empty list is the one defect)',
  'is not a non-empty list of card ids',
  (fs) => { withDecision(fs); insertReveal(fs, decisionAt(fs), revealOf([])); });

// ---------------------------------------------------------------------------
// Amendment M57 (D358): play exploration.  An exploring recording's header
// carries `playExplore` (epsilon, closeCall, opening); a decision the explorer
// answered carries `explore: {rule, forge}`, `forge` the seat's own answer as a
// token -- audited like every other token (the planted leak names the
// opponent's concealed hand card there).
// ---------------------------------------------------------------------------

const exploreHeader = { ...header, playExplore: { epsilon: 0.05, closeCall: 0.02, opening: false } };

/** withDecision, answered by the explorer: chosen a random legal option, Forge's own answer in the mark. */
function withExplored(fs) {
  const b = withDecision(fs);
  b.explore = { rule: 'random', forge: b.chosen };
  b.chosen = b.options[b.options.length - 1];
  const sum = fs.find((f) => f.type === 'decisions');
  sum.body.explore = { decisionsRandomised: 1, changed: 1, closeCalls: 0, closeCallsChanged: 0, coins: 20, failures: 0, byKind: { priority: 1 } };
  return b;
}

const exploreProbe = (name, why, expect, mutate, headerOut = exploreHeader) => {
  const fs = slice();
  mutate(fs);
  const bytes = write(name, fs, headerOut);
  manifest.push({ file: name, level: 'fail', expect, why });
  console.log(`  FAIL  ${name}  (${bytes} bytes)  ${why}`);
};

{
  const fs = slice();
  withExplored(fs);
  write('m57-explore-present.jsonl', fs, exploreHeader);
  manifest.push({
    file: 'm57-explore-present.jsonl', level: 'pass', expect: 'PASS',
    why: 'amendment M57: an exploring recording -- its header, one randomised decision and the summary\'s counts -- the control for the m57 probes',
  });
  console.log('  PASS  m57-explore-present.jsonl  (an explored decision, no defect)');
}

exploreProbe('m57-explore-without-header.jsonl',
  'amendment M57 / D358: an explore mark only in a recording whose header says it explored',
  'no playExplore',
  (fs) => { withExplored(fs); }, header);

exploreProbe('m57-explore-forge-names-the-opponent-hand.jsonl',
  'amendment M57 / D358: the mark\'s Forge answer is a token like any other -- naming a card the viewer cannot see is a leak',
  'which its state frame does not show',
  (fs) => {
    const b = withExplored(fs);
    const st = fs.find((f) => f.type === 'state');
    const them = st.body.players.find((p) => p.id !== header.seat);
    b.explore.forge = `cast:${them.zones.hand.cards.find((c) => c.hidden === true).id}`;
  });

exploreProbe('m57-explore-carries-a-label.jsonl',
  'amendment M57 / D358: an explore mark is a rule and a token -- nothing else',
  'explore carries an unexpected key',
  (fs) => { withExplored(fs).explore.why = 'a coin said so'; });

exploreProbe('m57-playexplore-in-a-seat-recording.jsonl',
  'amendment M57 / D358: a seat a person plays never explores',
  'both "playExplore" and "transport"',
  () => {}, { ...exploreHeader, transport: 'ws' });

// Amendment M76 (D487): a targeting part left empty answers `target:none`, listed
// beside the part's minimum (`min`): 0 for a part that may take no target, 1 or
// more only on an empty mandatory part marked complete:false and NO_TARGET.  The
// LEGACY shape -- J171's `chosen: null` on a target/forge/targets record with no
// `min` -- passes, counted; a null answer in any other shape fails.
/** The decision of withDecision as a target record over two of the viewer's own visible cards. */
function withTargetRecord(fs, patch) {
  const b = withDecision(fs);
  const ids = b.options.filter((t) => t.startsWith('cast:')).map((t) => Number(t.slice(5)));
  delete b.search;
  Object.assign(b, { kind: 'target', options: ['target:none', ...ids.map((id) => `target:${id}`)], min: 0,
    chosen: 'target:none', by: 'forge', source: 'targets' }, patch);
  for (const k of Object.keys(b)) if (b[k] === undefined) delete b[k];
  return b;
}
const m76Pass = (name, why, patch) => {
  const fs = slice();
  withTargetRecord(fs, patch);
  write(name, fs);
  manifest.push({ file: name, level: 'pass', expect: 'PASS', why });
  console.log(`  PASS  ${name}  (${why.split(':')[0]}, no defect)`);
};
m76Pass('m76-target-none-listed.jsonl',
  'amendment M76 / D487: a part that may take no target (min 0), left empty -- target:none listed and chosen; the control for the m76 probes', {});
m76Pass('m76-target-none-mandatory-part.jsonl',
  'amendment M76 / D487: an empty mandatory part (min 1) -- target:none listed and chosen, complete:false, why NO_TARGET; counted, not a problem',
  { min: 1, complete: false, why: 'NO_TARGET' });
// The legacy shape is bounded (the D487 review): a move-atlas log (`lab.atlas`) started before D487 merged.
const legacyHeader = { ...header, startedAt: '2026-10-26T11:52:53.069808383Z', lab: { atlas: 'b-s09-pauper-2109', decision: 0 } };
/** A legacy-like record: chosen null, the viewer's own cards as the options, no target:none, no min. */
const legacyLike = (fs, patch = {}) => {
  const b = withTargetRecord(fs, { min: undefined, chosen: null, ...patch });
  b.options = b.options.filter((t) => t !== 'target:none');
  for (const k of Object.keys(b)) if (b[k] === undefined) delete b[k];
  return b;
};
{
  const name = 'm76-legacy-null-target.jsonl';
  const why = 'amendment M76 / D487: J171\'s legacy shape -- chosen null on a target/forge/targets record listing card candidates, no min, no target:none, in a move-atlas log started before D487 merged; counted, not a problem';
  const fs = slice();
  legacyLike(fs);
  write(name, fs, legacyHeader);
  manifest.push({ file: name, level: 'pass', expect: 'PASS', why });
  console.log(`  PASS  ${name}  (the legacy null answer, no defect)`);
}
/** A probe with one marker off J171's legacy shape (or the M76 shape), written under the legacy header. */
const m76LegacyProbe = (name, why, expect, mutate, headerOut = legacyHeader) => {
  const fs = slice();
  mutate(fs);
  const bytes = write(name, fs, headerOut);
  manifest.push({ file: name, level: 'fail', expect, why });
  console.log(`  FAIL  ${name}  (${bytes} bytes)  ${why}`);
};
const { lab: _noLab, ...notAtlasHeader } = legacyHeader;
m76LegacyProbe('m76-legacy-null-target-after-d487.jsonl',
  'amendment M76 / D487: the legacy shape is accepted only in a log started before D487 merged (LEGACY_NULL_TARGET_BEFORE) -- a later null answer is a bridge fault',
  'chosen null is not a token', (fs) => { legacyLike(fs); }, { ...legacyHeader, startedAt: '2026-10-27T09:00:00Z' });
m76LegacyProbe('m76-legacy-null-target-not-an-atlas.jsonl',
  'amendment M76 / D487: the legacy shape is accepted only in a move-atlas log (lab.atlas in its header)',
  'chosen null is not a token', (fs) => { legacyLike(fs); }, notAtlasHeader);
m76LegacyProbe('m76-unseen-answer-null.jsonl',
  'amendment M76 / D487 (review): a min-1 part answered with a target the seat cannot see writes chosen null beside complete:false -- never the legacy shape',
  'chosen null is not a token', (fs) => { legacyLike(fs, { complete: false }); });
m76LegacyProbe('m76-legacy-null-by-search.jsonl',
  'amendment M76 / D487: the legacy shape is Forge\'s answer only -- a search seat\'s null answer fails',
  'chosen null is not a token', (fs) => { legacyLike(fs, { by: 'search' }); });
m76LegacyProbe('m76-legacy-null-source-modes.jsonl',
  'amendment M76 / D487: the legacy shape is a priority answer\'s targets only -- a modes record\'s null answer fails',
  'chosen null is not a token', (fs) => { legacyLike(fs, { source: 'modes' }); });
m76LegacyProbe('m76-chosen-null-beside-target-none.jsonl',
  'amendment M76 / D487: a record written after D487 (it lists target:none and carries min) never answers null',
  'chosen null is not a token', (fs) => { withTargetRecord(fs, { chosen: null }); });
m76LegacyProbe('m76-chosen-null-trigger.jsonl',
  'amendment M76 / D487: the legacy null answer is accepted in J171\'s one shape only -- a trigger\'s target record is not it',
  'chosen null is not a token', (fs) => { legacyLike(fs, { source: 'trigger' }); });
const m76Probe = (name, why, expect, patch, after = () => {}) => probe(name, why, expect, (fs) => { after(withTargetRecord(fs, patch)); });
m76Probe('m76-target-none-not-listed.jsonl',
  'amendment M76 / D487: target:none is an answer only where it is listed',
  'chose "target:none", which is not among its options', { min: undefined },
  (b) => { b.options = b.options.filter((t) => t !== 'target:none'); });
m76Probe('m76-target-none-on-a-min-1-part.jsonl',
  'amendment M76 / D487: a part whose minimum is 1 lists target:none only as an empty mandatory part, marked complete:false and NO_TARGET',
  'on a part whose minimum is 1', { min: 1 });
m76Probe('m76-target-none-without-min.jsonl',
  'amendment M76 / D487: a record listing target:none says the part\'s minimum',
  'without the part\'s min', { min: undefined });
m76Probe('m76-target-none-on-a-priority-record.jsonl',
  'amendment M76 / D487: target:none answers a target record, never another kind',
  'which only a target record answers', { kind: 'priority', min: undefined });
m76Probe('m76-target-none-in-a-chosen-list.jsonl',
  'amendment M76 / D487: target:none is the whole answer of an empty part, never one of several targets',
  'chose target:none among other targets', {},
  (b) => { b.chosen = ['target:none', b.options[1]]; });
m76Probe('m76-min-without-target-none.jsonl',
  'amendment M76 / D487: min is written exactly when target:none is listed',
  'carries min but does not list target:none', {},
  (b) => { b.options = b.options.filter((t) => t !== 'target:none'); b.chosen = b.options[0]; });
m76Probe('m76-min-negative.jsonl',
  'amendment M76 / D487: min is a non-negative integer',
  'min -1', { min: -1 });
m76Probe('m76-min-not-an-integer.jsonl',
  'amendment M76 / D487: min is a non-negative integer',
  'min 0.5', { min: 0.5 });
m76Probe('m76-no-target-elsewhere.jsonl',
  'amendment M76 / D487: why NO_TARGET marks an empty mandatory part only -- not a min-0 part',
  'is not an empty mandatory target part', { why: 'NO_TARGET' });

// Amendment M58 (D389): the search's prior in M55's search block -- `prior` per
// option and `generated` -- a control that passes and one malformed probe.
{
  const fs = slice();
  const b = withDecision(fs);
  // Forge's own answer (options[0]) is never scored by the prior (M58).
  if (b.search.options[1]) b.search.options[1].prior = 388;
  b.search.generated = 9;
  write('m58-search-prior-present.jsonl', fs);
  manifest.push({
    file: 'm58-search-prior-present.jsonl', level: 'pass', expect: 'PASS',
    why: 'amendment M58: a decision record whose search ranked its candidates by a prior -- the control for the m58 probe',
  });
  console.log('  PASS  m58-search-prior-present.jsonl  (a ranked search, no defect)');
}

probe('m58-generated-is-not-a-count.jsonl',
  'amendment M58 / D389: `generated` is how many candidates were generated -- a positive integer, never a string',
  'search generated',
  (fs) => { withDecision(fs).search.generated = 'nine'; });

/*
 * Amendment M60 (D406, D407) -- a game of a best of three at a table of two.
 * The control is the baseline as one seat of such a table writes it: a session
 * header with `humans: 2` and `record` (this seat's consent), both players
 * people, and `hello_ok.match` in its two-person form with `games: 3` and
 * `score`, beside M41's `gameNumber` / `gameCount`.  Four one-defect probes.
 */
const tableHeader = (edit = () => {}) => {
  const h = { ...structuredClone(header), transport: 'ws', humans: 2, record: true };
  edit(h);
  return h;
};
const withTableMatch = (fs, edit = () => {}) => {
  const hello = fs.find((f) => f.type === 'hello_ok');
  const mine = header.decks.find((d) => d.player === header.seat);
  const theirs = header.decks.find((d) => d.player !== header.seat);
  hello.body.gameNumber = 2;
  hello.body.gameCount = 3;
  for (const p of hello.body.players) p.isAi = false;
  const m = {
    yourDeck: { name: 'Pacho SHIELD (Marvel Super Heroes)', path: mine.path, cards: mine.cards },
    opponentDeck: { name: 'Doom Legion (Marvel Super Heroes villains)', cards: theirs.cards },
    opponent: 'human',
    games: 3,
    score: { you: 0, opponent: 1 },
  };
  edit(m, hello.body);
  hello.body.match = m;
};
const tableProbe = (name, why, expect, mutate, headerOut = tableHeader()) => {
  const fs = slice();
  withTableMatch(fs, mutate);
  const bytes = write(name, fs, headerOut);
  manifest.push({ file: name, level: 'fail', expect, why });
  console.log(`  FAIL  ${name}  (${bytes} bytes)  ${why}`);
};
{
  const fs = slice();
  withTableMatch(fs);
  write('m60-best-of-three-present.jsonl', fs, tableHeader());
  manifest.push({
    file: 'm60-best-of-three-present.jsonl', level: 'pass', expect: 'PASS',
    why: 'amendment M60: one seat of game 2 of a best of three at a table of two, its consent in the header -- ' +
      'the control for the m60 probes',
  });
  console.log('  PASS  m60-best-of-three-present.jsonl  (a well-formed best-of-three seat, no defect)');
}

tableProbe('m60-score-in-a-one-game-match.jsonl',
  'amendment M60: score belongs to a best of three; a one-game table carries exactly M59\'s four keys',
  'expected exactly yourDeck, opponentDeck, opponent, games',
  (m, hello) => { m.games = 1; delete hello.gameNumber; delete hello.gameCount; });

tableProbe('m60-score-not-a-count.jsonl',
  'amendment M60: score is the games each side won before this one, 0 or 1 each -- never a list or a name',
  'score must be exactly {you, opponent}',
  (m) => { m.score = { you: 0, opponent: ['Doctor Doom'] }; });

tableProbe('m60-score-ahead-of-the-game.jsonl',
  'amendment M60: game 2 follows exactly one game, so the score cannot add up to two',
  'is more games than came before game 2',
  (m) => { m.score = { you: 1, opponent: 1 }; });

{
  const name = 'm60-record-not-a-boolean.jsonl';
  const fs = slice();
  withTableMatch(fs);
  const bytes = write(name, fs, tableHeader((h) => { h.record = 'yes'; }));
  const why = 'amendment M60 / D407: record is a seat\'s consent, true or false';
  manifest.push({ file: name, level: 'fail', expect: '"record" must be true or false', why });
  console.log(`  FAIL  ${name}  (${bytes} bytes)  ${why}`);
}

{
  const name = 'm60-record-against-the-ai.jsonl';
  const fs = slice();
  const bytes = write(name, fs, { ...structuredClone(header), transport: 'ws', record: true });
  const why = 'amendment M60 / D407: only a seat at a table of two says whether it may be recorded';
  manifest.push({ file: name, level: 'fail', expect: '"record" without "humans": 2', why });
  console.log(`  FAIL  ${name}  (${bytes} bytes)  ${why}`);
}

/*
 * Amendment M62 (D414) -- the session header's `ai`: the AI seat's controller
 * when it is not plain Forge, on a seat's log.  Two one-defect probes (the
 * committed corpus has no ws seat recording of a search seat to be the control):
 * a key it never carries, and the key on a log no seat played.
 */
const M62_AI = { policy: 'search', version: 'search-v2', budgetMs: 1500, config: 'ms=1500,cands=6,turns=0,rounds=2,margin=0,maxrounds=0,what=pab,anytime=1' };
{
  const name = 'm62-ai-unexpected-key.jsonl';
  const fs = slice();
  const bytes = write(name, fs, { ...structuredClone(header), transport: 'ws', ai: { ...M62_AI, aiDeck: 'decks/doom-legion.dck' } });
  const why = 'amendment M62 / D414: the header\'s ai is the search\'s own knobs, never a deck or anything else';
  manifest.push({ file: name, level: 'fail', expect: 'session header "ai" carries an unexpected key', why });
  console.log(`  FAIL  ${name}  (${bytes} bytes)  ${why}`);
}
{
  const name = 'm62-ai-without-transport.jsonl';
  const fs = slice();
  const bytes = write(name, fs, { ...structuredClone(header), ai: { ...M62_AI } });
  const why = 'amendment M62 / D414: only a seat a person plays names its AI opponent in the header';
  manifest.push({ file: name, level: 'fail', expect: 'session header "ai" without "transport"', why });
  console.log(`  FAIL  ${name}  (${bytes} bytes)  ${why}`);
}

/*
 * Amendment M61 (D413) -- `state.playable`, what the seat may play from outside
 * the battlefield.  The control writes it as a seat does: on every state, a
 * list at the seat's own priority (one of its own hand cards) and null
 * elsewhere.  Four one-defect probes.
 */
const withPlayable = (fs) => {
  const sts = statesOf(fs);
  sts.forEach((f) => { f.body.playable = null; });
  const first = sts[0].body;
  first.priority = header.seat;
  const me = first.players.find(isViewerSeat);
  const card = me.zones.hand.cards.find((c) => c.hidden !== true);
  if (card === undefined) throw new Error('no full viewer hand card in the slice');
  first.playable = [{ cardId: card.id, zone: 'hand', abilities: [{ abilityId: 9001, label: 'Play a land', isSpell: false }] }];
  return first;
};
{
  const fs = slice();
  withPlayable(fs);
  write('m61-playable-present.jsonl', fs);
  manifest.push({
    file: 'm61-playable-present.jsonl', level: 'pass', expect: 'PASS',
    why: 'amendment M61: state.playable on every state, a list at the seat\'s priority -- the control for the m61 probes',
  });
  console.log('  PASS  m61-playable-present.jsonl  (a seat\'s playable list, no defect)');
}

probe('m61-playable-names-the-opponent-hand.jsonl',
  'amendment M61 / D413: the list is the seat\'s own cards -- naming a card in the opponent\'s hidden hand is a leak',
  'is not a full card in the viewing seat\'s own',
  (fs) => {
    const b = withPlayable(fs);
    const them = b.players.find((p) => !isViewerSeat(p));
    b.playable[0].cardId = them.zones.hand.cards.find((c) => c.hidden === true).id;
  });

probe('m61-playable-on-the-battlefield.jsonl',
  'amendment M61: the list names cards outside the battlefield only',
  'state.playable = ',
  (fs) => {
    const b = withPlayable(fs);
    b.playable[0].zone = 'battlefield';
  });

probe('m61-playable-off-priority.jsonl',
  'amendment M61: the list is written only at the seat\'s own priority, null otherwise',
  'while priority is',
  (fs) => {
    const b = withPlayable(fs);
    b.priority = header.seat === 0 ? 1 : 0;
  });

probe('m61-playable-half-present.jsonl',
  'amendment M61: a seat writes the key on every state -- some with and some without is a broken emitter',
  'M61 (playable) is HALF PRESENT',
  (fs) => {
    withPlayable(fs);
    delete statesOf(fs)[1].body.playable;
  });

/*
 * Amendment M63 (D420) -- `state.activatable`, the battlefield's half.  The
 * control writes it as a seat does (beside M61's playable): on every state, a
 * list at the seat's own priority (one of its own permanents) and null
 * elsewhere.  Four one-defect probes.
 */
const withActivatable = (fs) => {
  const sts = statesOf(fs);
  sts.forEach((f) => { f.body.activatable = null; });
  const first = sts[0].body;
  first.priority = header.seat;
  const me = first.players.find(isViewerSeat);
  const card = me.zones.battlefield.cards.find((c) => c.hidden !== true && c.controller === header.seat);
  if (card === undefined) throw new Error('no full viewer permanent in the slice');
  first.activatable = [{ cardId: card.id, zone: 'battlefield', abilities: [{ abilityId: 9002, label: '{2}, Sacrifice this token: Draw a card.', isSpell: false }] }];
  return first;
};
{
  const fs = slice();
  withActivatable(fs);
  write('m63-activatable-present.jsonl', fs);
  manifest.push({
    file: 'm63-activatable-present.jsonl', level: 'pass', expect: 'PASS',
    why: 'amendment M63: state.activatable on every state, a list at the seat\'s priority -- the control for the m63 probes',
  });
  console.log('  PASS  m63-activatable-present.jsonl  (a seat\'s activatable list, no defect)');
}

probe('m63-activatable-names-the-opponent-permanent.jsonl',
  'amendment M63 / D420: the list is the permanents the seat controls -- naming the opponent\'s is a lie about control',
  'controlled by the viewing seat',
  (fs) => {
    const b = withActivatable(fs);
    const them = b.players.find((p) => !isViewerSeat(p));
    const theirs = them.zones.battlefield.cards.find((c) => c.hidden !== true) ?? them.zones.hand.cards.find((c) => c.hidden === true);
    b.activatable[0].cardId = theirs.id;
  });

probe('m63-activatable-off-the-battlefield.jsonl',
  'amendment M63: the list names battlefield permanents only (a card elsewhere is M61\'s playable)',
  'state.activatable = ',
  (fs) => {
    const b = withActivatable(fs);
    b.activatable[0].zone = 'hand';
  });

probe('m63-activatable-off-priority.jsonl',
  'amendment M63: the list is written only at the seat\'s own priority, null otherwise',
  'state.activatable is a list while priority is',
  (fs) => {
    const b = withActivatable(fs);
    b.priority = header.seat === 0 ? 1 : 0;
  });

probe('m63-activatable-half-present.jsonl',
  'amendment M63: a seat writes the key on every state -- some with and some without is a broken emitter',
  'M63 (activatable) is HALF PRESENT',
  (fs) => {
    withActivatable(fs);
    delete statesOf(fs)[1].body.activatable;
  });

/*
 * Amendments M65 / M66 (D422, D423) -- `input.selectable.chosen` and
 * `input.selectable.playerIds`.  The control adds two inputs after the last
 * state, written as a seat writes them: a targeting input (one of the
 * opponent's permanents offered and chosen, both seats clickable) and a block
 * declaration (the viewer's permanent blocking one of the opponent's).  Five
 * one-defect probes.
 */
const withSelection = (fs) => {
  const sts = statesOf(fs);
  const last = sts[sts.length - 1].body;
  const me = last.players.find(isViewerSeat);
  const them = last.players.find((p) => !isViewerSeat(p));
  const mine = me.zones.battlefield.cards.find((c) => c.hidden !== true && c.controller === header.seat);
  const theirs = them.zones.battlefield.cards.find((c) => c.hidden !== true);
  if (mine === undefined || theirs === undefined) throw new Error('no full permanent on each side in the slice');
  const input = (prompt, selectable) => ({
    v: 1, seq: 0, t: fs[0].t, dir: 's2c', type: 'input',
    body: {
      prompt, focusCardId: null, focusCard: null,
      buttons: { ok: { label: 'OK', enabled: true }, cancel: { label: 'Cancel', enabled: false } },
      selectable, highlighted: [], weak: [], openZones: [],
    },
  });
  const seats = last.players.map((p) => p.id);
  const target = input('Lightning Bolt (90) - Select any target', {
    cardIds: [theirs.id], min: 1, max: 2, mode: 'cards', playerIds: seats,
    chosen: { cardIds: [theirs.id], playerIds: [], blocks: [], attacks: [] },
  });
  const block = input(`Select creatures to block ${theirs.name} (${theirs.id}) or select another attacker to declare blockers for.`, {
    cardIds: [], min: 0, max: 0, mode: 'none', playerIds: [],
    chosen: { cardIds: [mine.id], playerIds: [], blocks: [{ blockerId: mine.id, attackerId: theirs.id }], attacks: [] },
  });
  const at = fs.findIndex((f) => f.type === 'over');
  fs.splice(at, 0, target, block);
  fs.forEach((f, i) => { f.seq = i + 1; });
  return { target: target.body.selectable, block: block.body.selectable, mine, theirs, seats };
};
{
  const fs = slice();
  withSelection(fs);
  write('m65-m66-selection-present.jsonl', fs);
  manifest.push({
    file: 'm65-m66-selection-present.jsonl', level: 'pass', expect: 'PASS',
    why: 'amendments M65 / M66: a targeting input and a block declaration with chosen and playerIds as a seat writes them -- the control for the m65 / m66 probes',
  });
  console.log('  PASS  m65-m66-selection-present.jsonl  (a seat\'s chosen and playerIds, no defect)');
}

probe('m66-playerids-names-no-seat.jsonl',
  'amendment M66 / D423: playerIds names seats -- an id that is no seat is a card id in the wrong list',
  'which is not a seat of this game',
  (fs) => {
    const { target } = withSelection(fs);
    target.playerIds = [...target.playerIds, 77];
  });

probe('m65-chosen-was-never-offered.jsonl',
  'amendment M65 / D422: a target or list entry chosen is one the engine offered this seat in the same input',
  'which was not offered',
  (fs) => {
    const { target, mine } = withSelection(fs);
    target.chosen.cardIds = [mine.id];
  });

probe('m65-block-by-the-opponent.jsonl',
  'amendment M65 / D422: a block declaration is the viewing seat\'s own -- a blocker it does not control is a lie about control',
  'controlled by the viewing seat',
  (fs) => {
    const { block, theirs } = withSelection(fs);
    block.chosen.blocks = [{ blockerId: theirs.id, attackerId: theirs.id }];
    block.chosen.cardIds = [theirs.id];
  });

probe('m65-chosen-shape.jsonl',
  'amendment M65: chosen is exactly {cardIds, playerIds, blocks, attacks}',
  'is not {cardIds, playerIds, blocks, attacks}',
  (fs) => {
    const { target } = withSelection(fs);
    delete target.chosen.attacks;
  });

probe('m65-chosen-half-present.jsonl',
  'amendment M65: a seat writes chosen on every input -- some with and some without is a broken emitter',
  'M65 (chosen) is HALF PRESENT',
  (fs) => {
    const { block } = withSelection(fs);
    delete block.chosen;
  });

/*
 * Amendment M67 (D424) -- the bridge refuses an illegal combat-damage map.
 * The control adds an assign_damage ask after the last state, written as a
 * bridge since M67 writes it (the viewer's creature attacking, blocked by two
 * of the opponent's, no trample: `defenderAllowed: false`), an answer the rule
 * refuses, the re-ask with its reason, and a legal answer.  Two one-defect
 * probes: the illegal answer is followed by something other than a re-ask (it
 * was applied), and `defenderAllowed` written on one ask and not the other.
 */
const withDamageAsk = (fs) => {
  const sts = statesOf(fs);
  const last = sts[sts.length - 1].body;
  const me = last.players.find(isViewerSeat);
  const them = last.players.find((p) => !isViewerSeat(p));
  const mine = me.zones.battlefield.cards.find((c) => c.hidden !== true && c.controller === header.seat);
  const theirs = them.zones.battlefield.cards.filter((c) => c.hidden !== true).slice(0, 2);
  if (mine === undefined || theirs.length < 2) throw new Error('no attacker and two blockers in the slice');
  const ask = (askId, reason) => ({
    v: 1, seq: 0, t: fs[0].t, dir: 's2c', type: 'ask',
    body: {
      askId, kind: 'assign_damage', timeoutMs: 0, attackerId: mine.id, total: 2,
      overrideOrder: true, maySkip: false, defenderAllowed: false, reason,
      targets: [
        { id: 0, defender: true, label: them.name, kind: 'player', playerId: them.id, lethal: null },
        ...theirs.map((c, i) => ({ id: i + 1, defender: false, label: c.name, kind: 'card', cardId: c.id, lethal: 1, card: structuredClone(c) })),
      ],
    },
  });
  const answer = (askId, value, cseq) => ({ v: 1, seq: cseq, t: fs[0].t, dir: 'c2s', type: 'answer', body: { askId, value } });
  const first = ask('a901', null);
  const refusedAnswer = answer('a901', { 0: 2 }, 1);
  const again = ask('a902', `Without trample, a blocked creature can't assign combat damage to ${them.name}. Assign all 2 to the blockers.`);
  const legal = answer('a902', { 1: 1, 2: 1 }, 2);
  const at = fs.findIndex((f) => f.type === 'over');
  fs.splice(at, 0, first, refusedAnswer, again, legal);
  let seq = 0;
  for (const f of fs) if (f.dir !== 'c2s') f.seq = ++seq;
  return { first, again, refusedAnswer, legal };
};
{
  const fs = slice();
  withDamageAsk(fs);
  write('m67-assign-damage-refused.jsonl', fs);
  manifest.push({
    file: 'm67-assign-damage-refused.jsonl', level: 'pass', expect: 'PASS',
    why: 'amendment M67: an illegal assign_damage answer refused and re-asked with a reason, then a legal one -- the control for the m67 probes',
  });
  console.log('  PASS  m67-assign-damage-refused.jsonl  (refused, re-asked, answered legally; no defect)');
}

probe('m67-illegal-damage-applied.jsonl',
  'amendment M67 / D424: damage on the defender while defenderAllowed is false must be refused -- the next ask is the same question with a reason',
  'the bridge applied an illegal damage map',
  (fs) => {
    const { again } = withDamageAsk(fs);
    // The re-ask became some other question: the bridge went on as if the
    // illegal map had been taken.
    again.body = { askId: 'a902', kind: 'confirm', timeoutMs: 0, prompt: 'Continue?', title: '', yesLabel: 'Yes', noLabel: 'No', defaultYes: true, card: null };
    const i = fs.findIndex((f) => f.dir === 'c2s' && f.body.askId === 'a902');
    fs[i].body.value = true;
  });

probe('m67-defender-allowed-half-present.jsonl',
  'amendment M67: a bridge since M67 writes defenderAllowed on every assign_damage ask -- some with and some without is a broken emitter',
  'M67 (assign_damage.defenderAllowed) is HALF PRESENT',
  (fs) => {
    const { again } = withDamageAsk(fs);
    delete again.body.defenderAllowed;
  });

/*
 * Amendment M68 (D426) -- every other ask kind's answer is checked too.  The
 * control adds a choose_list ask after the last state, written as a bridge
 * since M68 writes it (`reason` null), an answer the rule refuses (none chosen
 * where exactly one must be), the re-ask with its reason, and a legal answer.
 * Two one-defect probes: the illegal answer followed by some other question
 * (it was applied), and `reason` written on one choose_list and not the other.
 */
const withListAsk = (fs) => {
  const sts = statesOf(fs);
  const last = sts[sts.length - 1].body;
  const me = last.players.find(isViewerSeat);
  const hand = me.zones.hand.cards.filter((c) => c.hidden !== true).slice(0, 2);
  if (hand.length < 2) throw new Error('no two cards in the viewer\'s hand in the slice');
  const ask = (askId, reason) => ({
    v: 1, seq: 0, t: fs[0].t, dir: 's2c', type: 'ask',
    body: {
      askId, kind: 'choose_list', timeoutMs: 0, prompt: 'Choose a card to discard',
      options: hand.map((c, i) => ({ id: i, label: c.name, kind: 'card', cardId: c.id, card: structuredClone(c) })),
      preselected: [], min: 1, max: 1, reveal: false, reason,
    },
  });
  const answer = (askId, value, cseq) => ({ v: 1, seq: cseq, t: fs[0].t, dir: 'c2s', type: 'answer', body: { askId, value } });
  const first = ask('a911', null);
  const refusedAnswer = answer('a911', [], 1);
  const again = ask('a912', 'Choose exactly 1 option (this answer chose 0).');
  const legal = answer('a912', [1], 2);
  const at = fs.findIndex((f) => f.type === 'over');
  fs.splice(at, 0, first, refusedAnswer, again, legal);
  let seq = 0;
  for (const f of fs) if (f.dir !== 'c2s') f.seq = ++seq;
  return { first, again, refusedAnswer, legal };
};
{
  const fs = slice();
  withListAsk(fs);
  write('m68-answer-refused.jsonl', fs);
  manifest.push({
    file: 'm68-answer-refused.jsonl', level: 'pass', expect: 'PASS',
    why: 'amendment M68: an illegal choose_list answer refused and re-asked with a reason, then a legal one -- the control for the m68 probes',
  });
  console.log('  PASS  m68-answer-refused.jsonl  (refused, re-asked, answered legally; no defect)');
}

probe('m68-illegal-answer-applied.jsonl',
  'amendment M68 / D426: a choose_list answer outside [min, max] must be refused -- the next ask is the same question with a reason',
  'the bridge applied an illegal answer',
  (fs) => {
    const { again } = withListAsk(fs);
    again.body = { askId: 'a912', kind: 'confirm', timeoutMs: 0, prompt: 'Continue?', title: '', yesLabel: 'Yes', noLabel: 'No', defaultYes: true, card: null, reason: null };
    const i = fs.findIndex((f) => f.dir === 'c2s' && f.body.askId === 'a912');
    fs[i].body.value = true;
  });

probe('m68-reason-half-present.jsonl',
  'amendment M68: a bridge since M68 writes reason on every ask of a kind -- some with and some without is a broken emitter',
  'M68 (choose_list.reason) is HALF PRESENT',
  (fs) => {
    const { again } = withListAsk(fs);
    delete again.body.reason;
  });

writeFileSync(`${OUT_DIR}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`wrote ${manifest.length} files + manifest.json to ${OUT_DIR}/`);
