## D533 — random-v9, the random-rollout track's last iteration: `rollout=mix4-them`, a decision's rollouts taken by turns by round between search-v2's Forge rollout and D531's `random4-them` (round 0 Forge's), on the margin rule at the margin J208 names, one 1,200-game match against search-v2; whatever it reads but a candidate, the track closes (amends D532)

*Branch `pc/rollout-random-v9`, off main `429ccd9e` (D532's merge, the pin of J208, the random-v8 night: D532 calls that
night J207; J207's pilot failed on the job file's own metric line before any rated game, and J208 is the same job
reposted on the same pin, pc-jobs `869a9e49`). `node tools/decisions.mjs next` printed D533. Amends D532 (its point 5, which pre-registered random-v9 and
left "a rollout value whose seat choice alternates by the rollout's index", the scoring rule for two kinds of leaf, the
self-test and the night to "its own decision") and through it D531, D530, D528, D527 and D523 (the iteration loop of
D523's point 10): this is point 10's eighth and last iteration (J199 random-v2, J201 random-v3, J202 random-v4, J204
random-v5, J205 random-v6, J206 random-v7, J208 random-v8). One new rollout value, two ladder players, one self-test
case, tests and this file. **Three files under `bridge/src` change** — `SearchConfig.java` (the value),
`SearchPolicy.java` (the round's index reaches the rollout's seats, and the mix's counters) and `DecisionSelfTest.java`
(the case) — and no earlier value's behaviour does (point 3): the live seat, the atlas's random seat (D508's frozen
population), D523's to D532's arms, the wire and the protocol are unchanged, so this is free under D509.
**Prepared while J208 runs, before its reading, and merged only on one of them**: J208's verdict says `v9` 1 (both
arms to diagnose, not both losing badly), or a J208 confirmation fails and D532 point 4 sends the track here. If J208
finds a candidate whose confirmation holds, or closes the track (both arms losing badly), this lane is shelved,
unmerged, and this number stays unused (D200).*

**Status: written, UNCOMPILED, unbuilt, unpiloted, ungated, unplayed.** J208 (past its pilot, playing) held the
machine alone (`alone: yes`) while this was written, so no Java ran: no javac, no `bridge/build.sh`, no self-test, no pilot. Every fact only J208
can supply is marked TODO(J208); every fact only the build and the pilot can supply is marked TODO(build).

**2026-11-10**

**Context.**

- **The chain**, every arm against `search-v1-anytime` (search-v2) on the same 600 deals (blocks
  114,900,000–114,900,149, the confirm set), each one night, each read under the same pre-registered table:

  | iteration | arm | change | Elo vs search-v2 [95%] | reading |
  |---|---|---|---|---|
  | random-v2 (J199 a) | `search-v2-rrandom` | the atlas's random seat + R1–R7, both rollout seats | −43.7 [−57.1, −30.4] | loses badly |
  | random-v2 (J199 b) | `search-v2-rrandom-self` | the same, searching seat only | −25.5 [−38.3, −12.8] | worse, not badly |
  | random-v3 (J201 a) | `search-v2-rrandom3` | + R8 the good block | −30.8 [−44.4, −17.2] | loses badly |
  | random-v3 (J201 b) | `search-v2-rrandom3-held` | + R9 the held instant | −29.6 [−43.7, −15.6] | loses badly |
  | random-v4 (J202 a) | `search-v2-rrandom4` | R8 made lethal-aware | −39.5 [−53.9, −25.3] | loses badly |
  | random-v4 (J202 b) | `search-v2-rrandom4-m40` | + the override margin 20 → 40 | −20.9 [−34.1, −7.7] | worse, not badly |
  | random-v5 (J204 a) | `search-v2-rrandom4-m60` | the override margin 40 → 60 | −24.4 [−38.4, −10.4] | worse, not badly |
  | random-v5 (J204 b) | `policy-outlet` (the baseline) | search-v2's seat, the search off | −84.4 [−99.9, −69.3] | (no reading of its own) |
  | random-v6 (J205 a) | `search-v2-rrandom4-lcb-m40` | D350's `override=lcb`, z 1, at margin 40 | −35.4 [−49.5, −21.5] | loses badly |
  | random-v6 (J205 b) | `search-v2-rrandom4-lcb-m60` | the same at margin 60 | −34.3 [−47.8, −20.9] | loses badly |
  | random-v7 (J206) | `search-v2-rrandom4them-lcb-m40` | the rollout's opponent alone random (`random4-them`) | −23.2 [−34.7, −11.7] | worse, not badly |
  | random-v8 (J208 a) | `search-v2-rrandom4them-m40` | J206's arm on the margin rule (no lcb), margin 40 | TODO(J208) | TODO(J208) |
  | random-v8 (J208 b) | `search-v2-rrandom4them` | the same at search-v2's own margin, 20 | TODO(J208) | TODO(J208) |

  Every number above but J208's is from the runner's lines as J199's to J206's summaries
  (`~/code/pc-results/results/J199`–`J206/summary.md`) and D532's Context state them.
- **J207 and J208.** D532 drafted the random-v8 night as J207. J207 failed in its pilot on one metric line of the job
  file itself (a `${k}` inside a `node -e` metric, which `systemd-run` expanded to nothing, so it read `match-.json`),
  before any rated game, and was reposted unchanged as J208 on the same pin `429ccd9e`; J208's matches write
  `var/ai-ladder/match-J208a.json` and `match-J208b.json` and its verdict `var/j208/verdict.json`. Everything D532
  says of J207 is, for this file, J208's; random-v9's night is therefore J209. D532's file is not edited.
- **J208's reading of random-v8**: TODO(J208) — each arm's score, Elo and interval, its reading under D532 point 4,
  `v9` and `v9Margin` from `var/j208/verdict.json`, and each side's overrides by kind and direction beside J206's.
  **The condition this file merges on**: J208's verdict carries `v9` 1 (or a J208 candidate's confirmation failed and
  D532 point 4 names the margin from J208's two points); TODO(J208): which, and the margin, 40 or 20.
- **What D532 point 5 fixed, and what it left here.** Fixed: "Each candidate's rollouts alternate, within a round,
  between search-v2's own Forge rollout (both seats Forge's Default AI) and a `random4-them` rollout (the opponent
  random-v4), the first rollout Forge's, at the margin rule and the margin point 4 names"; the reason (J194's
  `search-v2-ms6000-r48`, ×3.14 search-v2's rollouts a decision, +1.7 Elo [−6.7, +10.2] against it: more Forge
  rollouts of the same kind bought nothing, so a second, differently wrong opponent model beside Forge's is "the one
  way random rollouts could add information to the search rather than replace it" — an argument, D532's residual says,
  not a measurement); new Java, a `DecisionSelfTest` case, a pilot and one 1,200-game match on the confirm set against
  `search-v1-anytime`, `alone: yes`, read under D532 point 4's table; and D532 point 6, the closing rule. Left here:
  what "alternate" means in the code, "a scoring rule for two kinds of leaf, which random-v9's decision settles", the
  value's name, the arms and their hashes, and the night's exact rule.
