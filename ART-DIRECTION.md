# ForgeCoach scenery — art direction and the finished set (from the PC session, 2026-10-06)

Written for the cloud coordinator at Justin's request, so the whole team works from one page.
Screenshots are in `art/final-r2/`. **The art files themselves are not in any repo** (per the
brief); they live on the PC under `~/scenery-packs/styleframes/final-r2/`, with a safe copy of the
previous round in `~/scenery-packs/keep/` and on `/mnt/e`. Every frame's recipe, prompt, seed and
licence is in `~/scenery-packs/styleframes/PROVENANCE.txt` (420 lines).

## 1. The idea, in Justin's words

The scenery **levels up with mana**. One land is a calm, simple place; each stage is more intricate,
vivid and fantastical, until the top stage is dreamlike eye candy. Mountains become "more alive and
vivid"; swamps "more grotesque". It ties mana growth to something you *see*, so a board with six
lands is a reward.

Four stages per biome, by land count: **1 · 2–3 · 4–5 · 6+**. (A six-step version was tested and
read "just", so four stays.)

## 2. The rules that make a stage feel like a step (settled over ten rounds)

1. **One thing wakes per stage, each stage in its own light** (the "A+B" ladder Justin chose):
   stage 2 wakes the *water/stone/grass/trees* under bright noon; stage 3 raises the *land* at
   sunset; stage 4 opens the *sky* at night. Each stage owns something no earlier stage has, so a
   viewer can name the stage from a thumbnail, and each stage has its own palette family.
2. **Same place throughout**: a shared stage 1, and every later stage painted *from* the one
   before it over a code-painted guide, with the skyline anchored. The forest's camera jump
   (ground level → elevated) was the one break; its stage 1 was repainted from the raised
   viewpoint.
3. **Wide elevated vista with the horizon in every stage** (~57% up). Close-up framing read as
   claustrophobic (forest r2) and was abandoned.
4. **Stage 1 is calm in content but a finished painting**: real texture in grass, sand, rock,
   water and clouds, good light, nothing empty. "Not so bare that it's ugly" — Justin. The ramp is in
   how much happens, not in how well it is painted.
5. **Detail ramps with the stage**; stage 4 is the most intricate and crisp frame of each set.
6. **No faces, no eye-dots, nothing cute** in the swamp: Justin rejected a "cartoony" titan
   ("something that makes something grotesque look cute"). The rule that fixed it: *less
   character, more carcass* — broken and asymmetric, textured (rot, roots through bone, wet
   highlights), partly swallowed by mist, murky palette, the glow only in small wrong places.
   Variant B ("carcass") + A's low green-violet glow is the shipped stage 4.
7. **Plains are about light, not buildings**: the white arches were arbitrary and cut; the ladder
   is sparkle → a vast halo and sun-dogs with rays → gates and pillars *made of light*.
8. **Original art only**: own text prompts, no franchise, artist or card names, no image inputs.
   Models: SDXL base 1.0 (CreativeML Open RAIL++-M), DreamShaper XL 1.0 (OpenRAIL++),
   `madebyollin/sdxl-vae-fp16-fix` (MIT), `xinsir/controlnet-tile-sdxl-1.0` (Apache-2.0),
   Depth Anything V2 Small for depth layers; ffmpeg via `imageio-ffmpeg` (BSD-2 wrapper, GPL
   binary — no terms on the videos). All permit using and sharing the outputs.

## 3. The five ladders (what each stage shows)

| Biome | 1 land | 2–3 | 4–5 | 6+ |
|---|---|---|---|---|
| **Island** | calm cove, pale dawn | the water wakes: sapphire noon, luminous shallows, glowing reeds | the land rises: floating islets, waterfalls, crystal flora, rose-gold sunset, god rays | the sky opens: aurora curtains, river of stars, crystal-and-lantern islets, glitter |
| **Mountain** | bare three-peak ridge, grey-pink dawn | the stone wakes: ember veins and vents under hard noon | the mountain lives: crowned volcano, bright lava rivers, storm-red sunset | the sky burns: fire-rimmed peaks, floating molten rock, lightning, fire-aurora |
| **Swamp** | still misty fen, grey dawn | the water sours: glowing green water, drowned snags, fungus lanterns | the growth turns: arching roots, dead trees, sagging veined cocoons, violet dusk | the place is wrong: a drowned titan's carcass rim-lit by a sick moon, no faces |
| **Plains** | still grass, pale dawn | the grass wakes: wind-waves of gold, wildflower bands, seed-sparkle | the light gathers: vast halo and sun-dogs around the low sun, rays, rising motes | the heavens open: star night, halos, pillars and gates of light, moonlit path |
| **Forest** | quiet young wood on open land, from a rise | the wood spreads: layered groves, a few taller glowing trees | giants rise: one dominant world-tree, mist in the valleys, living bridges, amber sunset | a sea of glowing canopy at night, crowns lit like cities, fireflies like stars |

Justin's ranking after the repaint: island, mountain, forest, plains, swamp. Known soft spots:
swamp 1→2 is the smallest step; plains 4 lost some literal halos; island 4's islets are soft at 100%.

## 4. Quality: how the frames are painted (the repaint recipe)

Justin found the first sets "too simple, too bare… in detail and texture". The fix, measured in
five bake-off rounds (`quality-r1`…`r5`):

