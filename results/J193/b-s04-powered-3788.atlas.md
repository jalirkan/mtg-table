# Move atlas: powered-3688-00001 vs powered-3688-00002, seed 3788

D451. Seat A is powered-3688-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 23 turns, won by A, and listed 29 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d1 | 3 | p | 3 | 1 `cast:2`, 4.0 [0.0, 15.3] (n 150) | -, - (n 0) | - | - |
| d9 | 11 | p | 3 | 1 `cast:30`, 9.3 [0.0, 19.3] (n 150) | -, - (n 0) | - | - |
| d11 | 11 | p | 3 | 0 `cast:30`, 0.0 [0.0, 2.0] (n 50) | -, - (n 0) | - | - |
| d12 | 13 | a | 4 | 0 `attack:none`, 0.0 [0.0, 10.0] (n 50) | -, - (n 0) | - | - |
| d13 | 15 | p | 2 | 0 `cast:5`, 0.0 [0.0, 0.0] (n 150) | -, - (n 0) | - | - |
| d14 | 15 | a | 5 | 3 `attack:36,128`, 1.3 [0.0, 10.0] (n 150) | -, - (n 0) | - | - |
| d15 | 17 | p | 2 | 1 `cast:20`, 14.0 [6.7, 21.3] (n 150) | -, - (n 0) | - | - |
| d16 | 17 | a | 5 | 2 `attack:30,36,128`, 9.3 [3.3, 16.0] (n 150) | -, - (n 0) | - | - |
| d17 | 17 | p | 2 | 0 `cast:20`, 0.0 [0.0, 0.0] (n 150) | -, - (n 0) | - | - |
| d18 | 19 | p | 3 | 2 `cast:38`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d19 | 19 | p | 3 | 2 `cast:24`, 2.7 [0.0, 6.0] (n 150) | -, - (n 0) | - | - |
| d20 | 19 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d21 | 19 | a | 5 | 0 `attack:20,128`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d22 | 19 | p | 2 | 0 `cast:24`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d23 | 21 | p | 3 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d24 | 21 | a | 4 | 1 `attack:15,20,30,128`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d25 | 21 | p | 4 | 0 `cast:21`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d26 | 21 | p | 4 | 1 `pass`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d27 | 23 | p | 6 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d28 | 23 | a | 8 | 0 `attack:3,6,13,15,16,17,20,21,25,28,33,34,128`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

