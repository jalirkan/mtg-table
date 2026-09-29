/*
 * mtg-table — web/test/traits.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Per-card identity, over the whole corpus** (Tier 2 slice 3 — T9 and T10).
 *
 * `traits.json` says what makes each card THAT card — size, hover, colour, props,
 * swarm, silhouette — and this file holds it to the rules the arena already lives
 * by: the data validates with zero errors (and the validator can fail), a
 * concealed card gets nothing (hard rule 8), every row fires in the corpus or says
 * why not, every prop a deck card names fits the body it stands in, the width
 * clamp stays strict for a turned giant and a swarm (D65), and the prop field's
 * cost is bounded by the number of KINDS on the table, never by the number of
 * figures. It prints the census — which card got which traits and props — every
 * run.
 *
 * `node --test`, no browser: `figures/` imports no three. The two geometry checks
 * at the end load three itself (as `tools/build-figures.mjs` does) to measure the
 * committed `figures.glb` and the procedural bee against the numbers the pose's
 * clamp assumes.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import * as THREE from 'three';

import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import traitsJson from '../src/arena/figures/traits.json' with { type: 'json' };
import { REST_CLIP_FOR, REST_PHASE_FOR } from '../src/arena/figures/clips.ts';
import { COSTUME_DEFAULTS, costumeOf, figurePose, fitHeight, shadeHex, type FigurePose } from '../src/arena/figures/pose.ts';
import {
  BODY_HAIR,
  CARRIER_LENGTH,
  COAT_PANEL,
  COSTUME_SLOTS,
  HAIR_KIND,
  PROP_KINDS,
  PROP_KIT,
  SQUAD_MEMBER,
  SQUAD_OFFSET_X,
  SQUAD_OFFSET_Z,
  SWARM_BEE_RATIO,
  anchorsOf,
  expressionOf,
  familyOf,
  fitsFamily,
  swarmMembers,
  swarmSpan,
  type PropAnchor,
  type PropKind,
} from '../src/arena/figures/props.ts';
import { figureFor } from '../src/arena/figures/resolve.ts';
import { DEFAULT_TRAIT, EMPTY_TRAIT_DATA, TRAITS, traitFor } from '../src/arena/figures/traits.ts';
import { baseModelOf } from '../src/arena/figures/rests.ts';
import { validateFigures, validateModels, validateTraits } from '../src/arena/figures/validate.ts';
import { FIGURE_FRONT_Z, FIGURE_HEIGHT, FIGURE_MAX_WIDTH, layout, seatFacingY } from '../src/arena/layout.ts';
import { isHidden, type AnyCard, type Frame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';
import { VIEW_BY_ID } from '../src/arena/camera.ts';
import { framingOf, frontPose } from '../src/workshop/framing.ts';
import { cardOf, workshopEntries } from '../src/workshop/catalog.ts';
import { MAX_BINDINGS, PROP_CAPACITY, PropField, buildKindGeometry } from '../src/arena/scene/props.ts';
import { mayStand, standeeSheets } from '../src/arena/standee.ts';
import { COSTUME_ATTRIBUTE } from '../src/arena/scene/figureMaterial.ts';
import {
  bodyLayers,
  cameraAt,
  comicVisibility,
  figureLayers,
  geometryLayers,
  headFromOf,
  kindGroups,
  loadLibrary,
  onBattlefield,
  posesOf,
  PRESENCE,
  rigOf,
  twoSeatState,
  visibility,
  type Layer,
} from './prop-raster.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const MODELS = validateModels(modelsJson).data;
const MODEL_IDS = new Set(Object.keys(MODELS.models));
const DATA = validateFigures(figuresJson, { modelIds: MODEL_IDS }).data;
const TRAIT_RESULT = validateTraits(traitsJson);

function fixtureStates(): Array<{ file: string; index: number; state: ClientState }> {
  const out: Array<{ file: string; index: number; state: ClientState }> = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (!name.endsWith('.jsonl')) continue;
      const log = parseFrameLog(readFileSync(FIXTURES + dir + name, 'utf8'));
      let state = initialState(log.header);
      const frames = log.frames as Frame[];
      for (let i = 0; i < frames.length; i++) {
        state = reduce(state, frames[i]!);
        if (frames[i]!.type === 'state') out.push({ file: dir + name, index: i + 1, state });
      }
    }
  }
  return out;
}

const FRAMES = fixtureStates();

// ---------------------------------------------------------------------------
// The data file, and the validator that guards it
// ---------------------------------------------------------------------------

test('traits: the committed traits.json validates with zero errors, and is what the arena reads', () => {
  assert.deepEqual(TRAIT_RESULT.errors, [], 'traits.json has errors');
  // `TRAITS` is the module's own validated copy — the one `figurePose` defaults to.
  assert.deepEqual(TRAITS, TRAIT_RESULT.data);
  assert.ok(Object.keys(TRAITS.cards).length >= 12, 'the identity table lost its card rows');
});

test('traits: the validator drops a bad row, never the file — and it can fail', () => {
  const bad = validateTraits({
    version: 1,
    archetypes: {
      'subtype:goblin': { hover: 0.1 }, // a word SUBTYPE_ORDER never produces
      'subtype:robot': { props: ['laserEye'] },
    },
    cards: {
      'A': { props: ['jetpack', 'lightsaber'] }, // not a kit kind
      'B': { scale: 9 }, // out of range
      'C': { swarm: 2.5 }, // not a whole number
      'D': { turn: 90 }, // turned with no measured footprint
      'E': { tint: 'gold' }, // not a hex colour
      'F': { idle: 'dance' },
      'G': { props: ['wings', 'wings'] }, // listed twice
      'H': { cape: true }, // unknown field
      'I': { silhouette: 'submarine' },
      'J': { costume: { cape: '#ffffff' } }, // slice 4: not a costume slot
      'K': { costume: { top: 'navy' } }, // not a hex colour or "tint"
      'L': { body: 'giant' }, // not a body style
      'M': { costume: '#ffffff' }, // not an object of slots
      'Wasp, Shrinking Savior': { scale: 0.55, props: ['wings'], costume: { top: 'tint', legs: '#16151b' } }, // survives
    },
  });
  const where = bad.errors.map((e) => e.where);
  for (const expected of [
    '$.archetypes["subtype:goblin"]',
    '$.cards["A"].props[1]',
    '$.cards["B"].scale',
    '$.cards["C"].swarm',
    '$.cards["D"].turnedRatio',
    '$.cards["E"].tint',
    '$.cards["F"].idle',
    '$.cards["G"].props[1]',
    '$.cards["H"].cape',
    '$.cards["I"].silhouette',
    '$.cards["J"].costume.cape',
    '$.cards["K"].costume.top',
    '$.cards["L"].body',
    '$.cards["M"].costume',
  ]) {
    assert.ok(where.includes(expected), `the validator missed ${expected} (saw ${where.join(', ')})`);
  }
  // Dropped rows are gone; the good ones stay. (An unknown field is an error the
  // test suite fails on, but — exactly as figures.json's validator does — it does
  // not drop a row whose known fields are sound.)
  assert.deepEqual(Object.keys(bad.data.cards), ['H', 'Wasp, Shrinking Savior']);
  assert.deepEqual(Object.keys(bad.data.archetypes), ['subtype:robot']);
  assert.deepEqual(validateTraits(null).data, { version: 1, cards: {}, archetypes: {}, default: {} });
});

test('traits: the ladder — subtypes least specific first, the card last, props replaced', () => {
  const data = validateTraits({
    version: 1,
    archetypes: {
      'subtype:villain': { shade: 0.5, hover: 0.05 },
      'subtype:robot': { hover: 0.2, props: ['laserEye'] },
    },
    cards: { 'Special Bot': { props: [], tint: '#112233' } },
  }).data;
  const bot = { id: 1, name: 'Some Bot', types: 'Artifact Creature - Robot Villain' } as unknown as AnyCard;
  const match = traitFor(bot, data);
  // `robot` is more specific than `villain` in SUBTYPE_ORDER, so its hover wins.
  assert.equal(match.spec.hover, 0.2);
  assert.equal(match.spec.shade, 0.5);
  assert.deepEqual(match.spec.props, ['laserEye']);
  assert.deepEqual(match.rungs, ['subtype:villain', 'subtype:robot']);
  const special = traitFor({ ...bot, name: 'Special Bot' } as AnyCard, data);
  assert.deepEqual(special.spec.props, [], 'a card row replaces the archetype props');
  assert.equal(special.spec.tint, '#112233');
  assert.deepEqual(special.rungs, ['subtype:villain', 'subtype:robot', 'card']);
  assert.equal(shadeHex('#808080', 0.5), '#404040');
  assert.equal(shadeHex('#ffffff', 1), '#ffffff');
});

// ---------------------------------------------------------------------------
// Hard rule 8 — a concealed card gets no identity
// ---------------------------------------------------------------------------

test('traits: a redacted card gets the default — its name is never read', () => {
  const redacted = { id: 7, zone: 'battlefield', controller: 0, owner: 0, hidden: true } as unknown as AnyCard;
  const match = traitFor(redacted, TRAITS);
  assert.equal(match.spec, DEFAULT_TRAIT);
  assert.deepEqual(match.rungs, []);
});

test('traits: a face-down Wasp is the anonymous disc — no wings, no hover, no tint', () => {
  // A face-down card keeps its name on the wire only where this seat may see it;
  // the layout draws it as a back either way, and the pose must not ask traits.json.
  const faceDown = {
    id: 5,
    name: 'Wasp, Shrinking Savior',
    types: 'Creature',
    manaCost: null,
    power: '2',
    toughness: '2',
    faceDown: true,
    tapped: false,
    sick: false,
    attacking: false,
    blocking: false,
    controller: 0,
    owner: 0,
    zone: 'battlefield',
    attachedToId: null,
    attachmentIds: [],
    counters: {},
    abilities: [],
  } as unknown as AnyCard;
  const base = FRAMES.find((f) => (f.state.board?.players.length ?? 0) === 2)!.state;
  const state = {
    ...base,
    board: {
      ...base.board!,
      stack: [],
      stackCards: [],
      combat: null,
      players: base.board!.players.map((p, i) => ({
        ...p,
        zones: { ...p.zones, battlefield: { count: i === 0 ? 1 : 0, cards: i === 0 ? [{ ...faceDown, controller: p.id, owner: p.id }] : [] } },
      })),
    },
  } as ClientState;
  const pose = figurePose(layout(state), null, DATA, { models: MODELS }).get(5);
  assert.ok(pose !== undefined, 'a face-down creature is still a figure');
  assert.equal(pose.anonymous, true);
  assert.equal(pose.modelId, null);
  assert.deepEqual(pose.props, []);
  assert.equal(pose.lift, 0);
  assert.equal(pose.swarm, 0);
  assert.equal(pose.silhouette, null);
  assert.deepEqual(pose.traitRungs, []);
  assert.equal(pose.costume, null, 'a face-down Wasp wears her gold and black');
  assert.ok(Math.abs(pose.height - FIGURE_HEIGHT) < 1e-9, 'a face-down creature took a trait scale');
});

test('traits: every name the three AI decks dress, turned FACE DOWN, is the anonymous disc — and a stub stands nothing (hard rule 8; D232, the fix pass)', () => {
  // The corpus sweeps are vacuous for these decks: their three recordings carry no
  // face-down and no redacted battlefield card (figures.test.ts's anonymous count,
  // 1,179, did not move with them). So each dressed name is turned face down here
  // — keeping its name, the hostile case, and with Forge's own empty face-down
  // name — and each must lose everything its row gives it, while the same card
  // face up is dressed (the control that the row is really there to lose).
  const cards = corpusCards();
  let checked = 0;
  for (const name of D231_NAMES) {
    const card = cards.get(name) ?? factCard(name);
    const up = posesOf(twoSeatState([], [onBattlefield(card, 500, 1)])).get(500);
    assert.ok(up !== undefined && !up.anonymous, `${name} face up stands no dressed figure`);
    assert.ok(up.traitRungs.includes('card'), `${name} face up does not read its own row — the control is empty`);
    for (const [how, extra] of [
      ['keeping its name', { faceDown: true }],
      ["with Forge's face-down face", { faceDown: true, name: '', types: 'Creature', manaCost: null, power: '2', toughness: '2' }],
    ] as const) {
      const pose = posesOf(twoSeatState([], [onBattlefield(card, 500, 1, extra)])).get(500);
      assert.ok(pose !== undefined, `${name} face down (${how}) is not a figure`);
      assert.equal(pose.anonymous, true, `${name} face down (${how}) is not anonymous`);
      assert.equal(pose.modelId, null, `${name} face down (${how}) stands a body`);
      assert.deepEqual(pose.props, [], `${name} face down (${how}) carries props`);
      assert.equal(pose.costume, null, `${name} face down (${how}) wears a costume`);
      assert.equal(pose.hair, null, `${name} face down (${how}) has hair`);
      assert.deepEqual(pose.traitRungs, [], `${name} face down (${how}) read a trait rung`);
      assert.equal(pose.swarm, 0, `${name} face down (${how}) is a swarm`);
      assert.equal(pose.lift, 0, `${name} face down (${how}) hovers`);
    }
    const stub = { id: 500, zone: 'battlefield', owner: 1, controller: 1, hidden: true } as unknown as AnyCard;
    const stubState = twoSeatState([], [stub]);
    assert.equal(posesOf(stubState).get(500), undefined, `a five-key stub stood a figure where ${name} was`);
    checked += 1;
  }
  assert.ok(checked >= 45, `only ${String(checked)} dressed names checked`);
  console.log(`traits: ${String(checked)} names the three AI decks dress, each face down twice and as a stub — every one anonymous or absent`);
});

// ---------------------------------------------------------------------------
// Slice 4 — the costume and the body
// ---------------------------------------------------------------------------

test('traits: a costume merges slot by slot down the ladder, and costumeOf fills the rest from the top', () => {
  const data = validateTraits({
    version: 1,
    archetypes: { 'subtype:spy': { costume: { top: '#28344a', shirt: '#eef0f3', legs: '#222c3f' } } },
    cards: { 'Agent X': { costume: { hair: '#e0c16a', top: 'tint' } } },
  }).data;
  const card = { id: 1, name: 'Agent X', types: 'Creature - Human Spy' } as unknown as AnyCard;
  const spec = traitFor(card, data).spec;
  // The card named its hair and its top; the spy rung's shirt and legs survive.
  assert.deepEqual(spec.costume, { top: 'tint', shirt: '#eef0f3', legs: '#222c3f', hair: '#e0c16a' });
  const palette = costumeOf(spec.costume, '#5b52c4');
  assert.equal(palette.length, COSTUME_SLOTS.length);
  const at = (slot: (typeof COSTUME_SLOTS)[number]): string => palette[COSTUME_SLOTS.indexOf(slot)]!;
  assert.equal(at('top'), '#5b52c4', '"tint" is the figure\'s own tint');
  assert.equal(at('shirt'), '#eef0f3');
  assert.equal(at('hair'), '#e0c16a');
  assert.equal(at('skin'), COSTUME_DEFAULTS.skin);
  assert.equal(at('gloves'), COSTUME_DEFAULTS.skin, 'unnamed gloves are bare hands');
  assert.equal(at('belt'), shadeHex('#222c3f', 0.6), 'an unnamed belt is the legs, darker');
  // No costume at all: a bodysuit in the tint, darker at the legs.
  const bare = costumeOf({}, '#808080');
  assert.equal(bare[COSTUME_SLOTS.indexOf('top')], '#808080');
  assert.equal(bare[COSTUME_SLOTS.indexOf('legs')], shadeHex('#808080', 0.55));
});

test('traits: `body: chibi` stands a card in slices 1–3\'s Kenney body, and nothing is lost', () => {
  const chibiEverywhere = validateTraits({ version: 1, default: { body: 'chibi' } }).data;
  const soldier = corpusCards().get('Soldier Token')!;
  const state = twoSeatState([onBattlefield(soldier, 500, 0)], []);
  const placed = layout(state);
  const human = figurePose(placed, null, DATA, { models: MODELS }).get(500)!;
  const chibi = figurePose(placed, null, DATA, { models: MODELS, traits: chibiEverywhere }).get(500)!;
  // Lane BODIES: the proportioned body stands in its resting-pose variant; the chibi has none.
  assert.equal(baseModelOf(human.modelId), 'agent');
  assert.equal(human.modelId, 'agent@atEase', 'the Soldier Token rests at ease (the soldier rung)');
  assert.equal(chibi.modelId, 'agent-chibi');
  assert.equal(chibi.rest, null, 'a chibi has no resting poses');
  assert.equal(familyOf(chibi.modelId, MODELS), 'humanoid');
  // The chibi is 1.15 wide for 1 tall: the strict clamp (D65) sizes it exactly as slice 3 did.
  assert.ok(Math.abs(chibi.height - fitHeight(FIGURE_HEIGHT, MODELS.models['agent-chibi']!.width / MODELS.models['agent-chibi']!.height)) < 1e-9);
  assert.ok(chibi.costume !== null, 'a chibi carries costume slots too');
  // Every fallback is the fallback OF a proportioned body.
  for (const id of ['agent', 'hero', 'scientist']) {
    assert.equal(MODELS.models[`${id}-chibi`]?.rig, 'kenney-mini', `${id} has no chibi fallback`);
    assert.equal(MODELS.models[id]?.rig, 'ubc', `${id} is not a proportioned body`);
  }
});

test('traits: every body that carries costume slots carries all of them, in COSTUME_SLOTS order (the build and the shader agree)', async () => {
  const library = await loadLibrary();
  const counts: string[] = [];
  for (const [id, model] of library) {
    let mesh: THREE.SkinnedMesh | null = null;
    model.source.traverse((child) => {
      if (mesh === null && (child as THREE.SkinnedMesh).isSkinnedMesh === true) mesh = child as THREE.SkinnedMesh;
    });
    assert.ok(mesh !== null, `${id} has no skinned mesh`);
    const slots = (mesh as THREE.SkinnedMesh).geometry.getAttribute(COSTUME_ATTRIBUTE);
    const family = familyOf(id, MODELS);
    if (family !== 'human' && family !== 'humanoid') {
      assert.equal(slots, undefined, `${id} carries costume slots it can never wear`);
      continue;
    }
    assert.ok(slots !== undefined, `${id} carries no costume slots`);
    const seen = new Array<number>(COSTUME_SLOTS.length).fill(0);
    for (let i = 0; i < slots.count; i++) {
      const slot = Math.round(slots.getX(i));
      assert.ok(slot >= 0 && slot < COSTUME_SLOTS.length, `${id}: vertex ${String(i)} is in slot ${String(slot)}`);
      seen[slot]! += 1;
    }
    counts.push(`  ${id.padEnd(16)} ${COSTUME_SLOTS.map((slot, i) => `${slot} ${String(seen[i])}`).join(' · ')}`);
    // A proportioned body wears every slot; the chibi (its texture is gone and its
    // head is half of it) has no waistband to find.
    for (const [i, slot] of COSTUME_SLOTS.entries()) {
      if (family === 'humanoid' && slot === 'belt') continue;
      assert.ok(seen[i]! > 0, `${id} has no ${slot}`);
    }
  }
  console.log(`traits: costume slots per body (vertices)\n${counts.join('\n')}`);
});

test('traits: every deck humanoid wears its own costume — the task list read off the poses', () => {
  const cards = corpusCards();
  const poseOf = (name: string): FigurePose => {
    const card = cards.get(name);
    assert.ok(card !== undefined, `${name} is not in the corpus`);
    return posesOf(twoSeatState([onBattlefield(card, 500, 0)], [])).get(500)!;
  };
  const slot = (pose: FigurePose, key: (typeof COSTUME_SLOTS)[number]): string => {
    assert.ok(pose.costume !== null, 'no costume');
    return pose.costume[COSTUME_SLOTS.indexOf(key)]!;
  };
  const hue = (hex: string): { r: number; g: number; b: number; l: number } => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b, l: (r + g + b) / 3 };
  };
  const lines: string[] = [];
  const bodies = new Map<string, string | null>();
  for (const name of deckNames()) {
    const card = cards.get(name);
    if (card === undefined) continue;
    const pose = posesOf(twoSeatState([onBattlefield(card, 500, 0)], [])).get(500);
    if (pose === undefined) continue;
    bodies.set(name, baseModelOf(pose.modelId));
    lines.push(`  ${name.padEnd(30)} ${String(pose.modelId).padEnd(9)} ${pose.costume === null ? '(no costume)' : COSTUME_SLOTS.map((k, i) => `${k} ${pose.costume![i]}`).join(' ')}`);
  }
  console.log(`traits: every deck card's body and costume\n${lines.join('\n')}`);
  // The women stand in the woman's body and the men in the man's.
  for (const name of ['Peggy Carter, Secret Agent', 'Agent 13, Sharon Carter', 'Quake, Agent of S.H.I.E.L.D.', 'Wasp, Shrinking Savior']) {
    assert.equal(bodies.get(name), 'hero', `${name} is not in the woman's body`);
  }
  for (const name of ['Agent Phil Coulson', 'Nick Fury, Spymaster', 'Ant-Man, Reformed Rogue', 'Agents of S.H.I.E.L.D.']) {
    assert.equal(bodies.get(name), 'agent', `${name} is not in the man's body`);
  }
  // Peggy: a blue jacket over a white shirt (and her red hat is a prop).
  const peggy = poseOf('Peggy Carter, Secret Agent');
  assert.ok(hue(slot(peggy, 'top')).b > hue(slot(peggy, 'top')).r + 60, 'Peggy\'s jacket is not blue');
  assert.ok(hue(slot(peggy, 'shirt')).l > 220, 'Peggy\'s shirt is not white');
  assert.ok(peggy.props.some((p) => p.kind === 'hat' && hue(p.colour).r > 180 && hue(p.colour).g < 90), 'Peggy\'s hat is not red');
  // Coulson: a navy suit and a white shirt.
  const coulson = poseOf('Agent Phil Coulson');
  assert.ok(hue(slot(coulson, 'top')).l < 70 && hue(slot(coulson, 'top')).b > hue(slot(coulson, 'top')).r, 'Coulson\'s suit is not navy');
  assert.ok(hue(slot(coulson, 'shirt')).l > 220, 'Coulson\'s shirt is not white');
  // Fury: black, under a black coat.
  const fury = poseOf('Nick Fury, Spymaster');
  assert.ok(hue(slot(fury, 'top')).l < 35 && hue(slot(fury, 'legs')).l < 35, 'Fury is not in black');
  // Quake: black with teal accents.
  const quake = poseOf('Quake, Agent of S.H.I.E.L.D.');
  assert.ok(hue(slot(quake, 'top')).l < 35, 'Quake\'s suit is not black');
  assert.ok(hue(slot(quake, 'belt')).g > 150 && hue(slot(quake, 'belt')).b > 150 && hue(slot(quake, 'belt')).r < 120, 'Quake has no teal accent');
  // Agent 13: indigo.
  const a13 = poseOf('Agent 13, Sharon Carter');
  assert.ok(hue(slot(a13, 'top')).b > hue(slot(a13, 'top')).g + 60, 'Agent 13 is not in indigo');
  // The Agents: grey suits, white shirts.
  const agents = poseOf('Agents of S.H.I.E.L.D.');
  const grey = hue(slot(agents, 'top'));
  assert.ok(Math.max(grey.r, grey.g, grey.b) - Math.min(grey.r, grey.g, grey.b) < 30, 'the Agents\' suits are not grey');
  // The scientists: white coats; A.I.M.: yellow.
  assert.ok(hue(slot(poseOf('Bold Biochemist'), 'top')).l > 220, 'Bold Biochemist is not in a white coat');
  const aim = hue(slot(poseOf('A.I.M. Scientists'), 'top'));
  assert.ok(aim.r > 200 && aim.g > 160 && aim.b < 90, 'A.I.M. are not in yellow');
  // Wasp: gold and black; Ant-Man: red and silver.
  const wasp = poseOf('Wasp, Shrinking Savior');
  assert.ok(hue(slot(wasp, 'top')).r > 200 && hue(slot(wasp, 'top')).b < 90 && hue(slot(wasp, 'legs')).l < 35, 'Wasp is not gold and black');
  const ant = poseOf('Ant-Man, Reformed Rogue');
  assert.ok(hue(slot(ant, 'top')).r > 150 && hue(slot(ant, 'top')).g < 80, 'Ant-Man is not in red');
  assert.ok(hue(slot(ant, 'belt')).l > 180, 'Ant-Man has no silver');
  // The drone and the bee wear nothing: they carry no slots.
  assert.equal(poseOf('Aerial Doombot').costume, null);
  assert.equal(poseOf('Giant-Sized Flying Ant').costume, null);
  // Lane BODIES (D156, D157): the task's list of attitudes and hairstyles, read
  // back off the poses — each is really what the figure rests in and wears.
  const want: Array<[string, string, string | null]> = [
    // Bald, as his card draws him (the fix pass: the dark `crop` read as a skullcap).
    ['Nick Fury, Spymaster', 'folded', null],
    ['Peggy Carter, Secret Agent', 'ready', 'waves'],
    ['Agent Phil Coulson', 'clasped', 'parted'],
    ['Quake, Agent of S.H.I.E.L.D.', 'braced', 'bob'],
    ['Agent 13, Sharon Carter', 'highReady', 'bun'],
    ['Bold Biochemist', 'working', 'parted'],
    ['A.I.M. Scientists', 'working', null],
    ['Ant-Man, Reformed Rogue', 'akimbo', 'parted'],
    ['Wasp, Shrinking Savior', 'akimbo', 'bob'],
    ['Agents of S.H.I.E.L.D.', 'atEase', 'parted'],
  ];
  const attitudes: string[] = [];
  for (const [name, rest, hair] of want) {
    const pose = poseOf(name);
    attitudes.push(`  ${name.padEnd(30)} rests ${String(pose.rest).padEnd(8)} hair ${String(pose.hair).padEnd(7)} → ${String(pose.modelId)}`);
    assert.equal(pose.rest, rest, `${name} does not rest ${rest}`);
    assert.equal(pose.hair, hair, `${name}'s hair is not ${String(hair)}`);
    // Fury's is the patched face (D158): his left eye is under the eyepatch.
    const faceKind = name === 'Nick Fury, Spymaster' ? 'facePatched' : 'face';
    assert.equal(pose.props.some((p) => p.kind === faceKind), name !== 'A.I.M. Scientists', `${name}: the ${faceKind}`);
  }
  console.log(`traits: every deck person's resting pose and hair\n${attitudes.join('\n')}`);
  // The coats stop at the hip and hang their skirts on the legs (D159).
  for (const name of ['Nick Fury, Spymaster', 'Bold Biochemist']) {
    const kinds = poseOf(name).props.map((p) => p.kind);
    assert.ok(kinds.includes('coat') && kinds.includes('coatTails'), `${name}: the coat and its skirt`);
  }
});

test('traits: every Doom Legion person wears its own costume and rest — the villain task list read off the poses (D221)', () => {
  const cards = corpusCards();
  const poseOf = (name: string): FigurePose => {
    const card = cards.get(name) ?? factCard(name);
    return posesOf(twoSeatState([], [onBattlefield(card, 500, 1)])).get(500)!;
  };
  const slot = (pose: FigurePose, key: (typeof COSTUME_SLOTS)[number]): { r: number; g: number; b: number; l: number } => {
    assert.ok(pose.costume !== null, 'no costume');
    const hex = pose.costume[COSTUME_SLOTS.indexOf(key)]!;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b, l: (r + g + b) / 3 };
  };
  // [name, body, rest, hair, a face?]
  const want: Array<[string, string, string, string | null, boolean]> = [
    ['Doctor Doom', 'scientist', 'akimbo', 'cowl', false],
    ['Loki, God of Mischief', 'agent', 'braced', 'long', true],
    ['Baron Strucker, HYDRA Overlord', 'agent', 'atEase', null, true],
    ['HYDRA Troopers', 'agent', 'highReady', 'cowl', true],
    ['Agents of HYDRA', 'agent', 'atEase', 'cowl', true],
    ['Kang the Conqueror', 'agent', 'aim', 'cowl', false],
    ['Kang, Temporal Tyrant', 'agent', 'folded', 'cowl', false],
    ['Pharaoh Rama-Tut', 'agent', 'folded', 'long', true],
    ['Unliving Legionnaire', 'agent', 'folded', 'cowl', false],
    ['Madame Hydra, Reanimated', 'hero', 'akimbo', 'long', true],
    ['Crossbones, Malicious Mercenary', 'agent', 'braced', 'cowl', false],
    ['Villain Token', 'agent', 'atEase', 'cowl', true],
  ];
  const lines: string[] = [];
  for (const [name, body, rest, hair, face] of want) {
    const pose = poseOf(name);
    lines.push(`  ${name.padEnd(32)} ${String(pose.modelId).padEnd(18)} hair ${String(pose.hair).padEnd(5)} ${pose.costume === null ? '' : COSTUME_SLOTS.map((k, i) => `${k} ${pose.costume![i]}`).join(' ')}`);
    assert.equal(baseModelOf(pose.modelId), body, `${name} is not in the ${body} body`);
    assert.equal(pose.rest, rest, `${name} does not rest ${rest}`);
    assert.equal(pose.hair, hair, `${name}'s head is not ${String(hair)}`);
    assert.equal(pose.props.some((p) => p.kind === 'face' || p.kind === 'faceGrit'), face, `${name}: a face ${face ? 'missing' : 'under a mask'}`);
  }
  console.log(`traits: the Doom Legion's people — body, head and costume (D221)\n${lines.join('\n')}`);
  // Doom: iron armour under a green tunic and hood, a gold belt; the mask in his iron tint.
  const doom = poseOf('Doctor Doom');
  assert.ok(slot(doom, 'shirt').g > slot(doom, 'shirt').r + 60 && slot(doom, 'hair').g > slot(doom, 'hair').r + 40, 'Doom\'s tunic and hood are not green');
  const iron = slot(doom, 'top');
  assert.ok(Math.max(iron.r, iron.g, iron.b) - Math.min(iron.r, iron.g, iron.b) < 20 && iron.l > 60 && iron.l < 140, 'Doom\'s armour is not iron');
  assert.ok(slot(doom, 'belt').r > 170 && slot(doom, 'belt').b < 110, 'Doom has no gold belt');
  // HYDRA: green, with a yellow chest (the agents) or yellow gloves (the troopers).
  const hydra = poseOf('Agents of HYDRA');
  assert.ok(slot(hydra, 'top').g > slot(hydra, 'top').r && slot(hydra, 'shirt').r > 180 && slot(hydra, 'shirt').b < 80, 'the HYDRA agents are not green and yellow');
  assert.ok(slot(poseOf('HYDRA Troopers'), 'gloves').r > 180, 'the troopers have no yellow gloves');
  // Madame Hydra's green hair; Loki in green and gold; Rama-Tut in gold.
  assert.ok(slot(poseOf('Madame Hydra, Reanimated'), 'hair').g > 150, 'Madame Hydra\'s hair is not green');
  const loki = poseOf('Loki, God of Mischief');
  assert.ok(slot(loki, 'top').g > slot(loki, 'top').r + 40 && slot(loki, 'shirt').r > 180, 'Loki is not green and gold');
  assert.ok(slot(poseOf('Pharaoh Rama-Tut'), 'top').r > 180 && slot(poseOf('Pharaoh Rama-Tut'), 'top').b < 100, 'Rama-Tut is not in gold');
  // Crossbones in warm charcoal, not black: the comic look lifts a paint under its
  // black threshold to navy (Lane LOOK), and a navy Crossbones read as S.H.I.E.L.D.
  // (the villain fix pass). Dark, and no bluer than it is red.
  const cross = slot(poseOf('Crossbones, Malicious Mercenary'), 'top');
  assert.ok(cross.l < 90 && cross.r >= cross.b, 'Crossbones is not in dark, warm charcoal');
  // The fix pass moved rows off the green half the Doom Legion wears, where the
  // card allows it, so its table is not one colour from Pacho's side: Madame
  // Hydra's suit is charcoal, as her card paints it (her hair stays green), and the
  // Legionnaire is violet. Doom, HYDRA, Loki and Strucker wear green on their cards.
  const greyish = (c: { r: number; g: number; b: number }): boolean => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) < 20;
  const hex = (h: string) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
  assert.ok(greyish(slot(poseOf('Madame Hydra, Reanimated'), 'top')), 'Madame Hydra\'s suit is not charcoal');
  const vampire = slot(poseOf('Unliving Legionnaire'), 'top');
  assert.ok(vampire.b > vampire.g + 20 && vampire.r > vampire.g && vampire.l > 45, 'the Legionnaire is not violet above the black threshold');
  // The masks take each wearer's TINT: Doom's iron, Kang's blue, Crossbones' bone
  // white, the Legionnaire's corpse-pale lavender.
  const mask = (name: string): string => poseOf(name).props.find((p) => p.kind === 'mask')!.colour;
  assert.ok(hex(mask('Kang the Conqueror')).b > hex(mask('Kang the Conqueror')).r + 80, 'Kang\'s mask is not blue');
  assert.ok(hex(mask('Crossbones, Malicious Mercenary')).r > 200, 'Crossbones\' skull is not bone white');
  const ghoul = hex(mask('Unliving Legionnaire'));
  assert.ok(ghoul.r > 180 && ghoul.b > ghoul.g, 'the Legionnaire\'s face is not a pale lavender');
  // The drones wear nothing: they carry no slots.
  for (const name of ['Doombot', "Doom's Servo-Guards", 'A.I.M. Bot']) assert.equal(poseOf(name).costume, null, `${name} wears a costume`);
});

/**
 * **Whose SKIN a row may set** (more villain identity, D231). A costume is identity
 * data and a complexion is not (slice 4): every person wears
 * `COSTUME_DEFAULTS.skin`, the one tone, unless its skin IS its costume — a gamma
 * body, a lava body, a radioactive glow, a shark's hide, a cat-knight's fur. This
 * is that list, whole: a row that paints a skin and is not on it fails the test
 * below, and so does a name on it that stops painting one.
 */
