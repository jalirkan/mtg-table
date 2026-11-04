# Move atlas: powered-2477-00001 vs powered-2477-00002, seed 2577

D451. Seat A is powered-2477-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 15 turns, won by B, and listed 20 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 2 | p | 2 | 0 `pass`, 0.0 [0.0, 8.7] (n 149) | -, - (n 0) | - | - |
| d4 | 5 | b | 2 | 1 `block:18>65`, 8.7 [0.7, 18.0] (n 150) | -, - (n 0) | - | - |
| d8 | 8 | p | 3 | 1 `cast:28`, 10.0 [4.7, 16.7] (n 150) | -, - (n 0) | - | - |
| d9 | 8 | a | 4 | 0 `attack:none`, 0.0 [0.0, 11.0] (n 50) | -, - (n 0) | - | - |
| d11 | 8 | p | 2 | 0 `cast:28`, 0.0 [0.0, 10.0] (n 50) | -, - (n 0) | - | - |
| d12 | 9 | b | 7 | 5 `block:82>43,17>59,18>59,24>59`, 18.7 [12.0, 26.0] (n 150) | -, - (n 0) | - | - |
| d13 | 10 | p | 3 | 0 `activate:5`, 0.0 [0.0, 4.0] (n 150) | -, - (n 0) | - | - |
| d15 | 10 | a | 5 | 1 `attack:none`, 0.7 [0.0, 8.0] (n 150) | -, - (n 0) | - | - |
| d17 | 12 | a | 5 | 2 `attack:17`, 5.3 [2.3, 11.0] (n 150) | -, - (n 0) | - | - |
| d19 | 14 | a | 2 | 0 `attack:39`, 0.0 [0.0, 0.0] (n 50) | -, - (n 0) | - | - |

### The cut design (D480)

