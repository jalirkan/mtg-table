# Scenery roadmap — queued by the owner on 2026-10-12

The board scenery (ForgeCoach `src/ambience/`, spec 1.5, live pack v5.1 on jsDelivr from
`jalirkan/forgecoach-scenery@pack-v5.1`) has four pictures per biome, reached at 1 / 2 / 4 / 6 lands, so the
third and fifth land change nothing but a slot's width and a flash. The owner: "every time a player plays a
land it should change and grow slightly in that direction; I like the levels, fill in the space between."

## 0. Now (code only, lane `pc/scenery-steps` running on the PC)
Cross-fade toward the next stage by the fraction of lands between thresholds; smooth slot width; accents
thicken with progress; a lands stepper on `#ambience`; optional manifest `growth` field (spec 1.6). No art.

## 1. Next art pack: the six-picture ladder (one look per land, 1–6)
- Six stages per biome (`MAX_STAGES` is already 6), thresholds `[1, 2, 3, 4, 5, 6]` in the pack's manifest;
  stage 6 keeps the video layer where stage 4 has one today. Desktop + phone `half` pictures as pack v5.
- Made the way v1–v5 were (`~/code/forgecoach-scenery/PROVENANCE.txt`): SDXL base 1.0 fp16 + the fp16 VAE
  on the PC's GTX 1080, `~/scenery-packs/tools/sg_*.py`, stage N as img2img over stage N−1 with a coded
  guide, capped systemd user units, no web images or card art as inputs. Stages 2–4 of v5 can stay as the
  2 / 4 / 6 looks and the new ones (3 and 5, plus a richer 6) are interpolated between them by guide, so the
  owner's "levels I like" are kept as anchors.
- A GPU job of hours: run it as a lab job when the owner is not at the desk (the no-filler-while-playing
  rule), never alongside a live game. Result reviewed with the contact-sheet tools (`sg_contact`) before it
  goes to a `pack-v6` branch of forgecoach-scenery under jsDelivr's 50 MB ref limit (pack-only branch).

## 2. After that: transition frames between looks
The owner's words: "transition images for in between, so the transition from one mana to the next is
smoother, almost like a Japanese anime style animation, minimal frames, just something to colour in the
transition so it feels natural." Two or three in-between frames per stage step (keyframes, not video),
played as a short stepped sequence when a land arrives, in place of (or on top of) the cross-fade from item 0.
Needs: a manifest shape for per-step frames (spec 1.7), their budget, reduced-motion behaviour, and a
generation recipe that keeps composition fixed between frames (img2img at low strength over the midpoint
blend of the two stage pictures, same seed, same guide). Scope it after item 1 ships.

## 3. Later (named by the owner, not scoped): cross-biome scenery
Scenery objects / settings that bridge two biomes on one side of the board, true to each colour's flavour,
and two-colour lands that belong to both. A design study first.
