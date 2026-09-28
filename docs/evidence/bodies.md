## Lane BODIES — resting poses, hair, faces, coats that drape, and the art's own colours

Report 15's **Lane BODIES** (§9.3; decisions **D140–D149**, numbered in the
lane's reserved range and renumbered contiguously at merge). Built in the
worktree `/home/justin-a/code/mtg-table-t2n`, branch `bodies`, off **`c81f674`**
— `main`'s `a092d3a` plus report 15 and its `?look=comic` spike — on 2026-09-27
and 2026-09-28, beside lanes LOOK and MOTION, whose files this lane did not
touch (report 15 §9.4's table). The first builder was cut off by a usage limit
after about ninety minutes; the resumed pass read the uncommitted tree, kept it,
split the coat into a yoke and a body link (§3), added the patched face (§2.2),
moved the palette's reads into genuine idle time (§4), and did everything from §5
on. A verifier's first round then found one blocker, two majors and five minors;
**§7 is the fix pass**, and where it changed a number in §1–§6 the number here is
the fix pass's, with the first cut's beside it. A verifier's second round then
found one blocker, five majors and four minors and read the pictures again;
**§8 is the second fix pass**, and it supersedes §1–§7 wherever the two disagree
(the coat's numbers, the art rung, Agent 13's pose, the bob, the pictures).

Every picture is headless Chromium on this machine's **GTX 1080** (`ANGLE
(NVIDIA Corporation, NVIDIA GeForce GTX 1080/PCIe/SSE2, OpenGL 4.5.0)`), 1600 ×
1000, against the Vite dev server on port 5193. Every number in §5 says what drew
it. The pictures are under `var/bodies/` (gitignored, local).

| what | where |
|---|---|
| **before** (the untouched `c81f674` tree): the workshop's default framing for ten cards, `holo` and `comic`; the arena's table view at `g1.jsonl` frame 355, both looks | `var/bodies/before/workshop-<card>-{holo,comic}.png`, `var/bodies/before/table-g1-355-{holo,comic}.png` |
| **after** (this branch), the same twenty-two shots | `var/bodies/after/…`, same names |
| side by side | `var/bodies/compare/workshop-{holo,comic}-before-after.png`, `var/bodies/compare/table-g1-355-{holo,comic}-before-after.png`, `…-rank-crop.png` |
| the coat's first cut and its fix, low camera | `var/bodies/s3/low/bio-sheet.png` (the barrel) → `var/bodies/s3/low/coat2.png` (the yoke and body link) |
| **the fix pass** (§7): the same twenty-two shots | `var/bodies/fix1/after/…`, same names |
| before · the first cut (the art rung ON) · the fix pass, side by side | `var/bodies/fix1/compare/workshop-<card>-{holo,comic}.png`, `var/bodies/fix1/compare/table-g1-355-{holo,comic}.png` |
| the coat in four stances, 1×, both looks (§7.3) | `var/bodies/fix1/coat-v4/` (comic), `var/bodies/fix1/coat-v4h/` (holo): `{fury,bio}-{ready,tapped,attacking,blocking}.png` and `sheet-{fury,bio}.png`; the verifier's kneel and attack beside the fix pass's: `var/bodies/fix1/fury-kneel-attack-before-after.png` |
| the arena at views 1, 4 and 3 after the fix | `var/bodies/fix1/table-v3/table-355-v{1,4,3}-{holo,comic}.png`; the director duelist before and after, `var/bodies/fix1/table-v3/director.png` |
| **the second fix pass (§8) — THE current pictures**: the base `c81f674` and the delivered tree, shot back to back with one script (`var/bodies/fix3/shoot-set.sh`), twelve cards in the workshop's default framing and `g1`@355 at views 1, 3 and 4, both looks | `var/bodies/fix3/before/`, `var/bodies/fix3/after/`: `workshop-<card>-{holo,comic}.png`, `table-355-v{1,3,4}-{holo,comic}.png` |
| side by side | `var/bodies/fix3/compare/workshop-{holo,comic}-before-after.png`, `var/bodies/fix3/compare/table-355-v{1,3,4}-{holo,comic}-before-after.png`, `var/bodies/fix3/compare/table-355-v1-{holo,comic}-crops-before-after.png` (the duelists and the two ranks) |
| the art rung on and off for one card (the Giant-Sized Flying Ant) | `var/bodies/fix3/palette/ant-{art,off}-{holo,comic}.png` |
| grit, from a lens at head height | `var/bodies/fix3/it6/s3.png` (Coulson at rest and blocking) |

**The pictures of §1–§7 are superseded.** `var/bodies/after/`, `compare/` and
`fix1/` show trees this branch no longer has — the first cut's with the art rung
ON, and the fix pass's before this pass cut the coats (the verifier's second
round, rightly). `var/bodies/fix3/` is the delivered tree.

The ten cards: Nick Fury, Peggy Carter, Agent Phil Coulson, Quake, Agent 13, Bold
Biochemist, A.I.M. Scientists, Agents of S.H.I.E.L.D., Ant-Man and Wasp.

### 1. Resting poses (D140)

`figures/rests.ts`'s table, as the census reads it back off the poses
(`traits.test.ts`, *every deck humanoid wears its own costume*):

| card | rests | model variant |
|---|---|---|
| Nick Fury, Spymaster | `folded` — arms folded across the chest | `agent@folded` |
| Peggy Carter, Secret Agent | `ready` — pistol low, shield arm raised across the front | `hero@ready` |
| Agent Phil Coulson | `clasped` — hands clasped at the belt (raised in the fix pass: the verifier read them at the crotch) | `agent@clasped` |
| Quake, Agent of S.H.I.E.L.D. | `braced` — the library's guard, both palms forward | `hero@braced` |
| Agent 13, Sharon Carter | `aim` — the library's two-handed pistol aim at phase 0.45, held | `hero@aim` |
| Bold Biochemist, A.I.M. Scientists | `working` — bent over the bench | `scientist@working` |
| Ant-Man, Wasp, the Hero token | `akimbo` — hands on the hips | `agent@akimbo`, `hero@akimbo` |
| Agents of S.H.I.E.L.D., the Soldier token | `atEase` — hands behind the back | `agent@atEase` |

Each is a frame of a library clip, the joint aims `rests.ts` writes as
figure-space directions (set against the measured landmarks: shoulders at
(±0.111, 0.765), the pelvis at 0.50, the head's front at z +0.06), and a clip the
rest of the body breathes with. `scene/models.ts`'s `deriveRestClip` samples it
at load; `clips.test.ts` holds every pose's clips and joints to both bodies, and
asserts every aimed joint's track is two equal keys (held) and every other clip is
the body's own. Nine variants per proportioned body (`agent`, `hero`,
`scientist`). The working pose, measured on the rig: the head moves 0.042
forward and 0.033 to the figure's left of the bind pose; `spine_01` stays upright.

### 2. The head — hair (D141) and the face (D142)

#### 2.1 Hair

| style | source | triangles an instance |
|---|---|---:|
| `parted` | the pack's `Hair_SimpleParted`, carved off `agent` at load | 114 |
| `long` | the pack's `Hair_Long`, carved off `hero` at load | 416 |
| `crop` | procedural shell (the Soldier token; Fury's until the fix pass made him bald) | 288 |
| `bob` | procedural shell with 20 strand tips round the hem, none over the forehead | 385 |
| `waves` | procedural shell and nape rolls | 483 |
| `bun` | procedural shell and a bun | 375 |

**Strands (the fix pass).** Every procedural shell now darkens every other one of
its 24 meridians toward the hem (`strands`: `crop` 0.1, `bob` 0.3, `waves` 0.25,
`bun` 0.22 — no triangles), so the cel bands break into combed locks from the
crown. It reads on Agent 13's blonde bun (`var/bodies/fix1/try1/a13.png`); on
Quake's near-black bob a darker stripe does not show, and a bob still reads as a
cap from the workshop's high framing (PLAN.md follow-up 15). **Fury is bald**:
his card draws him bald, and the `crop` read as a dark skullcap (follow-up 16).

Carving leaves the bodies at `agent` 1,400 → 1,286 triangles drawn and `hero`
1,398 → 982 (`clips.test.ts` prints both); the attribute buffers are shared and
only the index shrinks. `legibility.ts`'s drawn-height meter reads only indexed
vertices since, so the bald body's unused hair vertices do not count.

**The pack was not downloaded.** The brief's plan (report 15 §6.2) was the free
Universal Base Characters zip's other hairstyles. This worktree has no
`var/assets/`, and `node tools/build-figures.mjs --verify-only` stops on the
missing source with the download instructions. A download needs the user's
approval in chat, and the approval in this lane's task text came from a workflow
script, not from the user; so the licence badge was not re-read and nothing was
fetched. PLAN.md's lane BODIES follow-up 2 is the route.

#### 2.2 The face

88 triangles (`facePatched`, 62), on `Head`, in the figure units of the measured
head: centre (0, 0.905, −0.004), half-extents 0.064 × 0.088 × 0.071, eyes at x
±0.0225, y 0.912, z 0.061 (both bodies agree within 0.01). From
`traits.test.ts`'s raster through the real `figures.glb` and the real
`PropField`, at 1600 × 1000:

| card | your seat: table · shoulder · side | the opponent's seat: table · shoulder · side |
|---|---|---|
| Agent Phil Coulson | 7 · 16 · 3 px | 0 · 0 · 0 |
| Nick Fury (patched) | 5 · 9 · 3 | 0 · 0 · 0 |
| Quake | 5 · 13 · 5 | 0 · 0 · 2 |
| Agent 13 | 7 · 16 · 5 | 0 · 0 · 0 |
| Bold Biochemist | 6 · 13 · 3 | 0 · 0 · 2 |

Your figures face you (**D81**), so the opponent's show the lens the backs of
their heads: 0 px there is the assertion (at most 2), not a failure. The bars are
≥ 4 at the table view and ≥ 8 over the shoulder, from the seat that sees faces;
`traits.test.ts` reads that seat off `seatFacingY`, so it follows if PLAN.md's
question 13 turns the figures. **The patched face:** the eyepatch sits 0.034 in
front of the eye it covers, and from the workshop's steep framing the eye under
it showed above it; `facePatched` leaves that eye out and keeps its brow.

### 3. Coats that drape (D143, D146)

**The first cut and why it changed.** The first builder stopped `coat` at the hip
(a shell 0.29 long on `spine_03`) and hung the skirt on the legs. From a low
camera (`var/bodies/s3/low/bio-sheet.png`) the Bold Biochemist's `working` lean
tilted that shell as a whole, and its flared hem (0.19 × 0.16) stood out behind
his back like a barrel. The resumed pass made `coat` the **yoke** (0.16 long,
hem 0.165) and added a **body link**: five panels on `spine_01`, from y 0.675 to
0.51, which the working pose leaves upright (`coat2.png`).

| kind | anchors (the proportioned body) | triangles an instance |
|---|---|---:|
| `coat` (yoke, collar, lapels) | 1 on `spine_03` | 120 |
| `coatTails` | 5 on `spine_01`; 9 on the pelvis — 4 upper links following a thigh, 4 lower links hanging from them, 1 at the back: 14 (the first cut: 2 + 2 on each thigh and calf, 1 on the pelvis) | 24 |
| `cape` | 2 on `spine_03`, 3 on the pelvis (the outer two following a thigh): 5 | 36 (24 and its hem trim) |

The panel went from 8 × 3 to 6 × 2 segments in the resumed pass (48 → 24
triangles): the body link adds five panels to every coat, both duelists wear
one (the villain a cape too), and `g1`@316 already read 29,058 of the 30,000
line before the body link. `facing.test.ts` asserts the skirt is open at the
front and closed at 60°, 120°, 180°, 240° and 300°.

**Identity from both seats** (`traits.test.ts`, table view, the fewest pixels
over standing / kneeling and centre / edge, ≥ 48 on both seats):

| card | kind | your seat | the opponent's seat |
|---|---|---:|---:|
| Nick Fury | `coat` | 206 | 521 |
| Nick Fury | `coatTails` | 1,772 | 1,413 |
| Nick Fury | `eyepatch` (one-sided) | 54 | 52 |
| Bold Biochemist | `coat` | 136 | 523 |
| Bold Biochemist | `coatTails` | 1,622 | 1,397 |
| Peggy Carter | `hairWaves` (one-sided: under the hat) | 0 | 75 |
| Peggy Carter | `sidearm` (one-sided: pointed down in front) | 56 | 20 |
| Quake | `hairBob` | 180 | 178 |
| Agent 13 | `hairBun` | 151 | 120 |
| Wasp | `hairBob` | 56 | 55 |

The fix pass's numbers (the first cut's Fury: `coatTails` 1,245 / 1,494,
`eyepatch` 54 / 44, and `hairCrop` 133 / 92 before he went bald). The full
table (every identity prop of every deck card) prints in every run of
`npm --prefix web test`.

### 4. The art's palette (D144)

**Not switched on** (the fix pass, §7.1): no page passes the palettes in until
lane LOOK applies PLAN.md's follow-up 13. Everything below was measured on the
first cut, which did, and its pictures are `var/bodies/after/`.

**Timing, in the page** (Chromium on the GTX 1080 machine, the workshop's dev
server, each card's Scryfall `normal` image already cached):

| card | ¼ scale (122 × 170): read · cluster | full size (488 × 680): read · cluster | accent (¼) | vivid |
|---|---|---|---|---|
| Nick Fury | 0.2 · 3.3 ms | 0.7 · 72.1 ms | `#867448` | yes |
| Peggy Carter | 3.3 · 3.3 | 0.7 · 53.9 | `#b8bbbd` | no |
| Agent Phil Coulson | 3.8 · 4.4 | 0.8 · 63.4 | `#0e4a5a` | yes |
| Aerial Doombot | 2.8 · 3.1 | 0.6 · 48.4 | `#626969` | no |
| Quake | 3.2 · 2.8 | 0.6 · 52.3 | `#554948` | no |
| Bold Biochemist | 14.8 · 21.6 | 2.3 · 156.0 | `#706546` | no |
| Plains | 10.7 · 11.0 | 1.1 · 228.7 | `#d79337` | yes |
| Island | 7.1 · 8.2 | 7.6 · 98.1 | `#1585c3` | yes |

(Clustering at ¼ scale before the resumed pass precomputed each sample's luma for
the seeding sort; the numbers above are from before that change, so they are an
upper bound.) Report 15 §7.1's finding holds: the dominant cluster is the
background (Coulson's `#63a6c0` glass, the Doombot's grey sky), and a sepia or
grey painting has nothing vivid, so it offers no tint and its figure keeps its
colour identity.

**Scheduling.** The first cut asked `requestIdleCallback` with a 2 s timeout per
card and ran the read and the clustering in the image's decode callback. The
resumed pass decodes with the browser, queues the decoded images, and reads them
only in an idle period with ≥ 12 ms remaining, as many as fit, notifying the
arena once per idle period. Checked in the page: at `g1`@355 the table's
palettes arrive (Aerial Doombot `#626969`, Plains `#d79337`, Island `#1585c3`,
Giant-Sized Flying Ant `#8c604b`, Wasp `#6d7286`), and the workshop's swatch
strip fills (Coulson: accent `#0e4a5a`).

**Hard rule 8, over the corpus** (`palette.test.ts`, a spy map that answers every
name and records every question): 3,679 board frames; 11,449 face-up
figure-instances, all 11,449 resolving the art rung; 15,019 placements drawn as a
back, none looked up; 20,638 lookups, every one of a name drawn face up. The
anonymous figure never carries an art colour (1,179 instances,
`traits.test.ts`). That count proves the wire's shape rather than the gates (§7.2
is the hostile corpus that proves the gates).

