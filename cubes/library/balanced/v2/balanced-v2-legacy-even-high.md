# Balanced by model v2 — legacy, even and strong, version 1 (180 cards, two-player)

*Made by tools/cubelab.sh balance-model, model v2 (D475; tools/cubelab/balance-model.ts, balance-model-v2-cmd.ts) from the recorded deck census J144/J149 and the drafted games of lab-j145, lab-j159, lab-j160: no designed archetypes, no hand choices. Idea: every class's cards near the highest level each colour can hold, valued in drafted context on the legacy + powered scale.*

*The values: drafted context (D475) — each card's census value (census legacy + powered bands together, makeup groups by band) times alpha 0.948, plus its own term from 32777 drafted games (decks clustered by draft), ridge-shrunk toward the census value at lambda 1600 (chosen by CV by draft); 200 draft-bootstrap replicates with the census's replicates as the prior. A card is "measured" with 200+ deck-games in the census or the drafted games.*

*The selection: sample.ts's two-colour structure (Omega's skeleton without its list: 24 a colour, 2 gold a pair, 18 colourless, 2 lands a pair + 2 others, Omega's curve, every count exact) filled by v1's min-cost flow at cost 1000 x |value - 0.02| + 300 x sd (an unmeasured card costs as if 0.06 off, a card outside the legacy + powered bands 0.04 more), at least 10 creatures a colour, lands by Forge's rating; then D475's robust search: like-for-like swaps (same colour class and mana value, within 3 points of the level and 25 Forge rating points of the card replaced) judged by the mean gap over 100 bootstrap replicates on the mix and concentration the lab drafter shows on the flow's cube, each kept only if it buys 0.002 of that mean, the result re-drafted and kept only if it beats the flow by as much on 100 replicates the search never saw: 7 swap(s) kept.*

*Predicted payoff when drafted by the lab drafter and played by Forge (the drafter's own decks: 2000 simulated grid drafts at seeds from 947500001; 15% three-colour decks), with 95% intervals that hold the values' bootstrap and the model's transfer error on a new cube (0.026 a colour, 0.038 a pair, from the leave-one-night-out validation's new cubes, added to each cell independently): W 0.498 (0.443–0.552), U 0.488 (0.435–0.541), B 0.483 (0.429–0.538), R 0.500 (0.447–0.554), G 0.501 (0.447–0.555); pairs WU 0.503 (0.426–0.581), WB 0.500 (0.422–0.577), WR 0.523 (0.445–0.601), WG 0.520 (0.442–0.598), UB 0.495 (0.417–0.574), UR 0.512 (0.435–0.589), UG 0.509 (0.432–0.586), BR 0.503 (0.425–0.581), BG 0.511 (0.433–0.589), RG 0.516 (0.439–0.594).*

*The gap (max |colour − .5| + max |pair − .5| over the pairs a night would judge, 400+ deck-games): point 0.040; over held-out bootstrap replicates 0.047 (0.025–0.073); with the transfer error as well 0.110 (0.061–0.171) — that last is what a night should expect to measure before its own noise.*

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

113 creatures, 15 planeswalkers. Nonland mana-value curve: 3 at 0, 24 at 1, 32 at 2, 34 at 3, 30 at 4, 17 at 5, 11 at 6, 7 at 7+.

Forge marks 0 of these AI:RemoveDeck:All (its AI plays them poorly or not at all).

A generated cube: the cards are the library model's choice under the lab's structural rules, for measuring head to head against other candidates. It drafts on Forge's ranks unless a ratings file is given.

## The themes

Tags are omega-seed-pool.tsv's where it has the card, else the Synergy Cube's, else none; a card with no tag is listed bare.

| Code | Theme |
|---|---|

## The list (name — themes)

### White (24)
Guide of Souls — CTR LIFE EVA AGG · Isamaru, Hound of Konda · Belladonna Took · Charming Prince — ETB LIFE · Glimmer Lens — TOK ART · Jacked Rabbit — TOK CTR AGG · Jennifer Walters — AGG · Selfless Spirit — EVA AGG · Unexpectedly Absent — removal · Voice of Victory — TOK AGG · Skyclave Apparition — ETB removal · Wedding Announcement — TOK ART · Gideon, Ally of Zendikar — TOK CTRL · Hero of Bladehold — TOK AGG · Restoration Angel — ETB EVA · Serra Paragon — LND GY ETB · The Wandering Emperor — CTRL TOK removal · Archangel Avacyn — ETB · Elspeth, Storm Slayer — removal TOK CTR CTRL · Guardian Scalelord — ETB CTR REAN · Regal Caracal · Exalted Angel — EVA LIFE · Sun Titan — FAT GY ETB · Overlord of the Mistmoors — TOK FAT

### Blue (24)
Ancestral Recall — SPL CTRL · Tamiyo, Inquisitive Student — TOK GY ART RAMP EVA AGG · Ledger Shredder — SPL CTR GY AGG · Malcolm, Alluring Scoundrel — EVA AGG · Phantasmal Image — ETB · The Wondrous Wasp — ETB EVA AGG · Wan Shi Tong, Librarian — ETB CTR EVA AGG · Brazen Borrower — SPL EVA · Forensic Gadgeteer — TOK ART · Old Man of the Sea · Tishana's Tidebinder — ETB ART · Glen Elendra Archmage — counter · Jace, Wielder of Mysteries — CTRL · Jace, the Mind Sculptor — CTRL SPL · Memory Deluge — GY · Phyrexian Metamorph — ART ETB · Subtlety — ETB · Urza, Lord High Artificer — ART ETB RAMP · Venser, Shaper Savant — ETB counter · Emeritus of Ideation — GY · Icefall Regent · Quantum Riddler — ETB · Consecrated Sphinx — FAT CTRL REAN · Kappa Cannoneer — ART AGG

