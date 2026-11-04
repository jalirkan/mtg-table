# Move atlas: powered-2473-00001 vs powered-2473-00002, seed 2573

D451. Seat A is powered-2473-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 16 turns, won by A, and listed 24 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d3 | 6 | p | 3 | 2 `cast:4`, 8.0 [1.3, 16.0] (n 150) | -, - (n 0) | - | - |
| d5 | 6 | p | 5 | 3 `cast:4`, 10.0 [4.7, 18.7] (n 150) | -, - (n 0) | - | - |
| d6 | 6 | p | 3 | 0 `activate:22#2`, 0.0 [0.0, 16.0] (n 50) | -, - (n 0) | - | - |
| d7 | 8 | p | 4 | 2 `cast:39`, 5.0 [0.0, 14.0] (n 150) | -, - (n 0) | - | - |
| d9 | 8 | p | 3 | 1 `pass`, 4.7 [0.0, 12.0] (n 150) | -, - (n 0) | - | - |
| d10 | 10 | p | 3 | 1 `cast:39`, 4.0 [0.0, 9.3] (n 150) | -, - (n 0) | - | - |
| d11 | 10 | a | 2 | 0 `attack:13`, 0.0 [0.0, 8.0] (n 50) | -, - (n 0) | - | - |
| d12 | 10 | p | 4 | 2 `cast:39`, 3.3 [0.0, 10.0] (n 150) | -, - (n 0) | - | - |
| d13 | 10 | p | 3 | 0 `cast:39`, 0.0 [0.0, 10.0] (n 50) | -, - (n 0) | - | - |
| d14 | 10 | p | 2 | 1 `pass`, 3.3 [0.0, 8.7] (n 150) | -, - (n 0) | - | - |
| d15 | 12 | p | 2 | 1 `pass`, 8.0 [0.0, 20.0] (n 25) | -, - (n 0) | - | - |
| d16 | 12 | a | 5 | 0 `attack:13`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d17 | 12 | p | 3 | 0 `cast:57`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d18 | 14 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d19 | 14 | a | 7 | 0 `attack:4,13,57,96,100`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d20 | 14 | p | 4 | 0 `cast:6`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d21 | 14 | p | 3 | 0 `cast:4`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d22 | 16 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d23 | 16 | a | 8 | 0 `attack:4,13,96,100,107,108`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

