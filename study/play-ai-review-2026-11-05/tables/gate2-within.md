# Gate 2, read within the decision (J050 truth; J050 hand ranker, 3 rounds; J081 evaluator v2 ranker, 3 rounds)

Spread = the standard deviation of the options' scores inside one decision (win-rate units: truth = full-game win rate, hand = sigmoid(leaf/500), eval = P(win)). Noise = the ranker file's own `noise` field: the median half-width of the options' 95% regret intervals (`GradeMath.noise`, about 1.96 SE of a paired difference), so spread/noise 0.46 means the options sit about 0.9 SE apart. r and slope: options centred per decision, pooled; truth regressed on the ranker.

| stratum | decisions | truth spread | hand spread | eval spread | eval/hand spread | hand spread/noise | eval spread/noise | r(truth, hand) | r(truth, eval) | slope truth~hand | slope truth~eval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| all | 283 | 0.015 | 0.018 | 0.022 | 1.19 | 0.46 | 0.47 | 0.467 | 0.573 | 0.75 | 0.78 |
| attack | 100 | 0.026 | 0.019 | 0.028 | 1.58 | 0.48 | 0.66 | 0.434 | 0.596 | 0.72 | 0.83 |
| block | 92 | 0.012 | 0.019 | 0.012 | 0.68 | 0.44 | 0.27 | 0.572 | 0.545 | 1.04 | 0.74 |
| spell | 91 | 0.013 | 0.016 | 0.018 | 1.46 | 0.46 | 0.46 | 0.469 | 0.529 | 0.62 | 0.66 |
| turn 1-6 | 39 | 0.015 | 0.016 | 0.031 | 1.96 | 0.49 | 0.76 | 0.585 | 0.443 | 1.32 | 0.49 |
| turn 7-10 | 62 | 0.027 | 0.023 | 0.027 | 1.47 | 0.62 | 0.81 | 0.539 | 0.396 | 1.32 | 0.57 |
| turn 11-14 | 74 | 0.021 | 0.015 | 0.016 | 1.44 | 0.40 | 0.45 | 0.388 | 0.592 | 0.69 | 0.72 |
| turn 15+ | 108 | 0.007 | 0.018 | 0.012 | 0.62 | 0.44 | 0.33 | 0.479 | 0.614 | 0.71 | 0.86 |
| k=2 | 99 | 0.010 | 0.010 | 0.014 | 1.23 | 0.32 | 0.49 | 0.716 | 0.706 | 1.08 | 0.95 |
| k=3-4 | 94 | 0.021 | 0.020 | 0.026 | 1.59 | 0.45 | 0.59 | 0.455 | 0.515 | 0.87 | 0.78 |
| k=5+ | 90 | 0.022 | 0.025 | 0.022 | 0.73 | 0.52 | 0.45 | 0.431 | 0.575 | 0.66 | 0.75 |

Evaluator v1 (J051) on the same 283 decisions: median spread 0.021; v2 0.022; hand 0.018.
Truth reliability inside a decision (1 - mean se^2 / var): median 0.06; share of decisions above 0.5: 0.27.
Forge's own option: mean truth regret 0.0207 over 261 decisions (noisy-max biased up); truth's best is Forge's in 124 (48%).
