# Deck census: win rate across the colour spectrum (D447)

Every deck here is a random draw from its band's pool at a random colour makeup, with no curve, synergy or rating rule, so it is mostly weaker than a drafted or built deck: **every rate, and every card's value, is "in a random deck of this makeup", as Forge's AI plays it**, not in a built deck.

80000 games, 10000 decks, pilots plain/plain; bootstrap 1000 replicates (seed 1), clustered by deck. Bins are the realised profiles, read after the games; no bin is a verdict, and any difference is a candidate until it holds on fresh seeds. Every rate is as Forge's AI plays it.

## pauper

20000 games (19989 decisive, 11 drawn, 10 timeouts, 0 engine errors); 2500 decks, deck-games min 16, median 16; the first player won 0.501 of 19989.

**The weak-deck tail** (every deck played is castable, so the uncastable ones are the draws rejected before it): 0 rejected draw(s) and 0 new makeup(s) over the band's 2500 decks; 0 deck(s) came after at least one; 0.000 of all draws were rejected.

| colours with 3+ spells | decks | deck-games | decisive | win rate | 95% (deck bootstrap) | Wilson (unclustered) |
|---|---|---|---|---|---|---|
| 1 | 650 | 10400 | 10392 | 0.574 | 0.560–0.588 | 0.564–0.583 |
| 2 | 797 | 12752 | 12744 | 0.516 | 0.504–0.528 | 0.507–0.525 |
| 3 | 695 | 11120 | 11115 | 0.467 | 0.455–0.481 | 0.458–0.476 |
| 4 | 302 | 4832 | 4831 | 0.402 | 0.386–0.420 | 0.388–0.416 |
| 5 | 56 | 896 | 896 | 0.354 | 0.305–0.407 | 0.323–0.386 |

| main-colour share of pips | decks | deck-games | decisive | win rate | 95% (deck bootstrap) | Wilson (unclustered) |
|---|---|---|---|---|---|---|
| < 0.4 | 316 | 5056 | 5056 | 0.401 | 0.383–0.418 | 0.387–0.414 |
| 0.4–0.5 | 351 | 5616 | 5614 | 0.434 | 0.418–0.451 | 0.422–0.447 |
| 0.5–0.6 | 453 | 7248 | 7242 | 0.478 | 0.462–0.495 | 0.466–0.489 |
| 0.6–0.7 | 346 | 5536 | 5533 | 0.508 | 0.490–0.524 | 0.495–0.521 |
| 0.7–0.8 | 236 | 3776 | 3773 | 0.498 | 0.477–0.519 | 0.482–0.514 |
| 0.8–0.9 | 175 | 2800 | 2799 | 0.570 | 0.544–0.596 | 0.551–0.588 |
| 0.9–<1.0 | 96 | 1536 | 1533 | 0.585 | 0.548–0.620 | 0.560–0.609 |
| 1.0 (mono) | 527 | 8432 | 8428 | 0.580 | 0.564–0.596 | 0.569–0.590 |

| the prior's k | decks | deck-games | decisive | win rate | 95% (deck bootstrap) | Wilson (unclustered) |
|---|---|---|---|---|---|---|
| 1 | 495 | 7920 | 7916 | 0.580 | 0.564–0.597 | 0.569–0.591 |
| 2 | 526 | 8416 | 8412 | 0.554 | 0.540–0.569 | 0.544–0.565 |
| 3 | 500 | 8000 | 7994 | 0.506 | 0.491–0.521 | 0.495–0.517 |
| 4 | 513 | 8208 | 8200 | 0.443 | 0.429–0.456 | 0.432–0.454 |
| 5 | 466 | 7456 | 7456 | 0.410 | 0.395–0.424 | 0.399–0.421 |

## peasant

20000 games (19983 decisive, 16 drawn, 5 timeouts, 1 engine errors); 2500 decks, deck-games min 15, median 16; the first player won 0.517 of 19983.

**The weak-deck tail** (every deck played is castable, so the uncastable ones are the draws rejected before it): 0 rejected draw(s) and 0 new makeup(s) over the band's 2500 decks; 0 deck(s) came after at least one; 0.000 of all draws were rejected.

