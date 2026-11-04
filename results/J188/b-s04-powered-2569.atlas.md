# Move atlas: powered-2469-00001 vs powered-2469-00002, seed 2569

D451. Seat A is powered-2469-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 16 turns, won by A, and listed 16 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 4 | p | 2 | 1 `cast:24`, 7.7 [0.7, 15.0] (n 150) | -, - (n 0) | - | - |
| d2 | 6 | p | 3 | 0 `cast:11`, 0.0 [0.0, 16.0] (n 50) | -, - (n 0) | - | - |
| d4 | 8 | p | 3 | 0 `activate:11`, 0.0 [0.0, 1.7] (n 150) | -, - (n 0) | - | - |
| d6 | 10 | a | 2 | 0 `attack:93`, 0.0 [0.0, 0.0] (n 50) | -, - (n 0) | - | - |
| d7 | 10 | p | 2 | 1 `pass`, 6.7 [0.0, 16.7] (n 150) | -, - (n 0) | - | - |
| d8 | 11 | b | 2 | 1 `block:99>61`, 4.7 [0.0, 12.0] (n 150) | -, - (n 0) | - | - |
| d9 | 12 | p | 3 | 2 `cast:22`, 14.3 [4.7, 24.0] (n 150) | -, - (n 0) | - | - |
| d10 | 12 | a | 4 | 0 `attack:93,99`, 0.0 [0.0, 0.0] (n 50) | -, - (n 0) | - | - |
| d11 | 12 | p | 2 | 0 `cast:14`, 0.0 [0.0, 6.0] (n 50) | -, - (n 0) | - | - |
| d12 | 14 | p | 4 | 0 `cast:18`, 0.0 [0.0, 3.3] (n 150) | -, - (n 0) | - | - |
| d13 | 14 | a | 8 | 0 `attack:18,93,99,107,111`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d14 | 16 | p | 5 | 0 `activate:25#1`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d15 | 16 | a | 8 | 0 `attack:14,18,93,99,107,117`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

