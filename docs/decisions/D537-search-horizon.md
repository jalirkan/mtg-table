## D537 — the search's horizon: search-v2's rollouts play one turn further, three config-only arms (priority and blocks one turn deeper at search-v2's clock and at three times it, attacks one turn deeper at search-v2's clock), each one fixed 1,200-game match against search-v2 under D519's four readings, and an information-only recording of search-v2's own decisions (J212)

*Branch `pc/search-horizon`, off main `d1d6b20f` (D536's merge, the pin of J211). Three ladder players, a
DecisionSelfTest case, the registry test, this file and PLAN's rows. **Nothing a game plays by changes**: `turns`,
`aturns` and `ms` are `SearchConfig` keys the ladder already passes (`tools/ai-ladder/kinds.ts`, `SEARCH_KEYS` and
`aturns`), and `SearchPolicy` already honours them; the one file under `bridge/src` that changes is
`DecisionSelfTest.java`, which gains a check method and no behaviour. The live seat, the atlas's random seat (D508),
the wire and the protocol are unchanged, so this is free under D509. Written while J211 held the machine alone
(`alone: yes`): no Java, no build and no test ran beside it. The three hashes were computed with the ladder's own
`configHash` by one plain `node` call (no engine, no test runner); the self-test, the ladder test, the gate and the
night's pilot run after J211 finishes. Nothing here states or depends on J211's result.*

**Status: registered; unplayed. J212 plays it.**

**2026-11-11**

**Context.**

- **What search-v2's rollouts see.** Every rollout of search-v2 (`search-v1-anytime`, `turns=0`, `aturns` unset)
  ends with the AI's own turn: `limit = startTurn + horizonTurns` (`SearchPolicy.java:3134`), so a main-phase play,
  an attack or a block is scored before the opponent untaps (D351 says so of the default). The score is a heuristic
  leaf, not a win estimate (`SearchPolicy.leaf`, `:3338`): life on a curve, poison, an empty library, Forge's
  `evalCard` for each permanent, and 40 points a card in hand (`:3355`). So the opponent's reply is never played: a
  held card is worth 40 points and can only look worse than a permanent the leaf credits, an attack is valued with
  no crack-back, and passing is valued at this turn's end.
- **What J210's priority corner shows** (`search-v2-only-p` against Forge Default, 1,200 games; the counters
  re-read from the corner's batch lines for this decision). 20,462 priority decisions searched and 9,078 windows
  left to Forge because it played a land (`search.p.skipLand`); 3,914 answers changed (19.1%): from Forge's pass to
  a play 1,655, to another play 1,281, from a play to pass 978. 14.57 rollouts a searched decision, 59.0 ms of play
  and 5.5 ms of copy each, 5.99 complete rounds, 4.72% decided on fewer than 2 paired rounds. Read observationally
  (a regression of each deal's game difference on its override counts, direction only, from the priority lane's
  map of 2026-11-11): a win per override from pass +0.018 ± 0.022, to another play +0.045 ± 0.024, to pass
  +0.001 ± 0.027. The searched corner with all three kinds (`search-v1-anytime`, J210) ran 15.17 rollouts a
  decision at 53.4 ms of play each; its attack decisions alone (the `only-a` corner) 11.09 at 85.9 ms.
- **More clock at this horizon has bought nothing.** search-v2 at a quarter, half, twice and four times its budget
  and round cap against search-v2: −14.5 [−26.1, −2.9], −4.6 [−14.3, +5.0] (J195), and at 4,800 games −6.5
  [−11.7, −1.3] (J198), −4.1 [−13.1, +5.0] and +1.7 [−6.7, +10.2] Elo (J194). D536 point 10 drew the consequence: a
  stronger seat has to come from what the priority search considers and how it values it.
- **The horizon is the one value axis never matched on search-v2.** D312's pilot put `turns=1` at about three
  times a rollout's cost with 53% budget fallbacks at 1.5 s, on the fixed-round search (D351's Rejected); it was
  never played. D351's `aturns=1` was played as `search-v1-fixed3-aturns1` against `search-v1-fixed3`, the
  fixed-three-round search, and its SPRT stopped at 50.2% over 488 games (D367's Context). Neither ran on the
  anytime loop (D388), which keeps a round the clock cuts and decides on whatever paired evidence exists: a
  fallback there means no alternative was scored at all, so D312's 53% does not carry over.

**Decision.**

1. **Three arms, each `search-v1-anytime` with only the named parameters changed**, registered in
   `tools/ai-ladder/players.json`:

   | arm | params changed | priority / attack / block horizon | clock | seat config | hash |
   |---|---|---|---|---|---|
   | `search-v2-t1` | `turns=1`, `aturns=0` | next turn / this turn / next turn | 1.5 s | `Default+outlets+search:ms=1500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=0,anytime=1` | `63c35e9f7d5b` |
   | `search-v2-a1` | `aturns=1` | this turn / next turn / this turn | 1.5 s | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=1,anytime=1` | `3cf65e94df28` |
   | `search-v2-t1-x3` | `turns=1`, `aturns=0`, `budgetMs=4500` | next turn / this turn / next turn | 4.5 s | `Default+outlets+search:ms=4500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=0,anytime=1` | `ce99b41f9898` |

   B in every match is `search-v1-anytime` (`cdd55e02a89c`, `...turns=0,...,what=pab,seed=0,anytime=1`). "Next
   turn" is the end of the opponent's turn after this one: an attack's rollout sees the crack-back, a main-phase
   play's sees the opponent's answer and attack.
2. **Config only, and why the t1 arms write `aturns=0`.** `aturns` unset is −1 and then follows `turns`
   (`SearchConfig.horizonFor`, `SearchConfig.java:485`; its doc comment, "default: the same as `turns`"), so
   `turns=1` alone would deepen attacks too, which is not the arm described. The ladder omits `aturns` at its
   default and passes it when set (`kinds.ts:107`, `cfg`), so `aturns: 0` in the params reaches the seat config as
   `aturns=0`. `SearchConfig` takes `turns` and `aturns` up to 4 and `ms` from 50 to 60,000. A new case in
   `DecisionSelfTest` (`horizonArms`, 12 checks) parses the three seat configs and holds each kind's horizon, the
   clock, the round cap and every other public field to search-v2's (by reflection, as D514's and D517's cases do),
   and holds that `turns=1` without `aturns` deepens attacks; the registry test holds the params, the seat configs
   and the hashes. No other code is needed.
3. **What else the clock moves, and what is held.** The budget is one value for priority, attacks and blocks
   (`SearchPolicy.budgetFor`, `:2042`, gives only mulligans their own), so `search-v2-t1-x3` also gives attack
   decisions 4.5 s at this turn's horizon; four times the clock on every kind measured +1.7 Elo [−6.7, +10.2]
   (J194), so a gain from that part is not expected and is not excluded, and the reading says so. The anytime
   loop's pruning and racing read the deadline (`Anytime.pruneToBudget`, `Anytime.java:111`, from the measured time
   a rollout) and scale with it by themselves. Held fixed on purpose: the 12-round cap and the 2 minimum rounds
   (so `t1-x3` gets about search-v2's evidence a decision, not more), the copy's Forge think limit of 1 s
   (`copy.AI_TIMEOUT`, `:3058`), the 20,000-step cap and the step clock's grace. The bench's per-game timeout (300
   s by default) does not scale with the clock: all three matches run at `--game-timeout 900`, J194's for its
   arms that lift the clock, which cuts only a stuck game and changes nothing a game plays by.
4. **What `search-v2-t1` is at search-v2's clock.** At about three times a rollout, a first round of six
   candidates takes most of 1.5 s, and the anytime loop then prunes to what the time left can carry
   (`pruneToBudget`): most decisions will see their alternatives on one or two paired rounds. So `t1` is the
   deeper horizon *and* thinner evidence at the same seconds; `t1-x3` is the deeper horizon at about the evidence
   search-v2 has now. The two are read side by side for that reason, and `a1` puts the deeper horizon on attacks
   alone, which are about a quarter of the search's strength and 23% of its time (D536).
5. **J212: three fixed 1,200-game matches** (D398: 600 mirrored pairs, no stopping rule), arm = A,
   `search-v1-anytime` = B, on the confirm set, `alone: yes`, in this order: `search-v2-t1`, `search-v2-a1`,
   `search-v2-t1-x3`. Each match is played in a ladder folder of its own, `var/j212-<arm>`, emptied by its own
   block first, on this host's own seed base (D535 point 2), so each takes blocks 114,900,000–114,900,149, J210's
   and J194 (a)'s deals, on a first run and on a retry. D536 point 6 moved J211 off these blocks because its arm had
   been chosen on them; none of these arms has played a game, so nothing here was chosen on any deal.
6. **The readings, written before any game: D519's four, at 1,200 games.** D519 point 6 says a later rule that
   wants its SMALL GAIN reading writes its own before its games; this is that. A match is **complete** when its line
   names the arm and `search-v1-anytime` in that order at their hashes, says `complete: true`, played all 1,200
   games with errors plus timeouts at most 60, carries `score`, `lo`, `elo`, `eloLo` and `eloHi`, was played on
   exactly blocks 114,900,000–114,900,149 with no other match's game in its folder, every batch line carried the
   two seat configs of point 1 exactly, and both sides searched priority, attack and block decisions. Exactly one
   reading of a complete match, in this precedence, compared as the line carries them (`lo` in integer
   ten-thousandths, Elo in integer tenths):
   - **SHOWN**: `lo` above 0.5 and `elo` at least +15;
   - **SMALL GAIN**: `lo` above 0.5 and `elo` below +15;
   - **INCONCLUSIVE AT 1,200**: `lo` at most 0.5 and `eloHi` at least +15;
   - **NOT SHOWN**: `lo` at most 0.5 and `eloHi` below +15.
   An incomplete match gets no reading and is reposted alone under a new job id. Beside each reading, deciding
   nothing: indistinguishable (the Elo interval holds 0), a measured loss (wholly below), a measured gain (wholly
   above). J209 read its arm by D527's table, with D519's readings only for a confirmation; this night uses D519's
   four for the screen itself, as its owner's design asked.
7. **What a reading earns.** A SHOWN or SMALL GAIN arm is a **candidate** for one 4,800-game confirmation against
   `search-v1-anytime` on deals no match has played (a host name of its own, as D536 point 6 did), under D519's
   readings, as its own job under its own decision; nothing is adopted from 1,200 games. An INCONCLUSIVE AT 1,200 is
   information and is not confirmed by this decision. A NOT SHOWN arm is not played again. No reading changes the
   live seat (D509): a confirmed arm becomes a seat-queue row with its point, interval and seconds a game, and the
   owner's word; an arm at three times the clock is never proposed as a seat on its cost alone.
8. **What each outcome leads to** (consequences, read from the three readings together; not rules):
   - `t1` a candidate: the horizon pays at search-v2's own clock, even on thinner evidence; its confirmation comes
     first, and `t1-x3` says what more evidence adds.
   - `t1` not a candidate and `t1-x3` a candidate: the horizon is worth it per rollout and not per second; the next
     lane makes the deeper rollout cheaper (a faster copy, or a rollout that plays the opponent's turn with a
     cheaper policy), and `t1-x3`'s confirmation measures what is at stake. Part of `t1-x3`'s gain could be its
     attacks' 4.5 s (point 3); J194 makes that unlikely, and the confirmation does not separate them.
   - `a1` a candidate: attacks get the deeper horizon; its confirmation comes first, and a seat deepening attacks
     and priority together (`turns=1` with `aturns` unset) is a new arm under a new decision after it.
   - `t1` and `t1-x3` both NOT SHOWN: the horizon is closed for Forge rollouts at this leaf for priority and blocks,
     and the next lane turns to what the search considers (the instant-speed windows and the land drops the
     recording step below counts) or to the leaf itself.
   - `a1` NOT SHOWN: the deeper attack horizon is closed for Forge rollouts on the anytime search, as it was on the
     fixed-round one (D351, D367).
   - Every arm INCONCLUSIVE AT 1,200 or NOT SHOWN with a point near 0: no direction from this night; the PC session
     chooses the next lane with the table and the recording in front of it.
9. **Beside each reading, as description only.** Each side's searched decisions by kind; ms a searched decision,
   overall and by kind; search seconds a game (ms a decision × searched ÷ the match's games played); rollouts and
   complete rounds a searched decision (the counters keep these over all kinds together, not by kind); ms of play
   a finished rollout, the horizon's own trace (`search.playUs` ÷ `search.rollouts`; a rollout the deadline cuts
   is in neither); the share decided on fewer than 2 paired rounds (`search.anytime.short`); the priority
   overrides by direction a priority decision (from pass, to another play, to pass); the land windows left to
   Forge a game.
10. **The recording step: information only, it decides nothing.** After the three matches, if the night has room:
    `search-v1-anytime` against Forge Default (`Default`) on the confirm set, 24 games a deck pair (720 games),
    through `ai-bench.sh play --record-all` (D347: each seat's own gzipped log under the run folder's `games/`,
    with that seat's decision records). Read from the code (`AiBench.java` `BenchRecording`;
    `PolicyControllerAi.chooseSpellAbilityToPlay`; `Decision.toJson`; `Decisions.stats`; `SearchPolicy.Report.fillStats`,
    which `searchAnytime` fills), a record carries every legal option of a priority, attack or block decision with
    more than one (a forced pass is only counted), the answer and who chose it, and, where the search ran, each
    candidate's rollouts, mean leaf, paired difference to Forge's answer and its standard error, the complete rounds,
    the horizon and the ms. A summarizer in the job reports from the search seat's records: the standard deviation
    of a candidate's paired difference to Forge's answer by kind (σ_d = `seDiff` × √n, Forge's answer being rolled
    first in every round, `Anytime.order`), rollouts a candidate, candidates a decision for all searched decisions,
    legal options against options considered, the land windows the search skipped and how many had another land or
    a castable play, and the priority windows outside the seat's own main phases with a legal non-mana play. What
    the records do not carry (the paired-round count itself, per-round leaves, rollouts by kind) is said, not
    approximated. About 125 MB of logs (D347: 178 KiB a game) and about 0.9 h.
11. **Time.** Wall time of a 1,200-game match against search-v2 on this host at 7 workers, alone, is about
    0.47 h + 0.0436 h × both sides' search seconds a game (a fit over 19 finished matches, J194 (b) and (c) to
    J209; residual sd 0.15 h, largest +0.37 h). With B at about 22 s a game: `t1` about 31 s (priority and blocks
    near the 1.5 s budget a decision, attacks as now), about 2.8 h; `a1` about 25 s, about 2.5 h; `t1-x3` about 60 s
    (priority and blocks near three times search-v2's 935 ms, attacks about 1.3 s), about 4.0 h and 4.7 h if
    decisions run nearer their 4.5 s. The recording about 0.9 h (J194 (a): 1,200 such games in 1.27 h, plus D347's
    12%), the pilot about 0.5 h: about 11 h in all, 13 h if memory pressure holds the night at 5 or 6 workers as it
    held J210. Each match stops itself (`--hours` 4.5, 4 and 7), the recording at 2 h.

**Rejected.**

- **`turns=1` without `aturns=0`.** It deepens all three kinds at once; `a1` would then be the only arm that says
  anything about attacks, and `t1`'s reading would mix two questions.
- **Scaling the round cap with the clock in `t1-x3`** (`maxrounds=36`, as D514's arms scale both). That buys about
  three times search-v2's rollouts at the deeper horizon; the arm's question is the horizon at about search-v2's
  evidence, so the cap stays 12.
- **`turns=2`.** About nine times a rollout by D312's ratio, and pointless before one more turn reads.
- **A clock for priority and blocks only.** New Java (`budgetFor` has one budget); J194 says the attacks' extra
  clock is worth about nothing, and point 3 writes the confound down.
- **Against Forge Default, as J210 did.** J210's corners asked an additive question on one scale; these arms ask
  whether a seat is stronger than search-v2, which a head-to-head answers directly and at a 1,200-game width of
  about ±11 Elo.
- **4,800 games for each arm now.** Three nights for a screen; the 1,200-game screen and one confirmation for a
  candidate is J195's and D536's shape.
- **Confirming an INCONCLUSIVE AT 1,200 at once.** A confirmation is a night; which arm deserves one is decided
  with the three readings and the costs in front of the PC session, under a decision of its own.
- **A leaf change first** (a crack-back term, D351's H1(b); a learned leaf measured +2.2 [−4.7, +9.0] at 4,800, J139).
  The horizon is config only and asks the same question by playing the turn instead of guessing it.

**What is unverified.**

- **Everything in this lane is uncompiled and untested** (J211 held the machine): `DecisionSelfTest.horizonArms`
  (the build's decision self-test should print 404 checks, J210's pilot's 392 plus these 12), the D537 case in
  `web/test/ai-ladder.test.ts`, and the three hashes, which one `node` call of the ladder's own `configHash`
  printed and the test has not yet held.
- **The time**: point 11's fit is of finished matches, but `t1`'s and `t1-x3`'s ms a decision are guesses from
  D312's October ratio on the fixed-round search, never measured on the anytime loop.
- **That ms of play a rollout traces the horizon**: it counts finished rollouts only, so at `t1`'s clock, where
  more rollouts are cut by the deadline, it understates the deeper rollout. The pilot checks that `t1`'s and
  `t1-x3`'s are at least 1.3 times B's, and reads each searched decision's horizon from 4 recorded games per arm.
- **That the recording step runs as read**: no confirm-set recording of the anytime search exists; October's
  recorded cube games (`j048-bench`, search-v1) read cleanly through the summarizer, and the pilot records 4 games
  of each arm and of search-v2 before the night.
- **σ_d's paired count**: a round where Forge's own rollout threw has no paired difference, so σ_d from `seDiff` ×
  √n overstates n there; the records do not say how often (the batch counters' `search.rolloutErrors` does, in
  total).
- Whether one opponent (search-v2) and the confirm set's 30 deck pairs stand for the table the seat meets. They are
  what every search number since D398 was read on.

**Follow-up.** J212 plays the three matches and the recording at this lane's merge. Its `report.md` carries each
arm's reading, the three words, the cost and the horizon's trace, and the recording's summary; `summary.md` (the
PC session) words them. A candidate's confirmation is its own job under its own decision; with no candidate, point
8 says where the next lane points.
