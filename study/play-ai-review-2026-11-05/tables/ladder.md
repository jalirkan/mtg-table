# The ladder's verdicts (`var/ai-ladder/match.jsonl`, `sprt.jsonl`, the runner's clone)

## Fixed matches (D398), confirm set, mirrored pairs

| date | A | B | games | A score [95%] | Elo [95%] | A searched / changed (rate) | A ms/decision | B ms/decision |
|---|---|---|---|---|---|---|---|---|
| 2026-10-06 | search-v1-reckless | forge-default | 1200 | 0.6233 [0.6016, 0.6451] | +87.5 [+71.6, +103.8] | 29219 / 4640 (0.159) | – | – |
| 2026-10-07 | search-v1 | forge-default | 1200 | 0.6033 [0.5820, 0.6247] | +72.9 [+57.5, +88.5] | 30048 / 4364 (0.145) | – | – |
| 2026-10-07 | search-v1-anytime | search-v1 | 2400 | 0.5133 [0.5036, 0.5230] | +9.3 [+2.5, +16.0] | 55603 / 10113 (0.182) | – | – |
| 2026-10-09 | search-v2-mull | search-v1-anytime | 1200 | 0.4917 [0.4750, 0.5083] | -5.8 [-17.4, +5.8] | 27931 / 5097 (0.182) | – | – |
| 2026-10-09 | search-v2-targets | search-v1-anytime | 1200 | 0.5100 [0.4962, 0.5238] | +6.9 [-2.7, +16.6] | 27669 / 5043 (0.182) | – | – |
| 2026-10-09 | search-v2-targets | search-v1-anytime | 4800 | 0.5031 [0.4956, 0.5106] | +2.2 [-3.0, +7.4] | 111769 / 20812 (0.186) | – | – |
| 2026-10-14 | search-v2-whand50 | search-v1-anytime | 1200 | 0.4917 [0.4769, 0.5065] | -5.8 [-16.1, +4.5] | 27438 / 4933 (0.180) | – | – |
| 2026-10-15 | search-v2-distill-150cee98c455 | search-v1-anytime | 1200 | 0.3867 [0.3652, 0.4082] | -80.1 [-96.1, -64.5] | 29936 / 2160 (0.072) | 5.112 | 896.32 |
| 2026-10-15 | search-v2-distill-150cee98c455 | forge-default | 1200 | 0.4850 [0.4649, 0.5051] | -10.4 [-24.4, +3.6] | 31866 / 2332 (0.073) | 7.928 | – |
| 2026-10-16 | search-v2-evalleaf | search-v1-anytime | 1200 | 0.5125 [0.4933, 0.5317] | +8.7 [-4.7, +22.1] | 27900 / 6712 (0.241) | 772.407 | 767.034 |
| 2026-10-17 | search-v2-evalleaf | search-v1-anytime | 4800 | 0.5031 [0.4933, 0.5130] | +2.2 [-4.7, +9.0] | 110800 / 25789 (0.233) | 907.116 | 909.544 |

## SPRTs (elo0/elo1, alpha = beta = 0.05)

| date | A | B | elo0/elo1 | result | games | score |
|---|---|---|---|---|---|---|
| 2026-10-04 | search-v1-fixed3-aturns1 | search-v1-fixed3 | 0/20 | H0 | 488 | 0.502 |
| 2026-10-04 | search-v1-fixed3-oracle | search-v1-fixed3 | 20/40 | H0 | 40 | 0.475 |
| 2026-10-04 | search-v1-fixed3-lcb | search-v1-fixed3 | 0/20 | H0 | 856 | 0.507 |
| 2026-10-06 | forge-reckless | forge-default | 0/20 | H0 | 808 | 0.501 |
| 2026-10-06 | search-v1-reckless | search-v1 | 0/20 | H0 | 392 | 0.487 |

No ladder line is later than 2026-10-17. Rollouts a decision, from the evaluator-leaf side's counters (every unfinished rollout is one evaluator leaf): J131 452,130 / 27,900 = 16.2; J139 1,600,784 / 110,800 = 14.4. At up to six candidates that is 2-3 rollouts a candidate, about 63 ms each (907 ms / 14.4).
