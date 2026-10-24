# balance-model: the library card model and the generated cubes

## Fit quality (5-fold held-out, by game)

| source | decks | games | cards | lambda | Brier, cards | Brier, makeup only | skill | accuracy | split-half reliability | true spread of card values (pts SD) |
|---|---|---|---|---|---|---|---|---|---|---|
| pauper.makeup | 2500 | 19982 | 791 | 400 | 0.2248 | 0.2424 | 7.2% | 0.625 | 0.75 | 1.52 |
| pauper.colour | 2500 | 19982 | 791 | 400 | 0.2254 | 0.2390 | 5.7% | 0.622 | 0.75 | 1.52 |
| peasant.makeup | 2500 | 19982 | 1315 | 400 | 0.2246 | 0.2368 | 5.1% | 0.633 | 0.74 | 1.54 |
| peasant.colour | 2500 | 19982 | 1315 | 400 | 0.2257 | 0.2368 | 4.7% | 0.629 | 0.74 | 1.54 |
| legacy.makeup | 2500 | 19975 | 948 | 800 | 0.2231 | 0.2358 | 5.4% | 0.639 | 0.65 | 1.00 |
| legacy.colour | 2500 | 19975 | 948 | 800 | 0.2240 | 0.2335 | 4.0% | 0.635 | 0.65 | 0.99 |
| powered.makeup | 2500 | 19974 | 948 | 800 | 0.2276 | 0.2406 | 5.4% | 0.622 | 0.63 | 0.96 |
| powered.colour | 2500 | 19974 | 948 | 800 | 0.2279 | 0.2372 | 3.9% | 0.622 | 0.61 | 0.94 |
| legacy+powered.makeup | 5000 | 39949 | 948 | 800 | 0.2246 | 0.2382 | 5.7% | 0.633 | 0.73 | 1.13 |
| omega-B.makeup | 6400 | 6400 | 158 | 1600 | 0.2437 | 0.2494 | 2.3% | 0.562 | 0.61 | 0.73 |
| omega-C.makeup | 2000 | 7996 | 158 | 800 | 0.2432 | 0.2470 | 1.6% | 0.574 | 0.55 | 0.88 |
| omega-B.colour | 6400 | 6400 | 158 | 1600 | 0.2442 | 0.2489 | 1.9% | 0.563 | 0.59 | 0.71 |
| omega-C.colour | 2000 | 7996 | 158 | 800 | 0.2432 | 0.2459 | 1.1% | 0.572 | 0.58 | 0.91 |

## Coverage by band (census pool: in-band, supported, nonland, not AI:RemoveDeck:All)

| band | pool | drawn | never drawn | 200+ deck-games | 1000+ | sd ≤ 2 pts | sd ≤ 3 pts | median sd | median deck-games | interval excludes 0 | extra census nights for median sd 2 pts |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pauper | 393 | 393 | 0 | 393 | 393 | 393 | 393 | 0.92 | 2160 | 139 | 0.0 |
| peasant | 398 | 398 | 0 | 398 | 398 | 398 | 398 | 0.91 | 2078 | 142 | 0.0 |
| legacy | 528 | 528 | 0 | 528 | 527 | 528 | 528 | 0.76 | 1519 | 156 | 0.0 |
| powered | 22 | 22 | 0 | 22 | 22 | 22 | 22 | 0.77 | 1510 | 12 | 0.0 |

## Agreement between sources (cards with 200+ deck-games in both)

| A | B | n | Pearson | Spearman | slope B on A | true-value r (disattenuated by split-half) |
|---|---|---|---|---|---|---|
| legacy.makeup | powered.makeup | 702 | 0.552 | 0.495 | 0.536 | 0.862 |
| pauper.makeup | peasant.makeup | 291 | 0.507 | 0.481 | 0.607 | 0.680 |
| peasant.makeup | legacy.makeup | 240 | 0.194 | 0.197 | 0.090 | 0.280 |
| legacy.makeup | legacy.colour (same games) | 771 | 0.987 | 0.984 | 0.983 | — |
| omega-C.makeup | omega-B.makeup | 133 | 0.602 | 0.535 | 0.462 | 1.038 |
| omega-C.colour | omega-B.colour | 133 | 0.583 | 0.523 | 0.441 | 0.996 |
| legacy+powered.makeup | omega-C.makeup | 134 | 0.417 | 0.322 | 0.383 | 0.659 |
| legacy+powered.makeup | omega-B.makeup | 114 | 0.622 | 0.553 | 0.472 | 0.933 |
| legacy.makeup | omega-C.makeup | 126 | 0.319 | 0.207 | 0.300 | 0.534 |
| powered.makeup | omega-C.makeup | 122 | 0.412 | 0.341 | 0.427 | 0.700 |

## Validation: Omega's measured payoffs (J145) predicted from the census alone

