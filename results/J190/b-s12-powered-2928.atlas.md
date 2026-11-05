# Move atlas: powered-2828-00001 vs powered-2828-00002, seed 2928

D451. Seat A is powered-2828-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 18 turns, won by B, and listed 18 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 3 | p | 2 | 0 `pass`, 0.0 [0.0, 4.0] (n 150) | -, - (n 0) | - | - |
| d1 | 3 | p | 2 | 0 `cast:20`, 0.0 [0.0, 17.0] (n 50) | -, - (n 0) | - | - |
| d2 | 5 | p | 2 | 1 `cast:20`, 9.3 [0.7, 18.0] (n 150) | -, - (n 0) | - | - |
| d3 | 5 | p | 2 | 1 `pass`, 4.0 [0.0, 11.0] (n 150) | -, - (n 0) | - | - |
| d4 | 13 | p | 3 | 0 `pass`, 0.0 [0.0, 9.0] (n 50) | -, - (n 0) | - | - |
| d5 | 13 | p | 3 | 0 `cast:1`, 0.0 [0.0, 10.0] (n 50) | -, - (n 0) | - | - |
| d6 | 15 | p | 6 | 1 `pass`, 4.0 [2.0, 16.0] (n 25) | -, - (n 0) | - | - |
| d7 | 15 | p | 5 | 0 `pass`, 0.0 [0.0, 4.0] (n 150) | -, - (n 0) | - | - |
| d8 | 15 | a | 2 | 0 `attack:none`, 0.0 [0.0, 4.0] (n 50) | -, - (n 0) | - | - |
| d9 | 15 | p | 5 | 1 `pass`, 4.0 [0.0, 14.0] (n 25) | -, - (n 0) | - | - |
| d10 | 15 | p | 2 | 0 `cast:4`, 0.0 [0.0, 3.3] (n 150) | -, - (n 0) | - | - |
| d11 | 16 | b | 5 | 2 `block:4>75`, 6.0 [4.0, 16.0] (n 25) | -, - (n 0) | - | - |
| d12 | 17 | p | 4 | 2 `cast:38`, 2.0 [0.0, 6.0] (n 25) | -, - (n 0) | - | - |
| d13 | 17 | p | 3 | 0 `pass`, 0.0 [0.0, 6.0] (n 25) | -, - (n 0) | - | - |
| d14 | 17 | a | 5 | 1 `attack:1,3,4`, 2.0 [0.0, 8.0] (n 25) | -, - (n 0) | - | - |
| d15 | 17 | p | 3 | 2 `cast:38`, 8.0 [0.0, 18.0] (n 25) | -, - (n 0) | - | - |
| d16 | 17 | p | 2 | 0 `cast:12`, 0.0 [0.0, 5.0] (n 50) | -, - (n 0) | - | - |
| d17 | 18 | b | 4 | 0 `block:3>65,4>75`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

