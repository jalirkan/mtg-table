# Atlas review 2 (2026-10-27): where confident labels come from, and how to branch better

Justin's question: "Is it time for us to review our data and consider optimizing our branching and where we are
looking for confident labels?" A read-only pass over 29 spine runs: the old seat (J166–J169, 13 spines), the D486
seat (J171, the same 13 decks and seeds), and the first 3 D488 spines of J173. The tables are in
`study/atlas-review-2026-10-27/report/`, the scripts in `bin/` (run `load.py`, `derive.py`, then any table).
The three seats are pooled here as a design read only — never for training (D486, D488).

**Answer: yes.** The two cuts with nearly free gains are about how many branches a decision gets, not which
decisions are picked: **stop at 150 branches, not 200**, and **end a decision at 50 branches when Forge's own
option (o0) is leading or tied.** Together about **+39% confident labels a night (95% range +25% to +55%): ~46 a
night instead of ~33** on this mix. The "where to look" levers (k, turn, kind, band) are each +10–20% with
intervals that include zero, and two rest mostly on one spine.

## The data

641 listed decisions, 322 branched, 222 complete, 100 screened, 64 confident (27 / 28 / 9 by seat). The old
and D486 seats are the same 13 spines (same decks, seeds, baselines, listings), so the 222 complete decisions
are 144 distinct ones (50 distinct confident) on 16 deck pairs; the intervals draw a spine for both seats
together. A numpy copy of the atlas's confidence arithmetic matches atlas.json on 215 of 222 (the 7 misses
have a lower bound within 0.0075 of zero). The atlas lists only priority, attack and block decisions; mulligan
and target decisions are never branched.

## 1. Where confident labels come from ("rate" = complete decisions that ended confident)

- Flat across seats: .28 (old), .28 (D486), .38 (D488, 24 decisions).
- **By option count k:** k=3 is the weak cell, .19 at 0.40 labels per branch worker-hour; k=4 .34, k=5–6 .36,
  k=7+ .38 (0.56–0.79 per hour); k=2 (28 filled-in decisions) .21.
- **By kind:** priority .29, attack .26, block .44 (9 complete blocks only).
- **By turn:** 1–4 .20 (10 decisions); 5–8 .22 and the most expensive (2.37 worker-hours per label); 9–14 .34;
  15+ .30.
- **By band:** peasant .39 but 9 of its 20 labels are one spine (s06; .31 without it); the others .23–.30.
- **By state:** 6+ creatures on the board .42 (33 decisions); ahead on life .35, even .26.
- **The one strong predictor is o0's regret after 50 branches:** o0 leading or tied → 3 confident of 77
  (.04); behind by .10–.20 → .69; behind by .20 or more → 15 of 15.
- `why` only ever says spread / replaces / fill; there is no "Forge disagrees" pick.

## 2. The branch budget

- 66% of branch time goes to complete decisions that end WITHOUT a confident label; 31% to the ones that do;
  3% to screened decisions; 1.8% to the Forge map.
- **The n curve flattens after 150** (expected confident count over 5 seeds): 25 → 37.8, 50 → 43.4,
  100 → 50.0, **150 → 64.8, 200 → 65.4**. From 150 to 200, 8 labels came in and 7 went out: net +1 for 21
  worker-hours (0.05 per hour, against ~0.6 for a new decision). At 150, 88% of the final confident set is
  already confident.
- Extending close decisions to 300–400 does not pay: 0.16–0.46 labels per worker-hour.
- The screen and early stopping saved what was measured (31.4% J169, 31.5% J171). The screen's 25-branch read
  is accurate (r = 0.988); widening .04/.96 to .06/.94 would lose 3 of the 13 extra decisions — keep it. It may
  hide 5–9 labels on these spines (the 15 screened decisions where o0 trailed by .04+), on 5 comparable cases.
- Early stopping lost nothing visible: 0 of 294 stopped options had a mean at or above the final best's.
- Firmness: 13 of 64 confident labels have a lower bound ≤ .01 (they flip with the seed); across the seat
  change 13 of 29 decisions confident on either seat are confident on both (45%).

