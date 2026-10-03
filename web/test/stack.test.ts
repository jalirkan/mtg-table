/*
 * mtg-table — web/test/stack.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **T6: the stack, manifested** (report 13 §6) — the five spell forms, the tethers
 * to what each one targets, the ghosted creature spell and the combat freeze, over
 * all eighteen committed recordings.
 *
 * `node --test`, no browser, no GPU: `figures/casting.ts` and `figures/pose.ts`
 * import no three.
 *
 * The three numbers this file pins, all re-measured on 2026-09-26:
 *
 *     389 frames with a non-empty stack, max depth 4
 *      44 stack-item frame-instances carrying at least one target
 *      66 frames with a stack during a COMBAT phase (1.8%)
 *
 * The stack is **shallow, usually untargeted, and rarely in combat** — which is
 * why §6.2's form has to read on its own, why the tether is a bonus, and why §6.4's
 * freeze is a boolean rather than a mechanism.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import {
  FORM_KINDS,
  combatFreeze,
  formKindFor,
  spellForms,
  type SpellForm,
} from '../src/arena/figures/casting.ts';
import { bustReactionInto, duelistBusts } from '../src/arena/figures/duelists.ts';
import { figurePose } from '../src/arena/figures/pose.ts';
import { planBatch } from '../src/arena/cues/queue.ts';
import { REGISTRY } from '../src/arena/cues/registry.ts';
import { NullStage, type CueContext, type Effect } from '../src/arena/cues/stage.ts';
import { validateCues } from '../src/arena/cues/validate.ts';
import cuesJson from '../src/arena/cues/cues.json' with { type: 'json' };
import { validateFigures, validateModels } from '../src/arena/figures/validate.ts';
import { anchorPosition, anchorsFor, layout } from '../src/arena/layout.ts';
import { COMBAT_PHASES } from '../src/render/labels.ts';
import { type AnyCard, type Frame, type StackItem } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const MODEL_IDS = new Set(Object.keys(validateModels(modelsJson).data.models));
const DATA = validateFigures(figuresJson, { modelIds: MODEL_IDS }).data;

function fixtureFiles(): string[] {
  const out: string[] = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (name.endsWith('.jsonl')) out.push(FIXTURES + dir + name);
    }
  }
  return out;
}

const CUES = validateCues(cuesJson).data;

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

const seatOf = (viewerId: number | null) => (playerId: number): 'you' | 'opp' =>
  viewerId === null || playerId === viewerId ? 'you' : 'opp';

const card = (types: string): AnyCard =>
  ({ id: 1, name: 'x', types, manaCost: '{1}' }) as unknown as AnyCard;

// ---------------------------------------------------------------------------
// §6.2 — the five forms
// ---------------------------------------------------------------------------

test('stack: the form is the source card’s primary type, and nothing else', () => {
  assert.equal(formKindFor(card('Creature - Human Spy Hero')), 'figure');
  assert.equal(formKindFor(card('Artifact Creature - Robot Villain')), 'figure');
  assert.equal(formKindFor(card('Instant')), 'dart');
  assert.equal(formKindFor(card('Sorcery')), 'sigil');
  assert.equal(formKindFor(card('Enchantment')), 'ring');
  assert.equal(formKindFor(card('Enchantment - Aura')), 'ring');
  assert.equal(formKindFor(card('Artifact - Equipment')), 'shard');
  assert.equal(formKindFor(card('Artifact - Vehicle')), 'shard');
  // The declared fallback, and it is what a source card this seat may not see gets.
  assert.equal(formKindFor(card('Planeswalker - Nicol Bolas')), 'orb');
  assert.equal(formKindFor(null), 'orb');
  assert.equal(formKindFor({ id: 2, hidden: true } as unknown as AnyCard), 'orb');
  // A face-down creature spell is a `Creature` with an empty name (protocol §3.2),
  // so it is still a figure — the anonymous one, which `figurePose` guarantees.
  assert.equal(formKindFor(card('Creature')), 'figure');
});

// ---------------------------------------------------------------------------
// The corpus sweep
// ---------------------------------------------------------------------------

test('stack: every stack item of every recording forms, tethers and reads', () => {
  const kinds = new Map<string, number>();
  const bySource = new Map<string, { kind: string; count: number }>();
  let stackFrames = 0;
  let forms = 0;
  let tethers = 0;
  let cardTethers = 0;
  let playerTethers = 0;
  let unresolvedTethers = 0;
  let maxDepth = 0;
  let framesWithTether = 0;

  for (const file of fixtureFiles()) {
    for (const state of framesOf(file)) {
      const board = state.board;
      if (board === null || board.stack.length === 0) continue;
      stackFrames += 1;
      const placed = layout(state, {});
      const seat = seatOf(placed.viewerId);
      const sourceOf = (id: number | null): AnyCard | null =>
        id === null ? null : (board.stackCards.find((c) => c.id === id) ?? null);
      const list: SpellForm[] = spellForms(board, seat, () => '#c6ccd6', sourceOf);
      maxDepth = Math.max(maxDepth, list.length);
      forms += list.length;

      let tetheredHere = 0;
      for (const form of list) {
        assert.ok((FORM_KINDS as readonly string[]).includes(form.kind), `${file}: bad form kind`);
        kinds.set(form.kind, (kinds.get(form.kind) ?? 0) + 1);
        const source = sourceOf(form.sourceCardId);
        const types = source === null ? '(no source card)' : ((source as { types?: string }).types ?? '');
        const row = bySource.get(types) ?? { kind: form.kind, count: 0 };
        row.count += 1;
        bySource.set(types, row);

        // The form's own anchor is `layout.ts`'s and is on the table.
        const anchor = anchorsFor(form.seat).casting;
        assert.ok(Number.isFinite(anchor.x) && Number.isFinite(anchor.z));

        const item: StackItem | undefined = board.stack.find((s) => s.id === form.stackItemId);
        assert.ok(item !== undefined, `${file}: a form names a stack item that is not there`);
        // **The tethers are the FRAME's targets, exactly** (§6.3): ids, never names.
        assert.equal(
          form.tethers.length,
          item.targetCardIds.length + item.targetPlayerIds.length,
          `${file}: a tether went missing`,
        );
        for (const tether of form.tethers) {
          tethers += 1;
          tetheredHere += 1;
          if (tether.kind === 'card') {
            cardTethers += 1;
            assert.ok(item.targetCardIds.includes(tether.id), `${file}: invented a card target`);
            // A target this viewer cannot place resolves to `null`, which the
            // renderer draws as nothing — correct rather than an error.
            if (anchorPosition(placed, { kind: 'card', id: tether.id }) === null) {
              unresolvedTethers += 1;
            }
          } else {
            playerTethers += 1;
            assert.ok(item.targetPlayerIds.includes(tether.id), `${file}: invented a player target`);
            assert.ok(anchorPosition(placed, { kind: 'player', id: tether.id }) !== null);
          }
        }
      }
      if (tetheredHere > 0) framesWithTether += 1;
    }
  }

  console.log(
    `  ${String(stackFrames)} frames with a stack · ${String(forms)} form-instances · ` +
      `max depth ${String(maxDepth)}`,
  );
  console.log(
    `  ${String(tethers)} tethers (${String(cardTethers)} card, ${String(playerTethers)} player) in ` +
      `${String(framesWithTether)} frames · ${String(unresolvedTethers)} whose target this viewer cannot place`,
  );
  console.log('  form     instances   source type lines');
  for (const kind of FORM_KINDS) {
    const lines = [...bySource.entries()].filter(([, r]) => r.kind === kind).map(([t]) => t);
    console.log(
      `    ${kind.padEnd(8)} ${String(kinds.get(kind) ?? 0).padStart(5)}       ${lines.join(' · ') || '(never fires)'}`,
    );
  }

  // §6.1 measured 389 stack frames and 44 tethers; D220's villain recording adds
  // 39 and 13, and D230's three AI-deck recordings 103 and 26.
  assert.equal(stackFrames, 531, `${String(stackFrames)} stack frames, not 531`);
  assert.equal(maxDepth, 4, `the deepest stack is ${String(maxDepth)}, not 4`);
  assert.equal(tethers, 83, `${String(tethers)} tethers, not 83 (§6.1's 44, the villain recording's 13 and D230's three AI decks' 26)`);
  // The five drawn kinds fire in the corpus; `orb` is the declared fallback, and
  // until D220 it never did, which is exactly what a census is for. The villain
  // recording puts a LAND's ability on the stack — Villainous Hideout's "a
  // Villain connives" — and a land has no form of its own: the orb, drawn for the
  // first time, for that one type line. D230's Wakanda recording adds the second:
  // an EFFECT with no type line at all — "The Monarch", in the command zone once
  // Okoye, Mighty and Adored makes its controller the monarch, whose "At the
  // beginning of your end step, draw a card." goes on the stack with the effect
  // as its source. Neither a land nor an effect has a form of its own.
  for (const kind of ['figure', 'dart', 'sigil', 'ring', 'shard']) {
    assert.ok((kinds.get(kind) ?? 0) > 0, `the ${kind} form never fires in the corpus`);
  }
  const orbLines = [...bySource.entries()].filter(([, r]) => r.kind === 'orb').map(([t]) => t);
  assert.deepEqual(orbLines, ['Land', ''], `an orb fired for ${orbLines.join(', ')} — a new type line is on the wire, say so`);
});

// ---------------------------------------------------------------------------
// §6.2 — the ghost, and §6.4 — the freeze
// ---------------------------------------------------------------------------

test('stack: a creature spell’s form is its own figure, ghosted at its caster’s anchor', () => {
  let ghosts = 0;
  let figureForms = 0;
  let ghostWithModel = 0;

  for (const file of fixtureFiles()) {
    for (const state of framesOf(file)) {
      const board = state.board;
      if (board === null || board.stack.length === 0) continue;
      const placed = layout(state, {});
      const poses = figurePose(placed, board.combat ?? null, DATA);
      const sourceOf = (id: number | null): AnyCard | null =>
        id === null ? null : (board.stackCards.find((c) => c.id === id) ?? null);
      const list = spellForms(board, seatOf(placed.viewerId), () => '#c6ccd6', sourceOf);

      const onField = new Set<number>();
      for (const player of board.players) {
        for (const c of player.zones.battlefield.cards) onField.add(c.id);
      }

      for (const form of list) {
        if (form.kind !== 'figure') continue;
        figureForms += 1;
        const id = form.sourceCardId;
        if (id === null || onField.has(id)) continue; // an ability, not a creature spell
        const pose = poses.get(id);
        assert.ok(pose !== undefined, `${file}: creature form ${String(id)} has no ghost`);
        assert.equal(pose.ghost, true, `${file}: ${String(id)} is not a ghost`);
        assert.equal(pose.seat, form.seat, `${file}: the ghost stands at the wrong seat`);
        const anchor = anchorsFor(form.seat).casting;
        assert.equal(pose.position[0], anchor.x);
        assert.equal(pose.position[2], anchor.z);
        ghosts += 1;
        if (pose.modelId !== null) ghostWithModel += 1;
      }
    }
  }

  console.log(
    `  ${String(figureForms)} creature forms · ${String(ghosts)} of them ghosts standing at an anchor · ` +
      `${String(ghostWithModel)} with a model (the rest are the disc, §9.4)`,
  );
  assert.ok(ghosts > 100, `only ${String(ghosts)} ghosts — the branch is not being exercised`);
});

test('stack: the combat freeze is a stack AND a combat phase, and it is rare', () => {
  let boardFrames = 0;
  let frozenFrames = 0;
  let frozenPoses = 0;
  let thawedPoses = 0;
  const phases = new Map<string, number>();

  for (const file of fixtureFiles()) {
    for (const state of framesOf(file)) {
      const board = state.board;
      if (board === null) continue;
      boardFrames += 1;
      const frozen = combatFreeze(board);
      // The predicate, restated from the snapshot rather than from the function.
      const expected = board.stack.length > 0 && board.phase !== null && COMBAT_PHASES.has(board.phase);
      assert.equal(frozen, expected, `${file}: combatFreeze disagrees with the snapshot`);
      if (!frozen) continue;
      frozenFrames += 1;
      phases.set(board.phase ?? '?', (phases.get(board.phase ?? '?') ?? 0) + 1);

      const placed = layout(state, {});
      for (const pose of figurePose(placed, board.combat ?? null, DATA, { frozen }).values()) {
        // §6.4's second guard: the spell form is NOT frozen, and a ghosted
        // creature spell is the spell form.
        assert.equal(pose.frozen, !pose.ghost, `${file}: the freeze disagrees with the ghost rule`);
        frozenPoses += 1;
      }
      for (const pose of figurePose(placed, board.combat ?? null, DATA).values()) {
        assert.equal(pose.frozen, false, 'the default is not frozen');
        thawedPoses += 1;
      }
    }
  }

  const pct = ((frozenFrames / boardFrames) * 100).toFixed(1);
  console.log(
    `  a stack during combat in ${String(frozenFrames)} of ${String(boardFrames)} board frames (${pct}%) · ` +
      `${String(frozenPoses)} frozen poses · phases ${JSON.stringify(Object.fromEntries(phases))}`,
  );
  assert.equal(frozenFrames, 87, `${String(frozenFrames)} frozen frames, not 87 (§6.1's 66, the villain recording's 6, D220, and D230's three AI decks' 15)`);
  assert.ok(frozenPoses > 0, 'no figure was ever on the table during a frozen frame');
  assert.equal(frozenPoses, thawedPoses, 'the freeze changed how many figures there are');
  // It is a boolean about the frame, and cheap: 1.8% of frames, so anything
  // expensive here would be paid for 98.2% of the time for nothing.
  assert.ok(frozenFrames < boardFrames * 0.05, `the freeze fires in ${pct}% of frames`);
});

test('stack: a form with no controller is skipped rather than guessed at', () => {
  const board = {
    stack: [
      { id: 1, sourceCardId: 5, controller: null, text: '', targetCardIds: [], targetPlayerIds: [] },
      { id: 2, sourceCardId: 6, controller: 0, text: '', targetCardIds: [7], targetPlayerIds: [1] },
    ],
    stackCards: [],
    players: [],
    phase: 'MAIN1',
  } as unknown as Parameters<typeof spellForms>[0];
  const list = spellForms(board, () => 'you', () => '#ffffff');
  assert.equal(list.length, 1, 'the controller-less item should be skipped');
  assert.equal(list[0]?.stackItemId, 2);
  // Its index is 0: the depth is a depth among DRAWN forms, so the second form of
  // a two-item stack whose bottom was skipped does not hover over an empty slot.
  assert.equal(list[0]?.index, 0);
  assert.deepEqual(list[0]?.tethers, [
    { kind: 'card', id: 7 },
    { kind: 'player', id: 1 },
  ]);
});

test('stack: combatFreeze is total over a pre-game frame and an empty stack', () => {
  assert.equal(combatFreeze(null), false);
  assert.equal(
    combatFreeze({ stack: [], phase: 'COMBAT_DAMAGE' } as unknown as Parameters<typeof combatFreeze>[0]),
    false,
  );
  assert.equal(
    combatFreeze({ stack: [{}], phase: null } as unknown as Parameters<typeof combatFreeze>[0]),
    false,
  );
  assert.equal(
    combatFreeze({ stack: [{}], phase: 'MAIN1' } as unknown as Parameters<typeof combatFreeze>[0]),
    false,
  );
  assert.equal(
    combatFreeze({ stack: [{}], phase: 'COMBAT_DECLARE_BLOCKERS' } as unknown as Parameters<
      typeof combatFreeze
    >[0]),
    true,
  );
});

// ---------------------------------------------------------------------------
// §6.2's second guard — the ghost is the spell form, and the form never freezes
// ---------------------------------------------------------------------------

test('stack: the combat freeze holds the battlefield and never the ghosted spell', () => {
  // A corpus frame with a ghost on the stack, posed as though it were frozen: the
  // corpus has no creature spell cast during combat, so the freeze flag is forced
  // and the assertion is about the rule rather than about a recording.
  let checked = 0;
  for (const file of fixtureFiles()) {
    for (const state of framesOf(file)) {
      const board = state.board;
      if (board === null || board.stack.length === 0) continue;
      const poses = figurePose(layout(state, {}), board.combat ?? null, DATA, { frozen: true });
      let ghosts = 0;
      for (const pose of poses.values()) {
        if (pose.ghost) ghosts += 1;
        assert.equal(pose.frozen, !pose.ghost, `${file}: ghost ${String(pose.ghost)} frozen ${String(pose.frozen)}`);
      }
      if (ghosts > 0) checked += 1;
    }
  }
  assert.ok(checked > 50, `only ${String(checked)} frames with a ghost to check`);
});

// ---------------------------------------------------------------------------
// §6.3 — the strike, aimed from the frame before
// ---------------------------------------------------------------------------

test('stack: a resolving spell strikes what the PREVIOUS frame said it targeted', () => {
  let resolved = 0;
  let aimed = 0;
  let atCards = 0;
  let atPlayers = 0;
  let foes = 0;
  let withoutPrevious = 0;
  for (const file of fixtureFiles()) {
    let previous: ClientState['board'] = null;
    for (const state of framesOf(file)) {
      const steps = planBatch(state.events, state, CUES, previous);
      const noPrevious = planBatch(state.events, state, CUES, null);
      for (const event of state.events) {
        if (event.kind !== 'resolved') continue;
        resolved += 1;
        const cue = steps.flatMap((step) => step.cues).find((c) => c.kind === 'resolved' && c.targets[0] === event.cardId);
        if (cue === undefined) continue;
        const card = cue.params['strikeCard'];
        const player = cue.params['strikePlayer'];
        if (card === undefined && player === undefined) continue;
        aimed += 1;
        // The aim is a target the previous frame's stack item named, verbatim.
        const item = [...(previous?.stack ?? [])].reverse().find((s) => s.sourceCardId === event.cardId);
        assert.ok(item !== undefined, `${file}: a strike with no item on the previous frame's stack`);
        if (typeof card === 'number') {
          atCards += 1;
          assert.equal(card, item.targetCardIds[0], `${file}: strikeCard is not the item's first target`);
        } else {
          atPlayers += 1;
          assert.equal(player, item.targetPlayerIds[0], `${file}: strikePlayer is not the item's first target`);
        }
        if (cue.params['strikeFoe'] === true) foes += 1;
        // A flush hands the planner no previous frame, and then there is no aim.
        const bare = noPrevious.flatMap((step) => step.cues).find((c) => c.kind === 'resolved' && c.targets[0] === event.cardId);
        if (bare !== undefined) {
          assert.equal(bare.params['strikeCard'], undefined, 'a strike was aimed with no previous frame');
          assert.equal(bare.params['strikePlayer'], undefined, 'a strike was aimed with no previous frame');
          withoutPrevious += 1;
        }
      }
      previous = state.board;
    }
  }
  console.log(
    `  ${String(resolved)} resolutions · ${String(aimed)} strikes aimed from the previous frame ` +
      `(${String(atCards)} at a card, ${String(atPlayers)} at a player, ${String(foes)} at a foe)`,
  );
  assert.equal(resolved, 723, `${String(resolved)} resolutions, not the corpus's 723 (412 before D220's villain recording, 493 before D230's three AI decks)`);
  // 41 targeted items were on the previous frame's stack on 2026-09-26; the
  // assertion is a floor so a re-recorded fixture does not need a new number.
  assert.ok(aimed >= 35, `only ${String(aimed)} strikes aimed — the previous frame is not reaching the planner`);
  assert.equal(withoutPrevious, aimed, 'every aimed strike was checked against the no-previous plan');
});

/** A context for driving one cue by hand, as `cues-exhaustive.test.ts` does. */
function ctxOf(id: string, params: CueContext['params'], reducedMotion = false): CueContext {
  return { id, targets: [10], players: [0], params, ms: 480, key: 'k', reducedMotion };
}

