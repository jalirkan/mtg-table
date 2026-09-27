/*
 * mtg-table — web/test/figure-pose.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The pose is a pure function of the frame** (report 13 §10.5), which is the
 * whole of §1.3's claim: if the snapshot says it, it is a pose — and a pose
 * survives `skip all`, a backwards scrub and a `resync` precisely because it is
 * recomputed from the frame on screen and never from a history.
 *
 * Over all **3,679 board frames** of the committed corpus: every battlefield
 * creature has exactly one pose, no pose is off the table, a tapped card's
 * figure keeps its slot, a blocker's `interposesId` always names a card
 * `state.combat` says it blocks, and the model cap holds.
 *
 * `node --test`, no browser, no GPU — `figures/pose.ts` imports no three.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import cuesJson from '../src/arena/cues/cues.json' with { type: 'json' };
import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import { MAX_FIGURES, discRadiusFor, figurePose, fitHeight } from '../src/arena/figures/pose.ts';
import { CARRIER_BOUNDS } from '../src/arena/figures/props.ts';
import { LIVE_ASPECTS, REST_POSE, projectToNdc } from '../src/arena/camera.ts';
import { STANCES } from '../src/arena/figures/types.ts';
import { validateFigures, validateModels } from '../src/arena/figures/validate.ts';
import {
  CARD_W,
  FIGURE_HEIGHT,
  FIGURE_MAX_WIDTH,
  FIGURE_STANDOFF,
  ON_CARD_DISC_ORDER,
  SILHOUETTE_ALTITUDE,
  HUD_TOP_PX,
  OPP_SILHOUETTE_ALTITUDE,
  OPP_SILHOUETTE_SCALE,
  TABLE_HALF_X,
  TABLE_HALF_Z,
  anchorsFor,
  layout,
  seatSign,
  silhouettePlacementOf,
  standPointOf,
  type Placement,
} from '../src/arena/layout.ts';
import { isHidden, type AnyCard, type Frame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

const MODELS = validateModels(modelsJson).data;
const MODEL_IDS = new Set(Object.keys(MODELS.models));
const DATA = validateFigures(figuresJson, { modelIds: MODEL_IDS }).data;
/** The cue file's `presence` rules — read, never written: what lifts the Helicarrier's card in the arena. */
const PRESENCE = (() => {
  const out: Record<string, { hoverY?: number; bobAmp?: number; bobHz?: number }> = {};
  for (const [name, entry] of Object.entries((cuesJson as { cards?: Record<string, unknown> }).cards ?? {})) {
    const presence = (entry as { presence?: { hoverY?: number; bobAmp?: number; bobHz?: number } }).presence;
    if (presence !== undefined) out[name] = presence;
  }
  return out;
})();

// ---------------------------------------------------------------------------
// Hand-built frames — the cases the corpus does not happen to contain
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

function stateWith(cards: AnyCard[], over: Record<string, unknown> = {}): ClientState {
  const hello = {
    v: 1,
    seq: 1,
    t: 1,
    type: 'hello_ok',
    body: { gameId: 'g', you: 0, players: [], protocol: 1 },
  } as unknown as Frame;
  const frame = {
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
      players: [
        {
          id: 0,
          name: 'p0',
          isAi: false,
          life: 20,
          poison: 0,
          counters: {},
          manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
          zones: {
            hand: EMPTY,
            battlefield: { count: cards.length, cards },
            graveyard: EMPTY,
            exile: EMPTY,
            command: EMPTY,
            library: { count: 30, cards: [] },
          },
        },
      ],
      stack: [],
      stackCards: [],
      combat: null,
      events: [],
      ...over,
    },
  } as unknown as Frame;
  return reduce(reduce(initialState(), hello), frame);
}

test('figure-pose: total over an empty board and a pre-game frame', () => {
  assert.equal(figurePose(layout(initialState()), null, DATA).size, 0);
  assert.equal(figurePose(layout(stateWith([])), null, DATA).size, 0);
});

test('figure-pose: the figure stands off the front edge of its card', () => {
  const placed = layout(stateWith([card(1)]));
  const poses = figurePose(placed, null, DATA);
  const pose = poses.get(1);
  assert.ok(pose !== undefined);
  const placement = placed.byKey.get('c:1');
  assert.ok(placement !== undefined);
  assert.equal(pose.position[0], placement.position[0], 'the figure keeps its card’s x');
  assert.equal(pose.position[1], placement.position[1]);
  assert.equal(
    Math.round((placement.position[2] - pose.position[2]) * 1000) / 1000,
    seatSign('you') * FIGURE_STANDOFF,
    'the figure stands FIGURE_STANDOFF toward the centre of the table',
  );
  // `0` at the viewer's seat. The models face +z (measured in slice 3), so this
  // turns the viewer's own figures toward the viewer's camera.
  assert.equal(pose.facingY, 0, 'the viewer’s own figures are not turned');
});

test('figure-pose: a tapped card’s figure keeps its slot and does NOT turn with it', () => {
  const upright = figurePose(layout(stateWith([card(1)])), null, DATA).get(1);
  const tapped = figurePose(layout(stateWith([card(1, { tapped: true })])), null, DATA).get(1);
  assert.ok(upright !== undefined && tapped !== undefined);
  assert.deepEqual(tapped.position, upright.position, 'a tap must not move the figure');
  assert.equal(tapped.facingY, upright.facingY, 'a tap must not turn the figure — it changes STANCE');
  assert.equal(tapped.stance, 'crouch');
  assert.equal(upright.stance, 'ready');
});

