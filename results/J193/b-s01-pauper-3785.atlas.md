# Move atlas: pauper-3685-00001 vs pauper-3685-00002, seed 3785

D451. Seat A is pauper-3685-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 19 turns, won by B, and listed 20 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d2 | 6 | p | 3 | 0 `pass`, 0.0 [0.0, 3.0] (n 50) | -, - (n 0) | - | - |
| d4 | 8 | p | 4 | 0 `pass`, 0.0 [0.0, 10.0] (n 50) | -, - (n 0) | - | - |
| d5 | 8 | p | 4 | 1 `pass`, 9.3 [1.7, 17.3] (n 150) | 1 `pass`, 2.5 [0.0, 12.5] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d7 | 8 | p | 3 | 2 `cast:4`, 6.3 [0.0, 14.3] (n 150) | 1 `cast:12`, 3.8 [0.0, 12.5] (n 40) | 0.50 [-1.00, 1.00] | no |
| d9 | 10 | p | 4 | 3 `cast:4`, 8.3 [0.7, 17.7] (n 150) | 0 `cast:11`, 0.0 [0.0, 0.0] (n 40) | -0.95 [-1.00, 0.54] | no |
| d10 | 12 | p | 3 | 0 `pass`, 0.0 [0.0, 6.7] (n 150) | 1 `cast:12`, 2.5 [0.0, 12.5] (n 40) | 0.00 [-1.00, 1.00] | no |
| d12 | 14 | p | 4 | 3 `cast:13`, 18.3 [11.0, 26.0] (n 150) | 3 `cast:13`, 2.5 [0.0, 7.5] (n 40) | 1.00 [1.00, 1.00] | yes |
| d14 | 16 | p | 4 | 3 `cast:38`, 14.7 [8.0, 21.0] (n 150) | 3 `cast:38`, 2.5 [0.0, 7.5] (n 40) | 1.00 [1.00, 1.00] | yes |
| d15 | 16 | p | 4 | 0 `cast:38`, 0.0 [0.0, 1.0] (n 50) | -, - (n 0) | - | - |
| d19 | 18 | p | 3 | 0 `pass`, 0.0 [0.0, 1.0] (n 150) | 0 `pass`, 0.0 [0.0, 0.0] (n 40) | - | yes |

### The cut design (D480)

