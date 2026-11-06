# Move atlas: legacy-3695-00001 vs legacy-3695-00002, seed 3795

D451. Seat A is legacy-3695-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 17 turns, won by B, and listed 24 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 4 | p | 4 | 3 `cast:2`, 2.0 [0.0, 8.0] (n 150) | -, - (n 0) | - | - |
| d1 | 4 | p | 4 | 0 `cast:2`, 0.0 [0.0, 8.1] (n 50) | -, - (n 0) | - | - |
| d2 | 6 | p | 5 | 0 `cast:9`, 0.0 [0.0, 4.7] (n 150) | -, - (n 0) | - | - |
| d3 | 6 | a | 2 | 0 `attack:2`, 0.0 [0.0, 4.0] (n 150) | -, - (n 0) | - | - |
| d4 | 8 | p | 4 | 1 `cast:32`, 5.7 [2.3, 11.3] (n 150) | -, - (n 0) | - | - |
| d5 | 8 | a | 2 | 0 `attack:2`, 0.0 [0.0, 10.0] (n 50) | -, - (n 0) | - | - |
| d6 | 8 | p | 4 | 1 `pass`, 3.3 [0.0, 10.0] (n 150) | -, - (n 0) | - | - |
| d7 | 8 | p | 2 | 0 `pass`, 0.0 [0.0, 2.7] (n 150) | -, - (n 0) | - | - |
| d8 | 9 | b | 2 | 0 `block:none`, 0.0 [0.0, 10.1] (n 50) | -, - (n 0) | - | - |
| d9 | 10 | p | 3 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d10 | 10 | a | 5 | 3 `attack:32`, 4.0 [0.0, 16.0] (n 25) | -, - (n 0) | - | - |
| d11 | 10 | p | 3 | 2 `cast:36`, 4.0 [0.0, 8.7] (n 150) | -, - (n 0) | - | - |
| d12 | 11 | b | 5 | 3 `block:32>84`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d13 | 12 | p | 2 | 1 `cast:36`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d14 | 12 | a | 3 | 2 `attack:32,35`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d15 | 12 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d16 | 13 | b | 3 | 0 `block:none`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d17 | 14 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d18 | 14 | a | 4 | 0 `attack:none`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d19 | 14 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d20 | 15 | b | 4 | 0 `block:35>49,32>84`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d21 | 16 | p | 3 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d22 | 16 | p | 3 | 0 `cast:6`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d23 | 16 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

