# Move atlas: pauper-2825-00001 vs pauper-2825-00002, seed 2925

D451. Seat A is pauper-2825-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 35 turns, won by B, and listed 51 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 2 | p | 4 | 3 `cast:1`, 9.7 [1.0, 18.0] (n 150) | -, - (n 0) | - | - |
| d5 | 4 | p | 4 | 3 `cast:1`, 2.7 [0.0, 12.3] (n 150) | -, - (n 0) | - | - |
| d9 | 8 | p | 5 | 3 `cast:12`, 2.7 [0.0, 12.3] (n 150) | -, - (n 0) | - | - |
| d12 | 10 | p | 4 | 0 `pass`, 0.0 [0.0, 11.0] (n 50) | -, - (n 0) | - | - |
| d19 | 12 | a | 8 | 7 `attack:1,12,19,22,39`, 1.0 [0.0, 9.0] (n 150) | -, - (n 0) | - | - |
| d26 | 17 | b | 5 | 0 `block:none`, 0.0 [0.0, 10.0] (n 50) | -, - (n 0) | - | - |
| d33 | 22 | a | 8 | 0 `attack:19,39`, 0.0 [0.0, 10.0] (n 25) | -, - (n 0) | - | - |
| d35 | 23 | b | 6 | 0 `block:13>42`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d36 | 24 | p | 3 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d37 | 24 | a | 6 | 2 `attack:1,10,19,39`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d38 | 24 | p | 3 | 0 `cast:18`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d40 | 25 | b | 8 | 5 `block:4>42,18>42,39>42`, 2.7 [0.0, 7.0] (n 150) | -, - (n 0) | - | - |
| d41 | 26 | a | 8 | 5 `attack:1,19,39`, 11.3 [5.7, 17.0] (n 150) | -, - (n 0) | - | - |
| d42 | 28 | a | 8 | 5 `attack:10,19,39`, 3.0 [0.0, 10.0] (n 150) | -, - (n 0) | - | - |
| d50 | 34 | a | 4 | 2 `attack:39`, 0.7 [0.0, 4.7] (n 150) | -, - (n 0) | - | - |

### The cut design (D480)