### 5. Cost (the first cut — §7.5 has the fix pass's)

#### 5.1 The library (D145)

`figures.glb` is unchanged: **373,236 B** (sha256 `fe13b02c…7aae90`), **87,564 B
under** the new 460,800 B budget; the library's own triangles are 8,573 of
30,000 (`figures.test.ts`). The measurement behind the budget is the manifest's
`budget.measured`: the JSON chunk 237,136 B (accessors 107,438, animations
86,379), the binary chunk 136,072 B, ~8.4 kB of JSON per proportioned clip per
body.

#### 5.2 The scene at the budget frames

`tools/arena-bench.mjs`, production build under `vite preview`, `g1.jsonl`,
bloom off, 1920 × 993, dpr 1. The draw-call and triangle line is the bench's own
sample at the end of its window; the replay's cues move it by a few calls between
runs (the base read 77 / 24,240 and 79 / 27,416 at 316 in two runs), so the
static reading from the dev server is given too.

| | base `c81f674` | `bodies` |
|---|---:|---:|
| `g1`@316, GTX 1080: draw calls · triangles | 79 · 27,416 | **85 · 29,182** (dev server: 85 · 29,058) |
| `g1`@355, GTX 1080: draw calls · triangles | 79 · 24,368 | **85 · 26,134** |
| prop kinds on the table @316 · @355 | 9 · 8 | 15 · 14 |
| prop kinds, the corpus's worst frame | ≤ 12 (the test's old line) | 16 (`disjoint.jsonl`@241; the line is now 16) |
| programs, bloom off | 16 | 16 |

