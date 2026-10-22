# Light keys and horizons of the scenery pictures

Written 2026-10-22 for the 1.13 reader and layout work: the shared horizon across both halves, and the light pass (the game-arc grade, the low-life and game-over grades, and the shared table-hour pull). Machine-readable twin: `~/scenery-packs/light.json`. Nothing was painted and no ForgeCoach file was touched.

## How it was read

**Hours** were read off the pictures themselves, on gridded contact sheets of every half, phone and panorama: the sky's colour, where the sun or moon is, and stars or aurora. The ladder in `pc-results/ART-DIRECTION.md` §2.1 and §3, and the pack-v6 ladder's prompts, were used as a check.

`key` is one of `dawn`, `morning`, `noon`, `afternoon`, `dusk` or `night`. There is no `sunset` key, so a sunset is `dusk` at about 19:00 and the afterglow is `dusk` at about 20:30. `hour` is 0–24.

**Horizons**: every one of the 124 pictures was **measured** off the picture. It is the y of the far ground line or sea line (eye level), as a fraction of the picture's height from the top, read on a 5% grid to ±0.02. `skyline` is given where the land's silhouette stands well above the horizon: the mountain biome, and mountain+plains' mesa.

Each picture also carries `horizonDerived`, the value its manifest fields alone imply:

- **pack-v8 and pairs-v2** carry only the spec's *default* `subjectBand`, the same for every picture. That gives the spec's "horizon ~57% up" (0.43) for the desktop pictures, and 0.465 for the phone pictures by the `0.25 + y/2` mapping.
- **The panoramas** carry `focal.y` 0.52.

The derived value is off by more than 0.03 on **57 of the 124** pictures (up to 0.12), so `horizon` is always the measured value. An automatic sky/ground step scan (`scan`) is kept as a cross-check only. It disagrees by more than 0.03 on 92 of them, because it locks onto ridgelines, cloud bands and foreground water edges.

pack-v8's half and phone pictures are byte-identical in pack-v9 (`git diff pack-v8 pack-v9` touches only the bridges and the accent pieces). Every `src` is relative to its pack's root: `forgecoach-scenery/pack/`, `pairs-v2/`, and `panoramas-v1/serve/pairs-panorama/`.

## pack-v8: five biomes × six stages

