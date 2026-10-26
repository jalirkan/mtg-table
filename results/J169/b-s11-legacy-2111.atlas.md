# Move atlas: legacy-2011-00001 vs legacy-2011-00002, seed 2111

D451. Seat A is legacy-2011-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 18 turns, won by B, and listed 22 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d3 | 6 | p | 4 | 2 `cast:30`, 20.5 [12.3, 29.8] (n 200) | -, - (n 0) | - | - |
| d7 | 8 | p | 5 | 0 `cast:30`, 0.0 [0.0, 0.0] (n 200) | -, - (n 0) | - | - |
| d8 | 10 | p | 3 | 2 `cast:27`, 4.0 [0.0, 11.8] (n 200) | -, - (n 0) | - | - |
| d9 | 10 | a | 4 | 1 `attack:3,30`, 1.8 [0.0, 10.5] (n 200) | -, - (n 0) | - | - |
| d10 | 10 | p | 4 | 1 `pass`, 2.0 [0.0, 9.0] (n 200) | -, - (n 0) | - | - |
| d11 | 12 | p | 3 | 0 `pass`, 0.0 [0.0, 1.8] (n 200) | -, - (n 0) | - | - |
| d12 | 12 | a | 4 | 2 `attack:3`, 4.0 [0.0, 16.1] (n 25) | -, - (n 0) | - | - |
| d13 | 12 | p | 4 | 2 `cast:31`, 4.0 [0.0, 11.0] (n 200) | -, - (n 0) | - | - |
| d14 | 13 | b | 6 | 2 `block:83>47,3>85`, 4.0 [0.0, 9.5] (n 200) | -, - (n 0) | - | - |
| d16 | 14 | a | 5 | 2 `attack:3,37,83`, 4.0 [0.0, 20.0] (n 25) | -, - (n 0) | - | - |
| d17 | 14 | p | 3 | 0 `cast:31`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d18 | 15 | b | 5 | 0 `block:87>47,37>78,3>89`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d19 | 16 | a | 5 | 0 `attack:37`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d21 | 17 | b | 5 | 0 `block:93>41,3>78,83>95`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

14 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 6: d16 (mean value 3.2%, replaced by d17), d18 (mean value 0.0%, replaced by d10), d21 (mean value 0.0%, replaced by d12), d17 (mean value 0.0%, replaced by d19), d19 (mean value 0.0%, replaced by d14), d12 (mean value 4.0%, replaced by d8). Early stopping at 50/100/150 random branches stopped 13 option(s): d3 o1 at 50, d3 o3 at 50, d7 o1 at 50, d7 o2 at 100, d7 o3 at 150, d7 o4 at 100, d11 o2 at 150, d14 o1 at 100, d14 o3 at 150, d14 o4 at 150, d14 o5 at 50, d10 o3 at 50, d8 o1 at 150 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d3** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:30` | Murderous Rider — Swift End | 33.5 [27.3, 40.3] (n 200) | - (n 0) |
| 1 | `pass` | pass | 38.0 [25.9, 51.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:30` | Murderous Rider | 54.0 [47.1, 60.8] (n 200) | - (n 0) |
| 3 | `cast:20` | Shallow Grave | 42.0 [29.4, 55.8] (n 50, stopped at 50) | - (n 0) |

**d7** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:30` | Murderous Rider (may play) | 56.5 [49.6, 63.2] (n 200) | - (n 0) |
| 1 | `pass` | pass | 22.0 [12.8, 35.2] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:31` | Mind Twist | 33.0 [24.6, 42.7] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:27` | Bitterblossom | 37.3 [30.0, 45.3] (n 150, stopped at 150) | - (n 0) |
| 4 | `cast:20` | Shallow Grave | 35.0 [26.4, 44.8] (n 100, stopped at 100) | - (n 0) |

**d8** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 22.5 [17.3, 28.8] (n 200) | - (n 0) |
| 1 | `cast:20` | Shallow Grave | 17.3 [12.1, 24.2] (n 150, stopped at 150) | - (n 0) |
| 2 | `cast:27` | Bitterblossom | 26.5 [20.9, 33.0] (n 200) | - (n 0) |

**d9** (turn 10, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 21.3 [16.2, 27.4] (n 200) | - (n 0) |
| 1 | `attack:3,30` | attack Evolved Sleeper+Murderous Rider | 23.0 [17.7, 29.3] (n 200) | - (n 0) |
| 2 | `attack:3` | attack Evolved Sleeper | 20.8 [15.7, 26.9] (n 200) | - (n 0) |
| 3 | `attack:30` | attack Murderous Rider | 23.0 [17.7, 29.3] (n 200) | - (n 0) |

**d10** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:27` | Bitterblossom | 19.8 [14.8, 25.8] (n 200) | - (n 0) |
| 1 | `pass` | pass | 21.8 [16.6, 28.0] (n 200) | - (n 0) |
| 2 | `cast:31` | Mind Twist | 20.5 [15.5, 26.6] (n 200) | - (n 0) |
| 3 | `cast:20` | Shallow Grave | 12.0 [5.6, 23.8] (n 50, stopped at 50) | - (n 0) |

