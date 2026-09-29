/*
 * mtg-table — web/test/tiles.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The terrain and the casting anchor, over the whole corpus** (report 13 §5,
 * §5.4, §6.2 — T4).
 *
 * The same shape as `figures.test.ts`, and for the same reason: `figures/tiles.ts`
 * and `figures/casting.ts` import no three, no React and no DOM, so the real
 * ladder and the real pose functions run over all eighteen committed recordings
 * under `node --test` with no browser, no GPU and no `.glb`.
 *
 * It prints the census every run — land name → tile kind → frame-instances → which
 * rung matched — so **a tile entry that never fires says so on the day it is
 * added**, exactly as the cue and figure censuses do.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import {
  MAX_MOTES_PER_SEAT,
  manaMotes,
  spellForms,
} from '../src/arena/figures/casting.ts';
import {
  LAND_SUBTYPE_ORDER,
  MAX_TILES,
  landSubtypeKey,
  landSubtypesOf,
  tileFor,
  tilePose,
} from '../src/arena/figures/tiles.ts';
import { TILE_KINDS, isTileKind, tileDataOf } from '../src/arena/figures/types.ts';
import { validateFigures, validateModels } from '../src/arena/figures/validate.ts';
import { TABLE_HALF_X, TABLE_HALF_Z, anchorsFor, layout } from '../src/arena/layout.ts';
import { MANA_COLORS, isHidden, type AnyCard, type Frame, type StackItem } from '../src/protocol.ts';
import { isLandTypeLine } from '../src/render/labels.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

const MODEL_IDS = new Set(Object.keys(validateModels(modelsJson).data.models));
const FIGURES = validateFigures(figuresJson, { modelIds: MODEL_IDS });
const TILES = tileDataOf(FIGURES.data);

function fixtureFiles(): string[] {
  const out: string[] = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (name.endsWith('.jsonl')) out.push(FIXTURES + dir + name);
    }
  }
  return out;
}

/** Every `state` frame of one recording with its transport index (1-based), folded through the real reducer. */
function indexedFramesOf(file: string): Array<{ index: number; state: ClientState }> {
  const out: Array<{ index: number; state: ClientState }> = [];
  const log = parseFrameLog(readFileSync(file, 'utf8'));
  let state = initialState(log.header);
  (log.frames as Frame[]).forEach((frame, i) => {
    state = reduce(state, frame);
    if (frame.type === 'state') out.push({ index: i + 1, state });
  });
  return out;
}

/**
 * **The lands a frame PLACES for the terrain**, counted apart from the tiles it
 * draws (the fix pass of D230): a face-up land in a land rank, once per card —
 * the placements `tilePose` would lay if there were no cap. Written here from
 * the layout, not read back off `tilePose`, so a cap that drops a land shows as
 * a difference between the two numbers rather than as a lower count.
 */
function landsPlacedIn(placed: ReturnType<typeof layout>): number {
  const ids = new Set<number>();
  for (const placement of placed.placements) {
    if (placement.kind !== 'land' || isHidden(placement.card)) continue;
    if (!isLandTypeLine((placement.card as { types?: string }).types ?? '')) continue;
    ids.add(placement.cardId);
  }
  return ids.size;
}

/** Every `state` frame of one recording, folded through the real reducer. */
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

// ---------------------------------------------------------------------------
// The data
// ---------------------------------------------------------------------------

test('tiles: the lands block validates with zero errors', () => {
  assert.deepEqual(FIGURES.errors, [], 'figures.json has errors');
  assert.ok(Object.keys(TILES.lands).length >= 6, 'the terrain table is empty');
  for (const [key, spec] of Object.entries(TILES.lands)) {
    assert.ok(isTileKind(spec.tile), `lands["${key}"].tile is not a tile kind`);
  }
  assert.ok(isTileKind(TILES.default.tile));
  // Every recognised subtype should have a row, or the corpus's basics fall to
  // the `*` slab and the census will say so below.
  for (const subtype of LAND_SUBTYPE_ORDER) {
    const key = landSubtypeKey(subtype);
    assert.ok(
      Object.hasOwn(TILES.lands, key),
      `no row for ${key} — every basic land type should have a tile`,
    );
  }
});

test('tiles: landSubtypesOf reads the words after the dash', () => {
  const card = (types: string): AnyCard => ({ id: 1, types } as unknown as AnyCard);
  assert.deepEqual(landSubtypesOf(card('Basic Land - Island')), ['island']);
  assert.deepEqual(landSubtypesOf(card('Basic Land - Mountain')), ['mountain']);
  // **Both Thriving lands are a bare `Land`** — 2,291 frame-instances of it in the
  // corpus — which is exactly why the per-name rung comes first.
  assert.deepEqual(landSubtypesOf(card('Land')), []);
  assert.deepEqual(landSubtypesOf({ id: 2, hidden: true } as unknown as AnyCard), []);
  // A dual basic, in subtype order rather than in the line's order.
  assert.deepEqual(landSubtypesOf(card('Land - Forest Island')), ['island', 'forest']);
});

