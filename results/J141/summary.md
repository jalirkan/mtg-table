# J141 — the pilot slice: search-v2 as the deck census's pilot, on 2,000 of J140's games (D447): summary

Written by the PC session, 2026-10-19, from `pilot.md`, `pilot.json`, `cards-by-pilot.tsv`, `slice.json`, `inputs.json`, `checks.txt`, `pilot-checks.txt`, `metrics.json`, STATUS, `events.jsonl`, the step logs (prepare, pilot1–3, run1–2), the rows in `pilot-games.jsonl.gz`, the job file (`jobs/J141-pilot-slice.md` on pc-jobs), and J131's and J140's summaries.

**Exploration. There is no rule and no verdict.** J141 replayed 2,000 of J140's census games under three arms. Each arm used the same decks, the same sides, the same seed and the same first player as J140, and play diverges only where a pilot decides differently:

| arm | folder | side a | side b | games |
|---|---|---|---|---|
| FF (J140, not replayed) | — | Forge | Forge | 2,000 |
| S | `ss` | search | search | 2,000 |
| M1 | `ps` | Forge (plain) | search | 2,000 |
| M2 | `sp` | search | Forge (plain) | 2,000 |

"Forge" is Forge's Default AI. "Search" is the live search seat, search-v2 at the 1.5 s budget. Search-v2 plays Forge's AI inside its rollouts, so it is not an independent pilot, and a move between the pilots is a lower bound on how much the pilot matters. The decks are random draws from a band's pool, so every rate is "in a random deck of this makeup". Any difference below is a candidate until it holds on a fresh slice, with the same method and a fresh slice seed over fresh census seeds (D447 point 9). No colour or card is named better or worse here.

## The rule as pre-registered (job file, 2026-10-16, before any slice game)
- **The slice:** 500 games a band, slice seed 1411. Eligible games are J140 games with no engine error and no timeout; draws stay eligible. The games are stratified by the unordered pair of the two decks' colour-count groups, where L means 1 colour with 3+ spells, M means 2–3 and H means 4–5. That gives six strata (LL, LM, LH, MM, MH, HH) with quotas of 84/84/83/83/83/83. Within each stratum the draw is a seeded `random.Random(...).sample`.
- **The data:** a deck-game is one deck's side of one slice game, 4,000 in all. Each carries four results: `ff` (J140), `ss` (arm S), `ws` (search pilots this deck against Forge) and `wf` (Forge pilots it against search).
- **One bootstrap for every interval (reads 1–4):** a deck-clustered percentile bootstrap with 1,000 replicates, using one shared weight matrix (`default_rng(1411)`). The pilots are paired within it.
- **The five reads,** all of them numbers only:
  1. Win rate by colour under each pilot. The `U` main-colour row's paired `ss − ff` is the blue question.
  2. The card-flow coefficient β, from a linear probability model with each band's deck colours and opponent colours held fixed. It is fit under Forge and under search on the slice, then as their paired difference, and on all of J140 under Forge as the census-wide reference.
  3. Per-card shrunk ratings under each pilot (k = 20). The read covers cards with 20+ decisive deck-games under both pilots. It gives the Spearman ρ between the pilots beside a swap reference: each game's FF and SS results are exchanged at random, 200 times. Then the mean move by card colour, the 20 cards that rise most and the 20 that fall most.
  4. Arm M, search's edge over Forge with sides swapped, plus the search-pilot win rate and the lift (`ws − ff`), by deck profile.
  5. Search's own counters per arm.
- **No check is on a win rate, a coefficient, a correlation or a card.**

