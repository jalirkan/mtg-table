# M7 Tier 2, slice 2 (T8–T14) — evidence

Each track of the slice appends its own section below.

## Camera views (T8's camera track) — five views, spectator mode, the auto director

*Appended 2026-09-27 by the camera builder. Worktree `/home/justin-a/code/mtg-table-t2b`,
branch `tier2-slice2`, nothing committed. Files: `web/src/arena/camera.ts`,
`Arena.tsx`, `DecisionLayer.tsx` (the switcher), `scene/CueRunner.tsx` (the camera
tick only), `web/src/keys.ts`, `web/src/styles.css`, and the tests
`web/test/camera.test.ts`, `keys.test.ts`, `liveness.test.ts` (camera clauses).
`cues/queue.ts` and `cues/cues.json` were not touched: no camera-cue parameter
needed to move.*

### What was built

- **Five named views** as poses in `camera.ts` (`VIEWS`, pure, no three), keys
  `1`–`5`: **table** (report 09 §3.5's rest pose, unchanged), **shoulder**,
  **opponent's shoulder**, **side-on at figure height**, **low three-quarter**.
  The selected view **is `CameraDirector.home`**, so a cue swoop leaves from it and
  returns to it (§8 rule 1). A view change is an ease (650 ms at a seat, 1400 ms
  for a spectator), a **cut** under `prefers-reduced-motion` and on page load.
- **The switcher** (`ViewSwitcher` in `DecisionLayer.tsx`, mounted in
  `.arena__layer` under the cue strip — beside it, in one row, since the second
  fix pass, §3 of the last section): the five views, the director and the
  spectator toggle, the one on screen outlined, the director's current shot
  named ("6 Director · Side-on"). Its class `.arena__views` carries
  `pointer-events: auto` and is a row in `liveness.test.ts`'s widget table. The
  choice persists in `localStorage` (`mtg-table.arena.camera`, every access in
  `try`, the table when nothing is stored); the spectator toggle is derived,
  not stored.
- **Spectator mode** (`O`): `SPECTATOR_CLAMPS` (azimuth free all the way round,
  polar 6°–86°, distance 0.45×–1.9× rest), `SPECTATOR_DWELL` (a cue's move runs
  1.6× slower and may hold 3.2 s), and **no hand band** — the director stops
  passing the seat's hand and battlefield to the solver. On by itself in a
  replay; never while a seat is live; allowed again the moment a live game ends.
- **The auto director** (`6` or `0`): `directShot(beats, shot, now)` — a pure
  function — plus `beatsOf` (events → beats, reading only player ids, a card's
  public `controller` and the previous frame's `stack[].target*Ids`, never a
  name). Combat → side-on; a cast (and a resolution with no target) → the
  caster's shoulder; a strike (a resolution that had a target, or noncombat
  damage) → the target's side; a new turn and the outcome → wide. Minimum shot
  **2400 ms**, cooldown **4800 ms** (no A → B → A), a held beat kept **1600 ms**,
  and within `userOverrideMs` (5 s) of the user's last drag nothing cuts and
  nothing waits to. Cuts are cuts, never eases.
- **Free-orbit memory**: a drag makes the user's pose home (as before) and is
  remembered per view (and per box — a spectator's orbit is not a seat's);
  leaving the view and coming back finds the camera where they left it; pressing
  the key of the view you are on drops the orbit and returns to the canonical
  pose.
- **Keys**: three rows in `keys.ts` (`1 2 3 4 5`, `6  or  0`, `O`), so the `?`
  overlay lists them from the same table. `keys.ts` is on the 2D path and may not
  import `arena/` (D49), so it spells the view ids as `CAMERA_KEYS` and
  `keys.test.ts` asserts the two lists agree key for key. On the **board** the
  rows are bound and plan an `inert` ("picks the 3D arena's camera — the board has
  no camera; press V"), because `Board.tsx`'s `view` switch has a silent
  `default:` after `preventDefault()` and planning them as `view` there would be
  exactly M4 convention 4's swallowed key. The arena opts in with
  `KeyContext.arena`.

### The five views, measured

`camera.test.ts` prints this table every run; the hand column is the seat's hand
anchor projected at 16:9, and the fan columns are the four corners of all seven
cards of a full hand (`layout.ts`'s `fanSlot`) at the browser's own canvas aspect
(1600 × 945 = 1.69) and at 4:3.

| key | view | azimuth | polar | distance | hand @16:9 | 7-card fan @1.69 (x · y) | fan @4:3 | live seat |
|---|---|---:|---:|---:|---|---|---|---|
| 1 | table | 0° | 38.9° | 11.95 | (0.00, −0.84) | −0.52…0.52 · −1.05…−0.68 | 8 of 28 corners below the frame | **yes** |
| 2 | shoulder | 10.0° | 66.0° | 10.50 | (−0.06, −0.47) | −0.75…0.67 · −0.82…−0.23 | all 28 on screen | **yes** |
| 3 | opp. shoulder | −170.0° | 66.0° | 10.50 | (0.14, **+0.46**) | top of the frame | — | spectator only |
| 4 | side-on | −86.9° | 77.4° | 7.59 | (0.94, −0.03) at 16:9, **off screen** at 1:1 | 14 of 28 off screen | 23 of 28 off | spectator only |
| 5 | low | 22.0° | 74.0° | 10.50 | (−0.15, −0.53) | −0.77…0.56 · −0.99…−0.25 | all 28 on screen | **yes** |

**`seatSafe` is recomputed, not trusted**: `keepsSeat(pose)` — inside
`ORBIT_CLAMPS` *and* §8 rule 6 (`framesSeat`, hand on screen and below the
midline, battlefield on screen) at every aspect in `LIVE_ASPECTS` (1, 4:3, 16:10,
16:9, 2, 21:9) — must equal the literal flag for all five views, with the real
`layout.ts` anchors. Every view is inside `SPECTATOR_CLAMPS`, every seat-safe view
inside `ORBIT_CLAMPS`, and clamping a view into its own box moves it by nothing.

**Tuned in the browser, not on paper.** The first cut of the shoulder (az 9.3°,
polar 61.5°) put the hand anchor at y −0.86 and cropped the bottom third of every
card in hand; the first side-on (d 9.7, polar 83.5°) left the figures a row of
specks under two thirds of empty frame. A grid search over `fanSlot`'s corners
(whole seven-card fan inside ±0.95 at 4:3, the opponent's creature and land ranks
on screen, `keepsSeat` true) chose the shoulder and low poses above; side-on was
brought to d 7.6.

### Rule 6 at a live seat: "spectator only", not a DOM hand strip — argued

The task allowed either. **Views 3 and 4 (and the director) are greyed while a
seat is live**, and clicking or pressing one says why in the hint line
("Opp. shoulder is spectator-only — your hand is off screen from there (§8 rule
6): back in a replay or when this game ends"). Three reasons:

1. **A DOM hand strip is a second card renderer.** It would draw the viewer's
   hand beside `CardPlane` — the arena's one card renderer (M7 convention 2) — or
   make the arena an eleventh importer of `CardTile` (M4 convention 2 calls that a
   decision). Hard rule 8's renderer half is carried by there being one surface,
   and a canvas-plus-DOM hand is two.
2. **It splits the click.** The same card would be clickable in the strip and,
   at a different angle, in the 3D fan. §8 rule 6 exists so the player never has
   to hunt for the card they mean to click.
3. **The two views that fail are the watching views.** From the opponent's
   shoulder your hand is at the top of the frame facing away (y +0.46); side-on it
   is edge-on at the frame's edge. Neither was going to be a seat's view with or
   without a strip. The three that pass — table, shoulder, low — are playable, and
   the shoulder and the low angle show a live seven-card hand **larger** than the
   table view does (photographed below).

The choice is not forgotten: a stored "side-on" shows the table at a live seat and
comes back in the next replay.

### In the browser — how it was run

Vite dev server on `127.0.0.1:5180` (`web/` as cwd), **headless Chromium 152 over
CDP with `--use-angle=gl`**, whose WebGL renderer string read `ANGLE (NVIDIA
Corporation, NVIDIA GeForce GTX 1080/PCIe/SSE2, OpenGL 4.5.0)`; viewport 1600 ×
1000 (canvas 1600 × 945). Keys and clicks are real CDP `Input.dispatchKeyEvent` /
`dispatchMouseEvent`; poses were read off the dev handle
(`window.__mtgArena.camera`, `.director`). **No frame pump was needed**: unlike the
Claude browser pane, headless Chromium runs `requestAnimationFrame`, and the new
"keep the loop awake while the director holds the camera" line in `CueRunner` is
what carries a move to its end under `frameloop="demand"`. (A frame *rate* from
this harness means nothing: rAF ran unthrottled, 1,530 frames in 2 s.) The driver
was a throwaway script in the session scratchpad, not in `tools/`; the browser was
closed with CDP's `Browser.close` and every process was killed by PID.

### The five views on `g1.jsonl` at transport index 355 (spectator on, replay)

Every view arrived exactly: the camera read back `[0, 9.3, 8.3]`, `[1.27, 4.27,
10.45]`, `[−1.27, 4.27, −10.45]`, `[−7.4, 2.05, 0.6]`, `[2.98, 3.59, 10.36]` after
each key, the switcher outlined the right button, and `localStorage` held the
choice.

1. **Table** — the familiar frame: both battlefields and ranks of figures, the
   opponent's bust and hand at the top, the viewer's two cards in hand (Pym
   Particles, Thriving Heath) at the bottom centre, readable, their bottom edges at
   the frame edge (8 of 28 fan corners below it with a full hand — the rest pose
   has always done that).
2. **Shoulder** — the viewer's hand in the foreground, whole and larger (names and
   rules text readable), the viewer's figures (a gold agent, two white soldier
   tokens, drones) in the middle distance, the opponent's ranks and bust across the
   table. The top fifth of the frame is empty felt.
3. **Opponent's shoulder** — the table turned round: the opponent's lands (their
   cards face *them*, right way up from here) and figures in the foreground, their
   hand as card **backs** at the bottom centre (no hidden card is named — `CardPlane`
   draws backs whatever the camera does), the pink bust close at the bottom right,
   the viewer's side and teal bust across the table, the viewer's own hand a thin
   row at the far edge.
