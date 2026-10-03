# J029 — night 1 finished (PC session's plain summary)

**Done at 18:53, in 4 h 13 min of running** (the plan allowed 15 h; this machine is that much faster).

- 20,000 drafts across seven cubes, 19,999 games, every game recorded: fair-fight 1,980, modern-era
  2,111, omega 1,878, pauper 2,555, peasant 3,192, synergy 2,211, vintage 2,073, plus 4,000 "bridge"
  drafts (20%).
- Speed: mean game 4.4 s (median 2.5 s), 19.3 turns; about 4,750 drafts an hour on 7 workers.
- Health: 1 engine error (0.01%), 6 timeouts, 6 draws, 0 memory-pressure events.
- Recordings: 3.6 GB written (165 kB a game); 18 games had recording errors (0.09%, under the 1% rule).
  The redaction pass set aside the logs that failed its check: 822 files are in
  `var/cubelab/queue-quarantine/` (not deleted). That is far more than 18 games' worth, so most of
  them are the rare "revealed card for one frame" case from before the reveal-leak fix (this run was
  pinned to the older commit on purpose, so it could resume). The cloud session should confirm the
  count is what it expects before the evaluator trains on the rest.
- Disk: the queue folder is 3.9 GB; 59 GB free.

What it gives the project: the first large set of recorded AI games, the training data for the
matchup model and the position evaluator, and fresh per-cube win-rate tables.