Report 13 §8.2's lines are 90 calls and 30,000 triangles; the lane's six extra
calls are one per kind on the table (faces, hairstyles, the sidearm), and the
triangles are the faces (88 each), the hair shells, and the duelists' coat
panels. Headroom at `g1`@316: 5 calls and ~820 triangles.

#### 5.3 Frame times

Same setup, `--index 316 --settle 4000`, the final build, base and branch back to
back (`var/bodies/bench-final/`). The machine was running other lanes' gates
(load average 3–10), which is why the `max` column moves by tens of
milliseconds in both trees.

| rasteriser · bloom | base p50 / p95 / max | `bodies` p50 / p95 / max |
|---|---|---|
| **GTX 1080** · off | 0.4 / 2.1 / 37.0 ms | 0.4 / 2.4 / 35.1 ms — OK |
| **GTX 1080** · on | 0.5 / 4.5 / 104.3 | 0.5 / 4.9 / 87.4 |
| **GTX 1080** · off, `?look=comic` | 0.4 / 5.8 / 104.4 | 0.5 / 7.6 / 86.7 |
| **GTX 1080** @355 · off | 0.5 / 1.8 / 52.6 | 0.5 / 2.2 / 35.8 — OK |
| **SwiftShader** · on (governed to dpr 0.6) | 15.4 / 33.8 / 42.4 | 16.0 / 34.2 / 50.7 |
| **SwiftShader** · off, three alternating pairs | p50 14.9–23.6, p95 33.2–93.8 | p50 15.1–16.8, p95 32.8–33.9 |

