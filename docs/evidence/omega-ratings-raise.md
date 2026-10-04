# Ratings raised by exploration (D360, rule `explore-eb`)

Evidence: J039's changelog.md (pc-results results/J039/changelog.md, blob 7dc5612) (pooled table as printed). Base ratings: Forge's ranks (as `ratings init` writes them). Anchors (what each forced card replaced): a replay of seeds 3000001–3002000, 3002001–3004000, 3004001–3006000, 3006001–3008000 (no games), matched to the changelog.

Rule: only cards that **hold their own when played** (D356's verdict) move. Each delta is shrunk toward 0 by empirical Bayes over the 61 judged cards (tau 0.028); the target is the mean rating of the spells it replaced plus 317 rating points per unit of shrunk win rate ((top-pick line 98.6 − mean anchor 66.9) / 0.1); the cap is just under the top-pick line (the 90th percentile of the cube's nonland ratings) unless the 95% interval is above 0, then the best nonland rating (99.7); a rating is only ever raised.

## Raised (30)

| Card | Old | New | Raise | Delta (95% CI) | Shrunk | Replaced (mean rating) | Target | Forced decks (games) | Note |
|---|---|---|---|---|---|---|---|---|---|
| Delver of Secrets | 19.7 | 84 | +64.3 | +0.05 (-0.03 to +0.13) | +0.016 | 79.0 | 84.0 | 94 (232) |  |
| Ephemerate | 22.9 | 77.3 | +54.4 | +0.01 (-0.08 to +0.10) | +0.003 | 76.4 | 77.3 | 62 (152) |  |
| Batterskull | 49.7 | 79.8 | +30.1 | +0.07 (+0.01 to +0.13) | +0.031 | 69.9 | 79.8 | 170 (417) | strong: interval above 0 |
| Everflowing Chalice | 46.3 | 75.2 | +28.9 | -0.01 (-0.07 to +0.04) | -0.005 | 76.8 | 75.2 | 195 (477) |  |
| Baleful Strix | 54 | 81.8 | +27.8 | +0.15 (+0.01 to +0.30) | +0.018 | 76.0 | 81.8 | 37 (89) | strong: interval above 0 |
| Figure of Destiny | 49.4 | 77 | +27.6 | +0.07 (-0.05 to +0.20) | +0.011 | 73.5 | 77.0 | 49 (119) |  |
| Baneslayer Angel | 49.8 | 76.7 | +26.9 | +0.04 (-0.06 to +0.13) | +0.010 | 73.6 | 76.7 | 64 (152) |  |
| Glorybringer | 55.4 | 80.2 | +24.8 | +0.20 (+0.08 to +0.32) | +0.034 | 69.5 | 80.2 | 25 (62) | strong: interval above 0 |
| Birds of Paradise | 49.6 | 74.2 | +24.6 | +0.05 (-0.05 to +0.15) | +0.011 | 70.6 | 74.2 | 54 (132) |  |
| Bloodghast | 40 | 62.4 | +22.4 | +0.00 (-0.08 to +0.09) | +0.000 | 62.4 | 62.4 | 80 (195) |  |
| Siege-Gang Commander | 49.3 | 71.5 | +22.2 | +0.08 (-0.06 to +0.22) | +0.010 | 68.2 | 71.5 | 22 (54) |  |
| Karn, Scion of Urza | 58.3 | 79.2 | +20.9 | +0.11 (-0.02 to +0.23) | +0.017 | 73.7 | 79.2 | 29 (75) |  |
| Young Pyromancer | 42.4 | 63.1 | +20.7 | +0.07 (-0.03 to +0.17) | +0.016 | 58.0 | 63.1 | 58 (141) |  |
| Sword of Feast and Famine | 51.8 | 71.8 | +20 | +0.07 (+0.02 to +0.13) | +0.034 | 60.9 | 71.8 | 140 (353) | strong: interval above 0 |
| Platinum Angel | 49.8 | 67.4 | +17.6 | -0.02 (-0.07 to +0.04) | -0.010 | 70.5 | 67.4 | 192 (471) |  |
| Hero of Bladehold | 47.9 | 65.5 | +17.6 | +0.04 (-0.05 to +0.13) | +0.011 | 62.1 | 65.5 | 80 (189) |  |
| Thundermaw Hellkite | 49.1 | 66.7 | +17.6 | +0.05 (-0.04 to +0.15) | +0.012 | 62.8 | 66.7 | 59 (148) |  |
| Flickerwisp | 43.4 | 59.9 | +16.5 | -0.01 (-0.09 to +0.06) | -0.003 | 60.9 | 59.9 | 108 (261) |  |
| Sword of Fire and Ice | 54.3 | 69.5 | +15.2 | +0.04 (-0.03 to +0.12) | +0.014 | 65.2 | 69.5 | 105 (254) |  |
| Sword of Light and Shadow | 49.7 | 64.7 | +15 | -0.01 (-0.09 to +0.07) | -0.003 | 65.7 | 64.7 | 81 (205) |  |
| Garruk Relentless | 49.8 | 64.6 | +14.8 | +0.06 (-0.04 to +0.16) | +0.014 | 60.3 | 64.6 | 58 (137) |  |
| Smuggler's Copter | 49.3 | 63.3 | +14 | -0.03 (-0.10 to +0.04) | -0.011 | 66.9 | 63.3 | 94 (243) |  |
| Shriekmaw | 58.5 | 72.2 | +13.7 | +0.02 (-0.09 to +0.12) | +0.004 | 70.9 | 72.2 | 54 (132) |  |
| Hellrider | 46.6 | 60.3 | +13.7 | +0.07 (-0.05 to +0.19) | +0.012 | 56.6 | 60.3 | 26 (65) |  |
| Council's Judgment | 46.2 | 59.8 | +13.6 | -0.03 (-0.10 to +0.05) | -0.010 | 63.0 | 59.8 | 110 (277) |  |
| Coalition Relic | 53.5 | 65.2 | +11.7 | +0.03 (-0.03 to +0.09) | +0.013 | 60.9 | 65.2 | 178 (425) |  |
| Questing Beast | 47.4 | 58.3 | +10.9 | +0.01 (-0.08 to +0.11) | +0.002 | 57.6 | 58.3 | 57 (142) |  |
| Incinerate | 54 | 64.4 | +10.4 | -0.01 (-0.10 to +0.08) | -0.003 | 65.3 | 64.4 | 39 (107) |  |
| Dark Confidant | 56 | 65.1 | +9.1 | +0.01 (-0.09 to +0.12) | +0.002 | 64.5 | 65.1 | 51 (127) |  |
| Cryptic Command | 54.3 | 61.9 | +7.6 | -0.02 (-0.08 to +0.05) | -0.008 | 64.5 | 61.9 | 112 (274) |  |

