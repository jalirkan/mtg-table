# The Synergy Cube — version 2 (180 cards, two-player) — evolve changelog

Written by `tools/cubelab.sh evolve` (D299–D300, D331, D357). Each generation plays its drafts on the cube going in and swaps only what the evidence supports; docs/guides/cube-lab.md *Evolve* says how.

A card is cut on the AI's evidence only after two separate looks. **Discovery**: in this generation's drafts the card stands out by more than chance can explain, allowing for the fact that some 180 cards are looked at at once (a false-discovery rate of 10%: of the cards flagged, at most about one in 10 could be a fluke). A discovery is a *candidate*, not a verdict. **Confirmed**: the candidate stands out again, the same way, in a second batch of fresh drafts that played no part in finding it. Only confirmed cards are cut; a candidate that does not confirm stays, and is reported. Win rates count each deck's match as one clump of games (the same deck against the same opponent), so their intervals are wider than a count of games would make them.

## Low-rated cards, judged by exploration (D356)

The deckbuilder plays by rating, so a card rated under the rating-limited bar is rarely played and its "dead" signal says nothing. In 126 of 400 drafts (share 0.315, z 0.7 against the 0.3 asked), one such card that sat on colour in a pool was forced into the deck in place of the builder's lowest-rated choice of its mana value, at random with a recorded probability: 196 forced deck(s) against 205.0 expected (z -0.6). A card's *delta* compares the decks it was forced into with the decks where it could have been and was not, weighted by those probabilities, one deck's match as one unit: its win rate in place of the builder's choice. It **holds its own** when delta is shown above −0.1 (BH at 0.1), it is **weak when played** when delta is shown below 0. Neither verdict cuts a card: a weak one is for Justin's notes, a holding one for its rating. Every forced card pooled: delta +0.01 ± 0.06; choice-deck mean rating, forced minus not (a balance check, ~0): -0.06.

