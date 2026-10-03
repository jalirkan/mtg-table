#!/usr/bin/env node
/*
 * mtg-table — tools/anchor-gc-probe.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **What the effect pool's anchor resolver allocates, counted by the garbage
 * collector** (GPU-pass follow-up 12, D275; `docs/evidence/anchor-scratch.md`).
 *
 * The allocation scan in `web/test/liveness.test.ts` reads source for the
 * constructs that allocate; this counts what V8 actually collected. Every case
 * runs in a FRESH Node process (its own heap and its own type feedback): it lays
 * out one board — `g1.jsonl` at transport index 316, the bench frame, unless told
 * otherwise — resolves one anchor `--warm` times to let the optimising compiler
 * settle, then `--calls` times more while a `PerformanceObserver` counts the
 * `gc` entries whose start falls inside the loop. A number is GC events per
 * `--calls` calls: a young-generation scavenge happens each time the nursery
 * fills, so it is proportional to the bytes allocated per call and 0 when a call
 * allocates nothing that survives the compiler.
 *
 *   node tools/anchor-gc-probe.ts                       # this checkout's web/src
 *   node tools/anchor-gc-probe.ts --src <tree>/web/src  # another tree (a git archive)
 *   node tools/anchor-gc-probe.ts --json var/probe.json
 *
 * Paths, per anchor kind (and `mixed`, every kind in turn from the first call, as
 * the frame loop's feedback is):
 *   - `stage`: `SceneStage.positionOf(ref)` — the frame loop's own path, the
 *     resolver `EffectPool.bind` hands every non-figure effect, every frame;
 *   - `anchorPosition`: the exported function called directly (its allocating
 *     form after D275, which returns a tuple the caller keeps);
 *   - `bind`: `EffectPool.bind` over the turn banner (a `text` effect at the
 *     `table` anchor) and the life number (a `text` effect at the viewer's
 *     `player` anchor), `--binds` times — the two effects the follow-up named —
 *     together and apart, beside the same text at an anchor that places nothing
 *     (`unplaced`: the pool hides it before the text case) and an empty pool;
 *     and `mix`, every kind of anchor the pool resolves through the stage at
 *     once (a banner, a life number, a glow on a card, a strand from above a
 *     card, two glows beside one, a mote to an opponent's casting anchor);
 *     `bindmemo` binds the same effects with each answer resolved once and then
 *     looked up — the pool's own residue, so `bind` minus `bindmemo` is what the
 *     resolver costs on the pool's path (D275's fix pass);
 *   - `set` (D275's fix pass): `SceneStage.positionOf` over a SET of kinds in
 *     turn — `set|card,above@0.55/1.5` is the card and `above` anchors with a
 *     height of 0.55 and a `beside` offset of 1.5 — in a loop of its own shape
 *     (`positionOf` called straight from the loop, the answer's three numbers
 *     read). The resolver's compiled code depends on which shapes of ref it has
 *     seen and on what the compiler inlined, and one state boxed a fractional
 *     height that `mixed` never reached; the sets are that state and its
 *     neighbours, each with fractional and whole numbers
 *     (`docs/evidence/anchor-scratch.md` §9);
 *   - `direct`: the same sets through `tools/anchor-gc-direct.ts`, the script
 *     that reproduced the verifier's state, spawned as it is (its header).
 * Two controls run through the same loop: a function that returns one fixed
 * tuple (nothing to collect) and one that returns a fresh `[x, y, z]` it keeps
 * (so the compiler cannot elide it) — what one tuple a call costs here. The
 * answer is read into a `Float64Array`, never a `let` sum: a double accumulated in
 * a local is boxed on every add by the tiers below the optimising compiler (7–9
 * GC events per 5M calls, measured, and the harness's own).
 *
 *   --in-process   every case in ONE process, one after another, so the resolver's
 *                  feedback has seen every earlier kind (and been deoptimised by
 *                  each new one) and the heap has grown; the default is a fresh
 *                  process per case, which is how the numbers are compared.
 *   --height <n>   the `above` anchor's height (0.6), and
 *   --dx <n>       the `beside` anchor's offset (1), numbers computed at run
 *                  time; a `set` case names its own. (Before the fix pass this
 *                  said the in-process mode's 2–4 events for `stage|above` were
 *                  the probe's own ref: they were the resolver's, the boxing §9
 *                  of the evidence found — the in-process mode reads 0 after.)
 *   --no-sets      skip the `set` and `direct` cases.
 *   --index, --recording, --calls, --warm, --binds, --json <file>
 *
 * Not in `check-all.sh`: it prints numbers, it asserts nothing, and a GC count is
 * the engine's, not the repository's. Node 24 runs it by type stripping.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PerformanceObserver, performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const arg = (name: string, fallback: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1]! : fallback;
};

const REPO = resolve(import.meta.dirname, '..');
const SRC = resolve(arg('src', resolve(REPO, 'web/src')));
const RECORDING = resolve(REPO, arg('recording', 'fixtures/games/g1.jsonl'));
const INDEX = Number(arg('index', '316'));
const CALLS = Number(arg('calls', '5000000'));
const WARM = Number(arg('warm', '500000'));
const BINDS = Number(arg('binds', '2000000'));
const JSON_OUT = arg('json', '');
const HEIGHT = Number(arg('height', '0.6'));
const DX = Number(arg('dx', '1'));

type Tuple = [number, number, number];
/** Where the fresh-tuple control keeps its answer, so the tuple escapes. */
let kept: Tuple | null = null;
type Ref = Record<string, unknown> & { kind: string };

