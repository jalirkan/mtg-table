## D535 — where the search's strength is, by decision kind: search-v2 with each of priority, attacks and blocks searched or left to Forge, all eight combinations against Forge Default on the same 600 deals (config only, no new Java), and the rule that names a faster-seat candidate from it

*Branch `pc/search-kinds`, off main `4e823718` (D533's merge, the pin of J209). The lane reserved D534 and D535
(D200): D534 is the random-rollout track's closing decision, written when J209 is read, and stays unused if J209
finds a candidate; this is D535. Six ladder players, one test, this file and PLAN's rows. **Nothing under
`bridge/src` changes**: `what=` is a `SearchConfig` key the ladder already passes (`KINDS.search.params.what`), and
`SearchPolicy` already honours it (`wantsPriority` is false without `p`; `chooseAttack` and `chooseBlock` return
Forge's answer at once without `a` or `b`). The live seat, the atlas's random seat (D508's frozen population), every
earlier arm, the wire and the protocol are unchanged, so this is free under D509. Written while J209 held the
machine alone (`alone: yes`): no Java, no build and no test ran beside it; the registry was resolved with
`node tools/ai-ladder/cli.ts list` (no engine) and the lane's tests, type check and gate ran after J209 finished.*

**Status: registered; unplayed. J210 plays it.**

**2026-11-10**

**Context.**

- **What the search is.** search-v2 (`search-v1-anytime`, the live seat's config, hash `cdd55e02a89c`) asks Forge
  for its answer at three kinds of decision (a priority window `p`, an attack declaration `a`, a block declaration
  `b`), plays rollouts of up to six candidates for at most 1.5 s, and overrides Forge's answer when a candidate
  leads by the margin. Against Forge Default on the confirm set's 600 deals it scored 0.6233 [0.6023, 0.6444],
  +87.5 Elo [72.1, 103.2] (J194 (a), 1,200 games, pin `72302c69`).
- **What has never been measured: which kind of decision that strength comes from.** J194 (a)'s counters give rates
  only: 29,179 searched decisions in 1,199 games, 20,434 priority (4,004 changed, 19.6%), 6,839 attacks (1,073,
  15.7%), 1,906 blocks (304, 15.9%), at 939.7, 908.0 and 911.9 ms each. So priority windows are about 70% of the
  seat's thinking time, attacks about 23% and blocks about 6.5%. A changed answer is not a won game, and the
  random-rollout track said the same thing of its own counters eight times: they "give rates, not which overrides
  win" (D532 point 6, D533 point 8).
- **Why it matters now.** Two things wait on it. (1) The owner asked for a faster seat; halving the budget did not
  hold (J198, 0.75 s: −6.5 Elo [−11.7, −1.3], INCONCLUSIVE AT 4,800 against a −10 Elo bar, D519), and the other way
  to a faster seat is to stop searching a kind of decision that pays little: priority alone is 70% of the time.
  (2) Every lane that tried to make the search stronger since the anytime loop changed all three kinds at once
  (budget, round cap, rollout policy, margin, leaf) and landed between −84 and +9 Elo; knowing where the strength
  is says where the next lane's compute and candidates should go.
- **The switch has never been run as an ablation.** `what=` has been `pab` in every registered search player.

**Decision.**

1. **Eight corners, all against `forge-default`, each one fixed 1,200-game match (D398, 600 mirrored pairs, no
   stopping rule) on the confirm set.** Every arm is search-v2's seat config with `what=` alone changed; the
   corner with no search is `policy-outlet`, which is search-v2's seat with the search off (D528, J204 (b)).

   | corner | player | `what=` | hash | searched |
   |---|---|---|---|---|
   | none | `policy-outlet` | (no search) | `e350d94649a4` | nothing |
   | b | `search-v2-only-b` | `b` | `c214a22644a2` | blocks |
   | a | `search-v2-only-a` | `a` | `9f7945dd5b1b` | attacks |
   | p | `search-v2-only-p` | `p` | `cf536ce63aee` | priority |
   | ab | `search-v2-no-p` | `ab` | `d8508f47552b` | attacks and blocks |
   | pb | `search-v2-no-a` | `pb` | `ba2eafaee6fb` | priority and blocks |
   | pa | `search-v2-no-b` | `pa` | `59505e241363` | priority and attacks |
   | pab | `search-v1-anytime` | `pab` | `cdd55e02a89c` | everything (search-v2 itself) |

   Each arm's seat config is `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=<w>,seed=0,anytime=1`.
2. **The `all` corner is `search-v1-anytime` itself, and every match of the night is played in a ladder folder of
   its own.** A match's batch seeds go by its two players (`Session.spec`, `usedBseeds`): a matchup takes the
   host's match base and then its next block the folder has not played. Two things follow. `search-v1-anytime`
   against `forge-default` has played blocks 114,900,000–114,900,149 in this host's ladder folder already (J194
   (a)) and would take the next 150 there, other deals than the other seven corners'. And a match that the runner
   starts again after a stop (a memory stop, as J206's and J208's were) finds its own first rows in a shared folder
   and takes the blocks after them. So the night plays each match with `--dir var/j210-<corner>`, a folder on the
   same host name that the match's block empties before it starts: the seed base is the host's, the folder holds
   no earlier game, and the match takes the same 150 blocks, on a first run and on a retry. The night's rows stay
   out of `var/ai-ladder/results`, where J194 (a)'s rows of the same deals are read from for REPLICATION. *(The
   first writing of this point gave only the `all` corner a folder of its own, `var/j210-all`; amended the same
   day, before the job was written, when the retry case was read in `cmdMatch`.)* **A second name for
   search-v2's config was written first and is rejected** (below): the ladder cannot play one.
3. **The same deals for every corner.** Every one of the eight matches takes blocks 114,900,000–114,900,149 of the
   host's match base in its own empty folder: the deals of J194 (a), J101 and the random-rollout track. A deal is
   D321's key, (batch seed, deck pair, the game's block of four, the half), which does not carry the run, so one
   deal is the same two games (seats swapped) in every corner's match. An arm's **pair score** on a deal is its
   wins over its decisive games there (draws dropped, as `pairScores` does).
4. **The comparison is paired by deal.** For two corners X and Y, Δ(X, Y) is the mean over the deals where both
   have a pair score of X's minus Y's, with a 95% interval of ± 1.96 standard errors of those differences. Measured
   on this host's earlier matches against Forge on these deals (information, before any game of this night): two
   search seats' pair scores correlate at about 0.45 to 0.55, and Δ's 95% half-width is ± 0.020 to 0.022 in score,
   about ± 15 to 16 Elo at these scores; a search seat against a seat without search correlates at 0.09 to 0.21,
   ± 0.026 to 0.028. So this night resolves differences of about 16 to 20 Elo and no finer, and no reading below
   pretends otherwise.
5. **The readings, written before any game of the night.** `none`, `only-k`, `no-k` and `all` are the corners of
   point 1; k is one of p, a, b.
   - **WHOLE** = Δ(all, none): the search's whole gain on these deals. If its lower end is not above 0, something
     is broken (J204 (b) measured search-v2 84 Elo above `policy-outlet` head to head): nothing else is read and
     the night is diagnosed first.
   - **ALONE(k)** = Δ(only-k, none): what searching kind k adds when nothing else is searched. `ADDS ALONE` when
     its lower end is above 0; `HURTS ALONE` when its upper end is below 0; otherwise `NOT SHOWN ALONE`.
   - **LAST(k)** = Δ(all, no-k): what searching kind k adds when the other two are searched already, which is what
     the live seat would lose by not searching it. `NEEDED` when its lower end is above 0; `HURTS` when its upper
     end is below 0; otherwise `NOT SHOWN NEEDED`.
   - **INTERACTION** (information only) = the mean over deals of all − only-p − only-a − only-b + 2 × none: above
     0, the kinds help each other; below, they overlap.
   - **REPLICATION** (information only) = Δ(all, J194 (a)'s rows): the same config on the same deals at two pins
     and five days apart. It is the paired comparison's own noise floor, and the one place where the code under
     search-v2 between `72302c69` and this night's pin would show.
   An interval that includes 0 is never worded as "no effect".
6. **The faster-seat candidate rule.** The six partial arms (`only-p`, `only-a`, `only-b`, `no-p`, `no-a`, `no-b`)
   are each read against `all`: an arm X is a **faster-seat candidate** when Δ(all, X)'s point is at most +0.014 in
   score (about 10 Elo at these scores: the bar J198 used), WHOLE being above 0. Among several candidates the one
   taken forward is the one with the least search time a game on its own match line (`aSearch.msPerDecision ×
   aSearch.searched / played`). A candidate is not a result: at this night's ± 16 Elo an arm truly 20 Elo worse
   passes about one time in three. It earns a **4,800-game head-to-head against `search-v1-anytime`**, as its own
   job under its own decision, in J198's shape (the −10 Elo bar, D519's four readings). A seat change is never
   made by this decision or that one: it is a seat-queue row and the owner's (D509).
7. **No candidate is the expected reading, and it is information.** The table then says where the search's
   strength is, and the PC session chooses the next lane from it (the owner's method rule of 2026-11-08): the
   direction it points at is a budget by kind (the anytime clock and the candidate count spent where LAST and
   ALONE are largest), which is new Java under its own decision.
8. **Order and time.** Cheapest and most needed first, so a cut night still reads: `none` (about 15 minutes),
   `only-b`, `only-a`, `only-p`, `no-p`, `no-a`, `no-b`, `all`. From J194 (a)'s wall (1.27 h for its 1,200 games
   at 7 workers) and its time shares by kind the night is about 6 h at 7 workers (0.2, 0.3, 0.45, 0.95, 0.5, 1.0,
   1.2, 1.3), `alone: yes`. *(First written as about 9 h, from a wall of 2 h that J194 (a) did not take.)* If `all`
   is cut, LAST and the candidate
   rule are read against J194 (a)'s rows instead and the report says so in every line that uses them.

**Rejected.**

- **Reading the counters instead.** The changed-answer rates are within four points of each other across kinds
  (19.6%, 15.7%, 15.9%); they cannot say which changes win games.
- **Head-to-head against search-v2 instead of against Forge.** A head-to-head is the sharper test for one arm
  (it is what the candidate gets), but seven arms against search-v2 would share no baseline with `none`, and the
  additive reading (ALONE, LAST, INTERACTION) needs every corner on one scale. Forge Default is the anchor.
- **Only the three leave-one-out arms.** Cheaper by four hours, and blind to overlap: if attacks and blocks each
  look unneeded alone, only `only-p` says whether dropping both is safe.
- **A second name for search-v2 (`search-v2-all`, the same params and hash), so that its matchup is new and takes
  the shared blocks in `var/ai-ladder`.** This lane's first commit registered it. The ladder cannot play it: a
  finished game's sides are named by config hash (`Session.side`, `identity`: the first registered player with
  the hash, so `search-v1-anytime`), while a batch's seed is looked up by the players' names (`Session.spec`). The
  alias's finished batches would never count as used under its own name, so the match would deal the same seven
  or so batch seeds over and over, and the match line's `aWins` and score (`side(r, 'a') === A.name`) would count
  no game for it. Found by reading `session.ts` before the job was written; the player was removed, and the test
  now holds every corner's hash to one registered player.
