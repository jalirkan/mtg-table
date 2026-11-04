# Move atlas: legacy-2476-00001 vs legacy-2476-00002, seed 2576

D451. Seat A is legacy-2476-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 12 turns, won by B, and listed 16 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 1 | p | 2 | 1 `cast:22`, 0.7 [0.0, 8.7] (n 150) | -, - (n 0) | - | - |
| d2 | 3 | p | 4 | 0 `activate:14`, 0.0 [0.0, 8.7] (n 150) | -, - (n 0) | - | - |
| d3 | 3 | p | 3 | 1 `cast:22`, 9.7 [0.7, 18.0] (n 150) | -, - (n 0) | - | - |
| d4 | 3 | p | 3 | 2 `cast:22`, 0.7 [0.0, 11.3] (n 150) | -, - (n 0) | - | - |
| d9 | 6 | b | 3 | 2 `block:22>56`, 4.7 [0.0, 11.3] (n 150) | -, - (n 0) | - | - |
| d10 | 7 | a | 4 | 0 `attack:none`, 0.0 [0.0, 16.0] (n 50) | -, - (n 0) | - | - |
| d11 | 8 | b | 3 | 2 `block:22>56`, 20.6 [14.2, 27.0] (n 148) | -, - (n 0) | - | - |
| d12 | 9 | a | 4 | 1 `attack:22,86`, 7.4 [2.0, 14.1] (n 149) | -, - (n 0) | - | - |
| d13 | 11 | p | 2 | 1 `pass`, 0.7 [0.0, 5.3] (n 150) | -, - (n 0) | - | - |
| d14 | 11 | a | 2 | 0 `attack:none`, 0.0 [0.0, 8.0] (n 50) | -, - (n 0) | - | - |
| d15 | 12 | b | 4 | 0 `block:22>43,33>49`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

11 decision(s) branched, 8 of them in full (2 more stopped by the futility rule, D489); picked among those with 3 or more options first (2 filled from the rest). The screen at 25 random branches settled 1: d15 (mean value 0.0%, replaced by d13). Early stopping at 50/100 random branches stopped 3 option(s): d9 o1 at 50, d11 o1 at 50, d12 o2 at 100 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 3. It stopped 2 (d10, d14), each a partial label at that n, never confident, saving at most 600 branch games; 1 it would have stopped played on to the full n as controls (d2; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 1, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 36.7 [29.4, 44.6] (n 150) | - (n 0) |
| 1 | `cast:22` | Hangarback Walker | 37.3 [30.0, 45.3] (n 150) | - (n 0) |

**d2** (turn 3, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:14` | Verdant Catacombs: {T}, Pay 1 life, Sacrifice CARDNAME: Sear | 39.7 [32.2, 47.7] (n 150) | - (n 0) |
| 1 | `pass` | pass | 38.0 [30.6, 46.0] (n 150) | - (n 0) |
| 2 | `cast:22` | Hangarback Walker | 35.3 [28.1, 43.3] (n 150) | - (n 0) |
| 3 | `cast:38` | Stormchaser's Talent | 35.3 [28.1, 43.3] (n 150) | - (n 0) |

**d3** (turn 3, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 30.0 [23.2, 37.8] (n 150) | - (n 0) |
| 1 | `cast:22` | Hangarback Walker | 39.7 [32.2, 47.7] (n 150) | - (n 0) |
| 2 | `cast:38` | Stormchaser's Talent | 31.3 [24.4, 39.1] (n 150) | - (n 0) |

**d4** (turn 3, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:38` | Stormchaser's Talent | 36.0 [28.8, 43.9] (n 150) | - (n 0) |
| 1 | `pass` | pass | 34.7 [27.5, 42.6] (n 150) | - (n 0) |
| 2 | `cast:22` | Hangarback Walker | 36.7 [29.4, 44.6] (n 150) | - (n 0) |

**d9** (turn 6, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 10.7 [6.7, 16.6] (n 150) | - (n 0) |
| 1 | `block:86>56` | block Otter Token>Emmara, Soul of the Accord | 4.0 [1.1, 13.5] (n 50, stopped at 50) | - (n 0) |
| 2 | `block:22>56` | block Hangarback Walker>Emmara, Soul of the Accord | 15.3 [10.4, 22.0] (n 150) | - (n 0) |

**d10** (turn 7, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 20.0 [11.2, 33.0] (n 50) | - (n 0) |
| 1 | `attack:22,86` | attack Otter Token+Hangarback Walker | 18.0 [9.8, 30.8] (n 50) | - (n 0) |
| 2 | `attack:86` | attack Otter Token | 20.0 [11.2, 33.0] (n 50) | - (n 0) |
| 3 | `attack:22` | attack Hangarback Walker | 18.0 [9.8, 30.8] (n 50) | - (n 0) |

**d11** (turn 8, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 0.7 [0.1, 3.7] (n 148) | - (n 0) |
| 1 | `block:86>56` | block Otter Token>Emmara, Soul of the Accord | 2.1 [0.4, 10.9] (n 48, stopped at 50) | - (n 0) |
| 2 | `block:22>56` | block Hangarback Walker>Emmara, Soul of the Accord | 21.3 [15.5, 28.6] (n 148) | - (n 0) |

**d12** (turn 9, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 6.7 [3.7, 11.9] (n 149) | - (n 0) |
| 1 | `attack:22,86` | attack Otter Token+Hangarback Walker | 14.1 [9.4, 20.6] (n 149) | - (n 0) |
| 2 | `attack:86` | attack Otter Token | 9.0 [4.8, 16.2] (n 100, stopped at 100) | - (n 0) |
| 3 | `attack:22` | attack Hangarback Walker | 12.8 [8.3, 19.1] (n 149) | - (n 0) |

**d13** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:33` | Vendilion Clique | 4.7 [2.3, 9.3] (n 150) | - (n 0) |
| 1 | `pass` | pass | 5.3 [2.7, 10.2] (n 150) | - (n 0) |

**d14** (turn 11, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 8.0 [3.1, 18.8] (n 50) | - (n 0) |
| 1 | `attack:22` | attack Hangarback Walker | 8.0 [3.1, 18.8] (n 50) | - (n 0) |

**d15** (turn 12, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:22>43,33>49` | block Vendilion Clique>Badgermole Cub, Hangarback Walker>Sedge Troll | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:22>43` | block Hangarback Walker>Sedge Troll | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:33>49` | block Vendilion Clique>Badgermole Cub | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

3750 branch games (3 with an error, left out); 7 random and 0 Forge branches ended at the turn cap.

## Checks

131316 rows checked (ids against each seat's own frame log), 7502 frame logs through tools/check-redaction.mjs, 3750 forks checked (0 not the position), 11 no-leak checks (0 moved; the negative control moved in 11). The guardrails read back from 7500 random seats' logs: a land offered at 38877 of 502664 priority decisions and taken at 38877; 0 of 0 opening hands kept; G3 left out a repeated no-op 6478 time(s); G5 (D458): the engine refused 207 pick(s) it could not pay for, and 120 later offer(s) of them in the same priority window were left out; G6 (D471): 2679 pick(s) of the seats' own X plays had X drawn from 1 up, 50858 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games that errored

3 of 3750 branch game(s) errored and are left out of their option's value. By error text (ids as #):

| branch games | error |
|---|---|
| 3 | IndexOutOfBoundsException: Index # out of bounds for length # |

No option had more than 10.0% of its branch games errored.

### Branch games the turn cap ended

7 of 3750 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