test('stack: the strike travels, bursts, poses the struck figure, and decays', () => {
  const impl = REGISTRY.get('resolved.pop');
  assert.ok(impl !== undefined);
  for (const [foe, clip] of [[true, 'hit'], [false, 'channel']] as const) {
    const stage = new NullStage();
    const ctx = ctxOf('resolved.pop', { strikeCard: 20, strikeFoe: foe });
    impl.apply(ctx, 0.3, stage);
    const bolt = stage.effects.get('k:bolt');
    assert.ok(bolt !== undefined, 'no bolt in flight at t = 0.3');
    assert.equal(bolt.kind, 'mote');
    assert.deepEqual(bolt.at, { kind: 'casting', player: 0 });
    assert.deepEqual(bolt.to, { kind: 'card', id: 20 });
    assert.ok((bolt.travel ?? 0) > 0 && (bolt.travel ?? 0) < 1);
    assert.equal(stage.clips.size, 0, 'the target reacted before the bolt arrived');

    impl.apply(ctx, 0.8, stage);
    assert.ok(stage.effects.get('k:impact') !== undefined, 'no impact ring at the target');
    assert.deepEqual(stage.effects.get('k:impact')?.at, { kind: 'card', id: 20 });
    assert.equal(stage.clips.get(20)?.clip, clip, `a ${foe ? 'foe' : 'friend'} should play ${clip}`);

    impl.apply(ctx, 1, stage);
    impl.end(ctx, stage);
    assert.equal(stage.effects.size, 0, 'the strike left an effect behind');
    assert.equal(stage.clips.size, 0, 'the strike left a clip on the struck figure');
    assert.equal(stage.offsets.size, 0);
  }
  // Untargeted: the discharge into its own card, and no bolt at all.
  const stage = new NullStage();
  impl.apply(ctxOf('resolved.pop', {}), 0.5, stage);
  assert.equal(stage.effects.get('k:bolt'), undefined);
  assert.deepEqual(stage.effects.get('k:beam')?.to, { kind: 'card', id: 10 });
});

