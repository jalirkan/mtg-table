# M7 Tier 2 — the manifestation stage: T0, T1, T2

*What was actually run, on 2026-09-13, in the worktree
`/home/justin-a/code/mtg-table-t2` on branch `tier2-slice1`, against
[`../research/13-arena-tier2-plan.md`](../research/13-arena-tier2-plan.md)'s
evenings **T0**, **T1** and **T2** (§11) and its sections §3, §8, §9 and §10.
Every number below is a measurement; every one that is a lower bound says so.*

The one-line version: **T0's gate passes with room** — 12 figures are 12 draw
calls, one material, one program and a frame body of 0.3 ms p50 — **T1's pose
layer resolves the whole corpus** (3,679 board frames, 11,901 poses, 26 distinct
creatures, 1,138 face-down instances all anonymous), and **T2 puts one humanoid,
one drone and one insect on the table** from a 126 kB CC0 library that a missing
file degrades to discs with no error.

---

## 0. What is new, in one list

| file | what it is |
|---|---|
| `web/src/arena/figures/types.ts` | `[NO three]` the vocabulary: `ClipName`, `Stance`, `FigureSpec`, `ModelEntry` |
| `web/src/arena/figures/resolve.ts` | `[NO three]` the ladder, `subtypesOf`, `SUBTYPE_ORDER` |
| `web/src/arena/figures/pose.ts` | `[NO three]` `figurePose(layout, combat, data)`, `MAX_FIGURES`, the disc radius |
| `web/src/arena/figures/validate.ts` | `[NO three]` closed key sets; drops the entry, never the file |
| `web/src/arena/figures/figures.json` | DATA — card name / archetype key → model, tint, scale, clip aliases |
| `web/src/arena/figures/models.json` | DATA — **generated** by `tools/build-figures.mjs`; paths, heights, bones, clips, licences |
| `web/src/arena/scene/discs.ts` | three — the stand disc as **one** `InstancedMesh` |
| `web/src/arena/scene/models.ts` | three — the loader, normalisation, `SkeletonUtils.clone`, meshopt, the fallback |
| `web/src/arena/scene/holoMaterial.ts` | three — the holographic `ShaderMaterial` (unlit, fresnel rim, tint uniform) |
| `web/src/arena/scene/figureRigs.ts` | three (types) — cardId → `{root, mixer, actions, material, pose}` |
| `web/src/arena/scene/FigureLayer.tsx` | three — mounts one `<Figure>` per pose; **no `useFrame`** |
| `web/t0-spike.html` | T0's go/no-go page, kept (not part of the app: `vite build`'s only input is `index.html`) |
| `tools/build-figures.mjs` | the offline pipeline; writes `figures.glb` **and** `models.json` |
| `tools/assets-manifest.json` | pack, version, URL, licence badge text, download date, sha256 |
| `web/test/figures.test.ts`, `web/test/figure-pose.test.ts` | the corpus sweeps |
| `web/public/models/figures.glb` | **BUILT**, 126,404 bytes, CC0 — see §7 and the commit question in §8 |

Changed: `layout.ts` (`FIGURE_STANDOFF`, `standPointOf`, `Placement.row`),
`CueRunner.tsx` (a fifth step), `Arena.tsx` (the layer and the data), `render/
labels.ts` (`isCreatureTypeLine`), `liveness.test.ts` (four new clauses),
`NOTICE` (a new §7), `web/package.json` (`@gltf-transform/cli`, dev).

---

## 1. T0 — the spike and the go/no-go

**Gate (§11):** *12 figures ≤ 12 draw calls, one material, frame body still
< 1 ms.* Named fallback if not: stylised billboards instead of meshes.

**Result: PASS, on all three archetypes, against the shipped library.**

`web/t0-spike.html` loads `/models/figures.glb` with `GLTFLoader` +
`MeshoptDecoder`, takes one archetype node, clones it N times with
`SkeletonUtils.clone`, scrubs one clip from a hand-driven `t`
(`action.time = t × duration; mixer.update(0)`), calls
`renderer.compile(scene, camera)` once, then samples 240 frames after the first
20. Headless Chromium, `--use-gl=swiftshader`, `--disable-gpu-vsync`, 1280×720,
dpr 1.

| n × archetype | draw calls | triangles | materials | geometries | programs | bones | frame body p50 / p95 |
|---|---:|---:|---:|---:|---:|---:|---|
| 12 × agent | **12** | 8,676 | **1** | **1** | **1** | 7 | **0.30 ms / 0.50 ms** |
| 12 × drone | **12** | 54,528 | 1 | 1 | 1 | 11 | 0.30 ms / 0.50 ms |
| 12 × insect | **12** | 36,480 | 1 | 1 | 1 | 9 | 0.30 ms / 0.50 ms |
| 21 × agent (the corpus ceiling) | **21** | 15,183 | 1 | 1 | 1 | 7 | 0.30 ms / 0.60 ms |

`max` in every run was a single 11.8–17.7 ms outlier in the first samples,
coinciding with SwiftShader's own `THREE.WebGLRenderer: Context Lost` /
`Context Restored` at start-up. It never recurs and it is not a steady-state
number.

**What the gate actually proves, and what it does not.** It proves the *shape* —
`SkeletonUtils.clone` shares geometry and material by reference, so N figures are
N draw calls and **one** program — and it proves the mixer mechanism: with a
**zero** delta, `AnimationAction._updateTime` returns `this.time` untouched, so
`mixer.update(0)` applies the bindings for whatever `t` the caller computed and
advances no clock of its own. It does **not** prove a frame *rate*: every number
here is SwiftShader, a software rasteriser and an explicit lower bound, exactly
as M7's were (report 13 §8.1, and M7 follow-up 2 is still open).

**The one number that is not the gate's:** `memory.textures` goes 13 → 23 between
12 and 21 figures. That is **one bone `DataTexture` per `SkinnedMesh`** plus the
shared colormap: `Skeleton.computeBoneTexture()` is per skeleton, and
`SkeletonUtils.clone` gives each figure its own. At 7–11 bones each they are
tiny, but they are a per-figure cost that the draw-call count does not show.

---

## 2. T1 — the pose layer, with no assets

### 2.1 Where a figure stands

`layout.ts` grew three exports and one field, and **not one coordinate moved
into `figures/`** (§1.1): `FIGURE_STANDOFF = 0.52`, `FIGURE_HEIGHT = 0.85`,
`seatSign(seat)`, `standPointOf(placement)`, and `Placement.row`.

```
standPointOf(p) = [ p.x, p.y, p.z − seatSign(p.seat) × 0.52 × (1 − 0.45 × p.row) ]
```

The row falloff is §3.1's, and it is the one geometric interaction Tier 2 has
with Tier 1's layout: `RANK_WRAP_Z` is **0.55** and the standoff is **0.52**, so
without it a figure in row 0 of a wrapped rank would stand on row 1's cards.
`figure-pose.test.ts` recomputes the stand point from the placement for all
11,901 poses and requires a match, which is what keeps the rule in `layout.ts`.

### 2.2 The ladder, over the whole corpus

`figures.test.ts`, `node --test`, no browser, no GPU, no `figures.glb`:
**26 distinct battlefield creatures across all eighteen recordings**, every one
resolved, none `undefined`, none naming a model `models.json` does not define.
The census it prints (frame-instances → model → rung):

```
   1859  (disc)   looser:creature/*      Garruk's Companion
   1193  agent    card                   Soldier Token
   1137  (disc)   looser:creature/*      (face-down)
    956  (disc)   looser:creature/*      Ainok Tracker
    929  drone    card                   Aerial Doombot
    783  agent    subtype:spy            Peggy Carter, Secret Agent
    605  insect   card                   Ant-Man's Air Force
    548  agent    subtype:scientist      Bold Biochemist
    519  (disc)   looser:creature/*      Thallid
    502  drone    subtype:robot          Robot Token
    473  insect   card                   Giant-Sized Flying Ant
    388  agent    subtype:hero           Wasp, Shrinking Savior
    337  agent    subtype:spy            Agent Phil Coulson
    282  (disc)   looser:creature/*      Battering Craghorn
    281  agent    subtype:spy            Quake, Agent of S.H.I.E.L.D.
    254  agent    subtype:hero           Hero Token
    169  agent    subtype:scientist      A.I.M. Scientists
    158  agent    card                   Agent 13, Sharon Carter
    115  (disc)   looser:creature/*      S.H.I.E.L.D. Helicarrier
    104  (disc)   looser:creature/*      Ashcloud Phoenix
     99  (disc)   looser:creature/*      Volcano Hellion
     80  agent    card                   Ant-Man, Reformed Rogue
     48  agent    subtype:spy            Agents of S.H.I.E.L.D.
     48  (disc)   looser:creature/*      Saproling Token
     33  agent    card                   Nick Fury, Spymaster
      1  (disc)   looser:creature/*      (face-down)
  by model: (disc)=5120 agent=4272 drone=1431 insect=1078
  archetype rungs never reached in the corpus: creature/subtype:insect,
    creature/subtype:soldier, creature/W, creature/U
```

That last line is the half of the census that matters on the day an entry is
added: **four declared rungs never fire**, and both reasons are benign —
`insect` and `soldier` are always shadowed by a per-card entry, and the colour
rungs are always shadowed by a subtype. They are kept as the fallback for a
creature the deck has not printed yet; if a fifth appears, the census will say
so.

It also matches report 13 §2's own census row for row, which is the check that
the ladder is reading the same corpus the plan was written against.

### 2.3 Hard rule 8, in a new shape (§1.4)

- `figureFor(redactedCard)` → the declared default, by an **explicit branch**
  before the per-card rung. Picking a distinctive mesh for a card is a statement
  about what that card is.
- **1,138 face-down battlefield card-instances**, every one anonymous. Their
  wire shape is `name: ""`, `types: "Creature"`, `manaCost: null`, so the
  per-card rung cannot match, the subtype rung has nothing to read and the
  archetype rung lands on `creature/*` → `{model: null}`. Asserted rather than
  trusted, which is what `layout.test.ts` does for `Placement.back`.
- A **redacted** battlefield permanent gets no figure at all: it has no type
  line, and drawing a creature for it would assert that it is one. Measured: the
  corpus has **0** of those on a battlefield, so it is a branch rather than a
  behaviour — and it is the branch that is wrong to leave implicit.

### 2.4 The pose, over 3,679 board frames

`figure-pose.test.ts`: **11,901 poses**, 6,781 with a model, 1,138 anonymous,
**max 21 figures in one frame** — report 13 §2's ceiling, reproduced.

```
stances: ready=5271 crouch=2986 sick=2710 attacking=866 blocking=68
```

Asserted for every pose of every frame: exactly one pose per battlefield
creature and nothing else posed; finite numbers; inside `TABLE_HALF_X/Z`; above
the table; a hex tint; a height in (0, 3); an opacity in (0, 1]; the stand point
equal to `standPointOf(placement)`; `interposesId` naming a card `state.combat`
says this one blocks, and never itself. Plus: `figurePose` run twice on 300
frames is byte-identical, which is §1.3's claim stated as a test.

**Two precedence decisions are in the tests because they are not obvious.**

- **An attacker is `attacking`, not `crouch`.** §3.9's table lists `tapped`
  first, but an attacking creature is almost always tapped, so a tapped-first
  rule puts every attacker on its knees at the moment it charges. Order:
  attacking → blocking → sick → crouch → ready.
- **A tapped card's figure keeps its slot and does not turn.** `layout.ts` turns
  the *card* by `TAP_ANGLE` in the table plane; a figure that inherited that
  would lie down sideways. Same fact, two vocabularies.

### 2.5 The disc

Every battlefield creature gets a glow disc at its stand point, tinted by colour
identity and sized by P/T (`DISC_MIN_RADIUS 0.20` → `DISC_MAX_RADIUS 0.44`, at
the average of power and toughness, `*` and absent both reading as the
smallest — the wire did not say how big it is).

It is **one `InstancedMesh`**, not N meshes and **not an `Effect`**:
`MAX_LIVE_EFFECTS = 8` caps blended *transients*, and there can be 21 discs, so
taking a slot per creature would starve the cue engine of its own budget (§4.4).
Measured in the browser: 21 discs on the table cost **one draw call**
(`human-sideboard-7.jsonl` frame 1181 rendered 46 calls / 132 triangles; 45
single quads = 90 triangles, plus one instanced call carrying 21 × 2 = 42).

---

## 3. T2 — the model loader and one humanoid

### 3.1 The pipeline, and the two things it had to invent

`tools/build-figures.mjs`, report 12 §5.7's command list in its order:
`prune → dedup → palette → join → weld → unlit → resample → merge → meshopt`,
with `inspect` and a hard assertion at the end.

