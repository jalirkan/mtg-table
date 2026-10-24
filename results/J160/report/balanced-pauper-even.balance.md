**Forge-pilot caveat:** Every game is piloted by Forge's Default AI on both seats. J141 found the live search seat lifts every colour about equally (+8.9 points), so a Forge-only payoff is the right first cut, but it is Forge's.

# J160: is balanced-pauper-even balanced by colour? (J145's judged arm: lab vs lab)

**Colour level: BALANCED ON PAYOFF.** OFF on arm-B payoff (Blab, lab vs lab): none. **Pull is reported, never judged** (the library loop optimises payoff only; the lab drafter is the one drafter). The registered rule: a cell is OFF when its 95% interval excludes the target and the point is at least 0.08 (pull) or 0.05 (payoff) from it; EVEN when the interval sits inside that band; else UNCLEAR. BALANCED ON PAYOFF when no colour is OFF on arm-B payoff. Everything else below is a candidate (D447 point 9). No card is swapped on this night.

## Pull (arm A, reported, never judged): share of two-colour decks containing the colour (target 0.400; labels are information)

| drafter | decks | k = 1 / 2 / 3 (excluded 0, 4, 5) | W | U | B | R | G |
|---|---|---|---|---|---|---|---|
| lab (lab) | 4000 | 2 / 1173 / 2825 (0, 0, 0) | 0.376 [0.349–0.401] EVEN | 0.834 [0.814–0.854] OFF | 0.294 [0.270–0.320] OFF | 0.419 [0.392–0.445] EVEN | 0.078 [0.061–0.093] OFF |

Beside it, not judged: mono decks by colour (share of mono decks) and three-colour decks containing the colour (share of three-colour decks, average 0.6).

| drafter | mono W | mono U | mono B | mono R | mono G | 3c W | 3c U | 3c B | 3c R | 3c G |
|---|---|---|---|---|---|---|---|---|---|---|
| lab | 0.000 | 1.000 | 0.000 | 0.000 | 0.000 | 0.713 | 0.812 | 0.444 | 0.604 | 0.427 |

**Pairs** (share of two-colour decks, average 0.100; candidates):

| drafter | WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|---|
| lab | 0.271 [0.247–0.295] | 0.040 [0.029–0.051] | 0.050 [0.039–0.064] | 0.015 [0.008–0.022] | 0.201 [0.179–0.225] | 0.311 [0.288–0.337] | 0.050 [0.037–0.063] | 0.049 [0.037–0.061] | 0.004 [0.001–0.009] | 0.009 [0.003–0.014] |

Triples with 40+ decks (lab): WUB 0.174 [0.160–0.186] of 2825; WUR 0.241 [0.227–0.255] of 2825; WUG 0.145 [0.133–0.157] of 2825; WBR 0.060 [0.051–0.069] of 2825; WBG 0.026 [0.021–0.032] of 2825; WRG 0.067 [0.058–0.076] of 2825; UBR 0.098 [0.088–0.108] of 2825; UBG 0.052 [0.044–0.060] of 2825; URG 0.103 [0.092–0.115] of 2825; BRG 0.035 [0.028–0.041] of 2825

## Payoff: the colour's win rate in games between decks that differ in it (target 0.500)

| arm | decks | games | W | U | B | R | G |
|---|---|---|---|---|---|---|---|
| Blab (judged) | 4000 | 4000 | 0.534 [0.514–0.554] n 2722 UNCLEAR | 0.496 [0.467–0.524] n 1446 EVEN | 0.500 [0.481–0.520] n 2748 EVEN | 0.462 [0.442–0.482] n 2870 UNCLEAR | 0.493 [0.472–0.514] n 2396 EVEN |

**A vs C** (report, don't act): W: B UNCLEAR, C None; U: B EVEN, C None; B: B EVEN, C None; R: B UNCLEAR, C None; G: B EVEN, C None

**Pairs' payoff** (a pair's decks against decks that are not that pair; candidates):

| arm | WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|---|
| Blab | 0.579 [0.536–0.619] | 0.660 [0.557–0.750] | 0.551 [0.449–0.652] | 0.706 [0.550–0.846] | 0.513 [0.465–0.556] | 0.434 [0.396–0.475] | 0.534 [0.444–0.632] | 0.447 [0.356–0.538] | 0.400 [0.000–0.750] | 0.550 [0.250–0.833] |

**By colour count** (decks with k colours against decks with another k; information): Blab: k1 0.750 [0.500–1.000], k2 0.519 [0.494–0.542], k3 0.481 [0.457–0.505]

## Closeness (reported only): the winner's final life and the game's turns, median [IQR]

| arm | cell | games | winner life | turns |
|---|---|---|---|---|
| Blab | all | 4000 | 13.000 [8.000–18.000] | 20.000 [17.000–24.000] |
| Blab | W | 3816 | 13.000 [8.000–18.000] | 20.000 [17.000–24.000] |
| Blab | U | 3998 | 13.000 [8.000–18.000] | 20.000 [17.000–24.000] |
| Blab | B | 2972 | 13.000 [8.000–18.000] | 20.000 [17.000–24.000] |
| Blab | R | 3632 | 13.000 [8.000–18.000] | 20.000 [17.000–24.000] |
| Blab | G | 2496 | 13.000 [8.000–18.000] | 21.000 [17.000–24.000] |
| Blab | WU | 636 | 14.000 [8.000–18.000] | 21.000 [18.000–25.000] |
| Blab | WB | 94 | 14.500 [10.000–18.750] | 20.000 [16.000–23.000] |
| Blab | WR | 118 | 14.000 [9.000–18.000] | 20.500 [17.000–25.000] |
| Blab | WG | 34 | 14.500 [12.000–20.000] | 18.500 [16.000–24.500] |
| Blab | UB | 472 | 13.000 [7.000–17.000] | 21.000 [17.000–25.000] |
| Blab | UR | 730 | 13.000 [8.000–17.000] | 20.000 [17.000–24.000] |
| Blab | UG | 118 | 12.000 [7.250–16.000] | 21.000 [17.250–25.000] |
| Blab | BR | 114 | 13.000 [8.000–17.000] | 21.000 [17.000–24.000] |
| Blab | BG | 10 | 12.500 [8.500–16.750] | 22.000 [19.250–25.250] |
| Blab | RG | 20 | 14.000 [8.250–19.000] | 20.000 [17.750–24.000] |

## Real drafts (the draft-deck ledger, colour counts only)

not read: a generated cube has no real drafts
