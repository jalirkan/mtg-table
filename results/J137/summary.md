# J137: Synergy v2 against the designed v3 (eight swaps), 1,500 drafts each on the same seeds

Written by the PC session, 2026-10-17. Sources:
- J137's files: `v2v3.json`, `v2v3.md`, `compare.json`, `compare.md`, `checks.txt`, `metrics.json`, `STATUS`, `run1.log` and the pilot files.
- The run's own drafts: `var/lab-j137/compare/runs/synergy_v{2,3}/drafts.jsonl`, read-only, no engine. The card-flow regressions and the paired colour and pair differences below were computed from these. They are the PC session's, not the job's.
- The predictions: `study/synergy-v3-design.md`.

Run: 14:47:37 → 16:40:10 EDT on 2026-10-16 (1 h 53 m), 7 workers. Every pilot check (24) and every final check (17) passed. Pinned mtg-table@0c9bab7 and ForgeCoach@3e3b007. v2 sha256 `8cb5e5f0…`; v3 is `results/J135/synergy-cube-180.v3-designed.md`, sha256 `61989547fb03…`.

## The rule and the verdict

The rule was pre-registered in `synergy-v3-design.md` §4, written before any v3 draft. v3 is **BETTER BALANCED** if and only if both hold:
- v3's 95% interval for the pair spread lies wholly below v2's (v3's upper bound < v2's lower bound);
- no v3 pair with 40+ decisive games has a Wilson 95% interval lying wholly below 35%.

Anything else is NOT SHOWN.