const TRANSFORMED_SKIN: Readonly<Record<string, string>> = {
  'Volcanic Villain': 'an Elemental: a body of lava',
  'Tiger Shark, Abyssal Hunter': "a mutant shark's grey hide",
  'Radioactive Man': 'a radioactive glow',
  'Brawn, Amadeus Cho': 'gamma green',
  'Knight of Wundagore': "a cat-knight's orange fur",
  'Gamma Grotesque': 'gamma green',
  'She-Hulk, Attorney-at-Law': 'gamma green',
  'She-Hulk, Jade Defender': 'gamma green',
  'Hulkling, Burgeoning Bruiser': "a Kree-Skrull's green",
  'Hulk, Brutal Brawler': 'gamma green',
  'Hulk, Strongest There Is': 'gamma green',
  'Hulk, Gamma Goliath': 'gamma green',
  'Red Hulk': 'gamma red',
  'Abomination, Irradiated Brute': 'gamma grey-olive, scaled',
  'Abomination, Terrifying Titan': 'gamma green, scaled',
};

test('traits: every Masters of Evil, Hulk family and Wakanda person wears its own costume and rest — and only a transformed body paints its skin (D231)', () => {
  const cards = corpusCards();
  const poseOf = (name: string): FigurePose => {
    const card = cards.get(name) ?? factCard(name);
    return posesOf(twoSeatState([], [onBattlefield(card, 500, 1)])).get(500)!;
  };
  const rgb = (hex: string): { r: number; g: number; b: number; l: number; spread: number } => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b, l: (r + g + b) / 3, spread: Math.max(r, g, b) - Math.min(r, g, b) };
  };
  const slot = (pose: FigurePose, key: (typeof COSTUME_SLOTS)[number]): ReturnType<typeof rgb> => {
    assert.ok(pose.costume !== null, 'no costume');
    return rgb(pose.costume[COSTUME_SLOTS.indexOf(key)]!);
  };
  // [name, body, rest, hair (null = bald), a face?]
  const want: Array<[string, string, string, string | null, boolean]> = [
    ['Whiplash, Vengeful Engineer', 'agent', 'ready', 'cowl', true],
    ['Songbird, Sonic Screamer', 'hero', 'braced', 'long', true],
    ['MACH-1, Swooping Scoundrel', 'agent', 'ready', 'cowl', false],
    ['Yellowjacket, Heartless Marauder', 'hero', 'akimbo', null, true],
    ['Boomerang, Blade Flinger', 'agent', 'highReady', 'cowl', false],
    ['Fixer, Techno Terror', 'agent', 'working', 'parted', true],
    ['White Widow, Yelena Belova', 'hero', 'ready', 'bob', true],
    ['Common Crook', 'agent', 'atEase', 'long', true],
    ['Whirlwind, Killer Cyclone', 'agent', 'braced', 'cowl', false],
    ['Volcanic Villain', 'agent', 'braced', 'long', true],
    ['Klaw, Sonic Subjugator', 'agent', 'braced', 'parted', true],
    ['Titania, Proud Pummeler', 'hero', 'braced', 'long', true],
    ['Moonstone, Harsh Mistress', 'hero', 'braced', 'long', true],
    ['Tiger Shark, Abyssal Hunter', 'agent', 'braced', 'cowl', true],
    ['Atlas, Sizable Stooge', 'agent', 'akimbo', 'parted', true],
    ['Radioactive Man', 'scientist', 'braced', null, true],
    ['The Masters of Evil', 'agent', 'akimbo', 'cowl', false],
    ['Rick Jones, Destined Sidekick', 'agent', 'atEase', 'crop', true],
    ['Brawn, Amadeus Cho', 'scientist', 'braced', 'crop', true],
    ['Hellcat, Undying Vigilante', 'hero', 'ready', 'long', true],
    ['Knight of Wundagore', 'agent', 'ready', 'long', false],
    ['Gallant Citizen', 'agent', 'atEase', 'parted', true],
    ['Gamma Grotesque', 'agent', 'working', null, true],
    ['She-Hulk, Attorney-at-Law', 'hero', 'akimbo', 'long', true],
    ['She-Hulk, Jade Defender', 'hero', 'braced', 'long', true],
    ['Hercules, Prince of Power', 'agent', 'akimbo', 'crop', true],
    ['Hulkling, Burgeoning Bruiser', 'agent', 'highReady', 'crop', true],
    ['Hulk, Brutal Brawler', 'agent', 'braced', 'parted', true],
    ['Hulk, Strongest There Is', 'agent', 'akimbo', 'crop', true],
    ['Hulk, Gamma Goliath', 'agent', 'ready', 'long', true],
    ['Red Hulk', 'agent', 'akimbo', 'crop', true],
    ['Abomination, Irradiated Brute', 'agent', 'braced', null, true],
    ['Abomination, Terrifying Titan', 'agent', 'akimbo', null, true],
    ['Wolverine, Fierce Fighter', 'agent', 'braced', 'cowl', true],
    ['Shuri, the Black Panther', 'hero', 'ready', 'cowl', false],
    ["T'Chaka, Venerable King", 'agent', 'clasped', 'crop', true],
    ['Dora Milaje Elite', 'hero', 'ready', null, true],
    ['Wakandan Shield Guard', 'agent', 'ready', 'crop', true],
    ["T'Challa, the Black Panther", 'agent', 'braced', 'cowl', false],
    ['Black Panther, Claws of Bast', 'agent', 'ready', 'cowl', false],
    ['Black Panther, Most Dangerous', 'agent', 'akimbo', 'cowl', false],
    ['Black Panther, Vanguard', 'agent', 'folded', 'cowl', false],
    ['Nakia, Wakandan Operative', 'hero', 'ready', 'crop', true],
    ['Shuri, Vibranium Technologist', 'hero', 'working', 'bun', true],
    ['Okoye, Dora Milaje Leader', 'hero', 'atEase', null, true],
    ['Okoye, Mighty and Adored', 'hero', 'akimbo', null, true],
    ['Warriors of Wakanda', 'agent', 'ready', 'parted', true],
    ['Storm, Queen of Wakanda', 'hero', 'braced', 'long', true],
  ];
  const lines: string[] = [];
  for (const [name, body, rest, hair, face] of want) {
    const pose = poseOf(name);
    lines.push(`  ${name.padEnd(34)} ${String(pose.modelId).padEnd(18)} hair ${String(pose.hair).padEnd(6)} ${pose.costume === null ? '' : COSTUME_SLOTS.map((k, i) => `${k} ${pose.costume![i]}`).join(' ')}`);
    assert.equal(baseModelOf(pose.modelId), body, `${name} is not in the ${body} body`);
    assert.equal(pose.rest, rest, `${name} does not rest ${rest}`);
    assert.equal(pose.hair, hair, `${name}'s head is not ${String(hair)}`);
    assert.equal(pose.props.some((p) => p.kind === 'face' || p.kind === 'faceGrit'), face, `${name}: a face ${face ? 'missing' : 'under a mask'}`);
    // The skin rule: the one tone unless the body is transformed.
    const skin = pose.costume![COSTUME_SLOTS.indexOf('skin')]!;
    if (TRANSFORMED_SKIN[name] === undefined) assert.equal(skin, COSTUME_DEFAULTS.skin, `${name} paints a skin and is not a transformed body`);
    else assert.notEqual(skin, COSTUME_DEFAULTS.skin, `${name} is listed as transformed (${TRANSFORMED_SKIN[name]!}) and paints no skin`);
  }
  console.log(`traits: the Masters of Evil, the Hulk family and Wakanda — body, head and costume (D231)\n${lines.join('\n')}`);
  // Every row the three decks name that paints a skin is on the list (and no other row in the file does).
  for (const [name, row] of Object.entries(TRAITS.cards)) {
    if (row.costume?.skin !== undefined) assert.ok(TRANSFORMED_SKIN[name] !== undefined, `${name} paints a skin and is not on TRANSFORMED_SKIN`);
  }
  // The gamma bodies: the Hulks green, Red Hulk red, the Abominations scaled.
  for (const name of ['Hulk, Brutal Brawler', 'Hulk, Strongest There Is', 'Hulk, Gamma Goliath']) {
    const hulk = poseOf(name);
    assert.ok(slot(hulk, 'skin').g > slot(hulk, 'skin').r + 50 && slot(hulk, 'top').g > slot(hulk, 'top').r + 50, `${name} is not gamma green`);
  }
  assert.ok(slot(poseOf('Hulk, Brutal Brawler'), 'legs').b > slot(poseOf('Hulk, Brutal Brawler'), 'legs').g + 40, "the Brutal Brawler's trousers are not purple");
  // The fix pass (D232): the verifier read the green bodies — three Hulks, Gamma
  // Grotesque, Hulkling, Brawn and Abomination, Terrifying Titan — as one slim
  // green rig in purple or dark trousers, told apart by scale alone. Each pair now
  // differs by at least 40 (RGB distance) in its skin, its top or its trousers, and
  // no two share a head and a rest.
  const GREEN_BODIES = [
    'Hulk, Brutal Brawler',
    'Hulk, Strongest There Is',
    'Hulk, Gamma Goliath',
    'Gamma Grotesque',
    'Hulkling, Burgeoning Bruiser',
    'Brawn, Amadeus Cho',
    'Abomination, Terrifying Titan',
  ];
  const dist = (a: ReturnType<typeof rgb>, b: ReturnType<typeof rgb>): number => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
  const apart: string[] = [];
  for (let i = 0; i < GREEN_BODIES.length; i++) {
    for (let j = i + 1; j < GREEN_BODIES.length; j++) {
      const a = poseOf(GREEN_BODIES[i]!);
      const b = poseOf(GREEN_BODIES[j]!);
      const most = Math.max(...(['skin', 'top', 'legs'] as const).map((k) => dist(slot(a, k), slot(b, k))));
      apart.push(`${GREEN_BODIES[i]!} / ${GREEN_BODIES[j]!} ${most.toFixed(0)}`);
      assert.ok(most >= 40, `${GREEN_BODIES[i]!} and ${GREEN_BODIES[j]!} are the same green body (skin, top and trousers within ${most.toFixed(0)})`);
      assert.ok(a.hair !== b.hair || a.rest !== b.rest, `${GREEN_BODIES[i]!} and ${GREEN_BODIES[j]!} share a head (${String(a.hair)}) and a rest (${String(a.rest)})`);
    }
  }
  console.log(`traits: the green bodies, pairwise — the most any of skin, top and trousers differ (≥ 40)\n  ${apart.join('\n  ')}`);
  const red = slot(poseOf('Red Hulk'), 'skin');
  assert.ok(red.r > red.g + 100, 'Red Hulk is not red');
  const grey = slot(poseOf('Abomination, Irradiated Brute'), 'skin');
  assert.ok(grey.spread < 40 && grey.l > 90, 'the Irradiated Brute is not grey-olive');
  for (const name of ['She-Hulk, Attorney-at-Law', 'She-Hulk, Jade Defender']) assert.ok(slot(poseOf(name), 'skin').g > 150, `${name} is not green`);
  // The villains' marks: Radioactive Man glows green, the lava body burns, Titania's hair is red.
  assert.ok(slot(poseOf('Radioactive Man'), 'skin').g > 200, 'Radioactive Man does not glow');
  const lava = slot(poseOf('Volcanic Villain'), 'skin');
  assert.ok(lava.r > 180 && lava.b < 60, 'the Volcanic Villain is not molten');
  assert.ok(slot(poseOf('Titania, Proud Pummeler'), 'hair').r > 180, "Titania's hair is not red");
  // Wakanda: the panthers in the black suit, the guard in red, Storm and the old king white-haired.
  for (const name of ["T'Challa, the Black Panther", 'Black Panther, Claws of Bast', 'Black Panther, Most Dangerous', 'Black Panther, Vanguard', 'Shuri, the Black Panther']) {
    assert.ok(slot(poseOf(name), 'top').l < 60, `${name}'s suit is not black`);
  }
  for (const name of ['Dora Milaje Elite', 'Okoye, Dora Milaje Leader', 'Okoye, Mighty and Adored']) {
    assert.ok(slot(poseOf(name), 'top').r > slot(poseOf(name), 'top').g + 80, `${name} is not in the guard's red`);
    assert.ok(poseOf(name).props.some((p) => p.kind === 'spear'), `${name} carries no spear`);
  }
  assert.ok(slot(poseOf('Storm, Queen of Wakanda'), 'hair').l > 220, "Storm's hair is not white");
  assert.ok(slot(poseOf("T'Chaka, Venerable King"), 'hair').l > 200, "T'Chaka's hair is not white");
  // Not people: the flier and the drone wear nothing.
  for (const name of ['Birds of Paradise', 'Wakandan Drone Flock']) assert.equal(poseOf(name).costume, null, `${name} wears a costume`);
});

