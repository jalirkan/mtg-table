# Move atlas: powered-2004-00001 vs powered-2004-00002, seed 2104

D451. Seat A is powered-2004-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 16 turns, won by B, and listed 17 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d0 | 7 | p | 3 | 2 `cast:40`, 6.0 [0.0, 14.0] (n 200) | -, - (n 0) | - | - |
| d1 | 7 | p | 3 | 2 `cast:40`, 2.0 [0.0, 8.5] (n 200) | -, - (n 0) | - | - |
| d2 | 7 | p | 3 | 0 `cast:40`, 0.0 [0.0, 1.0] (n 200) | -, - (n 0) | - | - |
| d3 | 7 | p | 2 | 0 `activate:9`, 0.0 [0.0, 6.0] (n 200) | -, - (n 0) | - | - |
| d4 | 10 | b | 3 | 0 `block:95>49`, 0.0 [0.0, 5.0] (n 200) | -, - (n 0) | - | - |
| d5 | 11 | p | 5 | 2 `cast:17`, 4.0 [0.0, 9.5] (n 200) | -, - (n 0) | - | - |
| d6 | 11 | a | 2 | 1 `attack:9`, 3.5 [0.0, 9.0] (n 200) | -, - (n 0) | - | - |
| d7 | 11 | p | 6 | 2 `cast:17`, 4.5 [1.5, 9.5] (n 200) | -, - (n 0) | - | - |
| d8 | 12 | b | 4 | 0 `block:none`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d9 | 13 | p | 6 | 0 `cast:31`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d10 | 13 | p | 2 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d11 | 13 | a | 2 | 0 `attack:none`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d12 | 13 | p | 3 | 0 `cast:4`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d13 | 14 | b | 6 | 0 `block:122>55,9>56,123>133,129>134`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d14 | 15 | p | 5 | 0 `pass`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d15 | 15 | p | 5 | 0 `cast:4`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d16 | 16 | b | 2 | 0 `block:4>80`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

17 decision(s) branched, 8 of them in full; picked among those with 3 or more options first. The screen at 25 random branches settled 9: d8 (mean value 0.0%, replaced by d9), d12 (mean value 1.3%, replaced by d14), d13 (mean value 0.0%, replaced by d16), d15 (mean value 0.0%, replaced by d10), d14 (mean value 0.0%, replaced by d5), d9 (mean value 0.0%, replaced by d1), d16 (mean value 0.0%, replaced by d11), d11 (mean value 0.0%, replaced by d3), d10 (mean value 0.0%, replaced by d6). Early stopping at 50/100/150 random branches stopped 4 option(s): d2 o2 at 50, d4 o1 at 50, d7 o1 at 150, d1 o1 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d0** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 20.5 [15.5, 26.6] (n 200) | - (n 0) |
| 1 | `cast:9` | Hexdrinker | 20.0 [15.0, 26.1] (n 200) | - (n 0) |
| 2 | `cast:40` | Talisman of Curiosity | 26.5 [20.9, 33.0] (n 200) | - (n 0) |

