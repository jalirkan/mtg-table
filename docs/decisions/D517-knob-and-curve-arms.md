## D517 — the knob and curve arms: `search-v2-routlets` and `search-v2-ranked` are search-v2 plus one built, never-matched switch each, and `search-v2-ms750-r6` and `search-v2-ms375-r3` are search-v2 with its budget and its round cap scaled down together (×0.5, ×0.25), registered for one night, J195

*Branch `pc/d517-knob-and-curve-arms`, off main `f6a5a732` (D516's merge). D517 was reserved for this lane
(`node tools/decisions.mjs next` gave D517). Extends D412 (search-v2, the ladder's `search-v1-anytime`), D514 (the
compute-curve arms, whose style and scaling it copies), D389 (`rank=prior`), D390 (`rollout=outlets`) and D398 (the
fixed match). Serves the play-AI review of 2026-11-05 (`~/code/pc-results/study/play-ai-review-2026-11-05.md`, §5
row 6, and the cheaper side of row 2's curve, which D514 rejected for its own night and left "cheap to add later
under its own name"). Four ladder players, a test each side and this file; the live seat, the bridge's behaviour,
the wire and the protocol are unchanged, so it is free under D509.*

**2026-11-07**

**Context.**

- **Two search switches were built and never matched under the search we play.** D389's `rank=prior` (generate up
  to `gen` candidates, apply each once on a shared determinization, keep the best `cands` by the leaf after it) and
  D390's `rollout=outlets` (the rollouts play the searching seat with D310's sacrifice-outlet policy in front of
  Forge) were registered on 2026-10-03 as `search-v1-fixed3-ranked` and `search-v1-fixed3-routlets`, under the
  fixed three-round search, for SPRTs against `search-v1-fixed3`. The seat moved to the anytime search (D388, D412)
  before either was judged, and the review's §5 row 6 lists both as "the built, never-matched knobs": one night for
  both, fixed 1,200 games each, "both NOT SHOWN closes the knob track".
- **D514 measures the curve upward** (×2, ×4 against the live 1.5 s), to ask whether more thinking buys strength.
  It rejected a 0.75 s arm for that night because the cheaper side says how much the live budget is buying, not
  whether more would buy more. That is still a question worth one night's matches: how much strength the live 1.5 s
  buys over 0.75 s and 0.375 s, and whether a person could wait less at no measured cost.
- D514's first pilot is why the downward arms scale two knobs: a budget alone leaves the 12-round cap or the
  deadline binding where the other had been, so a budget-only arm measures less than its name says.

**Decision.**

