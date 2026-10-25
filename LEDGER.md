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

## J086 FAILED: Evaluator v2 (D364): nights 1-3 dataset, split audit, learning curve (plain vs game-weighted), successive-halving search, gate 1 on v2 and v2 against v1 on the same test pairs

- finished: 2026-10-05T19:01:20-04:00
- decides: whether evaluator v2 (nights 1-3, D364) replaces v1 as the candidate for gate 2 (J081) and the coach's win chance
- hypothesis: three nights of data and the successive-halving search give v2 a lower held-out log-loss than v1 on the same test pairs, and it passes gate 1
- rule: gates.py gate 1 (D354) on v2, and eval_compare.py's paired difference v1 - v2 on the same held-out pairs with its 95% interval excluding 0 (D364)
- outcome: failed (pilot: step pilot1 exited 2)
- headline: -
- summary: results/J086/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table ef7e73f
- follow-up: jobs/J081-gate2-v2.md: on pc-jobs with after: on this job; the runner starts it

## J088 FAILED: Collect the messages of night 3's still-quarantined recordings (the one M55 failure and the stray non-recording file), so a person can judge night 4's stop row

- finished: 2026-10-05T20:05:57-04:00
- decides: (no decides: line in the job file)
- hypothesis: -
- rule: (no rule: line in the job file)
- outcome: failed (pilot: step pilot1 exited 1)
- headline: gz 0
- summary: results/J088/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table a2480d7

## J090 FAILED: Collect the messages of night 3's still-quarantined recordings (the one M55 failure and the stray non-recording file), so a person can judge night 4's stop row

- finished: 2026-10-05T21:17:41-04:00
- decides: (no decides: line in the job file)
- hypothesis: -
- rule: (no rule: line in the job file)
- outcome: failed (step run1 exited 2)
- headline: gz 0
- summary: results/J090/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table a2480d7

## J085 FAILED: Evolve calibration night (D376, D377): two nothing-changed Omega batches of 8,400 drafts, read by calibrate.ts on both nulls

- finished: 2026-10-05T22:00:55-04:00
- decides: whether the hold on evolve cuts and D360's ratings raise lifts for new D377 folders (D376, D377; the lift itself is Justin's call)
- hypothesis: D377's colour-adjusted null is calibrated on real games: about 0.6 false candidates over 12 discovery-sized slices, against about 3.3 a slice for D331's mean null
- rule: D377 (below, "Pre-registered reading"): calibrated when the colour null's false candidates over the 12 slices are <= 2, each batch's colour dominant-win share at p <= 0.05 is <= 9%, and the pair dispersion is <= 1.5
- outcome: failed (check: c.slices == 12 (c.slices is missing); c.a_mean >= 0.45 and c.a_mean <= 0.55 (c.a_mean is missing); c.b_mean >= 0.45 and c.b_mean <= 0.55 (c.b_mean is missing); c.a_deff <= 2 (c.a_deff is missing); c.b_deff <= 2 (c.b_deff is missing); c.a_load_stamped == 8400 (c.a_load_stamped is missing); c.b_load_stamped == 8400 (c.b_load_stamped is missing); c.a_colour_win_tests >= 100 (c.a_colour_win_tests is missing); c.b_colour_win_tests >= 100 (c.b_colour_win_tests is missing))
- headline: a.drafts 8400, b.drafts 8400
- summary: results/J085/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 369f613

## J091 DONE: Collect the messages of night 3's still-quarantined recordings (the one M55 failure and the stray non-recording file), so a person can judge night 4's stop row

- finished: 2026-10-05T22:04:58-04:00
- decides: (no decides: line in the job file)
- hypothesis: -
- rule: (no rule: line in the job file)
- outcome: done
- headline: gz 44
- summary: results/J091/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table a2480d7

## J087 FAILED: Evaluator v2 (D364): nights 1-3 dataset, split audit, learning curve (plain vs game-weighted), successive-halving search, gate 1 on v2 and v2 against v1 on the same test pairs

- finished: 2026-10-05T23:38:26-04:00
- decides: whether evaluator v2 (nights 1-3, D364) replaces v1 as the candidate for gate 2 (J081) and the coach's win chance
- hypothesis: three nights of data and the successive-halving search give v2 a lower held-out log-loss than v1 on the same test pairs, and it passes gate 1
- rule: gates.py gate 1 (D354) on v2, and eval_compare.py's paired difference v1 - v2 on the same held-out pairs with its 95% interval excluding 0 (D364)
- outcome: failed (step run2 exited 1)
- headline: ds.rows 19517006, ds.games 119816, audit.pass 1
- summary: results/J087/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table ef7e73f
- follow-up: jobs/J081-gate2-v2.md: on pc-jobs with after: on this job; the runner starts it

## J082 FAILED: Overnight queue, night 4: recorded drafts with D375's AI profile mix, play exploration at 0.15, bridge share 0.2 (card-level allocation from J062 power.tsv)

- finished: 2026-10-05T23:43:06-04:00
- decides: whether night 5 keeps D375's profile mix and this night's exploration share (D358); its drafts and recordings feed the matchup read of nights 1-4 and the evaluator
- hypothesis: with the mix (Default 0.5, Reckless 0.25, Cautious 0.25) the night keeps engine errors <= 2% and recording errors <= 1%; games with a Reckless or Cautious seat take <= 1.5x the time of Default-vs-Default games and end in a timeout or draw <= 5% of the time; the D371 checker quarantines <= 0.5% of recordings
- rule: written 2026-10-05 before the run, read on this night's own numbers (night-4.json below, not the runner's cumulative totals). Profile mix: keep it for night 5 if the games with a non-Default seat have timeouts + draws <= 5% for each profile, mean game time <= 1.5x the same night's Default-vs-Default games, and the night's engine errors <= 2% and recording errors <= 1%; otherwise night 5 plays Default vs Default and the cause is written up as a decision. Exploration: keep this night's share for night 5 if share x (exploring / plain mean game time - 1) <= 0.25, the night's mean recorded bytes per game <= 2.5x its plain games', and the same error limits hold; otherwise halve it. Both are measured inside this night, where the mix and exploration are each assigned by seed, so neither confounds the other
- outcome: failed (pilot: rq3.written == 1 and rq3.newKinds == 0 (rq3.written = 1, rq3.newKinds = 3))
- headline: night.night_drafts_done 0, night.planned_drafts 0, night.bridge_share 0, quarantined 0
- summary: results/J082/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table ef7e73f
- follow-up: template matchup-read-nights-1-4: not due (the job did not finish done)
- follow-up: template design-verify: not due (the job did not finish done)

## J092 DONE: Evaluator v2 (D364): nights 1-3 dataset, split audit, learning curve (plain vs game-weighted), successive-halving search, gate 1 on v2 and v2 against v1 on the same test pairs

- finished: 2026-10-06T04:49:30-04:00
- decides: whether evaluator v2 (nights 1-3, D364) replaces v1 as the candidate for gate 2 (J081) and the coach's win chance
- hypothesis: three nights of data and the successive-halving search give v2 a lower held-out log-loss than v1 on the same test pairs, and it passes gate 1
- rule: gates.py gate 1 (D354) on v2, and eval_compare.py's paired difference v1 - v2 on the same held-out pairs with its 95% interval excluding 0 (D364)
- outcome: done
- headline: ds.rows 19517006, ds.games 119816, audit.pass 1, fit.pass 1, cmp.better 1
- summary: results/J092/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table ef7e73f
- follow-up: jobs/J081-gate2-v2.md: on pc-jobs with after: on this job; the runner starts it

## J081 DONE: Evaluator gate 2 on v2 (D354): rank J050's set with evaluator v2 at the live horizon and score it against J050's truth tables, no new truth

- finished: 2026-10-06T04:59:00-04:00
- decides: promote evaluator v2 (J067's var/ml/models/nights-1-3-eval.json) past gate 2 (D354), and so whether a gate-3 SPRT on v2 is posted
- hypothesis: v2's leaf has lower regret than the hand leaf at the live horizon; expected small, since v1 scored only +0.0017 [-0.0036, +0.0075] on this set (J051) and v2 is the same kind of model trained on about three times the data
- rule: gates.py REGRET_RULE (D354 gate 2), unchanged: PASS when mean regret(hand) - regret(eval) > 0 and its paired bootstrap 95% interval (10,000 resamples of decisions, seed 20261004) excludes 0, on >= 240 scored decisions; worded by D372's reporting rule (REGRET_REPORT, MDE 0.015): a FAIL whose interval reaches 0.015 is "underpowered, not 'no gain'", a FAIL whose interval ends below 0.015 "rules out a gain of 0.015 or more", never "no gain"
- outcome: done
- headline: g2.scored 291, g2.regretHand 0.0208, g2.regretEval 0.0217, g2.diffHandMinusEval_estimate -0.0009, g2.diffHandMinusEval_lo -0.0063, g2.diffHandMinusEval_hi 0.0047, power.realisedMde 0.0077, g2.pass 0
- summary: results/J081/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 7e48088

## J070 FAILED: Move queue nights 1 and 2 to the cold drive: one verified tar.zst a key folder plus each night's quarantine folder, on /mnt/e/forgecoach-archive, then free the hot disk (D378)

- finished: 2026-10-06T04:59:58-04:00
- decides: whether nights 1-2 move to the cold tier on /mnt/e (D378), freeing ~7.7 GB on the system drive
- hypothesis: every member verifies by SHA-256 before deletion and the archives are ~5x smaller than gzip
- rule: D378's refusals and the job's checks; any verify mismatch stops the job with nothing deleted
- outcome: failed (pilot: step pilot1 exited 3)
- headline: -
- summary: results/J070/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 061af76

## J093 FAILED: Overnight queue, night 4: recorded drafts with D375's AI profile mix, play exploration at 0.15, bridge share 0.2 (card-level allocation from J062 power.tsv)

- finished: 2026-10-06T05:00:56-04:00
- decides: whether night 5 keeps D375's profile mix and this night's exploration share (D358); its drafts and recordings feed the matchup read of nights 1-4 and the evaluator
- hypothesis: with the mix (Default 0.5, Reckless 0.25, Cautious 0.25) the night keeps engine errors <= 2% and recording errors <= 1%; games with a Reckless or Cautious seat take <= 1.5x the time of Default-vs-Default games and end in a timeout or draw <= 5% of the time; the D371 checker quarantines <= 0.5% of recordings
- rule: written 2026-10-05 before the run, read on this night's own numbers (night-4.json below, not the runner's cumulative totals). Profile mix: keep it for night 5 if the games with a non-Default seat have timeouts + draws <= 5% for each profile, mean game time <= 1.5x the same night's Default-vs-Default games, and the night's engine errors <= 2% and recording errors <= 1%; otherwise night 5 plays Default vs Default and the cause is written up as a decision. Exploration: keep this night's share for night 5 if share x (exploring / plain mean game time - 1) <= 0.25, the night's mean recorded bytes per game <= 2.5x its plain games', and the same error limits hold; otherwise halve it. Both are measured inside this night, where the mix and exploration are each assigned by seed, so neither confounds the other
- outcome: failed (step run1 exited 1)
- headline: night.night_drafts_done 0, night.planned_drafts 0, night.bridge_share 0, quarantined 0
- summary: results/J093/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table ef7e73f
- follow-up: template matchup-read-nights-1-4: not due (the job did not finish done)
- follow-up: template design-verify: not due (the job did not finish done)

## J094 DONE: Extract the one M55 failure (night 3, modern-era+omega game 354 g1 seat 1, decision 58 names land:99) so its cause can be found

- finished: 2026-10-06T05:00:56-04:00
- decides: (no decides: line in the job file)
- hypothesis: -
- rule: (no rule: line in the job file)
- outcome: done
- headline: written 1
- summary: results/J094/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table a2480d7

## J095 DONE: The M55 recording's frames in full: where card 99 is (or is not) in the state frames of decisions 55, 58, 60 and 63

- finished: 2026-10-06T06:08:13-04:00
- decides: (no decides: line in the job file)
- hypothesis: -
- rule: (no rule: line in the job file)
- outcome: done
- headline: written 1
- summary: results/J095/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table a2480d7

## J096 FAILED: Overnight queue, night 4: recorded drafts with D375's AI profile mix, play exploration at 0.15, bridge share 0.2 (card-level allocation from J062 power.tsv)

- finished: 2026-10-06T06:08:13-04:00
- decides: whether night 5 keeps D375's profile mix and this night's exploration share (D358); its drafts and recordings feed the matchup read of nights 1-4 and the evaluator
- hypothesis: with the mix (Default 0.5, Reckless 0.25, Cautious 0.25) the night keeps engine errors <= 2% and recording errors <= 1%; games with a Reckless or Cautious seat take <= 1.5x the time of Default-vs-Default games and end in a timeout or draw <= 5% of the time; the D371 checker quarantines <= 0.5% of recordings
- rule: written 2026-10-05 before the run, read on this night's own numbers (night-4.json below, not the runner's cumulative totals). Profile mix: keep it for night 5 if the games with a non-Default seat have timeouts + draws <= 5% for each profile, mean game time <= 1.5x the same night's Default-vs-Default games, and the night's engine errors <= 2% and recording errors <= 1%; otherwise night 5 plays Default vs Default and the cause is written up as a decision. Exploration: keep this night's share for night 5 if share x (exploring / plain mean game time - 1) <= 0.25, the night's mean recorded bytes per game <= 2.5x its plain games', and the same error limits hold; otherwise halve it. Both are measured inside this night, where the mix and exploration are each assigned by seed, so neither confounds the other
- outcome: failed (step run1 exited 1)
- headline: night.night_drafts_done 0, night.planned_drafts 0, night.bridge_share 0, quarantined 0
- summary: results/J096/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table ef7e73f
- follow-up: template matchup-read-nights-1-4: not due (the job did not finish done)
- follow-up: template design-verify: not due (the job did not finish done)

## J097 FAILED: Gate 2's truth read over every option (D395): pairwise ordering accuracy, rank correlations and a discordant sign test for the hand leaf against evaluators v1 and v2 on J050's truth tables; no playouts

