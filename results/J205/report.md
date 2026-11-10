# J205: random-v6, D350's override=lcb on random4 rollouts; the deciding arm search-v2-rrandom4-lcb-m40 (v6Margin 40), the other margin search-v2-rrandom4-lcb-m60, each against search-v1-anytime (D530)

**Which arm decides (D528 point 8, from the match lines):** J204 (a) minus J202 (b) -3.5, so v6Margin 40: search-v2-rrandom4-lcb-m40.

**Both arms under D527's table (D530 point 5):** (a) NOT SHOWN, loses badly: search-v2-rrandom4-lcb-m40 -35.4 Elo [-49.5, -21.5], score 0.4492, lower end 0.4292; (b) NOT SHOWN, loses badly: search-v2-rrandom4-lcb-m60 -34.3 Elo [-47.8, -20.9], score 0.4508, lower end 0.4317; against the baseline 50.1 [29.7, 70.5] (SIGNAL SHOWN, reported, deciding nothing); minus (a) 1.1.

**SIGNAL against J204 (b)'s baseline on the same deals:** SIGNAL SHOWN: search-v2-rrandom4-lcb-m40 minus policy-outlet 49 Elo [28.3, 69.7] (+-20.7); SIGNAL SHOWN; the share of search-v2's own gain over the seat under it that the random values keep: 58.1% (information). Same deals: J204 (b) 1 (blocks 114900000 to 114900149, 150 blocks, 1200 games), (a) 1 (blocks 114900000 to 114900149, 150, 1200 games).

**The count and the loop:** J204's own SIGNAL, recomputed from its lines: SIGNAL SHOWN (60 [39.3, 80.7]); successive SIGNAL INCONCLUSIVE count 0 (two close the track: 0); random-v5 lost badly 0, this iteration loses badly 1 (both arms: 1, 1), the loop stops 0.

**What the night decides:** neither arm is a candidate; the track stays open; the agent iterates as random-v7 without asking the owner: search-v2-rrandom4them-lcb-m40, rollout=random4-them (the opponent random-v4, the searching seat's own continuation Forge's) at the deciding arm's rule, override=lcb, z 1, margin 40 (D530 point 7); no replay owed; no repost; the self-play-from-random path does not open on this night; the live seat is unchanged (a separate decision, D509).

**Beside the reading (information, deciding nothing):** the rule's own effect, the deciding arm minus its margin arm on the same deals (J202 (b)): -14.5 Elo on the point (about +-19); the other margin minus the deciding arm: 1.1; the other margin against the baseline: 50.1 [29.7, 70.5] (SIGNAL SHOWN).

| match | played / planned | complete | score [95%] | Elo [95%] | draws, errors, timeouts | A ms per decision | B ms per decision | A rollouts per decision | B rollouts per decision | A / B rollouts | A / B play ms a rollout | A / B copy ms a rollout | hours |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| (a) search-v2-rrandom4-lcb-m40 vs search-v1-anytime | 1200 / 1200 | true | 0.4492 [0.4292, 0.4691] | -35.4 [-49.5, -21.5] | 0, 0, 1 | 933.913 | 931.436 | 17.15 | 15.28 | 1.122 | 47.6 / 53.09 | 4.59 / 4.77 | 2.32 |
| (b) search-v2-rrandom4-lcb-m60 vs search-v1-anytime | 1200 / 1200 | true | 0.4508 [0.4317, 0.47] | -34.3 [-47.8, -20.9] | 0, 0, 0 | 890.481 | 895.094 | 17.96 | 15.83 | 1.135 | 43.31 / 49.48 | 4.16 / 4.36 | 2.51 |

