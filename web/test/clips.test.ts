/*
 * mtg-table — web/test/clips.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The clip lane** (report 13 §3.3–§3.6, §10.2–§10.4): the arbitration, the
 * envelope, the `CLIP_FOR` table's coverage, and the alias ladder against the
 * committed manifest.
 *
 * It runs under `node --test` with nothing but type stripping, because
 * `figures/clips.ts` imports no three, no React and no DOM (§1.2) — the same
 * payoff `cues/` bought.
 *
 * The one test here that is worth reading as an argument is
 * **"arbitration does not depend on arrival order"**. Offsets compose, so their
 * order cannot matter; poses do not, so a rule chosen by "last writer wins" would
 * make what a figure is *doing* depend on which cue the queue happened to reach
 * first. It is asserted over every permutation of every pair and triple below,
 * because that is cheap and the alternative is trusting a sentence.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import {
  BREATHING_STANCES,
  CLIP_FOR,
  CLIP_PRIORITY,
  REST_CLIP_FOR,
  REST_PHASE_FOR,
  chooseClip,
  clipBeats,
  clipEnvelope,
  clipForCue,
  clipRank,
  clipsRequestedByCues,
  DEPARTURE_FADE_IN,
  DEPARTURE_FADE_OUT_FROM,
  departureDrain,
  departureOpacity,
  departureWeight,
  isDeathCue,
  keepDeparture,
  stepDeparture,
  type ClipRequest,
  type DepartureLane,
} from '../src/arena/figures/clips.ts';
import {
  departedFigures,
  departureStand,
  figurePose,
  type FigureLayout,
  type FigurePose,
} from '../src/arena/figures/pose.ts';
import { DEPARTURE_STEP, seatSign } from '../src/arena/layout.ts';
import { BASE_FRAME_INTERVAL_MS } from '../src/transport/replay.ts';
import { validateFigures, validateModels } from '../src/arena/figures/validate.ts';
import { CLIP_NAMES, STANCES, isClipName, type ClipName } from '../src/arena/figures/types.ts';
import { CueQueue } from '../src/arena/cues/queue.ts';
import { REGISTRY } from '../src/arena/cues/registry.ts';
import { NullStage } from '../src/arena/cues/stage.ts';
import { validateCues } from '../src/arena/cues/validate.ts';
import { layout } from '../src/arena/layout.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const MODELS = validateModels(modelsJson).data;
const FIGURES = validateFigures(figuresJson, {
  modelIds: new Set(Object.keys(MODELS.models)),
}).data;

/**
 * A request from a **distinct** cue each time.
 *
 * The key matters: a cue's own later request always replaces its own earlier one
 * (that is how a falling envelope reaches 0), so two requests that are meant to
 * *arbitrate* have to come from two different cues — which is also the only case
 * arbitration exists for.
 */
let keySeq = 0;
function request(clip: ClipName, weight = 1, t = 0.5, alias: string | null = null): ClipRequest {
  return { clip, t, weight, alias, key: `q${String(keySeq++)}` };
}