- finished: 2026-10-06T08:06:29-04:00
- decides: whether the evaluator-as-leaf track restarts (the outside review's T2, a discordance-enriched gate 2) or stays stopped
- hypothesis: v2's leaf orders a decision's options no better than the hand leaf (the outside review, section 2.1: the evaluator's log-loss gain is mostly between-game signal, which cancels inside a decision)
- rule: D395 RANK_RULE (regret_rank.py), written before any real table was read with it: the evaluator has a within-decision edge when the mean over decisions of pairwise ordering accuracy, eval minus hand, has a 95% paired bootstrap interval (10,000 resamples of decisions, seed 20261004) whose lower end is above 0, on >= 240 decisions; read on v2 at 3 rounds (J081's regret-v2/rank-eval-3.jsonl against J050's rank-hand-3.jsonl); v1 and the 12-round tables are reported without a verdict. No edge: the leaf track stays stopped (no rollout-label nights, no T2). An edge: T2 is worth posting; REGRET_RULE's gate-2 FAILs stand either way
- outcome: failed (pilot: inp.truth == 291 and inp.hand3 == 291 and inp.hand12 == 291 (inp.truth = 291, inp.hand3 = 344))
- headline: -
- summary: results/J097/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table fd1c91d

## J098 DONE: The lab's card strengths against human results (D396): J062's M0 power and the Vintage meta win rates against 17Lands' Powered Cube GIH WR, by Spearman with a bootstrap interval, the biggest disagreements and colour groups; no Forge

- finished: 2026-10-06T08:07:03-04:00
- decides: whether the lab's card ratings may be presented to a human drafter (ForgeCoach's deck assistant) as more than "strength in Forge's hands", and which of M0 power and the per-cube meta win rate is the better guide
- hypothesis: the lab's M0 card power ranks the Vintage cube's cards only weakly like human GIH WR (Forge is the only pilot), and Forge rates aggressive cards (red, cheap creatures) above where humans do
- rule: D396 CARDS_RULE (cards17l.py), written before any real data was compared: on nonland Vintage-cube cards with >= 500 human GIH games (PremierDraft, AI-limited cards out), Spearman(power, GIH WR) with a 2,000-resample bootstrap over cards: AGREES when rho >= 0.5 and the 95% interval's lower end > 0.3, WEAK when the lower end > 0 but not that, NONE otherwise; Forge OVERRATES (UNDERRATES) a group when mean z(lab) - z(human) has a 95% interval above (below) 0, read for the pre-registered groups red and cheap creatures (mana value <= 2); everything else (meta win rate, GP WR, IWD, other colours, TradDraft pooled) is reported without a verdict
- outcome: done
- headline: p.compared 147, p.nonland 126, p.rho 0.2946, p.lo 0.1375, p.hi 0.4388, p.reading 1, p.R_mean -0.7364, p.cheapCreature_mean -0.3475
- summary: results/J098/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table fd1c91d

## J100 DONE: Gate 2's truth read over every option (D395): pairwise ordering accuracy, rank correlations and a discordant sign test for the hand leaf against evaluators v1 and v2 on J050's truth tables; no playouts

- finished: 2026-10-06T08:31:29-04:00
- decides: whether the evaluator-as-leaf track restarts (the outside review's T2, a discordance-enriched gate 2) or stays stopped
- hypothesis: v2's leaf orders a decision's options no better than the hand leaf (the outside review, section 2.1: the evaluator's log-loss gain is mostly between-game signal, which cancels inside a decision)
- rule: D395 RANK_RULE (regret_rank.py), written before any real table was read with it: the evaluator has a within-decision edge when the mean over decisions of pairwise ordering accuracy, eval minus hand, has a 95% paired bootstrap interval (10,000 resamples of decisions, seed 20261004) whose lower end is above 0, on >= 240 decisions; read on v2 at 3 rounds (J081's regret-v2/rank-eval-3.jsonl against J050's rank-hand-3.jsonl); v1 and the 12-round tables are reported without a verdict. No edge: the leaf track stays stopped (no rollout-label nights, no T2). An edge: T2 is worth posting; REGRET_RULE's gate-2 FAILs stand either way
- outcome: done
- headline: r2.decisions 291, r2.pairwise_hand 0.7114, r2.pairwise_eval 0.6803, r2.pairwise_diff_estimate -0.0311, r2.pairwise_diff_lo -0.0673, r2.pairwise_diff_hi 0.004, r2.sign_discordant 70, r2.edge 0
- summary: results/J100/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table fd1c91d

## J099 DONE: Overnight queue, night 4: recorded drafts with D375's AI profile mix, play exploration at 0.15, bridge share 0.2 (card-level allocation from J062 power.tsv)

- finished: 2026-10-06T16:24:13-04:00
- decides: whether night 5 keeps D375's profile mix and this night's exploration share (D358); its drafts and recordings feed the matchup read of nights 1-4 and the evaluator
- hypothesis: with the mix (Default 0.5, Reckless 0.25, Cautious 0.25) the night keeps engine errors <= 2% and recording errors <= 1%; games with a Reckless or Cautious seat take <= 1.5x the time of Default-vs-Default games and end in a timeout or draw <= 5% of the time; the D371 checker quarantines <= 0.5% of recordings
- rule: written 2026-10-05 before the run, read on this night's own numbers (night-4.json below, not the runner's cumulative totals). Profile mix: keep it for night 5 if the games with a non-Default seat have timeouts + draws <= 5% for each profile, mean game time <= 1.5x the same night's Default-vs-Default games, and the night's engine errors <= 2% and recording errors <= 1%; otherwise night 5 plays Default vs Default and the cause is written up as a decision. Exploration: keep this night's share for night 5 if share x (exploring / plain mean game time - 1) <= 0.25, the night's mean recorded bytes per game <= 2.5x its plain games', and the same error limits hold; otherwise halve it. Both are measured inside this night, where the mix and exploration are each assigned by seed, so neither confounds the other
- outcome: done
- headline: night.night_drafts_done 38000, night.planned_drafts 38000, night.bridge_share 0.2, ns.engine_error_rate 0.0002, ns.mixed_time_ratio 0.9566, quarantined 82
- summary: results/J099/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 74c1360
- follow-up: template matchup-read-nights-1-4: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages
- follow-up: template design-verify: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J101 DONE: Reckless baseline (the outside review's T5): SPRT forge-reckless vs forge-default; SPRT search-v1-reckless vs search-v1; fixed 1,200-game matches of search-v1-reckless and search-v1 against forge-default on the same deals

- finished: 2026-10-06T21:09:10-04:00
- decides: whether ForgeCoach's Play vs Forge should default to Forge's Reckless profile as the stronger opponent, and whether the search should sit on Reckless instead of Default
- hypothesis: Reckless beats Default in cube games (D311: 60-40 over 100 paired games, paired p = 0.004, about +70 Elo), and the gain carries over when the search sits on Reckless
- rule: written 2026-10-06 before the run. (A) Play vs Forge's default profile: SPRT forge-reckless vs forge-default (elo0 0, elo1 20, alpha = beta = 0.05, at most 4,000 games, mirrored deals on the confirm set). H1 -> Reckless becomes the default opponent; H0 or inconclusive -> Default stays. (C) The search's base: SPRT search-v1-reckless vs search-v1 (same parameters, at most 3,000 games). H1 -> the next search version sits on Reckless; H0 or inconclusive -> it stays on Default. (B) The two fixed matches (search-v1-reckless vs forge-default and search-v1 vs forge-default, 1,200 games each on the same deals) are reported as scores with 95% intervals and carry no verdict. They size what the search adds on each base, against the one opponent the ladder's scale is anchored to. H0 reads "not shown >= 20 Elo better", never "no gain"
- outcome: done
- headline: sa.games 808, sa.score 0.501, sc.games 392, sc.score 0.487, mr.score 0.6233, mr.elo 87.5, md.score 0.6033, md.elo 72.9
- summary: results/J101/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table c9ae213
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J102 DONE: Anytime search, fixed measurement: 2,400 games (1,200 mirrored pairs) of search-v1-anytime vs search-v1 at the live 1.5 s budget, score with a 95% interval in Elo and each side's budget-fallback rate (replaces the withdrawn J089)

- finished: 2026-10-07T03:44:22-04:00
- decides: whether the anytime search (D388, anytime=1) becomes search-v1's default loop in the next search version
- hypothesis: keeping cut rounds, pruning to the budget and racing turn most of the searched decisions that fell back on budget (18.5% on the week-3 smoke, 11.7% on a larger dev run) into verdicts; the outside review puts the gain at about 10-13 Elo at best
- rule: written 2026-10-06 before the run, read from var/ai-ladder/match-J102.json: ADOPT anytime=1 as the default loop if (a) the match is complete (all 2,400 games), (b) the 95% interval on search-v1-anytime's score against search-v1 has its lower end above 0.5 (above 0 Elo), and (c) the budget-fallback rate falls: search-v1-anytime's 95% upper end is below search-v1's 95% lower end (both game-clustered). Otherwise NO VERDICT: report the score and Elo with the interval, and both fallback rates, and keep D312's loop as the default; an interval that includes 0 is "not shown", never "no gain"
- outcome: done
- headline: m.played 2400, m.score 0.5133, m.lo 0.5036, m.hi 0.523, m.elo 9.3, m.eloLo 2.5, m.eloHi 16, m.aSearch.budgetRate 0.0071, m.bSearch.budgetRate 0.0561
- summary: results/J102/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table c9ae213
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J103 FAILED: Overnight queue, night 5: night 4's design and settings as J099's rule chose them (D375's AI profile mix kept, play exploration kept at 0.15), bridge share 0.2 (card-level allocation from J062 power.tsv)

- finished: 2026-10-07T03:49:02-04:00
- decides: whether night 6 keeps D375's profile mix and this night's exploration share (D358); its drafts and recordings feed the matchup read of nights 1-5 and the evaluator
- hypothesis: with the mix (Default 0.5, Reckless 0.25, Cautious 0.25) the night keeps engine errors <= 2% and recording errors <= 1%; games with a Reckless or Cautious seat take <= 1.5x the time of Default-vs-Default games and end in a timeout or draw <= 5% of the time; the D371 checker quarantines <= 0.5% of recordings
- rule: written 2026-10-07 before the run, read on this night's own numbers (night-5.json below, not the runner's cumulative totals). Profile mix: keep it for night 6 if the games with a non-Default seat have timeouts + draws <= 5% for each profile, mean game time <= 1.5x the same night's Default-vs-Default games, and the night's engine errors <= 2% and recording errors <= 1%; otherwise night 6 plays Default vs Default and the cause is written up as a decision. Exploration: keep this night's share (0.15) for night 6 if share x (exploring / plain mean game time - 1) <= 0.25, the night's mean recorded bytes per game <= 2.5x its plain games', and the same error limits hold; otherwise halve it. Both are measured inside this night, where the mix and exploration are each assigned by seed, so neither confounds the other
- outcome: failed (pilot: pn.seat_mixed_games >= 1 and pn.explore_drafts >= 1 (pn.seat_mixed_games = 46, pn.explore_drafts = 0))
- headline: night.night_drafts_done 0, night.planned_drafts 0, night.bridge_share 0, quarantined 0
- summary: results/J103/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 74c1360
- follow-up: template matchup-read-nights-1-5: not due (the job did not finish done)
- follow-up: template design-verify: not due (the job did not finish done)

## J104 FAILED: Overnight queue, night 5: night 4's design and settings as J099's rule chose them (D375's AI profile mix kept, play exploration kept at 0.15), bridge share 0.2 (card-level allocation from J062 power.tsv)

- finished: 2026-10-07T04:12:13-04:00
- decides: whether night 6 keeps D375's profile mix and this night's exploration share (D358); its drafts and recordings feed the matchup read of nights 1-5 and the evaluator
- hypothesis: with the mix (Default 0.5, Reckless 0.25, Cautious 0.25) the night keeps engine errors <= 2% and recording errors <= 1%; games with a Reckless or Cautious seat take <= 1.5x the time of Default-vs-Default games and end in a timeout or draw <= 5% of the time; the D371 checker quarantines <= 0.5% of recordings
- rule: written 2026-10-07 before the run, read on this night's own numbers (night-5.json below, not the runner's cumulative totals). Profile mix: keep it for night 6 if the games with a non-Default seat have timeouts + draws <= 5% for each profile, mean game time <= 1.5x the same night's Default-vs-Default games, and the night's engine errors <= 2% and recording errors <= 1%; otherwise night 6 plays Default vs Default and the cause is written up as a decision. Exploration: keep this night's share (0.15) for night 6 if share x (exploring / plain mean game time - 1) <= 0.25, the night's mean recorded bytes per game <= 2.5x its plain games', and the same error limits hold; otherwise halve it. Both are measured inside this night, where the mix and exploration are each assigned by seed, so neither confounds the other
- outcome: failed (pilot: step pilot2 exited 2)
- headline: night.night_drafts_done 0, night.planned_drafts 0, night.bridge_share 0, quarantined 0
- summary: results/J104/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 74c1360
- follow-up: template matchup-read-nights-1-5: not due (the job did not finish done)
- follow-up: template design-verify: not due (the job did not finish done)

## J106 FAILED: ForgeCoach full-game playtest overnight: 50 games against Forge and 5 best-of-three tables between two browsers, every move a click on the real board by a monkey that reads the engine's offer from the protocol stream and never sends a frame of its own

- finished: 2026-10-07T07:46:43-04:00
- decides: whether two-person play is ready for Justin's friend again: every unreachable option, stuck seat, board that disagrees with the frames, lost log, leak and page error the suite finds is fixed or listed before the next game
- hypothesis: after ForgeCoach #86 to #103 (the playtest, the faster live coach, graveyard abilities from the engine's state.playable) and mtg-table #92, #93, #96 and #98 (M61), complete games played through the real UI reach a real end with no stuck seat and no hidden card in the page, and no option the engine lists in state.playable is unreachable (the two gaps the container runs left, graveyard abilities that are not keywords and the coach asking again after a reload, are fixed)
- rule: written before the run. READY if, over all games: the five best-of-threes complete (a match winner in the room), at least 45 of the 50 solo games and every table game reach a real end (win, loss or draw), and the counts of stuck, hidden-info, stack or combat mismatch, log-incomplete, page or console error and harness error findings are all 0. Unreachable-option findings do not block READY by themselves: each kind is listed with its screenshot and frame, and judged in the summary (a play the engine offers that no click can make is a bug to fix; one the monkey guessed from the card script and Forge then refused is not). Turn-cap findings (a game past 40 rounds, when a 40-card deck runs out by about round 34) count as a game that did not reach a real end. Otherwise NOT READY, with each failing kind triaged
- outcome: failed (pilot: step pilot1 exited 2)
- headline: pt.games 0, pt.ended 0, pt.matchesDone 0, pt.unreachable 0, pt.stuck 0, pt.hidden 0, pt.board 0, pt.log 0, pt.errors 0
- summary: results/J106/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 503c602, ForgeCoach 311da8e
- follow-up: template morning-read: not due (the job did not finish done)

## J105 DONE: Overnight queue, night 5: night 4's design and settings as J099's rule chose them (D375's AI profile mix kept, play exploration kept at 0.15), bridge share 0.2 (card-level allocation from J062 power.tsv)

- finished: 2026-10-07T14:15:22-04:00
- decides: whether night 6 keeps D375's profile mix and this night's exploration share (D358); its drafts and recordings feed the matchup read of nights 1-5 and the evaluator
- hypothesis: with the mix (Default 0.5, Reckless 0.25, Cautious 0.25) the night keeps engine errors <= 2% and recording errors <= 1%; games with a Reckless or Cautious seat take <= 1.5x the time of Default-vs-Default games and end in a timeout or draw <= 5% of the time; the D371 checker quarantines <= 0.5% of recordings
- rule: written 2026-10-07 before the run, read on this night's own numbers (night-5.json below, not the runner's cumulative totals). Profile mix: keep it for night 6 if the games with a non-Default seat have timeouts + draws <= 5% for each profile, mean game time <= 1.5x the same night's Default-vs-Default games, and the night's engine errors <= 2% and recording errors <= 1%; otherwise night 6 plays Default vs Default and the cause is written up as a decision. Exploration: keep this night's share (0.15) for night 6 if share x (exploring / plain mean game time - 1) <= 0.25, the night's mean recorded bytes per game <= 2.5x its plain games', and the same error limits hold; otherwise halve it. Both are measured inside this night, where the mix and exploration are each assigned by seed, so neither confounds the other
- outcome: done
- headline: night.night_drafts_done 38000, night.planned_drafts 38000, night.bridge_share 0.2, ns.engine_error_rate 0.0001, ns.mixed_time_ratio 0.8931, quarantined 71
- summary: results/J105/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 74c1360
- follow-up: template matchup-read-nights-1-5: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages
- follow-up: template design-verify: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J108 DONE: Move queue nights 1 and 2 to the cold drive (succeeds J070): one verified tar.zst a key folder plus each night's quarantine folder on /mnt/e/forgecoach-archive, an independent SHA-256 pass over every archive, and only then the hot copies deleted (D378); night 1's hold lifted

- finished: 2026-10-07T16:57:18-04:00
- decides: housekeeping, no lab decision: free about 6-7 GB on / by moving the finished nights 1-2 recordings to the cold tier (D378), the runway for night 6
- hypothesis: every unit verifies by SHA-256 on the drive and the archives come out ~5x smaller than the hot gzip (J070's dry run: 4.92x on night 1)
- rule: housekeeping, no pre-registered rule: D378's refusals, the independent verify block and the checks below; any mismatch stops the job before anything hot is deleted
- outcome: done
- headline: n1.members 40003, n2.members 40003, n1.hot 3302358295, n1.archive 563555595, n2.hot 3362639807, n2.archive 564817166, before.rootFreeGb 42.4, after.rootFreeGb 49.34
- summary: results/J108/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 503c602

## J109 DONE: ForgeCoach table playtest, short: three best-of-three matches between two browsers (the friend on a phone), every move a click on the real board, after the J107 triage (ForgeCoach #109)

- finished: 2026-10-08T00:59:07-04:00
- decides: whether two-person play inside ForgeCoach is ready for a friend game: after J107's triage, three best-of-threes between two browsers end with no stuck seat, no hang on a trigger's target, no board left behind the wire, and every remaining unreachable option judged
- hypothesis: J107's table findings were the harness (a board read a moment early, a click as the question changed, a phone hand re-folded) and its three hangs were the harness waiting on a "Select target player" with both buttons off (ForgeCoach #109, reproduced on the fake engine and real Forge). With the harness fixed, three table best-of-threes complete with zero stuck, no-progress, board-lag and unreachable-option findings
- rule: written before the run. READY if all three best-of-threes complete (a match winner in the room), every table game reaches a real end (win, loss or draw; a game past the turn cap is not one), and the counts of stuck / no-progress / ask-not-answered, board-lag, hidden-info, stack or combat mismatch, log-incomplete, page or console error and harness-error findings are all 0. Unreachable-option and click-no-act findings do not block READY by themselves: each is listed with its shot and frame and judged in the summary (a play no click can make is a bug; a monkey miss is not). Otherwise NOT READY, with each failing kind triaged
- outcome: done
- headline: pt.games 7, pt.ended 7, pt.matchesDone 3, pt.stuck 1, pt.lag 1, pt.unreachable 1, pt.clickNoAct 1, pt.errors 0
- summary: results/J109/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 59a0ced, ForgeCoach 0011633
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J111 DONE: The blue question: in every queue cube the AI drafter puts most decks into blue and blue decks lose; does contention between the two drafters or Forge's play with blue explain it (read-only, minutes)

- finished: 2026-10-08T05:53:57-04:00
- decides: what ForgeCoach says about the AI's blue habit: a "the AI over-drafts blue" line in Draft vs AI and a caveat on the deck assistant's pair win rates naming the cause the numbers support (contention between the drafters, or Forge's play with blue), and whether a colour-aware pick tweak is worth one lab A/B night
- hypothesis: the research retrospective (2026-10-08, §3A, from J073's colour pairs) found blue pairs take 56-83% of decks in all 7 cubes and win 0.44-0.49 against 0.52-0.62 for non-blue; either both drafters take blue and cut each other (contention), or Forge plays blue worse than the lab rates it
- rule: written 2026-10-08 before the run (blue.py's header). Plain Default-vs-Default decisive drafts, normal queue folders, every night on disk. A both-blue draft is 0.5 for blue by construction, so blue's deficit is its deficit in one-blue drafts; contention there is the blue cards the non-blue seat took (low band: at or under the cube's 25th percentile; high band: at or over its 75th). (a) contention is shown when blue's win rate in the low band has a Wilson 95% interval entirely above the high band's (the intervals do not overlap). (b) Forge plays blue worse is shown when, in the low band, blue's log-odds at equal deck quality (logit on the two decks' lab deck scores as within-cube z-scores, plus who was on the play) has a 95% interval entirely below 0. The verdict is both, (a), (b), or neither shown (no interval clears), pooled over the cubes; per-cube verdicts are description only
- outcome: done
- headline: bj.verdict_code 2, bj.cubes_a 0, bj.cubes_b 7, bj.pooled_low_rate 0.4258, bj.pooled_high_rate 0.4265, bj.pooled_b0_rate 0.4057
- summary: results/J111/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 59a0ced
- follow-up: template blue-advice: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J110 DONE: Lab stats (meta.json) for every cube Justin drafts: Omega, Fair Fight and Peasant built from the queue's plain Default-vs-Default drafts, and Evan's cube (evybaby, 360 cards) drafted afresh, 4,500-7,000 grid drafts, best of one

- finished: 2026-10-08T06:17:15-04:00
- decides: whether ForgeCoach ships lab meta.json files for Omega, Fair Fight, Peasant and Evan's cube (evybaby) and drops their labData: false (the cloud session copies them from results/J110/)
- hypothesis: the queue's plain Default-vs-Default drafts give Omega, Fair Fight and Peasant at least the shipped four's per-card data; Evan's 360-card cube, whose cards each reach about half as many grid drafts as a 180-card cube's, reaches the same per-card bar within 4,500-7,000 drafts; the 13 cards Forge 2.0.14 lacks never reach a draft line
- rule: written 2026-10-08 before the run. A cube's meta ships when ForgeCoach@0011633's parseMeta reads it (schema 1) and its cubeForMeta names that cube, no card key falls outside the cube, it rests on 100+ drafts (J075), and at least 81% of its playable nonland cards (the cube's nonland cards less those Forge lacks) have 80+ decisive games. 80 is ForgeCoach's META_STRENGTH, the games at which a card's lab number carries half its weight; 0.81 is the lowest share among the four shipped metas (Pauper 0.819; Synergy 0.831, Vintage 0.843, Modern-Era 0.894), rounded down. A meta under the bar is not shipped, and the summary says how many more drafts it would need. Evan's drafting stops at the first of 4,500, 6,000 or 7,000 drafts whose meta meets the bar: a stop on card counts, never on win rates, so it biases no rate
- outcome: done
- headline: mc.ship_count 4, mc.omega.share_ge80 0.892, mc.fair_fight.share_ge80 0.838, mc.peasant.share_ge80 0.899, mc.evybaby.share_ge80 0.852, mc.evybaby.drafts 4500
- summary: results/J110/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 59a0ced, ForgeCoach 0011633
- follow-up: template forgecoach-metas: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J112 DONE: Search-v2 pilots for cube stats: do cube-lab games played by search-v2 instead of Forge Default give card win rates that rank like 17Lands humans (Vintage, Synergy), and does blue's Forge deficit shrink

- finished: 2026-10-08T13:33:00-04:00
- decides: whether the cube lab's metas (ForgeCoach's lab card numbers, the deck assistant's and Draft vs AI's) are built from search-v2-piloted games from now on instead of Forge Default-piloted games
- hypothesis: J111 found Forge plays blue worse (blue decks win 33-46% at equal deck quality in all 7 cubes) and the lab's Forge-piloted card win rates agree with 17Lands humans only at rho ~0.48 (Vintage, 131 cards; Synergy 0.45, 59; ForgeCoach docs/human-blend.md); search-v2 overrules Forge's answer on ~18% of searched decisions (J102) and is +73-87 Elo over Forge Default (J101), so cards Forge misplays should be credited closer to how humans do, and the blue gap should narrow
- rule: written 2026-10-08 before any J112 game was played (j112.py's header). Per cube (Vintage, Synergy), cards = nonland cards with 500+ games in hand in ForgeCoach@bd51ce3's <cube>.human.json and at least one lab game in both arms; rho = Spearman (average ranks) between the arm's per-card lab win rate (meta.json wins / games) and the human GIH WR (gihW / gih); difference rho(B) - rho(A), B = search-v2 vs search-v2, A = Forge Default vs Forge Default on the same draft seeds; paired bootstrap over cards, 10,000 resamples, default_rng(20261006), percentile 95% interval. PASS when Vintage's interval is entirely above 0 AND Synergy's point estimate is >= 0: future metas are built from search-v2-piloted games. Otherwise FAIL: metas stay Forge Default-piloted, and the result is recorded. The blue numbers (secondary, as J111) carry no verdict
- outcome: done
- headline: jr.verdict_code 0, jr.v_diff -0.0738, jr.v_lo -0.1539, jr.v_hi 0.0061, jr.s_diff 0.1052, jr.v_rho_a 0.535, jr.v_rho_b 0.4611, jr.v_blue_paired_diff -0.0136
- summary: results/J112/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 59a0ced, ForgeCoach bd51ce3
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J113 DONE: B3, the win chance on human games: Platt recalibration of the frozen r17 evaluator on 17Lands' Powered Cube replays (dev half), tested on the held-out half, with the human/Forge relative slope a coach would need (D415)

- finished: 2026-10-08T15:03:35-04:00
- decides: whether ForgeCoach's win chance gets a "human" calibration (the relative human/Forge transform in b3-human-calibration.json) for games against people and the search AI, and in which form (global or per turn band)
- hypothesis: J063's reliability table showed the r17 win chance too extreme on human games (fitted slope about 0.82), so a Platt fit on the dev half lowers held-out log-loss; part of that slope is r17's own over-confidence on Forge's games (J063: "0.957" was 0.895), so the relative slope (human / Forge) is expected nearer 1 than the absolute one, and whether its interval excludes 1 is open
- rule: D415, human_calib.py CALIB_RULE. Population: PremierDraft's whole file, D359's test half, both perspectives, turn >= 3, final half-turn dropped, share >= 0.5; the r17 evaluator frozen (J063's var/ml/models/r17-vintage-n1.json, sha256 recorded). PASS when log-loss(uncalibrated) - log-loss(global Platt fitted on the dev half) > 0 with the lower end of its 95% percentile interval (2,000 resamples over test games, seed 20261008) above 0, on >= 2,000 games and 10,000 rows; fewer is FAIL (underpowered); a partial download, a sample, one perspective or another file is NO VERDICT. Per-band form only when log-loss(global) - log-loss(bands) has its interval above 0. Coach use = relative only on a PASS with a Forge-side fit of >= 2,000 rows and 20 deck pairs, both slopes positive, and the relative slope's 95% interval excluding 1; else none
- outcome: done
- headline: calib.summary_pass 1, calib.summary_delta 0.0029, calib.summary_slope 0.8478, calib.summary_relSlope 0.8891, calib.summary_coachUse 0
- summary: results/J113/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table cb81721
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J114 DONE: The human-pick drafter: does the cube lab's AI drafter build stronger decks when it drafts grid lines with ForgeCoach's 17Lands human pick model (Vintage, Synergy; mirrored seats; Forge Default pilots)

- finished: 2026-10-08T19:08:08-04:00
- decides: whether a follow-up makes the human-pick drafter (D416) the default AI drafter of ForgeCoach's Draft vs AI; this job changes nothing itself
- hypothesis: ForgeCoach #119's pick model names the human's pick 73% of the time on Vintage's cards against 35% for the lab drafter's ratings; J111 found the lab drafter over-drafts blue 1.4-2.1x and Forge plays blue worse. If picking like strong humans (on-colour, black and blue power, fewer white and red aggro cards) builds better decks, the human-pick drafter wins more than half of its best-of-3 matches against the current drafter when both decks are piloted by the same Forge AI
- rule: written 2026-10-08 before any J114 game was played (j114.py's header). Per cube (Vintage, Synergy), the same seeds 811,400,001 and up twice: HA (seat A drafts with D416's human-pick drafter from ForgeCoach@866c256's <cube>.picks.json, seat B with the current drafter) and HB (the mirror, seat B human); both seats Forge Default, best of 3, the lab builder and the cube's ratings. Outcome: the human-pick drafter's match win rate pooled over HA and HB (won 1, lost 0, drawn 0.5; engine-error matches left out and counted); 95% interval by cluster bootstrap over seeds (a seed's matches in both folders together), 10,000 resamples, numpy default_rng(20261008), percentile. PASS when Vintage's interval lies entirely above 0.5 AND Synergy's point estimate is >= 0.5; otherwise FAIL. Blue (secondary, J111's method) carries no verdict
- outcome: done
- headline: jr.verdict_code 0, jr.v_rate 0.478, jr.v_lo 0.457, jr.v_hi 0.499, jr.s_rate 0.507, jr.v_blue_h 0.6265, jr.v_blue_c 0.6085
- summary: results/J114/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 76cbb82, ForgeCoach 866c256
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J115 DONE: Opening-hand and target search, fixed measurement: two 1,200-game matches (600 mirrored pairs each) at the live 1.5 s budget, search-v2-mull vs search-v2 and search-v2-targets vs search-v2 (search-v2 = the ladder's search-v1-anytime), each switch's score with a 95% interval in Elo and how often it changed Forge's answer (D417)

- finished: 2026-10-08T23:31:42-04:00
- decides: whether the opening-hand search (D417 mull=1) and the target search (D417 targets=1), each on its own, join the next search version (search-v3); each switch is decided separately
- hypothesis: Forge's land-count mulligan rule and its greedy single-target choices both lose games the search can see; the target search changes a quarter of the targeted plays it looks at (smoke 2/8) and the opening-hand search rarely overrules Forge (the lcb rule, smoke 0/5 keeps and 1/1 bottoms), so each gain, if any, is expected small, about +5 to +15 Elo
- rule: written 2026-10-08 before the run, read from var/ai-ladder/match-J115-mull.json and var/ai-ladder/match-J115-targets.json, each switch on its own: ADOPT the switch into the next search version if its match is complete (all 1,200 games) and the 95% interval on its score against search-v1-anytime (search-v2) has its lower end above 0.5 (above 0 Elo). Otherwise NOT SHOWN for that switch: report the score and Elo with the interval and how often it changed Forge's answer; an interval that includes 0.5 is "not shown", never "no effect", and a match that stopped early gives no verdict
- outcome: done
- headline: mm.played 1200, mm.score 0.4917, mm.lo 0.475, mm.hi 0.5083, mm.elo -5.8, mm.eloLo -17.4, mm.eloHi 5.8, mt.played 1200, mt.score 0.51, mt.lo 0.4962, mt.hi 0.5238, mt.elo 6.9, mt.eloLo -2.7, mt.eloHi 16.6
- summary: results/J115/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 614f98f
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J117 ABORTED: Sonnet seat smoke test: 2 games (one seed, mirrored) of Claude Sonnet in the human seat against Forge Default, the fresh-context arm, to see that the LLM seat works end to end and what one game really costs in tokens and time (D418)

- finished: 2026-10-09T08:26:24-04:00
- decides: whether the LLM seat is ready for Justin's small Sonnet tests (4-6 games vs Forge, then the replay comparison of fresh vs session:10), and what one game costs, so Justin can decide how much allowance to spend; this job changes nothing itself
- hypothesis: the seat finishes both games with few fallbacks; the dry run's estimate (~60-120 model calls and ~190k input tokens a game for the fresh arm, before Claude Code's own overhead and thinking) is about right
- rule: written 2026-10-09 before the run. READY if both games finish (win, loss or draw; no "unfinished" or "no-bridge"), fallbacks are at most 1 in 10 model decisions, and the engine refused at most 1 in 10 of the seat's moves. Otherwise NOT READY, with the cause. Win/loss is reported and decides nothing (2 games)
- outcome: aborted (aborted: g.fallbacks >= 10 and g.fallbacks * 3 > g.modelDecisions (g.fallbacks = 34, g.modelDecisions = 0))
- headline: g.games 1, g.finished 1, g.wins 0, g.turns 14, g.modelCalls 34, g.fallbacks 34, g.refused 0, g.tokensIn 0, g.tokensOut 0
- summary: results/J117/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table ccd4d5d
- follow-up: template morning-read: not due (the job did not finish done)

## J118 FAILED: Sonnet seat smoke test, again after J117 (every model call failed): 2 games (one seed, mirrored) of Claude Sonnet in the human seat against Forge Default, the fresh-context arm, to see that the LLM seat works end to end and what one game really costs in tokens and time (D418)

- finished: 2026-10-09T08:40:01-04:00
- decides: whether the LLM seat is ready for Justin's small Sonnet tests (4-6 games vs Forge, then the replay comparison of fresh vs session:10), and what one game costs, so Justin can decide how much allowance to spend; this job changes nothing itself
- hypothesis: the seat finishes both games with few fallbacks; the dry run's estimate (~60-120 model calls and ~190k input tokens a game for the fresh arm, before Claude Code's own overhead and thinking) is about right
- rule: written 2026-10-09 before the run. READY if both games finish (win, loss or draw; no "unfinished" or "no-bridge"), fallbacks are at most 1 in 10 model decisions, and the engine refused at most 1 in 10 of the seat's moves. Otherwise NOT READY, with the cause. Win/loss is reported and decides nothing (2 games)
- outcome: failed (pilot: step pilot1 exited 1)
- headline: g.games 0, g.finished 0, g.wins 0, g.turns 0, g.modelCalls 0, g.fallbacks 0, g.refused 0, g.tokensIn 0, g.tokensOut 0
- summary: results/J118/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 304273d
- follow-up: template morning-read: not due (the job did not finish done)

## J119 DONE: Sonnet seat smoke test, third post (J117 and J118 failed: the PC claude CLI was logged out, now logged in): 2 games (one seed, mirrored) of Claude Sonnet in the human seat against Forge Default, the fresh-context arm, to see that the LLM seat works end to end and what one game really costs in tokens and time (D418)

- finished: 2026-10-09T10:16:36-04:00
- decides: whether the LLM seat is ready for Justin's small Sonnet tests (4-6 games vs Forge, then the replay comparison of fresh vs session:10), and what one game costs, so Justin can decide how much allowance to spend; this job changes nothing itself
- hypothesis: the seat finishes both games with few fallbacks; the dry run's estimate (~60-120 model calls and ~190k input tokens a game for the fresh arm, before Claude Code's own overhead and thinking) is about right
- rule: written 2026-10-09 before the run. READY if both games finish (win, loss or draw; no "unfinished" or "no-bridge"), fallbacks are at most 1 in 10 model decisions, and the engine refused at most 1 in 10 of the seat's moves. Otherwise NOT READY, with the cause. Win/loss is reported and decides nothing (2 games)
- outcome: done
- headline: g.games 2, g.finished 2, g.wins 1, g.turns 41, g.modelCalls 260, g.fallbacks 0, g.refused 0, g.tokensIn 520, g.tokensOut 37292
- summary: results/J119/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 304273d
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J116 DONE: Target search confirmation: one 4,800-game match (2,400 mirrored pairs, fresh deals) at the live 1.5 s budget, search-v2-targets vs search-v2 (the ladder's search-v1-anytime), the score with a 95% interval in Elo and how often it changed Forge's target (D417; Justin asked for it after J115's +6.9 Elo [−2.7, +16.6])

- finished: 2026-10-09T16:11:59-04:00
- decides: whether the target search (D417 targets=1) joins the next search version (search-v3)
- hypothesis: J115 measured the target search at +6.9 Elo [−2.7, +16.6] over 600 pairs, changing 11.2% of the targets it searched; if that is real, a fresh match four times the size (±~5 Elo) puts its lower end above 0
- rule: written 2026-10-09 before the run, read from var/ai-ladder/match-J116-targets.json alone (J115's games are not pooled in: J116 is the confirmation, on fresh deals). ADOPT targets=1 into the next search version if the match is complete (all 4,800 games) and the 95% interval on search-v2-targets' score against search-v1-anytime has its lower end above 0.5 (above 0 Elo). Otherwise NOT SHOWN: report the score and Elo with the interval and how often it changed Forge's target. An interval that includes 0.5 is "not shown", never "no effect"; a match that stopped early gives no verdict
- outcome: done
- headline: mt.played 4800, mt.score 0.5031, mt.lo 0.4956, mt.hi 0.5106, mt.elo 2.2, mt.eloLo -3, mt.eloHi 7.4
- summary: results/J116/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 614f98f
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J120 DONE: Synergy evolve with Counter Blitz's counters cards (Final Fantasy X Commander) in the seed pool: 4 generations x 400 drafts, best of 3, exploration on, unrecorded

- finished: 2026-10-10T01:04:25-04:00
- decides: whether any of Counter Blitz's counters cards goes into the Synergy Cube (Justin's call: the lab informs it, his notes decide; nothing here edits cubes/synergy-cube-180.md)
- hypothesis: none to confirm: a descriptive run. The evolve loop cuts only a card it confirms dead or dominant on fresh seeds, and a pool card enters only into a slot a cut opens, so it may add no Final Fantasy card at all; with the try notes, the seven strongest-reading ones are first in line for any slot that opens
- rule: written 2026-10-10 before the run. A swap counts only as evolve decides it (D331 discovery then confirmation, D357 pooled repeats). A Final Fantasy card that enters is read from its generations' stats.json and, if it is rated under deadMinRating, from the changelog's pooled exploration table after generation 4 (holds its own / weak when played / undecided / too few), never from a per-generation table. No verdict cuts or adds a card in the real cube: the summary reports, Justin decides
- outcome: done
- headline: big.generations_done 4, big.drafts 1600, big.engine_error_rate 0.0031, ex.treated 772, ex.holds 10, ex.weak 3, ex.undecided 16, ex.too_few 41
- summary: results/J120/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table c7d1e4d
- follow-up: template synergy-fic-cards: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J121 DONE: B2, deckbuilder choices: from 800 lab drafts each of Vintage 180 and Evan's cube (seeds 812,000,001+), every seat's pool built by ForgeCoach's deck assistant and a few one-decision variants (16 / 17 / 18 lands, the splash cut) plus the lab's and Forge's own builds, each played against the other seat's lab deck; paired by pool, Forge Default vs Forge Default on all of them and search-v2 vs search-v2 on 120 drafts a cube as a sign check

- finished: 2026-10-10T07:49:01-04:00
- decides: whether ForgeCoach's deck assistant changes its land count (16 vs 17) or its splash, and how its builds compare with the lab's and Forge's; 18 lands goes to Justin, never changed by this job
- hypothesis: ForgeCoach's builder (lab win rates + 17Lands, Justin's two colours + a <=3-card splash on 16-17 lands) should beat Forge's BoosterDeckBuilder clearly (Forge leaves out colourless lands and low-rated cards and pads thin pools) and the lab builder slightly; one land or the splash is a small effect, a few points at most, so most contrasts may be not shown at this size
- rule: written 2026-10-10 before any J121 game was played (variants.ts, the read). Unit: a focus pool = one seat of one lab draft; each of its decks plays 2 games (one per seat) against the OTHER seat's lab deck, the same opponent for every variant; a game scores 1/0, a draw or timeout 1/2, an engine error is left out; per pool the variant's mean minus the reference's, averaged within the draft (its two seats), then over drafts; normal 95% and 99% intervals. Five primary contrasts on the Forge Default arm (all drafts, both cubes pooled): lands16 = 16 minus 17 lands and lands18 = 18 minus 17 lands (ForgeCoach's colours and splash, one spell per land, the builder's own pick), nosplash = ForgeCoach's splash swapped for on-colour spells minus ForgeCoach's deck (pools where it splashes), lab = the lab builder minus ForgeCoach, forge = Forge's builder minus ForgeCoach. A contrast is SHOWN when its 99% interval excludes 0 (five contrasts, about 5% familywise). lands16, lands18 and nosplash also need the search-v2 arm's point estimate on the same side, else NOT SHOWN. Decisions: lands16 shown for 16 -> a follow-up makes 16 the deck assistant's default (the meta's land table still first); shown for 17 -> it drops its low-curve 16-land rule. nosplash shown for the cut -> a follow-up stops the deck assistant's splashes; shown for the splash -> it keeps them. lands18 shown for 18 -> reported to Justin (his rule keeps 18 for thin pools), nothing changes. lab / forge -> which builder wins, nothing changes by itself. Everything else: no change. An interval that includes 0 is not shown, never no effect
- outcome: done
- headline: jr.lands16_decision 0, jr.f_lands16_est -0.0152, jr.f_lands16_lo99 -0.0384, jr.f_lands16_hi99 0.008, jr.lands18_decision 0, jr.f_lands18_est -0.0175, jr.nosplash_decision 0, jr.f_nosplash_est -0.0251, jr.f_lab_est -0.0536, jr.f_forge_est -0.035
- summary: results/J121/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table fcdb174, ForgeCoach 866c256
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J122 DONE: Lab stats (meta.json) for the Final Fantasy Cube: its 180 cards against Forge 2.0.14, then 3,000-7,500 grid drafts, best of one, until the shipped metas' bar is met

- finished: 2026-10-10T10:30:10-04:00
- decides: whether ForgeCoach ships public/cubes/final-fantasy-cube-180.meta.json and drops the cube's labData: false (the cloud session copies it from results/J122/), and which of the cube's cards Forge 2.0.14 lacks (the cloud session lists them under the document's "Not in Forge 2.0.14")
- hypothesis: Forge 2.0.14 (built 2026-08-08) has the whole Final Fantasy release (June 2025), so all 180 cards are in its database; a 180-card cube reaches the shipped metas' per-card bar within 3,000-7,500 grid drafts
- rule: written 2026-10-10 before the run, J110's rule unchanged. The meta ships when ForgeCoach@bec2dba's parseMeta reads it (schema 1), its cubeForMeta names final-fantasy, no card key falls outside the cube, it rests on 100+ drafts, and at least 81% of its playable nonland cards (the cube's nonland cards less those Forge lacks) have 80+ decisive games. Drafting stops at the first of 3,000, 4,500, 6,000 or 7,500 drafts whose meta meets the bar: a stop on card counts, never on win rates. A missed bar at 7,500 is a finding, not a failure: the meta is collected and does not ship
- outcome: done
- headline: ffl.listed 180, ffl.missing 0, ff.drafts 6000, cov.share_ge80 0.833, cov.median_games 940, cov.ship 1
- summary: results/J122/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table a944b25, ForgeCoach bec2dba
- follow-up: template forgecoach-final-fantasy-meta: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J123 DONE: Peasant Cube v2 lab meta: MatEffect's 11 rare lands back in the list (ForgeCoach #131), drafted afresh, 6,000-12,000 grid drafts, best of one, Default vs Default, unrecorded

- finished: 2026-10-10T10:58:30-04:00
- decides: whether ForgeCoach replaces public/cubes/peasant-cube-180.meta.json, which still describes v1 (the ten Duskmourn duals and Ash Barrens; J110, 10,956 queue drafts), with this run's v2 meta (the cloud session copies it from results/J123/)
- hypothesis: none to confirm: a rebuild. v1's per-card counts, scaled to 6,000 drafts, give 0.873 of playable nonland cards 80+ games (0.81 is the bar), so the first step should meet it; the 11 rare lands (Forge ranks 50-99, against 11-54 for what they replaced) are drafted earlier and played in more decks, which shifts the nonland picks a little
- rule: written 2026-10-10 before the run. The meta ships when ForgeCoach@c93d90e's parseMeta reads it (schema 1) and its cubeForMeta names peasant, its card list is ForgeCoach's v2 document's exactly (the 11 rare lands in, the 11 cards they replaced out), no card key falls outside the cube, it rests on 100+ drafts (J075), and at least 81% of its playable nonland cards have 80+ decisive games (J110's bar: 80 is ForgeCoach's META_STRENGTH, 0.81 the lowest share among the four metas shipped before J110, rounded down). Drafting stops at the first of 6,000, 9,000 or 12,000 drafts whose meta meets the bar: a stop on card counts, never on win rates. A meta under the bar at 12,000 is not shipped (ForgeCoach then decides between v1's meta and labData: false), and the summary says how many more drafts it would need; a follow-up tops the same folder up
- outcome: done
- headline: mc.ship 1, mc.share_ge80 0.873, mc.drafts 6000, mc.median_games 1523, mc.p10_games 43, mc.new_lands_played 11
- summary: results/J123/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 4b424a2, ForgeCoach c93d90e
- follow-up: template forgecoach-metas: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J124 DONE: B2 follow-up, 16 or 17 lands where ForgeCoach's deck assistant picks 16: fresh lab drafts of Vintage 180, Evan's cube and Synergy (1,400 each, seeds 813,000,001+), only the seats whose ForgeCoach build plays 16 lands (about 2,000 pools), that deck against the same deck on 17 lands, each against the other seat's lab deck; paired by pool, clustered by draft; Forge Default on every pool (4 games a deck), search-v2 on the first 300 pools (2 games a deck) as the sign check

- finished: 2026-10-14T05:45:07-04:00
- decides: whether ForgeCoach's deck assistant keeps playing 16 lands where it now picks 16 (its low-curve rule) or plays 17 there
- hypothesis: J121's secondary read (its fc16_vs_17: 760 pools where the builder picked 16, mostly Vintage) was -3.9 points for 16, 95% [-7.5, -0.3], 99% [-8.7, +0.9], search-v2 -5.2 on 124 pools; that read was chosen after the fact among several, so the true effect is likely smaller, 1-3 points
- rule: written 2026-10-14 before any J124 draft or game. Unit: a focus pool = one seat of one lab draft whose ForgeCoach build (buildDecks(ctx, pool)[0] at ForgeCoach@3972058) plays 16 lands; l16 = that deck, l17 = the same colours and splash on 17 lands (J121's stepLands: the land in cuts the spell whose loss leaves the builder's best score). Both play the OTHER seat's lab deck. A game scores 1/0, a draw or timeout 1/2, an engine error is left out; per pool l16's mean score minus l17's, averaged within the draft (its seats), then over drafts; normal 95% and 99% intervals. ONE contrast. SHOWN if the Forge Default arm's 99% interval on (16 - 17) over every kept pool lies entirely below 0 AND search-v2's point estimate on its subsample is below 0 too; then the cloud changes ForgeCoach's low-curve rule to 17. Otherwise NOT SHOWN, and the rule stays (16 shown better is also NOT SHOWN: the rule stays). Per cube and per source (lowcurve = the low-curve rule chose 16, meta = the meta's land table did) are descriptions and decide nothing. An interval that includes 0 is not shown, never no effect
- outcome: done
- headline: jr.shown 0, jr.f_est -0.0061, jr.f_lo99 -0.0255, jr.f_hi99 0.0133, jr.f_lo95 -0.0208, jr.f_hi95 0.0087, jr.s_est -0.0109, jr.f_pools 2019, jr.f_source_lowcurve_est -0.0063, jr.f_source_meta_est -0.0046
- summary: results/J124/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 37c6ae6, ForgeCoach 3972058
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J125 DONE: Search leaf weights (growth plan #3): eight coordinate steps of search-v2's hand leaf (x0.5 and x1.5 on its life, hand, creature and other-permanent terms) tuned on the dev deck set against search-v2, 140 mirrored pairs each; then ONE fixed 1,200-game match (600 mirrored pairs, D398, the live 1.5 s budget) of the best step against search-v2 on the held-out confirm set, read on a 95% interval (D431)

- finished: 2026-10-14T12:19:18-04:00
- decides: whether search-v2's hand leaf gets new weights in the next search version (search-v3): the one coordinate step chosen on the dev set is adopted only if the held-out fixed match shows it beats search-v2
- hypothesis: the hand-written leaf (D312) was never tuned; its four big terms (on the bench board: life 200, creatures 226, other permanents 106, hand -40 points) are guesses, so one of the eight steps may be worth +10 to +25 Elo; with eight steps at 140 pairs each the tuning winner's score is biased upward, which is why it is confirmed on held-out deals and read alone
- rule: written 2026-10-14 before any J125 game was played. Tuning (dev set, never the confirm set): each of the eight steps plays a 280-game match (35 batches, 140 mirrored pairs) against search-v1-anytime (search-v2) on tools/ai-bench/pairs-dev.txt, all eight on the same deals (seed blocks 610,900,000-610,900,034, host label j125-tune). Selection: the step with the highest tuning score (the match line's score, 4 decimals); a tie goes to the step listed first in the order wlife50, wlife150, whand50, whand150, wcreature50, wcreature150, wother50, wother150; if the highest score is 0.5000 or less, NO step is chosen, the current weights stay, no confirmation is played and the reading is NOT SHOWN. All eight tuning matches must be complete (280 games, engine errors and timeouts at most 1 in 20) or the selection refuses and the job fails before any confirmation game. Confirmation: ONE fixed match (D398) of the chosen step against search-v1-anytime, 1,200 games (600 mirrored pairs) on the confirm set (tools/ai-bench/pairs-confirm.txt, seed blocks from this host's 114,900,000, the matchup's first 150), read from var/ai-ladder-j125/match-J125.json alone (the tuning games are never pooled in). ADOPT the chosen step's weight into the next search version if the match is complete (all 1,200 games) and the 95% interval on its score against search-v2 has its lower end above 0.5 (above 0 Elo). Otherwise NOT SHOWN: report the score and Elo with the interval. An interval that includes 0.5 is "not shown", never "no effect"; a match that stopped early gives no verdict
- outcome: done
- headline: sel.chosen 1, sel.score 0.5107, cm.played 1200, cm.score 0.4917, cm.lo 0.4769, cm.hi 0.5065, cm.elo -5.8, cm.eloLo -16.1, cm.eloHi 4.5, v.adopt 0
- summary: results/J125/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table c74468e
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J126 FAILED: B1, distilling search-v2 into a fast policy: 1,800 lab games of Vintage 180, Evan's cube and Synergy with search-v2 in both seats and D435's row exporter on (seeds 814,000,001+), one small candidate scorer per decision kind trained on what search-v2 played (split by game, 80/10/10), its held-out top-1 agreement per kind, then two fixed 1,200-game matches (600 mirrored pairs, D398): distilled vs search-v2 and distilled vs Forge Default

- finished: 2026-10-14T12:25:49-04:00
- decides: whether the distilled policy (search-v2's own candidates at priority, attack and block, scored by a small model trained on search-v2's choices, no rollout) ships as a lab policy, a ladder player for faster lab games and a candidate for the live hint
- hypothesis: search-v2 keeps Forge's answer at about 80-86% of the decisions it searches (J115, J116: it changes 20% of priority plays, 14% of attacks, 16-17% of blocks), so the always-Forge baseline agrees about 82% of the time and the question is how many of the other 18% a small model recovers; a distilled seat that recovers few of them plays close to Forge Default plus outlets, which search-v2 beats, so a score of 0.45-0.49 against search-v2 is the plausible range and SHIP is not the expected outcome; the speed side is near certain (the smoke: 3.2 ms a decision against search-v2's 715 ms)
- rule: written 2026-10-14 before any J126 row was generated. SHIP the distilled player (search-v2-distill-<sha12>, kind search-distill, registered by distill.py register from this run's model) as a lab policy when ALL of (1) its fixed match against search-v1-anytime (search-v2) is complete, 1,200 of 1,200 games; (2) it is not shown worse than search-v2 by more than 0.03 in score: the lower end of the 95% interval on its score in that match (var/ai-ladder/match-J126-search.json, `lo`) is at least 0.47; (3) it is at least 10 times faster per decision: search-v2's mean decision time over the held-out TEST decisions of this run's rows (p + a + b, rows with a search fallback excluded; metrics.json test.searchMsMean) divided by the distilled seat's mean decision time in that same match (aSearch.msPerDecision: p + a + b, the same span, from before the candidates are generated to the verdict) is at least 10. Otherwise NOT SHOWN, naming the part that failed. distill.py verdict computes it (MARGIN 0.03, SPEEDUP 10). Fixed before the data: the split (by game, sha256("J126|<game key>") mod 100, the key being the rows folder (one a cube) and the lab's lab:<seed>:g<n>: 0-79 train, 80-89 val, 90-99 test), the exclusions (a row whose search fell back; a game without an ok end line), the model and its settings (distill.py train's defaults at the pinned commit: hidden 32, at most 40 epochs, patience 4 on validation loss, Adam lr 0.003, L2 0.0001, batch 512, seed 126, at least 200 training decisions for a kind to get a head), and that nothing is tuned on the test split. The agreement report and the match against Forge Default decide nothing: both are reported. An interval whose lower end is under 0.47 is "not shown non-inferior", never "worse"; a match that stopped early gives no verdict
- outcome: failed (pilot: merged == 1 (merged = 0))
- headline: vd.ship 0
- summary: results/J126/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 10e8f99
- follow-up: template morning-read: not due (the job did not finish done)

## J127 DONE: B1, distilling search-v2 into a fast policy: 1,800 lab games of Vintage 180, Evan's cube and Synergy with search-v2 in both seats and D435's row exporter on (seeds 814,000,001+), one small candidate scorer per decision kind trained on what search-v2 played (split by game, 80/10/10), its held-out top-1 agreement per kind, then two fixed 1,200-game matches (600 mirrored pairs, D398): distilled vs search-v2 and distilled vs Forge Default

- finished: 2026-10-14T22:18:54-04:00
- decides: whether the distilled policy (search-v2's own candidates at priority, attack and block, scored by a small model trained on search-v2's choices, no rollout) ships as a lab policy, a ladder player for faster lab games and a candidate for the live hint
- hypothesis: search-v2 keeps Forge's answer at about 80-86% of the decisions it searches (J115, J116: it changes 20% of priority plays, 14% of attacks, 16-17% of blocks), so the always-Forge baseline agrees about 82% of the time and the question is how many of the other 18% a small model recovers; a distilled seat that recovers few of them plays close to Forge Default plus outlets, which search-v2 beats, so a score of 0.45-0.49 against search-v2 is the plausible range and SHIP is not the expected outcome; the speed side is near certain (the smoke: 3.2 ms a decision against search-v2's 715 ms)
- rule: written 2026-10-14 before any J127 row was generated. SHIP the distilled player (search-v2-distill-<sha12>, kind search-distill, registered by distill.py register from this run's model) as a lab policy when ALL of (1) its fixed match against search-v1-anytime (search-v2) is complete, 1,200 of 1,200 games; (2) it is not shown worse than search-v2 by more than 0.03 in score: the lower end of the 95% interval on its score in that match (var/ai-ladder/match-J127-search.json, `lo`) is at least 0.47; (3) it is at least 10 times faster per decision: search-v2's mean decision time over the held-out TEST decisions of this run's rows (p + a + b, rows with a search fallback excluded; metrics.json test.searchMsMean) divided by the distilled seat's mean decision time in that same match (aSearch.msPerDecision: p + a + b, the same span, from before the candidates are generated to the verdict) is at least 10. Otherwise NOT SHOWN, naming the part that failed. distill.py verdict computes it (MARGIN 0.03, SPEEDUP 10). Fixed before the data: the split (by game, sha256("J126|<game key>") mod 100, the key being the rows folder (one a cube) and the lab's lab:<seed>:g<n>: 0-79 train, 80-89 val, 90-99 test), the exclusions (a row whose search fell back; a game without an ok end line), the model and its settings (distill.py train's defaults at the pinned commit: hidden 32, at most 40 epochs, patience 4 on validation loss, Adam lr 0.003, L2 0.0001, batch 512, seed 126, at least 200 training decisions for a kind to get a head), and that nothing is tuned on the test split. The agreement report and the match against Forge Default decide nothing: both are reported. An interval whose lower end is under 0.47 is "not shown non-inferior", never "worse"; a match that stopped early gives no verdict
- outcome: done
- headline: mt.test.agreement.rate 0.8243, mt.test.forgeBaseline.rate 0.8229, ms.score 0.3867, ms.lo 0.3652, ms.hi 0.4082, ms.elo -80.1, mf.score 0.485, mf.elo -10.4, vd.speedup 161.75, vd.ship 0
- summary: results/J127/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table e8d2448
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J129 FAILED: A3, the leak report: Justin's recurring mistakes in his own recorded games. Every decision of his seat that the post-game review covers (main-phase plays, attacks, blocks, targets) is graded by coach-grade.sh review in pool mode (D348), put into one kind by what he chose and what he saw, and judged by a rule written before grading (D438): a mistake is a regret interval above zero; a leak is at least 5 mistakes in at least 3 games with a mean regret whose 95% interval is above zero; everything else "not shown"

- finished: 2026-10-15T10:44:45-04:00
- decides: whether ForgeCoach shows the owner a "Your leaks" page (each leak's example moments linked to the replay), and from which kinds; nothing ships from this job by itself
- hypothesis: the data is small (on 2026-10-15: 14 games his for certain, 7 with decisions, 153 decisions planned, 95 main-phase plays, 30 attacks, 12 blocks, 16 targets), and the helper's own automatic reviews of five of these games (basic-lands knowledge, default budgets) found 3 clear mistakes in all, so the expected outcome is "not shown" for every kind, with the report saying how many games a verdict needs; a leak is possible only in a kind he meets often (main-phase plays) and only if his clear mistakes cluster there
- rule: written 2026-10-15 before any of his decisions was graded at J129's settings; D438 and tools/leaks/rule.ts RULE (copied into leaks.json). A decision is a MISTAKE when its regret interval excludes zero (regretLo > 0, the review's own "mistake"; touching zero is not). A kind is a LEAK when it has at least 5 mistakes, in at least 3 different games, and the 95% interval of its mean regret over ALL its graded decisions is above zero (a parametric game-cluster bootstrap: 10,000 resamples, seed 129, each decision's regret drawn from Normal(regret, (regretHi - regretLo)/3.92)). Everything else is NOT SHOWN. The kinds (classify.ts, by choice and context, never by the engine's answer, one kind a decision, in this order): a main-phase play he passed -> holding up vs tapping out; he cast with the opponent on 2+ untapped lands -> casting into open mana; he cast with 2+ different spells castable -> sequencing; he cast otherwise -> holding up vs tapping out; no attack while the opponent had no untapped creature -> not attacking when free; other attacks; a double block or a chump (printed P/T less damage) -> chump or double block; other blocks; targets. Land-late and keep-or-mulligan are listed as not graded (no grader covers them). The grading settings are fixed (rule.ts REVIEW: triage 60 s, every non-best decision deepened, 600 s of deepening a game, 5 options, seed 1). Nothing is tuned on these games; the checks hold the arithmetic, never the outcome
- outcome: failed (pilot: merged == 1 (merged = 0))
- headline: lk.leaks -1, lk.gamesGraded 0, lk.decisions 0, lk.mistakes 0, inv.decisions 153, rs.failed 0
- summary: results/J129/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 8988d8d
- follow-up: template morning-read: not due (the job did not finish done)

## J128 FAILED: Search-v2 with the learned evaluator at its leaves: ONE fixed 1,200-game match (600 mirrored pairs, D398, the live 1.5 s budget) of search-v2-evalleaf (search-v2 whose unfinished rollouts are scored by evaluator v2's P(win) for the searching seat, D437) against search-v1-anytime (search-v2) on the confirm deck set, read on a 95% interval; no tuning

- finished: 2026-10-15T11:24:42-04:00
- decides: whether the next search version (search-v3) scores the leaves of its unfinished rollouts with the learned evaluator (D354's leaf=eval, evaluator v2) instead of the hand-written leaf
- hypothesis: the evaluator v2 judges a position with what the seat knows (a 731-card vocabulary covering every card of the confirm decks) where the hand leaf counts life, cards and Forge's card values, so it may steer search-v2's overrides better; against that, D354's gate 2 on v2 (J081) found no regret gain at the live horizon (hand - eval -0.0009 [-0.0063, +0.0047], 291 decisions) and J100 found v2 orders a decision's options slightly worse than the hand leaf (pairwise agreement 0.680 against 0.711), and the eval leaf changes Forge's answer more often (the 8-game smoke: 27% against 17%), so a score near 0.5 or below is as plausible as a gain; ADOPT is not the expected outcome
- rule: written 2026-10-15 before any J128 game was played. ONE fixed match (D398, no stopping rule): search-v2-evalleaf against search-v1-anytime (search-v2), 1,200 games (150 batches of 8, 600 mirrored pairs), the live 1.5 s wall-clock budget on both sides, on the confirm deck set (tools/ai-bench/pairs-confirm.txt, 34 deck pairs never tuned on), this host's match seed blocks from 114,900,000 (the matchup has never been played, so 114,900,000-114,900,149: the deals of J115's and J125's confirmations), read from var/ai-ladder/match-J128.json alone. Nothing is tuned: the evaluator is v2 as trained (D364, var/ml/models/nights-1-3-eval.json, sha256 dcdae3745b84...), every search knob is search-v2's. The match is COMPLETE when the match line says complete: true, all 1,200 games were played, and engine errors plus timeouts are at most 60 (one in 20). ADOPT the evaluator leaf into the next search version if the match is complete and the 95% interval on search-v2-evalleaf's score against search-v2 has its lower end above 0.5 (above 0 Elo). Otherwise NOT SHOWN: report the score and Elo with the interval. An interval that includes 0.5 is "not shown", never "no effect"; a match that stopped early gives no verdict. Reported beside it, deciding nothing: each side's searched and changed decisions by kind (p, a, b), its milliseconds per decision (p + a + b, and by kind), its budget fallbacks with their interval and its other fallbacks, and the evaluator's leaves and microseconds per leaf. A blended leaf (evaluator plus hand) is not part of this job: if it is ever tried, its one mix is chosen on the dev set first, in a job of its own
- outcome: failed (pilot: merged == 1 (merged = 0))
- headline: cm.played 0, cm.score 0, cm.lo 0, cm.hi 0, v.adopt 0
- summary: results/J128/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table f809f6a
- follow-up: template morning-read: not due (the job did not finish done)

## J130 FAILED: A3, the leak report: Justin's recurring mistakes in his own recorded games. Every decision of his seat that the post-game review covers (main-phase plays, attacks, blocks, targets) is graded by coach-grade.sh review in pool mode (D348), put into one kind by what he chose and what he saw, and judged by a rule written before grading (D438): a mistake is a regret interval above zero; a leak is at least 5 mistakes in at least 3 games with a mean regret whose 95% interval is above zero; everything else "not shown"

- finished: 2026-10-15T22:31:23-04:00
- decides: whether ForgeCoach shows the owner a "Your leaks" page (each leak's example moments linked to the replay), and from which kinds; nothing ships from this job by itself
- hypothesis: the data is small (on 2026-10-15: 14 games his for certain, 7 with decisions, 153 decisions planned, 95 main-phase plays, 30 attacks, 12 blocks, 16 targets), and the helper's own automatic reviews of five of these games (basic-lands knowledge, default budgets) found 3 clear mistakes in all, so the expected outcome is "not shown" for every kind, with the report saying how many games a verdict needs; a leak is possible only in a kind he meets often (main-phase plays) and only if his clear mistakes cluster there
- rule: written 2026-10-15 before any of his decisions was graded at J130's settings; D438 and tools/leaks/rule.ts RULE (copied into leaks.json). A decision is a MISTAKE when its regret interval excludes zero (regretLo > 0, the review's own "mistake"; touching zero is not). A kind is a LEAK when it has at least 5 mistakes, in at least 3 different games, and the 95% interval of its mean regret over ALL its graded decisions is above zero (a parametric game-cluster bootstrap: 10,000 resamples, seed 129, each decision's regret drawn from Normal(regret, (regretHi - regretLo)/3.92)). Everything else is NOT SHOWN. The kinds (classify.ts, by choice and context, never by the engine's answer, one kind a decision, in this order): a main-phase play he passed -> holding up vs tapping out; he cast with the opponent on 2+ untapped lands -> casting into open mana; he cast with 2+ different spells castable -> sequencing; he cast otherwise -> holding up vs tapping out; no attack while the opponent had no untapped creature -> not attacking when free; other attacks; a double block or a chump (printed P/T less damage) -> chump or double block; other blocks; targets. Land-late and keep-or-mulligan are listed as not graded (no grader covers them). The grading settings are fixed (rule.ts REVIEW: triage 60 s, every non-best decision deepened, 600 s of deepening a game, 5 options, seed 1). Nothing is tuned on these games; the checks hold the arithmetic, never the outcome
- outcome: failed (pilot: step pilot1 exited 1)
- headline: inv.decisions 0, rs.failed 0
- summary: results/J130/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 0c5de78
- follow-up: template morning-read: not due (the job did not finish done)

## J135 DONE: Synergy balance, measure and propose: an overnight evolve of ForgeCoach's Synergy Cube v2 (8 generations x 200 drafts, best of 3, exploration on, seeds 170,000,001+) on a proper seed pool (Omega's cards on Synergy's nine themes, 601 candidates, plus the cube's own 180 rows), with a fresh 300-draft batch of the input and of the final cube read by ForgeCoach's flatness.ts; nothing ships, Justin decides whether v3 does

- finished: 2026-10-16T01:56:50-04:00
- decides: whether the evolved Synergy list (synergy-cube-180.v3-candidate.md) is offered to Justin as v3. The lab measures and proposes; nothing here edits a cube in either repo. Justin decides whether v3 ships
- hypothesis: a handful of swaps, mostly dead cards (200 drafts a generation finds the dead; a dominant card by wins needs 400-600). The archetype spread (ForgeCoach's shipped meta: WB/WG tokens ~72-76%, UG ~29%, card true SD 8.9, archetype true SD 14.9 points) is expected NOT to narrow measurably: D377 tests a card's win rate against its own colour pairs' rate, so the loop removes card outliers within their colours and does not target the gap between archetypes (only fitBalance steers replacements toward the weak themes and colours), and at 300 drafts a batch the archetype true-SD intervals are about +-5 points wide
- rule: written 2026-10-15 before any J135 draft. A swap counts only as evolve decides it (D331 discovery then confirmation on fresh seeds, D357 pooled repeats); a discovery alone never counts. The comparison is the INPUT batch (300 fresh drafts of v2, seeds 172,000,001-300) against the FINAL batch (300 fresh drafts of the final cube, seeds 173,000,001-300), same settings, no exploration. Narrowed is SHOWN only when the final interval lies wholly below the input's: for card and archetype true SD, flatness.ts's compareCubes rule (true-SD 95% intervals do not overlap); for the max-min spread of the two-colour pairs with >= 40 decisive games, the 95% parametric-bootstrap interval of (final - input) lies wholly below 0. Overlap is NOT SHOWN, never "no change"; widened is read the same way. Generation 1's discovery batch (plain drafts only) is reported for the input as a description and decides nothing. No check is on the outcome. Justin decides whether v3 ships
- outcome: done
- headline: bm.swaps 0, bm.swaps_dead 0, bm.swaps_dominant_win 0, bm.swaps_dominant_pick 0, bm.pair_spread_before 0.3576, bm.pair_spread_after 0.425, bm.pair_spread_change_lo -0.058, bm.pair_spread_change_hi 0.2056, bm.arch_true_sd_before 0.1214, bm.arch_true_sd_after 0.1605, bm.card_true_sd_before 0.0639, bm.card_true_sd_after 0.0833, big.engine_error_rate 0.0019
- summary: results/J135/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 0c5de78, ForgeCoach 3e3b007
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J131 DONE: Search-v2 with the learned evaluator at its leaves: ONE fixed 1,200-game match (600 mirrored pairs, D398, the live 1.5 s budget) of search-v2-evalleaf (search-v2 whose unfinished rollouts are scored by evaluator v2's P(win) for the searching seat, D437) against search-v1-anytime (search-v2) on the confirm deck set, read on a 95% interval; no tuning

- finished: 2026-10-16T04:39:13-04:00
- decides: whether the next search version (search-v3) scores the leaves of its unfinished rollouts with the learned evaluator (D354's leaf=eval, evaluator v2) instead of the hand-written leaf
- hypothesis: the evaluator v2 judges a position with what the seat knows (a 731-card vocabulary covering every card of the confirm decks) where the hand leaf counts life, cards and Forge's card values, so it may steer search-v2's overrides better; against that, D354's gate 2 on v2 (J081) found no regret gain at the live horizon (hand - eval -0.0009 [-0.0063, +0.0047], 291 decisions) and J100 found v2 orders a decision's options slightly worse than the hand leaf (pairwise agreement 0.680 against 0.711), and the eval leaf changes Forge's answer more often (the 8-game smoke: 27% against 17%), so a score near 0.5 or below is as plausible as a gain; ADOPT is not the expected outcome
- rule: written 2026-10-15 before any J131 game was played. ONE fixed match (D398, no stopping rule): search-v2-evalleaf against search-v1-anytime (search-v2), 1,200 games (150 batches of 8, 600 mirrored pairs), the live 1.5 s wall-clock budget on both sides, on the confirm deck set (tools/ai-bench/pairs-confirm.txt, 34 deck pairs never tuned on), this host's match seed blocks from 114,900,000 (the matchup has never been played, so 114,900,000-114,900,149: the deals of J115's and J125's confirmations), read from var/ai-ladder/match-J131.json alone. Nothing is tuned: the evaluator is v2 as trained (D364, var/ml/models/nights-1-3-eval.json, sha256 dcdae3745b84...), every search knob is search-v2's. The match is COMPLETE when the match line says complete: true, all 1,200 games were played, and engine errors plus timeouts are at most 60 (one in 20). ADOPT the evaluator leaf into the next search version if the match is complete and the 95% interval on search-v2-evalleaf's score against search-v2 has its lower end above 0.5 (above 0 Elo). Otherwise NOT SHOWN: report the score and Elo with the interval. An interval that includes 0.5 is "not shown", never "no effect"; a match that stopped early gives no verdict. Reported beside it, deciding nothing: each side's searched and changed decisions by kind (p, a, b), its milliseconds per decision (p + a + b, and by kind), its budget fallbacks with their interval and its other fallbacks, and the evaluator's leaves and microseconds per leaf. A blended leaf (evaluator plus hand) is not part of this job: if it is ever tried, its one mix is chosen on the dev set first, in a job of its own
- outcome: done
- headline: cm.played 1200, cm.score 0.5125, cm.lo 0.4933, cm.hi 0.5317, cm.elo 8.7, cm.eloLo -4.7, cm.eloHi 22.1, cm.aSearch.msPerDecision 772.407, cm.bSearch.msPerDecision 767.034, cm.aSearch.evalLeafUs 122.91, v.adopt 0
- summary: results/J131/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 0c5de78
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J132 DONE: A3, the leak report: Justin's recurring mistakes in his own recorded games. Every decision of his seat that the post-game review covers (main-phase plays, attacks, blocks, targets) is graded by coach-grade.sh review in pool mode (D348), put into one kind by what he chose and what he saw, and judged by a rule written before grading (D438): a mistake is a regret interval above zero; a leak is at least 5 mistakes in at least 3 games with a mean regret whose 95% interval is above zero; everything else "not shown"

- finished: 2026-10-16T05:33:09-04:00
- decides: whether ForgeCoach shows the owner a "Your leaks" page (each leak's example moments linked to the replay), and from which kinds; nothing ships from this job by itself
- hypothesis: the data is small (on 2026-10-15: 14 games his for certain, 7 with decisions, 153 decisions planned, 95 main-phase plays, 30 attacks, 12 blocks, 16 targets), and the helper's own automatic reviews of five of these games (basic-lands knowledge, default budgets) found 3 clear mistakes in all, so the expected outcome is "not shown" for every kind, with the report saying how many games a verdict needs; a leak is possible only in a kind he meets often (main-phase plays) and only if his clear mistakes cluster there
- rule: written 2026-10-15 before any of his decisions was graded at J132's settings; D438 and tools/leaks/rule.ts RULE (copied into leaks.json). A decision is a MISTAKE when its regret interval excludes zero (regretLo > 0, the review's own "mistake"; touching zero is not). A kind is a LEAK when it has at least 5 mistakes, in at least 3 different games, and the 95% interval of its mean regret over ALL its graded decisions is above zero (a parametric game-cluster bootstrap: 10,000 resamples, seed 129, each decision's regret drawn from Normal(regret, (regretHi - regretLo)/3.92)). Everything else is NOT SHOWN. The kinds (classify.ts, by choice and context, never by the engine's answer, one kind a decision, in this order): a main-phase play he passed -> holding up vs tapping out; he cast with the opponent on 2+ untapped lands -> casting into open mana; he cast with 2+ different spells castable -> sequencing; he cast otherwise -> holding up vs tapping out; no attack while the opponent had no untapped creature -> not attacking when free; other attacks; a double block or a chump (printed P/T less damage) -> chump or double block; other blocks; targets. Land-late and keep-or-mulligan are listed as not graded (no grader covers them). The grading settings are fixed (rule.ts REVIEW: triage 60 s, every non-best decision deepened, 600 s of deepening a game, 5 options, seed 1). Nothing is tuned on these games; the checks hold the arithmetic, never the outcome
- outcome: done
- headline: lk.leaks 0, lk.gamesGraded 7, lk.decisions 103, lk.mistakes 5, inv.decisions 153, rs.failed 0
- summary: results/J132/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 0c5de78
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J138 FAILED: Evaluator-leaf confirmation: one 4,800-game match (2,400 mirrored pairs, fresh deals) at the live 1.5 s budget, search-v2-evalleaf (D437) vs search-v2 (search-v1-anytime) on the confirm deck set, read alone on a 95% interval; Justin asked for it after J131's +8.7 Elo [-4.7, +22.1]

- finished: 2026-10-16T08:46:23-04:00
- decides: whether the next search version (search-v3) scores the leaves of its unfinished rollouts with the learned evaluator (D354's leaf=eval, evaluator v2) instead of the hand-written leaf
- hypothesis: J131 measured +8.7 Elo [-4.7, +22.1] over 600 pairs (0.5125 [0.4933, 0.5317]); if that is real, a fresh match four times the size (about ±5 Elo) puts the lower end above 0. Before J131: the evaluator v2 judges a position with what the seat knows (a 731-card vocabulary covering every card of the confirm decks) where the hand leaf counts life, cards and Forge's card values, so it may steer search-v2's overrides better; against that, D354's gate 2 on v2 (J081) found no regret gain at the live horizon (hand - eval -0.0009 [-0.0063, +0.0047], 291 decisions) and J100 found v2 orders a decision's options slightly worse than the hand leaf (pairwise agreement 0.680 against 0.711), and the eval leaf changes Forge's answer more often (the 8-game smoke: 27% against 17%), so a score near 0.5 or below is as plausible as a gain; ADOPT is not the expected outcome
- rule: written 2026-10-16 before any J138 game was played. ONE fixed match (D398, no stopping rule): search-v2-evalleaf against search-v1-anytime (search-v2), 4,800 games (600 batches of 8, 2,400 mirrored pairs), the live 1.5 s wall-clock budget on both sides, on the confirm deck set (tools/ai-bench/pairs-confirm.txt, 34 deck pairs never tuned on), on fresh deals: `match` takes the matchup's next unused seed blocks (D398), after J131's 114,900,000-114,900,149, so no J131 deal repeats; read from var/ai-ladder/match-J138.json alone (J131's games are not pooled in: J138 is the confirmation, as J116 was for J115). Nothing is tuned: the evaluator is v2 as trained (D364, var/ml/models/nights-1-3-eval.json, sha256 dcdae3745b84...), every search knob is search-v2's. The match is COMPLETE when the match line says complete: true, all 4,800 games were played, and engine errors plus timeouts are at most 240 (one in 20). ADOPT the evaluator leaf into the next search version if the match is complete and the 95% interval on search-v2-evalleaf's score against search-v2 has its lower end above 0.5 (above 0 Elo). Otherwise NOT SHOWN: report the score and Elo with the interval. An interval that includes 0.5 is "not shown", never "no effect"; a match that stopped early gives no verdict. Reported beside it, deciding nothing: each side's searched and changed decisions by kind (p, a, b), its milliseconds per decision (p + a + b, and by kind), its budget fallbacks with their interval and its other fallbacks, and the evaluator's leaves and microseconds per leaf. A blended leaf (evaluator plus hand) is not part of this job: if it is ever tried, its one mix is chosen on the dev set first, in a job of its own
- outcome: failed (pilot: step pilot3 exited 1)
- headline: cm.played 0, cm.score 0, cm.lo 0, cm.hi 0, v.adopt 0
- summary: results/J138/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 0c9bab7
- follow-up: template morning-read: not due (the job did not finish done)

## J133 DONE: Cube populations compared for balance (D441): Synergy v2 (ForgeCoach's current document), Synergy v1 (mtg-table's file), Omega, Fair Fight and Synergy v2 with 17 lands forced in the lab builder, 600 grid drafts each on the SAME seed block (833,000,001-833,000,600), best of three, Default vs Default, unrecorded; tools/cubelab.sh compare's pre-registered measures with paired draft-clustered bootstrap intervals, no verdict rule

- finished: 2026-10-16T11:21:34-04:00
- decides: which cube population tends towards the more balanced AI deck builds (Justin, 2026-10-15): a measurement for the owner and the cloud to read, not a switch
- hypothesis: none to confirm. Synergy v1 and v2 differ by three cards (Skullclamp, Ledger Shredder, Man-o'-War out; Yawgmoth, Reanimate, Murderous Redcap in), so their differences should be small and mostly not shown; the 17-land variant draws the same deals as v2 and changes only the builder's 16-land choice (about a quarter to a third of Synergy decks), so its deck-health rows move and its balance rows probably do not; Omega (powered) and Fair Fight (flat by design) are the cubes most likely to differ from Synergy
- rule: D441, written 2026-10-15 before any J133 draft: the measures are compare's eleven (flatness, pair_spread, pair_within5, draw_rate, timeout_rate, game_turns, lands, colours, two_colour, splash, first_pick_top10), each with a 95% paired draft-clustered bootstrap interval (1,000 replicates, boot seed 1, colour pairs with 30+ decisive games); NO verdict rule is given. The report ranks the populations on each measure with their intervals and lists the pairwise differences whose interval excludes 0; it calls no population better or more balanced
- outcome: done
- headline: cmp.pop.synergy.m.flatness.est 0.0783, cmp.pop.synergy_v1.m.flatness.est 0.075, cmp.pop.omega.m.flatness.est 0, cmp.pop.fair_fight.m.flatness.est 0.0359, cmp.pop.synergy_17.m.flatness.est 0.0839, cmp.drafts 600, cmp.same_seeds 1
- summary: results/J133/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 0c9bab7, ForgeCoach 3e3b007
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J134 DONE: Which drafter drafts best? Three challengers each against the cube lab's own drafter, mirrored seats on the same seeds, the lab builder for both, Forge Default piloting both decks, best of 3: Forge's ranks (FL, D439) on Vintage 180, Synergy and Evan's Twobert, 600 drafts a cube; the human-pick model (HL, D416) on Vintage and Synergy, 300 drafts a cube (J114's replication); Claude Sonnet (LL, D439) on Vintage, 100 drafts, ONLY with Justin's spend approval (LAB_LLM_SPEND_OK=1), otherwise skipped

- finished: 2026-10-16T12:34:25-04:00
- decides: which of the lab's drafters (the lab drafter, Forge's ranks, the human-pick model and, if Justin approves the spend, Sonnet) a follow-up offers in ForgeCoach's Draft vs Bot, and whether the lab drafter stays the default; this job changes nothing itself
- hypothesis: the lab drafter adds theme synergy, a colour lean and a late commit to the same Forge ranks (Vintage's ratings are Forge's ranks but for one card; Twobert has no ratings file and no themes), so against Forge's ranks it should win slightly on Vintage and Synergy, where the synergy term has themes to count, and be close on Twobert, where only the lean and the commit differ; the human-pick model lost to it on Vintage in J114 (47.8% [45.7, 49.9]) and was not shown on Synergy (50.7% [47.6, 53.8]), and 300 drafts a cube can only show a difference of about 6 points or more; an LLM that reads the cards may draft coherent two-colour pools, but Forge's AI pilots both decks, so card quality Forge plays badly does not pay, and 100 drafts can only show a difference of about 10 points
- rule: written 2026-10-15 before any J134 game was played (j134.py's header). Each arm pits a challenger against the lab drafter on the same seeds twice, <arm>A (challenger at seat A) and <arm>B (challenger at B), both seats Forge Default, best of 3, the lab builder and the cube's ratings (Twobert: Forge's ranks, no ratings file). Outcome per arm and cube: the challenger's match win rate pooled over both folders (won 1, lost 0, drawn 0.5; engine-error matches left out and counted); 95% interval by cluster bootstrap over seeds (a seed's matches in both folders together), 10,000 resamples, numpy default_rng(20261015), percentile. A drafter BEATS another when its 95% interval on match win rate lies entirely above 0.5: the challenger BEATS the lab drafter when the interval is above 0.5 (code 1); the lab drafter BEATS the challenger when it is below 0.5 (code -1); otherwise NOT SHOWN (code 0), never "no difference". An arm without every planned seed in both seats gives no verdict (INCOMPLETE, code 8); the LLM arm not run is SKIPPED (code 9). Reported per cube: Vintage 180, Synergy, Evan's Twobert (the lab drops Twobert's 4 cards Forge 2.0.14 lacks). Nothing is tuned on these seeds
- outcome: done
- headline: jr.fl_vintage_rate 0.5376, jr.fl_vintage_code 0, jr.fl_synergy_rate 0.5275, jr.fl_synergy_code 0, jr.fl_twobert_rate 0.495, jr.fl_twobert_code 0, jr.hl_vintage_rate 0.5133, jr.hl_vintage_code 0, jr.hl_synergy_rate 0.5418, jr.hl_synergy_code 0, jr.ll_ran 0
- summary: results/J134/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 0c9bab7, ForgeCoach 2f05b15
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J136 DONE: The best 180 out of the whole library -- four candidate cubes (Omega, library hits by lab rating, a seeded random control, ForgeCoach's Synergy v2) compared on D439's measures: 400 grid drafts each on one seed block (836,000,001-836,000,400), then each evolved 2 generations x 200 drafts from the 1,592-card library pool (Omega with its own notes; the others cut the Power Nine, Sol Ring and Library of Alexandria wherever present and never add Omega's other 43 design exclusions; exploration on), then the four evolved cubes compared on a fresh block (836,100,001-836,100,400); best of three, Default vs Default, unrecorded; no verdict rule

- finished: 2026-10-16T14:47:37-04:00
- decides: which way of seeding a 180-card cube from the whole library (Omega's design, the lab's greatest hits, an unselected random draw, the Synergy design) gives the more balanced AI drafts, before and after two generations of evolve from the same pool (Justin, 2026-10-15: "treat the entire library as one cube", approved as this comparison): a measurement for the owner and the cloud to read, not a switch
- hypothesis: none to confirm. The random control should be the least balanced on card flatness (nothing selected it; 62 of its cards have no lab data and three are AI:RemoveDeck:All), and hits may be flatter than Omega on cards but not on colour pairs (it was chosen card by card, from metas of cubes with different power levels, with Ancestral Recall, Time Walk and two Moxen among its picks, which the evolve's POWER notes then cut). Two 200-draft generations swap at most 6 cards a generation (dead cards, mostly), so the evolved cubes should differ from their inputs by a few cards and their tables by little
- rule: D439 measures, written 2026-10-16 before any J136 draft. NO verdict rule: no --rule is passed. Per table (baseline, final) the summary reports, for each of the five pre-registered measure groups (flatness; pair_spread and pair_within5; draw_rate, timeout_rate and game_turns; lands, colours, two_colour and splash; first_pick_top10), every population's estimate with its 95% paired draft-clustered bootstrap interval (1,000 replicates, boot seed 1, colour pairs with 30+ decisive games), and every pairwise difference whose interval excludes 0, with its size. Before against after is read only as two intervals side by side, never as a test: the two tables are on different seed blocks and different cube lists. The swaps each evolve made are reported as evolve decided them (D331 discovery then confirmation, D357), with their evidence
- outcome: done
- headline: base.pop.omega.m.flatness.est 0, base.pop.hits.m.flatness.est 0, base.pop.random.m.flatness.est 0, base.pop.synergy.m.flatness.est 0.0806, fin.pop.omega.m.flatness.est 0, fin.pop.hits.m.flatness.est 0, fin.pop.random.m.flatness.est 0.0217, fin.pop.synergy.m.flatness.est 0.0784, sw.swaps 5, all.engine_error_rate 0.0014
- summary: results/J136/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 0c9bab7, ForgeCoach 3e3b007
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J137 DONE: Synergy v2 against the designed v3, head to head under the design study's pre-registered rule: ForgeCoach's v2 (3e3b007b, sha-checked) and results/J135/synergy-cube-180.v3-designed.md (pc-results 8ac778d1, sha-checked; 8 swaps), tools/cubelab.sh compare on the SAME 1,500 seeds (837,000,001-837,001,500), grid, best of three, Default vs Default, Forge's ranks, no exploration, unrecorded; runs only when results/J135/APPROVED exists

- finished: 2026-10-16T16:40:10-04:00
- decides: whether the designed Synergy v3 (8 swaps, pc-results study/synergy-v3-design.md) is shown better balanced than v2 for the lab's AI, by the study's rule; a pass ships nothing -- Justin decides whether v3 ships
- hypothesis: the study (section 3) guesses the pair spread falls from about 38.7 points to about 28-34, with blue up 4-8 points and white down 2-6; its power calculation (section 4) says 1,500 drafts a side barely separates a v3 30% flatter (v2 [38.6, 48.1], v3 [26.6, 36.2]), 300 cannot
- rule: synergy-v3-design.md section 4, written 2026-10-16 before any v3 draft, as written there: v3 is BETTER BALANCED iff v3's pair-spread 95% interval lies wholly below v2's (v3's upper bound < v2's lower bound), AND no v3 pair with >= 40 decisive games has a Wilson 95% interval wholly below 35%. Anything else is NOT SHOWN, never "no change". Pair spread = max - min over the two-colour pairs with >= 40 decisive games in that cube's batch; its interval is D441 compare's paired draft-clustered bootstrap (1,000 replicates, boot seed 1; compare is merged code here, so the study's fallback, balance.mts, is not used). The pair Wilson interval carries the study's design effect 1.25 (its stated convention for rates; the plain interval is reported beside it). The paired difference and every pair's rate are description and decide nothing
- outcome: done
- headline: vv.verdict.better_balanced 0, vv.verdict.decided 1, vv.spread.v2.est 0.3894, vv.spread.v2.lo 0.3369, vv.spread.v3.est 0.2715, vv.spread.v3.hi 0.3507, vv.verdict.low_pairs 0, all.engine_error_rate 0.0013
- summary: results/J137/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 0c9bab7, ForgeCoach 3e3b007
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J139 DONE: Evaluator-leaf confirmation: one 4,800-game match (2,400 mirrored pairs, fresh deals) at the live 1.5 s budget, search-v2-evalleaf (D437) vs search-v2 (search-v1-anytime) on the confirm deck set, read alone on a 95% interval; Justin asked for it after J131's +8.7 Elo [-4.7, +22.1]

- finished: 2026-10-17T01:29:26-04:00
- decides: whether the next search version (search-v3) scores the leaves of its unfinished rollouts with the learned evaluator (D354's leaf=eval, evaluator v2) instead of the hand-written leaf
- hypothesis: J131 measured +8.7 Elo [-4.7, +22.1] over 600 pairs (0.5125 [0.4933, 0.5317]); if that is real, a fresh match four times the size (about ±5 Elo) puts the lower end above 0. Before J131: the evaluator v2 judges a position with what the seat knows (a 731-card vocabulary covering every card of the confirm decks) where the hand leaf counts life, cards and Forge's card values, so it may steer search-v2's overrides better; against that, D354's gate 2 on v2 (J081) found no regret gain at the live horizon (hand - eval -0.0009 [-0.0063, +0.0047], 291 decisions) and J100 found v2 orders a decision's options slightly worse than the hand leaf (pairwise agreement 0.680 against 0.711), and the eval leaf changes Forge's answer more often (the 8-game smoke: 27% against 17%), so a score near 0.5 or below is as plausible as a gain; ADOPT is not the expected outcome
- rule: written 2026-10-16 before any J139 game was played. ONE fixed match (D398, no stopping rule): search-v2-evalleaf against search-v1-anytime (search-v2), 4,800 games (600 batches of 8, 2,400 mirrored pairs), the live 1.5 s wall-clock budget on both sides, on the confirm deck set (tools/ai-bench/pairs-confirm.txt, 34 deck pairs never tuned on), on fresh deals: `match` takes the matchup's next unused seed blocks (D398), after J131's 114,900,000-114,900,149, so no J131 deal repeats; read from var/ai-ladder/match-J139.json alone (J131's games are not pooled in: J139 is the confirmation, as J116 was for J115). Nothing is tuned: the evaluator is v2 as trained (D364, var/ml/models/nights-1-3-eval.json, sha256 dcdae3745b84...), every search knob is search-v2's. The match is COMPLETE when the match line says complete: true, all 4,800 games were played, and engine errors plus timeouts are at most 240 (one in 20). ADOPT the evaluator leaf into the next search version if the match is complete and the 95% interval on search-v2-evalleaf's score against search-v2 has its lower end above 0.5 (above 0 Elo). Otherwise NOT SHOWN: report the score and Elo with the interval. An interval that includes 0.5 is "not shown", never "no effect"; a match that stopped early gives no verdict. Reported beside it, deciding nothing: each side's searched and changed decisions by kind (p, a, b), its milliseconds per decision (p + a + b, and by kind), its budget fallbacks with their interval and its other fallbacks, and the evaluator's leaves and microseconds per leaf. A blended leaf (evaluator plus hand) is not part of this job: if it is ever tried, its one mix is chosen on the dev set first, in a job of its own
- outcome: done
- headline: cm.played 4800, cm.score 0.5031, cm.lo 0.4933, cm.hi 0.513, cm.elo 2.2, cm.eloLo -4.7, cm.eloHi 9, cm.aSearch.msPerDecision 907.116, cm.bSearch.msPerDecision 909.544, cm.aSearch.evalLeafUs 158.275, v.adopt 0
- summary: results/J139/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 0c9bab7
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J140 DONE: The deck census, night 1 -- per power band (pauper, peasant, legacy, powered) 2,500 40-card decks drawn straight from the band's pool at random colour makeups (cubelab.sh decks, D447: k colours uniform on 1-5, flat Dirichlet shares, cards uniform within the shares, one land formula, every spell castable, a 10% cross-band slice inside each deck; deck seeds 1401-1404), each deck in exactly 16 Bo1 games against random decks of its band (census-play, 20,000 games a band, 80,000 in all; game seeds S x 1,000,000 + g), Default vs Default, numbers only; the win rate across the colour spectrum and per-card rows reported, no verdict

- finished: 2026-10-17T12:05:19-04:00
- decides: nothing by itself. It is the census's first data: how win rate moves across the colour spectrum in each band, and each card's rate in context, for Justin to read and for Phase 3's model to learn from. Any surprise is a candidate until it holds on fresh seeds (D447 point 9)
- hypothesis: none to confirm, and none is tested. Read the Forge pilot's known bias first: it plays aggro well and control poorly. Uniform draws with no curve rule give clunky decks, more so in legacy, whose pool's mean mana value is high (most legacy decks land on 18 lands), so the band rates are rates of random decks as Forge plays them, not of built decks: every rate and every card value is "in a random deck of this makeup" (D447 point 10). Within a band every decisive game is one win and one loss, so the band's own rate is 0.5 by construction and the bins are read against it
- rule: D447, written 2026-10-16 before any census game. The prior, the draw, the land formula, castability, the bands, the pairing and the read are the decision's points 1-8. There is no verdict rule and no label beyond the bins. Point 9 is the confirmation rule: any difference reported (a bin, a card, a combination) is a candidate until it holds on a fresh deck seed and a fresh game seed under the same method, read on the same interval
- outcome: done
- headline: played 80000, engine_errors 3, redraws.pauper 0, redraws.peasant 0, redraws.legacy 0, redraws.powered 0, sp.bands.pauper.byColours.1.wr 0.5739, sp.bands.peasant.byColours.1.wr 0.5993, sp.bands.legacy.byColours.1.wr 0.5972, sp.bands.powered.byColours.1.wr 0.5926, cards 4271
- summary: results/J140/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 2e107b6
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J141 DONE: The pilot slice -- search-v2 as the deck census's pilot: 2,000 of J140's games (500 a band, stratified by the two decks' colour counts, slice seed 1411) replayed with search-v2 on both sides (arm S, 2,000 games) and Forge against search-v2 with sides swapped (arm M, 4,000 games), census-play --replay, numbers only; five pre-registered reads (win rate by colour under each pilot, the card-flow coefficient under each, per-card ratings and their rank correlation, search's edge by deck profile, search's own counters), no verdict

- finished: 2026-10-19T06:23:17-04:00
- decides: nothing by itself. It is exploration, asked by Justin: does Forge's AI, the census's pilot, undersell blue and card draw, and which cards move when search-v2 pilots the same decks in the same games. Any difference it shows is a candidate until it holds on a fresh slice (D447 point 9)
- hypothesis: none to confirm, and none is tested. The Synergy v3 study (pc-results study/synergy-v3-design.md) found each of its 17 card-flow cards costs -2.9 points [-3.7, -2.1] of win share under Forge, colours held fixed, and that card flow accounts for all of blue's deficit there; the question is whether that is the cards or the pilot. Search-v2 is Forge's AI with a rollout search on top (it changed Forge's answer at 18% of searched decisions in J131), so it inherits Forge's play inside its rollouts and is not an independent pilot
- rule: exploration; the method below (the slice, the arms, the five reads and their estimators) is pre-registered, written 2026-10-16 before any slice game. There is no outcome rule and no verdict. D447 point 9 applies: a difference reported here (a colour, a coefficient, a card) is a candidate until it holds on a fresh slice (a fresh slice seed over fresh census seeds), same method, read on the same interval
- outcome: done
- headline: played 6000, engine_errors 25, pj.read1.byMainColour.U.diff.est -0.0063, pj.read2.diff.beta -0.4156, pj.read3.spearman.shrunk.rho 0.6145, pj.read4.all.edge.est 0.5887, pj.read5.ss.msPerDecision 769.1584
- summary: results/J141/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 2e107b6
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J142 FAILED: The move atlas, first full run -- one deck pair chosen by rule from the ladder's confirm set (pairs-confirm line with the most ladder games and the most even record, D451), seed 451; phase A 10,000 games from the opening with BOTH seats the random seat under D451's mechanical guardrails; phase B, at every one of seat A's 15 decisions in the Forge-vs-Forge baseline, every option forked and played out 200 times with both seats random and 40 times with Forge on both; everything recorded (rows, ledger, frame logs) and checked; the two regret maps side by side. Method only, no outcome rule

- finished: 2026-10-19T06:33:46-04:00
- decides: nothing by itself. It is the first full move atlas: how often and how strongly the random map and Forge's map of the same decisions agree, reported with intervals, for Justin to read ("what we'd gain")
- hypothesis: none to confirm, and none is tested. The smoke (50 rollouts, 3 decisions at 16 + 8 branches) is too small to say anything about agreement: every interval straddles the other
- rule: D451, written 2026-10-16 before this run: the guardrails (point 2), the pair rule (point 3), the fork and its checks (points 5-6) and the arithmetic (point 7). Method only: no pass/fail rule on what the maps say; the agreement is reported with intervals. The only checks are mechanical (the pilot's and the final ones below)
- outcome: failed (prepare: step prepare exited 128 after 7 retries over 10 min: git could not reach the remote (fatal: could not read Username for 'https://github.com': No such device or address))
- headline: played_a 0, branches 0, atlas.problems -1
- summary: results/J142/summary.md (the PC session's; judge it against the rule)
- follow-up: template morning-read: not due (the job did not finish done)

## J143 FAILED: The move atlas, first full run -- one deck pair chosen by rule from the ladder's confirm set (pairs-confirm line with the most ladder games and the most even record, D451), seed 451; phase A 10,000 games from the opening with BOTH seats the random seat under D451's mechanical guardrails; phase B, at every one of seat A's 15 decisions in the Forge-vs-Forge baseline, every option forked and played out 200 times with both seats random and 40 times with Forge on both; everything recorded (rows, ledger, frame logs) and checked; the two regret maps side by side. Method only, no outcome rule

- finished: 2026-10-21T15:40:01-04:00
- decides: nothing by itself. It is the first full move atlas: how often and how strongly the random map and Forge's map of the same decisions agree, reported with intervals, for Justin to read ("what we'd gain")
- hypothesis: none to confirm, and none is tested. The smoke (50 rollouts, 3 decisions at 16 + 8 branches) is too small to say anything about agreement: every interval straddles the other
- rule: D451, written 2026-10-16 before this run: the guardrails (point 2), the pair rule (point 3), the fork and its checks (points 5-6) and the arithmetic (point 7). Method only: no pass/fail rule on what the maps say; the agreement is reported with intervals. The only checks are mechanical (the pilot's and the final ones below)
- outcome: failed (timeout: step run1 ran past 32400 s)
- headline: played_a 10000, branches 19193, atlas.problems -1
- summary: results/J143/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 3051b41
- follow-up: template morning-read: not due (the job did not finish done)

## J144 ABORTED: The deck census, night 2 -- D447 unchanged on fresh seeds (decks and games 1501-1504, one a band; pilot games 1591-1594), 2,500 decks a band, each in 16 Bo1 games against random decks of its band (20,000 games a band, 80,000 in all; game seeds S x 1,000,000 + g), Forge Default both seats, the first RECORDED census night (census-play --record rows: both seats' decision rows and a per-turn ledger, under LAB_DATA_DIR=/home/justin-a/code/lab/data); then the pre-registered confirmation (D447 point 9) of night 1's three candidates per band -- (i) colours-with-3+ bin 1 above 0.5, (ii) bins 4 and 5 below 0.5, (iii) mono minus the < 0.4 main-share bin above 0 -- each HOLDS or NOT SHOWN on night 2's own deck-clustered bootstrap

- finished: 2026-10-21T15:42:35-04:00
- decides: whether each of night 1's three colour-count candidates HOLDS in each band on fresh seeds (D447 point 9), pre-registered below: twelve verdicts (3 candidates x 4 bands), each holds or not shown. Nothing is promoted, removed or re-banded by this job; a candidate that holds stops being a candidate and becomes a finding "in a random deck of this makeup, as Forge's AI plays it". It is also the census's first recorded night: 80,000 games of both seats' decision rows for Phase 3
- hypothesis: night 1 (J140, seeds 1401-1404) found in every band: decks with one colour of 3+ spells won .574-.599 (every interval above .5); four colours .393-.415 and five .341-.400 (every interval below .5); mono minus < .4 main share about +.18 to +.21. If those are properties of random decks of these makeups under Forge's AI and not of night 1's seeds, all twelve hold on night 2 (night 1's intervals clear the null by .06 or more, so the power is high); a candidate that is not shown is the method working, not a failure
- rule: the confirmation rule (D447 point 9), registered by the cloud on 2026-10-19 23:20 UTC and written here before any night-2 game. Per band, on night 2's data alone: (i) the colours-with-3+ bin 1 cell above 0.5; (ii) the bins 4 AND 5 cells below 0.5 (both must hold); (iii) the mono (main share 1.0) cell minus the < 0.4 main-share cell above 0. A candidate HOLDS in a band when night 2's 95% interval excludes the null (0.5, 0.5 and 0.5, 0) in night 1's direction (above, below, above); otherwise NOT SHOWN. The interval is the one night 1 was read on: census-read's deck-clustered percentile bootstrap (censusread.ts cellOf, 1,000 replicates, --boot-seed 1) -- for (i) and (ii) census-read's own interval from night 2's spectrum.json; for (iii), whose difference census-read does not report, cellOf's scheme applied to each of the two cells (disjoint decks) and the percentile interval of the replicate differences, by the job's confirm.py, which re-derives every cell census-read reported and must equal its point estimates and fall within 0.02 of its intervals. No pooling with night 1 for the verdict; the pooled numbers (both nights' decks and games, the same estimator) are information only. cards.tsv is reported, not confirmed (Phase 3). No multiple-comparison correction is applied to the twelve verdicts: each is reported on its own, and the report says so
- outcome: aborted (aborted: data_free_gb < 50 (data_free_gb = 0))
- headline: played 0, engine_errors 0, data_used_gb 0
- summary: results/J144/summary.md (the PC session's; judge it against the rule)
- follow-up: template morning-read: not due (the job did not finish done)

## J148 FAILED: RESUME of J143 (second try as J148: J146 was OOM-killed at 7 workers beside the GPU lane; phase B workers measure ~2.8 GB, so mem 3 and no GPU lane beside it) (its folder var/lab-j142 kept: phase A done, 237 of 490 phase-B units done; no clean) -- The move atlas, first full run -- one deck pair chosen by rule from the ladder's confirm set (pairs-confirm line with the most ladder games and the most even record, D451), seed 451; phase A 10,000 games from the opening with BOTH seats the random seat under D451's mechanical guardrails; phase B, at every one of seat A's 15 decisions in the Forge-vs-Forge baseline, every option forked and played out 200 times with both seats random and 40 times with Forge on both; everything recorded (rows, ledger, frame logs) and checked; the two regret maps side by side. Method only, no outcome rule

- finished: 2026-10-22T00:10:08-04:00
- decides: nothing by itself. It is the first full move atlas: how often and how strongly the random map and Forge's map of the same decisions agree, reported with intervals, for Justin to read ("what we'd gain")
- hypothesis: none to confirm, and none is tested. The smoke (50 rollouts, 3 decisions at 16 + 8 branches) is too small to say anything about agreement: every interval straddles the other
- rule: D451, written 2026-10-16 before this run: the guardrails (point 2), the pair rule (point 3), the fork and its checks (points 5-6) and the arithmetic (point 7). Method only: no pass/fail rule on what the maps say; the agreement is reported with intervals. The only checks are mechanical (the pilot's and the final ones below)
- outcome: failed (step run1 exited 3)
- headline: played_a 10000, branches 40356, atlas.problems -1
- summary: results/J148/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 60252b3
- follow-up: template morning-read: not due (the job did not finish done)

## J149 FAILED: The deck census, night 2 -- D447 unchanged on fresh seeds (decks and games 1501-1504, one a band; pilot games 1591-1594), 2,500 decks a band, each in 16 Bo1 games against random decks of its band (20,000 games a band, 80,000 in all; game seeds S x 1,000,000 + g), Forge Default both seats, the first RECORDED census night (census-play --record rows: both seats' decision rows and a per-turn ledger, under LAB_DATA_DIR=/home/justin-a/code/lab/data); then the pre-registered confirmation (D447 point 9) of night 1's three candidates per band -- (i) colours-with-3+ bin 1 above 0.5, (ii) bins 4 and 5 below 0.5, (iii) mono minus the < 0.4 main-share bin above 0 -- each HOLDS or NOT SHOWN on night 2's own deck-clustered bootstrap

- finished: 2026-10-22T09:06:37-04:00
- decides: whether each of night 1's three colour-count candidates HOLDS in each band on fresh seeds (D447 point 9), pre-registered below: twelve verdicts (3 candidates x 4 bands), each holds or not shown. Nothing is promoted, removed or re-banded by this job; a candidate that holds stops being a candidate and becomes a finding "in a random deck of this makeup, as Forge's AI plays it". It is also the census's first recorded night: 80,000 games of both seats' decision rows for Phase 3
- hypothesis: night 1 (J140, seeds 1401-1404) found in every band: decks with one colour of 3+ spells won .574-.599 (every interval above .5); four colours .393-.415 and five .341-.400 (every interval below .5); mono minus < .4 main share about +.18 to +.21. If those are properties of random decks of these makeups under Forge's AI and not of night 1's seeds, all twelve hold on night 2 (night 1's intervals clear the null by .06 or more, so the power is high); a candidate that is not shown is the method working, not a failure
- rule: the confirmation rule (D447 point 9), registered by the cloud on 2026-10-19 23:20 UTC and written here before any night-2 game. Per band, on night 2's data alone: (i) the colours-with-3+ bin 1 cell above 0.5; (ii) the bins 4 AND 5 cells below 0.5 (both must hold); (iii) the mono (main share 1.0) cell minus the < 0.4 main-share cell above 0. A candidate HOLDS in a band when night 2's 95% interval excludes the null (0.5, 0.5 and 0.5, 0) in night 1's direction (above, below, above); otherwise NOT SHOWN. The interval is the one night 1 was read on: census-read's deck-clustered percentile bootstrap (censusread.ts cellOf, 1,000 replicates, --boot-seed 1) -- for (i) and (ii) census-read's own interval from night 2's spectrum.json; for (iii), whose difference census-read does not report, cellOf's scheme applied to each of the two cells (disjoint decks) and the percentile interval of the replicate differences, by the job's confirm.py, which re-derives every cell census-read reported and must equal its point estimates and fall within 0.02 of its intervals. No pooling with night 1 for the verdict; the pooled numbers (both nights' decks and games, the same estimator) are information only. cards.tsv is reported, not confirmed (Phase 3). No multiple-comparison correction is applied to the twelve verdicts: each is reported on its own, and the report says so
- outcome: failed (check: cf.check.estimatesEqual == cf.check.cellsCompared (cf.check.estimatesEqual = 51, cf.check.cellsCompared = 52))
- headline: played 80000, engine_errors 0, cf.summary.holds 12, cf.summary.notShown 0, cf.summary.holdsByCandidate.i 4, cf.summary.holdsByCandidate.ii 4, cf.summary.holdsByCandidate.iii 4, rec.rowsKbMean 58.9, data_used_gb 4.93
- summary: results/J149/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 60252b3
- follow-up: template morning-read: not due (the job did not finish done)

## J145 DONE: Is Omega balanced by colour? Three arms on the Omega 180, Forge Default piloting every game: (A) PULL -- grid drafts by three drafters, each against the lab drafter, 600 drafts each for the human-pick model and Forge's ranks, 2,000 lab-vs-lab drafts (seeds 814,500,001 and up), and the share of each drafter's two-colour decks holding each colour (target 2/5), reported, not judged tonight; (B) PAYOFF -- each draft's two decks played against each other twice, each on the play once (census-play --replay, Bo1, recorded rows), and each colour's win rate in games between decks that differ in it (target 0.5), judged on the lab-vs-lab drafts; (C) the pool's own payoff -- 2,000 decks drawn from Omega's list by decks --cube (D456: k on 1-3, D447's land and castability rules, the repeat cap reported) in 8,000 Bo1 games; registered rules: a cell OFF / EVEN / UNCLEAR, the night's verdict BALANCED ON PAYOFF when no colour is OFF on arm B's lab-vs-lab payoff (pull is not judged tonight: the human-pick model was demoted to context, 105 of 180 cards covered); pairs, triples, A vs C and closeness reported as candidates; no swaps

- finished: 2026-10-22T10:45:30-04:00
- decides: whether Omega is BALANCED ON PAYOFF at colour level by the registered rule below (no colour OFF on the lab-vs-lab drafts' payoff); pull is reported and NOT judged tonight (the rule's registered change), and every other reading (pairs, triples, the pool's payoff, A vs C, closeness) reported as a candidate (D447 point 9). No card is swapped on this night: the swap / evolve-objective rule is written after this report, as its own pre-registration
- hypothesis: none to confirm. Omega was built with 24 cards a colour and 8 gold a colour (2 a pair), so if the cards are even the pull is near 0.4 and the payoff near 0.5 for every colour; J111/J114 saw the lab drafter over-draft blue and Forge play blue worse (J141: blue's main-colour rate .433 under Forge), so blue is the colour most likely to read OFF, in pull (up) and in payoff (down)
- rule: registered by the cloud on 2026-10-19 23:55 UTC (pc-jobs README), before any data, verbatim in substance. CELLS: colour level (5) decides; pairs (10) reported with intervals; triples only where a cell has 40+ decks; 4-5-colour decks excluded everywhere; a deck's colours = colours with 3+ spells. PULL (arm A, drafted decks): share of two-colour decks containing colour c, target 2/5; mono and three-colour shares reported beside it, not judged; one reading per drafter (lab, forge-ranks, the human-pick model), never pooled; the human-pick model's reading is the primary one for pull, the other two context; real drafts (the draft-deck ledger, #169) shown, never judged until 30+ decks. PAYOFF (arm B, the drafted decks played makeup-vs-makeup, Forge Default both seats): each colour's win rate in games between decks that differ in that colour, deck-clustered bootstrap; target 0.5. Arm C (decks --cube census on Omega's pool, k in {1,2,3}, same land/castability rules) gives the pool's intrinsic payoff by colour, same target, same read. "Clearly off even": a cell is OFF when its 95% interval excludes the target AND the point is at least 0.08 from it for pull (outside [0.32, 0.48]) or 0.05 for payoff (outside [0.45, 0.55]); else EVEN if its interval sits inside that band; else UNCLEAR. The cube is BALANCED at colour level when no colour is OFF on primary pull or on arm-B payoff. Everything else (pairs, A vs C contrasts, closeness) is a candidate per D447 point 9. A vs C: a colour OFF in B but EVEN in C reads "the drafter/deck-building favours or starves it"; OFF in both reads "the cards"; report, don't act. CLOSENESS: per colour and pair, median final life margin of the winner and median turns, with IQR, reported only. The report's first line carries the Forge-pilot caveat (J141: search lifts every colour about equally, +8.9 pts, so a Forge-only payoff is the right first cut). No swaps from this night. THIS JOB'S CHOICES, fixed here before any game: pull intervals are a percentile bootstrap clustered by draft (1,000 replicates); payoff intervals a deck-clustered bootstrap (J141's multinomial deck weights, 1,000 replicates); arm B's judged reading is the lab-vs-lab drafts (both seats one drafter and one builder, so no colour's rate is a drafter's strength), the human-pick and forge-ranks drafts' own games context; "games between decks that differ in c" means one deck has c among its colours with 3+ spells and the other does not, both decks with 1-3 such colours, decisive games only; the winner's final life is its life on the ledger's last line; real drafts labelled as context (never in the verdict) at 30+ Omega decks. REGISTERED CHANGE (the cloud, 2026-10-20, before any J145 data): the human-pick model is DEMOTED to context for pull. Reason: its Omega file covers 105 of the 180 cards, unevenly by colour (W 15/24, U 13/24, B 11/24, R 14/24, G 13/24, gold 12/20, colourless 7/18, lands 20/22), and the other 75 are valued by its rating fallback, so its coverage biases exactly the quantity pull measures (how much each colour is drafted). So tonight NO drafter's pull is judged: all three readings (lab, forge-ranks, the human-pick model) are reported with their intervals, the OFF / EVEN / UNCLEAR labels shown as information, and the model's per-colour coverage beside its reading. The night's verdict is BALANCED ON PAYOFF when no colour is OFF on arm B's lab-vs-lab payoff, else NOT BALANCED ON PAYOFF, and the report says pull is not judged. Pull becomes judged in a later night when the draft-deck ledger reaches 30+ real Omega decks (the real drafts then the primary reading, the same OFF / EVEN band, target 2/5) or a human pick model covering the whole cube exists
- outcome: done
- headline: played 14400, engine_errors 0, bal.verdict.code 1
- summary: results/J145/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 60252b3, ForgeCoach 866c256
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J150 FAILED: The move atlas, rung 2 -- three deck pairs by D451's pair rule (fair-fight-900000005 again as the repeat, peasant-900000007, vintage-900000007) x three Forge-vs-Forge spine games each at fresh seeds 452-460; phase A 2,400 random-vs-random rollouts a pair; phase B 16 decisions a spine, every option forked 200 times random and 40 times Forge; the random seat under G5 (D458, no re-pick of a play the engine refused to pay for); pre-registered reads, numbers only. Method only, no outcome rule beyond D451's

- finished: 2026-10-22T10:49:42-04:00
- decides: nothing by itself. Rung 2 of the move atlas: whether J148's one-game picture (the two maps rarely agree before the game is decided; rho below zero; "cast now / don't attack" under random play) is a property of one spine or of the method, read on nine spines of three pairs, with intervals clustered by pair and spine; and how much a labelled decision costs, for rung 3
- hypothesis: none to confirm about the maps. Two candidates from J148 are read for repetition on the repeat pair only (iv): C1 "cast now" and C2 "don't attack", both + on J148 (C1 +0.013 over 18 decisions, C2 +0.059 over 4; neither excluded zero there)
- rule: D451 (method; no outcome rule) with D458 (G5) and D459 (unit watchdog). Pre-registered here, before any J150 data: the reads (i)-(vi) below, computed by var/lab-j150-local/bin/reads.py exactly as written in the pilot; a candidate of (iv) HOLDS only if its point is > 0 (J148's direction) and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. No other read carries a verdict
- outcome: failed (pilot: selftest == 1 (selftest = 0); pilot.noRepeatRefused >= 1 (pilot.noRepeatRefused = 0))
- headline: played_a 0, branches 0, atlas.spinesDone 0, atlas.decisions 0, atlas.sameBest 0, atlas.refusedCast 0, atlas.refusedCastSpinesFf5 0, atlas.problems 0
- summary: results/J150/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 8fca725
- follow-up: template morning-read: not due (the job did not finish done)

## J151 ABORTED: The move atlas, rung 2 -- three deck pairs by D451's pair rule (fair-fight-900000005 again as the repeat, peasant-900000007, vintage-900000007) x three Forge-vs-Forge spine games each at fresh seeds 452-460; phase A 2,400 random-vs-random rollouts a pair; phase B 16 decisions a spine, every option forked 200 times random and 40 times Forge; the random seat under G5 (D458, no re-pick of a play the engine refused to pay for); pre-registered reads, numbers only. Method only, no outcome rule beyond D451's

- finished: 2026-10-22T12:45:01-04:00
- decides: nothing by itself. Rung 2 of the move atlas: whether J148's one-game picture (the two maps rarely agree before the game is decided; rho below zero; "cast now / don't attack" under random play) is a property of one spine or of the method, read on nine spines of three pairs, with intervals clustered by pair and spine; and how much a labelled decision costs, for rung 3
- hypothesis: none to confirm about the maps. Two candidates from J148 are read for repetition on the repeat pair only (iv): C1 "cast now" and C2 "don't attack", both + on J148 (C1 +0.013 over 18 decisions, C2 +0.059 over 4; neither excluded zero there)
- rule: D451 (method; no outcome rule) with D458 (G5) and D459 (unit watchdog). Pre-registered here, before any J150 data: the reads (i)-(vi) below, computed by var/lab-j150-local/bin/reads.py exactly as written in the pilot; a candidate of (iv) HOLDS only if its point is > 0 (J148's direction) and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. No other read carries a verdict
- outcome: aborted (aborted: unit_errors > 30 (unit_errors = 32))
- headline: played_a 2400, branches 2448, atlas.spinesDone 0, atlas.decisions 0, atlas.sameBest 0, atlas.refusedCast 344, atlas.refusedCastSpinesFf5 0, atlas.problems 0
- summary: results/J151/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 8fca725
- follow-up: template morning-read: not due (the job did not finish done)

## J152 ABORTED: The move atlas, rung 2 -- three deck pairs by D451's pair rule (fair-fight-900000005 again as the repeat, peasant-900000007, vintage-900000007) x three Forge-vs-Forge spine games each at fresh seeds 452-460; phase A 2,400 random-vs-random rollouts a pair; phase B 16 decisions a spine, every option forked 200 times random and 40 times Forge; the random seat under G5 (D458, no re-pick of a play the engine refused to pay for); pre-registered reads, numbers only. Method only, no outcome rule beyond D451's

- finished: 2026-10-22T12:46:38-04:00
- decides: nothing by itself. Rung 2 of the move atlas: whether J148's one-game picture (the two maps rarely agree before the game is decided; rho below zero; "cast now / don't attack" under random play) is a property of one spine or of the method, read on nine spines of three pairs, with intervals clustered by pair and spine; and how much a labelled decision costs, for rung 3
- hypothesis: none to confirm about the maps. Two candidates from J148 are read for repetition on the repeat pair only (iv): C1 "cast now" and C2 "don't attack", both + on J148 (C1 +0.013 over 18 decisions, C2 +0.059 over 4; neither excluded zero there)
- rule: D451 (method; no outcome rule) with D458 (G5) and D459 (unit watchdog). Pre-registered here, before any J150 data: the reads (i)-(vi) below, computed by var/lab-j150-local/bin/reads.py exactly as written in the pilot; a candidate of (iv) HOLDS only if its point is > 0 (J148's direction) and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. No other read carries a verdict
- outcome: aborted (aborted: unit_errors > 30 (unit_errors = 32))
- headline: played_a 2400, branches 2448, atlas.spinesDone 0, atlas.decisions 0, atlas.sameBest 0, atlas.refusedCast 344, atlas.refusedCastSpinesFf5 0, atlas.problems 0
- summary: results/J152/summary.md (the PC session's; judge it against the rule)
- follow-up: template morning-read: not due (the job did not finish done)

## J153 FAILED: The move atlas, rung 2 -- three deck pairs by D451's pair rule (fair-fight-900000005 again as the repeat, peasant-900000007, vintage-900000007) x three Forge-vs-Forge spine games each at fresh seeds 452-460; phase A 2,400 random-vs-random rollouts a pair; phase B 16 decisions a spine, every option forked 200 times random and 40 times Forge; the random seat under G5 (D458, no re-pick of a play the engine refused to pay for); pre-registered reads, numbers only. Method only, no outcome rule beyond D451's

- finished: 2026-10-22T12:48:39-04:00
- decides: nothing by itself. Rung 2 of the move atlas: whether J148's one-game picture (the two maps rarely agree before the game is decided; rho below zero; "cast now / don't attack" under random play) is a property of one spine or of the method, read on nine spines of three pairs, with intervals clustered by pair and spine; and how much a labelled decision costs, for rung 3
- hypothesis: none to confirm about the maps. Two candidates from J148 are read for repetition on the repeat pair only (iv): C1 "cast now" and C2 "don't attack", both + on J148 (C1 +0.013 over 18 decisions, C2 +0.059 over 4; neither excluded zero there)
- rule: D451 (method; no outcome rule) with D458 (G5) and D459 (unit watchdog). Pre-registered here, before any J150 data: the reads (i)-(vi) below, computed by var/lab-j150-local/bin/reads.py exactly as written in the pilot; a candidate of (iv) HOLDS only if its point is > 0 (J148's direction) and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. No other read carries a verdict
- outcome: failed (pilot: step pilot1 exited 1)
- headline: played_a 0, branches 0, atlas.spinesDone 0, atlas.decisions 0, atlas.sameBest 0, atlas.refusedCast 0, atlas.refusedCastSpinesFf5 0, atlas.problems 0
- summary: results/J153/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 8fca725
- follow-up: template morning-read: not due (the job did not finish done)

## J154 FAILED: The move atlas, rung 2 -- three deck pairs by D451's pair rule (fair-fight-900000005 again as the repeat, peasant-900000007, vintage-900000007) x three Forge-vs-Forge spine games each at fresh seeds 452-460; phase A 2,400 random-vs-random rollouts a pair; phase B 16 decisions a spine, every option forked 200 times random and 40 times Forge; the random seat under G5 (D458, no re-pick of a play the engine refused to pay for); pre-registered reads, numbers only. Method only, no outcome rule beyond D451's

- finished: 2026-10-22T12:51:47-04:00
- decides: nothing by itself. Rung 2 of the move atlas: whether J148's one-game picture (the two maps rarely agree before the game is decided; rho below zero; "cast now / don't attack" under random play) is a property of one spine or of the method, read on nine spines of three pairs, with intervals clustered by pair and spine; and how much a labelled decision costs, for rung 3
- hypothesis: none to confirm about the maps. Two candidates from J148 are read for repetition on the repeat pair only (iv): C1 "cast now" and C2 "don't attack", both + on J148 (C1 +0.013 over 18 decisions, C2 +0.059 over 4; neither excluded zero there)
- rule: D451 (method; no outcome rule) with D458 (G5) and D459 (unit watchdog). Pre-registered here, before any J150 data: the reads (i)-(vi) below, computed by var/lab-j150-local/bin/reads.py exactly as written in the pilot; a candidate of (iv) HOLDS only if its point is > 0 (J148's direction) and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. No other read carries a verdict
- outcome: failed (pilot: step pilot1 exited 1)
- headline: played_a 0, branches 0, atlas.spinesDone 0, atlas.decisions 0, atlas.sameBest 0, atlas.refusedCast 0, atlas.refusedCastSpinesFf5 0, atlas.problems 0
- summary: results/J154/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 8fca725
- follow-up: template morning-read: not due (the job did not finish done)

## J156 FAILED: The move atlas, rung 2 -- three deck pairs by D451's pair rule (fair-fight-900000005 again as the repeat, peasant-900000007, vintage-900000007) x three Forge-vs-Forge spine games each at fresh seeds 452-460; phase A 2,400 random-vs-random rollouts a pair; phase B 16 decisions a spine, every option forked 200 times random and 40 times Forge; the random seat under G5 (D458, no re-pick of a play the engine refused to pay for); pre-registered reads, numbers only. Method only, no outcome rule beyond D451's

- finished: 2026-10-23T05:27:17-04:00
- decides: nothing by itself. Rung 2 of the move atlas: whether J148's one-game picture (the two maps rarely agree before the game is decided; rho below zero; "cast now / don't attack" under random play) is a property of one spine or of the method, read on nine spines of three pairs, with intervals clustered by pair and spine; and how much a labelled decision costs, for rung 3
- hypothesis: none to confirm about the maps. Two candidates from J148 are read for repetition on the repeat pair only (iv): C1 "cast now" and C2 "don't attack", both + on J148 (C1 +0.013 over 18 decisions, C2 +0.059 over 4; neither excluded zero there)
- rule: D451 (method; no outcome rule) with D458 (G5) and D459 (unit watchdog). Pre-registered here, before any J150 data: the reads (i)-(vi) below, computed by var/lab-j150-local/bin/reads.py exactly as written in the pilot; a candidate of (iv) HOLDS only if its point is > 0 (J148's direction) and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. No other read carries a verdict
- outcome: failed (step run4 exited 1)
- headline: played_a 7200, branches 113470, atlas.spinesDone 7, atlas.decisions 112, atlas.meanRho 0.3153, atlas.sameBest 63, atlas.refusedCast 4942, atlas.refusedCastSpinesFf5 4598, atlas.problems 20
- summary: results/J156/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 6fb13bf
- follow-up: template morning-read: not due (the job did not finish done)

## J157 FAILED: The move atlas, rung 2's vintage pair again on the fixed tool -- vintage-900000007 x three Forge-vs-Forge spine games at J156's seeds 458-460; phase A 2,400 random-vs-random rollouts; phase B 16 decisions a spine, every option forked 200 times random and 40 times Forge; on 9fe69ad8 (D466: the fork carries optional costs, branch errors are problems, G1 reads one land listing, a refused cast's card is put back, a truncated frame log is skipped); J156's reads, numbers only, read side by side with J156's vintage numbers and never pooled. Method only, no outcome rule beyond D451's

- finished: 2026-10-23T11:39:55-04:00
- decides: nothing by itself. The vintage pair of rung 2 as J156 meant it: J156's vintage numbers rest on spine 458 at 9 of 16 complete decisions (retrace casts that did not fork), G1 flags that were the checker's, and a hand repair; this is the same pair at the same seeds on the fixed tool, so its reads stand on their own, beside J156's
- hypothesis: none to confirm about the maps. J156's vintage reads are the comparison: (i) same best 0.393 [0.214, 0.583] over 28, (ii) rho -0.028 [-0.400, 0.412] over 21; read side by side, never pooled (D466 point 4 changed the random policy)
- rule: D451 (method; no outcome rule) with D458 and D462 (G5) as D466 amends them, D459 (unit watchdog) and D466. Pre-registered here, before any J157 data: J156's reads (i)-(vi) over the three vintage spines and the side-by-side against J156's vintage numbers, computed by var/lab-j157-local/bin/reads.py exactly as written in the pilot. No read carries a verdict: (iv)'s HOLDS / NOT SHOWN was registered for the repeat pair (fair-fight-900000005) only, which J157 does not play
- outcome: failed (check: unit_errors == 0 (unit_errors = 1); atlas.unitsShort == 0 (atlas.unitsShort = 1); atlas.problems == 0 (atlas.problems = 2))
- headline: played_a_vintage7 2400, branches 33550, atlas.spinesDone 3, atlas.decisions 43, atlas.meanRho -0.001, atlas.sameBest 17, atlas.branchErrored 288, atlas.truncatedLogs 2, atlas.problems 2
- summary: results/J157/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 9fe69ad
- follow-up: template morning-read: not due (the job did not finish done)

## J159 DONE: Omega balance, night 0 of the registered swap rule -- J145 again on fresh seeds, the cube unchanged: the same three arms on the Omega 180 with Forge Default piloting every game ((A) 2,000 lab-vs-lab grid drafts plus 600 each for the human-pick model and Forge's ranks, drafts 816,500,001 and up; (B) each draft's two decks played twice, game seeds 1,661 / 1,662 / 1,663 x 1,000,000 + g; (C) 2,000 decks from Omega's list by decks --cube in 8,000 games, seed 1665), none coinciding with J145's (D447 point 9); J145's read unchanged, plus the swap rule's night-0 reading: UG CONFIRMED if UG's arm-B (lab-vs-lab) payoff interval sits below .5 on this night's data alone, else UG NOT CONFIRMED and the swap programme stops; colour verdicts and qualifying pairs (400+ arm-B deck-games) reported as the gates' baseline; pull reported, not judged; no swap registered or made

- finished: 2026-10-24T02:01:58-04:00
- decides: whether UG's low lab-vs-lab payoff, J145's one pair candidate (.423, .382-.465, 544 deck-games), holds on fresh seeds: UG CONFIRMED or UG NOT CONFIRMED by the swap rule's night-0 reading below, on this night's data alone. If NOT CONFIRMED the swap programme stops (there is nothing to swap). If CONFIRMED, night 1 (one swap, then a fresh-seed re-measure) may be written; this job registers no swap and performs none. J145's colour verdict (BALANCED ON PAYOFF / NOT BALANCED ON PAYOFF) is read again, as the "no colour OFF" gate's baseline; pull is reported, not judged
- hypothesis: UG's arm-B interval sits below .5 again. J145: UG .423 (.382-.465) on 544 lab-vs-lab deck-games and .424 (.388-.465) as random pool decks, the only drafted pair whose interval excluded .5; at the same n the interval's half-width is about .04, so a true UG rate near .42 confirms with high probability, and a J145 seed artefact reads an interval that includes .5
- rule: NIGHT 0 OF THE OMEGA SWAP RULE (pc-results study/omega-swap-rule.md, registered as written with Justin's answers of 2026-10-23 -- re-measure first yes, pull-driven swaps before 30 real drafts no, 1 swap a generation yes, stop after two generations without a confirmed improvement yes -- before any J159 data). Quoted verbatim from the study: "Night 0 (if you choose to re-measure first): J145 again on fresh seeds, with the cube unchanged." "UG is confirmed if its arm-B interval again sits below .5." "If not, stop. There is nothing to swap." "Pull is reported and not judged." THE READING: UG CONFIRMED when the high end of UG's arm-B payoff interval (Blab, lab vs lab: UG decks' win rate in decisive games against decks that are not UG, J145's deck-clustered bootstrap, 1,000 replicates) is below .5 on THIS night's data alone -- J145's games are never pooled in; otherwise UG NOT CONFIRMED and the swap programme stops; INCOMPLETE (a failed check) only when Blab has no games or UG no interval. Printed beside it, as the baseline of the rule's other two confirmation gates and never changing the UG verdict: "no colour is OFF" (J145's colour labels on Blab, OFF / EVEN / UNCLEAR on [.45, .55]) and "no qualifying pair is OFF", a qualifying pair being one with "at least 400 drafted deck-games in arm B (lab vs lab)" and a pair OFF "under the same band" (its interval excludes .5 and its point is outside [.45, .55]); UG's n is printed, and the UG verdict does not require UG to qualify. Pull is reported, not judged: the draft-deck ledger holds far fewer than 30 real Omega decks. No swap is registered or made by this job. J145'S RULES, UNCHANGED (J145's rule: line, verbatim; "tonight" there means this night): registered by the cloud on 2026-10-19 23:55 UTC (pc-jobs README), before any data, verbatim in substance. CELLS: colour level (5) decides; pairs (10) reported with intervals; triples only where a cell has 40+ decks; 4-5-colour decks excluded everywhere; a deck's colours = colours with 3+ spells. PULL (arm A, drafted decks): share of two-colour decks containing colour c, target 2/5; mono and three-colour shares reported beside it, not judged; one reading per drafter (lab, forge-ranks, the human-pick model), never pooled; the human-pick model's reading is the primary one for pull, the other two context; real drafts (the draft-deck ledger, #169) shown, never judged until 30+ decks. PAYOFF (arm B, the drafted decks played makeup-vs-makeup, Forge Default both seats): each colour's win rate in games between decks that differ in that colour, deck-clustered bootstrap; target 0.5. Arm C (decks --cube census on Omega's pool, k in {1,2,3}, same land/castability rules) gives the pool's intrinsic payoff by colour, same target, same read. "Clearly off even": a cell is OFF when its 95% interval excludes the target AND the point is at least 0.08 from it for pull (outside [0.32, 0.48]) or 0.05 for payoff (outside [0.45, 0.55]); else EVEN if its interval sits inside that band; else UNCLEAR. The cube is BALANCED at colour level when no colour is OFF on primary pull or on arm-B payoff. Everything else (pairs, A vs C contrasts, closeness) is a candidate per D447 point 9. A vs C: a colour OFF in B but EVEN in C reads "the drafter/deck-building favours or starves it"; OFF in both reads "the cards"; report, don't act. CLOSENESS: per colour and pair, median final life margin of the winner and median turns, with IQR, reported only. The report's first line carries the Forge-pilot caveat (J141: search lifts every colour about equally, +8.9 pts, so a Forge-only payoff is the right first cut). No swaps from this night. THIS JOB'S CHOICES, fixed here before any game: pull intervals are a percentile bootstrap clustered by draft (1,000 replicates); payoff intervals a deck-clustered bootstrap (J141's multinomial deck weights, 1,000 replicates); arm B's judged reading is the lab-vs-lab drafts (both seats one drafter and one builder, so no colour's rate is a drafter's strength), the human-pick and forge-ranks drafts' own games context; "games between decks that differ in c" means one deck has c among its colours with 3+ spells and the other does not, both decks with 1-3 such colours, decisive games only; the winner's final life is its life on the ledger's last line; real drafts labelled as context (never in the verdict) at 30+ Omega decks. REGISTERED CHANGE (the cloud, 2026-10-20, before any J145 data): the human-pick model is DEMOTED to context for pull. Reason: its Omega file covers 105 of the 180 cards, unevenly by colour (W 15/24, U 13/24, B 11/24, R 14/24, G 13/24, gold 12/20, colourless 7/18, lands 20/22), and the other 75 are valued by its rating fallback, so its coverage biases exactly the quantity pull measures (how much each colour is drafted). So tonight NO drafter's pull is judged: all three readings (lab, forge-ranks, the human-pick model) are reported with their intervals, the OFF / EVEN / UNCLEAR labels shown as information, and the model's per-colour coverage beside its reading. The night's verdict is BALANCED ON PAYOFF when no colour is OFF on arm B's lab-vs-lab payoff, else NOT BALANCED ON PAYOFF, and the report says pull is not judged. Pull becomes judged in a later night when the draft-deck ledger reaches 30+ real Omega decks (the real drafts then the primary reading, the same OFF / EVEN band, target 2/5) or a human pick model covering the whole cube exists
- outcome: done
- headline: played 14400, engine_errors 0, g0.code 0, g0.ug.est 0.4532, g0.ug.lo 0.4057, g0.ug.hi 0.5, g0.ug.n 470, g0.nColoursOff 0, g0.nQualifying 7, g0.nPairsOff 0, bal.verdict.code 1
- summary: results/J159/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table db49609, ForgeCoach 866c256
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J160 FAILED: The library loop, night 1 -- the first candidate-cube measurement night, and before it is a cube search a test of the library card model: the three generated cubes of D473 (balanced-legacy-even-high, -legacy-even-mid, -pauper-even) and the two legacy -nopower variants (five cubes; pauper has no -nopower file, and the job tolerates one), each measured on J145's judged arm only at fresh seeds (2,000 lab-vs-lab grid drafts, each draft's two decks played twice, each on the play once, Forge Default both seats, recorded rows; drafts 818,k00,001 and up for cube k = 1..6, game seeds (1,800 + k) x 1,000,000 + g), read per cube by J145's balance.py (colour and pair payoff, deck-clustered bootstrap, OFF / EVEN / UNCLEAR on [.45, .55]; pull reported, never judged), then one model-test read beside the predictions balance-model writes at the pin: (i) the transfer error, (ii) the selection bias, (iii) the power effect, (iv) which cube, if any, has no colour OFF and no qualifying pair OFF on this night alone; no cube promoted, swapped or regenerated

- finished: 2026-10-24T05:32:14-04:00
- decides: how far the library card model's predictions miss on the cubes it generated, before any cube search leans on it: (i) the transfer error (RMSE of predicted against measured payoff over the colours and the qualifying pairs, per cube and pooled; beside it balance-model's own noise-corrected transfer SD, the quantity the loop's programme was simulated at, 0 / .015 / .03); (ii) the selection bias (the measured max qualifying pair gap minus the predicted searched gap, per cube); (iii) the power effect (max colour gap with power minus without, per cube); (iv) which cube, if any, meets "no colour OFF and no qualifying pair OFF" on this night alone -- a candidate per D447 point 9, confirmed only on fresh seeds later. No cube is promoted, swapped or regenerated by this job
- hypothesis: the model transfers. Omega's two nights, read by this file's modeltest.py against the model's analytic Omega prediction (no engine, 2026-10-24): J159 colours RMSE .017, qualifying pairs RMSE .021 (7 pairs), transfer SD .000 for both; J145 .018 / .024, transfer SD .006 / .006; the study's deck-based check on J145, RMSE .027. Expected here: pooled pair RMSE .02-.035 and a transfer SD at or under .015 on the legacy cubes, pauper's wider (its intervals are +-.05). The balancing search selected on point predictions, so each cube's measured max pair gap should sit above its predicted searched gap (.003-.011 over the ten pairs at 4932d002) by about the noise alone (the read prints that noise-only expectation, about .03 at J145's pair sizes); a gap well above the noise is the selection bias. The power cards were valued inside the level by a census where Forge never breaks them, so the power effect is expected near 0. Each cube passes (iv) with probability well under 1 on one night (the study's simulation: 3-4 nights at 4-8 candidates a night to a confirmed cube)
- rule: THE LIBRARY LOOP'S FIRST NIGHT (pc-results study/omega-swap-rule-v2.md, "The loop" step 3, and study/omega-balance-model.md; the reads below written into this file before any J160 game). MEASURE: each cube on J145's judged arm only, at fresh seeds: 2,000 grid drafts by the lab drafter on both seats (the cube's default ratings, Forge's ranks), each draft's two decks played against each other twice, each on the play once, Bo1, Forge Default both seats, --record rows (D450); read with J145's balance.py unchanged in its rules (J145's rule, verbatim in substance: a deck's colours are its colours with 3+ spells; 4-5-colour decks excluded; PAYOFF = colour c's win rate in decisive games between decks that differ in c, deck-clustered bootstrap, 1,000 replicates, seed 145; a cell OFF when its 95% interval excludes .5 AND its point is outside [.45, .55], EVEN when the interval sits inside [.45, .55], else UNCLEAR; the colour level BALANCED ON PAYOFF when no colour is OFF; pairs reported with intervals; pull = the share of two-colour decks containing c, reported, never judged). A QUALIFYING PAIR has 400+ arm-B deck-games. THE PREDICTIONS: balance-model at the pin, run twice by the pilot from the inputs that made the committed cubes (lab-j144's census, lab-j145's night, the facts cache 32653ed2fcd7d8d2.json; sha256s checked; --reps 200 --seed 1; the second run --exclude cubes/library/powered-exclude.txt --suffix -nopower), the two model.json files' candidates' pred tables, each cube regenerated byte-identical to the committed file or the pilot fails; J159's games are not an input (the cubes were made before them). THE REGISTERED READS (modeltest.py, per cube and pooled over the night's cubes): (i) TRANSFER ERROR = RMSE(pred, measured) over the five colours and the qualifying pairs, per cube and pooled; beside it max |pred - measured| and the noise-corrected transfer SD = sqrt(max(0, RMSE^2 - mean measured var - mean predicted var)), each var ((hi - lo) / 3.92)^2, balance-model's own definition; (ii) SELECTION BIAS = the measured max |payoff - .5| over the qualifying pairs minus the predicted max |pred - .5| over the same pairs (the searched cube's), per cube; beside it, never replacing it, the noise-only expectation of that measured gap (each qualifying pair drawn N(pred, measured SE), 4,000 draws, seed 160) with the share of draws at or above the measured gap, and the generator's objective (max colour gap + max pair gap) measured against model.json's flow-only (flowGap) and searched (searchedGap) values; (iii) THE POWER EFFECT = the measured max colour gap of a cube minus that of its -nopower variant, with a parametric 95% interval (each colour drawn N(est, SE), 4,000 draws) and the predicted difference beside it; n/a for a family with no -nopower file (pauper at 4932d002); (iv) A CANDIDATE = a cube with no colour OFF and no qualifying pair OFF on this night alone (a candidate per D447 point 9, confirmed only on fresh seeds later, at 3x per the study); printed beside it, never replacing it, the v2 draft rule's stricter PASS (every colour EVEN and no qualifying pair OFF). REPORTED, NOT READ: Omega (J159's lab-vs-lab arm against the model's analytic Omega prediction) as a reference row, never pooled; each cube's pull; the cells missed beyond both intervals (the v2 stop rule's quantity). No cube is promoted, swapped or regenerated; the refit (the loop's step 4) is not this job's
- outcome: failed (check: runs.drafts == 2000 * st.expected (runs.drafts = 10020, st.expected = 5); played == st.planned (played = 20040, st.planned = 20000))
- headline: played 20040, engine_errors 2, st.cubes 5, st.expected 5, mt.code 1, mt.nTested 5, mt.pooled.rmseColour 0.0303, mt.pooled.rmsePair 0.047, mt.pooled.transferSdColour 0.021, mt.pooled.transferSdPair 0.0385, mt.nCandidates 1
- summary: results/J160/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 8a33ea7
- follow-up: template morning-read: not due (the job did not finish done)

## J161 FAILED: The move atlas, rung 3b -- the four spines J158 did not finish (pauper-900000005, synergy-900000009, modern-era-900000007 and fair-fight-900000005's second spine) at their original fresh seeds 464, 465, 466 and 462, on the fixed tool (D470 forced blocks at the fork's own combat, D471 G6 the random seat's own X with #195's restore, D472 alternative costs in the fork); J158's shape unchanged (16 decisions a spine, every option 200 times random and 40 times Forge, no phase A, labels.jsonl the rung-3 contract), with the tool's new counters read and checked; a new data folder lab-j161; on 8a33ea78. Pre-registered reads, numbers only; no outcome rule beyond D451's and J156's (iv). These labels are a new random policy and tool, and are never pooled with J156's, J157's or J158's

- finished: 2026-10-24T05:36:53-04:00
- decides: nothing by itself. Rung 3 of the atlas ladder, finished: J158 was stopped after two of its six spines (pauper5's random branches looped on a free Crypt Rats activation, D471, and its block decisions were hollow, D470). This job plays the other four on the fixed tool, so that labels a night, and confident labels a night, are measured on five pairs before the 7-8 nights a 1,000-label set would take are committed, and so that the fixes are seen working at scale (pauper5's branch timeouts, D470's unavailable options, G6's counts, D472's errors by kind)
- hypothesis: none to confirm about the maps. The sizing has priors: J158 measured, at 6 workers scaled to 7, ff5 130 labels a 10-h night (32 confident) and peasant7 106 (13); J156's spines gave ff5 80 / 30 and peasant7 158 / 36 at 7. pauper5's spine is expected at ~2.5 h on the fixed tool (J158's d0 cost 10.8 s a branch with 42% of its branch time in timeouts). One candidate is read for repetition (iv): C1 "cast now where Forge passes", which HELD on ff5 461 (+4.3 points [1.0, 7.6]) and peasant7 463 (+2.8 [0.3, 5.0]) in J158 and on ff5 452-454 in J156 (+8.3 [4.2, 13.3]), each on its own random policy
- rule: D451 (method; no outcome rule) with D458/D462/D466 (G5), D459 (unit watchdog), D465, D466, D467, D470, D471 (G6) and D472. Pre-registered here, before any J161 data: the label contract (J158's, plus the `void` field) and the reads (a)-(c) computed by var/lab-j161-local/bin/labels.py, J156's reads (i)-(vi) plus (iv) by pair computed by var/lab-j161-local/bin/reads.py (J158's file, unchanged), and the tool's counters computed by var/lab-j161-local/bin/metrics.py, all exactly as written in the pilot. A candidate of (iv) HOLDS on a pair only if its point is > 0 and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. Every other difference is a candidate (D447 point 9). No read carries any other verdict
- outcome: failed (pilot: pilot.smoke.problems == 0 (pilot.smoke.problems = 1))
- headline: branches 0, atlas.spinesDone 0, atlas.decisions 0, atlas.labels -1, atlas.confident -1, atlas.voidLabels -1, atlas.branchTimeouts 0, atlas.branchUnavailable 0, atlas.zeroXLeftOut 0, atlas.zeroX 0, atlas.problems 0
- summary: results/J161/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 8a33ea7
- follow-up: template morning-read: not due (the job did not finish done)

## J162 FAILED: The move atlas, rung 3b -- the four spines J158 did not finish (pauper-900000005, synergy-900000009, modern-era-900000007 and fair-fight-900000005's second spine) at their original fresh seeds 464, 465, 466 and 462, on the fixed tool (D470 forced blocks at the fork's own combat, D471 G6 the random seat's own X with #195's restore, D472 alternative costs in the fork); J158's shape unchanged (16 decisions a spine, every option 200 times random and 40 times Forge, no phase A, labels.jsonl the rung-3 contract), with the tool's new counters read and checked; a new data folder lab-j162; on f6dba5e4. Pre-registered reads, numbers only; no outcome rule beyond D451's and J156's (iv). These labels are a new random policy and tool, and are never pooled with J156's, J157's or J158's

- finished: 2026-10-24T13:41:43-04:00
- decides: nothing by itself. Rung 3 of the atlas ladder, finished: J158 was stopped after two of its six spines (pauper5's random branches looped on a free Crypt Rats activation, D471, and its block decisions were hollow, D470). This job plays the other four on the fixed tool, so that labels a night, and confident labels a night, are measured on five pairs before the 7-8 nights a 1,000-label set would take are committed, and so that the fixes are seen working at scale (pauper5's branch timeouts, D470's unavailable options, G6's counts, D472's errors by kind)
- hypothesis: none to confirm about the maps. The sizing has priors: J158 measured, at 6 workers scaled to 7, ff5 130 labels a 10-h night (32 confident) and peasant7 106 (13); J156's spines gave ff5 80 / 30 and peasant7 158 / 36 at 7. pauper5's spine is expected at ~2.5 h on the fixed tool (J158's d0 cost 10.8 s a branch with 42% of its branch time in timeouts). One candidate is read for repetition (iv): C1 "cast now where Forge passes", which HELD on ff5 461 (+4.3 points [1.0, 7.6]) and peasant7 463 (+2.8 [0.3, 5.0]) in J158 and on ff5 452-454 in J156 (+8.3 [4.2, 13.3]), each on its own random policy
- rule: D451 (method; no outcome rule) with D458/D462/D466 (G5), D459 (unit watchdog), D465, D466, D467, D470, D471 (G6) and D472. Pre-registered here, before any J162 data: the label contract (J158's, plus the `void` field) and the reads (a)-(c) computed by var/lab-j162-local/bin/labels.py, J156's reads (i)-(vi) plus (iv) by pair computed by var/lab-j162-local/bin/reads.py (J158's file, unchanged), and the tool's counters computed by var/lab-j162-local/bin/metrics.py, all exactly as written in the pilot. A candidate of (iv) HOLDS on a pair only if its point is > 0 and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. Every other difference is a candidate (D447 point 9). No read carries any other verdict
- outcome: failed (check: atlas.problems == 0 (atlas.problems = 10))
- headline: branches 55680, atlas.spinesDone 4, atlas.decisions 64, atlas.labels 59, atlas.confident 7, atlas.voidLabels 0, atlas.meanRho 0.2181, atlas.branchTimeouts 0, atlas.timeoutSharePauper5 0, atlas.branchUnavailable 0, atlas.zeroXLeftOut 293387, atlas.zeroX 0, atlas.problems 10
- summary: results/J162/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table f6dba5e
- follow-up: template morning-read: not due (the job did not finish done)

## J164 DONE: The Monarch replay -- J162's pauper5 464 spine re-branched at exactly its eight Monarch decisions (d17, d19, d21, d23, d25, d27, d29, d31; 36 options, 8,640 branch games, J162's seeds) on the fixed copier (D479: a copied Monarch now draws and can change hands; with D476-D478) and re-labelled, so the shift the copier's bias caused is measured, side by side with J162's labels and never pooled with them; on ce42306a, a new data folder lab-j164

- finished: 2026-10-24T21:23:06-04:00
- decides: nothing by itself. D479 found that every copy the atlas forked held a Monarch with no triggers (Forge's copier drops an effect card's triggers), so at J162 pauper5 464's d17-d31 the monarch at the fork never drew and could never lose the crown by combat damage; D479 says those maps and labels are not pooled across the fix "unless recomputed". This job recomputes them: the same plan, baseline, decisions, seeds and branch counts on the fixed copier, and reads how far the bias had moved the values, the labels, the best options and the one confident label in the range (d29)
- hypothesis: none to confirm. Direction expected from the mechanism, not registered as a rule: where seat B held the Monarch at the fork (d17, d19, d21, d25) seat A's values fall, where seat A held it (d23, d27, d29, d31) they rise; J162's rows show the copied Monarch drew 0 times in 8,640 branches (a Monarch made later in a branch drew in 2,375), and at d27-d31 almost no branch made a new one, so the bias is largest there
- rule: D451 (method; no outcome rule), D479 (comparability: not pooled), D478 (capped branches are draws). Pre-registered here, before any J164 game: the reads (i)-(v) as computed by var/lab-j164-local/bin/shift.py, the Monarch counter var/lab-j164-local/bin/monarch.py, and the labels by J162's labels.py byte for byte (sha256 0020dbbf...), all proved on J162's own rows by sha256 in the pilot. No read carries a verdict
- outcome: done
- headline: branches 8640, atlas.decisionsComplete 8, atlas.problems 0, atlas.timeoutShare 0, atlas.seedsMatch 8640, atlas.forkDrawBranches 7457, atlas.forkStealBranches 5048, atlas.labels 8, atlas.skipLines 80
- summary: results/J164/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table ce42306
- follow-up: template morning-read: READY: not on pc-jobs; a FOLLOW-UP READY line is in HEARTBEAT.md ## Messages

## J165 FAILED: The move atlas, rung 4a -- the cut design (D480) in the wide shape, on decks nobody designed: 13 spines, each a pair of random library decks of one band drawn as the census draws them (D447; deck seeds 2001-2013, bands cycled pauper, peasant, legacy, powered), the baseline game Forge vs Forge at a fresh game seed (2101-2113), 8 decisions a spine from those with 3+ options, every option 200 times random with the 25-branch screen and early stopping at 50/100/150, the Forge map at 40 on spines 1, 7 and 13 only, the checks on the workers; the labels marked `training: true` with `pool: "random-<band>"`, and a held-out VALIDATION draw (13 more pairs, deck seeds 2201-2213) written as deck files only and never branched; a new data folder lab-j165; on 325c2dd8. Pre-registered reads, numbers only; no outcome rule beyond D451's and J156's (iv). These labels are a new deck population, tool and design, and are never pooled with J156's, J157's, J158's or J162's

- finished: 2026-10-24T21:23:20-04:00
- decides: nothing by itself. Rung 4a of the atlas ladder: the first night whose labels a future model MAY train on (Justin, 2026-10-24 19:35-19:50 EDT), so the decks are nobody's -- random library decks by band, as the census draws them -- and a validation set drawn the same way is set aside, never branched. It measures, on the cut design D480 built from the atlas review, labels and confident labels per spine and per night, what the cuts actually save (branch time against a projection without them; the checks on the workers; the barriers' idle tail D480 did not measure), and the tool's counters on 26 decks no job has played
- hypothesis: none to confirm about the maps. The sizing has a registered expectation: the atlas review (2026-10-24, section 5) put design B's cuts in C's wide shape with k >= 3 at ~25-27 confident labels a 7-worker 10-h night with the Forge map on every spine (~30-32 with it on 1 spine in 6), from six cube-pair spines; random library decks are a new population, so this is the sizing read, not a prediction. The cuts are expected to save 18-20% of branch time (the review's replay; D480's 20.3%) and the parallel checks to take the checks from ~19% of a spine's wall toward ~6%. One candidate is read on every spine with a Forge map, (iv) C1 "cast now where Forge passes", which HELD on four of the six current-tool cube spines (J158, J162)
- rule: D451 (method; no outcome rule) with D458/D462/D466 (G5), D459, D465, D466, D467, D470, D471 (G6), D472, D476, D477, D478, D479 and D480 (the cuts; amends D451 points 5-7); D447 (the deck draw, unchanged). Pre-registered here, before any J165 data: the label contract and reads (a)-(c) computed by var/lab-j165-local/bin/labels.py, the agreement reads (i)-(vi) by var/lab-j165-local/bin/reads.py, the savings by var/lab-j165-local/bin/cuts.py and the tool's counters by var/lab-j165-local/bin/metrics.py, all exactly as written in the pilot. A candidate of (iv) HOLDS on a spine only if its point is > 0 and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. Every other difference is a candidate (D447 point 9). No read carries any other verdict
- outcome: failed (prepare: step prepare exited 1)
- headline: branches 0, atlas.problems -1
- summary: results/J165/summary.md (the PC session's; judge it against the rule)
- follow-up: template morning-read: not due (the job did not finish done)

## J166 FAILED: The move atlas, rung 4a -- the cut design (D480) in the wide shape, on decks nobody designed: 13 spines, each a pair of random library decks of one band drawn as the census draws them (D447; deck seeds 2001-2013, bands cycled pauper, peasant, legacy, powered), the baseline game Forge vs Forge at a fresh game seed (2101-2113), 8 decisions a spine from those with 3+ options, every option 200 times random with the 25-branch screen and early stopping at 50/100/150, the Forge map at 40 on spines 1, 7 and 13 only, the checks on the workers; the labels marked `training: true` with `pool: "random-<band>"`, and a held-out VALIDATION draw (13 more pairs, deck seeds 2201-2213) written as deck files only and never branched; a new data folder lab-j166; on 325c2dd8. Pre-registered reads, numbers only; no outcome rule beyond D451's and J156's (iv). These labels are a new deck population, tool and design, and are never pooled with J156's, J157's, J158's or J162's

- finished: 2026-10-25T03:05:48-04:00
- decides: nothing by itself. Rung 4a of the atlas ladder: the first night whose labels a future model MAY train on (Justin, 2026-10-24 19:35-19:50 EDT), so the decks are nobody's -- random library decks by band, as the census draws them -- and a validation set drawn the same way is set aside, never branched. It measures, on the cut design D480 built from the atlas review, labels and confident labels per spine and per night, what the cuts actually save (branch time against a projection without them; the checks on the workers; the barriers' idle tail D480 did not measure), and the tool's counters on 26 decks no job has played
- hypothesis: none to confirm about the maps. The sizing has a registered expectation: the atlas review (2026-10-24, section 5) put design B's cuts in C's wide shape with k >= 3 at ~25-27 confident labels a 7-worker 10-h night with the Forge map on every spine (~30-32 with it on 1 spine in 6), from six cube-pair spines; random library decks are a new population, so this is the sizing read, not a prediction. The cuts are expected to save 18-20% of branch time (the review's replay; D480's 20.3%) and the parallel checks to take the checks from ~19% of a spine's wall toward ~6%. One candidate is read on every spine with a Forge map, (iv) C1 "cast now where Forge passes", which HELD on four of the six current-tool cube spines (J158, J162)
- rule: D451 (method; no outcome rule) with D458/D462/D466 (G5), D459, D465, D466, D467, D470, D471 (G6), D472, D476, D477, D478, D479 and D480 (the cuts; amends D451 points 5-7); D447 (the deck draw, unchanged). Pre-registered here, before any J166 data: the label contract and reads (a)-(c) computed by var/lab-j166-local/bin/labels.py, the agreement reads (i)-(vi) by var/lab-j166-local/bin/reads.py, the savings by var/lab-j166-local/bin/cuts.py and the tool's counters by var/lab-j166-local/bin/metrics.py, all exactly as written in the pilot. A candidate of (iv) HOLDS on a spine only if its point is > 0 and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. Every other difference is a candidate (D447 point 9). No read carries any other verdict
- outcome: failed (timeout: step run4 ran past 10800 s)
- headline: branches 18166, atlas.spinesDone 3, atlas.branchedInFull 22, atlas.screened 0, atlas.stoppedOptions 11, atlas.labels -1, atlas.confident -1, atlas.timeoutShare 0.0074, atlas.effectSourceNullBranches 0, atlas.exileLinksLostBranches 0, atlas.branchRestarted 0, atlas.branchCapped 1628, atlas.problems 2
- summary: results/J166/summary.md (the PC session's; judge it against the rule)
- commits: mtg-table 325c2dd
- follow-up: template morning-read: not due (the job did not finish done)
