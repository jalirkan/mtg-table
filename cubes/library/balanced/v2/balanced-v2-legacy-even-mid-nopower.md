# Balanced by model v2 — legacy, even at the band average, without powered-exclude.txt, version 1 (180 cards, two-player)

*Made by tools/cubelab.sh balance-model, model v2 (D475; tools/cubelab/balance-model.ts, balance-model-v2-cmd.ts) from the recorded deck census J144/J149 and the drafted games of lab-j145, lab-j159, lab-j160: no designed archetypes, no hand choices. Idea: every class's cards near 0 points (the legacy census's average card), valued in drafted context on the legacy + powered scale.*

*The values: drafted context (D475) — each card's census value (census legacy + powered bands together, makeup groups by band) times alpha 0.948, plus its own term from 32777 drafted games (decks clustered by draft), ridge-shrunk toward the census value at lambda 1600 (chosen by CV by draft); 200 draft-bootstrap replicates with the census's replicates as the prior. A card is "measured" with 200+ deck-games in the census or the drafted games.*

*The selection: sample.ts's two-colour structure (Omega's skeleton without its list: 24 a colour, 2 gold a pair, 18 colourless, 2 lands a pair + 2 others, Omega's curve, every count exact) filled by v1's min-cost flow at cost 1000 x |value - 0| + 300 x sd (an unmeasured card costs as if 0.06 off, a card outside the legacy + powered bands 0.04 more), at least 10 creatures a colour, lands by Forge's rating; then D475's robust search: like-for-like swaps (same colour class and mana value, within 3 points of the level and 25 Forge rating points of the card replaced) judged by the mean gap over 100 bootstrap replicates on the mix and concentration the lab drafter shows on the flow's cube, each kept only if it buys 0.002 of that mean, the result re-drafted and kept only if it beats the flow by as much on 100 replicates the search never saw: 1 swap(s) tried, none kept: this is the flow's cube.*

*Predicted payoff when drafted by the lab drafter and played by Forge (the drafter's own decks: 2000 simulated grid drafts at seeds from 947500001; 17% three-colour decks), with 95% intervals that hold the values' bootstrap and the model's transfer error on a new cube (0.026 a colour, 0.038 a pair, from the leave-one-night-out validation's new cubes, added to each cell independently): W 0.501 (0.446–0.556), U 0.479 (0.425–0.533), B 0.487 (0.433–0.541), R 0.485 (0.430–0.540), G 0.518 (0.464–0.572); pairs WU 0.503 (0.426–0.580), WB 0.510 (0.431–0.588), WR 0.509 (0.431–0.587), WG 0.538 (0.460–0.616), UB 0.490 (0.412–0.567), UR 0.486 (0.408–0.564), UG 0.519 (0.441–0.597), BR 0.495 (0.417–0.572), BG 0.525 (0.447–0.603), RG 0.525 (0.447–0.603).*

*The gap (max |colour − .5| + max |pair − .5| over the pairs a night would judge, 400+ deck-games): point 0.040; over held-out bootstrap replicates 0.049 (0.026–0.071); with the transfer error as well 0.107 (0.059–0.172) — that last is what a night should expect to measure before its own noise.*

*Excluded before the flow: the 41 cards of cubes/library/powered-exclude.txt (sha256 c9aad552d11e), so none can be chosen; everything else as in the cube without the list.*

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

111 creatures, 9 planeswalkers. Nonland mana-value curve: 3 at 0, 24 at 1, 32 at 2, 34 at 3, 30 at 4, 17 at 5, 11 at 6, 7 at 7+.

Forge marks 0 of these AI:RemoveDeck:All (its AI plays them poorly or not at all).

A generated cube: the cards are the library model's choice under the lab's structural rules, for measuring head to head against other candidates. It drafts on Forge's ranks unless a ratings file is given.

## The themes

Tags are omega-seed-pool.tsv's where it has the card, else the Synergy Cube's, else none; a card with no tag is listed bare.

| Code | Theme |
|---|---|

## The list (name — themes)

### White (24)
Erode — removal · Esper Sentinel — ART AGG · Giant Killer · Giver of Runes — AGG · Guide of Souls — CTR LIFE EVA AGG · March of Otherworldly Light — removal ART · Momo, Friendly Flier · Secure the Wastes · Fateful Absence · Glimmer Lens — TOK ART · Phelia, Exuberant Shepherd — CTR AGG · Stoneforge Mystic — ART AGG ETB · Thalia, Guardian of Thraben — AGG · Brimaz, King of Oreskos — TOK AGG · Loran of the Third Path — ETB ART removal · Ranger-Captain of Eos — ETB · Elspeth, Knight-Errant — TOK ART CTRL · Northern Paladin · Wrath of God — CTRL · Solitude — ETB removal REAN · The Legend of Yangchen · Veteran Bodyguard · Elspeth, Sun's Champion — TOK CTRL · Hand of Justice

### Blue (24)
Occult Epiphany — TOK SPL CTRL · Stormchaser's Talent — TOK GY SPL · Tamiyo, Inquisitive Student — TOK GY ART RAMP EVA AGG · Astrologian's Planisphere — TOK CTR SPL ART · Copy Artifact · Jace, Vryn's Prodigy — SPL GY · Proft's Eidetic Memory — CTR · Thieving Skydiver — ART ETB · Thundertrap Trainer — TOK ETB AGG · Abhorrent Oculus — GY EVA · Archmage's Charm — counter CTRL · Barrin, Tolarian Archmage — ETB · Brazen Borrower — SPL EVA · Hullbreacher — TOK ART RAMP · Sai, Master Thopterist — ART TOK · Tishana's Tidebinder — ETB ART · Glen Elendra Archmage — counter · High Fae Trickster · Memory Deluge — GY · Phyrexian Metamorph — ART ETB · Venser, Shaper Savant — ETB counter · Quantum Riddler — ETB · Vesuvan Doppelganger · Kappa Cannoneer — ART AGG

