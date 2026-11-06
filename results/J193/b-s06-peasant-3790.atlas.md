# Move atlas: peasant-3690-00001 vs peasant-3690-00002, seed 3790

D451. Seat A is peasant-3690-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 12 turns, won by B, and listed 7 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 7 | p | 2 | 0 `cast:1`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d1 | 9 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d2 | 9 | p | 2 | 0 `cast:3`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d3 | 10 | b | 2 | 0 `block:3>90`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d4 | 11 | p | 2 | 0 `cast:7`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d5 | 11 | p | 3 | 0 `cast:12`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d6 | 12 | b | 2 | 0 `block:7>55`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

7 decision(s) branched, 0 of them in full; picked among those with 3 or more options first (6 filled from the rest). The screen at 25 random branches settled 7: d0 (mean value 4.0%, nothing left to replace it), d1 (mean value 0.0%, nothing left to replace it), d2 (mean value 0.0%, nothing left to replace it), d3 (mean value 0.0%, nothing left to replace it), d4 (mean value 0.0%, nothing left to replace it), d5 (mean value 0.0%, nothing left to replace it), d6 (mean value 0.0%, nothing left to replace it). Early stopping at 50/100 random branches stopped 0 option(s): none (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 0 decision(s) at 50 random branches: option 0 the best or within 0 of it at 0. It stopped 0 (none), each a partial label at that n, never confident, saving at most 0 branch games; 0 it would have stopped played on to the full n as controls (none; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 7, p; option 0 is Forge's answer) -- settled by the screen (mean value 4.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Fact or Fiction | 8.0 [2.2, 25.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d1** (turn 9, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `cast:3` | Staunch Crewmate | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d2** (turn 9, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:3` | Staunch Crewmate | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d3** (turn 10, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:3>90` | block Staunch Crewmate>Devil Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d4** (turn 11, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:7` | Glamer Gifter | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d5** (turn 11, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:12` | Sink into Stupor | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:19` | Boomerang Basics | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d6** (turn 12, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:7>55` | block Glamer Gifter>Battlesong Berserker | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

375 branch games (0 with an error, left out); 0 random and 0 Forge branches ended at the turn cap.

## Checks

5818 rows checked (ids against each seat's own frame log), 752 frame logs through tools/check-redaction.mjs, 375 forks checked (0 not the position), 7 no-leak checks (0 moved; the negative control moved in 7). The guardrails read back from 750 random seats' logs: a land offered at 1374 of 10389 priority decisions and taken at 1374; 0 of 0 opening hands kept; G3 left out a repeated no-op 163 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 13 pick(s) of the seats' own X plays had X drawn from 1 up, 539 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