/** The anchor kinds, each with the ref it resolves on the board (ids filled in from the layout). */
const KINDS = [
  'card',
  'player:you',
  'player:opp',
  'zone:you',
  'zone:opp',
  'combat:you',
  'combat:opp',
  'casting:you',
  'casting:opp',
  'stack',
  'table',
  'above',
  'beside',
  'figure',
] as const;
const CONTROLS = ['control:fixed-tuple', 'control:fresh-tuple'] as const;

interface Board {
  placed: { viewerId: number | null; placements: Array<{ cardId: number; kind: string }> };
  viewer: number;
  other: number;
  creature: number;
}

async function boardOf(): Promise<{ board: Board; layoutMod: Record<string, unknown> }> {
  const url = (p: string): string => pathToFileURL(resolve(SRC, p)).href;
  const replay = (await import(url('transport/replay.ts'))) as {
    parseFrameLog: (text: string) => { header: unknown; frames: unknown[] };
  };
  const reduceMod = (await import(url('reduce.ts'))) as {
    initialState: (header?: unknown) => unknown;
    reduce: (state: unknown, frame: unknown) => unknown;
  };
  const layoutMod = (await import(url('arena/layout.ts'))) as Record<string, unknown>;
  const log = replay.parseFrameLog(readFileSync(RECORDING, 'utf8'));
  let state = reduceMod.initialState(log.header);
  for (const frame of log.frames.slice(0, INDEX)) state = reduceMod.reduce(state, frame);
  const placed = (layoutMod['layout'] as (s: unknown) => Board['placed'])(state);
  const viewer = placed.viewerId ?? 0;
  const players = (state as { board: { players: Array<{ id: number }> } }).board.players.map((p) => p.id);
  const other = players.find((id) => id !== viewer) ?? viewer + 1;
  const creature = placed.placements.find((p) => p.kind === 'creature')?.cardId ?? placed.placements[0]!.cardId;
  return { board: { placed, viewer, other, creature }, layoutMod };
}

