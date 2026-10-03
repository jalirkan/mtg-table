## Duelists (T13) — a full figure per seat, replacing the silhouette busts

Tier 2 slice 4's duelist track, built beside the bodies track (proportioned bodies
and the costume palette). Report 13 §11's **T13**: the two flat silhouette busts
slice 1 stood at the HUD anchors (user decision 8, **D62** — "avatars deferred")
are now **one full figure per seat**, drawn through the same figure library, the
same loader (`scene/models.ts`) and the same holographic material and program as
every creature. The busts are kept, and are what a checkout with no
`figures.glb` draws. Nothing on the wire moved, `bridge/` is untouched, no
fixture was re-recorded, no asset and no npm dependency was added.

Every number and photograph below is headless Chromium reaching this machine's
GTX 1080 through ANGLE-on-GL (the dev server, `?bloom=0`), a scratch CDP driver
of the slice-2/3 kind, and **not** a headed desktop browser. Stills are in
`var/shots-t2d4/` and `var/shots-t2d4/ev/` (local, gitignored).

### What was built

- **`figures/duelists.json`** (new, validated) — who stands for each seat. Seat
  `you` is the **director**, seat `opp` the **villain**; a *seat*, never a player
  (nothing reads `PlayerState.name`). A look is a body ladder (`agent`, `hero`,
  `scientist`, `agent-chibi` — the first the library holds wins), a scale (1.6 ×
  `FIGURE_HEIGHT` = **1.36**, a creature is 0.85), a tint mixed with the seat's
  own colour (`seatMix`), a costume in the bodies track's `COSTUME_SLOTS`, props
  from the shared kit each worn in a costume slot, and the slots a prop's trim
  and shade wear. The gestures table names each gesture's clip ladder (the
  body's OWN clip keys), a stance's hold point, a whole-body lean, and aimed bones.
- **`figures/duelists.ts`** (rewritten; pure — no three, React, DOM or clock) —
  `validateDuelists` (unknown keys are errors, a bad look drops its seat to the
  bust), `duelistPoses` (a pose per seat: stand point, facing, height, the look,
  and the **stance from `board.gameOver` alone**: `won` / `lost` / `ready`),
  `duelistStand` / `duelistFacing` / `duelistBox` / `duelistSamples` (the
  geometry the camera tests hold), `stanceEntry`, the gesture vocabulary and the
  **reserved clip-lane ids** (`duelistLane(player) = −1,000,000 − player`).
  `duelistBusts` keeps its five keys (`stack.test.ts`'s contract).
- **`scene/DuelistLayer.tsx`** (new) — builds a body per seat at commit
  (`instantiateFigure` → the costume through `applyCostume` → the props **baked
  into the body**: each kit anchor's unit geometry (`buildKindGeometry`,
  `anchorsOf`) rigidly skinned to its joint and appended to the body's geometry,
  so a duelist is **one mesh, one draw call, one program**), and the
  `DuelistField` whose `bind()` poses both bodies once a frame: position and
  facing, the breathing idle, the stance entry, a transient gesture over both,
  aimed bones, a lean, and the tint — then `mixer.update(0)`.
- **`scene/busts.ts`** — `BustField.bind` (already called once a frame by
  `CueRunner`) now binds the installed duelist field first and draws a bust only
  for a seat with no figure. The busts **stand at the duelists' stand points**,
  so the fallback is out from under the chrome too (Tier 2 follow-up 10).
- **`Arena.tsx`** — validates the data, computes the poses, mounts the layer; the
  dev handle carries `duelists`; `?glinfo=1`'s `layers` counts `duelists`.
- **`camera.ts`** — three pure checks the duelists need and nothing else:
  `keepOutTop` (the chrome band's lower edge in NDC), `clearOfHand` (a body's
  projected hull against every card of a seven-card fan, SAT), `visibleShare`.
  No view, clamp or solver rule changed; the duelists are **not** in the solver's
  required set (`keepsSeat` is recomputed unchanged for every view).
- **The cue engine** (gestures, as params on existing ids — no cue id added):
  the ladder writes a `gesture` **fact** on the four events a duelist answers
  (`resolve.ts`); `validate.ts` knows the param (`cast` · `flinch` · `outcome` ·
  `none`, overridable by a row like `colour`); the shared `cue()` builder plays
  it on the caster's / struck player's lane (`playGesture`) and releases **only
  its own request** on `end()` (`Stage` gained one OPTIONAL query, `clipOf`, which
  `SceneStage` already had); `queue.ts` gained two suppression rules (**5b**: a
  `cast` rule 5 absorbs into its arrival hands its gesture to the arrival —
  otherwise the AI, which casts and resolves inside one snapshot, would never
  raise a hand; **8**: one flinch per player per batch — the damage keeps it, the
  life loss it caused gives it up) and `gesturePending(gesture)`, an indexed
  allocation-free query.

### Where they stand — measured, and why the opponent's is not behind its hand

The brief asked for both at the existing bust anchors. **Measured, the
opponent's cannot be there**: from every seat-safe view the far end of the table
lies under the arena's chrome (`HUD_TOP_PX` = 128 CSS px). A 1.36-tall body
anywhere behind the opponent's hand is **0% visible from the table view** on a
1600 × 1000 window — the whole far end of the table projects above NDC 0.73 — and
slice 1's bust there was 37–89% covered (follow-up 10). A grid over the whole
opponent half (every seat-safe view × every live aspect × both canvas heights)
found the only well-seen places toward the table's centre or at its right side.
So:

| seat | stand (world) | from | faces |
|---|---|---|---|
| you | (−3.95, 0, 4.65) | your HUD anchor (−3.55, 4.25), **0.4 outboard and 0.4 back** — slice 1's point put the legs of a standing body over the fan's leftmost card from the low view | the other duelist: three-quarters **away** from your camera |
| opp | (4.2, 0, −2.2) | the opponent's creature rank, **0.66 past the end of a full nine-card rank** (outer edge x 3.54), level with it, clear of the stack column (x 4.8) and the library (z −4.55) | the other duelist: three-quarters **toward** your camera |

They face each other diagonally across the table. `camera.test.ts`, printed every
run (visible share = the body's 7 × 11 sample grid inside the frame and below the
chrome band; canvases 745 px and 946 px are 1280 × 800 and 1600 × 1000 windows):