/** Every ordering of a list. Used to prove arbitration is order-independent. */
function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([items[i]!, ...tail]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// §3.5 — the table
// ---------------------------------------------------------------------------

test('clips: every cue id in CLIP_FOR is a real cue, and every value a real clip', () => {
  const ids = Object.keys(CLIP_FOR);
  assert.ok(ids.length >= 20, `CLIP_FOR has only ${String(ids.length)} rows`);
  for (const [cueId, clip] of Object.entries(CLIP_FOR)) {
    assert.ok(
      REGISTRY.has(cueId),
      `CLIP_FOR names cue "${cueId}", which registry.ts does not define — the clip would ` +
        'never play and nothing else would say so',
    );
    assert.ok(isClipName(clip), `CLIP_FOR["${cueId}"] is "${clip}", not one of CLIP_NAMES`);
  }
  // §3.5's payoff, as a number: the existing cue file lights up figures with no
  // edit to `cues.json` at all, because the table is keyed on the cue id the
  // ladder already resolved to.
  const covered = ids.filter((id) => REGISTRY.has(id)).length;
  console.log(
    `  CLIP_FOR: ${String(covered)} of registry's ${String(REGISTRY.size)} cues drive a clip ` +
      `(${clipsRequestedByCues().join(', ')})`,
  );
});

test('clips: the four beats T3 promised each have a cue behind them', () => {
  // The T3 row of report 13 §11: "Wire summon / attack / hit / die."
  const byClip = new Map<string, string[]>();
  for (const [cueId, clip] of Object.entries(CLIP_FOR)) {
    byClip.set(clip, [...(byClip.get(clip) ?? []), cueId]);
  }
  for (const clip of ['summon', 'attack', 'hit', 'die'] as const) {
    const cues = byClip.get(clip) ?? [];
    assert.ok(cues.length > 0, `no cue plays "${clip}"`);
    console.log(`  ${clip.padEnd(7)} ← ${cues.sort().join(', ')}`);
  }
  // `zone.enters` is the arrival cue every creature gets by default (§6), so
  // `summon` is reachable without any per-card data at all.
  assert.equal(clipForCue('zone.enters'), 'summon');
  assert.equal(clipForCue('attack.lunge'), 'attack');
  assert.equal(clipForCue('damage.hit'), 'hit');
  assert.equal(clipForCue('damage.lethal'), 'hit');
  assert.equal(clipForCue('zone.dissolve'), 'die');
  // A cue with no entry plays no clip, and that is the common case (§3.6 rung 3).
  assert.equal(clipForCue('tap.rotate'), null);
  assert.equal(clipForCue('turn.banner'), null);
  assert.equal(clipForCue('nonsense.nope'), null);
});

// ---------------------------------------------------------------------------
// §3.3 — arbitration
// ---------------------------------------------------------------------------

test('clips: the priority order is total over CLIP_NAMES', () => {
  assert.equal(CLIP_PRIORITY.length, CLIP_NAMES.length);
  assert.deepEqual([...CLIP_PRIORITY].sort(), [...CLIP_NAMES].sort());
  // `die` is the strongest and `idle` the weakest, which is the sentence §3.3
  // writes: a creature that takes lethal damage is dying, not flinching.
  assert.equal(CLIP_PRIORITY[0], 'die');
  assert.equal(CLIP_PRIORITY[CLIP_PRIORITY.length - 1], 'idle');
  assert.ok(clipRank('die') < clipRank('hit'));
  assert.ok(clipRank('hit') < clipRank('attack'));
  assert.ok(clipRank('anything-unknown') >= CLIP_PRIORITY.length);
});

test('clips: arbitration does not depend on arrival order', () => {
  const sets: ClipRequest[][] = [
    [request('hit', 0.8), request('die', 0.4)],
    [request('attack', 1), request('summon', 1)],
    [request('grow', 0.5), request('shrink', 0.5), request('channel', 1)],
    [request('block', 0.3), request('attack', 0.9), request('hit', 0.2)],
    // A tie on rank AND weight, which is the case the third tiebreak exists for.
    [request('grow', 0.5), request('grow', 0.5)],
  ];
  for (const set of sets) {
    const expected = chooseClip(set);
    assert.ok(expected !== null);
    for (const order of permutations(set)) {
      const got = chooseClip(order);
      assert.ok(got !== null);
      assert.equal(
        got.clip,
        expected.clip,
        `arbitration picked ${got.clip} in one order and ${expected.clip} in another — ` +
          'a figure would animate differently depending on which cue the queue reached first',
      );
      assert.equal(got.weight, expected.weight);
    }
  }
  assert.equal(chooseClip([]), null, 'no requests means hold the stance');
});

test('clips: clipBeats agrees with chooseClip, because SceneStage uses it instead', () => {
  // `SceneStage` keeps ONE request per card and never builds an array (§9.2 rule
  // 6), so it needs the pairwise form. The two must not be able to disagree.
  const all = CLIP_NAMES.flatMap((clip) => [request(clip, 0.4), request(clip, 1)]);
  for (const a of all) {
    for (const b of all) {
      const pair = chooseClip([a, b]);
      assert.ok(pair !== null);
      const winner = clipBeats(a, b) ? a : b;
      assert.equal(pair.clip, winner.clip, `${a.clip}/${b.clip}: the two rules disagree`);
      assert.equal(pair.weight, winner.weight);
    }
  }
});

test('clips: a Stage keeps the winner however the requests arrive', () => {
  for (const order of permutations([request('hit', 0.9), request('die', 0.2), request('grow', 1)])) {
    const stage = new NullStage();
    for (const r of order) stage.setClip(42, r);
    assert.equal(stage.clips.get(42)?.clip, 'die');
    stage.clearClip(42);
    assert.equal(stage.clips.size, 0);
  }
});

test('clips: a cue replaces its own request, whatever the weight', () => {
  // The defect this is the control for: a rule that only compared rank and weight
  // refused a cue's own falling envelope, so `stage.clips` kept weight 1 forever
  // and the decay assertion only passed because `end()` deleted the entry. The
  // real `SceneStage` hid it (`beginFrame` empties the map every frame); the test
  // double did not, which is how it was found.
  const stage = new NullStage();
  const mine = (weight: number): ClipRequest => ({
    clip: 'attack',
    t: weight,
    weight,
    alias: null,
    key: 'q7',
  });
  stage.setClip(3, mine(1));
  stage.setClip(3, mine(0.2));
  assert.equal(stage.clips.get(3)?.weight, 0.2);
  stage.setClip(3, mine(0));
  assert.equal(stage.clips.get(3)?.weight, 0);
  // …but ANOTHER cue's weaker pose still loses.
  stage.setClip(3, { clip: 'idle', t: 0, weight: 1, alias: null, key: 'q8' });
  assert.equal(stage.clips.get(3)?.clip, 'attack');
});

test('clips: a Stage stores a COPY, so a scratch request cannot alias the map', () => {
  // `registry.ts` fills one module-scope `ClipRequest` per `setClip` call rather
  // than allocating per target per frame. A stage that stored the reference would
  // point every entry at the last write.
  const stage = new NullStage();
  const scratch: ClipRequest = { clip: 'summon', t: 0.2, weight: 1, alias: null, key: 'q1' };
  stage.setClip(1, scratch);
  scratch.clip = 'die';
  scratch.t = 0.9;
  stage.setClip(2, scratch);
  assert.equal(stage.clips.get(1)?.clip, 'summon');
  assert.equal(stage.clips.get(1)?.t, 0.2);
  assert.equal(stage.clips.get(2)?.clip, 'die');
});

// ---------------------------------------------------------------------------
// §1.1 — the envelope, which is what makes the lane decay
// ---------------------------------------------------------------------------

test('clips: the envelope starts at 0, holds at 1 and is back at 0 by t = 1', () => {
  assert.equal(clipEnvelope(0), 0);
  assert.equal(clipEnvelope(1), 0, 'a clip whose weight was still 1 on its last frame would SNAP');
  assert.equal(clipEnvelope(0.5), 1);
  // Monotone up then down, and never outside [0, 1].
  let peak = 0;
  for (let i = 0; i <= 200; i++) {
    const w = clipEnvelope(i / 200);
    assert.ok(w >= 0 && w <= 1, `envelope(${String(i / 200)}) = ${String(w)}`);
    peak = Math.max(peak, w);
  }
  assert.equal(peak, 1);
  // Out of range is clamped rather than extrapolated: `queue.ts` applies `t = 1`
  // exactly once before `end()` for a skipped cue, and a `t` of 1.0000001 from a
  // float division must not wrap the weight negative.
  assert.equal(clipEnvelope(-0.5), 0);
  assert.equal(clipEnvelope(1.5), 0);
});

test('clips: a skipped cue leaves the lane at identity', () => {
  // The mechanism, end to end and without a browser: `queue.ts`'s `#snapGroup`
  // applies a cue at `t = 1` and then calls `end()`.
  for (const [id, impl] of REGISTRY) {
    if (clipForCue(id) === null) continue;
    const stage = new NullStage();
    const ctx = {
      id,
      targets: [11, 12],
      players: [0],
      params: {},
      ms: 400,
      key: `k-${id}`,
      reducedMotion: false,
    };
    impl.apply(ctx, 0.5, stage);
    assert.equal(stage.clips.size, 2, `${id}: a live cue must actually request a pose`);
    assert.equal(stage.clips.get(11)?.weight, 1);
    // The same cue, one frame later and at a LOWER weight: it must replace its
    // own request rather than lose to it (see `ClipRequest.key`).
    impl.apply(ctx, 1, stage);
    assert.equal(stage.clips.get(11)?.weight, 0, `${id}: t=1 must already be at the stance`);
    impl.end(ctx, stage);
    assert.equal(stage.clips.size, 0, `${id}: end() left a pose behind`);
  }
});

test('clips: params.clip is the per-card alias, and it reaches the stage', () => {
  // `cues.json` carries `{"cue": "attack.lunge", "params": {"clip": "pistolDraw"}}`
  // today — `CueParamValue` is already `number | string | boolean` — so this is
  // §3.5's per-card override with no new cue id and no schema change.
  const impl = REGISTRY.get('attack.lunge');
  assert.ok(impl !== undefined);
  const stage = new NullStage();
  const ctx = {
    id: 'attack.lunge',
    targets: [5],
    players: [0],
    params: { clip: 'pistolDraw' },
    ms: 500,
    key: 'k',
    reducedMotion: false,
  };
  impl.apply(ctx, 0.4, stage);
  assert.equal(stage.clips.get(5)?.clip, 'attack');
  assert.equal(stage.clips.get(5)?.alias, 'pistolDraw');
  impl.end(ctx, stage);

  // An empty or non-string `clip` param is no alias at all, not an alias of `""`.
  const stage2 = new NullStage();
  impl.apply({ ...ctx, params: { clip: '' } }, 0.4, stage2);
  assert.equal(stage2.clips.get(5)?.alias, null);
});

// ---------------------------------------------------------------------------
// §3.6 — clip coverage against the committed manifest
// ---------------------------------------------------------------------------

test('clips: every alias figures.json names exists in that model, or is a known absence', () => {
  /**
   * **T2 left three clips deliberately absent** and this test is where that shows
   * up as data rather than as a claim: the drone has no `hit`, the insect no
   * `summon` and no `block`, so §3.6 rung 3 ("a missing clip removes only the part
   * a model was going to add") has live coverage in the corpus. The assertion is
   * therefore about the *aliases* — a per-card alias naming a clip the model does
   * not have is a typo, not a design choice — and the generic names are reported.
   */
  const specs = [
    ...Object.entries(FIGURES.cards),
    ...Object.entries(FIGURES.archetypes),
    ['$.default', FIGURES.default] as const,
  ];
  for (const [key, spec] of specs) {
    if (spec.model === null) continue;
    const model = MODELS.models[spec.model];
    assert.ok(model !== undefined, `${String(key)} names model "${spec.model}"`);
    for (const [clip, alias] of Object.entries(spec.clips)) {
      assert.ok(isClipName(clip), `${String(key)}.clips.${clip} is not a clip name`);
      assert.ok(
        Object.hasOwn(model.clips, alias),
        `${String(key)}.clips.${clip} = "${alias}", which model "${spec.model}" does not define`,
      );
    }
  }

  // The census: which of the ten clips each model can actually play.
  const wanted = clipsRequestedByCues();
  for (const [id, model] of Object.entries(MODELS.models)) {
    const have = wanted.filter((clip) => Object.hasOwn(model.clips, clip));
    const missing = wanted.filter((clip) => !Object.hasOwn(model.clips, clip));
    const retargeted = Object.keys(model.retargeted);
    console.log(
      `  ${id.padEnd(10)} has ${have.join(', ')}${missing.length > 0 ? `  · MISSING ${missing.join(', ')}` : ''}` +
        `${retargeted.length > 0 ? `  · retargeted: ${retargeted.join(', ')}` : ''}`,
    );
  }
  // Every model must carry the four §3.6 calls required, or say which it lacks —
  // and `idle` is the one nothing degrades gracefully without, because it is the
  // resting stance of `ready`.
  for (const [id, model] of Object.entries(MODELS.models)) {
    assert.ok(Object.hasOwn(model.clips, 'idle'), `${id} has no idle — it would stand in its bind pose`);
  }
});

// ---------------------------------------------------------------------------
// §3.9 — the stance is a pose, and the lane's resting half
// ---------------------------------------------------------------------------

test('clips: every stance has a resting clip and a phase', () => {
  for (const stance of STANCES) {
    const clip = REST_CLIP_FOR[stance];
    assert.ok(isClipName(clip), `stance "${stance}" rests in "${clip}", which is not a clip`);
    const phase = REST_PHASE_FOR[stance];
    assert.ok(phase >= 0 && phase <= 1, `stance "${stance}" phase ${String(phase)} is out of range`);
  }
  // A tapped creature kneels; it does NOT rotate with its card (§3.9). The pose
  // module carries the stance and this table is the only thing that turns it into
  // an animation, which is why "same fact, two vocabularies" is mechanical.
  assert.equal(REST_CLIP_FOR.crouch, 'crouch');
  assert.equal(REST_CLIP_FOR.ready, 'idle');
  // An attacker holds its lean for the whole of combat, because `card.attacking`
  // is on the wire for the whole of combat while the lunge is 850 ms.
  assert.equal(REST_CLIP_FOR.attacking, 'attack');
  assert.equal(REST_CLIP_FOR.blocking, 'block');
});

test('clips: only a resting stance breathes — user decision 7', () => {
  // §8.3 rule 1's middle path: breathe while something else is animating, which
  // costs nothing because the frame loop is awake anyway. A held combat pose does
  // not breathe, because a creature mid-charge is not idling.
  assert.ok(BREATHING_STANCES.has('ready'));
  assert.ok(BREATHING_STANCES.has('sick'));
  assert.ok(!BREATHING_STANCES.has('attacking'));
  assert.ok(!BREATHING_STANCES.has('blocking'));
  assert.ok(!BREATHING_STANCES.has('crouch'));
});

// ---------------------------------------------------------------------------
// T8 — one clip set for every humanoid, and no borrowed hit or death
// ---------------------------------------------------------------------------

test('clips: every chibi fallback shares ONE rig and ONE clip set (T8, kept by slice 4)', () => {
  const humanoids = Object.entries(MODELS.models).filter(([, m]) => m.rig === 'kenney-mini');
  const ids = humanoids.map(([id]) => id).sort();
  assert.deepEqual(ids, ['agent-chibi', 'hero-chibi', 'scientist-chibi'], 'the three Kenney bodies are three fallback models');
  // One clip set: the same keys, each one the same source clip renamed per model.
  const strip = (id: string, name: string): string => name.slice(id.length + 1);
  const [firstId, first] = humanoids[0]!;
  for (const [id, model] of humanoids) {
    assert.deepEqual(Object.keys(model.clips).sort(), Object.keys(first.clips).sort(), `${id}'s clip keys`);
    for (const [key, name] of Object.entries(model.clips)) {
      assert.equal(strip(id, name), strip(firstId, first.clips[key]!), `${id}.${key} is not ${firstId}.${key}`);
    }
    assert.deepEqual(model.retargeted, first.retargeted, `${id} retargets a different set`);
    assert.equal(model.bones, 7, `${id} is not on the 7-joint Kenney rig`);
  }
});

/**
 * **Slice 4 — the proportioned bodies share the CLIP LIBRARY's rig**, so every
 * clip is the library's own, retargeted by world-space delta with no chibi in
 * between: the man's body and the woman's carry the same keys from the same
 * source clips (each baked onto its own skeleton), the scientist IS the man's
 * body, and the tapped kneel is the one composed clip.
 */
test('clips: the proportioned bodies share ONE rig and the library\'s clips, joint for joint (slice 4)', () => {
  const humans = Object.entries(MODELS.models).filter(([, m]) => m.rig === 'ubc');
  assert.deepEqual(humans.map(([id]) => id).sort(), ['agent', 'hero', 'scientist']);
  const agent = MODELS.models['agent']!;
  const hero = MODELS.models['hero']!;
  const scientist = MODELS.models['scientist']!;
  assert.equal(scientist.node, agent.node, 'the scientist is not the man\'s body');
  assert.equal(agent.node === hero.node, false);
  for (const model of [agent, hero]) {
    assert.equal(model.bones, 65, 'not the 65-joint library rig');
    assert.deepEqual(Object.keys(model.clips).sort(), Object.keys(agent.clips).sort());
    // Every clip is the library's — nothing is a pack's own, nothing is Mixamo.
    for (const [key, name] of Object.entries(model.clips)) {
      assert.ok(model.retargeted[key]?.startsWith('ual:'), `${key} is not from the clip library`);
      assert.equal(name.slice(name.indexOf('_') + 1), agent.clips[key]!.slice(agent.clips[key]!.indexOf('_') + 1));
    }
  }
  assert.equal(agent.retargeted['crouch'], 'ual:Fixing_Kneeling+Idle_Loop', 'the tapped kneel is no longer the composed clip');
  for (const key of ['idle', 'summon', 'attack', 'block', 'hit', 'die', 'crouch']) {
    assert.ok(agent.clips[key] !== undefined, `the proportioned body has no ${key}`);
  }
});

test('clips: hit and die are real clips, not borrowings (T8)', () => {
  /**
   * Slice 1's humanoid borrowed `fall` for `hit` and `crouch` for `shrink`
   * (`tools/assets-manifest.json`'s old `_clips_note`, "provisional"). T8 takes
   * `hit` and `die` from the Universal Animation Library, retargeted; the borrowings
   * that REMAIN are printed and pinned, so a new one shows up here on the day it is
   * added — `shrink` and `block` still borrow `crouch`, because the library has no
   * shrink either and its crouch face-plants on a chibi (the evidence says how).
   */
  for (const [id, model] of Object.entries(MODELS.models)) {
    const byFile = new Map<string, string[]>();
    for (const [key, name] of Object.entries(model.clips)) {
      const list = byFile.get(name) ?? [];
      list.push(key);
      byFile.set(name, list);
    }
    const shared = [...byFile.values()].filter((keys) => keys.length > 1).map((keys) => keys.sort().join('='));
    console.log(`  ${id.padEnd(10)} borrowings: ${shared.length === 0 ? '(none)' : shared.join(' · ')}`);
    for (const key of ['hit', 'die'] as const) {
      const name = model.clips[key];
      if (name === undefined) continue; // the drone's missing hit: rung 3, deliberate
      assert.equal(byFile.get(name)?.length, 1, `${id}.${key} shares its clip with ${String(byFile.get(name))}`);
    }
    if (model.rig === 'kenney-mini') {
      assert.equal(model.retargeted['hit'], 'ual:Hit_Chest', `${id}'s hit is not the library's`);
      assert.equal(model.retargeted['die'], 'ual:Death01', `${id}'s die is not the library's`);
      assert.deepEqual(shared, ['block=crouch=shrink'], `${id}'s borrowings changed`);
    }
    if (model.rig === 'ubc') {
      // Slice 4: the library has a guard, a kneel and a hunch of its own — the
      // proportioned bodies borrow nothing.
      assert.equal(model.retargeted['hit'], 'ual:Hit_Chest', `${id}'s hit is not the library's`);
      assert.equal(model.retargeted['die'], 'ual:Death01', `${id}'s die is not the library's`);
      assert.deepEqual(shared, [], `${id} borrows a clip`);
    }
  }
});

// ---------------------------------------------------------------------------
// T8 — the departing figure (Tier 2 follow-up 2)
// ---------------------------------------------------------------------------

test('clips: a departing body takes the die clip, never hands it back, and is gone by t = 1', () => {
  assert.equal(departureWeight(0), 0, 'it starts in its last stance');
  assert.equal(departureWeight(DEPARTURE_FADE_IN), 1);
  // Monotone, and still 1 at the end — unlike clipEnvelope, which falls back to 0.
  let last = -1;
  for (let i = 0; i <= 100; i++) {
    const w = departureWeight(i / 100);
    assert.ok(w >= last - 1e-12, `the die weight fell at t = ${String(i / 100)}`);
    last = w;
  }
  assert.equal(departureWeight(1), 1, 'a death does not stand back up');
  assert.equal(clipEnvelope(1), 0, '…which is exactly what the living envelope does, and why this is not it');
  assert.equal(departureOpacity(0), 1);
  assert.equal(departureOpacity(DEPARTURE_FADE_OUT_FROM), 1);
  assert.equal(departureOpacity(1), 0, 'the body is gone when the request is');
  assert.ok(departureOpacity(0.8) > 0 && departureOpacity(0.8) < 1);
  assert.equal(departureDrain(0), 0);
  assert.ok(departureDrain(1) > departureDrain(0.5));
});

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const CUES = (() => {
  const raw = JSON.parse(
    readFileSync(fileURLToPath(new URL('../src/arena/cues/cues.json', import.meta.url)), 'utf8'),
  ) as unknown;
  return validateCues(raw, { cueIds: new Set(REGISTRY.keys()) }).data;
})();

/** Where a card is in this frame: a zone name, or `gone` (a token that ceased to exist). */
function whereIs(state: ClientState, cardId: number): string {
  for (const player of state.board?.players ?? []) {
    for (const [zone, cards] of Object.entries(player.zones)) {
      if ((cards as { cards: Array<{ id: number }> }).cards.some((c) => c.id === cardId)) return zone;
    }
  }
  if ((state.board?.stackCards ?? []).some((c) => c.id === cardId)) return 'stack';
  return 'gone';
}

test('clips: every figure that dies over the corpus is carried by its own die request', () => {
  /**
   * **The sweep that says the death is now SEEN**, run exactly the way
   * `replay-cues.test.ts` runs the corpus: the real reducer, the real queue, a
   * `NullStage`, a 25 ms virtual frame. For every figure with a model that is on the
   * table in one frame and not the next, it records whether its own card received a
   * `die` request mid-cue (0 < t < 1) while that frame's batch drained — which is
   * the condition `DepartureField` draws the body under, and the only one.
   */
  const FRAME_MS = 25;
  let departed = 0;
  let died = 0;
  let snapped = 0;
  const elsewhere = new Map<string, number>();
  const unseen: string[] = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (!name.endsWith('.jsonl')) continue;
      const log = parseFrameLog(readFileSync(FIXTURES + dir + name, 'utf8'));
      const stage = new NullStage();
      const queue = new CueQueue({ stage, registry: REGISTRY, data: CUES, mode: 'replay' });
      let state = initialState(log.header);
      let previous: ClientState['board'] = null;
      let before: FigureLayout | null = null;
      let now = 0;
      for (const frame of log.frames) {
        state = reduce(state, frame);
        if (frame.type !== 'state') continue;
        const after = figurePose(layout(state), state.board?.combat ?? null, FIGURES, { models: MODELS });
        const leaving = before === null ? [] : departedFigures(before, after);
        before = after;
        const from = stage.ops.length;
        queue.enqueueBatch(state.events, state, undefined, previous);
        previous = state.board;
        for (let elapsed = 0; !queue.idle && elapsed < 8000; elapsed += FRAME_MS) {
          now += FRAME_MS;
          queue.tick(now);
        }
        const ops = stage.ops.slice(from);
        for (const pose of leaving) {
          departed += 1;
          const zone = whereIs(state, pose.cardId);
          const requests: ClipRequest[] = [];
          for (const op of ops) {
            const clip = (op as { clip?: ClipRequest }).clip;
            if (op.op === 'setClip' && op.cardId === pose.cardId && clip?.clip === 'die') requests.push(clip);
          }
          const mid = requests.some((request) => request.t > 0 && request.t < 1);
          if (mid) died += 1;
          else if (requests.length > 0) snapped += 1;
          else {
            elsewhere.set(zone, (elsewhere.get(zone) ?? 0) + 1);
            if (zone === 'graveyard' || zone === 'exile' || zone === 'gone') {
              unseen.push(`${dir}${name}: card ${String(pose.cardId)} (${pose.modelId}) → ${zone}, no die request`);
            }
          }
        }
      }
    }
  }
  console.log(
    `clips: ${String(departed)} modelled figures left the table over the corpus · ` +
      `${String(died)} died on their own die request, played mid-cue — the death is drawn · ` +
      `${String(snapped)} got one only snapped (a flushed batch: nothing to draw) · ` +
      `the rest left without one: ${[...elsewhere].map(([z, n]) => `${z}=${String(n)}`).join(' ') || '(none)'}`,
  );
  if (unseen.length > 0) console.log(`  deaths with no die request:\n    ${unseen.slice(0, 12).join('\n    ')}`);
  // Measured when this was written: 17 departures, all 17 deaths, all 17 carried
  // mid-cue — every one of them a body the renderer now draws dying.
  assert.ok(died >= 10, `only ${String(died)} deaths played — the departing figure has nothing to draw`);
  assert.deepEqual(unseen, [], 'a figure went to a graveyard or exile and its card got no die request');
});

