# Move atlas: pauper-2474-00001 vs pauper-2474-00002, seed 2574

D451. Seat A is pauper-2474-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 18 turns, won by B, and listed 20 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 3 | p | 3 | 1 `pass`, 5.0 [0.0, 15.0] (n 150) | -, - (n 0) | - | - |
| d1 | 5 | p | 3 | 1 `pass`, 2.3 [0.0, 12.0] (n 150) | -, - (n 0) | - | - |
| d2 | 7 | p | 5 | 3 `cast:33`, 0.7 [0.0, 11.3] (n 150) | -, - (n 0) | - | - |
| d3 | 7 | p | 3 | 1 `pass`, 1.0 [0.0, 11.0] (n 150) | -, - (n 0) | - | - |
| d5 | 9 | p | 4 | 0 `pass`, 0.0 [0.0, 9.0] (n 50) | -, - (n 0) | - | - |
| d6 | 9 | p | 3 | 0 `cast:33`, 0.0 [0.0, 18.0] (n 50) | -, - (n 0) | - | - |
| d7 | 11 | p | 4 | 0 `cast:1`, 0.0 [0.0, 0.0] (n 50) | -, - (n 0) | - | - |
| d9 | 13 | p | 4 | 1 `pass`, 11.0 [3.3, 19.7] (n 150) | -, - (n 0) | - | - |
| d11 | 13 | p | 2 | 0 `cast:5`, 0.0 [0.0, 0.0] (n 50) | -, - (n 0) | - | - |
| d12 | 15 | p | 5 | 0 `cast:40`, 0.0 [0.0, 8.0] (n 25) | -, - (n 0) | - | - |
| d13 | 15 | p | 3 | 0 `activate:29`, 0.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d14 | 15 | a | 2 | 0 `attack:none`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d15 | 16 | b | 2 | 0 `block:none`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d16 | 17 | p | 5 | 1 `cast:35`, 8.0 [4.0, 20.0] (n 25) | -, - (n 0) | - | - |
| d17 | 17 | a | 2 | 1 `attack:33`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d18 | 17 | p | 5 | 4 `cast:11`, 1.3 [0.0, 6.7] (n 150) | -, - (n 0) | - | - |
| d19 | 18 | b | 2 | 0 `block:33>57`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

