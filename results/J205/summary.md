# J205 — random-v6, iteration 5: read 2026-11-10 06:40 EST

**Readings (D530 point 5; two 1,200-game D398 matches against search-v1-anytime on the same 600 deals):**

| match | what it is | score [95%] | Elo [95%] | errors, timeouts | reading (D527's table) |
|---|---|---|---|---|---|
| (a) search-v2-rrandom4-lcb-m40 (the deciding arm) | random4 rollouts, `override=lcb` z 1, margin 40 | 0.4492 [0.4292, 0.4691] | −35.4 [−49.5, −21.5] | 0, 1 | **NOT SHOWN, loses badly** |
| (b) search-v2-rrandom4-lcb-m60 | the same at margin 60 | 0.4508 [0.4317, 0.4700] | −34.3 [−47.8, −20.9] | 0, 0 | **NOT SHOWN, loses badly** |

**SIGNAL, (a) minus J204 (b)'s policy-outlet on the same deals: +49.0 Elo [28.3, 69.7] (±20.7) — SIGNAL SHOWN**
(58.1% of search-v2's own gain over the seat under it). `signalInconclusiveCount` 0. All of the job's checks pass.

**What this says.** The noise-aware override made the arm worse, not better: −14.5 Elo on the point against the
margin rule at the same margin on the same deals (J202 (b), about ±19, so inside the noise, but the wrong side of
it at both margins). The counters say why. lcb held 37.9% of the overrides the margin rule would have made, and it
cut every kind, not the kind that was in excess:

| side | priority: from a pass | to another play | to a pass | attack changed | block changed |
|---|---|---|---|---|---|
| search-v2 (the other side of (a)) | 7.99% | 6.50% | 4.87% | 14.8% | 18.0% |
| J202 (b), margin rule at 40 | 16.41% | 10.51% | 4.82% | 14.3% | 18.0% |
| J205 (a), lcb at 40 | 11.39% | 7.43% | 1.88% | 7.8% | 11.5% |
| J205 (b), lcb at 60 | 9.68% | 6.26% | 1.21% | 6.7% | 9.9% |

The from-pass share is still +3.4 points over search-v2's, while attack, block and to-pass overrides — which were at
search-v2's rates and are where a search earns its Elo — were cut to about half of them. So the override rule is not
the lever either: the excess is in the values themselves (random rollouts overrate acting from a pass), and a rule
that distrusts all values equally removes good overrides faster than bad ones.

**What follows (D530 points 6–7, no owner question):** neither arm is a candidate; the track stays open (SIGNAL
SHOWN); random-v6 lost badly (both arms), random-v5 did not, so the loop does not stop and the two-losing count is 1.
The pre-registered random-v7 runs next: `search-v2-rrandom4them-lcb-m40`, `rollout=random4-them` — the opponent's
rollout seat random-v4, the searching seat's own continuation Forge's — one 1,200-game match on the same deals
(D531, J206). If that arm loses badly too, the loop stops and the random-rollout track gets its closing decision.
The live seat is unchanged.

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

**The deals.** Both matches: 150 blocks, 114,900,000 to 114,900,149, 1,200 games, the same as J204 (b)'s (the
job's `sameDeals` 1 for both), so no baseline replay was owed. Hours: (a) 2.32, (b) 2.51; 0 rollout errors, 0 step
caps; random-seat failures 37 and 56 of about half a million random rollouts each.
