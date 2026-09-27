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

import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import {
  ATTACH_SUBTYPE_ORDER,
  MAX_POSE_OVERLAYS,
  attachFor,
  attachSubtypeKey,
  attachSubtypesOf,
  manifestationOf,
} from '../src/arena/figures/attach.ts';
import { figurePose } from '../src/arena/figures/pose.ts';
import { colourHex } from '../src/arena/colour.ts';
import { REGISTRY } from '../src/arena/cues/registry.ts';
import { NullStage } from '../src/arena/cues/stage.ts';
import { ATTACH_KINDS, attachDataOf, isAttachKind } from '../src/arena/figures/types.ts';
import { validateFigures, validateModels } from '../src/arena/figures/validate.ts';
import { FIGURE_HEIGHT, layout } from '../src/arena/layout.ts';
import { isHidden, type AnyCard, type Frame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

const MODEL_IDS = new Set(Object.keys(validateModels(modelsJson).data.models));
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

  const aura = attachFor(card({ name: 'Robotics Mastery', types: 'Enchantment - Aura' }), ATTACH);
  assert.equal(aura.rung, 'subtype:aura');
  assert.equal(aura.spec.kind, 'halo');
  assert.equal(aura.spec.hostScale, 1);

  const kit = attachFor(card({ name: 'S.H.I.E.L.D. Spy Kit', types: 'Artifact - Equipment' }), ATTACH);
  assert.equal(kit.rung, 'subtype:equipment');
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
  assert.equal(census.get('Robotics Mastery')?.rung, 'subtype:aura');
  assert.equal(census.get('Super Suit')?.rung, 'subtype:equipment');
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
