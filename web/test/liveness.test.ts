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
    // T8's camera switcher: five views, the director, spectator.
    ViewSwitcher: ['.arena__views'],
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
 * **Every model is loaded from `web/public/models/`, and nothing else — and no
 * arena module names ANY off-origin address** (Tier 2 follow-up 8, closed).
 *
 * Two CDN traps are already documented in this tree and both are one line to
 * fall into: drei's `useGLTF(path, true)` sets the DRACO decoder path to a
 * gstatic.com URL (`@react-three/drei/core/Gltf.js:8`), and drei's `<Text>`
 * fetches its default font from Google's font CDN — which is why
 * `scene/numberSprite.ts` draws its numbers on a canvas instead. A local-only
 * game whose figures need a CDN is a game that silently loses its figures
 * offline.
 *
 * **This clause used to be a hostname DENYLIST** (gstatic, unpkg, jsdelivr, …),
 * and a denylist is only as good as its author's imagination: the slice-1 and
 * slice-2 verification passes each put `'https://example.com/figures.glb'` into
 * `scene/models.ts` on a scratch copy and the clause stayed green. It is now an
 * ALLOW-list over every string literal in the tree: a string that carries a URL
 * scheme (`https://`, `wss://`, protocol-relative `//host`) is a failure unless
 * it is one of the few that are provenance or credit — a link the viewer may
 * click, never an address the arena loads. The negative controls are in the test
 * itself, so the check proves it can fail every run.
 */
/** `scheme://` anywhere, or a protocol-relative `//host` at the start. */
const URL_SCHEME = /[a-z][a-z0-9+.-]*:\/\/|^\/\/[a-z0-9]/i;
/** Every '…', "…" and `…` literal in some code — JSX attribute strings included. */
function stringLiterals(code: string): string[] {
  return [...code.matchAll(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g)].map((m) =>
    m[0].slice(1, -1),
  );
}
/**
 * The allow-list: `file → the URL literals it may contain`, each with its reason.
 * Adding an entry is a decision (and a line here saying why), not a formality.
 */
const URL_ALLOW: Readonly<Record<string, readonly string[]>> = {
  // The art credit's link (`ArtCredit`, Scryfall's image-use guidelines): an
  // `href` the viewer may click, never fetched by the page.
  'Arena.tsx': ['https://scryfall.com'],
};
/** In the arena's JSON data, only these keys may hold a URL — provenance, never a load path. */
const URL_KEYS_ALLOWED: ReadonlySet<string> = new Set(['source', 'licenceUrl', 'url', 'page']);

function offOriginLiterals(path: string, code: string): string[] {
  const allowed = URL_ALLOW[path] ?? [];
  return stringLiterals(code).filter((literal) => URL_SCHEME.test(literal) && !allowed.includes(literal));
}

/** Every `"key": "value"` pair of a JSON document whose value has a URL scheme and whose key may not. */
function offOriginJson(value: unknown, key = ''): string[] {
  if (typeof value === 'string') return URL_SCHEME.test(value) && !URL_KEYS_ALLOWED.has(key) ? [`${key}: ${value}`] : [];
  if (Array.isArray(value)) return value.flatMap((item) => offOriginJson(item, key));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => offOriginJson(v, k));
  }
  return [];
}

