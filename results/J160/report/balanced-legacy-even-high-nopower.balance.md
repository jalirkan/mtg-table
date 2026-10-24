**Forge-pilot caveat:** Every game is piloted by Forge's Default AI on both seats. J141 found the live search seat lifts every colour about equally (+8.9 points), so a Forge-only payoff is the right first cut, but it is Forge's.

# J160: is balanced-legacy-even-high-nopower balanced by colour? (J145's judged arm: lab vs lab)

**Colour level: BALANCED ON PAYOFF.** OFF on arm-B payoff (Blab, lab vs lab): none. **Pull is reported, never judged** (the library loop optimises payoff only; the lab drafter is the one drafter). The registered rule: a cell is OFF when its 95% interval excludes the target and the point is at least 0.08 (pull) or 0.05 (payoff) from it; EVEN when the interval sits inside that band; else UNCLEAR. BALANCED ON PAYOFF when no colour is OFF on arm-B payoff. Everything else below is a candidate (D447 point 9). No card is swapped on this night.

## Pull (arm A, reported, never judged): share of two-colour decks containing the colour (target 0.400; labels are information)

| drafter | decks | k = 1 / 2 / 3 (excluded 0, 4, 5) | W | U | B | R | G |
|---|---|---|---|---|---|---|---|
| lab (lab) | 4000 | 3 / 3247 / 750 (0, 0, 0) | 0.425 [0.411–0.439] EVEN | 0.360 [0.346–0.373] EVEN | 0.129 [0.118–0.139] OFF | 0.698 [0.685–0.711] OFF | 0.388 [0.374–0.403] EVEN |

Beside it, not judged: mono decks by colour (share of mono decks) and three-colour decks containing the colour (share of three-colour decks, average 0.6).

| drafter | mono W | mono U | mono B | mono R | mono G | 3c W | 3c U | 3c B | 3c R | 3c G |
|---|---|---|---|---|---|---|---|---|---|---|
| lab | 0.000 | 0.333 | 0.000 | 0.667 | 0.000 | 0.721 | 0.425 | 0.288 | 0.939 | 0.627 |

**Pairs** (share of two-colour decks, average 0.100; candidates):

| drafter | WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|---|
| lab | 0.040 [0.033–0.047] | 0.028 [0.022–0.034] | 0.285 [0.272–0.299] | 0.072 [0.064–0.081] | 0.030 [0.025–0.037] | 0.190 [0.177–0.203] | 0.100 [0.090–0.110] | 0.038 [0.032–0.044] | 0.032 [0.026–0.039] | 0.184 [0.171–0.196] |

Triples with 40+ decks (lab): WUR 0.168 [0.140–0.193] of 750; WBR 0.171 [0.143–0.198] of 750; WRG 0.339 [0.306–0.374] of 750; URG 0.193 [0.165–0.222] of 750

## Payoff: the colour's win rate in games between decks that differ in it (target 0.500)

| arm | decks | games | W | U | B | R | G |
|---|---|---|---|---|---|---|---|
| Blab (judged) | 4000 | 4000 | 0.502 [0.485–0.521] n 2852 EVEN | 0.508 [0.488–0.527] n 2590 EVEN | 0.451 [0.424–0.481] n 1264 UNCLEAR | 0.500 [0.477–0.523] n 1968 EVEN | 0.475 [0.457–0.494] n 2792 EVEN |

**A vs C** (report, don't act): W: B EVEN, C None; U: B EVEN, C None; B: B UNCLEAR, C None; R: B EVEN, C None; G: B EVEN, C None

**Pairs' payoff** (a pair's decks against decks that are not that pair; candidates):

| arm | WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|---|
| Blab | 0.543 [0.480–0.607] | 0.500 [0.422–0.580] | 0.524 [0.501–0.547] | 0.502 [0.455–0.547] | 0.525 [0.455–0.594] | 0.543 [0.515–0.570] | 0.505 [0.463–0.544] | 0.440 [0.373–0.509] | 0.462 [0.398–0.526] | 0.507 [0.478–0.536] |

**By colour count** (decks with k colours against decks with another k; information): Blab: k1 0.667 [0.500–1.000], k2 0.576 [0.550–0.602], k3 0.424 [0.399–0.453]

## Closeness (reported only): the winner's final life and the game's turns, median [IQR]

| arm | cell | games | winner life | turns |
|---|---|---|---|---|
| Blab | all | 4000 | 20.000 [14.000–25.000] | 15.000 [13.000–18.000] |
| Blab | W | 3348 | 20.000 [15.000–26.000] | 15.000 [13.000–18.000] |
| Blab | U | 2784 | 19.000 [14.000–25.000] | 15.000 [13.000–18.000] |
| Blab | B | 1266 | 20.000 [14.000–25.000] | 15.000 [13.000–18.000] |
| Blab | R | 3956 | 20.000 [14.000–25.000] | 15.000 [13.000–18.000] |
| Blab | G | 3126 | 20.000 [14.000–25.000] | 15.000 [13.000–18.000] |
| Blab | WU | 258 | 19.000 [14.000–25.000] | 15.000 [13.000–18.000] |
| Blab | WB | 180 | 20.000 [16.000–25.250] | 15.000 [13.000–18.000] |
| Blab | WR | 1834 | 20.000 [15.000–25.000] | 15.000 [12.000–17.000] |
| Blab | WG | 470 | 20.000 [16.000–27.000] | 15.000 [13.000–18.000] |
| Blab | UB | 198 | 18.500 [14.000–23.000] | 15.000 [13.000–17.000] |
| Blab | UR | 1228 | 19.000 [14.000–24.000] | 14.000 [12.000–17.000] |
| Blab | UG | 646 | 19.500 [14.000–26.000] | 15.000 [13.000–18.000] |
| Blab | BR | 248 | 19.000 [13.000–27.000] | 15.000 [13.000–18.000] |
| Blab | BG | 210 | 19.000 [14.000–25.000] | 15.000 [13.000–18.000] |
| Blab | RG | 1192 | 19.000 [14.000–24.000] | 14.000 [12.000–17.000] |

## Real drafts (the draft-deck ledger, colour counts only)

not read: a generated cube has no real drafts
