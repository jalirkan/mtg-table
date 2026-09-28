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
  CARRIER_LENGTH,
  COSTUME_SLOTS,
  PROP_KINDS,
  PROP_KIT,
  SQUAD_MEMBER,
  SQUAD_OFFSET_X,
  SQUAD_OFFSET_Z,
  SWARM_BEE_RATIO,
  anchorsOf,
  familyOf,
  fitsFamily,
  swarmMembers,
  swarmSpan,
} from '../src/arena/figures/props.ts';
import { figureFor } from '../src/arena/figures/resolve.ts';
import { DEFAULT_TRAIT, EMPTY_TRAIT_DATA, TRAITS, traitFor } from '../src/arena/figures/traits.ts';
import { validateFigures, validateModels, validateTraits } from '../src/arena/figures/validate.ts';
import { FIGURE_FRONT_Z, FIGURE_HEIGHT, FIGURE_MAX_WIDTH, layout, seatFacingY } from '../src/arena/layout.ts';
import { isHidden, type AnyCard, type Frame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';
import { VIEW_BY_ID } from '../src/arena/camera.ts';
import { PropField } from '../src/arena/scene/props.ts';
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
  assert.equal(human.modelId, 'agent');
  assert.equal(chibi.modelId, 'agent-chibi');
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
    bodies.set(name, pose.modelId);
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
});

