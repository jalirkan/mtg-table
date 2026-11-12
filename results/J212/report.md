# J212: the search's horizon, three arms against search-v1-anytime, 1,200 games each (D398; D537; D519's four readings)

**Readings under the pre-registered rule:**

- search-v2-t1: NOT SHOWN (indistinguishable): -1.7 Elo [-14.6, 11.2], score 0.4975 [0.4789, 0.5161]; 27.75 against 20.623 search seconds a game (x1.3456), 1210.296 against 898.588 ms a searched decision, 92.1 against 49.7 ms of play a rollout (x1.853), 11.47 against 15.79 rollouts a decision; not a candidate; the live seat is unchanged
- search-v2-a1: INCONCLUSIVE AT 1,200 (indistinguishable): 5.2 Elo [-5.7, 16.2], score 0.5075 [0.4917, 0.5233]; 24.263 against 21.537 search seconds a game (x1.1266), 1019.686 against 915.387 ms a searched decision, 61.3 against 51.2 ms of play a rollout (x1.197), 14.39 against 15.53 rollouts a decision; not a candidate; the live seat is unchanged
- search-v2-t1-x3: INCONCLUSIVE AT 1,200 (indistinguishable): 9.8 Elo [-1.7, 21.4], score 0.5142 [0.4976, 0.5307]; 53.858 against 19.803 search seconds a game (x2.7197), 2342.996 against 859.836 ms a searched decision, 114.9 against 46.1 ms of play a rollout (x2.492), 19.08 against 16.43 rollouts a decision; not a candidate; the live seat is unchanged

**Candidates for a 4,800-game confirmation (SHOWN or SMALL GAIN):** 0. **The live seat:** unchanged by this job (liveSeatChanged 0).

**The night's pattern (D537 point 8, descriptions, not rules):** t1 a candidate 0, a1 a candidate 0, t1-x3 a candidate 0; per rollout but not per second (t1-x3 a candidate, t1 not) 0; the horizon closed for priority and blocks at this leaf (t1 and t1-x3 both NOT SHOWN) 0; the deeper attack horizon closed (a1 NOT SHOWN) 0.

| arm | played / planned | complete | score [95%] | Elo [95%] | reading | described | pairs | draws, errors, timeouts | hours |
|---|---|---|---|---|---|---|---|---|---|
| search-v2-t1 | 1200 / 1200 | true | 0.4975 [0.4789, 0.5161] | -1.7 [-14.6, 11.2] | NOT SHOWN | indistinguishable | 600 | 0, 0, 0 | 2.51 |
| search-v2-a1 | 1200 / 1200 | true | 0.5075 [0.4917, 0.5233] | 5.2 [-5.7, 16.2] | INCONCLUSIVE AT 1,200 | indistinguishable | 600 | 0, 0, 0 | 2.45 |
| search-v2-t1-x3 | 1200 / 1200 | true | 0.5142 [0.4976, 0.5307] | 9.8 [-1.7, 21.4] | INCONCLUSIVE AT 1,200 | indistinguishable | 600 | 0, 0, 0 | 4.31 |

