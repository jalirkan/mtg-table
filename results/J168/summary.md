# J168: move atlas 4a, night three (random library decks): summary

Written 2026-10-25 by a read-only pass. No engine and no browser were used, and nothing on the data folder was written.
Numbers come from the Report block's own files under `lab-j166/report/` (labels.json, reads.json, cuts.json, tool.json),
from the spine folders, and from four scripts of mine in `report/bin/`. Those scripts read the branch frame logs and
re-read the labels.

**The population.** Random library decks by band, drawn as the census draws them (D447/D482), on the cut design (D480).
Every row is `training: true` with `pool: random-<band>`. s01-s03 were branched by J166 at 325c2dd8 over pre-D483
listings, s04 by J167 at bf978690, and s05-s13 by J168 at 26a8db00 (D483 listings, D484's random seat). Never pooled with
J156/J157/J158/J162.

## The run

- **Timing:** 12:14-19:51 EDT (7 h 37 min).
- **Workers:** 6, sized by memory. Peak worker RSS 1.1 GB.
- **Blocks:** run1-run9 took one spine each and every block exited 0. run10 was the Report.
- **Exits:**
  - s05, s07, s08, s09, s11, s12: atlas exit 0.
  - s06, s10, s13: atlas exit 3 on the redaction check alone, with 2, 16 and 6 frame logs failing.
  - That check is the only failed check: `atlas.problems == 0` reads 3. The other 43 checks pass.
- **Not a leak:** the third spine is **s13** (run9.log). All three failing spines show the same shape: the random seat
  hands Forge's stale target to the engine. Examples:
  - s10: d22-random-o0-b134 targets card 121.
  - s06: d2-random-o2-b166 targets token 82, which had already returned to hand.
  - s13: d2-random-o0-b149 targets Saproling token 93, which had already died. Its spell was Tamiyo's Safekeeping.
- **Disk:** 31.1 GB used on the lab folder, 618 GB free. `big_frames` 0.

## (1) The night, per spine and in total

The full table, with one column per spine, is `report/spines.md` (data in `report/spines.json`).

| | s01-s03 (J166) | s04 (J167) | **s05-s13 (J168)** | **all 13** |
|---|---|---|---|---|
| decisions listed / k >= 3 plays | 51 / 18 | 17 / 12 | 218 / 134 | **286 / 164** |
| in full / screened / filled from k < 3 | 22 / 0 / 5 | 3 / 14 / 0 | 72 / 25 / 3 | **97 / 39 / 8** |
| options (in full) / stopped early | 74 (74) / 11 | 62 (8) / 1 | 444 (319) / 123 | **580 (401) / 135** |
| branch games (Forge map) | 14,280 (880) | 2,900 | 54,345 (1,720) | **71,525 (2,600)** |
| labels / confident | 22 / 4 | 3 / 0 | 72 / 23 | **97 / 27** (confidentForge 2) |
| engine errors / timeouts / unavailable / restarts | 0 | 0 | 0 / 0 / 0 / 0 (2 errored rows, s12) | **0 / 0 / 0 / 0** |
| capped | 1,624 (11.4%) | 4 | 758 (1.4%) | **2,386 (3.3%)** |
| effectSourceNull / exileLinksLost | 0 / 0 | 0 / 0 | 0 / 2,000 (all s05) | **0 / 2,000** |
| chooseSourceGuard rows (sum) | 0 | 0 | 537 (6,187), all s05 | **537 (6,187)** |
| wall at 6 workers | 2 h 06 | 34 min | 7 h 28 | **10 h 08** |
| branch games an hour (wall) | 6,813 | 5,085 | 7,281 | **7,061** |

- **Wall per spine (minutes):** 47.8, 29.4, 48.6, 34.2, **46.2** (s05), 75.3, 22.4, 65.7, 49.9, 52.3, 61.0, 36.0, 39.1.
  The mean is 46.8. The job estimated 42.
- **s06 was the slow one:** 75 min, with 6.25 options per full decision and 28 options stopped early.
- **s07 was fast:** 16,027 games an hour, at 1.13 s per random branch.
- **The 2 errored rows** on s12 are IndexOutOfBoundsException on `attack:none` at d5 and d7. They are not engine errors.

## (2) The sizing read

| | confident labels per 7-worker 10-h night | on how many confident | Poisson 95% |
|---|---|---|---|
| **all 13 as run** (`c_sizingRead`) | **31.1** (112 labels) | 27 | 20.5-45.2 |
| s05-s13 only (labels-d484.json) | 36.0 (113 labels) | 23 | 22.8-53.9 |
| s04-s13, the D483 listings (labels-d483.json) | 33.4 (109 labels) | 23 | 21.2-50.1 |
| all 13, s05 d8 voided | 29.9 | 26 | 19.6-43.9 |
| all 13, the middle count from (3) (void + 2 bias flips out) | 27.6 | 24 | 17.7-41.1 |
| all 13, strict (all 6 doubtful confident labels out) | 24.2 | 21 | 15.0-37.0 |
| J166 s01-s03 | 22.3 | 4 | ~6-57 |
| the review's expectation, section 5 | ~25-27 | | |

- **Against the review:** after the lost-spell bias, the night lands on the review's ~25-27. It reads 24-30 depending on
  how strictly section (3) is applied. 31 is the number as run.
- **The interval is still about ±40%,** but it now rests on 21-27 confident labels instead of 4.
- **Cost:** 1,000 labels take ~9 nights. 1,000 confident labels take ~32 nights as run, or ~36-41 with the doubtful
  labels out.

**What the cuts saved** (`cuts.json`):

| | measured | expected |
|---|---|---|
| branch time saved | **31.9%** (50.2 of a projected 73.7 branch-hours) | 18-20% (review); J166 7.7% |
| early stopping | **15.3%** (135 options stopped) | 14.3% |
| the screen | **16.6%: it fired this time, on 39 decisions over 9 spines** (s04 14, s08 7, s11 6, s09 4, s06 3, s07 2, s10 2, s13 1). It did not fire on s01-s03, s05 or s12 | 7.7% |
| the checks | **0.50 h, 4.9% of the wall; 25.2 s per 1,000 branch games** (J166 38 s and 7.2%; J162 serial 93 s) | ~6% |
| idle share in phase B | 11.6% | ~10% |

## (3) The lost-spell bias

Details are in `report/stranded.md`, `report/labels-recheck.md`, and the `.jsonl` files beside them.

- **Log lines:** there are **1,328** `failed to target` lines in phase B's worker logs over the 13 spines: s02 8, s05 453,
  s06 214, s07 138, s10 515. With J167's aside s05 (18) that makes 1,346.
- **No branch id in the logs.** The worker logs do not carry branch ids, so I found each lost cast in the frames instead.
  A lost cast is a `{hand}->{stack}` event for the card, after which the card never shows in `stackCards`, never leaves
  the stack, and is never seen again. The mana is tapped.
- **Per spine** (branch games with a lost spell):
  - **s05: 991 of 5,500 (18.0%).** Every one is A's Suplex. 650 of them are lost at the option itself: d0 o2 200/200, d3
    o2 150/150, d5 o4 100/100, and d8 o0 200/200, which is Forge's own answer. 341 more are lost later in the branch.
    At d2 the Suplex option (o1) resolved 100 of 100 times. **The worker log shows only 453 of the 991**, so a count from
    the logs misses half of s05.
  - **s10: 512 of 5,875 (8.7%).** B's Troll Negotiations (507) and Tear Asunder (7), always later in the branch, spread
    over every option. Here the opponent loses its spell.
  - **s06: 201 of 7,350 (2.7%).** A's Troll Negotiations (107) and Knockout Maneuver (105), always later in the branch.
  - **s02: 7 of 2,500.** A's Tear Asunder.
  - **s07: 118 dropped triggers.** These are Headliner Scarlett's enter trigger, logged as "failed to target" with an
    empty target list. The creature resolves; only the "can't block" effect is missing. 24 of the 118 are in the
    **Forge map**, so this is Forge's own AI play, not the random seat's.
- **s13's sibling shape:** 14 Tamiyo's Safekeeping casts aimed at a creature or token that had already left. The spell is
  countered on resolution and the card is lost. A scan of every target decision on all 13 spines finds stale targets
  only for Troll Negotiations and Knockout Maneuver (s06, s10) and Tamiyo's Safekeeping (s13). Every other off-board
  target is a graveyard spell, which is legitimate.

**Which labels change.** I recomputed each touched decision's paired regret with the tainted branch indices taken out.
Where an option's own forced cast was lost in most of its branches, I took that option out instead. As a control, I
dropped the same number of rows at random 200 times to see whether a flip is just the smaller sample.

- **Untouched: 71 of 97 labels** have no branch with a lost spell. That is every label on s01, s03, s04, s08, s09, s11,
  s12 and s13, plus 2 on s02, 3 on s05, 5 on s06 and 2 on s07.
- **Touched: 26.** 20 are touched by the random seat (s02 4, s05 5, s06 3, s10 8) and 6 by Scarlett (s07).
- **The 27 confident labels:**
  - **void (1):** s05 d8. Forge's choice, Suplex, was lost in 200 of 200 branches. The "7.8 [2.5, 14.8] regret" measures
    throwing Suplex away.
  - **lose confidence beyond chance (2):**
    - s06 d6 goes from 3.5 [1.0, 6.5] to 1.4 [0.0, 4.0]; random drops keep it 96.5% of the time.
    - s10 d28 goes from 11.0 [2.8, 19.8] to 7.8 [0.0, 16.5]; random drops keep it 95% of the time.
  - **lose confidence about as random drops would (3):**
    - s10 d2 goes from 9.0 to 5.6 [0.0, 16.0]; random drops keep it 38% of the time.
    - s10 d10 goes from 8.2 to 7.0 [0.0, 16.1], and its best option moves from o1 to o2; random drops keep it 65%.
    - s10 d15 goes from 9.0 to 8.8 [0.0, 17.9]; random drops keep it 72.5%.
  - **hold (21):** these include s02 d3 (1 row), s06 d2 (25.4 [17.2, 36.1]) and s07 d7 (Scarlett, Forge's own play,
    drop within chance).
- **Non-confident labels:**
  - **s05 d0 cannot be measured.** Suplex was lost in all 200 of o2's branches, and later in 121 and 162 of o0's and
    o1's.
  - **s05 d3 and d5:** a Suplex option is dead and must be dropped. Their verdicts do not change.
  - **No non-confident label becomes confident.**
- **The screened decisions stay screened:** s06 d4 and d5 (clean means .98 and .99), s10 d44 and d45.

## (4) D484's guard

- **Where it fired:** only on s05, in 537 rows (9.8% of s05's branches), 6,187 times in all (median 8 a row, max 63).
  - Every decision and every option has some: between 1 and 53 of an option's branches (d0 o2: 53 of 200).
  - It fires at the same branch indices across options (d0: 71 indices, 43 of them in two or more options), as paired
    seeds should.
  - It never fired on s01-s04 (`chooseSourceGuardOffD484` 0) or on s06-s13.
- **The rows it touched look like Circle games, not broken ones:**

| | guard rows | their siblings (same decisions) | all of s05 |
|---|---|---|---|
| n | 537 | 4,963 | 5,500 |
| turns / steps | 32.4 / 805 | 24.8 / 468 | 25.5 / 501 |
| capped | 19.2% | 4.0% | 5.5% |
| A's score | 0.47 | 0.76 | 0.73 |
| ms / timeouts | 4,812 / 0 | 2,408 / 0 | 2,643 / 0 |

- **How to read that table:** these are branches where B's Circle of Protection: Green is in play and being used. Games
  run longer, are capped more often, and go worse for A. That is the card doing what it does.
  - No guard row timed out, and no frame log is large.
  - I cannot separate this from any effect of the guard's own choice without a run that has the guard off.
- **s05 against J167's hung run** (30 unit kills, 56 branch games an hour, 17 GB of frames): exit 0, 46.2 min, 5,500
  rows, 0 timeouts, 0 unit errors, 7,143 branch games an hour, 930 MB of frames.
- **Also on s05:** every branch of d10, d11 and d13 (2,000 rows) carries `exileLinksLost: 1`. That is one exile link the
  copier cannot map, the same one in every branch and every option. It may be Suplex's "exile instead" from the
  baseline's own cast; unverified.

## (5) Random decks against J166's three

- **More decisions per turn.** Decisions listed per baseline turn are 1.0-1.85 on s04-s13 (night 1.10), against
  0.50-0.79 on s01-s03. 57% of listed decisions have k >= 3 plays. Options per full decision are 4.13 (2.17-6.25).
- **Far fewer capped.** 3.3% for the night and 1.4% on s05-s13. s01's 21.1% stays the outlier; next are s05 at 5.5% and
  s13 at 3.0%.
- **Confident share 0.28 [0.14, 0.45]** (s05-s13: 0.32 [0.14, 0.53]), against J166's 0.18 [0.04, 0.36].
  - By kind: priority 18 of 72, attack 8 of 23, block 1 of 2.
  - By k: 2 options 2/9; 3-4 options 12/53; 5-6 options 11/29; 7-8 options 2/6.
- **Mean regret at Forge's choice 4.7 [2.7, 7.3] points** (J166 3.5). Best-worst gap 13.1 [10.2, 16.5]. No decision was
  decided or settled.
- **The Forge-map spines (s01, s07, s13; J166's plan):**
  - **C1 on s01: +4.1 [0.9, 7.5], HOLDS** (J166's value, unchanged).
  - **C1 on s07: -5.3 [-9.5, -1.8], NOT SHOWN** (n 5).
  - **C1 on s13: -2.1 [-3.4, -1.2], NOT SHOWN** (n 3).
  - On s07 and s13 the whole interval lies below zero. That is a candidate reversal only, on 5 and 3 decisions.
  - Pooled over the three (information): -0.0 [-7.2, 4.1].
  - The Forge map's own C1: +5.5 / -1.3 / +1.5.
  - For comparison, J162's per-pair C1: pauper5 HOLDS, modern7 HOLDS, synergy9 NOT SHOWN, ff5 NOT SHOWN.
  - Random-map C1 on the other ten spines (information): +4.4 [1.9, 7.5], n 56.
- **Agreement on the Forge-map spines:**
  - Same best 0.46 [0.22, 0.79] (s01 0.50, s07 0.63, s13 0.25).
  - ρ 0.23 [-0.16, 0.86] (0.19, 0.60, 0.02).
  - confidentForge 2 (s01 d7, s07 d7).
- **Guardrails:** 0 violations, X=0 never paid, refusedCast 266 against payfail 153.
- **D483:** 235 listings with identities (829 options), 0 short, 0 plays repeated, 5 shared tokens. s01-s03's kChanged is
  10 listed, 8 branched (as measured).

## (6) For J169

- **Rerun nothing that stands.** Keep s01-s04, s07, s08, s09, s11, s12 and s13 as they are. s13 has 14 Tamiyo fizzles,
  ≤7 rows of a decision, so its labels can stay. s07's Scarlett drop is Forge's own play.
- **Re-check s06, s10 and s13 under D485's checker** (checks only, as J167 re-checked s02 and s03). D485's checker must
  also cover s13's shape: a token that died, named as a stale target.
- **Quarantine until D485's seat is in:**
  - **all of s05.** The spell is lost in 18% of its branches, Suplex is an option at 5 of its 8 decisions, and d8's
    confident label is void.
  - **all of s10.** 8.7% of its branches are touched, every label is touched, and 4 of its confident labels fall to the
    exclusion.
  - **s06 d2, d6 and d8.** d6 flips.
  - Then **re-branch s05, s10 and s06 fresh at the same seeds on D485's tree.** At this night's walls that is ~2 h 55
    at 6 workers, and the cleanest way to get those labels back. s02's 4 touched labels need nothing (≤3 rows).
- **Count lost casts from the frames (or a seat counter), never from the worker logs.** On s05 the logs show 453 of 991.
  D485's counter should come with a check that fails when an option's own forced cast is lost in more than a handful of
  its branches. 4 of s05's options were lost in every branch, and nothing flagged them.
- **The design (k, the Forge map, the screen bounds):**
  - **k >= 3 by plays:** keep it. Fill was needed on only 2 spines (8 decisions).
  - **The Forge map on 3 of 13:** keep it. C1 now has a positive and two negative spines on tiny n, a reason to keep
    measuring rather than to change.
  - **The screen at .04 / .96:** keep it. It saved 16.6% and settled nothing that the lost spells unsettle.
- **Sizing:** a spine takes ~47 min at 6 workers, so a 7-worker 10-h night holds ~12 spines (not 13). That gives ~25-30
  confident labels.

**Unsure of:**

- **The frame signature.** I verified it by hand on three s05 branches and on s02, s06 and s10, where it matches the logs
  to within 2. s05's log undercount is unexplained.
- **Scarlett's count** (118 frames against 138 log lines) uses a command-zone heuristic.
- **The controls** compare against random drops of the same size; they are not a model of the bias.
- **The bootstrap.** My intervals use my own RNG. Every point matches atlas.json, and the intervals are within ~0.5
  point.
- **D484's rows:** whether they differ because of the Circle or because of the guard's choice.
- **The exileLinksLost** reading on s05.
- **The C1 reversals** rest on 5 and 3 decisions.
