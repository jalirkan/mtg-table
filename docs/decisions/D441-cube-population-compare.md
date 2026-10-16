## D441 — `cubelab.sh compare`: cube populations on the same seeds, pre-registered balance measures, paired draft-clustered bootstrap intervals, a verdict only under a written rule

*Branch `pc/cubelab-compare`, for lab job J133 (pc-jobs). `node tools/decisions.mjs next` gave
D441 on 2026-10-15; no open branch uses it.*

**2026-10-15**

**Context.** Justin's ask: "do some testing with different cube populations to see which one
tends towards a more balanced deck build by the AIs". The lab could already run one cube and
report it (`run`, `report`, `meta`), and ForgeCoach's spread view (`src/cube/flatness.ts`) reads
one `meta.json` and says how flat its card win rates are, comparing cubes only by
non-overlapping intervals of metas with different sizes, seeds and samples. A comparison needs
the populations drafted on the same seeds, the same measures written down before any number is
seen, intervals on every measure and on every difference, and no verdict unless a rule was
written first.

**Decision.**

1. **One command over `run`.** `tools/cubelab.sh compare` takes two to six populations — a cube
   file, or `--variant name=<cube.md>[,ratings=<tsv>][,weight.<w>=<v>]...` — and plays each
   through the lab's own `run` (cli.ts hands its `run` in; compare drafts and plays nothing
   itself) into `<out>/runs/<name>/`, on one seed block (`--drafts`, `--seed`), with every other
   `run` flag passed to all of them. Each run folder keeps `run`'s identity and version checks
   and resumes. `--bridge`, `--play-explore`, `--deckset`, recording and a global `--ratings` are
   refused: a population is one cube under one set of ratings and weights. The default seed is
   800,000,001, D340's verification range.
2. **The same seeds, asserted.** The analysis refuses unless every population holds exactly
   the same seeds (and the block asked for). Drafts whose games explored (D358) are left out as
   every win-rate reader leaves them out.
3. **The measures, pre-registered** (ids as in `compare.json`):
   (1) `flatness`: ForgeCoach's true SD of the cards' win rates, its arithmetic ported exactly
   (`tools/cubelab/flatness.ts`; the units built from the drafts as `meta.ts` would write them,
   `winRateShrunk` and the prior's mean rounded as `meta.json` rounds them, lands counted as
   D380 counts them), so the number is the one ForgeCoach would print for that run's meta;
   (2) `pair_spread`, max − min win rate over the two-colour pairs with `--min-pair-games` (30)
   decisive games, and `pair_within5`, the share of those within 5 points of 0.5;
   (3) `draw_rate` (timeouts are draws), `timeout_rate` and `game_turns`;
   (4) `lands`, `colours` (main colours + splash), `two_colour` (exactly two main colours, splash
   or not) and `splash`, over the played decks;
   (5) `first_pick_top10`: of every card in the first line taken from each grid (evolve's
   `firstTakes`, the lab's existing first-pick count; a Winston draft, each drafter's first
   take), the share held by the 10 cards most often there. A grid pick is a line, not a card, so
   every card of the first line counts.
4. **Intervals: a paired, draft-clustered bootstrap.** 1,000 replicates (`--boot`), each drawing
   the common seeds with replacement and taking each drawn seed's whole line in every population
   at once: a draft is the cluster (its two decks, its games and its picks share everything), and
   a difference between populations is resampled paired. 95% percentile intervals. **Three
   measures' replicates are recentred on their estimate** before the percentiles (their mean
   subtracted, the estimate added, clamped to the measure's range), because a resample biases
   them upward whatever the truth: the flatness of a resample carries the games' sampling noise
   twice (the original's rates hold it once, the resampling adds about as much again), so its
   noise-corrected variance sits about one noise variance above the estimate — measured on
   synthetic populations, a shift of 2.4–4.0×10⁻⁴ on the variance scale, against estimates of
   about −2×10⁻⁴ (floored to 0) to 9×10⁻⁴ — and `pair_spread` (a max minus a min) and
   `first_pick_top10` (a top 10 of counts) grow
   with the duplicated drafts. Flatness is recentred on the variance scale, unfloored, then
   floored and square-rooted. The other measures are averages and shares, whose shift is about
   0, and keep the plain percentile interval (recentring `pair_within5`, a share of ten pairs
   that moves in steps, made its null comparisons exclude 0 in 5 of 40 instead of 0).
5. **No verdict without a rule.** Each measure's table ranks the populations by estimate
   (1 = lowest) and lists the differences whose interval excludes 0. A `--rule
   <measure>:lower-better|higher-better[:margin=x]` adds a verdict line for that measure: A beats
   B when A is better by more than the margin, in the measure's display unit (points for rates
   and shares), **and** the paired difference's interval excludes 0.
