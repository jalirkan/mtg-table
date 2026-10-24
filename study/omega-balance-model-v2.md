# The library card model, v2: drafted context, the drafter's own mix, power concentration, a robust generator (2026-10-24)

*Written by the PC lab-analysis lane, 2026-10-24, from the recorded data only (no engine run). Code: mtg-table branch `pc/balance-model-v2` (PR #200, head `fde1864c`, after the review fixes; D475, amending D473), `tools/cubelab.sh balance-model --night …`. Every number below is in `omega-balance-model-v2/model.json` (the no-power run's in `omega-balance-model-v2/nopower/`); the full tables are `omega-balance-model-v2/summary.md`, and every drafted card's census, drafted-alone and blended value is `omega-balance-model-v2/cards-drafted.tsv`. Every payoff is Forge's Default AI in both seats and the lab drafter's decks; nothing here is about people.*

**What v2 was asked to fix** (J160's reading, `results/J160/summary.md`): transfer error RMSE .030 colours / .047 pairs on five generated cubes (Omega: .017 / .021); "even to .01" cubes measuring gaps of .04–.10; blue under-predicted wherever blue's power was drafted and on Omega (.448 against .477 / .480); WU +.064 and UG +.048 over prediction on every cube that judged them; red low on 4 of 5, black low on the legacy cubes; three-colour decks 15–71% of what the drafter builds against the 4% the J145 mix assumed.

## The answer in six lines

1. **Drafted values beat census values and drafted values alone.** Fitted on all 32,777 arm-B games (J145, J159, J160's five cubes; decks clustered by draft), with each card shrunk toward alpha × its census value: held-out Brier by draft .24193, against .24253 drafted alone and .24501 census × alpha (makeup only .24806). alpha = .95 (legacy), .83 (pauper).
2. **Out of sample on a new cube, v2 is only a little better than v1.** With all of J160 held out: colours .030 → .028, pairs .047 → .042 (pooled, 25 + 23 cells). Omega with its other night in the fit: J159 .017 / .021 → .007 / .017, J145 .018 / .024 → .007 / .018. The gain needs the cube (or its cards) to have been drafted once.
3. **The mix was not what was wrong.** The night's own decks (a perfect mix) with census values score .028 / .046 on J160 — the same as v1's assumed mix (.030 / .047). With v2's values: .025 / .042 against v2's .028 / .042. The error left is in card values in drafted context, not in where the drafter puts the cards.
4. **Power concentration is real but already in the rating curve.** Ancestral Recall sits in .51 of the high cube's blue decks and Time Walk in .54 — 1.4x a uniform share of blue's 24 — but the play curve already gives a 100-rated card that much: their concentration factors are .98 and 1.03. Omega's blue miss closes when Omega's other night is in the fit (.476 / .478 against .477 / .480), through card values (Sower of Temptation +1.9 → +4.9 points, Man-o'-War 0 → +2.3, Time Walk +2.6 → +5.0, Ancestral +1.4 → +3.0); concentration alone leaves it at .449. **The high cube's blue miss does not close out of sample** (.501 with J160 held out, .517 with only that cube held out, .546 in sample; measured .566): no other night drafted Ancestral or Time Walk.
5. **The generator's gaps are now honest.** Point gaps .040–.055, robust gaps (mean over bootstrap replicates the search never saw) .047–.058, and .10–.12 once the validation's new-cube transfer error (.026 a colour, .038 a pair) is added to each cell — that last is what a night should expect to measure before its own noise. #196's .003–.008 were point gaps.
6. **Five v2 candidates** under `cubes/library/balanced/v2/` (new ids `balanced-v2-…`; v1's files untouched): legacy-even-high, -mid, pauper-even, and the two legacy ones without the powered list.

## 1. Drafted context as a source

The drafted fit is D473's model on drafted games, with one change: each deck's census strength (the sum of its nonland cards' census values on the cube's scale — legacy + powered, or pauper for a cube that is mostly pauper cards) is a covariate whose coefficient alpha is fitted per scale, and every card's own term is ridge-shrunk toward 0, i.e. toward alpha × its census value. A card with few drafted games keeps alpha × census; one with thousands goes where the drafted games say. That is the shrinkage blend weighted by each card's drafted n, and the penalty chooses its strength.

| values | held-out Brier, 5-fold by draft (32,777 games, every draft on one side) |
|---|---|
| makeup groups and the play only | .24806 |
| census values × alpha | .24501 |
| drafted values alone (ridge to 0, lambda 800) | .24253 |
| **blend: drafted terms shrunk toward alpha × census (lambda 1600)** | **.24193** |

**Decision: the blend.** It wins the held-out-by-deck test outright and in every held-out-night comparison (section 4). alpha < 1 says drafted context compresses the census's spread a little — the cubes were chosen by census values, so their cards' census estimates carry a winner's curse.

The largest moves (cards with 1,000+ drafted deck-games; `summary.md` has 25): Sower of Temptation +1.9 → +4.9, Time Walk +2.6 → +5.0, Mox Jet +2.1 → +4.3, Ugin, Eye of the Storms +0.5 → +2.7, Karn, Scion of Urza 0 → +2.1; down: The Abyss −0.5 → −3.3, Lotus Petal −0.3 → −2.9, Wood Elves −1.0 → −3.2, Barrowgoyf +2.3 → −0.1, Wheel of Fortune −0.3 → −1.9 (the J160 reading's red suspect).

Tried and dropped: colour-pair and colour identity as deck terms in the drafted fit (WU's and UG's excess as a property of the deck). On the nights' own decks with J160 held out they give .025 / .042 — exactly what the blend gives without them; with the cube held out .020–.021 / .036 either way. The WU / UG excess is in specific cards on specific cubes, and it does not transfer.

## 2. The drafter's real mix

The lab drafter is TypeScript (lab.ts) and deterministic, so `balance-model` runs it: 2,000 grid drafts of the candidate cube at fresh seeds (947,500,001 on), about 6 s, the same code and weights a night drafts with. It re-drafts J160's recorded decks exactly from their seeds (the test checks ten drafts), and the deck profile computed from the facts equals the recorded one on all 32,800 decks of the three nights.

Measured on the nights' lab decks, by scale:

| scale | lab decks | three-colour | two-colour: a colour / gold / colourless / splash | three-colour: a colour / gold / colourless | play curve |
|---|---|---|---|---|---|
| legacy | 23,982 | 18.6% | 8.39 / 0.58 / 5.32 / 0.32 | 5.63 / 1.28 / 4.84 | −0.267 + 0.0087 × rating |
| pauper | 3,998 | 70.7% | 8.07 / 0.65 / 4.71 / 1.50 | 5.93 / 0.81 / 4.41 | −0.140 + 0.0079 × rating |
| v1 (J145) | 3,841 two-colour | 0 | 9.13 / 0.45 / 4.18 / 0 | — | −0.332 + 0.0095 × rating |

Per cube the three-colour share runs 4% (Omega) to 15–19% (high cubes), 34–35% (mid cubes) and 71% (pauper) — within one band. So v2 does not use a band average for a new cube: it reads the mix off the drafter's own simulated decks for that cube. `predictPayoffsV2` takes the two- and three-colour types at their shares, each with its class counts and the makeup term of a k-colour deck from the drafted fit (three-colour decks run about 4–6 points weaker than two-colour ones in drafted games), and reduces exactly to v1's `predictPayoffs` with no three-colour decks.

Three-colour decks also shift every colour cell the same way: a colour's own decks are three-colour more often than its opponents' (six of the ten triples hold it, four of the ten pairs), so on a pauper cube every colour reads a little below .5 even when the classes are equal.

## 3. Power concentration

A card's draft concentration = its share of its colours' decks (the drafter's) ÷ the share the mix and the rating curve assign it; it multiplies the card's weight in its class mean.

- **Ancestral Recall .98, Time Walk 1.03** on the high cube (shares .51, .54; a uniform share of blue's 24 would be about .37). The rating curve already concentrates a 100-rated card that much.
- The concentrated cards are mid-rated synergy and gold picks: Writhing Chrysalis 3.1 (pauper), Baleful Strix 2.6 (Omega), Wan Shi Tong 2.4, Otharri 2.4, Ninja of the Deep Hours 2.4.
- **What it does to the predictions:** small. Omega's pairs improve (J159 held out .020 → .017; cube held out .023 → .020); J160 is unchanged (.028 / .042 with or without it). It stays in v2 because it helped where it could be judged and cost nothing elsewhere.
- **What closed the blue miss:** card values in drafted context, and only for cards a night had drafted.

| blue, measured / v1 / v2 | night held out | cube held out | nothing held out |
|---|---|---|---|
| Omega J159 (.477) | v1 .448, **v2 .476** | .449 | .479 |
| Omega J145 (.480) | v1 .448, **v2 .478** | .449 | .479 |
| high (.566) | v1 .498, v2 .501 | .517 | .546 |
| high-nopower (.508) | v1 .488, v2 .498 | .527 | .520 |
| mid (.490) | v1 .501, v2 .493 | .482 | .487 |
| mid-nopower (.482) | v1 .502, v2 .489 | .497 | .488 |

Census values with v2's mix and concentration leave Omega's blue at .449: the concentration factor cannot reach a miss that lives in the values. On the no-power cubes v2 does not inflate blue (mid .493 and .489 against .490 and .482 measured).

## 4. Validation before any night

Each measured cube re-predicted with the drafted fit refitted without the held-out data (alpha and the makeup terms refitted too; the penalty 1600 is the one CV by draft chose on all games). v1 is D473's prediction of record, reproduced exactly (J159: .017 / .021). RMSE over the five colours and the pairs with 400+ deck-games.

| held out | v1 colours / pairs | **v2** colours / pairs | v2 values on the night's own decks | census on the night's own decks |
|---|---|---|---|---|
| J145 (Omega; J159 in) | .018 / .024 | **.007 / .018** | .010 / .014 | .021 / .033 |
| J159 (Omega; J145 in) | .017 / .021 | **.007 / .017** | .008 / .012 | .019 / .035 |
| J160 legacy-even-high | .044 / .063 | **.040 / .056** | .037 / .056 | .041 / .060 |
| J160 legacy-even-high-nopower | .028 / .025 | **.025 / .016** | .019 / .015 | .022 / .022 |
| J160 legacy-even-mid | .025 / .039 | **.025 / .034** | .020 / .032 | .022 / .036 |
| J160 legacy-even-mid-nopower | .027 / .040 | **.026 / .037** | .023 / .035 | .026 / .039 |
| J160 pauper-even | .023 / .056 | **.022 / .058** | .023 / .057 | .024 / .063 |
| **J160 pooled** (25 + 23 cells) | **.030 / .047** | **.028 / .042** | .025 / .042 | .028 / .046 |

Leaving the cube out instead of the night (for J160, the other four cubes in; for Omega, both Omega nights out): J160 pooled .022 / .036 — but that is a cube whose sibling cubes were drafted (the same skeleton, band and generator, most of the same cards), not a cube nobody drafted, so **the night-held-out .028 / .042 is the honest new-cube number**. Omega with both its nights out: .018 / .024 (J145) and .014 / .020 (J159), against v1's .018 / .024 and .017 / .021. In sample (nothing held out) J160 is .012 / .022: what drafted values can carry once a cube has been measured.

**Plainly:** v2 is better than or level with v1 in every held-out comparison except pauper's pairs (.056 → .058), and much better on a cube that has been drafted before; on a cube nobody has drafted it is better by .002 a colour and .005 a pair. The transfer error it leaves (night-held-out residuals beyond the reads' own noise) is computed per source: **.026 a colour and .038 a pair on the five new cubes** (J160), 0 and 0 on the re-measured one (Omega: indistinguishable from the reads' noise), .021 / .030 pooled. The generated cubes are new cubes, so every v2 interval carries .026 / .038; the floors used when a run has no new cube (.015 / .025) are hand-set.

**Two choices were made on this table**, so the held-out numbers are mildly optimistic for them: keeping the concentration factor, and the analytic mix over summing values on the drafter's simulated decks. The next night is their clean test.

Summing v2's values over the drafter's simulated decks instead of the analytic mix ties on J160 (.027 / .042) but is worse on Omega with the cube held out (.026 / .037, .020 / .034); it is kept as a column (`v2decks`), not as the predictor.

## 5. The generator, robust

The flow is D473's, on v2's values and SDs. The search then:

- scores a like-for-like swap (same class and mana value, within 3 points of the level and 25 Forge rating points of the card it replaces, creature floor kept) by the **mean gap over 100 bootstrap replicates** (the even ones) on the mix and concentration the drafter shows on the flow's cube, the gap being max |colour − .5| + max |pair − .5| over the pairs a night would judge (400+ deck-games at 2,000 drafts);
- takes a swap only if it lowers that mean by .002 or more;
- re-drafts the result and keeps it only if its mean gap on the other 100 replicates (the odd ones, which the search never saw) beats the flow's by the same .002.

| cube | search | gap, point | robust (95%) | with transfer error (95%) | flow alone, robust |
|---|---|---|---|---|---|
| balanced-v2-legacy-even-high (level +2.0) | 7 swaps kept | .040 | .047 (.025–.073) | .110 (.061–.171) | .071 |
| balanced-v2-legacy-even-high-nopower (+2.0) | 6 swaps kept | .055 | .058 (.034–.095) | .117 (.067–.181) | .079 |
| balanced-v2-legacy-even-mid (0) | flow kept | .041 | .051 (.025–.074) | .114 (.061–.175) | .051 |
| balanced-v2-legacy-even-mid-nopower (0) | flow kept | .040 | .049 (.026–.071) | .107 (.059–.172) | .048 |
| balanced-v2-pauper-even (0) | 11 swaps kept | .052 | .054 (.031–.081) | .106 (.052–.174) | .119 |

Each colour cell's interval with the transfer error is about ±.055 (pauper ±.06) and each pair's ±.08. The "with transfer" gap adds independent noise to each cell, while the real residuals are correlated across a colour's pairs (on J160 WU and UG ran high together), a known narrowing of that interval. The mid cubes' search found no swap that survived the held-out replicates, so they are the flow's cubes; the high and pauper cubes' searches bought .02–.07 of robust gap that held on unseen replicates. The pauper level scan found no level above 0 its colours could hold, so pauper sits at 0. The pauper cube is the same 180 cards without the powered list, so it has no `-nopower` file (as in D473). Each cube document's header carries its per-cell table with intervals.

**For the next night:** a night measuring v2 cubes should expect max colour + max pair gaps around .11 (.06–.17) before its own noise — not .01. A cube measuring inside that range is consistent with v2; the useful test is whether v2's per-cell errors are smaller than v1's were on J160, and the useful by-product is drafted games of the cards v2 now leans on.

## Known gaps

- **One night of generated cubes.** The J160 cells are correlated (pairs share colours, five cubes share most of a model): 48 qualifying cells are fewer than 48 checks, and the .002 / .005 out-of-sample gain is within what another night could move.
- **The penalty was chosen on all drafted games**, including each held-out night's; alpha and the makeup terms were refitted without it.
- **Combination effects** (WU, UG) are not in the model: an additive card sum cannot carry them, and identity terms did not transfer.
- **The new-cube transfer error .026 / .038** comes from one night of five sibling cubes and includes the drafted values' own noise (the prediction's bootstrap variance is not subtracted; the intervals add the bootstrap on top). Its per-cell noise is independent where the real residuals are correlated, which narrows the gap-with-transfer interval.
- **Ratings:** the drafter simulation assumes Forge's ranks (the facts file, sha in `model.json`) and the default weights; all three nights' lab arms ran that way (`model.json`'s `nights[].labRun`, `drafterAssumes.nightsAgree`). A night run with `--ratings` would need the same file in the simulation.
- **Pull is not modelled analytically** (the analytic mix takes every pair and triple as equally likely); the drafter's simulated decks know pull, and summing over them did no better.
