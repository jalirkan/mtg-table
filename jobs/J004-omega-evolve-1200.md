id: J004
title: Omega evolve rerun, 1,200 drafts a generation (Justin's request)
cpu: heavy
after: J003
repos: mtg-table@main
est: ~3-4 h

This is the rerun you already have queued in your chain script. Its command and settings
are unchanged (8 generations, 8 workers, out var/cubelab/evolve/omega-1200); it is listed
here only for its place in the order: after J003.

Before starting, `git pull` mtg-table. If main then has the lab-record change (search
DECISIONS.md for "record every game", or `tools/cubelab.sh run --help` for `--record-all`),
add `--record-all` to the evolve command so its games are kept as training data. If it isn't
there, run it as it is.

## Pilot
Run evolve with 1 generation of 50 drafts into var/cubelab/evolve/omega-pilot.
Checks:
- 0 engine errors.
- Every match plays its games.
- A generation summary is printed.

## Abort if
- More than 1% of matches end in an engine error.
- Any generation reports "insufficient data" at 1,200 drafts.

## Report
- The final evolve report: cuts and adds, with their evidence.
- The number of games played, and the number of engine errors.
- Whether `--record-all` was used.
