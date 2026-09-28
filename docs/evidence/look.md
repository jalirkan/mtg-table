## Lane LOOK — the comic look, to production

The arena's figures are drawn in report 15's **comic look** by default: the costume
palette painted in three flat bands from one lens-fixed key light, a rim in the
card's colour, a specular dot, halftone in the core shadow, an ink line that rides
bloom's composer, a contact shadow under every figure and a mid-value stage with a
backdrop. `?look=holo` restores **D53**'s hologram. A seat's own figures now face
the opponent. Decisions **D120–D129** (the lane's reserved range,
renumbered at merge); the brief is `docs/research/15-art-direction.md` §9.1.

### The verification pass, round 1 — read this first

A verifier read the first round (`49b183c`) and found two majors and seven
minors. This section is what changed and what it measured; the sections after
it are the first round's record, and where a number below differs from one
there, this one is current. **D129** and dated amendments to D122, D124, D125,
D126 and D128 are the decisions. Everything here was measured on 2026-09-28
between 07:10 and 08:20 on a machine shared with other lanes' gates (load 2.6–15).

**What changed.**

| finding | the fix | where |
|---|---|---|
| the ink framed every card that stands off the table (major) | a painted figure, prop kind or duelist writes **alpha 0** as the ink's mark (blend state, no program); the ink draws only where a painted sample is among its five, writes alpha 1 back, stays first in the composer and is not `CONVOLUTION`; both canvases are opaque | `figureMaterial.ts`'s `markPainted`, `propMaterial.ts`, `Post.tsx`, `Arena.tsx`, `Pedestal.tsx` |
| GTX 1080 p95 with bloom off +2.4 ms over the hologram (major) | the ink rides bloom's composer only; bloom off mounts no composer (`?ink=always` forces one) | `look.ts`'s `wantsInkPass(look, bloom)`, `perf.ts` |
| `sick` → half hologram not built (brief item 8) | `figureLookOf`: `stance` `sick` draws `uLook` × 0.5, a pose | `look.ts` |
| the combat burst was +1 draw call | painted into a second copy of the ground's light, swapped on the pose, both uploaded at mount | `Table.tsx` |
| CLAUDE.md contradicted the lane | the two passages point at D120 and D126; the junk-write count is eight now | `CLAUDE.md` |
| the workshop opened on every figure's back | **`1× front`** is the default camera (`framing.ts`'s `frontPose`) | `framing.ts`, `Workshop.tsx` |
| the raster never rendered the comic look | `prop-raster.ts`'s `comicVisibility` applies the ink's rule and counts halftone dots; the both-seats test holds each prop's PAINT at ≥ 48 px | `web/test/prop-raster.ts`, `traits.test.ts` |
| dark costumes read as silhouettes | a dark paint's LIT band is lifted to luminance 0.09, hue kept (`COMIC.darkLift`): black's bands are now `#46527d` / `#212844` / `#181d3c` | `figureMaterial.ts`, `look.ts` |
| the rim's dots were busy near the lens (views 3, 5) | the stage's Ben-Day screen 10 px → 7 px, alpha 0.42 → 0.38 | `Table.tsx` |
| an orphaned headless Chromium | closed through its own DevTools endpoint (`Browser.close`) — the sandbox refused a signal | — |

The raster also drove two changes to the line itself. At 1.6 CSS px on both
sides of a silhouette, with lights inked, **eleven** identity-prop rows fell
under the bar. So the line's inner half — on the figure's own paint — samples
`COMIC.inkInnerCssPx` (1.0) away while its outer half keeps 1.6, and a pixel an
additive light has lifted past paper white is not inked (the composer's buffer
is half-float and paint is capped at 1). A uniformly thinner line (1.2) was
tried and photographed first: at table distance the silhouettes lost their ink
(`var/look/fix1/w-table-*.png`).

**No card is inked.** Still screenshots (reduced motion, so a hovering card
does not bob between the two), production builds, GTX 1080, 1600 × 1000, the
pixels that differ by more than 40 between the default and `?ink=none` inside
each card's rectangle:

| card | 49b183c | now |
|---|---:|---:|
| hand: Pym Particles | 349 | **0** |
| hand: Shifting Stash | 406 | **0** |
| the opponent's lifted Helicarrier card | 354 | **0** |
| your hovering Aerial Doombot and Wasp cards | 182 | **0** |
| the workshop's Aerial Doombot pedestal card (`1× from your seat`) | 1,508 | **0** |

Every figure keeps its line inside and outside its silhouette; the frame's total
ink went 13,467 → 8,303 px at `g1`@355 (`var/look/png/fix1/cardink-{before,after}/*-inkmask.png`,
red on the dimmed frame). A hologram — the anonymous disc, the ghosted spell —
takes no line now.

**The census** (`g1`@355, the dev server, GTX 1080, dpr 1, one whole frame with
`gl.info.autoReset` off; `var/look/fix1/census/`):

| | bloom | draw calls | triangles | programs cached | drawn | figure programs |
|---|---|---:|---:|---:|---:|---:|
| hologram | off | 79 | 27,416 | 13 | 8 | 1 |
| **comic (default)** | **off** | **81** | **27,540** | **14** | 10 | 1 |
| comic, `?stage=felt` | off | 80 | 27,438 | 13 | 9 | 1 |
| comic, `?ink=always` | off | 82 | 27,541 | 25 | 10 | 1 |
| hologram | on | 96 | 27,433 | 25 | 8 | 1 |
| **comic (default)** | **on** | **98** | **27,557** | 28 | 10 | 1 |

