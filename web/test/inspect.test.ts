/*
 * mtg-table — web/test/inspect.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Inspect from the table** (D241): `arena/inspect.ts`'s planner decides what the
 * arena's `I` and its inspect chip open — the workshop's inspect view on a named,
 * face-up card with a figure — and it is hard rule 8's renderer half for that
 * entry: a face-down, hidden or redacted card is inert, with the reason, and its
 * name is never read. Held three ways:
 *
 *  - the planner on its own, one gate at a time;
 *  - over every `state` frame of the committed corpus, made HOSTILE (every back
 *    and every stub handed a real name, every third face-up creature turned face
 *    down with one): no placement drawn as a back or a stub ever yields an
 *    inspect, while an UNGATED planner (the name read first) does — the negative
 *    control — and the plain corpus yields real inspects on face-up figures;
 *  - the href: `inspectHref` is the workshop's own `workshopHref(name,
 *    'inspect')`, and the workshop reads the card and the view back from it.
 */

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import { figurePose, type FigureLayout, type FigurePose } from '../src/arena/figures/pose.ts';
import { validateFigures, validateModels } from '../src/arena/figures/validate.ts';
import { HIDDEN_NOT_INSPECTED, NOTHING_TO_INSPECT, inspectContextOf, inspectHref, inspectTargetOf, type InspectTarget } from '../src/arena/inspect.ts';
import { layout, type Layout, type Placement } from '../src/arena/layout.ts';
import { isHidden, type AnyCard, type Frame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';
import { viewFromLocation } from '../src/useView.ts';
import { WORKSHOP_VIEW_INSPECT, cardFromLocation, workshopHref, workshopViewFromLocation } from '../src/workshop/links.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const MODELS = validateModels(modelsJson).data;
const DATA = validateFigures(figuresJson, { modelIds: new Set(Object.keys(MODELS.models)) }).data;
const SECRET = '\u0000inspect-secret-';

const card = (id: number, name: string, extra: Record<string, unknown> = {}): AnyCard =>
  ({ id, name, zone: 'battlefield', owner: 0, controller: 0, types: 'Creature - Human', power: '2', toughness: '2', ...extra }) as unknown as AnyCard;
const place = (id: number, c: AnyCard, back = false): Placement =>
  ({ key: `c:${String(id)}`, cardId: id, card: c, kind: 'creature', back, seat: 'you' }) as unknown as Placement;
const pose = (id: number, over: Partial<FigurePose> = {}): FigurePose =>
  ({ cardId: id, anonymous: false, modelId: 'agent', silhouette: null, swarm: 0, vehicle: false, ...over }) as unknown as FigurePose;

test('inspect: the planner on its own — nothing, a back, a stub, no figure, the anonymous disc, an empty name, and a face-up figure', () => {
  assert.deepEqual(inspectTargetOf(null, undefined), { kind: 'inert', why: NOTHING_TO_INSPECT });
  const doom = card(1, 'Doctor Doom');
  assert.deepEqual(inspectTargetOf(place(1, doom, true), pose(1)), { kind: 'inert', why: HIDDEN_NOT_INSPECTED }, 'a back, even with a named pose under it');
  const stub = { id: 2, zone: 'battlefield', owner: 1, controller: 1, hidden: true, name: 'Doctor Doom' } as unknown as AnyCard;
  assert.deepEqual(inspectTargetOf(place(2, stub), pose(2)), { kind: 'inert', why: HIDDEN_NOT_INSPECTED }, 'a redacted stub, even handed a name');
  for (const [what, p] of [
    ['no figure', undefined],
    ['the anonymous disc', pose(1, { anonymous: true })],
    ['no model', pose(1, { modelId: null })],
  ] as const) {
    const target = inspectTargetOf(place(1, doom), p);
    assert.equal(target.kind, 'inert', what);
    assert.match(target.kind === 'inert' ? target.why : '', /no figure to inspect/, what);
  }
  assert.deepEqual(inspectTargetOf(place(1, card(1, '')), pose(1)), { kind: 'inert', why: HIDDEN_NOT_INSPECTED }, 'the face-down empty name');
  const hit = inspectTargetOf(place(1, doom), pose(1));
  assert.deepEqual(hit, { kind: 'inspect', name: 'Doctor Doom', href: '#workshop?card=Doctor+Doom&view=inspect' });
  assert.deepEqual(inspectContextOf(hit), { href: '#workshop?card=Doctor+Doom&view=inspect', name: 'Doctor Doom' });
  assert.deepEqual(inspectContextOf({ kind: 'inert', why: 'x' }), { why: 'x' });
});

test('inspect: the href is the workshop’s own deep link, and the workshop reads the card and the inspect view back from it', () => {
  for (const name of ['Doctor Doom', 'Nick Fury, Spymaster', "T'Challa, the Black Panther", 'Ant-Man, Reformed Rogue', 'Hero Token', 'A & B?#=']) {
    const href = inspectHref(name);
    assert.equal(href, workshopHref(name, WORKSHOP_VIEW_INSPECT), `${name}: the two spellings`);
    assert.equal(viewFromLocation(href, ''), 'workshop', `${name}: the page's view`);
    assert.equal(cardFromLocation(href, ''), name, `${name}: the card read back`);
    assert.equal(workshopViewFromLocation(href, ''), WORKSHOP_VIEW_INSPECT, `${name}: the inspect view read back`);
  }
  // The workshop's plain link asks for no view, and the page's own `?view=workshop` is not an inspect.
  assert.equal(workshopViewFromLocation(workshopHref('Doctor Doom'), ''), null);
  assert.equal(workshopViewFromLocation('#workshop', '?view=workshop&card=Doctor+Doom'), null);
  assert.equal(workshopViewFromLocation('#workshop', '?card=Doctor+Doom&view=inspect'), WORKSHOP_VIEW_INSPECT);
});

// ---------------------------------------------------------------------------
// Hard rule 8 over the corpus, made hostile
// ---------------------------------------------------------------------------

/** Every back and stub gets a real name; every third face-up creature or stack card turns face down with one. */
function hostile(placed: Layout): Layout {
  const placements: Placement[] = placed.placements.map((p) => {
    const secret = `${SECRET}${String(p.cardId)}`;
    if (p.back || isHidden(p.card)) return { ...p, card: { ...p.card, name: secret } as AnyCard };
    if ((p.kind === 'creature' || p.kind === 'stack') && p.cardId % 3 === 0) return { ...p, back: true, card: { ...p.card, name: secret } as AnyCard };
    return p;
  });
  return { ...placed, placements, byKey: new Map(placements.map((p) => [p.key, p])) };
}

function* corpusStates(): Generator<{ file: string; state: ClientState }> {
  for (const dir of ['games', 'synthetic']) {
    const root = join(REPO, 'fixtures', dir);
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root).filter((f) => f.endsWith('.jsonl')).sort()) {
      const log = parseFrameLog(readFileSync(join(root, name), 'utf8'));
      let state = initialState();
      for (const frame of log.frames as Frame[]) {
        state = reduce(state, frame);
        if (frame.type === 'state') yield { file: `${dir}/${name}`, state };
      }
    }
  }
}