```
agent — Mini Characters by Kenney (CC0-1.0)
  prune     character-male-a.glb (255.62 KB) → 186.58 KB   ← 20 unnamed clips go here
  dedup     186.58 KB → 144.42 KB
  palette   144.42 KB → 144.42 KB                          ← already one material
  join      2 primitives → 1 (skin-aware; `gltf-transform join` skips skins)
  weld      203.35 KB → 175.5 KB
  unlit / resample
  prune     175.63 KB → 82.18 KB                           ← --keep-attributes true
drone — Robot Enemy Flying by Quaternius (CC0-1.0)
  palette   254.43 KB → 287.01 KB                          ← 8 materials → 1 + a palette
  join      8 primitives → 1
  prune     539.9 KB → 277.36 KB
insect — Bee Enemy by Quaternius (CC0-1.0)
  palette   164.53 KB → 184.82 KB                          ← 6 materials → 1
  join      6 primitives → 1
  prune     337.36 KB → 171.44 KB
library
  merge     3 models → merged.glb (one scene)
  prune     530.26 KB → 530.26 KB
  meshopt   530.26 KB → 126.4 KB                           ← and NOTHING may follow it
  agent    1 primitive · 723 tris · 7 bones · height 0.671 · 12 clips
  drone    1 primitive · 4544 tris · 11 bones · height 0.764 · 5 clips
  insect   1 primitive · 3040 tris · 9 bones · height 1.871 · 4 clips
web/public/models/figures.glb: 126,404 bytes · 3 models · 3 primitives ·
8,307 triangles · 19 clips
```

`palette` *grows* the two Quaternius files, and that is the trade it exists to
make: eight vertex-coloured materials become one material plus a small palette
texture, which is 33 kB on disk and **seven fewer draw calls per figure**.

**`meshopt` is the last step and nothing may follow it.** A `prune` after it
rewrote the file without the extension and the library went straight back from
116,592 bytes to 260,104 — compression undone by a step that looked harmless,
and visible only in the byte count.

**Invention 1: the join is skin-aware, because the CLI's is not.**
`gltf-transform join` skips any node carrying a skin — `if (node.getSkin())
continue;` at `@gltf-transform/functions/dist/index.js:3511` in the installed
4.5.0 — so the eight primitives of the drone and the two of the Kenney character
would have stayed eight and two, i.e. eight and two draw calls per figure. The
build does the join itself with `joinPrimitives`, which is legal **only** when
every source primitive is bound to the same skeleton, and that is asserted
rather than hoped for: `JOINTS_0` indexes into the skin's joint list, so joining
across two different skins would give a figure whose head animated with its
legs' bones. (The Kenney character has two skins that happen to be identical; a
pack whose two skins differed would fail the build with a message saying so.)

**Invention 2: `prune --keep-attributes true` after `unlit`, and it cost an
afternoon.** `prune`'s default is to drop any vertex attribute the *material*
does not use, and `unlit` has just declared that these materials use no normals.
So the default stripped `NORMAL` from every figure — and **the runtime material
is not the file's material**: the holographic treatment is a fresnel shader and
fresnel is a dot product with the normal. `normalize(vec3(0))` is NaN; every
figure rendered as a **solid black silhouette**; the file still validated, still
loaded, still reported one primitive and 723 triangles. It was found by looking
at the screenshot, which is the only thing that could have found it.

Budget checks the build enforces itself: ≤ 4 MB on disk (it is 0.12 MB) and
≤ 30,000 triangles (it is 8,307).

### 3.2 `models.json` is generated, `assets-manifest.json` is written

The split is deliberate. `tools/assets-manifest.json` is the **hand-written**
half — pack, creator, version, page URL, download URL, bytes, sha256, download
date, licence, licence URL and **the licence badge text verbatim on the day** —
and `web/src/arena/figures/models.json` is the **measured** half, written by the
build from the file it just produced: node names, heights, bone counts, triangle
counts, and the clip names that really exist. A manifest that claimed a clip the
file does not have fails the build (`the manifest names clip "X" … and the file
has none`), and a model whose `rootMotion` is true fails validation, because a
clip that translates the root fights `figurePose ⊕ offset`, which owns position
(§3.4).

