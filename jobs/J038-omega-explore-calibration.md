id: J038
title: Omega exploration calibration (D356): one generation of 400 drafts with --explore on, before J039 (no ratings pass is needed)
public_title: Omega exploration check
public_est: ~40 min
cpu: heavy
repos: mtg-table@main (with D356: branch c/ratings merged)
est: ~30-45 min on the 9700X (400 grid drafts best of 3, plus at most a 300-draft confirmation batch)
resumable: yes
max_workers: 7
mem_per_worker_gb: 1.5
timeout: 3h
clean: var/cubelab/evolve/omega-explore-calib var/cubelab/evolve/omega-explore-calib-pilot
progress: evolve var/cubelab/evolve/omega-explore-calib generations 1
metrics: cal = evolve var/cubelab/evolve/omega-explore-calib
metrics: ex = sh: node tools/cubelab/explore-health.ts var/cubelab/evolve/omega-explore-calib
headline: cal.drafts, ex.explored_drafts, ex.treated, ex.share_z, ex.treated_z, ex.balance_diff, ex.pooled_delta

**Why this job, and why it is not a ratings pass.** The PC's Omega evolve (seed 20001) found
33-40 "rating-limited" cards: the lab's deckbuilder chooses spells by rating, so a low-rated
card (Delver of Secrets 19.7, Ephemerate 22.9) sits in on-colour pools and is never played,
and the loop cannot tell weak from underrated. D356 fixes it without changing any rating: a
seeded share of the discovery drafts (0.3) forces one eligible low-rated card into a deck with
a recorded probability, the old rules read only the evidence they read before (choice decks
for play and pick rates, plain drafts for win rates), and a weighted forced-vs-not comparison
judges each low-rated card. A ratings pass from evidence is a later step (D356 *Later*), so
J038 is instead the experiment's calibration on the engine: one generation at J039's settings,
whose checks are D356's pre-registered "what would show it broken" list. J039 runs only if
this passes.

Seeds: discovery 5,000,001-5,000,400; a confirmation batch, if any, at 6,000,001+. Both are in
the D340 lab range and clear of 20,001-1,020,145 (used), of J039's 3,000,001-3,008,000 and
4,000,001-4,001,200, and of the reserved deck-set seeds. Unrecorded.

## Pilot
Is it broken: the node tests, then a 20-draft generation with exploration on (one game each).
```bash
node --test web/test/cubelab-explore.test.ts web/test/cubelab-evolve.test.ts
tools/cubelab.sh evolve cubes/omega-cube-180.md --pool cubes/omega-seed-pool.tsv \
  --generations 1 --drafts-per-gen 20 --games 1 --jobs {workers} --seed 5100001 \
  --out var/cubelab/evolve/omega-explore-calib-pilot --explore share=0.5
node tools/cubelab/explore-health.ts var/cubelab/evolve/omega-explore-calib-pilot | tee var/cubelab/evolve/omega-explore-calib-pilot/health.json
grep -q 'Low-rated cards, judged by exploration' var/cubelab/evolve/omega-explore-calib-pilot/changelog.md
```
metrics: pilot = evolve var/cubelab/evolve/omega-explore-calib-pilot
metrics: pex = sh: node tools/cubelab/explore-health.ts var/cubelab/evolve/omega-explore-calib-pilot
check: pilot.generations_done == 1
check: pilot.drafts == 20
check: pilot.engine_errors == 0
check: pex.explore_on == 1
check: pex.explored_drafts between 3 and 17
check: pex.treated >= 4
check: pex.explored_engine_error_rate == 0

## Commands
```bash
tools/cubelab.sh evolve cubes/omega-cube-180.md --pool cubes/omega-seed-pool.tsv \
  --generations 1 --drafts-per-gen 400 --games 3 --jobs {workers} --seed 5000001 \
  --out var/cubelab/evolve/omega-explore-calib --explore on
node tools/cubelab/explore-health.ts var/cubelab/evolve/omega-explore-calib | tee var/cubelab/evolve/omega-explore-calib/health.json
```
Resumable: after a stop, run the same lines again (the evolve skips the drafts already played).
check: cal.generations_done == 1
check: cal.drafts == 400
check: cal.engine_error_rate <= 1%
check: ex.explored_drafts + ex.plain_drafts == 400
check: ex.share_z between -4 and 4
check: ex.treated >= 120
check: ex.treated_z between -4 and 4
check: ex.balance_diff between -2 and 2
check: ex.pooled_delta between -0.15 and 0.10
check: ex.explored_engine_error_rate <= ex.plain_engine_error_rate + 2%
check: ex.explored_timeout_rate <= ex.plain_timeout_rate + 2%
check: ex.plain_deff_max <= 2
check: ex.plain_mean_min >= 0.45 and ex.plain_mean_max <= 0.55

What the checks mean (D356): share_z, the explored share against its binomial interval;
treated_z, the forced decks against the sum of their recorded probabilities (the draw and its
bookkeeping); balance_diff, the choice decks' mean rating, forced minus not, in rating points
(the randomisation is random); pooled_delta, every forced card in place of the builder's lowest
choice (outside -0.15..+0.10 the swap breaks decks); the error and timeout rates, explored
drafts against plain ones (a deck Forge cannot play); plain_deff and plain_mean, the plain
drafts' design effect and mean card win rate (the split went right). 400 drafts at share 0.3
should give about 120 explored drafts and 225 forced decks.

## Abort if
abort: cal.drafts >= 100 and cal.engine_error_rate > 2%
- Any "explore: … made an illegal deck" line in the log (the run throws on one).
- Free disk under 10 GB.

## Report
collect: var/cubelab/evolve/omega-explore-calib/health.json
collect: var/cubelab/evolve/omega-explore-calib/changelog.md
collect: var/cubelab/evolve/omega-explore-calib/evolve.json
collect: var/cubelab/evolve/omega-explore-calib/gen-01/result.json
collect: var/cubelab/evolve/omega-explore-calib-pilot/health.json

summary.md: every health.json number beside its check; the explored and plain draft counts;
forced decks against expected; the balance and pooled delta with its interval; the error and
timeout rates split; then the changelog's "Low-rated cards, judged by exploration" table as
written (it is ONE generation, so expect most cards *too few* or *undecided*: say so, and do
not read verdicts from it). Name the rating-limited cards of this generation and how many
forced decks each got, against D356's sizes (Delver about 6 at 400 drafts, a gold card about 2).
If any check failed, J039 must not start: say which, and stop.
