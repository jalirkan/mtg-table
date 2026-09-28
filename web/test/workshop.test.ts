/*
 * mtg-table — web/test/workshop.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The workshop** (`web/src/workshop/`, `#workshop`): the card viewer that puts
 * one card on a pedestal with the arena's own renderer.
 *
 * Everything the workshop decides is pure and is tested here in bare Node:
 *
 *  - the catalog is what the decks and the corpus produce (a drift check, like
 *    `figures.test.ts`'s check of `figures.glb` against `models.json`);
 *  - the synthetic boards are real boards — the arena's own `layout` and
 *    `figurePose` pose every deck card on them, a face-down card is the anonymous
 *    disc and a redacted stub gets no figure at all;
 *  - every rehearsal of every card plays through the REAL queue and decays to
 *    identity, exactly as `replay-cues.test.ts` requires of a recorded batch;
 *  - the clip cue, the facing preview, the framing and the tuning overrides;
 *  - the legibility meter agrees with `traits.test.ts`'s raster to the pixel;
 *  - slice 4's costume and body flag reach the pedestal's pose through the
 *    overrides, and the tuning panel has a row for every trait key;
 *  - the links with the card browser (`links.ts`): *View in 3D* live exactly for
 *    a body or a card's own cues, and `card=` read from the hash first;
 *  - and the liveness clauses: no transport, no fetch, no timer, one `useFrame`,
 *    `mixer.update(0)`, the lazy chunk, the arena coupling documented, and the
 *    card browser reaching the workshop only through `links.ts`.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import cuesJson from '../src/arena/cues/cues.json' with { type: 'json' };
import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import { VIEW_BY_ID } from '../src/arena/camera.ts';
import { CueQueue } from '../src/arena/cues/queue.ts';
import { REGISTRY } from '../src/arena/cues/registry.ts';
import { cuesFor } from '../src/arena/cues/resolve.ts';
import { NullStage } from '../src/arena/cues/stage.ts';
import { combatFreeze, spellForms } from '../src/arena/figures/casting.ts';
import { figurePose, type FigureLayout } from '../src/arena/figures/pose.ts';
import { tilePose } from '../src/arena/figures/tiles.ts';
import { TRAITS, traitFor } from '../src/arena/figures/traits.ts';
import { tileDataOf } from '../src/arena/figures/types.ts';
import { layout, seatFacingY, yawToward, standPointOf, placementOf } from '../src/arena/layout.ts';
import { isHidden } from '../src/protocol.ts';
import type { ClientState } from '../src/reduce.ts';
import { CATALOG, cardOf, roleOf, rungsOf, workshopEntries, type WorkshopEntry } from '../src/workshop/catalog.ts';
import { buildCatalog, parseDck } from '../src/workshop/catalogBuild.ts';
import { CLIP_CUE, WORKSHOP_CLIP_CUE, clipCueData, requestFor, workshopRegistry } from '../src/workshop/clipCue.ts';
import { cueRows, unreachedSelectors } from '../src/workshop/cueRows.ts';
import { PreviewStage, turnPoses, wrapAngle } from '../src/workshop/facing.ts';
import { TABLE_FRAME_HEIGHT, closePose, framingOf, tableDepthOf, tableForward, tablePixels, tablePose } from '../src/workshop/framing.ts';
import {
  DEFAULT_OPTIONS,
  IDS,
  OPP,
  YOU,
  clipBatch,
  crewedEntry,
  figureIds,
  pedestalState,
  rehearsalsFor,
  rehearse,
  soloState,
  type PedestalOptions,
} from '../src/workshop/synthetic.ts';
import {
  STORE_KEY,
  committedRow,
  cueEntryText,
  cueSelectorsOf,
  cuesWith,
  parseOverrides,
  readOverrides,
  traitsRowText,
  traitsWith,
  withCueParams,
  withTraitRow,
  writeOverrides,
} from '../src/workshop/tuning.ts';
import traitsJson from '../src/arena/figures/traits.json' with { type: 'json' };
import { WORKSHOP_KEYMAP, workshopActionFor, workshopRowFor } from '../src/workshop/keys.ts';
import { catalogNameFor, cardFromLocation, cardsHref, threeDLinkFor, workshopHref } from '../src/workshop/links.ts';
import { COSTUME_SLOTS } from '../src/arena/figures/props.ts';
import { hashForView, viewFromLocation } from '../src/useView.ts';
import { cueDataOf, figureDataOf, modelDataOf } from '../src/workshop/validated.ts';

const MODELS = modelDataOf(modelsJson);
const FIGURES = figureDataOf(figuresJson, MODELS);
const CUES = cueDataOf(cuesJson).data;
const PRESENCE = CUES.presence ?? {};
const ENTRIES = workshopEntries();
const entry = (name: string): WorkshopEntry => {
  const hit = ENTRIES.find((e) => e.name === name || e.key === name);
  assert.ok(hit !== undefined, `no workshop entry ${name}`);
  return hit;
};
const posesOf = (state: ClientState, turn = 0): FigureLayout =>
  turnPoses(
    figurePose(layout(state, PRESENCE), state.board?.combat ?? null, FIGURES, {
      frozen: combatFreeze(state.board),
      models: MODELS,
    }),
    turn,
  );

// ---------------------------------------------------------------------------
// The catalog
// ---------------------------------------------------------------------------

function* stateBodies(path: string): Generator<unknown> {
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.includes('"state"')) continue;
    const frame = JSON.parse(line) as { type?: string; body?: unknown };
    if (frame.type === 'state') yield frame.body;
  }
}

test('workshop: catalog.json is what decks/*.dck and fixtures/games/ produce (node tools/build-workshop-catalog.ts)', () => {
  const decksDir = fileURLToPath(new URL('../../decks/', import.meta.url));
  const gamesDir = fileURLToPath(new URL('../../fixtures/games/', import.meta.url));
  const decks = readdirSync(decksDir)
    .filter((f) => f.endsWith('.dck'))
    .sort()
    .map((f) => parseDck(f, readFileSync(decksDir + f, 'utf8')));
  const recordings = readdirSync(gamesDir)
    .filter((f) => f.endsWith('.jsonl'))
    .sort()
    .map((f) => [f, stateBodies(gamesDir + f)] as const);
  const built = buildCatalog(decks, recordings, Object.keys((cuesJson as unknown as { cards: Record<string, unknown> }).cards));
  assert.deepEqual(JSON.parse(JSON.stringify(built)), JSON.parse(JSON.stringify(CATALOG)), 'catalog.json is stale — run node tools/build-workshop-catalog.ts');
  // The deck in play comes first, and its printed facts — not a battlefield
  // under Quantum Reduction — are what the pedestal draws.
  assert.equal(CATALOG.decks[0]?.file, 'pacho-shield.dck');
  assert.deepEqual(
    [CATALOG.cards['Peggy Carter, Secret Agent']?.power, CATALOG.cards['Peggy Carter, Secret Agent']?.toughness],
    ['2', '1'],
  );
  assert.equal(CATALOG.cards['Aerial Doombot']?.power, '1');
  console.log(
    `workshop catalog: ${String(CATALOG.decks.length)} decks, ${String(Object.keys(CATALOG.cards).length)} cards with facts, ` +
      `tokens ${CATALOG.tokens.map((t) => t.name).join(', ')}; never face up: ${CATALOG.missing.join(', ') || 'none'}`,
  );
});

test('workshop: the list holds every deck card, the tokens, the archetypes and both concealed shapes', () => {
  const keys = new Set(ENTRIES.map((e) => e.key));
  assert.equal(keys.size, ENTRIES.length, 'two entries share a key');
  for (const deck of CATALOG.decks) for (const card of deck.cards) assert.ok(keys.has(`card:${card.name}`), card.name);
  for (const token of ['Soldier Token', 'Robot Token', 'Hero Token']) assert.ok(keys.has(`card:${token}`), token);
  assert.ok(keys.has('hidden:faceDown') && keys.has('hidden:redacted'));
  assert.ok(ENTRIES.filter((e) => e.group === 'archetype').length >= 10);
  // The deck in play is the first block, in its own order.
  assert.equal(ENTRIES[0]?.name, 'Agent Phil Coulson');
});

test('workshop: the three card shapes are the protocol’s — a full card, a face-down card, the five-key stub', () => {
  const stub = cardOf(entry('hidden:redacted'), 7, OPP);
  assert.deepEqual(Object.keys(stub).sort(), ['controller', 'hidden', 'id', 'owner', 'zone']);
  assert.equal(isHidden(stub), true);
  const morph = cardOf(entry('hidden:faceDown'), 8, OPP) as { name: string; faceDown: boolean; alt: unknown; types: string };
  assert.deepEqual([morph.name, morph.faceDown, morph.alt, morph.types], ['', true, null, 'Creature']);
  const peggy = cardOf(entry('Peggy Carter, Secret Agent'), 9, YOU) as { name: string; types: string; controller: number };
  assert.deepEqual([peggy.name, peggy.controller], ['Peggy Carter, Secret Agent', YOU]);
});

test('workshop: each row’s rung is the arena ladders’ own answer', () => {
  const level = (name: string): string => rungsOf(entry(name), FIGURES, TRAITS).level;
  assert.equal(level('Peggy Carter, Secret Agent'), 'per-card');
  assert.equal(level('S.H.I.E.L.D. Helicarrier'), 'subtype'); // traits' subtype:vehicle rung, no row of its own
  assert.equal(level('arch:robot'), 'subtype');
  assert.equal(level('arch:white'), 'colour');
  assert.equal(level('arch:other'), 'default');
  assert.equal(level('hidden:faceDown'), 'concealed');
  assert.equal(level('Plains'), 'subtype'); // the tile ladder's subtype:plains
  assert.equal(level('Thriving Isle'), 'per-card');
});

// ---------------------------------------------------------------------------
// The pedestal's boards are real boards
// ---------------------------------------------------------------------------

test('workshop: every creature of every deck stands on the pedestal, posed by the arena’s own figurePose', () => {
  let creatures = 0;
  for (const e of ENTRIES) {
    if (e.concealed !== null || e.missing) continue;
    const state = pedestalState(e, DEFAULT_OPTIONS);
    const placed = layout(state, PRESENCE);
    const poses = posesOf(state);
    const role = roleOf(e);
    if (role === 'creature') {
      creatures += 1;
      const pose = poses.get(IDS.subject);
      assert.ok(pose !== undefined, `${e.label}: no figure`);
      assert.equal(pose.seat, 'you');
      assert.equal(pose.anonymous, false);
    }
    if (role === 'vehicle') assert.equal(poses.get(IDS.subject)?.silhouette, 'carrier', `${e.label}: no carrier`);
    if (role === 'land') assert.ok(tilePose(placed, tileDataOf(FIGURES)).has(IDS.subject), `${e.label}: no tile`);
    if (role === 'attached') {
      const host = poses.get(IDS.host);
      assert.ok(host !== undefined && host.attachments.length === 1, `${e.label}: not on its host`);
    }
    if (role === 'spell') {
      const forms = spellForms(state.board, () => 'you', () => '#ffffff');
      assert.equal(forms.length, 1, `${e.label}: no spell form`);
      assert.equal(placementOf(placed, IDS.subject)?.kind, 'stack');
    }
  }
  assert.ok(creatures >= 20, `only ${String(creatures)} creatures posed`);
  // The per-card identity arrives with no workshop code saying so.
  const peggy = posesOf(pedestalState(entry('Peggy Carter, Secret Agent'))).get(IDS.subject)!;
  assert.deepEqual(peggy.props.map((p) => p.kind).sort(), ['hat', 'shield']);
  assert.equal(peggy.tint, '#f3ede4');
});

test('workshop: a face-down creature is the anonymous disc and a redacted stub gets no figure (hard rule 8)', () => {
  const morph = posesOf(pedestalState(entry('hidden:faceDown'))).get(IDS.subject);
  assert.ok(morph !== undefined);
  assert.deepEqual([morph.anonymous, morph.modelId, morph.props.length, morph.rung], [true, null, 0, 'default']);
  const stubState = pedestalState(entry('hidden:redacted'));
  assert.equal(posesOf(stubState).has(IDS.subject), false, 'a five-key stub must not stand: that asserts it is a creature');
  assert.equal(placementOf(layout(stubState, PRESENCE), IDS.subject)?.back, true);
});

test('workshop: both seats puts one copy on each side, facing as the arena faces them', () => {
  const options: PedestalOptions = { ...DEFAULT_OPTIONS, both: true };
  const state = pedestalState(entry('Agent Phil Coulson'), options);
  const poses = posesOf(state);
  const [yours, theirs] = figureIds(entry('Agent Phil Coulson'), options).map((id) => poses.get(id)!);
  assert.equal(yours?.seat, 'you');
  assert.equal(theirs?.seat, 'opp');
  assert.equal(yours?.facingY, seatFacingY('you'));
  assert.equal(theirs?.facingY, seatFacingY('opp'));
  assert.equal(state.board?.players.find((p) => p.id === OPP)?.zones.battlefield.cards.length, 1, 'no dummy in both-seats mode');
});

test('workshop: every stance is a pose from the snapshot', () => {
  const peggy = entry('Peggy Carter, Secret Agent');
  const stance = (s: PedestalOptions['stance']): string => posesOf(pedestalState(peggy, { ...DEFAULT_OPTIONS, stance: s })).get(IDS.subject)!.stance;
  assert.equal(stance('ready'), 'ready');
  assert.equal(stance('tapped'), 'crouch');
  assert.equal(stance('sick'), 'sick');
  assert.equal(stance('attacking'), 'attacking');
  assert.equal(stance('blocking'), 'blocking');
  const blocking = posesOf(pedestalState(peggy, { ...DEFAULT_OPTIONS, stance: 'blocking' })).get(IDS.subject)!;
  assert.equal(blocking.interposesId, IDS.dummy, 'the blocker interposes the dummy, from state.combat');
});

// ---------------------------------------------------------------------------
// Rehearsals: the real queue, to identity
// ---------------------------------------------------------------------------

function playOut(queue: CueQueue, stage: NullStage): number {
  let guard = 0;
  while (!queue.idle && guard < 200) {
    queue.advance(50);
    guard += 1;
  }
  assert.ok(queue.idle, 'the queue never drained');
  assert.equal(stage.offsets.size, 0, 'an offset outlived its batch');
  assert.equal(stage.clips.size, 0, 'a clip outlived its batch');
  assert.equal(stage.effects.size, 0, 'an effect outlived its batch');
  return guard;
}

test('workshop: every rehearsal of every card plays through the real queue and decays to identity', () => {
  let batches = 0;
  let cues = 0;
  const census = new Map<string, number>();
  for (const e of ENTRIES) {
    if (e.missing) continue;
    for (const both of [false, true]) {
      for (const kind of rehearsalsFor(e)) {
        const r = rehearse(e, kind, { ...DEFAULT_OPTIONS, both });
        const stage = new NullStage();
        const queue = new CueQueue({ stage, registry: workshopRegistry(), data: CUES, mode: 'replay' });
        const steps = queue.enqueueBatch(r.events, r.after, undefined, r.before.board);
        batches += 1;
        for (const [id, n] of queue.seen) census.set(id, (census.get(id) ?? 0) + n);
        cues += [...queue.seen.values()].reduce((a, b) => a + b, 0);
        if (e.concealed === null && steps === 0) assert.fail(`${e.label} · ${kind}: no cue at all`);
        playOut(queue, stage);
        assert.equal(queue.notes.filter((n) => n.includes('threw')).length, 0, `${e.label} · ${kind}: ${queue.notes.join('; ')}`);
      }
    }
  }
  console.log(`workshop rehearsals: ${String(batches)} batches, ${String(cues)} cues — ${[...census].map(([k, n]) => `${k} ${String(n)}`).join(', ')}`);
  assert.ok(batches > 500);
});

test('workshop: the rehearsals reach the per-card cues — Peggy’s aegis, Agent 13’s muzzle, the Doombot’s jet', () => {
  const firstCue = (name: string, kind: Parameters<typeof rehearse>[1]): { id: string; params: Record<string, unknown> } => {
    const r = rehearse(entry(name), kind, DEFAULT_OPTIONS);
    const cue = r.events.flatMap((ev) => cuesForEvent(ev, r))[0];
    assert.ok(cue !== undefined, `${name} ${kind}: nothing resolved`);
    return cue;
  };
  assert.equal(firstCue('Peggy Carter, Secret Agent', 'attackAlone').id, 'attack.aegis');
  assert.equal(firstCue('Agent 13, Sharon Carter', 'attackAlone').params['muzzle'], true);
  assert.equal(firstCue('Aerial Doombot', 'attackAlone').id, 'attack.jet');
  assert.equal(firstCue('Ant-Man, Reformed Rogue', 'attackAlone').id, 'attack.shrink');
  assert.equal(firstCue('Agents of S.H.I.E.L.D.', 'attackTogether').params['spotlight'], undefined);
  assert.equal(firstCue('Agents of S.H.I.E.L.D.', 'attackAlone').params['spotlight'], 1);
});

function cuesForEvent(event: Parameters<typeof cuesFor>[0], r: { after: ClientState; before: ClientState }): Array<{ id: string; params: Record<string, unknown> }> {
  return cuesFor(event, r.after, CUES, r.before.board).map((c) => ({ id: c.id, params: c.params as Record<string, unknown> }));
}

test('workshop: an aimed rehearsal carries the aim the stack stated — this frame’s for a cast, the previous frame’s for a resolution', () => {
  const wasp = rehearse(entry('Wasp, Shrinking Savior'), 'cast', DEFAULT_OPTIONS);
  assert.equal(wasp.events.flatMap((e) => cuesForEvent(e, wasp))[0]?.params['beamTo'], IDS.dummy);
  const quake = rehearse(entry('Quake, Agent of S.H.I.E.L.D.'), 'resolves', DEFAULT_OPTIONS);
  const shock = quake.events.flatMap((e) => cuesForEvent(e, quake))[0]!;
  assert.equal(shock.id, 'fx.shockwave');
  assert.equal(shock.params['strikeCard'], IDS.dummy, 'T6: the aim is read off the PREVIOUS board');
  assert.ok(quake.fiction !== null && /engine/.test(quake.fiction), 'the panel says the aim is the workshop’s fiction');
  // In both-seats mode the copies are each other's targets.
  const both = rehearse(entry('Helicarrier Strike'), 'cast', { ...DEFAULT_OPTIONS, both: true });
  const aims = both.events.flatMap((e) => cuesForEvent(e, both)).map((c) => c.params['beamToPlayer']);
  assert.deepEqual(aims, [OPP, YOU]);
});

test('workshop: a death is queued before the body is asked about it (D64 on the pedestal)', () => {
  for (const kind of ['dies', 'lethal'] as const) {
    const r = rehearse(entry('Agent Phil Coulson'), kind, DEFAULT_OPTIONS);
    const stage = new NullStage();
    const queue = new CueQueue({ stage, registry: workshopRegistry(), data: CUES, mode: 'replay' });
    queue.enqueueBatch(r.events, r.after, undefined, r.before.board);
    assert.equal(queue.deathPending(IDS.subject), true, `${kind}: no death cue queued`);
    assert.equal(posesOf(r.after).has(IDS.subject), false, `${kind}: the after-board still has the body`);
    assert.equal(posesOf(r.before).has(IDS.subject), true);
    playOut(queue, stage);
  }
});

// ---------------------------------------------------------------------------
// The clip cue
// ---------------------------------------------------------------------------

test('workshop: workshop.clip is the registry’s clip lane and nothing else, in a copy of the registry', () => {
  const registry = workshopRegistry();
  assert.equal(registry.size, REGISTRY.size + 1);
  assert.equal(REGISTRY.has(WORKSHOP_CLIP_CUE), false, 'the arena registry was mutated');
  for (const key of REGISTRY.keys()) assert.equal(registry.get(key), REGISTRY.get(key));
  const stage = new NullStage();
  const ctx = { id: WORKSHOP_CLIP_CUE, targets: [5], players: [], params: { wsClip: 'attack', clip: 'pistolDraw' }, ms: 600, key: 'k1', reducedMotion: false };
  CLIP_CUE.apply(ctx, 0.5, stage);
  assert.deepEqual({ ...stage.clips.get(5)! }, { clip: 'attack', t: 0.5, weight: 1, alias: 'pistolDraw', key: 'k1' });
  assert.equal(stage.offsets.size + stage.effects.size, 0, 'a clip on its own writes no offset and no effect');
  CLIP_CUE.end(ctx, stage);
  assert.equal(stage.clips.size, 0);
  // Reduced motion: no clip at all (the registry's own rule, T7).
  CLIP_CUE.apply({ ...ctx, reducedMotion: true }, 0.5, stage);
  assert.equal(stage.clips.size, 0);
  assert.deepEqual(requestFor('pistolDraw', { attack: 'pistolDraw' }), { clip: 'attack', alias: 'pistolDraw' });
  assert.deepEqual(requestFor('die'), { clip: 'die', alias: null });
  assert.deepEqual(requestFor('radioCall'), { clip: 'idle', alias: 'radioCall' });
});

test('workshop: a clip batch resolves to workshop.clip for this card and plays out', () => {
  const peggy = entry('Peggy Carter, Secret Agent');
  const r = clipBatch(peggy, DEFAULT_OPTIONS);
  const data = clipCueData(CUES, peggy.name, 'attack', 900);
  const stage = new NullStage();
  const queue = new CueQueue({ stage, registry: workshopRegistry(), data, mode: 'replay' });
  assert.equal(queue.enqueueBatch(r.events, r.after, undefined, r.before.board), 1);
  queue.advance(400);
  assert.equal(stage.clips.get(IDS.subject)?.clip, 'attack');
  assert.equal(stage.offsets.size, 0);
  playOut(queue, stage);
  // The data override touched one row of a copy: the game's data is untouched.
  assert.equal(CUES.cards[peggy.name]?.['stats'], undefined);
  // A card with no name (face down) resolves through the defaults override.
  const morph = clipCueData(CUES, '', 'hit', 400);
  assert.equal(morph.defaults?.['stats']?.cue, WORKSHOP_CLIP_CUE);
});

// ---------------------------------------------------------------------------
// The facing preview (PLAN question 13)
// ---------------------------------------------------------------------------

test('workshop: the facing preview turns every pose and nothing else, and undoes itself', () => {
  const state = pedestalState(entry('Agent 13, Sharon Carter'), { ...DEFAULT_OPTIONS, both: true });
  const base = posesOf(state);
  assert.equal(turnPoses(base, 0), base, 'turn 0 is the arena, untouched');
  const turned = turnPoses(base, Math.PI);
  for (const [id, pose] of base) {
    const t = turned.get(id)!;
    assert.equal(wrapAngle(t.facingY - pose.facingY), Math.PI);
    assert.deepEqual({ ...t, facingY: 0 }, { ...pose, facingY: 0 });
    assert.ok(Math.abs(wrapAngle(turnPoses(turned, Math.PI).get(id)!.facingY - pose.facingY)) < 1e-12);
  }
});

test('workshop: under the preview an attacker still ends its turn facing its defender (D82)', () => {
  const r = rehearse(entry('Agent 13, Sharon Carter'), 'attackAlone', DEFAULT_OPTIONS);
  const placed = layout(r.after, PRESENCE);
  const anchor = { kind: 'player' as const, id: OPP };
  const unturned = new PreviewStage(placed).yawTo(IDS.subject, anchor);
  // D126: your figure already faces the other seat; the attack turns it a little.
  assert.ok(Math.abs(unturned) < 0.8, 'your figure does not face the other seat at rest (D126)');
  for (const turn of [0, Math.PI]) {
    const stage = new PreviewStage(placed);
    stage.turn = turn;
    // Facing plus the lunge's full turn points where the arena's points.
    const facing = seatFacingY('you') + turn + stage.yawTo(IDS.subject, anchor);
    assert.ok(Math.abs(wrapAngle(facing - (seatFacingY('you') + unturned))) < 1e-9, `turn ${String(turn)}`);
  }
  // Facing the other seat (the arena since D126) the attack hardly turns her —
  // she already faces it; previewed facing her own player (the facing before
  // D126), it turns her about half a turn.
  const previewed = new PreviewStage(placed);
  previewed.turn = Math.PI;
  assert.ok(Math.abs(Math.abs(previewed.yawTo(IDS.subject, anchor)) - Math.PI) < 0.8, `previewed ${String(previewed.yawTo(IDS.subject, anchor))}`);
  // The arena's own answer (layout.ts's yawToward from the stand point) is the one preserved.
  const stand = standPointOf(placementOf(placed, IDS.subject)!);
  assert.ok(Number.isFinite(yawToward(0, stand[0], stand[2], 0, -6)));
});

// ---------------------------------------------------------------------------
// Framing
// ---------------------------------------------------------------------------

test('workshop: the table-distance camera’s arithmetic — view 1’s depth scaled by the canvas height (the scale, not the caption)', () => {
  const state = pedestalState(entry('Peggy Carter, Secret Agent'));
  const framing = framingOf(layout(state, PRESENCE), posesOf(state), IDS.subject);
  assert.ok(framing.hasFigure && framing.figureHeight > 0.3);
  const f = tableForward();
  const tan = Math.tan((40 * Math.PI) / 360);
  for (const canvas of [540, 880, 1200]) {
    const pose = tablePose(framing, canvas);
    const depth = (framing.centre[0] - pose.position[0]) * f[0] + (framing.centre[1] - pose.position[1]) * f[1] + (framing.centre[2] - pose.position[2]) * f[2];
    const px = (framing.figureHeight * canvas) / (2 * depth * tan);
    assert.ok(Math.abs(px - tablePixels(framing.figureHeight, framing.centre)) < 1e-6, `canvas ${String(canvas)}`);
  }
  // At 900 px the table-distance camera stands exactly as deep as view 1's.
  const at900 = tablePose(framing, TABLE_FRAME_HEIGHT);
  const depth900 = (framing.centre[0] - at900.position[0]) * f[0] + (framing.centre[1] - at900.position[1]) * f[1] + (framing.centre[2] - at900.position[2]) * f[2];
  assert.ok(Math.abs(depth900 - tableDepthOf(framing.centre)) < 1e-9);
  // `tablePixels` is the NOMINAL height seen square-on — the scale the camera is
  // set from, never the caption (the next test measures the drawn body). Since
  // Tier 2 slice 4 a proportioned body stands its full height: 95.7 px nominal
  // for Peggy (70 on slice 3's chibi), drawn 69 px in view 1's slant.
  const px = tablePixels(framing.figureHeight, framing.centre);
  assert.ok(px > 45 && px < 110, `Peggy's nominal height is ${String(px)} px`);
  // The close-up looks along view 1's own direction.
  const close = closePose(framing);
  const d = [close.target[0] - close.position[0], close.target[1] - close.position[1], close.target[2] - close.position[2]];
  const n = Math.hypot(d[0]!, d[1]!, d[2]!);
  assert.ok(Math.abs(d[0]! / n - f[0]) + Math.abs(d[1]! / n - f[1]) + Math.abs(d[2]! / n - f[2]) < 1e-9);
});

test('workshop: the caption is the body as DRAWN in view 1 — projected skinned vertices — and the table-distance camera draws it that size', async () => {
  const THREE = await import('three');
  const { drawnHeightPx, CAPTION_HEIGHT, CAPTION_WIDTH } = await import('../src/workshop/legibility.ts');
  const raster = await import('./prop-raster.ts');
  const library = await raster.loadLibrary();
  assert.deepEqual([CAPTION_WIDTH, CAPTION_HEIGHT], [1600, TABLE_FRAME_HEIGHT]);
  const V = new THREE.Vector3();
  /** Top row to bottom row of a soup of world-space triangles, through `camera` on a canvas `height` px tall. */
  const span = (camera: InstanceType<typeof THREE.PerspectiveCamera>, tris: readonly number[], height: number): number => {
    let top = Infinity;
    let bottom = -Infinity;
    for (let i = 0; i + 2 < tris.length; i += 3) {
      V.set(tris[i]!, tris[i + 1]!, tris[i + 2]!).project(camera);
      const y = ((1 - V.y) / 2) * height;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    return bottom - top;
  };
  const view1 = raster.cameraAt(VIEW_BY_ID.table.pose, 1600, TABLE_FRAME_HEIGHT);
  const lines: string[] = [];
  for (const name of ['Peggy Carter, Secret Agent', 'Aerial Doombot', 'Giant-Sized Flying Ant', 'Agent Phil Coulson', 'Nick Fury, Spymaster']) {
    const state = pedestalState(entry(name));
    const framing = framingOf(layout(state, PRESENCE), posesOf(state), IDS.subject);
    const pose = framing.pose;
    assert.ok(pose !== null && pose.modelId !== null, `${name}: no modelled body`);
    const mine = drawnHeightPx(pose, library);
    assert.ok(mine !== null, `${name}: no drawn height`);
    // An independent build of the same body (prop-raster.ts, what traits.test.ts reads).
    const rig = raster.rigOf(pose, library);
    assert.ok(rig !== null);
    const tris = raster.bodyLayers(rig).flatMap((layer) => layer.tris);
    const theirs = span(view1, tris, TABLE_FRAME_HEIGHT);
    assert.ok(Math.abs(mine - theirs) < 0.5, `${name}: caption ${String(mine)} px, projected ${String(theirs)} px`);
    // The table-distance camera (on the figure's axis, at view 1's depth × H/900)
    // draws the same body at the same number of CSS px as view 1 at 1600 × 900 —
    // within a few percent (on-axis, not view 1's oblique) — on ANY canvas height.
    for (const canvas of [540, TABLE_FRAME_HEIGHT, 1200]) {
      const camera = raster.cameraAt(tablePose(framing, canvas), 1600, canvas);
      const atTable = span(camera, tris, canvas);
      assert.ok(Math.abs(atTable - theirs) / theirs < 0.06, `${name} @${String(canvas)}: table distance ${atTable.toFixed(1)} px vs view 1 ${theirs.toFixed(1)} px`);
    }
    const nominal = tablePixels(framing.figureHeight, framing.centre);
    lines.push(`${name.split(',')[0]} drawn ${mine.toFixed(1)} px (nominal ${nominal.toFixed(1)})`);
  }
  // A ring swarm's rig is posed but never drawn (D88): nothing to caption.
  const swarm = posesOf(pedestalState(entry("Ant-Man's Air Force"))).get(IDS.subject)!;
  assert.equal(drawnHeightPx(swarm, library), null);
  console.log(`workshop caption, view 1 at 1600×900: ${lines.join(' · ')}`);
});