test('stack: a fizzle drops from the casting anchor to the table under it', () => {
  const impl = REGISTRY.get('resolved.fizzle');
  assert.ok(impl !== undefined);
  const stage = new NullStage();
  const ctx = ctxOf('resolved.fizzle', { fizzled: true });
  impl.apply(ctx, 0.5, stage);
  const drop = stage.effects.get('k:drop');
  assert.ok(drop !== undefined && drop.kind === 'mote', 'no falling form');
  assert.deepEqual(drop.to, { kind: 'casting', player: 0, ground: true });
  impl.apply(ctx, 1, stage);
  impl.end(ctx, stage);
  assert.equal(stage.effects.size, 0);

  // `ground` is a named place, and `layout.ts` puts it on the table under the anchor.
  const state = framesOf(fixtureFiles()[0]!).find((s) => s.board !== null)!;
  const placed = layout(state, {});
  const viewer = placed.viewerId ?? 0;
  const air = anchorPosition(placed, { kind: 'casting', player: viewer });
  const ground = anchorPosition(placed, { kind: 'casting', player: viewer, ground: true });
  assert.ok(air !== null && ground !== null);
  assert.equal(ground[0], air[0]);
  assert.equal(ground[2], air[2]);
  assert.ok(ground[1] < 0.05 && air[1] > 0.5, `ground ${String(ground[1])} vs air ${String(air[1])}`);
});

