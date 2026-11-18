# J223: search-v3-wide-t1-x2 against search-v3-wide (the live seat since D550 merged, search-v5) on the confirm deck set, 4,800 games (D398; D551; D519's four readings)

**Outcome under the pre-registered rule (D551 points 4 to 7):**

- search-v3-wide-t1-x2: SHOWN on the confirm set (a measured gain): 16.8 Elo [10.4, 23.2], score 0.5242 [0.515, 0.5333], against search-v3-wide; the recommendation is RECOMMEND: J223 reads SHOWN on the confirm set: the PC session recommends to the owner that the live seat become search-v3-wide-t1-x2 at a 3 s clock; the clock and the adoption are the owner's, under a later decision; stackwin 7098 windows (1.479 a game, floor 0.25), 2.14 candidates a window, 1185 changes, 0 retries a game; passwin 2264 windows (0.472 a game, floor 0.1), 2.16 candidates a window, 225 changes, 0 retries a game; dactiv 8746 windows (1.822 a game, floor 0.25), 1.05 candidates a window, 669 changes, 0.003 retries a game; the union 2079 changes over 4800 games (0.433 a game; 0.25 is the rate); stack windows refused 538 (a share of 0.07); B's windows a game: stack 1.495, pass 0.471, declined activations 1.742; B's union 1502 changes (0.313 a game); 16.12 against 16 rollouts a decision, 0.0459 against 0.0296 of decisions short of two rounds, 117.9 against 46.3 ms of play a rollout (x2.546; 1.3 is the trace's bar); 56.787 against 23.099 search seconds a game (x2.4584), 2076.942 against 847.319 ms a searched decision (a cost: more than 5% over B, D519 point 5); a seat change is the owner's, under a separate decision; the live seat is unchanged

**The recommendation:** RECOMMEND (J223 reads SHOWN on the confirm set: the PC session recommends to the owner that the live seat become search-v3-wide-t1-x2 at a 3 s clock; the clock and the adoption are the owner's, under a later decision). RECOMMEND 1, STAYS 0, OPEN 0. **NOT READ:** 0. **NOT PLAYED:** 0. **INCOMPLETE:** 0 (owed a new decision, not a repost, when only the trace failed: 0). **The live seat:** unchanged by this job (liveSeatChanged 0); a seat change is the owner's, under a separate decision.

| match | set | played / planned | complete | outcome | described | score [95%] | Elo [95%] | pairs | draws, errors, timeouts | hours |
|---|---|---|---|---|---|---|---|---|---|---|
| J223 search-v3-wide-t1-x2 vs search-v3-wide | tools/ai-bench/pairs-confirm.txt | 4800 / 4800 | true | SHOWN | a measured gain | 0.5242 [0.515, 0.5333] | 16.8 [10.4, 23.2] | 2400 | 0, 0, 0 | 17.81 |

Timeouts in J223's rows 0; with every timed-out game counted as A's loss (description only, D551 point 9): score 0.5241666666666667 [0.5149941185263307, 0.5333392148070026], 16.805814879768345 Elo [10.422105629026326, 23.20088390574425] (unrounded).

**The earlier matches, each against search-v3-declined-instant (search-v4), as they were** (literals from pc-results/results/J222/, J217/ and J220/; never pooled with J223 and never read against it as a difference, D551 point 8; J221 search-v3-wide on the dev set +3.6 [-1.3, +8.6], pooled with J217 +5.3 [+1.6, +9.0]; J218 search-v3-declined-instant-t1-x3 on the dev set +15.9 [+9.4, +22.5] at x3.15, another code version):

| match | player | set | score [95%] | Elo [95%] | search s a game A / B | ms a decision A / B | rollouts a decision A / B | fewer than 2 rounds A / B | play ms a rollout A / B (x) | stack / pass / declined-activation windows a game | union changes a game |
|---|---|---|---|---|---|---|---|---|---|---|---|
| J222 | search-v3-wide-t1-x2 | dev | 0.5298 [0.5203, 0.5393] | 20.7 [14.1, 27.3] | 58.5 / 21.5 | 2099 / 864 | 16.09 / 16.37 | 3.99% / 2.58% | x2.585 | 1.731 / 0.466 / 1.885 | 0.478 |
| J217 | search-v3-wide | confirm | 0.51 [0.5021, 0.5179] | 6.9 [1.5, 12.4] | 23.5 / 21.6 | 907 / 913 | - | - | - | 1.293 / 0.415 / 1.705 | 0.279 |
| J220 | search-v3-declined-instant-t1-x2 | confirm | 0.5204 [0.5112, 0.5296] | 14.2 [7.8, 20.6] | 51.9 / 20.9 | 2084 / 848 | 16.54 / 16.48 | 4.29% / 2.67% | x2.562 | - | - |

**J223 itself, against search-v3-wide** (A's windows and union on the left; B's windows a game, stack / pass / declined activations, and union beside them):

| match | player | set | score [95%] | Elo [95%] | search s a game A / B | ms a decision A / B | rollouts a decision A / B | fewer than 2 rounds A / B | play ms a rollout A / B (x) | A: stack / pass / declined-activation windows a game | A: union changes a game | B: windows a game | B: union changes a game |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **J223** | search-v3-wide-t1-x2 | confirm | 0.5242 [0.515, 0.5333] | 16.8 [10.4, 23.2] | 56.787 / 23.099 | 2076.942 / 847.319 | 16.12 / 16 | 4.59% / 2.96% | 117.9 / 46.3 (x2.546) | 1.479 / 0.472 / 1.822 | 0.433 | 1.495 / 0.471 / 1.742 | 0.313 |

**The exposure, A's three keys (D551 point 5, D548 point 6; the union's changes decide NOT READ, a key under its floor is named unexposed, the rest is description; on every match it was read on, a cut-short one included):**

