# Library hits — the greatest hits by lab rating, version 1 (180 cards, two-player) — evolve changelog

Written by `tools/cubelab.sh evolve` (D299–D300, D331, D357). Each generation plays its drafts on the cube going in and swaps only what the evidence supports; docs/guides/cube-lab.md *Evolve* says how.

A card is cut on the AI's evidence only after two separate looks. **Discovery**: in this generation's drafts the card stands out by more than chance can explain, allowing for the fact that some 180 cards are looked at at once (a false-discovery rate of 10%: of the cards flagged, at most about one in 10 could be a fluke). A discovery is a *candidate*, not a verdict. **Confirmed**: the candidate stands out again, the same way, in a second batch of fresh drafts that played no part in finding it. Only confirmed cards are cut; a candidate that does not confirm stays, and is reported. Win rates count each deck's match as one clump of games (the same deck against the same opponent), so their intervals are wider than a count of games would make them.

## Confirmation history (every attempt, pooled)

Each generation gives a candidate a fresh confirmation batch, so a card that is a candidate again and again gets several chances to confirm by luck. Under D357 a repeat attempt is judged on every one of the card's confirmation batches pooled — a failed one counts against it — at a level halved for each earlier attempt (attempt j at the confirmation level / 2^(j−1)), so over any number of attempts a card with no real effect is cut with a chance of at most twice the level. A first attempt is judged exactly as before.

| Card | Rule | Attempts (each batch alone) | Every attempt pooled | Outcome |
|---|---|---|---|---|
| Retrofitter Foundry | dominant-pick | g1: first line in 39 of 46 grids (0.85 vs 0.75), p 0.082 — not confirmed | first line in 39 of 46 grids (0.85 vs 0.75), p 0.082 (1 attempt) | kept |

## Low-rated cards, judged by exploration (D356)

The deckbuilder plays by rating, so a card rated under the rating-limited bar is rarely played and its "dead" signal says nothing. In 126 of 400 drafts (share 0.315, z 0.7 against the 0.3 asked), one such card that sat on colour in a pool was forced into the deck in place of the builder's lowest-rated choice of its mana value, at random with a recorded probability: 227 forced deck(s) against 228.0 expected (z -0.1). A card's *delta* compares the decks it was forced into with the decks where it could have been and was not, weighted by those probabilities, one deck's match as one unit: its win rate in place of the builder's choice. It **holds its own** when delta is shown above −0.1 (BH at 0.1), it is **weak when played** when delta is shown below 0. Neither verdict cuts a card: a weak one is for Justin's notes, a holding one for its rating. Every forced card pooled: delta -0.00 ± 0.05; choice-deck mean rating, forced minus not (a balance check, ~0): -0.00.

