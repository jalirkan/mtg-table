id: J085
title: Evolve calibration night (D376, D377): two nothing-changed Omega batches of 8,400 drafts, read by calibrate.ts on both nulls
public_title: Evolve calibration night
public_est: ~5 h
cpu: heavy
repos: mtg-table@369f613 (main with D377's colour-adjusted null and calibrate.ts's slices, PR #65)
decides: whether the hold on evolve cuts and D360's ratings raise lifts for new D377 folders (D376, D377; the lift itself is Justin's call)
hypothesis: D377's colour-adjusted null is calibrated on real games: about 0.6 false candidates over 12 discovery-sized slices, against about 3.3 a slice for D331's mean null
rule: D377 (below, "Pre-registered reading"): calibrated when the colour null's false candidates over the 12 slices are <= 2, each batch's colour dominant-win share at p <= 0.05 is <= 9%, and the pair dispersion is <= 1.5
est: ~4.5-5 h on the 9700X (16,800 drafts best of 3; J039 ran 3,400-4,000 drafts an hour on 7 workers), plus a ~3 min pilot
resumable: yes
max_workers: 7
pilot_cores: 2
mem_per_worker_gb: 1.6
timeout: 10h
clean: var/cubelab/runs/j072-a var/cubelab/runs/j072-b var/cubelab/runs/j072-pilot-a var/cubelab/runs/j072-pilot-b
progress: cubelab var/cubelab/runs/j072-a var/cubelab/runs/j072-b
metrics: a = cubelab var/cubelab/runs/j072-a
metrics: b = cubelab var/cubelab/runs/j072-b
headline: a.drafts, b.drafts, c.slice_false_colour_mean, c.slice_false_mean_mean, c.pairs_dispersion

Two Omega v1 batches (J039's generation-1 cube, its ratings, Default vs Default, best of 3,
the lab builder, unrecorded) that differ ONLY in their seeds. Nothing changes between them,
so every evolve candidate either batch produces is a false one. `tools/cubelab/calibrate.ts`
reads them:

- the between-batch dispersion of card, colour and pair win rates against the binomial;
- each batch's design effect;
- evolve's discovery stage on each batch under D331's mean null AND D377's colour-adjusted
  null;