test('figure-pose: an attacker is attacking even though it is tapped', () => {
  // The precedence that is NOT the order §3.9's table prints: an attacking
  // creature is almost always tapped, and a tapped-first rule would put every
  // attacker on its knees at the moment it charges.
  const pose = figurePose(
    layout(stateWith([card(1, { tapped: true, attacking: true })])),
    null,
    DATA,
  ).get(1);
  assert.equal(pose?.stance, 'attacking');
});

test('figure-pose: summoning sickness is a translucency, not a tint', () => {
  const pose = figurePose(layout(stateWith([card(1, { sick: true })])), null, DATA).get(1);
  assert.ok(pose !== undefined);
  assert.equal(pose.stance, 'sick');
  assert.ok(pose.opacity < 1 && pose.opacity > 0.5, `opacity ${String(pose.opacity)}`);
});

test('figure-pose: interposesId comes from state.combat, and never from a self-block', () => {
  const state = stateWith([card(1, { attacking: true }), card(2, { blocking: true })], {
    combat: {
      bands: [
        { attackerIds: [1], defender: { kind: 'player', id: 1 }, blockerIds: [2], damageOrder: [] },
        // Amendment M7's encoding of an UNBLOCKED attacker: its own blocker.
        { attackerIds: [3], defender: { kind: 'player', id: 1 }, blockerIds: [3], damageOrder: [] },
      ],
    },
  });
  const placed = layout(state);
  const poses = figurePose(placed, state.board?.combat ?? null, DATA);
  assert.equal(poses.get(2)?.interposesId, 1, 'the blocker names the attacker it blocks');
  assert.equal(poses.get(1)?.interposesId, null, 'the attacker blocks nobody');
  assert.equal(poses.get(2)?.stance, 'blocking');
});

test('figure-pose: a non-creature permanent gets no figure', () => {
  const poses = figurePose(
    layout(stateWith([card(1, { types: 'Artifact - Equipment' }), card(2, { types: 'Enchantment' })])),
    null,
    DATA,
  );
  assert.equal(poses.size, 0);
});

test('figure-pose: the disc is sized by P/T and never by nothing', () => {
  const small = discRadiusFor(card(1, { power: '1', toughness: '1' }));
  const big = discRadiusFor(card(2, { power: '8', toughness: '8' }));
  const starred = discRadiusFor(card(3, { power: '*', toughness: '*' }));
  assert.ok(big > small, 'an 8/8 has a bigger footprint than a 1/1');
  assert.equal(starred, small, 'a */* is the smallest disc: the wire did not say how big it is');
  assert.ok(small > 0 && big < 0.5);
});

test('figure-pose: above MAX_FIGURES the surplus degrade to discs', () => {
  const many = Array.from({ length: MAX_FIGURES + 6 }, (_, i) => card(i + 1));
  const poses = figurePose(layout(stateWith(many)), null, DATA);
  assert.equal(poses.size, many.length, 'every creature still has a pose');
  const withModel = [...poses.values()].filter((p) => p.modelId !== null);
  assert.equal(withModel.length, MAX_FIGURES, 'the model cap is the cap');
});

// ---------------------------------------------------------------------------
// The corpus sweep
// ---------------------------------------------------------------------------

function fixtureStates(): Array<{ file: string; state: ClientState }> {
  const out: Array<{ file: string; state: ClientState }> = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (!name.endsWith('.jsonl')) continue;
      const log = parseFrameLog(readFileSync(FIXTURES + dir + name, 'utf8'));
      let state = initialState(log.header);
      for (const frame of log.frames as Frame[]) {
        state = reduce(state, frame);
        if (frame.type === 'state') out.push({ file: dir + name, state });
      }
    }
  }
  return out;
}

/**
 * The same corpus, with each state frame's TRANSPORT index — the number of frames
 * applied, which is what the replay slider and every evidence file call "index".
 */
function fixtureStatesIndexed(): Array<{ file: string; index: number; state: ClientState }> {
  const out: Array<{ file: string; index: number; state: ClientState }> = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (!name.endsWith('.jsonl')) continue;
      const log = parseFrameLog(readFileSync(FIXTURES + dir + name, 'utf8'));
      let state = initialState(log.header);
      const frames = log.frames as Frame[];
      for (let index = 0; index < frames.length; index++) {
        const frame = frames[index]!;
        state = reduce(state, frame);
        if (frame.type === 'state') out.push({ file: dir + name, index: index + 1, state });
      }
    }
  }
  return out;
}