test('tiles: past the cap the surplus lands are not laid, in placement order — "degrade, don\'t stutter" (D230 control)', () => {
  // The corpus reaches no cap since D230 raised it, so the cap's own behaviour is
  // held here: the busiest land frame's layout, its lands copied under fresh ids
  // until the table places more than MAX_TILES.
  const file = `${FIXTURES}games/villain-wakanda-232.jsonl`;
  const frame = indexedFramesOf(file).find((f) => f.index === 525);
  assert.ok(frame !== undefined, 'villain-wakanda-232@525 is gone');
  const placed = layout(frame.state, {});
  const lands = placed.placements.filter((p) => p.kind === 'land' && !isHidden(p.card));
  assert.equal(landsPlacedIn(placed), 25);
  const extra = Array.from({ length: MAX_TILES + 8 - lands.length }, (_, i) => ({ ...lands[i % lands.length]!, cardId: 900000 + i }));
  const crowded = { ...placed, placements: [...placed.placements, ...extra] };
  assert.equal(landsPlacedIn(crowded), MAX_TILES + 8);
  const laid = tilePose(crowded, TILES);
  assert.equal(laid.size, MAX_TILES, `${String(laid.size)} tiles laid past a cap of ${String(MAX_TILES)}`);
  const order = crowded.placements.filter((p) => p.kind === 'land' && !isHidden(p.card)).map((p) => p.cardId);
  assert.deepEqual([...laid.keys()], order.slice(0, MAX_TILES), 'the cap did not keep the first lands in placement order');
});

test('tiles: a concealed land never reaches the per-name rung', () => {
  const redacted = { id: 9, zone: 'battlefield', controller: 0, owner: 0, hidden: true } as unknown as AnyCard;
  const match = tileFor(redacted, TILES);
  assert.equal(match.rung, 'default');
  assert.equal(match.spec.tile, TILES.default.tile);
});

// ---------------------------------------------------------------------------
// The corpus sweep
// ---------------------------------------------------------------------------

