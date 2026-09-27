/*
 * mtg-table — web/test/attach.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **T5: the attachment manifestation, over the whole corpus** (report 13 §4).
 *
 * The same shape as `figures.test.ts` and `tiles.test.ts`, and for the same
 * reason: `figures/attach.ts` and `figures/pose.ts` import no three, no React and
 * no DOM, so the real ladder and the real pose function run over all eighteen
 * committed recordings under `node --test` with no browser and no GPU.
 *
 * The number this file exists to pin is **985 frames showing an attachment against
 * 28 `attach` events** (§4.1): an aura built as a cue would be invisible for 97%
 * of the time it should be on screen, and every assertion below is about the pose
 * being there in all 985 of them.
 *
 * It prints the census every run — attaching card → kind → rung → frame-instances
 * — so an entry that never fires says so on the day it is added.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import * as THREE from 'three';

import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import {
  ATTACH_SUBTYPE_ORDER,
  MAX_POSE_OVERLAYS,
  MAX_STATIONS,
  STATION_LIFT,
  STATION_SIZE,
  attachFor,
  attachSubtypeKey,
  attachSubtypesOf,
  manifestationOf,
  stationsOf,
} from '../src/arena/figures/attach.ts';
import { validateCues } from '../src/arena/cues/validate.ts';
import { figurePose } from '../src/arena/figures/pose.ts';
import { colourHex } from '../src/arena/colour.ts';
import { REGISTRY } from '../src/arena/cues/registry.ts';
import { NullStage } from '../src/arena/cues/stage.ts';
import { ATTACH_KINDS, attachDataOf, isAttachKind } from '../src/arena/figures/types.ts';
import { validateFigures, validateModels } from '../src/arena/figures/validate.ts';
import { REST_POSE, projectToNdc } from '../src/arena/camera.ts';
import { FIGURE_HEIGHT, FIGURE_MAX_WIDTH, layout, standPointOf } from '../src/arena/layout.ts';
import { isHidden, type AnyCard, type Frame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

const MODELS = validateModels(modelsJson).data;
const MODEL_IDS = new Set(Object.keys(MODELS.models));
const VALIDATION = validateFigures(figuresJson, { modelIds: MODEL_IDS });
const DATA = VALIDATION.data;
const ATTACH = attachDataOf(DATA);

function fixtureFiles(): string[] {
  const out: string[] = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (name.endsWith('.jsonl')) out.push(FIXTURES + dir + name);
    }
  }
  return out;
}

function framesOf(file: string): ClientState[] {
  const out: ClientState[] = [];
  const log = parseFrameLog(readFileSync(file, 'utf8'));
  let state = initialState(log.header);
  for (const frame of log.frames as Frame[]) {
    state = reduce(state, frame);
    if (frame.type === 'state') out.push(state);
  }
  return out;
}

const card = (over: Record<string, unknown>): AnyCard =>
  ({ id: 1, name: 'x', types: '', manaCost: null, ...over }) as unknown as AnyCard;

// ---------------------------------------------------------------------------
// The data and the ladder
// ---------------------------------------------------------------------------

test('attach: the attachments block validates with zero errors', () => {
  assert.deepEqual(VALIDATION.errors, [], 'figures.json has errors');
  assert.ok(Object.keys(ATTACH.attachments).length >= 4, 'the attachment table is empty');
  for (const [key, spec] of Object.entries(ATTACH.attachments)) {
    assert.ok(isAttachKind(spec.kind), `attachments["${key}"].kind is not a kind`);
    assert.ok(spec.hostScale > 0 && spec.hostScale <= 2, `attachments["${key}"].hostScale`);
    assert.ok(spec.strength >= 0 && spec.strength <= 1, `attachments["${key}"].strength`);
  }
  assert.ok(isAttachKind(ATTACH.default.kind));
  // Both recognised subtypes must have a row, or the corpus's 2,030 attachment
  // instances fall to `*` and the census below says so.
  for (const subtype of ATTACH_SUBTYPE_ORDER) {
    assert.ok(
      Object.hasOwn(ATTACH.attachments, attachSubtypeKey(subtype)),
      `no row for ${attachSubtypeKey(subtype)}`,
    );
  }
  // §4.4 — the default is the halo, and that is what makes the feature finished
  // rather than seeded: an aura nobody wrote an entry for still reads.
  assert.equal(ATTACH.default.kind, 'halo');
  assert.equal(ATTACH.attachments['*']?.kind, 'halo');
});

test('attach: attachSubtypesOf reads the words after the dash', () => {
  assert.deepEqual(attachSubtypesOf(card({ types: 'Enchantment - Aura' })), ['aura']);
  assert.deepEqual(attachSubtypesOf(card({ types: 'Artifact - Equipment' })), ['equipment']);
  // Both, in the declared order, for a card that is somehow both.
  assert.deepEqual(attachSubtypesOf(card({ types: 'Artifact Enchantment - Aura Equipment' })), [
    'aura',
    'equipment',
  ]);
  // The word must be in the SUBTYPE half: a card named for an aura is not one.
  assert.deepEqual(attachSubtypesOf(card({ types: 'Sorcery' })), []);
  assert.deepEqual(attachSubtypesOf({ id: 2, hidden: true } as unknown as AnyCard), []);
});

test('attach: the ladder is per-name, then subtype, then `*`', () => {
  const quantum = attachFor(card({ name: 'Quantum Reduction', types: 'Enchantment - Aura' }), ATTACH);
  assert.equal(quantum.rung, 'card');
  assert.equal(quantum.spec.kind, 'shrink');
  assert.ok(quantum.spec.hostScale < 0.5, 'Quantum Reduction should halve its host');

  // T12's rows are per-name: each of the deck's three other attachments has a look of its own.
  const mastery = attachFor(card({ name: 'Robotics Mastery', types: 'Enchantment - Aura' }), ATTACH);
  assert.equal(mastery.rung, 'card');
  assert.equal(mastery.spec.kind, 'circuit');
  assert.equal(mastery.spec.hostScale, 1);
  const suit = attachFor(card({ name: 'Super Suit', types: 'Artifact - Equipment' }), ATTACH);
  assert.equal(suit.rung, 'card');
  assert.equal(suit.spec.kind, 'shell');
  assert.equal(suit.spec.metal, true, '§4.4 — an Equipment is the metallic variant');
  const spyKit = attachFor(card({ name: 'S.H.I.E.L.D. Spy Kit', types: 'Artifact - Equipment' }), ATTACH);
  assert.equal(spyKit.rung, 'card');
  assert.equal(spyKit.spec.kind, 'glints');
  assert.equal(spyKit.spec.metal, true);

  // Any OTHER Aura or Equipment falls to its subtype rung: the halo, metal for gear.
  const aura = attachFor(card({ name: 'Some Other Aura', types: 'Enchantment - Aura' }), ATTACH);
  assert.equal(aura.rung, 'subtype:aura');
  assert.equal(aura.spec.kind, 'halo');
  assert.equal(aura.spec.hostScale, 1);

  const kit = attachFor(card({ name: 'Some Other Gear', types: 'Artifact - Equipment' }), ATTACH);
  assert.equal(kit.rung, 'subtype:equipment');
  assert.equal(kit.spec.kind, 'halo');
  assert.equal(kit.spec.metal, true, '§4.4 — an Equipment is the metallic variant');

  // Anything else attached to anything: the `*` halo, in its own colour.
  const other = attachFor(card({ name: 'Some Curse', types: 'Enchantment' }), ATTACH);
  assert.equal(other.rung, 'any');
  assert.equal(other.spec.kind, 'halo');
});

test('attach: a concealed attaching card never reaches the per-name rung', () => {
  const redacted = {
    id: 9,
    zone: 'battlefield',
    controller: 0,
    owner: 0,
    hidden: true,
  } as unknown as AnyCard;
  const match = attachFor(redacted, ATTACH);
  assert.equal(match.rung, 'default');
  const manifestation = manifestationOf(redacted, ATTACH);
  // Colourless, because "something is attached here" is public and what it is is
  // not (§1.4 one layer down). The grey is `colour.ts`'s own colourless, asked for
  // rather than spelled out here.
  assert.equal(manifestation.colour, colourHex('C'));
  assert.equal(manifestation.kind, 'halo');
});

test('attach: the manifestation carries an id, a kind and a colour — never a name', () => {
  const manifestation = manifestationOf(
    card({ id: 44, name: 'Quantum Reduction', types: 'Enchantment - Aura', manaCost: '{1}{U}' }),
    ATTACH,
  );
  const keys = Object.keys(manifestation).sort();
  assert.deepEqual(keys, ['cardId', 'colour', 'hostScale', 'kind', 'metal', 'rung', 'strength']);
  const json = JSON.stringify(manifestation);
  assert.ok(
    !/Quantum|Reduction|Aura|Enchantment/i.test(json),
    'the manifestation leaks the card it is for — §3.10 rule 1',
  );
});

// ---------------------------------------------------------------------------
// The corpus sweep — §4.1's 985 frames
// ---------------------------------------------------------------------------

test('attach: every attachment of every committed recording manifests on its host', () => {
  const census = new Map<string, { kind: string; rung: string; count: number; hosts: Set<string> }>();
  let frames = 0;
  let framesWithAttachment = 0;
  let manifestations = 0;
  let maxInFrame = 0;
  let shrunkHosts = 0;
  let metal = 0;
  let attachEvents = 0;

  for (const file of fixtureFiles()) {
    for (const state of framesOf(file)) {
      const board = state.board;
      if (board === null) continue;
      frames += 1;
      for (const event of board.events) if (event.kind === 'attach') attachEvents += 1;

      const placed = layout(state, {});
      const poses = figurePose(placed, board.combat ?? null, DATA);

      // What the SNAPSHOT says is attached, counted independently of the pose, so
      // the assertion below is "every one of them manifested" and not a tautology.
      const attached = new Map<number, AnyCard>();
      for (const player of board.players) {
        for (const c of player.zones.battlefield.cards) {
          if (isHidden(c)) continue;
          if (((c as { attachedToId?: number | null }).attachedToId ?? null) === null) continue;
          attached.set(c.id, c);
        }
      }
      if (attached.size > 0) framesWithAttachment += 1;
      maxInFrame = Math.max(maxInFrame, attached.size);

      let inFrame = 0;
      const seen = new Set<number>();
      for (const pose of poses.values()) {
        inFrame += pose.attachments.length;
        let product = 1;
        for (const manifestation of pose.attachments) {
          manifestations += 1;
          seen.add(manifestation.cardId);
          product *= manifestation.hostScale;
          assert.ok(isAttachKind(manifestation.kind), `${file}: bad kind`);
          assert.match(manifestation.colour, /^#[0-9a-f]{6}$/i, `${file}: bad colour`);
          assert.ok(
            manifestation.strength >= 0 && manifestation.strength <= 1,
            `${file}: bad strength`,
          );
          if (manifestation.kind === 'shrink') shrunkHosts += 1;
          if (manifestation.metal) metal += 1;

          const attaching = attached.get(manifestation.cardId);
          assert.ok(attaching !== undefined, `${file}: manifested a card that is not attached`);
          const name = (attaching as { name?: string }).name ?? '?';
          const row = census.get(name) ?? {
            kind: manifestation.kind,
            rung: manifestation.rung,
            count: 0,
            hosts: new Set<string>(),
          };
          row.count += 1;
          const host = poses.get(pose.cardId);
          row.hosts.add(host === undefined ? '?' : String(host.rung));
          census.set(name, row);
        }
        // **The height is the product, and this is the assertion behind "it stays
        // shrunk through a skip"** (§4.2): the pose recomputes it from the frame.
        assert.ok(
          Math.abs(pose.hostScale - product) < 1e-9,
          `${file}: hostScale ${String(pose.hostScale)} is not the product ${String(product)}`,
        );
        assert.ok(pose.height > 0 && pose.height <= FIGURE_HEIGHT * 4, `${file}: bad height`);
      }

      // §4.4's cap is per FRAME, and it is not the cue engine's eight slots.
      assert.ok(inFrame <= MAX_POSE_OVERLAYS, `${file}: ${String(inFrame)} overlays, over the cap`);
      // Every attachment in the snapshot whose host is a creature manifested.
      for (const [id, c] of attached) {
        const hostId = (c as { attachedToId?: number | null }).attachedToId ?? null;
        const host = hostId === null ? undefined : poses.get(hostId);
        if (host === undefined) continue; // attached to a land, an artifact or a player
        assert.ok(seen.has(id), `${file}: attachment ${String(id)} never manifested on its host`);
      }
    }
  }

  console.log(
    `  ${String(frames)} board frames · ${String(framesWithAttachment)} with an attachment · ` +
      `${String(manifestations)} manifestations · max ${String(maxInFrame)} in one frame`,
  );
  console.log(
    `  ${String(attachEvents)} \`attach\` EVENTS in the whole corpus — the ratio §4.1 is built on: ` +
      `${(framesWithAttachment / Math.max(1, attachEvents)).toFixed(1)}× more frames than events`,
  );
  console.log(`  ${String(shrunkHosts)} shrink · ${String(metal)} metallic (an Equipment)`);
  console.log('  attaching card            kind     rung                 instances  host rungs');
  for (const [name, row] of [...census.entries()].sort((a, b) => b[1].count - a[1].count)) {
    console.log(
      `    ${name.padEnd(24)} ${row.kind.padEnd(8)} ${row.rung.padEnd(20)} ` +
        `${String(row.count).padStart(5)}      ${[...row.hosts].join(', ')}`,
    );
  }

  // §4.1's measured numbers, and the corpus is where they came from.
  assert.equal(framesWithAttachment, 985, `${String(framesWithAttachment)} frames, not 985`);
  assert.equal(maxInFrame, 4, `max ${String(maxInFrame)} attachments in a frame, not 4`);
  assert.equal(attachEvents, 28, `${String(attachEvents)} attach events, not 28`);
  // **The whole design argument, as an assertion.** If a manifestation were a cue
  // it would be on screen for 28 transitions; as a pose it is on screen 985 times.
  assert.ok(
    framesWithAttachment > attachEvents * 30,
    'the pose/cue split in §4.1 no longer holds over this corpus — re-read it',
  );
  for (const name of [
    'Quantum Reduction',
    'Super Suit',
    'S.H.I.E.L.D. Spy Kit',
    'Robotics Mastery',
  ]) {
    assert.ok(census.has(name), `no manifestation was ever drawn for ${name}`);
  }
  assert.equal(census.get('Quantum Reduction')?.kind, 'shrink');
  assert.equal(census.get('Quantum Reduction')?.rung, 'card');
  // T12, committed: every attachment the deck plays has a per-name look.
  assert.deepEqual(
    ['Robotics Mastery', 'Super Suit', 'S.H.I.E.L.D. Spy Kit'].map((n) => [n, census.get(n)?.rung, census.get(n)?.kind]),
    [
      ['Robotics Mastery', 'card', 'circuit'],
      ['Super Suit', 'card', 'shell'],
      ['S.H.I.E.L.D. Spy Kit', 'card', 'glints'],
    ],
  );
  assert.ok(shrunkHosts > 900, `only ${String(shrunkHosts)} shrink manifestations`);
  // Every kind the data uses must be one the renderer draws or the declared halo.
  assert.ok((ATTACH_KINDS as readonly string[]).includes('halo'));
});

test('attach: a shrunk host is shorter, and it is the SNAPSHOT that keeps it so', () => {
  // The one frame-level claim worth making without the corpus: two frames of the
  // same board, one with the Aura attached and one without, and the only
  // difference is the field the wire carries.
  const host = card({
    id: 10,
    name: 'Peggy Carter, Secret Agent',
    types: 'Legendary Creature - Human Spy Hero',
    manaCost: '{2}{W}',
    power: '2',
    toughness: '3',
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
    counters: {},
    damage: 0,
    loyalty: null,
    setCode: 'MSH',
  });
  const aura = card({
    id: 11,
    name: 'Quantum Reduction',
    types: 'Enchantment - Aura',
    manaCost: '{1}{U}',
    power: null,
    toughness: null,
    tapped: false,
    sick: false,
    attacking: false,
    blocking: false,
    faceDown: false,
    token: false,
    alt: null,
    attachedToId: 10,
    attachmentIds: [],
    controller: 0,
    owner: 0,
    zone: 'battlefield',
    abilities: [],
    counters: {},
    damage: 0,
    loyalty: null,
    setCode: 'MSH',
  });

  const build = (cards: AnyCard[]): ClientState =>
    ({
      board: {
        gameId: 'g',
        turn: 1,
        round: 1,
        phase: 'MAIN1',
        activePlayer: 0,
        priority: 0,
        gameOver: null,
        stack: [],
        stackCards: [],
        combat: null,
        events: [],
        players: [
          {
            id: 0,
            name: 'p',
            isAi: false,
            life: 20,
            poison: 0,
            counters: {},
            manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
            zones: {
              hand: { count: 0, cards: [] },
              battlefield: { count: cards.length, cards },
              graveyard: { count: 0, cards: [] },
              exile: { count: 0, cards: [] },
              command: { count: 0, cards: [] },
              library: { count: 30, cards: [] },
            },
          },
        ],
      },
      hello: { you: 0 },
    }) as unknown as ClientState;

  const bare = figurePose(layout(build([host])), null, DATA).get(10);
  const enchanted = figurePose(layout(build([host, aura])), null, DATA).get(10);
  assert.ok(bare !== undefined && enchanted !== undefined);
  assert.equal(bare.attachments.length, 0);
  assert.equal(enchanted.attachments.length, 1);
  assert.equal(enchanted.attachments[0]?.kind, 'shrink');
  assert.ok(
    enchanted.height < bare.height * 0.5,
    `${String(enchanted.height)} is not less than half of ${String(bare.height)}`,
  );
  // And the disc shrinks with it, so the footprint agrees with the figure.
  assert.ok(enchanted.radius < bare.radius);
});

// ---------------------------------------------------------------------------
// §4.3 — the snap is a cue, and the host's reaction to it is data
// ---------------------------------------------------------------------------

test('attach: the snap poses the HOST, and Quantum Reduction’s host shrinks', () => {
  const impl = REGISTRY.get('attach.snap');
  assert.ok(impl !== undefined);
  const run = (params: Record<string, string | number | boolean>): { clip: string | undefined; ring: number[] } => {
    const stage = new NullStage();
    const ctx = { id: 'attach.snap', targets: [5], players: [], params: { toId: 44, ...params }, ms: 560, key: 'k', reducedMotion: false };
    impl.apply(ctx, 0.5, stage);
    const clip = stage.clips.get(44)?.clip;
    const ring: number[] = [];
    for (const t of [0.6, 0.8, 0.99]) {
      impl.apply(ctx, t, stage);
      ring.push(stage.effects.get('k:ring')?.radius ?? -1);
    }
    impl.apply(ctx, 1, stage);
    impl.end(ctx, stage);
    assert.equal(stage.clips.size, 0, 'the snap left a clip on the host');
    assert.equal(stage.effects.size, 0, 'the snap left its ring');
    return { clip, ring };
  };
  assert.equal(run({}).clip, 'channel', 'the default reaction');
  assert.equal(run({ hostClip: 'nonsense' }).clip, 'channel', 'an unknown clip falls back, it does not fail');
  const shrink = run({ hostClip: 'shrink', collapse: true });
  assert.equal(shrink.clip, 'shrink');
  assert.ok(shrink.ring[0]! > shrink.ring[2]!, `a collapsing ring closes: ${shrink.ring.join(' → ')}`);
  const open = run({});
  assert.ok(open.ring[0]! < open.ring[2]!, 'the default ring opens');

  // And the data says so: Quantum Reduction's own `attach:on` entry.
  const cues = JSON.parse(
    readFileSync(fileURLToPath(new URL('../src/arena/cues/cues.json', import.meta.url)), 'utf8'),
  ) as { cards: Record<string, Record<string, { cue: string; params?: Record<string, unknown> }>> };
  const qr = cues.cards['Quantum Reduction']?.['attach:on'];
  assert.equal(qr?.cue, 'attach.snap');
  assert.equal(qr?.params?.['hostClip'], 'shrink');
});

// ---------------------------------------------------------------------------
// Tier 2 slice 3 (T12) — the four looks, and the two stations
// ---------------------------------------------------------------------------

test('attach: T12’s four looks are data — a row names the kind and the host wears it', () => {
  // The three rows T12 asks for (report 13 §4.3), read from the COMMITTED
  // `figures.json` — slice 3 first laid them over the data here because they had
  // not landed, and the real games drew the plain halo (the verification pass).
  const rows: Record<string, { kind: string; metal: boolean }> = {
    'Super Suit': { kind: 'shell', metal: true },
    'S.H.I.E.L.D. Spy Kit': { kind: 'glints', metal: true },
    'Robotics Mastery': { kind: 'circuit', metal: false },
  };
  for (const [name, row] of Object.entries(rows)) {
    assert.equal(ATTACH.attachments[name]?.kind, row.kind, `figures.json has no T12 row for ${name}`);
    assert.equal(ATTACH.attachments[name]?.metal, row.metal, `${name}: metal`);
  }
  const data = DATA;
  console.log('  T12 rows in figures.json: 3 of 3 (committed)');
  const seen = new Map<string, number>();
  let anonymousHosts = 0;
  for (const file of fixtureFiles()) {
    for (const state of framesOf(file)) {
      const board = state.board;
      if (board === null) continue;
      for (const pose of figurePose(layout(state, {}), board.combat ?? null, data).values()) {
        for (const m of pose.attachments) seen.set(m.kind, (seen.get(m.kind) ?? 0) + 1);
        if (pose.anonymous && pose.attachments.length > 0) anonymousHosts += 1;
      }
    }
  }
  console.log(`  looks over the corpus: ${JSON.stringify(Object.fromEntries(seen))} · anonymous hosts with one: ${String(anonymousHosts)}`);
  // 944 shrink + 409 shell + 362 glints + 315 circuit = the 2,030 of §4.1.
  assert.equal(seen.get('shrink'), 944);
  assert.equal(seen.get('shell'), 409);
  assert.equal(seen.get('glints'), 362);
  assert.equal(seen.get('circuit'), 315);
  assert.equal(seen.get('halo') ?? 0, 0, 'with the three rows, nothing in this deck falls back to the halo');
  for (const kind of ['shell', 'glints', 'circuit', 'cocoon'] as const) assert.ok(isAttachKind(kind));
});

test('attach: the stations — Strategic Intervention’s console and Web Up’s cocoon — are a pose of the frame', () => {
  const cues = JSON.parse(
    readFileSync(fileURLToPath(new URL('../src/arena/cues/cues.json', import.meta.url)), 'utf8'),
  ) as unknown;
  const stations = validateCues(cues, { cueIds: new Set(REGISTRY.keys()) }).data.stations;
  assert.ok(stations !== undefined);
  const byKind = new Map<string, number>();
  let frames = 0;
  let framesWithStation = 0;
  let checkedAgainstSnapshot = 0;
  let exileLinks = 0;
  for (const file of fixtureFiles()) {
    for (const state of framesOf(file)) {
      const board = state.board;
      if (board === null) continue;
      frames += 1;
      const placed = layout(state, {});
      const found = stationsOf(placed, stations);
      if (found.length > 0) framesWithStation += 1;
      assert.ok(found.length <= MAX_STATIONS);
      // Counted independently of `stationsOf`: every face-up, unattached copy of a
      // station card on a battlefield, and nothing else.
      let expected = 0;
      for (const player of board.players) {
        for (const c of player.zones.battlefield.cards) {
          if (isHidden(c) || (c as { faceDown?: boolean }).faceDown === true) continue;
          if (((c as { attachedToId?: number | null }).attachedToId ?? null) !== null) continue;
          const name = (c as { name?: string }).name ?? '';
          if (stations[name] !== undefined) expected += 1;
        }
        // Report 13 §4.5's measurement, as an assertion: nothing in an exile zone
        // is ever related to the card that put it there.
        for (const c of player.zones.exile.cards) {
          if (((c as { attachedToId?: number | null }).attachedToId ?? null) !== null) exileLinks += 1;
        }
      }
      assert.equal(found.length, expected, `${file}: ${String(found.length)} stations for ${String(expected)} cards`);
      checkedAgainstSnapshot += expected;
      for (const station of found) {
        byKind.set(station.kind, (byKind.get(station.kind) ?? 0) + 1);
        const placement = placed.byKey.get(`c:${String(station.cardId)}`);
        assert.ok(placement !== undefined && !placement.back, `${file}: a station on a card drawn as a back`);
        assert.deepEqual(station.position, standPointOf(placement), 'a station stands in its OWN rank slot');
        assert.ok(!/Web|Intervention|Strategic/i.test(JSON.stringify(station)), 'a station carries a name');
      }
    }
  }
  console.log(
    `  ${String(frames)} board frames · ${String(framesWithStation)} with a station · ` +
      `${JSON.stringify(Object.fromEntries(byKind))} · exile cards linked to anything: ${String(exileLinks)}`,
  );
  assert.ok((byKind.get('missionControl') ?? 0) > 100, 'Strategic Intervention’s console almost never shows');
  assert.ok((byKind.get('cocoon') ?? 0) > 100, 'Web Up’s cocoon almost never shows');
  assert.equal(exileLinks, 0, 'the wire now relates an exiled card to something — report 13 §4.5 can build the pose on it');
  assert.ok(checkedAgainstSnapshot > 200);
});

/** Screen rectangle (NDC) of a set of world points through the table view's camera, 1600 × 1000. */
function screenRect(points: ReadonlyArray<readonly [number, number, number]>): [number, number, number, number] | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    const ndc = projectToNdc(REST_POSE, [p[0], p[1], p[2]], undefined, 1.6);
    if (ndc === null) return null;
    x0 = Math.min(x0, ndc[0]);
    y0 = Math.min(y0, ndc[1]);
    x1 = Math.max(x1, ndc[0]);
    y1 = Math.max(y1, ndc[1]);
  }
  return [x0, y0, x1, y1];
}

