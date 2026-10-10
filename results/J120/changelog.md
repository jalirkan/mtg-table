# The Synergy Cube — version 1 (180 cards, two-player) — evolve changelog

Written by `tools/cubelab.sh evolve` (D299–D300, D331, D357). Each generation plays its drafts on the cube going in and swaps only what the evidence supports; docs/guides/cube-lab.md *Evolve* says how.

A card is cut on the AI's evidence only after two separate looks. **Discovery**: in this generation's drafts the card stands out by more than chance can explain, allowing for the fact that some 180 cards are looked at at once (a false-discovery rate of 10%: of the cards flagged, at most about one in 10 could be a fluke). A discovery is a *candidate*, not a verdict. **Confirmed**: the candidate stands out again, the same way, in a second batch of fresh drafts that played no part in finding it. Only confirmed cards are cut; a candidate that does not confirm stays, and is reported. Win rates count each deck's match as one clump of games (the same deck against the same opponent), so their intervals are wider than a count of games would make them.

## Confirmation history (every attempt, pooled)

Each generation gives a candidate a fresh confirmation batch, so a card that is a candidate again and again gets several chances to confirm by luck. Under D357 a repeat attempt is judged on every one of the card's confirmation batches pooled — a failed one counts against it — at a level halved for each earlier attempt (attempt j at the confirmation level / 2^(j−1)), so over any number of attempts a card with no real effect is cut with a chance of at most twice the level. A first attempt is judged exactly as before.

| Card | Rule | Attempts (each batch alone) | Every attempt pooled | Outcome |
|---|---|---|---|---|
| Lotus Petal | dominant-pick | g1: first line in 39 of 44 grids (0.89 vs 0.75), p 0.021 — confirmed | first line in 39 of 44 grids (0.89 vs 0.75), p 0.021 (1 attempt) | cut in generation 1 |
| Skullclamp | dominant-pick | g4: first line in 34 of 43 grids (0.79 vs 0.75), p 0.339 — not confirmed | first line in 34 of 43 grids (0.79 vs 0.75), p 0.339 (1 attempt) | kept |

## Low-rated cards, judged by exploration (D356)

The deckbuilder plays by rating, so a card rated under the rating-limited bar is rarely played and its "dead" signal says nothing. In 491 of 1600 drafts (share 0.307, z 0.6 against the 0.3 asked), one such card that sat on colour in a pool was forced into the deck in place of the builder's lowest-rated choice of its mana value, at random with a recorded probability: 772 forced deck(s) against 786.3 expected (z -0.5). A card's *delta* compares the decks it was forced into with the decks where it could have been and was not, weighted by those probabilities, one deck's match as one unit: its win rate in place of the builder's choice. It **holds its own** when delta is shown above −0.1 (BH at 0.1), it is **weak when played** when delta is shown below 0. Neither verdict cuts a card: a weak one is for Justin's notes, a holding one for its rating. Every forced card pooled: delta +0.00 ± 0.03; choice-deck mean rating, forced minus not (a balance check, ~0): 0.10.

