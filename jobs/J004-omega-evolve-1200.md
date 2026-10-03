id: J004
title: Omega evolve rerun, 1,200 drafts a generation (Justin's request)
cpu: heavy
after: J005
repos: mtg-table@main
est: ~3-4 h

This is the rerun you already have queued in your chain script. Its command and settings
are unchanged (8 generations, 8 workers, out var/cubelab/evolve/omega-1200); it is listed
here only for its place in the order: after J003.

Before starting, `git pull` mtg-table: main now has `--record-all`. Add it to the evolve
command if evolve accepts it (check `tools/cubelab.sh evolve --help`), so its games are
kept as training data. If evolve doesn't take it, run it as it is and say so. If J005 showed
recording costs more than 30% of wall time, run without it and say so.

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
