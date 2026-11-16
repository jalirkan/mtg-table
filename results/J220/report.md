# J220: search-v3-declined-instant-t1-x2 against search-v3-declined-instant on the confirm deck set, 4,800 games (D398; D547; D519's four readings)

**Outcome under the pre-registered rule (D547 points 3, 4 and 6):**

- search-v3-declined-instant-t1-x2: SMALL GAIN on the confirm set (a measured gain): 14.2 Elo [7.8, 20.6], score 0.5204 [0.5112, 0.5296], against search-v3-declined-instant; a live-seat candidate for the owner under a separate decision, its cost beside it and beside search-v3-declined-instant-t1-x3's; 51.866 against 20.925 search seconds a game (x2.4787), 2084.181 against 848.492 ms a searched decision (a cost: more than 5% over B, D519 point 5); 16.54 against 16.48 rollouts a decision, 0.0429 against 0.0267 of decisions short of two rounds, 115.3 against 45 ms of play a rollout (x2.562; 1.3 is the trace's bar); the live seat is unchanged

**What it earns:** a live-seat candidate for the owner 1; not shown at 3 s on the confirm set, the next depth lane a cheaper deep rollout 0. **NOT PLAYED:** 0. **INCOMPLETE:** 0 (owed a new decision, not a repost, when only the trace failed: 0). **Cost, deciding nothing (D519 point 5):** no cost (A within 5% of B's ms a decision) 0. **The live seat:** unchanged by this job (liveSeatChanged 0); adoption is the owner's.

| match | set | played / planned | complete | outcome | described | score [95%] | Elo [95%] | pairs | draws, errors, timeouts | hours |
|---|---|---|---|---|---|---|---|---|---|---|
| J220 search-v3-declined-instant-t1-x2 vs search-v3-declined-instant | tools/ai-bench/pairs-confirm.txt | 4800 / 4800 | true | SMALL GAIN | a measured gain | 0.5204 [0.5112, 0.5296] | 14.2 [7.8, 20.6] | 2400 | 0, 0, 0 | 14.48 |

J218's player and J212's three depth arms, as they were (literals from pc-results/results/J218/ and J212/; J218 4,800 games on the dev set against search-v3-declined-instant at mtg-table 23854dd, J212 1,200 games each on the confirm set against search-v1-anytime; never pooled, never read against this match):

| arm | Elo [95%] | reading | search s a game A / B | rollouts a decision A / B | fewer than 2 rounds A / B | ms of play a rollout A / B |
|---|---|---|---|---|---|---|
| J218 search-v3-declined-instant-t1-x3 (9aeacaff9142) | 15.9 [9.4, 22.5] | SHOWN | 70.4 / 22.3 | 18.47 / 15.81 | 2.43% / 3.08% | 140.4 / 49.4 |
| search-v2-t1 (63c35e9f7d5b) | -1.7 [-14.6, 11.2] | NOT SHOWN | 27.8 / 20.6 | 11.47 / 15.79 | 11.8% / 2.8% | 92.1 / 49.7 |
| search-v2-a1 (3cf65e94df28) | 5.2 [-5.7, 16.2] | INCONCLUSIVE AT 1,200 | 24.3 / 21.5 | 14.39 / 15.53 | 7.7% / 3.4% | 61.3 / 51.2 |
| search-v2-t1-x3 (ce99b41f9898) | 9.8 [-1.7, 21.4] | INCONCLUSIVE AT 1,200 | 53.9 / 19.8 | 19.08 / 16.43 | 1.6% / 2.4% | 114.9 / 46.1 |

**The depth and the cost, A against B on the same games (description only; the seconds are this machine's, D388):**

| search s a game A / B (x) | ms a decision A / B | ms p, a A | ms p, a B | searched p, a, b A | searched p, a, b B | rollouts a decision A / B | complete rounds a decision A / B | fewer than 2 rounds A / B | ms of play a rollout A / B (x; 1.3 is the bar) | ms of copy a rollout A / B | rollouts the step cap cut A / B |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 51.866 / 20.925 (x2.4787) | 2084.181 / 848.492 | 2082.669, 2089.759 | 858.508, 812.009 | 93979, 25472, 0 | 92877, 25496, 0 | 16.54 / 16.48 | 6.36 / 6.45 | 4.29% / 2.67% | 115.3 / 45 (x2.562) | 3.9 / 3.9 | 0 / 0 |

| side | decisions searched (games) | changed Forge: p | a | b | all | budget fallbacks [95%] | other fallbacks | step timeouts | from pass, to other, to pass a p decision | land windows left to Forge a game |
|---|---|---|---|---|---|---|---|---|---|---|
| search-v3-declined-instant-t1-x2 | 119451 (4798) | 19668/93979 (20.9%) | 4256/25472 (16.7%) | - | 23924/119451 (20.0%) | 1506 = 1.26% [1.02%, 1.50%] | unmappable 98 | 188 | 8.0%, 6.8%, 6.1% | 7.28 |
| search-v3-declined-instant | 118373 (4799) | 17944/92877 (19.3%) | 4325/25496 (17.0%) | - | 22269/118373 (18.8%) | 691 = 0.58% [0.47%, 0.70%] | unmappable 93 | 51 | 7.6%, 6.4%, 5.3% | 7.26 |

**The pair's two keys, on both sides (description only: both seats carry them):**

| side | key | windows a game | candidates a window | changed a game | retries a game |
|---|---|---|---|---|---|
| A | declined | 3.549 | 1.17 | 0.359 | 0.001 |
| A | instant | 2.067 | 2.23 | 0.35 | 0 |
| B | declined | 3.374 | 1.16 | 0.378 | 0 |
| B | instant | 1.909 | 2.24 | 0.27 | 0 |

Rule parts: names 1, hashes 1, the dev set 1 (line set tools/ai-bench/pairs-confirm.txt, 0 rows on another set), seat configs 1, the registered blocks 1 (600 blocks 302900000 to 302900599, 4800 games, 0 of another match; 30 deck pairs, 160 to 160 games each), priority and attacks searched and no block on both sides 1, the exposure read on this match 1, both sides' lands counters clean 1 (A 0, B 0 above 0), A's rollouts deeper 1 (x2.562); complete 1. SHOWN 0, SMALL GAIN 1, INCONCLUSIVE AT 4,800 0, NOT SHOWN 0, NOT PLAYED 0, INCOMPLETE 0. Described: indistinguishable 0, a measured loss 0, a measured gain 1. Match id j220:20261115T161526-986305, host j220, set tools/ai-bench/pairs-confirm.txt.

## The pilot (D547 point 10): the gate, the recorded horizons and the longest game

The gate: played.

| games (ladder + recorded) | errors and timeouts | short of two rounds (A) | recorded horizon 1: p, a; other | play ms a rollout A / B (x) | retries, both keys (a game) | ladder search s a game A / B | ladder ms a decision A / B | recorded searched p: own main / land / instant-speed | on a stack | longest game, ladder / recorded (s) |
|---|---|---|---|---|---|---|---|---|---|---|
| 4 + 4 | 0 | 2 of 237 (0.84%) | 120, 21; 0 | 79.2 / 33.3 (x2.378) | 0 (0) | 36.799 / 13.567 | 1533.285 / 646.061 | 105 / 0 / 15 | 0 | 62.5 / 136.4 |
