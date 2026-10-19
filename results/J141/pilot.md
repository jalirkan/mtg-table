# J141: the pilot slice -- Forge against search-v2 on the same census games

2000 slice games, 4000 deck-games, 3212 decks. Every interval is a deck-clustered percentile bootstrap (1000 replicates, seed 1411). No verdict: any difference is a candidate until it holds on a fresh slice (D447 point 9). The decks are random draws from a band pool, so every rate is "in a random deck of this makeup", not in a built deck.

## Integrity

| arm | rows | expected | missing | id mismatch | first mismatch / compared | policy mismatch | counters missing | engine errors | timeouts | draws |
|---|---|---|---|---|---|---|---|---|---|---|
| ss | 2000 | 2000 | 0 | 0 | 0 / 1987 | 0 | 0 | 13 | 0 | 2 |
| ps | 2000 | 2000 | 0 | 0 | 0 / 1992 | 0 | 0 | 8 | 0 | 2 |
| sp | 2000 | 2000 | 0 | 0 | 0 / 1996 | 0 | 0 | 4 | 0 | 1 |

## Read 1: win rate by colour, Forge vs Forge (J140) against search vs search (arm S)

| main colour | deck-games | FF | 95% | SS | 95% | SS − FF (paired) | 95% |
|---|---|---|---|---|---|---|---|
| W | 792 | 0.519 | 0.488–0.553 | 0.544 | 0.510–0.583 | 0.025 | -0.011–0.060 |
| U | 795 | 0.433 | 0.395–0.467 | 0.425 | 0.390–0.464 | -0.006 | -0.044–0.029 |
| B | 868 | 0.487 | 0.453–0.521 | 0.453 | 0.420–0.485 | -0.033 | -0.069–0.000 |
| R | 762 | 0.531 | 0.496–0.566 | 0.545 | 0.510–0.579 | 0.013 | -0.021–0.049 |
| G | 779 | 0.533 | 0.497–0.570 | 0.541 | 0.501–0.576 | 0.006 | -0.035–0.044 |

| colours with 3+ spells | deck-games | FF | 95% | SS | 95% | SS − FF (paired) | 95% |
|---|---|---|---|---|---|---|---|
| 1 | 1338 | 0.586 | 0.559–0.612 | 0.578 | 0.552–0.605 | -0.010 | -0.036–0.017 |
| 2 | 674 | 0.540 | 0.501–0.579 | 0.509 | 0.469–0.549 | -0.032 | -0.074–0.009 |
| 3 | 657 | 0.476 | 0.439–0.514 | 0.485 | 0.447–0.526 | 0.011 | -0.032–0.050 |
| 4 | 1059 | 0.411 | 0.383–0.442 | 0.429 | 0.401–0.459 | 0.019 | -0.011–0.050 |
| 5 | 268 | 0.381 | 0.326–0.441 | 0.408 | 0.351–0.468 | 0.026 | -0.032–0.078 |

| has the colour (any pip) | deck-games | FF | 95% | SS | 95% | SS − FF (paired) | 95% |
|---|---|---|---|---|---|---|---|
| W | 2330 | 0.464 | 0.444–0.484 | 0.474 | 0.454–0.496 | 0.011 | -0.009–0.032 |
| U | 2326 | 0.440 | 0.419–0.462 | 0.448 | 0.428–0.469 | 0.009 | -0.012–0.031 |
| B | 2367 | 0.456 | 0.437–0.477 | 0.460 | 0.442–0.481 | 0.005 | -0.016–0.025 |
| R | 2327 | 0.474 | 0.455–0.494 | 0.477 | 0.456–0.498 | 0.003 | -0.018–0.023 |
| G | 2377 | 0.469 | 0.449–0.490 | 0.482 | 0.460–0.503 | 0.013 | -0.009–0.036 |

## Read 2: the card-flow coefficient (points of win rate per card-flow card, colours held fixed)

Bands entered: pauper, peasant, legacy, powered (a band enters when 50 or more of its slice deck-games hold 1+ card-flow cards).

