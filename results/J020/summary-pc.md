# J020 — aborted at 14:29 after 31 minutes (PC session's reading)

The runner aborted the night job on its own rule `abort: night.recorded_errors > 0`.
Measured at the abort: 6 runs, 1,270 drafts, 1,270 games, 0 engine errors, 1 timeout, mean game 5.3 s
(median 3.3 s), 1,270 games recorded at 167 kB a game, about 2,750 drafts an hour on 7 workers.

The two "recorded errors" are ONE game: `normal/peasant` seed 77, game 1 — a game that hit its
TIMEOUT (16 turns, 2,687 frames, 6.5 MB, reason Timeout). Its recording reports `errors: 2`,
`decisionErrors: 0`. Every other recorded game has 0 errors.

Reading: a single timed-out game in 1,270 (0.08%) marks its own recording as bad, and the abort rule
treats any bad recording as fatal, so a 15-hour job died in half an hour. The data so far is fine and is
kept (var/cubelab/queue/ in ~/code/lab/mtg-table). Suggested: quarantine a game whose recording has
errors (the plan's rule 3) and abort only on a rate, e.g. recorded_errors / recorded_games > 1%; and
look at why a timed-out game's recorder reports 2 errors (probably the two seats' logs closed
without their final frame).

The runner moved straight on to J023, so the machine did not go idle.
