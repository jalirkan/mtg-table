# Evidence — the portrait standee: the painting on the table (D260–D264)

Branch `standee`, off `main` at `e2c337c`, in the worktree `mtg-table-t2st`, on
2026-09-29. Everything below was run on this machine that day, and every number
names what produced it. **Nothing here holds card art or a personal model**: the
relief cache and the models are in the gitignored `personal/`, every picture and
every scratch script is under the gitignored `var/standee/`, and none is shown to
anyone (D190, D225). The dev server ran on port 5230; the pictures were taken by
headless Chromium over CDP (`var/standee/shot.mjs`, `tools/story-shot.mjs` with an
`--eval` and a `--gpu` of its own), SwiftShader unless a line says `--gpu gl`.

The brief: report 15 §9.4's optional item and the likeness experiment's §10 —
put the relief cut from the card's own painting ON THE TABLE, under the personal
tier, where no personal model dresses a face-up creature; decide by measurement
how it faces, how tall it stands and how the snapshot's stances read on a body
with no rig; one draw call if the material allows; hard rule 8's renderer half
argued and swept.

---

## 1. The cut — what in a relief map is the subject (D260)

The relief map (`personal/relief/<id>.png`, recipe 3, D228) is red the front
layer's depth (near = 255, grown 10 px past each silhouette), green the back
layer's (the far side of the nearest silhouette, within an orbit's reach; the
painting's own depth past it), blue the front's KEEP MASK. The brief assumed the
keep mask was the subject's silhouette. **It is not**: it is 0 only on the band
the red was grown across, beside each silhouette, and 255 on both sides of it —
subject and background (`var/standee/analysis/NickFurySpymaster.png`,
`PeggyCarterSecretAge.png`, `AgentPhilCoulson.png`: the painting, red, green,
blue, 4 × (red − green), and a first cut, side by side).

Four candidate cuts, drawn over twelve paintings
(`var/standee/analysis/masks-a.png`, `masks-b.png`; columns: the painting, then
each cut, the background blue):

| cut | what it does | verdict |
|---|---|---|
| occluders: kept (blue ≥ 128) and red over green by more than `RELIEF_CLIFF` | `relief_depth.py`'s own subject test, read back off the two layers | the silhouettes are right, but past the back layer's reach (80 px) green eases back to the painting's own depth, so a large subject's interior is a ring — Peggy's torso, the Hulk's chest, Doom's robe |
| a depth threshold (red ≥ the median of what the occluders hide + the cliff) | the painting's near half | solid subjects, and the FLOOR they stand on the painting's whole width — Okoye's, Moonstone's, Quake's rubble |
| **the occluders ∪ the threshold, inside the occluders' box** | the silhouettes and the solid interior; the floor outside the box gone | **chosen** — Loki with his orb, the Hulk whole, Okoye and her spear, Moonstone alone |
| the occluders, their holes filled | a flood fill from the box's edge | fills only the holes the occluders enclose: an interior open to the box's edge stays open (the Hulk's legs, Loki's sleeves) |

The chosen cut (`arena/standee.ts`'s `standeeCutOf`): the occluders' 1st–99th
percentile box across and down, padded 3 px (D228's painted contour) and never on
the art box's outer two pixels (the card frame's line — a black bar under
Moonstone's feet in the first pictures); `near` = the median green of the
occluders + the cliff; the subject = a kept texel of the box that is an occluder
or that near; under 3% of the art box (`STANDEE_MIN_SHARE`) no standee
(`var/standee/analysis/cut-sheet-1.png`: the final cut over twelve paintings;
the dark grey inside a box is the keep mask's band, which the back layer fills on
the table).

Over **the 158 maps** of this checkout's relief cache, measured by the dev
route's own code in Node (`buildReliefIndex`, first build 357 ms for all 158, a
cached build 2 ms):

| | min | median | max |
|---|---|---|---|
| cuts | **158 of 158** | | |
| aspect (width ÷ height, the map's pixels) | 0.69 (Moonstone) | 1.37 | 2.25 |
| the subject's share of its box | 0.21 (Castle Doom, a land) | 0.51 | 0.80 |
| height at the nominal 0.85, under the width clamp | 0.32 | 0.53 | 0.85 |

What it keeps is the painting's NEAREST things, which is its subject in a
portrait and its foreground in a scene: Bold Biochemist stands with his console,
Agent 13 with her door, Coulson's painting with the window frame in front of him
(he has a personal model, which wins). §8's follow-ups.

## 2. The facing — measured, and chosen (D261)

`standee.test.ts` projects a standee at every pose a CC0 body stands in, over a
fifth of the corpus's board frames, from the three seat-safe views (table,
shoulder, low) at 1600 × 1000, with the WIDEST cut measured (2.25 × its height —
the shortest standee) and the LEAST subject fill (0.2):

| | your seat | the opponent's |
|---|---|---|
| **turned to the camera**: least subject px at 1× from the table view | **403** | **345** |
| … from the shoulder view · the low view | 808 · 590 | 469 · 375 |
| **D143's facing** (a seat's figures face the opponent): standees that show the camera their painted side | **0 of 7,341** | 4,005 of 4,005 |

