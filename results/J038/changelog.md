# Omega — the greatest-hits cube, version 1 (180 cards, two-player) — evolve changelog

Written by `tools/cubelab.sh evolve` (D299–D300, D331). Each generation plays its drafts on the cube going in and swaps only what the evidence supports; docs/guides/cube-lab.md *Evolve* says how.

A card is cut on the AI's evidence only after two separate looks. **Discovery**: in this generation's drafts the card stands out by more than chance can explain, allowing for the fact that some 180 cards are looked at at once (a false-discovery rate of 10%: of the cards flagged, at most about one in 10 could be a fluke). A discovery is a *candidate*, not a verdict. **Confirmed**: the candidate stands out again, the same way, in a second batch of fresh drafts that played no part in finding it. Only confirmed cards are cut; a candidate that does not confirm stays, and is reported. Win rates count each deck's match as one clump of games (the same deck against the same opponent), so their intervals are wider than a count of games would make them.

## Low-rated cards, judged by exploration (D356)

The deckbuilder plays by rating, so a card rated under the rating-limited bar is rarely played and its "dead" signal says nothing. In 144 of 400 drafts (share 0.360, z 2.6 against the 0.3 asked), one such card that sat on colour in a pool was forced into the deck in place of the builder's lowest-rated choice of its mana value, at random with a recorded probability: 244 forced deck(s) against 243.0 expected (z 0.1). A card's *delta* compares the decks it was forced into with the decks where it could have been and was not, weighted by those probabilities, one deck's match as one unit: its win rate in place of the builder's choice. It **holds its own** when delta is shown above −0.1 (BH at 0.1), it is **weak when played** when delta is shown below 0. Neither verdict cuts a card: a weak one is for Justin's notes, a holding one for its rating. Every forced card pooled: delta +0.01 ± 0.05; choice-deck mean rating, forced minus not (a balance check, ~0): -0.04.