6. **Outputs.** `compare.json`: strict JSON, numbers only (no string, array, null, NaN or
   infinity; a measure that could not be measured is an absent key; keys `[A-Za-z0-9_]`, which
   is why population names are `[a-z0-9]` words joined by single underscores), asserted before
   it is written, so the lab runner's `sh:` metrics flatten it whole. `compare.md`: the tables,
   with each population's cube, sha, ratings, weights and run folder. Never `summary.md` or
   `metrics.json`: those names are the runner's and the PC session's.

**Evidence** (`web/test/cubelab-compare.test.ts`; the coverage numbers from a throwaway script
over the test's generator, `web/test/cubelab-compare-synth.ts`, 600 drafts a population, 200
replicates):

- The port equals ForgeCoach's `cubeSpread` on two metas — a synthetic run's `meta.json` and the
  shipped Synergy meta (ForgeCoach@2f05b15, `public/cubes/synergy-cube-180.meta.json`), every
  number to the last bit — held in `fixtures/cubelab/compare/flatness-golden.json`, regenerated
  with `CUBELAB_FC_ROOT=<ForgeCoach> CUBELAB_GOLDEN_WRITE=1`. compare's flatness from the drafts
  equals the port on `buildMeta`'s `meta.json` to 1e-12.
- Known differences (cards whose true effects spread over ±0.5 logits against cards all alike;
  0% against 10% draws; 9 against 12 turns; 10% against 40% splashes; a greedy against a random
  first line) all exclude 0; two populations generated alike hold 0 on every measure tested.
- Under the null (two populations of one truth, 40 repeats) the difference intervals excluded 0
  in 1 (flatness), 3 (pair_spread), 0 (pair_within5), 2 (first_pick_top10), 3 (lands), 3
  (game_turns), 2 (colours) and 2 (splash) of 40: about the nominal 5%.
- Flatness coverage of the truth (taken from 8,000 drafts), 30 repeats each. Independent games
  within a match: a spread population 27 of 30, a flat one 30 of 30 (plain percentiles: 28 and
  30). Games sharing a match effect (a random logit offset of SD 3 per match, so the games'
  noise is nearer ForgeCoach's model): recentred 30 and 30 of 30, plain percentiles 26 and 28 —
  twice the flat cube's plain interval lay wholly above its true 0. The plain percentile's
  coverage depends on how far ForgeCoach's noise model (its assumed within-match correlation,
  0.35) overstates the games' real noise, which offsets the resampling shift by chance; the
  recentred interval does not. Where ForgeCoach's estimator is itself low (its model's noise
  above the games'), the same holds in every population, so it moves levels more than
  differences.

**Rejected.**

- *Percentile intervals on every measure as they come* — their flatness coverage rests on the
  noise model's error cancelling the resampling shift (above), and `first_pick_top10`'s smoke
  interval lay wholly above its estimate (15.1 against [15.7, 18.5] at 6 drafts).
- *Subtracting the noise twice in a replicate* (a modelled correction instead of the measured
  shift) — it subtracts the model's noise, and the model's noise is not the games' (ForgeCoach's
  0.35 overstates what the synthetic matches carry): coverage fell to 25 of 30.
- *Bias-corrected ("basic") intervals* — they correct the estimator's own bias too, so an
  interval could exclude ForgeCoach's estimate; the comparison is between populations of one
  size, where that bias largely cancels.
- *Comparing by non-overlapping intervals, as ForgeCoach's `compareCubes` does* — unpaired and
  conservative; with the same seeds the paired difference is the direct reading.
- *A permutation-null noise (meta.json's optional `noise` block)* — it would make the flatness
  differ from what ForgeCoach shows for a lab meta, which carries no `noise` block.
- *A verdict by default* — the ask is a measurement; a verdict needs a rule written first.
