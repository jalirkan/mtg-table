# J214: what the search considers, three arms against search-v2-no-b (search-v3, the live seat), 1,200 games each (D398; D540; D519's four readings)

**Outcomes under the pre-registered rule (D540 point 8):**

- search-v3-declined: INCONCLUSIVE AT 1,200 (indistinguishable): 5.8 Elo [-4.6, 16.2], score 0.5083 [0.4934, 0.5233]; its key's windows 3630 over 1200 games (3.025 a game; 0.25 a game is the rate), 1.16 candidates a window, 402 changes, 0 retries a game, aimed spells listed 4318 and dropped 5378; 19.534 against 18.895 search seconds a game (x1.0338), 889.768 against 900.099 ms a searched decision; not a candidate; the live seat is unchanged
- search-v3-instant: INCONCLUSIVE AT 1,200 (indistinguishable): 10.4 Elo [-0.7, 21.5], score 0.515 [0.499, 0.531]; its key's windows 2207 over 1200 games (1.839 a game; 0.25 a game is the rate), 2.15 candidates a window, 224 changes, 0 retries a game; 21.225 against 19.072 search seconds a game (x1.1129), 924.516 against 909.563 ms a searched decision; not a candidate; the live seat is unchanged
- search-v3-lands: NOT SHOWN (indistinguishable): 1.2 Elo [-9.6, 11.9], score 0.5017 [0.4862, 0.5172]; its key's windows 4198 over 1200 games (3.498 a game; 0.25 a game is the rate), 2.19 candidates a window, 343 changes, 0 retries a game; 21.704 against 18.774 search seconds a game (x1.1561), 886.89 against 905.571 ms a searched decision; not a candidate; the live seat is unchanged

**Candidates for a 4,800-game confirmation (SHOWN or SMALL GAIN):** 0. **NOT READ:** 0. **NOT PLAYED:** 0. **INCOMPLETE (owed a repost):** 0. **The live seat:** unchanged by this job (liveSeatChanged 0).

**The night's pattern (D540 point 13, descriptions, not rules):** declined a candidate 0, instant a candidate 0, lands a candidate 0; all three NOT SHOWN 0.

| arm | played / planned | complete | outcome | described | score [95%] | Elo [95%] | pairs | draws, errors, timeouts | hours |
|---|---|---|---|---|---|---|---|---|---|
| search-v3-declined | 1200 / 1200 | true | INCONCLUSIVE AT 1,200 | indistinguishable | 0.5083 [0.4934, 0.5233] | 5.8 [-4.6, 16.2] | 600 | 0, 0, 0 | 2.12 |
| search-v3-instant | 1200 / 1200 | true | INCONCLUSIVE AT 1,200 | indistinguishable | 0.515 [0.499, 0.531] | 10.4 [-0.7, 21.5] | 600 | 0, 0, 0 | 2.15 |
| search-v3-lands | 1200 / 1200 | true | NOT SHOWN | indistinguishable | 0.5017 [0.4862, 0.5172] | 1.2 [-9.6, 11.9] | 600 | 0, 0, 0 | 2.21 |

**The exposure, the arm's own key (D540 points 8 and 10; the rate decides NOT READ, the rest is description; on every match it was read on, a cut-short one included):**

| arm | games read | windows | a game (0.25 is the rate) | at the rate | B's D540 counters above 0 | candidates | a window | changed | a game | retries | a game | aimed listed (a game) | dropped, no legal target (a game) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| search-v3-declined | 1200 | 3630 | 3.025 | yes | 0 | 4222 | 1.16 | 402 | 0.335 | 0 | 0 | 4318 (3.598) | 5378 (4.482) |
| search-v3-instant | 1200 | 2207 | 1.839 | yes | 0 | 4735 | 2.15 | 224 | 0.187 | 0 | 0 | - | - |
| search-v3-lands | 1200 | 4198 | 3.498 | yes | 0 | 9184 | 2.19 | 343 | 0.286 | 0 | 0 | - | - |