function refOf(kind: string, b: Board, height = HEIGHT, dx = DX): Ref {
  switch (kind) {
    case 'card':
      return { kind: 'card', id: b.creature };
    case 'player:you':
      return { kind: 'player', id: b.viewer };
    case 'player:opp':
      return { kind: 'player', id: b.other };
    case 'zone:you':
      return { kind: 'zone', player: b.viewer, zone: 'graveyard' };
    case 'zone:opp':
      return { kind: 'zone', player: b.other, zone: 'graveyard' };
    case 'combat:you':
      return { kind: 'combat', player: b.viewer };
    case 'combat:opp':
      return { kind: 'combat', player: b.other };
    case 'casting:you':
      return { kind: 'casting', player: b.viewer };
    case 'casting:opp':
      return { kind: 'casting', player: b.other };
    case 'stack':
      return { kind: 'stack' };
    case 'table':
      return { kind: 'table' };
    case 'above':
      return { kind: 'above', id: b.creature, height };
    case 'beside':
      return { kind: 'beside', id: b.creature, dx };
    case 'figure':
      return { kind: 'figure', id: b.creature, at: 0.5 };
    default:
      throw new Error(`unknown kind ${kind}`);
  }
}

/**
 * The kind groups a `set` case names: each is every ref of that kind the frame
 * loop hands the resolver — both seats' where a kind has a seat, and the casting
 * anchor with `ground` too, since each is a different shape of object.
 */
const GROUPS: Record<string, (b: Board, height: number, dx: number) => Ref[]> = {
  card: (b) => [refOf('card', b)],
  player: (b) => [refOf('player:you', b), refOf('player:opp', b)],
  zone: (b) => [refOf('zone:you', b), refOf('zone:opp', b)],
  combat: (b) => [refOf('combat:you', b), refOf('combat:opp', b)],
  casting: (b) => [refOf('casting:you', b), refOf('casting:opp', b), { kind: 'casting', player: b.viewer, ground: true }],
  stack: (b) => [refOf('stack', b)],
  table: (b) => [refOf('table', b)],
  above: (b, height, dx) => [refOf('above', b, height, dx)],
  beside: (b, height, dx) => [refOf('beside', b, height, dx)],
  figure: (b) => [refOf('figure', b)],
};

/** The `set` cases: the state that boxed (every group) and its neighbours, each with a fractional and a whole height and offset. */
const SETS = [
  'card,player,zone,combat,casting,stack,table,above,beside,figure',
  'card,player,zone,combat,casting,above,beside',
  'card,above',
  'table,above',
  'table,player,above',
  'card,above,beside',
  'card,table,player,above',
  'card,player,stack,table,above,beside',
  'zone,combat,casting,above',
  'card,beside',
  'table,beside',
  'table,player,casting,beside',
];
const SET_NUMBERS = ['0.55/1.5', '0.6/1', '1/-1'];

/** GC events whose start falls inside `run()`, which is called once. */
async function gcEventsDuring(run: () => number): Promise<{ events: number; ms: number; sink: number }> {
  const seen: Array<{ start: number }> = [];
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) seen.push({ start: entry.startTime });
  });
  observer.observe({ entryTypes: ['gc'] });
  // Let anything the warm-up left be collected and reported before the window opens.
  await new Promise((r) => setTimeout(r, 50));
  const t0 = performance.now();
  const sink = run();
  const t1 = performance.now();
  await new Promise((r) => setTimeout(r, 50));
  observer.disconnect();
  return { events: seen.filter((e) => e.start >= t0 && e.start <= t1).length, ms: t1 - t0, sink };
}

