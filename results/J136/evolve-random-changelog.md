# Library random — the seeded control, version 1 (180 cards, two-player) — evolve changelog

Written by `tools/cubelab.sh evolve` (D299–D300, D331, D357). Each generation plays its drafts on the cube going in and swaps only what the evidence supports; docs/guides/cube-lab.md *Evolve* says how.

A card is cut on the AI's evidence only after two separate looks. **Discovery**: in this generation's drafts the card stands out by more than chance can explain, allowing for the fact that some 180 cards are looked at at once (a false-discovery rate of 10%: of the cards flagged, at most about one in 10 could be a fluke). A discovery is a *candidate*, not a verdict. **Confirmed**: the candidate stands out again, the same way, in a second batch of fresh drafts that played no part in finding it. Only confirmed cards are cut; a candidate that does not confirm stays, and is reported. Win rates count each deck's match as one clump of games (the same deck against the same opponent), so their intervals are wider than a count of games would make them.

## Confirmation history (every attempt, pooled)

Each generation gives a candidate a fresh confirmation batch, so a card that is a candidate again and again gets several chances to confirm by luck. Under D357 a repeat attempt is judged on every one of the card's confirmation batches pooled — a failed one counts against it — at a level halved for each earlier attempt (attempt j at the confirmation level / 2^(j−1)), so over any number of attempts a card with no real effect is cut with a chance of at most twice the level. A first attempt is judged exactly as before.

| Card | Rule | Attempts (each batch alone) | Every attempt pooled | Outcome |
|---|---|---|---|---|
| Kitchen Finks | dead | g2: played in 3 of 12 on-colour pools (0.25 vs 0.35), p 0.347 — not confirmed | played in 3 of 12 on-colour pools (0.25 vs 0.35), p 0.347 (1 attempt) | kept |

## Low-rated cards, judged by exploration (D356)

The deckbuilder plays by rating, so a card rated under the rating-limited bar is rarely played and its "dead" signal says nothing. In 126 of 400 drafts (share 0.315, z 0.7 against the 0.3 asked), one such card that sat on colour in a pool was forced into the deck in place of the builder's lowest-rated choice of its mana value, at random with a recorded probability: 228 forced deck(s) against 230.5 expected (z -0.2). A card's *delta* compares the decks it was forced into with the decks where it could have been and was not, weighted by those probabilities, one deck's match as one unit: its win rate in place of the builder's choice. It **holds its own** when delta is shown above −0.1 (BH at 0.1), it is **weak when played** when delta is shown below 0. Neither verdict cuts a card: a weak one is for Justin's notes, a holding one for its rating. Every forced card pooled: delta -0.00 ± 0.05; choice-deck mean rating, forced minus not (a balance check, ~0): 0.11.