test('stack: under reduced motion no cue poses a figure — clips collapse to snaps', () => {
  // Every cue that drives a clip, and the two that pose a card they do not target.
  const stage = new NullStage();
  for (const [id, impl] of REGISTRY) {
    const ctx: CueContext = {
      id,
      targets: [10],
      players: [0],
      params: { strikeCard: 20, toId: 30, beamTo: 40 },
      ms: 300,
      key: `rm:${id}`,
      reducedMotion: true,
    };
    for (const t of [0.2, 0.6, 1]) impl.apply(ctx, t, stage);
    impl.end(ctx, stage);
  }
  assert.equal(
    stage.ops.filter((op) => op.op === 'setClip').length,
    0,
    'a cue posed a figure under prefers-reduced-motion',
  );
});

// ---------------------------------------------------------------------------
// §7 — the busts, and what they react to
// ---------------------------------------------------------------------------

test('duelists: one bust per seat, and it carries no name', () => {
  for (const file of fixtureFiles()) {
    for (const state of framesOf(file)) {
      const board = state.board;
      if (board === null) continue;
      const busts = duelistBusts(board, seatOf(layout(state, {}).viewerId));
      assert.equal(busts.length, board.players.length);
      for (const bust of busts) {
        assert.deepEqual(Object.keys(bust).sort(), ['colour', 'isAi', 'player', 'seat', 'vigour']);
        assert.ok(bust.vigour >= 0 && bust.vigour <= 1);
      }
    }
  }
  assert.deepEqual(duelistBusts(null, () => 'you'), []);
});

