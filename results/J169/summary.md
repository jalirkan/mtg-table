# J169: move atlas 4a, night four (stale targets mended): summary

Written 2026-10-25 by a read-only pass: no engine, no browser, nothing written on the data folder. Numbers come from
`results/J169/` (labels*.json, reads.json, cuts.json, tool.json, lost-*.json, recheck-*.txt, draws.json,
validation.json, run1-5.log, STATUS), from the spine folders' own `atlas.json` / `atlas.j168.json` / `branches.jsonl`,
and from five small scripts of mine in `report/bin/` that read the frames and pair J168's rows with J169's.
**These are the last labels of the old random seat (pre-D486, contract v3). J170 is a new population: pool nothing
across D486.**

## The run

- 20:55-23:35 EDT, 2 h 41 min (estimate 2.75 h). 6 workers, peak worker RSS 1.56 GB. run1-run5 all exit 0.
- **50 of 50 final checks pass, 80 of 80 pilot checks.** `atlas.problems` 0, 0 engine errors, 0 timeouts, 0 unit errors.
  72,075 branch rows over 13 spines (J168 71,525 + 150 on s06 + 400 on s10).
- The pilot's self-tests reproduced J168's numbers (labels, reads, cuts, metrics, and the lost-cast scan on six spines).

## (1) s06 and s10, re-branched on D485, against J168's

Full table per decision: `report/s06-s10-compare.md`.

| | s06 J168 | **s06 J169** | s10 J168 | **s10 J169** |
|---|---|---|---|---|
| branch rows | 7,350 | **7,500** | 5,875 | **6,275** |
| labels / confident | 8 / 5 | **8 / 5** | 8 / 4 | **8 / 4** |
| wall at 6 workers | 75.3 min | 79.5 min | 52.3 min | 55.4 min |
| mean random branch | 3,023 ms | 3,121 ms (+3%) | 2,802 ms | 2,820 ms (+1%) |
| options stopped early | 28 | 26 | 11 | 7 |
| lost casts (frames) | 212 in 201 branches | **0** | 514 in 512 branches | **0** |
| `failed to target` log lines | 214 | **0** | 515 | **0** |
| `retargeted` rows (sum) | - | **207 (218)** | - | **537 (538)** |
| `staleRefused` | - | 0 | - | 0 |

- **Same decisions, same baseline.** The baseline is Forge on both seats, so D485 does not touch it: both spines list
  the same decisions and branch the same ones. The extra rows come from options that early stopping no longer cut.
- **Which spells were re-targeted** (decision records with `why: "STALE_TARGETS"`): **s06**, A's Knockout Maneuver 115
  and Troll Negotiations 103. **s10**, B's Troll Negotiations 524 and Tear Asunder 14. These are the cards J168 lost,
  in about the same number of branches (207 against 201 on s06, 537 against 512 on s10).
- **Paired against J168, branch by branch** (`report/paired-rows.json`; same seed, same index):
  - Decisions with no stale list play **identical games**: s06 d10-d21 match all 4,975 of 4,975 rows.
  - s06's re-targeted rows: score unchanged in 181 of 204, **up 21 for A, down 2**. A's own spells now resolve.
  - s10's re-targeted rows: unchanged in 367 of 514, **down 111 for A, up 36**. B's Troll Negotiations now resolves.
- **What the bias read predicted, and what happened.** All **5 doubtful labels stay confident, with the same best
  option**:

| label | J168 | J169 | J168's read said |
|---|---|---|---|
| s06 d6 | o4 3.5 [1.0, 6.5] | **o4 3.5 [1.0, 6.5]**, identical | loses confidence beyond chance |
| s10 d28 | o2 11.0 [2.8, 19.8] | **o2 9.0 [1.0, 17.5]** | loses confidence beyond chance |
| s10 d2 | o3 9.0 [0.5, 16.8] | **o3 11.8 [3.5, 19.8]** | marginal |
| s10 d10 | o1 8.2 [1.5, 16.5] | **o1 6.8 [1.2, 15.0]** (J168's drop had moved it to o2) | marginal |
| s10 d15 | o1 9.0 [2.8, 16.5] | **o1 7.2 [0.7, 14.8]** | marginal |

  - **The prediction was wrong for s06 d6 and s10 d28.** The real counterfactual (the spell resolves) moves s10's
    regrets by 1.5-3 points, which is about the size J168's drop-test expected. It does not take any label below zero.
    On s06 d6 only 1 of 36 re-targeted rows changed its score, and that one is on o1, outside the o0-o4 pair.
  - **Why the drop-test failed:** it drops rows chosen by something that happened after the option (a spell was
    lost). That is not a random drop, and its "beyond chance" control did not account for it. Prefer a re-branch over
    a drop-test.
  - Other moves: s06 d2's regret fell from 26.8 to 22.0 (Forge's own option o0 rose from .62 to .67) and is still
    confident. No non-confident label became confident.
