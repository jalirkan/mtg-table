# Move atlas: pauper-900000005-A vs pauper-900000005-B, seed 464

D451. Seat A is pauper-900000005-A. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 25 turns, won by A, and listed 32 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d17 | 17 | p | 5 | 0 `cast:24`, 0.0 [0.0, 9.0] (n 200) | 2 `cast:40`, 2.5 [0.0, 17.5] (n 40) | 0.67 [0.30, 0.97] | no |
| d19 | 19 | p | 4 | 1 `pass`, 1.3 [0.0, 8.5] (n 200) | 1 `pass`, 5.0 [0.0, 17.5] (n 40) | 0.63 [-0.80, 0.95] | yes |
| d21 | 19 | a | 3 | 2 `attack:13,21`, 1.0 [0.0, 9.0] (n 200) | 0 `attack:21`, 0.0 [0.0, 15.0] (n 40) | 0.50 [-0.50, 1.00] | no |
| d23 | 19 | p | 2 | 0 `cast:1`, 0.0 [0.0, 6.0] (n 200) | 0 `cast:1`, 0.0 [0.0, 7.5] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d25 | 21 | a | 7 | 5 `attack:13,19,21`, 6.5 [0.5, 14.5] (n 200) | 0 `attack:19,21`, 0.0 [0.0, 10.0] (n 40) | -0.25 [-0.73, 0.22] | no |
| d27 | 21 | p | 3 | 2 `cast:14`, 4.0 [0.0, 10.5] (n 200) | 1 `pass`, 5.0 [0.0, 12.5] (n 40) | -0.50 [-1.00, 0.87] | no |
| d29 | 23 | a | 6 | 2 `attack:13,19,21,40`, 15.0 [9.5, 21.0] (n 200) | 1 `attack:none`, 12.5 [0.0, 30.0] (n 40) | -0.77 [-0.96, -0.26] | no |
| d31 | 25 | a | 6 | 2 `attack:13,19,40,170`, 2.5 [0.0, 6.5] (n 200) | 0 `attack:19`, 0.0 [0.0, 5.0] (n 40) | -0.08 [-0.62, 0.49] | no |

### What the two maps agree and disagree about