1. **Four ladder players** in `tools/ai-ladder/players.json`, kind `search`, every param byte for byte
   `search-v1-anytime`'s (search-v2: `profile Default`, `outlets on`, `budgetMs 1500`, `anytime on`) except the named
   ones. All of them were already params of the `search` kind (`tools/ai-ladder/kinds.ts`: `budgetMs` and
   `maxRounds` in `SEARCH_KEYS`, `rank`, `gen` and `rollout` among D388–D390's switches), so the kind is unchanged.

   | player | factor | params changed | seat config | config hash |
   |---|---|---|---|---|
   | `search-v1-anytime` (search-v2) | ×1 | — | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1` | `cdd55e02a89c` (unchanged) |
   | `search-v2-routlets` | ×1 | + `rollout "outlets"` | the same plus `,rollout=outlets` | `b704d57245a1` |
   | `search-v2-ranked` | ×1 | + `rank "prior"`, `gen 24` | the same plus `,rank=prior,gen=24` | `bbbaad18882c` |
   | `search-v2-ms750-r6` | ×0.5 | `budgetMs 750`, `maxRounds 6` | the same with `ms=750`, `maxrounds=6` | `ef6def992355` |
   | `search-v2-ms375-r3` | ×0.25 | `budgetMs 375`, `maxRounds 3` | the same with `ms=375`, `maxrounds=3` | `c2f054d190cf` |

   Each note names its change in one sentence ("search-v2 whose rollouts play the searching seat with D310's
   sacrifice-outlet policy …", "search-v2 generating up to 24 candidates and keeping … the best others by D389's
   one-step prior …", "search-v2 at 750 ms and 6 rounds a decision (its 1500 ms and 12 rounds x 0.5, scaled
   together as D514's arms are) …", the same at 375 ms and 3), and each reads "for measurement, never the live seat".
2. **What each measures.**
   - **`search-v2-routlets`**: whether valuing a line as the seat would play it (the outlet policy acting inside the
     rollouts, as it acts in the seat) picks better than valuing it as plain Forge would. Only what the rollouts play
     for the searching seat changes; the opponent stays plain Forge (D390's rejection of `rollout=both` stands).
   - **`search-v2-ranked`**: whether choosing which six candidates to search by a one-step prior beats taking the
     first six in enumeration order. It acts only where more than `cands` candidates exist (D389's smoke: 25 of 324
     decisions; this lane's pilot: 3 of 96), and spends up to 30% of the budget (`PRIOR_SHARE`) there; elsewhere the
     arm is search-v2. `gen 24` is the default `max(24, cands)` written out, as `search-v1-fixed3-ranked` writes it;
     the seat config prints it either way.
   - **`search-v2-ms750-r6` and `search-v2-ms375-r3`**: the curve's lower half. The deadline and the cap are scaled
     together for D514's reason, and everything else stays search-v2's: `minRounds` 2, the race from round 3 at z 2,
     `pruneToBudget`, each rollout's 20,000-step cap and its step clock 2 s past the deadline (D468), Forge's 1 s
     think limit in the copy.
3. **Nothing refuses the smallest arm.** `SearchConfig`'s constructor takes a budget of 50..60,000 ms and demands
   `maxRounds >= minRounds` (`rounds=2`, so a cap of 3 parses); the ladder's `search` kind has the same 50 ms floor
   and `maxRounds` from 1. The anytime loop has no floor of its own: `pruneToBudget` never cuts below two candidates,
   a round the deadline cuts keeps the rollouts it finished, a decision with fewer than `rounds` paired rounds is
   decided on what exists (`search.anytime.short`), and only a decision where no alternative was scored at all falls
   back (`fallback: budget`). So 375 ms and 3 are legal and were used as named.
4. **The live seat stays search-v2 at 1.5 s and 12 rounds, plain-Forge rollouts, candidates in order**
   (`SearchConfig.LIVE_DEFAULTS` is still `anytime=1`). Whatever J195 finds, these four names are measurements; a
   change to the live seat is a separate decision (and under D509, a seat-queue row).
5. **The pre-registered rules for the night that uses them, J195** (copied here word for word, with the downward
   arms' reading as amended before commit, below):

   For `search-v2-routlets` and `search-v2-ranked`, each a fixed D398 match of 1,200 games on the confirm set against
   `search-v1-anytime`: SHOWN if the arm's lower end is above 0.5 and its point is at least +15 Elo; NOT SHOWN if its
   upper end is below +15 Elo; otherwise INCONCLUSIVE, confirm with 4,800 games; both NOT SHOWN closes the knob track
   (the review's §5 row 6). For the two downward arms, the same matches, no verdict: the curve's lower half, read as
   how much strength the live 1.5 s buys over 0.75 s and 0.375 s, and whether the live seat could be faster at no
   measured cost, in two descriptive readings, still no verdict: (1) "indistinguishable from search-v2" when the
   arm's interval contains 0; (2) "at most 10 Elo weaker" when its LOWER end is above −10 Elo — the bar a later,
   separate live-seat decision would cite. Any change to the live seat is a separate decision.

   *Amended before commit (2026-11-07):* the first draft's descriptive line, "not measurably weaker" when the upper
   end is above −10 Elo, was too loose: a 1,200-game search-vs-search interval is about ±9 Elo, so an arm 20 Elo
   weaker would pass it about a third of the time. The two readings above replace it; everything else is as
   registered.

**Rejected.**

- **Re-running the week-3 SPRTs** (`search-v1-fixed3-ranked`, `-routlets` against `search-v1-fixed3`). They would
  judge the switches under a search nobody plays; the fixed-rollout players stay registered as they are.
- **`rollout=both`.** The opponent on the policy assumes what the opponent plays (D390's own rejection), and a human
  opponent is not D310's policy.
- **`prior=eval` under `rank=prior`.** The learned evaluator lost to the hand leaf as the search's leaf (J128, the
  review's §3b), and a prior scored by it is a third change; the leaf prior is D389's default.
- **A larger `gen` or `cands` with ranking.** Each changes what is searched as well as how it is chosen; one switch
  an arm.
- **Budget-only downward arms** (`maxRounds` left at 12). D514's first pilot found the cap and the deadline trade
  places when only one moves; at 750 ms the 12-round cap would almost never bind, so the arm would measure the
  deadline alone, not a scaled search-v2.
- **A curve point below 375 ms.** At 375 ms a decision already plays about one rollout a candidate (Measured); below
  it the search decides mostly on a single round, which the anytime loop allows but which would measure noise
  against Forge's answer rather than a cheaper search.

**Measured.**

- `./tools/ai-ladder.sh list` names all four players, playable, with the seat configs and hashes in the table
  above; `search-v1-anytime` keeps `cdd55e02a89c`, and D514's arms keep `994bf685f6b9` and `6bab8ca5e273`.
- `DecisionSelfTest.knobAndCurveArms` (engine-free, `bridge/build.sh`): search-v2's config text plus
  `rollout=outlets` parses to a config whose public fields equal search-v2's in all but `rollout`; plus
  `rank=prior,gen=24`, in all but `rankPrior` (`generate` is 24 in search-v2 too, unused there, so it does not
  differ); with `ms` and `maxrounds` at 750/6 and 375/3, in all but `budgetMs` and `maxRounds`, with `minRounds` 2
  ≤ the cap; each text is search-v2's with exactly those keys added or changed; the live seat stays 1500 ms, 12
  rounds, `rollout default` and no ranking. `decision selftest: 255 check(s), 0 failure(s)` (D514's 242 plus 13);
  `build OK`.
- `web/test/ai-ladder.test.ts`: each knob arm's raw params are `search-v1-anytime`'s plus the named keys, its
  resolved params are search-v2's but those, its seat config is search-v2's with `,rollout=outlets` or
  `,rank=prior,gen=24` appended; each downward arm's raw params are search-v2's with `budgetMs` and `maxRounds`
  replaced, its cap at least the 2 minimum rounds, its seat config search-v2's with `ms=` and `maxrounds=` changed;
  every hash is the table's, and search-v2's is unchanged. `tsc --noEmit` clean; `npm --prefix web test` green.
- **Four pilots**, each `./tools/ai-ladder.sh match <arm> search-v1-anytime --games 2 --batch-pairs 1 --jobs 1
  --purpose pilot --dir var/pilot-d517/<arm>` in this worktree, one after another on 2026-11-07 (load about 3 on 16
  threads at the start): one batch of four games, the same deal pair and game seeds as D514's pilots
  (`fair-fight-900000001`, seeds 114900344700000/1), every one 4 of 4 games, 2–2 (each mirrored pair split),
  no draws, engine errors or timeouts. From the match line (`msPerDecision`, fallbacks) and the batches' counters
  (`search.rollouts`, `search.rounds` over the decisions searched, `search.<p|a|b>.considered`):

  | pilot | side | decisions | ms a decision | rollouts a decision | rounds a decision | fallbacks |
  |---|---|---|---|---|---|---|
  | routlets vs search-v2 | search-v2-routlets | 98 | **703.1** | 15.65 | 6.40 | unmappable 1 |
  |  | search-v1-anytime | 100 | **658.7** | 15.59 | 6.25 | unmappable 1 |
  | ranked vs search-v2 | search-v2-ranked | 96 | **670.1** | 15.59 | 6.52 | unmappable 1 |
  |  | search-v1-anytime | 97 | **652.5** | 15.76 | 6.33 | unmappable 1 |
  | ms750-r6 vs search-v2 | search-v2-ms750-r6 | 99 | **439.7** | 9.51 | 3.69 | unmappable 1 |
  |  | search-v1-anytime | 98 | **699.1** | 15.91 | 6.50 | unmappable 1 |
  | ms375-r3 vs search-v2 | search-v2-ms375-r3 | 94 | **259.6** | 6.11 | 2.39 | unmappable 1, **budget 1** (1.1%) |
  |  | search-v1-anytime | 95 | **661.6** | 15.80 | 6.46 | unmappable 1 |

  - **The knob arms cost almost nothing and fall back no more than search-v2.** Routlets took 1.07× search-v2's time
    a decision for the same rollouts (1.00×), in line with D390's +0.7% a rollout; nothing counts whether the outlet
    policy acted inside a rollout (Residuals). Ranked took 1.03× and 0.99× the rollouts: the prior ran on **3 of 96**
    decisions (3.1%; D389's smoke 7.7%), scored 17 candidates and cut 4, at about **237 ms a ranking** (711 ms in
    all; D389: 393 ms), and one of the three hit the 30% share (`search.prior.timedOut` 1). Ranking's time comes out
    of the same 1.5 s, so the decisions it touches roll out less, and those it does not are search-v2's.
  - **The downward arms scale less than their factor in time and about as much in rollouts.** ×0.5 bought 0.63× the
    time and **0.60× the rollouts** (9.51 / 15.91); ×0.25 bought 0.39× and **0.39×** (6.11 / 15.80). The 375 ms arm
    is not empty — about six rollouts a decision, one a candidate — but 15 of its 94 decisions (16%) were decided on
    fewer than the 2 minimum rounds (`search.anytime.short`; 750 ms: 5 of 99; search-v2: 0 or 1), one fell back to
    Forge with no alternative scored, and it changed Forge's answer slightly more often (12.8% against 10.5%) on less
    evidence. It measures a much noisier search, which is the point of a curve's low end.
  - Game times: routlets' four 24–46 s (144 s), ranked's 20–43 s (136 s), ms750-r6's 19–38 s (123 s), ms375-r3's
    14–36 s (96 s), against 177–190 s for the same deals in D514's budget-only pilots. Search-v2 itself thought 650–700
    ms a decision here against 720–830 in D514's pilots: a lighter machine, which is the wall-clock arms'
    machine-dependence (D388), and why each pilot reads its arm against the search-v2 in the same batch.

**Residuals.**

- **Nothing counts the outlet policy acting inside a rollout.** `RolloutController.Outlets` is seated when
  `rollout=outlets` (`SearchPolicy.playout`, `lim.outletsUs`), but no counter says how often its `OutletPolicy`
  overrode Forge in a copy, so the pilot cannot say whether the arm differed from search-v2 in these four games. A
  counter (`search.rollout.outletActs`) beside the others would let J195 report it; until then a NOT SHOWN cannot be
  told from "rarely acted" without a recording.
- **Ranking touches few decisions,** about 3–8% (the pilot, D389's smoke). A 1,200-game match's ±15 Elo can resolve
  only an effect concentrated there of several times that size per touched decision; NOT SHOWN for `search-v2-ranked`
  is "no effect this large", not "no effect".
- **The 375 ms arm decides about one decision in six on fewer than two rounds.** A J195 reading of it is a reading of
  a search that often has one sample a candidate; that is a property of the curve's low end, not a fault, but its
  write-up should give the `search.anytime.short` rate beside the score.
- **Wall-clock arms are machine-dependent**, as search-v2 is (D388), and the downward arms probably more so: their
  deadline is shorter against the same cost a rollout, so a larger share of their decisions may end at it (no census
  was run for them, as D514's was for its arms). Read each against the search-v2 in its own match.