test('traits: the face reads from the views it is FOR — close in the workshop’s 1× front, present at play distance on the seat that faces the lens — and is never on a back (D158)', async () => {
  const library = await loadLibrary();
  const cards = corpusCards();
  // Face-up people with nothing over the face (a hat's brim, a hood), at full size.
  const people = ['Agent Phil Coulson', 'Nick Fury, Spymaster', 'Quake, Agent of S.H.I.E.L.D.', 'Agent 13, Sharon Carter', 'Bold Biochemist'];
  const lines: string[] = [];
  const failures: string[] = [];
  for (const name of people) {
    const card = cards.get(name);
    assert.ok(card !== undefined, name);
    const row: string[] = [];
    for (const seat of SEATS) {
      const pose = soloPose(card, card, seat, false, false)!;
      const layers = figureLayers(pose, library);
      // Which seat shows the lens its FACE is layout.ts's to say (seatFacingY —
      // since D143 the FAR seat, the opponent's), never this test's.
      const front = facesTheLens(seat);
      const groups = kindGroups(layers);
      // The face in whichever style the card wears — Fury's is `facePatched`, and
      // at play distance his patched face is read WITH its patch: the patch is the
      // eye it covers (the identity raster holds the eyepatch itself).
      const face = [...(groups['face'] ?? []), ...(groups['facePatched'] ?? [])];
      const faces = { face, withPatch: [...face, ...(groups['eyepatch'] ?? [])] };
      for (const view of ['table', 'shoulder', 'side'] as const) {
        const seen = visibility(cameraAt(VIEW_BY_ID[view].pose), layers, faces);
        const px = seen.get('face')?.pixels ?? 0;
        const read = seen.get('withPatch')?.pixels ?? 0;
        row.push(`${seat}/${view} ${String(px).padStart(3)}`);
        if (front && view !== 'side' && read < FACE_FAR_MIN_PX) failures.push(`${name}: ${String(read)} px of face at the ${view} view, on the seat that faces it`);
        if (!front && view !== 'side' && px > 2) failures.push(`${name}: its face shows ${String(px)} px through the back of its head (${view})`);
      }
      // The close look: the workshop's `1× front` (framing.ts's `frontPose` — view
      // 1's distance and elevation, from the side the figure faces; D143).
      if (seat === 'you') {
        const alone = twoSeatState([onBattlefield(card, 500, 0)], []);
        const framing = framingOf(layout(alone, PRESENCE), posesOf(alone), 500);
        const close = visibility(cameraAt(frontPose(framing)), layers, faces).get('face')?.pixels ?? 0;
        row.push(`1× front ${String(close).padStart(3)}`);
        if (close < FACE_CLOSE_MIN_PX) failures.push(`${name}: ${String(close)} px of face in the workshop's 1× front`);
      }
    }
    lines.push(`  ${name.padEnd(30)} ${row.join(' · ')}`);
  }
  console.log(
    `traits: the face, in px at 1600 × 1000 (≥ ${String(FACE_CLOSE_MIN_PX)} in the workshop's 1× front; ≥ ${String(FACE_FAR_MIN_PX)} at the table view and over the shoulder ` +
      `on the seat whose figures face the lens, a patched face with its patch; ≤ 2 through the back of a head; side-on logged)\n${lines.join('\n')}`,
  );
  assert.deepEqual(failures, []);
});

/**
 * **What a face reaches** (lane BODIES, D158, restated at the lanes' merge). A
 * proportioned head is ~12 px tall at the table view (D95), so a face there is a
 * few pixels whatever it is. Before D143 the seat that faced the lens was the NEAR
 * one (5–7 px at the table view, 9–16 over the shoulder); since it, every face the
 * arena shows is on the FAR seat (2–10 px at either view, docs/evidence/bodies.md,
 * *At merge*), and the close look is the workshop's `1× front` (42–118 px). So a
 * face is held to being PRESENT at play distance — Fury's patched face read with
 * its patch — and to READING close, where expressions are judged. The bars are set
 * under the measurement, so a face that shrank or turned away fails. It is a
 * detail, not an identity.
 */
const FACE_FAR_MIN_PX = 4;
const FACE_CLOSE_MIN_PX = 32;

/**
 * Whether a seat's figures show the table view their FRONT: figure space faces
 * +Z (`FIGURE_FRONT_Z`), turned by `seatFacingY`, against the lens's side of the
 * table. Read off layout.ts so the face test follows the facing rule wherever it
 * lands (D81; since D143 your figures face the opponent, so it is the far seat).
 */
function facesTheLens(seat: 'you' | 'opp'): boolean {
  return Math.cos(seatFacingY(seat)) * FIGURE_FRONT_Z * Math.sign(VIEW_BY_ID.table.pose.position[2]) > 0;
}

test('traits: every anonymous pose in the corpus carries no props, no hover, no swarm', () => {
  // The second fix pass (D164; the verifier's round 2): the sweep hands the poses
  // a palette map that answers EVERY name — so "no art colour" below is the
  // pose's own gate speaking, not a map that was never passed. `palette.test.ts`'s
  // hostile corpus is the stronger proof (it names the backs); this one also
  // proves the face-up figures DO take the rung.
  const vivid = { swatches: [], dominant: '#123456', accent: '#e08a2c', vivid: true, terrain: '#123456' };
  const everyName = new (class extends Map<string, typeof vivid> {
    override get(): typeof vivid {
      return vivid;
    }
  })();
  let anonymous = 0;
  let coloured = 0;
  for (const { file, state } of FRAMES) {
    for (const pose of figurePose(layout(state), state.board?.combat ?? null, DATA, { models: MODELS, palettes: everyName }).values()) {
      if (!pose.anonymous) {
        if (pose.art !== null) coloured += 1;
        continue;
      }
      anonymous += 1;
      assert.deepEqual(pose.props, [], `${file}: an anonymous figure carries props`);
      assert.equal(pose.lift, 0, `${file}: an anonymous figure hovers`);
      assert.equal(pose.swarm, 0);
      assert.equal(pose.silhouette, null);
      assert.equal(pose.vehicle, false, `${file}: a card drawn as a back became a silhouette`);
      assert.deepEqual(pose.traitRungs, []);
      // Slice 4: a costume is a statement about what a card is (hard rule 8).
      assert.equal(pose.costume, null, `${file}: an anonymous figure wears a costume`);
      // Lane BODIES: nor a resting pose, a hairstyle, a face or its art's colour.
      assert.equal(pose.rest, null, `${file}: an anonymous figure rests in a signature pose`);
      assert.equal(pose.hair, null, `${file}: an anonymous figure has a hairstyle`);
      assert.equal(pose.art, null, `${file}: an anonymous figure carries an art colour`);
    }
  }
  console.log(
    `traits: ${String(anonymous)} anonymous figure-instances in the corpus, none with an identity, a costume, a pose, hair, a face or an art colour; ${String(coloured)} face-up ones took the art rung`,
  );
  assert.ok(anonymous >= 1138, `only ${String(anonymous)} anonymous instances — the morph fixtures are not being read`);
  assert.ok(coloured >= 1000, `only ${String(coloured)} face-up figures took the art rung — the map was not read`);
});

test('traits: a palette never paints a costume — a row-less person whose art is vivid wears the colour identity (D160; the verifier’s round 3)', () => {
  // Report 15 §7.1: a painting's dominant colour is its BACKGROUND. The art rung
  // may tint a creature with no hand-written tint anywhere (a disc, the ant) and
  // colour its rim and accent — but never its clothes. The committed data hides
  // the case (every human archetype in figures.json carries a tint), so this is
  // the case the data does not reach: a per-card figures.json row that names a
  // human body and no tint, and no traits row at all.
  const person = {
    id: 9,
    name: 'Row-less Hero',
    types: 'Creature - Human',
    manaCost: '{1}{R}',
    power: '2',
    toughness: '2',
    faceDown: false,
    tapped: false,
    sick: false,
    attacking: false,
    blocking: false,
    controller: 0,
    owner: 0,
    zone: 'battlefield',
    attachedToId: null,
    attachmentIds: [],
    counters: {},
    abilities: [],
  } as unknown as AnyCard;
  const base = FRAMES.find((f) => (f.state.board?.players.length ?? 0) === 2)!.state;
  const state = {
    ...base,
    board: {
      ...base.board!,
      stack: [],
      stackCards: [],
      combat: null,
      players: base.board!.players.map((p, i) => ({
        ...p,
        zones: { ...p.zones, battlefield: { count: i === 0 ? 1 : 0, cards: i === 0 ? [{ ...person, controller: p.id, owner: p.id }] : [] } },
      })),
    },
  } as ClientState;
  const data = validateFigures(
    { ...figuresJson, cards: { ...(figuresJson as { cards: Record<string, unknown> }).cards, 'Row-less Hero': { model: 'agent' } } },
    { modelIds: MODEL_IDS },
  ).data;
  assert.equal(data.cards['Row-less Hero']?.tint ?? null, null, 'the synthetic row must name no tint, or it proves nothing');
  const painted = '#e0302a';
  const vivid = { swatches: [], dominant: '#20303a', accent: painted, vivid: true, terrain: '#20303a' };
  const palettes = new Map([['Row-less Hero', vivid]]);
  const poseWith = (maps: ReadonlyMap<string, typeof vivid> | undefined): FigurePose =>
    figurePose(layout(state), null, data, { models: MODELS, traits: EMPTY_TRAIT_DATA, palettes: maps }).get(9)!;
  const off = poseWith(undefined);
  const on = poseWith(palettes);
  assert.ok(on !== undefined && off !== undefined, 'the person is a figure');
  assert.equal(on.anonymous, false);
  assert.ok(on.costume !== null, 'a person on the human body wears a costume');
  // The art rung reached the pose: the TINT is its painting's…
  assert.equal(on.art, painted, 'the art rung did not reach the pose');
  assert.equal(on.tint, painted, 'the row-less person should take the art tint (the rim, the accent)');
  // …and not one slot of the costume is.
  const identity = off.tint;
  assert.notEqual(identity, painted);
  assert.deepEqual(on.costume, off.costume, 'the art rung changed what the body WEARS');
  for (const slot of COSTUME_SLOTS) {
    assert.notEqual(on.costume[COSTUME_SLOTS.indexOf(slot)], painted, `the art painted the ${slot}`);
  }
  assert.equal(on.costume[COSTUME_SLOTS.indexOf('top')], identity, 'the suit is the colour identity');
  // The control: had the costume taken the pose's tint, the suit would be the painting.
  assert.equal(costumeOf({}, on.tint)[COSTUME_SLOTS.indexOf('top')], painted, 'the control no longer tells the two apart');
});

// ---------------------------------------------------------------------------
// The census — which card got which traits and props
// ---------------------------------------------------------------------------

interface Row {
  instances: number;
  model: string | null;
  rungs: string;
  props: string;
  scale: number;
  hover: number;
  swarm: string;
  silhouette: string;
  heightMin: number;
  heightMax: number;
  /** The costume's slots by name, off the first pose on the table (`{}` for a body that wears none). */
  costume: Readonly<Record<string, string>>;
  /** First seen as a ghost on the stack, and not yet on the table. */
  ghostFirst?: boolean;
}

/** A pose's costume as slot → colour (the census reads a row's cloth by name). */
function costumeByName(pose: FigurePose): Record<string, string> {
  const out: Record<string, string> = {};
  if (pose.costume === null) return out;
  COSTUME_SLOTS.forEach((slot, i) => {
    out[slot] = pose.costume![i]!;
  });
  return out;
}

/**
 * **The Doom Legion rows the corpus does not put on the table** (villain
 * identity, D221): the one villain recording, `villain-doom-248`, mills HYDRA
 * Troopers and Pharaoh Rama-Tut and never makes a Villain token. Each row is read
 * off a pose built from the workshop catalog's facts — the facts the corpus (or
 * the engine's card script) gave — and the day a recording puts one on the
 * battlefield, the census above fails until its name leaves this list.
 */
const OFF_THE_TABLE: Readonly<Record<string, string>> = {
  'HYDRA Troopers': 'milled on turn 22 of villain-doom-248, never cast',
  'Pharaoh Rama-Tut': 'milled on turn 22 of villain-doom-248, never cast',
  // Villain token: villain-doom-248 made none, and neither did villain-masters-of-evil-33
  // (its Avengers: Under Siege was never drawn).
  'Villain Token': 'villain-doom-248 made none, nor villain-masters-of-evil-33',
  // More villain identity (D230): the three new recordings' creatures that never
  // reached the battlefield — still in the library, milled, or held in hand.
  'Whiplash, Vengeful Engineer': 'never drawn in villain-masters-of-evil-33',
  'Titania, Proud Pummeler': 'never drawn in villain-masters-of-evil-33',
  'Tiger Shark, Abyssal Hunter': 'never drawn in villain-masters-of-evil-33',
  'She-Hulk, Attorney-at-Law': 'milled by Rick Jones on turn 21 of villain-hulk-family-261',
  'Hulk, Brutal Brawler': 'milled by Rick Jones on turn 21 of villain-hulk-family-261',
  'Gamma Grotesque': 'both copies milled by Rick Jones on turn 27 of villain-hulk-family-261',
  'Abomination, Terrifying Titan': 'milled by Rick Jones on turn 27 of villain-hulk-family-261',
  'Red Hulk': 'drawn on turn 28 of villain-hulk-family-261, the last turn, and never cast',
  'Shuri, Vibranium Technologist': "milled by T'Chaka's arrival on turn 33 of villain-wakanda-232",
  'Okoye, Dora Milaje Leader': "milled by T'Chaka's arrival on turn 33 of villain-wakanda-232",
};

/**
 * A token no recording has shown has no catalog facts — a token is no deck line.
 * The Villain token's are Forge's own token script's (`b_2_1_villain_menace`,
 * report 08 §8.1 #2: a black 2/1 `Creature Villain` with menace), spelled as the
 * wire spells a token (`Villain Token`, `Creature - Villain`).
 */
const TOKEN_FACTS: Readonly<Record<string, { types: string; power: string; toughness: string }>> = {
  'Villain Token': { types: 'Creature - Villain', power: '2', toughness: '1' },
};

/**
 * **A recording whose most crowded table is over the lines before any identity is
 * drawn** (villain identity, D221; measured again by its fix pass, D222), held to
 * its OWN measured numbers so it cannot grow — while the 17 above keeps holding
 * every other recording. `villain-doom-248`'s last turns put 49 cards on the two
 * battlefields (`@388`–`@392`; the corpus's next most crowded table is
 * `human-sideboard-7`'s 42, `g1`'s 35). A sweep of every frame with bloom off
 * (docs/evidence/villain-identity.md §6) finds its worst at transport index
 * `@392`/`@393`: **128 calls and 37,546 triangles** on the GTX 1080 and on
 * SwiftShader, against the base tree's **124 and 32,959** there with every villain
 * a bare body — over the bench's 120 calls and §8.2's 30,000 triangles before any
 * identity, and each prop kind a villain adds is one more call there. So two
 * numbers are held: `kinds`, the file's most prop kinds at once (22, at `@296`,
 * where the scene draws 102 calls), and `crowded`, the most at once on its most
 * crowded frames (the most battlefield cards) — 17, against the base tree's 13.
 */