| Card | Rating-limited | Forced decks (games) | Expected | Win rate with it | Without | Delta (95% CI) | Verdict |
|---|---|---|---|---|---|---|---|
| Soulherder |  | 9 (21) | 5.7 | 0.49 | 1.00 | -0.51 (-0.69 to -0.33) | too few forced decks |
| Myr Sire | yes | 8 (19) | 10.5 | 0.28 | 0.45 | -0.17 (-0.41 to +0.07) | too few forced decks |
| Satyr Wayfinder | yes | 8 (17) | 4.7 | 0.57 | 0.33 | +0.24 (-0.07 to +0.55) | too few forced decks |
| Candy Trail |  | 7 (16) | 8.4 | 0.37 | 0.47 | -0.10 (-0.40 to +0.21) | too few forced decks |
| Lonis, Cryptozoologist | yes | 7 (16) | 7.6 | 0.32 | 0.29 | +0.03 (-0.33 to +0.39) | too few forced decks |
| March of Otherworldly Light | yes | 7 (18) | 7.6 | 0.71 | 0.61 | +0.10 (-0.07 to +0.28) | too few forced decks |
| Priest of Forgotten Gods |  | 7 (19) | 3.2 | 0.68 | 0.49 | +0.19 (-0.04 to +0.42) | too few forced decks |
| Ulvenwald Mysteries | yes | 7 (15) | 6.0 | 0.35 | 0.46 | -0.10 (-0.33 to +0.13) | too few forced decks |
| Unsummon | yes | 7 (17) | 6.6 | 0.53 | 0.53 | +0.00 (-0.33 to +0.33) | too few forced decks |
| Cranial Plating |  | 6 (13) | 5.1 | 0.47 | 0.54 | -0.06 (-0.44 to +0.31) | too few forced decks |
| Experimental Synthesizer | yes | 6 (12) | 2.7 | 0.45 | 0.28 | +0.18 (-0.22 to +0.58) | too few forced decks |
| Intangible Virtue |  | 6 (15) | 3.5 | 0.68 | 0.75 | -0.07 (-0.32 to +0.18) | too few forced decks |
| Ajani's Pridemate | yes | 5 (11) | 3.9 | 0.55 | 0.74 | -0.20 (-0.58 to +0.19) | too few forced decks |
| Ephemerate | yes | 5 (13) | 5.1 | 0.79 | 0.56 | +0.24 (+0.04 to +0.43) | too few forced decks |
| Flickerwisp | yes | 5 (12) | 6.1 | 0.68 | 0.61 | +0.07 (-0.26 to +0.40) | too few forced decks |
| Pelt Collector | yes | 5 (12) | 5.6 | 0.35 | 0.45 | -0.10 (-0.40 to +0.20) | too few forced decks |
| Unburial Rites |  | 5 (13) | 3.2 | 0.57 | 0.51 | +0.06 (-0.24 to +0.35) | too few forced decks |
| Conclave Mentor | yes | 4 (10) | 2.6 | 0.38 | 0.58 | -0.21 (-0.70 to +0.28) | too few forced decks |
| Knight of Autumn | yes | 4 (10) | 4.3 | 0.83 | 0.57 | +0.26 (-0.01 to +0.54) | too few forced decks |
| Persist |  | 4 (11) | 3.1 | 0.30 | 0.55 | -0.25 (-0.41 to -0.09) | too few forced decks |
| Reflector Mage | yes | 4 (11) | 6.3 | 0.59 | 0.83 | -0.23 (-0.50 to +0.03) | too few forced decks |
| Bloodghast | yes | 3 (7) | 3.1 | 0.48 | 0.59 | -0.11 (-0.67 to +0.44) | too few forced decks |
| Charming Prince | yes | 3 (8) | 5.6 | 0.71 | 0.56 | +0.15 (-0.16 to +0.45) | too few forced decks |
| Deep Forest Hermit |  | 3 (6) | 2.2 | 0.00 | 0.45 | -0.45 (-0.66 to -0.24) | too few forced decks |
| Fatal Push | yes | 3 (8) | 4.1 | 0.75 | 0.44 | +0.32 (+0.11 to +0.52) | too few forced decks |
| Grumgully, the Generous | yes | 3 (8) | 2.6 | 0.44 | 0.21 | +0.23 (-0.19 to +0.65) | too few forced decks |
| Hangarback Walker |  | 3 (6) | 2.6 | 0.67 | 0.61 | +0.06 (-0.51 to +0.63) | too few forced decks |
| Sai, Master Thopterist |  | 3 (8) | 2.8 | 0.54 | 0.50 | +0.04 (-0.36 to +0.43) | too few forced decks |
| Smuggler's Copter |  | 3 (9) | 3.6 | 0.42 | 0.51 | -0.09 (-0.30 to +0.13) | too few forced decks |
| Steel Overseer |  | 3 (7) | 5.4 | 0.63 | 0.59 | +0.04 (-0.33 to +0.41) | too few forced decks |
| Tidehollow Sculler | yes | 3 (9) | 4.1 | 0.67 | 0.81 | -0.14 (-0.30 to +0.02) | too few forced decks |
| Village Rites | yes | 3 (7) | 2.6 | 0.87 | 0.50 | +0.37 (+0.07 to +0.67) | too few forced decks |
| Watcher for Tomorrow | yes | 3 (8) | 4.9 | 0.50 | 0.56 | -0.06 (-0.40 to +0.27) | too few forced decks |
| Carrion Feeder | yes | 2 (5) | 3.1 | 0.71 | 0.47 | +0.25 (-0.22 to +0.72) | too few forced decks |
| Delver of Secrets | yes | 2 (5) | 3.7 | 0.40 | 0.54 | -0.14 (-0.60 to +0.33) | too few forced decks |
| Dreadhorde Arcanist | yes | 2 (4) | 1.8 | 0.00 | 0.53 | -0.53 (-0.79 to -0.27) | too few forced decks |
| Grist, the Hunger Tide |  | 2 (4) | 1.0 | 0.00 | 0.33 | -0.33 (-0.33 to -0.33) | too few forced decks |
| Kari Zev, Skyship Raider | yes | 2 (5) | 1.5 | 0.20 | 0.14 | +0.06 (-0.20 to +0.32) | too few forced decks |
| Kitesail Freebooter |  | 2 (4) | 3.0 | 0.00 | 0.60 | -0.60 (-0.75 to -0.46) | too few forced decks |
| Midnight Reaper |  | 2 (5) | 1.9 | 0.71 | 0.48 | +0.23 (-0.25 to +0.72) | too few forced decks |
| Ram Through | yes | 2 (5) | 3.0 | 0.26 | 0.40 | -0.14 (-0.34 to +0.06) | too few forced decks |
| Restoration Angel |  | 2 (5) | 3.5 | 0.87 | 0.74 | +0.12 (-0.14 to +0.39) | too few forced decks |
| Young Pyromancer |  | 2 (6) | 0.9 | 0.33 | 0.24 | +0.09 (-0.07 to +0.26) | too few forced decks |
| Anax, Hardened in the Forge | yes | 1 (3) | 2.1 | 0.33 | 0.26 | +0.07 (-0.11 to +0.26) | too few forced decks |
| Hanweir Garrison | yes | 1 (3) | 1.2 | 0.67 | 0.30 | +0.37 (+0.13 to +0.61) | too few forced decks |
| Juri, Master of the Revue | yes | 1 (3) | 0.7 | 0.67 | – | – (– to –) | too few forced decks |
| Legion Warboss | yes | 1 (3) | 1.8 | 0.67 | 0.31 | +0.35 (+0.18 to +0.53) | too few forced decks |
| Murmuring Mystic |  | 1 (2) | 1.2 | 1.00 | 0.60 | +0.40 (+0.16 to +0.64) | too few forced decks |
| Prized Amalgam | yes | 1 (3) | 1.2 | 0.33 | 0.44 | -0.10 (-0.52 to +0.31) | too few forced decks |
| Reckless Fireweaver | yes | 1 (3) | 1.1 | 0.33 | 0.19 | +0.14 (-0.16 to +0.44) | too few forced decks |
| Sakura-Tribe Elder |  | 1 (3) | 2.3 | 0.33 | 0.38 | -0.04 (-0.20 to +0.11) | too few forced decks |
| Solemn Simulacrum |  | 1 (2) | 0.1 | 1.00 | – | – (– to –) | too few forced decks |
| Soul-Scar Mage | yes | 1 (3) | 1.3 | 0.33 | 0.16 | +0.17 (-0.01 to +0.36) | too few forced decks |
| Thieving Skydiver |  | 1 (2) | 1.5 | 1.00 | 0.58 | +0.42 (+0.18 to +0.66) | too few forced decks |
| Winding Constrictor |  | 1 (3) | 1.3 | 0.33 | 0.00 | +0.33 (+0.33 to +0.33) | too few forced decks |
| Woe Strider |  | 1 (2) | 1.0 | 1.00 | 0.60 | +0.40 (+0.06 to +0.73) | too few forced decks |
| Zulaport Cutthroat | yes | 1 (2) | 3.2 | 1.00 | 0.58 | +0.42 (+0.28 to +0.57) | too few forced decks |
| Chandra, Torch of Defiance |  | 0 (0) | 0.3 | – | 0.19 | – (– to –) | too few forced decks |
| Emry, Lurker of the Loch |  | 0 (0) | 1.1 | – | 0.35 | – (– to –) | too few forced decks |
| Hordeling Outburst | yes | 0 (0) | 2.1 | – | 0.30 | – (– to –) | too few forced decks |
| Karn, Scion of Urza |  | 0 (0) | 0.2 | – | 0.20 | – (– to –) | too few forced decks |
| Marionette Master |  | 0 (0) | 0.7 | – | 0.64 | – (– to –) | too few forced decks |
| Mayhem Devil | yes | 0 (0) | 0.4 | – | 0.00 | – (– to –) | too few forced decks |
| Pia Nalaar |  | 0 (0) | 0.3 | – | 0.50 | – (– to –) | too few forced decks |
| Reveillark |  | 0 (0) | 0.4 | – | 0.79 | – (– to –) | too few forced decks |
| Scute Swarm |  | 0 (0) | 0.9 | – | 0.32 | – (– to –) | too few forced decks |