**d1** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:9` | Hexdrinker | 18.5 [13.7, 24.5] (n 200) | - (n 0) |
| 1 | `pass` | pass | 8.0 [3.1, 18.8] (n 50, stopped at 50) | - (n 0) |
| 2 | `cast:40` | Talisman of Curiosity | 20.5 [15.5, 26.6] (n 200) | - (n 0) |

**d2** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:40` | Talisman of Curiosity | 20.5 [15.5, 26.6] (n 200) | - (n 0) |
| 1 | `pass` | pass | 15.0 [10.7, 20.6] (n 200) | - (n 0) |
| 2 | `activate:9` | Hexdrinker: Level up {1} ({1}: Put a level counter on this.  | 9.0 [3.7, 20.1] (n 50, stopped at 50) | - (n 0) |

**d3** (turn 7, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:9` | Hexdrinker: Level up {1} ({1}: Put a level counter on this.  | 19.3 [14.4, 25.3] (n 200) | - (n 0) |
| 1 | `pass` | pass | 19.3 [14.4, 25.3] (n 200) | - (n 0) |

**d4** (turn 10, b; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:95>49` | block Samurai Token>Charming Prince | 14.5 [10.3, 20.1] (n 200) | - (n 0) |
| 1 | `block:none` | block none | 2.0 [0.4, 10.5] (n 50, stopped at 50) | - (n 0) |
| 2 | `block:9>49,95>49` | block Samurai Token>Charming Prince, Hexdrinker>Charming Prince | 13.5 [9.4, 18.9] (n 200) | - (n 0) |

**d5** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 6.0 [3.5, 10.2] (n 200) | - (n 0) |
| 1 | `cast:14` | Mystic Forge | 7.0 [4.2, 11.4] (n 200) | - (n 0) |
| 2 | `cast:17` | Momo, Friendly Flier | 10.0 [6.6, 14.9] (n 200) | - (n 0) |
| 3 | `cast:4` | Lovestruck Beast | 8.5 [5.4, 13.2] (n 200) | - (n 0) |
| 4 | `cast:4` | Lovestruck Beast — Heart's Desire | 7.5 [4.6, 12.0] (n 200) | - (n 0) |

**d6** (turn 11, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 7.5 [4.6, 12.0] (n 200) | - (n 0) |
| 1 | `attack:9` | attack Hexdrinker | 11.0 [7.4, 16.1] (n 200) | - (n 0) |

**d7** (turn 11, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:14` | Mystic Forge | 5.5 [3.1, 9.6] (n 200) | - (n 0) |
| 1 | `pass` | pass | 4.7 [2.3, 9.3] (n 150, stopped at 150) | - (n 0) |
| 2 | `cast:17` | Momo, Friendly Flier | 10.0 [6.6, 14.9] (n 200) | - (n 0) |
| 3 | `cast:4` | Lovestruck Beast | 9.5 [6.2, 14.4] (n 200) | - (n 0) |
| 4 | `cast:4` | Lovestruck Beast — Heart's Desire | 8.5 [5.4, 13.2] (n 200) | - (n 0) |
| 5 | `activate:9` | Hexdrinker: Level up {1} ({1}: Put a level counter on this.  | 7.5 [4.6, 12.0] (n 200) | - (n 0) |

**d8** (turn 12, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:9>56` | block Hexdrinker>Voice of Victory | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:9>117` | block Hexdrinker>Warrior Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:9>118` | block Hexdrinker>Warrior Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d9** (turn 13, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:31` | Pest Infestation | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:17` | Momo, Friendly Flier | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `cast:4` | Lovestruck Beast | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `cast:4` | Lovestruck Beast — Heart's Desire | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 5 | `cast:19` | Argivian Archaeologist | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d10** (turn 13, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `cast:4` | Lovestruck Beast — Heart's Desire | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d11** (turn 13, a; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:9` | attack Hexdrinker | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d12** (turn 13, p; option 0 is Forge's answer) -- settled by the screen (mean value 1.3%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:4` | Lovestruck Beast — Heart's Desire | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `activate:9` | Hexdrinker: Level up {1} ({1}: Put a level counter on this.  | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d13** (turn 14, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:122>55,9>56,123>133,129>134` | block Pest Token>Sanguine Evangelist, Hexdrinker>Voice of Victory, Pest Token>Warrior Token, Human Token>Warrior Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `block:9>56,123>133,129>134` | block Hexdrinker>Voice of Victory, Pest Token>Warrior Token, Human Token>Warrior Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `block:122>55,123>133,129>134` | block Pest Token>Sanguine Evangelist, Pest Token>Warrior Token, Human Token>Warrior Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `block:122>55,9>56,129>134` | block Pest Token>Sanguine Evangelist, Hexdrinker>Voice of Victory, Human Token>Warrior Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 5 | `block:122>55,9>56,123>133` | block Pest Token>Sanguine Evangelist, Hexdrinker>Voice of Victory, Pest Token>Warrior Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d14** (turn 15, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `cast:17` | Momo, Friendly Flier | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:19` | Argivian Archaeologist | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `cast:6` | Dragon's Rage Channeler | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `cast:4` | Lovestruck Beast (may play) | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d15** (turn 15, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:4` | Lovestruck Beast (may play) | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:17` | Momo, Friendly Flier | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `cast:19` | Argivian Archaeologist | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `cast:6` | Dragon's Rage Channeler | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d16** (turn 16, b; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `block:4>80` | block Lovestruck Beast>Ranger-Captain of Eos | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `block:none` | block none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

5775 branch games (0 with an error, left out); 3 random and 0 Forge branches ended at the turn cap.

## Checks

243745 rows checked (ids against each seat's own frame log), 11552 frame logs through tools/check-redaction.mjs, 5775 forks checked (0 not the position), 17 no-leak checks (0 moved; the negative control moved in 17). The guardrails read back from 11550 random seats' logs: a land offered at 45720 of 325053 priority decisions and taken at 45720; 0 of 0 opening hands kept; G3 left out a repeated no-op 1386 time(s); G5 (D458): the engine refused 88 pick(s) it could not pay for, and 44 later offer(s) of them in the same priority window were left out; G6 (D471): 5013 pick(s) of the seats' own X plays had X drawn from 1 up, 36669 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

3 of 5775 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