test('tiles: every land of every committed recording resolves to a tile', () => {
  const census = new Map<string, { kind: string; rung: string; count: number }>();
  let frames = 0;
  let tiles = 0;
  let tapped = 0;
  let maxInFrame = 0;
  let twoTone = 0;
  /** The most lands one frame PLACES, and where (D230's fix pass: counted apart from the tiles drawn). */
  let maxPlaced = 0;
  let placedAt: string[] = [];
  /** Frames where the cap left a placed land undrawn as terrain. */
  const capped: string[] = [];

  for (const file of fixtureFiles()) {
    const short = file.slice(FIXTURES.length);
    for (const { index, state } of indexedFramesOf(file)) {
      if (state.board === null) continue;
      frames += 1;
      const placed = layout(state, {});
      const laid = tilePose(placed, TILES);
      const lands = landsPlacedIn(placed);
      maxInFrame = Math.max(maxInFrame, laid.size);
      assert.ok(laid.size <= MAX_TILES, `${file}: ${String(laid.size)} tiles, over the cap`);
      // The cap is the ONLY thing that leaves a placed land without its tile.
      assert.equal(laid.size, Math.min(lands, MAX_TILES), `${short}@${String(index)}: ${String(lands)} lands placed, ${String(laid.size)} tiles laid`);
      if (lands > MAX_TILES) capped.push(`${short}@${String(index)} (${String(lands)} placed, ${String(laid.size)} laid)`);
      if (lands > maxPlaced) {
        maxPlaced = lands;
        placedAt = [];
      }
      if (lands === maxPlaced) placedAt.push(`${short}@${String(index)}`);

      for (const tile of laid.values()) {
        tiles += 1;
        if (tile.tapped) tapped += 1;
        if (tile.rim !== null) twoTone += 1;
        assert.ok(isTileKind(tile.kind), `a tile resolved to "${tile.kind}"`);
        assert.match(tile.tint, /^#[0-9a-f]{6}$/i, `tint "${tile.tint}" is not a colour`);
        assert.ok(
          Math.abs(tile.position[0]) <= TABLE_HALF_X && Math.abs(tile.position[2]) <= TABLE_HALF_Z,
          `a tile is off the table at ${JSON.stringify(tile.position)}`,
        );

        // The tapped flag is the SNAPSHOT's, not a history's: find the card and
        // check. This is the assertion behind "a scrub shows the right lands
        // spent" (§5.3).
        const placement = placed.byKey.get(`c:${String(tile.cardId)}`);
        assert.ok(placement !== undefined);
        const card = placement.card as { tapped?: boolean; name?: string };
        assert.equal(
          tile.tapped,
          card.tapped === true,
          `tile ${String(tile.cardId)} disagrees with the snapshot about being tapped`,
        );

        const name = card.name ?? '?';
        const row = census.get(name) ?? { kind: tile.kind, rung: tile.rung, count: 0 };
        row.count += 1;
        census.set(name, row);
      }
    }
  }

  console.log(`  ${String(frames)} board frames · ${String(tiles)} tile-instances · max ${String(maxInFrame)} laid in one frame`);
  console.log(`  most lands PLACED in one frame: ${String(maxPlaced)} (${placedAt.join(', ')}) · cap ${String(MAX_TILES)} · frames where the cap dropped a land: ${String(capped.length)}`);
  console.log(`  ${String(tapped)} tapped (pose, not cue) · ${String(twoTone)} two-tone (a rim instance)`);
  console.log('  land                 tile      rung                 instances');
  for (const [name, row] of [...census.entries()].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`    ${name.padEnd(18)} ${row.kind.padEnd(9)} ${row.rung.padEnd(20)} ${String(row.count)}`);
  }

  // The measured ceiling from report 13 §2 — and the corpus is where it came from.
  // 21 until D230's three AI-deck recordings; villain-wakanda-232's last turns
  // PLACE 25 on eight frames (@525–@532), the first frames in the corpus past the
  // old cap of 24, which left one land of each without its terrain. D230 raised
  // the cap to 32 (0 draw calls: the terrain is instanced; 124 triangles a land
  // past 24), so the corpus reaches no cap and every placed land is laid.
  // Counted apart: `maxInFrame` is what was LAID and can never exceed the cap,
  // so on its own it could not see a bigger table.
  assert.equal(maxPlaced, 25, `the busiest land frame places ${String(maxPlaced)} lands, not 25`);
  assert.deepEqual(
    placedAt,
    [525, 526, 527, 528, 529, 530, 531, 532].map((i) => `games/villain-wakanda-232.jsonl@${String(i)}`),
    'the busiest land frames moved',
  );
  assert.equal(maxInFrame, maxPlaced, 'the busiest land frame did not lay every land it placed');
  assert.deepEqual(capped, [], `the terrain cap dropped a land: ${capped.join('; ')}`);
  assert.ok(MAX_TILES > maxPlaced, `the cap (${String(MAX_TILES)}) has no room over the corpus's ${String(maxPlaced)}`);
  assert.ok(frames > 3000, `expected the whole corpus, saw ${String(frames)} board frames`);
  assert.ok(tiles > 20000, `only ${String(tiles)} tile-instances`);
  // Every one of the corpus's six land names must be in the census, and the two
  // dual lands must have come through the per-NAME rung.
  for (const name of ['Island', 'Mountain', 'Plains', 'Forest', 'Thriving Isle', 'Thriving Heath']) {
    assert.ok(census.has(name), `no tile was ever drawn for ${name}`);
  }
  assert.equal(census.get('Thriving Isle')?.rung, 'card');
  assert.equal(census.get('Thriving Heath')?.rung, 'card');
  assert.equal(census.get('Island')?.rung, 'subtype:island');
  assert.equal(census.get('Island')?.kind, 'water');
  assert.equal(census.get('Plains')?.kind, 'plateau');
  // Mountain and Forest are probe-deck lands and take the slab in their own tint;
  // `figures/tiles.ts` says why that is three kinds rather than five.
  assert.equal(census.get('Mountain')?.kind, 'slab');
  assert.ok(twoTone > 0, 'the two-tone rim never drew — the Thriving lands are the only users');

  // The draw-call claim, as arithmetic rather than as a promise: the kinds present
  // in the busiest frame plus one rim mesh is what `TileField` draws.
  console.log(
    `  terrain draw calls = ${String(TILE_KINDS.length)} kind meshes + 1 rim = ${String(TILE_KINDS.length + 1)}, ` +
      'whatever the land count',
  );
  assert.ok(TILE_KINDS.length + 1 <= 5, 'the terrain grew past "a handful" of draw calls');
});

// ---------------------------------------------------------------------------
// §5.4 — the mana motes, and the measurement that shaped them
// ---------------------------------------------------------------------------