Clips are renamed `<modelId>_<clip>` at build time and everything unnamed is
dropped — the Kenney character ships 32 and the manifest names 12. The prefix is
also what keeps `models.json` free of an `Armature|` prefix: FBX2glTF writes
`"CharacterArmature|Attack"` (report 12 §2.4's measured trap), and the build
normalises on the substring after `|` while the validator **rejects** a manifest
that carries one.

### 3.3 The loader

`scene/models.ts` is `useCardTexture.ts` rewritten for meshes: a module-level
cache by path, a `resolved` map so a re-mount is instant, a `failed` set, and an
`invalidate()` because under `frameloop='demand'` a load is the one change React
does not cause.

- **`GLTFLoader` directly, never drei's `useGLTF`** — which suspends inside the
  canvas and defaults its DRACO decoder to
  `https://www.gstatic.com/draco/versioned/decoders/1.5.5/`. `liveness.test.ts`
  now asserts that no arena module names a CDN in code and that no model path
  in `models.json` has a scheme, a leading slash or a `..`.
- **`MeshoptDecoder` from the installed `three`** — 29 kB with its wasm embedded,
  no file to host (report 12 §5.2).
- **Normalise at load**: the three packs are 0.671, 0.764 and 1.871 units tall
  in their own units. Each clone is scaled to exactly one world unit, lifted so
  its lowest point is at y = 0, and turned so `facing` becomes +Z; the pose's
  `height` is then the scale. No amount of per-card fiddling in `figures.json`
  would have made two libraries agree.
- **`raycast` is cleared on every child of every clone** (§3.10 rule 2), so a
  figure can neither steal a click nor move one. `HitProxy` at `layout(state)`
  stays the only thing the raycaster sees, and `liveness.test.ts` asserts the
  line is still there.

### 3.4 The holographic material

The user's art direction, and also the cheapest option on report 13 §13's list:
**unlit** (the scene still has no lights at all), a fresnel rim in **view space**
(mixing a view-space normal with a world-space view vector is the classic
fresnel bug — the rim swims as the camera orbits), a tint uniform, and static
scanlines that are a function of the model's own Y rather than of a clock, so
**nothing in it can wake `frameloop='demand'`**.

Measured in the browser at `g1.jsonl` frame 355: **11 figures, 11 material
instances, and the scene has 9 programs in total** — the figure library's
program is used 11 times. One program, eleven tints.

`#include <colorspace_fragment>` is the one non-obvious line: three's built-in
shaders end with it and a custom `ShaderMaterial` gets nothing for free, so
without it every tint is wrong in the same direction the card textures were
before `useCardTexture.ts` started setting `colorSpace` by hand.

### 3.5 What a figure takes from an offset, and what it refuses

`applyFigures` is §1.1's equation with one term deliberately dropped:

```
figure.position = pose.position ⊕ (offset.dx, offset.dy + bob, offset.dz)
figure.rotation = (0, pose.facingY, 0)          ← offset.dRotZ is NOT applied
figure.scale    = pose.height × offset.scale
uOpacity        = pose.opacity × offset.opacity × (1 − offset.dissolve)
uTint           = pose.tint                      ← re-parsed only when it changes
mixer.update(0)
```

**`dRotZ` is the card's vocabulary, not the figure's.** `layout.ts` turns a
tapped card by `TAP_ANGLE` in the table plane and `tap.rotate` animates that
turn (`registry.ts:238`), so a figure that inherited it would pirouette every
time its creature tapped — and a figure that inherited the *resting* tap would
lie down sideways. §3.9's rule is that a tap is a **stance**, which is T3's clip
lane. The `presence` bob **is** applied, because that is the card's own motion
and a figure standing on a hovering Helicarrier should hover with it.

`uTint` is re-parsed only when the string changes (`FigureRig.appliedTint`):
`THREE.Color.set('#f6f0d8')` runs a regex, and the frame loop would do it once
per figure per frame for a value that changes about once a game — the same
discipline as `SceneStage`'s pooled `Offset` (§9.2 rule 6).

### 3.6 One `useFrame`, still

`CueRunner.tsx` gained a fourth step — `applyFigures(figureRigs, stage, now)`
and `discs.bind(figures, stage, seconds)` — and the arena still has exactly one
frame loop. `liveness.test.ts` now asserts the list of files containing
`useFrame(` is exactly `['Arena.tsx', 'scene/CueRunner.tsx']` (the first is the
DPR governor, §9.2 rule 7's documented exception).

The trap avoided is measured, not hypothetical: drei's `useAnimations` **is**
`useFrame((state, delta) => mixer.update(delta))`, one per creature, and it
would also give every mixer a wall clock of its own — which loses pause,
0.5×–4×, skip, the live budget and `prefers-reduced-motion` in one move, because
all of those are properties of the cue queue's *virtual* clock.

---

## 4. In the browser, on port 5180

Vite dev server on `127.0.0.1:5180`, headless Chromium with SwiftShader, 1600 ×
1000, the replay slider driven through the native value setter so React's
`onChange` sees it, `queue.skipAll()` to land every cue, then twelve real frames
driven through `@react-three/fiber`'s own `advance()` — the M7 technique,
because the frame loop parks on `demand` the moment the queue drains.

### 4.1 `human-sideboard-7.jsonl`, the most crowded frame — and the finding in it

Frame **1181** (the start of a 59-frame plateau) holds **41 permanents and 21
creatures**, which is the corpus ceiling report 13 §2 measures.

> **Every one of those 21 creatures draws a disc and none of them draws a
> model**, and that is correct rather than broken: `human-sideboard-7` plays
> `decks/sideboard-probe.dck`, and its creatures are Garruk's Companion, Ainok
> Tracker and Battering Craghorn — `creature/G`, `creature/R`, no recognised
> subtype, so the ladder lands on `creature/*` → the declared disc. **The
> busiest board in the corpus is the one with no figures in it.**

| | measured |
|---|---:|
| draw calls | **46** |
| triangles | 132 |
| poses | 21 |
| poses with a model | **0** |
| discs drawn | **21** (one instanced call) |
| skinned meshes | 0 |
| programs | 4 |

Screenshot (`var/shots/t2-sideboard-1181.png`): two wrapped ranks of five and
six green-ringed cards per seat, each ring sitting just off the front edge of
its card, the back row's rings tucked behind the front row's cards by the row
falloff. The board reads exactly as the 2D one does — which is T1's "shippable
stopping point" in a picture.

**So the benchmark frame report 13 §8.4 asks for — "≥ 10 figures" — is not this
one.** The frame with the most *figures* is `g1.jsonl` frame 355, and the whole
corpus's model-bearing maximum, measured across all eighteen recordings, is
**12 figures / 11 models** there. Six other fixtures reach 10–11. T7's bench
should use `g1@355`, not `human-sideboard-7`.

### 4.2 `g1.jsonl` frame 355 — the deck in play, 12 figures

| | measured |
|---|---:|
| draw calls | **59** |
| triangles | 21,851 |
| geometries | 4 (the shared quad + three models) |
| textures | 59 |
| programs | **9** — the figure program used **11** times |
| skinned meshes | 11 |
| figure material instances | 11 |
| discs drawn | 12 |

What is standing where (read out of `window.__mtgArena.figures`, which is the
DEV-only handle this slice adds to):

```
  id  model   seat stance     rung                 tint     card
  24  insect  you  sick       card                 #9ec7f0  Giant-Sized Flying Ant
  25  drone   you  crouch     card                 #9ec7f0  Aerial Doombot
  28  agent   you  crouch     subtype:hero         #f2d98c  Wasp, Shrinking Savior
  98  drone   you  crouch     subtype:robot        #9fb4c8  Robot Token
 107  agent   you  ready      card                 #cfd6de  Soldier Token
 108  agent   you  ready      card                 #cfd6de  Soldier Token
  44  agent   opp  ready      subtype:spy          #f6f0d8  Peggy Carter, Secret Agent
  65  drone   opp  ready      card                 #9ec7f0  Aerial Doombot
  69  disc    opp  ready      looser:creature/*    #c6ccd6  S.H.I.E.L.D. Helicarrier
  91  agent   opp  crouch     card                 #cfd6de  Soldier Token
 102  agent   opp  crouch     subtype:hero         #f2d98c  Hero Token
 103  agent   opp  crouch     subtype:hero         #f2d98c  Hero Token
```

Four things in that table are the design working:

1. **Both Aerial Doombots stand at `y = 0.24`.** That is `cues.json`'s existing
   `presence` hover, folded into `placement.position.y` by `applyPresence` and
   inherited by the figure through `standPointOf` — §3.1's "it inherits
   `presence` for free", with no line of new code.
2. **The Giant-Sized Flying Ant is 1.147 units tall** — `FIGURE_HEIGHT 0.85 ×
   the card's own `scale: 1.35`. It is also `sick`, so it is drawn at opacity
   0.72.
3. **The Helicarrier takes the disc**, because there is no `carrier` model yet
   (T10) and `figures.json` deliberately declares no `creature/subtype:vehicle`
   rung. The ladder falling through is the feature.
4. **Three rungs are visible at once** — a per-card entry, a subtype and the
   loose fallback — which is the ladder doing what §3.7 says rather than what a
   single table would.

**Screenshot** (`var/shots/t2-g1-355.png`): the 3D table from the rest camera,
with eleven translucent holographic figures standing in a rank in front of their
cards on both sides of the table — **pale-gold humanoids** for Wasp and the two
Hero tokens, **white-grey ones** for the three Soldier tokens and Peggy, a
**pale-blue insect** at the left of the viewer's rank (dimmer than the rest: it
is summoning-sick, so it is drawn at opacity 0.72), and **three drones**, of
which the two Aerial Doombots float a clear quarter-unit above the table on
their `presence` hover. Each figure has a soft tinted ring at its feet;
the card behind it stays fully readable, which is what the 0.52 standoff is for.
The opponent's figures face the viewer; the viewer's face away. The fresnel rim
picks out each silhouette against the dark table without a single light in the
scene.

**And the honest part of the picture: the figures are wide.** The Kenney Mini
character's bounding box is 0.767 × 0.671 in its own units — a ratio of 1.14,
because it is a chibi — so normalising by *height* to 0.85 gives a figure
**0.97 units wide**, against a creature-rank pitch of `CARD_W + 0.08 = 0.796`.
Neighbouring figures therefore overlap by about 0.18 units, and a crowded rank
reads as a row of shoulders. `FIGURE_HEIGHT` is report 13 §3.1's number and is
left at it; **the fix belongs to T7's tuning pass**, and the two candidates are a
smaller `FIGURE_HEIGHT` or normalising by width against the rank pitch.

### 4.3 The missing-file fallback, proved by removing the file

`web/public/models/figures.glb` moved aside, same frame, same probe:

```
[console.info] [arena] figures: no model library (…) — every creature draws its disc
libraryLoaded: null · libraryFailed: true · poses: 12 · skinned meshes: 0
discs drawn: 12 · draw calls: 48 · triangles: 118 · page errors: none
```

Twelve tinted rings, a complete and readable board, one `console.info`, and not
one error. The *pose* layer is unchanged — it still says eleven of those
creatures want a model — and only the renderer notices there is none, which is
§9.4's rule and is what lets a fresh checkout with no binaries at all play the
whole film.

### 4.4 The 2D board is unchanged

`/?replay=games/g1.jsonl` with no arena flag, scrubbed to the same frame 355:
**38 card tiles, 38 of them carrying `data-card-name`, no `<canvas>`, no console
errors**, every rail, the phase strip, the stack panel and the log drawer in
place (`var/shots/t2-board2d-355.png`). The stronger evidence is the suite:
`render.test.tsx` renders **every frame of all eighteen fixtures, twice each**,
and it is green.

---

## 5. The gates

```
npm --prefix web run build   → tsc --noEmit clean; vite build in 2.2 s
  dist/assets/index-*.js    275.14 kB │ gzip:  85.63 kB    ← the 2D entry chunk
  dist/assets/Arena-*.js  1,090.00 kB │ gzip: 303.10 kB    ← the lazy arena chunk
npm --prefix web test        → node --test 559 pass / 0 fail
                             → vitest 79 pass / 0 fail (5 files)
```

Against M7's own final measurement (`m7-arena.md` §V: entry **275.07 kB /
85.62 kB gzip**, arena **996.38 kB / 274.30 kB gzip**):

| | M7 Tier 1 | this slice | delta |
|---|---:|---:|---:|
| 2D entry chunk, gzip | 85.62 kB | **85.63 kB** | **+0.01 kB** |
| arena chunk, gzip | 274.30 kB | **303.10 kB** | +28.80 kB |

**+0.01 kB gzip on the 2D path**, which is D49 holding: `GLTFLoader`,
`SkeletonUtils` and the meshopt decoder are 28.8 kB gzip and every byte of them
is inside the lazy arena chunk. The 126 kB `figures.glb` is not in either — it
is a static file fetched on demand, like the card art.

`node --test` went 534 → 559: `figures.test.ts` (10), `figure-pose.test.ts` (11)
and four new `liveness` clauses. No existing test was changed except
`liveness.test.ts`, which gained a shared comment-stripper — its scans are greps,
and the files they read now *document the traps they guard*, so a grep that
could not tell a warning from a call would make writing the warning down a test
failure.

Not run, and deliberately: `tools/arena-bench.mjs` (M7 follow-up 10 keeps it out
of the gate; T7 is the evening that runs it) and `./tools/check-all.sh` (nothing
in this slice touches `bridge/`, the protocol or a fixture).

---

## 6. Deviations from report 13, and why

1. **`web/t0-spike.html` is a file the plan does not name.** T0's measurement had
   to live somewhere; it adds no dependency, is not reachable from the app, and
   `vite build`'s only input is `index.html`, so it never reaches `dist/`.
2. **The disc is drawn for every creature, not only for the ones with no model.**
   §9.4 describes it as the fallback. It is also the figure's footprint — the
   thing that ties a figure standing 0.52 units away back to its card — and it
   costs **one** draw call for the whole table, so it is always on. When no model
   resolves, it is the whole figure, exactly as §9.4 says.
3. **`figures.json` has no `swarm` key and no `creature/subtype:vehicle` rung.**
   Report 13 §3.7's file has both. `swarm` is T9's and a key nothing reads is a
   key that lies; the vehicle rung would have to name a `carrier` model that does
   not exist, and the validator drops a spec naming an unknown model precisely so
   that it falls through to the disc rather than to a figure that can never load.
   Both are recorded in `tools/assets-manifest.json`'s `_deferred` block.
4. **`FigurePose` carries no `attachments` array.** §3.8's interface has one;
   attachments are T5, and an always-empty field would be the same lie.
5. **`figures/` gained `validate.ts` in T1 rather than later**, because
   `figures.json` is validated *against* `models.json` and the two arrived
   together.
6. **`render/labels.ts` gained `isCreatureTypeLine`.** The pose layer needs "is
   this a creature" and M4 convention 6 is that there is one definition of such a
   predicate in the app — the same reason `layout.ts` uses that file's
   `isLandTypeLine` rather than its own.
7. **`@gltf-transform/cli` is a `web/` dev dependency**, where report 12 §9.3
   says it is "a build-box tool, not a dependency — nothing new enters
   `web/package.json`". The slice's own brief allows it, and pinning it there is
   what makes `tools/build-figures.mjs` reproducible offline instead of depending
   on whatever `npx` resolves on the day; `createRequire(web/package.json)` is
   how a script in `tools/` reaches it. The cost is real and worth stating: it is
   **167 packages** in `web/node_modules`, none of them shipped — no runtime
   import touches `@gltf-transform/*`, and `npm run build`'s output is unchanged
   by its presence.
8. **`Placement` gained a `row` field.** §3.1's standoff falloff needs the
   wrapped-rank row, and deriving it from `renderOrder` would have been an
   implicit coupling between two files.

---

## 7. Licences, and what was downloaded

Three files, all CC0, all recorded in `tools/assets-manifest.json` with pack,
version, page URL, download URL, byte count, sha256, download date, licence,
licence URL and **the badge text verbatim on the day**:

| source | file | bytes | sha256 (head) | badge, read 2026-09-13 |
|---|---|---:|---|---|
| [Kenney — Mini Characters 1.0](https://kenney.nl/assets/mini-characters) | `kenney_mini-characters.zip` | 2,403,059 | `9e1d48e6…` | "License · Creative Commons CC0" — and `License.txt` inside the zip says it again |
| [Quaternius — Robot Enemy Flying (Poly Pizza)](https://poly.pizza/m/lF3jeRJwiH) | `…3e2d-43a6….glb` | 298,324 | `7e3a2753…` | "Aug 28, 2022 • FBX /GLTF format • Public Domain (CC0)" |
| [Quaternius — Bee Enemy (Poly Pizza)](https://poly.pizza/m/6HsU6GQt3a) | `…125b-41f5….glb` | 193,200 | `29a3ac29…` | "Dec 21, 2021 • FBX /GLTF format • Public Domain (CC0)" |

All three byte counts match report 12's independent measurements exactly, which
is a small but real check that the file that arrived is the file that was
surveyed.

The archives themselves are **not** committed: they live under
`var/assets/figures/` (`var/` is gitignored) and `tools/build-figures.mjs --src`
points at them. `NOTICE` §7 is the attribution, and it records the badge text and
the date for the reason report 12 §0.2 gives: **Quaternius published a
non-redistributable licence on 2026-08-28** and has begun moving packs onto it,
and that licence's §7 says the version in force when you obtained the asset
governs. The badge is the only evidence that survives the page changing.

Nothing here is derived from card art, nothing here is from Mixamo, and no
AI-generated mesh was made or used.

---

## 8. Still open, and named

- **Bloom** (`@react-three/postprocessing` 2.19.1) is **not taken in this
  slice.** It is a full-screen pass and the decision the user attached to it —
  "default ON if the bench stays within budget on this machine" — needs the
  bench, which is T7's evening. Nothing here forecloses it.
- **Idle breathing is off**, which is report 13 §8.3 rule 1's default and T2's
  own "static `idle`" row: every figure holds frame 0 of its idle clip and the
  frame loop still parks on `demand`. The middle path the user chose — breathe
  only while something else is animating — is a property of the **clip lane**,
  which is T3.
- **The clip lane itself is T3.** `Stage.setClip`/`clearClip`, the arbitration
  order, `CLIP_FOR` and `params.clip` are not built; `models.json` already
  carries the clip maps they will read, and `FigurePose.clips` already carries
  the per-card aliases.
- **Three archetypes, not six.** `hero` and `scientist` are the agent mesh in
  their own tints (T8); `carrier` does not exist (T10). The `_deferred` block in
  `tools/assets-manifest.json` says so per model.
- **The figure width finding in §4.2** is real and unfixed, and T7 is where it
  belongs.
- **Every performance number here is SwiftShader.** M7 follow-up 2 — a
  measurement on the actual GPU — is still open, and report 13 §13's third
  question still needs the user's own machine.
- **Whether to commit `web/public/models/figures.glb`** (126,404 bytes) is the
  user's call. It is CC0 and therefore committable; `models.json` records
  `committable: true` per model and the badge text behind it. The alternative is
  the `art.json` treatment — gitignore it, keep `tools/build-figures.mjs` as the
  way to regenerate it, and let a fresh checkout draw discs. **Nothing in the
  code depends on which is chosen**, which was the point of §9.4.

---
---

# M7 Tier 2 — the clip lane and the terrain: T3, T4

*What was actually run, on 2026-09-26, in the same worktree on branch
`tier2-slice1`, against report 13's evenings **T3** and **T4** (§11) and its
sections §3.3–§3.6 (the clip lane), §5 (lands), §5.4 and §6.2 (the motes and the
casting anchor). Every number below is a measurement; every one that is a lower
bound says so.*

The one-line version: **the clip lane is a fifth transient that decays exactly
like an offset** — the decay assertion now reads `stage.clips` over all 3,293
batches and the mixer is never given a non-zero delta anywhere in the tree —
**the terrain is three instanced slabs and one rim**, so 20 lands cost **one**
draw call and a 17-land, two-kind, three-dual board costs **three**, and **the
mana mote is the only new primitive**: it travels between two anchors the engine
named, from a land that tapped to the casting anchor of the player who owns it.

---

## 9. What is new, in one list

| file | what it is |
|---|---|
| `web/src/arena/figures/clips.ts` | `[NO three]` `CLIP_FOR`, `CLIP_PRIORITY`, `chooseClip`/`clipBeats`, `clipEnvelope`, `REST_CLIP_FOR`, `BREATHING_STANCES` |
| `web/src/arena/figures/tiles.ts` | `[NO three]` the land ladder, `landSubtypesOf`, `tilePose(layout, data)`, `MAX_TILES` |
| `web/src/arena/figures/casting.ts` | `[NO three]` `manaMotes(board, seatOf)`, `spellForms(board, seatOf, colourOf)` |
| `web/src/arena/scene/tiles.ts` | three — `TileField`: three `InstancedMesh` kinds + one rim, and **the one new shader** |
| `web/src/arena/scene/casting.ts` | three — `CastingField`: the floating mana and the placeholder spell form, two instanced meshes |
| `web/test/clips.test.ts` | 14 tests — the table, the arbitration over every permutation, the envelope, the alias ladder |
| `web/test/tiles.test.ts` | 7 tests — the terrain and the casting anchor over all eighteen recordings |

Changed: `cues/stage.ts` (the `setClip`/`clearClip` lane, `CueContext.id`, the
`mote` effect kind and its own budget, the `casting` anchor), `cues/registry.ts`
(the `cue()` builder drives the lane; `land.tap`, `land.untap`, `cast.rise`'s
spend ring), `cues/resolve.ts` (a `tap` cue carries the card's controller),
`cues/queue.ts` (one line: the cue tells its ctx its own id), `cues/cues.json`
(the five land entries), `scene/SceneStage.ts` (the lane, pooled),
`scene/CueRunner.tsx` (the fifth step, and `dt`), `scene/figureRigs.ts`
(`rest`/`clip`/`restTime`, `actionFor`), `scene/FigureLayer.tsx` (the rig
registration split in two), `scene/effects.ts` (the `mote` primitive),
`figures/types.ts` + `figures/validate.ts` + `figures/figures.json` (the `lands`
block), `layout.ts` (the `casting` anchor), `Arena.tsx` (the two fields and the
dev handle), `liveness.test.ts` (three new clauses),
`replay-cues.test.ts` + `cues-exhaustive.test.ts` (the clip decay assertion).

---

## 10. T3 — the clip lane

### 10.1 The mechanism, and the one line it rests on

`CueRunner.driveClips` writes `action.time = t × duration`, sets the weight, and
calls `mixer.update(0)`. Report 13 §3.4's claim about three 0.186 is why that is
a scrub and not an advance, and it is now **mechanical rather than remembered**:

```
liveness: every mixer tick is a ZERO delta, and only two files tick one
```

The scan finds every `mixer.update(…)` in `web/src/arena/`, asserts the argument
is the literal `0`, and asserts the owning files are exactly
`scene/CueRunner.tsx` and `scene/FigureLayer.tsx`. **Negative-controlled**:
changing the runner's call to `mixer.update(dt)` turns it red and nothing else
in the suite notices (583 pass → 582 pass / 1 fail, and the failure names the
file and the argument). A second clause asserts that only those two files write
`action.time` at all, because a second writer is a second clock.

### 10.2 Decay — the assertion that says the lane was built on the right side of §1.1

`replay-cues.test.ts`'s sweep gained one assertion per batch:

```ts
assert.equal(stage.clips.size, 0, `${file}: … clips survived the batch`);
```

It passes over all **3,293 batches of all eighteen recordings**, and
`cues-exhaustive.test.ts` gained the unit-level version — every one of the
registry's **57** cues is applied at `t ∈ {0, 0.13, 0.5, 0.87, 1}` and then
ended, and `stage.clips` must be empty after. The two together are what makes
"skip, scrub backwards, `resync` and a new `gameId` are one call" true for poses
as well as for positions.

`clips.test.ts` adds the piece the sweep cannot see: for every cue with a
`CLIP_FOR` entry, `apply(ctx, 1, stage)` must already have **weight 0** before
`end()` runs — i.e. the figure is standing at its stance *before* the lane is
released, so a skipped cue does not snap.

### 10.3 A defect the test double found, and the real stage hid

The first arbitration was "highest priority wins; ties by weight". It is wrong,
and `SceneStage` cannot show it: `beginFrame` empties the clip map every frame,
so there is never an incumbent from a previous frame. `NullStage` has no frames —
`queue.advance()` just re-applies the cue — so the incumbent from `t = 0.5`
(weight 1) **refused** the same cue's own request at `t = 1` (weight 0), and the
figure froze at the first weight it ever saw. The decay assertion still passed,
because `end()` deletes the entry.

The fix is a `key` on `ClipRequest` — `CueContext.key`, unique per running cue —
and the rule *same key replaces, different keys arbitrate*.
`clips.test.ts`'s `a cue replaces its own request, whatever the weight` is the
control for it. **A test double that drifts from the real stage is worth
nothing**, which is why the arbitration is one function (`clipBeats`) that both
stages call.

### 10.4 The table, measured

```
CLIP_FOR: 23 of registry's 57 cues drive a clip
          (attack, block, channel, die, grow, hit, shrink, summon)
  summon  ← fx.agents, fx.flyIn, fx.swarm, zone.enters
  attack  ← attack.aegis, attack.jet, attack.lunge
  hit     ← damage.hit, damage.lethal
  die     ← sacrifice.crush, zone.dissolve, zone.exile
```

Report 13 §3.5's payoff is the number: the table is keyed on the **cue id**, so
`cues.json`'s existing 28 cards and 7 archetypes light up figures **with no edit
to `cues.json` at all**. Ant-Man's `attackers:alone → attack.shrink` gets
`shrink` and Peggy's `attack.aegis` gets `attack` from the same event kind, which
is exactly what keying on the kind could not do.

Clip coverage per model, printed every run — and the **absences are deliberate**,
so §3.6 rung 3 has live data rather than a claim:

```
agent     has attack, block, channel, die, grow, hit, shrink, summon
drone     has attack, die, summon  · MISSING block, channel, grow, hit, shrink
insect    has attack, die, hit     · MISSING block, channel, grow, shrink, summon
```

### 10.5 In the browser: the attack, with the per-card alias

`?replay=games/g1.jsonl#arena`, paused queue, `queue.advance(330)` at transport
index **342** (g1's `attackers` event for the Doombot and an agent). Read off the
live rigs:

```
25:attacking  rest=drone_Shoot(0.93)              clip=drone_Shoot(0.93)              t=0.037
28:attacking  rest=agent_attack-melee-right(1.00) clip=agent_attack-melee-right(1.00) t=0.083
stage.clips  28:attack@t0.20w1.00   25:attack@t0.15w0.93
65 draw calls · 24,083 triangles
```

Three things are visible in that one readout and each is a separate claim:

1. **`action.time` is the cue's `t`.** `t = 0.20` of `attack.lunge` against a
   0.417 s clip is `action.time = 0.083`. Pause the queue and the figure hangs
   mid-lunge; there is no second clock to disagree.
2. **The per-card alias works end to end.** Card 25 is the Aerial Doombot, whose
   `figures.json` entry is `"clips": { "attack": "jet" }`, and `jet` is
   `models.json`'s `drone_Shoot`. No cue id was added and `cues.json` was not
   touched.
3. **`rest` and `clip` are the same action here, and that is the design.**
   `REST_CLIP_FOR.attacking` is `attack`, so when the 850 ms lunge ends the
   figure *keeps* its lean for as long as `card.attacking` is on the wire —
   `card.attacking` is a snapshot field and the lunge is an event, so the stance
   is the pose and the lunge is the cue (§1.3).

The photograph at that moment shows the gold Wasp lunging a full card-length into
the combat lane with its card under it, the Doombot mid-`drone_Shoot` with its
exhaust burst, and two Soldier Tokens still standing in their idles behind.

### 10.6 Summon, hit, and the die clip that has nowhere to play

| beat | index | what the lane says |
|---|---|---|
| summon | 340 | `24:summon@t0.05w0.30` — the envelope fading in |
| attack | 342 | above |
| hit | 298 | `97:hit@t0.35w1.00`, plus the damage number |
| block | 296 | `97:block@t0.40w1.00`, `28:block@t0.33w1.00` |
| die | 73 | `80:die@t0.50w1.00` — **and `figureRigs.size === 0`** |

**The `die` clip is requested and, in eighteen recordings, never has a modelled
body to play on.** That is a measurement, not a guess, and it is the most
interesting thing T3 found:

```
zone battlefield>graveyard   32 events   2 with the card still on a battlefield
sacrificed                    5 events   0
zone battlefield>exile        8 events   0
damage on a creature         44 events  19 with the creature still on a battlefield
attackers                   111 batches every attacker id still on a battlefield
zone *>battlefield          504 events 183 naming a creature on that battlefield
```

The snapshot that carries a `zone → graveyard` event **already has the creature
in the graveyard**, so `figurePose` — which is a pure function of that snapshot —
correctly gives it no figure. The two exceptions corpus-wide are both in
`disjoint.jsonl` and both are face-down creatures, i.e. the anonymous disc.

This is not a bug to fix in a renderer: giving the figure a life of its own past
the frame that says it is gone would be the renderer remembering something the
engine did not say, which is the one thing report 13 §12 names as the class of
error a figure makes louder. **What carries the death instead is measured and
real**: `damage:lethal → damage.lethal → hit` fires on a live body 19 times out
of 44, and the card's own dissolve shader plays either way. A death *collapse*
would need the engine to say "this creature is dying" one frame earlier than it
does, and it does not.

### 10.7 Idle breathing — user decision 7, and it costs nothing

`REST_CLIP_FOR` maps the stance to the resting clip and `rig.restTime` advances
**only while `queue.idle` is false**, which `CueRunner` passes as `awake`.
`BREATHING_STANCES` is `{ready, sick}` — a creature mid-charge is not idling — and
`restTime` is *held* rather than reset when the queue empties, so a figure does
not snap back to frame 0 of its idle the moment the last cue ends. The frame loop
is already awake whenever this runs, so `frameloop='demand'` keeps its measured
zero idle frames (§1.5).

`clips.test.ts` asserts the stance table is total over `STANCES`, that a tapped
creature rests in `crouch` (it does **not** rotate with its card), and that no
combat stance breathes.

### 10.8 One rig, not one per frame — a defect T3 introduced and fixed

`FigureLayer`'s rig registration had `pose` in its effect deps. A `FigurePose` is
a new object every frame the state changes (P5), and **React runs the cleanup
first**, so a single effect that registered on mount and deleted on cleanup
deleted and rebuilt the rig about once a second — resetting `rest`, `clip` and
`restTime`, i.e. every figure re-`play()`ing its idle from frame 0 whenever
anything on the table changed. It is now two effects: one keyed on
`pose.cardId` (stable — it is half the component's `key`) that registers and
unregisters, and one keyed on `pose` that assigns the field. The lane's state
belongs to the figure, which outlives the frame.

---

## 11. T4 — lands as terrain

### 11.1 Three tile kinds, not §5.2's five, and the measurement behind it

The corpus has six land names and **five** type lines:

```
Basic Land - Island    9,511      Basic Land - Plains   5,560
Basic Land - Mountain  8,309      Basic Land - Forest   3,718
Land                   2,291   ← BOTH Thriving lands, and no subtype at all
```

That last row is why the per-name rung comes first. The tile census over all
3,679 board frames, printed every run:

```
3679 board frames · 29389 tile-instances · max 21 in one frame
14224 tapped (pose, not cue) · 2291 two-tone (a rim instance)
  land               tile      rung                 instances
    Island           water     subtype:island       9511
    Mountain         slab      subtype:mountain     8309
    Plains           plateau   subtype:plains       5560
    Forest           slab      subtype:forest       3718
    Thriving Isle    water     card                 1796
    Thriving Heath   plateau   card                 495
```

A `tile` kind is a **geometry-and-material family**, and the difference between a
crag and a grove is a *tint*, which is per-instance and free. §5.2's table gives
Mountain and Forest their own kinds; both are probe-deck lands ("the fallback
proves itself" is that table's own note on them), and a fourth and fifth
`InstancedMesh` would be a fourth and fifth draw call for two lands that are not
in the deck this is for.

### 11.2 The draw calls, measured in the browser

| frame | lands | tile buckets drawn | terrain draw calls | scene total |
|---|---:|---|---:|---:|
| `g1.jsonl` @ transport 356 | 17 | plateau 8 · water 9 · rim 3 | **3** | 62 calls · 24,331 tris |
| `human-sideboard-7.jsonl` @ 1194 | 20 | slab 20 | **1** | 48 calls · 2,614 tris |

An `InstancedMesh` whose `count` is 0 costs **no** draw call
(`WebGLBufferRenderer.renderInstances` returns early on `primcount === 0`), which
is why the busiest land board in the corpus — twenty Forests, one kind — is one
call and the deck in play is three. The worst case the design can reach is
**4**: all three kinds present plus a two-tone rim. `tiles.test.ts` prints that
arithmetic every run and asserts it stays at "a handful".

Tier 1's baseline at g1's frame 355 was 59 calls / 21,851 triangles (T2, §4.2),
so **T4's terrain costs 3 draw calls and 2,480 triangles for 17 tiles** — about
146 triangles a tile, which is one bevelled rounded rectangle.

### 11.3 Two geometry defects, both found by looking

Both were invisible to the whole test suite and both were photographed:

1. **The tiles were under the table.** §5.1 writes the tile as `y ∈ [−0.06,
   +0.004]`, and the first build read that as a drop from the *card's* y. The
   land anchor is `y = 0.006`, so dropping 0.055 from it put the entire tile at
   `−0.049` — beneath the table quad at `y = 0`. Seventeen tiles rendered, in
   three draw calls, and the board looked **exactly like T2's**: 62 calls,
   24,331 triangles, and not one pixel of terrain. The fix is that the top face
   is measured from the **table** and is a constant (`TILE_TOP_Y = 0.0035`) —
   terrain does not stack, so a wrapped rank lifts its cards and leaves its tiles
   on the ground.
2. **`ExtrudeGeometry`'s bevel is not inside `depth`.** `bevelThickness` extends
   the extrusion beyond `depth` at *both* ends, so a "0.06 tall" slab with a
   0.021 bevel is 0.102 tall and its top is 0.021 above where
   `translate(0, -depth, 0)` puts it. That is 2.1 cm of world in a game whose
   card sits 6 mm off the table: **the tiles drew over every land on the board** —
   seventeen rounded rectangles where the Plains and Islands should be. The fix is
   to ask the bounding box rather than to compute it.

A third, of the same family and already documented in this tree: **a disposed
field must rebuild itself.** `effects.ts` carries a comment about
`<StrictMode>` disposing the pool the re-mounted tree then uses; `TileField` hit
it verbatim (`tileField.counts()` returned `{}` and the scene was T2's 59 calls),
and `CastingField` would have. Both now rebuild in `bind`, which is the pattern
that file established.

### 11.4 Tapped is a pose; the untap is a cue

`TilePose.tapped` comes off `Placement.tapped`, i.e. off `card.tapped` in the
snapshot, and `tiles.test.ts` asserts that for **every one of the 29,389
tile-instances** — a tile and its card can never disagree about being spent. That
is the whole of "a scrub shows the right lands spent, with no cue history": the
14,224 tapped instances above were counted by scrubbing, not by playing.

The transitions are `land.tap` (the ripple, the quarter-turn back, a glow on the
card, **and the mote**) and `land.untap` (an **inward** ring and a smaller glow —
deliberately the quietest cue in the file, because untaps arrive as a whole row
at the start of every turn). Neither cue knows a tile exists: the terrain reads
`offset.glow` off the *card*, which is the one field the cue lane already writes.

Both new cue ids fire over the whole corpus — `replay-cues.test.ts`'s census,
which is the standing proof that a cue file entry is not decorative:

```
tap   1952 events  1952 cued   fx.shockwave, land.tap, land.untap, tap.rotate
  Island · tap:on         → land.tap    ×227      Island · tap:off   → land.untap ×206
  Plains · tap:on         → land.tap    ×136      Plains · tap:off   → land.untap ×124
  Thriving Isle · tap:on  → land.tap     ×26      …tap:off           → land.untap  ×39
  Thriving Heath · tap:on → land.tap      ×6      …tap:off           → land.untap  ×10
  land/* (archetype rung) → land.tap    ×367                         → land.untap ×318
```

762 land taps and 697 untaps, every one of them through the ladder's own
decision that the card is a land.

In the browser at g1 transport index 72, three lands tapping: the three cards
turn, a white ripple expands on each, and their tiles dim to 0.42 — photographed
beside the untapped Plains and Islands of the same rank, which stay bright.

### 11.5 The mana motes — user decision 9, and the measurement that shaped them

**`PlayerState.manaPool` is non-zero in 47 of 3,679 board frames (1.3%), and its
largest total anywhere is 2.**

```
manaPool is non-zero in 47 of 3679 board frames (1.3%), max 2 motes
   · by pip {"W":62,"U":4,"R":5}
```

Forge's AI taps and spends inside one engine step, so a snapshot almost never
catches mana standing in a pool. That is report 13 §4.1's aura finding read the
other way round — *28 `attach` events against 985 frames showing an attachment* —
and it decides the design the same way:

- **the flight is a CUE.** `land.tap` emits a `mote` that rises from the tapped
  tile and drifts to **that land's controller's** casting anchor. Both ends are
  facts the engine stated: a `tap` event names the card, and `card.controller` is
  protocol §3.3's own field. The `TapEvent` carries no player at all, so
  `cues/resolve.ts` now reads the controller off the **snapshot subject** — one
  line, and every other cue keyed on `tap` ignores it.
- **the standing pool is a POSE**, read from `manaPool` and nothing else. Rare,
  but correct through a skip, a backwards scrub and a `resync`.
- **the consumption is neither.** When a spell is cast the pool empties, so the
  motes are gone because the snapshot says they are gone. `cast.rise` adds an
  inward ring at the caster's own casting anchor — the *beat* — and claims
  nothing about which mana paid for what.

§5.4's alternative, a literal land→spell beam, is a **declared heuristic** that
its own measurement disqualifies: only **234 of 414** casts share a batch with a
land `tap`, so 43.5% of spells would show nothing at all.

Measured in flight at g1 transport index 72, `queue.advance(180)`:

```
fx  ring, mote@0.78, ring, mote@0.57, ring, mote@0.36
    from [-0.796, 0.006, 3.4] / [0.796, …] / [0, …]   →  to [1.9, 0.75, 3.6]
6 of the pool's 38 primitives visible · 31 draw calls
```

Three motes, staggered by the step's own 40 ms, arcing from three tapped lands to
the one casting anchor of the seat that owns them, and arriving *at* it — the
`travel` term reaches 1 before `t` does, so a mote is at the anchor for a moment
rather than winking out in flight. The photograph shows two of them as bright
soft dots mid-arc with the third still inside the ripple ring.

**`mote` is the only new primitive Tier 2 adds**, and it is the only one that
interpolates between two anchors — a beam is a line and a mote is a thing that
arrives. It has its own budget (`MAX_LIVE_MOTES = 12`) for the reason report 13
§4.4 gives pose overlays one: the eight-slot cap bounds *overdraw* and was sized
against full-size blended quads, and a five-land mana ability emits five ripples
**and** five motes in one step — 10 of 8, so without a second bucket the feature
would have capped itself out on the day it shipped.

### 11.6 The casting anchor and the placeholder spell form

`layout.ts` gains one anchor (`{x: 1.9, y: 0.75, z: ±3.6}` — above the seat's own
land rank, inboard of the library, clear of the stack column at `+4.8` and the
pile column at `−4.8`) and `AnchorRef` one case. `ownSideOf` extends to it, so a
cue may say `{kind:'casting', player: null}` and mean *this card's own side*,
exactly as it already can for a zone.

T4 needed something at that anchor for the motes to arrive at, so
`figures/casting.ts` emits one form per stack item at its controller's anchor, in
the source card's colour identity. **It is explicitly a placeholder**: §6.2's five
shapes (a dart, a sigil, a ring, a tumbling component, the caster's own ghosted
figure) are T6's evening and are deliberately not guessed at; the `kind` field is
where they will land. Over the corpus it draws **417 form-instances across 389
stack frames, max depth 4**, and it skips a stack item whose `controller` is
`null` rather than guessing a seat (the corpus has none).

One visual note, because it was photographed twice: an octahedron in a scene with
**no lights** is one flat colour on every face, so it reads as its silhouette — a
white square. It now carries a vertical ramp in **vertex colours**, which
multiplies into the instance colour and costs no light, no second material and no
extra draw call. It reads as a shard.

---

## 12. The gates

```
npx tsc --noEmit                         clean
npm --prefix web run build               clean — 2D entry chunk 85.64 kB gzip
                                         (T1's documented 85.62; still no three in it)
npm --prefix web test                    583 node --test + 79 vitest · 0 fail
```

583 is T2's 559 plus T3's 14 (`clips.test.ts`), T4's 7 (`tiles.test.ts`) and
three new `liveness` clauses. The arena chunk is 308.67 kB gzip, +0.21 kB over
the same build before T3/T4 — the clip lane and the terrain are arithmetic and
two small shaders' worth of strings.

Not run, deliberately: `tools/arena-bench.mjs` (T7's, and out of the gate by
design) and `./tools/check-all.sh` (the eleven-minute JVM gate; nothing in this
slice touches `bridge/`).

---

## 13. How the browser evidence was taken

The Claude browser pane still never animates — report 09's finding stands — but
**headless Chromium has the same problem for a different reason**, and it is
worth writing down: `queue.advance(ms)` moves the *virtual* clock and does not
ask for a repaint, so with `frameloop` settled on `demand` the scene keeps
showing the frame before. Measured: `pool.bind` was called **0 times** in the
400 ms after an `advance()`, and one stale ring from an older frame was the only
visible primitive while `stage.effects` held six. Every photograph above was
therefore taken by pumping `@react-three/fiber`'s own `advance()` — imported from
the app's **pre-bundled** instance (`/node_modules/.vite/deps/@react-three_fiber.js`;
a second copy has its own root registry and advances nothing) — four frames after
each `queue.advance()`. The M7 lesson generalises: **in a pane or in headless,
read state through a real frame or not at all.**

The driver was a throwaway CDP script in the session scratchpad (not in `tools/`):
Chromium `--headless=new --use-gl=swiftshader`, `Emulation.setDeviceMetricsOverride`
at 1600×1000, `Page.captureScreenshot` with a `clip` for the close-ups. Snap's
confinement refuses `kill` on the browser even from its own parent, so it is
closed with CDP's `Browser.close`; nothing was left running (`ss -ltn` shows no
listener on 5180 or 9224 afterwards).

One caveat on the readouts above: the **dev handle's `figures` and `tiles` maps
are a React value and are sometimes one commit behind** the frame loop when read
immediately after a scrub — `figureRigs.size`, `tileField.counts()` and
`gl.info.render` are written by the frame loop itself and are the numbers quoted
here.

---

## 14. Deviations from report 13, and why

1. **Three tile kinds, not five** (§11.1). A kind is a geometry-and-material
   family; crag and grove are tints. Costs 2 draw calls less and loses nothing in
   this deck.
2. **The tile footprint is the rank pitch, not the card.** `CARD_W + 0.075`
   against a pitch of `CARD_W + 0.08` leaves a 5 mm gutter, so a row of lands
   reads as a **paved strip** rather than as six coasters. §5.1's `+0.10` margin
   would have overlapped.
3. **`ClipRequest` lives in `figures/clips.ts`, not in `cues/stage.ts`** (§3.3
   puts it in the latter). `CLIP_NAMES` was already in `figures/types.ts` from
   T1, and one vocabulary in one place beat one file matching the report.
   `cues/stage.ts` imports the type and `clipBeats`.
4. **`ClipRequest` carries a `key`** that §3.3's shape does not have — §10.3 is
   the whole argument.
5. **The clip lane is driven by the `cue()` builder, not by each cue's `apply`.**
   §3.5 says "the registry reads `params.clip` in the shared helper"; doing it in
   the builder makes it total by construction, exactly as `end()` already is, so
   a cue can neither forget its clip nor grow one it has no entry for.
6. **A `tap` cue now carries the card's controller.** §5.4 needs it and the event
   does not have it; `card.controller` is a snapshot field, so this is the engine's
   answer rather than a renderer's guess.
7. **`mote` is a seventh `Effect` kind with its own cap**, where §12.1 says Tier 1
   has six "and no others". §11.5 is the argument; the cap is §4.4's precedent.
8. **The mana motes are a cue first and a pose second**, where §5.4 writes the
   pose (`manaPool`) as the primary reading. The 1.3% measurement is why.
9. **The spell form exists in T4**, which §11 assigns to T6. The motes have to
   arrive somewhere. It is one shape with a `kind` field and no per-type table.
10. **`land.tap` / `land.untap` are new cue ids** replacing `fx.ripple` on the
    five land entries in `cues.json`. `fx.ripple` is unchanged and is still what a
    tapping *creature* would get; the rename is where the ladder's decision "this
    is a land" is recorded, which is the only place a cue is allowed to know it.

---

## 15. Still open, and named

- **Every performance number here is SwiftShader**, as in §5 and §8. M7 follow-up
  2 and report 13 §13 question 3 are still open; T7 is where the bench belongs.
- **Bloom was still not taken.** The user's decision attaches it to a bench
  result and the bench is T7's.
- **The figures are still wider than their rank slot** (T2's §4.2 finding). The
  attack photograph shows two Soldier Tokens shoulder to shoulder. T7's tuning
  pass.
- **The `die` clip has nowhere to play** (§10.6). It is measured, it is not a
  renderer bug, and a fix would need something the wire does not say.
- **The stack is T6.** Tethers, the five forms, the strike, the fizzle, the
  combat freeze and the ghosted creature are all unbuilt; only the placeholder and
  the anchor exist.
- **Auras are T5.** `attach` still animates only the card; §4's manifestation,
  the `hostScale` product and the default halo are not built.
- **`docs/protocol.md`, `CLAUDE.md`, `PLAN.md` and `DECISIONS.md` carry no Tier 2
  entry** — report 13's T14 is the pass that writes them, and §14 above is the
  list of deviations that would have to land there.

---
---

# M7 Tier 2 — the aura, the stack and the measurement: T5, T6, T7

*What was actually run, on 2026-09-26 and 27, in the same worktree on branch
`tier2-slice1`, against report 13's evenings **T5**, **T6** and **T7** (§11) and
its sections §4 (auras), §6 (the stack), §7 (duelists) and §8 (performance).
Every number below is a measurement; every one that is a lower bound says so,
and every one that is not SwiftShader says which GPU drew it.*

**This pass resumed an interrupted one.** A previous session started T5–T7 and
stopped part-way when its sign-in expired. It left code that built and passed
(601 `node --test` + 79 vitest), but no evidence, no recorded bench, and a comment
in `main.tsx` quoting bloom numbers ("p95 30.4 ms against 14.1") that nothing in
the tree or the logs produced and that this machine does not reproduce (§19.3).
§16 is what was kept and what was changed.

The one-line version: **an aura is a pose** (every one of the corpus's 985
attachment frames shows it, and a scrub lands on it), **a spell on the stack is a
form at its caster's side with a tether to what it targets, and it strikes that
target** (aimed from the frame before the resolution: 41 of the corpus's 412
resolutions), **the combat freeze holds the battlefield's clips and never the
spell**, and **headless Chromium reaches this machine's GeForce GTX 1080**, where
the ≥ 10-figure table costs p95 0.4 ms a frame and bloom adds 0.7 ms. So bloom is
**on by default** (user decision 6's condition, met), and the DPR governor drops it
on a machine that cannot afford it: under SwiftShader bloom is p95 82 ms.

---

## 16. What the interrupted attempt left, and what this pass changed

**Kept, after reading every line:** `figures/attach.ts` (the attachment ladder
and `MAX_POSE_OVERLAYS`), `figures/casting.ts`'s `spellForms` / `formKindFor` /
`combatFreeze`, `figures/duelists.ts`, `figures/pose.ts`'s attachments, ghost and
width clamp, `scene/overlays.ts`, `scene/casting.ts`, `scene/busts.ts`,
`scene/Post.tsx`, the `attach.test.ts` / `stack.test.ts` sweeps, four liveness
clauses and `arena-bench.mjs`'s `--figures` / `--bloom` / `--reduced-motion` /
`--dpr`.

**Changed, each one found by reading the spec against the code or by looking:**

| # | what was wrong | what it is now |
|---|---|---|
| 1 | The ghosted creature spell **froze with the battlefield**. §6.4: the freeze "must not freeze the spell form", and §6.2 says the ghost *is* the form. | `frozen: frozen && !ghost` in `figurePose`; asserted over every stack frame of the corpus. |
| 2 | **The strike never reached a target.** `resolved.pop` discharged at the caster's anchor only, on the argument that the target is not derivable without history. | The planner is handed the **previous frame's board** and reads the resolving item's first target from it (§18.2). 41 aimed strikes over the corpus, against 7 from the same frame. |
| 3 | **The fizzle did not drop.** A ring closed at the anchor. | The form greys, falls straight down to `{kind:'casting', ground:true}` (a new named place, resolved by `layout.ts`) and a dull ring marks the table. The mote gained an `arc` field so a fall does not hop first. |
| 4 | **Tethers ended at the target's card.** §6.3: "to the target's figure". | A card target with a figure is aimed at its chest; anything else at `layout.ts`'s anchor. |
| 5 | **Reduced motion did not collapse clips.** | `playClip` / `clipOn` write nothing under `prefers-reduced-motion`; the figure holds the stance `figurePose` derived. Asserted over every cue in the registry. |
| 6 | **The busts reacted to nothing.** §7's whole case for them is "a body for `damage:player` and `life.tick` to play on — a flinch, a red rim". | `bustReactionInto` reads the live effects anchored at that player; the bust recoils, grows 7% and takes the hit's colour for exactly as long as the cue. |
| 7 | **Bloom had only a URL flag.** Decision 6 asks for a toggle. | A checkbox in the cue controls (no new layer widget, no keymap row); the URL sets where it starts. |
| 8 | **Allocation in the frame loop.** A template string per frozen figure per frame; `Color.set('#…')` (two regexes and their match arrays) per instance per frame in five pose layers and the effect pool; an anchor literal per tether per frame. | `FigureRig.appliedFrozen`; `scene/colourCache.ts`'s `parsedColour`; two pooled anchor refs. |
| 9 | **Four things that read wrong in a photograph** (§17–§19): a ring form seen edge-on is a white sliver; a colourless halo's chest glow was a white blob over the opponent's card art; the hovering Doombot's halo was a hoop **1.93 units across** (read off the instance matrix); the viewer's bust dominated the bottom-left. | The ring faces the rest camera and forms are about 1.5× larger (0.32 × 0.48, from 0.20 × 0.34); the glow is half the figure's height at a lower boost; the halo ring is `clamp(radius × 1.5, 0.18, 0.5)`; busts are 1.22 × 1.55. |
| 10 | **Quantum Reduction's shrink never animated in an AI game.** Its `fx.collapse` is on `cast`, and `queue.ts`'s rule 5 drops a `cast` whose card arrives on the battlefield in the same batch — which is how Forge's AI plays (g1 frame 93). | `attach.snap` reads `params.hostClip` (a clip name from the closed set) and `params.collapse`; `cues.json`'s Quantum Reduction `attach:on` sets `shrink` and a ring that closes into the host. Data, not a new cue id. |
| 11 | Two dead exports (`FALLBACK_MANIFESTATION`, `EMPTY_ATTACH_DATA`). | Removed. |
| 12 | **A lazy shader compile mid-game under bloom** (§19.4). | `EffectPool.prime()` and `prime()` on the three fields that park their meshes: one frame at mount, and again when the composer mounts. |
| 13 | Bloom default was `false` on unrecorded numbers. | `true`, on this machine's measurement (§19.3), with a governor rung below the floor that turns it off. |

Files: **new** `web/src/arena/scene/colourCache.ts`; **changed in this pass**
`Arena.tsx`, `perf.ts`, `layout.ts`, `main.tsx`, `cues/{defaults,queue,registry,resolve,stage}.ts`,
`cues/cues.json`, `figures/{attach,duelists,pose,types}.ts`,
`scene/{CueRunner.tsx,FigureLayer.tsx,Post.tsx,busts.ts,casting.ts,discs.ts,effects.ts,figureRigs.ts,overlays.ts}`,
`web/test/{attach,stack,liveness,replay-cues}.test.ts` and `tools/arena-bench.mjs`
(`--index`, `--gpu`, `--no-bloom`, the renderer line and the program count).

---

## 17. T5 — the aura, as a pose

### 17.1 Over the corpus

`attach.test.ts`, `node --test`, all eighteen recordings:

```
3679 board frames · 985 with an attachment · 2030 manifestations · max 4 in one frame
28 `attach` EVENTS in the whole corpus — 35.2× more frames than events
944 shrink · 771 metallic (an Equipment)
  attaching card            kind     rung                 instances
    Quantum Reduction        shrink   card                   944
    Super Suit               halo     subtype:equipment      409
    S.H.I.E.L.D. Spy Kit     halo     subtype:equipment      362
    Robotics Mastery         halo     subtype:aura           315
```

Every manifestation is derived from `card.attachedToId` in the frame on screen, so
the test that scrubs to each of the 985 frames and finds the aura there is the same
test as "survives `skip all`, a backwards scrub and a `resync`".

### 17.2 In the browser — `g1.jsonl`, frames 93 → 94 and 139 → 140

Headless Chromium, SwiftShader, 1600 × 1000, the cue queue paused and stepped by
its own virtual clock, then four frames pumped through the app's own fiber
`advance()` (§13's technique). Read off the live rigs:

```
93  Peggy Carter (44)  figure 0.630 tall · no attachment
94  (+1320 ms, paused) clip agent_crouch @ t 0.61 · pose 0.383 tall · attach [shrink] · a ring closing
94  (skip all)         0.383 tall · attach [shrink] · 1 overlay ring
139                    0.383 tall · [shrink]
140 (+460 ms, paused)  clip agent_interact-right (channel) @ t 0.52 · attach [shrink, halo:metal]
140 (skip all)         0.383 tall · [shrink, halo:metal] · 2 rings, 1 chest glow
```

`var/shots/t5-qr-strip.png` is before / mid-snap / after for Quantum Reduction:
Peggy's white holographic agent standing full height in front of her card; then the
Aura's card flying onto her with a purple ring closing on a crouching, already
smaller figure; then the Aura parked beside her card and the figure at 0.45×, a
faint blue ring at its feet. `var/shots/t5-suit-strip.png` is the Super Suit
equip: the same shrunk figure, then a second, harder ring and a small chest glow
(the metallic halo), with her card pulled forward.

`0.383` is `0.85 × 0.45` — `FIGURE_HEIGHT × hostScale` — and it holds through
the snap and after it, because the snap is a cue and the height is the pose.

---

## 18. T6 — the stack

### 18.1 The forms, over the corpus

`stack.test.ts`:

```
389 frames with a stack · 417 form-instances · max depth 4
44 tethers (44 card, 0 player) in 42 frames · 0 whose target this viewer cannot place
form     instances   source type lines
  figure     242     Creature · … (every creature line in the corpus)
  dart        49     Instant
  sigil       20     Sorcery
  ring        54     Enchantment · Enchantment - Aura
  shard       52     Artifact - Equipment · Artifact - Vehicle
  orb          0     (never fires)
242 creature forms · 128 ghosts standing at an anchor · 43 with a model
a stack during combat in 66 of 3679 board frames (1.8%)
412 resolutions · 41 strikes aimed from the previous frame (41 at a card, 0 at a player, 21 at a foe)
```

### 18.2 The strike, and where its aim comes from

`ResolvedEvent` is `{cardId, fizzled}`: no stack id, no targets, and the item has
left `state.stack` by the frame that carries it. The first draft concluded the
strike could not be aimed. Measured over the corpus:

```
412 resolved events
333 have their item on the PREVIOUS frame's stack   (the SAME frame: 31)
 41 of those carry a target                          (the SAME frame: 7)
 79 have no previous item — triggers that went on and off inside one engine step
```

An event batch **is** the transition from the previous frame to this one, and the
previous frame said, in ids, "this spell is on top of the stack and it targets
that". So `Arena.tsx`'s intake keeps the board it last saw, `enqueueBatch` passes
it to the planner, and `cuesFor`'s `resolved` case reads the **last** stack entry
with that source (the stack is bottom-first, protocol §3.3), carrying
`strikeCard` / `strikePlayer` (numbers, which the redaction net passes because a
number cannot be a name) and `strikeFoe`. A flush passes no previous frame, and
then there is no aim, which is the snap a flush already is. It is one frame of
look-behind, used once, and nothing outlives the cue built from it.

The 79 untargeted resolutions discharge into their own card, as before: an
untargeted spell has nothing to strike, so this is not the 56.5%-coverage
inconsistency report 13 §5.4 refused for the mana beam.

**In the browser, `g1.jsonl` 266 → 267** (Robotics Mastery aimed at Wasp, card 28),
the paused queue stepped 20 ms at a time:

```
266  layers: tethers 1 · ring 1 · frozen 1 · 48 draw calls · 4 figures (all washed)
267  +180…660 ms   28: channel (attach.snap — the Aura lands on its host first)
     +960 ms       bolt leaves the anchor (travel 0.01), beam flares
     +1100 ms      travel 0.41 · +1180 ms travel 0.77
     +1200 ms      impact ring + burst at 28 · 28: channel @ t 0.02 w 0.12
     +1240…1380 ms 28: channel w 1.00 · 52 draw calls at the peak
```

`var/shots/t6-266-full.png` shows the ring form (blue, facing the camera) at the
viewer's casting anchor above the land rank, with a thin tether running to the
chest of Wasp's crouched gold figure, and every figure on the table in the grey
freeze wash (it is combat damage with a stack). `t6-267-bolt-zoom.png` shows the
bolt as a bright orb halfway along the tether; `t6-267-impact-zoom.png` shows
Wasp's card flashing white inside the impact ring, with her new blue halo already
on (it is a pose).

Two honest notes. **Engine order puts `attach` before `resolved`** in that batch,
so the Aura snaps on and *then* the bolt flies; the planner keeps engine order by
design (it "never sorts"), so this is reported rather than reordered. And **the
struck figure's `channel` shows `action.time 0.000`** at 267, because the stack
still holds Robotics Mastery's own trigger: the freeze is holding the battlefield's
clips, as §6.4 specifies.

### 18.3 The fizzle — synthetic, because the corpus has none

**0 of 412 `resolved` events carry `fizzled: true`.** The evidence is therefore a
hand-built event, `{kind:'resolved', cardId:39, fizzled:true}`, enqueued at g1 266
through the DEV handle (which gained `state` for exactly this):

```
t ≈ 0.2   grey glow at the form (strength 0.84) · the drop starting
t ≈ 0.55  drop travel 0.20, straight down (arc 0)
t ≈ 0.8   drop travel 0.73 · a grey ring on the table under the anchor
```

`var/shots/t6-fizzle-grid.png`, four panels: the ring form; the form flaring grey;
the drop under it; the dull ring on the land tile below. In a real fizzle the item
has left the stack and the form is already gone, so only the grey beats show; the
synthetic event leaves the item in the snapshot, which is why the form is still
there in these photographs.

### 18.4 The ghost solidifies — the same object

`g1.jsonl` 339 → 340, the Giant-Sized Flying Ant (24) cast and resolved:

```
339  ghost  (1.90, 0.75, 3.60)  opacity 0.40  0.470 tall  ready   same Object3D: true
340  solid (-1.99, 0.01, 1.78)  opacity 0.72  0.470 tall  sick    same Object3D: true  · summon requested
```

185 of the corpus's 191 creature spells keep their card id onto the battlefield,
so the `<Figure>` keyed by card and model stays mounted and **is** the thing that
arrives — §6.2's "it solidifies when it resolves", with no transition code. (The
insect's `summon` is one of its deliberate absences, so §3.6 rung 3 applies: the
card's arrival cue plays and the figure holds.)

### 18.5 The combat freeze

`g2.jsonl` 217 → 218: attackers declared and a spell on the stack, 10 modelled
figures, `frozen: 1`. Sampled every 120 ms of virtual time while the batch plays:

```
+240 ms  64 attacking  Bite_Front @ 0.000  z -0.93      ← clip selected, time held
+360 ms  64            Bite_Front @ 0.000  z -0.52      ← the lunge OFFSET still moves it
+720 ms  42 attack-melee-right @ 0.000 · 63 Front @ 0.000 · 91 Attack @ 0.000
every resting figure: rest time held (0.000 / 0.142 / 0.018) for the whole batch
```

and, for contrast, `g1.jsonl` 324 → 325, the same kind of batch with no stack:
the resting figures' breath advances 0.722 → 0.829 → 0.950 → 1.061 in the same
four steps. `var/shots/t6-g2-218-freeze.png`: ten grey-washed figures, one
opponent insect half-way across the table on its lunge offset, and an opponent's
tether reaching into the viewer's rank. The ghost is exempt, and `stack.test.ts`
asserts `frozen === !ghost` over every stack frame with the freeze forced on.

---

## 19. T7 — busts, bloom, and the measurement

### 19.1 The busts

One `InstancedMesh` for both seats: **one draw call**, where §7 budgets two. The
flinch, read off the instance buffers at g1 265 → 266 while `damage.player` (−6 to
the viewer) is live:

```
at rest   viewer bust colour (0.10, 0.23, 0.19) · z 4.80
flinch    viewer bust colour (0.34, 0.22, 0.18) · z 4.92      plate strength 0.64
```

`var/shots/t7-bust-pair.png`: the teal head-and-shoulders outline, then the same
outline gone salmon-red under the red plate and the "−6". Busts are never in the
camera solver's required set; the near one is partly out of frame by design.

### 19.2 The bench, on two rasterisers

**T7 found that headless Chromium can reach this machine's GPU.** `--use-angle=gl`
(with `--ignore-gpu-blocklist --enable-gpu`) reports
`ANGLE (NVIDIA Corporation, NVIDIA GeForce GTX 1080/PCIe/SSE2, OpenGL 4.5.0)`,
and Vulkan works too. `tools/arena-bench.mjs --gpu gl` is the new option; the
report now prints WebGL's unmasked renderer, so every number says what drew it.
SwiftShader stays the default, as the lower bound.

Frame: **`g1.jsonl` transport index 316** (`--index 316`), the first of the 61
consecutive frames (316–376) that carry ≥ 10 modelled figures, played at 4× from
there so the whole sample stays on a crowded board (11 figures, 17 tiles, 2 busts
at the end). 1920 × 993, `--disable-gpu-vsync --disable-frame-rate-limit`. The
production build, `vite preview` on 5182. The desktop was not idle (the user's
Firefox and the Claude desktop app, load average ~8 on 16 cores), so every
SwiftShader configuration that decides something (warm, cold, reduced motion) was run at least twice.

| rasteriser | configuration | render dpr | p50 | p95 | max | draw calls | verdict |
|---|---|---:|---:|---:|---:|---:|---|
| SwiftShader | warm, bloom off (×4) | 0.6 | 13.3–14.4 | **16.2–17.2** | 33.7–35.9 | 66 | **PASS** |
| SwiftShader | cold (`--settle 600`), bloom off (×2) | 0.6 | 13.5–13.6 | 17.6 / 30.8 | 78.2 / 65.0 | 65 | FAIL (max; see §19.5) |
| SwiftShader | warm, reduced motion (×2) | 0.6 | 13.3–13.4 | 17.1–17.2 | 34.4–34.7 | 66 | PASS |
| SwiftShader | warm, pinned `?dpr=1` | 1.0 | 25.9 | 29.1 | 43.5 | 66 | FAIL (as Tier 1 did: 22.4–23.6) |
| SwiftShader | warm, bloom on | 0.6 | 54.7 | **82.3** | 102.1 | — | FAIL (4× over) |
| SwiftShader | warm, bloom on, `?dpr=1` | 1.0 | 99.7 | 116.6 | 135.4 | — | FAIL |
| **GTX 1080** | warm, bloom off (×3) | 1.0 | 0.2–0.3 | **0.4** | 17.7–17.8 | 64 | **PASS** |
| **GTX 1080** | warm, bloom on, after priming (×4) | 1.0 | 0.3 | **1.1** | 18.1–19.3 | — | **PASS** |
| **GTX 1080** | cold, bloom on, after priming | 1.0 | 0.3 | 1.0 | 18.2 | — | **PASS** |

(With bloom on, `gl.info.render` counts only the composer's last pass — `calls: 1`
— so draw calls are read with it off. On the GPU the rAF interval is the main
thread's pace, not the GPU's: `--disable-frame-rate-limit` lets it run at
~3,300 frames a second and the GPU keeps up, which is itself the finding.)

Against report 13 §8.2's budget: **64–66 draw calls** at 11 figures (budget
≤ 90), **21,305–24,351 triangles** (≤ 30,000), **11 programs** with bloom off and
25 with it on (≤ 14 is the budget for the scene; the bloom passes and the
render-target variants are the difference, and they are paid once at mount).

**T7's gate — p95 ≤ 20 ms at the governor's chosen rung with ≥ 10 figures under
SwiftShader — passes**, at the governor's floor rung (0.6), four runs out of four.
It is worth saying that the rung is the floor: Tier 1 settled on 0.75 at 40 draw
calls, and Tier 2's 66 push the software rasteriser down a step.

### 19.3 Bloom: on by default, because the GTX 1080 says so

User decision 6: "default ON if the bench stays within budget on this machine
(GeForce GTX 1080 present; the sandbox bench uses SwiftShader as a lower bound),
else default off with a toggle". On the GTX 1080, bloom costs **p95 1.1 ms against
0.4 ms without it**, inside §9.4's gate on every run after §19.4's fix. So
`perf.ts`'s `BLOOM_DEFAULT` is `true`, and the unverified comment in `main.tsx` is
replaced with these numbers.

Under SwiftShader bloom fails by four times at the governor's own floor, so the
default comes with two safety nets:

- **the checkbox** in the cue controls, and `?bloom=0`;
- **a rung below the floor**: when the DPR governor wants to step down and is
  already at 0.6, `onFloor` turns bloom off (once per cooldown) and logs one
  `console.info`. Measured under SwiftShader with the default: 39–41 frames over
  50 ms while the ladder walks down, **the last at frame 46**, then bloom is gone
  (draw calls back to 64, programs 25 → 22). A 15-second sample containing that
  transition reads p95 32.4 ms, because the governor then oscillates between 0.6
  and 0.75; the steady state is the bloom-off row above.

The composer is fetched only when bloom is first on: `Post.tsx`,
`@react-three_postprocessing.js` and `postprocessing.js` appear in the resource
list only after the box is ticked, and a new liveness clause
(**negative-controlled**: a static import of `Post.tsx` turns it red) keeps it
that way.

`var/shots/t7-bloom-pair.png` (g1 frame 355, SwiftShader): with bloom on, the
holographic rims, the white card edges and the halos carry a soft glow; the card
art is not washed, because the threshold (0.62) sits above the table and the paint.

### 19.4 The one long frame, and why priming fixed it

Before the fix, every GTX 1080 bloom run had **exactly one** frame over 50 ms
(52.2, 53.0, 53.2, 59.6, 61.8 ms), always about 1,000 frames into the sample and
always "coinciding with a new texture". The bench now also records
`gl.info.programs` per frame, and that settled it: bloom-off held **12 programs
for the whole sample**; bloom-on started at **23 and compiled a 24th during it**.
The effect pool parks its meshes invisible, three compiles a program the first
frame an object is drawn, and the composer's render target needs its own variant
of every material, so the first ring or number after bloom mounted paid a compile
mid-game.

`EffectPool.prime()` draws every parked slot once at opacity 0 (a `text` slot with
a map, which is its own variant), and the three fields that park their meshes do
the same at count 0. `CueRunner` runs it for two frames at mount, and `Post`
re-arms it when the composer mounts. After the fix: **programs constant (25) for
the whole sample, max 18.1–19.3 ms, four of four runs**.

### 19.5 The cold start

SwiftShader, bloom off, `--settle 600`: two runs, **max 78.2 and 65.0 ms**. In the
first, both long frames were in the first ten and both coincided with a new
texture: M7 follow-up 1's first upload of a card face, which Tier 2 does not make
worse. In the second, the one long frame came with neither a texture nor a program
(frame 166 of 341), and p95 was 30.8. That is the governor still stepping down from
dpr 1 inside a 600 ms settle, so the cold number is noisy and it is reported rather
than claimed. **On the GTX 1080 the cold run has no hitch at all** (max 18.2 ms,
bloom on).

### 19.6 Reduced motion

`prefers-reduced-motion: reduce` (emulated through CDP): p95 17.1–17.2 ms, PASS,
and `stack.test.ts` asserts that no cue in the registry poses a figure under it:
**clips collapse to snaps**, the figure holds the stance `figurePose` derived, and
the cue itself still runs at 30% because it may carry a fact (§8 rule 7 as M7
settled it).

### 19.7 The width tuning — correction (b), measured

`figure-pose.test.ts`, over all 12,029 poses:

```
agent    ratio 1.14 · at FIGURE_HEIGHT 0.97 wide · clamped 0.72 wide (slot 0.720)
drone    ratio 2.97 · at FIGURE_HEIGHT 2.53 wide · clamped 1.39 wide (slot 0.720)
insect   ratio 1.53 · at FIGURE_HEIGHT 1.30 wide · clamped 0.72 wide (slot 0.720)
7337 neighbouring pairs · worst overlap 0.634 units
  every overlapping pair has a drone in it (agent+drone 385, drone+drone 195, drone+insect 117, disc+drone 17)
```

The agent and the insect now fit their rank slot exactly. The drone does not, by
the floor's own choice (`FIGURE_MIN_FIT 0.55`: a strict clamp would make it 0.24
units tall). Its x extent really is its wingspan (2.271 × 0.481, x × z, measured
from the build's own intermediate), so this is T9's to fix with a narrower drone,
not a number to fudge. `tools/build-figures.mjs`'s comment gives the wrong reason
for measuring `max(x, z)` ("a figure turns to face the other seat": a π turn keeps
x along x; the z term only matters for a model authored facing ±x). The number is
right for all three models. The file is outside this slice's remit, so the comment
is left for its owner.

---

## 20. The live game on 8660

`./bridge/run.sh mtgtable.MtgTable --transport ws --port 8660 --seed 7 --keep-open`,
Vite dev on 5180, `/?ws=1&port=8660#arena`, headless Chromium on the GTX 1080,
every click a real CDP mouse event on the card's own hit proxy (the pixel is the
rig's world position projected through the camera) or a real DOM button click.
Seed 42 dealt three Islands and four non-creatures, so it was abandoned for seed 7
before any decision.

| turn | what was done | what the arena showed |
|---|---|---|
| 0 | the AI went first on seed 7 (on seed 42 we had won the toss and chosen **Play**); **Keep** (Quantum Reduction, Wasp, Thriving Isle, Agent 13, Island, Depower, Strategic Intervention) | two busts, no figures |
| 2 | **played Thriving Isle** → an `order` ask (its two replacement effects; answered **Default**) → a `choose_list` ask (**white**) | the land on a two-tone water tile (`water 2, rim 1`) |
| 4 | Island; **cast Quantum Reduction** at the AI's Ant-Man's Air Force: the optional Teamwork cost (answered none), the target click, the engine's own **Auto** pay | on the stack: `tethers 1 · ring 1`: the blue ring form at our anchor with a long tether to the insect (`live-qr-on-stack.png`) |
| 4 | **OK** (pass) | it resolved: the AI's insect drawn **0.268** tall, down from 0.470, with the shrink ring (both read back off the recorded frame log with `figurePose`) |
| 5 | (the AI's turn) | the AI cast **Web Up** targeting our Quantum Reduction (card 5), which went battlefield → exile, and the insect was 0.470 again |
| 6 | Island; **cast Agent 13** ({2}{W}, Auto) | a translucent agent at our casting anchor, `ghost true · opacity 0.40` (`live-agent13-ghost-zoom.png`) |
| 6 | **OK** | `ghost false · stance sick · (0, 0.01, 1.78) · opacity 0.72`, the same object |
| 8 | Plains, Wasp; **attacked with Agent 13** | stance `attacking`, rest pose `agent_holding-both-shoot` (her `pistolDraw` alias); her attack trigger on the stack during declare-attackers put the **live table in the combat freeze** (`frozen 1`, `live-freeze.png`); unblocked, AI to 17; a Clue token's `summon` |
| 11 | on the AI's attack, **blocked the Giant-Sized Flying Ant with Wasp** | a live `block` clip on Wasp (with a body); Wasp died, the Ant took 1 |
| 12 | Ant-Man cast; attacked with Agent 13 and Ant-Man; then **Concede** (arm, confirm) | "Game over. Winner: Forge AI", with the New game / Restart match row |

**Frame rate, live, on the GTX 1080 with bloom on and five figures:** the page
itself (vsync-locked, no rate-limit flags) ran **482 frames in 8 s — 60 fps,
rAF p50 16.7 / p95 16.8 ms** — and 240 frames pumped through fiber's `advance()`
cost **0.2 ms p50, 0.3 ms p95, 0.9 ms max including `gl.finish()`**.

**The finding the live game adds, and it is Tier 1's rather than this slice's:
in the human's own combat, the transient clips mostly do not play.** Forge hands
the human priority in the same breath as each combat batch, so §5.3's
awaiting-human budget (250 ms) applies, and a combat batch's natural length (an
850 ms lunge, plus damage, life and zone cues) needs compression below
`MIN_COMPRESSION` (0.25). The queue then snaps it, and a snapped cue is applied at
`t = 1`, where the clip weight is 0. The attack lunge and the damage hit were
**not observed live** for that reason. The block clip was observed live, because
it arrives in a short batch. What carries combat live is the **pose**: the
attacking stance with the per-card alias, the freeze, the shrink, the tile, the
ghost. The lunge, hit, summon and die mechanics are the ones T3 photographed in
replay (§10.5–§10.6), where the budget is 2.5 s. Loosening the live budget is a
Tier 1 policy change, so it is named in §23 rather than made here.

**The recording passes the redaction checker:**
`node tools/check-redaction.mjs var/games/human-ws-7/frames.jsonl` → **PASS**
(585 frames, 439 opponent-hand cards all redacted, 3 asks shape-checked, the M6
comfort block present). The bridge exited `MTGTABLE OK` when the page closed, and
`sha1sum` over `~/.forge/decks` is identical before and after the run
(`c5d36a6d…`).

---

## 21. The gates

```
npx tsc --noEmit                 clean
npm --prefix web run build       clean
  dist/assets/index-*.js    275.38 kB │ gzip  85.72 kB    ← 2D entry, no three (T4: 85.64)
  dist/assets/Arena-*.js  1,128.08 kB │ gzip 315.13 kB    ← lazy arena (T4: 308.67)
  dist/assets/Post-*.js      67.78 kB │ gzip  16.54 kB    ← lazy INSIDE the arena, bloom only
npm --prefix web test            610 node --test + 79 vitest · 0 fail
./bridge/build.sh                lint OK · JsonSelfTest 38 · AskSelfTest 106 · GameLogSelfTest 35 · 0 failures
```

`node --test` went 601 → 610: the strike over the corpus, the strike cue's travel
/ burst / clip / decay, the fizzle and its `ground` anchor, the freeze sparing the
ghost, reduced motion over every cue, the busts (one per seat, no name) and their
flinch, the snap's host clip, and the bloom-laziness liveness clause.
`replay-cues.test.ts` now feeds the previous board to the planner, so the decay
and redaction assertions cover the strike's clip on the struck figure.

Not run: `./tools/check-all.sh`. Nothing here touches `bridge/`, the protocol or a
fixture; the bridge was built and self-tested for the live game.

---

## 22. Deviations from report 13, and why

1. **The strike reads the previous frame** (§18.2). Report 13 §6.3 asks for a
   strike "along `deltaTo(target)`" and does not say where the target comes from.
   The event cannot say it and the current frame no longer does.
2. **`AnchorRef`'s casting anchor gained `ground`**, and **`Effect` gained `arc`**,
   both for the fizzle's fall. Neither is a new primitive.
3. **The busts are one draw call, not two**, and they have a `vigour` term (life
   against the table's highest dims a worn-down seat). That is a rendering of
   `PlayerState.life`, and the number the player reads is still the HUD's.
4. **Bloom's default is ON** where the earlier draft set it off (§19.3), and the
   DPR governor gained a rung below its floor.
5. **`EffectPool.prime`** is report 13 §8.3 rule 3's "warm the programs" extended
   from the figures to the pool, because the bench found the pool.
6. **`resolved.pop` and `resolved.fizzle` defaults are 480 / 460 ms**, up from
   320: the strike has to travel and burst.
7. **Quantum Reduction's transition is on `attach:on`**, not only on `cast`
   (§16, row 10), via `params.hostClip` / `params.collapse`, which are data.
8. **`shell`, `circuit`, `glints` and `cocoon` still draw as the halo** (T12).
9. **The live game used seed 7**, after seed 42's hand had no creature.

---

## 23. Still open, and named

- **The live combat budget snaps the clips** (§20). A Tier 1 policy question: for
  example, exempt the clip lane from `MIN_COMPRESSION`, or let an attackers
  batch keep a floor of ~400 ms even while the human is awaited. It needs the
  play-test report 13 §13 question 7 asks for, not a guess.
- **The drone overlaps its neighbours** (§19.7), worst 0.634 units. T9.
- **The GPU number is the GTX 1080's, headless.** It is this machine's GPU through
  ANGLE-on-GL, not a headed browser on the user's desktop compositor, and not the
  integrated GPU report 13 §8 sized for. M7 follow-up 2 is answered for this GPU
  and still open for an iGPU.
- **The SwiftShader cold start** (§19.5): 65–78 ms max, first-upload and
  governor-settling; M7 follow-up 1, unchanged.
- **Web Up's cocoon** (report 13 §4.5): the live game played Web Up (the AI cast
  it on our Quantum Reduction on turn 5), so the "measure before building"
  recording now exists in `var/games/human-ws-7/frames.jsonl`; nobody has read it
  for `attachedToId` on the exiled card yet.
- **`docs/protocol.md`, `CLAUDE.md`, `PLAN.md` and `DECISIONS.md`** still carry no
  Tier 2 entry (T14). This slice adds to that list: bloom's default and the
  governor's `onFloor`, the planner's one-frame look-behind, `casting.ground`,
  `Effect.arc`, and the `?bloom` flag's new meaning.

---
---

# M7 Tier 2, slice 1 — status after verification and the documentation pass

*2026-09-27, the same worktree and branch. This section records where slice 1
stands; it edits no code and re-measures nothing that §1–§23 measured.*

## 24. Status

**T0–T7 are done, and an independent verification pass returned `passed`** with
ten findings, all minor. Nothing is committed: the work is branch
`tier2-slice1` in `/home/justin-a/code/mtg-table-t2`, and the user commits.

### 24.1 Where each verification finding went

| # | finding | where it went |
|---|---|---|
| 1 | `layout.ts`: a wrapped rank's second-row figures stand inside the first row's cards (report 13 §3.1's own formula) | PLAN.md Tier 2 follow-up 3; **D55** known cost |
| 2 | `perf.ts`: `BLOOM_DEFAULT = true` meets user decision 6 on the GTX 1080 (the verifier measured p95 0.7–0.8 ms, max ~18 ms, warm and cold), but the default SwiftShader bench run fails with it | follow-up 4; **D61** known cost |
| 3 | `clips.ts`: the `die` clip never plays (a full 1× `g1` replay: 69 `die` requests reached `stage.clips`, no rig showed a death clip); lunge and hit are replay-only | follow-ups 1 and 2; **D56**, **D57** |
| 4 | `liveness.test.ts`: the "no CDN" clause is a hostname denylist (`https://example.com/…` passed in a scratch copy) | follow-up 8; **D54** known cost |
| 5 | NOTICE did not list the two bundled bloom packages | **closed** — NOTICE §6 |
| 6 | `build-figures.mjs` never checks the sources' sha256 and the built file has no recorded hash | follow-up 9 (code half open); the hash is now recorded — below |
| 7 | `Post.tsx`: 25 programs with bloom on (22 after the governor, 11 off) against report 13 §8.2's ≤ 14 | follow-up 5; **D61** known cost |
| 8 | `CueRunner.tsx`: the idle cost rises while a Tier 1 `presence` bobber is on the table (`demand` itself works: 0 renders in 5 s on `human-comfort-13` @1262) | follow-up 7; **D58** known cost |
| 9 | the docs lag the code: CLAUDE.md's 26-mesh pool and M7 test counts, no DECISIONS entries for the changes that contradict earlier documents | **closed** — CLAUDE.md, DECISIONS.md **D53–D63** |
| 10 | `busts.ts`: at 1600 × 1000 the opponent's bust is mostly under the decision panel and cue strip, the viewer's takes the bottom-left corner | follow-up 10; **D62** known cost |

§23's last item — *"`docs/protocol.md`, `CLAUDE.md`, `PLAN.md` and
`DECISIONS.md` still carry no Tier 2 entry"* — is **closed** for the last three.
**`docs/protocol.md` needs no entry**: slice 1 changed nothing on the wire,
`bridge/` is untouched and no fixture was re-recorded.

### 24.2 The documentation pass

Documentation only — no file under `web/src/`, `web/test/`, `tools/` or
`bridge/` was edited:

- **PLAN.md** — the M7 status row; a new *M7 Tier 2* section (the eight
  evenings, the commands, what the evidence shows with the bench table and its
  caveats, the bloom decision, the deviations, the verification pass, **nineteen
  Tier 2 follow-ups**, and the T8–T14 hand-over); three new rows under *Only the
  user can decide* (report 13 §13's questions answered as D53–D62; whether to
  commit `figures.glb`; whether the live combat budget should let clips play).
- **DECISIONS.md** — **D53–D63**: the user's nine decisions as recorded (grouped
  where they share a rationale) and the builders' own — the holographic material,
  the CC0-only rule and its manifest, where a figure stands, pose versus cue, the
  clip lane, breathing, the land slabs, the motes and the seventh `Effect` kind,
  bloom and the governor's rung below the floor, the busts, and the strike's one
  frame of look-behind.
- **CLAUDE.md** — a *conventions M7 Tier 2 added* section (pose versus cue,
  `figurePose` / `FigureLayer` as the one pose and the one figure renderer, the
  zero-delta clip lane, CC0-only with the manifest and no Mixamo and nothing from
  card art, unlit and idle-zero, bloom lazy); the stale 26-mesh pool, test counts,
  chunk size, decision count and docs table corrected.
- **README.md** — *Arena mode* gains the Tier 2 description, its cost, where the
  figures come from, and how to rebuild `figures.glb`; the command block, the repo
  layout, the dev handle and the documents table.
- **NOTICE** — §6 gains `@react-three/postprocessing` 2.19.1 (MIT) and
  `postprocessing` 6.39.5 (Zlib), the meshopt decoder three ships, and the
  lockfile-only `maath` / `n8ao`; §7 gains the built file's hash, the no-Mixamo /
  no-card-art line, what Tier 2 draws procedurally, and the dev-only
  `@gltf-transform/cli` toolchain.
- **docs/ideas/arena-mode.md** — the status block, the tier markers, and what
  slice 1 adds to the per-card table.

### 24.3 Four facts the documentation pass measured

1. **The built library:** `web/public/models/figures.glb`, **126,404 bytes**,
   sha256 `c870a53330cf20f0d1edb536e6bab67ffcbe213fd54f081195a062365c5658fa`
   (built 2026-09-26). Recorded in NOTICE §7 and **D54**; nothing asserts it.
2. **The lockfile:** relative to `main`, `web/package-lock.json` gains **4
   production entries** — `@react-three/postprocessing` 2.19.1 (MIT), its nested
   `maath` 0.6.0 (MIT), `n8ao` 1.10.3 (ISC), `postprocessing` 6.39.5 (Zlib) — and
   **193 dev-only entries** under `@gltf-transform/cli` (147 MIT, 16 Apache-2.0,
   8 ISC, 5 BlueOak-1.0.0, the rest BSD / 0BSD, and **14 carrying LGPL-3.0-or-later**:
   sharp's platform `libvips` binaries). The `Post` chunk's source map lists only
   three-stdlib's `misc/WebGL.js`, `postprocessing`, three files of
   `@react-three/postprocessing` and `Post.tsx`: `maath` and `n8ao` are
   tree-shaken out.
3. **No built chunk carries a licence banner.** After the gate's own `npm run
   build`, `grep -c` finds **0** `Copyright` and **0** `@license` in the entry,
   `Arena` and `Post` chunks. NOTICE §6's M7 sentence claiming the bundler kept
   them was wrong and now says so (Tier 2 follow-up 16).
4. **`@gltf-transform/cli` is `^4.5.0`** — the one Tier 2 dependency on a caret
   (follow-up 17).

### 24.4 `./tools/check-all.sh`, once

```
WSPORT=8661 ./tools/check-all.sh      # in /home/justin-a/code/mtg-table-t2
START 2026-09-27T01:17:17-04:00
check-all OK
CHECK-ALL EXIT=0 WALL=727s END 2026-09-27T01:29:24-04:00
```

**Exit 0 in 727 s (12 min 7 s)**, `bridge/out` not deleted first, on a desktop
that was not idle. The run started while the documentation edits were being
written; no step reads any of the files they touched (checked: no test or tool
opens `CLAUDE.md`, `PLAN.md`, `DECISIONS.md`, `README.md` or `NOTICE`). What it
showed, step by step where it matters:

- **6** — 377 normalised lines identical to `fixtures/games/g1.jsonl`.
- **9b** (advisory) — `human-auto-42` re-records **multiset-identical**, 1,587
  frames.
- **9c** — **10/10** games reached `over`, zero `UNIMPL`, every log through
  `check-redaction.mjs`, **269 s**.
- **9d** — the sideboard ask: 40 main + 15 side, answered with a legal
  non-identity swap.
- **10a–10g** — all seven ws servers on 8661: the doorstep test, the
  disconnect-mid-ask variant, a full game, `--refuse-first-ask`, the pre-input
  concede (`OVER WITHOUT A gameOver STATE` path, 4 log lines), 7 `clickAbility`
  acts none unresolvable, and three games over one socket with M6's five acts
  moving the board and the yielded ability never re-asked.
- **11–12** — every committed fixture and every fresh recording **PASS**
  `check-redaction.mjs`; the checker's own negative controls all rejected.
- **13** — the build byte-identical in size to §21 (entry 275.38 kB / **85.72 kB
  gzip**, `Arena` 1,128.08 / 315.13 kB, `Post` 67.78 / 16.54 kB); **`node
  --test` 620 tests, 612 pass, 0 fail, 8 skipped** (the ws-log candidates
  `MTGTABLE_WS_LOGS` does not name) and **vitest 79 / 79**.

`sha1sum` over `~/.forge/decks` was `c5d36a6d…` before and after the run, and no
listener was left on 8661 or any 5180-range port.

### 24.5 The interruption, for the record

The T5–T7 builder's first session stopped part-way when its sign-in expired; a
second session resumed it (§16). Separately, when the documentation session
started, seven productivity-plugin connectors (Asana, Atlassian, ClickUp, Linear,
Monday, Notion, Slack) reported that they need authentication. Nothing in this
work uses them.
