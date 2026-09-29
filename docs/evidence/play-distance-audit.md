# The play-distance audit — the merged block, seen together (2026-09-29, D265–D266)

Branch `play-distance-audit`, worktree `mtg-table-t2a`, off `main`'s `e2c337c`.
Eight lanes merged onto the arena over 2026-09-28/29, each verified alone: the
status layer (D210–D212), the caption (D255–D256), the sound cues (D250–D252),
villain identity and its second lane (D220–D222, D230–D233), the arena polish
(D240–D241) and the personal tier's models (D190–D198). This is the first look at
the whole: pictures of every recording that matters from every view that matters,
a defect list graded **fix** (cheap, mechanical, inside the invariants), **owner**
(taste — PLAN.md's owner questions 32–36, each with its picture) or **accept**
(with the reason), and the fixes.

The personal tier is in the pictures (the user's own models dress Doom's card and
the villain seat, Nick Fury's card and your seat, Coulson, the three Hulks, Peggy
and the MCU Wasp), so every picture stays under the gitignored `var/audit/` and is
never committed or published (D190). Paths below are relative to the repository.

## §1 How the pictures were taken

- **The page**: the dev server (`vite --port 5240`, the personal tier on: six
  active models, two skipped as disabled), `/?replay=<file>&dpr=1#arena`, and
  `&personal=0` for the tier off. Headless Chromium (the snap, 152) on the GTX
  1080 through ANGLE (`--use-angle=gl`), with the personal tier's isolation flags
  except the host resolver, which let `cards.scryfall.io` through for the art the
  arena hot-links (owner question 5's default). One Chromium per worker, closed
  by CDP's `Browser.close` (the snap answers `kill` with EACCES).
- **A frame**: the replay bar's scrubber set to the transport index, `K` (skip
  everything), resources and the cue queue idle for 1.2 s, then per view the view
  key and `K` again (it snaps the camera home) and a screenshot, with the page's
  DOM rectangles saved beside it as JSON.
- **The recordings and frames** (`var/audit/drv/scan.mjs` and `combats*.mjs`
  chose them — a crowded mid-game frame and a combat frame with blocks where the
  file has one):

  | recording | crowded | combat | game over |
  |---|---|---|---|
  | `g1` | @316 (the bench frame) | @371 (5 attackers, 1 blocker) | @376 |
  | `villain-doom-248` | @388 (49 battlefield cards) | @395 (12 attackers, 7 blocks) | — |
  | `villain-masters-of-evil-33` | @438 | @476 (10 attackers, 5 blocks) | — |
  | `villain-hulk-family-261` | @410 | @429 (9 attackers, 5 blocks) | — |
  | `villain-wakanda-232` | @525 (the terrain's cap frame) | @497 | — |
  | `human-sideboard-7` | @1195 (42 cards, 21 creatures) | @1224 (11 attackers) | — |

- **Both seats.** Every committed recording is seen from seat 0 — the villain
  files from the villains' chair. The other chair is the same seed recorded with
  `--seat 1` (`./bridge/run.sh mtgtable.RecordMatch --deck <the file's deck>
  --deck2 decks/pacho-shield.dck --seed <its seed> --seat 1 --out
  var/spectate/audit-<file>-seat1.jsonl`, and `--deck decks/pacho-shield.dck
  --deck2 decks/pacho-shield.dck --seed 42` for `g1`): all five `RECORD OK`, and
  `tools/same-game.mjs` calls each villain pair the SAME GAME (2,071–2,517 events
  and 334–488 phase-boundary states equal; the framing differs by a frame or two
  from the forwarder's flush clock, the race D230 names). `g1`'s pair differs in
  `keywords` alone: `g1` predates amendment M49 (the status layer's follow-up 1).
  The seat-1 frames were matched to the seat-0 ones by the battlefield's ids, taps
  and bands (`mapidx.mjs`): doom @390/@397, masters @438/@476, hulk @410/@429,
  wakanda @526/@497, g1 @316/@371/@375. `human-sideboard-7` is a human-transport
  probe game and has no seat-1 twin. The seat-1 view of a villain deck is the
  composition a bare `./scripts/play.sh` gives you: Pacho near, the villains
  across the table.
- **The matrix**: 6 recordings × 2 sizes (1600 × 1000, 1280 × 800) × views 1–4 ×
  the personal tier on and off × the frames × both seats where there are two =
  **384 shots**, taken before the fixes (on `e2c337c`'s code) and again after.
- **A live seat**: `./bridge/run.sh mtgtable.MtgTable --transport ws --port 9341
  --ai-deck decks/doom-legion.dck --seed 42 --keep-open --games 3`, the page at
  `/?ws=1&port=9341#arena`, the hand kept and priority passed to the first main
  phase (`live.mjs`), shot at both sizes before and after.
- **Everything on at once** (`allon.mjs`): `g1` stepped from @341 to @342 at half
  speed so the shot lands mid-batch, a card hovered (the credit and the inspect
  chip name it), the caption, the status strips, the cue strip and its status, the
  switcher, both plates, the turn-order bar and the frame log's bar (the arena has
  no log drawer — `L` is the board's — so the log on screen is the replay bar and
  the watching line). Both sizes, before and after.

## §2 The pictures

| what | where |
|---|---|
| **contact sheets, before the fixes** — one per recording × size, rows seat × personal × frame, columns views 1–4, each tile labelled | `var/audit/sheets/<recording>-<1600x1000\|1280x800>.jpg` (12) |
| **contact sheets, after** | `var/audit/sheets-after/…` (12) |
| every shot at full size, with its DOM rectangles | `var/audit/shots/` and `var/audit/shots-after/` `<recording>/<size>/s<seat>-p<1\|0>-f<index>-v<view>.png` |
| the four views of each shot side by side | `var/audit/quads/` (before) |
| before / after pairs, labelled | `var/audit/beforeafter/1-strips-1280-idle.png`, `2-strips-1280-playing.png`, `3-live-seat-chrome-1600.png`, `4-decision-bar-1280.png`, `5-own-figures-seat1.png`, `6-all-on-1600.png`, `6-all-on-1280.png` |
| the live seat | `var/audit/live/live-{before,after}-{1600x1000,1280x800}.png` |
| crops the list below cites | `var/audit/crops/` |
| the drivers (scratch) | `var/audit/drv/` |

## §3 The defect list

| # | what, where | the rule it meets | grade |
|---|---|---|---|
| F1 | **At 1280 × 800 the cue strip and the camera switcher take two rows**, idle (192 of 192 shots) and while cues play; the switcher's row pushes the credit and the inspect chip down over the far rank's creatures (`beforeafter/1-strips-1280-idle.png`) | the caption's follow-up 3; D256 point 4's one row | **fix** (§4) |
| F2 | **The status grows ~92 px when a batch starts** (*idle* → *12 steps · 4155 ms*), so the switcher jumps rows mid-play at the widths where the idle strip just fits (1280; 1800 with labels, D256's amendment) | D256 point 4 | **fix** (§4) |
| F3 | **The chrome column is past `HUD_TOP_PX`**: at a live seat whose prompt wraps (the ordinary priority prompt does, at the prompt's 46ch) the column is **137 px** at both sizes against the band's 128 — D241's inspect chip took a fourth row. On a replayed human seat at 1280 × 800 it is **171 px**, and the chip sits on the turn-order bar's head (`beforeafter/3-…`, `4-…`) | D85 (the chrome IS the band), D100 (the opponent's duelist ≥ 70% at 1280 × 800: 64% against a 137-px column) | **fix** (§5, D265) |
| F4 | **The 1900 px breakpoint** was set against a strip whose status grew; re-measured with the fixed status | D256's amendment | **fix** (§4): 1840 |
| F5 | **From seat 1 your own creatures are discs**: the model budget (12) was spent in the wire's player order, so the villains took every model and the viewer's creatures stood as discs under floating strips (`beforeafter/5-own-figures-seat1.png`) | "differs between the seats without a reason"; M47 (one seat's eyes) | **fix** (§6, D266) |
| F6 | README says the switcher collapses below 1,400 px (1,900 since the caption's rebase) | — | **fix** (a doc) |
| F7 | **The caption's per-view figures** were not re-measured when the corpus grew to 23 logs | D256's amendment says so | **fix** (§7): re-measured, printed every run, two claims held |
| O32 | **The far seat's status strips under the chrome**: the far rank's wrapped back row puts its strips (~30 px above the heads, the status layer's follow-up 5) under the credit row — after the fixes 0.5% of the corpus's strips at 1280 × 746 and 6.5% of the villain decks' seen from Pacho's chair (§8) (`after/villain-doom-248/1280x800/s1-p1-f390-v1.png`) | none (the strip is a HUD); D100 says the far end is under the chrome | **owner** (question 32) |
| O33 | **A strip over a disc floats** at the height its figure's head would have: a body-less creature (every probe beast; the Wakandan Tusker) or one past the budget (`shots-after/human-sideboard-7/1600x1000/s0-p1-f1224-v1.png`) | D212's "above the head" has no head to be above | **owner** (question 33) |
| O34 | **Your duelist under the turn-order bar** at 1280 × 800: 30% of it in the low view and 16% in the shoulder view (0 at 1600; none from the table view) — D210's bar came after D100's stand, and `camera.ts`'s chrome knows the band and the plates but not the bar (§8) (`after/villain-doom-248/1280x800/s0-p1-f356-v5.png`) | D100 prints your duelist's share, asserts only the hand and ranks | **owner** (question 34) |
| O35 | **The caption in the low and shoulder views** (seat-safe): the stack's lower items under it at 1024–1440 px in the low view (531 frames), the right end of your hand in the shoulder view (1,757 frames at 1600 × 944) (§7) (`after/villain-doom-248/1280x800/s0-p1-f356-v5.png`, `…-v2.png`) | the caption's follow-up 2 | **owner** (question 35) |
| O36 | **The villain-seat recordings stand your own Fury model behind the Doom Legion** (and Doom behind Pacho's deck) — duelists are the seat's (D99), and with the personal tier on the director is the user's model (`shots-after/villain-doom-248/1600x1000/s0-p1-f388-v1.png` against `…/s1-p1-f390-v1.png`) | villain identity's follow-up 12 | **owner** (question 36) |
| A1 | Raised hands reach the strip; the personal Hulk (1.21 tall, a fist raised in front of him) is the new worst case, the bar across his fist at `villain-hulk-family-261`@410 (`crops/hulk-strips-pp.png`, the CC0 figure under it) | the status layer's follow-up 6 (the test holds heads, not hands) | **accept** — the dressed models' resting tops are 0.96–0.98 of their height (§8), so a dressed head clears its strip; the follow-up carries the picture |
| A2 | The game-over banner covers the carrier and the centre of the table in every view (`g1`@376) | — | **accept** — the banner is the outcome, and the game is over |
| A3 | From views 3 and 4 your carrier (over your rank at `SILHOUETTE_ALTITUDE`) is at the top of the frame, under the chrome (`quads/g1-1280x800-s0-p1-f316.jpg`) | D85 holds the table view only | **accept** — spectator-only views; D85 rejected a carrier that depends on the view |
| A4 | The caption hides on the last quiet frames (`g1` @374–376 are a re-sent state and `over`), so the winning blow's caption is gone as the banner comes up | the caption's follow-up 1 (a hold) | **accept** — the banner says who won; a hold is follow-up 1's owner question |
| A5 | A far strip draws over a near figure in views 2–4 | D212: `depthTest` off, on purpose | **accept** — a HUD |
| A6 | The opponent's duelist in the shoulder view at 1280 × 800 is 71% seen, partly under their plate (and the personal Doom duelist is scaled to the look's height, so D100's numbers hold for it) | D100's 70% | **accept** — unchanged, and with F3 fixed the band is the column again |
| A7 | At 1280 px the inert inspect chip's reason is cut (*no card u…*) | — | **accept** — its tooltip holds the whole reason, and the credit keeps its room |
| A8 | Below 1280 px (1024 × 700) the strips still take two rows | the caption's follow-up 5 (below 1280 nothing that reads fits) | **accept** |
| A9 | `human-sideboard-7` has no seat-1 picture | — | **accept** — a human-transport probe game; `RecordMatch` cannot replay it from the other chair |

Nothing on the list is illegible at 1× beyond what the lanes already measured (the
strip's 16-px icons against the owner's 14; the chrome's 11-px mono), and nothing
draws in the wrong order except A5, which is the design.

## §4 F1, F2, F4 — one strip row from 1280 px

The strips' row is `.arena__strips`' content box less the 15rem kept for the
opponent's plate: 1,020.8 px at 1280, 1,340.8 at 1600. Measured in headless
Chromium (`measure-strips.mjs`, `rowcheck.mjs`: the strips' DOM rectangles, idle
and sampled every 60 ms over six frames played at half speed):

| | the cue strip | the switcher | the strips need | rows |
|---|---|---|---|---|
| before, 1280, idle | 789.7 | 230.1 | 1,026.2 of 1,020.8 | **two** (192 of 192 shots) |
| before, 1280, playing | 882.4 (*12 steps · 4155 ms*: +92.7) | 230.1 | 1,118.9 | **two** |
| after, 1280 (narrow form), idle **and** playing | 750.7 | 230.1 | **987.2** of 1,020.8 | one — 0 of 48 samples wrapped |
| after, 1399 (narrow) | 750.7 | 230.1 | 987.2 of 1,139.8 | one |
| after, 1400 (wide form) | 886.3 | 230.1 | 1,122.8 of 1,140.8 | one |
| after, 1839 (keys) | 886.3 | 230.1 | 1,122.8 of 1,579.8 | one |
| after, 1840 (labels) | 886.3 | 672.0 | **1,564.7** of 1,580.8 | one |
| after, 1900 | 886.3 | 672.0 | 1,564.7 of 1,640.8 | one |

What changed (D265; the rebase's three choices, measured, and the one that was
enough): **a fixed-width status** — a box of 21 characters (`99+ steps · 99999+ ms`
fits it; `cueStatusOf` clamps there) — so the strip is as wide playing as idle;
**a smaller gap** (0.35rem → 0.25rem, 16 px over ten gaps — alone it made 1280
idle fit, 1,010 px, and nothing else); and **below 1400 px the narrow form**: the
word *speed* folds into the select's tooltip (the select shows its own `1×`) and
the status is the seconds of film left, *4.2 s*, in 6 characters. Shorter
checkbox labels were measured and not needed (D256 had rejected "CC" for a
learner). The labelled switcher now needs 1,565 px, which a 1,824-px viewport
gives: **the breakpoint is 1840** (1900 before), 16 px in hand.

## §5 F3 — the chrome column back under `HUD_TOP_PX`

| context | size | before | after |
|---|---|---|---|
| a replay (the watching line) | 1600 × 1000 | 117 px (the chip's own row) | **92** |
| a replay | 1280 × 800 | 150 (two strip rows too) | **92** |
| a live seat, the prompt wrapped (*Priority: Human Turn: 1 (Human) Phase: Main phase, precombat Stack: Empty*) | 1600 × 1000 and 1280 × 800 | **137** | **113** |
| a replayed human seat (`human-sideboard-7`@1195) | 1280 × 800 | 171; the chip on the turn-order bar's head | **113** |

The chip sits beside the credit on one row (`.arena__creditrow`), giving way
before the credit does. `arena/hud.ts` models the column from its measured rows
(6.4 + 46 + 4.8 + 29 + 4.8 + 21 = **112 px**, the Chromium reading 113 after its
rounding), and `hud.test.ts` holds it under 128 with the four-row column (137) as
the control. Over all 384 after-shots: one strip row everywhere, the column at
most 113 px, the opponent's plate at most 126 px, the caption clear of both
plates and the turn-order bar, the turn-order bar clear of the column.

What the column hid is measurable (§8): against the band's 128 px the opponent's
duelist in the shoulder view at 1280 × 800 is 71% seen (D100 asserts 70%); against
the live column's 137 it was **64%**, and against a band raised to 140 it would be
61% — which is why the band stayed and the column gave the row back.

## §6 F5 — the figure budget, your seat first

`layout()` places the seats in the wire's player order, and `figurePose` spent
`MAX_FIGURES` in placement order: seen from seat 1, the villains' twelve took
every model (`beforeafter/5-own-figures-seat1.png`: Masters of Evil @438 from
Pacho's chair — before, your seven creatures are discs with strips floating over
them; after, they stand, and the villains' surplus are discs). `budgetOrderOf`
now spends it your seat, the other seat, the stack (D266), and the personal
lookup follows it. `figure-pose.test.ts` sees the committed corpus from its other
chair — the same boards, the viewer swapped — over **5,520** board frames: the
budget binds on **602**; in placement order the viewer's own creatures would have
gone without on **599** (doom 95, hulk family 99, Masters of Evil 211, Wakanda
194; first at `villain-doom-248@305`); with the budget order on none. Reverting
the order fails it there. From player 0 the order is the placement order, which
the test also asserts, so no corpus count moved.

## §7 F7 — the caption in every view, re-measured

Over the 23 logs and the synthetic ones (5,522 board frames), `caption.test.ts`
now prints every view at every canvas, every run (a tenth of a thing's box under
the strip counts):

| view | 1600 × 944 | 1280 × 660 | where it bites |
|---|---|---|---|
| table | nothing (held since D256) | nothing | 1024 px: the land rank's right end (follow-up 5) |
| shoulder (seat-safe) | 2,905 frames: 1,757 hand cards, 1,404 battlefield | 833 frames, battlefield 890 | your hand's right end |
| low (seat-safe) | **nothing** (now held) | **531 frames: the stack** (582 items) | the stack, at every canvas 1024–1440 px |
| their shoulder | 706 frames: 573 piles, 431 battlefield | 2,228 frames: 6,828 piles | the opponent's piles |
| side-on | 3,485 frames: 8,956 battlefield | 5,517 frames: 12,726 hand, 25,904 battlefield | the battle lines |

D256 counted 2,208 shoulder frames, 2,343 side-on and 498 of their shoulder over
the 20 logs of its day; the three villain logs added the rest. Held now: the low
view covers nothing from 1600 px, and no seat-safe view covers a pile. The place
per view is the caption's follow-up 2, and owner question 35.

## §8 The other measurements

**The far strips under the chrome** (a scratch census: every board frame at the
table view, each strip's pixel box from `statusLayout` and `stripBounds` projected
through the view's camera, against the chrome's rectangles as Chromium drew them):

| | strips | before, 1600 × 946 | before, 1280 × 746 | after, 1600 × 946 | after, 1280 × 746 |
|---|---|---|---|---|---|
| the committed corpus (seat 0) | 26,842 in 5,520 frames | 40 (0.15%, the cue strip) | **1,971 (7.34%)** in 1,462 frames — the chip 1,404, the credit 527 | 40 (0.15%) | **135 (0.50%)** in 62 frames |
| the seat-1 recordings | 17,620 in 2,220 frames | 429 (2.43%) | **3,795 (21.5%)** in 1,465 frames | 377 (2.14%) | **1,144 (6.49%)** in 457 frames |

Both columns pose the tables with D266's budget order (the chrome is what they
compare; before D266 the seat-1 files read 2.07% and 22.8%, their far ranks
carrying more models). Every one is the far seat's; the rest after the fixes are
the wrapped back row's strips under the credit row (owner question 32).

**Your duelist under the turn-order bar** (`camera.ts`'s `visibleShareOnCanvas`
with the bar added as a corner rectangle, 10 px in, 168 px down the canvas,
100 × 233): at 1280 × 746 the low view 100% → **70%**, the shoulder view 100% →
**84%**; at 1600 × 946 100% in both; the table view 100% everywhere. The
opponent's duelist is untouched by the bar (owner question 34).

**A dressed figure's strip** (the personal models in Node, `indexPersonalModel`
and every resting variant): the resting top is 0.96–0.98 of the bind height for
Coulson (0.982), Doom (0.970), the Hulks (0.964; 0.977 at `highReady`) and Fury
(0.976), under the strip's anchor at the height plus `STATUS_LIFT`; in the browser
at `villain-hulk-family-261`@410 every figure's box top is 0.085–0.195 under its
anchor, the dressed Hulk 0.113. What reaches the strip is a fist in front of the
body, projected upward (A1).

**The personal duelists** are scaled to the duelist look's height
(`DuelistLayer`'s `pose.height`), so D100's measurements are theirs.

## §9 Tests, build, gate, and the user's Forge

- `npm --prefix web test` standalone: **1,191 `node --test` (1,182 pass, 0 fail,
  9 skipped) + 157 vitest (9 files)**, from 1,184 + 157: `hud.test.ts`'s four,
  `figure-pose.test.ts`'s viewer-first budget, `caption.test.ts`'s every-view
  census and liveness's `hud.ts` clause.
- `node tools/build-workshop-catalog.ts --check`: current. `./bridge/build.sh`: OK.
- `npm --prefix web run build`, gzip: the 2D entry `index-*.js` 94.68 kB
  (unchanged), `Arena-*.js` 18.81 kB (18.61), `arena-scene-*.js` 393.45 kB, the
  stylesheet 19.72 kB.
- **The gate**: twice from a deleted `bridge/out` at `GATE_JOBS=4`, both
  **`check-all OK`**, 48 jobs, the lane adding no step and no job:

  | run | `WSPORT` | wall | jobs' seconds summed | load average (1 min) | log |
  |---|---|---|---|---|---|
  | 1 | 9340 | **269.2 s** | 994.6 s | 3.66 at the start, 13.11 at most, 11.82 at the end | `var/check-all-audit-1.log`, `var/check-all/20260929-102723-287446/` |
  | 2 | 9350 | **277.6 s** | 1,029.2 s | 9.62 at the start, 17.86 at most, 16.56 at the end | `var/check-all-audit-2.log`, `var/check-all/20260929-103213-367396/` |

  Inside the gate the web step read **1,206 `node --test` (1,195 pass, 0 fail, 11
  skipped) and 157 vitest in 9 files** both times. The documents' gate lines and
  this section were written after the runs; no code, test or CLAUDE.md changed
  after them.
- **The user's Forge install**: `/home/justin-a/forge`'s jar (sha256
  `3c0a7c385b9207e593fe149255e00d1cd7e556809f138568d07e3828b78e5dd9`), every path,
  size and mtime under `/home/justin-a/forge`, and the sha1 of every file of
  `/home/justin-a/.forge` (7 files) were fingerprinted before the worktree was
  made and after the second gate run: **unchanged**.
- **The commit's attribution line** is the session's (`Claude Opus 5.5`), not the
  brief's (`Claude Fable 5.1`), as villain identity's was: the brief is a
  workflow's text, and the session's attribution rule governs. A merge may amend it
  if the owner wants the brief's.