```
table     your duelist clear of the hand at every aspect; 100% on screen at 16:9
shoulder  your duelist clear of the hand at every aspect; 100% on screen at 16:9
low       your duelist clear of the hand at every aspect; 100% on screen at 16:9
slice 1's bust anchor: behind the hand at 6 of 18 (view, aspect) pairs — low@1.00 … low@2.33
table     % visible, 745 px | 946 px, at 1.00 1.33 1.60 1.78 2.00 2.33:  84  84  84  84  84  84 | 100 100 100 100 100 100
shoulder  % visible, 745 px | 946 px, at 1.00 1.33 1.60 1.78 2.00 2.33:   0  71  71  71  71  71 |   0  90  92  92  92  92
low       % visible, 745 px | 946 px, at 1.00 1.33 1.60 1.78 2.00 2.33:   0 100 100 100 100 100 |   0 100 100 100 100 100
oppShoulder (spectator) 100% visible at 16:9, 946 px
side      (spectator) 100% visible at 16:9, 946 px
worst at 16:10 and wider 71%, at 4:3 71% · slice 1's bust anchor from the table view: 0% visible
```

Asserted: your duelist's box never overlaps a card of a seven-card hand in any
seat-safe view at any live aspect, and covers none of your own rank lines; the
opponent's is ≥ 90% visible on a 1600 × 1000 window and ≥ 70% on 1280 × 800 at
16:10 and wider, ≥ 70% at 4:3, and covers none of the opponent's rank lines from
the table view. **Negative controls**: slice 1's anchors fail both (behind the
hand at 6 of 18 pairs; 0% visible). **Not asserted, and printed**: a square
window (1:1) cuts the right-hand side of the table off in the shoulder and low
views, so the opponent's duelist is 0% visible there.

Both at 16:9 on 946 px, per view: table 100 / 100 · shoulder 100 / 92 · **opp.
shoulder 31 / 100** (yours is at the top of that frame, under the chrome) ·
**side-on 0 / 100** (yours stands 49.6° off the side view's axis; its half-width
at 16:9 is 33°) · low 100 / 100.

### Who they are

- **The director** (seat `you`): the proportioned male body in a navy suit with a
  white shirt V and black gloves, the kit's long **coat** worn in the suit's
  colour with its trim in **gold** (lapels, collar, hem), and the kit's **badge**
  — gold with its dark roundel — on the chest and its emblem on the back; the
  hologram's edge is the look's steel-blue mixed 45% with your seat's teal. From
  the table view you see him three-quarters from behind: the gold-trimmed coat and
  the back emblem.
- **The villain** (seat `opp`): the same body in iron-grey armour with an iron
  mask (the `skin` slot), a **Doom-green** tunic, the kit's **coat** worn as a
  green cloak trimmed in gold, and the kit's **hood** worn as an iron great helm
  (stretched `[1.1, 0.8, 1.08]` — the look's own stretch of the kit anchor, bounded
  [0.4, 1.8]) whose visor slit wears the dark `shade` slot; the edge is green.

