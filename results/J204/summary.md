# J204 — random-v5, iteration 4: read 2026-11-10 01:20 EST

**Readings (D528 point 6; two 1,200-game D398 matches against search-v1-anytime on the same 600 deals):**

| match | what it is | score [95%] | Elo [95%] | errors, timeouts | reading |
|---|---|---|---|---|---|
| (a) search-v2-rrandom4-m60 | random4 rollouts, override margin 60 | 0.4650 [0.4449, 0.4851] | −24.4 [−38.4, −10.4] | 0, 0 | **NOT SHOWN, worse, not badly** (D527's table) |
| (b) policy-outlet | search-v2's seat with the search off (the baseline) | 0.3808 [0.3601, 0.4016] | −84.4 [−99.9, −69.3] | 0, 1 | (no reading of its own) |

**SIGNAL, (a) minus (b): +60.0 Elo [39.3, 80.7] (±20.7) — SIGNAL SHOWN.** The hand check agrees with the runner's
line: half-widths 14.0 and 15.3, √(14.0² + 15.3²) = 20.7; the difference is 45 Elo clear of the ±15 bar and its lower
end 39.3 is far from 0, so neither of the posted verdict's float cases (a difference that reads exactly 15.0, an end
within 0.05 of 0) applies. `signalInconclusiveCount` 0.

**What this says.** A search whose rollouts are played by random seats under the guardrails is 60 Elo stronger than
the same seat with no search at all, and keeps 71% of what the Forge-rollout search gains over that seat (84.4). The
random values are not noise: they carry most of the signal. What they do not do is beat the Forge rollouts
(−24.4, and the margin is no longer the lever: margin 40 → 60 moved the point −3.5, J202 (b) −20.9 → −24.4, inside
either interval). J202 (b) minus the baseline on the same deals: +63.5.

**What follows (D528 points 6–8, no owner question):** the track stays open on the margin/LCB line; the arm is not a
candidate; `marginStep` −3.5 is below 0, so `v6Margin` = 40 and random-v6's deciding arm is
`search-v2-rrandom4-lcb-m40` (D350's `override=lcb`, z 1, on `rollout=random4` at margin 40), with `-lcb-m60` beside it
(D530, J205). The two-losing count: random-v5 does not lose badly (upper end −10.4, not below −15); the loop does not
stop. The live seat is unchanged.

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

**The deals.** Both matches: 150 blocks, 114,900,000 to 114,900,149, 1,200 games (`var/j204/seeds-a.json`,
`seeds-b.json`); no memory retry, so (a) and (b) are on the same deals as J199–J202.

**Disclosures (the job is `alone: yes`, and it was not alone twice):**

1. **21:55–22:27 EST, during (a):** two of my lane agents ran Java beside the match (a bridge build and self-tests;
   the runner's pressure-1 to pressure-4, a drop to 6 then 5 workers and back to 7). Both sides of a match share the
   load, and the figures agree: (a) recomputed without every game that touched that window is −24.6 Elo on 904 games,
   against −24.4 on all 1,200. The rule since: no lane agent runs Java beside an `alone` job.
2. **22:42 EST, during (a):** one more drop to 6 workers for 7 minutes (pressure-5), no cause of mine found.
3. **00:30 EST, during (b):** a drop to 5 workers (pressure-8, swap-in), as the scenery painter on the GPU loaded its
   model into memory. The baseline seat does not search; only search-v2's side could lose rollouts to it, which would
   flatter the baseline and understate SIGNAL. search-v2's side in (b): 900 ms and 15.64 rollouts a decision, 0.4%
   budget fallbacks, the same as in (a). (b)'s one timeout is 1 game of 1,200.

The runner's full report is `report.md` beside this file.
