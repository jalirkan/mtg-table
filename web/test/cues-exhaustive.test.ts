/*
 * mtg-table — web/test/cues-exhaustive.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Every event kind maps to a cue** (report 09 §10.1), and **the cue file is
 * sane** (§10.2).
 *
 * The point of this file is the pair of guarantees §7.3 claims for the ladder:
 * it never throws and never returns `undefined`, and every id it can return
 * exists in the registry. Those are what let the arena treat a cue miss the way
 * the board treats a missing image — cosmetic, never a blocker.
 *
 * `EVENT_KINDS` is one `const` in `protocol.ts` that is both the runtime list
 * and the TypeScript union, and `DEFAULT_CUES` is typed `Record<EventKind,
 * CueSpec>`; so adding a kind to the protocol and forgetting the cue table is a
 * **compile error** as well as a failure here. This runs under `node --test`
 * with type stripping and no browser — `cues/` imports no three at all, which is
 * the whole point of report 09 §2.4's annotations.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { archetypeKey, looserArchetypeKeys, primaryTypeOf } from '../src/arena/cues/archetype.ts';
import { DEFAULT_CUES, DEFAULT_SELECTOR_CUES, defaultCueIds } from '../src/arena/cues/defaults.ts';
import { REGISTRY, counterLabel } from '../src/arena/cues/registry.ts';
import { cuesFor, resolve, selectorsFor } from '../src/arena/cues/resolve.ts';
import {
  IDENTITY,
  NullStage,
  composeInto,
  composeOffsets,
  offsetFrom,
  resetOffset,
  type Offset,
} from '../src/arena/cues/stage.ts';
import {
  EMPTY_CUE_DATA,
  EVENT_KINDS,
  NO_OP,
  counterToken,
  type CueData,
} from '../src/arena/cues/types.ts';
import { isValidSelector, mergeCueData, validateCues } from '../src/arena/cues/validate.ts';
import type { AnyCard, Frame, GameEvent } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const CUES_JSON = JSON.parse(
  readFileSync(`${HERE}../src/arena/cues/cues.json`, 'utf8'),
) as unknown;
const DECK = fileURLToPath(new URL('../../decks/pacho-shield.dck', import.meta.url));

// ---------------------------------------------------------------------------
// Synthetic frames — the cases the corpus does not happen to contain
// ---------------------------------------------------------------------------

const EMPTY = { count: 0, cards: [] as AnyCard[] };

function card(id: number, extra: Record<string, unknown> = {}): AnyCard {
  return {
    id,
    name: `Card ${String(id)}`,
    setCode: 'MSH',
    manaCost: '{1}{W}',
    types: 'Creature - Human Spy Hero',
    power: '2',
    toughness: '2',
    loyalty: null,
    damage: 0,
    counters: {},
    tapped: false,
    sick: false,
    attacking: false,
    blocking: false,
    faceDown: false,
    token: false,
    alt: null,
    attachedToId: null,
    attachmentIds: [],
    controller: 0,
    owner: 0,
    zone: 'battlefield',
    abilities: [],
    ...extra,
  } as AnyCard;
}

function player(id: number, zones: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    name: `p${String(id)}`,
    isAi: id !== 0,
    life: 20,
    poison: 0,
    counters: {},
    manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    zones: {
      hand: EMPTY,
      battlefield: EMPTY,
      graveyard: EMPTY,
      exile: EMPTY,
      command: EMPTY,
      library: { count: 30, cards: [] },
      ...zones,
    },
  };
}

function stateWith(
  players: Array<Record<string, unknown>>,
  extra: Record<string, unknown> = {},
): ClientState {
  const hello = {
    v: 1,
    seq: 1,
    t: 1,
    type: 'hello_ok',
    body: { gameId: 'g', you: 0, players: [], protocol: 1 },
  } as unknown as Frame;
  const state = {
    v: 1,
    seq: 2,
    t: 2,
    type: 'state',
    body: {
      gameId: 'g',
      turn: 1,
      round: 1,
      phase: 'MAIN1',
      activePlayer: 0,
      priority: 0,
      gameOver: null,
      players,
      stack: [],
      stackCards: [],
      combat: null,
      events: [],
      ...extra,
    },
  } as unknown as Frame;
  return reduce(reduce(initialState(), hello), state);
}

/** One synthetic event of each kind, with a body the protocol would accept. */
function synthEvent(kind: string): GameEvent {
  const base: Record<string, unknown> = { kind };
  switch (kind) {
    case 'zone':
      return { ...base, cardId: 1, from: { zone: 'hand', player: 0 }, to: { zone: 'battlefield', player: 0 } } as GameEvent;
    case 'cast':
      return { ...base, stackId: 9, cardId: 1, controller: 0, text: '' } as GameEvent;
    case 'resolved':
      return { ...base, cardId: 1, fizzled: false } as GameEvent;
    case 'unstacked':
    case 'sacrificed':
      return { ...base, cardId: 1 } as GameEvent;
    case 'attackers':
      return { ...base, player: 0, bands: [{ defender: { kind: 'player', id: 1 }, attackerIds: [1] }] } as GameEvent;
    case 'blockers':
      return { ...base, defendingPlayer: 1, blocks: [{ attackerId: 1, blockerIds: [2] }] } as GameEvent;
    case 'damage':
      return { ...base, target: { kind: 'card', id: 1 }, sourceCardId: 2, amount: 3, combat: true, damageType: null } as GameEvent;
    case 'life':
      return { ...base, player: 0, from: 20, to: 17 } as GameEvent;
    case 'poison':
      return { ...base, player: 0, sourcePlayer: 1, from: 0, amount: 1 } as GameEvent;
    case 'tap':
      return { ...base, cardId: 1, tapped: true } as GameEvent;
    case 'counters':
      return { ...base, cardId: 1, counter: 'P1P1', from: 0, to: 1 } as GameEvent;
    case 'attach':
      return { ...base, cardId: 1, to: { kind: 'card', id: 2 } } as GameEvent;
    case 'land':
      return { ...base, player: 0, cardId: 1 } as GameEvent;
    case 'stats':
      return { ...base, cardIds: [1], transform: false } as GameEvent;
    case 'turn':
      return { ...base, player: 0, turn: 3 } as GameEvent;
    case 'phase':
      return { ...base, player: 0, phase: 'MAIN1' } as GameEvent;
    case 'combat_end':
      return { ...base, attackerIds: [1], blockerIds: [2] } as GameEvent;
    case 'shuffle':
    case 'mulligan':
    case 'foretold':
      return { ...base, player: 0 } as GameEvent;
    case 'outcome':
      return { ...base, winner: 0, lastTurn: 9 } as GameEvent;
    case 'scry':
      return { ...base, player: 0, toTop: 1, toBottom: 1 } as GameEvent;
    case 'surveil':
      return { ...base, player: 0, toLibrary: 1, toGraveyard: 1 } as GameEvent;
    case 'phased':
      return { ...base, cardId: 1, phasedOut: true } as GameEvent;
    default:
      // The unknown-kind case of §3.6 rule 3, and the empty string with it.
      // Deliberately not a `GameEvent`: this is the shape the reducer drops and
      // the ladder must still answer for.
      return base as unknown as GameEvent;
  }
}