traits.test's bar for an identity detail is 48 px. A painting has no back, so
under D143 your side of the table is cardboard. Pictures at `g1`@316, bloom off,
turned to the camera then flipped to D143's facing through the dev handle
(`var/standee/facing/g1-316-view{1,2,3}-{camera,seat}.png`,
`pair-view1.png`, `pair-view2.png`): on your seat the Aerial Doombot's standee is
its painting one way and a dark sliver the other.

**The price**: the relief is a bas-relief along the standee's own front, and the
standee turns with the camera about the vertical, so a sideways drag shows no
parallax; the relief shows as the camera looks down on it and on a drag that
raises or lowers the camera (§7's close pictures). A follow-up.

## 3. The height (D262 §1)

`fitHeight(pose.height, aspect)`: the pose's own height clamped so the cut's width
stays inside the rank slot (D65 strict). The corpus sweep (`standee.test.ts`,
dressed with the two extreme aspects, 0.68 and 2.25): every dressed standee
within `FIGURE_MAX_WIDTH`, never taller than its pose, its status strip anchored
at its own height + `STATUS_LIFT` (2,712 of 2,719 dressed standees carry one in a
seventh of the frames). At the table view a median standee is about 40–60 px
tall; Moonstone's figure-shaped cut stands its full height
(`var/standee/try-zoom3.png`: the Masters of Evil's rank at `@371` — Songbird,
Moonstone, Tiger Shark and the rest as their own paintings, the strips above).

## 4. The stances on a body with no rig (D262 §2)

Pictures at the table's distance, the workshop's pedestal with both seats
(Moonstone; `var/standee/stances/row-tapped.png`, `row-tapped-2.png`; each column
one option, your copy below and the opponent's above):

| option | reads as | |
|---|---|---|
| upright | standing | the control |
| lean back 0.6 / 0.95 rad | **taller** — the camera looks down, so a standee leaning back faces it squarely; the near copy grows into its own strip | refused |
| bow 0.45 / 0.75 rad toward the lens | squashed; at 0.75 a sliver | refused |
| sink 0.35 / 0.45 | shorter, upright — a picture cut in half | refused alone |
| **sink 0.25 + bow 0.3** | **shorter and bowed: the kneel's silhouette, the face still reads** | **chosen** |

Measured from the table view's camera (`standee.test.ts`, the median cut at four
stand points on both seats): standing ÷ tapped ≥ **1.37**; standing ÷ leaning
back ≥ **0.60** (it reads 1.67× TALLER): the chosen stance is at most 0.73 of
the standing silhouette on screen.

Sick is the pose's translucency (0.72, as a figure's); attacking and blocking
stand (the lunge's offset, the arrows and the combat bands); the combat freeze
washes the painting toward the figures' grey. The death is D64's body: the same
slot array, the queue's decision, falling back on its base (`standeeFallOf`, flat
by 0.7 of the death cue), fading and draining.

## 5. The budget (D263)

**One mesh, one draw call a standee**: the FRONT sheet (32 × 24) and the BACK
(16 × 12) in one buffer, told apart per vertex (`standeeSheets`): **1,920
triangles**, one material each, one program for all. The census reads
`gl.info.render` for ONE render of the exact frame (bloom off, the table view,
the dev server, `var/standee/census.sh`), and counts the standees in the scene:

| frame (bloom off, the table view) | standees on: calls · triangles (standees) | `&standee=0` | `&personal=0` (the tier off) | standees against `&standee=0` |
|---|---|---|---|---|
| `g1`@316 | 75 · 41,399 (2) | 77 · 42,775 | 83 · 26,471 | −2 calls · −1,376 |
| `g1`@355 | 80 · 43,259 (3) | 84 · 45,889 | 89 · 29,609 | −4 · −2,630 |
| `villain-masters-of-evil-33`@371 | 89 · 48,701 (9) | 96 · 47,497 | 100 · 35,689 | −7 · +1,204 |
| `villain-masters-of-evil-33`@471 | 98 · 47,351 (9) | 103 · 46,229 | 107 · 34,421 | −5 · +1,122 |
| `villain-masters-of-evil-33`@235 | 67 · 43,813 (9) | 84 · 43,896 | 88 · 32,088 | −17 · −83 |
| `villain-doom-248`@392 | 118 · 46,910 (9) | 128 · 48,656 | 128 · 37,000 | −10 · −1,746 |
| `villain-doom-248`@393 | 118 · 47,166 (8) | 128 · 49,202 | 128 · 37,546 | −10 · −2,036 |
| `villain-wakanda-232`@527 | 110 · 41,054 (10) | 119 · 40,020 | 119 · 32,128 | −9 · +1,034 |
| `villain-wakanda-232`@382 | 96 · 40,248 (9) | 106 · 41,484 | 106 · 33,592 | −10 · −1,236 |
| `villain-hulk-family-261`@427 | 99 · 40,973 (10) | 107 · 38,799 | 107 · 26,728 | −8 · +2,174 |
| `villain-hulk-family-261`@368 | 82 · 41,489 (11) | 94 · 39,126 | 98 · 27,318 | −12 · +2,363 |

