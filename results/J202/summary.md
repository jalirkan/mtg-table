# J202 — random-v4, iteration 3: read 2026-11-09 18:10 EST

**Readings (D527 point 6, each arm on its own 1,200-game D398 match against search-v1-anytime, 0 errors, 0 timeouts):**

| arm | change | score [95%] | Elo [95%] | reading |
|---|---|---|---|---|
| (a) search-v2-rrandom4 | R8 made lethal-aware | 0.4433 [0.4230, 0.4636] | −39.5 [−53.9, −25.3] | **NOT SHOWN, loses badly** |
| (b) search-v2-rrandom4-m40 | + the override margin 20 → 40 | 0.4700 [0.4511, 0.4889] | −20.9 [−34.1, −7.7] | **NOT SHOWN, worse, not badly** |

The loop does not stop (D527 point 7: only (a) lost badly). The lethal-aware good block did nothing (−39.5 against
random-v3's −30.8; v4.goodBlockLethal fired 0.002 a rollout — good blocks that also keep the seat alive barely
exist). The override margin is the one lever that moved: +18.6 Elo on the point for doubling it, and the arm's
overrides of Forge fell from 33.3% to 26.4% of searched decisions (search-v2's own: 18%). That is the search trusting
its noisier values less, not the values getting better.

**The track so far** (every arm against search-v1-anytime on the same 600 deals):

| iteration | arm | Elo [95%] | reading |
|---|---|---|---|
| v2 (J199 a) | random-v2, both rollout seats | −43.7 [−57.1, −30.4] | loses badly |
| v2 (J199 b) | random-v2, searching seat only | −25.5 [−38.3, −12.8] | worse, not badly |
| v3 (J201 a) | + R8 good block | −30.8 [−44.4, −17.2] | loses badly |
| v3 (J201 b) | + R9 held instant | −29.6 [−43.7, −15.6] | loses badly |
| v4 (J202 a) | R8 lethal-aware | −39.5 [−53.9, −25.3] | loses badly |
| v4 (J202 b) | + margin 40 | −20.9 [−34.1, −7.7] | worse, not badly |

**What follows (D523 point 10):** random-v5 with the margin as the variable, and the question it has to settle: as the
margin rises the arm converges on plain Forge (no override at all), so whether random values carry *any* signal is
read against the plain-Forge seat on the same deals, not only against search-v2. D528 / J204: (a) margin 60, (b) the
plain Forge seat as the baseline, both 1,200 games on the same deals. The runner's full report is `report.md` beside
this file.
