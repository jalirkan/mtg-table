id: J113
title: B3, the win chance on human games: Platt recalibration of the frozen r17 evaluator on 17Lands' Powered Cube replays (dev half), tested on the held-out half, with the human/Forge relative slope a coach would need (D415)
public_title: Win chance calibration on human games
public_est: ~30 min
public_decides: Recalibrate the win chance for games against people
cpu: light
cores: 1
repos: mtg-table@cb81721 (main with tools/ml/human_calib.py and D415, #101)
est: ~20-40 min on one core. Pilot ~5 min (the tests ~10 s; a 20 MB range read ~30 s; its rows ~30 s; the script on 84k rows took 15 s in the cloud). Run: both files are already whole in var/ml/17lands from J063 (fetch only checks them; ~1 min if it must download 158 MB); PremierDraft's rows from both sides ~5-8 min (J063: 222-294 s for one side); TradDraft's ~1 min; the calibration with 2,000 refits a side and 2,000 bootstrap resamples ~5-10 min; peak under 2 GB
resumable: no
timeout: 3h
clean: var/ml/17lands/b3-pilot var/ml/17lands/b3-rows-premier var/ml/17lands/b3-rows-trad var/ml/reports/b3-calib.json var/ml/reports/b3-calib.txt var/ml/reports/b3-human-calibration.json var/ml/reports/b3-pilot-calib.json var/ml/reports/b3-pilot-params.json
metrics: disk_gb = sh: df -Pk var/ | awk 'NR==2{print int($4/1048576)}'
metrics: ext = sh: python3 tools/ml/gate_metrics.py ext var/ml/17lands/b3-rows-premier
metrics: trad = sh: python3 tools/ml/gate_metrics.py ext var/ml/17lands/b3-rows-trad
metrics: calib = sh: python3 tools/ml/gate_metrics.py report var/ml/reports/b3-calib.json
headline: calib.summary_pass, calib.summary_delta, calib.summary_slope, calib.summary_relSlope, calib.summary_coachUse
decides: whether ForgeCoach's win chance gets a "human" calibration (the relative human/Forge transform in b3-human-calibration.json) for games against people and the search AI, and in which form (global or per turn band)
hypothesis: J063's reliability table showed the r17 win chance too extreme on human games (fitted slope about 0.82), so a Platt fit on the dev half lowers held-out log-loss; part of that slope is r17's own over-confidence on Forge's games (J063: "0.957" was 0.895), so the relative slope (human / Forge) is expected nearer 1 than the absolute one, and whether its interval excludes 1 is open
rule: D415, human_calib.py CALIB_RULE. Population: PremierDraft's whole file, D359's test half, both perspectives, turn >= 3, final half-turn dropped, share >= 0.5; the r17 evaluator frozen (J063's var/ml/models/r17-vintage-n1.json, sha256 recorded). PASS when log-loss(uncalibrated) - log-loss(global Platt fitted on the dev half) > 0 with the lower end of its 95% percentile interval (2,000 resamples over test games, seed 20261008) above 0, on >= 2,000 games and 10,000 rows; fewer is FAIL (underpowered); a partial download, a sample, one perspective or another file is NO VERDICT. Per-band form only when log-loss(global) - log-loss(bands) has its interval above 0. Coach use = relative only on a PASS with a Forge-side fit of >= 2,000 rows and 20 deck pairs, both slopes positive, and the relative slope's 95% interval excluding 1; else none
followup: morning-read

B3 (Justin's research list, D in `research-retro.md`): calibrate and test the coach's win chance on **real
human games** from 17Lands' replay data, by a rule written before the run.

**Data credit: 17Lands** public datasets, https://www.17lands.com/public_datasets, CC BY 4.0
(https://creativecommons.org/licenses/by/4.0/); filtered and re-encoded. Only the published files are
read (`ext17l.py fetch`, resumed and size-checked); never the API. They stay under `var/` and are never
committed or collected.

**Why the reduced r17 model and not v2.** 17Lands records only an end-of-half-turn snapshot: turn,
play/draw, both life totals, hand sizes, both battlefields as Arena ids, and per-half-turn events.
v2 (D364, `nights-1-3-eval.json`) reads 12,670 numbers made from a decision state.

- Of its 243 board inputs, about 23% can be read exactly, 16% guessed (library, graveyard, untapped
  lands and creatures), and about 60% are missing: P/T, the 24 keyword columns, tapped state,
  counters, exile, the stack, combat and the mana pool.
- 309 of the Powered Cube's 545 cards are outside its 731-card vocabulary.
- D415 has the full column-to-feature table.

A fit on masked inputs would calibrate the mask, not the number the coach shows (D359 rejected the
same). So this job uses the **r17 model J063 examined, frozen**: `var/ml/models/r17-vintage-n1.json`
and its dataset `var/ml/data/r17-vintage-n1`, both still in `var/` from J063. Nothing is retrained. The
pilot fails if either is missing.

**What the script does** (`tools/ml/human_calib.py`; the rule is `CALIB_RULE`, and no flag changes it):

- **Rows.** It rebuilds the 17Lands rows **from both sides** of every position, so the tracker users'
  54% win rate cancels instead of landing in the intercept.
- **Fit.** It fits p' = sigmoid(a + b·logit(p)) on D359's `dev` half: globally, per turn band (3-4,
  5-8, 9-12, 13-16, 17+), and slope-only.
- **Verdict.** It judges the fit on the `test` half: log-loss and ECE, each with an interval over games.
- **Forge side.** It makes the same fit on our own r17 validation split, which gives the **relative**
  transform (slope b_human/b_forge, with an interval from both bootstraps). That is the part a model
  already calibrated on Forge's games (v1/v2, gate 1 ECE 0.006) would need on human games.
- **Descriptive, no verdict:**
  - accuracy and log-loss by turn band against logistic rules on the life, hand-size and board
    differences (fitted on the same dev half);
  - the user's rows alone (their intercept is the skill shift);
  - TradDraft's file, with PremierDraft's fit applied.
- **Output.** `b3-human-calibration.json` holds the transform, both fits, the recommended form and a
  `coach.use` line set by the rule.

A FAIL or a `coach.use: none` is a result, not a failed job. **Nothing in ForgeCoach changes in this
job.** On a PASS with `coach.use: relative`, the cloud session later wires the relative transform into
ForgeCoach's win-chance display for games against people or the search AI.

## Pilot
metrics: numpy_ok = sh: python3 -c "import numpy; print(1)" 2>/dev/null || echo 0
metrics: model_ok = sh: test -s var/ml/models/r17-vintage-n1.json && echo 1 || echo 0
metrics: data_ok = sh: test -s var/ml/data/r17-vintage-n1/stats.json && echo 1 || echo 0
metrics: pext = sh: python3 tools/ml/gate_metrics.py ext var/ml/17lands/b3-pilot/rows
metrics: pcal = sh: python3 tools/ml/gate_metrics.py report var/ml/reports/b3-pilot-calib.json
check: numpy_ok == 1
check: model_ok == 1
check: data_ok == 1
check: disk_gb >= 5
check: pext.written == 1
check: pext.partial == 1
check: pext.q50 >= 1000
check: pcal.summary_written == 1
check: pcal.summary_decided == 0
check: pcal.summary_rows >= 1000
check: pcal.forge_val_rows >= 2000
check: pcal.forge_val_pairs >= 20
check: pcal.summary_forgeSlope > 0
check: pcal.summary_peakGB < 4
About 5 minutes, the whole chain at small size:

- the script's tests and the outside exam's;
- the frozen model and its dataset are where J063 left them (the model's sha256 is printed and is in
  every report);
- a range read of PremierDraft's first 20 MB (about 37,000 games), turned into rows from both sides;
- the calibration on them with the real model and our real validation split.

The calibration must report NO VERDICT, because a partial download is never a verdict. The Forge-side
fit must be usable (>= 2,000 rows, 20 deck pairs, a positive slope), so the coach-use gate is decided by
the data and not by a missing fit.
```bash
python3 -m unittest tools/ml/tests/test_human_calib.py tools/ml/tests/test_outside_exam.py
sha256sum var/ml/models/r17-vintage-n1.json
mkdir -p var/ml/reports var/ml/17lands/b3-pilot
python3 tools/ml/ext17l.py fetch --set powered-premier --dir var/ml/17lands/b3-pilot --max-bytes 20000000
python3 tools/ml/ext17l.py rows var/ml/17lands/b3-pilot/replay_data_public.Cube_-_Powered.PremierDraft.csv.gz \
    --cards var/ml/17lands/b3-pilot/cards.csv --out var/ml/17lands/b3-pilot/rows --perspective both
python3 tools/ml/human_calib.py --model var/ml/models/r17-vintage-n1.json --ext var/ml/17lands/b3-pilot/rows \
    --data var/ml/data/r17-vintage-n1 --report var/ml/reports/b3-pilot-calib.json \
    --params var/ml/reports/b3-pilot-params.json | tail -6
```

## Commands
cores: 1
mem_gb: 4
```bash
mkdir -p var/ml/reports var/ml/17lands
python3 tools/ml/ext17l.py fetch --set powered-premier --dir var/ml/17lands
python3 tools/ml/ext17l.py fetch --set powered-trad --dir var/ml/17lands
python3 tools/ml/ext17l.py rows var/ml/17lands/replay_data_public.Cube_-_Powered.PremierDraft.csv.gz \
    --cards var/ml/17lands/cards.csv --out var/ml/17lands/b3-rows-premier --perspective both
python3 tools/ml/ext17l.py rows var/ml/17lands/replay_data_public.Cube_-_Powered.TradDraft.csv.gz \
    --cards var/ml/17lands/cards.csv --out var/ml/17lands/b3-rows-trad --perspective both
sha256sum var/ml/models/r17-vintage-n1.json
python3 tools/ml/human_calib.py --model var/ml/models/r17-vintage-n1.json --ext var/ml/17lands/b3-rows-premier \
    --data var/ml/data/r17-vintage-n1 --trad var/ml/17lands/b3-rows-trad \
    --report var/ml/reports/b3-calib.json --params var/ml/reports/b3-human-calibration.json \
    | tee var/ml/reports/b3-calib.txt
```
check: ext.written == 1
check: ext.partial == 0
check: ext.games >= 250000
check: trad.written == 1
check: calib.summary_written == 1
check: calib.summary_decided == 1

## Abort if
abort: disk_gb < 3
abort: elapsed_s > 7200
Disk: the replay files are already in `var/ml/17lands` (158 MB) from J063. The new rows are compressed
int16 shards, well under 1 GB. The job stops if `var/` has less than 3 GB free.

## Report
collect: var/ml/reports/b3-calib.txt
collect: var/ml/reports/b3-calib.json
collect: var/ml/reports/b3-human-calibration.json
collect: var/ml/17lands/b3-rows-premier/stats.json
collect: var/ml/reports/b3-pilot-params.json

summary.md, plainly, with the credit line "Human games: 17Lands public datasets, CC BY 4.0" at the top:
- the verdict line (CALIB_RULE, D415): log-loss(uncalibrated) - log-loss(Platt) with its interval, the
  test half's rows and games, and the model's sha256;
- the global fit (intercept, slope with its interval, the temperature-only slope) and the per-band fits;
  the recommended form and why;
- ECE before and after, with intervals, and the reliability tables of the uncalibrated and Platt
  predictions;
- the Forge-side fit (val rows, pairs, slope with its interval, the test split's uncalibrated ECE), the
  relative slope and intercept with intervals, and the `coach.use` line with its reason;
- the turn-band table (accuracy and log-loss) for uncalibrated, Platt, per-band, prior, life, hand, board
  and life+hand+board: where the win chance's edge over the simple rules sits (J063 put it at turns 9-16);
- the user-only rows (their own fit's intercept: the skill shift) and TradDraft with PremierDraft's fit;
- the peak memory and the run time.

Do not refit with other settings or another population. The rule is D415's. A FAIL, or `coach.use:
none`, is the finding.