Over 8 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.15 [-0.26, 0.53]; at 1 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 1 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 2 of 8 decision(s) (25.0% [7.1, 59.1]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d29 (turn 23, a): rank correlation -0.77 [-0.96, -0.26]; random's best `attack:13,19,21,40`, Forge's best `attack:none`.
- d27 (turn 21, p): rank correlation -0.50 [-1.00, 0.87]; random's best `cast:14`, Forge's best `pass`.
- d25 (turn 21, a): rank correlation -0.25 [-0.73, 0.22]; random's best `attack:13,19,21`, Forge's best `attack:19,21`.
- d31 (turn 25, a): rank correlation -0.08 [-0.62, 0.49]; random's best `attack:13,19,40,170`, Forge's best `attack:19`.
- d21 (turn 19, a): rank correlation 0.50 [-0.50, 1.00]; random's best `attack:13,21`, Forge's best `attack:21`.

### Each decision's options, side by side

**d17** (turn 17, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:24` | Generous Ent | 29.0 [23.2, 35.6] (n 200) | 82.5 [68.0, 91.3] (n 40) |
| 1 | `pass` | pass | 8.5 [5.4, 13.2] (n 200) | 47.5 [32.9, 62.5] (n 40) |
| 2 | `cast:40` | Crypt Rats | 15.5 [11.1, 21.2] (n 200) | 85.0 [70.9, 92.9] (n 40) |
| 3 | `cast:21` | Gurmag Angler | 29.0 [23.2, 35.6] (n 200) | 77.5 [62.5, 87.7] (n 40) |
| 4 | `cast:1` | Night's Whisper | 13.5 [9.4, 18.9] (n 200) | 65.0 [49.5, 77.9] (n 40) |

**d19** (turn 19, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:19` | Mist Raven | 26.0 [20.4, 32.5] (n 200) | 65.0 [49.5, 77.9] (n 40) |
| 1 | `pass` | pass | 27.3 [21.6, 33.8] (n 200) | 70.0 [54.6, 81.9] (n 40) |
| 2 | `cast:40` | Crypt Rats | 19.0 [14.2, 25.0] (n 200) | 65.0 [49.5, 77.9] (n 40) |
| 3 | `cast:1` | Night's Whisper | 22.0 [16.8, 28.2] (n 200) | 62.5 [47.0, 75.8] (n 40) |

**d21** (turn 19, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:21` | attack Gurmag Angler | 37.0 [30.6, 43.9] (n 200) | 65.0 [49.5, 77.9] (n 40) |
| 1 | `attack:none` | attack none | 22.5 [17.3, 28.8] (n 200) | 52.5 [37.5, 67.1] (n 40) |
| 2 | `attack:13,21` | attack Gurmag Angler+Archaeomancer | 38.0 [31.6, 44.9] (n 200) | 62.5 [47.0, 75.8] (n 40) |

**d23** (turn 19, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Night's Whisper | 55.0 [48.1, 61.7] (n 200) | 67.5 [52.0, 79.9] (n 40) |
| 1 | `pass` | pass | 53.0 [46.1, 59.8] (n 200) | 62.5 [47.0, 75.8] (n 40) |

**d25** (turn 21, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:19,21` | attack Mist Raven+Gurmag Angler | 53.0 [46.1, 59.8] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 1 | `attack:none` | attack none | 40.5 [33.9, 47.4] (n 200) | 82.5 [68.0, 91.3] (n 40) |
| 2 | `attack:13,19,21,40` | attack Mist Raven+Gurmag Angler+Archaeomancer+Crypt Rats | 58.0 [51.1, 64.6] (n 200) | 52.5 [37.5, 67.1] (n 40) |
| 3 | `attack:21` | attack Gurmag Angler | 45.5 [38.8, 52.4] (n 200) | 90.0 [77.0, 96.0] (n 40) |
| 4 | `attack:19` | attack Mist Raven | 46.0 [39.2, 52.9] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 5 | `attack:13,19,21` | attack Mist Raven+Gurmag Angler+Archaeomancer | 59.5 [52.6, 66.1] (n 200) | 90.0 [77.0, 96.0] (n 40) |
| 6 | `attack:19,21,40` | attack Mist Raven+Gurmag Angler+Crypt Rats | 54.5 [47.6, 61.3] (n 200) | 65.0 [49.5, 77.9] (n 40) |

**d27** (turn 21, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:28` | Thorn of the Black Rose | 80.0 [73.9, 85.0] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 1 | `pass` | pass | 78.5 [72.3, 83.6] (n 200) | 97.5 [87.1, 99.6] (n 40) |
| 2 | `cast:14` | Flayer Husk | 84.0 [78.3, 88.4] (n 200) | 95.0 [83.5, 98.6] (n 40) |

**d29** (turn 23, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:21` | attack Gurmag Angler | 55.0 [48.1, 61.7] (n 200) | 52.5 [37.5, 67.1] (n 40) |
| 1 | `attack:none` | attack none | 58.5 [51.6, 65.1] (n 200) | 65.0 [49.5, 77.9] (n 40) |
| 2 | `attack:13,19,21,40` | attack Gurmag Angler+Archaeomancer+Mist Raven+Crypt Rats | 70.0 [63.3, 75.9] (n 200) | 5.0 [1.4, 16.5] (n 40) |
| 3 | `attack:13,21` | attack Gurmag Angler+Archaeomancer | 65.5 [58.7, 71.7] (n 200) | 37.5 [24.2, 53.0] (n 40) |
| 4 | `attack:19,21` | attack Gurmag Angler+Mist Raven | 60.5 [53.6, 67.0] (n 200) | 55.0 [39.8, 69.3] (n 40) |
| 5 | `attack:21,40` | attack Gurmag Angler+Crypt Rats | 62.0 [55.1, 68.4] (n 200) | 32.5 [20.1, 48.0] (n 40) |

**d31** (turn 25, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:19` | attack Mist Raven | 67.5 [60.7, 73.6] (n 200) | 95.0 [83.5, 98.6] (n 40) |
| 1 | `attack:none` | attack none | 58.5 [51.6, 65.1] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 2 | `attack:13,19,40,170` | attack Mist Raven+Archaeomancer+Crypt Rats+Phyrexian Germ Token | 70.0 [63.3, 75.9] (n 200) | 72.5 [57.2, 83.9] (n 40) |
| 3 | `attack:13,19` | attack Mist Raven+Archaeomancer | 69.0 [62.3, 75.0] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 4 | `attack:19,40` | attack Mist Raven+Crypt Rats | 67.5 [60.7, 73.6] (n 200) | 70.0 [54.6, 81.9] (n 40) |
| 5 | `attack:19,170` | attack Mist Raven+Phyrexian Germ Token | 69.0 [62.3, 75.0] (n 200) | 95.0 [83.5, 98.6] (n 40) |

8640 branch games (0 with an error, left out); 0 random and 0 Forge branches ended at the turn cap.

## Checks

193478 rows checked (ids against each seat's own frame log), 17282 frame logs through tools/check-redaction.mjs, 8640 forks checked (0 not the position), 16 no-leak checks (0 moved; the negative control moved in 16). The guardrails read back from 14400 random seats' logs: a land offered at 40393 of 632792 priority decisions and taken at 40393; 0 of 0 opening hands kept; G3 left out a repeated no-op 0 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 9002 pick(s) of the seats' own X plays had X drawn from 1 up, 50126 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