| colours with 3+ spells | decks | deck-games | decisive | win rate | 95% (deck bootstrap) | Wilson (unclustered) |
|---|---|---|---|---|---|---|
| 1 | 570 | 9120 | 9111 | 0.599 | 0.586–0.612 | 0.589–0.609 |
| 2 | 664 | 10624 | 10617 | 0.539 | 0.528–0.551 | 0.530–0.549 |
| 3 | 707 | 11310 | 11300 | 0.466 | 0.454–0.478 | 0.457–0.476 |
| 4 | 452 | 7232 | 7226 | 0.393 | 0.380–0.407 | 0.382–0.405 |
| 5 | 107 | 1712 | 1712 | 0.400 | 0.371–0.429 | 0.377–0.423 |

| main-colour share of pips | decks | deck-games | decisive | win rate | 95% (deck bootstrap) | Wilson (unclustered) |
|---|---|---|---|---|---|---|
| < 0.4 | 407 | 6512 | 6505 | 0.397 | 0.382–0.412 | 0.385–0.409 |
| 0.4–0.5 | 450 | 7198 | 7193 | 0.421 | 0.406–0.434 | 0.410–0.432 |
| 0.5–0.6 | 443 | 7088 | 7083 | 0.489 | 0.474–0.504 | 0.478–0.501 |
| 0.6–0.7 | 295 | 4720 | 4719 | 0.521 | 0.503–0.542 | 0.507–0.535 |
| 0.7–0.8 | 200 | 3200 | 3197 | 0.553 | 0.533–0.573 | 0.536–0.570 |
| 0.8–0.9 | 148 | 2368 | 2365 | 0.557 | 0.534–0.582 | 0.537–0.577 |
| 0.9–<1.0 | 64 | 1024 | 1021 | 0.558 | 0.519–0.598 | 0.528–0.588 |
| 1.0 (mono) | 493 | 7888 | 7883 | 0.608 | 0.594–0.622 | 0.597–0.618 |

| the prior's k | decks | deck-games | decisive | win rate | 95% (deck bootstrap) | Wilson (unclustered) |
|---|---|---|---|---|---|---|
| 1 | 485 | 7760 | 7755 | 0.609 | 0.594–0.623 | 0.598–0.620 |
| 2 | 493 | 7888 | 7877 | 0.555 | 0.541–0.568 | 0.545–0.566 |
| 3 | 503 | 8047 | 8039 | 0.510 | 0.497–0.524 | 0.499–0.521 |
| 4 | 515 | 8239 | 8235 | 0.431 | 0.417–0.445 | 0.421–0.442 |
| 5 | 504 | 8064 | 8060 | 0.401 | 0.387–0.414 | 0.390–0.412 |

## legacy

20000 games (19977 decisive, 23 drawn, 7 timeouts, 0 engine errors); 2500 decks, deck-games min 16, median 16; the first player won 0.535 of 19977.

**The weak-deck tail** (every deck played is castable, so the uncastable ones are the draws rejected before it): 0 rejected draw(s) and 0 new makeup(s) over the band's 2500 decks; 0 deck(s) came after at least one; 0.000 of all draws were rejected.

| colours with 3+ spells | decks | deck-games | decisive | win rate | 95% (deck bootstrap) | Wilson (unclustered) |
|---|---|---|---|---|---|---|
| 1 | 637 | 10192 | 10178 | 0.597 | 0.585–0.609 | 0.588–0.607 |
| 2 | 636 | 10176 | 10163 | 0.536 | 0.524–0.548 | 0.526–0.546 |
| 3 | 640 | 10240 | 10227 | 0.459 | 0.447–0.471 | 0.449–0.468 |
| 4 | 445 | 7120 | 7114 | 0.408 | 0.394–0.421 | 0.396–0.419 |
| 5 | 142 | 2272 | 2272 | 0.378 | 0.353–0.401 | 0.358–0.398 |

| main-colour share of pips | decks | deck-games | decisive | win rate | 95% (deck bootstrap) | Wilson (unclustered) |
|---|---|---|---|---|---|---|
| < 0.4 | 372 | 5952 | 5946 | 0.397 | 0.383–0.414 | 0.385–0.410 |
| 0.4–0.5 | 448 | 7168 | 7159 | 0.427 | 0.413–0.441 | 0.416–0.439 |
| 0.5–0.6 | 439 | 7024 | 7019 | 0.480 | 0.466–0.494 | 0.468–0.492 |
| 0.6–0.7 | 276 | 4416 | 4410 | 0.509 | 0.490–0.527 | 0.494–0.524 |
| 0.7–0.8 | 190 | 3040 | 3038 | 0.534 | 0.510–0.558 | 0.516–0.552 |
| 0.8–0.9 | 138 | 2208 | 2204 | 0.554 | 0.529–0.581 | 0.534–0.575 |
| 0.9–<1.0 | 70 | 1120 | 1119 | 0.586 | 0.549–0.626 | 0.557–0.615 |
| 1.0 (mono) | 567 | 9072 | 9059 | 0.601 | 0.588–0.613 | 0.590–0.611 |

