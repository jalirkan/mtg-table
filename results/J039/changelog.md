# Omega — the greatest-hits cube, version 1 (180 cards, two-player) — evolve changelog

Written by `tools/cubelab.sh evolve` (D299–D300, D331). Each generation plays its drafts on the cube going in and swaps only what the evidence supports; docs/guides/cube-lab.md *Evolve* says how.

A card is cut on the AI's evidence only after two separate looks. **Discovery**: in this generation's drafts the card stands out by more than chance can explain, allowing for the fact that some 180 cards are looked at at once (a false-discovery rate of 10%: of the cards flagged, at most about one in 10 could be a fluke). A discovery is a *candidate*, not a verdict. **Confirmed**: the candidate stands out again, the same way, in a second batch of fresh drafts that played no part in finding it. Only confirmed cards are cut; a candidate that does not confirm stays, and is reported. Win rates count each deck's match as one clump of games (the same deck against the same opponent), so their intervals are wider than a count of games would make them.

## Low-rated cards, judged by exploration (D356)

The deckbuilder plays by rating, so a card rated under the rating-limited bar is rarely played and its "dead" signal says nothing. In 2429 of 8000 drafts (share 0.304, z 0.7 against the 0.3 asked), one such card that sat on colour in a pool was forced into the deck in place of the builder's lowest-rated choice of its mana value, at random with a recorded probability: 4163 forced deck(s) against 4156.7 expected (z 0.1). A card's *delta* compares the decks it was forced into with the decks where it could have been and was not, weighted by those probabilities, one deck's match as one unit: its win rate in place of the builder's choice. It **holds its own** when delta is shown above −0.1 (BH at 0.1), it is **weak when played** when delta is shown below 0. Neither verdict cuts a card: a weak one is for Justin's notes, a holding one for its rating. Every forced card pooled: delta +0.00 ± 0.01; choice-deck mean rating, forced minus not (a balance check, ~0): 0.00.

