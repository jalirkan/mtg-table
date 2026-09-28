/*
 * mtg-table — web/test/duelists.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **T13 — the duelists, as data, as a pose and as gestures** (Tier 2 slice 4).
 *
 * `figures/duelists.ts` is pure, the cue engine is pure, and the gesture rides the
 * clip lane on a reserved id — so the whole of the duelists' behaviour except the
 * drawing is checkable here, over the committed corpus, with no browser:
 *
 *  - `duelists.json` validates with zero errors, and every look and gesture names
 *    things the figure library and the prop kit actually have;
 *  - a duelist is a SEAT: one pose per seat, no name and no card on it, its stance
 *    from `board.gameOver` alone;
 *  - the ladder writes a `gesture` fact on exactly the four events a duelist
 *    answers, the planner keeps one flinch per blow and carries an AI's absorbed
 *    `cast` to its arrival, and the cue builder plays and releases the lane;
 *  - over every batch of every recording the duelist lanes are empty once the batch
 *    has drained — the decay assertion `replay-cues.test.ts` makes for every lane,
 *    stated again for these two ids with the census printed.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { CueQueue, planBatch } from '../src/arena/cues/queue.ts';
import { REGISTRY } from '../src/arena/cues/registry.ts';
import { NullStage, type CueContext } from '../src/arena/cues/stage.ts';
import { validateCues } from '../src/arena/cues/validate.ts';
import { clipEnvelope } from '../src/arena/figures/clips.ts';
import duelistsJson from '../src/arena/figures/duelists.json' with { type: 'json' };
import {
  DUELIST_LANE_BASE,
  GESTURES,
  GESTURE_CLIP,
  costumeOf,
  duelistBusts,
  duelistLane,
  duelistPoses,
  duelistStand,
  gestureClipKeys,
  isDuelistLane,
  stanceEntry,
  stanceOf,
  validateDuelists,
  type DuelistData,
} from '../src/arena/figures/duelists.ts';
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import { COSTUME_SLOTS, anchorsOf, familyOf } from '../src/arena/figures/props.ts';
import { validateModels } from '../src/arena/figures/validate.ts';
import { baseName } from '../src/arena/scene/props.ts';
import { loadLibrary } from './prop-raster.ts';
import { layout } from '../src/arena/layout.ts';
import type { GameEvent } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const MODELS = validateModels(modelsJson).data;
const DATA: DuelistData = validateDuelists(duelistsJson).data;
const CUES = (() => {
  const raw = JSON.parse(readFileSync(fileURLToPath(new URL('../src/arena/cues/cues.json', import.meta.url)), 'utf8'));
  return validateCues(raw, { cueIds: new Set(REGISTRY.keys()) }).data;
})();

function fixtureFiles(): string[] {
  const out: string[] = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) if (name.endsWith('.jsonl')) out.push(dir + name);
  }
  return out;
}

function statesOf(file: string): ClientState[] {
  const log = parseFrameLog(readFileSync(FIXTURES + file, 'utf8'));
  const out: ClientState[] = [];
  let state = initialState(log.header);
  for (const frame of log.frames) {
    state = reduce(state, frame);
    if (frame.type === 'state') out.push(state);
  }
  return out;
}

const seatOf = (viewerId: number | null) => (playerId: number): 'you' | 'opp' =>
  viewerId === null || playerId === viewerId ? 'you' : 'opp';

/** The first frame of g1 with both seats on the board — a real `ClientState` for synthetic batches. */
const G1 = statesOf('games/g1.jsonl');
const TABLE_STATE = G1.find((s) => (s.board?.players.length ?? 0) === 2)!;

// ---------------------------------------------------------------------------
// The data file
// ---------------------------------------------------------------------------

