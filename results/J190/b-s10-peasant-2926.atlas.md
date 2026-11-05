# Move atlas: peasant-2826-00001 vs peasant-2826-00002, seed 2926

D451. Seat A is peasant-2826-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 24 turns, won by B, and listed 33 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d3 | 5 | p | 5 | 2 `cast:1`, 0.7 [0.0, 10.3] (n 150) | -, - (n 0) | - | - |
| d5 | 7 | p | 5 | 2 `cast:1`, 13.7 [6.7, 22.0] (n 150) | -, - (n 0) | - | - |
| d8 | 9 | p | 5 | 1 `cast:13`, 3.7 [0.0, 12.3] (n 150) | -, - (n 0) | - | - |
| d11 | 10 | b | 4 | 3 `block:1>47,34>47`, 3.0 [0.0, 8.0] (n 150) | -, - (n 0) | - | - |
| d14 | 13 | p | 6 | 1 `cast:13`, 6.0 [0.0, 14.3] (n 150) | -, - (n 0) | - | - |
| d17 | 13 | p | 4 | 2 `cast:13`, 6.3 [0.7, 15.0] (n 150) | -, - (n 0) | - | - |
| d21 | 17 | p | 4 | 3 `cast:33`, 10.0 [1.3, 18.3] (n 150) | -, - (n 0) | - | - |
| d25 | 19 | a | 4 | 0 `attack:none`, 0.0 [0.0, 2.2] (n 150) | -, - (n 0) | - | - |
| d28 | 21 | a | 5 | 1 `attack:12,13,33`, 4.3 [0.0, 15.7] (n 150) | -, - (n 0) | - | - |
| d29 | 23 | a | 5 | 1 `attack:12,13,33`, 26.0 [14.7, 36.7] (n 150) | -, - (n 0) | - | - |
| d32 | 24 | b | 6 | 0 `block:4>49,33>50,12>53,13>53`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