const SAMPLE_STATE = stateWith([
  player(0, { battlefield: { count: 2, cards: [card(1), card(2)] } }),
  player(1),
]);

// ---------------------------------------------------------------------------
// §10.1 — the ladder is total
// ---------------------------------------------------------------------------

test('cues: every event kind resolves to a registered cue, and never to undefined', () => {
  const kinds = [...EVENT_KINDS, '__unknown__', ''];
  const rows: string[] = [];
  for (const kind of kinds) {
    const event = synthEvent(kind);
    const spec = resolve(
      selectorsFor(event, SAMPLE_STATE),
      kind,
      card(1),
      EMPTY_CUE_DATA,
    ).spec;
    assert.ok(spec !== undefined, `${kind}: the ladder returned undefined`);
    assert.equal(typeof spec.cue, 'string');
    assert.ok(REGISTRY.has(spec.cue), `${kind}: cue "${spec.cue}" is not in the registry`);
    assert.ok(spec.ms >= 0 && spec.ms <= 4000, `${kind}: ms ${String(spec.ms)} out of range`);
    rows.push(`${kind || '(empty)'} → ${spec.cue} (${String(spec.ms)} ms)`);
  }
  // The two kinds that are not in the protocol must be the only no-ops.
  const noops = rows.filter((row) => row.includes(`→ ${NO_OP} `));
  assert.equal(noops.length, 2, `only the two unknown kinds may be no-ops, saw:\n${noops.join('\n')}`);
  console.log(`  the §6 table, resolved:\n    ${rows.join('\n    ')}`);
});