18 decision(s) branched, 5 of them in full (5 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 8: d6 (mean value 2.3%, replaced by d8), d9 (mean value 3.6%, replaced by d10), d12 (mean value 0.5%, replaced by d11), d13 (mean value 2.0%, replaced by d3), d14 (mean value 0.8%, replaced by d2), d15 (mean value 2.7%, replaced by d0), d17 (mean value 0.0%, replaced by d1), d11 (mean value 3.2%, replaced by d16). Early stopping at 50/100 random branches stopped 1 option(s): d0 o1 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 6. It stopped 5 (d4, d5, d8, d16, d1), each a partial label at that n, never confident, saving at most 1200 branch games; 1 it would have stopped played on to the full n as controls (d0; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 3, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 37.3 [30.0, 45.3] (n 150) | - (n 0) |
| 1 | `cast:20` | Inti, Seneschal of the Sun | 28.0 [17.5, 41.7] (n 50, stopped at 50) | - (n 0) |

**d1** (turn 3, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:20` | Inti, Seneschal of the Sun | 35.0 [23.3, 48.9] (n 50) | - (n 0) |
| 1 | `pass` | pass | 35.0 [23.3, 48.9] (n 50) | - (n 0) |

**d2** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 24.0 [17.9, 31.4] (n 150) | - (n 0) |
| 1 | `cast:20` | Inti, Seneschal of the Sun | 33.3 [26.3, 41.2] (n 150) | - (n 0) |

**d3** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:20` | Inti, Seneschal of the Sun | 28.0 [21.4, 35.7] (n 150) | - (n 0) |
| 1 | `pass` | pass | 32.0 [25.1, 39.8] (n 150) | - (n 0) |

**d4** (turn 13, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 26.0 [15.9, 39.6] (n 50) | - (n 0) |
| 1 | `cast:4` | Shi'ar Soldier | 20.0 [11.2, 33.0] (n 50) | - (n 0) |
| 2 | `cast:1` | Sage of the Skies | 19.0 [10.5, 31.9] (n 50) | - (n 0) |

**d5** (turn 13, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Sage of the Skies | 29.0 [18.3, 42.7] (n 50) | - (n 0) |
| 1 | `pass` | pass | 23.0 [13.5, 36.3] (n 50) | - (n 0) |
| 2 | `cast:4` | Shi'ar Soldier | 14.0 [7.0, 26.2] (n 50) | - (n 0) |

**d6** (turn 15, p; option 0 is Forge's answer) -- settled by the screen (mean value 2.3%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:7` | Marsh Flats: {T}, Pay 1 life, Sacrifice CARDNAME: Search you | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 2 | `cast:4` | Shi'ar Soldier | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `cast:38` | Prismari Command | 2.0 [0.2, 16.6] (n 25) | - (n 0) |
| 4 | `cast:3` | Sedge Troll | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 5 | `cast:22` | Mystic Forge | 4.0 [0.7, 19.5] (n 25) | - (n 0) |

**d7** (turn 15, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 5.0 [2.5, 9.8] (n 150) | - (n 0) |
| 1 | `cast:4` | Shi'ar Soldier | 5.0 [2.5, 9.8] (n 150) | - (n 0) |
| 2 | `cast:38` | Prismari Command | 4.0 [1.8, 8.5] (n 150) | - (n 0) |
| 3 | `cast:3` | Sedge Troll | 2.3 [0.9, 6.2] (n 150) | - (n 0) |
| 4 | `cast:22` | Mystic Forge | 3.3 [1.4, 7.6] (n 150) | - (n 0) |

**d8** (turn 15, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 8.0 [3.1, 18.8] (n 50) | - (n 0) |
| 1 | `attack:1` | attack Sage of the Skies | 4.0 [1.1, 13.5] (n 50) | - (n 0) |

**d9** (turn 15, p; option 0 is Forge's answer) -- settled by the screen (mean value 3.6%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:3` | Sedge Troll | 2.0 [0.2, 16.6] (n 25) | - (n 0) |
| 1 | `pass` | pass | 6.0 [1.4, 22.3] (n 25) | - (n 0) |
| 2 | `cast:4` | Shi'ar Soldier | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 3 | `cast:38` | Prismari Command | 6.0 [1.4, 22.3] (n 25) | - (n 0) |
| 4 | `cast:22` | Mystic Forge | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d10** (turn 15, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:4` | Shi'ar Soldier | 4.3 [2.1, 8.9] (n 150) | - (n 0) |
| 1 | `pass` | pass | 4.0 [1.8, 8.5] (n 150) | - (n 0) |

**d11** (turn 16, b; option 0 is Forge's answer) -- settled by the screen (mean value 3.2%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:1>75` | block Sage of the Skies>Wan Shi Tong, All-Knowing | 2.0 [0.2, 16.6] (n 25) | - (n 0) |
| 2 | `block:4>75` | block Shi'ar Soldier>Wan Shi Tong, All-Knowing | 6.0 [1.4, 22.3] (n 25) | - (n 0) |
| 3 | `block:1>43` | block Sage of the Skies>Brazen Borrower | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 4 | `block:4>43` | block Shi'ar Soldier>Brazen Borrower | 4.0 [0.7, 19.5] (n 25) | - (n 0) |

**d12** (turn 17, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.5%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:15` | Verdant Catacombs: {T}, Pay 1 life, Sacrifice CARDNAME: Sear | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:38` | Prismari Command | 2.0 [0.2, 16.6] (n 25) | - (n 0) |
| 3 | `cast:22` | Mystic Forge | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d13** (turn 17, p; option 0 is Forge's answer) -- settled by the screen (mean value 2.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 2.0 [0.2, 16.6] (n 25) | - (n 0) |
| 1 | `cast:38` | Prismari Command | 2.0 [0.2, 16.6] (n 25) | - (n 0) |
| 2 | `cast:22` | Mystic Forge | 2.0 [0.2, 16.6] (n 25) | - (n 0) |

**d14** (turn 17, a; option 0 is Forge's answer) -- settled by the screen (mean value 0.8%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:1,3,4` | attack Sage of the Skies+Sedge Troll+Shi'ar Soldier | 2.0 [0.2, 16.6] (n 25) | - (n 0) |
| 2 | `attack:1` | attack Sage of the Skies | 2.0 [0.2, 16.6] (n 25) | - (n 0) |
| 3 | `attack:3` | attack Sedge Troll | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `attack:4` | attack Shi'ar Soldier | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d15** (turn 17, p; option 0 is Forge's answer) -- settled by the screen (mean value 2.7%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:22` | Mystic Forge | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:38` | Prismari Command | 8.0 [2.2, 25.0] (n 25) | - (n 0) |

**d16** (turn 17, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:12` | Shadowspear (may play) | 3.0 [0.7, 12.0] (n 50) | - (n 0) |
| 1 | `pass` | pass | 2.0 [0.4, 10.5] (n 50) | - (n 0) |

**d17** (turn 18, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:3>65,4>75` | block Sedge Troll>Venser, Shaper Savant, Shi'ar Soldier>Wan Shi Tong, All-Knowing | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:4>75` | block Shi'ar Soldier>Wan Shi Tong, All-Knowing | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:3>65` | block Sedge Troll>Venser, Shaper Savant | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

3325 branch games (0 with an error, left out); 174 random and 0 Forge branches ended at the turn cap.

## Checks

94745 rows checked (ids against each seat's own frame log), 6652 frame logs through tools/check-redaction.mjs, 3325 forks checked (0 not the position), 18 no-leak checks (0 moved; the negative control moved in 18). The guardrails read back from 6650 random seats' logs: a land offered at 34832 of 355794 priority decisions and taken at 34832; 0 of 0 opening hands kept; G3 left out a repeated no-op 2194 time(s); G5 (D458): the engine refused 41 pick(s) it could not pay for, and 20 later offer(s) of them in the same priority window were left out; G6 (D471): 1381 pick(s) of the seats' own X plays had X drawn from 1 up, 110680 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

174 of 3325 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

