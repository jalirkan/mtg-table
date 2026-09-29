# Evidence — the portrait standee: the painting on the table (D260–D264)

Branch `standee`, off `main` at `e2c337c`, in the worktree `mtg-table-t2st`, on
2026-09-29. Everything below was run on this machine that day, and every number
names what produced it. **§9 is the fix pass**, after the verifier: where it
supersedes a number above (the legibility of §2, the tapped stance of §4, the
budget of §5, the pictures of §7), that section says so. **Nothing here holds card art or a personal model**: the
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

traits.test's bar for an identity detail is 48 px. **Superseded by §9**: those
two numbers count subject pixels at the nominal height against a prop's bar, and
the verifier found standees that pass them and do not read (the Aerial Doombot's
flight at a drone's height, a sliver on both seats) — the fix pass replaced them
with a legibility floor measured on the stand point, kneeling, and a raster of
real frames. A painting has no back, so under D143 your side of the table is
cardboard. Pictures at `g1`@316, bloom off,
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
the standing silhouette on screen. **Superseded by §9**: that count took the box
from its base, below the table; drawn from the table's plane up, this stance read
0.39–0.59 of the standing height — the sliver the verifier saw — and the fix pass
chose a fifth sunk and 6° of bow (0.68–0.78).

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

**The build**: the 2D entry chunk is the same size as it was, and the same code
apart from the lazy chunks' hashed names in its import map (`index-*.js` 300.43 kB,
94.68 kB gzip, on `e2c337c` and here; the verifier's diff of the two builds was 84
bytes, all six lazy chunks' names); the standee is in the arena's
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
"taken" by a personal model (since §9 the oracle carries the legibility floor
too, written apart from the lookup, and the counts below are the fix pass's):

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

- **The sheet** (`sheet-first/` since the fix pass retook `sheet/` at `?dpr=1` — §9.6; `var/standee/sheet.sh`): `g1`@316 and the Masters of
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
  at 4× — the keep mask's texel edge and the painted contour kept, with a thin
  fringe of the background's teal round the body and a few isolated specks at the
  box's left and right edges (the verifier's reading; "no halo" was wrong). The fix
  pass's rim is outside that fringe (§9's `close/`).
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
width clamp (37); no outline on a busy table (38 — closed by §9's rim); the
frame times need a quiet machine, and SwiftShader's cost for a table of standees wants a floor rung if it
holds (39); NOTICE §2 and the tier's derived views (40); the likeness evidence's
§10 pointer, owed on branch `likeness` (41). §9 added 42 (a standee at the
legibility floor's edge changes body when its rank moves it).

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

---

## 9. The fix pass — after the verifier (2026-09-29)

The verifier's one blocker: some standees **did not read as their card** at 1×
from the table view — both Aerial Doombots at `g1`@316 (a thin grey-green sliver
on each seat, where the CC0 drone reads), and at the Masters of Evil's @209 the
opponent's sick Doombot and tapped Agent 13 standing over their own cards' faces
and melting into the painting behind them — while §2's numbers (403 / 345 px of
subject against a prop's 48) passed every one. Its one major: §5 said a
standee's triangles are the CC0 table's, and with the personal models' own delta
taken out the standees put the Masters of Evil's table past D233's accepted
worst, with nothing holding them. And five minors: the p95, the build's "byte for
byte", two stale file names, the workshop badge's untested gates, the cut edge's
"no halo". Each is below; D261–D264 carry the amendments.

Every picture here was taken at **`?dpr=1`** — the render resolution a 1× screen
draws — where §7's were at SwiftShader's ladder rung (0.6), which blurs a standee
further than any real screen would. The canvas is 1600 × 946 inside the 1600 ×
1000 window (the replay bar is 54 px); the floor is measured on the 1600 × 1000
canvas traits.test's raster uses, 6% larger, as every other raster in the repo.

### 9.1 The legibility floor (D261, amended)

**The measure.** A standee's subject as drawn at 1× from the table view, at its
own stand point, posed as `STANDEE_VERTEX` poses it (turned to the camera, its
height refitted to its cut, its stance's bow about the base and its sink cut at
the table's plane): the side of a square of its drawn pixels — the box's drawn
area × the cut's fill (`share` over the box). Judged **kneeling**, the smallest a
snapshot draws a standee, so a card never changes body when it taps.

**The number, from pictures.** Seven crowded frames (`g1`@316 and @355, the
Masters of Evil's @209 and @371, the Hulk family's @368, Wakanda's @382, the Doom
Legion's @393), the table view at `?dpr=1` with no floor, every standee on both
seats cropped at 1× and shown 3× with its kneeling, current and standing sizes —
49 standees, sorted by size (`var/standee/fix/floor-contact.png`, in four parts
`floor-contact-{0..3}.png`; the scripts `var/standee-fix/boxes.ts`, `contact.py`):

| kneeling size (px) | the standees | reads? |
|---|---|---|
| 20 | Wakandan Drone Flock (you) | no: a smear of wings |
| 23–24 | Aerial Doombot (seven, both seats, ready, sick, tapped and attacking) | no: a diagonal sliver, or its own card's painting over its card |
| 25 | Doom's Servo-Guards, Baron Strucker | no: a smudge |
| 28 | A.I.M. Bot (sick) | no: a flat grey strip |
| 31 | Volcanic Villain | yes: the lava figure |
| 32–34 | Loki, the Giant-Sized Flying Ant (both seats), Songbird, Gallant Citizen, Brawn, Bold Biochemist and A.I.M. Scientists (the far seat) | yes |
| 35–48 | the Masters of Evil's rank, Wolverine, Storm, Moonstone, Agent 13 … | yes |

So **`STANDEE_MIN_PX` = 30**. Over every board frame of the corpus with this
checkout's 158 cuts (no personal model taking a card; `var/standee-fix/corpus2.ts`)
it keeps **8,887 of 10,740** standee placements on your seat (83%) and **2,952 of
4,678** on the opponent's (63%); seven cards never stand — the Aerial Doombot, the
Wakandan Drone Flock, Doom's Servo-Guards, the A.I.M. Bot, Yellowjacket, Black
Panther, Vanguard, and Wasp (whose personal model dresses her). **A card changes
body only when its stand point moves it across the floor**: 10 times over the
corpus (`flips.ts`: the Volcanic Villain 3, Peggy Carter 3, She-Hulk 2, Bold
Biochemist 1, Baron Strucker 1). Measured on the table's centre line instead it
was 6, but that stood the Volcanic Villain down everywhere; PLAN.md's follow-up 42.

**The raster** (`standee.test.ts`, *THE legibility floor, rasterised on real
frames*): the standee rasterised through the table view (pixel centres inside the
drawn subject — a synthetic figure the box's full height and `fill` of its width)
at every stand point of three committed frames, on both seats:

- `g1`@316 with a flight scene's cut (1.31 × its height, a third filled): every
  drone on both seats kneels at 23–24 px and is its CC0 body — each passes the
  first measure's 48 px of subject (the control);
- the Masters of Evil's @209: the opponent's sick drone (22 px) is its CC0 body;
  with a portrait cut (0.8, two thirds filled) the opponent's tapped figure stands
  at 47 px;
- the Masters of Evil's @371 with the median cut (1.37, half filled): all seven of
  your seat's figures stand, at 34–36 px kneeling.

And over an eleventh of the corpus's board frames × five cuts, **4,219** kept
standees: the floor's analytic number within **1.3%** of the raster's, none under
30 px in any stance. The hard-rule-8 sweep's oracle (§6) carries the floor, written
apart from the lookup with the test's own projection.

The pictures: `var/standee/fix/g1-316-doombot-compare-3x.png` (the verifier's
crop, retaken: with standees on, `&standee=0` and `&personal=0` the drones are the
same CC0 drones on both seats — at `g1`@316 nothing stands any more; Wasp and Peggy
wear their personal models).

### 9.2 The ink rim (D261, amended)

Where the front is not the subject but a subject texel lies within the figures'
own outer ink width — `COMIC.inkCssPx` (1.6 CSS px) × the render dpr, one shared
uniform written at commit (`applyStandeeRim`) — the front draws `COMIC.ink`
(eight taps of the map at the pixel's own footprint). `var/standee/fix/rim-compare.png`:
the Masters of Evil's @209, both seats, the rim off (`uRim` 0 through the dev
handle) and on — the far seat's crowd of A.I.M. Scientists and Agent 13 in her
doorway over their own cards keep an edge; your seat's Songbird, Boomerang and
MACH-1 are outlined like the figures beside them. The close look
(`var/standee/fix/close/`): Tiger Shark on the pedestal, `?dpr=1`, bloom off —
`tigershark-close-{front,drag-up,tapped,sick}.png`, side by side in
`tigershark-row.png`, and `tigershark-cut-edge-4x.png`: the ink line outside the
fringe of the background's teal the painted contour keeps, the isolated specks
at the box's edges rimmed too.

**What the rim costs.** The standees' own render cost, A/B in one page at one
moment (`var/standee-fix/micro.sh`: the Masters of Evil's @371, nine standees,
SwiftShader, 1920 × 1080 at dpr 0.6, bloom off; `gl.render` with every standee
visible against every standee hidden, twenty renders a sample each synced by a
one-pixel `readPixels`, the median of six alternating samples; the difference is
what the nine standees cost), one fragment shader at a time:

| the fragment shader | nine standees cost (ms, SwiftShader) |
|---|---|
| the lane's (no rim) | 5.9, 6.1, 7.3, 7.6 |
| the rim, every sample a `textureGrad` (the first cut) | 14.6, 15.3, 15.5 |
| the rim, `textureGrad` but no taps | 11.4 |
| the rim, `textureLod` with one level for every tap | 9.5, 10.2 |
| the rim, eight taps with implicit mip levels, all eight read at the top | 8.4, 11.0 |
| **the rim, the taps' coordinates at the top, read only off the subject (kept)** | **4.8, 6.9, 7.6, 6.3, 6.6** |

SwiftShader pays for an explicit gradient per sample; the kept form costs what
the lane's shader did, within the noise. On the GTX 1080 no form is measurable.

### 9.3 The kneel (D262, amended)

`standee.test.ts`'s tapped case, six stand points from your back row to the
opponent's (the median cut): the first stance (0.25 sunk, 0.3 rad of bow) read
**0.39–0.59** of its standing height from the table view and **0.33–0.53** of its
area — §4's 1.37 counted the part sunk below the table — so the fix pass chose
**0.2 sunk and 0.1 rad (6°)**: **0.68–0.78** of the height and **0.65–0.73** of the
area, the face whole (`var/standee/fix/tapped-compare.png`: Agent 13 on the far
seat and MACH-1 on yours, both stances, 3×). The live comparison was taken by
writing the two uniforms through the dev handle (`var/standee-fix/cal/
moe-209-tap_*.png`, with two more candidates, upright 0.25 sunk and 0.22 + 0.15).

### 9.4 The budget (D263, amended)

**The census**, retaken with the floor (`var/standee-fix/census.sh`; one render of
the exact frame, bloom off, the table view; `var/standee-fix/census.txt`), and
the CC0 table's share — the standees on, minus the personal models' own delta
(`&standee=0` minus `&personal=0`):

| frame | on: calls · triangles (standees) | `&standee=0` | `&personal=0` | calls | the CC0 table with its standees | against it alone |
|---|---|---|---|---|---|---|
| `g1`@316 | 77 · 42,775 (0) | 77 · 42,775 | 83 · 26,471 | 0 | 26,471 | 0 |
| `g1`@355 | 82 · 44,635 (1) | 84 · 45,889 | 89 · 29,609 | −2 | 28,355 | −1,254 |
| MoE@371 | 89 · 48,701 (9) | 96 · 47,497 | 100 · 35,689 | −7 | **36,893** | **+1,204** |
| MoE@471 | 100 · 47,621 (8) | 103 · 46,229 | 107 · 34,421 | −3 | 35,813 | +1,392 |
| MoE@235 | 74 · 44,263 (7) | 84 · 43,896 | 88 · 32,088 | −10 | 32,455 | +367 |
| MoE@209 | 64 · 34,512 (6) | 74 · 34,161 | 74 · 26,269 | −10 | 26,620 | +351 |
| Doom@392 | 124 · 47,984 (5) | 128 · 48,656 | 128 · 37,000 | −4 | 36,328 | −672 |
| Doom@393 | 124 · 48,240 (4) | 128 · 49,202 | 128 · 37,546 | −4 | 36,584 | −962 |
| Wakanda@527 | 113 · 41,402 (9) | 119 · 40,020 | 119 · 32,128 | −6 | 33,510 | +1,382 |
| Wakanda@382 | 101 · 41,284 (7) | 106 · 41,484 | 106 · 33,592 | −5 | 33,392 | −200 |
| Hulk@427 | 99 · 40,973 (10) | 107 · 38,799 | 107 · 26,728 | −8 | 28,902 | +2,174 |
| Hulk@368 | 82 · 41,489 (11) | 94 · 39,126 | 98 · 27,318 | −12 | 29,681 | +2,363 |

The floor stood the drones down: the Doom Legion's @393 went from eight standees
to four, `g1`@316 from two to none. **The acceptance** (D263 amended): the
standees take the Masters of Evil's worst frame 1,204 triangles past D233's
accepted 35,689 (36,893 at @371; 6,893 over §8.2's 30,000) and the Hulk family's
@368 to 29,681 (319 under the line); they lower the Doom Legion's, Wakanda's
worst and `g1`'s. Per standee the frames average −1,254 to +217 triangles. Every
table draws 0–12 calls fewer. **Held**: `traits.test.ts`'s
`FIGURE_TRIS_STANDEES_HELD` — the figure layer with every figure a standee may
replace at the dearer of its body and props or 1,920 — Masters of Evil 32,107
(@376, the layer alone 31,449), Doom Legion 31,438, Wakanda 29,556, Hulk family
24,708, every other recording 25,109 (`g1`@342).

**The bench** (`tools/arena-bench.mjs --personal --no-bloom --index 371`, the
Masters of Evil, the dev server; `var/standee-fix/bench.sh`, `bench.txt`; its
counters are fifty frames past the index, so not the census's frame):

| run (the Masters of Evil @371, bloom off) | standees on: p50 · p95 · max (ms) | `&standee=0` | load |
|---|---|---|---|
| SwiftShader, pair 1, settle 600 ms | 23.5 · 48.2 · 251.3 | 19.8 · 32.8 · 121.9 | 4.4–4.7 |
| SwiftShader, pair 2 | 24.4 · 47.5 · 143.6 | 21.0 · 47.3 · 72.8 | 6.2 |
| SwiftShader, pair 3 (on re-run alone: its first run timed out) | 27.1 · 48.6 · 229.5 | 20.7 · 32.8 · 189.1 | 5.4–6.7 |
| SwiftShader, **settle 3,000 ms** | 26.7 · **34.3** · **50.6** | 23.1 · 30.3 · 52.6 | 7.1–7.9 |
| SwiftShader, the tier off (`&personal=0`) | — | 17.1 · 34.6 · 48.6 | 7.3 |
| GTX 1080 (`--gpu gl`) | 0.4 · 0.9 · 18.9 | 0.7 · 7.9 · 206.2 (the tier off 0.6 · 4.5 · 155.3) | 6.4–8.3 |

The calls and triangles there: on 89–91 · 44,873–45,009, off 94–95 · 43,039–43,063.
So on SwiftShader nine standees cost **about 3–6 ms at the p50** (the
microbenchmark's 6.3–7.6 ms of their own render), the p95 is about **15 ms higher
when the sample starts 600 ms after the scrub** (47.5–48.6 against 32.8, one pair
equal) and **4 ms higher when it starts 3 s after** (34.3 against 30.3), and the
maxima of 144–251 ms fall to 51 with the longer settle: the spikes the lane and
the verifier saw (68.8, 68.2, and the verifier's 774 ms max) are most likely the
standees' first mount — two maps a print uploaded and mipmapped at commit — not
the per-fragment cost. Follow-up 39 keeps the quiet-machine re-bench and the
proof (a bench that times the mount). The GTX 1080 shows no cost at all. The
machine's load average was 4.4–8.3 on sixteen threads throughout, lower than the
lane's but not quiet.

The first bench of the fix pass, with the rim's `textureGrad` form, is kept in
`var/standee-fix/bench-texturegrad.txt`: SwiftShader p50 37.8–50.5 against
30.4–34.6 off, which is what sent §9.2's microbenchmark looking.

**The build** (the gate's): `index-*.js` 300,425 B (94.68 kB gzip), the same size as `e2c337c`'s
and the same code apart from the lazy chunks' hashed names; `arena-scene-*.js`
1,383,443 B (397.08 kB gzip), 1.9 kB over the lane's for the floor and the rim;
`Workshop-*.js` 89,527 B (the badge's lookup); no `.js`, `.css` or `.html` names
`personal/`.

### 9.5 The workshop badge (D264, amended)

The list's badge had its own gates and its own `byId.get` in `Workshop.tsx`,
outside the one place the arena's lookup lives, and no sweep (the verifier took
its swarm gate out and every test stayed green). It is now
`workshop/relief.ts`'s `standeeBadgesOf`: each creature entry's resting board
(`pedestalState` at the default options), laid out and posed as the pedestal
poses it, the models the overlay dresses taken first, asked of the arena's
`standeeChoicesOf` — so the badge is the pedestal's answer, the floor included.
`workshop.test.ts` sweeps the catalog with the concealed shapes handed real names
and a relief that cuts every print as a figure in a doorway: **72** badges of 103
creature entries against an oracle written apart; the 4 concealed entries, 6
swarms and squads, the dressed card and 10 under the floor refused; the relief
never asked about a concealed entry's print; the ungated control (the old badge's
shape) badges a concealed entry and asks the relief about it. A liveness clause
holds the workshop to one `byId.get(` — the inspect view's plan.

### 9.6 The pictures, retaken

All at 1600 × 1000, `?dpr=1`, SwiftShader, bloom on (the arena's default),
under the gitignored `var/standee/` (the first pass's sheet moved to
`sheet-first/`):

- **The sheet** (`sheet/`, `var/standee-fix/sheet.sh`): `g1`@316, the Masters of
  Evil's @371 and — the verifier's frame — @209, from the table view and both
  shoulders, each three ways: `{g1-316,moe-371,moe-209}-{table,shoulder-you,
  shoulder-opp}-{on,standee0,personal0}.png`, 27 pictures.
- **The fix pass's own** (`fix/`): `floor-contact*.png` (§9.1), `rim-compare.png`
  and `moe-209-rim-{on,off}.png` (§9.2), `tapped-compare.png` (§9.3),
  `g1-316-doombot-compare-3x.png` (§9.1), `close/` (§9.2).

### 9.7 The minors

`perf.ts` and `standee.ts` named `scene/standees.ts` and `scene/relief.ts`; both
say `scene/reliefCache.ts`. The build line ("byte for byte") and the cut edge
("no halo") are corrected in §5 and §7 and in D263 and the arena's `CLAUDE.md`.

**The controls, spliced by hand and restored**: the floor's line taken out of
`standeeChoicesOf` (3 tests red — the raster, the hostile sweep's oracle and
liveness's order); `applyStandeeRim` called from `CueRunner.tsx` (liveness red);
a `reliefIndex.byId.get(` put back in `Workshop.tsx` (workshop red);
`STANDEE_MIN_PX` set to 0 (the raster red); the first kneel put back (5 red —
the tapped stance, the raster, and the sweeps whose floor is judged kneeling).

**`npm --prefix web test`**: `node --test` 1,199 / 1,190 pass / 0 fail / 9
skipped, vitest 157 (9 files); `npm --prefix web run build` OK.

### 9.8 The gate

`./tools/check-all.sh` from a deleted `bridge/out`, `GATE_JOBS=4`, `WSPORT=9320`:
**exit 0, 273.3 s** wall, 48 jobs whose seconds sum to 1,026.5 s, a load average
of 4.9 at the start and 15.1 at most (other lanes' work), `node --test` **1,214 /
1,203 pass / 0 fail / 11 skipped** and vitest **157** (9 files)
(`var/check-all-standee-fix.log`; the run's logs
`var/check-all/20260929-124603-1475497/`). The relief step's three Python-step
tests are skipped in this worktree, as in the lane's two runs. Before it: `node
tools/build-workshop-catalog.ts --check` current; `npm --prefix web test` and
`npm --prefix web run build` as in §9.7.

`~/forge` and `~/.forge` are unchanged: the jar's sha256 is the pinned
`3c0a7c38…8e5dd9` before and after, and a sha1 of `~/forge`'s path, size and
modification-time listing and of every file under `~/.forge`, taken before the
fix pass began and after its gate, is identical.