11 decision(s) branched, 10 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 1: d32 (mean value 0.0%, replaced by d29). Early stopping at 50/100 random branches stopped 11 option(s): d5 o1 at 50, d5 o3 at 50, d5 o4 at 50, d11 o1 at 100, d14 o3 at 50, d21 o1 at 50, d21 o2 at 100, d25 o2 at 50, d25 o3 at 50, d29 o3 at 50, d29 o4 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 1. It stopped 0 (none), each a partial label at that n, never confident, saving at most 0 branch games; 1 it would have stopped played on to the full n as controls (d25; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d3** (turn 5, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 32.7 [25.7, 40.5] (n 150) | - (n 0) |
| 1 | `cast:13` | Risen Reef | 27.0 [20.5, 34.6] (n 150) | - (n 0) |
| 2 | `cast:1` | Prized Amalgam | 33.3 [26.3, 41.2] (n 150) | - (n 0) |
| 3 | `cast:37` | Ulvenwald Mysteries | 25.7 [19.4, 33.2] (n 150) | - (n 0) |
| 4 | `cast:34` | Nishoba Brawler | 28.0 [21.4, 35.7] (n 150) | - (n 0) |

**d5** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 23.3 [17.3, 30.7] (n 150) | - (n 0) |
| 1 | `cast:13` | Risen Reef | 24.0 [14.3, 37.4] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:1` | Prized Amalgam | 37.0 [29.7, 45.0] (n 150) | - (n 0) |
| 3 | `cast:37` | Ulvenwald Mysteries | 27.0 [16.7, 40.6] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:17` | Tough Cookie | 28.0 [17.5, 41.7] (n 50, stopped at 50) | - (n 0) |

**d8** (turn 9, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 25.7 [19.4, 33.2] (n 150) | - (n 0) |
| 1 | `cast:13` | Risen Reef | 29.3 [22.6, 37.1] (n 150) | - (n 0) |
| 2 | `cast:37` | Ulvenwald Mysteries | 26.0 [19.6, 33.6] (n 150) | - (n 0) |
| 3 | `cast:17` | Tough Cookie | 27.3 [20.8, 35.0] (n 150) | - (n 0) |
| 4 | `cast:39` | Summon: Fenrir | 29.0 [22.3, 36.7] (n 150) | - (n 0) |

**d11** (turn 10, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:1>47` | block Prized Amalgam>Glóin the Mighty | 12.0 [7.7, 18.2] (n 150) | - (n 0) |
| 1 | `block:none` | block none | 7.5 [3.8, 14.4] (n 100, stopped at 100) | - (n 0) |
| 2 | `block:1>47,34>59` | block Prized Amalgam>Glóin the Mighty, Nishoba Brawler>Gitaxian Spellstalker | 11.3 [7.2, 17.4] (n 150) | - (n 0) |
| 3 | `block:1>47,34>47` | block Prized Amalgam>Glóin the Mighty, Nishoba Brawler>Glóin the Mighty | 15.0 [10.2, 21.6] (n 150) | - (n 0) |

**d14** (turn 13, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 20.3 [14.7, 27.5] (n 150) | - (n 0) |
| 1 | `cast:13` | Risen Reef | 26.3 [19.9, 33.9] (n 150) | - (n 0) |
| 2 | `cast:37` | Ulvenwald Mysteries | 23.7 [17.6, 31.1] (n 150) | - (n 0) |
| 3 | `cast:33` | Pizza Face, Gastromancer | 14.0 [7.0, 26.2] (n 50, stopped at 50) | - (n 0) |
| 4 | `cast:17` | Tough Cookie | 22.0 [16.1, 29.3] (n 150) | - (n 0) |
| 5 | `cast:34` | Nishoba Brawler | 23.0 [17.0, 30.4] (n 150) | - (n 0) |

**d17** (turn 13, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:17` | Tough Cookie | 20.3 [14.7, 27.5] (n 150) | - (n 0) |
| 1 | `pass` | pass | 22.0 [16.1, 29.3] (n 150) | - (n 0) |
| 2 | `cast:13` | Risen Reef | 26.7 [20.2, 34.3] (n 150) | - (n 0) |
| 3 | `cast:37` | Ulvenwald Mysteries | 26.0 [19.6, 33.6] (n 150) | - (n 0) |

**d21** (turn 17, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 28.3 [21.7, 36.0] (n 150) | - (n 0) |
| 1 | `cast:13` | Risen Reef | 24.0 [14.3, 37.4] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:37` | Ulvenwald Mysteries | 29.5 [21.4, 39.1] (n 100, stopped at 100) | - (n 0) |
| 3 | `cast:33` | Pizza Face, Gastromancer | 38.3 [30.9, 46.3] (n 150) | - (n 0) |

**d25** (turn 19, a; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 77.3 [70.0, 83.3] (n 150) | - (n 0) |
| 1 | `attack:12,33` | attack Throat Slitter+Pizza Face, Gastromancer | 67.3 [59.5, 74.3] (n 150) | - (n 0) |
| 2 | `attack:12` | attack Throat Slitter | 64.0 [50.1, 75.9] (n 50, stopped at 50) | - (n 0) |
| 3 | `attack:33` | attack Pizza Face, Gastromancer | 64.0 [50.1, 75.9] (n 50, stopped at 50) | - (n 0) |

**d28** (turn 21, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 66.3 [58.5, 73.4] (n 150) | - (n 0) |
| 1 | `attack:12,13,33` | attack Throat Slitter+Pizza Face, Gastromancer+Risen Reef | 70.7 [62.9, 77.4] (n 150) | - (n 0) |
| 2 | `attack:12` | attack Throat Slitter | 66.3 [58.5, 73.4] (n 150) | - (n 0) |
| 3 | `attack:33` | attack Pizza Face, Gastromancer | 70.3 [62.6, 77.1] (n 150) | - (n 0) |
| 4 | `attack:13` | attack Risen Reef | 68.7 [60.9, 75.5] (n 150) | - (n 0) |

**d29** (turn 23, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 34.0 [26.9, 41.9] (n 150) | - (n 0) |
| 1 | `attack:12,13,33` | attack Throat Slitter+Pizza Face, Gastromancer+Risen Reef | 60.0 [52.0, 67.5] (n 150) | - (n 0) |
| 2 | `attack:12` | attack Throat Slitter | 50.7 [42.8, 58.6] (n 150) | - (n 0) |
| 3 | `attack:33` | attack Pizza Face, Gastromancer | 24.0 [14.3, 37.4] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:13` | attack Risen Reef | 20.0 [11.2, 33.0] (n 50, stopped at 50) | - (n 0) |

**d32** (turn 24, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:4>49,33>50,12>53,13>53` | block Thought-Stalker Warlock>Inti, Seneschal of the Sun, Pizza Face, Gastromancer>Casey Jones, Jury-Rig Justiciar, Risen Reef>Circuit Mender, Throat Slitter>Circuit Mender | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:33>50,12>53,13>53` | block Pizza Face, Gastromancer>Casey Jones, Jury-Rig Justiciar, Risen Reef>Circuit Mender, Throat Slitter>Circuit Mender | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:4>49,12>53,13>53` | block Thought-Stalker Warlock>Inti, Seneschal of the Sun, Risen Reef>Circuit Mender, Throat Slitter>Circuit Mender | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `block:4>49,33>50,12>53` | block Thought-Stalker Warlock>Inti, Seneschal of the Sun, Pizza Face, Gastromancer>Casey Jones, Jury-Rig Justiciar, Throat Slitter>Circuit Mender | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 5 | `block:4>49,33>50,13>53` | block Thought-Stalker Warlock>Inti, Seneschal of the Sun, Pizza Face, Gastromancer>Casey Jones, Jury-Rig Justiciar, Risen Reef>Circuit Mender | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

6200 branch games (0 with an error, left out); 212 random and 0 Forge branches ended at the turn cap.

## Checks

217122 rows checked (ids against each seat's own frame log), 12402 frame logs through tools/check-redaction.mjs, 6200 forks checked (0 not the position), 11 no-leak checks (0 moved; the negative control moved in 11). The guardrails read back from 12400 random seats' logs: a land offered at 45323 of 420640 priority decisions and taken at 45323; 0 of 0 opening hands kept; G3 left out a repeated no-op 0 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 822 pick(s) of the seats' own X plays had X drawn from 1 up, 8053 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

212 of 6200 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

