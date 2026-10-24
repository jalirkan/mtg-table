# Move atlas: synergy-900000009-A vs synergy-900000009-B, seed 465

D451. Seat A is synergy-900000009-A. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 23 turns, won by B, and listed 43 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 2 | p | 2 | 1 `cast:5`, 2.0 [0.0, 8.5] (n 200) | 1 `cast:5`, 2.5 [0.0, 22.5] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d3 | 4 | p | 2 | 0 `pass`, 0.0 [0.0, 6.5] (n 200) | 0 `pass`, 0.0 [0.0, 7.5] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d6 | 6 | p | 2 | 1 `cast:5`, 4.0 [0.0, 11.0] (n 200) | 0 `pass`, 0.0 [0.0, 15.0] (n 40) | -1.00 [-1.00, 1.00] | no |
| d8 | 8 | p | 5 | 3 `cast:15`, 9.0 [1.0, 16.5] (n 200) | 3 `cast:15`, 7.5 [0.0, 25.0] (n 40) | 0.67 [-0.41, 0.90] | yes |
| d11 | 8 | p | 2 | 1 `cast:5`, 3.0 [0.0, 10.0] (n 200) | 0 `pass`, 0.0 [0.0, 7.6] (n 40) | -1.00 [-1.00, 1.00] | no |
| d14 | 10 | a | 2 | 1 `attack:none`, 2.5 [0.0, 7.5] (n 200) | 0 `attack:20`, 0.0 [0.0, 15.0] (n 40) | -1.00 [-1.00, 1.00] | no |
| d17 | 12 | a | 6 | 0 `attack:none`, 0.0 [0.0, 4.0] (n 200) | 0 `attack:none`, 0.0 [0.0, 10.0] (n 40) | 1.00 [0.09, 1.00] | yes |
| d20 | 14 | a | 3 | 2 `attack:15,151`, 1.5 [0.0, 5.0] (n 200) | 1 `attack:none`, 12.5 [0.0, 32.6] (n 40) | -0.50 [-1.00, 1.00] | no |
| d22 | 14 | p | 2 | 1 `pass`, 4.5 [0.0, 11.0] (n 200) | 0 `cast:3`, 0.0 [0.0, 15.0] (n 40) | - [-1.00, 1.00] | no |
| d25 | 16 | p | 3 | 2 `cast:2`, 0.5 [0.0, 4.5] (n 200) | 2 `cast:2`, 17.5 [5.0, 32.5] (n 40) | 0.50 [-0.50, 1.00] | yes |
| d28 | 17 | b | 2 | 0 `block:39>155`, 0.0 [0.0, 0.0] (n 200) | 0 `block:39>155`, 0.0 [0.0, 0.0] (n 40) | 1.00 [1.00, 1.00] | yes |
| d31 | 18 | p | 4 | 3 `cast:2`, 1.5 [0.0, 4.0] (n 200) | 3 `cast:2`, 17.5 [7.5, 30.0] (n 40) | 0.82 [0.27, 1.00] | yes |
| d34 | 20 | p | 4 | 3 `cast:21`, 1.0 [0.0, 3.0] (n 200) | 0 `pass`, 0.0 [0.0, 10.0] (n 40) | 0.82 [-0.33, 1.00] | no |
| d36 | 20 | p | 4 | 1 `pass`, 1.0 [0.0, 2.5] (n 200) | 3 `cast:2`, 2.5 [0.0, 7.5] (n 40) | 0.00 [-0.58, 1.00] | no |
| d39 | 22 | p | 4 | 0 `pass`, 0.0 [0.0, 0.0] (n 200) | 0 `pass`, 0.0 [0.0, 0.0] (n 40) | - | yes |
| d42 | 23 | b | 7 | 0 `block:262>83,18>97,263>106,239>155,240>161`, 0.0 [0.0, 0.0] (n 200) | 0 `block:262>83,18>97,263>106,239>155,240>161`, 0.0 [0.0, 0.0] (n 40) | - | yes |

### What the two maps agree and disagree about

