# Move atlas: peasant-3686-00001 vs peasant-3686-00002, seed 3786

D451. Seat A is peasant-3686-00001. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn 40), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.

## Phase A: random against random from the opening

0 game(s) played (0 engine error(s)). Seat A won 0, seat B 0, 0 drawn (0 by the turn cap). Seat A's score -%. Game length in turns: mean -, median -, 10th-90th ---. A 95% interval of +/- 2 points on seat A's score needs about - rollouts at this variance (2401 at the worst case, a 50% score with no draws).

## Phase B: the two regret maps

The baseline game (Forge on both seats) lasted 39 turns, won by B, and listed 53 decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).

| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |
|---|---|---|---|---|---|---|---|
| d2 | 7 | p | 4 | 0 `cast:33`, 0.0 [0.0, 14.0] (n 50) | -, - (n 0) | - | - |
| d12 | 11 | p | 4 | 0 `cast:17`, 0.0 [0.0, 10.0] (n 50) | -, - (n 0) | - | - |
| d16 | 13 | a | 4 | 3 `attack:88`, 20.7 [10.7, 31.3] (n 150) | -, - (n 0) | - | - |
| d18 | 13 | p | 3 | 0 `cast:13`, 0.0 [0.0, 4.3] (n 150) | -, - (n 0) | - | - |
| d21 | 15 | a | 7 | 1 `attack:13,14,83,88,92`, 30.0 [24.7, 40.0] (n 150) | -, - (n 0) | - | - |
| d22 | 15 | p | 3 | 1 `pass`, 5.3 [0.0, 12.0] (n 150) | -, - (n 0) | - | - |
| d25 | 17 | a | 8 | 1 `attack:1,13,14,83,88,92`, 18.7 [10.7, 27.3] (n 150) | -, - (n 0) | - | - |
| d28 | 19 | a | 8 | 3 `attack:88`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d32 | 21 | a | 8 | 1 `attack:1,13,14,34,83,88,92`, 8.0 [4.0, 20.0] (n 25) | -, - (n 0) | - | - |
| d35 | 23 | p | 3 | 0 `activate:32#2`, 0.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d37 | 23 | a | 8 | 6 `attack:13`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d38 | 25 | p | 3 | 2 `cast:21`, 8.0 [0.0, 20.0] (n 25) | -, - (n 0) | - | - |
| d40 | 25 | a | 8 | 1 `attack:1,11,13,14,15,34,83,88,92`, 53.3 [46.0, 60.7] (n 150) | -, - (n 0) | - | - |
| d41 | 27 | a | 8 | 1 `attack:1,11,13,14,15,21,34,83,88,92`, 68.0 [60.7, 75.3] (n 150) | -, - (n 0) | - | - |
| d42 | 27 | p | 3 | 0 `activate:37#1`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d45 | 29 | a | 8 | 1 `attack:1,11,13,14,15,21,34,83,88,92`, 42.0 [34.7, 50.0] (n 150) | -, - (n 0) | - | - |
| d46 | 31 | a | 8 | 0 `attack:none`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |
| d48 | 33 | a | 8 | 1 `attack:1,6,11,13,14,21,34,83,88,92`, 4.0 [0.0, 12.0] (n 25) | -, - (n 0) | - | - |
| d51 | 35 | a | 8 | 1 `attack:1,6,11,13,14,21,34,83,88,92,220`, 32.0 [15.9, 52.0] (n 25) | -, - (n 0) | - | - |
| d52 | 37 | a | 8 | 0 `attack:none`, 0.0 [0.0, 0.0] (n 25) | -, - (n 0) | - | - |

### The cut design (D480)

