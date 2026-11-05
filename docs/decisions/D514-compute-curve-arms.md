## D514 — the compute-curve arms: `search-v2-ms3000` and `search-v2-ms6000` are search-v2 with only the thinking budget changed, registered so that one night can measure whether more compute per decision buys strength

*Branch `pc/d514-compute-curve-arms`, off main `1d0d18f3` (D513's merge). D514 was reserved for this lane
(`node tools/decisions.mjs next` gave D514). Extends D412 (search-v2, the ladder's `search-v1-anytime`) and D398
(the fixed match). Serves the play-AI review of 2026-11-05
(`~/code/pc-results/study/play-ai-review-2026-11-05.md`, §3a and §5 row 2). Two ladder players, a test each side and
this file; the live seat, the bridge's behaviour, the wire and the protocol are unchanged, so it is free under D509.*

**2026-11-05**

**Context.** The review's §3a finds that what search-v2 does beyond Forge is fixed by its budget:

- a searched decision takes about 907 ms and plays **14–16 rollouts** (J139: 1,600,784 evaluator leaves over
  110,800 decisions; J131: 16.2), about 63 ms each;
- against up to six candidates (D312) that is **2–3 rollouts a candidate**, and the search's own noise report
  (J068 §3) agrees: 42% of its picks overlap the runner-up's interval, and in 18% the pick is more likely the worse
  of the two;
- the evidence that compute buys more is indirect: the anytime loop's +9.3 Elo [+2.5, +16.0] (J102) came from
  deciding the 5% of decisions the old loop handed back; 12 rounds against 3 flip 4.4% of gate 2's picks for
  +0.001 [−0.000, +0.003] regret a decision (J068), which at about 23 searched decisions a game would be about
  +16 Elo if the gains added up (a hypothesis), and about +50 at the upper end;
- **no ladder match has ever been played at any budget but 1.5 s.** The search hint already runs at 3 s (D429).

The answer orders the review's plan: if more rollouts a decision buy strength, the next work is getting more of
them inside the live budget (parallel rollouts, a learned prior that spends them on fewer candidates); if they do
not, the rollouts themselves are the weak part. The owner, 2026-11-05: *"Go, and feel free to play with the 1.5
second limit. A production model needs to be fast but we can experiment for testing."*

**Decision.**

1. **Two ladder players** in `tools/ai-ladder/players.json`, kind `search`, every param byte for byte
   `search-v1-anytime`'s (search-v2: `profile Default`, `outlets on`, `anytime on`) except **`budgetMs`**, the
   kind's wall-clock budget per searched decision, which the seat config writes as `ms=`:

   | player | params | seat config | config hash |
   |---|---|---|---|
   | `search-v1-anytime` (search-v2) | `budgetMs 1500` | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1` | `cdd55e02a89c` (unchanged) |
   | `search-v2-ms3000` | `budgetMs 3000` | the same with `ms=3000` | `24df578ecda3` |
   | `search-v2-ms6000` | `budgetMs 6000` | the same with `ms=6000` | `47f6efc97360` |

   Each note reads "search-v2 at 3000 ms / 6000 ms a decision: the compute-curve arm of D514; for measurement,
   never the live seat".
2. **The budget is the only intended difference, and its companions do not scale.** `SearchPolicy`'s anytime loop
   (`searchAnytime`) runs to `t0 + budgetFor(kind)`, which is `budgetMs` for every kind but the mulligan's. The
   limits beside it are kept at search-v2's values, not scaled with the budget:
   - **`maxRounds` 12** (`maxrounds=12`): the loop stops after 12 complete rounds, deadline or not, and a decision
     that stops there spends less than its budget (D437's budget scenario did 12 rounds in 302 ms);
   - **`minRounds` 2** (`rounds=2`) and the anytime racing, which starts at round 3 at z 2 (`Anytime.RACE_FROM`,
     `RACE_Z`) and ends the decision when only Forge's answer is left: counted in rounds, so they mean the same thing
     at any budget. `Anytime.pruneToBudget` prunes the candidates to what the time left can carry, so it follows
     the budget by design;
   - **each rollout's step cap, 20,000 engine steps**, and its step clock **2 s past the deadline**
     (`STEP_GRACE_NS`, D468): a guard against a step that never ends, in steps and seconds, not a share of the budget;
   - **Forge's own think limit inside a rollout** (`copy.AI_TIMEOUT = 1`, one second a Forge decision in the copy);
   - **`mullMs` 6000 and `PRIOR_SHARE` 0.3** belong to `mull=1` and `rank=prior`, both off here.

   `DecisionSelfTest` holds the first point mechanically (below), so a field added to `SearchConfig` later is held
   too.
3. **The live seat stays search-v2 at 1.5 s** (`SearchConfig.LIVE_DEFAULTS` is still `anytime=1`; `parseLive("")`
   still gives 1500 ms). A production seat must stay fast: a person waits on every searched decision, and 6 s is
   not a wait anyone plays through. Whatever the night finds, these two names are measurements, never a seat.
4. **The pre-registered rule for the night that uses them**, copied from the review's §5 row 2. Three fixed D398
   matches on the confirm set, 1,200 games each:
   - search-v2 vs forge-default (the re-anchor, §5 row 1: score and Elo with the interval, no verdict);
   - search-v2-ms6000 vs search-v2;
   - search-v2-ms3000 vs search-v2.

   *Judged by:* **COMPUTE PAYS** if ms6000's lower end is above 0.5 and its point is ≥ +15 Elo. **COMPUTE DOES NOT
   PAY** if its upper end is below +20 Elo (0.529). Otherwise inconclusive: confirm with 4,800 games. The verdict is
   ms6000's; ms3000 is the curve's middle point and is read beside it, not judged.

   *What each verdict decides next:*
   - **PAYS** → the review's §5 rows 4 and 5: parallel rollouts (or a faster copy), aiming at 4× the rollouts
     inside 1.5 s, and a learned prior from per-option values that spends the rollouts on fewer candidates;
   - **DOES NOT PAY** → the rollout policy: more rollouts of the same quality do not help, so what a rollout plays
     is the next thing to improve. It closes §5 row 4 and row 5's ordering arm;
   - **inconclusive** → the 4,800-game confirmation of ms6000 against search-v2 decides it.

**Rejected.**

- **A 12 s arm.** It would show where the curve flattens, but if 6 s does not pay, 12 s answers nothing the night
  needs, and the pilot shows a bigger deadline alone barely moves the rollouts. Added under its own name if 6 s pays
  and the curve's shape matters.
- **A 0.75 s arm.** The cheaper side of the curve says how much strength the live budget is buying, not whether
  more would buy more, which is the question that orders the plan. It is cheap to add later under its own name.
- **Changing anything but the budget** — scaling `maxRounds`, `cands` or the step clock with it. Each is a second
  variable, and a gain could not be laid at the budget's door. The arms keep search-v2's companions and the match
  line reports what the budget actually bought (`msPerDecision`).

**Measured.**

- `./tools/ai-ladder.sh list` names both players, playable, with the seat configs and hashes in the table above;
  `search-v1-anytime` keeps `cdd55e02a89c`.
- `DecisionSelfTest` (engine-free, `bridge/build.sh`): for `ms=3000` and `ms=6000`, search-v2's config text with
  only `ms` changed parses to a config whose public fields equal search-v2's in all but `budgetMs` (by reflection),
  with `maxRounds` 12, `minRounds` 2 and `mullMs` unchanged, and whose text is search-v2's with `ms` changed; the
  live seat's budget stays 1500 ms. `decision selftest: 242 check(s), 0 failure(s)`; `build OK`.
- `web/test/ai-ladder.test.ts`: each arm's raw params are `search-v1-anytime`'s with `budgetMs` replaced, its
  resolved params are search-v2's but the budget, its seat config is search-v2's with `ms=` changed, and its hash is
  the table's; search-v2's hash is unchanged.
- A pilot (`ai-ladder.sh match search-v2-ms3000 search-v1-anytime --games 2 --batch-pairs 1 --jobs 1 --purpose
  pilot`, one batch of four games in this worktree, its own `--dir`), and the same for `search-v2-ms6000`. Both
  finished 4 of 4 games, no draws, errors or timeouts, 2–2, on the same four deals (seed 114900000). From the match
  line and the batches' counters:

  | pilot | side | ms a decision (`msPerDecision`) | rollouts a decision | rounds a decision | raced out |
  |---|---|---|---|---|---|
  | ms3000 vs search-v2 | search-v2-ms3000 | **1,055.0** | 16.5 | 6.75 | 117 |
  |  | search-v1-anytime | **786.4** | 14.8 | 5.92 | 98 |
  | ms6000 vs search-v2 | search-v2-ms6000 | **1,017.4** | 17.7 | 7.18 | 127 |
  |  | search-v1-anytime | **719.8** | 15.4 | 6.59 | 84 |

  **The arms think longer, but not much longer.** Twice and four times the budget bought 1.34× and 1.41× the time
  a decision and 1.12× and 1.15× the rollouts, and the game times did not move (ms3000's four games 32–63 s,
  ms6000's 26–63 s). Most of search-v2's decisions end before the deadline at any budget: the race retires every
  alternative, or the loop finishes its 12 rounds. Only the minority with several close candidates runs to the
  deadline, and only there does the budget buy anything. Four games a side is a pilot, not an estimate, but the
  direction is plain: **ms6000 is search-v2 plus about 15% more rollouts, not 4×**.

**Residuals.**

- **A 6 s seat is not playable live.** Both arms are for measurement only. If compute pays, the live seat gets it
  from the work §5 rows 4 and 5 describe (more rollouts inside 1.5 s), never by raising the budget.
- **The arms test the budget as search-v2 spends it, which is a small change in compute** (the pilot, above). The
  pre-registered rule reads "does a 4× budget pay". With the race and `maxRounds` 12 unchanged, it is closer to "do
  about 15% more rollouts, on the decisions the deadline cuts, pay". A DOES NOT PAY then says little about 4× the
  rollouts, which is what §5 rows 4 and 5 would buy, and should not close them on its own. The question for the
  owner before the night: run the arms as registered (the brief's design, measured here), or add arms whose
  `maxRounds` (and perhaps the race's z) are lifted with the budget so that the rollouts scale, not only the
  deadline. That is a second variable and a decision of its own; this one does not make it.
- **The arms' games take about as long as search-v2's, not 2.5× longer.** The review's §5 estimate (a side thinking
  6 s stretches a search-vs-search game about 2.5×: about 5.5 h for ms6000's 1,200 games and 3.3 h for ms3000's on
  7 workers, about 11 h with the re-anchor) assumed the budget is spent. The pilot's game times did not move, so the
  night is shorter than budgeted. The ladder's 300 s per-game timeout (`--game-timeout`) is not at risk at these
  budgets; it would be for arms that lift `maxRounds`.
- **How often each limit ends a decision is not counted.** `search.rounds`, `search.rollouts` and
  `search.anytime.retired` are sums; nothing says whether a decision ended at the deadline, at 12 rounds or when the
  race left only Forge's answer. The night's write-up can bound it from the sums; a counter per ending would say it.
- **Wall-clock arms are machine-dependent**, as search-v2 is (D388): the curve is the PC's, under the night's load.
