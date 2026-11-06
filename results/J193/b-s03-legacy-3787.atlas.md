# Move atlas: legacy-3687-00001 vs legacy-3687-00002, seed 3787

D451. Seat A is legacy-3687-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 15 turns, won by B, and listed 13 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 8 | p | 4 | 2 `cast:1`, 9.3 [0.0, 18.7] (n 150) | -, - (n 0) | - | - |
| d1 | 8 | p | 3 | 0 `pass`, 0.0 [0.0, 7.3] (n 150) | -, - (n 0) | - | - |
| d2 | 8 | p | 3 | 0 `cast:1`, 0.0 [0.0, 4.0] (n 50) | -, - (n 0) | - | - |
| d4 | 10 | p | 5 | 2 `cast:24`, 26.0 [16.7, 36.0] (n 150) | -, - (n 0) | - | - |
| d5 | 12 | p | 5 | 2 `cast:24`, 41.3 [31.3, 50.7] (n 150) | -, - (n 0) | - | - |
| d6 | 12 | p | 4 | 1 `cast:24`, 33.3 [24.7, 42.7] (n 150) | -, - (n 0) | - | - |
| d7 | 12 | p | 4 | 2 `cast:24`, 20.0 [10.7, 28.7] (n 150) | -, - (n 0) | - | - |
| d9 | 13 | b | 3 | 0 `block:none`, 0.0 [0.0, 16.0] (n 50) | -, - (n 0) | - | - |
| d10 | 14 | p | 3 | 0 `activate:5`, 0.0 [0.0, 8.0] (n 50) | -, - (n 0) | - | - |
| d11 | 14 | p | 6 | 5 `cast:1`, 34.7 [26.0, 43.3] (n 150) | -, - (n 0) | - | - |

### The cut design (D480)