## The run
- **Pin.** mtg-table 2e107b6, the merge of #154 (the pilot's `merged == 1` passed). The build and every self-test were green in `prepare.log`.
- **Inputs.** The four deck folders were J140's own, linked, and each `decks.jsonl` was byte-identical to J140's `census-decks.jsonl.gz` (2,500 decks a band). No `.dck` was missing. All 80,000 J140 rows were read (sha256 `352784ceaaec`).
- **Checks.** All 26 pilot checks and all 23 final checks passed. The pilot projected the run at **5.76 h** on 7 workers. The job file had sized it at about 7.4 h.
- **Wall time: 12:05 on 2026-10-17 to 06:23 on 2026-10-19, 42 h 18 m** (`elapsed_s` 152,277). Most of that was not play. In order:
  - **The pilot, 12:06–12:51 on 10-17** (planned ~15 min). Justin was at the table from 12:11 to 12:46. The runner held new games, so peasant's two arm-M runs of 5 games took 1,260 s and 888 s.
  - **run1 on 7 workers from 12:52.** Justin was at the table again from 12:58 to 13:22, and new games waited. The heartbeat at 15:30 also reports J141 paused during his friend game with Evan; STATUS records no pressure line after 13:22. Run1 then played all of pauper and peasant, legacy's arms S and M1, and 373 of legacy's 500 M2 games. Going by the session tallies, which include any paused time, it ended at about 20:40 on 10-17.
  - **No game was logged for about 27½ h.** STATUS says only "the runner restarted during run1" at 00:18 on 10-19. The files do not say why run1 stopped.
  - **The resume ran on 6 workers** (the runner's cap: min(cores 7, memory 9, max_workers 7, cap 6)).
    - Legacy M2's last 127 games took **14,811 s (4 h 07 m, 31 games/h)**. All six workers hung at once ("no answer in 1,060 s"), and all six games played on retry.
    - Those 127 games look like their 373 arm-mates: 839 ms a decision against 819, and the search seat won 0.614 against 0.595.
    - Powered's three arms followed in 7,083 s. run2 (the read) took 10 s.
- **Play time.** From the mean game times, the 6,000 games are 2,000 × 32.4 s + 2,000 × 18.3 s + 2,000 × 18.1 s = 137,800 worker-seconds. That is **5.5 h on 7 workers**, which is the dry run's "nearer 5 h than 7.4". Peak worker RSS was 1.51 GB against 2 GB declared.
- **Engine errors: 25 rows, 0 timeouts.** Arm S had 13, M1 8 and M2 4, each well under the 40 allowed.
  - **The errors cover 14 distinct games, 11 of them in peasant.** Every one is "a game thread would not stop after its timeout", and the 900 s cap was passed twice, once on the retry.
  - **The stalls follow the search seat.** The M1 failures (search on side b) and the M2 failures (search on side a) share no game. Together they repeat 11 of arm S's 13; only g2707 and g19440 failed in S alone, and g12109 failed in M1 but played on its S retry. J140's Forge-vs-Forge plays of all 14 games were clean.
  - **Draws:** 2, 2 and 1.
- **Games an hour, from the log's session lines** (each folder's `census-play.json` was not collected). Every arm-band session includes any pause and any stall: each hung game held a worker past the 900 s cap, twice.

| band | S (ss) | M1 (ps) | M2 (sp) |
|---|---|---|---|
| pauper | 318 (5,656 s) | 554 (3,251 s) | 992 (1,815 s) |
| peasant | 286 (6,291 s) | 507 (3,550 s) | 566 (3,180 s) |
| legacy | 855 (2,104 s) | 1,576 (1,142 s) | 373 at ~1,440/h, then 127 at 31/h (14,811 s) |
| powered (6 workers) | 526 (3,422 s) | 1,309 (1,375 s) | 787 (2,286 s) |

- **For sizing the next slice:**
  - A search-vs-search game averages **32.4 s** and a Forge-vs-search game **18.1–18.3 s**, against a Forge-vs-Forge game's 2.2 s.
  - A search seat searched **19.9–20.4 decisions a game** (median 19), against the 25–30 the sizing assumed.
  - A searched decision took **769–794 ms**, against J131's 772.

## The slice (`slice.json`)
- **Eligible games** per band: pauper 19,990, peasant 19,994, legacy 19,993 and powered 19,997 of 20,000.
- **Every stratum met its quota** (84/84/83/83/83/83). The shortfall was 0, and the smallest stratum available was pauper's HH, with 421 games.
- **The deck-games split L 335, M 333 and H 332 in every band.** J140's decks run about 25% L, 55% M and 20% H, and every read is on the slice as drawn, unweighted.
- **Distinct decks:** 3,212 (782 / 795 / 819 / 816).
- **Main colour** per band runs from 179 to 234 deck-games each for W, U, B, R and G. No deck has none.
- **Card flow by band** (deck-games with 0 / 1 / 2 / 3+ flow cards):