test('duelists: a bust flinches for exactly as long as an effect at its player lives', () => {
  const effects = new Map<string, Effect>();
  const out = { strength: 1, colour: 'x' as string | null };
  assert.deepEqual(bustReactionInto(out, effects, 1), { strength: 0, colour: null });
  effects.set('a:num', { kind: 'text', at: { kind: 'player', id: 1 }, colour: '#ff0000', strength: 1, radius: 1 });
  effects.set('b:plate', { kind: 'plate', at: { kind: 'player', id: 0 }, colour: '#00ff00', strength: 0.9, radius: 1 });
  assert.equal(bustReactionInto(out, effects, 1).strength, 0, 'a number is the HUD, not a blow; seat 0 is not seat 1');
  effects.set('c:plate', { kind: 'plate', at: { kind: 'player', id: 1 }, colour: '#ff6b5a', strength: 0.6, radius: 1 });
  assert.deepEqual(bustReactionInto(out, effects, 1), { strength: 0.6, colour: '#ff6b5a' });
  effects.delete('c:plate');
  assert.equal(bustReactionInto(out, effects, 1).strength, 0, 'the flinch outlived its cue');
});

// ---------------------------------------------------------------------------
// Tier 2 slice 3 (T11) — the two facts a per-card beat reads off the snapshot
// ---------------------------------------------------------------------------

