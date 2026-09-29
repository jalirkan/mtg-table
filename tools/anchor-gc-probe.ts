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
 *     (`unplaced`: the pool hides it before the text case) and an empty pool.
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
 *   --height <n>   the `above` anchor's height (0.6), a number computed at run
 *                  time: written as a literal in this file's object, the
 *                  in-process mode read 2–4 events for `stage|above` — a
 *                  representation detail of the probe's own ref, not a construct
 *                  in the resolver (the default mode reads 0 either way).
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

function refOf(kind: string, b: Board): Ref {
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
      return { kind: 'above', id: b.creature, height: HEIGHT };
    case 'beside':
      return { kind: 'beside', id: b.creature, dx: 1 };
    case 'figure':
      return { kind: 'figure', id: b.creature, at: 0.5 };
    default:
      throw new Error(`unknown kind ${kind}`);
  }
}

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
  } else if (path === 'bind') {
    await bindCase(board, kind);
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

/** The turn banner and the life number, bound through the real pool every "frame". */
async function bindCase(board: Board, which: string): Promise<void> {
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
  const effects = new Map<string, unknown>(
    which === 'banner+life'
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
  const loop = (n: number): number => {
    for (let i = 0; i < n; i++) pool.bind(effects, stage.positionOf, camera);
    return n;
  };
  loop(Math.min(WARM, BINDS));
  const got = await gcEventsDuring(() => loop(BINDS));
  process.stdout.write(JSON.stringify({ case: `bind|${which}`, calls: BINDS, events: got.events, ms: Number(got.ms.toFixed(1)), resolves: which !== 'unplaced' && which !== 'none' }) + '\n');
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
    'bind|banner',
    'bind|life',
    'bind|unplaced',
    'bind|none',
  ];
  const rows: unknown[] = [];
  console.log(`anchor-gc-probe: ${process.version} (${process.execArgv.join(' ') || 'no flags'}), src ${SRC}`);
  console.log(`  board: ${RECORDING.slice(REPO.length + 1)} @${String(INDEX)}; ${String(CALLS)} calls a kind after ${String(WARM)} to warm, ${String(BINDS)} binds; a fresh process per case`);
  if (args.includes('--in-process')) {
    // Every case in THIS process, one after another: the resolver's type feedback
    // is polymorphic by the later cases, as it is in the frame loop, and the heap
    // has grown. The default is a fresh process per case.
    console.log('  (--in-process: every case in one process, in this order)');
    for (const c of cases) await child(c);
    return;
  }
  for (const c of cases) {
    const out = spawnSync(process.execPath, [...process.execArgv, import.meta.filename, ...args, '--case', c], {
      encoding: 'utf8',
      maxBuffer: 1 << 20,
    });
    if (out.status !== 0) throw new Error(`case ${c} failed:\n${out.stderr}`);
    const row = JSON.parse(out.stdout.trim().split('\n').pop()!) as { case: string; calls: number; events: number; ms: number; resolves: boolean };
    rows.push(row);
    console.log(`  ${row.case.padEnd(32)} ${String(row.events).padStart(6)} GC events / ${String(row.calls)}  (${String(row.ms)} ms${row.resolves ? '' : ', resolves to null'})`);
  }
  if (JSON_OUT !== '') writeFileSync(JSON_OUT, JSON.stringify({ node: process.version, flags: process.execArgv, src: SRC, recording: RECORDING, index: INDEX, rows }, null, 2) + '\n');
}

await main();
