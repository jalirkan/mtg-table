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
import { test } from 'node:test';

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
  type ClipRequest,
} from '../src/arena/figures/clips.ts';
import { validateFigures, validateModels } from '../src/arena/figures/validate.ts';
import { CLIP_NAMES, STANCES, isClipName, type ClipName } from '../src/arena/figures/types.ts';
import { REGISTRY } from '../src/arena/cues/registry.ts';
import { NullStage } from '../src/arena/cues/stage.ts';

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
    console.log(
      `  ${id.padEnd(9)} has ${have.join(', ')}${missing.length > 0 ? `  · MISSING ${missing.join(', ')}` : ''}`,
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
