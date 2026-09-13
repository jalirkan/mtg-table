/*
 * mtg-table — web/test/liveness.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The invariant, as source and as behaviour** (report 09 §10.5, §5.3).
 *
 * The arena's central safety claim is not "the cues are careful". It is that
 * **there is no code path from the animation system to `onAct`** — the decision
 * layer reads `state.input`, the hit proxies sit at `layout(state)`, and nothing
 * in `cues/` is reachable from either. A claim like that is worth exactly as
 * much as the mechanism that keeps it true, so half of this file is a **source
 * scan**: crude, and exactly the kind of crude that keeps holding for years.
 *
 * The other half is §5.3's predicate, driven over the protocol's own stall case:
 * a **disabled OK button with a non-empty selectable list** is the engine asking
 * for a card click, and a renderer that called that state idle would give it a
 * two-second flourish (§4.2).
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { CueQueue, awaitingHuman } from '../src/arena/cues/queue.ts';
import { REGISTRY } from '../src/arena/cues/registry.ts';
import { NullStage } from '../src/arena/cues/stage.ts';
import { EMPTY_CUE_DATA } from '../src/arena/cues/types.ts';
import { layout } from '../src/arena/layout.ts';
import type { Frame, GameEvent } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';

const ARENA = fileURLToPath(new URL('../src/arena/', import.meta.url));

/** Every `.ts`/`.tsx` file under `web/src/arena/`, recursively. */
function arenaFiles(dir = ARENA, prefix = ''): Array<{ path: string; source: string }> {
  const out: Array<{ path: string; source: string }> = [];
  for (const name of readdirSync(dir).sort()) {
    const full = dir + name;
    if (statSync(full).isDirectory()) {
      out.push(...arenaFiles(full + '/', `${prefix}${name}/`));
      continue;
    }
    if (!name.endsWith('.ts') && !name.endsWith('.tsx')) continue;
    out.push({ path: prefix + name, source: readFileSync(full, 'utf8') });
  }
  return out;
}

/** `import … from '<specifier>'` and `import('<specifier>')`, with the `type` flag. */
function importsOf(source: string): Array<{ from: string; typeOnly: boolean }> {
  const out: Array<{ from: string; typeOnly: boolean }> = [];
  const re = /import\s+(type\s+)?([\s\S]*?)from\s+'([^']+)'/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    // `import { type X } from` is also type-only in effect, but the clause form
    // `import type {` is the one this repo writes, so the flag is enough.
    out.push({ from: match[3] ?? '', typeOnly: match[1] !== undefined });
  }
  const dynamic = /import\('([^']+)'\)/g;
  while ((match = dynamic.exec(source)) !== null) {
    out.push({ from: match[1] ?? '', typeOnly: false });
  }
  return out;
}

// ---------------------------------------------------------------------------
// §10.5, the source half
// ---------------------------------------------------------------------------

test('liveness: nothing in the arena imports a transport, and the reducer only as a TYPE', () => {
  const files = arenaFiles();
  assert.ok(files.length >= 20, `expected the arena tree, saw ${String(files.length)} files`);
  for (const file of files) {
    for (const imported of importsOf(file.source)) {
      assert.ok(
        !imported.from.includes('transport/'),
        `${file.path} imports ${imported.from} — the arena must not know how frames arrive`,
      );
      if (imported.from.includes('reduce.ts')) {
        assert.ok(
          imported.typeOnly,
          `${file.path} imports ${imported.from} as a VALUE — the arena renders a ClientState, it never makes one`,
        );
      }
      assert.ok(
        !imported.from.includes('/Board.tsx'),
        `${file.path} imports the 2D board — two renderers, one state, no shared component tree`,
      );
    }
  }
});

/**
 * **A widget mounted in `.arena__layer` must opt back into pointer events.**
 *
 * The layer is `pointer-events: none` so the `<canvas>` under it keeps every
 * click the DOM does not want (report 09 §2.1 rule 2), and `pointer-events` is
 * inherited — so a widget that does not say `auto` is **completely inert**, and
 * looks perfect in a screenshot. M5's `<AskModal>` shipped that way: mounted
 * over the canvas from the day E6 opened the seat, `getComputedStyle(button)
 * .pointerEvents === "none"`, `elementsFromPoint` at the button's own centre
 * returning the canvas, three real clicks sending nothing while a programmatic
 * `button.click()` on the same button sent fine. The arena could take the
 * engine's default for every one of M5's twelve ask kinds and pick nothing.
 *
 * So this walks what `Arena.tsx` actually mounts inside that div and requires a
 * rule for each one's root class. Adding a widget without a rule fails here.
 */
