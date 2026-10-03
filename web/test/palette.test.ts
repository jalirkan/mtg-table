/*
 * mtg-table — web/test/palette.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The art-derived palette** (lane BODIES, report 15 §7; D160), under
 * `node --test`: the pure k-means is deterministic and finds what the report
 * measured (the background is the dominant colour, the vivid cluster the
 * accent); the art rung sits UNDER every hand-written rung; and over the whole
 * corpus a palette is looked up for every card drawn face up and never for a
 * card drawn as a back (hard rule 8). The pixels here are synthetic — no card
 * art is read, and none is committed.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import { paletteNamesOf } from '../src/arena/art.ts';
import { tileDataOf } from '../src/arena/figures/types.ts';
import {
  ART_WINDOW,
  artRow,
  artTint,
  paletteFromPixels,
  type ArtPalette,
} from '../src/arena/figures/palette.ts';
import { figurePose, paletteFor } from '../src/arena/figures/pose.ts';
import { tilePose } from '../src/arena/figures/tiles.ts';
import { TRAITS, traitFor } from '../src/arena/figures/traits.ts';
import { validateFigures, validateModels, validateTraits } from '../src/arena/figures/validate.ts';
import { layout, type Layout, type Placement } from '../src/arena/layout.ts';
import { isHidden, type AnyCard, type Frame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const MODELS = validateModels(modelsJson).data;
const DATA = validateFigures(figuresJson, { modelIds: new Set(Object.keys(MODELS.models)) }).data;
const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

/** A synthetic "painting": bands of colour with the given shares, `w × h`. */
function bands(w: number, h: number, parts: Array<[number, number, number, number]>): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4);
  const total = parts.reduce((a, p) => a + p[3], 0);
  let row = 0;
  for (const [r, g, b, share] of parts) {
    const rows = Math.round((share / total) * h);
    for (let y = row; y < Math.min(h, row + rows); y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = 255;
      }
    }
    row += rows;
  }
  // Any rounding remainder takes the last colour.
  for (let y = row; y < h; y++) {
    const last = parts[parts.length - 1]!;
    for (let x = 0; x < w; x++) out.set([last[0], last[1], last[2], 255], (y * w + x) * 4);
  }
  return out;
}

test('palette: the k-means is deterministic, and the art box is where it reads', () => {
  const pixels = bands(40, 60, [
    [16, 20, 24, 55],
    [224, 138, 44, 25],
    [128, 132, 136, 20],
  ]);
  const a = paletteFromPixels(pixels, 40, 60);
  const b = paletteFromPixels(pixels, 40, 60);
  assert.ok(a !== null);
  assert.deepEqual(a, b, 'the same pixels gave two palettes');
  // Fury's case (report 15 §7.1): the largest cluster is the dark ground, the
  // accent is the vivid orange, the terrain is not the near-black.
  assert.equal(a.dominant, '#101418');
  assert.equal(a.accent, '#e08a2c');
  assert.equal(a.vivid, true);
  assert.notEqual(a.terrain, '#101418');
  // Shares add to one, largest first.
  assert.ok(Math.abs(a.swatches.reduce((s, w) => s + w.share, 0) - 1) < 1e-9);
  for (let i = 1; i < a.swatches.length; i++) assert.ok(a.swatches[i - 1]!.share >= a.swatches[i]!.share);
  // A grey-sky card has nothing vivid: its accent is its dominant, and the art
  // offers no tint (the colour identity then says more than a grey sky).
  const grey = paletteFromPixels(bands(20, 20, [[74, 80, 82, 60], [99, 105, 106, 40]]), 20, 20)!;
  assert.equal(grey.vivid, false);
  assert.equal(artTint(grey), null);
  assert.equal(artTint(a), a.accent);
  // D164 (follow-up 7): of two clusters equally saturated, a BRIGHT one beats a
  // larger dim one — Fury's explosion over the khaki round it (report 15 §7.1's
  // #897748 18 % against #daad6d 15 %).
  const fury = paletteFromPixels(bands(20, 100, [[9, 16, 17, 67], [137, 119, 72, 18], [218, 173, 109, 15]]), 20, 100)!;
  assert.equal(fury.vivid, true);
  assert.equal(fury.accent, '#daad6d', 'the bright explosion is the accent, not the larger khaki');
  // The window: a frame of pure red round a blue picture reads blue.
  const framed = new Uint8ClampedArray(100 * 100 * 4);
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const inside = x >= 10 && x < 90 && y >= 12 && y < 54;
      framed.set(inside ? [30, 60, 230, 255] : [240, 10, 10, 255], (y * 100 + x) * 4);
    }
  }
  assert.equal(paletteFromPixels(framed, 100, 100, { window: ART_WINDOW })!.dominant, '#1e3ce6');
  // Transparent pixels are skipped; an image with none opaque has no palette.
  assert.equal(paletteFromPixels(new Uint8ClampedArray(16 * 4), 4, 4), null);
});

