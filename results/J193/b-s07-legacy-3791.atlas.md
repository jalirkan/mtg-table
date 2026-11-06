# Move atlas: legacy-3691-00001 vs legacy-3691-00002, seed 3791

D451. Seat A is legacy-3691-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 26 turns, won by A, and listed 42 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d2 | 8 | p | 5 | 2 `cast:32`, 33.0 [22.7, 43.7] (n 150) | 2 `cast:32`, 12.5 [0.0, 32.5] (n 40) | 1.00 [-1.00, 1.00] | yes |
| d6 | 10 | p | 4 | 0 `cast:32`, 0.0 [0.0, 4.0] (n 50) | -, - (n 0) | - | - |
| d10 | 12 | p | 3 | 1 `cast:17`, 6.0 [0.0, 16.0] (n 150) | 0 `pass`, 0.0 [0.0, 0.0] (n 39) | -0.50 [-1.00, 0.87] | no |
| d13 | 12 | p | 3 | 0 `cast:40`, 0.0 [0.0, 7.3] (n 150) | 2 `activate:67`, 10.0 [0.0, 27.6] (n 40) | -0.50 [-1.00, 1.00] | no |
| d19 | 16 | p | 3 | 1 `cast:22`, 16.7 [10.7, 23.3] (n 150) | 1 `cast:22`, 2.5 [0.0, 10.0] (n 40) | 0.87 [0.00, 0.87] | yes |
| d23 | 18 | a | 8 | 2 `attack:4,9,17,21,40,84,91,92`, 5.3 [2.0, 8.7] (n 150) | 2 `attack:4,9,17,21,40,84,91,92`, 7.5 [0.0, 17.5] (n 40) | 1.00 [0.50, 1.00] | yes |
| d27 | 20 | p | 3 | 0 `cast:22`, 0.0 [0.0, 6.0] (n 50) | -, - (n 0) | - | - |
| d32 | 22 | p | 3 | 2 `cast:35`, 5.3 [0.7, 10.0] (n 150) | 0 `activate:22#0`, 0.0 [0.0, 0.0] (n 40) | - | no |
| d36 | 24 | a | 8 | 2 `attack:4,9,15,17,21,35,40,84,91,92,100,103`, 13.3 [8.7, 19.3] (n 150) | 0 `attack:35`, 0.0 [0.0, 0.0] (n 40) | - | no |
| d37 | 24 | p | 3 | 2 `cast:6`, 10.7 [6.0, 16.0] (n 150) | 0 `activate:22#0`, 0.0 [0.0, 0.0] (n 40) | - | no |
| d39 | 26 | p | 4 | 0 `cast:36`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d40 | 26 | p | 3 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d41 | 26 | a | 8 | 0 `attack:4,15,17,21,35,39,40,84,91,92,100,103,106`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

