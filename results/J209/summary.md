# J209 — random-v9, iteration 8 and the track's last: read 2026-11-10 18:25 EST

**Reading (D533 point 7; one 1,200-game D398 match against search-v1-anytime on the same 600 deals, the arm read on
its own match).**

| match | what it is | score [95%] | Elo [95%] | errors, timeouts | reading (D527's table) |
|---|---|---|---|---|---|
| search-v2-rmix4them-m40 | a decision's rounds by turns Forge's rollout and the random-opponent rollout (round 0 Forge's); the margin rule at 40 | 0.4900 [0.4743, 0.5057] | −6.9 [−17.8, +3.9] | 0, 0 | **NOT SHOWN: worse, not badly** (the too-wide case) |

The match is complete (1,200 of 1,200, no draw, 588 won and 612 lost), all 49 of the job's checks pass and the
runner marks it `done`. It ran 15:59 to 18:16 at 7 workers, alone, with one five-minute drop to 6 workers at 16:25.

**Which row held, exactly.** The interval contains 0, so the arm is not "upper end below 0". It is also not the
candidate row "indistinguishable", which needs the lower end above −15 Elo: this one's is −17.8. D527's table reads
an interval that contains 0 with its lower end at or below −15 as worse, not badly (its too-wide case), written
before the track's first night, and D533 point 7 restates it. So: no candidate, no confirmation, and **the
random-rollout track closes** (D532 point 6, D533 point 8) with a closing decision, D534. The live seat is unchanged.

**What this says.** The mix is the track's closest arm, and the only one whose interval reaches 0: −6.9 against
−19.1 for the same margin with the random opponent in every round (J208 a), a difference of +12.2, about ±19
between two lines, so not a finding by itself. It is also about where a plain dilution would put it: half the
arm's rounds are Forge's own rollouts (3.46 Forge rounds and 2.94 random a decision), and half of J208 (a)'s −19.1
is −9.6. Nothing in the night says the second opponent model *added* information beside Forge's, which is what
D532 point 5 built the mix to test; what it shows is that taking half the random rollouts out takes about half the
loss out.

The mix's own counters, the arm's side (27,951 mix decisions):

| | Forge rounds | random rounds |
|---|---|---|
| rounds (a decision) | 96,832 (3.46) | 82,261 (2.94) |
| rollouts scored (a decision) | 250,585 (8.97) | 197,737 (7.07) |
| best alternative's pairs against Forge's answer | 36,532 | 33,885 |
| their mean paired difference | +793.1 | +692.6 |

Of the 8,311 decisions where the candidate the verdict read was paired in both kinds of round, the two kinds
pointed opposite ways in 872, 10.5%. The counter does not say which kind was right. (`search.rr.rollouts`, 202,549,
counts every rollout that seated the random seat however it ended; the 197,737 above are the ones that gave a
leaf. Their sum with the Forge rollouts is the arm's 448,322.)

| side | changed Forge's choice: priority / attack / block | priority: from a pass / to another play / to a pass |
|---|---|---|
| the arm (mix, margin 40) | 15.5% / 11.7% / 18.2% | 6.62% / 5.74% / 3.12% |
| search-v1-anytime (this match) | 19.3% / 15.3% / 21.0% | 8.16% / 6.33% / 4.81% |
| J208 (a) (random opponent every round, margin 40) | 15.3% / 14.1% / 17.5% | 6.70% / 5.58% / 3.03% |
| J206's arm (lcb at 40) | 11.2% / 8.5% / 11.6% | 5.11% / 4.17% / 1.94% |

The arm overrides Forge about as often as J208 (a) at priority and block and a little less in attack (11.7% against
14.1%). Rates only; none says which overrides win.

Cost is the same on both sides: 923 against 911 ms a decision, 16.0 against 15.6 rollouts, 6.2 against 6.0 rounds.
Budget fallbacks 77 and 114, step timeouts 5 and 8, rollout errors 0 and 0.

Information, deciding nothing, each about ±19: the arm minus J208 (b) +12.8, minus J206's arm +16.3, minus J202 (b)
+14.0; the arm minus J204 (b)'s policy-outlet +77.5 [58.7, 96.3], against the Forge-rollout search's own +84.4.

**The track, complete** (every arm against search-v1-anytime on the same 600 deals):

| iteration | arm | Elo [95%] | reading |
|---|---|---|---|
| v2 (J199 a) | random-v2, both rollout seats | −43.7 [−57.1, −30.4] | loses badly |
| v2 (J199 b) | random-v2, searching seat only | −25.5 [−38.3, −12.8] | worse, not badly |
| v3 (J201 a) | + R8 good block | −30.8 [−44.4, −17.2] | loses badly |
| v3 (J201 b) | + R9 held instant | −29.6 [−43.7, −15.6] | loses badly |
| v4 (J202 a) | R8 lethal-aware | −39.5 [−53.9, −25.3] | loses badly |
| v4 (J202 b) | + margin 40 | −20.9 [−34.1, −7.7] | worse, not badly |
| v5 (J204 a) | margin 60 | −24.4 [−38.4, −10.4] | worse, not badly |
| — (J204 b) | no search at all (the baseline) | −84.4 [−99.9, −69.3] | — |
| v6 (J205 a) | lcb at margin 40 | −35.4 [−49.5, −21.5] | loses badly |
| v6 (J205 b) | lcb at margin 60 | −34.3 [−47.8, −20.9] | loses badly |
| v7 (J206) | the opponent alone random, lcb at 40 | −23.2 [−34.7, −11.7] | worse, not badly |
| v8 (J208 a) | the opponent alone random, margin 40 | −19.1 [−30.3, −8.0] | worse, not badly |
| v8 (J208 b) | the same, margin 20 | −19.7 [−31.0, −8.4] | worse, not badly |
| v9 (J209) | Forge's and the random opponent's rollouts by round, margin 40 | −6.9 [−17.8, +3.9] | worse, not badly (too wide) |

Thirteen arms over eight nights, none a candidate. The search on guarded random rollouts sits about 20 Elo under
the search on Forge's rollouts at its best and 44 at its worst; the mix, half Forge's, about 7.

**What follows (no owner question):** the closing decision D534, with what would reopen the track (a seating where
the search decides the random defender's blocks; a learned rollout policy with a teacher that is not Forge). Next on
the machine: J210, D535's kinds night (which of the search's three kinds of decision carries its 84 Elo over the
seat with the search off).

Files: the runner's `~/code/lab/pc-results/results/J209/` (`report.md`, `verdict.json`, `match-J209a.json`,
`rollouts-a.json`, `worst-a.json`).