**The cost and the horizon, A against B on the same games (description only; the seconds are this machine's, D388):**

| arm | search s a game A / B (x) | ms a decision A / B | ms p, a, b A | ms p, a, b B | rollouts a decision A / B | rounds a decision A / B | ms of play a rollout A / B (x) | copy ms a rollout A / B | fewer than 2 rounds A / B | from pass, to other, to pass a p decision A | same, B | land windows a game A / B | step caps A / B |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| search-v2-t1 | 27.75 / 20.623 (x1.3456) | 1210.296 / 898.588 | 1313.635, 863.58, 1290.329 | 905.676, 861.555, 938.235 | 11.47 / 15.79 | 4.21 / 6.09 | 92.1 / 49.7 (x1.853) | 4.7 / 4.6 | 11.78% / 2.83% | 8.7%, 6.4%, 5.9% | 8.0%, 6.3%, 4.6% | 7.18 / 7.14 | 0 / 0 |
| search-v2-a1 | 24.263 / 21.537 (x1.1266) | 1019.686 / 915.387 | 920.609, 1340.902, 967.583 | 925.268, 880.502, 929.212 | 14.39 / 15.53 | 5.62 / 6 | 61.3 / 51.2 (x1.197) | 4.6 / 4.6 | 7.73% / 3.44% | 8.1%, 6.2%, 4.8% | 8.1%, 6.4%, 4.9% | 7.29 / 7.29 | 0 / 0 |
| search-v2-t1-x3 | 53.858 / 19.803 (x2.7197) | 2342.996 / 859.836 | 2662.248, 1247.27, 2625.931 | 865.706, 825.912, 900.319 | 19.08 / 16.43 | 7.26 / 6.34 | 114.9 / 46.1 (x2.492) | 4.2 / 4.2 | 1.55% / 2.35% | 8.4%, 7.4%, 5.7% | 8.1%, 6.4%, 5.0% | 7.15 / 7.16 | 0 / 0 |

| side | decisions searched (games) | changed Forge: p | a | b | all | budget fallbacks [95%] | other fallbacks | step timeouts |
|---|---|---|---|---|---|---|---|---|
| search-v2-t1 | 27514 (1199) | 3979/18952 (21.0%) | 968/6195 (15.6%) | 517/2367 (21.8%) | 5464/27514 (19.9%) | 698 = 2.5% [2.0%, 3.0%] | unmappable 22 | 17 |
| search-v1-anytime (vs search-v2-t1) | 27541 (1199) | 3599/18987 (19.0%) | 942/6178 (15.2%) | 550/2376 (23.1%) | 5091/27541 (18.5%) | 109 = 0.4% [0.2%, 0.5%] | unmappable 25 | 7 |
| search-v2-a1 | 28554 (1199) | 3734/19541 (19.1%) | 1065/6444 (16.5%) | 590/2569 (23.0%) | 5389/28554 (18.9%) | 399 = 1.4% [1.1%, 1.7%] | unmappable 29 | 15 |
| search-v1-anytime (vs search-v2-a1) | 28233 (1199) | 3788/19576 (19.4%) | 1086/6428 (16.9%) | 457/2229 (20.5%) | 5331/28233 (18.9%) | 166 = 0.6% [0.4%, 0.8%] | unmappable 28 | 16 |
| search-v2-t1-x3 | 27584 (1199) | 4101/19098 (21.5%) | 952/6164 (15.4%) | 558/2322 (24.0%) | 5611/27584 (20.3%) | 74 = 0.3% [0.1%, 0.4%] | unmappable 21 | 4 |
| search-v1-anytime (vs search-v2-t1-x3) | 27638 (1199) | 3740/19135 (19.5%) | 977/6136 (15.9%) | 554/2367 (23.4%) | 5271/27638 (19.1%) | 64 = 0.2% [0.2%, 0.3%] | unmappable 33 | 0 |

search-v2-t1: rule parts names 1, hashes 1, seat configs 1, the registered blocks 1 (150 blocks 114900000 to 114900149, 1200 games, 0 of another match), all three kinds on both sides 1, complete 1. SHOWN 0, SMALL GAIN 0, INCONCLUSIVE AT 1,200 0, NOT SHOWN 1; candidate 0. Described: indistinguishable 1, a measured loss 0, a measured gain 0. Match id justin-a-B650-GAMING-X-AX-V2:20261111T175056-372439, set tools/ai-bench/pairs-confirm.txt.

search-v2-a1: rule parts names 1, hashes 1, seat configs 1, the registered blocks 1 (150 blocks 114900000 to 114900149, 1200 games, 0 of another match), all three kinds on both sides 1, complete 1. SHOWN 0, SMALL GAIN 0, INCONCLUSIVE AT 1,200 1, NOT SHOWN 0; candidate 0. Described: indistinguishable 1, a measured loss 0, a measured gain 0. Match id justin-a-B650-GAMING-X-AX-V2:20261111T202144-1936383, set tools/ai-bench/pairs-confirm.txt.

search-v2-t1-x3: rule parts names 1, hashes 1, seat configs 1, the registered blocks 1 (150 blocks 114900000 to 114900149, 1200 games, 0 of another match), all three kinds on both sides 1, complete 1. SHOWN 0, SMALL GAIN 0, INCONCLUSIVE AT 1,200 1, NOT SHOWN 0; candidate 0. Described: indistinguishable 1, a measured loss 0, a measured gain 0. Match id justin-a-B650-GAMING-X-AX-V2:20261111T224854-1399339, set tools/ai-bench/pairs-confirm.txt.

## The recording (D537 point 10): search-v2 against Forge Default, its own decision records (information only)

ai-bench exit 0; 1440 logs, 720 of the search seat (games), 720 of Forge's, 0 unreadable; 720 game ends; 77 KiB a log; 80908 priority, attack and block records of the search seat; 82071 forced priority passes (counted, never recorded).

| kind | searched | candidates a decision (1..6+) | mean | legal options a decision | legal > considered | rollouts a candidate: Forge / alternatives / all | complete rounds | fewer than 2 | ms | horizon | overrode | fallbacks | sigma_d n | sigma_d p10 / p25 / median / p75 / p90 | mean | zero | nonzero median / p90 | over 1,000 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| p | 11939 | 0 / 5983 / 3422 / 1620 / 591 / 323 | 2.815 | 4.197 | 8043 (29 listings a shortlist) | 7.279 / 5.462 / 6.108 | 7.129 | 0.031 | 805.5 | {"0":11939} | 2324 | {"unmappable":25,"budget":66} | 20560 | 0 / 0 / 0 / 17.3 / 76.2 | 337 | 14459 | 54 / 148.4 | 135 |
| a | 3977 | 0 / 1390 / 246 / 699 / 603 / 1039 | 3.913 | 10.318 | 1920 (292 listings a shortlist) | 4.761 / 3.578 / 3.88 | 4.614 | 0.041 | 794.8 | {"0":3977} | 558 | {"budget":4} | 10560 | 0 / 0 / 0 / 0 / 48 | 681 | 8525 | 52 / 225.3 | 143 |
| b | 1161 | 0 / 484 / 187 / 167 / 101 / 222 | 3.475 | 10.164 | 742 (153 listings a shortlist) | 5.454 / 4.397 / 4.701 | 5.343 | 0.017 | 757.8 | {"0":1161} | 166 | {"budget":3} | 2724 | 0 / 0 / 0 / 24.9 / 97.9 | 1141.9 | 1825 | 61.1 / 261.9 | 69 |

Priority windows the search did not search (recorded windows only: a window with one legal answer is a forced pass, counted above and never recorded):
- its own main phase, empty stack, Forge played a land (skipped by the search): 5384; with another land among the legal options 3506 (65.1%), with a castable non-mana play 4057 (75.4%), with either 5212 (96.8%);
- its own main phase, empty stack, no land and no search (the outlet policy, or no alternative Forge's per-card AI accepts): 4122 (with a legal non-mana play 3931, 95.4%);
- its own main phase with a non-empty stack: 4970 (with a legal non-mana play 4970, 100.0%);
- its own turn outside the main phases: 26377 (with a legal non-mana play 26377, 100.0%);
- the opponent's turn: 22962 (with a legal non-mana play 22962, 100.0%);
- searched priority decisions outside its own main phase with an empty stack (expected 0): 0.

Not in the records, so not reported: the paired-round count itself (sigma_d takes n, Forge's answer being rolled first in every round; a round where Forge's own rollout threw is not marked), per-round leaves, rollouts by kind. sigma_d is in leaf points; a rollout that ends the game scores +-(100,000 - 100 x turn), which is what the over-1,000 column counts.
