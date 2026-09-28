/*
 * mtg-table — web/test/look.test.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Lane LOOK's pure half** (`arena/look.ts`, D120–D129): the switch, the
 * numbers each material takes, the hologram's jobs under the comic look, the
 * stage's seat colours, and the floor rung that sheds the ink with bloom.
 *
 * The one corpus sweep is hard rule 8's renderer half in the look's terms: over
 * every figure pose of every committed recording, an ANONYMOUS figure (a
 * face-down creature) and a GHOST (a creature spell on the stack) take the
 * hologram — `uLook` 0, no contact shadow — and nothing else does.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import { figurePose } from '../src/arena/figures/pose.ts';
import { validateFigures, validateModels } from '../src/arena/figures/validate.ts';
import { layout, seatFacingY } from '../src/arena/layout.ts';
import {
  COMIC,
  COMIC_LOOK,
  DEFAULT_LOOK,
  HOLO_LOOK,
  HOLO_MATERIAL,
  combatStageOf,
  figureLookOf,
  lightnessOf,
  lookFromSearch,
  materialLookOf,
  paintsFigure,
  sameLook,
  shownIdentityOf,
  stageColoursOf,
  stageIdentitiesOf,
  stageToneOf,
  wantsInkPass,
  wantsShadows,
  wantsStage,
} from '../src/arena/look.ts';
import { INK_DEFAULT, LOOK_DEFAULT, postOnFloor } from '../src/arena/perf.ts';
import type { Frame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const MODELS = validateModels(modelsJson).data;
const DATA = validateFigures(figuresJson, { modelIds: new Set(Object.keys(MODELS.models)) }).data;

function corpusStates(): ClientState[] {
  const out: ClientState[] = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (!name.endsWith('.jsonl')) continue;
      const log = parseFrameLog(readFileSync(FIXTURES + dir + name, 'utf8'));
      let state = initialState(log.header);
      for (const frame of log.frames as Frame[]) {
        state = reduce(state, frame);
        if (frame.type === 'state') out.push(state);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The switch
// ---------------------------------------------------------------------------

test('look: the comic look is the default (D120), and ?look=holo restores the hologram', () => {
  assert.equal(LOOK_DEFAULT, 'comic');
  assert.equal(INK_DEFAULT, 'post');
  assert.ok(sameLook(DEFAULT_LOOK, COMIC_LOOK));
  assert.ok(sameLook(lookFromSearch(''), COMIC_LOOK), 'a URL that says nothing is the comic look');
  assert.ok(sameLook(lookFromSearch('?look=holo'), HOLO_LOOK));
  assert.ok(sameLook(lookFromSearch('look=holo'), HOLO_LOOK), 'the query without its ? (main.tsx hands it on that way)');
  assert.ok(sameLook(lookFromSearch('?look=comic'), COMIC_LOOK));
  assert.ok(sameLook(lookFromSearch('?look=sepia'), COMIC_LOOK), 'an unknown look is the default');
  assert.ok(sameLook(lookFromSearch('?look=holo', 'holo'), HOLO_LOOK));
  assert.ok(sameLook(lookFromSearch('', 'holo'), HOLO_LOOK), 'the fallback is the caller’s');
  // One option at a time, over the base.
  assert.equal(lookFromSearch('?ink=none').ink, 'none');
  assert.equal(lookFromSearch('?ink=hull').ink, 'post', 'the hull is gone (D122): an old URL gets the post line');
  assert.equal(lookFromSearch('?ink=always').ink, 'always', 'the measurement switch: the ink with a composer of its own (D129)');
  assert.equal(lookFromSearch('?halftone=0').halftone, false);
  assert.equal(lookFromSearch('?halftone=off').halftone, false);
  assert.equal(lookFromSearch('?shadow=false').shadow, false);
  assert.equal(lookFromSearch('?key=world').key, 'world');
  assert.equal(lookFromSearch('?stage=felt').stage, 'felt');
  assert.equal(lookFromSearch('?look=holo&stage=comic').stage, 'comic', 'an option overrides the hologram’s base too');
});

test('look: the material numbers — the hologram is all zeros, the comic look carries its options', () => {
  assert.deepEqual(materialLookOf(HOLO_LOOK), { look: 0, halftone: 0, keyWorld: 0 });
  assert.deepEqual(materialLookOf(COMIC_LOOK), { look: 1, halftone: 1, keyWorld: 0 });
  assert.deepEqual(materialLookOf(lookFromSearch('?halftone=0&key=world')), { look: 1, halftone: 0, keyWorld: 1 });
  assert.deepEqual(HOLO_MATERIAL, { look: 0, halftone: 0, keyWorld: 0 });
  // Every comic part is off under the hologram, whatever its option says.
  const holoWithOptions = lookFromSearch('?look=holo&ink=always&shadow=1&stage=comic');
  assert.equal(wantsInkPass(holoWithOptions, true), false);
  assert.equal(wantsInkPass(holoWithOptions, false), false);
  assert.equal(wantsShadows(holoWithOptions), false);
  assert.equal(wantsStage(holoWithOptions), false);
  assert.equal(wantsShadows(COMIC_LOOK), true);
  assert.equal(wantsStage(COMIC_LOOK), true);
  // D129: the ink rides BLOOM's composer — with bloom off there is no line,
  // unless `?ink=always` asks for a composer of its own (measurement only).
  assert.equal(wantsInkPass(COMIC_LOOK, true), true);
  assert.equal(wantsInkPass(COMIC_LOOK, false), false, 'bloom off still draws the ink — a composer for one effect (+2.4 ms p95, D129)');
  assert.equal(wantsInkPass(lookFromSearch('?ink=always'), false), true);
  assert.equal(wantsInkPass(lookFromSearch('?ink=always'), true), true);
  assert.equal(wantsInkPass(lookFromSearch('?ink=none'), true), false);
  assert.equal(wantsInkPass(lookFromSearch('?ink=none'), false), false);
});

test('look: the floor rung sheds the ink with bloom — one composer, dropped whole (D122)', () => {
  assert.deepEqual(postOnFloor(true, true), { bloom: false, ink: false });
  assert.deepEqual(postOnFloor(true, false), { bloom: false, ink: false });
  assert.deepEqual(postOnFloor(false, true), { bloom: false, ink: false }, 'bloom already off: the ink goes on its own');
  assert.equal(postOnFloor(false, false), null, 'nothing left to drop');
});

test('look: the comic numbers are shaped as the shader assumes', () => {
  const [litLo, litHi, umbraLo, umbraHi] = COMIC.bands;
  assert.ok(umbraLo < umbraHi && umbraHi < litLo && litLo < litHi, 'the bands are out of order');
  const [r, g, b] = COMIC.shadowTone;
  assert.ok(r < 1 && g < 1 && b < 1, 'the shadow tone is not darker');
  assert.ok(b > r && b > g, 'the shadow tone is not cooler');
  assert.ok(COMIC.paperWhite > 0 && COMIC.paperWhite <= 1);
  assert.ok(COMIC.dotDepth > 0 && COMIC.dotDepth < 1);
  assert.ok(COMIC.inkThreshold > 0 && COMIC.inkCssPx >= 1);
  assert.ok(Math.hypot(...COMIC.key) > 0.5 && COMIC.key[1] > 0 && COMIC.key[2] > 0, 'the key is not upper and toward the lens');
  // The dark lift (the verification pass): it starts below every mid paint and
  // lifts the black-is-blue paint's lit band well above its own value.
  const [liftLo, liftHi, liftTo] = COMIC.darkLift;
  const blackLum = 0.2126 * COMIC.black[0] + 0.7152 * COMIC.black[1] + 0.0722 * COMIC.black[2];
  assert.ok(liftLo < liftHi && liftHi <= 0.12, 'the lift reaches mid paints');
  assert.ok(liftTo > 2 * blackLum && liftTo < liftHi, `the lift's target ${String(liftTo)} does not lift black (${blackLum.toFixed(3)}) into a band`);
  assert.ok(COMIC.sickLook > 0 && COMIC.sickLook < 1, 'a summoning-sick figure is not half hologram');
});

// ---------------------------------------------------------------------------
// The hologram's jobs (D125) — over the whole corpus
// ---------------------------------------------------------------------------

test('look: an anonymous figure and a ghost are holograms under the comic look, a sick figure is half one, and nothing else is (D125, hard rule 8) — the corpus', () => {
  const comic = materialLookOf(COMIC_LOOK);
  let anonymous = 0;
  let ghosts = 0;
  let painted = 0;
  let models = 0;
  let sick = 0;
  for (const state of corpusStates()) {
    const poses = figurePose(layout(state), state.board?.combat ?? null, DATA, { models: MODELS });
    for (const pose of poses.values()) {
      const look = figureLookOf(pose, comic);
      if (pose.anonymous) {
        anonymous += 1;
        assert.equal(pose.modelId, null, 'an anonymous figure has a model — it would be painted as a body');
        assert.equal(look.look, 0, 'an anonymous figure is painted');
        assert.equal(paintsFigure(pose), false, 'an anonymous figure casts a contact shadow');
        continue;
      }
      if (pose.ghost) {
        ghosts += 1;
        assert.equal(look.look, 0, 'a ghosted creature spell is painted before it resolves');
        assert.equal(paintsFigure(pose), false);
        continue;
      }
      if (pose.modelId !== null) {
        models += 1;
        // D125 (the verification pass): summoning sickness is HALF hologram — a
        // pose of the stance, so the next snapshot that says otherwise paints it whole.
        if (pose.stance === 'sick') {
          sick += 1;
          assert.equal(look.look, COMIC.sickLook, 'a summoning-sick figure is not half hologram');
        } else {
          assert.equal(look.look, 1, 'a face-up modelled figure is not painted');
        }
        assert.equal(look.halftone, comic.halftone);
        assert.equal(paintsFigure(pose), true, 'a painted figure (sick or not) casts no contact shadow');
        painted += 1;
      }
      // The hologram table paints nothing at all.
      assert.equal(figureLookOf(pose, materialLookOf(HOLO_LOOK)).look, 0);
    }
  }
  console.log(
    `look: ${String(painted)} painted figure-instances (${String(sick)} of them summoning-sick, half hologram), ` +
      `${String(anonymous)} anonymous and ${String(ghosts)} ghosts kept as holograms`,
  );
  // The control: the corpus has sick figures, or this sweep could not tell.
  assert.ok(sick > 0 && sick < painted, `${String(sick)} sick figures of ${String(painted)}`);
  assert.ok(anonymous >= 1138, `only ${String(anonymous)} anonymous instances — the morph fixtures are not being read`);
  assert.ok(painted > 1000 && models === painted);
  // The negative control: a predicate that paints every modelled figure would
  // paint the ghosts — the sweep can tell.
  assert.ok(ghosts > 0, 'no ghost in the corpus — this sweep cannot tell a ghost from a figure');
});

// ---------------------------------------------------------------------------
// The stage (D124)
// ---------------------------------------------------------------------------

test('look: a seat shows its colours through PUBLIC, face-up cards only — a stub or a face-down card shows nothing', () => {
  assert.equal(shownIdentityOf([]), 'C');
  assert.equal(shownIdentityOf([{ manaCost: '{1}{W}' }, { manaCost: '{U}' }, { manaCost: null }]), 'WU');
  assert.equal(shownIdentityOf([{ manaCost: '{2}{B}{R}' }]), 'BR');
  // Hard rule 8: a redacted stub has no cost to read, and a face-down card's
  // colour is its identity, withheld.
  assert.equal(shownIdentityOf([{ hidden: true, manaCost: '{G}' }]), 'C');
  assert.equal(shownIdentityOf([{ faceDown: true, manaCost: '{R}' }]), 'C');
  // The control: the same card face up is read.
  assert.equal(shownIdentityOf([{ faceDown: false, manaCost: '{R}' }]), 'R');
  // Two seats, split by the viewer; only battlefield, graveyard and exile are read.
  const zone = (costs: Array<string | null>) => ({ cards: costs.map((manaCost) => ({ manaCost })) });
  const players = [
    { id: 0, zones: { battlefield: zone(['{W}']), graveyard: zone([]), exile: zone(['{U}']), hand: zone(['{B}']) } },
    { id: 1, zones: { battlefield: zone([]), graveyard: zone(['{R}']), exile: zone([]), hand: zone(['{G}']) } },
  ];
  assert.deepEqual(stageIdentitiesOf(players, 0), { you: 'WU', opp: 'R' });
  assert.deepEqual(stageIdentitiesOf(players, 1), { you: 'R', opp: 'WU' });
  assert.deepEqual(stageIdentitiesOf(undefined, null), { you: 'C', opp: 'C' });
});

test('look: every stage tone is a MID value, so ink and bands read on it — and two seats of one colour still split the table', () => {
  const ids = ['W', 'U', 'B', 'R', 'G', 'WU', 'UB', 'BR', 'RG', 'GW', 'WUBRG'];
  for (const id of ids) {
    for (const seat of [COMIC.seatYou, COMIC.seatOpp]) {
      const tone = stageToneOf(id, seat);
      const l = lightnessOf(tone);
      assert.ok(l >= 24 && l <= 40, `${id} on ${seat} is L* ${l.toFixed(1)} (${tone})`);
    }
    const { you, opp } = stageColoursOf(id, id);
    assert.notEqual(you, opp, `${id} against ${id} paints both halves alike`);
  }
  // Colourless is the seat's own default; the felt it replaced was L* 7–13.
  assert.equal(stageToneOf('C', COMIC.seatYou), COMIC.seatYou);
  assert.ok(lightnessOf('#10161c') < 10, 'the control: the Tier-1 felt is not dark');
  // A two-colour deck is not the gold every multicolour glow uses.
  assert.notEqual(stageToneOf('WU', COMIC.seatYou), stageToneOf('RG', COMIC.seatYou));
});

test('look: the combat stage is a pose of state.combat', () => {
  assert.equal(combatStageOf(null), false);
  assert.equal(combatStageOf(undefined), false);
  assert.equal(combatStageOf({ bands: [] }), false);
  assert.equal(combatStageOf({ bands: [{}] }), true);
  let combat = 0;
  for (const state of corpusStates()) if (combatStageOf(state.board?.combat)) combat += 1;
  assert.ok(combat > 0, 'no combat frame in the corpus');
});

test('look: D126 — a seat’s own figures face the opponent', () => {
  assert.equal(seatFacingY('you'), Math.PI);
  assert.equal(seatFacingY('opp'), 0);
});
