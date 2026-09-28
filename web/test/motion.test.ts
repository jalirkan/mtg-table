/*
 * mtg-table — web/test/motion.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The comic motion lane** (`docs/research/15-art-direction.md` §5, §9.2; D130–D138
 * on branch `motion`): on twos as a pure function of a cue's own progress, the two
 * switches, and the A/B the cue strip promises — with *comic FX* off, the film over
 * the whole committed corpus is the film before the lane, op for op.
 *
 * Everything here runs under `node --test` with no browser: `cues/` imports no three,
 * and D137's projection (the last test) builds three's objects and the real
 * `EffectPool`, which need no DOM (every canvas texture is `null` without one).
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  COMIC_FX_DEFAULT,
  DEFAULT_MOTION,
  ON_TWOS_DEFAULT,
  TWOS_FPS,
  TWOS_MIN_STEPS,
  TWOS_MS,
  motionFromSearch,
  onTwos,
} from '../src/arena/cues/motion.ts';
import { CueQueue } from '../src/arena/cues/queue.ts';
import { REGISTRY } from '../src/arena/cues/registry.ts';
import {
  BURSTS,
  COMIC_WORDS,
  INK_SHAPES,
  NullStage,
  burstWord,
  isBurst,
  isComicWord,
  type CueImpl,
  type CueRegistry,
} from '../src/arena/cues/stage.ts';
import { validateCues } from '../src/arena/cues/validate.ts';
import type { GameEvent } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const CUES = validateCues(
  JSON.parse(readFileSync(fileURLToPath(new URL('../src/arena/cues/cues.json', import.meta.url)), 'utf8')) as unknown,
  { cueIds: new Set(REGISTRY.keys()) },
).data;

function fixtureFiles(): string[] {
  const out: string[] = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) if (name.endsWith('.jsonl')) out.push(dir + name);
  }
  return out;
}

function framesOf(file: string): Array<{ state: ClientState; events: GameEvent[] }> {
  const log = parseFrameLog(readFileSync(FIXTURES + file, 'utf8'));
  const out: Array<{ state: ClientState; events: GameEvent[] }> = [];
  let state = initialState(log.header);
  for (const frame of log.frames) {
    state = reduce(state, frame);
    if (frame.type === 'state') out.push({ state, events: state.events });
  }
  return out;
}

// ---------------------------------------------------------------------------
// On twos, the pure function
// ---------------------------------------------------------------------------

test('motion: on twos is twelve drawings a second, and the ends are exact', () => {
  assert.equal(TWOS_FPS, 12);
  assert.ok(Math.abs(TWOS_MS - 1000 / 12) < 1e-9);
  // The last frame of a cue is its identity frame: never held a step short of it.
  for (const ms of [0, 40, 180, 650, 1600]) {
    assert.equal(onTwos(1, ms, TWOS_MS), 1, `ms ${String(ms)}: t = 1 is 1`);
    assert.equal(onTwos(1.3, ms, TWOS_MS), 1);
    assert.equal(onTwos(0, ms, TWOS_MS), 0);
    assert.equal(onTwos(-0.2, ms, TWOS_MS), 0);
  }
  // A degenerate step or length leaves the progress alone.
  assert.equal(onTwos(0.37, 600, 0), 0.37);
  assert.equal(onTwos(0.37, 0, TWOS_MS), 0.37);
});

test('motion: on twos never runs ahead, never goes back, and holds each drawing', () => {
  for (const ms of [60, 180, 250, 500, 850, 1400]) {
    const steps = Math.max(TWOS_MIN_STEPS, Math.round(ms / TWOS_MS));
    const seen = new Set<number>();
    let last = -1;
    for (let i = 0; i <= 2000; i++) {
      const t = i / 2000;
      const shown = onTwos(t, ms, TWOS_MS);
      assert.ok(shown <= t + 1e-12, `ms ${String(ms)}: ${String(shown)} ran ahead of ${String(t)}`);
      assert.ok(shown >= last, `ms ${String(ms)}: went back at t ${String(t)}`);
      assert.ok(t - shown < 1 / steps + 1e-9, `ms ${String(ms)}: held longer than one drawing`);
      last = shown;
      seen.add(shown);
    }
    // The drawings plus the exact last frame.
    assert.equal(seen.size, steps + 1, `ms ${String(ms)}: ${String(seen.size)} distinct drawings, expected ${String(steps + 1)}`);
  }
});

test('motion: a short cue is drawn in at least four steps — a compressed tap keeps its middle', () => {
  // 60 ms is a 180 ms tap under the 250 ms live budget: under one twelfth of a second.
  const values = new Set<number>();
  for (let i = 0; i < 100; i++) values.add(onTwos(i / 100, 60, TWOS_MS));
  assert.deepEqual([...values].sort(), [0, 0.25, 0.5, 0.75]);
  assert.equal(TWOS_MIN_STEPS, 4);
});

test('motion: the step is in SCREEN time — a 4× replay is still twelve drawings a second', () => {
  // A 1000 ms cue at 4× lasts 250 ms on screen: three drawings at 12 per second,
  // floored to the minimum of four.
  const fast = new Set<number>();
  const slow = new Set<number>();
  for (let i = 0; i < 1000; i++) {
    fast.add(onTwos(i / 1000, 1000, TWOS_MS * 4));
    slow.add(onTwos(i / 1000, 1000, TWOS_MS * 0.5));
  }
  assert.equal(fast.size, TWOS_MIN_STEPS);
  assert.equal(slow.size, Math.round(1000 / (TWOS_MS * 0.5)));
});

test('motion: the two switches, as the URL states them', () => {
  assert.deepEqual(DEFAULT_MOTION, { comic: COMIC_FX_DEFAULT, twos: ON_TWOS_DEFAULT });
  assert.equal(COMIC_FX_DEFAULT, true, 'comic FX is the lane’s deliverable: on by default');
  assert.equal(ON_TWOS_DEFAULT, true, 'on twos is on by default (the brief)');
  assert.deepEqual(motionFromSearch(''), DEFAULT_MOTION);
  assert.deepEqual(motionFromSearch('?fx=classic'), { comic: false, twos: true });
  assert.deepEqual(motionFromSearch('?fx=comic&twos=0'), { comic: true, twos: false });
  assert.deepEqual(motionFromSearch('?twos=1&replay=games/g1.jsonl'), { comic: true, twos: true });
  assert.deepEqual(motionFromSearch('?fx=loud&twos=maybe'), DEFAULT_MOTION, 'an unknown value is the default');
});

// ---------------------------------------------------------------------------
// On twos, in the queue
// ---------------------------------------------------------------------------

/** A registry with one cue that records the progress it is handed. */
function spyRegistry(seen: number[]): CueRegistry {
  const impl: CueImpl = {
    lane: 'card',
    apply(_ctx, t) {
      seen.push(t);
    },
    end() {},
  };
  return new Map([['spy', impl]]);
}

