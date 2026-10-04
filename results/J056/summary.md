# J056 — grader smoke at live budgets (PC summary, 2026-10-04 02:50)

**Verdict: passed, all 5 run checks and 4 pilot checks. Nothing looks wrong.** 250 s, one JVM, peak RSS 0.77 GB.

What was measured: the leaf-score logistic scale refitted on the PC's lab recordings, then 12 decisions from the committed fixture games graded at the live budgets (1.5 s and 3 s).

- **Scale fit:** 600 games, 10,843 end-of-turn rows (8 skipped as rebuilds, 0 unreadable). Scale **351.6, bootstrap 95% interval 312.4–409.8**. The old fixed 400 is just inside the interval. Log loss 0.5845 fitted vs 0.5855 at 400 vs 0.6931 constant, and Brier 0.2011 vs 0.2016. So the refit helps only marginally; the leaf itself carries the signal. The reliability bins track well. The largest gaps are 0.1–0.2 (predicted 0.15, observed 0.10) and 0.9–1.0 (0.95 vs 0.92), so the fit is slightly overconfident at the extremes.
- **1.5 s budget:** 12/12 answered, 0 failed, median 36 rounds. Median interval half-width **0.0034** (max 0.018). 4 options retired by racing in 3 of 12 decisions. p90 wall 1.53 s.
- **3 s budget:** 12/12, median 76 rounds, median half-width **0.0023** (max 0.012). 7 retired in 5 decisions. p90 wall 3.04 s.
- So D348–D351 did what they promised: intervals went from ±0.25–1.0 to well under ±0.02, and racing now drops options. That is a big change, and the cloud may want to check the half-widths are not too narrow (a t interval on the leaf sd, not on game outcomes).

Caveat: the runner restarted (reinstall to d68f5ec) during the run and adopted the unit. That had no visible effect, but the latency numbers were taken while the reinstall happened.
