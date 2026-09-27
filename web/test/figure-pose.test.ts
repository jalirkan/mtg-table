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

import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import { MAX_FIGURES, discRadiusFor, figurePose, fitHeight } from '../src/arena/figures/pose.ts';
import { STANCES } from '../src/arena/figures/types.ts';
import { validateFigures, validateModels } from '../src/arena/figures/validate.ts';
import {
  FIGURE_HEIGHT,
  FIGURE_MAX_WIDTH,
  FIGURE_MIN_FIT,
  FIGURE_STANDOFF,
  TABLE_HALF_X,
  TABLE_HALF_Z,
  anchorsFor,
  layout,
  seatSign,
  standPointOf,
} from '../src/arena/layout.ts';
import { isHidden, type AnyCard, type Frame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

const MODELS = validateModels(modelsJson).data;
const MODEL_IDS = new Set(Object.keys(MODELS.models));
const DATA = validateFigures(figuresJson, { modelIds: MODEL_IDS }).data;

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
  assert.equal(pose.facingY, 0, 'the viewer’s own figures face the opponent');
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

test('figure-pose: every board frame of every committed recording poses', () => {
  const frames = fixtureStates();
  assert.ok(frames.length > 1000, `expected the whole corpus, saw ${String(frames.length)} frames`);

  let poses = 0;
  let anonymous = 0;
  let withModel = 0;
  let maxInFrame = 0;
  let ghostCount = 0;
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
      assert.deepEqual(pose.position, standPointOf(placement), `${file}: pose left layout.ts`);

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
    assert.equal(
      map.size,
      creatures + ghosts,
      `${file}: ${String(map.size)} poses for ${String(creatures)} creatures + ${String(ghosts)} ghosts`,
    );
    ghostCount += ghosts;
  }

  console.log(
    `figure-pose: ${String(frames.length)} board frames · ${String(poses)} poses · ` +
      `${String(withModel)} with a model · ${String(anonymous)} anonymous · ` +
      `${String(ghostCount)} ghosted creature spells (T6) · ` +
      `max ${String(maxInFrame)} figures in one frame\n` +
      `  stances: ${[...stances].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s}=${String(n)}`).join(' ')}`,
  );
  assert.ok(maxInFrame >= 20, `the busiest frame should hold 21 creatures, saw ${String(maxInFrame)}`);
  // T6: the corpus really does cast creatures, so the ghost branch is live data
  // rather than a branch nothing reaches.
  assert.ok(ghostCount > 100, `only ${String(ghostCount)} ghosted creature spells in the corpus`);
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

test('figure-pose: a figure fits its rank slot, and the one that cannot is named', () => {
  /**
   * **The defect this pins, measured rather than photographed.** T2 normalised every
   * model by HEIGHT to `FIGURE_HEIGHT` 0.85, and the pipeline's own numbers say what
   * that does: the Kenney agent is 1.14× wider than tall (0.97 units wide), the
   * Quaternius drone **2.97×** (2.53 units) and the insect 1.53× (1.30) — against a
   * creature-rank pitch of 0.796. Two Soldier Tokens stood shoulder to shoulder in
   * T3's own attack photograph.
   */
  for (const [id, entry] of Object.entries(MODELS.models)) {
    const ratio = entry.width / entry.height;
    const unclamped = FIGURE_HEIGHT * ratio;
    const clamped = fitHeight(FIGURE_HEIGHT, ratio) * ratio;
    console.log(
      `  ${id.padEnd(8)} ratio ${ratio.toFixed(2)} · at FIGURE_HEIGHT ${unclamped.toFixed(2)} wide · ` +
        `clamped ${clamped.toFixed(2)} wide (slot ${FIGURE_MAX_WIDTH.toFixed(3)})`,
    );
    assert.ok(clamped <= unclamped + 1e-9, `${id}: the clamp made it wider`);
    assert.ok(clamped < unclamped || ratio * FIGURE_HEIGHT <= FIGURE_MAX_WIDTH, `${id}: not clamped`);
    // The floor is what keeps a very wide model visible at all, and the drone is
    // the one archetype it saves — and therefore the one that still overflows.
    const height = fitHeight(FIGURE_HEIGHT, ratio);
    assert.ok(height >= FIGURE_HEIGHT * FIGURE_MIN_FIT - 1e-9, `${id}: below the floor`);
    if (ratio <= FIGURE_MAX_WIDTH / (FIGURE_HEIGHT * FIGURE_MIN_FIT)) {
      assert.ok(
        clamped <= FIGURE_MAX_WIDTH + 1e-9,
        `${id} is ${clamped.toFixed(2)} wide against a ${FIGURE_MAX_WIDTH.toFixed(2)} slot`,
      );
    }
  }
  // `fitHeight` is the pure half and is asserted directly: a square model is
  // untouched, a wide one is limited, an absurd one is floored.
  assert.equal(fitHeight(0.85, 0), 0.85, 'no ratio means no clamp — a pose with no manifest');
  assert.equal(fitHeight(0.85, 0.5), 0.85, 'a tall narrow model is not made shorter');
  assert.ok(Math.abs(fitHeight(0.85, 1.14) - FIGURE_MAX_WIDTH / 1.14) < 1e-9);
  assert.equal(fitHeight(0.85, 99), 0.85 * FIGURE_MIN_FIT, 'the floor holds');
  // The floor is taken from the BASELINE, not from the card's own scale: a
  // Giant-Sized anything is allowed to be limited by the slot, and a shrunk
  // creature is allowed below the floor.
  assert.equal(fitHeight(0.85 * 1.35, 1.53, 0.85), FIGURE_MAX_WIDTH / 1.53);
  assert.ok(fitHeight(0.85 * 0.45, 1.14, 0.85 * 0.45) < 0.4, 'a shrunk host stays shrunk');
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
    // wrapped rank's second row is 0.55 behind the first and is a different row.
    const byRow = new Map<string, Array<{ x: number; w: number; id: number }>>();
    for (const pose of poses.values()) {
      if (pose.ghost) continue;
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
        if (gap < 0) {
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
  /**
   * **Every overlap that remains involves the drone**, and that is the declared
   * exception: it is 2.97× wider than tall, `FIGURE_MIN_FIT` floors its height so it
   * is squat rather than invisible, and it hovers above its neighbours on the
   * `presence` rule it already has. A narrower drone is T9's. Anything else
   * overlapping is a regression in the clamp.
   */
  for (const pair of overflowing.keys()) {
    assert.ok(
      pair.includes('drone'),
      `${pair} overlap — the width clamp no longer holds for models that should fit`,
    );
  }
  // And the pair T2's evidence photographed — two agents shoulder to shoulder — is
  // gone, which is the whole point of the clamp.
  assert.ok(!overflowing.has('agent + agent'), 'two agents still overlap');
});
