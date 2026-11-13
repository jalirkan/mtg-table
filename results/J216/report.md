# J216: search-v3-declined-instant against search-v2-no-b (search-v3, the live seat) on the dev deck set, 4,800 games (D398; D543; D519's four readings), and the pooled line with J215

**Outcome under the pre-registered rule (D543 points 4 to 6):**

- search-v3-declined-instant: SMALL GAIN on the dev set (a measured gain): 8.3 Elo [2.4, 14.1], score 0.5119 [0.5034, 0.5203], against search-v2-no-b; pooled with J215 (4800 pairs): score 0.5109 [0.5051, 0.5168], 7.6 Elo [3.5, 11.7]; the recommendation to adopt search-v3-declined-instant is STANDS: J216 reads SMALL GAIN on the dev set by itself; declined 16822 windows over 4800 games (3.505 a game), 1.15 candidates a window, 2029 changes, 0 retries a game, aimed spells listed 20012 and dropped 25553; instant 9076 windows (1.891 a game), 2.26 candidates a window, 1229 changes, 0 retries a game; 0.25 a game is each key's rate; 22.21 against 18.935 search seconds a game (x1.173), 925.172 against 904.042 ms a searched decision; the owner decides adoption under a separate decision; the live seat is unchanged

**The recommendation to adopt search-v3-declined-instant:** STANDS (J216 reads SMALL GAIN on the dev set by itself). STANDS 1 (by J216 alone 1, by the pooled line 0), WITHDRAWN 0, OPEN 0. **NOT READ:** 0. **NOT PLAYED:** 0. **INCOMPLETE (owed a repost):** 0. **The live seat:** unchanged by this job (liveSeatChanged 0); adoption is the owner's.

| match | set | played / planned | complete | outcome | described | score [95%] | Elo [95%] | pairs | draws, errors, timeouts | hours |
|---|---|---|---|---|---|---|---|---|---|---|
| J216 search-v3-declined-instant vs search-v2-no-b | tools/ai-bench/pairs-dev.txt | 4800 / 4800 | true | SMALL GAIN | a measured gain | 0.5119 [0.5034, 0.5203] | 8.3 [2.4, 14.1] | 2400 | 1, 1, 0 | 8.5 |
| J215 (literals, pc-results/results/J215/match-J215.json) | tools/ai-bench/pairs-confirm.txt | 4800 / 4800 | true | SMALL GAIN | a measured gain | 0.51 [0.502, 0.518] | 6.9 [1.4, 12.5] | 2400 | 0, 0, 0 | 8.45 |
| **pooled, J215 + J216** (D543 point 5) | both | - | read | lower end above 0.5 | - | 0.5109 [0.5051, 0.5168] (se 0.0029775) | 7.6 [3.5, 11.7] | 4800 | - | - |

**The exposure, both keys (D541 points 4 and 9; the rate decides NOT READ, the rest is description; on every match it was read on, a cut-short one included):**

| key | games read | windows | a game (0.25 is the rate) | at the rate | candidates | a window | changed | a game | retries | a game |
|---|---|---|---|---|---|---|---|---|---|---|
| declined | 4800 | 16822 | 3.505 | yes | 19348 | 1.15 | 2029 | 0.423 | 0 | 0 |
| instant | 4800 | 9076 | 1.891 | yes | 20492 | 2.26 | 1229 | 0.256 | 0 | 0 |

Declined spells aimed and listed 20012 (4.169 a game), dropped with no legal target 25553 (5.324 a game). B's D540 counters above 0: 0. A's lands counters above 0: 0. J215 on the confirm set, for comparison only: declined 3.458 and instant 1.8 windows a game.

**The cost, A against B on the same games (description only; the seconds are this machine's, D388):**

| search s a game A / B (x) | ms a decision A / B | ms p, a A | ms p, a B | searched p, a, b A | searched p, a, b B | from pass, to other, to pass a p decision A | same, B | land windows left to Forge a game A / B | rollouts a decision A / B | fewer than 2 rounds A / B |
|---|---|---|---|---|---|---|---|---|---|---|
| 22.21 / 18.935 (x1.173) | 925.172 / 904.042 | 947.226, 843.844 | 921.033, 850.084 | 90649, 24582, 0 | 76458, 24076, 0 | 7.8%, 6.6%, 5.1% | 7.8%, 6.4%, 5.1% | 7.31 / 7.29 | 15.53 / 15.41 | 3.15% / 3.04% |

| side | decisions searched (games) | changed Forge: p | a | b | all | budget fallbacks [95%] | other fallbacks | step timeouts |
|---|---|---|---|---|---|---|---|---|
| search-v3-declined-instant | 115231 (4798) | 17624/90649 (19.4%) | 3467/24582 (14.1%) | - | 21091/115231 (18.3%) | 726 = 0.6% [0.5%, 0.8%] | unmappable 96 | 71 |
| search-v2-no-b | 100534 (4798) | 14755/76458 (19.3%) | 3509/24076 (14.6%) | - | 18264/100534 (18.2%) | 556 = 0.6% [0.4%, 0.7%] | unmappable 103 | 59 |

Rule parts: names 1, hashes 1, the dev set 1 (line set tools/ai-bench/pairs-dev.txt, 0 rows on another set), seat configs 1, the registered blocks 1 (600 blocks 622900000 to 622900599, 4800 games, 0 of another match; 30 deck pairs, 160 to 160 games each), priority and attacks searched and no block on both sides 1, the exposure read on this match 1, the rebuilt pairs reproduce the line 1, B clean 1, A's lands counters clean 1, both keys at the rate 1; complete 1. SHOWN 0, SMALL GAIN 1, INCONCLUSIVE AT 4,800 0, NOT SHOWN 0, NOT READ 0, NOT PLAYED 0, INCOMPLETE 0. Described: indistinguishable 0, a measured loss 0, a measured gain 1. Match id j216:20261113T035650-3946462, host j216, set tools/ai-bench/pairs-dev.txt.

## The pilot (D543 point 9): the gate and the recorded windows

The gate: played.

| games (ladder + recorded) | declined windows (ladder + recorded) | instant windows (ladder + recorded) | errors and timeouts | retries, both keys (a game) | recorded searched p: own main / land / instant-speed | on a stack | ms by candidate count (decisions) | ladder search s a game A / B |
|---|---|---|---|---|---|---|---|---|
| 4 + 4 | 2 + 19 | 6 + 4 | 0 | 0 (0) | 61 / 0 / 4 | 0 | 2: 695.8 (34); 3: 1042.5 (20); 4: 914.8 (8); 5: 1474 (2); 6+: 1515 (1) | 22.169 / 21.943 |