| Card | Rating-limited | Forced decks (games) | Expected | Win rate with it | Without | Delta (95% CI) | Verdict |
|---|---|---|---|---|---|---|---|
| Hanweir Garrison | yes | 10 (25) | 5.1 | 0.70 | 0.52 | +0.18 (-0.03 to +0.39) | holds its own when played (underrated by its rating) |
| Combat Thresher | yes | 14 (33) | 9.9 | 0.40 | 0.46 | -0.06 (-0.27 to +0.15) | undecided |
| Vulshok Morningstar | yes | 11 (28) | 6.5 | 0.51 | 0.46 | +0.04 (-0.19 to +0.28) | undecided |
| Flitterwing Nuisance | yes | 9 (22) | 7.0 | 0.62 | 0.38 | +0.24 (-0.07 to +0.55) | too few forced decks |
| Threadbind Clique | yes | 8 (21) | 6.4 | 0.43 | 0.44 | -0.01 (-0.24 to +0.22) | too few forced decks |
| Vault Skirge | yes | 7 (17) | 4.4 | 0.34 | 0.44 | -0.10 (-0.37 to +0.16) | too few forced decks |
| Bloodwater Entity | yes | 6 (15) | 5.4 | 0.45 | 0.47 | -0.03 (-0.45 to +0.40) | too few forced decks |
| Brilliance Unleashed | yes | 6 (15) | 10.9 | 0.54 | 0.46 | +0.08 (-0.20 to +0.36) | too few forced decks |
| Delver of Secrets | yes | 6 (16) | 7.1 | 0.45 | 0.51 | -0.06 (-0.30 to +0.18) | too few forced decks |
| Myr Sire | yes | 6 (15) | 8.9 | 0.46 | 0.53 | -0.07 (-0.41 to +0.26) | too few forced decks |
| Cult Conscript | yes | 5 (10) | 4.6 | 0.50 | 0.39 | +0.11 (-0.36 to +0.58) | too few forced decks |
| Galvanic Discharge | yes | 5 (12) | 5.2 | 0.54 | 0.54 | -0.01 (-0.38 to +0.37) | too few forced decks |
| Mire Triton | yes | 5 (13) | 4.0 | 0.31 | 0.39 | -0.08 (-0.38 to +0.22) | too few forced decks |
| Mogg War Marshal | yes | 5 (12) | 4.8 | 0.31 | 0.57 | -0.27 (-0.53 to +0.00) | too few forced decks |
| Moon-Circuit Hacker | yes | 5 (12) | 5.3 | 0.37 | 0.52 | -0.15 (-0.43 to +0.13) | too few forced decks |
| Spiteful Prankster |  | 5 (13) | 2.4 | 0.37 | 0.41 | -0.04 (-0.34 to +0.26) | too few forced decks |
| Yahenni, Undying Partisan | yes | 5 (13) | 4.9 | 0.35 | 0.37 | -0.02 (-0.22 to +0.18) | too few forced decks |
| Ardent Elementalist | yes | 4 (10) | 4.7 | 0.33 | 0.54 | -0.20 (-0.56 to +0.15) | too few forced decks |
| Cloudkin Seer |  | 4 (10) | 2.6 | 0.53 | 0.55 | -0.03 (-0.41 to +0.35) | too few forced decks |
| Dinrova Horror | yes | 4 (10) | 4.9 | 0.45 | 0.46 | -0.01 (-0.37 to +0.35) | too few forced decks |
| Dreadwing Scavenger | yes | 4 (9) | 4.6 | 0.62 | 0.29 | +0.32 (-0.22 to +0.86) | too few forced decks |
| Kari Zev, Skyship Raider | yes | 4 (9) | 5.3 | 0.58 | 0.49 | +0.09 (-0.32 to +0.49) | too few forced decks |
| Mirkwood Pathmaker | yes | 4 (11) | 1.2 | 0.75 | 0.77 | -0.02 (-0.43 to +0.38) | too few forced decks |
| Plagued Rusalka |  | 4 (9) | 5.1 | 0.09 | 0.41 | -0.32 (-0.51 to -0.14) | too few forced decks |
| Rolling Thunder |  | 4 (10) | 2.2 | 0.60 | 0.44 | +0.16 (-0.18 to +0.50) | too few forced decks |
| Unearth | yes | 4 (10) | 3.6 | 0.50 | 0.44 | +0.06 (-0.25 to +0.37) | too few forced decks |
| Aerie Auxiliary | yes | 3 (8) | 2.0 | 0.56 | 0.74 | -0.18 (-0.59 to +0.23) | too few forced decks |
| Augur of Bolas | yes | 3 (9) | 4.6 | 0.67 | 0.41 | +0.26 (+0.15 to +0.36) | too few forced decks |
| Bilbo, Luckwearer | yes | 3 (9) | 6.2 | 0.42 | 0.59 | -0.17 (-0.37 to +0.03) | too few forced decks |
| Charming Prince |  | 3 (7) | 1.5 | 0.48 | 0.45 | +0.03 (-0.48 to +0.55) | too few forced decks |
| Ecstatic Awakener | yes | 3 (6) | 4.9 | 0.20 | 0.38 | -0.18 (-0.59 to +0.23) | too few forced decks |
| Empyrean Eagle | yes | 3 (7) | 2.5 | 0.83 | 0.42 | +0.41 (+0.01 to +0.80) | too few forced decks |
| Goblin Guide |  | 3 (6) | 1.6 | 0.83 | 0.70 | +0.13 (-0.27 to +0.53) | too few forced decks |
| Heroic Reinforcements | yes | 3 (7) | 2.5 | 0.86 | 0.85 | +0.01 (-0.27 to +0.29) | too few forced decks |
| Nishoba Brawler |  | 3 (7) | 1.1 | 0.91 | 0.58 | +0.33 (-0.00 to +0.67) | too few forced decks |
| Raise the Alarm | yes | 3 (8) | 2.2 | 0.49 | 0.65 | -0.16 (-0.51 to +0.19) | too few forced decks |
| Stormfront Pegasus |  | 3 (6) | 2.7 | 0.00 | 0.62 | -0.62 (-0.79 to -0.45) | too few forced decks |
| Ancestral Blade |  | 2 (5) | 0.6 | 0.34 | 0.40 | -0.05 (-0.60 to +0.49) | too few forced decks |
| Cast Out | yes | 2 (5) | 1.7 | 0.83 | 0.62 | +0.21 (-0.13 to +0.54) | too few forced decks |
| Frog Butler |  | 2 (5) | 0.9 | 0.40 | 0.75 | -0.35 (-0.81 to +0.12) | too few forced decks |
| Hellrider |  | 2 (4) | 1.4 | 0.54 | 0.63 | -0.09 (-0.82 to +0.64) | too few forced decks |
| Hero of the Dunes | yes | 2 (4) | 2.6 | 0.00 | 0.49 | -0.49 (-0.78 to -0.20) | too few forced decks |
| Ka-Zar of the Savage Land | yes | 2 (5) | 1.4 | 0.14 | 0.62 | -0.48 (-0.83 to -0.13) | too few forced decks |
| Mighty Mutanimals |  | 2 (5) | 1.4 | 0.56 | 0.47 | +0.08 (-0.37 to +0.54) | too few forced decks |
| Priest of Forgotten Gods |  | 2 (5) | 1.7 | 0.60 | 0.19 | +0.41 (-0.08 to +0.91) | too few forced decks |
| Shivan Dragon |  | 2 (5) | 3.4 | 0.65 | 0.50 | +0.15 (-0.33 to +0.64) | too few forced decks |
| Thundermaw Hellkite |  | 2 (4) | 1.0 | 1.00 | 0.62 | +0.38 (+0.14 to +0.63) | too few forced decks |
| Tolarian Terror |  | 2 (4) | 2.6 | 1.00 | 0.39 | +0.61 (+0.47 to +0.75) | too few forced decks |
| Ball Lightning |  | 1 (3) | 2.7 | 0.67 | 0.43 | +0.23 (+0.10 to +0.36) | too few forced decks |
| Bloodtithe Harvester |  | 1 (2) | 0.2 | 0.00 | – | – (– to –) | too few forced decks |
| Boseiju Reaches Skyward | yes | 1 (3) | 0.9 | 0.33 | 0.70 | -0.36 (-0.57 to -0.16) | too few forced decks |
| Elvish Mystic |  | 1 (3) | 0.2 | 0.33 | 1.00 | -0.67 (-0.67 to -0.67) | too few forced decks |
| Faith's Fetters | yes | 1 (3) | 1.4 | 0.33 | 0.24 | +0.09 (-0.14 to +0.33) | too few forced decks |
| Grafted Wargear |  | 1 (3) | 5.5 | 0.33 | 0.58 | -0.25 (-0.35 to -0.14) | too few forced decks |
| Grizzly Fate | yes | 1 (2) | 0.9 | 1.00 | 0.70 | +0.30 (+0.05 to +0.55) | too few forced decks |
| Icefall Regent |  | 1 (3) | 0.9 | 0.33 | 0.58 | -0.25 (-0.43 to -0.06) | too few forced decks |
| Large Bear | yes | 1 (3) | 0.8 | 0.67 | – | – (– to –) | too few forced decks |
| Momo, Playful Pet | yes | 1 (2) | 2.5 | 1.00 | 0.56 | +0.44 (+0.26 to +0.62) | too few forced decks |
| Pelakka Wurm | yes | 1 (2) | 1.2 | 1.00 | 0.61 | +0.39 (+0.18 to +0.61) | too few forced decks |
| Power Word Kill |  | 1 (3) | 1.5 | 0.33 | 0.51 | -0.18 (-0.41 to +0.06) | too few forced decks |
| Ravenous Chupacabra |  | 1 (3) | 0.8 | 0.33 | 0.17 | +0.16 (-0.06 to +0.37) | too few forced decks |
| Search Party Captain | yes | 1 (3) | 3.3 | 0.67 | 0.60 | +0.07 (-0.08 to +0.22) | too few forced decks |
| Sword of Feast and Famine |  | 1 (2) | 0.3 | 1.00 | 1.00 | +0.00 (+0.00 to +0.00) | too few forced decks |
| Thrashing Brontodon | yes | 1 (2) | 0.7 | 1.00 | 0.80 | +0.20 (+0.05 to +0.36) | too few forced decks |
| Triplicate Spirits | yes | 1 (3) | 2.5 | 0.67 | 0.49 | +0.17 (+0.03 to +0.31) | too few forced decks |
| Woe Strider |  | 1 (2) | 1.4 | 0.00 | 0.46 | -0.46 (-0.68 to -0.24) | too few forced decks |
| All-Fates Stalker | yes | 0 (0) | 1.4 | – | 0.45 | – (– to –) | too few forced decks |
| Attended Knight | yes | 0 (0) | 2.0 | – | 0.47 | – (– to –) | too few forced decks |
| Batterskull |  | 0 (0) | 0.9 | – | 0.59 | – (– to –) | too few forced decks |
| Carnage Tyrant | yes | 0 (0) | 0.7 | – | 0.25 | – (– to –) | too few forced decks |
| Coiling Oracle | yes | 0 (0) | 0.9 | – | 1.00 | – (– to –) | too few forced decks |
| Cranial Plating |  | 0 (0) | 0.3 | – | 0.24 | – (– to –) | too few forced decks |
| Falkenrath Aristocrat |  | 0 (0) | 0.2 | – | 0.00 | – (– to –) | too few forced decks |
| Flametongue Kavu |  | 0 (0) | 0.3 | – | 0.80 | – (– to –) | too few forced decks |
| Hangarback Walker |  | 0 (0) | 0.1 | – | 0.67 | – (– to –) | too few forced decks |
| Hornet Queen |  | 0 (0) | 0.1 | – | 1.00 | – (– to –) | too few forced decks |
| Karn, Scion of Urza |  | 0 (0) | 0.1 | – | 0.00 | – (– to –) | too few forced decks |
| Knockout Maneuver |  | 0 (0) | 0.2 | – | 0.60 | – (– to –) | too few forced decks |
| Polukranos, World Eater |  | 0 (0) | 0.2 | – | 1.00 | – (– to –) | too few forced decks |
| Settle Beyond Reality | yes | 0 (0) | 1.9 | – | 0.50 | – (– to –) | too few forced decks |
| Sheltered by Ghosts |  | 0 (0) | 0.3 | – | 1.00 | – (– to –) | too few forced decks |
| Spinewoods Paladin | yes | 0 (0) | 0.3 | – | 0.80 | – (– to –) | too few forced decks |
| Spinner of Souls | yes | 0 (0) | 0.5 | – | 0.69 | – (– to –) | too few forced decks |
| Steel Leaf Champion | yes | 0 (0) | 0.2 | – | 0.59 | – (– to –) | too few forced decks |
| Summon: Fenrir |  | 0 (0) | 0.2 | – | 0.00 | – (– to –) | too few forced decks |
| Syr Konrad, the Grim |  | 0 (0) | 1.0 | – | 0.61 | – (– to –) | too few forced decks |
| Thranduil, Sindarin Liege | yes | 0 (0) | 0.5 | – | 0.33 | – (– to –) | too few forced decks |
| Tough Cookie |  | 0 (0) | 0.5 | – | 0.51 | – (– to –) | too few forced decks |
| Ulvenwald Oddity |  | 0 (0) | 0.3 | – | 0.40 | – (– to –) | too few forced decks |