const OVER_THE_LINE: Readonly<Record<string, { kinds: number; crowded: number }>> = {
  'games/villain-doom-248.jsonl': { kinds: 22, crowded: 17 },
  // More villain identity (D230, D231): the Masters of Evil and Wakanda against
  // Pacho, each held to its own measured numbers. The Masters' most kinds at once
  // (26, at @235) is Pacho's side's own 15 or so — Peggy's hat, shield, sidearm and
  // waves, Agent 13's pistol, muzzle and bun, the A.I.M. bench and hood, the
  // Doombot's eye, visor, pack and flame, the Air Force's bees — beside a Masters
  // table that reuses nearly every kind it wears; its most crowded frames (40
  // cards) draw 12. Wakanda's is 20 at once (@485), and 15 on its most crowded
  // frames (48 cards) — one of them the spear, the kit's one new kind, and none of
  // them a robe, which T'Chaka gave up for the cloak the table already draws
  // (D231). The Hulk family's is 16, inside the 17 every other recording keeps.
  'games/villain-masters-of-evil-33.jsonl': { kinds: 26, crowded: 12 },
  'games/villain-wakanda-232.jsonl': { kinds: 20, crowded: 15 },
};

/** A card built from its catalog facts (or {@link TOKEN_FACTS}) — the workshop's way in. */
function factCard(name: string): AnyCard {
  const token = TOKEN_FACTS[name];
  const found = workshopEntries().find((e) => e.name === name && e.concealed === null);
  const entry =
    found ??
    (token === undefined
      ? undefined
      : { ...workshopEntries().find((e) => e.key === 'card:Soldier Token')!, key: `card:${name}`, label: name, name, facts: { ...token, manaCost: null, token: true, setCode: 'MSH' } });
  assert.ok(entry !== undefined && !entry.missing, `${name} has no facts in the workshop catalog`);
  return cardOf(entry, 500, 1);
}

/**
 * **The AI decks' names** (villain identity, D221; more villain identity, D231),
 * from their `.dck` files — the Doom Legion, the deck a bare `./scripts/play.sh`
 * seats against you, and the three match setup added (the Masters of Evil, the
 * Hulk family, Wakanda) — and the tokens their cards make, which no deck line
 * names (Doctor Doom's Doombots; the Villain token Agents of HYDRA, HYDRA
 * Troopers and Avengers: Under Siege leave).
 */
const AI_DECKS = ['doom-legion.dck', 'masters-of-evil.dck', 'hulk-family.dck', 'wakanda.dck'] as const;
const AI_TOKENS = ['Doombot', 'Villain Token'] as const;

/** One deck's `[main]` names, in its order. */
function namesOf(file: string): string[] {
  const text = readFileSync(fileURLToPath(new URL(`../../decks/${file}`, import.meta.url)), 'utf8');
  const out: string[] = [];
  let main = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('[')) main = line.trim() === '[main]';
    const m = main ? /^\d+\s+([^|]+?)(?:\|.*)?$/.exec(line.trim()) : null;
    if (m !== null) out.push(m[1]!);
  }
  return out;
}

function villainNames(): string[] {
  const out: string[] = [];
  for (const file of AI_DECKS) for (const name of namesOf(file)) if (!out.includes(name)) out.push(name);
  return [...out, ...AI_TOKENS];
}

/** A census row for a card posed alone from its catalog facts — the workshop's way in. */
function rowFromFacts(name: string): Row {
  const card = factCard(name);
  const pose = posesOf(twoSeatState([], [onBattlefield(card, 500, 1)])).get(500);
  assert.ok(pose !== undefined, `${name} stands no figure`);
  const trait = traitFor(card, TRAITS).spec;
  return {
    instances: 0,
    model: pose.modelId,
    rungs: pose.traitRungs.join('+') || '-',
    props: pose.props.map((p) => p.kind).join('+') || '-',
    scale: trait.scale,
    hover: trait.hover,
    swarm: pose.swarm > 0 ? `${String(pose.swarm)} ${String(pose.formation)}` : '-',
    silhouette: pose.silhouette ?? '-',
    heightMin: pose.height,
    heightMax: pose.height,
    costume: costumeByName(pose),
  };
}

/** A `#rrggbb`'s mean channel, 0–255 (the census's "dark" and "light"). */
function lum(hex: string | undefined): number {
  if (hex === undefined) return Number.NaN;
  return (parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16)) / 3;
}

/** A saturated `#rrggbb`'s hue, named in the census's six words (null for a grey). */
function hueName(hex: string | undefined): string | null {
  if (hex === undefined) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0 || (max - min) / max < 0.25) return null;
  const d = max - min;
  const h = (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  if (h < 15 || h >= 345) return 'red';
  if (h < 38) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 170) return 'green';
  if (h < 260) return 'blue';
  return 'purple';
}
const isHue = (hex: string | undefined, name: string): boolean => hueName(hex) === name;
/** Steel: a light grey — little between its channels. */
const isSteel = (hex: string | undefined): boolean => hex !== undefined && hueName(hex) === null && lum(hex) > 120;

/**
 * **The names D231 dressed** — every card of the Masters of Evil, the Hulk family
 * and Wakanda with a `traits.json` row. The census holds each to its OWN row (the
 * `card` rung), not only to what its predicate names (the fix pass, D232).
 */
const D231_NAMES: ReadonlySet<string> = new Set(
  ['masters-of-evil.dck', 'hulk-family.dck', 'wakanda.dck'].flatMap((file) => namesOf(file)).filter((name) => TRAITS.cards[name] !== undefined),
);

test('traits: the census — every deck card reads as itself, and every row fires', () => {
  const rows = new Map<string, Row>();
  const kindsPerFrame: number[] = [];
  let worstKinds = { kinds: 0, where: '' };
  let worstInstances = { n: 0, where: '' };
  /** D221: each recording held to its own measured worst ({@link OVER_THE_LINE}). */
  const worstByFile = new Map<string, number>();
  /** D222: the most kinds at once on each file's most CROWDED frames (the most battlefield cards). */
  const crowdByFile = new Map<string, { cards: number; kinds: number; where: number[] }>();
  for (const { file, index, state } of FRAMES) {
    const poses = figurePose(layout(state), state.board?.combat ?? null, DATA, { models: MODELS });
    const kinds = new Set<string>();
    let instances = 0;
    for (const pose of poses.values()) {
      for (const prop of pose.props) {
        kinds.add(prop.kind === 'squad' ? `squad:${baseModelOf(pose.modelId) ?? ''}` : prop.kind);
        // One instance per anchor (the gauntlets' two fists, the badge's chest and
        // back), one per member for a swarm or a squad.
        const anchors =
          prop.kind === 'swarmBee' || prop.kind === 'squad'
            ? pose.swarm
            : Math.max(1, anchorsOf(prop.kind, familyOf(pose.modelId, MODELS), pose.hair === null).length);
        instances += anchors;
      }
      if (pose.anonymous) continue;
      const card = [...(state.board?.players ?? [])]
        .flatMap((p) => p.zones.battlefield.cards)
        .concat(state.board?.stackCards ?? [])
        .find((c) => c.id === pose.cardId);
      const name = card === undefined || isHidden(card) ? '(?)' : ((card as { name?: string }).name ?? '(?)');
      const trait = card === undefined ? DEFAULT_TRAIT : traitFor(card, TRAITS).spec;
      const row = rows.get(name) ?? {
        instances: 0,
        model: pose.modelId,
        rungs: pose.traitRungs.join('+') || '-',
        props: pose.props.map((p) => p.kind).join('+') || '-',
        scale: trait.scale,
        hover: trait.hover,
        swarm: pose.swarm > 0 ? `${String(pose.swarm)} ${String(pose.formation)}` : '-',
        silhouette: pose.silhouette ?? '-',
        heightMin: pose.height,
        heightMax: pose.height,
        costume: costumeByName(pose),
      };
      row.instances += 1;
      if (!pose.ghost) {
        row.heightMin = Math.min(row.heightMin, pose.height);
        row.heightMax = Math.max(row.heightMax, pose.height);
        // A row first seen as a GHOST (a creature spell on the stack) reads its
        // body and props off its first figure on the table (D221: the A.I.M. Bot
        // is seen cast before it is seen standing).
        if (row.ghostFirst === true) {
          row.model = pose.modelId;
          row.rungs = pose.traitRungs.join('+') || '-';
          row.props = pose.props.map((p) => p.kind).join('+') || '-';
          row.swarm = pose.swarm > 0 ? `${String(pose.swarm)} ${String(pose.formation)}` : '-';
          row.silhouette = pose.silhouette ?? '-';
          row.heightMin = pose.height;
          row.heightMax = pose.height;
          row.costume = costumeByName(pose);
          row.ghostFirst = false;
        }
      } else if (row.instances === 1) {
        row.ghostFirst = true;
      }
      rows.set(name, row);
    }
    kindsPerFrame.push(kinds.size);
    worstByFile.set(file, Math.max(worstByFile.get(file) ?? 0, kinds.size));
    const cards = (state.board?.players ?? []).reduce((n, p) => n + p.zones.battlefield.cards.length, 0);
    const crowd = crowdByFile.get(file);
    if (crowd === undefined || cards > crowd.cards) crowdByFile.set(file, { cards, kinds: kinds.size, where: [index] });
    else if (cards === crowd.cards) {
      crowd.kinds = Math.max(crowd.kinds, kinds.size);
      crowd.where.push(index);
    }
    if (OVER_THE_LINE[file] === undefined && kinds.size > worstKinds.kinds) worstKinds = { kinds: kinds.size, where: `${file}@${String(index)}` };
    if (instances > worstInstances.n) worstInstances = { n: instances, where: `${file}@${String(index)}` };
  }

  const lines = [...rows]
    .filter(([, r]) => r.rungs !== '-' || r.props !== '-')
    .sort((a, b) => b[1].instances - a[1].instances)
    .map(
      ([name, r]) =>
        `  ${String(r.instances).padStart(5)}  ${name.padEnd(30)} ${String(r.model ?? '(none)').padEnd(9)} ` +
        `rungs ${r.rungs.padEnd(34)} props ${r.props.padEnd(28)} scale ${r.scale.toFixed(2)} hover ${r.hover.toFixed(2)} ` +
        `swarm ${r.swarm.padEnd(7)} ${r.silhouette === '-' ? '' : `silhouette ${r.silhouette} `}` +
        `height ${r.heightMin.toFixed(3)}–${r.heightMax.toFixed(3)}`,
    );
  console.log(
    `traits: the census — ${String(lines.length)} cards with an identity over ${String(FRAMES.length)} board frames\n` +
      `${lines.join('\n')}\n` +
      `  prop KINDS on the table at once: max ${String(worstKinds.kinds)} (${worstKinds.where}) — one draw call each\n` +
      `  prop INSTANCES at once: max ${String(worstInstances.n)} (${worstInstances.where})`,
  );

  // **An entry that never fires says so** — every card row in traits.json is a
  // card the corpus puts on the battlefield (or on the stack as a ghost), or one
  // of the Doom Legion's that the one villain recording does not, each named in
  // OFF_THE_TABLE with why (D221) and read off a pose built from its facts below.
  const idle = Object.keys(TRAITS.cards).filter((name) => !rows.has(name));
  assert.deepEqual(idle.sort(), Object.keys(OFF_THE_TABLE).sort(), `traits.json rows never reached by the corpus: ${idle.join(', ')}`);
  // …and every archetype rung fires on something.
  const fired = new Set([...rows.values()].flatMap((r) => r.rungs.split('+')));
  const idleRungs = Object.keys(TRAITS.archetypes).filter((key) => !fired.has(key));
  console.log(`  archetype rungs never reached: ${idleRungs.length === 0 ? '(none)' : idleRungs.join(', ')}`);

  // The task's list, read back off the census: each identity is really drawn.
  const want: Array<[string, (r: Row) => boolean, string]> = [
    ['Wasp, Shrinking Savior', (r) => r.props.includes('wings') && r.hover > 0 && r.heightMax < 0.5, 'small, hovering, winged'],
    ['Ant-Man, Reformed Rogue', (r) => r.props.includes('helmet'), 'helmeted'],
    ["Ant-Man's Air Force", (r) => r.swarm === '5 ring' && r.props.includes('swarmBee'), 'a swarm of five'],
    ['Giant-Sized Flying Ant', (r) => r.props.includes('rider') && r.heightMax > 0.8, 'giant, with a rider'],
    ['Aerial Doombot', (r) => ['laserEye', 'visor', 'jetpack', 'exhaust'].every((k) => r.props.includes(k)), 'eye and visor, thrusters, exhaust'],
    ['Nick Fury, Spymaster', (r) => r.props.includes('coat') && r.props.includes('eyepatch'), 'coat and eyepatch'],
    ['Agent Phil Coulson', (r) => r.props.includes('badge') && r.props.includes('tie'), 'badge, shirt and tie'],
    ['Quake, Agent of S.H.I.E.L.D.', (r) => r.props.includes('gauntlets'), 'gauntlets'],
    ['Peggy Carter, Secret Agent', (r) => r.props.includes('shield') && r.props.includes('hat'), 'shield and red hat'],
    ['Agent 13, Sharon Carter', (r) => r.props.includes('pistol') && r.props.includes('muzzle'), 'pistol with a lit muzzle'],
    ['Agents of S.H.I.E.L.D.', (r) => r.swarm === '2 squad' && r.props.includes('squad'), 'a squad'],
    ['S.H.I.E.L.D. Helicarrier', (r) => r.silhouette === 'carrier', 'a carrier overhead'],
    ['Bold Biochemist', (r) => r.props.includes('labBench') && r.props.includes('coat'), 'a lab coat and bench'],
    ['A.I.M. Scientists', (r) => r.props.includes('labBench') && r.props.includes('hood'), 'hood and bench'],
    // Villain identity (D221): the Doom Legion, and the two tokens its cards make.
    ['Doctor Doom', (r) => ['mask', 'cape', 'coatTails', 'hairCowl'].every((k) => r.props.includes(k)) && !r.props.includes('labBench'), 'iron mask under a green hood, cloak and tunic — no lab bench'],
    ['Doombot', (r) => r.props.includes('laserEye') && r.props.includes('visor') && !r.props.includes('jetpack'), 'a walking drone: eye and visor, no thrusters'],
    ["Doom's Servo-Guards", (r) => r.props.includes('laserEye') && r.props.includes('visor') && r.hover < 0.1, 'a sentry drone, low'],
    ['A.I.M. Bot', (r) => ['wings', 'laserEye', 'visor'].every((k) => r.props.includes(k)) && r.hover > 0.3, 'a flying drone with wings'],
    ['Agents of HYDRA', (r) => r.swarm === '2 squad' && r.props.includes('squad') && r.props.includes('hairCowl'), 'a hooded squad'],
    ['HYDRA Troopers', (r) => r.props.includes('pistol') && r.props.includes('hairCowl') && r.swarm === '-', 'a hooded trooper with a pistol — one man, not a squad'],
    ['Baron Strucker, HYDRA Overlord', (r) => r.props.includes('coat') && r.props.includes('coatTails') && !/hair/.test(r.props), 'bald, in a greatcoat'],
    ['Loki, God of Mischief', (r) => ['cape', 'gauntlets', 'hairLong'].every((k) => r.props.includes(k)), 'cloak, lit hands, long hair'],
    ['Kang the Conqueror', (r) => ['mask', 'gauntlets', 'hairCowl'].every((k) => r.props.includes(k)) && r.hover > 0, 'masked, blasters lit, flying'],
    ['Kang, Temporal Tyrant', (r) => ['mask', 'cape', 'hairCowl'].every((k) => r.props.includes(k)), 'masked and cloaked'],
    ['Pharaoh Rama-Tut', (r) => r.props.includes('cape') && r.props.includes('hairLong'), 'headdress and cloak'],
    ['Unliving Legionnaire', (r) => ['wings', 'mask', 'hairCowl'].every((k) => r.props.includes(k)) && r.hover > 0.2, 'a hooded, pale-faced thing on wings, flying'],
    ['Madame Hydra, Reanimated', (r) => r.props.includes('cape') && r.props.includes('hairLong'), 'long hair and cloak'],
    ['Crossbones, Malicious Mercenary', (r) => r.props.includes('mask') && r.props.includes('hairCowl'), 'a skull mask on a balaclava'],
    ['Villain Token', (r) => r.props.includes('hairCowl'), 'a hooded henchman'],
    // More villain identity (D231): the Masters of Evil…
    ['Whiplash, Vengeful Engineer', (r) => r.props.includes('gauntlets') && r.props.includes('hairCowl'), 'a hooded engineer, his whips lit at both hands'],
    ['Songbird, Sonic Screamer', (r) => r.props.includes('wings') && r.props.includes('hairLong') && String(r.model).startsWith('hero'), 'a woman on sound wings'],
    ['MACH-1, Swooping Scoundrel', (r) => ['mask', 'visor', 'jetpack', 'exhaust', 'hairCowl'].every((k) => r.props.includes(k)) && r.hover > 0.2, 'a helmed flier on thrusters, lenses lit'],
    ['Yellowjacket, Heartless Marauder', (r) => r.props.includes('helmet') && r.props.includes('wings') && r.hover > 0.2 && r.heightMax < 0.6, 'small, helmeted, winged, flying'],
    ['Boomerang, Blade Flinger', (r) => ['mask', 'hairCowl'].every((k) => r.props.includes(k)) && !r.props.includes('face') && isSteel(r.costume['gloves']), "a silver faceguard in a dark hood, steel gloves"],
    ['Fixer, Techno Terror', (r) => ['visor', 'labBench', 'hairParted'].every((k) => r.props.includes(k)), 'goggles at a bench of gadgets'],
    ['White Widow, Yelena Belova', (r) => r.props.includes('visor') && r.props.includes('hairBob'), 'goggles over a blonde bob'],
    ['Common Crook', (r) => r.props.includes('hairLong') && !r.props.includes('hairCowl') && r.swarm === '-' && isHue(r.costume['top'], 'orange'), 'a long-haired crook in a rust-orange shirt'],
    ['Whirlwind, Killer Cyclone', (r) => r.props.includes('mask') && r.props.includes('hairCowl') && r.hover > 0.1, 'masked and helmed, riding his cyclone'],
    ['Volcanic Villain', (r) => r.props.includes('gauntlets') && r.props.includes('hairLong'), 'burning fists, flames for hair'],
    ['Klaw, Sonic Subjugator', (r) => r.props.includes('gauntlets') && r.props.includes('hairParted'), 'sound at his hands'],
    ['Titania, Proud Pummeler', (r) => r.props.includes('hairLong') && r.heightMax > 1, 'long hair and a head over a woman'],
    ['Moonstone, Harsh Mistress', (r) => r.props.includes('gauntlets') && r.props.includes('hairLong') && r.hover > 0.2, 'flying, the moonstone lit in her hands'],
    ['Tiger Shark, Abyssal Hunter', (r) => r.props.includes('hairCowl') && r.heightMax > 0.9, 'a big man in a finned hood'],
    ['Atlas, Sizable Stooge', (r) => r.props.includes('hairParted') && r.heightMax > 1.05, 'a giant'],
    ['Radioactive Man', (r) => r.props.includes('gauntlets') && !r.props.includes('labBench'), 'glowing hands — no lab bench'],
    ['The Masters of Evil', (r) => r.swarm === '2 squad' && ['squad', 'mask', 'cape', 'hairCowl'].every((k) => r.props.includes(k)) && lum(r.costume['top']) < 60 && isHue(r.costume['hair'], 'purple'), "a squad led by Zemo's purple hood, mask and cloak, the two behind him in shadow (the followers wear the leader's dark top)"],
    // …the Hulk family…
    ['Rick Jones, Destined Sidekick', (r) => r.props.includes('hairCrop') && r.heightMax < 0.85, 'a young man, a little short of a hero'],
    ['Birds of Paradise', (r) => String(r.model).startsWith('insect') && r.swarm === '3 ring' && r.props.includes('swarmBee') && r.hover > 0.2, 'a flock of three small fliers, circling'],
    ['Brawn, Amadeus Cho', (r) => r.props.includes('hairCrop') && !r.props.includes('labBench') && isHue(r.costume['skin'], 'green') && lum(r.costume['shirt']) > 200 && lum(r.costume['legs']) < 60, 'green, a dark vest over white — no lab bench'],
    ['Hellcat, Undying Vigilante', (r) => r.props.includes('hairLong') && isHue(r.costume['top'], 'yellow') && isHue(r.costume['hair'], 'red') && String(r.model).startsWith('hero'), 'the yellow catsuit, red hair'],
    ['Knight of Wundagore', (r) => ['mask', 'hairLong'].every((k) => r.props.includes(k)) && !r.props.includes('face') && isHue(r.costume['skin'], 'orange') && isHue(r.costume['top'], 'blue'), "a lion's face under a mane, in dark blue armour"],
    ['Gallant Citizen', (r) => r.props.includes('hairParted') && String(r.model).startsWith('agent'), 'a man, parted hair — no glow disc'],
    ['Gamma Grotesque', (r) => !/hair/.test(r.props) && r.heightMax > 0.95 && String(r.model).endsWith('@working') && lum(r.costume['legs']) < 40, 'a bald monster bigger than a man, hunched, in black trunks'],
    ['She-Hulk, Attorney-at-Law', (r) => r.props.includes('hairLong') && r.heightMax > 0.9, 'a tall woman'],
    ['She-Hulk, Jade Defender', (r) => r.props.includes('hairLong') && r.heightMax > 0.95, 'a taller woman'],
    ['Hercules, Prince of Power', (r) => r.props.includes('hairCrop') && r.heightMax > 0.95 && String(r.model).startsWith('agent'), "big, in the man's body"],
    ['Hulkling, Burgeoning Bruiser', (r) => r.props.includes('hairCrop') && String(r.model) === 'agent@highReady' && isHue(r.costume['top'], 'purple'), "the man's body, a fist raised, in lavender"],
    ['Hulk, Brutal Brawler', (r) => r.props.includes('hairParted') && r.heightMax > 1.1 && isHue(r.costume['legs'], 'purple'), 'the Hulk in purple: one of the biggest people on the table'],
    ['Hulk, Strongest There Is', (r) => r.props.includes('hairCrop') && r.heightMax > 1.1 && !isHue(r.costume['legs'], 'purple'), 'the Hulk, cropped, in brown'],
    ['Hulk, Gamma Goliath', (r) => r.props.includes('hairLong') && r.heightMax > 1.15 && isHue(r.costume['legs'], 'blue'), 'the biggest Hulk, maned, in indigo'],
    ['Red Hulk', (r) => r.props.includes('hairCrop') && r.heightMax > 1.1, 'as big as the Hulk'],
    ['Abomination, Irradiated Brute', (r) => !/hair/.test(r.props) && r.heightMax > 1.05, 'bald and huge'],
    ['Abomination, Terrifying Titan', (r) => !/hair/.test(r.props) && r.heightMax > 1.05, 'bald and huge'],
    ['Wolverine, Fierce Fighter', (r) => r.props.includes('gauntlets') && r.props.includes('hairCowl') && r.heightMax < 0.85, 'short, cowled, claws out'],
    // …and Wakanda.
    ['Shuri, the Black Panther', (r) => r.props.includes('mask') && r.props.includes('hairCowl') && String(r.model).startsWith('hero'), "the panther's mask on the woman's body"],
    ["T'Chaka, Venerable King", (r) => ['cape', 'hairCrop'].every((k) => r.props.includes(k)), 'a royal cloak'],
    ['Dora Milaje Elite', (r) => r.props.includes('spear') && !/hair/.test(r.props) && String(r.model).startsWith('hero'), 'a shaven woman with a spear'],
    ['Wakandan Shield Guard', (r) => ['cape', 'spear', 'hairCrop'].every((k) => r.props.includes(k)), 'a blanket-shield and a spear'],
    ["T'Challa, the Black Panther", (r) => r.props.includes('mask') && r.props.includes('hairCowl') && String(r.model).startsWith('agent'), "the panther's mask on the man's body"],
    ['Black Panther, Claws of Bast', (r) => ['mask', 'gauntlets', 'hairCowl'].every((k) => r.props.includes(k)), 'masked, claws lit'],
    ['Black Panther, Most Dangerous', (r) => ['mask', 'gauntlets', 'visor', 'hairCowl'].every((k) => r.props.includes(k)), 'masked, charged at the hands and the eyes'],
    ['Black Panther, Vanguard', (r) => ['mask', 'cape', 'hairCowl'].every((k) => r.props.includes(k)), 'masked and cloaked'],
    ['Nakia, Wakandan Operative', (r) => r.props.includes('gauntlets') && r.props.includes('hairCrop'), 'ring blades lit'],
    ['Shuri, Vibranium Technologist', (r) => r.props.includes('gauntlets') && r.props.includes('hairBun'), 'gauntlets lit, hair up'],
    ['Okoye, Dora Milaje Leader', (r) => r.props.includes('spear') && !/hair/.test(r.props), 'shaven, with a spear'],
    ['Okoye, Mighty and Adored', (r) => r.props.includes('spear') && !/hair/.test(r.props), 'shaven, with a spear'],
    ['Wakandan Drone Flock', (r) => ['laserEye', 'visor', 'wings'].every((k) => r.props.includes(k)) && r.hover > 0.3, 'a winged drone'],
    ['Warriors of Wakanda', (r) => r.swarm === '2 squad' && r.props.includes('squad') && r.props.includes('spear'), 'a war party with a spear'],
    ['Storm, Queen of Wakanda', (r) => ['gauntlets', 'cape', 'hairLong'].every((k) => r.props.includes(k)) && r.hover > 0.2, 'flying, cloaked, lightning in her hands'],
  ];
  const offTable: string[] = [];
  for (const [name, ok, what] of want) {
    let row = rows.get(name);
    if (row === undefined && OFF_THE_TABLE[name] !== undefined) {
      row = rowFromFacts(name);
      offTable.push(`  ${name.padEnd(30)} (${OFF_THE_TABLE[name]!}) props ${row.props} hover ${row.hover.toFixed(2)}`);
    }
    assert.ok(row !== undefined, `${name} never reached the census`);
    assert.ok(ok(row), `${name} should read as ${what}: ${JSON.stringify(row)}`);
    // The fix pass (D232): a row of the three AI decks D231 dressed must read ITS
    // OWN row — the `card` rung — so no predicate passes on what a rung supplies
    // alone (the verifier found Hellcat's and the Knight's `hairLong`, Boomerang's
    // cowl and Brawn's crop would all have held with the row deleted).
    if (D231_NAMES.has(name)) assert.ok(row.rungs.split('+').includes('card'), `${name} does not read its own traits.json row: rungs ${row.rungs}`);
  }
  console.log(`traits: the AI decks' rows no committed recording puts on the table, read off a pose from their facts (D221, D231)\n${offTable.join('\n')}`);

  // **The budget**: the field draws one call per KIND. Report 13 §8.2's 90 has
  // room for the slice-2 scene (≤ 66 at g1@355) plus this many. Lane BODIES raised
  // it from 12 to 16 — a face and a hairstyle per style on the table, a coat's
  // skirt and a sidearm (D157–D159): measured 16 at the corpus's worst frame
  // (disjoint.jsonl@241), 15 at g1@316 and 14 at @355, where the whole scene
  // draws 85 calls with bloom off on the GTX 1080 (docs/evidence/bodies.md) —
  // inside the 90. The second fix pass (D165) raised it to 17: a face in grit is
  // a kind of its own while a kneeling, attacking or blocking person is on the
  // table beside a resting one (human-auto-2026.jsonl@776 is the worst frame);
  // docs/evidence/bodies.md §8 has the calls it costs at the budget frames.
  assert.ok(worstKinds.kinds <= 17, `${String(worstKinds.kinds)} prop kinds in one frame (${worstKinds.where})`);
  for (const [file, held] of Object.entries(OVER_THE_LINE)) {
    const got = worstByFile.get(file) ?? 0;
    const crowd = crowdByFile.get(file) ?? { cards: 0, kinds: 0, where: [] };
    console.log(
      `  ${file}: at most ${String(got)} prop kinds at once (held to ${String(held.kinds)}, D221); ` +
        `${String(crowd.kinds)} on its most crowded frames, ${String(crowd.cards)} battlefield cards at @${String(crowd.where[0])}–@${String(crowd.where[crowd.where.length - 1])} (held to ${String(held.crowded)}, D222)`,
    );
    assert.ok(got > 0 && got <= held.kinds, `${file}: ${String(got)} prop kinds in one frame, over its measured ${String(held.kinds)}`);
    assert.ok(crowd.kinds > 0 && crowd.kinds <= held.crowded, `${file}: ${String(crowd.kinds)} prop kinds on its most crowded frames, over its measured ${String(held.crowded)} — each is a draw call on a table already over the lines (D222)`);
  }
  assert.ok(worstInstances.n <= 96, `${String(worstInstances.n)} prop instances in one frame`);
});

