# Omega — the greatest-hits cube, version 1 (180 cards, two-player) — evolve changelog

Written by `tools/cubelab.sh evolve` (D299–D300, D331). Each generation plays its drafts on the cube going in and swaps only what the evidence supports; docs/guides/cube-lab.md *Evolve* says how.

A card is cut on the AI's evidence only after two separate looks. **Discovery**: in this generation's drafts the card stands out by more than chance can explain, allowing for the fact that some 180 cards are looked at at once (a false-discovery rate of 10%: of the cards flagged, at most about one in 10 could be a fluke). A discovery is a *candidate*, not a verdict. **Confirmed**: the candidate stands out again, the same way, in a second batch of fresh drafts that played no part in finding it. Only confirmed cards are cut; a candidate that does not confirm stays, and is reported. Win rates count each deck's match as one clump of games (the same deck against the same opponent), so their intervals are wider than a count of games would make them.

## Generation 1 — v1 → v1 (2026-10-04)

Discovery: 600 grid drafts, seeds 20001–20600, 1468 decisive games; mean card win rate 0.50; 390 tests at a false-discovery rate of 0.1; design effect of a card's games 1.09; confirmation 145 fresh drafts, seeds 1020001–1020145, 363 decisive games.

**Verdict.** Insufficient data: no card was confirmed at 600 drafts; 4 lead(s) to watch — about 1233 drafts per generation would find half of them. Run more drafts. Discovery: 1 candidate(s) of 390 tests at a false-discovery rate of 0.1; confirmation on 145 fresh drafts: 0 confirmed, 1 not. 33 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Discovered, then confirmed or not** (1 candidate(s); the confirmation batch was sized for 145 drafts):

