## D395 — Gate 2's truth tables are read again over every option: pairwise ordering accuracy of each leaf, with a pre-registered rule for a within-decision edge

*Branch `c/rank-and-17lands`.* Adds a reading to D354's gate 2. It does not change REGRET_RULE or
J051's and J081's verdicts.

**2026-10-06** (the outside review of 2026-10-06, §2.1 and recommendation T1)

**Context.** Gate 2 has failed twice. J051 scored v1 at hand − eval +0.0017 [−0.0036, +0.0075] and
J081 scored v2 at −0.0009 [−0.0063, +0.0047]. Both scored only the option each ranker picks. The two
rankers pick the same option on about 75% of the 291 decisions, so the test rests on about 70
discordant decisions.

The review's leading explanation is inferred, not measured: the evaluator's log-loss gain is
between-game signal that cancels inside a decision. The truth and ranker answer files on the PC
(`var/ml/gates/regret/`, `var/ml/gates/regret-v2/`) keep every option's `winRate`, `n` and 95%
interval, so the question can be answered without playing a game.

**Decision.** `tools/ml/regret_rank.py` reads the set, J050's truth, a hand ranker and an eval ranker.
For each decision it uses the options all three share, aliases left out as in
`gate_regret_score.py`. It computes:

- **pairwise ordering accuracy** over every pair whose truth differs: 1 when ordered right, ½ when
  the ranker ties the pair, 0 when it reverses it;
- the same accuracy over the **confident** pairs only (truth difference beyond 1.96 SE);
- **Spearman's rho** and **Kendall's tau-b** against the truth.

Each measure is averaged over decisions. Eval − hand gets a paired bootstrap interval over decisions
(10,000 resamples, seed 20261004).

It also reports:

- the **discordant-only sign test**, plain and for clear differences;
- the truth's **noise**: per-option playouts for the best, active and retired options, per-option
  SE, the share of indistinguishable pairs, the within-decision reliability 1 − mean(se²)/var(truth),
  and each ranker's regret SE;
- everything by stratum and by option count (2, 3–4, 5–8, 9+).

**The rule (RANK_RULE, fixed before any real table was read with it).**

- The evaluator has a **within-decision edge** when mean pairwise accuracy eval − hand has a 95%
  interval whose lower end is above 0, on at least 240 decisions.
- The rule reads **v2 at the rule's 3 rounds**: J081's `regret-v2/rank-eval-3.jsonl` against J050's
  `rank-hand-3.jsonl`.
- v1 (J051's tables) and the 12-round tables are reported without a verdict. The script refuses a
  verdict on tables ranked at other rounds.
- **No edge: the leaf track stays stopped.** No rollout-label nights and no discordance-enriched
  gate 2 (the review's T2).
- **An edge** makes T2 worth posting. It is not gate 2: REGRET_RULE's verdicts stand.

This is the third look at J050's set. It asks a different question (ordering, not the pick) with a
rule written before the run.

**Rejected.**

- *Weighting decisions by their number of pairs.* That would make the nine-option attacks the test.
  Every decision weighs the same, as in the regret score.
- *Correcting the truth for its noise* (disattenuation). The noise is reported beside the numbers
  instead. The confident-pair accuracy is the noise-robust reading.