17 decision(s) branched, 6 of them in full (4 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 7: d13 (mean value 2.7%, replaced by d12), d16 (mean value 4.0%, replaced by d17), d12 (mean value 2.4%, replaced by d3), d17 (mean value 2.0%, replaced by d19), d19 (mean value 0.0%, replaced by d15), d15 (mean value 4.0%, replaced by d14), d14 (mean value 2.0%, replaced by d11). Early stopping at 50/100 random branches stopped 5 option(s): d1 o2 at 50, d2 o1 at 100, d2 o4 at 100, d9 o3 at 100, d18 o2 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 4. It stopped 4 (d5, d6, d7, d11), each a partial label at that n, never confident, saving at most 1300 branch games; 0 it would have stopped played on to the full n as controls (none; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 3, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:24#0` | Sheltering Landscape: {T}, Sacrifice CARDNAME: Search your l | 40.0 [32.5, 48.0] (n 150) | - (n 0) |
| 1 | `pass` | pass | 45.0 [37.3, 53.0] (n 150) | - (n 0) |
| 2 | `cast:12` | Strategic Betrayal | 39.3 [31.9, 47.3] (n 150) | - (n 0) |

**d1** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:12` | Strategic Betrayal | 49.0 [41.1, 56.9] (n 150) | - (n 0) |
| 1 | `pass` | pass | 51.3 [43.4, 59.2] (n 150) | - (n 0) |
| 2 | `cast:28` | Goblin Plate Mail | 37.0 [25.0, 50.9] (n 50, stopped at 50) | - (n 0) |

**d2** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:39#0` | Perilous Landscape: {T}, Sacrifice CARDNAME: Search your lib | 50.3 [42.4, 58.2] (n 150) | - (n 0) |
| 1 | `pass` | pass | 39.5 [30.5, 49.3] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:34` | Paralyze | 49.7 [41.8, 57.6] (n 150) | - (n 0) |
| 3 | `cast:33` | Aerie Auxiliary | 51.0 [43.1, 58.9] (n 150) | - (n 0) |
| 4 | `cast:28` | Goblin Plate Mail | 38.5 [29.6, 48.3] (n 100, stopped at 100) | - (n 0) |

**d3** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:34` | Paralyze | 50.3 [42.4, 58.2] (n 150) | - (n 0) |
| 1 | `pass` | pass | 51.3 [43.4, 59.2] (n 150) | - (n 0) |
| 2 | `cast:28` | Goblin Plate Mail | 49.7 [41.8, 57.6] (n 150) | - (n 0) |

**d5** (turn 9, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 45.0 [32.1, 58.7] (n 50) | - (n 0) |
| 1 | `cast:33` | Aerie Auxiliary | 30.0 [19.1, 43.8] (n 50) | - (n 0) |
| 2 | `cast:28` | Goblin Plate Mail | 38.0 [25.9, 51.8] (n 50) | - (n 0) |
| 3 | `cast:29` | Crude Bent Blade | 28.0 [17.5, 41.7] (n 50) | - (n 0) |

**d6** (turn 9, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:33` | Aerie Auxiliary | 36.0 [24.1, 49.9] (n 50) | - (n 0) |
| 1 | `pass` | pass | 26.0 [15.9, 39.6] (n 50) | - (n 0) |
| 2 | `cast:29` | Crude Bent Blade | 36.0 [24.1, 49.9] (n 50) | - (n 0) |

**d7** (turn 11, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Ashes to Ashes | 50.0 [36.6, 63.4] (n 50) | - (n 0) |
| 1 | `pass` | pass | 24.0 [14.3, 37.4] (n 50) | - (n 0) |
| 2 | `cast:29` | Crude Bent Blade | 20.0 [11.2, 33.0] (n 50) | - (n 0) |
| 3 | `cast:35` | Hasran Ogress | 26.0 [15.9, 39.6] (n 50) | - (n 0) |

**d9** (turn 13, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:29` | Crude Bent Blade | 21.7 [15.8, 28.9] (n 150) | - (n 0) |
| 1 | `pass` | pass | 32.7 [25.7, 40.5] (n 150) | - (n 0) |
| 2 | `cast:35` | Hasran Ogress | 30.0 [23.2, 37.8] (n 150) | - (n 0) |
| 3 | `cast:32` | Relic Barrier | 24.0 [16.7, 33.2] (n 100, stopped at 100) | - (n 0) |

**d11** (turn 13, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:5` | Inquisition of Kozilek | 26.0 [15.9, 39.6] (n 50) | - (n 0) |
| 1 | `pass` | pass | 10.0 [4.3, 21.4] (n 50) | - (n 0) |

**d12** (turn 15, p; option 0 is Forge's answer) -- settled by the screen (mean value 2.4%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:40` | Gollum, Silent Slinker — Meager Meal | 8.0 [2.2, 25.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `activate:29` | Crude Bent Blade: Equip {2} ({2}: Attach to target creature  | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `cast:28` | Goblin Plate Mail | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `cast:32` | Relic Barrier | 4.0 [0.7, 19.5] (n 25) | - (n 0) |

**d13** (turn 15, p; option 0 is Forge's answer) -- settled by the screen (mean value 2.7%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:29` | Crude Bent Blade: Equip {2} ({2}: Attach to target creature  | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 1 | `pass` | pass | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 2 | `cast:32` | Relic Barrier | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d14** (turn 15, a; option 0 is Forge's answer) -- settled by the screen (mean value 2.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 1 | `attack:33` | attack Aerie Auxiliary | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d15** (turn 16, b; option 0 is Forge's answer) -- settled by the screen (mean value 4.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 8.0 [2.2, 25.0] (n 25) | - (n 0) |
| 1 | `block:33>57` | block Aerie Auxiliary>Generous Ent | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d16** (turn 17, p; option 0 is Forge's answer) -- settled by the screen (mean value 4.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `cast:35` | Hasran Ogress | 8.0 [2.2, 25.0] (n 25) | - (n 0) |
| 2 | `cast:32` | Relic Barrier | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `cast:11` | Killian, Ink Duelist | 8.0 [2.2, 25.0] (n 25) | - (n 0) |
| 4 | `cast:40` | Gollum, Silent Slinker (may play) | 4.0 [0.7, 19.5] (n 25) | - (n 0) |

**d17** (turn 17, a; option 0 is Forge's answer) -- settled by the screen (mean value 2.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:33` | attack Aerie Auxiliary | 4.0 [0.7, 19.5] (n 25) | - (n 0) |

**d18** (turn 17, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:40` | Gollum, Silent Slinker (may play) | 6.0 [3.2, 11.0] (n 150) | - (n 0) |
| 1 | `pass` | pass | 5.3 [2.7, 10.2] (n 150) | - (n 0) |
| 2 | `cast:35` | Hasran Ogress | 2.0 [0.5, 7.0] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:32` | Relic Barrier | 3.3 [1.4, 7.6] (n 150) | - (n 0) |
| 4 | `cast:11` | Killian, Ink Duelist | 7.3 [4.1, 12.7] (n 150) | - (n 0) |

**d19** (turn 18, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:33>57` | block Aerie Auxiliary>Generous Ent | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

4325 branch games (0 with an error, left out); 86 random and 0 Forge branches ended at the turn cap.

## Checks

190784 rows checked (ids against each seat's own frame log), 8652 frame logs through tools/check-redaction.mjs, 4325 forks checked (0 not the position), 17 no-leak checks (0 moved; the negative control moved in 17). The guardrails read back from 8650 random seats' logs: a land offered at 39940 of 440073 priority decisions and taken at 39940; 0 of 0 opening hands kept; G3 left out a repeated no-op 16007 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 0 pick(s) of the seats' own X plays had X drawn from 1 up, 0 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

86 of 4325 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