| Biome | Stage | Hour | Key | Horizon desktop / phone | Notes |
|---|---|---|---|---|---|
| island | 1 | 06:30 | dawn | 0.43 / 0.47 | pale cream overcast dawn, calm cove. |
| island | 2 | 12:00 | noon | 0.42 / 0.47 | sapphire noon, blue sky. |
| island | 3 | 16:30 | afternoon | 0.43 / 0.48 | lilac sky, low sun glow on the horizon. |
| island | 4 | 19:00 | dusk | 0.43 / 0.48 | sunset: sun on the sea line, rays, red-orange sky. |
| island | 5 | 20:30 | dusk | 0.42 / 0.47 | afterglow: magenta sky, first aurora. |
| island | 6 | 23:00 | night | 0.4 / 0.47 | night: aurora curtains, stars. |
| mountain | 1 | 06:00 | dawn | 0.5 (skyline 0.38) / 0.52 | grey-pink dawn. |
| mountain | 2 | 12:00 | noon | 0.55 (skyline 0.4) / 0.53 | hard blue noon. |
| mountain | 3 | 16:00 | afternoon | 0.5 (skyline 0.42) / 0.52 | hazy lilac-and-amber afternoon. |
| mountain | 4 | 19:00 | dusk | 0.48 (skyline 0.42) / 0.5 | storm-red sunset, glow behind the peaks. |
| mountain | 5 | 20:30 | dusk | 0.47 (skyline 0.4) / 0.5 | dark red dusk, lava light. |
| mountain | 6 | 23:00 | night | 0.45 (skyline 0.4) / 0.48 | night: black starry sky, fire-rimmed peaks. |
| swamp | 1 | 06:00 | dawn | 0.42 / 0.48 | grey misty dawn. |
| swamp | 2 | 12:00 | noon | 0.43 / 0.48 | sickly yellow-green haze, daylight (no sun, no blue). |
| swamp | 3 | 16:30 | afternoon | 0.47 / 0.5 | grey-violet overcast, late. |
| swamp | 4 | 19:30 | dusk | 0.45 / 0.5 | violet dusk, no sun (no sunset stage). |
| swamp | 5 | 22:00 | night | 0.5 / 0.52 | night: moon up, mist (night one stage early). |
| swamp | 6 | 23:30 | night | 0.5 / 0.53 | night: moon, carcass rim-lit. |
| plains | 1 | 06:00 | dawn | 0.42 / 0.48 | pale pink-cream dawn. |
| plains | 2 | 12:00 | noon | 0.42 / 0.49 | blue noon, high cirrus. |
| plains | 3 | 16:30 | afternoon | 0.45 / 0.5 | lilac-blue sky, halo, low light. |
| plains | 4 | 19:00 | dusk | 0.45 / 0.5 | sunset: sun on the horizon in a halo. |
| plains | 5 | 20:30 | dusk | 0.44 / 0.5 | dusk: magenta, first stars, milky way. |
| plains | 6 | 23:00 | night | 0.45 / 0.49 | star night, moon, pillars of light. |
| forest | 1 | 06:00 | dawn | 0.46 / 0.5 | pink dawn through mist. |
| forest | 2 | 12:00 | noon | 0.43 / 0.48 | green-gold midday, bright cloud. |
| forest | 3 | 17:00 | afternoon | 0.45 / 0.5 | golden late afternoon haze. |
| forest | 4 | 19:00 | dusk | 0.47 / 0.55 | amber sunset behind the giants. |
| forest | 5 | 20:30 | dusk | 0.47 / 0.5 | dusk: dark canopy, lit crowns, orange sky. |
| forest | 6 | 23:00 | night | 0.47 / 0.53 | night: starry violet sky, fireflies. |

All five biomes follow the ladder: dawn, noon, afternoon, sunset (`dusk` ~19:00), dusk, night. **The exception is swamp:** it has no sunset (s4 is a sunless violet dusk), and it is **already night at s5** (moon up), a stage early.

Desktop horizons sit at 0.40–0.50; they are 0.42–0.47 except for mountain and swamp s5–s6. Mountain sits lowest, at 0.45–0.55: its far range stands on a lower ground line with the peaks at 0.38–0.42. Phone horizons sit at 0.47–0.55.

## pairs-v2: ten pairs × three stages