13 decision(s) branched, 6 of them in full (4 more stopped by the futility rule, D489); picked among those with 3 or more options first (2 filled from the rest). The screen at 25 random branches settled 3: d13 (mean value 96.5%, replaced by d8), d14 (mean value 100.0%, replaced by d7), d15 (mean value 100.0%, replaced by d6). Early stopping at 50/100 random branches stopped 2 option(s): d9 o1 at 50, d12 o1 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 4. It stopped 4 (d2, d10, d11, d6), each a partial label at that n, never confident, saving at most 1100 branch games; 0 it would have stopped played on to the full n as controls (none; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 4, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 19.3 [13.8, 26.4] (n 150) | - (n 0) |
| 1 | `cast:24` | Bitterblossom | 27.0 [20.5, 34.6] (n 150) | - (n 0) |

**d2** (turn 6, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:11` | Sword of Fire and Ice | 22.0 [12.8, 35.2] (n 50) | - (n 0) |
| 1 | `pass` | pass | 22.0 [12.8, 35.2] (n 50) | - (n 0) |
| 2 | `cast:39` | Basalt Monolith | 22.0 [12.8, 35.2] (n 50) | - (n 0) |

**d4** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:11` | Sword of Fire and Ice: Equip {2} ({2}: Attach to target crea | 27.3 [20.8, 35.0] (n 150) | - (n 0) |
| 1 | `pass` | pass | 20.3 [14.7, 27.5] (n 150) | - (n 0) |
| 2 | `cast:39` | Basalt Monolith | 19.0 [13.5, 26.0] (n 150) | - (n 0) |

**d6** (turn 10, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:93` | attack Faerie Rogue Token | 46.0 [33.0, 59.6] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 26.0 [15.9, 39.6] (n 50) | - (n 0) |

**d7** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:39` | Basalt Monolith | 41.3 [33.8, 49.3] (n 150) | - (n 0) |
| 1 | `pass` | pass | 48.0 [40.2, 55.9] (n 150) | - (n 0) |

**d8** (turn 11, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 34.0 [26.9, 41.9] (n 150) | - (n 0) |
| 1 | `block:99>61` | block Faerie Rogue Token>Forensic Gadgeteer | 38.7 [31.3, 46.7] (n 150) | - (n 0) |

**d9** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:25` | Batterskull | 45.7 [37.9, 53.6] (n 150) | - (n 0) |
| 1 | `pass` | pass | 36.0 [24.1, 49.9] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:22` | Marionette Master | 60.0 [52.0, 67.5] (n 150) | - (n 0) |

**d10** (turn 12, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:93,99` | attack Faerie Rogue Token+Faerie Rogue Token | 64.0 [50.1, 75.9] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 30.0 [19.1, 43.8] (n 50) | - (n 0) |
| 2 | `attack:93` | attack Faerie Rogue Token | 54.0 [40.4, 67.0] (n 50) | - (n 0) |
| 3 | `attack:99` | attack Faerie Rogue Token | 35.0 [23.3, 48.9] (n 50) | - (n 0) |

**d11** (turn 12, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:14` | Ragavan, Nimble Pilferer | 68.0 [54.2, 79.2] (n 50) | - (n 0) |
| 1 | `pass` | pass | 60.0 [46.2, 72.4] (n 50) | - (n 0) |

**d12** (turn 14, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:18` | Detective's Phoenix | 91.3 [85.7, 94.9] (n 150) | - (n 0) |
| 1 | `pass` | pass | 74.0 [60.5, 84.1] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:40` | Searslicer Goblin | 88.7 [82.6, 92.8] (n 150) | - (n 0) |
| 3 | `cast:16` | Gau, Feral Youth | 84.3 [77.7, 89.3] (n 150) | - (n 0) |

**d13** (turn 14, a; option 0 is Forge's answer) -- settled by the screen (mean value 96.5%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:18,93,99,107,111` | attack Detective's Phoenix+Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Phyrexian Germ Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 80.0 [60.9, 91.1] (n 25) | - (n 0) |
| 2 | `attack:14,18,93,99,107,111` | attack Detective's Phoenix+Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Phyrexian Germ Token+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:93,99,107,111` | attack Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Phyrexian Germ Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:18,93,107,111` | attack Detective's Phoenix+Faerie Rogue Token+Faerie Rogue Token+Phyrexian Germ Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:18,93,99,111` | attack Detective's Phoenix+Faerie Rogue Token+Faerie Rogue Token+Phyrexian Germ Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:18,99,107,111` | attack Detective's Phoenix+Faerie Rogue Token+Faerie Rogue Token+Phyrexian Germ Token | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 7 | `attack:18,93,99,107` | attack Detective's Phoenix+Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token | 96.0 [80.5, 99.3] (n 25) | - (n 0) |

**d14** (turn 16, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:25#1` | Batterskull: Equip {5} ({5}: Attach to target creature you c | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:40` | Searslicer Goblin | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:16` | Gau, Feral Youth | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `cast:28` | Elektra, Daughter of the Hand | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d15** (turn 16, a; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:14,18,93,99,107,117` | attack Detective's Phoenix+Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:14,93,99,107,117` | attack Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:14,18,93,107,117` | attack Detective's Phoenix+Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:14,18,93,99,107` | attack Detective's Phoenix+Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:14,18,93,99,117` | attack Detective's Phoenix+Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:14,18,99,107,117` | attack Detective's Phoenix+Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Ragavan, Nimble Pilferer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `attack:18,93,99,107,117` | attack Detective's Phoenix+Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

3275 branch games (0 with an error, left out); 0 random and 0 Forge branches ended at the turn cap.

## Checks

76163 rows checked (ids against each seat's own frame log), 6552 frame logs through tools/check-redaction.mjs, 3275 forks checked (0 not the position), 13 no-leak checks (0 moved; the negative control moved in 13). The guardrails read back from 6550 random seats' logs: a land offered at 18200 of 151418 priority decisions and taken at 18200; 0 of 0 opening hands kept; G3 left out a repeated no-op 1721 time(s); G5 (D458): the engine refused 213 pick(s) it could not pay for, and 207 later offer(s) of them in the same priority window were left out; G6 (D471): 1860 pick(s) of the seats' own X plays had X drawn from 1 up, 12783 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