test('stack: `strikeGrew` is the struck card’s own P/T change across the transition, and nothing else', () => {
  // Over the corpus: every resolution that is aimed at a card carries a
  // `strikeGrew` of -1, 0 or +1, and it agrees with the two frames' P/T.
  const counts = { up: 0, flat: 0, down: 0 };
  const size = (c: AnyCard | undefined): number | null => {
    if (c === undefined) return null;
    const p = Number.parseInt(String((c as { power?: string | null }).power ?? ''), 10);
    const t = Number.parseInt(String((c as { toughness?: string | null }).toughness ?? ''), 10);
    return Number.isFinite(p) && Number.isFinite(t) ? p + t : null;
  };
  const find = (board: ClientState['board'], id: number): AnyCard | undefined => {
    if (board === null) return undefined;
    for (const c of board.stackCards) if (c.id === id) return c;
    for (const pl of board.players) {
      for (const zone of [pl.zones.battlefield, pl.zones.hand, pl.zones.graveyard, pl.zones.exile, pl.zones.command]) {
        for (const c of zone.cards) if (c.id === id) return c;
      }
    }
    return undefined;
  };
  for (const file of fixtureFiles()) {
    let previous: ClientState['board'] = null;
    for (const state of framesOf(file)) {
      for (const cue of planBatch(state.events, state, CUES, previous).flatMap((s) => s.cues)) {
        const struck = cue.params['strikeCard'];
        if (cue.kind !== 'resolved' || typeof struck !== 'number') continue;
        const grew = cue.params['strikeGrew'];
        assert.ok(grew === -1 || grew === 0 || grew === 1, `${file}: strikeGrew ${String(grew)}`);
        const a = size(find(previous, struck));
        const b = size(find(state.board, struck));
        const expected = a === null || b === null || a === b ? 0 : b > a ? 1 : -1;
        assert.equal(grew, expected, `${file}: strikeGrew ${String(grew)} for ${String(a)} → ${String(b)}`);
        counts[grew === 1 ? 'up' : grew === -1 ? 'down' : 'flat'] += 1;
      }
      previous = state.board;
    }
  }
  console.log(`  strikeGrew over the corpus: ${JSON.stringify(counts)}`);
  assert.ok(counts.flat + counts.up + counts.down >= 35);
});