test('palette: the art rung sits UNDER every hand-written rung, and `palette: off` takes it away', () => {
  const fake: ArtPalette = paletteFromPixels(bands(10, 10, [[20, 20, 20, 50], [40, 200, 90, 50]]), 10, 10)!;
  assert.equal(fake.accent, '#28c85a');
  const card = (name: string, types: string) =>
    ({ id: 1, name, types, manaCost: '{1}{W}', zone: 'battlefield', owner: 0, controller: 0 }) as unknown as Parameters<typeof traitFor>[0];
  // No row anywhere: the art's accent.
  const plain = traitFor(card('A New Set Card', 'Creature - Beast'), TRAITS, artRow(fake));
  assert.equal(plain.spec.accent, fake.accent);
  assert.deepEqual(plain.rungs, ['art']);
  // A hand-written accent wins (Fury's is his coat's black).
  const fury = traitFor(card('Nick Fury, Spymaster', 'Legendary Creature - Human Spy Hero'), TRAITS, artRow(fake));
  assert.equal(fury.spec.accent, '#15181e');
  assert.equal(fury.rungs[0], 'art', 'the art is the LOWEST rung');
  // `palette: off` on a row above takes the rung away.
  const off = validateTraits({ version: 1, cards: { 'A New Set Card': { palette: 'off' } } }).data;
  const without = traitFor(card('A New Set Card', 'Creature - Beast'), off, artRow(fake));
  assert.equal(without.spec.accent, null);
  assert.equal(without.rungs.includes('art'), false);
});

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

/** A palette map that answers every name and remembers which it was asked for. */
class SpyPalettes extends Map<string, ArtPalette> {
  readonly asked = new Set<string>();
  private readonly answer: ArtPalette;
  constructor(answer: ArtPalette) {
    super();
    this.answer = answer;
  }
  override get(name: string): ArtPalette | undefined {
    this.asked.add(name);
    return this.answer;
  }
}

test('palette: over the corpus, the poses ask for every face-up card’s palette and take the answer, and a card drawn as a back never looks one up (hard rule 8)', () => {
  // What this proves is the PLUMBING, not that every card has art: the spy map
  // answers every name it is asked. In the arena a name the art index has no
  // entry for — the corpus's tokens (Soldier, Robot, Hero, Clue and Saproling
  // Token; docs/evidence/bodies.md §9) — gets no palette, and its figure keeps its
  // hand-written or colour-identity tint: a state, not an error.
  const answer = paletteFromPixels(bands(10, 10, [[20, 20, 20, 60], [230, 60, 40, 40]]), 10, 10)!;
  const tiles = tileDataOf(DATA);
  let frames = 0;
  let faceUpFigures = 0;
  let resolved = 0;
  let backs = 0;
  let asked = 0;
  for (const { file, state } of fixtureStates()) {
    frames += 1;
    const placed = layout(state);
    const spy = new SpyPalettes(answer);
    const poses = figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS, palettes: spy });
    tilePose(placed, tiles, spy);
    const faceUp = new Set<string>();
    for (const placement of placed.placements) {
      if (placement.back || isHidden(placement.card)) {
        backs += 1;
        continue;
      }
      const name = (placement.card as { name?: string }).name;
      if (typeof name === 'string' && name !== '') faceUp.add(name);
    }
    for (const name of spy.asked) {
      asked += 1;
      assert.ok(name !== '', `${file}: a palette was asked for with no name — a face-down card`);
      assert.ok(faceUp.has(name), `${file}: a palette was asked for "${name}", which is not drawn face up`);
    }
    for (const pose of poses.values()) {
      if (pose.anonymous) {
        assert.equal(pose.art, null, `${file}: an anonymous figure carries an art colour`);
        continue;
      }
      faceUpFigures += 1;
      // `art` is the rung's accent whenever the card lets the rung speak.
      if (pose.art !== null) resolved += 1;
    }
    // The arena's own entry point asks for exactly the face-up names of what it draws.
    for (const name of paletteNamesOf(placed)) assert.ok(faceUp.has(name), `${file}: paletteNamesOf named "${name}"`);
  }
  console.log(
    `palette: ${String(frames)} board frames — ${String(faceUpFigures)} face-up figure-instances, ${String(resolved)} with the art rung; ` +
      `${String(backs)} placements drawn as a back, none looked up; ${String(asked)} lookups, every one of a face-up name`,
  );
  assert.ok(frames > 3000, `only ${String(frames)} frames`);
  assert.ok(backs >= 1138, 'the morph fixtures are not being read');
  assert.equal(resolved, faceUpFigures, 'a face-up figure the map answered for did not take its palette');
});