| Card | Rating-limited | Forced decks (games) | Expected | Win rate with it | Without | Delta (95% CI) | Verdict |
|---|---|---|---|---|---|---|---|
| Strixhaven Skycoach |  | 10 (24) | 8.1 | 0.26 | 0.55 | -0.29 (-0.50 to -0.08) | weak when played (a human test: the notes decide) |
| The Rack | yes | 10 (26) | 12.2 | 0.44 | 0.55 | -0.11 (-0.30 to +0.08) | undecided |
| Dinrova Horror | yes | 9 (23) | 7.1 | 0.66 | 0.70 | -0.04 (-0.30 to +0.22) | too few forced decks |
| Sundering Archaic | yes | 9 (25) | 8.4 | 0.45 | 0.45 | -0.00 (-0.20 to +0.19) | too few forced decks |
| Whirler Rogue | yes | 9 (22) | 6.5 | 0.49 | 0.45 | +0.04 (-0.18 to +0.26) | too few forced decks |
| Library of Leng | yes | 8 (19) | 7.1 | 0.36 | 0.53 | -0.17 (-0.40 to +0.07) | too few forced decks |
| Meekstone |  | 8 (18) | 6.2 | 0.60 | 0.50 | +0.11 (-0.20 to +0.42) | too few forced decks |
| Obsianus Golem | yes | 8 (19) | 10.0 | 0.79 | 0.55 | +0.24 (+0.06 to +0.42) | too few forced decks |
| Plunder the Trollshaws | yes | 8 (19) | 5.7 | 0.79 | 0.46 | +0.33 (+0.14 to +0.51) | too few forced decks |
| Bolas's Citadel | yes | 7 (16) | 6.0 | 0.66 | 0.57 | +0.08 (-0.22 to +0.39) | too few forced decks |
| Dauntless Scrapbot | yes | 7 (17) | 9.3 | 0.30 | 0.52 | -0.22 (-0.50 to +0.06) | too few forced decks |
| Old Man of the Sea | yes | 7 (16) | 5.3 | 0.14 | 0.59 | -0.45 (-0.66 to -0.25) | too few forced decks |
| Plagued Rusalka |  | 7 (18) | 4.5 | 0.57 | 0.59 | -0.02 (-0.29 to +0.24) | too few forced decks |
| Ankh of Mishra |  | 6 (14) | 9.0 | 0.29 | 0.46 | -0.17 (-0.46 to +0.12) | too few forced decks |
| Bloodsoaked Champion | yes | 6 (12) | 4.8 | 0.61 | 0.40 | +0.22 (-0.19 to +0.62) | too few forced decks |
| Empyrean Eagle | yes | 6 (16) | 7.2 | 0.30 | 0.44 | -0.14 (-0.41 to +0.13) | too few forced decks |
| Frost Trickster | yes | 6 (14) | 8.2 | 0.48 | 0.49 | -0.01 (-0.36 to +0.35) | too few forced decks |
| Marauding Sphinx | yes | 6 (15) | 6.1 | 0.61 | 0.49 | +0.12 (-0.09 to +0.34) | too few forced decks |
| Triplicate Spirits | yes | 6 (13) | 5.0 | 0.19 | 0.58 | -0.39 (-0.65 to -0.14) | too few forced decks |
| Aerie Auxiliary | yes | 5 (13) | 4.6 | 0.62 | 0.58 | +0.04 (-0.16 to +0.24) | too few forced decks |
| Benalish Hero | yes | 5 (13) | 5.4 | 0.68 | 0.36 | +0.32 (+0.07 to +0.56) | too few forced decks |
| Rubble Rouser | yes | 5 (14) | 2.3 | 0.53 | 0.46 | +0.07 (-0.17 to +0.31) | too few forced decks |
| Bomat Courier |  | 4 (9) | 6.5 | 0.69 | 0.48 | +0.22 (-0.18 to +0.61) | too few forced decks |
| Flashfires |  | 4 (10) | 2.4 | 0.58 | 0.46 | +0.12 (-0.21 to +0.44) | too few forced decks |
| Hero of the Dunes | yes | 4 (11) | 3.2 | 0.53 | 0.48 | +0.05 (-0.33 to +0.44) | too few forced decks |
| Settle Beyond Reality | yes | 4 (10) | 4.4 | 0.70 | 0.46 | +0.24 (+0.02 to +0.47) | too few forced decks |
| Soul Exchange |  | 4 (10) | 5.5 | 0.57 | 0.51 | +0.06 (-0.32 to +0.44) | too few forced decks |
| Dream Beavers |  | 3 (6) | 4.8 | 0.55 | 0.46 | +0.09 (-0.53 to +0.71) | too few forced decks |
| Frozen Shade | yes | 3 (7) | 3.8 | 0.52 | 0.48 | +0.04 (-0.41 to +0.50) | too few forced decks |
| Hellfire |  | 3 (7) | 1.0 | 0.43 | 0.46 | -0.03 (-0.41 to +0.34) | too few forced decks |
| Rampaging Ferocidon |  | 3 (8) | 0.7 | 0.58 | 0.33 | +0.24 (-0.16 to +0.64) | too few forced decks |
| Village Rites | yes | 3 (9) | 4.5 | 0.55 | 0.62 | -0.07 (-0.29 to +0.14) | too few forced decks |
| Wishclaw Talisman | yes | 3 (7) | 5.6 | 0.58 | 0.46 | +0.12 (-0.36 to +0.61) | too few forced decks |
| Aang's Iceberg | yes | 2 (6) | 4.4 | 0.67 | 0.47 | +0.20 (+0.07 to +0.33) | too few forced decks |
| Body Dropper | yes | 2 (5) | 0.7 | 0.78 | – | – (– to –) | too few forced decks |
| Don & Leo, Problem Solvers |  | 2 (5) | 2.6 | 0.57 | 0.67 | -0.11 (-0.58 to +0.37) | too few forced decks |
| Hordeling Outburst |  | 2 (5) | 0.6 | 0.36 | 0.57 | -0.21 (-0.82 to +0.40) | too few forced decks |
| Impractical Joke | yes | 2 (5) | 1.8 | 0.36 | 0.58 | -0.22 (-0.71 to +0.26) | too few forced decks |
| Manabarbs |  | 2 (5) | 0.4 | 0.83 | 0.81 | +0.02 (-0.30 to +0.34) | too few forced decks |
| Monstrous Rage | yes | 2 (6) | 1.6 | 0.33 | 0.50 | -0.16 (-0.31 to -0.02) | too few forced decks |
| Orcish Oriflamme | yes | 2 (4) | 1.7 | 0.00 | 0.53 | -0.53 (-0.72 to -0.35) | too few forced decks |
| Pink Horror | yes | 2 (5) | 2.4 | 0.46 | 0.51 | -0.04 (-0.48 to +0.40) | too few forced decks |
| Aether Spellbomb |  | 1 (2) | 2.1 | 0.00 | 0.48 | -0.48 (-0.66 to -0.30) | too few forced decks |
| Angelic Voices |  | 1 (2) | 3.5 | 0.00 | 0.41 | -0.41 (-0.54 to -0.27) | too few forced decks |
| Arcbound Ravager |  | 1 (3) | 1.1 | 0.33 | 0.66 | -0.33 (-0.58 to -0.07) | too few forced decks |
| Council's Judgment |  | 1 (2) | 1.7 | 0.00 | 0.44 | -0.44 (-0.64 to -0.24) | too few forced decks |
| Dreadwing Scavenger |  | 1 (3) | 1.3 | 0.67 | 0.74 | -0.07 (-0.21 to +0.06) | too few forced decks |
| Everflowing Chalice |  | 1 (3) | 1.5 | 0.67 | 0.54 | +0.13 (-0.04 to +0.30) | too few forced decks |
| Hexgold Halberd | yes | 1 (3) | 1.9 | 0.33 | 0.53 | -0.20 (-0.38 to -0.02) | too few forced decks |
| Kitesail Freebooter |  | 1 (2) | 0.2 | 1.00 | 1.00 | +0.00 (+0.00 to +0.00) | too few forced decks |
| Raid Bombardment | yes | 1 (3) | 1.2 | 0.67 | 0.61 | +0.06 (-0.07 to +0.18) | too few forced decks |
| Restoration Angel |  | 1 (3) | 0.3 | 0.67 | 0.60 | +0.07 (-0.37 to +0.51) | too few forced decks |
| Showdown of the Skalds |  | 1 (3) | 0.4 | 0.33 | – | – (– to –) | too few forced decks |
| Sweltering Suns | yes | 1 (3) | 1.2 | 0.33 | 0.61 | -0.28 (-0.42 to -0.13) | too few forced decks |
| The Wandering Emperor |  | 1 (2) | 0.1 | 0.00 | – | – (– to –) | too few forced decks |
| Yawgmoth Demon |  | 1 (2) | 2.7 | 1.00 | 0.63 | +0.37 (+0.24 to +0.50) | too few forced decks |
| Ali from Cairo |  | 0 (0) | 0.1 | – | 0.00 | – (– to –) | too few forced decks |
| Bothersome Noisemaker |  | 0 (0) | 0.9 | – | 0.50 | – (– to –) | too few forced decks |
| Death-Greeter's Champion |  | 0 (0) | 0.2 | – | 0.33 | – (– to –) | too few forced decks |
| Mountain Yeti | yes | 0 (0) | 1.4 | – | 0.63 | – (– to –) | too few forced decks |
| Paradoxical Outcome |  | 0 (0) | 0.1 | – | 0.80 | – (– to –) | too few forced decks |
| Practiced Scrollsmith | yes | 0 (0) | 0.4 | – | 1.00 | – (– to –) | too few forced decks |
| Sai, Master Thopterist |  | 0 (0) | 0.2 | – | 0.20 | – (– to –) | too few forced decks |
| Tolarian Terror |  | 0 (0) | 0.1 | – | 1.00 | – (– to –) | too few forced decks |

