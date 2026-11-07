# J195: the knobs (rollout=outlets, rank=prior) and the curve's lower half (0.75 s and 6 rounds, 0.375 s and 3), each against search-v2 (D517)

**Readings under the pre-registered rule:** (a) INCONCLUSIVE: search-v2-routlets's lower end 0.4962, point 6.9 Elo, upper end 16.6 Elo; confirm with 4,800 games; exposure 74 of 1200 games (6.2%). (b) NOT SHOWN: search-v2-ranked's upper end -2.9 Elo is below +15. The knob track stays open.

**The curve, no verdict:** (c) search-v2-ms750-r6: -4.6 Elo [-14.3, 5] against search-v2; the live 1.5 s buys 4.6 Elo [-5, 14.3] over it; indistinguishable from search-v2 (its Elo interval contains 0). (d) search-v2-ms375-r3: -14.5 Elo [-26.1, -2.9] against search-v2; the live 1.5 s buys 14.5 Elo [2.9, 26.1] over it.

| match | played / planned | complete | score [95%] | Elo [95%] | draws, errors, timeouts | A ms per decision | B ms per decision | A rollouts per decision | B rollouts per decision | A / B rollouts |
|---|---|---|---|---|---|---|---|---|---|---|
| (a) search-v2-routlets vs search-v1-anytime | 1200 / 1200 | true | 0.51 [0.4962, 0.5238] | 6.9 [-2.7, 16.6] | 0, 0, 0 | 984.443 | 977.505 | 14.45 | 14.52 | 0.995 |
| (b) search-v2-ranked vs search-v1-anytime | 1200 / 1200 | true | 0.4825 [0.4692, 0.4958] | -12.2 [-21.4, -2.9] | 0, 0, 0 | 904.264 | 905.542 | 15.52 | 15.61 | 0.994 |
| (c) search-v2-ms750-r6 vs search-v1-anytime | 1200 / 1200 | true | 0.4933 [0.4795, 0.5072] | -4.6 [-14.3, 5] | 0, 0, 0 | 534.972 | 927.53 | 9.28 | 15.45 | 0.601 |
| (d) search-v2-ms375-r3 vs search-v1-anytime | 1200 / 1200 | true | 0.4792 [0.4625, 0.4958] | -14.5 [-26.1, -2.9] | 0, 0, 0 | 314.204 | 933.479 | 5.54 | 15.24 | 0.364 |

(a) config hashes: search-v2-routlets b704d57245a1, search-v1-anytime cdd55e02a89c. Deck set tools/ai-bench/pairs-confirm.txt; 600 mirrored pairs; match id justin-a-B650-GAMING-X-AX-V2:20261107T152316-2245667. Rounds per decision 5.55 / 5.58; the rollout reader saw 1200 games and 27609 / 27532 searched decisions.
(b) config hashes: search-v2-ranked bbbaad18882c, search-v1-anytime cdd55e02a89c. Deck set tools/ai-bench/pairs-confirm.txt; 600 mirrored pairs; match id justin-a-B650-GAMING-X-AX-V2:20261107T180404-301774. Rounds per decision 6.01 / 6.02; the rollout reader saw 1200 games and 27367 / 27456 searched decisions.
(c) config hashes: search-v2-ms750-r6 ef6def992355, search-v1-anytime cdd55e02a89c. Deck set tools/ai-bench/pairs-confirm.txt; 600 mirrored pairs; match id justin-a-B650-GAMING-X-AX-V2:20261107T201409-2913027. Rounds per decision 3.36 / 5.94; the rollout reader saw 1200 games and 27744 / 27549 searched decisions.
(d) config hashes: search-v2-ms375-r3 c2f054d190cf, search-v1-anytime cdd55e02a89c. Deck set tools/ai-bench/pairs-confirm.txt; 600 mirrored pairs; match id justin-a-B650-GAMING-X-AX-V2:20261107T220233-3278312. Rounds per decision 1.91 / 5.87; the rollout reader saw 1200 games and 28017 / 27692 searched decisions.
(a) Exposure, the routlets arm's seat: 74 of 1200 games recorded an opportunity.* key (6.2%; the rule's bar 3%, 36 of 1,200; J194's base rate 5.3% to 6.0%), 74 a policy.* key; search-v2's side 63 and 63 of 1200. UNEXPOSED 0.
(b) Touch rate, information only: D389's ranking ran on 1331 of 27367 searched decisions (4.9%), in 495 of 1200 games (41.3%).
(b) D389's ranking on the ranked side: 1331 decisions ranked of 27367 searched (4.9%), 8449 candidates applied once, 4323 cut, 455 prior timeouts; search-v2's side ranked 0.