// ---------------------------------------------------------------------------
// T8 fix — the blink (slice-2 verification pass): the body is drawn from the
// snapshot it dies in until its death cue ends
// ---------------------------------------------------------------------------

test('clips: the death cues are exactly the cues CLIP_FOR sends to die', () => {
  const deaths = Object.keys(CLIP_FOR).filter(isDeathCue).sort();
  assert.deepEqual(deaths, ['sacrifice.crush', 'zone.dissolve', 'zone.exile']);
  assert.equal(isDeathCue('damage.lethal'), false, 'lethal damage is a hit on a body that is still standing');
  assert.equal(isDeathCue('no.such.cue'), false);
});

test('clips: a departure lane — decided once, drawn while the death is queued, done when it is not', () => {
  const die = (t: number): ClipRequest => ({ clip: 'die', t, weight: 1, alias: null, key: 'q1' });
  const hit: ClipRequest = { clip: 'hit', t: 0.5, weight: 1, alias: null, key: 'q0' };

  // A death: queued behind the damage, the hit plays on the body, then the fall.
  const dying: DepartureLane = { dying: null, done: false };
  assert.equal(stepDeparture(dying, true, null), true, 'drawn from the first frame — the blow has not landed yet');
  assert.equal(stepDeparture(dying, true, hit), true, 'drawn while its own hit plays');
  assert.equal(stepDeparture(dying, true, die(0.4)), true);
  assert.equal(stepDeparture(dying, false, die(0.99)), true, 'the last frame of the fall (the cue ends this tick)');
  assert.equal(stepDeparture(dying, false, null), false, 'the cue has ended: absence');
  assert.equal(dying.done, true);
  assert.equal(stepDeparture(dying, true, die(0.2)), false, 'a done body never comes back');
  assert.equal(keepDeparture(dying, false, 0), false, 'and is disposed at the next snapshot');

  // A bounce: no death queued on its first frame, so it is never drawn — even if
  // the same card is discarded (and dissolves) later.
  const bounced: DepartureLane = { dying: null, done: false };
  assert.equal(stepDeparture(bounced, false, null), false);
  assert.equal(bounced.dying, false);
  assert.equal(stepDeparture(bounced, true, die(0.5)), false, 'the fate was decided on the first frame');
  assert.equal(keepDeparture(bounced, false, 0), false);

  // Undecided: held for DEPARTURE_PATIENCE snapshots, and never once its card is back.
  const undecided: DepartureLane = { dying: null, done: false };
  assert.equal(keepDeparture(undecided, false, 1), true);
  assert.equal(keepDeparture(undecided, false, 3), false);
  assert.equal(keepDeparture({ dying: true, done: false }, true, 0), false, 'back on the table: the living figure has it');
  assert.equal(keepDeparture({ dying: true, done: false }, false, 99), true, 'a dying body waits for its cue, however long the queue');
});