/** How much of `b`'s screen area `a` covers, 0–1. */
function coverOf(a: readonly number[], b: readonly number[]): number {
  const w = Math.min(a[2]!, b[2]!) - Math.max(a[0]!, b[0]!);
  const h = Math.min(a[3]!, b[3]!) - Math.max(a[1]!, b[1]!);
  return w > 0 && h > 0 ? (w * h) / ((b[2]! - b[0]!) * (b[3]! - b[1]!)) : 0;
}

test('attach: from the table view, a station covers no figure — it stands in its own slot (verification fix)', () => {
  // Slice 3 hung a 1.1-wide console 0.85 above its CARD; from the table view's
  // steep camera it projected onto the figures standing in front of the cards
  // beside it (`g2`@224: over your Ant-Man). Now it is figure-sized at its slot's
  // stand point. The camera's right and up, for a camera-facing quad's corners:
  const cues = JSON.parse(
    readFileSync(fileURLToPath(new URL('../src/arena/cues/cues.json', import.meta.url)), 'utf8'),
  ) as unknown;
  const stations = validateCues(cues, { cueIds: new Set(REGISTRY.keys()) }).data.stations;
  const [px, py, pz] = REST_POSE.position;
  const [tx, ty, tz] = REST_POSE.target;
  const f = [tx - px, ty - py, tz - pz];
  const fl = Math.hypot(f[0]!, f[1]!, f[2]!);
  const fwd = [f[0]! / fl, f[1]! / fl, f[2]! / fl];
  const r0 = [-fwd[2]!, 0, fwd[0]!];
  const rl = Math.hypot(r0[0]!, r0[2]!);
  const right = [r0[0]! / rl, 0, r0[2]! / rl];
  const up = [
    right[1]! * fwd[2]! - right[2]! * fwd[1]!,
    right[2]! * fwd[0]! - right[0]! * fwd[2]!,
    right[0]! * fwd[1]! - right[1]! * fwd[0]!,
  ];
  let pairs = 0;
  let worst = 0;
  let where = '';
  for (const kind of Object.keys(STATION_SIZE) as Array<keyof typeof STATION_SIZE>) {
    assert.ok(STATION_SIZE[kind].w <= FIGURE_MAX_WIDTH, `${kind} is wider than a figure's slot`);
  }
  for (const file of fixtureFiles()) {
    let index = 0;
    for (const state of framesOf(file)) {
      index += 1;
      const board = state.board;
      if (board === null) continue;
      const placed = layout(state, {});
      const found = stationsOf(placed, stations);
      if (found.length === 0) continue;
      const poses = figurePose(placed, board.combat ?? null, DATA, { models: MODELS });
      for (const station of found) {
        const size = STATION_SIZE[station.kind];
        const c = [station.position[0], station.position[1] + station.lift, station.position[2]];
        const corners: Array<[number, number, number]> = [];
        for (const sx of [-0.5, 0.5]) {
          for (const sy of [-0.5, 0.5]) {
            corners.push([
              c[0]! + right[0]! * sx * size.w + up[0]! * sy * size.h,
              c[1]! + right[1]! * sx * size.w + up[1]! * sy * size.h,
              c[2]! + right[2]! * sx * size.w + up[2]! * sy * size.h,
            ]);
          }
        }
        const drawn = screenRect(corners);
        assert.ok(drawn !== null);
        for (const figure of poses.values()) {
          if (figure.silhouette !== null || figure.ghost) continue;
          const [x, y, z] = figure.position;
          const d = figure.height * 0.3;
          const box: Array<[number, number, number]> = [];
          for (const bx of [x - figure.width / 2, x + figure.width / 2]) {
            for (const by of [y, y + figure.height]) for (const bz of [z - d, z + d]) box.push([bx, by, bz]);
          }
          const body = screenRect(box);
          if (body === null) continue;
          pairs += 1;
          const cover = coverOf(drawn, body);
          if (cover > worst) {
            worst = cover;
            where = `${file.slice(file.lastIndexOf('/') + 1)}#${String(index)} ${station.kind} over figure ${String(figure.cardId)}`;
          }
        }
      }
    }
  }
  console.log(`  stations × figures on screen: ${String(pairs)} pairs · worst cover ${worst.toFixed(3)} ${where}`);
  assert.ok(pairs > 1000, 'the sweep compared almost nothing');
  assert.ok(worst < 0.05, `a station covers ${(worst * 100).toFixed(1)}% of a figure from the table view (${where})`);
});