| Card | Rating-limited | Forced decks (games) | Expected | Win rate with it | Without | Delta (95% CI) | Verdict |
|---|---|---|---|---|---|---|---|
| Charming Prince | yes | 24 (59) | 22.7 | 0.51 | 0.70 | -0.19 (-0.36 to -0.03) | weak when played (a human test: the notes decide) |
| Ulvenwald Mysteries | yes | 21 (49) | 17.4 | 0.28 | 0.43 | -0.16 (-0.31 to -0.01) | weak when played (a human test: the notes decide) |
| Carrion Feeder | yes | 11 (28) | 9.3 | 0.23 | 0.61 | -0.37 (-0.55 to -0.20) | weak when played (a human test: the notes decide) |
| Candy Trail |  | 37 (87) | 29.9 | 0.60 | 0.50 | +0.10 (-0.03 to +0.23) | holds its own when played (underrated by its rating) |
| Myr Sire | yes | 31 (76) | 42.2 | 0.61 | 0.47 | +0.14 (+0.02 to +0.25) | holds its own when played (underrated by its rating) |
| Ajani's Pridemate | yes | 24 (60) | 20.5 | 0.70 | 0.60 | +0.10 (-0.03 to +0.24) | holds its own when played (underrated by its rating) |
| Soulherder | yes | 24 (57) | 27.3 | 0.72 | 0.58 | +0.15 (-0.03 to +0.33) | holds its own when played (underrated by its rating) |
| Satyr Wayfinder | yes | 21 (52) | 22.4 | 0.39 | 0.34 | +0.05 (-0.09 to +0.19) | holds its own when played (underrated by its rating) |
| Cranial Plating |  | 20 (49) | 21.8 | 0.53 | 0.45 | +0.08 (-0.07 to +0.23) | holds its own when played (underrated by its rating) |
| Flickerwisp | yes | 20 (47) | 20.3 | 0.77 | 0.64 | +0.13 (-0.01 to +0.27) | holds its own when played (underrated by its rating) |
| Smuggler's Copter |  | 20 (51) | 17.7 | 0.51 | 0.45 | +0.06 (-0.09 to +0.21) | holds its own when played (underrated by its rating) |
| Intangible Virtue | yes | 15 (38) | 14.8 | 0.77 | 0.63 | +0.15 (+0.01 to +0.28) | holds its own when played (underrated by its rating) |
| Hordeling Outburst | yes | 10 (22) | 9.7 | 0.76 | 0.40 | +0.36 (+0.14 to +0.58) | holds its own when played (underrated by its rating) |
| Lonis, Cryptozoologist | yes | 34 (77) | 33.9 | 0.33 | 0.41 | -0.08 (-0.25 to +0.09) | undecided |
| Unsummon | yes | 32 (75) | 35.0 | 0.46 | 0.44 | +0.02 (-0.13 to +0.17) | undecided |
| Reflector Mage | yes | 24 (57) | 27.6 | 0.59 | 0.62 | -0.02 (-0.21 to +0.16) | undecided |
| Steel Overseer |  | 24 (56) | 19.2 | 0.52 | 0.52 | -0.00 (-0.18 to +0.17) | undecided |
| Watcher for Tomorrow | yes | 24 (58) | 25.8 | 0.41 | 0.51 | -0.10 (-0.26 to +0.06) | undecided |
| Delver of Secrets | yes | 23 (55) | 23.4 | 0.41 | 0.46 | -0.04 (-0.19 to +0.10) | undecided |
| Pelt Collector | yes | 23 (58) | 22.2 | 0.40 | 0.41 | -0.01 (-0.15 to +0.12) | undecided |
| March of Otherworldly Light | yes | 17 (40) | 19.5 | 0.68 | 0.64 | +0.04 (-0.15 to +0.23) | undecided |
| Ram Through | yes | 17 (40) | 15.4 | 0.36 | 0.38 | -0.02 (-0.21 to +0.16) | undecided |
| Sai, Master Thopterist |  | 17 (40) | 12.6 | 0.44 | 0.46 | -0.02 (-0.22 to +0.18) | undecided |
| Knight of Autumn | yes | 16 (38) | 13.7 | 0.70 | 0.65 | +0.05 (-0.17 to +0.28) | undecided |
| Ephemerate | yes | 13 (26) | 15.1 | 0.57 | 0.64 | -0.07 (-0.36 to +0.22) | undecided |
| Experimental Synthesizer | yes | 13 (32) | 10.0 | 0.52 | 0.52 | -0.01 (-0.23 to +0.21) | undecided |
| Tromell, Seymour's Butler |  | 13 (31) | 15.7 | 0.50 | 0.38 | +0.12 (-0.11 to +0.35) | undecided |
| Kari Zev, Skyship Raider | yes | 10 (24) | 8.5 | 0.32 | 0.41 | -0.10 (-0.33 to +0.13) | undecided |
| Thieving Skydiver |  | 10 (23) | 8.7 | 0.43 | 0.39 | +0.04 (-0.22 to +0.31) | undecided |
| Anax, Hardened in the Forge |  | 9 (20) | 7.1 | 0.36 | 0.38 | -0.02 (-0.31 to +0.27) | too few forced decks |
| Fatal Push | yes | 9 (22) | 8.1 | 0.61 | 0.48 | +0.13 (-0.14 to +0.40) | too few forced decks |
| Hangarback Walker |  | 9 (21) | 12.2 | 0.63 | 0.51 | +0.12 (-0.12 to +0.37) | too few forced decks |
| Hanweir Garrison | yes | 9 (22) | 8.2 | 0.39 | 0.54 | -0.15 (-0.39 to +0.09) | too few forced decks |
| Zulaport Cutthroat | yes | 9 (22) | 9.0 | 0.42 | 0.54 | -0.12 (-0.36 to +0.12) | too few forced decks |
| Conclave Mentor | yes | 8 (20) | 9.3 | 0.67 | 0.59 | +0.08 (-0.16 to +0.32) | too few forced decks |
| Emry, Lurker of the Loch |  | 8 (18) | 6.0 | 0.08 | 0.36 | -0.28 (-0.44 to -0.12) | too few forced decks |
| Prized Amalgam | yes | 8 (20) | 7.3 | 0.35 | 0.46 | -0.11 (-0.48 to +0.25) | too few forced decks |
| Sakura-Tribe Elder |  | 8 (18) | 13.7 | 0.42 | 0.34 | +0.08 (-0.31 to +0.47) | too few forced decks |
| Scute Swarm |  | 8 (19) | 7.2 | 0.55 | 0.46 | +0.09 (-0.17 to +0.35) | too few forced decks |
| Midnight Reaper |  | 7 (15) | 7.0 | 0.80 | 0.51 | +0.30 (+0.05 to +0.54) | too few forced decks |
| Restoration Angel |  | 7 (17) | 9.4 | 0.56 | 0.74 | -0.18 (-0.43 to +0.06) | too few forced decks |
| Tidehollow Sculler | yes | 7 (16) | 6.1 | 0.83 | 0.42 | +0.41 (-0.09 to +0.91) | too few forced decks |
| Bloodghast | yes | 6 (15) | 7.5 | 0.54 | 0.50 | +0.04 (-0.22 to +0.30) | too few forced decks |
| Dreadhorde Arcanist | yes | 6 (13) | 7.2 | 0.14 | 0.36 | -0.21 (-0.49 to +0.07) | too few forced decks |
| Kitesail Freebooter | yes | 6 (14) | 6.5 | 0.40 | 0.56 | -0.17 (-0.49 to +0.16) | too few forced decks |
| Murmuring Mystic |  | 6 (14) | 5.5 | 0.42 | 0.54 | -0.11 (-0.46 to +0.23) | too few forced decks |
| Soul-Scar Mage | yes | 6 (13) | 4.8 | 0.33 | 0.44 | -0.11 (-0.50 to +0.28) | too few forced decks |
| Village Rites | yes | 5 (12) | 6.8 | 0.32 | 0.57 | -0.25 (-0.47 to -0.03) | too few forced decks |
| Chandra, Torch of Defiance |  | 4 (8) | 2.5 | 0.16 | 0.44 | -0.28 (-0.63 to +0.08) | too few forced decks |
| Deep Forest Hermit |  | 4 (10) | 6.1 | 0.45 | 0.38 | +0.06 (-0.33 to +0.46) | too few forced decks |
| Grumgully, the Generous | yes | 4 (10) | 2.1 | 0.41 | – | – (– to –) | too few forced decks |
| Legion Warboss |  | 4 (9) | 6.0 | 0.49 | 0.55 | -0.06 (-0.47 to +0.35) | too few forced decks |
| Reckless Fireweaver | yes | 4 (8) | 6.1 | 0.71 | 0.42 | +0.30 (-0.19 to +0.78) | too few forced decks |
| Persist |  | 3 (7) | 6.2 | 0.73 | 0.42 | +0.31 (-0.09 to +0.71) | too few forced decks |
| Pia Nalaar |  | 3 (7) | 1.9 | 0.47 | 0.38 | +0.08 (-0.43 to +0.59) | too few forced decks |
| Priest of Forgotten Gods |  | 3 (6) | 4.4 | 0.00 | 0.60 | -0.60 (-0.75 to -0.46) | too few forced decks |
| Unburial Rites |  | 3 (9) | 4.6 | 0.67 | 0.47 | +0.19 (+0.07 to +0.31) | too few forced decks |
| Woe Strider |  | 3 (7) | 2.4 | 0.39 | 0.53 | -0.14 (-0.50 to +0.21) | too few forced decks |
| Winding Constrictor | yes | 2 (4) | 3.7 | 0.60 | 0.37 | +0.23 (-0.45 to +0.92) | too few forced decks |
| Marionette Master |  | 1 (2) | 0.8 | 0.00 | 0.73 | -0.73 (-0.93 to -0.53) | too few forced decks |
| Omnath, Locus of Rage |  | 1 (2) | 0.4 | 1.00 | – | – (– to –) | too few forced decks |
| Reveillark |  | 1 (3) | 0.6 | 0.33 | 0.50 | -0.16 (-0.47 to +0.15) | too few forced decks |
| Showdown of the Skalds |  | 1 (3) | 2.3 | 0.33 | 0.46 | -0.13 (-0.36 to +0.11) | too few forced decks |
| Solemn Simulacrum |  | 1 (2) | 0.7 | 0.00 | 0.46 | -0.46 (-0.83 to -0.09) | too few forced decks |
| Young Pyromancer |  | 1 (2) | 3.0 | 0.00 | 0.33 | -0.33 (-0.50 to -0.15) | too few forced decks |
| Baleful Strix |  | 0 (0) | 0.3 | – | 0.00 | – (– to –) | too few forced decks |
| Grist, the Hunger Tide |  | 0 (0) | 0.5 | – | 1.00 | – (– to –) | too few forced decks |
| Juri, Master of the Revue | yes | 0 (0) | 0.3 | – | 0.67 | – (– to –) | too few forced decks |
| Karn, Scion of Urza |  | 0 (0) | 0.2 | – | 0.62 | – (– to –) | too few forced decks |
| Pia and Kiran Nalaar |  | 0 (0) | 0.2 | – | 0.00 | – (– to –) | too few forced decks |