test('clips: a dying body steps out of the rank that closed up behind it', () => {
  const pose = (cardId: number, x: number, seat: 'you' | 'opp' = 'you', width = 0.72): FigurePose =>
    ({ cardId, seat, position: [x, 0.02, seat === 'you' ? 1.78 : -1.78], width }) as FigurePose;
  const body = pose(1, 0);
  // Alone: it dies where it stood.
  assert.deepEqual(departureStand(body, new Map()), [0, 0.02, 1.78]);
  // Its two neighbours closed up half a slot each: one step toward the centre.
  const closed = new Map([
    [2, pose(2, -0.398)],
    [3, pose(3, 0.398)],
  ]);
  assert.deepEqual(departureStand(body, closed), [0, 0.02, 1.78 - DEPARTURE_STEP]);
  // The opponent's body steps toward the centre from the other side.
  const theirs = pose(4, 0, 'opp');
  const stepped = departureStand(theirs, new Map([[5, pose(5, 0.398, 'opp')]]));
  assert.equal(stepped[2], -1.78 + DEPARTURE_STEP);
  assert.equal(Math.sign(stepped[2] - theirs.position[2]), -seatSign('opp'));
  // The other seat's figures are a lane and more away: they never crowd it.
  assert.deepEqual(departureStand(body, new Map([[6, pose(6, 0, 'opp')]])), [0, 0.02, 1.78]);
});