test('stack: `foe` is the other seat — a direction for a sweep, never an aim', () => {
  let casts = 0;
  for (const file of fixtureFiles()) {
    for (const state of framesOf(file)) {
      for (const cue of planBatch(state.events, state, CUES, null).flatMap((s) => s.cues)) {
        if (cue.kind !== 'cast') continue;
        const foe = cue.params['foe'];
        const caster = cue.players[0];
        assert.equal(typeof foe, 'number');
        const seats = state.board?.players.map((p) => p.id) ?? [];
        assert.ok(foe === -1 || (seats.includes(foe as number) && foe !== caster), `${file}: foe ${String(foe)} for caster ${String(caster)}`);
        casts += 1;
      }
    }
  }
  assert.ok(casts > 100, `only ${String(casts)} casts`);
});

test('stack: Pym Particles grows or shrinks by what the SNAPSHOT did, and only pulses when it did nothing', () => {
  const impl = REGISTRY.get('fx.scaleBeam');
  assert.ok(impl !== undefined);
  const peak = (params: CueContext['params']): number => {
    const stage = new NullStage();
    impl.apply({ id: 'fx.scaleBeam', targets: [10], players: [0], params, ms: 700, key: 'k', reducedMotion: false }, 0.5, stage);
    return stage.offsets.get(20)?.scale ?? 1;
  };
  const base = { targetScale: 1.45, follow: true, strikeCard: 20 };
  assert.ok(peak({ ...base, strikeGrew: 1 }) > 1.4, 'a target that got bigger did not grow');
  assert.ok(peak({ ...base, strikeGrew: -1 }) < 0.72, 'a target that got smaller did not shrink');
  const flat = peak({ ...base, strikeGrew: 0 });
  assert.ok(flat > 1 && flat < 1.1, `no change claimed no more than a pulse (saw ${String(flat)})`);
  // Without `follow` the data decides: Wasp's −3/−0 is a shrink whatever happened.
  assert.ok(peak({ targetScale: 0.6, strikeCard: 20, strikeGrew: 1 }) < 0.7);
});