The tier on draws the two seats' personal duelists (Doom the villain, Fury the
director) and, at `g1`, the dressed Peggy and Wasp — the difference between the
last two columns; the CC0 table's own numbers (`&personal=0`) are the villain
recordings' measured worsts (D222, D233: `Doom`@393's 37,546).

(`villain-hulk-family-261`@368's standee run timed out in the first census and
was re-run alone.) **Every frame draws fewer calls with standees than without**:
a standee is one call and carries none of the prop kinds its body wore (−2 to −17
on the table). Triangles move by −880 to +220 a standee against the body and
props it replaces (+2,363 for eleven at the Hulk family's `@368`, −2,630 for
three at `g1`@355); the most on any frame with standees is 48,701, under the
tier's line (30,000 + 36,000, `arena-bench --personal`).

**The bench** (`tools/arena-bench.mjs --personal --no-bloom --index <n>` against
the dev server, its counters read at the end of its five-second sample at 4× —
about fifty frames past the index, so they are not §5's exact frames;
`var/standee/bench.txt`, `bench-pairs.txt`). **Read the frame times with care**:
another lane's GPU measurement ran on this machine throughout (a load average of
6–12 on sixteen threads), so they are this day's, not a comparison (follow-up 39):

| frame | renderer | standees on | `&standee=0` | `&personal=0` |
|---|---|---|---|---|
| `g1`@316 | SwiftShader | 78 · 43,055 · p50 23.9 · p95 50.1 | 85 · 45,761 · 31.5 · 62.4 | 91 · 29,613 · 20.2 · 34.3 |
| `g1`@316 | GTX 1080 (`--gpu gl`) | 79 · 41,329 · p50 0.5 · p95 4.1 | 81 · 42,705 · 0.6 · 10.2 | 87 · 26,425 · 0.7 · 4.0 |
| `MoE`@371 | SwiftShader | 89 · 44,603 · p50 26.4 · p95 68.8 | 95 · 43,063 · 21.3 · 34.3 | 102 · 31,261 · 23.6 · 35.7 |
| `MoE`@371 | GTX 1080 | 87 · 44,731 · p50 0.4 · p95 3.1 | 95 · 43,053 · 0.6 · 3.9 | 98 · 31,243 · 1.4 · 6.1 |

Three more SwiftShader pairs at `MoE`@371, interleaved: standees on p50 31.5,
31.3 (a third timed out) · p95 57.6, 69.4; off p50 26.1, 22.5, 24.0 · p95 51.2,
50.7, 48.2. On the GTX 1080 the standee is not measurable; on SwiftShader nine
standees look like +5 to +9 ms at p50 on this loaded machine (the painting and its
depth map sampled per fragment, two sheets deep where they overlap; a run with
the map's mipmaps off read 30.8 and 25.8 — the noise is as wide as the effect).
SwiftShader fails §9.4 with the tier off too, as it did before this lane.

**Textures**: a standee's colour is the card image `CardPlane` already drew (the
same URL — the same texture: `loadCardTexture` hands the renderer's settings to
it when a later caller has one); its map (410 × 301, mipmapped: at figure size the
painting is minified 4–10×) and its back image (560 × 451) are this page's own —
about 1.7 MB of video memory a print — uploaded when a standee MOUNTS (not on the
frame it is first drawn) and disposed when the arena or the workshop unmounts.

**The build**: the 2D entry chunk is byte for byte what it was (`index-*.js`
300.43 kB, 94.68 kB gzip, on `e2c337c` and here); the standee is in the arena's
lazy scene chunk (`arena-scene-*.js` 1,371.15 → 1,381.54 kB, 393.36 → 396.34 kB
gzip), `Arena-*.js` +0.37 kB and `Workshop-*.js` +0.33 kB; no chunk names
`personal/`.

## 6. Hard rule 8 (D264)

`standee.test.ts`, over **every board frame of the 23 committed recordings**
(5,522 frames), three ways — as recorded, made HOSTILE (every back and stub given
a secret name, every third face-up creature or stack card turned face down with
one) and the hostile placements under the plain poses (a named pose on a back or
a stub: **9,241** cases only the placement gate stops) — with a spy art index and
a spy relief index that answer everything, and every fifth modelled figure
"taken" by a personal model:

- the art index was asked **33,921** times, never about a concealed card; the
  relief never about a concealed card's print;
- the standees chosen are EXACTLY the face-up, named, un-dressed figures with a
  relief, against an oracle written apart from the lookup; **15,445** taken
  figures never chosen;
- the tier off (no route) chose none and asked nothing;
- the lookup with its gates taken out asked the relief about **20,180**
  concealed prints (the negative control).

`liveness.test.ts` (its standee clause): the pure halves; the route named once,
behind `import.meta.env.DEV`, in `scene/reliefCache.ts`; `.byId.get(` in one place
(`standeeChoicesOf`) and in the order gates → `artEntryFor` → the relief, with
three spliced controls; every gate by name in `mayStand`; one reader, one loader,
`Arena.tsx` the arena's one caller; the stance at commit; the falling body's
`uLean` the one extra number of the frame loop, `standeeFallOf` in the allocation
scan.

## 7. The pictures

All 1600 × 1000 (the arena's own `?`-less URL but for the mode), bloom on, the
dev server, SwiftShader; each under the gitignored `var/standee/`:

- **The sheet** (`sheet/`, `var/standee/sheet.sh`): `g1`@316 and the Masters of
  Evil's crowded `@371`, from the table view (`-table-`) and both shoulders —
  yours (`-shoulder-you-`, view 2) and the opponent's (`-shoulder-opp-`, view 3,
  a spectator's) — each three ways: standees on (`-on`), `?standee=0`
  (`-standee0`) and the tier off (`-personal0`). Eighteen pictures:
  `g1-316-{table,shoulder-you,shoulder-opp}-{on,standee0,personal0}.png` and
  `moe-371-…`. A replay is one seat's eyes, so "both seats" is both seats' sides of
  the table seen from each end: the Masters of Evil's rank on your side stands as
  nine paintings, the far seat's figures stand beyond them.
- **A close look** (`close/`, the workshop's pedestal, `close` camera, bloom off):
  `tigershark-close-{front,drag-left,drag-up,drag-down}.png` and the same for
  `moonstone-`, with `tigershark-row.png` and `moonstone-row.png` side by side:
  the front; a 35° sideways drag (the standee turns with the camera, D261's price);
  a 25° drag up (the relief seen from above, its near parts standing out in front
  of what they hide); a 20° drag down. `tigershark-cut-edge-4x.png`: the cut edge
  at 4× — the keep mask's texel edge, the painted contour kept, no halo.
- **The stances** (`stances/`): `<card>-{table,close}-{ready,tapped,sick,blocking,
  attacking}.png` for Moonstone and Tiger Shark, both seats (your copy on the left,
  the opponent's seen from their seat on the right); `tigershark-close-stances.png`
  the five side by side; `row-tapped.png` and `row-tapped-2.png` the options §4
  compares.
- **A death** (`death/`): `tigershark-dies-{250,450}.png` — the pedestal's *dies*
  rehearsal paused 250 and 450 ms in: the body drained toward grey under the
  splat, then its painting dissolved back into its card's colour (the reverse
  summon, D148's number) as it falls; `-650` is the pedestal back at rest once
  the rehearsal ended; `tigershark-dies-row.png` the three.
- **The facing** (`facing/`), §2; **the cut** (`analysis/`), §1; the first
  pictures of the table (`try-*.png`).

## 8. What is left

Seven follow-ups, the personal tier's 35–41 in PLAN.md (each with its Open-now
row): a sideways drag shows no relief (35); the cut is the painting's nearest
things, not always its subject (36); a landscape painting stands low under the
width clamp (37); no outline on a busy table (38); the frame times need a quiet
machine, and SwiftShader's cost for a table of standees wants a floor rung if it
holds (39); NOTICE §2 and the tier's derived views (40); the likeness evidence's
§10 pointer, owed on branch `likeness` (41).

**The gate**, twice from a deleted `bridge/out` at `GATE_JOBS=4`: `WSPORT=9320`
**267.2 s** and `WSPORT=9330` **274.6 s**, exit 0 both, 48 jobs, `node --test`
1,212 / 1,201 pass / 0 fail / 11 skipped and vitest 157 (9 files)
(`var/check-all-standee-1.log`, `-2.log`). Before it: `node
tools/build-workshop-catalog.ts --check` current, `./bridge/build.sh` OK,
`npm --prefix web test` 1,197 / 1,188 pass / 0 fail / 9 skipped + 157 vitest,
`npm --prefix web run build` (§5's chunks).

`~/forge` and `~/.forge` are unchanged: the jar's sha256 is the pinned
`3c0a7c38…8e5dd9`, nothing under either was modified after the lane began (the
newest file under `~/.forge` is of 2026-09-11; its seven files were seven before
and after).
