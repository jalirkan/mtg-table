# Decision ledger

Written by the lab runner (tools/runner, D366): one entry per job end (done, failed, aborted),
newest last. Each names the decision the job informs, what was expected, the pre-registered
rule, the outcome and its headline numbers. The judgement is the PC session's summary.md,
read against the rule. ledger.jsonl holds the same entries, one JSON object a line.

## J050 DONE: Evaluator gate 2: the decision set and its full-game truth tables (D354), resumable

- finished: 2026-10-04T23:32:21-04:00
- decides: gate 2 of promoting the learned evaluator (D354): the decision set and its truth tables, which J051 scores
- hypothesis: at least 240 of the 300 decisions get full-game truth tables, 80%+ ok, in one night, and D348's guard refuses nothing
- rule: D354 gate 2 data: the final checks (set >= 240, truth ok >= 0.8 x set, refused 0); the verdict is J051's (gates.py REGRET_RULE)
- outcome: done
- headline: set.lines 291, truth.answered 291, truth.ok 291, truth.error 0, truth.playouts 233204
- summary: results/J050/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 7e48088
- follow-up: jobs/J051-regret-gate-score.md: on pc-jobs with after: on this job; the runner starts it
