id: J003
title: Search AI vs Forge Default, 400 deals per configuration
cpu: heavy
after: J001
repos: mtg-table@main (ee4d127 or later)
est: ~2.5-3 h with JOBS=7

**Priority (Justin, 2026-10-03):** run this BEFORE the Omega evolve rerun (J004). If your
local chain script queues the evolve first, reorder it: J003 follows the current cube-lab
queue and the pull and build.

If you already started this from Justin's earlier message, don't restart it: let it finish
and report it here.

Use JOBS=7, no more. The search works to a wall-clock budget, so oversubscribing cores
weakens it. Don't run any other heavy job alongside it.

## Pilot
About 10 minutes: 2 deals per pair, control and search only.
```bash
cd /home/justin-a/code/mtg-table && git checkout main && git pull && ./bridge/build.sh && ./tools/ai-bench.sh --selftest
B=tools/ai-bench.sh
$B play --pairs tools/ai-bench/pairs-cube.txt --games 2 --seed 7 --jobs 7 --run pilot-cube-control --a Default --b Default
$B play --pairs tools/ai-bench/pairs-cube.txt --games 2 --seed 7 --jobs 7 --run pilot-cube-search --a Default+search --b Default
```
Checks:
- The selftest passes.
- All 20 + 20 games finish, with 0 crashes, engine errors or "Couldn't map" copier errors.
- Control games take roughly 4–10 s each, and search games roughly 30–60 s each.
- If the output reports a time-budget fallback rate, it is at most 40%.

## Commands
```bash
cd /home/justin-a/code/mtg-table && git checkout main && git pull && ./bridge/build.sh && ./tools/ai-bench.sh --selftest
JOBS=7 S=31 && B=tools/ai-bench.sh && \
$B play --pairs tools/ai-bench/pairs-cube.txt --games 40 --seed $S --jobs $JOBS --run night-cube-control --a Default --b Default && \
$B play --pairs tools/ai-bench/pairs-cube.txt --games 40 --seed $S --jobs $JOBS --run night-cube-search --a Default+search --b Default && \
$B play --pairs tools/ai-bench/pairs-cube.txt --games 40 --seed $S --jobs $JOBS --run night-cube-search3 --a "Default+search:ms=3000,turns=1" --b Default && \
$B play --pairs tools/ai-bench/pairs-sac.txt --games 40 --seed $S --jobs $JOBS --run night-sac-control --a Default+outlets --b Default+outlets && \
$B play --pairs tools/ai-bench/pairs-sac.txt --games 40 --seed $S --jobs $JOBS --run night-sac-search --a Default+outlets+search --b Default+outlets && \
for t in cube-search cube-search3; do $B paired --control var/ai-bench/night-cube-control/shard-*.jsonl --treatment var/ai-bench/night-$t/shard-*.jsonl; done && \
$B paired --control var/ai-bench/night-sac-control/shard-*.jsonl --treatment var/ai-bench/night-sac-search/shard-*.jsonl
```

## Abort if
- More than 1% of games end in an error or crash.
- A run's win rate is exactly 0% or 100% after 50 or more games (something is broken).
- Search games average under 10 s (the search isn't running) or over 120 s.

## Report
- The three `paired` outputs, in full.
- Each run's win rate and number of games.
- The share of searched decisions that fell back to Forge's own answer (the time budget),
  if the output gives it.
- Total wall time, and the load average part-way through.
- Any errors or crashed games.
