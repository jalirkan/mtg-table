# Move atlas: powered-2820-00001 vs powered-2820-00002, seed 2920

D451. Seat A is powered-2820-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 13 turns, won by A, and listed 17 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d2 | 3 | p | 2 | 1 `cast:24`, 6.0 [0.0, 14.7] (n 150) | -, - (n 0) | - | - |
| d3 | 3 | a | 2 | 0 `attack:18`, 0.0 [0.0, 2.7] (n 150) | -, - (n 0) | - | - |
| d4 | 3 | p | 2 | 1 `pass`, 3.0 [0.0, 12.0] (n 150) | -, - (n 0) | - | - |
| d5 | 5 | p | 2 | 1 `cast:18`, 3.0 [0.0, 11.0] (n 150) | -, - (n 0) | - | - |
| d6 | 5 | p | 2 | 0 `cast:18`, 0.0 [0.0, 8.0] (n 50) | -, - (n 0) | - | - |
| d7 | 7 | p | 3 | 2 `cast:26`, 5.3 [0.0, 12.7] (n 150) | -, - (n 0) | - | - |
| d8 | 7 | a | 4 | 3 `attack:18`, 2.0 [0.0, 8.7] (n 150) | -, - (n 0) | - | - |
| d9 | 7 | p | 3 | 0 `cast:26`, 0.0 [0.0, 2.0] (n 150) | -, - (n 0) | - | - |
| d10 | 9 | p | 3 | 0 `pass`, 0.0 [0.0, 14.0] (n 50) | -, - (n 0) | - | - |
| d11 | 9 | a | 5 | 2 `attack:83,85`, 1.3 [0.0, 6.7] (n 150) | -, - (n 0) | - | - |
| d12 | 11 | p | 3 | 1 `cast:25`, 8.0 [0.0, 20.0] (n 25) | -, - (n 0) | - | - |
| d13 | 11 | a | 6 | 0 `attack:18,31,85,87`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d14 | 11 | p | 3 | 0 `cast:26`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d15 | 13 | p | 3 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d16 | 13 | a | 8 | 0 `attack:18,26,31,85,87,89`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

