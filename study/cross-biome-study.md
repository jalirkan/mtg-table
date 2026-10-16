# Cross-biome scenery: a design study (scenery roadmap item 3)

2026-10-15. Nothing shipped. Justin's words: "down the line, connect different manas on the same side of the board" —
scenery that bridges two biomes on one side, true to each colour, and two-colour lands that belong to both.
Pictures: `~/scenery-packs/cross-biome-study/` — **`sheet.jpg`** (the contact sheet; a copy beside this file, `cross-biome-sheet.jpg`), `today/` (the split as it is),
`A1-3.png`, `C1-3.png` (full size), `tools/split.py` and `tools/concepts.py` (how they were made), `work/` (sources, masks,
the first, rejected round of C in `work/round1/`).

## 1. What the split looks like today

Read from ForgeCoach `test-main` @2f05b15 (`src/ambience/layout.ts`, `src/ui/ambience/scenery.css`, `model.ts`):

- A side's half is shared between its biomes **by land weight** (`halfLayout`: 3 Forests : 2 Islands is 60 : 40, no live panel
  under 15%). Each slot shows its own biome's stage picture, **cover-cropped about its own focal point** — so as lands arrive,
  each slot both changes picture and slides its crop.
- Neighbours **overlap by `seamRatio` = 10% of the half's width** (CSS caps it at 14vw); the later slot fades in over the
  overlap with a left-to-right gradient mask, and a mist-coloured gradient (#bcc2cd at 24%, peaking at 62%) sits in it.
- Accents follow the slots: left corners from the leftmost biome, right from the rightmost, edges and the full-area `front-*`
  piece from the dominant one. Nothing belongs to two biomes.
- Two-colour lands: a "Land — Forest Island" (shock, dual) or a land tapping for two colours counts **½ to each** biome
  (`landBiomes`). It grows both slots by half a land; it has no picture of its own.

`today/today-three.jpg` composites three pairs exactly that way (`split.py`: the shares, the overlap, the mask, the mist, the
centre-line fade; accents left out). What it shows: **two horizons at different heights, two unrelated skies** (forest's amber
sunset against island's magenta), and a soft vertical dissolve with a pale stripe. It reads as two postcards laid edge to edge,
which is what the code does. The seam also moves with every land of either colour.

## 2. Three approaches

| | What ships | Count | Pack size | GPU |
|---|---|---|---|---|
| **A. Painted seam strip** | per biome pair, a picture ~30% of the half wide with an alpha fade at both sides, painted as ONE place (forest roots stepping into the lagoon), drawn over the overlap | 10 pairs × 2 orders (the light and the content are left/right) × levels. One per stage pair is 36 per order: impossible; **3 × 3 level bands** (young / grown / full on each side) is 9 per order, **180 strips** | ~200 KB a strip (desktop 1x+2x, phone) → **~36 MB**: a second jsDelivr ref (the live pack is 46 of 50 MB) | ~4 min a strip with the detail pass: **~12 h**, two nights |
| **B. Shared horizon and sky** | every stage picture repainted to one horizon line with its sky cut away (alpha), one sky drawn once across the half (the dominant biome's, or a blend); the seam is then only in the ground | 5 biomes × 6 stages × 2 shapes = 60 repaints, plus all 57 transition frames again | about the same as today (+ skies) | **~3 nights**; and it repaints the "levels I like" anchors |
| **C. Bridge objects** | per pair, RGBA ground accents that cross the seam, drawn like the `front-*` pieces but anchored on the seam: a river from the lagoon into the forest floor, a road from the plain up into the mountains, a causeway of bone over the swamp into the plain, lava running into the sea… | 10 pairs × 2 levels (small at the pair's first lands, grown later) = **20 pieces**, mirrored for the reverse order | ~150 KB a piece (1x+2x; a partial area) → **~3 MB**: fits in the live ref (46 → 49 MB), no phone variant needed (overlay pieces are shared) | 20 × 3 candidates + matting + detail: **~3 h**, one night |

## 3. Concepts (forest 3 lands | island 2 lands, both stage 4, desktop half 2048×640) — `sheet.jpg`

Made with the packs' own generator (DreamShaper XL + fp16-fix VAE, DPM++ 2M Karras, 34 steps, under the GPU lock), over the
split composited as today, then put back only where the approach would ship pixels.

- **A1–A3** (img2img 0.55 / 0.65 / 0.75 over the whole split, one prompt for the place, kept in a 30% strip on the seam):
  0.55 only softens the dissolve; **0.65 and 0.75 make one place** — the forest's cliff steps down into the lagoon, a tree
  stands in the shallows with its reflection, the island's floating crystals drift over the forest's side. The skies still
  differ outside the strip, so the strip is a bridge between two skies, not one sky. It is the most convincing picture, and
  it is a picture of *this* stage pair at *this* crop.
- **C1–C2** (a river shape painted at 60% into the split, img2img 0.68, kept inside the shape's feathered mask; the seam
  untouched): a turquoise river leaves the lagoon, crosses the seam and widens into the forest's foreground; C2 adds a step
  where it drops. It reads as a thing both biomes share, the sky seam stays as today, and it would survive a different stage
  on either side (ground objects carry no sky). Round 1 at 0.5 with a solid guide kept flat paint (`work/round1/`).
- **C3** (a vine bridge arched through the sky, crown to floating island): **failed** — a thin sky-crossing shape at 0.68 is
  smudged into haze. Bridges should be ground objects; anything spanning the sky would need its own cut-out painting.

## 4. Two-colour lands

- **Keep the weights ½ / ½** (the shares, the stages and the growth are right as they are, and the code is shared with the
  stats).
- **The pair's duals build its bridge (C):** a bridge appears at level 1 when the side first has both colours, and grows to
  level 2 at the second land that is *both* (a shockland, a dual, a "taps for G or U" land) — or at the pair's 4th land of
  either colour, whichever is first, so a deck without duals still gets it. The dual is then visibly the land that connects.
- **A dual widens the shared ground:** `seamRatio` 0.10 + 0.02 per dual of that pair, capped at 0.18 — the overlap (and a seam
  strip or bridge drawn in it) grows, code only.
- It sits **on the seam**, never on one side; a third colour (a triome) stays wastes-like weight and adds nothing here.
- Their own small set (a vignette per dual, 10 pictures × stages) costs like A and is not recommended.

## 5. Spec 1.8 and the recommendation

- **C needs:** a top-level optional `bridges` map keyed by the pair in alphabetical order (`"forest+island"`), each
  `{ pieces: [{ id, src, src2x, level: 1|2, anchor: "seam-bottom", widthRatio, minWidthPx, mirror: true, bytes }] }`; a budget
  (3 MB, as `MAX_AREA_BYTES`); `overlay.ts` places each adjacent pair's pieces centred on that seam (`halfSpans` already knows
  it), under the `front-*` piece, mirrored when the board's order is the reverse; `model.ts` adds a per-pair dual count for
  the level. An older ForgeCoach ignores the field (newer fields are ignored today). Pack: +~3 MB in the live ref.
- **A needs:** a per-pair `seams` map with two orders × 9 level bands, each `{ src, src2x, phone, bytes }`; the slot's seam
  draws the strip over the overlap in place of the mist gradient; the pack moves to a second ref (spec: a `parts` base URL),
  because 36 MB does not fit beside 46.
- **B needs:** half pictures with alpha skies, a half-wide `sky` per stage band, every transition frame again — a new pack
  generation, not a field.

**Recommendation: C, with the duals building the bridge.** It fits in the current ref, ships 20 pieces in one GPU night, keeps
every picture Justin already likes, survives any stage on either side, and gives two-colour lands a visible job. Estimate:
tooling and a pair-by-pair layout (the ten objects named above) 4 h, GPU one night (~3 h) plus 2 h review, ForgeCoach spec 1.8
(`bridges`, the seam anchor, the dual count, tests, a `#ambience` toggle) 5 h — **about 11 h of work plus one night**. Keep A
for later, for the two or three pairs Justin plays most, if C's ground objects feel too small once seen on the board:
~20 h plus two nights and a second ref. B is not worth its cost.
