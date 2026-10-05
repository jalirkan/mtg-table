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

## J051 DONE: Evaluator gate 2: rank the set with the hand leaf and the evaluator at the live horizon, and score the regret (D354)

- finished: 2026-10-04T23:48:02-04:00
- decides: promote evaluator v1 past gate 2 (D354), and so whether J052's SPRT runs
- hypothesis: the evaluator's leaf has lower regret than the hand leaf at the live horizon, because it beat the hand leaf on held-out log-loss in gate 1 (J060: +0.066 [0.052, 0.079])
- rule: gates.py REGRET_RULE (D354 gate 2): PASS when mean regret(hand) - regret(eval) > 0 and its paired bootstrap 95% interval excludes 0, on >= 240 scored decisions
- outcome: done
- headline: g2.scored 291, g2.regretHand 0.0208, g2.regretEval 0.0192, g2.diffHandMinusEval_estimate 0.0017, g2.diffHandMinusEval_lo -0.0036, g2.pass 0
- summary: results/J051/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 7e48088
- follow-up: jobs/J052-evaluator-sprt.md: on pc-jobs with after: on this job; the runner starts it

## J052 FAILED: Evaluator gate 3: SPRT search-v1-fixed3 with the evaluator's leaves vs search-v1-fixed3 (D354)

- finished: 2026-10-04T23:51:46-04:00
- decides: whether search-v1-fixed3 with the evaluator's leaves becomes a league candidate (D354 gate 3, then D321's league)
- hypothesis: evaluator leaves beat the hand leaf in games by at least the SPRT's elo1 of 20
- rule: gates.py SPRT_RULE (D354 gate 3): elo0 0, elo1 20, alpha = beta = 0.05, at most 2,400 games; H1 = PASS; H0 or inconclusive = FAIL
- outcome: failed (pilot: g2.pass == 1 (g2.pass = 0))
- headline: sprt_games 0, all.games 1544, all.errors 0, all.timeouts 9
- summary: results/J052/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 7e48088
- follow-up: template league-candidate: not due (the job did not finish done)

## J061 DONE: Overnight queue, night 3: recorded drafts with play exploration in 15% of drafts (D358)

- finished: 2026-10-05T04:29:24-04:00
- decides: whether D358's play exploration stays on at 15% for night 4, given its cost in draft rate, recording size and quarantined recordings
- hypothesis: exploring drafts record larger logs (up to ~1 MB a game) and the night still keeps engine errors <= 2% and recording errors <= 1%; redaction quarantines close to nothing
- rule: written 2026-10-04 before the run: keep exploration at 15% for night 4 if the draft rate falls by <= 25% vs night 2, recordings grow by <= 2.5x per game, engine errors <= 2% and recording errors <= 1%; otherwise halve the share (7.5%). Quarantines are judged with the D371 checker (re-run J074's tool on night 3), not the pinned one. Readings fixed 2026-10-05 before the run: "draft rate" is night 3's own drafts per hour against night 2's uncontended 4,850/h (not its 3,030/h average, which J060 slowed); "recordings grow" is night 3's mean recorded bytes per game against night 2's 168.1 kB (halve above 420 kB); all counts are night 3's own, not the runner's cumulative night totals; quarantines are judged by J071
- outcome: done
- headline: night.drafts 60000, night.games 59997, night.engine_error_rate 0.0001
- summary: results/J061/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table c09ddfa
- follow-up: template matchup-read-night-3: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J063 DONE: Outside exam (D359): a reduced r17 evaluator trained on night 1's Vintage-cube games, scored on 17Lands' Powered Cube human games against simple rules

- finished: 2026-10-05T05:23:31-04:00
- decides: whether the learned evaluator's win chance may be presented as transferring to human play (D361's coach win chance), or only as a model of Forge's games
- hypothesis: the r17 evaluator beats the best simple rule on 17Lands' human games, by less than on our data (a transfer gap)
- rule: outside_exam.py EXAM_RULE (D359): PASS when log-loss(b*) - log-loss(eval) > 0 with the 95% interval's lower end above 0, on >= 2,000 games and 10,000 rows; else FAIL; partial data = NO VERDICT
- outcome: done
- headline: ds.rows 85436, ds.games 5996, ext.testUserRows 154302, exam.decided 1, exam.pass 1
- summary: results/J063/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table c2a28ef