async function child(caseName: string): Promise<void> {
  const [path, kind] = caseName.split('|') as [string, string];
  const { board, layoutMod } = await boardOf();
  const FIXED: Tuple = [1, 2, 3];
  let call: (ref: Ref) => Tuple | null;
  if (path === 'control') {
    // The fresh tuple is KEPT (written to a module variable), so the compiler cannot
    // elide it: this is what one three-number tuple a call costs in this harness.
    call =
      kind === 'control:fixed-tuple'
        ? () => FIXED
        : (r) => {
            const t: Tuple = [(r as { id?: number }).id ?? 1, 2, 3];
            kept = t;
            return t;
          };
  } else if (path === 'anchorPosition') {
    const f = layoutMod['anchorPosition'] as (placed: unknown, ref: Ref) => Tuple | null;
    call = (ref) => f(board.placed, ref);
  } else if (path === 'stage') {
    const { SceneStage } = (await import(pathToFileURL(resolve(SRC, 'arena/scene/SceneStage.ts')).href)) as {
      SceneStage: new (layout: unknown) => { positionOf: (ref: Ref) => Tuple | null };
    };
    const stage = new SceneStage(board.placed);
    call = stage.positionOf;
  } else if (path === 'bind' || path === 'bindmemo') {
    await bindCase(board, kind, path === 'bindmemo');
    return;
  } else if (path === 'set') {
    await setCase(board, kind);
    return;
  } else {
    throw new Error(`unknown path ${path}`);
  }
  // `mixed` is every kind in turn, from the first call — the frame loop's own
  // feedback, where the resolver sees banners, numbers, motes and beams at once.
  const refs: Ref[] =
    path === 'control' ? [{ kind: 'card', id: 7 }] : kind === 'mixed' ? KINDS.map((k) => refOf(k, board)) : [refOf(kind, board)];
  const ref = refs[0]!;
  // The answer is READ, as the effect pool reads it, into a typed array: a
  // `let sink += at[0] + …` is a double the non-optimising tiers box on every add
  // (a heap number a call — 7–9 GC events per 5M here, measured), which would be
  // the harness's allocation, not the resolver's.
  const acc = new Float64Array(1);
  const loop = (n: number): number => {
    const m = refs.length;
    for (let i = 0; i < n; i++) {
      const at = call(m === 1 ? ref : refs[i % m]!);
      if (at !== null) acc[0] = acc[0]! + at[0] + at[1] + at[2];
    }
    return acc[0]!;
  };
  loop(WARM);
  const got = await gcEventsDuring(() => loop(CALLS));
  const resolved = call(ref);
  process.stdout.write(
    JSON.stringify({ case: caseName, calls: CALLS, events: got.events, ms: Number(got.ms.toFixed(1)), resolves: resolved !== null, kept: kept !== null }) + '\n',
  );
}

/**
 * `stage.positionOf` over a set of kind groups in turn, called straight from the
 * loop — the shape of loop in which the boxing D275's fix pass removed showed.
 */
async function setCase(board: Board, spec: string): Promise<void> {
  const [kinds, numbers] = spec.split('@') as [string, string];
  const [height, dx] = numbers.split('/').map(Number) as [number, number];
  const { SceneStage } = (await import(pathToFileURL(resolve(SRC, 'arena/scene/SceneStage.ts')).href)) as {
    SceneStage: new (layout: unknown) => { positionOf: (ref: Ref) => Tuple | null };
  };
  const stage = new SceneStage(board.placed);
  const refs = kinds.split(',').flatMap((k) => {
    const group = GROUPS[k];
    if (group === undefined) throw new Error(`unknown kind group ${k}`);
    return group(board, height, dx);
  });
  const acc = new Float64Array(1);
  const pos = stage.positionOf;
  const loop = (n: number): number => {
    const m = refs.length;
    for (let i = 0; i < n; i++) {
      const at = pos(refs[i % m]!);
      if (at !== null) acc[0] = acc[0]! + at[0] + at[1] + at[2];
    }
    return acc[0]!;
  };
  loop(WARM);
  const got = await gcEventsDuring(() => loop(CALLS));
  process.stdout.write(JSON.stringify({ case: `set|${spec}`, calls: CALLS, events: got.events, ms: Number(got.ms.toFixed(1)), resolves: true }) + '\n');
}

