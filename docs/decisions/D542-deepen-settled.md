## D542 — deepen settled comparisons: a `SearchConfig` key, `deepen=<z>` (off by default), with which the anytime search stops re-rolling a comparison whose shallow rounds all answered alike and spends the time left, once no shallow work is left, rolling it and Forge's answer one turn further; the deep difference may veto a shallow winner or promote a near-tie, each only on strong evidence; `deepmix=1` runs the deep legs beside the shallow ones instead; six ladder players (z 2, 1.5, 1, each schedule), a pilot that picks at most one by exposure alone, and one fixed 4,800-game match of it against the live seat on deals no job has played (J216)

**On main this decision is text only: the keys, players, self-tests and scenarios it describes exist only on the branch `pc/d542-deepen` (`821ac7c70`, kept locally, never merged) and in `docs/research/patches/D542-deepen-settled.patch`.** Protocol amendment M83, named below, is on that branch alone too. The text from here to *Verification* is the decision as it was registered and reviewed; *Status*, *Verification* and *Follow-up* say what happened.

*Branch `pc/d542-deepen`, off main `1eaa00d30` (D541's merge). Code: two `SearchConfig` keys, the anytime search's
deepened twin (`SearchPolicy.searchDeepen`, entered only with `deepen` on), pure functions in `Anytime` (the settled
test, the deep verdict, the choice and the schedule), the decision record's deep keys (`Decision`, `Decisions`;
protocol amendment M83, admitted by `tools/check-redaction.mjs`), a `DecisionSelfTest` case, five engine scenarios in
the ai-bench self-test, six ladder players, the ladder's params and test, the ladder guide's line, the architecture
note and PLAN's rows. **Written as text while J215 held the machine alone, and revised the same day after an
independent review of the text: no line of this lane was compiled, tested or run** — no `javac`, no build, no
self-test, no `node`, no ladder command; what the build, the self-tests and the pilot show is the *Verification*
paragraph, filled in after. The six hashes were computed by a Python re-implementation of the ladder's `configHash`
(`tools/ai-ladder/registry.ts`, `canonical` and `resolveParams` of `kinds.ts`), checked on seven registered hashes
(`cdd55e02a89c`, `59505e241363`, `63c35e9f7d5b`, `795daea97aaa`, `25ee7e76b741`, `e0b09eb7b014`, `af6771947a25`, all
equal; `ladder_hash.py` and `ladder_hash.out.txt` in the PC session's scratchpad); the registry test holds them.*

**Status: built and piloted off main (*Verification*); NOT PLAYED under point 11 — the pilot's choice picked no player (changed verdicts 1, 0, 1, 0, 1, 1 in 24 games each against a bar of 12) — so the match was not played and this track is closed; the lane is not merged; branch `pc/d542-deepen` at `821ac7c70` is kept locally and its code is saved as `docs/research/patches/D542-deepen-settled.patch`. J216 as drafted for it was never posted; the job id J216 is reused by D543 (J215's pair on the dev deck set, under the same host name, `j216`, and the same blocks, which this draft never played; D543 point 2), and every "J216" below means this decision's unposted draft.** Closed 2026-11-12 by the closing text in this file, written in D543's lane.

**2026-11-12**

**Context.**

- **Within a turn the search's values are nearly deterministic.** J212 recorded 720 games of search-v2 (horizon 0,
  `var/ai-bench/j212-rec/games` in the lab checkout). Of the alternatives compared with Forge's answer, 63.1% of
  21,666 priority alternatives and 65.6% of 11,586 attack alternatives are settled in the recording's terms: the
  option's own `n` at least 3 and its `seDiff`, rounded to 0.1 in the record, equal to 0 (`deepen_exposure.py` and
  `deepen_exposure.out.txt` in the PC session's scratchpad). The code's test is stricter in one way and looser in
  another — the first 3 paired differences exactly equal (point 2), read as soon as they exist — and how often the two
  definitions disagree is unmeasured. D540's *Context* gives the same recording's σ_d = 0 shares, 70% and 81% of
  alternatives with two or more rounds. More rounds at this horizon re-measure the same number, and four times the
  rollouts bought +1.7 Elo [−6.7, +10.2] (J194).
- **A settled tie is never raced out.** The race (`Anytime.race`) retires an alternative whose paired difference to
  the leader is below 0 by `RACE_Z` standard errors; with an se of 0 a strict loser goes at round 3, but an exact tie
  with the leader (`mean + 2·0 < 0` is false) is rolled again to `maxrounds` (12) or the deadline, and so are the
  leader and Forge's answer when the leader is a settled winner. That budget re-measures a known number.
- **How many decisions it touches.** From `deepen_exposure.out.txt`: 73.6% of priority decisions and 78.5% of attack
  decisions have a settled alternative; 41.8% and 44.5% have one inside the margin (|diff| ≤ 20), 6.93 priority and
  2.46 attack decisions a game; the mean searched decision took 806 ms (priority) and 795 ms (attacks) of its 1,500.
  From `deepen_eligible.py` and `deepen_eligible.out.txt` (the same recording, fallback decisions left out: 11,848
  priority and 3,973 attack decisions): of 13,665 settled priority alternatives 2,077 have a shallow difference above
  0 and 1,441 above the margin, of 7,598 attack ones 747 and 402; where the override picks a **settled** alternative
  (a veto could change the verdict), 1.31 priority and 0.39 attack decisions a game, 1.70 together; where Forge's
  answer was kept and a settled alternative lies inside the margin (a promotion could change it), 5.93 and 2.28 a
  game, 8.21 together. The rerolls past round 3 plus the unused budget come to a median of about 7.7 (priority) and
  6.6 (attack) deeper rounds per close candidate at 1.85 times a shallow rollout's cost (J212: 92.1 against 49.7 ms
  of play a rollout at `turns=1`), and 70.8% and 68.3% of those decisions have room for at least 3 — **an upper
  estimate**: it shared the freed time among the near-ties alone, and the active settled winners share it too.