| pilot | deck-games | β | 95% |
|---|---|---|---|
| Forge (slice) | 3996 | -2.74 | -4.90 – -0.75 |
| search (slice) | 3970 | -3.16 | -5.21 – -1.25 |
| Forge (all of J140) | 159876 | -2.61 | -3.06 – -2.19 |
| search − Forge (slice, paired) | | -0.42 | -2.51 – 1.59 |

## Read 3: cards

4129 band-and-card rows, 2103 with min(decisive slice deck-games under Forge, under search) >= 20.
Spearman, shrunk ratings: 0.615 [0.486, 0.609]; raw: 0.613 [0.485, 0.604]. The swap reference (the pilots exchanged at random, 200 times): median 0.620 [0.592, 0.646].

| card colour | cards | mean move (SS − FF, shrunk) | 95% |
|---|---|---|---|
| W | 268 | 0.006 | -0.013–0.025 |
| U | 271 | 0.001 | -0.019–0.021 |
| B | 278 | -0.014 | -0.035–0.006 |
| R | 266 | -0.001 | -0.021–0.018 |
| G | 282 | 0.003 | -0.018–0.025 |
| M | 522 | 0.009 | -0.006–0.024 |
| C | 216 | -0.003 | -0.015–0.011 |
| flow | 13 | -0.015 | -0.054–0.021 |

**The 20 that rise most under search**

| band | card | colour | FF n | FF shrunk | SS n | SS shrunk | move | paired diff | 95% |
|---|---|---|---|---|---|---|---|---|---|
| peasant | Untamed Wilds | G | 53 | 0.397 | 53 | 0.562 | 0.164 | 0.226 | 0.078–0.360 |
| pauper | Mirkwood Nurturer | UG | 35 | 0.345 | 35 | 0.509 | 0.164 | 0.257 | 0.079–0.439 |
| powered | Oracle of Mul Daya | G | 31 | 0.451 | 31 | 0.608 | 0.157 | 0.258 | 0.069–0.444 |
| peasant | Greta, Sweettooth Scourge | BG | 41 | 0.377 | 41 | 0.525 | 0.147 | 0.220 | 0.048–0.395 |
| peasant | Talisman of Dominance | UB | 56 | 0.382 | 54 | 0.527 | 0.145 | 0.204 | 0.068–0.340 |
| legacy | Concealing Curtains | B | 51 | 0.437 | 51 | 0.578 | 0.141 | 0.196 | 0.049–0.360 |
| peasant | Hunter's Talent | G | 52 | 0.458 | 52 | 0.597 | 0.139 | 0.192 | 0.050–0.348 |
| legacy | Godless Shrine | WB | 60 | 0.375 | 60 | 0.512 | 0.138 | 0.183 | 0.054–0.318 |
| legacy | Atraxa, Grand Unifier | WUBG | 32 | 0.404 | 32 | 0.538 | 0.135 | 0.219 | 0.024–0.439 |
| peasant | Dockside Chef | B | 32 | 0.365 | 32 | 0.500 | 0.135 | 0.219 | 0.037–0.400 |
| powered | Krenko, Tin Street Kingpin | R | 47 | 0.492 | 47 | 0.627 | 0.134 | 0.192 | 0.039–0.353 |
| powered | Avenger of Zendikar | G | 40 | 0.433 | 40 | 0.567 | 0.133 | 0.200 | 0.049–0.342 |
| peasant | Land Tax | W | 62 | 0.451 | 57 | 0.584 | 0.133 | 0.158 | 0.023–0.300 |
| powered | Hexdrinker | G | 33 | 0.415 | 33 | 0.547 | 0.132 | 0.212 | 0.059–0.358 |
| powered | Delighted Halfling | G | 34 | 0.574 | 34 | 0.704 | 0.130 | 0.206 | 0.086–0.326 |
| legacy | Ledger Shredder | U | 42 | 0.435 | 42 | 0.565 | 0.129 | 0.191 | 0.051–0.309 |
| pauper | Memory Lapse | U | 58 | 0.449 | 58 | 0.577 | 0.128 | 0.172 | 0.022–0.311 |
| pauper | Psychic Purge | U | 37 | 0.368 | 37 | 0.491 | 0.123 | 0.189 | 0.000–0.375 |
| peasant | Umbral Collar Zealot | B | 37 | 0.439 | 37 | 0.561 | 0.123 | 0.189 | 0.000–0.395 |
| legacy | Xira Arien | BRG | 30 | 0.440 | 30 | 0.560 | 0.120 | 0.200 | 0.069–0.323 |