// ---------------------------------------------------------------------------
// Tuning: overrides through the arena's validators, in this browser only
// ---------------------------------------------------------------------------

test('workshop: a trait override applies through validateTraits, and a bad one is dropped as the arena would drop it', () => {
  const peggy = entry('Peggy Carter, Secret Agent');
  const card = cardOf(peggy, 1, YOU);
  const tinted = withTraitRow({ traits: {}, cues: {} }, peggy.name, { ...committedRow(peggy.name), tint: '#3fa9f5' });
  const good = traitsWith(tinted);
  assert.deepEqual(good.errors, []);
  assert.equal(traitFor(card, good.data).spec.tint, '#3fa9f5');
  assert.deepEqual(traitFor(card, good.data).spec.props, ['shield', 'hat']);
  const bad = traitsWith(withTraitRow({ traits: {}, cues: {} }, peggy.name, { scale: 99 }));
  assert.equal(bad.errors.length, 1);
  assert.match(bad.errors[0]!.where, /Peggy/);
  assert.equal(traitFor(card, bad.data).rungs.includes('card'), false, 'the bad row is dropped and the ladder falls through');
  // "copy as traits.json row" pastes as JSON and keeps the row's note.
  const text = traitsRowText(peggy.name, { ...committedRow(peggy.name), tint: '#3fa9f5' });
  const parsed = JSON.parse(`{${text}}`) as Record<string, Record<string, unknown>>;
  assert.equal(parsed[peggy.name]?.['tint'], '#3fa9f5');
  assert.equal(typeof parsed[peggy.name]?.['_note'], 'string');
});

