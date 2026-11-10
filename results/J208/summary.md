# J208 — random-v8, iteration 7: read 2026-11-10 15:50 EST

**Reading (D532; two 1,200-game D398 matches against search-v1-anytime on the same 600 deals, each arm read on its
own match). J208 is J207 reposted unchanged on the same pin (`429ccd9e`); J207 failed in its pilot on a line of the
job file, before any rated game (`results/J207/summary.md`).**

| match | what it is | score [95%] | Elo [95%] | errors, timeouts | reading (D527's table) |
|---|---|---|---|---|---|
| (a) search-v2-rrandom4them-m40 | the rollout's opponent random-v4, the searching seat's own continuation Forge's; the margin rule at 40, no lcb | 0.4725 [0.4566, 0.4884] | −19.1 [−30.3, −8.0] | 0, 0 | **NOT SHOWN: worse, not badly** |
| (b) search-v2-rrandom4them | the same at the Forge-rollout search's own margin, 20 | 0.4717 [0.4555, 0.4879] | −19.7 [−31.0, −8.4] | 0, 0 | **NOT SHOWN: worse, not badly** |

Both matches are complete (1,200 of 1,200, no draw), every check of the job passes and the runner marks it `done`.

**What this says.** With the opponent alone random and the plain margin rule, the arm lands where the track's best
arms already were: −19.1 and −19.7 against J206's −23.2 (lcb at 40) and J202 (b)'s −20.9 (both seats random, margin
40). The differences are +4.1, +1.8 and, between the two margins, 0.6 Elo, each about ±19 between two lines, so none
of them is a finding. The best four arms of the track now sit within about 4 Elo of each other across three override
rules, both seatings and two margins, all about 20 Elo under the Forge-rollout search and none a candidate.

The counters say what the rule change did:

| side | changed Forge's choice: priority / attack / block | priority: from a pass / to another play / to a pass |
|---|---|---|
| (a) the arm, margin 40 | 15.3% / 14.1% / 17.5% | 6.70% / 5.58% / 3.03% |
| (a) search-v1-anytime | 19.1% / 15.3% / 18.0% | 8.08% / 6.34% / 4.68% |
| (b) the arm, margin 20 | 20.1% / 17.7% / 22.0% | 8.87% / 6.99% / 4.29% |
| (b) search-v1-anytime | 19.1% / 14.6% / 18.1% | 8.05% / 6.27% / 4.81% |
| J206's arm (lcb at 40) | 11.2% / 8.5% / 11.6% | 5.11% / 4.17% / 1.94% |
| J202 (b)'s arm (both seats random, margin 40) | 31.7% / 14.3% / 18.0% | 16.41% / 10.51% / 4.82% |

The excess of plays made from a pass that the both-seats-random arms showed (16.4% at margin 40, 19.2% at margin
20) is almost all gone without lcb once the searching seat's own continuation is Forge's: 6.7% at margin 40, under
the Forge-rollout search's 8.1%, and 8.9% at margin 20, 0.8 points above it. That is what D532's arm (a) was built to measure: the excess goes with the searching
seat's own random continuation, not with the random opponent and not with the margin rule. Dropping lcb brought the arm's override rates back to about the
Forge-rollout search's own, and at margin 20 above them in attack and block. None of that moved the result: the
arm overrides about as often as the Forge-rollout search does and still scores about 20 Elo under it. The counters
give rates, not which overrides win.

Cost is the same on both sides (930 against 913 ms a decision in (a), 879 against 867 in (b); 16.3 and 16.7 rollouts
a decision against 15.6 and 16.2).

**What follows (D532 point 4, no owner question):** no candidate, and not both arms losing badly, so the track
does not close here and its last iteration plays: **random-v9 (D533)**, `rollout=mix4-them`, a decision's rounds
alternating between Forge's rollout and the random-opponent rollout, on the margin rule at 40, the margin of (a),
the arm with the higher point. One 1,200-game match on the same deals, **J209**. Its arm a candidate goes to a
4,800-game confirmation; anything else closes the random-rollout track with a closing decision. The live seat is
unchanged.

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
| v7 (J206) | opponent alone random, lcb at 40 | −23.2 [−34.7, −11.7] | worse, not badly |
| v8 (J208 a) | opponent alone random, margin 40 | −19.1 [−30.3, −8.0] | worse, not badly |
| v8 (J208 b) | opponent alone random, margin 20 | −19.7 [−31.0, −8.4] | worse, not badly |