The GTX 1080 is inside report 09 §9.4's gate with bloom off in both trees; the
bloom-on maxima are the composer's under load, in both. SwiftShader's p95 sits at
two frame intervals (~33 ms) in both trees, and its fail is the known lower bound
(**D61**'s rung below the floor turns bloom off there).

#### 5.4 The build

`npm --prefix web run build`, gzip −9 of each chunk, base against branch:

| chunk | base | `bodies` |
|---|---:|---:|
| entry `index-*.js` | 281,338 B raw | **281,338 B — byte-identical but for chunk hashes, and no `three`** |
| `arena-scene-*.js` | 348,229 B gz | 355,237 B gz (+7.0 kB) |
| `Workshop-*.js` | 23,540 | 24,177 |
| `Arena-*.js` | 14,554 | 14,688 |

#### 5.5 Tests and the gate

`npm --prefix web test`: **880 `node --test` pass, 0 fail, 0 skipped + 94
vitest in 6 files** (the base: 870 + 94). The ten new cases are
`palette.test.ts`'s three, liveness's lane BODIES clause, two in `clips.test.ts`,
one in `facing.test.ts`, one in `figures.test.ts` and two in `traits.test.ts`.

The gate: see §6.

### 6. The gate, and `~/forge` (the first cut — §7.6 has the fix pass's)

`WSPORT=8720 ./tools/check-all.sh` from a deleted `bridge/out` (it compiled 21
files into a fresh one), tee'd to `var/check-all-bodies.log`: **exit 0, 893 s**
(14 m 53 s), 9c's fourteen games 370 s, all fourteen reaching `over` with zero
UNIMPL, every log through `check-redaction.mjs` and no preferences file touched;
`npm test` inside it **890 `node --test` / 882 pass / 0 fail / 8 skipped** (the
ws-log suite skips the candidates `MTGTABLE_WS_LOGS` does not name) **+ 94
vitest**. The load average was 5.4–6.3 at the start. 9b, the advisory seed-42
drift check, reported one extra `c2s` act and an identical `s2c` half — the
known timing instability of a human-seat fixture, not drift. This lane touched
nothing under `bridge/`.

**`~/forge` and `~/.forge` are unchanged.** A listing of every path, size and
mtime under both (22,155 paths) hashes to `7f992876…` now, exactly as it did at
00:07 on 2026-09-28 when the lane began (`var/bodies/forge-before.txt`); the
sha256 of every `~/.forge` file hashes to `799f9bb7…`, as at the resumed pass's
start (`var/bodies/forge-before-resume.txt`); and the resumed pass's full
listings before and after (`var/bodies/forge-list-session3-{before,after}.txt`)
are byte-identical. The jar still hashes to `3c0a7c38…8e5dd9`.

### 7. The fix pass — the verifier's first round

The verifier (round 1) found one blocker, two majors and six minors, and read
the pictures. Every blocker and major is fixed; each minor is fixed or is a
PLAN.md follow-up. The pictures are in the table at the top.

#### 7.1 The blocker: two of lane LOOK's files

The first cut passed the palettes in from `web/src/arena/Arena.tsx` and
`web/src/workshop/Pedestal.tsx`, which report 15 §9.1 and §9.4 give to lane
LOOK. Both hunks are reverted: `git diff c81f674 -- web/src/arena/Arena.tsx
web/src/workshop/Pedestal.tsx` is empty, and so is the diff of every other file
LOOK and MOTION own (`look.ts`, `holoMaterial.ts`, `Post.tsx`, `Table.tsx`,
`discs.ts`, `FigureLayer.tsx`, `DuelistLayer.tsx`, `perf.ts`, `layout.ts`,
`effects.ts`, `CueRunner.tsx`, `cues/`). The edit is PLAN.md's lane BODIES
follow-up 13, written out whole. The workshop's own poses no longer take the
palettes either, so what it frames is what its pedestal draws; the tuning panel
still reads each card's palette for its swatch strip and says that nothing
draws it yet. So **the art rung is built, tested and dormant**, and its
pictures are the first cut's (`var/bodies/after/`, rung on).

#### 7.2 The palette test now proves the gates (major)

The verifier removed each gate in a scratch copy and `palette.test.ts` stayed
green, because the corpus never gives a card drawn as a back a real name. The
test now builds a **hostile corpus** from every board frame: every back and
every redacted stub is handed a secret name, and every third face-up creature,
attachment, land and spell is turned into a back that keeps a secret name; plus a
stub with `back: false` in a land's and an attachment's slot, which only
`isHidden` stands in front of. Over 3,679 frames it offered **3,391 creature
backs, 268 attachment backs, 8,435 land backs, 120 stack backs, 13,837 stubs
and 4,571 unflagged stubs**, and none of the 15,427 lookups was of a secret. The
four direct cases of `paletteFor` (face up, a back, a stub, a nameless card) are
asserted too.

**Negative controls** (`var/bodies/fix1/neg/run.sh`: remove one gate, run
`palette.test.ts`, restore, md5-checked): each of these five fails the new test
(3 pass, 1 fail):

| removed | result |
|---|---|
| `paletteFor`'s back, stub and empty-name checks | fails |
| `paletteFor`'s stub check alone | fails |
| `paletteFor`'s back check alone | fails |
| `tilePose`'s `!placement.back` and name checks | fails |
| `paletteNamesOf`'s back-and-stub check | fails |

Liveness's lane BODIES clause now also scans `paletteFor` (the back, stub and
empty-name tests, each negative-controlled by string removal) and `tilePose`'s
art lookup (`!placement.back`), and holds the palette map to exactly two
readers in `figures/` (`pose.ts`, `tiles.ts`) with `pose.ts` reading it only
through `paletteFor`. With the gates removed in the source, the clause fails too.

#### 7.3 The coat drapes (major; D146)

The verifier's pictures: kneeling, Fury's calf link went edge-on and trailed a
dashed ink sliver onto his card; attacking, the links curled into ribbons;
standing, a calf link flapped out; the director duelist's tails flared. Each was
a panel inheriting a leg's full angle. **D146** hangs every skirt link from the
pelvis: the upper link follows its thigh by 0.38 (front) or 0.22 (side), the
lower link hangs from the upper one's lower edge (`HANG_FROM` 0.88, so the seam
is an overlap) turned 0.8 of the way back to upright, and the back panel is the
pelvis alone. The cape's outer panels follow their thighs by 0.22.

`traits.test.ts`'s new drape test samples `idle`, `crouch`, `attack`, `block`,
`hit` and `summon` at eleven phases each, for Fury and the Bold Biochemist, with
the real `figures.glb` and the real `PropField`:

| | a lower link's worst lean from hanging straight down | the farthest hem from the pelvis's vertical |
|---|---:|---:|
| the kit (D146) | **6°** (`crouch` at 0.2) | 0.40 of a height (`crouch` at 0.2) |
| the first cut (the negative control, swapped into the kit for the run) | **87°** (`crouch` at 0.8 — the sliver) | 0.44 (`summon` at 0.2) |

The test fails at 30° or 0.42, so the first cut fails it. A second test holds
the drape rule's form: every `follow` and `hang` joint is on the rig, a `hang`
follows a joint panel of its own kind, only `coatTails` and `cape` hang, and
neither field is used with `pose`.