Props are **baked, not instanced**: one merged `SkinnedMesh` per duelist — 1,728
triangles each on the current `figures.glb` (the body 1,699 at the start of the
slice, before the bodies track's later decimation) — with each prop skinned
rigidly to its anchor joint, so the badge rides the chest through every clip. The
kit's own vertex tones choose a prop's slots: a part lit ≥ 4× (a coat's ×30 trim)
wears the look's `trim` slot, one ≤ 0.3 (a visor, a roundel) its `shade` slot.
Stills: `var/shots-t2d4/cu2-sheet.png`, `var/shots-t2d4/v1-pair2.png` (3× crops of
the table view).

### Gestures — cues on the existing ids, decaying to identity

| gesture | written by | lane request | the body |
|---|---|---|---|
| **cast** | any cue on a `cast` (`cast.rise`, Wasp's `fx.scaleBeam`, Helicarrier Strike's `fx.strike`, …) for `players[0]`; an arrival that absorbed its `cast` (rule 5b) for `gesturePlayer` | `channel` / alias `cast`, `clipEnvelope(t)` | the body's `channel` clip (`Spell_Simple_Shoot`): a hand raised toward the table, and back |
| **flinch** | `damage` to a player; `life` with `to < from` (not when damage flinched in the batch — rule 8) | `hit` / `flinch` | `hit` (`Hit_Chest`), a lean back of 0.2 rad, and the whole body **drained toward red** (0.62 × weight, through the shader's `uDrain`) |
| **win** | `outcome.finish`, for `winner` | `grow` / `win` | the stance entry: `grow` held at 0.85 with the right arm **aimed straight up** (upper arm up-and-out, forearm vertical) and the left at the side, and a gold lift in the edge colour |
| **lose** | `outcome.finish`, for every other seat | `die` / `lose` | the stance entry: `crouch` held at 0.8, the head aimed down, a 0.3 rad slump, drained 50% toward grey |

A draw moves nobody; reduced motion writes no request (measured: no lane request
during the final batch under `prefers-reduced-motion`, the stance held until the
outcome cue ended and then snapped). **The win and lose stances are POSES**
(`board.gameOver`), so they survive `skip all`, a scrub and a `resync`; the outcome
cue only plays the entry. `stanceEntry` is the one rule that keeps the end from
blinking — the snapshot that ends the game already says who won, so while the
outcome cue is **queued** behind the batch's blows the loser is still standing and
flinching (entry 0), while it **runs** the entry is its `t` over the first 70%, and
once it has played (or was skipped) the stance is held (1). The library has no
raised fist, so the winner's is the clip's arm, aimed: `duelists.json`'s `aim`
turns a joint so the line to its child points along a figure-space direction,
after `mixer.update(0)` and before the next one rewrites it — rig-checked in
`duelists.test.ts` against the real `figures.glb` (65 joints).

**Idle breathing reads the cue queue's virtual clock** (`queue.now`), which runs
only while the queue has film: an idle table still renders nothing (D58), and
pause, speed and skip hold for the duelists with no clock of their own.

Census over every batch of the committed corpus (`duelists.test.ts`, printed
every run; gestures by seat, counted in the batches they play in):

```
3293 batches · opp:cast 207 · opp:flinch 22 · opp:lose 2 · opp:win 16 · you:cast 178 · you:flinch 90 · you:lose 16 · you:win 2
3679 board frames · 30 after the game ended · stances ready 7298 · won 30 · lost 30
```

and after every batch drains **no duelist lane holds a request** (the decay
assertion, stated for these ids; `replay-cues.test.ts`'s own "clips empty after
every batch" covers them too).

**Photographed** (`var/shots-t2d4/ev/`, queue paused and stepped, fiber pumped):

- `gestures-sheet.png` — the villain casting at `g1` 354 → 355 from the table view
  (rest · t .32 · t .55 · after: the right arm comes up toward the table and
  back); the director casting at 369 → 370 from the shoulder (t .28, .54: his arm
  reaches out over the table).
- `flinch-cu-sheet.png` — the director taking the 2 damage at 358 → 359 (a private
  close-up camera; the spectator's lethal-damage push-in takes the real camera
  off him): rest · t .14 and .36 **red and recoiling** · after. The `−2` rises from
  the HUD anchor at his feet.
- `end-sheet.png` — the last batch, 372 → 373 (four blows to the villain, then
  the outcome): the villain flinching red at 250 ms, **standing** while the
  outcome is queued, then kneeling, head bowed and drained through the outcome cue
  and after; the director's arm rising and held **raised**.
- `g1-355-view1.png` … `view5.png` — both duelists at the budget frame. Views 1,
  2, 3 and 5 show both (view 3 shows yours small at the top right, partly under
  the chrome); **view 4 (side-on) shows only the villain** — see above.

### Budgets and idle — `g1`, bloom off, dev build, GTX 1080, 1920 × 993

| frame | draw calls | triangles | programs | figures | duelists | busts |
|---|---:|---:|---:|---:|---:|---:|
| @355 | **79** | **27,416** | **12** | 11 | 2 | 0 |
| @316 | **73** | **24,316** | **12** | 10 | 2 | 0 |
| @355, `figures.glb` blocked (the fallback) | 59 | 3,078 | 10 | 0 | 0 | 2 |

Inside ≤ 90, ≤ 30,000 and ≤ 14. The duelists cost **2 draw calls** where the
busts cost 1, **no program** (both duelist meshes use the figures' holographic
program — measured, program #9 draws 13 objects: 11 figures and 2 duelists) and
**3,456 triangles**. Idle: `human-comfort-13`@1262, **0 frames in 5 s** with both
duelists drawn (bloom off). (`g1`@355 renders continuously for its `presence`
bobbers — Tier 2 follow-up 7, unchanged.) The frame-loop bodies allocate nothing
(liveness scans `DuelistField.bind`, `drive`, `covers`, `aimBones`, `aimList`,
`BustField.bind`, the bust reaction, `stanceEntry`, `CueQueue.gesturePending`, …).

Production build: `npm --prefix web run build` — 0 errors; entry chunk **86.23 kB**
gzip (unchanged, no `three`), `Arena` 359.81 kB with both slice-4 tracks in the
tree, `Post` 16.54 kB.

### Hard rule 8

A duelist is a seat: its pose carries a seat, a player id, colours and numbers —
asserted over every board frame of the corpus that no string field of a pose is a
player's name — and the layer reads no player or card `.name` (liveness,
negative-controlled). The gesture writes a clip name and a gesture name from two
closed sets to the stage (asserted), never a card or a name. Never a click target:
the merged mesh's `raycast` is cleared (liveness), and it stands beside the table
where no card is.

### The live game — port 8660, seed 5, view 2

`./bridge/run.sh mtgtable.MtgTable --transport ws --port 8660 --seed 5 --games 1
--keep-open`, the board at `http://127.0.0.1:5180/?ws=1&port=8660#arena`, the
shoulder view (`2`). With a seven-card hand the director stands at the left edge,
clear of the fan's leftmost card; the villain stands at the right, beside the
opponent's seat plate (`var/shots-t2d4/live-0.png`, `live-3-turn6-v2.png`). **Canvas
clicks reach the engine**: a Plains clicked on its own hit proxy in the 3D hand
(projected from its rig, real CDP mouse events) was played — the next `state` has
it on the battlefield and the hand one card lighter (`live-2-after-click-v2.png`);
a second land on turn 4 the same way; a click on Borough Backup opened the engine's
`ability_menu`, answered in the ask modal (its {4}{W} could not be paid from two
Plains, and the payment was cancelled). The **villain's cast** gesture played
live (13 frames, weight to 1, when the AI cast on turn 3). A concession ended it:
the stances were right (you `lost`, kneeling and grey; the villain `won`, fist up —
`live-5-over-v2.png`). The frame log passes `check-redaction.mjs`; the bridge
printed `MTGTABLE OK`.

**A defect the live game found, fixed**: mid-game the busts came back — a Vite hot
update (another track editing files in the same tree) re-ran every effect, and the
bodies were disposed in a passive effect's cleanup after the layout effect had
rebuilt them. Build and disposal are now one layout effect (cleanup and setup
always pair), and the live page rebuilt both duelists on the next update.

### Tests

- `web/test/duelists.test.ts` (new, 9): the committed file validates with zero
  errors and names bodies, clips and kit anchors the library has; 14 negative
  controls; one pose per seat over all 3,679 board frames, no name, stance from
  `gameOver` alone; `stanceEntry`; the reserved lanes; the ladder's facts and
  rules 5b and 8; the builder's play, decay and own-only release (with the
  redaction check); the corpus census and the empty lanes after every batch; the
  aimed joints against the real rig.
- `camera.test.ts` (+3): your duelist clear of the hand and your ranks in every
  seat-safe view; the opponent's visible and out from under the chrome; the
  duelists never in the solver's required set.
- `liveness.test.ts` (+2 clauses, 2 amended): the duelists are bound only from
  `BustField.bind`, installed only by `DuelistLayer`, load through `models.ts`,
  draw with `makeHoloMaterial`, have no `useFrame`, no clock, no click and read no
  name; the frame-loop allocation scan over their bodies; `DuelistLayer.tsx` joins
  `CueRunner.tsx` and `FigureLayer.tsx` as a file that ticks a mixer (literal `0`)
  and writes `action.time` — reached only through the one frame loop.
- `npm --prefix web test`: **724 `node --test` pass / 0 fail + 79 vitest**, both
  tracks in the tree at the time of the run.

### Not done, or worth a decision

1. **The opponent's duelist is not behind its own hand** — measured impossible
   under the chrome (above). It stands at the table's right-hand side. If the user
   wants it at the far end, the chrome band, the table view's pose or the table's
   depth has to move — a camera or layout decision, not a duelist one.
2. **Side-on (view 4) does not frame your duelist**, and the opponent's shoulder
   shows it 31%. Both are spectator views and the duelists are never in the
   solver's required set.
3. **The fist is an open hand** — the aim raises the arm; the fingers keep the
   clip's pose (curling 15 finger joints was not worth its data).
4. **The coat is rigid on `spine_03`** — when the win clip twists the torso the
   coat's lapel strip shows its seam (`ev/end-sheet.png`, the director's last
   frames).
5. **The villain's look rests on the kit's geometry**: the `hood` is A.I.M.'s
   bucket, worn as a great helm by stretching the anchor; the kit had no cowl. The
   look will move whenever the bodies track refits an anchor.
6. **A live flinch was not seen**: the damage batch in the live game arrived while
   the engine waited on the human and was snapped by the 250 ms budget (Tier 2
   follow-up 1, question 12) — the same reason the live lunge is not seen. The
   live concession's outcome cue did not visibly play either (the stances appeared
   at once); the entry animation is evidenced in replay.
7. **The damage number rises from the HUD anchor** (`playerAnchorFor`, in
   `layout.ts`), which is at your duelist's feet but not the opponent's; moving the
   anchor to the duelist is a `layout.ts` change and was out of this track's files.
8. **The triangle headroom is the bodies'**: two duelists are 3,456 triangles;
   `g1`@355 sits at 27,416 of 30,000 with 11 modelled figures. A frame at
   `MAX_FIGURES` (12) with both duelists has less than 1,000 to spare.
9. **Decisions to record** (DECISIONS.md is not this track's file): the duelists'
   stand points (and the measurement behind them), gestures as a `gesture` param on
   reserved clip-lane ids with an optional `Stage.clipOf`, suppression rules 5b and
   8, and props baked into a duelist's body rather than instanced.

## Bodies — proportioned people in costumes (the bodies track)

*Appended 2026-09-27 by the bodies track of Tier 2 slice 4. Worktree
`/home/justin-a/code/mtg-table-t2d`, branch `tier2-slice4`, nothing committed.
Files: `tools/build-figures.mjs`, `tools/assets-manifest.json`,
`web/public/models/figures.glb`, `web/src/arena/figures/{models.json (generated),
figures.json, traits.json, traits.ts, validate.ts, props.ts, pose.ts}`,
`web/src/arena/scene/{models.ts, holoMaterial.ts, FigureLayer.tsx, props.ts}`,
`web/src/arena/layout.ts` (comments only — no constant moved), `NOTICE` §7, and the
tests `figures.test.ts`, `clips.test.ts`, `traits.test.ts`, `prop-raster.ts`,
`liveness.test.ts` (one new clause). Every browser number and photograph is
headless Chromium on this machine's **GTX 1080 through ANGLE-on-GL**
(`--use-angle=gl`, WebGL's unmasked renderer: "ANGLE (NVIDIA Corporation, NVIDIA
GeForce GTX 1080/PCIe/SSE2, OpenGL 4.5.0)"), the dev server on 5181 with HMR off,
1600 × 1000, `?bloom=0` unless it says otherwise, a scratch CDP driver of the
slice-2/3 kind — **not** a headed desktop browser, and not an integrated GPU.
Stills: `var/shots-t2s4/` (views and seat crops) and `var/shots-t2s4/closeups/`
(front and back of every humanoid in nine corpus frames) — local, gitignored.*

The user's verdict on slice 3 was *"the game looks generally improved. The
avatars are still pretty generic."* This track answers the creature half of it:
slices 1–3 stood every humanoid card in a Kenney **chibi** (head half the figure,
1.07–1.15× wider than tall) whose only identity was one tint and what it carried,
because the holographic shader kept geometry only — Peggy could not have a blue
jacket AND a red hat. Now every humanoid card is a **proportioned person in a
painted costume**, still a hologram, still one program.

### The asset — Quaternius "Universal Base Characters" [Standard], CC0 on the day

- **Licence, read on the download day (2026-09-27), verbatim** — the badge is the
  only evidence that survives the page changing (Quaternius began relicensing on
  2026-08-28, report 12 §0.2): the quaternius.com pack page's info row
  **"License CC0"** (linking the CC0 deed) and its feature line **"Free to use in
  personal, educational and commercial projects. (CC0 License)"**; the itch.io
  page's **"Asset license: Creative Commons Zero v1.0 Universal"**; and
  `License_Standard.txt` inside the zip: "CC0 1.0 Universal (CC0 1.0) Public Domain
  Dedication … Models by @Quaternius". So the fallbacks the task named (Quaternius
  "Man in Suit", KayKit adventurers) were not needed.
- **The file**: `Universal Base Characters[Standard].zip`, **128,968,391 bytes,
  sha256 `fdbf1804c90dfc1ea03e992bff7da2dfd1a79318e13270a660180f9308455f40`**,
  through itch.io's free "No thanks, just take me to the downloads" flow (the
  upload is dated 16 December 2025). Recorded in `tools/assets-manifest.json`
  (`quaternius-universal-base-characters`) and NOTICE §7.