test('liveness: every widget the arena layer mounts can be clicked', () => {
  const arena = readFileSync(fileURLToPath(new URL('../src/arena/Arena.tsx', import.meta.url)), 'utf8');
  const css = readFileSync(fileURLToPath(new URL('../src/styles.css', import.meta.url)), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // The JSX block: `<div className="arena__layer">` to the `</div>` at its own
  // indentation. Crude, and it is checked — if the block cannot be found the
  // test fails rather than passing over nothing.
  const open = arena.indexOf('<div className="arena__layer">');
  assert.ok(open > 0, 'Arena.tsx no longer mounts a `.arena__layer` — move this test with it');
  const indent = ' '.repeat(arena.slice(0, open).split('\n').pop()!.length);
  const close = arena.indexOf(`\n${indent}</div>`, open);
  assert.ok(close > open, 'could not find the end of the arena layer');
  const block = arena.slice(open, close);

  /**
   * Which root class each component puts in the layer. It is a hand-written
   * table on purpose: the class lives in the component's own file (and, for
   * `<AskModal>` and `<HotkeysOverlay>`, in `render/`, which the board shares),
   * so the mechanical half is that the table must COVER the block — a component
   * added to the layer with no entry here fails below.
   */
  const rootClass: Readonly<Record<string, readonly string[]>> = {
    // The strip, the per-seat life plates, M5's twelve ask modals + their
    // scrim, and M6's New Game row.
    DecisionLayer: [
      '.arena__decision',
      '.arena__seat',
      '.ask-modal',
      '.ask-modal__scrim',
      '.arena__over',
    ],
    CueControls: ['.arena__cues'],
    ArtCredit: ['.arena__credit'],
    HotkeysOverlay: ['.overlay'],
  };

  const mounted = [...new Set([...block.matchAll(/<([A-Z][A-Za-z0-9]*)/g)].map((m) => m[1]!))];
  assert.ok(mounted.length >= 4, `expected the layer's widgets, saw ${mounted.join(', ')}`);
  for (const name of mounted) {
    assert.ok(
      name in rootClass,
      `<${name}> is mounted in .arena__layer and this test does not know its root class. ` +
        'The layer is `pointer-events: none`, so a widget that does not set `pointer-events: auto` ' +
        'is invisible to the mouse: add its class to the table here AND a rule in styles.css.',
    );
  }

  /** Every `selector { … }` rule, including the ones inside `@media`. */
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1]!.trim(),
    body: m[2]!,
  }));
  const hasAuto = (cls: string): boolean =>
    rules.some(
      (rule) =>
        /pointer-events\s*:\s*auto/.test(rule.body) &&
        rule.selector
          .split(',')
          .some((part) => new RegExp(`\\${cls}(?![\\w-])`).test(part)),
    );

  const inert: string[] = [];
  for (const name of mounted) {
    for (const cls of rootClass[name] ?? []) {
      if (!hasAuto(cls)) inert.push(`<${name}> → ${cls}`);
    }
  }
  assert.deepEqual(
    inert,
    [],
    'these widgets are mounted inside `.arena__layer` (pointer-events: none) and no rule in ' +
      'styles.css gives them `pointer-events: auto`, so the canvas wins the hit test at their ' +
      'own centre and every control in them is dead:\n  ' + inert.join('\n  '),
  );
});

/**
 * **The hit proxy is two-sided, and it stays two-sided.**
 *
 * `Mesh.raycast` back-face-culls a `FrontSide` material exactly as the renderer
 * does. When `anchorsFor('opp')` mirrored the pitch, the opponent's plane
 * normals pointed *down through the table* and a `FrontSide` proxy made **every
 * card that seat controls** unclickable — measured live: of 17 hit proxies
 * raycast at their own projected centres, the 3 misses were exactly the
 * opponent's battlefield.
 *
 * **That cause is gone** — the second verification pass replaced the mirrored
 * pitch with an in-plane `seatSpin(seat)` of π, so every placement's normal now
 * points up (`layout.test.ts` asserts it over the whole corpus) and a
 * `FrontSide` proxy would work today. The assertion stays anyway, and on
 * purpose: it costs nothing (the proxy draws nothing at all), and the failure it
 * guards is invisible to every screenshot and to any spot-check that only clicks
 * your own cards. A renderer that tilts a plane past vertical again should not
 * have to rediscover this.
 */