**Pictures** (1×, the workshop, `var/bodies/fix1/coat-v4/` and `coat-v4h/`):
Fury at ready, kneeling, attacking and blocking reads as one bell of a coat in all
four, with no sliver and no ribbon
(`var/bodies/fix1/fury-kneel-attack-before-after.png` puts the verifier's kneel
and attack beside the fix pass's). The Biochemist's kneel still hangs a front
lower link in front of his knee — a coat over a knee, a big white flap from
above (follow-up 8).

**The director duelist's flare is not cured** (`var/bodies/fix1/table-v3/
director.png`, identical before and after): D146 stops the duelists' skirts
following their legs (a duelist's panels are now rigid on the pelvis), but the
"detached panel" is the duelist's single-sided material. `DuelistLayer` bakes
the panels into its `SkinnedMesh`, drawn `FrontSide`, so from three-quarters
behind the coat's inside is culled and its side panels read as planks with the
table between them; the prop field draws every kind `DoubleSide`, which is why
no figure shows it. `DuelistLayer` is LOOK's file: follow-up 17 has the two ways.

**Tried and dropped:** a hem trim on every coat panel, the upper hems tucked
under the lower links and a smaller body link. From above the upper links'
bands still read as rings round the coat, blown white on the Biochemist's
(`var/bodies/fix1/coat-v3/`). The cape keeps its trim (36 triangles a panel);
a trimmed coat hem is follow-up 14.

**Capacity.** A long coat is fourteen panels of ONE kind. The corpus's worst
frame already holds 28 (`disjoint.jsonl`@241), and the mirror the gate plays by
default can put both seats' Fury and Bold Biochemist on the table: 56, where
`PROP_CAPACITY` was 32 and the last coat lost its skirt. It is 64 now, and a new
test holds the corpus and that mirror under it (70 instances in all against the
field's 192 bindings).

**The frame loop.** The two new binding modes decompose two matrices a panel and
allocate nothing; the liveness allocation scan reads them, and a
`new THREE.Vector3()` spliced into the hang branch fails it.

#### 7.4 What the pictures named

| the verifier's reading | the fix pass |
|---|---|
| Fury's `crop` reads as a dark skullcap | **Fury is bald**, as his card draws him (`hair: none`); his head is the shared skin tone (follow-up 16) |
| Coulson's clasped hands sit low, at the crotch | the forearms raised to near level: the hands meet at the belt (`var/bodies/fix1/compare/workshop-coulson-*.png`) |
| Quake's bob reads as a round helmet in comic | the procedural shells gained strand shading — it shows on Agent 13's blonde bun, not on Quake's near-black bob (follow-up 15) |
| the coat's sliver, ribbons and flap | §7.3 |
| Doom's cloak lost its gold trim | the cape's panels carry a trim again, but the villain's skirt hides his cape's hem from the table (follow-up 14) |
| faces are invisible at table distance | unchanged: the face's bar is ≥ 4 px at the table view from the seat that faces the lens (§2.2) |
| a figure that mounts tapped kneels blended with its idle, now the signature pose | LOOK's `FigureLayer.tsx`: follow-up 1 names the variant case and Fury's own "tapped and attacking" |

#### 7.5 Cost, with what drew it

`tools/arena-bench.mjs` against production builds under `vite preview`, the fix
pass's tree and the base `c81f674` back to back (`var/bodies/fix1/bench/`),
`g1.jsonl`, `--settle 4000`, 1920 × 993. **The base tree now carries
`web/public/art.json`**: it is gitignored, so a tree built from `git archive`
has none, and the verifier's base drew every card as a text frame — that is the
whole of the "+14 to +18 textures" it measured. With `art.json` in both, the GL
texture count is identical (76 · 76 at @316, 88 · 88 at @355 on the GTX 1080; 71 ·
71 in the dev server, `var/bodies/fix1/probe-*.png`), and a `createTexture`
trace by call site shows the same four sources in both trees (the card art, the
text frames, the material uniforms, the bone textures — 12 skeletons each).

| GTX 1080, bloom off | base: calls · triangles | fix pass: calls · triangles |
|---|---:|---:|
| `g1`@316 (10 figures drawn), two runs | 77 · 24,240 (both) | **83 · 26,066** (both) |
| `g1`@355 (the scrub's census 11, 10 drawn), two runs | 79 · 24,368 (both) | **85 · 26,194** (both) |
| SwiftShader `g1`@316, bloom off (11 drawn) | 81 · 27,420 | **87 · 29,246** |

The lane's cost is the same in every pair: **+6 draw calls and +1,826
triangles** (faces, hair shells and the sidearm, one call per kind; the face,
hair and coat-panel triangles). The first cut's 85 / 29,182 was a sample that
drew 11 figures. **With lane LOOK's budget on top** (report 15 §9.1: +2 calls,
+500 triangles), the worst sample here projects to **89 calls and 29,746
triangles** against report 13 §8.2's 90 and 30,000 — inside, by one call and
254 triangles; the next body or kind on the table needs a measurement first.

| frame times | base p50 / p95 / max | fix pass p50 / p95 / max |
|---|---|---|
| GTX 1080 @316, bloom off (two runs) | 0.5 / 1.1 / 18.2; 0.5 / 0.9 / 52.1 ms | 0.5 / 0.9 / 52.7; 0.5 / 0.8 / 53.6 ms |
| GTX 1080 @355, bloom off (two runs) | 0.5 / 0.8 / 53.9; 0.5 / 1.6 / 34.6 | 0.5 / 0.7 / 36.2; 0.5 / 0.8 / 70.1 |
| GTX 1080 @316, bloom on | 0.5 / 1.3 / 69.9 | 0.5 / 1.9 / 18.2 |
| GTX 1080 @316, `?look=comic`, bloom off | 0.6 / 2.3 / 72.3 | 0.5 / 1.9 / 40.8 |
| SwiftShader @316, bloom on (the governor drops it) | 17.5 / 73.3 / 227.3 | 19.8 / 73.5 / 215.4 |
| SwiftShader @316, bloom off | 18.7 / 34.2 / 36.7 | 19.2 / 34.5 / 35.4 |

The machine was running other lanes' `ten-games.sh --jobs 4` and a lane LOOK
bench at the time (load average 6–8), which is why single maxima of 50–70 ms
appear in both trees. The GTX 1080's p95 is under 2 ms everywhere. SwiftShader's
p95 sits at two frame intervals (~34 ms) with bloom off **in both trees** — report
09 §9.4's 20 ms fails there before this lane, as the verifier found — and the
lane's p50 is +0.5 ms of it.

**The build** (`npm --prefix web run build`, gzip −9): the entry chunk is
**281.34 kB, 87,413 B gzip — the base's size exactly, with no `three`** (no
`WebGLRenderer` or `BufferGeometry` in it, and none of the lane's symbols);
`arena-scene` 355,119 B against the base's 348,229 (+6.9 kB: the poses, the kit
and the prop field's new modes), `Workshop` 24,895 B against 23,540 (the tuning
rows and `arena/art.ts`, which only the workshop's swatch strip imports now),
`Arena` 14,653 B against 14,554 (+99 B; no palette code — `requestIdleCallback`
and the canvas read appear in the `Workshop` chunk alone).

#### 7.6 Tests and the gate

`npm --prefix web test`: **884 `node --test` pass, 0 fail, 0 skipped + 94
vitest in 6 files** (`var/bodies/fix1/test-2.log`) — the first cut's 880 and four
new cases: `palette.test.ts`'s hostile corpus, and `traits.test.ts`'s drape test,
the drape rule's form and the capacity.

**The gate, on the tree as committed** (the verifier's minor: the first cut's gate
ran before its last source edits). `WSPORT=8720 ./tools/check-all.sh` from a
deleted `bridge/out` (21 files compiled into a fresh one), started at 07:54:38
after every source edit of the fix pass and tee'd to
`var/check-all-bodies-fix1.log` (renamed `var/check-all-bodies-fix1-round1.log`
by the second fix pass, whose own gate log took the name, §8.6): **exit 0, 912 s** (`check-all OK`), 9c's
fourteen games 378 s — all fourteen reaching `over` with zero UNIMPL, every log
through `check-redaction.mjs`, no preferences file touched — and `npm test` inside
it **894 `node --test` / 886 pass / 0 fail / 8 skipped** (the ws-log suite skips
the candidates `MTGTABLE_WS_LOGS` does not name) **+ 94 vitest**. 9b, the
advisory seed-42 drift check, reported three extra frames (one `act`, two
`input`) and none missing — the known timing instability of a human-seat
fixture. Other lanes' `ten-games.sh --jobs 4` runs shared the machine (load
average 5–8). Nothing under `bridge/` changed.

**`~/forge` and `~/.forge` are unchanged.** The listing of every path, size and
mtime under both (22,155 paths) taken before the fix pass's gate
(`var/bodies/fix1/forge-list-fix1-before.txt`) is byte-identical to the resumed
pass's last one (`var/bodies/forge-list-session3-after.txt`), and so is the
sha256 of every `~/.forge` file (`var/bodies/fix1/dotforge-sha-fix1-before.txt`
against `var/bodies/dotforge-sha-session3-after.txt`). After the gate the same two
listings (`…-fix1-after.txt`) are byte-identical to the ones before it.
The jar still hashes to `3c0a7c38…8e5dd9`.

### 8. The second fix pass — the verifier's second round

The verifier (round 2) found one blocker, five majors and four minors, and read
the pictures (twelve cards at the workshop's 1×, `g1`@355 at views 1, 3 and 4,
both looks). What each became:

| finding | the second fix pass |
|---|---|
| **blocker**: an uncommitted, abandoned attempt at a further pass (a one-shell `longCoat` for the duelists, the cloak taken off the villain, Quake's hair swapped to the body's own) left the tree failing `traits.test.ts` (Quake's face at 1 px) | **discarded** back to `f9905f5` (the diff is kept at `var/bodies/fix3/abandoned-d147.diff`); the duelists' problem was solved another way (§8.2), and Quake's (§8.3) |
| **major**: the builder's claims (commit, counts, gate log) and the before/after pictures described trees the branch no longer had | every claim below is re-measured on the tree as committed; the pictures are re-shot, base and branch back to back with one script (the table at the top); the pictures of §1–§7 are marked superseded |
| **major**: the art palette never reached a pixel, and the workshop's `palette` row did nothing | **switched on** (**D148**, §8.4) |
| **major**: the duelists' coats read as detached planks | **lined** (**D147**, §8.2) |
| **major**: coats swallowed their figures — Fury's "a wide bell that hides his legs", the Biochemist's "a huge white bell … stair-step ledges" | **cut to the body** (**D147**, §8.2); the lab coat greyed a step off paper white |
| **major**: no pack hairstyles, no expressions, and Quake's bob "covers her face from above like a helmet" | the pack still needs your approval in chat (PLAN.md follow-up 2 — nothing was downloaded, and no copy is on this machine); **grit** is built as a pose (**D149**, §8.3); the **bob is re-cut** as hair (§8.3) |
| minor: Agent 13's aim reads "low at her hip", Coulson's clasp "low at the groin", the Soldier tokens "hands on head" | **re-aimed for a lens looking down** (**D149**, §8.3): Agent 13 at the high ready, Coulson's clasp above the belt with the elbows out, at-ease elbows at the waist |
| minor: the anonymous sweep's "no art colour" proved nothing (no map was passed) | the sweep now passes a map that answers every name: 1,179 anonymous instances, none coloured, and 11,449 face-up ones took the rung |
| minor: SwiftShader numbers not reproducible at a load average of 16 | base and branch benched back to back (§8.5); a quiet re-run is PLAN.md follow-up 21 |
| minor: a figure that mounts kneeling blends the stock idle (`FigureLayer.tsx`, LOOK's) | unchanged: the file is lane LOOK's, and follow-up 1 has the one-line edit |

#### 8.1 What the pictures show now

`var/bodies/fix3/compare/workshop-{comic,holo}-before-after.png` (twelve cards,
the base above, the branch below) and `…/table-355-v1-{comic,holo}-crops-before-after.png`:

- **Nick Fury** — bald, arms folded, in a black coat that hugs him to just below
  the knee, his legs showing under it. The base drew a bell to the floor.
- **Bold Biochemist** — bent over the bench in an open lab coat; the lean reads.
  In the hologram the white still blooms (the rim is lane LOOK's), but it is a coat
  on a man and not a white box.
- **Agent 13** — the pistol up beside her face, its lit muzzle above her shoulder.
- **Quake** — a brown bob with lit locks and a swept fringe; her face shows under
  it, her head up out of the guard.
- **Coulson** — hands clasped above the belt, elbows out; **the Soldier token and
  the Agents** — arms at their sides, hands behind them.
- **The duelists** (`var/bodies/fix3/compare/duelists-v1-base-head-now.png`: the
  base, the committed `f9905f5`, and this pass): the director's coat is one coat
  from three-quarters behind, and the villain's cloak one cloak from the front;
  the committed tree's fan of loose panels and green slab are gone.
- **The art rung** — the Giant-Sized Flying Ant is its painting's brown, where the
  colour identity drew it blue; Wasp's aura its painting's salmon; the workshop's
  `palette` row switches it (`var/bodies/fix3/palette/ant-{art,off}-{comic,holo}.png`).

#### 8.2 The coat, cut to the body and lined (D147)

**Measured on the bodies first** (`var/bodies/fix3/scratch/measure.scratch.ts`,
the committed `figures.glb` through the arena's own loader, every vertex that is
not skin, hair or gloves, in bands of 0.025 of a height, `agent@folded` so the
arms are off the sides): the waist (y 0.50–0.55) is ±0.08 wide and 0.13 deep
round an axis at z −0.035; the thighs ±0.10 at y 0.40; the idle's knees 0.12 out
at y 0.30. D146's skirt stood round an axis at z −0.012 with its upper links
0.158 → 0.2 from it and its lower links 0.205 → 0.26 — twice the body's width at
the hip, and a bell from above.

| | D146 (committed `f9905f5`) | D147 |
|---|---|---|
| the coat's axis (`COAT_WAIST`, `COAT_CHEST` z) | −0.012 | −0.03, −0.024 (the body's) |
| `COAT_PANEL` top · hem · length | 0.158 · 0.2 · 0.27 | 0.125 · 0.14 · 0.22 |
| body link (chest → hip) radius | 0.136 → 0.172 | 0.113 → 0.126 |
| upper skirt link | 0.158 → 0.2, to y 0.30 | 0.13 → 0.146, to y 0.325 |
| lower skirt link | 0.205 → 0.26, hem y 0.16 | 0.145 → 0.162, hem y 0.25 |
| front panels | ±46° (open 12°) | ±54° (`COAT_FRONT`, open 28°) |
| a panel's triangles (field · duelists' bake) | 24 · 24 (one sheet) | 12 · 24 (the sheet · the sheet and its lining) |

`traits.test.ts`, new — **the fit at rest**: every body and skirt panel's hem,
as the prop field draws it on the figure standing at rest, within `COAT_FIT` 0.2
of a height of its pelvis: **0.189** for Fury and the Bold Biochemist; the front
open **24°** (the idle turns the hips about 15°, so the opening is measured as a
width). The control — the committed panels 1.45× wider, swapped into the kit for
the run — reads **0.262** and fails. **The drape test** still passes with the new
numbers: the lower links ≤ 6° from hanging (the first cut's 87°), and the
farthest hem over six clips at eleven phases **0.28** of a height from the pelvis
(D146's 0.40). **The lining**: `coatTails` and `cape` return twice the triangles
by default, each lining vertex the sheet's inset 0.0025 along its normal, wound
the other way and facing in; no other kind grows one; the field's coat is one
sheet. **The identity raster** (the fewest pixels over standing, kneeling,
centre and edge): Fury's `coatTails` 570 / 744 px from your seat / the
opponent's (1,772 / 1,413 as a bell), his `coat` 206 / 521, the Biochemist's
`coat` 145 / 523 — every one far over the 48 bar.

**The duelists**, from the pictures: the base (slice 4's one shell), the
committed tree (the planks) and this pass, at view 1 in both looks
(`var/bodies/fix3/compare/duelists-v1-base-head-now.png`) — the director's coat
closes round him to the knee from three-quarters behind, and the villain's cloak
hangs whole behind him from the front with its gold hem. `DuelistLayer.tsx` is
untouched: it calls `buildKindGeometry(kind)` and gets the lining.

#### 8.3 Poses, faces and the bob, judged from above (D149)

| | before | after |
|---|---|---|
| Agent 13 | `aim`: `pistolDraw` at 0.45, the barrel at the lens — "low at her hip" | `highReady`: the arms from the aim's own frame, the right forearm up beside her face, the barrel to the sky, the lit muzzle above her shoulder; `pistol` 164 / 101 px, `muzzle` 143 / 63 |
| Coulson | the hands at y 0.62, forearms near level | the hands at y 0.63 with the elbows out — a diamond round the shirt-front (at 0.665, tried, he clutched his chest) |
| the Soldier token, the Agents | the upper arms 25° back: the elbows beside the head from above | the upper arms 9° back; the forearms fold behind the small of the back — arms at the sides from above |
| Quake | the guard's downward look; a near-black bob, fringe to the brows, flared 14% — a helmet | the neck upright; a dark-brown bob, fringe stopping high and swept, temples open, 10% flare, a band of lit locks; her face **8 px** at the table view and **19** over the shoulder from the seat that faces the lens (5 and 13), her hair 142 / 174 px |
| Wasp's bob (the same kind) | 56 / 55 px | 49 / 54 px — over the 48 bar |

**Grit**: `faceGrit` and `facePatchedGrit` — brows at 0.62 rad into a V (neutral's
0.24), the eyes 0.0048 tall (0.0078), and the mouth a white band of teeth between
two ink lines — 88 and 62 triangles like the neutral pair. Over the corpus's
board frames `traits.test.ts` counts **2,673** face-up faces neutral and **1,452**
in grit, each where its stance says, none on an anonymous figure. From the
workshop's 1× the face is not visible (the lens looks down on the head, as it
did before this pass); from a lens at head height, moved through the dev handle,
the grit is plain (`var/bodies/fix3/it6/s3.png`, Coulson at rest and blocking;
PLAN.md follow-up 18). The kinds in one frame: **17** at the corpus's worst
(`human-auto-2026.jsonl`@776; the line was 16).

#### 8.4 The art rung, on (D148)

`Arena.tsx` gains ten lines and changes three, `workshop/Pedestal.tsx` seven
and three (`git diff --numstat`): the pass-through PLAN.md's follow-up 13 wrote
out, in the memos that already make the poses. **They do not collide with lane LOOK**: `git merge-tree` of the merge base
`c81f674`, this pass's tree and `look` (`de4e01f`) reports no conflict in
`Arena.tsx`, `Pedestal.tsx` or `Workshop.tsx`; the files that do conflict —
`CLAUDE.md`, `DECISIONS.md`, `PLAN.md`, `scene/props.ts` (LOOK extracted the
shader, report 15 §9.4's planned hand-over), `liveness.test.ts` and
`traits.test.ts` — are exactly the ones the committed `f9905f5` already
conflicts in (`var/bodies/fix3/merge-tree-look{,-head}.txt`). Against `motion`
(`c492b0b`) only the four documents and `liveness.test.ts` conflict.

**Pictures**: the Giant-Sized Flying Ant in the workshop with `palette: art` and
`off`, both looks (`var/bodies/fix3/palette/`): its painting's brown, and its
mana's blue. On the table at `g1`@355: the ant brown, Wasp's aura salmon, the
Plains tiles their painting's terrain; every card with a hand-written tint
unchanged (the Doombot, Fury, Coulson).

**The accent**: `palette.test.ts` now holds report 15 §7.1's own Fury clusters
(`#091011` 67 %, `#897748` 18 %, `#daad6d` 15 %) to the explosion `#daad6d`; the
committed score picked the khaki.

#### 8.5 Cost, with what drew it

`tools/arena-bench.mjs` against production builds under `vite preview`, the base
`c81f674` and this pass's tree **back to back** (`var/bodies/fix3/bench.sh`,
output in `var/bodies/fix3/bench/`), `g1.jsonl`, `--settle 4000`, 1920 × 993, at
a load average of 3–8 (other lanes' work on the machine; the verifier's runs were
at 16). The draw-call and triangle line is the bench's own sample at the end of
its window.