/**
 * **The figure layer's triangles at once** (the fix pass of more villain identity,
 * D233). Report 13 §8.2's line is 30,000 triangles for the whole scene; identity
 * adds to it through the bodies it models and the props it hangs on them, and
 * nothing else — the cards, tiles, discs and strips are the same with no row at
 * all. So this is the part identity owns, counted the way the renderer draws it:
 * each modelled figure's body (`models.json`'s triangles), and each prop kind's
 * geometry as the prop field builds it (the procedural kinds, and the baked
 * ones — a squad follower is its body, a carved hairstyle its mesh) times its
 * instances (one per anchor, one per swarm or squad member).
 *
 * The whole scene's worst frames (docs/evidence/more-villain-identity.md §6, a
 * static sweep on the GTX 1080 and SwiftShader) are over the 30,000 on the Doom
 * Legion's, the Masters of Evil's and Wakanda's tables. D222 accepted the Doom
 * Legion's (over before identity); D233 accepts the Masters' and Wakanda's with
 * their numbers — and holds the part identity owns HERE, so it cannot grow: each
 * villain recording to its own measured worst, every other recording to the
 * worst among them. A held number is a measurement, so it must stay within 5% of
 * what the corpus gives (a cut is recorded, not left as slack).
 */
const FIGURE_TRIS_HELD: Readonly<Record<string, number>> = {
  'games/villain-doom-248.jsonl': 31318,
  'games/villain-masters-of-evil-33.jsonl': 31449,
  'games/villain-wakanda-232.jsonl': 28710,
};
/** Every recording not named above: its worst figure-layer triangles at once (`g1`@342). */
const FIGURE_TRIS_OTHERS = 24701;
/**
 * **The same layer with the portrait standee at its dearest** (D263, as the fix
 * pass amended it; dev server only, D260): every figure a standee MAY replace —
 * the lookup's gates, `mayStand`, whatever the relief cache holds and whatever
 * its legibility floor keeps — counted at the dearer of its body and props or one
 * standee's 1,920 triangles. The most standees can make of each villain table,
 * held at its measured worst like the layer above (within 5% below), and every
 * other recording at the worst among them.
 */
const FIGURE_TRIS_STANDEES_HELD: Readonly<Record<string, number>> = {
  'games/villain-doom-248.jsonl': 31438,
  'games/villain-masters-of-evil-33.jsonl': 32107,
  'games/villain-wakanda-232.jsonl': 29556,
  'games/villain-hulk-family-261.jsonl': 24708,
};
/** Every recording not named above, with standees at their dearest (`g1`@342). */
const FIGURE_TRIS_STANDEES_OTHERS = 25109;

test('traits: the figure layer\'s triangles at once — each villain table held to its measured worst, every other recording to theirs (D233); and with the portrait standee at its dearest (D263)', async () => {
  const library = await loadLibrary();
  const field = new PropField();
  field.setLibrary(library, MODELS);
  const kindTris = new Map<string, number>();
  for (const child of field.group.children) {
    const geometry = (child as THREE.Mesh).geometry;
    const n = geometry.index !== null ? geometry.index.count / 3 : geometry.getAttribute('position').count / 3;
    kindTris.set(child.name.replace(/^props:/, ''), n);
  }
  const worst = new Map<string, { tris: number; at: number; bodies: number; props: number }>();
  const standeeTris = standeeSheets().indices.length / 3;
  const withStandees = new Map<string, { tris: number; at: number; standees: number }>();
  for (const { file, index, state } of FRAMES) {
    const placed = layout(state);
    const poses = figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS });
    // D263 (amended): the figures a standee may replace — the lookup's own gates, each card once.
    const standable = new Set<number>();
    for (const p of placed.placements) {
      const pose = poses.get(p.cardId);
      if ((p.kind === 'creature' || p.kind === 'stack') && pose !== undefined && !standable.has(p.cardId) && mayStand(p, pose)) standable.add(p.cardId);
    }
    let bodies = 0;
    let props = 0;
    let dearest = 0;
    let standees = 0;
    for (const pose of poses.values()) {
      const base = baseModelOf(pose.modelId);
      let own = 0;
      if (base !== null) own += MODELS.models[base]?.triangles ?? 0;
      bodies += base !== null ? (MODELS.models[base]?.triangles ?? 0) : 0;
      for (const prop of pose.props) {
        const key = prop.kind === 'squad' ? `squad:${base ?? ''}` : prop.kind;
        const per = kindTris.get(key);
        assert.ok(per !== undefined, `${file}@${String(index)}: the prop field builds no ${key}`);
        const instances =
          prop.kind === 'swarmBee' || prop.kind === 'squad' ? pose.swarm : Math.max(1, anchorsOf(prop.kind, familyOf(pose.modelId, MODELS), pose.hair === null).length);
        props += per * instances;
        own += per * instances;
      }
      if (standable.has(pose.cardId) && standeeTris > own) {
        dearest += standeeTris;
        standees += 1;
      } else dearest += own;
    }
    const was = worst.get(file);
    if (was === undefined || bodies + props > was.tris) worst.set(file, { tris: bodies + props, at: index, bodies, props });
    const had = withStandees.get(file);
    if (had === undefined || dearest > had.tris) withStandees.set(file, { tris: dearest, at: index, standees });
  }
  const lines: string[] = [];
  let others = { tris: 0, where: '' };
  for (const [file, w] of [...worst].sort((a, b) => b[1].tris - a[1].tris)) {
    lines.push(`  ${file.padEnd(46)} ${String(w.tris).padStart(6)} at @${String(w.at)} (bodies ${String(w.bodies)}, props ${String(w.props)})`);
    if (FIGURE_TRIS_HELD[file] === undefined && w.tris > others.tris) others = { tris: w.tris, where: `${file}@${String(w.at)}` };
  }
  console.log(`traits: the figure layer's most triangles at once, per recording (D233)\n${lines.join('\n')}\n  every other recording: ${String(others.tris)} (${others.where}), held to ${String(FIGURE_TRIS_OTHERS)}`);
  for (const [file, held] of Object.entries(FIGURE_TRIS_HELD)) {
    const got = worst.get(file)?.tris ?? 0;
    assert.ok(got > 0 && got <= held, `${file}: the figure layer draws ${String(got)} triangles at once, over its measured ${String(held)} (D233)`);
    assert.ok(got >= held * 0.95, `${file}: ${String(got)} triangles against a held ${String(held)} — re-measure and record the cut (D233)`);
  }
  assert.ok(others.tris <= FIGURE_TRIS_OTHERS, `${others.where}: ${String(others.tris)} figure-layer triangles at once, over the ${String(FIGURE_TRIS_OTHERS)} every other recording keeps (D233)`);
  assert.ok(others.tris >= FIGURE_TRIS_OTHERS * 0.95, `every other recording now peaks at ${String(others.tris)} against a held ${String(FIGURE_TRIS_OTHERS)} — re-measure (D233)`);
  // The portrait standee at its dearest (D263, amended): the most standees can make of the layer.
  assert.equal(standeeTris, 1920, 'a standee is 1,920 triangles (D263)');
  let standeeOthers = { tris: 0, where: '' };
  const standeeLines: string[] = [];
  for (const [file, w] of [...withStandees].sort((a, b) => b[1].tris - a[1].tris)) {
    standeeLines.push(`  ${file.padEnd(46)} ${String(w.tris).padStart(6)} at @${String(w.at)} (${String(w.standees)} standees dearer than their bodies; the layer alone ${String(worst.get(file)?.tris ?? 0)})`);
    if (FIGURE_TRIS_STANDEES_HELD[file] === undefined && w.tris > standeeOthers.tris) standeeOthers = { tris: w.tris, where: `${file}@${String(w.at)}` };
  }
  console.log(`traits: the figure layer with the portrait standee at its dearest, per recording (D263)\n${standeeLines.join('\n')}\n  every other recording: ${String(standeeOthers.tris)} (${standeeOthers.where}), held to ${String(FIGURE_TRIS_STANDEES_OTHERS)}`);
  for (const [file, held] of Object.entries(FIGURE_TRIS_STANDEES_HELD)) {
    const got = withStandees.get(file)?.tris ?? 0;
    assert.ok(got > 0 && got <= held, `${file}: standees at their dearest draw ${String(got)} figure-layer triangles at once, over the held ${String(held)} (D263)`);
    assert.ok(got >= held * 0.95, `${file}: ${String(got)} against a held ${String(held)} — re-measure and record the cut (D263)`);
  }
  assert.ok(standeeOthers.tris <= FIGURE_TRIS_STANDEES_OTHERS, `${standeeOthers.where}: ${String(standeeOthers.tris)} with standees at their dearest, over the held ${String(FIGURE_TRIS_STANDEES_OTHERS)} (D263)`);
  assert.ok(standeeOthers.tris >= FIGURE_TRIS_STANDEES_OTHERS * 0.95, `every other recording now peaks at ${String(standeeOthers.tris)} with standees against a held ${String(FIGURE_TRIS_STANDEES_OTHERS)} — re-measure (D263)`);
});

test('traits: every prop a deck card names fits the body that card stands in', () => {
  const dropped: string[] = [];
  for (const [name, row] of Object.entries(TRAITS.cards)) {
    // The body this card resolves to, through figures.json's own ladder, by name.
    const byName = DATA.cards[name];
    const model = byName?.model ?? null;
    for (const kind of row.props ?? []) {
      // A card with no row of its own in figures.json stands in its subtype's body:
      // the kit's `any`/humanoid anchors are what a spy or hero gets.
      const family = model !== null ? familyOf(model, MODELS) : 'humanoid';
      if (!fitsFamily(kind, family)) dropped.push(`${name}: ${kind} has no anchor on a ${String(family)}`);
    }
  }
  assert.deepEqual(dropped, []);
  // And every kit kind has at least one anchor, somewhere.
  for (const kind of PROP_KINDS) {
    assert.ok(Object.keys(PROP_KIT[kind].anchors).length > 0, `${kind} has no anchor on any body`);
  }
});

// ---------------------------------------------------------------------------
// D65, still strict: a turned giant and a swarm are clamped by THEIR width
// ---------------------------------------------------------------------------

test('traits: the giant ant is giant, and still fits its slot — side-on, no exemption', () => {
  const giant = TRAITS.cards['Giant-Sized Flying Ant'];
  assert.ok(giant !== undefined && giant.turnedRatio !== undefined && giant.turn === 90);
  const insect = MODELS.models['insect']!;
  const facingRatio = insect.width / insect.height;
  const plain = fitHeight(FIGURE_HEIGHT * (giant.scale ?? 1), facingRatio);
  const turned = fitHeight(FIGURE_HEIGHT * (giant.scale ?? 1), giant.turnedRatio);
  console.log(
    `traits: giant ant — facing, ${facingRatio.toFixed(2)}× wide → ${plain.toFixed(3)} tall; ` +
      `side-on, ${giant.turnedRatio.toFixed(2)}× wide → ${turned.toFixed(3)} tall (slot ${FIGURE_MAX_WIDTH.toFixed(3)})`,
  );
  assert.ok(turned > plain * 1.6, 'turning the giant did not make it read as giant');
  assert.ok(turned * giant.turnedRatio <= FIGURE_MAX_WIDTH + 1e-9, 'the turned giant overflows its slot');
});

test('traits: a swarm is clamped by its whole ring, a squad by its whole rank', () => {
  const ring = swarmSpan(5, 'ring', SWARM_BEE_RATIO, 0);
  const members = swarmMembers(5, 'ring');
  assert.equal(members.length, 5);
  for (const m of members) assert.ok(Math.abs(Math.hypot(m.x, m.z) - 0.42) < 1e-9);
  const agent = MODELS.models['agent']!;
  const squad = swarmSpan(2, 'squad', agent.width / agent.height, agent.width / agent.height);
  assert.ok(squad > agent.width / agent.height, 'a squad is wider than one agent');
  for (const { file, state } of FRAMES) {
    for (const pose of figurePose(layout(state), state.board?.combat ?? null, DATA, { models: MODELS }).values()) {
      if (pose.swarm === 0 || pose.ghost) continue;
      assert.ok(pose.width <= FIGURE_MAX_WIDTH + 1e-9, `${file}: a swarm overflows its slot (${pose.width.toFixed(3)})`);
      const span = pose.formation === 'ring' ? ring : squad;
      assert.ok(Math.abs(pose.width - pose.height * span) < 1e-9, `${file}: the swarm's width is not its span`);
    }
  }
});

