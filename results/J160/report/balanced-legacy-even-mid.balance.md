**Forge-pilot caveat:** Every game is piloted by Forge's Default AI on both seats. J141 found the live search seat lifts every colour about equally (+8.9 points), so a Forge-only payoff is the right first cut, but it is Forge's.

# J160: is balanced-legacy-even-mid balanced by colour? (J145's judged arm: lab vs lab)

**Colour level: BALANCED ON PAYOFF.** OFF on arm-B payoff (Blab, lab vs lab): none. **Pull is reported, never judged** (the library loop optimises payoff only; the lab drafter is the one drafter). The registered rule: a cell is OFF when its 95% interval excludes the target and the point is at least 0.08 (pull) or 0.05 (payoff) from it; EVEN when the interval sits inside that band; else UNCLEAR. BALANCED ON PAYOFF when no colour is OFF on arm-B payoff. Everything else below is a candidate (D447 point 9). No card is swapped on this night.

## Pull (arm A, reported, never judged): share of two-colour decks containing the colour (target 0.400; labels are information)

| drafter | decks | k = 1 / 2 / 3 (excluded 0, 4, 5) | W | U | B | R | G |
|---|---|---|---|---|---|---|---|
| lab (lab) | 4000 | 2 / 2583 / 1415 (0, 0, 0) | 0.338 [0.321–0.353] EVEN | 0.829 [0.816–0.842] OFF | 0.434 [0.418–0.452] EVEN | 0.201 [0.187–0.215] OFF | 0.199 [0.185–0.214] OFF |

Beside it, not judged: mono decks by colour (share of mono decks) and three-colour decks containing the colour (share of three-colour decks, average 0.6).

| drafter | mono W | mono U | mono B | mono R | mono G | 3c W | 3c U | 3c B | 3c R | 3c G |
|---|---|---|---|---|---|---|---|---|---|---|
| lab | 0.000 | 1.000 | 0.000 | 0.000 | 0.000 | 0.564 | 0.916 | 0.515 | 0.791 | 0.214 |

**Pairs** (share of two-colour decks, average 0.100; candidates):

| drafter | WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|---|
| lab | 0.253 [0.236–0.268] | 0.059 [0.050–0.068] | 0.010 [0.006–0.014] | 0.015 [0.011–0.020] | 0.298 [0.282–0.315] | 0.146 [0.134–0.159] | 0.132 [0.119–0.144] | 0.035 [0.027–0.041] | 0.042 [0.035–0.050] | 0.011 [0.007–0.015] |

Triples with 40+ decks (lab): WUB 0.112 [0.095–0.128] of 1415; WUR 0.355 [0.332–0.380] of 1415; WUG 0.030 [0.021–0.039] of 1415; WBR 0.047 [0.037–0.060] of 1415; UBR 0.271 [0.246–0.294] of 1415; UBG 0.066 [0.053–0.079] of 1415; URG 0.081 [0.066–0.095] of 1415

## Payoff: the colour's win rate in games between decks that differ in it (target 0.500)

| arm | decks | games | W | U | B | R | G |
|---|---|---|---|---|---|---|---|
| Blab (judged) | 4000 | 3988 | 0.491 [0.472–0.508] n 2747 EVEN | 0.490 [0.460–0.523] n 1111 EVEN | 0.487 [0.468–0.505] n 2876 EVEN | 0.462 [0.441–0.480] n 2540 UNCLEAR | 0.538 [0.512–0.562] n 1599 UNCLEAR |

**A vs C** (report, don't act): W: B EVEN, C None; U: B EVEN, C None; B: B EVEN, C None; R: B UNCLEAR, C None; G: B UNCLEAR, C None

**Pairs' payoff** (a pair's decks against decks that are not that pair; candidates):

| arm | WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|---|
| Blab | 0.523 [0.496–0.551] | 0.539 [0.481–0.592] | 0.423 [0.275–0.577] | 0.551 [0.450–0.662] | 0.508 [0.483–0.534] | 0.485 [0.445–0.523] | 0.575 [0.534–0.615] | 0.506 [0.432–0.575] | 0.567 [0.494–0.634] | 0.574 [0.448–0.696] |

**By colour count** (decks with k colours against decks with another k; information): Blab: k1 0.250 [0.000–0.500], k2 0.553 [0.531–0.575], k3 0.447 [0.425–0.467]

## Closeness (reported only): the winner's final life and the game's turns, median [IQR]

| arm | cell | games | winner life | turns |
|---|---|---|---|---|
| Blab | all | 3988 | 16.000 [11.000–20.000] | 17.000 [14.000–21.000] |
| Blab | W | 3038 | 16.000 [11.000–20.000] | 17.000 [14.250–21.000] |
| Blab | U | 3984 | 16.000 [11.000–20.000] | 17.000 [14.000–21.000] |
| Blab | B | 3282 | 16.000 [11.000–20.000] | 17.000 [14.000–21.000] |
| Blab | R | 2901 | 16.000 [11.000–20.000] | 17.000 [14.000–20.000] |
| Blab | G | 1615 | 17.000 [11.000–20.000] | 17.000 [14.000–20.000] |
| Blab | WU | 1292 | 16.000 [11.000–20.000] | 18.000 [15.000–21.000] |
| Blab | WB | 306 | 17.000 [11.000–21.000] | 18.000 [15.000–23.000] |
| Blab | WR | 52 | 15.000 [9.750–19.000] | 17.000 [13.750–21.000] |
| Blab | WG | 78 | 17.000 [11.000–20.000] | 17.000 [15.000–21.000] |
| Blab | UB | 1511 | 16.000 [10.000–20.000] | 17.000 [15.000–21.000] |
| Blab | UR | 751 | 15.000 [10.000–20.000] | 17.000 [14.000–20.000] |
| Blab | UG | 678 | 17.000 [12.000–20.000] | 17.000 [14.000–20.000] |
| Blab | BR | 178 | 15.500 [9.000–20.000] | 17.500 [14.000–20.000] |
| Blab | BG | 217 | 16.000 [11.000–20.000] | 16.000 [14.000–20.000] |
| Blab | RG | 54 | 15.000 [10.000–20.000] | 15.000 [13.000–21.000] |

## Real drafts (the draft-deck ledger, colour counts only)

not read: a generated cube has no real drafts
