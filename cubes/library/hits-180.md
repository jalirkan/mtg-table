# Library hits — the greatest hits by lab rating, version 1 (180 cards, two-player)

*Made 2026-10-16 by tools/cubelab.sh library-candidates (tools/cubelab/library-candidates.ts), for the "best 180 out of the whole library" comparison (lab job J136). Deterministic: no seed; ties go to more games, then the name.*

*Drawn from cubes/library/library-pool.tsv (1592 cards, the union of ForgeCoach's nine cube documents and its two proxy lists, ForgeCoach@bf39a9f0); 24 cards Forge 2.0.14 lacks or does not support and 0 basic lands are never drawn, and 11 supported cards of three or more colours have no slot in the skeleton.*

*The rule: a card is eligible when Forge supports it and the cube lab played it in at least 80 games across ForgeCoach's metas (evybaby-cube-360, fair-fight-cube-180, modern-era-cube-180, omega-cube-180, pauper-cube-180, peasant-cube-180, synergy-cube-180, vintage-cube-180). Its key is its games-weighted shrunk win rate pooled across those metas (each meta's winRateShrunk, weighted by that meta's games for the card), to four decimals as library-pool.tsv writes it. Of the 1568 drawable cards, 814 are eligible; 127 have lab data under 80 games and 627 have none, and those 754 are ineligible.*

*Omega's skeleton (cubes/omega-cube-180.md): 24 mono-coloured nonland cards a colour, 2 gold cards a colour pair and none of three colours or more, 18 colourless nonland cards, and 22 lands -- 2 a colour pair that make exactly that pair, and 2 others; the 158 nonland cards on Omega's curve, 3 / 24 / 32 / 34 / 30 / 17 / 11 / 7 at mana value 0 to 6 and 7+, every count exact. Colours are the printed ones from Forge's facts. Lands: each pair's best two fixing lands by the key, then the best two others; nonland cards: the one selection with the largest total key that fills every colour quota and every curve count exactly (a min-cost flow).*

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

111 creatures, 4 planeswalkers. Nonland mana-value curve: 3 at 0, 24 at 1, 32 at 2, 34 at 3, 30 at 4, 17 at 5, 11 at 6, 7 at 7+.

Forge marks 0 of these AI:RemoveDeck:All (its AI plays them poorly or not at all).

A lab win rate is the rate of the decks the lab's AI built with the card, against the other drafter, in the cube it was measured in. A card that won in a weak cube can rate above a card that held its own in a strong one; that is what this candidate tests. 0 card(s) here are AI:RemoveDeck:All.

## The themes

Tags are omega-seed-pool.tsv's where it has the card, else the Synergy Cube's, else none; a card with no tag is listed bare.

| Code | Theme |
|---|---|
| AGG | Aggro |
| EVA | Evasion |
| TOK | Tokens / go wide |
| SAC | Sacrifice |
| ETB | Enter-the-battlefield / blink |
| CTR | +1/+1 counters |
| GY | Graveyard |
| REAN | Reanimation |
| SPL | Spells / tempo |
| CTRL | Control |
| ART | Artifacts / equipment |
| RAMP | Mana acceleration |
| LND | Lands |
| LIFE | Lifegain |
| FAT | Big payoffs |

## The list (name — themes)

### White (24)
Lunarch Veteran — LIFE TOK GY · Momo, Playful Pet · Ocelot Pride — AGG SAC · Soul Warden — LIFE TOK · Ancestral Blade — ART TOK AGG · Charming Prince — ETB LIFE · Raise the Alarm — TOK SPL · Sheltered by Ghosts · Spirited Companion — ETB SAC · Stormfront Pegasus — EVA AGG · Adeline, Resplendent Cathar — AGG TOK · Attended Knight — TOK ETB · Mentor of the Meek — TOK ETB · Welcoming Vampire — TOK ETB · Aerie Auxiliary · All-Fates Stalker · Battle Screech — TOK GY EVA · Cast Out · Faith's Fetters — removal · Mighty Mutanimals · Search Party Captain — TOK AGG · Reveillark — ETB GY SAC · Settle Beyond Reality — removal ETB · Triplicate Spirits — TOK EVA

### Blue (24)
Ancestral Recall — SPL CTRL · Delver of Secrets — SPL EVA AGG · Flitterwing Nuisance · Augur of Bolas — SPL ETB · Bilbo, Luckwearer · Mischievous Mystic · Moon-Circuit Hacker — EVA · Time Walk — SPL CTRL · Cloudkin Seer — ETB EVA · Exclude — counter ETB · Faebloom Trick · Winter Eladrin · Control Magic — removal CTRL · High Fae Trickster · Micromancer · Mist Raven — ETB EVA removal · Sower of Temptation — ETB removal EVA · Threadbind Clique · Urza, Lord High Artificer — ART ETB RAMP · Icefall Regent · Consecrated Sphinx — FAT CTRL REAN · Kappa Cannoneer — ART AGG · Hullbreaker Horror · Tolarian Terror — SPL GY

### Black (24)
Cult Conscript · Ecstatic Awakener — SAC · Gravecrawler — GY SAC · Plagued Rusalka — SAC removal · Stitcher's Supplier — GY SAC · Unearth — GY ETB · Bitter Triumph — removal · Dance of the Dead · Deep-Cavern Bat — ETB LIFE EVA AGG · Lively Dirge · Marionette Apprentice · Mire Triton — GY ETB · Power Word Kill · Priest of Forgotten Gods — SAC TOK · Vault Skirge — ART AGG EVA · Dismember — removal · Morbid Opportunist · Woe Strider — SAC GY TOK · Yahenni, Undying Partisan · Gonti, Lord of Luxury · Ravenous Chupacabra — ETB removal · Syr Konrad, the Grim · Kokusho, the Evening Star — FAT LIFE SAC REAN · Troll of Khazad-dûm — FAT

### Red (24)
Flame Slash — removal · Galvanic Discharge — removal · Goblin Guide — AGG · Play with Fire — removal · Ragavan, Nimble Pilferer — AGG ART · Kari Zev, Skyship Raider — TOK · Mogg War Marshal — TOK SAC ETB · Rolling Thunder — removal RAMP · Ball Lightning — AGG · Fable of the Mirror-Breaker — ART TOK SAC · Goblin Rabblemaster — AGG TOK · Hanweir Garrison — TOK · Light Up the Stage — SPL AGG · Spiteful Prankster · Ardent Elementalist — GY ETB SPL · Flametongue Kavu — ETB removal · Hellrider — AGG TOK · Fury — ETB removal REAN · Glorybringer — EVA removal FAT · Goldspan Dragon — EVA ART RAMP · Siege-Gang Commander — TOK SAC ETB · Thundermaw Hellkite — EVA AGG · Inferno Titan — FAT ETB removal · Shivan Dragon — EVA FAT

### Green (24)
Elvish Mystic — RAMP AGG · Noble Hierarch — RAMP AGG · Nyxborn Hydra · Pest Infestation — TOK ART LIFE · Frog Butler · Nishoba Brawler · Tough Cookie · Knockout Maneuver · Mirkwood Pathmaker · Spinner of Souls · Steel Leaf Champion — EVA · Summon: Fenrir · Surrak, Elusive Hunter · Thrashing Brontodon · Boseiju Reaches Skyward · Polukranos, World Eater — CTR removal · Ulvenwald Oddity · Elder Gargaroth — TOK LIFE · Grizzly Fate · Ka-Zar of the Savage Land · Spinewoods Paladin · Carnage Tyrant · Hornet Queen — TOK ETB FAT · Pelakka Wurm

### Gold (20)
WU: Aang, Swift Savior — ETB CTR EVA · Empyrean Eagle
WB: Sorin, Lord of Innistrad — TOK LIFE · Hero of the Dunes
WR: Dog Walker — TOK AGG · Heroic Reinforcements
WG: Okoye, Mighty and Adored — ETB CTR · Trostani Discordant
UB: Dreadwing Scavenger · Dinrova Horror — ETB removal
UR: Bloodwater Entity — SPL EVA GY · Brilliance Unleashed
UG: Coiling Oracle · Thranduil, Sindarin Liege
BR: Bloodtithe Harvester — SAC removal AGG · Falkenrath Aristocrat — SAC AGG
BG: Honest Rutstein · Large Bear
RG: Huntmaster of the Fells — ETB TOK LIFE · Minsc & Boo, Timeless Heroes — AGG SAC

### Colorless (18)
Hangarback Walker — ART CTR TOK SAC · Mox Emerald — RAMP ART · Mox Jet — RAMP ART · Retrofitter Foundry — ART TOK SAC · Shadowspear — ART · Cranial Plating — ART · Myr Sire — ART SAC TOK · Vulshok Morningstar · Grafted Wargear · Loxodon Warhammer · Sword of Feast and Famine — ART AGG · Sword of Fire and Ice — ART AGG · Karn, Scion of Urza — ART CTRL · Batterskull — ART LIFE · Wurmcoil Engine — ART FAT LIFE · Combat Thresher · Kaldra Compleat — ART FAT · Karn Liberated — CTRL FAT removal

### Lands (22)
Azorius lands: Flooded Strand — LND GY · Meticulous Archive — LND
Orzhov lands: Marsh Flats — LND GY · Shadowy Backstreet — LND
Boros lands: Needleverge Pathway — LND · Plateau — LND
Selesnya lands: Branchloft Pathway — LND · Temple Garden — LND
Dimir lands: Dismal Backwater — LND · Undercity Sewers — LND
Izzet lands: Izzet Boilerworks — LND · Swiftwater Cliffs — LND
Simic lands: Hedge Maze — LND · Restless Vinestalk
Rakdos lands: Rakdos Carnarium — LND · Raucous Theater — LND
Golgari lands: Restless Cottage · Underground Mortuary — LND
Gruul lands: Commercial District — LND · Rugged Highlands — LND
Other lands: City of Brass · Deceptive Landscape

## Iteration log

- version 1: made by `tools/cubelab.sh library-candidates` (above).
