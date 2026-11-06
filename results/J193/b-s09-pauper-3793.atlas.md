# Move atlas: pauper-3693-00001 vs pauper-3693-00002, seed 3793

D451. Seat A is pauper-3693-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 19 turns, won by B, and listed 37 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 2 | p | 3 | 1 `pass`, 8.7 [0.0, 18.0] (n 150) | -, - (n 0) | - | - |
| d4 | 6 | p | 3 | 0 `activate:29#0`, 0.0 [0.0, 3.3] (n 150) | -, - (n 0) | - | - |
| d14 | 10 | p | 3 | 0 `cast:12`, 0.0 [0.0, 1.7] (n 150) | -, - (n 0) | - | - |
| d16 | 12 | p | 6 | 2 `cast:23`, 20.7 [11.0, 30.7] (n 150) | -, - (n 0) | - | - |
| d19 | 12 | p | 4 | 0 `cast:3`, 0.0 [0.0, 7.0] (n 150) | -, - (n 0) | - | - |
| d22 | 14 | p | 5 | 1 `cast:23`, 14.3 [7.0, 22.3] (n 150) | -, - (n 0) | - | - |
| d26 | 15 | b | 5 | 4 `block:3>46,119>46`, 7.3 [0.3, 15.7] (n 150) | -, - (n 0) | - | - |
| d28 | 16 | a | 5 | 0 `attack:none`, 0.0 [0.0, 12.0] (n 50) | -, - (n 0) | - | - |
| d32 | 18 | a | 7 | 6 `attack:4`, 1.3 [0.0, 7.3] (n 150) | -, - (n 0) | - | - |
| d33 | 18 | p | 3 | 2 `cast:8`, 4.0 [0.0, 16.0] (n 25) | -, - (n 0) | - | - |
| d34 | 18 | p | 3 | 0 `cast:28`, 0.0 [0.0, 6.0] (n 50) | -, - (n 0) | - | - |
| d36 | 19 | b | 8 | 0 `block:8>41,119>57`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