test('workshop: a cue params override applies through validateCues', () => {
  const name = 'Peggy Carter, Secret Agent';
  const good = cuesWith(withCueParams({ traits: {}, cues: {} }, name, 'attackers:alone', { colour: '#ff0000' }), cuesJson);
  assert.deepEqual(good.errors, []);
  assert.equal(good.data.cards[name]?.['attackers:alone']?.params?.['colour'], '#ff0000');
  const bad = cuesWith(withCueParams({ traits: {}, cues: {} }, name, 'attackers:alone', { beamTo: 3 }), cuesJson);
  assert.equal(bad.errors.length, 1, 'an event fact is not a param a cue file may set');
  assert.equal(bad.data.cards[name]?.['attackers:alone'], undefined);
});

test('workshop: "copy as cues.json entry" is the committed entry — every key in order, comments, presence and station — with only the edited params changed', () => {
  const file = readFileSync(fileURLToPath(new URL('../src/arena/cues/cues.json', import.meta.url)), 'utf8');
  const cards = (cuesJson as unknown as { cards: Record<string, Record<string, unknown>> }).cards;
  const paste = (text: string, name: string): Record<string, unknown> =>
    (JSON.parse(`{${text}}`) as Record<string, Record<string, unknown>>)[name]!;
  let entries = 0;
  let edits = 0;
  for (const [name, committed] of Object.entries(cards)) {
    entries += 1;
    const text = cueEntryText(name, {}, cuesJson);
    const pasted = paste(text, name);
    assert.deepEqual(pasted, committed, `${name}: the unedited copy is not the committed entry`);
    assert.deepEqual(Object.keys(pasted), Object.keys(committed), `${name}: key order`);
    assert.ok(file.includes(text), `${name}: the unedited copy is not the committed text byte for byte (the file's style changed? see tuning.ts's inlineJson)`);
    for (const selector of Object.keys(cueSelectorsOf(name, cuesJson))) {
      edits += 1;
      const params = { colour: '#123456' };
      const edited = paste(cueEntryText(name, { [selector]: params }, cuesJson), name);
      assert.deepEqual(Object.keys(edited), Object.keys(committed), `${name} · ${selector}: key order`);
      for (const key of Object.keys(committed)) {
        if (key !== selector) {
          assert.deepEqual(edited[key], committed[key], `${name} · ${selector}: ${key} changed`);
          continue;
        }
        const { params: mine, ...restMine } = edited[key] as Record<string, unknown>;
        const { params: _theirs, ...restTheirs } = committed[key] as Record<string, unknown>;
        assert.deepEqual(restMine, restTheirs, `${name} · ${selector}: more than params changed`);
        assert.deepEqual(mine, params);
      }
    }
  }
  assert.ok(entries >= 28 && edits >= 40, `${String(entries)} entries, ${String(edits)} selectors`);
  // The regression, through the arena's own validator: pasting the Doombot's and
  // Web Up's copies over the committed file keeps the hover and the cocoon.
  const pastedFile = JSON.parse(JSON.stringify(cuesJson)) as { cards: Record<string, unknown> };
  for (const name of ['Aerial Doombot', 'Web Up', 'Wasp, Shrinking Savior', 'S.H.I.E.L.D. Helicarrier', 'Strategic Intervention']) {
    pastedFile.cards[name] = paste(cueEntryText(name, {}, cuesJson), name);
  }
  const { data, errors } = cueDataOf(pastedFile);
  assert.deepEqual(errors, []);
  assert.deepEqual(data.presence?.['Aerial Doombot'], { hoverY: 0.2, bobAmp: 0.018, bobHz: 0.75 });
  assert.deepEqual(data.stations?.['Web Up'], CUES.stations?.['Web Up']);
  assert.ok(data.stations?.['Web Up'] !== undefined && data.stations['Strategic Intervention'] !== undefined);
  assert.deepEqual(data.presence, CUES.presence);
});

