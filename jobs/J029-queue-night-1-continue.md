id: J029
title: (J020 again, continues its folder) Overnight queue, night 1: recorded normal + bridge drafts across all cubes (decision records on)
public_title: Queue night 1
public_est: ~8 h
public_cubes: yes
cpu: heavy
repos: mtg-table@bf3dca7 (J020's commit, so the queue resumes its folder; D341 refuses a different code version)
est: ~15 h of drafts, then ~1-2 h of redaction checks (resumable, nothing is lost)
resumable: yes
max_workers: 7

The first pooled night for the matchup model and the position evaluator. Seeds come from the
D340 lab range only, so none of the ladder's reserved deck sets are touched. Every game records
both seats' views, with decision records.
progress: cubelab-queue var/cubelab/queue night 1
headline: night.drafts, night.games, night.engine_error_rate

**Why this is J020 again (2026-10-03 14:45).** J020 aborted after 31 minutes on
`night.recorded_errors > 0`: one game in 1,270 (normal/peasant seed 77, a timeout) reported 2 recording
errors. The rule now allows up to 1% of recorded games, and the redaction pass below quarantines bad logs.
This job continues J020's folder and seeds (`var/cubelab/queue`, night 1): nothing is redone.

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
node tools/check-redaction.mjs $(ls var/cubelab/queue-pilot/*/*/games/*/g1-seat*.jsonl.gz | head -6) || echo "redaction FAIL in the pilot sample (quarantined in the full run, not a pilot failure)"
```
metrics: pilot = cubelab-queue var/cubelab/queue-pilot
check: pilot.drafts >= 50
check: pilot.engine_error_rate <= 2%
check: pilot.recorded_errors <= 0.01 * pilot.recorded_games
Checks:
- The queue run exits 0 with no "FAILED".
- `--check` prints 0 BAD and at least 50 valid records.
- The redaction checker: a FAIL here is reported, not a pilot failure (see "Recordings" below).

Record the drafts per hour from the pilot.

## Commands
```bash
tools/cubelab.sh queue plan --night 1 --drafts 20000 --jobs {workers} > var/cubelab/queue-night-1-plan.txt
timeout -s TERM 15h tools/cubelab.sh queue run --night 1 --drafts 20000 --bridge-share 0.2 --jobs {workers} --record-every 1 || [ $? -eq 124 ]
```
```bash
mkdir -p var/cubelab/queue-quarantine
find var/cubelab/queue -path '*/games/*' -name '*.jsonl.gz' -print0 \
  | xargs -0 -r -n 200 -P {workers} node tools/check-redaction.mjs 2>&1 \
  | awk '$1 == "FAIL" {print $2}' > var/cubelab/queue-quarantine/failed.txt || true
while read -r f; do
  [ -f "$f" ] || continue
  d="var/cubelab/queue-quarantine/${f#var/cubelab/queue/}"; mkdir -p "$(dirname "$d")"; mv "$f" "$d"
done < var/cubelab/queue-quarantine/failed.txt
echo "quarantined $(wc -l < var/cubelab/queue-quarantine/failed.txt) recordings"
```
metrics: night = cubelab-queue var/cubelab/queue night 1
check: night.drafts >= 1000
check: night.engine_error_rate <= 2%
check: night.recorded_errors <= 0.01 * night.recorded_games
20,000 is a ceiling, not a target. The run stops itself after 15 hours (`timeout`, exit 124 is
fine): the queue is resumable, and night 2 continues the seeds.

**Recordings (2026-10-03, after J019).** J019 found one frame in 80 logs where an opponent's
revealed top card was still in `library.cards` in the frame its revealing permanent left play.
That is being fixed in code. Until then this night still records, but the second block checks every
recording with `check-redaction` and moves each failing log into `var/cubelab/queue-quarantine/`
(same relative path; quarantined, never deleted). The matchup model reads `drafts.jsonl` and is
untouched by this; the evaluator only ever sees logs that passed.

## Abort if
abort: night.games >= 500 and night.engine_error_rate > 2%
abort: night.recorded_games >= 500 and night.recorded_errors > 0.01 * night.recorded_games
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
- The quarantine count (`failed.txt`) and its share of all recordings.
- The morning read is a separate job, posted after this one finishes.
collect: var/cubelab/queue-quarantine/failed.txt