| bloom off | base `c81f674` | committed `f9905f5` (§7.5) | **this pass** |
|---|---:|---:|---:|
| GTX 1080 `g1`@316 (10 figures drawn), two runs: calls · triangles | 77 · 24,240 (both) | 83 · 26,066 | **84 · 26,167**; 84 · 26,191 |
| GTX 1080 `g1`@355, two runs | 79 · 24,368 (both) | 85 · 26,194 | **85 · 26,391** (both) |
| SwiftShader `g1`@316 (11 drawn) | 81 · 27,420 | 87 · 29,246 | **88 · 29,371** |

The lane now costs **+6 to +7 draw calls and ~1,950 triangles** over the base:
the faces (in grit, a kind of their own, +1 call where a kneeling or attacking
person stands beside a resting one — `g1`@316's tapped Hero tokens), the hair
shells and the sidearm, one call per kind; the triangles are the faces, the hair,
and the duelists' lined panels (the cards' own panels are half what they were).
**Headroom**: the worst sample is 88 calls and 29,371 triangles against report 13
§8.2's 90 and 30,000; with lane LOOK's budget (+2 calls, +500 triangles) it is
**90 and 29,871 — on the line and inside it**. The next kind on the table needs a
measurement first (PLAN.md follow-up 3 is the cheaper road to library headroom;
this is scene headroom).

