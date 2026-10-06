## D389 — Wider candidates ranked by a one-step prior: `rank=prior` generates up to `gen`, applies each once on a shared determinization, and keeps the best `cands` by the position after it

*Branch `c/search-week3`; D388 says how it was numbered.*

**2026-10-03**

**Decision.** With `rank=prior` (and `gen`, default `max(24, cands)`), the
three candidate builders enumerate up to `gen` instead of stopping at `cands`.
When more than `cands` were generated, `SearchPolicy.rank` plays each
candidate except the kept ones (Forge's answer, and pass for a priority
decision) through `playout` with `Limits.untilApplied`: one copy each, the SAME
determinization and engine seed for all (common random numbers, the AI still
never sees hidden cards), stopped as soon as the candidate has been played out
(`RolloutForcing.applied`: the priority answer taken, the stack empty and no
simultaneous trigger waiting; a forced combat declaration made and that
combat's damage dealt; or the turn over). The position is scored by the leaf,
or by D316's learned evaluator (`prior=eval,evalmodel=<model.json>`; logit ×
`LEAF_SCALE`; an unusable model is counted and the leaf ranks). The best by
that score fill the remaining slots; the prior gets 30% of the budget, and
what it does not reach ranks after the scored ones in enumeration order. The
record carries each option's `prior` and the `generated` count (protocol
amendment **M58**). Ladder player `search-v1-fixed3-ranked`
(`rank=prior,gen=24` in fixed-rollout mode), SPRT against `search-v1-fixed3`.

**Measured**: with `anytime=1` on the same 12 games, ranking ran on 25 of 324
searched decisions (the rest generated `cands` or fewer), scored 143
candidates and cut 100, at 393 ms per ranking; 16 rankings hit the 30% share
before scoring every candidate. Budget fallbacks 0.9%, 1,217 ms per decision.

**With main's leaf switch.** `prior=leaf` scores by the search's own leaf: the
hand-written one, or D354's learned evaluator when the config also says
`leaf=eval:<model.json>`. `prior=eval` scores by its own `evalmodel=` and falls
back to that leaf when the model is unusable. Both switches are off by default.

**Rejected.** Ranking by Forge's own `AiPlayDecision` (it only accepts or
declines); a full rollout as the prior (it is the search itself); ranking
without a shared determinization (the prior's noise would rank the deals).
