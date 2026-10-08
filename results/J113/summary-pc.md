# J113 — B3, the win chance recalibrated on 17Lands human games (PC summary, 2026-10-08 15:45 EDT)

**Done, exit 0 in 3 minutes, all 6 checks PASS, verdict PASS (`calib.summary_pass 1`), one global fit
(`bands 0`), coach use 0.** Light, one core, 0.46 GB peak. (No `summary.md` from the job; my reading is here;
`b3-calib.txt` is the full table.)

## What it found
- **Data:** 266,117 17Lands Powered Cube games re-encoded as r17 rows; 613,638 rows; split by D359 into a
  calibration half (305,034 rows, 50,801 games) and a held-out test half (308,604 rows, 51,161 games).
- **The frozen r17 model on human positions is already nearly calibrated**: ECE 0.028, log-loss 0.626,
  accuracy 64.0% (turn 1-4 59%, rising to 73% by turn 13-16). Its probabilities are a bit over-confident
  (Platt slope 0.848 [0.825, 0.870], intercept −0.039).
- **The Platt fix PASSES the rule:** log-loss gain on the test half +0.0029 [+0.0023, +0.0035] over games,
  ECE 0.028 → 0.007. Small but certain.
- **Per-turn bands buy nothing:** platt-bands log-loss 0.6232 vs global 0.6233; the slopes do drift from 0.78
  (turn 3-4) to 0.90 (turn 9-12), but the gain is in the fourth decimal. One global fit, as the job decided.
- **Against Forge (our own pair split):** slope 0.954 [0.81, 1.12], i.e. the model is calibrated on Forge games
  and only over-confident on humans; relative slope human/Forge 0.889 [0.748, 1.052].
- Sanity baselines on the same test rows: prior 0.693, life-only 0.680, hand-only 0.692, board-only 0.654;
  the model's 0.623 beats every one.

## My read
Ship the single global Platt (slope 0.848, intercept −0.039) for games against people and the search AI,
as D415 proposes; it costs nothing at run time. The practical effect is tiny: the coach's percentages will sit
a couple of points closer to 50% in lopsided-looking human positions. Not a thing a player will notice; worth
it only because it is free and measurably right.
