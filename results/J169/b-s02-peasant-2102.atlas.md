# Move atlas: peasant-2002-00001 vs peasant-2002-00002, seed 2102

D451. Seat A is peasant-2002-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 12 turns, won by B, and listed 6 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 5 | p | 2 | 1 `cast:25`, 2.3 [0.0, 10.8] (n 200) | -, - (n 0) | - | - |
| d1 | 5 | p | 2 | 0 `cast:25`, 0.0 [0.0, 5.5] (n 200) | -, - (n 0) | - | - |
| d2 | 7 | p | 2 | 0 `pass`, 0.0 [0.0, 7.5] (n 200) | -, - (n 0) | - | - |
| d3 | 7 | a | 2 | 1 `attack:none`, 13.3 [5.3, 21.3] (n 200) | -, - (n 0) | - | - |
| d4 | 7 | p | 2 | 0 `cast:13`, 0.0 [0.0, 0.0] (n 200) | -, - (n 0) | - | - |
| d5 | 11 | p | 3 | 2 `cast:5`, 3.0 [0.0, 7.5] (n 200) | -, - (n 0) | - | - |

### The cut design (D480)

6 decision(s) branched, 6 of them in full; picked among those with 3 or more options first (5 filled from the rest). The screen at 25 random branches settled 0: none. Early stopping at 50/100/150 random branches stopped 1 option(s): d4 o1 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 37.3 [30.9, 44.1] (n 200) | - (n 0) |
| 1 | `cast:25` | Evolution Sage | 39.5 [33.0, 46.4] (n 200) | - (n 0) |

**d1** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:25` | Evolution Sage | 39.8 [33.2, 46.7] (n 200) | - (n 0) |
| 1 | `pass` | pass | 36.8 [30.4, 43.6] (n 200) | - (n 0) |

**d2** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 43.3 [36.6, 50.2] (n 200) | - (n 0) |
| 1 | `cast:13` | Eusocial Engineering | 42.5 [35.9, 49.4] (n 200) | - (n 0) |

**d3** (turn 7, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:25` | attack Evolution Sage | 41.8 [35.1, 48.7] (n 200) | - (n 0) |
| 1 | `attack:none` | attack none | 55.0 [48.1, 61.7] (n 200) | - (n 0) |

**d4** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:13` | Eusocial Engineering | 48.0 [41.2, 54.9] (n 200) | - (n 0) |
| 1 | `pass` | pass | 34.0 [25.5, 43.7] (n 100, stopped at 100) | - (n 0) |

**d5** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Fact or Fiction | 4.8 [2.6, 8.6] (n 200) | - (n 0) |
| 1 | `pass` | pass | 6.8 [4.0, 11.1] (n 200) | - (n 0) |
| 2 | `cast:5` | Flow State | 7.8 [4.8, 12.3] (n 200) | - (n 0) |

2500 branch games (0 with an error, left out); 124 random and 0 Forge branches ended at the turn cap.

## Checks

117174 rows checked (ids against each seat's own frame log), 5002 frame logs through tools/check-redaction.mjs, 2500 forks checked (0 not the position), 6 no-leak checks (0 moved; the negative control moved in 6). The guardrails read back from 5000 random seats' logs: a land offered at 27708 of 447257 priority decisions and taken at 27708; 0 of 0 opening hands kept; G3 left out a repeated no-op 0 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 4155 pick(s) of the seats' own X plays had X drawn from 1 up, 13077 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

124 of 2500 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