## Unchanged (36 judged or listed)

| Card | Rating | Verdict | Delta (95% CI) | Forced decks | Why |
|---|---|---|---|---|---|
| Acidic Slime | 48.4 | undecided | -0.03 (-0.15 to +0.10) | 36 | undecided: a loss of more than the margin is not ruled out (BH) |
| Ball Lightning | 47.9 | undecided | -0.04 (-0.14 to +0.06) | 56 | undecided: a loss of more than the margin is not ruled out (BH) |
| Chandra, Torch of Defiance | 52.1 | undecided | -0.04 (-0.16 to +0.08) | 44 | undecided: a loss of more than the margin is not ruled out (BH) |
| Doom Blade | 54.9 | undecided | -0.03 (-0.12 to +0.05) | 83 | undecided: a loss of more than the margin is not ruled out (BH) |
| Expressive Iteration | 39.6 | undecided | -0.09 (-0.22 to +0.03) | 45 | undecided: a loss of more than the margin is not ruled out (BH) |
| Fact or Fiction | 54.7 | undecided | -0.04 (-0.13 to +0.05) | 77 | undecided: a loss of more than the margin is not ruled out (BH) |
| Falkenrath Aristocrat | 48.1 | undecided | -0.06 (-0.27 to +0.14) | 12 | undecided: a loss of more than the margin is not ruled out (BH) |
| Fatal Push | 51 | undecided | -0.05 (-0.12 to +0.01) | 108 | undecided: a loss of more than the margin is not ruled out (BH) |
| Fire // Ice | 43.1 | weak | -0.16 (-0.29 to -0.03) | 35 | weak when played: a human test for the notes; never lowered by this rule |
| Flametongue Kavu | 55.8 | undecided | -0.02 (-0.17 to +0.13) | 29 | undecided: a loss of more than the margin is not ruled out (BH) |
| Garruk Wildspeaker | 49.8 | undecided | -0.01 (-0.14 to +0.12) | 28 | undecided: a loss of more than the margin is not ruled out (BH) |
| Goblin Guide | 56.8 | undecided | -0.07 (-0.16 to +0.02) | 58 | undecided: a loss of more than the margin is not ruled out (BH) |
| Grave Titan | 49.6 | undecided | -0.04 (-0.13 to +0.05) | 77 | undecided: a loss of more than the margin is not ruled out (BH) |
| Grist, the Hunger Tide | 51.5 | too-few | +0.00 (-0.44 to +0.45) | 5 | too few forced decks to judge |
| Hangarback Walker | 52 | undecided | -0.04 (-0.11 to +0.03) | 120 | undecided: a loss of more than the margin is not ruled out (BH) |
| Huntmaster of the Fells | 47.2 | too-few | -0.14 (-0.36 to +0.08) | 3 | too few forced decks to judge |
| Knight of the Reliquary | 43.4 | undecided | -0.03 (-0.18 to +0.11) | 35 | undecided: a loss of more than the margin is not ruled out (BH) |
| Liliana of the Veil | 59.2 | undecided | -0.16 (-0.34 to +0.02) | 18 | undecided: a loss of more than the margin is not ruled out (BH) |
| Maelstrom Pulse | 48.3 | undecided | -0.15 (-0.32 to +0.02) | 27 | undecided: a loss of more than the margin is not ruled out (BH) |
| Mystic Snake | 44 | undecided | -0.11 (-0.28 to +0.05) | 23 | undecided: a loss of more than the margin is not ruled out (BH) |
| Polukranos, World Eater | 49.1 | undecided | -0.05 (-0.16 to +0.07) | 48 | undecided: a loss of more than the margin is not ruled out (BH) |
| Primeval Titan | 55.7 | undecided | -0.05 (-0.18 to +0.09) | 23 | undecided: a loss of more than the margin is not ruled out (BH) |
| Rancor | 46.8 | undecided | -0.05 (-0.14 to +0.04) | 58 | undecided: a loss of more than the margin is not ruled out (BH) |
| Ravenous Chupacabra | 53 | undecided | -0.08 (-0.17 to +0.01) | 71 | undecided: a loss of more than the margin is not ruled out (BH) |
| Reflector Mage | 32.5 | undecided | -0.01 (-0.11 to +0.08) | 94 | undecided: a loss of more than the margin is not ruled out (BH) |
| Restoration Angel | 48.5 | undecided | -0.03 (-0.11 to +0.06) | 78 | undecided: a loss of more than the margin is not ruled out (BH) |
| Sakura-Tribe Elder | 48.9 | undecided | +0.00 (-0.18 to +0.18) | 19 | undecided: a loss of more than the margin is not ruled out (BH) |
| Seasoned Pyromancer | 55.6 | too-few | +0.10 (-0.27 to +0.46) | 5 | too few forced decks to judge |
| Shivan Dragon | 49.9 | undecided | -0.03 (-0.12 to +0.06) | 67 | undecided: a loss of more than the margin is not ruled out (BH) |
| Solemn Simulacrum | 54.7 | undecided | -0.04 (-0.16 to +0.07) | 37 | undecided: a loss of more than the margin is not ruled out (BH) |
| Sorin, Lord of Innistrad | 49.7 | undecided | -0.13 (-0.30 to +0.03) | 34 | undecided: a loss of more than the margin is not ruled out (BH) |
| The Wandering Emperor | 53.1 | undecided | -0.02 (-0.12 to +0.08) | 46 | undecided: a loss of more than the margin is not ruled out (BH) |
| Titania, Protector of Argoth | 58.1 | too-few | -0.04 (-0.36 to +0.29) | 4 | too few forced decks to judge |
| Treasure Cruise | 50.1 | undecided | -0.04 (-0.11 to +0.02) | 139 | undecided: a loss of more than the margin is not ruled out (BH) |
| Uro, Titan of Nature's Wrath | 54.2 | too-few | +0.11 (-0.28 to +0.51) | 5 | too few forced decks to judge |
| Voice of Resurgence | 49.4 | undecided | +0.05 (-0.11 to +0.21) | 33 | undecided: a loss of more than the margin is not ruled out (BH) |
