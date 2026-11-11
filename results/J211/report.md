# J211: the no-block seat, search-v2-no-b against search-v1-anytime, 4,800 games (D398; D536; the -10 Elo bar)

**Reading under the pre-registered rule:** NO-BLOCK SEAT HOLDS: search-v2-no-b's Elo lower end -7.4 is above -10 (point -2.2, upper end 3.1); indistinguishable (the interval holds 0); 19.345 against 21.554 search seconds a game (x0.8975, 2.209 s saved), 905.487 against 915.802 ms a searched decision, 102548 against 112970 decisions searched; searching blocks buys 2.2 Elo [-3.1, 7.4] head to head; a live-seat candidate for the owner's one word (a seat-queue row, D509); this job changes nothing.

**Described, deciding nothing:** indistinguishable (the interval holds 0). **D519's reading of the same line, as information:** NOT SHOWN.

**The live seat:** unchanged by this job (liveSeatChanged 0); SearchConfig.LIVE_DEFAULTS stays what=pab. NO-BLOCK SEAT HOLDS: search-v2-no-b is a live-seat candidate, a seat-queue row with this point, interval and the seconds saved, for the owner to say yes or no in one word (D509).

| match | played / planned | complete | score [95%] | Elo [95%] | searching blocks buys | pairs | draws, errors, timeouts | A search s per game | B search s per game | A / B | s saved per game | hours |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| J211 search-v2-no-b vs search-v1-anytime | 4800 / 4800 | true | 0.4969 [0.4893, 0.5045] | -2.2 [-7.4, 3.1] | 2.2 [-3.1, 7.4] | 2400 | 0, 0, 1 | 19.345 | 21.554 | 0.8975 | 2.209 | 8.57 |

Beside it, never pooled: J210 (pin c744a0e8), each player 1200 games against forge-default on the same 600 deals (blocks 114900000-114900149): search-v2-no-b 0.6242 [0.6034, 0.645] (+88.1 Elo), search-v1-anytime 0.6258 [0.6048, 0.6468] (+89.4 Elo); the block search taken last, paired by deal, 0.0017 score [-0.0148, 0.0182]; search seconds a game 20.9 against 22.7. A different opponent and different deals: a description of the night that named the arm, not part of this match.

Config hashes: search-v2-no-b 59505e241363, search-v1-anytime cdd55e02a89c. Deck set tools/ai-bench/pairs-confirm.txt; match id j211:20261111T075949-1913205; host j211.
Deal blocks: 600 blocks, 931900000 to 931900599 (registered: 931900000 to 931900599), 4800 games, 600 blocks of exactly 8 games; games of any other match in the folder: 0.
Cost: search-v2-no-b spent 19.345 search seconds a game against search-v1-anytime's 21.554 (x0.8975, 2.209 s a game saved), at 905.487 against 915.802 ms a searched decision, over 102548 against 112970 searched decisions. Searched by kind (priority / attacks / blocks): 77732 / 24816 / 0 against 78521 / 24775 / 9674; the batch counters: 77732 / 24816 / 0 against 78521 / 24775 / 9674. Rollouts a searched decision 15.33 / 15.44, rounds 6 / 5.94, decided on fewer than two rounds 3626 = 3.54% / 4181 = 3.70%. The seconds are this machine's (D388). The cost changes no reading.

| side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks | step timeouts |
|---|---|---|---|---|---|---|---|---|---|---|
| search-v2-no-b | 102548 (4798) | 14944/77732 (19.2%) | 3703/24816 (14.9%) | - | 18647/102548 (18.2%) | 905.487 | 915.522 / 874.054 / - | 539 = 0.5% [0.4%, 0.6%] | unmappable 109 | 19 |
| search-v1-anytime | 112970 (4797) | 15338/78521 (19.5%) | 3637/24775 (14.7%) | 2299/9674 (23.8%) | 21274/112970 (18.8%) | 915.802 | 923.136 / 872.459 / 967.27 | 588 = 0.5% [0.4%, 0.6%] | unmappable 100 | 12 |

Rule parts (D536 point 7): names 1, hashes 1, the registered blocks 1, A searched priority and attacks and no block 1, complete 1 (those four, complete: true, 4800 games, errors + timeouts at most 240, eloLo and eloHi numbers); B searched all three kinds 1 (the job's own check). Elo lower end above -10: 1; Elo upper end below -10: 0. NO-BLOCK SEAT HOLDS 1, NO-BLOCK SEAT FAILS 0, INCONCLUSIVE AT 4,800 0. Descriptive, deciding nothing: indistinguishable 1, a measured loss 0, a measured gain 0. Live-seat candidate (HOLDS; the owner's word, D509) 1; live seat changed by this job 0.
