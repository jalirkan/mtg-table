# Evidence — the relief window (D225, D226)

Branch `relief-window`, off `main` at `9dfdce4`, in the worktree
`mtg-table-t2r2`, on 2026-09-29. Everything below was run on this machine that
day; every number names what produced it. **Nothing here holds card art**: the
depth maps are in the gitignored `personal/relief/` and every picture is under
the gitignored `var/relief/pictures/` (§6) — both are personal, never committed
and never shown to anyone (D190, D225).

The brief, the owner's: *inspect a card and the art box becomes a window — the
painting with real depth and parallax as the camera moves, the figure standing
in front of it in its pose, the frame and text floating beside.* Phase 2 of the
personal tier (D196) built the flat version; this lane gives it depth.

**§1–§8 are the first cut** (commit `ee604b4`, D225, D226). **§9–§12 are the fix
pass** after the verifier's round 1 (D227): the painting is now two layers, cut
at its silhouettes, clipped to a still window. Where §1–§8 describe the map or
the plane, §9 supersedes them; the rest stands.

---

## 1. The depth step — Depth Anything V2 Small, on the art box

**The venv** is the likeness experiment's, in the main checkout, used read-only:
`var/likeness/venv` (Python 3.12.3, torch `2.14.0+cu126`, transformers 4.57.6),
the weights already in `var/likeness/cache/hf`
(`models--depth-anything--Depth-Anything-V2-Small-hf`). The tool runs it with
`HF_HUB_OFFLINE=1`, `PYTHONDONTWRITEBYTECODE=1`, HOME / TMPDIR / the CUDA cache
pinned inside `personal/relief/.cache/`. **Nothing was written to the venv or
its caches**: `find var/likeness -newer <marker>` in the main checkout printed
nothing after every run of the day (three markers, the first before the first
prototype); `personal/relief/.cache/` holds empty directories only.

