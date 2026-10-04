## D377 — Evolve's dominant-win tests a card against its colours, not the batch mean: a colour-adjusted null with the card's matches left out, pre-registered in code and simulated; evolve cuts and D360's raises stay on hold until J072 reads it

*Branch `c/colour-null`; written in DECISIONS.md and moved here at the merge with D379. D376's first recommendation; the methods review of 2026-10-04,
recommendation 8.*

**2026-10-04**

**Context.** D376 found that `dominant-win` (D331) tests each card against the batch's mean
card win rate. In Omega, red decks win 0.53–0.55, so the rule flags red cards as a class. In
J039's simulation, with no card effect at all, it found 3.1 candidates a generation, and 7%
of them confirmed. A cut must answer a different question: does the card win more than its
decks' colours would without it?

**Decision.** From this decision on, a NEW evolve run tests `dominant-win` against the card's
colour-adjusted null. The rule is `tools/cubelab/colour-null.ts`, and its constants are code,
not knobs (`COLOUR_NULL`):

- **The null `p0`**: the games-weighted mean, over the card's decisive games, of its deck's
  colour pair's win rate in the same batch. The pair is `playedDeck(...).key`, the main
  colours with the splash ignored.
  - Each pair's rate leaves out **both decks of every match the card played**.
  - Each pair's rate is shrunk toward the batch's deck mean by **20 pseudo-games**.
- **Its standard error**: `se0 = sqrt(Σ_k w_k² · deff · r_k(1 − r_k) / (G_k + 20))`, where
  `w_k` is the card's share of its games in pair k and `G_k` is the pair's left-in games.
- **The test**: one-sided normal,
  `z = (rate − p0 − 0.5·deff/n) / sqrt(p0(1 − p0)·deff/n + se0²)`.
- **The size filter**: `rate ≥ p0 + dominantMargin`, the same knob (0.05), now measured from
  `p0`.
- **Confirmation** uses the same rule on its own batch, never pooled with discovery.
- **D357's pooled confirmation** sums the attempts' effective excesses (n/deff · (rate − p0))
  and both variances. `pooledTest` refuses to mix the two nulls.
- **`confirmPlan`** sizes a colour candidate's batch at `p0 → p0 + dominantEffect`, with the
  games inflated by `1 + se0² / (card variance)`, still capped at `confirmMaxDrafts`.
- **`assess`'s `watch` lead** is measured from `p0` too.

**Which run uses which null.**

- `evolve.json` gains `winNull`. A new folder is written with `'colour'`
  (`WIN_NULL_NEW_RUNS`).
- A folder without the field was started on D331's mean. It resumes on the mean, for every
  generation, discovery and confirmation alike, and the run says so. This follows D357's
  `confirmPool` precedent.
- The pure functions (`ruleTest`, `discover`, `confirmCandidates`, `discoveryStage`,
  `selectSwaps`) take the null as an argument that defaults to the mean, so every earlier
  caller and test reads as before.
- Every decision records `winNull`, and the changelog's discovery line names D377.
- There is no flag to choose the null. A different rule is a new decision.

**Why these choices** (`docs/evidence/evolve-calibration.md` §7;
`evolve-calibration-sim.py`, rule `colour`, 1,000 generations on J039's own matches):

- **The card's whole matches are left out, not only its own decks.** With only its decks
  left out, the null z's sd was 1.06, and the share at p ≤ 0.002 was 1.7× nominal. In a
  mirror the opponent's games sit in the baseline, anticorrelated with the card's. With the
  whole matches left out, the sd is 0.98.
- **The continuity correction**: without it, the normal tail is lighter than the exact
  binomial the old rule uses.
- **20 pseudo-games**, so that a 300-draft confirmation batch's pairs (about 140 games
  each) are pulled toward 0.50 by under a point.
- **The baseline's own error is in the denominator**: without it, a card whose pair has
  few other games would be tested against a noisy p0 as if it were exact.

**Measured** (simulated; §7):

- **Colours matter, cards don't** (J039's pair strengths):
  - per-test shares at p ≤ 0.05 / 0.01 / 0.002: 0.050 / 0.010 / 0.0022;
  - 0.053 false candidates a generation, against D331's 3.27;
  - P(≥ 1) 0.048;
  - 2 false cuts in 1,000 generations, against D331's 248.
- **True null**: 0.034 a generation, calibrated.
- **Planted effects** (12 cards, +0.05 / +0.10 / +0.15):
  - discovered in 0.47 / 0.74 / 0.99 of generations, against D331's 0.15 / 0.70 / 1.00;
  - blue planted cards, invisible to D331, found at 0.70–1.00;
  - cut at 0.05 / 0.22 / 0.55, against D331's 0.01 / 0.30 / 0.68. The colour null's
    confirmation is the weaker half (§7);
  - 0.65 false candidates a generation, about 7% of candidates, under BH's q of 0.1.

**The hold.** Evolve cuts and D360's ratings raise stay on hold until both of these hold:

1. this rule is merged;
2. **J072** (D376's calibration night, updated here) has been read by the rule below.

Until then, no evolve run's cut is applied to a cube. D360's raised file stays out of the
default, whatever J064 reads, and J064's reading is reported, not acted on. J039's
generation-4 swap (Fable of the Mirror-Breaker out) remains a colour cut, not a card
verdict.

**J072, pre-registered here** (`calibrate.ts` on two disjoint-seed, nothing-changed Omega
batches of 8,400 drafts each, `--slice 1400`, J039's plain-draft size, so 12 slices). The
calibration holds when all three of these are true:

1. **Few false candidates.** The colour null's candidates summed over the 12 slices
   (`slice_false_colour_mean × slices`) are **at most 2**. The simulation expects 0.64
   (0.053 a slice); P(≥ 3) is 2.7% under a calibrated rule.
2. **A calibrated per-test rate.** In each full batch, the colour null's `dominant-win`
   tests at p ≤ 0.05 are **at most 9%** of its tests (`colour_win_p05 / colour_win_tests`;
   nominal 5%).
3. **No batch drift.** The colour-pair dispersion between the batches
   (`pairs_dispersion`) is **at most 1.5**. The null assumes a pair's rate is one number
   within a batch, and D376 measured about 1.

**If the calibration holds,** the hold on evolve cuts made under D377 lifts, for new folders
only. D360's raise then goes back to J064's own pre-registered reading.

**If it fails,** the hold stays, and the failure is written up as a new decision. Neither
the rule nor its constants are tuned on J072's data.

**Not done.**

- `confirmMaxDrafts` stays 300, so the colour null confirms a +0.10 card about a fifth of
  the time. A larger cap is a knob change with its own cost per generation, left to its own
  decision.
- D360's raise rule (`raise.ts`) reads exploration, not dominant-win, and is unchanged.
