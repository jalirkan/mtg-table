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

/**
 * Source with its comments removed.
 *
 * The scans below are crude greps, and the files they read **document the traps
 * they are guarding** — `FigureLayer.tsx`'s header quotes drei's
 * `useFrame((state, delta) => mixer.update(delta))` verbatim and `models.ts`'s
 * names `gstatic.com`. A grep that cannot tell a warning from a call would make
 * writing the warning down a test failure, which is the wrong incentive by
 * exactly one order.
 */
function codeOf(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
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

/**
 * **Tier 2's half of the same rule** (report 13 §1.2, §10.9).
 *
 * `figures/` is the manifestation stage's pure half — the vocabulary, the
 * ladder, the pose function and the validator — and it is what lets
 * `figures.test.ts` and `figure-pose.test.ts` run the REAL resolver over all
 * 3,679 board frames of the corpus in bare Node, with no browser, no GPU and no
 * `figures.glb` on disk. CLAUDE.md's M7 convention 1 says in as many words that
 * `liveness.test.ts` is "the file to extend when the arena grows a module".
 */
test('liveness: figures/ is pure — no three, no React, no DOM, no clock', () => {
  const files = arenaFiles().filter((f) => f.path.startsWith('figures/'));
  assert.ok(files.length >= 4, `expected the figure module, saw ${String(files.length)} files`);
  for (const file of files) {
    for (const imported of importsOf(file.source)) {
      assert.ok(
        imported.from !== 'three' && !imported.from.startsWith('three/'),
        `figures/${file.path} imports three — §1.2's [NO three] is what makes node --test possible`,
      );
      assert.ok(
        !imported.from.startsWith('react') && !imported.from.includes('@react-three'),
        `figures/${file.path} imports React`,
      );
      assert.ok(
        !imported.from.includes('scene/'),
        `figures/${file.path} imports the renderer — the pose layer must not know one exists`,
      );
    }
    assert.ok(
      !/\bsetTimeout\(|\bsetInterval\(|requestAnimationFrame\(/.test(file.source),
      `figures/${file.path} starts a timer`,
    );
    assert.ok(
      !/\bdocument\.|\bwindow\./.test(file.source),
      `figures/${file.path} touches the DOM`,
    );
  }
});

/**
 * **One `useFrame`, and Tier 2 did not add a second.**
 *
 * The figure layer mounts objects and registers rigs; every transform it owns is
 * written by `CueRunner`'s single loop. The trap this guards is a real one and
 * is measured: drei's `useAnimations` is
 * `useFrame((state, delta) => mixer.update(delta))` — **one extra frame callback
 * per creature** (report 12 §5.4, `@react-three/drei@9.122.0`) — and using it
 * would put twelve of them on a busy board while also giving every mixer its own
 * wall clock, which loses pause, 0.5×–4×, skip and reduced motion at once (§3.4).
 */
test('liveness: the arena has exactly one useFrame, and it is CueRunner’s', () => {
  const owners: string[] = [];
  for (const file of arenaFiles()) {
    if (!/\buseFrame\(/.test(codeOf(file.source))) continue;
    owners.push(file.path);
  }
  // `Arena.tsx` owns the DPR governor's own `useFrame`, which §9.2 rule 7 calls
  // out as the deliberate exception (the resolution IS React state). Everything
  // else in the arena must go through `CueRunner`.
  assert.deepEqual(
    owners.sort(),
    ['Arena.tsx', 'scene/CueRunner.tsx'],
    'a new `useFrame` appeared in the arena. There is one frame loop and it is ' +
      'CueRunner.tsx (report 09 §9.2); a second one is how a figure gets a clock of its own.',
  );
});

/**
 * **Every model is loaded from `web/public/models/`, and nothing else.**
 *
 * Two CDN traps are already documented in this tree and both are one line to
 * fall into: drei's `useGLTF(path, true)` sets the DRACO decoder path to
 * `https://www.gstatic.com/draco/versioned/decoders/1.5.5/`
 * (`@react-three/drei/core/Gltf.js:8`), and drei's `<Text>` fetches its default
 * font from `fonts.gstatic.com` — which is why `scene/numberSprite.ts` draws its
 * numbers on a canvas instead. A local-only game whose figures need a CDN is a
 * game that silently loses its figures offline.
 */
test('liveness: no arena module names a CDN, and every model path is local', () => {
  const hosts = /gstatic\.com|unpkg\.com|jsdelivr|cdnjs|cdn\.|googleapis\.com/;
  for (const file of arenaFiles()) {
    // The comments that DOCUMENT the trap name the host, so only code is read:
    // block comments and `//` lines are stripped first.
    const hit = hosts.exec(codeOf(file.source));
    assert.equal(
      hit,
      null,
      `${file.path} names ${String(hit?.[0])} in code — the arena fetches models and fonts from ` +
        'web/public/ only',
    );
    for (const imported of importsOf(file.source)) {
      assert.ok(
        !/useGLTF|drei\/core\/Gltf/.test(imported.from),
        `${file.path} imports drei's useGLTF, which carries the gstatic DRACO default`,
      );
    }
  }

  const models = JSON.parse(
    readFileSync(fileURLToPath(new URL('../src/arena/figures/models.json', import.meta.url)), 'utf8'),
  ) as { models: Record<string, { path: string }> };
  for (const [id, entry] of Object.entries(models.models)) {
    assert.match(
      entry.path,
      /^models\/[A-Za-z0-9._-]+\.glb$/,
      `models.json["${id}"].path is "${entry.path}" — it must be a relative path under web/public/models/`,
    );
  }
});

/**
 * **`FigureLayer` mounts; it does not decide and it does not animate.** The
 * figure layer is downstream of everything: it may not reach a transport, may
 * not import the cue engine, and may not touch `onAct`.
 */
test('liveness: the figure layer mounts objects and reaches no decision', () => {
  const layer = codeOf(
    readFileSync(fileURLToPath(new URL('../src/arena/scene/FigureLayer.tsx', import.meta.url)), 'utf8'),
  );
  for (const imported of importsOf(layer)) {
    assert.ok(!imported.from.includes('transport/'), `FigureLayer imports ${imported.from}`);
    assert.ok(!imported.from.includes('cues/'), `FigureLayer imports the cue engine`);
  }
  // Word boundaries, because `AnimationAction` contains the substring `onAct`
  // and a grep without them fails on the type name three hands you.
  assert.ok(
    !/\bonAct\b|\bclickCard\b|\bselectable\b/.test(layer),
    'the figure layer reaches a click',
  );
  // §3.10 rule 2 — a figure is never a raycast target, and the clearing happens
  // in `models.ts`'s `instantiateFigure`, on every child of every clone.
  const models = readFileSync(
    fileURLToPath(new URL('../src/arena/scene/models.ts', import.meta.url)),
    'utf8',
  );
  assert.match(
    models,
    /raycast = \(\) => \{\}/,
    'instantiateFigure no longer clears `raycast` on the clone: a lunging figure would become a ' +
      'moving click target and report 09 §5.5’s guarantee unravels',
  );
});

/**
 * **T3/T4's half of the same rule** (report 13 §1.2, CLAUDE.md M7 convention 1 —
 * "the file to extend when the arena grows a module").
 *
 * The clip lane and the terrain grew the arena by five files, three of them pure
 * and two of them renderers, and the split is what the tests below stand on:
 * `figures/clips.ts`, `figures/tiles.ts` and `figures/casting.ts` are covered by
 * the `figures/` purity scan above automatically, which is the point of putting
 * them there. These are the clauses that scan is too general to make.
 */
test('liveness: T3/T4 grew the arena by five files, and each is on the right side', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, f.source]));
  // The three pure ones exist and are in `figures/`, so the scan above covers them.
  for (const name of ['figures/clips.ts', 'figures/tiles.ts', 'figures/casting.ts']) {
    assert.ok(files.has(name), `${name} is missing — T3/T4's pure layer`);
  }
  // The two renderers exist and are in `scene/`.
  for (const name of ['scene/tiles.ts', 'scene/casting.ts']) {
    const source = files.get(name);
    assert.ok(source !== undefined, `${name} is missing — T4's renderers`);
    for (const imported of importsOf(source)) {
      assert.ok(!imported.from.includes('transport/'), `${name} imports ${imported.from}`);
      assert.ok(
        !imported.from.includes('cues/queue') && !imported.from.includes('cues/registry'),
        `${name} imports the cue engine — a field is written by CueRunner, it does not drive itself`,
      );
    }
    const code = codeOf(source);
    assert.ok(!/\bonAct\b|\bclickCard\b|\bselectable\b/.test(code), `${name} reaches a click`);
    // §3.10 rule 2, for two more surfaces: neither a tile nor a mote may be a
    // raycast target. A tile lies UNDER the card whose click it would steal.
    assert.match(
      code,
      /raycast = \(\) => \{\}/,
      `${name} does not clear \`raycast\`: a tile or a mote would become a click target`,
    );
  }
  // The terrain and the casting layer own no clock of their own: `dt` is handed to
  // them by the one frame loop, and `CueRunner` passes **0 while the queue is
  // idle** (user decision 7, §8.3 rule 1) so `frameloop='demand'` keeps its
  // measured zero idle frames.
  for (const name of ['scene/tiles.ts', 'scene/casting.ts']) {
    const code = codeOf(files.get(name) ?? '');
    assert.ok(
      !/\bsetTimeout\(|\bsetInterval\(|requestAnimationFrame\(|performance\.now\(|Date\.now\(/.test(code),
      `${name} reads a clock of its own — the queue's virtual clock is the only clock (§3.4)`,
    );
  }
});

/**
 * **T5/T6's half of the same rule** (report 13 §1.2, CLAUDE.md M7 convention 1).
 *
 * The attachment manifestation and the stack grew the arena by two files — one
 * pure (`figures/attach.ts`, covered by the `figures/` purity scan above, which is
 * the point of putting it there) and one renderer (`scene/overlays.ts`) — and
 * extended two more. These are the clauses that scan is too general to make.
 */
test('liveness: T5–T7 grew the arena by four files, and each is on the right side', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, f.source]));
  assert.ok(files.has('figures/attach.ts'), 'figures/attach.ts is missing — T5’s pure layer');

  assert.ok(files.has('figures/duelists.ts'), 'figures/duelists.ts is missing — T7’s pure layer');

  for (const name of ['scene/overlays.ts', 'scene/busts.ts']) {
    const source = files.get(name);
    assert.ok(source !== undefined, `${name} is missing — T5/T7’s renderers`);
    for (const imported of importsOf(source)) {
      assert.ok(!imported.from.includes('transport/'), `${name} imports ${imported.from}`);
      assert.ok(
        !imported.from.includes('cues/queue') && !imported.from.includes('cues/registry'),
        `${name} imports the cue engine — a pose layer is written by CueRunner`,
      );
    }
    const code = codeOf(source);
    assert.ok(!/\bonAct\b|\bclickCard\b|\bselectable\b/.test(code), `${name} reaches a click`);
    // §3.10 rule 2, for two more surfaces: a halo hangs OVER the card whose click
    // it would otherwise steal, and a bust stands where the life plate is.
    assert.match(
      code,
      /raycast = \(\) => \{\}/,
      `${name} does not clear \`raycast\`: it would become a click target`,
    );
    // The queue's virtual clock is the only clock (§3.4): `dt` is handed in, and
    // `CueRunner` passes 0 while the queue is idle (user decision 7).
    assert.ok(
      !/\bsetTimeout\(|\bsetInterval\(|requestAnimationFrame\(|performance\.now\(|Date\.now\(/.test(code),
      `${name} reads a clock of its own`,
    );
  }
});

/**
 * **Bloom is one lazily-imported module, and nothing else reaches the composer**
 * (user decision 6; **D49**'s rule one level in).
 *
 * The arena chunk is itself lazy so the 2D board never downloads `three`; the
 * composer is lazy *inside* it so a table with bloom off never downloads
 * `postprocessing`. That only holds while exactly one file imports the library
 * and exactly one file reaches that file, through `import()` — a static import
 * anywhere would put the composer back on the arena's critical path, and nothing
 * but `npm run build`'s chunk list would say so.
 */
test('liveness: the bloom pass is lazy, and it is the only post pass', () => {
  const importers: string[] = [];
  const reachers: string[] = [];
  for (const file of arenaFiles()) {
    for (const imported of importsOf(file.source)) {
      if (/^(@react-three\/postprocessing|postprocessing)$/.test(imported.from)) importers.push(file.path);
      if (/scene\/Post(\.tsx)?$/.test(imported.from)) reachers.push(file.path);
    }
  }
  assert.deepEqual([...new Set(importers)].sort(), ['scene/Post.tsx'], 'the composer is imported outside Post.tsx');
  assert.deepEqual(reachers, ['Arena.tsx'], 'Post.tsx is reached from somewhere other than Arena.tsx');
  const arena = arenaFiles().find((f) => f.path === 'Arena.tsx')?.source ?? '';
  assert.match(
    codeOf(arena),
    /lazy\(\(\) =>\s*import\('\.\/scene\/Post\.tsx'\)/,
    'Arena.tsx no longer reaches Post.tsx through lazy(() => import(...))',
  );
  assert.ok(
    !/from '\.\/scene\/Post/.test(arena),
    'Arena.tsx imports Post.tsx statically — the composer is back on the critical path',
  );
});

/**
 * **Every pose layer is bound from the ONE frame loop.**
 *
 * Tier 2 added four fields that are written once a frame — the discs, the terrain,
 * the casting anchor and T5's overlays — and each of them is a `bind()` that takes
 * the frame's `dt`. A second caller anywhere would be a second writer of the same
 * instance buffers, and the symptom would be a layer that is one frame stale or
 * drawn twice with different data. `useFrame` is already asserted to live in one
 * file; this asserts that what it drives is driven from there too.
 */
test('liveness: the pose layers are bound only from CueRunner’s frame loop', () => {
  const callers = new Map<string, string[]>();
  for (const file of arenaFiles()) {
    const code = codeOf(file.source);
    for (const field of ['discs', 'tileField', 'castingField', 'overlays', 'bustField']) {
      if (!new RegExp(`\\b${field}\\.bind\\(`).test(code)) continue;
      const list = callers.get(field) ?? [];
      list.push(file.path);
      callers.set(field, list);
    }
  }
  assert.equal(callers.size, 5, `expected five pose layers, saw ${[...callers.keys()].join(', ')}`);
  for (const [field, paths] of callers) {
    assert.deepEqual(
      paths.sort(),
      ['scene/CueRunner.tsx'],
      `${field}.bind() is called from ${paths.join(', ')} — there is one frame loop`,
    );
  }
});

/**
 * **§6.4's freeze is about CLIPS, and about nothing else.**
 *
 * Report 13 §6.4 gives it two guards in as many words: it freezes clips only —
 * never the HUD, never the decision layer, never a click — and it must not freeze
 * the spell form, which is the thing the player is being asked to look at. The
 * first is a source fact and is asserted here; the second is `CastingField`'s own
 * clock, which `web/test/stack.test.ts` covers on the data side.
 */
test('liveness: the combat freeze cannot reach the decision layer', () => {
  const layer = codeOf(
    readFileSync(fileURLToPath(new URL('../src/arena/DecisionLayer.tsx', import.meta.url)), 'utf8'),
  );
  assert.ok(
    !/\bfrozen\b|combatFreeze/.test(layer),
    'the decision layer reads the combat freeze — §6.4 freezes clips and nothing else',
  );
  const runner = codeOf(
    readFileSync(fileURLToPath(new URL('../src/arena/scene/CueRunner.tsx', import.meta.url)), 'utf8'),
  );
  assert.match(runner, /pose\.frozen/, 'CueRunner no longer reads the freeze — move this test with it');
});

/**
 * **The clip lane is driven from ONE place, and it is the one `useFrame`.**
 *
 * The trap is measured and named in report 12 §5.4: drei's `useAnimations` is
 * `useFrame((state, delta) => mixer.update(delta))`, one callback per creature,
 * each with its own wall clock. `mixer.update` must therefore appear exactly
 * twice in the arena — once in `CueRunner`'s loop, and once in `FigureLayer`'s
 * mount-time pose — and **every** call must pass a literal `0`, because a
 * non-zero delta is a mixer that advances a clock the cue queue does not own
 * (§3.4). That is what buys pause, 0.5×–4×, skip and reduced motion for the
 * animations with no new code.
 */
test('liveness: every mixer tick is a ZERO delta, and only two files tick one', () => {
  const owners: string[] = [];
  for (const file of arenaFiles()) {
    const code = codeOf(file.source);
    const ticks = [...code.matchAll(/mixer\.update\(([^)]*)\)/g)].map((m) => m[1] ?? '');
    if (ticks.length === 0) continue;
    owners.push(file.path);
    for (const arg of ticks) {
      assert.equal(
        arg.trim(),
        '0',
        `${file.path} calls mixer.update(${arg}) — a non-zero delta gives the mixer a clock of ` +
          'its own and loses pause, speed, skip and reduced motion at once (report 13 §3.4)',
      );
    }
  }
  assert.deepEqual(
    owners.sort(),
    ['scene/CueRunner.tsx', 'scene/FigureLayer.tsx'],
    'a new file ticks an AnimationMixer. There is one frame loop and it is CueRunner.tsx.',
  );
});

/**
 * **`action.time` is written in exactly one place.**
 *
 * The clip lane's whole mechanism is "the cue owns `t`" (§3.4). A second writer
 * would be a second clock, and the symptom is the one report 13 §3.4 spells out:
 * skipping a cue leaves a creature frozen mid-lunge.
 */
test('liveness: only the frame loop writes action.time', () => {
  const writers: string[] = [];
  for (const file of arenaFiles()) {
    if (/\.time\s*=/.test(codeOf(file.source))) writers.push(file.path);
  }
  assert.deepEqual(
    writers.sort(),
    ['scene/CueRunner.tsx', 'scene/FigureLayer.tsx'],
    'something other than the frame loop scrubs a clip',
  );
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