| Card | Rating-limited | Forced decks (games) | Expected | Win rate with it | Without | Delta (95% CI) | Verdict |
|---|---|---|---|---|---|---|---|
| Fire // Ice | yes | 35 (88) | 45.0 | 0.38 | 0.54 | -0.16 (-0.29 to -0.03) | weak when played (a human test: the notes decide) |
| Everflowing Chalice | yes | 195 (477) | 214.7 | 0.48 | 0.50 | -0.01 (-0.07 to +0.04) | holds its own when played (underrated by its rating) |
| Platinum Angel | yes | 192 (471) | 204.2 | 0.49 | 0.51 | -0.02 (-0.07 to +0.04) | holds its own when played (underrated by its rating) |
| Coalition Relic | yes | 178 (425) | 167.3 | 0.53 | 0.50 | +0.03 (-0.03 to +0.09) | holds its own when played (underrated by its rating) |
| Batterskull | yes | 170 (417) | 162.2 | 0.55 | 0.48 | +0.07 (+0.01 to +0.13) | holds its own when played (underrated by its rating) |
| Sword of Feast and Famine |  | 140 (353) | 135.8 | 0.58 | 0.51 | +0.07 (+0.02 to +0.13) | holds its own when played (underrated by its rating) |
| Cryptic Command | yes | 112 (274) | 115.7 | 0.46 | 0.47 | -0.02 (-0.08 to +0.05) | holds its own when played (underrated by its rating) |
| Council's Judgment | yes | 110 (277) | 104.2 | 0.48 | 0.51 | -0.03 (-0.10 to +0.05) | holds its own when played (underrated by its rating) |
| Flickerwisp | yes | 108 (261) | 102.5 | 0.48 | 0.49 | -0.01 (-0.09 to +0.06) | holds its own when played (underrated by its rating) |
| Sword of Fire and Ice |  | 105 (254) | 90.0 | 0.55 | 0.51 | +0.04 (-0.03 to +0.12) | holds its own when played (underrated by its rating) |
| Delver of Secrets | yes | 94 (232) | 93.7 | 0.54 | 0.49 | +0.05 (-0.03 to +0.13) | holds its own when played (underrated by its rating) |
| Smuggler's Copter |  | 94 (243) | 81.0 | 0.47 | 0.50 | -0.03 (-0.10 to +0.04) | holds its own when played (underrated by its rating) |
| Sword of Light and Shadow |  | 81 (205) | 73.4 | 0.49 | 0.50 | -0.01 (-0.09 to +0.07) | holds its own when played (underrated by its rating) |
| Bloodghast | yes | 80 (195) | 82.2 | 0.47 | 0.47 | +0.00 (-0.08 to +0.09) | holds its own when played (underrated by its rating) |
| Hero of Bladehold |  | 80 (189) | 69.9 | 0.52 | 0.48 | +0.04 (-0.05 to +0.13) | holds its own when played (underrated by its rating) |
| Baneslayer Angel |  | 64 (152) | 60.3 | 0.56 | 0.53 | +0.04 (-0.06 to +0.13) | holds its own when played (underrated by its rating) |
| Ephemerate | yes | 62 (152) | 74.6 | 0.52 | 0.51 | +0.01 (-0.08 to +0.10) | holds its own when played (underrated by its rating) |
| Thundermaw Hellkite | yes | 59 (148) | 43.7 | 0.57 | 0.52 | +0.05 (-0.04 to +0.15) | holds its own when played (underrated by its rating) |
| Garruk Relentless | yes | 58 (137) | 45.2 | 0.54 | 0.48 | +0.06 (-0.04 to +0.16) | holds its own when played (underrated by its rating) |
| Young Pyromancer | yes | 58 (141) | 54.0 | 0.61 | 0.54 | +0.07 (-0.03 to +0.17) | holds its own when played (underrated by its rating) |
| Questing Beast | yes | 57 (142) | 50.2 | 0.47 | 0.46 | +0.01 (-0.08 to +0.11) | holds its own when played (underrated by its rating) |
| Birds of Paradise | yes | 54 (132) | 58.7 | 0.52 | 0.47 | +0.05 (-0.05 to +0.15) | holds its own when played (underrated by its rating) |
| Shriekmaw |  | 54 (132) | 44.0 | 0.50 | 0.49 | +0.02 (-0.09 to +0.12) | holds its own when played (underrated by its rating) |
| Dark Confidant |  | 51 (127) | 47.4 | 0.49 | 0.48 | +0.01 (-0.09 to +0.12) | holds its own when played (underrated by its rating) |
| Figure of Destiny | yes | 49 (119) | 51.5 | 0.57 | 0.49 | +0.07 (-0.05 to +0.20) | holds its own when played (underrated by its rating) |
| Incinerate | yes | 39 (107) | 41.8 | 0.57 | 0.58 | -0.01 (-0.10 to +0.08) | holds its own when played (underrated by its rating) |
| Baleful Strix |  | 37 (89) | 40.4 | 0.50 | 0.35 | +0.15 (+0.01 to +0.30) | holds its own when played (underrated by its rating) |
| Karn, Scion of Urza |  | 29 (75) | 31.2 | 0.60 | 0.49 | +0.11 (-0.02 to +0.23) | holds its own when played (underrated by its rating) |
| Hellrider |  | 26 (65) | 36.2 | 0.61 | 0.54 | +0.07 (-0.05 to +0.19) | holds its own when played (underrated by its rating) |
| Glorybringer |  | 25 (62) | 27.1 | 0.72 | 0.51 | +0.20 (+0.08 to +0.32) | holds its own when played (underrated by its rating) |
| Siege-Gang Commander |  | 22 (54) | 21.1 | 0.64 | 0.56 | +0.08 (-0.06 to +0.22) | holds its own when played (underrated by its rating) |
| Treasure Cruise | yes | 139 (335) | 131.9 | 0.43 | 0.48 | -0.04 (-0.11 to +0.02) | undecided |
| Hangarback Walker |  | 120 (296) | 130.4 | 0.48 | 0.52 | -0.04 (-0.11 to +0.03) | undecided |
| Fatal Push | yes | 108 (274) | 92.7 | 0.43 | 0.49 | -0.05 (-0.12 to +0.01) | undecided |
| Reflector Mage | yes | 94 (234) | 97.3 | 0.45 | 0.46 | -0.01 (-0.11 to +0.08) | undecided |
| Doom Blade | yes | 83 (205) | 85.3 | 0.48 | 0.52 | -0.03 (-0.12 to +0.05) | undecided |
| Restoration Angel | yes | 78 (193) | 88.0 | 0.48 | 0.50 | -0.03 (-0.11 to +0.06) | undecided |
| Fact or Fiction |  | 77 (184) | 68.8 | 0.45 | 0.49 | -0.04 (-0.13 to +0.05) | undecided |
| Grave Titan | yes | 77 (181) | 77.5 | 0.46 | 0.50 | -0.04 (-0.13 to +0.05) | undecided |
| Ravenous Chupacabra | yes | 71 (175) | 74.3 | 0.43 | 0.51 | -0.08 (-0.17 to +0.01) | undecided |
| Shivan Dragon | yes | 67 (166) | 64.4 | 0.56 | 0.59 | -0.03 (-0.12 to +0.06) | undecided |
| Goblin Guide | yes | 58 (145) | 62.9 | 0.51 | 0.58 | -0.07 (-0.16 to +0.02) | undecided |
| Rancor | yes | 58 (146) | 54.2 | 0.42 | 0.47 | -0.05 (-0.14 to +0.04) | undecided |
| Ball Lightning | yes | 56 (140) | 52.9 | 0.49 | 0.54 | -0.04 (-0.14 to +0.06) | undecided |
| Polukranos, World Eater | yes | 48 (114) | 48.8 | 0.40 | 0.44 | -0.05 (-0.16 to +0.07) | undecided |
| The Wandering Emperor |  | 46 (116) | 54.7 | 0.48 | 0.50 | -0.02 (-0.12 to +0.08) | undecided |
| Expressive Iteration | yes | 45 (112) | 50.0 | 0.47 | 0.57 | -0.09 (-0.22 to +0.03) | undecided |
| Chandra, Torch of Defiance | yes | 44 (107) | 35.9 | 0.54 | 0.58 | -0.04 (-0.16 to +0.08) | undecided |
| Solemn Simulacrum |  | 37 (92) | 39.1 | 0.47 | 0.51 | -0.04 (-0.16 to +0.07) | undecided |
| Acidic Slime | yes | 36 (90) | 45.6 | 0.44 | 0.46 | -0.03 (-0.15 to +0.10) | undecided |
| Knight of the Reliquary | yes | 35 (86) | 37.5 | 0.47 | 0.50 | -0.03 (-0.18 to +0.11) | undecided |
| Sorin, Lord of Innistrad | yes | 34 (82) | 30.3 | 0.52 | 0.65 | -0.13 (-0.30 to +0.03) | undecided |
| Voice of Resurgence | yes | 33 (81) | 33.3 | 0.51 | 0.47 | +0.05 (-0.11 to +0.21) | undecided |
| Flametongue Kavu |  | 29 (68) | 29.7 | 0.55 | 0.56 | -0.02 (-0.17 to +0.13) | undecided |
| Garruk Wildspeaker | yes | 28 (73) | 29.2 | 0.48 | 0.49 | -0.01 (-0.14 to +0.12) | undecided |
| Maelstrom Pulse | yes | 27 (68) | 25.4 | 0.35 | 0.50 | -0.15 (-0.32 to +0.02) | undecided |
| Mystic Snake | yes | 23 (53) | 31.7 | 0.30 | 0.41 | -0.11 (-0.28 to +0.05) | undecided |
| Primeval Titan |  | 23 (61) | 32.1 | 0.47 | 0.52 | -0.05 (-0.18 to +0.09) | undecided |
| Sakura-Tribe Elder |  | 19 (45) | 28.1 | 0.44 | 0.44 | +0.00 (-0.18 to +0.18) | undecided |
| Liliana of the Veil |  | 18 (42) | 15.3 | 0.33 | 0.49 | -0.16 (-0.34 to +0.02) | undecided |
| Falkenrath Aristocrat |  | 12 (30) | 12.1 | 0.65 | 0.71 | -0.06 (-0.27 to +0.14) | undecided |
| Grist, the Hunger Tide |  | 5 (12) | 3.3 | 0.55 | 0.55 | +0.00 (-0.44 to +0.45) | too few forced decks |
| Seasoned Pyromancer |  | 5 (11) | 7.1 | 0.62 | 0.53 | +0.10 (-0.27 to +0.46) | too few forced decks |
| Uro, Titan of Nature's Wrath |  | 5 (12) | 8.1 | 0.48 | 0.36 | +0.11 (-0.28 to +0.51) | too few forced decks |
| Titania, Protector of Argoth |  | 4 (10) | 3.5 | 0.43 | 0.46 | -0.04 (-0.36 to +0.29) | too few forced decks |
| Huntmaster of the Fells |  | 3 (8) | 6.1 | 0.26 | 0.40 | -0.14 (-0.36 to +0.08) | too few forced decks |