| Card | Rating-limited | Forced decks (games) | Expected | Win rate with it | Without | Delta (95% CI) | Verdict |
|---|---|---|---|---|---|---|---|
| Batterskull | yes | 10 (24) | 9.1 | 0.64 | 0.47 | +0.16 (-0.05 to +0.37) | holds its own when played (underrated by its rating) |
| Coalition Relic | yes | 15 (35) | 11.1 | 0.57 | 0.51 | +0.06 (-0.16 to +0.28) | undecided |
| Platinum Angel | yes | 12 (30) | 12.1 | 0.55 | 0.51 | +0.03 (-0.15 to +0.22) | undecided |
| Flickerwisp | yes | 11 (26) | 6.3 | 0.60 | 0.47 | +0.13 (-0.11 to +0.37) | undecided |
| Everflowing Chalice | yes | 10 (24) | 12.7 | 0.45 | 0.46 | -0.02 (-0.25 to +0.22) | undecided |
| Sword of Feast and Famine | yes | 8 (19) | 8.3 | 0.58 | 0.48 | +0.10 (-0.17 to +0.38) | too few forced decks |
| Garruk Relentless | yes | 7 (19) | 2.8 | 0.48 | 0.58 | -0.10 (-0.37 to +0.16) | too few forced decks |
| Hangarback Walker |  | 7 (18) | 6.6 | 0.55 | 0.50 | +0.05 (-0.20 to +0.29) | too few forced decks |
| Reflector Mage | yes | 7 (15) | 6.1 | 0.13 | 0.63 | -0.50 (-0.72 to -0.28) | too few forced decks |
| Smuggler's Copter |  | 7 (18) | 6.3 | 0.50 | 0.46 | +0.03 (-0.22 to +0.29) | too few forced decks |
| Fire // Ice | yes | 6 (16) | 5.0 | 0.54 | 0.46 | +0.08 (-0.32 to +0.49) | too few forced decks |
| Baleful Strix |  | 5 (12) | 2.1 | 0.35 | – | – (– to –) | too few forced decks |
| Birds of Paradise | yes | 5 (10) | 2.8 | 0.26 | 0.54 | -0.28 (-0.74 to +0.18) | too few forced decks |
| Cryptic Command | yes | 5 (11) | 7.3 | 0.47 | 0.52 | -0.05 (-0.44 to +0.34) | too few forced decks |
| Ephemerate | yes | 5 (12) | 3.8 | 0.60 | 0.58 | +0.02 (-0.31 to +0.36) | too few forced decks |
| Figure of Destiny | yes | 5 (12) | 4.0 | 0.85 | 0.25 | +0.60 (+0.05 to +1.14) | too few forced decks |
| Ravenous Chupacabra | yes | 5 (12) | 4.0 | 0.69 | 0.48 | +0.21 (-0.13 to +0.55) | too few forced decks |
| Restoration Angel | yes | 5 (13) | 5.0 | 0.42 | 0.47 | -0.05 (-0.36 to +0.26) | too few forced decks |
| Shriekmaw |  | 5 (11) | 2.5 | 0.44 | 0.44 | -0.00 (-0.41 to +0.41) | too few forced decks |
| Sword of Fire and Ice |  | 5 (13) | 5.9 | 0.72 | 0.57 | +0.15 (-0.04 to +0.34) | too few forced decks |
| Treasure Cruise | yes | 5 (12) | 7.6 | 0.47 | 0.51 | -0.04 (-0.33 to +0.25) | too few forced decks |
| Young Pyromancer | yes | 5 (11) | 2.9 | 0.55 | 0.45 | +0.11 (-0.29 to +0.50) | too few forced decks |
| Ball Lightning | yes | 4 (10) | 4.2 | 0.76 | 0.60 | +0.16 (-0.14 to +0.45) | too few forced decks |
| Chandra, Torch of Defiance | yes | 4 (11) | 2.5 | 0.57 | 0.56 | +0.01 (-0.30 to +0.31) | too few forced decks |
| Delver of Secrets | yes | 4 (11) | 5.0 | 0.60 | 0.52 | +0.08 (-0.16 to +0.32) | too few forced decks |
| Doom Blade | yes | 4 (10) | 4.9 | 0.24 | 0.50 | -0.26 (-0.57 to +0.04) | too few forced decks |
| Fatal Push | yes | 4 (11) | 5.0 | 0.36 | 0.60 | -0.24 (-0.49 to +0.01) | too few forced decks |
| Goblin Guide |  | 4 (9) | 3.9 | 0.54 | 0.53 | +0.00 (-0.35 to +0.36) | too few forced decks |
| Mystic Snake | yes | 4 (9) | 3.7 | 0.07 | 0.64 | -0.56 (-0.87 to -0.26) | too few forced decks |
| Questing Beast | yes | 4 (12) | 3.2 | 0.40 | 0.47 | -0.07 (-0.26 to +0.11) | too few forced decks |
| Sakura-Tribe Elder |  | 4 (8) | 1.5 | 0.46 | 0.67 | -0.21 (-0.76 to +0.35) | too few forced decks |
| Solemn Simulacrum |  | 4 (11) | 3.0 | 0.50 | 0.54 | -0.04 (-0.32 to +0.23) | too few forced decks |
| Sword of Light and Shadow |  | 4 (9) | 4.6 | 0.18 | 0.55 | -0.38 (-0.59 to -0.16) | too few forced decks |
| Council's Judgment | yes | 3 (7) | 6.0 | 0.40 | 0.48 | -0.08 (-0.39 to +0.23) | too few forced decks |
| Expressive Iteration | yes | 3 (7) | 2.0 | 0.30 | 1.00 | -0.70 (-1.09 to -0.30) | too few forced decks |
| Grave Titan | yes | 3 (9) | 5.1 | 0.56 | 0.47 | +0.09 (-0.12 to +0.30) | too few forced decks |
| Shivan Dragon | yes | 3 (8) | 3.0 | 0.17 | 0.59 | -0.42 (-0.66 to -0.17) | too few forced decks |
| Thundermaw Hellkite | yes | 3 (9) | 2.0 | 0.41 | 0.56 | -0.15 (-0.39 to +0.09) | too few forced decks |
| Baneslayer Angel |  | 2 (5) | 2.7 | 0.79 | 0.56 | +0.23 (-0.03 to +0.50) | too few forced decks |
| Dark Confidant |  | 2 (5) | 2.2 | 0.71 | 0.39 | +0.32 (-0.16 to +0.80) | too few forced decks |
| Fact or Fiction |  | 2 (5) | 4.0 | 0.49 | 0.53 | -0.04 (-0.42 to +0.34) | too few forced decks |
| Flametongue Kavu |  | 2 (5) | 2.0 | 0.79 | 0.58 | +0.21 (-0.08 to +0.50) | too few forced decks |
| Karn, Scion of Urza |  | 2 (5) | 1.9 | 0.24 | 0.62 | -0.38 (-0.65 to -0.11) | too few forced decks |
| Knight of the Reliquary |  | 2 (5) | 1.6 | 0.83 | 1.00 | -0.17 (-0.40 to +0.06) | too few forced decks |
| Maelstrom Pulse | yes | 2 (5) | 3.3 | 0.50 | 0.32 | +0.18 (-0.26 to +0.61) | too few forced decks |
| Polukranos, World Eater | yes | 2 (4) | 2.0 | 0.00 | 0.47 | -0.47 (-0.62 to -0.31) | too few forced decks |
| Primeval Titan | yes | 2 (4) | 1.6 | 1.00 | 0.46 | +0.54 (+0.36 to +0.71) | too few forced decks |
| Sorin, Lord of Innistrad | yes | 2 (5) | 1.7 | 0.62 | 0.21 | +0.41 (-0.09 to +0.91) | too few forced decks |
| The Wandering Emperor |  | 2 (5) | 1.8 | 0.40 | 0.57 | -0.17 (-0.65 to +0.31) | too few forced decks |
| Bloodghast | yes | 1 (2) | 2.6 | 1.00 | 0.38 | +0.62 (+0.46 to +0.78) | too few forced decks |
| Falkenrath Aristocrat |  | 1 (2) | 0.3 | 1.00 | – | – (– to –) | too few forced decks |
| Garruk Wildspeaker |  | 1 (2) | 1.7 | 0.00 | 0.69 | -0.69 (-0.93 to -0.45) | too few forced decks |
| Glorybringer |  | 1 (2) | 1.0 | 0.00 | 0.65 | -0.65 (-0.84 to -0.45) | too few forced decks |
| Hellrider |  | 1 (2) | 1.9 | 1.00 | 0.38 | +0.62 (+0.46 to +0.79) | too few forced decks |
| Hero of Bladehold |  | 1 (3) | 3.2 | 0.67 | 0.59 | +0.08 (-0.05 to +0.20) | too few forced decks |
| Huntmaster of the Fells |  | 1 (2) | 0.8 | 1.00 | 0.33 | +0.67 (+0.67 to +0.67) | too few forced decks |
| Incinerate |  | 1 (2) | 2.1 | 1.00 | 0.68 | +0.32 (+0.19 to +0.45) | too few forced decks |
| Acidic Slime | yes | 0 (0) | 2.5 | – | 0.43 | – (– to –) | too few forced decks |
| Grist, the Hunger Tide |  | 0 (0) | 0.4 | – | 1.00 | – (– to –) | too few forced decks |
| Liliana of the Veil |  | 0 (0) | 0.6 | – | 0.62 | – (– to –) | too few forced decks |
| Rancor | yes | 0 (0) | 3.6 | – | 0.30 | – (– to –) | too few forced decks |
| Seasoned Pyromancer |  | 0 (0) | 0.5 | – | 0.59 | – (– to –) | too few forced decks |
| Siege-Gang Commander |  | 0 (0) | 0.9 | – | 0.30 | – (– to –) | too few forced decks |
| Titania, Protector of Argoth |  | 0 (0) | 0.2 | – | 0.80 | – (– to –) | too few forced decks |
| Voice of Resurgence | yes | 0 (0) | 1.8 | – | 0.48 | – (– to –) | too few forced decks |