test('figure-pose: every board frame of every committed recording poses', () => {
  const frames = fixtureStates();
  assert.ok(frames.length > 1000, `expected the whole corpus, saw ${String(frames.length)} frames`);

  let poses = 0;
  let anonymous = 0;
  let withModel = 0;
  let maxInFrame = 0;
  let ghostCount = 0;
  let vehicleCount = 0;
  const stances = new Map<string, number>();

  for (const { file, state } of frames) {
    const placed = layout(state);
    const combat = state.board?.combat ?? null;
    const map = figurePose(placed, combat, DATA, { models: MODELS });
    poses += map.size;
    maxInFrame = Math.max(maxInFrame, map.size);

    let modelled = 0;
    for (const [cardId, pose] of map) {
      assert.equal(pose.cardId, cardId, `${file}: the map key is not the card id`);
      if (pose.anonymous) anonymous += 1;
      if (pose.modelId !== null) {
        modelled += 1;
        withModel += 1;
        assert.ok(MODEL_IDS.has(pose.modelId), `${file}: unknown model ${pose.modelId}`);
        assert.ok(!pose.anonymous, `${file}: card ${String(cardId)} is anonymous AND has a model`);
      }
      stances.set(pose.stance, (stances.get(pose.stance) ?? 0) + 1);
      assert.ok((STANCES as readonly string[]).includes(pose.stance), `${file}: bad stance`);

      for (const n of [...pose.position, pose.facingY, pose.height, pose.radius, pose.opacity]) {
        assert.ok(Number.isFinite(n), `${file}: card ${String(cardId)} has a non-finite pose`);
      }
      assert.ok(Math.abs(pose.position[0]) <= TABLE_HALF_X, `${file}: figure x off the table`);
      assert.ok(Math.abs(pose.position[2]) <= TABLE_HALF_Z, `${file}: figure z off the table`);
      assert.ok(pose.position[1] >= 0, `${file}: figure under the table`);
      assert.ok(pose.height > 0 && pose.height < 3, `${file}: implausible height`);
      assert.ok(pose.opacity > 0 && pose.opacity <= 1, `${file}: bad opacity`);
      assert.match(pose.tint, /^#[0-9a-fA-F]{6}$/, `${file}: tint is not a hex colour`);

      // **A ghost is a spell on the stack, not a permanent** (T6, report 13
      // §6.2): it stands at its caster's own casting anchor and has no `c:` slot
      // at all, because the card is in `stackCards` rather than on a battlefield.
      if (pose.ghost) {
        const anchor = anchorsFor(pose.seat).casting;
        assert.equal(pose.position[0], anchor.x, `${file}: a ghost left the casting anchor`);
        assert.equal(pose.position[2], anchor.z, `${file}: a ghost left the casting anchor`);
        assert.ok(pose.position[1] >= anchor.y, `${file}: a ghost is below its anchor`);
        assert.equal(pose.stance, 'ready', `${file}: a spell took a combat stance`);
        assert.equal(pose.interposesId, null);
        assert.ok(pose.opacity < 1, `${file}: a ghost is not translucent`);
        continue;
      }

      // The stand point is `layout.ts`'s and this is the only module allowed to
      // know that: recompute it from the placement and require a match.
      const placement = placed.byKey.get(`c:${String(cardId)}`);
      assert.ok(placement !== undefined, `${file}: posed a card with no placement`);
      // Slice 3: a flier's hover (`lift`) is folded into y, and is the ONLY thing
      // added to layout.ts's stand point.
      assert.ok(pose.lift >= 0, `${file}: a negative hover`);
      // A vehicle's silhouette flies where layout.ts's `silhouettePlacementOf` says
      // (the opponent's over the centre line since the second verification pass).
      const standAt = pose.silhouette !== null ? silhouettePlacementOf(placement, pose.lift).ground : standPointOf(placement);
      assert.equal(pose.position[0], standAt[0], `${file}: pose left layout.ts (x)`);
      assert.equal(pose.position[2], standAt[2], `${file}: pose left layout.ts (z)`);
      assert.ok(Math.abs(pose.position[1] - pose.lift - standAt[1]) < 1e-9, `${file}: pose left layout.ts (y)`);

      if (pose.interposesId !== null) {
        const bands = combat?.bands ?? [];
        const ok = bands.some(
          (band) => band.blockerIds.includes(cardId) && band.attackerIds.includes(pose.interposesId!),
        );
        assert.ok(ok, `${file}: card ${String(cardId)} interposes a card combat never paired it with`);
        assert.notEqual(pose.interposesId, cardId, `${file}: a card blocking itself`);
      }
    }
    assert.ok(modelled <= MAX_FIGURES, `${file}: ${String(modelled)} models in one frame`);

    // **Exactly one pose per battlefield creature, plus one per creature SPELL on
    // the stack** (T6's ghost), and nothing else posed.
    let creatures = 0;
    for (const player of state.board?.players ?? []) {
      for (const c of player.zones.battlefield.cards) {
        const types = isHidden(c) ? '' : ((c as { types?: string }).types ?? '');
        if (!/(^|\s)Creature(\s|$|—|-)/.test(types)) continue;
        if ((c as { attachedToId?: number | null }).attachedToId != null) continue;
        creatures += 1;
        assert.ok(map.has(c.id), `${file}: creature ${String(c.id)} has no figure`);
      }
    }
    // A stack item whose source card is ALSO on the battlefield is an activated
    // ability, not a creature spell: `layout()` emits the ranks before the stack,
    // so the battlefield pose wins and the ghost is never built. Count the same way.
    const onField = new Set<number>();
    for (const player of state.board?.players ?? []) {
      for (const c of player.zones.battlefield.cards) onField.add(c.id);
    }
    let ghosts = 0;
    for (const placement of placed.placements) {
      if (placement.kind !== 'stack') continue;
      const c = placement.card;
      if (isHidden(c)) continue;
      const types = (c as { types?: string }).types ?? '';
      if (!/(^|\s)Creature(\s|$|—|-)/.test(types)) continue;
      if (onField.has(c.id)) continue;
      ghosts += 1;
      assert.ok(map.has(c.id), `${file}: creature spell ${String(c.id)} has no ghost`);
      assert.equal(map.get(c.id)?.ghost, true, `${file}: ${String(c.id)} should be a ghost`);
    }
    // Slice 3 (T10): plus one per face-up NON-creature Vehicle — the uncrewed
    // Helicarrier — drawn as its silhouette and nothing else. Counted from the
    // placements, independently of the pose.
    let vehicles = 0;
    for (const placement of placed.placements) {
      if (placement.kind !== 'creature' || placement.back || isHidden(placement.card)) continue;
      const types = (placement.card as { types?: string }).types ?? '';
      if (/(^|\s)Creature(\s|$|—|-)/.test(types) || !/\bVehicle\b/.test(types)) continue;
      vehicles += 1;
      const pose = map.get(placement.cardId);
      assert.ok(pose !== undefined, `${file}: vehicle ${String(placement.cardId)} has no silhouette`);
      assert.equal(pose.vehicle, true);
      assert.equal(pose.silhouette, 'carrier');
      assert.equal(pose.modelId, null, `${file}: a silhouette picked a body`);
    }
    assert.equal(
      map.size,
      creatures + ghosts + vehicles,
      `${file}: ${String(map.size)} poses for ${String(creatures)} creatures + ${String(ghosts)} ghosts + ${String(vehicles)} vehicles`,
    );
    ghostCount += ghosts;
    vehicleCount += vehicles;
  }

  console.log(
    `figure-pose: ${String(frames.length)} board frames · ${String(poses)} poses · ` +
      `${String(withModel)} with a model · ${String(anonymous)} anonymous · ` +
      `${String(ghostCount)} ghosted creature spells (T6) · ${String(vehicleCount)} uncrewed vehicle silhouettes (T10) · ` +
      `max ${String(maxInFrame)} figures in one frame\n` +
      `  stances: ${[...stances].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s}=${String(n)}`).join(' ')}`,
  );
  assert.ok(maxInFrame >= 20, `the busiest frame should hold 21 creatures, saw ${String(maxInFrame)}`);
  // T6: the corpus really does cast creatures, so the ghost branch is live data
  // rather than a branch nothing reaches.
  assert.ok(ghostCount > 100, `only ${String(ghostCount)} ghosted creature spells in the corpus`);
  // T10: the uncrewed Helicarrier is live data (613 frame-instances), not a branch.
  assert.ok(vehicleCount > 500, `only ${String(vehicleCount)} uncrewed vehicle silhouettes`);
});

test('figure-pose: it is a pure function — twice is byte-identical', () => {
  const frames = fixtureStates().slice(0, 300);
  for (const { file, state } of frames) {
    const placed = layout(state);
    const combat = state.board?.combat ?? null;
    const a = JSON.stringify([...figurePose(placed, combat, DATA)]);
    const b = JSON.stringify([...figurePose(layout(state), combat, DATA)]);
    assert.equal(a, b, `${file}: figurePose is not a function of the frame alone`);
  }
});

// ---------------------------------------------------------------------------
// T7's tuning pass — the footprint
// ---------------------------------------------------------------------------

test('figure-pose: every model fits its rank slot — no exemption (T8)', () => {
  /**
   * **The defect this pins, measured rather than photographed.** T2 normalised every
   * model by HEIGHT to `FIGURE_HEIGHT` 0.85, and a chibi is wider than it is tall:
   * two Soldier Tokens stood shoulder to shoulder in T3's own attack photograph. T7
   * clamped by width and FLOORED the clamp so the drone — measured then at 2.97×
   * wider than tall — would not vanish, which left the drone overlapping by up to
   * 0.634 units (Tier 2 follow-up 11).
   *
   * T8 found the 2.97 was the build's mistake (a skinned mesh measured with its
   * node transform, and a join that moved half the drone off its skin), rebuilt the
   * library measuring what three DRAWS, and made the clamp strict. So: every model,
   * in its widest resting stance, fits the slot.
   */
  for (const [id, entry] of Object.entries(MODELS.models)) {
    const ratio = entry.width / entry.height;
    const unclamped = FIGURE_HEIGHT * ratio;
    const height = fitHeight(FIGURE_HEIGHT, ratio);
    const drawn = height * ratio;
    console.log(
      `  ${id.padEnd(10)} ratio ${ratio.toFixed(2)} · at FIGURE_HEIGHT ${unclamped.toFixed(2)} wide · ` +
        `clamped ${drawn.toFixed(3)} wide × ${height.toFixed(3)} tall (slot ${FIGURE_MAX_WIDTH.toFixed(3)})`,
    );
    assert.ok(drawn <= FIGURE_MAX_WIDTH + 1e-9, `${id} is ${drawn.toFixed(3)} wide against a ${FIGURE_MAX_WIDTH.toFixed(3)} slot`);
    assert.ok(drawn <= unclamped + 1e-9, `${id}: the clamp made it wider`);
    // …and nothing is clamped into invisibility: the narrowest figure is still
    // more than half a card tall.
    assert.ok(height > 0.4, `${id} would be drawn ${height.toFixed(3)} units tall`);
  }
  // `fitHeight` is the pure half and is asserted directly: a square model is
  // untouched, a wide one is limited, and there is no floor any more.
  assert.equal(fitHeight(0.85, 0), 0.85, 'no ratio means no clamp — a pose with no manifest');
  assert.equal(fitHeight(0.85, 0.5), 0.85, 'a tall narrow model is not made shorter');
  assert.ok(Math.abs(fitHeight(0.85, 1.14) - FIGURE_MAX_WIDTH / 1.14) < 1e-9);
  assert.equal(fitHeight(0.85, 99), FIGURE_MAX_WIDTH / 99, 'no floor: the slot wins');
  // A shrunk host stays shrunk: the clamp only ever lowers a height.
  assert.ok(fitHeight(0.85 * 0.45, 1.14) < 0.4, 'a shrunk host stays shrunk');
});

test('figure-pose: no two neighbours in a rank overlap, over the whole corpus', () => {
  const frames = fixtureStates();
  let checked = 0;
  let worst = { overlap: 0, where: '' };
  const overflowing = new Map<string, number>();

  for (const { file, state } of frames) {
    const placed = layout(state);
    const poses = figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS });
    // Neighbours are figures of the same seat standing at (nearly) the same z: a
    // wrapped rank's back row stands on its own cards and is a different row.
    const byRow = new Map<string, Array<{ x: number; w: number; id: number }>>();
    for (const pose of poses.values()) {
      if (pose.ghost) continue;
      // A silhouette flies over the rank, above every head (asserted below): it
      // is not a neighbour on the ground.
      if (pose.silhouette !== null) continue;
      const key = `${pose.seat}:${pose.position[2].toFixed(2)}`;
      const list = byRow.get(key) ?? [];
      list.push({ x: pose.position[0], w: pose.width, id: pose.cardId });
      byRow.set(key, list);
    }
    for (const [key, list] of byRow) {
      list.sort((a, b) => a.x - b.x);
      for (let i = 1; i < list.length; i++) {
        const left = list[i - 1]!;
        const right = list[i]!;
        const gap = right.x - left.x - (left.w + right.w) / 2;
        checked += 1;
        if (-gap > worst.overlap) worst = { overlap: -gap, where: `${file} ${key}` };
        if (gap < -1e-9) {
          const modelA = poses.get(left.id)?.modelId ?? 'disc';
          const modelB = poses.get(right.id)?.modelId ?? 'disc';
          const pair = [modelA, modelB].sort().join(' + ');
          overflowing.set(pair, (overflowing.get(pair) ?? 0) + 1);
        }
      }
    }
  }

  console.log(
    `  ${String(checked)} neighbouring pairs · worst overlap ${worst.overlap.toFixed(3)} units ` +
      `(${worst.where || 'none'})`,
  );
  for (const [pair, n] of [...overflowing].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${pair.padEnd(20)} overlaps in ${String(n)} pairs`);
  }

  assert.ok(checked > 5000, `only ${String(checked)} pairs — the sweep is not running`);
  // **No exemption** (T8): slice 1 allowed the drone to overflow and named it here;
  // with the drone measured as it is drawn and the clamp strict, any overlap at
  // all is a regression in the clamp or in the pipeline's measurement.
  assert.deepEqual([...overflowing.keys()], [], 'neighbouring figures overlap');
});