10 decision(s) branched, 7 of them in full (3 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 0: none. Early stopping at 50/100 random branches stopped 13 option(s): d0 o3 at 100, d1 o2 at 50, d4 o1 at 50, d4 o3 at 50, d4 o4 at 50, d5 o1 at 50, d5 o3 at 50, d5 o4 at 50, d6 o2 at 50, d6 o3 at 50, d7 o1 at 50, d7 o3 at 50, d11 o1 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 3. It stopped 3 (d2, d9, d10), each a partial label at that n, never confident, saving at most 900 branch games; 0 it would have stopped played on to the full n as controls (none; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:10` | Bloodstained Mire: {T}, Pay 1 life, Sacrifice CARDNAME: Sear | 20.7 [15.0, 27.8] (n 150) | - (n 0) |
| 1 | `pass` | pass | 23.3 [17.3, 30.7] (n 150) | - (n 0) |
| 2 | `cast:1` | Uro, Titan of Nature's Wrath | 30.0 [23.2, 37.8] (n 150) | - (n 0) |
| 3 | `cast:18` | Iron Man Armor | 14.5 [8.9, 22.7] (n 100, stopped at 100) | - (n 0) |

**d1** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 29.3 [22.6, 37.1] (n 150) | - (n 0) |
| 1 | `cast:1` | Uro, Titan of Nature's Wrath | 28.0 [21.4, 35.7] (n 150) | - (n 0) |
| 2 | `cast:18` | Iron Man Armor | 8.0 [3.1, 18.8] (n 50, stopped at 50) | - (n 0) |

**d2** (turn 8, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Uro, Titan of Nature's Wrath | 28.0 [17.5, 41.7] (n 50) | - (n 0) |
| 1 | `pass` | pass | 18.0 [9.8, 30.8] (n 50) | - (n 0) |
| 2 | `cast:18` | Iron Man Armor | 12.0 [5.6, 23.8] (n 50) | - (n 0) |

**d4** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:32` | Master of the Hunt | 17.3 [12.1, 24.2] (n 150) | - (n 0) |
| 1 | `pass` | pass | 6.0 [2.1, 16.2] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:24` | Ouroboroid | 43.3 [35.7, 51.3] (n 150) | - (n 0) |
| 3 | `cast:18` | Iron Man Armor | 8.0 [3.1, 18.8] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:37` | Deathrite Shaman | 10.0 [4.3, 21.4] (n 50, stopped at 50) | - (n 0) |

**d5** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:31` | Scalding Tarn: {T}, Pay 1 life, Sacrifice CARDNAME: Search y | 19.3 [13.8, 26.4] (n 150) | - (n 0) |
| 1 | `pass` | pass | 24.0 [14.3, 37.4] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:24` | Ouroboroid | 60.7 [52.7, 68.1] (n 150) | - (n 0) |
| 3 | `cast:18` | Iron Man Armor | 4.0 [1.1, 13.5] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:37` | Deathrite Shaman | 8.0 [3.1, 18.8] (n 50, stopped at 50) | - (n 0) |

**d6** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 14.0 [9.3, 20.5] (n 150) | - (n 0) |
| 1 | `cast:24` | Ouroboroid | 47.3 [39.5, 55.3] (n 150) | - (n 0) |
| 2 | `cast:18` | Iron Man Armor | 4.0 [1.1, 13.5] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:37` | Deathrite Shaman | 6.0 [2.1, 16.2] (n 50, stopped at 50) | - (n 0) |

**d7** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:37` | Deathrite Shaman | 16.7 [11.6, 23.4] (n 150) | - (n 0) |
| 1 | `pass` | pass | 8.0 [3.1, 18.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:24` | Ouroboroid | 36.7 [29.4, 44.6] (n 150) | - (n 0) |
| 3 | `cast:18` | Iron Man Armor | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |

**d9** (turn 13, b; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 66.0 [52.1, 77.6] (n 50) | - (n 0) |
| 1 | `block:37>55` | block Deathrite Shaman>Orgg | 62.0 [48.1, 74.1] (n 50) | - (n 0) |
| 2 | `block:24>55` | block Ouroboroid>Orgg | 8.0 [3.1, 18.8] (n 50) | - (n 0) |

**d10** (turn 14, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:5` | Marsh Flats: {T}, Pay 1 life, Sacrifice CARDNAME: Search you | 88.0 [76.2, 94.4] (n 50) | - (n 0) |
| 1 | `pass` | pass | 82.0 [69.2, 90.2] (n 50) | - (n 0) |
| 2 | `cast:18` | Iron Man Armor | 58.0 [44.2, 70.6] (n 50) | - (n 0) |

**d11** (turn 14, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:18` | Iron Man Armor | 58.0 [50.0, 65.6] (n 150) | - (n 0) |
| 1 | `pass` | pass | 72.0 [58.3, 82.5] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:3` | Reveillark | 88.0 [81.8, 92.3] (n 150) | - (n 0) |
| 3 | `cast:3` | Reveillark | 89.3 [83.4, 93.3] (n 150) | - (n 0) |
| 4 | `cast:22` | Knight of Autumn | 85.3 [78.8, 90.1] (n 150) | - (n 0) |
| 5 | `cast:1` | Uro, Titan of Nature's Wrath | 92.7 [87.4, 95.9] (n 150) | - (n 0) |

3850 branch games (0 with an error, left out); 1 random and 0 Forge branches ended at the turn cap.

## Checks

80086 rows checked (ids against each seat's own frame log), 7702 frame logs through tools/check-redaction.mjs, 3850 forks checked (0 not the position), 10 no-leak checks (0 moved; the negative control moved in 10). The guardrails read back from 7700 random seats' logs: a land offered at 17881 of 173445 priority decisions and taken at 17881; 0 of 0 opening hands kept; G3 left out a repeated no-op 2219 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 0 pick(s) of the seats' own X plays had X drawn from 1 up, 0 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

1 of 3850 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

