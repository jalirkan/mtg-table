# Library random — the seeded control, version 2 (180 cards, two-player)

*Made 2026-10-16 by tools/cubelab.sh library-candidates (tools/cubelab/library-candidates.ts), the control of the "best 180 out of the whole library" comparison (lab job J136). Seed 180: rng.ts's rng(180, 'library-random-180') gives every drawable card, in the pool's name order, one uniform 32-bit key.*

*Drawn from cubes/library/library-pool.tsv (1592 cards, the union of ForgeCoach's nine cube documents and its two proxy lists, ForgeCoach@bf39a9f0); 24 cards Forge 2.0.14 lacks or does not support and 0 basic lands are never drawn, and 11 supported cards of three or more colours have no slot in the skeleton.*

*The rule: every drawable card (1568) is eligible, lab data or not; the selection keeps the largest keys under the skeleton, so within each colour class and mana value the cards are a uniform draw, and only the counts are fixed. Nothing about a card's quality is read.*

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

93 creatures, 4 planeswalkers. Nonland mana-value curve: 3 at 0, 24 at 1, 32 at 2, 34 at 3, 30 at 4, 17 at 5, 11 at 6, 7 at 7+.

Forge marks 3 of these AI:RemoveDeck:All (its AI plays them poorly or not at all): Adanto Vanguard, Flash, Memory Jar.

A legal, colour-balanced cube that nobody selected: the baseline every selected candidate should beat. 3 card(s) here are AI:RemoveDeck:All, and 62 have no lab data at all.

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
Benalish Hero · Land Tax · Oust — LIFE · Recruitment Officer · Adanto Vanguard — LIFE AGG · Disenchant · Aang's Iceberg — ART · Council's Judgment — removal CTRL · Enduring Innocence — LIFE · Sanguine Evangelist — TOK ETB EVA · Skyclave Apparition — ETB removal · Wedding Announcement — TOK ART · Aerie Auxiliary · Angelic Voices · Moat · Palace Sentinels — ETB · Restoration Angel — ETB EVA · The Wandering Emperor — CTRL TOK removal · Wrath of God — CTRL · Cloudgoat Ranger · Reveillark — ETB GY SAC · Settle Beyond Reality — removal ETB · Sunfall — removal TOK CTR ART CTRL · Triplicate Spirits — TOK EVA

### Blue (24)
Hedron Crab · Chart a Course — SPL CTRL · Faerie Mastermind — EVA AGG · Flash — REAN · Picklock Prankster · Plunder the Trollshaws · Remove Soul · Brazen Borrower — SPL EVA · Force of Negation — counter GY · Frost Trickster · Hullbreacher — TOK ART RAMP · Old Man of the Sea · Pestermite — ETB EVA · Sai, Master Thopterist — ART TOK · Deep Analysis — GY SPL · Paradoxical Outcome — ART SPL · Sower of Temptation — ETB removal EVA · Venser, Shaper Savant — ETB counter · Whirler Rogue · Marauding Sphinx · Mulldrifter — ETB CTRL EVA · Daring Waverider · Hullbreaker Horror · Tolarian Terror — SPL GY

### Black (24)
Bloodsoaked Champion — REAN AGG · Dream Beavers · Duress — discard · Gravecrawler — GY SAC · Plagued Rusalka — SAC removal · Village Rites — SAC SPL · Bitterblossom — TOK EVA SAC · Blood Artist — SAC LIFE TOK · Cabal Ritual — GY RAMP · Kitesail Freebooter — ETB discard · Life of Toshiro Umezawa · Soul Exchange · Wishclaw Talisman — ART · Crypt Rats — SAC removal · Frozen Shade · Morbid Opportunist · Juzám Djinn · Snuff Out — removal · Thorn of the Black Rose — ETB · Harvester of Misery — removal ETB · Hellfire · Bolas's Citadel — ART · Yawgmoth Demon · Archon of Cruelty — GY ETB FAT REAN

### Red (24)
Experimental Synthesizer — ART SAC · Gleeful Demolition · Impractical Joke — removal SPL · Monstrous Rage · Unholy Heat — removal GY · Bothersome Noisemaker · Hexgold Halberd · Death-Greeter's Champion — ETB CTR AGG · Hordeling Outburst — TOK SPL · Laelia, the Blade Reforged — AGG ART · Raid Bombardment — TOK AGG · Rampaging Ferocidon — LIFE · Rubble Rouser · Sweltering Suns · Ali from Cairo · Flashfires · Headliner Scarlett — ETB AGG · Manabarbs · Mountain Yeti · Orcish Oriflamme · Goldspan Dragon — EVA ART RAMP · Siege-Gang Commander — TOK SAC ETB · Amethyst Dragon · Inferno Titan — FAT ETB removal

### Green (24)
Ignoble Hierarch — RAMP AGG · Noble Hierarch — RAMP AGG · Nyxborn Hydra · Argothian Pixies · Courier of Comestibles · Lifeforce · Nishoba Brawler · Prosperous Innkeeper — LIFE ART ETB · Sakura-Tribe Elder — RAMP LND SAC · Up the Beanstalk · Wall of Roots — RAMP · Contagious Vorrac · Tracker · Ulvenwald Mysteries — ART SAC TOK · Giant Spider · Living Plane · Primordial Pachyderm · Storm Seeker · Conclave Naturalists — ETB removal · Grizzly Fate · Craw Wurm · Feral Thallid · Krosan Tusker — RAMP GY · Vaultborn Tyrant — TOK ART LIFE FAT

### Gold (20)
WU: Empyrean Eagle · Don & Leo, Problem Solvers
WB: Sorin, Lord of Innistrad — TOK LIFE · Hero of the Dunes
WR: Practiced Scrollsmith · Showdown of the Skalds — SPL CTR
WG: Voice of Resurgence — TOK SAC · Kitchen Finks — ETB LIFE
UB: Dreadwing Scavenger · Dinrova Horror — ETB removal
UR: Saheeli, Sublime Artificer — SPL ART TOK · Pink Horror
UG: Quandrix Charm · Nadu, Winged Wisdom — EVA
BR: Body Dropper — SAC · Murderous Redcap — SAC ETB GY
BG: Vinereap Mentor · Desecrator Hag — GY ETB
RG: Ashroot Animist · Vibrance — removal ETB LIFE

### Colorless (18)
Everflowing Chalice — ART RAMP · Lotus Petal — ART SAC · Aether Spellbomb — ART · Bomat Courier · Library of Leng · Meekstone · The Rack · Aeolipile · Ankh of Mishra · Arcbound Ravager · Dauntless Scrapbot · Strixhaven Skycoach · Memory Jar — discard ART · Obsianus Golem · Sundering Archaic · Ugin, the Spirit Dragon — CTRL FAT removal · Portal to Phyrexia — REAN ART · Chrome Mox — ART RAMP

### Lands (22)
Azorius lands: Meticulous Archive — LND · Restless Anchorage
Orzhov lands: Scrubland — LND · Shadowy Backstreet — LND
Boros lands: Arid Mesa — LND GY · Plateau — LND
Selesnya lands: Blossoming Sands — LND · Windswept Heath — LND GY
Dimir lands: Clearwater Pathway — LND · Watery Grave — LND
Izzet lands: Riverpyre Verge — LND · Steam Vents — LND
Simic lands: Barkchannel Pathway — LND · Botanical Sanctum — LND
Rakdos lands: Badlands — LND · Rakdos Carnarium — LND
Golgari lands: Golgari Rot Farm — LND · Wastewood Verge — LND
Gruul lands: Gruul Turf — LND · Rugged Highlands — LND
Other lands: Savai Triome — LND · Shattered Landscape

## Iteration log

- version 1: made by `tools/cubelab.sh library-candidates` (above).
- v2 (2026-10-16, cube lab evolve generation 1: 200 grid drafts, seeds 186000001–186000200, 333 decisive games): **Mox Jet** → **Chrome Mox** (note-cut: notes: J136 POWER: removed wherever present, never added; dealt 177, picked 175, first line 152, in 175 deck(s); on colour in 175 pool(s), played in 175 (1.00, CI 0.98–1.00); won 148 of 285 decisive games (0.52, CI 0.46–0.58 by deck, design effect 1.05, shrunk 0.52) vs mean 0.50, its colour pairs 0.50 (D377); dominant-pick p 3.0e-4; in: same colour class; shares ART RAMP; mv 0 for 0; rating 99.4; helps weak ART (0.01)).
- v2 (2026-10-16, cube lab evolve generation 2: 200 grid drafts, seeds 186000201–186000400, 342 decisive games; confirmation 125 fresh drafts, seeds 187000301–187000425, 313 decisive games): no swaps, v2 unchanged. Insufficient data: no card was confirmed at 200 drafts; 12 lead(s) to watch — about 898 drafts per generation would find half of them. Run more drafts. Discovery: 1 candidate(s) of 283 tests at a false-discovery rate of 0.1; confirmation on 125 fresh drafts: 0 confirmed, 1 not. 50 card(s) are rarely or never played on colour but rated under 60: a ratings question, not a drafts one (see rating-limited).