test('workshop: "copy as traits.json row" is the committed row with the edit folded in, its _note where it was', () => {
  const file = readFileSync(fileURLToPath(new URL('../src/arena/figures/traits.json', import.meta.url)), 'utf8');
  const cards = (traitsJson as unknown as { cards: Record<string, Record<string, unknown>> }).cards;
  for (const [name, committed] of Object.entries(cards)) {
    const text = traitsRowText(name, committedRow(name));
    const pasted = (JSON.parse(`{${text}}`) as Record<string, Record<string, unknown>>)[name]!;
    assert.deepEqual(pasted, committed, name);
    assert.deepEqual(Object.keys(pasted), Object.keys(committed), `${name}: key order`);
    assert.ok(file.includes(text), `${name}: not the committed text byte for byte`);
  }
  // An edit changes its field in place; a new field goes after the row's last data
  // key, before a trailing comment (slice 4's `_costume`); a dropped field is gone.
  const peggy = 'Peggy Carter, Secret Agent';
  const row = { ...committedRow(peggy), tint: '#3fa9f5', hover: 0.1 };
  delete (row as Record<string, unknown>)['accent'];
  const edited = (JSON.parse(`{${traitsRowText(peggy, row)}}`) as Record<string, Record<string, unknown>>)[peggy]!;
  assert.deepEqual(Object.keys(edited), ['tint', 'props', '_note', 'costume', 'hover', '_costume']);
  assert.equal(edited['tint'], '#3fa9f5');
  assert.equal(edited['_note'], cards[peggy]!['_note']);
  assert.equal(edited['_costume'], cards[peggy]!['_costume']);
  // Slice 4's costume: one slot edited, the rest of the block as committed, and
  // the text still in the file's own style (a slot per line at eight spaces).
  const costume = { ...(committedRow(peggy)['costume'] as Record<string, string>), hair: '#101010' };
  const text = traitsRowText(peggy, { ...committedRow(peggy), costume });
  assert.match(text, /\n {6}"costume": \{\n {8}"top": "#2d4f9e",/);
  assert.match(text, /\n {8}"hair": "#101010"\n {6}\},/);
  const pasted = (JSON.parse(`{${text}}`) as Record<string, Record<string, unknown>>)[peggy]!;
  assert.deepEqual(pasted['costume'], costume);
  assert.deepEqual(Object.keys(pasted), Object.keys(cards[peggy]!));
});