/** The turn banner and the life number, bound through the real pool every "frame". */
async function bindCase(board: Board, which: string, memo = false): Promise<void> {
  // `three` as the pool imports it (its ESM build), typed by what this uses.
  const THREE = (await import(pathToFileURL(resolve(SRC, '../node_modules/three/build/three.module.js')).href)) as {
    PerspectiveCamera: new (fov: number, aspect: number, near: number, far: number) => {
      position: { set: (x: number, y: number, z: number) => unknown };
      lookAt: (x: number, y: number, z: number) => void;
      updateMatrixWorld: () => void;
    };
  };
  const { EffectPool } = (await import(pathToFileURL(resolve(SRC, 'arena/scene/effects.ts')).href)) as {
    EffectPool: new () => {
      setFigures: (...a: unknown[]) => void;
      bind: (effects: Map<string, unknown>, resolve: unknown, camera: unknown) => void;
    };
  };
  const { SceneStage } = (await import(pathToFileURL(resolve(SRC, 'arena/scene/SceneStage.ts')).href)) as {
    SceneStage: new (layout: unknown) => { positionOf: (ref: Ref) => Tuple | null };
  };
  const stage = new SceneStage(board.placed);
  const pool = new EffectPool();
  const camera = new THREE.PerspectiveCamera(45, 16 / 10, 0.1, 100);
  camera.position.set(0, 8, 9);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const banner = { kind: 'text', at: { kind: 'table' }, colour: '#ffd166', strength: 1, radius: 0.5, text: 'TURN 9', rise: 0.1, driftX: 0.2 };
  const life = { kind: 'text', at: { kind: 'player', id: board.viewer }, colour: '#ef476f', strength: 1, radius: 0.3, text: '-3', rise: 0.2 };
  // The same text effect with an anchor the pool resolves itself (a `figure` with
  // no body falls back to its card through the resolver) and one that resolves
  // to nothing: what the pool's text case costs apart from the anchor.
  // `mix`: every anchor kind the pool resolves through the stage, live at once.
  const mix: Array<[string, unknown]> = [
    ['turn:banner', banner],
    ['life:number', life],
    ['a:glow', { kind: 'glow', at: { kind: 'card', id: board.creature }, colour: '#ffd166', strength: 0.8, radius: 0.4 }],
    ['b:strand', { kind: 'beam', at: { kind: 'above', id: board.creature, height: 0.55 }, to: { kind: 'card', id: board.creature }, colour: '#ffffff', strength: 0.8, radius: 0.016 }],
    ['c:left', { kind: 'glow', at: { kind: 'beside', id: board.creature, dx: -1.5 }, colour: '#06d6a0', strength: 0.7, radius: 0.5 }],
    ['c:right', { kind: 'glow', at: { kind: 'beside', id: board.creature, dx: 1.5 }, colour: '#06d6a0', strength: 0.7, radius: 0.5 }],
    ['d:mote', { kind: 'mote', at: { kind: 'card', id: board.creature }, to: { kind: 'casting', player: board.other }, travel: 0.4, colour: '#ef476f', strength: 1, radius: 0.1 }],
  ];
  const effects = new Map<string, unknown>(
    which === 'mix'
      ? mix
      : which === 'banner+life'
      ? [['turn:banner', banner], ['life:number', life]]
      : which === 'banner'
        ? [['turn:banner', banner]]
        : which === 'life'
          ? [['life:number', life]]
          : which === 'unplaced'
            ? [['turn:banner', { ...banner, at: { kind: 'card', id: -1 } }]]
            : [],
  );
  pool.setFigures(null, null, 0, null, board.placed);
  // `bindmemo`: the same answers, each resolved once through the stage and then
  // looked up by its ref (a `Map.get`, which allocates nothing) — the pool's own
  // cost with the resolver's taken out. `bind` minus `bindmemo` is the resolver's.
  const answers = new Map<unknown, Tuple | null>();
  const looked = (ref: Ref): Tuple | null => {
    let answer = answers.get(ref);
    if (answer === undefined) {
      const at = stage.positionOf(ref);
      answer = at === null ? null : [at[0], at[1], at[2]];
      answers.set(ref, answer);
    }
    return answer;
  };
  const resolver = memo ? looked : stage.positionOf;
  const loop = (n: number): number => {
    for (let i = 0; i < n; i++) pool.bind(effects, resolver, camera);
    return n;
  };
  loop(Math.min(WARM, BINDS));
  const got = await gcEventsDuring(() => loop(BINDS));
  process.stdout.write(JSON.stringify({ case: `${memo ? 'bindmemo' : 'bind'}|${which}`, calls: BINDS, events: got.events, ms: Number(got.ms.toFixed(1)), resolves: which !== 'unplaced' && which !== 'none' }) + '\n');
}