test('cues: the default table covers every protocol kind and every id exists', () => {
  for (const kind of EVENT_KINDS) {
    const spec = DEFAULT_CUES[kind];
    assert.ok(spec !== undefined, `no default cue for kind "${kind}"`);
    assert.ok(REGISTRY.has(spec.cue), `default for "${kind}" names a missing cue "${spec.cue}"`);
  }
  for (const [selector, spec] of Object.entries(DEFAULT_SELECTOR_CUES)) {
    assert.ok(isValidSelector(selector), `default selector "${selector}" is not in the grammar`);
    assert.ok(REGISTRY.has(spec.cue), `selector "${selector}" names a missing cue "${spec.cue}"`);
    assert.ok(spec.ms >= 0 && spec.ms <= 4000);
  }
  for (const id of defaultCueIds()) assert.ok(REGISTRY.has(id));
});

test('cues: every registered cue survives a full run and leaves the stage empty', () => {
  // The §5.1 contract, cue by cue: `apply(0…1)` then `end()` must return the
  // stage to identity. This is the unit-level version of the fixture sweep's
  // decay assertion, and it covers the cues no fixture happens to fire.
  for (const [id, impl] of REGISTRY) {
    const stage = new NullStage();
    const ctx = {
      // T3: the running cue knows its own registry id, because the clip lane is
      // keyed on it (report 13 §3.5). Passing the real id here is what makes this
      // the unit-level version of the fixture sweep's decay assertion for the
      // CLIP lane too — a cue with a `CLIP_FOR` entry sets a clip on both its
      // targets when `apply` runs, and `end()` has to release both.
      id,
      targets: [1, 2],
      players: [0, 1],
      params: { amount: 3, dir: 1, counter: 'P1P1', delta: 1, toId: 2, attackerId: 1, turn: 4 },
      ms: 500,
      key: `k-${id}`,
      reducedMotion: false,
    };
    for (const t of [0, 0.13, 0.5, 0.87, 1]) impl.apply(ctx, t, stage);
    impl.end(ctx, stage);
    assert.equal(stage.offsets.size, 0, `${id}: left ${String(stage.offsets.size)} offsets behind`);
    assert.equal(stage.effects.size, 0, `${id}: left ${String(stage.effects.size)} effects behind`);
    assert.equal(stage.clips.size, 0, `${id}: left ${String(stage.clips.size)} clips behind`);
  }
});

test('cues: a hidden card resolves, animates and carries no name', () => {
  // The five-key stub of §3.3: no `types`, no `manaCost`, no `name`. It must
  // archetype as the colourless wildcard and take the defaults.
  const stub = { id: 7, zone: 'hand', controller: 1, owner: 1, hidden: true } as unknown as AnyCard;
  assert.equal(primaryTypeOf(stub), 'unknown');
  assert.equal(archetypeKey(stub), 'unknown/C');
  const state = stateWith([player(0), player(1, { hand: { count: 1, cards: [stub] } })]);
  const cues = cuesFor(
    { kind: 'zone', cardId: 7, from: { zone: 'library', player: 1 }, to: { zone: 'hand', player: 1 } },
    state,
    EMPTY_CUE_DATA,
  );
  assert.equal(cues.length, 1);
  assert.equal(cues[0]?.id, 'zone.draw');
  for (const value of Object.values(cues[0]?.params ?? {})) {
    assert.ok(typeof value !== 'string' || !value.includes('Card'), 'a cue must carry no card name');
  }
});

