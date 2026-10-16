## D437 — search-v2 with the learned evaluator at its leaves: the ladder player `search-v2-evalleaf` is search-v2 plus D354's `leaf=eval:<evaluator v2>`, the match line counts the evaluator's leaves and their cost, and the bench holds that only the leaf changes, nothing hidden is read and the budget holds

*Branch `pc/j128-eval-leaf` (the PC session, for lab job J128 on `pc-jobs`). D436 is D435's lane's,
reserved and unused (D200), so it stays unused. Extends D354 (the leaf switch), D364 (evaluator v2) and
D412 (search-v2).*

**2026-10-15**

**Context.** The owner asked for J128 (pc-jobs README, 2026-10-15): score search-v2's leaf positions
with the learned evaluator's P(win) for the searching seat instead of the hand-written leaf, on the
seat's own redacted view, the default staying `hand`; register a ladder player; prove the switch
changes only the leaf; check the time per decision stays inside the 1.5 s budget; then one fixed D398
match against search-v2. J125 (D431) found the hand leaf's weights are not where the gains are.

Most of the mechanism exists already:

- **D354 added the switch** in 2026-10-03: `SearchConfig` `leaf=hand|eval:<model.json>`, `hand` by
  default and printed only when set. `SearchPolicy.playout` scores a rollout that did not finish the
  game as `LEAF_SCALE · logit(P(win))` (p clipped to [1e-6, 1 − 1e-6]), so the margin rule keeps its
  meaning, and a finished game keeps the hand leaf's ±WIN. One loaded evaluator per path is shared.