// ---------------------------------------------------------------------------
// T8 — a wrapped rank's back row (Tier 2 follow-up 3)
// ---------------------------------------------------------------------------

/** The kinds that lie flat on the table — an independent copy of layout.ts's set. */
const FLAT = new Set(['creature', 'land', 'attachment', 'graveyard', 'exile', 'command']);

/**
 * **Written here, independently of `layout.ts`'s `footprintContains`**, so the test
 * does not grade the code with the code's own ruler: a flat card is `CARD_W × 1`
 * turned in the table plane by `rotation[2]`, which is how `CardPlane` draws it.
 */
function onCard(card: Placement, x: number, z: number): boolean {
  const spin = card.rotation[2];
  // The card's two in-plane axes, in world x/z: width along (cos, sin), depth
  // along (−sin, cos) — the same quarter turn a tap is.
  const ux = Math.cos(spin);
  const uz = Math.sin(spin);
  const dx = x - card.position[0];
  const dz = z - card.position[2];
  const along = dx * ux + dz * uz;
  const across = -dx * uz + dz * ux;
  return Math.abs(along) < (CARD_W * card.scale) / 2 - 1e-6 && Math.abs(across) < card.scale / 2 - 1e-6;
}

test('figure-pose: no figure stands inside another card — the crowded ranks, and the whole corpus', () => {
  const frames = fixtureStates();
  let stands = 0;
  let backRow = 0;
  let stepped = 0;
  let crowded = 0;
  const sideboard = { frames: 0, backRow: 0 };
  const inside: string[] = [];

  for (const { file, state } of frames) {
    const placed = layout(state);
    const poses = figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS });
    const flat = placed.placements.filter((p) => FLAT.has(p.kind));
    const wraps = placed.placements.some((p) => p.kind === 'creature' && p.row > 0);
    if (wraps) crowded += 1;
    if (wraps && file.endsWith('human-sideboard-7.jsonl')) sideboard.frames += 1;

    for (const pose of poses.values()) {
      // A ghost is a spell hovering at its caster's casting anchor, not a figure
      // standing on the table.
      if (pose.ghost) continue;
      const own = placed.byKey.get(`c:${String(pose.cardId)}`)!;
      stands += 1;
      if (own.row > 0) {
        backRow += 1;
        if (file.endsWith('human-sideboard-7.jsonl')) sideboard.backRow += 1;
        if (Math.abs(pose.position[2] - own.position[2]) > 1e-9) stepped += 1;
      }
      const [x, , z] = pose.position;
      for (const card of flat) {
        if (card === own) continue;
        // Its own attachments lie under its own card: a figure may stand on its aura.
        if ((card.card as { attachedToId?: number | null }).attachedToId === pose.cardId) continue;
        if (onCard(card, x, z)) {
          inside.push(
            `${file}: card ${String(pose.cardId)} (row ${String(own.row)}) stands inside ` +
              `${card.kind} ${String(card.cardId)}${card.tapped ? ' (tapped)' : ''}`,
          );
        }
      }
    }
  }

  console.log(
    `figure-pose: ${String(stands)} stand points in ${String(frames.length)} frames · ` +
      `${String(crowded)} frames wrap a rank · ${String(backRow)} back-row stand points ` +
      `(${String(stepped)} stepped back off a front-row attachment) · ` +
      `human-sideboard-7: ${String(sideboard.frames)} crowded frames, ${String(sideboard.backRow)} back-row figures · ` +
      `${String(inside.length)} inside another card`,
  );
  // The crowded frames are real test data, not an empty loop: human-sideboard-7
  // is the corpus's most crowded game (up to 11 creatures a seat).
  assert.ok(sideboard.frames >= 20, `only ${String(sideboard.frames)} crowded human-sideboard-7 frames`);
  assert.ok(sideboard.backRow >= 20, `only ${String(sideboard.backRow)} back-row figures in human-sideboard-7`);
  assert.deepEqual(inside.slice(0, 10), [], `${String(inside.length)} stand points inside another card`);
});

