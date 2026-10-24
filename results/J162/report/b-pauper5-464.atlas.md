# Move atlas: pauper-900000005-A vs pauper-900000005-B, seed 464

D451. Seat A is pauper-900000005-A. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 25 turns, won by A, and listed 32 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 3 | p | 2 | 1 `cast:29`, 2.0 [0.0, 11.5] (n 200) | 0 `pass`, 0.0 [0.0, 7.6] (n 40) | -1.00 [-1.00, 1.00] | no |
| d2 | 5 | p | 3 | 1 `cast:13`, 7.0 [0.0, 16.0] (n 200) | 1 `cast:13`, 5.0 [0.0, 17.5] (n 40) | 0.50 [-1.00, 1.00] | yes |
| d4 | 7 | p | 2 | 0 `cast:3`, 0.0 [0.0, 4.0] (n 200) | 0 `cast:3`, 0.0 [0.0, 7.5] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d6 | 9 | p | 2 | 0 `cast:13`, 0.0 [0.0, 6.5] (n 200) | 1 `pass`, 5.0 [0.0, 22.5] (n 40) | -1.00 [-1.00, 1.00] | no |
| d8 | 11 | a | 2 | 0 `attack:13`, 0.0 [0.0, 1.5] (n 200) | 0 `attack:13`, 0.0 [0.0, 5.0] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d10 | 13 | a | 4 | 2 `attack:13`, 13.5 [8.0, 21.0] (n 200) | 0 `attack:none`, 0.0 [0.0, 0.0] (n 40) | -0.50 [-1.00, -0.20] | no |
| d12 | 15 | p | 7 | 4 `cast:24`, 21.0 [13.5, 28.5] (n 200) | 0 `cast:17`, 0.0 [0.0, 5.0] (n 40) | 0.13 [-0.61, 0.60] | no |
| d14 | 15 | p | 2 | 0 `cast:3`, 0.0 [0.0, 0.0] (n 200) | 0 `cast:3`, 0.0 [0.0, 0.0] (n 40) | 1.00 [1.00, 1.00] | yes |
| d17 | 17 | p | 5 | 0 `cast:24`, 0.0 [0.0, 4.5] (n 200) | 2 `cast:40`, 2.5 [0.0, 12.5] (n 40) | 0.36 [-0.15, 0.95] | no |
| d19 | 19 | p | 4 | 0 `cast:19`, 0.0 [0.0, 6.0] (n 200) | 3 `cast:1`, 2.5 [0.0, 17.5] (n 40) | 0.00 [-0.83, 0.95] | no |
| d21 | 19 | a | 3 | 0 `attack:21`, 0.0 [0.0, 4.5] (n 200) | 0 `attack:21`, 0.0 [0.0, 5.0] (n 40) | 0.50 [-0.50, 0.87] | yes |
| d23 | 19 | p | 2 | 1 `pass`, 3.5 [0.0, 11.0] (n 200) | 0 `cast:1`, 0.0 [0.0, 5.0] (n 40) | -1.00 [-1.00, 1.00] | no |
| d25 | 21 | a | 7 | 6 `attack:19,21,40`, 2.0 [0.0, 9.5] (n 200) | 0 `attack:19,21`, 0.0 [0.0, 7.5] (n 40) | -0.22 [-0.67, 0.18] | no |
| d27 | 21 | p | 3 | 2 `cast:14`, 1.0 [0.0, 7.5] (n 200) | 1 `pass`, 5.0 [0.0, 12.5] (n 40) | -0.87 [-1.00, 0.50] | no |
| d29 | 23 | a | 6 | 2 `attack:13,19,21,40`, 16.0 [10.5, 21.5] (n 200) | 4 `attack:19,21`, 2.5 [0.0, 20.0] (n 40) | -0.83 [-0.99, -0.26] | no |
| d31 | 25 | a | 6 | 2 `attack:13,19,40,170`, 2.0 [0.0, 5.5] (n 200) | 0 `attack:19`, 0.0 [0.0, 10.0] (n 40) | -0.69 [-0.81, 0.40] | no |

### What the two maps agree and disagree about