/**
 * **The verification pass's finding, as a corpus test.** Every death of a figure
 * with a model, walked through the queue's own timeline exactly as the arena runs
 * it — the real reducer, the real planner and queue, a `NullStage`, a 25 ms frame,
 * the batch enqueued before the body's first frame (Arena.tsx's layout-effect
 * intake) — with `stepDeparture` deciding on every tick whether the body is drawn.
 *
 * Asserted for every death: the body is drawn on the FIRST tick after the snapshot
 * that removed the living figure, on every tick after that while its death cue is
 * queued or running — including all of the batch's earlier cues, its own `hit`
 * among them — and on no tick after the death cue has ended. Run three times: once
 * with each batch drained before the next frame arrives, once at the replay's own
 * 1× pace (a frame every 400 ms), where a death's batch can wait seconds behind
 * the one before it and the body must be there for all of it — and once with
 * **an idle gap**: each batch drained, then {@link IDLE_GAP_MS} of wall clock with
 * no tick at all, which is what `frameloop="demand"` does to a table with nothing
 * hovering on it (stepping a replay and pausing to read; live play after any
 * pause). That third run is the slice-2 verification pass's major finding: the
 * queue added the whole gap to the cue clock on the next batch's first frame, so
 * the hit, the death cue and the body were consumed before a frame was drawn —
 * and a continuous 25 ms clock could never see it.
 */