**d11** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 20.0 [15.0, 26.1] (n 200) | - (n 0) |
| 1 | `cast:20` | Shallow Grave | 15.0 [10.7, 20.6] (n 200) | - (n 0) |
| 2 | `cast:37` | Hell's Caretaker | 14.0 [9.3, 20.5] (n 150, stopped at 150) | - (n 0) |

**d12** (turn 12, a; option 0 is Forge's answer) -- settled by the screen (mean value 4.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 1 | `attack:3,30` | attack Evolved Sleeper+Murderous Rider | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `attack:3` | attack Evolved Sleeper | 8.0 [2.2, 25.0] (n 25) | - (n 0) |
| 3 | `attack:30` | attack Murderous Rider | 4.0 [0.7, 19.5] (n 25) | - (n 0) |

**d13** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:37` | Hell's Caretaker | 16.5 [12.0, 22.3] (n 200) | - (n 0) |
| 1 | `pass` | pass | 19.3 [14.4, 25.3] (n 200) | - (n 0) |
| 2 | `cast:31` | Mind Twist | 20.5 [15.5, 26.6] (n 200) | - (n 0) |
| 3 | `cast:20` | Shallow Grave | 16.5 [12.0, 22.3] (n 200) | - (n 0) |

**d14** (turn 13, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:3>85` | block Evolved Sleeper>Human Token | 19.0 [14.2, 25.0] (n 200) | - (n 0) |
| 1 | `block:none` | block none | 12.0 [7.0, 19.8] (n 100, stopped at 100) | - (n 0) |
| 2 | `block:83>47,3>85` | block Evolved Sleeper>Human Token, Faerie Rogue Token>Consecrated Sphinx | 23.0 [17.7, 29.3] (n 200) | - (n 0) |
| 3 | `block:3>85,30>85` | block Evolved Sleeper>Human Token, Murderous Rider>Human Token | 16.0 [11.0, 22.7] (n 150, stopped at 150) | - (n 0) |
| 4 | `block:3>85,83>85` | block Evolved Sleeper>Human Token, Faerie Rogue Token>Human Token | 17.3 [12.1, 24.2] (n 150, stopped at 150) | - (n 0) |
| 5 | `block:3>85,37>85` | block Evolved Sleeper>Human Token, Hell's Caretaker>Human Token | 12.0 [5.6, 23.8] (n 50, stopped at 50) | - (n 0) |

**d16** (turn 14, a; option 0 is Forge's answer) -- settled by the screen (mean value 3.2%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:83` | attack Faerie Rogue Token | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `attack:3,37,83` | attack Faerie Rogue Token+Evolved Sleeper+Hell's Caretaker | 8.0 [2.2, 25.0] (n 25) | - (n 0) |
| 3 | `attack:3,83` | attack Faerie Rogue Token+Evolved Sleeper | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `attack:37,83` | attack Faerie Rogue Token+Hell's Caretaker | 4.0 [0.7, 19.5] (n 25) | - (n 0) |

**d17** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:31` | Mind Twist | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:20` | Shallow Grave | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d18** (turn 15, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:87>47,37>78,3>89` | block Hell's Caretaker>Adeline, Resplendent Cathar, Faerie Rogue Token>Consecrated Sphinx, Evolved Sleeper>Human Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:87>47,3>89` | block Faerie Rogue Token>Consecrated Sphinx, Evolved Sleeper>Human Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:37>78,3>89` | block Hell's Caretaker>Adeline, Resplendent Cathar, Evolved Sleeper>Human Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `block:87>47,37>78` | block Hell's Caretaker>Adeline, Resplendent Cathar, Faerie Rogue Token>Consecrated Sphinx | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d19** (turn 16, a; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:37` | attack Hell's Caretaker | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `attack:3,37,83` | attack Hell's Caretaker+Evolved Sleeper+Faerie Rogue Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `attack:3,37` | attack Hell's Caretaker+Evolved Sleeper | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `attack:37,83` | attack Hell's Caretaker+Faerie Rogue Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d21** (turn 17, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:93>41,3>78,83>95` | block Faerie Rogue Token>Figure of Destiny, Evolved Sleeper>Adeline, Resplendent Cathar, Faerie Rogue Token>Human Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:3>78,83>95` | block Evolved Sleeper>Adeline, Resplendent Cathar, Faerie Rogue Token>Human Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:93>41,83>95` | block Faerie Rogue Token>Figure of Destiny, Faerie Rogue Token>Human Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `block:93>41,3>78` | block Faerie Rogue Token>Figure of Destiny, Evolved Sleeper>Adeline, Resplendent Cathar | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

5975 branch games (0 with an error, left out); 17 random and 0 Forge branches ended at the turn cap.

## Checks

182389 rows checked (ids against each seat's own frame log), 11952 frame logs through tools/check-redaction.mjs, 5975 forks checked (0 not the position), 14 no-leak checks (0 moved; the negative control moved in 14). The guardrails read back from 11950 random seats' logs: a land offered at 39069 of 507580 priority decisions and taken at 39069; 0 of 0 opening hands kept; G3 left out a repeated no-op 1825 time(s); G5 (D458): the engine refused 83 pick(s) it could not pay for, and 43 later offer(s) of them in the same priority window were left out; G6 (D471): 3151 pick(s) of the seats' own X plays had X drawn from 1 up, 178929 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

17 of 5975 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

