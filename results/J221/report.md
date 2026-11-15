# J221: search-v3-wide against search-v3-declined-instant (the live seat's config, search-v4) on the dev deck set, 4,800 games (D398; D548; D519's four readings), and the pooled line with J217

**Outcome under the pre-registered rule (D548 points 5 to 9):**

- search-v3-wide: NOT SHOWN on the dev set (indistinguishable): 3.6 Elo [-1.3, 8.6], score 0.5052 [0.4981, 0.5123], against search-v3-declined-instant; pooled with J217 (4799 pairs): score 0.5076 [0.5023, 0.5129], 5.3 Elo [1.6, 9]; the recommendation to adopt search-v3-wide is STANDS: J221 reads NOT SHOWN by itself (indistinguishable); the pooled lower end with J217, 0.5023, is above 0.5 and J221 is not a measured loss; stackwin 7398 windows (1.541 a game, floor 0.25), 2.14 candidates a window, 859 changes, 0 retries a game; passwin 2007 windows (0.418 a game, floor 0.1), 2.2 candidates a window, 152 changes, 0 retries a game; dactiv 8489 windows (1.769 a game, floor 0.25), 1.05 candidates a window, 445 changes, 0.001 retries a game; the union 1456 changes over 4800 games (0.303 a game; 0.25 is the rate); stack windows refused 551 (a share of 0.069); 23.376 against 21.347 search seconds a game (x1.095), 896.723 against 895.257 ms a searched decision (no cost: within 5%, D519 point 5); a seat change is the owner's, under a separate decision; the live seat is unchanged

**The recommendation to adopt search-v3-wide:** STANDS (J221 reads NOT SHOWN by itself (indistinguishable); the pooled lower end with J217, 0.5023, is above 0.5 and J221 is not a measured loss). STANDS 1 (by J221 alone 0, by the pooled line 1), WITHDRAWN 0, OPEN 0. **NOT READ:** 0. **NOT PLAYED:** 0. **INCOMPLETE (owed a repost):** 0. **The live seat:** unchanged by this job (liveSeatChanged 0); a seat change is the owner's, under a separate decision.

| match | set | played / planned | complete | outcome | described | score [95%] | Elo [95%] | pairs | draws, errors, timeouts | hours |
|---|---|---|---|---|---|---|---|---|---|---|
| J221 search-v3-wide vs search-v3-declined-instant | tools/ai-bench/pairs-dev.txt | 4800 / 4800 | true | NOT SHOWN | indistinguishable | 0.5052 [0.4981, 0.5123] | 3.6 [-1.3, 8.6] | 2399 | 3, 3, 0 | 9.42 |
| J217 (literals, pc-results/results/J217/match-J217.json) | tools/ai-bench/pairs-confirm.txt | 4800 / 4800 | true | SMALL GAIN | a measured gain | 0.51 [0.5021, 0.5179] | 6.9 [1.5, 12.4] | 2400 | 0, 0, 1 | 9.28 |
| **pooled, J217 + J221** (D548 point 8) | both | - | read | lower end above 0.5 | - | 0.5076 [0.5023, 0.5129] (se 0.002709) | 5.3 [1.6, 9] | 4799 | - | - |

Timeouts in J221's rows 0; with every timed-out game counted as A's loss (description only, D548 point 12): score 0.5052105043768237 [0.49807785756266965, 0.5123431511909777], 3.6207603502704626 Elo [-1.3356479460054393, 8.578642852745558] (unrounded).

Beside it, never pooled and never read against it (D548 point 11): J215, J216, J218, J219 and J220.