test('workshop: slice 4’s costume and body reach the pedestal’s pose through the overrides — and the tuning panel writes a row for every trait key the validator knows', () => {
  const peggy = entry('Peggy Carter, Secret Agent');
  const poseOf = (traits: ReturnType<typeof traitsWith>['data']) => {
    const state = pedestalState(peggy);
    return figurePose(layout(state, PRESENCE), state.board?.combat ?? null, FIGURES, { models: MODELS, traits }).get(IDS.subject)!;
  };
  const committed = poseOf(TRAITS);
  assert.ok(committed.costume !== null && committed.costume.length === COSTUME_SLOTS.length, 'Peggy wears a costume');
  const hair = COSTUME_SLOTS.indexOf('hair');
  assert.equal(committed.costume[hair], '#5a3a26');
  // One slot edited live: the pose — which FigureLayer writes into her material at
  // commit — carries it, and nothing else in her palette moves.
  const costume = { ...(committedRow(peggy.name)['costume'] as Record<string, string>), hair: '#101010' };
  const edited = traitsWith(withTraitRow({ traits: {}, cues: {} }, peggy.name, { ...committedRow(peggy.name), costume }));
  assert.deepEqual(edited.errors, []);
  const recoloured = poseOf(edited.data);
  assert.equal(recoloured.costume![hair], '#101010');
  COSTUME_SLOTS.forEach((slot, i) => {
    if (slot !== 'hair') assert.equal(recoloured.costume![i], committed.costume![i], slot);
  });
  // `tint` is a word the validator accepts; a colour it does not is refused, whole.
  const tinted = traitsWith(withTraitRow({ traits: {}, cues: {} }, peggy.name, { ...committedRow(peggy.name), costume: { ...costume, top: 'tint' } }));
  assert.deepEqual(tinted.errors, []);
  assert.equal(poseOf(tinted.data).costume![COSTUME_SLOTS.indexOf('top')], poseOf(tinted.data).tint);
  const bad = traitsWith(withTraitRow({ traits: {}, cues: {} }, peggy.name, { ...committedRow(peggy.name), costume: { ...costume, cape: '#ffffff' } }));
  assert.equal(bad.errors.length, 1);
  assert.match(bad.errors[0]!.where, /costume\.cape/);
  // The chibi flag stands her in `<model>-chibi` (D98), and she still wears her costume.
  const human = committed.modelId!;
  const chibi = poseOf(traitsWith(withTraitRow({ traits: {}, cues: {} }, peggy.name, { ...committedRow(peggy.name), body: 'chibi' })).data);
  assert.equal(chibi.modelId, MODELS.models[`${human}-chibi`] !== undefined ? `${human}-chibi` : human);
  assert.ok(chibi.costume !== null);
  // "A new trait key needs a row in TuningPanel" (D103), made mechanical: every key
  // validate.ts's TRAIT_KEYS accepts is written in the panel's source.
  const validate = readFileSync(fileURLToPath(new URL('../src/arena/figures/validate.ts', import.meta.url)), 'utf8');
  const keysBlock = /const TRAIT_KEYS = new Set\(\[([\s\S]*?)\]\)/.exec(validate)?.[1] ?? '';
  const keys = [...keysBlock.replace(/\/\/.*$/gm, '').matchAll(/'([a-zA-Z]+)'/g)].map((m) => m[1]!);
  assert.ok(keys.includes('costume') && keys.includes('body'), `TRAIT_KEYS: ${keys.join(', ')}`);
  const workshop = readFileSync(WORKSHOP + 'Workshop.tsx', 'utf8');
  const panel = workshop.slice(workshop.indexOf('function TuningPanel('), workshop.indexOf('function CueTuningPanel('));
  const unwritten = keys.filter((key) => !panel.includes(`'${key}'`));
  assert.deepEqual(unwritten, [], 'a traits.json key the tuning panel has no field for');
  // …and the costume's slots are the arena's list, never one typed here.
  assert.match(panel, /COSTUME_SLOTS\.map\(/);
});

test('workshop: the duelists are a seat’s, not a card’s — the pedestal draws none', () => {
  const pedestal = readFileSync(WORKSHOP + 'Pedestal.tsx', 'utf8');
  assert.ok(!/\bDuelistLayer\b/.test(pedestal), 'the pedestal mounts slice 4’s DuelistLayer');
  assert.match(pedestal, /busts=\{NO_BUSTS\}/);
  assert.match(pedestal, /const NO_BUSTS: DuelistBust\[\] = \[\];/);
});

test('links: #cards’ View in 3D is live for a body or a card’s own cues, grey otherwise — catalog.json’s threeD is roleOf’s answer and cues.json’s names', () => {
  const cued = new Set(Object.keys((cuesJson as unknown as { cards: Record<string, unknown> }).cards));
  let live = 0;
  let grey = 0;
  for (const e of ENTRIES) {
    if (e.group !== 'deck' && e.group !== 'token') continue;
    const bodied = roleOf(e) === 'creature' || roleOf(e) === 'vehicle';
    const want = bodied && !e.missing ? 'figure' : cued.has(e.name) ? 'cues' : null;
    assert.equal(CATALOG.threeD[e.name], want, e.name);
    const link = threeDLinkFor({ name: e.name, faceNames: [], typeLine: e.facts.types });
    assert.equal(link.name, e.name);
    if (want === null) {
      grey += 1;
      assert.equal(link.href, null, e.name);
      assert.match(link.title, /nothing of its own to show in 3D/);
    } else {
      live += 1;
      assert.equal(link.href, workshopHref(e.name));
      // The deep link is the exact name, and the workshop reads it back as the browser would.
      assert.equal(viewFromLocation(link.href!, ''), 'workshop');
      assert.equal(cardFromLocation(link.href!, ''), e.name);
    }
  }
  assert.deepEqual(Object.keys(CATALOG.threeD).length, live + grey);
  console.log(`links: View in 3D live for ${String(live)} of the catalog's ${String(live + grey)} cards, grey for ${String(grey)}`);
  assert.equal(threeDLinkFor({ name: 'Peggy Carter, Secret Agent', faceNames: [], typeLine: 'Legendary Creature — Human Spy Hero' }).kind, 'figure');
  assert.equal(threeDLinkFor({ name: 'Helicarrier Strike', faceNames: [], typeLine: 'Instant' }).kind, 'cues');
  const opt = threeDLinkFor({ name: 'Opt', faceNames: [], typeLine: 'Instant' });
  assert.deepEqual([opt.name, opt.href], ['Opt', null]);
  // A card in no deck under decks/. (It was Lightning Bolt until the Masters of
  // Evil deck, D116, put a Bolt in the catalog.)
  const stranger = threeDLinkFor({ name: 'Black Lotus', faceNames: [], typeLine: 'Artifact' });
  assert.deepEqual([stranger.name, stranger.href], [null, null]);
  assert.match(stranger.title, /^Not in the workshop/);
  // Scryfall's spellings: a token is `Hero` there and `Hero Token` in the corpus; a
  // double-faced card is `A // B` there and its front face in a deck.
  assert.equal(catalogNameFor({ name: 'Hero', faceNames: [], typeLine: 'Token Creature — Hero' }), 'Hero Token');
  assert.equal(catalogNameFor({ name: 'Hero', faceNames: [], typeLine: 'Creature — Hero' }), null);
  assert.equal(catalogNameFor({ name: 'Nick Fury, Spymaster // Back', faceNames: ['Nick Fury, Spymaster', 'Back'], typeLine: 'Creature' }), 'Nick Fury, Spymaster');
});

test('links: the workshop reads card= from the hash’s query first, as #cards reads its own — and #cards?open= is the browser’s deep link', () => {
  assert.equal(cardFromLocation('#workshop?card=Agent+Phil+Coulson', ''), 'Agent Phil Coulson');
  assert.equal(cardFromLocation('#workshop?card=Agent%20Phil%20Coulson', '?card=peggy'), 'Agent Phil Coulson', 'the hash wins');
  assert.equal(cardFromLocation('#workshop', '?card=peggy'), 'peggy', 'the query spelling still works');
  assert.equal(cardFromLocation('', '?view=workshop&card=coulson'), 'coulson');
  assert.equal(cardFromLocation('#workshop?card=', ''), null);
  assert.equal(cardFromLocation('#workshop', ''), null);
  // A malformed escape is decoded leniently, never thrown: the list finds no such card.
  assert.doesNotThrow(() => cardFromLocation('#workshop?card=%E0%A4%A', ''));
  const name = 'Ant-Man’s Air Force & friends: 100%?';
  assert.equal(cardFromLocation(workshopHref(name), ''), name);
  const id = '1383e587-df58-4b45-9067-b9399e90b9ed';
  assert.equal(cardsHref(id), `#cards?open=${id}`);
  assert.equal(viewFromLocation(cardsHref(id), ''), 'cards');
  assert.equal(new URLSearchParams(cardsHref(id).slice(cardsHref(id).indexOf('?') + 1)).get('open'), id);
});

test('workshop: a turned row without its ratio is refused by validateTraits, whole — the copy button is disabled for it', () => {
  // The panel's claim, checked against the arena's validator: `turn` without
  // `turnedRatio` in the SAME row drops the row, so Peggy loses her per-card rung.
  const peggy = entry('Peggy Carter, Secret Agent');
  const card = cardOf(peggy, 1, YOU);
  const bad = traitsWith(withTraitRow({ traits: {}, cues: {} }, peggy.name, { ...committedRow(peggy.name), turn: 30 }));
  assert.equal(bad.errors.length, 1);
  assert.match(bad.errors[0]!.where, /turnedRatio/);
  assert.equal(traitFor(card, bad.data).rungs.includes('card'), false);
  const good = traitsWith(withTraitRow({ traits: {}, cues: {} }, peggy.name, { ...committedRow(peggy.name), turn: 30, turnedRatio: 0.9 }));
  assert.deepEqual(good.errors, []);
  // Workshop.tsx: both copy buttons are disabled while the validator names the card.
  const source = readFileSync(fileURLToPath(new URL('../src/workshop/Workshop.tsx', import.meta.url)), 'utf8');
  assert.equal((source.match(/disabled=\{mine\.length > 0\}/g) ?? []).length, 2, 'the traits and cues copy buttons refuse a refused row');
  assert.ok(!/turnedRatio', s\.turnedRatio \?\? 0\.83/.test(source), 'the turnedRatio field invents 0.83 and calls it inherited');
});

test('workshop: the overrides live in this browser, and a storage that throws is no storage', () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  const overrides = withTraitRow({ traits: {}, cues: {} }, 'Aerial Doombot', { hover: 0.5 });
  writeOverrides(storage, overrides);
  assert.ok(store.has(STORE_KEY));
  assert.deepEqual(readOverrides(storage), overrides);
  writeOverrides(storage, { traits: {}, cues: {} });
  assert.equal(store.has(STORE_KEY), false, 'nothing overridden is nothing stored');
  const hostile = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  };
  assert.deepEqual(readOverrides(hostile), { traits: {}, cues: {} });
  writeOverrides(hostile, overrides);
  assert.deepEqual(parseOverrides('{not json'), { traits: {}, cues: {} });
  assert.deepEqual(parseOverrides('{"traits":{"A":3,"B":{"hover":1}}}'), { traits: { B: { hover: 1 } }, cues: {} });
});