- **The seam, read, not assumed** (`SearchPolicy.java` on this lane; the arms run `anytime=1`, `rank=order`).
  `searchAnytime` plays a decision in **rounds**: each round draws one seed (`rng.nextLong()`), the rollout seed every
  candidate in that round is played on (common random numbers: the same determinization and engine stream), appends
  one row to `leaves` (`leaves[round][candidate]`, NaN where a candidate was not played), and plays at most one rollout
  per active candidate, Forge's answer first (`Anytime.order`). Before each later round it may prune to the budget,
  after each round it may retire by racing (from `Anytime.RACE_FROM` = 3 paired rounds, at `RACE_Z` = 2), and a round
  the deadline cuts keeps the rollouts it finished. The verdict reads `Report.fillStats`'s paired difference to
  Forge's answer, `diffLeaf[i]`, the mean over every round where both were scored of `leaves[j][i] − leaves[j][0]`,
  and `Anytime.best` picks among the best-covered candidates. The fixed-rounds loop (`search`, `anytime=0`) is the
  same with complete rounds, and an errored round is dropped and replayed **at the same index** with a new seed. Each
  rollout's seats are `playout`'s choice from `Limits.randomUs` and `Limits.randomThem` (D531's Context), and before
  this lane `SearchPolicy.rollout` built those from `cfg.rolloutRandomUs()` and `cfg.rolloutRandomThem()`, the same
  for every rollout of a decision. So a candidate's *k*-th rollout and the decision's *k*-th round are the same thing
  exactly when the candidate was played in every round before it; they part where a candidate was pruned, retired,
  errored or not reached in a cut round.

**Decision.**

1. **"Alternate" is by round index** (this narrows D532 point 5, and amends it there). Round 0 of a decision — the
   first row of its `leaves` — plays **every** candidate's rollout as search-v2's Forge rollout (both seats
   `RolloutController` / `PlayerControllerAi`, the candidate forced first); round 1 plays every candidate's as
   `random4-them`'s (the opponent's seat `RolloutController.Random` on random-v4, the searching seat plain Forge with
   the candidate forced first, exactly as D531 seats it); round 2 Forge's; and so on: the kind is a pure function of
   the round's index, odd rounds random. **Why by round and not by each candidate's own rollout count, nor "within a
   round":** the margin rule averages *paired* differences, each a candidate's leaf minus Forge's answer's leaf **in
   the same round**. By round index, every candidate in a round shares the round's determinization (as now) **and its
   rollout kind**, so each paired difference is taken inside one kind, Forge-against-Forge or random-against-random,
   and the pairing that common random numbers buy is kept. Alternating within a round, or by each candidate's own
   count, would pair a candidate's random-rollout leaf with Forge's answer's Forge-rollout leaf whenever their counts
   differ (a pruned, retired, errored or cut candidate), mixing the difference between the two rollout kinds into the
   difference between the two candidates. D532 point 5's own reason paragraph already discusses the mix "per round"
   (D530 point 8's objection), so this is the reading its argument assumes; where its words "within a round" and "by
   the rollout's index" say otherwise, this point replaces them. **Rounds by kind**: under `anytime=1` a decision gets
   as many rounds as the budget allows (at most `maxrounds` 12 complete ones), so a decision with an odd number of
   rounds has **one more Forge round than random ones**, and a decision decided on a single round (`search.anytime.short`)
   decided on a Forge round alone. Both are counted (point 3's counters), never corrected for.
2. **The scoring rule for the two kinds of leaf** (D532 point 5 left it here): **none new.** Both kinds end in the same
   leaf (`SearchPolicy.leaf`, the hand leaf, on the same scale), and the verdict is search-v2's margin rule unchanged:
   Forge's answer is overruled when the best candidate's mean paired difference to it, **pooled unweighted over every
   round of either kind**, clears the margin. Mechanically, for a candidate with *n*F Forge pairs of mean *X* and *n*R
   random pairs of mean *Y*, the rule compares (*n*F·*X* + *n*R·*Y*)/(*n*F + *n*R) with the margin — about the plain
   average of the two kinds' means, since *n*F and *n*R differ by at most one in a decision where every round scored
   the candidate. Pruning, racing and `Anytime.best` read the same pooled differences, whose spread now includes any
   difference between the kinds. Nothing in the verdict, the budget, the pruning or the racing reads the kind.
3. **The Java** (uncompiled; TODO(build)). **New:** in `SearchConfig`, the value `mix4-them` in `ROLLOUTS` and in the
   unknown-value message; `rolloutMix()`; `mixRoundRandom(round)` (`(round & 1) == 1`); `rolloutRandomThemIn(round)`
   = `rolloutRandomThem() || rolloutMix() && mixRoundRandom(round)`; `rolloutRandomSeat()` gives `mix4-them`
   random-v4 (`Config.randomV4Block()`, `random4-them`'s); `parseLive` refuses it (`... || c.rolloutMix()`, "measurement
   only", the message naming D533). `rolloutRandomUs()` and `rolloutRandomThem()` are **false** for it: no seat is
   random in every rollout, so under `rank=prior` the ranking's playouts, which have no round, are Forge's (the arms do
   not rank). In `SearchPolicy`: `rollout(…)` takes the round's index (`r` in `searchAnytime`, `leaves.size()` at the
   round's start in `search`) and builds its `Limits` in one place, `rolloutLimits(cfg, deadline, horizon, leafEval,
   round)`, whose only change is `cfg.rolloutRandomThemIn(round)` where it read `cfg.rolloutRandomThem()`; and three
   counters' helpers, called only under `rolloutMix()`. **The counters**, on the batch lines like every `search.*`
   key: `search.mix.forgeRollouts` and `search.mix.randomRollouts` (each rollout `search.rollouts` counts, by its
   round's kind, so the two sum to `search.rollouts`); `search.mix.forgeRounds` and `search.mix.randomRounds` (each
   round of the decision's leaves holding at least one leaf, by kind, counted where `search.rounds` is; under
   `anytime=1` `search.rounds` counts complete rounds only, so the sums can differ by the partial ones) and
   `search.mix.decisions` (the decisions counted there); and, for the best candidate when it is not Forge's answer,
   its paired differences by kind, `search.mix.pairsForge` / `pairsRandom` (how many) and `search.mix.dForge` /
   `dRandom` (their sum, rounded to whole leaf points per decision, so a night's mean by kind is `dForge / pairsForge`),
   with `search.mix.both` (decisions with pairs of both kinds) and `search.mix.disagree` (of those, the ones whose two
   kinds' mean differences had opposite signs). `search.rr.*` count the random rollouts alone, as they always have
   (a rollout that seated a random seat, however it ended). **Unchanged, byte for byte in behaviour:** for every
   earlier value `rolloutRandomThemIn(round)` is `rolloutRandomThem()` whatever the round, so `rolloutLimits` builds
   the `Limits` `rollout` built before, field for field; no counter is written and no random number drawn that was not
   before (the new counters sit behind `cfg.rolloutMix()`, and the round's index is read, never drawn); the ranking's
   playouts, `playout`, `countRandomSeats`, the verdict and the anytime loop are untouched. So search-v2 and every arm
   since D523 play what they played.
4. **The self-test case** (`DecisionSelfTest.rolloutMix4Them`, engine-free, beside D531's): the value parses; it is a
   mix and seats no random seat in every rollout; `mixRoundRandom` is false at 0, 2 and 10 and true at 1, 3 and 11;
   `rolloutLimits` at round 0 gives search-v2's seating and at round 1 `random4-them`'s (`randomUs` false, `randomThem`
   true, the lethal-aware random-v4 seat), round 2 Forge's again; **for every other value in `ROLLOUTS`,
   `rolloutLimits` gives the same seats in rounds 0 to 3 as its every-rollout predicates** (the guard on point 3's
   "unchanged"); the counters' helpers on synthetic leaves (rounds 0, 2 and 4 Forge's, round 1 random, an all-NaN
   round 3 counted in neither; the best's pairs by kind, +60 over three Forge pairs and −10 over one random pair, a
   disagreement; Forge's own answer as best counting no pair; rollouts by kind); the text is search-v2's plus
   `,rollout=mix4-them`; `configOnly` against search-v2 and against `random4-them` (the field `rollout` alone), the
   margin-40 arm against `search-v2-rrandom4them-m40` (`rollout` alone) and against the margin-20 arm (`margin`
   alone); neither carries lcb; `parseLive` refuses it and still takes `default`; an unknown value is refused naming
   `mix4-them`. 21 checks, so the build's count should read D532's 371 plus 21, **392**: TODO(build).
5. **Two arms**, kind `search`, D532's two arms with the rollout value alone changed; each note says "for
   measurement, never the live seat". Both are registered now, so the names and hashes exist before any rated game;
   **one plays**, the one point 7 names.

   | player | role | seat config | config hash |
   |---|---|---|---|
   | `search-v1-anytime` (search-v2) | the opponent | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1` | `cdd55e02a89c` (unchanged) |
   | `search-v2-rrandom4them-m40` (D532) | J208 (a) | `…,margin=40,…,seed=0,anytime=1,rollout=random4-them` | `179ab0649521` (unchanged) |
   | `search-v2-rrandom4them` (D532) | J208 (b) | `…,margin=20,…,seed=0,anytime=1,rollout=random4-them` | `d5381ade9e66` (unchanged) |
   | **`search-v2-rmix4them-m40`** | random-v9 at 40 | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=40,maxrounds=12,what=pab,seed=0,anytime=1,rollout=mix4-them` | **`fcf472f384b7`** (new) |
   | **`search-v2-rmix4them`** | random-v9 at 20 | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1,rollout=mix4-them` | **`b2592de740c9`** (new) |

   Each is its D532 arm with `rollout=mix4-them` for `rollout=random4-them`; the two differ in the margin alone; the
   margin-20 arm has no margin key (as `search-v2-rrandom4them` has none) and is search-v2's seat config with
   `,rollout=mix4-them` appended. The hashes are `registry.ts`'s (`configHash`), computed in node on the lane;
   `web/test/ai-ladder.test.ts` holds both, that each is its D532 arm with the rollout value alone changed, that they
   differ in the margin alone, and every earlier arm's hash. The ladder's `rollout` enum (`tools/ai-ladder/kinds.ts`)
   takes the value.
6. **The night** (drafted as J209): **one fixed D398 match of 1,200 games on the confirm set, the arm point 7 names
   against `search-v1-anytime`, `alone: yes`** (D521), in the real ladder folder, `var/ai-ladder/match-J209a.json`.
   The matchup is a new name, so it takes blocks 114,900,000–114,900,149, the chain's deals. **The code check, by
   content**, in the runner's checkout of the pin (HEAD), over every path a match runs (D530's list: `bridge/src`,
   `tools/ai-bench`, `tools/ai-ladder`, `tools/cubelab/lines.ts`, `tools/cubelab/rng.ts`, `tools/runner/control.ts`,
   `tools/ai-ladder.sh`, `tools/ai-bench.sh`, `tools/config.sh`, `forge-home/custom-cards`, `config.json`): HEAD has
   two parents and its second is the lane tip the job names (a HEAD with no second parent fails the check, never
   passes it); `git diff --quiet <lane tip> HEAD -- <paths>` exits 0 (the merge result there is the lane tip);
   `git diff --quiet 429ccd9e HEAD^1 -- <paths>` exits 0 (main there is J208's pin); and the pin's diff there from its
   first parent, and from J208's pin `429ccd9e`, names exactly this lane's five files —
   `bridge/src/mtgtable/ai/SearchConfig.java`, `SearchPolicy.java`, `DecisionSelfTest.java`,
   `tools/ai-ladder/kinds.ts` and `tools/ai-ladder/players.json`. This time the pin's tree **does** differ from its
   first parent under `bridge/src`, which point 3 reads as leaving every earlier value's play unchanged; that is a
   reading of the code, checked by the self-test's guard, and the comparisons with J208 and earlier nights are
   labelled as across this lane's change. If main moves under a match path before this lane merges, the check fails
   and the job is redrafted on the new main; nothing is replayed.
7. **The pre-registered rule for J209** (written on 2026-11-10 before any rated game of either arm; the night's job
   quotes it word for word). **The arm** is the one at the margin D532 point 4 names from J208's two points: the
   margin of J208's arm with the higher Elo point, 40 for (a) `search-v2-rrandom4them-m40` and 20 for (b)
   `search-v2-rrandom4them`, 40 when the points are equal; so `search-v2-rmix4them-m40` (`fcf472f384b7`) when that
   margin is 40 and `search-v2-rmix4them` (`b2592de740c9`) when it is 20. ONE 1,200-game D398 match of that arm
   against `search-v1-anytime` on the confirm set, `alone: yes`. The arm is read once against `search-v1-anytime`
   from its match line by the first row of D527's table that holds, the SHOWN row as D530 point 7 restated it for a
   `random4-them` candidate, in D532 point 4's words: SHOWN (lower end above 0.5 and point at least +15
   Elo: Forge's opponent model leaves the rollout loop for this arm, after a 4,800-game confirmation under D519's
   readings holds it), INCONCLUSIVE (upper end at least +15 and lower end at most 0.5: confirm at 4,800 games under
   D519's readings before anything), NOT SHOWN, indistinguishable (upper end below +15, the interval contains 0, and
   its lower end is above −15 Elo: a candidate, confirmed at 4,800 games), NOT SHOWN, worse, not badly (upper end
   below 0 and at least −15 Elo: to diagnose), NOT SHOWN, loses badly (upper end below −15 Elo: to diagnose) — with
   D527's three unreached cases read as D527 reads them (a lower end above 0.5 with a point under +15 and an upper end
   at least +15 is INCONCLUSIVE; an interval wholly at or above 0 with an upper end below +15 is NOT SHOWN, no
   weaker, a candidate; an upper end of exactly 0 is worse, not badly) and its too-wide case (an interval containing 0
   with its lower end at or below −15 is worse, not badly). "Lower end" in the SHOWN and INCONCLUSIVE rows is the
   match line's `lo`, "point" its `elo`, "interval" and "upper end" its `eloLo` and `eloHi`, the arm the match's first
   player. A match is complete when its line names the arm and `search-v1-anytime` in that order at their config
   hashes, says `complete: true`, played all 1,200 games with engine errors plus timeouts at most 60, and carries the
   four numbers. Every threshold is compared on the numbers the match lines carry: Elo in integer tenths, the score's
   lower end in integer ten-thousandths. (Under `mix4-them` Forge's opponent model stays in the loop for half the
   rollouts, so SHOWN's consequence is read as D532 point 6 reads a holding confirmation: the random opponent model is
   as good as Forge's for the search, Forge staying in the loop for the searching seat's own continuation and, under
   random-v9, for half the rollouts.) Exactly one of two things follows from a complete match. **A confirmation**:
   when the arm is a candidate (SHOWN, INCONCLUSIVE, indistinguishable or no weaker), a 4,800-game confirmation of
   the arm under D519's readings, posted as its own job; holding, the random-rollout track closes as reached, its
   closing decision saying so; failing, the track closes. **The track closes**: otherwise (worse, not badly or loses
   badly), the random-rollout track closes with a closing decision (D532 point 6), with no further iteration. An
   incomplete match gives no reading and nothing follows from it: it is reposted alone, as D532 point 4 handles an
   incomplete arm (the repost is a job of its own in a ladder folder of its own, whose blocks start at 114,900,000,
   the incomplete line kept and never resumed; an arm incomplete a second time is diagnosed before any third post),
   and the reposted job applies this rule to its line. Reported beside, deciding nothing: the arm minus J208's arm at
   the same margin (the mix's own effect, across this lane's change), minus J206's arm and minus J202 (b) or (a) at
   the same margin; the arm minus J204 (b) with D528's `hw` and interval; each side's overrides of Forge by kind and
   by direction at priority (`fromPass`, `toOther`, `toPass`) beside J208's, J206's and J202's; ms, rollouts and
   rounds a decision; Forge and random rounds and rollouts a decision; the best alternative's paired differences by
   kind and the share of decisions whose two kinds disagreed in sign; every `search.rr.*` per random rollout; the deal
   blocks; the arm's ten longest and ten quickest lost games. The live seat never changes, and the
   self-play-from-random path does not open, on any reading of this night.
