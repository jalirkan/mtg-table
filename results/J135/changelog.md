# The Synergy Cube — version 2 (180 cards, two-player) — evolve changelog

Written by `tools/cubelab.sh evolve` (D299–D300, D331, D357). Each generation plays its drafts on the cube going in and swaps only what the evidence supports; docs/guides/cube-lab.md *Evolve* says how.

A card is cut on the AI's evidence only after two separate looks. **Discovery**: in this generation's drafts the card stands out by more than chance can explain, allowing for the fact that some 180 cards are looked at at once (a false-discovery rate of 10%: of the cards flagged, at most about one in 10 could be a fluke). A discovery is a *candidate*, not a verdict. **Confirmed**: the candidate stands out again, the same way, in a second batch of fresh drafts that played no part in finding it. Only confirmed cards are cut; a candidate that does not confirm stays, and is reported. Win rates count each deck's match as one clump of games (the same deck against the same opponent), so their intervals are wider than a count of games would make them.

## Low-rated cards, judged by exploration (D356)

The deckbuilder plays by rating, so a card rated under the rating-limited bar is rarely played and its "dead" signal says nothing. In 484 of 1600 drafts (share 0.302, z 0.2 against the 0.3 asked), one such card that sat on colour in a pool was forced into the deck in place of the builder's lowest-rated choice of its mana value, at random with a recorded probability: 761 forced deck(s) against 763.3 expected (z -0.1). A card's *delta* compares the decks it was forced into with the decks where it could have been and was not, weighted by those probabilities, one deck's match as one unit: its win rate in place of the builder's choice. It **holds its own** when delta is shown above −0.1 (BH at 0.1), it is **weak when played** when delta is shown below 0. Neither verdict cuts a card: a weak one is for Justin's notes, a holding one for its rating. Every forced card pooled: delta +0.01 ± 0.03; choice-deck mean rating, forced minus not (a balance check, ~0): -0.02.

| Card | Rating-limited | Forced decks (games) | Expected | Win rate with it | Without | Delta (95% CI) | Verdict |
|---|---|---|---|---|---|---|---|
| Myr Sire | yes | 35 (84) | 38.1 | 0.46 | 0.49 | -0.04 (-0.17 to +0.10) | undecided |
| Soulherder |  | 26 (63) | 22.3 | 0.55 | 0.52 | +0.04 (-0.21 to +0.28) | undecided |
| Candy Trail |  | 25 (59) | 31.1 | 0.53 | 0.52 | +0.01 (-0.17 to +0.19) | undecided |
| Delver of Secrets | yes | 25 (65) | 21.1 | 0.39 | 0.33 | +0.06 (-0.07 to +0.19) | undecided |
| Lonis, Cryptozoologist | yes | 25 (54) | 23.8 | 0.26 | 0.26 | +0.00 (-0.20 to +0.21) | undecided |
| Unsummon | yes | 23 (58) | 27.2 | 0.55 | 0.43 | +0.12 (-0.03 to +0.27) | undecided |
| Flickerwisp | yes | 21 (47) | 20.4 | 0.63 | 0.63 | +0.01 (-0.18 to +0.19) | undecided |
| March of Otherworldly Light | yes | 21 (51) | 19.1 | 0.63 | 0.60 | +0.03 (-0.15 to +0.21) | undecided |
| Watcher for Tomorrow | yes | 21 (51) | 21.5 | 0.28 | 0.39 | -0.10 (-0.24 to +0.04) | undecided |
| Reflector Mage | yes | 20 (43) | 20.3 | 0.79 | 0.66 | +0.13 (-0.05 to +0.31) | undecided |
| Satyr Wayfinder | yes | 20 (46) | 19.5 | 0.44 | 0.46 | -0.01 (-0.20 to +0.17) | undecided |
| Ulvenwald Mysteries | yes | 20 (46) | 17.6 | 0.54 | 0.48 | +0.05 (-0.15 to +0.25) | undecided |
| Ajani's Pridemate | yes | 19 (46) | 19.0 | 0.66 | 0.63 | +0.04 (-0.13 to +0.20) | undecided |
| Pelt Collector | yes | 19 (44) | 20.4 | 0.57 | 0.47 | +0.10 (-0.10 to +0.29) | undecided |
| Fatal Push | yes | 18 (44) | 17.1 | 0.49 | 0.57 | -0.08 (-0.26 to +0.09) | undecided |
| Kitesail Freebooter | yes | 18 (43) | 14.6 | 0.34 | 0.49 | -0.15 (-0.32 to +0.01) | undecided |
| Carrion Feeder | yes | 17 (41) | 12.4 | 0.58 | 0.53 | +0.05 (-0.16 to +0.25) | undecided |
| Knight of Autumn | yes | 17 (42) | 13.8 | 0.62 | 0.63 | -0.01 (-0.21 to +0.20) | undecided |
| Ram Through | yes | 17 (40) | 15.6 | 0.37 | 0.41 | -0.04 (-0.24 to +0.17) | undecided |
| Charming Prince | yes | 16 (39) | 16.6 | 0.58 | 0.56 | +0.02 (-0.13 to +0.17) | undecided |
| Cranial Plating |  | 15 (37) | 17.9 | 0.54 | 0.53 | +0.01 (-0.17 to +0.18) | undecided |
| Smuggler's Copter |  | 15 (35) | 13.3 | 0.57 | 0.47 | +0.10 (-0.12 to +0.32) | undecided |
| Intangible Virtue |  | 14 (36) | 18.0 | 0.51 | 0.62 | -0.11 (-0.32 to +0.09) | undecided |
| Winding Constrictor |  | 14 (35) | 16.8 | 0.53 | 0.35 | +0.18 (-0.04 to +0.40) | undecided |
| Conclave Mentor | yes | 13 (35) | 12.7 | 0.62 | 0.81 | -0.20 (-0.42 to +0.02) | undecided |
| Hangarback Walker |  | 13 (34) | 12.2 | 0.45 | 0.49 | -0.04 (-0.23 to +0.16) | undecided |
| Hanweir Garrison | yes | 13 (31) | 9.3 | 0.52 | 0.51 | +0.01 (-0.23 to +0.25) | undecided |
| Priest of Forgotten Gods | yes | 13 (32) | 8.2 | 0.53 | 0.42 | +0.10 (-0.16 to +0.36) | undecided |
| Tidehollow Sculler | yes | 13 (34) | 12.9 | 0.72 | 0.88 | -0.15 (-0.34 to +0.04) | undecided |
| Bloodghast | yes | 11 (29) | 8.3 | 0.47 | 0.54 | -0.06 (-0.28 to +0.16) | undecided |
| Kari Zev, Skyship Raider | yes | 11 (27) | 9.3 | 0.41 | 0.50 | -0.09 (-0.30 to +0.12) | undecided |
| Zulaport Cutthroat | yes | 11 (26) | 14.3 | 0.60 | 0.48 | +0.12 (-0.12 to +0.36) | undecided |
| Thieving Skydiver |  | 10 (23) | 6.3 | 0.48 | 0.39 | +0.08 (-0.19 to +0.36) | undecided |
| Unburial Rites |  | 10 (25) | 7.1 | 0.59 | 0.51 | +0.08 (-0.17 to +0.32) | undecided |
| Prized Amalgam | yes | 14 (35) | 9.1 | 0.48 | 0.51 | -0.03 (-0.42 to +0.35) | too few forced decks |
| Ephemerate | yes | 9 (21) | 15.3 | 0.62 | 0.59 | +0.03 (-0.22 to +0.27) | too few forced decks |
| Hordeling Outburst | yes | 9 (23) | 9.5 | 0.64 | 0.49 | +0.15 (-0.08 to +0.38) | too few forced decks |
| Soul-Scar Mage | yes | 9 (19) | 6.6 | 0.34 | 0.45 | -0.11 (-0.45 to +0.23) | too few forced decks |
| Steel Overseer |  | 9 (21) | 17.3 | 0.57 | 0.42 | +0.15 (-0.09 to +0.39) | too few forced decks |
| Sai, Master Thopterist |  | 8 (18) | 8.1 | 0.44 | 0.36 | +0.08 (-0.26 to +0.42) | too few forced decks |
| Sakura-Tribe Elder |  | 8 (18) | 10.4 | 0.46 | 0.48 | -0.02 (-0.36 to +0.32) | too few forced decks |
| Anax, Hardened in the Forge | yes | 7 (16) | 7.2 | 0.31 | 0.56 | -0.25 (-0.56 to +0.06) | too few forced decks |
| Mayhem Devil | yes | 7 (17) | 4.6 | 0.71 | 1.00 | -0.29 (-0.46 to -0.12) | too few forced decks |
| Persist | yes | 7 (17) | 6.7 | 0.29 | 0.50 | -0.22 (-0.46 to +0.03) | too few forced decks |
| Emry, Lurker of the Loch |  | 6 (14) | 3.9 | 0.16 | 0.43 | -0.27 (-0.48 to -0.05) | too few forced decks |
| Experimental Synthesizer | yes | 6 (15) | 8.5 | 0.77 | 0.43 | +0.34 (+0.10 to +0.58) | too few forced decks |
| Reckless Fireweaver | yes | 6 (15) | 5.5 | 0.54 | 0.46 | +0.08 (-0.19 to +0.35) | too few forced decks |
| Restoration Angel |  | 6 (15) | 9.0 | 0.78 | 0.68 | +0.10 (-0.06 to +0.25) | too few forced decks |
| Village Rites | yes | 6 (16) | 9.8 | 0.61 | 0.54 | +0.07 (-0.18 to +0.33) | too few forced decks |
| Dreadhorde Arcanist | yes | 5 (13) | 6.0 | 0.60 | 0.44 | +0.15 (-0.11 to +0.41) | too few forced decks |
| Midnight Reaper |  | 5 (11) | 7.3 | 0.39 | 0.54 | -0.15 (-0.55 to +0.24) | too few forced decks |
| Woe Strider |  | 5 (12) | 3.2 | 0.72 | 0.51 | +0.22 (-0.07 to +0.51) | too few forced decks |
| Legion Warboss | yes | 4 (10) | 3.9 | 0.45 | 0.45 | -0.01 (-0.35 to +0.34) | too few forced decks |
| Young Pyromancer |  | 4 (8) | 2.0 | 0.38 | 0.34 | +0.03 (-0.53 to +0.60) | too few forced decks |
| Chandra, Torch of Defiance |  | 3 (6) | 3.2 | 0.22 | 0.53 | -0.31 (-0.77 to +0.15) | too few forced decks |
| Deep Forest Hermit |  | 3 (7) | 5.5 | 0.28 | 0.49 | -0.22 (-0.60 to +0.17) | too few forced decks |
| Murmuring Mystic |  | 3 (8) | 3.3 | 0.48 | 0.44 | +0.04 (-0.27 to +0.34) | too few forced decks |
| Showdown of the Skalds | yes | 3 (8) | 3.5 | 0.58 | 0.87 | -0.29 (-0.60 to +0.02) | too few forced decks |
| Baleful Strix |  | 2 (5) | 1.1 | 0.18 | 1.00 | -0.82 (-1.05 to -0.59) | too few forced decks |
| Grumgully, the Generous | yes | 2 (5) | 3.2 | 0.18 | 0.61 | -0.44 (-0.96 to +0.08) | too few forced decks |
| Grist, the Hunger Tide |  | 1 (3) | 0.9 | 0.67 | 0.67 | +0.00 (+0.00 to +0.00) | too few forced decks |
| Juri, Master of the Revue | yes | 1 (3) | 0.8 | 0.67 | 1.00 | -0.33 (-0.33 to -0.33) | too few forced decks |
| Karn, Scion of Urza |  | 1 (3) | 0.1 | 0.67 | – | – (– to –) | too few forced decks |
| Pia Nalaar |  | 1 (2) | 1.4 | 0.00 | 0.50 | -0.50 (-0.67 to -0.32) | too few forced decks |
| Reveillark |  | 1 (2) | 0.7 | 1.00 | 0.67 | +0.33 (-0.20 to +0.85) | too few forced decks |
| Solemn Simulacrum |  | 1 (2) | 0.8 | 1.00 | 0.43 | +0.57 (+0.13 to +1.00) | too few forced decks |
| Marionette Master |  | 0 (0) | 1.2 | – | 0.53 | – (– to –) | too few forced decks |
| Omnath, Locus of Rage |  | 0 (0) | 0.4 | – | 0.00 | – (– to –) | too few forced decks |
| Scute Swarm |  | 0 (0) | 5.0 | – | 0.42 | – (– to –) | too few forced decks |