test('duelists: duelists.json validates with zero errors, and names what the library and the kit have', () => {
  const { errors, data } = validateDuelists(duelistsJson);
  assert.deepEqual(errors, [], errors.map((e) => `${e.where}: ${e.message}`).join('\n'));
  assert.equal(data.seats.you, 'director');
  assert.equal(data.seats.opp, 'villain');
  const lines: string[] = [];
  for (const [id, look] of Object.entries(data.looks)) {
    // The body ladder resolves in the manifest the arena loads.
    const body = look.body.find((model) => MODELS.models[model] !== undefined);
    assert.ok(body !== undefined, `${id}: none of ${look.body.join(', ')} is in models.json`);
    const entry = MODELS.models[body]!;
    const family = familyOf(body, MODELS);
    // Every gesture plays a clip this body has — or says it will not.
    const clips = GESTURES.map((gesture) => {
      const key = data.gestures[gesture].clips.find((k) => entry.clips[k] !== undefined) ?? null;
      return `${gesture}→${key ?? '(root and tint only)'}`;
    });
    assert.ok(entry.clips['idle'] !== undefined, `${id}: ${body} has no idle to breathe in`);
    for (const gesture of ['cast', 'flinch'] as const) {
      assert.ok(
        data.gestures[gesture].clips.some((k) => entry.clips[k] !== undefined),
        `${id}: ${body} has none of ${gesture}'s clips (${data.gestures[gesture].clips.join(', ')})`,
      );
    }
    // Every prop has an anchor on this body's family (a prop with none would bake nothing).
    for (const kind of Object.keys(look.props) as Array<keyof typeof look.props>) {
      assert.ok(anchorsOf(kind, family).length > 0, `${id}: prop ${kind} has no anchor on the ${String(family)} family`);
    }
    // The costume is one colour per slot, in the shader's order.
    assert.equal(costumeOf(look).length, COSTUME_SLOTS.length);
    lines.push(
      `  ${id.padEnd(9)} body ${body} (${String(family)}) × ${look.scale} · props ${Object.entries(look.props)
        .map(([k, v]) => `${k}:${v}`)
        .join(' ')} · ${clips.join(' ')}`,
    );
  }
  lines.push(`  gesture clip keys named: ${gestureClipKeys(data).join(', ')}`);
  for (const line of lines) console.log(line);
});

test('duelists: the validator drops a bad look and says where — the negative controls', () => {
  const good = JSON.parse(JSON.stringify(duelistsJson)) as Record<string, unknown>;
  const bad = (mutate: (file: Record<string, any>) => void, expected: string): void => {
    const file = JSON.parse(JSON.stringify(good)) as Record<string, any>;
    mutate(file);
    const messages = validateDuelists(file).errors.map((e) => `${e.where}: ${e.message}`).join('\n');
    assert.ok(messages.includes(expected), `expected "${expected}", got:\n${messages}`);
  };
  bad((f) => (f['extra'] = 1), '$.extra: unknown field');
  bad((f) => (f['looks']['director']['name'] = 'Nick Fury'), '$.looks.director.name: unknown field');
  bad((f) => (f['looks']['director']['tint'] = 'teal'), '$.looks.director.tint: must be #rrggbb');
  bad((f) => (f['looks']['director']['scale'] = 4), '$.looks.director.scale: must be within');
  bad((f) => (f['looks']['director']['body'] = []), '$.looks.director.body: must be a non-empty list');
  bad((f) => (f['looks']['director']['costume']['cape'] = '#000000'), '$.looks.director.costume.cape: not one of COSTUME_SLOTS');
  bad((f) => (f['looks']['director']['props']['cape'] = 'top'), '$.looks.director.props.cape: not a prop kind');
  bad((f) => (f['looks']['director']['props']['coat'] = 'cape'), '$.looks.director.props.coat: must name one of COSTUME_SLOTS');
  bad((f) => (f['seats']['you'] = 'nobody'), '$.seats.you: must name a look');
  bad((f) => (f['gestures']['wave'] = { clips: [] }), '$.gestures.wave: unknown field');
  bad((f) => (f['gestures']['lose']['lean'] = 3), '$.gestures.lose.lean: must be within');
  bad((f) => (f['gestures']['win']['aim'] = [{ joint: 'upperarm_r', child: 'lowerarm_r', aim: [0, 0, 0] }]), '$.gestures.win.aim[0].aim: must be a direction');
  bad((f) => (f['looks']['villain']['props']['hood'] = { slot: 'top', scale: [4, 1, 1] }), '$.looks.villain.props.hood.scale: must be [x, y, z]');
  bad((f) => (f['looks']['villain']['trim'] = 'cape'), '$.looks.villain.trim: must name one of COSTUME_SLOTS');
  // A dropped look drops its seat to the bust; the rest of the file survives.
  const file = JSON.parse(JSON.stringify(good)) as Record<string, any>;
  file['looks']['villain']['tint'] = 'green';
  const result = validateDuelists(file);
  assert.equal(result.data.seats.opp, undefined, 'the seat of a dropped look must fall back to the bust');
  assert.equal(result.data.seats.you, 'director');
});