test('attach: a station is never drawn for a card drawn as a back, a concealed card or an attached one', () => {
  const stations = { 'Web Up': { kind: 'cocoon' as const } };
  const card = (over: Record<string, unknown>): AnyCard =>
    ({
      id: 5,
      name: 'Web Up',
      types: 'Enchantment',
      manaCost: '{2}{W}',
      power: null,
      toughness: null,
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
      counters: {},
      damage: 0,
      loyalty: null,
      setCode: 'MSH',
      ...over,
    }) as unknown as AnyCard;
  const board = (c: AnyCard): ClientState =>
    ({
      board: {
        gameId: 'g', turn: 1, round: 1, phase: 'MAIN1', activePlayer: 0, priority: 0, gameOver: null,
        stack: [], stackCards: [], combat: null, events: [],
        players: [
          {
            id: 0, name: 'p', isAi: false, life: 20, poison: 0, counters: {},
            manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
            zones: {
              hand: { count: 0, cards: [] },
              battlefield: { count: 1, cards: [c] },
              graveyard: { count: 0, cards: [] },
              exile: { count: 0, cards: [] },
              command: { count: 0, cards: [] },
              library: { count: 30, cards: [] },
            },
          },
        ],
      },
      hello: { you: 0 },
    }) as unknown as ClientState;
  assert.equal(stationsOf(layout(board(card({}))), stations).length, 1, 'the control case draws one');
  assert.equal(stationsOf(layout(board(card({ faceDown: true, name: '' }))), stations).length, 0, 'face down');
  assert.equal(
    stationsOf(layout(board({ id: 5, zone: 'battlefield', controller: 0, owner: 0, hidden: true } as unknown as AnyCard)), stations).length,
    0,
    'redacted',
  );
  assert.equal(stationsOf(layout(board(card({ attachedToId: 9 }))), stations).length, 0, 'attached');
  assert.equal(stationsOf(layout(board(card({}))), undefined).length, 0, 'no table, no station');
  const [one] = stationsOf(layout(board(card({}))), { 'Web Up': { kind: 'cocoon', colour: '#123456', lift: 1.2, scale: 2 } });
  assert.deepEqual(
    { kind: one?.kind, colour: one?.colour, lift: one?.lift, scale: one?.scale },
    { kind: 'cocoon', colour: '#123456', lift: 1.2, scale: 2 },
  );
  const [plain] = stationsOf(layout(board(card({}))), stations);
  assert.equal(plain?.lift, STATION_LIFT.cocoon, 'the kind’s own lift when the data says none');
  assert.equal(plain?.colour, colourHex('W'), 'the card’s own colour identity when the data says none');
});