(a) config hashes: search-v2-rrandom4-lcb-m40 98eea870967e, search-v1-anytime cdd55e02a89c. Deck set tools/ai-bench/pairs-confirm.txt; 600 mirrored pairs; match id justin-a-B650-GAMING-X-AX-V2:20261110T064829-81505. Deal blocks 150, 114900000 to 114900149, 1200 games. Rounds per searched decision 6.7 / 5.85; decided on fewer than two rounds 787 = 2.84% / 968 = 3.39%; rollout errors 0 / 0, step caps 0 / 0; the rollout reader saw 1200 games and 27664 / 28590 searched decisions (the match line: 27664 / 28590). Random rollouts 483979 of config A's 474373; search-v2's side 0; random-seat failures 37. The lcb verdicts on the arm's side: overrode 4669, held 2849 (the margin rule would have overridden; 37.9% of overrode plus held), none 20071; search-v2's side {"overrode":0,"held":0,"none":0}.
(b) config hashes: search-v2-rrandom4-lcb-m60 d6d75fdefd25, search-v1-anytime cdd55e02a89c. Deck set tools/ai-bench/pairs-confirm.txt; 600 mirrored pairs; match id justin-a-B650-GAMING-X-AX-V2:20261110T090733-1781610. Deal blocks 150, 114900000 to 114900149, 1200 games. Rounds per searched decision 7 / 6.07; decided on fewer than two rounds 605 = 2.19% / 890 = 3.15%; rollout errors 0 / 0, step caps 0 / 0; the rollout reader saw 1200 games and 27681 / 28224 searched decisions (the match line: 27681 / 28224). Random rollouts 506017 of config A's 497199; search-v2's side 0; random-seat failures 56. The lcb verdicts on the arm's side: overrode 3913, held 2317 (the margin rule would have overridden; 37.2% of overrode plus held), none 21366; search-v2's side {"overrode":0,"held":0,"none":0}.

| side | changed Forge p / a / b | priority: from a pass / to another play / to a pass (of priority decisions) |
|---|---|---|
| (a) search-v2-rrandom4-lcb-m40 | 20.7% / 7.8% / 11.5% | 11.39% / 7.43% / 1.88% |
| (a) search-v2 | 19.4% / 14.8% / 18.0% | 7.99% / 6.50% / 4.87% |
| (b) search-v2-rrandom4-lcb-m60 | 17.2% / 6.7% / 9.9% | 9.68% / 6.26% / 1.21% |
| (b) search-v2 | 19.4% / 15.5% / 18.5% | 8.01% / 6.67% / 4.77% |
| J204 (a) search-v2-rrandom4-m60 (margin rule) | 26.1% / 12.0% / 13.1% | 14.03% / 9.02% / 3.03% |
| J204 (a) search-v2 | 19.4% / 15.6% / 19.3% | 7.98% / 6.72% / 4.71% |
| J202 (b) search-v2-rrandom4-m40 (margin rule) | 31.7% / 14.3% / 18.0% | 16.41% / 10.51% / 4.82% |
| J202 (b) search-v2 | 19.1% / 14.8% / 19.5% | 8.15% / 6.27% / 4.65% |

D530 point 8: J202 (b), margin 40, changed Forge at priority from a pass 16.4%, to another play 10.5%, to a pass 4.82%, attack 14.3%, block 18.0%; search-v2 8.15%, 6.27%, 4.65%, 14.8%, 19.5%. random-v7 (rollout=random4-them) is expected (not registered) to bring the from-pass share toward search-v2's.

| search.rr.<name> | (a) fires | (a) per random rollout | (a) per game |
|---|---|---|---|
| v2.castSomething | 113134 | 0.2338 | 94.28 |
| v2.chumpBlock | 25071 | 0.0518 | 20.89 |
| v2.dominatedAttacker | 23784 | 0.0491 | 19.82 |
| v2.lethalAttack | 4669 | 0.0096 | 3.89 |
| v2.lethalBlock | 6592 | 0.0136 | 5.49 |
| v2.ownStack | 1207146 | 2.4942 | 1005.96 |
| v2.targetSide | 290548 | 0.6003 | 242.12 |
| v3.goodBlock | 10479 | 0.0217 | 8.73 |
| v3.goodBlockIllegal | 9 | 0 | 0.01 |
| v4.goodBlockLethal | 1123 | 0.0023 | 0.94 |
| v4.goodBlockRefused | 12667 | 0.0262 | 10.56 |
| cardTargetOffered | 303097 | 0.6263 | 252.58 |
| costTargetAvoided | 76 | 0.0002 | 0.06 |
| failures | 37 | 0.0001 | 0.03 |
| land | 54693 | 0.113 | 45.58 |
| modesDrawn | 1501 | 0.0031 | 1.25 |
| noRepeatNoOp | 30519 | 0.0631 | 25.43 |
| noRepeatRefused | 1943 | 0.004 | 1.62 |
| refusedCast | 2489 | 0.0051 | 2.07 |
| targetCountTrimmed | 1035 | 0.0021 | 0.86 |
| xDrawn | 10087 | 0.0208 | 8.41 |
| zeroXLeftOut | 75477 | 0.156 | 62.9 |
| rollouts (the denominator) | 483979 | 1 | 403.32 |

