# The anchor resolver — the frame loop's last allocation outside the scans (2026-09-29, D275)

GPU-pass follow-up 12, a lane of its own because it changes `layout.ts`, the one
module in the arena that knows a coordinate. Branch `anchor-scratch` off `main`'s
`0a93c9d`, worktree `mtg-table-t2ap`; the lane reserved **D275–D277** and used
**D275**. `docs/evidence/gpu-pass.md` §13 is where the follow-up came from.

`EffectPool.bind` hands every non-figure effect's anchor, every frame, to
`SceneStage.positionOf`, which called `layout.ts`'s `anchorPosition`: a
`seatOfPlayer` closure and a fresh `[x, y, z]` a call — and, it turned out, a
`c:<id>` key string for every card anchor (`placementOf`), one object for the
opponent's `player` anchor (`playerAnchorFor('opp')`) and nine anchor objects,
a closure and a spread for every opponent's `zone`, `combat` or `casting` anchor
(`anchorsFor('opp')`). The turn banner (a `table` anchor) and the life number (a
`player` anchor) paid it on every frame they were live.

## 0. The numbers, one table

GC events per 5,000,000 calls (per 2,000,000 binds for `EffectPool.bind`),
`tools/anchor-gc-probe.ts`, **Node v24.20.0, no flags**, each case in a fresh
process, the board `g1.jsonl`@316, 500,000 calls to warm and then the counted
loop, a `PerformanceObserver`'s `gc` entries whose start falls inside it. Before
is a `git archive` of `0a93c9d`; after is this branch. Two runs of each,
interleaved (before, after, before, after): every count identical across its two
runs except the kept-tuple control after (43, 42) and `anchorPosition`'s
`above`/`beside` after (43, 42).

