# J194: the compute curve (search-v2 at 1.5 s and 12 rounds, 3 s and 24, 6 s and 48; D514)

**Reading under the pre-registered rule (match b alone): COMPUTE DOES NOT PAY: search-v2-ms6000-r48's upper end 10.2 Elo is below +20.**

| match | played / planned | complete | score [95%] | Elo [95%] | draws, errors, timeouts | A ms per decision | B ms per decision | A rollouts per decision | B rollouts per decision | A / B rollouts |
|---|---|---|---|---|---|---|---|---|---|---|
| (a) search-v1-anytime vs forge-default | 1200 / 1200 | true | 0.6233 [0.6023, 0.6444] | 87.5 [72.1, 103.2] | 0, 0, 0 | 930.434 | - | 15.25 | - | - |
| (b) search-v2-ms6000-r48 vs search-v1-anytime | 1200 / 1200 | true | 0.5025 [0.4904, 0.5146] | 1.7 [-6.7, 10.2] | 0, 0, 0 | 2655.39 | 836.059 | 52.15 | 16.62 | 3.138 |
| (c) search-v2-ms3000-r24 vs search-v1-anytime | 1200 / 1200 | true | 0.4942 [0.4812, 0.5071] | -4.1 [-13.1, 5] | 0, 0, 0 | 1488.797 | 852.209 | 28.49 | 16.46 | 1.731 |

(a) config hashes: search-v1-anytime cdd55e02a89c, forge-default 3ed453ffef1c. Deck set tools/ai-bench/pairs-confirm.txt; 600 mirrored pairs; match id justin-a-B650-GAMING-X-AX-V2:20261106T013313-3031475. Rounds per decision 5.82 / -; the rollout reader saw 1200 games and 29179 / 0 searched decisions.
(b) config hashes: search-v2-ms6000-r48 6bab8ca5e273, search-v1-anytime cdd55e02a89c. Deck set tools/ai-bench/pairs-confirm.txt; 600 mirrored pairs; match id justin-a-B650-GAMING-X-AX-V2:20261106T024944-685635. Rounds per decision 22.66 / 6.41; the rollout reader saw 1200 games and 27123 / 27281 searched decisions.
(c) config hashes: search-v2-ms3000-r24 994bf685f6b9, search-v1-anytime cdd55e02a89c. Deck set tools/ai-bench/pairs-confirm.txt; 600 mirrored pairs; match id justin-a-B650-GAMING-X-AX-V2:20261106T064626-3821578. Rounds per decision 11.76 / 6.36; the rollout reader saw 1200 games and 27378 / 27593 searched decisions.

| match | side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks |
|---|---|---|---|---|---|---|---|---|---|---|
| (a) | search-v1-anytime | 29179 (1199) | 4004/20434 (19.6%) | 1073/6839 (15.7%) | 304/1906 (15.9%) | 5381/29179 (18.4%) | 930.434 | 939.669 / 908.017 / 911.865 | 204 = 0.7% [0.4%, 1.0%] | unmappable 23 |
| (a) | forge-default | no search | | | | | | | | |
| (b) | search-v2-ms6000-r48 | 27123 (1199) | 3552/18656 (19.0%) | 881/6104 (14.4%) | 520/2363 (22.0%) | 4953/27123 (18.3%) | 2655.39 | 2895.61 / 2009.267 / 2427.874 | 3 = 0.0% [0.0%, 0.0%] | unmappable 29 |
| (b) | search-v1-anytime | 27281 (1199) | 3623/18803 (19.3%) | 911/6118 (14.9%) | 551/2360 (23.3%) | 5085/27281 (18.6%) | 836.059 | 845.435 / 797.665 / 860.887 | 93 = 0.3% [0.2%, 0.5%] | unmappable 24 |
| (c) | search-v2-ms3000-r24 | 27378 (1199) | 3597/18820 (19.1%) | 897/6150 (14.6%) | 529/2408 (22.0%) | 5023/27378 (18.3%) | 1488.797 | 1567.36 / 1256.938 / 1466.943 | 6 = 0.0% [0.0%, 0.0%] | unmappable 27 |
| (c) | search-v1-anytime | 27593 (1199) | 3593/19050 (18.9%) | 935/6149 (15.2%) | 563/2394 (23.5%) | 5091/27593 (18.5%) | 852.209 | 861.151 / 816.646 / 872.395 | 65 = 0.2% [0.1%, 0.3%] | unmappable 28 |

Rule parts, match (b) only: complete 1 (complete: true, 1200 games, errors + timeouts at most 60); lower end above 0.5: 0; point at least +15 Elo: 0; upper end below +20 Elo: 1. PAYS 0, DOES NOT PAY 1, INCONCLUSIVE 0.
Beside it, deciding nothing: (a) complete 1, the baseline; (c) complete 1; (c)'s Elo over (b)'s: -2.41.