test('traits: every anonymous pose in the corpus carries no props, no hover, no swarm', () => {
  let anonymous = 0;
  for (const { file, state } of FRAMES) {
    for (const pose of figurePose(layout(state), state.board?.combat ?? null, DATA, { models: MODELS }).values()) {
      if (!pose.anonymous) continue;
      anonymous += 1;
      assert.deepEqual(pose.props, [], `${file}: an anonymous figure carries props`);
      assert.equal(pose.lift, 0, `${file}: an anonymous figure hovers`);
      assert.equal(pose.swarm, 0);
      assert.equal(pose.silhouette, null);
      assert.equal(pose.vehicle, false, `${file}: a card drawn as a back became a silhouette`);
      assert.deepEqual(pose.traitRungs, []);
      // Slice 4: a costume is a statement about what a card is (hard rule 8).
      assert.equal(pose.costume, null, `${file}: an anonymous figure wears a costume`);
    }
  }
  console.log(`traits: ${String(anonymous)} anonymous figure-instances in the corpus, none with an identity or a costume`);
  assert.ok(anonymous >= 1138, `only ${String(anonymous)} anonymous instances — the morph fixtures are not being read`);
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
}

test('traits: the census — every deck card reads as itself, and every row fires', () => {
  const rows = new Map<string, Row>();
  const kindsPerFrame: number[] = [];
  let worstKinds = { kinds: 0, where: '' };
  let worstInstances = { n: 0, where: '' };
  for (const { file, index, state } of FRAMES) {
    const poses = figurePose(layout(state), state.board?.combat ?? null, DATA, { models: MODELS });
    const kinds = new Set<string>();
    let instances = 0;
    for (const pose of poses.values()) {
      for (const prop of pose.props) {
        kinds.add(prop.kind === 'squad' ? `squad:${pose.modelId ?? ''}` : prop.kind);
        // One instance per anchor (the gauntlets' two fists, the badge's chest and
        // back), one per member for a swarm or a squad.
        const anchors =
          prop.kind === 'swarmBee' || prop.kind === 'squad'
            ? pose.swarm
            : Math.max(1, anchorsOf(prop.kind, familyOf(pose.modelId, MODELS)).length);
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
      };
      row.instances += 1;
      if (!pose.ghost) {
        row.heightMin = Math.min(row.heightMin, pose.height);
        row.heightMax = Math.max(row.heightMax, pose.height);
      }
      rows.set(name, row);
    }
    kindsPerFrame.push(kinds.size);
    if (kinds.size > worstKinds.kinds) worstKinds = { kinds: kinds.size, where: `${file}@${String(index)}` };
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
  // card the corpus puts on the battlefield (or on the stack as a ghost).
  const idle = Object.keys(TRAITS.cards).filter((name) => !rows.has(name));
  assert.deepEqual(idle, [], `traits.json rows never reached by the corpus: ${idle.join(', ')}`);
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
  ];
  for (const [name, ok, what] of want) {
    const row = rows.get(name);
    assert.ok(row !== undefined, `${name} never reached the census`);
    assert.ok(ok(row), `${name} should read as ${what}: ${JSON.stringify(row)}`);
  }

  // **The budget**: the field draws one call per KIND. Report 13 §8.2's 90 has
  // room for the slice-2 scene (≤ 66 at g1@355) plus this many.
  assert.ok(worstKinds.kinds <= 12, `${String(worstKinds.kinds)} prop kinds in one frame (${worstKinds.where})`);
  assert.ok(worstInstances.n <= 96, `${String(worstInstances.n)} prop instances in one frame`);
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
      assert.deepEqual(pose.props, []);
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
 * line (`prop-raster.ts`'s `comicVisibility`: `Post.tsx`'s rule, D122/D129, over
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
  // 52 px of it on screen before any ink (kneeling, centre); the ink's one-pixel
  // inner line takes 6 of its edge. The chest plate is `figures/props.ts`'s
  // `badge.anchors.human[0].size` 0.065 — Lane BODIES' file (PLAN.md, Lane LOOK
  // follow-up: 0.075 is ≈ 69 px). From behind the emblem reads at ≈ 200 px.
  'Agent Phil Coulson/badge': {
    seat: 'opp',
    floor: 44,
    why: 'the chest plate seen from the front is 52 px before the ink — a BODIES size change',
  },
};

/**
 * **The props that are on ONE side of a body by nature**, each with the partner
 * that reads on the side it cannot. The rest must read from BOTH seats: since
 * D126 your own figures show the table view their backs and the opponent's their
 * fronts (before it, the other way round — D81); the raster below runs both.
 * A one-sided prop is a detail: it must show on its own side at half the bar
 * (kneeling included), and its partner must carry the card at the full bar on
 * every seat where it does not.
 */
const ONE_SIDED: Readonly<Record<string, { partner: string; why: string }>> = {
  tie: { partner: 'badge', why: 'a shirt-front is on the chest — the badge has a back emblem' },
  laserEye: { partner: 'visor', why: 'an eye is on the face — the visor band is its glow round the head' },
  exhaust: { partner: 'visor', why: 'a flame burns under the thrusters, behind — the visor reads in front' },
  // Slice 4: on a PROPORTIONED head (12 px tall at the table view, where the
  // chibi's was half the figure) a patch is a face detail like a tie — it reads
  // from the front, and Fury's long black coat carries him from behind and above.
  eyepatch: { partner: 'coat', why: 'a patch is on the face — the long black coat carries Fury from behind' },
  // D126's re-check: the thrusters are on the Doombot's BACK. With the opponent's
  // Doombot facing you now, from the far seat they are 26 px of pack behind its
  // body; the visor band — its glow round the head — carries it from the front.
  jetpack: { partner: 'visor', why: 'thrusters are on the back — the visor band reads in front (D126)' },
};

/**
 * **The seat whose figures the table view sees from BEHIND** — derived from
 * `seatFacingY`, never typed: a front is `FIGURE_FRONT_Z · (sin f, cos f)` and
 * the table view looks from +Z, so a seat whose front points to −Z shows it its
 * back. Since D126 it is `you`.
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
  for (const name of deckNames()) {
    const card = cards.get(name);
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
      const raw = bare.get(name)?.get(kind);
      const dot = dots.get(name)?.get(kind);
      lines.push(
        `  ${name.padEnd(30)} ${kind.padEnd(9)} you ${String(row.you).padStart(5)} px   opp ${String(row.opp).padStart(5)} px` +
          `   (before the ink ${String(raw?.you ?? 0)} / ${String(raw?.opp ?? 0)}; on a halftone dot ${String(dot?.you ?? 0)} / ${String(dot?.opp ?? 0)})`,
      );
      const oneSided = ONE_SIDED[kind];
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
        // A one-sided detail may hide on a seat iff its partner carries the card there.
        const partner = kinds.get(oneSided.partner)?.[seat] ?? 0;
        if (partner < barOf(oneSided.partner, seat)) {
          failures.push(`${name}'s ${kind} is hidden from the ${seat} seat and its ${oneSided.partner} shows ${String(partner)} px (${oneSided.why})`);
        }
      }
    }
  }
  console.log(
    `traits: identity props' PAINT on screen in the comic look (visible, not under the ink), table view 1600 × 1000, ` +
      `the fewest pixels over standing/kneeling and centre/edge ` +
      `(≥ ${String(IDENTITY_MIN_PX)} on both seats; one-sided: ${Object.keys(ONE_SIDED).join(', ')})\n${lines.join('\n')}\n` +
      `  over every measurement: ${String(pixelsTotal)} px visible, ${String(inkedTotal)} under the ink, ${String(dottedTotal)} on a halftone dot\n` +
      `  known shortfalls: ${Object.entries(SHORTFALL).map(([k, v]) => `${k} on the ${v.seat} seat (floor ${String(v.floor)}: ${v.why})`).join('; ')}\n` +
      `  Coulson's chest badge alone, seen from behind (the ${BEHIND_SEAT} seat): ${String(chestOnlyFromBehind)} px`,
  );
  assert.ok(checked > 150, `only ${String(checked)} prop measurements`);
  // The controls: the ink and the screen really are modelled (a raster that
  // never inked or dotted a pixel would pass this test for the wrong reason).
  assert.ok(inkedTotal > 0 && inkedTotal < pixelsTotal / 2, `the ink took ${String(inkedTotal)} of ${String(pixelsTotal)} px`);
  assert.ok(dottedTotal > 0, 'no identity-prop pixel fell on a halftone dot — the screen is not modelled');
  assert.equal(Object.keys(SHORTFALL).length, 1, 'a new known shortfall is a decision: say why in its row, and in PLAN.md');
  assert.ok(least.size >= 11, `only ${String(least.size)} deck cards carried props`);
  assert.deepEqual(failures, []);
  // The negative control: slice 3's badge — on the chest only — is not on the
  // screen at all from behind. The back emblem is what makes that row pass.
  assert.ok(chestOnlyFromBehind < IDENTITY_MIN_PX, `the chest badge alone shows ${String(chestOnlyFromBehind)} px from behind — this test cannot tell`);
});

/** The Agents' heads from the table view: the leader's own and each follower's. */
function squadHeads(layers: readonly Layer[]): Array<{ pixels: number; centre: [number, number] | null }> {
  const table = cameraAt(VIEW_BY_ID.table.pose);
  const groups: Record<string, string[]> = { leader: ['head'] };
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
