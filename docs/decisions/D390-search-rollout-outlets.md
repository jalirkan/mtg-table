## D390 — The outlet policy inside the rollouts: `rollout=outlets` plays the searching seat with D310's policy in front of Forge, `rollout=both` the opponent too

*Branch `c/search-week3`; D388 says how it was numbered.*

**2026-10-03**

**Decision.** `playout` seats `RolloutController.Outlets` (a
`PolicyControllerAi` with an acting `OutletPolicy`, no search, no decision
sink, the candidate still forced first through the shared `RolloutForcing`)
for the searching seat when `Limits.outletsUs`, and a `PolicyControllerAi`
with the policy for the other seat when `outletsThem`. `SearchConfig`'s
`rollout=default|outlets|both` sets them; the coach grader's
`Limits(deadline, horizon, maxSteps)` keeps plain Forge (its lane may take the
switch later). Ladder player `search-v1-fixed3-routlets` (`rollout=outlets`),
SPRT against `search-v1-fixed3`.

**Measured** (fixed three rounds, the same 12 games): **136.3 ms of play per
rollout against 135.3** with plain Forge (+0.7%), copies 9.4 against 9.1 ms;
41.0 and 40.2 s a game. At the 1.5 s budget, 73.9 against 73.2 ms. The policy
costs nothing measurable per rollout; whether it values sacrifice lines better
is the SPRT's question.

**Rejected.** The opponent on the policy by default (what the opponent plays is
not ours to assume; a human opponent is not D310's policy); the full
`--ai-policy search` seat inside rollouts (recursion).