test('figure-pose: a back-row figure stands on its own card, behind the front row', () => {
  // Eleven creatures on one seat: six in front, five behind (layout.ts's wrap).
  const many = Array.from({ length: 11 }, (_, i) => card(i + 1));
  const placed = layout(stateWith(many));
  const poses = figurePose(placed, null, DATA, { models: MODELS });
  let back = 0;
  for (const pose of poses.values()) {
    const own = placed.byKey.get(`c:${String(pose.cardId)}`)!;
    if (own.row === 0) {
      assert.equal(pose.position[2], own.position[2] - seatSign('you') * FIGURE_STANDOFF);
      continue;
    }
    back += 1;
    assert.equal(pose.position[0], own.position[0], 'a back-row figure keeps its card’s x');
    assert.equal(pose.position[2], own.position[2], 'on an empty table it stands on its card’s centre');
    // …which is behind every front-row card: further from the table's centre
    // line than any front-row card reaches.
    for (const other of placed.placements) {
      if (other.kind !== 'creature' || other.row !== 0) continue;
      assert.ok(!onCard(other, pose.position[0], pose.position[2]), 'a back-row figure on a front-row card');
    }
  }
  assert.equal(back, 5, 'the wrap put five creatures in the back row');
});

/**
 * **A back-row stand disc is drawn AFTER its own card** (T8 fix, the slice-2
 * verification pass). The disc is additive, transparent and writes no depth, so a
 * disc drawn before the card it lies on is painted over by it: at
 * `human-sideboard-7` frames 1181 and 1195 the verifier found five discs a seat
 * invisible. `FigurePose.onCard` routes a disc into the second pass at
 * `ON_CARD_DISC_ORDER`; this asserts, over every frame of the corpus, that every
 * stand point lying on a flat card belongs to a pose flagged `onCard`, and that
 * the second pass is ordered after every card it can lie on — its own, and any
 * other flat card whose footprint the disc's centre is inside.
 */