**The 20 that fall most under search**

| band | card | colour | FF n | FF shrunk | SS n | SS shrunk | move | paired diff | 95% |
|---|---|---|---|---|---|---|---|---|---|
| peasant | Dreadwing Scavenger | UB | 43 | 0.556 | 43 | 0.397 | -0.159 | -0.233 | -0.393–-0.079 |
| powered | Arcbound Ravager | C | 25 | 0.578 | 25 | 0.422 | -0.156 | -0.280 | -0.500–-0.042 |
| powered | Tetravus | C | 32 | 0.596 | 32 | 0.442 | -0.154 | -0.250 | -0.438–-0.075 |
| powered | Courser of Kruphix | G | 32 | 0.654 | 32 | 0.500 | -0.154 | -0.250 | -0.432–-0.100 |
| legacy | Reveillark | W | 27 | 0.596 | 27 | 0.447 | -0.149 | -0.259 | -0.500–-0.062 |
| powered | Black Widow, Super Spy | B | 42 | 0.548 | 42 | 0.403 | -0.145 | -0.214 | -0.394–-0.027 |
| legacy | Earthquake | R | 44 | 0.688 | 44 | 0.547 | -0.141 | -0.204 | -0.385–-0.042 |
| powered | Fear of Missing Out | R | 45 | 0.615 | 45 | 0.477 | -0.139 | -0.200 | -0.356–-0.067 |
| powered | Botanical Sanctum | UG | 74 | 0.543 | 74 | 0.404 | -0.138 | -0.176 | -0.281–-0.075 |
| legacy | Talrand, Sky Summoner | U | 39 | 0.491 | 39 | 0.356 | -0.136 | -0.205 | -0.405–0.000 |
| peasant | Cult Conscript | B | 59 | 0.595 | 58 | 0.462 | -0.133 | -0.190 | -0.327–-0.038 |
| powered | Ugin, Eye of the Storms | C | 34 | 0.593 | 34 | 0.463 | -0.130 | -0.206 | -0.324–-0.095 |
| legacy | Icetill Explorer | G | 34 | 0.537 | 34 | 0.407 | -0.130 | -0.206 | -0.417–0.000 |
| legacy | Jace, Wielder of Mysteries | U | 35 | 0.582 | 35 | 0.455 | -0.127 | -0.200 | -0.348–-0.035 |
| legacy | Esika's Chariot | G | 30 | 0.660 | 30 | 0.540 | -0.120 | -0.200 | -0.375–-0.074 |
| pauper | Okiba Reckoner Raid | B | 56 | 0.632 | 56 | 0.513 | -0.118 | -0.161 | -0.273–-0.048 |
| powered | Phlage, Titan of Fire's Fury | WR | 31 | 0.608 | 31 | 0.490 | -0.118 | -0.194 | -0.455–0.071 |
| pauper | Gurmag Angler | B | 48 | 0.544 | 48 | 0.426 | -0.118 | -0.167 | -0.300–-0.023 |
| powered | Blightstep Pathway | BR | 57 | 0.493 | 57 | 0.377 | -0.117 | -0.158 | -0.283–-0.036 |
| pauper | Mintstrosity | B | 49 | 0.623 | 49 | 0.507 | -0.116 | -0.163 | -0.312–0.000 |

## Read 4: arm M, search against Forge with sides swapped

| main colour | deck-games | edge (search seat, both games) | 95% | search pilots it | 95% | lift over FF | 95% |
|---|---|---|---|---|---|---|---|
| all | 3970 | 0.589 | 0.580–0.598 | 0.589 | 0.574–0.605 | 0.089 | 0.073–0.104 |
| W | 779 | 0.583 | 0.565–0.603 | 0.611 | 0.579–0.646 | 0.092 | 0.059–0.129 |
| U | 791 | 0.588 | 0.571–0.606 | 0.516 | 0.482–0.553 | 0.083 | 0.047–0.119 |
| B | 867 | 0.591 | 0.575–0.608 | 0.582 | 0.549–0.613 | 0.095 | 0.062–0.127 |
| R | 758 | 0.583 | 0.564–0.603 | 0.605 | 0.569–0.639 | 0.072 | 0.039–0.103 |
| G | 775 | 0.597 | 0.579–0.615 | 0.634 | 0.600–0.665 | 0.102 | 0.065–0.138 |