## Generation 1 — v1 → v2 (2026-10-16)

Discovery: 200 grid drafts, seeds 186000001–186000200, 337 decisive games; mean card win rate 0.50; 307 tests at a false-discovery rate of 0.1; design effect of a card's games 1.01; dominant-win against each card's colour pairs (D377); confirmation 47 fresh drafts, seeds 187000001–187000047, 113 decisive games.

Exploration (D356): 65 of 200 drafts explored, 114 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 135 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** 4 swap(s): 4 by the notes; 9 more lead(s) are insufficient data. Discovery: 1 candidate(s) of 307 tests at a false-discovery rate of 0.1; confirmation on 47 fresh drafts: 0 confirmed, 1 not. 44 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Discovered, then confirmed or not** (1 candidate(s); the confirmation batch was sized for 47 drafts):

| Card | Rule | Discovery (this generation's drafts) | Confirmation (fresh drafts) | Every confirmation attempt pooled | Outcome |
|---|---|---|---|---|---|
| Retrofitter Foundry | dominant-pick | first line in 157 of 179 grids (0.88 vs 0.75), p 2.0e-5, q 0.006 | first line in 39 of 46 grids (0.85 vs 0.75), p 0.082, Holm p 0.082 | first attempt | not confirmed: not significant on the fresh seeds (Holm p 0.082 > 0.05) |

| Out | Why | Evidence | In | Why this card |
|---|---|---|---|---|
| Ancestral Recall (Blue) | note-cut | notes: J136 POWER: removed wherever present, never added; dealt 179, picked 176, first line 144, in 134 deck(s); on colour in 134 pool(s), played in 134 (1.00, CI 0.97–1.00); won 106 of 225 decisive games (0.47, CI 0.41–0.54 by deck, design effect 1.01, shrunk 0.47) vs mean 0.50, its colour pairs 0.52 (D377) | Miscalculation (Blue) | same colour class; shares SPL CTRL; mv 2 for 1; rating 98 |
| Mox Emerald (Colorless) | note-cut | notes: J136 POWER: removed wherever present, never added; dealt 177, picked 171, first line 141, in 171 deck(s); on colour in 171 pool(s), played in 171 (1.00, CI 0.98–1.00); won 152 of 285 decisive games (0.53, CI 0.47–0.59 by deck, design effect 1.01, shrunk 0.53) vs mean 0.50, its colour pairs 0.50 (D377) | Chrome Mox (Colorless) | same colour class; shares ART RAMP; mv 0 for 0; rating 99.4 |
| Mox Jet (Colorless) | note-cut | notes: J136 POWER: removed wherever present, never added; dealt 177, picked 175, first line 148, in 175 deck(s); on colour in 175 pool(s), played in 175 (1.00, CI 0.98–1.00); won 148 of 292 decisive games (0.51, CI 0.45–0.56 by deck, design effect 1.01, shrunk 0.51) vs mean 0.50, its colour pairs 0.49 (D377) | Grim Monolith (Colorless) | same colour class; shares ART RAMP; mv 2 for 0; rating 98.9 |
| Time Walk (Blue) | note-cut | notes: J136 POWER: removed wherever present, never added; dealt 186, picked 180, first line 137, in 150 deck(s); on colour in 150 pool(s), played in 150 (1.00, CI 0.97–1.00); won 131 of 256 decisive games (0.51, CI 0.45–0.57 by deck, design effect 1.01, shrunk 0.51) vs mean 0.50, its colour pairs 0.51 (D377) | Chart a Course (Blue) | same colour class; shares SPL CTRL; mv 2 for 2; rating 92.1 |

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Control Magic | lean-dominant | dealt 171, picked 138, first line 72, in 112 deck(s); on colour in 116 pool(s), played in 112 (0.97, CI 0.92–0.99); won 124 of 205 decisive games (0.60, CI 0.54–0.67 by deck, design effect 1.01, shrunk 0.60) vs mean 0.50, its colour pairs 0.46 (D377) | 261 |
| Mogg War Marshal | lean-dominant | dealt 175, picked 93, first line 45, in 19 deck(s); on colour in 70 pool(s), played in 19 (0.27, CI 0.18–0.39); won 23 of 33 decisive games (0.70, CI 0.53–0.83 by deck, design effect 1.01, shrunk 0.62) vs mean 0.50, its colour pairs 0.51 (D377) | 536 |
| Dinrova Horror | lean-dominant | dealt 183, picked 95, first line 39, in 7 deck(s); on colour in 43 pool(s), played in 7 (0.16, CI 0.08–0.30); won 9 of 12 decisive games (0.75, CI 0.47–0.91 by deck, design effect 1.01, shrunk 0.59) vs mean 0.50, its colour pairs 0.44 (D377) | 555 |
| Ancestral Blade | lean-dominant | dealt 174, picked 83, first line 31, in 21 deck(s); on colour in 39 pool(s), played in 21 (0.54, CI 0.39–0.68); won 24 of 35 decisive games (0.69, CI 0.52–0.81 by deck, design effect 1.01, shrunk 0.62) vs mean 0.50, its colour pairs 0.50 (D377) | 595 |
| Battle Screech | lean-dominant | dealt 185, picked 153, first line 79, in 62 deck(s); on colour in 71 pool(s), played in 62 (0.87, CI 0.78–0.93); won 62 of 106 decisive games (0.58, CI 0.49–0.67 by deck, design effect 1.01, shrunk 0.57) vs mean 0.50, its colour pairs 0.45 (D377) | 603 |
| Hanweir Garrison | lean-dominant | dealt 183, picked 101, first line 47, in 14 deck(s); on colour in 63 pool(s), played in 14 (0.22, CI 0.14–0.34); won 19 of 29 decisive games (0.66, CI 0.47–0.80 by deck, design effect 1.01, shrunk 0.59) vs mean 0.50, its colour pairs 0.52 (D377) | 1156 |
| Stormfront Pegasus | lean-dominant | dealt 179, picked 85, first line 22, in 4 deck(s); on colour in 34 pool(s), played in 4 (0.12, CI 0.05–0.27); won 6 of 8 decisive games (0.75, CI 0.41–0.93 by deck, design effect 1.01, shrunk 0.57) vs mean 0.50, its colour pairs 0.52 (D377) | 1415 |
| Charming Prince | lean-dominant | dealt 178, picked 79, first line 31, in 9 deck(s); on colour in 34 pool(s), played in 9 (0.26, CI 0.15–0.43); won 9 of 15 decisive games (0.60, CI 0.36–0.80 by deck, design effect 1.01, shrunk 0.54) vs mean 0.50, its colour pairs 0.48 (D377) | 2845 |
| Empyrean Eagle | lean-dominant | dealt 176, picked 85, first line 32, in 1 deck(s); on colour in 23 pool(s), played in 1 (0.04, CI 0.01–0.21); won 2 of 3 decisive games (0.67, CI 0.21–0.94 by deck, design effect 1.01, shrunk 0.52) vs mean 0.50, its colour pairs 0.49 (D377) | 6854 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Micromancer (AI:RemoveDeck:Random) — ai-limited: dealt 185, picked 173, first line 113, in 148 deck(s); on colour in 148 pool(s), played in 148 (1.00, CI 0.97–1.00); won 122 of 241 decisive games (0.51, CI 0.44–0.57 by deck, design effect 1.01, shrunk 0.51) vs mean 0.50, its colour pairs 0.53 (D377)
- Nishoba Brawler (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dead: dealt 184, picked 81, first line 27, in 3 deck(s); on colour in 17 pool(s), played in 3 (0.18, CI 0.06–0.41); won 1 of 5 decisive games (0.20, CI 0.04–0.63 by deck, design effect 1.01, shrunk 0.44) vs mean 0.50, its colour pairs 0.49 (D377)
- Plagued Rusalka (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 184, picked 81, first line 29, in 0 deck(s); on colour in 59 pool(s), played in 0 (0.00, CI 0.00–0.06); no decisive games in a deck; dead p 9.2e-12

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Aerie Auxiliary, Ardent Elementalist, Attended Knight, Augur of Bolas, Bilbo, Luckwearer, Bloodwater Entity, Boseiju Reaches Skyward, Brilliance Unleashed, Cast Out, Coiling Oracle, Combat Thresher, Cult Conscript, Delver of Secrets, Dreadwing Scavenger, Ecstatic Awakener, Flitterwing Nuisance, Galvanic Discharge, Grizzly Fate, Hero of the Dunes, Heroic Reinforcements, Ka-Zar of the Savage Land, Kari Zev, Skyship Raider, Large Bear, Mire Triton, Mirkwood Pathmaker, Momo, Playful Pet, Moon-Circuit Hacker, Myr Sire, Okoye, Mighty and Adored, Pelakka Wurm, Raise the Alarm, Search Party Captain, Settle Beyond Reality, Spinewoods Paladin, Spinner of Souls, Steel Leaf Champion, Thranduil, Sindarin Liege, Thrashing Brontodon, Threadbind Clique, Triplicate Spirits, Trostani Discordant, Unearth, Vault Skirge, Yahenni, Undying Partisan.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.41 (rating 99.3, REAN CTRL)
- Wild Growth (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.37 (rating 97.1)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.07 (rating 96.3)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.02 (rating 94.4, GY CTRL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.92 (rating 98, CTRL SPL)
- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.90 (rating 97.6, SPL)
- Prophetic Prism (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.86 (rating 90.5, ART ETB)
- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.77 (rating 82.1, RAMP)
- Goblin Bombardment (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.51 (rating 75.4, SAC TOK)
- Mishra's Bauble (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.19 (rating 71.5, ART SAC SPL)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UB | 71 | 171 | 0.46 | 0.38–0.53 | 0.46 |
| UR | 71 | 178 | 0.54 | 0.47–0.62 | 0.54 |
| BR | 44 | 115 | 0.49 | 0.40–0.58 | 0.49 |
| WU | 30 | 76 | 0.50 | 0.39–0.61 | 0.50 |
| WB | 17 | 41 | 0.49 | 0.34–0.64 | 0.49 |
| WR | 15 | 36 | 0.61 | 0.45–0.75 | 0.57 |
| RG | 9 | 22 | 0.41 | 0.23–0.61 | 0.45 |
| UG | 7 | 18 | 0.50 | 0.29–0.71 | 0.50 |
| BG | 5 | 14 | 0.43 | 0.21–0.67 | 0.47 |
| WG | 1 | 3 | 0.67 | 0.21–0.94 | 0.52 |

## Generation 2 — v2 → v2 (2026-10-16)

Discovery: 200 grid drafts, seeds 186000201–186000400, 347 decisive games; mean card win rate 0.50; 316 tests at a false-discovery rate of 0.1; design effect of a card's games 1.01; dominant-win against each card's colour pairs (D377).

Exploration (D356): 61 of 200 drafts explored, 113 deck(s) played a forced low-rated card; the win-rate rules, the mean and the balance read the other 139 drafts, the play and pick rules every draft's choice decks. The judgement of the low-rated cards pools every generation (top of this changelog).

**Verdict.** Insufficient data: no card was confirmed at 200 drafts; 9 lead(s) to watch — about 1609 drafts per generation would find half of them. Run more drafts. 46 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Ocelot Pride | lean-dominant | dealt 183, picked 176, first line 138, in 90 deck(s); on colour in 90 pool(s), played in 90 (1.00, CI 0.96–1.00); won 90 of 144 decisive games (0.63, CI 0.54–0.70 by deck, design effect 1.01, shrunk 0.61) vs mean 0.50, its colour pairs 0.50 (D377) | 472 |
| Hornet Queen | lean-dominant | dealt 182, picked 100, first line 47, in 14 deck(s); on colour in 23 pool(s), played in 14 (0.61, CI 0.41–0.78); won 14 of 21 decisive games (0.67, CI 0.45–0.83 by deck, design effect 1.01, shrunk 0.59) vs mean 0.50, its colour pairs 0.47 (D377) | 864 |
| Frog Butler | lean-dominant | dealt 176, picked 86, first line 34, in 4 deck(s); on colour in 30 pool(s), played in 4 (0.13, CI 0.05–0.30); won 6 of 8 decisive games (0.75, CI 0.41–0.93 by deck, design effect 1.01, shrunk 0.57) vs mean 0.50, its colour pairs 0.46 (D377) | 982 |
| Aerie Auxiliary | lean-dominant | dealt 178, picked 78, first line 35, in 3 deck(s); on colour in 35 pool(s), played in 3 (0.09, CI 0.03–0.22); won 4 of 4 decisive games (1.00, CI 0.51–1.00 by deck, design effect 1.01, shrunk 0.58) vs mean 0.50, its colour pairs 0.53 (D377) | 1000 |
| Pelakka Wurm | lean-dominant | dealt 181, picked 87, first line 32, in 2 deck(s); on colour in 28 pool(s), played in 2 (0.07, CI 0.02–0.23); won 4 of 5 decisive games (0.80, CI 0.38–0.96 by deck, design effect 1.01, shrunk 0.56) vs mean 0.50, its colour pairs 0.52 (D377) | 1609 |
| Boseiju Reaches Skyward | lean-dominant | dealt 184, picked 80, first line 28, in 1 deck(s); on colour in 18 pool(s), played in 1 (0.06, CI 0.01–0.26); won 2 of 2 decisive games (1.00, CI 0.34–1.00 by deck, design effect 1.01, shrunk 0.55) vs mean 0.50, its colour pairs 0.53 (D377) | 2000 |
| Trostani Discordant | lean-dominant | dealt 175, picked 73, first line 24, in 3 deck(s); on colour in 4 pool(s), played in 3 (0.75, CI 0.30–0.95); won 2 of 2 decisive games (1.00, CI 0.34–1.00 by deck, design effect 1.01, shrunk 0.55) vs mean 0.50, its colour pairs 0.48 (D377) | 2000 |
| Stormfront Pegasus | lean-dominant | dealt 184, picked 80, first line 30, in 11 deck(s); on colour in 35 pool(s), played in 11 (0.31, CI 0.19–0.48); won 10 of 13 decisive games (0.77, CI 0.50–0.92 by deck, design effect 1.01, shrunk 0.61) vs mean 0.50, its colour pairs 0.62 (D377) | 2025 |
| Charming Prince | lean-dominant | dealt 183, picked 75, first line 29, in 8 deck(s); on colour in 38 pool(s), played in 8 (0.21, CI 0.11–0.36); won 6 of 9 decisive games (0.67, CI 0.35–0.88 by deck, design effect 1.01, shrunk 0.55) vs mean 0.50, its colour pairs 0.50 (D377) | 2551 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Grim Monolith (AI:RemoveDeck:Random) — ai-limited: dealt 180, picked 177, first line 153, in 177 deck(s); on colour in 177 pool(s), played in 177 (1.00, CI 0.98–1.00); won 148 of 311 decisive games (0.48, CI 0.42–0.53 by deck, design effect 1.01, shrunk 0.48) vs mean 0.50, its colour pairs 0.50 (D377)
- Micromancer (AI:RemoveDeck:Random) — ai-limited: dealt 183, picked 164, first line 107, in 139 deck(s); on colour in 139 pool(s), played in 139 (1.00, CI 0.97–1.00); won 112 of 246 decisive games (0.46, CI 0.39–0.52 by deck, design effect 1.01, shrunk 0.46) vs mean 0.50, its colour pairs 0.46 (D377)
- Nishoba Brawler (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says lean-dominant: dealt 177, picked 89, first line 42, in 2 deck(s); on colour in 29 pool(s), played in 2 (0.07, CI 0.02–0.22); won 4 of 4 decisive games (1.00, CI 0.51–1.00 by deck, design effect 1.01, shrunk 0.58) vs mean 0.50, its colour pairs 0.45 (D377)
- Plagued Rusalka (AI:RemoveDeck:Random) — ai-limited, the AI evidence alone says dead: dealt 182, picked 82, first line 34, in 1 deck(s); on colour in 62 pool(s), played in 1 (0.02, CI 0.00–0.09); won 0 of 2 decisive games (0.00, CI 0.00–0.66 by deck, design effect 1.01, shrunk 0.45) vs mean 0.50, its colour pairs 0.45 (D377); dead p 8.6e-11

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

All-Fates Stalker, Ardent Elementalist, Attended Knight, Augur of Bolas, Bilbo, Luckwearer, Bloodwater Entity, Brilliance Unleashed, Carnage Tyrant, Cast Out, Coiling Oracle, Combat Thresher, Cult Conscript, Delver of Secrets, Dinrova Horror, Dreadwing Scavenger, Ecstatic Awakener, Empyrean Eagle, Faith's Fetters, Flitterwing Nuisance, Galvanic Discharge, Grizzly Fate, Hanweir Garrison, Hero of the Dunes, Heroic Reinforcements, Ka-Zar of the Savage Land, Kari Zev, Skyship Raider, Large Bear, Mire Triton, Mirkwood Pathmaker, Mogg War Marshal, Momo, Playful Pet, Moon-Circuit Hacker, Myr Sire, Okoye, Mighty and Adored, Raise the Alarm, Search Party Captain, Settle Beyond Reality, Spinewoods Paladin, Thranduil, Sindarin Liege, Thrashing Brontodon, Threadbind Clique, Triplicate Spirits, Unearth, Vault Skirge, Vulshok Morningstar, Yahenni, Undying Partisan.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.79 (rating 98, CTRL SPL)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.62 (rating 99.3, REAN CTRL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.56 (rating 94.4, GY CTRL)
- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.15 (rating 97.6, SPL)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.01 (rating 96.3)
- Wild Growth (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.96 (rating 97.1)
- Prophetic Prism (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.71 (rating 90.5, ART ETB)
- Sylvan Library (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.68 (rating 58.9, CTRL)
- Toxic Deluge (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.36 (rating 52.2, CTRL)
- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.36 (rating 82.1, RAMP)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UR | 84 | 199 | 0.45 | 0.39–0.52 | 0.46 |
| UB | 56 | 146 | 0.44 | 0.36–0.52 | 0.45 |
| BR | 47 | 120 | 0.53 | 0.44–0.61 | 0.52 |
| WU | 32 | 80 | 0.68 | 0.57–0.77 | 0.64 |
| UG | 17 | 43 | 0.42 | 0.28–0.57 | 0.44 |
| WB | 16 | 41 | 0.59 | 0.43–0.72 | 0.56 |
| WR | 11 | 27 | 0.44 | 0.28–0.63 | 0.47 |
| BG | 7 | 18 | 0.61 | 0.39–0.80 | 0.55 |
| RG | 4 | 11 | 0.55 | 0.28–0.79 | 0.52 |
| WG | 4 | 9 | 0.56 | 0.27–0.81 | 0.52 |

