id: J012
title: Light coach check: Sonnet vs Haiku on the 28 bench cases, one answer each
cpu: light
repos: mtg-table@main, ForgeCoach@main (2bf68d4 or later)
est: ~12 min (2 × 28 calls)

This replaces J011 and J007 (Justin, 2026-10-03). Coach benchmarking is now light: cloud
models change outside our control, so we check cheaply and only when something changes. The
question this answers: is Haiku good enough, and how much faster is it? This is a rough read,
not a precise comparison: 28 cases with one answer each.

Needs the queueing coach helper up (play.sh from mtg-table main), as for J008.

## Pilot
```bash
cd /home/justin-a/code/ForgeCoach && git checkout main && git pull && npm ci
npm run bench:coach -- --repeat 1 --type mulligan --model claude-haiku-4-5 --label J012-pilot; echo "exit $?"
```
Checks:
- Exit 0, with 0 transport errors.
- The report's model column shows a Haiku model.
- At most 1 format failure, and every answer takes 1–30 s.

## Commands
```bash
npm run bench:coach -- --repeat 1 --label J012-sonnet; echo "exit $?"
npm run bench:coach -- --repeat 1 --model claude-haiku-4-5 --label J012-haiku; echo "exit $?"
npm run bench:coach -- --compare bench/coach/results/<…>-J012-sonnet.json bench/coach/results/<…>-J012-haiku.json
```

## Abort if
- Any "TRANSPORT ERROR", or exit code 3.
- More than 3 retry lines.
- More than 20% format failures in the Haiku run (Haiku isn't following the answer format;
  report it, since that is itself the finding).

## Report
- The `--compare` output.
- A per-type table: Sonnet vs Haiku score, median latency, and format failures.
- A one-line verdict: does Haiku look good enough for routine types, or for all types?
- Copy both .json files to results/J012/.