test('traits: with no trait data the poses are slice 2’s — identity is purely additive', () => {
  for (const { state } of FRAMES.slice(0, 400)) {
    for (const pose of figurePose(layout(state), state.board?.combat ?? null, DATA, {
      models: MODELS,
      traits: EMPTY_TRAIT_DATA,
    }).values()) {
      assert.equal(pose.lift, 0);
      // Lane BODIES: a proportioned body's HEAD is props now — the pack's own hair
      // for that body (carved off it, D157) and the face (D158) — and nothing else.
      const own = pose.modelId === null ? undefined : BODY_HAIR[baseModelOf(pose.modelId)];
      const head = own === undefined || own === 'none' ? [] : [HAIR_KIND[own]];
      // …its face set in grit while it kneels, attacks or blocks (D165).
      const face = expressionOf(pose.stance) === 'grit' ? 'faceGrit' : 'face';
      assert.deepEqual(
        pose.props.map((p) => p.kind),
        pose.rest === null ? [] : [...head, face],
        'with no traits a figure carries only its own head',
      );
      assert.equal(pose.rest === null || pose.rest === 'stand', true, 'with no traits a body rests in its own idle');
      assert.equal(pose.swarm, 0);
      assert.equal(pose.silhouette, null);
      assert.equal(pose.vehicle, false, 'with no traits, no vehicle is posed');
    }
  }
});

// ---------------------------------------------------------------------------
// Two numbers the clamp assumes, measured
// ---------------------------------------------------------------------------

test('traits: the giant ant’s declared side-on ratio is at least the model’s measured depth', async () => {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
  const bytes = readFileSync(fileURLToPath(new URL('../public/models/figures.glb', import.meta.url)));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] }>((ok, bad) =>
    loader.parse(buffer, '', ok as never, bad),
  );
  const source = gltf.scene.getObjectByName(MODELS.models['insect']!.node)!;
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  const drawn = (): THREE.Box3 => {
    source.updateMatrixWorld(true);
    box.makeEmpty();
    source.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (mesh.isSkinnedMesh !== true) return;
      const count = mesh.geometry.getAttribute('position').count;
      for (let i = 0; i < count; i++) {
        mesh.getVertexPosition(i, v);
        v.applyMatrix4(mesh.matrixWorld);
        if (Number.isFinite(v.x)) box.expandByPoint(v);
      }
    });
    return box;
  };
  const bind = drawn();
  const height = bind.max.y - bind.min.y;
  // The resting stances the build measures width in (ready, crouch), read the same
  // way: the clip REST_CLIP_FOR names, at REST_PHASE_FOR, or idle if the model has none.
  const mixer = new THREE.AnimationMixer(source);
  let depth = 0;
  for (const stance of ['ready', 'crouch'] as const) {
    const key = MODELS.models['insect']!.clips[REST_CLIP_FOR[stance]] ?? MODELS.models['insect']!.clips['idle'];
    const clip = gltf.animations.find((a) => a.name === key);
    mixer.stopAllAction();
    if (clip !== undefined) {
      const action = mixer.clipAction(clip);
      action.play();
      action.time = REST_PHASE_FOR[stance] * clip.duration;
      mixer.update(0);
    }
    const b = drawn();
    depth = Math.max(depth, b.max.z - b.min.z);
  }
  const measured = depth / height;
  const declared = TRAITS.cards['Giant-Sized Flying Ant']!.turnedRatio!;
  console.log(`traits: the insect's resting depth is ${measured.toFixed(3)}× its height; traits.json declares ${declared}`);
  assert.ok(declared >= measured - 1e-6, `turnedRatio ${String(declared)} is below the measured ${measured.toFixed(3)}`);
  assert.ok(declared - measured < 0.1, 'turnedRatio is so generous the giant is smaller than it could be');
});

test('traits: the procedural swarm bee and the carrier are the sizes the pose assumes', async () => {
  const { buildKindGeometry } = await import('../src/arena/scene/props.ts');
  const bee = buildKindGeometry('swarmBee')!;
  bee.computeBoundingBox();
  const b = bee.boundingBox!;
  const ratio = (b.max.x - b.min.x) / (b.max.y - b.min.y);
  console.log(
    `traits: swarm bee ${(b.max.x - b.min.x).toFixed(3)} wide × ${(b.max.y - b.min.y).toFixed(3)} tall ` +
      `(ratio ${ratio.toFixed(3)} against SWARM_BEE_RATIO ${String(SWARM_BEE_RATIO)}), feet at ${b.min.y.toFixed(3)}`,
  );
  assert.ok(ratio <= SWARM_BEE_RATIO + 0.02, 'the bee is wider than the clamp assumes');
  assert.ok(b.max.y - b.min.y <= 1.02, 'the bee is taller than one unit');
  const carrier = buildKindGeometry('carrier')!;
  carrier.computeBoundingBox();
  const c = carrier.boundingBox!;
  console.log(
    `traits: carrier ${(c.max.x - c.min.x).toFixed(3)} × ${(c.max.y - c.min.y).toFixed(3)} × ${(c.max.z - c.min.z).toFixed(3)} ` +
      `of its length (drawn ${String(CARRIER_LENGTH)} long), ${String(carrier.getAttribute('position').count / 3)} triangles`,
  );
  assert.ok(Math.abs(c.max.x - c.min.x - 1) < 0.1, 'the carrier is not one length unit long');
  // …and inside the bounds figure-pose.test.ts projects to prove it covers no figure.
  const { CARRIER_BOUNDS } = await import('../src/arena/figures/props.ts');
  for (const [axis, lo, hi] of [
    ['x', c.min.x, c.max.x],
    ['y', c.min.y, c.max.y],
    ['z', c.min.z, c.max.z],
  ] as const) {
    const [min, max] = CARRIER_BOUNDS[axis];
    assert.ok(lo >= min - 1e-6 && hi <= max + 1e-6, `the carrier's ${axis} ${lo.toFixed(3)}..${hi.toFixed(3)} is outside CARRIER_BOUNDS`);
  }
  // Every procedural kind builds, and stays cheap: a prop is not a model.
  for (const kind of [...PROP_KINDS, 'swarmBee', 'carrier'] as const) {
    const geometry = buildKindGeometry(kind);
    if (kind === 'rider') {
      assert.equal(geometry, null, 'the rider is baked from the library, not built');
      continue;
    }
    assert.ok(geometry !== null, `${kind} has no geometry`);
    const triangles = geometry.getAttribute('position').count / 3;
    assert.ok(triangles <= 1200, `${kind} is ${String(triangles)} triangles`);
  }
});

test('traits: the model-less figure keeps its non-joint props (the bench), and a figure over budget drops the rest', () => {
  // A disc (no model: a library that failed, or a figure over MAX_FIGURES) cannot
  // carry a joint prop — there is no joint — but a stand-anchored one needs none.
  assert.equal(fitsFamily('labBench', null), true);
  assert.equal(fitsFamily('wings', null), false);
  assert.equal(fitsFamily('helmet', 'drone'), false, 'a helmet has no anchor on a drone');
  const aim = FRAMES.flatMap(({ state }) => state.board?.players ?? [])
    .flatMap((p) => p.zones.battlefield.cards)
    .find((c) => (c as { name?: string }).name === 'A.I.M. Scientists');
  assert.ok(aim !== undefined);
  assert.equal(figureFor(aim, DATA).spec.model, 'scientist');
});

test('traits: the prop field FOLLOWS prefers-reduced-motion — it does not read it once (verification fix)', async () => {
  // Slice 3 read the query at construction, so a user who turned reduced motion on
  // mid-game kept the wing flutter and the ring's turn. A fake MediaQueryList
  // stands in for the browser's: the field must subscribe, follow a change, and
  // let go of the listener on dispose.
  const listeners = new Set<() => void>();
  const query = {
    matches: false,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  const g = globalThis as { matchMedia?: unknown };
  const saved = g.matchMedia;
  g.matchMedia = (text: string) => {
    assert.equal(text, '(prefers-reduced-motion: reduce)');
    return query;
  };
  try {
    const { PropField } = await import('../src/arena/scene/props.ts');
    const field = new PropField();
    assert.equal(field.reducedMotion(), false);
    assert.equal(listeners.size, 1, 'the field did not subscribe');
    query.matches = true;
    for (const fn of listeners) fn();
    assert.equal(field.reducedMotion(), true, 'the field did not follow the change');
    query.matches = false;
    for (const fn of listeners) fn();
    assert.equal(field.reducedMotion(), false);
    field.dispose();
    assert.equal(listeners.size, 0, 'dispose left the listener subscribed');
  } finally {
    g.matchMedia = saved;
  }
});

// ---------------------------------------------------------------------------
// The second verification pass: identity reaches the SCREEN, from BOTH seats
// ---------------------------------------------------------------------------

/**
 * At least this many pixels of every identity prop reach the screen from the
 * table view at 1600 × 1000 — about a 7 × 7 patch, or a lit band two pixels by
 * twenty-four. Judged by `prop-raster.ts` over the real `figures.glb` bodies and
 * the real `PropField`, so "readable from behind" is a number, not a photograph.
 *
 * **In the comic look** (Lane LOOK's verification pass): the pixels counted are
 * the ones that still show the prop's PAINT — visible, and not under the ink
 * line (`prop-raster.ts`'s `comicVisibility`: `Post.tsx`'s rule, D139/D146, over
 * the raster's depth). The halftone's dots are counted and printed too; a dot
 * darkens a pixel by at most a third and the prop around it by the same, so they
 * are reported, and held apart only by the one-sided rule below.
 */
const IDENTITY_MIN_PX = 48;

/**
 * **Known shortfalls under the comic look** — each measured, each owned by the
 * lane that can fix it, each held at its measured floor so it cannot get worse,
 * and each failing this test the day it is fixed, so the row goes with the fix.
 * Nothing else may be under the bar.
 */
const SHORTFALL: Readonly<Record<string, { seat: 'you' | 'opp'; floor: number; why: string }>> = {
  // Empty since the lanes' merge. Its one row was Coulson's chest badge from the
  // front — 52 px before the ink, 46 after it, at `badge.anchors.human[0].size`
  // 0.065 — closed by Lane LOOK's follow-up 17 (0.075, in `figures/props.ts`).
};

/**
 * **The props that are on ONE side of a body by nature**, each with the partner
 * that reads on the side it cannot. The rest must read from BOTH seats: since
 * D143 your own figures show the table view their backs and the opponent's their
 * fronts (before it, the other way round — D81); the raster below runs both.
 * A one-sided prop is a detail: it must show on its own side at half the bar
 * (kneeling included), and its partner must carry the card at the full bar on
 * every seat where it does not.
 */
/**
 * `only` narrows a row to the cards that need it (the villain fix pass): a kind
 * that is one-sided on ONE wearer — Doom's cloak behind his body, his tunic under
 * his cloak — stays held to both seats on every other wearer, so a new row that
 * hides its cloak needs a reason of its own.
 */
const ONE_SIDED: Readonly<Record<string, { partner: string | readonly string[]; why: string; only?: readonly string[] }>> = {
  tie: { partner: 'badge', why: 'a shirt-front is on the chest — the badge has a back emblem' },
  laserEye: { partner: 'visor', why: 'an eye is on the face — the visor band is its glow round the head' },
  exhaust: { partner: 'visor', why: 'a flame burns under the thrusters, behind — the visor reads in front' },
  // Slice 4: on a PROPORTIONED head (12 px tall at the table view, where the
  // chibi's was half the figure) a patch is a face detail like a tie — it reads
  // from the front, and Fury's long black coat carries him from behind and above.
  eyepatch: { partner: 'coat', why: 'a patch is on the face — the long black coat carries Fury from behind' },
  // D143's re-check: the thrusters are on the Doombot's BACK. With the opponent's
  // Doombot facing you now, from the far seat they are 26 px of pack behind its
  // body; the visor band — its glow round the head — carries it from the front.
  jetpack: { partner: 'visor', why: 'thrusters are on the back — the visor band reads in front (D143)' },
  // Lane BODIES: Peggy's waves are UNDER her hat — from the front and above the
  // brim hides them, from behind they are her nape; her sidearm is in her right
  // hand, pointed at the floor in front of her — the red hat carries her from both.
  hairWaves: { partner: 'hat', why: 'waves under a hat show at the nape — the hat carries Peggy from the front' },
  sidearm: { partner: 'hat', why: 'a pistol in the hand, pointed down in front — the red hat carries Peggy from behind' },
  // The lanes' merge (Lane BODIES on Lane LOOK): D143 turned the seats round —
  // the near seat (`you`) now sees your figures' BACKS, the far seat (`opp`) the
  // opponent's FRONTS — and the ink's line takes a small prop's edge. Three BODIES
  // props became details there. Each is measured (paint after the ink, the fewest
  // over stance and rank position, near / far), each names the side it reads on
  // and the partner that carries the card on the side it does not, and the test
  // above holds the partner to the full bar on that side:
  //
  // - `shield` reads from the FRONT, and is one-sided by nature: Peggy holds it
  //   before her in her `ready` (D156), so from behind her body covers it —
  //   1 / 127 px. From BEHIND the red hat carries her (318 / 217).
  shield: { partner: 'hat', why: 'front: a shield held before her in her ready; back: the red hat carries Peggy (D143, at merge)' },
  // - `hairParted` reads from BEHIND (its crown, 86 px), and from the FRONT is a
  //   fringe under the brow (40 px, under 48). It is the agent body's own hair
  //   (`BODY_HAIR`: it names no card), and from the FRONT the squad's three heads
  //   carry the Agents (994 / 672). Hair is not one-sided by nature, so this row
  //   is a measurement, not a law: PLAN.md's Lane BODIES follow-up 29.
  hairParted: { partner: 'squad', why: "back: the parted crown; front: a fringe — the squad's three heads carry the Agents (D143, at merge; PLAN BODIES 29)" },
  // - `hairBob` reads from BEHIND (56 px) and from the FRONT is a fringe on
  //   Wasp's half-height body (17 px); from the FRONT her wings carry her (347 /
  //   212). The same measurement, not a law: follow-up 29.
  hairBob: { partner: 'wings', why: "back: the bob; front: a fringe on her half-height body — the wings carry Wasp (D143, at merge; PLAN BODIES 29)" },
  // Villain identity (D221): a mask is a FACE — Doom's iron plate, Kang's, the
  // skull on Crossbones' balaclava — and from behind the cowl it is worn under
  // (the hood, the helm, the balaclava) carries the card.
  // The fix pass (D232): the Knight of Wundagore's lion face is a mask under a
  // MANE, and from behind the mane carries it as the cowl carries a hooded face.
  mask: {
    partner: ['hairCowl', 'hairLong'],
    why: "a mask is on the face — from behind, the cowl over it carries Doom, Kang and Crossbones (D221), and the Knight of Wundagore's mane its lion face (D232)",
  },
  // …and Doom wears a cloak over a tunic: from the front the cloak is behind him
  // (13 px) and from behind the tunic is under it (31) — so each is a detail of
  // HIS, carried by the other side's: the hood from the front, the cloak from
  // behind. Every other wearer's cloak and coat read from both seats (D221), and
  // `only` holds them to it (the fix pass: the rows first exempted every wearer).
  // More villain identity (D231): the Masters of Evil's leader wears Zemo's cloak,
  // and a squad's leader is drawn smaller to fit three bodies in one slot — so from
  // the front his cloak shows 46 px behind him, and his purple hood carries him.
  cape: {
    partner: 'hairCowl',
    why: "a cloak hangs down the back — from the front Doom's hood carries him, and Zemo's the Masters of Evil (D221, D231)",
    only: ['Doctor Doom', 'The Masters of Evil'],
  },
  coatTails: { partner: 'cape', why: "Doom's tunic is under his cloak from behind — the cloak carries him there (D221)", only: ['Doctor Doom'] },
};

/**
 * **Lane BODIES — the props that name NO card**, and so are not held to the
 * identity bar at all: the face is on every person (D158). It has its own test
 * below, from the views it is FOR.
 */
const GENERIC: Readonly<Record<string, string>> = {
  face: 'on every person — it identifies no card; `traits: the face reads …` measures it',
  facePatched: 'the face under an eyepatch — the eyepatch is the identity, and is held to the bar',
  faceGrit: 'the face in grit (D165): an expression of the stance, not of the card',
  facePatchedGrit: 'the patched face in grit (D165)',
};

/**
 * **The seat whose figures the table view sees from BEHIND** — derived from
 * `seatFacingY`, never typed: a front is `FIGURE_FRONT_Z · (sin f, cos f)` and
 * the table view looks from +Z, so a seat whose front points to −Z shows it its
 * back. Since D143 it is `you`.
 */
const BEHIND_SEAT: 'you' | 'opp' = Math.cos(seatFacingY('you')) * FIGURE_FRONT_Z < 0 ? 'you' : 'opp';

/** The deck's own cards, from its `.dck` — never a list typed here. */
function deckNames(): string[] {
  const text = readFileSync(fileURLToPath(new URL('../../decks/pacho-shield.dck', import.meta.url)), 'utf8');
  const out: string[] = [];
  let main = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('[')) main = line.trim() === '[main]';
    const m = main ? /^\d+\s+([^|]+?)(?:\|.*)?$/.exec(line.trim()) : null;
    if (m !== null) out.push(m[1]!);
  }
  return out;
}

/** The first face-up battlefield copy of each name in the corpus. */
function corpusCards(): Map<string, AnyCard> {
  const out = new Map<string, AnyCard>();
  for (const { state } of FRAMES) {
    for (const player of state.board?.players ?? []) {
      for (const card of player.zones.battlefield.cards) {
        const name = isHidden(card) ? undefined : (card as { name?: string; faceDown?: boolean }).name;
        if (name !== undefined && !out.has(name) && (card as { faceDown?: boolean }).faceDown !== true) out.set(name, card);
      }
    }
  }
  return out;
}

const SEATS = ['you', 'opp'] as const;

/** One deck card posed on its own, on one seat — alone at the centre, or at the end of a five-card rank. */
function soloPose(card: AnyCard, filler: AnyCard, seat: 'you' | 'opp', tapped: boolean, edge: boolean) {
  const controller = seat === 'you' ? 0 : 1;
  const mine = [onBattlefield(card, 500, controller, { tapped })];
  if (edge) for (let i = 1; i <= 4; i++) mine.push(onBattlefield(filler, 600 + i, controller));
  const state = twoSeatState(seat === 'you' ? mine : [], seat === 'opp' ? mine : []);
  return posesOf(state).get(500);
}

