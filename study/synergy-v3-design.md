# Synergy v3, designed: the colour-level fix J135 could not make

Written by the PC session, 2026-10-16. A **candidate for Justin to approve**: nothing ships, no
`results/J135/APPROVED` is written. The cube is `results/J135/synergy-cube-180.v3-designed.md`.

**Data.** J135's 1,716 plain lab drafts of Synergy v2: the 8 evolve generations less their 484 exploration
drafts, plus the 300-draft input and final batches. All drafted the same 180 cards, best of three, Default against
Default, 4,100 decisive games. I read the drafts themselves (`drafts.jsonl` in the runner's `var/`, read-only),
so decks, matchups and card lists are all available. ForgeCoach's shipped meta is **not pooled**: it is v1, a
different list, at one game a draft. It is quoted only where it agrees. Intervals are 95%: Wilson with a design
effect of 1.25 for rates; draft-clustered robust errors for the regressions (one row per draft).

## 1. The colour-level picture

| colour | in % of decks | win rate when in the deck | vs decks without it | mono cards (rated ≥ 60) | mean Forge rating | creatures | card-flow per deck | TOK per deck |
|---|---|---|---|---|---|---|---|---|
| W | 47.0 | **64.9** [63.2, 66.6] | 69.1 [67.2, 70.9] | 24 (15) | 64.9 | 17 | 3.13 | 7.80 |
| B | 33.6 | 51.5 [49.4, 53.5] | 51.6 [49.4, 53.7] | 26 (12) | 60.9 | 17 | 3.29 | 5.68 |
| G | 44.1 | 46.4 [44.6, 48.2] | 45.4 [43.4, 47.5] | 24 (15) | 66.6 | 20 | 3.34 | 5.50 |
| R | 18.6 | 44.9 [42.2, 47.7] | 44.8 [41.9, 47.6] | 24 (10) | 56.1 | 14 | 4.89 | 7.91 |
| U | 56.6 | **41.2** [39.7, 42.8] | 36.3 [34.3, 38.2] | 22 (15) | 72.6 | 13 | 5.19 | 5.65 |

Every colour has 8 or 9 gold cards and exactly 8 lands: 4 shocks and 4 fetches. The decks run 16.1–16.5 lands in
every colour, and green is the only colour splashed often (8.3% of decks). The mana is the same for all five, so it
explains none of this.

- **The imbalance is all colour, none of it pair.** An additive model fits the ten pairs: logit(pair) = colour
  + colour, with W +0.91 ± 0.08 and U −0.59 ± 0.08. Its χ² is 1.68 on 5 df (p ≈ 0.89) and no pair is off by
  more than z 0.67. UG, UB and UR are exactly what blue plus the partner predicts. **No missing UG/UB signpost
  shows** beyond the colour itself.
- **White does not win because the builder picks it more.** White is in fewer decks than blue (47.0% against
  56.6%), and its cards carry lower Forge ratings (64.9 against 72.6), so the drafter takes blue first. When the
  builder chose a white or a blue build, a build without that colour scored within 3 points 56% and 57% of the
  time. That margin is the same for both colours, so it shows no builder tilt.
- **White does not win on one payoff per pair.** It wins in every archetype it enters: in J135's batches WB-SAC
  69, WG-ETB 80, WR-TOK 83 and WB-ART 76. Its edge grows with token density: white decks win 55.8% [50.9, 60.6]
  with 3–5 TOK cards, 71.0 [68.1, 73.8] with 9–11 and 77.3 [69.1, 83.8] with 12–14.
- **Blue does not lose for want of pieces.** More of its theme makes it worse. Blue decks win 46.0 [43.2, 48.7]
  with 3–5 SPL cards and 30.7 [26.1, 35.8] with 12–14. GY is flat to falling. **ETB is the exception:** 9–11
  ETB pieces win 50.9 [47.4, 54.5], against 37.1 [34.4, 39.9] with 3–5.
- **What explains blue is card flow.** I counted 17 cards that draw or filter without adding to the board:
  Opt, Consider, Brainstorm, Ponder, Thought Scour, Deep Analysis, Mulldrifter, Faithless Looting, Cathartic
  Reunion, Unexpected Windfall, Mishra's Bauble, Chromatic Star, Prophetic Prism, Ichor Wellspring, Candy Trail,
  Village Rites and Deadly Dispute.
  - Each one in a deck costs **−2.9 points [−3.7, −2.1]** of win share, with the deck's and its opponent's
    colours held fixed.
  - The gradient holds within each colour. White decks with 0–1 flow cards win 78%, with 6–7 win 49%. Blue
    decks with 2–3 win 52%, with 8–9 win 26%.
  - Blue decks carry 2.1 more flow cards than white decks.
  - Without flow in the model, blue sits −6.7 [−9.1, −4.4] points against green. With it, blue sits +3.9
    [+0.5, +7.3]. **Card flow accounts for all of blue's deficit.**
- **What explains white is token density, plus a large unexplained part.**
  - Token density is worth +1.5 [+1.0, +2.1] points per TOK card. Creature count adds nothing (−0.5
    [−1.1, +0.1]).
  - With both in the model, white's edge over green falls from +17.2 [+15.1, +19.4] to +11.4 [+8.5, +14.2].
    About a third is the token package. The rest is white's cards being efficient bodies and removal in the AI's
    hands.
- **The AI amplifies a small human gap.** In 17Lands' Powered Cube data (humans), the cube's white cards run
  +3.1 and its blue cards −1.2 points from that set's mean, on the 10 and 9 cards matched. The lab gap is 24
  points. Blue is below 50% in all six other lab metas and white is at or above 50% in all six, so this is a lab
  pattern. Synergy, with its cantrip-heavy blue and its token-heavy white, shows it most.
- **Red is the third-weakest colour** (44.9), with the same card-flow profile (4.89 per deck). v3 leaves it
  alone (§5).

## 2. The cards

Pooled over the 8 generations, ≥ 40 games. *Shrunk* is evolve's rate (20 games of prior at 50%), and the
interval is on the raw rate. *Pairs* is the card's own colour-pair baseline (D377). *Δ* compares decks of the
same pair with and without the card: it is relative to whatever card took its place, ~150 cards are tested, so
about 8 intervals exclude 0 by chance.

**Top 12 white:**

| card | themes | games | shrunk [95%] | pairs | Δ [95%] | rating |
|---|---|---|---|---|---|---|
| Soul Warden | LIFE TOK | 535 | 68.5 [64.7, 73.3] | 61.7 | +4.3 [+0.4, +8.2] | 62 |
| Luminarch Aspirant | CTR | 1446 | 67.4 [64.9, 70.2] | 58.9 | +6.3 [+2.9, +9.6] | 96 |
| Adeline, Resplendent Cathar | TOK | 1341 | 67.1 [64.5, 70.0] | 59.6 | +4.5 [+1.1, +7.9] | 93 |
| Elspeth, Sun's Champion | TOK | 1332 | 66.8 [64.2, 69.7] | 60.0 | +2.8 [−0.6, +6.1] | 91 |
| Sun Titan | GY ETB LND | 1199 | 66.6 [63.9, 69.7] | 61.1 | +3.2 [−0.1, +6.6] | 65 |
| Welcoming Vampire | TOK ETB | 1385 | 66.5 [63.9, 69.4] | 59.3 | **+7.5 [+4.1, +10.8]** | 80 |
| Lunarch Veteran | LIFE TOK GY | 993 | 66.4 [63.5, 69.9] | 61.1 | +1.8 [−1.6, +5.2] | 63 |
| Brimaz, King of Oreskos | TOK | 1120 | 66.3 [63.5, 69.6] | 60.4 | +3.1 [−0.3, +6.4] | 76 |
| Charming Prince | ETB LIFE | 63 | 66.3 [58.1, 81.9] | 61.3 | −0.9 [−13.2, +11.3] | 34 |
| Battle Screech | TOK GY | 1250 | 66.2 [63.6, 69.3] | 61.4 | +1.5 [−1.8, +4.9] | 73 |
| Mentor of the Meek | TOK ETB | 1052 | 66.1 [63.3, 69.5] | 60.5 | +3.0 [−0.5, +6.4] | 66 |
| Restoration Angel | ETB | 466 | 65.8 [61.7, 71.0] | 61.6 | +2.1 [−2.1, +6.3] | 48 |

**Bottom 12 blue:**

| card | themes | games | shrunk [95%] | pairs | Δ [95%] | rating |
|---|---|---|---|---|---|---|
| Mulldrifter | ETB SAC | 1359 | 37.3 [34.4, 40.0] | 44.0 | −4.5 [−7.6, −1.4] | 72 |
| Emry, Lurker of the Loch | ART GY | 1072 | 39.2 [35.8, 42.2] | 43.7 | −3.1 [−6.4, +0.1] | 56 |
| Brainstorm | SPL | 1435 | 39.3 [36.4, 42.0] | 42.8 | −2.1 [−5.2, +1.0] | 85 |
| Talrand, Sky Summoner | SPL TOK | 1661 | 39.4 [36.7, 41.9] | 43.3 | −3.4 [−6.5, −0.3] | 90 |
| Thought Scour | SPL GY | 1400 | 39.5 [36.6, 42.2] | 42.9 | −3.5 [−6.6, −0.4] | 80 |
| Consider | SPL GY | 1605 | 39.7 [37.0, 42.2] | 42.3 | −4.2 [−7.3, −1.1] | 95 |
| Mana Leak | counter | 1490 | 39.7 [36.9, 42.3] | 43.8 | −1.4 [−4.5, +1.6] | 99 |
| Torrential Gearhulk | SPL ETB GY | 1470 | 40.1 [37.2, 42.7] | 43.2 | −0.1 [−3.2, +3.0] | 71 |
| Ponder | SPL | 1532 | 40.5 [37.7, 43.1] | 43.3 | −3.0 [−6.1, +0.1] | 98 |
| Deep Analysis | GY SPL | 1723 | 40.9 [38.3, 43.4] | 43.7 | −3.0 [−6.1, +0.1] | 94 |
| Remand | SPL counter | 1667 | 41.0 [38.3, 43.5] | 42.6 | −1.3 [−4.3, +1.8] | 99 |
| Champion of Wits | ETB GY | 1346 | 41.1 [38.1, 43.8] | 42.9 | −1.3 [−4.4, +1.8] | 68 |

Card rates sit on their colour (white 63–69, blue 37–45) because a colour's decks play nearly all of its cards: a
blue card is played in 82% of the pools where it is on colour, on average. The positive blue Δs are Sai +3.5 [0.0, +7.0] and Murmuring Mystic +1.6, both
token makers.

**Blue pool candidates.** I read J135's 781-row pool, rebuilt in the scratchpad: byte-identical notes, the same
pool facts. 73 cards qualify: Forge-supported, neither `AI:RemoveDeck` flag, not on the 57 never-add notes, mono-U
or a U pair, and tagged SPL, GY or ETB. Only 14 have Omega or Vintage numbers. The lift in brackets is each cube's
shrunk rate against that cube's own blue mean.

| card | tags | Omega | Vintage | elsewhere |
|---|---|---|---|---|
| Teferi, Time Raveler (WU) | CTRL ETB | – | 53.0 (+4.7, 1418 g) | modern +1.9 |
| Sower of Temptation | ETB | 51.0 (+2.3, 4232 g) | – | – |
| Uro, Titan of Nature's Wrath (UG) | LND GY | 44.1 (−4.5, 327 g) | 50.5 (+2.2, 257 g) | modern +6.2 |
| Brazen Borrower | SPL EVA | 50.7 (+2.0, 3225 g) | 48.6 (+0.3) | modern −0.5, FF −0.6 |
| Urza, Lord High Artificer | ART ETB | – | 50.3 (+2.0, 3527 g) | – |
| Jace, the Mind Sculptor | CTRL SPL | 48.1 (−0.5) | 49.3 (+1.0) | – |
| Psychic Frog (UB) | GY | 49.4 (+0.8) | 45.3 (−3.0) | modern −7.6 |
| Memory Lapse | counter SPL | – | 48.3 (−0.0) | – |
| Venser, Shaper Savant | ETB counter | 48.4 (−0.2) | – | – |
| Murktide Regent | SPL GY | 47.9 (−0.8) | – | modern +0.2 |
| Preordain | SPL | 48.0 (−0.6) | 44.5 (−3.8) | below in 4 of 4 others |
| Fact or Fiction, Phyrexian Metamorph, Treasure Cruise | | −1.3 to −5.1 | | |

- **Tested outside Omega and Vintage**, best first: Momentary Blink (WU, pauper +5.7), Mist Raven (pauper +2.6,
  6,510 g), Tolarian Terror (pauper +2.5, FF +1.0, modern −0.4) and Exclude (+2.2, a counter).
- **The other 34 are untested.** The top-rated are Tamiyo, Inquisitive Student (99), Tishana's Tidebinder (96),
  Lutri (98) and Stormchaser's Talent (65).
- Every lift above is within ±5 points. Another cube's colour mean is a weak yardstick: no candidate is shown to
  be strong.

## 3. The proposal: v3, eight swaps

The section counts stay as they are (W 24, U 22, Gold 21). The 10 shocks and 10 fetches, the two counters and
every shared white enabler (Thraben, Spirited Companion, Blade Splicer, Battle Screech, Lingering Souls,
Reveillark, Luminarch) stay. The proposal **trims white's token payoffs and takes card flow out of blue for bodies
and ETB.** The power filter left out Urza, Teferi, Jace and Hullbreacher: they are Vintage-level, against
principle 2.

| out → in | serves | evidence | expected effect |
|---|---|---|---|
| Welcoming Vampire → Kor Skyfisher | ETB ART (blink hub) | WV Δ +7.5 [+4.1, +10.8], white's largest; Skyfisher −2.0/−3.2/−1.4 vs white in FF/Peasant/Pauper | white decks lose their best token payoff |
| Adeline → Militia Bugler | ETB | Adeline Δ +4.5 [+1.1, +7.9]; Bugler pauper +0.6 | a standalone token engine out |
| Elspeth → Serra Paragon | LND GY ETB | the doc's own "closest to a bomb"; Paragon Vintage −0.7 | the doc's "more hub cards"; fetchland recursion |
| Consider → Tolarian Terror | SPL GY | Consider Δ −4.2 [−7.3, −1.1]; Terror +2.5/+1.0/−0.4 | flow out, a spells payoff with a 5/5 body in |
| Ponder → Sower of Temptation | ETB | Ponder Δ −3.0 [−6.1, +0.1], below blue in 5 of 6 other cubes; Sower Omega +2.3 | flow out, ETB threat in |
| Brainstorm → Brazen Borrower | SPL | Brainstorm Δ −2.1 [−5.2, +1.0]; Borrower +2.0/+0.3/−0.5/−0.6 | flow out; still a spell |
| Deep Analysis → Mist Raven | ETB | DA Δ −3.0 [−6.1, +0.1]; Raven pauper +2.6 | flow out; ETB density, blue's one positive gradient |
| Lonis → Uro (GU) | LND GY | Lonis played in 11% of on-colour pools (rated 39); Uro mixed (above) | a played Simic signpost |

- **Blue: about +4 to +8 points**, if the regression is causal (it is observational, §5). The four blue cuts sit
  in 47–55% of blue decks each, so v3 removes about 2.0 flow cards per blue deck. At −2.9 [−3.7, −2.1] per card
  that is +5.9 [+4.3, +7.6].
- **White: about −2 to −6 points.** The three white cuts take about 1.6 TOK cards out of each white deck: −2.4 by
  the TOK coefficient. Their Δs would say about −8, but those are the selected top values (winner's curse).
- **Pair spread:** from 38.7 (WB 70.2 − UG 31.5 on all 1,716 drafts) to roughly 28–34. That is a guess with
  these intervals behind it, not a prediction.
- **Every new card is untested in Synergy.**

The cube file also gains a "Simic lands and graveyard" bullet, the only pair the deck list lacked. Sower and Uro
go under "Cards to watch". Checks:
- **Both parsers accept it:** ForgeCoach's `parseCube` and the lab's `cube.ts` each report 180 cards, 180
  unique, every section at its count, no warnings.
- **Every name is spelled as Scryfall spells it**, against the local oracle index, 180 of 180.
- **Every card is in Forge 2.0.14:** each `Name:` is in `cardsfolder.zip` beside the pinned jar (sha256 3c0a7c38…),
  and the engine's facts cache says supported for all 180.
- **None of the eight new cards has an AI flag.** The 8 `AI:RemoveDeck:All` cards are v2's.
- **No new loop:** Skyfisher, Paragon, Sower and blink each give value once per cast or turn. That was read from
  the Oracle text, not run.

## 4. Pre-registered test for J136 (written 2026-10-16, before any v3 draft)

- **Design:** v2 (sha256 8cb5e5f0…806c36) and this v3, each drafted on **one shared seed block of 1,500 drafts**.
  The settings are J135's: grid, best of three, Default against Default, Forge's ranks, no exploration, no evolve.
  The power check is below.
- **Measure:** the pair spread is max − min over the colour pairs with ≥ 40 decisive games in that cube's batch.
  Its 95% interval is D439 `compare`'s paired, draft-clustered bootstrap if that is merged when J136 runs. If it
  is not, the interval is J135's `balance.mts` parametric bootstrap (design effect 1.25, 10,000 draws, seed 136).
  The job names which before its first draft.
- **Rule:** **v3 is better balanced** iff
  - v3's spread interval lies wholly below v2's (v3's upper bound < v2's lower bound), **and**
  - no v3 pair with ≥ 40 games has a Wilson 95% interval wholly below 35%.

  Anything else is **NOT SHOWN**, never "no change". The paired difference and every pair's rate are reported as
  description and decide nothing. A pass ships nothing: Justin decides.
- **Power:** I bootstrapped J135's pooled pair rates at a given size against a v3 30% flatter.
  - 300 drafts a side: the intervals overlap (v2 [37, 57], v3 [26, 46]). The 300-draft batches are under-powered
    for this rule.
  - 1,000 a side: they barely separate (v2 lower 38.3, v3 upper 37.9).
  - 1,500 a side: v2 [38.6, 48.1], v3 [26.6, 36.2], which is why the design says 1,500.
- **Wiring J136 needs:** the J136 job on branch `pc-jobs-J136` reads `results/J135/synergy-cube-180.v3-candidate.md`.
  That is evolve's file, v2 unchanged. It also compares four cubes with no verdict rule. To run this test the job
  must:
  - read `synergy-cube-180.v3-designed.md` once APPROVED exists;
  - add a v2 population on the same seed block.

  That is a job change for Justin or the cloud. This document does not make it.

## 5. What the data could not tell me

- **Humans.** Every number is Forge's AI piloting decks that the lab's drafter and builder chose by Forge rank.
  The human gap on the matched cards is about 4 points, not 24. v3 may over-correct for human tables. Cutting
  Brainstorm and Ponder is a lab-motivated trade a human cube designer might not make.
- **Causation.** The flow and TOK coefficients and the Δs are observational. A card's presence follows the draft,
  not a coin. The flow list is my own classification. A cheaper causal test exists: lower blue's cantrip ratings in
  a ratings TSV and re-draft. That fixes the drafter, not the cube.
- **Drafter or player?** Blue's high ranks pull it into 57% of decks. I cannot separate "the AI misplays cantrips"
  from "the drafter forces blue into thin pools". The gradient within blue decks points to play, but does not
  prove it.
- **The new cards.** None has Synergy games. Their outside evidence is within ±5 points of other cubes' colour
  means, at most four cubes each.
  - Sower may prove too strong.
  - Uro only works if the AI escapes it, which I did not check.
  - Brazen Borrower's adventure half depends on the AI casting Petty Theft.
- **The leftover white edge.** About +11 points of white's edge is unexplained by TOK, flow or creature count.
  Luminarch Aspirant (Δ +6.3) is the next lever if v3 falls short. I kept it as a CTR enabler.
- **Red.** Red is weak and drafted least, with the same card-flow profile as blue. One cycle at a time, so v3
  leaves it for v4.
- **Mana and screw.** The drafts log no colour screw or mulligans, so a mana effect is ruled out only by the
  symmetric lands and land counts.
- **Exploration** gave no verdict on any low-rated card: 0 hold, 0 weak, 34 undecided.