24 decision(s) branched, 7 of them in full (3 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 14: d9 (mean value 0.0%, replaced by d11), d10 (mean value 4.0%, replaced by d21), d12 (mean value 0.8%, replaced by d16), d14 (mean value 1.3%, replaced by d15), d18 (mean value 0.0%, replaced by d8), d20 (mean value 0.0%, replaced by d7), d22 (mean value 0.0%, replaced by d3), d16 (mean value 0.0%, replaced by d6), d21 (mean value 0.0%, replaced by d1), d15 (mean value 0.0%, replaced by d17), d17 (mean value 0.0%, replaced by d19), d19 (mean value 0.0%, replaced by d23), d23 (mean value 0.0%, replaced by d13), d13 (mean value 2.0%, replaced by d5). Early stopping at 50/100 random branches stopped 3 option(s): d0 o2 at 100, d4 o2 at 50, d11 o1 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 5. It stopped 3 (d1, d8, d5), each a partial label at that n, never confident, saving at most 800 branch games; 2 it would have stopped played on to the full n as controls (d7, d3; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 4, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 10.0 [6.2, 15.8] (n 150) | - (n 0) |
| 1 | `cast:32` | Stoneforge Mystic | 4.7 [2.3, 9.3] (n 150) | - (n 0) |
| 2 | `cast:35` | Containment Priest | 4.0 [1.6, 9.8] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:2` | Jennifer Walters | 12.0 [7.7, 18.2] (n 150) | - (n 0) |

**d1** (turn 4, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:2` | Jennifer Walters | 10.0 [4.3, 21.4] (n 50) | - (n 0) |
| 1 | `pass` | pass | 6.0 [2.1, 16.2] (n 50) | - (n 0) |
| 2 | `cast:32` | Stoneforge Mystic | 6.0 [2.1, 16.2] (n 50) | - (n 0) |
| 3 | `cast:35` | Containment Priest | 10.0 [4.3, 21.4] (n 50) | - (n 0) |

**d2** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:9` | Farrel's Mantle | 12.0 [7.7, 18.2] (n 150) | - (n 0) |
| 1 | `pass` | pass | 11.3 [7.2, 17.4] (n 150) | - (n 0) |
| 2 | `cast:32` | Stoneforge Mystic | 9.0 [5.4, 14.7] (n 150) | - (n 0) |
| 3 | `cast:35` | Containment Priest | 8.0 [4.6, 13.5] (n 150) | - (n 0) |
| 4 | `cast:36` | Unbreakable Formation | 8.7 [5.1, 14.3] (n 150) | - (n 0) |

**d3** (turn 6, a; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:2` | attack Jennifer Walters | 14.0 [9.3, 20.5] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 12.0 [7.7, 18.2] (n 150) | - (n 0) |

**d4** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 4.7 [2.3, 9.3] (n 150) | - (n 0) |
| 1 | `cast:32` | Stoneforge Mystic | 10.3 [6.4, 16.2] (n 150) | - (n 0) |
| 2 | `cast:35` | Containment Priest | 6.0 [2.1, 16.2] (n 50, stopped at 50) | - (n 0) |
| 3 | `cast:36` | Unbreakable Formation | 10.0 [6.2, 15.8] (n 150) | - (n 0) |

**d5** (turn 8, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:2` | attack Jennifer Walters | 8.0 [3.1, 18.8] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 8.0 [3.1, 18.8] (n 50) | - (n 0) |

**d6** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:32` | Stoneforge Mystic | 8.0 [4.6, 13.5] (n 150) | - (n 0) |
| 1 | `pass` | pass | 11.3 [7.2, 17.4] (n 150) | - (n 0) |
| 2 | `cast:35` | Containment Priest | 7.3 [4.1, 12.7] (n 150) | - (n 0) |
| 3 | `cast:36` | Unbreakable Formation | 10.7 [6.7, 16.6] (n 150) | - (n 0) |

**d7** (turn 8, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 9.3 [5.6, 15.1] (n 150) | - (n 0) |
| 1 | `cast:35` | Containment Priest | 6.7 [3.7, 11.8] (n 150) | - (n 0) |

**d8** (turn 9, b; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 12.0 [5.6, 23.8] (n 50) | - (n 0) |
| 1 | `block:32>84` | block Stoneforge Mystic>Human Token | 12.0 [5.6, 23.8] (n 50) | - (n 0) |

**d9** (turn 10, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `cast:36` | Unbreakable Formation | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:37` | Forcefield | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d10** (turn 10, a; option 0 is Forge's answer) -- settled by the screen (mean value 4.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 1 | `attack:2,32,35` | attack Jennifer Walters+Stoneforge Mystic+Containment Priest | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 2 | `attack:2` | attack Jennifer Walters | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 3 | `attack:32` | attack Stoneforge Mystic | 8.0 [2.2, 25.0] (n 25) | - (n 0) |
| 4 | `attack:35` | attack Containment Priest | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d11** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:37` | Forcefield | 2.0 [0.7, 5.7] (n 150) | - (n 0) |
| 1 | `pass` | pass | 2.0 [0.5, 7.0] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:36` | Unbreakable Formation | 6.0 [3.2, 11.0] (n 150) | - (n 0) |

**d12** (turn 11, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.8%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:32>49` | block Stoneforge Mystic>Icetill Explorer | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:35>49` | block Containment Priest>Icetill Explorer | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:32>84` | block Stoneforge Mystic>Human Token | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 4 | `block:35>84` | block Containment Priest>Human Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d13** (turn 12, p; option 0 is Forge's answer) -- settled by the screen (mean value 2.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `cast:36` | Unbreakable Formation | 4.0 [0.7, 19.5] (n 25) | - (n 0) |

**d14** (turn 12, a; option 0 is Forge's answer) -- settled by the screen (mean value 1.3%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:35` | attack Containment Priest | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `attack:32,35` | attack Containment Priest+Stoneforge Mystic | 4.0 [0.7, 19.5] (n 25) | - (n 0) |

**d15** (turn 12, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `cast:36` | Unbreakable Formation | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d16** (turn 13, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:32>49` | block Stoneforge Mystic>Icetill Explorer | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:32>84` | block Stoneforge Mystic>Human Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d17** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `cast:36` | Unbreakable Formation | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d18** (turn 14, a; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:32,35` | attack Stoneforge Mystic+Containment Priest | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `attack:32` | attack Stoneforge Mystic | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `attack:35` | attack Containment Priest | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d19** (turn 14, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `cast:36` | Unbreakable Formation | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d20** (turn 15, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:35>49,32>84` | block Containment Priest>Icetill Explorer, Stoneforge Mystic>Human Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:32>84` | block Stoneforge Mystic>Human Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:35>49` | block Containment Priest>Icetill Explorer | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d21** (turn 16, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `cast:36` | Unbreakable Formation | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:6` | Jihad | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d22** (turn 16, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:6` | Jihad | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:36` | Unbreakable Formation | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d23** (turn 16, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `cast:36` | Unbreakable Formation | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

4875 branch games (0 with an error, left out); 4 random and 0 Forge branches ended at the turn cap.

## Checks

143386 rows checked (ids against each seat's own frame log), 9752 frame logs through tools/check-redaction.mjs, 4875 forks checked (0 not the position), 24 no-leak checks (0 moved; the negative control moved in 24). The guardrails read back from 9750 random seats' logs: a land offered at 41141 of 277241 priority decisions and taken at 41141; 0 of 0 opening hands kept; G3 left out a repeated no-op 4835 time(s); G5 (D458): the engine refused 138 pick(s) it could not pay for, and 136 later offer(s) of them in the same priority window were left out; G6 (D471): 936 pick(s) of the seats' own X plays had X drawn from 1 up, 5704 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

4 of 4875 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