10 decision(s) branched, 7 of them in full (3 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 0: none. Early stopping at 50/100 random branches stopped 6 option(s): d5 o2 at 100, d5 o3 at 100, d12 o1 at 50, d12 o2 at 50, d14 o1 at 100, d14 o2 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 4. It stopped 3 (d2, d4, d15), each a partial label at that n, never confident, saving at most 1540 branch games; 1 it would have stopped played on to the full n as controls (d19; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

Over 7 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.43 [-0.22, 0.92]; at 2 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 4 of 7 decision(s) (57.1% [25.1, 84.2]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d9 (turn 10, p): rank correlation -0.95 [-1.00, 0.54]; random's best `cast:4`, Forge's best `cast:11`.
- d10 (turn 12, p): rank correlation 0.00 [-1.00, 1.00]; random's best `pass`, Forge's best `cast:12`.
- d7 (turn 8, p): rank correlation 0.50 [-1.00, 1.00]; random's best `cast:4`, Forge's best `cast:12`.
- d5 (turn 8, p): rank correlation 1.00 [-1.00, 1.00]; random's best `pass`, Forge's best `pass`.
- d12 (turn 14, p): rank correlation 1.00 [1.00, 1.00]; random's best `cast:13`, Forge's best `cast:13`.

### Each decision's options, side by side

**d2** (turn 6, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 56.0 [42.3, 68.8] (n 50) | - (n 0) |
| 1 | `cast:12` | Holy Light | 46.0 [33.0, 59.6] (n 50) | - (n 0) |
| 2 | `cast:4` | Army of Allah | 46.0 [33.0, 59.6] (n 50) | - (n 0) |

**d4** (turn 8, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 57.0 [43.3, 69.7] (n 50) | - (n 0) |
| 1 | `cast:12` | Holy Light | 53.0 [39.5, 66.1] (n 50) | - (n 0) |
| 2 | `cast:4` | Army of Allah | 51.0 [37.6, 64.3] (n 50) | - (n 0) |
| 3 | `cast:9` | Savannah Lions | 46.0 [33.0, 59.6] (n 50) | - (n 0) |

**d5** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:9` | Savannah Lions | 47.7 [39.8, 55.6] (n 150) | 20.0 [10.5, 34.8] (n 40) |
| 1 | `pass` | pass | 57.0 [49.0, 64.6] (n 150) | 22.5 [12.3, 37.5] (n 40) |
| 2 | `cast:12` | Holy Light | 41.5 [32.3, 51.3] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:4` | Army of Allah | 42.5 [33.3, 52.3] (n 100, stopped at 100) | - (n 0) |

**d7** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 44.7 [36.9, 52.7] (n 150) | 8.8 [3.3, 21.5] (n 40) |
| 1 | `cast:12` | Holy Light | 50.7 [42.8, 58.6] (n 150) | 12.5 [5.5, 26.1] (n 40) |
| 2 | `cast:4` | Army of Allah | 51.0 [43.1, 58.9] (n 150) | 10.0 [4.0, 23.1] (n 40) |

**d9** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:11` | Battle Screech | 50.3 [42.4, 58.2] (n 150) | 12.5 [5.5, 26.1] (n 40) |
| 1 | `pass` | pass | 54.0 [46.0, 61.8] (n 150) | 7.5 [2.6, 19.9] (n 40) |
| 2 | `cast:12` | Holy Light | 58.0 [50.0, 65.6] (n 150) | 7.5 [2.6, 19.9] (n 40) |
| 3 | `cast:4` | Army of Allah | 58.7 [50.7, 66.2] (n 150) | 5.0 [1.4, 16.5] (n 40) |

**d10** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 42.7 [35.0, 50.7] (n 150) | 10.0 [4.0, 23.1] (n 40) |
| 1 | `cast:12` | Holy Light | 42.0 [34.4, 50.0] (n 150) | 12.5 [5.5, 26.1] (n 40) |
| 2 | `cast:4` | Army of Allah | 42.0 [34.4, 50.0] (n 150) | 5.0 [1.4, 16.5] (n 40) |

**d12** (turn 14, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 22.3 [16.4, 29.6] (n 150) | 2.5 [0.4, 12.9] (n 40) |
| 1 | `cast:12` | Holy Light | 16.0 [8.3, 28.5] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:4` | Army of Allah | 18.0 [9.8, 30.8] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:13` | Eagles of the North | 40.7 [33.1, 48.7] (n 150) | 5.0 [1.4, 16.5] (n 40) |

**d14** (turn 16, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 14.7 [9.9, 21.2] (n 150) | 15.0 [7.1, 29.1] (n 40) |
| 1 | `cast:12` | Holy Light | 13.0 [7.8, 21.0] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:4` | Army of Allah | 13.0 [7.8, 21.0] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:38` | Salt Road Packbeast | 29.3 [22.6, 37.1] (n 150) | 17.5 [8.8, 31.9] (n 40) |

**d15** (turn 16, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:38` | Salt Road Packbeast | 29.0 [18.3, 42.7] (n 50) | - (n 0) |
| 1 | `pass` | pass | 11.0 [5.0, 22.6] (n 50) | - (n 0) |
| 2 | `cast:12` | Holy Light | 19.0 [10.5, 31.9] (n 50) | - (n 0) |
| 3 | `cast:4` | Army of Allah | 17.0 [9.0, 29.7] (n 50) | - (n 0) |

**d19** (turn 18, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 14.0 [9.3, 20.5] (n 150) | 0.0 [0.0, 8.8] (n 40) |
| 1 | `cast:12` | Holy Light | 10.3 [6.4, 16.2] (n 150) | 0.0 [0.0, 8.8] (n 40) |
| 2 | `cast:4` | Army of Allah | 10.3 [6.4, 16.2] (n 150) | 0.0 [0.0, 8.8] (n 40) |

4660 branch games (0 with an error, left out); 644 random and 1 Forge branches ended at the turn cap.

## Checks

192539 rows checked (ids against each seat's own frame log), 9322 frame logs through tools/check-redaction.mjs, 4660 forks checked (0 not the position), 17 no-leak checks (0 moved; the negative control moved in 17). The guardrails read back from 7800 random seats' logs: a land offered at 44538 of 902236 priority decisions and taken at 44538; 0 of 0 opening hands kept; G3 left out a repeated no-op 18488 time(s); G5 (D458): the engine refused 4 pick(s) it could not pay for, and 4 later offer(s) of them in the same priority window were left out; G6 (D471): 0 pick(s) of the seats' own X plays had X drawn from 1 up, 0 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem. Warnings (never a problem): 5, below.

### Branch games the turn cap ended

645 of 4660 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

- a warning: d2 option 0 `pass` (pass): 18 of 50 branch game(s) were capped (random 18 of 50): 18 x ended at the turn cap
- a warning: d2 option 1 `cast:12` (Holy Light): 16 of 50 branch game(s) were capped (random 16 of 50): 16 x ended at the turn cap
- a warning: d2 option 2 `cast:4` (Army of Allah): 18 of 50 branch game(s) were capped (random 18 of 50): 18 x ended at the turn cap
- a warning: d4 option 1 `cast:12` (Holy Light): 15 of 50 branch game(s) were capped (random 15 of 50): 15 x ended at the turn cap
- a warning: d4 option 2 `cast:4` (Army of Allah): 17 of 50 branch game(s) were capped (random 17 of 50): 17 x ended at the turn cap