| band | 0 | 1 | 2 | 3+ |
|---|---|---|---|---|
| pauper | 353 | 306 | 165 | 176 |
| peasant | 760 | 200 | 38 | 2 |
| legacy | 882 | 106 | 12 | 0 |
| powered | 828 | 147 | 23 | 2 |

## Integrity (`pilot.md`)

| arm | rows | missing | id mismatch | first-player mismatch / compared | policy mismatch | counters missing | engine errors | timeouts | draws |
|---|---|---|---|---|---|---|---|---|---|
| S (ss) | 2,000 | 0 | 0 | 0 / 1,987 | 0 | 0 | 13 | 0 | 2 |
| M1 (ps) | 2,000 | 0 | 0 | 0 / 1,992 | 0 | 0 | 8 | 0 | 2 |
| M2 (sp) | 2,000 | 0 | 0 | 0 / 1,996 | 0 | 0 | 4 | 0 | 1 |

- **First-player comparisons:** the uncompared rows are exactly the engine errors, so every game that ran kept J140's first player.
- **FF:** 2,000 games, 1,998 decisive, every one Forge vs Forge.

## Read 1 — win rate by colour, FF (J140) against SS (arm S)
**The blue question.** Decks whose main colour is blue won **0.433 [0.395, 0.467]** under Forge and **0.425 [0.390, 0.464]** under search. The paired difference, search minus Forge, is **−0.006 [−0.044, +0.029]** over 795 deck-games. The interval contains 0. Within a band every decisive game is one win and one loss under either pilot, so the overall rate is 0.500 under both by construction. The all-deck-games paired difference is 0.000 [−0.015, +0.017].

| main colour | deck-games | FF | 95% | SS | 95% | SS − FF (paired) | 95% |
|---|---|---|---|---|---|---|---|
| W | 792 | .519 | .488–.553 | .544 | .510–.583 | +.025 | −.011 – +.060 |
| U | 795 | .433 | .395–.467 | .425 | .390–.464 | −.006 | −.044 – +.029 |
| B | 868 | .487 | .453–.521 | .453 | .420–.485 | −.033 | −.069 – .000 |
| R | 762 | .531 | .496–.566 | .545 | .510–.579 | +.013 | −.021 – +.049 |
| G | 779 | .533 | .497–.570 | .541 | .501–.576 | +.006 | −.035 – +.044 |

| colours with 3+ spells | deck-games | FF | 95% | SS | 95% | SS − FF | 95% |
|---|---|---|---|---|---|---|---|
| 1 | 1,338 | .586 | .559–.612 | .578 | .552–.605 | −.010 | −.036 – +.017 |
| 2 | 674 | .540 | .501–.579 | .509 | .469–.549 | −.032 | −.074 – +.009 |
| 3 | 657 | .476 | .439–.514 | .485 | .447–.526 | +.011 | −.032 – +.050 |
| 4 | 1,059 | .411 | .383–.442 | .429 | .401–.459 | +.019 | −.011 – +.050 |
| 5 | 268 | .381 | .326–.441 | .408 | .351–.468 | +.026 | −.032 – +.078 |

| has the colour (any pip) | deck-games | FF | 95% | SS | 95% | SS − FF | 95% |
|---|---|---|---|---|---|---|---|
| W | 2,330 | .464 | .444–.484 | .474 | .454–.496 | +.011 | −.009 – +.032 |
| U | 2,326 | .440 | .419–.462 | .448 | .428–.469 | +.009 | −.012 – +.031 |
| B | 2,367 | .456 | .437–.477 | .460 | .442–.481 | +.005 | −.016 – +.025 |
| R | 2,327 | .474 | .455–.494 | .477 | .456–.498 | +.003 | −.018 – +.023 |
| G | 2,377 | .469 | .449–.490 | .482 | .460–.503 | +.013 | −.009 – +.036 |

