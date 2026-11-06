# Move atlas: pauper-3689-00001 vs pauper-3689-00002, seed 3789

D451. Seat A is pauper-3689-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 14 turns, won by A, and listed 19 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d2 | 4 | p | 3 | 0 `pass`, 0.0 [0.0, 6.0] (n 150) | -, - (n 0) | - | - |
| d4 | 4 | p | 3 | 0 `cast:3`, 0.0 [0.0, 9.0] (n 150) | -, - (n 0) | - | - |
| d5 | 6 | p | 4 | 0 `cast:17`, 0.0 [0.0, 13.0] (n 50) | -, - (n 0) | - | - |
| d8 | 6 | p | 3 | 1 `pass`, 7.7 [0.0, 16.7] (n 150) | -, - (n 0) | - | - |
| d9 | 8 | p | 3 | 2 `cast:7`, 14.0 [4.7, 23.7] (n 150) | -, - (n 0) | - | - |
| d10 | 8 | a | 5 | 2 `attack:9,36`, 7.3 [1.3, 17.0] (n 150) | -, - (n 0) | - | - |
| d11 | 8 | p | 3 | 0 `cast:7`, 0.0 [0.0, 1.0] (n 50) | -, - (n 0) | - | - |
| d12 | 9 | b | 5 | 1 `block:none`, 20.3 [12.0, 28.3] (n 150) | -, - (n 0) | - | - |
| d14 | 10 | a | 6 | 2 `attack:7,9,36`, 1.0 [0.0, 7.7] (n 150) | -, - (n 0) | - | - |
| d17 | 12 | a | 7 | 2 `attack:3,7,9,10,36`, 9.7 [5.0, 15.3] (n 150) | -, - (n 0) | - | - |
| d18 | 14 | a | 7 | 0 `attack:3,7,9,10,36`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