const IDLE_GAP_MS = 3000;

test('clips: every dying body is drawn from the snapshot it dies in to the end of its death cue — no blink', () => {
  const FRAME_MS = 25;
  const summary: string[] = [];
  for (const pace of ['drained', 'paced', 'idle'] as const) {
    let deaths = 0;
    let snappedDeaths = 0;
    let fell = 0;
    let waited = 0;
    let longestWait = 0;
    let withHit = 0;
    const failures: string[] = [];
    for (const dir of ['games/', 'synthetic/']) {
      for (const name of readdirSync(FIXTURES + dir).sort()) {
        if (!name.endsWith('.jsonl')) continue;
        const log = parseFrameLog(readFileSync(FIXTURES + dir + name, 'utf8'));
        const stage = new NullStage();
        const queue = new CueQueue({ stage, registry: REGISTRY, data: CUES, mode: 'replay' });
        let state = initialState(log.header);
        let previous: ClientState['board'] = null;
        let before: FigureLayout | null = null;
        let now = 0;
        interface Body {
          lane: DepartureLane;
          age: number;
          label: string;
          ticks: number;
          drawnTicks: number;
          firstMissing: number;
          stopped: boolean;
          redrawn: boolean;
          fellMid: boolean;
          hitDrawn: boolean;
          firstDieAt: number;
          /** Its death cue was applied at t = 1 and ended before its first frame: a snap. */
          snapped: boolean;
        }
        const bodies = new Map<number, Body>();
        const settle = (body: Body): void => {
          if (body.lane.dying === false && body.snapped) snappedDeaths += 1;
          if (body.lane.dying !== true) return;
          deaths += 1;
          if (body.fellMid) fell += 1;
          if (body.hitDrawn) withHit += 1;
          if (body.firstDieAt > 0) {
            waited += 1;
            longestWait = Math.max(longestWait, body.firstDieAt);
          }
          if (body.firstMissing >= 0) failures.push(`${body.label}: not drawn on tick ${String(body.firstMissing)} while its death was still queued`);
          if (body.redrawn) failures.push(`${body.label}: drawn again after its death cue ended`);
          if (!body.stopped) failures.push(`${body.label}: still drawn when the fixture ended`);
        };
        const tick = (): void => {
          now += FRAME_MS;
          const from = stage.ops.length;
          queue.tick(now);
          for (const [cardId, body] of bodies) {
            if (body.lane.dying === null) {
              for (let i = from; i < stage.ops.length; i++) {
                const op = stage.ops[i]!;
                if (op.op === 'setClip' && op.cardId === cardId && op.clip?.clip === 'die' && op.clip.t >= 1) body.snapped = true;
              }
            }
            const pending = queue.deathPending(cardId);
            const request = stage.clips.get(cardId) ?? null;
            const wasDecided = body.lane.dying !== null;
            const drawn = stepDeparture(body.lane, pending, request);
            if (!wasDecided && body.lane.dying === true && !drawn) body.firstMissing = body.ticks;
            if (body.lane.dying !== true) continue;
            if (drawn) {
              if (body.stopped) body.redrawn = true;
              body.drawnTicks += 1;
              if (request?.clip === 'hit') body.hitDrawn = true;
              if (request?.clip === 'die' && request.t > 0 && request.t < 1) body.fellMid = true;
              if (request?.clip === 'die' && body.firstDieAt === 0) body.firstDieAt = body.ticks * FRAME_MS;
            } else {
              if (pending && body.firstMissing < 0) body.firstMissing = body.ticks;
              body.stopped = true;
            }
            body.ticks += 1;
          }
        };
        for (const frame of log.frames) {
          state = reduce(state, frame);
          if (frame.type !== 'state') continue;
          const after = figurePose(layout(state), state.board?.combat ?? null, FIGURES, { models: MODELS });
          // Commit, exactly as DepartureField.commit: age the undecided, drop what is done.
          for (const [cardId, body] of bodies) {
            if (body.lane.dying === null) body.age += 1;
            if (!keepDeparture(body.lane, after.has(cardId), body.age)) {
              settle(body);
              bodies.delete(cardId);
            }
          }
          if (before !== null) {
            for (const pose of departedFigures(before, after)) {
              const old = bodies.get(pose.cardId);
              if (old !== undefined) settle(old);
              bodies.set(pose.cardId, {
                lane: { dying: null, done: false },
                age: 0,
                label: `${dir}${name} card ${String(pose.cardId)} (${String(pose.modelId)})`,
                ticks: 0,
                drawnTicks: 0,
                firstMissing: -1,
                stopped: false,
                redrawn: false,
                fellMid: false,
                hitDrawn: false,
                firstDieAt: 0,
                snapped: false,
              });
            }
          }
          before = after;
          // The intake runs BEFORE the body's first frame (Arena.tsx, a layout effect).
          // A batch the queue cannot hold is flushed and snapped on arrival (§5.2):
          // its deaths are applied at t = 1 there and then, with nothing to draw.
          const opsBefore = stage.ops.length;
          queue.enqueueBatch(state.events, state, undefined, previous);
          for (let i = opsBefore; i < stage.ops.length; i++) {
            const op = stage.ops[i]!;
            const body = op.cardId === undefined ? undefined : bodies.get(op.cardId);
            if (body !== undefined && op.op === 'setClip' && op.clip?.clip === 'die' && op.clip.t >= 1) body.snapped = true;
          }
          previous = state.board;
          if (pace === 'drained' || pace === 'idle') {
            for (let elapsed = 0; !queue.idle && elapsed < 8000; elapsed += FRAME_MS) tick();
            tick();
            // The loop is parked while the queue is idle: wall clock passes and
            // no frame is drawn, so nothing ticks until the next batch arrives.
            if (pace === 'idle') now += IDLE_GAP_MS;
          } else {
            for (let elapsed = 0; elapsed < BASE_FRAME_INTERVAL_MS; elapsed += FRAME_MS) tick();
          }
        }
        for (let elapsed = 0; !queue.idle && elapsed < 20000; elapsed += FRAME_MS) tick();
        tick();
        for (const body of bodies.values()) settle(body);
      }
    }
    summary.push(
      `clips (${pace}): ${String(deaths)} dying bodies (+ ${String(snappedDeaths)} deaths snapped by a flush, ` +
        `nothing to draw) · drawn without a gap from the snapshot to the end of the ` +
        `death cue: ${String(deaths - failures.length)} · fell mid-cue ${String(fell)} · took their own hit ` +
        `${String(withHit)} · drawn before the fall began ${String(waited)} (longest ${String(longestWait)} ms ` +
        '— the gap slice 2 left empty)',
    );
    assert.deepEqual(failures, [], `${pace}: a dying body blinked`);
    // Measured when this was written: 17 deaths in the corpus, every one of them
    // a body the renderer draws from the moment the living figure leaves.
    assert.ok(
      deaths + snappedDeaths >= 17,
      `${pace}: ${String(deaths)} dying bodies and ${String(snappedDeaths)} snapped — the corpus has 17 deaths of a modelled figure`,
    );
    if (pace !== 'paced') assert.equal(snappedDeaths, 0, `${pace}: a drained queue never flushes a death`);
    // The idle run's whole point: after a 3 s parked loop every death still plays
    // its fall on a drawn body, exactly as it does with no gap at all.
    if (pace !== 'paced') assert.ok(fell >= 17, `${pace}: only ${String(fell)} deaths played their fall mid-cue`);
    if (pace === 'idle') assert.ok(withHit >= 1, `idle: no dying body took its own hit on screen (${String(withHit)})`);
  }
  for (const line of summary) console.log(line);
});