test('cues: the selector ladder prefers the card, then the archetype, then the default', () => {
  const data: CueData = {
    version: 1,
    cards: { 'Card 1': { 'zone:*>battlefield': { cue: 'fx.glow', ms: 100 } } },
    archetypes: { 'creature/W': { 'zone:*>battlefield': { cue: 'fx.ripple', ms: 200 } } },
  };
  const event = synthEvent('zone');
  const selectors = selectorsFor(event, SAMPLE_STATE);

  assert.equal(resolve(selectors, 'zone', card(1, { name: 'Card 1' }), data).spec.cue, 'fx.glow');
  assert.equal(resolve(selectors, 'zone', card(1, { name: 'Other' }), data).spec.cue, 'fx.ripple');
  assert.equal(
    resolve(selectors, 'zone', card(1, { name: 'Other', manaCost: '{1}{G}' }), data).spec.cue,
    'zone.enters',
  );
  assert.equal(resolve(selectors, 'zone', null, EMPTY_CUE_DATA).spec.cue, 'zone.enters');
});

test('cues: the archetype key and its looser forms', () => {
  assert.equal(archetypeKey(card(1, { types: 'Basic Land — Plains', manaCost: null })), 'land/C');
  assert.equal(archetypeKey(card(1, { types: 'Artifact — Equipment', manaCost: '{2}' })), 'equipment/C');
  assert.equal(archetypeKey(card(1, { types: 'Instant', manaCost: '{U}' })), 'instant/U');
  assert.equal(archetypeKey(card(1, { types: 'Creature — Hero', manaCost: '{W}{U}' })), 'creature/WU');
  // Multi-colour skips the colour-only rung entirely rather than claiming to be
  // colourless (§7.3's last line).
  const gold = looserArchetypeKeys(card(1, { types: 'Creature — Hero', manaCost: '{W}{U}' }));
  assert.deepEqual(gold, ['creature/*', '*/*']);
  const mono = looserArchetypeKeys(card(1, { types: 'Creature — Hero', manaCost: '{W}' }));
  assert.deepEqual(mono, ['creature/*', '*/W', '*/*']);
});

test('cues: selectors are most-specific first and end with the bare kind', () => {
  const zone = selectorsFor(synthEvent('zone'), SAMPLE_STATE);
  assert.equal(zone[0], 'zone:hand>battlefield');
  assert.equal(zone[zone.length - 1], 'zone');
  assert.ok(zone.includes('zone:*>battlefield'));

  const alone = selectorsFor(synthEvent('attackers'), SAMPLE_STATE);
  assert.equal(alone[0], 'attackers:alone');

  const counters = selectorsFor(synthEvent('counters'), SAMPLE_STATE);
  assert.deepEqual(counters.slice(0, 3), ['counters:P1P1+', 'counters:P1P1', 'counters:+']);

  // §6's lethal qualifier: the creature is gone from the battlefield, so the
  // damage was the last of it.
  const dead = stateWith([player(0), player(1)]);
  const lethal = selectorsFor(synthEvent('damage'), dead);
  assert.equal(lethal[0], 'damage:lethal');
  // …and a 2/2 that took 1 is not lethal.
  const alive = stateWith([player(0, { battlefield: { count: 1, cards: [card(1, { damage: 1 })] } })]);
  const survived = selectorsFor(
    { kind: 'damage', target: { kind: 'card', id: 1 }, sourceCardId: 2, amount: 1, combat: true, damageType: null },
    alive,
  );
  assert.equal(survived[0], 'damage:card');
});

// ---------------------------------------------------------------------------
// §10.2 — the data file
// ---------------------------------------------------------------------------