## Generation 1 — v2 → v2 (2026-10-16)

Discovery: 200 grid drafts, seeds 186000001–186000200, 329 decisive games; mean card win rate 0.50; 329 tests at a false-discovery rate of 0.1; design effect of a card's games 1.10; dominant-win against each card's colour pairs (D377).

Exploration (D356): 65 of 200 drafts explored, 104 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 135 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 200 drafts; 8 lead(s) to watch — about 2179 drafts per generation would find half of them. Run more drafts. 33 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Skyclave Apparition | lean-dominant | dealt 171, picked 149, first line 87, in 93 deck(s); on colour in 101 pool(s), played in 93 (0.92, CI 0.85–0.96); won 112 of 159 decisive games (0.70, CI 0.63–0.77 by deck, design effect 1.10, shrunk 0.68) vs mean 0.50, its colour pairs 0.56 (D377) | 362 |
| Elspeth, Sun's Champion | lean-dominant | dealt 181, picked 155, first line 94, in 106 deck(s); on colour in 110 pool(s), played in 106 (0.96, CI 0.91–0.99); won 134 of 194 decisive games (0.69, CI 0.62–0.75 by deck, design effect 1.10, shrunk 0.67) vs mean 0.50, its colour pairs 0.56 (D377) | 457 |
| Showdown of the Skalds | lean-dominant | dealt 173, picked 63, first line 21, in 4 deck(s); on colour in 7 pool(s), played in 4 (0.57, CI 0.25–0.84); won 6 of 6 decisive games (1.00, CI 0.59–1.00 by deck, design effect 1.10, shrunk 0.61) vs mean 0.50, its colour pairs 0.57 (D377) | 667 |
| Restoration Angel | lean-dominant | dealt 179, picked 98, first line 37, in 29 deck(s); on colour in 68 pool(s), played in 29 (0.43, CI 0.32–0.55); won 31 of 44 decisive games (0.70, CI 0.55–0.82 by deck, design effect 1.10, shrunk 0.64) vs mean 0.50, its colour pairs 0.58 (D377) | 1105 |
| Hordeling Outburst | lean-dominant | dealt 181, picked 69, first line 26, in 1 deck(s); on colour in 21 pool(s), played in 1 (0.05, CI 0.01–0.23); won 2 of 2 decisive games (1.00, CI 0.32–1.00 by deck, design effect 1.10, shrunk 0.54) vs mean 0.50, its colour pairs 0.61 (D377) | 2179 |
| Reckless Fireweaver | lean-dominant | dealt 184, picked 49, first line 11, in 1 deck(s); on colour in 15 pool(s), played in 1 (0.07, CI 0.01–0.30); won 2 of 2 decisive games (1.00, CI 0.32–1.00 by deck, design effect 1.10, shrunk 0.54) vs mean 0.50, its colour pairs 0.61 (D377) | 2179 |
| Flame Slash | lean-dominant | dealt 180, picked 133, first line 67, in 14 deck(s); on colour in 36 pool(s), played in 14 (0.39, CI 0.25–0.55); won 12 of 20 decisive games (0.60, CI 0.38–0.79 by deck, design effect 1.10, shrunk 0.55) vs mean 0.50, its colour pairs 0.48 (D377) | 2491 |
| Lightning Helix | lean-dominant | dealt 177, picked 138, first line 70, in 6 deck(s); on colour in 6 pool(s), played in 6 (1.00, CI 0.61–1.00); won 8 of 11 decisive games (0.73, CI 0.42–0.91 by deck, design effect 1.10, shrunk 0.58) vs mean 0.50, its colour pairs 0.60 (D377) | 4127 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Beast Within (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 182, picked 84, first line 35, in 7 deck(s); on colour in 55 pool(s), played in 7 (0.13, CI 0.06–0.24); won 5 of 17 decisive games (0.29, CI 0.13–0.54 by deck, design effect 1.10, shrunk 0.40) vs mean 0.50, its colour pairs 0.41 (D377); dead p 1.8e-4
- Chromatic Star (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says lean-dead: dealt 178, picked 146, first line 74, in 42 deck(s); on colour in 146 pool(s), played in 42 (0.29, CI 0.22–0.37); won 25 of 68 decisive games (0.37, CI 0.26–0.49 by deck, design effect 1.10, shrunk 0.40) vs mean 0.50, its colour pairs 0.50 (D377)
- Faithless Looting (AI:RemoveDeck:All) — ai-limited: dealt 180, picked 168, first line 122, in 51 deck(s); on colour in 51 pool(s), played in 51 (1.00, CI 0.93–1.00); won 42 of 96 decisive games (0.44, CI 0.34–0.54 by deck, design effect 1.10, shrunk 0.45) vs mean 0.50, its colour pairs 0.47 (D377)
- Goblin Bombardment (AI:RemoveDeck:All) — ai-limited: dealt 177, picked 141, first line 67, in 38 deck(s); on colour in 38 pool(s), played in 38 (1.00, CI 0.91–1.00); won 27 of 71 decisive games (0.38, CI 0.27–0.50 by deck, design effect 1.10, shrunk 0.41) vs mean 0.50, its colour pairs 0.52 (D377)
- Hardened Scales (AI:RemoveDeck:Random) — ai-limited: dealt 180, picked 131, first line 69, in 66 deck(s); on colour in 80 pool(s), played in 66 (0.82, CI 0.73–0.89); won 51 of 116 decisive games (0.44, CI 0.35–0.54 by deck, design effect 1.10, shrunk 0.45) vs mean 0.50, its colour pairs 0.50 (D377)
- Ichor Wellspring (AI:RemoveDeck:Random) — ai-limited: dealt 179, picked 158, first line 94, in 158 deck(s); on colour in 158 pool(s), played in 158 (1.00, CI 0.98–1.00); won 118 of 254 decisive games (0.46, CI 0.40–0.53 by deck, design effect 1.10, shrunk 0.47) vs mean 0.50, its colour pairs 0.50 (D377)
- Intangible Virtue (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 181, picked 62, first line 18, in 0 deck(s); on colour in 35 pool(s), played in 0 (0.00, CI 0.00–0.10); no decisive games in a deck; dead p 2.8e-7
- Lotus Petal (AI:RemoveDeck:Random) — ai-limited: dealt 174, picked 169, first line 144, in 169 deck(s); on colour in 169 pool(s), played in 169 (1.00, CI 0.98–1.00); won 149 of 276 decisive games (0.54, CI 0.48–0.60 by deck, design effect 1.10, shrunk 0.54) vs mean 0.50, its colour pairs 0.51 (D377)
- Mishra's Bauble (AI:RemoveDeck:All) — ai-limited: dealt 185, picked 150, first line 90, in 147 deck(s); on colour in 150 pool(s), played in 147 (0.98, CI 0.94–0.99); won 131 of 248 decisive games (0.53, CI 0.46–0.59 by deck, design effect 1.10, shrunk 0.53) vs mean 0.50, its colour pairs 0.51 (D377)
- Prismatic Ending (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 182, picked 97, first line 46, in 6 deck(s); on colour in 57 pool(s), played in 6 (0.11, CI 0.05–0.21); won 10 of 11 decisive games (0.91, CI 0.61–0.98 by deck, design effect 1.10, shrunk 0.64) vs mean 0.50, its colour pairs 0.59 (D377); dead p 2.4e-5
- Prophetic Prism (AI:RemoveDeck:All) — ai-limited: dealt 179, picked 176, first line 152, in 176 deck(s); on colour in 176 pool(s), played in 176 (1.00, CI 0.98–1.00); won 141 of 285 decisive games (0.49, CI 0.43–0.56 by deck, design effect 1.10, shrunk 0.49) vs mean 0.50, its colour pairs 0.50 (D377)
- Soulherder (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dead: dealt 176, picked 76, first line 32, in 2 deck(s); on colour in 16 pool(s), played in 2 (0.13, CI 0.04–0.36); won 0 of 2 decisive games (0.00, CI 0.00–0.68 by deck, design effect 1.10, shrunk 0.45) vs mean 0.50, its colour pairs 0.60 (D377)
- Viscera Seer (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 187, picked 88, first line 23, in 0 deck(s); on colour in 38 pool(s), played in 0 (0.00, CI 0.00–0.09); no decisive games in a deck; dead p 7.8e-8
- Winding Constrictor (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dead: dealt 184, picked 78, first line 16, in 1 deck(s); on colour in 12 pool(s), played in 1 (0.08, CI 0.01–0.35); no decisive games in a deck

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Ajani's Pridemate, Anax, Hardened in the Forge, Bloodghast, Carrion Feeder, Charming Prince, Conclave Mentor, Delver of Secrets, Dreadhorde Arcanist, Ephemerate, Fatal Push, Flickerwisp, Grumgully, the Generous, Hanweir Garrison, Juri, Master of the Revue, Kari Zev, Skyship Raider, Knight of Autumn, Legion Warboss, Lonis, Cryptozoologist, March of Otherworldly Light, Mayhem Devil, Myr Sire, Pelt Collector, Prized Amalgam, Ram Through, Reflector Mage, Satyr Wayfinder, Soul-Scar Mage, Tidehollow Sculler, Ulvenwald Mysteries, Unsummon, Village Rites, Watcher for Tomorrow, Zulaport Cutthroat.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 6.69 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.95 (rating 98, CTRL SPL)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.85 (rating 69.2, ETB SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.49 (rating 94.4, GY CTRL)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.23 (rating 96.3)
- Wild Growth (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.03 (rating 97.1)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.97 (rating 99.3, REAN CTRL)
- Recall (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.56 (rating 56.8)
- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.43 (rating 82.1, RAMP)
- Mana Short (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.28 (rating 49.8)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UG | 53 | 125 | 0.34 | 0.26–0.42 | 0.36 |
| WG | 45 | 111 | 0.63 | 0.54–0.71 | 0.61 |
| WU | 44 | 108 | 0.61 | 0.52–0.70 | 0.59 |
| UB | 26 | 61 | 0.36 | 0.25–0.49 | 0.39 |
| BG | 25 | 63 | 0.51 | 0.39–0.63 | 0.51 |
| UR | 25 | 61 | 0.25 | 0.15–0.37 | 0.31 |
| WB | 23 | 56 | 0.68 | 0.55–0.79 | 0.63 |
| WR | 14 | 33 | 0.70 | 0.53–0.83 | 0.62 |
| BR | 11 | 30 | 0.47 | 0.30–0.64 | 0.48 |
| RG | 4 | 10 | 0.70 | 0.40–0.89 | 0.57 |

## Generation 2 — v2 → v2 (2026-10-16)

Discovery: 200 grid drafts, seeds 186000201–186000400, 327 decisive games; mean card win rate 0.50; 328 tests at a false-discovery rate of 0.1; design effect of a card's games 1.25; dominant-win against each card's colour pairs (D377).

Exploration (D356): 61 of 200 drafts explored, 92 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 139 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 200 drafts; 13 lead(s) to watch — about 706 drafts per generation would find half of them. Run more drafts. 30 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Kitesail Freebooter | lean-dominant | dealt 173, picked 97, first line 35, in 15 deck(s); on colour in 52 pool(s), played in 15 (0.29, CI 0.18–0.42); won 20 of 23 decisive games (0.87, CI 0.65–0.96 by deck, design effect 1.25, shrunk 0.70) vs mean 0.50, its colour pairs 0.53 (D377) | 315 |
| Elspeth, Sun's Champion | lean-dominant | dealt 186, picked 161, first line 105, in 107 deck(s); on colour in 111 pool(s), played in 107 (0.96, CI 0.91–0.99); won 122 of 170 decisive games (0.72, CI 0.64–0.79 by deck, design effect 1.25, shrunk 0.69) vs mean 0.50, its colour pairs 0.55 (D377) | 317 |
| Fatal Push | lean-dominant | dealt 177, picked 100, first line 39, in 8 deck(s); on colour in 50 pool(s), played in 8 (0.16, CI 0.08–0.28); won 14 of 15 decisive games (0.93, CI 0.67–0.99 by deck, design effect 1.25, shrunk 0.69) vs mean 0.50, its colour pairs 0.53 (D377) | 346 |
| Reveillark | lean-dominant | dealt 188, picked 117, first line 57, in 75 deck(s); on colour in 77 pool(s), played in 75 (0.97, CI 0.91–0.99); won 92 of 124 decisive games (0.74, CI 0.65–0.82 by deck, design effect 1.25, shrunk 0.71) vs mean 0.50, its colour pairs 0.59 (D377) | 374 |
| Brimaz, King of Oreskos | lean-dominant | dealt 182, picked 139, first line 72, in 84 deck(s); on colour in 88 pool(s), played in 84 (0.95, CI 0.89–0.98); won 103 of 141 decisive games (0.73, CI 0.64–0.80 by deck, design effect 1.25, shrunk 0.70) vs mean 0.50, its colour pairs 0.59 (D377) | 408 |
| Deep Forest Hermit | lean-dominant | dealt 182, picked 106, first line 39, in 55 deck(s); on colour in 72 pool(s), played in 55 (0.76, CI 0.65–0.85); won 58 of 95 decisive games (0.61, CI 0.50–0.71 by deck, design effect 1.25, shrunk 0.59) vs mean 0.50, its colour pairs 0.49 (D377) | 702 |
| Woe Strider | lean-dominant | dealt 183, picked 104, first line 38, in 30 deck(s); on colour in 41 pool(s), played in 30 (0.73, CI 0.58–0.84); won 33 of 55 decisive games (0.60, CI 0.45–0.73 by deck, design effect 1.25, shrunk 0.57) vs mean 0.50, its colour pairs 0.45 (D377) | 706 |
| Krenko, Tin Street Kingpin | lean-dominant | dealt 186, picked 150, first line 88, in 42 deck(s); on colour in 42 pool(s), played in 42 (1.00, CI 0.92–1.00); won 40 of 74 decisive games (0.54, CI 0.41–0.66 by deck, design effect 1.25, shrunk 0.53) vs mean 0.50, its colour pairs 0.40 (D377) | 829 |
| Lightning Helix | lean-dominant | dealt 175, picked 134, first line 82, in 9 deck(s); on colour in 9 pool(s), played in 9 (1.00, CI 0.70–1.00); won 10 of 13 decisive games (0.77, CI 0.47–0.93 by deck, design effect 1.25, shrunk 0.61) vs mean 0.50, its colour pairs 0.49 (D377) | 1030 |
| Hanweir Garrison | lean-dominant | dealt 181, picked 83, first line 22, in 3 deck(s); on colour in 22 pool(s), played in 3 (0.14, CI 0.05–0.33); won 6 of 8 decisive games (0.75, CI 0.38–0.94 by deck, design effect 1.25, shrunk 0.57) vs mean 0.50, its colour pairs 0.45 (D377) | 1090 |
| Ulvenwald Mysteries | lean-dominant | dealt 178, picked 100, first line 42, in 11 deck(s); on colour in 61 pool(s), played in 11 (0.18, CI 0.10–0.29); won 11 of 17 decisive games (0.65, CI 0.39–0.84 by deck, design effect 1.25, shrunk 0.57) vs mean 0.50, its colour pairs 0.46 (D377) | 1355 |
| Showdown of the Skalds | lean-dominant | dealt 182, picked 77, first line 26, in 2 deck(s); on colour in 4 pool(s), played in 2 (0.50, CI 0.15–0.85); won 2 of 2 decisive games (1.00, CI 0.29–1.00 by deck, design effect 1.25, shrunk 0.54) vs mean 0.50, its colour pairs 0.56 (D377) | 2127 |
| Knight of Autumn | lean-dominant | dealt 172, picked 70, first line 25, in 2 deck(s); on colour in 14 pool(s), played in 2 (0.14, CI 0.04–0.40); won 2 of 2 decisive games (1.00, CI 0.29–1.00 by deck, design effect 1.25, shrunk 0.54) vs mean 0.50, its colour pairs 0.64 (D377) | 2672 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Beast Within (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 183, picked 82, first line 31, in 4 deck(s); on colour in 54 pool(s), played in 4 (0.07, CI 0.03–0.18); won 1 of 9 decisive games (0.11, CI 0.02–0.48 by deck, design effect 1.25, shrunk 0.38) vs mean 0.50, its colour pairs 0.40 (D377); dead p 2.4e-6
- Chromatic Star (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says lean-dead: dealt 180, picked 142, first line 75, in 45 deck(s); on colour in 142 pool(s), played in 45 (0.32, CI 0.25–0.40); won 38 of 76 decisive games (0.50, CI 0.38–0.62 by deck, design effect 1.25, shrunk 0.50) vs mean 0.50, its colour pairs 0.51 (D377)
- Faithless Looting (AI:RemoveDeck:All) — ai-limited: dealt 180, picked 166, first line 114, in 41 deck(s); on colour in 41 pool(s), played in 41 (1.00, CI 0.91–1.00); won 30 of 69 decisive games (0.43, CI 0.31–0.57 by deck, design effect 1.25, shrunk 0.45) vs mean 0.50, its colour pairs 0.47 (D377)
- Goblin Bombardment (AI:RemoveDeck:All) — ai-limited: dealt 181, picked 143, first line 78, in 36 deck(s); on colour in 36 pool(s), played in 36 (1.00, CI 0.90–1.00); won 27 of 53 decisive games (0.51, CI 0.36–0.65 by deck, design effect 1.25, shrunk 0.51) vs mean 0.50, its colour pairs 0.43 (D377)
- Hardened Scales (AI:RemoveDeck:Random) — ai-limited: dealt 181, picked 129, first line 71, in 65 deck(s); on colour in 78 pool(s), played in 65 (0.83, CI 0.73–0.90); won 63 of 114 decisive games (0.55, CI 0.45–0.65 by deck, design effect 1.25, shrunk 0.54) vs mean 0.50, its colour pairs 0.51 (D377)
- Ichor Wellspring (AI:RemoveDeck:Random) — ai-limited: dealt 184, picked 164, first line 90, in 164 deck(s); on colour in 164 pool(s), played in 164 (1.00, CI 0.98–1.00); won 131 of 263 decisive games (0.50, CI 0.43–0.56 by deck, design effect 1.25, shrunk 0.50) vs mean 0.50, its colour pairs 0.52 (D377)
- Intangible Virtue (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 182, picked 68, first line 16, in 1 deck(s); on colour in 43 pool(s), played in 1 (0.02, CI 0.00–0.12); won 2 of 3 decisive games (0.67, CI 0.18–0.95 by deck, design effect 1.25, shrunk 0.52) vs mean 0.50, its colour pairs 0.64 (D377); dead p 2.2e-7
- Lotus Petal (AI:RemoveDeck:Random) — ai-limited: dealt 180, picked 176, first line 149, in 176 deck(s); on colour in 176 pool(s), played in 176 (1.00, CI 0.98–1.00); won 161 of 288 decisive games (0.56, CI 0.49–0.62 by deck, design effect 1.25, shrunk 0.56) vs mean 0.50, its colour pairs 0.52 (D377)
- Mishra's Bauble (AI:RemoveDeck:All) — ai-limited: dealt 175, picked 149, first line 89, in 146 deck(s); on colour in 149 pool(s), played in 146 (0.98, CI 0.94–0.99); won 122 of 247 decisive games (0.49, CI 0.42–0.56 by deck, design effect 1.25, shrunk 0.49) vs mean 0.50, its colour pairs 0.50 (D377)
- Prismatic Ending (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 178, picked 100, first line 38, in 4 deck(s); on colour in 68 pool(s), played in 4 (0.06, CI 0.02–0.14); won 3 of 10 decisive games (0.30, CI 0.10–0.63 by deck, design effect 1.25, shrunk 0.43) vs mean 0.50, its colour pairs 0.64 (D377); dead p 1.5e-8
- Prophetic Prism (AI:RemoveDeck:All) — ai-limited: dealt 180, picked 172, first line 144, in 172 deck(s); on colour in 172 pool(s), played in 172 (1.00, CI 0.98–1.00); won 122 of 287 decisive games (0.43, CI 0.36–0.49 by deck, design effect 1.25, shrunk 0.43) vs mean 0.50, its colour pairs 0.51 (D377)
- Soulherder (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dead: dealt 181, picked 74, first line 19, in 5 deck(s); on colour in 25 pool(s), played in 5 (0.20, CI 0.09–0.39); won 2 of 8 decisive games (0.25, CI 0.06–0.63 by deck, design effect 1.25, shrunk 0.43) vs mean 0.50, its colour pairs 0.59 (D377)
- Viscera Seer (AI:RemoveDeck:All) — ai-limited, the AI evidence alone says dead: dealt 174, picked 85, first line 28, in 2 deck(s); on colour in 51 pool(s), played in 2 (0.04, CI 0.01–0.13); no decisive games in a deck; dead p 1.1e-7
- Winding Constrictor (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dead: dealt 181, picked 63, first line 17, in 1 deck(s); on colour in 12 pool(s), played in 1 (0.08, CI 0.01–0.35); no decisive games in a deck

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Ajani's Pridemate, Anax, Hardened in the Forge, Carrion Feeder, Charming Prince, Conclave Mentor, Delver of Secrets, Dreadhorde Arcanist, Ephemerate, Experimental Synthesizer, Flickerwisp, Grumgully, the Generous, Hordeling Outburst, Kari Zev, Skyship Raider, Legion Warboss, Lonis, Cryptozoologist, March of Otherworldly Light, Mayhem Devil, Myr Sire, Pelt Collector, Prized Amalgam, Ram Through, Reckless Fireweaver, Reflector Mage, Satyr Wayfinder, Soul-Scar Mage, Tidehollow Sculler, Unsummon, Village Rites, Watcher for Tomorrow, Zulaport Cutthroat.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 6.84 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 6.11 (rating 98, CTRL SPL)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.95 (rating 69.2, ETB SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.74 (rating 94.4, GY CTRL)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.30 (rating 96.3)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.04 (rating 99.3, REAN CTRL)
- Wild Growth (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.88 (rating 97.1)
- Recall (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.71 (rating 56.8)
- Mana Short (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.43 (rating 49.8)
- Embercleave (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.35 (rating 54.1, ART)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| WU | 51 | 115 | 0.58 | 0.49–0.67 | 0.57 |
| UG | 41 | 98 | 0.33 | 0.24–0.42 | 0.36 |
| WG | 41 | 100 | 0.67 | 0.57–0.75 | 0.64 |
| BG | 35 | 75 | 0.49 | 0.38–0.60 | 0.49 |
| UB | 33 | 78 | 0.29 | 0.20–0.40 | 0.34 |
| WB | 30 | 73 | 0.70 | 0.59–0.79 | 0.66 |
| UR | 22 | 51 | 0.27 | 0.17–0.41 | 0.34 |
| BR | 10 | 27 | 0.52 | 0.34–0.69 | 0.51 |
| RG | 9 | 23 | 0.52 | 0.33–0.71 | 0.51 |
| WR | 6 | 14 | 0.71 | 0.45–0.88 | 0.59 |