// ---------------------------------------------------------------------------
// The action panel's rows
// ---------------------------------------------------------------------------

test('workshop: a Vehicle is crewed before it attacks or blocks — then it is a creature under its carrier silhouette', () => {
  const heli = entry('S.H.I.E.L.D. Helicarrier');
  assert.equal(roleOf(heli), 'vehicle');
  assert.equal(crewedEntry(heli).facts.types, 'Artifact Creature - Vehicle', 'the corpus’s own crewed type line');
  assert.equal(roleOf(crewedEntry(heli)), 'creature');
  for (const kind of ['crew', 'crewedAttack', 'crewedBlock'] as const) assert.ok(rehearsalsFor(heli).includes(kind), kind);
  // Uncrewed at rest: a silhouette that is not a creature.
  const rest = posesOf(pedestalState(heli)).get(IDS.subject)!;
  assert.deepEqual([rest.vehicle, rest.silhouette], [true, 'carrier']);
  // Crewing: the crew taps, the ability goes on and resolves, the type line changes.
  const crew = rehearse(heli, 'crew', DEFAULT_OPTIONS);
  assert.deepEqual(crew.events.map((e) => e.kind), ['tap', 'cast', 'stats', 'resolved']);
  assert.deepEqual(posesOf(crew.after).get(IDS.subject)?.vehicle, false);
  // Crewed, it attacks: the attack band, the attacking stance, still the carrier.
  const attack = rehearse(heli, 'crewedAttack', DEFAULT_OPTIONS);
  assert.equal(attack.kind, 'crewedAttack');
  assert.deepEqual(attack.events.map((e) => e.kind), ['attackers']);
  const attacking = posesOf(attack.after).get(IDS.subject)!;
  assert.deepEqual([attacking.stance, attacking.silhouette, attacking.vehicle], ['attacking', 'carrier', false]);
  assert.ok(attack.events.flatMap((e) => cuesForEvent(e, attack)).length > 0, 'a crewed attack resolves to a cue');
  // Crewed, it blocks the dummy.
  const block = rehearse(heli, 'crewedBlock', DEFAULT_OPTIONS);
  const blocking = posesOf(block.after).get(IDS.subject)!;
  assert.deepEqual([blocking.stance, blocking.interposesId], ['blocking', IDS.dummy]);
  assert.ok(block.fiction !== null && /crew/.test(block.fiction), 'the panel says it was crewed first');
  // Both seats: each copy crews and attacks its own way.
  const both = rehearse(heli, 'crewedAttack', { ...DEFAULT_OPTIONS, both: true });
  assert.equal(both.events.length, 2);
});

test('workshop: a ring swarm’s clips are marked — the rig is posed and never drawn (D88), with FigureLayer’s own predicate', () => {
  const pose = posesOf(pedestalState(entry("Ant-Man's Air Force"))).get(IDS.subject)!;
  assert.ok(pose.swarm > 0 && pose.formation === 'ring' && pose.modelId !== null);
  const layer = readFileSync(fileURLToPath(new URL('../src/arena/scene/FigureLayer.tsx', import.meta.url)), 'utf8');
  assert.match(layer, /pose\.swarm > 0 && pose\.formation === 'ring'/, 'FigureLayer’s rule moved — re-check Workshop.tsx’s hiddenRig');
  const workshop = readFileSync(fileURLToPath(new URL('../src/workshop/Workshop.tsx', import.meta.url)), 'utf8');
  assert.match(workshop, /restPose\.swarm > 0 && restPose\.formation === 'ring'/);
  assert.match(workshop, /hidden rig: the swarm is procedural/);
});

test('workshop: each cue line says when the ladder’s rung order hid a more specific selector — and a fizzled spell now reads as a fizzle', () => {
  // The workshop found it (its first pass): §7.3 resolves the rung before the
  // selector, so a spell's own bare `resolved` outranked the default
  // `resolved:fizzled` and a fizzled Helicarrier Strike brought its full beam
  // down. The reconciliation gave the three spells that had one their own
  // `resolved:fizzled` (cues.json): the Strike's fizzle is its own row's fizzle.
  const strike = cueRows(entry('Helicarrier Strike'), CUES, FIGURES, MODELS);
  const fizzle = strike.find((r) => r.kind === 'fizzles')!.lines.find((l) => l.event === 'resolved')!;
  assert.deepEqual([fizzle.selector, fizzle.source, fizzle.cue], ['resolved:fizzled', 'card', 'resolved.fizzle']);
  assert.equal(fizzle.outranks, null);
  // Negative control: without the three committed rows it is the defect again —
  // the card's plain strike, and the line says what it outranked.
  const bare = JSON.parse(JSON.stringify(cuesJson)) as { cards: Record<string, Record<string, unknown>> };
  for (const name of ['Helicarrier Strike', 'Pym Particles', 'Depower']) {
    assert.ok(bare.cards[name]!['resolved:fizzled'] !== undefined, `${name} has its own fizzle row`);
    delete bare.cards[name]!['resolved:fizzled'];
  }
  const regressed = cueRows(entry('Helicarrier Strike'), cueDataOf(bare).data, FIGURES, MODELS)
    .find((r) => r.kind === 'fizzles')!
    .lines.find((l) => l.event === 'resolved')!;
  assert.deepEqual([regressed.selector, regressed.source, regressed.cue], ['resolved', 'card', 'fx.strike']);
  assert.deepEqual(regressed.outranks, { selector: 'resolved:fizzled', source: 'default', cue: 'resolved.fizzle' });
  // Every deck spell (the role with a fizzle rehearsal): a fizzled resolution plays
  // `resolved.fizzle` — its own row's or the default's — and never its plain one.
  let spells = 0;
  for (const e of ENTRIES) {
    if (e.missing || e.group !== 'deck' || roleOf(e) !== 'spell') continue;
    spells += 1;
    const line = cueRows(e, CUES, FIGURES, MODELS)
      .find((r) => r.kind === 'fizzles')
      ?.lines.find((l) => l.event === 'resolved');
    assert.ok(line !== undefined, `${e.label}: no fizzle rehearsal`);
    assert.equal(line.cue, 'resolved.fizzle', `${e.label}: a fizzle plays ${line.cue} (${line.source}'s ${line.selector})`);
    assert.equal(line.outranks, null, `${e.label}: its fizzle outranks ${JSON.stringify(line.outranks)}`);
  }
  assert.ok(spells >= 6, `${String(spells)} deck spells`);
  // Its plain resolution hides nothing: `resolved` is the most specific there is.
  const resolves = strike.find((r) => r.kind === 'resolves')!.lines.find((l) => l.event === 'resolved')!;
  assert.equal(resolves.outranks, null);
  // Peggy's attack-alone entry IS the most specific selector.
  const peggy = cueRows(entry('Peggy Carter, Secret Agent'), CUES, FIGURES, MODELS);
  assert.equal(peggy.find((r) => r.kind === 'attackAlone')!.lines[0]!.outranks, null);
  const census = new Map<string, number>();
  for (const e of ENTRIES) {
    if (e.missing || e.group !== 'deck') continue;
    for (const row of cueRows(e, CUES, FIGURES, MODELS)) {
      for (const line of row.lines) {
        if (line.outranks === null) continue;
        const key = `${line.selector} over ${line.outranks.selector}`;
        census.set(key, (census.get(key) ?? 0) + 1);
      }
    }
  }
  console.log(`workshop: rung order over a more specific selector — ${[...census].map(([k, n]) => `${k} ×${String(n)}`).join(', ')}`);
  assert.equal(census.get('resolved over resolved:fizzled'), undefined, 'a deck card’s plain resolution hides its fizzle again');
});