20 decision(s) branched, 8 of them in full (2 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 10: d18 (mean value 97.3%, replaced by d19), d21 (mean value 100.0%, replaced by d24), d23 (mean value 98.7%, replaced by d9), d25 (mean value 98.0%, replaced by d22), d26 (mean value 99.0%, replaced by d13), d28 (mean value 100.0%, replaced by d15), d24 (mean value 98.0%, replaced by d27), d27 (mean value 100.0%, replaced by d14), d22 (mean value 100.0%, replaced by d20), d20 (mean value 100.0%, replaced by d17). Early stopping at 50/100 random branches stopped 6 option(s): d16 o1 at 50, d19 o1 at 100, d14 o1 at 50, d9 o2 at 50, d17 o1 at 100, d13 o1 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 4. It stopped 2 (d11, d12), each a partial label at that n, never confident, saving at most 700 branch games; 2 it would have stopped played on to the full n as controls (d17, d13; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d1** (turn 3, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 67.3 [59.5, 74.3] (n 150) | - (n 0) |
| 1 | `cast:2` | Crusade | 71.3 [63.6, 78.0] (n 150) | - (n 0) |
| 2 | `cast:36` | Welcoming Vampire | 68.0 [60.2, 74.9] (n 150) | - (n 0) |

**d9** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 35.3 [28.1, 43.3] (n 150) | - (n 0) |
| 1 | `cast:30` | Wistfulness | 44.7 [36.9, 52.7] (n 150) | - (n 0) |
| 2 | `cast:30` | Wistfulness | 20.0 [11.2, 33.0] (n 50, stopped at 50) | - (n 0) |

**d11** (turn 11, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:30` | Wistfulness | 36.0 [24.1, 49.9] (n 50) | - (n 0) |
| 1 | `pass` | pass | 22.0 [12.8, 35.2] (n 50) | - (n 0) |
| 2 | `cast:30` | Wistfulness | 18.0 [9.8, 30.8] (n 50) | - (n 0) |

**d12** (turn 13, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 26.0 [15.9, 39.6] (n 50) | - (n 0) |
| 1 | `attack:30,36` | attack Welcoming Vampire+Wistfulness | 20.0 [11.2, 33.0] (n 50) | - (n 0) |
| 2 | `attack:36` | attack Welcoming Vampire | 16.0 [8.3, 28.5] (n 50) | - (n 0) |
| 3 | `attack:30` | attack Wistfulness | 20.0 [11.2, 33.0] (n 50) | - (n 0) |

**d13** (turn 15, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:5` | Kaldra Compleat | 66.7 [58.8, 73.7] (n 150) | - (n 0) |
| 1 | `pass` | pass | 28.0 [17.5, 41.7] (n 50, stopped at 50) | - (n 0) |

**d14** (turn 15, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:128` | attack Phyrexian Germ Token | 80.7 [73.6, 86.2] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 50.0 [36.6, 63.4] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:30,36,128` | attack Phyrexian Germ Token+Welcoming Vampire+Wistfulness | 76.7 [69.3, 82.7] (n 150) | - (n 0) |
| 3 | `attack:36,128` | attack Phyrexian Germ Token+Welcoming Vampire | 82.0 [75.1, 87.3] (n 150) | - (n 0) |
| 4 | `attack:30,128` | attack Phyrexian Germ Token+Wistfulness | 82.0 [75.1, 87.3] (n 150) | - (n 0) |

**d15** (turn 17, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 80.0 [72.9, 85.6] (n 150) | - (n 0) |
| 1 | `cast:20` | Ursine Monstrosity | 94.0 [89.0, 96.8] (n 150) | - (n 0) |

**d16** (turn 17, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:128` | attack Phyrexian Germ Token | 80.7 [73.6, 86.2] (n 150) | - (n 0) |
| 1 | `attack:none` | attack none | 64.0 [50.1, 75.9] (n 50, stopped at 50) | - (n 0) |
| 2 | `attack:30,36,128` | attack Phyrexian Germ Token+Welcoming Vampire+Wistfulness | 90.0 [84.2, 93.8] (n 150) | - (n 0) |
| 3 | `attack:36,128` | attack Phyrexian Germ Token+Welcoming Vampire | 82.0 [75.1, 87.3] (n 150) | - (n 0) |
| 4 | `attack:30,128` | attack Phyrexian Germ Token+Wistfulness | 86.0 [79.5, 90.7] (n 150) | - (n 0) |

**d17** (turn 17, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:20` | Ursine Monstrosity | 92.0 [86.5, 95.4] (n 150) | - (n 0) |
| 1 | `pass` | pass | 71.0 [61.5, 79.0] (n 100, stopped at 100) | - (n 0) |

**d18** (turn 19, p; option 0 is Forge's answer) -- settled by the screen (mean value 97.3%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:15` | Biotech Specialist | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 2 | `cast:38` | Grizzly Fate | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d19** (turn 19, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:143` | Lander Token: {2}, {T}, Sacrifice CARDNAME: Search your libr | 95.3 [90.7, 97.7] (n 150) | - (n 0) |
| 1 | `pass` | pass | 94.0 [87.5, 97.2] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:24` | Jayemdae Tome | 98.0 [94.3, 99.3] (n 150) | - (n 0) |

**d20** (turn 19, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `cast:24` | Jayemdae Tome | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d21** (turn 19, a; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:20,128` | attack Phyrexian Germ Token+Ursine Monstrosity | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:20,30,36,128` | attack Phyrexian Germ Token+Ursine Monstrosity+Welcoming Vampire+Wistfulness | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:20` | attack Ursine Monstrosity | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:20,36,128` | attack Phyrexian Germ Token+Ursine Monstrosity+Welcoming Vampire | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:20,30,128` | attack Phyrexian Germ Token+Ursine Monstrosity+Wistfulness | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d22** (turn 19, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:24` | Jayemdae Tome | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d23** (turn 21, p; option 0 is Forge's answer) -- settled by the screen (mean value 98.7%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `cast:38` | Grizzly Fate | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:21` | Torsten, Founder of Benalia | 96.0 [80.5, 99.3] (n 25) | - (n 0) |

**d24** (turn 21, a; option 0 is Forge's answer) -- settled by the screen (mean value 98.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:20,30,128` | attack Phyrexian Germ Token+Ursine Monstrosity+Wistfulness | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `attack:15,20,30,128` | attack Phyrexian Germ Token+Ursine Monstrosity+Wistfulness+Biotech Specialist | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:20,30` | attack Ursine Monstrosity+Wistfulness | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 3 | `attack:20,128` | attack Phyrexian Germ Token+Ursine Monstrosity | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d25** (turn 21, p; option 0 is Forge's answer) -- settled by the screen (mean value 98.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:21` | Torsten, Founder of Benalia | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `pass` | pass | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 2 | `activate:24` | Jayemdae Tome: {4}, {T}: Draw a card. | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 3 | `cast:38` | Grizzly Fate | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d26** (turn 21, p; option 0 is Forge's answer) -- settled by the screen (mean value 99.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:1` | Phlage, Titan of Fire's Fury | 96.0 [80.5, 99.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:18` | Eidolon of the Great Revel | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:7` | Brimaz, King of Oreskos | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d27** (turn 23, p; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `cast:26` | Omnath, Locus of Rage | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `cast:18` | Eidolon of the Great Revel | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `cast:38` | Grizzly Fate | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `cast:7` | Brimaz, King of Oreskos | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `cast:1` | Phlage, Titan of Fire's Fury | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

**d28** (turn 23, a; option 0 is Forge's answer) -- settled by the screen (mean value 100.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:3,6,13,15,16,17,20,21,25,28,33,34,128` | attack Phyrexian Germ Token+Plains+Plains+Sunbaked Canyon+Swamp+Restless Prairie+Biotech Specialist+Blood Crypt+Blightstep Pathway+Ursine Monstrosity+Torsten, Founder of Benalia+Watery Grave+Forest | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 1 | `attack:3,6,13,15,16,17,20,21,25,28,33,34` | attack Plains+Plains+Sunbaked Canyon+Swamp+Restless Prairie+Biotech Specialist+Blood Crypt+Blightstep Pathway+Ursine Monstrosity+Torsten, Founder of Benalia+Watery Grave+Forest | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 2 | `attack:3,6,13,15,16,17,20,21,25,28,34,128` | attack Phyrexian Germ Token+Plains+Sunbaked Canyon+Swamp+Restless Prairie+Biotech Specialist+Blood Crypt+Blightstep Pathway+Ursine Monstrosity+Torsten, Founder of Benalia+Watery Grave+Forest | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 3 | `attack:3,6,13,15,16,17,20,21,25,28,33,128` | attack Phyrexian Germ Token+Plains+Sunbaked Canyon+Swamp+Restless Prairie+Biotech Specialist+Blood Crypt+Blightstep Pathway+Ursine Monstrosity+Torsten, Founder of Benalia+Watery Grave+Forest | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 4 | `attack:6,13,15,16,17,20,21,25,28,33,34,128` | attack Phyrexian Germ Token+Plains+Plains+Swamp+Restless Prairie+Biotech Specialist+Blood Crypt+Blightstep Pathway+Ursine Monstrosity+Torsten, Founder of Benalia+Watery Grave+Forest | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 5 | `attack:3,13,15,16,17,20,21,25,28,33,34,128` | attack Phyrexian Germ Token+Plains+Plains+Sunbaked Canyon+Restless Prairie+Biotech Specialist+Blood Crypt+Blightstep Pathway+Ursine Monstrosity+Torsten, Founder of Benalia+Watery Grave+Forest | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 6 | `attack:3,6,15,16,17,20,21,25,28,33,34,128` | attack Phyrexian Germ Token+Plains+Plains+Sunbaked Canyon+Swamp+Biotech Specialist+Blood Crypt+Blightstep Pathway+Ursine Monstrosity+Torsten, Founder of Benalia+Watery Grave+Forest | 100.0 [86.7, 100.0] (n 25) | - (n 0) |
| 7 | `attack:3,6,13,16,17,20,21,25,28,33,34,128` | attack Phyrexian Germ Token+Plains+Plains+Sunbaked Canyon+Swamp+Restless Prairie+Blood Crypt+Blightstep Pathway+Ursine Monstrosity+Torsten, Founder of Benalia+Watery Grave+Forest | 100.0 [86.7, 100.0] (n 25) | - (n 0) |

4625 branch games (0 with an error, left out); 0 random and 0 Forge branches ended at the turn cap.

## Checks

77942 rows checked (ids against each seat's own frame log), 9252 frame logs through tools/check-redaction.mjs, 4625 forks checked (0 not the position), 20 no-leak checks (0 moved; the negative control moved in 20). The guardrails read back from 9250 random seats' logs: a land offered at 20333 of 132244 priority decisions and taken at 20333; 0 of 0 opening hands kept; G3 left out a repeated no-op 158 time(s); G5 (D458): the engine refused 28 pick(s) it could not pay for, and 19 later offer(s) of them in the same priority window were left out; G6 (D471): 1506 pick(s) of the seats' own X plays had X drawn from 1 up, 37707 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

