# Balanced by model v2 — pauper, even, version 1 (180 cards, two-player)

*Made by tools/cubelab.sh balance-model, model v2 (D475; tools/cubelab/balance-model.ts, balance-model-v2-cmd.ts) from the recorded deck census J144/J149 and the drafted games of lab-j145, lab-j159, lab-j160: no designed archetypes, no hand choices. Idea: every class's cards near the highest level each colour can hold, valued in drafted context on the pauper scale, pauper cards only where they fill the plan.*

*The values: drafted context (D475) — each card's census value (census pauper band (J144/J149)) times alpha 0.827, plus its own term from 32777 drafted games (decks clustered by draft), ridge-shrunk toward the census value at lambda 1600 (chosen by CV by draft); 200 draft-bootstrap replicates with the census's replicates as the prior. A card is "measured" with 200+ deck-games in the census or the drafted games.*

*The selection: sample.ts's two-colour structure (Omega's skeleton without its list: 24 a colour, 2 gold a pair, 18 colourless, 2 lands a pair + 2 others, Omega's curve, every count exact) filled by v1's min-cost flow at cost 1000 x |value - 0| + 300 x sd (an unmeasured card costs as if 0.06 off, a card outside the pauper band 0.04 more), at least 10 creatures a colour, lands by Forge's rating; then D475's robust search: like-for-like swaps (same colour class and mana value, within 3 points of the level and 25 Forge rating points of the card replaced) judged by the mean gap over 100 bootstrap replicates on the mix and concentration the lab drafter shows on the flow's cube, each kept only if it buys 0.002 of that mean, the result re-drafted and kept only if it beats the flow by as much on 100 replicates the search never saw: 11 swap(s) kept.*

*Predicted payoff when drafted by the lab drafter and played by Forge (the drafter's own decks: 2000 simulated grid drafts at seeds from 947500001; 65% three-colour decks), with 95% intervals that hold the values' bootstrap and the model's transfer error on a new cube (0.026 a colour, 0.038 a pair, from the leave-one-night-out validation's new cubes, added to each cell independently): W 0.496 (0.441–0.552), U 0.467 (0.413–0.521), B 0.499 (0.444–0.553), R 0.495 (0.440–0.550), G 0.518 (0.457–0.578); pairs WU 0.494 (0.413–0.575), WB 0.522 (0.439–0.604), WR 0.523 (0.441–0.605), WG 0.538 (0.456–0.621), UB 0.501 (0.421–0.582), UR 0.481 (0.401–0.561), UG 0.511 (0.428–0.593), BR 0.519 (0.436–0.601), BG 0.542 (0.459–0.626), RG 0.551 (0.470–0.633).*

*The gap (max |colour − .5| + max |pair − .5| over the pairs a night would judge, 400+ deck-games): point 0.052; over held-out bootstrap replicates 0.054 (0.031–0.081); with the transfer error as well 0.106 (0.052–0.174) — that last is what a night should expect to measure before its own noise.*

*A prediction, not a measurement. Model v2 was validated by leaving each measured night out (D475); its error on a new cube is the transfer error above, not the third decimal.*

## Format counts

| Section | Cards |
|---|---|
| White | 24 |
| Blue | 24 |
| Black | 24 |
| Red | 24 |
| Green | 24 |
| Gold (2 per colour pair) | 20 |
| Colorless | 18 |
| Lands | 22 |
| **Total** | **180** |

98 creatures, 1 planeswalkers. Nonland mana-value curve: 3 at 0, 24 at 1, 32 at 2, 34 at 3, 30 at 4, 17 at 5, 11 at 6, 7 at 7+.

Forge marks 0 of these AI:RemoveDeck:All (its AI plays them poorly or not at all).

A generated cube: the cards are the library model's choice under the lab's structural rules, for measuring head to head against other candidates. It drafts on Forge's ranks unless a ratings file is given.

## The themes

Tags are omega-seed-pool.tsv's where it has the card, else the Synergy Cube's, else none; a card with no tag is listed bare.

| Code | Theme |
|---|---|

## The list (name — themes)

### White (24)
Faerie Guidemother — EVA AGG · Icatian Scout · Mana Tithe — counter CTRL · Novice Inspector · Thraben Inspector — ART ETB · Tundra Wolves · Circle of Protection: Blue · Mesa Pegasus · Momentary Blink — ETB GY SPL · Take Up the Shield · Dust to Dust · Farrel's Zealot · Militia Bugler — ETB · Oblivion Ring — removal ETB · Porcelain Legionnaire · Moorish Cavalry · Palace Sentinels — ETB · Search Party Captain — TOK AGG · Borough Backup · Settle Beyond Reality — removal ETB · Solitude — ETB removal REAN · Eagles of the North — EVA AGG TOK · Salt Road Packbeast · Triplicate Spirits — TOK EVA

