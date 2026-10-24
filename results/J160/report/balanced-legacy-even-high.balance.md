**Forge-pilot caveat:** Every game is piloted by Forge's Default AI on both seats. J141 found the live search seat lifts every colour about equally (+8.9 points), so a Forge-only payoff is the right first cut, but it is Forge's.

# J160: is balanced-legacy-even-high balanced by colour? (J145's judged arm: lab vs lab)

**Colour level: NOT BALANCED ON PAYOFF.** OFF on arm-B payoff (Blab, lab vs lab): U, R. **Pull is reported, never judged** (the library loop optimises payoff only; the lab drafter is the one drafter). The registered rule: a cell is OFF when its 95% interval excludes the target and the point is at least 0.08 (pull) or 0.05 (payoff) from it; EVEN when the interval sits inside that band; else UNCLEAR. BALANCED ON PAYOFF when no colour is OFF on arm-B payoff. Everything else below is a candidate (D447 point 9). No card is swapped on this night.

## Pull (arm A, reported, never judged): share of two-colour decks containing the colour (target 0.400; labels are information)

| drafter | decks | k = 1 / 2 / 3 (excluded 0, 4, 5) | W | U | B | R | G |
|---|---|---|---|---|---|---|---|
| lab (lab) | 4000 | 2 / 3401 / 597 (0, 0, 0) | 0.428 [0.415–0.441] EVEN | 0.554 [0.541–0.567] OFF | 0.163 [0.151–0.175] OFF | 0.642 [0.629–0.655] OFF | 0.214 [0.202–0.226] OFF |

Beside it, not judged: mono decks by colour (share of mono decks) and three-colour decks containing the colour (share of three-colour decks, average 0.6).

| drafter | mono W | mono U | mono B | mono R | mono G | 3c W | 3c U | 3c B | 3c R | 3c G |
|---|---|---|---|---|---|---|---|---|---|---|
| lab | 0.500 | 0.500 | 0.000 | 0.000 | 0.000 | 0.757 | 0.565 | 0.350 | 0.893 | 0.435 |

**Pairs** (share of two-colour decks, average 0.100; candidates):

| drafter | WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|---|
| lab | 0.126 [0.116–0.136] | 0.026 [0.020–0.031] | 0.229 [0.217–0.241] | 0.048 [0.041–0.054] | 0.075 [0.066–0.083] | 0.286 [0.273–0.300] | 0.067 [0.060–0.076] | 0.045 [0.039–0.052] | 0.018 [0.013–0.022] | 0.081 [0.073–0.090] |

Triples with 40+ decks (lab): WUR 0.283 [0.248–0.319] of 597; WBR 0.179 [0.151–0.209] of 597; WRG 0.206 [0.172–0.238] of 597; URG 0.126 [0.099–0.153] of 597

## Payoff: the colour's win rate in games between decks that differ in it (target 0.500)

| arm | decks | games | W | U | B | R | G |
|---|---|---|---|---|---|---|---|
| Blab (judged) | 4000 | 4000 | 0.478 [0.459–0.498] n 2734 EVEN | 0.566 [0.546–0.583] n 2830 OFF | 0.470 [0.445–0.495] n 1482 UNCLEAR | 0.446 [0.426–0.468] n 2338 OFF | 0.474 [0.451–0.497] n 1906 EVEN |

**A vs C** (report, don't act): W: B EVEN, C None; U: B OFF, C None; B: B UNCLEAR, C None; R: B OFF, C None; G: B EVEN, C None

**Pairs' payoff** (a pair's decks against decks that are not that pair; candidates):

| arm | WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|---|
| Blab | 0.600 [0.567–0.634] | 0.471 [0.396–0.548] | 0.455 [0.431–0.482] | 0.491 [0.439–0.545] | 0.545 [0.500–0.591] | 0.547 [0.524–0.571] | 0.557 [0.511–0.602] | 0.422 [0.365–0.475] | 0.525 [0.432–0.608] | 0.442 [0.399–0.488] |

**By colour count** (decks with k colours against decks with another k; information): Blab: k1 0.750 [0.500–1.000], k2 0.584 [0.554–0.614], k3 0.415 [0.385–0.443]

## Closeness (reported only): the winner's final life and the game's turns, median [IQR]

| arm | cell | games | winner life | turns |
|---|---|---|---|---|
| Blab | all | 4000 | 20.000 [15.000–26.000] | 14.000 [12.000–17.000] |
| Blab | W | 3276 | 20.000 [15.000–27.000] | 14.000 [12.000–17.000] |
| Blab | U | 3636 | 20.000 [15.000–26.000] | 14.000 [12.000–17.000] |
| Blab | B | 1504 | 20.000 [15.000–27.000] | 15.000 [12.000–17.250] |
| Blab | R | 3884 | 20.000 [15.000–26.000] | 14.000 [12.000–17.000] |
| Blab | G | 1940 | 20.000 [15.000–26.000] | 14.000 [12.000–18.000] |
| Blab | WU | 854 | 20.000 [16.000–28.000] | 15.000 [13.000–18.000] |
| Blab | WB | 174 | 20.000 [16.000–28.750] | 14.000 [11.250–17.000] |
| Blab | WR | 1540 | 20.000 [16.000–27.000] | 14.000 [12.000–17.000] |
| Blab | WG | 324 | 19.500 [15.000–26.250] | 15.000 [12.000–18.000] |
| Blab | UB | 508 | 20.000 [15.750–26.250] | 15.000 [12.000–17.000] |
| Blab | UR | 1888 | 20.000 [15.000–26.000] | 14.000 [12.000–17.000] |
| Blab | UG | 456 | 20.000 [16.000–28.000] | 15.000 [12.000–18.000] |
| Blab | BR | 306 | 19.000 [15.000–25.000] | 15.000 [12.000–17.000] |
| Blab | BG | 120 | 19.000 [16.000–24.000] | 15.000 [12.000–18.000] |
| Blab | RG | 552 | 19.000 [14.000–26.000] | 14.000 [11.750–17.000] |

## Real drafts (the draft-deck ledger, colour counts only)

not read: a generated cube has no real drafts