+2 calls (the shadows and the backdrop), +124 triangles and +1 program with
bloom off; +2 and +0 render passes with bloom on. The ink as a `CONVOLUTION`
effect measured **99** calls with bloom on: R3F's composer gave it a pass of its
own, which is why it no longer says so. The production bench's own reading at
355 with bloom off (`calls355/`): hologram 79 / 24,368, now **81 / 24,490**, the
first round 82 / 24,492 (its burst mesh), `?stage=felt` 80.

**Frame times** — `tools/arena-bench.mjs --index 316 --settle 4000`, production
builds interleaved per round with the order rotating: `c81f674` (the hologram,
`var/look/dist-before`), `49b183c` (the first round, `var/look/fix1/dist-prev`)
and this tree. p95 on the GTX 1080 (ANGLE, `NVIDIA GeForce GTX 1080/PCIe/SSE2,
OpenGL 4.5.0`), p50 on SwiftShader (`ANGLE (Google, Vulkan 1.3.0 (SwiftShader
Device (Subzero)))`); raw output in `var/look/fix1/bench/`.

| series | hologram | first round | now |
|---|---|---|---|
| GTX p95, bloom **off**, quietest (`exp-alpha/`, load 2.6–6, GPU 7–10 %) | 0.6 · 0.6 · 0.6 | — | **0.6 · 0.6 · 0.6** |
| GTX p95, bloom off (`gl316-quiet/`, load 4–9) | 0.8 · 1.4 · 2.0 — median 1.4 | 0.7 · 1.3 · 0.9 — 0.9 | 3.1 (load 9.1) · 0.8 · 0.8 — **0.8** |
| GTX p95, bloom **on** (`gl316-quiet/`) | 1.1 · 1.2 · 2.0 — median 1.2 | 1.3 · 3.1 · 1.2 — 1.3 | 2.2 · 1.3 · 1.6 — **1.6** |
| SwiftShader p50, dpr 0.6, bloom off (`ss06/`, load 11–15) | 17.0 · 16.4 · 17.0 — median 17.0 | 20.3 · 27.5 · 41.6 — 27.5 | 20.8 · 16.1 · 19.0 — **19.0** |
| unthrottled frames in 5 s, GTX, bloom off, quietest | 11,120–11,541 | — | 10,642–11,438 |