Under rollout=random4 the fires of both random seats are summed. J202 (b), the same rollouts at margin 40, per random rollout: v2.ownStack 2.4546, v2.targetSide 0.5908, v2.castSomething 0.2316, v3.goodBlock 0.0231, v4.goodBlockLethal 0.0025, v4.goodBlockRefused 0.0294, v2.lethalBlock 0.014, v2.chumpBlock 0.0541.

| match | side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks | step timeouts |
|---|---|---|---|---|---|---|---|---|---|---|---|
| (a) | search-v2-rrandom4-lcb-m40 | 27664 (1199) | 3879/18742 (20.7%) | 494/6357 (7.8%) | 296/2565 (11.5%) | 4669/27664 (16.9%) | 933.913 | 926.306 / 934.574 / 987.858 | 40 = 0.1% [0.1%, 0.2%] | unmappable 28 | 0 |
| (a) | search-v1-anytime | 28590 (1198) | 3823/19747 (19.4%) | 957/6485 (14.8%) | 424/2358 (18.0%) | 5204/28590 (18.2%) | 931.436 | 940.547 / 906.812 / 922.85 | 158 = 0.6% [0.3%, 0.8%] | unmappable 33 | 8 |
| (b) | search-v2-rrandom4-lcb-m60 | 27681 (1199) | 3249/18940 (17.2%) | 414/6215 (6.7%) | 250/2526 (9.9%) | 3913/27681 (14.1%) | 890.481 | 878.927 / 896.737 / 961.718 | 51 = 0.2% [0.1%, 0.3%] | unmappable 30 | 3 |
| (b) | search-v1-anytime | 28224 (1198) | 3810/19594 (19.4%) | 989/6379 (15.5%) | 417/2251 (18.5%) | 5216/28224 (18.5%) | 895.094 | 904.982 / 865.402 / 893.165 | 149 = 0.5% [0.3%, 0.8%] | unmappable 24 | 8 |

(a) search-v2-rrandom4-lcb-m40: 661 lost, 538 won, 1 drawn, errored or timed out of 1200 batch lines; mean turns 18.09 lost, 17.98 won; lines whose config A is not the arm's: 0. No life total is on a batch line: the iteration replays a game's seed with full recording for it (D523 point 10).

(a) the ten longest lost games (turns descending):