- with `--slice 1400` (J039's plain-draft count per generation), both nulls' discovery on
  each of the 12 disjoint discovery-sized slices;
- the D376 load stamps.

Seeds: D340's verification block, clear of J064's 810,000,001-810,006,000 and its pilot
810,900,001+. Batch A is 820,000,001-820,008,400, batch B 820,100,001-820,108,400, and the
pilot 820,900,001-820,900,016 (A) and 820,900,101-820,900,116 (B).

**Pre-registered reading** (D377, written before any game of this job; read once, after both
batches). D377's colour null is calibrated when all three hold:

1. its false candidates summed over the 12 slices (`c.slice_false_colour_mean × c.slices`)
   are at most 2 (the simulation expects 0.64; P(≥ 3) is 2.7% under a calibrated rule);
2. in each full batch, its dominant-win tests at p ≤ 0.05 are at most 9% of its tests
   (`c.a_colour_win_p05 / c.a_colour_win_tests`, the same for b; nominal 5%);
3. the colour-pair dispersion between the batches (`c.pairs_dispersion`) is at most 1.5.

If all three hold, the hold on evolve cuts lifts for new D377 folders (Justin's call). If one
fails, the hold stays and the failure is written up as a new decision; nothing is tuned on
these numbers. D331's mean-null counts are reported beside them as the contrast
(the simulation expects about 3.3 a slice). The checks below only answer "is it broken";
the verdict is this reading.

## Pilot
Is it broken: 16 drafts a batch at one game a draft, on 2 JVMs, and the reader on them, sliced in two.
```bash
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 16 --games 1 --jobs {workers} --seed 820900001 \
  --out var/cubelab/runs/j072-pilot-a
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 16 --games 1 --jobs {workers} --seed 820900101 \
  --out var/cubelab/runs/j072-pilot-b
node tools/cubelab/calibrate.ts var/cubelab/runs/j072-pilot-a var/cubelab/runs/j072-pilot-b --cube cubes/omega-cube-180.md \
  --pool cubes/omega-seed-pool.tsv --notes cubes/omega-notes.tsv --min-games 5 --slice 8 --json var/cubelab/runs/j072-pilot-calibrate.json
```
metrics: pa = cubelab var/cubelab/runs/j072-pilot-a
metrics: pb = cubelab var/cubelab/runs/j072-pilot-b
metrics: pc = sh: node tools/cubelab/calibrate.ts var/cubelab/runs/j072-pilot-a var/cubelab/runs/j072-pilot-b --cube cubes/omega-cube-180.md --pool cubes/omega-seed-pool.tsv --notes cubes/omega-notes.tsv --min-games 5 --slice 8 --flat
check: pa.drafts == 16
check: pb.drafts == 16
check: pa.engine_errors == 0
check: pb.engine_errors == 0
check: pc.a_drafts == 16
check: pc.b_drafts == 16
check: pc.slices == 4
check: pc.a_load_stamped == 16

## Commands
Each line is resumable (run it again with the same `--out`).
```bash
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 8400 --games 3 --jobs {workers} --seed 820000001 \
  --out var/cubelab/runs/j072-a
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 8400 --games 3 --jobs {workers} --seed 820100001 \
  --out var/cubelab/runs/j072-b
```
cores: 1
```bash
node tools/cubelab/calibrate.ts var/cubelab/runs/j072-a var/cubelab/runs/j072-b --cube cubes/omega-cube-180.md \
  --pool cubes/omega-seed-pool.tsv --notes cubes/omega-notes.tsv --min-games 100 --slice 1400 \
  --json var/cubelab/runs/j072-calibrate.json | tee var/cubelab/runs/j072-calibrate.txt
```
metrics: c = sh: node tools/cubelab/calibrate.ts var/cubelab/runs/j072-a var/cubelab/runs/j072-b --cube cubes/omega-cube-180.md --pool cubes/omega-seed-pool.tsv --notes cubes/omega-notes.tsv --min-games 100 --slice 1400 --flat
check: a.drafts == 8400
check: b.drafts == 8400
check: a.engine_error_rate <= 1%
check: b.engine_error_rate <= 1%
check: c.slices == 12
check: c.a_mean >= 0.45 and c.a_mean <= 0.55
check: c.b_mean >= 0.45 and c.b_mean <= 0.55
check: c.a_deff <= 2
check: c.b_deff <= 2
check: c.a_load_stamped == 8400
check: c.b_load_stamped == 8400
check: c.a_colour_win_tests >= 100
check: c.b_colour_win_tests >= 100

What the checks mean: both batches complete and as clean as J039; the means and design
effects where a batch is sound; every match carries D376's load stamp; 12 discovery-sized
slices were read; and enough cards were tested on the colour null for its per-test rate to
mean something. None of them is the verdict: the reading above is.

## Abort if
abort: a.drafts >= 300 and a.engine_error_rate > 2%
abort: b.drafts >= 300 and b.engine_error_rate > 2%
- More than 5% of games end as timeouts or draws.
- Any "SAVED Forge preferences".
- Free disk under 10 GB.

## Report
collect: var/cubelab/runs/j072-calibrate.json
collect: var/cubelab/runs/j072-calibrate.txt
collect: var/cubelab/runs/j072-pilot-calibrate.json
collect: var/cubelab/runs/j072-a/run.json
collect: var/cubelab/runs/j072-b/run.json

summary.md:
- Drafts, games, engine errors, timeouts and wall time per batch.
- Every check's number beside it.
- The three pre-registered numbers and the verdict: calibrated, or which one failed and by how much.
- The 12 slice lines from `j072-calibrate.txt` verbatim: the false candidates on both nulls,
  named. Note any card that is a false candidate in more than one slice.
- The card, colour and pair dispersion lines, and each batch's load line (busy, load1 per
  core, watchdog timeouts, game-thread CPU share).
- Nothing in the repo or the cubes changes: the hold is lifted, or kept, by Justin.