test('cues.json: validates with no errors against the real registry', () => {
  const cueIds = new Set(REGISTRY.keys());
  const deckNames = deckCardNames();
  const { data, errors, warnings } = validateCues(CUES_JSON, { cueIds, deckNames });
  assert.deepEqual(errors, [], `cues.json has errors:\n${errors.map((e) => `${e.where}: ${e.message}`).join('\n')}`);
  for (const warning of warnings) console.log(`  warning ${warning.where}: ${warning.message}`);
  assert.equal(data.version, 1);
  // Every archetype key the file uses must be one `archetypeKey()` can produce.
  for (const key of Object.keys(data.archetypes)) {
    assert.ok(/^[a-z*]+\/[A-Z*]+$/.test(key), `archetype key "${key}" is not <type>/<colour>`);
  }
  // And it must actually reach the ladder: a land entering the battlefield in
  // this deck resolves through `land/*`.
  const merged = mergeCueData(EMPTY_CUE_DATA, data);
  const land = card(5, { types: 'Basic Land — Plains', manaCost: null });
  const hit = resolve(selectorsFor(synthEvent('zone'), SAMPLE_STATE), 'zone', land, merged);
  assert.equal(hit.source, 'archetype');
  assert.equal(hit.spec.cue, 'land.rise');
});

test('cues.json: every card name in it is a card in the deck', () => {
  const names = deckCardNames();
  assert.ok(names.size >= 20, `expected the 40-card deck's names, saw ${String(names.size)}`);
  const { warnings } = validateCues(CUES_JSON, { cueIds: new Set(REGISTRY.keys()), deckNames: names });
  const typos = warnings.filter((w) => w.message.includes('no card of that name'));
  assert.deepEqual(typos, [], `cues.json names cards the deck does not have:\n${typos.map((t) => t.where).join('\n')}`);
});

test('validate: the negative controls — every error class is caught', () => {
  const cueIds = new Set(REGISTRY.keys());
  const bad = {
    version: 2,
    cards: {
      Nobody: {
        'zone:*>battlefield': { cue: 'no.such.cue', ms: 100 },
        'not a selector': { cue: 'fx.glow', ms: 100 },
        tap: { cue: 'fx.glow', ms: 9999 },
        cast: { cue: 'fx.glow', ms: 100, params: { colour: { r: 1 } } },
      },
    },
    archetypes: {},
  };
  const { data, errors } = validateCues(bad, { cueIds, deckNames: new Set(['Real Card']) });
  const messages = errors.map((e) => `${e.where}: ${e.message}`).join('\n');
  assert.ok(messages.includes('version must be 1'), messages);
  assert.ok(messages.includes('not in the cue registry'), messages);
  assert.ok(messages.includes('not a selector'), messages);
  assert.ok(messages.includes('[0, 4000]'), messages);
  assert.ok(messages.includes('must be a number, a string or a boolean'), messages);
  // …and the file is still usable: the bad entries are dropped, not the file.
  assert.deepEqual(data.cards['Nobody'], {});
});

test('validate: an unknown field is an ERROR, and `_` keys are comments', () => {
  const cueIds = new Set(REGISTRY.keys());
  // Every one of these is a real typo shape: a misspelled duration, a field
  // that belongs on a different object, a `presence` axis that does not exist.
  // A validator that ignored them would leave each one looking like it worked.
  const bad = {
    version: 1,
    nonsense: 1,
    cards: {
      'Peggy Carter, Secret Agent': {
        'attackers:alone': { cue: 'fx.glow', mss: 600 },
        presence: { hoverZ: 1 },
      },
      'Nick Fury, Spymaster': {
        attackers: { cue: 'fx.glow', ms: 100, colour: '#fff' },
      },
      'Quake, Agent of S.H.I.E.L.D.': {
        presence: { hoverY: 99 },
      },
    },
    archetypes: {},
  };
  const { errors } = validateCues(bad, { cueIds });
  const messages = errors.map((e) => `${e.where}: ${e.message}`).join('\n');
  assert.ok(messages.includes('unknown top-level field "nonsense"'), messages);
  assert.ok(messages.includes('unknown cue-entry field "mss"'), messages);
  assert.ok(messages.includes('unknown cue-entry field "colour"'), messages);
  assert.ok(messages.includes('unknown presence field "hoverZ"'), messages);
  assert.ok(messages.includes('presence.hoverY must be within'), messages);

  // …and the comment convention, which is what makes `cues.json` readable at
  // all: JSON has no comments, so a key beginning with `_` is one.
  const commented = {
    version: 1,
    _comment: ['why this file exists'],
    cards: { Plains: { _note: 'terrain', tap: { cue: 'fx.ripple', ms: 220 } } },
    archetypes: { 'land/*': { _note: 'every land', tap: { cue: 'fx.ripple', ms: 220 } } },
  };
  const clean = validateCues(commented, { cueIds });
  assert.deepEqual(clean.errors, []);
  assert.deepEqual(Object.keys(clean.data.cards['Plains'] ?? {}), ['tap']);
  assert.deepEqual(Object.keys(clean.data.archetypes['land/*'] ?? {}), ['tap']);
});