Over 16 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is -0.10 [-0.45, 0.26]; at 1 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 2 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 5 of 16 decision(s) (31.3% [14.2, 55.6]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d0 (turn 3, p): rank correlation -1.00 [-1.00, 1.00]; random's best `cast:29`, Forge's best `pass`.
- d6 (turn 9, p): rank correlation -1.00 [-1.00, 1.00]; random's best `cast:13`, Forge's best `pass`.
- d23 (turn 19, p): rank correlation -1.00 [-1.00, 1.00]; random's best `pass`, Forge's best `cast:1`.
- d27 (turn 21, p): rank correlation -0.87 [-1.00, 0.50]; random's best `cast:14`, Forge's best `pass`.
- d29 (turn 23, a): rank correlation -0.83 [-0.99, -0.26]; random's best `attack:13,19,21,40`, Forge's best `attack:19,21`.

### Each decision's options, side by side

**d0** (turn 3, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 40.5 [33.9, 47.4] (n 200) | 70.0 [54.6, 81.9] (n 40) |
| 1 | `cast:29` | Mind Stone | 42.5 [35.9, 49.4] (n 200) | 67.5 [52.0, 79.9] (n 40) |

**d2** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 38.5 [32.0, 45.4] (n 200) | 72.5 [57.2, 83.9] (n 40) |
| 1 | `cast:13` | Archaeomancer | 45.5 [38.8, 52.4] (n 200) | 77.5 [62.5, 87.7] (n 40) |
| 2 | `cast:39` | Man-o'-War | 40.5 [33.9, 47.4] (n 200) | 70.0 [54.6, 81.9] (n 40) |

**d4** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:3` | Deep Analysis | 37.0 [30.6, 43.9] (n 200) | 75.0 [59.8, 85.8] (n 40) |
| 1 | `pass` | pass | 32.5 [26.4, 39.3] (n 200) | 67.5 [52.0, 79.9] (n 40) |

**d6** (turn 9, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:13` | Archaeomancer | 32.0 [25.9, 38.8] (n 200) | 67.5 [52.0, 79.9] (n 40) |
| 1 | `pass` | pass | 29.5 [23.6, 36.2] (n 200) | 72.5 [57.2, 83.9] (n 40) |

**d8** (turn 11, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:13` | attack Archaeomancer | 35.0 [28.7, 41.8] (n 200) | 65.0 [49.5, 77.9] (n 40) |
| 1 | `attack:none` | attack none | 30.0 [24.1, 36.7] (n 200) | 57.5 [42.2, 71.5] (n 40) |

**d10** (turn 13, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 14.5 [10.3, 20.1] (n 200) | 55.0 [39.8, 69.3] (n 40) |
| 1 | `attack:13,39` | attack Archaeomancer+Man-o'-War | 24.5 [19.1, 30.9] (n 200) | 25.0 [14.2, 40.2] (n 40) |
| 2 | `attack:13` | attack Archaeomancer | 28.0 [22.2, 34.6] (n 200) | 32.5 [20.1, 48.0] (n 40) |
| 3 | `attack:39` | attack Man-o'-War | 24.5 [19.1, 30.9] (n 200) | 32.5 [20.1, 48.0] (n 40) |

**d12** (turn 15, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:17` | Snuff Out | 16.0 [11.6, 21.7] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 1 | `pass` | pass | 14.0 [9.9, 19.5] (n 200) | 82.5 [68.0, 91.3] (n 40) |
| 2 | `cast:17` | Snuff Out | 10.5 [7.0, 15.5] (n 200) | 82.5 [68.0, 91.3] (n 40) |
| 3 | `cast:40` | Crypt Rats | 15.5 [11.1, 21.2] (n 200) | 77.5 [62.5, 87.7] (n 40) |
| 4 | `cast:24` | Generous Ent | 37.0 [30.6, 43.9] (n 200) | 80.0 [65.2, 89.5] (n 40) |
| 5 | `cast:21` | Gurmag Angler | 28.5 [22.7, 35.1] (n 200) | 85.0 [70.9, 92.9] (n 40) |
| 6 | `cast:1` | Night's Whisper | 18.0 [13.3, 23.9] (n 200) | 87.5 [73.9, 94.5] (n 40) |

**d14** (turn 15, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:3` | Deep Analysis | 29.0 [23.2, 35.6] (n 200) | 85.0 [70.9, 92.9] (n 40) |
| 1 | `pass` | pass | 19.0 [14.2, 25.0] (n 200) | 70.0 [54.6, 81.9] (n 40) |

**d17** (turn 17, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:24` | Generous Ent | 40.5 [33.9, 47.4] (n 200) | 85.0 [70.9, 92.9] (n 40) |
| 1 | `pass` | pass | 19.0 [14.2, 25.0] (n 200) | 70.0 [54.6, 81.9] (n 40) |
| 2 | `cast:40` | Crypt Rats | 21.5 [16.4, 27.7] (n 200) | 87.5 [73.9, 94.5] (n 40) |
| 3 | `cast:21` | Gurmag Angler | 37.0 [30.6, 43.9] (n 200) | 85.0 [70.9, 92.9] (n 40) |
| 4 | `cast:1` | Night's Whisper | 22.5 [17.3, 28.8] (n 200) | 72.5 [57.2, 83.9] (n 40) |

**d19** (turn 19, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:19` | Mist Raven | 38.5 [32.0, 45.4] (n 200) | 57.5 [42.2, 71.5] (n 40) |
| 1 | `pass` | pass | 36.0 [29.7, 42.9] (n 200) | 57.5 [42.2, 71.5] (n 40) |
| 2 | `cast:40` | Crypt Rats | 30.0 [24.1, 36.7] (n 200) | 50.0 [35.2, 64.8] (n 40) |
| 3 | `cast:1` | Night's Whisper | 30.0 [24.1, 36.7] (n 200) | 60.0 [44.6, 73.7] (n 40) |

**d21** (turn 19, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:21` | attack Gurmag Angler | 50.0 [43.1, 56.9] (n 200) | 62.5 [47.0, 75.8] (n 40) |
| 1 | `attack:none` | attack none | 35.0 [28.7, 41.8] (n 200) | 55.0 [39.8, 69.3] (n 40) |
| 2 | `attack:13,21` | attack Gurmag Angler+Archaeomancer | 45.5 [38.8, 52.4] (n 200) | 42.5 [28.5, 57.8] (n 40) |

**d23** (turn 19, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Night's Whisper | 48.0 [41.2, 54.9] (n 200) | 57.5 [42.2, 71.5] (n 40) |
| 1 | `pass` | pass | 51.5 [44.6, 58.3] (n 200) | 50.0 [35.2, 64.8] (n 40) |

**d25** (turn 21, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:19,21` | attack Mist Raven+Gurmag Angler | 58.5 [51.6, 65.1] (n 200) | 95.0 [83.5, 98.6] (n 40) |
| 1 | `attack:none` | attack none | 49.0 [42.2, 55.9] (n 200) | 87.5 [73.9, 94.5] (n 40) |
| 2 | `attack:13,19,21,40` | attack Mist Raven+Gurmag Angler+Archaeomancer+Crypt Rats | 59.5 [52.6, 66.1] (n 200) | 47.5 [32.9, 62.5] (n 40) |
| 3 | `attack:21` | attack Gurmag Angler | 46.0 [39.2, 52.9] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 4 | `attack:19` | attack Mist Raven | 54.5 [47.6, 61.3] (n 200) | 82.5 [68.0, 91.3] (n 40) |
| 5 | `attack:13,19,21` | attack Mist Raven+Gurmag Angler+Archaeomancer | 60.0 [53.1, 66.5] (n 200) | 95.0 [83.5, 98.6] (n 40) |
| 6 | `attack:19,21,40` | attack Mist Raven+Gurmag Angler+Crypt Rats | 60.5 [53.6, 67.0] (n 200) | 75.0 [59.8, 85.8] (n 40) |

**d27** (turn 21, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:28` | Thorn of the Black Rose | 84.0 [78.3, 88.4] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 1 | `pass` | pass | 78.5 [72.3, 83.6] (n 200) | 97.5 [87.1, 99.6] (n 40) |
| 2 | `cast:14` | Flayer Husk | 85.0 [79.4, 89.3] (n 200) | 92.5 [80.1, 97.4] (n 40) |

**d29** (turn 23, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:21` | attack Gurmag Angler | 53.5 [46.6, 60.3] (n 200) | 55.0 [39.8, 69.3] (n 40) |
| 1 | `attack:none` | attack none | 57.0 [50.1, 63.7] (n 200) | 52.5 [37.5, 67.1] (n 40) |
| 2 | `attack:13,19,21,40` | attack Gurmag Angler+Archaeomancer+Mist Raven+Crypt Rats | 69.5 [62.8, 75.5] (n 200) | 7.5 [2.6, 19.9] (n 40) |
| 3 | `attack:13,21` | attack Gurmag Angler+Archaeomancer | 60.5 [53.6, 67.0] (n 200) | 35.0 [22.1, 50.5] (n 40) |
| 4 | `attack:19,21` | attack Gurmag Angler+Mist Raven | 58.5 [51.6, 65.1] (n 200) | 57.5 [42.2, 71.5] (n 40) |
| 5 | `attack:21,40` | attack Gurmag Angler+Crypt Rats | 61.0 [54.1, 67.5] (n 200) | 25.0 [14.2, 40.2] (n 40) |

**d31** (turn 25, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:19` | attack Mist Raven | 74.0 [67.5, 79.6] (n 200) | 95.0 [83.5, 98.6] (n 40) |
| 1 | `attack:none` | attack none | 67.5 [60.7, 73.6] (n 200) | 95.0 [83.5, 98.6] (n 40) |
| 2 | `attack:13,19,40,170` | attack Mist Raven+Archaeomancer+Crypt Rats+Phyrexian Germ Token | 76.0 [69.6, 81.4] (n 200) | 70.0 [54.6, 81.9] (n 40) |
| 3 | `attack:13,19` | attack Mist Raven+Archaeomancer | 76.0 [69.6, 81.4] (n 200) | 92.5 [80.1, 97.4] (n 40) |
| 4 | `attack:19,40` | attack Mist Raven+Crypt Rats | 74.5 [68.0, 80.0] (n 200) | 75.0 [59.8, 85.8] (n 40) |
| 5 | `attack:19,170` | attack Mist Raven+Phyrexian Germ Token | 76.0 [69.6, 81.4] (n 200) | 92.5 [80.1, 97.4] (n 40) |

14400 branch games (0 with an error, left out); 64 random and 7 Forge branches ended at the turn cap.

## Checks

462806 rows checked (ids against each seat's own frame log), 28802 frame logs through tools/check-redaction.mjs, 14400 forks checked (0 not the position), 32 no-leak checks (0 moved; the negative control moved in 32). The guardrails read back from 24000 random seats' logs: a land offered at 104363 of 1526331 priority decisions and taken at 104363; 0 of 0 opening hands kept; G3 left out a repeated no-op 312 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 14086 pick(s) of the seats' own X plays had X drawn from 1 up, 116104 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

