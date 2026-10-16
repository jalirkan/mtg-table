# Omega — the greatest-hits cube, version 1 (180 cards, two-player) — evolve changelog

Written by `tools/cubelab.sh evolve` (D299–D300, D331, D357). Each generation plays its drafts on the cube going in and swaps only what the evidence supports; docs/guides/cube-lab.md *Evolve* says how.

A card is cut on the AI's evidence only after two separate looks. **Discovery**: in this generation's drafts the card stands out by more than chance can explain, allowing for the fact that some 180 cards are looked at at once (a false-discovery rate of 10%: of the cards flagged, at most about one in 10 could be a fluke). A discovery is a *candidate*, not a verdict. **Confirmed**: the candidate stands out again, the same way, in a second batch of fresh drafts that played no part in finding it. Only confirmed cards are cut; a candidate that does not confirm stays, and is reported. Win rates count each deck's match as one clump of games (the same deck against the same opponent), so their intervals are wider than a count of games would make them.

## Low-rated cards, judged by exploration (D356)

The deckbuilder plays by rating, so a card rated under the rating-limited bar is rarely played and its "dead" signal says nothing. In 126 of 400 drafts (share 0.315, z 0.7 against the 0.3 asked), one such card that sat on colour in a pool was forced into the deck in place of the builder's lowest-rated choice of its mana value, at random with a recorded probability: 221 forced deck(s) against 221.3 expected (z -0.0). A card's *delta* compares the decks it was forced into with the decks where it could have been and was not, weighted by those probabilities, one deck's match as one unit: its win rate in place of the builder's choice. It **holds its own** when delta is shown above −0.1 (BH at 0.1), it is **weak when played** when delta is shown below 0. Neither verdict cuts a card: a weak one is for Justin's notes, a holding one for its rating. Every forced card pooled: delta +0.00 ± 0.05; choice-deck mean rating, forced minus not (a balance check, ~0): -0.01.