11 decision(s) branched, 8 of them in full (2 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 1: d18 (mean value 99.4%, replaced by d12). Early stopping at 50/100 random branches stopped 13 option(s): d8 o2 at 100, d9 o1 at 50, d14 o1 at 50, d14 o3 at 50, d14 o4 at 50, d17 o1 at 50, d17 o3 at 100, d17 o4 at 100, d17 o5 at 100, d17 o6 at 50, d12 o2 at 50, d12 o3 at 50, d12 o4 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 3. It stopped 2 (d5, d11), each a partial label at that n, never confident, saving at most 700 branch games; 1 it would have stopped played on to the full n as controls (d2; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d2** (turn 4, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 40.7 [33.1, 48.7] (n 150) | - (n 0) |
| 1 | `cast:3` | Scryb Sprites | 36.3 [29.1, 44.3] (n 150) | - (n 0) |
| 2 | `cast:10` | Perilous Myr | 36.0 [28.8, 43.9] (n 150) | - (n 0) |

**d4** (turn 4, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:3` | Scryb Sprites | 39.7 [32.2, 47.7] (n 150) | - (n 0) |
| 1 | `pass` | pass | 34.0 [26.9, 41.9] (n 150) | - (n 0) |
| 2 | `cast:10` | Perilous Myr | 39.7 [32.2, 47.7] (n 150) | - (n 0) |

**d5** (turn 6, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:17` | Harrow | 54.0 [40.4, 67.0] (n 50) | - (n 0) |
| 1 | `pass` | pass | 44.0 [31.2, 57.7] (n 50) | - (n 0) |
| 2 | `cast:10` | Perilous Myr | 51.0 [37.6, 64.3] (n 50) | - (n 0) |
| 3 | `cast:36` | Coruscation Mage | 48.0 [34.8, 61.5] (n 50) | - (n 0) |

**d8** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:36` | Coruscation Mage | 42.3 [34.7, 50.3] (n 150) | - (n 0) |
| 1 | `pass` | pass | 50.0 [42.1, 57.9] (n 150) | - (n 0) |
| 2 | `cast:10` | Perilous Myr | 39.5 [30.5, 49.3] (n 100, stopped at 100) | - (n 0) |

**d9** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 51.7 [43.7, 59.5] (n 150) | - (n 0) |
| 1 | `cast:10` | Perilous Myr | 47.0 [33.9, 60.6] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:7` | Beetleback Chief | 65.7 [57.8, 72.8] (n 150) | - (n 0) |

**d10** (turn 8, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:3,9,36` | attack Scryb Sprites+Coruscation Mage+Icatian Javelineers | 47.3 [39.5, 55.3] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 49.3 [41.4, 57.3] (n 150) | - (n 0) |
| 2 | `attack:9,36` | attack Coruscation Mage+Icatian Javelineers | 54.7 [46.7, 62.4] (n 150) | - (n 0) |
| 3 | `attack:3,9` | attack Scryb Sprites+Icatian Javelineers | 53.0 [45.0, 60.8] (n 150) | - (n 0) |
| 4 | `attack:3,36` | attack Scryb Sprites+Coruscation Mage | 47.3 [39.5, 55.3] (n 150) | - (n 0) |

**d11** (turn 8, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:7` | Beetleback Chief | 79.0 [65.9, 88.0] (n 50) | - (n 0) |
| 1 | `pass` | pass | 63.0 [49.1, 75.0] (n 50) | - (n 0) |
| 2 | `cast:10` | Perilous Myr | 57.0 [43.3, 69.7] (n 50) | - (n 0) |

**d12** (turn 9, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:84>79,85>79` | block Goblin Token>Yahenni, Undying Partisan, Goblin Token>Yahenni, Undying Partisan | 69.0 [61.2, 75.8] (n 150) | - (n 0) |
| 1 | `block:none` | block none | 89.3 [83.4, 93.3] (n 150) | - (n 0) |
| 2 | `block:84>79` | block Goblin Token>Yahenni, Undying Partisan | 73.0 [59.4, 83.3] (n 50, stopped at 50) | - (n 0) |
| 3 | `block:85>79` | block Goblin Token>Yahenni, Undying Partisan | 78.0 [64.8, 87.3] (n 50, stopped at 50) | - (n 0) |
| 4 | `block:7>79,84>79,85>79` | block Goblin Token>Yahenni, Undying Partisan, Goblin Token>Yahenni, Undying Partisan, Beetleback Chief>Yahenni, Undying Partisan | 60.0 [46.2, 72.4] (n 50, stopped at 50) | - (n 0) |

**d14** (turn 10, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:3,7,9,36` | attack Scryb Sprites+Coruscation Mage+Beetleback Chief+Icatian Javelineers | 85.0 [78.4, 89.8] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 59.0 [45.2, 71.5] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:7,9,36` | attack Coruscation Mage+Beetleback Chief+Icatian Javelineers | 86.0 [79.5, 90.7] (n 150) | - (n 0) |
| 3 | `attack:3,7,9` | attack Scryb Sprites+Beetleback Chief+Icatian Javelineers | 67.0 [53.2, 78.4] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:3,9,36` | attack Scryb Sprites+Coruscation Mage+Icatian Javelineers | 62.0 [48.1, 74.1] (n 50, stopped at 50) | - (n 0) |
| 5 | `attack:3,7,36` | attack Scryb Sprites+Coruscation Mage+Beetleback Chief | 86.0 [79.5, 90.7] (n 150) | - (n 0) |

**d17** (turn 12, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:3` | attack Scryb Sprites | 90.0 [84.2, 93.8] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 85.0 [72.6, 92.4] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:3,7,9,10,36` | attack Scryb Sprites+Icatian Javelineers+Coruscation Mage+Beetleback Chief+Perilous Myr | 99.7 [96.9, 100.0] (n 150) | - (n 0) |
| 3 | `attack:3,9` | attack Scryb Sprites+Icatian Javelineers | 96.0 [90.2, 98.4] (n 100, stopped at 100) | - (n 0) |
| 4 | `attack:3,36` | attack Scryb Sprites+Coruscation Mage | 95.0 [88.8, 97.9] (n 100, stopped at 100) | - (n 0) |
| 5 | `attack:3,7` | attack Scryb Sprites+Beetleback Chief | 96.0 [90.2, 98.4] (n 100, stopped at 100) | - (n 0) |
| 6 | `attack:3,10` | attack Scryb Sprites+Perilous Myr | 91.0 [79.9, 96.3] (n 50, stopped at 50) | - (n 0) |

**d18** (turn 14, a; option 0 is Forge's answer) -- settled by the screen (mean value 99.4%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:3,7,9,10,36` | attack Scryb Sprites+Coruscation Mage+Beetleback Chief+Icatian Javelineers+Perilous Myr | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 2 | `attack:7,9,10,36` | attack Coruscation Mage+Beetleback Chief+Icatian Javelineers+Perilous Myr | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:3,7,9,10` | attack Scryb Sprites+Beetleback Chief+Icatian Javelineers+Perilous Myr | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:3,9,10,36` | attack Scryb Sprites+Coruscation Mage+Icatian Javelineers+Perilous Myr | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:3,7,10,36` | attack Scryb Sprites+Coruscation Mage+Beetleback Chief+Perilous Myr | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:3,7,9,36` | attack Scryb Sprites+Coruscation Mage+Beetleback Chief+Icatian Javelineers | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

4675 branch games (0 with an error, left out); 277 random and 0 Forge branches ended at the turn cap.

## Checks

181736 rows checked (ids against each seat's own frame log), 9352 frame logs through tools/check-redaction.mjs, 4675 forks checked (0 not the position), 11 no-leak checks (0 moved; the negative control moved in 11). The guardrails read back from 9350 random seats' logs: a land offered at 41613 of 375629 priority decisions and taken at 41613; 0 of 0 opening hands kept; G3 left out a repeated no-op 5293 time(s); G5 (D458): the engine refused 20 pick(s) it could not pay for, and 9 later offer(s) of them in the same priority window were left out; G6 (D471): 595 pick(s) of the seats' own X plays had X drawn from 1 up, 4178 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

277 of 4675 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