/** The planner with its gates taken out: the name first. The negative control. */
function ungated(placement: Placement, p: FigurePose | undefined): InspectTarget {
  const name = (placement.card as { name?: unknown }).name;
  if (typeof name === 'string' && name !== '' && p !== undefined) return { kind: 'inspect', name, href: inspectHref(name) };
  return { kind: 'inert', why: 'ungated' };
}

test('inspect: over the whole corpus made HOSTILE, no face-down, hidden or redacted placement ever yields an inspect — an ungated planner would (hard rule 8, negative control)', () => {
  let frames = 0;
  let hiddenAsked = 0;
  let inspects = 0;
  let leaks = 0;
  let mismatched = 0;
  for (const { file, state } of corpusStates()) {
    frames += 1;
    const plain = layout(state);
    const plainPoses = figurePose(plain, state.board?.combat ?? null, DATA, { models: MODELS });
    const turned = hostile(plain);
    // The frame as it is; the hostile frame with its own poses; the hostile placements under the PLAIN poses
    // (a named, modelled pose on a placement drawn as a back or a stub — only the placement gate stops that).
    for (const [placed, given] of [
      [plain, plainPoses],
      [turned, null],
      [turned, plainPoses],
    ] as const) {
      const poses: FigureLayout = given ?? figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS });
      for (const placement of placed.placements) {
        const p = poses.get(placement.cardId);
        const target = inspectTargetOf(placement, p);
        const concealed = placement.back || isHidden(placement.card);
        if (concealed) {
          hiddenAsked += 1;
          assert.equal(target.kind, 'inert', `${file}: card ${String(placement.cardId)}, drawn as a back or a stub, yields an inspect`);
          if (given !== null && placed === turned && p !== undefined && !p.anonymous) mismatched += 1;
          if (ungated(placement, p).kind === 'inspect') leaks += 1;
        } else if (target.kind === 'inspect') {
          assert.ok(!target.name.startsWith(SECRET) && target.name !== '', `${file}: an inspect names a concealed card`);
          assert.ok(p !== undefined && !p.anonymous && p.modelId !== null, `${file}: an inspect with no named figure`);
          inspects += 1;
        }
      }
    }
  }
  console.log(
    `inspect: ${String(frames)} corpus frames (× plain, hostile, hostile under the plain poses) — ${String(hiddenAsked)} concealed placements all inert ` +
      `(${String(mismatched)} of them over a named pose), ${String(inspects)} face-up figures inspectable; the ungated planner would have opened ${String(leaks)} concealed cards`,
  );
  assert.ok(frames > 1000, `expected the committed corpus, saw ${String(frames)} frames`);
  assert.ok(hiddenAsked > 1000, 'the corpus offered no concealed placement');
  assert.ok(mismatched > 100, 'the pairing only the placement gate stops offered it no case');
  assert.ok(inspects > 1000, 'the planner opened nothing — the sweep proves nothing');
  assert.ok(leaks > 100, 'the negative control: an ungated planner must open concealed cards over this corpus');
});