test('traits: every deck card’s identity props reach the screen from the table view, on BOTH seats (second verification pass)', async () => {
  const library = await loadLibrary();
  const cards = corpusCards();
  const filler = cards.get('Soldier Token');
  assert.ok(filler !== undefined);
  const table = cameraAt(VIEW_BY_ID.table.pose);
  // name → kind → seat → the fewest pixels over the stances and rank positions:
  // the paint left after the ink (the bar), and what the raster saw before it.
  const least = new Map<string, Map<string, Record<'you' | 'opp', number>>>();
  const bare = new Map<string, Map<string, Record<'you' | 'opp', number>>>();
  const dots = new Map<string, Map<string, Record<'you' | 'opp', number>>>();
  let inkedTotal = 0;
  let dottedTotal = 0;
  let pixelsTotal = 0;
  let chestOnlyFromBehind = Number.POSITIVE_INFINITY;
  let checked = 0;
  // Villain identity (D221): the Doom Legion's creatures and tokens too — each
  // from the corpus where it stands on the table, else from its facts.
  const villains = villainNames().filter((name) => !deckNames().includes(name));
  for (const name of [...deckNames(), ...villains]) {
    const card = cards.get(name) ?? (villains.includes(name) && OFF_THE_TABLE[name] !== undefined ? factCard(name) : undefined);
    if (card === undefined) continue;
    for (const seat of SEATS) {
      for (const tapped of [false, true]) {
        for (const edge of [false, true]) {
          const pose = soloPose(card, filler, seat, tapped, edge);
          if (pose === undefined || pose.props.length === 0 || pose.silhouette !== null) continue;
          const layers = figureLayers(pose, library);
          const groups = kindGroups(layers);
          const seen = comicVisibility(table, layers, { ...groups, 'badge (chest only)': groups['badge']?.slice(0, 1) ?? [] });
          const rowOf = (into: Map<string, Map<string, Record<'you' | 'opp', number>>>, kind: string): Record<'you' | 'opp', number> => {
            const kinds = into.get(name) ?? new Map<string, Record<'you' | 'opp', number>>();
            into.set(name, kinds);
            const row = kinds.get(kind) ?? { you: Number.POSITIVE_INFINITY, opp: Number.POSITIVE_INFINITY };
            kinds.set(kind, row);
            return row;
          };
          for (const prop of pose.props) {
            const got = seen.get(prop.kind);
            const px = got?.pixels ?? 0;
            const paint = px - (got?.inked ?? 0);
            const row = rowOf(least, prop.kind);
            row[seat] = Math.min(row[seat], paint);
            const raw = rowOf(bare, prop.kind);
            raw[seat] = Math.min(raw[seat], px);
            const dotRow = rowOf(dots, prop.kind);
            dotRow[seat] = Math.min(dotRow[seat], got?.dotted ?? 0);
            pixelsTotal += px;
            inkedTotal += got?.inked ?? 0;
            dottedTotal += got?.dotted ?? 0;
            checked += 1;
          }
          if (name === 'Agent Phil Coulson' && seat === BEHIND_SEAT) {
            chestOnlyFromBehind = Math.min(chestOnlyFromBehind, seen.get('badge (chest only)')?.pixels ?? 0);
          }
        }
      }
    }
  }
  const lines: string[] = [];
  const failures: string[] = [];
  for (const [name, kinds] of least) {
    for (const [kind, row] of kinds) {
      if (GENERIC[kind] !== undefined) continue;
      const raw = bare.get(name)?.get(kind);
      const dot = dots.get(name)?.get(kind);
      lines.push(
        `  ${name.padEnd(30)} ${kind.padEnd(9)} you ${String(row.you).padStart(5)} px   opp ${String(row.opp).padStart(5)} px` +
          `   (before the ink ${String(raw?.you ?? 0)} / ${String(raw?.opp ?? 0)}; on a halftone dot ${String(dot?.you ?? 0)} / ${String(dot?.opp ?? 0)})`,
      );
      const exempt = ONE_SIDED[kind];
      const oneSided = exempt !== undefined && (exempt.only === undefined || exempt.only.includes(name)) ? exempt : undefined;
      if (oneSided !== undefined && Math.max(row.you, row.opp) < IDENTITY_MIN_PX / 2) {
        failures.push(`${name}'s ${kind} does not show on its own side either (${String(Math.max(row.you, row.opp))} px)`);
      }
      /** The bar for a (card, kind, seat): 48, or a known shortfall's floor. */
      const barOf = (k: string, seat: 'you' | 'opp'): number => {
        const known = SHORTFALL[`${name}/${k}`];
        return known !== undefined && known.seat === seat ? known.floor : IDENTITY_MIN_PX;
      };
      const known = SHORTFALL[`${name}/${kind}`];
      if (known !== undefined && row[known.seat] >= IDENTITY_MIN_PX) {
        failures.push(`${name}'s ${kind} now shows ${String(row[known.seat])} px from the ${known.seat} seat — remove its SHORTFALL row`);
      }
      for (const seat of SEATS) {
        if (row[seat] >= barOf(kind, seat)) continue;
        if (oneSided === undefined) {
          failures.push(`${name}'s ${kind} shows ${String(row[seat])} px from the ${seat} seat`);
          continue;
        }
        // A one-sided detail may hide on a seat iff a partner carries the card there.
        const partners = typeof oneSided.partner === 'string' ? [oneSided.partner] : oneSided.partner;
        const carried = partners.some((k) => (kinds.get(k)?.[seat] ?? 0) >= barOf(k, seat));
        if (!carried) {
          const shown = partners.map((k) => `${k} ${String(kinds.get(k)?.[seat] ?? 0)} px`).join(', ');
          failures.push(`${name}'s ${kind} is hidden from the ${seat} seat and its partner shows ${shown} (${oneSided.why})`);
        }
      }
    }
  }
  console.log(
    `traits: identity props' PAINT on screen in the comic look (visible, not under the ink), table view 1600 × 1000, ` +
      `the fewest pixels over standing/kneeling and centre/edge ` +
      `(≥ ${String(IDENTITY_MIN_PX)} on both seats; one-sided: ${Object.entries(ONE_SIDED).map(([k, v]) => (v.only === undefined ? k : `${k} (${v.only.join(', ')})`)).join(', ')})\n${lines.join('\n')}\n` +
      `  over every measurement: ${String(pixelsTotal)} px visible, ${String(inkedTotal)} under the ink, ${String(dottedTotal)} on a halftone dot\n` +
      `  known shortfalls: ${Object.entries(SHORTFALL).map(([k, v]) => `${k} on the ${v.seat} seat (floor ${String(v.floor)}: ${v.why})`).join('; ')}\n` +
      `  Coulson's chest badge alone, seen from behind (the ${BEHIND_SEAT} seat): ${String(chestOnlyFromBehind)} px`,
  );
  assert.ok(checked > 150, `only ${String(checked)} prop measurements`);
  // The controls: the ink and the screen really are modelled (a raster that
  // never inked or dotted a pixel would pass this test for the wrong reason).
  assert.ok(inkedTotal > 0 && inkedTotal < pixelsTotal / 2, `the ink took ${String(inkedTotal)} of ${String(pixelsTotal)} px`);
  assert.ok(dottedTotal > 0, 'no identity-prop pixel fell on a halftone dot — the screen is not modelled');
  assert.equal(Object.keys(SHORTFALL).length, 0, 'a new known shortfall is a decision: say why in its row, and in PLAN.md');
  assert.ok(least.size >= 11, `only ${String(least.size)} deck cards carried props`);
  assert.deepEqual(failures, []);
  // The negative control: slice 3's badge — on the chest only — is not on the
  // screen at all from behind. The back emblem is what makes that row pass.
  assert.ok(chestOnlyFromBehind < IDENTITY_MIN_PX, `the chest badge alone shows ${String(chestOnlyFromBehind)} px from behind — this test cannot tell`);
});

/** The Agents' heads from the table view: the leader's own and each follower's. */
function squadHeads(layers: readonly Layer[]): Array<{ pixels: number; centre: [number, number] | null }> {
  const table = cameraAt(VIEW_BY_ID.table.pose);
  // Lane BODIES: the leader's head is its bald head plus its hair and face props.
  const leader = ['head', ...layers.filter((l) => /^(hair[A-Z]\w*|face)@/.test(l.tag)).map((l) => l.tag)];
  const groups: Record<string, string[]> = { leader };
  for (const layer of layers) if (layer.tag.startsWith('squad@') && layer.tag.endsWith(':head')) groups[layer.tag] = [layer.tag];
  const seen = visibility(table, layers, groups);
  return Object.keys(groups).map((key) => seen.get(key)!);
}

/**
 * The fewest visible pixels of any head, and the narrowest SIDEWAYS gap between
 * two head centres — counted as 0 for a pair further apart up the screen than
 * across it, because two heads one above the other are one agent with a doubled
 * outline from this camera (the verifier's words for slice 3's squad, whose
 * followers stood along the camera's axis and projected just above the leader).
 */
function headStats(heads: ReadonlyArray<{ pixels: number; centre: [number, number] | null }>): { fewest: number; closest: number } {
  let fewest = Number.POSITIVE_INFINITY;
  let closest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < heads.length; i++) {
    fewest = Math.min(fewest, heads[i]!.pixels);
    for (let j = i + 1; j < heads.length; j++) {
      const a = heads[i]!.centre;
      const b = heads[j]!.centre;
      const across = a === null || b === null ? 0 : Math.abs(a[0] - b[0]);
      const up = a === null || b === null ? 0 : Math.abs(a[1] - b[1]);
      closest = Math.min(closest, across >= up ? across : 0);
    }
  }
  return { fewest, closest };
}

/**
 * Three heads, each at least this much of it on screen … Slice 4: a
 * PROPORTIONED head is about 12 px tall at the table view (the chibi's was half
 * its figure, and this bar was 150) — measured, a lone agent's head is 139–159 px
 * and a follower's (×0.78) 80–96 px; the bar is set under the smallest.
 */
const SQUAD_HEAD_MIN_PX = 60;
/**
 * … side by side, no two centres closer than this ACROSS the screen, at 1600 ×
 * 1000. Slice 4 raised it from 15: a proportioned head is ~11 px wide, and slice
 * 3's first formation — the control below — put two of them 17 px apart once.
 */
const SQUAD_HEADS_APART_PX = 20;

test('traits: the Agents of S.H.I.E.L.D. are three separate heads from the table view — on both seats (second verification pass)', async () => {
  const library = await loadLibrary();
  const cards = corpusCards();
  const agents = cards.get('Agents of S.H.I.E.L.D.');
  const filler = cards.get('Soldier Token');
  assert.ok(agents !== undefined && filler !== undefined);
  // The squad's baked follower, to stand slice 3's first formation as the control.
  const field = new PropField();
  field.setLibrary(library, MODELS);
  const follower = field.group.children.find((o) => o.name === 'props:squad:agent') as THREE.InstancedMesh | undefined;
  assert.ok(follower !== undefined, 'no baked squad follower');

  const lines: string[] = [];
  const failures: string[] = [];
  let controlFailed = 0;
  for (const seat of SEATS) {
    for (const tapped of [false, true]) {
      for (const edge of [false, true]) {
        const pose = soloPose(agents, filler, seat, tapped, edge);
        assert.ok(pose !== undefined && pose.swarm === 2 && pose.formation === 'squad');
        const heads = squadHeads(figureLayers(pose, library));
        assert.equal(heads.length, 3, 'three heads: the leader and two followers');
        const now = headStats(heads);
        lines.push(
          `  ${seat} ${tapped ? 'kneeling' : 'standing'} ${edge ? 'edge  ' : 'centre'}  heads ` +
            heads.map((h) => `${String(h.pixels)} px @ ${h.centre?.map((v) => v.toFixed(0)).join(',') ?? '-'}`).join('  ') +
            `  · narrowest sideways gap ${now.closest.toFixed(1)} px`,
        );
        if (now.fewest < SQUAD_HEAD_MIN_PX) failures.push(`${seat}: a squad head shows only ${String(now.fewest)} px`);
        if (now.closest < SQUAD_HEADS_APART_PX) {
          failures.push(`${seat}: two squad heads are ${now.closest.toFixed(1)} px apart across the screen (0 = stacked)`);
        }

        // **The control**: slice 3's first squad — followers 0.16 aside and 0.32
        // behind at 0.8, at the height its narrower span clamped it to.
        const ratio = MODELS.models['agent']!.width / MODELS.models['agent']!.height;
        const oldHeight = fitHeight(FIGURE_HEIGHT, 2 * Math.max(ratio / 2, 0.16 + (0.8 * ratio) / 2));
        const old = { ...pose, height: oldHeight };
        const rig = rigOf(old, library)!;
        const root = new THREE.Matrix4().compose(
          new THREE.Vector3(...old.position),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), old.facingY),
          new THREE.Vector3(oldHeight, oldHeight, oldHeight),
        );
        const layers: Layer[] = [...bodyLayers(rig)];
        [-1, 1].forEach((side, i) => {
          const member = new THREE.Matrix4().compose(
            new THREE.Vector3(side * 0.16, 0, -0.32),
            new THREE.Quaternion(),
            new THREE.Vector3(0.8, 0.8, 0.8),
          );
          layers.push(
            ...geometryLayers(follower.geometry, root.clone().multiply(member), `squad@${String(i)}`, true, true, headFromOf('agent')),
          );
        });
        const oldHeads = squadHeads(layers);
        const before = headStats(oldHeads);
        lines.push(
          `    slice 3's first: ` +
            oldHeads.map((h) => `${String(h.pixels)} px @ ${h.centre?.map((v) => v.toFixed(0)).join(',') ?? '-'}`).join('  ') +
            `  · narrowest sideways gap ${before.closest.toFixed(1)} px`,
        );
        if (before.fewest < SQUAD_HEAD_MIN_PX || before.closest < SQUAD_HEADS_APART_PX) controlFailed += 1;
      }
    }
  }
  field.dispose();
  console.log(
    `traits: the Agents' three heads from the table view (≥ ${String(SQUAD_HEAD_MIN_PX)} px each, side by side ≥ ${String(SQUAD_HEADS_APART_PX)} px apart; ` +
      `wedge ±${String(SQUAD_OFFSET_X)}, ${String(SQUAD_OFFSET_Z)} back, members ×${String(SQUAD_MEMBER)})\n${lines.join('\n')}\n` +
      `  slice 3's first squad fails the same test in ${String(controlFailed)} of 8 cases`,
  );
  assert.deepEqual(failures, []);
  assert.equal(controlFailed, 8, 'the old formation passes somewhere — this test would not have caught it');
});

test('traits: lane BODIES’ kinds are cheap — a hairstyle 200–600 triangles an instance, the face and a skirt panel far less (D157–D159)', () => {
  const lines: string[] = [];
  const budget: Array<[Parameters<typeof buildKindGeometry>[0], number, number]> = [
    ['hairCrop', 150, 600],
    ['hairBob', 150, 600],
    ['hairWaves', 150, 600],
    ['hairBun', 150, 600],
    // Villain identity (D221): the cowl is a hairstyle's shell and a mantle.
    ['hairCowl', 150, 600],
    ['face', 40, 150],
    ['facePatched', 30, 120],
    ['faceGrit', 40, 150],
    ['facePatchedGrit', 30, 120],
    ['coatTails', 8, 64],
    ['cape', 8, 64],
    ['coat', 60, 240],
    ['sidearm', 20, 100],
    // More villain identity (D231): the spear, the kit's one new kind for the three
    // AI decks — a shaft, a binding, a leaf blade and a foot spike.
    ['spear', 30, 120],
  ];
  for (const [kind, min, max] of budget) {
    // What the prop field draws: one sheet (its material is DoubleSide).
    const geometry = buildKindGeometry(kind, { lining: false });
    assert.ok(geometry !== null, `${kind} has no procedural geometry`);
    const triangles = geometry.getAttribute('position').count / 3;
    lines.push(`${kind} ${String(triangles)}`);
    assert.ok(triangles >= min && triangles <= max, `${kind}: ${String(triangles)} triangles, outside [${String(min)}, ${String(max)}]`);
  }
  // The two carved styles are the pack's own meshes, baked at load: null here.
  assert.equal(buildKindGeometry('hairParted'), null);
  assert.equal(buildKindGeometry('hairLong'), null);
  console.log(`traits: lane BODIES' kinds, triangles an instance — ${lines.join(' · ')}`);
});

test('traits: a cloth kind carries its LINING for a renderer that culls back faces — the duelists’ bake — and the field draws one sheet (D163)', () => {
  for (const kind of ['coatTails', 'cape'] as const) {
    const sheet = buildKindGeometry(kind, { lining: false })!;
    const lined = buildKindGeometry(kind)!;
    const n = sheet.getAttribute('position').count;
    assert.equal(lined.getAttribute('position').count, n * 2, `${kind}: the lining is not a second sheet`);
    const p = lined.getAttribute('position');
    const q = lined.getAttribute('normal');
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let t = 0; t < n; t += 3) {
      // The lining's triangle t is the sheet's, wound the other way (a, c, b), inset along the normal, facing in.
      for (const [k, src] of [[0, 0], [1, 2], [2, 1]] as const) {
        a.fromBufferAttribute(sheet.getAttribute('position'), t + src);
        b.fromBufferAttribute(sheet.getAttribute('normal'), t + src);
        c.fromBufferAttribute(p, n + t + k);
        assert.ok(c.distanceTo(a.clone().addScaledVector(b, -0.0025)) < 1e-6, `${kind}: lining vertex ${String(t + k)} is not the sheet's, inset`);
        c.fromBufferAttribute(q, n + t + k);
        assert.ok(c.distanceTo(b.clone().negate()) < 1e-6, `${kind}: lining normal ${String(t + k)} does not face in`);
      }
      // The winding really is reversed: the geometric normal of the lining's triangle opposes the sheet's.
      const face = (attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, i: number): THREE.Vector3 => {
        const v0 = new THREE.Vector3().fromBufferAttribute(attr, i);
        const v1 = new THREE.Vector3().fromBufferAttribute(attr, i + 1);
        const v2 = new THREE.Vector3().fromBufferAttribute(attr, i + 2);
        return v1.sub(v0).cross(v2.sub(v0));
      };
      assert.ok(face(sheet.getAttribute('position'), t).dot(face(p, n + t)) < 0, `${kind}: lining triangle ${String(t / 3)} is wound the same way`);
    }
  }
  // Every other kind is one sheet either way (the helmet, the hat, the face — solids and details).
  for (const kind of ['coat', 'hat', 'face', 'hairBob', 'eyepatch'] as const) {
    assert.equal(buildKindGeometry(kind)!.getAttribute('position').count, buildKindGeometry(kind, { lining: false })!.getAttribute('position').count, `${kind} grew a lining`);
  }
  // The field asks for the sheet: its built coat is the unlined count.
  const field = new PropField();
  const mesh = field.group.children.find((c) => c.name === 'props:coatTails') as THREE.InstancedMesh | undefined;
  assert.ok(mesh !== undefined);
  assert.equal(mesh.geometry.getAttribute('position').count, buildKindGeometry('coatTails', { lining: false })!.getAttribute('position').count, 'the prop field draws the lined coat');
  field.dispose();
});

test('traits: a face sets its jaw — grit while the figure kneels, attacks or blocks, neutral at rest, over the corpus (D165)', () => {
  assert.equal(expressionOf('ready'), 'neutral');
  assert.equal(expressionOf('sick'), 'neutral');
  for (const stance of ['crouch', 'attacking', 'blocking'] as const) assert.equal(expressionOf(stance), 'grit');
  const seen = { neutral: 0, grit: 0 };
  for (const { file, state } of FRAMES) {
    for (const pose of figurePose(layout(state), state.board?.combat ?? null, DATA, { models: MODELS }).values()) {
      const faces = pose.props.filter((p) => /^face/.test(p.kind)).map((p) => p.kind);
      if (pose.anonymous) {
        assert.deepEqual(faces, [], `${file}: an anonymous figure has a face`);
        continue;
      }
      if (faces.length === 0) continue;
      assert.equal(faces.length, 1, `${file}: two faces on one figure`);
      const grit = expressionOf(pose.stance) === 'grit';
      assert.equal(/Grit$/.test(faces[0]!), grit, `${file}: a ${pose.stance} figure wears ${faces[0]!}`);
      seen[grit ? 'grit' : 'neutral'] += 1;
    }
  }
  console.log(`traits: faces over the corpus — ${String(seen.neutral)} neutral, ${String(seen.grit)} in grit`);
  assert.ok(seen.grit > 100 && seen.neutral > 100, 'the corpus did not exercise both expressions');
});

// ---------------------------------------------------------------------------
// Lane BODIES' fix pass — the drape rule (D162)
// ---------------------------------------------------------------------------

/** The first cut's skirt (D159): each link rode its leg bone, the lower one the CALF. The negative control. */
const FIRST_CUT_SKIRT = ((): readonly PropAnchor[] => {
  const rad = (d: number): number => (d * Math.PI) / 180;
  const waist = [0, 0.525, -0.012] as const;
  const knee = [0, 0.302, -0.012] as const;
  const upper = [1, 0.84, 1] as const;
  const lower = [1.27, 0.5, 1.27] as const;
  const body = anchorsOf('coatTails', 'human').slice(0, 5);
  return [
    ...body,
    { joint: 'thigh_l', at: waist, turn: [0, rad(46), 0], size: upper },
    { joint: 'calf_l', at: knee, turn: [0, rad(46), 0], size: lower },
    { joint: 'thigh_l', at: waist, turn: [0, rad(118), 0], size: upper },
    { joint: 'calf_l', at: knee, turn: [0, rad(118), 0], size: lower },
    { joint: 'pelvis', at: waist, turn: [0, rad(180), 0], size: [1.04, 1.18, 1.04] },
    { joint: 'thigh_r', at: waist, turn: [0, rad(-118), 0], size: upper },
    { joint: 'calf_r', at: knee, turn: [0, rad(-118), 0], size: lower },
    { joint: 'thigh_r', at: waist, turn: [0, rad(-46), 0], size: upper },
    { joint: 'calf_r', at: knee, turn: [0, rad(-46), 0], size: lower },
  ];
})();

/** Which skirt anchors are the LOWER links (the calf's, in the first cut): the same list positions in both. */
const LOWER_LINKS = new Set([6, 8, 11, 13]);

interface Drape {
  /** The steepest a lower link leans from hanging straight down, degrees. */
  lowerTilt: number;
  /** The farthest any skirt panel's outer hem reaches from the pelvis's vertical, in figure heights. */
  reach: number;
  where: string;
  reachWhere: string;
}