**What the model is asked** (`tools/personal/relief_depth.py`): the card's
`normal` image cut to `framing.ts`'s `ART_BOX` — `(39, 76)–(449, 377)` of a
488 × 680 image, 410 × 301 px, the very pixels the inspect view draws, so depth
and colour line up with no registration. Its output (relative inverse depth,
518 × 378 at the model's input) is resized bicubically to the crop, normalised
to its own 1st–99th percentile, blurred 1.5 px and stored as 8-bit greyscale,
near = 255.

*(The map as the first cut made it. The fix pass's map — RGB, three layers,
blurred 0.75 px — is §9.)*

**The flat gate, measured.** On synthetic 410 × 301 images the model always
answers — its raw output (CPU and GPU identical to three decimals):

| image | raw min–max | 1st–99th pct | std |
|---|---|---|---|
| uniform grey 128 | 0.392–4.980 | 0.413–4.651 | 1.265 |
| uniform grey 30 | 0.095–6.429 | 0.108–5.922 | 1.737 |
| horizontal gradient | 1.404–4.046 | 1.427–3.876 | 0.629 |
| vertical gradient | 0.423–3.450 | 0.432–3.081 | 0.718 |
| Peggy Carter's art box | −0.484–6.507 | −0.012–5.340 | 1.673 |

A uniform grey gets a spread like a painting's — a floor receding upward that
the image does not contain — so a crop whose luma standard deviation is under 2
levels is not asked, and its map is 255 everywhere (the window). Over the 158
cards no painting came near the gate (`flat: false` for all 158).

**The times** (GTX 1080, shared with other sessions: 714 MiB in use, 34%
utilisation when the day began):

| | per card | notes |
|---|---|---|
| GPU, warm | **32.3 ms** median, 103.7 ms max (the first card) | 158 cards; the first call carries cuDNN's warm-up |
| CPU (`--device cpu`) | **~123 ms** (123.4–141.5 over three) | torch's own threads |
| Python start | 2.2 s import, 0.1 s model load | the first run of the day: 8.8 s import (cold page cache) |

## 2. `relief.mjs --all` — every card

```
node tools/personal/relief.mjs --all --likeness /home/justin-a/code/mtg-table/var/likeness
relief: 158 card(s), 5 current, 153 to compute
  scryfall file: 120 request(s), at most 11 in any second, smallest gap 99 ms, statuses {"200":120}
  model    depth-anything/Depth-Anything-V2-Small-hf on cuda (NVIDIA GeForce GTX 1080): import 2.235 s, load 0.106 s
relief: 153 computed, 0 failed — images 33 from the card library, 0 kept, 120 fetched;
        depth 15.4 s (median 32.3 ms a card on cuda), total 28.5 s
```

- **158 cards** — every card `web/public/art.json` indexes (the fifteen decks:
  the user's own, the four AI decks, the probes and the Reality Fracture pool) and
  the eight cards the personal models dress, all of them in `art.json`. Five had
  been computed first (the pictures' cards), so the run did 153.
- **Wall clock 28.5 s** (`/usr/bin/time`: max RSS 1.18 GB), of which the depth
  step was 15.4 s for 153 cards (the model's 32 ms plus the blur, the PNG writes
  and the 2.2 s import) and the rest the fetches. A second `--all` finds all 158
  current and exits in 0.06 s.
- **The images**: 37 of the 158 were in the card library's cache
  (`var/cards/images/<id>/normal.jpg`), read only; **121 were fetched** (120 in
  this run, one — Doctor Doom — in the first), each ONE GET of `art.json`'s
  `cards.scryfall.io` URL through the card library's `ScryfallClient`, with
  `config.json`'s User-Agent, every one a 200.
- **The pace — a finding, fixed.** The run measured **11 starts in one
  second** (smallest gap 99 ms): the tool waited 100 ms from its own clock, and a
  timer that fires a millisecond early does the rest. The CDN is not rate-limited
  (report 03 §2.4), but the brief's line is 10 a second. The pacing now waits
  **102 ms from the previous request's START as the client logged it** (the card
  library's 2 ms margin), re-checking after every sleep; `relief.test.ts` holds it
  with a fake clock whose timer fires early (30 requests, at most 10 in any
  second, the unpaced control 15), and a re-fetch of one image through the fixed
  path measured one request, the same bytes.
- **The folder**: `personal/relief/` is **14.4 MB** (14,365,251 B): 158 maps,
  3.65 MB (12.0–35.9 KB, median 22.7 KB), the 121 kept images (`source/`, 10.6 MB),
  and `index.json` (108 KB). `git status` shows none of it (`/personal/`).

## 3. The dev route

`vite` on 5215 printed, at start, the six active models and
`personal relief: 5 depth map(s) for the workshop's inspect view (card-art-derived,
dev server only — D225)` (the first five; the index is read per request, so the
153 more were served without a restart). `/personal/relief/index.json` serves per
map its file, size and art box — not the card's name, not where its image came
from — and `/personal/relief/<id>.png` only for a listed id; `source/`, `.cache/`,
an unlisted PNG, an upper-case id and every traversal spelling are 404
(`personal.test.ts`). A production build carries **no personal path in its built
code** — the source maps (`Workshop-*.js.map`, `arena-scene-*.js.map`) carry the
documented comments that name `personal/relief`, and `personal.test.ts`'s build
grep skips `.map` files by an existing, written choice (the verifier's round 1
corrected the first wording, "no `personal/` string in `dist`"). The first build
did carry one in the built code, in the relief checkbox's tooltip
(`tools/personal/relief.mjs`) — seen by grepping `dist` before the suite ran, and
exactly what `personal.test.ts`'s build grep fails on; the tooltip now names
`relief.mjs` alone.

## 4. The window

**Along the rays, not the normal.** The first cut displaced the plane along its
normal, pushed back by the relief: from the seat itself the painting's far parts
shrank toward the middle and the art box's outline went ragged (the ground at
Peggy's feet bulged out of the box's bottom-left) — a bas-relief, not a window.
The committed shader sends each vertex back along its ray from the inspect
camera's seat: at yaw 0 the relief is the flat picture (every vertex on its own
pixel; inside a grid cell the interpolation differs by less than one), and the
depth shows only when the camera moves. `var/relief/pictures/peggy-normal-vs-ray-sheet.png`
has both, at −25°, 0° and +25°.

**How deep.** `RELIEF_DEPTH` 0.3 of the backdrop's height — 0.370 world units
for a 0.85-tall body (Doom, Fury, Peggy), 0.203 for the hovering Wasp, 0.392 for
the Helicarrier's hull. At ±25° the painting's own figure stands off its ground
(Peggy against the searchlight and the tower, Doom's gauntlets before his hood,
the carrier before its clouds); the price is the rubber sheet at a silhouette —
Peggy's pistol and Fury's coat tails smear into the background where the map
jumps — softened, not removed, by the 1.5 px blur. *The verifier called the
smear on Fury and Peggy major; §9 removes it (D227).*

**The cost** (headless Chromium on the GTX 1080 through ANGLE, bloom off, the
inspect view at yaw 0, `gl.info.render` of the frame):

| | draw calls | triangles |
|---|---|---|
| Peggy, flat | 14 | 6,507 |
| Peggy, relief | 14 | 31,081 |
| Helicarrier, flat | 14 | 958 |
| Helicarrier, relief | 14 | 25,532 |

**+24,574 triangles and +0 calls** — the 128 × 96 grid for the one quad. It is
built once per card at commit; nothing of it runs per frame (the orbit moves the
camera). The pedestal draws one card; the arena draws none of this.

**The figure never meets the painting.** The window — the painting's nearest
point, the flat picture's plane — stands `INSPECT_WINDOW` = 0.8 of the figure's
height behind its stand point, and the relief only recedes from it.
`workshop.test.ts` measures every figure the catalog stands (66: 64 bodies and
the two Vehicles' hulls), its body and props at rest and its body in every clip
at eleven phases:

- **at rest**, the farthest anything reaches behind its stand point is **0.598** of
  its height (Ant-Man's Air Force's swarm);
- **in every clip but `die`**, **0.751** (Doom's Servo-Guards, the drone's attack
  wind-up at t = 0.3) — through the flat backdrop's old 0.7, which is why the
  window moved to 0.8 (the test fails if no clip passes 0.7 any more, so the
  number is kept honest);
- **`die`** falls backward, a body ~0.89 of its height and a drone **1.455**: a
  death rehearsed on the inspect view falls into the painting, as it fell
  through the flat picture (a follow-up).

The personal models, measured in the browser (their skinned vertices against the
window's plane, the driver's `MEASURE`): **Doom 0.528, Fury 0.481, Peggy 0.508,
the Wasp 0.261** world units in front of it.

**The Helicarrier** had no usable inspect view before this lane: a Vehicle's
silhouette carries the hull's THICKNESS as its height, so the composition was a
quarter of the hull and the camera sat inside it (the flat pictures of the first
run: a translucent slab across the frame). `INSPECT_HULL` frames a hull by its
length — a 1.5-long carrier as a 0.9-tall subject — and the carrier now floats in
front of its painting.

## 5. Ink, halftone, or neither

The painting is drawn unlit and unmarked. Measured by marking the relief painted
(D146's blend state) with bloom on, so the depth-edge ink could reach it
(`var/relief/pictures/peggy-ink-ab-crop.png`, `doctor-doom-ink-ab-crop.png`: left
unmarked, right marked, +25°): the painting's interior gains almost nothing —
the blurred map is too smooth for the Laplacian of 1/z to pass its threshold —
and what the ink does draw is the window's outer border and the creases at a
silhouette where the map jumps: a line the painter never drew, tracing the
reconstruction's own seam, and at an oblique angle the ragged profile of the
relief's edge. Halftone is a shading device for a lit form; the painting carries
its own. **Halftone was argued, not rendered** — there is no halftone picture;
the verifier agreed it would fight a painted image. The figure keeps its whole
ink line against the painting either way. The fix pass (§9) changed nothing
here: the two layers are drawn unlit and unmarked too.

## 6. The pictures (var/relief/pictures/, gitignored)

Made by `var/relief/shot.mjs` (headless Chromium over CDP, SwiftShader, the dev
server on 5215, the workshop's DEV handle — `select`, `setMode`, `setRelief`,
`orbitBy`) and composed by `var/relief/sheet.py`; the Chromium profile was under
`var/relief/` and deleted after each run, and the browser closed over CDP.

- `<card>-{flat,relief}-yaw{-25,0,+25}.png` for `doctor-doom`,
  `nick-fury-spymaster`, `peggy-carter-secret-agent`, `wasp-shrinking-savior`
  and `shield-helicarrier` — thirty pictures, the four personal models dressed;
- `<card>-sheet.png` — each card's six, flat above relief;
- `peggy-normal-vs-ray-sheet.png` — the first cut against the window;
- `peggy-ink-ab-crop.png`, `doctor-doom-ink-ab-crop.png` — §5's A/B;
- `nick-fury-spymaster-relief-yaw+25-fullpage.png` — the whole page, the
  toolbar's *relief* checkbox beside the camera modes;
- `*-bloomoff.png` — §4's cost frames.

## 7. The tests

- `web/test/relief.test.ts` (new): the depth step on a generated gradient and a
  flat grey, CPU, through the committed script — the crop's size, 8-bit
  greyscale, the whole range; flat → 255 everywhere and `flat: true`; ungated
  (`flatBelow: 0`) the grey gets a depth of its own (the control); a job naming a
  file outside `--out-dir` writes nothing. It runs only when
  `MTG_TABLE_LIKENESS` names a venv — here 5.8 s, green — and is skipped in the
  suite and the gate, which never look in `var/`. Also the CLI's write guard,
  file names, card selection, currency, environment and pacing, THE reader and
  the shaders' contract, and the test's own PNG codec.
- `web/test/personal.test.ts`: the relief route (index per request and cut
  down, a listed map served, nothing else, no-store), and the route named once
  behind the DEV gate.
- `web/test/workshop.test.ts`: one backdrop per face-up card with a figure and
  none for a concealed one, the relief index asked about face-up ids alone, with
  a hostile copy and an ungated control; the window clear of every figure's
  bounds; the liveness clause for `relief.ts` and `InspectStage`.
- `web/test/personal-tier.test.ts`: the relief paths ignored, the tool and the
  module not.

## 8. The gate, and `~/forge`

- `./bridge/build.sh`: build OK, the lint and its self-test and the five
  self-tests green. `npm --prefix web test`: 1,072 `node --test` (1,065 pass, 7
  skipped) + 122 vitest (8 files). `npm --prefix web run build`: no `personal/`
  string in `dist` (the grep and `personal.test.ts`'s build case).
- **The gate**, twice from a deleted `bridge/out` at `GATE_JOBS=4`:
  `WSPORT=9140` **244.6 s** and `WSPORT=9150` **244.5 s**, exit 0 both, 48 jobs
  (944.1 s and 940.9 s summed) at a load average of 2.4–8.8, `node --test`
  1,087 / 1,078 pass / 0 fail / 9 skipped and vitest 122 (8 files) each time
  (`var/check-all-relief-p1.log`, `-p2.log`). The lane added no step and no job:
  its tests are in the web step, and the relief itself is made by hand (it needs
  the venv and, for a new card, the network).
- **`~/forge` and `~/.forge`: unchanged** — the jar's sha256
  (`3c0a7c38…8e5dd9`), a listing of every path, size and mtime under each (the
  same sha256 before and after), the content of every file under `~/.forge`
  (seven, `sha1sum`), and `~/forge`'s 21,367 files. The main checkout: `git
  status` clean, and nothing under its `var/likeness/` newer than the first
  prototype's marker.

---

## 9. The fix pass — two layers, a cut, a window (D227)

The verifier's round 1 (it passed the lane, with findings): **major** — at a
silhouette the displaced plane stretched the painting like a rubber sheet, and at
±25° it was plain on Nick Fury (his face, gun arm and coat edge streaking into
the background) and Peggy Carter (her pistol and face), dominant on Fury at
±40°; **minor** — the window's edge bowed and went ragged as the camera orbited
("a curled poster"), `INSPECT_WINDOW`'s 0.049 h margin rested on eleven phases
and every second vertex, `relief.mjs`'s header claimed a CPU time nobody
measured, the inspect caption said "(flat)" over a concealed card, the evidence
overstated two things (§3's source maps, §5's halftone), and the commit's
co-author line was not the brief's. Every one is answered below or in §12.

**How it got there — each step pictured** (`var/relief/fix1/`, §11), Fury at
−25° and −40° the test case, Peggy at +25° and +40° the second:

1. **The near side grown alone** — the verifier's second option, a 6 px grey
   dilation before the blur (`d6/`, `fury-m25-before-vs-d6.png`,
   `fury-m40-before-vs-d6.png`, `peggy-p25-before-vs-d6.png`). The face and the
   gun were crisp at once; the gap then streaked the BACKGROUND across itself —
   green tower and orange fire in horizontal bands beside Fury's face, wide at
   −40°. A smear of a quieter thing, still a smear.
2. **Cut the stretch, and put something behind the cut** (`L1/`,
   `fury-3way-m25.png`, `fury-L1-zoom.png`). The front plane is not drawn at a
   vertex whose neighbours one cell away differ by more than 0.12 of the map; a
   second, larger plane stands behind it, coloured by the painting with what the
   subject hides filled in; both are clipped to the window's rectangle. No
   streak, and the window's edges came out straight at every orbit. Two faults:
   the fill was a beige average of the whole painting (the back layer's depth was
   the farthest within 64 px, so a tower beside the fire counted as "in front")
   and a 12 px band of the background rode on the subject like a sticker's
   border, cut in cell-sized teeth (`fury-head-L2.png`).
3. **The far side of the NEAREST cut** (`L2/`, `viz3-*.png`): the back layer's
   depth and fill are what lies across each texel's nearest silhouette (jump
   flooding over the cut cells), so a tower beside the sky is behind nothing.
4. **The band cut pixel by pixel** (`L3/`, `fury-head-L3.png`): the map carries
   the painting's own depth (blue) beside the grown one (red), and the fragment
   shader drops the front wherever red stands over blue — the silhouette is cut
   on its own contour, the sticker and the teeth gone. The blur went from 1.5 px
   to 0.75 px (a cliff is cut now, so it no longer needs softening against the
   grid), and the growth from 6 to 10 px (the table below).
5. **Filled from across the cuts alone** (`L4/`, `L4-fury-zoom.png`): filling from
   every unhidden pixel had pulled in the subject's own interior (a body behind a
   fist is unhidden) and printed a dark shadow of Fury behind Fury; from the
   pixels just across the cuts it is the background, soft.
6. **Grown only at a steep jump; the cut keeps the painting** (final,
   `peggy-only-diff-before-steep.png` against `peggy-only-diff-after.png`).
   Growing wherever the map rose by 0.12 over 10 px had grown Peggy's gravel
   floor, which rises toward the viewer; the band cut it and the back layer drew
   it filled and at the far side's depth — a grey smear on the ground, 1.5% of
   the painting's pixels off at yaw 0. Growth now needs a rise of 0.12 within 2 px,
   and whatever the front does not draw — cells and band — the back layer holds
   as the painting's own pixels.

**The result, as D227 states it.** `<id>.png` is RGB: red the front's depth,
green the back's, blue the painting's own. `<id>.back.jpg` is the back layer's
colour and its margin. The front is cut at every silhouette (cell and pixel), the
back is never cut, both are clipped to the window, and from the seat the two are
the card's painting.

## 10. Measured

**The growth — how many of the cut cells hold the SUBJECT's pixels** (the five
picture cards; `var/relief/fix1/measure_dilate.py`, the model on the GPU, then
`layers()` at each radius; "subject" is a pixel more than 0.12 over the farthest
within 16 px and more than 0.06 over the farthest within 3 — the near side, not
its edge):

| grown | Peggy | Doom | Fury | Wasp | Helicarrier |
|---|---|---|---|---|---|
| 0 px | 37.1% | 32.3% | 35.5% | 33.2% | 31.6% |
| 4 px | 30.6% | 25.6% | 33.3% | 25.7% | 25.3% |
| 6 px | 13.2% | 11.5% | 20.7% | 11.5% | 11.4% |
| 8 px | 4.7% | 3.9% | 12.0% | 2.1% | 2.5% |
| 10 px | 5.9% | 3.6% | 10.8% | 2.4% | 2.2% |
| 12 px | 6.5% | 3.6% | 10.3% | 2.6% | 2.5% |

It stops falling at 8–10 px; what is left is the measure's own (a subject's inner
slopes — Fury's fist over his coat). 10 px is the recipe. On a synthetic square
`relief.test.ts` asserts none at all (and more than 100 px ungrown, its control).

**From the seat, the relief is the flat picture** — the inspect view at yaw 0,
bloom off, everything but the inspect group hidden (`only/`), relief against flat:

| | pixels off by > 24 levels | by > 8 | the largest |
|---|---|---|---|
| Doctor Doom | 0.40% | 1.02% | 129 |
| Nick Fury | 0.69% | 1.61% | 185 |
| Peggy Carter | 0.53% | 1.02% | 163 |
| Wasp | 0.45% | 0.81% | 129 |
| S.H.I.E.L.D. Helicarrier | 0.40% | 0.76% | 179 |

The differences are one- and two-pixel seams along the cuts (the back image is a
JPEG) and the window's one-pixel outline (`fury-only-diff.png`). With the figures
in, Wasp and the Helicarrier read 5.9% and 3.7%: their hover, between two
screenshots.

**The cost** (headless Chromium on the GTX 1080 through ANGLE, bloom off, yaw 0,
`gl.info.render`):

| | draw calls | triangles |
|---|---|---|
| Peggy, flat | 14 | 6,507 |
| Peggy, relief | 15 | 55,657 |
| Helicarrier, flat | 14 | 958 |
| Helicarrier, relief | 15 | 50,108 |

**+49,150 triangles and +1 call** — the one grid drawn twice (the first cut:
+24,574 and +0). The inspect view's alone; the arena draws none of it.

**Every card, again** (`node tools/personal/relief.mjs --all --force --likeness
/home/justin-a/code/mtg-table/var/likeness`, `var/relief/fix1/relief-all.log`):

```
relief: 158 card(s), 0 current, 158 to compute (personal tier, D225 — never committed)
  model    depth-anything/Depth-Anything-V2-Small-hf on cuda (NVIDIA GeForce GTX 1080): import 2.172 s, load 0.103 s
relief: 158 computed, 0 failed — images 37 from the card library, 121 kept, 0 fetched; depth 43.5 s (median 29.9 ms a card on cuda), total 43.5 s; personal/relief/ is 30.45 MiB
```

- **43.5 s wall** (`/usr/bin/time`: max RSS 1.20 GB) for 158 cards — every card
  of the fifteen decks, the four AI decks and the user's own among them, and the
  eight the personal models dress. The model **~30 ms a card** (median 29.9, the
  first 95), the back layer **~0.13 s** of numpy (median 132 ms, max 153).
  **Nothing was fetched**: 37 images from the card library's cache, 121 from the
  tool's own copies of the first run.
- **The CPU path** (`--device cpu`, five cards): the model 105–141 ms, the back
  layer ~134 ms — ~0.24–0.28 s a card. `relief.mjs`'s header now says so (it
  said "~0.4–1 s", which nobody had measured).
- **Idempotent and deterministic**: a second `--all` finds 158 current in
  0.06 s; Doctor Doom recomputed with `--force` gave byte-identical files.
- **The folder** `personal/relief/`: **31,927,790 B (30.45 MiB)** — 158 maps
  9,748,284 B (RGB PNGs, 23–104 KB, median 60 KB), 158 back images
  11,399,200 B (JPEGs, 37–127 KB, median 70 KB), the kept images 10,608,134 B,
  `index.json` 172,172 B. Per map the cut cells are a median 18% of the painting
  (0.3–35%) and the filled texels 33% (9–67%). `git status` shows none of it.
- **The venv**: `find /home/justin-a/code/mtg-table/var/likeness -newer <marker>`
  printed nothing after any run of the fix pass (four markers). Every picture
  script ran the venv's python with `-B` and `PYTHONDONTWRITEBYTECODE=1`.

**The window's distance, densely** (`workshop.test.ts`): 13 distinct bodies,
every clip but `die`, at 61 phases and every keyframe the clip has, every vertex —
9,824 clip phases: **0.752 h** at most (Doom's Servo-Guards, the drone's attack
at 0.333 — a keyframe; the coarse pass had 0.751 at 0.3). `INSPECT_WINDOW` stays
0.8, and the test now fails if the densest reach comes within 0.02 of it (its
control: a margin of 0.06 fails, naming the drone).

## 11. The pictures (`var/relief/fix1/`, gitignored)

Made by `var/relief/fix1/shot.mjs` (the verifier's driver, copied: headless
Chromium over CDP through ANGLE on the GTX 1080, the dev server on 5215, devtools
on 9158, its profile under `var/` and deleted, the browser closed over CDP; a new
`--only-inspect` hides everything but the painting), composed by `ab.py`,
`sheets.py`, `viz.py` and `diff.py`, measured by `measure_dilate.py`.

- `final/<card>-{flat,relief}-yaw{-40,-25,0,+25,+40}.png` for `doctor-doom`,
  `nick-fury-spymaster`, `peggy-carter-secret-agent`, `wasp-shrinking-savior`
  and `shield-helicarrier` — fifty pictures, the four personal models dressed;
  `final/<card>-sheet.png`, flat above relief at the five angles;
  `final/<card>-before-after.png`, the first cut above the fix at ±25° and ±40°;
  `final/*-bloomoff.png`, the cost frames.
- `before/` — the first cut's relief at the same five angles, taken before
  anything changed.
- `d6/`, `L1/`–`L4/` — the steps of §9, and their comparison sheets:
  `fury-m25-before-vs-d6.png`, `fury-m40-before-vs-d6.png`,
  `peggy-p25-before-vs-d6.png`, `fury-3way-m25.png`, `fury-L1-zoom.png`,
  `fury-head-L2.png`, `fury-head-L3.png`, `L3-sheet.png`, `L4-fury-zoom.png`,
  `L4-peggy-zoom.png`, `L4-doom-zoom.png`, `wasp-heli-zoom.png`.
- `viz-fury*.png`, `viz2-*.png`, `viz3-*.png` — a map's crop, red, green, the cut
  cells and the back image, side by side.
- `only/`, `fury-only-diff.png`, `peggy-only-diff-before-steep.png`,
  `peggy-only-diff-after.png` — §10's yaw-0 measure.

**What looked right.** Fury's face, pistol and coat edge are crisp at ±25° and
±40°, and what his silhouette uncovers is soft background; Peggy's pistol and
head are crisp; Doom's three Dooms step apart without a streak; the Wasp's
painted arm stays whole; the Helicarrier's hull stands before its clouds. The
window's edges are straight at every angle on every card.

**What is still the method's.** Past an edge at 40° the margin is plainly a blur
— it is what lies past the frame, soft on purpose. Behind a large subject at 40°
the fill is broad and sometimes one colour (Fury's coat at −40°): two layers and
a soft fill are the smallest layered image there is. From the seat itself the
relief shows nothing new — the verifier's reading, and D226's design; a way to
show it without a drag is a follow-up (PLAN.md). The floating frame panel still
crosses the painting at +25° and +40° and the Helicarrier's hull still overhangs
its painting's left edge (D196's layout; follow-ups).

## 12. The fix pass: tests, controls, the gate, `~/forge`

**The tests** (all in `npm --prefix web test`):

- `relief.test.ts` — **the two layers through the Python step** on the synthetic
  gradient and flat grey (the map RGB and the crop's size; red never under blue,
  green never over it; the back JPEG the crop plus 75 px a side; a flat grey 255
  in every layer, nothing cut, nothing filled; a back file anywhere but beside its
  map refused before anything is written), and **`layers()` on a synthetic
  depth** — a near red square on a far blue ground with a floor ramp: grown, the
  cut holds none of the square's pixels (ungrown, 100+: the control); red grown
  past the silhouette and blue not; the back at the far side under the square,
  wearing the ground's blue there; wherever the front is cut the back keeps the
  painting's pixels; a ramp rising 0.14 over 10 px is neither cut nor grown. Both
  skip unless `MTG_TABLE_LIKENESS` names a venv; with the likeness venv all eleven
  cases of the file passed. Also: the recipe and both files in what counts as
  current (a map made before the back layer, another cliff, another grid:
  stale), the reader's back layer (dropped when missing, misnamed or unevenly
  margined), the shaders' cuts and window, and the two layers' boxes and the
  window's axes as numbers.
- `personal.test.ts` — the route serves `<id>.back.jpg` when the index lists it
  (`image/jpeg`, `no-store`) and 404s it otherwise (a map with no back, a
  misnamed back, `.back.png`, `.jpg`, a `.part`, under `source/`); the start line
  counts the maps made before the back layer.
- `workshop.test.ts` — the plan carries the back image for a face-up card and
  nothing for a concealed one (the hostile copy and the ungated control
  unchanged); the dense figure reach; the liveness clause: one grid, one material
  maker called inside the commit-time memo, no frame hook and no uniform written
  after commit, the back image only from the plan, two layers OR the flat plane.

**Live** (`var/relief/fix1/probe.mjs`, the verifier's probe with the back layer
counted; headless Chromium through ANGLE, the dev server on 5215): Doctor Doom
and Nick Fury in inspect each draw ONE inspect group of three planes — the
front (`inspect:relief`), the back (`inspect:relief-back`) and the frame — and
fetch their own map and back image and nothing else; `hidden:faceDown` and
`hidden:redacted` draw no group and fetch nothing, the toggle is disabled and
the caption reads *inspect: no art to inspect (concealed or no figure)* (the
verifier's minor; it read "(flat)"); the toggle off draws the flat plane (two
planes), on again the two layers, from the cache.

**The controls, re-run** (each broken in place, run, restored; `git diff` after
showed only the intended changes):

| broken | what failed |
|---|---|
| the flat gate (`if False and luma_std < flat_below`) | both step cases: "a flat image is reported flat" |
| `DILATE_PX = 0` | `layers()`: "grown, the cut falls on the ground's pixels" |
| growth on any rise over 10 px (no steep test) | `layers()`: "nor cut pixel by pixel" |
| `inspectSourceOf` without its face-up gate | "hidden:faceDown#hostile-0: a concealed card looked its art up" |
| `DENSE_MARGIN = 0.06` | "densely sampled, card:Doom's Servo-Guards attack@0.333 reaches 0.752 h — within 0.06 of the window" |
| the pixel cut out of `RELIEF_FRAGMENT` | the shaders' case |

**`./bridge/build.sh`**: build OK, every self-test green. **`npm --prefix web
test`**: 1,075 `node --test` (1,066 pass, 9 skipped) + 122 vitest (8 files).
**`npm --prefix web run build`**: no personal path in the built code — and the
relief's reader and loader are not in it at all (the route's base is `null` in a
build, and the bundler drops what only it reached); the source maps carry the
comments, as §3 says.

**The gate** from a deleted `bridge/out` at `GATE_JOBS=4`: `WSPORT=9150`
**262.3 s**, exit 0, 48 jobs (1,003.0 s summed) at a load average of 5.1–13.4,
`node --test` **1,090 / 1,079 pass / 0 fail / 11 skipped** and vitest 122 (8
files) — `var/check-all-relief-fix1.log`. The brief's `WSPORT=9140` was tried
first and failed at 10a in 0.0 s: another worktree's gate had its step-10 servers
on 9135–9141 at that moment, 10a's health poll on 9140 was answered by one of
them, and 10a's own log had no `WS LISTENING` line
(`var/check-all-relief-fix1-collided.log`); 9150–9156 were free.

**`~/forge` and `~/.forge`: unchanged** across the fix pass's JVM runs — the
jar's sha256 (`3c0a7c38…8e5dd9`), a listing of every path, size and mtime under
each (the same sha256 before and after), `~/forge`'s 21,367 files and the content
of `~/.forge`'s seven (`var/relief/fix1/forge-fp/`). The main checkout: `git
status` clean, and nothing under its `var/likeness/` newer than any of the fix
pass's four markers.