async function main(): Promise<void> {
  const only = arg('case', '');
  if (only !== '') {
    await child(only);
    return;
  }
  const cases = [
    ...CONTROLS.map((k) => `control|${k}`),
    ...KINDS.map((k) => `stage|${k}`),
    'stage|mixed',
    ...KINDS.map((k) => `anchorPosition|${k}`),
    'anchorPosition|mixed',
    'bind|banner+life',
    'bindmemo|banner+life',
    'bind|mix',
    'bindmemo|mix',
    'bind|banner',
    'bind|life',
    'bind|unplaced',
    'bind|none',
    ...(args.includes('--no-sets') ? [] : SETS.flatMap((set) => SET_NUMBERS.map((n) => `set|${set}@${n}`))),
    ...(args.includes('--no-sets') ? [] : SETS.flatMap((set) => SET_NUMBERS.map((n) => `direct|${set}@${n}`))),
  ];
  const rows: unknown[] = [];
  console.log(`anchor-gc-probe: ${process.version} (${process.execArgv.join(' ') || 'no flags'}), src ${SRC}`);
  console.log(`  board: ${RECORDING.slice(REPO.length + 1)} @${String(INDEX)}; ${String(CALLS)} calls a kind after ${String(WARM)} to warm, ${String(BINDS)} binds; a fresh process per case`);
  if (args.includes('--in-process')) {
    // Every case in THIS process, one after another: the resolver's type feedback
    // is polymorphic by the later cases, as it is in the frame loop, and the heap
    // has grown. The default is a fresh process per case.
    console.log('  (--in-process: every case in one process, in this order)');
    for (const c of cases) if (!c.startsWith('direct|')) await child(c);
    return;
  }
  for (const c of cases) {
    if (c.startsWith('direct|')) {
      // `tools/anchor-gc-direct.ts`, the reproducer of the state that boxed, in a
      // process of its own over the same tree (its header says why it is apart).
      const [kinds, numbers] = c.slice('direct|'.length).split('@') as [string, string];
      const [height, dx] = numbers.split('/') as [string, string];
      const direct = spawnSync(process.execPath, [...process.execArgv, resolve(import.meta.dirname, 'anchor-gc-direct.ts'), resolve(SRC, '../..')], {
        encoding: 'utf8',
        env: { ...process.env, ONLY: kinds, H: height, DX: dx, N: String(CALLS) },
      });
      if (direct.status !== 0) throw new Error(`case ${c} failed:\n${direct.stderr}`);
      const row = { case: c, calls: CALLS, events: Number(direct.stdout.trim().split('\n').pop()), ms: 0, resolves: true };
      rows.push(row);
      console.log(`  ${row.case.padEnd(40)} ${String(row.events).padStart(6)} GC events / ${String(row.calls)}  (tools/anchor-gc-direct.ts)`);
      continue;
    }
    const out = spawnSync(process.execPath, [...process.execArgv, import.meta.filename, ...args, '--case', c], {
      encoding: 'utf8',
      maxBuffer: 1 << 20,
    });
    if (out.status !== 0) throw new Error(`case ${c} failed:\n${out.stderr}`);
    const row = JSON.parse(out.stdout.trim().split('\n').pop()!) as { case: string; calls: number; events: number; ms: number; resolves: boolean };
    rows.push(row);
    console.log(`  ${row.case.padEnd(40)} ${String(row.events).padStart(6)} GC events / ${String(row.calls)}  (${String(row.ms)} ms${row.resolves ? '' : ', resolves to null'})`);
  }
  if (JSON_OUT !== '') writeFileSync(JSON_OUT, JSON.stringify({ node: process.version, flags: process.execArgv, src: SRC, recording: RECORDING, index: INDEX, rows }, null, 2) + '\n');
}

await main();
