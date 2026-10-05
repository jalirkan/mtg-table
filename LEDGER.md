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

## J062 DONE: Morning read of nights 1 and 2: the matchup model on the queue's drafts (exploring drafts left out), with the questions night 1 pre-registered

- finished: 2026-10-05T05:51:13-04:00
- decides: J029's pre-registered questions: card-level vs archetype-level work (tau), matchup model vs coin, keep or cut the bridge share
- hypothesis: -
- rule: J029 "Questions this night answers": tau >= 0.05 card level (+ one design verification), tau < 0.03 archetype level; M0 beats coin with the 95% interval excluding 0; bridge games improve held-out log-loss on the flat cubes, else cut the bridge share; 0.03 <= tau < 0.05 (written 2026-10-04 before the run): keep card-level work, no design verification
- outcome: done
- headline: -
- summary: results/J062/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table c09ddfa
- follow-up: template queue-night-4: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J064 DONE: Omega ratings raise (D360): pre-registered A/B, old vs raised ratings, 2 x 3,000 drafts per arm, best of 3, unrecorded

- finished: 2026-10-05T08:18:51-04:00
- decides: promote cubes/omega-cube-180.ratings-raised.tsv to Omega's default ratings (D360; the rename is Justin's call)
- hypothesis: the raised cards are played much more (~0.39 -> ~0.75 on-colour) without any becoming weak, and balance is no worse
- rule: D360 and the job's "Pre-registered reading": played rate up >= 0.2, no raised card weak (D357 pooled, Holm), matchup_verify.py with A as candidate does not ACCEPT
- outcome: done
- headline: a.drafts 6000, b.drafts 6000, a.engine_error_rate 0, b.engine_error_rate 0.0002
- summary: results/J064/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table f038f4e
- follow-up: template omega-ratings-promote: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J067 FAILED: Evaluator v2 (D364): nights 1-3 dataset, split audit, learning curve (plain vs game-weighted), successive-halving search, gate 1 on v2 and v2 against v1 on the same test pairs

- finished: 2026-10-05T08:19:32-04:00
- decides: (no decides: line in the job file)
- hypothesis: -
- rule: (no rule: line in the job file)
- outcome: failed (pilot: step pilot1 exited 1)
- headline: -
- summary: results/J067/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 58f3fa5

## J068 DONE: Search error analysis: where the search AI loses, by kind, turn, cube and card, judged by gate 2's truth tables (D367)

- finished: 2026-10-05T08:22:24-04:00
- decides: (no decides: line in the job file)
- hypothesis: -
- rule: (no rule: line in the job file)
- outcome: done
- headline: ea.searched 1632, ea.noiseDecisions 1559, ea.truthRows 252, ea.regret_truth_mean 0.0218, ea.ranker_argmax_differ 78, ea.ranker_argmax_harmful 9, ea.lostGames 21
- summary: results/J068/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 9cf9538

## J069 DONE: Evaluator ensemble (D368): train 4 more seeds of night 1's chosen config on the night-1 dataset, check each one's calibration (gate 1, clause C), and write the ensemble manifest the coach helper serves

- finished: 2026-10-05T09:07:45-04:00
- decides: whether the coach's win chance shows an uncertainty band from a 5-model ensemble of evaluator v1 (D368)
- hypothesis: 4 more night-1 seeds give per-position sd small enough to show a useful +/- band, with calibration no worse than one model
- rule: D368's ensemble report (gate_metrics.py ensemble and calib); the band ships only if calibration (gate 1 clause C) holds for the ensemble mean
- outcome: done
- headline: calib.models 4, calib.passing 4, calib.maxEce 0.0137, ens.n 5
- summary: results/J069/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 2ca065f

## J075 DONE: Regenerate ForgeCoach's four cube meta.json files (modern-era, pauper, synergy, vintage) from the queue's plain drafts, with D380's land counts (read-only on the queue)

- finished: 2026-10-05T09:09:03-04:00
- decides: whether ForgeCoach's public/cubes metas are replaced by these four (the cloud session copies them)
- hypothesis: every nonbasic land the builder played now has inDecks > 0 (D380), no key falls outside the cube, and each file rests on 100+ plain drafts
- rule: D380; the final checks below (four files, schema 1, no orphan keys, a land counted in each, 100+ drafts)
- outcome: done
- headline: m.written 4, m.min_drafts 5167
- summary: results/J075/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table af6f817