/**
 * **A HOSTILE layout** — the corpus never puts a real name on a card drawn as a
 * back (a face-down card arrives with `name: ""`, a redacted stub with none), so
 * the corpus test above proves the wire's shape and not the gates. This builds the
 * shapes the gates exist for, and **each category is stopped by exactly ONE gate**
 * — so removing any one gate from `paletteNamesOf`, `paletteFor` or `tilePose`
 * leaks through the category built for it (the merge pass ran the removals one at
 * a time; `docs/evidence/bodies.md`, *At merge*):
 *
 *  - `<kind>Back` — every third face-up creature, attachment, land and spell drawn
 *    as a BACK that keeps a secret name: not hidden, not nameless, so only the
 *    `back` test stands between it and a lookup;
 *  - `stub` — every redacted stub (drawn as a back already) handed a secret name;
 *  - `stubUnflagged` — a redacted stub in a FACE-UP slot, carrying a name: a layout
 *    that forgot `back` for a stub, so only `isHidden` stops it;
 *  - `nameless` — a face-up card with the face-down characteristic's EMPTY name
 *    (hard rule 8's `name: ""`) and no `back`: a layout that forgot `back` for a
 *    face-down card, so only the empty-name test stops a lookup of `""`.
 *
 * A lookup of any secret, or of `""`, is a leak.
 */
const SECRET = 'SECRET#';
const CATEGORIES = ['creatureBack', 'attachmentBack', 'landBack', 'stackBack', 'stub', 'stubUnflagged', 'nameless'] as const;
type Category = (typeof CATEGORIES)[number];
function hostile(placed: Layout): { layout: Layout; exercised: Record<Category, number> } {
  const exercised = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  const placements: Placement[] = placed.placements.map((placement) => {
    const secret = `${SECRET}${String(placement.cardId)}`;
    if (placement.back || isHidden(placement.card)) {
      if (isHidden(placement.card)) exercised.stub += 1;
      return { ...placement, card: { ...placement.card, name: secret } as AnyCard };
    }
    const flippable = placement.kind === 'creature' || placement.kind === 'attachment' || placement.kind === 'land' || placement.kind === 'stack';
    if (!flippable || placement.cardId % 3 !== 0) return placement;
    exercised[`${placement.kind}Back` as Category] += 1;
    return { ...placement, back: true, card: { ...placement.card, name: secret } as AnyCard };
  });
  // A redacted stub in a face-up slot, carrying a name — only `isHidden` stops it.
  const lands = placements.findIndex((p) => p.kind === 'land' && !p.back);
  const attachments = placements.findIndex((p) => p.kind === 'attachment' && !p.back);
  for (const at of [lands, attachments]) {
    if (at < 0) continue;
    const p = placements[at]!;
    placements[at] = { ...p, card: { ...p.card, hidden: true, name: `${SECRET}${String(p.cardId)}` } as unknown as AnyCard };
    exercised.stubUnflagged += 1;
  }
  // A face-up card of every kind the rung reads, with the face-down name `""` and
  // no `back` — only the empty-name test stops it.
  for (const kind of ['creature', 'attachment', 'land', 'stack'] as const) {
    const at = placements.findIndex((p) => p.kind === kind && !p.back && !isHidden(p.card));
    if (at < 0) continue;
    const p = placements[at]!;
    placements[at] = { ...p, card: { ...p.card, name: '' } as AnyCard };
    exercised.nameless += 1;
  }
  return { layout: { ...placed, placements, byKey: new Map(placements.map((p) => [p.key, p])) }, exercised };
}

