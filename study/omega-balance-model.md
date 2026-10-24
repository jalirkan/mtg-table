# The library card model and the balanced-cube generator (2026-10-24)

*Written by the PC lab-analysis lane, 2026-10-24, from the recorded data only (no engine run; J159 was running). Code: mtg-table branch `pc/balance-model` (D473), `tools/cubelab.sh balance-model`. Every number below is in `omega-balance-model/model.json`; the full tables (top and bottom 20 per source, every cube's class table, every programme scenario) are `omega-balance-model/summary.md`, and every card's value is in `omega-balance-model/cards-<source>.tsv`.*

**Justin's question** (2026-10-24 01:25): out of the 1,000+ cards in the library, what makes the most balanced cube — every colour and every colour pair winning evenly when drafted (the lab drafter as the proxy) and played. How evenly each colour is drafted is reported beside it, not optimised. Every payoff here is Forge's AI playing both seats.

## The answer in five lines

1. **Every card the census drew has a value.** 1,341 nonland library cards (pauper 393, peasant 398, legacy 528, powered 22 — all supported, none AI:RemoveDeck:All) have a median of 1,500–2,200 deck-games each (at least 992) and a median SD of 0.8–0.9 win-rate points. Coverage is complete; precision is the limit: the cards' true values spread only 1.0–1.5 points (SD), so one census night measures them with reliability .65–.75.
2. **The census model predicts what a drafted cube does.** Fitted on random library decks only, applied to the 4,000 games of lab-drafted Omega decks in J145, it predicts the measured colour and pair payoffs with r 0.84 (RMSE 0.027); on J145's random Omega decks r 0.78 (RMSE 0.023). It gets blue (.444 predicted, .480 measured) and UG (.403 against .423) low without ever having seen an Omega draft.
3. **Three generated cubes** (no archetypes, no hand choices) are predicted even in every colour and every pair to within .01, with model intervals of about ±.035 (legacy) and ±.05 (pauper): `cubes/library/balanced/balanced-legacy-even-high.md`, `-legacy-even-mid.md`, `-pauper-even.md`.
4. **One 10-hour night at 6 workers measures about 19 candidate cubes** on J145's judged arm (2,000 lab drafts, 4,000 games, ~0.5 h each), or 6 at three times that size, or 6 full J145 shapes.
5. **Nights to a confirmed balanced cube**, simulated with the model's own error: 3–4 nights at 4–8 candidates a night for "every colour EVEN, no pair OFF" (J145's registered rule, plus pairs). "Every pair EVEN with its interval" needs measurements three times J145's arm B and even pull: 4–6 nights; with the bots' current pull (BR, BG, RG drafted rarely), 11–19 nights or more.

## The method