test('workshop: every cues.json entry of every deck card is reached by a rehearsal, and every cue is in the registry', () => {
  const lines: string[] = [];
  for (const e of ENTRIES) {
    if (e.missing || e.group !== 'deck') continue;
    const rows = cueRows(e, CUES, FIGURES, MODELS);
    for (const row of rows) for (const line of row.lines) assert.ok(line.known, `${e.label}: ${line.cue} is not in the registry`);
    const unreached = unreachedSelectors(e, rows, CUES);
    assert.deepEqual(unreached, [], `${e.label}: cues.json keys no rehearsal reaches`);
    const own = rows.flatMap((r) => r.lines.filter((l) => l.source === 'card').map((l) => `${l.selector}→${l.cue}`));
    if (own.length > 0) lines.push(`  ${e.label.padEnd(30)} ${[...new Set(own)].join(', ')}`);
  }
  console.log(`workshop: the per-card cues each deck card's rehearsals reach\n${lines.join('\n')}`);
  // The clip words resolve the card's alias against the model.
  const agent13 = cueRows(entry('Agent 13, Sharon Carter'), CUES, FIGURES, MODELS);
  const attack = agent13.find((r) => r.kind === 'attackAlone')!.lines[0]!;
  assert.match(attack.clip, /attack → pistolDraw/);
});

// ---------------------------------------------------------------------------
// The legibility meter agrees with traits.test.ts's raster
// ---------------------------------------------------------------------------

test('workshop: the legibility meter counts what traits.test.ts counts, pixel for pixel', async () => {
  const { measure } = await import('../src/workshop/legibility.ts');
  const raster = await import('./prop-raster.ts');
  const library = await raster.loadLibrary();
  const table = raster.cameraAt(VIEW_BY_ID.table.pose);
  const checked: string[] = [];
  for (const name of ['Peggy Carter, Secret Agent', 'Agent Phil Coulson', 'Aerial Doombot', 'Nick Fury, Spymaster']) {
    const e = entry(name);
    const rows = measure({ entry: e, figures: FIGURES, models: MODELS, traits: TRAITS, presence: PRESENCE, library, turn: 0 });
    for (const seat of ['you', 'opp'] as const) {
      for (const tapped of [false, true]) {
        const state = soloState(e, seat, tapped ? 'tapped' : 'ready');
        const pose = raster.posesOf(state).get(seat === 'you' ? IDS.subject : IDS.oppSubject)!;
        const layers = raster.figureLayers(pose, library);
        const seen = raster.visibility(table, layers, raster.kindGroups(layers));
        for (const prop of pose.props) {
          const theirs = seen.get(prop.kind)?.pixels ?? 0;
          const mine = rows.find((r) => r.kind === prop.kind)?.seen[seat][tapped ? 'kneeling' : 'standing'].pixels;
          assert.equal(mine, theirs, `${name} ${prop.kind} ${seat}${tapped ? ' kneeling' : ''}`);
          checked.push(`${name.split(',')[0]} ${prop.kind} ${seat}${tapped ? '·k' : ''} ${String(theirs)}`);
        }
      }
    }
  }
  console.log(`workshop meter = prop-raster over ${String(checked.length)} readings: ${checked.slice(0, 8).join(' · ')} …`);
  assert.ok(checked.length >= 30);
});

// ---------------------------------------------------------------------------
// Liveness: the workshop is a renderer and a data editor, never a game
// ---------------------------------------------------------------------------

const WORKSHOP = fileURLToPath(new URL('../src/workshop/', import.meta.url));

function workshopFiles(): Array<{ path: string; source: string; code: string }> {
  const out: Array<{ path: string; source: string; code: string }> = [];
  for (const name of readdirSync(WORKSHOP).sort()) {
    if (statSync(WORKSHOP + name).isDirectory()) continue;
    if (!name.endsWith('.ts') && !name.endsWith('.tsx')) continue;
    const source = readFileSync(WORKSHOP + name, 'utf8');
    out.push({ path: name, source, code: source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '') });
  }
  return out;
}

function importsOf(source: string): Array<{ from: string; names: string[]; typeOnly: boolean; attrs: boolean }> {
  const out: Array<{ from: string; names: string[]; typeOnly: boolean; attrs: boolean }> = [];
  const re = /import\s+(type\s+)?([\s\S]*?)\s+from\s+'([^']+)'(\s+with\s*\{[^}]*\})?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const names = (m[2] ?? '')
      .replace(/[{}]/g, ' ')
      .split(/[\s,]+/)
      .map((n) => n.replace(/^type$/, ''))
      .filter((n) => n !== '' && n !== 'as' && n !== '*');
    out.push({ from: m[3] ?? '', names, typeOnly: m[1] !== undefined, attrs: m[4] !== undefined });
  }
  const dynamic = /import\('([^']+)'\)/g;
  while ((m = dynamic.exec(source)) !== null) out.push({ from: m[1] ?? '', names: [], typeOnly: false, attrs: false });
  return out;
}

test('liveness: the workshop imports no transport, never the board, and makes a ClientState only in synthetic.ts', () => {
  const files = workshopFiles();
  assert.ok(files.length >= 12, `expected the workshop, saw ${String(files.length)} files`);
  for (const file of files) {
    for (const imported of importsOf(file.code)) {
      assert.ok(!imported.from.includes('transport/'), `${file.path} imports ${imported.from}`);
      assert.ok(!imported.from.includes('/Board.tsx'), `${file.path} imports the 2D board`);
      if (imported.from.endsWith('reduce.ts') && !imported.typeOnly) {
        assert.equal(file.path, 'synthetic.ts', `${file.path} imports the reducer as a value — only synthetic.ts folds frames`);
      }
    }
  }
});