## Generation 1 — v2 → v2 (2026-10-16)

Discovery: 200 grid drafts, seeds 170000001–170000200, 342 decisive games; mean card win rate 0.50; 326 tests at a false-discovery rate of 0.1; design effect of a card's games 1.17; dominant-win against each card's colour pairs (D377).

Exploration (D356): 56 of 200 drafts explored, 92 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 144 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 200 drafts; 4 lead(s) to watch — about 690 drafts per generation would find half of them. Run more drafts. 38 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Restoration Angel | lean-dominant | dealt 180, picked 89, first line 28, in 32 deck(s); on colour in 51 pool(s), played in 32 (0.63, CI 0.49–0.75); won 41 of 49 decisive games (0.84, CI 0.70–0.92 by deck, design effect 1.17, shrunk 0.74) vs mean 0.50, its colour pairs 0.61 (D377) | 309 |
| Elspeth, Sun's Champion | lean-dominant | dealt 179, picked 142, first line 92, in 93 deck(s); on colour in 94 pool(s), played in 93 (0.99, CI 0.94–1.00); won 111 of 152 decisive games (0.73, CI 0.65–0.80 by deck, design effect 1.17, shrunk 0.70) vs mean 0.50, its colour pairs 0.58 (D377) | 385 |
| Woe Strider | lean-dominant | dealt 174, picked 99, first line 48, in 40 deck(s); on colour in 44 pool(s), played in 40 (0.91, CI 0.79–0.96); won 35 of 64 decisive games (0.55, CI 0.42–0.67 by deck, design effect 1.17, shrunk 0.54) vs mean 0.50, its colour pairs 0.40 (D377) | 690 |
| Flame Slash | lean-dead | dealt 176, picked 133, first line 61, in 12 deck(s); on colour in 37 pool(s), played in 12 (0.32, CI 0.20–0.48); won 11 of 24 decisive games (0.46, CI 0.27–0.66 by deck, design effect 1.17, shrunk 0.48) vs mean 0.50, its colour pairs 0.39 (D377) | 21892 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Beast Within (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 174, picked 91, first line 24, in 5 deck(s); on colour in 64 pool(s), played in 5 (0.08, CI 0.03–0.17); won 3 of 8 decisive games (0.38, CI 0.13–0.71 by deck, design effect 1.17, shrunk 0.46) vs mean 0.50, its colour pairs 0.42 (D377); dead p 4.3e-7
- Chromatic Star (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says lean-dead: dealt 186, picked 139, first line 78, in 44 deck(s); on colour in 139 pool(s), played in 44 (0.32, CI 0.24–0.40); won 31 of 82 decisive games (0.38, CI 0.27–0.49 by deck, design effect 1.17, shrunk 0.40) vs mean 0.50, its colour pairs 0.49 (D377)
- Faithless Looting (AI:RemoveDeck:All) — ai-limited: dealt 180, picked 165, first line 111, in 55 deck(s); on colour in 55 pool(s), played in 55 (1.00, CI 0.94–1.00); won 31 of 98 decisive games (0.32, CI 0.23–0.42 by deck, design effect 1.17, shrunk 0.35) vs mean 0.50, its colour pairs 0.43 (D377)
- Goblin Bombardment (AI:RemoveDeck:All) — ai-limited: dealt 184, picked 161, first line 100, in 44 deck(s); on colour in 44 pool(s), played in 44 (1.00, CI 0.92–1.00); won 28 of 81 decisive games (0.35, CI 0.24–0.46 by deck, design effect 1.17, shrunk 0.38) vs mean 0.50, its colour pairs 0.45 (D377)
- Hardened Scales (AI:RemoveDeck:Random) — note-keep: dealt 177, picked 136, first line 75, in 62 deck(s); on colour in 83 pool(s), played in 62 (0.75, CI 0.64–0.83); won 56 of 127 decisive games (0.44, CI 0.35–0.54 by deck, design effect 1.17, shrunk 0.45) vs mean 0.50, its colour pairs 0.53 (D377); note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.
- Ichor Wellspring (AI:RemoveDeck:Random) — ai-limited: dealt 182, picked 158, first line 91, in 158 deck(s); on colour in 158 pool(s), played in 158 (1.00, CI 0.98–1.00); won 125 of 262 decisive games (0.48, CI 0.41–0.54 by deck, design effect 1.17, shrunk 0.48) vs mean 0.50, its colour pairs 0.53 (D377)
- Intangible Virtue (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 168, picked 50, first line 14, in 0 deck(s); on colour in 24 pool(s), played in 0 (0.00, CI 0.00–0.14); no decisive games in a deck; dead p 3.2e-5
- Lotus Petal (AI:RemoveDeck:Random) — ai-limited: dealt 182, picked 179, first line 151, in 179 deck(s); on colour in 179 pool(s), played in 179 (1.00, CI 0.98–1.00); won 158 of 306 decisive games (0.52, CI 0.46–0.58 by deck, design effect 1.17, shrunk 0.52) vs mean 0.50, its colour pairs 0.51 (D377)
- Mishra's Bauble (AI:RemoveDeck:All) — ai-limited: dealt 183, picked 152, first line 84, in 146 deck(s); on colour in 152 pool(s), played in 146 (0.96, CI 0.92–0.98); won 144 of 248 decisive games (0.58, CI 0.51–0.65 by deck, design effect 1.17, shrunk 0.57) vs mean 0.50, its colour pairs 0.52 (D377)
- Prismatic Ending (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 183, picked 95, first line 32, in 3 deck(s); on colour in 55 pool(s), played in 3 (0.05, CI 0.02–0.15); won 6 of 7 decisive games (0.86, CI 0.46–0.98 by deck, design effect 1.17, shrunk 0.59) vs mean 0.50, its colour pairs 0.63 (D377); dead p 2.3e-7
- Prophetic Prism (AI:RemoveDeck:All) — ai-limited: dealt 181, picked 172, first line 136, in 172 deck(s); on colour in 172 pool(s), played in 172 (1.00, CI 0.98–1.00); won 135 of 291 decisive games (0.46, CI 0.40–0.53 by deck, design effect 1.17, shrunk 0.47) vs mean 0.50, its colour pairs 0.50 (D377)
- Soulherder (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dead: dealt 174, picked 58, first line 21, in 1 deck(s); on colour in 17 pool(s), played in 1 (0.06, CI 0.01–0.27); no decisive games in a deck
- Viscera Seer (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 186, picked 90, first line 35, in 2 deck(s); on colour in 39 pool(s), played in 2 (0.05, CI 0.01–0.17); won 1 of 3 decisive games (0.33, CI 0.06–0.81 by deck, design effect 1.17, shrunk 0.48) vs mean 0.50, its colour pairs 0.47 (D377); dead p 1.2e-5
- Winding Constrictor (AI:RemoveDeck:Random) — note-keep, the AI evidence alone says lean-dead: dealt 173, picked 58, first line 18, in 0 deck(s); on colour in 9 pool(s), played in 0 (0.00, CI 0.00–0.30); no decisive games in a deck; note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Ajani's Pridemate, Anax, Hardened in the Forge, Bloodghast, Carrion Feeder, Charming Prince, Conclave Mentor, Delver of Secrets, Dreadhorde Arcanist, Ephemerate, Experimental Synthesizer, Fatal Push, Flickerwisp, Grumgully, the Generous, Hanweir Garrison, Hordeling Outburst, Juri, Master of the Revue, Kari Zev, Skyship Raider, Kitesail Freebooter, Knight of Autumn, Legion Warboss, Lonis, Cryptozoologist, March of Otherworldly Light, Mayhem Devil, Myr Sire, Pelt Collector, Persist, Prized Amalgam, Ram Through, Reckless Fireweaver, Reflector Mage, Satyr Wayfinder, Soul-Scar Mage, Tidehollow Sculler, Ulvenwald Mysteries, Unsummon, Village Rites, Watcher for Tomorrow, Zulaport Cutthroat.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 6.39 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.66 (rating 98, CTRL SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.96 (rating 94.4, GY CTRL)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.66 (rating 69.2, ETB SPL)
- Embercleave (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.66 (rating 54.1, ART)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.42 (rating 85.4, ART)
- Goblin Welder (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.34 (rating 35.6, ART GY REAN)
- Tortured Existence (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.88 (rating 54, GY SAC)
- Urza's Bauble (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.86 (rating 71.4, ART)
- Nethergoyf (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.85 (rating 53.2, GY AGG)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UG | 55 | 131 | 0.37 | 0.30–0.46 | 0.39 |
| WU | 53 | 122 | 0.65 | 0.56–0.73 | 0.63 |
| WG | 43 | 104 | 0.67 | 0.58–0.76 | 0.65 |
| UB | 33 | 79 | 0.35 | 0.26–0.46 | 0.38 |
| UR | 32 | 74 | 0.26 | 0.17–0.37 | 0.31 |
| BG | 28 | 66 | 0.45 | 0.34–0.57 | 0.47 |
| WB | 21 | 50 | 0.74 | 0.60–0.84 | 0.67 |
| BR | 10 | 26 | 0.54 | 0.35–0.71 | 0.52 |
| RG | 8 | 21 | 0.43 | 0.24–0.64 | 0.46 |
| WR | 5 | 11 | 0.64 | 0.35–0.85 | 0.55 |

## Generation 2 — v2 → v2 (2026-10-16)

Discovery: 200 grid drafts, seeds 170000201–170000400, 371 decisive games; mean card win rate 0.50; 329 tests at a false-discovery rate of 0.1; design effect of a card's games 1.15; dominant-win against each card's colour pairs (D377).

Exploration (D356): 46 of 200 drafts explored, 71 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 154 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 200 drafts; 8 lead(s) to watch — about 2099 drafts per generation would find half of them. Run more drafts. 32 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Blade Splicer | lean-dominant | dealt 183, picked 135, first line 72, in 89 deck(s); on colour in 89 pool(s), played in 89 (1.00, CI 0.96–1.00); won 129 of 171 decisive games (0.75, CI 0.68–0.82 by deck, design effect 1.15, shrunk 0.73) vs mean 0.50, its colour pairs 0.61 (D377) | 312 |
| Courser of Kruphix | lean-dominant | dealt 179, picked 145, first line 84, in 95 deck(s); on colour in 97 pool(s), played in 95 (0.98, CI 0.93–0.99); won 92 of 171 decisive games (0.54, CI 0.46–0.62 by deck, design effect 1.15, shrunk 0.53) vs mean 0.50, its colour pairs 0.39 (D377) | 341 |
| Reveillark | lean-dominant | dealt 173, picked 114, first line 39, in 70 deck(s); on colour in 72 pool(s), played in 70 (0.97, CI 0.90–0.99); won 97 of 129 decisive games (0.75, CI 0.67–0.82 by deck, design effect 1.15, shrunk 0.72) vs mean 0.50, its colour pairs 0.62 (D377) | 433 |
| Restoration Angel | lean-dominant | dealt 176, picked 94, first line 44, in 34 deck(s); on colour in 62 pool(s), played in 34 (0.55, CI 0.42–0.67); won 55 of 72 decisive games (0.76, CI 0.65–0.85 by deck, design effect 1.15, shrunk 0.71) vs mean 0.50, its colour pairs 0.62 (D377) | 551 |
| Reflector Mage | lean-dominant | dealt 178, picked 42, first line 17, in 1 deck(s); on colour in 10 pool(s), played in 1 (0.10, CI 0.02–0.40); won 2 of 2 decisive games (1.00, CI 0.31–1.00 by deck, design effect 1.15, shrunk 0.54) vs mean 0.50, its colour pairs 0.59 (D377) | 2099 |
| Hordeling Outburst | lean-dominant | dealt 180, picked 71, first line 32, in 1 deck(s); on colour in 17 pool(s), played in 1 (0.06, CI 0.01–0.27); won 2 of 2 decisive games (1.00, CI 0.31–1.00 by deck, design effect 1.15, shrunk 0.54) vs mean 0.50, its colour pairs 0.66 (D377) | 2861 |
| Village Rites | lean-dominant | dealt 177, picked 56, first line 12, in 1 deck(s); on colour in 20 pool(s), played in 1 (0.05, CI 0.01–0.24); won 2 of 3 decisive games (0.67, CI 0.19–0.94 by deck, design effect 1.15, shrunk 0.52) vs mean 0.50, its colour pairs 0.47 (D377) | 6183 |
| Conclave Mentor | lean-dominant | dealt 180, picked 72, first line 23, in 2 deck(s); on colour in 14 pool(s), played in 2 (0.14, CI 0.04–0.40); won 4 of 5 decisive games (0.80, CI 0.35–0.97 by deck, design effect 1.15, shrunk 0.56) vs mean 0.50, its colour pairs 0.67 (D377) | 7434 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Beast Within (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 180, picked 85, first line 27, in 5 deck(s); on colour in 58 pool(s), played in 5 (0.09, CI 0.04–0.19); won 5 of 9 decisive games (0.56, CI 0.25–0.82 by deck, design effect 1.15, shrunk 0.52) vs mean 0.50, its colour pairs 0.62 (D377); dead p 3.5e-6
- Chromatic Star (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says lean-dead: dealt 178, picked 153, first line 74, in 44 deck(s); on colour in 153 pool(s), played in 44 (0.29, CI 0.22–0.36); won 38 of 79 decisive games (0.48, CI 0.37–0.60 by deck, design effect 1.15, shrunk 0.48) vs mean 0.50, its colour pairs 0.47 (D377)
- Faithless Looting (AI:RemoveDeck:All) — ai-limited: dealt 186, picked 173, first line 117, in 41 deck(s); on colour in 41 pool(s), played in 41 (1.00, CI 0.91–1.00); won 24 of 64 decisive games (0.38, CI 0.26–0.51 by deck, design effect 1.15, shrunk 0.40) vs mean 0.50, its colour pairs 0.47 (D377)
- Goblin Bombardment (AI:RemoveDeck:All) — ai-limited: dealt 179, picked 148, first line 83, in 44 deck(s); on colour in 44 pool(s), played in 44 (1.00, CI 0.92–1.00); won 36 of 78 decisive games (0.46, CI 0.35–0.58 by deck, design effect 1.15, shrunk 0.47) vs mean 0.50, its colour pairs 0.49 (D377)
- Hardened Scales (AI:RemoveDeck:Random) — note-keep: dealt 184, picked 143, first line 70, in 67 deck(s); on colour in 84 pool(s), played in 67 (0.80, CI 0.70–0.87); won 58 of 123 decisive games (0.47, CI 0.38–0.57 by deck, design effect 1.15, shrunk 0.48) vs mean 0.50, its colour pairs 0.47 (D377); note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.
- Ichor Wellspring (AI:RemoveDeck:Random) — ai-limited: dealt 177, picked 153, first line 91, in 153 deck(s); on colour in 153 pool(s), played in 153 (1.00, CI 0.98–1.00); won 143 of 288 decisive games (0.50, CI 0.43–0.56 by deck, design effect 1.15, shrunk 0.50) vs mean 0.50, its colour pairs 0.51 (D377)
- Intangible Virtue (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 176, picked 70, first line 16, in 0 deck(s); on colour in 41 pool(s), played in 0 (0.00, CI 0.00–0.09); no decisive games in a deck; dead p 2.1e-8
- Lotus Petal (AI:RemoveDeck:Random) — ai-limited: dealt 176, picked 174, first line 148, in 174 deck(s); on colour in 174 pool(s), played in 174 (1.00, CI 0.98–1.00); won 166 of 332 decisive games (0.50, CI 0.44–0.56 by deck, design effect 1.15, shrunk 0.50) vs mean 0.50, its colour pairs 0.52 (D377)
- Mishra's Bauble (AI:RemoveDeck:All) — ai-limited: dealt 182, picked 161, first line 95, in 154 deck(s); on colour in 161 pool(s), played in 154 (0.96, CI 0.91–0.98); won 134 of 299 decisive games (0.45, CI 0.39–0.51 by deck, design effect 1.15, shrunk 0.45) vs mean 0.50, its colour pairs 0.51 (D377)
- Prismatic Ending (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 182, picked 103, first line 49, in 5 deck(s); on colour in 68 pool(s), played in 5 (0.07, CI 0.03–0.16); won 7 of 10 decisive games (0.70, CI 0.38–0.90 by deck, design effect 1.15, shrunk 0.57) vs mean 0.50, its colour pairs 0.68 (D377); dead p 1.0e-7
- Prophetic Prism (AI:RemoveDeck:All) — ai-limited: dealt 177, picked 176, first line 136, in 176 deck(s); on colour in 176 pool(s), played in 176 (1.00, CI 0.98–1.00); won 155 of 326 decisive games (0.48, CI 0.42–0.53 by deck, design effect 1.15, shrunk 0.48) vs mean 0.50, its colour pairs 0.50 (D377)
- Soulherder (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dead: dealt 173, picked 73, first line 19, in 3 deck(s); on colour in 20 pool(s), played in 3 (0.15, CI 0.05–0.36); won 3 of 5 decisive games (0.60, CI 0.21–0.89 by deck, design effect 1.15, shrunk 0.52) vs mean 0.50, its colour pairs 0.60 (D377)
- Viscera Seer (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 182, picked 84, first line 25, in 0 deck(s); on colour in 34 pool(s), played in 0 (0.00, CI 0.00–0.10); no decisive games in a deck; dead p 4.4e-7
- Winding Constrictor (AI:RemoveDeck:Random) — note-keep, the AI evidence alone says lean-dead: dealt 179, picked 61, first line 18, in 1 deck(s); on colour in 15 pool(s), played in 1 (0.07, CI 0.01–0.30); won 0 of 2 decisive games (0.00, CI 0.00–0.69 by deck, design effect 1.15, shrunk 0.45) vs mean 0.50, its colour pairs 0.49 (D377); note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Ajani's Pridemate, Anax, Hardened in the Forge, Carrion Feeder, Charming Prince, Delver of Secrets, Dreadhorde Arcanist, Ephemerate, Experimental Synthesizer, Fatal Push, Flickerwisp, Grumgully, the Generous, Hanweir Garrison, Juri, Master of the Revue, Kari Zev, Skyship Raider, Kitesail Freebooter, Knight of Autumn, Legion Warboss, Lonis, Cryptozoologist, March of Otherworldly Light, Mayhem Devil, Myr Sire, Pelt Collector, Prized Amalgam, Ram Through, Reckless Fireweaver, Satyr Wayfinder, Soul-Scar Mage, Tidehollow Sculler, Ulvenwald Mysteries, Unsummon, Watcher for Tomorrow, Zulaport Cutthroat.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 6.90 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 6.17 (rating 98, CTRL SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.24 (rating 94.4, GY CTRL)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.02 (rating 69.2, ETB SPL)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.56 (rating 85.4, ART)
- Embercleave (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.42 (rating 54.1, ART)
- Urza's Bauble (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.00 (rating 71.4, ART)
- Goblin Welder (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.74 (rating 35.6, ART GY REAN)
- Tortured Existence (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.39 (rating 54, GY SAC)
- Nethergoyf (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.35 (rating 53.2, GY AGG)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UG | 68 | 161 | 0.26 | 0.20–0.33 | 0.29 |
| WU | 53 | 134 | 0.61 | 0.53–0.69 | 0.60 |
| WB | 40 | 95 | 0.77 | 0.67–0.84 | 0.72 |
| WG | 37 | 88 | 0.72 | 0.61–0.80 | 0.68 |
| BG | 29 | 74 | 0.47 | 0.36–0.58 | 0.48 |
| UR | 28 | 64 | 0.25 | 0.16–0.37 | 0.31 |
| UB | 24 | 57 | 0.37 | 0.26–0.50 | 0.40 |
| WR | 16 | 38 | 0.76 | 0.61–0.87 | 0.67 |
| RG | 8 | 21 | 0.38 | 0.21–0.59 | 0.44 |
| BR | 5 | 10 | 0.20 | 0.06–0.51 | 0.40 |

## Generation 3 — v2 → v2 (2026-10-16)

Discovery: 200 grid drafts, seeds 170000401–170000600, 299 decisive games; mean card win rate 0.50; 329 tests at a false-discovery rate of 0.1; design effect of a card's games 1.20; dominant-win against each card's colour pairs (D377).

Exploration (D356): 73 of 200 drafts explored, 115 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 127 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 200 drafts; 6 lead(s) to watch — about 1279 drafts per generation would find half of them. Run more drafts. 32 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Thraben Inspector | lean-dominant | dealt 181, picked 176, first line 143, in 124 deck(s); on colour in 124 pool(s), played in 124 (1.00, CI 0.97–1.00); won 129 of 180 decisive games (0.72, CI 0.64–0.78 by deck, design effect 1.20, shrunk 0.69) vs mean 0.50, its colour pairs 0.57 (D377) | 384 |
| Deadly Dispute | lean-dominant | dealt 179, picked 146, first line 79, in 75 deck(s); on colour in 75 pool(s), played in 75 (1.00, CI 0.95–1.00); won 76 of 115 decisive games (0.66, CI 0.56–0.75 by deck, design effect 1.20, shrunk 0.64) vs mean 0.50, its colour pairs 0.50 (D377) | 431 |
| Elspeth, Sun's Champion | lean-dominant | dealt 183, picked 159, first line 89, in 100 deck(s); on colour in 104 pool(s), played in 100 (0.96, CI 0.91–0.98); won 103 of 138 decisive games (0.75, CI 0.66–0.82 by deck, design effect 1.20, shrunk 0.72) vs mean 0.50, its colour pairs 0.61 (D377) | 464 |
| Showdown of the Skalds | lean-dominant | dealt 179, picked 74, first line 25, in 4 deck(s); on colour in 8 pool(s), played in 4 (0.50, CI 0.21–0.79); won 4 of 4 decisive games (1.00, CI 0.46–1.00 by deck, design effect 1.20, shrunk 0.58) vs mean 0.50, its colour pairs 0.61 (D377) | 1279 |
| Conclave Mentor | lean-dominant | dealt 182, picked 76, first line 16, in 1 deck(s); on colour in 19 pool(s), played in 1 (0.05, CI 0.01–0.25); won 2 of 2 decisive games (1.00, CI 0.30–1.00 by deck, design effect 1.20, shrunk 0.55) vs mean 0.50, its colour pairs 0.61 (D377) | 2337 |
| Kari Zev, Skyship Raider | lean-dominant | dealt 184, picked 83, first line 23, in 1 deck(s); on colour in 21 pool(s), played in 1 (0.05, CI 0.01–0.23); won 2 of 2 decisive games (1.00, CI 0.30–1.00 by deck, design effect 1.20, shrunk 0.55) vs mean 0.50, its colour pairs 0.63 (D377) | 2539 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Beast Within (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says lean-dead: dealt 182, picked 93, first line 31, in 9 deck(s); on colour in 51 pool(s), played in 9 (0.18, CI 0.10–0.30); won 2 of 6 decisive games (0.33, CI 0.09–0.72 by deck, design effect 1.20, shrunk 0.46) vs mean 0.50, its colour pairs 0.40 (D377)
- Chromatic Star (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says lean-dead: dealt 174, picked 135, first line 78, in 37 deck(s); on colour in 135 pool(s), played in 37 (0.27, CI 0.21–0.35); won 30 of 56 decisive games (0.54, CI 0.40–0.67 by deck, design effect 1.20, shrunk 0.53) vs mean 0.50, its colour pairs 0.51 (D377)
- Faithless Looting (AI:RemoveDeck:All) — ai-limited: dealt 188, picked 171, first line 106, in 45 deck(s); on colour in 45 pool(s), played in 45 (1.00, CI 0.92–1.00); won 25 of 61 decisive games (0.41, CI 0.29–0.55 by deck, design effect 1.20, shrunk 0.43) vs mean 0.50, its colour pairs 0.42 (D377)
- Goblin Bombardment (AI:RemoveDeck:All) — ai-limited: dealt 176, picked 140, first line 82, in 35 deck(s); on colour in 37 pool(s), played in 35 (0.95, CI 0.82–0.98); won 22 of 48 decisive games (0.46, CI 0.31–0.61 by deck, design effect 1.20, shrunk 0.47) vs mean 0.50, its colour pairs 0.45 (D377)
- Hardened Scales (AI:RemoveDeck:Random) — note-keep: dealt 182, picked 133, first line 70, in 58 deck(s); on colour in 78 pool(s), played in 58 (0.74, CI 0.64–0.83); won 32 of 90 decisive games (0.36, CI 0.26–0.47 by deck, design effect 1.20, shrunk 0.38) vs mean 0.50, its colour pairs 0.45 (D377); note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.
- Ichor Wellspring (AI:RemoveDeck:Random) — ai-limited: dealt 179, picked 157, first line 94, in 157 deck(s); on colour in 157 pool(s), played in 157 (1.00, CI 0.98–1.00); won 128 of 243 decisive games (0.53, CI 0.46–0.59 by deck, design effect 1.20, shrunk 0.52) vs mean 0.50, its colour pairs 0.50 (D377)
- Intangible Virtue (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 170, picked 66, first line 17, in 1 deck(s); on colour in 43 pool(s), played in 1 (0.02, CI 0.00–0.12); no decisive games in a deck; dead p 2.2e-7
- Lotus Petal (AI:RemoveDeck:Random) — ai-limited: dealt 178, picked 176, first line 151, in 176 deck(s); on colour in 176 pool(s), played in 176 (1.00, CI 0.98–1.00); won 114 of 266 decisive games (0.43, CI 0.36–0.49 by deck, design effect 1.20, shrunk 0.43) vs mean 0.50, its colour pairs 0.51 (D377)
- Mishra's Bauble (AI:RemoveDeck:All) — ai-limited: dealt 180, picked 152, first line 89, in 148 deck(s); on colour in 152 pool(s), played in 148 (0.97, CI 0.93–0.99); won 116 of 228 decisive games (0.51, CI 0.44–0.58 by deck, design effect 1.20, shrunk 0.51) vs mean 0.50, its colour pairs 0.50 (D377)
- Prismatic Ending (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 183, picked 84, first line 21, in 4 deck(s); on colour in 53 pool(s), played in 4 (0.08, CI 0.03–0.18); won 6 of 11 decisive games (0.55, CI 0.26–0.80 by deck, design effect 1.20, shrunk 0.52) vs mean 0.50, its colour pairs 0.63 (D377); dead p 3.5e-6
- Prophetic Prism (AI:RemoveDeck:All) — ai-limited: dealt 180, picked 176, first line 141, in 176 deck(s); on colour in 176 pool(s), played in 176 (1.00, CI 0.98–1.00); won 115 of 262 decisive games (0.44, CI 0.38–0.51 by deck, design effect 1.20, shrunk 0.44) vs mean 0.50, its colour pairs 0.48 (D377)
- Soulherder (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dead: dealt 177, picked 76, first line 21, in 3 deck(s); on colour in 20 pool(s), played in 3 (0.15, CI 0.05–0.36); won 4 of 8 decisive games (0.50, CI 0.20–0.80 by deck, design effect 1.20, shrunk 0.50) vs mean 0.50, its colour pairs 0.63 (D377)
- Viscera Seer (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 178, picked 85, first line 26, in 0 deck(s); on colour in 38 pool(s), played in 0 (0.00, CI 0.00–0.09); no decisive games in a deck; dead p 7.8e-8
- Winding Constrictor (AI:RemoveDeck:Random) — note-keep, the AI evidence alone says lean-dead: dealt 180, picked 65, first line 22, in 1 deck(s); on colour in 13 pool(s), played in 1 (0.08, CI 0.01–0.33); no decisive games in a deck; note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Ajani's Pridemate, Carrion Feeder, Charming Prince, Delver of Secrets, Dreadhorde Arcanist, Ephemerate, Fatal Push, Flickerwisp, Grumgully, the Generous, Hanweir Garrison, Hordeling Outburst, Juri, Master of the Revue, Kitesail Freebooter, Knight of Autumn, Lonis, Cryptozoologist, March of Otherworldly Light, Mayhem Devil, Myr Sire, Pelt Collector, Priest of Forgotten Gods, Prized Amalgam, Ram Through, Reckless Fireweaver, Reflector Mage, Satyr Wayfinder, Soul-Scar Mage, Tidehollow Sculler, Ulvenwald Mysteries, Unsummon, Village Rites, Watcher for Tomorrow, Zulaport Cutthroat.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 6.67 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.94 (rating 98, CTRL SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.30 (rating 94.4, GY CTRL)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.79 (rating 69.2, ETB SPL)
- Embercleave (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.66 (rating 54.1, ART)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.64 (rating 85.4, ART)
- Urza's Bauble (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.08 (rating 71.4, ART)
- Manifold Key (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.38 (rating 53.8, ART)
- Memory Jar (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.36 (rating 53.3, ART)
- Goblin Welder (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.19 (rating 35.6, ART GY REAN)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UG | 57 | 129 | 0.25 | 0.18–0.33 | 0.28 |
| WU | 44 | 106 | 0.64 | 0.55–0.73 | 0.62 |
| WB | 36 | 84 | 0.79 | 0.69–0.86 | 0.73 |
| BG | 30 | 74 | 0.42 | 0.31–0.53 | 0.44 |
| WG | 27 | 65 | 0.66 | 0.54–0.77 | 0.62 |
| UB | 23 | 54 | 0.46 | 0.34–0.59 | 0.47 |
| UR | 22 | 55 | 0.29 | 0.19–0.42 | 0.35 |
| WR | 9 | 17 | 0.82 | 0.59–0.94 | 0.65 |
| BR | 4 | 10 | 0.40 | 0.17–0.69 | 0.47 |
| RG | 2 | 4 | 0.00 | 0.00–0.49 | 0.42 |

## Generation 4 — v2 → v2 (2026-10-16)

Discovery: 200 grid drafts, seeds 170000601–170000800, 361 decisive games; mean card win rate 0.50; 330 tests at a false-discovery rate of 0.1; design effect of a card's games 1.06; dominant-win against each card's colour pairs (D377).

Exploration (D356): 53 of 200 drafts explored, 87 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 147 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 200 drafts; 11 lead(s) to watch — about 1471 drafts per generation would find half of them. Run more drafts. 31 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Reveillark | lean-dominant | dealt 182, picked 115, first line 52, in 80 deck(s); on colour in 82 pool(s), played in 80 (0.98, CI 0.92–0.99); won 94 of 132 decisive games (0.71, CI 0.63–0.78 by deck, design effect 1.06, shrunk 0.68) vs mean 0.50, its colour pairs 0.57 (D377) | 357 |
| Avenger of Zendikar | lean-dominant | dealt 176, picked 134, first line 65, in 78 deck(s); on colour in 88 pool(s), played in 78 (0.89, CI 0.80–0.94); won 80 of 139 decisive games (0.58, CI 0.49–0.66 by deck, design effect 1.06, shrunk 0.57) vs mean 0.50, its colour pairs 0.44 (D377) | 370 |
| Welcoming Vampire | lean-dominant | dealt 175, picked 156, first line 92, in 113 deck(s); on colour in 113 pool(s), played in 113 (1.00, CI 0.97–1.00); won 148 of 209 decisive games (0.71, CI 0.64–0.77 by deck, design effect 1.06, shrunk 0.69) vs mean 0.50, its colour pairs 0.58 (D377) | 387 |
| Experimental Synthesizer | lean-dominant | dealt 182, picked 111, first line 51, in 6 deck(s); on colour in 30 pool(s), played in 6 (0.20, CI 0.10–0.37); won 9 of 13 decisive games (0.69, CI 0.42–0.88 by deck, design effect 1.06, shrunk 0.57) vs mean 0.50, its colour pairs 0.42 (D377) | 696 |
| Pia and Kiran Nalaar | lean-dominant | dealt 187, picked 112, first line 49, in 34 deck(s); on colour in 35 pool(s), played in 34 (0.97, CI 0.85–0.99); won 37 of 64 decisive games (0.58, CI 0.45–0.69 by deck, design effect 1.06, shrunk 0.56) vs mean 0.50, its colour pairs 0.46 (D377) | 1021 |
| Lightning Helix | lean-dominant | dealt 179, picked 129, first line 64, in 17 deck(s); on colour in 17 pool(s), played in 17 (1.00, CI 0.82–1.00); won 25 of 36 decisive games (0.69, CI 0.53–0.82 by deck, design effect 1.06, shrunk 0.62) vs mean 0.50, its colour pairs 0.55 (D377) | 1471 |
| Hanweir Garrison | lean-dominant | dealt 179, picked 72, first line 18, in 1 deck(s); on colour in 13 pool(s), played in 1 (0.08, CI 0.01–0.33); won 2 of 3 decisive games (0.67, CI 0.20–0.94 by deck, design effect 1.06, shrunk 0.52) vs mean 0.50, its colour pairs 0.33 (D377) | 1683 |
| Flame Slash | lean-dominant | dealt 184, picked 121, first line 54, in 11 deck(s); on colour in 27 pool(s), played in 11 (0.41, CI 0.24–0.59); won 13 of 21 decisive games (0.62, CI 0.40–0.80 by deck, design effect 1.06, shrunk 0.56) vs mean 0.50, its colour pairs 0.49 (D377) | 1976 |
| Kari Zev, Skyship Raider | lean-dominant | dealt 181, picked 59, first line 19, in 1 deck(s); on colour in 12 pool(s), played in 1 (0.08, CI 0.01–0.35); won 2 of 2 decisive games (1.00, CI 0.33–1.00 by deck, design effect 1.06, shrunk 0.54) vs mean 0.50, its colour pairs 0.64 (D377) | 2290 |
| Conclave Mentor | lean-dominant | dealt 183, picked 68, first line 27, in 2 deck(s); on colour in 25 pool(s), played in 2 (0.08, CI 0.02–0.25); won 2 of 2 decisive games (1.00, CI 0.33–1.00 by deck, design effect 1.06, shrunk 0.54) vs mean 0.50, its colour pairs 0.68 (D377) | 2799 |
| Reflector Mage | lean-dominant | dealt 180, picked 59, first line 14, in 1 deck(s); on colour in 18 pool(s), played in 1 (0.06, CI 0.01–0.26); won 2 of 3 decisive games (0.67, CI 0.20–0.94 by deck, design effect 1.06, shrunk 0.52) vs mean 0.50, its colour pairs 0.53 (D377) | 11618 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Beast Within (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 186, picked 83, first line 29, in 2 deck(s); on colour in 60 pool(s), played in 2 (0.03, CI 0.01–0.11); won 0 of 4 decisive games (0.00, CI 0.00–0.50 by deck, design effect 1.06, shrunk 0.42) vs mean 0.50, its colour pairs 0.38 (D377); dead p 3.3e-9
- Chromatic Star (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says lean-dead: dealt 178, picked 141, first line 84, in 46 deck(s); on colour in 141 pool(s), played in 46 (0.33, CI 0.25–0.41); won 39 of 74 decisive games (0.53, CI 0.41–0.64 by deck, design effect 1.06, shrunk 0.52) vs mean 0.50, its colour pairs 0.47 (D377)
- Faithless Looting (AI:RemoveDeck:All) — ai-limited: dealt 173, picked 162, first line 104, in 36 deck(s); on colour in 36 pool(s), played in 36 (1.00, CI 0.90–1.00); won 34 of 75 decisive games (0.45, CI 0.34–0.57 by deck, design effect 1.06, shrunk 0.46) vs mean 0.50, its colour pairs 0.48 (D377)
- Goblin Bombardment (AI:RemoveDeck:All) — ai-limited: dealt 181, picked 151, first line 78, in 36 deck(s); on colour in 37 pool(s), played in 36 (0.97, CI 0.86–0.99); won 30 of 73 decisive games (0.41, CI 0.30–0.53 by deck, design effect 1.06, shrunk 0.43) vs mean 0.50, its colour pairs 0.52 (D377)
- Hardened Scales (AI:RemoveDeck:Random) — note-keep: dealt 180, picked 134, first line 62, in 57 deck(s); on colour in 77 pool(s), played in 57 (0.74, CI 0.63–0.82); won 43 of 100 decisive games (0.43, CI 0.34–0.53 by deck, design effect 1.06, shrunk 0.44) vs mean 0.50, its colour pairs 0.47 (D377); note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.
- Ichor Wellspring (AI:RemoveDeck:Random) — ai-limited: dealt 181, picked 157, first line 96, in 157 deck(s); on colour in 157 pool(s), played in 157 (1.00, CI 0.98–1.00); won 131 of 294 decisive games (0.45, CI 0.39–0.50 by deck, design effect 1.06, shrunk 0.45) vs mean 0.50, its colour pairs 0.49 (D377)
- Intangible Virtue (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 183, picked 73, first line 20, in 0 deck(s); on colour in 50 pool(s), played in 0 (0.00, CI 0.00–0.07); no decisive games in a deck; dead p 4.4e-10
- Lotus Petal (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dominant-pick: dealt 173, picked 172, first line 154, in 172 deck(s); on colour in 172 pool(s), played in 172 (1.00, CI 0.98–1.00); won 156 of 311 decisive games (0.50, CI 0.45–0.56 by deck, design effect 1.06, shrunk 0.50) vs mean 0.50, its colour pairs 0.51 (D377); dominant-pick p 3.2e-6
- Mishra's Bauble (AI:RemoveDeck:All) — ai-limited: dealt 180, picked 155, first line 82, in 148 deck(s); on colour in 155 pool(s), played in 148 (0.95, CI 0.91–0.98); won 134 of 264 decisive games (0.51, CI 0.45–0.57 by deck, design effect 1.06, shrunk 0.51) vs mean 0.50, its colour pairs 0.50 (D377)
- Prismatic Ending (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 179, picked 101, first line 45, in 6 deck(s); on colour in 64 pool(s), played in 6 (0.09, CI 0.04–0.19); won 8 of 16 decisive games (0.50, CI 0.28–0.72 by deck, design effect 1.06, shrunk 0.50) vs mean 0.50, its colour pairs 0.63 (D377); dead p 2.4e-6
- Prophetic Prism (AI:RemoveDeck:All) — ai-limited: dealt 177, picked 174, first line 140, in 174 deck(s); on colour in 174 pool(s), played in 174 (1.00, CI 0.98–1.00); won 152 of 315 decisive games (0.48, CI 0.43–0.54 by deck, design effect 1.06, shrunk 0.48) vs mean 0.50, its colour pairs 0.49 (D377)
- Soulherder (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dead: dealt 176, picked 77, first line 22, in 3 deck(s); on colour in 26 pool(s), played in 3 (0.12, CI 0.04–0.29); won 5 of 8 decisive games (0.63, CI 0.30–0.87 by deck, design effect 1.06, shrunk 0.53) vs mean 0.50, its colour pairs 0.53 (D377)
- Viscera Seer (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 183, picked 97, first line 34, in 2 deck(s); on colour in 51 pool(s), played in 2 (0.04, CI 0.01–0.13); won 0 of 2 decisive games (0.00, CI 0.00–0.67 by deck, design effect 1.06, shrunk 0.45) vs mean 0.50, its colour pairs 0.70 (D377); dead p 1.1e-7
- Winding Constrictor (AI:RemoveDeck:Random) — note-keep, the AI evidence alone says lean-dead: dealt 190, picked 67, first line 17, in 0 deck(s); on colour in 18 pool(s), played in 0 (0.00, CI 0.00–0.18); no decisive games in a deck; note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Ajani's Pridemate, Anax, Hardened in the Forge, Carrion Feeder, Charming Prince, Delver of Secrets, Dreadhorde Arcanist, Ephemerate, Fatal Push, Flickerwisp, Grumgully, the Generous, Hordeling Outburst, Juri, Master of the Revue, Knight of Autumn, Legion Warboss, Lonis, Cryptozoologist, March of Otherworldly Light, Mayhem Devil, Myr Sire, Pelt Collector, Prized Amalgam, Ram Through, Reckless Fireweaver, Satyr Wayfinder, Showdown of the Skalds, Soul-Scar Mage, Tidehollow Sculler, Ulvenwald Mysteries, Unsummon, Village Rites, Watcher for Tomorrow, Zulaport Cutthroat.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 6.72 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.99 (rating 98, CTRL SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.03 (rating 94.4, GY CTRL)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.87 (rating 69.2, ETB SPL)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.49 (rating 85.4, ART)
- Urza's Bauble (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.93 (rating 71.4, ART)
- Embercleave (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.67 (rating 54.1, ART)
- Tortured Existence (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.50 (rating 54, GY SAC)
- Nethergoyf (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.47 (rating 53.2, GY AGG)
- Manifold Key (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.22 (rating 53.8, ART)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UG | 58 | 145 | 0.35 | 0.28–0.43 | 0.37 |
| WU | 56 | 142 | 0.54 | 0.45–0.61 | 0.53 |
| WG | 36 | 83 | 0.73 | 0.63–0.82 | 0.69 |
| BG | 35 | 89 | 0.39 | 0.30–0.50 | 0.41 |
| WB | 34 | 84 | 0.73 | 0.62–0.81 | 0.68 |
| UR | 24 | 59 | 0.29 | 0.19–0.41 | 0.34 |
| UB | 22 | 50 | 0.34 | 0.22–0.48 | 0.39 |
| WR | 18 | 43 | 0.72 | 0.57–0.83 | 0.65 |
| BR | 6 | 16 | 0.44 | 0.23–0.67 | 0.47 |
| RG | 5 | 11 | 0.45 | 0.21–0.72 | 0.48 |

## Generation 5 — v2 → v2 (2026-10-16)

Discovery: 200 grid drafts, seeds 170000801–170001000, 347 decisive games; mean card win rate 0.50; 326 tests at a false-discovery rate of 0.1; design effect of a card's games 1.12; dominant-win against each card's colour pairs (D377).

Exploration (D356): 57 of 200 drafts explored, 88 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 143 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 200 drafts; 7 lead(s) to watch — about 1498 drafts per generation would find half of them. Run more drafts. 31 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Unburial Rites | lean-dominant | dealt 185, picked 84, first line 33, in 22 deck(s); on colour in 31 pool(s), played in 22 (0.71, CI 0.53–0.84); won 24 of 35 decisive games (0.69, CI 0.51–0.82 by deck, design effect 1.12, shrunk 0.62) vs mean 0.50, its colour pairs 0.51 (D377) | 706 |
| Anax, Hardened in the Forge | lean-dominant | dealt 179, picked 86, first line 28, in 8 deck(s); on colour in 32 pool(s), played in 8 (0.25, CI 0.13–0.42); won 10 of 16 decisive games (0.63, CI 0.37–0.82 by deck, design effect 1.12, shrunk 0.55) vs mean 0.50, its colour pairs 0.43 (D377) | 1121 |
| Flame Slash | lean-dead | dealt 182, picked 141, first line 74, in 10 deck(s); on colour in 41 pool(s), played in 10 (0.24, CI 0.14–0.39); won 9 of 19 decisive games (0.47, CI 0.26–0.69 by deck, design effect 1.12, shrunk 0.49) vs mean 0.50, its colour pairs 0.41 (D377) | 1161 |
| Legion Warboss | lean-dominant | dealt 184, picked 99, first line 32, in 11 deck(s); on colour in 30 pool(s), played in 11 (0.37, CI 0.22–0.55); won 11 of 19 decisive games (0.58, CI 0.35–0.78 by deck, design effect 1.12, shrunk 0.54) vs mean 0.50, its colour pairs 0.42 (D377) | 1498 |
| Kitesail Freebooter | lean-dominant | dealt 179, picked 88, first line 30, in 10 deck(s); on colour in 41 pool(s), played in 10 (0.24, CI 0.14–0.39); won 10 of 14 decisive games (0.71, CI 0.44–0.89 by deck, design effect 1.12, shrunk 0.59) vs mean 0.50, its colour pairs 0.58 (D377) | 2834 |
| Conclave Mentor | lean-dominant | dealt 187, picked 85, first line 26, in 2 deck(s); on colour in 19 pool(s), played in 2 (0.11, CI 0.03–0.31); won 2 of 2 decisive games (1.00, CI 0.32–1.00 by deck, design effect 1.12, shrunk 0.54) vs mean 0.50, its colour pairs 0.68 (D377) | 2960 |
| Zulaport Cutthroat | lean-dominant | dealt 173, picked 62, first line 19, in 2 deck(s); on colour in 25 pool(s), played in 2 (0.08, CI 0.02–0.25); won 2 of 3 decisive games (0.67, CI 0.19–0.94 by deck, design effect 1.12, shrunk 0.52) vs mean 0.50, its colour pairs 0.46 (D377) | 5634 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Beast Within (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 187, picked 97, first line 33, in 6 deck(s); on colour in 66 pool(s), played in 6 (0.09, CI 0.04–0.18); won 2 of 8 decisive games (0.25, CI 0.07–0.61 by deck, design effect 1.12, shrunk 0.43) vs mean 0.50, its colour pairs 0.49 (D377); dead p 1.2e-6
- Chromatic Star (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says lean-dead: dealt 175, picked 145, first line 77, in 46 deck(s); on colour in 145 pool(s), played in 46 (0.32, CI 0.25–0.40); won 46 of 90 decisive games (0.51, CI 0.40–0.62 by deck, design effect 1.12, shrunk 0.51) vs mean 0.50, its colour pairs 0.57 (D377)
- Faithless Looting (AI:RemoveDeck:All) — ai-limited: dealt 186, picked 170, first line 113, in 48 deck(s); on colour in 48 pool(s), played in 48 (1.00, CI 0.93–1.00); won 40 of 87 decisive games (0.46, CI 0.35–0.57 by deck, design effect 1.12, shrunk 0.47) vs mean 0.50, its colour pairs 0.44 (D377)
- Goblin Bombardment (AI:RemoveDeck:All) — ai-limited: dealt 174, picked 149, first line 83, in 47 deck(s); on colour in 48 pool(s), played in 47 (0.98, CI 0.89–1.00); won 36 of 85 decisive games (0.42, CI 0.32–0.54 by deck, design effect 1.12, shrunk 0.44) vs mean 0.50, its colour pairs 0.44 (D377)
- Hardened Scales (AI:RemoveDeck:Random) — note-keep: dealt 185, picked 145, first line 77, in 71 deck(s); on colour in 95 pool(s), played in 71 (0.75, CI 0.65–0.82); won 60 of 115 decisive games (0.52, CI 0.43–0.62 by deck, design effect 1.12, shrunk 0.52) vs mean 0.50, its colour pairs 0.48 (D377); note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.
- Ichor Wellspring (AI:RemoveDeck:Random) — ai-limited: dealt 170, picked 146, first line 95, in 146 deck(s); on colour in 146 pool(s), played in 146 (1.00, CI 0.97–1.00); won 134 of 250 decisive games (0.54, CI 0.47–0.60 by deck, design effect 1.12, shrunk 0.53) vs mean 0.50, its colour pairs 0.53 (D377)
- Intangible Virtue (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 182, picked 72, first line 21, in 0 deck(s); on colour in 44 pool(s), played in 0 (0.00, CI 0.00–0.08); no decisive games in a deck; dead p 5.9e-9
- Lotus Petal (AI:RemoveDeck:Random) — ai-limited: dealt 173, picked 173, first line 152, in 173 deck(s); on colour in 173 pool(s), played in 173 (1.00, CI 0.98–1.00); won 141 of 301 decisive games (0.47, CI 0.41–0.53 by deck, design effect 1.12, shrunk 0.47) vs mean 0.50, its colour pairs 0.50 (D377)
- Mishra's Bauble (AI:RemoveDeck:All) — ai-limited: dealt 179, picked 160, first line 85, in 156 deck(s); on colour in 160 pool(s), played in 156 (0.97, CI 0.94–0.99); won 120 of 263 decisive games (0.46, CI 0.39–0.52 by deck, design effect 1.12, shrunk 0.46) vs mean 0.50, its colour pairs 0.49 (D377)
- Prismatic Ending (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 182, picked 104, first line 42, in 9 deck(s); on colour in 72 pool(s), played in 9 (0.13, CI 0.07–0.22); won 11 of 17 decisive games (0.65, CI 0.40–0.83 by deck, design effect 1.12, shrunk 0.57) vs mean 0.50, its colour pairs 0.62 (D377); dead p 1.5e-5
- Prophetic Prism (AI:RemoveDeck:All) — ai-limited: dealt 177, picked 169, first line 142, in 169 deck(s); on colour in 169 pool(s), played in 169 (1.00, CI 0.98–1.00); won 132 of 290 decisive games (0.46, CI 0.40–0.52 by deck, design effect 1.12, shrunk 0.46) vs mean 0.50, its colour pairs 0.48 (D377)
- Soulherder (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dominant: dealt 182, picked 74, first line 21, in 2 deck(s); on colour in 23 pool(s), played in 2 (0.09, CI 0.02–0.27); won 2 of 3 decisive games (0.67, CI 0.19–0.94 by deck, design effect 1.12, shrunk 0.52) vs mean 0.50, its colour pairs 0.53 (D377)
- Viscera Seer (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 185, picked 90, first line 29, in 0 deck(s); on colour in 46 pool(s), played in 0 (0.00, CI 0.00–0.08); no decisive games in a deck; dead p 2.5e-9
- Winding Constrictor (AI:RemoveDeck:Random) — note-keep, the AI evidence alone says lean-dead: dealt 176, picked 69, first line 12, in 1 deck(s); on colour in 7 pool(s), played in 1 (0.14, CI 0.03–0.51); no decisive games in a deck; note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Ajani's Pridemate, Carrion Feeder, Charming Prince, Delver of Secrets, Dreadhorde Arcanist, Ephemerate, Experimental Synthesizer, Fatal Push, Flickerwisp, Grumgully, the Generous, Hanweir Garrison, Hordeling Outburst, Juri, Master of the Revue, Kari Zev, Skyship Raider, Knight of Autumn, Lonis, Cryptozoologist, March of Otherworldly Light, Mayhem Devil, Myr Sire, Pelt Collector, Prized Amalgam, Ram Through, Reckless Fireweaver, Reflector Mage, Satyr Wayfinder, Soul-Scar Mage, Tidehollow Sculler, Ulvenwald Mysteries, Unsummon, Village Rites, Watcher for Tomorrow.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 6.90 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 6.17 (rating 98, CTRL SPL)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.02 (rating 69.2, ETB SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.89 (rating 94.4, GY CTRL)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.42 (rating 85.4, ART)
- Embercleave (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.12 (rating 54.1, ART)
- Urza's Bauble (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.86 (rating 71.4, ART)
- Goblin Welder (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.63 (rating 35.6, ART GY REAN)
- Tortured Existence (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.53 (rating 54, GY SAC)
- Nethergoyf (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.50 (rating 53.2, GY AGG)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UG | 55 | 132 | 0.33 | 0.25–0.41 | 0.35 |
| WU | 54 | 135 | 0.53 | 0.45–0.61 | 0.53 |
| WG | 48 | 112 | 0.72 | 0.63–0.80 | 0.69 |
| UB | 29 | 65 | 0.34 | 0.23–0.46 | 0.38 |
| WB | 26 | 63 | 0.70 | 0.58–0.80 | 0.65 |
| UR | 25 | 62 | 0.23 | 0.14–0.34 | 0.29 |
| BG | 20 | 53 | 0.53 | 0.40–0.66 | 0.52 |
| WR | 13 | 29 | 0.69 | 0.51–0.83 | 0.61 |
| BR | 8 | 22 | 0.45 | 0.27–0.65 | 0.48 |
| RG | 8 | 21 | 0.62 | 0.41–0.79 | 0.56 |

## Generation 6 — v2 → v2 (2026-10-16)

Discovery: 200 grid drafts, seeds 170001001–170001200, 317 decisive games; mean card win rate 0.50; 329 tests at a false-discovery rate of 0.1; design effect of a card's games 1.20; dominant-win against each card's colour pairs (D377).

Exploration (D356): 67 of 200 drafts explored, 105 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 133 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 200 drafts; 8 lead(s) to watch — about 746 drafts per generation would find half of them. Run more drafts. 32 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Battle Screech | lean-dominant | dealt 177, picked 147, first line 77, in 94 deck(s); on colour in 96 pool(s), played in 94 (0.98, CI 0.93–0.99); won 105 of 145 decisive games (0.72, CI 0.64–0.80 by deck, design effect 1.20, shrunk 0.70) vs mean 0.50, its colour pairs 0.53 (D377) | 208 |
| Smuggler's Copter | lean-dominant | dealt 181, picked 135, first line 57, in 104 deck(s); on colour in 135 pool(s), played in 104 (0.77, CI 0.69–0.83); won 106 of 161 decisive games (0.66, CI 0.57–0.73 by deck, design effect 1.20, shrunk 0.64) vs mean 0.50, its colour pairs 0.52 (D377) | 308 |
| Elspeth, Sun's Champion | lean-dominant | dealt 180, picked 157, first line 96, in 107 deck(s); on colour in 110 pool(s), played in 107 (0.97, CI 0.92–0.99); won 107 of 157 decisive games (0.68, CI 0.60–0.76 by deck, design effect 1.20, shrunk 0.66) vs mean 0.50, its colour pairs 0.55 (D377) | 475 |
| Flickerwisp | lean-dominant | dealt 177, picked 75, first line 29, in 12 deck(s); on colour in 48 pool(s), played in 12 (0.25, CI 0.15–0.39); won 21 of 26 decisive games (0.81, CI 0.60–0.92 by deck, design effect 1.20, shrunk 0.67) vs mean 0.50, its colour pairs 0.56 (D377) | 483 |
| Seasoned Pyromancer | lean-dominant | dealt 184, picked 110, first line 42, in 36 deck(s); on colour in 37 pool(s), played in 36 (0.97, CI 0.86–0.99); won 35 of 60 decisive games (0.58, CI 0.45–0.71 by deck, design effect 1.20, shrunk 0.56) vs mean 0.50, its colour pairs 0.43 (D377) | 746 |
| Lightning Helix | lean-dominant | dealt 179, picked 145, first line 74, in 14 deck(s); on colour in 14 pool(s), played in 14 (1.00, CI 0.79–1.00); won 18 of 26 decisive games (0.69, CI 0.48–0.84 by deck, design effect 1.20, shrunk 0.61) vs mean 0.50, its colour pairs 0.49 (D377) | 1097 |
| Lonis, Cryptozoologist | lean-dominant | dealt 183, picked 80, first line 15, in 2 deck(s); on colour in 20 pool(s), played in 2 (0.10, CI 0.03–0.30); won 2 of 2 decisive games (1.00, CI 0.30–1.00 by deck, design effect 1.20, shrunk 0.54) vs mean 0.50, its colour pairs 0.37 (D377) | 2000 |
| Knight of Autumn | lean-dominant | dealt 176, picked 66, first line 23, in 1 deck(s); on colour in 15 pool(s), played in 1 (0.07, CI 0.01–0.30); won 2 of 2 decisive games (1.00, CI 0.30–1.00 by deck, design effect 1.20, shrunk 0.54) vs mean 0.50, its colour pairs 0.60 (D377) | 2196 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Beast Within (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 179, picked 88, first line 36, in 5 deck(s); on colour in 54 pool(s), played in 5 (0.09, CI 0.04–0.20); won 3 of 7 decisive games (0.43, CI 0.14–0.77 by deck, design effect 1.20, shrunk 0.48) vs mean 0.50, its colour pairs 0.51 (D377); dead p 1.4e-5
- Chromatic Star (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says lean-dead: dealt 176, picked 146, first line 86, in 46 deck(s); on colour in 146 pool(s), played in 46 (0.32, CI 0.24–0.39); won 45 of 82 decisive games (0.55, CI 0.43–0.66 by deck, design effect 1.20, shrunk 0.54) vs mean 0.50, its colour pairs 0.54 (D377)
- Faithless Looting (AI:RemoveDeck:All) — ai-limited: dealt 186, picked 168, first line 116, in 47 deck(s); on colour in 47 pool(s), played in 47 (1.00, CI 0.92–1.00); won 28 of 82 decisive games (0.34, CI 0.24–0.46 by deck, design effect 1.20, shrunk 0.37) vs mean 0.50, its colour pairs 0.51 (D377)
- Goblin Bombardment (AI:RemoveDeck:All) — ai-limited: dealt 183, picked 153, first line 89, in 42 deck(s); on colour in 44 pool(s), played in 42 (0.95, CI 0.85–0.99); won 35 of 64 decisive games (0.55, CI 0.41–0.67 by deck, design effect 1.20, shrunk 0.54) vs mean 0.50, its colour pairs 0.44 (D377)
- Hardened Scales (AI:RemoveDeck:Random) — note-keep: dealt 184, picked 132, first line 70, in 55 deck(s); on colour in 72 pool(s), played in 55 (0.76, CI 0.65–0.85); won 35 of 78 decisive games (0.45, CI 0.33–0.57 by deck, design effect 1.20, shrunk 0.46) vs mean 0.50, its colour pairs 0.51 (D377); note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.
- Ichor Wellspring (AI:RemoveDeck:Random) — ai-limited: dealt 175, picked 147, first line 89, in 147 deck(s); on colour in 147 pool(s), played in 147 (1.00, CI 0.97–1.00); won 102 of 223 decisive games (0.46, CI 0.39–0.53 by deck, design effect 1.20, shrunk 0.46) vs mean 0.50, its colour pairs 0.50 (D377)
- Intangible Virtue (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 182, picked 59, first line 16, in 1 deck(s); on colour in 39 pool(s), played in 1 (0.03, CI 0.01–0.13); won 2 of 2 decisive games (1.00, CI 0.30–1.00 by deck, design effect 1.20, shrunk 0.54) vs mean 0.50, its colour pairs 0.59 (D377); dead p 1.1e-6
- Lotus Petal (AI:RemoveDeck:Random) — ai-limited: dealt 181, picked 179, first line 153, in 179 deck(s); on colour in 179 pool(s), played in 179 (1.00, CI 0.98–1.00); won 153 of 280 decisive games (0.55, CI 0.48–0.61 by deck, design effect 1.20, shrunk 0.54) vs mean 0.50, its colour pairs 0.51 (D377)
- Mishra's Bauble (AI:RemoveDeck:All) — ai-limited: dealt 181, picked 159, first line 86, in 155 deck(s); on colour in 159 pool(s), played in 155 (0.97, CI 0.94–0.99); won 115 of 249 decisive games (0.46, CI 0.40–0.53 by deck, design effect 1.20, shrunk 0.46) vs mean 0.50, its colour pairs 0.50 (D377)
- Prismatic Ending (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 183, picked 98, first line 37, in 8 deck(s); on colour in 58 pool(s), played in 8 (0.14, CI 0.07–0.25); won 12 of 16 decisive games (0.75, CI 0.48–0.91 by deck, design effect 1.20, shrunk 0.61) vs mean 0.50, its colour pairs 0.59 (D377); dead p 2.6e-4
- Prophetic Prism (AI:RemoveDeck:All) — ai-limited: dealt 183, picked 178, first line 149, in 178 deck(s); on colour in 178 pool(s), played in 178 (1.00, CI 0.98–1.00); won 128 of 283 decisive games (0.45, CI 0.39–0.52 by deck, design effect 1.20, shrunk 0.46) vs mean 0.50, its colour pairs 0.51 (D377)
- Soulherder (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dead: dealt 179, picked 67, first line 20, in 1 deck(s); on colour in 19 pool(s), played in 1 (0.05, CI 0.01–0.25); won 0 of 2 decisive games (0.00, CI 0.00–0.70 by deck, design effect 1.20, shrunk 0.45) vs mean 0.50, its colour pairs 0.59 (D377)
- Viscera Seer (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 180, picked 86, first line 27, in 1 deck(s); on colour in 45 pool(s), played in 1 (0.02, CI 0.00–0.12); won 1 of 3 decisive games (0.33, CI 0.05–0.81 by deck, design effect 1.20, shrunk 0.48) vs mean 0.50, its colour pairs 0.54 (D377); dead p 9.6e-8
- Winding Constrictor (AI:RemoveDeck:Random) — note-keep, the AI evidence alone says dead: dealt 182, picked 72, first line 18, in 0 deck(s); on colour in 19 pool(s), played in 0 (0.00, CI 0.00–0.17); no decisive games in a deck; dead p 2.8e-4; note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Ajani's Pridemate, Anax, Hardened in the Forge, Bloodghast, Carrion Feeder, Charming Prince, Conclave Mentor, Delver of Secrets, Dreadhorde Arcanist, Ephemerate, Fatal Push, Grumgully, the Generous, Hanweir Garrison, Hordeling Outburst, Juri, Master of the Revue, Kari Zev, Skyship Raider, Kitesail Freebooter, March of Otherworldly Light, Mayhem Devil, Myr Sire, Pelt Collector, Prized Amalgam, Ram Through, Reckless Fireweaver, Reflector Mage, Satyr Wayfinder, Soul-Scar Mage, Tidehollow Sculler, Ulvenwald Mysteries, Unsummon, Village Rites, Watcher for Tomorrow, Zulaport Cutthroat.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 6.25 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.51 (rating 98, CTRL SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.64 (rating 94.4, GY CTRL)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.36 (rating 69.2, ETB SPL)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.71 (rating 85.4, ART)
- Embercleave (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.17 (rating 54.1, ART)
- Urza's Bauble (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.15 (rating 71.4, ART)
- Tortured Existence (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.83 (rating 54, GY SAC)
- Nethergoyf (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.75 (rating 53.2, GY AGG)
- Goblin Welder (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.47 (rating 35.6, ART GY REAN)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| WU | 55 | 130 | 0.60 | 0.51–0.68 | 0.59 |
| UG | 49 | 114 | 0.36 | 0.28–0.45 | 0.38 |
| WG | 33 | 80 | 0.64 | 0.53–0.73 | 0.61 |
| UB | 31 | 73 | 0.34 | 0.24–0.46 | 0.38 |
| WB | 25 | 59 | 0.64 | 0.52–0.75 | 0.61 |
| BG | 22 | 54 | 0.54 | 0.41–0.66 | 0.53 |
| WR | 18 | 43 | 0.60 | 0.46–0.74 | 0.57 |
| UR | 15 | 36 | 0.31 | 0.18–0.47 | 0.37 |
| BR | 11 | 29 | 0.38 | 0.23–0.56 | 0.43 |
| RG | 7 | 16 | 0.44 | 0.23–0.67 | 0.47 |

## Generation 7 — v2 → v2 (2026-10-16)

Discovery: 200 grid drafts, seeds 170001201–170001400, 337 decisive games; mean card win rate 0.50; 328 tests at a false-discovery rate of 0.1; design effect of a card's games 1.20; dominant-win against each card's colour pairs (D377).

Exploration (D356): 58 of 200 drafts explored, 89 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 142 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 200 drafts; 9 lead(s) to watch — about 1226 drafts per generation would find half of them. Run more drafts. 33 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Luminarch Aspirant | lean-dominant | dealt 174, picked 162, first line 115, in 118 deck(s); on colour in 118 pool(s), played in 118 (1.00, CI 0.97–1.00); won 142 of 205 decisive games (0.69, CI 0.62–0.76 by deck, design effect 1.20, shrunk 0.68) vs mean 0.50, its colour pairs 0.54 (D377) | 318 |
| Lunarch Veteran | lean-dominant | dealt 178, picked 136, first line 76, in 71 deck(s); on colour in 79 pool(s), played in 71 (0.90, CI 0.81–0.95); won 83 of 116 decisive games (0.72, CI 0.62–0.80 by deck, design effect 1.20, shrunk 0.68) vs mean 0.50, its colour pairs 0.55 (D377) | 345 |
| Unburial Rites | lean-dominant | dealt 175, picked 89, first line 33, in 25 deck(s); on colour in 50 pool(s), played in 25 (0.50, CI 0.37–0.63); won 31 of 51 decisive games (0.61, CI 0.46–0.74 by deck, design effect 1.20, shrunk 0.58) vs mean 0.50, its colour pairs 0.47 (D377) | 886 |
| Woe Strider | lean-dominant | dealt 188, picked 113, first line 45, in 42 deck(s); on colour in 60 pool(s), played in 42 (0.70, CI 0.57–0.80); won 41 of 69 decisive games (0.59, CI 0.47–0.71 by deck, design effect 1.20, shrunk 0.57) vs mean 0.50, its colour pairs 0.47 (D377) | 940 |
| Chandra, Torch of Defiance | lean-dominant | dealt 176, picked 89, first line 36, in 20 deck(s); on colour in 31 pool(s), played in 20 (0.65, CI 0.47–0.79); won 18 of 33 decisive games (0.55, CI 0.36–0.71 by deck, design effect 1.20, shrunk 0.53) vs mean 0.50, its colour pairs 0.40 (D377) | 1226 |
| Ulvenwald Mysteries | lean-dominant | dealt 185, picked 90, first line 32, in 10 deck(s); on colour in 51 pool(s), played in 10 (0.20, CI 0.11–0.33); won 10 of 15 decisive games (0.67, CI 0.40–0.86 by deck, design effect 1.20, shrunk 0.57) vs mean 0.50, its colour pairs 0.49 (D377) | 1538 |
| Legion Warboss | lean-dominant | dealt 185, picked 84, first line 27, in 12 deck(s); on colour in 25 pool(s), played in 12 (0.48, CI 0.30–0.67); won 12 of 22 decisive games (0.55, CI 0.33–0.74 by deck, design effect 1.20, shrunk 0.52) vs mean 0.50, its colour pairs 0.40 (D377) | 1747 |
| Hanweir Garrison | lean-dominant | dealt 183, picked 85, first line 28, in 1 deck(s); on colour in 22 pool(s), played in 1 (0.05, CI 0.01–0.22); won 2 of 2 decisive games (1.00, CI 0.30–1.00 by deck, design effect 1.20, shrunk 0.54) vs mean 0.50, its colour pairs 0.34 (D377) | 2000 |
| Conclave Mentor | lean-dominant | dealt 176, picked 74, first line 20, in 1 deck(s); on colour in 9 pool(s), played in 1 (0.11, CI 0.02–0.43); won 2 of 2 decisive games (1.00, CI 0.30–1.00 by deck, design effect 1.20, shrunk 0.54) vs mean 0.50, its colour pairs 0.65 (D377) | 2815 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Beast Within (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says lean-dominant: dealt 179, picked 89, first line 26, in 7 deck(s); on colour in 52 pool(s), played in 7 (0.13, CI 0.07–0.25); won 6 of 10 decisive games (0.60, CI 0.29–0.85 by deck, design effect 1.20, shrunk 0.53) vs mean 0.50, its colour pairs 0.46 (D377)
- Chromatic Star (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says lean-dead: dealt 181, picked 139, first line 78, in 40 deck(s); on colour in 139 pool(s), played in 40 (0.29, CI 0.22–0.37); won 25 of 60 decisive games (0.42, CI 0.29–0.56 by deck, design effect 1.20, shrunk 0.44) vs mean 0.50, its colour pairs 0.52 (D377)
- Faithless Looting (AI:RemoveDeck:All) — ai-limited: dealt 181, picked 167, first line 105, in 51 deck(s); on colour in 51 pool(s), played in 51 (1.00, CI 0.93–1.00); won 33 of 82 decisive games (0.40, CI 0.29–0.52 by deck, design effect 1.20, shrunk 0.42) vs mean 0.50, its colour pairs 0.45 (D377)
- Goblin Bombardment (AI:RemoveDeck:All) — ai-limited: dealt 174, picked 143, first line 79, in 37 deck(s); on colour in 38 pool(s), played in 37 (0.97, CI 0.86–0.99); won 30 of 64 decisive games (0.47, CI 0.34–0.60 by deck, design effect 1.20, shrunk 0.48) vs mean 0.50, its colour pairs 0.44 (D377)
- Hardened Scales (AI:RemoveDeck:Random) — note-keep: dealt 190, picked 148, first line 74, in 64 deck(s); on colour in 80 pool(s), played in 64 (0.80, CI 0.70–0.87); won 56 of 115 decisive games (0.49, CI 0.39–0.59 by deck, design effect 1.20, shrunk 0.49) vs mean 0.50, its colour pairs 0.50 (D377); note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.
- Ichor Wellspring (AI:RemoveDeck:Random) — ai-limited: dealt 173, picked 154, first line 107, in 154 deck(s); on colour in 154 pool(s), played in 154 (1.00, CI 0.98–1.00); won 140 of 263 decisive games (0.53, CI 0.47–0.60 by deck, design effect 1.20, shrunk 0.53) vs mean 0.50, its colour pairs 0.52 (D377)
- Intangible Virtue (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 179, picked 75, first line 17, in 0 deck(s); on colour in 46 pool(s), played in 0 (0.00, CI 0.00–0.08); no decisive games in a deck; dead p 2.5e-9
- Lotus Petal (AI:RemoveDeck:Random) — ai-limited: dealt 182, picked 179, first line 153, in 179 deck(s); on colour in 179 pool(s), played in 179 (1.00, CI 0.98–1.00); won 148 of 308 decisive games (0.48, CI 0.42–0.54 by deck, design effect 1.20, shrunk 0.48) vs mean 0.50, its colour pairs 0.50 (D377)
- Mishra's Bauble (AI:RemoveDeck:All) — ai-limited: dealt 175, picked 159, first line 88, in 150 deck(s); on colour in 159 pool(s), played in 150 (0.94, CI 0.90–0.97); won 130 of 264 decisive games (0.49, CI 0.43–0.56 by deck, design effect 1.20, shrunk 0.49) vs mean 0.50, its colour pairs 0.51 (D377)
- Prismatic Ending (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 176, picked 100, first line 40, in 9 deck(s); on colour in 70 pool(s), played in 9 (0.13, CI 0.07–0.23); won 7 of 9 decisive games (0.78, CI 0.42–0.94 by deck, design effect 1.20, shrunk 0.59) vs mean 0.50, its colour pairs 0.58 (D377); dead p 2.7e-5
- Prophetic Prism (AI:RemoveDeck:All) — ai-limited: dealt 183, picked 178, first line 150, in 178 deck(s); on colour in 178 pool(s), played in 178 (1.00, CI 0.98–1.00); won 141 of 301 decisive games (0.47, CI 0.41–0.53 by deck, design effect 1.20, shrunk 0.47) vs mean 0.50, its colour pairs 0.51 (D377)
- Soulherder (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dominant: dealt 182, picked 72, first line 26, in 3 deck(s); on colour in 26 pool(s), played in 3 (0.12, CI 0.04–0.29); won 4 of 6 decisive games (0.67, CI 0.28–0.91 by deck, design effect 1.20, shrunk 0.54) vs mean 0.50, its colour pairs 0.52 (D377)
- Viscera Seer (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 180, picked 84, first line 37, in 0 deck(s); on colour in 44 pool(s), played in 0 (0.00, CI 0.00–0.08); no decisive games in a deck; dead p 5.9e-9
- Winding Constrictor (AI:RemoveDeck:Random) — note-keep, the AI evidence alone says lean-dead: dealt 179, picked 71, first line 21, in 0 deck(s); on colour in 13 pool(s), played in 0 (0.00, CI 0.00–0.23); no decisive games in a deck; note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Ajani's Pridemate, Anax, Hardened in the Forge, Carrion Feeder, Charming Prince, Delver of Secrets, Dreadhorde Arcanist, Ephemerate, Experimental Synthesizer, Fatal Push, Flickerwisp, Grumgully, the Generous, Hordeling Outburst, Juri, Master of the Revue, Kari Zev, Skyship Raider, Kitesail Freebooter, Knight of Autumn, Lonis, Cryptozoologist, March of Otherworldly Light, Mayhem Devil, Myr Sire, Pelt Collector, Prized Amalgam, Ram Through, Reckless Fireweaver, Reflector Mage, Satyr Wayfinder, Showdown of the Skalds, Soul-Scar Mage, Tidehollow Sculler, Unsummon, Village Rites, Watcher for Tomorrow, Zulaport Cutthroat.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 6.72 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.98 (rating 98, CTRL SPL)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.15 (rating 69.2, ETB SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.95 (rating 94.4, GY CTRL)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.42 (rating 85.4, ART)
- Embercleave (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.31 (rating 54.1, ART)
- Urza's Bauble (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.86 (rating 71.4, ART)
- Goblin Welder (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.85 (rating 35.6, ART GY REAN)
- Tortured Existence (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.59 (rating 54, GY SAC)
- Nethergoyf (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.56 (rating 53.2, GY AGG)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UG | 48 | 115 | 0.34 | 0.26–0.43 | 0.36 |
| WU | 47 | 112 | 0.54 | 0.44–0.63 | 0.53 |
| WG | 38 | 91 | 0.69 | 0.59–0.78 | 0.66 |
| WB | 36 | 87 | 0.69 | 0.59–0.78 | 0.65 |
| UB | 32 | 76 | 0.41 | 0.30–0.52 | 0.43 |
| UR | 32 | 73 | 0.32 | 0.22–0.43 | 0.35 |
| BG | 23 | 57 | 0.49 | 0.37–0.62 | 0.49 |
| BR | 11 | 23 | 0.43 | 0.26–0.63 | 0.46 |
| WR | 11 | 26 | 0.69 | 0.50–0.83 | 0.61 |
| RG | 6 | 14 | 0.36 | 0.16–0.61 | 0.44 |

## Generation 8 — v2 → v2 (2026-10-16)

Discovery: 200 grid drafts, seeds 170001401–170001600, 308 decisive games; mean card win rate 0.50; 329 tests at a false-discovery rate of 0.1; design effect of a card's games 1.09; dominant-win against each card's colour pairs (D377).

Exploration (D356): 74 of 200 drafts explored, 114 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 126 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 200 drafts; 7 lead(s) to watch — about 792 drafts per generation would find half of them. Run more drafts. 32 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Adeline, Resplendent Cathar | lean-dominant | dealt 183, picked 159, first line 100, in 99 deck(s); on colour in 101 pool(s), played in 99 (0.98, CI 0.93–0.99); won 100 of 144 decisive games (0.69, CI 0.61–0.77 by deck, design effect 1.09, shrunk 0.67) vs mean 0.50, its colour pairs 0.55 (D377) | 361 |
| Yawgmoth, Thran Physician | lean-dominant | dealt 178, picked 126, first line 58, in 64 deck(s); on colour in 66 pool(s), played in 64 (0.97, CI 0.90–0.99); won 58 of 100 decisive games (0.58, CI 0.48–0.68 by deck, design effect 1.09, shrunk 0.57) vs mean 0.50, its colour pairs 0.44 (D377) | 557 |
| Kitesail Freebooter | lean-dominant | dealt 176, picked 91, first line 37, in 13 deck(s); on colour in 52 pool(s), played in 13 (0.25, CI 0.15–0.38); won 10 of 13 decisive games (0.77, CI 0.48–0.92 by deck, design effect 1.09, shrunk 0.61) vs mean 0.50, its colour pairs 0.47 (D377) | 572 |
| Soul Warden | lean-dominant | dealt 181, picked 123, first line 66, in 38 deck(s); on colour in 80 pool(s), played in 38 (0.47, CI 0.37–0.58); won 48 of 66 decisive games (0.73, CI 0.60–0.82 by deck, design effect 1.09, shrunk 0.67) vs mean 0.50, its colour pairs 0.61 (D377) | 792 |
| Flame Slash | lean-dead | dealt 175, picked 132, first line 63, in 9 deck(s); on colour in 33 pool(s), played in 9 (0.27, CI 0.15–0.44); won 3 of 11 decisive games (0.27, CI 0.09–0.58 by deck, design effect 1.09, shrunk 0.42) vs mean 0.50, its colour pairs 0.48 (D377) | 2716 |
| Conclave Mentor | lean-dominant | dealt 185, picked 78, first line 20, in 2 deck(s); on colour in 20 pool(s), played in 2 (0.10, CI 0.03–0.30); won 2 of 2 decisive games (1.00, CI 0.32–1.00 by deck, design effect 1.09, shrunk 0.54) vs mean 0.50, its colour pairs 0.70 (D377) | 3108 |
| Saheeli, Sublime Artificer | lean-dominant | dealt 177, picked 106, first line 49, in 15 deck(s); on colour in 18 pool(s), played in 15 (0.83, CI 0.61–0.94); won 11 of 20 decisive games (0.55, CI 0.33–0.75 by deck, design effect 1.09, shrunk 0.52) vs mean 0.50, its colour pairs 0.43 (D377) | 3157 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Beast Within (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says lean-dead: dealt 185, picked 84, first line 19, in 10 deck(s); on colour in 55 pool(s), played in 10 (0.18, CI 0.10–0.30); won 5 of 15 decisive games (0.33, CI 0.15–0.59 by deck, design effect 1.09, shrunk 0.43) vs mean 0.50, its colour pairs 0.43 (D377)
- Chromatic Star (AI:RemoveDeck:All) — ai-limited: dealt 182, picked 134, first line 68, in 49 deck(s); on colour in 134 pool(s), played in 49 (0.37, CI 0.29–0.45); won 41 of 87 decisive games (0.47, CI 0.37–0.58 by deck, design effect 1.09, shrunk 0.48) vs mean 0.50, its colour pairs 0.52 (D377)
- Faithless Looting (AI:RemoveDeck:All) — ai-limited: dealt 185, picked 173, first line 108, in 54 deck(s); on colour in 54 pool(s), played in 54 (1.00, CI 0.93–1.00); won 32 of 66 decisive games (0.48, CI 0.36–0.61 by deck, design effect 1.09, shrunk 0.49) vs mean 0.50, its colour pairs 0.46 (D377)
- Goblin Bombardment (AI:RemoveDeck:All) — ai-limited: dealt 179, picked 151, first line 82, in 45 deck(s); on colour in 45 pool(s), played in 45 (1.00, CI 0.92–1.00); won 29 of 60 decisive games (0.48, CI 0.36–0.61 by deck, design effect 1.09, shrunk 0.49) vs mean 0.50, its colour pairs 0.48 (D377)
- Hardened Scales (AI:RemoveDeck:Random) — note-keep: dealt 190, picked 139, first line 74, in 66 deck(s); on colour in 83 pool(s), played in 66 (0.80, CI 0.70–0.87); won 50 of 97 decisive games (0.52, CI 0.41–0.62 by deck, design effect 1.09, shrunk 0.51) vs mean 0.50, its colour pairs 0.53 (D377); note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.
- Ichor Wellspring (AI:RemoveDeck:Random) — ai-limited: dealt 175, picked 153, first line 101, in 153 deck(s); on colour in 153 pool(s), played in 153 (1.00, CI 0.98–1.00); won 113 of 236 decisive games (0.48, CI 0.41–0.55 by deck, design effect 1.09, shrunk 0.48) vs mean 0.50, its colour pairs 0.50 (D377)
- Intangible Virtue (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 176, picked 74, first line 15, in 1 deck(s); on colour in 47 pool(s), played in 1 (0.02, CI 0.00–0.11); won 2 of 2 decisive games (1.00, CI 0.32–1.00 by deck, design effect 1.09, shrunk 0.54) vs mean 0.50, its colour pairs 0.52 (D377); dead p 4.2e-8
- Lotus Petal (AI:RemoveDeck:Random) — ai-limited: dealt 178, picked 174, first line 150, in 174 deck(s); on colour in 174 pool(s), played in 174 (1.00, CI 0.98–1.00); won 149 of 276 decisive games (0.54, CI 0.48–0.60 by deck, design effect 1.09, shrunk 0.54) vs mean 0.50, its colour pairs 0.50 (D377)
- Mishra's Bauble (AI:RemoveDeck:All) — ai-limited: dealt 181, picked 157, first line 102, in 151 deck(s); on colour in 157 pool(s), played in 151 (0.96, CI 0.92–0.98); won 96 of 234 decisive games (0.41, CI 0.35–0.48 by deck, design effect 1.09, shrunk 0.42) vs mean 0.50, its colour pairs 0.49 (D377)
- Prismatic Ending (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 185, picked 99, first line 42, in 9 deck(s); on colour in 63 pool(s), played in 9 (0.14, CI 0.08–0.25); won 10 of 20 decisive games (0.50, CI 0.29–0.71 by deck, design effect 1.09, shrunk 0.50) vs mean 0.50, its colour pairs 0.67 (D377); dead p 2.1e-4
- Prophetic Prism (AI:RemoveDeck:All) — ai-limited: dealt 182, picked 178, first line 149, in 178 deck(s); on colour in 178 pool(s), played in 178 (1.00, CI 0.98–1.00); won 132 of 278 decisive games (0.47, CI 0.41–0.54 by deck, design effect 1.09, shrunk 0.48) vs mean 0.50, its colour pairs 0.51 (D377)
- Soulherder (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dead: dealt 177, picked 77, first line 12, in 6 deck(s); on colour in 23 pool(s), played in 6 (0.26, CI 0.13–0.47); won 4 of 13 decisive games (0.31, CI 0.12–0.59 by deck, design effect 1.09, shrunk 0.42) vs mean 0.50, its colour pairs 0.55 (D377)
- Viscera Seer (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 187, picked 99, first line 38, in 1 deck(s); on colour in 47 pool(s), played in 1 (0.02, CI 0.00–0.11); won 0 of 2 decisive games (0.00, CI 0.00–0.68 by deck, design effect 1.09, shrunk 0.45) vs mean 0.50, its colour pairs 0.40 (D377); dead p 4.2e-8
- Winding Constrictor (AI:RemoveDeck:Random) — note-keep, the AI evidence alone says lean-dead: dealt 179, picked 66, first line 18, in 0 deck(s); on colour in 7 pool(s), played in 0 (0.00, CI 0.00–0.35); no decisive games in a deck; note: Synergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Ajani's Pridemate, Carrion Feeder, Charming Prince, Delver of Secrets, Dreadhorde Arcanist, Ephemerate, Experimental Synthesizer, Fatal Push, Flickerwisp, Grumgully, the Generous, Hanweir Garrison, Hordeling Outburst, Juri, Master of the Revue, Kari Zev, Skyship Raider, Knight of Autumn, Lonis, Cryptozoologist, March of Otherworldly Light, Mayhem Devil, Myr Sire, Pelt Collector, Prized Amalgam, Ram Through, Reckless Fireweaver, Reflector Mage, Satyr Wayfinder, Soul-Scar Mage, Tidehollow Sculler, Ulvenwald Mysteries, Unsummon, Village Rites, Watcher for Tomorrow, Zulaport Cutthroat.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.52 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.30 (rating 98, CTRL SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.48 (rating 94.4, GY CTRL)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.15 (rating 69.2, ETB SPL)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.96 (rating 85.4, ART)
- Urza's Bauble (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.40 (rating 71.4, ART)
- Embercleave (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.23 (rating 54.1, ART)
- Manifold Key (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.70 (rating 53.8, ART)
- Memory Jar (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.68 (rating 53.3, ART)
- Tortured Existence (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.54 (rating 54, GY SAC)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UG | 48 | 114 | 0.33 | 0.25–0.42 | 0.36 |
| WU | 46 | 114 | 0.53 | 0.43–0.62 | 0.52 |
| WG | 40 | 97 | 0.74 | 0.65–0.82 | 0.70 |
| UB | 27 | 67 | 0.36 | 0.25–0.48 | 0.39 |
| WB | 25 | 63 | 0.62 | 0.50–0.73 | 0.59 |
| BG | 23 | 54 | 0.48 | 0.35–0.61 | 0.49 |
| UR | 18 | 42 | 0.45 | 0.31–0.60 | 0.47 |
| BR | 11 | 28 | 0.46 | 0.29–0.64 | 0.48 |
| WR | 9 | 23 | 0.52 | 0.33–0.71 | 0.51 |
| RG | 5 | 14 | 0.36 | 0.16–0.61 | 0.44 |