10 decision(s) branched, 7 of them in full (3 more stopped by the futility rule, D489); picked among those with 3 or more options first (4 filled from the rest). The screen at 25 random branches settled 0: none. Early stopping at 50/100 random branches stopped 4 option(s): d12 o1 at 50, d12 o2 at 50, d12 o3 at 50, d12 o4 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 3. It stopped 3 (d9, d11, d19), each a partial label at that n, never confident, saving at most 800 branch games; 0 it would have stopped played on to the full n as controls (none; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 2, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 59.1 [51.0, 66.6] (n 149) | - (n 0) |
| 1 | `cast:18` | Hangarback Walker | 59.1 [51.0, 66.6] (n 149) | - (n 0) |

**d4** (turn 5, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 44.7 [36.9, 52.7] (n 150) | - (n 0) |
| 1 | `block:18>65` | block Hangarback Walker>Fear of Missing Out | 53.3 [45.4, 61.1] (n 150) | - (n 0) |

**d8** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 14.7 [9.9, 21.2] (n 150) | - (n 0) |
| 1 | `cast:28` | Pest Infestation | 24.7 [18.5, 32.1] (n 150) | - (n 0) |
| 2 | `cast:17` | Giver of Runes | 18.7 [13.2, 25.7] (n 150) | - (n 0) |

**d9** (turn 8, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 26.0 [15.9, 39.6] (n 50) | - (n 0) |
| 1 | `attack:18,24` | attack Hangarback Walker+Goblin Engineer | 23.0 [13.5, 36.3] (n 50) | - (n 0) |
| 2 | `attack:18` | attack Hangarback Walker | 16.0 [8.3, 28.5] (n 50) | - (n 0) |
| 3 | `attack:24` | attack Goblin Engineer | 22.0 [12.8, 35.2] (n 50) | - (n 0) |

**d11** (turn 8, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:28` | Pest Infestation | 22.0 [12.8, 35.2] (n 50) | - (n 0) |
| 1 | `pass` | pass | 22.0 [12.8, 35.2] (n 50) | - (n 0) |

**d12** (turn 9, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:82>43,18>59,24>59` | block Pest Token>Ball Lightning, Hangarback Walker>Super Shredder, Goblin Engineer>Super Shredder | 8.7 [5.1, 14.3] (n 150) | - (n 0) |
| 1 | `block:none` | block none | 4.0 [1.1, 13.5] (n 50, stopped at 50) | - (n 0) |
| 2 | `block:18>59,24>59` | block Hangarback Walker>Super Shredder, Goblin Engineer>Super Shredder | 12.0 [5.6, 23.8] (n 50, stopped at 50) | - (n 0) |
| 3 | `block:17>43,82>43,18>59,24>59` | block Pest Token>Ball Lightning, Hangarback Walker>Super Shredder, Goblin Engineer>Super Shredder, Giver of Runes>Ball Lightning | 8.0 [3.1, 18.8] (n 50, stopped at 50) | - (n 0) |
| 4 | `block:82>43,83>43,18>59,24>59` | block Pest Token>Ball Lightning, Hangarback Walker>Super Shredder, Goblin Engineer>Super Shredder, Pest Token>Ball Lightning | 8.0 [3.1, 18.8] (n 50, stopped at 50) | - (n 0) |
| 5 | `block:82>43,17>59,18>59,24>59` | block Pest Token>Ball Lightning, Hangarback Walker>Super Shredder, Goblin Engineer>Super Shredder, Giver of Runes>Super Shredder | 27.3 [20.8, 35.0] (n 150) | - (n 0) |
| 6 | `block:82>43,18>59,24>59,83>59` | block Pest Token>Ball Lightning, Hangarback Walker>Super Shredder, Goblin Engineer>Super Shredder, Pest Token>Super Shredder | 27.3 [20.8, 35.0] (n 150) | - (n 0) |

**d13** (turn 10, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:5` | Sunbaked Canyon: {1}, {T}, Sacrifice CARDNAME: Draw a card. | 12.0 [7.7, 18.2] (n 150) | - (n 0) |
| 1 | `pass` | pass | 9.3 [5.6, 15.1] (n 150) | - (n 0) |
| 2 | `cast:1` | Garruk Wildspeaker | 12.0 [7.7, 18.2] (n 150) | - (n 0) |

**d15** (turn 10, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:83,86` | attack Pest Token+Thopter Token | 19.3 [13.8, 26.4] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 20.0 [14.4, 27.1] (n 150) | - (n 0) |
| 2 | `attack:17,83,86` | attack Pest Token+Thopter Token+Giver of Runes | 19.3 [13.8, 26.4] (n 150) | - (n 0) |
| 3 | `attack:86` | attack Thopter Token | 17.3 [12.1, 24.2] (n 150) | - (n 0) |
| 4 | `attack:83` | attack Pest Token | 20.0 [14.4, 27.1] (n 150) | - (n 0) |

**d17** (turn 12, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 6.3 [3.4, 11.4] (n 150) | - (n 0) |
| 1 | `attack:17,83,86` | attack Giver of Runes+Pest Token+Thopter Token | 10.7 [6.7, 16.6] (n 150) | - (n 0) |
| 2 | `attack:17` | attack Giver of Runes | 11.7 [7.5, 17.8] (n 150) | - (n 0) |
| 3 | `attack:83` | attack Pest Token | 10.7 [6.7, 16.6] (n 150) | - (n 0) |
| 4 | `attack:86` | attack Thopter Token | 6.0 [3.2, 11.0] (n 150) | - (n 0) |

**d19** (turn 14, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:39` | attack Figure of Fable | 4.0 [1.1, 13.5] (n 50) | - (n 0) |
| 1 | `attack:none` | attack none | 4.0 [1.1, 13.5] (n 50) | - (n 0) |

4050 branch games (1 with an error, left out; 1 of them engine errors, a Java Error such as OutOfMemoryError (D465)); 2 random and 0 Forge branches ended at the turn cap.

## Checks

90622 rows checked (ids against each seat's own frame log), 8102 frame logs through tools/check-redaction.mjs, 4050 forks checked (0 not the position), 10 no-leak checks (0 moved; the negative control moved in 10). The guardrails read back from 8100 random seats' logs: a land offered at 24514 of 181979 priority decisions and taken at 24514; 0 of 0 opening hands kept; G3 left out a repeated no-op 742 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 688 pick(s) of the seats' own X plays had X drawn from 1 up, 14904 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games that errored

1 of 4050 branch game(s) errored and are left out of their option's value. By error text (ids as #):

| branch games | error |
|---|---|
| 1 | BranchTimeout: the branch's deadline passed inside one engine step (# events into its play) at turn # UPKEEP, step # |

No option had more than 10.0% of its branch games errored.

### Branch games the turn cap ended

2 of 4050 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