8. **The closing decision** (D532 point 6, unchanged): written from the track's closing draft with the counters of
   every iteration, J209's mix counters among them, naming what would reopen the track (D530 point 7's list: a seating
   where the search decides the random defender's blocks; a learned rollout policy, D522's step 2 with a teacher that
   is not Forge). D523's stop on two successive iterations that lose badly stands but adds nothing here, since the
   track closes after J209 on every reading but a candidate. **The live seat is never changed by any of this**: a
   candidate that holds is a seat-queue row (D509), a separate decision.
9. **What the night's counters should show, not registered and deciding nothing.** Mechanically, about half the arm's
   rollouts and rounds are random: `search.mix.forgeRounds` at least `search.mix.randomRounds` on the night, by at
   most one a decision but for rare rounds with no leaf; `search.mix.forgeRollouts + randomRollouts` equal to the
   arm's `search.rollouts`; `search.rr.rollouts` at least `search.mix.randomRollouts`; no `search.mix.*`, `search.rr.*`
   or `search.lcb.*` on search-v2's side and no `search.lcb.*` on the arm's. The cost of a decision near search-v2's
   and J206's (J206: 16.28 rollouts a decision against search-v2's 15.45, 50.0 ms a rollout against 51.7), since both
   kinds seat Forge's continuation for the searching seat. **What is not predicted:** the arm's override rates against
   J208's arm at the same margin (TODO(J208): J208's rates), and whether the two kinds disagree often. The disagreement
   counters say how often the Forge rounds and the random rounds pointed opposite ways on the candidate the verdict
   read; they give a rate, never which kind was right, and no override rate says which overrides win games.