| anchor kind | `stage.positionOf` (the frame loop's path) before → after | `anchorPosition` (the allocating form) before → after | ns a call, `stage.positionOf`, before → after |
|---|---|---|---|
| control: a fixed tuple | 0 → 0 | — | 3–4 |
| control: a fresh tuple, kept | 43 → 42–43 | — | 5–6 |
| `card` | 14 → **0** | 14 → 43 | 23.4 → 33.2 |
| `player`, yours | 43 → **0** | 43 → 43 | 6.5 → 5.7 |
| `player`, the opponent's | 114 → **0** | 114 → 43 | 9.2 → 5.7 |
| `zone` / `combat` / `casting`, yours | 43 → **0** | 43 → 43 | 6.8–7.5 → 5.9–6.3 |
| `zone` / `combat` / `casting`, the opponent's | **818** → **0** | 818 → 43 | 39.3–41.0 → 5.9–6.4 |
| `stack` | 43 → **0** | 43 → 43 | 6.7 → 5.1 |
| `table` | 43 → **0** | 43 → 43 | 6.4 → 5.2 |
| `above` / `beside` | 57 → **0** | 57 → 42–43 | 25.7–29.3 → 33.9–34.3 |
| `figure` (resolves nothing here) | 0 → 0 | 0 → 19 | 4.0 → 3.9 |
| every kind in turn, from the first call | **269** → **0** | 269 → 43 | 24.6 → 14.5 |
| `EffectPool.bind`: the turn banner + the life number | **38** → **3** | | 228 → 239 per bind |
| …the banner alone / the life number alone | 17 / 17 → **0 / 0** | | 150 / 147 → 157 / 164 |
| …a text effect at an anchor that places nothing | 5 → 0 | | 145 → 141 |
| …an empty pool | 0 → 0 | | 68 → 67 |

What it says:

- **The base tree's 43, 14 and 0 are §13's numbers exactly** — 43 for a player,
  `table` or `stack` anchor, 14 for a card, 0 for a fixed tuple — read by a probe
  written anew (§13's was lost with its worktree). A kept fresh tuple reads 43
  too: a `table` anchor's whole cost was its tuple, the closure elided by the
  compiler.
- **Through `stage.positionOf` every kind reads 0 after**, and so does every kind
  in turn from the first call (the frame loop's own feedback).
- **The dearest anchors were ones §13 did not ask for**: an opponent's `zone`,
  `combat` or `casting` (818, nineteen times a `table`), because
  `anchorsFor('opp')` built the whole seat, and the opponent's `player` (114).
- **The two effects the follow-up named, bound through the real pool**: 38 → 3,
  and **0 for either one alone**. The 3 is the engine-level residue §13 found in
  `#apply` with more than one effect live (290 per 2M binds with seven kinds), not
  the anchor: no source line in the path allocates, and one effect reads 0.
- **`anchorPosition`, the allocating form, reads a tuple's 43 on every kind after**
  — by contract: it hands the resolver a fresh tuple for a caller that keeps its
  answer (the tests, and the cue layer's `deltaTo` and `yawTo`). Its `figure` 19
  is that tuple allocated for an answer of `null`; nothing on the frame loop's
  path calls it (`liveness.test.ts`).
- **The price**: a card anchor walks the placements (§1) and costs about 10 ns a
  call more than the `Map` lookup it replaced at `g1`@316 (23–26 → 33–34 ns); an
  opponent's anchor is 33 ns cheaper, every kind in turn 10 ns cheaper. A frame
  resolves a few dozen anchors at most (eight blended effects, twelve motes, their
  far ends), so either way it is under a microsecond. The per-bind times are within
  the runs' own spread (the base tree's life number read 147 and 173 in its two
  runs).

## 1. What changed

- **`layout.ts`'s `anchorPositionInto(out, placed, ref)`** answers `out` or `null`.
  Every case sets three numbers, and `out` is written once, at the end — never
  through a helper, because a computed number handed to a call the compiler did not
  inline is boxed (measured: the first cut wrote through a `tupleInto(out, x, y, z)`
  helper, and in the probe's in-process mode, where the resolver's feedback has
  been walked through every kind, `above` read 19 events per 5M through it and 3
  with the writes inline; §3). The `seatOfPlayer` closure is `seatOf(id,
  placed.viewerId)`, which answers the same: `seatOf`'s first line maps `null` to
  `you`. A card's answer is a COPY of its placement's position — the old one
  answered the placement's own tuple, which any caller could have written.
- **`anchorPosition(placed, ref)`** stays, as `anchorPositionInto([0, 0, 0], …)`:
  the allocating form for a caller that keeps its answer.
- **`SceneStage.positionOf`** is `anchorPositionInto(this.#at, this.layout, anchor)`
  — one scratch tuple a stage, overwritten by the next call.
- **`anchorsFor('opp')` and `playerAnchorFor('opp')`** answer module constants built
  at load by the same mirror (`mirrorSeat`, the old body verbatim), `-0` included
  (the command anchor's z mirrors to `-0`, as it did). They were built afresh on
  every call — also by `layout()` for every opponent's placement, by the casting
  field for every opponent's form and mote on every frame, and by the silhouettes.
- **`placementOf`** walks the placements by index: from the end for a `c:`
  placement of the card, then forward for any. That is `byKey.get(`c:<id>`)`'s
  answer exactly — `byKey` is written placement by placement, so it keeps the LAST
  with a key, and a `c:` key is always `c:<its cardId>` (every `place()` call builds
  it from `card.id`) — and then the old fallback. `isCardKey` reads the key's
  first two characters as numbers.
- **`camera.ts`**: the director copies each point it frames (§2).
- Comments in `scene/effects.ts` and `scene/casting.ts` say which scratch each
  answer is.

## 2. The callers, traced before anything changed

Every caller of `anchorPosition` and of `stage.positionOf` at `0a93c9d`, and what
each does with the tuple:

| caller | what it does with the answer | a shared scratch? |
|---|---|---|
| `EffectPool.bind` → `#anchor` → `#external` (`#apply`) | `at` read into `ax`, `ay`, `az` before a beam's, mote's or cloud's `to` is resolved; `plate` and `text` read `at[i]` with no resolve between | safe |
| `EffectPool.#streak` | `to` read into `tx`, `ty`, `tz` before `from` is resolved; `from` read at once | safe |
| `EffectPool.#beside` | `aside` read at once into `#a` | safe |
| `EffectPool.#figurePoint` (a body-less `figure` anchor falls back to its card) | the card's answer read at once into the pool's own alternating tuple | safe |
| `CastingField.bind` (a tether's far end) | read at once into `TO` | safe |
| **the camera director** (`CueRunner.driveCamera` → `director.request`, `resolve: stage.positionOf`) | **kept**: `points.push(point)` for every anchor of the request's frame, then `solveFraming(points, …)` | **no** — the attack's swoop frames `[card, combat lane]`, and through one scratch it would have framed the lane twice and the attacker not at all. It now pushes a copy, the tuple the resolver used to allocate; a camera request is a cue's, re-asked on the frames of its window, not the frame loop |
| `layout.ts`'s `anchorDelta` (`Stage.deltaTo`) and `figureYawTo` (`Stage.yawTo`) | read at once; `anchorDelta` answers a fresh tuple of its own | keep the allocating form: the cue layer's (§5) |
| tests: `stack.test.ts` (air against ground, two answers kept), `facing.test.ts`, `liveness.test.ts` | kept or null-checked | keep the allocating form |

`liveness.test.ts` now holds the list: `stage.positionOf` appears in
`CueRunner.tsx` three times and nowhere else, so a new caller fails the clause
until it is traced; the director's copy and the casting field's resolver are
anchored; `anchorPosition(` outside `layout.ts` fails; inside it, only
`anchorDelta` and `figureYawTo` call it.

## 3. The probe

`tools/anchor-gc-probe.ts` (new; `tools/README.md` has its row). Why it is shaped
as it is, each point measured:

- **A fresh process per case.** Its own heap and its own type feedback, so a count
  is the case's and repeats to the event (two interleaved runs a tree, §0).
- **The answer is read into a `Float64Array`.** The first cut summed it into a
  `let sink` — a double the tiers below the optimising compiler box on every add —
  and every case that resolved to something read 7–9 events per 5M more than it
  allocated (`figure`, which resolves to `null`, read 0; after the fix, the
  after-tree's stage path read 0 on every kind). Two controls pin the harness: a
  fixed tuple reads 0, a fresh tuple written to a module variable (so it escapes)
  reads 43.
- **`--in-process`** runs every case in one process, the resolver's feedback
  walked through each kind in turn and deoptimised by each new one (a
  `--trace-deopt` shows a bailout of `anchorPositionInto` as each case begins).
  There, before: 7–424 (the heap has grown, so each scavenge covers more); after,
  the stage path reads 0 on every kind but `above`, 2–4 when the probe's own ref
  was written `{ kind: 'above', id, height: 0.6 }` with the literal in its source
  and 0 when the height is computed at run time (`--height`, now the default) — a
  representation detail of the probe's object, not a construct in the resolver.
  Through a `tupleInto` helper it had read 19 (§1).
- **What it cannot see**: the browser. It is the same V8 as Chromium's, not the
  same heap, and a GC event is a scavenge of the young generation — cheap one at a
  time. The claim it holds is the one the follow-up made: the path allocates
  nothing per call.

## 4. No answer moved

`web/test/anchors.test.ts` keeps the resolver as it stood at `0a93c9d` —
`anchorPosition`, `seatOf`, `playerAnchorFor`, `anchorsFor`, `zoneAnchor`,
`placementOf` (by `byKey`), `restPositionOf`, `ownSideOf`, `anchorDelta` and
`figureYawTo` — as a test-local reference, not in the app, and compares numbers
with `Object.is` (a `-0` for a `0` is a difference):

| what | over | answers | differences |
|---|---|---|---|
| `anchorPosition`, `anchorPositionInto`, `SceneStage.positionOf` against the reference | every anchor kind of every board frame of the 23 committed recordings (5,522 frames), from four chairs (the stream's seat, the other one, a stranger's, none): each placed card and two ids that are not, as `card`, `above` (two heights), `beside` (two offsets) and `figure`; every player, a stranger and `null`, as `player`, `combat`, `casting` (three `ground`s) and `zone` (eight names, an unknown one and `''`); `stack`, `table` and an unknown kind | 16,001,784 | **0** |
| `placementOf` (by identity), `anchorDelta`, `figureYawTo` | every card of every board frame against the table's anchors, each player's and a spread of other cards | 164,266 lookups; 3,534,795 each | **0** |
| `placementOf` on two layouts no recording has | a card placed twice under its `c:` key, and a card whose `c:` placement is gone (a sample of 1 board in 50) | 6,228 | **0** |
| the opponent's anchors | built once (the same object each call), each field the old mirror's, `-0` included | — | **0** |
| the effect pool through the scratch against fresh tuples | 4,820 binds of 1–14 random effects of every kind (glow and its shapes, a star beside a body, ring, plate, text, beam, mote, cloud, speed lines with and without `from`) over 241 boards from every recording, 16,812 with a second anchor; every slot's visibility, position, quaternion, scale, opacity and a cloud's points | 4,820 frames | **0** |
| the director's shot through the scratch against fresh tuples | `g1`@316, `[your creature, their creature, table]`, the pose 400 ms into the move | 1 shot | **0**; the shot a director that KEPT the scratch would frame (the last point three times) differs — the control |

**Negative controls**, each spliced into the worktree's file by a script and
restored (the four files' `sha1sum` checked after):

| # | the splice | red |
|---|---|---|
| C1 | the closure back at the top of `anchorPositionInto`, used | liveness (a closure) |
| C2 | `table` answered with a fresh `[x, y, z]` | liveness (an array literal) |
| C3 | `placementOf`'s `byKey.get(`c:${String(id)}`)` back | liveness (a template string, `String(`) |
| C4 | `anchorsFor('opp')` building the mirror per call | liveness (a helper outside the list) and `anchors.test.ts` (not the same object) |
| C5 | `positionOf` into a fresh tuple | liveness (the scratch anchor) |
| C6 | the director keeping the scratch (`points.push(point)`) | liveness (the copy anchor) and `anchors.test.ts` (the shot moved) |
| C7 | a beam reading its near end (`at[i]`) after resolving its far end | `anchors.test.ts` (the pool's slots differ) |
| C8 | the mirror's `z: 0 - a.z` (`+0` for the command anchor) | `anchors.test.ts` (the corpus sweep and the mirror test) |
| C9 | `placementOf` taking the FIRST `c:` placement | `anchors.test.ts` (the hand-built doubled card — no recording tells first from last) |
| C10 | `placementOf` without the `c:` check (a stack copy taken for the card) | `anchors.test.ts` (the sweep and the identity test) |
| C11 | `anchorsFor` calling a helper the list does not name | liveness (the call closure) |

Every one red, and the tree restored byte for byte.

## 5. What stays outside, and why

**The cue layer.** A cue is a pure function of its own `t` that writes values
(D50): each frame it builds its effect objects (`registry.ts`'s literals, spreads
and `${ctx.key}:banner` keys; the banner's `Turn ${n}` text), their anchor refs,
and asks `deltaTo` and `yawTo` for tuples it composes. That is a few small objects
per LIVE cue, gone in the next scavenge, and pooling it would make an effect an
object the stage owns across frames and a cue a writer into it — a renderer that
remembers. The resolver was the other kind of cost: per effect per frame, a tuple
read once and dropped. D275 draws the line there, and the arena `CLAUDE.md`'s GPU
rule 2 says so: the scans hold the scene bodies AND the resolver; the cue layer
stays outside.

Two findings on the way, not fixed here (PLAN.md's GPU-pass follow-ups 13 and 14):
`CastingField.bind` and `OverlayField.bind` are frame-loop bodies no allocation
scan reads (`for…of`, and a `.values()` iterator in the overlay's), so rule 2's
"every scene-side body" is not yet true of them; and the effect pool's `#cardOf`
and the runner's `panOf` walk the placements themselves because `placementOf`
built a key string — `#cardOf` answering the first `c:` placement where
`placementOf` answers the last, which no recording tells apart.

## 6. The bench: nothing either way

`tools/arena-bench.mjs` over production builds served by `vite preview` on port
5260 — the base (`git archive` of `0a93c9d`, its own `dist`) and this branch —
one server at a time, three runs of each, interleaved (before, after / after,
before / before, after), bloom off (`--no-bloom`, so the counters read), a COLD
600 ms settle, unthrottled pacing, 1920 × 1080, CDP on port 9395. The machine:
16 threads, loads 0.6–6.4 over the series (the bench's own Chromium), the owner's
Firefox with an arena tab open throughout; the GTX 1080's driver state read as
each run began (P0 at 1,632–1,898 MHz in 18 of 24, P5 at 721–746 MHz in 6). Two
frames: **`g1`@316** at the default 4× (the bench frame; its five seconds play
through the turns at 318, 333, 348 and 362, so four turn banners are live in the
sample) and **`g1`@318** at `--speed 1` (the frame whose batch starts the opponent's
turn 22: the banner is live from the first sampled frame, then 1× to @330).

| frame | rasteriser (what drew it) | render dpr | before: p50 · p95 · max ms (3 runs) | after | draw calls · triangles |
|---|---|---|---|---|---|
| `g1`@316, 4× | SwiftShader (`ANGLE (Google, Vulkan 1.3.0 (SwiftShader …)`) | 0.6 (the governor's floor) | 16.4–16.6 · 33.8–34.4 · 35.3–68.3 | 16.5–16.7 · 33.9–34.2 · 35.1–35.7 | 91 · 29,613 both |
| `g1`@318, 1× | SwiftShader | 0.6 | 16.4–16.5 · 33.9–34.1 · 34.8–35.6 | 16.4 · 33.5–34.2 · 34.9–71.7 | 84 · 26,633 both (one after-run read 86 · 26,635 at its last frame: the counters are read wherever the sample ends, GPU-pass follow-up 7) |
| `g1`@316, 4× | the GTX 1080 (`ANGLE (NVIDIA Corporation, NVIDIA GeForce GTX 1080/PCIe/SSE2, OpenGL 4.5.0)`, `--gpu gl`) | 1 | 0.4 · 0.5–0.6 · 10.1–13.3 | 0.4 · 0.5 · 10.5–10.9 | 87 · 26,395 both |
| `g1`@318, 1× | the GTX 1080 | 1 | 0.4 · 0.5 · 10.8–10.9 | 0.4 · 0.5 · 5.3–11.3 | 87 · 26,175 both |

SwiftShader at the floor is D270's software floor in both builds (a ~17 ms beat
and its missed beats; one 68 ms and one 72 ms max, one in each build). The GTX
1080 draws the unthrottled page at about 2,400 frames a second in both, and its
p50 and p95 — the regression signal on a real GPU (D273) — are the same to the
0.1 ms the page clock reads. The allocations removed are small — from a kept
tuple's 43 events for 72 bytes a call, a `table` anchor was about 72 bytes a
resolve and an opponent's `casting` about 1.4 kB (818 events), so at most a few
kilobytes a frame with an opponent's motes in the air — and no frame-time line
could show them; none moved. The counts (calls,
triangles) are equal, as a change that moves no coordinate should leave them.
The raw runs are under the session's scratch (`bench/*.json`), not committed.

## 7. Chunk sizes

`npm --prefix web run build`, this branch against a build of the `git archive`:

| chunk | `0a93c9d` | this branch |
|---|---|---|
| `arena-scene-*.js` | 1,387.35 kB · **398.52** gzip | 1,387.71 kB · **398.64** gzip (+0.36 kB, +0.12 gzip) |
| `index-*.js` (the 2D entry) | 300.43 · 94.67 | 300.43 · 94.68 (the same code; the lazy chunks' hashed names differ) |
| `Arena-*.js` | 48.59 · 18.23 | 48.59 · 18.24 (the same) |
| every other chunk | — | byte-for-byte the same sizes |

The +0.12 kB gzip is `anchorPositionInto`'s writes, the two index walks in
`placementOf`, `isCardKey`, the allocating wrapper and the two constants. A first
cut that wrote `out` in every case read 1,387.75 · 398.64; the one write at the end
saved 40 bytes raw.

## 8. Tests, the gate and `~/forge`

Tests: `web/test/anchors.test.ts` (6, §4); `liveness.test.ts`'s GPU-pass case
(the resolver's eight bodies in the scan with the junk-line controls, the call
closure with its control, the stage's scratch, the closed list of callers, the
director's copy, the allocating form's callers). `npm --prefix web test`:
**1,230 `node --test` (1,221 pass, 0 fail, 9 skipped) + 159 vitest (9 files)**
standalone, from 1,224 + 159.

**The gate**, twice from a deleted `bridge/out` at `GATE_JOBS=4` on the committed
tree: `WSPORT=9380` **260.8 s** and `WSPORT=9390` **260.1 s**, exit 0 both, 48 jobs
(975.4 s and 965.8 s summed) at a load of 5.4–11.5, `node --test` **1,245 / 1,234
pass / 0 fail / 11 skipped** and vitest 159 (9 files) each time
(`var/check-all-anchor-1.log`, `-2.log`). A first run on the tree before a pass of
comment-only edits (the two constants' numbers in `layout.ts`'s comments, two
reflowed paragraphs, the liveness case's header) was green in 259.8 s
(`var/check-all-anchor-0.log`). The lane added no step and no job.
`node tools/build-workshop-catalog.ts --check`: current. `./bridge/build.sh`: OK.

`~/forge` and `~/.forge`: **unchanged** — the jar's sha256 (`3c0a7c38…8e5dd9`),
the sha1 of every file under `~/.forge` (seven) and a listing of every path under
`~/forge` with its size and mtime, hashed, identical before the lane's first
command (19:00) and after its last gate (19:49).