test('casting: the floating pool is a pose, and it is RARE', () => {
  let frames = 0;
  let framesWithMana = 0;
  let maxMotes = 0;
  const byPip = new Map<string, number>();

  for (const file of fixtureFiles()) {
    for (const state of framesOf(file)) {
      if (state.board === null) continue;
      frames += 1;
      const placed = layout(state, {});
      const motes = manaMotes(state.board, seatOf(placed.viewerId));
      if (motes.length > 0) framesWithMana += 1;
      maxMotes = Math.max(maxMotes, motes.length);
      for (const mote of motes) {
        byPip.set(mote.pip, (byPip.get(mote.pip) ?? 0) + 1);
        assert.ok(MANA_COLORS.includes(mote.pip), `"${mote.pip}" is not a mana colour`);
        assert.match(mote.colour, /^#[0-9a-f]{6}$/i);
        assert.ok(mote.index >= 0 && mote.index < mote.count, 'a mote is outside its own cluster');
        assert.ok(mote.count <= MAX_MOTES_PER_SEAT);
      }
      // Every seat's motes must agree with that seat's own pool, which is the
      // whole of the pose claim.
      const total = state.board.players.reduce(
        (n, p) => n + MANA_COLORS.reduce((m, pip) => m + Math.max(0, p.manaPool[pip]), 0),
        0,
      );
      assert.equal(motes.length, Math.min(total, MAX_MOTES_PER_SEAT * 2), 'a mote went missing');
    }
  }

  const pct = ((framesWithMana / frames) * 100).toFixed(1);
  console.log(
    `  manaPool is non-zero in ${String(framesWithMana)} of ${String(frames)} board frames (${pct}%), ` +
      `max ${String(maxMotes)} motes · by pip ${JSON.stringify(Object.fromEntries(byPip))}`,
  );

  /**
   * **This number is the design decision, not a curiosity.** Forge's AI taps and
   * spends inside one engine step, so the snapshot almost never catches mana
   * standing in a pool — which is why the mote *flight* is a cue (`land.tap`) and
   * only the standing pool is a pose. A feature built entirely on this field would
   * be invisible 98.7% of the time, which is report 13 §4.1's aura finding read
   * the other way round.
   */
  assert.ok(framesWithMana > 0, 'no frame in the corpus has floating mana at all');
  assert.ok(
    framesWithMana < frames * 0.1,
    `floating mana is visible in ${pct}% of frames — if this ever rises, the standing pool ` +
      'has become the common case and §5.4 should be re-read',
  );
});

test('casting: a spell form stands at its own controller’s anchor', () => {
  let stackFrames = 0;
  let forms = 0;
  let maxDepth = 0;

  for (const file of fixtureFiles()) {
    for (const state of framesOf(file)) {
      const board = state.board;
      if (board === null || board.stack.length === 0) continue;
      stackFrames += 1;
      const placed = layout(state, {});
      const seat = seatOf(placed.viewerId);
      const list = spellForms(board, seat, () => '#c6ccd6');
      maxDepth = Math.max(maxDepth, list.length);
      forms += list.length;
      for (const form of list) {
        const item: StackItem | undefined = board.stack.find((s) => s.id === form.stackItemId);
        assert.ok(item !== undefined, 'a form names a stack item that is not there');
        const controller: number | null = item.controller;
        assert.ok(controller !== null);
        assert.equal(form.player, controller);
        assert.equal(form.seat, seat(controller));
        // The anchor is `layout.ts`'s, and it is on the table.
        const anchor = anchorsFor(form.seat).casting;
        assert.ok(Math.abs(anchor.x) <= TABLE_HALF_X && Math.abs(anchor.z) <= TABLE_HALF_Z);
      }
      // A form per item, unless the wire gave one no controller — of which the
      // corpus has none, and which is skipped rather than guessed at.
      assert.equal(list.length, board.stack.filter((s) => s.controller !== null).length);
    }
  }

  console.log(
    `  ${String(stackFrames)} frames with a stack · ${String(forms)} form-instances · max depth ${String(maxDepth)}`,
  );
  assert.ok(stackFrames > 300, `only ${String(stackFrames)} stack frames — expected ~389`);
  assert.equal(maxDepth, 4, `the deepest stack in the corpus is ${String(maxDepth)}, not 4`);
});

test('casting: the two seats’ anchors are mirrored and clear of every other zone', () => {
  const you = anchorsFor('you');
  const opp = anchorsFor('opp');
  assert.equal(you.casting.z, -opp.casting.z);
  assert.equal(you.casting.x, opp.casting.x);
  // Report 13 §6.2: above the land rank, inboard of the library, clear of the
  // stack column at +4.8 and the graveyard/exile column at −4.8.
  assert.ok(you.casting.y > you.lands.y, 'the casting anchor must hover above the terrain');
  assert.ok(you.casting.x < you.library.x, 'it must sit inboard of the library');
  assert.ok(Math.abs(you.casting.x) < 4.8, 'it must be clear of the stack and pile columns');
  // A hidden land never resolves; a hidden card is not a land. Both are branches
  // rather than behaviours in this corpus (§1.4), and both are explicit.
  assert.deepEqual(landSubtypesOf({ id: 1, hidden: true } as unknown as AnyCard), []);
  assert.ok(isHidden({ id: 1, hidden: true } as unknown as AnyCard));
});
