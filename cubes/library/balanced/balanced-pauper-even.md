# Balanced by model — pauper, even, version 1 (180 cards, two-player)

*Made by tools/cubelab.sh balance-model (tools/cubelab/balance-model.ts) from the recorded deck census J144/J149 (80,000 games, D447/D450) and J145: no designed archetypes, no hand choices. Idea: every class's cards near +0.0 points (the highest level each colour can hold), valued by the pauper census, pauper cards only where they fill the plan.*

*The model: census pauper band (J144/J149); a ridge linear-probability model of deck win on card indicators + makeup groups (colour count x main-colour share), the opponent's deck antisymmetric (a D377-style null); lambda 400, 200 deck-bootstrap replicates. A card is "measured" with 200+ deck-games.*

*The selection: sample.ts's two-colour structure (Omega's skeleton without its list: 24 a colour, 2 gold a pair, 18 colourless, 2 lands a pair + 2 others, Omega's curve, every count exact) filled by a min-cost flow at cost 1000 x |value - 0| + 300 x sd (an unmeasured card costs as if 0.06 off, a card outside the pauper band 0.04 more, a land from outside only where no band land fits), at least 10 creatures a colour, lands by Forge's rating; then 13 like-for-like swaps (same colour class and mana value, within 3 points of the level) that even the predicted payoffs out; not AI:RemoveDeck:All, supported by Forge 2.0.14.*

*Predicted payoff when drafted by the lab drafter and played by Forge (deck mix 9.1 cards of each colour, 0.5 gold, 4.2 colourless, J145's lab decks): colours W 0.501, U 0.499, B 0.500, R 0.500, G 0.501; worst pair gap 0.008. A prediction, not a measurement: it holds only when a J145-shaped night confirms it on fresh seeds (study/omega-balance-model.md).*

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

100 creatures, 0 planeswalkers. Nonland mana-value curve: 3 at 0, 24 at 1, 32 at 2, 34 at 3, 30 at 4, 17 at 5, 11 at 6, 7 at 7+.

Forge marks 0 of these AI:RemoveDeck:All (its AI plays them poorly or not at all).

A generated cube: the cards are the library model's choice under the lab's structural rules, for measuring head to head against other candidates. It drafts on Forge's ranks unless a ratings file is given.

## The themes

Tags are omega-seed-pool.tsv's where it has the card, else the Synergy Cube's, else none; a card with no tag is listed bare.

| Code | Theme |
|---|---|

## The list (name — themes)

### White (24)
Faerie Guidemother — EVA AGG · Icatian Javelineers · Mana Tithe — counter CTRL · Novice Inspector · Savannah Lions · Thraben Inspector — ART ETB · Tundra Wolves · Ancestral Blade — ART TOK AGG · Journey to Nowhere — removal ETB · Mesa Pegasus · Spirited Companion — ETB SAC · Dust to Dust · Farrel's Zealot · Oblivion Ring — removal ETB · Porcelain Legionnaire · Faith's Fetters — removal · Moorish Cavalry · Palace Sentinels — ETB · Search Party Captain — TOK AGG · Borough Backup · Settle Beyond Reality — removal ETB · Eagles of the North — EVA AGG TOK · Salt Road Packbeast · Triplicate Spirits — TOK EVA

### Blue (24)
Delver of Secrets — SPL EVA AGG · Faerie Seer — EVA · Preordain — SPL · Psychic Purge · Essence Scatter · Mana Leak — counter SPL · Moon-Circuit Hacker — EVA · Exclude — counter ETB · Man-o'-War — ETB removal · Pestermite — ETB EVA · Prodigal Sorcerer · Archaeomancer — ETB GY SPL · Azure Drake · Deep Analysis — GY SPL · Ghost Ship · Mist Raven — ETB EVA removal · Ninja of the Deep Hours — EVA ETB · Phantom Monster · Gush — CTRL · Lórien Revealed — CTRL · Mulldrifter — ETB CTRL EVA · Atlantis Attacks · Tolarian Terror — SPL GY · Treasure Cruise — SPL GY

### Black (24)
Blood Fountain — ART GY · Dark Ritual — RAMP REAN · Ecstatic Awakener — SAC · Infestation Sage · Nezumi Linkbreaker · Plagued Rusalka — SAC removal · Stab · Erg Raiders · Mintstrosity · Chittering Rats — ETB · Cost of Brilliance · Crypt Rats — SAC removal · Frozen Shade · Mindstab Thrull · Oroku Saki, Shredder Rising · Thieving Sprite · Anchovy & Banana Pizza · Gravedigger — ETB GY · Pestilence · Snuff Out — removal · Gray Merchant of Asphodel — ETB · Okiba-Gang Shinobi — EVA · Troll of Khazad-dûm — FAT · Gurmag Angler — GY

### Red (24)
Kird Ape · Firebrand Archer — SPL · Ironclaw Orcs · Thermo-Alchemist · Wrenn's Resolve — SPL · Dori, Bearer of Friends · Goblin Surprise · Guttersnipe — SPL · Hordeling Outburst — TOK SPL · Skewer the Critics — SPL AGG · Stone Rain · Ardent Elementalist — GY ETB SPL · Dead // Gone · Mine Collapse — removal SAC · Mountain Yeti · Orcish Oriflamme · Rukh Egg · Unexpected Windfall — ART GY SPL · Earth Elemental · Fire Elemental · Fissure · Pyrotechnics · Fireblast — AGG SPL · Oliphaunt — FAT

### Green (24)
Scryb Sprites · Farseek · Ram Through — removal · Satyr Wayfinder — GY LND · Giant Turtle · Ley Druid · Pulse of Murasa — GY · Springbloom Druid — LND ETB · Wood Elves — ETB LND · Yavimaya Elder — RAMP GY SAC · Giant Spider · Trumpeting Herd · Wildheart Invoker — RAMP AGG · Acidic Slime — ETB removal · Argothian Treefolk · Conclave Naturalists — ETB removal · Durkwood Boars · Ragamuffin Raptor · Spinewoods Paladin · Craw Wurm · Feral Thallid · Generous Ent — RAMP ART ETB · Annoyed Altisaur — RAMP ETB · Krosan Tusker — RAMP GY

### Gold (20)
WU: Judge's Familiar — EVA counter · Silver Drake — ETB EVA
WB: Elas il-Kor, Sadistic Pilgrim · Zealous Persecution
WR: Mechanized Ninja Cavalry · Pursue the Past
WG: Qasali Pridemage — AGG removal · Selesnya Evangel — TOK
UB: Sneaky Snacker · Dinrova Horror — ETB removal
UR: Izzet Charm — SPL removal counter · Fire // Ice — removal SPL
UG: Coiling Oracle · Mirkwood Nurturer
BR: Body Dropper — SAC · Terminate — removal
BG: Ice Cream Kitty · Desecrator Hag — GY ETB
RG: Branching Bolt — removal · Writhing Chrysalis — TOK SAC RAMP

### Colorless (18)
Lotus Petal — ART SAC · Ornithopter · Tormod's Crypt · Bonesplitter — ART AGG · Pyrite Spellbomb · Surgical Skullbomb · Aeolipile · Myr Sire — ART SAC TOK · Perilous Myr — ART SAC · Vulshok Morningstar · Dragon Engine · Potioner's Trove · Renegade Freighter — ART AGG · Yotian Soldier · Juggernaut · Serrated Arrows — ART removal · Obsianus Golem · Ulamog's Crusher — RAMP

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