// ---------------------------------------------------------------------------
// The pose
// ---------------------------------------------------------------------------

test('duelists: one pose per seat over the corpus — a seat, never a name; its stance from gameOver alone', () => {
  let frames = 0;
  let over = 0;
  const stances = new Map<string, number>();
  for (const file of fixtureFiles()) {
    for (const state of statesOf(file)) {
      const board = state.board;
      if (board === null) continue;
      frames += 1;
      const viewer = layout(state, {}).viewerId;
      const poses = duelistPoses(board, seatOf(viewer), DATA);
      const seats = new Set(poses.map((p) => p.seat));
      assert.equal(seats.size, poses.length, `${file}: two duelists on one seat`);
      assert.equal(poses.length, Math.min(2, board.players.length));
      const names = new Set(board.players.map((p) => p.name));
      for (const pose of poses) {
        assert.deepEqual(
          Object.keys(pose).sort(),
          ['colour', 'facingY', 'height', 'isAi', 'look', 'player', 'seat', 'stance', 'stand', 'vigour'],
        );
        // No field of a pose is a player's name (hard rule 8's renderer half, for a seat).
        for (const value of Object.values(pose)) {
          if (typeof value === 'string') assert.ok(!names.has(value), `${file}: a duelist pose carries a player name`);
        }
        assert.deepEqual(pose.stand, duelistStand(pose.seat));
        assert.equal(pose.look, DATA.seats[pose.seat] ?? null);
        assert.equal(pose.stance, stanceOf(board, pose.player));
        stances.set(pose.stance, (stances.get(pose.stance) ?? 0) + 1);
      }
      if (board.gameOver !== null) {
        over += 1;
        const winner = board.gameOver.winner;
        for (const pose of poses) {
          assert.equal(pose.stance, winner === null ? 'ready' : pose.player === winner ? 'won' : 'lost');
        }
      } else {
        for (const pose of poses) assert.equal(pose.stance, 'ready', `${file}: a stance before the game ended`);
      }
      // The bust keeps its five keys (stack.test.ts's contract) and agrees on the seats.
      const busts = duelistBusts(board, seatOf(viewer));
      assert.deepEqual(busts.map((b) => b.seat).sort(), [...new Set(busts.map((b) => b.seat))].sort());
    }
  }
  console.log(
    `  ${String(frames)} board frames · ${String(over)} after the game ended · stances ${[...stances]
      .map(([k, v]) => `${k} ${String(v)}`)
      .join(' · ')}`,
  );
  assert.ok(over > 0 && (stances.get('won') ?? 0) > 0 && (stances.get('lost') ?? 0) > 0);
});