const SPY_DATA = { version: 1, cards: {}, archetypes: {}, defaults: { tap: { cue: 'spy', ms: 1000 } } };
const TAP: GameEvent[] = [{ kind: 'tap', cardId: 7, tapped: true }];

function spyRun(options: { onTwos?: boolean; reducedMotion?: boolean }): { seen: number[]; queue: CueQueue } {
  const seen: number[] = [];
  const queue = new CueQueue({ stage: new NullStage(), registry: spyRegistry(seen), data: SPY_DATA, mode: 'replay', ...options });
  queue.enqueueBatch(TAP, initialState());
  for (let now = 0; now <= 1400; now += 10) queue.tick(now);
  return { seen, queue };
}

test('motion: the queue hands each cue its progress on twos — and ends it on time', () => {
  const on = spyRun({ onTwos: true });
  const off = spyRun({ onTwos: false });
  // Smooth: a new value nearly every tick. On twos: twelve drawings in a second.
  assert.ok(new Set(off.seen).size > 60, `smooth progress saw ${String(new Set(off.seen).size)} values`);
  assert.equal(new Set(on.seen).size, 12 + 1, 'twelve drawings and the exact last frame');
  assert.equal(on.seen[on.seen.length - 1], 1);
  // Stepping never holds a cue past its length: both drained on the same tick.
  assert.ok(on.queue.idle && off.queue.idle);
  assert.equal(on.seen.length, off.seen.length, 'on twos changed how long the cue ran');
});