10. **The hashes rule (D525 point 3) holds**: a config hash is the seat config's text and the code is pinned by the
    commit (D341). `mix4-them` is a new value; every earlier arm keeps its hash (`web/test/ai-ladder.test.ts`).

**Rejected.**

- **Alternating within a round, or by each candidate's own rollout count** (D532 point 5's words read literally).
  Point 1: it pairs leaves of different kinds whenever a candidate's count and the round's index part, and puts the
  kinds' difference into the candidates' difference.
- **Weighting the kinds** (Forge's rounds counted more, or each kind's mean difference read against the margin
  separately, overriding only when both clear it). Each is a new rule with a free parameter or a second look, chosen
  before any data; the pooled mean is search-v2's rule unchanged, and the disagreement counters report whether the
  kinds pulled apart without deciding on it.
- **A random round first.** D532 point 5 names Forge's first, and with it a decision cut to one round decides on
  search-v2's own rollout, as search-v2 would.
- **Both seats random in the random rounds** (`random4` instead of `random4-them`). D530 point 8 traced the from-pass
  excess to the searching seat's own random continuation, and D532 built random-v9 on `random4-them`.
- **Two matches, one per margin.** D532 point 5 registers one match, at the margin J208's two points name; the other
  arm is registered only so that its name and hash exist before any rated game.