// ---------------------------------------------------------------------------
// Tier 2 slice 3 (T11) — the per-card clips are aliases the models actually have
// ---------------------------------------------------------------------------

test('clips: every `params.clip` in cues.json is a clip some model carries (T11)', () => {
  const cues = JSON.parse(
    readFileSync(fileURLToPath(new URL('../src/arena/cues/cues.json', import.meta.url)), 'utf8'),
  ) as { cards: Record<string, Record<string, unknown>>; archetypes: Record<string, Record<string, unknown>> };
  const models = JSON.parse(
    readFileSync(fileURLToPath(new URL('../src/arena/figures/models.json', import.meta.url)), 'utf8'),
  ) as { models: Record<string, { clips: Record<string, string> }> };
  const keys = new Set<string>();
  for (const model of Object.values(models.models)) for (const key of Object.keys(model.clips)) keys.add(key);
  const aliases: string[] = [];
  for (const table of [cues.cards, cues.archetypes]) {
    for (const [name, entry] of Object.entries(table)) {
      for (const [selector, spec] of Object.entries(entry)) {
        if (selector.startsWith('_') || typeof spec !== 'object' || spec === null) continue;
        const clip = (spec as { params?: Record<string, unknown> }).params?.['clip'];
        if (clip === undefined) continue;
        aliases.push(`${name} ${selector} → ${String(clip)}`);
        assert.ok(typeof clip === 'string' && keys.has(clip), `${name} ${selector}: clip "${String(clip)}" is in no model`);
      }
    }
  }
  console.log(`  cues.json clip aliases: ${aliases.join(' · ')}`);
  assert.ok(aliases.some((a) => a.includes('radioCall')), 'Fury’s radio call is not an alias in cues.json');
});