| key | games read | windows | a game | floor | at the floor | candidates | a window | changed | a game | retries | a game |
|---|---|---|---|---|---|---|---|---|---|---|---|
| stackwin | 4800 | 7098 | 1.479 | 0.25 | yes | 15200 | 2.14 | 1185 | 0.247 | 1 | 0 |
| passwin | 4800 | 2264 | 0.472 | 0.1 | yes | 4900 | 2.16 | 225 | 0.047 | 0 | 0 |
| dactiv | 4800 | 8746 | 1.822 | 0.25 | yes | 9181 | 1.05 | 669 | 0.139 | 16 | 0.003 |

The union: 2079 changed decisions, 0.433 a game (0.25 is the rate; read: yes; J222's A on the dev set 0.478, J217's A on the confirm set 0.279). B's (search-v3-wide's) own: stack 7175, pass 2261, declined-activation 8362 windows, 1502 changed decisions, retries 0, 0, 10, stack windows refused 651; B's windows open (the completeness part): 1. A's stack windows refused 538, a share of 0.07 of those met (J222 0.065, J217 0.088), by reason: unmappable 307, triggering 122, trigger 30, stale 28, faceDown 22, paid 10, modes 5, manaSpent 7, hidden 7. Aims at the seat's own stack item dropped 62; equips aimed at their host dropped 10737; declined activations listed 9744; memory sets put back 20429; windows the opponent had passed in: stack 6695, pass 919; declined spells in instant-speed windows 606; A's declined and instant windows a game 4.651 and 2.026 (A's search.p.declined.* counters include the stack and pass windows, so they are never compared with B's). B's D544 counters above 0: 29; B's D540 counters above 0: 10 (B's own keys, description). Lands counters above 0: A 0, B 0.

**The depth and the cost, A against B on the same games (description only; the seconds are this machine's, D388):**

| search s a game A / B (x) | no cost (D519 point 5) | ms a decision A / B | ms p, a A | ms p, a B | searched p, a, b A | searched p, a, b B | rollouts a decision A / B | complete rounds a decision A / B | fewer than 2 rounds A / B | ms of play a rollout A / B (x; 1.3 is the bar) | ms of copy a rollout A / B | rollouts the step cap cut A / B |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 56.787 / 23.099 (x2.4584) | 0 | 2076.942 / 847.319 | 2070.531, 2103.332 | 854.405, 818.116 | 105590, 25649, 0 | 105304, 25551, 0 | 16.12 / 16 | 6.22 / 6.29 | 4.59% / 2.96% | 117.9 / 46.3 (x2.546) | 3.9 / 3.9 | 0 / 0 |

| side | decisions searched (games) | changed Forge: p | a | b | all | budget fallbacks [95%] | other fallbacks | step timeouts | from pass, to other, to pass a p decision | land windows left to Forge a game |
|---|---|---|---|---|---|---|---|---|---|---|
| search-v3-wide-t1-x2 | 131239 (4800) | 21738/105590 (20.6%) | 4247/25649 (16.6%) | - | 25985/131239 (19.8%) | 1528 = 1.16% [0.95%, 1.38%] | unmappable 109 | 165 | 8.2%, 6.6%, 5.8% | 7.35 |
| search-v3-wide | 130855 (4800) | 19481/105304 (18.5%) | 4207/25551 (16.5%) | - | 23688/130855 (18.1%) | 735 = 0.56% [0.46%, 0.66%] | unmappable 92 | 40 | 7.5%, 6.0%, 4.9% | 7.32 |

Rule parts: names 1, hashes 1, the confirm set 1 (line set tools/ai-bench/pairs-confirm.txt, 0 rows on another set), seat configs 1, the registered blocks 1 (600 blocks 405900000 to 405900599, 4800 games, 0 of another match; 30 deck pairs, 160 to 160 games each), priority and attacks searched and no block on both sides 1, the exposure read on this match 1, the rebuilt pairs reproduce the line 1, B's windows open 1, both sides' lands counters clean 1, A's rollouts deeper 1 (x2.546), the union at the rate 1; complete 1. SHOWN 1, SMALL GAIN 0, INCONCLUSIVE AT 4,800 0, NOT SHOWN 0, NOT READ 0, NOT PLAYED 0, INCOMPLETE 0. Described: indistinguishable 0, a measured loss 0, a measured gain 1. Match id j223:20261117T115006-1527032, host j223, set tools/ai-bench/pairs-confirm.txt.

## The pilot (D551 point 10): the gate, the recorded windows and horizons, the longest game

The gate: played (A's wide windows open 1, A's rollouts deeper 1). B's windows in the 4 ladder games, reported and not gated: stack 21, pass 0, declined activations 12.

| games (ladder + recorded) | errors and timeouts | stackwin windows (ladder + recorded) | passwin windows | dactiv windows | refused (share) | retries, three keys (a game) | retries, declined and instant (a game) | short of two rounds (A) | recorded horizon 1: p, a; other | play ms a rollout A / B (x) | recorded searched p: own main / stack / instant or pass / land | own item on top | ladder search s a game A / B | longest game, ladder / recorded (s) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4 + 4 | 0 | 2 + 6 | 0 + 1 | 17 + 4 | 1 (0.111) | 0 (0) | 0 (0) | 13 of 212 (6.13%) | 65, 15; 0 | 106.5 / 36.4 (x2.926) | 52 / 6 / 7 / 0 | 0 | 67.006 / 25.249 | 119.8 / 43.6 |