**Per band, main colour `U`** (SS − FF, paired):

| band | deck-games | difference | 95% |
|---|---|---|---|
| pauper | 189 | +.037 | −.047 – +.114 |
| peasant | 199 | −.035 | −.113 – +.040 |
| legacy | 205 | −.005 | −.077 – +.071 |
| powered | 199 | −.020 | −.095 – +.049 |

- **Every interval in read 1 contains 0.** The one whose end reaches it is main colour `B`, −.033 [−.069, .000].
- **Main colour B per band:** pauper −.021, peasant −.058, legacy .000 and powered −.059. Each band's interval contains 0.

## Read 2 — the card-flow coefficient (points of win rate per card-flow card, colours held fixed)
**All four bands entered.** A band enters with 50 or more slice deck-games holding a flow card; the counts were pauper 647, peasant 240, legacy 118 and powered 172.

| pilot | deck-games | β | 95% |
|---|---|---|---|
| Forge (slice) | 3,996 | −2.74 | −4.90 – −0.75 |
| search (slice) | 3,970 | −3.16 | −5.21 – −1.25 |
| **search − Forge (slice, paired)** | | **−0.42** | **−2.51 – +1.59** |
| Forge (all of J140, census-wide) | 159,876 | −2.61 | −3.06 – −2.19 |

- **The slice resolved better than planned.** The job expected an interval of about ±4 points. With all four bands in, each β's interval is about ±2.1 and the paired difference's about ±2.0, so a change in the coefficient between the pilots would need to be larger than about 2 points a card to show on this slice.
- **The census-wide Forge β, −2.61 [−3.06, −2.19],** sits beside the Synergy v3 study's −2.9 [−3.7, −2.1]. That study is a different design and is not compared formally here.

**Win rate by flow bin** (entered bands):

| flow cards | deck-games | FF | SS | SS − FF | 95% |
|---|---|---|---|---|---|
| 0 | 2,819 | .510 | .514 | +.004 | −.015 – +.023 |
| 1 | 759 | .497 | .488 | −.009 | −.046 – +.027 |
| 2 | 238 | .445 | .416 | −.029 | −.091 – +.041 |
| 3+ | 180 | .428 | .450 | +.022 | −.049 – +.091 |

## Read 3 — the cards
- **The included set.** There are 4,129 band-and-card rows, and **2,103** have 20 or more decisive deck-games under both pilots. 13 of the study's 17 flow cards are in.
- **Spearman between the two pilots' ratings:** shrunk **0.615**, interval as computed [0.486, 0.609]; raw **0.613** [0.485, 0.604].
- **The swap reference**, with the pilots exchanged at random 200 times: median **0.620**, range **[0.592, 0.646]**.
- **ρ sits inside the swap range, at about its median.** By the reading the job registered, the cards' ratings move between the pilots no more than the games' own noise moves them on this slice.
- **Both registered ρ intervals fail to contain their own estimate.** The deck resample adds noise to every card's rating and pulls ρ down in every replicate. Read that interval for its width, about 0.12, and not for its location. Known gaps has more.

**Mean move by card colour** (SS − FF, shrunk rating):

| card colour | cards | mean move | 95% |
|---|---|---|---|
| W | 268 | +.006 | −.013 – +.025 |
| U | 271 | +.001 | −.019 – +.021 |
| B | 278 | −.014 | −.035 – +.006 |
| R | 266 | −.001 | −.021 – +.018 |
| G | 282 | +.003 | −.018 – +.025 |
| multicolour | 522 | +.009 | −.006 – +.024 |
| colourless | 216 | −.003 | −.015 – +.011 |
| the study's flow cards | 13 | −.015 | −.054 – +.021 |

**The 20 that rise most under search.** These are the extremes of 2,103 cards, and each paired interval is unadjusted for that: candidates only.