13 decision(s) branched, 8 of them in full (2 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 3: d41 (mean value 100.0%, replaced by d40), d40 (mean value 100.0%, replaced by d39), d39 (mean value 100.0%, replaced by d36). Early stopping at 50/100 random branches stopped 16 option(s): d2 o1 at 50, d2 o3 at 50, d2 o4 at 50, d23 o1 at 100, d23 o3 at 100, d23 o4 at 100, d23 o5 at 100, d23 o7 at 100, d32 o1 at 100, d37 o1 at 50, d36 o1 at 50, d36 o3 at 50, d36 o4 at 50, d36 o5 at 50, d36 o6 at 50, d36 o7 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 2. It stopped 2 (d6, d27), each a partial label at that n, never confident, saving at most 980 branch games; 0 it would have stopped played on to the full n as controls (none; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

Over 8 decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is 0.37 [-0.23, 0.97]; at 1 of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at 0 below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at 3 of 8 decision(s) (37.5% [13.7, 69.4]). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.

Where they disagree most:

- d10 (turn 12, p): rank correlation -0.50 [-1.00, 0.87]; random's best `cast:17`, Forge's best `pass`.
- d13 (turn 12, p): rank correlation -0.50 [-1.00, 1.00]; random's best `cast:40`, Forge's best `activate:67`.
- d19 (turn 16, p): rank correlation 0.87 [0.00, 0.87]; random's best `cast:22`, Forge's best `cast:22`.
- d2 (turn 8, p): rank correlation 1.00 [-1.00, 1.00]; random's best `cast:32`, Forge's best `cast:32`.
- d23 (turn 18, a): rank correlation 1.00 [0.50, 1.00]; random's best `attack:4,9,17,21,40,84,91,92`, Forge's best `attack:4,9,17,21,40,84,91,92`.

### Each decision's options, side by side

**d2** (turn 8, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:6` | Green Sun's Zenith | 30.0 [23.2, 37.8] (n 150) | 50.0 [35.2, 64.8] (n 40) |
| 1 | `pass` | pass | 16.0 [8.3, 28.5] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:32` | Pest Infestation | 63.0 [55.0, 70.3] (n 150) | 62.5 [47.0, 75.8] (n 40) |
| 3 | `cast:14` | Iron-Shield Elf | 14.0 [7.0, 26.2] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:4` | Evolved Sleeper | 26.0 [15.9, 39.6] (n 50, stopped at 50) | - (n 0) |

**d6** (turn 10, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:32` | Pest Infestation | 92.0 [81.2, 96.9] (n 50) | - (n 0) |
| 1 | `pass` | pass | 72.0 [58.3, 82.5] (n 50) | - (n 0) |
| 2 | `cast:4` | Evolved Sleeper | 78.0 [64.8, 87.3] (n 50) | - (n 0) |
| 3 | `cast:17` | Ledger Shredder | 82.0 [69.2, 90.2] (n 50) | - (n 0) |

**d10** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 70.7 [62.9, 77.4] (n 150) | 94.9 [83.1, 98.6] (n 39) |
| 1 | `cast:17` | Ledger Shredder | 76.7 [69.3, 82.7] (n 150) | 84.6 [70.3, 92.8] (n 39) |
| 2 | `cast:40` | Gravecrawler | 75.3 [67.9, 81.5] (n 150) | 59.0 [43.4, 72.9] (n 39) |

**d13** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:40` | Gravecrawler | 80.7 [73.6, 86.2] (n 150) | 72.5 [57.2, 83.9] (n 40) |
| 1 | `pass` | pass | 74.0 [66.4, 80.4] (n 150) | 75.0 [59.8, 85.8] (n 40) |
| 2 | `activate:67` | Wishclaw Talisman: {1}, {T}, Remove a wish counter from CARD | 77.3 [70.0, 83.3] (n 150) | 82.5 [68.0, 91.3] (n 40) |

**d19** (turn 16, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 81.3 [74.3, 86.8] (n 150) | 97.5 [87.1, 99.6] (n 40) |
| 1 | `cast:22` | Jace, Wielder of Mysteries | 98.0 [94.3, 99.3] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 2 | `cast:21` | Carnage Tyrant | 96.7 [92.4, 98.6] (n 150) | 97.5 [87.1, 99.6] (n 40) |

**d23** (turn 18, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:17` | attack Ledger Shredder | 94.7 [89.8, 97.3] (n 150) | 92.5 [80.1, 97.4] (n 40) |
| 1 | `attack:none` | attack none | 95.0 [88.8, 97.9] (n 100, stopped at 100) | - (n 0) |
| 2 | `attack:4,9,17,21,40,84,91,92` | attack Ledger Shredder+Hero Token+Pest Token+Pest Token+Evolved Sleeper+Gravecrawler+Exhibition Tidecaller+Carnage Tyrant | 100.0 [97.5, 100.0] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 3 | `attack:17,84` | attack Ledger Shredder+Hero Token | 96.0 [90.2, 98.4] (n 100, stopped at 100) | - (n 0) |
| 4 | `attack:17,91` | attack Ledger Shredder+Pest Token | 93.0 [86.3, 96.6] (n 100, stopped at 100) | - (n 0) |
| 5 | `attack:17,92` | attack Ledger Shredder+Pest Token | 93.0 [86.3, 96.6] (n 100, stopped at 100) | - (n 0) |
| 6 | `attack:4,17` | attack Ledger Shredder+Evolved Sleeper | 97.3 [93.3, 99.0] (n 150) | 95.0 [83.5, 98.6] (n 40) |
| 7 | `attack:17,40` | attack Ledger Shredder+Gravecrawler | 96.0 [90.2, 98.4] (n 100, stopped at 100) | - (n 0) |

**d27** (turn 20, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:22` | Jace, Wielder of Mysteries | 98.0 [89.5, 99.7] (n 50) | - (n 0) |
| 1 | `pass` | pass | 98.0 [89.5, 99.7] (n 50) | - (n 0) |
| 2 | `activate:18` | Zagoth Triome: Cycling {3} ({3}, Discard this card: Draw a c | 96.0 [86.5, 98.9] (n 50) | - (n 0) |

**d32** (turn 22, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:22#0` | Jace, Wielder of Mysteries: +1: Target player mills two card | 92.7 [87.4, 95.9] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `pass` | pass | 89.0 [81.4, 93.8] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:35` | Abhorrent Oculus | 98.0 [94.3, 99.3] (n 150) | 100.0 [91.2, 100.0] (n 40) |

**d36** (turn 24, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:35` | attack Abhorrent Oculus | 86.7 [80.3, 91.2] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `attack:none` | attack none | 86.0 [73.8, 93.0] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:4,9,15,17,21,35,40,84,91,92,100,103` | attack Abhorrent Oculus+Hero Token+Pest Token+Pest Token+Evolved Sleeper+Ledger Shredder+Gravecrawler+Exhibition Tidecaller+Carnage Tyrant+Beast Token+Beast Token+Rampaging Baloths | 100.0 [97.5, 100.0] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 3 | `attack:35,84` | attack Abhorrent Oculus+Hero Token | 90.0 [78.6, 95.7] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:35,91` | attack Abhorrent Oculus+Pest Token | 88.0 [76.2, 94.4] (n 50, stopped at 50) | - (n 0) |
| 5 | `attack:35,92` | attack Abhorrent Oculus+Pest Token | 88.0 [76.2, 94.4] (n 50, stopped at 50) | - (n 0) |
| 6 | `attack:4,35` | attack Abhorrent Oculus+Evolved Sleeper | 88.0 [76.2, 94.4] (n 50, stopped at 50) | - (n 0) |
| 7 | `attack:17,35` | attack Abhorrent Oculus+Ledger Shredder | 92.0 [81.2, 96.9] (n 50, stopped at 50) | - (n 0) |

**d37** (turn 24, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:22#0` | Jace, Wielder of Mysteries: +1: Target player mills two card | 89.3 [83.4, 93.3] (n 150) | 100.0 [91.2, 100.0] (n 40) |
| 1 | `pass` | pass | 82.0 [69.2, 90.2] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:6` | Green Sun's Zenith | 100.0 [97.5, 100.0] (n 150) | 100.0 [91.2, 100.0] (n 40) |

**d39** (turn 26, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:36` | Demonic Hordes | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:6` | Green Sun's Zenith | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:2` | Hedron Crab | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d40** (turn 26, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `cast:6` | Green Sun's Zenith | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:2` | Hedron Crab | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d41** (turn 26, a; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:4,15,17,21,35,39,40,84,91,92,100,103,106` | attack Abhorrent Oculus+Evolved Sleeper+Beast Token+Beast Token++Gravecrawler+Beast Token+Rampaging Baloths+Ledger Shredder+Hero Token+Carnage Tyrant+Pest Token+Pest Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:none` | attack none | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:4,9,15,17,21,35,39,40,84,91,92,100,103,106` | attack Abhorrent Oculus+Evolved Sleeper+Beast Token+Beast Token++Gravecrawler+Beast Token+Rampaging Baloths+Ledger Shredder+Hero Token+Carnage Tyrant+Pest Token+Pest Token+Exhibition Tidecaller | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:4,15,17,21,39,40,84,91,92,100,103,106` | attack Evolved Sleeper+Beast Token+Beast Token++Gravecrawler+Beast Token+Rampaging Baloths+Ledger Shredder+Hero Token+Carnage Tyrant+Pest Token+Pest Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:15,17,21,35,39,40,84,91,92,100,103,106` | attack Abhorrent Oculus+Beast Token+Beast Token++Gravecrawler+Beast Token+Rampaging Baloths+Ledger Shredder+Hero Token+Carnage Tyrant+Pest Token+Pest Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:4,15,17,21,35,39,40,84,91,92,103,106` | attack Abhorrent Oculus+Evolved Sleeper+Beast Token++Gravecrawler+Beast Token+Rampaging Baloths+Ledger Shredder+Hero Token+Carnage Tyrant+Pest Token+Pest Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:4,15,17,21,35,39,40,84,91,92,100,106` | attack Abhorrent Oculus+Evolved Sleeper+Beast Token++Gravecrawler+Beast Token+Rampaging Baloths+Ledger Shredder+Hero Token+Carnage Tyrant+Pest Token+Pest Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `attack:4,15,17,21,35,40,84,91,92,100,103,106` | attack Abhorrent Oculus+Evolved Sleeper+Beast Token+Beast Token+Gravecrawler+Beast Token+Rampaging Baloths+Ledger Shredder+Hero Token+Carnage Tyrant+Pest Token+Pest Token | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

5625 branch games (1 with an error, left out; 1 of them engine errors, a Java Error such as OutOfMemoryError (D465)); 1 random and 0 Forge branches ended at the turn cap.

## Checks

113961 rows checked (ids against each seat's own frame log), 11252 frame logs through tools/check-redaction.mjs, 5625 forks checked (0 not the position), 21 no-leak checks (0 moved; the negative control moved in 21). The guardrails read back from 9650 random seats' logs: a land offered at 18609 of 197092 priority decisions and taken at 18609; 0 of 0 opening hands kept; G3 left out a repeated no-op 1744 time(s); G5 (D458): the engine refused 255 pick(s) it could not pay for, and 151 later offer(s) of them in the same priority window were left out; G6 (D471): 437 pick(s) of the seats' own X plays had X drawn from 1 up, 13861 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games that errored

1 of 5625 branch game(s) errored and are left out of their option's value. By error text (ids as #):

| branch games | error |
|---|---|
| 1 | BranchTimeout: the branch's deadline passed inside one engine step (# events into its play) at turn # COMBAT_BEGIN, step # |

No option had more than 10.0% of its branch games errored.

### Branch games the turn cap ended

1 of 5625 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

