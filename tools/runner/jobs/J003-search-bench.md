id: J003
title: Search AI vs Forge Default, 400 deals per configuration
cpu: heavy
after: J001
repos: mtg-table@ee4d127 (pinned; see below)
est: ~2.5-3 h with 7 workers
public_title: Search AI vs Forge Default, 400 deals a configuration
public_est: ~3 h
resumable: no
control: no
max_workers: 7
mem_per_worker_gb: 1.2
timeout: 6h
progress: aibench var/ai-bench/night-* of 2000
metrics: all = aibench var/ai-bench/night-*
metrics: control = aibench var/ai-bench/night-cube-control
metrics: search = aibench var/ai-bench/night-cube-search
metrics: search3 = aibench var/ai-bench/night-cube-search3
metrics: sac_control = aibench var/ai-bench/night-sac-control
metrics: sac_search = aibench var/ai-bench/night-sac-search
headline: control.a_win_rate, search.a_win_rate, search3.a_win_rate, sac_control.a_win_rate, sac_search.a_win_rate, all.games, all.errors, search.fallback_rate
clean: var/ai-bench/night-cube-control var/ai-bench/night-cube-search var/ai-bench/night-cube-search3 var/ai-bench/night-sac-control var/ai-bench/night-sac-search

**Pinned to ee4d127.** A coming change makes ai-bench mirror every deal by default; that
doubles the games and changes this experiment. The runner checks ee4d127 out in its own
clone (`~/code/lab/mtg-table`), so Justin's checkout is never moved.

**Not resumable, no control file.** ai-bench at ee4d127 predates D337: it neither skips
played deals nor reads the pool control file. So a runner restart re-runs the commands from
the top (the `clean:` folders moved aside first), and memory pressure can only stop the job
and retry it with fewer workers. A copy of this job on a main that has D337 could say
`resumable: yes` and drop `control: no`.

`{workers}` is the runner's size for the full run: min(7, cores − 1, budget / pilot peak × 0.85).

## Pilot
About 10 minutes: 2 deals per pair, control and search only.
```bash
./tools/ai-bench.sh --selftest
B=tools/ai-bench.sh
$B play --pairs tools/ai-bench/pairs-cube.txt --games 2 --seed 7 --jobs {workers} --run pilot-cube-control --a Default --b Default
$B play --pairs tools/ai-bench/pairs-cube.txt --games 2 --seed 7 --jobs {workers} --run pilot-cube-search --a Default+search --b Default
```
metrics: control = aibench var/ai-bench/pilot-cube-control
metrics: search = aibench var/ai-bench/pilot-cube-search
check: control.games == 20 and search.games == 20
check: control.errors + control.timeouts + search.errors + search.timeouts == 0
check: control.copier_errors + search.copier_errors == 0
check: control.median_game_s between 4 and 15
check: search.median_game_s between 30 and 60
check: search.fallback_rate <= 40%

(The selftest is the block's first line: under `set -e`, a failing selftest fails the pilot.
The control band is 4–15 s, not 4–10: the 9700X's first pilot measured a median of 11.5 s
with 7 workers and 60-card cube decks, and J003's PC report called that fine.)

## Commands
```bash
S=31 && B=tools/ai-bench.sh
$B play --pairs tools/ai-bench/pairs-cube.txt --games 40 --seed $S --jobs {workers} --run night-cube-control --a Default --b Default
$B play --pairs tools/ai-bench/pairs-cube.txt --games 40 --seed $S --jobs {workers} --run night-cube-search --a Default+search --b Default
$B play --pairs tools/ai-bench/pairs-cube.txt --games 40 --seed $S --jobs {workers} --run night-cube-search3 --a "Default+search:ms=3000,turns=1" --b Default
$B play --pairs tools/ai-bench/pairs-sac.txt --games 40 --seed $S --jobs {workers} --run night-sac-control --a Default+outlets --b Default+outlets
$B play --pairs tools/ai-bench/pairs-sac.txt --games 40 --seed $S --jobs {workers} --run night-sac-search --a Default+outlets+search --b Default+outlets
for t in cube-search cube-search3; do $B paired --control var/ai-bench/night-cube-control/shard-*.jsonl --treatment var/ai-bench/night-$t/shard-*.jsonl | tee var/ai-bench/night-$t/paired.txt; done
$B paired --control var/ai-bench/night-sac-control/shard-*.jsonl --treatment var/ai-bench/night-sac-search/shard-*.jsonl | tee var/ai-bench/night-sac-search/paired.txt
```
check: all.games == 2000
check: all.error_rate <= 1%
check: search.mean_game_s between 10 and 120

## Abort if
abort: all.games >= 100 and all.error_rate > 1%
abort: control.games >= 50 and (control.a_win_rate == 0 or control.a_win_rate == 1)
abort: search.games >= 50 and (search.a_win_rate == 0 or search.a_win_rate == 1)
abort: search.games >= 20 and (search.mean_game_s < 10 or search.mean_game_s > 120)

More than 1% errors, a win rate of exactly 0% or 100% after 50 games, or search games
averaging under 10 s (the search isn't running) or over 120 s.

## Report
collect: var/ai-bench/night-*/report.txt
collect: var/ai-bench/night-*/paired.txt

The PC session writes summary.md from results/J003/: the three `paired` outputs, each run's
win rate and games (metrics.json), the fallback share, the wall time and load (STATUS,
status.json) and any errors.