/** A name nobody may look up: a secret from the hostile layout, or the face-down `""`. */
const concealed = (name: string): boolean => name === '' || name.startsWith(SECRET);

/** Every palette lookup the arena's rung makes for one layout — the pose functions and the arena's entry point. */
function lookupsOf(placed: Layout, state: ClientState, answer: ArtPalette): Set<string> {
  const lookups = new SpyPalettes(answer);
  figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS, palettes: lookups });
  tilePose(placed, tileDataOf(DATA), lookups);
  for (const name of paletteNamesOf(placed)) lookups.get(name);
  return lookups.asked;
}

test('palette: THE lookup, on its own — a back, a redacted stub and a nameless card are each refused by their own gate (hard rule 8)', () => {
  const answer = paletteFromPixels(bands(10, 10, [[20, 20, 20, 60], [230, 60, 40, 40]]), 10, 10)!;
  const spy = new SpyPalettes(answer);
  const faceUp = { name: 'Nick Fury, Spymaster', id: 1, zone: 'battlefield', owner: 0, controller: 0 } as unknown as AnyCard;
  assert.equal(paletteFor({ back: false, card: faceUp }, spy), answer);
  assert.equal(paletteFor({ back: true, card: faceUp }, spy), null, 'a back with a real name was looked up');
  assert.equal(paletteFor({ back: false, card: { ...faceUp, hidden: true } as AnyCard }, spy), null, 'a redacted stub with a name was looked up');
  assert.equal(paletteFor({ back: false, card: { ...faceUp, name: '' } as AnyCard }, spy), null, 'a nameless card was looked up');
  assert.deepEqual([...spy.asked], ['Nick Fury, Spymaster']);
});

test('palette: over the corpus made HOSTILE, no pose function and no arena entry point looks up a back, a redacted stub or a nameless card — each gate has a case only it stops (hard rule 8, negative controls)', () => {
  const answer = paletteFromPixels(bands(10, 10, [[20, 20, 20, 60], [230, 60, 40, 40]]), 10, 10)!;
  const total = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  let frames = 0;
  let asked = 0;
  const hostileLayouts: Layout[] = [];
  for (const { file, state } of fixtureStates()) {
    frames += 1;
    const { layout: placed, exercised } = hostile(layout(state));
    for (const c of CATEGORIES) total[c] += exercised[c];
    hostileLayouts.push(placed);
    for (const name of lookupsOf(placed, state, answer)) {
      asked += 1;
      assert.ok(!concealed(name), `${file}: a concealed card's name "${name}" was looked up`);
    }
  }
  console.log(
    `palette: hostile corpus — ${String(frames)} frames; ` +
      CATEGORIES.map((c) => `${c} ${String(total[c])}`).join(' · ') +
      `; ${String(asked)} lookups, none of a concealed or empty name`,
  );
  // Not vacuous: every path a secret could leak through was actually offered one…
  for (const c of CATEGORIES) assert.ok(total[c] > 0, `the hostile corpus offered no ${c}`);
  assert.ok(asked > 0, 'nothing was looked up at all — the spy is not wired');

  // …and each category really is stopped by ONE gate. The controls: the same
  // detector over the same hostile layouts, with a lookup that keeps every gate
  // but one, must see a leak — so the corpus can see each gate go. (The real
  // gates' removal, one at a time, is the merge pass's mutation run.)
  type Gates = { back: boolean; hidden: boolean; empty: boolean };
  const all: Gates = { back: true, hidden: true, empty: true };
  const leaksWith = (gates: Gates): number => {
    let leaks = 0;
    for (const placed of hostileLayouts) {
      for (const placement of placed.placements) {
        if (gates.back && placement.back) continue;
        if (gates.hidden && isHidden(placement.card)) continue;
        const name = (placement.card as { name?: string }).name;
        if (typeof name !== 'string' || (gates.empty && name === '')) continue;
        if (concealed(name)) leaks += 1;
      }
    }
    return leaks;
  };
  assert.equal(leaksWith(all), 0, 'the all-gates control leaks — the detector is wrong');
  for (const [gate, category] of [['back', '<kind>Back'], ['hidden', 'stubUnflagged'], ['empty', 'nameless']] as const) {
    assert.ok(leaksWith({ ...all, [gate]: false }) > 0, `with no ${gate} gate the hostile corpus shows no leak — ${category} does not isolate it`);
  }
});
