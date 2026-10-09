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
