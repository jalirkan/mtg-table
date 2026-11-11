## D536 — J210 read: the search's strength is in its priority plays (about two thirds), then its attacks (about a quarter), and searching blocks is not shown needed once the other two are searched; one faster-seat candidate, `search-v2-no-b`, and its 4,800-game head-to-head against search-v2 on deals no match has played (J211)

*Branch `pc/no-block-seat`, off main `c744a0e8` (D534's and D535's merge, the pin of J210). This file and PLAN's
rows. **No code changes**: both players of the head-to-head are registered already (D535), nothing under
`bridge/src`, `tools/` or `web/` is touched, and the live seat, the atlas's random seat (D508), the wire and the
protocol are unchanged, so this is free under D509. Written after J210 finished (02:04 on 2026-11-11), with the lab
idle.*

**Status: J210 read. The head-to-head is registered and unplayed: J211 plays it.**

**2026-11-11**

**Context.**

- **J210 played D535's eight corners.** 2026-11-10 18:36 to 2026-11-11 02:04 at pin `c744a0e8`, alone, 7 workers
  (5 or 6 from 21:15 on, under memory pressure from outside the lab; 7.37 h against D535 point 8's estimate of
  about 6). Eight fixed 1,200-game matches against `forge-default`, each in a ladder folder of its own, every one
  on blocks 114,900,000–114,900,149: 9,600 games, no draw, error or timeout, every match complete and every config
  line exact, 600 deals shared by every comparison (D535's floor was 590). The run's files are
  `~/code/lab/pc-results/results/J210/` (`report.md`, `verdict.json`, the eight match lines); its summary is
  `results/J210/summary.md` on `pc-results`.
- **D535 point 6 named what a candidate earns** before any game: a 4,800-game head-to-head against
  `search-v1-anytime`, as its own job under its own decision, in J198's shape. This is that decision.
- **A correction to D535, not an edit of it**: its last unverified line says the confirm set has 34 deck pairs. It
  has 30 (`tools/ai-bench/pairs-confirm.txt`), as every job file since D398 has said. No reading depends on it.

**Decision.**

1. **J210's table, as measured.** Each corner against `forge-default`, 1,200 games; the score is the corner's over
   the mirrored pairs with its 95% interval, and the Elo is the same number on the Elo scale.

   | corner | player | score [95%] | Elo [95%] | searched p / a / b | changed | ms a searched decision | search s a game |
   |---|---|---|---|---|---|---|---|
   | none | `policy-outlet` | 0.5042 [0.4988, 0.5096] | +2.9 [−0.9, +6.7] | 0 / 0 / 0 | 0 | — | 0 |
   | b | `search-v2-only-b` | 0.5200 [0.5093, 0.5307] | +13.9 [+6.4, +21.4] | 0 / 0 / 2,216 | 421 | 1,210.8 | 2.2 |
   | a | `search-v2-only-a` | 0.5408 [0.5244, 0.5573] | +28.4 [+17.0, +40.0] | 0 / 6,722 / 0 | 1,313 | 1,099.3 | 6.2 |
   | p | `search-v2-only-p` | 0.5900 [0.5698, 0.6102] | +63.2 [+48.8, +77.8] | 20,462 / 0 / 0 | 3,914 | 1,011.0 | 17.2 |
   | ab | `search-v2-no-p` | 0.5517 [0.5355, 0.5678] | +36.0 [+24.7, +47.4] | 0 / 6,733 / 1,924 | 1,600 | 979.2 | 7.1 |
   | pb | `search-v2-no-a` | 0.5917 [0.5709, 0.6125] | +64.4 [+49.6, +79.5] | 20,568 / 0 / 2,079 | 4,281 | 961.7 | 18.1 |
   | pa | `search-v2-no-b` | 0.6242 [0.6034, 0.6450] | +88.1 [+72.9, +103.7] | 20,351 / 6,850 / 0 | 5,041 | 919.9 | 20.9 |
   | pab | `search-v1-anytime` | 0.6258 [0.6048, 0.6468] | +89.4 [+73.9, +105.1] | 20,356 / 6,861 / 1,866 | 5,282 | 934.8 | 22.7 |

   An unsearched kind has no searched decision in any corner (D535's first unverified line: it held in 9,600 games).
   The searched decisions cost more each the fewer kinds are searched (1,211 ms for blocks alone, 935 with all
   three); the lines do not say why, and nothing below leans on it.
2. **The readings of D535 point 5, paired by deal on 600 deals each.** In score, with about the same on the Elo
   scale (`verdict.json`'s `eloAbout`, a conversion at these scores, never an interval of its own).
   - **WHOLE** = Δ(all, none): +0.1217 [+0.1006, +0.1428], about +86.5 Elo (±14.9). Above 0, so the rest is read.
   - **ALONE**: priority +0.0858 [+0.0652, +0.1065] (about +60.3, ±14.5); attacks +0.0367 [+0.0201, +0.0532] (about
     +25.5, ±11.5); blocks +0.0158 [+0.0057, +0.0260] (about +11.0, ±7.0). Each is `ADDS ALONE`.
   - **LAST**: priority +0.0742 [+0.0494, +0.0989] (about +53.3, ±17.8), `NEEDED`; attacks +0.0342 [+0.0155,
     +0.0528] (about +24.9, ±13.6), `NEEDED`; blocks +0.0017 [−0.0148, +0.0182] (about +1.2, ±12.2), `NOT SHOWN
     NEEDED`. The blocks' interval holds a block search worth about 13 Elo on top of the other two and one that
     costs about 11; "blocks add nothing" is not what it says.
   - **INTERACTION** (information): −0.0167 [−0.0429, +0.0096]. The three kinds alone sum to 0.1383, the whole is
     0.1217; the interval holds 0, so neither overlap nor help between the kinds is shown.
   - **REPLICATION** (information): Δ(all, J194 (a)'s rows) +0.0025 [−0.0134, +0.0184] (about +1.9, ±11.8). The
     same config on the same deals at pins `72302c69` and `c744a0e8` is the same seat to within the paired
     comparison's own noise, which is therefore about ±0.016 in score, ±12 Elo, for two search seats this alike
     (D535 point 4 expected ±15 to 16 from less alike pairs).
3. **What the table says, and what it does not.** Of the search's about 87 Elo over the same seat with no search
   (the none corner, itself 3 Elo from Forge Default), searching priority plays alone gives about 60 and searching
   attacks alone about 26, and the two together land where all three do (the pa corner is at the pab corner to
   within 0.0017 in score): priority is about two thirds of the whole and attacks about a quarter, consistent with the two adding (the
   interaction's interval holds 0).
   Searching blocks alone gives about 11, and nothing is shown for it on top of the other two. The search changed Forge's answer at about the same rate for
   every kind (19.4% of priority decisions, 15.4% of attacks, 14.8% of blocks in the pab corner), so the kinds
   differ in how often they come up and in what a changed answer is worth, not in how often the search disagrees
   with Forge. It does not say why priority is worth most (more decisions, 20,356 against 6,861 and 1,866; a
   per-decision worth was not measured), and it is one deck set against one opponent.
4. **The candidate, under D535 point 6.** Every partial arm's Δ(all, arm), point and interval:
   `only-b` +0.1058 [+0.0833, +0.1284]; `only-a` +0.0850 [+0.0600, +0.1100]; `no-p` +0.0742 [+0.0494, +0.0989];
   `only-p` +0.0358 [+0.0169, +0.0548]; `no-a` +0.0342 [+0.0155, +0.0528]; `no-b` +0.0017 [−0.0148, +0.0182]. One
   point is at or under +0.014: **`search-v2-no-b`** (`what=pa`, hash `59505e241363`), the only candidate. It
   searches 20.9 s a game against search-v2's 22.7 s on the night's lines, 1.8 s or about 8% less. **That is not the
   faster seat the owner asked for** (J198 tried half the clock); it is what the kinds have to give, because the
   kind that is not shown needed is 6% to 8% of the thinking time. A candidate is not a result (D535: at that
   night's width an arm truly 20 Elo worse passes about one time in nine).
5. **The head-to-head: one fixed 4,800-game match, `search-v2-no-b` (A) against `search-v1-anytime` (B), on the
   confirm set** (D398: 2,400 mirrored pairs, 600 batches of 8 games, no stopping rule), `alone: yes`, J211.
   A's config is `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1`
   and B's the same with `what=pab` (`cdd55e02a89c`): the two differ in that one key.
6. **The deals are ones no match has played: `--host j211` in a ladder folder of its own, `var/j211-ladder`.** A
   match's batch seeds start at the host name's base plus 900,000 (`hostBase`, `cmdMatch`) and walk up past the
   blocks the folder has played. On this host's own name the match would take 114,900,000–114,900,599, and the
   first 150 of those are the 600 deals J210 named the candidate on: an arm chosen because its difference to `all`
   was small on some deals is flattered by those deals. `hostBase('j211')` is 931,000,000, so the match takes
   **931,900,000–931,900,599**; no game in the lab's ladder logs is on base 931 (338,577 rows read on 2026-11-11: 336,193
   on base 114, 2,240 tuning rows on base 610, the rest on the pilots' own hosts), so these are new deals for
   every player. `--host` changes the seed base and the names in the log,
   nothing a game plays by (J198's pilot used the flag the same way). The folder is emptied by the match's own
   block before it starts, so a match the runner starts again after a memory stop replays the same 600 blocks
   (D535 point 2's reason). 600 consecutive blocks give each of the confirm set's 30 deck pairs exactly 40
   batches, 160 games, in both seat orders, whatever the base (`batchPairs`).
7. **The rule, J198's, written before any game.** From the match line (A's score over the mirror pairs, as Elo):
   the match is **complete** when its two names and hashes are A's and B's in that order, `complete` is true,
   4,800 games were played and errors plus timeouts are at most 240, its blocks are exactly
   931,900,000–931,900,599, and A's side searched no block decision while searching priority and attacks.
   - **NO-BLOCK SEAT HOLDS**: complete and the interval's lower end is above −10 Elo.
   - **NO-BLOCK SEAT FAILS**: complete and the interval's upper end is below −10 Elo.
   - **INCONCLUSIVE AT 4,800**: complete and neither.
   The ends are the match line's own `eloLo` and `eloHi`, which the ladder rounds to 0.1 Elo, so a printed −10.0
   is neither above −10 nor below it.
   Three words describe the interval beside the verdict and decide nothing: *indistinguishable* when it holds 0,
   *a measured loss* when it is wholly below 0, *a measured gain* when wholly above. A HOLDS that is also a
   measured loss is reported as both ("holds the bar and loses about N"). **D535 point 6 wrote "the −10 Elo bar,
   D519's four readings"; this is how that is read**: the verdict is the −10 Elo bar's three cases, as J198's was,
   because the question is a bounded loss and D519's readings are for a gain. D519's reading of the same line
   (SHOWN, SMALL GAIN, INCONCLUSIVE AT 4,800 or NOT SHOWN, for A as a gain over B) is printed beside it as
   information.
8. **The cost is read beside the verdict**, from the same line: each side's searched decisions by kind, its ms a
   searched decision and its search seconds a game (ms a decision × searched ÷ the match's games played), and A's as a share of B's.
9. **What each verdict leads to.**
   - HOLDS: `search-v2-no-b` is a **live-seat candidate**. It becomes a seat-queue row with the measured point,
     interval and seconds saved, and the owner says yes or no in one word (D509). Nothing changes the seat here.
   - FAILS: the block search is worth more than 10 Elo head to head; the arm stays registered and is not retried.
   - INCONCLUSIVE AT 4,800: not adopted, and not played again: 4,800 more games for 1.8 s a game is not a trade
     this lab makes without a new reason.
   In every case the match is also the sharpest measure there is of what the block search is worth (about ±5 Elo
   at 4,800 games, J198's width, against ±12 by deal in J210), and the next lane reads it.
10. **The next lane is chosen from the table (D535 point 7), by the PC session, and it is not this decision.**
    What the table and the budget curve say together: the strength is in priority decisions, and more clock for
    all three kinds bought nothing between half and four times the budget (J194, J195), so a budget by kind is
    mostly a way to spend less, as this candidate is. A stronger seat has to come from what the priority search
    considers and how it values it. That lane is designed while J211 plays and gets its own decision.

**Rejected.**

- **Playing the head-to-head on the host's own blocks.** Its first 150 blocks are the selection deals (point 6).
- **Skipping the head-to-head because the saving is 8%.** D535 promised it before any game, the match is ready
  with no new code while the next lane is not, and it measures the block search three times finer than J210 could.
- **A 1,200-game head-to-head first.** At ±10 Elo it could not separate −10 from 0; J198's 4,800 could, barely.
- **Proposing the seat change from J210 alone.** One 1,200-game difference of +0.0017 ±0.0165 is the candidate
  rule's input, not a measurement of the arm.
- **A different bar for a smaller saving.** The bar was written in D535 before the candidate was known; moving it
  now would be choosing the rule after the data. The owner sees the point and the seconds and decides.
- **A `what=p` budget arm, or `pa` at a shorter clock, in the same night.** Each is a new arm chosen after the
  table; J198 already measured the shorter clock (−6.5 Elo [−11.7, −1.3]), and one match per question keeps the
  reading clean.

**What is unverified.**

- That the head-to-head's deals are as hard or as easy for the block search as J210's. They are other deals of the
  same 30 deck pairs; nothing is read across the two nights by deal.
- The time: J194 (b)'s mirror took 2 h 10 min for 1,200 games and J197's 9 h 33 min for 4,800, so about 9 h at 7
  workers, 11 to 12 if memory pressure holds the match at 5 or 6 as it did J210. The match's own clock is 15.5 h
  and the step's 16 h, so a slow night still completes.
- Whether one opponent (search-v2 itself) and one deck set stand for the table the seat meets. They are what every
  search number since D398 was read on.

**Follow-up.** J211 plays the match at this lane's merge. Its `report.md` carries the verdict, the descriptions,
D519's reading and the cost; `summary.md` (the PC session) words them. A HOLDS goes to the owner as one question.