RMSE census-predicted: Blab 0.027, C 0.023; correlation Blab 0.841, C 0.781; transfer SD beyond both noises: Blab 0.000, C 0.000. In-sample (J145's own card fit): RMSE Blab 0.012, C 0.013.

| arm | cell | observed | census-predicted | J145-fit (in-sample) |
|---|---|---|---|---|
| Blab | W | 0.495 (0.475–0.513) | 0.521 (0.490–0.546) | 0.496 (0.483–0.511) |
| Blab | U | 0.480 (0.459–0.498) | 0.444 (0.416–0.477) | 0.480 (0.468–0.493) |
| Blab | B | 0.519 (0.498–0.538) | 0.520 (0.490–0.552) | 0.514 (0.499–0.526) |
| Blab | R | 0.527 (0.506–0.548) | 0.530 (0.501–0.559) | 0.523 (0.509–0.540) |
| Blab | G | 0.468 (0.446–0.489) | 0.481 (0.455–0.510) | 0.481 (0.466–0.494) |
| Blab | WU | 0.476 (0.450–0.501) | 0.470 (0.432–0.502) | 0.478 (0.464–0.493) |
| Blab | WB | 0.525 (0.483–0.563) | 0.577 (0.528–0.618) | 0.527 (0.506–0.547) |
| Blab | WR | 0.545 (0.507–0.578) | 0.569 (0.533–0.609) | 0.531 (0.512–0.553) |
| Blab | WG | 0.472 (0.428–0.510) | 0.504 (0.459–0.548) | 0.476 (0.459–0.495) |
| Blab | UB | 0.515 (0.491–0.540) | 0.486 (0.448–0.526) | 0.505 (0.488–0.520) |
| Blab | UR | 0.517 (0.481–0.554) | 0.474 (0.434–0.518) | 0.510 (0.492–0.528) |
| Blab | UG | 0.423 (0.382–0.465) | 0.403 (0.369–0.447) | 0.453 (0.430–0.476) |
| Blab | BR | 0.563 (0.496–0.634) | 0.579 (0.531–0.629) | 0.561 (0.534–0.584) |
| Blab | BG | 0.521 (0.464–0.578) | 0.529 (0.480–0.581) | 0.513 (0.492–0.531) |
| Blab | RG | 0.497 (0.444–0.553) | 0.527 (0.483–0.577) | 0.521 (0.500–0.543) |
| C | W | 0.507 (0.489–0.525) | 0.504 (0.470–0.528) | 0.501 (0.486–0.513) |
| C | U | 0.445 (0.429–0.462) | 0.409 (0.383–0.441) | 0.447 (0.433–0.458) |
| C | B | 0.493 (0.474–0.510) | 0.464 (0.437–0.493) | 0.495 (0.481–0.509) |
| C | R | 0.508 (0.489–0.524) | 0.492 (0.460–0.522) | 0.514 (0.499–0.528) |
| C | G | 0.457 (0.441–0.474) | 0.459 (0.432–0.492) | 0.455 (0.440–0.467) |
| C | WU | 0.475 (0.433–0.520) | 0.462 (0.431–0.491) | 0.468 (0.452–0.486) |
| C | WB | 0.538 (0.499–0.576) | 0.496 (0.465–0.525) | 0.517 (0.497–0.535) |
| C | WR | 0.520 (0.475–0.567) | 0.549 (0.517–0.581) | 0.533 (0.512–0.550) |
| C | WG | 0.470 (0.421–0.516) | 0.498 (0.467–0.528) | 0.469 (0.447–0.488) |
| C | UB | 0.455 (0.412–0.496) | 0.450 (0.416–0.481) | 0.472 (0.455–0.491) |
| C | UR | 0.496 (0.455–0.538) | 0.460 (0.434–0.489) | 0.489 (0.467–0.509) |
| C | UG | 0.424 (0.388–0.465) | 0.432 (0.400–0.464) | 0.446 (0.426–0.466) |
| C | BR | 0.504 (0.459–0.545) | 0.489 (0.461–0.519) | 0.509 (0.486–0.530) |
| C | BG | 0.468 (0.427–0.514) | 0.472 (0.441–0.501) | 0.472 (0.449–0.493) |
| C | RG | 0.522 (0.480–0.565) | 0.498 (0.468–0.528) | 0.489 (0.467–0.510) |

## legacy+powered.makeup: the 20 highest values

| card | band | colours | rating | value (pts) | 95% | deck-games |
|---|---|---|---|---|---|---|
| Sheoldred, the Apocalypse | legacy | B | 99 | +6.0 | +4.3 to +7.3 | 2991 |
| Wan Shi Tong, All-Knowing | legacy | U | 40 | +4.6 | +3.2 to +6.0 | 3036 |
| Ursine Monstrosity | legacy | G | 40 | +4.3 | +3.1 to +5.3 | 2718 |
| Wurmcoil Engine | legacy | C | 85 | +3.4 | +2.0 to +4.6 | 2698 |
| Spider-Woman, Stunning Savior | legacy | WU | 47 | +3.4 | +2.1 to +4.9 | 2557 |
| Baneslayer Angel | legacy | W | 50 | +3.4 | +1.9 to +4.9 | 2907 |
| Badgermole Cub | legacy | G | 48 | +3.2 | +1.7 to +4.9 | 2846 |
| Angel of Invention | legacy | W | 62 | +3.2 | +1.8 to +4.4 | 2798 |
| Exalted Angel | legacy | W | 95 | +3.2 | +2.0 to +4.4 | 2859 |
| Ajani, Nacatl Pariah | legacy | W | 98 | +3.1 | +1.9 to +4.2 | 3022 |
| Questing Beast | legacy | G | 47 | +3.1 | +1.8 to +4.7 | 2767 |
| Orcish Bowmasters | legacy | B | 100 | +3.1 | +1.8 to +4.3 | 3566 |
| Ocelot Pride | legacy | W | 99 | +3.1 | +1.6 to +4.4 | 3496 |
| Sol Ring | powered | C | 100 | +3.0 | +1.4 to +4.4 | 1789 |
| Scythecat Cub | legacy | G | 55 | +3.0 | +1.7 to +4.5 | 2896 |
| Palantír of Orthanc | legacy | C | 85 | +2.9 | +1.5 to +4.2 | 2765 |
| Garruk Relentless | legacy | G | 50 | +2.9 | +1.6 to +4.2 | 2842 |
| Archangel Avacyn | legacy | W | 50 | +2.8 | +1.5 to +4.2 | 3065 |
| Figure of Fable | legacy | WG | 49 | +2.8 | +1.5 to +4.3 | 2399 |
| Loxodon Smiter | peasant | WG | 44 | +2.8 | +1.1 to +4.3 | 496 |

## legacy+powered.makeup: the 20 lowest values

| card | band | colours | rating | value (pts) | 95% | deck-games |
|---|---|---|---|---|---|---|
| Grindstone | legacy | C | 52 | -6.7 | -7.8 to -5.5 | 3262 |
| Aang's Iceberg | legacy | W | 36 | -4.4 | -5.7 to -3.1 | 2732 |
| Cosmic Horror | legacy | B | 40 | -4.2 | -5.3 to -2.9 | 3596 |
| Stasis | legacy | U | 31 | -4.1 | -5.4 to -2.7 | 3391 |
| Mystic Forge | powered | C | 70 | -4.0 | -5.8 to -2.3 | 1855 |
| Demonic Hordes | legacy | B | 45 | -3.8 | -5.2 to -2.6 | 3485 |
| Howling Mine | legacy | C | 44 | -3.4 | -4.9 to -2.1 | 2861 |
| Obsessive Pursuit | legacy | B | 43 | -3.4 | -4.7 to -2.0 | 3783 |
| Blood Moon | legacy | R | 46 | -3.4 | -4.7 to -1.8 | 2988 |
| Mystical Tutor | powered | U | 98 | -3.4 | -4.9 to -2.0 | 1791 |
| Lion Sash | legacy | W | 48 | -3.3 | -4.6 to -2.1 | 3277 |
| Time Vault | powered | C | 100 | -3.3 | -4.9 to -1.8 | 1613 |
| Volcanic Eruption | legacy | U | 33 | -3.2 | -4.5 to -1.8 | 3180 |
| Forcefield | legacy | C | 43 | -3.1 | -4.4 to -1.9 | 2989 |
| Kormus Bell | legacy | C | 31 | -3.0 | -4.2 to -1.8 | 3291 |
| Yawgmoth's Will | powered | B | 96 | -3.0 | -4.5 to -1.3 | 1678 |
| Vicious Rivalry | legacy | BG | 41 | -2.9 | -4.2 to -1.6 | 2907 |
| Meekstone | legacy | C | 50 | -2.8 | -4.1 to -1.4 | 2909 |
| All Hallow's Eve | legacy | B | 25 | -2.8 | -4.1 to -1.6 | 3486 |
| Baloth Prime | legacy | G | 40 | -2.8 | -4.1 to -1.5 | 2975 |

## pauper.makeup: the 20 highest values

| card | band | colours | rating | value (pts) | 95% | deck-games |
|---|---|---|---|---|---|---|
| Aerie Auxiliary | pauper | W | 45 | +6.6 | +4.9 to +8.1 | 2477 |
| Llanowar Visionary | pauper | G | 54 | +5.4 | +3.9 to +7.2 | 2141 |
| Primordial Pachyderm | pauper | G | 30 | +4.8 | +2.6 to +6.3 | 2377 |
| Owlbear | pauper | G | 36 | +4.6 | +2.8 to +6.2 | 2301 |
| Cloudkin Seer | pauper | U | 44 | +4.5 | +2.7 to +6.1 | 2367 |
| Amethyst Dragon | peasant | R | 67 | +4.4 | +1.7 to +7.0 | 287 |
| Bloodwater Entity | pauper | UR | 37 | +4.3 | +2.3 to +6.0 | 2111 |
| Murmuring Mystic | pauper | U | 50 | +4.2 | +2.5 to +6.0 | 1903 |
| Attended Knight | pauper | W | 33 | +4.0 | +2.1 to +6.0 | 2220 |
| Spinewoods Paladin | pauper | G | 39 | +3.8 | +1.8 to +5.5 | 2075 |
| Crude Bent Blade | pauper | B | 11 | +3.7 | +2.1 to +5.3 | 2352 |
| Inspiring Overseer | pauper | W | 52 | +3.7 | +2.2 to +5.3 | 2701 |
| Flametongue Kavu | peasant | R | 56 | +3.5 | +1.7 to +5.2 | 207 |
| Savage Land Dinosaur | pauper | G | 16 | +3.4 | +1.4 to +5.4 | 2062 |
| Scurry Oak | peasant | G | 79 | +3.4 | +1.1 to +5.3 | 319 |
| Sprout Swarm | pauper | G | 45 | +3.3 | +1.6 to +5.1 | 2190 |
| Dragon Whelp | peasant | R | 41 | +3.3 | +1.0 to +5.2 | 320 |
| Mischievous Mystic | peasant | U | 96 | +3.2 | +1.1 to +4.8 | 240 |
| Gollum, Silent Slinker | pauper | B | 7 | +3.2 | +1.3 to +5.1 | 2144 |
| Battle Screech | pauper | W | 73 | +3.1 | +1.4 to +4.9 | 2969 |

## pauper.makeup: the 20 lowest values

| card | band | colours | rating | value (pts) | 95% | deck-games |
|---|---|---|---|---|---|---|
| Ashnod's Altar | pauper | C | 18 | -5.3 | -7.1 to -3.5 | 2126 |
| Jalum Tome | pauper | C | 37 | -4.6 | -6.2 to -2.9 | 2173 |
| Artifact Blast | pauper | R | 7 | -4.6 | -6.3 to -2.9 | 1984 |
| Frantic Search | pauper | U | 58 | -4.6 | -6.4 to -3.1 | 2207 |
| Shatter | pauper | R | 40 | -4.6 | -6.1 to -2.8 | 2192 |
| Sewer-veillance Cam | pauper | U | 38 | -4.4 | -6.0 to -2.5 | 2319 |
| Unsummon | pauper | U | 40 | -4.2 | -6.0 to -2.1 | 2048 |
| Raid Bombardment | pauper | R | 13 | -4.2 | -6.2 to -2.0 | 1872 |
| Spell Pierce | pauper | U | 85 | -4.0 | -6.0 to -1.9 | 2272 |
| Fling | pauper | R | 31 | -3.8 | -5.8 to -1.9 | 2143 |
| Aether Spellbomb | pauper | C | 50 | -3.8 | -5.6 to -1.8 | 2031 |
| Immolation | pauper | R | 37 | -3.8 | -5.5 to -1.9 | 2271 |
| Spellstutter Sprite | pauper | U | 70 | -3.8 | -5.3 to -2.2 | 2384 |
| Trickster's Stratagem | pauper | U | 32 | -3.7 | -5.6 to -2.0 | 2127 |
| Contagious Vorrac | pauper | G | 35 | -3.7 | -5.4 to -1.9 | 2045 |
| Cathartic Reunion | pauper | R | 62 | -3.7 | -5.3 to -1.7 | 2224 |
| Shatterstorm | peasant | R | 47 | -3.7 | -5.6 to -1.7 | 224 |
| Everflowing Chalice | pauper | C | 46 | -3.7 | -5.3 to -2.0 | 2272 |
| Tormod's Crypt | pauper | C | 33 | -3.6 | -5.3 to -2.1 | 2413 |
| Stickytongue Sentinel | pauper | G | 27 | -3.6 | -5.6 to -2.0 | 2094 |

## omega-B.makeup: the 20 highest values

| card | band | colours | rating | value (pts) | 95% | deck-games |
|---|---|---|---|---|---|---|
| Sheoldred, the Apocalypse | legacy | B | 99 | +2.6 | +1.4 to +3.7 | 3040 |
| Sower of Temptation | legacy | U | 96 | +2.4 | +1.3 to +3.5 | 4052 |
| Wurmcoil Engine | legacy | C | 85 | +2.3 | +1.3 to +3.2 | 5240 |
| Sword of Light and Shadow | legacy | C | 50 | +1.8 | +0.8 to +2.8 | 2492 |
| Wedding Announcement | legacy | W | 87 | +1.6 | +0.5 to +2.5 | 3260 |
| Orcish Bowmasters | legacy | B | 100 | +1.5 | +0.3 to +2.5 | 3134 |
| Consecrated Sphinx | legacy | U | 85 | +1.4 | +0.4 to +2.3 | 3598 |
| Batterskull | legacy | C | 50 | +1.4 | +0.0 to +2.5 | 972 |
| Sword of Feast and Famine | legacy | C | 52 | +1.3 | +0.2 to +2.3 | 1556 |
| Luminarch Aspirant | legacy | W | 96 | +1.3 | +0.2 to +2.2 | 3590 |
| Baneslayer Angel | legacy | W | 50 | +1.2 | -0.1 to +2.4 | 912 |
| Inferno Titan | legacy | R | 80 | +1.2 | +0.0 to +2.3 | 1830 |
| Goblin Rabblemaster | legacy | R | 64 | +1.2 | +0.0 to +2.2 | 1528 |
| Jace, the Mind Sculptor | legacy | U | 99 | +1.2 | +0.0 to +2.2 | 3950 |
| Sword of Fire and Ice | legacy | C | 54 | +1.1 | -0.2 to +2.2 | 2140 |
| Man-o'-War | pauper | U | 87 | +1.1 | +0.0 to +2.2 | 3530 |
| Karn Liberated | legacy | C | 65 | +1.0 | -0.1 to +2.1 | 2976 |
| Karn, Scion of Urza | legacy | C | 58 | +1.0 | -0.3 to +2.2 | 3368 |
| Liliana of the Veil | legacy | B | 59 | +0.9 | -0.3 to +2.0 | 1658 |
| Bonecrusher Giant | legacy | R | 85 | +0.9 | -0.3 to +2.0 | 2122 |

## omega-B.makeup: the 20 lowest values

| card | band | colours | rating | value (pts) | 95% | deck-games |
|---|---|---|---|---|---|---|
| Umezawa's Jitte | legacy | C | 98 | -3.0 | -4.0 to -1.9 | 5544 |
| Skullclamp | peasant | C | 99 | -2.1 | -3.1 to -1.0 | 5632 |
| Force of Will | peasant | U | 100 | -2.0 | -2.9 to -1.0 | 4100 |
| Phyrexian Arena | legacy | B | 61 | -1.9 | -3.0 to -1.0 | 1062 |
| Rampaging Baloths | legacy | G | 83 | -1.7 | -2.6 to -0.7 | 1538 |
| Bone Shards | pauper | B | 86 | -1.7 | -2.7 to -0.6 | 2346 |
| Morphling | legacy | U | 94 | -1.7 | -2.8 to -0.6 | 3990 |
| Fact or Fiction | peasant | U | 55 | -1.6 | -2.8 to -0.4 | 1444 |
| Wrath of God | legacy | W | 68 | -1.5 | -2.6 to -0.4 | 2208 |
| Path to Exile | peasant | W | 86 | -1.4 | -2.4 to -0.2 | 2548 |
| Vendilion Clique | legacy | U | 88 | -1.3 | -2.5 to -0.3 | 3598 |
| Brimaz, King of Oreskos | legacy | W | 76 | -1.3 | -2.2 to -0.3 | 2850 |
| Walking Ballista | legacy | C | 85 | -1.2 | -2.3 to -0.4 | 4988 |
| Cryptic Command | legacy | U | 54 | -1.2 | -2.1 to -0.1 | 482 |
| Snapcaster Mage | legacy | U | 98 | -1.1 | -2.0 to -0.1 | 4226 |
| Preordain | pauper | U | 85 | -1.0 | -2.2 to +0.1 | 3444 |
| Treasure Cruise | pauper | U | 50 | -1.0 | -1.7 to -0.1 | 346 |
| Titania, Protector of Argoth | legacy | G | 58 | -1.0 | -2.1 to +0.4 | 1234 |
| Reanimate | peasant | B | 99 | -0.9 | -2.2 to +0.3 | 2822 |
| Lightning Bolt | pauper | R | 99 | -0.8 | -1.9 to +0.2 | 2434 |

## omega-C.makeup: the 20 highest values

| card | band | colours | rating | value (pts) | 95% | deck-games |
|---|---|---|---|---|---|---|
| Sword of Feast and Famine | legacy | C | 52 | +2.9 | +1.1 to +4.2 | 2375 |
| Sheoldred, the Apocalypse | legacy | B | 99 | +2.9 | +1.6 to +4.2 | 2647 |
| Sword of Light and Shadow | legacy | C | 50 | +2.4 | +0.9 to +3.8 | 2351 |
| Control Magic | peasant | U | 72 | +2.3 | +0.6 to +3.8 | 2536 |
| Doom Blade | pauper | B | 55 | +2.2 | +0.5 to +3.7 | 2567 |
| Sower of Temptation | legacy | U | 96 | +2.1 | +0.7 to +3.5 | 2584 |
| Lingering Souls | peasant | W | 81 | +2.0 | +0.4 to +3.6 | 2702 |
| Orcish Bowmasters | legacy | B | 100 | +1.9 | +0.3 to +3.5 | 2550 |
| Hangarback Walker | legacy | C | 52 | +1.9 | +0.3 to +3.2 | 2382 |
| Delver of Secrets | pauper | U | 20 | +1.7 | +0.2 to +3.4 | 2512 |
| Blade Splicer | legacy | W | 63 | +1.7 | +0.2 to +3.1 | 2567 |
| Glorybringer | legacy | R | 55 | +1.7 | -0.2 to +3.3 | 2360 |
| Liliana, the Last Hope | legacy | B | 86 | +1.6 | +0.2 to +3.1 | 2703 |
| Craterhoof Behemoth | legacy | G | 76 | +1.6 | +0.1 to +3.3 | 2349 |
| Ravenous Chupacabra | peasant | B | 53 | +1.5 | +0.3 to +3.4 | 2622 |
| Baneslayer Angel | legacy | W | 50 | +1.4 | -0.1 to +3.0 | 2648 |
| Batterskull | legacy | C | 50 | +1.4 | -0.3 to +3.1 | 2168 |
| Nissa, Who Shakes the World | legacy | G | 79 | +1.4 | -0.1 to +3.0 | 2244 |
| Mother of Runes | peasant | W | 85 | +1.3 | -0.2 to +2.6 | 2510 |
| Luminarch Aspirant | legacy | W | 96 | +1.2 | -0.3 to +2.9 | 2558 |

## omega-C.makeup: the 20 lowest values

| card | band | colours | rating | value (pts) | 95% | deck-games |
|---|---|---|---|---|---|---|
| Everflowing Chalice | pauper | C | 46 | -3.5 | -5.1 to -1.9 | 2456 |
| Morphling | legacy | U | 94 | -2.8 | -4.3 to -1.4 | 2536 |
| Treasure Cruise | pauper | U | 50 | -2.8 | -4.4 to -1.3 | 2352 |
| Titania, Protector of Argoth | legacy | G | 58 | -2.8 | -4.1 to -1.1 | 2300 |
| Fact or Fiction | peasant | U | 55 | -2.7 | -4.3 to -1.0 | 2536 |
| Phyrexian Arena | legacy | B | 61 | -2.5 | -3.7 to -0.9 | 2583 |
| Umezawa's Jitte | legacy | C | 98 | -2.2 | -3.5 to -0.8 | 2199 |
| Fire // Ice | pauper | UR | 43 | -1.9 | -3.6 to -0.6 | 952 |
| Smuggler's Copter | legacy | C | 49 | -1.9 | -3.3 to -0.3 | 2190 |
| Rancor | pauper | G | 47 | -1.8 | -3.2 to -0.1 | 2399 |
| Tireless Tracker | legacy | G | 83 | -1.7 | -3.0 to -0.3 | 2134 |
| Grave Titan | legacy | B | 50 | -1.6 | -3.0 to -0.1 | 2502 |
| Knight of the Reliquary | legacy | WG | 43 | -1.6 | -3.4 to +0.0 | 999 |
| Sun Titan | legacy | W | 65 | -1.6 | -3.0 to -0.1 | 2728 |
| Solitude | legacy | W | 99 | -1.5 | -3.3 to +0.1 | 2591 |
| Shivan Dragon | peasant | R | 50 | -1.5 | -2.9 to -0.0 | 2439 |
| Restoration Angel | legacy | W | 49 | -1.5 | -3.1 to +0.0 | 2670 |
| Adeline, Resplendent Cathar | legacy | W | 93 | -1.4 | -3.1 to +0.3 | 2470 |
| Path to Exile | peasant | W | 86 | -1.4 | -3.3 to +0.4 | 2592 |
| Falkenrath Aristocrat | legacy | BR | 48 | -1.4 | -2.9 to +0.0 | 1022 |

## The generated cubes: predicted payoff (lab drafter, Forge piloting)

Deck mix (J145 lab two-colour decks): 9.13 cards of each colour, 0.45 gold, 4.18 colourless. Play weight by Forge rating (J145, 158 cards): -0.332 + 0.0095 x rating, clipped to [.05, 1].

### balanced-legacy-even-high

every class's cards near +2.0 points (the highest level each colour can hold), valued by the legacy + powered census

max |colour − .5| 0.001, max |pair − .5| 0.003 (after the flow alone, colour + pair gap 0.114; 16 balancing swaps); unmeasured nonland cards 0; 180 cards.

| | W | U | B | R | G |
|---|---|---|---|---|---|
| payoff | 0.500 (0.472–0.530) | 0.500 (0.469–0.533) | 0.501 (0.468–0.534) | 0.499 (0.469–0.534) | 0.501 (0.469–0.536) |
| mean rating, top 24 (pull proxy) | 75.0 | 75.1 | 63.8 | 75.4 | 64.8 |

| WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|
| 0.499 (0.460–0.534) | 0.498 (0.460–0.531) | 0.503 (0.472–0.537) | 0.500 (0.469–0.539) | 0.502 (0.468–0.537) | 0.498 (0.461–0.538) | 0.501 (0.464–0.535) | 0.499 (0.461–0.532) | 0.503 (0.470–0.538) | 0.498 (0.461–0.537) |

| class | cards | measured | mean value (pts) | mean rating | creatures |
|---|---|---|---|---|---|
| W | 24 | 24 | +1.4 | 65.4 | 18 |
| U | 24 | 24 | +1.4 | 69.5 | 20 |
| B | 24 | 24 | +1.3 | 60.7 | 20 |
| R | 24 | 24 | +1.4 | 67.7 | 21 |
| G | 24 | 24 | +1.2 | 60.5 | 20 |
| WU | 2 | 2 | +1.1 | 73.2 | 1 |
| WB | 2 | 2 | +1.0 | 66.0 | 2 |
| WR | 2 | 2 | +2.5 | 97.9 | 1 |
| WG | 2 | 2 | +2.1 | 44.4 | 2 |
| UB | 2 | 2 | +0.4 | 34.5 | 2 |
| UR | 2 | 2 | +0.5 | 59.0 | 0 |
| UG | 2 | 2 | +1.5 | 62.5 | 2 |
| BR | 2 | 2 | +0.5 | 48.5 | 1 |
| BG | 2 | 2 | +1.7 | 45.8 | 1 |
| RG | 2 | 2 | +1.9 | 40.0 | 2 |
| C | 18 | 18 | +1.6 | 78.5 | 3 |

### balanced-legacy-even-mid

every class's cards near 0 points (the band's average card), valued by the legacy + powered census

