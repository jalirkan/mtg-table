# J206 — random-v7, iteration 6: read 2026-11-10 09:45 EST

**Reading (D531; one 1,200-game D398 match against search-v1-anytime on the same 600 deals):**

| match | what it is | score [95%] | Elo [95%] | errors, timeouts | reading (D527's table) |
|---|---|---|---|---|---|
| search-v2-rrandom4them-lcb-m40 | the rollout's opponent random-v4, the searching seat's own continuation Forge's; `override=lcb` z 1, margin 40 | 0.4667 [0.4502, 0.4831] | −23.2 [−34.7, −11.7] | 0, 0 | **NOT SHOWN: worse, not badly** |

**SIGNAL, the arm minus J204 (b)'s policy-outlet on the same deals: +61.2 Elo [42.1, 80.3] (±19.1) — SIGNAL SHOWN**
(72.5% of the Forge-rollout search's own gain over the seat under it).

**The runner marks this job `failed`, and the fault is mine, not the data's.** 64 of the job's 65 checks pass. The
65th is a check I wrote, `v.v8 == null` ("no random-v8 was named"): the metric is absent, as intended, and the
runner reads a comparison on an absent metric as UNKNOWN, which fails a job. Both run steps exited 0, the match is
complete (1,200 games, 0 errors, 0 timeouts) and every number here is from the job's own `metrics.json` and report.
An absence is never checked with `== null` again; the verdict writes a 0/1 flag instead.

**What this says.** Handing the searching seat's own continuation back to Forge and keeping only the opponent
random gained +12.2 Elo on the point over the same rule with both seats random (J205 (a), same deals; about ±18,
so inside the noise, on the right side of it). The counters say what changed:

| side | priority: from a pass | to another play | to a pass | attack changed | block changed |
|---|---|---|---|---|---|
| search-v1-anytime (the other side) | 7.96% | 6.36% | 4.80% | 14.7% | 16.8% |
| J202 (b), both random, margin rule at 40 | 16.41% | 10.51% | 4.82% | 14.3% | 18.0% |
| J205 (a), both random, lcb at 40 | 11.39% | 7.43% | 1.88% | 7.8% | 11.5% |
| J206, opponent random only, lcb at 40 | 5.11% | 4.17% | 1.94% | 8.4% | 11.6% |

The share of plays made from a pass reads under the Forge-rollout search's: 5.1% against 8.0%, where both-random
arms ran at 11% to 19% (J202 (a), at margin 20, ran 19.2%). That is consistent with the excess coming from the
searching seat's own random continuation (a random self wastes what it holds, so acting now looked better than it
was) and not from the random opponent. It was measured with lcb on, and lcb itself took the share from 16.4% to
11.4% at the same margin, so whether the excess is gone without lcb is not measured yet: random-v8's arm (a)
measures it. lcb still held 35.5% of the overrides (1,669 of 4,703), and the arm overrides less than the
Forge-rollout search in every kind, attack and block at about two thirds of its rates. The counters give rates,
not which overrides win.

*(Corrected 2026-11-10 after D532's review: this paragraph first said the excess "is gone", that lcb "has nothing
bad left to remove", and "11% to 16%". No number of J206's changed.)*

**What follows (D531's rule, no owner question):** not a candidate; not "loses badly", so the loop does not stop
and the track stays open (SIGNAL SHOWN for the third time: +60.0, +49.0, +61.2). A new decision from the counters
(D532): random-v8 is the same rollout with the margin rule in place of lcb — `rollout=random4-them`, margin 40,
no lcb — the one corner not yet played, and the one the table above points at. D532 also names the last iteration
after it and when the track closes. The live seat is unchanged.

**The track so far** (every arm against search-v1-anytime on the same 600 deals):

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
| v7 (J206) | opponent random only, lcb at margin 40 | −23.2 [−34.7, −11.7] | worse, not badly |

**The deals and the run.** 150 blocks, 114,900,000 to 114,900,149, 1,200 games, the same as J205's and J204 (b)'s
(`sameDeals` 1). 2.37 hours, 7 workers; 934 ms a decision for the arm, 917 ms for the other side; 16.3 and 15.5
rollouts a decision, 50.0 and 51.7 ms a rollout (a random opponent makes a rollout no cheaper); 2 rollout errors,
0 step caps. Six memory-pressure events (07:36, 08:09, 08:30: the runner dropped to 6 workers and came back to 7
within about five minutes each time); they coincide with the scenery painter loading its models beside the job.
Both seats of every game ran under the same pressure, and the two sides' time per decision is within 2%.
