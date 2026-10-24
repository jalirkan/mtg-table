# Balanced by model — legacy, even at the band average, version 1 (180 cards, two-player)

*Made by tools/cubelab.sh balance-model (tools/cubelab/balance-model.ts) from the recorded deck census J144/J149 (80,000 games, D447/D450) and J145: no designed archetypes, no hand choices. Idea: every class's cards near 0 points (the band's average card), valued by the legacy + powered census.*

*The model: census legacy + powered bands together, makeup groups by band; a ridge linear-probability model of deck win on card indicators + makeup groups (colour count x main-colour share), the opponent's deck antisymmetric (a D377-style null); lambda 800, 200 deck-bootstrap replicates. A card is "measured" with 200+ deck-games.*

*The selection: sample.ts's two-colour structure (Omega's skeleton without its list: 24 a colour, 2 gold a pair, 18 colourless, 2 lands a pair + 2 others, Omega's curve, every count exact) filled by a min-cost flow at cost 1000 x |value - 0| + 300 x sd (an unmeasured card costs as if 0.06 off, a card outside the legacy + powered bands 0.04 more, a land from outside only where no band land fits), at least 10 creatures a colour, lands by Forge's rating; then 4 like-for-like swaps (same colour class and mana value, within 3 points of the level) that even the predicted payoffs out, stopping once max |colour − .5| + max |pair − .5| is at most 0.008 (about one card's SD in the census: below it the point estimates differ by their noise); not AI:RemoveDeck:All, supported by Forge 2.0.14.*

*Predicted payoff when drafted by the lab drafter and played by Forge (deck mix 9.1 cards of each colour, 0.5 gold, 4.2 colourless, J145's lab decks): colours W 0.502, U 0.501, B 0.500, R 0.497, G 0.500; worst pair gap 0.003. Colour + pair gap 0.030 after the flow alone, 0.006 after the search: even to within about the model's own uncertainty (each colour cell's model interval is about ±0.032), not to the third decimal.*

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

104 creatures, 12 planeswalkers. Nonland mana-value curve: 3 at 0, 24 at 1, 32 at 2, 34 at 3, 30 at 4, 17 at 5, 11 at 6, 7 at 7+.

Forge marks 0 of these AI:RemoveDeck:All (its AI plays them poorly or not at all).

A generated cube: the cards are the library model's choice under the lab's structural rules, for measuring head to head against other candidates. It drafts on Forge's ranks unless a ratings file is given.

## The themes

Tags are omega-seed-pool.tsv's where it has the card, else the Synergy Cube's, else none; a card with no tag is listed bare.

| Code | Theme |
|---|---|

## The list (name — themes)

### White (24)
Erode — removal · Esper Sentinel — ART AGG · Giant Killer · Guide of Souls — CTR LIFE EVA AGG · March of Otherworldly Light — removal ART · Momo, Friendly Flier · Secure the Wastes · Swift Reconfiguration · Fateful Absence · Get Lost — removal TOK ART · Phelia, Exuberant Shepherd — CTR AGG · Stoneforge Mystic — ART AGG ETB · Winds of Abandon — removal · Adeline, Resplendent Cathar — AGG TOK · Council's Judgment — removal CTRL · Ranger-Captain of Eos — ETB · Moat · Serra Paragon — LND GY ETB · Reveillark — ETB GY SAC · Solitude — ETB removal REAN · The Legend of Yangchen · Veteran Bodyguard · Elspeth, Sun's Champion — TOK CTRL · Hand of Justice

### Blue (24)
Flitterwing Nuisance · Occult Epiphany — TOK SPL CTRL · Tamiyo, Inquisitive Student — TOK GY ART RAMP EVA AGG · Bilbo, Thief in the Night · Copy Artifact · Jace, Vryn's Prodigy — SPL GY · Thieving Skydiver — ART ETB · Thundertrap Trainer — TOK ETB AGG · Abhorrent Oculus — GY EVA · Archmage's Charm — counter CTRL · Barrin, Tolarian Archmage — ETB · Hullbreacher — TOK ART RAMP · Tinker — REAN ART · Tishana's Tidebinder — ETB ART · Cryptic Command — counter CTRL · Glen Elendra Archmage — counter · High Fae Trickster · Jace, Wielder of Mysteries — CTRL · Jace, the Mind Sculptor — CTRL SPL · Memory Deluge — GY · Phyrexian Metamorph — ART ETB · Vesuvan Doppelganger · Kappa Cannoneer — ART AGG · Murktide Regent — SPL GY EVA

### Black (24)
Bloodsoaked Champion — REAN AGG · Concealing Curtains — discard AGG · Mind Twist — discard · Bitterblossom — TOK EVA SAC · Bloodghast — SAC GY AGG · Caustic Bronco — AGG · Demonic Tutor — CTRL REAN · Emperor of Bones — CTR REAN AGG · Grim Haruspex — SAC · Liliana of the Veil — discard GY CTRL · Midnight Reaper — SAC · Woe Strider — SAC GY TOK · Damnation — CTRL · Grief — ETB REAN discard · Guardian Beast · Juzám Djinn · The Abyss · Harvester of Misery — removal ETB · Overlord of the Balemurk — GY · Kokusho, the Evening Star — FAT LIFE SAC REAN · Marionette Master — ART SAC CTR · Metamorphosis Fanatic — ETB REAN LIFE FAT · Nightmare · Archon of Cruelty — GY ETB FAT REAN

### Red (24)
Fervent Champion · Goblin Guide — AGG · Soul-Scar Mage — SPL CTR · Stadium Headliner · Batroc the Leaper — CTR AGG · Cori-Steel Cutter — TOK SPL ART · Dreadhorde Arcanist — SPL GY · Eidolon of the Great Revel — AGG · Goblin Engineer — ART GY REAN · Inti, Seneschal of the Sun — CTR AGG · Kari Zev, Skyship Raider — TOK · Legion Extruder — removal TOK SAC ART · Broadside Bombardiers — SAC ART AGG · Fable of the Mirror-Breaker — ART TOK SAC · Gandalf, Goblins' Bane · Legion Warboss — TOK · Mijae Djinn · Wheel of Fortune — discard · Ydwen Efreet · Chandra, Torch of Defiance — CTRL RAMP removal · Fiery Confluence — removal ART · Burn Down the House · Orgg · Siege-Gang Commander — TOK SAC ETB

### Green (24)
Birds of Paradise — RAMP · Green Sun's Zenith — RAMP · Pelt Collector — CTR · Keen-Eyed Curator — GY AGG · Lotus Cobra — RAMP LND · Scavenging Ooze — GY LIFE CTR · Courser of Kruphix — LND LIFE · Emeritus of Abundance — GY · Formidable Speaker — ETB · Scute Swarm — LND TOK · Steel Leaf Champion — EVA · Sylvan Scavenging · Garruk Wildspeaker — RAMP TOK · Icetill Explorer — GY LND · Ifh-Bíff Efreet · Leatherhead, Swamp Stalker · Wicked Wolf · Cockatrice · Garruk, Curse Breaker · Nissa, Who Shakes the World — LND RAMP · Titania, Protector of Argoth — LND TOK GY · Primeval Titan — FAT LND RAMP · Rampaging Baloths — LND TOK FAT · Craterhoof Behemoth — FAT AGG TOK

### Gold (20)
WU: Don & Leo, Problem Solvers · Teferi, Hero of Dominaria — CTRL
WB: Lurrus of the Dream-Den — GY LIFE · Sorin, Lord of Innistrad — TOK LIFE
WR: Zirda, the Dawnwaker — ART · Showdown of the Skalds — SPL CTR
WG: Knight of the Reliquary — LND AGG · Brightglass Gearhulk
UB: Psychic Frog — GY AGG REAN · Ertai Resurrected
UR: Flame of Anor — removal ART · Prismari Command — removal TOK ART
UG: Uro, Titan of Nature's Wrath — LND GY RAMP · Mystic Snake — counter ETB
BR: Asmoranomardicadaistinaculdacar · Alesha, Who Laughs at Fate
BG: Deathrite Shaman — GY RAMP LND · Grim Flayer
RG: Huntmaster of the Fells — ETB TOK LIFE · Escape to the Wilds

### Colorless (18)
Mana Crypt — ART RAMP · Mox Diamond — GY ART RAMP · Bomat Courier · Currency Converter — TOK GY ART · Arcbound Ravager · Grim Monolith — ART RAMP · Smuggler's Copter — ART AGG EVA · Steel Overseer — ART CTR · Coalition Relic — ART RAMP · Karn, Scion of Urza — ART CTRL · Relic of Sauron — ART RAMP CTRL · Solemn Simulacrum — ART ETB RAMP · Together as One · Triskelion · Kaldra Compleat — ART FAT · Platinum Angel — ART FAT · Ugin, Eye of the Storms — RAMP LIFE CTRL · Colossus of Sardia

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
