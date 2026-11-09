# J198: the faster seat, search-v2-ms750-r6 against search-v1-anytime, 4,800 games (D398; D517's "at most 10 Elo weaker" bar)

**Reading under the pre-registered rule:** INCONCLUSIVE AT 4,800: search-v2-ms750-r6's Elo lower end -11.7, point -6.5, upper end -1.3; 551.793 against 955.459 ms a decision (x0.5775); budget fallbacks 2.2% [2.0%, 2.4%] against 0.6% [0.5%, 0.7%]; the live seat stays and the question is left as information.

**The live seat:** unchanged by this job (liveSeatChanged 0); SearchConfig.LIVE_DEFAULTS stays anytime=1 at 1,500 ms and 12 rounds. INCONCLUSIVE AT 4,800: the live seat stays and the question is left as information.

| match | played / planned | complete | score [95%] | Elo [95%] | the live 1.5 s buys | pairs | draws, errors, timeouts | A ms per decision | B ms per decision | A / B ms | A rollouts per decision | B rollouts per decision | A / B rollouts | hours |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| J198 search-v2-ms750-r6 vs search-v1-anytime | 4800 / 4800 | true | 0.4906 [0.4832, 0.4981] | -6.5 [-11.7, -1.3] | 6.5 [1.3, 11.7] | 2400 | 0, 0, 0 | 551.793 | 955.459 | 0.5775 | 8.91 | 14.82 | 0.601 | 7.35 |
| beside it, never pooled: J195 (c), the same matchup | 1200 / 1200 | true | 0.4933 [0.4795, 0.5072] | -4.6 [-14.3, 5] | 4.6 [-5, 14.3] | 600 | 0, 0, 0 | 534.972 | 927.53 | 0.5768 | 9.28 | 15.45 | 0.601 | 1.8 |

Config hashes: search-v2-ms750-r6 ef6def992355, search-v1-anytime cdd55e02a89c. Deck set tools/ai-bench/pairs-confirm.txt; match id justin-a-B650-GAMING-X-AX-V2:20261108T203835-1791068. Rounds per searched decision 3.23 / 5.69 (J195 (c): 3.36 / 5.94); decided on fewer than two rounds (search.anytime.short) 15254 = 13.70% / 4908 = 4.42%; the rollout reader saw 4800 games and 111372 / 111118 searched decisions (the match line: 111372 / 111118).
Deal blocks: 600 blocks, 114900150 to 114900749, 4800 games; J195's (c) played 150 blocks, 114900000 to 114900149; blocks in both: 0. J195's (c) games are not in this match (its purpose is its own) and are not pooled with it.
Cost: the arm thought 551.793 ms a decision against search-v2's 955.459 (x0.5775); rollouts a decision x0.601; budget fallbacks 2399 = 2.2% [2.0%, 2.4%] against 651 = 0.6% [0.5%, 0.7%] (J195 (c): 1.5% [1.2%, 1.9%] against 0.5% [0.3%, 0.7%]). The cost changes no reading.

| side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks | step timeouts |
|---|---|---|---|---|---|---|---|---|---|---|
| search-v2-ms750-r6 | 111372 (4800) | 14175/77053 (18.4%) | 3607/24665 (14.6%) | 2209/9654 (22.9%) | 19991/111372 (17.9%) | 551.793 | 539.038 / 571.546 / 603.132 | 2399 = 2.2% [2.0%, 2.4%] | unmappable 92 | 29 |
| search-v1-anytime | 111118 (4800) | 14918/76752 (19.4%) | 3637/24697 (14.7%) | 2245/9669 (23.2%) | 20800/111118 (18.7%) | 955.459 | 958.899 / 924.939 / 1006.115 | 651 = 0.6% [0.5%, 0.7%] | unmappable 93 | 24 |

Rule parts: complete 1 (complete: true, 4800 games, errors + timeouts at most 240, eloLo and eloHi numbers); Elo lower end above -10: 0; Elo upper end below -10: 0. FASTER SEAT HOLDS 0, FASTER SEAT FAILS 0, INCONCLUSIVE AT 4,800 1. Descriptive, deciding nothing: indistinguishable from search-v2 (the Elo interval contains 0) 0. Live-seat candidate (HOLDS; a separate decision) 0; live seat changed by this job 0.