| Card | Rating-limited | Forced decks (games) | Expected | Win rate with it | Without | Delta (95% CI) | Verdict |
|---|---|---|---|---|---|---|---|
| Platinum Angel | yes | 14 (36) | 11.3 | 0.43 | 0.56 | -0.13 (-0.30 to +0.04) | undecided |
| Treasure Cruise | yes | 9 (22) | 7.5 | 0.62 | 0.50 | +0.12 (-0.10 to +0.33) | too few forced decks |
| Cryptic Command | yes | 8 (20) | 6.6 | 0.64 | 0.48 | +0.16 (-0.09 to +0.42) | too few forced decks |
| Hangarback Walker |  | 7 (16) | 6.0 | 0.59 | 0.48 | +0.11 (-0.23 to +0.45) | too few forced decks |
| Everflowing Chalice | yes | 6 (14) | 8.6 | 0.53 | 0.60 | -0.07 (-0.36 to +0.22) | too few forced decks |
| Fatal Push | yes | 6 (14) | 3.7 | 0.45 | 0.44 | +0.00 (-0.42 to +0.42) | too few forced decks |
| Hellrider |  | 6 (15) | 2.1 | 0.39 | 0.33 | +0.06 (-0.27 to +0.39) | too few forced decks |
| Ravenous Chupacabra | yes | 6 (15) | 4.1 | 0.60 | 0.46 | +0.14 (-0.12 to +0.41) | too few forced decks |
| Smuggler's Copter |  | 6 (15) | 4.3 | 0.52 | 0.49 | +0.03 (-0.27 to +0.33) | too few forced decks |
| Sword of Feast and Famine | yes | 6 (15) | 7.0 | 0.65 | 0.47 | +0.18 (-0.09 to +0.45) | too few forced decks |
| Sword of Light and Shadow |  | 6 (16) | 4.2 | 0.42 | 0.57 | -0.15 (-0.38 to +0.09) | too few forced decks |
| Bloodghast | yes | 5 (12) | 6.2 | 0.59 | 0.49 | +0.11 (-0.19 to +0.40) | too few forced decks |
| Coalition Relic | yes | 5 (13) | 8.6 | 0.53 | 0.53 | -0.01 (-0.23 to +0.22) | too few forced decks |
| Council's Judgment | yes | 5 (12) | 6.8 | 0.68 | 0.40 | +0.27 (-0.05 to +0.60) | too few forced decks |
| Doom Blade | yes | 5 (12) | 4.9 | 0.43 | 0.55 | -0.11 (-0.40 to +0.17) | too few forced decks |
| Ephemerate | yes | 5 (13) | 4.1 | 0.46 | 0.50 | -0.04 (-0.30 to +0.23) | too few forced decks |
| Baneslayer Angel |  | 4 (10) | 3.1 | 0.74 | 0.57 | +0.17 (-0.03 to +0.36) | too few forced decks |
| Batterskull | yes | 4 (10) | 9.7 | 0.54 | 0.51 | +0.03 (-0.28 to +0.35) | too few forced decks |
| Dark Confidant |  | 4 (11) | 3.4 | 0.57 | 0.35 | +0.23 (+0.01 to +0.45) | too few forced decks |
| Delver of Secrets | yes | 4 (10) | 5.8 | 0.56 | 0.49 | +0.06 (-0.25 to +0.37) | too few forced decks |
| Fact or Fiction |  | 4 (8) | 4.7 | 0.34 | 0.52 | -0.18 (-0.71 to +0.35) | too few forced decks |
| Figure of Destiny | yes | 4 (10) | 4.1 | 0.69 | 0.35 | +0.33 (-0.12 to +0.79) | too few forced decks |
| Garruk Relentless | yes | 4 (11) | 2.9 | 0.30 | 0.55 | -0.25 (-0.53 to +0.03) | too few forced decks |
| Grave Titan | yes | 4 (11) | 5.6 | 0.35 | 0.53 | -0.18 (-0.36 to +0.01) | too few forced decks |
| Hero of Bladehold | yes | 4 (10) | 4.2 | 0.53 | 0.48 | +0.05 (-0.31 to +0.41) | too few forced decks |
| Incinerate |  | 4 (10) | 1.7 | 0.40 | 0.61 | -0.22 (-0.57 to +0.14) | too few forced decks |
| Polukranos, World Eater | yes | 4 (8) | 3.2 | 0.48 | 0.44 | +0.04 (-0.55 to +0.62) | too few forced decks |
| Restoration Angel | yes | 4 (10) | 3.8 | 0.44 | 0.46 | -0.02 (-0.41 to +0.37) | too few forced decks |
| Shivan Dragon | yes | 4 (10) | 3.1 | 0.51 | 0.42 | +0.09 (-0.28 to +0.46) | too few forced decks |
| Shriekmaw |  | 4 (10) | 2.3 | 0.53 | 0.47 | +0.07 (-0.25 to +0.39) | too few forced decks |
| Solemn Simulacrum |  | 4 (10) | 2.7 | 0.49 | 0.54 | -0.05 (-0.38 to +0.28) | too few forced decks |
| Acidic Slime | yes | 3 (7) | 2.4 | 0.52 | 0.55 | -0.03 (-0.49 to +0.44) | too few forced decks |
| Baleful Strix |  | 3 (7) | 2.3 | 0.62 | 0.66 | -0.04 (-0.59 to +0.52) | too few forced decks |
| Ball Lightning | yes | 3 (8) | 2.8 | 0.51 | 0.44 | +0.08 (-0.24 to +0.40) | too few forced decks |
| Birds of Paradise | yes | 3 (8) | 2.3 | 0.38 | 0.55 | -0.17 (-0.46 to +0.12) | too few forced decks |
| Expressive Iteration | yes | 3 (7) | 3.1 | 0.11 | 0.53 | -0.42 (-1.14 to +0.29) | too few forced decks |
| Flickerwisp | yes | 3 (7) | 4.7 | 0.13 | 0.49 | -0.37 (-0.60 to -0.14) | too few forced decks |
| Reflector Mage | yes | 3 (8) | 3.4 | 0.56 | 0.23 | +0.33 (-0.07 to +0.73) | too few forced decks |
| Sword of Fire and Ice |  | 3 (7) | 5.3 | 0.63 | 0.58 | +0.05 (-0.18 to +0.28) | too few forced decks |
| The Wandering Emperor |  | 3 (9) | 3.3 | 0.54 | 0.53 | +0.01 (-0.24 to +0.26) | too few forced decks |
| Thundermaw Hellkite | yes | 3 (8) | 2.2 | 0.78 | 0.39 | +0.39 (+0.14 to +0.64) | too few forced decks |
| Fire // Ice | yes | 2 (4) | 1.4 | 0.00 | 0.33 | -0.33 (-0.33 to -0.33) | too few forced decks |
| Primeval Titan | yes | 2 (4) | 3.1 | 0.50 | 0.57 | -0.07 (-0.77 to +0.64) | too few forced decks |
| Questing Beast | yes | 2 (5) | 3.2 | 0.55 | 0.40 | +0.14 (-0.28 to +0.57) | too few forced decks |
| Rancor | yes | 2 (5) | 1.7 | 0.17 | 0.55 | -0.38 (-0.69 to -0.08) | too few forced decks |
| Sakura-Tribe Elder |  | 2 (5) | 1.9 | 0.77 | 0.56 | +0.21 (-0.09 to +0.50) | too few forced decks |
| Sorin, Lord of Innistrad |  | 2 (5) | 1.2 | 0.38 | 0.67 | -0.28 (-0.74 to +0.17) | too few forced decks |
| Voice of Resurgence |  | 2 (4) | 1.7 | 0.44 | 0.75 | -0.31 (-1.00 to +0.39) | too few forced decks |
| Young Pyromancer | yes | 2 (6) | 2.2 | 0.46 | 0.37 | +0.09 (-0.21 to +0.38) | too few forced decks |
| Chandra, Torch of Defiance |  | 1 (3) | 1.8 | 0.67 | 0.36 | +0.31 (+0.13 to +0.49) | too few forced decks |
| Falkenrath Aristocrat | yes | 1 (3) | 1.1 | 0.67 | 0.33 | +0.33 (+0.33 to +0.33) | too few forced decks |
| Flametongue Kavu |  | 1 (2) | 1.2 | 0.00 | 0.54 | -0.54 (-0.78 to -0.30) | too few forced decks |
| Garruk Wildspeaker | yes | 1 (3) | 0.9 | 0.33 | 0.42 | -0.09 (-0.37 to +0.19) | too few forced decks |
| Goblin Guide | yes | 1 (2) | 2.9 | 0.00 | 0.46 | -0.46 (-0.61 to -0.31) | too few forced decks |
| Grist, the Hunger Tide |  | 1 (3) | 0.4 | 0.33 | – | – (– to –) | too few forced decks |
| Huntmaster of the Fells |  | 1 (2) | 1.0 | 1.00 | 1.00 | +0.00 (+0.00 to +0.00) | too few forced decks |
| Knight of the Reliquary | yes | 1 (2) | 1.5 | 0.00 | 1.00 | -1.00 (-1.00 to -1.00) | too few forced decks |
| Maelstrom Pulse | yes | 1 (3) | 1.2 | 0.33 | 0.79 | -0.45 (-0.66 to -0.24) | too few forced decks |
| Siege-Gang Commander |  | 1 (2) | 1.0 | 0.00 | 0.71 | -0.71 (-0.85 to -0.58) | too few forced decks |
| Glorybringer |  | 0 (0) | 0.5 | – | 0.36 | – (– to –) | too few forced decks |
| Karn, Scion of Urza |  | 0 (0) | 1.4 | – | 0.58 | – (– to –) | too few forced decks |
| Liliana of the Veil |  | 0 (0) | 0.8 | – | 0.60 | – (– to –) | too few forced decks |
| Mystic Snake | yes | 0 (0) | 0.3 | – | 0.67 | – (– to –) | too few forced decks |
| Seasoned Pyromancer |  | 0 (0) | 0.3 | – | 0.28 | – (– to –) | too few forced decks |
| Titania, Protector of Argoth |  | 0 (0) | 0.1 | – | 0.33 | – (– to –) | too few forced decks |
| Uro, Titan of Nature's Wrath |  | 0 (0) | 0.6 | – | 0.49 | – (– to –) | too few forced decks |