test('figure-pose: every disc that lies on a card is drawn after it — the back row is visible', () => {
  let onCardPoses = 0;
  let sideboard1181 = 0;
  const wrong: string[] = [];
  for (const { file, index, state } of fixtureStatesIndexed()) {
    const placed = layout(state);
    const poses = figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS });
    const flat = placed.placements.filter((p) => FLAT.has(p.kind));
    for (const pose of poses.values()) {
      // A silhouette flies and draws no stand disc (T10) — nothing to paint over.
      if (pose.ghost || pose.silhouette !== null) continue;
      const own = placed.byKey.get(`c:${String(pose.cardId)}`)!;
      const under = flat.filter((card) => onCard(card, pose.position[0], pose.position[2]));
      if (under.length > 0 && !pose.onCard) {
        wrong.push(`${file}@${String(index)}: card ${String(pose.cardId)} stands on a card and is not onCard`);
      }
      if (!pose.onCard) continue;
      onCardPoses += 1;
      if (file.endsWith('human-sideboard-7.jsonl') && (index === 1181 || index === 1195)) sideboard1181 += 1;
      if (own.row === 0) wrong.push(`${file}@${String(index)}: a front-row figure flagged onCard`);
      for (const card of under) {
        if (card.renderOrder >= ON_CARD_DISC_ORDER) {
          wrong.push(`${file}@${String(index)}: card ${String(card.cardId)} (order ${String(card.renderOrder)}) draws over its disc`);
        }
      }
    }
  }
  console.log(
    `figure-pose: ${String(onCardPoses)} stand discs lie on a card, all in the pass at renderOrder ` +
      `${String(ON_CARD_DISC_ORDER)} · human-sideboard-7 @1181 and @1195: ${String(sideboard1181)} of them`,
  );
  assert.deepEqual(wrong.slice(0, 10), [], `${String(wrong.length)} discs would be painted over`);
  // 199 since the second verification pass stopped counting the one back-row
  // carrier (a silhouette draws no disc, and the opponent's flies over the centre).
  assert.ok(onCardPoses >= 199, `only ${String(onCardPoses)} on-card discs — the back row is test data`);
  assert.equal(sideboard1181, 20, 'the verifier’s two frames: five back-row discs a seat, both seats, both frames');
  // The pass is between the table's ranks and the hand fan (renderOrder 100 + i).
  assert.ok(ON_CARD_DISC_ORDER < 100);
});