| band | card | colour | FF n | FF shrunk | SS n | SS shrunk | move | paired diff | 95% |
|---|---|---|---|---|---|---|---|---|---|
| peasant | Untamed Wilds | G | 53 | .397 | 53 | .562 | +.164 | +.226 | +.078 – +.360 |
| pauper | Mirkwood Nurturer | UG | 35 | .345 | 35 | .509 | +.164 | +.257 | +.079 – +.439 |
| powered | Oracle of Mul Daya | G | 31 | .451 | 31 | .608 | +.157 | +.258 | +.069 – +.444 |
| peasant | Greta, Sweettooth Scourge | BG | 41 | .377 | 41 | .525 | +.147 | +.220 | +.048 – +.395 |
| peasant | Talisman of Dominance | UB | 56 | .382 | 54 | .527 | +.145 | +.204 | +.068 – +.340 |
| legacy | Concealing Curtains | B | 51 | .437 | 51 | .578 | +.141 | +.196 | +.049 – +.360 |
| peasant | Hunter's Talent | G | 52 | .458 | 52 | .597 | +.139 | +.192 | +.050 – +.348 |
| legacy | Godless Shrine | WB | 60 | .375 | 60 | .512 | +.138 | +.183 | +.054 – +.318 |
| legacy | Atraxa, Grand Unifier | WUBG | 32 | .404 | 32 | .538 | +.135 | +.219 | +.024 – +.439 |
| peasant | Dockside Chef | B | 32 | .365 | 32 | .500 | +.135 | +.219 | +.037 – +.400 |
| powered | Krenko, Tin Street Kingpin | R | 47 | .492 | 47 | .627 | +.134 | +.192 | +.039 – +.353 |
| powered | Avenger of Zendikar | G | 40 | .433 | 40 | .567 | +.133 | +.200 | +.049 – +.342 |
| peasant | Land Tax | W | 62 | .451 | 57 | .584 | +.133 | +.158 | +.023 – +.300 |
| powered | Hexdrinker | G | 33 | .415 | 33 | .547 | +.132 | +.212 | +.059 – +.358 |
| powered | Delighted Halfling | G | 34 | .574 | 34 | .704 | +.130 | +.206 | +.086 – +.326 |
| legacy | Ledger Shredder | U | 42 | .435 | 42 | .565 | +.129 | +.191 | +.051 – +.309 |
| pauper | Memory Lapse | U | 58 | .449 | 58 | .577 | +.128 | +.172 | +.022 – +.311 |
| pauper | Psychic Purge | U | 37 | .368 | 37 | .491 | +.123 | +.189 | .000 – +.375 |
| peasant | Umbral Collar Zealot | B | 37 | .439 | 37 | .561 | +.123 | +.189 | .000 – +.395 |
| legacy | Xira Arien | BRG | 30 | .440 | 30 | .560 | +.120 | +.200 | +.069 – +.323 |

**The 20 that fall most under search.** The same caveat applies.

