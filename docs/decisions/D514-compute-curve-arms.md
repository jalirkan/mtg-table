## D514 — the compute-curve arms: `search-v2-ms3000-r24` and `search-v2-ms6000-r48` are search-v2 with its budget and its round cap scaled together (×2, ×4), registered so that one night can measure whether more thinking per decision buys strength

*Branch `pc/d514-compute-curve-arms`, off main `1d0d18f3` (D513's merge). D514 was reserved for this lane
(`node tools/decisions.mjs next` gave D514). Extends D412 (search-v2, the ladder's `search-v1-anytime`) and D398
(the fixed match). Serves the play-AI review of 2026-11-05
(`~/code/pc-results/study/play-ai-review-2026-11-05.md`, §3a and §5 row 2). Two ladder players, a test each side and
this file; the live seat, the bridge's behaviour, the wire and the protocol are unchanged, so it is free under D509.
The lane's first commit registered budget-only arms (`search-v2-ms3000`, `-ms6000`); its own pilot showed the budget
mostly unspent (Measured, first table), and the second commit replaced them, before either played a rated game.*

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
   `search-v1-anytime`'s (search-v2: `profile Default`, `outlets on`, `anytime on`) except two, scaled by the same
   factor: **`budgetMs`**, the wall-clock budget per searched decision (seat config `ms=`), and **`maxRounds`**, the
   cap on complete rounds per decision (seat config `maxrounds=`). Both were already params of the `search` kind
   (`SEARCH_KEYS` in `tools/ai-ladder/kinds.ts`), so the kind is unchanged.

   | player | factor | params changed | seat config | config hash |
   |---|---|---|---|---|
   | `search-v1-anytime` (search-v2) | ×1 | — | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1` | `cdd55e02a89c` (unchanged) |
   | `search-v2-ms3000-r24` | ×2 | `budgetMs 3000`, `maxRounds 24` | the same with `ms=3000`, `maxrounds=24` | `994bf685f6b9` |
   | `search-v2-ms6000-r48` | ×4 | `budgetMs 6000`, `maxRounds 48` | the same with `ms=6000`, `maxrounds=48` | `6bab8ca5e273` |

   Each note reads "search-v2 at 3000 ms and 24 rounds / 6000 ms and 48 rounds a decision: the compute-curve arm of
   D514; for measurement, never the live seat".
2. **Only how much the search thinks changes.** `SearchPolicy.searchAnytime` runs until the deadline
   (`t0 + budgetFor(kind)`, `budgetMs` for every kind but the mulligan's) or `maxRounds` complete rounds, whichever
   comes first, so scaling one without the other leaves the other binding (the first pilot, below). Every other
   limit beside them stays search-v2's:
   - **`minRounds` 2** (`rounds=2`) and the **anytime race**, from round 3 at z 2 (`Anytime.RACE_FROM`, `RACE_Z`),
     which ends a decision once only Forge's answer is left: counted in rounds and intervals, with no correction for
     the repeated looks, so with 48 rounds the chance of retiring a truly better alternative is higher than with 12
     (the census: 54% of r48's decisions race-ended, search-v2's 45%). `Anytime.pruneToBudget` prunes the candidates to what the time left can carry, so it
     follows the budget by design;
   - **each rollout's step cap, 20,000 engine steps**, and its step clock **2 s past the deadline**
     (`STEP_GRACE_NS`, D468): a guard against a step that never ends, not a share of the budget;
   - **Forge's own think limit inside a rollout** (`copy.AI_TIMEOUT = 1`, one second a Forge decision in the copy);
   - **`mullMs` 6000 and `PRIOR_SHARE` 0.3** belong to `mull=1` and `rank=prior`, both off here.

   `DecisionSelfTest.budgetAndRoundsOnly` holds this mechanically (below), so a field added to `SearchConfig` later
   is held too.
3. **The live seat stays search-v2 at 1.5 s and 12 rounds** (`SearchConfig.LIVE_DEFAULTS` is still `anytime=1`;
   `parseLive("")` still gives 1500 ms and 12). A production seat must stay fast: a person waits on every searched
   decision. Whatever the night finds, these two names are measurements, never a seat.
4. **The pre-registered rule for the night that uses them**, copied from the review's §5 row 2; there, "ms6000" and
   "ms3000" are the review's names for this decision's `search-v2-ms6000-r48` and `search-v2-ms3000-r24`. Three
   fixed D398 matches on the confirm set, 1,200 games each:
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

- **A budget alone** (the lane's first arms, `search-v2-ms3000` and `-ms6000`, `maxRounds` left at 12): 4× the clock
  bought 1.41× the time a decision and about 15% more rollouts, because the 12-round cap took over where the deadline
  had bound (Measured). A verdict on them would have been about 15% more rollouts, not 4×. Removed from the registry
  before they played a rated game, so no ladder result carries their names or hashes (`24df578ecda3`,
  `47f6efc97360`).
- **Loosening the race too** (a larger z, or a later `RACE_FROM`), so that every decision scales. The race is how
  search-v2 decides, and it settles about half of all decisions at every budget (the census, below); changing it
  would measure a different search, not more of this one. The arms land under ×2 and ×4 in rollouts because of it,
  and the night reports by how much.
- **A 12 s arm.** It would show where the curve flattens, but if ×4 does not pay, ×8 answers nothing the night needs.
  Added under its own name if ×4 pays and the curve's shape matters.
- **A 0.75 s arm.** The cheaper side of the curve says how much strength the live budget is buying, not whether
  more would buy more, which is the question that orders the plan. It is cheap to add later under its own name.
- **Scaling `cands`, the horizon or the step clock with the budget.** Each changes what is searched, not how much.

**Measured.**

- `./tools/ai-ladder.sh list` names both players, playable, with the seat configs and hashes in the table above;
  `search-v1-anytime` keeps `cdd55e02a89c`.
- `DecisionSelfTest.budgetAndRoundsOnly` (engine-free, `bridge/build.sh`): for ×2 and ×4, search-v2's config text
  with `ms` and `maxrounds` scaled parses to a config whose public fields equal search-v2's in all but `budgetMs`
  and `maxRounds` (by reflection), with `minRounds` 2 and `mullMs` unchanged, and whose text is search-v2's with
  those two keys changed; the live seat stays 1500 ms and 12 rounds. `decision selftest: 242 check(s), 0
  failure(s)`; `build OK`.
- `web/test/ai-ladder.test.ts`: each arm's raw params are `search-v1-anytime`'s with `budgetMs` and `maxRounds`
  replaced, its resolved params are search-v2's but those two, its seat config is search-v2's with `ms=` and
  `maxrounds=` changed, its hash is the table's, the budget-only names are gone, and search-v2's hash is unchanged.
- **Four pilots**, each `ai-ladder.sh match <arm> search-v1-anytime --games 2 --batch-pairs 1 --jobs 1 --purpose
  pilot` in this worktree with its own `--dir`: one batch of four games, the same deal pair and game seeds
  (`fair-fight-900000001`, seeds 114900344700000/1), every one 4 of 4 games, 2–2, no draws, errors or timeouts.
  From the match line (`msPerDecision`) and the batches' counters (`search.rollouts`, `search.rounds` over the
  decisions searched):

  *The finding that motivated the change* — the budget alone (`maxRounds` 12):

  | pilot | side | ms a decision | rollouts a decision | rounds a decision |
  |---|---|---|---|---|
  | ms3000 vs search-v2 | search-v2-ms3000 | **1,055.0** | 16.5 | 6.75 |
  |  | search-v1-anytime | **786.4** | 14.8 | 5.92 |
  | ms6000 vs search-v2 | search-v2-ms6000 | **1,017.4** | 17.7 | 7.18 |
  |  | search-v1-anytime | **719.8** | 15.4 | 6.59 |

  ×2 and ×4 the clock bought 1.34× and 1.41× the time a decision and 1.12× and 1.15× the rollouts; the game times
  did not move (ms3000's four 32–63 s, ms6000's 26–63 s).

  *The arms as registered* — budget and round cap scaled together:

  | pilot | side | ms a decision | rollouts a decision | rounds a decision |
  |---|---|---|---|---|
  | ms3000-r24 vs search-v2 | search-v2-ms3000-r24 | **1,424.6** | 24.4 | 10.73 |
  |  | search-v1-anytime | **774.1** | 13.9 | 5.64 |
  | ms6000-r48 vs search-v2 | search-v2-ms6000-r48 | **2,486.5** | 44.8 | 19.64 |
  |  | search-v1-anytime | **828.7** | 14.6 | 5.81 |

  ×2 and ×4 bought 1.84× and 3.00× the time a decision and **1.75× and 3.07× the rollouts** (24.36 / 13.94 and 44.8 / 14.6). The games took longer:
  ms3000-r24's four 33–77 s (224 s in all) and ms6000-r48's 61–119 s (344 s), against 177–190 s for the same four
  deals in the budget-only pilots, where one side already spent 1.34–1.41× search-v2's time; against a true search-v2
  mirror the stretch is about 1.45× and 2.2×.
- **How decisions end: a census.** The pilots' counters are sums, and no counter says why a decision stopped. Each
  searched decision's record (D347: `rounds`, `timedOut`, `fallback`) does, so the same four deals were played again
  per arm through `AiBench play` directly with `--record-all` (the same seat configs, pairs file and `--seed
  114900000`; the same game seeds; recorded games are not their unrecorded twins, D511, so these are four similar
  games, not the pilots' own). A decision ended at the **deadline** if `timedOut`, at the **cap** if its rounds
  reached `maxrounds`, and **early** otherwise — the race left only Forge's answer (or, rarely, the alternatives errored or were
  pruned away) — with fallbacks apart (one a side,
  `unmappable`, in every run):

  | census | side | decisions | deadline | cap | early (race) | rollouts a decision | ms a decision |
  |---|---|---|---|---|---|---|---|
  | ms3000 (budget only) | search-v2-ms3000 | 97 | 14 (14%) | 31 (32%) | 51 (53%) | 16.5 | 1,153 |
  |  | search-v2 | 94 | 26 (28%) | 24 (26%) | 43 (46%) | 14.4 | 849 |
  | ms6000 (budget only) | search-v2-ms6000 | 97 | 1 (1%) | 48 (49%) | 47 (48%) | 18.6 | 1,253 |
  |  | search-v2 | 99 | 28 (28%) | 22 (22%) | 48 (48%) | 14.2 | 790 |
  | ms3000-r24 | search-v2-ms3000-r24 | 97 | 22 (23%) | 28 (29%) | 46 (47%) | 25.8 | 1,398 |
  |  | search-v2 | 97 | 23 (24%) | 28 (29%) | 45 (46%) | 15.3 | 800 |
  | ms6000-r48 | search-v2-ms6000-r48 | 100 | 16 (16%) | 29 (29%) | 54 (54%) | 46.0 | 2,094 |
  |  | search-v2 | 97 | 22 (23%) | 30 (31%) | 44 (45%) | 15.9 | 728 |

  Search-v2 ends about a quarter of its decisions at the deadline, a quarter at 12 rounds and half early, by the
  race. The budget alone moved the deadline's quarter onto the cap (ms6000: 1% deadline, 49% cap) and so bought
  little. Scaled together, the deadline and the cap keep search-v2's shares (r24: 23% and 29%; r48: 16% and 29%), so
  those decisions think ×2 and ×4 as long. The race's half is what keeps the arms under ×2 and ×4 in rollouts: a
  decision the race settles at round 5 settles there at any budget.

**Residuals.**

- **A 6 s seat is not playable live.** Both arms are for measurement only. If compute pays, the live seat gets it
  from the work §5 rows 4 and 5 describe (more rollouts inside 1.5 s), never by raising the budget.
- **The arms think about 1.8× and 3.1× search-v2's rollouts, not 2× and 4×.** The race settles about half of all
  decisions before either limit, and it is search-v2's own (Rejected). The night's write-up should report each
  side's rollouts a decision from the match line's counters, so the verdict is read against the compute actually
  spent.
- **The arms' games take longer.** In the pilots, ms3000-r24's four games took about 1.2× and ms6000-r48's about
  1.9× as long as the same deals in the budget-only pilots, whose one side already thought 1.34–1.41× longer; against
  a true search-v2 mirror that is about 1.45× and 2.2×, near the review's 2.5× estimate for a 6 s side, so its §5
  costs (about 5.5 h for ms6000's 1,200 games and 3.3 h for ms3000's on 7 workers, about 11 h with the re-anchor)
  are an estimate, not an upper bound; the night's per-match caps are sized for about 3.5×. The longest pilot game was 119 s, inside the ladder's 300 s per-game timeout
  (`--game-timeout`); a long game at ×4 could come nearer it, and the match line counts timeouts.
- **Nothing counts a decision's ending on the match line.** The census reads it from recorded games; the
  ladder's counters (`search.rounds`, `search.rollouts`, `search.anytime.retired`) are sums. A counter per ending
  (deadline, cap, race) beside them would let a night say it without a recording.
- **Wall-clock arms are machine-dependent**, as search-v2 is (D388): the deadline's share is the PC's, under the
  night's load. The cap's and the race's shares are not.
