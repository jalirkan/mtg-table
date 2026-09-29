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
(`personal.test.ts`). A production build carries no `personal/` string: the first
build did, in the relief checkbox's tooltip (`tools/personal/relief.mjs`) — seen
by grepping `dist` before the suite ran, and exactly what `personal.test.ts`'s
build grep fails on; the tooltip now names `relief.mjs` alone.

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
jumps — softened, not removed, by the 1.5 px blur (a follow-up).

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
its own. The figure keeps its whole ink line against the painting either way.

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