- **The evaluator reads only the searching seat's knowledge.** `PositionEvaluator.winProbability(game,
  viewer)` goes through `GamePosition`, which reads every other hand and every library as a size; a
  face-down card is its face-down body. In a rollout the copy has been determinized first (D312), so
  the hidden cards there are a redeal anyway. `EvalSelfTest` scrambles the hidden zones of every
  recorded game and requires unchanged rows.
- **The ladder kind `search-eval`** (D354's gate 3) takes a search player's params plus `model`, the
  12-hex sha256 prefix of `var/ml/models/eval-<model>.json`. A missing or changed file makes the player
  unavailable, never another model.
- **Evaluator v2** is D364's model over nights 1–3 (J067), `var/ml/models/nights-1-3-eval.json` on the
  PC, sha256 `dcdae3745b84…`. It is the coach's win-chance model (D361). Every card of the ladder's
  confirm deck set (434 distinct names, 2,400 main-deck copies) is in its 731-card vocabulary.

**The prior evidence is against it.** D354's gate 2 on v2 (J081) found no regret gain at the live
horizon: hand − eval −0.0009 [−0.0063, +0.0047] over 291 decisions. J100's re-read found v2 orders a
decision's options slightly worse than the hand leaf (pairwise agreement with the truth 0.680 against
0.711). That closed "the evaluator as a search leaf" as a gate track. J128 asks a different question,
the one the owner wants answered: does search-v2 *play* better with it, measured as a game result at
the live budget. Gate 2 measured ranking against full-game truth tables on a fixed decision set; a
match measures the whole loop, including the margin rule and the anytime racing, which act on the
leaf's scale and noise.

**Decision.**

1. **No second switch.** The search's leaf switch is D354's `leaf=eval:<model.json>`. A bare
   `leaf=eval` naming a default model would hard-code a gitignored, PC-only file into the engine;
   the path in the config, pinned by its hash in the ladder, is the safer form and already exists.
2. **The player** `search-v2-evalleaf` (`tools/ai-ladder/players.json`): kind `search-eval`,
   search-v1-anytime's params (search-v2: Default, outlets, 1.5 s, anytime) plus `model:
   dcdae3745b84`. Its seat config is search-v2's plus `,leaf=eval:var/ml/models/eval-dcdae3745b84.json`
   and nothing else; search-v2's hash (`cdd55e02a89c`) is unchanged. The job copies the PC's
   `nights-1-3-eval.json` to that name and the kind checks the hash. The live seat's default leaf
   stays `hand` (`LIVE_DEFAULTS` is still `anytime=1`).
3. **Counters.** `SearchPolicy.playout` counts each evaluator leaf (`search.leaf.eval`) and its cost in
   nanoseconds (`search.leaf.evalNs`; a leaf costs tens of microseconds, so microseconds would round to
   0). A hand-leaf seat writes neither, so every existing player's counters are unchanged. The ladder's
   match line carries `evalLeaves` and `evalLeafUs` (mean µs per evaluator leaf, null when none) on
   each side, beside J126's `msPerDecision`. The job's checks use them: the evaluator side must have
   scored leaves, search-v2 none.
4. **Tests.**
   - `DecisionSelfTest` (engine-free): search-v2's config text plus `leaf=eval:<file>` differs from
     search-v2 in exactly one of the config's public fields, `leafModel`, read by reflection so a field
     added later is held too. The text is search-v2's plus the one key, key order does not matter,
     `leaf=hand` is search-v2 itself, and the live seat's leaf is the hand leaf.
   - `ai-bench --selftest`, three engine scenarios on the committed fixture model
     (`fixtures/eval/model.json`, so no PC-only file is needed):
     - *only the leaf changes*: six rollouts with the same seed, candidate and horizon, once per leaf,
       end alike (over, result, turns, step cap). The hand run's leaf is the hand leaf of the
       evaluator run's final position (a test probe, `SearchPolicy.leafProbeForTest`, sees that
       position). The evaluator run's leaf is `evalLeaf` of it. It differs from the hand leaf on
       every unfinished rollout, and only evaluator leaves are counted;
     - *nothing hidden enters*: two games that differ only in hidden cards give the same features on
       the real game and the same evaluator-leaf rollouts seed for seed. The hidden cards are which of
       the opponent's cards is in hand and which in the library, the library's order, and the AI's own
       library order. A third game that differs in a card the AI sees (its own hand) changes the
       features, so the comparison has teeth;
     - *the budget*: a search-v2 decision with the evaluator leaf on a main-phase board searches with
       evaluator leaves and stays under 1.5 s (+1 s slack for a loaded machine). It printed 302 ms
       here, 12 full rounds. One evaluator leaf costs under 1 ms; it printed 18 µs on the fixture
       model.
   - `web/test/ai-ladder.test.ts`: the player is search-v2's params plus the model and nothing else.
     Its seat config is search-v2's plus the one key, against a stand-in model in a scratch checkout,
     and in this checkout too when the PC's file is present, otherwise unavailable. The match tally
     sums `search.leaf.eval` and `.evalNs` into `evalLeaves` and `evalLeafUs`.

**Not done here.**

- **A blended leaf** (α · evaluator + (1 − α) · hand, both in leaf points). The brief allows it only if
  its single mix is chosen on the dev deck set first, as J125 chose its step. That tuning would add
  about 4 hours of games to the job. The ranking evidence (J081, J100) puts the best mix near the hand
  leaf. First learn whether the pure evaluator leaf plays differently at all. A follow-up if J128 is
  close.
- **D354's gates are not reopened.** J128's match is the owner's own test of playing strength, read by
  its own pre-registered rule. A NOT SHOWN result does not "fail" gate 3, and an ADOPT result does not
  replace D354's promotion rule for the coach.

**Cost.** The evaluator's encode plus predict was 5.7 + 2.9 µs a position on the 3,133-feature fixture
(`EvalSelfTest`). On v2's 12,670 features the brief's 10–25 µs is the expectation, and the job's match
line measures it (`evalLeafUs`). At most 12 rounds of 6 candidates, 72 leaves a decision, that is under
2 ms against search-v2's ~900 ms a decision (J127's match), under 1% of the budget. The anytime loop's deadline governs the time either way.