max |colour − .5| 0.000, max |pair − .5| 0.002 (after the flow alone, colour + pair gap 0.030; 10 balancing swaps); unmeasured nonland cards 0; 180 cards.

| | W | U | B | R | G |
|---|---|---|---|---|---|
| payoff | 0.500 (0.465–0.529) | 0.500 (0.465–0.531) | 0.500 (0.469–0.534) | 0.500 (0.464–0.540) | 0.500 (0.471–0.534) |
| mean rating, top 24 (pull proxy) | 64.6 | 82.5 | 76.3 | 61.1 | 61.3 |

| WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|
| 0.501 (0.467–0.535) | 0.501 (0.471–0.538) | 0.499 (0.465–0.537) | 0.499 (0.470–0.544) | 0.499 (0.458–0.534) | 0.499 (0.464–0.530) | 0.501 (0.470–0.532) | 0.501 (0.461–0.533) | 0.498 (0.463–0.532) | 0.501 (0.462–0.540) |

| class | cards | measured | mean value (pts) | mean rating | creatures |
|---|---|---|---|---|---|
| W | 24 | 24 | -0.1 | 59.1 | 12 |
| U | 24 | 24 | -0.1 | 73.0 | 16 |
| B | 24 | 24 | -0.0 | 66.6 | 18 |
| R | 24 | 24 | +0.0 | 49.5 | 17 |
| G | 24 | 24 | +0.0 | 56.9 | 19 |
| WU | 2 | 2 | +0.0 | 60.2 | 1 |
| WB | 2 | 2 | -0.4 | 67.2 | 1 |
| WR | 2 | 2 | -0.1 | 43.7 | 1 |
| WG | 2 | 2 | -0.4 | 45.8 | 1 |
| UB | 2 | 2 | -0.2 | 97.6 | 1 |
| UR | 2 | 2 | +0.2 | 85.2 | 0 |
| UG | 2 | 2 | -0.0 | 49.1 | 2 |
| BR | 2 | 2 | +0.4 | 59.8 | 1 |
| BG | 2 | 2 | -0.5 | 60.3 | 2 |
| RG | 2 | 2 | +0.2 | 38.5 | 1 |
| C | 18 | 18 | +0.0 | 63.4 | 7 |