4. **Side-on** — lens at the graveyard end, a little above figure height: the two
   battle lines face each other across the frame, the opponent's on the left and
   the viewer's on the right, figures read as figures (the gold agent, the drones,
   the soldier tokens), the combat lane is the empty middle where attacks go. The
   hands are edge-on at the frame's sides — which is why it is spectator-only.
5. **Low** — a low three-quarter from the viewer's right corner: the hand large in
   the lower left, the viewer's figures big in the middle, the opponent's line
   and bust beyond; the most dramatic of the three seat-safe views.

### The director through a combat sequence (`g1.jsonl` 322 → 348, 1× replay, 400 ms a frame)

Selected with `6` at 322 (start: wide). Logged every 100 ms:

| t (ms) | index | batch | director |
|---:|---:|---|---|
| 1218 | 325 | `cast`, `resolved` | cast held (0.6 s into the opening shot) |
| 1622 | 326 | `attackers` | combat outranks the held cast; still held |
| **2027** | 327 | — | **cut → side-on** (reason `combat`), 2.4 s after the start |
| 2421–3230 | 328–330 | `blockers`, `damage` ×3 | same view — no cut |
| 3634–4443 | 331–333 | — | the lethal-damage cue's camera request **taken**: the camera swooped in to `[−5.97, 0.9, −1.27]` and was back on side-on `[−7.4, 2.05, 0.6]` by 333 |
| 4847 | 334 | `turn` | wide is held by the cooldown (left 2.8 s ago)… |
| 6465 | 338 | — | …and dropped when stale (> 1.6 s) — no cut |
| **6869** | 339 | `cast` (the viewer's) | **cut → shoulder** (the caster's) |
| 8088 | 342 | `attackers` | held: 1.2 s into the shoulder shot |
| 8491–8896 | 343–344 | `blockers` | still held, the beat refreshed |
| **9300** | 345 | `damage` ×3 | **cut → side-on**, 2.4 s after the shoulder cut |

And the end of the game (360 → 376): `attackers` at 370 cut to side-on; the
lethal `damage` ×5 + `outcome` batch arrived 1.2 s later and was held; the
lethal-damage close-up played on side-on; at 376, 2.4 s after the combat cut, the
**outcome cut to wide**.

**The finding in the first run, and the fix.** The first version exempted only
the outcome from the cooldown, and the second combat of that turn (342–345) was
shot entirely from the caster's shoulder, because side-on had been left 2.4 s
earlier: the cooldown protected the viewer from the one shot they came for. A
fight is the scene, not a cutaway, so **`COOLDOWN_EXEMPT` is now `combat` and
`outcome`** — never the minimum shot length. The table above is the second run.