- **Depth read positive where it did not starve the shallow evidence, never at a width that could show it** (J212,
  1,200 games each against search-v2): `search-v2-t1` at the same clock −1.7 [−14.6, +11.2], with 11.5 rollouts a
  decision against 15.8 and 11.8% of decisions on fewer than two rounds against 2.8%; `search-v2-a1` +5.2 [−5.7,
  +16.2] at ×1.13 time; `search-v2-t1-x3`, three times the clock, +9.8 [−1.7, +21.4] at ×2.72. A deeper rollout
  replaces the leaf's blind spot at the turn's end — the reply to a play or an attack is never played (D537's
  *Context*: a held card is worth 40 points, an attack is valued with no crack-back) — and costs rounds.
- **What horizon 1 looks like, from the only records that hold it.** No 1,200-game arm of J212 recorded per-candidate
  values; the three pilot recordings did (`var/ai-bench/j212-pilot-rec-{t1,x3,a1}`: 149 decisions, 120 priority, 20
  attack, 9 block, about four games an arm). Over their alternatives with two or more rounds the per-pair standard
  deviation of the paired difference (`seDiff·√n`) is exactly 0 in 35.1% (priority, 188) and 58.8% (attack, 51),
  against 70.3% and 80.7% at horizon 0; the non-zero ones have a median of 71 and 30 leaf points (horizon 0: 54 and
  52). So deep pairs are noisier, and still often settled. Under a simple model (each recorded horizon-1 mean taken
  as the truth, its recorded SD as the noise, an m-round mean normal), a true deep difference above +20 is promoted
  with 3 to 8 deep pairs 57–70% of the time at z 2 and 75–84% at z 1, and a true deep difference below 0 vetoed
  69–77% and 81–88% (all kinds pooled, 20 and 178 alternatives: thin). Horizon-0 and horizon-1 values were never
  recorded for the same decision, so how often a settled shallow winner is a deep loser is unknown; the pilot
  measures it.
- **The independent review of this text** worked out that with the deep legs run in every round beside the shallow
  ones, the unsettled alternatives get 53–60% of today's round rate until the deep pairs settle, and that no counter
  would show it. That is why the default schedule is shallow first (point 3) and the interleaved one a second key
  with its own counter.
- **J215 is running as this is written** (D541's pair, 4,800 games against the same live seat on blocks
  519,900,000–519,900,599); nothing here reads or depends on its result, and J216's blocks are on another base.
- **The search's gains are its shallow overrides** (J210: priority alone +63.2 Elo over Forge Default, attacks +28.4),
  and a value re-judged everywhere on a noisier deep mean would trade known gains for noise. So depth here changes a
  verdict only where the shallow rounds have nothing more to say and the deep evidence is strong.

**Decision.**

1. **Two `SearchConfig` keys, both off by default** in `parse`, so in `parseLive` and `LIVE_DEFAULTS`:
   `deepen=<z>` (a double; 0 or a z above 0 up to 5) and `deepmix=1` (refused without `deepen` above 0). Both are
   set by `withDeepen` after every other switch, carried by every other copy, and printed by `toString` only when
   on, after D540's keys (`,deepen=2`, `,deepen=1.5,deepmix=1`), so no registered config text, config hash or ladder
   hash moves. `deepen` is refused without `anytime=1` (it lives in the anytime loop) and with `override=lcb` (its
   verdict is built on the margin rule). `SearchConfig.deepens(kind)` is true for p, a and b alone. A live seat may
   name either: neither reads anything the seat may not see.
2. **Settled.** Inside the anytime loop, after each round, an active alternative whose paired differences with
   Forge's answer `row[i] − row[0]` number at least `Anytime.RACE_FROM` (3) and are all exactly the same is settled
   (`Anytime.settled`). Read after every round, this is exact equality of its first 3 paired differences: one whose
   first 3 differ never settles. A settled alternative gets no more rollouts at the decision's horizon. The test runs
   before the round's race, so an alternative the race retires in the round it settles is still judged by point 3.