### balanced-pauper-even

every class's cards near +0.0 points (the highest level each colour can hold), valued by the pauper census, pauper cards only where they fill the plan

max |colour − .5| 0.001, max |pair − .5| 0.008 (after the flow alone, colour + pair gap 0.163; 13 balancing swaps); unmeasured nonland cards 0; 180 cards.

| | W | U | B | R | G |
|---|---|---|---|---|---|
| payoff | 0.501 (0.455–0.557) | 0.499 (0.456–0.541) | 0.500 (0.449–0.545) | 0.500 (0.449–0.555) | 0.501 (0.451–0.551) |
| mean rating, top 24 (pull proxy) | 52.2 | 63.0 | 53.3 | 58.0 | 46.7 |

| WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|
| 0.503 (0.447–0.556) | 0.497 (0.446–0.555) | 0.500 (0.441–0.560) | 0.502 (0.443–0.563) | 0.508 (0.457–0.565) | 0.495 (0.441–0.550) | 0.493 (0.443–0.536) | 0.497 (0.440–0.549) | 0.499 (0.448–0.551) | 0.508 (0.458–0.560) |

| class | cards | measured | mean value (pts) | mean rating | creatures |
|---|---|---|---|---|---|
| W | 24 | 24 | +0.2 | 47.5 | 15 |
| U | 24 | 24 | +0.3 | 59.5 | 14 |
| B | 24 | 24 | +0.2 | 49.6 | 17 |
| R | 24 | 24 | +0.1 | 51.4 | 12 |
| G | 24 | 24 | +0.6 | 41.3 | 20 |
| WU | 2 | 2 | +0.3 | 33.7 | 2 |
| WB | 2 | 2 | -0.6 | 33.9 | 1 |
| WR | 2 | 2 | +0.1 | 39.1 | 1 |
| WG | 2 | 2 | +0.7 | 37.3 | 2 |
| UB | 2 | 2 | +1.5 | 43.5 | 2 |
| UR | 2 | 2 | -0.9 | 39.7 | 0 |
| UG | 2 | 2 | -1.3 | 33.4 | 2 |
| BR | 2 | 2 | -0.8 | 49.3 | 1 |
| BG | 2 | 2 | +0.1 | 20.5 | 2 |
| RG | 2 | 2 | +1.8 | 68.5 | 1 |
| C | 18 | 18 | +0.1 | 47.1 | 8 |

