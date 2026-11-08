# J197: the routlets confirmation, search-v2-routlets against search-v1-anytime, 4,800 games (D517, D398)

**Reading under the pre-registered rule:** NOT SHOWN: search-v2-routlets's upper end 7.9 Elo is below +15; exposure 231 of 4800 games (4.81%); 935.199 against 935.821 ms a decision (x0.9993, within 5%); with search-v2-ranked NOT SHOWN at J195, the knob track is closed for this deck set.

**The knob track:** closed for this deck set (this match NOT SHOWN and exposed; search-v2-ranked NOT SHOWN at J195, upper end -2.9 Elo).

| match | played / planned | complete | score [95%] | Elo [95%] | pairs | draws, errors, timeouts | A ms per decision | B ms per decision | A rollouts per decision | B rollouts per decision | A / B rollouts | hours |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| J197 search-v2-routlets vs search-v1-anytime | 4800 / 4800 | true | 0.5042 [0.497, 0.5113] | 2.9 [-2.1, 7.9] | 2400 | 0, 0, 1 | 935.199 | 935.821 | 15.12 | 15.18 | 0.996 | 9.5 |
| beside it, never pooled: J195 (a), the same matchup | 1200 / 1200 | true | 0.51 [0.4962, 0.5238] | 6.9 [-2.7, 16.6] | 600 | 0, 0, 0 | 984.443 | 977.505 | 14.45 | 14.52 | 0.995 | 2.68 |

Config hashes: search-v2-routlets b704d57245a1, search-v1-anytime cdd55e02a89c. Deck set tools/ai-bench/pairs-confirm.txt; match id justin-a-B650-GAMING-X-AX-V2:20261108T052348-2746448. Rounds per searched decision 5.81 / 5.84; the rollout reader saw 4800 games and 110811 / 110612 searched decisions (the match line: 110811 / 110612).
Deal blocks: 600 blocks, 114900150 to 114900749, 4800 games; J195's routlets match played 150 blocks, 114900000 to 114900149; blocks in both: 0. J195's games are not in this match (its purpose is its own) and are not pooled with it.
Cost: the arm thought 935.199 ms a decision against search-v2's 935.821 (x0.9993; within 5%: 1); rollouts a decision x0.996.
Exposure, the routlets arm's seat: 231 of 4800 games recorded an opportunity.* key (4.81%; the rule's bar 3%, 144 of 4,800; J195's (a) 74 of 1,200, 6.2%; J194's base rate 5.3% to 6.0%), 231 a policy.* key; search-v2's side 233 and 233 of 4800. UNEXPOSED 0.

| side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks | step timeouts |
|---|---|---|---|---|---|---|---|---|---|---|
| search-v2-routlets | 110811 (4800) | 14809/76604 (19.3%) | 3627/24546 (14.8%) | 2288/9661 (23.7%) | 20724/110811 (18.7%) | 935.199 | 938.61 / 901.984 / 992.544 | 587 = 0.5% [0.4%, 0.6%] | unmappable 89 | 19 |
| search-v1-anytime | 110612 (4800) | 14703/76336 (19.3%) | 3653/24539 (14.9%) | 2229/9737 (22.9%) | 20585/110612 (18.6%) | 935.821 | 939.626 / 904.015 / 986.141 | 543 = 0.5% [0.4%, 0.6%] | unmappable 75 | 23 |

Rule parts: complete 1 (complete: true, 4800 games, errors + timeouts at most 240); lower end above 0.5: 0; point at least +15 Elo: 0; upper end below +15 Elo: 1. D517 alone: NOT SHOWN. SHOWN 0, SMALL GAIN 0, INCONCLUSIVE AT 4,800 0, NOT SHOWN 1 (that order of precedence); exposed (at least 3%, when NOT SHOWN): 1. Knob track closed: 1. Live-seat candidate (SHOWN or SMALL GAIN; a separate decision): 0.