| cube | pair spread | 95% interval (compare's paired, draft-clustered bootstrap) |
|---|---|---|
| v2 | 38.9 | [33.7, 44.3] |
| v3 | 27.1 | [20.8, 35.1] |

- **Spread:** v3's upper bound, 35.1, is not below v2's lower bound, 33.7. The intervals overlap by 1.4 points.
- **Pairs:** no v3 pair lies wholly below 35%. The lowest is RG at 35.5 [29.0, 42.6].

**Verdict: NOT SHOWN.**

The paired difference, which is description only and decides nothing, is v2 − v3 = **+11.8 [+3.2, +19.5]**. It excludes 0. The rule asked for two intervals that do not overlap, which is much stricter than "the difference excludes 0". The study's power check expected the intervals to separate at 1,500 drafts a side. It used a parametric bootstrap, and compare's draft-clustered, recentred bootstrap came out wider than that. **The rule was under-powered for the effect that actually occurred.** That is the study's miss, not the cube's. Nothing ships either way: Justin decides.

## v2 against v3 on the five measures (paired, 1,000 draft-clustered replicates)

| measure | v2 | v3 | v2 − v3 [95%] |
|---|---|---|---|
| **1. card flatness**, true SD, pts | 7.95 [6.99, 8.86] | **5.89** [4.81, 6.91] | **+2.05 [+0.75, +3.33]**, shown |
| **2a. pair spread**, pts | 38.9 [33.7, 44.3] | **27.1** [20.8, 35.1] | **+11.8 [+3.2, +19.5]**, shown |
| 2b. pairs within ±5 of 50% | 20% [0, 20] | 20% [10, 30] | 0 [−20, +10] |
| **3a. draws** (timeouts included) | 0.08% | 0.11% | −0.03 [−0.19, +0.11] |
| 3b. timeouts | 0.08% | 0.08% | 0.00 [−0.14, +0.14] |
| 3c. game length, turns | 19.35 | 19.58 | −0.23 [−0.49, +0.04] |
| **4a. lands** | 16.377 | 16.483 | **−0.106 [−0.125, −0.088]**, shown |
| 4b. colours (main + splash) | 2.167 | 2.183 | −0.015 [−0.031, +0.000] |
| 4c. two main colours | 100% | 100% | 0 |
| 4d. splash | 16.7% | 18.3% | −1.5 [−3.1, +0.0] |
| **5. first-pick top-10 share** | 12.7% | 12.9% | **−0.2 [−0.3, −0.1]**, shown |

ForgeCoach's own chi-square reading of flatness gives v2 7.95 [7.03, 9.27] and v3 5.89 [5.13, 7.07]. Both are still "uneven", with 164 cards read in each.

The shown deck-build difference is small. v3 builds slightly more 17-land decks, because its curve is heavier: Tolarian Terror is mana value 7, and Mist Raven and Sower are 4s. The first-pick shift is 0.2 points. Game length, draws and splash are not told apart.

## The colour pairs, both cubes

Rates are on decisive games. The intervals are Wilson with the study's design effect of 1.25. Each difference is paired: draft bootstrap, 1,000 replicates, seed 137.

| pair | v2 rate [95%] (games) | v3 rate [95%] (games) | v3 − v2 [95%] |
|---|---|---|---|
| **WB** | 71.2 [67.5, 74.6] (784) | 62.6 [58.5, 66.6] (680) | **−8.5 [−13.2, −3.4]** |
| **WR** | 68.9 [62.4, 74.6] (273) | 60.3 [52.0, 68.1] (174) | −8.5 [−18.0, +1.6] |
| **WG** | 64.3 [60.9, 67.6] (956) | 57.3 [53.7, 60.9] (907) | **−7.0 [−11.6, −2.6]** |
| **WU** | 58.2 [55.2, 61.1] (1,347) | 60.5 [57.6, 63.3] (1,418) | +2.3 [−1.3, +6.1] |
| BR | 48.2 [41.6, 54.8] (274) | 45.8 [39.5, 52.3] (288) | −2.3 [−10.7, +6.0] |
| BG | 46.9 [42.8, 51.0] (702) | 41.9 [38.0, 45.9] (738) | **−5.0 [−9.7, −0.1]** |
| RG | 36.3 [29.1, 44.1] (193) | 35.5 [29.0, 42.6] (231) | −0.8 [−9.9, +9.5] |
| **UB** | 39.8 [35.6, 44.1] (641) | 48.8 [44.7, 53.0] (686) | **+9.1 [+4.0, +14.4]** |
| **UG** | 33.3 [30.7, 36.1] (1,431) | 39.6 [36.9, 42.5] (1,453) | **+6.3 [+2.7, +9.7]** |
| **UR** | 32.2 [28.2, 36.5] (605) | 41.1 [36.9, 45.5] (625) | **+8.9 [+3.8, +14.2]** |

- **Blue pairs:** all three rose 6–9 points, each shown. In v3, UB is within a point of 50%.
- **White pairs:** three of the four fell 7–8.5 points; WB and WG are shown. WU, which has both levers in it, did not move.
- **The bottom moved.** In v2 the spread ran WB to UR. In v3 it runs WB 62.6 to RG 35.5. The weak end is now red-green, then BG at 41.9.
- **Still colour-level.** An additive colour model still fits both cubes: v2 χ² 2.54, v3 χ² 1.96, each on 5 df, largest |z| 1.10 and 0.67. In log-odds, blue went from −0.50 ± 0.08 to −0.11 ± 0.08, and white from +0.83 ± 0.09 to +0.56 ± 0.09.

## The colours: win rate when in the deck, and inclusion

| colour | v2 in % of decks | v2 win [95%] | v3 in % of decks | v3 win [95%] | win v3 − v2 [95%] | inclusion v3 − v2 [95%] |
|---|---|---|---|---|---|---|
| W | 46.7 | 63.8 [62.0, 65.6] | 43.8 | 60.1 [58.1, 61.9] | **−3.8 [−5.7, −1.8]** | **−2.9 [−4.3, −1.5]** |
| U | 55.7 | 42.5 [40.8, 44.2] | 58.3 | 48.4 [46.8, 50.1] | **+5.9 [+4.2, +7.6]** | **+2.5 [+1.0, +4.1]** |
| B | 33.3 | 53.1 [50.8, 55.3] | 33.1 | 50.3 [48.0, 52.5] | **−2.8 [−5.4, −0.1]** | −0.2 [−1.6, +1.2] |
| R | 18.8 | 43.5 [40.6, 46.5] | 18.2 | 43.7 [40.7, 46.7] | +0.2 [−3.6, +4.0] | −0.5 [−1.8, +0.8] |
| G | 45.5 | 45.4 [43.5, 47.3] | 46.6 | 44.7 [42.8, 46.6] | −0.8 [−2.8, +1.3] | +1.1 [−0.4, +2.5] |

The games are zero-sum. Blue's gain was paid for by white and, to a lesser but still shown degree, by black. Red and green did not move, so they now sit with the weak end.

## Card flow per deck, and its coefficient under each cube

Card flow is the study's 17 cards: cantrips, looters and cantrip artifacts, the ones that draw or filter without adding to the board.

| decks | v2 | v3 |
|---|---|---|
| every deck | 3.95 | 2.91 |
| with U | 5.21 | **3.33** (−1.88) |
| with W | 3.18 | 2.51 |
| with R | 4.82 | 3.88 |

The regression has one row per draft. The outcome is deck A's game share. The inputs are A-minus-B differences in each feature and in colour presence, with green as the reference colour. The errors are robust.

| model | v2 (J137) | v3 (J137) |
|---|---|---|
| colours only: W / U vs G | +17.3 [+15.0, +19.6] / **−4.5 [−6.9, −2.0]** | +14.9 [+12.5, +17.3] / **+3.3 [+0.7, +5.8]** |
| + flow: flow coefficient per card | **−2.47 [−3.17, −1.76]** | **−2.40 [−3.21, −1.59]** |
| + flow: U vs G | +3.5 [+0.2, +6.9] | +6.6 [+3.9, +9.4] |
| + flow, TOK, creatures: flow / TOK per card | −1.65 [−2.48, −0.82] / +1.80 [+1.22, +2.38] | −1.88 [−2.82, −0.94] / +1.28 [+0.64, +1.92] |
| + flow, TOK, creatures: W vs G | +12.1 [+9.1, +15.2] | +13.5 [+10.8, +16.2] |

- **The flow coefficient replicated.** J135 measured −2.9 [−3.7, −2.1] on 1,716 drafts. Here it is −2.47 in v2 and −2.40 in v3, and it barely changed between the cubes.
- **Deck composition** (TOK and creatures per deck):
  - White decks went from 7.74 to 6.03 TOK cards.
  - Blue decks went from 13.22 to 14.93 creatures, and from 6.50 to 7.79 ETB cards.

## The eight swapped cards, their own numbers

The final column is an addition: the card's shrunk rate against the win rate of its own colour in the same cube.

| card | cube | decks (% of decks) | decisive games | win | shrunk | vs its colour |
|---|---|---|---|---|---|---|
| Welcoming Vampire | v2 out | 745 (24.8) | 1,784 | 65.2 | 65.0 | +1.2 vs W 63.8 |
| Adeline, Resplendent Cathar | v2 out | 768 (25.6) | 1,834 | 65.9 | 65.8 | +2.0 |
| Elspeth, Sun's Champion | v2 out | 752 (25.1) | 1,801 | 65.4 | 65.2 | +1.4 |
| Consider | v2 out | 881 (29.4) | 2,117 | 39.4 | 39.5 | −3.0 vs U 42.5 |
| Brainstorm | v2 out | 767 (25.6) | 1,849 | 40.7 | 40.8 | −1.7 |
| Ponder | v2 out | 862 (28.7) | 2,068 | 42.3 | 42.3 | −0.2 |
| Deep Analysis | v2 out | 928 (30.9) | 2,228 | 41.2 | 41.2 | −1.3 |
| Lonis, Cryptozoologist | v2 out | 29 (1.0) | 70 | 31.4 | 35.5 | n/a |
| Kor Skyfisher | v3 in | 823 (27.4) | 1,964 | 57.8 | 57.7 | −2.4 vs W 60.1 |
| Militia Bugler | v3 in | 451 (15.0) | 1,105 | 62.4 | 62.1 | +2.0 |
| Serra Paragon | v3 in | 471 (15.7) | 1,123 | 63.1 | 62.9 | +2.8 |
| Tolarian Terror | v3 in | 639 (21.3) | 1,532 | 46.1 | 46.2 | −2.2 vs U 48.4 |
| Sower of Temptation | v3 in | 964 (32.1) | 2,313 | 53.2 | 53.2 | **+4.8** |
| Brazen Borrower | v3 in | 680 (22.7) | 1,627 | 50.2 | 50.2 | +1.8 |
| Mist Raven | v3 in | 846 (28.2) | 2,031 | 49.5 | 49.5 | +1.1 |
| Uro, Titan of Nature's Wrath | v3 in | 109 (3.6) | 266 | 43.6 | 44.0 | n/a |

- **Every card's own rate tracks its colour.** All three white ins sit below the cards they replaced, and all four blue ins sit above theirs.
- **Sower of Temptation** is the most-played new card and the furthest above its colour. At +4.8 it is not a bomb by these numbers. Keep it under "Cards to watch".
- **Uro** is played in only 3.6% of decks, as the study feared. It is not working as a Simic signpost: the drafter rates it 54 and the builder seldom plays it.

## Prediction against outcome

| the study predicted | outcome [95%] | held? |
|---|---|---|
| blue decks **+4 to +8** | **+5.9 [+4.2, +7.6]** | **yes**: the whole interval sits inside the range |
| white decks **−2 to −6** | **−3.8 [−5.7, −1.8]** | **yes** |
| about 2.0 fewer flow cards per blue deck | −1.88 (5.21 → 3.33) | yes |
| spread **39 → 28–34** | 38.9 → **27.1** [20.8, 35.1]; paired −11.8 [−19.5, −3.2] | yes, at the bottom edge of the range |
| the test passes at 1,500 drafts a side if v3 is about 30% flatter | v3 came out 30% flatter and did **not** pass (overlap 1.4) | **no**: the power check was too optimistic for compare's bootstrap |
| no v3 pair below 35% | lowest RG 35.5 [29.0, 42.6] | yes, narrowly; and RG was not a pair the study looked at |
| (not predicted) black and green carry part of the cost | B −2.8 [−5.4, −0.1], BG −5.0 [−9.7, −0.1] | a side effect the study did not foresee |

## What this says about the diagnosis

- **Blue's deficit was mostly card flow, and partly what replaced it.**
  - Blue decks carry 1.88 fewer flow cards. At the measured −2.4 a card, that alone is worth about +4.5 points; blue rose +5.9.
  - The flow coefficient held at the same size in both cubes, so the effect is not an artefact of v2's card list.
  - With flow held fixed, blue went from +3.5 to +6.6 against green. About 3 points came from something else: most likely the bodies that went in (Sower +4.8 over its colour, Borrower and Raven at or above it).
  - v3 changed both the card flow and the bodies at once, so this run cannot fully separate the two. The causal claim stays observational. But the flow prediction came out where the study said, which is the most a single run can show.
- **White's edge was only partly token density, and most of it remains.**
  - White decks lost 1.7 TOK cards and fell 3.8 points, about what the TOK coefficient implied.
  - White is still +14.9 [+12.5, +17.3] over green, and still +13.5 with flow, TOK and creatures held fixed.
  - The study called this unexplained part "card quality in the AI's hands". It is the largest imbalance left in v3.

## What a v4 would try (NOT pre-registered; a reading for Justin and the cloud)

1. **More white trims at the top.** Luminarch Aspirant (Δ +6.3 [+2.9, +9.6] in J135) and Soul Warden. These are the two strongest remaining white effects, and the study held them back as enablers.
2. **Red-green is now the floor.**
   - Red's card flow is still 3.88 a deck, from Faithless Looting, Cathartic Reunion and Unexpected Windfall (Δ −6.2 in J135).
   - Swapping one or two red looters for bodies would apply the same lever that worked for blue.
3. **Uro does not do its job.** It goes into 3.6% of decks. A higher-rated UG signpost, or simply the slot back, would serve better.
4. **The test rule.** A v4 test should pre-register the paired difference: v4 − v3 spread, interval excludes 0. That is what compare's paired design is built for. Non-overlapping intervals need roughly 2,500 or more drafts a side for an effect this size.

## Run health

| | |
|---|---|
| drafts | 3,000 (1,500 × 2), seeds 837,000,001–837,001,500 in both cubes (asserted) |
| games | 7,210 played, 7,203 decisive (v2 3,603, v3 3,600); 7 draws, 6 timeouts |
| engine errors | 4 (0.13%; drafts with an error: v2 1, v3 3), each "a game thread would not stop after its timeout; the worker was restarted" |
| game time | mean 5.99 s, median 2.15 s; 19.46 turns; 308 ms a turn |
| matches | v2 3,292 s, v3 3,349 s (2.2 s a draft on 7 workers) |
| workers | 7; peak 1.67 GB a worker measured (2.00 declared); 0 pressure events |
| checks | pilot 24 of 24 PASS; final 17 of 17 PASS (same seeds, 1,500 drafts each, 8 out and 8 in, error rate under 2%, nothing recorded) |
| outputs | `compare.json` and `compare.md` (no `--rule`); `v2v3.json` and `v2v3.md` (the rule's reading, `better_balanced: 0`, `decided: 1`) |