### Black (24)
Bloodsoaked Champion — REAN AGG · Concealing Curtains — discard AGG · Evolved Sleeper — CTR AGG · Mind Twist — discard · Moonshadow — GY AGG · Thoughtseize — discard · Black Widow, Super Spy — CTR AGG · Damn — removal · Dauthi Voidwalker — GY AGG · Emperor of Bones — CTR REAN AGG · Orcish Bowmasters — ETB removal TOK · Super Shredder — CTR AGG · Liliana, the Last Hope — GY removal CTRL · Royal Assassin · Sedgemoor Witch — TOK LIFE · Damnation — CTRL · Elektra, Daughter of the Hand · Rankle, Master of Pranks — discard AGG · Junji, the Midnight Sky · Crabomination — ETB GY ART FAT · Grave Titan — FAT TOK · Metamorphosis Fanatic — ETB REAN LIFE FAT · Nightmare · Archon of Cruelty — GY ETB FAT REAN

### Red (24)
Kellan, Planar Trailblazer · Ragavan, Nimble Pilferer — AGG ART · Soul-Scar Mage — SPL CTR · Stadium Headliner · Agate Instigator · Gau, Feral Youth — CTR GY AGG · Generous Plunderer — TOK ART AGG · Searslicer Goblin · Slickshot Show-Off · Bonecrusher Giant — removal AGG · Delayed Blast Fireball — removal CTRL · Detective's Phoenix — GY EVA AGG · Fable of the Mirror-Breaker — ART TOK SAC · Hanweir Garrison — TOK · Laelia, the Blade Reforged — AGG ART · Rampaging Ferocidon — LIFE · Seasoned Pyromancer — GY TOK SPL · Chandra, Torch of Defiance — CTRL RAMP removal · Purphoros, God of the Forge · Dragonwing Glider · Fury — ETB removal REAN · Goldspan Dragon — EVA ART RAMP · Thundermaw Hellkite — EVA AGG · Inferno Titan — FAT ETB removal

### Green (24)
Delighted Halfling — RAMP · Hexdrinker — AGG · Ignoble Hierarch — RAMP AGG · Noble Hierarch — RAMP AGG · Pelt Collector — CTR · Pest Infestation — TOK ART LIFE · Bristly Bill, Spine Sower — CTR LND AGG · Elvish Archers · Lotus Cobra — RAMP LND · Oath of Druids — GY · Springheart Nantuko — TOK LND AGG · Lovestruck Beast · Mole Man, Moloid Master — TOK GY LND · Sentinel of the Nameless City — TOK ART · Bristlebud Farmer · Esika's Chariot — TOK ART · Garruk Relentless — TOK removal · Polukranos, World Eater — CTR removal · Sowing Mycospawn — RAMP LND · Thrun, the Last Troll — AGG · Vengevine — AGG GY · Elder Gargaroth — TOK LIFE · Nissa, Who Shakes the World — LND RAMP · Hornet Queen — TOK ETB FAT

### Gold (20)
WU: Aang, Swift Savior — ETB CTR EVA · Fractured Identity — removal TOK
WB: Syr Vondam, Sunstar Exemplar · Lurrus of the Dream-Den — GY LIFE
WR: Forth Eorlingas! — TOK · Otharri, Suns' Glory — TOK REAN LIFE AGG
WG: Figure of Fable — AGG · Okoye, Mighty and Adored — ETB CTR
UB: Thief of Sanity — GY EVA · Superior Spider-Man — GY
UR: Traumatic Critique — removal SPL CTRL · Dack Fayden — ART CTRL
UG: Absorbing Man · Nadu, Winged Wisdom — EVA
BR: Ob Nixilis, the Adversary · Falkenrath Aristocrat — SAC AGG
BG: Grist, the Hunger Tide — TOK SAC GY · Alpha Deathclaw — removal ETB CTR FAT
RG: Huntmaster of the Fells — ETB TOK LIFE · Bloodbraid Challenger — GY AGG

### Colorless (18)
Mox Emerald — RAMP ART · Mox Ruby — RAMP ART · Mox Sapphire — RAMP ART · Currency Converter — TOK GY ART · Retrofitter Foundry — ART TOK SAC · Shadowspear — ART · Iron Man Armor — ART · Palantír of Orthanc — ART · Phyrexian Dragon Engine — ETB GY ART CTRL · Sword of Feast and Famine — ART AGG · Sword of Fire and Ice — ART AGG · Sword of Light and Shadow — ART AGG GY · Karn, Scion of Urza — ART CTRL · Wurmcoil Engine — ART FAT LIFE · Kaldra Compleat — ART FAT · Karn Liberated — CTRL FAT removal · Platinum Angel — ART FAT · Ugin, Eye of the Storms — RAMP LIFE CTRL

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
