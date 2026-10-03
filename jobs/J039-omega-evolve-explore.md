id: J039
title: Omega evolve with exploration on (D356): 4 generations x 2,000 drafts, best of 3, unrecorded
public_title: Omega evolve with exploration
public_est: ~8 h
cpu: heavy
after: J038
repos: mtg-table@main (with D356: branch c/ratings merged)
est: ~6-9 h on the 9700X (4 x 2,000 discovery drafts best of 3, plus up to 4 x 300 confirmation drafts; J009 ran about 1,400 drafts an hour)
resumable: yes
max_workers: 7
mem_per_worker_gb: 1.5
timeout: 16h
clean: var/cubelab/evolve/omega-explore-2000 var/cubelab/evolve/omega-explore-2000-pilot
progress: evolve var/cubelab/evolve/omega-explore-2000 generations 4
metrics: big = evolve var/cubelab/evolve/omega-explore-2000
metrics: ex = sh: node tools/cubelab/explore-health.ts var/cubelab/evolve/omega-explore-2000
headline: big.generations_done, big.drafts, big.engine_error_rate, ex.treated, ex.holds, ex.weak, ex.undecided, ex.too_few

The Omega evolve again, with D356's exploration on, at the size the seed-20001 run's report
asked for (it estimated 1,200-3,400 drafts a generation; that run had 600). A share of 0.3 of
each generation's discovery drafts force one eligible low-rated card into a deck with a recorded
probability; the play and pick rules read every draft's choice decks and the win-rate rules the
other 70% (1,400 plain drafts a generation), so the cut rules mean what they meant. The low-rated
cards are judged in the changelog's pooled table: *holds its own when played*, *weak when
played*, *undecided*, or *too few* forced decks. No verdict cuts a card (Justin's rules: a card
the AI plays badly stays if it is good; his notes override every number). Runs only after J038
passed.

Seeds: discovery 3,000,001-3,008,000 (2,000 a generation); confirmation batches at
4,000,001-4,001,200 (300 apart per generation, D331). Both in the D340 lab range, clear of
20,001-1,020,145 (used), of J038's 5,000,001+ and 6,000,001+, and of the reserved deck-set seeds.
A new `--out`. Unrecorded (no --record flag).

**Pre-registered reading** (D356, decided before any data): the cut rules' verdicts are read as
in J009. The low-rated cards' verdicts are read ONCE, from the changelog's pooled table after
generation 4 (per-generation tables are descriptive). Expected coverage at these settings: about
110 forced decks for Delver of Secrets, 70 for Ephemerate, 40 for a gold card such as Mystic
Snake, and a handful for the rarest, which stay *too few*: report them as such, not as verdicts.

## Pilot
Is it broken: one 30-draft generation at the full settings but one game a draft.
```bash
tools/cubelab.sh evolve cubes/omega-cube-180.md --pool cubes/omega-seed-pool.tsv \
  --generations 1 --drafts-per-gen 30 --games 1 --jobs {workers} --seed 3500001 \
  --out var/cubelab/evolve/omega-explore-2000-pilot --explore on
node tools/cubelab/explore-health.ts var/cubelab/evolve/omega-explore-2000-pilot | tee var/cubelab/evolve/omega-explore-2000-pilot/health.json
grep -q 'Low-rated cards, judged by exploration' var/cubelab/evolve/omega-explore-2000-pilot/changelog.md
```
metrics: pilot = evolve var/cubelab/evolve/omega-explore-2000-pilot
metrics: pex = sh: node tools/cubelab/explore-health.ts var/cubelab/evolve/omega-explore-2000-pilot
check: pilot.generations_done == 1
check: pilot.drafts == 30
check: pilot.engine_errors == 0
check: pex.explore_on == 1
check: pex.explored_drafts between 2 and 20
check: pex.treated >= 2
check: pex.explored_engine_error_rate == 0

## Commands
```bash
tools/cubelab.sh evolve cubes/omega-cube-180.md --pool cubes/omega-seed-pool.tsv \
  --generations 4 --drafts-per-gen 2000 --games 3 --jobs {workers} --seed 3000001 \
  --out var/cubelab/evolve/omega-explore-2000 --explore on
node tools/cubelab/explore-health.ts var/cubelab/evolve/omega-explore-2000 | tee var/cubelab/evolve/omega-explore-2000/health.json
```
Resumable: after a stop, run the same lines again (finished generations are skipped, a started one
resumes its drafts).
check: big.generations_done == 4
check: big.drafts == 8000
check: big.engine_error_rate <= 1%
check: ex.generations_done == 4
check: ex.explored_drafts + ex.plain_drafts == 8000
check: ex.share_z between -4 and 4
check: ex.treated_z between -4 and 4
check: ex.treated >= 3000
check: ex.balance_diff between -2 and 2
check: ex.pooled_delta between -0.15 and 0.10
check: ex.explored_engine_error_rate <= ex.plain_engine_error_rate + 1%
check: ex.explored_timeout_rate <= ex.plain_timeout_rate + 2%
check: ex.plain_deff_max <= 2
check: ex.plain_mean_min >= 0.45 and ex.plain_mean_max <= 0.55
check: ex.limited_median_treated >= 30

What the checks mean: as J038 (D356's "what would show it broken"), plus coverage: the median
rating-limited card got at least 30 forced decks over the four generations (about 75 games).

## Abort if
abort: big.drafts >= 200 and big.engine_error_rate > 1%
abort: ex.explored_drafts >= 200 and ex.explored_engine_error_rate > ex.plain_engine_error_rate + 2%
abort: ex.generations_done >= 1 and (ex.balance_diff > 2 or ex.balance_diff < -2)
abort: ex.generations_done >= 1 and (ex.share_z > 4 or ex.share_z < -4)
- Any generation's decision.discovery.deff over 2.0, or decision.discovery.candidates over 30.
- A swap that is not a note-cut without "confirmed on fresh seeds" in its evidence.
- Free disk under 10 GB.

## Report
collect: var/cubelab/evolve/omega-explore-2000/health.json
collect: var/cubelab/evolve/omega-explore-2000/changelog.md
collect: var/cubelab/evolve/omega-explore-2000/evolve.json
collect: var/cubelab/evolve/omega-explore-2000/gen-*/result.json
collect: var/cubelab/evolve/omega-explore-2000/gen-01/stats.json
collect: var/cubelab/evolve/omega-explore-2000-pilot/health.json

summary.md:
- Per generation: discovery drafts, explored and plain drafts, decisive games (plain), design
  effect, family size, each candidate with its discovery p and q and its confirmation p and Holm
  p, the confirmation batch's size and seeds, and the swaps with their evidence.
- Every health.json number beside its check.
- The changelog's pooled "Low-rated cards, judged by exploration" table as written: how many
  cards hold their own, how many are weak when played, undecided, too few; for each rating-limited
  card of any generation, its forced decks, delta and interval, and verdict. Weak-when-played
  cards are human tests for Justin's notes, never cuts; say so. Do not read a direction into an
  undecided card.
- Totals: discovery and confirmation drafts, wall time, engine errors and timeouts.