**The exposure, the three keys (D548 point 6, D544 point 13; the union's changes decide NOT READ, a key under its floor is named unexposed, the rest is description; on every match it was read on, a cut-short one included):**

| key | games read | windows | a game | floor | at the floor | candidates | a window | changed | a game | retries | a game |
|---|---|---|---|---|---|---|---|---|---|---|---|
| stackwin | 4800 | 7398 | 1.541 | 0.25 | yes | 15798 | 2.14 | 859 | 0.179 | 0 | 0 |
| passwin | 4800 | 2007 | 0.418 | 0.1 | yes | 4414 | 2.2 | 152 | 0.032 | 0 | 0 |
| dactiv | 4800 | 8489 | 1.769 | 0.25 | yes | 8881 | 1.05 | 445 | 0.093 | 5 | 0.001 |

The union: 1456 changed decisions, 0.303 a game (0.25 is the rate; read: yes; J217 on the confirm set 0.279). Stack windows refused 551, a share of 0.069 of those met (J217 0.088), by reason: unmappable 279, paid 31, trigger 29, hidden 16, triggering 131, faceDown 5, stale 42, copied 4, manaSpent 9, modes 5. Aims at the seat's own stack item dropped 62; equips aimed at their host dropped 8938; declined activations listed 9360; memory sets put back 18472; windows the opponent had passed in: stack 6899, pass 779; declined spells in instant-speed windows 535 (A's search.p.declined.* counters include the stack and pass windows, so they are never compared with B's). Changes: stackwin's and passwin's count every change in their window, a switch to pass included; dactiv's only a pick of a widened activation. B's D544 counters above 0: 0; B's D540 counters above 0: 10 (B's own keys). A's lands counters above 0: 0.

**The cost, A against B on the same games (description only; the seconds are this machine's, D388):**

| search s a game A / B (x) | no cost (D519 point 5) | ms a decision A / B | ms p, a A | ms p, a B | searched p, a, b A | searched p, a, b B | from pass, to other, to pass a p decision A | same, B | land windows left to Forge a game A / B | rollouts a decision A / B | fewer than 2 rounds A / B |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 23.376 / 21.347 (x1.095) | 1 | 896.723 / 895.257 | 913.016, 828.42 | 912.532, 829.923 | 101030, 24100, 0 | 90518, 23935, 0 | 7.9%, 5.9%, 4.6% | 7.7%, 6.5%, 4.9% | 7.29 / 7.27 | 15.52 / 15.83 | 3.00% / 2.80% |

| side | decisions searched (games) | changed Forge: p | a | b | all | budget fallbacks [95%] | other fallbacks | step timeouts |
|---|---|---|---|---|---|---|---|---|
| search-v3-wide | 125130 (4798) | 18603/101030 (18.4%) | 3353/24100 (13.9%) | - | 21956/125130 (17.5%) | 787 = 0.6% [0.5%, 0.8%] | unmappable 94 | 64 |
| search-v3-declined-instant | 114453 (4798) | 17287/90518 (19.1%) | 3378/23935 (14.1%) | - | 20665/114453 (18.1%) | 607 = 0.5% [0.4%, 0.6%] | unmappable 100 | 50 |

Rule parts: names 1, hashes 1, the dev set 1 (line set tools/ai-bench/pairs-dev.txt, 0 rows on another set), seat configs 1, the registered blocks 1 (600 blocks 199900000 to 199900599, 4800 games, 0 of another match; 30 deck pairs, 160 to 160 games each), priority and attacks searched and no block on both sides 1, the exposure read on this match 1, the rebuilt pairs reproduce the line 1, B clean 1, A's lands counters clean 1, the union at the rate 1; complete 1. SHOWN 0, SMALL GAIN 0, INCONCLUSIVE AT 4,800 0, NOT SHOWN 1, NOT READ 0, NOT PLAYED 0, INCOMPLETE 0. Described: indistinguishable 1, a measured loss 0, a measured gain 0. Match id j221:20261115T063652-1264084, host j221, set tools/ai-bench/pairs-dev.txt.

## The pilot (D548 point 13): the gate and the recorded windows

The gate: played.

| games (ladder + recorded) | stackwin windows (ladder + recorded) | passwin windows | dactiv windows | refused (share) | errors and timeouts | retries, three keys (a game) | recorded searched p: own main / stack / instant or pass / land | own item on top | ms by candidate count (decisions) | ladder search s a game A / B |
|---|---|---|---|---|---|---|---|---|---|---|
| 4 + 4 | 20 + 3 | 19 + 1 | 14 + 4 | 1 (0.042) | 0 | 0 (0) | 62 / 3 / 7 / 0 | 0 | 2: 353.7 (47); 3: 644.4 (8); 4: 835.8 (13); 5: 980.5 (2); 6+: 1151.5 (2) | 18.825 / 14.212 |