| band | card | colour | FF n | FF shrunk | SS n | SS shrunk | move | paired diff | 95% |
|---|---|---|---|---|---|---|---|---|---|
| peasant | Dreadwing Scavenger | UB | 43 | .556 | 43 | .397 | −.159 | −.233 | −.393 – −.079 |
| powered | Arcbound Ravager | C | 25 | .578 | 25 | .422 | −.156 | −.280 | −.500 – −.042 |
| powered | Tetravus | C | 32 | .596 | 32 | .442 | −.154 | −.250 | −.438 – −.075 |
| powered | Courser of Kruphix | G | 32 | .654 | 32 | .500 | −.154 | −.250 | −.432 – −.100 |
| legacy | Reveillark | W | 27 | .596 | 27 | .447 | −.149 | −.259 | −.500 – −.062 |
| powered | Black Widow, Super Spy | B | 42 | .548 | 42 | .403 | −.145 | −.214 | −.394 – −.027 |
| legacy | Earthquake | R | 44 | .688 | 44 | .547 | −.141 | −.204 | −.385 – −.042 |
| powered | Fear of Missing Out | R | 45 | .615 | 45 | .477 | −.139 | −.200 | −.356 – −.067 |
| powered | Botanical Sanctum | UG | 74 | .543 | 74 | .404 | −.138 | −.176 | −.281 – −.075 |
| legacy | Talrand, Sky Summoner | U | 39 | .491 | 39 | .356 | −.136 | −.205 | −.405 – .000 |
| peasant | Cult Conscript | B | 59 | .595 | 58 | .462 | −.133 | −.190 | −.327 – −.038 |
| powered | Ugin, Eye of the Storms | C | 34 | .593 | 34 | .463 | −.130 | −.206 | −.324 – −.095 |
| legacy | Icetill Explorer | G | 34 | .537 | 34 | .407 | −.130 | −.206 | −.417 – .000 |
| legacy | Jace, Wielder of Mysteries | U | 35 | .582 | 35 | .455 | −.127 | −.200 | −.348 – −.035 |
| legacy | Esika's Chariot | G | 30 | .660 | 30 | .540 | −.120 | −.200 | −.375 – −.074 |
| pauper | Okiba Reckoner Raid | B | 56 | .632 | 56 | .513 | −.118 | −.161 | −.273 – −.048 |
| powered | Phlage, Titan of Fire's Fury | WR | 31 | .608 | 31 | .490 | −.118 | −.194 | −.455 – +.071 |
| pauper | Gurmag Angler | B | 48 | .544 | 48 | .426 | −.118 | −.167 | −.300 – −.023 |
| powered | Blightstep Pathway | BR | 57 | .493 | 57 | .377 | −.117 | −.158 | −.283 – −.036 |
| pauper | Mintstrosity | B | 49 | .623 | 49 | .507 | −.117 | −.163 | −.312 – .000 |

`cards-by-pilot.tsv` has all 4,129 rows, with arm M's rates (`mSearchWr`, `mForgeWr`) and the `included` flag.

## Read 4 — arm M: the search seat against Forge, sides swapped
**Overall:**
- **The search seat's edge** over the two swapped games is **0.589 [0.580, 0.598]** (3,970 deck-games).
- **Search piloting a deck against Forge** wins **0.589 [0.574, 0.605]**, and Forge piloting it against search wins **0.411 [0.396, 0.427]**.
- **The lift,** from changing a deck's pilot from Forge to search with Forge on the other side both times, is **+0.089 [+0.073, +0.104]**.
- **Side a's rate:** 0.416 in M1, where Forge is on side a, and 0.594 in M2, where search is.
- **The edge and the search-pilot rate are the same number** overall and in every band. Each game's two deck-games both carry its search score, so the two coincide wherever a bin holds both decks of every game. They differ only in the profile bins.

| main colour | deck-games | edge | 95% | search pilots it | 95% | lift over FF | 95% |
|---|---|---|---|---|---|---|---|
| W | 779 | .583 | .565–.603 | .611 | .579–.646 | +.092 | +.059 – +.129 |
| U | 791 | .588 | .571–.606 | .516 | .482–.553 | +.083 | +.047 – +.119 |
| B | 867 | .591 | .575–.608 | .582 | .549–.613 | +.095 | +.062 – +.127 |
| R | 758 | .583 | .564–.603 | .605 | .569–.639 | +.072 | +.039 – +.103 |
| G | 775 | .597 | .579–.615 | .634 | .600–.665 | +.102 | +.065 – +.138 |

| colours with 3+ spells | deck-games | edge | 95% | search pilots it | 95% | lift over FF | 95% |
|---|---|---|---|---|---|---|---|
| 1 | 1,324 | .579 | .565–.594 | .646 | .620–.672 | +.059 | +.034 – +.085 |
| 2 | 670 | .599 | .579–.619 | .629 | .594–.663 | +.089 | +.050 – +.128 |
| 3 | 654 | .607 | .585–.627 | .589 | .552–.628 | +.115 | +.077 – +.154 |
| 4 | 1,056 | .590 | .574–.605 | .520 | .490–.548 | +.108 | +.076 – +.137 |
| 5 | 266 | .564 | .534–.595 | .478 | .420–.541 | +.097 | +.050 – +.151 |