15 decision(s) branched, 8 of them in full (2 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 5: d33 (mean value 3.8%, replaced by d35), d37 (mean value 1.7%, replaced by d41), d35 (mean value 0.0%, replaced by d36), d36 (mean value 0.0%, replaced by d38), d38 (mean value 0.0%, replaced by d40). Early stopping at 50/100 random branches stopped 17 option(s): d0 o1 at 100, d0 o2 at 50, d19 o1 at 50, d19 o4 at 100, d42 o1 at 100, d40 o1 at 50, d40 o2 at 50, d40 o3 at 50, d40 o4 at 50, d40 o6 at 50, d40 o7 at 100, d41 o1 at 50, d41 o2 at 50, d41 o3 at 50, d41 o4 at 50, d41 o6 at 100, d41 o7 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 2. It stopped 2 (d12, d26), each a partial label at that n, never confident, saving at most 900 branch games; 0 it would have stopped played on to the full n as controls (none; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 2, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:11` | Lotus Petal | 33.3 [26.3, 41.2] (n 150) | - (n 0) |
| 1 | `pass` | pass | 29.0 [21.0, 38.5] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:39` | Icatian Scout | 28.0 [17.5, 41.7] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:1` | Lunarch Veteran | 43.0 [35.4, 51.0] (n 150) | - (n 0) |

**d5** (turn 4, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:12` | Repentant Blacksmith | 37.3 [30.0, 45.3] (n 150) | - (n 0) |
| 1 | `pass` | pass | 38.0 [30.6, 46.0] (n 150) | - (n 0) |
| 2 | `cast:39` | Icatian Scout | 33.0 [26.0, 40.9] (n 150) | - (n 0) |
| 3 | `cast:1` | Lunarch Veteran | 40.0 [32.5, 48.0] (n 150) | - (n 0) |

**d9** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 35.0 [27.8, 42.9] (n 150) | - (n 0) |
| 1 | `cast:39` | Icatian Scout | 35.3 [28.1, 43.3] (n 150) | - (n 0) |
| 2 | `cast:1` | Lunarch Veteran | 36.7 [29.4, 44.6] (n 150) | - (n 0) |
| 3 | `cast:12` | Repentant Blacksmith | 37.7 [30.3, 45.6] (n 150) | - (n 0) |
| 4 | `cast:13` | Novice Inspector | 37.3 [30.0, 45.3] (n 150) | - (n 0) |

**d12** (turn 10, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 36.0 [24.1, 49.9] (n 50) | - (n 0) |
| 1 | `cast:39` | Icatian Scout | 31.0 [19.9, 44.8] (n 50) | - (n 0) |
| 2 | `cast:1` | Lunarch Veteran | 30.0 [19.1, 43.8] (n 50) | - (n 0) |
| 3 | `cast:13` | Novice Inspector | 26.0 [15.9, 39.6] (n 50) | - (n 0) |

**d19** (turn 12, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:1,12,13,19,22,39` | attack Lunarch Veteran+Mesa Pegasus+Shepherd of the Flock+Icatian Scout+Repentant Blacksmith+Novice Inspector | 78.7 [71.4, 84.5] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 54.0 [40.4, 67.0] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:12,13,19,22,39` | attack Mesa Pegasus+Shepherd of the Flock+Icatian Scout+Repentant Blacksmith+Novice Inspector | 75.3 [67.9, 81.5] (n 150) | - (n 0) |
| 3 | `attack:1,12,13,22,39` | attack Lunarch Veteran+Shepherd of the Flock+Icatian Scout+Repentant Blacksmith+Novice Inspector | 75.7 [68.2, 81.8] (n 150) | - (n 0) |
| 4 | `attack:1,12,13,19,39` | attack Lunarch Veteran+Mesa Pegasus+Icatian Scout+Repentant Blacksmith+Novice Inspector | 63.0 [53.2, 71.8] (n 100, stopped at 100) | - (n 0) |
| 5 | `attack:1,12,13,19,22` | attack Lunarch Veteran+Mesa Pegasus+Shepherd of the Flock+Repentant Blacksmith+Novice Inspector | 75.0 [67.5, 81.3] (n 150) | - (n 0) |
| 6 | `attack:1,13,19,22,39` | attack Lunarch Veteran+Mesa Pegasus+Shepherd of the Flock+Icatian Scout+Novice Inspector | 75.0 [67.5, 81.3] (n 150) | - (n 0) |
| 7 | `attack:1,12,19,22,39` | attack Lunarch Veteran+Mesa Pegasus+Shepherd of the Flock+Icatian Scout+Repentant Blacksmith | 79.7 [72.5, 85.3] (n 150) | - (n 0) |

**d26** (turn 17, b; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 44.0 [31.2, 57.7] (n 50) | - (n 0) |
| 1 | `block:13>42` | block Novice Inspector>Tolarian Terror | 38.0 [25.9, 51.8] (n 50) | - (n 0) |
| 2 | `block:1>42` | block Lunarch Veteran>Tolarian Terror | 35.0 [23.3, 48.9] (n 50) | - (n 0) |
| 3 | `block:10>42` | block Savannah Lions>Tolarian Terror | 31.0 [19.9, 44.8] (n 50) | - (n 0) |
| 4 | `block:18>42` | block Farrel's Zealot>Tolarian Terror | 30.0 [19.1, 43.8] (n 50) | - (n 0) |

**d33** (turn 22, a; option 0 is Forge's answer) -- settled by the screen (mean value 3.8%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:19,39` | attack Mesa Pegasus+Icatian Scout | 8.0 [2.2, 25.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 2 | `attack:10,13,18,19,39` | attack Mesa Pegasus+Icatian Scout+Novice Inspector+Savannah Lions+Farrel's Zealot | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `attack:39` | attack Icatian Scout | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 4 | `attack:19` | attack Mesa Pegasus | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 5 | `attack:13,19,39` | attack Mesa Pegasus+Icatian Scout+Novice Inspector | 6.0 [1.4, 22.3] (n 25) | - (n 0) |
| 6 | `attack:10,19,39` | attack Mesa Pegasus+Icatian Scout+Savannah Lions | 2.0 [0.2, 16.6] (n 25) | - (n 0) |
| 7 | `attack:18,19,39` | attack Mesa Pegasus+Icatian Scout+Farrel's Zealot | 6.0 [1.4, 22.3] (n 25) | - (n 0) |

**d35** (turn 23, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:13>42` | block Novice Inspector>Tolarian Terror | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:13>42,1>55` | block Novice Inspector>Tolarian Terror, Luminous Phantom>Ghost Ship | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:10>42,13>42` | block Novice Inspector>Tolarian Terror, Savannah Lions>Tolarian Terror | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `block:13>42,18>42` | block Novice Inspector>Tolarian Terror, Farrel's Zealot>Tolarian Terror | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 5 | `block:1>42,13>42` | block Novice Inspector>Tolarian Terror, Luminous Phantom>Tolarian Terror | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d36** (turn 24, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `cast:18` | Farrel's Zealot | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:4` | Cathar Commando | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d37** (turn 24, a; option 0 is Forge's answer) -- settled by the screen (mean value 1.7%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:19` | attack Mesa Pegasus | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `attack:1,10,19,39` | attack Mesa Pegasus+Icatian Scout+Savannah Lions+Luminous Phantom | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 3 | `attack:19,39` | attack Mesa Pegasus+Icatian Scout | 2.0 [0.2, 16.6] (n 25) | - (n 0) |
| 4 | `attack:10,19` | attack Mesa Pegasus+Savannah Lions | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 5 | `attack:1,19` | attack Mesa Pegasus+Luminous Phantom | 4.0 [0.7, 19.5] (n 25) | - (n 0) |

**d38** (turn 24, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:18` | Farrel's Zealot | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:4` | Cathar Commando | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d40** (turn 25, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:4>42,18>42` | block Cathar Commando>Tolarian Terror, Farrel's Zealot>Tolarian Terror | 6.3 [3.4, 11.4] (n 150) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 2 | `block:18>42` | block Farrel's Zealot>Tolarian Terror | 1.0 [0.1, 8.9] (n 50, stopped at 50) | - (n 0) |
| 3 | `block:4>42` | block Cathar Commando>Tolarian Terror | 2.0 [0.4, 10.5] (n 50, stopped at 50) | - (n 0) |
| 4 | `block:4>42,18>42,1>55` | block Cathar Commando>Tolarian Terror, Farrel's Zealot>Tolarian Terror, Luminous Phantom>Ghost Ship | 2.0 [0.4, 10.5] (n 50, stopped at 50) | - (n 0) |
| 5 | `block:4>42,18>42,39>42` | block Cathar Commando>Tolarian Terror, Farrel's Zealot>Tolarian Terror, Icatian Scout>Tolarian Terror | 9.0 [5.4, 14.7] (n 150) | - (n 0) |
| 6 | `block:4>42,10>42,18>42` | block Cathar Commando>Tolarian Terror, Farrel's Zealot>Tolarian Terror, Savannah Lions>Tolarian Terror | 2.0 [0.4, 10.5] (n 50, stopped at 50) | - (n 0) |
| 7 | `block:1>42,4>42,18>42` | block Cathar Commando>Tolarian Terror, Farrel's Zealot>Tolarian Terror, Luminous Phantom>Tolarian Terror | 2.0 [0.5, 7.0] (n 100, stopped at 100) | - (n 0) |

**d41** (turn 26, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:1,19` | attack Luminous Phantom+Mesa Pegasus | 10.0 [6.2, 15.8] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 14.0 [7.0, 26.2] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:1,10,12,19,39` | attack Luminous Phantom+Mesa Pegasus+Icatian Scout+Savannah Lions+Repentant Blacksmith | 14.0 [7.0, 26.2] (n 50, stopped at 50) | - (n 0) |
| 3 | `attack:19` | attack Mesa Pegasus | 10.0 [4.3, 21.4] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:1` | attack Luminous Phantom | 9.0 [3.7, 20.1] (n 50, stopped at 50) | - (n 0) |
| 5 | `attack:1,19,39` | attack Luminous Phantom+Mesa Pegasus+Icatian Scout | 21.3 [15.5, 28.6] (n 150) | - (n 0) |
| 6 | `attack:1,10,19` | attack Luminous Phantom+Mesa Pegasus+Savannah Lions | 11.5 [6.6, 19.2] (n 100, stopped at 100) | - (n 0) |
| 7 | `attack:1,12,19` | attack Luminous Phantom+Mesa Pegasus+Repentant Blacksmith | 12.0 [5.6, 23.8] (n 50, stopped at 50) | - (n 0) |

**d42** (turn 28, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:19,39` | attack Mesa Pegasus+Icatian Scout | 37.0 [29.7, 45.0] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 33.0 [24.6, 42.7] (n 100, stopped at 100) | - (n 0) |
| 2 | `attack:1,10,12,19,39` | attack Mesa Pegasus+Icatian Scout+Savannah Lions+Luminous Phantom+Repentant Blacksmith | 38.3 [30.9, 46.3] (n 150) | - (n 0) |
| 3 | `attack:39` | attack Icatian Scout | 39.3 [31.9, 47.3] (n 150) | - (n 0) |
| 4 | `attack:19` | attack Mesa Pegasus | 34.7 [27.5, 42.6] (n 150) | - (n 0) |
| 5 | `attack:10,19,39` | attack Mesa Pegasus+Icatian Scout+Savannah Lions | 40.0 [32.5, 48.0] (n 150) | - (n 0) |
| 6 | `attack:1,19,39` | attack Mesa Pegasus+Icatian Scout+Luminous Phantom | 35.7 [28.4, 43.6] (n 150) | - (n 0) |
| 7 | `attack:12,19,39` | attack Mesa Pegasus+Icatian Scout+Repentant Blacksmith | 39.7 [32.2, 47.7] (n 150) | - (n 0) |

**d50** (turn 34, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:6,39` | attack Iron Hills Blacksmith+Icatian Scout | 14.0 [9.3, 20.5] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 10.7 [6.7, 16.6] (n 150) | - (n 0) |
| 2 | `attack:39` | attack Icatian Scout | 14.7 [9.9, 21.2] (n 150) | - (n 0) |
| 3 | `attack:6` | attack Iron Hills Blacksmith | 14.3 [9.6, 20.8] (n 150) | - (n 0) |

7000 branch games (0 with an error, left out); 1313 random and 0 Forge branches ended at the turn cap.

## Checks

258229 rows checked (ids against each seat's own frame log), 14002 frame logs through tools/check-redaction.mjs, 7000 forks checked (0 not the position), 15 no-leak checks (0 moved; the negative control moved in 15). The guardrails read back from 14000 random seats' logs: a land offered at 59966 of 894035 priority decisions and taken at 59966; 0 of 0 opening hands kept; G3 left out a repeated no-op 19004 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 0 pick(s) of the seats' own X plays had X drawn from 1 up, 0 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem. Warnings (never a problem): 9, below.

### Branch games the turn cap ended

1313 of 7000 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

- a warning: d41 option 5 `attack:1,19,39` (attack Luminous Phantom+Mesa Pegasus+Icatian Scout): 42 of 150 branch game(s) were capped (random 42 of 150): 42 x ended at the turn cap
- a warning: d42 option 0 `attack:19,39` (attack Mesa Pegasus+Icatian Scout): 89 of 150 branch game(s) were capped (random 89 of 150): 89 x ended at the turn cap
- a warning: d42 option 1 `attack:none` (attack none): 44 of 100 branch game(s) were capped (random 44 of 100): 44 x ended at the turn cap
- a warning: d42 option 2 `attack:1,10,12,19,39` (attack Mesa Pegasus+Icatian Scout+Savannah Lions+Luminous Phantom+Repentant Blacksmith): 91 of 150 branch game(s) were capped (random 91 of 150): 91 x ended at the turn cap
- a warning: d42 option 3 `attack:39` (attack Icatian Scout): 94 of 150 branch game(s) were capped (random 94 of 150): 94 x ended at the turn cap
- a warning: d42 option 4 `attack:19` (attack Mesa Pegasus): 78 of 150 branch game(s) were capped (random 78 of 150): 78 x ended at the turn cap
- a warning: d42 option 5 `attack:10,19,39` (attack Mesa Pegasus+Icatian Scout+Savannah Lions): 92 of 150 branch game(s) were capped (random 92 of 150): 92 x ended at the turn cap
- a warning: d42 option 6 `attack:1,19,39` (attack Mesa Pegasus+Icatian Scout+Luminous Phantom): 79 of 150 branch game(s) were capped (random 79 of 150): 79 x ended at the turn cap
- a warning: d42 option 7 `attack:12,19,39` (attack Mesa Pegasus+Icatian Scout+Repentant Blacksmith): 93 of 150 branch game(s) were capped (random 93 of 150): 93 x ended at the turn cap

