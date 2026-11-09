# J201 — random-v3, iteration 2: read 2026-11-09 12:10 EST

**Readings (D525 point 6, each arm on its own 1,200-game D398 match against search-v1-anytime, 0 errors, 1 timeout):**

| arm | adds | score [95%] | Elo [95%] | reading |
|---|---|---|---|---|
| (a) search-v2-rrandom3 | R8, the good block, both rollout seats | 0.4558 [0.4365, 0.4752] | −30.8 [−44.4, −17.2] | **NOT SHOWN, loses badly** |
| (b) search-v2-rrandom3-held | R8 + R9, the held instant | 0.4575 [0.4374, 0.4776] | −29.6 [−43.7, −15.6] | **NOT SHOWN, loses badly** |

Against J199 (a)'s −43.7, R8 moved the point by +13 Elo (interval ±13.6, so suggestive, not shown); R9 adds +1.2 on
±18.5, nothing. Both arms searched more than search-v2 (×1.13 and ×1.15 rollouts a decision) at equal ms: a bias of
the value, not a budget. Random-v3 is the first iteration that loses badly (D525 point 7, J199 was not): if the next
one loses badly too, the loop stops.

**Why R8 did less than hoped** — its own diagnostics: v3.goodBlock 0.021 per random rollout, v3.goodBlockDead 0.147
(R2 rejected R8's assignment, per attempt): seven times as many rejections as takes. Under a lethal attack, where the
defender's block decides the game, R8 moved a blocker off the attacker whose block kept the seat alive, R2 rejected the
assignment, and the uniform draw stood — the defender stayed random exactly there. A second signal in the override
table: the arm overrides Forge's answer at 39.3% of priority decisions against search-v2's 18.8% at the same margin,
so noisier values beat a fixed margin.

**What follows (D523 point 10):** random-v4 as D527 on lane `pc/rollout-random-v4`, two arms, one change each —
(a) `search-v2-rrandom4`: R8 made lethal-aware (a good block only when the assignment keeps the seat alive; the
fallback prefers surviving assignments with the most good blocks), read against (a)'s −30.8; (b) `rrandom4-m40`: the
same plus the override margin raised 20 → 40, read against (a). J202 is the night. The runner's full report is
`report.md` beside this file.