test('cues.json: the S.H.I.E.L.D. table is present, keyed off real event kinds', () => {
  const cueIds = new Set(REGISTRY.keys());
  const { data, errors } = validateCues(CUES_JSON, { cueIds, deckNames: deckCardNames() });
  assert.deepEqual(errors, []);

  // The cards docs/ideas/arena-mode.md's table and the M7 brief name by hand.
  for (const name of [
    'Ant-Man, Reformed Rogue',
    'Wasp, Shrinking Savior',
    'Quake, Agent of S.H.I.E.L.D.',
    'Nick Fury, Spymaster',
    'Agent Phil Coulson',
    'Peggy Carter, Secret Agent',
    'S.H.I.E.L.D. Helicarrier',
    'Helicarrier Strike',
    'Web Up',
    'Aerial Doombot',
    'A.I.M. Scientists',
    'Bold Biochemist',
    'Pym Particles',
    'Quantum Reduction',
    'Thriving Heath',
    'Thriving Isle',
  ]) {
    const entry = data.cards[name];
    assert.ok(entry !== undefined, `${name} has no cue entry`);
    assert.ok(Object.keys(entry).length > 0, `${name}'s entry is empty after validation`);
    for (const [selector, spec] of Object.entries(entry)) {
      assert.ok(isValidSelector(selector), `${name}: "${selector}" is not a selector §7.3 can emit`);
      assert.ok(REGISTRY.has(spec.cue), `${name}: "${spec.cue}" is not a cue`);
    }
  }

  // §5.1's exception: the two cards that hover do it as a `presence`, which is a
  // LAYOUT rule — a cue would decay and put them back down on the first skip.
  const presence = data.presence ?? {};
  assert.ok((presence['S.H.I.E.L.D. Helicarrier']?.hoverY ?? 0) > 0.5, 'the Helicarrier does not hover');
  assert.ok((presence['Aerial Doombot']?.hoverY ?? 0) > 0, 'the Doombot does not hover');
  assert.ok((presence['Wasp, Shrinking Savior']?.hoverY ?? 0) > 0, 'the Wasp does not hover');
});

test('cues: the wire spells counters `+1/+1`, and the selector grammar says `P1P1`', () => {
  // The defect this catches is a selector that can never match: §7.3 and
  // docs/protocol.md §3.6 both say the counter arrives as a `CounterType` name
  // like `P1P1`; every counter value in the committed corpus is `+1/+1` or
  // `Spore`. Without `counterToken`, `counters:P1P1+` was dead data.
  assert.equal(counterToken('+1/+1'), 'P1P1');
  assert.equal(counterToken('P1P1'), 'P1P1');
  assert.equal(counterToken('-1/-1'), 'M1M1');
  assert.equal(counterToken('Spore'), 'SPORE');

  const event = { kind: 'counters', cardId: 1, counter: '+1/+1', from: 0, to: 1 } as GameEvent;
  const selectors = selectorsFor(event, SAMPLE_STATE);
  assert.deepEqual(selectors.slice(0, 3), ['counters:P1P1+', 'counters:P1P1', 'counters:+']);

  // …and the pip the cue draws reads `+1/+1`, not `++1/+1`.
  assert.equal(counterLabel('+1/+1', 1), '+1/+1');
  assert.equal(counterLabel('-1/-1', -1), '−1/−1');
  assert.equal(counterLabel('Spore', 2), '2× +Spore');
});

