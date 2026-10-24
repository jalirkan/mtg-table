# Move atlas: modern-era-900000007-A vs modern-era-900000007-B, seed 466

D451. Seat A is modern-era-900000007-A. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 13 turns, won by A, and listed 19 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 3 | p | 3 | 0 `cast:18`, 0.0 [0.0, 4.7] (n 191) | 1 `pass`, 12.5 [0.0, 30.0] (n 40) | -1.00 [-1.00, 0.87] | no |
| d1 | 5 | p | 4 | 3 `cast:1`, 4.6 [0.0, 11.3] (n 195) | 3 `cast:1`, 10.0 [2.5, 20.0] (n 40) | 0.50 [-0.40, 1.00] | yes |
| d2 | 5 | p | 4 | 3 `cast:1`, 2.1 [0.0, 8.2] (n 195) | 3 `cast:1`, 2.5 [0.0, 15.0] (n 40) | 0.80 [-0.40, 1.00] | yes |
| d4 | 7 | p | 3 | 2 `cast:1`, 5.6 [1.5, 11.2] (n 197) | 2 `cast:1`, 5.0 [0.0, 15.0] (n 40) | 1.00 [-0.87, 1.00] | yes |
| d5 | 7 | a | 2 | 1 `attack:none`, 1.5 [0.0, 6.0] (n 199) | 0 `attack:40`, 0.0 [0.0, 7.5] (n 40) | - [-1.00, 1.00] | no |
| d6 | 7 | p | 3 | 0 `cast:1`, 0.0 [0.0, 4.6] (n 195) | 0 `cast:1`, 0.0 [0.0, 0.0] (n 40) | 1.00 [-0.50, 1.00] | yes |
| d7 | 7 | p | 4 | 0 `activate:1#1`, 0.0 [0.0, 3.1] (n 193) | 0 `activate:1#1`, 0.0 [0.0, 7.5] (n 40) | 0.95 [-0.01, 1.00] | yes |
| d8 | 7 | p | 2 | 0 `cast:11`, 0.0 [0.0, 4.5] (n 199) | 1 `pass`, 5.0 [0.0, 12.5] (n 40) | - [-1.00, 1.00] | no |
| d10 | 9 | p | 3 | 1 `cast:4`, 2.5 [0.0, 6.1] (n 197) | 0 `pass`, 0.0 [0.0, 0.0] (n 40) | 0.87 [0.00, 1.00] | no |
| d11 | 9 | a | 5 | 4 `attack:146`, 0.5 [0.0, 3.6] (n 196) | 4 `attack:146`, 5.0 [0.0, 12.5] (n 40) | 0.71 [-0.40, 0.89] | yes |
| d12 | 9 | p | 3 | 0 `cast:4`, 0.0 [0.0, 2.5] (n 199) | 0 `cast:4`, 0.0 [0.0, 0.0] (n 40) | 0.50 [-0.87, 1.00] | yes |
| d13 | 11 | p | 2 | 1 `cast:9`, 28.4 [19.3, 36.5] (n 197) | 1 `cast:9`, 25.0 [12.5, 40.0] (n 40) | 1.00 [1.00, 1.00] | yes |
| d14 | 11 | a | 6 | 0 `attack:11`, 0.0 [0.0, 3.6] (n 196) | 0 `attack:11`, 0.0 [0.0, 7.5] (n 40) | 0.81 [0.03, 0.99] | yes |
| d16 | 13 | p | 3 | 0 `cast:37`, 0.0 [0.0, 0.0] (n 197) | 0 `cast:37`, 0.0 [0.0, 0.0] (n 40) | 0.87 [0.87, 0.87] | yes |
| d17 | 13 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 200) | 0 `pass`, 0.0 [0.0, 0.0] (n 40) | - | yes |
| d18 | 13 | a | 7 | 0 `attack:11,37,40,146,150`, 0.0 [0.0, 0.0] (n 199) | 0 `attack:11,37,40,146,150`, 0.0 [0.0, 0.0] (n 40) | - | yes |

### What the two maps agree and disagree about

