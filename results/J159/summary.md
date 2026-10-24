**Forge-pilot caveat:** every game was played by Forge's Default AI in both seats. J141 found that the live search seat lifts every colour about equally (+8.9 points). So a payoff measured with Forge alone is the right first cut, but these payoffs are Forge's.

# J159 — Omega balance, night 0 of the swap rule (J145 on fresh seeds): summary

Written by the PC session, 2026-10-24 (the reading by an Opus lane, the file by the main session), from:
- **The read:** `night0-gates.md`/`.json`, `balance.md`/`.json` (the night's own file this time; see *Known gaps*), `counts.json`, `card-shares.tsv`, `coverage.json`, `real-drafts.json`.
- **The run:** the checks, `metrics.json`, the pilot's checks and metrics, STATUS, `events.jsonl` and the step logs; the data folder `/home/justin-a/code/lab/data/lab-j159/`.
- **The rules:** the job file's `rule:` (origin/pc-jobs `jobs/J159-balance-night-0.md`); `study/omega-swap-rule.md` with Justin's answers of 2026-10-23, under which the night was registered; and `study/omega-swap-rule-v2.md` with `study/omega-balance-model.md` and `study/omega-balance-model/model.json`, the library loop that replaced the one-swap rule on 2026-10-24.
- **For comparison:** J145's `balance.json` (the night's real file) and `summary.md`.