test('liveness: the hit proxy is double-sided, so an opponent’s card is clickable', () => {
  const src = readFileSync(fileURLToPath(new URL('../src/arena/scene/HitProxy.tsx', import.meta.url)), 'utf8');
  const material = /<meshBasicMaterial[^>]*\/>/.exec(src);
  assert.ok(material !== null, 'HitProxy no longer has a `<meshBasicMaterial>` — move this with it');
  assert.match(
    material[0],
    /side=\{THREE\.DoubleSide\}/,
    'the hit proxy\u2019s material is not `side={THREE.DoubleSide}`. `Mesh.raycast` culls back ' +
      'faces exactly as the renderer does, so any placement whose plane is turned away from the ' +
      'camera becomes unclickable — targeting a removal spell, choosing a blocker and attacking ' +
      'a planeswalker all dead-end. `layout()` no longer produces one (see seatSpin), and this ' +
      'is the belt that makes the braces cost nothing.',
  );
  // The proxy draws nothing, so the flag costs nothing: it is still invisible.
  assert.match(src, /visible=\{false\}/);
});

test('liveness: the decision layer knows nothing about the cue engine', () => {
  const layer = readFileSync(fileURLToPath(new URL('../src/arena/DecisionLayer.tsx', import.meta.url)), 'utf8');
  for (const imported of importsOf(layer)) {
    assert.ok(
      !imported.from.includes('cues/') && !imported.from.includes('scene/'),
      `DecisionLayer imports ${imported.from} — an animation must not be able to reach a click`,
    );
  }
  // And the positive half: it reads the engine's own fields and sends acts.
  assert.match(layer, /state\.input/);
  assert.match(layer, /action: 'buttonOk'/);
  assert.match(layer, /action: 'concede'/);
  // The labels are the engine's, verbatim (CLAUDE.md M5 convention 4).
  assert.match(layer, /\{button\.label\}/);
  assert.ok(
    !/label\s*===|label\.includes|label\.match/.test(layer),
    'the decision layer branches on an engine STRING — M5 convention 4',
  );
});

