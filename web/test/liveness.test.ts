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
import { anchorDelta, anchorPosition, layout } from '../src/arena/layout.ts';
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
      // The status layer's turn-order bar (D210): phase stops, clickable.
      '.arena__phases',
      '.arena__seat',
      '.ask-modal',
      '.ask-modal__scrim',
      '.arena__over',
    ],
    CueControls: ['.arena__cues'],
    // T8's camera switcher: five views, the director, spectator.
    ViewSwitcher: ['.arena__views'],
    ArtCredit: ['.arena__credit'],
    // D241: the inspect chip — a link to the workshop's inspect view, beside the credit.
    InspectChip: ['.arena__inspect'],
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

/**
 * **The plates render the match; they do not read it for themselves** (match
 * setup, amendment M44). A seat's deck and the AI's profile reach the arena's
 * HUD through `seatMatchOf(state.hello, …)` — the one reader of
 * `hello_ok.match`, the same call the board's rail makes (M6 convention 1: one
 * reader per optional field) — so the renderer cannot print a key the reader
 * would have refused, such as a path an emitter put on the AI's deck (D105).
 * And like a button label, a deck name is rendered and never compared: the
 * arena decides nothing.
 */
test('liveness: the seat plates read the match through seatMatchOf and never compare it', () => {
  const layer = codeOf(
    readFileSync(fileURLToPath(new URL('../src/arena/DecisionLayer.tsx', import.meta.url)), 'utf8'),
  );
  assert.match(
    layer,
    /seatMatchOf\(state\.hello,\s*player\.id\)/,
    'the arena plates no longer read `seatMatchOf(state.hello, player.id)` — move this test with them',
  );
  assert.ok(
    !/\bhello\??\.match\b|\.yourDeck\b|\.aiDeck\b/.test(layer),
    'DecisionLayer reads `hello_ok.match` directly — `seatMatchOf` is its one reader (M44, D105)',
  );
  assert.ok(
    !/(deck|aiProfile)\s*(===|!==)\s*['"`]|\b(deck|aiProfile)\.(includes|match|startsWith|endsWith)\(/.test(
      layer,
    ),
    'DecisionLayer branches on a deck name or a profile — they are rendered, never compared',
  );
});

/**
 * **Spectating does not make the arena a transport** (amendment M47, D118).
 * Follow mode — a replay of a log that is still being written — polls the dev
 * route from `transport/follow.ts` and paces frames inside `LogReplayTransport`.
 * The arena is handed a `ClientState` and, as PLAIN DATA, one word
 * (`following` / `stalled` / `finished`), declared in `Arena.tsx` rather than
 * imported, because nothing under `arena/` may import a transport (the first
 * clause of this file). So no arena module fetches, polls or opens a socket, and
 * the "watching" line reads the match through `matchupOf` — `seatMatchOf` per
 * seat — and nothing that holds a card.
 *
 * **A poll is spelled more ways than `setInterval`** (the polish lane's follow-up
 * 1, applied at the art-direction lanes' merge): a recursive `setTimeout` — `const
 * tick = () => { void load(); setTimeout(tick, 500); }` — or an idle callback
 * that re-arms itself polls just as well, and the first cut of this clause let
 * both through. So `setTimeout(`, `setInterval(` and `requestIdleCallback(` are
 * all refused, and a one-shot timer the arena genuinely needs carries its reason
 * on its own line (`// ALLOW timer: <reason>`) — today the art rung's idle
 * callback and its Safari stand-in (`art.ts`). The negative controls: the shapes
 * the old clause let through, and a real arena file with a recursive poll spliced
 * in, must fail.
 */