test('motion: reduced motion turns on twos off, whatever the setting', () => {
  const reduced = spyRun({ onTwos: true, reducedMotion: true });
  assert.ok(new Set(reduced.seen).size > 20, 'a reduced-motion cue was stepped');
  const queue = new CueQueue({ stage: new NullStage(), registry: REGISTRY, data: CUES, reducedMotion: true, onTwos: true });
  assert.equal(queue.onTwos, true, 'the setting is kept');
  assert.equal(queue.twosActive, false, 'but it is not played');
  queue.setReducedMotion(false);
  assert.equal(queue.twosActive, true);
  queue.setOnTwos(false);
  assert.equal(queue.twosActive, false);
});

test('motion: the comic setting is stamped into each cue at enqueue, as reduced motion is', () => {
  const contexts: Array<boolean | undefined> = [];
  const registry: CueRegistry = new Map([
    ['spy', { lane: 'card', apply(ctx) { contexts.push(ctx.comic); }, end() {} } satisfies CueImpl],
  ]);
  const queue = new CueQueue({ stage: new NullStage(), registry, data: SPY_DATA, comic: false });
  queue.enqueueBatch(TAP, initialState());
  queue.advance(10);
  queue.setComic(true);
  queue.advance(10);
  queue.flushAndSnap();
  queue.enqueueBatch(TAP, initialState());
  queue.advance(10);
  assert.deepEqual([...new Set(contexts)], [false, true], 'a running cue kept its own; the next batch took the new one');
  assert.equal(new CueQueue({ stage: new NullStage(), registry }).comic, COMIC_FX_DEFAULT);
});

// ---------------------------------------------------------------------------
// The closed vocabulary
// ---------------------------------------------------------------------------

test('motion: the onomatopoeia is a closed list, and a burst names one of it or nothing', () => {
  assert.deepEqual([...COMIC_WORDS], ['POW', 'BLAM', 'KRAK', 'ZZAK', 'WHOOSH']);
  for (const burst of BURSTS) {
    assert.ok(isBurst(burst));
    const word = burstWord(burst);
    if (burst === 'none' || burst === 'star') assert.equal(word, null);
    else assert.ok(word !== null && isComicWord(word), `${burst} → ${String(word)}`);
  }
  for (const bad of ['POW', 'bam', '', 'pow!', 'Nick Fury', 3, null]) assert.equal(isBurst(bad), false, String(bad));
  assert.equal(isComicWord('pow'), false, 'the lettering is upper case; the param is lower');
  assert.deepEqual([...INK_SHAPES].sort(), ['burst', 'dots', 'splat']);
});

// ---------------------------------------------------------------------------
// The A/B: comic FX off is the film before the lane, over the whole corpus
// ---------------------------------------------------------------------------

/** One recording through the real queue; every op the stage saw, as comparable text. */
function opLog(
  file: string,
  comic: boolean,
): { ops: string[]; digestLines: string[]; comicOps: number; materialized: number; streaks: number; words: Set<string>; shakes: number } {
  const stage = new NullStage();
  let shakes = 0;
  const original = stage.requestCamera.bind(stage);
  stage.requestCamera = (request) => {
    if (request !== null && request.frame.length === 0) shakes += 1;
    original(request);
  };
  // On twos off in BOTH runs: the A/B is about the vocabulary, and stepping is its
  // own switch with its own tests above.
  const queue = new CueQueue({ stage, registry: REGISTRY, data: CUES, mode: 'replay', comic, onTwos: false });
  let previous: ClientState['board'] = null;
  let now = 0;
  for (const { state, events } of framesOf(file)) {
    queue.enqueueBatch(events, state, undefined, previous);
    previous = state.board;
    let guard = 0;
    while (!queue.idle && guard++ < 400) {
      now += 25;
      queue.tick(now);
    }
  }
  let comicOps = 0;
  let materialized = 0;
  let streaks = 0;
  const words = new Set<string>();
  const ops = stage.ops.map((op) => {
    if (op.effect !== undefined && (op.effect.kind === 'streak' || (op.effect.shape !== undefined && INK_SHAPES.has(op.effect.shape)) || op.effect.word !== undefined)) comicOps += 1;
    if (op.effect?.kind === 'streak') streaks += 1;
    if (op.effect?.word !== undefined) words.add(op.effect.word);
    if (op.offset !== undefined && op.offset.materialize !== 1) materialized += 1;
    return JSON.stringify(op);
  });
  // The digest's form: the lane's one new Offset field dropped at identity, which
  // is how an op of the engine before the lane is spelled.
  const digestLines = stage.ops.map((op) => {
    if (op.offset === undefined) return JSON.stringify(op);
    const offset = Object.fromEntries(Object.entries(op.offset).filter(([k, v]) => !(k === 'materialize' && v === 1)));
    return JSON.stringify({ ...op, offset });
  });
  return { ops, digestLines, comicOps, materialized, streaks, words, shakes };
}