## Generation 1 — v1 → v1 (2026-10-03)

Discovery: 2000 grid drafts, seeds 3000001–3002000, 3354 decisive games; mean card win rate 0.50; 393 tests at a false-discovery rate of 0.1; design effect of a card's games 1.00.

Exploration (D356): 658 of 2000 drafts explored, 1125 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 1342 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 2000 drafts; 1 lead(s) to watch — about 2549 drafts per generation would find half of them. Run more drafts. 36 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Huntmaster of the Fells | lean-dominant | dealt 1793, picked 743, first line 205, in 36 deck(s); on colour in 81 pool(s), played in 36 (0.44, CI 0.34–0.55); won 39 of 55 decisive games (0.71, CI 0.58–0.81 by deck, shrunk 0.65) vs mean 0.50 | 2549 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Demonic Tutor (AI:RemoveDeck:Random) — ai-limited: dealt 1817, picked 1654, first line 1147, in 886 deck(s); on colour in 890 pool(s), played in 886 (1.00, CI 0.99–1.00); won 741 of 1488 decisive games (0.50, CI 0.47–0.52 by deck, shrunk 0.50) vs mean 0.50

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Acidic Slime, Ball Lightning, Batterskull, Birds of Paradise, Bloodghast, Council's Judgment, Cryptic Command, Delver of Secrets, Doom Blade, Ephemerate, Everflowing Chalice, Expressive Iteration, Fatal Push, Figure of Destiny, Fire // Ice, Flickerwisp, Garruk Relentless, Garruk Wildspeaker, Goblin Guide, Grave Titan, Knight of the Reliquary, Maelstrom Pulse, Mystic Snake, Platinum Angel, Polukranos, World Eater, Questing Beast, Rancor, Ravenous Chupacabra, Reflector Mage, Restoration Angel, Shivan Dragon, Sorin, Lord of Innistrad, Thundermaw Hellkite, Treasure Cruise, Voice of Resurgence, Young Pyromancer.