## J074 DONE: Re-check nights 1 and 2's quarantined recordings with the fixed redaction checker (D371) and restore only the ones that now pass every check

- finished: 2026-10-05T09:10:27-04:00
- decides: (no decides: line in the job file)
- hypothesis: -
- rule: (no rule: line in the job file)
- outcome: done
- headline: n1.nowPass 731, n2.nowPass 640, restored 1371
- summary: results/J074/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table a2480d7

## J071 FAILED: Re-check night 3's quarantined recordings with the fixed redaction checker (D371) and restore only the ones that now pass every check

- finished: 2026-10-05T18:38:49-04:00
- decides: which of night 3's quarantined recordings are false positives, so J061's keep/stop rule and night 4 read quarantines with the D371 checker (J061's rule says so)
- hypothesis: night 3 ran on c09ddfa (before D371), so most of its quarantine is the Gonti / Thief of Sanity false positive and now passes; D352's A3 leak and "own hand card has no name" are the only kinds expected to stay
- rule: none for a verdict: night 4 is not posted if a still-failing kind other than those two appears (night-4 plan, written 2026-10-05 before J061 ran)
- outcome: failed (prepare: step prepare exited 128)
- headline: n3.recordings 704, n3.nowPass 660, restored 660
- summary: results/J071/summary.md (the PC session's; judge it against the rule)

## J072 FAILED: Evolve calibration night (D376, D377): two nothing-changed Omega batches of 8,400 drafts, read by calibrate.ts on both nulls

- finished: 2026-10-05T18:39:06-04:00
- decides: whether the hold on evolve cuts and D360's ratings raise lifts for new D377 folders (D376, D377; the lift itself is Justin's call)
- hypothesis: D377's colour-adjusted null is calibrated on real games: about 0.6 false candidates over 12 discovery-sized slices, against about 3.3 a slice for D331's mean null
- rule: D377 (below, "Pre-registered reading"): calibrated when the colour null's false candidates over the 12 slices are <= 2, each batch's colour dominant-win share at p <= 0.05 is <= 9%, and the pair dispersion is <= 1.5
- outcome: failed (prepare: step prepare exited 128)
- headline: a.drafts 4103, b.drafts 0
- summary: results/J072/summary.md (the PC session's; judge it against the rule)

## J083 FAILED: Evaluator v2 (D364): nights 1-3 dataset, split audit, learning curve (plain vs game-weighted), successive-halving search, gate 1 on v2 and v2 against v1 on the same test pairs

- finished: 2026-10-05T18:39:16-04:00
- decides: whether evaluator v2 (nights 1-3, D364) replaces v1 as the candidate for gate 2 (J081) and the coach's win chance
- hypothesis: three nights of data and the successive-halving search give v2 a lower held-out log-loss than v1 on the same test pairs, and it passes gate 1
- rule: gates.py gate 1 (D354) on v2, and eval_compare.py's paired difference v1 - v2 on the same held-out pairs with its 95% interval excluding 0 (D364)
- outcome: failed (prepare: step prepare exited 128)
- headline: -
- summary: results/J083/summary.md (the PC session's; judge it against the rule)
- follow-up: jobs/J081-gate2-v2.md: on pc-jobs with after: on this job; the runner starts it

## J084 FAILED: Re-check night 3's quarantined recordings with the fixed redaction checker (D371) and restore only the ones that now pass every check

- finished: 2026-10-05T19:00:04-04:00
- decides: which of night 3's quarantined recordings are false positives, so J061's keep/stop rule and night 4 read quarantines with the D371 checker (J061's rule says so)
- hypothesis: night 3 ran on c09ddfa (before D371), so most of its quarantine is the Gonti / Thief of Sanity false positive and now passes; D352's A3 leak and "own hand card has no name" are the only kinds expected to stay
- rule: none for a verdict: night 4 is not posted if a still-failing kind other than those two appears (night-4 plan, written 2026-10-05 before J061 ran)
- outcome: failed (check: left3 == n3.stillFail (left3 = 44, n3.stillFail = 45))
- headline: n3.recordings 45, n3.nowPass 0, restored 0
- summary: results/J084/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table a2480d7