| part | what | why |
|---|---|---|
| model | ridge linear-probability model of a decisive game: P(a wins) − ½ = Σ β_c (x_ac − x_bc) + Σ γ_m (z_am − z_bm) + π·play, nonland cards only | a deck's predicted payoff is then the sum of its cards' values, which is what a generator adds up; every census rate sits in .35–.65, where linear and logistic agree |
| makeup control | groups = colour count (colours with 3+ spells) × main-colour pip share (<.5, .5–.7, .7–.9, .9–<1, mono), per band | D447/J149's structure (mono > .5, four and five colours < .5, the main-share slope); no colour identity, so a card's value is absolute within its band and a colour's strength is the sum of its cards |
| D377-style null | the opponent enters antisymmetrically (minus its cards and its group); the colour-identity grouping (D377's own) is fitted too | the two groupings agree on card values to r .987 (legacy) |
| penalties | cards: 5-fold held-out Brier (λ 400 pauper/peasant, 800 legacy/powered, 1,600 J145-B); groups: 20 pseudo-games (D377's shrinkage) | the held-out choice, not a guess |
| weights | every decisive game once | as D377 counts games |
| intervals | deck bootstrap, 200 replicates, each game carried by one of its decks' clusters (drafts for J145 arm B) | the product-weight bootstrap inflated the game-noise part 1.6x (median SD .0109 against .0069 for both a game bootstrap and this one): deck clustering is small beside game noise |
| reliability | split halves (even against odd games), Spearman–Brown | a shrunk estimator's bootstrap SD understates its noise relative to its spread |
| sources | the four census bands, legacy + powered together (makeup groups kept apart by band), J145 arm B (drafted Omega decks) and arm C (random Omega decks) | the census is the library-wide source; J145 is the drafted-context check |

**Not used: the decision rows for cast rates.** The rows name cards by in-game id (`cast:18`), not by name, so a cast and stranded rate per card needs an id-to-name map per game (a `census-replay --record full` slice, or a small bridge change that writes the map into the `begin` row). Not cheap tonight; listed as a follow-up.

## Fit quality

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

- **Skill** is the cut in held-out Brier score from adding cards to the makeup-only model: 5–7% in the census, 2% on J145 (whose decks are all two-colour, so the makeup groups carry less).
- **True spread** is SD(values) × √reliability: a card in a random legacy deck moves its win rate about ±1 point (one SD); pauper and peasant cards ±1.5.

## Coverage by band, and what a next census night buys

| band | pool | drawn | never drawn | 200+ deck-games | 1000+ | sd ≤ 2 pts | sd ≤ 3 pts | median sd | median deck-games | interval excludes 0 | extra census nights for median sd 2 pts |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pauper | 393 | 393 | 0 | 393 | 393 | 393 | 393 | 0.92 | 2160 | 139 | 0.0 |
| peasant | 398 | 398 | 0 | 398 | 398 | 398 | 398 | 0.91 | 2078 | 142 | 0.0 |
| legacy | 528 | 528 | 0 | 528 | 527 | 528 | 528 | 0.76 | 1519 | 156 | 0.0 |
| powered | 22 | 22 | 0 | 22 | 22 | 22 | 22 | 0.77 | 1510 | 12 | 0.0 |

- **Every card in every band's pool was drawn**, each in 1,000+ deck-games (one legacy card at 992). There is nothing left to cover; the remaining limit is precision.
- **A second census night** (another 80,000 games, ~10.7 h at 6 workers) doubles every card's games: the legacy+powered reliability would go from .73 to about .84, pauper's from .75 to .86 (Spearman–Brown). Median SD would fall from ~0.8 to ~0.55 points.
- **Not measurable:** the 24 library cards Forge 2.0.14 lacks, and every land (lands are not features: the census and the builder pick them by the deck's colours, so a land's record is its colours').

## Agreement between sources

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

- **legacy against powered** is the cleanest reliability check: the same cards in two independent sets of games (powered decks are mostly legacy fill). r .55 for one band each, .86 between their true values: a card's value hardly depends on whether a few power cards are around.
- **peasant against legacy** is low (.19 on 240 cross-band cards): a card's value is relative to its band, so a cube must be valued on one band's scale (or legacy + powered together, which share a scale).
- **The census against J145's drafted decks** (114 Omega cards): r .62, true-value r .93. The census ranks Omega's cards nearly as J145's own drafted games do. Against J145's random decks (arm C) it is lower (.42), because arm C's 8,000 games are a thinner source (reliability .55).

## Validation: J145 predicted from the census alone

The census model's card and makeup values summed over the decks J145 actually played, compared with J145's read (balance.py's cells). The last column is J145's own card fit applied to the same decks (in-sample, for scale).

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

| arm | cell | observed | census-predicted | J145-fit (in-sample) |
|---|---|---|---|---|
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

- **RMSE** census-predicted 0.027 (lab-drafted) and 0.023 (random), against 0.012 and 0.013 in-sample.
- **Transfer error.** The residuals are no larger than the read's own noise plus the prediction's, so the extra error from moving from random decks to drafted ones is not distinguishable from 0 on 15 cells. The programme below is simulated at 0, .015 and .03 anyway.

## The cards: top and bottom 10 (legacy + powered together, makeup groups)

Values are win-rate points per game for a deck that holds the card instead of the band's average card. The full 20 and the pauper, J145-B and J145-C lists are in `summary.md`.

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

- **Forge's rating and the value disagree often.** Wan Shi Tong, All-Knowing, Ursine Monstrosity and Questing Beast are top-15 by value at rating 40–47; Mystical Tutor (98), Time Vault (100) and Yawgmoth's Will (96) are bottom-20. Forge's AI cannot use the combo and tutor cards, and the lab's drafter and builder pick by rating, so a cube made of the model's cards only plays as predicted if the rating lets the builder play them (the play weight below).

## Pauper: top and bottom 10

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

## The generated cubes

**How they are made.** sample.ts's `two-colour` plan — Omega's skeleton without its list: 24 cards a colour, 2 gold a pair, 18 colourless, 22 lands (2 a pair + 2 others), Omega's curve, every count exact — filled by a min-cost flow toward one value level per colour class (cost |value − level| + SD; an unmeasured card counts as 6 points off; a card outside the cube's band 4 points more; a land from outside only where no band land fits; at least 10 creatures a colour), then like-for-like swaps (same colour class and mana value, within 3 points of the level) that minimise max |colour − .5| + max |pair − .5| of the predicted payoff.

**How the payoff is predicted.** A lab-drafted two-colour deck plays 9.1 cards of each colour, 0.45 gold and 4.2 colourless (J145's lab decks). Within a class, a card counts by how often the builder plays a card of its rating (J145: rate = −.332 + .0095 × rating, clipped to [.05, 1]). Pair P's payoff = ½ + S_P − mean S_Q over the other nine pairs; a colour's = ½ + mean S of its pairs − mean S of the others. Intervals: the census bootstrap.

| cube | level (pts) | bands | Omega cards | balancing swaps | max colour gap | max pair gap |
|---|---|---|---|---|---|---|
| `balanced-legacy-even-high` | +2.0 | legacy 164, powered 16 | 56 | 16 | 0.001 | 0.003 |
| `balanced-legacy-even-mid` | +0.0 | legacy 168, powered 12 | 57 | 10 | 0.000 | 0.002 |
| `balanced-pauper-even` | +0.0 | pauper 177, peasant 3 | 9 | 13 | 0.001 | 0.008 |

### balanced-legacy-even-high

| | W | U | B | R | G |
|---|---|---|---|---|---|
| payoff | 0.500 (0.472–0.530) | 0.500 (0.469–0.533) | 0.501 (0.468–0.534) | 0.499 (0.469–0.534) | 0.501 (0.469–0.536) |
| pull proxy: mean Forge rating of the top 24 | 75.0 | 75.1 | 63.8 | 75.4 | 64.8 |

| WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|
| 0.499 (±0.037) | 0.498 (±0.035) | 0.503 (±0.032) | 0.500 (±0.035) | 0.502 (±0.035) | 0.498 (±0.038) | 0.501 (±0.035) | 0.499 (±0.036) | 0.503 (±0.034) | 0.498 (±0.038) |

### balanced-legacy-even-mid

| | W | U | B | R | G |
|---|---|---|---|---|---|
| payoff | 0.500 (0.465–0.529) | 0.500 (0.465–0.531) | 0.500 (0.469–0.534) | 0.500 (0.464–0.540) | 0.500 (0.471–0.534) |
| pull proxy: mean Forge rating of the top 24 | 64.6 | 82.5 | 76.2 | 61.1 | 61.3 |

| WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|
| 0.501 (±0.034) | 0.501 (±0.034) | 0.499 (±0.036) | 0.499 (±0.037) | 0.499 (±0.038) | 0.499 (±0.033) | 0.501 (±0.031) | 0.501 (±0.036) | 0.498 (±0.034) | 0.501 (±0.039) |

### balanced-pauper-even

| | W | U | B | R | G |
|---|---|---|---|---|---|
| payoff | 0.501 (0.455–0.557) | 0.499 (0.456–0.541) | 0.500 (0.449–0.545) | 0.500 (0.449–0.555) | 0.501 (0.451–0.551) |
| pull proxy: mean Forge rating of the top 24 | 52.2 | 63.0 | 53.3 | 58.0 | 46.7 |

| WU | WB | WR | WG | UB | UR | UG | BR | BG | RG |
|---|---|---|---|---|---|---|---|---|---|
| 0.503 (±0.055) | 0.497 (±0.054) | 0.500 (±0.060) | 0.502 (±0.060) | 0.508 (±0.054) | 0.495 (±0.054) | 0.493 (±0.047) | 0.497 (±0.055) | 0.499 (±0.052) | 0.508 (±0.051) |

- **What the three are for.** *legacy-even-high*: the strongest level every colour can hold (+2 points a card). *legacy-even-mid*: every card near the band average. *pauper-even*: the same idea at common, where card values spread wider (a balancing search had more to do: 13 swaps from a flow gap of .163).
- **Pull is not even, and it is reported, not fixed.** The bots pick by Forge rating, and in *legacy-even-mid* blue's top 24 average 82.5 against red's 61.1: expect the bots to over-draft blue and black there; in *legacy-even-high* black and green are the low-rated colours (64–65 against 75). An uneven pull also thins the pair cells the measurement can judge.
- **The power cards are in *legacy-even-high*.** Black Lotus, Mox Jet, Mox Sapphire, Sol Ring, Time Walk, Ancestral Recall, Library of Alexandria, Tolarian Academy and Oko. The census measured them inside the level (Forge's AI does not break them in a random deck), so the generator took them. With people they decide drafts. A one-line filter (exclude the census's powered list) makes a no-power variant; whether to apply it is Justin's call, not the model's.
- **Lands are not modelled.** Each cube's lands are the plan's two a pair and two others, chosen by band and Forge rating (legacy: the duals, fetches and shocks, plus Library of Alexandria and Tolarian Academy as the two "others"; pauper: the bouncelands, gainlands and Evolving Wilds).

## The measurement programme

### What a night holds (6 workers; J145's measured rates: arm B 8,300 games/h, arm C 10,300/h)

| measurement | drafts | games | time | per 10-h night |
|---|---|---|---|---|
| J145's judged arm only (lab drafter, lab vs lab, two games a draft, fresh seeds) | 2,000 | 4,000 | ~0.5 h | ~19 |
| the same, three times the size (pairs precise enough to be EVEN) | 6,000 | 12,000 | ~1.5 h | ~6 |
| the full J145 shape (three drafters + the pool census) | 3,200 | 14,400 | 1.6 h | ~6 |
| a pauper cube | — | — | ~1.9x the time (22.7 turns a game against 16.7, J149) | about half the above |

At 7 workers, about 15% more. The pool census (arm C) is not needed per candidate: the library census already supplies card values in random decks.

### Nights to a confirmed balanced cube (simulated)

Each candidate's true colour and pair payoffs are its predicted ones plus the model's error (prediction SD colour .019, pair .021 — the generated cubes' bootstrap — and a transfer SD of 0, .015 or .03); a measurement adds binomial noise at J145's cell sizes (2,672 deck-games a colour; pairs at the bots' J145 pull 1,564/680/850/576/1,616/806/544/238/382/350, or even pull 761 each); each night's refit divides the error variance by 1 + 0.5 × nights (an assumption: how fast drafted-cube games sharpen the model is not yet measured); a pass needs a second fresh-seed measurement in the next night. 2,000 simulated programmes; the full grid (transfer .03 too) is in `summary.md`.

| transfer SD | pull | rule | measurement size (x J145 arm B) | cubes a night | median nights | 80th pct | confirmed by night 5 | by night 10 | within 30 | confirmed cube truly in band |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.000 | bot pull (J145) | no-off | 1 | 1 | 4 | 6 | 72% | 99% | 100% | 99% |
| 0.000 | bot pull (J145) | no-off | 1 | 4 | 3 | 4 | 96% | 100% | 100% | 99% |
| 0.000 | bot pull (J145) | no-off | 1 | 8 | 3 | 4 | 98% | 100% | 100% | 98% |
| 0.000 | bot pull (J145) | all-even | 3 | 1 | >30 | >30 | 2% | 10% | 50% | 100% |
| 0.000 | bot pull (J145) | all-even | 3 | 4 | 15 | 24 | 8% | 30% | 90% | 100% |
| 0.000 | bot pull (J145) | all-even | 3 | 8 | 11 | 18 | 13% | 46% | 98% | 100% |
| 0.000 | even pull | no-off | 1 | 1 | 5 | 7 | 63% | 97% | 100% | 100% |
| 0.000 | even pull | no-off | 1 | 4 | 3 | 4 | 94% | 100% | 100% | 99% |
| 0.000 | even pull | no-off | 1 | 8 | 3 | 4 | 96% | 100% | 100% | 99% |
| 0.000 | even pull | all-even | 3 | 1 | 6 | 9 | 38% | 89% | 100% | 100% |
| 0.000 | even pull | all-even | 3 | 4 | 4 | 6 | 75% | 100% | 100% | 100% |
| 0.000 | even pull | all-even | 3 | 8 | 4 | 5 | 85% | 100% | 100% | 100% |
| 0.015 | bot pull (J145) | no-off | 1 | 1 | 6 | 8 | 44% | 93% | 100% | 99% |
| 0.015 | bot pull (J145) | no-off | 1 | 4 | 4 | 5 | 83% | 100% | 100% | 97% |
| 0.015 | bot pull (J145) | no-off | 1 | 8 | 3 | 5 | 90% | 100% | 100% | 95% |
| 0.015 | bot pull (J145) | all-even | 3 | 1 | >30 | >30 | 1% | 5% | 40% | 100% |
| 0.015 | bot pull (J145) | all-even | 3 | 4 | 19 | 29 | 3% | 18% | 83% | 100% |
| 0.015 | bot pull (J145) | all-even | 3 | 8 | 14 | 22 | 6% | 28% | 93% | 100% |
| 0.015 | even pull | no-off | 1 | 1 | 7 | 9 | 33% | 89% | 100% | 100% |
| 0.015 | even pull | no-off | 1 | 4 | 4 | 6 | 73% | 100% | 100% | 99% |
| 0.015 | even pull | no-off | 1 | 8 | 4 | 5 | 82% | 100% | 100% | 99% |
| 0.015 | even pull | all-even | 3 | 1 | 9 | 12 | 14% | 67% | 100% | 100% |
| 0.015 | even pull | all-even | 3 | 4 | 6 | 8 | 40% | 97% | 100% | 100% |
| 0.015 | even pull | all-even | 3 | 8 | 5 | 7 | 55% | 99% | 100% | 100% |

- **"no-off"** = every colour EVEN and no pair with 400+ deck-games OFF (J145's registered classifier, extended to pairs). It confirms in a median 3–4 nights at 4–8 candidates a night, and the confirmed cube is truly inside the band in every cell 95–99% of the time.
- **"all-even"** = every colour and every judged pair EVEN. At J145's size it never confirms within 30 nights (a pair of 544 deck-games has an interval ±.042, so its point must land within .008 of .5). At three times the size and even pull: 4–6 nights. With the bots' pull, the thin pairs hold it at 11–19 nights.
- **More candidates a night helps less than a better model.** Going from 4 to 8 candidates saves about one night; a transfer error of .03 instead of 0 costs 3–4 nights.

### What the model cannot see

- **Human pull.** Every number is the lab drafter's and Forge's AI's. Real drafts enter as the draft-deck ledger grows (30+ real decks a cube, Justin's standing answer): they become a source of their own, judged beside the lab's, never pooled into it.
- **Combinations.** The model is additive: a card that is only good with another (equipment and carriers, sacrifice outlets and fodder) is valued at its average over random decks. A drafted cube concentrates such pairs; the refit on drafted-cube games is where that shows (J145-B's and the census's card values already agree to true r .93).
- **Forge's AI.** A card the AI misplays is valued low (Time Vault, Mystical Tutor), one it plays well is valued high; with people both move.
- **Lands.** Not in the model.

## Appendix: Omega, briefly

The census model on Omega's list (the analytic deck mix and the play weights), and after up to ten like-for-like upgrades under evolve's add rules (rated 60+, not AI:RemoveDeck:All, no `cut` note in `cubes/omega-notes.tsv`, the added card valued at least the cut's):

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

- **The census agrees with J145 about Omega:** blue is its weak colour (.448 predicted, .480 measured drafted, .445 in arm C) and UG its weak pair (.440 predicted, .423 measured).
- **The batch the model would make is blue first:** Morphling, Snapcaster Mage, Vendilion Clique and Murktide Regent out for Urza, Lord High Artificer, Ledger Shredder, Subtlety and Malcolm; Tireless Tracker for Six in green. It is "what the model says about the one cube we measured", not a proposal under the registered rule, which the revised rule (`omega-swap-rule-v2.md`) replaces.

## Files

- mtg-table branch `pc/balance-model`: `tools/cubelab/balance-model.ts` (the model, the generator, the simulation), `balance-model-cmd.ts` (the command), `web/test/cubelab-balance-model.test.ts` (8 tests), `docs/decisions/D473-library-card-model-and-balanced-cube-generator.md`, the guide section, and the three cubes under `cubes/library/balanced/`.
- Reproduce: `tools/cubelab.sh balance-model --census /home/justin-a/code/lab/data/lab-j144 --omega /home/justin-a/code/lab/data/lab-j145 --facts <the library facts cache> --out <dir> --reps 200` (deterministic; the inputs' sha256 are in `model.json`).