- **A side effect, explained by the code.** 105 of s06's paired rows and 43 of s10's are **not** re-targeted, yet
  play a different game from the first random choice on. All of them sit in decisions that meet stale lists.
  - `Explorer.java:500` runs `staleTargets` on Forge's answer every time the seat lists its plays. A stale list draws
    from the seat's seeded stream (`legalTargetList`), even when the seat then picks another play.
  - Those rows are therefore new random games, not errors. This is consistent with D485's "only a decision that meets
    a stale list changes".
- **Lost casts after D485 on these two: 0**, at the options and anywhere else. `lostCastOptionsD485` 0 and
  `lostCastsD485` 0, against J168's 726.

## (2) The re-checks

- **All three pass.** J168's s06 and s10, re-checked in their `.j168-stale` folders, and s13, re-checked in place. Each
  shows exit 0, 0 problems, rows and units unmoved, nothing played, and J168's timing kept (`recheckJ169Ok` 3).
  - The checks took 133, 130 and 149 s.
  - J168's failed frame logs, 2 + 16 + 6, now read 0.
- **What the new rule accepted:** `atlas.json` keeps no count of it.
  - I ran D485's `check-redaction.mjs` on the 12 failed logs J168's atlas names (s06 2, s10 5, s13 5): **all PASS,
    each with "M55 decision ids that ceased to exist=2"** (`report/recheck-ceased-sample.txt`).
  - The other 12 of the 24 are not named in any file. I did not hunt for them.
- **J167's re-check** of s02 and s03 still reads 2 of 2 (`recheckOk`).

## (3) The pre-D486 population, final

**13 spines, 136 branched decisions, 97 labels, 27 confident** (`confidentForge` 2), 39 screened, 0 void. Confident
share 0.278 [0.142, 0.449]. s05's 8 rows are marked `biased: "lost-cast"` and its d8 is `lostCastVoid`.

| sizing (confident labels per 7-worker 10-h night) | confident | per night | Poisson 95% |
|---|---|---|---|
| **s05 out, the headline** | 26 | **32.0** | 20.9-46.9 |
| all 13 as run | 27 | 30.7 | 20.2-44.7 |
| all 13, s05 d8 voided | 26 | 29.6 | 19.3-43.3 |
| the two D485 spines alone | 9 | 46.7 | 21.4-88.7 |
| J168 (all 13 / s05 out) | 27 | 31.1 / 32.4 | 20.5-45.2 |
| the review | | ~25-27 | |

- More in `report/sizing.md`. **The night lands at 30-32, a little above the review's 25-27, with the interval still
  about ±40%.** J168's strict and middle reads (24.2 and 27.6) are superseded: the doubtful set is now s05 d8 alone.
- **The cuts:** 31.4% of branch time saved (early stopping 14.7%, the screen 16.8%, 39 screened, 129 options stopped).
  The checks took 0.49 h, 24.5 s per 1,000 games. Idle share was 11.6%. J168 read 31.9%, 135 and 25.2.
- **C1 "cast now where Forge passes", unchanged from J168** (none of the three was re-branched):
  - **s01 +4.09 [0.87, 7.52], HOLDS.**
  - s07 -5.30 [-9.50, -1.80], NOT SHOWN (n 5).
  - s13 -2.10 [-3.38, -1.17], NOT SHOWN (n 3).
- **Agreement on the Forge-map spines:** same best 0.458 [0.219, 0.792]; ρ 0.228 [-0.160, 0.862].
- Random-map C1 on the ten spines without a Forge map (information): +4.50 [1.97, 7.55], n 56. J168 read +4.39; s06
  and s10 moved from +4.9 to +5.4 and from +4.0 to +4.5.
- **D483 and D484 checks:** 0 short listings, 0 repeated plays, and the ChooseSource guard on s05 only (537 rows, 6,187).
  D485's `retargetedOffD485` reads 0.

## (4) Lost casts over all 13, and what is still biased

Full table: `report/lost-casts.md`.