**The cost, A against B on the same games (description only; the seconds are this machine's, D388):**

| arm | search s a game A / B (x) | ms a decision A / B | ms p, a A | ms p, a B | searched p, a, b A | searched p, a, b B | from pass, to other, to pass a p decision A | same, B | land windows left to Forge a game A / B | rollouts a decision A / B | fewer than 2 rounds A / B |
|---|---|---|---|---|---|---|---|---|---|---|---|
| search-v3-declined | 19.534 / 18.895 (x1.0338) | 889.768 / 900.099 | 898.21, 862.204 | 909.076, 871.896 | 20168, 6177, 0 | 19108, 6082, 0 | 8.3%, 6.6%, 4.5% | 7.6%, 6.5%, 5.3% | 7.18 / 7.2 | 15.72 / 15.59 | 3.19% / 3.43% |
| search-v3-instant | 21.225 / 19.072 (x1.1129) | 924.516 / 909.563 | 938.421, 876.307 | 921.259, 873.607 | 21382, 6167, 0 | 18986, 6176, 0 | 7.0%, 5.8%, 5.3% | 7.8%, 6.2%, 5.2% | 7.21 / 7.17 | 15.42 / 15.47 | 3.51% / 3.58% |
| search-v3-lands | 21.704 / 18.774 (x1.1561) | 886.89 / 905.571 | 888.994, 878.962 | 911.33, 887.752 | 23207, 6160, 0 | 18801, 6077, 0 | 6.0%, 6.5%, 4.3% | 7.6%, 6.4%, 5.1% | 3.68 / 7.16 | 15.96 / 15.45 | 3.09% / 3.46% |

| side | decisions searched (games) | changed Forge: p | a | b | all | budget fallbacks [95%] | other fallbacks | step timeouts |
|---|---|---|---|---|---|---|---|---|
| search-v3-declined | 26345 (1200) | 3931/20168 (19.5%) | 907/6177 (14.7%) | - | 4838/26345 (18.4%) | 124 = 0.5% [0.3%, 0.6%] | unmappable 24 | 6 |
| search-v2-no-b (vs search-v3-declined) | 25190 (1199) | 3699/19108 (19.4%) | 884/6082 (14.5%) | - | 4583/25190 (18.2%) | 137 = 0.5% [0.3%, 0.7%] | unmappable 21 | 6 |
| search-v3-instant | 27549 (1200) | 3861/21382 (18.1%) | 906/6167 (14.7%) | - | 4767/27549 (17.3%) | 145 = 0.5% [0.3%, 0.7%] | unmappable 29 | 9 |
| search-v2-no-b (vs search-v3-instant) | 25162 (1199) | 3650/18986 (19.2%) | 947/6176 (15.3%) | - | 4597/25162 (18.3%) | 138 = 0.5% [0.4%, 0.7%] | unmappable 28 | 9 |
| search-v3-lands | 29367 (1199) | 3897/23207 (16.8%) | 925/6160 (15.0%) | - | 4822/29367 (16.4%) | 147 = 0.5% [0.3%, 0.7%] | unmappable 26 | 10 |
| search-v2-no-b (vs search-v3-lands) | 24878 (1199) | 3591/18801 (19.1%) | 941/6077 (15.5%) | - | 4532/24878 (18.2%) | 125 = 0.5% [0.3%, 0.7%] | unmappable 26 | 4 |

search-v3-declined: rule parts names 1, hashes 1, seat configs 1, the registered blocks 1 (150 blocks 416900000 to 416900149, 1200 games, 0 of another match), priority and attacks searched and no block on both sides 1, the exposure read on this match 1, at the rate 1, B clean 1; complete 1. SHOWN 0, SMALL GAIN 0, INCONCLUSIVE AT 1,200 1, NOT SHOWN 0, NOT READ 0, INCOMPLETE 0; candidate 0. Described: indistinguishable 1, a measured loss 0, a measured gain 0. Match id j214:20261112T101637-3019203, host j214, set tools/ai-bench/pairs-confirm.txt.

search-v3-instant: rule parts names 1, hashes 1, seat configs 1, the registered blocks 1 (150 blocks 416900000 to 416900149, 1200 games, 0 of another match), priority and attacks searched and no block on both sides 1, the exposure read on this match 1, at the rate 1, B clean 1; complete 1. SHOWN 0, SMALL GAIN 0, INCONCLUSIVE AT 1,200 1, NOT SHOWN 0, NOT READ 0, INCOMPLETE 0; candidate 0. Described: indistinguishable 1, a measured loss 0, a measured gain 0. Match id j214:20261112T122358-1063310, host j214, set tools/ai-bench/pairs-confirm.txt.

search-v3-lands: rule parts names 1, hashes 1, seat configs 1, the registered blocks 1 (150 blocks 416900000 to 416900149, 1200 games, 0 of another match), priority and attacks searched and no block on both sides 1, the exposure read on this match 1, at the rate 1, B clean 1; complete 1. SHOWN 0, SMALL GAIN 0, INCONCLUSIVE AT 1,200 0, NOT SHOWN 1, NOT READ 0, INCOMPLETE 0; candidate 0. Described: indistinguishable 1, a measured loss 0, a measured gain 0. Match id j214:20261112T143251-3403686, host j214, set tools/ai-bench/pairs-confirm.txt.

## The pilot (D540 point 11): the arm gate and the recorded windows

Arms played: declined, instant, lands.

| arm | games (ladder + recorded) | key windows (ladder + recorded) | errors and timeouts | retries (a game) | gate | recorded searched p: own main / land / instant-speed | outside own main, on a stack | ms by candidate count (decisions) | ladder search s a game A / B |
|---|---|---|---|---|---|---|---|---|---|
| declined | 4 + 4 | 35 + 4 | 0 | 0 (0) | played | 51 / 0 / 0 | 0, 0 | 2: 580.4 (34); 3: 929 (10); 4: 1028.7 (7) | 10.212 / 8.458 |
| instant | 4 + 4 | 4 + 15 | 0 | 0 (0) | played | 52 / 0 / 15 | 15, 0 | 2: 686.6 (46); 3: 1148.2 (13); 4: 1264.1 (7); 5: 1511 (1) | 12.984 / 11.405 |
| lands | 4 + 4 | 10 + 13 | 0 | 0 (0) | played | 43 / 13 / 0 | 0, 0 | 2: 698.2 (42); 3: 1014.8 (9); 4: 1170.8 (4); 5: 1506 (1) | 14.704 / 10.754 |