15 decision(s) branched, 8 of them in full (2 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 5: d12 (mean value 96.0%, replaced by d6), d13 (mean value 98.7%, replaced by d3), d14 (mean value 100.0%, replaced by d5), d15 (mean value 100.0%, replaced by d4), d16 (mean value 100.0%, replaced by d2). Early stopping at 50/100 random branches stopped 4 option(s): d9 o2 at 100, d11 o1 at 50, d11 o3 at 50, d11 o4 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 4. It stopped 2 (d10, d6), each a partial label at that n, never confident, saving at most 500 branch games; 2 it would have stopped played on to the full n as controls (d9, d4; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d2** (turn 3, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 73.3 [65.7, 79.8] (n 150) | - (n 0) |
| 1 | `cast:24` | Bitterblossom | 79.3 [72.2, 85.0] (n 150) | - (n 0) |

**d3** (turn 3, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:18` | attack Bloodsoaked Champion | 69.3 [61.6, 76.1] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 66.0 [58.1, 73.1] (n 150) | - (n 0) |

**d4** (turn 3, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:24` | Bitterblossom | 77.3 [70.0, 83.3] (n 150) | - (n 0) |
| 1 | `pass` | pass | 80.3 [73.3, 85.9] (n 150) | - (n 0) |

**d5** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 71.7 [64.0, 78.3] (n 150) | - (n 0) |
| 1 | `cast:18` | Bloodsoaked Champion | 74.7 [67.2, 81.0] (n 150) | - (n 0) |

**d6** (turn 5, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:18` | Bloodsoaked Champion | 80.0 [67.0, 88.8] (n 50) | - (n 0) |
| 1 | `pass` | pass | 74.0 [60.5, 84.1] (n 50) | - (n 0) |

**d7** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 81.3 [74.3, 86.8] (n 150) | - (n 0) |
| 1 | `cast:25` | Yawgmoth's Will | 84.7 [78.0, 89.6] (n 150) | - (n 0) |
| 2 | `cast:26` | Midnight Reaper | 86.7 [80.3, 91.2] (n 150) | - (n 0) |

**d8** (turn 7, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:18,83` | attack Bloodsoaked Champion+Faerie Rogue Token | 78.0 [70.7, 83.9] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 74.0 [66.4, 80.4] (n 150) | - (n 0) |
| 2 | `attack:83` | attack Faerie Rogue Token | 77.7 [70.4, 83.6] (n 150) | - (n 0) |
| 3 | `attack:18` | attack Bloodsoaked Champion | 80.0 [72.9, 85.6] (n 150) | - (n 0) |

**d9** (turn 7, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:26` | Midnight Reaper | 85.3 [78.8, 90.1] (n 150) | - (n 0) |
| 1 | `pass` | pass | 80.0 [72.9, 85.6] (n 150) | - (n 0) |
| 2 | `cast:25` | Yawgmoth's Will | 74.5 [65.2, 82.0] (n 100, stopped at 100) | - (n 0) |

**d10** (turn 9, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 86.0 [73.8, 93.0] (n 50) | - (n 0) |
| 1 | `cast:25` | Yawgmoth's Will | 82.0 [69.2, 90.2] (n 50) | - (n 0) |
| 2 | `cast:26` | Midnight Reaper | 86.0 [73.8, 93.0] (n 50) | - (n 0) |

**d11** (turn 9, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:18,83,85` | attack Bloodsoaked Champion+Faerie Rogue Token+Faerie Rogue Token | 91.3 [85.7, 94.9] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 78.0 [64.8, 87.3] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:83,85` | attack Faerie Rogue Token+Faerie Rogue Token | 92.7 [87.4, 95.9] (n 150) | - (n 0) |
| 3 | `attack:18,85` | attack Bloodsoaked Champion+Faerie Rogue Token | 78.0 [64.8, 87.3] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:18,83` | attack Bloodsoaked Champion+Faerie Rogue Token | 82.0 [69.2, 90.2] (n 50, stopped at 50) | - (n 0) |

**d12** (turn 11, p; option 0 is Forge's answer) -- settled by the screen (mean value 96.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 1 | `cast:25` | Yawgmoth's Will | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:26` | Midnight Reaper | 96.0 [80.5, 99.3] (n 25) | - (n 0) |

**d13** (turn 11, a; option 0 is Forge's answer) -- settled by the screen (mean value 98.7%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:18,31,85,87` | attack Bloodsoaked Champion+Faerie Rogue Token+Faerie Rogue Token+Elektra, Daughter of the Hand | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 92.0 [75.0, 97.8] (n 25) | - (n 0) |
| 2 | `attack:31,85,87` | attack Faerie Rogue Token+Faerie Rogue Token+Elektra, Daughter of the Hand | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:18,31,87` | attack Bloodsoaked Champion+Faerie Rogue Token+Elektra, Daughter of the Hand | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:18,31,85` | attack Bloodsoaked Champion+Faerie Rogue Token+Elektra, Daughter of the Hand | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:18,85,87` | attack Bloodsoaked Champion+Faerie Rogue Token+Faerie Rogue Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d14** (turn 11, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:26` | Midnight Reaper | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:25` | Yawgmoth's Will | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d15** (turn 13, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `cast:25` | Yawgmoth's Will | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:17` | Ophiomancer | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d16** (turn 13, a; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:18,26,31,85,87,89` | attack Bloodsoaked Champion+Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Midnight Reaper+Elektra, Daughter of the Hand | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:26,31,85,87,89` | attack Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Midnight Reaper+Elektra, Daughter of the Hand | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:18,26,31,87,89` | attack Bloodsoaked Champion+Faerie Rogue Token+Faerie Rogue Token+Midnight Reaper+Elektra, Daughter of the Hand | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:18,26,31,85,89` | attack Bloodsoaked Champion+Faerie Rogue Token+Faerie Rogue Token+Midnight Reaper+Elektra, Daughter of the Hand | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:18,26,31,85,87` | attack Bloodsoaked Champion+Faerie Rogue Token+Faerie Rogue Token+Midnight Reaper+Elektra, Daughter of the Hand | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:18,31,85,87,89` | attack Bloodsoaked Champion+Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Elektra, Daughter of the Hand | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `attack:18,26,85,87,89` | attack Bloodsoaked Champion+Faerie Rogue Token+Faerie Rogue Token+Faerie Rogue Token+Midnight Reaper | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

3925 branch games (0 with an error, left out); 0 random and 0 Forge branches ended at the turn cap.

## Checks

122571 rows checked (ids against each seat's own frame log), 7852 frame logs through tools/check-redaction.mjs, 3925 forks checked (0 not the position), 15 no-leak checks (0 moved; the negative control moved in 15). The guardrails read back from 7850 random seats' logs: a land offered at 30555 of 191459 priority decisions and taken at 30555; 0 of 0 opening hands kept; G3 left out a repeated no-op 1104 time(s); G5 (D458): the engine refused 1 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 2049 pick(s) of the seats' own X plays had X drawn from 1 up, 22308 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