- **1,652 lost casts in 1,159 branches.**
  - **s05: 1,614**, A's Suplex 991, Abrade 600 and Branching Bolt 23 (all modal). 850 are forced, and 5 lost-cast
    options. Unchanged; it is D486's.
  - **s01: 29**, B's Pyrotechnics 18, Suplex 10 and Rolling Thunder 1. None forced, at most 5 of any option's 200
    branches, and 2 of the branches are in the Forge map. **New:** the self-test never scanned s01.
  - **s02: 7**, A's Tear Asunder.
  - **s07: 2**, B's Vicious Rivalry.
  - **s06 and s10: 0** (J168's 726). The other eight spines: 0.
- **Biased labels: s05 only** (8 rows; d8's confident label is void).
  - s01, s02 and s07 have lost casts in 9 label rows, at most 13 branches of a decision's 530 (s01 d3). The one
    confident label among them, s01 d7, has 6 of 1,110.
  - None of these is near a lost-cast option. I would keep them unmarked.
- **Should a future model use v1-v3?** D486 changes the random seat everywhere: it targets cards by itself and draws
  modal modes. That changes the random map's value of nearly every option, not just the 3-9% of branches D485 touched.
  - **Recommendation: pool nothing across D486.** Keep v1-v3 as a frozen, held-out "old seat" set and never train on
    it.
  - Its one good use: J170 re-runs the same 13 spines at the same seeds over the same Forge baselines. Every decision
    can be paired old seat against new, which measures how much a label depends on the rollout policy. Use s05 there
    as information only.
  - If nobody wants that comparison, discarding v1-v3 loses nothing a model needs.

## (5) Odd or worth knowing

- **`missing.txt` is empty**, and nothing is missing.
- **`labels.jsonl` is not in `results/J169/`.** Only `labels-head.jsonl` (20 of 136 rows) was collected. The full set is
  on the data folder at `lab-j166/report/labels.jsonl` (379,717 bytes). Copy it if pc-results should hold the labels.
- **`validation.json`:** 13 folders and 26 decks, sha `7def89fa…` as registered, never branched.
- **`draws.json`:** every registered draw matches (the twelve, s04, s05, s06, s10, J166's s04, the validation draw).
  `spinesAsRun` (`faee7df3…`, 26 decks) has no registered twin and is information only.
- **Expected lines that look odd:**
  - `exits.txt` still holds J168's `3` lines for s06, s10 and s13, with J169's `0` lines for s06 and s10 appended.
  - `spine-times.txt` names s06 and s10 twice. The readers used `spine-times-asrun.txt`, which renames J168's lines
    `.j168-stale` (s06's wall 4,767 s confirms it).
  - `recheck-*.txt` carry J167's s02 and s03 lines too.
- **Carried over from J168, unchanged:**
  - 9 warnings, all s01's turn-cap options.
  - 2 errored rows, s12's IndexOutOfBounds on `attack:none`.
  - `exileLinksLost` 2,000 (all s05).
  - payfail 153 log lines: J169's s06 has 3, as J168's did.

## (6) For J170, the first D486 night

- **Lost casts at 0 and refusals counted:** `lostCasts` 0 on s05 (Suplex, Abrade, Branching Bolt) and on s01
  (Pyrotechnics, Suplex, Rolling Thunder); `lostCastOptions` 0 on all 13; and `staleRefused`, which should now fire on
  divided damage (Pyrotechnics, Rolling Thunder) where D485 refuses rather than re-targets.
- **Pair it with J169 decision by decision** (same seeds, same baselines): how many of the 26 unbiased confident labels
  keep their best option and their confidence. Watch the walls, the capped share and ms per branch too: a seat that
  targets cards may play longer games.
- **The redaction check on new shapes:** the random seat now names the opponent's cards as targets and records modal
  modes. `atlas.problems` must stay 0 with no new checker exemption.

## Unsure of

- **The cause of the 148 diverged non-re-targeted rows** comes from my reading of `Explorer.java` (the stream drawn in
  `staleTargets`). I did not trace one game to the draw.
- **The ceased-to-exist count** covers 12 of the 24 logs.
- **Card names and owners** (Pyrotechnics, Suplex, Rolling Thunder, Branching Bolt) are mine, from frames and deck
  lists. The caches hold ids only.
- **The Poisson intervals** are my exact-interval computation, scaled. They reproduce J168's 20.5-45.2.
- **The "drop-test was biased" reading** rests on two spines and five labels.