| frame times, p50 / p95 / max | base | this pass |
|---|---|---|
| GTX 1080 @316, bloom off (two runs) | 0.4 / 0.6 / 10.1; 0.4 / 0.7 / 12.4 ms | 0.5 / 0.7 / 11.7; 0.5 / 4.7 / 40.6 ms |
| GTX 1080 @355, bloom off (two runs) | 0.5 / 0.9 / 7.1; 0.4 / 0.6 / 4.9 | 0.5 / 1.0 / 8.0; 0.5 / 0.7 / 4.9 |
| GTX 1080 @316, bloom on | 0.5 / 1.3 / 16.5 | 0.5 / 1.2 / 11.6 |
| GTX 1080 @316, `?look=comic`, bloom off | 0.4 / 0.8 / 18.0 | 0.5 / 0.8 / 18.5 |
| SwiftShader @316, bloom on (the governor drops it) | 15.1 / 32.4 / 34.8 | 18.9 / 34.7 / 37.6 |
| SwiftShader @316, bloom off | 15.4 / 33.5 / 37.8 | 15.8 / 33.5 / 36.1 |

The GTX 1080's p95 is under 1 ms in every run but one (4.7 ms, a run whose max
caught a 40.6 ms stall; the paired run reads 0.7). SwiftShader's p95 sits at two
frame intervals (~33 ms) with bloom off in both trees, as §7.5 found — report 09
§9.4's 20 ms fails there before this lane — and the lane's p50 is +0.4 ms of it.
The verifier's 20.7 / 39.4 ms was at a load average of 16; at 3–8 the base reads
15.4 / 33.5 and this pass 15.8 / 33.5.

