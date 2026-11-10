# J208: random-v8, rollout=random4-them on the margin rule; (a) search-v2-rrandom4them-m40, (b) search-v2-rrandom4them (margin 20), each against search-v1-anytime (D532)

**J206, re-read (the premise):** J206 re-read: search-v2-rrandom4them-lcb-m40 NOT SHOWN, worse, not badly, -23.2 [-34.7, -11.7]; the two-losing count going in 0.

**Each arm under D527's table (SHOWN restated by D530 point 7), from its own match:** (a) NOT SHOWN, worse, not badly: search-v2-rrandom4them-m40 -19.1 Elo [-30.3, -8], score 0.4725, lower end 0.4566, margin 40; (b) NOT SHOWN, worse, not badly: search-v2-rrandom4them -19.7 Elo [-31, -8.4], score 0.4717, lower end 0.4555, margin 20.

**What follows (D532 point 4):** random-v9 follows (D532 point 5): a per-rollout mix of search-v2's Forge rollouts and random4-them rollouts at margin 40, the margin of (a), the arm with the higher point; new Java under its own decision and one 1,200-game match, after which the track closes whatever it reads unless its arm is a candidate; the self-play-from-random path does not open on this night; the live seat is unchanged (a separate decision, D509).

**Beside the reading (information, deciding nothing; every difference with another job is across D529's merge, which leaves what a match runs unchanged by D532's reading):** (b) minus (a), the margin 20 against 40: -0.6; (a) minus J206's arm (lcb at 40, the same rollouts: the rule's own effect): 4.1; (b) minus J206's arm: 3.5; (a) minus J202 (b) (both seats random, margin 40: the seating's effect under the margin rule): 1.8; (b) minus J202 (a) (both seats random, margin 20): 19.8; (a) and (b) minus J205 (a): 16.3, 15.7; minus J204 (a): 5.3, 4.7; each minus J204 (b)'s policy-outlet (SIGNAL's arithmetic, no reading): (a) 65.3 [46.4, 84.2] (+-18.9), (b) 64.7 [45.7, 83.7] (+-19). Each about +-19 between two lines.

| match | played / planned | complete | score [95%] | Elo [95%] | draws, errors, timeouts | A ms per decision | B ms per decision | A rollouts per decision | B rollouts per decision | A / B rollouts | A / B play ms a rollout | A / B copy ms a rollout | hours |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| (a) search-v2-rrandom4them-m40 vs search-v1-anytime | 1200 / 1200 | true | 0.4725 [0.4566, 0.4884] | -19.1 [-30.3, -8] | 0, 0, 0 | 930.52 | 912.737 | 16.26 | 15.55 | 1.046 | 49.87 / 51.45 | 4.61 / 4.67 | 2.24 |
| (b) search-v2-rrandom4them vs search-v1-anytime | 1200 / 1200 | true | 0.4717 [0.4555, 0.4879] | -19.7 [-31, -8.4] | 0, 0, 0 | 879.038 | 867.383 | 16.7 | 16.17 | 1.033 | 46.18 / 47.24 | 4.2 / 4.26 | 2.4 |
| J206 search-v2-rrandom4them-lcb-m40 vs search-v1-anytime (information) | | | | | | | | 16.28 | 15.45 | 1.054 | 50.01 / 51.66 | 4.6 / 4.66 | |