### Black (24)
Bloodsoaked Champion — REAN AGG · Concealing Curtains — discard AGG · Gravecrawler — GY SAC · Mind Twist — discard · Thoughtseize — discard · Bitterblossom — TOK EVA SAC · Caustic Bronco — AGG · Collective Brutality — GY discard removal · Dark Confidant — AGG CTRL · Priest of Forgotten Gods — SAC TOK · Barrowgoyf — GY LIFE · Liliana of the Veil — discard GY CTRL · Midnight Reaper — SAC · Murderous Rider — removal LIFE · Ophiomancer — TOK SAC · Woe Strider — SAC GY TOK · Damnation — CTRL · Guardian Beast · Rankle, Master of Pranks — discard AGG · Harvester of Misery — removal ETB · Overlord of the Balemurk — GY · Crabomination — ETB GY ART FAT · Kokusho, the Evening Star — FAT LIFE SAC REAN · Nightmare

### Red (24)
Fervent Champion · Goblin Guide — AGG · Soul-Scar Mage — SPL CTR · Stadium Headliner · Dreadhorde Arcanist — SPL GY · Eidolon of the Great Revel — AGG · Fork · Goblin Engineer — ART GY REAN · Kari Zev, Skyship Raider — TOK · Legion Extruder — removal TOK SAC ART · Ball Lightning — AGG · Death-Greeter's Champion — ETB CTR AGG · Gandalf, Goblins' Bane · Legion Warboss — TOK · Mijae Djinn · Sweltering Suns · Ydwen Efreet · Fiery Confluence — removal ART · Hellrider — AGG TOK · Burn Down the House · Glorybringer — EVA removal FAT · Siege-Gang Commander — TOK SAC ETB · Etali, Primal Conqueror — ETB FAT · Inferno

### Green (24)
Birds of Paradise — RAMP · Noble Hierarch — RAMP AGG · Lotus Cobra — RAMP LND · Questing Druid · Scavenging Ooze — GY LIFE CTR · Courser of Kruphix — LND LIFE · Emeritus of Abundance — GY · Formidable Speaker — ETB · Scute Swarm — LND TOK · Steel Leaf Champion — EVA · Collected Company — AGG ETB · Force of Vigor — ART · Garruk Wildspeaker — RAMP TOK · Icetill Explorer — GY LND · Ifh-Bíff Efreet · Leatherhead, Swamp Stalker · Oracle of Mul Daya — LND · Wicked Wolf · Cockatrice · Garruk, Curse Breaker · Titania, Protector of Argoth — LND TOK GY · Carnage Tyrant · Rampaging Baloths — LND TOK FAT · Craterhoof Behemoth — FAT AGG TOK

### Gold (20)
WU: Don & Leo, Problem Solvers · Teferi, Hero of Dominaria — CTRL
WB: Lurrus of the Dream-Den — GY LIFE · Sorin, Lord of Innistrad — TOK LIFE
WR: Zirda, the Dawnwaker — ART · Showdown of the Skalds — SPL CTR
WG: Voice of Resurgence — TOK SAC · Brightglass Gearhulk
UB: Ertai Resurrected · Superior Spider-Man — GY
UR: Prismari Command — removal TOK ART · Pink Horror
UG: Uro, Titan of Nature's Wrath — LND GY RAMP · Mystic Snake — counter ETB
BR: Asmoranomardicadaistinaculdacar · Falkenrath Aristocrat — SAC AGG
BG: Grim Flayer · Pillage the Bog — SPL
RG: Territorial Kavu — GY AGG · Escape to the Wilds

### Colorless (18)
Hangarback Walker — ART CTR TOK SAC · Walking Ballista — ART CTR · Bomat Courier · Currency Converter — TOK GY ART · Grim Monolith — ART RAMP · Smuggler's Copter — ART AGG EVA · Steel Overseer — ART CTR · Coalition Relic — ART RAMP · Tezzeret, Cruel Captain — CTR ART CTRL · Relic of Sauron — ART RAMP CTRL · Solemn Simulacrum — ART ETB RAMP · Tetravus · Together as One · Triskelion · Myr Battlesphere — ART FAT · Ugin, the Spirit Dragon — CTRL FAT removal · Colossus of Sardia · Portal to Phyrexia — REAN ART

### Lands (22)
Azorius lands: Flooded Strand — LND GY · Hallowed Fountain — LND
Orzhov lands: Godless Shrine — LND · Marsh Flats — LND GY
Boros lands: Arid Mesa — LND GY · Sacred Foundry — LND
Selesnya lands: Temple Garden — LND · Windswept Heath — LND GY
Dimir lands: Polluted Delta — LND GY · Watery Grave — LND
Izzet lands: Scalding Tarn — LND GY · Spirebluff Canal — LND
Simic lands: Hedge Maze — LND · Misty Rainforest — LND GY
Rakdos lands: Bloodstained Mire — LND GY · Raucous Theater — LND
Golgari lands: Overgrown Tomb — LND · Verdant Catacombs — LND GY
Gruul lands: Stomping Ground — LND · Wooded Foothills — LND GY
Other lands: Prismatic Vista — LND GY · Urza's Saga — LND GY AGG

## Iteration log

- version 1: made by `tools/cubelab.sh balance-model` (above).