**Never fights a drag for more than the override window.** Director playback from
322 with a real CDP mouse drag across the canvas at 1.0 s: the combat beats at
325–331 cut nothing, and the next cut came at **8014 ms** (index 342), **5.47 s
after the director's last recorded user input** — the damping tail after mouse-up
(`USER_TAIL_MS`, 1.5 s of `change` events that are still the user's pose settling)
counts as the user's, so the window runs from when the camera stops moving under
their hand.

### A cue swoop leaves from the chosen view and comes back to it

`g1.jsonl` from 324, two `next` steps into the `attackers` batch at 326 (the
attack swoop, §8's first camera cue), polling every 40 ms:

| mode | view | cue move | furthest from the view | held until | final distance from the view |
|---|---|---|---:|---:|---:|
| spectator (replay default) | shoulder | taken | 6.59 at 1.94 s | ~2.84 s | **0** |
| spectator off (seat rules in a replay) | shoulder | taken | 4.15 at 1.08 s | ~1.6 s | **0** |
| spectator off | low | taken | 3.98 at 1.07 s | ~1.6 s | **0** |

The spectator swoop is the slower, longer one (1.6×, capped at 3.2 s) and closer
(no hand band: it frames the attacker and the lane and lets the hand leave the
bottom of the frame). Under seat rules, from the two low views, the rule-6 solve
for the attack swoop comes out as a **pull-back** rather than a push-in — the
solver must keep the hand in frame and the view's polar is already near the box's
75° limit — which is the solver's honest answer, not a defect.

### The switcher is clickable, and the `?` overlay lists the keys

- `getComputedStyle(button).pointerEvents === "auto"` and
  `document.elementFromPoint` at the button's own centre returned **the button**
  (`BUTTON.arena__view`), not the canvas.
- A real CDP mouse click on **5 Low** selected the view (camera at the low pose,
  `localStorage` "low"); a click on the spectator button switched spectator off;
  a click on the now-dimmed **4 Side-on** changed nothing and put the reason in the
  hint line. After the clicks `document.activeElement` was `BODY`: `mousedown`'s
  `preventDefault` keeps focus off the switcher, so SPACE still presses the
  engine's focused button rather than "this camera again".
- `H` opened the overlay with **23 rows**, among them `1 2 3 4 5 → arena camera:
  1 table · 2 your shoulder · 3 opponent's shoulder · 4 side-on · 5 low angle …`,
  `6 or 0 → arena camera: the director …` and `O → arena camera: spectator mode on
  / off …`.
- On the 2D board (`human-auto-42.jsonl`, a recording with an `input`), `3` and
  `O` flash "picks the 3D arena's camera — the board has no camera; press V" and
  "switches the 3D arena's camera to spectating — the board has no camera; press
  V". On `g1.jsonl` the board shows no flash for *any* inert key, because
  `DecisionPanel` renders the flash inside its `input !== null` branch and g1 has no
  `input` frames — pre-existing, and not this track's file.

### Free-orbit memory, reduced motion, idle

- **Memory, with a real drag**: in the shoulder view a 140-px CDP drag moved the
  camera to `[3.888, 2.719, 10.195]`; `5` then `2` came back to exactly that pose
  (within 0.02); `2` again returned to the canonical `[1.27, 4.27, 10.45]`. The
  director's `lastUserInputAt` did **not** change across two later view moves.
- **Reduced motion** (`Emulation.setEmulatedMedia prefers-reduced-motion:
  reduce`): 60 ms after each of `2 3 4 5 1` the camera was already exactly on the
  view and the move had ended — a cut; without it, 60 ms after `4` the camera had
  barely left the table pose. All five views and the director stayed selectable;
  cue camera moves and shake are still dropped outright (unchanged).
- **Idle is still zero**: on `g1.jsonl` @100 (before the first bobbing card),
  `gl.info.render.frame` advanced **0** in 3 s on the table view, 0 after a
  1400 ms spectator move to side-on had finished, and 0 in director mode with no
  beats. The move itself rendered only while it ran.

### A live seat (bridge on port 8664, seed 42)

`./bridge/run.sh mtgtable.MtgTable --transport ws --port 8664 --seed 42 --keep-open`,
page `/?port=8664#arena`:

- At the play/draw prompt the switcher read `*1 Table | 2 Shoulder | 3 Opp.
  shoulder(off) | 4 Side-on(off) | 5 Low | 6 Director(off) | O spectator(off)`,
  the box was `ORBIT_CLAMPS` (max azimuth 0.436 rad); `3`, `4`, `6` and `O` each
  put their reason in the hint line and moved nothing; `2` and `5` moved the
  camera to their poses.
- After **Play** and **Keep** (real clicks on the engine's own buttons): with the
  seven-card opening hand, the **shoulder** and **low** views show the whole fan on
  screen and larger than the table view does — every card name legible, rules text
  mostly legible. The fan's rightmost card sits partly under the viewer's seat
  plate and the teal bust overlaps its left end (Tier 2 follow-up 10's placement).
- After a concede, `O` became available, spectator turned on, the box widened
  (max azimuth ∞) and `3` moved the camera to the opponent's shoulder.

### Fixes to existing camera code, found on the way

Each one is in `camera.ts` / `CueRunner.tsx`, each has a test, and each changes
behaviour a user could see:

1. **`OrbitControls`' `change` after a programmatic move counted as a drag.**
   `lastPosition` is stale when the director hands the camera back, so the first
   update fired `change` → `noteUserInput`: home re-set to itself and every cue
   camera move dropped for the next 5 s after *every* finished move. `change` now
   counts only between `start` and `end` plus the damping tail, and never while
   the director holds. Without this the auto director would have held every shot
   for 5 s after every cut. Measured: `lastUserInputAt` unchanged across view moves.
2. **The rule-5 retire blended the wrong way.** `1 − ease(t)` over
   `current → home` put the camera at home on frame one and then drifted it back
   out toward the swoop for 200 ms before jumping home. It now eases *to* home;
   `camera.test.ts` asserts the distance to home never grows during a retire.
3. **`reset()` (a scrub, `K`) abandoned the camera mid-swoop** — and fix 1's
   defect then made the mid-air pose home. It now snaps home on the next tick.
4. **Rule 5 read the recorded `input` in replays**, so every camera cue in a
   replay of a human game was dropped on any frame whose recorded OK was enabled.
   Rule 5 is about a seat: the camera now applies it only in live mode, as the
   queue's `budgetFor` already did.
5. **A camera move outlived its cue and froze.** Under `frameloop="demand"` the
   loop parks when the queue drains; a move longer than its cue (a view change, a
   spectator's 3.2 s swoop) stopped wherever the last cue frame left it.
   `driveCamera` now asks for the next frame while it holds, and only then.
6. `lerpOrbit` takes the short way round (only matters once the azimuth is free).

### Tests

- `web/test/camera.test.ts`: 16 → 34 tests. New: the five views (keys, distinct,
  inside their boxes, `seatSafe` recomputed from the real anchors at six aspects,
  the table printed), availability, a view becomes home and a swoop returns to it,
  reduced motion is a cut, free-orbit memory, spectator box/dwell/no hand band, a
  chosen view is exempt from rule 5 and from a release, the retire direction, the
  short-way lerp, the shot list, a synthetic turn (cast → strike → combat → turn →
  outcome, with the held, stale and cooling cases), the cooldown's exemptions,
  the override window, the director class cutting, `beatsOf` over hand-built
  events, and **the auto director over every `state` batch of all 19 committed
  recordings at two paces** (1× and 4×): minimum shot length and the cooldown hold
  on every cut. Census, printed every run: **7,358 batches, 3,656 beats, 596 cuts**
  across both paces; at 1× by view side 200 · table 111 · shoulder 84 · opponent's
  shoulder 69, by beat combat 200 · cast 140 · turn 104 · strike 13 · outcome 7.
- `web/test/keys.test.ts`: 23 → 27. The new rows plan `camera`/`spectator` in the
  arena on a replay and behind an ask; a focused text field keeps its digits;
  Ctrl/Alt+digit are left to the browser; on the board each plans an `inert`
  naming V; `CAMERA_KEYS` agrees with `camera.ts` key for key; `keys.ts` imports
  nothing from `arena/`; the "3 and 4 are for spectating" sentence in the overlay
  is held to `seatSafe`. `1` left the "unbound keys" list (`7` and `9` took its
  place). The dispatcher check now runs with `arena: true` and finds `case
  'camera':` and `case 'spectator':` in `Arena.tsx`.
- `web/test/liveness.test.ts`: `ViewSwitcher → .arena__views` in the widget
  table, and three clauses — `camera.ts` has no renderer, no DOM, no storage and no
  clock of its own (the cue engine only as a type); only `scene/CueRunner.tsx`
  calls `director.tick` / `applyView` / `request`; every `localStorage` access is
  `Arena.tsx`'s, inside `try`.
- **Negative controls**, each put in and taken out: a `performance.now()` in
  `camera.ts`, `.arena__views` without `pointer-events: auto`, a `localStorage`
  read outside `try`, and a second `director.tick(` caller each turned their
  clause red, and the file went back to 23/23. The corpus director check, re-run
  with `minShotMs` and `cooldownMs` set to 0, finds **632 shots under 2400 ms and
  309 cooldown violations in 893 cuts** — the assertion has teeth.
- **Totals** (standalone, with the figures track's concurrent changes in the same
  tree): `npm test` → **644 `node --test` pass / 0 fail + 79 vitest pass**;
  `npm run build` → zero errors, entry chunk **86.22 kB gzip** (slice 1: 85.72 — the
  three keymap rows' text; still no `three` in it, and `camera.ts`'s strings appear
  only in the Arena chunk). `./tools/check-all.sh` was **not** run by this track.

### Not done, or worth a decision

- **DECISIONS.md is not this track's file.** Candidates for the documentation
  pass: views as homes + `seatSafe` recomputed; "spectator only" over a DOM hand
  strip; the director's rules with combat and outcome exempt from the cooldown;
  rule 5 applies only at a live seat; `change` counts only during a drag.
- **CLAUDE.md's keymap line** ("`keys.ts` is the **18** rows") is stale: the table
  now has 23. Not this track's file.
- **The board's flash is invisible on a recording without an `input`** (above);
  a `DecisionPanel` change, not this track's.
- **Spectator swoops are tighter than seat swoops** by construction (no hand
  band), and the lethal-damage cue's jolt — written as a shake that frames its
  card — becomes a real close-up for a spectator (clamped at 0.45× rest distance).
  It reads well in `g1`; if it is too much, the fix is a `cues.json` parameter,
  not the director.
- The switcher and the hint line are English strings in the arena, as every
  other widget in the layer is.

---

## Figures (T8's figure track) — three humanoids on one rig, the retarget experiment, and a death that is seen

*Appended 2026-09-27 by the figures builder. Worktree `/home/justin-a/code/mtg-table-t2b`,
branch `tier2-slice2`, nothing committed. Files: `tools/build-figures.mjs`,
`tools/assets-manifest.json`, `web/public/models/figures.glb` (rebuilt),
`web/src/arena/figures/{figures.json, models.json, types.ts, validate.ts, pose.ts,
clips.ts}`, `web/src/arena/layout.ts` (the stand points only),
`web/src/arena/scene/{FigureLayer.tsx, discs.ts, models.ts}` (a comment), `NOTICE` §7,
and the tests `figures.test.ts`, `figure-pose.test.ts`, `clips.test.ts`,
`liveness.test.ts` (one figure clause). `camera.ts`, `Arena.tsx`, `CueRunner.tsx`,
`keys.ts`, `cues/` and `DecisionLayer.tsx` were not touched by this track.
Screenshots are under `var/shots-t8/` (gitignored).*

**The one-line version.** The library is rebuilt from **verified** sources into
**five** models — the agent, a **hero** (Kenney `character-female-b`) and a
**scientist** (`character-male-e`) on **one shared 7-joint rig with one clip set**,
the drone and the insect — 143,920 bytes, reproducible byte-for-byte; the
Universal Animation Library retargets onto the chibi rig, and the experiment says
**its hit and its death read and its idle, attack, landing and crouch do not**, so
the set is the pack's own clips with the library's `hit` and `die`; the build
found that **slice 1's drone was broken** (its arms were detached from its body) and
that every width it measured for a skinned mesh was wrong; with that fixed the
width clamp is strict for every archetype and **no two figures overlap anywhere in
the corpus**; a wrapped rank's back row now stands on its own card (**216 → 0**
stand points inside another card); and a creature that dies is now **seen dying**
— on its own death cue's clock, at the pose it last had, gone when the cue is.

### 1. The sources, re-fetched and verified — and the build now verifies them itself

The previous worktree's archives were gone, so all three were downloaded again
from the URLs in `tools/assets-manifest.json` into `var/assets/figures/`, and the
licence badge on each page was re-read:

| file | bytes | sha256 (head) | recorded? | badge, 2026-09-27 |
|---|---:|---|---|---|
| `kenney_mini-characters.zip` | 2,403,059 | `9e1d48e6d7b8…` | **identical** | "License · Creative Commons CC0" (unchanged) |
| `quaternius-robot-enemy-flying.glb` | 298,324 | `7e3a27532b43…` | **identical** | "Aug 28, 2022 • FBX /GLTF format • Public Domain (CC0)" |
| `quaternius-bee-enemy.glb` | 193,200 | `29a3ac29e685…` | **identical** | "Dec 21, 2021 • FBX /GLTF format • Public Domain (CC0)" |
| `Universal Animation Library[Standard].zip` | 15,904,933 | `cc73fc4e495b…` | **new** | quaternius.com: "License CC0"; itch.io: "Asset license: Creative Commons Zero v1.0 Universal"; `License.txt` in the zip: "CC0 1.0 Universal (CC0 1.0) Public Domain Dedication" |

The UAL came from itch.io's "name your own price" page at $0 ("No thanks, just take
me to the downloads" → the **[Standard]** zip; the [Pro] and [Source] zips are paid
and were not touched). It carries one 65-joint Unreal-named rig (T-posed, facing
+Z, left at +x — measured) and 44 clips in its no-root-motion GLB.

**`tools/build-figures.mjs` now refuses an unverified source** (Tier 2 follow-up 9,
the code half). Every archive's byte count and sha256 are checked against the
manifest before anything is built, and a zip is **not unzipped by hand any more**:
the member a model needs is read out of the verified zip by a twenty-line reader
(central directory → local header → `inflateRawSync`, CRC-32 checked) — `unzip -p`
would have done, except that `[` and `]` are wildcards to it and the library's own
file is `…[Standard].zip`. `--verify-only` checks and stops. A tampered file fails
with both hashes and the download URL printed.

**The output is recorded and reproducible.** The build writes the built file's
byte count and sha256 into `models.json` (`"library"`), and
`figures.test.ts` now fails if `web/public/models/figures.glb` is not that file
(a checkout with no `.glb` at all is skipped — the disc fallback is still a
supported state). Two builds from the same sources:

```
web/public/models/figures.glb:                  143920 bytes · sha256 c09ac552f7daed93fabb6549b83211beaeb3e895614134575f388d485da981a3
var/assets/figures/build/figures-repro.glb:     143920 bytes · sha256 c09ac552f7daed93fabb6549b83211beaeb3e895614134575f388d485da981a3
cmp → IDENTICAL
```

### 2. Hero and scientist, each a body of its own

All twelve Kenney Mini characters were rendered side by side with the holographic
shader, from the front, behind, the side and the table's angle
(`var/shots-t8/kenney-*.png`). The shader throws away texture and vertex colour, so
**only geometry can tell two bodies apart**, and the table camera sees your own
figures from behind and the opponent's from the front — so a head-top silhouette is
what reads.

- **hero → `character-female-b`**: two round buns on top of the head, the most
  distinct silhouette in the kit **from every side**. Wasp, the Hero token and
  Ant-Man (by a per-card entry; `rogue` is not a recognised subtype).
- **scientist → `character-male-e`**: round glasses, shirt and tie, braces on the
  back — the one body that reads as a scientist face-on. **The trade, written
  down:** its head is the agent's shape, so from BEHIND it is told apart by the
  braces and the lab tint, not by its outline. Bold Biochemist, A.I.M. Scientists.
- **agent** stays `character-male-a`; the **Soldier token** keeps the agent body in
  its token grey (`"Soldier Token"`, the wire's name verbatim). A per-card
  **`"Hero Token"`** entry puts the Hero token on the hero body in a paler, token
  gold, so a token and Wasp are the same kind of thing and not the same card.

All twelve bodies share one rig exactly (identical joint names and bind
transforms, measured), and the build asserts it: a model on `kenney-mini` whose skin
is not `[root, leg-left, leg-right, torso, arm-left, arm-right, head]` fails the build.
The rungs are subtype-before-colour as before. The census `figures.test.ts` prints
every run now has the two new bodies as their own models:

```
    548  scientist  subtype:scientist      Bold Biochemist
    388  hero       subtype:hero           Wasp, Shrinking Savior
    254  hero       card                   Hero Token
    169  scientist  subtype:scientist      A.I.M. Scientists
     80  hero       card                   Ant-Man, Reformed Rogue
  by model: (disc)=5120 agent=2833 drone=1431 insect=1078 scientist=717 hero=722
```

**In the browser** — headless Chromium over CDP on the GTX 1080 (`--use-angle=gl`),
the Vite dev server on 5180, the replay slider driven through the native value
setter, `queue.skipAll()`, and frames pumped through the app's own pre-bundled
`@react-three/fiber` `advance()` (the M7 technique; the pane still never animates).

`g1.jsonl` at transport index **355** (`var/shots-t8/g1-355*.png`, 2× close-ups
`g1-355-you-close2x.png`, `g1-355-opp-close2x.png`): on your side, from the left, the
Giant-Sized Flying Ant (a pale-blue bee, translucent — it is summoning-sick), the
Aerial Doombot and the Robot token (round single-eyed drones with two jointed arms
and hands), **Wasp as a gold figure seen from behind with two round buns on top of
its head**, crouched because she is tapped, and **two Soldier tokens as pale-grey
figures with plain square heads**. On the opponent's side, facing you: a Soldier
token (grey, square head, crouched) beside **two Hero tokens in the paler token gold,
buns on either side of the head**, and Peggy Carter as a small agent shrunk by
Quantum Reduction. The two humanoid bodies at 355 are unmistakable against each
other — **but g1 never has a scientist on the table** (0 battlefield instances of a
Scientist type line in the whole recording — the two scientists appear in g1 only off the battlefield), so "all
three at 355" is not a frame that exists. The frame that does:

`g2.jsonl` at **200** (`g2-200.png`, `g2-200-you-2x.png`, `g2-200-opp-2x.png`) has all
three: **Ant-Man and Wasp in gold with their buns**, **Agent Phil Coulson in white
with the plain square head**, and — on the opponent's side, facing you — **Bold
Biochemist as a lab-green figure** whose face shows the glasses shapes, next to two
bees and two drones. Measured (bloom off): 51 draw calls, 19,669 triangles.

### 3. The retarget experiment (report 13 §9.5) — what reads on a 7-joint chibi

**The mechanism.** `SkeletonUtils.retargetClip`, run **offline by the build** with
three in Node (the installed `three@0.186.0`, imported by file URL), so the browser
never ships the library's 7.6 MB source. Both rigs are T-posed and face the same
way, so each chibi joint takes its mapped bone's **world-space rotation delta from
the T-pose**: `localOffsets[joint] = inverse(sourceBind) × targetBind`. The map is
`thigh_l/r → leg-left/right`, `spine_03 → torso`, `upperarm_l/r → arm-left/right`,
`Head → head`; the chibi's `root` is at its **feet** with the legs and torso hanging
from it, so it takes the pelvis's **translation only**, scaled by hip height
(0.176 / 0.917 = 0.1923), and never its rotation — a rotating root would swing both
legs about the ground point.

**The trap, which cost the first attempt.** `retargetClip` animates `source` with a
mixer and calls `source.updateMatrixWorld()` each step; in a GLTFLoader scene the
bones are the skinned mesh's SIBLINGS, so passing the SkinnedMesh leaves every
unmapped ancestor (pelvis, spine) at its bind pose and **every clip retargets
upright** — `Death01` at t = 1 was a standing figure with its arms out
(`var/shots-t8/retarget-v1.png`). The source must be the scene root with the
skeleton hung on it (`retarget-v2.png` is the fixed run). A second, smaller one:
SkeletonUtils falls back to a same-name lookup for an unmapped bone, and the library
HAS a bone called `root` whose world rotation is the file's Z-up turn — so the
chibi's root is explicitly mapped to nothing.

**Measured.**

| | slice 1 | T8, chosen set | T8, `--clip-source experiment` |
|---|---:|---:|---:|
| models | 3 | 5 | 5 |
| `figures.glb` bytes | 126,404 | **143,920** | 167,796 (+23,876) |
| clips per humanoid | 12 (agent only) | 12 (2 retargeted) | 12 (all 12 retargeted) |
| draw calls per figure | 1 | 1 | 1 |
| draw calls at `g1`@355, bloom off | 59 (T2) | **65** | (not built into the app) |

Clips do not change draw calls at all — one primitive per model is asserted by
the build either way — so the experiment's price is **bytes: 24 kB for eleven more
retargeted clips across three bodies**, well inside the 400 kB per-file line.

**How they read** (`var/shots-t8/clips-compare.png`: slice 1 top, the chosen set
middle, the all-retargeted set bottom, the same six beats each, from above and in
front as the table camera sees a figure):

- **`hit` — reads, and is the one real gain.** `Hit_Chest` is a recoil: the body
  leans back from the blow. Slice 1 borrowed `fall`, a flail with both arms up.
- **`die` — reads.** `Death01` is a stagger, a buckle and a fall onto the back
  (it is also the clip §6 below makes visible). The pack's own `die` is a 0.33 s
  topple; the library's is a death.
- **`idle`, `summon`, `attack`, `crouch` — do not read.** A human spine lean on a
  head-heavy chibi reads as a face-plant: the library's idle hunches the head block
  forward, `Punch_Cross` pitches the whole head into the punch, `Jump_Land`'s knee
  bend has no knees to go to and folds the body into a block, and
  `Crouch_Idle_Loop` puts the figure on its face. Kenney's hand-made clips for this
  exact rig are better at every one of them.

**Decision: one clip set for every humanoid, the pack's own clips with the
library's `hit` and `die` retargeted in** (the manifest's `rigs.kenney-mini.clips`;
`experiment` keeps the all-retargeted map so the comparison can be rebuilt). The
provisional borrowings: **`hit ← fall` is replaced**; **`shrink ← crouch` stays**,
because the library has no shrink or cower either (its 44 clips were read) and its
crouch face-plants — and `block` still borrows `crouch` for the same reason.
`clips.test.ts` pins the remaining borrowings (`block = crouch = shrink`) so a new
one shows up on the day it is added, and asserts `hit`/`die` share their clip with
nothing. `models.json` records which clips were retargeted and the clip library's
own provenance (`clipLibraries.ual`, CC0), and `figures.test.ts` requires both.

### 4. Two slice-1 defects the new build found

1. **The drone was never a whole drone.** Its two skins name the same eleven
   joints but carry inverse bind matrices 0.28 units apart (FBX2glTF bakes each
   mesh's bind transform into its skin), and slice 1's skin-aware join checked the
   joints, not the matrices — so the body's arms, shoulder pads and hands were
   joined onto the eye's skin and **drawn detached, floating off to either side**
   (`var/shots-t8/drone-figures.png`, slice 1's committed file, against
   `drone-figures-a.png`, the rebuild). The join now requires
   `C = IBM_dst⁻¹ · IBM_src` to be one common matrix for every joint (else it
   refuses) and applies `C` to the second skin's positions and normals: "rebase
   Cube.000 by (0, 0, −0.0028)".
2. **Every width measured for a skinned mesh was wrong.** `getBounds()` applies a
   skinned mesh's own node transform, which glTF ignores; the drone's node carries a
   ×100 scale and a turn. With the join defect on top, slice 1 measured the drone at
   2.27 × 0.76 (ratio **2.97**) where three draws it **1.29 × 0.77 (1.66)** — so T7's
   "the drone overflows by 0.634 and a narrower drone is T9's" was mostly the build's
   mistake. Height is now the bind-pose height three itself normalises by, width the
   widest RESTING stance (`REST_CLIP_FOR`'s `ready` and `crouch` at `REST_PHASE_FOR`,
   read from `figures/clips.ts` — Node imports it by type stripping) along the axis
   that becomes x after the facing turn, both measured on the skinned mesh in three.
   That also retires follow-up 18's wrong `max(x, z)` comment.

   Also repaired: the Quaternius bee's **12 vertices with NaN skin weights** (a
   source defect; a NaN weight makes a skinned bounding box NaN), rebound to the
   first joint with the count printed; and the Kenney files' **external texture
   reference** (`Textures/colormap.png`), which `NodeIO.readBinary` cannot resolve,
   is stripped from the JSON chunk before parsing. **`palette` is gone**: the runtime
   replaces every figure material with the holographic `ShaderMaterial`, which reads
   no texture and no UV, so every primitive now gets one plain unlit material and the
   library carries **no texture at all** (asserted).

### 5. Follow-up (c): the width clamp, strict for every archetype

`FIGURE_MIN_FIT` and the drone's exemption are gone: `fitHeight` is now
`min(nominal, FIGURE_MAX_WIDTH / ratio)`. From `figure-pose.test.ts`:

```
  agent      ratio 1.15 · at FIGURE_HEIGHT 0.98 wide · clamped 0.720 wide × 0.626 tall (slot 0.720)
  hero       ratio 1.07 · at FIGURE_HEIGHT 0.91 wide · clamped 0.720 wide × 0.674 tall (slot 0.720)
  scientist  ratio 1.14 · at FIGURE_HEIGHT 0.97 wide · clamped 0.720 wide × 0.630 tall (slot 0.720)
  drone      ratio 1.66 · at FIGURE_HEIGHT 1.41 wide · clamped 0.720 wide × 0.433 tall (slot 0.720)
  insect     ratio 1.47 · at FIGURE_HEIGHT 1.25 wide · clamped 0.720 wide × 0.490 tall (slot 0.720)
  7331 neighbouring pairs · worst overlap 0.000 units (none)
```

The overlap test's exemption is removed with it: any overlap is now a failure. The
drone costs 0.03 units of height against slice 1's floor (0.433 vs 0.4675). **In the
renderer**, at `g1`@355, `Box3.setFromObject(rig.root, true)` on every live figure:
no drawn figure is wider than its pose's width (insect 0.720, drones 0.720, crouched
heroes 0.718, standing agents 0.619) and a standing one is its pose's height to 0.01
— the build's measurement and three's agree. Not a regression but worth knowing: the
Giant-Sized Flying Ant's `scale: 1.35` is clamped to the same 0.49 as any insect, as
it already was under slice 1's floor.

### 6. Follow-up (a): a wrapped rank's back row

Report 13 §3.1's falloff (`0.52 × (1 − 0.45 × row)`) put a back-row figure at
`anchor + 0.264`, on the front row's cards. Measured with an independent footprint
check (a flat card is `CARD_W × 1` turned by its in-plane spin; a figure may stand
on its own attachment): **216 back-row stand points inside another card**, in g3,
human-auto-2026 and human-sideboard-7 — every fixture that ever wraps a rank.

The rule now (`layout.ts`, `placeStands`, computed after `presence`): a back-row
figure stands **on its own card's centre**, in the strip the front row leaves
uncovered (front row to `anchor + 0.5`, lands from `anchor + 0.6`); if a front-row
host's Aura or Equipment (drawn 0.14 behind its host) covers that point, it steps
back 0.05 at a time until clear. `Placement.stand` carries the result and
`standPointOf` reads it.

```
figure-pose: 11901 stand points in 3679 frames · 28 frames wrap a rank · 200 back-row stand points
  (11 stepped back off a front-row attachment) · human-sideboard-7: 22 crowded frames, 170 back-row
  figures · 0 inside another card
```

189 stand on their card's centre and 11 (g3, human-auto-2026, all beside an Aura or
Equipment) step back 0.10. **Negative control:** the same test run against a copy of
`layout.ts` with slice 1's falloff restored prints **216 inside another card** and
fails, with the hand-built eleven-creature case failing too. The corpus sweep runs
over every committed recording, with human-sideboard-7's 22 crowded frames asserted
to be present (≥ 20) so the crowded case cannot silently drop out.

### 7. Follow-up (b): the departing figure — a death that is seen

> **Superseded by the fix pass, §1.** The rule this section describes — a body
> drawn only while its card's `die` request is on the stage — blinked on every
> death. The body's fate is now the queue's (`stepDeparture` /
> `CueQueue.deathPending`, **D64**); read §1 of *The verification pass's findings,
> fixed* below before re-deriving anything from this section.

**The argument, since it supersedes D56's clause** (PLAN's follow-up 2 said a
figure that outlives its frame would be "the renderer remembering something the
engine did not say"). The engine *does* say it: the `zone battlefield → graveyard`
event is about that card, and its cue already writes a `die` request for that card
id. Tier 1's own card does exactly this — its `zone.dissolve` offset draws the card
**at the battlefield** in the frame whose snapshot already has it in the graveyard,
and decays to its new place. The departing body is the same shape for a figure:
**drawn only while its card's `die` request is on the stage, at the pose it had on
the previous frame, on that cue's `t`**, and its identity — what it decays to — is
**absence**. The one thing remembered is the previous frame's pose, which is the
same one frame of look-behind the strike already reads (D63). **DECISIONS.md needs
an entry for this; it is not this track's file.**

**How** (`scene/FigureLayer.tsx`'s `DepartureField`, bound from `DiscField.bind`,
i.e. from `CueRunner`'s one `useFrame`, which this track did not touch):

- at **commit time** (a layout effect, never the frame loop) `departedFigures(before,
  after)` (`figures/pose.ts`, pure) names every modelled, non-ghost figure that left
  between two frames; each gets a clone at its last pose, **undrawn**;
- each frame, a body whose card has a `die` request is drawn: the die clip takes
  over from its last stance over the first 12% and **never hands back**
  (`departureWeight` — `clipEnvelope` returns to 0 at t = 1, which a death must not),
  it fades out over the last 40% (`departureOpacity`, exactly 0 at t = 1) and drains
  toward the dissolve cue's grey; `action.time = t × duration`, `mixer.update(0)`;
- the first frame with no request after one was seen, it is done — so skip, flush, a
  backwards scrub and a new `gameId` end the body in the same frame they end the cue,
  with no bookkeeping of their own; reduced motion writes no clip requests, so no body
  is drawn; a body whose card never gets a `die` (bounced, flickered) is never drawn
  and is let go after eight snapshots; at most eight are held.

**Over the corpus** (`clips.test.ts`, the real reducer and queue on a `NullStage`,
exactly as `replay-cues.test.ts` runs):

```
clips: 17 modelled figures left the table over the corpus · 17 died on their own die request,
played mid-cue — the death is drawn · 0 got one only snapped · the rest left without one: (none)
```

(PLAN's "69 `die` requests in a 1× replay of g1" counted frames of three deaths; the
corpus has 17 deaths of a modelled figure in all, and every one now has a body.)

**In the browser**, `g1.jsonl`, slider 201 → 202 (a Soldier token, `agent`, dies
attacking; `var/shots-t8/death-g1-strip.png`): paused queue, step one frame, advance
the virtual clock 20 ms at a time with a fiber frame after each. The dissolve cue
starts about half a second into the batch (`die@0.15` at 600 ms of virtual time);
from then `stage.clipOf(90)` reads `die@0.15 … 0.86`
and `discs.counts().departures` is **1**, while the living rig for card 90 is already
gone. The strip: at 201 the token stands attacking on its disc; at t = 0.30 the body
staggers back where it stood, with no disc; at t = 0.60 it lies on its back, arms out
(`Death01`, retargeted); at t = 0.85 it is faint; after the cue, nothing — `departures`
0, the body undrawn and disposed at the next commit. The same at slider 358 → 359 for
the Giant-Sized Flying Ant (`death-ant-strip.png`, the bee's own `Death` clip): the
die request arrives only after the combat-damage cues (`die@0.18` at 1,440 ms of
virtual time), and the body stays undrawn until then; 65 draw calls at t = 0.6 with
the body drawn.

**One honest caveat, visible in the ant's strip:** when a creature leaves, `layout()`
re-centres its rank in the same frame, so the neighbour that moves into its old slot
stands where the dying body is for up to one cue (≤ 650 ms). The body dies where it
stood; the rank does not wait for it. Changing that would be a layout transition —
Tier 1's cards snap there too — and is not proposed here.

**Liveness** gains one clause: `departures.bind` is called only from `discs.ts`,
`setDepartures` and `departures.add` only from `FigureLayer.tsx`, and the field's
`bind` reads `clipOf`, gates on `'die'`, calls `mixer.update(0)` and builds nothing.
**Negative controls**, on a scratch copy of the tree: removing the `'die'` gate turns
it red ("the departing body is no longer gated on the die clip"), and binding the
departures from `CueRunner` turns it red ("the departures are bound outside the disc
field"). The existing clauses — one `useFrame`, zero-delta mixer ticks only in
`CueRunner.tsx` and `FigureLayer.tsx`, `action.time` written only there — hold
unchanged, because the body's frame half lives in `FigureLayer.tsx`.

### 8. Budgets, measured (dev build, GTX 1080, bloom off — with bloom on `gl.info` counts only the composer's last pass)

| frame | figures | draw calls (≤ 90) | triangles (≤ 30,000) | programs | geometries |
|---|---:|---:|---:|---:|---:|
| `g1`@316 (T7's bench frame) | 10 | **60** | **20,982** | 11 | 13 |
| `g1`@355 | 11 | **65** | **24,406** | 11 | 14 |
| `g1`@359, a body dying (t = 0.6) | 10 + 1 | **65** | — | 11 | — |
| `g2`@200 (all three humanoids) | 8 | **51** | **19,669** | 11 | — |

The library itself is 9,759 triangles for five models. No frame-time benchmark was run
by this track (`tools/arena-bench.mjs` is out of the gate, and nothing here changed
what a frame costs beyond the two new meshes of the same size as the agent's).

### 9. Gates

```
npm --prefix web test   → node --test 644 pass / 0 fail · vitest 79 pass (5 files)
npm --prefix web run build → tsc --noEmit clean; vite build ✓
  dist/assets/index-*.js   276.93 kB │ gzip  86.22 kB     (both tracks' changes)
  dist/assets/Arena-*.js 1,147.12 kB │ gzip 321.41 kB
node tools/build-figures.mjs → verified 4 sources · 143,920 B · sha256 c09ac552… (twice, identical)
```

This track's new or changed tests: `figures.test.ts` (+2: retargeted clips name a
recorded CC0 library; the committed `.glb` is the file `models.json` records),
`clips.test.ts` (+4: one rig and one clip set; `hit`/`die` are not borrowings; the
departure envelope; the corpus death sweep), `figure-pose.test.ts` (the fit and
overlap tests rewritten with no exemption, +2 for the back row), `liveness.test.ts`
(+1). `./tools/check-all.sh` was **not** run by this track (nothing in `bridge/`, the
protocol or a fixture changed).

### 10. Not done, or worth a decision

- **DECISIONS.md** (not this track's file) wants entries for: the departing figure,
  superseding D56's "not to be worked around" clause; the strict width clamp retiring
  `FIGURE_MIN_FIT` (T7's floor); the back-row stand rule replacing report 13 §3.1's
  falloff; the library carrying no texture (`palette` removed); the retarget decision
  (pack clips + the library's `hit`/`die`).
- **CLAUDE.md's Tier 2 conventions** still describe the drone as the one archetype
  allowed to overflow its slot, and PLAN's follow-ups 2, 3, 9, 11 and 18 are closed
  by this section — both are the documentation pass's to update.
- **`shrink` and `block` still borrow `crouch`** (no library has a shrink); the
  **scientist is the agent's silhouette from behind** (braces and tint tell them
  apart, not the outline); the **Giant-Sized Flying Ant** is not giant under any
  width clamp.
- **`@gltf-transform/cli` still floats on `^4.5.0`** (follow-up 17). The built file is
  byte-reproducible with the installed 4.5.0; a minor release could change the bytes,
  which `figures.test.ts`'s hash check would now catch rather than hide.
- The **UAL's root-motion variant** (`UAL1_Standard_RM.glb`) is in the zip and unused:
  §3.4 forbids root motion, and the no-RM file's pelvis still moves within a clip,
  which is all the hip translation needs.

---

## The verification pass's findings, fixed (one major, six minors)

*Appended 2026-09-27 by the fix pass. Same worktree and branch, nothing committed.
The verifier's findings are quoted by number; every number below was measured in
this pass. Driver scripts are in the session scratchpad (`fix/`), not in `tools/`.
Browser: headless Chromium 152 over CDP (`--use-angle=gl`, the GTX 1080), the Vite
dev server on 5180, `bloom=0`; bridges on 8661 and 8663 (seed 5), killed by PID.*

### 1. [major] Every death blinked — fixed (D64)

**The defect, as found.** `DepartureField` drew a dying body only while its card's
`die` REQUEST was on the stage. The snapshot that carries the death has already
removed the living figure, and the death cue plays after the batch's damage cues, so
the creature vanished when the blow landed (1.32 s, 0.77 s and 0.51 s of nothing on
`g1.jsonl`'s three deaths of a modelled creature), took its own `hit` with no body,
and popped back to fall. The section 7 photographs above were all taken inside the
die cue.

**The fix.** The body's fate is the QUEUE's, decided once on its first frame:
`CueQueue.deathPending(cardId)` is true while a death cue (`isDeathCue`: every cue id
`CLIP_FOR` maps to `die` — `zone.dissolve`, `sacrifice.crush`, `zone.exile`) that
targets the card is scheduled and unfinished, whether waiting behind the batch or
running. `figures/clips.ts`'s `stepDeparture` is the whole rule and both the
renderer and the corpus test call it. A dying body is drawn from its first frame
until the cue ends: at its last stance, playing whatever transient the stage gives
its card (its own `hit`, on that cue's `t`); then the die clip takes over from
whatever the body was doing — the transient is held and faded with the stance —
and the fade and drain are as before. A departure with no death cue is never drawn
and is let go at the next snapshot (`keepDeparture`).

**The order, made mechanical.** The body is decided on its first frame, so the batch
must be in the queue by then. `<Canvas>` is a second React root on its own
reconciler and — measured in `node_modules` — its own scheduler (react-reconciler
0.27 ships `scheduler` 0.21; react-dom uses 0.23), so the DOM root's passive
effects and the canvas root's commit are two queues. `Arena.tsx`'s intake is now a
**`useLayoutEffect`**, which runs inside the DOM commit, before the canvas root can
render; a liveness clause fails if it goes back.

**The slot.** `layout()` closes the rank in the same snapshot, so both neighbours
move half a slot toward the dying body. `departureStand` (pure, `figures/pose.ts`)
draws the body one `DEPARTURE_STEP` (0.85, `layout.ts`) toward the table's centre
line when a figure of the new frame would stand in it — into its own combat lane —
backing off toward its seat only if the lane spot is taken. Holding the slot would
have been a layout that remembers.

**In the browser, sampled after every `gl.render`** (a hook on the renderer, so
what is counted is what was drawn — a `requestAnimationFrame` sampler runs out of
order with fiber's own callback and reports a phantom one-frame gap), 1× replay,
`g1.jsonl`:

| death | frames | living figure gone | body drawn from | die clip | body gone | frames with neither |
|---|---:|---:|---:|---|---:|---:|
| Giant-Sized Flying Ant (card 24) @359 | 220 | 419 ms | **419 ms** | 1368–2002 ms | 2018 ms | **0** |
| Robot Token (card 97) @298 | 189 | 412 ms | **412 ms** | 794–1427 ms | 1444 ms | **0** |
| Soldier Token (card 90) @202 | 189 | 412 ms | **412 ms** | 545–1178 ms | 1195 ms | **0** |

The ant's and the Robot Token's `hit` starts on the living rig (`hit@0.62`, the
frame before the canvas commit) and continues on the body (`hit@0.65` the next
frame). The ant and the Robot Token stepped out to `z = 0.93` (from 1.78); the
Soldier Token, on the opponent's side with nobody closing on it, stayed where it
stood. Photographs: `fix/shots/ant-359-{200,500,1100,1650,1900}.png` — standing
at 358; at 359 the body in front of a rank that has closed up, clear of both
neighbours, during the lethal-damage close-up; mid-fall at 1650 ms.

**The corpus test** (`clips.test.ts`, "every dying body is drawn from the snapshot
it dies in to the end of its death cue — no blink"): the real reducer, planner and
queue on a `NullStage`, a 25 ms frame, the batch enqueued before the body's first
frame, `stepDeparture` on every tick. Two paces:

```
clips (drained): 17 dying bodies (+ 0 deaths snapped by a flush, nothing to draw) · drawn without a gap
  from the snapshot to the end of the death cue: 17 · fell mid-cue 17 · took their own hit 12 ·
  drawn before the fall began 17 (longest 1625 ms — the gap slice 2 left empty)
clips (paced): 15 dying bodies (+ 2 deaths snapped by a flush, nothing to draw) · drawn without a gap
  from the snapshot to the end of the death cue: 15 · fell mid-cue 11 · took their own hit 12 ·
  drawn before the fall began 11 (longest 2900 ms — the gap slice 2 left empty)
```

"Paced" is the replay's own 1× (a frame every 400 ms), where a death's batch can
wait seconds behind the one before it; two of its batches overflow §5.2's cap and
are flushed on arrival, which snaps their deaths at `t = 1` with nothing to draw —
exactly what a snapped cue does to a living figure's clip. **Negative control**:
slice 2's rule put back into `stepDeparture` fails the test on tick 0 of every death
it reaches, the first being `g1.jsonl` card 90 — the verifier's Soldier Token — and
on "drawn again after its death cue ended" for the same bodies. Three smaller tests
pin the lane (decided once; a bounced card discarded later does not come back to
die on the battlefield), the death-cue set, and `departureStand`.

**Budgets unchanged**: `g1`@316 **60** draw calls / **20,982** triangles, `g1`@355
**65** / **24,406** (bloom off, `?glinfo=1`), the same as the verification pass read.

### 2. [minor] The hand covered the seat's own land rank in shoulder and low — fixed (D69)

`keepsSeat` gained an occlusion term: `ranksUncovered(pose, fan, ranks)` — no point
of the seat's land-rank and creature-rank lines may project inside any card of a
seven-card fan, at every aspect in `LIVE_ASPECTS`. The geometry is `layout.ts`'s:
`fanCorners(7, 'you')` (the corners exactly as `CardPlane` draws them, Euler
`[pitch, 0, spin]`) and `seatRankLines('you')` (the widest rank, every 0.2, drawn
`SIGHTLINE_MARGIN` = 0.15 toward the seat). It is conservative — a point inside a
card counts as covered whether or not the card is in front. The old poses are the
test's negative control: both pass `framesSeat` at every aspect and both fail
`keepsSeat` on the new term alone (28 and 26 rank samples behind the hand at 16:9).

Re-tuned by a grid search (the same criteria as the camera builder's plus the new
term) and checked live:

| view | slice 2 | now | Plains samples on the card (raycast grid, live, seed 5) |
|---|---|---|---|
| table | az 0°, polar 38.9°, d 11.95 | unchanged | 81 of 92 (unchanged) |
| shoulder | az 10°, polar 66°, d 10.5 | az 9.8°, polar **54.9°**, d 9.30 — `[0.9, 5.35, 9.5] → [−0.4, 0, 2]` | 20 of 103 → **41 of 96** |
| low | az 22°, polar 74°, d 10.5 | az 21.9°, polar **59.0°**, d 10.49 — `[3.35, 5.8, 10.1] → [0, 0.4, 1.75]` | 8 of 109 → **34 of 86** |
| opp. shoulder | the old shoulder, mirrored | the new shoulder, mirrored | (spectator only) |

The remaining misses are the Plains' near third, still behind the hand; the far two
thirds — where its art and tapped state read — are clear. The centre line alone (no
margin) gave 36 and 27; a margin large enough to clear the whole card lifts both
views most of the way back to the table view (polar ≈ 50°), which is the trade the
margin is set against. A seven-card fan is inside ±0.97 at 4:3 in both. **The seat
still acts from both**: live (seed 5, port 8663), from the shoulder a click on the
Plains in hand sent `clickCard 20` and it moved to the land rank (`z = 3.4`); from
low a click on card 18 sent `clickCard 18` and came back as the engine's "Not
selectable" (a second land that turn). The frame log passes `check-redaction.mjs`.
Photographs: `fix/shots/live-view{2,5,1}-plains.png`, `g1-355-view{2,5,3}.png`.
"Low" is a corner now rather than a crouch; that is D69's stated cost.

### 3. [minor] DECISIONS, CLAUDE.md and PLAN lagged the code — fixed

**D64–D71** added, each with its rejected alternatives: the departing figure and
the blink fix (superseding D56's clause and follow-up 2), the strict width clamp
(retiring `FIGURE_MIN_FIT` and D55's drone overflow), the back row on its own card
and its disc pass, the texture-less library and the verifying build, the retarget
decision, the five views with the occlusion rule and spectator-at-game-end, the
director's three numbers, and rule 5 / `change` filtering / the stored view.
CLAUDE.md: `keys.ts` is 23 rows, the Tier 2 conventions describe the departing body,
the strict clamp and back-row rule, the URL allow-list, the verified build, the
frame-loop allocation clause and slice 2's camera rules, and the test counts and
decision count are current. (CLAUDE.md never named the drone as the permitted
overflow — that was D55's "Known cost" and PLAN follow-up 11 — so the strict clamp is
stated there positively instead.) PLAN: follow-ups 2, 3, 8, 9, 11 and 18 marked closed
with what closed them, a slice 2 section, and T8 marked done.

### 4. [minor] The allocation guard did not reach the new frame-loop code — fixed

A new liveness clause reads the bodies the one `useFrame` reaches through the disc
field — `DiscField.bind`, `discs.ts`'s `commitCount`, `DepartureField.bind`,
`driveTransient`, `actionOf`, `CueQueue.deathPending` and the four lane functions —
and rejects `new`, array and object literals, spreads, closures, template strings,
`for…of`, `.values()/.keys()/.entries()`, allocating array/string methods and
`Array.from`/`Object.keys`-style builtins. **Its negative controls run every time**:
eleven junk lines, the verifier's `const _junk = [t, t];` first, are spliced into
every body and each must be caught. Separately, the verifier's own control — that
line typed into `DepartureField.bind` on the real file — turns the clause red.
`DepartureField` now keeps its bodies in a fixed array of `MAX_DEPARTURES` slots
walked by index, and `DiscField.bind` walks a reused array refilled once per
snapshot (when the layout object changes) instead of a `Map` iterator per frame.

### 5. [minor] Back-row stand discs were invisible — fixed (D66)

`FigurePose.onCard` marks a stand point inside its own card's footprint (the back
row), and `DiscField` draws those instances in a second `InstancedMesh`,
`discs:on-card`, at `ON_CARD_DISC_ORDER` = 70 — after every battlefield card
(`row × 20 + i`, +20 hovering) and before the hand fan (100) — with the same
material. It is `visible = false` when empty, so a frame with no wrapped rank draws
nothing more. In the browser at `human-sideboard-7` **@1181** and **@1195**: 21 discs,
**10 in the on-card pass** (five a seat), all ten drawn on their cards
(`fix/shots/backrow-1181.png`, `-1195.png`; 49 and 50 draw calls, bloom off).
`figure-pose.test.ts` asserts over the corpus that every disc lying on a flat card
is flagged and ordered after every card under it — **200** of them, 20 in the
verifier's two frames — and a liveness clause pins the pass to the constant.

### 6. [minor] "No CDN" was a hostname denylist — fixed (follow-up 8 closed)

The clause is now an allow-list: every string literal (`'…'`, `"…"`, `` `…` ``, JSX
attribute strings included) in every `.ts`/`.tsx` under `web/src/arena/` that
carries a URL scheme (`scheme://` or a leading `//host`) fails unless `URL_ALLOW`
names it for that file with a reason — today only `https://scryfall.com`, the art
credit's `href` in `Arena.tsx`; in `models.json`, `figures.json` and `cues.json`
only the provenance keys (`source`, `licenceUrl`, …) may hold one, and never
`path`. Six in-test controls (the verifier's `'https://example.com/figures.glb'`, the
gstatic DRACO path, a template-string URL, a protocol-relative fetch, a `wss://`
socket and an off-origin Scryfall image) must each be caught; the verifier's line
typed into `scene/models.ts` on the real file turns the clause red.

### 7. [minor] Views stayed greyed after a live game ended — fixed

Spectator mode is now ON by itself the moment a live game ends (`spectatorPref ??
true` once the seat is not live), still switchable with `O`, and the flip is
forgotten when the seat goes live again. Live, seed 5: before the concede the
switcher read `table* shoulder oppShoulder(off) side(off) low director(off)
spectator(off)` and `4` said "back in a replay or when this game ends"; after it,
with no key pressed, `… side director spectator*`, and `4` moved the camera to
side-on (`[−7.4, 2.05, 0.6]`); `O` turned it off again, and `3` then said "press O".
The `O` row's text in `keys.ts` now says "on by itself in a replay and when your
game ends".

### Gates

```
npm --prefix web test     → node --test 652 pass / 0 fail · vitest 79 pass (5 files)   (644 + 79 before this pass)
npm --prefix web run build → tsc --noEmit clean; vite build ✓
  dist/assets/index-*.js    276.96 kB │ gzip  86.23 kB   (the O row's longer text: +0.01)
  dist/assets/Arena-*.js  1,149.76 kB │ gzip 322.38 kB   (+0.97: the departure lane, the occlusion term, the on-card pass)
rm -rf bridge/out && WSPORT=8662 ./tools/check-all.sh → check-all OK, exit 0, 731 s
  9b human-auto-42 re-records to the same multiset · 9c ten games 10/10 · all seven ws servers ·
  web step 662 node --test (654 pass / 0 fail / 8 skipped) + 79 vitest
```

New or changed tests in this pass: `clips.test.ts` +4 (the death-cue set, the lane,
the step-out, the corpus no-blink timeline at two paces), `camera.test.ts` +1 and the
`seatSafe` test now on `keepsSeat(pose, SeatGeometry)`, `figure-pose.test.ts` +1 (the
on-card disc order over the corpus), `liveness.test.ts` +2 and two rewritten (the URL
allow-list replacing the hostname denylist; the departure clause now also holds
`deathPending`, `stepDeparture` and the layout-effect intake; the on-card pass; the
frame-loop allocation scan). `~/.forge` and `/home/justin-a/forge` (depth 2) hashed the
same before and after; every process this pass started — Vite on 5180, Chromium on
CDP 9379, bridges on 8661 and 8663 — was stopped by PID.

## The second verification pass's findings, fixed (one major, three minors)

*Appended 2026-09-27 by the second fix pass. Same worktree and branch, nothing
committed. Browser: headless Chromium over CDP with `--use-angle=gl` — every driver
printed WebGL's unmasked renderer, `ANGLE (NVIDIA Corporation, NVIDIA GeForce GTX
1080/PCIe/SSE2, OpenGL 4.5.0)` — against the Vite dev server on 5180 with
`bloom=0`; live bridges on 8660–8662 (seed 5), the gate at `WSPORT=8665`. The
driver scripts are in the session scratchpad (`fix2/`), not in `tools/`. Both
defects this pass fixed are Tier 1's; they were found by measuring D64's promise.*

### 1. [major] A batch after an idle gap skipped its own start — fixed (D72)

**The defect.** `CueQueue.tick(now)` added the whole real-time gap since the last
rendered frame to the cue clock, and `frameloop="demand"` parks the loop whenever
the queue drains and nothing hovers. So the first frame after a pause jumped the
clock by the pause, and the start of the next batch — the damage `hit`, the death
cue, and with it D64's departing body — was consumed before a frame was drawn.
`g1.jsonl`'s deaths were unaffected only because something on that table hovers
and keeps the loop at 60 fps.

**The fix.** The clock runs only while there is film: `tick` returns early, and
forgets the real time it saw, while the queue is idle; `enqueueBatch` forgets it
too when a batch lands on an idle queue. The first tick after such a batch is its
`t = 0`. While cues are running one tick adds at most `MAX_TICK_MS` = 100 ms, so a
late frame (a hidden tab, a loop some future defect parks mid-cue) resumes the film
rather than swallowing it. The clamp alone was rejected: after every pause it would
still eat the first 100 ms of the next batch (**D72**).

**Stepped in the browser**, the verifier's own transitions: scrub to the frame,
wait for the queue to drain, wait, press *next*, and count the frames on which
`discs.counts().departures > 0` (a per-`rAF` sampler on `gl.info.render.frame`).
The loop drew **0 frames** during every pause, so the 3 s rows are the parked case.
"Old clock" is `tick`'s previous body restored in place for one run and put back.

| transition | pause before *next* | old clock | this clock |
|---|---|---|---|
| `human-auto-7` 794→795 (two deaths) | 30 ms | bodies on 73 of 76 frames | **86 of 89** |
| | **3 s** | **0 of 2** — the batch was empty on its first frame | **86 of 89**, last body frame at 1,441 ms |
| `human-comfort-13` 1043→1044 | 30 ms | (verifier: 34 of 54) | 36 of 55 |
| | **3 s** | (verifier: 0) | **36 of 55** |

Re-photographed on `human-auto-7`@794 after a 3 s pause (scratchpad
`fix2/death-human-auto-7-794-idle3000-*.png`): at 760 ms both dying bodies — the
gold hero (card 21) and a pale agent (card 66) — stand in the combat lane they
stepped into; by
about 1,110 ms (the third screenshot; its timing is the driver's, not the frame's)
they have all but faded — `departureOpacity` fades over the last 40% of the die cue,
and the sampler counts the last, near-transparent body frame at 1,441 ms.

**Live** (bridge on 8662, seed 5, 13 turns to the AI's win): an autopilot seat
that presses SPACE, answers an `ask` with Escape, or clicks a selectable card at
its projected centre with a real CDP mouse event, thinking 0.9–2.1 s between
prompts so the loop parks the way it does for a player. **44 batches; 42 landed on
an idle queue whose last frame was 2–984 ms earlier, and the first tick advanced
the cue clock by 0 ms for every one of them** (max 16 ms over all 44, on a batch
that arrived while another was playing); the verifier measured 734–1000 ms here.
17 of the 44 still finished on their first tick — and with a 0 ms advance that can
only be cues of zero duration: the awaiting-human budget snapping them below
`MIN_COMPRESSION`, which is Tier 2 follow-up 1's first cause and is unchanged.
`check-redaction.mjs` PASS on the frame log (`var/games/fix2-live-5c/`, local);
the bridge printed `MTGTABLE OK`. (Two earlier attempts on 8660/8661 wedged at the
cleanup discard while the autopilot looked up rigs by the wrong key — the rig map
is keyed `c:<id>` — and were stopped by PID; their logs were deleted.)

**Tests.** `replay-cues.test.ts` +2: *an idle gap is not film* (drain, 3 s with no
tick, enqueue a `damage` + `tap` batch, tick once: the first cue is applied at
`t < 0.1` — it is exactly 0 — and one frame does not consume the batch; then the
same with an idle tick in between) and *a late frame adds at most `MAX_TICK_MS`*.
`clips.test.ts`'s no-blink timeline has a third pace, `idle`: every batch drained,
then 3 s with no tick. It reads *17 dying bodies · drawn without a gap from the
snapshot to the end of the death cue: 17 · fell mid-cue 17 · took their own hit
12* — identical to the drained pace. **Negative control**, with `tick`'s old body
restored: both queue tests fail (*"the first cue opened at t = 1.000 — the idle gap
was played as film"*) and the idle pace fails (*"idle: a drained queue never
flushes a death"* — every death was applied at `t = 1` on its first tick).

### 2. [minor] A re-render put the loop back to `demand` mid-batch — fixed (D72)

**The defect.** fiber 8.18's `configure` runs on every render of `<Canvas>` and
does `if (state.frameloop !== frameloop) state.setFrameloop(frameloop)` against the
prop, which was the literal `"demand"`. `CueRunner` re-synced only on a queue change
or a new layout, so any `Arena` re-render that changed neither — a same-view key,
a hint for 3/4/6/O at a seat, a greyed switcher click, Tier 1's `z` — parked the loop
with cues queued.

**The fix.** `Arena.tsx` owns `loopRef` and renders `<Canvas
frameloop={loopRef.current}>`; `CueRunner`'s sync writes `loopRef.current = mode`
immediately before `setFrameloop(mode)`. A re-render now re-states the mode the
runner chose, and `configure` changes nothing. (A dependency-free layout effect in
`CueRunner` was rejected: it relies on the canvas root re-rendering after every
`configure`, an ordering across two reconcilers — D72.)

**Measured** on `human-auto-42` 716→717, the key pressed 120 ms into the batch,
sampled every 20 ms for 3.5 s:

| press | frames drawn | queue drained at | longest stall with cues queued |
|---|---:|---|---:|
| none | 88 | 1,449 ms | 0 ms |
| `1` (the view already on screen) | 88 | 1,448 ms | 0 ms |
| `z` (a Tier 1 hint) | 89 | 1,447 ms | 0 ms |
| `1`, with the literal restored | **11** | never — 6 cues still queued | **3,336 ms** |
| `z`, with the literal restored | **11** | never — 6 cues still queued | **3,336 ms** |

And `g1.jsonl` 325→326: the attack swoop is **taken** (`director.stats.taken`
+1, the other 24 requests dropped by rule 2's budget exactly as the first pass
measured) with no press, with `1` pressed 100 ms before *next*, and with `1`
pressed 150 ms into the batch; each time the camera ends back on the table pose
`[0, 9.30, 8.30]`. `liveness.test.ts` +1 holds the shape: no `frameloop` prop in
the arena is a literal, `<Canvas>` reads `loopRef.current`, and every
`setFrameloop(x)` in `CueRunner` is preceded by `loopRef.current = x` (nothing else
calls it). Negative controls: restoring the literal, or deleting the ref write,
each turns it red.

### 3. [minor] The switcher's row of its own — folded into the cue strip's

`Arena.tsx` wraps `<CueControls>` and `<ViewSwitcher>` in `.arena__strips`, a
layout-only flex row (it keeps the layer's `pointer-events: none`; each strip opts
in on its own, and `liveness.test.ts`'s widget table is unchanged). It stops 15rem
short of the right edge, as `.arena__decision` does, for the opponent's plate.
Below 1400 px each view button collapses to its key: the label is a separate span
that `styles.css` hides, the tooltip is unchanged, and `aria-label` keeps the name.

Measured on `g1.jsonl`@355 at three sizes. "Before" is the same page with the
switcher moved back to a row of its own and its labels forced on; the bust figure
is the share of the opponent's bust quad (projected from `BustField`'s instance
matrix) at which `elementFromPoint` returns something other than the canvas.

| size | switcher before | switcher after | bust quad under chrome, before → after |
|---|---|---|---|
| 1600 × 1000 | y 150–179, x 10–682 | y 116–145, x 512–1184 | 37% → 38% |
| 1280 × 720 | y 150–179, x 10–682 | y 116–145, x 512–742 (keys only) | 33% → 33% |
| 1024 × 700 | y 150–179, x 10–682 | y 116–145, x 512–742 (keys only) | 89% → 89% |

**Read it honestly.** The column is back to slice 1's three rows (the credit line
returns to y 150–170, where it sat before T8), every cue and switcher button still
takes the click at its own centre (11 of 11), the gap between the two strips is
the canvas, and focus stays on `BODY`. But **the bust's coverage did not move**:
what covers it is the decision strip and the cue strip — both slice 1's — plus the
credit line that slides up into the freed row. Tier 2 follow-up 10 is unchanged; the
bust's anchor is T13's to move.

### 4. [minor] Two descriptions of the superseded death rule — fixed

`departedFigures`' doc comment (`figures/pose.ts`) now says the queue decides a
departure's fate (`stepDeparture` / `CueQueue.deathPending`, **D64**) and names the
first rule only as what the fix pass replaced; section 7 above opens with a
*superseded by the fix pass, §1* note.

### Gates (second fix pass)

```
npm --prefix web test      → node --test 655 pass / 0 fail · vitest 79 pass (5 files)   (652 + 79 before this pass)
npm --prefix web run build → tsc --noEmit clean; vite build ✓
  dist/assets/index-*.js    276.96 kB │ gzip  86.23 kB   (unchanged; no three in it)
  dist/assets/Arena-*.js  1,150.19 kB │ gzip 322.48 kB   (+0.10)
  dist/assets/Post-*.js      67.78 kB │ gzip  16.54 kB
rm -rf bridge/out && WSPORT=8665 ./tools/check-all.sh → check-all OK, exit 0, 729 s   (var/check-all-t2-fix2.log)
  9c ten games 10/10, zero UNIMPL · all seven ws servers · web step 665 node --test
  (657 pass / 0 fail / 8 skipped) + 79 vitest
  9b (advisory) human-auto-42 re-recorded with ONE extra c2s `act buttonCancel` and every
  s2c frame identical — the documented wall-clock re-push noise, not a wire change
  (the bridge is untouched by this pass)
```

New tests in this pass: `replay-cues.test.ts` +2 (the idle gap, the late frame),
`liveness.test.ts` +1 (the loop mode), and `clips.test.ts`'s no-blink timeline's
third pace. `~/.forge`, `/home/justin-a/forge` (depth 2) and the main checkout's
file list fingerprinted the same before and after; every process this pass started
— Vite on 5180, the Chromium instances on CDP 9395–9399 (closed with
`Browser.close`), the bridges on 8660, 8661 and 8662 — was stopped by PID or exited
on its own, and ports 5180, 8660–8669 and 9395–9399 are free.

---

## Status — the documentation pass (2026-09-27)

*Appended by slice 2's documentation pass. Same worktree and branch, nothing
committed. This pass edited documentation only — `PLAN.md`, `README.md`,
`DECISIONS.md`, `CLAUDE.md`, `NOTICE`, `docs/ideas/arena-mode.md` and this
section — and no code, test, fixture, asset or tool.*

**Slice 2 is built, verified twice, fixed twice and documented.** T8 (three
humanoid bodies on one rig, the Universal Animation Library's `hit` and `die`
retargeted in, a verified and reproducible `figures.glb`, the strict width clamp,
the back row on its own card, and a death that is seen) and the camera views (five
views, spectator mode, the auto director) are done. Both verification passes'
findings are fixed — eleven in all, two of them major — except that the bust is as
covered by chrome as it was (Tier 2 follow-up 10, T13's).

**What the documentation pass wrote.**

- **`DECISIONS.md`**: **D73** (the hero is `character-female-b` and the scientist
  `character-male-e`, chosen by silhouette because the hologram keeps only
  geometry) and **D74** (the camera keys as three rows of the one keymap, `inert`
  on the board); **D69** gained the table of the five poses as they stand after
  the verification fix; a missing `---` before **D72** restored. D64–D72 were
  written by the fix passes and are unchanged.
- **`CLAUDE.md`**: a section of its own for the camera — five conventions: a view
  is a row of data in a pure `camera.ts` and the chosen view is the camera's home;
  `keepsSeat` and spectator-only rather than a DOM hand strip; the director as a
  pure function with its three numbers; rule 5 at a live seat, `change` under the
  hand, the stored choice; the camera keys as keymap rows, `inert` on the board.
  Also: the camera keys in *Build and run*, the headless-Chromium note (it does run
  rAF; only a paused, hand-stepped queue needs the pump), the Tier 2 section's
  decision list, the gate's timing, and the docs table (**seventy-four** decisions).
- **`PLAN.md`**: slice 1 marked committed (`4f84613`); the user's play-test of slice
  1 recorded ("nothing major"); the evenings table gains **T8** and a **camera
  views** row; slice 1's follow-ups 2, 3, 8, 9, 11 and 18 closed, 1, 4, 10 and 17
  updated with slice 2's measurements; a full slice 2 section (status, command,
  what it built, what the evidence shows); **ten slice 2 follow-ups**; and
  *What slice 2 hands to T9–T14*, replacing slice 1's hand-over. Questions 11 and
  12 of *Only the user can decide* updated.
- **`README.md`**: *Arena mode* gains a *Camera views* subsection (the five views,
  why two are for spectating, spectator mode, the director), the camera rows in
  the keys table, three bodies and the seen death in the Tier 2 list, the fourth
  source and the verifying build in *Where the figures come from* (the rebuild
  recipe no longer unzips anything, and the byte budget it quotes is the build's
  real ≤ 400 kB, not the ≤ 4 MB it used to say), and the repo layout.
- **`NOTICE`** §7 was already complete for the four sources (bytes, sha256, badge
  text and date for each, the UAL as animation only); this pass added that the
  build runs the already-listed three.js in Node for the retarget and the
  measurements and adds no dependency of its own.
- **`tools/assets-manifest.json`** (not this pass's file) was checked, not edited:
  all four packs carry page, download URL, file, bytes, sha256, retrieval date,
  licence and the badge text verbatim; the four archives under
  `var/assets/figures/` match their recorded bytes and sha256, and
  `web/public/models/figures.glb` is 143,920 bytes, sha256 `c09ac552…a981a3`,
  exactly as `models.json` records. The built file carries 5 meshes, 39
  animations and 0 images / 0 textures.
- **`docs/ideas/arena-mode.md`**: slice 1's status marked committed, and a slice 2
  status paragraph.

**The verifier's open findings, re-read against the code.** The second pass's
four findings as the orchestrator relayed them are each addressed in the tree:
`cues/queue.ts` has `MAX_TICK_MS` and the idle-queue early return (**D72**);
`Arena.tsx` renders `<Canvas frameloop={loopRef.current}>`; `figures/pose.ts`'s
`departedFigures` comment now describes the queue deciding (`stepDeparture` /
`CueQueue.deathPending`) and names the request-on-the-stage rule only as what was
replaced; and `.arena__views` shares `.arena__strips` with the cue strip — with
the bust's coverage unchanged, as that fix section says.

### The gate

```
WSPORT=8666 ./tools/check-all.sh   (bridge/out NOT deleted first; build.sh recompiles every source anyway)
  → check-all OK · exit 0 · 727 s wall (10:42:09 → 10:54:16)       log: var/check-all-t2s2-docs.log
  4-9   Smoke, RecordMatch, the drift diff, null / console / auto sessions: UNIMPL members = none
  9b    (advisory) human-auto-42 re-records to the SAME multiset: 1,587 frames, order ignored
  9c    ten games 10/10 reached `over`, zero UNIMPL, every log through check-redaction
  9d    the sideboard ask across two games: PASS
  10    all seven ws servers (10a-10g), every server and client log PASS; 10f sent 7 clickAbility,
        none unresolvable; 10g three games over one socket
  11-12 every committed fixture (games/ and synthetic/) and every fresh recording PASS; the
        checker's own negative controls REJECTED as they must be
  13    npm run build: index 86.23 kB gzip · Arena 322.48 kB · Post 16.54 kB (all unchanged)
        npm test: node --test 665 (657 pass / 0 fail / 8 skipped) + vitest 79 pass (5 files)
```

It ran while this pass edited documentation files only, none of which any step
reads (`grep` of `tools/` and `web/test/` for the edited files' names finds only
comments). Nothing under `/home/justin-a/forge` or `/home/justin-a/.forge` was
modified during the run (`find -newermt` at depth 4: nothing), and no process,
port in 8660–8669 or port 5180 was left behind.

### What is still open

Slice 1's thirteen open follow-ups and slice 2's ten are in `PLAN.md`'s
*M7 Tier 2*, and the next evenings are *What slice 2 hands to T9–T14*. The ones
most worth a person's attention: **nobody has play-tested slice 2** (the user's
games were on slice 1), **no live death has been watched**, and every browser
number in this file is headless Chromium on the GTX 1080.