| Card | Rule | Discovery (this generation's drafts) | Confirmation (fresh drafts) | Outcome |
|---|---|---|---|---|
| Sheoldred, the Apocalypse | dominant-win | won 398 of 692 decisive games (0.58 vs 0.50), p 8.5e-5, q 0.033 | won 73 of 162 decisive games (0.45 vs 0.50), p 0.909, Holm p 0.909 | not confirmed: not significant on the fresh seeds (Holm p 0.909 > 0.05) |

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Voice of Resurgence | lean-dominant | dealt 546, picked 236, first line 57, in 10 deck(s); on colour in 37 pool(s), played in 10 (0.27, CI 0.15–0.43); won 17 of 21 decisive games (0.81, CI 0.59–0.93 by deck, design effect 1.09, shrunk 0.66) vs mean 0.50 | 995 |
| Garruk Wildspeaker | lean-dominant | dealt 552, picked 224, first line 66, in 30 deck(s); on colour in 97 pool(s), played in 30 (0.31, CI 0.23–0.41); won 46 of 70 decisive games (0.66, CI 0.54–0.76 by deck, design effect 1.09, shrunk 0.62) vs mean 0.50 | 1147 |
| Incinerate | lean-dominant | dealt 549, picked 245, first line 78, in 38 deck(s); on colour in 97 pool(s), played in 38 (0.39, CI 0.30–0.49); won 57 of 90 decisive games (0.63, CI 0.53–0.73 by deck, design effect 1.09, shrunk 0.61) vs mean 0.50 | 1233 |
| Fire // Ice | lean-dominant | dealt 538, picked 155, first line 50, in 1 deck(s); on colour in 25 pool(s), played in 1 (0.04, CI 0.01–0.20); won 2 of 2 decisive games (1.00, CI 0.32–1.00 by deck, design effect 1.09, shrunk 0.55) vs mean 0.50 | 6000 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Demonic Tutor (AI:RemoveDeck:Random) — ai-limited: dealt 557, picked 502, first line 353, in 283 deck(s); on colour in 284 pool(s), played in 283 (1.00, CI 0.98–1.00); won 357 of 692 decisive games (0.52, CI 0.48–0.56 by deck, design effect 1.09, shrunk 0.52) vs mean 0.50

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Acidic Slime, Ball Lightning, Batterskull, Birds of Paradise, Bloodghast, Coalition Relic, Council's Judgment, Cryptic Command, Delver of Secrets, Doom Blade, Ephemerate, Everflowing Chalice, Expressive Iteration, Fatal Push, Figure of Destiny, Flickerwisp, Garruk Relentless, Goblin Guide, Grave Titan, Knight of the Reliquary, Maelstrom Pulse, Mystic Snake, Platinum Angel, Polukranos, World Eater, Questing Beast, Rancor, Ravenous Chupacabra, Reflector Mage, Restoration Angel, Shivan Dragon, Thundermaw Hellkite, Treasure Cruise, Young Pyromancer.

**Lands never played** (lands go by notes only: the lab's deckbuilder plays a dual or fetchland only in its own pair's decks and a colourless land never, so a land's numbers are its pair's): Mishra's Factory, Mutavault.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.42 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.22 (rating 98, CTRL SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.04 (rating 94.4, GY CTRL)
- Prophetic Prism (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.03 (rating 90.5, ART ETB)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.97 (rating 99.3, REAN CTRL)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.85 (rating 96.3)
- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.73 (rating 82.1, RAMP)
- Goblin Bombardment (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.66 (rating 75.4, SAC TOK)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.51 (rating 85.4, ART)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.43 (rating 69.2, ETB SPL)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| WU | 262 | 649 | 0.47 | 0.44–0.51 | 0.48 |
| UB | 255 | 621 | 0.52 | 0.49–0.56 | 0.52 |
| UR | 119 | 288 | 0.50 | 0.44–0.55 | 0.50 |
| WG | 115 | 275 | 0.43 | 0.37–0.48 | 0.43 |
| WR | 106 | 258 | 0.55 | 0.49–0.61 | 0.55 |
| WB | 101 | 242 | 0.54 | 0.48–0.60 | 0.54 |
| UG | 75 | 187 | 0.45 | 0.39–0.53 | 0.46 |
| BG | 62 | 151 | 0.49 | 0.41–0.57 | 0.49 |
| RG | 60 | 149 | 0.55 | 0.47–0.63 | 0.54 |
| BR | 45 | 116 | 0.52 | 0.43–0.61 | 0.51 |

## Generation 2 — v1 → v1 (2026-10-04)

Discovery: 600 grid drafts, seeds 20601–21200, 1485 decisive games; mean card win rate 0.50; 387 tests at a false-discovery rate of 0.1; design effect of a card's games 1.04.

**Verdict.** No swaps: nothing is dead or dominant at 600 drafts, and nothing leans that way. 40 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Demonic Tutor (AI:RemoveDeck:Random) — ai-limited: dealt 529, picked 497, first line 338, in 236 deck(s); on colour in 236 pool(s), played in 236 (1.00, CI 0.98–1.00); won 280 of 586 decisive games (0.48, CI 0.44–0.52 by deck, design effect 1.04, shrunk 0.48) vs mean 0.50

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Acidic Slime, Ball Lightning, Batterskull, Birds of Paradise, Bloodghast, Chandra, Torch of Defiance, Coalition Relic, Council's Judgment, Cryptic Command, Delver of Secrets, Doom Blade, Ephemerate, Everflowing Chalice, Expressive Iteration, Falkenrath Aristocrat, Fatal Push, Figure of Destiny, Fire // Ice, Flickerwisp, Garruk Relentless, Garruk Wildspeaker, Goblin Guide, Grave Titan, Incinerate, Knight of the Reliquary, Maelstrom Pulse, Mystic Snake, Platinum Angel, Polukranos, World Eater, Questing Beast, Rancor, Ravenous Chupacabra, Reflector Mage, Restoration Angel, Shivan Dragon, Sorin, Lord of Innistrad, Thundermaw Hellkite, Treasure Cruise, Voice of Resurgence, Young Pyromancer.

**Lands never played** (lands go by notes only: the lab's deckbuilder plays a dual or fetchland only in its own pair's decks and a colourless land never, so a land's numbers are its pair's): Mishra's Factory, Mutavault.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.29 (rating 98, CTRL SPL)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.21 (rating 99.3, REAN CTRL)
- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.07 (rating 97.6, SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.06 (rating 94.4, GY CTRL)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.85 (rating 96.3)
- Prophetic Prism (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.64 (rating 90.5, ART ETB)
- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.58 (rating 82.1, RAMP)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.42 (rating 85.4, ART)
- Goblin Bombardment (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.07 (rating 75.4, SAC TOK)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 2.92 (rating 69.2, ETB SPL)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| WU | 250 | 614 | 0.46 | 0.42–0.50 | 0.46 |
| UB | 240 | 594 | 0.51 | 0.47–0.55 | 0.51 |
| UR | 141 | 347 | 0.53 | 0.47–0.58 | 0.53 |
| WR | 132 | 330 | 0.53 | 0.47–0.58 | 0.53 |
| WG | 100 | 248 | 0.53 | 0.47–0.59 | 0.53 |
| WB | 96 | 242 | 0.48 | 0.41–0.54 | 0.48 |
| UG | 92 | 230 | 0.49 | 0.43–0.56 | 0.49 |
| BG | 62 | 148 | 0.47 | 0.39–0.55 | 0.48 |
| RG | 59 | 150 | 0.50 | 0.42–0.58 | 0.50 |
| BR | 28 | 67 | 0.58 | 0.46–0.69 | 0.56 |

## Generation 3 — v1 → v1 (2026-10-04)

Discovery: 600 grid drafts, seeds 21201–21800, 1497 decisive games; mean card win rate 0.50; 388 tests at a false-discovery rate of 0.1; design effect of a card's games 1.01.

**Verdict.** Insufficient data: no card was confirmed at 600 drafts; 1 lead(s) to watch — about 3428 drafts per generation would find half of them. Run more drafts. 34 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Huntmaster of the Fells | lean-dominant | dealt 529, picked 229, first line 80, in 12 deck(s); on colour in 21 pool(s), played in 12 (0.57, CI 0.36–0.76); won 19 of 30 decisive games (0.63, CI 0.45–0.78 by deck, design effect 1.01, shrunk 0.58) vs mean 0.50 | 3428 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Demonic Tutor (AI:RemoveDeck:Random) — ai-limited: dealt 558, picked 509, first line 355, in 283 deck(s); on colour in 283 pool(s), played in 283 (1.00, CI 0.99–1.00); won 384 of 709 decisive games (0.54, CI 0.51–0.58 by deck, design effect 1.01, shrunk 0.54) vs mean 0.50

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Acidic Slime, Ball Lightning, Batterskull, Birds of Paradise, Bloodghast, Council's Judgment, Cryptic Command, Delver of Secrets, Doom Blade, Ephemerate, Everflowing Chalice, Expressive Iteration, Fatal Push, Figure of Destiny, Fire // Ice, Flickerwisp, Garruk Relentless, Goblin Guide, Grave Titan, Knight of the Reliquary, Maelstrom Pulse, Mystic Snake, Platinum Angel, Polukranos, World Eater, Questing Beast, Rancor, Ravenous Chupacabra, Reflector Mage, Restoration Angel, Shivan Dragon, Sorin, Lord of Innistrad, Treasure Cruise, Voice of Resurgence, Young Pyromancer.

**Lands never played** (lands go by notes only: the lab's deckbuilder plays a dual or fetchland only in its own pair's decks and a colourless land never, so a land's numbers are its pair's): Mishra's Factory, Mutavault.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 5.10 (rating 97.6, SPL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.90 (rating 98, CTRL SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.30 (rating 94.4, GY CTRL)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.15 (rating 99.3, REAN CTRL)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.85 (rating 96.3)
- Prophetic Prism (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.62 (rating 90.5, ART ETB)
- Ghostly Flicker (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.57 (rating 69.2, ETB SPL)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.42 (rating 85.4, ART)
- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.28 (rating 82.1, RAMP)
- Mishra's Bauble (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.12 (rating 71.5, ART SAC SPL)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| UB | 271 | 680 | 0.47 | 0.43–0.51 | 0.47 |
| WU | 253 | 622 | 0.49 | 0.45–0.53 | 0.49 |
| UR | 128 | 317 | 0.47 | 0.42–0.53 | 0.47 |
| WR | 127 | 327 | 0.50 | 0.45–0.56 | 0.50 |
| WB | 99 | 245 | 0.56 | 0.50–0.62 | 0.56 |
| WG | 83 | 204 | 0.51 | 0.45–0.58 | 0.51 |
| UG | 76 | 184 | 0.41 | 0.34–0.48 | 0.42 |
| RG | 63 | 156 | 0.62 | 0.54–0.69 | 0.60 |
| BG | 60 | 156 | 0.53 | 0.45–0.61 | 0.53 |
| BR | 40 | 103 | 0.56 | 0.47–0.66 | 0.55 |

## Generation 4 — v1 → v1 (2026-10-04)

Discovery: 600 grid drafts, seeds 21801–22400, 1506 decisive games; mean card win rate 0.50; 390 tests at a false-discovery rate of 0.1; design effect of a card's games 1.00.

**Verdict.** Insufficient data: no card was confirmed at 600 drafts; 1 lead(s) to watch — about 2788 drafts per generation would find half of them. Run more drafts. 37 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).

**Insufficient data (watch).** Leads that did not pass their threshold:

| Card | Lean | Evidence | Drafts per generation to settle |
|---|---|---|---|
| Sorin, Lord of Innistrad | lean-dominant | dealt 550, picked 229, first line 54, in 12 deck(s); on colour in 43 pool(s), played in 12 (0.28, CI 0.17–0.43); won 20 of 31 decisive games (0.65, CI 0.47–0.79 by deck, shrunk 0.59) vs mean 0.50 | 2788 |

**AI-limited cards** (Forge AI:RemoveDeck; never cut on AI evidence — a note decides):

- Demonic Tutor (AI:RemoveDeck:Random) — ai-limited: dealt 531, picked 502, first line 328, in 263 deck(s); on colour in 263 pool(s), played in 263 (1.00, CI 0.99–1.00); won 314 of 655 decisive games (0.48, CI 0.44–0.52 by deck, shrunk 0.48) vs mean 0.50

**Rating-limited** (rarely or never played when on colour, but rated low: the drafters pick by rating, so these may be weak or only underrated; never cut on this evidence. To test one, raise its rating in a ratings TSV — `tools/cubelab.sh ratings init <cube.md>` writes one — and pass `--ratings <tsv>`):

Acidic Slime, Ball Lightning, Batterskull, Birds of Paradise, Bloodghast, Chandra, Torch of Defiance, Coalition Relic, Council's Judgment, Cryptic Command, Delver of Secrets, Doom Blade, Ephemerate, Everflowing Chalice, Expressive Iteration, Fatal Push, Figure of Destiny, Fire // Ice, Flickerwisp, Garruk Relentless, Goblin Guide, Grave Titan, Hellrider, Incinerate, Knight of the Reliquary, Maelstrom Pulse, Mystic Snake, Platinum Angel, Polukranos, World Eater, Questing Beast, Rancor, Ravenous Chupacabra, Reflector Mage, Restoration Angel, Shivan Dragon, Treasure Cruise, Voice of Resurgence, Young Pyromancer.

**Lands never played** (lands go by notes only: the lab's deckbuilder plays a dual or fetchland only in its own pair's decks and a colourless land never, so a land's numbers are its pair's): Mishra's Factory, Mutavault.

**Human-test candidates** (AI:RemoveDeck:All, never auto-added; add a `try` line to the notes file to test one):

- Gitaxian Probe (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.48 (rating 97.6, SPL)
- Tamiyo, Collector of Tales (UG) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.25 (rating 94.4, GY CTRL)
- Mystic Confluence (U) — AI:RemoveDeck:All — the AI cannot judge it; fit 4.25 (rating 98, CTRL SPL)
- Vampiric Tutor (B) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.97 (rating 99.3, REAN CTRL)
- Fire Covenant (BR) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.85 (rating 96.3)
- Goblin Bombardment (R) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.63 (rating 75.4, SAC TOK)
- Prophetic Prism (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.62 (rating 90.5, ART ETB)
- Utopia Sprawl (G) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.53 (rating 82.1, RAMP)
- Masticore (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.42 (rating 85.4, ART)
- Mishra's Bauble (C) — AI:RemoveDeck:All — the AI cannot judge it; fit 3.13 (rating 71.5, ART SAC SPL)

**Balance by colour pair** (decisive games of the played decks):

| Pair | Decks | Games | Win rate | 95% CI | Shrunk |
|---|---|---|---|---|---|
| WU | 258 | 654 | 0.49 | 0.46–0.53 | 0.49 |
| UB | 237 | 592 | 0.49 | 0.46–0.54 | 0.50 |
| UR | 135 | 332 | 0.51 | 0.45–0.56 | 0.51 |
| WR | 110 | 276 | 0.53 | 0.47–0.58 | 0.52 |
| WG | 107 | 270 | 0.49 | 0.43–0.55 | 0.49 |
| WB | 100 | 249 | 0.53 | 0.47–0.59 | 0.53 |
| UG | 85 | 215 | 0.48 | 0.41–0.55 | 0.48 |
| BG | 68 | 172 | 0.46 | 0.39–0.53 | 0.46 |
| RG | 51 | 130 | 0.52 | 0.43–0.60 | 0.51 |
| BR | 49 | 122 | 0.52 | 0.44–0.61 | 0.52 |