- **Setting `rolloutRandomThem()` true for `mix4-them`.** It would seat the ranking's round-less playouts random under
  `rank=prior` and make every reader of that predicate wrong in half the rounds; the round-aware predicate is read in
  the one place a round exists.
- **Checking an absence with `== null`** in J209's job (J206's `failed`), **and a `$` in a metric line** (J207's
  failed pilot: `systemd-run` expands `$VAR` and `${VAR}` in the command it is handed). Every checked metric is a 0/1
  flag or a number, with a default line carrying 0, and every `sh:` metric line is free of `$`.

**Measured.**

- `web/test/ai-ladder.test.ts`, `node --test` (51 tests, 51 passed): both arms' raw params are their D532 arm's with
  `rollout: mix4-them`; their resolved params are their D532 arm's but `rollout`; their seat configs their D532 arm's
  with the rollout value alone changed; hashes `fcf472f384b7` and `b2592de740c9`; they differ in the margin alone;
  neither carries `override=` or `z=`; the ladder's enum takes the value; D527's to D532's arms, `rrandom-self`,
  `policy-outlet` and search-v2 keep their hashes. `npx tsc --noEmit` in `web/` clean. `./tools/lint-bridge.sh` (grep,
  no JVM): `bridge lint OK (96 file(s) under bridge/src, 3 under tools/; 33 rules)`.