test('duelists: stanceEntry — played by the outcome cue, held at 0 while it is queued, a pose once it has played', () => {
  assert.equal(stanceEntry('ready', 'win', 0.5, true), 0, 'a seat still at the table has no stance');
  assert.equal(stanceEntry('won', null, 0, true), 0, 'the outcome cue is queued behind the blows: still at the table');
  assert.equal(stanceEntry('won', null, 0, false), 1, 'played, skipped or scrubbed: the stance is a pose');
  assert.equal(stanceEntry('won', 'win', 0.35, true), 0.5);
  assert.equal(stanceEntry('lost', 'lose', 0.7, true), 1);
  assert.equal(stanceEntry('lost', 'flinch', 0.5, true), 0, 'a flinch on the killing blow is not the slump');
  assert.equal(stanceEntry('lost', 'flinch', 0.5, false), 1);
});

test('duelists: the lane ids are reserved — below every card id and every "no card" sentinel', () => {
  assert.ok(isDuelistLane(duelistLane(0)) && isDuelistLane(duelistLane(1)));
  assert.notEqual(duelistLane(0), duelistLane(1));
  assert.ok(!isDuelistLane(-1) && !isDuelistLane(0) && !isDuelistLane(123456));
  assert.ok(duelistLane(0) <= DUELIST_LANE_BASE);
});

// ---------------------------------------------------------------------------
// The gestures: the ladder's facts, the planner's two rules, the builder's lane
// ---------------------------------------------------------------------------

const you = TABLE_STATE.hello?.you ?? 0;
const them = TABLE_STATE.board!.players.find((p) => p.id !== you)!.id;

function gestures(events: GameEvent[]): Array<{ id: string; kind: string; gesture: unknown; player: unknown }> {
  const out: Array<{ id: string; kind: string; gesture: unknown; player: unknown }> = [];
  for (const step of planBatch(events, TABLE_STATE, CUES)) {
    for (const cue of step.cues) {
      out.push({ id: cue.id, kind: cue.kind, gesture: cue.params['gesture'], player: cue.params['gesturePlayer'] ?? cue.players[0] });
    }
  }
  return out;
}

test('duelists: the ladder writes a gesture on the four events a duelist answers, and nowhere else', () => {
  const cast = gestures([{ kind: 'cast', cardId: 900, stackId: 1, controller: them } as unknown as GameEvent]);
  assert.deepEqual(cast.map((c) => [c.kind, c.gesture, c.player]), [['cast', 'cast', them]]);

  const hit = gestures([
    { kind: 'damage', target: { kind: 'player', id: you }, sourceCardId: 5, amount: 3, combat: true } as unknown as GameEvent,
    { kind: 'life', player: you, from: 20, to: 17 } as unknown as GameEvent,
  ]);
  // Rule 8: the damage keeps the flinch, the life loss it caused gives its up (and keeps its number).
  assert.deepEqual(hit.map((c) => [c.kind, c.gesture]), [['damage', 'flinch'], ['life', 'none']]);

  const drain = gestures([{ kind: 'life', player: you, from: 20, to: 18 } as unknown as GameEvent]);
  assert.deepEqual(drain.map((c) => c.gesture), ['flinch'], 'a life loss with no damage in the batch flinches');
  const gain = gestures([{ kind: 'life', player: you, from: 18, to: 20 } as unknown as GameEvent]);
  assert.deepEqual(gain.map((c) => c.gesture), [undefined], 'a gain does not flinch');
  const creature = gestures([
    { kind: 'damage', target: { kind: 'card', id: 7 }, sourceCardId: 5, amount: 3, combat: true } as unknown as GameEvent,
  ]);
  assert.ok(creature.every((c) => c.gesture === undefined), 'damage to a CARD is the card’s shot, not its controller’s flinch');
  const outcome = gestures([{ kind: 'outcome', winner: you, lastTurn: 9 } as unknown as GameEvent]);
  assert.deepEqual(outcome.map((c) => [c.id, c.gesture]), [['outcome.finish', 'outcome']]);

  // Rule 5b: a cast and its own arrival in one snapshot (how the AI plays) — the
  // cast is absorbed by the arrival, and the arrival raises the CASTER's hand.
  const absorbed = gestures([
    { kind: 'cast', cardId: 901, stackId: 2, controller: them } as unknown as GameEvent,
    { kind: 'zone', cardId: 901, from: { zone: 'stack', player: null }, to: { zone: 'battlefield', player: them } } as unknown as GameEvent,
  ]);
  assert.deepEqual(absorbed.map((c) => [c.kind, c.gesture, c.player]), [['zone', 'cast', them]]);
});