## Generation 1 — v1 → v1 (2026-10-03)

Discovery: 400 grid drafts, seeds 5000001–5000400, 644 decisive games; mean card win rate 0.50; 376 tests at a false-discovery rate of 0.1; design effect of a card's games 1.00; confirmation 241 fresh drafts, seeds 6000001–6000241, 621 decisive games.

Exploration (D356): 144 of 400 drafts explored, 244 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 256 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 400 drafts; 6 lead(s) to watch — about 4000 drafts per generation would find half of them. Run more drafts. Discovery: 1 candidate(s) of 376 tests at a false-discovery rate of 0.1; confirmation on 241 fresh drafts: 0 confirmed, 1 not. 37 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Discovered, then confirmed or not** (1 candidate(s); the confirmation batch was sized for 241 drafts):

| Card | Rule | Discovery (this generation's drafts) | Confirmation (fresh drafts) | Outcome |
|---|---|---|---|---|
| Fable of the Mirror-Breaker | dominant-win | won 155 of 255 decisive games (0.61 vs 0.50), p 3.5e-4, q 0.065 | won 101 of 218 decisive games (0.46 vs 0.50), p 0.876, Holm p 0.876 | not confirmed: not significant on the fresh seeds (Holm p 0.876 > 0.05) |

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Bloodbraid Elf | lean-dominant | dealt 360, picked 269, first line 128, in 33 deck(s); on colour in 33 pool(s), played in 33 (1.00, CI 0.90–1.00); won 28 of 42 decisive games (0.67, CI 0.52–0.79 by deck, shrunk 0.61) vs mean 0.50 | 1029 |
| Kolaghan's Command | lean-dominant | dealt 358, picked 206, first line 74, in 10 deck(s); on colour in 13 pool(s), played in 10 (0.77, CI 0.50–0.92); won 14 of 21 decisive games (0.67, CI 0.45–0.83 by deck, shrunk 0.59) vs mean 0.50 | 2058 |
| Goblin Guide | lean-dominant | dealt 372, picked 194, first line 54, in 20 deck(s); on colour in 92 pool(s), played in 20 (0.22, CI 0.14–0.31); won 15 of 23 decisive games (0.65, CI 0.45–0.81 by deck, shrunk 0.58) vs mean 0.50 | 2261 |
| Knight of the Reliquary | lean-dominant | dealt 350, picked 129, first line 28, in 1 deck(s); on colour in 20 pool(s), played in 1 (0.05, CI 0.01–0.24); won 2 of 2 decisive games (1.00, CI 0.34–1.00 by deck, shrunk 0.55) vs mean 0.50 | 4000 |
| Huntmaster of the Fells | lean-dominant | dealt 363, picked 153, first line 39, in 7 deck(s); on colour in 17 pool(s), played in 7 (0.41, CI 0.22–0.64); won 9 of 14 decisive games (0.64, CI 0.39–0.84 by deck, shrunk 0.56) vs mean 0.50 | 4200 |
| Falkenrath Aristocrat | lean-dominant | dealt 362, picked 134, first line 30, in 2 deck(s); on colour in 6 pool(s), played in 2 (0.33, CI 0.10–0.70); won 4 of 6 decisive games (0.67, CI 0.30–0.90 by deck, shrunk 0.54) vs mean 0.50 | 7200 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Demonic Tutor (AI:RemoveDeck:Random) — ai-limited: dealt 358, picked 325, first line 214, in 168 deck(s); on colour in 168 pool(s), played in 168 (1.00, CI 0.98–1.00); won 139 of 279 decisive games (0.50, CI 0.44–0.56 by deck, shrunk 0.50) vs mean 0.50

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Acidic Slime, Ball Lightning, Batterskull, Birds of Paradise, Bloodghast, Chandra, Torch of Defiance, Coalition Relic, Council's Judgment, Cryptic Command, Delver of Secrets, Doom Blade, Ephemerate, Everflowing Chalice, Expressive Iteration, Fatal Push, Figure of Destiny, Fire // Ice, Flickerwisp, Garruk Relentless, Grave Titan, Maelstrom Pulse, Mystic Snake, Platinum Angel, Polukranos, World Eater, Primeval Titan, Questing Beast, Rancor, Ravenous Chupacabra, Reflector Mage, Restoration Angel, Shivan Dragon, Sorin, Lord of Innistrad, Sword of Feast and Famine, Thundermaw Hellkite, Treasure Cruise, Voice of Resurgence, Young Pyromancer.

**Lands never played** (lands go by notes only: the lab's deckbuilder plays a dual or fetchland only in its own pair's decks and a colourless land never, so a land's numbers are its pair's): Mishra's Factory, Mutavault.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.69 (rating 94.4, GY CTRL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.62 (rating 98, CTRL SPL)
- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.61 (rating 97.6, SPL)
- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.34 (rating 82.1, RAMP)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.16 (rating 99.3, REAN CTRL)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.85 (rating 96.3)
- Goblin Bombardment (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.79 (rating 75.4, SAC TOK)
- Prophetic Prism (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.62 (rating 90.5, ART ETB)
- Sylvan Library (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.49 (rating 58.9, CTRL)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.42 (rating 85.4, ART)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| WU | 113 | 278 | 0.50 | 0.44–0.56 | 0.50 |
| UB | 97 | 243 | 0.49 | 0.42–0.55 | 0.49 |
| WR | 59 | 148 | 0.57 | 0.49–0.65 | 0.56 |
| UR | 48 | 126 | 0.52 | 0.43–0.60 | 0.51 |
| WG | 43 | 109 | 0.44 | 0.35–0.53 | 0.45 |
| UG | 41 | 106 | 0.37 | 0.28–0.46 | 0.39 |
| BG | 37 | 91 | 0.44 | 0.34–0.54 | 0.45 |
| WB | 37 | 93 | 0.55 | 0.45–0.65 | 0.54 |
| RG | 20 | 50 | 0.64 | 0.50–0.76 | 0.60 |
| BR | 17 | 44 | 0.66 | 0.51–0.78 | 0.61 |