**Lands never played** (lands go by notes only: the lab's deckbuilder plays a dual or fetchland only in its own pair's decks and a colourless land never, so a land's numbers are its pair's): Mishra's Factory, Mutavault.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.49 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.48 (rating 98, CTRL SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.34 (rating 94.4, GY CTRL)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.14 (rating 99.3, REAN CTRL)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.86 (rating 96.3)
- Prophetic Prism (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.68 (rating 90.5, ART ETB)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.42 (rating 85.4, ART)
- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.28 (rating 82.1, RAMP)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.24 (rating 69.2, ETB SPL)
- Goblin Bombardment (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.05 (rating 75.4, SAC TOK)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| WU | 614 | 1535 | 0.49 | 0.47–0.52 | 0.49 |
| UB | 539 | 1358 | 0.48 | 0.45–0.51 | 0.48 |
| UR | 292 | 723 | 0.50 | 0.47–0.54 | 0.50 |
| WR | 285 | 708 | 0.50 | 0.47–0.54 | 0.50 |
| WB | 217 | 539 | 0.53 | 0.49–0.57 | 0.53 |
| WG | 201 | 510 | 0.55 | 0.50–0.59 | 0.54 |
| UG | 163 | 409 | 0.44 | 0.40–0.49 | 0.45 |
| BG | 141 | 347 | 0.49 | 0.43–0.54 | 0.49 |
| RG | 139 | 348 | 0.54 | 0.49–0.59 | 0.54 |
| BR | 93 | 231 | 0.55 | 0.49–0.62 | 0.55 |

## Generation 2 — v1 → v1 (2026-10-03)

Discovery: 2000 grid drafts, seeds 3002001–3004000, 3491 decisive games; mean card win rate 0.50; 395 tests at a false-discovery rate of 0.1; design effect of a card's games 1.02.

Exploration (D356): 595 of 2000 drafts explored, 1021 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 1405 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 2000 drafts; 1 lead(s) to watch — about 9427 drafts per generation would find half of them. Run more drafts. 36 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Falkenrath Aristocrat | lean-dominant | dealt 1820, picked 741, first line 188, in 25 deck(s); on colour in 55 pool(s), played in 25 (0.45, CI 0.33–0.58); won 24 of 38 decisive games (0.63, CI 0.47–0.77 by deck, design effect 1.02, shrunk 0.59) vs mean 0.50 | 9427 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Demonic Tutor (AI:RemoveDeck:Random) — ai-limited: dealt 1807, picked 1663, first line 1180, in 917 deck(s); on colour in 921 pool(s), played in 917 (1.00, CI 0.99–1.00); won 820 of 1668 decisive games (0.49, CI 0.47–0.52 by deck, design effect 1.02, shrunk 0.49) vs mean 0.50

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Acidic Slime, Ball Lightning, Batterskull, Birds of Paradise, Bloodghast, Council's Judgment, Cryptic Command, Delver of Secrets, Doom Blade, Ephemerate, Everflowing Chalice, Expressive Iteration, Fatal Push, Figure of Destiny, Fire // Ice, Flickerwisp, Garruk Relentless, Goblin Guide, Grave Titan, Incinerate, Knight of the Reliquary, Maelstrom Pulse, Mystic Snake, Platinum Angel, Polukranos, World Eater, Questing Beast, Rancor, Ravenous Chupacabra, Reflector Mage, Restoration Angel, Shivan Dragon, Sorin, Lord of Innistrad, Thundermaw Hellkite, Treasure Cruise, Voice of Resurgence, Young Pyromancer.

**Lands never played** (lands go by notes only: the lab's deckbuilder plays a dual or fetchland only in its own pair's decks and a colourless land never, so a land's numbers are its pair's): Mishra's Factory, Mutavault.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.60 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.55 (rating 98, CTRL SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.36 (rating 94.4, GY CTRL)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.11 (rating 99.3, REAN CTRL)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.85 (rating 96.3)
- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.67 (rating 82.1, RAMP)
- Prophetic Prism (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.64 (rating 90.5, ART ETB)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.42 (rating 85.4, ART)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.28 (rating 69.2, ETB SPL)
- Goblin Bombardment (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.02 (rating 75.4, SAC TOK)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| WU | 638 | 1576 | 0.50 | 0.47–0.52 | 0.50 |
| UB | 592 | 1473 | 0.46 | 0.44–0.49 | 0.46 |
| WR | 280 | 687 | 0.53 | 0.49–0.56 | 0.53 |
| UR | 262 | 654 | 0.49 | 0.45–0.53 | 0.49 |
| WB | 226 | 568 | 0.57 | 0.53–0.61 | 0.56 |
| WG | 220 | 537 | 0.51 | 0.47–0.55 | 0.51 |
| UG | 205 | 510 | 0.47 | 0.43–0.52 | 0.48 |
| BG | 169 | 441 | 0.49 | 0.45–0.54 | 0.49 |
| RG | 137 | 336 | 0.50 | 0.45–0.56 | 0.50 |
| BR | 81 | 200 | 0.60 | 0.53–0.67 | 0.59 |

## Generation 3 — v1 → v1 (2026-10-03)

Discovery: 2000 grid drafts, seeds 3004001–3006000, 3493 decisive games; mean card win rate 0.50; 397 tests at a false-discovery rate of 0.1; design effect of a card's games 1.01; confirmation 300 fresh drafts, seeds 4000601–4000900, 737 decisive games.

Exploration (D356): 599 of 2000 drafts explored, 1028 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 1401 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 2000 drafts; 1 lead(s) to watch — about 5967 drafts per generation would find half of them. Run more drafts. Discovery: 8 candidate(s) of 397 tests at a false-discovery rate of 0.1; confirmation on 300 fresh drafts: 0 confirmed, 8 not. 37 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Discovered, then confirmed or not** (8 candidate(s); the confirmation batch was sized for 300 drafts, under-powered for Baneslayer Angel, Fable of the Mirror-Breaker, Fury, Goblin Rabblemaster, Goldspan Dragon, Hellrider, Ragavan, Nimble Pilferer, Sword of Fire and Ice):

| Card | Rule | Discovery (this generation's drafts) | Confirmation (fresh drafts) | Outcome |
|---|---|---|---|---|
| Baneslayer Angel | dominant-win | won 311 of 554 decisive games (0.56 vs 0.50), p 0.002, q 0.076 | won 54 of 105 decisive games (0.51 vs 0.50), p 0.428, Holm p 1.000 | not confirmed: not significant on the fresh seeds (Holm p 1.000 > 0.05) |
| Fable of the Mirror-Breaker | dominant-win | won 757 of 1341 decisive games (0.56 vs 0.50), p 1.5e-6, q 2.9e-4 | won 140 of 296 decisive games (0.47 vs 0.50), p 0.831, Holm p 1.000 | not confirmed: not significant on the fresh seeds (Holm p 1.000 > 0.05) |
| Fury | dominant-win | won 659 of 1197 decisive games (0.55 vs 0.50), p 2.8e-4, q 0.016 | won 135 of 268 decisive games (0.50 vs 0.50), p 0.478, Holm p 1.000 | not confirmed: not significant on the fresh seeds (Holm p 1.000 > 0.05) |
| Goblin Rabblemaster | dominant-win | won 496 of 864 decisive games (0.57 vs 0.50), p 8.4e-6, q 0.001 | won 97 of 193 decisive games (0.50 vs 0.50), p 0.502, Holm p 1.000 | not confirmed: not significant on the fresh seeds (Holm p 1.000 > 0.05) |
| Goldspan Dragon | dominant-win | won 555 of 985 decisive games (0.56 vs 0.50), p 4.2e-5, q 0.003 | won 82 of 180 decisive games (0.46 vs 0.50), p 0.891, Holm p 1.000 | not confirmed: not significant on the fresh seeds (Holm p 1.000 > 0.05) |
| Hellrider | dominant-win | won 168 of 278 decisive games (0.60 vs 0.50), p 3.2e-4, q 0.016 | won 34 of 63 decisive games (0.54 vs 0.50), p 0.316, Holm p 1.000 | not confirmed: not significant on the fresh seeds (Holm p 1.000 > 0.05) |
| Ragavan, Nimble Pilferer | dominant-win | won 754 of 1361 decisive games (0.55 vs 0.50), p 4.1e-5, q 0.003 | won 135 of 266 decisive games (0.51 vs 0.50), p 0.431, Holm p 1.000 | not confirmed: not significant on the fresh seeds (Holm p 1.000 > 0.05) |
| Sword of Fire and Ice | dominant-win | won 704 of 1271 decisive games (0.55 vs 0.50), p 7.3e-5, q 0.005 | won 133 of 275 decisive games (0.48 vs 0.50), p 0.721, Holm p 1.000 | not confirmed: not significant on the fresh seeds (Holm p 1.000 > 0.05) |

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Falkenrath Aristocrat | lean-dominant | dealt 1818, picked 714, first line 174, in 26 deck(s); on colour in 57 pool(s), played in 26 (0.46, CI 0.33–0.58); won 27 of 41 decisive games (0.66, CI 0.51–0.79 by deck, design effect 1.01, shrunk 0.61) vs mean 0.50 | 5967 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Demonic Tutor (AI:RemoveDeck:Random) — ai-limited: dealt 1807, picked 1665, first line 1141, in 888 deck(s); on colour in 891 pool(s), played in 888 (1.00, CI 0.99–1.00); won 768 of 1559 decisive games (0.49, CI 0.47–0.52 by deck, design effect 1.01, shrunk 0.49) vs mean 0.50

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Acidic Slime, Ball Lightning, Batterskull, Birds of Paradise, Bloodghast, Chandra, Torch of Defiance, Council's Judgment, Cryptic Command, Delver of Secrets, Doom Blade, Ephemerate, Everflowing Chalice, Expressive Iteration, Fatal Push, Figure of Destiny, Fire // Ice, Flickerwisp, Garruk Relentless, Goblin Guide, Grave Titan, Incinerate, Knight of the Reliquary, Maelstrom Pulse, Mystic Snake, Platinum Angel, Polukranos, World Eater, Questing Beast, Rancor, Ravenous Chupacabra, Reflector Mage, Restoration Angel, Shivan Dragon, Sorin, Lord of Innistrad, Thundermaw Hellkite, Treasure Cruise, Voice of Resurgence, Young Pyromancer.

**Lands never played** (lands go by notes only: the lab's deckbuilder plays a dual or fetchland only in its own pair's decks and a colourless land never, so a land's numbers are its pair's): Mishra's Factory, Mutavault.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.89 (rating 82.1, RAMP)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.58 (rating 94.4, GY CTRL)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.42 (rating 99.3, REAN CTRL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.28 (rating 98, CTRL SPL)
- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.05 (rating 97.6, SPL)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.97 (rating 96.3)
- Goblin Bombardment (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.83 (rating 75.4, SAC TOK)
- Prophetic Prism (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.62 (rating 90.5, ART ETB)
- Viscera Seer (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.48 (rating 43.6, SAC)
- Tortured Existence (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.43 (rating 54, GY SAC)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| WU | 626 | 1556 | 0.51 | 0.48–0.53 | 0.51 |
| UB | 572 | 1416 | 0.47 | 0.44–0.49 | 0.47 |
| UR | 297 | 729 | 0.52 | 0.49–0.56 | 0.52 |
| WR | 281 | 707 | 0.56 | 0.52–0.59 | 0.56 |
| WB | 248 | 634 | 0.52 | 0.48–0.56 | 0.52 |
| WG | 204 | 505 | 0.47 | 0.42–0.51 | 0.47 |
| UG | 186 | 472 | 0.46 | 0.42–0.51 | 0.46 |
| RG | 150 | 376 | 0.53 | 0.48–0.58 | 0.53 |
| BG | 126 | 314 | 0.41 | 0.35–0.46 | 0.41 |
| BR | 112 | 277 | 0.58 | 0.52–0.64 | 0.58 |

## Generation 4 — v1 → v2 (2026-10-03)

Discovery: 2000 grid drafts, seeds 3006001–3008000, 3572 decisive games; mean card win rate 0.50; 394 tests at a false-discovery rate of 0.1; design effect of a card's games 1.00; confirmation 300 fresh drafts, seeds 4000901–4001200, 746 decisive games.

Exploration (D356): 577 of 2000 drafts explored, 989 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 1423 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** 1 swap(s): 1 card(s) found and then confirmed on fresh drafts. Discovery: 3 candidate(s) of 394 tests at a false-discovery rate of 0.1; confirmation on 300 fresh drafts: 1 confirmed, 2 not. 36 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Discovered, then confirmed or not** (3 candidate(s); the confirmation batch was sized for 300 drafts, under-powered for Fable of the Mirror-Breaker, Seasoned Pyromancer, Young Pyromancer):

| Card | Rule | Discovery (this generation's drafts) | Confirmation (fresh drafts) | Outcome |
|---|---|---|---|---|
| Fable of the Mirror-Breaker | dominant-win | won 761 of 1382 decisive games (0.55 vs 0.50), p 9.4e-5, q 0.019 | won 179 of 316 decisive games (0.57 vs 0.50), p 0.011, Holm p 0.034 | confirmed |
| Seasoned Pyromancer | dominant-win | won 431 of 771 decisive games (0.56 vs 0.50), p 6.0e-4, q 0.059 | won 96 of 188 decisive games (0.51 vs 0.50), p 0.415, Holm p 0.830 | not confirmed: not significant on the fresh seeds (Holm p 0.830 > 0.05) |
| Young Pyromancer | dominant-win | won 76 of 119 decisive games (0.64 vs 0.50), p 0.002, q 0.090 | won 14 of 28 decisive games (0.50 vs 0.50), p 0.576, Holm p 0.830 | not confirmed: not significant on the fresh seeds (Holm p 0.830 > 0.05) |

| Out | Why | Evidence | In | Why this card |
|---|---|---|---|---|
| Fable of the Mirror-Breaker (Red) | dominant-win | discovery (2000 drafts): won 761 of 1382 decisive games (0.55 vs 0.50), p 9.4e-5, q 0.019; confirmed on fresh seeds 4000901–4001200 (300 drafts): won 179 of 316 decisive games (0.57 vs 0.50), p 0.011, Holm p 0.034 | Gut, True Soul Zealot (Red) | same colour class; shares TOK SAC ART; mv 3 for 3; rating 72.4; helps weak EVA (0.03) |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Demonic Tutor (AI:RemoveDeck:Random) — ai-limited: dealt 1787, picked 1627, first line 1151, in 890 deck(s); on colour in 891 pool(s), played in 890 (1.00, CI 0.99–1.00); won 793 of 1555 decisive games (0.51, CI 0.48–0.54 by deck, shrunk 0.51) vs mean 0.50

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Acidic Slime, Ball Lightning, Batterskull, Birds of Paradise, Bloodghast, Coalition Relic, Council's Judgment, Cryptic Command, Delver of Secrets, Doom Blade, Ephemerate, Everflowing Chalice, Expressive Iteration, Fatal Push, Figure of Destiny, Fire // Ice, Flickerwisp, Garruk Relentless, Goblin Guide, Grave Titan, Incinerate, Knight of the Reliquary, Maelstrom Pulse, Mystic Snake, Platinum Angel, Polukranos, World Eater, Questing Beast, Rancor, Ravenous Chupacabra, Reflector Mage, Restoration Angel, Shivan Dragon, Sorin, Lord of Innistrad, Thundermaw Hellkite, Treasure Cruise, Voice of Resurgence.

**Lands never played** (lands go by notes only: the lab's deckbuilder plays a dual or fetchland only in its own pair's decks and a colourless land never, so a land's numbers are its pair's): Mishra's Factory, Mutavault.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.60 (rating 94.4, GY CTRL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.48 (rating 98, CTRL SPL)
- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.28 (rating 97.6, SPL)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.16 (rating 99.3, REAN CTRL)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.85 (rating 96.3)
- Prophetic Prism (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.85 (rating 90.5, ART ETB)
- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.43 (rating 82.1, RAMP)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.42 (rating 85.4, ART)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.37 (rating 69.2, ETB SPL)
- Goblin Bombardment (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.02 (rating 75.4, SAC TOK)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| WU | 589 | 1488 | 0.47 | 0.45–0.50 | 0.47 |
| UB | 581 | 1445 | 0.47 | 0.45–0.50 | 0.47 |
| WR | 304 | 772 | 0.54 | 0.51–0.58 | 0.54 |
| UR | 301 | 752 | 0.51 | 0.48–0.55 | 0.51 |
| WB | 261 | 651 | 0.56 | 0.52–0.60 | 0.56 |
| WG | 227 | 575 | 0.50 | 0.46–0.54 | 0.50 |
| UG | 188 | 468 | 0.43 | 0.38–0.47 | 0.43 |
| BG | 155 | 391 | 0.50 | 0.45–0.55 | 0.50 |
| RG | 138 | 348 | 0.54 | 0.49–0.59 | 0.54 |
| BR | 102 | 254 | 0.55 | 0.49–0.61 | 0.54 |

