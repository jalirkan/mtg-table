**Forge-pilot caveat:** Every game is piloted by Forge's Default AI on both seats. J141 found the live search seat lifts every colour about equally (+8.9 points), so a Forge-only payoff is the right first cut, but it is Forge's.

# J160: is balanced-legacy-even-mid-nopower balanced by colour? (J145's judged arm: lab vs lab)

**Colour level: BALANCED ON PAYOFF.** OFF on arm-B payoff (Blab, lab vs lab): none. **Pull is reported, never judged** (the library loop optimises payoff only; the lab drafter is the one drafter). The registered rule: a cell is OFF when its 95% interval excludes the target and the point is at least 0.08 (pull) or 0.05 (payoff) from it; EVEN when the interval sits inside that band; else UNCLEAR. BALANCED ON PAYOFF when no colour is OFF on arm-B payoff. Everything else below is a candidate (D447 point 9). No card is swapped on this night.

## Pull (arm A, reported, never judged): share of two-colour decks containing the colour (target 0.400; labels are information)

| drafter | decks | k = 1 / 2 / 3 (excluded 0, 4, 5) | W | U | B | R | G |
|---|---|---|---|---|---|---|---|
| lab (lab) | 4000 | 8 / 2618 / 1374 (0, 0, 0) | 0.467 [0.451–0.484] UNCLEAR | 0.783 [0.769–0.796] OFF | 0.425 [0.408–0.441] EVEN | 0.165 [0.153–0.178] OFF | 0.160 [0.147–0.172] OFF |

Beside it, not judged: mono decks by colour (share of mono decks) and three-colour decks containing the colour (share of three-colour decks, average 0.6).

| drafter | mono W | mono U | mono B | mono R | mono G | 3c W | 3c U | 3c B | 3c R | 3c G |
|---|---|---|---|---|---|---|---|---|---|---|
| lab | 0.000 | 1.000 | 0.000 | 0.000 | 0.000 | 0.694 | 0.902 | 0.475 | 0.753 | 0.175 |

**Pairs** (share of two-colour decks, average 0.100; candidates):

| drafter | WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|---|
| lab | 0.319 [0.302–0.335] | 0.110 [0.099–0.121] | 0.015 [0.011–0.020] | 0.023 [0.017–0.029] | 0.252 [0.236–0.269] | 0.122 [0.111–0.134] | 0.090 [0.080–0.102] | 0.022 [0.017–0.028] | 0.041 [0.034–0.049] | 0.006 [0.003–0.009] |

Triples with 40+ decks (lab): WUB 0.151 [0.133–0.169] of 1374; WUR 0.429 [0.403–0.454] of 1374; WUG 0.031 [0.022–0.040] of 1374; WBR 0.066 [0.053–0.080] of 1374; UBR 0.180 [0.161–0.200] of 1374; UBG 0.060 [0.048–0.073] of 1374; URG 0.053 [0.042–0.065] of 1374

## Payoff: the colour's win rate in games between decks that differ in it (target 0.500)

| arm | decks | games | W | U | B | R | G |
|---|---|---|---|---|---|---|---|
| Blab (judged) | 4000 | 3989 | 0.521 [0.503–0.541] n 2776 EVEN | 0.482 [0.454–0.508] n 1389 EVEN | 0.474 [0.455–0.494] n 2800 EVEN | 0.455 [0.435–0.474] n 2446 UNCLEAR | 0.523 [0.492–0.551] n 1290 UNCLEAR |

**A vs C** (report, don't act): W: B EVEN, C None; U: B EVEN, C None; B: B EVEN, C None; R: B UNCLEAR, C None; G: B UNCLEAR, C None

**Pairs' payoff** (a pair's decks against decks that are not that pair; candidates):

| arm | WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|---|
| Blab | 0.560 [0.534–0.586] | 0.512 [0.472–0.554] | 0.633 [0.515–0.744] | 0.567 [0.472–0.662] | 0.486 [0.458–0.514] | 0.466 [0.424–0.503] | 0.557 [0.505–0.603] | 0.522 [0.421–0.625] | 0.540 [0.471–0.608] | 0.533 [0.375–0.682] |

**By colour count** (decks with k colours against decks with another k; information): Blab: k1 0.375 [0.192–0.500], k2 0.560 [0.537–0.582], k3 0.442 [0.420–0.463]

## Closeness (reported only): the winner's final life and the game's turns, median [IQR]

| arm | cell | games | winner life | turns |
|---|---|---|---|---|
| Blab | all | 3989 | 18.000 [13.000–22.000] | 18.000 [15.000–22.000] |
| Blab | W | 3559 | 18.000 [13.000–22.000] | 18.000 [15.000–22.000] |
| Blab | U | 3983 | 18.000 [13.000–22.000] | 18.000 [15.000–22.000] |
| Blab | B | 3162 | 18.000 [13.000–22.000] | 18.000 [15.000–22.000] |
| Blab | R | 2686 | 18.000 [13.000–21.000] | 18.000 [15.000–21.000] |
| Blab | G | 1300 | 18.000 [14.000–22.000] | 18.000 [15.000–21.000] |
| Blab | WU | 1642 | 18.000 [13.000–22.000] | 18.000 [16.000–23.000] |
| Blab | WB | 578 | 18.000 [14.000–23.000] | 19.000 [16.000–22.000] |
| Blab | WR | 79 | 17.000 [13.000–20.000] | 17.000 [14.000–21.500] |
| Blab | WG | 120 | 19.000 [13.000–23.000] | 18.000 [15.000–21.000] |
| Blab | UB | 1300 | 18.000 [12.000–22.000] | 18.000 [15.000–22.000] |
| Blab | UR | 640 | 17.000 [12.000–20.000] | 18.000 [15.000–22.000] |
| Blab | UG | 472 | 19.000 [14.000–22.000] | 18.000 [15.000–21.000] |
| Blab | BR | 115 | 17.000 [12.000–22.000] | 19.000 [16.000–22.000] |
| Blab | BG | 211 | 18.000 [13.000–22.000] | 17.000 [15.000–21.000] |
| Blab | RG | 30 | 19.000 [15.250–20.750] | 15.500 [14.000–18.000] |

## Real drafts (the draft-deck ledger, colour counts only)

not read: a generated cube has no real drafts