**What the night was.** J145 again, with the cube unchanged (`cubes/omega-cube-180.md` byte-identical to J145's pin), on fresh seeds: drafts from 816,500,001, game seed bases 1661 / 1662 / 1663, census seed 1665. Its registered job was one reading: is UG's low drafted payoff (J145: .423, .382–.465) still below .5 on new seeds?

## The verdict under the rule as registered: UG NOT CONFIRMED
UG's arm-B payoff (Blab, lab vs lab) is **.453 (.406–.500), 470 deck-games**. J145's was .423 (.382–.465) on 544, shown for reference and never pooled. The rule confirms UG only when the interval's high end is below .5, and it is not. Quoted from the rule: "If not, stop. There is nothing to swap." No swap is registered or made.

| gate (only the first decides tonight) | this night |
|---|---|
| 1. UG's arm-B interval vs .5 | .453 (.406–.500), 470 deck-games: not below .5. UG qualifies (400+); its label is UNCLEAR |
| 2. any colour OFF (Blab, band [.45, .55]) | none. W .505 EVEN, U .477 EVEN, B .501 EVEN, R .530 UNCLEAR, G .481 EVEN |
| 3. any qualifying pair (400+ deck-games) OFF | none of the seven: WU, WB, WR, WG, UB, UR, UG |

- **The colour verdict is BALANCED ON PAYOFF again.** No colour is OFF on Blab. Two labels swapped places with J145's:
  - **Red** went EVEN to UNCLEAR. The point barely moved (.527 to .530); the interval's top went from .548 to .552, over the band's edge.
  - **Green** went UNCLEAR to EVEN (.468 to .481).
- **BR reads OFF but does not qualify.** It is .582 (.522–.647), and its interval now excludes .5, but it has 280 deck-games against the 400 a gate needs. The lab drafter built it in .036 of its two-colour decks.
- **UG has fewer games because the lab drafter built UG less:** .062 of its two-colour decks, against J145's .071.

### Why the gates say NOT CONFIRMED at an upper end of exactly .500
- **The interval's top is one bootstrap replicate, exactly one half.** `balance.py`'s percentile takes a replicate's own value with no interpolation. Each replicate is weighted wins over weighted deck-games, a ratio of integers, and at this n the nearest ratio that is not one half is about .001 away. So the .5000 in `balance.json` is .5 exactly, not .4999… rounded up.
- **The rule needs the top end strictly below .5** (`ug['hi'] < .5`). The rule was always going to be decided at one edge of the interval. This night landed on that edge, and the rule is strict about it.
- **The runner says done, 16/16 checks.** `g0.code` is 0 (NOT CONFIRMED). That is a verdict, not a failure; −1 (INCOMPLETE) would have failed the check.

### What the verdict means now
On 2026-10-24 Justin replaced the one-swap rule with the library loop (`omega-swap-rule-v2.md`). So "the swap programme stops" ends a chain of Omega swaps that the new rule had already dropped; v2 had already said night 0 "no longer starts a chain of Omega swaps". v2 kept the night for two other jobs. Those are the next two sections.

## What the night is now worth (1): the first fresh-seed re-measure of a whole balance night
Same cube, same drafters, same read, different seeds. Every change below is night-to-night noise, plus whatever the drafter does differently on new packs; nothing about the cube changed. In the tables, **z** is the change over √(se₁² + se₂²), with each se taken as the interval's width / 3.92.

**Arm B, lab vs lab (Blab, the judged arm):**

| Blab | J145 | n | J159 | n | change | z |
|---|---|---|---|---|---|---|
| W | .495 (.475–.513) EVEN | 2,982 | .505 (.485–.524) EVEN | 2,898 | +.010 | +.74 |
| U | .480 (.459–.498) EVEN | 2,756 | .477 (.458–.496) EVEN | 2,804 | −.003 | −.21 |
| B | .519 (.498–.538) EVEN | 2,672 | .501 (.481–.520) EVEN | 2,604 | −.018 | −1.23 |
| R | .527 (.506–.548) EVEN | 2,222 | .530 (.509–.552) UNCLEAR | 2,220 | +.003 | +.21 |
| G | .468 (.446–.489) UNCLEAR | 1,938 | .481 (.458–.503) EVEN | 1,930 | +.013 | +.84 |
| WU | .476 (.450–.501) | 1,564 | .492 (.466–.519) | 1,568 | +.016 | +.85 |
| WB | .525 (.483–.563) | 680 | .544 (.502–.585) | 616 | +.019 | +.64 |
| WR | .545 (.507–.578) | 850 | .530 (.496–.565) | 826 | −.014 | −.57 |
| WG | .472 (.428–.510) | 576 | .473 (.433–.511) | 662 | +.001 | +.02 |
| **UB** | .515 (.491–.540) | 1,616 | .483 (.456–.508) | 1,578 | **−.033** | **−1.79** |
| UR | .517 (.481–.554) | 806 | .511 (.475–.545) | 788 | −.006 | −.23 |
| UG | .423 (.382–.465) | 544 | .453 (.406–.500) | 470 | +.030 | +.95 |
| BR | .563 (.496–.634) | 238 | .582 (.522–.647) | 280 | +.019 | +.40 |
| BG | .521 (.464–.578) | 382 | .487 (.434–.540) | 388 | −.034 | −.85 |
| RG | .497 (.444–.553) | 350 | .542 (.493–.589) | 380 | +.045 | +1.22 |

- **No Blab cell's two intervals fail to overlap.** UB is the only cell where each night's point falls outside the other night's interval (.515 to .483, z −1.79). Every other point lies inside the other night's interval.
- **The size of the noise, from these two nights:**
  - **Colours:** the RMS change is .011, at 1,900–3,000 deck-games a cell. The intervals predicted .015, so the colours moved less than their intervals allow. The largest change is black's −.018.
  - **Pairs:** the RMS change is .025, against .031 predicted, at 240–1,600 deck-games. The largest is RG's +.045, on 350–380.
  - **One night's own error** is the change divided by √2: about ±.008 for a colour and ±.018 for a pair.
  - **Across all 15 cells,** the two nights correlate at r .80, with an RMS difference of .022.
- **Labels are less stable than the numbers.** Two of five colour labels changed (red and green) on changes of +.003 and +.013, because both cells sit near an edge of [.45, .55].

**Arm C, the pool (2,000 random decks from Omega's list):**

| C | J145 | n | J159 | n | change | z |
|---|---|---|---|---|---|---|
| W | .507 (.489–.525) EVEN | 3,771 | .490 (.472–.507) EVEN | 3,677 | −.017 | −1.31 |
| U | .445 (.429–.462) OFF | 3,754 | .438 (.421–.456) OFF | 3,756 | −.007 | −.58 |
| B | .493 (.474–.510) EVEN | 3,736 | .502 (.484–.520) EVEN | 3,611 | +.009 | +.69 |
| R | .508 (.489–.524) EVEN | 3,640 | .508 (.491–.525) EVEN | 3,648 | .000 | −.01 |
| G | .457 (.441–.474) UNCLEAR | 3,566 | .464 (.446–.481) UNCLEAR | 3,621 | +.007 | +.58 |
| WU | .475 (.433–.520) | 680 | .499 (.453–.544) | 623 | +.024 | +.75 |
| WB | .538 (.499–.576) | 692 | .498 (.455–.540) | 610 | −.039 | −1.34 |
| WR | .520 (.475–.567) | 602 | .533 (.496–.568) | 668 | +.013 | +.44 |
| WG | .470 (.421–.516) | 536 | .468 (.426–.512) | 538 | −.002 | −.05 |
| UB | .455 (.412–.496) | 642 | .449 (.406–.496) | 510 | −.006 | −.19 |
| **UR** | .496 (.455–.538) | 538 | .441 (.397–.481) | 590 | **−.056** | **−1.84** |
| **UG** | .424 (.388–.465) | 672 | .468 (.429–.509) | 630 | **+.044** | **+1.56** |
| BR | .504 (.459–.545) | 579 | .541 (.504–.580) | 708 | +.037 | +1.25 |
| BG | .468 (.427–.514) | 532 | .478 (.433–.528) | 558 | +.010 | +.32 |
| RG | .522 (.480–.565) | 542 | .519 (.476–.558) | 696 | −.003 | −.11 |

- **Every colour label held:** blue OFF, green UNCLEAR, the others EVEN. The RMS change is .010 over colours and .030 over pairs.
- **UR and UG each moved outside the other night's interval, both ways.** BR's J145 point falls outside J159's interval, and WB's J159 point outside J145's. No two intervals fail to overlap.
- **The pool's UG** is .468 (.429–.509). J145's .424 was the second half of UG's "low in both arms" reading, and this night its interval includes .5.

**The context arms (Bhp, Bfr; in `balance.json`)** have 500–900 deck-games a colour and 76–500 a pair.
- **Colours:** Bhp's white moved +.047 (.478 to .525, z +1.89). Every other colour moved by .039 or less.
- **Pairs:** the large moves are on thin cells: Bhp BG −.155 (z −2.27, 96 and 100 deck-games), Bfr BR +.155 (z +1.95, 82 and 92), Bhp RG −.104 (78 and 76).

**Moved cells, all four arms (60 cells):**
- **No cell's two intervals fail to overlap.**
- **Six cells have each point outside the other's interval:** Blab UB, Bhp W, Bhp BG, Bfr BR, C UR and C UG.
- **One cell has |z| > 1.96** (Bhp BG), where about 3 would be expected by chance if nothing changed. No correction for multiple comparisons is applied, and none is needed for a description.
- **This is the noise floor the library loop must beat:** a Blab colour moves about ±.011 from night to night, and a pair about ±.025.

## What the night is now worth (2): the card model's first transfer test
`omega-balance-model.md`'s appendix predicts Omega's drafted payoffs from the census's card values (lab-j144: 80,000 random library decks). It adds them up over an analytic deck mix: 9.1 cards a colour, 0.45 gold and 4.2 colourless, with each card weighted by how often the builder plays a card of its rating.
- **When it was made:** it was committed at 01:48 (5e1577b2), from lab-j144 and lab-j145 inputs only (`model.json`'s `inputs`). J159's read ran at 02:01. So nothing of J159 entered it.

| cell | model (interval) | J145 | J159 | J159 − model |
|---|---|---|---|---|
| W | .512 (.488–.536) | .495 | .505 | −.007 |
| **U** | .448 (.426–.475) | .480 | .477 | **+.029** |
| B | .526 (.498–.557) | .519 | .501 | −.024 |
| R | .528 (.502–.556) | .527 | .530 | +.003 |
| G | .487 (.460–.519) | .468 | .481 | −.006 |
| WU | .468 (.434–.495) | .476 | .492 | +.025 |
| WB | .529 (.496–.560) | .525 | .544 | +.015 |
| WR | .538 (.511–.568) | .545 | .530 | −.008 |
| WG | .498 (.468–.528) | .472 | .473 | −.025 |
| UB | .480 (.452–.510) | .515 | .483 | +.003 |
| **UR** | .474 (.445–.507) | .517 | .511 | **+.037** |
| UG | .440 (.414–.470) | .423 | .453 | +.013 |
| **BR** | .547 (.515–.579) | .563 | .582 | **+.035** |
| BG | .512 (.480–.542) | .521 | .487 | −.025 |
| RG | .515 (.487–.545) | .497 | .542 | +.027 |

Bold marks the three J159 cells that fall outside the model's own interval.

- **RMSE of the model against this night (Blab):**
  - **Colours:** .017.
  - **Pairs:** .024.
  - **All 15 cells:** .022, with r .79 and a mean bias of +.006.
  - **Against J145's measured cells:** the same prediction scores .018, .022 and .021 (r .80). The model is as close to a fresh night as the previous night is (.022, r .80).
- **How much of that is the measurement:** one night's own error over these 15 cells is about .019 (RMS). That leaves about .011 for the model, under the model's stated SD of .014–.016 a cell.
  - **Against the model's interval and this night's together,** the RMS z is .94, and all 15 cells fall within 95%.
  - **Against the model's interval alone,** 12 of 15 fall inside (U, UR and BR do not).
  - **So the extra transfer error is not distinguishable from 0 on this night.** v2's simulation ran at 0, .015 and .03, and this night is consistent with its 0–.015 cases, not .03.
- **UG:** the model said .440. J159 measured .453 and J145 .423, so the two-night mean of .438 sits .002 from the prediction.
- **Blue:** the model said .448. J159 measured .477 and J145 .480. This is the same miss twice:
  - **Two-night mean:** +.030 over the prediction, with the two nights' combined se about .007, so z 2.1 against the model's interval.
  - **UR misses the same way twice:** +.043, then +.037; two-night mean +.040, z 2.0.
  - **The model's two largest misses that repeat are both blue, both high.** It undervalues blue as the lab drafter drafts it. This fits J145's reading that drafters find Omega's strong blue cards and pass the weak ones, which an additive card sum over a rating-weighted mix would miss. Arm C, the random decks, does not show it: pool blue is .438 against the model's .448.
- **The reviewer's point holds:**
  - **What the r .84 / RMSE .027 validated:** the census's card values, summed over the decks J145 actually drafted. That is a card-level test on J145's own decks.
  - **The night-level prediction is a different number.** It is the analytic mix applied to the cube, and that mix and its play curve were fitted on J145's lab decks. So J145 is not out-of-sample for it.
  - **J159 is the first out-of-sample test of the night-level prediction:** RMSE .022 over 15 cells, on one night. The cells are correlated, since pairs share colours, so 15 cells is fewer than 15 independent checks.

## Pull (arm A): information only
Pull is not judged (fewer than 30 real Omega decks). The lab drafter's pull repeated J145's within .011 on every colour: W .490, U .587, B .377, R .297, G .249, against J145's .485 / .598 / .382 / .294 / .242. Its pairs repeated within .011 too: WU .214 and UB .209 lead, BR .036, RG .050 and BG .051 trail.
- **The lab drafter built 2 mono decks** (one white, one green), 3,836 two-colour decks and 162 three-colour decks. WUB is the one triple with 40+ decks: 43 of the 162 decks, a share of .265.
- **The human-pick model** again over-drafts black (.556) and drafts green least (.129). Its coverage is unchanged: 105 of 180 cards.
- **Forge's ranks** follow the lab drafter again.

## Real drafts
**The fetch now answers, with 3 Omega decks.** J145's fetch and the first J159 draft both asked the coach helper's ledger for cube id `omega-cube-180`; the ledger files Omega's decks under `omega`. Commit 3cc89091 on pc-jobs (2026-10-23 21:14) fixed the job file, and `real-drafts.json` reads `{"ok":true, … 3 decks}`.
- **The three decks:**
  - two room grid drafts from 2026-10-17: one with 3+ spells in all five colours (W3 U9 B5 R5 G6), and one WR;
  - one solo deck, BR.
- **They are shown and not judged:** 3 is under 30.

## Arm C's decks
- **The draw:** 2,000 decks from all 180 cards; every deck is 40 cards and castable.
  - **The makeup prior:** k 715 / 656 / 629. By colours with 3+ spells: 841 / 799 / 360.
  - **Redraws:** 28 draws were rejected and redrawn.
- **The repeat cap never bound.** The largest share of the k=1 decks is .203 (Preordain).
- **The repeat within a colour is structural (D456):** a card sits in a median .81 of the mono decks its colour admits.
- **Never drawn:** Mishra's Factory and Mutavault, as in J145.

## The run (EDT)
- **Pins:** mtg-table db49609 (merged == 1) and ForgeCoach 866c256. The pick file's sha256 matched (9ee28421…).
- **Workers:**
  - **Sizing:** 6, the minimum of cores 7, memory 6 and max_workers 7. Peak worker RSS measured **2.31 GB**, against 3 GB declared (J145: 2.24).
  - **STATUS's "workers: 5"** is the count at the end. Pressure dropped the job to 5 at 01:50:53 (some avg10 23.3%, swap-in 2,758/s) and to 4 at 01:52:05 (swap-in 5,927/s). It went back to 5 at 01:57:15 and finished there.
  - **The pressure came from outside the job.** The job itself held 9.7 GB of its 21.4 GB budget at the first drop. The window coincides with the balance-model lane's work on this PC: it committed at 01:48 and 01:54.
- **The steps:**
  - **prepare:** 00:14:37–00:22:21. The bridge lint, the build and the self-tests.
  - **The pilot:** 00:22:21–00:24:25, 29/29 checks.
    - **pilot1:** the test suites passed 30/30. The read's planted self-test read black OFF and the others EVEN. The gates' four planted documents gave the registered answers: low → CONFIRMED, even → NOT CONFIRMED, thin → CONFIRMED with green OFF, none → INCOMPLETE.
    - **pilot2:** 6 drafts for each drafter, 12 arm-B games each, and 60 census decks in 40 games: 76 games, 0 errors, 0 record problems and 0 leaks.
  - **run1, the drafts:** 00:24:25–00:26:23. hp 24 s, fr 23 s, lab 61 s: 3,200 drafts.
  - **run2, arm B:** 00:26:23–01:07:02 (41 min), 6,400 games. B-lab ran at 9,130/h, B-hp at 10,625/h and B-fr at 9,663/h. J145's arm B ran at 7,015–8,769/h over 46 min.
  - **run3, arm C:** 01:07:02–02:01:30 (54 min), 8,000 games at **8,837/h**, against J145's 10,281/h over 47 min.
    - **The cumulative rate** sat at 6,800–7,300/h through the first 1,800 games and climbed to 8,990/h by game 6,000.
    - **The worker drops** came in the last 10 minutes.
  - **run4, the read:** 14 s. **run5, the gates:** 14 s.
- **Totals:** **1 h 47 min** (00:14:37–02:01:58), against ~2.5 h estimated (J145: 1 h 38 min).
  - **Games:** 14,400 with **0 engine errors**.
  - **Timeouts:** **6**, all in arm C, among its 8 draws. Arm B had none.
  - **Checks:** **16/16**.

## Storage
- **On the data folder:** `lab-j159` is **984 MB**, against ~1.0 GB estimated (J145: 987 MB).
  - **By folder:** census 451 MB, games 392 MB, runs 103 MB, prof 31 MB, pilot 6.3 MB, out 1 MB.
- **Rows a game:** B-lab 60.9 KB, B-hp 58.3 KB, B-fr 60.5 KB and C 54.0 KB (J145: 62 and 56).
- **The record checks:** all 14,400 games were recorded in rows mode in 4 of 4 arms, with 0 problems and 0 row problems. The leak check ran 4,802 times and found **0 leaks**.
- **Free space:** 681.7 GB at the end.

## Known gaps
- **J145's collect gap is closed.** The self-test's output is now collected as `selftest-balance.json`. The `balance.json` here is the night's own file, with the same sha256 as the data folder's (ca81a64a…).
- **The noise estimate rests on two nights.** "Moved beyond the intervals" compares 60 cells with no correction, and z uses interval width / 3.92 as each night's se.
- **The model test is one night and 15 correlated cells.**
  - **The mix is J145's:** the analytic mix and play curve came from J145's lab decks.
  - **Arm C is not the test:** the prediction is for drafted decks, so arm C is shown only to note that the blue miss is a drafted-deck effect.
- **UG had 470 deck-games against J145's 544,** because the lab drafter built UG less (.062 against .071).
- **BR, BG and RG stay under 400 deck-games:** 280, 388 and 380. No gate reads them, and under v2 they are the thin pairs that slow an "every pair EVEN" bar.
- **Arm C ran 14% slower than J145's,** probably from load beside the job (see *The run*). No game was lost.
- **Every game is Forge-piloted.** Pull is a bot story until 30 real drafts.
- **Closeness is reported only** (`balance.md`). Blab overall: winner's life 19 (14–24), turns 18 (15–21), within a point and a turn of J145's.

## What it says
Under the registered swap rule, UG is NOT CONFIRMED. Its lab-vs-lab payoff on fresh seeds is .453 (.406–.500) on 470 deck-games, and the interval's top is exactly .5, not below it. So the one-swap programme stops, as the rule says, and Justin's library loop had already replaced it. Omega is again BALANCED ON PAYOFF at colour level: no colour OFF; red UNCLEAR at .530, green EVEN at .481.

Read beside J145 on the same cube and method, the night measures the noise. Blab colours moved .011 RMS and pairs .025 RMS from one night to the next, inside what their intervals allow. No cell's two intervals failed to overlap in any arm. UB (.515 to .483) is the one Blab cell where each night's point left the other's interval, and two colour labels changed on edge cells.

The census card model's night-level prediction made before this night was read scores RMSE .022 over the 15 Blab cells (colours .017, pairs .024). That is the same as the previous night's distance from this one (.022). It is consistent with the model's own intervals plus measurement noise. One miss repeats on both nights and is the model's, not the night's: blue as the lab drafter drafts it, .448 predicted against .477 and .480 measured, with UR the same way. UG is predicted to within .002 of the two-night mean.