12 decision(s) branched, 8 of them in full (2 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 2: d33 (mean value 4.0%, replaced by d32), d36 (mean value 0.0%, replaced by d34). Early stopping at 50/100 random branches stopped 7 option(s): d16 o3 at 50, d16 o4 at 100, d16 o5 at 50, d22 o3 at 50, d22 o4 at 50, d26 o1 at 50, d32 o5 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 4. It stopped 2 (d28, d34), each a partial label at that n, never confident, saving at most 800 branch games; 2 it would have stopped played on to the full n as controls (d14, d19; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 2, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:9#0` | Twisted Landscape: {T}, Sacrifice CARDNAME: Search your libr | 52.7 [44.7, 60.5] (n 150) | - (n 0) |
| 1 | `pass` | pass | 61.3 [53.3, 68.8] (n 150) | - (n 0) |
| 2 | `cast:34` | Sensei's Divining Top | 55.3 [47.3, 63.1] (n 150) | - (n 0) |

**d4** (turn 6, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:29#0` | Bountiful Landscape: {T}, Sacrifice CARDNAME: Search your li | 65.3 [57.4, 72.5] (n 150) | - (n 0) |
| 1 | `pass` | pass | 58.3 [50.3, 65.9] (n 150) | - (n 0) |
| 2 | `cast:19` | Myr Sire | 55.7 [47.7, 63.4] (n 150) | - (n 0) |

**d14** (turn 10, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:12` | Trumpeting Herd | 35.3 [28.1, 43.3] (n 150) | - (n 0) |
| 1 | `pass` | pass | 23.3 [17.3, 30.7] (n 150) | - (n 0) |
| 2 | `cast:34` | Sensei's Divining Top | 26.3 [19.9, 33.9] (n 150) | - (n 0) |

**d16** (turn 12, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:21` | Immolation | 27.3 [20.8, 35.0] (n 150) | - (n 0) |
| 1 | `pass` | pass | 29.3 [22.6, 37.1] (n 150) | - (n 0) |
| 2 | `cast:23` | Colossal Skyturtle | 48.0 [40.2, 55.9] (n 150) | - (n 0) |
| 3 | `cast:3` | Paradox Surveyor | 27.0 [16.7, 40.6] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:34` | Sensei's Divining Top | 31.0 [22.8, 40.6] (n 100, stopped at 100) | - (n 0) |
| 5 | `cast:4` | Argothian Pixies | 18.0 [9.8, 30.8] (n 50, stopped at 50) | - (n 0) |

**d19** (turn 12, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:3` | Paradox Surveyor | 32.3 [25.4, 40.2] (n 150) | - (n 0) |
| 1 | `pass` | pass | 26.0 [19.6, 33.6] (n 150) | - (n 0) |
| 2 | `cast:34` | Sensei's Divining Top | 29.7 [22.9, 37.4] (n 150) | - (n 0) |
| 3 | `cast:4` | Argothian Pixies | 23.7 [17.6, 31.1] (n 150) | - (n 0) |

**d22** (turn 14, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 7.3 [4.1, 12.7] (n 150) | - (n 0) |
| 1 | `cast:23` | Colossal Skyturtle | 21.7 [15.8, 28.9] (n 150) | - (n 0) |
| 2 | `cast:17` | Earth Elemental | 16.3 [11.3, 23.1] (n 150) | - (n 0) |
| 3 | `cast:4` | Argothian Pixies | 10.0 [4.3, 21.4] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:34` | Sensei's Divining Top | 6.0 [2.1, 16.2] (n 50, stopped at 50) | - (n 0) |

**d26** (turn 15, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:3>46,23>46,119>46` | block Phyrexian Myr Token>Spinewoods Paladin, Paradox Surveyor>Spinewoods Paladin, Colossal Skyturtle>Spinewoods Paladin | 21.0 [15.3, 28.2] (n 150) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 2 | `block:3>46,23>46` | block Paradox Surveyor>Spinewoods Paladin, Colossal Skyturtle>Spinewoods Paladin | 21.7 [15.8, 28.9] (n 150) | - (n 0) |
| 3 | `block:23>46,119>46` | block Phyrexian Myr Token>Spinewoods Paladin, Colossal Skyturtle>Spinewoods Paladin | 21.0 [15.3, 28.2] (n 150) | - (n 0) |
| 4 | `block:3>46,119>46` | block Phyrexian Myr Token>Spinewoods Paladin, Paradox Surveyor>Spinewoods Paladin | 28.3 [21.7, 36.0] (n 150) | - (n 0) |

**d28** (turn 16, a; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 12.0 [5.6, 23.8] (n 50) | - (n 0) |
| 1 | `attack:3,16,119` | attack Llanowar Visionary+Paradox Surveyor+Phyrexian Myr Token | 12.0 [5.6, 23.8] (n 50) | - (n 0) |
| 2 | `attack:16` | attack Llanowar Visionary | 6.0 [2.1, 16.2] (n 50) | - (n 0) |
| 3 | `attack:3` | attack Paradox Surveyor | 10.0 [4.3, 21.4] (n 50) | - (n 0) |
| 4 | `attack:119` | attack Phyrexian Myr Token | 8.0 [3.1, 18.8] (n 50) | - (n 0) |

**d32** (turn 18, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 5.3 [2.7, 10.2] (n 150) | - (n 0) |
| 1 | `attack:3,4,16,17,119` | attack Llanowar Visionary+Paradox Surveyor+Phyrexian Myr Token+Earth Elemental+Argothian Pixies | 4.7 [2.3, 9.3] (n 150) | - (n 0) |
| 2 | `attack:16` | attack Llanowar Visionary | 5.3 [2.7, 10.2] (n 150) | - (n 0) |
| 3 | `attack:3` | attack Paradox Surveyor | 3.3 [1.4, 7.6] (n 150) | - (n 0) |
| 4 | `attack:119` | attack Phyrexian Myr Token | 5.3 [2.7, 10.2] (n 150) | - (n 0) |
| 5 | `attack:17` | attack Earth Elemental | 1.0 [0.1, 8.9] (n 50, stopped at 50) | - (n 0) |
| 6 | `attack:4` | attack Argothian Pixies | 6.7 [3.7, 11.8] (n 150) | - (n 0) |

**d33** (turn 18, p; option 0 is Forge's answer) -- settled by the screen (mean value 4.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:38#1` | Perilous Landscape: Cycling {U}{R}{W} ({U}{R}{W}, Discard th | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:8` | Scryb Sprites | 8.0 [2.2, 25.0] (n 25) | - (n 0) |

**d34** (turn 18, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:28` | Werebear | 8.0 [3.1, 18.8] (n 50) | - (n 0) |
| 1 | `pass` | pass | 4.0 [1.1, 13.5] (n 50) | - (n 0) |
| 2 | `cast:8` | Scryb Sprites | 6.0 [2.1, 16.2] (n 50) | - (n 0) |

**d36** (turn 19, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:8>41,119>57` | block Phyrexian Myr Token>Porcelain Legionnaire, Scryb Sprites>Exorcist | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:8>41` | block Scryb Sprites>Exorcist | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:119>57` | block Phyrexian Myr Token>Porcelain Legionnaire | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `block:8>41,17>57,119>57` | block Phyrexian Myr Token>Porcelain Legionnaire, Scryb Sprites>Exorcist, Earth Elemental>Porcelain Legionnaire | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 5 | `block:8>41,4>57,119>57` | block Phyrexian Myr Token>Porcelain Legionnaire, Scryb Sprites>Exorcist, Argothian Pixies>Porcelain Legionnaire | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 6 | `block:8>41,28>57,119>57` | block Phyrexian Myr Token>Porcelain Legionnaire, Scryb Sprites>Exorcist, Werebear>Porcelain Legionnaire | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 7 | `block:8>41,17>41,119>57` | block Phyrexian Myr Token>Porcelain Legionnaire, Scryb Sprites>Exorcist, Earth Elemental>Exorcist | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

5425 branch games (0 with an error, left out); 173 random and 0 Forge branches ended at the turn cap.

## Checks

198157 rows checked (ids against each seat's own frame log), 10852 frame logs through tools/check-redaction.mjs, 5425 forks checked (0 not the position), 12 no-leak checks (0 moved; the negative control moved in 12). The guardrails read back from 10850 random seats' logs: a land offered at 38071 of 353843 priority decisions and taken at 38071; 0 of 0 opening hands kept; G3 left out a repeated no-op 1598 time(s); G5 (D458): the engine refused 3 pick(s) it could not pay for, and 1 later offer(s) of them in the same priority window were left out; G6 (D471): 2478 pick(s) of the seats' own X plays had X drawn from 1 up, 53520 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

173 of 5425 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