- **What is in it, measured.** The free Standard zip holds only the **Superhero**
  male and female of the kit's six bodies — the **Regular and Teen proportions are
  in the paid Source zip**, so the task's first choice (Regular) was not
  available and the Superhero bodies are used for every humanoid. Both are on the
  **same 65-joint Unreal-named rig as the Universal Animation Library's
  mannequin** (the build now asserts the joint list against the library's skin),
  T-posed, facing +Z; 12,566 and 12,812 triangles, 1.81 m and 1.76 m. Eight
  hairstyles come "rigged to head bone" (weighted 100% to `Head`, carrying their
  body's own `Head` bind matrix — measured). The textures are never read.
- **The four earlier sources were re-downloaded** into this worktree (the three
  direct links by curl, the Animation Library through itch's free flow) and all
  four match their manifest bytes and sha256; **rebuilt with slice 3's manifest,
  `figures.glb` came out byte-identical to the committed one** (143,920 B,
  `c09ac552…a981a3`) — slice 3's follow-up 7, closed.

### What the build does to it (`tools/build-figures.mjs`, section 4)

1. **The body**: the `.gltf` + `.bin` pair is read out of the verified zip; the
   eyes and eyebrows are dropped (a head is 12 px tall at the table view).
2. **The hair**: `Hair_SimpleParted` (the man) and `Hair_Long` (the woman) are
   grafted onto the body's skin, joints remapped by name, the bind asserted equal.
3. **Costume slots** (`_REGION`, one unsigned byte per vertex, the index into
   `figures/props.ts`'s `COSTUME_SLOTS` — skin, hair, top, shirt, legs, shoes,
   gloves, belt — which the build imports): from the joint that moves the vertex
   (Head/neck → skin, spine/clavicles/arms → top, hands and fingers → gloves,
   pelvis/thighs/calves → legs, feet → shoes), the hairstyle whole as hair, and two
   measured bands: a V down the chest front (from the collar, half-width 0.1 m, to
   9 cm below the chest joint) → **shirt**, and the base body's own waistband →
   **belt**. The chibi fallbacks get slots too (their face is the front of the
   head below the brow).
4. **Heroic-miniature head, ×1.3** about the Head joint, weighted by each
   vertex's head weight so the neck blends — a superhero body is 8.6 heads tall and
   at 60–100 px its head was a 7-px dot that no hat, helmet or eyepatch could sit on.
5. **Clips, retargeted by world-space delta over the major skeleton** (22
   joints; fingers hold their bind): `targetWorld = sourceWorld · sourceBind⁻¹ ·
   targetBind` per joint, parents first, the pelvis translated by the source's hip
   delta scaled by the hip heights (1.035 for the man, 1.017 for the woman). The
   two rigs share joint NAMES but not rest orientations (measured: neck 17–23°,
   spine_03 12–14°, Head 6–15° apart), so local rotations are not copied. **No
   face-plant**: lab renders of all twelve clips at four phases each, front and
   side, on both bodies, show natural poses (the chibi's face-plant was a 7-joint
   rig with a head half its height, D68). Sampled at 24 fps, resampled at a
   quaternion tolerance of 0.001.
6. **Decimation**: meshopt's `simplifyWithAttributes` (meshoptimizer 1.2.0 — the
   copy `@gltf-transform/cli` itself uses, so a build is deterministic) to **1,400
   triangles** per body, each vertex's slot a one-hot attribute (slot borders
   survive) and the shirt's and belt's vertices **locked** — a plain simplify kept
   6 of the shirt's 58 vertices and the white shirt was a smear. The drone
   (4,544 → **1,900**) and the bee (3,040 → **1,700**) are decimated too, because
   `g1`@355 has three drones and the frame has to stay under 30,000.

**The clip map** (`rigs.ubc.clips` in the manifest; every one the library's own):

| key | clip | note |
|---|---|---|
| idle | Idle_Loop | the rest; also every clone's STARTING pose (below) |
| summon | Jump_Land | arrives landing |
| attack | Punch_Cross | |
| block | Sword_Idle | a guard with no sword |
| hit / die | Hit_Chest / Death01 | Death01 falls on its back — away from the seat it faces, toward the centre line |
| grow / channel | Spell_Simple_Enter / Spell_Simple_Shoot | |
| shrink | Crouch_Idle_Loop | Ant-Man's attack, Quantum Reduction's host — the hunch |
| crouch (tapped, held at 0.85) | **`Fixing_Kneeling+Idle_Loop`**, composed | the library has no upright kneel: Fixing_Kneeling's legs and hips (their 40-odd-degree TURN removed by swing-twist, their pitch kept) under Idle_Loop's torso held upright in world space — a figure taking a knee, chest to the table. The first two compositions were measured wrong by the raster and photographed: on Fixing_Kneeling's own hips the body turned edge-on (Coulson's tie 1 px, Peggy's shield 6 px); on the idle's hips it stood on one bent leg |
| pistolDraw (Agent 13's attack) | Pistol_Shoot | a two-handed aim |
| radioCall (Fury's channel) | Idle_Talking_Loop | |

**The library** (`web/public/models/figures.glb`, meshopt):

| id | node | triangles | bones | bind height | resting width / height | clips |
|---|---|---:|---:|---:|---:|---:|
| agent (the man) | agent | 1,400 | 65 | 1.914 | **0.37** | 12 |
| hero (the woman) | hero | 1,398 | 65 | 1.853 | **0.33** | 12 |
| scientist | = agent's node | — | — | — | — | — |
| agent-chibi / hero-chibi / scientist-chibi | Kenney, kept | 723 / 742 / 710 | 7 | 0.67–0.72 | 1.07–1.15 | 12 |
| drone | | 1,900 | 11 | 0.771 | 1.67 | 5 |
| insect | | 1,700 | 9 | 1.881 | 1.47 | 4 |

**373,236 bytes, sha256 `fe13b02cd692c0046e04b15afe47ff29c1d70601f8216943041ed0fb4f7aae90`**,
8,573 triangles, 63 clips — inside §8.2's ≤ 400 kB (the humans' clips are most of
it). **Reproducible**: `node tools/build-figures.mjs --verify-only` passes all five
sources, and two builds from them are byte-identical (`cmp`); `models.json`
records the bytes and hash and `figures.test.ts` holds the committed file to them.

**Width, the clamp, the slot.** A proportioned body is 0.33× (the woman) and 0.37×
(the man) as wide as tall in its widest resting stance (the idle; the kneel is
narrower), so the strict clamp (**D65**, unchanged) no longer bites: every
humanoid stands its full `FIGURE_HEIGHT` 0.85 (the chibi was clamped to 0.63),
0.28–0.31 wide in a 0.72 slot. `figure-pose.test.ts`: 7,216 neighbouring pairs,
worst overlap **0.000**; every model fits its slot; the back-row rule (**D66**)
unchanged. `DEPARTURE_STEP` (0.85) is now a body's whole height, so a falling body
lies clear of its rank.

### The costume — one palette per figure, one program

`scene/holoMaterial.ts`: the vertex shader looks each vertex's slot up in a
`uCostume[8]` uniform array (`costumeRegion`, renamed from GLTFLoader's `_region`
once at load) and passes the colour on; the fragment shader draws the body in its
palette (`uCostumeOn` 1), rims the silhouette in the card's **tint** (so the
hologram still glows in the card's colour), is more solid (core alpha 0.74 against
0.38) and its scanlines softer (0.12 against 0.35) and now counted in the FIGURE's
height (`uUnitScale`, 23 lines a figure for every model). A figure with no palette
— the drone, the bee, an anonymous figure — is drawn by exactly slices 1–3's
terms. The palette is written by `applyCostume` at **commit**, from
`FigureLayer`'s layout effect (keyed, so the strings are parsed once a game), a
frozen pose washed grey there; a dying body's drain is a number (`uDrain`) its
frame loop writes, which reaches every slot. **Still one program** (12 with bloom
off at `g1`@355, as slice 3), no texture, nothing allocated per frame — a new
liveness clause holds it (no `applyCostume` or `uCostume` write in `CueRunner.tsx`,
`DiscField.bind`, `DepartureField.bind` or `PropField.bind`, negative-controlled;
only `holoMaterial.ts` writes a costume colour; no clock in the shader).

`traits.json` gains **`costume`** (slot → `#rrggbb` or `tint`, merged slot by slot
down the ladder; `figures/pose.ts`'s `costumeOf` fills the rest from the top — skin
`#d6a57f` for everyone, one neutral tone: a costume is identity data, a
complexion is not) and **`body`** (`human` | `chibi`). Rungs: spy = a dark suit and
white shirt; hero = blue below and a gold belt; soldier = tactical grey, black
gloves; scientist = a white lab coat over grey. `figures.json` stands the women
the spy rung would put in the man's body (Peggy, Agent 13, Quake) in the woman's,
and Ant-Man (whom the hero rung would put in the woman's) in the man's.

| card | body | costume (top · shirt · legs · accents · hair) | props |
|---|---|---|---|
| Peggy Carter | woman | blue jacket `#2d4f9e` · white shirt · navy · brown shoes · brown hair | red hat, shield |
| Agent Phil Coulson | man | navy suit `#1f2c4c` · white shirt · navy · black shoes and belt | badge (chest + back), tie |
| Nick Fury | man | black `#16181d` · dark grey · black · black gloves | long black coat, eyepatch |
| Quake | woman | black `#16181e` · black · black · **teal gloves and belt** | glowing gauntlets |
| Agent 13 | woman | indigo `#3c3593` · indigo · darker indigo · silver belt · **blonde** | pistol (in her hand), muzzle |
| Agents of S.H.I.E.L.D. | man ×3 | grey suits `#59616e` · white shirts | the squad (followers shaded from the suit) |
| Bold Biochemist | man | white coat `#eef3f1` · pale green · grey | white lab coat, bench |
| A.I.M. Scientists | man | yellow `#e8c22e` · black gloves, boots, belt | hood, bench |
| Wasp | woman (×0.55, hovering) | **gold** `#f2c230` · black chest panel · **black** legs · gold boots | wings |
| Ant-Man | man | **red** `#c3302a` · black chest panel · red · **silver** gloves and belt | helmet |
| Soldier token | man | tactical grey, black gloves and belt | — |
| Hero token | woman | its pale-gold tint · blue legs and boots · gold belt | — |

`traits.test.ts` reads the task list back off the poses (Peggy's jacket blue and
shirt white and hat red; Coulson navy and white; Fury black; Quake black with teal;
Agent 13 indigo; the Agents grey; the scientists white; A.I.M. yellow; Wasp gold and
black; Ant-Man red and silver; the drone and the bee wear nothing) and fails if any
slips. It also checks every body that carries slots carries all eight (the chibis
all but a belt), in range — the build and the shader agree.

**Hard rule 8, unchanged and asserted**: an anonymous figure is the disc, and now
wears nothing — `traits.test.ts` over the corpus: **1,179 anonymous
figure-instances, none with a prop, a hover, a swarm, a silhouette, a trait rung
or a costume**; a hand-built face-down "Wasp, Shrinking Savior" wears no gold and
black.

### Props, re-anchored — and read from both seats at ≥ 48 px

A new body family, **`human`** (`familyOf`: rig `ubc`), with its own anchors for
every kind, written in the body's bind pose (the chibi keeps `humanoid`). Measured
landmarks are in `figures/props.ts`. What changed besides placement: the **coat**
is re-cut for a person (0.15 → 0.25 flare over 0.56, a collar at the jaw, not a
bell over the head); the **eyepatch** is written in unit-head space (one geometry
for both heads) with a slate edge instead of a pale ring (on a person's face the
ringed disc read as a monocle); **Agent 13's pistol is in her hand** — anchored to
`hand_r` in her AIM pose (new `PropAnchor.pose`: an anchor written in a pose of a
clip, not at bind), so it is in her hands while she attacks and hangs at her side
at rest; `PISTOL_MUZZLE` moved with it, so the cue's muzzle flash lands on it with
no cue edit (`facing.test.ts` green); the **squad wedge** is 0.34 aside (0.46 was a
chibi's width); the **rider** is the woman hunched, ×0.46; the kit's
`baseName` no longer turns `spine_03` into `spine` (the proportioned rig's own
joints end in digits).

`traits.test.ts`, table view 1600 × 1000, the fewest pixels over standing and
kneeling, alone and at a rank's edge, the real `figures.glb` and the real
`PropField` (≥ 48 on both seats; one-sided details ≥ 24 on their own side):

| card | prop | your seat | opponent's |
|---|---|---:|---:|
| Coulson | badge (chest + back) | 73 | 153 |
| | tie (one-sided) | 32 | 3 |
| Peggy | shield / hat | 116 / 423 | 78 / 203 |
| Agent 13 | pistol / muzzle | 162 / 120 | 99 / 70 |
| Agents of S.H.I.E.L.D. | squad | 1,142 | 1,035 |
| Quake | gauntlets | 118 | 86 |
| Fury | coat | 783 | 1,855 |
| | eyepatch (one-sided since slice 4) | 56 | 42 |
| Wasp | wings | 249 | 303 |
| Ant-Man | helmet | 276 | 192 |
| Air Force | swarmBee | 2,454 | 1,520 |
| Giant-Sized Flying Ant | wings / rider | 821 / 290 | 313 / 198 |
| Bold Biochemist | coat / labBench | 634 / 1,244 | 1,841 / 670 |
| A.I.M. | hood / labBench | 435 / 1,358 | 342 / 969 |
| Doombot | visor / jetpack / laserEye / exhaust | 139 / 65 / 48 / 0 | 78 / 167 / 0 / 44 |

Two thresholds moved, each with its measurement: **the eyepatch joined the
one-sided details** (partner: the coat) — on a head 12 px tall it cannot be
48 px from both seats without being a mask, and it measures 56 and 42; and **the
Agents' heads test** is re-calibrated for proportioned heads — ≥ 60 px each (a lone
agent's head measures 126–142, a follower's 79–87) and ≥ 20 px apart across the
screen (was 150 and 15: a chibi's head was half its figure) — with the heads found
by their costume slots (skin and hair) rather than by height, so a KNEELING
leader's head is still a head. Slice 3's first formation, the control, still
fails 8 of 8.

### A defect the new bodies exposed, fixed in `scene/models.ts`

At the end of Agent 13's attack (`g2` 156 → 157, the queue stepped by hand) the
body flashed into its **T-pose**: three's mixer blends every bone toward the pose
it found when an action first played whenever the weights sum below 1, and they do
for the ramp of every cue whose clip is also the stance's own (an attacker's
`attack`, a blocker's `block` — `CueRunner.driveClips` returns early when the rest
action IS the transient). A chibi's bind pose was a stubby A-pose nobody noticed;
a proportioned body's is arms-out. `instantiateFigure` now starts every clone at
its idle's first frame (`pose: 'rest'`, the default; the skin's bind is
untouched); `PropField` asks for `pose: 'bind'`, which its anchors are written in.
Re-photographed: the attack ends in the idle, pistol in hand
(`var/shots-t2s4/cue/cue-atk-0060…0740.png`: 60 ms the aim with the pistol in
both hands; 710 and 740 ms, at clip weights 0.36 and 0.15, arms coming down to the
idle — before the fix the same step at weight 0.02 was a T-pose). The lab clip
sheets (every clip at four phases on both bodies; the kneel candidates) are in
`var/shots-t2s4/lab/`. The early return in `driveClips` is
still there (`CueRunner.tsx` is not this track's) — see *Not done*.

### Budgets — bloom off, dev build, GTX 1080, 1600 × 1000 (the duelists included)

| frame | draw calls | triangles | programs | figures | prop kinds / instances |
|---|---:|---:|---:|---:|---:|
| `g1`@355, views 1 / 3 / 4 | **79** | **27,416** | **12** | 11 | 9 / 16 |
| `g1`@316, views 1 / 4 | 73 | 24,316 | 12 | 10 | 8 / 15 |
| `disjoint`@242, views 1 / 3 / 4 | 55 / 55 / 53 | 13,624 | 12 | 5 | 8 / 10 |
| `g1`@355, **bloom on** | (1 — the composer's last pass) | — | 27 | | |

Against report 13 §8.2's ≤ 90 calls, ≤ 30,000 triangles and ≤ 14 programs (bloom
off; bloom's 27 is Tier 2 follow-up 5, unchanged in kind). Slice 3's `g1`@355 was
78 / 27,906 / 12 **without** duelists; with this track's first cut (1,700-triangle
bodies, the drone at 2,300 and the bee at 2,000) and the duelists' two full
bodies, `g1`@355 read **31,909** triangles — over — which is why the bodies are
1,400, the drone 1,900 and the bee 1,700: the task's suggested 2,500–3,500 a
body assumed twelve humans and nothing else, and `g1`@355 has seven humans, three
drones, an insect, a rider, sixteen props and two duelists. **Idle is still zero**:
`human-comfort-13`@1262, `gl.render` hooked for 5 s — **0 calls, bloom off and
on**. The frame loop allocates nothing new (the liveness scans, including the new
costume clause, are green).

### What the table looks like — every deck card, both seats

Views 1 (table) and 4 (side-on) — and 3 (the opponent's shoulder, which shows
YOUR figures from behind and the opponent's from the front) — at `g1`@355 and
`disjoint`@242 (`var/shots-t2s4/v-*.png`, seat crops `crop-*-2x.png` at 2× of the
1× shot), and a close front and back of every humanoid in `g1`@355, `disjoint`@242
and @265, `g3`@92, `human-auto-7`@916, `g2`@125/181/196 and
`human-comfort-13`@1279 (`var/shots-t2s4/closeups/`). Judged at 1× from views 1
and 4, the question being *does it read as a person in a costume or as a toy?*

- **Peggy Carter** (yours at `disjoint`@242; the opponent's at `g1`@355, shrunk
  under Quantum Reduction's dome) — a woman in a blue jacket over a white shirt,
  navy below, the red hat the most visible thing on the table from above, the
  round shield on her left forearm. **A person in a costume**; from behind (the
  opponent's side, view 1) the hat and the shield's rim carry her.
- **Agent Phil Coulson** (`disjoint`@242, kneeling — tapped) — a man in a navy suit
  with a white shirt-front and dark tie, the gold badge on his chest and its emblem
  on his back. **A person** — an agent in a suit.
- **Nick Fury** (`disjoint`@242/265) — a man all in black in a long black coat
  with slate trim and a collar at the jaw, the patch a dark oval over his left eye.
  **A person in a long coat**; the patch reads at 1× as a dark mark on the face,
  not as an eyepatch you could name (see *Not done*).
- **Wasp** (`g1`@355, `disjoint`@242) — a small gold-and-black woman hovering over
  her card with four pale wings. **A person** — the clearest improvement on the
  gold chibi the user sent a screenshot of before slice 3.
- **Quake** (`g3`@92, `human-comfort-13`@1279) — a woman in black with teal gloves,
  belt and silhouette glow and two glowing fists. **A person**; the teal reads
  more as the rim than as the accents at 1×.
- **Agent 13** (`human-auto-7`@916 yours, `g2`@125 the opponent's) — a blonde woman
  in indigo, a silver pistol hanging in her right hand with a lit muzzle; in her
  attack she aims it two-handed. **A person**; the pistol is oversized for
  legibility (≈ 1.75× a real one) and a little boxy close up.
- **Agents of S.H.I.E.L.D.** (`human-comfort-13`@1279, the opponent's) — three grey
  suits, the leader in front with a white shirt, two followers a step back.
  **Three people**; the followers are shaded, not painted (a baked body carries a
  shade per slot, not a card's palette).
- **Bold Biochemist** (`disjoint`@242, kneeling) — a man in a long white lab coat at
  the bench. **A person**; kneeling, the rigid coat is a white box to the floor.
- **A.I.M. Scientists** (`g2`@181/196) — a man in a yellow suit, black gloves and
  boots, the yellow bucket hood with its dark visor, at the bench. **A person in a
  hazmat suit.**
- **Ant-Man** (`g2`@181/196) — a man in red with a black chest panel, silver gloves
  and belt, under the glass helmet with antennae. **A person in a costume.**
- **Soldier tokens** (`g1`@355, both seats) — men in tactical grey with black
  gloves; **Hero tokens** (`g1`@355, the opponent's, kneeling) — women in pale gold
  with blue legs and a gold belt. **People.**
- **Aerial Doombot / Robot token, the Giant-Sized Flying Ant, Ant-Man's Air
  Force** — unchanged in kind (decimated): the drone, the bee, the five procedural
  bees; the ant's rider is now a hunched woman in its warm red. They were never
  meant to be people.
- **The Helicarrier** — the carrier silhouette, unchanged.

At 1× the difference from slice 3 is the whole silhouette: a head, shoulders, a
waist and legs, painted in two or three colours — the table reads as a table of
small painted miniatures rather than of toys. The props that carried identity in
slice 3 still carry it, now on a figure that is a person without them.

### Tests

`npm --prefix web test`: **724 `node --test` (724 pass, 0 fail) + 79 vitest**, 0
failures (with the duelist track's tests in the tree). `npm --prefix web run
build`: zero errors; entry chunk **86.23 kB** gzip (no `three`), Arena **359.81
kB**, `Post` 16.54 kB. New or changed here: `traits.test.ts` (costume merge and
fill; `body: chibi`; slots per body; the task list read off the poses; costume on
no anonymous figure; the validator's four new negative controls; the raster and
heads re-calibrated as above); `clips.test.ts` (the proportioned bodies share the
library's clips joint for joint and borrow none; the chibis kept as fallbacks);
`figures.test.ts` (a `-chibi` model is a declared fallback of a body the ladder
reaches); `liveness.test.ts` (the costume clause); `prop-raster.ts` (a body's head
by its slots). `./tools/check-all.sh` was **not** run by this track (the duelist
track shares the tree; see *Not done*).

### Not done, or worth a decision

1. **`CueRunner.driveClips` still returns early when the stance's rest action IS
   the transient**, leaving the weights below 1 for the ramp — invisible now that
   every clone starts at its idle, but a model with no `idle` would still flash
   its bind pose. The one-line fix (weight 1 on that action) is `CueRunner.tsx`'s,
   not this track's file.
2. **Regular proportions were not available free**; every humanoid is a
   Superhero body. The man is broad-shouldered for Coulson and the scientists; a
   Regular body would be the Source zip ($19.99), which is the user's call.
3. **Nick Fury's eyepatch** is a dark oval at 1× — the user named him; it is now a
   one-sided detail (56 px from the front, 42 from behind with its strap), and
   nobody has judged it on a real desktop GPU.
4. **Skin is one tone for every card** — deliberate (no likeness, no per-character
   complexion), and worth the user's eye.
5. **The composed kneel is a build-side invention** (`A+B`, the hips' turn
   removed); a CC0 clip with an upright kneel would replace it.
6. **The rigid coat** does not drape: a kneeling Biochemist is a white box, a
   lunging Fury swings his whole coat.
7. **Every number is headless Chromium on the GTX 1080**; no frame-time bench was
   run (the bodies are fewer triangles than slice 3's drones were).
8. **The chibi fallback's pistol** uses the proportioned body's numbers (so the
   cue's flash stays on it) and sits in front of the chibi's face; no row asks for
   `body: chibi` today.

## Status — the verification pass and the documentation pass

*Appended 2026-09-27 by slice 4's documentation pass. It changed no code. Branch
`tier2-slice4` (from `0368a90`), worktree `/home/justin-a/code/mtg-table-t2d`;
nothing committed.*

**The verification pass: passed, eleven findings, all minor, none fixed in
code.** The verifier re-read both tracks' evidence against the tree, photographed
the deck and the duelists at 1× on the GTX 1080 (headless Chromium), played two
live games (seeds 5 and 11, ports 8660 and 8661) with a 5 ms in-page sampler on
the clip lane, and ran the gate twice. The first run (`rm -rf bridge/out &&
WSPORT=8665`) stopped at **step 10b after 543 s**: *"the last frame of the ws
session the disconnect/reconnect smoke is not `over`"*. The bridge's own frame
log held its single `over`, but not as the last line. The re-run reached the web
step (its per-step logs are `var/check-all-*.log`, 18:39–18:52). Ten of the
eleven findings became PLAN.md's *Slice 4 follow-ups* 3, 5, 6, 7, 8, 9, 12, 13,
14 and 15. The eleventh — "no documentation or decision pass" — is closed by this
pass.

**What this pass wrote:**

- **DECISIONS.md: D95–D101.** **D95** the bodies (superseding **D73**, and
  **D68** for the proportioned bodies), **D96** the decimation targets, **D97**
  the costume, **D98** the chibi flag and the body families, **D99** the
  duelists (superseding **D62**), **D100** where they stand and **D101** their
  gestures. **D90–D94 are `main`'s** (`754f504`, the card library, which landed
  on `main` during verification), so slice 4 starts at D95 and a merge keeps
  both sets.
- **PLAN.md.** The Tier 2 status line (*Tier 2 is complete*), the evenings table's
  `body`, T13 and T14 rows, *Slice 4 — T13, proportioned bodies in painted
  costumes, and T14*, the earlier follow-ups it closed or moved (marked in place),
  nineteen slice-4 follow-ups, *Tier 2 is complete — what is left*, what Tier 3
  would be after slice 4, and questions 10, 11, 12 and 14.
- **README.md.** *Arena mode* — the bodies, the duelists, the five sources, the
  rebuild, the dev handle, and a new *Tier 2, slice 4 — people in costumes, and a
  duelist at each end* with how to dress a card and how to change a duelist — plus
  the repo layout and the documents table.
- **CLAUDE.md.** *The conventions Tier 2's slice 4 added — bodies, costumes and
  duelists* (five, including the body-family anchor table) and the lines slice 4
  made stale (the mixer-callers clause, the rig and clip set, the missing-file
  state, the one-sided list, the figure heights, the test counts and the gate
  timings).
- **NOTICE §7** (what slice 4 draws, and that the duelists and costumes add no
  asset) and **`docs/ideas/arena-mode.md`** (the slice-3 commit, a slice-4 status,
  the superseded duelist line).

**Two things this pass found, which neither track reported.** First, the task
that commissioned it described the costume as "the costume palette as instance
attributes". The code has **no instance attribute**: the slot is a per-vertex
attribute (`costumeRegion`), and the palette is a per-material uniform array
(`uCostume[8]`) on each figure's own material. CLAUDE.md documents what the code
does. Second, `figures/duelists.ts` declares the duelists' four stand offsets,
the one coordinate outside `layout.ts`, against Tier 2 convention 2 (PLAN.md's
slice-4 follow-up 19).

**The gate, in this pass: three runs, none green, and none of it this slice's.**
All three were `WSPORT=8666 ./tools/check-all.sh`, without deleting `bridge/out`.
(A first launch was stopped by this pass within seconds. The `pkill` pattern
that stopped it also stopped a concurrent gate run in another worktree,
`mtg-table-t2f` at WSPORT 8672, which its owner then restarted; this tree was not
affected.) The load average was 42–73 during runs 1 and 2 and about 30 during
run 3, from other work on the machine.

| run | started | exit | wall | stopped at | why |
|---|---|---:|---:|---|---|
| 1 | 19:31:29 | 141 | 63 s | step 6 | the fresh seed-42 recording has one extra `state` (a second `MAIN1`, seq 340); same game, same `over`; `diff \| head` took a SIGPIPE under `pipefail` |
| 2 | 19:36:37 | 141 | 56 s | step 6 | one extra `COMBAT_DECLARE_ATTACKERS` (seq 342); same game |
| 3 | 19:49:17 | **1** | **622 s** | step 10b | steps 1–9d and 10a passed (step 6 identical, 377 lines; 9b advisory 7 / 25 frames; 9c 10/10 in 347 s; 9d); then an `input` (the mulligan's Keep / Mulligan, seq 10) written after `over` (seq 9) in the same millisecond — the verifier's first-run failure, with its cause now on disk |

Logs: `var/check-all-t2s4-docs-run1.log`, `-run2.log`, `-run3.log`,
`var/check-all-t2s4-run3-ws-drop-frames.jsonl` and
`var/check-all-t2s4-run3-ws-drop.log` (local, gitignored). Steps 11–13 were not
reached; the verifier's re-run reached them on the same code. PLAN.md's slice-4
follow-up 13 has the two defects, both timing in `bridge/`, which Tier 2 never
touched.