- **J209's draft, dry-run without the engine** (in the session scratchpad, not posted, `runner.sh check` not run): the
  assembler (`--arm m40|m20`, `--pin`) against a local `--no-ff` merge of this lane onto `429ccd9e` in a scratch clone
  (never on a branch of the repo) passed its tree checks and refused a pin that is not this lane's merge and a draft
  with no arm; the pilot's engine-free blocks ran there for both arms: the players and hashes as point 5 says (from
  `node tools/ai-ladder/cli.ts list`), the code check by content on the real merge (`ok` 1, three files under
  `bridge/src`) and on its eight synthetic answers, the verdict's selftest 34 of 34 with every row of the table firing,
  J208's margin recomputed from synthetic J208 lines, the readers' selftests; the night's reading on a synthetic match
  line per row fired exactly one row each (a candidate to its confirmation, worse and losing badly to the track's
  closing, an incomplete line to a repost), and on J206's real match line with the arm's name written over it read
  worse, not badly, the track closing. Every `check:` line was evaluated with the runner's own expression language
  over metrics computed as the runner would: on the synthetic night 49 of 49 pass; in the pilot the 18 that fail are
  exactly the ones that need the JVM (the build, the 4 games) or `origin/main`, each reading its default 0, none
  UNKNOWN. No `metrics:` line carries a `$`.