## Generation 1 — v1 → v1 (2026-10-16)

Discovery: 200 grid drafts, seeds 186000001–186000200, 347 decisive games; mean card win rate 0.50; 364 tests at a false-discovery rate of 0.1; design effect of a card's games 1.00; dominant-win against each card's colour pairs (D377).

Exploration (D356): 65 of 200 drafts explored, 114 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 135 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 200 drafts; 12 lead(s) to watch — about 1822 drafts per generation would find half of them. Run more drafts. 31 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Hero of Bladehold | lean-dominant | dealt 179, picked 89, first line 28, in 23 deck(s); on colour in 68 pool(s), played in 23 (0.34, CI 0.24–0.46); won 29 of 40 decisive games (0.72, CI 0.57–0.84 by deck, shrunk 0.65) vs mean 0.50, its colour pairs 0.49 (D377) | 309 |
| Sakura-Tribe Elder | lean-dominant | dealt 175, picked 102, first line 33, in 24 deck(s); on colour in 46 pool(s), played in 24 (0.52, CI 0.38–0.66); won 28 of 43 decisive games (0.65, CI 0.50–0.78 by deck, shrunk 0.60) vs mean 0.50, its colour pairs 0.47 (D377) | 519 |
| Arc Trail | lean-dominant | dealt 177, picked 132, first line 67, in 45 deck(s); on colour in 46 pool(s), played in 45 (0.98, CI 0.89–1.00); won 49 of 75 decisive games (0.65, CI 0.54–0.75 by deck, shrunk 0.62) vs mean 0.50, its colour pairs 0.50 (D377) | 564 |
| Ravenous Chupacabra | lean-dominant | dealt 180, picked 87, first line 28, in 7 deck(s); on colour in 47 pool(s), played in 7 (0.15, CI 0.07–0.28); won 7 of 10 decisive games (0.70, CI 0.40–0.89 by deck, shrunk 0.57) vs mean 0.50, its colour pairs 0.44 (D377) | 901 |
| Thundermaw Hellkite | lean-dominant | dealt 176, picked 76, first line 24, in 7 deck(s); on colour in 24 pool(s), played in 7 (0.29, CI 0.15–0.49); won 6 of 7 decisive games (0.86, CI 0.49–0.97 by deck, shrunk 0.59) vs mean 0.50, its colour pairs 0.55 (D377) | 1025 |
| Cryptic Command | lean-dominant | dealt 177, picked 100, first line 33, in 16 deck(s); on colour in 80 pool(s), played in 16 (0.20, CI 0.13–0.30); won 18 of 30 decisive games (0.60, CI 0.42–0.75 by deck, shrunk 0.56) vs mean 0.50, its colour pairs 0.47 (D377) | 1235 |
| Chandra, Torch of Defiance | lean-dominant | dealt 180, picked 90, first line 24, in 10 deck(s); on colour in 29 pool(s), played in 10 (0.34, CI 0.20–0.53); won 9 of 13 decisive games (0.69, CI 0.42–0.87 by deck, shrunk 0.58) vs mean 0.50, its colour pairs 0.53 (D377) | 1822 |
| Goblin Guide | lean-dominant | dealt 177, picked 78, first line 30, in 4 deck(s); on colour in 26 pool(s), played in 4 (0.15, CI 0.06–0.34); won 6 of 8 decisive games (0.75, CI 0.41–0.93 by deck, shrunk 0.57) vs mean 0.50, its colour pairs 0.54 (D377) | 1865 |
| Knight of the Reliquary | lean-dominant | dealt 181, picked 64, first line 13, in 1 deck(s); on colour in 6 pool(s), played in 1 (0.17, CI 0.03–0.56); won 2 of 2 decisive games (1.00, CI 0.34–1.00 by deck, shrunk 0.55) vs mean 0.50, its colour pairs 0.48 (D377) | 2000 |
| Young Pyromancer | lean-dominant | dealt 178, picked 82, first line 21, in 6 deck(s); on colour in 27 pool(s), played in 6 (0.22, CI 0.11–0.41); won 5 of 7 decisive games (0.71, CI 0.36–0.92 by deck, shrunk 0.56) vs mean 0.50, its colour pairs 0.51 (D377) | 2273 |
| Sorin, Lord of Innistrad | lean-dominant | dealt 178, picked 81, first line 28, in 4 deck(s); on colour in 15 pool(s), played in 4 (0.27, CI 0.11–0.52); won 5 of 8 decisive games (0.63, CI 0.31–0.86 by deck, shrunk 0.54) vs mean 0.50, its colour pairs 0.48 (D377) | 3819 |
| Huntmaster of the Fells | lean-dominant | dealt 183, picked 70, first line 22, in 6 deck(s); on colour in 7 pool(s), played in 6 (0.86, CI 0.49–0.97); won 4 of 6 decisive games (0.67, CI 0.30–0.90 by deck, shrunk 0.54) vs mean 0.50, its colour pairs 0.51 (D377) | 4777 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Demonic Tutor (AI:RemoveDeck:Random) — ai-limited: dealt 176, picked 161, first line 117, in 103 deck(s); on colour in 104 pool(s), played in 103 (0.99, CI 0.95–1.00); won 91 of 181 decisive games (0.50, CI 0.43–0.57 by deck, shrunk 0.50) vs mean 0.50, its colour pairs 0.46 (D377)

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Acidic Slime, Ball Lightning, Batterskull, Birds of Paradise, Bloodghast, Coalition Relic, Council's Judgment, Delver of Secrets, Doom Blade, Ephemerate, Everflowing Chalice, Expressive Iteration, Falkenrath Aristocrat, Fatal Push, Figure of Destiny, Fire // Ice, Flickerwisp, Garruk Relentless, Garruk Wildspeaker, Grave Titan, Maelstrom Pulse, Mystic Snake, Platinum Angel, Polukranos, World Eater, Primeval Titan, Questing Beast, Rancor, Reflector Mage, Restoration Angel, Shivan Dragon, Treasure Cruise.