Over 16 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.67 [0.33, 0.89]; at 3 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 12 of 16 decision(s) (75.0% [50.5, 89.8]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d0 (turn 3, p): rank correlation -1.00 [-1.00, 0.87]; random's best `cast:18`, Forge's best `pass`.
- d1 (turn 5, p): rank correlation 0.50 [-0.40, 1.00]; random's best `cast:1`, Forge's best `cast:1`.
- d12 (turn 9, p): rank correlation 0.50 [-0.87, 1.00]; random's best `cast:4`, Forge's best `cast:4`.
- d11 (turn 9, a): rank correlation 0.71 [-0.40, 0.89]; random's best `attack:146`, Forge's best `attack:146`.
- d2 (turn 5, p): rank correlation 0.80 [-0.40, 1.00]; random's best `cast:1`, Forge's best `cast:1`.

### Each decision's options, side by side

**d0** (turn 3, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:18` | Rampant Growth | 79.6 [73.3, 84.7] (n 191) | 70.0 [54.6, 81.9] (n 40) |
| 1 | `pass` | pass | 74.4 [67.7, 80.0] (n 191) | 82.5 [68.0, 91.3] (n 40) |
| 2 | `cast:11` | Ledger Shredder | 76.4 [69.9, 81.9] (n 191) | 75.0 [59.8, 85.8] (n 40) |

**d1** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 84.1 [78.3, 88.6] (n 195) | 90.0 [77.0, 96.0] (n 40) |
| 1 | `cast:40` | Oracle of Mul Daya | 83.1 [77.2, 87.7] (n 195) | 92.5 [80.1, 97.4] (n 40) |
| 2 | `cast:11` | Ledger Shredder | 83.1 [77.2, 87.7] (n 195) | 90.0 [77.0, 96.0] (n 40) |
| 3 | `cast:1` | Garruk Wildspeaker | 88.7 [83.5, 92.4] (n 195) | 100.0 [91.2, 100.0] (n 40) |

**d2** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:40` | Oracle of Mul Daya | 84.6 [78.9, 89.0] (n 195) | 85.0 [70.9, 92.9] (n 40) |
| 1 | `pass` | pass | 81.0 [74.9, 85.9] (n 195) | 60.0 [44.6, 73.7] (n 40) |
| 2 | `cast:11` | Ledger Shredder | 80.5 [74.4, 85.5] (n 195) | 80.0 [65.2, 89.5] (n 40) |
| 3 | `cast:1` | Garruk Wildspeaker | 86.7 [81.2, 90.7] (n 195) | 87.5 [73.9, 94.5] (n 40) |

**d4** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 84.8 [79.1, 89.1] (n 197) | 77.5 [62.5, 87.7] (n 40) |
| 1 | `cast:11` | Ledger Shredder | 89.8 [84.8, 93.3] (n 197) | 80.0 [65.2, 89.5] (n 40) |
| 2 | `cast:1` | Garruk Wildspeaker | 90.4 [85.4, 93.7] (n 197) | 82.5 [68.0, 91.3] (n 40) |

**d5** (turn 7, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:40` | attack Oracle of Mul Daya | 87.4 [82.1, 91.3] (n 199) | 77.5 [62.5, 87.7] (n 40) |
| 1 | `attack:none` | attack none | 88.9 [83.8, 92.6] (n 199) | 77.5 [62.5, 87.7] (n 40) |

**d6** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Garruk Wildspeaker | 90.3 [85.3, 93.7] (n 195) | 97.5 [87.1, 99.6] (n 40) |
| 1 | `pass` | pass | 86.2 [80.6, 90.3] (n 195) | 72.5 [57.2, 83.9] (n 40) |
| 2 | `cast:11` | Ledger Shredder | 89.2 [84.1, 92.8] (n 195) | 95.0 [83.5, 98.6] (n 40) |

**d7** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:1#1` | Garruk Wildspeaker: -1: Create a 3/3 green Beast creature to | 94.3 [90.1, 96.8] (n 193) | 87.5 [73.9, 94.5] (n 40) |
| 1 | `pass` | pass | 86.0 [80.4, 90.2] (n 193) | 82.5 [68.0, 91.3] (n 40) |
| 2 | `cast:11` | Ledger Shredder | 92.8 [88.2, 95.6] (n 193) | 87.5 [73.9, 94.5] (n 40) |
| 3 | `activate:1#0` | Garruk Wildspeaker: +1: Untap two target lands. | 81.3 [75.3, 86.2] (n 193) | 72.5 [57.2, 83.9] (n 40) |

**d8** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:11` | Ledger Shredder | 92.0 [87.3, 95.0] (n 199) | 87.5 [73.9, 94.5] (n 40) |
| 1 | `pass` | pass | 92.0 [87.3, 95.0] (n 199) | 92.5 [80.1, 97.4] (n 40) |

**d10** (turn 9, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 94.9 [90.9, 97.2] (n 197) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `cast:4` | Mulldrifter | 97.5 [94.2, 98.9] (n 197) | 100.0 [91.2, 100.0] (n 40) |
| 2 | `cast:4` | Mulldrifter | 92.9 [88.4, 95.7] (n 197) | 97.5 [87.1, 99.6] (n 40) |

**d11** (turn 9, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:11,146` | attack Beast Token+Ledger Shredder | 97.5 [94.2, 98.9] (n 196) | 95.0 [83.5, 98.6] (n 40) |
| 1 | `attack:none` | attack none | 95.9 [92.2, 97.9] (n 196) | 95.0 [83.5, 98.6] (n 40) |
| 2 | `attack:11,40,146` | attack Beast Token+Ledger Shredder+Oracle of Mul Daya | 93.9 [89.6, 96.5] (n 196) | 95.0 [83.5, 98.6] (n 40) |
| 3 | `attack:11` | attack Ledger Shredder | 94.4 [90.2, 96.8] (n 196) | 95.0 [83.5, 98.6] (n 40) |
| 4 | `attack:146` | attack Beast Token | 98.0 [94.9, 99.2] (n 196) | 100.0 [91.2, 100.0] (n 40) |

**d12** (turn 9, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:4` | Mulldrifter | 97.5 [94.3, 98.9] (n 199) | 95.0 [83.5, 98.6] (n 40) |
| 1 | `pass` | pass | 96.5 [92.9, 98.3] (n 199) | 90.0 [77.0, 96.0] (n 40) |
| 2 | `cast:4` | Mulldrifter | 94.5 [90.4, 96.9] (n 199) | 92.5 [80.1, 97.4] (n 40) |

**d13** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 56.4 [49.4, 63.1] (n 197) | 60.0 [44.6, 73.7] (n 40) |
| 1 | `cast:9` | Beast Within | 84.8 [79.1, 89.1] (n 197) | 85.0 [70.9, 92.9] (n 40) |

**d14** (turn 11, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:11` | attack Ledger Shredder | 62.2 [55.3, 68.7] (n 196) | 62.5 [47.0, 75.8] (n 40) |
| 1 | `attack:none` | attack none | 57.1 [50.1, 63.9] (n 196) | 52.5 [37.5, 67.1] (n 40) |
| 2 | `attack:11,40,146,150` | attack Ledger Shredder+Oracle of Mul Daya+Beast Token+Beast Token | 54.1 [47.1, 60.9] (n 196) | 15.0 [7.1, 29.1] (n 40) |
| 3 | `attack:11,40` | attack Ledger Shredder+Oracle of Mul Daya | 54.6 [47.6, 61.4] (n 196) | 42.5 [28.5, 57.8] (n 40) |
| 4 | `attack:11,146` | attack Ledger Shredder+Beast Token | 50.0 [43.1, 56.9] (n 196) | 20.0 [10.5, 34.8] (n 40) |
| 5 | `attack:11,150` | attack Ledger Shredder+Beast Token | 52.0 [45.1, 58.9] (n 196) | 20.0 [10.5, 34.8] (n 40) |

**d16** (turn 13, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:37` | Craterhoof Behemoth | 94.4 [90.3, 96.9] (n 197) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `pass` | pass | 69.0 [62.3, 75.1] (n 197) | 60.0 [44.6, 73.7] (n 40) |
| 2 | `cast:9` | Beast Within | 86.3 [80.8, 90.4] (n 197) | 100.0 [91.2, 100.0] (n 40) |

**d17** (turn 13, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [98.1, 100.0] (n 200) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `cast:9` | Beast Within | 100.0 [98.1, 100.0] (n 200) | 100.0 [91.2, 100.0] (n 40) |

**d18** (turn 13, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:11,37,40,146,150` | attack Beast Token+Craterhoof Behemoth+Beast Token+Oracle of Mul Daya+Ledger Shredder | 100.0 [98.1, 100.0] (n 199) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `attack:none` | attack none | 97.0 [93.6, 98.6] (n 199) | 100.0 [91.2, 100.0] (n 40) |
| 2 | `attack:11,37,40,150` | attack Craterhoof Behemoth+Beast Token+Oracle of Mul Daya+Ledger Shredder | 100.0 [98.1, 100.0] (n 199) | 100.0 [91.2, 100.0] (n 40) |
| 3 | `attack:11,40,146,150` | attack Beast Token+Beast Token+Oracle of Mul Daya+Ledger Shredder | 100.0 [98.1, 100.0] (n 199) | 100.0 [91.2, 100.0] (n 40) |
| 4 | `attack:11,37,40,146` | attack Beast Token+Craterhoof Behemoth+Oracle of Mul Daya+Ledger Shredder | 100.0 [98.1, 100.0] (n 199) | 100.0 [91.2, 100.0] (n 40) |
| 5 | `attack:11,37,146,150` | attack Beast Token+Craterhoof Behemoth+Beast Token+Ledger Shredder | 100.0 [98.1, 100.0] (n 199) | 100.0 [91.2, 100.0] (n 40) |
| 6 | `attack:37,40,146,150` | attack Beast Token+Craterhoof Behemoth+Beast Token+Oracle of Mul Daya | 100.0 [98.1, 100.0] (n 199) | 100.0 [91.2, 100.0] (n 40) |

13440 branch games (62 with an error, left out); 2 random and 2 Forge branches ended at the turn cap.

## Checks

453404 rows checked (ids against each seat's own frame log), 26882 frame logs through tools/check-redaction.mjs, 13440 forks checked (0 not the position), 32 no-leak checks (0 moved; the negative control moved in 32). The guardrails read back from 22400 random seats' logs: a land offered at 78239 of 1330908 priority decisions and taken at 78239; 0 of 0 opening hands kept; G3 left out a repeated no-op 12817 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 12160 pick(s) of the seats' own X plays had X drawn from 1 up, 147740 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games that errored

62 of 13440 branch game(s) errored and are left out of their option's value. By error text (ids as #):

| branch games | error |
|---|---|
| 46 | NullPointerException |
| 16 | NullPointerException: Cannot invoke "forge.game.phase.PhaseType.isMain()" because the return value of "forge.game.phase.PhaseHandler.getPhase()" is null |

No option had more than 10.0% of its branch games errored.