## Generation 1 — v1 → v2 (2026-10-16)

Discovery: 200 grid drafts, seeds 186000001–186000200, 333 decisive games; mean card win rate 0.50; 279 tests at a false-discovery rate of 0.1; design effect of a card's games 1.05; dominant-win against each card's colour pairs (D377).

Exploration (D356): 65 of 200 drafts explored, 117 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 135 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** 1 swap(s): 1 by the notes; 9 more lead(s) are insufficient data. 52 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

| Out | Why | Evidence | In | Why this card |
|---|---|---|---|---|
| Mox Jet (Colorless) | note-cut | notes: J136 POWER: removed wherever present, never added; dealt 177, picked 175, first line 152, in 175 deck(s); on colour in 175 pool(s), played in 175 (1.00, CI 0.98–1.00); won 148 of 285 decisive games (0.52, CI 0.46–0.58 by deck, design effect 1.05, shrunk 0.52) vs mean 0.50, its colour pairs 0.50 (D377); dominant-pick p 3.0e-4 | Chrome Mox (Colorless) | same colour class; shares ART RAMP; mv 0 for 0; rating 99.4; helps weak ART (0.01) |

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Kitchen Finks | lean-dead | dealt 179, picked 108, first line 40, in 3 deck(s); on colour in 23 pool(s), played in 3 (0.13, CI 0.04–0.32); won 3 of 7 decisive games (0.43, CI 0.15–0.76 by deck, design effect 1.05, shrunk 0.48) vs mean 0.50, its colour pairs 0.42 (D377) | 479 |
| Amethyst Dragon | lean-dominant | dealt 177, picked 116, first line 48, in 34 deck(s); on colour in 43 pool(s), played in 34 (0.79, CI 0.65–0.89); won 41 of 61 decisive games (0.67, CI 0.54–0.78 by deck, design effect 1.05, shrunk 0.63) vs mean 0.50, its colour pairs 0.52 (D377) | 701 |
| Dream Beavers | lean-dominant | dealt 178, picked 103, first line 45, in 21 deck(s); on colour in 71 pool(s), played in 21 (0.30, CI 0.20–0.41); won 18 of 26 decisive games (0.69, CI 0.49–0.84 by deck, design effect 1.05, shrunk 0.61) vs mean 0.50, its colour pairs 0.52 (D377) | 850 |
| Vinereap Mentor | lean-dominant | dealt 184, picked 84, first line 27, in 4 deck(s); on colour in 20 pool(s), played in 4 (0.20, CI 0.08–0.42); won 4 of 4 decisive games (1.00, CI 0.50–1.00 by deck, design effect 1.05, shrunk 0.58) vs mean 0.50, its colour pairs 0.50 (D377) | 1000 |
| Inferno Titan | lean-dominant | dealt 176, picked 147, first line 90, in 40 deck(s); on colour in 51 pool(s), played in 40 (0.78, CI 0.65–0.88); won 44 of 68 decisive games (0.65, CI 0.53–0.75 by deck, design effect 1.05, shrunk 0.61) vs mean 0.50, its colour pairs 0.52 (D377) | 1007 |
| Goldspan Dragon | lean-dominant | dealt 178, picked 140, first line 82, in 47 deck(s); on colour in 61 pool(s), played in 47 (0.77, CI 0.65–0.86); won 45 of 68 decisive games (0.66, CI 0.54–0.77 by deck, design effect 1.05, shrunk 0.63) vs mean 0.50, its colour pairs 0.54 (D377) | 1118 |
| Death-Greeter's Champion | lean-dominant | dealt 178, picked 93, first line 42, in 25 deck(s); on colour in 31 pool(s), played in 25 (0.81, CI 0.64–0.91); won 28 of 42 decisive games (0.67, CI 0.51–0.79 by deck, design effect 1.05, shrunk 0.61) vs mean 0.50, its colour pairs 0.54 (D377) | 1264 |
| Impractical Joke | lean-dominant | dealt 178, picked 91, first line 31, in 9 deck(s); on colour in 35 pool(s), played in 9 (0.26, CI 0.14–0.42); won 11 of 15 decisive games (0.73, CI 0.47–0.89 by deck, design effect 1.05, shrunk 0.60) vs mean 0.50, its colour pairs 0.56 (D377) | 1482 |
| Rampaging Ferocidon | lean-dominant | dealt 183, picked 89, first line 27, in 17 deck(s); on colour in 32 pool(s), played in 17 (0.53, CI 0.36–0.69); won 20 of 31 decisive games (0.65, CI 0.47–0.79 by deck, design effect 1.05, shrunk 0.59) vs mean 0.50, its colour pairs 0.51 (D377) | 1661 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Adanto Vanguard (AI:RemoveDeck:All) — ai-limited: dealt 174, picked 97, first line 32, in 37 deck(s); on colour in 71 pool(s), played in 37 (0.52, CI 0.41–0.63); won 22 of 53 decisive games (0.42, CI 0.29–0.55 by deck, design effect 1.05, shrunk 0.44) vs mean 0.50, its colour pairs 0.48 (D377)
- Aether Spellbomb (AI:RemoveDeck:Random) — ai-limited: dealt 179, picked 133, first line 73, in 108 deck(s); on colour in 133 pool(s), played in 108 (0.81, CI 0.74–0.87); won 80 of 167 decisive games (0.48, CI 0.40–0.56 by deck, design effect 1.05, shrunk 0.48) vs mean 0.50, its colour pairs 0.49 (D377)
- Angelic Voices (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 180, picked 61, first line 22, in 0 deck(s); on colour in 45 pool(s), played in 0 (0.00, CI 0.00–0.08); no decisive games in a deck; dead p 3.8e-9
- Ankh of Mishra (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dead: dealt 176, picked 114, first line 49, in 23 deck(s); on colour in 114 pool(s), played in 23 (0.20, CI 0.14–0.28); won 20 of 41 decisive games (0.49, CI 0.34–0.64 by deck, design effect 1.05, shrunk 0.49) vs mean 0.50, its colour pairs 0.51 (D377)
- Bomat Courier (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 179, picked 66, first line 18, in 0 deck(s); on colour in 66 pool(s), played in 0 (0.00, CI 0.00–0.06); no decisive games in a deck; dead p 4.5e-13
- Cabal Ritual (AI:RemoveDeck:Random) — ai-limited: dealt 181, picked 152, first line 75, in 111 deck(s); on colour in 115 pool(s), played in 111 (0.97, CI 0.91–0.99); won 111 of 193 decisive games (0.58, CI 0.50–0.64 by deck, design effect 1.05, shrunk 0.57) vs mean 0.50, its colour pairs 0.50 (D377)
- Flash (AI:RemoveDeck:All) — ai-limited: dealt 183, picked 178, first line 133, in 165 deck(s); on colour in 165 pool(s), played in 165 (1.00, CI 0.98–1.00); won 145 of 267 decisive games (0.54, CI 0.48–0.60 by deck, design effect 1.05, shrunk 0.54) vs mean 0.50, its colour pairs 0.51 (D377)
- Flashfires (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 183, picked 77, first line 24, in 0 deck(s); on colour in 21 pool(s), played in 0 (0.00, CI 0.00–0.15); no decisive games in a deck; dead p 1.2e-4
- Hellfire (AI:RemoveDeck:Random) — ai-limited: dealt 180, picked 105, first line 43, in 60 deck(s); on colour in 78 pool(s), played in 60 (0.77, CI 0.66–0.85); won 55 of 94 decisive games (0.59, CI 0.48–0.68 by deck, design effect 1.05, shrunk 0.57) vs mean 0.50, its colour pairs 0.53 (D377)
- Lifeforce (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 184, picked 57, first line 14, in 0 deck(s); on colour in 27 pool(s), played in 0 (0.00, CI 0.00–0.13); no decisive games in a deck; dead p 8.9e-6
- Living Plane (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 176, picked 75, first line 22, in 0 deck(s); on colour in 35 pool(s), played in 0 (0.00, CI 0.00–0.10); no decisive games in a deck; dead p 2.8e-7
- Lotus Petal (AI:RemoveDeck:Random) — ai-limited: dealt 177, picked 173, first line 149, in 173 deck(s); on colour in 173 pool(s), played in 173 (1.00, CI 0.98–1.00); won 131 of 286 decisive games (0.46, CI 0.40–0.52 by deck, design effect 1.05, shrunk 0.46) vs mean 0.50, its colour pairs 0.49 (D377)
- Manabarbs (AI:RemoveDeck:Random) — ai-limited: dealt 176, picked 89, first line 30, in 18 deck(s); on colour in 33 pool(s), played in 18 (0.55, CI 0.38–0.70); won 14 of 26 decisive games (0.54, CI 0.35–0.72 by deck, design effect 1.05, shrunk 0.52) vs mean 0.50, its colour pairs 0.59 (D377)
- Meekstone (AI:RemoveDeck:Random) — ai-limited: dealt 178, picked 125, first line 58, in 56 deck(s); on colour in 125 pool(s), played in 56 (0.45, CI 0.36–0.54); won 55 of 98 decisive games (0.56, CI 0.46–0.66 by deck, design effect 1.05, shrunk 0.55) vs mean 0.50, its colour pairs 0.49 (D377)
- Memory Jar (AI:RemoveDeck:All) — ai-limited: dealt 179, picked 149, first line 77, in 146 deck(s); on colour in 149 pool(s), played in 146 (0.98, CI 0.94–0.99); won 119 of 247 decisive games (0.48, CI 0.42–0.55 by deck, design effect 1.05, shrunk 0.48) vs mean 0.50, its colour pairs 0.51 (D377)
- Moat (AI:RemoveDeck:Random) — ai-limited: dealt 171, picked 133, first line 56, in 88 deck(s); on colour in 98 pool(s), played in 88 (0.90, CI 0.82–0.94); won 64 of 131 decisive games (0.49, CI 0.40–0.57 by deck, design effect 1.05, shrunk 0.49) vs mean 0.50, its colour pairs 0.44 (D377)
- Nishoba Brawler (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 180, picked 87, first line 32, in 0 deck(s); on colour in 41 pool(s), played in 0 (0.00, CI 0.00–0.09); no decisive games in a deck; dead p 2.1e-8
- Plagued Rusalka (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 181, picked 89, first line 38, in 4 deck(s); on colour in 65 pool(s), played in 4 (0.06, CI 0.02–0.15); won 5 of 10 decisive games (0.50, CI 0.23–0.77 by deck, design effect 1.05, shrunk 0.50) vs mean 0.50, its colour pairs 0.53 (D377); dead p 4.4e-8
- Soul Exchange (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 176, picked 93, first line 42, in 3 deck(s); on colour in 72 pool(s), played in 3 (0.04, CI 0.01–0.12); won 1 of 3 decisive games (0.33, CI 0.06–0.80 by deck, design effect 1.05, shrunk 0.48) vs mean 0.50, its colour pairs 0.57 (D377); dead p 3.4e-10
- Yawgmoth Demon (AI:RemoveDeck:Random) — ai-limited: dealt 185, picked 114, first line 40, in 48 deck(s); on colour in 94 pool(s), played in 48 (0.51, CI 0.41–0.61); won 49 of 85 decisive games (0.58, CI 0.47–0.68 by deck, design effect 1.05, shrunk 0.56) vs mean 0.50, its colour pairs 0.54 (D377)

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Aang's Iceberg, Aerie Auxiliary, Argothian Pixies, Ashroot Animist, Benalish Hero, Bloodsoaked Champion, Body Dropper, Bolas's Citadel, Conclave Naturalists, Contagious Vorrac, Courier of Comestibles, Craw Wurm, Dauntless Scrapbot, Desecrator Hag, Dinrova Horror, Empyrean Eagle, Feral Thallid, Frost Trickster, Frozen Shade, Giant Spider, Grizzly Fate, Hero of the Dunes, Hexgold Halberd, Krosan Tusker, Library of Leng, Marauding Sphinx, Monstrous Rage, Mountain Yeti, Obsianus Golem, Old Man of the Sea, Orcish Oriflamme, Pink Horror, Plunder the Trollshaws, Practiced Scrollsmith, Primordial Pachyderm, Quandrix Charm, Raid Bombardment, Rubble Rouser, Settle Beyond Reality, Storm Seeker, Sundering Archaic, Sweltering Suns, The Rack, Tracker, Triplicate Spirits, Up the Beanstalk, Vaultborn Tyrant, Vibrance, Village Rites, Wall of Roots, Whirler Rogue, Wishclaw Talisman.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Wild Growth (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.38 (rating 97.1)
- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.78 (rating 82.1, RAMP)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.76 (rating 94.4, GY CTRL)
- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.25 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.23 (rating 98, CTRL SPL)
- Sylvan Library (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.12 (rating 58.9, CTRL)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.10 (rating 99.3, REAN CTRL)
- Devoted Druid (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.92 (rating 60.5)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.85 (rating 96.3)
- Prophetic Prism (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.64 (rating 90.5, ART ETB)

**Pairs no played deck used:** RG, BG — their gold cards and duals never had a deck to be in; a balance question for the pair, not the cards.

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UB | 97 | 242 | 0.54 | 0.47–0.60 | 0.53 |
| WU | 85 | 210 | 0.45 | 0.38–0.52 | 0.45 |
| WB | 32 | 79 | 0.47 | 0.36–0.58 | 0.47 |
| UR | 24 | 57 | 0.63 | 0.50–0.74 | 0.60 |
| BR | 16 | 43 | 0.58 | 0.43–0.72 | 0.56 |
| UG | 6 | 12 | 0.00 | 0.00–0.24 | 0.31 |
| WG | 5 | 11 | 0.27 | 0.10–0.57 | 0.42 |
| WR | 5 | 12 | 0.67 | 0.39–0.86 | 0.56 |

## Generation 2 — v2 → v2 (2026-10-16)

Discovery: 200 grid drafts, seeds 186000201–186000400, 342 decisive games; mean card win rate 0.50; 283 tests at a false-discovery rate of 0.1; design effect of a card's games 1.05; dominant-win against each card's colour pairs (D377); confirmation 125 fresh drafts, seeds 187000301–187000425, 313 decisive games.

Exploration (D356): 61 of 200 drafts explored, 111 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 139 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 200 drafts; 12 lead(s) to watch — about 898 drafts per generation would find half of them. Run more drafts. Discovery: 1 candidate(s) of 283 tests at a false-discovery rate of 0.1; confirmation on 125 fresh drafts: 0 confirmed, 1 not. 50 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Discovered, then confirmed or not** (1 candidate(s); the confirmation batch was sized for 125 drafts):

| Card | Rule | Discovery (this generation's drafts) | Confirmation (fresh drafts) | Every confirmation attempt pooled | Outcome |
|---|---|---|---|---|---|
| Kitchen Finks | dead | played in 1 of 29 on-colour pools (0.03 vs 0.35), p 6.2e-5, q 0.009 | played in 3 of 12 on-colour pools (0.25 vs 0.35), p 0.347, Holm p 0.347 | first attempt | not confirmed: not significant on the fresh seeds (Holm p 0.347 > 0.05) |

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Wedding Announcement | lean-dominant | dealt 178, picked 169, first line 113, in 127 deck(s); on colour in 127 pool(s), played in 127 (1.00, CI 0.97–1.00); won 128 of 218 decisive games (0.59, CI 0.52–0.65 by deck, design effect 1.05, shrunk 0.58) vs mean 0.50, its colour pairs 0.46 (D377) | 373 |
| Dream Beavers | lean-dominant | dealt 183, picked 112, first line 41, in 22 deck(s); on colour in 88 pool(s), played in 22 (0.25, CI 0.17–0.35); won 27 of 42 decisive games (0.64, CI 0.49–0.77 by deck, design effect 1.05, shrunk 0.60) vs mean 0.50, its colour pairs 0.45 (D377) | 439 |
| Empyrean Eagle | lean-dominant | dealt 178, picked 88, first line 27, in 15 deck(s); on colour in 45 pool(s), played in 15 (0.33, CI 0.21–0.48); won 17 of 26 decisive games (0.65, CI 0.46–0.81 by deck, design effect 1.05, shrunk 0.59) vs mean 0.50, its colour pairs 0.46 (D377) | 675 |
| Murderous Redcap | lean-dominant | dealt 181, picked 161, first line 100, in 12 deck(s); on colour in 28 pool(s), played in 12 (0.43, CI 0.27–0.61); won 10 of 12 decisive games (0.83, CI 0.54–0.95 by deck, design effect 1.05, shrunk 0.63) vs mean 0.50, its colour pairs 0.52 (D377) | 694 |
| Death-Greeter's Champion | lean-dominant | dealt 176, picked 92, first line 34, in 32 deck(s); on colour in 42 pool(s), played in 32 (0.76, CI 0.61–0.86); won 33 of 47 decisive games (0.70, CI 0.56–0.82 by deck, design effect 1.05, shrunk 0.64) vs mean 0.50, its colour pairs 0.55 (D377) | 729 |
| Hero of the Dunes | lean-dominant | dealt 179, picked 75, first line 29, in 5 deck(s); on colour in 27 pool(s), played in 5 (0.19, CI 0.08–0.37); won 6 of 7 decisive games (0.86, CI 0.48–0.97 by deck, design effect 1.05, shrunk 0.59) vs mean 0.50, its colour pairs 0.51 (D377) | 784 |
| Showdown of the Skalds | lean-dominant | dealt 183, picked 85, first line 26, in 6 deck(s); on colour in 10 pool(s), played in 6 (0.60, CI 0.31–0.83); won 8 of 9 decisive games (0.89, CI 0.56–0.98 by deck, design effect 1.05, shrunk 0.62) vs mean 0.50, its colour pairs 0.60 (D377) | 898 |
| Bothersome Noisemaker | lean-dominant | dealt 183, picked 81, first line 36, in 12 deck(s); on colour in 35 pool(s), played in 12 (0.34, CI 0.21–0.51); won 16 of 22 decisive games (0.73, CI 0.51–0.87 by deck, design effect 1.05, shrunk 0.62) vs mean 0.50, its colour pairs 0.57 (D377) | 1272 |
| Sweltering Suns | lean-dominant | dealt 181, picked 87, first line 34, in 7 deck(s); on colour in 27 pool(s), played in 7 (0.26, CI 0.13–0.45); won 10 of 13 decisive games (0.77, CI 0.49–0.92 by deck, design effect 1.05, shrunk 0.61) vs mean 0.50, its colour pairs 0.57 (D377) | 1381 |
| Courier of Comestibles | lean-dominant | dealt 176, picked 82, first line 32, in 12 deck(s); on colour in 36 pool(s), played in 12 (0.33, CI 0.20–0.50); won 15 of 23 decisive games (0.65, CI 0.44–0.81 by deck, design effect 1.05, shrunk 0.58) vs mean 0.50, its colour pairs 0.51 (D377) | 1730 |
| Rampaging Ferocidon | lean-dominant | dealt 181, picked 77, first line 30, in 8 deck(s); on colour in 28 pool(s), played in 8 (0.29, CI 0.15–0.47); won 9 of 12 decisive games (0.75, CI 0.46–0.91 by deck, design effect 1.05, shrunk 0.59) vs mean 0.50, its colour pairs 0.61 (D377) | 2530 |
| Mountain Yeti | lean-dominant | dealt 180, picked 68, first line 20, in 2 deck(s); on colour in 26 pool(s), played in 2 (0.08, CI 0.02–0.24); won 4 of 5 decisive games (0.80, CI 0.37–0.96 by deck, design effect 1.05, shrunk 0.56) vs mean 0.50, its colour pairs 0.57 (D377) | 2653 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Adanto Vanguard (AI:RemoveDeck:All) — ai-limited: dealt 182, picked 103, first line 45, in 40 deck(s); on colour in 69 pool(s), played in 40 (0.58, CI 0.46–0.69); won 32 of 66 decisive games (0.48, CI 0.37–0.61 by deck, design effect 1.05, shrunk 0.49) vs mean 0.50, its colour pairs 0.51 (D377)
- Aether Spellbomb (AI:RemoveDeck:Random) — ai-limited: dealt 179, picked 137, first line 72, in 116 deck(s); on colour in 137 pool(s), played in 116 (0.85, CI 0.78–0.90); won 101 of 207 decisive games (0.49, CI 0.42–0.56 by deck, design effect 1.05, shrunk 0.49) vs mean 0.50, its colour pairs 0.49 (D377)
- Angelic Voices (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 181, picked 60, first line 19, in 0 deck(s); on colour in 40 pool(s), played in 0 (0.00, CI 0.00–0.09); no decisive games in a deck; dead p 3.3e-8
- Ankh of Mishra (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 179, picked 109, first line 42, in 19 deck(s); on colour in 109 pool(s), played in 19 (0.17, CI 0.12–0.26); won 17 of 28 decisive games (0.61, CI 0.42–0.77 by deck, design effect 1.05, shrunk 0.56) vs mean 0.50, its colour pairs 0.48 (D377); dead p 4.0e-5
- Bomat Courier (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 189, picked 64, first line 15, in 0 deck(s); on colour in 64 pool(s), played in 0 (0.00, CI 0.00–0.06); no decisive games in a deck; dead p 1.1e-12
- Cabal Ritual (AI:RemoveDeck:Random) — ai-limited: dealt 182, picked 155, first line 99, in 111 deck(s); on colour in 116 pool(s), played in 111 (0.96, CI 0.90–0.98); won 101 of 195 decisive games (0.52, CI 0.45–0.59 by deck, design effect 1.05, shrunk 0.52) vs mean 0.50, its colour pairs 0.48 (D377)
- Flash (AI:RemoveDeck:All) — ai-limited: dealt 176, picked 173, first line 127, in 167 deck(s); on colour in 167 pool(s), played in 167 (1.00, CI 0.98–1.00); won 114 of 273 decisive games (0.42, CI 0.36–0.48 by deck, design effect 1.05, shrunk 0.42) vs mean 0.50, its colour pairs 0.50 (D377)
- Flashfires (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 180, picked 83, first line 24, in 1 deck(s); on colour in 36 pool(s), played in 1 (0.03, CI 0.01–0.14); won 2 of 2 decisive games (1.00, CI 0.33–1.00 by deck, design effect 1.05, shrunk 0.55) vs mean 0.50, its colour pairs 0.58 (D377); dead p 3.8e-6
- Hellfire (AI:RemoveDeck:Random) — ai-limited: dealt 181, picked 112, first line 47, in 64 deck(s); on colour in 86 pool(s), played in 64 (0.74, CI 0.64–0.82); won 48 of 108 decisive games (0.44, CI 0.35–0.54 by deck, design effect 1.05, shrunk 0.45) vs mean 0.50, its colour pairs 0.46 (D377)
- Lifeforce (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 177, picked 59, first line 13, in 0 deck(s); on colour in 26 pool(s), played in 0 (0.00, CI 0.00–0.13); no decisive games in a deck; dead p 1.4e-5
- Living Plane (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 178, picked 73, first line 31, in 2 deck(s); on colour in 31 pool(s), played in 2 (0.06, CI 0.02–0.21); won 2 of 4 decisive games (0.50, CI 0.14–0.85 by deck, design effect 1.05, shrunk 0.50) vs mean 0.50, its colour pairs 0.50 (D377); dead p 2.4e-4
- Lotus Petal (AI:RemoveDeck:Random) — ai-limited: dealt 186, picked 183, first line 156, in 183 deck(s); on colour in 183 pool(s), played in 183 (1.00, CI 0.98–1.00); won 149 of 307 decisive games (0.49, CI 0.43–0.54 by deck, design effect 1.05, shrunk 0.49) vs mean 0.50, its colour pairs 0.50 (D377)
- Manabarbs (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dominant: dealt 186, picked 74, first line 33, in 13 deck(s); on colour in 20 pool(s), played in 13 (0.65, CI 0.43–0.82); won 16 of 20 decisive games (0.80, CI 0.58–0.92 by deck, design effect 1.05, shrunk 0.65) vs mean 0.50, its colour pairs 0.52 (D377)
- Meekstone (AI:RemoveDeck:Random) — ai-limited: dealt 175, picked 132, first line 61, in 64 deck(s); on colour in 132 pool(s), played in 64 (0.48, CI 0.40–0.57); won 56 of 104 decisive games (0.54, CI 0.44–0.63 by deck, design effect 1.05, shrunk 0.53) vs mean 0.50, its colour pairs 0.48 (D377)
- Memory Jar (AI:RemoveDeck:All) — ai-limited: dealt 178, picked 145, first line 72, in 144 deck(s); on colour in 145 pool(s), played in 144 (0.99, CI 0.96–1.00); won 115 of 242 decisive games (0.48, CI 0.41–0.54 by deck, design effect 1.05, shrunk 0.48) vs mean 0.50, its colour pairs 0.50 (D377)
- Moat (AI:RemoveDeck:Random) — ai-limited: dealt 178, picked 149, first line 78, in 94 deck(s); on colour in 104 pool(s), played in 94 (0.90, CI 0.83–0.95); won 76 of 153 decisive games (0.50, CI 0.42–0.58 by deck, design effect 1.05, shrunk 0.50) vs mean 0.50, its colour pairs 0.51 (D377)
- Nishoba Brawler (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dead: dealt 181, picked 62, first line 22, in 3 deck(s); on colour in 28 pool(s), played in 3 (0.11, CI 0.04–0.27); won 4 of 8 decisive games (0.50, CI 0.21–0.79 by deck, design effect 1.05, shrunk 0.50) vs mean 0.50, its colour pairs 0.53 (D377)
- Plagued Rusalka (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 180, picked 84, first line 32, in 3 deck(s); on colour in 66 pool(s), played in 3 (0.05, CI 0.02–0.13); won 4 of 8 decisive games (0.50, CI 0.21–0.79 by deck, design effect 1.05, shrunk 0.50) vs mean 0.50, its colour pairs 0.52 (D377); dead p 3.5e-9
- Soul Exchange (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 180, picked 81, first line 27, in 4 deck(s); on colour in 60 pool(s), played in 4 (0.07, CI 0.03–0.16); won 3 of 5 decisive games (0.60, CI 0.23–0.89 by deck, design effect 1.05, shrunk 0.52) vs mean 0.50, its colour pairs 0.50 (D377); dead p 2.8e-7
- Yawgmoth Demon (AI:RemoveDeck:Random) — ai-limited: dealt 183, picked 106, first line 54, in 37 deck(s); on colour in 78 pool(s), played in 37 (0.47, CI 0.37–0.58); won 30 of 65 decisive games (0.46, CI 0.34–0.58 by deck, design effect 1.05, shrunk 0.47) vs mean 0.50, its colour pairs 0.52 (D377)

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Aang's Iceberg, Aerie Auxiliary, Argothian Pixies, Ashroot Animist, Benalish Hero, Bloodsoaked Champion, Body Dropper, Bolas's Citadel, Conclave Naturalists, Contagious Vorrac, Craw Wurm, Dauntless Scrapbot, Desecrator Hag, Dinrova Horror, Feral Thallid, Frost Trickster, Frozen Shade, Giant Spider, Grizzly Fate, Hexgold Halberd, Impractical Joke, Krosan Tusker, Library of Leng, Marauding Sphinx, Monstrous Rage, Obsianus Golem, Old Man of the Sea, Orcish Oriflamme, Pink Horror, Plunder the Trollshaws, Practiced Scrollsmith, Primordial Pachyderm, Quandrix Charm, Raid Bombardment, Rubble Rouser, Settle Beyond Reality, Storm Seeker, Sundering Archaic, The Rack, Tracker, Triplicate Spirits, Ulvenwald Mysteries, Up the Beanstalk, Vaultborn Tyrant, Vibrance, Village Rites, Vinereap Mentor, Wall of Roots, Whirler Rogue, Wishclaw Talisman.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.35 (rating 98, CTRL SPL)
- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.33 (rating 97.6, SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.31 (rating 94.4, GY CTRL)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.26 (rating 99.3, REAN CTRL)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.00 (rating 96.3)
- Wild Growth (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.88 (rating 97.1)
- Prophetic Prism (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.62 (rating 90.5, ART ETB)
- Goblin Bombardment (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.36 (rating 75.4, SAC TOK)
- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.28 (rating 82.1, RAMP)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.20 (rating 69.2, ETB SPL)

**Pairs no played deck used:** RG — their gold cards and duals never had a deck to be in; a balance question for the pair, not the cards.

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UB | 97 | 237 | 0.43 | 0.37–0.50 | 0.44 |
| WU | 88 | 216 | 0.46 | 0.40–0.53 | 0.47 |
| WB | 29 | 73 | 0.58 | 0.46–0.68 | 0.56 |
| UR | 26 | 63 | 0.59 | 0.46–0.70 | 0.57 |
| WR | 12 | 31 | 0.74 | 0.57–0.86 | 0.65 |
| BR | 11 | 25 | 0.68 | 0.48–0.83 | 0.60 |
| UG | 10 | 26 | 0.58 | 0.39–0.74 | 0.54 |
| BG | 3 | 7 | 0.29 | 0.08–0.64 | 0.44 |
| WG | 2 | 6 | 0.50 | 0.19–0.81 | 0.50 |

