id: J020
title: Overnight queue, night 1: recorded normal + bridge drafts across all cubes (decision records on)
public_title: Queue night 1
public_est: ~8 h
cpu: heavy
after: J021
repos: mtg-table@main (with PR #35)
est: one night (stop at 07:30; resumable, nothing is lost)
resumable: yes
max_workers: 7

The first pooled night for the matchup model and the position evaluator. Seeds come from the
D340 lab range only, so none of the ladder's reserved deck sets are touched. Every game records
both seats' views, with decision records.
progress: cubelab-queue var/cubelab/queue night 1
headline: night.drafts, night.games, night.engine_error_rate

## Questions this night answers (pre-registered, decided before any data)
Read them the morning after with `tools/ml/matchup.py train var/cubelab/queue --holdout-cubes all`.
1. **Card signal strength (τ).** If τ ≥ 0.05, nights 2–3 continue card-level work and one
   `design` verification is planned. If τ < 0.03, switch to archetype-level balance and AI work,
   because card precision would cost about 15 nights.
2. **Model vs coin.** The plain model (M0) must beat the coin-flip baseline on held-out drafts,
   with the 95% interval of the difference excluding 0. If it doesn't, report the gap and the games
   per cube. That's the signal to keep collecting, not to tune.
3. **Bridge link.** Bridge games must improve held-out log-loss on the flat cubes (Pauper,
   Peasant, Fair Fight) over in-cube games alone. If they don't, cut the bridge share for night 2.

## Pilot
About 15 minutes; it also measures the real draft rate:
```bash
cd /home/justin-a/code/mtg-table
tools/cubelab.sh queue run --night 1 --drafts 60 --bridge-share 0.2 --chunk 3 --jobs {workers} --record-every 1 --root var/cubelab/queue-pilot
python3 tools/ml/matchup_data.py var/cubelab/queue-pilot --out var/ml/matchup-pilot/games.jsonl --check
node tools/check-redaction.mjs $(ls var/cubelab/queue-pilot/*/*/games/*/g1-seat*.jsonl.gz | head -6)
```
metrics: pilot = cubelab-queue var/cubelab/queue-pilot
check: pilot.drafts >= 50
check: pilot.engine_error_rate <= 2%
check: pilot.recorded_errors == 0
Checks:
- The queue run exits 0 with no "FAILED".
- `--check` prints 0 BAD and at least 50 valid records.
- The redaction checker exits 0.

Record the drafts per hour from the pilot.

## Commands
```bash
tools/cubelab.sh queue plan --night 1 --drafts 20000 --jobs {workers} > var/cubelab/queue-night-1-plan.txt
tools/cubelab.sh queue run --night 1 --drafts 20000 --bridge-share 0.2 --jobs {workers} --record-every 1
```
metrics: night = cubelab-queue var/cubelab/queue night 1
check: night.drafts >= 1000
check: night.engine_error_rate <= 2%
check: night.recorded_errors == 0
20,000 is a ceiling, not a target. If it's still running at 07:30, TERM it: the run is resumable,
and night 2 continues the seeds.

## Abort if
abort: night.games >= 500 and night.engine_error_rate > 2%
abort: night.recorded_errors > 0
- More than 2% of the last 500 `[n/m]` lines show `ENGINE ERROR`.
- More than 5% of games end as timeouts or draws.
- Any "recording" warning, or "SAVED Forge preferences".
- Two consecutive "chunk N FAILED" lines.
- Free disk drops under 20 GB. Recordings are about 180 KB per game.

## Report
- The plan header and the drafts per hour.
- `wc -l var/cubelab/queue/*/*/drafts.jsonl`.
- Counts of engine errors, timeouts and recording warnings.
- `du -sh var/cubelab/queue`.
- Copy queue.json and night-1.json.
- The morning read is a separate job (J021), posted after this one finishes.
