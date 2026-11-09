# J199 — random rollouts in the search: read 2026-11-09 04:10 EST

**Readings (D523 point 9, each arm on its own 1,200-game D398 match against search-v1-anytime, 0 errors, 0 timeouts):**

| arm | score [95%] | Elo [95%] | reading |
|---|---|---|---|
| (a) search-v2-rrandom — random-v2 on BOTH rollout seats | 0.4375 [0.4186, 0.4564] | −43.7 [−57.1, −30.4] | **NOT SHOWN, loses badly** |
| (b) search-v2-rrandom-self — random-v2 on the searching seat only | 0.4633 [0.4451, 0.4816] | −25.5 [−38.3, −12.8] | **NOT SHOWN, worse, not badly** |

Neither arm is a candidate; the loop does not stop, the self-play path does not open, the live seat is unchanged. The
arms searched *more* than search-v2 (×1.15 and ×1.08 rollouts a decision, 7.1 and 6.6 rounds against 6.0) at the same
ms a decision, so the loss is a bias of the value, not a budget. Counters within ×1.4 of the pilot's (R7 2.38 / 1.92,
R3 0.57 / 0.31, R4 0.23 / 0.20 per random rollout); R2 and R6 never fire under `random-self`, as expected.

**The diagnosis** (the 976-game interim study, `scratchpad/j199-diag/report.md`, log analysis only): the arm overrides
Forge's "attack none" with extra attackers ×1.55 as often, and those overrides lose — in mirrored deals the arm made
0.72 more of them per game where it lost than search-v2 did. The cause is random-v2 as the rollout *defender*: a
uniform choice among no-block and each legal block rarely takes the block that kills the attacker and survives, so
attacks look safe. (b), where the rollout opponent is Forge again, is 18 Elo better than (a), which is the same fact
seen from the other side; what remains in (b) is the searching seat's own random blocks and instants.

**What follows (D523 point 10, no owner question):** random-v3 = random-v2 + **R8 `goodBlock`** (a blocker that can kill
the attacker and survive takes that block; counted `search.rr.v3.goodBlock`), as D525 on lane `pc/rollout-random-v3`
(built overnight, pilot after this job), two arms `search-v2-rrandom3-self` and `search-v2-rrandom3`, and J201 the
night that reads them under the same table. The principle's cheap path — Forge out of the loop at no cost — stays in
doubt until a v3 recovers it. The runner's full report is `report.md` beside this file.
