# The play-distance audit — the merged block, seen together (2026-09-29, D265–D267)

Branch `play-distance-audit`, worktree `mtg-table-t2a`, off `main`'s `e2c337c`.
Eight lanes merged onto the arena over 2026-09-28/29, each verified alone: the
status layer (D210–D212), the caption (D255–D256), the sound cues (D250–D252),
villain identity and its second lane (D220–D222, D230–D233), the arena polish
(D240–D241) and the personal tier's models (D190–D198). This is the first look at
the whole: pictures of every recording that matters from every view that matters,
a defect list graded **fix** (cheap, mechanical, inside the invariants), **owner**
(taste — PLAN.md's owner questions 34–41, each with its picture) or **accept**
(with the reason), and the fixes. A skeptical verifier then re-ran the fixes and
found what the list had missed; **§10 is the fix pass** that answered it (D267,
four more fixes, a test for D266's second half, two owner questions and two
accepts added, owner question 37's pictures replaced). A second verifier found
two majors and four minors more; **§11 is fix pass 2**, on the tree rebased onto
`main`'s `8ddd286` (the portrait standee and the GPU pass), with the near
duelist the caller asked about (owner question 41). *(At that rebase the lane's
owner questions were renumbered after `main`'s 32 and 33 — the standee's and the
GPU pass's — from 32–38 to 34–40, and the defect list's O-rows with them.)* A
third verifier found one major and two minors; **§12 is fix pass 3** — the
director's shot out of the switcher's width, the credit's own cap dropped, the
notice's tooltip tested — and the browser sweep of every key that can change the
chrome, which no pass had run.

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
| **the fix pass (§10)**: its before/after pairs, owner question 37's caption on/off pictures, the two new accepts | `var/audit/fix/*.png` (raw shots and their DOM rectangles in `var/audit/fix/raw-{before,after}/`) |
| **contact sheets, after the fix pass** — the same 384 shots again | `var/audit/sheets-fix/<recording>-<size>.jpg` (12), the shots in `var/audit/shots-fix/` |
| **fix pass 2 (§11)**: the decision bar at the Quake frame with `I` pressed, before and after, both sizes | `var/audit-fix3/crops/major1-quake-i-{1280,1600}-before-after.png` (the shots: `var/audit-fix3/shots/major1-{before,after}-<size>.png`) |
| fix pass 2: the credit at `human-sideboard-7`@1195, 1280 × 800, before and after; the chip at its floor | `var/audit-fix3/crops/credit-sideboard-1195-1280-before-after.png`, `…/chip-floor-quake-1280-before-after.png` |
| fix pass 2: the near duelist (your Nick Fury model) — table view crops at 3×, both seats, and the verdict | `var/audit-fix3/fury/fury-verdict.png`; `var/audit-fix3/fury/<file>-<frame>-s<seat>-v1{,-crop3x}.png` |
| **contact sheets on the rebased tree, after fix pass 2** — the 384 shots again, the personal tier's standees drawn with the tier on | `var/audit/sheets-fix3/<recording>-<size>.jpg` (12), the shots in `var/audit/shots-fix3/` |
| **fix pass 3 (§12)**: the director on at 1280, 1400, 1840 and 1920 px (`6` then `I`), before and after; the two-line prompt with the director on; the credit at 1600 × 1000 before and after its cap went | `var/audit-fix4/crops/f17-director-i-masters209-{1280x800,1400x900,1840x1000}-before-after.png`, `…/f17-director-oppshoulder-masters209-1920x1080-before-after.png`, `…/f17-director-i-quake1060-1280x800-before-after.png`, `…/f18-credit-masters209-1600x1000-before-after.png` |
| fix pass 3: every page of the key sweep (`6`, `6` then `I`), before and after; the live seat with every key pressed | `var/audit-fix4/sweep-{before,after}/`, `var/audit-fix4/live/live-keys-<size>.png`; the measurements `var/audit-fix4/sweep-{before,after}-{a,b,c}.jsonl`, `var/audit-fix4/live.jsonl` |
| fix pass 3: the 96 matrix shots whose credit changed (1600 × 1000, the Doom Legion, the Masters of Evil, Wakanda, both seats), again | `var/audit-fix4/shots/`, sheets `var/audit-fix4/sheets/<recording>-1600x1000.jpg` (3) |
| the drivers (scratch) | `var/audit/drv/`, `var/fix/drv/`, `var/audit-fix3/drv/`, `var/audit-fix4/drv/` |

## §3 The defect list

| # | what, where | the rule it meets | grade |
|---|---|---|---|
| F1 | **At 1280 × 800 the cue strip and the camera switcher take two rows**, idle (192 of 192 shots) and while cues play; the switcher's row pushes the credit and the inspect chip down over the far rank's creatures (`beforeafter/1-strips-1280-idle.png`) | the caption's follow-up 3; D256 point 4's one row | **fix** (§4) |
| F2 | **The status grows ~92 px when a batch starts** (*idle* → *12 steps · 4155 ms*), so the switcher jumps rows mid-play at the widths where the idle strip just fits (1280; 1800 with labels, D256's amendment) | D256 point 4 | **fix** (§4) |
| F3 | **The chrome column is past `HUD_TOP_PX`**: at a live seat whose prompt wraps (the ordinary priority prompt does, at the prompt's 46ch) the column is **137 px** at both sizes against the band's 128 — D241's inspect chip took a fourth row. On a replayed human seat at 1280 × 800 it is **171 px**, and the chip sits on the turn-order bar's head (`beforeafter/3-…`, `4-…`) | D85 (the chrome IS the band), D100 (the opponent's duelist ≥ 70% at 1280 × 800: 64% against a 137-px column) | **fix** (§5, D265) — and F8: the wrapped priority prompt was not the worst case |
| F4 | **The 1900 px breakpoint** was set against a strip whose status grew; re-measured with the fixed status | D256's amendment | **fix** (§4): 1840 |
| F5 | **From seat 1 your own creatures are discs**: the model budget (12) was spent in the wire's player order, so the villains took every model and the viewer's creatures stood as discs under floating strips (`beforeafter/5-own-figures-seat1.png`) | "differs between the seats without a reason"; M47 (one seat's eyes) | **fix** (§6, D266) |
| F6 | README says the switcher collapses below 1,400 px (1,900 since the caption's rebase) | — | **fix** (a doc) |
| F7 | **The caption's per-view figures** were not re-measured when the corpus grew to 23 logs | D256's amendment says so | **fix** (§7): re-measured, printed every run, two claims held |
| O34 | **The far seat's status strips under the chrome**: the far rank's wrapped back row puts its strips (~30 px above the heads, the status layer's follow-up 5) under the credit row — after the fixes 0.5% of the corpus's strips at 1280 × 746 and 6.5% of the villain decks' seen from Pacho's chair (§8) (`after/villain-doom-248/1280x800/s1-p1-f390-v1.png`) | none (the strip is a HUD); D100 says the far end is under the chrome | **owner** (question 34) |
| O35 | **A strip over a disc floats** at the height its figure's head would have: a body-less creature (every probe beast; the Wakandan Tusker) or one past the budget (`shots-after/human-sideboard-7/1600x1000/s0-p1-f1224-v1.png`) | D212's "above the head" has no head to be above | **owner** (question 35) |
| O36 | **Your duelist under the turn-order bar** at 1280 × 800: 30% of it in the low view and 16% in the shoulder view (0 at 1600; none from the table view) — D210's bar came after D100's stand, and `camera.ts`'s chrome knows the band and the plates but not the bar (§8) (`after/villain-doom-248/1280x800/s0-p1-f356-v5.png`) | D100 prints your duelist's share, asserts only the hand and ranks | **owner** (question 36) |
| O37 | **The caption in the shoulder view covers the right end of your hand** (seat-safe; 20–32% of the rightmost card wherever a caption is up — `fix/q35-shoulder-hulk-77-1600.png`, on then off); in the low view the census's 531 frames are **near misses as drawn** — the stack's top card stands just above the caption (`fix/q35-low-doom-350-1280.png`, `fix/q35-low-masters-109-1280.png`). *(Corrected on the fix pass, §10.4: the audit cited `after/villain-doom-248/1280x800/s0-p1-f356-v5.png` and `…-v2.png`, where nothing of the stack or the hand is under the caption.)* | the caption's follow-up 2 | **owner** (question 37) |
| O38 | **The villain-seat recordings stand your own Fury model behind the Doom Legion** (and Doom behind Pacho's deck) — duelists are the seat's (D99), and with the personal tier on the director is the user's model (`shots-after/villain-doom-248/1600x1000/s0-p1-f388-v1.png` against `…/s1-p1-f390-v1.png`) | villain identity's follow-up 12 | **owner** (question 38) |
| A1 | Raised hands reach the strip; the personal Hulk (1.21 tall, a fist raised in front of him) is the new worst case, the bar across his fist at `villain-hulk-family-261`@410 (`crops/hulk-strips-pp.png`, the CC0 figure under it) | the status layer's follow-up 6 (the test holds heads, not hands) | **accept** — the dressed models' resting tops are 0.96–0.98 of their height (§8), so a dressed head clears its strip; the follow-up carries the picture |
| A2 | The game-over banner covers the carrier and the centre of the table in every view (`g1`@376) | — | **accept** — the banner is the outcome, and the game is over |
| A3 | From views 3 and 4 your carrier (over your rank at `SILHOUETTE_ALTITUDE`) is at the top of the frame, under the chrome (`quads/g1-1280x800-s0-p1-f316.jpg`) | D85 holds the table view only | **accept** — spectator-only views; D85 rejected a carrier that depends on the view |
| A4 | The caption hides on the last quiet frames (`g1` @374–376 are a re-sent state and `over`), so the winning blow's caption is gone as the banner comes up | the caption's follow-up 1 (a hold) | **accept** — the banner says who won; a hold is follow-up 1's owner question |
| A5 | A far strip draws over a near figure in views 2–4 | D212: `depthTest` off, on purpose | **accept** — a HUD |
| A6 | The opponent's duelist in the shoulder view at 1280 × 800 is 71% seen, partly under their plate (and the personal Doom duelist is scaled to the look's height, so D100's numbers hold for it) | D100's 70% | **accept** — unchanged, and with F3 fixed the band is the column again |
| A7 | At 1280 px the inert inspect chip's reason is cut (*no card u…*) | — | **accept** — its tooltip holds the whole reason, and the credit keeps its room |
| A8 | Below 1280 px (1024 × 700) the strips still take two rows | the caption's follow-up 5 (below 1280 nothing that reads fits) | **accept** |
| A9 | `human-sideboard-7` has no seat-1 picture | — | **accept** — a human-transport probe game; `RecordMatch` cannot replay it from the other chair |
| **F8** | *(the fix pass)* **A long engine prompt grows the column past the band.** The bar wrapped the prompt at 46ch whatever its length: 17 of the corpus's 350 distinct prompts took the column past 128 px at both sizes — Quake's 250-character targeting trigger to **167.1 px**, with the credit row and the chip over the far rank the prompt asks you to target; a spell's payment prompt (143 characters) to 130.7 (`fix/fix-quake-1280.png`, `fix/fix-rampant-1280.png`) | D265's own claim (112 px "at its worst ordinary case") | **fix** (§10.1, **D267**) |
| **F9** | *(the fix pass)* **The cue status reads as the caption checkbox's label** — "caption idle", "caption 2.0 s" — at every width: the fixed-width box sits right after the checkbox with a 0.25rem gap (`fix/fix-strips-1280.png`) | — | **fix** (§10.2): a rule before it, the widths re-measured |
| **F10** | *(the fix pass)* **The credit shrinks with the chip.** D265 said the chip gives way first; with `flex-shrink` 4 against 1, weighted by width, both did — at 1280 px the credit cut to 586 px ("© Wiza…") while the chip kept 429 of its 560 (`fix/fix-sideboard-1280.png`) | D265 point 2 | **fix** (§10.2) |
| **F11** | *(the fix pass)* **The turn-order bar's head reads "R12 their tu…"** on every opponent's turn from round 10, at both sizes (`fix/fix-turnhead.png`) | — | **fix** (§10.2): the head at 10 px |
| **F12** | *(the fix pass)* **D266's personal half had no test**: reverting `personalChoicesOf` to placement order left every test green | D266 | **fix** (§10.3) |
| **O39** | *(the fix pass)* **At 1280 × 800 the three longest targeting prompts are cut before their question** ("…Select target creature or land") — whole in the tooltip and on hover, and whole at 1600 (`fix/fix-quake-1280.png`) | D267's clamp | **owner** (question 39) |
| **O40** | *(the fix pass)* **The same moment numbered twice**: the turn-order bar says the round (`R18 your turn`, D210 — `protocol.md` §3.1: `round = ceil(turn / 2)`), the caption the player turn (`Turn 35`, the narrator's) — two lanes' widgets side by side on screen (`shots-fix/villain-wakanda-232/1600x1000/s0-p1-f525-v1.png`) | — | **owner** (question 40) |
| **A10** | *(the fix pass)* In the side-on view (4) at 1280 × 800 the turn-order bar covers the left seat's rank, a status strip and part of a figure (`fix/a10-sideon-doom-s1-390-1280.png`) | — | **accept** — a spectator view (A3's reason); the bar is the seat's control and stays at the left edge |
| **A11** | *(the fix pass)* At game over from seat 1 (`g1`@375, 1280 × 800, the table view) the winning duelist's raised arm reaches under the credit row's right end (`fix/a11-gameover-g1-s1-375-1280.png`) | D100 | **accept** — a duelist is decoration, the gesture is the outcome's, and the game is over |
| **F13** | *(fix pass 2)* **A hint and a notice wrap the decision bar.** The bar wrapped its items and the prompt's zero basis let them squeeze it: at `human-ability-42`@1060 (Quake's targeting prompt, two lines), `I` pressed with no card under the pointer put the hint — *no card under the pointer and none clicked — …*, which is where D241's `I` reports that it did nothing — and the *Your turn* notice on a second line: the bar 70.5 px, the column **136.7 px** at 1280 × 800 and 1600 × 1000, the credit row over the far rank (`var/audit-fix3/crops/major1-quake-i-{1280,1600}-before-after.png`). Nobody had pressed a key before shooting | D267's own claim; D85 | **fix** (§11.2, D267 amended) |
| **F14** | *(fix pass 2)* **F10 was not fixed**: `flex-shrink` 1 against the chip's 1,000 still took 0.3 px off the credit, and its ellipsis cut the Fan Content Policy's words — "…Unofficial Fan Conte…" at `human-sideboard-7`@1195, 1280 × 800, where `e2c337c` drew it whole (`var/audit-fix3/crops/credit-sideboard-1195-1280-before-after.png`) | D265 point 2; §10.2's "648 of 648" was wrong | **fix** (§11.3, D265 amended) |
| **F15** | *(fix pass 2)* **The inspect chip's floor cut its own key**: 13ch on a border-box is 69.7 px of content for an 86.1-px "⌕ inspect · I", so at the floor — every replay at 1280 — it read "⌕ inspect…" (`var/audit-fix3/crops/chip-floor-quake-1280-before-after.png`) | D241 (the key is how `I` is discovered) | **fix** (§11.3) |
| **F16** | *(fix pass 2)* Two stale comments: `styles.css` said the prompt "starts at 46ch and GROWS" (the rule was `flex: 1 1 0`) and credited the clamp to D265 (it is D267), as did `DecisionLayer.tsx`'s | — | **fix** (§11.4) |
| **O41** | *(fix pass 2, the caller's item)* **Your duelist reads as lying on the table** in the table view with the personal tier on: your Nick Fury model (a Mixamo rig) seen from above, legs out, while Doom stands upright across the table (`villain-masters-of-evil-33`@209 and @371 and `g1`@316, both seats). It stands: its bones and its skinned feet are on the ground, in the shared idle's wide stance, which the CC0 director's long coat hides and Fury's open coat and pale boots show; the near duelist is right under the lens (`var/audit-fix3/fury/fury-verdict.png`, §11.5) | D100 (the camera never moves for a duelist) | **owner** (question 41) — neither the code nor the model is wrong; a rest pose that reads as standing from above is a look |
| **A12** | *(fix pass 2)* At 1280 × 800 a table credit longer than the room beside the chip's floor loses the end of its artist list — 55 px of "…Elizabeth Peiró +7 more" at `human-ability-42`@1060 (`var/audit-fix3/crops/chip-floor-quake-1280-before-after.png`) | D265 point 2 as amended | **accept** — the whole list is the credit's tooltip; Scryfall's name and the notice are whole. *(Fix pass 3, F18: past 1280 px the credit's own 980-px cap cut it too, beside a chip well above its floor; with the cap gone a credit is cut only where the chip is at its floor — the Masters of Evil's 1,070-px credit below 1500 px.)* |
| **F17** | *(fix pass 3)* **The director's shot widened the switcher.** With the auto director on (`6`, in a replay or spectating) the director's button drew its shot as text — " · Table" to " · Opp. shoulder" — the switcher 230.1 → 283.1–336.0 px (725–778 labelled), wrapped under the cue strip at 1280, 1400, 1840 and (the longest shot) 1920 px: the column **126.1 px**, 143.9 with `I`, **146.3** beside a two-line prompt, the credit row over the far rank. `CUE_STRIP.px.switcher` was measured with the director off, the one-row check never had the shot, and the 384 shots used the default camera (`var/audit-fix4/crops/f17-*.png`) | D265 point 1 (112 px at its worst) and point 5 | **fix** (§12.1, D265 amended): the shot a dashed mark on its view's button and a name in the director's tooltip |
| **F18** | *(fix pass 3)* **The credit's own cap cut it while the chip could give way**: M7's `max-inline-size: 980px` drew `villain-masters-of-evil-33`@209's 1,070.4-px credit at 980 from 1366 px up — its artist list cut by 90 px beside a chip of 120–560 px (354 at 1600 × 1000) (`var/audit-fix4/crops/f18-credit-masters209-1600x1000-before-after.png`) | D265 point 2 as amended ("never shrinks while the chip can") | **fix** (§12.3, D265 amended): the cap dropped |
| **F19** | *(fix pass 3)* **The notice's tooltip had no test**: D267's amendment says the notice is whole in its tooltip, and `hud.test.ts` matched `title={` alone — `title={notice.title}` (the engine's text gone) stayed green | D267 point 4 | **fix** (§12.4) |

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
| *the fix pass (§10.1)*: the live seat again | 1600 × 1000 and 1280 × 800 | 113 | **95** (the prompt on one line) |
| *the fix pass*: the corpus's worst prompt (Quake's targeting trigger, `human-ability-42`@1059) | both | **167.1** — after the audit's fixes too | **112.5** (two lines) |

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
the test also asserts, so no corpus count moved. *(The personal lookup's half had
no test until the fix pass — §10.3.)*

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
the 20 logs of its day; the three villain logs added the rest. **These counts are
the census's, not the picture's** (the fix pass, §10.4): a thing counts when a
tenth of its projected quad is under the strip's CAP — the 13rem box, whatever
the caption holds — so they bound what is drawn from above. Drawn, the shoulder
view's hand card is really under the caption whenever one is up; the low view's
stack is not — its top card stands just above the caption in the census's worst
frames. Held now: the low
view covers nothing from 1600 px, and no seat-safe view covers a pile. The place
per view is the caption's follow-up 2, and owner question 37.

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
the wrapped back row's strips under the credit row (owner question 34).

**Your duelist under the turn-order bar** (`camera.ts`'s `visibleShareOnCanvas`
with the bar added as a corner rectangle, 10 px in, 168 px down the canvas,
100 × 233): at 1280 × 746 the low view 100% → **70%**, the shoulder view 100% →
**84%**; at 1600 × 946 100% in both; the table view 100% everywhere. The
opponent's duelist is untouched by the bar (owner question 36).

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

## §10 The fix pass — what the verifier found, and what was done (D267)

A skeptical verifier re-ran every fix above in a copy of the tree, with its own
pictures and negative controls, and found two major gaps and six minor ones. Each
is answered here; the grades are in §3 (F8–F12, O39, O40, A10, A11, O37
corrected). The pictures are in `var/audit/fix/` (a before/after pair per fix, on
`89937a6`'s stylesheet and bar against this tree's, same frames, same driver), and
the 384 shots of §1 were taken again on this tree (`var/audit/shots-fix/`, sheets
in `var/audit/sheets-fix/`): one strip row in all 384, the column at most 95 px in
every replay, the opponent's plate at most 126 px.

### §10.1 F8 — no engine prompt grows the column past the band (D267)

D265 held the column at "112 px at its worst ordinary case, a live seat whose
prompt wraps" and modelled the bar at two lines. The engine's prompt is any
length: Forge writes the context first and the question last (a trigger's
targeting prompt quotes the card's whole ability, then "Select target creature or
land"), and the bar wrapped all of it at 46ch. Every distinct prompt of the
committed corpus (350), each on the frame it first appears, measured in headless
Chromium at both sizes (`var/fix/drv/prompts-sweep.mjs`, scratch):

| | the column over the canvas | past `HUD_TOP_PX` (128) | the bar | cut by the clamp |
|---|---|---|---|---|
| before (`89937a6`), 1280 × 800 and 1600 × 1000 | 94.4–**167.1** px | **17** of 350 (130.7 ×13, 148.9, 167.1 ×3) | 28.2–100.9 px | — |
| a 46ch basis that grows (tried, rejected) | 94.7–118.5 | 0 | 27 short prompts pushed their buttons onto a second line (28 → 52 px) | 3 at 1280 |
| **after (D267), 1280 × 800** | 94.4–**112.5** | **0** | 28.2–46.4 | **3** (Quake ×2, Web Up: 224–250 characters) |
| **after (D267), 1600 × 1000** | 94.4–**112.5** | **0** | 28.2–46.4 | **0** |

Per prompt: **322 are shorter** after (one line where two: the column 112.5 → 94.7)
and **none taller**. A spell's payment prompt ("Rampant Growth (5) - Search your
library … then shuffle. Pay Mana Cost: {1}{G}", 143 characters) is whole in two
lines from 1280 px — at the old 46ch a two-line clamp would have cut its question,
which is why the prompt grows as well as clamps: every prompt over 100 characters
measured 605–671 px wide at 1280 (342 before). At 1024 × 700 Quake's is 415 px
wide, two lines, the bar on one line. The live seat's priority prompt is one line
now: the column **95 px** at both sizes (113 after the audit, 137 before it;
`var/audit/fix/live/live-fix-*.png`). The pairs: `fix/fix-quake-1280.png` (167.1 →
112.5, and the credit row back off the rank the prompt targets),
`fix/fix-quake-1600.png` (whole in two lines), `fix/fix-rampant-1280.png` (130.7 →
112.5, whole). Pointing at the cut prompt opens it in place — 36.4 → 54.6 px, all
250 characters in three lines — and it closes when the pointer leaves
(`fix/raw-after/quake-1280-hover.png`); its `title` and its text node are the
whole 250 characters.

`hud.test.ts` holds it: the stylesheet (the clamp at `HUD_PROMPT.lines`, the zero
basis, no width cap, the hover, the tooltip and the verbatim text node in
`DecisionLayer.tsx`), and every distinct prompt of the corpus through a per-line
model (46 characters a line, a floor): unclamped, 29 would take the column past the
band and the longest (Quake's, 250 characters) to 185.2 px — the red case; clamped,
none. Its negative controls, run by hand: the old `max-inline-size: 46ch` prompt
fails it, and so does the rejected 46ch basis.

### §10.2 F9, F10, F11 — the status, the credit, the turn-order head

- **F9, the status behind a rule**: a 1-px `border-inline-start` and 0.3rem before
  the status, so it no longer reads as the caption checkbox's label
  (`fix/fix-strips-1280.png`, `fix/fix-strips-1600.png`: "caption idle" →
  "caption │ idle"). It adds 5.8 px to each form; the row, re-measured
  (`var/fix/drv/rowcheck.mjs`, idle and 48 samples of a batch playing at each
  width, 0 wrapped anywhere):

  | width | the strips need | of the row | form |
  |---|---|---|---|
  | 1280, 1366, 1399 | **993.0** (987.2 before the rule) | 1,020.8 / 1,106.8 / 1,139.8 | narrow, keys |
  | 1400, 1600, 1820, 1839 | **1,128.6** (1,122.8) | 1,140.8 / 1,340.8 / 1,560.8 / 1,579.8 | wide, keys |
  | 1840, 1900 | **1,570.5** (1,564.7) | 1,580.8 / 1,640.8 | wide, labels |

  `CUE_STRIP.px` is 892.1 (wide) and 756.5 (narrow); the 1840 breakpoint holds
  with 10 px in hand, so it stays.
- **F10, the credit before the chip**: `flex-shrink` 1,000 against the credit's 1
  (the seat plate's deck name already works this way). At `human-sideboard-7`@1195,
  1280 × 800: the credit **585.7 → 648 px, its whole width**; the chip 428.7 →
  366.5 (`fix/fix-sideboard-1280.png`). On a replay's frame with a long credit
  (1,029 px of text) the chip is at its floor, 86.1 px = its 13ch label, and the
  credit takes the rest (928.3). `hud.test.ts` holds the ratio and the floor; `0 4
  auto` fails it. *(Corrected by fix pass 2, §11.3: the "648 px" was the rounded
  box of a 648.3-px credit drawn at 648.0 — a shrink weighted by width still
  took 0.3 px, and the ellipsis cut "…Unofficial Fan Conte…"; and the 86.1-px
  floor held "⌕ inspect…", not its label. The ratio could not be fixed by a
  bigger number.)*
- **F11, the turn-order head at 10 px**: "R12 their turn" is 14 characters of a
  monospace face, 88.5 px at the bar's 10.5 against 88 px of content; at 10 px it
  is 84.3 (`fix/fix-turnhead.png`, `villain-doom-248` from seat 1 @390).
  `hud.test.ts` (`TURN_BAR`) holds "R99 their turn" inside the bar, with the bar's
  own 10.5 px as the control.

### §10.3 F12 — D266's personal half, tested

The verifier reverted `personalChoicesOf`'s loop to placement order and every test
stayed green. `personal.test.ts` now sees the committed corpus from its other
chair (the viewer swapped, as `figure-pose.test.ts` does) with an overlay that
dresses every name at the per-model cap, so the count cap and the triangle line
both bind at four figures: over **5,520** board frames the budget binds on
**1,776**; in placement order the viewer's creatures would have gone without while
the other seat's were dressed on **1,741** (from `g1.jsonl@268`); in the budget
order on none. Reverting the lookup's order fails it at `g1.jsonl@268` ("2 of the
viewer's creatures go without a personal model while 3 of the other seat's wear
one"); restored, green.

### §10.4 O37 corrected — and what the census counts

The audit cited `villain-doom-248`@356 for the caption over the stack (the low
view) and over your hand (the shoulder view); the verifier shot both with the
caption toggled and nothing was under it. `caption.test.ts`'s census counts a
thing under the strip when a tenth of its projected quad's box is under the
strip's CAP (the 13rem box, whatever the caption holds), so its counts bound what
is drawn from above. Measured as drawn (`var/fix/drv/q35.mjs`, `q35b.mjs`:
the census's candidate frames replayed, the caption's DOM rectangle against the
cards' projected boxes, then the pictures with the caption on and off):

- **the shoulder view (1600 × 1000)**: of 586 candidate frames sampled, the caption
  was up on 162 and covered a tenth or more of a hand card on 50 (a fifth or more
  on 26) — the rightmost card, 20–32% of it. `fix/q35-shoulder-hulk-77-1600.png`
  (caption on, then off): your Gallant Citizen under it.
- **the low view (1280 × 800)**: of all 530 candidates the caption was up on 458,
  and the boxes put a stack card under it on 13 — but drawn, the stack's top card
  stands just above the caption's top in the worst of them
  (`fix/q35-low-doom-350-1280.png`, `fix/q35-low-masters-109-1280.png`, on then
  off: at `villain-doom-248`@350 the card's drawn bottom edge is 468–480 px down
  the page across its width, the caption's top 491 — 11 to 23 px clear). A near
  miss, not a cover: the box of a tilted quad and the caption's cap both
  overstate. The audit's
  follow-up 4 records it; owner question 37 is narrowed to the shoulder view.

### §10.5 O39, O40, A10, A11

Owner question 39 (the three prompts cut at 1280 px) and 40 (the bar's `R18`
beside the caption's `Turn 35`, `shots-fix/villain-wakanda-232/1600x1000/s0-p1-f525-v1.png`)
are in PLAN.md with their pictures; A10 and A11 are accepted in §3 with theirs.
The co-author line of the audit's commit (the verifier's last finding) is the
owner's to amend at a merge, if wanted (§9); the fix pass's commit carries the
session's, as the audit's did.

### §10.6 Tests, build, gate, and the user's Forge

- `npm --prefix web test` standalone: **1,194 `node --test` (1,185 pass, 0
  fail, 9 skipped) + 157 vitest (9 files)**, from 1,191 + 157: `hud.test.ts`'s two
  new cases (the prompt sweep, the turn-order head; the status rule and the credit
  order are clauses of its first two) and `personal.test.ts`'s viewer-first sweep.
- `node tools/build-workshop-catalog.ts --check`: current. `./bridge/build.sh`: OK.
  `npm --prefix web run build`: the 2D entry `index-*.js` 94.68 kB gzip (unchanged), `Arena-*.js` 18.82 kB (18.81), `arena-scene-*.js` 393.46 kB, the stylesheet 19.75 kB (19.72).
- **The gate** from a deleted `bridge/out` at `GATE_JOBS=4`, `WSPORT=9340`:
  **`check-all OK`**, **274.8 s** wall, 48 jobs whose seconds sum to 1,029.1 s, the load average 9.01 at the start, 13.13 at most, 10.56 at the end; inside it `node --test` **1,209 (1,198 pass, 0 fail, 11 skipped)** and 157 vitest in 9 files; the fix pass added no step and no job (run `var/check-all/20260929-115717-1129016/`). This section's gate and Forge lines, the histories' and PLAN.md's, and README's paragraph on the prompt were written after the run; no code, test or CLAUDE.md changed after it (no test reads README.md) (`var/check-all-audit-fix.log`).
- **The user's Forge install**: the `~/forge` jar's sha256, every path, size and
  mtime under `/home/justin-a/forge`, and the sha1 of every file of
  `/home/justin-a/.forge` were fingerprinted before the fix pass and after its
  gate (`var/fix/forge-{before,after}.txt`): **unchanged** (jar `3c0a7c38…8e5dd9`; the two files compare equal byte for byte).

## §11 Fix pass 2 — rebased onto `8ddd286`, and what a second verifier found (D265 point 2 and D267 amended)

A second verifier confirmed the lane's data untouched, its fifteen negative
controls red and its strips one row at nine widths, and left two majors and four
minors (F13–F16 in §3); the caller added one item, the near duelist (O41). This
pass rebased the lane first, then answered each, with a negative control per new
test clause, and took the pictures again on the rebased tree.

### §11.1 The rebase onto `main`'s `8ddd286`

`git rebase 8ddd286` put the portrait standee (D260–D264) and the GPU pass
(D270–D273) under the lane's two commits. Every conflict was in a document, and
both sides were kept, `main`'s first: the root `CLAUDE.md`'s `DECISIONS.md` row,
`DECISIONS.md` (the lane's D265–D267 after `main`'s D273), `PLAN.md` (the index,
its rows and questions, the milestone table, the sections — one stray `---`
`main` had left inside the GPU pass's follow-up list, between 11 and 12, came out
when the list was rejoined), `test-count-history.md`, both nested `CLAUDE.md`s
and the rules manifest. `Arena.tsx` merged with no conflict: the standee's
`CanvasSizeReport` and `canvas` prop, the GPU pass's `DprGovernor`, its lazy stats
panel and `<AdaptiveDpr />`'s removal sit beside the lane's credit row and cue
status. `main` numbers its owner questions 32 (the standee) and 33 (the GPU
pass), so the lane's became **34–40** (and its defect list's O-rows with them);
every reference moved. The Open-now index was recounted from its rows: `main`'s
344 items across 36 lists became 347 across 37, and 33 questions 40 (348 and 41
with this pass's follow-up 5 and question 41).
`docs/claude-md-rules.txt` was regenerated, and `claude-md.test.ts` passed with
every rule once. On the rebased tree `npm --prefix web test` read **1,222 `node
--test` (1,213 pass, 9 skipped) + 157 vitest**, `standee.test.ts`, `gpu-pass.test.ts`,
`hud.test.ts` and `personal.test.ts` (its other-chair sweep) among them — once
`web/dist` was rebuilt: the one built before the rebase carried its sources in its
maps, which the GPU pass's build grep refuses (the gate's build job rebuilds it).
`git merge-base --is-ancestor 8ddd286 HEAD` holds.

### §11.2 F13 — the decision bar is one line of items (D267 amended)

Measured in headless Chromium (`var/audit-fix3/drv/ibar.mjs`: the frame scrubbed
to, `K`, the pointer off every card, `I` pressed), before on the first fix pass's
stylesheet and bar, after on this tree:

| `human-ability-42`@1060, `I` pressed | 1280 × 800 | 1600 × 1000 |
|---|---|---|
| before | bar **70.5**, column **136.7**: the prompt 565 px on two lines, the hint (594 px) and *Your turn* on a second line | bar 70.5, column 136.7 |
| after | bar **46.4**, column **112.5**: the prompt 342 px (its floor, two lines), the outlined-cards line 132 (two lines, whole), the hint 194.1 (two lines: *no card under the pointer / and none clicked — hover o…*), *Your turn* 70.8 (one line) | bar 46.4, column 112.5: the hint 273.3 |

Watching (`villain-masters-of-evil-33`@209, `I` pressed): the bar 44 px, the column
110.1, the watching line at its floor (315.7 px, one line) and the hint whole in
two lines at both sizes.

What changed: `.arena__decision` does not wrap; the prompt keeps its zero basis
and gains a floor, `min(46ch, 100%)` (342 px); the engine's buttons and Concede
are `flex: none`; the outlined-cards line (down to 11em), the "not asked yet"
line, the hint (to nothing) and the notice (kept whole up to 16em) are two lines
at most, cut past them, whole in their tooltips (the hint gained one); the
watching line has the prompt's floor and clamp. So the bar is never taller than
two lines of prompt.

`hud.ts`'s `flexSizes` is the CSS flexible-lengths algorithm, pure, and
`decisionBarOf` lays the bar out with it from the widths Chromium measured
(`measure-bar.mjs`: the corpus's widest button labels, *Alpha Strike* 105.8 px
and *End Turn* 79.9; Concede 97.8, armed 161.8; the line heights; the mono
advance). It agrees with Chromium at the Quake frame — the hint 194.1 px at 1280
and 273.3 at 1600 — and `hud.test.ts` holds, at 1280 and 1600 px, the corpus's
longest prompt (250 characters), the longest hint the arena writes (136, of the 29
it scans from `keys.ts`, `inspect.ts` and `Arena.tsx`) and the longest notice title
the bridge names (20, of 35) at once: **the bar 46.4 px, the column 112.4**, the
prompt at its floor; the hint keeps 121 px at 1280 (about sixteen characters a
line) and 200 at 1600. With a 400-character hint and notice, the widest labels
and Concede armed, the height is the same; the hint then has no room at 1280 (51
px at 1600) and the items' floors are 28 px wider than the bar, so they run past
its right end into the 15rem kept for the opponent's plate, 78 px short of the
plate itself — the height does not move. The wrapping bar (70.5 px, the column
136.7) and a floorless prompt are the controls.

Not taken (D267's amendment): the hint and the notice positioned out of the flow
(the band has 16 px under the column, not a line, and below it is the far rank
the band keeps clear), on the strips row (28 px spare at 1280 × 800) or on the
credit row (full at 1280 whenever the credit is long). In the bar they stand
beside the control they answer.

### §11.3 F14, F15 — the credit drawn whole, its notice never cut, and the chip's key

| | the credit | the chip |
|---|---|---|
| `human-sideboard-7`@1195, 1280 × 800, the first fix pass | 648.0 px drawn for 648.3 of text: "…Unofficial Fan Conte…" | 366.5 |
| the same, after | **648.3 of 648.3, whole** | 366.1, its reason cut |
| `human-ability-42`@1060, 1280 × 800, after | 905.3 — its room beside the chip's floor; its artist list cut by 55 px, its notice (249.9 px) whole | **109.1, its floor: the key (86.1 px) whole** |
| the same at 1600 × 1000, after | 959.9, whole | 374.5 |

The credit is `flex: 0 0 auto` up to `min(980px, 100% − --inspect-floor − 0.4rem)`
*(fix pass 3 dropped the 980px — §12.3)*,
and `ArtCredit` draws two parts: `.arena__credit-lead` (Scryfall's name, the
artists — the part that gives way, whole in the tooltip) and
`.arena__credit-notice` (`flex: none`: "· © Wizards of the Coast · Unofficial
Fan Content", or "· © Wizards of the Coast" for a card). The chip is `flex: 0 1
auto` down to `--inspect-floor` — 14 characters of the mono face (0.6021em, what
Chromium measured for DejaVu Sans Mono here: "⌕ inspect · I" is 86.1 px at 11 px,
13 × 6.62) plus its padding and border, 109.1 px — and draws its key as a part
that never shrinks (`.arena__inspect-key`) beside the name or reason that does
(`.arena__inspect-what`). `hud.test.ts` holds it by the **rendered** width:
`creditRowOf` (the same `flexSizes`) agrees with Chromium at three layouts — the
two above and the audit's first cut, 1 against the chip's 4, drawn 585.7 and
428.7, the case where weighting the shrink by width shows (unweighted, the model
is 3.6 px off and the test is red) — and the credit is drawn whole beside the chip
for every credit that fits, at every width from 1280 to 1920 px, with the first
fix pass's shrink ratio as the control.

### §11.4 F16, and the co-author line

The stylesheet's prompt comment now says what the rule is (a zero basis, a 46ch
floor) and credits the clamp to D267, and so does `DecisionLayer.tsx`'s. The
verifier's fourth minor — the commits' co-author line — is left as it is, as the
caller asked; this pass's commit carries the session's attribution too.

### §11.5 O41 — your duelist from the table view

With the personal tier on, the director seat is your Nick Fury model (its
manifest's `{"seat":"director"}`), and from the table view it reads as lying on
the table, legs out, while Doom stands across it. Looked at in the table view on
both seats at `villain-masters-of-evil-33`@209 and @371 and `g1`@316 (the seat-1
recordings at the same indices, `mapidx.mjs`), cropped at 3×, and from the low
view with its bones drawn over it (`bonedots.mjs`), then measured
(`duelbones.mjs`, `feet.mjs`: the bones' world positions and the skinned mesh's
own vertices, `SkinnedMesh.getVertexPosition`):

- **It stands.** Its ball joints are 0.001 and 0.021 over the table, its ankles
  0.082 and 0.102, its pelvis 0.706 and its head's joint 1.221; the lowest skinned
  vertex near each ball is −0.005 and 0.016, the top of the mesh 1.328 of the
  duelist's 1.36. Doom reads 0.012 / −0.003 and 1.319; the CC0 director 0.004 /
  −0.001 and 1.335 (left / right). The same at all six frames.
- **In the idle's stance.** Every duelist plays its `idle` — for a personal model
  the build's own retargeted from the UAL's `Idle_Loop` (`check.json`: the
  retarget reproduces the hero clips within 0.77°) — and that stance puts one foot
  forward: 0.51 of a unit between Fury's ankles front to back, 0.42 between the
  CC0 director's. The CC0 director's long coat hides it; Fury's open coat and pale
  boots show it.
- **Seen from above.** Your duelist stands at (−3.95, 0, 4.65), near the lens, so
  its verticals converge toward the bottom of the frame: its head is nearest, its
  feet project down and out, and the forward foot reads as a leg laid out on the
  table. The CC0 director is drawn the same way (`fury-verdict.png`, the four
  panels: Fury and the CC0 director in the table view, then both in the low view
  with their bones — the same bones, both upright).

So it is **neither a code defect nor a personal-data defect**: the personal
duelist path's root is the CC0 duelist's (the same stand, facing and scale, an
identity quaternion on the mesh), the model's bind pose is an upright T-pose
(`preview/sheet.png`), and its retarget is the build's. Nothing under `personal/`
was edited. What would change the look is a pose: a duelist rest with the feet
together (the figures' `stand` in `REST_KIT` is the shape) — owner question 41,
defaulting to the pose it has.

### §11.6 The pictures again, on the rebased tree

The 384 shots of §1 (`var/audit-fix3/drv/shoot.mjs`, three Chromiums on the GTX
1080, the dev server on 5240) into `var/audit/shots-fix3/`, sheets in
`var/audit/sheets-fix3/`: one strip row in all 384; the column at most **95 px**
in every replay (the watching line); the opponent's plate at most 126 px; the
caption clear of both plates, the game-over row and the turn-order bar; the
turn-order bar clear of the column. **The tier-on rows now carry the portrait
standee** (D260, merged from `main`): a face-up creature no personal model
dresses stands as its painting where its cut is legible on the canvas the page
draws — at `villain-masters-of-evil-33`@438 nine standees at 1600 × 1000 and one
at 1280 × 800 (D261's floor) — so those rows are not comparable creature for
creature with §10's sheets, which predate the standee.

### §11.7 The negative controls

Each new clause's control was spliced into a copy of the tree (`git archive HEAD`
with this pass's diff applied, `var/audit-fix3/copy/`), `hud.test.ts` run there,
the splice restored and the suite run again (`var/audit-fix3/drv/controls.py`,
`var/audit-fix3/controls.log`); afterwards `diff -r` of the copy's `web/src` and
`web/test` against the worktree's printed nothing.

| control | red | restored |
|---|---|---|
| C1 the bar wraps again | the one-line clause | green |
| C2 the prompt without its floor | the one-line clause | green |
| C3 the hint, notice and outlined line unclamped | the one-line clause | green |
| C4 the hint without its tooltip | the one-line clause | green |
| C5 the first fix pass's credit, `0 1 auto` | the column clause | green |
| C6 the chip's 13ch floor | the column clause | green |
| C7 the credit's notice allowed to give way | the credit clause | green |
| C8 the notice back inside the credit's one text | the credit clause | green |
| C9 the chip's key back inside its ellipsis | the credit clause | green |
| C10 the floor one character short (and `hud.ts` with it) | the credit clause (the model misses Chromium's 109.1) | green |
| C11 the model's shrink unweighted | the credit clause (the first cut's 585.7 / 428.7) | green |
| C12 the notice squeezed with the hint | the one-line clause | green |

### §11.8 Tests, build, gate, and the user's Forge

- `npm --prefix web test` standalone: **1,224 `node --test` (1,215 pass, 0 fail,
  9 skipped) + 157 vitest (9 files)**, from the rebased tree's 1,222 + 157:
  `hud.test.ts`'s two new cases (the credit and the chip; the bar as one line of
  items), the column case's credit clauses rewritten in place.
- `node tools/build-workshop-catalog.ts --check`: current. `./bridge/build.sh`: OK.
  `npm --prefix web run build`, gzip: the 2D entry `index-*.js` 94.68 kB
  (unchanged), `Arena-*.js` 18.15 kB (18.05 on the rebased tree before this
  pass), `arena-scene-*.js` 398.52 kB (unchanged), the stylesheet 19.91 kB
  (19.75).
- **The gate** from a deleted `bridge/out` at `GATE_JOBS=4`, `WSPORT=9340`, once:
  **`check-all OK`**, **261.6 s** wall, 48 jobs whose seconds sum to 978.8 s, the
  load average 1.77 at the start, 7.59 at most, 7.18 at the end; inside it
  `node --test` **1,239 (1,228 pass, 0 fail, 11 skipped)** and 157 vitest in 9
  files; no step and no job added (`var/check-all-audit-fix3.log`, run
  `var/check-all/20260929-173647-2746863/`). This section, the histories',
  `PLAN.md`'s and `DECISIONS.md`'s gate lines were written after the run; no code,
  test or `CLAUDE.md` changed after it.
- **The user's Forge install**: the `~/forge` jar's sha256, every path, size and
  mtime under `/home/justin-a/forge`, and the sha1 of every file of
  `/home/justin-a/.forge`, fingerprinted before the rebase and after the gate:
  **unchanged** (jar `3c0a7c38…8e5dd9`).

## §12 Fix pass 3 — the director's shot, the credit's cap, the notice's tooltip, and every key pressed (D265 amended)

A third verifier re-proved the rebase (nothing lost from any side), the decision
bar (112.5 px at both sizes with `I` pressed; a 21-key sweep never past it), the
credit (whole at 1280) and the chip's floor, and left one major and two minors
(F17–F19 in §3); its third minor, the commits' co-author line, is left as it is,
as the caller asked. This pass answered each, with a negative control per new
test clause, and then pressed what no sweep had: every key that can change the
strips row or the decision bar.

### §12.1 F17 — the director's shot, as a mark

Pressing `6` hands the camera to the auto director (in a replay, or once a live
game is over), and the switcher drew the director's current shot as text in the
director's button. Measured on the tree before this pass (`5e48d47`, the working
tree stashed; `var/audit-fix4/drv/strips.mjs`: the frame, `K`, the pointer off
every card, the keys, the DOM's rectangles — the three shots the frame had not cut
to were written into the button, which Chromium lays out as the component would):

| the switcher, px | keys (1280–1839 px) | labelled (from 1840) |
|---|---|---|
| the director off | 230.1 | 672.0 |
| " · Table" | 283.1 | 725.0 |
| " · Side-on" | 296.3 | 738.3 |
| " · Shoulder" | 302.9 | 744.9 |
| " · Opp. shoulder" | 336.0 | 778.0 |

| before, the director on (" · Table") | 1280 | 1366 | 1400 | 1500 | 1600 | 1840 | 1920 |
|---|---|---|---|---|---|---|---|
| strips rows | **2** | 1 | **2** | 1 | 1 | **2** | 1 (**2** at " · Opp. shoulder") |
| the column, watching | 126.1 | 92.3 | 126.1 | 92.3 | 92.3 | 126.1 | 92.3 |
| … with `I` | **143.9** | 110.1 | 143.9 | 110.1 | 110.1 | 143.9 | 110.1 (143.9) |
| … a two-line prompt (`human-ability-42`@1060) | **146.3** | 112.5 | 146.3 | 112.5 | 112.5 | 146.3 | 112.5 (146.3) |

(At `villain-masters-of-evil-33` @209 and @371 and `g1`@316, watching; the
verifier's 126.1, 143.9 and 67.5-px strips row reproduced to the tenth.) The
switcher had been measured with the director off, the one-row check never had the
shot, and the 384 shots of §1 took the default camera.

**What changed** (D265 amended). The shot is always one of the five views, and
each has a button in the switcher, so the director now marks its shot on that
view's own button — `arena__view--shot`, the same 1-px border dashed and in the
accent, no width — and names it in its own tooltip ("…. Now: Side-on (4,
dashed)") and accessible name ("Director (6) — now Side-on"). `Arena.tsx` hands
the switcher the shot's id; no text in `ViewSwitcher` depends on it. README's *The
director* says what the dashed button means. Not taken: a fixed inline size sized
to the longest shot (" · Opp. shoulder", 16 characters of the 11 px mono face, 106
px), because the row has 27.8 px in hand at 1280 (993.0 of 1,020.8), 12.2 at 1400
and 10.3 at 1840; the shot positioned out of the flow under its button (the band
has 16 px under the column, and the far rank below it); the shot dropped.

After (the same driver on this tree): the switcher **230.1 px with the director on
at every one of its four shots** (672.0 labelled) — `CUE_STRIP.px.switcherDirector`
and `switcherDirectorLabelled` — and one strips row at every width (§12.2). The
pictures: `var/audit-fix4/crops/f17-director-i-masters209-<size>-before-after.png`
at 1280, 1400 and 1840 (143.9 → 110.1 px), `…/f17-director-oppshoulder-masters209-1920x1080-before-after.png`
(the longest shot at 1920: 143.9 → 110.1) and `…/f17-director-i-quake1060-1280x800-before-after.png`
(146.3 → 112.5).

`hud.test.ts` holds it: the one-row check runs again with the director on at 1280,
1399, 1400, 1839, 1840 and 1920 px; the director-on switcher is no wider than the
director-off one; and the control is the shot as text, modelled from `camera.ts`'s
own shot list — `viewForBeat` over every beat kind from both seats and none, and
`startShot`: Table, Side-on, Shoulder, Opp. shoulder — the longest with its
separator, 16 characters, 106.0 px, a switcher of 336.1 px against Chromium's
336.0, which fails the row at 1280, 1400, 1840 and 1920. `arena-hud.test.tsx`
renders `ViewSwitcher` at every one of those shots: its text is the director-off
text, exactly one button carries the mark (the shot's), and the director's
tooltip and accessible name carry the shot's name.

### §12.2 Every key that can change the chrome, pressed

The verifier asked what else a key can change in the strips row or the decision
bar that no sweep had pressed. On this tree, in headless Chromium on the GTX 1080
(`var/audit-fix4/drv/sweep.sh`, three browsers), at 1280 × 800, 1366 × 768,
1400 × 900, 1500 × 900, 1600 × 1000, 1840 × 1000 and 1920 × 1080, at
`villain-masters-of-evil-33` @209 and @371, `g1`@316 and `human-ability-42`@1060
(Quake's prompt at two lines) — 28 pages, each measured after: `6`; `6` then `I`;
the status at its widest (`99+ steps · 99999+ ms` and `99.9 s` written into its
fixed boxes); the next 7–16 frames played one at a time with the director on and
cutting, the row sampled every 60 ms; `N` (the caption) and `M` (the sound) each
way and both back; the cue clock paused (the strip's "▶ cues") and the widest
status again; `O` (spectator off); views 3 and 4 (spectator-only), 5 and 2; `6`
and `I` again. And the speed select at every speed at 1280 and 1400. And a live
seat (`./bridge/run.sh mtgtable.MtgTable --transport ws --port 9345 --ai-deck
decks/doom-legion.dck --seed 42 --keep-open --games 3`, the hand kept, the priority
prompt of the first main phase) at 1280, 1400, 1840 and 1920: `6`, `3`, `4` and `O`
(each a hint: spectator only), `N`, `M`, `I`, and `CTRL+Q` armed ("Concede — click
again").

| | measured | the strips row | the column, at most |
|---|---|---|---|
| the replays, every state above | 448 measurements on 28 pages, and 3,338 samples while cues played (63–144 a page; the director cut to all four of its shots) | **one row, every time** | **112.5 px** (the two-line prompt; watching, 110.1 with `I` and 92.3 without) |
| before, the same pages (`6`, `6` then `I`, each shot) | 168 | two rows at 1280, 1400, 1840 (and 1920 at the longest shot) | 146.3 |
| the live seat, every key | 36 measurements at four widths | one row | **112.5** (a one-line prompt beside a two-line hint) |

What a key moved, and which way: spectator off drops the ✓ (the switcher 13.3 px
narrower — 216.8 at a live seat), and the paused clock's "▶ cues" is 3.4 px
narrower than "⏸ cues". Nothing widens the row: the caption and sound checkboxes
keep their labels, the speed select is as wide as its widest option at every
speed, a view is a class, the status is a fixed box and the director's shot a
mark. So `CUE_STRIP`'s widths are the widest the strips draw under every key, which
`hud.ts` now says; the arena `CLAUDE.md`'s audit rule 1 says a control whose text a
key changes is measured in that state too.

### §12.3 F18 — the credit's own cap, dropped (D265 point 2 amended)

D265 point 2, as fix pass 2 amended it, says the credit never shrinks while the
chip can. It did, from 1366 px up, because of M7 Tier 1's `max-inline-size:
980px` — written when the credit stood alone on its row (`min(980px, 92vw)`) and
kept by fix pass 2 inside `min(980px, 100% − --inspect-floor − 0.4rem)`. The row's
own `calc(100% - 15rem)` keeps the credit off the opponent's plate, so the cap is
dropped (the verifier offered naming it instead; the rule is then true as
written). The sweep's first state, credit / chip in px (the credit's text is
1,070.4 px):

| `villain-masters-of-evil-33`@209 | 1280 | 1366 | 1400 | 1500 | 1600 | 1840 | 1920 |
|---|---|---|---|---|---|---|---|
| before | 905.3 / 109.1 | 980 / 120.4 | 980 / 154.4 | 980 / 254.4 | **980 / 354.4** | 980 / 560 | 980 / 560 |
| after | 905.3 / 109.1 | 991.3 / 109.1 | 1,025.3 / 109.1 | **1,070.4** / 164.1 | **1,070.4** / 264.1 | **1,070.4** / 504.1 | **1,070.4** / 560 |

Before, its artist list was cut by 90 px at every width from 1366 (@371's 1,054.1-px
credit by 74); after, it is cut only where the chip is at its floor (1366 and
1400) and whole from 1500. At 1600 the row was full either way (980 + 354.4
before, 1,070.4 + 264.1 after), so it covers the same span of the far end; where
the capped row did not fill (from about 1,806 px: 980, the gap and the chip's
560) a long credit covers more of the band — for this credit up to 90 px, from
1,896 px. `var/audit-fix4/crops/f18-credit-masters209-1600x1000-before-after.png`.

The cap had bound in **96 of the 384 matrix shots** (every 1600 × 1000 shot of the
Doom Legion's, the Masters of Evil's and Wakanda's recordings, both seats; their
table credits 998–1,053 px, each drawn 980 beside a 354-px chip). Those 96 were
taken again (`var/audit-fix4/drv/shoot.mjs`, three Chromiums; `var/audit-fix4/shots/`,
sheets in `var/audit-fix4/sheets/`): every credit whole (the Doom Legion's 1,029
px beside a 305-px chip, the Masters' 1,053 / 282, Wakanda's 998 / 336), one strip
row, the column at most 92 px. The other 288 are §11.6's, pixel for pixel in the
chrome: the director off, and no credit the cap had reached.

`hud.ts`'s `CREDIT_ROW` loses `creditMaxPx` and `creditRowOf` its cap.
`hud.test.ts` holds the stylesheet (no cap), the model at the verifier's frame
(1,070.4 beside 264.1 at 1600, as Chromium drew it; 991.3 beside 109.1 at 1366),
and — over credits of 200–2,000 px, four chips and every 32 px from 1280 to 1920 —
that the credit is cut only with the chip at its floor, with the 980-px cap as
the control (the model draws it 980 beside 354.4, as Chromium did: the credit
cut with the chip 245 px above its floor). A12 in §3 is amended.

### §12.4 F19 — the notice's tooltip, tested

D267's amendment says the hint and the notice give way "whole in their tooltips";
the notice's is its title and the engine's text, but `hud.test.ts` matched
`title={` and nothing more, so the verifier's `title={notice.title}` — which drops
the engine's text from the only place it is whole — stayed green. `hud.test.ts`
now matches the whole expression, and `arena-hud.test.tsx` renders the bar over
`human-auto-2026`'s real "Not selectable" notice: its tooltip is "Not selectable —
card 9 cannot be selected now", and a notice with no text ("Your turn") is its
title, with no dangling dash.

### §12.5 The negative controls

Each spliced into a copy of the tree (`git archive HEAD` with this pass's diff
applied, `var/audit-fix4/copy/`, its `web/node_modules` a link to the worktree's),
the suite that holds it run there, the splice restored and the suite run again
(`var/audit-fix4/drv/controls.py`, `var/audit-fix4/controls.log`); afterwards
`diff -r` of the copy's `web/src` and `web/test` against the worktree's printed
nothing.

| control | red | restored |
|---|---|---|
| N1 the switcher measured with the shot as text (`switcherDirector` 283.1, 725 labelled) | `hud.test.ts`, the one-row case: "1280 px, narrow, keys, the director on: the strips need 1046.0 px of a 1020.8-px row" | green |
| N2 the shot drawn as text in the director's button again | `arena-hud.test.tsx`, the switcher case: its text changed at the table shot | green |
| N3 no mark on the shot's view button | `arena-hud.test.tsx`: `[]` for `['table']` | green |
| N4 the shot not named in the director's tooltip | `arena-hud.test.tsx`: no "Now: Table" | green |
| N5 the notice's tooltip its title alone (the verifier's) | `hud.test.ts`, the bar case, **and** `arena-hud.test.tsx`, the notice case | green |
| N6 the notice's tooltip the title on both branches | both, as N5 | green |
| N7 the credit's 980px cap back in the stylesheet | `hud.test.ts`, the column case | green |
| N8 the credit's 980px cap back in the model | `hud.test.ts`, the credit case: "1376 px: a 1000-px credit beside a 109.1-px chip is cut to 980.00" | green |

The one-row case's own control (the shot as text, from `camera.ts`'s shot list)
and the credit case's (the capped model) are asserted to fail on every run, so
their teeth are checked in the suite itself.

### §12.6 Tests, build, gate, and the user's Forge

- `npm --prefix web test` standalone: **1,224 `node --test` (1,215 pass, 0 fail,
  9 skipped) + 159 vitest (9 files)**, from 1,224 + 157: `arena-hud.test.tsx`'s two
  new cases (the notice's tooltip; the switcher at every shot); `hud.test.ts`'s
  new clauses sit in its existing cases.
- `node tools/build-workshop-catalog.ts --check`: current. `./bridge/build.sh`: OK.
  `npm --prefix web run build`, gzip: the 2D entry `index-*.js` 94.67 kB (94.68
  before: byte for byte the same code against a build of `5e48d47` once the lazy
  chunks' hashed names are masked — only those names gzip differently),
  `Arena-*.js` 18.23 kB (18.15), `arena-scene-*.js` 398.52 kB (unchanged), the
  stylesheet 19.91 kB (unchanged).
- **The gate** from a deleted `bridge/out` at `GATE_JOBS=4`, `WSPORT=9340`, once:
  **`check-all OK`**, **263.2 s** wall, 48 jobs whose seconds sum to 978.8 s, the
  load average 0.51 at the start, 9.75 at most, 8.87 at the end; inside it
  `node --test` **1,239 (1,228 pass, 0 fail, 11 skipped)** and 159 vitest in 9
  files; no step and no job added (`var/check-all-audit-fix4.log`, run
  `var/check-all/20260929-182921-2998085/`). This section's gate and Forge lines,
  the histories', and `PLAN.md`'s gate line were written after the run; no code,
  test or `CLAUDE.md` changed after it. The dev server (port 5240) and the live
  seat's bridge (9345) were stopped by their PIDs before the run.
- **The user's Forge install**: the `~/forge` jar's sha256, every path, size and
  mtime under `/home/justin-a/forge`, and the sha1 of every file (and every path,
  size and mtime) of `/home/justin-a/.forge`, fingerprinted before this pass and
  after its gate (`var/audit-fix4/forge-{before,after}.txt`): **unchanged**, the
  two files equal byte for byte (jar `3c0a7c38…8e5dd9`).