| the prior's k | decks | deck-games | decisive | win rate | 95% (deck bootstrap) | Wilson (unclustered) |
|---|---|---|---|---|---|---|
| 1 | 559 | 8944 | 8931 | 0.602 | 0.589–0.615 | 0.592–0.612 |
| 2 | 479 | 7664 | 7654 | 0.558 | 0.545–0.573 | 0.547–0.569 |
| 3 | 485 | 7760 | 7748 | 0.496 | 0.482–0.511 | 0.485–0.508 |
| 4 | 496 | 7936 | 7931 | 0.433 | 0.421–0.446 | 0.422–0.444 |
| 5 | 481 | 7696 | 7690 | 0.396 | 0.383–0.409 | 0.385–0.407 |

## powered

20000 games (19989 decisive, 9 drawn, 1 timeouts, 2 engine errors); 2500 decks, deck-games min 15, median 16; the first player won 0.529 of 19989.

**The weak-deck tail** (every deck played is castable, so the uncastable ones are the draws rejected before it): 0 rejected draw(s) and 0 new makeup(s) over the band's 2500 decks; 0 deck(s) came after at least one; 0.000 of all draws were rejected.

| colours with 3+ spells | decks | deck-games | decisive | win rate | 95% (deck bootstrap) | Wilson (unclustered) |
|---|---|---|---|---|---|---|
| 1 | 601 | 9616 | 9610 | 0.593 | 0.579–0.605 | 0.583–0.602 |
| 2 | 677 | 10828 | 10824 | 0.530 | 0.517–0.542 | 0.520–0.539 |
| 3 | 649 | 10384 | 10382 | 0.473 | 0.462–0.484 | 0.464–0.483 |
| 4 | 439 | 7024 | 7020 | 0.415 | 0.402–0.429 | 0.404–0.427 |
| 5 | 134 | 2144 | 2142 | 0.341 | 0.316–0.366 | 0.321–0.362 |

| main-colour share of pips | decks | deck-games | decisive | win rate | 95% (deck bootstrap) | Wilson (unclustered) |
|---|---|---|---|---|---|---|
| < 0.4 | 378 | 6048 | 6045 | 0.385 | 0.368–0.402 | 0.373–0.397 |
| 0.4–0.5 | 425 | 6800 | 6797 | 0.442 | 0.427–0.455 | 0.430–0.454 |
| 0.5–0.6 | 454 | 7263 | 7262 | 0.487 | 0.473–0.501 | 0.475–0.498 |
| 0.6–0.7 | 295 | 4719 | 4717 | 0.510 | 0.491–0.530 | 0.496–0.524 |
| 0.7–0.8 | 207 | 3311 | 3309 | 0.530 | 0.505–0.555 | 0.513–0.547 |
| 0.8–0.9 | 149 | 2383 | 2382 | 0.572 | 0.546–0.597 | 0.552–0.592 |
| 0.9–<1.0 | 75 | 1200 | 1199 | 0.585 | 0.540–0.630 | 0.557–0.612 |
| 1.0 (mono) | 517 | 8272 | 8267 | 0.593 | 0.579–0.606 | 0.582–0.603 |

| the prior's k | decks | deck-games | decisive | win rate | 95% (deck bootstrap) | Wilson (unclustered) |
|---|---|---|---|---|---|---|
| 1 | 509 | 8144 | 8139 | 0.593 | 0.578–0.607 | 0.582–0.603 |
| 2 | 514 | 8222 | 8218 | 0.551 | 0.536–0.566 | 0.540–0.562 |
| 3 | 499 | 7983 | 7981 | 0.507 | 0.493–0.522 | 0.496–0.518 |
| 4 | 483 | 7727 | 7725 | 0.458 | 0.444–0.471 | 0.447–0.469 |
| 5 | 495 | 7920 | 7915 | 0.386 | 0.372–0.398 | 0.375–0.397 |