/**
 * **The pre-lane film, pinned** (the lane's verification pass). The digest of every
 * op the cue engine sent over all 19 committed recordings with comic FX OFF and on
 * twos OFF, each op as `JSON.stringify`, the lane's one new Offset field dropped
 * where it is at identity (`materialize: 1` — an old offset never had it), taken
 * from `c81f674`'s cue engine — the tree before the lane — and matched by this
 * branch's: 310,369 ops, identical (`docs/evidence/motion.md` §A/B; the script is
 * `var/motion/ab-oplog.ts`). It is ALSO what a later change to a classic cue moves
 * — that is the point: change it only with a reason, and re-derive it from the
 * engine you mean to match. On twos is not part of it: with comic FX off and on
 * twos ON (the default when only comic FX is unticked) the TIMING is stepped, the
 * vocabulary is the old one.
 */
const PRE_LANE_FILM = { ops: 310369, sha256: '3710d0b439f9d022157a14c4229eaeb129e627d58ae3a3de527e7255bda45f81' } as const;

test('motion: with comic FX off and on twos off, every recording plays the film it played before the lane — op for op, by digest', async () => {
  const { createHash } = await import('node:crypto');
  const all = createHash('sha256');
  let files = 0;
  let classicOps = 0;
  for (const file of fixtureFiles()) {
    const classic = opLog(file, false);
    files += 1;
    classicOps += classic.ops.length;
    for (const line of classic.digestLines) all.update(line);
    assert.equal(classic.comicOps, 0, `${file}: a comic effect was drawn with comic FX off`);
    assert.equal(classic.materialized, 0, `${file}: a figure materialised with comic FX off`);
    assert.equal(classic.shakes, 0, `${file}: an impact shake with comic FX off`);
  }
  assert.ok(files >= 18 && classicOps > 10000, `${String(files)} files, ${String(classicOps)} ops`);
  const digest = all.digest('hex');
  assert.deepEqual(
    { ops: classicOps, sha256: digest },
    PRE_LANE_FILM,
    'comic FX off + on twos off is no longer the pre-lane film op for op — if a CLASSIC cue changed on purpose, re-derive PRE_LANE_FILM and say why',
  );
});

test('motion: with comic FX on, the corpus plays the new vocabulary — and it all decays', () => {
  const words = new Set<string>();
  let comicOps = 0;
  let materialized = 0;
  let streaks = 0;
  let shakes = 0;
  for (const file of fixtureFiles()) {
    const comic = opLog(file, true);
    comicOps += comic.comicOps;
    materialized += comic.materialized;
    streaks += comic.streaks;
    shakes += comic.shakes;
    for (const word of comic.words) words.add(word);
  }
  console.log(
    `  comic FX over the corpus: ${String(comicOps)} ink/streak/lettered effect ops · ${String(streaks)} streak ops · ` +
      `${String(materialized)} materialise offsets · ${String(shakes)} impact-shake requests · words ${[...words].sort().join(', ')}`,
  );
  assert.ok(comicOps > 0 && streaks > 0 && materialized > 0 && shakes > 0);
  for (const word of words) assert.ok(isComicWord(word), `${word} is not on the closed list`);
  // POW is every lethal blow's default; the per-card words need their cards on the table.
  assert.ok(words.has('POW'), 'no POW in a whole corpus of lethal damage');
});