20 decision(s) branched, 8 of them in full (2 more stopped by the futility rule, D489); picked among those with 3 or more options first. The screen at 25 random branches settled 10: d32 (mean value 2.5%, replaced by d35), d38 (mean value 2.7%, replaced by d40), d46 (mean value 0.0%, replaced by d45), d52 (mean value 0.0%, replaced by d51), d35 (mean value 4.0%, replaced by d37), d37 (mean value 0.5%, replaced by d42), d51 (mean value 4.0%, replaced by d48), d42 (mean value 0.0%, replaced by d28), d48 (mean value 0.5%, replaced by d21), d28 (mean value 1.0%, replaced by d25). Early stopping at 50/100 random branches stopped 27 option(s): d16 o2 at 50, d18 o1 at 100, d41 o2 at 50, d41 o3 at 50, d41 o4 at 50, d41 o5 at 50, d41 o6 at 50, d41 o7 at 50, d40 o2 at 50, d40 o3 at 50, d40 o4 at 50, d40 o5 at 50, d40 o6 at 50, d40 o7 at 50, d45 o2 at 50, d45 o3 at 50, d45 o4 at 50, d45 o5 at 50, d45 o6 at 50, d45 o7 at 50, d25 o2 at 100, d25 o5 at 50, d25 o6 at 100, d25 o7 at 50, d21 o2 at 50, d21 o5 at 50, d21 o6 at 50 (option 0 never stops; a stopped option's value is on its own branches, and the Forge map played only the options still running).

The futility stop (D489) read 10 decision(s) at 50 random branches: option 0 the best or within 0 of it at 3. It stopped 2 (d2, d12), each a partial label at that n, never confident, saving at most 800 branch games; 1 it would have stopped played on to the full n as controls (d18; the share 0.25, drawn by seed).

### What the two maps agree and disagree about

This spine has no Forge map (`--branch-forge 0`, D480): no agreement read is made, and a decision is complete, decided or settled on the random map alone.


### Each decision's options, side by side

**d2** (turn 7, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:33` | Instill Energy | 16.0 [8.3, 28.5] (n 50) | - (n 0) |
| 1 | `pass` | pass | 14.0 [7.0, 26.2] (n 50) | - (n 0) |
| 2 | `cast:17` | Vraska, Swarm's Eminence | 12.0 [5.6, 23.8] (n 50) | - (n 0) |
| 3 | `cast:5` | Political Triumph | 16.0 [8.3, 28.5] (n 50) | - (n 0) |

**d12** (turn 11, p; option 0 is Forge's answer) -- stopped by the futility rule at 50 random branches (option 0 the best), a partial label (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:17` | Vraska, Swarm's Eminence | 40.0 [27.6, 53.8] (n 50) | - (n 0) |
| 1 | `pass` | pass | 10.0 [4.3, 21.4] (n 50) | - (n 0) |
| 2 | `cast:14` | Scolding Administrator | 34.0 [22.4, 47.9] (n 50) | - (n 0) |
| 3 | `cast:13` | Risen Reef | 28.0 [17.5, 41.7] (n 50) | - (n 0) |

**d16** (turn 13, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 29.3 [22.6, 37.1] (n 150) | - (n 0) |
| 1 | `attack:83,88` | attack Goblin Army Token+Assassin Token | 39.3 [31.9, 47.3] (n 150) | - (n 0) |
| 2 | `attack:83` | attack Goblin Army Token | 30.0 [19.1, 43.8] (n 50, stopped at 50) | - (n 0) |
| 3 | `attack:88` | attack Assassin Token | 50.0 [42.1, 57.9] (n 150) | - (n 0) |

**d18** (turn 13, p; option 0 is Forge's answer) -- a futility control: the rule would have stopped it, played to the full n (D489):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:13` | Risen Reef | 46.0 [38.2, 54.0] (n 150) | - (n 0) |
| 1 | `pass` | pass | 36.0 [27.3, 45.8] (n 100, stopped at 100) | - (n 0) |
| 2 | `cast:8` | The Rack | 41.0 [33.5, 49.0] (n 150) | - (n 0) |

**d21** (turn 15, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 11.3 [7.2, 17.4] (n 150) | - (n 0) |
| 1 | `attack:13,14,83,88,92` | attack Goblin Army Token+Assassin Token+Assassin Token+Scolding Administrator+Risen Reef | 41.3 [33.8, 49.3] (n 150) | - (n 0) |
| 2 | `attack:83` | attack Goblin Army Token | 14.0 [7.0, 26.2] (n 50, stopped at 50) | - (n 0) |
| 3 | `attack:88` | attack Assassin Token | 40.7 [33.1, 48.7] (n 150) | - (n 0) |
| 4 | `attack:92` | attack Assassin Token | 40.7 [33.1, 48.7] (n 150) | - (n 0) |
| 5 | `attack:14` | attack Scolding Administrator | 12.0 [5.6, 23.8] (n 50, stopped at 50) | - (n 0) |
| 6 | `attack:13` | attack Risen Reef | 18.0 [9.8, 30.8] (n 50, stopped at 50) | - (n 0) |

**d22** (turn 15, p; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `cast:15` | Overlord of the Balemurk | 8.0 [4.6, 13.5] (n 150) | - (n 0) |
| 1 | `pass` | pass | 13.3 [8.8, 19.7] (n 150) | - (n 0) |
| 2 | `cast:1` | Lita, Little Orphan Amphibian | 11.3 [7.2, 17.4] (n 150) | - (n 0) |

**d25** (turn 17, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 6.0 [3.2, 11.0] (n 150) | - (n 0) |
| 1 | `attack:1,13,14,83,88,92` | attack Goblin Army Token+Assassin Token+Assassin Token+Scolding Administrator+Risen Reef+Lita, Little Orphan Amphibian | 24.7 [18.5, 32.1] (n 150) | - (n 0) |
| 2 | `attack:83` | attack Goblin Army Token | 5.0 [2.1, 11.2] (n 100, stopped at 100) | - (n 0) |
| 3 | `attack:88` | attack Assassin Token | 16.7 [11.6, 23.4] (n 150) | - (n 0) |
| 4 | `attack:92` | attack Assassin Token | 16.7 [11.6, 23.4] (n 150) | - (n 0) |
| 5 | `attack:14` | attack Scolding Administrator | 4.0 [1.1, 13.5] (n 50, stopped at 50) | - (n 0) |
| 6 | `attack:13` | attack Risen Reef | 3.5 [1.3, 9.2] (n 100, stopped at 100) | - (n 0) |
| 7 | `attack:1` | attack Lita, Little Orphan Amphibian | 4.0 [1.1, 13.5] (n 50, stopped at 50) | - (n 0) |

**d28** (turn 19, a; option 0 is Forge's answer) -- settled by the screen (mean value 1.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:1,13,14,83,88,92` | attack Goblin Army Token+Assassin Token+Assassin Token+Scolding Administrator+Risen Reef+Lita, Little Orphan Amphibian | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `attack:83` | attack Goblin Army Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `attack:88` | attack Assassin Token | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 4 | `attack:92` | attack Assassin Token | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 5 | `attack:14` | attack Scolding Administrator | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 6 | `attack:13` | attack Risen Reef | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 7 | `attack:1` | attack Lita, Little Orphan Amphibian | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d32** (turn 21, a; option 0 is Forge's answer) -- settled by the screen (mean value 2.5%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:1,13,14,34,83,88,92` | attack Goblin Army Token+Assassin Token+Assassin Token+Scolding Administrator+Risen Reef+Lita, Little Orphan Amphibian+Witherbloom Apprentice | 8.0 [2.2, 25.0] (n 25) | - (n 0) |
| 2 | `attack:83` | attack Goblin Army Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `attack:88` | attack Assassin Token | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 4 | `attack:92` | attack Assassin Token | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 5 | `attack:14` | attack Scolding Administrator | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 6 | `attack:13` | attack Risen Reef | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 7 | `attack:1` | attack Lita, Little Orphan Amphibian | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d35** (turn 23, p; option 0 is Forge's answer) -- settled by the screen (mean value 4.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:32#2` | Kaito, Bane of Nightmares: -2: Tap target creature. Put two  | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 1 | `pass` | pass | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 2 | `cast:11` | Iron-Shield Elf | 4.0 [0.7, 19.5] (n 25) | - (n 0) |

**d37** (turn 23, a; option 0 is Forge's answer) -- settled by the screen (mean value 0.5%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:1,13,14,32,34,83,88,92` | attack Goblin Army Token+Assassin Token+Assassin Token+Scolding Administrator+Risen Reef+Lita, Little Orphan Amphibian+Witherbloom Apprentice+Kaito, Bane of Nightmares | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `attack:83` | attack Goblin Army Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `attack:88` | attack Assassin Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `attack:92` | attack Assassin Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 5 | `attack:14` | attack Scolding Administrator | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 6 | `attack:13` | attack Risen Reef | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 7 | `attack:1` | attack Lita, Little Orphan Amphibian | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d38** (turn 25, p; option 0 is Forge's answer) -- settled by the screen (mean value 2.7%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:32#2` | Kaito, Bane of Nightmares: -2: Tap target creature. Put two  | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `cast:21` | Vampire Gourmand | 8.0 [2.2, 25.0] (n 25) | - (n 0) |

**d40** (turn 25, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 2.5] (n 150) | - (n 0) |
| 1 | `attack:1,11,13,14,15,34,83,88,92` | attack Goblin Army Token+Assassin Token+Assassin Token+Scolding Administrator+Risen Reef+Overlord of the Balemurk+Lita, Little Orphan Amphibian+Witherbloom Apprentice+Iron-Shield Elf | 53.3 [45.4, 61.1] (n 150) | - (n 0) |
| 2 | `attack:83` | attack Goblin Army Token | 2.0 [0.4, 10.5] (n 50, stopped at 50) | - (n 0) |
| 3 | `attack:88` | attack Assassin Token | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:92` | attack Assassin Token | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 5 | `attack:14` | attack Scolding Administrator | 2.0 [0.4, 10.5] (n 50, stopped at 50) | - (n 0) |
| 6 | `attack:13` | attack Risen Reef | 4.0 [1.1, 13.5] (n 50, stopped at 50) | - (n 0) |
| 7 | `attack:15` | attack Overlord of the Balemurk | 2.0 [0.4, 10.5] (n 50, stopped at 50) | - (n 0) |

**d41** (turn 27, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 2.5] (n 150) | - (n 0) |
| 1 | `attack:1,11,13,14,15,21,34,83,88,92` | attack Goblin Army Token+Assassin Token+Assassin Token+Scolding Administrator+Risen Reef+Overlord of the Balemurk+Lita, Little Orphan Amphibian+Witherbloom Apprentice+Iron-Shield Elf+Vampire Gourmand | 68.0 [60.2, 74.9] (n 150) | - (n 0) |
| 2 | `attack:83` | attack Goblin Army Token | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 3 | `attack:88` | attack Assassin Token | 2.0 [0.4, 10.5] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:92` | attack Assassin Token | 2.0 [0.4, 10.5] (n 50, stopped at 50) | - (n 0) |
| 5 | `attack:14` | attack Scolding Administrator | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 6 | `attack:13` | attack Risen Reef | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 7 | `attack:15` | attack Overlord of the Balemurk | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |

**d42** (turn 27, p; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `activate:37#1` | Shattered Landscape: Cycling {R}{W}{B} ({R}{W}{B}, Discard t | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `pass` | pass | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `activate:39#1` | Tranquil Landscape: Cycling {G}{W}{U} ({G}{W}{U}, Discard th | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d45** (turn 29, a; option 0 is Forge's answer):

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 2.5] (n 150) | - (n 0) |
| 1 | `attack:1,11,13,14,15,21,34,83,88,92` | attack Goblin Army Token+Assassin Token+Assassin Token+Scolding Administrator+Risen Reef+Overlord of the Balemurk+Lita, Little Orphan Amphibian+Witherbloom Apprentice+Iron-Shield Elf+Vampire Gourmand | 42.0 [34.4, 50.0] (n 150) | - (n 0) |
| 2 | `attack:83` | attack Goblin Army Token | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 3 | `attack:88` | attack Assassin Token | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 4 | `attack:92` | attack Assassin Token | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 5 | `attack:14` | attack Scolding Administrator | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 6 | `attack:13` | attack Risen Reef | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |
| 7 | `attack:15` | attack Overlord of the Balemurk | 0.0 [0.0, 7.1] (n 50, stopped at 50) | - (n 0) |

**d46** (turn 31, a; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:1,6,11,13,14,15,21,34,83,88,92` | attack Goblin Army Token+Assassin Token+Assassin Token+Scolding Administrator+Risen Reef+Overlord of the Balemurk+Lita, Little Orphan Amphibian+Witherbloom Apprentice+Iron-Shield Elf+Vampire Gourmand+Glamer Gifter | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `attack:83` | attack Goblin Army Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `attack:88` | attack Assassin Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `attack:92` | attack Assassin Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 5 | `attack:14` | attack Scolding Administrator | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 6 | `attack:13` | attack Risen Reef | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 7 | `attack:15` | attack Overlord of the Balemurk | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d48** (turn 33, a; option 0 is Forge's answer) -- settled by the screen (mean value 0.5%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:1,6,11,13,14,21,34,83,88,92` | attack Goblin Army Token+Assassin Token+Assassin Token+Scolding Administrator+Risen Reef+Lita, Little Orphan Amphibian+Witherbloom Apprentice+Iron-Shield Elf+Vampire Gourmand+Glamer Gifter | 4.0 [0.7, 19.5] (n 25) | - (n 0) |
| 2 | `attack:83` | attack Goblin Army Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `attack:88` | attack Assassin Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `attack:92` | attack Assassin Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 5 | `attack:14` | attack Scolding Administrator | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 6 | `attack:13` | attack Risen Reef | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 7 | `attack:1` | attack Lita, Little Orphan Amphibian | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d51** (turn 35, a; option 0 is Forge's answer) -- settled by the screen (mean value 4.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:1,6,11,13,14,21,34,83,88,92,220` | attack Goblin Army Token+Assassin Token+Assassin Token+Scolding Administrator+Risen Reef+Lita, Little Orphan Amphibian+Witherbloom Apprentice+Iron-Shield Elf+Vampire Gourmand+Glamer Gifter+Reliquary Dragon | 32.0 [17.2, 51.6] (n 25) | - (n 0) |
| 2 | `attack:83` | attack Goblin Army Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `attack:88` | attack Assassin Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `attack:92` | attack Assassin Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 5 | `attack:14` | attack Scolding Administrator | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 6 | `attack:13` | attack Risen Reef | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 7 | `attack:1` | attack Lita, Little Orphan Amphibian | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

**d52** (turn 37, a; option 0 is Forge's answer) -- settled by the screen (mean value 0.0%), a cheap label:

| option | token | what | random: value | forge: value |
|---|---|---|---|---|
| 0 (played) | `attack:none` | attack none | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 1 | `attack:1,6,11,13,14,21,34,83,88,92,220` | attack Goblin Army Token+Assassin Token+Assassin Token+Scolding Administrator+Risen Reef+Lita, Little Orphan Amphibian+Witherbloom Apprentice+Iron-Shield Elf+Vampire Gourmand+Glamer Gifter+Reliquary Dragon | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 2 | `attack:83` | attack Goblin Army Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 3 | `attack:88` | attack Assassin Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 4 | `attack:92` | attack Assassin Token | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 5 | `attack:14` | attack Scolding Administrator | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 6 | `attack:13` | attack Risen Reef | 0.0 [0.0, 13.3] (n 25) | - (n 0) |
| 7 | `attack:1` | attack Lita, Little Orphan Amphibian | 0.0 [0.0, 13.3] (n 25) | - (n 0) |

6825 branch games (0 with an error, left out); 2 random and 0 Forge branches ended at the turn cap.

## Checks

132260 rows checked (ids against each seat's own frame log), 13652 frame logs through tools/check-redaction.mjs, 6825 forks checked (0 not the position), 20 no-leak checks (0 moved; the negative control moved in 20). The guardrails read back from 13650 random seats' logs: a land offered at 22424 of 205524 priority decisions and taken at 22424; 0 of 0 opening hands kept; G3 left out a repeated no-op 389 time(s); G5 (D458): the engine refused 0 pick(s) it could not pay for, and 0 later offer(s) of them in the same priority window were left out; G6 (D471): 0 pick(s) of the seats' own X plays had X drawn from 1 up, 0 offer(s) payable only at X = 0 were left out, and 0 own play(s) were paid at X = 0; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window 0 time(s); 0 guardrail violation(s) (G1 0, G4 0, G6 0). No problem.

### Branch games the turn cap ended

2 of 6825 branch game(s) ended at the turn cap; each is scored a draw (D478). An option with more than 25.0% of its branch games capped is a warning, never a problem: a capped branch is a long position, kept in the value at a half.

