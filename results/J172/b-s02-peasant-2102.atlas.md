# Move atlas: peasant-2002-00001 vs peasant-2002-00002, seed 2102

D451. Seat A is peasant-2002-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 12 turns, won by B, and listed 6 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 5 | p | 2 | 1 `cast:25`, 9.5 [1.3, 17.8] (n 200) | -, - (n 0) | - | - |
| d1 | 5 | p | 2 | 1 `pass`, 3.5 [0.0, 12.3] (n 200) | -, - (n 0) | - | - |
| d2 | 7 | p | 2 | 1 `cast:13`, 2.8 [0.0, 11.5] (n 200) | -, - (n 0) | - | - |
| d3 | 7 | a | 2 | 1 `attack:none`, 1.5 [0.0, 10.0] (n 200) | -, - (n 0) | - | - |
| d4 | 7 | p | 2 | 1 `pass`, 4.3 [0.0, 12.0] (n 200) | -, - (n 0) | - | - |
| d5 | 11 | p | 3 | 2 `cast:5`, 2.0 [0.0, 6.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

6 decision(s) branched, 5 of them in full; picked among those with 3 or more options first (5 filled from the rest). The screen at 25 random branches settled 1: d5 (mean value 0.7%, nothing left to replace it). Early stopping at 50/100/150 random branches stopped 0 option(s): none (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 34.8 [28.5, 41.6] (n 200) | - (n 0) |
| 1 | `cast:25` | Evolution Sage | 44.3 [37.5, 51.2] (n 200) | - (n 0) |

**d1** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:25` | Evolution Sage | 37.5 [31.1, 44.4] (n 200) | - (n 0) |
| 1 | `pass` | pass | 41.0 [34.4, 47.9] (n 200) | - (n 0) |

**d2** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 41.8 [35.1, 48.7] (n 200) | - (n 0) |
| 1 | `cast:13` | Eusocial Engineering | 44.5 [37.8, 51.4] (n 200) | - (n 0) |

**d3** (turn 7, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:25` | attack Evolution Sage | 45.5 [38.8, 52.4] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 47.0 [40.2, 53.9] (n 200) | - (n 0) |

**d4** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:13` | Eusocial Engineering | 41.3 [34.6, 48.2] (n 200) | - (n 0) |
| 1 | `pass` | pass | 45.5 [38.8, 52.4] (n 200) | - (n 0) |

**d5** (turn 11, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.7%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Fact or Fiction | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:5` | Flow State | 2.0 [0.2, 16.6] (n 25) | - (n 0) |

2075 branch games (0 with an error, left out); 211 random and 0 Forge branches ended at the turn cap.

## Checks

127193 rows checked (ids against each seat's own frame log), 4152 frame logs through tools/check-redaction.mjs, 2075 forks checked (0 not the position), 6 no-leak checks (0 moved; the negative control moved in 6). The guardrails read back from 4150 random seats' logs: a land offered at 29417 of 289615 priority decisions and taken at 29417; 0 of 0 opening hands kept; G3 left out a repeated no-op 0 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 4348 pick(s) of the seats' own X plays had X drawn from 1 up, 13548 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

211 of 2075 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