| batch:line | seed | arm's deck vs search-v2's | arm seat | turns | reason | ms | searched / changed | random rollouts | search.rr.v2.*, v3.* and v4.* per random rollout | failures / rollout errors |
|---|---|---|---|---|---|---|---|---|---|---|
| b0.jsonl:0 | 114900344700000 | fair-fight-900000001-A vs fair-fight-900000001-B | 0 | 44 | AllOpponentsLost | 148683 | 58 / 3 | 684 | v2.castSomething 0.466, v2.chumpBlock 0.003, v2.dominatedAttacker 0.05, v2.lethalBlock 0.018, v2.ownStack 3.346, v2.targetSide 0.937, v3.goodBlock 0.018, v4.goodBlockLethal 0.006, v4.goodBlockRefused 0.026 | 0 / 0 |
| b61.jsonl:4 | 114900405710190 | fair-fight-900000007-A vs fair-fight-900000007-B | 0 | 41 | AllOpponentsLost | 133203 | 49 / 7 | 580 | v2.castSomething 0.203, v2.dominatedAttacker 0.005, v2.lethalBlock 0.012, v2.ownStack 3.774, v2.targetSide 0.984, v3.goodBlock 0.045, v4.goodBlockLethal 0.012 | 0 / 0 |
| b65.jsonl:7 | 114900409710202 | pauper-900000003-B vs pauper-900000003-A | 1 | 39 | AllOpponentsLost | 101523 | 42 / 7 | 589 | v2.castSomething 0.08, v2.chumpBlock 0.003, v2.dominatedAttacker 0.017, v2.ownStack 2.771, v2.targetSide 0.192, v3.goodBlock 0.019 | 0 / 0 |
| b97.jsonl:3 | 114900441700291 | pauper-900000009-B vs pauper-900000009-A | 1 | 38 | AllOpponentsLost | 109926 | 57 / 6 | 813 | v2.castSomething 0.218, v2.dominatedAttacker 0.02, v2.ownStack 2.707, v2.targetSide 0.047, v3.goodBlock 0.009 | 0 / 0 |
| b76.jsonl:5 | 114900420710236 | fair-fight-900000007-B vs fair-fight-900000007-A | 0 | 38 | AllOpponentsLost | 94143 | 46 / 6 | 665 | v2.castSomething 0.406, v2.chumpBlock 0.039, v2.dominatedAttacker 0.009, v2.lethalAttack 0.002, v2.lethalBlock 0.006, v2.ownStack 2.976, v2.targetSide 1.811, v3.goodBlock 0.008 | 0 / 0 |
| b59.jsonl:5 | 114900403710185 | vintage-900000009-B vs vintage-900000009-A | 0 | 37 | AllOpponentsLost | 99833 | 51 / 4 | 704 | v2.castSomething 0.405, v2.chumpBlock 0.009, v2.dominatedAttacker 0.009, v2.lethalAttack 0.003, v2.ownStack 3.408, v2.targetSide 2.254, v3.goodBlock 0.02 | 0 / 0 |
| b61.jsonl:5 | 114900405710191 | fair-fight-900000007-B vs fair-fight-900000007-A | 0 | 36 | AllOpponentsLost | 106753 | 41 / 9 | 434 | v2.castSomething 0.115, v2.chumpBlock 0.078, v2.dominatedAttacker 0.055, v2.lethalBlock 0.002, v2.ownStack 2.509, v2.targetSide 0.486, v3.goodBlock 0.007, v4.goodBlockLethal 0.007 | 0 / 0 |
| b67.jsonl:6 | 114900411710209 | peasant-900000001-A vs peasant-900000001-B | 1 | 36 | AllOpponentsLost | 81126 | 37 / 4 | 583 | v2.castSomething 0.326, v2.chumpBlock 0.017, v2.dominatedAttacker 0.055, v2.ownStack 2.499, v2.targetSide 0.136, v3.goodBlock 0.039 | 0 / 0 |
| b31.jsonl:7 | 114900375710100 | fair-fight-900000007-B vs fair-fight-900000007-A | 1 | 35 | AllOpponentsLost | 94371 | 39 / 7 | 507 | v2.castSomething 0.298, v2.chumpBlock 0.012, v2.dominatedAttacker 0.039, v2.ownStack 3.536, v2.targetSide 0.949, v3.goodBlock 0.008 | 0 / 0 |
| b91.jsonl:6 | 114900435710281 | fair-fight-900000007-A vs fair-fight-900000007-B | 1 | 35 | AllOpponentsLost | 76153 | 38 / 7 | 468 | v2.castSomething 0.19, v2.chumpBlock 0.053, v2.dominatedAttacker 0.058, v2.ownStack 3.344, v2.targetSide 0.752, v3.goodBlock 0.028 | 0 / 0 |

(a) the ten quickest lost games (turns ascending):