test('liveness: no fetch, no socket, no timer and no URL of its own anywhere in the workshop', () => {
  for (const file of workshopFiles()) {
    assert.ok(!/\bfetch\(/.test(file.code), `${file.path} fetches — art comes through art.ts, models through the arena's loader`);
    assert.ok(!/\bWebSocket\b|\bEventSource\b|\bXMLHttpRequest\b/.test(file.code), `${file.path} opens a connection`);
    assert.ok(!/\bsetTimeout\(|\bsetInterval\(|requestAnimationFrame\(|requestIdleCallback\(/.test(file.code), `${file.path} starts a timer — the only clock is the queue's, driven by CueRunner`);
    // A credit link is an href a person clicks; nothing else may carry a scheme.
    const urls = [...file.code.matchAll(/['"`](\w+:\/\/[^'"`]*)['"`]|href="(https?:[^"]*)"/g)].map((m) => m[1] ?? m[2]);
    for (const url of urls) assert.equal(url, 'https://scryfall.com', `${file.path} carries ${String(url)}`);
  }
});

test('liveness: one useFrame in the workshop — the renderer, after CueRunner — and every mixer.update is 0', () => {
  const frames: string[] = [];
  for (const file of workshopFiles()) {
    const calls = file.code.match(/\buseFrame\(/g) ?? [];
    for (let i = 0; i < calls.length; i++) frames.push(file.path);
    for (const m of file.code.matchAll(/mixer\.update\(([^)]*)\)/g)) assert.equal(m[1]?.trim(), '0', `${file.path}: mixer.update(${String(m[1])})`);
    assert.ok(!/useAnimations|useGLTF/.test(file.code), `${file.path} uses a drei animation/loader hook`);
  }
  assert.deepEqual(frames, ['Pedestal.tsx']);
  const pedestal = readFileSync(WORKSHOP + 'Pedestal.tsx', 'utf8');
  assert.match(pedestal, /\}, 1\);\s*return null;/, 'the renderer runs at priority 1, after CueRunner has posed the frame');
  assert.match(pedestal, /<CueRunner\b/, 'the pedestal is driven by the arena’s own frame loop');
});

test('liveness: the pure modules import no three and no React', () => {
  for (const file of workshopFiles()) {
    if (['Workshop.tsx', 'Pedestal.tsx', 'legibility.ts', 'data.ts'].includes(file.path)) continue;
    for (const imported of importsOf(file.code)) {
      assert.ok(imported.from !== 'three' && !imported.from.startsWith('three/'), `${file.path} imports three`);
      assert.ok(!imported.from.startsWith('react') && !imported.from.includes('@react-three'), `${file.path} imports React`);
      assert.ok(!imported.from.endsWith('.tsx'), `${file.path} imports a component`);
    }
  }
});

test('liveness: the workshop is lazy — only main.tsx reaches it, only through import(), and the arena never does', () => {
  const src = fileURLToPath(new URL('../src/', import.meta.url));
  const main = readFileSync(src + 'main.tsx', 'utf8');
  assert.match(main, /lazy\(\(\) => import\('\.\/workshop\/Workshop\.tsx'\)\)/);
  assert.ok(!/from '\.\/workshop\//.test(main), 'main.tsx imports the workshop statically');
  for (const file of ['useView.ts', 'keys.ts']) {
    assert.ok(!/workshop\//.test(readFileSync(src + file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')), `${file} imports the workshop`);
  }
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => (statSync(dir + n).isDirectory() ? walk(`${dir}${n}/`) : [dir + n]));
  for (const path of walk(src + 'arena/')) {
    if (!/\.tsx?$/.test(path)) continue;
    assert.ok(!/from '[^']*workshop\//.test(readFileSync(path, 'utf8')), `${path} imports the workshop — it is downstream of the arena, never upstream`);
  }
});

test('liveness: the card browser reaches the workshop only through links.ts — which imports the catalog and nothing that draws', () => {
  const links = workshopFiles().find((f) => f.path === 'links.ts')!;
  assert.deepEqual(
    importsOf(links.code).map((i) => `${i.typeOnly ? 'type ' : ''}${i.from}`).sort(),
    ['./catalog.json', 'type ./catalogBuild.ts'],
    'links.ts is imported by the card browser’s chunk: only the generated catalog, and a type',
  );
  const cards = fileURLToPath(new URL('../src/cards/', import.meta.url));
  const reached = new Set<string>();
  for (const name of readdirSync(cards)) {
    if (!/\.tsx?$/.test(name)) continue;
    for (const imported of importsOf(readFileSync(cards + name, 'utf8'))) {
      if (imported.from.includes('workshop/')) reached.add(`${name} → ${imported.from}`);
    }
  }
  assert.deepEqual([...reached], ['CardDetail.tsx → ../workshop/links.ts']);
});

test('liveness: every arena export the workshop uses is named in Workshop.tsx’s coupling header', () => {
  const header = (readFileSync(WORKSHOP + 'Workshop.tsx', 'utf8').match(/^\/\*[\s\S]*?\*\//) ?? [''])[0];
  const missing: string[] = [];
  const jsonForm = new Map<string, boolean>();
  for (const file of workshopFiles()) {
    for (const imported of importsOf(file.code)) {
      if (!imported.from.includes('/arena/')) continue;
      if (imported.from.endsWith('.json')) {
        const name = imported.from.replace(/^.*\//, '');
        if (!header.includes(name)) missing.push(`${file.path}: ${name}`);
        jsonForm.set(`${file.path}:${name}`, imported.attrs);
        continue;
      }
      for (const name of imported.names) {
        if (!new RegExp(`\\b${name}\\b`).test(header)) missing.push(`${file.path}: ${name} (${imported.from})`);
      }
    }
  }
  assert.deepEqual(missing, [], 'an arena export the workshop depends on is not in the list the slice-4 rebase re-checks');
  // The arena's JSON is imported the way the arena imports it (the bundler warns
  // when one module is imported two ways): traits.json with attributes, the
  // other three without.
  for (const [where, attrs] of jsonForm) assert.equal(attrs, where.endsWith('traits.json'), where);
});

// ---------------------------------------------------------------------------
// The workshop's keys: one table, each row carrying its action
// ---------------------------------------------------------------------------

test('workshop keys: one table, each row carrying its action — the handler has no branch per key', () => {
  const seen = new Map<string, string>();
  const plain = { ctrlKey: false, metaKey: false, altKey: false, target: null };
  for (const row of WORKSHOP_KEYMAP) {
    for (const key of row.keys) {
      assert.ok(!seen.has(key), `${key} is in two rows (${String(seen.get(key))}, ${row.action})`);
      seen.set(key, row.action);
      assert.equal(workshopRowFor(key), row);
      assert.equal(workshopActionFor({ ...plain, key }), row.action, key);
    }
  }
  assert.equal(new Set(WORKSHOP_KEYMAP.map((r) => r.action)).size, WORKSHOP_KEYMAP.length, 'two rows share an action');
  // Not ours: a browser shortcut, a text field, Space on a focused button.
  assert.equal(workshopActionFor({ ...plain, key: 'k', ctrlKey: true }), null);
  assert.equal(workshopActionFor({ ...plain, key: 'k', target: { tagName: 'INPUT' } }), null);
  assert.equal(workshopActionFor({ ...plain, key: '.', target: { tagName: 'TEXTAREA' } }), null);
  assert.equal(workshopActionFor({ ...plain, key: ' ', target: { tagName: 'BUTTON' } }), null);
  assert.equal(workshopActionFor({ ...plain, key: '.', target: { tagName: 'BUTTON' } }), 'step');
  assert.equal(workshopActionFor({ ...plain, key: 'q' }), null);
  // Workshop.tsx: an action → handler Record (every action handled, by type and
  // by name), the legend drawn from the table, and no `case '<key>'` anywhere.
  const source = readFileSync(fileURLToPath(new URL('../src/workshop/Workshop.tsx', import.meta.url)), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/\bcase\s+['"]/.test(code), 'a switch on key names is back in Workshop.tsx');
  assert.match(code, /const actions: Record<WorkshopKeyAction, \(\) => void> = \{/);
  for (const row of WORKSHOP_KEYMAP) assert.match(code, new RegExp(`\\b${row.action}: \\(\\) =>`), `no handler for ${row.action}`);
  assert.match(code, /WORKSHOP_KEYMAP\.map\(\(row\) =>/, 'the legend is not drawn from the table');
  assert.ok(!/WORKSHOP_KEYS\b/.test(code), 'the second key list is back');
});

// ---------------------------------------------------------------------------
// The route: useView's fourth view
// ---------------------------------------------------------------------------

test('useView: the workshop’s spellings, beside the card browser’s and the arena’s, and the hash over the query', () => {
  for (const hash of ['#workshop', '#WORKSHOP', '#/workshop', '#!workshop', '##workshop', '#workshop?card=peggy', '# workshop ']) {
    assert.equal(viewFromLocation(hash, ''), 'workshop', hash);
  }
  for (const search of ['?view=workshop', '?view=WORKSHOP', '?view= workshop ', '?replay=games/g1.jsonl&view=workshop']) {
    assert.equal(viewFromLocation('', search), 'workshop', search);
  }
  // The hash wins over the query, whichever view either names.
  assert.equal(viewFromLocation('#workshop', '?view=arena'), 'workshop');
  assert.equal(viewFromLocation('#workshop', '?view=cards'), 'workshop');
  assert.equal(viewFromLocation('#arena', '?view=workshop'), 'arena');
  assert.equal(viewFromLocation('#cards', '?view=workshop'), 'cards');
  assert.equal(viewFromLocation('#/cards?q=agent', '?view=workshop'), 'cards');
  // A typo is the board, and `?view=` takes the bare word only.
  for (const [hash, search] of [['#workshops', ''], ['#work', ''], ['', '?view=/workshop'], ['', '?view=work'], ['#board', '?view=workshop']] as const) {
    assert.equal(viewFromLocation(hash, search), 'board', `${hash} ${search}`);
  }
  // Every view round-trips through its own hash.
  for (const view of ['board', 'arena', 'cards', 'workshop'] as const) {
    assert.equal(viewFromLocation(hashForView(view), ''), view, view);
  }
  assert.equal(hashForView('workshop'), '#workshop');
});

// ---------------------------------------------------------------------------
// The list's thumbnail: the one card image outside a renderer, and why
// ---------------------------------------------------------------------------

test('liveness: the list thumbnail is the workshop’s one card image outside CardPlane, and a concealed entry never looks its art up', () => {
  let images = 0;
  for (const file of workshopFiles()) {
    images += (file.code.match(/\bimageUrl\(/g) ?? []).length;
    for (const line of file.code.split('\n')) {
      if (/\blookupArt\(/.test(line)) assert.match(line, /concealed === null \?/, `${file.path}: an unguarded lookupArt: ${line.trim()}`);
    }
    for (const imported of importsOf(file.code)) {
      assert.ok(!/CardTile|CardView/.test(imported.from), `${file.path} imports ${imported.from} — the 2D card renderers are not the workshop's`);
      if (imported.from.includes('/render/')) assert.ok(imported.from.endsWith('/render/labels.ts'), `${file.path} imports ${imported.from}`);
    }
  }
  assert.equal(images, 1, 'one list thumbnail — a second card-image surface is a decision (CLAUDE.md, M4 convention 2)');
  const claude = readFileSync(fileURLToPath(new URL('../../CLAUDE.md', import.meta.url)), 'utf8');
  assert.match(claude, /The workshop \(`#workshop`\) draws its\s+card LIST's thumbnails/, 'the exemption is not written down in M4 convention 2');
});