| card-flow cards | deck-games | edge | 95% | search pilots it | 95% | lift over FF | 95% |
|---|---|---|---|---|---|---|---|
| 0 | 2,799 | .593 | .583–.602 | .604 | .585–.622 | +.093 | +.076 – +.111 |
| 1 | 753 | .582 | .564–.602 | .583 | .549–.620 | +.087 | +.051 – +.123 |
| 2 | 238 | .586 | .556–.621 | .513 | .448–.580 | +.067 | +.004 – +.138 |
| 3+ | 180 | .558 | .514–.601 | .483 | .408–.561 | +.056 | −.024 – +.134 |

| band | deck-games | edge (= search pilots it) | 95% | lift over FF | 95% |
|---|---|---|---|---|---|
| pauper | 998 | .566 | .549–.584 | +.067 | +.034 – +.100 |
| peasant | 978 | .614 | .598–.628 | +.114 | +.083 – +.144 |
| legacy | 1,000 | .593 | .577–.610 | +.093 | +.066 – +.121 |
| powered | 994 | .583 | .566–.599 | +.081 | +.052 – +.113 |

- **Two kinds of number in this table.** The search-pilot rate carries the deck's own strength; blue main-colour decks, for example, are .433 under FF. The lift is the part the job calls attributable to the deck's pilot.
- **Lift by main colour runs +.072 to +.102,** and every pair of intervals overlaps.
- **Two places where intervals do not overlap.** Pauper's edge (.549–.584) and peasant's (.598–.628) do not overlap; peasant also lost the most games to engine errors. By colour count, the 1-colour lift (+.034 – +.085) only just meets the 3-colour lift (+.077 – +.154). Both are candidates: no paired difference between bins was registered.

## Read 5 — search's own counters and the games under each pilot

| arm | games | decisive | mean turns | mean game s | first player won | side a won | search seats | searched / seat-game (median) | changed share | ms / decision |
|---|---|---|---|---|---|---|---|---|---|---|
| FF | 2,000 | 1,998 | 18.76 | 2.2 | .524 | .516 | — | — | — | — |
| S | 2,000 | 1,985 | 17.50 | 32.4 | .520 | .500 | 3,974 | 19.9 (19) | .166 | 769 |
| M1 | 2,000 | 1,990 | 18.05 | 18.3 | .543 | .416 | 1,992 | 20.4 (19) | .168 | 794 |
| M2 | 2,000 | 1,995 | 18.00 | 18.1 | .513 | .594 | 1,996 | 20.3 (19) | .164 | 791 |

**By kind** (searched / changed / changed share / ms a decision):

| arm | priority | attacks | blocks |
|---|---|---|---|
| S | 51,594 / 9,422 / .183 / 773 | 20,402 / 2,702 / .132 / 723 | 7,257 / 1,050 / .145 / 870 |
| M1 | 26,799 / 4,961 / .185 / 798 | 10,865 / 1,601 / .147 / 773 | 2,912 / 273 / .094 / 843 |
| M2 | 26,668 / 4,868 / .183 / 798 | 10,979 / 1,482 / .135 / 765 | 2,939 / 307 / .104 / 834 |

**Fallbacks and rollouts:**

| arm | searched | budget fallbacks [Wilson 95%] | copy errors | rollout errors | unmappable | rollouts |
|---|---|---|---|---|---|---|
| S | 79,253 | 349 = 0.44% [0.40%, 0.49%] | 1,155 | 86 | 130 | 1,315,960 |
| M1 | 40,576 | 303 = 0.75% [0.67%, 0.84%] | 559 | 44 | 59 | 655,311 |
| M2 | 40,586 | 284 = 0.70% [0.62%, 0.79%] | 523 | 38 | 63 | 659,250 |

- **Beside J131's search-v2:** J131 measured 772 ms a decision and 0.4–0.5% budget fallbacks, and the job file cites an 18% changed share.
  - Arm S matches it on time (769 ms) and on fallbacks (0.44%).
  - Arm M runs 791–794 ms, and its budget fallbacks are higher, at 0.70–0.75%. Their intervals do not overlap arm S's.
  - The changed share is 16.4–16.8% in every arm.
- **Search-vs-search games ran about 1.25 turns shorter** than FF's (17.5 against 18.8 turns).