- **Reusing J194 (a) as the `all` corner.** It is the same config on the same deals, but at pin `72302c69`, before
  D523 to D533 touched `SearchPolicy`; each of those says no earlier value's behaviour changed and the decision
  self-test holds it, yet the cleanest pab is one played on the night's own pin, and the replication is worth its
  two hours on its own (point 5).
- **A per-kind budget arm now.** New Java, and it needs this table to know which kind to give the clock to.

**What is unverified.**

- That an unsearched kind costs no thinking time in a real game. The code returns before any copy is made; the
  pilot checks the counters (an unsearched kind has no searched decision), and the night's own lines give each
  arm's ms a decision and a game.
- That the deals are the same in all eight matches. The job checks each match's batch seeds against
  114,900,000–114,900,149 and the verdict counts the deals each comparison shares (at least 590 of 600, or it is
  not read).
- The time estimates of point 8: J194 (a)'s wall scaled by its shares of search time by kind, not measurements of
  these arms.
- Whether the confirm set's 34 deck pairs stand for the decks the seat meets at the table. They are the pairs every
  search number in this repo since D398 was read on.

**Follow-up.** J210 plays the eight matches at this lane's merge. Its `report.md` carries the table of point 5 and
the rule of point 6 as flags; `summary.md` (the PC session) words them. A candidate posts its 4,800-game
head-to-head; no candidate, the next lane is chosen from the table.