// ---------------------------------------------------------------------------
// Slice 3 — T10's carrier flies OVER the rank, which is why it is not a neighbour
// ---------------------------------------------------------------------------

test('figure-pose: a vehicle silhouette flies above every figure on its seat (T10)', () => {
  let silhouettes = 0;
  let lowest = Number.POSITIVE_INFINITY;
  let lowestOpp = Number.POSITIVE_INFINITY;
  let tallest = 0;
  let under = 0;
  // Twice: with the cue file's `presence` rules (what the arena draws — Wasp and
  // the Doombot hover higher then), and with none (the altitude floor alone).
  for (const [{ file, state }, presence] of fixtureStates().flatMap((f) => [
    [f, PRESENCE],
    [f, {}],
  ] as const)) {
    const placed = layout(state, presence);
    const poses = figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS });
    for (const carrier of poses.values()) {
      if (carrier.silhouette === null) continue;
      silhouettes += 1;
      assert.equal(carrier.radius, 0, `${file}: a silhouette draws a stand disc`);
      assert.equal(carrier.props.length, 1, `${file}: a silhouette carries props`);
      assert.equal(carrier.props[0]?.kind, 'carrier');
      const underside = carrier.position[1] - carrier.height / 2;
      if (carrier.seat === 'you') lowest = Math.min(lowest, underside);
      else lowestOpp = Math.min(lowestOpp, underside);
      for (const figure of poses.values()) {
        if (figure.silhouette !== null || figure.ghost) continue;
        const top = figure.position[1] + figure.height;
        if (figure.seat === carrier.seat) tallest = Math.max(tallest, top);
        // Only a figure it passes over can be under it: within its length in x,
        // and within its footprint in z (its pods reach 0.36 of its length).
        if (Math.abs(figure.position[0] - carrier.position[0]) > (carrier.width + figure.width) / 2) continue;
        if (Math.abs(figure.position[2] - carrier.position[2]) > carrier.width * 0.36 + figure.width / 2) continue;
        under += 1;
        assert.ok(
          top < underside,
          `${file}: the carrier's underside (${underside.toFixed(2)}) is below a figure's head (${top.toFixed(2)})`,
        );
      }
    }
  }
  console.log(
    `figure-pose: ${String(silhouettes)} carrier silhouettes · lowest underside ${lowest.toFixed(2)} (yours) / ` +
      `${lowestOpp.toFixed(2)} (the opponent's, over the centre line) · tallest head on a carrier's seat ${tallest.toFixed(2)} · ` +
      `${String(under)} figure-under-carrier pairs, every one clear`,
  );
  assert.ok(silhouettes > 1200, `only ${String(silhouettes)} carrier silhouettes over the corpus (both passes)`);
  assert.ok(lowest >= SILHOUETTE_ALTITUDE - 0.2, `your carrier flew at ${lowest.toFixed(2)}`);
  assert.ok(lowestOpp >= OPP_SILHOUETTE_ALTITUDE - 0.1, `the opponent's carrier flew at ${lowestOpp.toFixed(2)}`);
  assert.ok(under > 100, 'no figure ever stood under a carrier — the clearance check is idle');
});