test('liveness: cues/ is pure — no three, no React, no DOM, no clock', () => {
  const files = arenaFiles().filter((f) => f.path.startsWith('cues/'));
  assert.ok(files.length >= 8, `expected the cue engine, saw ${String(files.length)} files`);
  for (const file of files) {
    for (const imported of importsOf(file.source)) {
      assert.ok(
        imported.from !== 'three' && !imported.from.startsWith('three/'),
        `cues/${file.path} imports three — §2.4's [NO three] is what makes node --test possible`,
      );
      assert.ok(
        !imported.from.startsWith('react') && !imported.from.includes('@react-three'),
        `cues/${file.path} imports React`,
      );
    }
    if (file.path.endsWith('.json')) continue;
    // The clock is injected (`tick(now)`), which is the whole reason the queue
    // is testable with a plain number. A timer here would be a queue that runs
    // on its own and a test that has to sleep.
    assert.ok(
      !/\bsetTimeout\(|\bsetInterval\(|requestAnimationFrame\(/.test(file.source),
      `cues/${file.path} starts a timer`,
    );
  }
});

test('liveness: camera.ts and layout.ts are pure too — the pose math has no renderer', () => {
  for (const name of ['camera.ts', 'layout.ts', 'colour.ts']) {
    const file = arenaFiles().find((f) => f.path === name);
    assert.ok(file !== undefined, `${name} is missing`);
    for (const imported of importsOf(file.source)) {
      assert.ok(
        imported.from !== 'three' && !imported.from.startsWith('react'),
        `${name} imports ${imported.from}`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// §10.5, the behavioural half
// ---------------------------------------------------------------------------

const EMPTY = { count: 0, cards: [] };

function stallState(over: Record<string, unknown> = {}): ClientState {
  const hello = {
    v: 1,
    seq: 1,
    t: 1,
    type: 'hello_ok',
    body: { gameId: 'g', you: 0, players: [], protocol: 1 },
  } as unknown as Frame;
  const state = {
    v: 1,
    seq: 2,
    t: 2,
    type: 'state',
    body: {
      gameId: 'g',
      turn: 1,
      round: 1,
      phase: 'MAIN1',
      activePlayer: 0,
      priority: 0,
      gameOver: null,
      players: [
        {
          id: 0,
          name: 'p0',
          isAi: false,
          life: 20,
          poison: 0,
          counters: {},
          manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
          zones: {
            hand: EMPTY,
            battlefield: {
              count: 1,
              cards: [
                {
                  id: 12,
                  name: 'Agents of S.H.I.E.L.D.',
                  setCode: 'MSH',
                  manaCost: '{2}{W}',
                  types: 'Creature - Human Spy Hero',
                  power: '2',
                  toughness: '4',
                  loyalty: null,
                  damage: 0,
                  counters: {},
                  tapped: false,
                  sick: false,
                  attacking: false,
                  blocking: false,
                  faceDown: false,
                  token: false,
                  alt: null,
                  attachedToId: null,
                  attachmentIds: [],
                  controller: 0,
                  owner: 0,
                  zone: 'battlefield',
                  abilities: [],
                },
              ],
            },
            graveyard: EMPTY,
            exile: EMPTY,
            command: EMPTY,
            library: { count: 30, cards: [] },
          },
        },
      ],
      stack: [],
      stackCards: [],
      combat: null,
      events: [{ kind: 'tap', cardId: 12, tapped: true } as GameEvent],
      ...over,
    },
  } as unknown as Frame;
  const input = {
    v: 1,
    seq: 3,
    t: 3,
    type: 'input',
    body: {
      prompt: 'Select a creature to attack with',
      focusCardId: null,
      focusCard: null,
      // §4.2's stall: OK is DISABLED and cards are selectable. The engine wants
      // a card click, and this is the exact state a long cue would ruin.
      buttons: { ok: { label: 'OK', enabled: false }, cancel: { label: 'Cancel', enabled: false } },
      selectable: { cardIds: [12], playerIds: [], abilityIds: [] },
      highlighted: [],
      weaklySelectable: [],
    },
  } as unknown as Frame;
  return reduce(reduce(reduce(initialState(), hello), state), input);
}

test('liveness: §4.2’s stall — a disabled OK with selectable cards is WAITING', () => {
  const state = stallState();
  assert.equal(state.input?.buttons.ok.enabled, false);
  assert.deepEqual(state.input?.selectable.cardIds, [12]);
  assert.equal(
    awaitingHuman(state),
    true,
    'a predicate that only looked at the buttons would call this idle and give it 1200 ms',
  );
});

test('liveness: what the seat can click does not depend on what the queue is doing', () => {
  const state = stallState();
  const stage = new NullStage();
  const queue = new CueQueue({ stage, registry: REGISTRY, data: EMPTY_CUE_DATA, mode: 'live' });

  const idleSelectable = [...(state.input?.selectable.cardIds ?? [])];
  const idlePlacements = layout(state).placements.map((p) => `${p.key}@${p.position.join(',')}`);

  queue.enqueueBatch(state.events, state);
  queue.tick(0);
  queue.tick(60);
  assert.ok(queue.length > 0, 'a cue really is in flight');
  assert.ok(stage.offsets.size > 0, 'and it really is moving something');

  // The two things a click goes through: the engine's own selectable list, and
  // `layout(state)` — which is where the hit proxies are parked (§5.5). Neither
  // moved, and neither can: the queue writes OFFSETS, and a proxy is not one.
  assert.deepEqual([...(state.input?.selectable.cardIds ?? [])], idleSelectable);
  assert.deepEqual(
    layout(state).placements.map((p) => `${p.key}@${p.position.join(',')}`),
    idlePlacements,
  );

  // …and the queue is re-compressed into §5.3's 250 ms because the engine is
  // waiting, rather than being paused or dropped.
  queue.retimeToBudget(250);
  assert.ok(queue.totalRemainingMs() <= 250);
});