test('liveness: follow mode reaches the arena as a word — it never polls, and the watching line reads matchupOf', () => {
  /** A request, a connection, or a timer that can re-arm itself: how a poll is spelled. */
  const POLLS = /\bfetch\s*\(|\bset(?:Interval|Timeout)\s*\(|\brequestIdleCallback\s*\(|new\s+(?:EventSource|WebSocket)\s*\(|\bXMLHttpRequest\b/;
  /** A one-shot timer the arena genuinely needs carries its reason on its own line. */
  const ALLOW_TIMER = /\/\/ ALLOW timer: \S/;
  const allowed: string[] = [];
  for (const file of arenaFiles()) {
    // (codeOf drops block comments, so a line is named by its text, not its number.)
    for (const line of codeOf(file.source).split('\n')) {
      if (ALLOW_TIMER.test(line)) {
        // An ALLOW names a timer that is really there, never a line to hide behind.
        assert.ok(POLLS.test(line), `${file.path}: \`${line.trim()}\` carries an ALLOW timer with no timer on it`);
        allowed.push(file.path);
        continue;
      }
      assert.ok(
        !POLLS.test(line),
        `${file.path}: \`${line.trim()}\` fetches, polls or opens a connection — how frames arrive is transport/'s business (D118)`,
      );
    }
  }
  // The allowed timers are the art rung's two one-shots, and nothing else: a new
  // ALLOW is a new timer, so it is a change to this list, with its reason.
  assert.deepEqual(allowed, ['art.ts', 'art.ts'], `the arena's allowed timers moved or grew: ${allowed.join(', ')}`);
  // The negative controls: the shapes the old clause let through must be caught,
  // and a copy of a real arena file with a recursive poll spliced in must fail.
  for (const probe of [
    'const tick = () => { void load(); setTimeout(tick, 500); };',
    'function poll() { window.setTimeout(poll, 500); }',
    'globalThis.setTimeout (() => refresh(), 500);',
    'requestIdleCallback(function again() { requestIdleCallback(again); });',
  ]) {
    assert.ok(POLLS.test(probe), `the poll clause misses: ${probe}`);
  }
  const layerSrc = readFileSync(fileURLToPath(new URL('../src/arena/DecisionLayer.tsx', import.meta.url)), 'utf8');
  const spliced = `${codeOf(layerSrc)}\nconst tick = () => { void load(); setTimeout(tick, 500); };\ntick();\n`;
  assert.ok(
    spliced.split('\n').some((l) => !ALLOW_TIMER.test(l) && POLLS.test(l)),
    'a spliced recursive poll passed',
  );
  const arena = codeOf(readFileSync(fileURLToPath(new URL('../src/arena/Arena.tsx', import.meta.url)), 'utf8'));
  assert.match(arena, /follow\?: ArenaFollow \| null/, 'Arena.tsx no longer takes follow mode as a plain prop');
  assert.match(arena, /export type ArenaFollow = 'following' \| 'stalled' \| 'finished' \| 'lost';/);
  const layer = codeOf(
    readFileSync(fileURLToPath(new URL('../src/arena/DecisionLayer.tsx', import.meta.url)), 'utf8'),
  );
  assert.match(layer, /matchupOf\(state\.hello\)/, 'the watching line no longer reads matchupOf(state.hello)');
  const watch = layer.split('function WatchLine')[1]?.split('\nfunction ')[0] ?? '';
  assert.ok(watch.length > 200, 'could not find WatchLine in DecisionLayer.tsx — move this test with it');
  assert.ok(
    !/\.(zones|cards|board|library|hand|stack|stackCards)\b|\bstate\b/.test(watch),
    'the watching line reads a zone or a card — it prints deck names and profiles from the handshake, nothing else',
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

  for (const json of ['figures/models.json', 'figures/figures.json', 'figures/traits.json', 'cues/cues.json']) {
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
  // **T13 adds the third**, and it is the same loop: the duelist field's `bind`
  // is reached only through `BustField.bind` from `CueRunner`'s one `useFrame`
  // (the clause below pins that), and its build scrubs the first frame at mount
  // exactly as `FigureLayer` does. Still a literal 0 everywhere.
  assert.deepEqual(
    owners.sort(),
    ['scene/CueRunner.tsx', 'scene/DuelistLayer.tsx', 'scene/FigureLayer.tsx'],
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
  // T13: the duelist field writes its gestures' `action.time` from the cue's `t`
  // in its `bind`, which only the frame loop reaches (see the duelist clause).
  assert.deepEqual(
    writers.sort(),
    ['scene/CueRunner.tsx', 'scene/DuelistLayer.tsx', 'scene/FigureLayer.tsx'],
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
 * **Slice 4 — a costume is a POSE, written at commit, and the hologram still
 * has no clock.** A figure's palette (`FigurePose.costume`) changes when the
 * snapshot does, so it is written into the material by `figureMaterial.ts`'s
 * `applyCostume` from `FigureLayer`'s layout effects (and a departing body's
 * `add`) — never from the one `useFrame`: a colour parse per figure per frame is
 * the allocation §9.2 rule 6 forbids, and a palette the frame loop owns is a
 * palette that can drift from the pose. Four source facts:
 *
 *  - no frame-loop body calls `applyCostume` or writes `uCostume` — `CueRunner.tsx`
 *    (all of it), `DiscField.bind`, `DepartureField.bind`, `PropField.bind`
 *    (negative-controlled: the call spliced into each is caught);
 *  - only `figureMaterial.ts` writes a `uCostume` colour;
 *  - the dying body's drain is a NUMBER the frame loop writes (`uDrain.value =`),
 *    so it reaches every costume slot with no colour math in the loop;
 *  - the shader reads no clock: no `uTime`, no wall clock — the figure material
 *    (`holoMaterial.ts` until Lane LOOK) and the prop material alike.
 */
test('liveness: a figure\'s costume is written at commit, never in the frame loop, and the hologram has no clock (slice 4)', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, codeOf(f.source)]));
  const layer = files.get('scene/FigureLayer.tsx') ?? '';
  const field = layer.slice(layer.indexOf('class DepartureField'));
  const discs = files.get('scene/discs.ts') ?? '';
  const propsSource = files.get('scene/props.ts') ?? '';
  const loop: Array<[string, string]> = [
    ['CueRunner.tsx', files.get('scene/CueRunner.tsx') ?? ''],
    ['DiscField.bind', bodyOf(discs.slice(discs.indexOf('class DiscField')), 'bind')],
    ['DepartureField.bind', bodyOf(field, 'bind')],
    ['PropField.bind', bodyOf(propsSource.slice(propsSource.indexOf('export class PropField')), 'bind')],
  ];
  for (const [name, body] of loop) assert.ok(body.length > 100, `could not find ${name}`);
  const writesCostume = /\bapplyCostume\(|\buCostume\b/;
  for (const [name, body] of loop) {
    assert.ok(!writesCostume.test(body), `${name} writes a costume in the frame loop`);
    // The negative control: the call, spliced in, is caught.
    assert.ok(writesCostume.test(`${body}\napplyCostume(rig.material, pose.costume, false);`), `the scan misses applyCostume in ${name}`);
  }
  const writers = [...files].filter(([, code]) => /\.uCostume\.value\[/.test(code) || /uniforms\.uCostume\.value/.test(code)).map(([path]) => path);
  assert.deepEqual(writers, ['scene/figureMaterial.ts'], 'something other than figureMaterial.ts writes a costume colour');
  // A layout effect applies it, and a departing body applies it when it is built.
  assert.match(layer, /useLayoutEffect\([^]*?applyCostume\(built\.material/, 'FigureLayer no longer writes the costume at commit');
  assert.match(bodyOf(field, 'add'), /applyCostume\(material/, 'a departing body no longer falls in what it wore');
  assert.match(bodyOf(field, 'bind'), /uDrain\.value = /, 'the dying body no longer drains through the uniform');
  for (const path of ['scene/figureMaterial.ts', 'scene/propMaterial.ts']) {
    const material = files.get(path) ?? '';
    assert.ok(material.length > 1000, `${path} moved — move this test with it`);
    assert.ok(!/\buTime\b|performance\.now\(|Date\.now\(|requestAnimationFrame\(/.test(material), `${path} reads a clock`);
  }
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

/**
 * **Slice 3 — the prop field is a pose layer on the one frame loop** (per-card
 * identity, T9/T10). Every prop, swarm, squad and vehicle silhouette is drawn by
 * `scene/props.ts`'s `PropField`, and four source facts hold its shape — the same
 * four the departing bodies are held to:
 *
 *  - its per-frame half is called from `DiscField.bind` and nowhere else, so from
 *    `CueRunner`'s single `useFrame` (the previous clauses pin `discs.bind` there),
 *    AFTER `applyFigures` has posed the rigs whose joints it reads;
 *  - it is installed (`setProps`) and fed (`props.commit`) only by `FigureLayer`,
 *    at commit time — once per snapshot, never per frame;
 *  - its frame loop builds nothing (no geometry, no bake, no `new`) — the
 *    allocation scan below reads the body;
 *  - it is renderer-only: no transport, no cue engine, no click (`raycast`
 *    cleared on every mesh), no clock of its own and no mixer of its own (the
 *    zero-delta clause already allows only two files to tick one, and a baked pose
 *    samples its clip's tracks by hand for that reason).
 */
test('liveness: the prop field is bound from the disc field, fed by FigureLayer, and decides nothing (slice 3)', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, codeOf(f.source)]));
  const callers = (pattern: RegExp): string[] =>
    [...files].filter(([, code]) => pattern.test(code)).map(([path]) => path).sort();
  assert.deepEqual(callers(/\bprops\??\.bind\(/), ['scene/discs.ts'], 'the prop field is bound outside the disc field');
  assert.deepEqual(callers(/\.setProps\(/), ['scene/FigureLayer.tsx'], 'something else installs the prop field');
  assert.deepEqual(callers(/\bprops\.commit\(/), ['scene/FigureLayer.tsx'], 'something else commits the props');
  assert.deepEqual(callers(/new PropField\(/), ['scene/FigureLayer.tsx'], 'a second prop field was built');

  const source = files.get('scene/props.ts') ?? '';
  assert.ok(source.length > 1000, 'scene/props.ts is gone — move this test with it');
  for (const imported of importsOf(source)) {
    assert.ok(!imported.from.includes('transport/'), `scene/props.ts imports ${imported.from}`);
    assert.ok(
      !imported.from.includes('cues/queue') && !imported.from.includes('cues/registry'),
      'scene/props.ts imports the cue engine — a field is written by the frame loop, it does not drive itself',
    );
  }
  assert.ok(!/\bonAct\b|\bclickCard\b|\bselectable\b/.test(source), 'the prop field reaches a click');
  assert.match(source, /raycast = \(\) => \{\}/, 'a prop mesh is a raycast target');
  assert.ok(
    !/\bsetTimeout\(|\bsetInterval\(|requestAnimationFrame\(|performance\.now\(|Date\.now\(/.test(source),
    'the prop field reads a clock of its own — the frame loop hands it one',
  );
  const bindBody = bodyOf(source.slice(source.indexOf('export class PropField')), 'bind');
  assert.ok(bindBody.length > 200, 'could not find PropField.bind');
  assert.ok(
    !/buildKindGeometry|bakePose|instantiateFigure|makePropMaterial|swarmMembers\(/.test(bindBody),
    'the prop field builds geometry or bindings in the frame loop',
  );
  // It reads the rigs the frame loop just posed, and the joint it follows.
  assert.match(bindBody, /updateMatrixWorld\(true\)/, 'the joint props no longer refresh their rigs before reading');
  assert.match(bindBody, /\.matrixWorld/, 'the joint props no longer follow their joints');
  // The emitter hook: a glowing prop reads the clip lane (and nothing else of the cue engine).
  assert.match(bindBody, /\.clipOf\(/, 'the glowing props no longer read the clip lane');

  // The pure half is covered by the figures/ purity scan; say so, so a move is noticed.
  assert.ok(files.has('figures/props.ts') && files.has('figures/traits.ts'), 'the prop kit or the trait ladder moved out of figures/');
});

/**
 * **The status layer is a pose layer on the one frame loop** (D210), held to the
 * prop field's four facts and three of its own:
 *
 *  - its per-frame half is called from `DiscField.bind` and nowhere else;
 *  - it is built, installed (`setStatus`) and committed (`strips.commit`) only by
 *    `FigureLayer`, and the layout it commits is computed only by `Arena.tsx` and
 *    the workshop's `Pedestal.tsx`, from `statusLayout` — the same two callers
 *    `figurePose` has;
 *  - it is renderer-only: no transport, no cue engine, no click (`raycast`
 *    cleared), no clock, and it reads no card NAME — it draws constants,
 *    numbers and colours;
 *  - it is ONE mesh: one `InstancedMesh`, one material, so one draw call for the
 *    whole table (the budget has no room for more, `docs/evidence/status-layer.md`);
 *  - its pure half (`figures/status.ts`) is under the `figures/` purity scan, and
 *    the shared `status.ts` imports no React, no three and no DOM.
 */
test('liveness: the status strips are bound from the disc field, fed by FigureLayer, one mesh, and decide nothing (D210)', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, codeOf(f.source)]));
  const callers = (pattern: RegExp): string[] =>
    [...files].filter(([, code]) => pattern.test(code)).map(([path]) => path).sort();
  assert.deepEqual(callers(/\bstatus\??\.bind\(/), ['scene/discs.ts'], 'the strips are bound outside the disc field');
  assert.deepEqual(callers(/\.setStatus\(/), ['scene/FigureLayer.tsx'], 'something else installs the strips');
  assert.deepEqual(callers(/\bstrips\.commit\(/), ['scene/FigureLayer.tsx'], 'something else commits the strips');
  assert.deepEqual(callers(/new StatusField\(/), ['scene/FigureLayer.tsx'], 'a second status field was built');
  assert.deepEqual(callers(/\bstatusLayout\(/).filter((p) => p !== 'figures/status.ts'), ['Arena.tsx'], 'the strips are laid out somewhere else in the arena');
  const pedestal = codeOf(readFileSync(fileURLToPath(new URL('../src/workshop/Pedestal.tsx', import.meta.url)), 'utf8'));
  assert.match(pedestal, /statusLayout\(placed, figures\)/, 'the pedestal no longer lays the strips out as the arena does');

  const source = files.get('scene/status.ts') ?? '';
  assert.ok(source.length > 1000, 'scene/status.ts is gone — move this test with it');
  for (const imported of importsOf(source)) {
    assert.ok(!imported.from.includes('transport/'), `scene/status.ts imports ${imported.from}`);
    assert.ok(
      !imported.from.includes('cues/queue') && !imported.from.includes('cues/registry'),
      'scene/status.ts imports the cue engine — a field is written by the frame loop, it does not drive itself',
    );
  }
  assert.ok(!/\bonAct\b|\bclickCard\b|\bselectable\b/.test(source), 'the status field reaches a click');
  assert.match(source, /raycast = \(\) => \{\}/, 'the status mesh is a raycast target');
  assert.ok(
    !/\bsetTimeout\(|\bsetInterval\(|requestAnimationFrame\(|performance\.now\(|Date\.now\(/.test(source),
    'the status field reads a clock of its own — the frame loop hands it one',
  );
  assert.ok(!/\.name\b(?!\s*=\s*'status)/.test(source.replace(/this\.mesh\.name = 'status:strips'/, '')), 'the status field reads a name');
  // ONE mesh: one InstancedMesh, one material — one draw call for the table.
  assert.equal((source.match(/new THREE\.InstancedMesh\(/g) ?? []).length, 1, 'the strips are more than one mesh');
  assert.equal((source.match(/new THREE\.ShaderMaterial\(/g) ?? []).length, 1, 'the strips have more than one material');
  const bindBody = bodyOf(source.slice(source.indexOf('export class StatusField')), 'bind');
  assert.ok(bindBody.length > 100, 'could not find StatusField.bind');
  assert.match(bindBody, /\.offsetOf\(/, 'the strips no longer ride their cards\' offsets');
  assert.ok(!/cardStatus|stripQuads|statusLayout|paint|Path2D/.test(bindBody), 'the status field lays out or paints in the frame loop');

  // The pure halves.
  assert.ok(files.has('figures/status.ts'), 'figures/status.ts moved out of figures/ — the purity scan no longer covers it');
  const shared = readFileSync(fileURLToPath(new URL('../src/status.ts', import.meta.url)), 'utf8');
  for (const imported of importsOf(shared)) {
    assert.ok(
      !imported.from.startsWith('react') && imported.from !== 'three' && !imported.from.startsWith('three/'),
      `status.ts imports ${imported.from} — both renderers read it, and node --test must`,
    );
  }
  assert.ok(!/\bdocument\.|\bwindow\./.test(codeOf(shared)), 'status.ts touches the DOM');
});

test('liveness: the frame loop’s Tier 2 bodies allocate nothing — the disc field, the departing bodies, the death query', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, codeOf(f.source)]));
  const layer = files.get('scene/FigureLayer.tsx') ?? '';
  const field = layer.slice(layer.indexOf('class DepartureField'));
  const discs = files.get('scene/discs.ts') ?? '';
  const discField = discs.slice(discs.indexOf('class DiscField'));
  const propsSource = files.get('scene/props.ts') ?? '';
  const propField = propsSource.slice(propsSource.indexOf('export class PropField'));
  const statusSource = files.get('scene/status.ts') ?? '';
  const statusField = statusSource.slice(statusSource.indexOf('export class StatusField'));
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
    // Slice 3: the prop field, bound from `DiscField.bind` after the departing bodies.
    ['PropField.bind', bodyOf(propField, 'bind')],
    ['props.ts commitKind', bodyOf(files.get('scene/props.ts') ?? '', 'commitKind')],
    // The status layer (D210): the strips, bound from `DiscField.bind` after the props,
    // and the viewport they measure pixels against, read as the mesh is drawn.
    ['StatusField.bind', bodyOf(statusField, 'bind')],
    ['StatusField.track', bodyOf(statusField, 'track')],
  ];
  // The bodies were found, and they are the frame loop's: bind calls the rest.
  for (const [name, body] of bodies) assert.ok(body.length > 20, `could not find the body of ${name}`);
  const bind = bodies[2]![1];
  for (const callee of ['deathPending(', 'stepDeparture(', 'driveTransient(', 'departureWeight(', 'departureOpacity(', 'departureDrain(']) {
    assert.ok(bind.includes(callee), `DepartureField.bind no longer calls ${callee} — update the body list`);
  }
  assert.ok(bodies[0]![1].includes('departures?.bind('), 'DiscField.bind no longer binds the departing bodies');
  assert.ok(bodies[0]![1].includes('props?.bind('), 'DiscField.bind no longer binds the prop field');
  assert.ok(bodies[0]![1].includes('status?.bind('), 'DiscField.bind no longer binds the status strips');
  assert.ok(bodies[10]![1].includes('commitKind('), 'PropField.bind no longer commits its kinds — update the body list');

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
 *     nothing else in the arena calls `setFrameloop` at all;
 *  4. **a write to that ref re-renders `Arena`** (the workshop's reconciliation,
 *     2026-09-27): `<Canvas>` re-applies the prop on renders of its OWN — a
 *     resize — with the props of `Arena`'s last render, so a plain `useRef` was
 *     stale between an enqueue and the next `Arena` render. Measured before the
 *     fix on the GTX 1080 at `g1`@100: a resize mid-batch froze the cues (0
 *     frames in 700 ms, two steps queued), and a resize after one kept an idle
 *     table drawing (756 frames in 700 ms). The ref's setter is a state setter,
 *     as the workshop's pedestal has it.
 *
 * Negative-controlled when written: restoring `frameloop="demand"`, or dropping
 * the `loopRef.current = mode` line, turns this red — and so does putting back
 * `const loopRef = useRef<Frameloop>('demand')`, or a setter that sets no state.
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
  // 4. The ref CueRunner writes is backed by Arena's state, so a write re-renders
  //    Arena and <Canvas>'s own re-renders (a resize) re-apply the current mode.
  assert.doesNotMatch(arena, /\bloopRef\s*=\s*useRef\b/, 'loopRef is a plain useRef again — a <Canvas>-only re-render re-applies a stale mode');
  const setter = /\bset current\(\s*(\w+)\s*:\s*Frameloop\s*\)\s*\{([^}]*)\}/.exec(arena);
  assert.ok(setter !== null, 'loopRef has no `set current(next: Frameloop)` — its writes do not re-render Arena');
  const [, arg, body] = setter;
  const stateSetter = /const \[\s*,\s*(\w+)\s*\]\s*=\s*useState<Frameloop>/.exec(arena)?.[1];
  assert.ok(stateSetter !== undefined, 'no useState<Frameloop> behind loopRef');
  assert.match(body ?? '', new RegExp(`\\b${stateSetter}\\(\\s*${arg ?? ''}\\s*\\)`), `loopRef's setter does not call ${stateSetter}(${arg ?? ''})`);
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

// ---------------------------------------------------------------------------
// Tier 2 slice 3 (T11/T12) — the effect binding's figure anchor and the looks
// ---------------------------------------------------------------------------

/**
 * **The slice-3 bodies the frame loop reaches allocate nothing.** T11's `figure`
 * anchor is resolved for every effect a per-card cue sets, every frame it runs,
 * and T12's looks and stations are written into instance buffers every frame
 * they are on the table — the same hot path as the disc field, held to the same
 * scan, with the same negative controls spliced in.
 */
test('liveness: slice 3’s frame-loop bodies allocate nothing — the figure anchor, the looks, the stations', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, codeOf(f.source)]));
  const effects = files.get('scene/effects.ts') ?? '';
  const pool = effects.slice(effects.indexOf('class EffectPool'));
  const overlays = files.get('scene/overlays.ts') ?? '';
  const field = overlays.slice(overlays.indexOf('class OverlayField'));
  const bodies: Array<[string, string]> = [
    ['EffectPool.setFigures', bodyOf(pool, 'setFigures')],
    ['EffectPool.#figurePoint', bodyOf(pool, '#figurePoint')],
    ['EffectPool.#fitOf', bodyOf(pool, '#fitOf')],
    ['EffectPool.#groundOf', bodyOf(pool, '#groundOf')],
    ['EffectPool.#setMap', bodyOf(pool, '#setMap')],
    ['OverlayField.#look', bodyOf(field, '#look')],
    ['OverlayField.#station', bodyOf(field, '#station')],
    ['OverlayField.#billboard', bodyOf(field, '#billboard')],
    ['overlays.ts commit', bodyOf(overlays, 'commit')],
  ];
  for (const [name, body] of bodies) assert.ok(body.length > 20, `could not find the body of ${name}`);
  // The anchor arrow routes a figure anchor to `#figurePoint`, and bind uses the arrow.
  assert.match(pool, /readonly #anchor = \(ref: AnchorRef\)[\s\S]{0,200}this\.#figurePoint\(ref\)/);
  assert.match(pool, /this\.#apply\(slot, effect, this\.#anchor, camera\)/);
  // The look dispatch reaches every one of its bodies from `bind`.
  const bind = bodyOf(field, 'bind');
  assert.ok(bind.includes('this.#look(') && bind.includes('this.#station('), 'OverlayField.bind no longer draws the looks and the stations');

  const junk = [
    'const _junk = [t, t];',
    'const o = { a: 1 };',
    'for (const e of this.entries.values()) {}',
    'const f = () => 1;',
    'const s = `${1}`;',
    'const v = new THREE.Vector3();',
    'const c = [...xs];',
  ];
  for (const [name, body] of bodies) {
    for (const line of junk) {
      assert.ok(allocationsIn(`\n${line}\n${body}`).length > 0, `the allocation scan misses \`${line}\` in ${name}`);
    }
    assert.deepEqual(allocationsIn(body), [], `${name} allocates in the frame loop (§9.2 rule 6)`);
  }
});

test('liveness: a `figure` anchor is the effect binding’s — layout.ts never resolves one', () => {
  // So the camera director (which resolves through `layout.ts`) and `deltaTo` can
  // never be handed a body's point, and a cue cannot move a CARD toward a figure.
  const log = readFileSync(fileURLToPath(new URL('../../fixtures/games/g1.jsonl', import.meta.url)), 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '');
  let state = initialState();
  for (const line of log.slice(1, 300)) state = reduce(state, JSON.parse(line) as Frame);
  const placed = layout(state);
  const card = placed.placements.find((p) => p.kind === 'creature');
  assert.ok(card !== undefined, 'g1 has a creature by frame 300');
  assert.equal(anchorPosition(placed, { kind: 'figure', id: card.cardId, at: 0.5 }), null);
  assert.deepEqual(anchorDelta(placed, card.cardId, { kind: 'figure', id: card.cardId, at: 0.5 }), [0, 0, 0]);
  // …and it IS the effect pool's: the one file that resolves the kind.
  const resolvers = arenaFiles()
    // An ANCHOR's kind (`ref.kind`, `at.kind`, `to.kind`) — not the stack form of
    // the same name in `scene/casting.ts`, which is a creature spell's ghost.
    .filter((f) => /\b(?:ref|at|to|anchor)\.kind\s*[!=]==\s*'figure'/.test(codeOf(f.source)))
    .map((f) => f.path)
    .sort();
  assert.deepEqual(resolvers, ['scene/effects.ts'], `the figure anchor is resolved outside the effect pool: ${resolvers.join(', ')}`);
  // The effect pool reads no clock of its own either: `CueRunner` hands it the
  // frame's seconds, for the one term that is a function of time (the bob).
  assert.ok(
    !/\bsetTimeout\(|\bsetInterval\(|requestAnimationFrame\(|performance\.now\(|Date\.now\(/.test(
      codeOf(readFileSync(ARENA + 'scene/effects.ts', 'utf8')),
    ),
    'scene/effects.ts reads a clock of its own',
  );
});

/**
 * **T13 — the duelists are a pose layer on the one frame loop, and they decide
 * nothing** (Tier 2 slice 4). Four source facts hold their shape — the same four
 * the departing bodies and the prop field are held to:
 *
 *  - the per-frame half (`duelists.bind()`) is called from `BustField.bind` and
 *    nowhere else — so from `CueRunner`'s single `useFrame`, through a field the
 *    pose-layer clause already pins there;
 *  - the field is installed (`setDuelists`) only by `DuelistLayer`, at commit;
 *  - `DuelistLayer` is renderer-only: no transport, no cue engine (it reads the
 *    stage and the queue through two small interfaces), no click (`raycast`
 *    cleared on its mesh), no `useFrame` and no clock of its own — the breathing
 *    reads the queue's VIRTUAL clock, handed in, which only runs while there is
 *    film (D58);
 *  - it loads through `scene/models.ts` and draws with `scene/figureMaterial.ts`
 *    (the figures' own, `holoMaterial.ts` until Lane LOOK) — no second loader, no
 *    second material.
 */
test('liveness: the duelists are bound from the bust field, installed by DuelistLayer, and decide nothing (T13)', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, codeOf(f.source)]));
  const callers = (pattern: RegExp): string[] =>
    [...files].filter(([, code]) => pattern.test(code)).map(([path]) => path).sort();
  assert.deepEqual(callers(/\bduelists\.bind\(/), ['scene/busts.ts'], 'the duelists are bound outside the bust field');
  assert.deepEqual(callers(/\.setDuelists\(/), ['scene/DuelistLayer.tsx'], 'something else installs the duelists');
  const layer = files.get('scene/DuelistLayer.tsx') ?? '';
  assert.ok(layer.length > 0, 'scene/DuelistLayer.tsx is missing');
  for (const imported of importsOf(arenaFiles().find((f) => f.path === 'scene/DuelistLayer.tsx')!.source)) {
    assert.ok(!imported.from.includes('transport/'), `DuelistLayer imports ${imported.from}`);
    assert.ok(
      !imported.from.includes('cues/queue') && !imported.from.includes('cues/registry'),
      'DuelistLayer imports the cue engine — a pose layer reads the stage, it does not drive it',
    );
    assert.ok(!/GLTFLoader|useGLTF|drei/.test(imported.from), `DuelistLayer loads models itself (${imported.from})`);
  }
  assert.ok(!/\bonAct\b|\bclickCard\b|\bselectable\b/.test(layer), 'DuelistLayer reaches a click');
  assert.match(layer, /raycast = \(\) => \{\}/, 'the duelist mesh is not cleared of raycast — it would be a click target');
  assert.ok(!/\buseFrame\b/.test(layer), 'DuelistLayer registers a frame callback of its own');
  assert.ok(
    !/\bsetTimeout\(|\bsetInterval\(|requestAnimationFrame\(|performance\.now\(|Date\.now\(/.test(layer),
    'DuelistLayer reads a clock of its own',
  );
  assert.match(layer, /from '\.\/models\.ts'/, 'DuelistLayer no longer loads through scene/models.ts');
  assert.match(layer, /makeFigureMaterial\(/, 'DuelistLayer no longer draws with the figures’ material');
  assert.ok(!/new THREE\.(?:Mesh|MeshBasic|MeshStandard|MeshLambert|Shader|RawShader)Material\(/.test(layer), 'DuelistLayer builds a material of its own');
  // No name reaches it: it reads a pose's seat, stance and numbers — never a
  // player's or a card's `.name` (a bone's name is the rig's, and it may read those).
  const readsName = (code: string): boolean => /\b(?:pose|player|players|card|cards|board|state)\b[\w.[\]!?]*\.name\b/.test(code);
  assert.ok(!readsName(layer), 'DuelistLayer reads a player or card name');
  assert.ok(readsName('const who = body.pose.name;') && readsName('board.players[0]!.name'), 'the name check has no teeth');
});

test('liveness: the duelists’ frame-loop bodies allocate nothing (T13)', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, codeOf(f.source)]));
  const layer = files.get('scene/DuelistLayer.tsx') ?? '';
  const field = layer.slice(layer.indexOf('export class DuelistField'));
  const busts = files.get('scene/busts.ts') ?? '';
  const bustField = busts.slice(busts.indexOf('export class BustField'));
  const duelists = files.get('figures/duelists.ts') ?? '';
  const bodies: Array<[string, string]> = [
    ['DuelistField.bind', bodyOf(field, 'bind')],
    ['DuelistField.drive', bodyOf(field, 'drive')],
    ['DuelistField.covers', bodyOf(field, 'covers')],
    ['DuelistField.aimBones', bodyOf(field, 'aimBones')],
    ['DuelistField.aimList', bodyOf(field, 'aimList')],
    ['BustField.bind', bodyOf(bustField, 'bind')],
    ['busts.ts duelistStandInto', bodyOf(busts, 'duelistStandInto')],
    ['duelists.ts bustReactionInto', bodyOf(duelists, 'bustReactionInto')],
    ['duelists.ts visitEffect', bodyOf(duelists, 'visitEffect')],
    ['duelists.ts stanceEntry', bodyOf(duelists, 'stanceEntry')],
    ['duelists.ts stanceGesture', bodyOf(duelists, 'stanceGesture')],
    ['duelists.ts gestureOfAlias', bodyOf(duelists, 'gestureOfAlias')],
    ['duelists.ts duelistLane', bodyOf(duelists, 'duelistLane')],
    ['CueQueue.gesturePending', bodyOf(files.get('cues/queue.ts') ?? '', 'gesturePending')],
  ];
  for (const [name, body] of bodies) assert.ok(body.length > 10, `could not find the body of ${name}`);
  // The bodies are the frame loop's: the bust field binds the duelists, which call the rest.
  assert.ok(bodies[5]![1].includes('duelists.bind('), 'BustField.bind no longer binds the duelists');
  for (const callee of ['this.drive(', 'this.aimBones(', 'stanceEntry(', 'gestureOfAlias(', 'stanceGesture(', 'gesturePending(', 'mixer.update(0)']) {
    assert.ok(bodies[0]![1].includes(callee), `DuelistField.bind no longer calls ${callee} — update the body list`);
  }
  for (const [name, body] of bodies) {
    assert.deepEqual(allocationsIn(body), [], `${name} allocates in the frame loop (§9.2 rule 6)`);
  }
  // The negative control: the scan still catches a junk line in these bodies.
  for (const line of ['const v = new THREE.Vector3();', 'for (const p of poses) {}', 'const f = () => 1;']) {
    assert.ok(allocationsIn(`\n${line}\n${bodies[0]![1]}`).length > 0, `the allocation scan misses \`${line}\``);
  }
});

/**
 * **Lane LOOK — the look is a number written at COMMIT, never in the frame loop**
 * (D137–D146, report 15 §9.1's tests). The comic look reaches the scene as
 * `uLook` per material plus a few shared uniforms (`figureMaterial.ts`'s
 * `COMIC_UNIFORMS`), and every one of them changes when a snapshot or the look
 * changes, never per frame — so the look can never be a thing the renderer
 * remembers, and an idle table still renders nothing. Seven source facts:
 *
 *  - `look.ts` is pure: it imports `colour.ts` and `perf.ts` and nothing else —
 *    no three, no React, no DOM and no clock;
 *  - `uLook` is written in exactly two places, `figureMaterial.ts`'s `applyLook`
 *    and `propMaterial.ts`'s `applyPropLook`, and the comic block's shared
 *    uniforms only by `applyComicGlobals`;
 *  - no frame-loop body touches the look: `CueRunner.tsx` (all of it),
 *    `DiscField.bind`, `DepartureField.bind`, `PropField.bind`,
 *    `DuelistField.bind` and `BustField.bind` call none of `applyLook`,
 *    `applyPropLook`, `applyComicGlobals` or a `setLook`, and name no `uLook`
 *    (negative-controlled: each spliced in is caught). Lane MOTION's summon
 *    writes `uMaterialize`, a number multiplied into the look — which is why the
 *    look itself never needs a frame-loop write. **That one number IS written
 *    per frame, and may be** (D145, D148, at the merge of the two lanes): the
 *    frame loop writes it as it writes `uOpacity` and `uDrain`, from exactly
 *    the two bodies that draw a figure — `CueRunner`'s `applyMaterialize` (a
 *    living figure's summon) and `DepartureField.bind` (a falling body's ink
 *    draining back) — and `touchesLook` below does not name it on purpose; the
 *    comic motion lane's clause, after this one, holds those two writers;
 *  - the callers are commit-time: `FigureLayer` and `DuelistLayer` call them
 *    from layout effects and from the fields' `setLook` / `add` / `build`;
 *  - the look reaches a figure through `look.ts`'s `figureLookOf` (an anonymous
 *    figure and a ghost stay holograms, D142) and the disc field's shadow through
 *    `paintsFigure`, the same predicate;
 *  - the spike's inverted hull is gone (D139): no `inkHull`, no `BackSide` ink
 *    shell, and the ink is `Post.tsx`'s `InkEffect`, inside the one composer;
 *  - `holoMaterial.ts` is a re-export and nothing more;
 *  - `prime.ts`'s `compileFor` is a mount-time call, and the scene layers prime
 *    through it and never through a bare `gl.compile` (the composer draws the
 *    scene into a render target, whose program variants a canvas-only prime
 *    leaves to the first frame an object is drawn on);
 *  - **the painted mark** (D146, the verification pass): the ink inks only where
 *    a painted surface is among its samples, and a painted surface says so by
 *    writing alpha 0 — blend state set by `figureMaterial.ts`'s `markPainted`,
 *    called only from `applyLook` and `applyPropLook` (commit time), never from a
 *    frame-loop body (the same splice test); `InkEffect` reads the scene's
 *    alpha, writes alpha 1 back, and is FIRST in the composer's list; the
 *    arena's canvas is opaque (`alpha: false`), so a frame drawn without the
 *    composer cannot show the mark; and the stage's combat burst is a swap of
 *    the ground's map, not a mesh (so `Table.tsx` primes nothing).
 */
test('liveness: the look is written at commit, never in the frame loop, and the ink rides the one composer (Lane LOOK)', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, codeOf(f.source)]));
  const raw = new Map(arenaFiles().map((f) => [f.path, f.source]));

  // look.ts is pure.
  const look = raw.get('look.ts') ?? '';
  assert.ok(look.length > 1000, 'look.ts is missing');
  assert.deepEqual(
    importsOf(look).map((i) => i.from).sort(),
    ['./colour.ts', './perf.ts'],
    'look.ts imports something other than colour.ts and perf.ts',
  );
  const lookCode = files.get('look.ts') ?? '';
  assert.ok(
    !/\bwindow\b|\bdocument\b|performance\.now\(|Date\.now\(|requestAnimationFrame\(|\bsetTimeout\(/.test(lookCode),
    'look.ts reaches the DOM or a clock',
  );

  // uLook and the comic globals have one writer each.
  const writersOf = (pattern: RegExp): string[] =>
    [...files].filter(([, code]) => pattern.test(code)).map(([path]) => path).sort();
  assert.deepEqual(
    writersOf(/\buLook\.value\s*=[^=]/),
    ['scene/figureMaterial.ts', 'scene/propMaterial.ts'],
    'something other than the two materials writes uLook',
  );
  assert.deepEqual(
    writersOf(/COMIC_UNIFORMS\.\w+\.value\s*=[^=]/),
    ['scene/figureMaterial.ts'],
    'something other than applyComicGlobals writes a comic uniform',
  );
  const figureMaterial = files.get('scene/figureMaterial.ts') ?? '';
  assert.match(bodyOf(figureMaterial, 'applyLook'), /uLook\.value = look/);
  assert.match(bodyOf(figureMaterial, 'applyComicGlobals'), /COMIC_UNIFORMS\.uDotPx\.value = /);
  // MOTION's handle exists, starts at identity, and multiplies the look.
  assert.match(figureMaterial, /uMaterialize: \{ value: 1 \}/, 'the figure material lost uMaterialize — MOTION’s summon has nowhere to write');
  assert.match(figureMaterial, /uLook \* uMaterialize/, 'uMaterialize no longer multiplies the look');

  // No frame-loop body touches the look.
  const layer = files.get('scene/FigureLayer.tsx') ?? '';
  const departureField = layer.slice(layer.indexOf('class DepartureField'));
  const discs = files.get('scene/discs.ts') ?? '';
  const props = files.get('scene/props.ts') ?? '';
  const duelists = files.get('scene/DuelistLayer.tsx') ?? '';
  const busts = files.get('scene/busts.ts') ?? '';
  const loop: Array<[string, string]> = [
    ['CueRunner.tsx', files.get('scene/CueRunner.tsx') ?? ''],
    ['DiscField.bind', bodyOf(discs.slice(discs.indexOf('class DiscField')), 'bind')],
    ['DepartureField.bind', bodyOf(departureField, 'bind')],
    ['PropField.bind', bodyOf(props.slice(props.indexOf('export class PropField')), 'bind')],
    ['DuelistField.bind', bodyOf(duelists.slice(duelists.indexOf('export class DuelistField')), 'bind')],
    ['BustField.bind', bodyOf(busts.slice(busts.indexOf('export class BustField')), 'bind')],
  ];
  const touchesLook = /\bapplyLook\(|\bapplyPropLook\(|\bapplyComicGlobals\(|\.setLook\(|\buLook\b|\bCOMIC_UNIFORMS\b|\bcompileFor\(|\bmarkPainted\(|\.blending\s*=[^=]|\.blendSrcAlpha\s*=[^=]/;
  for (const [name, body] of loop) {
    assert.ok(body.length > 100, `could not find ${name}`);
    assert.ok(!touchesLook.test(body), `${name} writes the look in the frame loop`);
    for (const junk of [
      'rig.material.uniforms.uLook.value = 1;',
      'applyLook(rig.material, 1);',
      'applyPropLook(entry.material, look);',
      'applyComicGlobals(look, dpr);',
      'this.props.setLook(look);',
      'compileFor(gl, scene, camera, composer);',
      'markPainted(rig.material, true);',
      'entry.material.blending = THREE.CustomBlending;',
    ]) {
      assert.ok(touchesLook.test(`${body}\n${junk}`), `the scan misses \`${junk}\` in ${name}`);
    }
  }

  // The callers are commit-time.
  assert.deepEqual(
    writersOf(/\bapplyLook\(/).filter((p) => p !== 'scene/figureMaterial.ts'),
    ['scene/DuelistLayer.tsx', 'scene/FigureLayer.tsx'],
    'applyLook is called from outside the two layers',
  );
  assert.match(layer, /useLayoutEffect\(\(\) => \{\s*applyLook\(built\.material, look\);/, 'a figure’s look is no longer written by a layout effect');
  assert.match(bodyOf(departureField, 'setLook'), /applyLook\(/);
  assert.match(bodyOf(departureField, 'add'), /applyLook\(material, figureLookOf\(pose, this\.look\)\.look\)/, 'a falling body is not built in its figure’s look');
  assert.match(layer, /useLayoutEffect\(\(\) => \{\s*applyComicGlobals\(tableLook, dpr\);/, 'the comic globals are no longer written by a layout effect');
  assert.match(layer, /look=\{figureLookOf\(pose, tableLook\)\.look\}/, 'a figure’s look no longer goes through figureLookOf (D142)');
  assert.match(bodyOf(discs.slice(discs.indexOf('class DiscField')), 'bind'), /paintsFigure\(pose\)/, 'the shadow no longer asks paintsFigure (D142)');
  assert.match(duelists, /useLayoutEffect\(\(\) => \{\s*field\.setLook\(look\);/, 'the duelists’ look is no longer written by a layout effect');

  // The composer-aware prime (`prime.ts`) is a mount-time call of the three layers
  // that own objects hidden at mount — never a frame-loop one — and none of them
  // primes with a bare `gl.compile`, which compiles for the canvas whatever draws
  // the frames (the variant nothing draws under bloom or the ink).
  assert.deepEqual(
    writersOf(/\bcompileFor\(/).filter((p) => p !== 'scene/prime.ts').sort(),
    ['scene/DuelistLayer.tsx', 'scene/FigureLayer.tsx'],
    'compileFor is called from somewhere new',
  );
  for (const path of ['scene/DuelistLayer.tsx', 'scene/FigureLayer.tsx', 'scene/Table.tsx']) {
    const code = files.get(path) ?? '';
    assert.ok(code.length > 100, `could not read ${path}`);
    assert.ok(!/\bgl\.compile\(/.test(code), `${path} primes with a bare gl.compile — use prime.ts's compileFor`);
    assert.ok(/\bgl\.compile\(/.test(`${code}\n    gl.compile(scene, camera);`), 'the bare-compile scan misses the line it exists to catch');
  }
  assert.ok(!/performance\.now\(|Date\.now\(|requestAnimationFrame\(|useFrame/.test(files.get('scene/prime.ts') ?? ''), 'prime.ts reads a clock');

  // The hull is gone and the ink is the composer's.
  for (const [path, code] of files) {
    assert.ok(!/\binkHull|\bink-hull\b/.test(code), `${path} still carries the spike's inverted hull (D139)`);
  }
  const post = files.get('scene/Post.tsx') ?? '';
  assert.match(post, /class InkEffect extends Effect/, 'the ink line is no longer an Effect in Post.tsx');
  assert.match(post, /EffectAttribute\.DEPTH/, 'the ink line no longer reads the depth the scene render wrote');
  assert.match(post, /enableNormalPass=\{false\}/, 'the composer asks for a normal pass — a second scene render');
  assert.ok(!/new NormalPass\(|EffectAttribute\.NORMAL/.test(post), 'the ink line asks for normals — a second scene render');

  // The painted mark (D146): one writer of the blend state, two commit-time callers.
  assert.deepEqual(
    writersOf(/\bmarkPainted\(/),
    ['scene/figureMaterial.ts', 'scene/propMaterial.ts'],
    'markPainted is called from somewhere other than the two look writers',
  );
  assert.match(bodyOf(figureMaterial, 'applyLook'), /markPainted\(material, look > 0\)/, 'applyLook no longer marks a painted figure');
  assert.match(bodyOf(figureMaterial, 'markPainted'), /blendSrcAlpha = THREE\.ZeroFactor/, 'the mark no longer writes alpha 0');
  assert.match(bodyOf(files.get('scene/propMaterial.ts') ?? '', 'applyPropLook'), /markPainted\(material, look\.look > 0\)/);
  assert.deepEqual(
    writersOf(/\.blendSrcAlpha\s*=[^=]/),
    ['scene/figureMaterial.ts'],
    'something other than markPainted writes a blend factor',
  );
  // The ink reads the mark, gives alpha back, and is the composer's FIRST effect.
  const postRaw = raw.get('scene/Post.tsx') ?? '';
  assert.match(postRaw, /texture2D\( inputBuffer, uv \)\.a/, 'the ink no longer reads the painted mark');
  assert.match(postRaw, /step\( 0\.5, inputColor\.a \)/, 'the ink no longer reads the mark at its own pixel');
  assert.match(postRaw, /outputColor = vec4\( mix\( inputColor\.rgb, uInk, ink \), 1\.0 \);/, 'the ink no longer writes alpha 1 back');
  // Not CONVOLUTION: R3F's composer gives a convolution effect a pass of its own
  // (+1 full-screen pass, +1 draw call with bloom on), and the ink rides bloom's.
  assert.ok(!/EffectAttribute\.CONVOLUTION/.test(post), 'the ink says CONVOLUTION — the composer then splits it out of bloom’s pass');
  const inkAt = post.indexOf('{ink ? <primitive object={inkEffect} /> : null}');
  const bloomAt = post.indexOf('{bloom ? (');
  assert.ok(inkAt > 0 && bloomAt > inkAt, 'the ink is not the composer’s first effect — it must read the scene’s own alpha');
  // The canvas is opaque, so the mark never reaches the page.
  const arena = files.get('Arena.tsx') ?? '';
  assert.match(arena, /gl=\{\{ antialias: true, alpha: false \}\}/, 'the arena’s canvas is not opaque — a painted figure’s alpha 0 would show the page');
  // The combat burst is a swap of the ground's map (D141): no mesh, no prime.
  const table = files.get('scene/Table.tsx') ?? '';
  assert.match(table, /map=\{groundMap\}/, 'the combat stage is no longer a swap of the ground’s map');
  assert.ok(!/burstRef|map=\{burst\}/.test(table), 'the combat burst is a mesh of its own again (+1 draw call)');

  // holoMaterial.ts is a re-export and nothing more.
  const shim = files.get('scene/holoMaterial.ts') ?? '';
  assert.match(shim, /export \* from '\.\/figureMaterial\.ts';/);
  assert.ok(!/ShaderMaterial|glsl|uniform/.test(shim), 'holoMaterial.ts carries a shader again');
});

/**
 * **The comic motion lane** (`docs/research/15-art-direction.md` §9.2;
 * D147–D155) — its new frame-loop bodies, its one write into a figure's
 * look, its stepping and its pool, held the way the Tier 2 code is:
 *
 *  - the effect pool's new bodies — the streak's orientation and its reach
 *    (clear of its own card, from this camera), the ink blend, the two map
 *    choosers — and `CueRunner`'s `applyMaterialize` allocate nothing (the same
 *    scan and the same negative controls as the disc field's);
 *  - `cues/motion.ts`'s `onTwos` is on the queue's per-cue path and allocates
 *    nothing, and the module is pure (no three, React, DOM or clock — the `cues/`
 *    purity clause covers the imports; this adds the DOM);
 *  - the frame loop writes no `uLook` at all (the commit's writer is
 *    `figureMaterial.ts`'s `applyLook`): its one look number is `uMaterialize`,
 *    a NUMBER (report 15 §9.1's declared exception), written by
 *    `applyMaterialize` on a living figure and by `DepartureField.bind` on a
 *    falling one and by nothing else — the spike's `uLook` fallback went at the
 *    merge with LOOK (D148);
 *  - the pool is 49 and the streak is counted against the eight-slot cap.
 */
test('liveness: the comic motion lane allocates nothing in the loop, writes the look only as a number, and stays in its budget', async () => {
  const files = new Map(arenaFiles().map((f) => [f.path, codeOf(f.source)]));
  const effects = files.get('scene/effects.ts') ?? '';
  const pool = effects.slice(effects.indexOf('class EffectPool'));
  const runner = files.get('scene/CueRunner.tsx') ?? '';
  const motion = files.get('cues/motion.ts') ?? '';
  const bodies: Array<[string, string]> = [
    ['EffectPool.#streak', bodyOf(pool, '#streak')],
    ['EffectPool.#streakClear', bodyOf(pool, '#streakClear')],
    ['EffectPool.#cardOf', bodyOf(pool, '#cardOf')],
    ['EffectPool.#widen', bodyOf(pool, '#widen')],
    ['EffectPool.#blend', bodyOf(pool, '#blend')],
    ['EffectPool.#glowMap', bodyOf(pool, '#glowMap')],
    ['EffectPool.#ringMap', bodyOf(pool, '#ringMap')],
    // The verification pass's gap: the scan stopped at `#glowMap`, and the texture
    // LOOKUP it calls built `burst:${word}` on every call, hits included. The two
    // lookups are now bodies of their own; the drawing is their miss path's.
    ['effects.ts burstTexture (the lookup)', bodyOf(effects, 'burstTexture')],
    ['effects.ts shapeTexture (the lookup)', bodyOf(effects, 'shapeTexture')],
    // D154: a star beside its body, and the height it clears.
    ['EffectPool.#beside', bodyOf(pool, '#beside')],
    ['EffectPool.#heightOf', bodyOf(pool, '#heightOf')],
    ['CueRunner applyMaterialize', bodyOf(runner, 'applyMaterialize')],
    ['motion.ts onTwos', bodyOf(motion, 'onTwos')],
  ];
  for (const [name, body] of bodies) assert.ok(body.length > 20, `could not find the body of ${name}`);
  // They are the frame loop's: bind reaches the streak and the blend, applyFigures the look.
  assert.match(pool, /case 'streak': \{\s*this\.#streak\(/, 'the streak branch no longer calls #streak — update the body list');
  assert.match(bodyOf(pool, '#streak'), /this\.#streakClear\(effect, camera\)/, '#streak no longer sizes its clear lane — update the body list');
  assert.match(bodyOf(pool, '#streakClear'), /this\.#cardOf\(id\)/, '#streakClear no longer finds the card — update the body list');
  assert.match(bodyOf(pool, '#streakClear'), /this\.#widen\(/, '#streakClear no longer widens its lane — update the body list');
  assert.match(pool, /this\.#blend\(slot, isInkShape\(effect\.shape\)\)/, 'the glow no longer chooses its blend by shape');
  assert.match(runner, /applyMaterialize\(rig, offset\.materialize\)/, 'applyFigures no longer writes the summon');
  assert.match(files.get('cues/queue.ts') ?? '', /onTwos\(progress, item\.ms, stepMs\)/, 'the queue no longer steps a cue on twos');
  // The map choosers reach the ink only through the two lookups, and the lookups
  // reach the drawing only on a miss — so the scan above covers the whole hit path.
  const glowMap = bodyOf(pool, '#glowMap');
  assert.match(glowMap, /burstTexture\(effect\.word \?\? null\)/, '#glowMap no longer reaches the star through burstTexture');
  for (const [name, body] of [['#glowMap', glowMap], ['#ringMap', bodyOf(pool, '#ringMap')]] as const) {
    assert.ok(!/\bdraw[A-Z]\w*\(|canvas2d\(|createElement\(|CanvasTexture/.test(body), `${name} draws a texture on the frame loop's path`);
  }
  assert.match(bodyOf(effects, 'burstTexture'), /burstCache\.get\(word\);\s*return cached !== undefined \? cached : drawBurstTexture\(word\);/, 'burstTexture is no longer a lookup with a miss path');
  assert.match(bodyOf(effects, 'shapeTexture'), /shapeCache\.get\(name\);\s*return cached !== undefined \? cached : drawShapeTexture\(name\);/, 'shapeTexture is no longer a lookup with a miss path');
  // …and `prime` draws every ink texture at mount, onto parked GLOW slots only
  // (a glow's map is re-chosen on every use; a mote's is not).
  const prime = bodyOf(pool, 'prime');
  assert.match(prime, /const ink = this\.#primeInk\(\);/, 'prime no longer draws the ink at mount');
  assert.match(prime, /slot\.kind === 'glow' && next < ink\.length/, 'prime hands the ink to a slot whose map is not re-chosen on use');
  const primeInk = bodyOf(pool, '#primeInk');
  for (const drawn of [/burstTexture\(null\)/, /for \(const word of COMIC_WORDS\) ink\.push\(burstTexture\(word\)\)/, /shapeTexture\('splat'\)/, /shapeTexture\('dots'\)/]) {
    assert.match(primeInk, drawn, `prime no longer draws ${String(drawn)}`);
  }
  // A star beside its body is placed by the pool from the camera it is handed
  // (D154), in its own branch — the plain lens pull is the other one.
  assert.match(pool, /if \(effect\.aside !== undefined && effect\.at\.kind === 'figure'\) \{\s*(?:\/\/[^\n]*\s*)*this\.#beside\(/, 'the glow no longer places a star beside its body');
  const junk = [
    'const _junk = [t, t];',
    'const o = { a: 1 };',
    'for (const e of this.entries.values()) {}',
    'const f = () => 1;',
    'const s = `${1}`;',
    'const v = new THREE.Vector3();',
    'const c = [...xs];',
    'const p = entry.pose.position.slice();',
  ];
  for (const [name, body] of bodies) {
    for (const line of junk) {
      assert.ok(allocationsIn(`\n${line}\n${body}`).length > 0, `the allocation scan misses \`${line}\` in ${name}`);
    }
    assert.deepEqual(allocationsIn(body), [], `${name} allocates in the frame loop (§9.2 rule 6)`);
  }

  // `cues/motion.ts` reads the URL it is HANDED; it touches no DOM and no clock.
  assert.ok(motion.length > 200, 'cues/motion.ts is missing');
  assert.ok(!/\bwindow\.|\bdocument\.|performance\.now\(|Date\.now\(/.test(motion), 'cues/motion.ts touches the DOM or a clock');

  // The look: at commit it is LOOK's (`figureMaterial.ts`'s `applyLook`, the prop
  // field's `setLook`); in the FRAME LOOP nobody writes it — the loop writes the
  // number it is multiplied by. The loop's bodies are the ones the costume clause
  // reads, and CueRunner whole.
  const layer = files.get('scene/FigureLayer.tsx') ?? '';
  const discs = files.get('scene/discs.ts') ?? '';
  const propsSource = files.get('scene/props.ts') ?? '';
  const writesLook = /\buLook\b[\s\S]{0,40}\.value\s*=|\blook\.value\s*=|\bapplyLook\(/;
  const loop: Array<[string, string]> = [
    ['CueRunner.tsx', runner],
    ['DiscField.bind', bodyOf(discs.slice(discs.indexOf('class DiscField')), 'bind')],
    ['DepartureField.bind', bodyOf(layer.slice(layer.indexOf('class DepartureField')), 'bind')],
    ['PropField.bind', bodyOf(propsSource.slice(propsSource.indexOf('export class PropField')), 'bind')],
  ];
  for (const [name, body] of loop) {
    assert.ok(body.length > 100, `could not find ${name}`);
    assert.ok(!writesLook.test(body), `${name} writes a look in the frame loop`);
    assert.ok(writesLook.test(`${body}\nmaterial.uniforms.uLook.value = 1;`), `the look scan misses a write in ${name}`);
  }
  // The one look NUMBER the loop writes is LOOK's `uMaterialize` handle (D145),
  // multiplied into the committed `uLook` by the shader, from exactly two bodies:
  // a living figure's (`applyMaterialize`, from `applyFigures`) and a falling
  // body's (`DepartureField.bind`, the reverse summon) — D148, at the merge.
  const materialize = bodyOf(runner, 'applyMaterialize');
  assert.match(materialize, /uniforms\.uMaterialize;[\s\S]*handle\.value = value;/, 'applyMaterialize no longer writes LOOK’s uMaterialize handle');
  assert.ok(!/\buLook\b|lookHeld|lookWritten/.test(materialize), 'applyMaterialize scales uLook again — the spike’s fallback went at the merge (D148)');
  const departureBind = bodyOf(layer.slice(layer.indexOf('class DepartureField')), 'bind');
  assert.match(
    departureBind,
    /const materialize = source\.offsetOf\(entry\.cardId\)\.materialize;\s*uniforms\.uMaterialize\.value = materialize >= 1 \? 1 : Math\.max\(0, materialize\);/,
    'a falling body no longer drains its ink back to hologram with its dissolve (D148)',
  );
  const namesMaterialize = (code: string): boolean => /\buMaterialize\b/.test(code);
  assert.deepEqual(
    [...files].filter(([, code]) => namesMaterialize(code)).map(([path]) => path).sort(),
    ['scene/CueRunner.tsx', 'scene/FigureLayer.tsx', 'scene/figureMaterial.ts'],
    'something new names uMaterialize — the loop’s one look number has two writers and one declaration',
  );
  assert.ok(namesMaterialize(runner.replace(materialize, '')) === false, 'CueRunner names uMaterialize outside applyMaterialize');
  assert.ok(namesMaterialize(layer.replace(departureBind, '')) === false, 'FigureLayer names uMaterialize outside DepartureField.bind');
  assert.ok(namesMaterialize(`${layer.replace(departureBind, '')}\nrig.material.uniforms.uMaterialize.value = 0;`), 'the uMaterialize scan misses the line it exists to catch');
  // The negative control: a colour or a costume written from the loop is still caught.
  assert.ok(/\bapplyCostume\(|\buCostume\b/.test(`${bodyOf(runner, 'applyMaterialize')}\nuCostume.value[0].set('#fff');`));

  // The pool: 49, by exactly one new kind of four; the streak counts against the cap.
  const literal = /export const POOL = \{([^}]*)\}/.exec(effects)?.[1] ?? '';
  const sizes = Object.fromEntries([...literal.matchAll(/(\w+):\s*(\d+)/g)].map((m) => [m[1]!, Number(m[2])]));
  assert.deepEqual(sizes, { glow: 8, ring: 8, beam: 5, particles: 3, text: 6, plate: 3, mote: 12, streak: 4 });
  assert.equal(Object.values(sizes).reduce((a, b) => a + b, 0), 49, 'the pool is not 45 + 4');
  const stageModule = await import('../src/arena/cues/stage.ts');
  assert.equal(stageModule.effectBucketOf('streak'), 'effect', 'a streak escaped the eight-slot cap');
  assert.equal(stageModule.MAX_LIVE_EFFECTS, 8, 'MAX_LIVE_EFFECTS moved — say why, with a measurement');
  // Every parked streak is primed like every other slot (T7): prime walks the slots.
  assert.match(bodyOf(pool, 'prime'), /for \(const slot of this\.#slots\)/, 'prime no longer walks every slot');
});

// ---------------------------------------------------------------------------
// Lane BODIES — the resting poses, the hair, the face, the coat and the art rung
// ---------------------------------------------------------------------------

/**
 * **Lane BODIES grew the arena by three files, and each is on the right side**
 * (D156–D160). `figures/rests.ts` (the resting poses) and `figures/palette.ts`
 * (the k-means) are pure, and the `figures/` scan above covers them — said here so
 * a move is noticed. `arena/art.ts` is the one arena module that reads PIXELS:
 * it imports no three and no renderer, nothing in `scene/` or `cues/` imports it
 * (the frame loop never waits on an image), and its hook is called from exactly
 * three places: `Arena.tsx` and the workshop's `Pedestal.tsx`, which DRAW the
 * rung (switched on at the lanes' merge, D164 — lane BODIES' follow-up 13, applied
 * by the merge pass that may edit lane LOOK's files) and each hand it ONLY the
 * names `paletteNamesOf` returns, and the workshop's tuning panel, which asks for
 * its own face-up card's. `paletteNamesOf` skips every placement drawn as a back
 * and every redacted stub (hard rule 8) — negative-controlled. No other file may
 * call it. On the pose side, a
 * palette map is read in exactly two places, `pose.ts`'s `paletteFor` and
 * `tilePose`'s land lookup, and each carries its own gate — also
 * negative-controlled here, and by `palette.test.ts`'s hostile corpus, which
 * hands every back and every stub a real name. The derived rest clips are SAMPLED at load
 * (`scene/models.ts`'s `deriveRestClip`), never ticked: the mixer clause above
 * already holds `mixer.update` to three files, and this one holds the derivation
 * to `sampleClipInto`.
 */
test('liveness: lane BODIES — the poses and the palette are pure, and the art is read off the hot path, face up only', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, f.source]));
  assert.ok(files.has('figures/rests.ts') && files.has('figures/palette.ts'), 'the pure halves moved out of figures/');
  const art = files.get('art.ts') ?? '';
  assert.ok(art !== '', 'arena/art.ts is missing');
  for (const imported of importsOf(art)) {
    assert.ok(imported.from !== 'three' && !imported.from.startsWith('three/') && !imported.from.includes('scene/'), `art.ts imports ${imported.from}`);
  }
  // Nobody on the frame loop's side imports it.
  for (const [path, source] of files) {
    if (!(path.startsWith('scene/') || path.startsWith('cues/') || path.startsWith('figures/'))) continue;
    for (const imported of importsOf(source)) assert.ok(!/(^|\/)art\.ts$/.test(imported.from) || imported.from.startsWith('../../'), `${path} imports arena/art.ts`);
  }
  // It is the only arena module that decodes an image into pixels.
  for (const [path, source] of files) {
    if (path === 'art.ts') continue;
    const code = codeOf(source);
    assert.ok(!/getImageData\(|new Image\(/.test(code), `${path} reads pixels — the art rung's reads are art.ts's`);
  }
  // The one entry point checks both gates, and a copy without them is caught.
  const gate = /function paletteNamesOf[\s\S]*?\n\}/.exec(codeOf(art))?.[0] ?? '';
  const guarded = (body: string): boolean => /placement\.back/.test(body) && /isHidden\(placement\.card\)/.test(body);
  assert.ok(guarded(gate), 'paletteNamesOf no longer skips a back or a redacted stub');
  assert.equal(guarded(gate.replace('placement.back ||', '')), false, 'the gate check cannot tell a missing back test');
  // The pose side reads a palette map in two places, and each is gated.
  const figureCode = [...files].filter(([path]) => path.startsWith('figures/')).map(([path, source]) => [path, codeOf(source)] as const);
  const reads = figureCode.flatMap(([path, code]) => (code.match(/\bpalettes(?:\?)?\.get\(/g) ?? []).map(() => path));
  assert.deepEqual(reads.sort(), ['figures/pose.ts', 'figures/tiles.ts'], 'a palette map is read somewhere new');
  const pose = figureCode.find(([path]) => path === 'figures/pose.ts')?.[1] ?? '';
  const lookup = /export function paletteFor[\s\S]*?\n\}/.exec(pose)?.[0] ?? '';
  const lookupGuarded = (body: string): boolean =>
    /placement\.back/.test(body) && /isHidden\(placement\.card\)/.test(body) && /name === ''/.test(body);
  assert.ok(lookupGuarded(lookup), 'paletteFor no longer skips a back, a redacted stub or a nameless card');
  assert.equal(lookupGuarded(lookup.replace('placement.back ||', '')), false, 'the paletteFor check cannot tell a missing back test');
  assert.equal(lookupGuarded(lookup.replace('|| isHidden(placement.card)', '')), false, 'the paletteFor check cannot tell a missing stub test');
  // Every other palette read in pose.ts goes through it: the definition and its two calls.
  assert.equal((pose.match(/\bpaletteFor\(/g) ?? []).length, 3, 'pose.ts reads a palette without paletteFor');
  const tiles = figureCode.find(([path]) => path === 'figures/tiles.ts')?.[1] ?? '';
  const tileBody = /export function tilePose[\s\S]*?\n\}/.exec(tiles)?.[0] ?? '';
  const tileGuarded = (body: string): boolean => /!placement\.back &&[^;]*palettes\.get\(name\)/.test(body) && /name !== ''/.test(body);
  assert.ok(tileGuarded(tileBody), "tilePose's art lookup no longer skips a land drawn as a back");
  assert.equal(tileGuarded(tileBody.replace('!placement.back &&', '')), false, 'the tilePose check cannot tell a missing back test');
  // extract() is only ever reached through the hook, which only reads names it is handed.
  assert.equal((codeOf(art).match(/\bextract\(/g) ?? []).length, 2, 'extract() is called from somewhere new');
  // D164: the hook's callers. `Arena.tsx` and `Pedestal.tsx` DRAW the rung (the
  // lanes' merge switched it on): each calls it exactly once, only with the names
  // `paletteNamesOf` returns, and hands the result to both pose functions.
  const read = (rel: string): string => codeOf(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
  const fedByGate = (code: string): boolean =>
    /const paletteNames = useMemo\(\(\) => paletteNamesOf\(placed\)/.test(code) && /useArtPalettes\(paletteNames, art\)/.test(code);
  const drawsRung = (code: string): boolean =>
    /figurePose\(placed, [^;]*?\bpalettes,?\s*\}\)/.test(code) && /tilePose\(placed, tileDataOf\([^)]*\), palettes\)/.test(code);
  for (const path of ['arena/Arena.tsx', 'workshop/Pedestal.tsx']) {
    const code = read(`../src/${path}`);
    assert.equal((code.match(/\buseArtPalettes\(/g) ?? []).length, 1, `${path} does not call useArtPalettes exactly once — the art rung is not drawn there`);
    assert.ok(fedByGate(code), `${path} hands useArtPalettes names that did not come through paletteNamesOf`);
    assert.ok(drawsRung(code), `${path} reads the palettes and does not hand them to figurePose and tilePose`);
    assert.equal(drawsRung(code.replace(/, palettes\)(?=,\s*\[placed)/, ')')), false, `the draw check cannot tell ${path}'s tilePose without palettes`);
    assert.equal(drawsRung(code.replace(/\bpalettes,?(\s*\}\))/, '$1')), false, `the draw check cannot tell ${path}'s figurePose without palettes`);
  }
  // The caller check can tell the follow-up's own edit from a bypassed gate.
  const applied = 'const paletteNames = useMemo(() => paletteNamesOf(placed), [placed]);\nconst palettes = useArtPalettes(paletteNames, art);';
  assert.ok(fedByGate(applied), "the caller check rejects follow-up 13's own edit");
  assert.equal(fedByGate(applied.replace('paletteNamesOf(placed)', 'placed.placements.map(nameOf)')), false, 'the caller check cannot tell a bypassed gate');
  // The panel calls it once, for its one face-up card, never a concealed entry.
  const workshop = read('../src/workshop/Workshop.tsx');
  assert.equal((workshop.match(/\buseArtPalettes\(/g) ?? []).length, 1, 'Workshop.tsx calls useArtPalettes other than once');
  assert.ok(/entry\.concealed === null && entry\.name !== '' \? \[entry\.name\] : \[\]/.test(workshop), 'the tuning panel reads art for a concealed entry');
  // …and no other file under web/src calls the hook.
  const walk = (dir: string, out: string[]): string[] => {
    for (const name of readdirSync(dir)) {
      const full = `${dir}/${name}`;
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.tsx?$/.test(name) && /\buseArtPalettes\(/.test(codeOf(readFileSync(full, 'utf8')))) out.push(full.slice(full.indexOf('/src/') + 5));
    }
    return out;
  };
  const everyCaller = walk(fileURLToPath(new URL('../src', import.meta.url)), []).sort();
  const allowed = new Set(['arena/Arena.tsx', 'arena/art.ts', 'workshop/Pedestal.tsx', 'workshop/Workshop.tsx']);
  for (const path of everyCaller) assert.ok(allowed.has(path), `useArtPalettes is called from a new file: ${path}`);
  assert.ok(everyCaller.includes('workshop/Workshop.tsx'), 'the tuning panel no longer reads its card’s palette');
  // The derivation samples; it never plays a clip through a mixer.
  const models = codeOf(files.get('scene/models.ts') ?? '');
  const derive = /export function deriveRestClip[\s\S]*?\n\}/.exec(models)?.[0] ?? '';
  assert.ok(/sampleClipInto\(/.test(derive), 'deriveRestClip no longer samples its frame');
  assert.ok(!/\.update\(|clipAction\(|\.play\(/.test(derive), 'deriveRestClip plays a clip');
});

/**
 * **The personal tier, phase 2** (D194–D196; the tier is D190): the user's own
 * models, loaded from the Vite dev server alone. Four clauses, each with its
 * negative control:
 *
 *  - `arena/personal.ts` — THE reader of the index and THE lookup — is pure: no
 *    three, no React, no DOM, no storage, no clock, no request;
 *  - **the arena's same-origin load paths are an allow-list** (the URL clause
 *    above refuses every scheme; this is its half for a path with none): a
 *    literal shaped like a file to load — `<dir>/<file>.glb|json|png|jpg|webp` —
 *    is in `PATH_ALLOW` with its reason, and the personal route's
 *    `personal/index.json` sits behind `import.meta.env.DEV` on its own line, so a
 *    production build carries no address of it (`personal.test.ts` greps `dist`);
 *  - the index is read by `personalOverlayOf` in `scene/personalModels.ts` and
 *    nowhere else, a personal model is loaded by `loadPersonalModel` —
 *    `scene/models.ts`'s own GLTFLoader and MeshoptDecoder — called from
 *    `scene/personalModels.ts` alone, and nothing names drei's loader;
 *  - the lookup (`personalChoicesOf`) and the dressing (`dressPoses`) are called
 *    in `Arena.tsx` and nowhere else in the arena (the workshop's pedestal calls
 *    them too, outside this scan), so every figure the arena dresses went through
 *    THE lookup's gates.
 */
const PATH_ALLOW: Readonly<Record<string, readonly string[]>> = {
  // The CC0 library's default path (models.json names it too).
  'scene/models.ts': ['models/figures.glb'],
  'scene/FigureLayer.tsx': ['models/figures.glb'],
  'scene/DuelistLayer.tsx': ['models/figures.glb'],
  // The personal tier's index on the dev route (D195) — behind import.meta.env.DEV.
  'scene/personalModels.ts': ['personal/index.json'],
};
/**
 * **A path SHAPE, for a file that names a family of assets** (D250): the audio
 * module names one same-origin clip per id (`scene/audio.ts`'s `SOUND_FILES`), and
 * listing eleven literals here would be a list to keep in step with a list. So a
 * file may carry a shape instead — still no scheme, still `web/public/` only — and
 * every literal of that file matching `LOAD_PATH` must match it.
 */
const PATH_SHAPE_ALLOW: Readonly<Record<string, RegExp>> = {
  // The sound cues' clips (D250): web/public/audio/<id>.ogg, one per `SOUND_IDS` entry.
  'scene/audio.ts': /^audio\/[a-z]+\.ogg$/,
};
const LOAD_PATH = /^[a-z0-9_-]+\/[A-Za-z0-9_./-]+\.(glb|json|png|jpg|webp|ogg|opus|mp3|wav|m4a)$/;
function loadPathsOf(path: string, code: string): string[] {
  const allowed = PATH_ALLOW[path] ?? [];
  const shape = PATH_SHAPE_ALLOW[path] ?? null;
  return stringLiterals(code).filter(
    (literal) => LOAD_PATH.test(literal) && !allowed.includes(literal) && (shape === null || !shape.test(literal)),
  );
}

test('liveness: the personal tier — the reader is pure, the load paths are an allow-list, the route is DEV-only, one loader, one lookup (D194–D196)', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, codeOf(f.source)]));
  // 1 — personal.ts is pure.
  const pure = files.get('personal.ts') ?? '';
  assert.ok(pure.length > 1000, 'arena/personal.ts is gone — move this clause with it');
  for (const imported of importsOf(pure)) {
    assert.ok(
      ['../protocol.ts', './figures/pose.ts', './figures/rests.ts', './layout.ts', './perf.ts'].includes(imported.from),
      `arena/personal.ts imports ${imported.from}: the reader and the lookup are pure`,
    );
  }
  assert.ok(!/\b(window|document|localStorage|sessionStorage|performance|Date\.now|setTimeout|setInterval|fetch|XMLHttpRequest|THREE)\b/.test(pure), 'arena/personal.ts touches the DOM, a clock, storage, three or the network');

  // 2 — the load paths, with the negative controls first.
  assert.deepEqual(loadPathsOf('Arena.tsx', "const u = 'personal/models/doctor-doom/model.glb';"), ['personal/models/doctor-doom/model.glb']);
  assert.deepEqual(loadPathsOf('scene/models.ts', "load('personal/index.json');"), ['personal/index.json']);
  assert.deepEqual(loadPathsOf('scene/personalModels.ts', "const a = 'personal/index.json';"), []);
  // D250's shape: the audio module's clip paths pass, the same shape anywhere else
  // does not, and a clip path of another shape in the audio module does not.
  assert.deepEqual(loadPathsOf('scene/audio.ts', "const a = 'audio/enter.ogg';"), []);
  assert.deepEqual(loadPathsOf('Arena.tsx', "const a = 'audio/enter.ogg';"), ['audio/enter.ogg']);
  assert.deepEqual(loadPathsOf('scene/audio.ts', "const a = 'sfx/enter.mp3';"), ['sfx/enter.mp3']);
  assert.equal(offOriginLiterals('scene/audio.ts', "const a = 'https://kenney.nl/media/pages/assets/impact-sounds/x.ogg';").length, 1);
  for (const [path, code] of files) assert.deepEqual(loadPathsOf(path, code), [], `${path} names a load path PATH_ALLOW does not list`);
  for (const [path, shape] of Object.entries(PATH_SHAPE_ALLOW)) {
    assert.ok(stringLiterals(files.get(path) ?? '').some((l) => shape.test(l)), `PATH_SHAPE_ALLOW["${path}"] matches nothing — a stale permission`);
  }
  for (const [path, paths] of Object.entries(PATH_ALLOW)) {
    for (const p of paths) assert.ok(stringLiterals(files.get(path) ?? '').includes(p), `PATH_ALLOW["${path}"] names ${p}, which is gone`);
  }
  const loader = files.get('scene/personalModels.ts') ?? '';
  for (const line of loader.split('\n')) {
    if (line.includes("'personal/")) assert.match(line, /import\.meta\.env\.DEV \? 'personal\//, `the personal route is named outside import.meta.env.DEV: ${line.trim()}`);
  }

  // 3 — one reader, one loader, never drei's.
  const callers = (name: string): string[] =>
    [...files].filter(([, code]) => new RegExp(`\\b${name}\\(`).test(code.replace(new RegExp(`function ${name}\\(`, 'g'), ''))).map(([p]) => p);
  assert.deepEqual(callers('personalOverlayOf'), ['scene/personalModels.ts']);
  assert.deepEqual(callers('loadPersonalModel'), ['scene/personalModels.ts']);
  assert.match(files.get('scene/models.ts') ?? '', /export function loadPersonalModel\([\s\S]*?makeLoader\(\)\.load\(/, 'loadPersonalModel no longer goes through models.ts\'s own loader');
  assert.ok(!/useGLTF|drei/.test(importsOf(loader).map((i) => i.from).join(' ')));

  // 4 — the lookup and the dressing: Arena.tsx's alone in the arena.
  assert.deepEqual(callers('personalChoicesOf'), ['Arena.tsx']);
  assert.deepEqual(callers('dressPoses'), ['Arena.tsx']);
  // …and the figure layer's one choice: a dressed pose's personal model, else the CC0 library's.
  const layer = files.get('scene/FigureLayer.tsx') ?? '';
  assert.match(layer, /function modelOf\(pose: FigurePose/, 'FigureLayer lost its one model-source choice');
  assert.equal((layer.match(/library\.get\(pose\.modelId\)/g) ?? []).length, 1, 'FigureLayer chooses a model somewhere other than modelOf');
});

/**
 * **Inspect from the table** (D241): `arena/inspect.ts` is THE planner of what
 * `I` and the inspect chip open — pure, reading a card's name only after its
 * placement's gates — and `Arena.tsx` is its one caller in the arena; what the
 * arena does with the answer is navigation (a hash), never an act.
 */
test('liveness: the inspect planner is pure, Arena.tsx is its one caller, and inspecting only navigates (D241)', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, codeOf(f.source)]));
  const planner = files.get('inspect.ts') ?? '';
  assert.ok(planner.length > 500, 'arena/inspect.ts is gone — move this clause with it');
  for (const imported of importsOf(planner)) {
    assert.ok(
      ['../protocol.ts', './figures/pose.ts', './layout.ts'].includes(imported.from),
      `arena/inspect.ts imports ${imported.from}: the planner is pure`,
    );
  }
  assert.ok(!/\b(window|document|localStorage|sessionStorage|performance|Date\.now|setTimeout|setInterval|fetch|XMLHttpRequest|THREE|React)\b/.test(planner), 'arena/inspect.ts touches the DOM, a clock, storage, three or React');
  // The gates before the name: the placement's back and stub test, then the figure, THEN `.name`.
  const body = planner.slice(planner.indexOf('export function inspectTargetOf('));
  const gate = body.indexOf('placement.back || isHidden(placement.card)');
  const read = body.indexOf('.name');
  assert.ok(gate > 0 && read > gate, 'inspectTargetOf reads the name before the face-up gate');
  const callers = [...files].filter(([path, code]) => path !== 'inspect.ts' && /\binspectTargetOf\(/.test(code)).map(([path]) => path);
  assert.deepEqual(callers, ['Arena.tsx'], 'the planner is Arena.tsx’s alone');
  // What the arena does with it: a hash, never an act.
  const arena = files.get('Arena.tsx') ?? '';
  const open = arena.slice(arena.indexOf('function openInspect('), arena.indexOf('function InspectChip('));
  assert.match(open, /window\.location\.hash = href;/);
  assert.doesNotMatch(open, /onAct|onAnswer|clickCard/);
  const chip = arena.slice(arena.indexOf('function InspectChip('), arena.indexOf('function nameOf('));
  assert.doesNotMatch(chip, /onAct|onAnswer|onClick/, 'the chip is a link, not a control');
});

/**
 * **Sound is a renderer on the one loop** (D250, D251). Five source facts hold it,
 * each the rule a visual effect already lives by:
 *
 *  - `scene/audio.ts` — THE audio module — imports nothing but the cue engine's
 *    sound vocabulary: no three, no React, no transport. It starts no timer, reads
 *    no clock, calls no `fetch` (the bytes come through the loader it is handed,
 *    `scene/models.ts`'s `loadAssetBytes`, three's own `FileLoader`) and touches no
 *    storage — the viewer's choice is `Arena.tsx`'s, inside `try` (the clause above);
 *  - `audio.bind(` is called from `scene/CueRunner.tsx` and nowhere else, so the
 *    sounds play inside the one `useFrame`, after the tick that asked for them;
 *  - a cue never makes a sound: `playSound(` is called by the QUEUE alone (it reads
 *    the cue's `sound` param and fires it when the cue's progress crosses
 *    `soundAt`), and `stopSounds(` by the queue's snaps (a flush, a skip, a pause);
 *  - the play path allocates nothing: `play`, `bind`, the voice search and the
 *    stage's sound buffer pass the allocation scan, with the junk lines spliced in
 *    as the negative control; the pan is an indexed walk of the placements;
 *  - `AudioContext` is created only in `unlock()`, which the arena calls from a
 *    gesture's handler (the checkbox, `M`, the first press after a stored ON).
 */
test('liveness: sound is one module, bound from the one loop, fired by the queue, and its play path allocates nothing (D250)', () => {
  const files = new Map(arenaFiles().map((f) => [f.path, codeOf(f.source)]));
  const audio = files.get('scene/audio.ts') ?? '';
  assert.ok(audio.length > 2000, 'scene/audio.ts is gone — move this clause with it');
  const cls = audio.slice(audio.indexOf('export class ArenaAudio'));
  // 1 — its shape.
  assert.deepEqual(
    importsOf(audio).map((i) => `${i.typeOnly ? 'type ' : ''}${i.from}`),
    ['../cues/sound.ts'],
    'scene/audio.ts imports more than the sound vocabulary',
  );
  assert.ok(
    !/\b(setTimeout|setInterval|requestAnimationFrame|requestIdleCallback|performance\.now|Date\.now|fetch|XMLHttpRequest|localStorage|sessionStorage|THREE|React|useFrame)\b/.test(audio),
    'scene/audio.ts reads a clock, starts a timer, fetches, stores or draws',
  );
  const sound = files.get('cues/sound.ts') ?? '';
  assert.ok(!/\b(window|document|AudioContext|localStorage|setTimeout|setInterval|performance|Date\.now|fetch)\b/.test(sound), 'cues/sound.ts is not pure');
  // 2 — bound from the one loop.
  const callers = (pattern: RegExp): string[] => [...files].filter(([, code]) => pattern.test(code)).map(([path]) => path).sort();
  assert.deepEqual(callers(/\baudio\.bind\(/), ['scene/CueRunner.tsx'], 'the audio module is bound outside the frame loop');
  assert.deepEqual(callers(/\baudio\.play\(|\bthis\.play\(/), ['scene/audio.ts'], 'a sound is played outside the audio module’s bind');
  const runner = files.get('scene/CueRunner.tsx') ?? '';
  const loop = runner.slice(runner.indexOf('useFrame(() => {'));
  assert.ok(loop.indexOf('queue.tick(now)') > 0 && loop.indexOf('audio.bind(stage.sounds, soundPan)') > loop.indexOf('queue.tick(now)'), 'the sounds are not bound after the tick, inside the loop');
  // 3 — fired by the queue, never by a cue.
  assert.deepEqual(callers(/\.playSound\(/), ['cues/queue.ts'], 'something other than the queue fires a sound');
  assert.deepEqual(callers(/\.stopSounds\(/), ['cues/queue.ts'], 'something other than the queue cuts the sounds');
  assert.ok(!/playSound|stopSounds|soundAt|soundGain/.test(files.get('cues/registry.ts') ?? ''), 'a cue implementation reaches for the sound');
  // 5 — the context is created in unlock() and nowhere else.
  assert.deepEqual(callers(/\bnew\s+(?:AudioContext|webkitAudioContext|Ctor)\b/), ['scene/audio.ts']);
  assert.equal((cls.match(/this\.#make\(\)/g) ?? []).length, 1, 'the context is built somewhere other than unlock()');
  assert.ok(bodyOf(cls, 'unlock').includes('this.#make()'), 'the context is built outside unlock()');
  assert.deepEqual(callers(/\.unlock\(\)/), ['Arena.tsx'], 'the arena unlocks the audio from somewhere other than its gesture handlers');
  const arena = files.get('Arena.tsx') ?? '';
  for (const where of ['const setSound = useCallback(', 'const unlock = (): void => {']) {
    const at = arena.indexOf(where);
    assert.ok(at > 0 && arena.slice(at, at + 400).includes('audio.unlock()'), `Arena.tsx's ${where} no longer unlocks inside the gesture`);
  }

  // 4 — the play path allocates nothing, with the negative controls first.
  const pending = sound.slice(sound.indexOf('export class PendingSounds'));
  const bodies: Array<[string, string]> = [
    ['ArenaAudio.play', bodyOf(cls, 'play')],
    ['ArenaAudio.bind', bodyOf(cls, 'bind')],
    ['ArenaAudio.#free', bodyOf(cls, '#free')],
    ['ArenaAudio.busyVoices', bodyOf(cls, 'busyVoices')],
    ['PendingSounds.push', bodyOf(pending, 'push')],
    ['PendingSounds.cutAll', bodyOf(pending, 'cutAll')],
    ['PendingSounds.drop', bodyOf(pending, 'drop')],
    ['CueRunner panOf', bodyOf(runner, 'panOf')],
  ];
  for (const [name, body] of bodies) assert.ok(body.length > 10, `could not find the body of ${name}`);
  assert.ok(bodies[1]![1].includes('this.play('), 'bind no longer plays through play()');
  assert.ok(bodies[0]![1].includes('this.#free()'), 'play no longer finds its voice through #free()');
  assert.ok(!/createBufferSource|createGain|createStereoPanner/.test(bodies[0]![1]), 'play builds a node — a voice arms its source off the play path');
  for (const [name, body] of bodies) {
    for (const line of ['const _junk = [t, t];', 'const o = { a: 1 };', 'const f = () => 1;', 'const s = `${1}`;', 'const v = new Float32Array(4);']) {
      assert.ok(allocationsIn(`\n${line}\n${body}`).length > 0, `the allocation scan misses \`${line}\` in ${name}`);
    }
    assert.deepEqual(allocationsIn(body), [], `${name} allocates on the play path`);
  }
});