| Pair | Stage | Hour | Key | Horizon desktop / phone | Notes |
|---|---|---|---|---|---|
| forest+island | 1 | 08:00 | morning | 0.4 / 0.47 | pastel pink-teal morning |
| forest+island | 2 | 13:00 | noon | 0.4 / 0.47 | hazy daylight |
| forest+island | 3 | 19:30 | dusk | 0.4 / 0.47 | magenta dusk |
| forest+mountain | 1 | 07:00 | dawn | 0.45 / 0.4 | pink dawn mist |
| forest+mountain | 2 | 13:00 | noon | 0.45 / 0.4 | hazy day |
| forest+mountain | 3 | 19:00 | dusk | 0.45 / 0.4 | red sunset sky |
| forest+plains | 1 | 07:00 | dawn | 0.47 / 0.47 | lilac dawn, sun behind the tree |
| forest+plains | 2 | 15:00 | afternoon | 0.47 / 0.47 | golden afternoon |
| forest+plains | 3 | 19:00 | dusk | 0.47 / 0.47 | sunset, embers in the tree |
| forest+swamp | 1 | 08:00 | morning | 0.47 / 0.5 | misty morning |
| forest+swamp | 2 | 15:00 | afternoon | 0.47 / 0.5 | green overcast afternoon |
| forest+swamp | 3 | 21:00 | night | 0.47 / 0.5 | violet night, lights in the trees |
| island+mountain | 1 | 07:00 | dawn | 0.46 / 0.47 | pink dawn, steam |
| island+mountain | 2 | 16:00 | afternoon | 0.46 / 0.47 | purple-blue late afternoon |
| island+mountain | 3 | 19:30 | dusk | 0.46 / 0.47 | red-violet dusk, eruption |
| island+plains | 1 | 08:00 | morning | 0.44 / 0.45 | pale overcast morning |
| island+plains | 2 | 15:00 | afternoon | 0.44 / 0.45 | lilac afternoon |
| island+plains | 3 | 20:00 | dusk | 0.44 / 0.45 | violet dusk (the phone shows stars) |
| island+swamp | 1 | 09:00 | morning | 0.47 / 0.5 | cave interior: daylight beyond the arches |
| island+swamp | 2 | 17:00 | afternoon | 0.47 / 0.5 | dim teal-violet, late |
| island+swamp | 3 | 21:00 | night | 0.47 / 0.5 | violet night; horizon is the cave's far waterline |
| mountain+plains | 1 | 09:00 | morning | 0.42 / 0.47 | pale blue morning |
| mountain+plains | 2 | 13:00 | noon | 0.42 / 0.47 | plain daylight |
| mountain+plains | 3 | 19:00 | dusk | 0.42 / 0.47 | red sunset sky; mesa top (skyline) at ~0.22 desktop |
| mountain+swamp | 1 | 07:00 | dawn | 0.4 / 0.45 | pink dawn haze |
| mountain+swamp | 2 | 16:00 | afternoon | 0.4 / 0.45 | hazy amber afternoon |
| mountain+swamp | 3 | 21:30 | night | 0.4 / 0.45 | night: stars, red glow on the rim |
| plains+swamp | 1 | 09:00 | morning | 0.45 / 0.5 | grey overcast morning |
| plains+swamp | 2 | 18:00 | dusk | 0.45 / 0.5 | blue-grey dusk, first star (dusk already at pair stage 2) |
| plains+swamp | 3 | 22:00 | night | 0.45 / 0.5 | night, crescent moon |

The pairs run on a **three-step ladder of their own**: morning or dawn, then day, then dusk or night.

Deviations:

- **plains+swamp s2 is already dusk.**
- **s3 ends at dusk in six pairs and at night in four**, with forest+swamp, island+swamp, mountain+swamp and plains+swamp the night ones. So the same stage carries two different hours.
- **Pair stage 1 is morning, while a mono half at the same two lands is noon** (biome s2).

Each pair's horizon is the same at all three stages, because each pair's stages are one composition.

## panoramas-v1: stage 3 (batch 1)

| Pair | Stage | Hour | Key | Horizon | Notes |
|---|---|---|---|---|---|
| forest+swamp | 3 | 21:00 | night | 0.47 | violet night, lantern glows. Stages 1-2: batch 2, not painted yet. |
| island+mountain | 3 | 21:30 | night | 0.45 | purple night, eruptions (pairs-v2 s3 of this pair is dusk). Stages 1-2: batch 2, not painted yet. |
| island+plains | 3 | 21:00 | night | 0.46 | aurora night (pairs-v2 s3 of this pair is dusk). Stages 1-2: batch 2, not painted yet. |
| plains+swamp | 3 | 22:00 | night | 0.47 | overcast night, moon. Stages 1-2: batch 2, not painted yet. |

All four panoramas are night. Two of them, **island+mountain and island+plains, are later than their own pairs-v2 s3 (dusk)**.

Stages 1–2 arrive with batch 2, and their rows get added here when they land. Measure each one off its picture the same way.

## For the light pass

- The table hour can be read as one of the six keys. The biome ladder maps cleanly: s1 dawn, s2 noon, s3 afternoon, s4 sunset, s5 dusk, s6 night. The only exception is swamp (dusk at s4, night at s5).
- The pair ladder is coarser and inconsistent at s3. If the pull keys on `hour`, it should read the per-picture hour, not assume one per stage.
- The horizons agree within ±0.04 of 0.45 on the desktop pictures. The outliers are mountain (0.48–0.55) and forest+island (0.40). On phones they sit at 0.47–0.55. A shared horizon line is therefore a small offset per picture, not a re-crop.