- **Bloom off is the hologram's cost now** (+0.0 ms p95 in the quietest series):
  there is no composer to draw. The first round's +1.65 (its own quiet series)
  and +2.4 (the verifier's) were the ink's composer.
- **Bloom on: +0.4 ms** p95 (medians), inside report 15 §9.1's +1.5.
- **SwiftShader at the floor: +2.0 ms** p50, inside +3; the first round's
  bloom-off ink composer was +10.5 in the same series.
- The `gl316/` series ran while another process held the GPU at 68–96 % and the
  load reached 11; its bloom-off runs of this tree read 2.3–3.1. The quietest
  series, and an A/B of this tree against a copy with `alpha: true` on the canvas
  (`dist-exp-alpha`: 0.7 · 0.6 · 0.7), show the opaque canvas costs nothing: it
  was contention.

**The raster under the comic look** (`traits.test.ts`, 1600 × 1000, table view,
both seats, standing and kneeling, centre and edge; the fewest pixels of each
prop's PAINT — visible and not under the ink — over the four):

| card | prop | your seat | opponent's | before the ink | on a halftone dot |
|---|---|---:|---:|---|---|
| Coulson | badge | 201 | **46** | 223 / 52 | 0 / 0 |
| | tie (one-sided) | 0 | 27 | 6 / 31 | 0 / 6 |
| Peggy | shield / hat | 63 / 309 | 120 / 212 | 92, 356 / 137, 253 | |
| Agent 13 | pistol / muzzle | 131 / 65 | 101 / 110 | 146, 65 / 122, 110 | |
| Agents of S.H.I.E.L.D. | squad | 994 | 672 | 1,215 / 941 | 61 / 70 |
| Quake | gauntlets | 87 | 123 | 87 / 123 | 2 / 0 |
| Fury | coat / eyepatch | 2,285 / 37 | 705 / 26 | 2,467, 65 / 781, 43 | 80, 0 / 115, 5 |
| Wasp | wings | 344 | 212 | 344 / 212 | 8 / 0 |
| Ant-Man | helmet | 275 | 204 | 275 / 204 | 12 / 10 |
| Air Force | swarmBee | 1,960 | 1,145 | 2,436 / 1,510 | 16 / 28 |
| Giant-Sized Flying Ant | wings / rider | 554 / 193 | 462 / 110 | 554, 279 / 462, 204 | |
| Bold Biochemist | coat / labBench | 2,312 / 866 | 589 / 744 | 2,422, 983 / 696, 851 | |
| A.I.M. | hood / labBench | 431 / 1,257 | 296 / 817 | 491, 1,435 / 331, 935 | |
| Doombot | laserEye / visor / jetpack / exhaust | 0 / 97 / 181 / 44 | 39 / 117 / 8 / 0 | 0, 97, 206, 44 / 39, 117, 26, 0 | |

Over every measurement: 93,399 px visible, **11,601 under the ink** (25,326
with the first round's line), 4,868 on a halftone dot. Every row keeps its bar
(≥ 48 on both seats; a one-sided detail ≥ 24 on its own side with its partner at
the bar) except **Coulson's chest badge from the front, 46 px**, 52 before any
ink: recorded in the test's `SHORTFALL` table at a floor of 44, owed to Lane
BODIES as a size (PLAN.md follow-up 17: `badge.anchors.human[0].size` 0.065 →
0.075). The raster takes every pixel a light is drawn on as lifted past paper
white (optimistic); with lights inked instead, the visor, the muzzle and the
exhaust fall under the bar from one seat each (follow-up 19).

**The look, by eye** (`var/look/png/fix1/`, before = `49b183c`, after = this
tree, both production builds on the GTX 1080):

- the hand, the stack and every hovering card are framed only by their own
  printed borders (`ab-table-g1-355-hand.png`);
- the workshop opens on the figure's front — the Doombot's visor and laser eye,
  Coulson's badge and tie, Quake's face and rings — with the card upside down
  behind it, as it is from the far seat (`ab-workshop-*-pedestal.png`);
- Quake, Fury and the soldier tokens keep a blue lit band on the stage
  (`ab-workshop-quake-pedestal.png`, `ab-table-g1-355-rank.png`);
- a summoning-sick figure is a translucent half hologram with its line
  (`ab-workshop-coulson-sick-pedestal.png`; the giant ant on your rank at 355);
- the rim's dots in view 3 are a finer screen (`ab-table-g1-355-view3-rim.png`).

**Build.** gzip of each chunk, all three builds measured the same way (node's
`zlib.gzipSync`, default level; vite's own report agrees):

| chunk | `c81f674` | `49b183c` | now |
|---|---:|---:|---:|
| entry `index-*.js` | 87.67 kB | 87.75 kB | **87.75 kB** — `WebGLRenderer` 0 times |
| `arena-scene-*.js` | 351.20 | 353.37 | 353.79 |
| `Arena-*.js` | 14.58 | 14.78 | 14.78 |
| `Post-*.js` (lazy) | 17.02 | 17.11 | 17.71 (the ink's GLSL) |
| `Workshop-*.js` | 23.64 | 24.14 | 24.39 |

The first round quoted 87.52 → 87.60 at gzip level 9; the delta, +0.08 over
the hologram's build, is the same either way, and this pass adds nothing to it.

**Tests.** `npm --prefix web test`: **887 `node --test` + 94 vitest (6 files),
0 failures** (884 + 94 at `49b183c`: two `figure-material` cases — the painted
mark, the dark lift — and one `workshop` case, the front camera and the opaque
canvas; `look`, `liveness`, `traits` and `workshop` extended). Negative controls
added this pass: the liveness clause's two new junk writes (`markPainted(…)` and
a `.blending =` write) caught in every frame-loop body; a `CONVOLUTION` flag on
the ink fails the clause; the traits test fails if the ink or the halftone
models nothing, and fails when the badge's shortfall is fixed without removing
its row.

**The gate**, `WSPORT=8710 ./tools/check-all.sh` from a deleted `bridge/out`,
tee'd to `var/check-all-look-fix1.log`: **exit 0 in 932 s**, 9c's fourteen games
371 s, the load average 15.7 at the start (other lanes' gates) and 2.2 at the
end. Inside it `node --test` ran **897 / 889 pass / 0 fail / 8 skipped** plus
**94 vitest**. The pass added no step.

**`~/forge` and `~/.forge`**, fingerprinted by the lane's own method before and
after this pass (`var/look/fp/forge-{start,end}-fix1.txt`: the jar's sha256,
`find`'s path, size and mtime over both trees, and a content sha1 over
`~/.forge`): **identical**, and identical to the first round's end fingerprint —
the jar `3c0a7c38…8e5dd9`, `~/.forge`'s content `d52664fa…`; `find -newer` over
both trees lists nothing.

### The first round

Built in the worktree `/home/justin-a/code/mtg-table-t2l`, branch `look`, from
`c81f674` (`main` at `a092d3a` plus report 15 and its `?look=comic` spike), on
2026-09-28. Three builders worked the lane in turn: the first two were stopped by
a usage limit, and each one's uncommitted work was read and kept by the next. The
commits are `e8aceff` (the prop shader moved out of `scene/props.ts`), `7d91dcd`
(the look made the default, the facing turned) and the lane's last commit (the
composer fix, the composer-aware prime, the paint-path test, the documentation
and this file).

Every number here was measured on this machine on 2026-09-28. **The machine was
shared all day.** Two other art-direction lanes were running their gates and
benches, and a personal likeness experiment kept the GTX 1080 at 59–100 %
utilisation during the final bench. Frame times are therefore given per run, with
the load average and the GPU's utilisation at the start of each run, from an
interleaved before/after series on one pair of builds. Draw calls, triangles and
programs do not depend on load.

### How to see it

```bash
npm --prefix web run dev                           # then:
#   /?replay=games/g1.jsonl#arena                  the comic look (the default)
#   /?replay=games/g1.jsonl&look=holo#arena        the hologram, as before
#   ?ink=none ?halftone=0 ?key=world ?stage=felt ?shadow=0     one part off each
#   ?ink=always                                    the ink without bloom (D129: by
#                                                  default the ink rides bloom only)
#   /#workshop?card=Nick%20Fury%2C%20Spymaster     opens on "1× front" (the figure's
#                                                  identifying side); "1× from your
#                                                  seat" is the arena's view; the A/B:
#                                                  holo · comic, and the ink (with
#                                                  bloom) / halftone / shadow / stage /
#                                                  world-key toggles; "both seats"
#                                                  shows the opponent's copy front on
npm --prefix web run build && (cd web && node_modules/.bin/vite preview --port 5191)
node tools/arena-bench.mjs --url 'http://127.0.0.1:5191/?replay=games/g1.jsonl#arena' \
    --index 316 --gpu gl                           # and without --gpu for SwiftShader
```

### What it is made of

| file | what |
|---|---|
| `web/src/arena/look.ts` | **pure**: the `LookSpec` switch and `lookFromSearch`; `MaterialLook`, the three numbers a material takes at commit; `figureLookOf` / `paintsFigure` (**D125**); `COMIC`, every number the look is drawn with; the stage's seat tones from what each seat has SHOWN; `combatStageOf` |
| `web/src/arena/perf.ts` | `LOOK_DEFAULT` (`'comic'`), `INK_DEFAULT` (`'post'`) and `postOnFloor`, the rung below the DPR floor that sheds bloom and ink together |
| `scene/figureMaterial.ts` | the one figure program (`holoMaterial.ts` until this lane; a re-export is left for one release): the hologram and the comic look mixed by `uLook`, the comic block's GLSL and its **shared** uniform objects (`COMIC_UNIFORMS`), `applyComicGlobals`, `applyLook`, `uMaterialize` (identity 1, Lane MOTION's), the paint input path (**D127**) |
| `scene/propMaterial.ts` | the prop field's shader, moved out of `scene/props.ts` (the lane's first commit) so that Lane BODIES owns `props.ts`; painted kinds take the same comic block, emitting kinds stay lights |
| `scene/Post.tsx` | `InkEffect`, the depth-edge ink inside bloom's `EffectPass` (**D122**); `Post` is `memo` and its children are memoised (the composer fix below) |
| `scene/discs.ts` | the contact shadow: `DiscField.shadowMesh`, one instanced call, bound in `DiscField.bind`, leaning away from the key (**D123**) |
| `scene/Table.tsx` | the stage: the light painted once, the seats' colours as vertex colours, the backdrop cylinder, the combat burst (**D124**) |
| `scene/prime.ts` | new: `compileFor`, the mount-time prime for the target the frames are drawn into — the composer's render target under bloom or the ink, the canvas otherwise |
| `scene/FigureLayer.tsx`, `scene/DuelistLayer.tsx` | the look written at commit: `uLook` per figure through `figureLookOf`, the shared uniforms, the dying bodies, the discs, the props, both duelists |
| `Arena.tsx`, `main.tsx` | the flags (`main.tsx` keeps the look's query keys as a string, **D49**), the background, the stage, the ink state and the floor rung |
| `layout.ts` | `seatFacingY`: π for your seat, 0 for the opponent's (**D126**) |
| `workshop/Workshop.tsx`, `workshop/Pedestal.tsx`, `workshop/facing.ts` | the toolbar's *holo · comic* and *ink · halftone · shadow · stage · world key*; the facing toggle's default is the arena's new facing |
| `web/test/look.test.ts` | new: the switch, the numbers, the hologram's jobs over the corpus, the stage's colours, the floor rung, the facing |
| `web/test/figure-material.test.ts` | new: one program per paint input, the paint path's order in the shader, the shared uniform objects, no clock |
| `web/test/liveness.test.ts` | one appended clause (below); the costume clause follows the renamed file |
| `web/test/facing.test.ts`, `traits.test.ts`, `prop-raster.ts`, `figure-pose.test.ts`, `workshop.test.ts` | follow **D126**; the raster finds the seat seen from behind by `seatFacingY` |

The spike's inverted hull is gone: no `inkHull`, no `BackSide` ink shell, no
`wantsHull`. Its measurement in report 15 §3.4 (+16 draw calls, +20,000 triangles
at `g1`@355) was not contradicted by anything here.

### The census — `g1.jsonl`@355, one whole frame

**D96**'s budget frame: 11 modelled figures, 9 prop kinds, 2 duelists. The dev
server, headless Chromium on the GTX 1080 (`ANGLE (NVIDIA Corporation, NVIDIA
GeForce GTX 1080/PCIe/SSE2, OpenGL 4.5.0)`), 1600 × 1000, `?dpr=1`, scrubbed to
355. One frame is counted with `gl.info.autoReset` off, so a composer's passes are
in the total rather than only its last one. "Programs cached" is
`gl.info.programs.length`. "Drawn" is the number of distinct programs the scene's
visible meshes were last drawn with. "Figure programs" is the same count over the
13 skinned meshes: 11 figures and both duelists.

| look | bloom | draw calls | triangles | programs cached | drawn | figure programs |
|---|---|---:|---:|---:|---:|---:|
| hologram (`?look=holo`) | off | 79 | 27,416 | 13 | 8 | **1** |
| comic, `?ink=none` | off | 81 | 27,540 | 15 | 10 | **1** |
| **comic (the default)** | **off** | **82** | **27,541** | 25 | 10 | **1** |
| hologram | on | 96 | 27,433 | 25 | 8 | **1** |
| **comic (the default)** | **on** | **98** | **27,557** | 28 | 10 | **1** |

The **before** is `main`'s hologram, measured on `c81f674`'s production build with
`?glinfo=1`: **79 draw calls and 27,416 triangles** with bloom off, the same as
`?look=holo` above. The frame is live, because the Helicarrier's `presence` bob
keeps the loop awake, so a cue's effect can move the triangle count by a few
between runs. An earlier census of the same tree read 27,535.

**Where the draw calls go.** With bloom off: the contact shadows (+1), the
backdrop (+1) and the ink pass (+1, the composer's). With bloom on: the shadows
and the backdrop (+2), and the ink costs **+0**, because `postprocessing` merges it
into bloom's own `EffectPass`. The combat burst adds +1 only while `state.combat`
has a band, and `g1`@355 has none. Every figure and both duelists are drawn by
**one program** under either look.

| line | budget | measured | |
|---|---|---|---|
| draw calls, bloom off (report 13 §8.2) | ≤ 90 | 82 | ✓ |
| triangles, bloom off (report 13 §8.2) | ≤ 30,000 | 27,541 | ✓ |
| draw calls over the hologram (report 15 §9.1) | ≤ +2, ink +0 with bloom | +2 with bloom on; +3 with bloom off (the ink is the composer's one pass) | ✓ |
| triangles over the hologram | ≤ +500 | +125 | ✓ |
| programs over the hologram, bloom off, not counting the composer's | ≤ +2 | 13 → 15 cached (`?ink=none`); 8 → 10 drawn | ✓ |
| figure programs | 1 | 1 for all 13 skinned meshes, both looks | ✓ |
| idle frames | 0 | 0 renders in 3 s on an idle workshop pedestal | ✓ |
| entry chunk | unchanged, no `three` | 87.52 → 87.60 kB gzip (`main.tsx`'s look query plumbing), no `three` | ✓ |

**Programs in the production build** — the bench's own counter, `?glinfo=1`,
`g1`@316:

| build | bloom on | comic, bloom off (the ink's composer) | comic, `?ink=none`, bloom off | hologram, bloom off |
|---|---:|---:|---:|---:|
| `c81f674` (the hologram) | 31 | — | — | 16 |
| this lane before the prime fix | 35 | 32 | 29 | — |
| **this lane, final** | **29** | **26** | **16** | **14** |

The middle row is the defect described under *The two fixes the bench found*, the
second of them.

### The two fixes the bench found

**1. The composer rebuilt every pass on every snapshot.** `@react-three/postprocessing`
2.19.1's `EffectComposer` rebuilds its passes (`new EffectPass(…)`) whenever its
`children` change identity. `Post` re-rendered with the arena on every snapshot
and every loop-mode change, and the spike built its children inline. With the
ink's depth read, the rebuilt pass relinked a program in the middle of play. The
measurement was the production build on the GTX 1080 at `g1`@316, three
interleaved runs (`var/look/bench/ab2/`):

| | p95 ms | programs during the sample |
|---|---|---|
| hologram | 10.3 · 8.7 · 8.5 | 29 → 29 |
| comic, before the fix | **35.5 · 35.6 · 39.1** | **33 → 34** in every run |

A CPU profile of 5 s of 4× playback spent 274 ms in `getProgramInfoLog`, which a
warm table never calls. `Post` is now `memo`, and its children are memoised on
the two switches. No program links during playback in any run since: every run
below reads "N → N".

**2. The mount-time primes warmed the wrong variant, and then too many.** three
compiles a program per material and per output colour space. The composer draws
the scene into a render target, whose variant is linear, while `gl.compile` in a
React effect compiles for the canvas. The primes therefore warmed a variant
nothing drew. The visible symptom was the combat burst linking a program on the
first combat.

The resumed builder's first fix compiled for both targets at every prime. That
closed the link but cached every primed program twice: **16 → 29 programs** with no
composer mounted at all. The final form is `scene/prime.ts`'s `compileFor`, which
compiles for the target the frames are drawn into. It is handed `bloom || ink`,
which the arena knows before the lazy composer's chunk loads, and it re-runs when
that changes.

`FigureLayer` (the props, the shadows and the figure warm-up), `Table` (the burst)
and `DuelistLayer` all prime through it, and a liveness clause fails a bare
`gl.compile` in any of them. That clause was negative-controlled: a bare compile
put back in `Table.tsx` turns it red. The price is a one-off compile at the moment
the composer comes or goes: the governor's floor rung, or the bloom checkbox. The
SwiftShader default runs below show it as "29 → 32" when the rung fires mid-sample.

### Frame times — `g1.jsonl`@316, production builds, before against after

This is `tools/arena-bench.mjs` at `--index 316 --settle 4000`: a 4× replay from
the first of the 61 frames with ≥ 10 modelled figures, 1920 × 993, and 5 s of
`requestAnimationFrame` deltas. The two production builds are `c81f674`'s (the
hologram, `var/look/dist-before`) and this lane's. `vite preview` served each in
turn on 5191, and the served entry chunk was checked before every run
(`var/look/tools/bench-b3.sh`, `-gl.sh`, `-ss.sh`). The raw output is in
`var/look/bench/final/`, `final2/`, `final-gl/`, `final-after2/`,
`final-gl-quiet/` and `final-ss-quiet/`. Each series interleaves before and after
on one machine, and the `-gl`/`-ss` series alternate the order every round.

**The machine.** Most of the day the CPU was shared with other lanes' gates (load
average 3.5–16.7), and for long stretches a PyTorch job held the GTX 1080 at
59–100 %. The unthrottled headless loop's frame count in 5 s ranged from 947 to
11,239 between runs of one build. The two **quiet** series were run last, after
this lane's gate, with the GPU idle (0–1 %) and the load at 3.0–5.4 for the GPU
runs. They are the numbers to quote; the medians over every run agree with
them.

**GTX 1080** (`--gpu gl`), p95 ms, each build's default look, and the frames the
unthrottled loop drew in the 5 s sample:

| series | bloom | before (hologram) | after (comic) |
|---|---|---|---|
| **quiet, 4 rounds** | **on** | 5.4 · 5.6 · 5.8 · 4.3 — **median 5.5** (≈ 2,100 frames) | 4.7 · 5.8 · 6.6 · 4.5 — **median 5.25** (≈ 1,590 frames) |
| **quiet, 4 rounds** | **off** | 1.9 · 2.4 · 2.0 · 2.0 — **median 2.0** (≈ 4,690 frames) | 4.9 · 3.7 · 3.5 · 3.6 — **median 3.65** (≈ 2,230 frames) |
| all 13 runs of each (the four series) | on | median 4.6 (1.5–12.9) | median 5.1 (1.4–12.3) |
| all 13 runs of each | off | median 1.9 (0.5–5.2) | median 3.6 (0.7–9.8) |

- **Bloom on, the default: within noise of the hologram.** The quiet median is
  −0.25 ms, and the all-runs median is +0.5 ms. Both are inside the brief's
  **+1.5 ms**.
- **Bloom off: +1.65 ms (quiet) and +1.7 ms (all runs), just over the +1.5 line.**
  With bloom off the two builds do different work: the hologram draws no
  composer, and the comic look draws the ink's composer, which renders the scene
  into a target and adds one full-screen pass. The frame counts say the cost is
  the composer's own rather than the ink's. On this headless ANGLE path any
  composer halves the unthrottled rate: the hologram with bloom draws ≈ 2,100
  frames, and the comic look with the ink alone ≈ 2,230. Adding the ink to bloom's
  composer moves ≈ 2,100 to ≈ 1,590 frames, and leaves the p95 where it was.
- Report 15 §3.4 measured post ink with bloom off at +0.1–0.2 ms p95 on the same
  GPU the evening before, against a baseline p95 of 0.6. Today's baseline is 2.0.
  This line is PLAN.md's follow-up 9. Bloom off is a choice the user makes with
  the cue strip's checkbox. The governor's floor rung drops the ink with bloom, so
  a machine that is actually slow never runs this configuration.

**SwiftShader** (the default `--gpu`), pinned at the floor (`--dpr 0.6
--no-bloom`), p50 ms:

| series | before (hologram) | after, `?ink=none` (what the floor rung leaves) | after, ink on |
|---|---|---|---|
| **quiet, 3 rounds** (load 4.9–10.2) | 20.1 · 14.4 · 14.1 — **median 14.4** | 16.6 · 20.4 · 15.1 — **median 16.6** | 22.4 · 20.3 · 19.7 — **median 20.3** |
| `final`, `final2` (5 rounds) | 20.2 · 16.1 · 14.3 · 14.3 · 16.5 | 16.1 · 16.7 · 18.0 · 19.0 · 19.9 | 24.4 · 27.5 · 28.8 · 26.3 · 24.2 |
| **median of all 8** | **15.25** | **17.35** (+2.1) | **24.3** (+9.05) |

The brief's line is "≤ +3 ms at the 0.6 floor, with ink dropped below the floor".
The measured difference is **+2.1 ms** over all eight runs and +2.2 in the quiet
series, so it holds ✓. The ink costs +4 to +9 ms p50 at the floor. The rung
below the floor is exactly where the governor drops the ink together with bloom
(`postOnFloor`).

**SwiftShader, governed** (no `--dpr`, the app's own bloom, `final` and `final2`),
p50 ms: before 18.3 · 17.3 · 14.2 · 15.1 · 14.4, after 118.5 · 20.5 · 21.0 · 21.7 ·
139.8. Neither build is fixed here: the governor steps the DPR down and then drops
the composer. In every after run the drop landed inside the 5 s sample (programs
"35 → 32" and "29 → 32"), against two of five before runs. The comic build's
composer carries bloom **and** the ink, so its frames are slower, each of the
governor's windows takes longer to fill, and the rung fires later. The state
both builds settle into is the pinned floor above. This is PLAN.md's follow-up 16.

### The facing (D126): every identity prop, read from both seats

`traits.test.ts`'s raster uses the real `figures.glb`, the real `PropField` and the
table camera at 1600 × 1000. Each cell is the fewest pixels over standing and
kneeling, alone and at a rank's edge. The bar is ≥ 48 px on both seats, or ≥ 24 on
its own side for a one-sided detail. The **before** is slice 4's table
(`docs/evidence/m7-tier2-slice4.md`), when your figures faced you. The **after**
is D126, where your figures show your camera their backs and the opponent's show
their fronts:

| card | prop | your seat, before → after | opponent's, before → after |
|---|---|---:|---:|
| Coulson | badge (chest + back) | 73 → **223** | 153 → **52** |
| | tie (one-sided, front) | 32 → 6 | 3 → **31** |
| Peggy | shield / hat | 116 / 423 → 92 / 356 | 78 / 203 → 137 / 253 |
| Agent 13 | pistol / muzzle | 162 / 120 → 146 / 65 | 99 / 70 → 122 / 110 |
| Agents of S.H.I.E.L.D. | squad | 1,142 → 1,215 | 1,035 → 941 |
| Quake | gauntlets | 118 → 87 | 86 → 123 |
| Fury | coat | 783 → 2,467 | 1,855 → 781 |
| | eyepatch (one-sided) | 56 → 65 | 42 → 43 |
| Wasp | wings | 249 → 344 | 303 → 212 |
| Ant-Man | helmet | 276 → 275 | 192 → 204 |
| Air Force | swarmBee | 2,454 → 2,436 | 1,520 → 1,510 |
| Giant-Sized Flying Ant | wings / rider | 821 / 290 → 554 / 279 | 313 / 198 → 462 / 204 |
| Bold Biochemist | coat / labBench | 634 / 1,244 → 2,422 / 983 | 1,841 / 670 → 696 / 851 |
| A.I.M. | hood / labBench | 435 / 1,358 → 491 / 1,435 | 342 / 969 → 331 / 935 |
| Doombot | visor / jetpack / laserEye / exhaust | 139 / 65 / 48 / 0 → 97 / **206** / 0 / 44 | 78 / 167 / 0 / 44 → 117 / **26** / 39 / 0 |

Every identity prop still passes from both seats, with one new one-sided
detail: **the Doombot's jetpack**, which sits on its back by nature. It reads 206
px from your seat, where you see it from behind, and 26 px from the far seat,
where you see it from the front. It joins `tie`, `laserEye`, `exhaust` and
`eyepatch` on the one-sided list, and its front partner is the `visor` at
97 / 117 px. The one-sided details simply swapped sides:

- the tie and the laser eye now read on the opponent's figures;
- the exhaust now reads on yours.

The negative control is Coulson's chest badge alone seen from behind, which is now
your seat: **4 px**. `facing.test.ts`'s own negative control is the outward
facing D126 replaced. With no turn, it fires every front-anchored beat out of the
far side of the body.

The raster counts depth coverage, not contrast. So the claim that the halftone
(at most 34 % darker, and only in the core-shadow band) never eats a one-sided
detail is argued here, not measured. That is PLAN.md's follow-up 10.

### The stage (D124)

The ground's tones, as CIE L\* of the sRGB hex (`look.ts`'s `lightnessOf`,
held by `look.test.ts`):

| tone | hex | L\* |
|---|---|---:|
| W — a warm sepia stone | `#5e5440` | 36.2 |
| U — a deep sky | `#27527a` | 33.7 |
| B — a violet slate | `#4a3d62` | 28.6 |
| R — a brick | `#6e3434` | 29.5 |
| G — a forest | `#2f5e40` | 35.9 |
| your default (teal) / the opponent's (plum) | `#21566a` / `#5a3550` | 34.0 / 27.6 |
| the centre band | `#3d3f63` | 28.0 |
| the hologram's felt, for comparison | `#10161c` → `#18222c` | 6.9 → 12.7 |

Pacho Shield (W/U) against Doom Legion (U/B) stands on `#3b5460` (L\* 34.2)
against `#414367` (29.7), once each seat has shown a card of each of its
colours. A seat that has shown nothing is its default. Only face-up cards in
public zones count; a redacted stub or a face-down card counts for nothing
(`look.test.ts`).

### The paint input path (D127)

`figureMaterial.ts`'s `makeFigureMaterial(tint, unitScale, { vertexColors, map })`
was checked in the dev page on the GTX 1080 (`var/look/tools/paintpath.json`). A
white-tinted box was drawn in the comic look into a 64 × 64 target, and its centre
pixel read back:

| paint input | compiled | centre pixel (RGBA) |
|---|---|---|
| none | ok | 255, 255, 255, 255 |
| a 1 × 1 green map (`#28dc5a`) | ok | 0, 194, 0, 255 |
| grey vertex colours (0.5) | ok | 127, 127, 127, 255 |
| both | ok | 0, 97, 0, 255 |

All four variants compile. The map and the colours each multiply the palette, and
together they multiply each other, under the same bands. No committed body carries
either input, so they stay one program (the census above).
`figure-material.test.ts` holds the order in the shader: the palette times the
colour times the map, before the hologram and the comic block read it.

### The ink at three rungs of the DPR ladder

The ink's sample distance is `COMIC.inkCssPx` (1.6) CSS pixels × the render dpr,
and it is written when the dpr changes. `var/look/png/review1/ink-dpr-06-1-15.png`
is the same crop of `g1` at `?dpr=0.6`, `1` and `1.5`: the line keeps its weight
on screen at all three. At 0.6 the cards' edges step, because the ink inks
everything that writes depth, the cards included. That is PLAN.md's question 6.

### Build, tests and the gate

- **The build**, gzip level 9 on both builds' chunks:
  - the entry `index-*.js` is 87.52 → **87.60 kB** and holds no `three`
    (`WebGLRenderer` appears 0 times), so the 2D entry chunk still carries none
    of the arena (D49);
  - `arena-scene` is 350.32 → 352.52 kB;
  - `Arena` is 14.57 → 14.77 kB;
  - `Post` is 16.95 → 17.05 kB;
  - `Workshop` is 23.62 → 24.12 kB.
- **`npm --prefix web test`: 884 `node --test` + 94 vitest (6 files), 0 failures**,
  standalone. At `c81f674` it was 870 + 94. The +14 are the lane's own:
  `look` (9 cases), `figure-material` (4) and the new liveness clause. `facing`,
  `traits`, `figure-pose` and `workshop` changed to follow D126 and the rename.
- **The gate**, `WSPORT=8710 ./tools/check-all.sh`, from a deleted `bridge/out`,
  tee'd to `var/check-all-look.log`: **exit 0 in 890 s**. 9c's fourteen games
  took 377 s. Inside the gate, `node --test` ran **894 / 886 pass / 0 fail / 8
  skipped** plus **94 vitest**. The load average was 4.8 at the start and 3.3 at
  the end. The lane added no step.

### `~/forge` and `~/.forge`

Both were fingerprinted before and after the last builder's work
(`var/look/fp/forge-start-3.txt`, `forge-end-3.txt`). The fingerprint covers the
jar's sha256, `find`'s path, size and mtime over both trees, and a content sha1
over `~/.forge`. The two are **identical**:

- the jar is still `3c0a7c38…8e5dd9`;
- `~/.forge`'s content sha1, `d52664fa…`, is the one the lane's first builder
  recorded at 00:04 (`var/look/forge-before.txt`);
- `find ~/forge ~/.forge -newer var/look/forge-before.txt` lists nothing.

Nothing in this lane wrote outside the worktree.

### The pictures

**The verification pass's**, in `var/look/png/fix1/` (production builds served by
`vite preview`, headless Chromium on the GTX 1080 at 1600 × 1000; **before** is
`49b183c`, the first round, **after** is this tree):

| file | what |
|---|---|
| `{before,after}/workshop-{fury,coulson,peggy,quake,doombot}.png` | the workshop's DEFAULT framing, the whole page: before `1× close` (the figure's back, D126), after `1× front` |
| `ab-workshop-{fury,coulson,peggy,quake,doombot}-pedestal.png` | the same, the pedestal (520 × 460 at 470, 300), before beside after |
| `{before,after}/workshop-doombot-seat.png`, `ab-workshop-doombot-seat-pedestal.png` | the Doombot from your seat — the pedestal card's ink frame gone |
| `{before,after}/workshop-coulson-sick.png`, `ab-workshop-coulson-sick-pedestal.png` | the `sick` stance: fully painted before, half hologram after |
| `{before,after}/table-g1-355.png` | the arena's table view at `g1.jsonl` frame 355 (view 1, spectator, bloom on), the whole page |
| `ab-table-g1-355-{rank,opp,hand}.png` | your rank, the opponent's, and your hand (2×, the inked card tops gone) |
| `{before,after}/table-g1-355-view3.png`, `ab-table-g1-355-view3-rim.png` | view 3 and the rim's finer dot screen |
| `{before,after}/table-g1-355-bloom0.png` | bloom off: before with the ink's composer, after with no composer and no ink |
| `{before,after}/table-g1-355-holo.png` | `?look=holo` |
| `cardink-{before,after}/*.png`, `…/*-inkmask.png` | still (reduced-motion) ink / no-ink pairs and the ink's pixels in red — the card counts above |
| `../fix1/w-table-{rank,opp}.png`, `../fix1/w-coulson.png` | the line at 1.6 against 1.2 CSS px, the thinner one losing the silhouettes |

**The first round's**, all headless Chromium on the GTX 1080 at 1600 × 1000, in `var/look/png/`
(gitignored, local). **before** is `c81f674`: the hologram, with your figures
facing you. **after** is this lane's final tree: the comic look, with your
figures facing the opponent.

| file | what |
|---|---|
| `before/workshop-{fury,coulson,peggy,doombot}.png`, `after/…` | the workshop's default framing (`#workshop?card=…`: 1× close, single seat, target dummy, bloom), the whole page |
| `before/…-pedestal.png`, `after/…-pedestal.png`, `after/ab-workshop-*-pedestal.png` | the same, cropped to the pedestal (520 × 460 at 470, 300), and before beside after |
| `after/workshop-{fury,peggy}-both.png` | *both seats*: your copy from behind, the opponent's from the front. The split view has no composer, so no ink |
| `after/workshop-fury-holo.png` (+ `-pedestal`) | `?look=holo` on the final tree: the hologram, with the new facing |
| `before/table-g1-355.png`, `after/table-g1-355.png` | the arena's table view at `g1.jsonl` frame 355 (view 1, spectator), the whole page |
| `…/table-g1-355-{rank,opp}-crop.png`, `after/ab-table-g1-355-*.png` | your rank (800 × 260 at 480, 480) and the opponent's (800 × 180 at 460, 180), before beside after |
| `after/table-g1-355-holo.png` (+ crops) | `?look=holo` at the same frame |
| `review1/ink-dpr-06-1-15.png`, `review1/arena-dpr{06,1,15}.png` | the ink at three render resolutions (the first builder's, taken before the facing turn) |
| `after-0100/` | the second builder's after pictures, taken before the composer fix: visually the same |
| `../census/final3/*.png` | the frames each census row was counted on |