19 decision(s) branched, 7 of them in full (3 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 9: d17 (mean value 100.0%, replaced by d20), d19 (mean value 100.0%, replaced by d18), d21 (mean value 100.0%, replaced by d6), d23 (mean value 100.0%, replaced by d22), d20 (mean value 100.0%, replaced by d16), d16 (mean value 97.6%, replaced by d10), d22 (mean value 100.0%, replaced by d15), d18 (mean value 100.0%, replaced by d14), d15 (mean value 96.0%, replaced by d11). Early stopping at 50/100 random branches stopped 3 option(s): d9 o2 at 50, d12 o1 at 100, d12 o3 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 4. It stopped 3 (d13, d6, d11), each a partial label at that n, never confident, saving at most 800 branch games; 1 it would have stopped played on to the full n as controls (d12; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d3** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 72.7 [65.0, 79.2] (n 150) | - (n 0) |
| 1 | `cast:39` | Tibalt, Rakish Instigator | 76.7 [69.3, 82.7] (n 150) | - (n 0) |
| 2 | `cast:4` | Hanweir Garrison | 80.7 [73.6, 86.2] (n 150) | - (n 0) |

**d5** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:22` | Chandra, Torch of Defiance | 75.3 [67.9, 81.5] (n 150) | - (n 0) |
| 1 | `pass` | pass | 77.3 [70.0, 83.3] (n 150) | - (n 0) |
| 2 | `cast:39` | Tibalt, Rakish Instigator | 84.0 [77.3, 89.0] (n 150) | - (n 0) |
| 3 | `cast:4` | Hanweir Garrison | 85.3 [78.8, 90.1] (n 150) | - (n 0) |
| 4 | `cast:8` | Faerie Mastermind | 84.0 [77.3, 89.0] (n 150) | - (n 0) |

**d6** (turn 6, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:22#2` | Chandra, Torch of Defiance: -3: CARDNAME deals 4 damage to t | 82.0 [69.2, 90.2] (n 50) | - (n 0) |
| 1 | `pass` | pass | 76.0 [62.6, 85.7] (n 50) | - (n 0) |
| 2 | `activate:22#0` | Chandra, Torch of Defiance: +1: Exile the top card of your l | 82.0 [69.2, 90.2] (n 50) | - (n 0) |

**d7** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:2` | Sword of Light and Shadow | 78.0 [70.7, 83.9] (n 150) | - (n 0) |
| 1 | `pass` | pass | 80.0 [72.9, 85.6] (n 150) | - (n 0) |
| 2 | `cast:39` | Tibalt, Rakish Instigator | 83.0 [76.2, 88.2] (n 150) | - (n 0) |
| 3 | `cast:4` | Hanweir Garrison | 78.0 [70.7, 83.9] (n 150) | - (n 0) |

**d9** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:2` | Sword of Light and Shadow: Equip {2} ({2}: Attach to target  | 84.0 [77.3, 89.0] (n 150) | - (n 0) |
| 1 | `pass` | pass | 88.7 [82.6, 92.8] (n 150) | - (n 0) |
| 2 | `cast:8` | Faerie Mastermind | 76.0 [62.6, 85.7] (n 50, stopped at 50) | - (n 0) |

**d10** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 90.0 [84.2, 93.8] (n 150) | - (n 0) |
| 1 | `cast:39` | Tibalt, Rakish Instigator | 94.0 [89.0, 96.8] (n 150) | - (n 0) |
| 2 | `cast:4` | Hanweir Garrison | 89.3 [83.4, 93.3] (n 150) | - (n 0) |

**d11** (turn 10, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:13` | attack Ragavan, Nimble Pilferer | 88.0 [76.2, 94.4] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 82.0 [69.2, 90.2] (n 50) | - (n 0) |

**d12** (turn 10, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:4` | Hanweir Garrison | 86.7 [80.3, 91.2] (n 150) | - (n 0) |
| 1 | `pass` | pass | 84.0 [75.6, 89.9] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:39` | Tibalt, Rakish Instigator | 90.0 [84.2, 93.8] (n 150) | - (n 0) |
| 3 | `cast:8` | Faerie Mastermind | 81.0 [72.2, 87.5] (n 100, stopped at 100) | - (n 0) |

**d13** (turn 10, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:39` | Tibalt, Rakish Instigator | 90.0 [78.6, 95.7] (n 50) | - (n 0) |
| 1 | `pass` | pass | 88.0 [76.2, 94.4] (n 50) | - (n 0) |
| 2 | `cast:8` | Faerie Mastermind | 86.0 [73.8, 93.0] (n 50) | - (n 0) |

**d14** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:39` | Tibalt, Rakish Instigator: -2: Create a 1/1 red Devil creatu | 92.7 [87.4, 95.9] (n 150) | - (n 0) |
| 1 | `pass` | pass | 96.0 [91.5, 98.2] (n 150) | - (n 0) |

**d15** (turn 12, p; option 0 is Forge's answer) -- settled by the screen (mean value 96.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:39` | Tibalt, Rakish Instigator: -2: Create a 1/1 red Devil creatu | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d16** (turn 12, a; option 0 is Forge's answer) -- settled by the screen (mean value 97.6%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:13` | attack Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 2 | `attack:4,13,96` | attack Ragavan, Nimble Pilferer+Hanweir Garrison+Devil Token | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 3 | `attack:4,13` | attack Ragavan, Nimble Pilferer+Hanweir Garrison | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 4 | `attack:13,96` | attack Ragavan, Nimble Pilferer+Devil Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d17** (turn 12, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:57` | Bloodsoaked Champion (may play) | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:8` | Faerie Mastermind | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d18** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `cast:6` | Ark of Hunger | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d19** (turn 14, a; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:4,13,57,96,100` | attack Devil Token+Hanweir Garrison+Devil Token+Bloodsoaked Champion+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:4,13,57,100` | attack Hanweir Garrison+Devil Token+Bloodsoaked Champion+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:13,57,96,100` | attack Devil Token+Devil Token+Bloodsoaked Champion+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:4,13,57,96` | attack Devil Token+Hanweir Garrison+Bloodsoaked Champion+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:4,13,96,100` | attack Devil Token+Hanweir Garrison+Devil Token+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:4,57,96,100` | attack Devil Token+Hanweir Garrison+Devil Token+Bloodsoaked Champion | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d20** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:6` | Ark of Hunger | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:4` | Hanweir Garrison | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:8` | Faerie Mastermind | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d21** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:4` | Hanweir Garrison | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:8` | Faerie Mastermind | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d22** (turn 16, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `cast:8` | Faerie Mastermind | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d23** (turn 16, a; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:4,13,96,100,107,108` | attack Devil Token+Hanweir Garrison+Devil Token+Human Token+Human Token+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:4,13,100,107,108` | attack Hanweir Garrison+Devil Token+Human Token+Human Token+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:13,96,100,107,108` | attack Devil Token+Devil Token+Human Token+Human Token+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:4,13,96,107,108` | attack Devil Token+Hanweir Garrison+Human Token+Human Token+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:4,13,96,100,108` | attack Devil Token+Hanweir Garrison+Devil Token+Human Token+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:4,13,96,100,107` | attack Devil Token+Hanweir Garrison+Devil Token+Human Token+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `attack:4,96,100,107,108` | attack Devil Token+Hanweir Garrison+Devil Token+Human Token+Human Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

4700 branch games (0 with an error, left out); 1 random and 0 Forge branches ended at the turn cap.

## Checks

147206 rows checked (ids against each seat's own frame log), 9402 frame logs through tools/check-redaction.mjs, 4700 forks checked (0 not the position), 19 no-leak checks (0 moved; the negative control moved in 18). The guardrails read back from 9400 random seats' logs: a land offered at 29891 of 209038 priority decisions and taken at 29891; 0 of 0 opening hands kept; G3 left out a repeated no-op 4663 time(s); G5 (D458): the engine refused 38 pick(s) it could not pay for, and 37 later offer(s) of them in the same priority window were left out; G6 (D471): 506 pick(s) of the seats' own X plays had X drawn from 1 up, 44773 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

1 of 4700 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