3. **The deepened set, which comparisons get deep legs, and when.**
   - A settled alternative whose shallow paired difference is at least `−margin` (a tie, a near-tie, or a winner the
     seat would play today) is **deepened**; one below `−margin` is done and stays as today.
   - **Deep legs only where the verdict can still move** (`Anytime.deepLegs`). Under point 4 only the shallow best's
     veto matters, and a promotion acts only when the shallow rule keeps Forge's answer. So, with `b` the shallow best
     over the active alternatives as `Anytime.best` gives it: (a) if `b` is a winner above the margin and is not
     deepened (unsettled), no deep legs at all in that state — it cannot be vetoed and nothing can be promoted over it;
     (b) if `b` is a deepened winner, `b` first, then the deepened near-ties best-first (active or retired: their
     promotion matters if `b` is vetoed, which is unknown until the end); (c) with no winner above the margin, the
     deepened near-ties best-first; (d) an active settled winner that is not `b`, and any retired winner, gets no leg.
     The rule is recomputed from the current rounds every time it is asked, so under `deepmix=1`, where the shallow
     best can change between rounds, the legs follow it. A deep leg rolls the comparison's alternative at
     `horizon + 1` with the round's own seed (common random numbers), after Forge's deep leg of that round, which is
     played once and shared.
   - **The schedule, `deepen=<z>` alone: shallow first.** A round runs deep legs only when it starts with no shallow
     work left — no active, unsettled alternative while fewer than `maxrounds` rounds are complete
     (`Anytime.shallowLeft`, `Anytime.deepThisRound`). Until then the loop is today's anytime loop over the unsettled
     alternatives (pruned to the budget among themselves, raced as today, the pruning's time estimate from shallow
     legs alone), and a settled comparison only stops costing rollouts, so **no shallow round costs more than
     today's, and the shallow search gets the frozen comparisons' time first; depth gets what remains.** Forge's
     answer is rolled at the horizon only while an unsettled, unraced alternative is left.
   - **`deepmix=1`: interleaved.** The deep legs also run in rounds with shallow work left, after that round's
     shallow legs. Its known cost: until the deep pairs settle, the unsettled alternatives get fewer shallow rounds
     (53–60% of today's rate, the review's arithmetic), and the deadline can cut shallow work after a deep leg ran;
     `search.<k>.deepen.shallowCut` counts the decisions where it did (point 7).
   - A deepened comparison stops wanting deep legs when its deep pairs are settled too (at least `Anytime.DEEP_MIN`,
     3, all alike), at `maxrounds` deep pairs (12, the config's own cap), or on its second deep error. The loop ends
     when no shallow work is left and the rule gives no deep leg, or at the deadline.
4. **The verdict, conservative both ways** (`Anytime.deepVerdict`, z = the key's value, over the deep paired
   difference's mean and standard error):
   - a deepened **shallow winner** (diff > margin) is **vetoed** — cannot be played — when `mean + z·se < 0` over at
     least 3 deep pairs;
   - a deepened **near-tie** (−margin ≤ diff ≤ margin) is **promoted** — may overrule Forge — when
     `mean − z·se > margin` over at least 3 deep pairs;
   - otherwise it is **held**: fewer than 3 deep pairs, an se that is not a number, or a bound that does not clear,
     and the shallow verdict stands for it;
   - **a deep se of exactly 0 over 3 or more pairs is a legitimate reading** (every deep pair answered alike, as most
     shallow ones do: 35–59% of horizon-1 comparisons in J212's pilots): the bound is the plain mean, strictly below
     0 for a veto and strictly above the margin for a promotion.
   **The choice** (`Anytime.deepChoice`): the shallow rule first, exactly as `Anytime.best` and the margin rule give
   it; its pick overrules Forge's answer when its shallow difference is above the margin **and it was not vetoed**.
   **After a veto the play goes to Forge's answer or a promotion, never to the vetoed pick's runner-up**: the
   runner-up has no deep evidence of its own (a settled runner-up trails the pick with an se of 0 and is retired the
   round it settles; an unsettled one was never deepened) and usually shares the pick's flaw, and Forge's answer is the
   baseline the whole search is measured against. **Only where the shallow rule keeps Forge's answer, or after a veto,
   may a promotion act**: the promoted alternative with the highest deep mean (the lower index on a tie), whether or
   not the race retired it at its own horizon. So a vetoed alternative is never played, and a promotion never displaces
   a shallow winner depth did not contradict. Comparing deep means with shallow ones is not done: they are measured at
   different horizons and are not on one scale.
   **What `changed` counts.** The shallow rule applied to A's own shallow evidence at the end of the decision is kept
   (`Report.shallowChosen`), and the verdict *changed* when the index played differs from it. It does not count the
   verdicts that differ from the live seat's because a comparison was frozen after 3 identical paired rounds or
   because the shallow rounds were scheduled differently: "the shallow rule's verdict when no deep verdict fires"
   holds on equal shallow evidence only.
5. **Kinds, and what one turn further means.** Every kind `what=` searches: priority (p) and attacks (a) on the live
   seat, blocks (b) for a config that searches them; the opening hand (m, k) and the target search (t) are left alone
   (their horizons are not `cfg.horizonFor(kind)`, and their rules are lcb or their own), so `deepens` is false for
   them and the anytime loop runs unchanged there. The rollout loop plays `while turn ≤ startTurn + horizonTurns`,
   and Forge's `PhaseHandler.advanceToNextPhase` increments the turn when cleanup ends and then, in the same engine
   step, runs the new turn's untap step (`onPhaseBegin`, `UNTAP`, at the `forge-2.0.14` tag): so a rollout at horizon
   h ends right after the untap step of game turn `startTurn + h + 1`. At the live seat's horizon 0, a main-phase play
   or an attack is scored after the opponent's untap step; one turn further (horizon 1) the rollout plays the
   opponent's whole turn — its draw, its plays, its attack, the seat's blocks: the crack-back — and ends after the
   seat's own next untap step, before its draw. A decision in the opponent's turn (a block, or D540's instant-speed
   windows there) is scored at horizon 0 after the seat's own untap step, and one turn further plays the seat's own
   next turn and ends after the opponent's next untap step: it sees what the seat does with what the decision left
   it, not the opponent's reply.
6. **Budget and deadline.** A deep rollout has the decision's own deadline (`budgetFor(kind)`, 1.5 s) through the
   same `rolloutLimits` as a shallow one, with `horizon + 1`; the decision's budget does not grow, so the search's
   time a decision can only fill more of the 1.5 s it has (today 806 ms on average for priority, 795 ms for attacks).
   A rollout the deadline passes — between steps, or inside one past the step clock's grace (D468) — returns null and
   ends the loop; a cut deep leg is counted in `.deepen.cut` alone and carries no leaf, so it never feeds a verdict.
   A deep pair with one leg finished is no pair: `Anytime.pairedDiff` reads only rounds with both. A deep error — a
   copy failure or an unmappable candidate included — is counted (`.deepen.errors`) and never moves the shallow
   search (no fallback, no lost shallow round); Forge's deep leg failing twice ends the deepening for that decision.
   Under the default schedule no deep leg runs while shallow work is left, so a deadline that cuts shallow work cuts a
   loop that spent all its time on shallow rounds, as today's does; under `deepmix=1` it can cut shallow work after
   deep legs ran (`shallowCut`).
7. **Counters, like for like, and the record.** Every shallow statistic keeps today's meaning: the record's
   `timedOut` is set only when the deadline cut shallow work; `search.rollouts`, `search.playUs`, `search.copyUs`,
   `search.stepTimeouts` and the record's `playouts` count shallow rollouts only (a deep rollout's counters from the
   shared `playout` go under `search.<k>.deepen.` instead: its `playUs`, `copyUs`, `stepTimeouts`, `rolloutStepCap`
   and the rest); `search.rounds` stays the shallow rounds. Deep counters by kind, `search.<k>.deepen.`: `settled`
   (alternatives settled), `pairs` (comparisons the rule of point 3 wanted deepened: given a deep leg, or wanting one
   when the loop ended), `decisions` (searched decisions with at least one),
   `rollouts`, `playUs`, `copyUs` and `rounds` (deep rollouts finished, their play and copy time, deep rounds whose
   Forge leg finished), `cut`, `errors`, `short` (deepened comparisons left with fewer than 3 deep pairs), `starved`
   (decisions in which at least one comparison wanted deep legs and every such comparison ended with fewer than 3
   deep pairs: the exposure the clock took, both schedules; a comparison whose deep legs ended on errors, and every
   comparison of a decision whose deepening two Forge deep-leg errors turned off, is left out, since it is already in
   `errors`), `shallowCut` (decisions the deadline ended with shallow
   work left after a deep leg had run: above 0 only under `deepmix=1`), `vetoes`, `promotions` and `changed` (point
   4). Only the comparisons the rule wanted get a deep verdict, `short` and `starved`. The decision's wall time (`search.<k>.ms`, `.us`, from which the ladder's ms a decision comes) is the whole
   decision, deep legs included, as it is for B. The decision record (D347; protocol amendment **M83**) gains, with
   the key on only, `deepen`, `deepRounds`, `deepPlayouts` and `shallowChosen` on the search block and `deep` (`held`,
   `veto`, `promote`), `deepN`, `deepDiff` and `deepSeDiff` on each deepened option; `tools/check-redaction.mjs`
   admits them with their types and words and refuses them without `deepen`.
8. **Self-tests, written with the code.** `DecisionSelfTest.deepenSettled` (72 checks as written): the keys (off in
   `parse`, the live parse and `LIVE_DEFAULTS`; each ladder seat config differs from search-v3 in `deepen`, or
   `deepen` and `deepmix`, alone by reflection, prints search-v3's text plus the keys, round-trips; the refusals);
   `Anytime.settled` on built rounds; `deepVerdict` on numbers (a veto, a promotion, neither, fewer than 3 deep pairs,
   an se of 0, an se that is not a number, the margin's edges, the three z values); `deepChoice` on active sets the
   loop produces (the shallow rule's verdict with no verdict; after a veto Forge's answer even with an unsettled
   runner-up active, or a promotion; a promotion never displacing an uncontradicted winner; the tie-break; a retired
   promotion); the record's M83 keys only with the key on; and the schedule, engine-free (`shallowLeft`;
   `deepThisRound` waiting while shallow work is left with `deepmix` off and not with it on; `deepLegs` in each of
   point 3's cases (a) to (d) and with a comparison done; `starved`). `AiBench.deepenScenarios` (engine), on the crack-back
   board — the seat at 3 life with two Grizzly Bears, the opponent at 12 with two tapped Hill Giants, no hand and a
   library of Forests, so rollouts are dealt alike: (1) **the board first**: Forge's own attack is no attack; (2) the
   all-out attack played to this turn's end leaves the seat alive, one turn further it loses, and no attack one turn
   further does not; (3) without the key the anytime search plays the all-out attack (the leaf likes it by about 50
   points) and counts nothing of D542's; (4) with `deepen=2` the all-out attack is the shallow rule's pick, deepened
   over at least 3 deep pairs and vetoed, the seat attacks with nothing (one Bear is as lethal as two), the counters
   say so, no `shallowCut` or `starved` is counted, and the deep rollouts and their play time are counted apart from
   the shallow ones; (5) the same veto and no attack with `deepen=2,deepmix=1`. A board that does not fire is a
   failure. The schedule inside the engine loop is tested only through (4) and (5), which cannot tell the two
   schedules apart on a board whose comparisons all settle at round 3; the pure functions carry the rule.
9. **Six ladder players**, search-v3's params (`search-v2-no-b`) plus `deepen` (an enum `0 | 1 | 1.5 | 2`) and, for
   three, `deepmix` (`off | on`), both `omitAtDefault`, so no registered hash moves:

   | player | `deepen` | `deepmix` | seat config after `...,anytime=1` | hash |
   |---|---|---|---|---|
   | `search-v3-deepen-z2` | 2 | off | `,deepen=2` | `378105159aa3` |
   | `search-v3-deepen-z15` | 1.5 | off | `,deepen=1.5` | `b3f8993b3896` |
   | `search-v3-deepen-z1` | 1 | off | `,deepen=1` | `da01c6ec0a1d` |
   | `search-v3-deepmix-z2` | 2 | on | `,deepen=2,deepmix=1` | `8941ca286ea4` |
   | `search-v3-deepmix-z15` | 1.5 | on | `,deepen=1.5,deepmix=1` | `6a360470f103` |
   | `search-v3-deepmix-z1` | 1 | on | `,deepen=1,deepmix=1` | `62eb7ef18d18` |

   The seat config before it is search-v3's,
   `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1`. At
   most one of them is played in a match (point 11).
10. **J216: one fixed 4,800-game match** (D398: 2,400 mirrored pairs, 600 batches of 8, no stopping rule) on the
    confirm set (`tools/ai-bench/pairs-confirm.txt`), A = the player point 11 chooses against B = `search-v2-no-b`
    (`59505e241363`, search-v3, the live seat), under `--host j216` in a ladder folder of its own emptied by its
    step, at `--game-timeout 900`. `hostBase('j216')` is 622,000,000 (FNV-1a as `schedule.ts` computes it,
    re-implemented in Python and checked on `j214` → 416,000,000, `j215` → 519,000,000 and `j215-pilot` →
    912,000,000), so the match is dealt **blocks 622,900,000–622,900,599**, on a first run and on a retry. No row of
    the 350,701 ladder rows under the lab's four checkouts' `var/` (read 2026-11-12, 13:00; the three lane checkouts'
    `var/` are links to the first, so 296 distinct `results/*.jsonl` files) is on base 622, nor on 594 (the pilot
    host's, below); and no job file under `pc-jobs/jobs/` or `drafts/`, and no result under `pc-results/results/`,
    names `j216` or a block on either base (the same check D541 made for 519).
11. **Which player, from exposure alone, before any match game.** The pilot plays each of the six players in a
    24-game ladder match against `search-v2-no-b` (`--host j216-pilot`, base 594,000,000; each in a folder of its
    own, emptied, so all six play the same 24 deals, blocks 594,900,000–594,900,005, `--batch-pairs 1`) and counts,
    from A's batch counters, its **changed verdicts**: `search.p.deepen.changed + search.a.deepen.changed +
    search.b.deepen.changed`, summed over its 24 games. **The player played is the first that qualifies in this fixed
    order — `search-v3-deepen-z2`, `-z15`, `-z1`, `search-v3-deepmix-z2`, `-z15`, `-z1` — where it qualifies with at
    least 0.5 changed verdicts a game over its 24 games (12 or more); if none qualifies, NOT PLAYED**, and a deeper
    verdict is a new decision. No win, loss, score or game length of the pilot enters the choice; its games are never
    part of the match. Why the order: the cleaner schedule before the costlier one (shallow first never takes a
    shallow round from the unsettled alternatives; `deepmix` does), and the stricter evidence before the looser (the
    largest z that still changes verdicts often enough to be measured is the most conservative arm the match can
    read). How sharp the bar is, by the Poisson chance of 12 or more changed verdicts in 24 games: at a true 0.3 a game
    6.3%, at 0.5 53.8%, at 0.8 96.8% (at the first draft's 8 games a true 0.5 passed 56.7% and a true 0.3 22.1%).
12. **A defect in any pilot stops the job.** For every one of the six players, not only the chosen one: a pilot match
    that is missing, crashed, did not play its 24 games, or carries an engine error or a timeout; an exposure that
    was not read on its games; a side that did not search priority and attacks or searched a block; a deepen player
    with no deep rollout in 24 games; names, hashes or seat configs that are not the registered ones; B's batch
    counters with a `.deepen.` or a D540 counter (`search.p.declined.`, `search.p.instant.`, `search.p.lands.`) above
    0, or A's with a D540 counter above 0 (a keys-off path fired); and the recorded run (4 games of `deepen=1` against
    Forge Default, the confirm set's first pair) not playing its 4 games cleanly or writing a record without the deep
    keys as point 7 writes them. One engine error or timeout anywhere in the pilot's 148 games (6 × 24 ladder games and
    4 recorded) therefore stops the night: at J211's measured rate, 1 in 4,800 games, that is about a 3% chance per
    posting (1 − (1 − 1/4,800)^148). Each is a defect in one code version, so the match is NOT PLAYED and the defect is
    fixed before any repost; none is a property of one player to be chosen around. Deep rollout errors, cuts,
    `starved`, `shallowCut` and the cost are reported and decide nothing.
13. **The match is complete** when its line names A (the chosen player) and B in that order at their hashes, says
    `complete: true`, played all 4,800 games with engine errors plus timeouts at most 240 (one in 20, D519 point 2),
    and carries `score`, `lo`, `elo`, `eloLo` and `eloHi`; it was played on exactly the 600 blocks
    622,900,000–622,900,599 with no other match's game in its folder; every batch line carried the two seat configs
    exactly (point 9's for A and search-v3's); both sides searched priority and attack decisions and neither searched
    a block; B's batch counters show no `.deepen.` counter and no D540 counter above 0, and A's no D540 counter above
    0. An incomplete match gets no reading and is reposted alone under a new job id after its cause is found.
14. **NOT READ.** A match complete in every other part in which A's verdict changed in fewer than 0.25 decisions a
    game — `search.{p,a,b}.deepen.changed` summed over the match's batch lines, under 1,200 at 4,800 games (in
    integers, `changed × 4 < played`) — gives no reading; the report gives the rate, and the player is not played
    again without a new decision.
15. **The readings, written before any game: D519's four at 4,800 games, as D541 point 5 wrote them, exactly one for
    a complete match, in this precedence, compared as the line carries them (`lo` in integer ten-thousandths, Elo in
    integer tenths):**
    - **SHOWN**: `lo` above 0.5 and `elo` at least +15;
    - **SMALL GAIN**: `lo` above 0.5 and `elo` below +15;
    - **INCONCLUSIVE AT 4,800**: `lo` at most 0.5 and `eloHi` at least +15;
    - **NOT SHOWN**: `lo` at most 0.5 and `eloHi` below +15.
    Beside the reading, deciding nothing: indistinguishable (the Elo interval holds 0), a measured loss (wholly below
    0), a measured gain (wholly above). At the expected width (a score standard error of 0.0036–0.0039, J197 and
    J211) INCONCLUSIVE AT 4,800 cannot happen; it stays in the rule for a match wider than planned.
16. **What a reading earns.** SHOWN or SMALL GAIN names the played player a **live-seat candidate for the owner**,
    decided under a separate decision and a seat-queue row (D509), with the match's point, interval and cost beside
    it. INCONCLUSIVE AT 4,800 is information and is not confirmed again. **NOT SHOWN says that the conservative
    deepening at that z and schedule is worth under about +10.6 Elo against the live seat** (the highest upper end a
    lower end at 0.5 allows at J211's width), not that it is worth nothing. It closes this rule at that z and
    schedule — settled comparisons only, one turn further, the asymmetric verdict — and not: depth everywhere (D537's
    `turns=1` at a longer clock), the other players (never played; a later one is a new decision, not a retry), a
    symmetric verdict that re-judges on the deep mean, deepening the comparisons below −margin or Forge's own answer's
    alternatives, or a leaf that values the crack-back (`untapped`, D351). No reading changes the live seat:
    `SearchConfig.LIVE_DEFAULTS` stays `what=pa,anytime=1`.
17. **Never pooled.** The pilot's 144 ladder games and J212's horizon arms are other players or other deals; they are
    reported beside the match, never added in, and the match is never read against them.
18. **Beside the reading, as description only:** each side's searched decisions by kind and ms a searched decision
    (the whole decision's wall time, deep legs included for A); search seconds a game and their ratio (**the cost,
    expected ×1.3–1.6 for A**: a deepened decision fills more of its 1.5 s; this, with the deep time in it, is the
    cost comparison); shallow rollouts a decision, shallow ms of play a rollout and the `timedOut` share on each side —
    **description, never a like-for-like comparison**: A's shallow rollouts and `timedOut` share are lower than B's by
    design (settled comparisons stop rolling, B re-rolls settled ties to the deadline or 12 rounds, and a cut deep leg
    does not set `timedOut`); A's deep rollouts and deep ms of play a decision, labelled as
    A's alone; A's deep exposure a game — settled, deepened pairs, deepened decisions, deep rounds, vetoes, promotions,
    changed verdicts, cuts, errors, short pairs, `starved` and `shallowCut`; priority overrides by direction a
    priority decision; the land windows left to Forge a game; the pilot's six counts and the choice.
19. **Time.** D537 point 11's fit (a 1,200-game match at 7 workers, alone: 0.47 h + 0.0436 h × both sides' search
    seconds a game), read at four times the games as D541 point 11 did. B searches about 19 s a game (J214, J215's
    B). A, at ×1.3–1.6, 25–30 s. Both sides 44–49 s a game: about 9.6–10.4 h for the match, 10.0 h at the middle.
    The pilot: six 24-game ladder matches at 6 workers, one wave of four-game batches each (J215's 4-game ladder pilot
    took 154 s at one worker, about 38 s a game; A here is slower), with the build, the self-tests and a 4-game recorded
    run: about 21 minutes. About 10.4 h in all (range 9.4–11.4 h); about 12 h if memory pressure holds the night at 6
    workers. The match stops itself at `--hours 14`
    and the step's timeout is 15 h; a match that reaches its own stop is `complete: false` and gets no reading.

**Under D509: the atlas's seat and the live seat are unchanged.** This lane changes six files under `bridge/src`:
`ai/SearchConfig.java` (two fields, a copy constructor and `withDeepen`, `deepens`, two parse cases, two `toString`
lines, the fields carried by the two other copies), `ai/SearchPolicy.java` (one branch in `search`, the method
`searchDeepen`, and `Report`'s deep fields and summary line), `ai/Anytime.java` (four constants, `deepWord`,
`settled`, `deepVerdict`, `deepChoice`, `shallowLeft`, `deepLegs`, `deepThisRound`, `starved`),
`ai/Decision.java` and `ai/Decisions.java` (the record's deep keys, written only above 0) and
`ai/DecisionSelfTest.java` (a check method). The argument that the seat's plays, listings and records are unchanged
with the keys off:

- **Every atlas seat and every registered config parses with the keys off.** The observing seat is
  `SearchConfig.parse("observe=1,cands=" + …)` (`tools/cubelab/CubeLab.java`, untouched), plain seats go through
  `SeatSpec.parse` → `SearchConfig.parse`, the bench through `parse`; none names `deepen` or `deepmix`, and
  `withDeepen(0, false)` returns the config it was called on.
- **With the keys off no engine call, no random draw and no counter is added.** `search` reads `cfg.deepen` and, at
  0, calls `searchAnytime`, which is not edited; `searchDeepen` is unreachable. `Decisions.stats` copies four zero
  fields and writes no deep key (`Decision.toJson` writes them only above 0). The one new work on the keys-off path
  is the field reads and the `Report`'s new field initialisers (four empty arrays and one empty list per search);
  nothing the engine sees. No existing counter, config text or hash moves.
- **The evidence the coordinator runs:** gate step 12m (`cubelab.sh seat-identity`, the four golden games' decision
  records identical; `fixtures/cubelab/seat-identity.json` is not edited), the atlas self-test with no `--write`, the
  decision self-test, the ai-bench self-test's `d542-crackback-off` scenario (no `.deepen.` counter with the key
  off), and the full gate. The next atlas night's derivation diffs `bridge/src` in its `seat_code` check and must
  admit exactly these six files (`ai/SearchConfig.java`, `ai/SearchPolicy.java`, `ai/Anytime.java`,
  `ai/Decision.java`, `ai/Decisions.java`, `ai/DecisionSelfTest.java`) beside D539's and D540's, and nothing else
  under the frozen paths; this paragraph is the admission. `tools/ai-bench/AiBench.java` gains self-test scenarios
  only.

**Hidden information (hard rule 8) and threads (hard rule 3).** Nothing new is read: a deep rollout is a rollout,
redealing what the seat cannot see exactly as today (`Determinizer`, seeded by the round's seed), one turn longer.
The record's new keys are numbers, three words and an index (M83): no card name, no engine string. Nothing touches
the wire, `Snap` or a `CardView`. Every new call runs inside the search on the game thread; no thread and no
`invokeInGameThread` is added, so `HOP_ALLOW` stays three.

**The hypothesis, registered as information before any game (no check reads it).** The base rate says one change
to the search reads between about −2 and +10 Elo (D541's *Context*); the three positive 1,200-game points confirmed
at 4,800 came back near +2 to +3 (`targets`, the evaluator leaf, `routlets`). Depth itself read +5.2 and +9.8 at
1,200 where it was paid for, and this rule spends it only on comparisons that are settled at the horizon, and acts on
it only where it is strong; so its effect, if any, is likely the smaller part of `t1-x3`'s point: about +3 to +8.
With J211's score standard error at 4,800 games (0.0039), the chance of each reading by the true effect is D541's
table: a true 0 reads SMALL GAIN 2.5% and NOT SHOWN 97.5%; +3 SMALL GAIN 19.7%; +5 45.4%; +8 SHOWN or SMALL GAIN
83.9%; +10 95.8%; +12 99.4%. Expected exposure (a model, not a measurement): 1.70 decisions a game where a veto can
change the verdict and 8.21 where a promotion can (`deepen_eligible.out.txt`), at a few percent of promotions and
an unknown share of vetoes, so 0.3–1 changed verdicts a game, more at a smaller z, fewer under shallow first where
the clock runs out before the deep pairs reach 3 (`starved`); the pilot's 0.5 a game is chosen to sit inside that
range.

**Rejected.**

- **Judging every settled comparison on its deep mean** (the survey's Lane A as first written: a settled pair judged
  on its deeper difference wherever it has `rounds` deep rounds). It would re-judge the shallow overrides that carry
  the search's measured gain on a mean whose per-pair spread is larger (*Context*), with 3 to 8 pairs; a noisy veto
  of a good override costs what J210's priority search earns.
- **Interleaving as the only schedule** (the first draft). It takes 40–47% of the unsettled alternatives' rounds until
  the deep pairs settle and no counter showed it; it stays as `deepmix=1`, second in the pilot's order, with
  `shallowCut` counting what it costs.
- **Deepening every comparison** (`turns=1`): `search-v2-t1` −1.7 at the same clock, because it starved the shallow
  evidence (11.8% of decisions under two rounds). Settled comparisons are the ones whose shallow evidence is
  complete.
- **Deepening the comparisons below −margin, or letting depth overrule Forge's own answer when every alternative is a
  shallow loser.** The all-out attack Forge itself makes is not caught (the alternatives to it are shallow losers);
  that is a symmetric rule, a later arm.
- **Playing a vetoed pick's runner-up.** It has no deep evidence of its own and usually shares the pick's flaw
  (point 4).
- **Deep legs for a settled winner that is not the shallow best, or while the shallow best is an unsettled winner.**
  Its veto, or a promotion, would change nothing (point 3).
- **A new round cap for the deep rounds.** `maxrounds` (12) bounds them as it bounds the shallow ones; the deadline
  binds first in most decisions (point 6), and a deep pair that settles stops at 3.
- **Comparing a promoted alternative's deep mean with a shallow winner's shallow mean.** Different horizons, different
  scales; point 4's rule is one line and cannot play a vetoed alternative.
- **Playing more than one player.** Several 4,800-game matches are several nights for one question; a 1,600-game
  screen per player repeats J214's unresolvable shape (D541's *Rejected*). The pilot picks one by exposure, which
  knows nothing of wins.
- **Counting deep rollouts in `search.rollouts` and `search.playUs`** (the first draft). Every reader of those
  counters means the shallow search; the deep ones have their own counters and are added where a reader means the
  whole decision (its wall time already is).

**What is unverified.**

- **Everything in this lane was uncompiled and untested when written** (while J215 held the machine). It was built,
  self-tested and piloted afterwards (*Verification*); the full gate and a review of the compiled lane never ran.
- **That the crack-back board holds what the scenario says**: that Forge's own attack there is no attack, that the
  shallow leaf scores the all-out attack above the margin (the life curve gives +52, Forge's creature evaluator a
  point or two less for the tapped Bears), and that the opponent's AI attacks for lethal in every deep round. Each
  check says what it saw; a board that does not hold is fixed in the test, as D540's were.
- **The schedule inside the engine loop.** The self-test holds the pure rule (`deepThisRound`, `shallowLeft`,
  `deepLegs`); the engine scenarios cannot tell the two schedules apart on a board whose comparisons all settle at
  round 3. A board with an unsettled alternative beside a settled one would, and is not written.
- **How often the clock leaves the deep pairs under 3** under shallow first (`starved`), and what `deepmix=1` costs
  the shallow search in a real game (`shallowCut`): the pilot and the match measure them.
- **How often a settled shallow winner is a deep loser, and how often a settled near-tie is a deep winner**: no
  recording holds both horizons for one decision; the model in *Context* is from 149 pilot decisions. The pilot's
  counts and the match's counters measure it.
- **How often the code's "settled" (the first 3 paired differences exactly equal) and the recording's (`n` ≥ 3 and a
  `seDiff` rounded to 0 at 0.1) disagree**: unmeasured; the *Context* shares use the recording's.
- **That depth is worth anything at this leaf.** The deep rollout is scored by the same hand leaf at the end of the
  next turn; a crack-back is seen, a long game plan is not.
- **That three deep pairs are enough to trust.** A deep se from 3 pairs is a rough estimate; z 1 to 2 over it is a
  rule, not a test at a stated error rate.
- **That the pilot does not stop on chance.** One engine error or timeout in its 148 games stops the night (point 12):
  about 3% at J211's rate of 1 in 4,800 games.
- **The cost.** Interpolated (×1.3–1.6); the pilot's 144 ladder games and the match measure it. The decision's budget
  does not grow, so the ceiling is the budget itself.
- **That the settled test, read exactly (`d != first`), behaves on every leaf.** The leaf is a sum of integers and
  the life curve's integer slopes in today's terms (`untapped` 1); a fractional `untapped` or the evaluator leaf
  would make exact equality rarer.
- **The record's deep keys through `tools/check-redaction.mjs`**: no recording with them exists yet; the pilot's
  recorded run is the first.
- One opponent and one deck set: the live seat and the confirm set's 30 deck pairs, as every search number since
  D398.

**Verification** (2026-11-12, after J215, at the lane's head `821ac7c70`, off main `1eaa00d30`):

- **The build gap**, every step exit 0: `./tools/check-forge.sh` (the pinned jar); `rm -rf bridge/out &&
  ./bridge/build.sh` (the lint's self-test 33 rules, 79 firing cases; the lint 97 files under `bridge/src` and 4
  under `tools/`; **decision self-test 544 checks, 0 failures**, 472 at D541's merge plus `deepenSettled`'s 72);
  `./tools/ai-bench.sh --selftest` (**360 checks, 0 failures**; D542's 8 all `ok`: the board, the crack-back one turn
  further, the real game untouched, the anytime search without the key, the veto with `deepen=2`, no attack, the
  counters, the veto with `deepmix=1`); `node --test web/test/ai-ladder.test.ts` 57 of 57; `node --test
  web/test/claude-md.test.ts` 5 of 5; `node tools/decisions.mjs check` OK; `./tools/ai-ladder.sh list` gave the six
  hashes of point 9 exactly (`378105159aa3`, `b3f8993b3896`, `da01c6ec0a1d`, `8941ca286ea4`, `6a360470f103`,
  `62eb7ef18d18`); `./tools/cubelab.sh seat-identity`: all 4 games the golden's.
- **The pilot, dry-run** (`./tools/runner.sh dry-run --pilot-only --max-seconds 7200 --workers 6` on J216's draft,
  sandboxed over the lane's worktree; its seven blocks exit 0, the six 24-game ladder matches in 1,520 s): **52 of
  its 53 pilot checks pass**; the one that fails is `merged == 1` (the lane is not on `origin/main`, as expected of a
  dry-run off main). Every defect check of point 12 passed: 144 ladder games and 4 recorded, no engine error or
  timeout; names, hashes and seat configs the registered ones; both sides searched priority and attacks and no block;
  B's `.deepen.` and D540 counters and A's D540 counters all 0; the recorded run's 77 searched decisions all carried
  the deep keys as point 7 writes them (59 deepened options, every one `held`), none on a stack, and
  `tools/check-redaction.mjs` admitted them (`deepComplaints` 0).
- **The choice: no player.** Changed verdicts over 24 games each: `search-v3-deepen-z2` 1, `-z15` 0, `-z1` 1,
  `search-v3-deepmix-z2` 0, `-z15` 1, `-z1` 1, against a bar of 12 (0.5 a game). Over the six pilots the rule wanted
  2,052 comparisons deepened (14.3 a game); 1,161 ended with fewer than 3 deep pairs (`short`), so 891 reached a deep
  verdict, and they gave 3 vetoes and 2 promotions, changing 4 verdicts (0.45% of the complete comparisons). The
  clock left 118–142 decisions a pilot `starved` (about 5.5 a game), but even if every wanted comparison had reached
  a verdict at that rate the players would change about 2,052 × 4/891 / 144 = 0.064 verdicts a game, an eighth of
  the bar: no signal, not starvation. A searched 23.0–23.9 s a game against B's 19.2–21.7 in the same games.
- **Never run**: the full gate, the second independent review of the compiled lane, and any match game.

The build gap was specified, when the lane was written, to run in order: `./tools/check-forge.sh`; `rm -rf bridge/out && ./bridge/build.sh` (the lint and its self-test, javac,
the decision self-test: 544 checks as written, 472 at D541's merge plus `deepenSettled`'s 72); `./tools/ai-bench.sh
--selftest` (D542's 8 checks `ok`); `node --test web/test/ai-ladder.test.ts`, `node --test web/test/claude-md.test.ts`
and `node tools/decisions.mjs check`; `./tools/ai-ladder.sh list` (the six hashes of point 9); `./tools/cubelab.sh
seat-identity`; the full gate (`GATE_JOBS=4 ./tools/check-all.sh`); a second independent review of the compiled lane;
then `./tools/runner.sh check` and `./tools/runner.sh dry-run --pilot-only` on J216's draft, whose redaction step is
the first run of `tools/check-redaction.mjs` over records with the deep keys.

**Follow-up (closed 2026-11-12).** None. Under point 11 a pilot that qualifies no player is NOT PLAYED and a deeper
verdict is a new decision; nothing here is reposted, the lane is not merged, and the patch keeps its code. Its row in
PLAN is the cube lab's 60, added and closed in D543's lane (the branch's text below named 59, which D543 took on
main). As written before the pilot: J216 plays the pilot and, if it chooses a player, the match, at this lane's merge; its `report.md`
carries the choice, the reading, the exposure and the cost, and `summary.md` (the PC session) words them. A SHOWN or
SMALL GAIN goes to the owner as a seat-queue row under its own decision. Its row in PLAN is the cube lab's 59.