| match | side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks |
|---|---|---|---|---|---|---|---|---|---|---|
| (a) | search-v2-routlets | 27609 (1199) | 3659/19095 (19.2%) | 924/6140 (15.0%) | 569/2374 (24.0%) | 5152/27609 (18.7%) | 984.443 | 989.918 / 952.84 / 1022.147 | 166 = 0.6% [0.4%, 0.8%] | unmappable 26 |
| (a) | search-v1-anytime | 27532 (1199) | 3553/18944 (18.8%) | 936/6193 (15.1%) | 531/2395 (22.2%) | 5020/27532 (18.2%) | 977.505 | 984.747 / 941.934 / 1012.206 | 131 = 0.5% [0.3%, 0.7%] | unmappable 29 |
| (b) | search-v2-ranked | 27367 (1199) | 3592/18888 (19.0%) | 913/6106 (15.0%) | 547/2373 (23.1%) | 5052/27367 (18.5%) | 904.264 | 912.768 / 864.457 / 939.011 | 113 = 0.4% [0.3%, 0.6%] | unmappable 27 |
| (b) | search-v1-anytime | 27456 (1199) | 3619/18948 (19.1%) | 887/6161 (14.4%) | 510/2347 (21.7%) | 5016/27456 (18.3%) | 905.542 | 915.822 / 865.197 / 928.453 | 80 = 0.3% [0.2%, 0.4%] | unmappable 28 |
| (c) | search-v2-ms750-r6 | 27744 (1199) | 3556/19212 (18.5%) | 932/6151 (15.2%) | 523/2381 (22.0%) | 5011/27744 (18.1%) | 534.972 | 524.292 / 552.386 / 576.162 | 424 = 1.5% [1.2%, 1.9%] | unmappable 28 |
| (c) | search-v1-anytime | 27549 (1199) | 3654/19029 (19.2%) | 921/6163 (14.9%) | 538/2357 (22.8%) | 5113/27549 (18.6%) | 927.53 | 933.862 / 891.872 / 969.643 | 137 = 0.5% [0.3%, 0.7%] | unmappable 29 |
| (d) | search-v2-ms375-r3 | 28017 (1199) | 3167/19384 (16.3%) | 792/6235 (12.7%) | 471/2398 (19.6%) | 4430/28017 (15.8%) | 314.204 | 303.609 / 336.904 / 340.823 | 1743 = 6.2% [5.6%, 6.8%] | unmappable 28 |
| (d) | search-v1-anytime | 27692 (1199) | 3642/19129 (19.0%) | 948/6234 (15.2%) | 517/2329 (22.2%) | 5107/27692 (18.4%) | 933.479 | 942.359 / 896.402 / 959.779 | 126 = 0.5% [0.3%, 0.6%] | unmappable 25 |

Rule parts, the knob arms, each on its own match: (a) complete 1 (complete: true, 1200 games, errors + timeouts at most 60); lower end above 0.5: 0; point at least +15 Elo: 0; upper end below +15 Elo: 0. SHOWN 0, NOT SHOWN 0, INCONCLUSIVE 1. (b) complete 1 (complete: true, 1200 games, errors + timeouts at most 60); lower end above 0.5: 0; point at least +15 Elo: 0; upper end below +15 Elo: 1. SHOWN 0, NOT SHOWN 1, INCONCLUSIVE 0. (a) exposed (exposure at least 3%, when NOT SHOWN): -. Knob track closed (both NOT SHOWN, (a) not UNEXPOSED): 0.
Beside them, deciding nothing, the curve arms: (c) complete 1; Elo interval contains 0 ("indistinguishable from search-v2"): 1; lower end above -10 Elo ("at most 10 Elo weaker"): 0; the live 1.5 s buys 4.6 Elo [-5, 14.3] over it. (d) complete 1; Elo interval contains 0 ("indistinguishable from search-v2"): 0; lower end above -10 Elo ("at most 10 Elo weaker"): 0; the live 1.5 s buys 14.5 Elo [2.9, 26.1] over it.

The whole curve on the same 600 deals, each arm against search-v2 (Elo [95%]; the arm's ms and rollouts a searched decision): x0.25 (this night's d) -14.5 [-26.1, -2.9], 314.204 ms, 5.54; x0.5 (c) -4.6 [-14.3, 5], 534.972 ms, 9.28; x1 search-v2 itself, 0 by definition (836-852 ms, 16.5-16.6 rollouts against the arms on J194); x2 (J194 c, search-v2-ms3000-r24) -4.1 [-13.1, +5.0], 1,488.8 ms, 28.49; x4 (J194 b, search-v2-ms6000-r48) +1.7 [-6.7, +10.2], 2,655.4 ms, 52.15. Forge Default, no search: -87.5 [-103.2, -72.1] from search-v2's side (J194 a; search-v2 930.4 ms, 15.25 rollouts against Forge).