test('validate: the selector grammar accepts §7.3 and nothing else', () => {
  for (const good of [
    'zone',
    'zone:hand>battlefield',
    'zone:*>graveyard',
    'zone:battlefield>*',
    'attackers:alone',
    'damage:lethal',
    'damage:player',
    'counters:P1P1',
    'counters:P1P1+',
    'counters:-',
    'attach:off',
    'stats:transform',
    'tap:*',
    'presence',
  ]) {
    assert.ok(isValidSelector(good), `"${good}" should be a valid selector`);
  }
  for (const bad of ['', 'nonsense', 'zone:', 'zone:hand>', 'damage:whenever', 'tap:sometimes', 'cast:{W}']) {
    assert.ok(!isValidSelector(bad), `"${bad}" should not be a valid selector`);
  }
});

/**
 * The deck's card names, parsed out of `decks/pacho-shield.dck` — §10.2's typo
 * net. The format is `N Name|SET`, in `[Main]` / `[Sideboard]` sections.
 */
function deckCardNames(): Set<string> {
  const names = new Set<string>();
  const text = readFileSync(DECK, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('[') || trimmed.includes('=')) continue;
    const match = /^\d+\s+(.+)$/.exec(trimmed);
    if (match === null) continue;
    names.add((match[1] ?? '').split('|')[0]!.trim());
  }
  return names;
}

// ---------------------------------------------------------------------------
// §9.2 rule 6 — the allocation-free offset composition, against the readable one
// ---------------------------------------------------------------------------

/**
 * **`composeInto` must be `composeOffsets ∘ offsetFrom`, exactly.**
 *
 * `SceneStage.setOffset` runs once per live cue per target per frame and used to
 * allocate two objects each time; it now composes into one pooled `Offset` per
 * card id. That is only safe while the in-place version and the readable one
 * agree, and "they obviously do" is how a renderer starts drifting from its own
 * spec — so the two are run against each other over every field, in both the
 * from-identity case (one writer) and the composition case (two cues on one
 * card in one batch, which is reachable: a creature that takes damage *and*
 * dies).
 */
test('composeInto is composeOffsets ∘ offsetFrom, field for field', () => {
  const partials: Array<Partial<Offset>> = [
    {},
    { dx: 1.5 },
    { dy: -0.25, dz: 3 },
    { dRotX: 0.4, dRotZ: -1.1 },
    { scale: 0.5 },
    { squashX: 1.3, squashY: 0.7 },
    { opacity: 0.25 },
    { tint: '#ff0000' },
    { tint: null },
    { glow: 0.8, glowColour: '#00ff88' },
    { glowColour: null },
    { dissolve: 0.35 },
    {
      dx: -2,
      dy: 0.5,
      dz: 0.1,
      dRotX: -0.2,
      dRotZ: 0.9,
      scale: 1.2,
      squashX: 0.9,
      squashY: 1.4,
      opacity: 0.6,
      tint: '#3366ff',
      glow: 0.3,
      glowColour: '#ffffff',
      dissolve: 0.7,
    },
  ];

  for (const first of partials) {
    // One writer: identity ⊕ partial.
    const pooled: Offset = { ...IDENTITY };
    resetOffset(pooled);
    composeInto(pooled, first);
    assert.deepEqual(
      pooled,
      offsetFrom(first),
      `composeInto onto identity differs from offsetFrom for ${JSON.stringify(first)}`,
    );

    for (const second of partials) {
      // Two writers on one card, in one frame.
      const inPlace: Offset = { ...IDENTITY };
      resetOffset(inPlace);
      composeInto(inPlace, first);
      composeInto(inPlace, second);
      assert.deepEqual(
        inPlace,
        composeOffsets(offsetFrom(first), offsetFrom(second)),
        `composeInto differs when composing ${JSON.stringify(first)} then ${JSON.stringify(second)}`,
      );
    }
  }

  // And `resetOffset` really is identity again, so a pooled object cannot carry
  // last frame's glow into this one.
  const dirty: Offset = { ...IDENTITY, dx: 9, glow: 1, tint: '#123456', dissolve: 0.5 };
  resetOffset(dirty);
  assert.deepEqual(dirty, { ...IDENTITY });
});