## 3. The Forge map

7 spines, 56 complete decisions. It adds nothing to the label (confidence comes from the random map). It
agrees with the random map near chance: same best 26 of 56, rank correlation .21; on 8 of 12 confident labels
its best differs. It costs 9.7% of its spines' branch time, 1.8% overall; dropping it gains +2% (0 to +4%).
Whether to keep it is a question about the agreement study, not about labels.

## 4. What is not branched

The premise that attacks and blocks are rarely branched came from the cube nights (J158/J162) and does not hold
here: attacks are 26% of complete decisions, branched in proportion to their listing, and cheaper (0.44 vs 0.55
worker-hours a decision); blocks are 6% of listings and 69% of branched blocks are screened because they fall
in decided games (median turn 15). **The real unbranched class is k=2** (43% of listings), excluded by the
minimum-of-3 rule. An attack/block night would yield +17% (−16% to +59%) at ~1.7× the spines. Attack labels
are the most stable signal: five attack/block decisions are confident on both seats with the same best (s08
d12, s10 d15, s12 d13, s13 d15, the s09 d13 block). J168's s02 d3 attack label was the old seat's alone (D486:
1.5 points, not confident).

## 5. Recommendations (base 32.8 confident labels per 7-worker night)

| # | change | gain [95%] | ≈ per night | cost or risk |
|---|---|---|---|---|
| 1 | **Cap at 150 branches** (`--branch-random 150 --early-stop 50,100`; flags only) | +22% [+11, +34] | ~40 | 7–8 of 65 labels change identity; intervals a little wider |
| 2 | **Futility stop at 50 when o0 leads or ties** (a small D480 follow-up) | +17% [+10, +24] alone; **+39% [+25, +55] with #1** | **~46** | loses 3–4 of 65 labels; ~35% of decisions get a 50-branch label only |
| 3 | Prefer k ≥ 4 (drop k=3) | +13–15% [−5, +41]; ~+8 points on top of #1+#2 | ~48 | needs more spines; k≥5's edge is mostly s06 |
| 4 | Skip turns 1–8 | +15% [−2, +40] | ~38 | the training set loses early-game play; never skip 15+ (−6%) |
| 5 | Exempt from the screen decisions where o0 trails by .04+ at 25 | ~+5% | +1.5 | rests on 5 cases |
| 6 | Drop the Forge map | +2% | +0.6 | loses the agreement study |

Rule #2's three lost labels sit on three different spines, and it gains on every seat (+47%, +35%, +23% with
#1). Not recommended: re-weighting toward peasant (s06), extending close decisions to 300, widening the screen.

**The path:** now, #1 (a flag change) on the next night; next, #2 as a small lane, pre-registered before the
night it first runs on; later, #3 and #4 as registered arms, never adopted from this data alone (the cap and
futility rules were found on this same data; D488's three independent spines show the smallest gains). Against
selection bias — #2–#4 all tilt the set toward "Forge was wrong, late, with many options" — keep the cheap
partial labels in the label file, and keep a full-length random sample of the stopped decisions.

## The ten numbers

1. Base yield: 65 confident labels on 110.6 branch worker-hours, 0.59 per hour, ~32.8 a night.
2. 66% of branch time goes to decisions that end without a confident label.
3. The confident count plateaus at 150 branches: 64.8 there, 65.4 at 200 (+1 label for 21 worker-hours).
4. Capping at 150: +22% (+11 to +34).
5. o0 leading at 50 branches: 3 of 77 end confident (.04). Stopping there: +17% alone, +39% with the cap, ~46 a night.
6. o0 trailing by .10+ at 50 branches: 39 of 50 end confident.
7. k=3: .19 and 2.52 worker-hours per label; k≥4: .34–.38.
8. The Forge map: 1.8% of branch time; same best 26 of 56, rank correlation .21; no label from it.
9. The screen vs the final value: r = 0.988; widening loses 3 of 13. Early stopping: 0 of 294 could have won.
10. Stability: 45% of labels replicate across the seat change, attacks .57 vs priority .40; 13 of 64 sit at the seed boundary.
