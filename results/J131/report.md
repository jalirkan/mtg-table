# J131: search-v2 with the learned evaluator at its leaves (D437)

**Reading under the pre-registered rule: NOT SHOWN: the lower end 0.4933 is not above 0.5.**

| match | played / planned | complete | score [95%] | Elo [95%] | draws, errors, timeouts |
|---|---|---|---|---|---|
| search-v2-evalleaf vs search-v1-anytime | 1200 / 1200 | true | 0.5125 [0.4933, 0.5317] | 8.7 [-4.7, 22.1] | 0, 0, 0 |

Players' config hashes: search-v2-evalleaf c6d9a3990415, search-v1-anytime cdd55e02a89c. Deck set tools/ai-bench/pairs-confirm.txt; 600 mirrored pairs.

| side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks | evaluator leaves | us per leaf |
|---|---|---|---|---|---|---|---|---|---|---|---|
| search-v2-evalleaf | 27900 (1200) | 4830/19673 (24.6%) | 1282/5999 (21.4%) | 600/2228 (26.9%) | 6712/27900 (24.1%) | 772.407 | 779.441 / 695.69 / 916.868 | 99 = 0.4% [0.2%, 0.5%] | unmappable 34, rolloutErrors 59 | 452130 | 122.91 |
| search-v1-anytime | 28025 (1200) | 3869/19227 (20.1%) | 812/6092 (13.3%) | 388/2706 (14.3%) | 5069/28025 (18.1%) | 767.034 | 772.053 / 704.899 / 871.254 | 135 = 0.5% [0.3%, 0.6%] | rolloutErrors 65, unmappable 43 | 0 | - |

Rule parts: complete 1 (complete: true, 1200 games, errors + timeouts at most 60), lower end above 0.5: 0; ADOPT 0.