## What it says
These are numbers on one slice, every one a candidate until a fresh slice repeats it (D447 point 9), and none is a verdict.
- **The blue question.** With search piloting both sides, main-blue decks' rate changes by −0.6 points [−4.4, +2.9] from Forge's. Blue's rate is below 0.5 under both pilots, .433 and .425. Read 4 says the same from the other side: the lift for blue main-colour decks, +8.3 points [+4.7, +11.9], sits among the other colours' +7.2 to +10.2.
- **The card-flow coefficient** is −2.74 under Forge and −3.16 under search on the slice, a paired difference of −0.42 [−2.51, +1.59]. The census-wide Forge value is −2.61 [−3.06, −2.19]. The interval for the change contains 0 and spans about 4 points.
- **The cards.** The two pilots' card ratings correlate at ρ 0.615, inside the range that randomly swapping the pilots gives (0.592–0.646). Each colour's mean move, and the flow cards' mean move, is within ±1.5 points with an interval containing 0. The two top-20 lists are the extremes of 2,103 noisy ratings.
- **Search against Forge.** The search seat scores 0.589 [0.580, 0.598] over the swapped pair and lifts a deck's rate by +8.9 points [+7.3, +10.4]. That is a lower bound on how much the pilot matters, since search's rollouts are Forge's play.

## Known gaps
- **The ρ interval does not contain ρ.** The registered deck-bootstrap percentile interval for Spearman ([0.486, 0.609] shrunk, [0.485, 0.604] raw) lies wholly below the point estimate. Resampling decks adds noise to each card's rating, which attenuates ρ in every replicate. The swap reference, also registered, is the comparison to read. The estimator stays as registered and is not "fixed" here; a next slice that wants a ρ interval should say how in its own pre-registration.
- **The top-20 lists carry no multiplicity adjustment.** At 5% a side, about 100 of 2,103 cards would show a paired interval clear of 0 by chance alone. The swap reference says the ordering as a whole moves no more than noise.
- **The run was split.** Legacy's arm M2 played 373 games on 10-17 and its last 127 after a stop of about 27½ h, on 6 workers rather than 7, during a 4-hour stretch in which all six workers hung at once. So for those 127 games, "the three arms of a band played close in time, under the same load" did not hold. Their counters match their arm-mates' (839 ms against 819 a decision; budget fallbacks 6 of 2,193 against 62 of 6,759). Why run1 stopped and what hung the workers are not in the files.
- **The games were paused for Justin's play** on 10-17 (12:11–12:46 in the pilot and 12:58–13:22 in run1, plus the friend game the heartbeat notes at 15:30). The search budget is wall-clock, and per arm-band the ms a decision stayed between 745 and 839, so the files show no sign that load shifted search.
- **The engine errors are not random.** 14 games, 11 of them in peasant, stall when search pilots one particular side; J140 played all 14 cleanly under Forge. They drop out of the paired comparisons only for the arm they failed in: read 1 pairs 3,966 of 4,000 deck-games and read 4 3,970. That is small, but it leans on peasant. The heartbeat of 10-17 10:20 names a stalled-game engine fix being built (`pc/stalled-game-no-exit`). Whether these are the stalls it fixes is not in the files.
- **Arm M's budget fallbacks** (0.70–0.75%) are above arm S's 0.44% and above J131's 0.4–0.5%, and nothing here explains it.
- **Copy errors are a fallback kind J131's and J139's match files do not list** (1,155, 559 and 523, about 1.3–1.5% of searched decisions, more than the budget fallbacks), so there is nothing to set them beside.
- **The slice is stratified, so its rates are not census rates.** L, M and H are a third each, against about 25 / 55 / 20 in J140. The reads compare pilots on the same games, which the weighting does not change.
- **Legacy and powered hold little card flow:** 118 and 172 flow deck-games, and 0 and 2 with 3+ flow cards. Read 2's β leans on pauper (647) and peasant (240).
- **The job's own limits apply.** Search-v2 inherits Forge's play in its rollouts, and the decks are random draws, not built decks.
- **The games-per-hour figures come from the step logs,** because each arm folder's `census-play.json` was not collected.
