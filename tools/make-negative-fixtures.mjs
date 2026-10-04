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

writeFileSync(`${OUT_DIR}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`wrote ${manifest.length} files + manifest.json to ${OUT_DIR}/`);