/** Every skirt panel of one figure through every sampled clip frame: the worst tilt and reach. */
async function drapeOf(card: AnyCard, filler: AnyCard): Promise<Drape> {
  const library = await loadLibrary();
  const pose = soloPose(card, filler, 'you', false, false)!;
  const model = library.get(pose.modelId!)!;
  const still: import('../src/arena/scene/props.ts').PropOffsetSource = {
    offsetOf: () => ({ dx: 0, dy: 0, dz: 0, scale: 1, opacity: 1, dissolve: 0, glow: 0, dRotY: 0 }),
    clipOf: () => null,
  };
  const worst: Drape = { lowerTilt: 0, reach: 0, where: '', reachWhere: '' };
  const axis = new THREE.Vector3();
  const hem = new THREE.Vector3();
  const pelvis = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const { clipFor } = await import('../src/arena/scene/models.ts');
  for (const key of ['idle', 'crouch', 'attack', 'block', 'hit', 'summon']) {
    const clip = clipFor(model, key, pose.clips[key]);
    if (clip === null) continue;
    for (let step = 0; step <= 10; step++) {
      const rig = rigOf(pose, library)!;
      rig.mixer.stopAllAction();
      const action = rig.mixer.clipAction(clip);
      action.play();
      action.time = (step / 10) * clip.duration;
      action.setEffectiveWeight(1);
      rig.mixer.update(0);
      rig.root.updateMatrixWorld(true);
      // Reach is measured from the body's own axis — its pelvis — not the stand
      // point: a lunge carries the whole body forward, and that is not a flap.
      rig.root.getObjectByProperty('isBone', true)?.parent?.traverse((node) => {
        if (node.name.replace(/_[1-9]\d*$/, '') === 'pelvis') node.getWorldPosition(pelvis);
      });
      const field = new PropField();
      field.setLibrary(library, MODELS);
      field.commit(new Map([[pose.cardId, pose]]), new Map([[pose.cardId, rig]]), MODELS);
      field.bind(still, 0);
      const mesh = field.group.children.find((c) => c.name === 'props:coatTails') as THREE.InstancedMesh | undefined;
      assert.ok(mesh !== undefined && mesh.count === 14, `${key}: the coat has ${String(mesh?.count)} panels, not 14`);
      for (let i = 5; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        const where = `${key}@${(step / 10).toFixed(1)} panel ${String(i)}`;
        if (LOWER_LINKS.has(i)) {
          axis.set(0, -1, 0).transformDirection(matrix);
          const tilt = (Math.acos(Math.max(-1, Math.min(1, -axis.y))) * 180) / Math.PI;
          if (tilt > worst.lowerTilt) Object.assign(worst, { lowerTilt: tilt, where });
        }
        hem.set(0, -COAT_PANEL.length, COAT_PANEL.hem).applyMatrix4(matrix);
        const reach = Math.hypot(hem.x - pelvis.x, hem.z - pelvis.z) / pose.height;
        if (reach > worst.reach) {
          worst.reach = reach;
          worst.reachWhere = where;
        }
      }
      field.dispose();
    }
  }
  return worst;
}

/** How far a lower link may lean, and a hem may reach — set between the kit (measured) and the first cut. */
const DRAPE_MAX_LOWER_TILT = 30;
const DRAPE_MAX_REACH = 0.42;

test('traits: the coat DRAPES — no skirt link lies flat or flies out, at rest in any stance or through a whole lunge (D162; the first cut fails it)', async () => {
  const cards = corpusCards();
  const filler = cards.get('Soldier Token')!;
  const kit = PROP_KIT.coatTails.anchors as Record<string, readonly PropAnchor[] | undefined>;
  const committed = kit['human']!;
  const lines: string[] = [];
  for (const name of ['Nick Fury, Spymaster', 'Bold Biochemist']) {
    const card = cards.get(name);
    assert.ok(card !== undefined, `${name} is not in the corpus`);
    const drape = await drapeOf(card, filler);
    kit['human'] = FIRST_CUT_SKIRT;
    let control: Drape;
    try {
      control = await drapeOf(card, filler);
    } finally {
      kit['human'] = committed;
    }
    lines.push(
      `  ${name.padEnd(22)} the kit: lower links ≤ ${drape.lowerTilt.toFixed(0)}° (${drape.where}), hem reach ≤ ${drape.reach.toFixed(2)} (${drape.reachWhere})\n` +
        `  ${''.padEnd(22)} the first cut: ≤ ${control.lowerTilt.toFixed(0)}° (${control.where}), ≤ ${control.reach.toFixed(2)} (${control.reachWhere})`,
    );
    assert.ok(drape.lowerTilt <= DRAPE_MAX_LOWER_TILT, `${name}: a lower link leans ${drape.lowerTilt.toFixed(0)}° (${drape.where})`);
    assert.ok(drape.reach <= DRAPE_MAX_REACH, `${name}: a hem reaches ${drape.reach.toFixed(2)} of a height out (${drape.reachWhere})`);
    assert.ok(
      control.lowerTilt > DRAPE_MAX_LOWER_TILT || control.reach > DRAPE_MAX_REACH,
      `${name}: the first cut's calf-riding skirt passes too — this test cannot see the sliver`,
    );
  }
  console.log(`traits: the drape (idle, crouch, attack, block, hit, summon, 11 frames each)\n${lines.join('\n')}`);
});

/**
 * **The coat's FIT at rest** (the second fix pass, D163): every body and skirt
 * panel's hem, as the prop field draws it on a figure standing at rest, within
 * `COAT_FIT` of a height of the body's own axis (its pelvis). The verifier's
 * second round read D162's coat as "a wide bell that hides his legs" and "a huge
 * white bell … that swallows the figure": its lower links' hems stood 0.26 out
 * round hips 0.08 wide. The control is that bell — every panel 1.45× wider, D162's
 * lower hem over D163's — swapped into the kit for the run; it must fail.
 */
const COAT_FIT = 0.2;

async function restReachOf(card: AnyCard, filler: AnyCard): Promise<{ reach: number; front: number }> {
  const library = await loadLibrary();
  const pose = soloPose(card, filler, 'you', false, false)!;
  const still: import('../src/arena/scene/props.ts').PropOffsetSource = {
    offsetOf: () => ({ dx: 0, dy: 0, dz: 0, scale: 1, opacity: 1, dissolve: 0, glow: 0, dRotY: 0 }),
    clipOf: () => null,
  };
  const rig = rigOf(pose, library)!;
  rig.root.updateMatrixWorld(true);
  const pelvis = new THREE.Vector3();
  rig.root.traverse((node) => {
    if (node.name.replace(/_[1-9]\d*$/, '') === 'pelvis') node.getWorldPosition(pelvis);
  });
  const field = new PropField();
  field.setLibrary(library, MODELS);
  field.commit(new Map([[pose.cardId, pose]]), new Map([[pose.cardId, rig]]), MODELS);
  field.bind(still, 0);
  const mesh = field.group.children.find((c) => c.name === 'props:coatTails') as THREE.InstancedMesh | undefined;
  assert.ok(mesh !== undefined && mesh.count === 14);
  const matrix = new THREE.Matrix4();
  const hem = new THREE.Vector3();
  let reach = 0;
  // The front opening: the widest arc no panel covers within 90° of the figure's
  // front, measured round the pelvis at each panel's mid-height (the idle turns the
  // hips about 15°, so the opening is not centred on the stand's front — its WIDTH
  // is what a coat worn open has).
  const covered = new Array<boolean>(360).fill(false);
  const facing = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), pose.facingY);
  const angleOf = (v: THREE.Vector3): number => {
    const dx = v.x - pelvis.x;
    const dz = v.z - pelvis.z;
    return (Math.atan2(dx * facing.z - dz * facing.x, dx * facing.x + dz * facing.z) * 180) / Math.PI;
  };
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix);
    hem.set(0, -COAT_PANEL.length, COAT_PANEL.hem).applyMatrix4(matrix);
    reach = Math.max(reach, Math.hypot(hem.x - pelvis.x, hem.z - pelvis.z) / pose.height);
    const half = ((COAT_PANEL.arc / 2) * Math.PI) / 180;
    for (let k = 0; k <= 40; k++) {
      const a = -half + (2 * half * k) / 40;
      hem.set(Math.sin(a) * COAT_PANEL.hem, -COAT_PANEL.length / 2, Math.cos(a) * COAT_PANEL.hem).applyMatrix4(matrix);
      covered[(Math.round(angleOf(hem)) + 360) % 360] = true;
    }
  }
  let front = 0;
  let run = 0;
  for (let d = -90; d <= 90; d++) {
    run = covered[(d + 360) % 360] ? 0 : run + 1;
    front = Math.max(front, run);
  }
  field.dispose();
  return { reach, front };
}

test('traits: the coat FITS — at rest every panel hangs close round the body, open down the front (D163; the D162 bell fails it)', async () => {
  const cards = corpusCards();
  const filler = cards.get('Soldier Token')!;
  const kit = PROP_KIT.coatTails.anchors as Record<string, readonly PropAnchor[] | undefined>;
  const committed = kit['human']!;
  const bell = committed.map((a) => {
    const size = typeof a.size === 'number' ? ([a.size, a.size, a.size] as const) : a.size;
    return { ...a, size: [size[0] * 1.45, size[1], size[2] * 1.45] as const };
  });
  const lines: string[] = [];
  for (const name of ['Nick Fury, Spymaster', 'Bold Biochemist']) {
    const card = cards.get(name)!;
    const fit = await restReachOf(card, filler);
    kit['human'] = bell;
    let control: { reach: number; front: number };
    try {
      control = await restReachOf(card, filler);
    } finally {
      kit['human'] = committed;
    }
    lines.push(`  ${name.padEnd(22)} hem ≤ ${fit.reach.toFixed(3)} of a height from the pelvis, open ${fit.front.toFixed(0)}° down the front; the D162 bell ${control.reach.toFixed(3)}`);
    assert.ok(fit.reach <= COAT_FIT, `${name}: a hem stands ${fit.reach.toFixed(3)} of a height out at rest`);
    assert.ok(fit.front >= 16, `${name}: the coat is closed down the front (an opening of ${fit.front.toFixed(0)}°)`);
    assert.ok(control.reach > COAT_FIT, `${name}: the bell passes too (${control.reach.toFixed(3)}) — this test cannot see a bell`);
  }
  console.log(`traits: the coat's fit at rest\n${lines.join('\n')}`);
});

/**
 * **The yoke meets the coat's body with no LEDGE** (lane BODIES' third fix pass).
 * The verifier's third round read "a stepped ledge at the shoulder" on Doom's
 * cloak and, on the Bold Biochemist bent over his bench, "a separate grey panel
 * fanning out … a white arc beside his head": D163's yoke flared to 0.165 at its
 * hem over a body link 0.116 wide there, and a lean at the chest alone swung that
 * flare off the body. Measured as the prop field draws them at rest: every point
 * of the yoke's hem (its open front excepted), its horizontal distance from the
 * body link's axis less the body link's own radius at that height — positive is
 * a ledge standing out, negative the body link showing over the yoke. The control
 * is D163's cut, evaluated through the same matrices.
 */
const YOKE_LEDGE_MAX = 0.025;
const YOKE_LEDGE_MIN = -0.012;
type YokeCut = { length: number; top: number; hem: number; depth: readonly [number, number]; z: readonly [number, number]; anchorZ: number };
const D147_YOKE: YokeCut = { length: 0.16, top: 0.15, hem: 0.165, depth: [0.84, 0.84], z: [-0.005, -0.005], anchorZ: -0.005 };

async function yokeLedgeOf(card: AnyCard, filler: AnyCard, cuts: readonly YokeCut[]): Promise<Array<{ max: number; min: number; gap: number }>> {
  const library = await loadLibrary();
  const pose = soloPose(card, filler, 'you', false, false)!;
  const still: import('../src/arena/scene/props.ts').PropOffsetSource = {
    offsetOf: () => ({ dx: 0, dy: 0, dz: 0, scale: 1, opacity: 1, dissolve: 0, glow: 0, dRotY: 0 }),
    clipOf: () => null,
  };
  const rig = rigOf(pose, library)!;
  const field = new PropField();
  field.setLibrary(library, MODELS);
  field.commit(new Map([[pose.cardId, pose]]), new Map([[pose.cardId, rig]]), MODELS);
  field.bind(still, 0);
  const yoke = field.group.children.find((c) => c.name === 'props:coat') as THREE.InstancedMesh | undefined;
  const cloth = field.group.children.find((c) => c.name === 'props:coatTails') as THREE.InstancedMesh | undefined;
  assert.ok(yoke !== undefined && cloth !== undefined, 'the coat or its body is not drawn');
  const yokeMatrix = new THREE.Matrix4();
  yoke.getMatrixAt(0, yokeMatrix);
  const body = new THREE.Matrix4();
  cloth.getMatrixAt(0, body); // the body link's first panel: every one shares its axis
  const bodyScale = new THREE.Vector3().setFromMatrixScale(body);
  const inverse = body.clone().invert();
  const opening = (64 / 180) * Math.PI;
  const out: Array<{ max: number; min: number; gap: number }> = [];
  const point = new THREE.Vector3();
  for (const cut of cuts) {
    let max = Number.NEGATIVE_INFINITY;
    let min = Number.POSITIVE_INFINITY;
    let above = Number.NEGATIVE_INFINITY;
    for (let k = 0; k <= 60; k++) {
      const theta = opening / 2 + ((Math.PI * 2 - opening) * k) / 60;
      point.set(Math.sin(theta) * cut.hem, -cut.length, Math.cos(theta) * cut.hem * cut.depth[1] + cut.z[1] - cut.anchorZ);
      point.applyMatrix4(yokeMatrix).applyMatrix4(inverse);
      const radius = COAT_PANEL.top + (COAT_PANEL.hem - COAT_PANEL.top) * (-point.y / COAT_PANEL.length);
      const ledge = ((Math.hypot(point.x, point.z) - radius) * bodyScale.x) / pose.height;
      max = Math.max(max, ledge);
      min = Math.min(min, ledge);
      // Above the body link's top edge (y 0 in its own units) the yoke's hem is
      // not over the coat's body at all: the shirt shows between them.
      above = Math.max(above, (point.y * bodyScale.y) / pose.height);
    }
    out.push({ max, min, gap: above });
  }
  field.dispose();
  return out;
}

test('traits: the coat’s yoke meets its body with no ledge — standing, folded and bent over a bench (the third fix pass; D163’s flared yoke fails it)', async () => {
  const { YOKE_CUT } = await import('../src/arena/scene/props.ts');
  const cards = corpusCards();
  const filler = cards.get('Soldier Token')!;
  const lines: string[] = [];
  const measured: Array<[string, { max: number; min: number; gap: number }, { max: number; min: number; gap: number }]> = [];
  for (const name of ['Nick Fury, Spymaster', 'Bold Biochemist']) {
    const [cut, control] = await yokeLedgeOf(cards.get(name)!, filler, [YOKE_CUT, D147_YOKE]);
    measured.push([name, cut!, control!]);
    lines.push(
      `  ${name.padEnd(22)} the yoke's hem ${cut!.min.toFixed(3)}…${cut!.max.toFixed(3)} of a height off the body link, its highest point ${(-cut!.gap).toFixed(3)} below the body link's top; D163's ${control!.min.toFixed(3)}…${control!.max.toFixed(3)}`,
    );
  }
  console.log(`traits: the yoke's seam at rest\n${lines.join('\n')}`);
  for (const [name, cut, control] of measured) {
    assert.ok(cut.gap <= 0, `${name}: the yoke's hem rides ${cut.gap.toFixed(3)} of a height ABOVE the coat's body — a gap at the back`);
    assert.ok(cut.max <= YOKE_LEDGE_MAX, `${name}: the yoke's hem stands ${cut.max.toFixed(3)} of a height off the coat's body — a ledge`);
    assert.ok(cut.min >= YOKE_LEDGE_MIN, `${name}: the coat's body shows ${(-cut.min).toFixed(3)} of a height outside the yoke`);
    assert.ok(control.max > YOKE_LEDGE_MAX, `${name}: D163's flared yoke passes too (${control.max.toFixed(3)}) — this test cannot see a ledge`);
  }
});

test('traits: the drape rule is well-formed — a hanging panel follows a joint panel of its own kind, and every joint it names is on the rig (D162)', async () => {
  const library = await loadLibrary();
  const joints = new Set<string>();
  library.get('agent')!.source.traverse((node) => {
    if ((node as { isBone?: boolean }).isBone === true) joints.add(node.name.replace(/_[1-9]\d*$/, ''));
  });
  let follows = 0;
  let hangs = 0;
  for (const kind of [...PROP_KINDS] as PropKind[]) {
    const anchors = anchorsOf(kind, 'human');
    anchors.forEach((anchor, i) => {
      if (anchor.joint !== 'root' && anchor.joint !== 'stand') assert.ok(joints.has(anchor.joint), `${kind}[${String(i)}]: no joint ${anchor.joint}`);
      if (anchor.follow !== undefined) {
        follows += 1;
        assert.ok(joints.has(anchor.follow.joint), `${kind}[${String(i)}]: follows ${anchor.follow.joint}, which the rig lacks`);
        assert.ok(anchor.follow.weight > 0 && anchor.follow.weight < 1, `${kind}[${String(i)}]: a follow weight of ${String(anchor.follow.weight)}`);
        assert.equal(anchor.pose, undefined, `${kind}[${String(i)}]: follow with a posed anchor`);
      }
      if (anchor.hang !== undefined) {
        hangs += 1;
        assert.ok(kind === 'coatTails' || kind === 'cape', `${kind} hangs, and only a panel kind may (its hem is COAT_PANEL's)`);
        assert.ok(i > 0 && anchors[i - 1]!.joint !== 'root' && anchors[i - 1]!.joint !== 'stand', `${kind}[${String(i)}] hangs from nothing`);
        assert.ok(anchors[i - 1]!.hang === undefined, `${kind}[${String(i)}] hangs from a hanging panel`);
        assert.ok(anchor.hang > 0 && anchor.hang <= 1);
        assert.equal(anchor.pose, undefined);
      }
    });
  }
  assert.equal(follows, 6, 'the coat skirt follows its thighs at four panels, the cape at two');
  assert.equal(hangs, 4, 'the coat skirt has four hanging links');
});

/** One figure layout's instances, per kind, exactly as `PropField.bindPose` binds them. */
function instancesPerKind(poses: Iterable<FigurePose>): Map<string, number> {
  const out = new Map<string, number>();
  for (const pose of poses) {
    if (pose.anonymous) continue;
    for (const prop of pose.props) {
      const key = prop.kind === 'squad' ? `squad:${baseModelOf(pose.modelId) ?? ''}` : prop.kind;
      const n =
        prop.kind === 'swarmBee' || prop.kind === 'squad'
          ? pose.swarm
          : prop.kind === 'carrier'
            ? 1
            : anchorsOf(prop.kind, familyOf(pose.modelId, MODELS), pose.hair === null).length;
      out.set(key, (out.get(key) ?? 0) + n);
    }
  }
  return out;
}

test('traits: the prop field has room for every panel — a mirror’s four long coats fit one kind’s buffer (D162)', () => {
  // The corpus's worst frame, per kind and in all.
  let worstKind = { n: 0, where: '' };
  let worstTotal = { n: 0, where: '' };
  for (const { file, index, state } of FRAMES) {
    const counts = instancesPerKind(figurePose(layout(state), state.board?.combat ?? null, DATA, { models: MODELS }).values());
    let total = 0;
    for (const [kind, n] of counts) {
      total += n;
      if (n > worstKind.n) worstKind = { n, where: `${kind} at ${file}@${String(index)}` };
    }
    if (total > worstTotal.n) worstTotal = { n: total, where: `${file}@${String(index)}` };
  }
  // The mirror the gate plays by default: both seats' Fury and Bold Biochemist on
  // the table at once — fourteen coat panels each.
  const cards = corpusCards();
  const fury = cards.get('Nick Fury, Spymaster')!;
  const bio = cards.get('Bold Biochemist')!;
  const mirror = twoSeatState(
    [onBattlefield(fury, 901, 0), onBattlefield(bio, 902, 0)],
    [onBattlefield(fury, 903, 1), onBattlefield(bio, 904, 1)],
  );
  const counts = instancesPerKind(posesOf(mirror).values());
  const coats = counts.get('coatTails') ?? 0;
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  console.log(
    `traits: prop instances — the corpus's worst kind ${String(worstKind.n)} (${worstKind.where}), worst frame ${String(worstTotal.n)} (${worstTotal.where}); ` +
      `a mirror's four coats ${String(coats)} panels, ${String(total)} in all (a kind holds ${String(PROP_CAPACITY)}, the field ${String(MAX_BINDINGS)})`,
  );
  assert.equal(coats, 56, 'four long coats are not fourteen panels each');
  assert.ok(worstKind.n <= PROP_CAPACITY, `one kind needs ${String(worstKind.n)} instances (${worstKind.where})`);
  assert.ok(coats <= PROP_CAPACITY, `a mirror's coats need ${String(coats)} of a kind's ${String(PROP_CAPACITY)} — the last coat loses its skirt`);
  assert.ok(worstTotal.n <= MAX_BINDINGS && total <= MAX_BINDINGS, 'the field runs out of bindings');
});