(a) config hashes: search-v2-rrandom4them-m40 179ab0649521, search-v1-anytime cdd55e02a89c. Deck set tools/ai-bench/pairs-confirm.txt; 600 mirrored pairs; match id justin-a-B650-GAMING-X-AX-V2:20261110T155758-1766058. Deal blocks 150, 114900000 to 114900149, 1200 games (the chain's: 1). Batch lines with config A exactly the arm's 1200 and config B exactly search-v2's 1200 of 1200. Rounds per searched decision 6.37 / 5.97; decided on fewer than two rounds 915 = 3.24% / 818 = 2.92%; rollout errors 0 / 0, step caps 0 / 0; the rollout reader saw 1200 games and 28245 / 28005 searched decisions (the match line: 28245 / 28005). Random rollouts 469063 of config A's 459394 (the opponent's random seat); search-v2's side 0; random-seat failures 39. lcb verdicts (none expected): {"overrode":0,"held":0,"none":0} / {"overrode":0,"held":0,"none":0}.

(b) config hashes: search-v2-rrandom4them d5381ade9e66, search-v1-anytime cdd55e02a89c. Deck set tools/ai-bench/pairs-confirm.txt; 600 mirrored pairs; match id justin-a-B650-GAMING-X-AX-V2:20261110T181215-2024311. Deal blocks 150, 114900000 to 114900149, 1200 games (the chain's: 1). Batch lines with config A exactly the arm's 1200 and config B exactly search-v2's 1200 of 1200. Rounds per searched decision 6.51 / 6.23; decided on fewer than two rounds 665 = 2.44% / 639 = 2.30%; rollout errors 0 / 0, step caps 0 / 0; the rollout reader saw 1200 games and 27237 / 27726 searched decisions (the match line: 27237 / 27726). Random rollouts 463271 of config A's 454809 (the opponent's random seat); search-v2's side 0; random-seat failures 67. lcb verdicts (none expected): {"overrode":0,"held":0,"none":0} / {"overrode":0,"held":0,"none":0}.

| side | changed Forge p / a / b | priority: from a pass / to another play / to a pass (of priority decisions) |
|---|---|---|
| (a) search-v2-rrandom4them-m40 | 15.3% / 14.1% / 17.5% | 6.70% / 5.58% / 3.03% |
| (a) search-v2 | 19.1% / 15.3% / 18.0% | 8.08% / 6.34% / 4.68% |
| (b) search-v2-rrandom4them | 20.1% / 17.7% / 22.0% | 8.87% / 6.99% / 4.29% |
| (b) search-v2 | 19.1% / 14.6% / 18.1% | 8.05% / 6.27% / 4.81% |
| J206 search-v2-rrandom4them-lcb-m40 (the opponent alone random, lcb at 40) | 11.2% / 8.5% / 11.6% | 5.11% / 4.17% / 1.94% |
| J206 search-v2 | 19.1% / 14.7% / 16.8% | 7.96% / 6.36% / 4.80% |
| J202 (b) search-v2-rrandom4-m40 (both seats random, margin 40) | 31.7% / 14.3% / 18.0% | 16.41% / 10.51% / 4.82% |
| J202 (b) search-v2 | 19.1% / 14.8% / 19.5% | 8.15% / 6.27% / 4.65% |
| J202 (a) search-v2-rrandom4 (both seats random, margin 20) | 39.5% / 19.9% / 22.1% | 19.24% / 12.38% / 7.85% |
| J202 (a) search-v2 | 19.1% / 14.5% / 18.6% | 7.99% / 6.25% / 4.81% |

D532 point 7 (expected, not registered): (a)'s overrides above J206's in every kind and near search-v2's, its from-pass share near search-v2's 7.96% rather than J202 (b)'s 16.4%; (b)'s above (a)'s, its attack overrides the question (J202 (a), both seats random at margin 20: attack 19.9% against search-v2's 14.8%).

| search.rr.<name> | (a) fires | (a) per random rollout | (b) fires | (b) per random rollout | J206 per random rollout |
|---|---|---|---|---|---|
| v2.castSomething | 14042 | 0.0299 | 13759 | 0.0297 | 0.0292 |
| v2.chumpBlock | 25616 | 0.0546 | 26371 | 0.0569 | 0.0547 |
| v2.lethalBlock | 9249 | 0.0197 | 9395 | 0.0203 | 0.0204 |
| v2.ownStack | 200361 | 0.4272 | 201001 | 0.4339 | 0.435 |
| v2.targetSide | 111389 | 0.2375 | 112535 | 0.2429 | 0.2477 |
| v3.goodBlock | 7461 | 0.0159 | 7783 | 0.0168 | 0.0158 |
| v3.goodBlockIllegal | 10 | 0 | 27 | 0.0001 | 0 |
| v4.goodBlockLethal | 1056 | 0.0023 | 1015 | 0.0022 | 0.0021 |
| v4.goodBlockRefused | 12284 | 0.0262 | 11162 | 0.0241 | 0.0221 |
| cardTargetOffered | 66983 | 0.1428 | 68229 | 0.1473 | 0.1515 |
| costTargetAvoided | 10 | 0 | 4 | 0 | 0 |
| failures | 39 | 0.0001 | 67 | 0.0001 | - |
| land | 7443 | 0.0159 | 7463 | 0.0161 | 0.0157 |
| noRepeatNoOp | 8936 | 0.0191 | 8338 | 0.018 | 0.0187 |
| noRepeatRefused | 172 | 0.0004 | 268 | 0.0006 | 0.0003 |
| refusedCast | 216 | 0.0005 | 304 | 0.0007 | 0.0005 |
| targetCountTrimmed | 27 | 0.0001 | 42 | 0.0001 | 0.0001 |
| xDrawn | 865 | 0.0018 | 896 | 0.0019 | 0.0031 |
| zeroXLeftOut | 12829 | 0.0274 | 11961 | 0.0258 | 0.0363 |
| rollouts (the denominator) | 469063 | 1 | 463271 | 1 | 1 |

| side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks | step timeouts |
|---|---|---|---|---|---|---|---|---|---|---|
| (a) search-v2-rrandom4them-m40 | 28245 (1199) | 2986/19513 (15.3%) | 881/6268 (14.1%) | 432/2464 (17.5%) | 4299/28245 (15.2%) | 930.52 | 930.536 / 901.347 / 1004.6 | 112 = 0.4% [0.2%, 0.6%] | unmappable 28 | 4 |
| (a) search-v1-anytime | 28005 (1198) | 3669/19218 (19.1%) | 960/6287 (15.3%) | 451/2500 (18.0%) | 5080/28005 (18.1%) | 912.737 | 919.276 / 883.029 / 937.178 | 80 = 0.3% [0.2%, 0.4%] | unmappable 32 | 1 |
| (b) search-v2-rrandom4them | 27237 (1199) | 3774/18735 (20.1%) | 1087/6147 (17.7%) | 519/2355 (22.0%) | 5380/27237 (19.8%) | 879.038 | 881.712 / 848.582 / 937.261 | 90 = 0.3% [0.2%, 0.5%] | unmappable 26 | 3 |
| (b) search-v1-anytime | 27726 (1199) | 3642/19039 (19.1%) | 899/6172 (14.6%) | 454/2515 (18.1%) | 4995/27726 (18.0%) | 867.383 | 877.648 / 829.706 / 882.137 | 60 = 0.2% [0.1%, 0.3%] | unmappable 31 | 2 |

(a) search-v2-rrandom4them-m40: 633 lost, 567 won, 0 drawn, errored or timed out of 1200 batch lines; mean turns 17.73 lost, 17.75 won; lines whose config A does not end in the rollout value: 0. No life total is on a batch line: a diagnosis replays a game's seed with full recording for it (D523 point 10).

(a) the ten longest lost games (turns descending):

| batch:line | seed | arm's deck vs search-v2's | arm seat | turns | reason | ms | searched / changed | random rollouts | search.rr.v2.*, v3.* and v4.* per random rollout | failures / rollout errors |
|---|---|---|---|---|---|---|---|---|---|---|
| b61.jsonl:5 | 114900405710191 | fair-fight-900000007-B vs fair-fight-900000007-A | 0 | 39 | AllOpponentsLost | 132464 | 56 / 8 | 734 | v2.castSomething 0.03, v2.chumpBlock 0.104, v2.ownStack 0.613, v2.targetSide 0.496, v3.goodBlock 0.007 | 0 / 0 |
| b82.jsonl:6 | 114900426710254 | peasant-900000001-A vs peasant-900000001-B | 1 | 38 | AllOpponentsLost | 80372 | 56 / 6 | 785 | v2.castSomething 0.006, v2.chumpBlock 0.001, v2.ownStack 0.34, v2.targetSide 0.152, v3.goodBlock 0.008 | 0 / 0 |
| b138.jsonl:6 | 114900482710422 | modern-era-900000005-A vs modern-era-900000005-B | 1 | 37 | AllOpponentsLost | 82337 | 30 / 4 | 433 | v2.castSomething 0.032, v2.chumpBlock 0.048, v2.ownStack 0.363, v2.targetSide 0.069, v3.goodBlock 0.002 | 0 / 0 |
| b61.jsonl:6 | 114900405710191 | fair-fight-900000007-A vs fair-fight-900000007-B | 1 | 35 | AllOpponentsLost | 109943 | 56 / 14 | 688 | v2.castSomething 0.017, v2.chumpBlock 0.036, v2.lethalBlock 0.006, v2.ownStack 0.574, v2.targetSide 0.001, v3.goodBlock 0.02, v4.goodBlockLethal 0.006, v4.goodBlockRefused 0.071 | 0 / 0 |
| b48.jsonl:6 | 114900392710152 | modern-era-900000005-A vs modern-era-900000005-B | 1 | 35 | AllOpponentsLost | 97778 | 43 / 8 | 563 | v2.castSomething 0.044, v2.chumpBlock 0.027, v2.ownStack 0.485, v2.targetSide 0.007, v3.goodBlock 0.021 | 0 / 0 |
| b59.jsonl:5 | 114900403710185 | vintage-900000009-B vs vintage-900000009-A | 0 | 35 | AllOpponentsLost | 93791 | 52 / 7 | 620 | v2.castSomething 0.026, v2.ownStack 1.295, v2.targetSide 1.961, v3.goodBlock 0.006 | 0 / 0 |
| b76.jsonl:6 | 114900420710236 | fair-fight-900000007-A vs fair-fight-900000007-B | 1 | 35 | AllOpponentsLost | 83415 | 35 / 6 | 487 | v2.castSomething 0.078, v2.ownStack 0.692 | 0 / 0 |
| b96.jsonl:2 | 114900440700289 | pauper-900000005-A vs pauper-900000005-B | 1 | 35 | AllOpponentsLost | 78305 | 49 / 5 | 686 | v2.castSomething 0.013, v2.chumpBlock 0.044, v2.ownStack 0.138, v2.targetSide 0.087, v3.goodBlock 0.022 | 0 / 0 |
| b91.jsonl:6 | 114900435710281 | fair-fight-900000007-A vs fair-fight-900000007-B | 1 | 35 | AllOpponentsLost | 77941 | 38 / 7 | 422 | v2.castSomething 0.097, v2.chumpBlock 0.055, v2.ownStack 2.083, v3.goodBlock 0.019 | 0 / 0 |
| b3.jsonl:0 | 114900347700009 | modern-era-900000003-A vs modern-era-900000003-B | 0 | 34 | AllOpponentsLost | 139892 | 66 / 6 | 848 | v2.castSomething 0.011, v2.chumpBlock 0.024, v2.ownStack 0.358, v2.targetSide 0.009, v3.goodBlock 0.022 | 0 / 0 |

(a) the ten quickest lost games (turns ascending):

| batch:line | seed | arm's deck vs search-v2's | arm seat | turns | reason | ms | searched / changed | random rollouts | search.rr.v2.*, v3.* and v4.* per random rollout | failures / rollout errors |
|---|---|---|---|---|---|---|---|---|---|---|
| b58.jsonl:2 | 114900402700175 | vintage-900000003-A vs vintage-900000003-B | 1 | 7 | AllOpponentsLost | 11551 | 10 / 0 | 243 | v2.castSomething 0.008, v2.ownStack 0.016 | 0 / 0 |
| b14.jsonl:3 | 114900358700042 | vintage-900000007-B vs vintage-900000007-A | 1 | 7 | AllOpponentsLost | 11763 | 4 / 1 | 80 | v2.ownStack 0.25, v2.targetSide 1.213 | 0 / 0 |
| b14.jsonl:4 | 114900358710049 | vintage-900000009-A vs vintage-900000009-B | 0 | 7 | AllOpponentsLost | 11834 | 2 / 1 | 54 | v2.ownStack 0.481 | 0 / 0 |
| b87.jsonl:6 | 114900431710269 | vintage-900000001-A vs vintage-900000001-B | 1 | 9 | AllOpponentsLost | 5654 | 1 / 0 | 24 | v2.ownStack 0.375 | 0 / 0 |
| b118.jsonl:5 | 114900462710362 | vintage-900000005-B vs vintage-900000005-A | 0 | 9 | AllOpponentsLost | 10875 | 6 / 0 | 116 | v2.ownStack 0.043, v2.targetSide 0.155 | 0 / 0 |
| b19.jsonl:0 | 114900363700057 | modern-era-900000007-A vs modern-era-900000007-B | 0 | 9 | AllOpponentsLost | 11999 | 5 / 0 | 139 | v2.ownStack 0.014, v2.targetSide 0.058 | 0 / 0 |
| b28.jsonl:0 | 114900372700084 | vintage-900000003-A vs vintage-900000003-B | 0 | 9 | AllOpponentsLost | 13013 | 5 / 1 | 83 | v2.castSomething 0.024, v2.chumpBlock 0.108, v2.ownStack 0.349 | 0 / 0 |
| b3.jsonl:2 | 114900347700010 | modern-era-900000003-A vs modern-era-900000003-B | 1 | 9 | AllOpponentsLost | 13482 | 9 / 2 | 150 | v2.castSomething 0.013, v2.ownStack 0.413, v2.targetSide 1.96 | 0 / 0 |
| b34.jsonl:2 | 114900378700103 | modern-era-900000007-A vs modern-era-900000007-B | 1 | 9 | AllOpponentsLost | 14295 | 8 / 1 | 174 | v2.ownStack 0.063, v2.targetSide 0.161 | 0 / 0 |
| b59.jsonl:2 | 114900403700178 | vintage-900000007-A vs vintage-900000007-B | 1 | 9 | AllOpponentsLost | 15064 | 11 / 2 | 208 | v2.castSomething 0.019, v2.ownStack 0.625, v3.goodBlock 0.029 | 0 / 0 |

(b) search-v2-rrandom4them: 634 lost, 566 won, 0 drawn, errored or timed out of 1200 batch lines; mean turns 17.65 lost, 17.34 won; lines whose config A does not end in the rollout value: 0. No life total is on a batch line: a diagnosis replays a game's seed with full recording for it (D523 point 10).

(b) the ten longest lost games (turns descending):

| batch:line | seed | arm's deck vs search-v2's | arm seat | turns | reason | ms | searched / changed | random rollouts | search.rr.v2.*, v3.* and v4.* per random rollout | failures / rollout errors |
|---|---|---|---|---|---|---|---|---|---|---|
| b107.jsonl:1 | 114900451700322 | fair-fight-900000009-B vs fair-fight-900000009-A | 0 | 42 | AllOpponentsLost | 135658 | 61 / 6 | 876 | v2.castSomething 0.098, v2.chumpBlock 0.045, v2.ownStack 0.618, v2.targetSide 0.021, v3.goodBlock 0.018 | 0 / 0 |
| b7.jsonl:5 | 114900351710029 | peasant-900000001-B vs peasant-900000001-A | 0 | 38 | AllOpponentsLost | 85934 | 49 / 10 | 694 | v2.castSomething 0.009, v2.chumpBlock 0.072, v2.lethalBlock 0.001, v2.ownStack 0.059, v2.targetSide 0.014, v3.goodBlock 0.013, v4.goodBlockLethal 0.004 | 0 / 0 |
| b61.jsonl:6 | 114900405710191 | fair-fight-900000007-A vs fair-fight-900000007-B | 1 | 37 | AllOpponentsLost | 123353 | 61 / 14 | 735 | v2.castSomething 0.004, v2.chumpBlock 0.06, v2.lethalBlock 0.003, v2.ownStack 0.739, v3.goodBlock 0.02, v4.goodBlockLethal 0.003, v4.goodBlockRefused 0.005 | 0 / 0 |
| b106.jsonl:7 | 114900450710325 | fair-fight-900000007-B vs fair-fight-900000007-A | 1 | 36 | AllOpponentsLost | 78644 | 46 / 8 | 559 | v2.castSomething 0.013, v2.chumpBlock 0.03, v2.ownStack 0.156, v2.targetSide 0.12, v3.goodBlock 0.004 | 0 / 0 |
| b82.jsonl:4 | 114900426710253 | peasant-900000001-A vs peasant-900000001-B | 0 | 36 | AllOpponentsLost | 64652 | 36 / 5 | 595 | v2.castSomething 0.027, v2.ownStack 0.477, v2.targetSide 1.129, v3.goodBlock 0.007 | 0 / 0 |
| b91.jsonl:6 | 114900435710281 | fair-fight-900000007-A vs fair-fight-900000007-B | 1 | 35 | AllOpponentsLost | 82812 | 40 / 8 | 487 | v2.castSomething 0.09, v2.chumpBlock 0.072, v2.ownStack 1.891, v3.goodBlock 0.037 | 0 / 0 |
| b1.jsonl:6 | 114900345710011 | fair-fight-900000007-A vs fair-fight-900000007-B | 1 | 34 | AllOpponentsLost | 92566 | 35 / 8 | 503 | v2.castSomething 0.006, v2.chumpBlock 0.004, v2.ownStack 1.058, v3.goodBlock 0.034 | 0 / 0 |
| b82.jsonl:6 | 114900426710254 | peasant-900000001-A vs peasant-900000001-B | 1 | 34 | AllOpponentsLost | 69962 | 46 / 7 | 697 | v2.castSomething 0.019, v2.chumpBlock 0.003, v2.ownStack 0.376, v2.targetSide 0.253, v3.goodBlock 0.016 | 0 / 0 |
| b125.jsonl:2 | 114900469700376 | pauper-900000001-A vs pauper-900000001-B | 1 | 34 | AllOpponentsLost | 59784 | 34 / 6 | 542 | v2.chumpBlock 0.101, v2.ownStack 0.53, v2.targetSide 0.074, v3.goodBlock 0.006, v4.goodBlockLethal 0.006 | 0 / 0 |
| b96.jsonl:2 | 114900440700289 | pauper-900000005-A vs pauper-900000005-B | 1 | 32 | AllOpponentsLost | 61856 | 25 / 5 | 454 | v2.castSomething 0.022, v2.ownStack 0.324, v2.targetSide 0.11 | 0 / 0 |

(b) the ten quickest lost games (turns ascending):

| batch:line | seed | arm's deck vs search-v2's | arm seat | turns | reason | ms | searched / changed | random rollouts | search.rr.v2.*, v3.* and v4.* per random rollout | failures / rollout errors |
|---|---|---|---|---|---|---|---|---|---|---|
| b14.jsonl:4 | 114900358710049 | vintage-900000009-A vs vintage-900000009-B | 0 | 7 | AllOpponentsLost | 10045 | 2 / 1 | 54 | v2.ownStack 0.426 | 0 / 0 |
| b14.jsonl:3 | 114900358700042 | vintage-900000007-B vs vintage-900000007-A | 1 | 7 | AllOpponentsLost | 11165 | 4 / 1 | 78 | v2.ownStack 0.269, v2.targetSide 1.41 | 0 / 0 |
| b58.jsonl:2 | 114900402700175 | vintage-900000003-A vs vintage-900000003-B | 1 | 7 | AllOpponentsLost | 11812 | 11 / 2 | 230 | v2.castSomething 0.009, v2.ownStack 0.152, v3.goodBlock 0.004 | 0 / 0 |
| b87.jsonl:6 | 114900431710269 | vintage-900000001-A vs vintage-900000001-B | 1 | 9 | AllOpponentsLost | 5321 | 1 / 0 | 24 | v2.ownStack 0.375 | 0 / 0 |
| b118.jsonl:5 | 114900462710362 | vintage-900000005-B vs vintage-900000005-A | 0 | 9 | AllOpponentsLost | 9826 | 6 / 0 | 114 | v2.ownStack 0.026, v2.targetSide 0.123 | 0 / 0 |
| b19.jsonl:0 | 114900363700057 | modern-era-900000007-A vs modern-era-900000007-B | 0 | 9 | AllOpponentsLost | 10925 | 2 / 1 | 63 | v2.ownStack 0.048, v2.targetSide 0.222 | 0 / 0 |
| b28.jsonl:0 | 114900372700084 | vintage-900000003-A vs vintage-900000003-B | 0 | 9 | AllOpponentsLost | 12633 | 5 / 1 | 82 | v2.castSomething 0.049, v2.chumpBlock 0.073, v2.ownStack 0.366 | 0 / 0 |
| b59.jsonl:2 | 114900403700178 | vintage-900000007-A vs vintage-900000007-B | 1 | 9 | AllOpponentsLost | 13732 | 11 / 2 | 201 | v2.ownStack 0.711, v3.goodBlock 0.025 | 0 / 0 |
| b53.jsonl:7 | 114900397710166 | peasant-900000005-B vs peasant-900000005-A | 1 | 9 | AllOpponentsLost | 14068 | 14 / 2 | 289 | v2.ownStack 0.097, v2.targetSide 0.021 | 0 / 0 |
| b34.jsonl:2 | 114900378700103 | modern-era-900000007-A vs modern-era-900000007-B | 1 | 9 | AllOpponentsLost | 14098 | 7 / 1 | 183 | v2.ownStack 0.033, v2.targetSide 0.115 | 0 / 0 |

Rule parts, (a) at margin 40: complete 1 (complete: true, 1200 games, errors + timeouts at most 60); lower end above 0.5: 0; point at least +15 Elo: 0; upper end at least +15 Elo: 0; Elo interval contains 0: 0; lower end above -15 Elo: 0; upper end below 0: 1; upper end below -15 Elo: 0. SHOWN 0, INCONCLUSIVE 0 (case 1 0), NOT SHOWN indistinguishable 0, no weaker (case 2) 0, worse, not badly 1 (too wide 0, case 3 0), loses badly 0; candidate 0, diagnose 1.

Rule parts, (b) at margin 20: complete 1 (complete: true, 1200 games, errors + timeouts at most 60); lower end above 0.5: 0; point at least +15 Elo: 0; upper end at least +15 Elo: 0; Elo interval contains 0: 0; lower end above -15 Elo: 0; upper end below 0: 1; upper end below -15 Elo: 0. SHOWN 0, INCONCLUSIVE 0 (case 1 0), NOT SHOWN indistinguishable 0, no weaker (case 2) 0, worse, not badly 1 (too wide 0, case 3 0), loses badly 0; candidate 0, diagnose 1.

What follows: both complete 1; a confirmation 0 ((a) 0, (b) 0); both lose badly 0, the track closes 0 (a closing decision owed 0); random-v9 1 at margin 40 ((a) ahead or tied 1, (b) ahead 0); exactly one followed 1; kept open 1; repost 0 ((a) 0, (b) 0); self-play from random opens 0, live seat changed 0 (both 0 on this night by the rule).

J206 on the same deals, at an earlier pin (information): search-v2-rrandom4them-lcb-m40 vs search-v1-anytime, 1200 games, complete true, score 0.4667 [0.4502, 0.4831], Elo -23.2 [-34.7, -11.7].

J205 (a) on the same deals, at an earlier pin (information): search-v2-rrandom4-lcb-m40 vs search-v1-anytime, 1200 games, complete true, score 0.4492 [0.4292, 0.4691], Elo -35.4 [-49.5, -21.5].

J204 (a) on the same deals, at an earlier pin (information): search-v2-rrandom4-m60 vs search-v1-anytime, 1200 games, complete true, score 0.465 [0.4449, 0.4851], Elo -24.4 [-38.4, -10.4].

J204 (b) on the same deals, at an earlier pin (information): policy-outlet vs search-v1-anytime, 1200 games, complete true, score 0.3808 [0.3601, 0.4016], Elo -84.4 [-99.9, -69.3].

J202 (a) on the same deals, at an earlier pin (information): search-v2-rrandom4 vs search-v1-anytime, 1200 games, complete true, score 0.4433 [0.423, 0.4636], Elo -39.5 [-53.9, -25.3].

J202 (b) on the same deals, at an earlier pin (information): search-v2-rrandom4-m40 vs search-v1-anytime, 1200 games, complete true, score 0.47 [0.4511, 0.4889], Elo -20.9 [-34.1, -7.7].

Beside them on the same 600 deals, against search-v2 (information only): J199 (a) random-v2 -43.7 [-57.1, -30.4], J199 (b) random-v2 searching seat only -25.5 [-38.3, -12.8], J201 (a) random-v3 -30.8 [-44.4, -17.2], J201 (b) R8 + R9 -29.6 [-43.7, -15.6], J205 (b) lcb at 60 -34.3 [-47.8, -20.9].
