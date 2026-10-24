# Balanced by model — legacy, even and strong, version 1 (180 cards, two-player)

*Made by tools/cubelab.sh balance-model (tools/cubelab/balance-model.ts) from the recorded deck census J144/J149 (80,000 games, D447/D450) and J145: no designed archetypes, no hand choices. Idea: every class's cards near +2.0 points (the highest level each colour can hold), valued by the legacy + powered census.*

*The model: census legacy + powered bands together, makeup groups by band; a ridge linear-probability model of deck win on card indicators + makeup groups (colour count x main-colour share), the opponent's deck antisymmetric (a D377-style null); lambda 800, 200 deck-bootstrap replicates. A card is "measured" with 200+ deck-games.*

*The selection: sample.ts's two-colour structure (Omega's skeleton without its list: 24 a colour, 2 gold a pair, 18 colourless, 2 lands a pair + 2 others, Omega's curve, every count exact) filled by a min-cost flow at cost 1000 x |value - 0.02| + 300 x sd (an unmeasured card costs as if 0.06 off, a card outside the legacy + powered bands 0.04 more, a land from outside only where no band land fits), at least 10 creatures a colour, lands by Forge's rating; then 12 like-for-like swaps (same colour class and mana value, within 3 points of the level) that even the predicted payoffs out, stopping once max |colour − .5| + max |pair − .5| is at most 0.008 (about one card's SD in the census: below it the point estimates differ by their noise); not AI:RemoveDeck:All, supported by Forge 2.0.14.*

*Predicted payoff when drafted by the lab drafter and played by Forge (deck mix 9.1 cards of each colour, 0.5 gold, 4.2 colourless, J145's lab decks): colours W 0.501, U 0.498, B 0.499, R 0.499, G 0.503; worst pair gap 0.004. Colour + pair gap 0.114 after the flow alone, 0.007 after the search: even to within about the model's own uncertainty (each colour cell's model interval is about ±0.032), not to the third decimal.*

*A prediction, not a measurement, and an untested kind: the census model's card values were validated by summing them over the decks J145 actually played (r .84), but this table comes from class means × an assumed deck mix × a rating play curve, which no measurement has tested yet. A J145-shaped night on fresh seeds is that test (study/omega-balance-model.md).*

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

115 creatures, 12 planeswalkers. Nonland mana-value curve: 3 at 0, 24 at 1, 32 at 2, 34 at 3, 30 at 4, 17 at 5, 11 at 6, 7 at 7+.

Forge marks 0 of these AI:RemoveDeck:All (its AI plays them poorly or not at all).

A generated cube: the cards are the library model's choice under the lab's structural rules, for measuring head to head against other candidates. It drafts on Forge's ranks unless a ratings file is given.

## The themes

Tags are omega-seed-pool.tsv's where it has the card, else the Synergy Cube's, else none; a card with no tag is listed bare.

| Code | Theme |
|---|---|

## The list (name — themes)

### White (24)
Giver of Runes — AGG · Guide of Souls — CTR LIFE EVA AGG · Isamaru, Hound of Konda · Ocelot Pride — AGG SAC · Belladonna Took · Charming Prince — ETB LIFE · Get Lost — removal TOK ART · Jennifer Walters — AGG · Thalia, Guardian of Thraben — AGG · Unexpectedly Absent — removal · Voice of Victory — TOK AGG · Blade Splicer — ETB TOK ART · Preacher · Sanguine Evangelist — TOK ETB EVA · Wedding Announcement — TOK ART · Gideon, Ally of Zendikar — TOK CTRL · Hero of Bladehold — TOK AGG · Restoration Angel — ETB EVA · Elspeth, Storm Slayer — removal TOK CTR CTRL · Guardian Scalelord — ETB CTR REAN · Regal Caracal · Elspeth, Sun's Champion — TOK CTRL · Sun Titan — FAT GY ETB · Overlord of the Mistmoors — TOK FAT

### Blue (24)
Ancestral Recall — SPL CTRL · Ledger Shredder — SPL CTR GY AGG · Malcolm, Alluring Scoundrel — EVA AGG · Phantasmal Image — ETB · The Wondrous Wasp — ETB EVA AGG · Time Walk — SPL CTRL · Wan Shi Tong, Librarian — ETB CTR EVA AGG · Brazen Borrower — SPL EVA · Forensic Gadgeteer — TOK ART · Old Man of the Sea · Cryptic Command — counter CTRL · Glen Elendra Archmage — counter · High Fae Trickster · Jace, Wielder of Mysteries — CTRL · Memory Deluge — GY · Sower of Temptation — ETB removal EVA · Subtlety — ETB · Urza, Lord High Artificer — ART ETB RAMP · Venser, Shaper Savant — ETB counter · Emeritus of Ideation — GY · Icefall Regent · Wan Shi Tong, All-Knowing — TOK ETB · Consecrated Sphinx — FAT CTRL REAN · Kappa Cannoneer — ART AGG

### Black (24)
Bloodsoaked Champion — REAN AGG · Evolved Sleeper — CTR AGG · Mind Twist — discard · Moonshadow — GY AGG · Black Widow, Super Spy — CTR AGG · Damn — removal · Dauthi Voidwalker — GY AGG · Demonic Tutor — CTRL REAN · Emperor of Bones — CTR REAN AGG · Orcish Bowmasters — ETB removal TOK · Super Shredder — CTR AGG · Barrowgoyf — GY LIFE · Liliana, the Last Hope — GY removal CTRL · Murderous Rider — removal LIFE · Ophiomancer — TOK SAC · Royal Assassin · Sedgemoor Witch — TOK LIFE · Elektra, Daughter of the Hand · Rankle, Master of Pranks — discard AGG · Junji, the Midnight Sky · Crabomination — ETB GY ART FAT · Grave Titan — FAT TOK · Marionette Master — ART SAC CTR · Archon of Cruelty — GY ETB FAT REAN

### Red (24)
Kellan, Planar Trailblazer · Ragavan, Nimble Pilferer — AGG ART · Soul-Scar Mage — SPL CTR · Stadium Headliner · Agate Instigator · Cori-Steel Cutter — TOK SPL ART · Gau, Feral Youth — CTR GY AGG · Searslicer Goblin · Slickshot Show-Off · Broadside Bombardiers — SAC ART AGG · Goblin Rabblemaster — AGG TOK · Hanweir Garrison — TOK · Krenko, Tin Street Kingpin — TOK CTR · Rampaging Ferocidon — LIFE · Screaming Nemesis — LIFE AGG · Seasoned Pyromancer — GY TOK SPL · Wheel of Fortune — discard · Hellrider — AGG TOK · Pyrogoyf — GY · Dragonwing Glider · Fury — ETB removal REAN · Goldspan Dragon — EVA ART RAMP · Thundermaw Hellkite — EVA AGG · Inferno Titan — FAT ETB removal

### Green (24)
Birds of Paradise — RAMP · Delighted Halfling — RAMP · Hexdrinker — AGG · Ignoble Hierarch — RAMP AGG · Noble Hierarch — RAMP AGG · Pest Infestation — TOK ART LIFE · Elvish Archers · Questing Druid · Springheart Nantuko — TOK LND AGG · Survival of the Fittest — REAN GY · Sentinel of the Nameless City — TOK ART · Six — LND GY · Esika's Chariot — TOK ART · Garruk Relentless — TOK removal · Ouroboroid — CTR · Polukranos, World Eater — CTR removal · Questing Beast — AGG · Sowing Mycospawn — RAMP LND · Ulvenwald Oddity · Vengevine — AGG GY · Willow Satyr · Thragtusk — ETB LIFE SAC · Rampaging Baloths — LND TOK FAT · Hornet Queen — TOK ETB FAT

### Gold (20)
WU: Aang, Swift Savior — ETB CTR EVA · Fractured Identity — removal TOK
WB: Syr Vondam, Sunstar Exemplar · Lurrus of the Dream-Den — GY LIFE
WR: Forth Eorlingas! — TOK · Otharri, Suns' Glory — TOK REAN LIFE AGG
WG: Figure of Fable — AGG · Okoye, Mighty and Adored — ETB CTR
UB: Ertai Resurrected · Superior Spider-Man — GY
UR: Traumatic Critique — removal SPL CTRL · Dack Fayden — ART CTRL
UG: Nadu, Winged Wisdom — EVA · Thranduil's Company
BR: Ob Nixilis, the Adversary · Falkenrath Aristocrat — SAC AGG
BG: Grist, the Hunger Tide — TOK SAC GY · Alpha Deathclaw — removal ETB CTR FAT
RG: Bloodbraid Challenger — GY AGG · Stampede Surfer

### Colorless (18)
Black Lotus — RAMP ART REAN · Mox Emerald — RAMP ART · Mox Jet — RAMP ART · Currency Converter — TOK GY ART · Retrofitter Foundry — ART TOK SAC · Shadowspear — ART · Sol Ring — RAMP ART · Iron Man Armor — ART · Phyrexian Dragon Engine — ETB GY ART CTRL · Sword of Feast and Famine — ART AGG · Sword of Fire and Ice — ART AGG · Sword of Light and Shadow — ART AGG GY · Batterskull — ART LIFE · Wurmcoil Engine — ART FAT LIFE · Karn Liberated — CTRL FAT removal · Myr Battlesphere — ART FAT · Ugin, Eye of the Storms — RAMP LIFE CTRL · Ugin, the Spirit Dragon — CTRL FAT removal

### Lands (22)
Azorius lands: Flooded Strand — LND GY · Tundra — LND
Orzhov lands: Marsh Flats — LND GY · Scrubland — LND
Boros lands: Arid Mesa — LND GY · Sacred Foundry — LND
Selesnya lands: Savannah — LND · Windswept Heath — LND GY
Dimir lands: Polluted Delta — LND GY · Underground Sea — LND
Izzet lands: Scalding Tarn — LND GY · Volcanic Island — LND
Simic lands: Hedge Maze — LND · Misty Rainforest — LND GY
Rakdos lands: Badlands — LND · Bloodstained Mire — LND GY
Golgari lands: Overgrown Tomb — LND · Verdant Catacombs — LND GY
Gruul lands: Stomping Ground — LND · Wooded Foothills — LND GY
Other lands: Library of Alexandria — LND · Tolarian Academy — LND

## Iteration log

- version 1: made by `tools/cubelab.sh balance-model` (above).