function ctx(id: string, players: number[], params: Record<string, unknown>, key: string, reducedMotion = false): CueContext {
  return { id, targets: [], players, params: params as CueContext['params'], ms: 500, key, reducedMotion };
}

test('duelists: the cue builder plays the gesture on the lane, decays it, and releases only its own', () => {
  const impl = REGISTRY.get('damage.player')!;
  const stage = new NullStage();
  const flinch = ctx('damage.player', [1], { gesture: 'flinch', amount: 3 }, 'k1');
  for (const t of [0, 0.1, 0.5, 0.9, 1]) {
    impl.apply(flinch, t, stage);
    const request = stage.clipOf(duelistLane(1));
    assert.ok(request !== null, `no request at t=${String(t)}`);
    assert.equal(request.clip, GESTURE_CLIP.flinch);
    assert.equal(request.alias, 'flinch');
    assert.equal(request.weight, clipEnvelope(t), 'the gesture decays with the clip envelope');
  }
  assert.equal(stage.clipOf(duelistLane(1))?.weight, 0, 'at t = 1 the duelist is back at its stance');
  impl.end(flinch, stage);
  assert.equal(stage.clips.size, 0, 'end() left a gesture on the lane');

  // Two cues on one duelist: the one that ends must not blank the one still playing.
  const outcome = REGISTRY.get('outcome.finish')!;
  const finish = ctx('outcome.finish', [0, 1], { gesture: 'outcome', winner: 0 }, 'k2');
  outcome.apply(finish, 0.2, stage);
  impl.apply(flinch, 0.3, stage);
  assert.equal(stage.clipOf(duelistLane(1))?.alias, 'lose', 'the slump outranks the flinch');
  assert.equal(stage.clipOf(duelistLane(0))?.alias, 'win');
  impl.end(flinch, stage);
  assert.equal(stage.clipOf(duelistLane(1))?.alias, 'lose', 'the flinch ending released the SLUMP');
  outcome.end(finish, stage);
  assert.equal(stage.clips.size, 0);

  // A draw moves nobody; reduced motion writes nothing (the pose snaps, as a clip does).
  const draw = new NullStage();
  outcome.apply(ctx('outcome.finish', [0, 1], { gesture: 'outcome', winner: -1 }, 'k3'), 0.5, draw);
  assert.equal(draw.clips.size, 0);
  const calm = new NullStage();
  REGISTRY.get('cast.rise')!.apply(ctx('cast.rise', [1], { gesture: 'cast' }, 'k4', true), 0.5, calm);
  assert.equal(calm.clips.size, 0, 'a gesture under prefers-reduced-motion');
  // A row that says `none` silences it.
  const quiet = new NullStage();
  REGISTRY.get('cast.rise')!.apply(ctx('cast.rise', [1], { gesture: 'none' }, 'k5'), 0.5, quiet);
  assert.equal(quiet.clips.size, 0);
  // The redaction net: what a gesture puts on the stage is a clip name and a
  // gesture name — lowercase words from two closed sets, never a name or an id.
  const gestureOps = stage.ops.filter((op) => op.op === 'setClip' && op.cardId !== undefined && isDuelistLane(op.cardId));
  assert.ok(gestureOps.length > 0);
  for (const op of gestureOps) {
    assert.ok(Object.values(GESTURE_CLIP).includes(op.clip!.clip), `a gesture wrote clip "${op.clip!.clip}"`);
    assert.ok((GESTURES as readonly string[]).includes(op.clip!.alias ?? ''), `a gesture wrote alias "${String(op.clip!.alias)}"`);
  }
});