// ---------------------------------------------------------------------------
// The second verification pass: a click on a host reaches the HOST
// ---------------------------------------------------------------------------

test('attach: a click on a host’s face hits the host, and its attachment keeps a strip of its own — three seat-safe views (second verification pass)', async () => {
  // Live, seed 11, view 2: the opponent's Quantum Reduction on the viewer's Peggy
  // Carter took every click on her card ("Not selectable: card 45"). The proxy is
  // `HitProxy`'s, exactly: a unit plane at the placement, `CARD_W × 1.1` by `1.1`,
  // two-sided, raycast by three's own Raycaster from each seat-safe view.
  const { CAMERA, VIEW_BY_ID } = await import('../src/arena/camera.ts');
  const { ATTACH_DY, CARD_W } = await import('../src/arena/layout.ts');
  const plane = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const cameras = (['table', 'shoulder', 'low'] as const).map((id) => {
    const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1.6, CAMERA.near, CAMERA.far);
    const pose = VIEW_BY_ID[id].pose;
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateMatrixWorld(true);
    return { id, camera };
  });
  const ray = new THREE.Raycaster();
  const at = new THREE.Vector3();
  let hosts = 0;
  let hostMisses = 0;
  let attachments = 0;
  let unreachable = 0;
  let oldMisses = 0;
  const misses: string[] = [];
  const buried: string[] = [];
  const files = fixtureFiles();
  for (const file of files) {
    let n = 0;
    for (const state of framesOf(file)) {
      // Every eighth frame is plenty: attachments persist for dozens of frames.
      if (n++ % 8 !== 0) continue;
      const placed = layout(state);
      const pairs = placed.placements
        .filter((p) => p.kind === 'attachment')
        .map((p) => ({ att: p, host: placed.byKey.get(`c:${String((p.card as { attachedToId?: number | null }).attachedToId ?? -1)}`) }))
        .filter((pair) => pair.host !== undefined);
      if (pairs.length === 0) continue;
      const build = (lift: number): THREE.Mesh[] =>
        placed.placements.map((p) => {
          const mesh = new THREE.Mesh(plane, material);
          mesh.position.set(p.position[0], p.position[1] + (p.kind === 'attachment' ? lift : 0), p.position[2]);
          mesh.rotation.set(p.rotation[0], p.rotation[1], p.rotation[2]);
          mesh.scale.set(CARD_W * p.scale * 1.1, p.scale * 1.1, 1);
          mesh.userData = { cardId: p.cardId };
          mesh.updateMatrixWorld(true);
          return mesh;
        });
      const meshes = build(0);
      // The control: the attachment 2 mm ABOVE its host, as slice 3 laid it out.
      const before = build(0.002 - ATTACH_DY);
      const firstHit = (list: THREE.Mesh[], camera: THREE.PerspectiveCamera, x: number, y: number, z: number): number | null => {
        at.set(x, y, z).project(camera);
        ray.setFromCamera(new THREE.Vector2(at.x, at.y), camera);
        const hit = ray.intersectObjects(list, false)[0];
        return hit === undefined ? null : (hit.object.userData as { cardId: number }).cardId;
      };
      for (const { att, host } of pairs) {
        for (const { id, camera } of cameras) {
          hosts += 1;
          const got = firstHit(meshes, camera, host!.position[0], host!.position[1], host!.position[2]);
          if (got !== host!.cardId) {
            hostMisses += 1;
            if (misses.length < 5) misses.push(`${file}: view ${id}, host ${String(host!.cardId)}'s centre hit ${String(got)}`);
          }
          if (firstHit(before, camera, host!.position[0], host!.position[1], host!.position[2]) !== host!.cardId) oldMisses += 1;
          // The attachment's own strip: a grid over its card; one sample must be its.
          attachments += 1;
          let own = false;
          const local = new THREE.Vector3();
          const mesh = meshes[placed.placements.indexOf(att)]!;
          for (let u = -0.45; u <= 0.45 && !own; u += 0.15) {
            for (let v = -0.45; v <= 0.45 && !own; v += 0.15) {
              local.set(u / 1.1, v / 1.1, 0).applyMatrix4(mesh.matrixWorld);
              if (firstHit(meshes, camera, local.x, local.y, local.z) === att.cardId) own = true;
            }
          }
          if (!own) {
            unreachable += 1;
            // Only ever under a CROWDED board: its host, a wrapped rank's back row
            // (which lies above the front row, `RANK_WRAP_Y`) and the neighbours
            // between them cover the whole card — and then it is not DRAWN either,
            // so the click order is still the drawing order.
            const wrapped = placed.placements.some((p) => p.seat === host!.seat && p.kind === 'creature' && (p.row ?? 0) > 0);
            if (!wrapped) buried.push(`${file}: view ${id}, attachment ${String(att.cardId)} on host ${String(host!.cardId)}`);
          }
        }
      }
    }
  }
  console.log(
    `attach: ${String(hosts)} host-centre clicks (3 views) · ${String(hostMisses)} missed the host · ` +
      `${String(attachments - unreachable)} of ${String(attachments)} attachments keep a clickable strip ` +
      `(the rest lie wholly under their host and a wrapped rank's back row, and are not drawn either) · ` +
      `with the attachment 2 mm above its host (slice 3), ${String(oldMisses)} missed`,
  );
  assert.ok(hosts > 300, 'the sweep reached almost no attachment');
  assert.deepEqual(misses, [], `${String(hostMisses)} host clicks landed on something else`);
  assert.deepEqual(buried, [], 'an attachment on an uncrowded board has no clickable strip left');
  assert.ok(unreachable <= attachments / 100, `${String(unreachable)} attachments have no clickable strip`);
  assert.ok(oldMisses > hosts / 2, 'the old layout passes too — this test could not have caught the defect');
});
