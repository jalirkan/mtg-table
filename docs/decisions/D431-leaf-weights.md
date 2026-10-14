## D431 — The hand leaf's four big terms get a weight each (`wlife`, `whand`, `wcreature`, `wother`, in percent, 100 by default), so J125 can tune them; search-v2 is unchanged

*Branch `pc/j125-leaf-weights`* (the PC session, for J125 on `pc-jobs`). Extends D312 (the leaf) and D351
(`untapped`, the leaf's first knob). Ladder players `search-v2-wlife50` … `search-v2-wother150`. D430 is left
unused here on purpose: two other PC agents were writing J124 and J126 at the same time, and one of them may
take the next free number.

**2026-10-14**

**Context.** Justin's search growth plan (approved 2026-10-08) has, as its #3, tuning the weights of search-v2's
leaf evaluation. The leaf (`SearchPolicy.leaf`) is hand-written: a win or loss, then the life curve (30 a point
to 5, 18 to 10, 8 to 20, 2 beyond), 40 a card in hand, −25 a poison counter, −300 for an empty library, and
every permanent through Forge's `GameStateEvaluator.evalCard` (creatures through `CreatureEvaluator`, lands
through `evaluateLand`, others 50 + 30 × mana value), ours plus and theirs minus. Only `untapped` (D351) could
be changed from a seat config. J125 needs the big terms changeable per ladder player.

**Decision.**

1. **Four `SearchConfig` keys, each a percentage 0..1000, default 100:** `wlife` (the life curve), `whand`
   (cards in hand), `wcreature` (every creature's `evalCard`) and `wother` (every other permanent's: lands,
   artifacts, enchantments, planeswalkers). Each multiplies its term on both sides. A win, a loss, poison, the
   empty library and the `untapped` term keep their points: they are rare (poison, the library) or already a
   knob (`untapped`), and the terminal scores are not a weight question. The four are the leaf's big terms:
   on the bench's self-test board they are life 200, hand −40, creatures 226 and other permanents 106 points.
2. **Printed only when not 100**, in that order, by `SearchConfig.toString()` and by the ladder kind's seat
   config (`kinds.ts`: `wLife`, `wHand`, `wCreature`, `wOther`, `omitAtDefault`), so search-v1, search-v2 and
   every registered player keep their seat configs and hashes (`search-v1-anytime` stays `cdd55e02a89c`).
   `parseLive` accepts them on top of search-v2; `LIVE_DEFAULTS` names none, so the live seat is unchanged.
3. **The hand leaf only.** `leaf=eval:<model>` (D354) and `prior=eval` (D389) score with the learned evaluator
   and ignore the weights. They reach every rollout through `Limits.leafWeights`, which both of the search's
   `Limits` (the rollouts and the prior) carry from the config.
4. **The plain leaf to the bit.** With all four at 100, `SearchConfig.leafWeights()` is null and the leaf
   multiplies by 1.0, which is exact in IEEE arithmetic: every term is the same double in the same order.
   `SearchPolicy.leaf(g, ai)` and `leaf(g, ai, untapped)` are unchanged callers (`LeafRows`, `CoachGrade`).
5. **Eight ladder players**, one coordinate step each: `search-v2-<key>50` and `search-v2-<key>150` (×0.5 and
   ×1.5) for each of the four keys, every other knob `search-v1-anytime`'s.

**What a weight is not.** Scaling a term also changes how far a candidate must beat Forge's answer in that
term's units (search-v2's margin rule: 20 leaf points), so a weight is a statement about the leaf's scale as
well as its balance. J125 measures the result as played; it does not separate the two.

**Tests.** `DecisionSelfTest` (the build's): the defaults, search-v2's config string unchanged, parse, print,
round-trip, the fixed print order, refusals (−1, 1001, 0.5, `x`, empty), and that `withLeaf`,
`withDecisions` and `withLeafWeights` each keep what the others set. `ai-bench.sh --selftest` (engine), two
scenarios: on a real board all four at 1 (or none) is the plain leaf exactly, each weight moves only its own
term (life exactly 200, hand exactly −40, creatures and other permanents non-zero) and the leaf is linear in
the four; and a search with all four at 0 scores every unfinished rollout exactly 0 (negative control: with the
plumbing missing, the same rollouts score the board's 492). `web/test/ai-ladder.test.ts`: the eight players
are search-v2's config plus one weight, nine hashes, the defaults resolve to the old config, the print order
matches SearchConfig's, and the engine parses each key.

**Rejected.** *A JSON weights file read by the search*: a file is not part of the seat config, so the ladder's
hash would not see a change in it. *Multipliers as decimals* (`wlife=0.5`): a percentage is an integer, which
the ladder's `int` parameters already handle and which prints one way only. *Weights for poison, the empty
library or the terminal scores*: rare or not a balance question; `untapped` already has its knob.