## The measurement programme, simulated

Model error per cell = sqrt(prediction SD² + transfer SD²): prediction SD colour 0.017, pair 0.019 (the generated cubes' bootstrap, median); transfer SD measured on Omega 0.000, and .015 and .03 as what-ifs. A measurement is J145's arm B: 2672 deck-games per colour cell; pairs at the bots' J145 pull (1564/680/850/576/1616/806/544/238/382/350) or even pull (761 each). Each night's refit divides the error variance by 1 + 0.5 x nights. A pass needs a second fresh-seed measurement (the next night's first slot). 2,000 simulated programmes, 30 nights at most.

| transfer SD | pull | rule | measurement size (x J145 arm B) | cubes a night | median nights | 80th pct | confirmed by night 5 | by night 10 | within 30 | confirmed cube truly in band |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.000 | bot pull (J145) | no-off | 1 | 1 | 4 | 6 | 72% | 99% | 100% | 99% |
| 0.000 | bot pull (J145) | no-off | 1 | 4 | 3 | 4 | 96% | 100% | 100% | 99% |
| 0.000 | bot pull (J145) | no-off | 1 | 8 | 3 | 4 | 98% | 100% | 100% | 98% |
| 0.000 | bot pull (J145) | all-even | 1 | 1 | >30 | >30 | 0% | 0% | 0% | 100% |
| 0.000 | bot pull (J145) | all-even | 1 | 4 | >30 | >30 | 0% | 0% | 0% | 100% |
| 0.000 | bot pull (J145) | all-even | 1 | 8 | >30 | >30 | 0% | 0% | 0% | 100% |
| 0.000 | bot pull (J145) | all-even | 3 | 1 | >30 | >30 | 2% | 10% | 50% | 100% |
| 0.000 | bot pull (J145) | all-even | 3 | 4 | 15 | 24 | 8% | 30% | 90% | 100% |
| 0.000 | bot pull (J145) | all-even | 3 | 8 | 11 | 18 | 13% | 46% | 98% | 100% |
| 0.000 | even pull | no-off | 1 | 1 | 5 | 7 | 63% | 97% | 100% | 100% |
| 0.000 | even pull | no-off | 1 | 4 | 3 | 4 | 94% | 100% | 100% | 99% |
| 0.000 | even pull | no-off | 1 | 8 | 3 | 4 | 96% | 100% | 100% | 99% |
| 0.000 | even pull | all-even | 1 | 1 | >30 | >30 | 0% | 0% | 0% | — |
| 0.000 | even pull | all-even | 1 | 4 | >30 | >30 | 0% | 0% | 0% | — |
| 0.000 | even pull | all-even | 1 | 8 | >30 | >30 | 0% | 0% | 0% | — |
| 0.000 | even pull | all-even | 3 | 1 | 6 | 9 | 38% | 89% | 100% | 100% |
| 0.000 | even pull | all-even | 3 | 4 | 4 | 6 | 75% | 100% | 100% | 100% |
| 0.000 | even pull | all-even | 3 | 8 | 4 | 5 | 85% | 100% | 100% | 100% |
| 0.015 | bot pull (J145) | no-off | 1 | 1 | 6 | 8 | 44% | 93% | 100% | 99% |
| 0.015 | bot pull (J145) | no-off | 1 | 4 | 4 | 5 | 83% | 100% | 100% | 97% |
| 0.015 | bot pull (J145) | no-off | 1 | 8 | 3 | 5 | 90% | 100% | 100% | 95% |
| 0.015 | bot pull (J145) | all-even | 1 | 1 | >30 | >30 | 0% | 0% | 0% | — |
| 0.015 | bot pull (J145) | all-even | 1 | 4 | >30 | >30 | 0% | 0% | 0% | 100% |
| 0.015 | bot pull (J145) | all-even | 1 | 8 | >30 | >30 | 0% | 0% | 0% | 100% |
| 0.015 | bot pull (J145) | all-even | 3 | 1 | >30 | >30 | 1% | 5% | 40% | 100% |
| 0.015 | bot pull (J145) | all-even | 3 | 4 | 19 | 29 | 3% | 18% | 83% | 100% |
| 0.015 | bot pull (J145) | all-even | 3 | 8 | 14 | 22 | 6% | 28% | 93% | 100% |
| 0.015 | even pull | no-off | 1 | 1 | 7 | 9 | 33% | 89% | 100% | 100% |
| 0.015 | even pull | no-off | 1 | 4 | 4 | 6 | 73% | 100% | 100% | 99% |
| 0.015 | even pull | no-off | 1 | 8 | 4 | 5 | 82% | 100% | 100% | 99% |
| 0.015 | even pull | all-even | 1 | 1 | >30 | >30 | 0% | 0% | 0% | — |
| 0.015 | even pull | all-even | 1 | 4 | >30 | >30 | 0% | 0% | 0% | — |
| 0.015 | even pull | all-even | 1 | 8 | >30 | >30 | 0% | 0% | 0% | — |
| 0.015 | even pull | all-even | 3 | 1 | 9 | 12 | 14% | 67% | 100% | 100% |
| 0.015 | even pull | all-even | 3 | 4 | 6 | 8 | 40% | 97% | 100% | 100% |
| 0.015 | even pull | all-even | 3 | 8 | 5 | 7 | 55% | 99% | 100% | 100% |
| 0.030 | bot pull (J145) | no-off | 1 | 1 | 10 | 14 | 10% | 56% | 100% | 98% |
| 0.030 | bot pull (J145) | no-off | 1 | 4 | 7 | 9 | 28% | 92% | 100% | 93% |
| 0.030 | bot pull (J145) | no-off | 1 | 8 | 6 | 8 | 43% | 97% | 100% | 90% |
| 0.030 | bot pull (J145) | all-even | 1 | 1 | >30 | >30 | 0% | 0% | 0% | — |
| 0.030 | bot pull (J145) | all-even | 1 | 4 | >30 | >30 | 0% | 0% | 0% | 100% |
| 0.030 | bot pull (J145) | all-even | 1 | 8 | >30 | >30 | 0% | 0% | 0% | 100% |
| 0.030 | bot pull (J145) | all-even | 3 | 1 | >30 | >30 | 0% | 1% | 20% | 100% |
| 0.030 | bot pull (J145) | all-even | 3 | 4 | 28 | >30 | 0% | 3% | 57% | 100% |
| 0.030 | bot pull (J145) | all-even | 3 | 8 | 22 | >30 | 0% | 7% | 77% | 100% |
| 0.030 | even pull | no-off | 1 | 1 | 11 | 15 | 4% | 45% | 100% | 99% |
| 0.030 | even pull | no-off | 1 | 4 | 8 | 10 | 17% | 83% | 100% | 98% |
| 0.030 | even pull | no-off | 1 | 8 | 7 | 9 | 30% | 92% | 100% | 97% |
| 0.030 | even pull | all-even | 1 | 1 | >30 | >30 | 0% | 0% | 0% | — |
| 0.030 | even pull | all-even | 1 | 4 | >30 | >30 | 0% | 0% | 0% | — |
| 0.030 | even pull | all-even | 1 | 8 | >30 | >30 | 0% | 0% | 0% | — |
| 0.030 | even pull | all-even | 3 | 1 | 15 | 20 | 1% | 18% | 99% | 100% |
| 0.030 | even pull | all-even | 3 | 4 | 11 | 14 | 3% | 48% | 100% | 100% |
| 0.030 | even pull | all-even | 3 | 8 | 9 | 12 | 7% | 67% | 100% | 100% |

## Omega (appendix)

The census model on Omega's list (the analytic deck mix, cards weighted by the play curve), and after up to ten like-for-like upgrades under evolve's add rules and Omega's notes:

| | W | U | B | R | G |
|---|---|---|---|---|---|
| v1 | 0.512 (0.488–0.536) | 0.448 (0.426–0.475) | 0.526 (0.498–0.557) | 0.528 (0.502–0.556) | 0.487 (0.460–0.519) |
| after 10 swaps | 0.498 (0.472–0.522) | 0.499 (0.474–0.523) | 0.502 (0.474–0.537) | 0.502 (0.475–0.528) | 0.498 (0.472–0.530) |

| | WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|---|
| v1 | 0.468 | 0.529 | 0.538 | 0.498 | 0.480 | 0.474 | 0.440 | 0.547 | 0.512 | 0.515 |
| after | 0.501 | 0.496 | 0.503 | 0.496 | 0.504 | 0.497 | 0.496 | 0.503 | 0.502 | 0.503 |

| # | cut | value | add | value |
|---|---|---|---|---|
| 1 | Morphling | -1.6 | Urza, Lord High Artificer | +1.6 |
| 2 | Snapcaster Mage | -1.4 | Ledger Shredder | +1.6 |
| 3 | Tireless Tracker | -1.4 | Six | +2.1 |
| 4 | Vendilion Clique | -1.7 | Subtlety | +1.6 |
| 5 | Murktide Regent | -0.3 | Malcolm, Alluring Scoundrel | +1.6 |
| 6 | Young Pyromancer | -1.0 | Broadside Bombardiers | -0.5 |
| 7 | Bloodghast | -0.7 | Deep-Cavern Bat | -0.6 |
| 8 | Siege-Gang Commander | -0.2 | Gut, True Soul Zealot | -0.2 |
| 9 | Jace, Vryn's Prodigy | -0.2 | Mischievous Mystic | +0.2 |
| 10 | Hymn to Tourach | +0.0 | Morbid Opportunist | +0.1 |