// ---------------------------------------------------------------------------
// D137 — a star never hides the body it is on (the lane's verification pass)
// ---------------------------------------------------------------------------

/**
 * **An attacker's own POW beside its head, a hit on its body's edge — from every
 * view, for every figure on the table.** The verification pass photographed Fury's
 * and Peggy's attack flourish covering the attacker's own head at the top of the
 * dash: hat, shield and patch gone on the headline beat. This drives the REAL cue
 * (`attack.lunge` with a row's `burst`, and `damage.lethal`) through a real
 * `SceneStage` into the REAL `EffectPool` — the lunge's offset and turn included —
 * over every figure of `g1.jsonl` at transport index 355 (report 15's budget frame)
 * and `g1`@359, from all five camera views, and projects the star's quad and the
 * head: the head's disc (0.09 of the body's height, about the hat's brim) must be
 * clear of an attacker's star, and a struck body's head CENTRE clear of its star.
 * The same effects with `aside` deleted are the negative control: centred, they
 * cover the head, which is the defect.
 */
test('motion: a star beside its body never covers its head — every figure, every view (D137)', async () => {
  const THREE = await import('three');
  const { EffectPool, POOL } = await import('../src/arena/scene/effects.ts');
  const { SceneStage } = await import('../src/arena/scene/SceneStage.ts');
  const { CAMERA, VIEWS } = await import('../src/arena/camera.ts');
  const { layout } = await import('../src/arena/layout.ts');
  const { figurePose } = await import('../src/arena/figures/pose.ts');
  const { validateFigures, validateModels } = await import('../src/arena/figures/validate.ts');
  const read = (rel: string): unknown => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
  const models = validateModels(read('../src/arena/figures/models.json')).data;
  const figures = validateFigures(read('../src/arena/figures/figures.json'), { modelIds: new Set(Object.keys(models.models)) }).data;

  const log = parseFrameLog(readFileSync(FIXTURES + 'games/g1.jsonl', 'utf8'));
  const boards: ClientState[] = [];
  let state = initialState(log.header);
  log.frames.forEach((frame, index) => {
    state = reduce(state, frame);
    if (index === 355 || index === 359) boards.push(state);
  });
  assert.equal(boards.length, 2);

  const W = 1600;
  const H = 1000;
  const v = new THREE.Vector3();
  const project = (camera: InstanceType<typeof THREE.PerspectiveCamera>, x: number, y: number, z: number): [number, number] => {
    v.set(x, y, z).project(camera);
    return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
  };
  const pool = new EffectPool();
  const glows = pool.group.children.slice(0, POOL.glow) as Array<InstanceType<typeof THREE.Mesh>>;
  const cases = [
    { cue: 'attack.lunge', params: { burst: 'pow' }, t: 0.45, attacker: true },
    { cue: 'attack.lunge', params: { burst: 'pow' }, t: 0.62, attacker: true },
    { cue: 'damage.lethal', params: { amount: 3 }, t: 0.3, attacker: false },
  ] as const;
  let checked = 0;
  let coveredWithout = 0;
  let without = 0;
  const failures: string[] = [];
  for (const board of boards) {
    const placed = layout(board);
    const poses = figurePose(placed, board.board?.combat ?? null, figures, { models });
    assert.ok(poses.size >= 8, `only ${String(poses.size)} figures`);
    const stage = new SceneStage(placed);
    for (const view of VIEWS) {
      const camera = new THREE.PerspectiveCamera(CAMERA.fov, W / H, CAMERA.near, CAMERA.far);
      camera.position.set(...view.pose.position);
      camera.lookAt(...view.pose.target);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      for (const [id, pose] of poses) {
        for (const c of cases) {
          const impl = REGISTRY.get(c.cue)!;
          const player = pose.seat === 'you' ? 0 : 1;
          const ctx = { id: c.cue, targets: [id], players: [player], params: { ...c.params }, ms: 850, key: `d137:${String(id)}`, reducedMotion: false, comic: true };
          for (const centred of [false, true]) {
            stage.clearAll();
            stage.beginFrame(placed);
            impl.apply(ctx, c.t, stage);
            const star = stage.effects.get(`${ctx.key}:bang`);
            assert.ok(star !== undefined && star.shape === 'burst', `${c.cue}: no star at t ${String(c.t)}`);
            assert.ok(star.aside !== undefined, `${c.cue}: its star is not placed beside the body`);
            if (centred) {
              // The negative control: the same star, centred as it was before D137.
              stage.effects.set(`${ctx.key}:bang`, { ...star, aside: undefined, clear: undefined, lift: undefined });
            }
            pool.setFigures(poses, stage, 0);
            pool.bind(stage.effects, stage.positionOf, camera);
            const mesh = glows.find((m) => m.visible);
            assert.ok(mesh !== undefined, 'the star took no glow slot');
            mesh.updateMatrixWorld(true);
            let x0 = Infinity;
            let x1 = -Infinity;
            let y0 = Infinity;
            let y1 = -Infinity;
            for (const [cx, cy] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]] as const) {
              const corner = new THREE.Vector3(cx, cy, 0).applyMatrix4(mesh.matrixWorld);
              const [sx, sy] = project(camera, corner.x, corner.y, corner.z);
              x0 = Math.min(x0, sx);
              x1 = Math.max(x1, sx);
              y0 = Math.min(y0, sy);
              y1 = Math.max(y1, sy);
            }
            // The head, where the cue's offset has carried the body (the lunge).
            const offset = stage.offsetOf(id);
            const height = pose.height * offset.scale;
            const hx = pose.position[0] + offset.dx;
            const hy = pose.position[1] + offset.dy + 0.9 * height;
            const hz = pose.position[2] + offset.dz;
            const [px, py] = project(camera, hx, hy, hz);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(0.09 * height);
            const [rx, ry] = project(camera, hx + right.x, hy + right.y, hz + right.z);
            const radius = c.attacker ? Math.hypot(rx - px, ry - py) : 0;
            // In FRONT of the body it is beside (a wide body hid a star at its own
            // depth — the ant from the side), without moving on the screen.
            if (!centred && mesh.position.distanceTo(camera.position) >= new THREE.Vector3(hx, hy, hz).distanceTo(camera.position)) {
              failures.push(`${view.id} ${c.cue}@${String(c.t)} card ${String(id)}: the star is not in front of the body`);
            }
            const dx = Math.max(x0 - px, 0, px - x1);
            const dy = Math.max(y0 - py, 0, py - y1);
            const clear = Math.hypot(dx, dy) > radius;
            if (centred) {
              without += 1;
              if (!clear) coveredWithout += 1;
            } else {
              checked += 1;
              if (!clear) failures.push(`${view.id} ${c.cue}@${String(c.t)} card ${String(id)}: head ${px.toFixed(0)},${py.toFixed(0)} r${radius.toFixed(1)} in star [${x0.toFixed(0)}–${x1.toFixed(0)}]×[${y0.toFixed(0)}–${y1.toFixed(0)}]`);
              // …and it goes toward the middle of the screen as seen from the card's
              // REST slot (ahead of a dash that crosses the middle), so a star beside
              // a body that is on the screen is on the screen too.
              if (px > 0.1 * W && px < 0.9 * W && (x0 < 0 || x1 > W)) {
                failures.push(`${view.id} ${c.cue}@${String(c.t)} card ${String(id)}: the star leaves the screen [${x0.toFixed(0)}–${x1.toFixed(0)}]`);
              }
            }
          }
        }
      }
    }
  }
  console.log(`  D137: ${String(checked)} stars beside their bodies, ${String(failures.length)} over a head · centred, ${String(coveredWithout)} of ${String(without)} covered it`);
  assert.deepEqual(failures.slice(0, 8), [], `${String(failures.length)} stars cover the head they are beside`);
  // The control has teeth: centred on the body, (nearly) every star covered the head.
  assert.ok(coveredWithout >= 0.9 * without, `the centred control covered only ${String(coveredWithout)} of ${String(without)} heads`);
});