| batch:line | seed | arm's deck vs search-v2's | arm seat | turns | reason | ms | searched / changed | random rollouts | search.rr.v2.*, v3.* and v4.* per random rollout | failures / rollout errors |
|---|---|---|---|---|---|---|---|---|---|---|
| b14.jsonl:4 | 114900358710049 | vintage-900000009-A vs vintage-900000009-B | 0 | 7 | AllOpponentsLost | 9333 | 2 / 0 | 36 | v2.castSomething 0.278, v2.ownStack 2.778, v2.targetSide 0.889 | 0 / 0 |
| b58.jsonl:2 | 114900402700175 | vintage-900000003-A vs vintage-900000003-B | 1 | 7 | AllOpponentsLost | 10949 | 12 / 2 | 206 | v2.castSomething 0.18, v2.dominatedAttacker 0.17, v2.ownStack 1.481, v2.targetSide 0.15, v3.goodBlock 0.01 | 0 / 0 |
| b14.jsonl:3 | 114900358700042 | vintage-900000007-B vs vintage-900000007-A | 1 | 7 | AllOpponentsLost | 14031 | 5 / 1 | 102 | v2.castSomething 0.108, v2.ownStack 2.647, v2.targetSide 2.078 | 0 / 0 |
| b87.jsonl:6 | 114900431710269 | vintage-900000001-A vs vintage-900000001-B | 1 | 9 | AllOpponentsLost | 6184 | 1 / 0 | 24 | v2.castSomething 0.5, v2.ownStack 1.25 | 0 / 0 |
| b119.jsonl:6 | 114900463710365 | vintage-900000009-A vs vintage-900000009-B | 1 | 9 | AllOpponentsLost | 6988 | 4 / 0 | 78 | v2.castSomething 0.308, v2.ownStack 1.731 | 0 / 0 |
| b118.jsonl:5 | 114900462710362 | vintage-900000005-B vs vintage-900000005-A | 0 | 9 | AllOpponentsLost | 10825 | 6 / 0 | 114 | v2.castSomething 0.412, v2.ownStack 0.965, v2.targetSide 0.035 | 0 / 0 |
| b19.jsonl:0 | 114900363700057 | modern-era-900000007-A vs modern-era-900000007-B | 0 | 9 | AllOpponentsLost | 13264 | 5 / 0 | 116 | v2.castSomething 0.034, v2.ownStack 1.853, v2.targetSide 0.086 | 0 / 0 |
| b19.jsonl:6 | 114900363710065 | modern-era-900000009-A vs modern-era-900000009-B | 1 | 9 | AllOpponentsLost | 14215 | 7 / 1 | 196 | v2.castSomething 0.173, v2.ownStack 2.214 | 0 / 0 |
| b59.jsonl:2 | 114900403700178 | vintage-900000007-A vs vintage-900000007-B | 1 | 9 | AllOpponentsLost | 14325 | 10 / 2 | 183 | v2.castSomething 0.148, v2.dominatedAttacker 0.262, v2.ownStack 2.262, v2.targetSide 0.202 | 0 / 0 |
| b53.jsonl:7 | 114900397710166 | peasant-900000005-B vs peasant-900000005-A | 1 | 9 | AllOpponentsLost | 14349 | 13 / 1 | 289 | v2.castSomething 0.26, v2.ownStack 1.907 | 0 / 0 |

Rule parts. The deciding arm, read by the first row that holds: complete 1 (complete: true, 1200 games, errors + timeouts at most 60); lower end above 0.5: 0; point at least +15 Elo: 0; upper end at least +15 Elo: 0; Elo interval contains 0: 0; lower end above -15 Elo: 0; upper end below 0: 1; upper end below -15 Elo: 1. SHOWN 0, INCONCLUSIVE 0 (case 1 0), NOT SHOWN indistinguishable 0, no weaker (case 2) 0, worse, not badly 0 (too wide 0, case 3 0), loses badly 1; candidate 0, diagnose 1. The other margin: NOT SHOWN, loses badly (candidate 0, loses badly 1); this iteration loses badly 1 (both arms). SIGNAL read 1: diff 49, hw 20.7, interval [28.3, 69.7]; SHOWN 1, AGAINST 0, NO SIGNAL 0, INCONCLUSIVE 0. The night: closes 0 (count 0, loop 0); the track closes 0 (a closing decision owed 0); the closing waits on a confirmation 0; kept open 1; a 4,800-game confirmation owed (a) 0, (b) 0; iterate as random-v7 1 (search-v2-rrandom4them-lcb-m40); a replay owed (other deals) 0; repost 0 (none); self-play from random opens 0, live seat changed 0 (both 0 on this night by the rule).

J204 (a) on the same deals (information): search-v2-rrandom4-m60 vs search-v1-anytime, 1200 games, complete true, score 0.465 [0.4449, 0.4851], Elo -24.4 [-38.4, -10.4].

J204 (b) on the same deals (information): policy-outlet vs search-v1-anytime, 1200 games, complete true, score 0.3808 [0.3601, 0.4016], Elo -84.4 [-99.9, -69.3].

J202 (b) on the same deals (information): search-v2-rrandom4-m40 vs search-v1-anytime, 1200 games, complete true, score 0.47 [0.4511, 0.4889], Elo -20.9 [-34.1, -7.7].

J202 (a) on the same deals (information): search-v2-rrandom4 vs search-v1-anytime, 1200 games, complete true, score 0.4433 [0.423, 0.4636], Elo -39.5 [-53.9, -25.3].

Beside them on the same 600 deals, against search-v2 (information only): J199 (a) random-v2 -43.7 [-57.1, -30.4], J199 (b) random-v2 searching seat only -25.5 [-38.3, -12.8], J201 (a) random-v3 -30.8 [-44.4, -17.2], J201 (b) R8 + R9 -29.6 [-43.7, -15.6].