test('duelists: every batch of every recording — gestures played, the duelist lanes empty once it drains', () => {
  const census = new Map<string, number>();
  let batches = 0;
  let pendingSeen = 0;
  for (const file of fixtureFiles()) {
    const stage = new NullStage();
    const queue = new CueQueue({ stage, registry: REGISTRY, data: CUES, mode: 'replay' });
    let now = 0;
    let previous: ClientState['board'] = null;
    for (const state of statesOf(file)) {
      const viewer = layout(state, {}).viewerId;
      const seat = seatOf(viewer);
      if (state.events.length > 0) batches += 1;
      queue.enqueueBatch(state.events, state, undefined, previous);
      previous = state.board;
      if (queue.gesturePending('outcome')) pendingSeen += 1;
      const seen = new Set<string>();
      for (let elapsed = 0; !queue.idle && elapsed < 8000; elapsed += 25) {
        now += 25;
        queue.tick(now);
        for (const [id, request] of stage.clips) {
          if (!isDuelistLane(id) || request.alias === null) continue;
          const player = DUELIST_LANE_BASE - id;
          seen.add(`${seat(player)}:${request.alias}`);
        }
      }
      for (const key of seen) census.set(key, (census.get(key) ?? 0) + 1);
      for (const id of stage.clips.keys()) {
        assert.ok(!isDuelistLane(id), `${file}: a duelist gesture survived its batch`);
      }
      assert.equal(queue.gesturePending('outcome'), false, `${file}: an outcome still pending after the drain`);
    }
  }
  const rows = [...census].sort(([a], [b]) => a.localeCompare(b));
  console.log(`  ${String(batches)} batches · gestures by (seat, gesture), in batches: ${rows.map(([k, v]) => `${k} ${String(v)}`).join(' · ')}`);
  for (const key of ['you:cast', 'opp:cast', 'you:flinch', 'opp:flinch']) {
    assert.ok((census.get(key) ?? 0) > 0, `the corpus never plays ${key}`);
  }
  assert.ok((census.get('you:win') ?? 0) + (census.get('opp:win') ?? 0) > 0, 'no game in the corpus ends with a raised fist');
  assert.ok((census.get('you:lose') ?? 0) + (census.get('opp:lose') ?? 0) > 0, 'no game in the corpus ends with a slump');
  assert.ok(pendingSeen > 0, 'gesturePending never saw an outcome queued');
});

test('duelists: every aimed joint of every gesture is a joint of the body each look stands in (figures.glb)', async () => {
  const library = await loadLibrary();
  const lines: string[] = [];
  for (const [id, look] of Object.entries(DATA.looks)) {
    const model = look.body.map((m) => library.get(m)).find((m) => m !== undefined);
    assert.ok(model !== undefined, `${id}: no body of ${look.body.join(', ')} in figures.glb`);
    const joints = new Set<string>();
    model.source.traverse((child) => {
      if ((child as { isBone?: boolean }).isBone === true) joints.add(baseName(child.name));
    });
    for (const gesture of GESTURES) {
      for (const aim of DATA.gestures[gesture].aim) {
        assert.ok(joints.has(aim.joint) && joints.has(aim.child), `${id} (${model.id}): ${gesture} aims ${aim.joint}→${aim.child}, which the rig lacks`);
      }
    }
    lines.push(`  ${id.padEnd(9)} ${model.id}: ${String(joints.size)} joints · aims ${GESTURES.map((g) => `${g} ${String(DATA.gestures[g].aim.length)}`).join(' · ')}`);
  }
  for (const line of lines) console.log(line);
});