test('clips: Quake’s seismic takedown is HER gesture (fx.shockwave → channel)', () => {
  assert.equal(CLIP_FOR['fx.shockwave'], 'channel');
});

test('clips: Ant-Man’s shrink is one number — cues.json’s attack and traits.json’s `shrink` agree', () => {
  // `traits.json` (the identity table) says the size a card's body takes; the cue
  // that plays the shrink takes its scale from `cues.json` like every cue does.
  // Two files, one number: this is what keeps them from drifting apart.
  const cues = JSON.parse(
    readFileSync(fileURLToPath(new URL('../src/arena/cues/cues.json', import.meta.url)), 'utf8'),
  ) as { cards: Record<string, Record<string, { params?: Record<string, unknown> }>> };
  const scale = cues.cards['Ant-Man, Reformed Rogue']?.['attackers:alone']?.params?.['scale'];
  assert.equal(scale, 0.18);
  let traits: { cards?: Record<string, { shrink?: number }> } | null = null;
  try {
    traits = JSON.parse(
      readFileSync(fileURLToPath(new URL('../src/arena/figures/traits.json', import.meta.url)), 'utf8'),
    ) as { cards?: Record<string, { shrink?: number }> };
  } catch {
    traits = null; // a checkout from before the identity table: nothing to agree with
  }
  const shrink = traits?.cards?.['Ant-Man, Reformed Rogue']?.shrink;
  if (shrink !== undefined) assert.equal(scale, shrink, 'cues.json and traits.json disagree on Ant-Man’s shrink');
});

// ---------------------------------------------------------------------------
// Lane BODIES — the signature resting poses (D140)
// ---------------------------------------------------------------------------

test('clips: every resting pose reads clips every proportioned body has, and joints its rig has (D140)', async () => {
  const { REST_KIT, REST_POSES, restClipsNeeded, restJointsNamed, restModelId } = await import('../src/arena/figures/rests.ts');
  const bodies = Object.entries(MODELS.models).filter(([, entry]) => entry.rig === 'ubc');
  assert.ok(bodies.length >= 2, 'no proportioned bodies in models.json');
  for (const [id, entry] of bodies) {
    for (const clip of restClipsNeeded()) assert.ok(entry.clips[clip] !== undefined, `${id} has no "${clip}" — a resting pose reads it`);
  }
  // The joints, on the real rig, and the variants the library derives.
  const { loadLibrary } = await import('./prop-raster.ts');
  const library = await loadLibrary();
  for (const [id] of bodies) {
    const base = library.get(id)!;
    const joints = new Set<string>();
    base.source.traverse((node) => {
      if ((node as { isBone?: boolean }).isBone === true) joints.add(node.name.replace(/_[1-9]\d*$/, ''));
    });
    for (const joint of restJointsNamed()) assert.ok(joints.has(joint), `${id}'s rig has no ${joint}`);
    for (const rest of REST_POSES) {
      const variant = library.get(restModelId(id, rest));
      assert.ok(variant !== undefined, `the library has no ${restModelId(id, rest)}`);
      assert.equal(variant.rest, rest);
      const idle = variant.clips.get('idle')!;
      if (rest === 'stand') {
        assert.equal(idle, base.clips.get('idle'), 'stand is the body\'s own idle, not a copy');
        continue;
      }
      assert.equal(idle.name, `rest:${rest}`);
      // Every joint the pose aims is HELD: its track is two equal keys.
      for (const aim of REST_KIT[rest].aims) {
        const track = idle.tracks.find((t) => t.name.replace(/_[1-9]\d*(?=\.)/, '') === `${aim.joint}.quaternion`);
        assert.ok(track !== undefined, `${rest}: no track for ${aim.joint}`);
        const v = track.values;
        for (let k = 0; k < 4; k++) assert.equal(v[k], v[4 + k], `${rest}: ${aim.joint} moves — it is held`);
      }
      // Every other clip is the body's own, so the clip lane plays the same attack.
      for (const [key, clip] of base.clips) if (key !== 'idle') assert.equal(variant.clips.get(key), clip, `${rest}: ${key} is not the body's`);
    }
  }
});

test('clips: a resting-pose variant is its body with the hair carved off — nothing else moves (D140, D141)', async () => {
  const { restModelId } = await import('../src/arena/figures/rests.ts');
  const { loadLibrary } = await import('./prop-raster.ts');
  const library = await loadLibrary();
  for (const id of ['agent', 'hero']) {
    const base = library.get(id)!;
    const variant = library.get(restModelId(id, 'stand'))!;
    assert.ok((base.hairIndex?.length ?? 0) > 0, `${id} has no hair to carve`);
    assert.equal(variant.unitScale, base.unitScale, 'a variant stands exactly as tall as its body');
    assert.equal(variant.offsetY, base.offsetY);
    let before = 0;
    let after = 0;
    base.source.traverse((n) => {
      const g = (n as { geometry?: { index: { count: number } | null } }).geometry;
      if (g?.index) before += g.index.count / 3;
    });
    variant.source.traverse((n) => {
      const g = (n as { geometry?: { index: { count: number } | null } }).geometry;
      if (g?.index) after += g.index.count / 3;
    });
    assert.equal(before - after, base.hairIndex!.length / 3, `${id}: the bald body lost more than its hair`);
    console.log(`clips: ${id} — ${String(before)} triangles, its hair ${String(base.hairIndex!.length / 3)}, the bald body ${String(after)}`);
  }
});