**Lands never played** (lands go by notes only: the lab's deckbuilder plays a dual or fetchland only in its own pair's decks and a colourless land never, so a land's numbers are its pair's): Mishra's Factory, Mutavault.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.95 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.61 (rating 98, CTRL SPL)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.38 (rating 99.3, REAN CTRL)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.05 (rating 96.3)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.94 (rating 94.4, GY CTRL)
- Wild Growth (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.88 (rating 97.1)
- Goblin Bombardment (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.69 (rating 75.4, SAC TOK)
- Prophetic Prism (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.67 (rating 90.5, ART ETB)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.43 (rating 69.2, ETB SPL)
- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.28 (rating 82.1, RAMP)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| WU | 60 | 154 | 0.52 | 0.44–0.60 | 0.52 |
| UB | 53 | 136 | 0.43 | 0.35–0.51 | 0.44 |
| WB | 32 | 84 | 0.49 | 0.38–0.59 | 0.49 |
| WG | 28 | 72 | 0.49 | 0.37–0.60 | 0.49 |
| UR | 25 | 64 | 0.52 | 0.40–0.63 | 0.51 |
| UG | 24 | 63 | 0.46 | 0.34–0.58 | 0.47 |
| WR | 18 | 45 | 0.62 | 0.48–0.75 | 0.58 |
| RG | 11 | 27 | 0.56 | 0.37–0.72 | 0.53 |
| BG | 10 | 26 | 0.58 | 0.39–0.74 | 0.54 |
| BR | 9 | 23 | 0.57 | 0.37–0.74 | 0.53 |

## Generation 2 — v1 → v1 (2026-10-16)

Discovery: 200 grid drafts, seeds 186000201–186000400, 348 decisive games; mean card win rate 0.50; 364 tests at a false-discovery rate of 0.1; design effect of a card's games 1.00; dominant-win against each card's colour pairs (D377).

Exploration (D356): 61 of 200 drafts explored, 107 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 139 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 200 drafts; 9 lead(s) to watch — about 1498 drafts per generation would find half of them. Run more drafts. 37 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Baleful Strix | lean-dominant | dealt 179, picked 96, first line 43, in 24 deck(s); on colour in 33 pool(s), played in 24 (0.73, CI 0.56–0.85); won 29 of 48 decisive games (0.60, CI 0.46–0.73 by deck, shrunk 0.57) vs mean 0.50, its colour pairs 0.42 (D377) | 495 |
| Garruk Wildspeaker | lean-dominant | dealt 178, picked 65, first line 13, in 6 deck(s); on colour in 22 pool(s), played in 6 (0.27, CI 0.13–0.48); won 4 of 4 decisive games (1.00, CI 0.51–1.00 by deck, shrunk 0.58) vs mean 0.50, its colour pairs 0.43 (D377) | 1000 |
| Chandra, Torch of Defiance | lean-dominant | dealt 180, picked 83, first line 20, in 10 deck(s); on colour in 32 pool(s), played in 10 (0.31, CI 0.18–0.49); won 12 of 17 decisive games (0.71, CI 0.47–0.87 by deck, shrunk 0.59) vs mean 0.50, its colour pairs 0.53 (D377) | 1242 |
| Incinerate | lean-dominant | dealt 176, picked 81, first line 23, in 8 deck(s); on colour in 34 pool(s), played in 8 (0.24, CI 0.12–0.40); won 7 of 9 decisive games (0.78, CI 0.45–0.94 by deck, shrunk 0.59) vs mean 0.50, its colour pairs 0.55 (D377) | 1309 |
| Hellrider | lean-dominant | dealt 180, picked 84, first line 24, in 12 deck(s); on colour in 36 pool(s), played in 12 (0.33, CI 0.20–0.50); won 10 of 14 decisive games (0.71, CI 0.45–0.88 by deck, shrunk 0.59) vs mean 0.50, its colour pairs 0.54 (D377) | 1498 |
| Sorin, Lord of Innistrad | lean-dominant | dealt 175, picked 67, first line 24, in 1 deck(s); on colour in 13 pool(s), played in 1 (0.08, CI 0.01–0.33); won 2 of 2 decisive games (1.00, CI 0.34–1.00 by deck, shrunk 0.55) vs mean 0.50, its colour pairs 0.50 (D377) | 2000 |
| Voice of Resurgence | lean-dominant | dealt 184, picked 74, first line 19, in 5 deck(s); on colour in 13 pool(s), played in 5 (0.38, CI 0.18–0.65); won 6 of 9 decisive games (0.67, CI 0.35–0.88 by deck, shrunk 0.55) vs mean 0.50, its colour pairs 0.48 (D377) | 2073 |
| Falkenrath Aristocrat | lean-dominant | dealt 175, picked 74, first line 21, in 1 deck(s); on colour in 3 pool(s), played in 1 (0.33, CI 0.06–0.79); won 2 of 3 decisive games (0.67, CI 0.21–0.94 by deck, shrunk 0.52) vs mean 0.50, its colour pairs 0.48 (D377) | 6581 |
| Kolaghan's Command | lean-dominant | dealt 178, picked 97, first line 34, in 3 deck(s); on colour in 5 pool(s), played in 3 (0.60, CI 0.23–0.88); won 2 of 3 decisive games (0.67, CI 0.21–0.94 by deck, shrunk 0.52) vs mean 0.50, its colour pairs 0.48 (D377) | 6581 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Demonic Tutor (AI:RemoveDeck:Random) — ai-limited: dealt 183, picked 169, first line 103, in 104 deck(s); on colour in 106 pool(s), played in 104 (0.98, CI 0.93–0.99); won 89 of 189 decisive games (0.47, CI 0.40–0.54 by deck, shrunk 0.47) vs mean 0.50, its colour pairs 0.50 (D377)

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Acidic Slime, Ball Lightning, Batterskull, Birds of Paradise, Bloodghast, Coalition Relic, Council's Judgment, Cryptic Command, Delver of Secrets, Doom Blade, Ephemerate, Everflowing Chalice, Expressive Iteration, Fatal Push, Figure of Destiny, Fire // Ice, Flickerwisp, Garruk Relentless, Goblin Guide, Grave Titan, Hero of Bladehold, Knight of the Reliquary, Maelstrom Pulse, Mystic Snake, Platinum Angel, Polukranos, World Eater, Primeval Titan, Questing Beast, Rancor, Ravenous Chupacabra, Reflector Mage, Restoration Angel, Shivan Dragon, Sword of Feast and Famine, Thundermaw Hellkite, Treasure Cruise, Young Pyromancer.

**Lands never played** (lands go by notes only: the lab's deckbuilder plays a dual or fetchland only in its own pair's decks and a colourless land never, so a land's numbers are its pair's): Mishra's Factory, Mutavault.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Wild Growth (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.63 (rating 97.1)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.51 (rating 99.3, REAN CTRL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.50 (rating 94.4, GY CTRL)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.08 (rating 96.3)
- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.03 (rating 82.1, RAMP)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.99 (rating 98, CTRL SPL)
- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.90 (rating 97.6, SPL)
- Prophetic Prism (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.83 (rating 90.5, ART ETB)
- Goblin Bombardment (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.64 (rating 75.4, SAC TOK)
- Tortured Existence (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.53 (rating 54, GY SAC)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UB | 72 | 179 | 0.46 | 0.39–0.54 | 0.47 |
| WU | 44 | 114 | 0.54 | 0.44–0.62 | 0.53 |
| UR | 30 | 75 | 0.59 | 0.47–0.69 | 0.57 |
| WR | 29 | 73 | 0.56 | 0.45–0.67 | 0.55 |
| WB | 26 | 70 | 0.51 | 0.40–0.63 | 0.51 |
| WG | 26 | 62 | 0.47 | 0.35–0.59 | 0.48 |
| UG | 19 | 47 | 0.43 | 0.29–0.57 | 0.45 |
| BG | 17 | 39 | 0.38 | 0.25–0.54 | 0.42 |
| RG | 10 | 23 | 0.52 | 0.33–0.71 | 0.51 |
| BR | 5 | 14 | 0.50 | 0.27–0.73 | 0.50 |