## Generation 1 — v1 → v2 (2026-10-10)

Discovery: 400 grid drafts, seeds 140000001–140000400, 647 decisive games; mean card win rate 0.50; 280 tests at a false-discovery rate of 0.1; design effect of a card's games 1.15; dominant-win against each card's colour pairs (D377); confirmation 47 fresh drafts, seeds 141000001–141000047, 119 decisive games.

Exploration (D356): 131 of 400 drafts explored, 202 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 269 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** 1 swap(s): 1 card(s) found and then confirmed on fresh drafts; 8 more lead(s) are insufficient data. Discovery: 1 candidate(s) of 280 tests at a false-discovery rate of 0.1; confirmation on 47 fresh drafts: 1 confirmed, 0 not. 39 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Discovered, then confirmed or not** (1 candidate(s); the confirmation batch was sized for 47 drafts):

| Card | Rule | Discovery (this generation's drafts) | Confirmation (fresh drafts) | Every confirmation attempt pooled | Outcome |
|---|---|---|---|---|---|
| Lotus Petal | dominant-pick | first line in 299 of 358 grids (0.84 vs 0.75), p 6.8e-5, q 0.009 | first line in 39 of 44 grids (0.89 vs 0.75), p 0.021, Holm p 0.021 | first attempt | confirmed |

| Out | Why | Evidence | In | Why this card |
|---|---|---|---|---|
| Lotus Petal (Colorless) | dominant-pick | discovery (400 drafts): first line in 299 of 358 grids (0.84 vs 0.75), p 6.8e-5, q 0.009; confirmed on fresh seeds 141000001–141000047 (47 drafts): first line in 39 of 44 grids (0.89 vs 0.75), p 0.021, Holm p 0.021 | Tromell, Seymour's Butler (Green) | colour G for C; no shared theme; mv 3 for 0; rating 40; helps weak CTR ETB G (0.50); notes say try |

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Adeline, Resplendent Cathar | lean-dominant | dealt 360, picked 305, first line 177, in 195 deck(s); on colour in 196 pool(s), played in 195 (0.99, CI 0.97–1.00); won 213 of 303 decisive games (0.70, CI 0.65–0.76 by deck, design effect 1.15, shrunk 0.69) vs mean 0.50, its colour pairs 0.57 (D377) | 495 |
| Grist, the Hunger Tide | lean-dominant | dealt 360, picked 214, first line 75, in 24 deck(s); on colour in 31 pool(s), played in 24 (0.77, CI 0.60–0.89); won 26 of 33 decisive games (0.79, CI 0.61–0.90 by deck, design effect 1.15, shrunk 0.68) vs mean 0.50, its colour pairs 0.46 (D377) | 618 |
| Legion Warboss | lean-dominant | dealt 368, picked 163, first line 56, in 20 deck(s); on colour in 55 pool(s), played in 20 (0.36, CI 0.25–0.50); won 20 of 32 decisive games (0.63, CI 0.44–0.78 by deck, design effect 1.15, shrunk 0.58) vs mean 0.50, its colour pairs 0.37 (D377) | 714 |
| Bone Shards | lean-dominant | dealt 357, picked 324, first line 213, in 97 deck(s); on colour in 98 pool(s), played in 97 (0.99, CI 0.94–1.00); won 96 of 155 decisive games (0.62, CI 0.54–0.70 by deck, design effect 1.15, shrunk 0.61) vs mean 0.50, its colour pairs 0.49 (D377) | 1038 |
| Priest of Forgotten Gods | lean-dominant | dealt 357, picked 165, first line 51, in 21 deck(s); on colour in 49 pool(s), played in 21 (0.43, CI 0.30–0.57); won 24 of 34 decisive games (0.71, CI 0.53–0.84 by deck, design effect 1.15, shrunk 0.63) vs mean 0.50, its colour pairs 0.58 (D377) | 2713 |
| Anax, Hardened in the Forge | lean-dominant | dealt 359, picked 169, first line 52, in 10 deck(s); on colour in 44 pool(s), played in 10 (0.23, CI 0.13–0.37); won 8 of 12 decisive games (0.67, CI 0.37–0.87 by deck, design effect 1.15, shrunk 0.56) vs mean 0.50, its colour pairs 0.49 (D377) | 3605 |
| Conclave Mentor | lean-dominant | dealt 360, picked 146, first line 40, in 6 deck(s); on colour in 25 pool(s), played in 6 (0.24, CI 0.12–0.43); won 9 of 13 decisive games (0.69, CI 0.41–0.88 by deck, design effect 1.15, shrunk 0.58) vs mean 0.50, its colour pairs 0.55 (D377) | 5311 |
| Experimental Synthesizer | lean-dominant | dealt 353, picked 214, first line 92, in 12 deck(s); on colour in 57 pool(s), played in 12 (0.21, CI 0.13–0.33); won 6 of 11 decisive games (0.55, CI 0.27–0.80 by deck, design effect 1.15, shrunk 0.52) vs mean 0.50, its colour pairs 0.42 (D377) | 7980 |

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Ajani's Pridemate, Beast Within, Carrion Feeder, Charming Prince, Chromatic Star, Delver of Secrets, Dreadhorde Arcanist, Ephemerate, Fatal Push, Flame Slash, Flickerwisp, Grumgully, the Generous, Hanweir Garrison, Hordeling Outburst, Intangible Virtue, Juri, Master of the Revue, Kari Zev, Skyship Raider, Knight of Autumn, Lonis, Cryptozoologist, March of Otherworldly Light, Mayhem Devil, Myr Sire, Pelt Collector, Prismatic Ending, Prized Amalgam, Ram Through, Reckless Fireweaver, Reflector Mage, Satyr Wayfinder, Soul-Scar Mage, Soulherder, Tidehollow Sculler, Ulvenwald Mysteries, Unsummon, Village Rites, Viscera Seer, Watcher for Tomorrow, Winding Constrictor, Zulaport Cutthroat.

**Notes say try, not yet in:** Auron, Venerated Guardian, Kimahri, Valiant Guardian, Maester Seymour, Shelinda, Yevon Acolyte, Summon: Ixion, Wakka, Devoted Guardian (a try needs a supported cut to replace).

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UG | 143 | 346 | 0.34 | 0.29–0.39 | 0.35 |
| WU | 123 | 296 | 0.63 | 0.57–0.68 | 0.62 |
| WG | 75 | 182 | 0.57 | 0.49–0.64 | 0.56 |
| UR | 54 | 133 | 0.35 | 0.28–0.44 | 0.37 |
| UB | 39 | 95 | 0.43 | 0.34–0.53 | 0.44 |
| WB | 36 | 80 | 0.71 | 0.60–0.80 | 0.67 |
| BG | 28 | 69 | 0.61 | 0.49–0.71 | 0.58 |
| WR | 28 | 65 | 0.72 | 0.60–0.82 | 0.67 |
| RG | 8 | 18 | 0.17 | 0.06–0.39 | 0.34 |
| BR | 4 | 10 | 0.50 | 0.24–0.76 | 0.50 |

## Generation 2 — v2 → v2 (2026-10-10)

Discovery: 400 grid drafts, seeds 140000401–140000800, 693 decisive games; mean card win rate 0.50; 284 tests at a false-discovery rate of 0.1; design effect of a card's games 1.13; dominant-win against each card's colour pairs (D377).

Exploration (D356): 114 of 400 drafts explored, 175 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 286 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 400 drafts; 5 lead(s) to watch — about 1341 drafts per generation would find half of them. Run more drafts. 38 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Krenko, Tin Street Kingpin | lean-dominant | dealt 360, picked 294, first line 174, in 84 deck(s); on colour in 84 pool(s), played in 84 (1.00, CI 0.96–1.00); won 81 of 141 decisive games (0.57, CI 0.49–0.66 by deck, design effect 1.13, shrunk 0.57) vs mean 0.50, its colour pairs 0.41 (D377) | 558 |
| Deep Forest Hermit | lean-dominant | dealt 353, picked 195, first line 70, in 92 deck(s); on colour in 135 pool(s), played in 92 (0.68, CI 0.60–0.75); won 85 of 152 decisive games (0.56, CI 0.47–0.64 by deck, design effect 1.13, shrunk 0.55) vs mean 0.50, its colour pairs 0.43 (D377) | 667 |
| Conclave Mentor | lean-dominant | dealt 353, picked 153, first line 43, in 6 deck(s); on colour in 41 pool(s), played in 6 (0.15, CI 0.07–0.28); won 10 of 11 decisive games (0.91, CI 0.60–0.98 by deck, design effect 1.13, shrunk 0.64) vs mean 0.50, its colour pairs 0.61 (D377) | 1341 |
| Anax, Hardened in the Forge | lean-dominant | dealt 356, picked 154, first line 54, in 14 deck(s); on colour in 47 pool(s), played in 14 (0.30, CI 0.19–0.44); won 18 of 26 decisive games (0.69, CI 0.49–0.84 by deck, design effect 1.13, shrunk 0.61) vs mean 0.50, its colour pairs 0.51 (D377) | 1645 |
| Hanweir Garrison | lean-dominant | dealt 364, picked 168, first line 51, in 7 deck(s); on colour in 49 pool(s), played in 7 (0.14, CI 0.07–0.27); won 6 of 8 decisive games (0.75, CI 0.39–0.93 by deck, design effect 1.13, shrunk 0.57) vs mean 0.50, its colour pairs 0.44 (D377) | 1693 |

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Ajani's Pridemate, Beast Within, Carrion Feeder, Charming Prince, Chromatic Star, Delver of Secrets, Dreadhorde Arcanist, Ephemerate, Experimental Synthesizer, Fatal Push, Flickerwisp, Grumgully, the Generous, Hordeling Outburst, Intangible Virtue, Juri, Master of the Revue, Kari Zev, Skyship Raider, Knight of Autumn, Lonis, Cryptozoologist, March of Otherworldly Light, Mayhem Devil, Myr Sire, Pelt Collector, Prismatic Ending, Prized Amalgam, Ram Through, Reckless Fireweaver, Reflector Mage, Satyr Wayfinder, Soul-Scar Mage, Soulherder, Tidehollow Sculler, Ulvenwald Mysteries, Unsummon, Village Rites, Viscera Seer, Watcher for Tomorrow, Winding Constrictor, Zulaport Cutthroat.

**Notes say try, not yet in:** Auron, Venerated Guardian, Kimahri, Valiant Guardian, Maester Seymour, Shelinda, Yevon Acolyte, Summon: Ixion, Wakka, Devoted Guardian (a try needs a supported cut to replace).

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UG | 140 | 340 | 0.30 | 0.25–0.35 | 0.31 |
| WU | 139 | 339 | 0.58 | 0.53–0.63 | 0.57 |
| WG | 78 | 189 | 0.64 | 0.57–0.70 | 0.63 |
| UR | 54 | 128 | 0.36 | 0.28–0.45 | 0.38 |
| UB | 50 | 125 | 0.46 | 0.38–0.55 | 0.47 |
| WB | 37 | 86 | 0.74 | 0.64–0.82 | 0.70 |
| WR | 27 | 66 | 0.70 | 0.58–0.79 | 0.65 |
| BG | 24 | 57 | 0.58 | 0.45–0.70 | 0.56 |
| RG | 17 | 41 | 0.41 | 0.28–0.57 | 0.44 |
| BR | 6 | 15 | 0.67 | 0.42–0.85 | 0.57 |

## Generation 3 — v2 → v2 (2026-10-10)

Discovery: 400 grid drafts, seeds 140000801–140001200, 669 decisive games; mean card win rate 0.50; 280 tests at a false-discovery rate of 0.1; design effect of a card's games 1.24; dominant-win against each card's colour pairs (D377).

Exploration (D356): 115 of 400 drafts explored, 186 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 285 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 400 drafts; 7 lead(s) to watch — about 3811 drafts per generation would find half of them. Run more drafts. 40 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Vampire Nighthawk | lean-dominant | dealt 352, picked 279, first line 150, in 102 deck(s); on colour in 110 pool(s), played in 102 (0.93, CI 0.86–0.96); won 102 of 169 decisive games (0.60, CI 0.52–0.68 by deck, design effect 1.24, shrunk 0.59) vs mean 0.50, its colour pairs 0.46 (D377) | 955 |
| Hanweir Garrison | lean-dominant | dealt 365, picked 152, first line 45, in 5 deck(s); on colour in 44 pool(s), played in 5 (0.11, CI 0.05–0.24); won 6 of 7 decisive games (0.86, CI 0.45–0.98 by deck, design effect 1.24, shrunk 0.59) vs mean 0.50, its colour pairs 0.57 (D377) | 2536 |
| Legion Warboss | lean-dominant | dealt 366, picked 158, first line 45, in 13 deck(s); on colour in 42 pool(s), played in 13 (0.31, CI 0.19–0.46); won 10 of 14 decisive games (0.71, CI 0.43–0.89 by deck, design effect 1.24, shrunk 0.59) vs mean 0.50, its colour pairs 0.52 (D377) | 2788 |
| Grist, the Hunger Tide | lean-dominant | dealt 358, picked 211, first line 88, in 10 deck(s); on colour in 13 pool(s), played in 10 (0.77, CI 0.50–0.92); won 11 of 20 decisive games (0.55, CI 0.32–0.76 by deck, design effect 1.24, shrunk 0.52) vs mean 0.50, its colour pairs 0.40 (D377) | 3811 |
| Anax, Hardened in the Forge | lean-dominant | dealt 364, picked 158, first line 51, in 13 deck(s); on colour in 50 pool(s), played in 13 (0.26, CI 0.16–0.40); won 12 of 20 decisive games (0.60, CI 0.36–0.80 by deck, design effect 1.24, shrunk 0.55) vs mean 0.50, its colour pairs 0.47 (D377) | 4747 |
| Showdown of the Skalds | lean-dominant | dealt 361, picked 149, first line 44, in 8 deck(s); on colour in 13 pool(s), played in 8 (0.62, CI 0.35–0.82); won 10 of 13 decisive games (0.77, CI 0.47–0.93 by deck, design effect 1.24, shrunk 0.61) vs mean 0.50, its colour pairs 0.61 (D377) | 5279 |
| Zulaport Cutthroat | lean-dominant | dealt 359, picked 142, first line 41, in 6 deck(s); on colour in 44 pool(s), played in 6 (0.14, CI 0.06–0.27); won 6 of 8 decisive games (0.75, CI 0.38–0.94 by deck, design effect 1.24, shrunk 0.57) vs mean 0.50, its colour pairs 0.60 (D377) | 7830 |

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Ajani's Pridemate, Beast Within, Bloodghast, Carrion Feeder, Charming Prince, Chromatic Star, Conclave Mentor, Delver of Secrets, Dreadhorde Arcanist, Ephemerate, Experimental Synthesizer, Fatal Push, Flickerwisp, Grumgully, the Generous, Hordeling Outburst, Intangible Virtue, Juri, Master of the Revue, Kari Zev, Skyship Raider, Kitesail Freebooter, Knight of Autumn, Lonis, Cryptozoologist, March of Otherworldly Light, Mayhem Devil, Myr Sire, Pelt Collector, Prismatic Ending, Prized Amalgam, Ram Through, Reckless Fireweaver, Reflector Mage, Satyr Wayfinder, Soul-Scar Mage, Soulherder, Tidehollow Sculler, Ulvenwald Mysteries, Unsummon, Village Rites, Viscera Seer, Watcher for Tomorrow, Winding Constrictor.

**Notes say try, not yet in:** Auron, Venerated Guardian, Kimahri, Valiant Guardian, Maester Seymour, Shelinda, Yevon Acolyte, Summon: Ixion, Wakka, Devoted Guardian (a try needs a supported cut to replace).

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UG | 142 | 339 | 0.35 | 0.30–0.40 | 0.36 |
| WU | 142 | 339 | 0.58 | 0.53–0.64 | 0.58 |
| WG | 74 | 168 | 0.63 | 0.55–0.69 | 0.61 |
| UR | 60 | 139 | 0.41 | 0.33–0.49 | 0.42 |
| WB | 48 | 109 | 0.71 | 0.61–0.78 | 0.67 |
| UB | 37 | 81 | 0.36 | 0.26–0.47 | 0.39 |
| BG | 25 | 63 | 0.41 | 0.30–0.54 | 0.43 |
| WR | 22 | 50 | 0.70 | 0.56–0.81 | 0.64 |
| RG | 16 | 41 | 0.41 | 0.28–0.57 | 0.44 |
| BR | 4 | 9 | 0.67 | 0.35–0.88 | 0.55 |

## Generation 4 — v2 → v2 (2026-10-10)

Discovery: 400 grid drafts, seeds 140001201–140001600, 634 decisive games; mean card win rate 0.50; 280 tests at a false-discovery rate of 0.1; design effect of a card's games 1.24; dominant-win against each card's colour pairs (D377); confirmation 46 fresh drafts, seeds 141000901–141000946, 114 decisive games.

Exploration (D356): 131 of 400 drafts explored, 209 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 269 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 400 drafts; 4 lead(s) to watch — about 5899 drafts per generation would find half of them. Run more drafts. Discovery: 1 candidate(s) of 280 tests at a false-discovery rate of 0.1; confirmation on 46 fresh drafts: 0 confirmed, 1 not. 40 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Discovered, then confirmed or not** (1 candidate(s); the confirmation batch was sized for 46 drafts):

| Card | Rule | Discovery (this generation's drafts) | Confirmation (fresh drafts) | Every confirmation attempt pooled | Outcome |
|---|---|---|---|---|---|
| Skullclamp | dominant-pick | first line in 329 of 371 grids (0.89 vs 0.75), p 3.4e-11, q 9.5e-9 | first line in 34 of 43 grids (0.79 vs 0.75), p 0.339, Holm p 0.339 | first attempt | not confirmed: not significant on the fresh seeds (Holm p 0.339 > 0.05) |

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Persist | lean-dominant | dealt 351, picked 184, first line 57, in 32 deck(s); on colour in 62 pool(s), played in 32 (0.52, CI 0.39–0.64); won 35 of 50 decisive games (0.70, CI 0.55–0.82 by deck, design effect 1.24, shrunk 0.64) vs mean 0.50, its colour pairs 0.52 (D377) | 1062 |
| Legion Warboss | lean-dominant | dealt 368, picked 174, first line 55, in 25 deck(s); on colour in 53 pool(s), played in 25 (0.47, CI 0.34–0.60); won 19 of 37 decisive games (0.51, CI 0.34–0.68 by deck, design effect 1.24, shrunk 0.51) vs mean 0.50, its colour pairs 0.33 (D377) | 1186 |
| Experimental Synthesizer | lean-dominant | dealt 364, picked 225, first line 97, in 10 deck(s); on colour in 64 pool(s), played in 10 (0.16, CI 0.09–0.26); won 6 of 12 decisive games (0.50, CI 0.23–0.77 by deck, design effect 1.24, shrunk 0.50) vs mean 0.50, its colour pairs 0.36 (D377) | 5899 |
| Prized Amalgam | lean-dominant | dealt 368, picked 124, first line 38, in 4 deck(s); on colour in 28 pool(s), played in 4 (0.14, CI 0.06–0.32); won 3 of 5 decisive games (0.60, CI 0.20–0.90 by deck, design effect 1.24, shrunk 0.52) vs mean 0.50, its colour pairs 0.46 (D377) | 15814 |

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Ajani's Pridemate, Beast Within, Bloodghast, Carrion Feeder, Charming Prince, Chromatic Star, Conclave Mentor, Delver of Secrets, Dreadhorde Arcanist, Ephemerate, Fatal Push, Flickerwisp, Grumgully, the Generous, Hanweir Garrison, Hordeling Outburst, Intangible Virtue, Juri, Master of the Revue, Kari Zev, Skyship Raider, Kitesail Freebooter, Knight of Autumn, Lonis, Cryptozoologist, March of Otherworldly Light, Mayhem Devil, Myr Sire, Pelt Collector, Prismatic Ending, Ram Through, Reckless Fireweaver, Reflector Mage, Satyr Wayfinder, Soul-Scar Mage, Soulherder, Tidehollow Sculler, Ulvenwald Mysteries, Unsummon, Village Rites, Viscera Seer, Watcher for Tomorrow, Winding Constrictor, Zulaport Cutthroat.

**Notes say try, not yet in:** Auron, Venerated Guardian, Kimahri, Valiant Guardian, Maester Seymour, Shelinda, Yevon Acolyte, Summon: Ixion, Wakka, Devoted Guardian (a try needs a supported cut to replace).

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UG | 140 | 335 | 0.39 | 0.34–0.44 | 0.40 |
| WU | 114 | 272 | 0.60 | 0.54–0.65 | 0.59 |
| WG | 82 | 193 | 0.68 | 0.61–0.74 | 0.66 |
| UR | 62 | 136 | 0.23 | 0.17–0.30 | 0.26 |
| UB | 39 | 93 | 0.46 | 0.36–0.56 | 0.47 |
| WB | 34 | 77 | 0.70 | 0.59–0.79 | 0.66 |
| BG | 30 | 72 | 0.47 | 0.36–0.59 | 0.48 |
| WR | 19 | 46 | 0.61 | 0.47–0.74 | 0.58 |
| RG | 12 | 29 | 0.34 | 0.20–0.53 | 0.41 |
| BR | 6 | 15 | 0.67 | 0.42–0.85 | 0.57 |