test('liveness: no arena module names an off-origin address, and every model path is local', () => {
  // The negative controls first — each of these must be caught, every run.
  const controls: Array<[string, string]> = [
    ['scene/models.ts', "const FALLBACK_URL = 'https://example.com/figures.glb';"],
    ['scene/models.ts', 'loader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.5/");'],
    ['scene/models.ts', 'const u = `https://${host}/figures.glb`;'],
    ['scene/models.ts', "fetch('//cdn.example.com/figures.glb');"],
    ['scene/models.ts', "const socket = new WebSocket('wss://example.com/frames');"],
    ['Arena.tsx', "const art = 'https://cards.scryfall.io/normal/front/x.jpg';"],
  ];
  for (const [path, line] of controls) {
    assert.ok(offOriginLiterals(path, line).length === 1, `the URL clause no longer catches: ${line}`);
  }
  assert.deepEqual(offOriginJson({ models: { agent: { path: 'https://example.com/figures.glb' } } }), [
    'path: https://example.com/figures.glb',
  ]);
  assert.deepEqual(offOriginJson({ source: 'https://kenney.nl/assets/mini-characters' }), []);

  // Then the tree.
  let literals = 0;
  for (const file of arenaFiles()) {
    const code = codeOf(file.source);
    literals += stringLiterals(code).length;
    assert.deepEqual(
      offOriginLiterals(file.path, code),
      [],
      `${file.path} names an off-origin address in code — the arena loads models and fonts from ` +
        'web/public/ only; a provenance or credit link goes in URL_ALLOW with its reason',
    );
    for (const imported of importsOf(file.source)) {
      assert.ok(
        !/useGLTF|drei\/core\/Gltf/.test(imported.from),
        `${file.path} imports drei's useGLTF, which carries the gstatic DRACO default`,
      );
    }
  }
  assert.ok(literals > 500, `expected the arena's string literals, saw ${String(literals)}`);
  // Every allow-listed literal is still there — an entry nothing uses is a stale permission.
  for (const [path, urls] of Object.entries(URL_ALLOW)) {
    const code = codeOf(arenaFiles().find((f) => f.path === path)?.source ?? '');
    for (const url of urls) assert.ok(stringLiterals(code).includes(url), `URL_ALLOW["${path}"] names ${url}, which is gone`);
  }

  for (const json of ['figures/models.json', 'figures/figures.json', 'cues/cues.json']) {
    const data = JSON.parse(readFileSync(ARENA + json, 'utf8')) as unknown;
    assert.deepEqual(offOriginJson(data), [], `${json} has a URL outside a provenance field`);
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

/**
 * **T8 — a departing figure is drawn by its own death cue and by nothing else**
 * (Tier 2 follow-up 2).
 *
 * The body of a creature that has just died has no pose, so the only thing
 * allowed to decide that it is drawn is its card's `die` request on the stage —
 * which is what makes skip, flush, a scrub and a new `gameId` end it in the same
 * frame as they end the cue. Four source facts hold that shape:
 *
 *  - the per-frame half (`departures.bind`) is called from `DiscField.bind` and
 *    nowhere else — so from the one `useFrame`, through a layer the previous clause
 *    already pins to `CueRunner`;
 *  - the field is installed (`setDepartures`) and fed (`departures.add`) only by
 *    `FigureLayer`, at commit time;
 *  - `FigureLayer`'s field reads the stage's clip lane (`clipOf`) and gates on the
 *    `'die'` clip — a body with no request is not drawn;
 *  - and it builds nothing in the frame loop: `instantiateFigure` and
 *    `makeHoloMaterial` appear in `add`, which `DiscField` never calls.
 */
test('liveness: a departing figure is drawn by its own death cue and nothing else (T8)', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, codeOf(f.source)]));
  const callers = (pattern: RegExp): string[] =>
    [...files].filter(([, code]) => pattern.test(code)).map(([path]) => path).sort();

  assert.deepEqual(callers(/\bdepartures\??\.bind\(/), ['scene/discs.ts'], 'the departures are bound outside the disc field');
  assert.deepEqual(callers(/\.setDepartures\(/), ['scene/FigureLayer.tsx'], 'something else installs the departures');
  assert.deepEqual(callers(/\bdepartures\.add\(/), ['scene/FigureLayer.tsx'], 'something else feeds the departures');

  const layer = files.get('scene/FigureLayer.tsx') ?? '';
  const field = layer.slice(layer.indexOf('class DepartureField'));
  assert.ok(field.length > 100, 'FigureLayer.tsx no longer defines DepartureField — move this test with it');
  const bindBody = field.slice(field.indexOf('bind(source'), field.indexOf('drawn()'));
  assert.match(bindBody, /\.clipOf\(/, 'the departing body no longer reads the clip lane');
  assert.match(bindBody, /'die'/, 'the departing body is no longer gated on the die clip');
  // D64: the fate is the QUEUE's (a death cue queued or running), decided by the
  // one pure rule the corpus timeline test also walks.
  assert.match(bindBody, /\.deathPending\(/, 'the departing body no longer asks the queue whether it is dying');
  assert.match(bindBody, /\bstepDeparture\(/, 'the departing body no longer decides by stepDeparture');
  assert.ok(
    !/instantiateFigure|makeHoloMaterial|new THREE\./.test(bindBody),
    'the departing figures build or allocate in the frame loop',
  );
  assert.match(bindBody, /mixer\.update\(0\)/, 'the departing body no longer scrubs on the cue clock');

  // …and that only holds if the batch is in the queue BEFORE the body's first
  // frame: the intake is a LAYOUT effect of the DOM root, which runs before the
  // canvas root can commit the body (Arena.tsx's comment on it says why).
  const arena = files.get('Arena.tsx') ?? '';
  const enqueue = arena.indexOf('queue.enqueueBatch(state.events');
  assert.ok(enqueue > 0, 'Arena.tsx no longer enqueues the batch — move this test with it');
  const effect = arena.lastIndexOf('Effect(() => {', enqueue);
  assert.ok(
    effect > 0 && arena.slice(effect - 10, effect).endsWith('useLayout'),
    'the batch intake is no longer a useLayoutEffect: a dying body could have its first frame before its ' +
      'death is queued, and would never be drawn',
  );
});

/**
 * **The frame loop allocates nothing — mechanically, for the Tier 2 code in it**
 * (M7 convention 5; the slice-2 verification pass).
 *
 * `cues-exhaustive.test.ts` checks the pooled offset compose field for field, but
 * nothing read the NEW frame-loop code: the verifier put `const _junk = [t, t];`
 * into `DepartureField.bind` on a scratch copy and liveness stayed green, and
 * `bind` itself walked `this.entries.values()` — an iterator a frame. So this reads
 * the bodies the one `useFrame` reaches through the disc field — the disc field's
 * own `bind`, the departing bodies' `bind` and its two helpers, the queue's
 * `deathPending` and the pure lane functions they call — and rejects every
 * allocating construct a grep can see. The negative controls are in the test: each
 * junk line is spliced into every body and must be caught.
 */
const ALLOCATIONS: ReadonlyArray<[string, RegExp]> = [
  ['`new`', /\bnew\s+[A-Za-z_$]/],
  ['an array literal', /(?:^|[=(,:?&|!]|\breturn)\s*\[/m],
  ['an object literal', /(?:^|[=(,:?&|]|\breturn)\s*\{/m],
  ['a spread', /\.\.\./],
  ['a closure', /=>|\bfunction\b/],
  ['a template string', /`/],
  ['an iterator (for…of)', /\bfor\s*\([^)]*\bof\b/],
  ['an iterator (.values/.keys/.entries)', /\.(?:values|keys|entries)\(\s*\)/],
  ['an allocating array or string method', /\.(?:map|filter|slice|concat|flat|flatMap|split|join|clone)\(/],
  ['an allocating builtin', /\bArray\.from\b|\bObject\.(?:keys|values|entries|assign|fromEntries)\b|\bString\(|\bJSON\./],
];

/**
 * The body of `name`'s DEFINITION in `code`, braces matched. A line that starts
 * with `name(` is a definition only if its parameter list is followed by a return
 * type or a `{` — `commitCount(this.mesh, front);` is a call.
 */
function bodyOf(code: string, name: string): string {
  const headers = new RegExp(`^\\s*(?:export\\s+)?(?:function\\s+|private\\s+)?${name}\\(`, 'gm');
  let header: RegExpExecArray | null;
  while ((header = headers.exec(code)) !== null) {
    let i = header.index + header[0].length;
    for (let depth = 1; depth > 0 && i < code.length; i++) {
      if (code[i] === '(') depth++;
      else if (code[i] === ')') depth--;
    }
    const after = code.slice(i).trimStart()[0];
    if (after !== ':' && after !== '{') continue;
    const open = code.indexOf('{', i);
    let depth = 0;
    for (let j = open; j < code.length; j++) {
      if (code[j] === '{') depth++;
      else if (code[j] === '}' && --depth === 0) return code.slice(open + 1, j);
    }
  }
  return '';
}

function allocationsIn(body: string): string[] {
  return ALLOCATIONS.filter(([, pattern]) => pattern.test(body)).map(([what]) => what);
}

/**
 * **A disc on a card is drawn after the card** (T8 fix). `figure-pose.test.ts`
 * proves over the corpus that `ON_CARD_DISC_ORDER` is above every card a disc can
 * lie on; this pins the renderer to that constant — the on-card pass is built at
 * it, both passes are mounted, and a pose flagged `onCard` goes to it.
 */
test('liveness: the on-card stand discs are their own pass, after the cards', () => {
  const discs = codeOf(readFileSync(ARENA + 'scene/discs.ts', 'utf8'));
  assert.match(discs, /this\.onCardMesh = discMesh\(material, capacity, ON_CARD_DISC_ORDER\)/);
  assert.match(discs, /pose\.onCard \? this\.onCardMesh : this\.mesh/);
  const layer = codeOf(readFileSync(ARENA + 'scene/FigureLayer.tsx', 'utf8'));
  assert.match(layer, /<primitive object=\{discs\.onCardMesh\} \/>/, 'the on-card disc pass is not mounted');
});

test('liveness: the frame loop’s Tier 2 bodies allocate nothing — the disc field, the departing bodies, the death query', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, codeOf(f.source)]));
  const layer = files.get('scene/FigureLayer.tsx') ?? '';
  const field = layer.slice(layer.indexOf('class DepartureField'));
  const discs = files.get('scene/discs.ts') ?? '';
  const discField = discs.slice(discs.indexOf('class DiscField'));
  const bodies: Array<[string, string]> = [
    ['DiscField.bind', bodyOf(discField, 'bind')],
    ['discs.ts commitCount', bodyOf(discs, 'commitCount')],
    ['DepartureField.bind', bodyOf(field, 'bind')],
    ['DepartureField.driveTransient', bodyOf(field, 'driveTransient')],
    ['DepartureField.actionOf', bodyOf(field, 'actionOf')],
    ['CueQueue.deathPending', bodyOf(files.get('cues/queue.ts') ?? '', 'deathPending')],
    ['clips.ts stepDeparture', bodyOf(files.get('figures/clips.ts') ?? '', 'stepDeparture')],
    ['clips.ts departureWeight', bodyOf(files.get('figures/clips.ts') ?? '', 'departureWeight')],
    ['clips.ts departureOpacity', bodyOf(files.get('figures/clips.ts') ?? '', 'departureOpacity')],
    ['clips.ts departureDrain', bodyOf(files.get('figures/clips.ts') ?? '', 'departureDrain')],
  ];
  // The bodies were found, and they are the frame loop's: bind calls the rest.
  for (const [name, body] of bodies) assert.ok(body.length > 20, `could not find the body of ${name}`);
  const bind = bodies[2]![1];
  for (const callee of ['deathPending(', 'stepDeparture(', 'driveTransient(', 'departureWeight(', 'departureOpacity(', 'departureDrain(']) {
    assert.ok(bind.includes(callee), `DepartureField.bind no longer calls ${callee} — update the body list`);
  }
  assert.ok(bodies[0]![1].includes('departures?.bind('), 'DiscField.bind no longer binds the departing bodies');

  // The negative controls: every junk line, spliced into every body, is caught.
  const junk = [
    'const _junk = [t, t];',
    'const o = { a: 1 };',
    'for (const e of this.entries.values()) {}',
    'for (const e of list) {}',
    'const f = () => 1;',
    'const s = `${1}`;',
    'const v = new THREE.Vector3();',
    'const c = [...xs];',
    'xs.map(id);',
    'const k = Object.keys(o);',
    'const p = entry.pose.position.slice();',
  ];
  for (const [name, body] of bodies) {
    for (const line of junk) {
      assert.ok(allocationsIn(`\n${line}\n${body}`).length > 0, `the allocation scan misses \`${line}\` in ${name}`);
    }
  }

  for (const [name, body] of bodies) {
    assert.deepEqual(allocationsIn(body), [], `${name} allocates in the frame loop (§9.2 rule 6)`);
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

/**
 * **T8 — the camera grew five views, a spectator mode and a director, and it is
 * still arithmetic.** `camera.ts` is where §8's seven rules are checkable with
 * plain numbers (`camera.test.ts` drives the auto director over every batch in
 * the corpus with an injected clock), and that only holds while the module has
 * no renderer, no DOM, no storage and no clock of its own: time is always an
 * argument. The storage the view choice needs is `Arena.tsx`'s, not this file's.
 */
test('liveness: camera.ts has no renderer, no DOM, no storage and no clock of its own', () => {
  const file = arenaFiles().find((f) => f.path === 'camera.ts');
  assert.ok(file !== undefined, 'camera.ts is missing');
  for (const imported of importsOf(file.source)) {
    assert.ok(
      imported.from !== 'three' &&
        !imported.from.startsWith('three/') &&
        !imported.from.startsWith('react') &&
        !imported.from.includes('@react-three'),
      `camera.ts imports ${imported.from}`,
    );
    assert.ok(!imported.from.includes('scene/'), `camera.ts imports the renderer (${imported.from})`);
    assert.ok(!imported.from.includes('transport/'), `camera.ts imports ${imported.from}`);
    // The cue engine is a TYPE here (`AnchorRef`, `CameraRequest`): the lane is
    // told what a cue asked for; it never runs one.
    if (imported.from.includes('cues/')) {
      assert.ok(imported.typeOnly, `camera.ts imports ${imported.from} as a value`);
    }
  }
  const code = codeOf(file.source);
  assert.ok(
    !/\bsetTimeout\(|\bsetInterval\(|requestAnimationFrame\(|performance\.now\(|Date\.now\(/.test(code),
    'camera.ts reads a clock or starts a timer — every function takes `now`',
  );
  assert.ok(
    !/\bdocument\.|\bwindow\.|localStorage|matchMedia/.test(code),
    'camera.ts touches the DOM — reduced motion and the stored view are handed in by Arena.tsx',
  );
});

/**
 * **T8 — one writer of the camera.** A view change, a director cut and a cue
 * swoop all become a pose in exactly one place, `CueRunner`'s frame loop, after
 * `OrbitControls` has had its say. A second caller of the lane's tick or of
 * `applyView` would be a second camera, and the two would fight every frame.
 */
test('liveness: only CueRunner drives the camera lane', () => {
  const callers = new Map<string, string[]>();
  for (const file of arenaFiles()) {
    const code = codeOf(file.source);
    for (const call of ['director.tick(', 'director.applyView(', 'director.request(']) {
      if (!code.includes(call)) continue;
      callers.set(call, [...(callers.get(call) ?? []), file.path]);
    }
  }
  for (const call of ['director.tick(', 'director.applyView(', 'director.request(']) {
    assert.deepEqual(callers.get(call), ['scene/CueRunner.tsx'], `${call} is called from ${String(callers.get(call))}`);
  }
});

/**
 * **The loop mode is CueRunner's decision, and a re-render cannot revert it**
 * (slice-2 verification fix; the root is Tier 1's).
 *
 * fiber 8.18's `configure` runs on EVERY render of `<Canvas>` and does
 * `if (state.frameloop !== frameloop) state.setFrameloop(frameloop)` against the
 * prop. `Arena.tsx` passed a literal `frameloop="demand"`, so any re-render of
 * the arena that did not also re-run CueRunner's sync — a key hint, pressing the
 * view you are already on, a greyed switcher click — parked the loop mid-batch:
 * measured on `human-auto-42`@717, a `1` pressed 120 ms into the batch left
 * `gl.info.render.frame` stuck at 10 for 3 s with five cues still queued. The
 * behaviour cannot be exercised here (no WebGL under `node --test`), so the
 * shape that makes it impossible is held instead:
 *
 *  1. no `frameloop` prop anywhere in the arena is a string literal;
 *  2. `<Canvas>` reads the ref CueRunner writes;
 *  3. CueRunner writes that ref in the same breath as every `setFrameloop`, and
 *     nothing else in the arena calls `setFrameloop` at all.
 *
 * Negative-controlled when written: restoring `frameloop="demand"`, or dropping
 * the `loopRef.current = mode` line, turns this red.
 */
test('liveness: the Canvas loop mode is CueRunner’s decision, never a literal a re-render reverts', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, codeOf(f.source)]));
  for (const [path, code] of files) {
    assert.doesNotMatch(
      code,
      /\bframeloop\s*=\s*(?:["'`]|\{\s*["'`])/,
      `${path} passes a literal frameloop — fiber re-applies it on every render and parks a running batch`,
    );
    if (path === 'scene/CueRunner.tsx') continue;
    assert.doesNotMatch(code, /\bsetFrameloop\(/, `${path} sets the loop mode; only CueRunner's sync may`);
  }
  const arena = files.get('Arena.tsx') ?? '';
  assert.match(arena, /<Canvas[\s\S]*?\bframeloop=\{loopRef\.current\}/, '<Canvas> no longer reads loopRef');
  const runner = files.get('scene/CueRunner.tsx') ?? '';
  const calls = [...runner.matchAll(/\bsetFrameloop\(([^)]*)\)/g)];
  assert.ok(calls.length >= 1, 'CueRunner no longer sets the loop mode at all');
  for (const call of calls) {
    const arg = (call[1] ?? '').trim();
    const before = runner.slice(Math.max(0, call.index - 200), call.index);
    assert.ok(
      /^[A-Za-z_$][\w$]*$/.test(arg) && new RegExp(`loopRef\\.current\\s*=\\s*${arg}\\s*;`).test(before),
      `setFrameloop(${arg}) is not preceded by loopRef.current = ${arg} — the next Arena re-render would revert it`,
    );
  }
});

/**
 * **T8 — the stored view never breaks the page.** `localStorage` can throw (a
 * private window, blocked site data) and can come back empty; the arena renders
 * the table view either way. So every touch of it is inside a `try`, and only
 * `Arena.tsx` touches it at all.
 */
test('liveness: every localStorage access in the arena is Arena.tsx’s, inside try', () => {
  for (const file of arenaFiles()) {
    const code = codeOf(file.source);
    if (!code.includes('localStorage')) continue;
    assert.equal(file.path, 'Arena.tsx', `${file.path} touches localStorage`);
    const lines = code.split('\n');
    lines.forEach((line, i) => {
      if (!line.includes('localStorage')) return;
      const before = lines.slice(Math.max(0, i - 3), i).join('\n');
      assert.match(before, /try \{/, `Arena.tsx line ${String(i + 1)} reads or writes localStorage outside a try`);
    });
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