Over 16 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.25 [-0.17, 0.69]; at 3 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 9 of 16 decision(s) (56.3% [33.2, 76.9]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d6 (turn 6, p): rank correlation -1.00 [-1.00, 1.00]; random's best `cast:5`, Forge's best `pass`.
- d11 (turn 8, p): rank correlation -1.00 [-1.00, 1.00]; random's best `cast:5`, Forge's best `pass`.
- d14 (turn 10, a): rank correlation -1.00 [-1.00, 1.00]; random's best `attack:none`, Forge's best `attack:20`.
- d20 (turn 14, a): rank correlation -0.50 [-1.00, 1.00]; random's best `attack:15,151`, Forge's best `attack:none`.
- d36 (turn 20, p): rank correlation 0.00 [-0.58, 1.00]; random's best `pass`, Forge's best `cast:2`.

### Each decision's options, side by side

**d0** (turn 2, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 20.0 [15.0, 26.1] (n 200) | 47.5 [32.9, 62.5] (n 40) |
| 1 | `cast:5` | Mishra's Bauble | 22.0 [16.8, 28.2] (n 200) | 50.0 [35.2, 64.8] (n 40) |

**d3** (turn 4, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 25.5 [20.0, 32.0] (n 200) | 55.0 [39.8, 69.3] (n 40) |
| 1 | `cast:5` | Mishra's Bauble | 24.5 [19.1, 30.9] (n 200) | 45.0 [30.7, 60.2] (n 40) |

**d6** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 18.0 [13.3, 23.9] (n 200) | 40.0 [26.4, 55.4] (n 40) |
| 1 | `cast:5` | Mishra's Bauble | 22.0 [16.8, 28.2] (n 200) | 37.5 [24.2, 53.0] (n 40) |

**d8** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 18.5 [13.7, 24.5] (n 200) | 60.0 [44.6, 73.7] (n 40) |
| 1 | `cast:16` | Go for the Throat | 17.5 [12.9, 23.4] (n 200) | 60.0 [44.6, 73.7] (n 40) |
| 2 | `cast:5` | Mishra's Bauble | 17.0 [12.4, 22.8] (n 200) | 50.0 [35.2, 64.8] (n 40) |
| 3 | `cast:15` | Seasoned Pyromancer | 27.5 [21.8, 34.1] (n 200) | 67.5 [52.0, 79.9] (n 40) |
| 4 | `cast:38` | Smuggler's Copter | 6.5 [3.8, 10.8] (n 200) | 60.0 [44.6, 73.7] (n 40) |

**d11** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 15.0 [10.7, 20.6] (n 200) | 62.5 [47.0, 75.8] (n 40) |
| 1 | `cast:5` | Mishra's Bauble | 18.0 [13.3, 23.9] (n 200) | 52.5 [37.5, 67.1] (n 40) |

**d14** (turn 10, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:20` | attack Grim Haruspex | 10.5 [7.0, 15.5] (n 200) | 62.5 [47.0, 75.8] (n 40) |
| 1 | `attack:none` | attack none | 13.0 [9.0, 18.4] (n 200) | 60.0 [44.6, 73.7] (n 40) |

**d17** (turn 12, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 13.0 [9.0, 18.4] (n 200) | 40.0 [26.4, 55.4] (n 40) |
| 1 | `attack:15,20,150,151` | attack Grim Haruspex+Seasoned Pyromancer+Elemental Token+Elemental Token | 6.5 [3.8, 10.8] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 2 | `attack:20` | attack Grim Haruspex | 8.5 [5.4, 13.2] (n 200) | 10.0 [4.0, 23.1] (n 40) |
| 3 | `attack:15` | attack Seasoned Pyromancer | 11.5 [7.8, 16.7] (n 200) | 32.5 [20.1, 48.0] (n 40) |
| 4 | `attack:150` | attack Elemental Token | 9.0 [5.8, 13.8] (n 200) | 22.5 [12.3, 37.5] (n 40) |
| 5 | `attack:151` | attack Elemental Token | 9.0 [5.8, 13.8] (n 200) | 22.5 [12.3, 37.5] (n 40) |

**d20** (turn 14, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:15` | attack Seasoned Pyromancer | 14.5 [10.3, 20.1] (n 200) | 40.0 [26.4, 55.4] (n 40) |
| 1 | `attack:none` | attack none | 11.0 [7.4, 16.1] (n 200) | 52.5 [37.5, 67.1] (n 40) |
| 2 | `attack:15,151` | attack Seasoned Pyromancer+Elemental Token | 16.0 [11.6, 21.7] (n 200) | 45.0 [30.7, 60.2] (n 40) |

**d22** (turn 14, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:3` | Deadly Dispute | 10.0 [6.6, 14.9] (n 200) | 35.0 [22.1, 50.5] (n 40) |
| 1 | `pass` | pass | 14.5 [10.3, 20.1] (n 200) | 35.0 [22.1, 50.5] (n 40) |

**d25** (turn 16, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 4.0 [2.0, 7.7] (n 200) | 15.0 [7.1, 29.1] (n 40) |
| 1 | `cast:24` | Goblin Bombardment | 0.0 [0.0, 1.9] (n 200) | 20.0 [10.5, 34.8] (n 40) |
| 2 | `cast:2` | Faithless Looting | 4.5 [2.4, 8.3] (n 200) | 32.5 [20.1, 48.0] (n 40) |

**d28** (turn 17, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:39>155` | block Walking Ballista>Construct Token | 5.5 [3.1, 9.6] (n 200) | 12.5 [5.5, 26.1] (n 40) |
| 1 | `block:none` | block none | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |

**d31** (turn 18, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:18` | Pia and Kiran Nalaar | 0.5 [0.1, 2.8] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 1 | `pass` | pass | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 2 | `cast:24` | Goblin Bombardment | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 3 | `cast:2` | Faithless Looting | 2.0 [0.8, 5.0] (n 200) | 17.5 [8.8, 31.9] (n 40) |

**d34** (turn 20, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.5 [0.1, 2.8] (n 200) | 5.0 [1.4, 16.5] (n 40) |
| 1 | `cast:24` | Goblin Bombardment | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 2 | `cast:2` | Faithless Looting | 0.5 [0.1, 2.8] (n 200) | 5.0 [1.4, 16.5] (n 40) |
| 3 | `cast:21` | Marionette Master | 1.5 [0.5, 4.3] (n 200) | 5.0 [1.4, 16.5] (n 40) |

**d36** (turn 20, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:21` | Marionette Master | 0.5 [0.1, 2.8] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 1 | `pass` | pass | 1.5 [0.5, 4.3] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 2 | `cast:24` | Goblin Bombardment | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 3 | `cast:2` | Faithless Looting | 0.5 [0.1, 2.8] (n 200) | 2.5 [0.4, 12.9] (n 40) |

**d39** (turn 22, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 1 | `cast:24` | Goblin Bombardment | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 2 | `cast:2` | Faithless Looting | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 3 | `cast:18` | Pia and Kiran Nalaar | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |

**d42** (turn 23, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:262>83,18>97,263>106,239>155,240>161` | block Thopter Token>Phyrexian Golem Token, Pia and Kiran Nalaar>Man-o'-War, Elemental Token>Sun Titan, Elemental Token>Adeline, Resplendent Cathar, Thopter Token>Construct Token | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 1 | `block:none` | block none | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 2 | `block:262>83,18>97,263>106,239>155` | block Pia and Kiran Nalaar>Man-o'-War, Elemental Token>Sun Titan, Elemental Token>Adeline, Resplendent Cathar, Thopter Token>Construct Token | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 3 | `block:262>83,263>106,239>155,240>161` | block Thopter Token>Phyrexian Golem Token, Elemental Token>Sun Titan, Elemental Token>Adeline, Resplendent Cathar, Thopter Token>Construct Token | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 4 | `block:18>97,263>106,239>155,240>161` | block Thopter Token>Phyrexian Golem Token, Pia and Kiran Nalaar>Man-o'-War, Elemental Token>Adeline, Resplendent Cathar, Thopter Token>Construct Token | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 5 | `block:262>83,18>97,239>155,240>161` | block Thopter Token>Phyrexian Golem Token, Pia and Kiran Nalaar>Man-o'-War, Elemental Token>Sun Titan, Thopter Token>Construct Token | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |
| 6 | `block:262>83,18>97,263>106,240>161` | block Thopter Token>Phyrexian Golem Token, Pia and Kiran Nalaar>Man-o'-War, Elemental Token>Sun Titan, Elemental Token>Adeline, Resplendent Cathar | 0.0 [0.0, 1.9] (n 200) | 0.0 [0.0, 8.8] (n 40) |

12960 branch games (0 with an error, left out); 0 random and 1 Forge branches ended at the turn cap.

## Checks

283213 rows checked (ids against each seat's own frame log), 25922 frame logs through tools/check-redaction.mjs, 12960 forks checked (0 not the position), 32 no-leak checks (0 moved; the negative control moved in 32). The guardrails read back from 21600 random seats' logs: a land offered at 47338 of 513483 priority decisions and taken at 47338; 0 of 0 opening hands kept; G3 left out a repeated no-op 2349 time(s); G5 (D458): the engine refused 2 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 933 pick(s) of the seats' own X plays had X drawn from 1 up, 1622 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