- **Stage 1 from scratch** on DreamShaper XL at img2img 0.70 from the old frame with a
  "calm but finished" texture-naming prompt (never "simple" or "flat").
- **Later stages:** paint structure *into the source first* (broken ripple shading, surf lines,
  spray, strata — short broken marks, never continuous bands, which striped), then re-render at
  0.5 with the structure held — **skyline anchor** pasted back for landmark subjects (mountain,
  swamp carcass, forest giants), **tile ControlNet at 0.6** for many-small-element subjects
  (island islets and flora) — then a knit pass at 0.3.
- **Detail pass:** 2× upscale, 768-px tiles with 160-px feathered overlap, img2img 0.55 with the
  tile ControlNet at 0.3, a surfaces-only prompt; a gentler 0.3 pass on skies (otherwise they turn
  to flames); masked higher-strength passes where more change is wanted.
- **Ladder-safe prompts:** must-keep elements named; later-stage elements in the negative prompt;
  within 77 tokens.
- Every frame checked at 100% and at board size against its neighbours; up to three tries; model
  lettering removed by hand twice.
- Cost on the GTX 1080: 11–17 min per frame; the 20-frame repaint took one night beside the lab.

## 5. The board: what the mock-ups decided (needs the client — your side)

Justin wants the scenery to **fill each player's whole half of the board** in the public build,
cards on top (creatures on the landscape; the land row shrinks). Mock-ups
(`art/final-r2/*-board.jpg`, `readability.png`, `orientation.png`) settled:

- **Card-row scrim:** a soft dark band under the card rows only (~0.85, feathered ~30 px), sky and
  edges at full colour. Raw art fights the cards at stage 4; dimming the whole half kills the point.
- **Opponent's half upright, with a mist band along the centre line.** Rotating it 180° looks
  upside-down; without mist, their ground meets your sky hard.
- **Subject placement:** the scene's subject sits in the band 35–60% down the half, centred
  enough that the middle half of the width tells the story on a phone (which shows only that).
- **Frame shape:** 3:1 (3456×1152, with 1728×576 copies), horizon ~57%, bottom ~30% calm. Desktop
  halves (~2.7:1) crop fine; the existing 4:1 strip also works (`fit: cover` + `anchor`).
- **Two or more colours — DECIDED by Justin:** split the half side by side **in proportion to the
  lands**, each colour at **its own land count's stage** (5 Islands : 1 Mountain = a stage-3 island
  beside a stage-1 mountain); no panel under ~15% of the width; a ~10%-wide gradient seam with
  light mist; a shared horizon. Three colours still read at 3:2:2 (`art/final-r2/twocolour.jpg`).

## 6. What exists on the PC, ready to be packed

For each biome under `final-r2/<biome>/`:
- `stage1..4.png` (3456×1152) and `stage1..4-1728.png`; previous versions kept as `stageN-r1.png`.
- `layers/stage1..4/`: opaque `sky` + `far`/`mid`/`near` PNG layers cut by depth and filled behind
  nearer layers; `layers.json` gives each layer's parallax `depth` and a `css` block (sway/bob/
  parallax px) for still layers. Cut-outs that move as one unit: island islets (bob) and crystal
  flora (sway) on 2–4; plains sun+halo (3) and gates (4). None for mountain/swamp (masks drifted).
- `loop/`: one stage-4 loop per biome — WebM with alpha (0.4–0.9 MB) + MP4 fallback (60–111 KB) +
  poster + `layer.json` (`blend: screen`): island motes + aurora shimmer; mountain embers + lava
  shimmer; forest fireflies; plains rising motes + grass shimmer; swamp wisps + mist (no eye pairs).
- `previews/stage1..4.mp4` (640×220, 5 s) — what Justin reviewed.
- Earlier strip-format packs (`island-r4`, `mountain-r2`, `swamp-r3`, `forest-r2`, `plains-r2`)
  exist too, with the same layer/loop structure, if a strip-only first pack is wanted.

Spec answers we are relying on (your 2026-10-04 notes): CSS sway on a still layer does not count
against the two-moving-layers budget; stages may replace whole layer lists; up to six stages;
`fit: cover` + `anchor`; a `video` layer with `blend: screen`.

## 7. What we need from you

1. **How the pack ships.** Justin wants the lands/scenery art public (it is original and
   licence-clean) but not inside the code repo; a downloadable pack (release asset or a pack repo)
   loaded by URL/path. Say the layout you want (`scenery.json` per spec 1.1–1.3, folder names,
   size budgets) and the PC session will assemble it exactly; or point at a builder.
2. **The full-half board layout** (§5) is a client change: scrim, mist seam, subject band,
   proportional multi-colour split with per-colour stage. Spec it or say it is out of scope for now
   (the strip format still works with these frames).
3. **Next on the PC, in this order unless you object:** (a) **board accents** per
   `briefs/art-overlay.md` / spec 1.3 (corners 1024², edges 2048×256 WebP, ~2 MB a biome, CSS motion
   only; forest vines first, then swamp moss, mountain ash, island spray, plains petals/grass);
   (b) **effects** per `briefs/art-effects.md` / spec 1.2 (six events, ≤2.5 s, ≤4 MB a biome;
   bespoke art for landfall and stage-up, presets for the rest).