| colours with 3+ spells | deck-games | edge (search seat, both games) | 95% | search pilots it | 95% | lift over FF | 95% |
|---|---|---|---|---|---|---|---|
| all | 3970 | 0.589 | 0.580–0.598 | 0.589 | 0.574–0.605 | 0.089 | 0.073–0.104 |
| 1 | 1324 | 0.579 | 0.565–0.594 | 0.646 | 0.620–0.672 | 0.059 | 0.034–0.085 |
| 2 | 670 | 0.599 | 0.579–0.619 | 0.629 | 0.594–0.663 | 0.089 | 0.050–0.128 |
| 3 | 654 | 0.607 | 0.585–0.627 | 0.589 | 0.552–0.628 | 0.115 | 0.077–0.154 |
| 4 | 1056 | 0.590 | 0.574–0.605 | 0.520 | 0.490–0.548 | 0.108 | 0.076–0.137 |
| 5 | 266 | 0.564 | 0.534–0.595 | 0.478 | 0.420–0.541 | 0.097 | 0.050–0.151 |

| card-flow cards | deck-games | edge (search seat, both games) | 95% | search pilots it | 95% | lift over FF | 95% |
|---|---|---|---|---|---|---|---|
| all | 3970 | 0.589 | 0.580–0.598 | 0.589 | 0.574–0.605 | 0.089 | 0.073–0.104 |
| f0 | 2799 | 0.593 | 0.583–0.602 | 0.604 | 0.585–0.622 | 0.093 | 0.076–0.111 |
| f1 | 753 | 0.582 | 0.564–0.602 | 0.583 | 0.549–0.620 | 0.087 | 0.051–0.123 |
| f2 | 238 | 0.586 | 0.556–0.621 | 0.513 | 0.448–0.580 | 0.067 | 0.004–0.138 |
| f3p | 180 | 0.558 | 0.514–0.601 | 0.483 | 0.408–0.561 | 0.056 | -0.024–0.134 |

| band | deck-games | edge (search seat, both games) | 95% | search pilots it | 95% | lift over FF | 95% |
|---|---|---|---|---|---|---|---|
| all | 3970 | 0.589 | 0.580–0.598 | 0.589 | 0.574–0.605 | 0.089 | 0.073–0.104 |
| pauper | 998 | 0.566 | 0.549–0.584 | 0.567 | 0.537–0.600 | 0.067 | 0.034–0.100 |
| peasant | 978 | 0.614 | 0.598–0.628 | 0.614 | 0.583–0.643 | 0.114 | 0.083–0.144 |
| legacy | 1000 | 0.593 | 0.577–0.610 | 0.593 | 0.563–0.625 | 0.093 | 0.066–0.121 |
| powered | 994 | 0.583 | 0.566–0.599 | 0.583 | 0.553–0.612 | 0.081 | 0.052–0.113 |

## Read 5: search counters and games per pilot

| arm | games | decisive | mean turns | mean game s | search seats | searched / seat-game | changed share | ms / decision | budget fallbacks [95%] |
|---|---|---|---|---|---|---|---|---|---|
| ff | 2000 | 1998 | 18.7565 | 2.2167 | 0 | – | – | – | – = – [–, –] |
| ss | 2000 | 1985 | 17.5023 | 32.4144 | 3974 | 19.9429 | 0.166 | 769.1584 | 349 = 0.004 [0.004, 0.005] |
| ps | 2000 | 1990 | 18.0492 | 18.3404 | 1992 | 20.3695 | 0.168 | 794.1763 | 303 = 0.007 [0.007, 0.008] |
| sp | 2000 | 1995 | 18.004 | 18.1421 | 1996 | 20.3337 | 0.164 | 791.424 | 284 = 0.007 [0.006, 0.008] |