### Blue (24)
Brainstorm — SPL · Power Sink · Preordain — SPL · Psychic Purge · Unable to Scream · Essence Scatter · Mana Leak — counter SPL · Exclude — counter ETB · Pestermite — ETB EVA · Prodigal Sorcerer · Repulse · Winter Eladrin · Archaeomancer — ETB GY SPL · Azure Drake · Ghost Ship · Mist Raven — ETB EVA removal · Ninja of the Deep Hours — EVA ETB · Phantom Monster · Gush — CTRL · Lórien Revealed — CTRL · Mulldrifter — ETB CTRL EVA · Atlantis Attacks · Tolarian Terror — SPL GY · Treasure Cruise — SPL GY

### Black (24)
Dark Ritual — RAMP REAN · Infestation Sage · Nested Shambler — SAC TOK · Nezumi Linkbreaker · Plagued Rusalka — SAC removal · Cabal Ritual — GY RAMP · Deadly Dispute — SAC ART · Red Room Recruit · Chittering Rats — ETB · Cost of Brilliance · Crypt Rats — SAC removal · Frozen Shade · Oroku Saki, Shredder Rising · Thieving Sprite · Anchovy & Banana Pizza · Falkenrath Noble — SAC EVA · Gravedigger — ETB GY · Pestilence · Snuff Out — removal · Thorn of the Black Rose — ETB · Gray Merchant of Asphodel — ETB · Okiba-Gang Shinobi — EVA · Troll of Khazad-dûm — FAT · Gurmag Angler — GY

### Red (24)
Clockwork Percussionist · Monastery Swiftspear — AGG SPL · Voltage Surge · Firebrand Archer — SPL · Incinerate — removal SPL · Ironclaw Orcs · Dori, Bearer of Friends · Goblin Surprise · Guttersnipe — SPL · Hordeling Outburst — TOK SPL · Skewer the Critics — SPL AGG · Stone Rain · Ardent Elementalist — GY ETB SPL · Dead // Gone · Mine Collapse — removal SAC · Mountain Yeti · Orcish Oriflamme · Rukh Egg · Earth Elemental · Fire Elemental · Fissure · Pyrotechnics · Fireblast — AGG SPL · Oliphaunt — FAT

### Green (24)
Bushwhack — removal RAMP · Elves of Deep Shadow · Scryb Sprites · Argothian Pixies · Frog Butler · Sakura-Tribe Elder — RAMP LND SAC · Satyr Wayfinder — GY LND · Giant Turtle · Harrow · Springbloom Druid — LND ETB · Yavimaya Elder — RAMP GY SAC · Giant Spider · Trumpeting Herd · Wildheart Invoker — RAMP AGG · Argothian Treefolk · Conclave Naturalists — ETB removal · Durkwood Boars · Owlbear — ETB · Ragamuffin Raptor · Craw Wurm · Feral Thallid · Generous Ent — RAMP ART ETB · Annoyed Altisaur — RAMP ETB · Krosan Tusker — RAMP GY

### Gold (20)
WU: Judge's Familiar — EVA counter · Silver Drake — ETB EVA
WB: Lurrus of the Dream-Den — GY LIFE · Sorin, Lord of Innistrad — TOK LIFE
WR: Mechanized Ninja Cavalry · Pursue the Past
WG: Qasali Pridemage — AGG removal · Selesnya Evangel — TOK
UB: Sneaky Snacker · Dinrova Horror — ETB removal
UR: Izzet Charm — SPL removal counter · Fire // Ice — removal SPL
UG: Coiling Oracle · Mirkwood Nurturer
BR: Body Dropper — SAC · Terminate — removal
BG: Ice Cream Kitty · Desecrator Hag — GY ETB
RG: Branching Bolt — removal · Writhing Chrysalis — TOK SAC RAMP

### Colorless (18)
Lotus Petal — ART SAC · Ornithopter · Tormod's Crypt · Surgical Skullbomb · Aeolipile · Ichor Wellspring — ART SAC · Myr Sire — ART SAC TOK · Pentad Prism — ART RAMP · Perilous Myr — ART SAC · Vulshok Morningstar · Dragon Engine · Potioner's Trove · Renegade Freighter — ART AGG · Yotian Soldier · Juggernaut · Serrated Arrows — ART removal · Obsianus Golem · Ulamog's Crusher — RAMP

### Lands (22)
Azorius lands: Azorius Chancery — LND · Tranquil Cove — LND
Orzhov lands: Scoured Barrens — LND
Boros lands: Boros Garrison — LND · Wind-Scarred Crag — LND
Selesnya lands: Blossoming Sands — LND · Selesnya Sanctuary — LND
Dimir lands: Dimir Aqueduct — LND · Dismal Backwater — LND
Izzet lands: Izzet Boilerworks — LND · Swiftwater Cliffs — LND
Simic lands: Thornwood Falls — LND
Rakdos lands: Bloodfell Caves — LND · Rakdos Carnarium — LND
Golgari lands: Golgari Rot Farm — LND · Jungle Hollow — LND
Gruul lands: Gruul Turf — LND · Rugged Highlands — LND
Other lands: Ash Barrens — LND GY · Bountiful Landscape · Evolving Wilds — LND GY · Sheltering Landscape

## Iteration log

- version 1: made by `tools/cubelab.sh balance-model` (above).
