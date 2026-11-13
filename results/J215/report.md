# J215: search-v3-declined-instant against search-v2-no-b (search-v3, the live seat), 4,800 games (D398; D541; D519's four readings)

**Outcome under the pre-registered rule (D541 points 3 to 6):**

- search-v3-declined-instant: SMALL GAIN (a measured gain): 6.9 Elo [1.4, 12.5], score 0.51 [0.502, 0.518], against search-v2-no-b; declined 16596 windows over 4800 games (3.458 a game), 1.17 candidates a window, 1835 changes, 0 retries a game, aimed spells listed 19968 and dropped 22897; instant 8638 windows (1.8 a game), 2.24 candidates a window, 1124 changes, 0 retries a game; 0.25 a game is each key's rate; 21.893 against 19.168 search seconds a game (x1.1422), 908.745 against 904.818 ms a searched decision; a live-seat candidate for the owner, under a separate decision and a seat-queue row (D509); the live seat is unchanged

**Live-seat candidate for the owner (SHOWN or SMALL GAIN):** 1. **The candidate-list track closed (NOT SHOWN):** 0. **NOT READ:** 0. **NOT PLAYED:** 0. **INCOMPLETE (owed a repost):** 0. **The live seat:** unchanged by this job (liveSeatChanged 0).

| match | played / planned | complete | outcome | described | score [95%] | Elo [95%] | pairs | draws, errors, timeouts | hours |
|---|---|---|---|---|---|---|---|---|---|
| search-v3-declined-instant vs search-v2-no-b | 4800 / 4800 | true | SMALL GAIN | a measured gain | 0.51 [0.502, 0.518] | 6.9 [1.4, 12.5] | 2400 | 0, 0, 0 | 8.45 |

Beside it, never pooled and never read against it (D541 point 8): J214's two one-key arms, 1,200 games each against search-v2-no-b on blocks 416,900,000-416,900,149: `search-v3-declined` +5.8 Elo [-4.6, +16.2] and `search-v3-instant` +10.4 [-0.7, +21.5], both INCONCLUSIVE AT 1,200.

**The exposure, both keys (D541 points 4 and 9; the rate decides NOT READ, the rest is description; on every match it was read on, a cut-short one included):**

| key | games read | windows | a game (0.25 is the rate) | at the rate | candidates | a window | changed | a game | retries | a game |
|---|---|---|---|---|---|---|---|---|---|---|
| declined | 4800 | 16596 | 3.458 | yes | 19485 | 1.17 | 1835 | 0.382 | 2 | 0 |
| instant | 4800 | 8638 | 1.8 | yes | 19359 | 2.24 | 1124 | 0.234 | 0 | 0 |

Declined spells aimed and listed 19968 (4.16 a game), dropped with no legal target 22897 (4.77 a game). B's D540 counters above 0: 0. A's lands counters above 0: 0.

**The cost, A against B on the same games (description only; the seconds are this machine's, D388):**

| search s a game A / B (x) | ms a decision A / B | ms p, a A | ms p, a B | searched p, a, b A | searched p, a, b B | from pass, to other, to pass a p decision A | same, B | land windows left to Forge a game A / B | rollouts a decision A / B | fewer than 2 rounds A / B |
|---|---|---|---|---|---|---|---|---|---|---|
| 21.893 / 19.168 (x1.1422) | 908.745 / 904.818 | 922.009, 860.487 | 915.314, 871.542 | 90709, 24932, 0 | 77303, 24381, 0 | 7.8%, 6.4%, 5.2% | 7.9%, 6.4%, 5.0% | 7.22 / 7.19 | 15.52 / 15.41 | 3.46% / 3.54% |

| side | decisions searched (games) | changed Forge: p | a | b | all | budget fallbacks [95%] | other fallbacks | step timeouts |
|---|---|---|---|---|---|---|---|---|
| search-v3-declined-instant | 115641 (4800) | 17504/90709 (19.3%) | 3608/24932 (14.5%) | - | 21112/115641 (18.3%) | 669 = 0.6% [0.5%, 0.7%] | unmappable 99 | 36 |
| search-v2-no-b | 101684 (4799) | 14860/77303 (19.2%) | 3658/24381 (15.0%) | - | 18518/101684 (18.2%) | 645 = 0.6% [0.5%, 0.7%] | unmappable 115 | 26 |

Rule parts: names 1, hashes 1, seat configs 1, the registered blocks 1 (600 blocks 519900000 to 519900599, 4800 games, 0 of another match), priority and attacks searched and no block on both sides 1, the exposure read on this match 1, B clean 1, A's lands counters clean 1, both keys at the rate 1; complete 1. SHOWN 0, SMALL GAIN 1, INCONCLUSIVE AT 4,800 0, NOT SHOWN 0, NOT READ 0, NOT PLAYED 0, INCOMPLETE 0. Described: indistinguishable 0, a measured loss 0, a measured gain 1. Match id j215:20261112T174151-2935017, host j215, set tools/ai-bench/pairs-confirm.txt.

## The pilot (D541 point 10): the gate and the recorded windows

The gate: played.

| games (ladder + recorded) | declined windows (ladder + recorded) | instant windows (ladder + recorded) | errors and timeouts | retries, both keys (a game) | recorded searched p: own main / land / instant-speed | on a stack | ms by candidate count (decisions) | ladder search s a game A / B |
|---|---|---|---|---|---|---|---|---|
| 4 + 4 | 27 + 17 | 13 + 8 | 0 | 0 (0) | 50 / 0 / 8 | 0 | 2: 588.1 (28); 3: 929.3 (12); 4: 934.8 (9); 5: 1479.4 (5); 6+: 1420.3 (4) | 28.346 / 22.504 |