test('figure-pose: from the table view, no carrier is drawn over a figure — and none under the HUD — on either seat (verification fixes)', () => {
  // Slice 3 first flew the carrier at 1.65, 1.85 long: from the table view's steep
  // camera one over YOUR rank projected onto your own figures (`g1`@323, a rotor
  // disc on Wasp's head; 352 of 799 own-seat pairs overlapped by more than 5%).
  // Raised to `SILHOUETTE_ALTITUDE` 2.05 and 1.5 long, it projects above the rank
  // it flies over. The box is the geometry's own bounds (`CARRIER_BOUNDS`, which
  // traits.test.ts holds the built geometry to), turned by the pose.
  const rect = (points: Array<[number, number, number]>): number[] | null => {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const p of points) {
      const ndc = projectToNdc(REST_POSE, p, undefined, 1.6);
      if (ndc === null) return null;
      x0 = Math.min(x0, ndc[0]);
      y0 = Math.min(y0, ndc[1]);
      x1 = Math.max(x1, ndc[0]);
      y1 = Math.max(y1, ndc[1]);
    }
    return [x0, y0, x1, y1];
  };
  const cover = (a: number[], b: number[]): number => {
    const w = Math.min(a[2]!, b[2]!) - Math.max(a[0]!, b[0]!);
    const h = Math.min(a[3]!, b[3]!) - Math.max(a[1]!, b[1]!);
    return w > 0 && h > 0 ? (w * h) / ((b[2]! - b[0]!) * (b[3]! - b[1]!)) : 0;
  };
  let pairs = 0;
  let worst = 0;
  let where = '';
  // **The chrome's keep-out band** (the second verification pass): the arena's
  // own strips, credit line and seat card sit over the top HUD_TOP_PX of the
  // canvas, fixed in pixels — so the band is widest in NDC on the shortest
  // canvas. Checked at every live aspect, on a 745 px canvas (a 1280 × 800
  // window) and a 946 px one (1600 × 1000); the opponent's carrier used to sit
  // half under it (g1@316, @355; g3@270).
  const bands = [745, 946].map((canvas) => 1 - (2 * HUD_TOP_PX) / canvas);
  let highest = Number.NEGATIVE_INFINITY;
  let highestWhere = '';
  let oldHighest = Number.NEGATIVE_INFINITY;
  for (const { file, state } of fixtureStates()) {
    const placed = layout(state, PRESENCE);
    const poses = figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS });
    for (const carrier of poses.values()) {
      if (carrier.silhouette === null) continue;
      if (carrier.seat === 'opp') {
        // The control: where slice 3 flew the opponent's carrier — over its own
        // stand point, at least SILHOUETTE_ALTITUDE up, full size.
        const stand = standPointOf(placed.byKey.get(`c:${String(carrier.cardId)}`)!);
        const y = stand[1] + Math.max(1.25, SILHOUETTE_ALTITUDE - stand[1]);
        const L0 = carrier.width / OPP_SILHOUETTE_SCALE;
        for (const x of CARRIER_BOUNDS.x) {
          for (const yy of CARRIER_BOUNDS.y) {
            for (const z of CARRIER_BOUNDS.z) {
              const ndc = projectToNdc(REST_POSE, [stand[0] - L0 * x, y + L0 * yy, stand[2] - L0 * z], undefined, 1.6);
              if (ndc !== null) oldHighest = Math.max(oldHighest, ndc[1]);
            }
          }
        }
      }
      const L = carrier.width;
      const c = Math.cos(carrier.facingY);
      const sn = Math.sin(carrier.facingY);
      const hull: Array<[number, number, number]> = [];
      for (const x of CARRIER_BOUNDS.x) {
        for (const y of CARRIER_BOUNDS.y) {
          for (const z of CARRIER_BOUNDS.z) {
            // Figure space → world: a turn of facingY about y, then the pose.
            hull.push([
              carrier.position[0] + L * (x * c + z * sn),
              carrier.position[1] + L * y,
              carrier.position[2] + L * (-x * sn + z * c),
            ]);
          }
        }
      }
      const drawn = rect(hull);
      if (drawn === null) continue;
      for (const aspect of LIVE_ASPECTS) {
        for (const p of hull) {
          const ndc = projectToNdc(REST_POSE, p, undefined, aspect);
          if (ndc === null || ndc[1] <= highest) continue;
          highest = ndc[1];
          highestWhere = `${file} carrier ${String(carrier.cardId)} (${carrier.seat}) at aspect ${aspect.toFixed(2)}`;
        }
      }
      for (const figure of poses.values()) {
        if (figure.silhouette !== null || figure.ghost) continue;
        const [x, y, z] = figure.position;
        const d = figure.height * 0.3;
        const box: Array<[number, number, number]> = [];
        for (const bx of [x - figure.width / 2, x + figure.width / 2]) {
          for (const by of [y, y + figure.height]) for (const bz of [z - d, z + d]) box.push([bx, by, bz]);
        }
        const body = rect(box);
        if (body === null) continue;
        pairs += 1;
        const covered = cover(drawn, body);
        if (covered > worst) {
          worst = covered;
          where = `${file} carrier ${String(carrier.cardId)} (${carrier.seat}) over figure ${String(figure.cardId)} (${figure.seat})`;
        }
      }
    }
  }
  console.log(
    `figure-pose: carriers × figures on screen (table view): ${String(pairs)} pairs · worst cover ${worst.toFixed(3)} ${where}\n` +
      `  the highest a carrier reaches: NDC y ${highest.toFixed(3)} (${highestWhere}) · the HUD band starts at ${bands.map((b) => b.toFixed(3)).join(' / ')}` +
      ` · slice 3's opponent carrier reached ${oldHighest.toFixed(3)}`,
  );
  assert.ok(pairs > 2000, 'the sweep compared almost nothing');
  assert.ok(worst < 0.05, `a carrier covers ${(worst * 100).toFixed(1)}% of a figure from the table view: ${where}`);
  for (const band of bands) {
    assert.ok(highest < band, `a carrier reaches NDC ${highest.toFixed(3)}, into the HUD band above ${band.toFixed(3)}: ${highestWhere}`);
    assert.ok(oldHighest > band, `slice 3's opponent carrier (NDC ${oldHighest.toFixed(3)}) is under ${band.toFixed(3)} — the band check is idle`);
  }
});
