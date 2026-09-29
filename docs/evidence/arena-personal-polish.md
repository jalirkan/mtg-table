# Evidence — arena personal polish: one call a dressed figure, and inspect from the table (D240–D241)

Branch `arena-personal-polish`, off `main` at `9998ec5`, in the worktree
`mtg-table-t2q2`, on 2026-09-29. Everything below was run on this machine that
day, and every number names what produced it. **Nothing here holds a personal
model or card art**: the models are in the gitignored `personal/models/`, every
picture is under the gitignored `var/polish/` with its census in
`var/polish/CAPTIONS.txt`, and none is shown to anyone (D190).

The brief had two halves: the personal tier's follow-up 33 — a two-paint model
costs one draw call more than the CC0 body it replaces, which put its worst case
over report 13 §8.2's 90-call line and put the villain recording's busiest frame
at 130 calls against a 120 bench line — and a way from the table to the
workshop's inspect view.

---

## 1. What the models were, and what they are

Before (`main`'s prepare, D194): one primitive per paint, an atlas only for
paints whose UVs sit inside one tile, at fixed 512-px tiles. Read from each
`model.glb`'s own glTF JSON (`var/polish/glbinfo.mjs`):

| model | before: primitives / materials | after (D240) | the texture after | `model.glb` bytes |
|---|---|---|---|---|
| Doctor Doom | **2 / 2** (the hood; the tunic, whose UVs wrap to `u` 1.87) | **1 / 1** | an atlas 2048 × 2048 at ×0.984: the hood 1008², the tunic laid twice 2015 × 1008 | 1,083,992 → 2,822,756 |
| Agent Phil Coulson | 1 / 1 (a 12-tile 2048² atlas) | 1 / 1 | 2048 × 1536 at ×0.484, twelve regions of 496², a cutout | 3,368,264 → 3,346,656 |
| the Hulks | 1 / 1 | 1 / 1 | its own 1024² (no atlas) | 1,333,224 → 1,333,224 |
| Nick Fury | 1 / 1 | 1 / 1 | its own 512² | 326,108 → 326,108 |
| Peggy Carter | 1 / 1 (a 3-tile 1024² atlas: every paint at 496 px) | 1 / 1 | 1056 × 1568 at ×1: her 1024-px paint at its own size again | 1,497,156 → 1,765,752 |
| the MCU Wasp | 1 / 1 (a 2-tile 1024² atlas) | 1 / 1 | 1040 × 1568 at ×1 | 1,222,016 → 1,215,744 |

Every model was prepared again with the flags its manifest recorded (Coulson
`--joints rest --budget 8000` and his twelve `--drop`s, Peggy's `--drop`; the
five whose `source/` had been cleaned away were `import.mjs`'d from their own
downloads first, inside their own folders) and checked again. The geometry is
the same: `triangles.source`, `.render`, `.after`, `dropped.meshesByFlag`, the
skinned rules and the joints' pose compared equal to the old manifests, all six.
All six pass `check.mjs`, which now prints `draws: 1 mesh(es), 1 skinned, 1
material(s) — 1 draw call(s) a figure` and lists "one skinned primitive under one
material" in what it judged. The Hulks' and Fury's files are the same size as
before, not the same bytes (one paint either way; the step rebuilds the one
primitive and material). Prepare on Doom: 0.96 s.

The previews (`preview/sheet.png` in each folder) against the main checkout's,
read by eye: Doom, Coulson, Peggy and the Wasp draw the same textures on the
same parts — the tunic's repeat lines up across the seam where its UVs cross
`u` 1, and Coulson's known see-through shirt (follow-up 26) is where it was.

**The exposure** (D198) runs on the one texture after the packing, so its one gain
reaches every region; the manifest records it per region. Two gains moved with
the resample: Doom ×7.491 → ×7.752 (his surface's p90 0.0267 → 0.0258 at
×0.984), Peggy ×1.347 → ×1.299 (her 1024-px paint no longer shrunk to 496).

## 2. The texture budget

2048 px a side (`lib.mjs`'s `ATLAS_MAX`): 16 MiB of RGBA8 before mipmaps.
The packer tries every sheet width from the widest region to 2048 in steps of
16 at scale 1 and keeps the least area; only when nothing fits does it scale
every region alike (`packAtlas`). Doom is the one model that needs the whole
budget, and a quarter of it is black: the tunic laid twice is as wide as the
sheet, so the hood sits under it alone — his texture memory went from 8 MiB (two
1024² textures) to 16 MiB for the call it saved (follow-up 2). Coulson needs 12
MiB, Peggy 6.3, the Wasp 6.2, the Hulks 4 and Fury 1.

## 3. The draw calls — an exact-frame census

`var/polish/census.mjs` (scratch, CDP): headless Chromium at 1920 × 1080 on the
Vite **dev** server (the personal route is the dev server's alone),
`?bloom=0` so `gl.info.render` counts every call of the one render a frame, the
replay slider set to the frame, three frames drawn, then the counters read and
the dressed figures counted in the scene graph — a `SkinnedMesh` painting with
`uPaintOwn` 1, grouped by its figure's root bone, a mesh one call. A warm pass
over every frame first, so every wanted model has loaded. `before` is the base
tree with `main`'s models (`9998ec5`), `after` this branch; the tier `off` is
`?personal=0`. **The GTX 1080 (ANGLE GL) and SwiftShader read the same numbers in
every cell.**

| frame | tier off | tier on, before | tier on, after | dressed figures (calls each), after |
|---|---|---|---|---|
| `villain-doom-248`@392 | 128 · 37,000 tris | **130** · 44,588 | **128** · 44,588 | 2 (1, 1) — the villain duelist and Doom's card |
| `villain-doom-248`@393 | 128 · 37,546 | **130** · 45,134 | **128** · 45,134 | 2 (1, 1) |
| `g1`@316 | 83 · 26,471 | 78 · 38,707 | **77** · 38,707 | 3 (1, 1, 1) — the villain duelist, two creatures |
| `g1`@355 | 89 · 29,609 | 85 · 41,821 | **84** · 41,821 | 3 (1, 1, 1) |

Before, the villain duelist and Doom's card were 2 calls each (`[2, 2]`); after,
1 each. **The villain file swept, every one of its 401 frames** (static: the
slider stepped down from the last frame), tier on against tier off frame by
frame: before, the tier on drew MORE calls than the tier off on 257 frames (up
to +2), fewer on 135, the same on 9; after, **more on none**, the same on 259,
fewer on 142 (up to −4: a dressed figure sheds its props). The worst frame is
`@393` either way — 130 calls before with the tier on, 128 after, 128 off — and
the frames over the bench's 120 fell from 24 to 16 with the tier on, the
tier-off count. No frame of the sweep has a dressed figure over one call after.

The pedestal (`#workshop?card=Doctor Doom`, 1× front, bloom off, read from the
workshop's fiber store): 13 calls with Doom's two meshes before, **12 with one**
after, 6,504 triangles both.

## 4. The bench

`tools/arena-bench.mjs --url 'http://127.0.0.1:5217/?replay=games/g1.jsonl#arena'
--index 316 --personal --no-bloom` (its counters are read at the END of its
five-second sample at 4×, about fifty frames past `--index`, so these are not
the exact-frame numbers of §3):

| run | renderer | calls · triangles (line) | p50 · p95 · max | verdict |
|---|---|---|---|---|
| tier on | GTX 1080 | 81 · 38,637 (66,000) | 0.60 · 3.90 · 35.80 ms | OK |
| tier off (`&personal=0`) | GTX 1080 | 87 · 26,425 (30,000) | 0.50 · 3.50 · 38.20 ms | OK |
| tier on | SwiftShader | 86 · 41,825 (66,000) | 18.50 · 35.00 · 48.60 ms | FAIL: p95 |
| tier off | SwiftShader | 89 · 29,609 (30,000) | 15.70 · 33.30 · 35.30 ms | FAIL: p95 |

SwiftShader fails §9.4's p95 with the tier off too, as it did before this lane
(evidence `personal-tier.md` §18–§19); the calls and the triangles are inside
every line on both. D197's worst case — six copies of Doom filling the tier's
triangle line — was not benched again (follow-up 1).

## 5. Inspect from the table (D241)

Driven through the real page (`var/polish/shoot.mjs`, CDP pointer moves and key
events, the dev server, `villain-doom-248`@393, the GTX 1080):

1. **A face-down card** at the far end under the pointer: the credit line is the
   generic one, and the chip reads *⌕ inspect · I — a face-down or hidden card is
   never inspected — what it is is not yours to see*; nothing names the card
   (`flow-0-hidden.png`).
2. **Doctor Doom's card** under the pointer: the credit names him and the chip
   reads *⌕ inspect Doctor Doom · I* (`flow-1-arena-chip.png`); the replay is at
   frame 393.
3. **`I`**: the location becomes `#workshop?card=Doctor+Doom&view=inspect`, and
   the workshop opens on Doctor Doom in its inspect view — the personal model
   dressed (one call), the comic look (the page's `?look=` query is untouched by
   a hash change), the relief window behind him (`flow-2-inspect.png`).
4. **The workshop's ▣ arena link**: back in the arena at **frame 393**
   (`flow-3-back.png`) — the replay's cursor survived the unmount
   (`main.tsx`'s `replayCursors`).

## 6. The tests

- `personal-tier.test.ts`: the atlas helpers (the UV span, the packer's budget,
  Doom's and Coulson's sheets, no two regions overlapping with their gutters, a
  tiled paint); the paint step on the figure of boxes in three variants — two
  textured materials in one tile, the body's UVs wrapping to 1.5, two untextured
  factors — each ONE primitive under ONE material, every part's range recorded,
  a colour trace from each body vertex's atlas texel back to its own paint, and
  `check.mjs` passing it; the whole-pipeline case holds the box of two materials
  to one mesh, one primitive and one material and `check.mjs`'s new line; the
  validator refuses two primitives and a sheet over 2048.
- `personal.test.ts`: the index counts the primitives in the very `model.glb`
  (a fake glTF binary now, not a string): a two-primitive file is skipped with
  "prepare it again", a file that is not a glTF binary is skipped, and the
  reader drops a two-call entry.
- `figure-material.test.ts`: one material a figure — the atlas its map, its
  cutout its own — and no sibling.
- `inspect.test.ts`: the planner one gate at a time; the href equal to the
  workshop's `workshopHref(name, 'inspect')` and read back by `cardFromLocation`,
  `workshopViewFromLocation` and `useView`; and **the corpus made hostile**: 4,077
  frames × three pairings, **60,840 concealed placements, every one inert** (4,197
  of them over a named pose, which only the placement gate stops), 23,225
  face-up figures inspectable — and an ungated planner would have opened 10,228
  concealed cards (the negative control).
- `keys.test.ts`: the `I` row in the arena, on the board, on a replay, behind an
  ask, with Ctrl and in a text field; `Arena.tsx`'s dispatcher navigates and sends
  nothing; the table's every-row-is-dispatched sweep now covers `inspect`.
- `liveness.test.ts`: the chip's class in the layer's widget table (with its
  `pointer-events: auto` rule), and a clause for `arena/inspect.ts` — pure, the
  gate before the name, `Arena.tsx` its one caller, a hash and no act.
- `workshop.test.ts`: the workshop opens on the front unless the URL asks for
  inspect.

`npm --prefix web test` standalone: 1,099 `node --test` (1,090 pass, 0 fail,
9 skipped) + 124 vitest (8 files). `npm --prefix web run build`: the 2D entry
chunk `index-*.js` 93.75 kB gzip with no `three` in it, and no personal route or
slug anywhere in `dist` (the one hit for `hulk` is the deck file
`hulk-family.dck` in the workshop's catalog). `./bridge/build.sh`: build OK.

## 7. The gate

Twice from a deleted `bridge/out` at `GATE_JOBS=4`: `WSPORT=9190` **250.3 s**
and `WSPORT=9200` **250.9 s**, exit 0 both, 48 jobs (960.7 s and 955.3 s
summed), the load average 0.1–9.8; `node --test` 1,114 / 1,103 pass / 0 fail /
11 skipped and vitest 124 (8 files) each time (`var/check-all-polish-p1.log`,
`-p2.log`).

## 8. `~/forge` and `~/.forge`

Fingerprinted before the first command and after the second gate (every file of
`~/forge`'s top level by sha1, every file under `~/.forge` by path, size and
mtime): **unchanged**. The jar still reads `3c0a7c38…8e5dd9`.