**The build** (`npm --prefix web run build`, gzip −9): the entry chunk is
**281,338 B, 87,412 B gzip — the base's 87,413, with no `three`** (no
`WebGLRenderer` or `BufferGeometry` in it); `arena-scene` 356,984 B against the
base's 348,229 (+8.8 kB; the committed tree's 355,119 — `arena/art.ts` moved into
the chunk the arena and the workshop share, now that the arena imports it);
`Workshop` 24,233 B (the committed 24,895, the base 23,540); `Arena` 14,688 B
(the base 14,554).

#### 8.6 Tests and the gate

`npm --prefix web test`: **887 `node --test` pass, 0 fail, 0 skipped + 94 vitest
in 6 files** (`var/bodies/fix3/test-node-2.log`) — the committed tree's 884 and
three new cases in `traits.test.ts`: the coat's fit (with the D146 bell as its
control), the lining, and grit over the corpus. Changed cases: the census (Agent
13 rests at `highReady`), the kinds-in-a-frame line (16 → 17), the no-traits
poses (a face in grit where the stance says), the kind budgets (the field's
one-sheet panel; the two grit faces), the anonymous sweep (a palette map that
answers every name), and liveness's lane BODIES clause (every caller of
`useArtPalettes`, negative-controlled by a bypassed gate). `palette.test.ts` gains
the bright-accent case.

**The gate, on the tree as committed.** `WSPORT=8720 ./tools/check-all.sh` from a
deleted `bridge/out` (21 files compiled into a fresh one), started at 13:14:55
after every source edit of this pass and tee'd to `var/check-all-bodies-fix1.log`:
**exit 0, 877 s** (`check-all OK`), 9c's fourteen games 368 s — all fourteen
reaching `over` with zero UNIMPL, every log through `check-redaction.mjs`, no
preferences file touched — and `npm test` inside it **897 `node --test` / 889
pass / 0 fail / 8 skipped** (the ws-log suite skips the candidates
`MTGTABLE_WS_LOGS` does not name) **+ 94 vitest**. 9b, the advisory seed-42 drift
check, reported one extra `act` and none missing — the known timing instability
of a human-seat fixture. The load average was 3–5 at the start and under 1 at the
end. Nothing under `bridge/` changed. (The first fix pass's log of the same name
is now `var/check-all-bodies-fix1-round1.log`.)

#### 8.7 `~/forge` and `~/.forge`

**Unchanged.** The listing of every path, size and mtime under both (22,155 paths)
taken at the start of this pass (`var/bodies/fix3/forge-list-before.txt`) is
byte-identical to the one taken after the gate
(`var/bodies/fix3/forge-list-after.txt`), and the jar still hashes to
`3c0a7c38…8e5dd9`.
