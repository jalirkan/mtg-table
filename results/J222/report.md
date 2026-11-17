# J222: search-v3-wide-t1-x2 against search-v3-declined-instant (the live seat's config, search-v4) on the dev deck set, 4,800 games (D398; D549; D519's four readings)

**Outcome under the pre-registered rule (D549 points 4 to 7):**

- search-v3-wide-t1-x2: SHOWN on the dev set (a measured gain): 20.7 Elo [14.1, 27.3], score 0.5298 [0.5203, 0.5393], against search-v3-declined-instant; the recommendation is CANDIDATE: J222 reads SHOWN on the dev set: search-v3-wide-t1-x2 is a live-seat candidate the PC session puts to the owner beside search-v3-declined-instant-t1-x2 and search-v3-wide; the match does not claim it beats either part, and which of the three is recommended is said from cost; stackwin 8308 windows (1.731 a game, floor 0.25), 2.15 candidates a window, 1345 changes, 0 retries a game; passwin 2237 windows (0.466 a game, floor 0.1), 2.2 candidates a window, 216 changes, 0 retries a game; dactiv 9050 windows (1.885 a game, floor 0.25), 1.06 candidates a window, 731 changes, 0.002 retries a game; the union 2292 changes over 4800 games (0.478 a game; 0.25 is the rate); stack windows refused 578 (a share of 0.065); 16.09 against 16.37 rollouts a decision, 0.0399 against 0.0258 of decisions short of two rounds, 119.7 against 46.3 ms of play a rollout (x2.585; 1.3 is the trace's bar); 58.53 against 21.5 search seconds a game (x2.7223), 2099.242 against 863.803 ms a searched decision (a cost: more than 5% over B, D519 point 5); a seat change is the owner's, under a separate decision; the live seat is unchanged

**The recommendation:** CANDIDATE (J222 reads SHOWN on the dev set: search-v3-wide-t1-x2 is a live-seat candidate the PC session puts to the owner beside search-v3-declined-instant-t1-x2 and search-v3-wide; the match does not claim it beats either part, and which of the three is recommended is said from cost). CANDIDATE 1, NOTHING 0, OPEN 0. **NOT READ:** 0. **NOT PLAYED:** 0. **INCOMPLETE:** 0 (owed a new decision, not a repost, when only the trace failed: 0). **The live seat:** unchanged by this job (liveSeatChanged 0); a seat change is the owner's, under a separate decision.

| match | set | played / planned | complete | outcome | described | score [95%] | Elo [95%] | pairs | draws, errors, timeouts | hours |
|---|---|---|---|---|---|---|---|---|---|---|
| J222 search-v3-wide-t1-x2 vs search-v3-declined-instant | tools/ai-bench/pairs-dev.txt | 4800 / 4800 | true | SHOWN | a measured gain | 0.5298 [0.5203, 0.5393] | 20.7 [14.1, 27.3] | 2400 | 2, 2, 0 | 18.31 |

Timeouts in J222's rows 0; with every timed-out game counted as A's loss (description only, D549 point 9): score 0.5297916666666667 [0.520314250498309, 0.5392690828350243], 20.72592043917875 Elo [14.123561593442439, 27.34326632431423] (unrounded).

**The two parts, each against search-v3-declined-instant, as they were** (literals from pc-results/results/J220/ and J221/; never pooled with J222 and never read against it as a difference, D549 point 8; J217 on the confirm set +6.9 [+1.5, +12.4], pooled with J221 +5.3 [+1.6, +9.0]; J218 search-v3-declined-instant-t1-x3 on the dev set +15.9 [+9.4, +22.5] at x3.15, another code version):

| match | player | set | score [95%] | Elo [95%] | search s a game A / B | ms a decision A / B | rollouts a decision A / B | fewer than 2 rounds A / B | play ms a rollout A / B (x) | stack / pass / declined-activation windows a game | union changes a game |
|---|---|---|---|---|---|---|---|---|---|---|---|
| J220 | search-v3-declined-instant-t1-x2 | confirm | 0.5204 [0.5112, 0.5296] | 14.2 [7.8, 20.6] | 51.9 / 20.9 | 2084 / 848 | 16.54 / 16.48 | 4.29% / 2.67% | x2.562 | - | - |
| J221 | search-v3-wide | dev | 0.5052 [0.4981, 0.5123] | 3.6 [-1.3, 8.6] | 23.4 / 21.3 | 897 / 895 | - | - | - | 1.54 / 0.42 / 1.77 | 0.3 |
| **J222** | search-v3-wide-t1-x2 | dev | 0.5298 [0.5203, 0.5393] | 20.7 [14.1, 27.3] | 58.53 / 21.5 | 2099.242 / 863.803 | 16.09 / 16.37 | 3.99% / 2.58% | 119.7 / 46.3 (x2.585) | 1.731 / 0.466 / 1.885 | 0.478 |

**The exposure, the three keys (D549 point 5, D548 point 6; the union's changes decide NOT READ, a key under its floor is named unexposed, the rest is description; on every match it was read on, a cut-short one included):**

| key | games read | windows | a game | floor | at the floor | candidates | a window | changed | a game | retries | a game |
|---|---|---|---|---|---|---|---|---|---|---|---|
| stackwin | 4800 | 8308 | 1.731 | 0.25 | yes | 17821 | 2.15 | 1345 | 0.28 | 2 | 0 |
| passwin | 4800 | 2237 | 0.466 | 0.1 | yes | 4914 | 2.2 | 216 | 0.045 | 0 | 0 |
| dactiv | 4800 | 9050 | 1.885 | 0.25 | yes | 9557 | 1.06 | 731 | 0.152 | 11 | 0.002 |

The union: 2292 changed decisions, 0.478 a game (0.25 is the rate; read: yes; J221 on the dev set 0.30, J217 on the confirm set 0.279). Stack windows refused 578, a share of 0.065 of those met (J221 0.069, J217 0.088), by reason: unmappable 283, triggering 122, trigger 58, hidden 15, copied 6, faceDown 5, modes 14, manaSpent 15, stale 45, paid 15. Aims at the seat's own stack item dropped 50; equips aimed at their host dropped 11058; declined activations listed 10155; memory sets put back 21349; windows the opponent had passed in: stack 7818, pass 904; declined spells in instant-speed windows 628; A's declined and instant windows a game 4.851 and 2.183 (A's search.p.declined.* counters include the stack and pass windows, so they are never compared with B's). B's D544 counters above 0: 0; B's D540 counters above 0: 10 (B's own keys). Lands counters above 0: A 0, B 0.

**The depth and the cost, A against B on the same games (description only; the seconds are this machine's, D388):**

| search s a game A / B (x) | no cost (D519 point 5) | ms a decision A / B | ms p, a A | ms p, a B | searched p, a, b A | searched p, a, b B | rollouts a decision A / B | complete rounds a decision A / B | fewer than 2 rounds A / B | ms of play a rollout A / B (x; 1.3 is the bar) | ms of copy a rollout A / B | rollouts the step cap cut A / B |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 58.53 / 21.5 (x2.7223) | 0 | 2099.242 / 863.803 | 2102.195, 2086.699 | 879.224, 806.415 | 108329, 25502, 0 | 94167, 25305, 0 | 16.09 / 16.37 | 6.22 / 6.4 | 3.99% / 2.58% | 119.7 / 46.3 (x2.585) | 4 / 3.9 | 0 / 0 |

| side | decisions searched (games) | changed Forge: p | a | b | all | budget fallbacks [95%] | other fallbacks | step timeouts | from pass, to other, to pass a p decision | land windows left to Forge a game |
|---|---|---|---|---|---|---|---|---|---|---|
| search-v3-wide-t1-x2 | 133831 (4799) | 22297/108329 (20.6%) | 4246/25502 (16.6%) | - | 26543/133831 (19.8%) | 1315 = 0.98% [0.73%, 1.24%] | unmappable 86 | 174 | 8.5%, 6.4%, 5.7% | 7.54 |
| search-v3-declined-instant | 119472 (4799) | 18663/94167 (19.8%) | 4226/25305 (16.7%) | - | 22889/119472 (19.2%) | 540 = 0.45% [0.36%, 0.54%] | unmappable 81 | 51 | 8.0%, 6.5%, 5.3% | 7.52 |

Rule parts: names 1, hashes 1, the dev set 1 (line set tools/ai-bench/pairs-dev.txt, 0 rows on another set), seat configs 1, the registered blocks 1 (600 blocks 508900000 to 508900599, 4800 games, 0 of another match; 30 deck pairs, 160 to 160 games each), priority and attacks searched and no block on both sides 1, the exposure read on this match 1, the rebuilt pairs reproduce the line 1, B clean 1, both sides' lands counters clean 1, A's rollouts deeper 1 (x2.585), the union at the rate 1; complete 1. SHOWN 1, SMALL GAIN 0, INCONCLUSIVE AT 4,800 0, NOT SHOWN 0, NOT READ 0, NOT PLAYED 0, INCOMPLETE 0. Described: indistinguishable 0, a measured loss 0, a measured gain 1. Match id j222:20261116T161910-2159570, host j222, set tools/ai-bench/pairs-dev.txt.

## The pilot (D549 point 10): the gate, the recorded windows and horizons, the longest game

The gate: played (the wide windows open 1, the rollouts deeper 1).

| games (ladder + recorded) | errors and timeouts | stackwin windows (ladder + recorded) | passwin windows | dactiv windows | refused (share) | retries, three keys (a game) | retries, declined and instant (a game) | short of two rounds (A) | recorded horizon 1: p, a; other | play ms a rollout A / B (x) | recorded searched p: own main / stack / instant or pass / land | own item on top | ladder search s a game A / B | longest game, ladder / recorded (s) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4 + 4 | 0 | 19 + 5 | 5 + 16 | 6 + 23 | 0 (0) | 0 (0) | 0 (0) | 0 of 316 (0.00%) | 145, 13; 0 | 71.9 / 28.8 (x2.497) | 113 / 5 / 27 / 0 | 0 | 57.072 / 18.883 | 98.3 / 82.9 |