- **The build** (`./bridge/build.sh`: the lint's self-test, the lint, javac, the decision self-test): TODO(build).
- **The pilot** (4 games of the arm against `search-v1-anytime`, one worker; the mix counters on the arm's side alone,
  Forge and random rounds about equal, no `search.lcb.*`): TODO(build).
- **The gate** (`./tools/check-all.sh` on the merged tree): TODO(build).

**What is unverified.**

- **Everything that needs the JVM**: that the Java compiles; that the self-test passes; that `SearchPolicy`'s static
  initialization, which the self-test now triggers earlier (`rolloutLimits` and the counters' helpers are static
  methods of `SearchPolicy`; `explore()`'s case already initialized it later in the same run), behaves the same; that
  the pilot's batch lines carry the `search.mix.*` keys as read; and that search-v2's side and every earlier arm play
  as before, which point 3 argues from the code and the self-test's guard checks on the seats alone. TODO(build).
- **That pooling two kinds of leaf is a sensible estimator.** It is the rule chosen (point 2), not a measured one; the
  disagreement counters describe the night, they do not validate the rule.

**Residuals.**

- **One look, then the track closes.** D532 point 6 closes the track on every reading but a candidate; an arm's interval
  at 1,200 games has been about ±11.5 to ±14 Elo on these deals (J206's ±11.5, J202 (b)'s ±13.2), so a mix a few
  points better than J208's arm at the same margin could still read worse, not badly, and close the track.
- **The comparisons with J208 and earlier are across this lane's change to `bridge/src`**, which point 3 reads as
  leaving their play unchanged; they decide nothing.
- **The arm's margin was chosen on J208's two points**, about ±19 apart in their difference; it decides only the margin.
- **random-v9's argument is an argument, not a measurement** (D532's residual, unchanged).

**Follow-up.** The cube lab's 52 (`PLAN.md`): J209, the one 1,200-game match above, and the closing decision or the
confirmation point 7 says follows.
