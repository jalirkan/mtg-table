## D532 — random-v8, no new Java: `rollout=random4-them` on the margin rule, at margin 40 and at search-v2's own 20, each arm read on its own match against search-v2; random-v9, a per-rollout mix of Forge's and the random opponent's rollouts, pre-registered as the track's last iteration (amends D531)

*Branch `pc/rollout-random-v8`, off main `03d5464f` (D529's merge, on top of D531's merge `ecd9bb4e`, J206's pin).
`node tools/decisions.mjs next` printed D532. Amends D531 (its point 6, which left the step after random-v7 to "a new
decision from random-v7's counters and worst-lost games") and through it D530, D528, D527 and D523 (the iteration
loop of D523's point 10): this is point 10's seventh iteration (J199 random-v2, J201 random-v3, J202 random-v4, J204
random-v5, J205 random-v6, J206 random-v7). Two ladder players, a registry test and this file. **Nothing under
`bridge/src` changes**: `rollout=random4-them` is D531's and the margin rule is search-v2's own, so no self-test
changes, and the live seat, the atlas's random seat (D508's frozen population), D523's to D531's arms, the wire and the
protocol are unchanged: free under D509. Written after J206 read (09:45 EST); the method is the PC session's (it owns
the lab's method), and this file writes down the step it decided.*

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

- **J206's reading of random-v7** (the runner's lines, 1,200 games, read 2026-11-10 09:45 EST):
  `search-v2-rrandom4them-lcb-m40` (`01e2aba2d33e`) scored 0.4667 [0.4502, 0.4831], −23.2 Elo [−34.7, −11.7],
  **NOT SHOWN, worse, not badly**, errors 0 and timeouts 0; SIGNAL, the arm minus J204 (b)'s `policy-outlet` on the
  same deals, **+61.2 [42.1, 80.3] (±19.1), SIGNAL SHOWN** (72.5% of search-v2's own gain over the seat under it, the
  third SIGNAL SHOWN in a row: +60.0 at J204, +49.0 at J205); `signalInconclusiveCount` 0; the iteration did not lose
  badly, so the loop did not stop and the track stayed open (`newDecision` 1). Beside it, deciding nothing: the arm
  minus J205 (a) (the same rule on the same deals with both rollout seats random) +12.2 Elo on the point (about ±18),
  minus J205 (b) +11.1, minus J202 (b) −2.3. 150 blocks, 114,900,000–114,900,149, every game (`sameDeals` 1); 2.37
  hours at 7 workers; 934 ms a decision on the arm's side against 917 on search-v2's, 16.28 rollouts a decision
  against 15.45 (×1.054), 50.0 ms a rollout against 51.7.
- **J206's counters** (from `var/j206/rollouts-a.json` and J206's report; each a share of the side's decisions of that
  kind):

  | side | p changed from a pass | p to another play | p to a pass | a changed | b changed | lcb overrode / held / none | held share |
  |---|---|---|---|---|---|---|---|
  | search-v2 (J206's other side) | 7.96% | 6.36% | 4.80% | 14.7% | 16.8% | — (margin rule) | — |
  | J202 (b) `rrandom4-m40`, both seats random, margin rule | 16.41% | 10.51% | 4.82% | 14.3% | 18.0% | — | — |
  | J205 (a) `rrandom4-lcb-m40`, both seats random, lcb | 11.39% | 7.43% | 1.88% | 7.8% | 11.5% | 4,669 / 2,849 / 20,071 | 37.9% |
  | **J206 `rrandom4them-lcb-m40`, the opponent alone random, lcb** | **5.11%** | **4.17%** | **1.94%** | **8.4%** | **11.6%** | 3,034 / 1,669 / 23,615 | **35.5%** |

  J206's from-pass share reads under search-v2's: 5.11% against 7.96%, where every both-random arm ran at 11% to
  19%. D530 point 8 traced that excess to the searching seat's own random continuation (a pass hands the rest of the
  turn to a seat that plays its cards by draw, so passing was scored as worse than it was), and J206 is consistent
  with it: with the searching seat's continuation Forge's again, the share fell from J205 (a)'s 11.39% to 5.11% under
  the same rule and margin. **It was measured with lcb on**, and lcb itself took the share from 16.41% to 11.39% at
  the same margin (J202 (b) to J205 (a)), so whether the excess is gone under the margin rule is not measured yet:
  arm (a) measures it (the same proportional fall from J202 (b)'s 16.41% would put it near 7.4%). lcb still held 35.5%
  of the overrides the margin rule would have made (1,669 of 4,703), and the arm overrides Forge less than search-v2
  in every kind and direction (attack 8.4% against 14.7%, block 11.6% against 16.8%, from a pass 5.11% against 7.96%,
  to another play 4.17% against 6.36%, to a pass 1.94% against 4.80%). The counters give rates, not which overrides
  win: whether the overrides lcb holds back are ones the arm gains by is what (a) beside J206 tells, as information.
- **J206's runner status is `failed`, and the cause is a check, not the data.** 64 of its 65 checks passed and both
  run steps exited 0; the 65th was `v.v8 == null` ("no random-v8 was named"). The verdict left `v8` null as intended,
  the runner read the metric as missing, and a comparison on a missing metric reads UNKNOWN, which fails a job. Every
  number above is from the job's own `metrics.json` and report. J207's verdict writes every checked value as a 0/1
  flag or a number, its default metric line carries 0 for every flag, and no `check:` line compares with `null` or
  with a string.
- **What a ladder match runs, between J206's pin and J207's.** `git diff ecd9bb4e 03d5464f` under every path a match
  runs (D530's list: `bridge/src`, `tools/ai-bench`, `tools/ai-ladder`, `tools/cubelab/lines.ts`,
  `tools/cubelab/rng.ts`, `tools/runner/control.ts`, `tools/ai-ladder.sh`, `tools/ai-bench.sh`, `tools/config.sh`,
  `forge-home/custom-cards`, `config.json`) names three files, all D529's: `bridge/src/mtgtable/ai/Atlas.java`,
  `bridge/src/mtgtable/ai/LeakVerdict.java` (new) and `bridge/src/mtgtable/ai/DecisionSelfTest.java`. **By reading:**
  `SearchPolicy.playout` names four members of `Atlas` — `StepClock` (the copy's step clock), `BranchTimeout` (the
  `Error` it throws), `timeoutIn` and `unavailableIn` (`SearchPolicy.java:2895–3145`) — and nothing else of the atlas;
  all four sit at lines 178–241 of J206's pin's `Atlas.java`, outside every hunk of D529's diff (one javadoc hunk at
  line 88; the code hunks from line 370 on: `Branch`'s new fields, `leakCheck`, `rowsOf`, `play`'s probe, the branch's
  JSON, `arrangement`, `hiddenArrangement`, `forkDigest`), and `LeakVerdict` is named only by `Atlas` and
  `DecisionSelfTest`. **By the compiled classes** (both trees compiled on this lane by the same javac against the
  pinned jar): 239 of the 253 class files J206's pin compiles to are byte-identical on `03d5464f`, among them
  `SearchPolicy`, `SearchConfig`, `RolloutController` and its seats, `DecisionClock`, `ForkRestart` and every class the
  bench loads; of the 14 that differ, `Atlas$StepClock` and `Atlas$BranchTimeout` differ in their line-number tables
  alone (D529's javadoc moved them 8 lines; `javap -c -p` is identical), `Atlas.timeoutIn` and `Atlas.unavailableIn` are
  identical under `javap -c -p`, and `Atlas` gains a static initializer filling `DIGEST_ZONES` with six `ZoneType`
  constants, which runs once in a JVM when `Atlas` is first initialized (on a match's path, the first call of
  `timeoutIn` or `unavailableIn`: the nested classes do not initialize it) and reads no game; the other ten (`Atlas`'s own methods, `Atlas$Branch`, `$DecisionInfo`, `$Hook`, `$Unit` and the seven
  `DecisionSelfTest` classes) and the eight new classes (`Atlas$ForkProbe`, `$LeakRetestMode`, `$Replay`,
  `LeakVerdict` and its four) are reached only by the atlas and its self-tests. **So a ladder match runs the same code
  on J207's pin as on J206's**, but for that one initializer; D532's merge adds `tools/ai-ladder/players.json` alone
  under those paths. The comparisons with J206, J205, J204 and J202 are still across a code change (D529's merge) and
  are labelled so; none of them decides anything.

**Decision.**

1. **random-v8 is an iteration, not a rollout value.** Both arms seat `rollout=random4-them` exactly as D531 built it
   (the rollout's opponent random-v4, `Config.randomV4Block()`; the searching seat Forge's Default AI with the
   candidate forced first, as search-v2's rollouts play it), and both decide on **the margin rule**, search-v2's own
   (no `override` key: the best alternative's mean paired difference to Forge's answer must clear the margin), in
   place of D350's `override=lcb`. The counters say why (Context): with the them-only seating the from-pass share lcb was
   brought in for (D530) read under search-v2's with lcb on, lcb still held a third of the overrides, and the arm
   overrode Forge less than search-v2 in every kind; random-v8 measures the seating without lcb.
2. **Two arms**, kind `search`, every param search-v2's plus `rollout: random4-them`, and (a) the margin 40. Each note
   says "for measurement, never the live seat".

   | player | role | seat config | config hash |
   |---|---|---|---|
   | `search-v1-anytime` (search-v2) | the opponent | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1` | `cdd55e02a89c` (unchanged) |
   | `search-v2-rrandom4them-lcb-m40` (D531) | J206 | `…,margin=40,…,seed=0,override=lcb,z=1,anytime=1,rollout=random4-them` | `01e2aba2d33e` (unchanged) |
   | `search-v2-rrandom4-m40` (D527) | J202 (b) | `…,margin=40,…,seed=0,anytime=1,rollout=random4` | `968c9003c616` (unchanged) |
   | `search-v2-rrandom4` (D527) | J202 (a) | `…,margin=20,…,seed=0,anytime=1,rollout=random4` | `646d59a008f6` (unchanged) |
   | **`search-v2-rrandom4them-m40`** | random-v8 (a) | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=40,maxrounds=12,what=pab,seed=0,anytime=1,rollout=random4-them` | **`179ab0649521`** (new) |
   | **`search-v2-rrandom4them`** | random-v8 (b) | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1,rollout=random4-them` | **`d5381ade9e66`** (new) |

   (a) is J206's arm without `override=lcb,z=1`, **one change from J206**, and J202 (b)'s `rrandom4-m40` with the
   rollout value alone changed. (b) is (a) at margin 20 and search-v2's own seat config with `,rollout=random4-them`
   appended, as `search-v2-rrandom4` is search-v2's with `,rollout=random4`: its params carry no `margin` key, as
   `search-v2-rrandom4`'s do not, and the margin resolves to search-v2's 20. D527 raised the margin from 20 to 40
   only because the random rollouts overrode Forge at priority about twice as often as search-v2 (J201 (a);
   J202 then measured from a pass 19.2% at margin 20, its arm (a), and 16.4% at 40, its arm (b)); if that excess is
   gone under the margin rule too, which these two arms measure, search-v2's own margin is the natural setting, and
   (b) is search-v2 with nothing changed but the opponent's seat in its rollouts. The hashes are
   `registry.ts`'s (`configHash` over the kind and the resolved params), computed on the lane by `ai-ladder.sh list`;
   `web/test/ai-ladder.test.ts` holds both arms, that they differ in the margin alone, and every earlier arm's hash.
3. **The night** (drafted as J207): **two fixed D398 matches of 1,200 games on the confirm set, each arm against
   `search-v1-anytime`, `alone: yes`** (D521), (a) first, in the real ladder folder (`var/ai-ladder/match-J207a.json`,
   `match-J207b.json`). Both matchups are new names, so both take blocks 114,900,000–114,900,149, the chain's deals.
   **Each arm is read from its own match alone**: the arm and search-v2 play the same code in the same match on
   mirrored pairs of the same deals, so the reading needs no other job's line. **SIGNAL is no longer a condition**
   (SHOWN three times running: +60.0, +49.0, +61.2): each arm's Elo point minus J204 (b)'s, with D528's `hw` and
   interval, is reported as information only, with no reading of its own, no baseline replay and no SIGNAL
   INCONCLUSIVE count. **The comparisons across jobs** — each arm minus J206's arm, (a) minus J202 (b) and (b) minus
   J202 (a) (the same margins with both seats random), each arm minus J205 (a) and minus J204 (a), (b) minus (a) — are
   information only and are labelled as across a code change (D529's merge, which by the Context's reading and by
   the compiled classes leaves what a match runs unchanged) and, for a match whose blocks are not exactly
   114,900,000–114,900,149, as across deals too. **The code check, by content**: in the runner's checkout of the pin
   (HEAD), the pilot requires HEAD to have two parents with the lane tip the job names as its second (a HEAD with no
   second parent fails the check, never passes it); `git diff --quiet <lane tip> HEAD -- <paths>` to exit 0 over
   every path a match runs (the pin's tree there is the lane tip's); and the pin's diff there from this lane's base
   `03d5464f` to name `tools/ai-ladder/players.json` alone and from J206's pin `ecd9bb4e` exactly D529's three files
   and `players.json`. If main moves under a match path before this lane merges, the check fails and the job is
   redrafted on the new main with the Context's reading redone; nothing is replayed.
4. **The pre-registered rule for J207** (written on 2026-11-10 before any rated game of either arm; the night's job
   quotes it word for word). Each arm, (a) `search-v2-rrandom4them-m40` and (b) `search-v2-rrandom4them`, is read
   once against `search-v1-anytime` from its own match line by the first row of D527's table that holds, the SHOWN
   row as D530 point 7 restated it for a `random4-them` candidate: SHOWN (lower end above 0.5 and point at least +15
   Elo: Forge's opponent model leaves the rollout loop for this arm, after a 4,800-game confirmation under D519's
   readings holds it), INCONCLUSIVE (upper end at least +15 and lower end at most 0.5: confirm at 4,800 games under
   D519's readings before anything), NOT SHOWN, indistinguishable (upper end below +15, the interval contains 0, and
   its lower end is above −15 Elo: a candidate, confirmed at 4,800 games), NOT SHOWN, worse, not badly (upper end
   below 0 and at least −15 Elo: to diagnose), NOT SHOWN, loses badly (upper end below −15 Elo: to diagnose) — with
   D527's three unreached cases read as D527 reads them (a lower end above 0.5 with a point under +15 and an upper end
   at least +15 is INCONCLUSIVE; an interval wholly at or above 0 with an upper end below +15 is NOT SHOWN, no weaker,
   a candidate; an upper end of exactly 0 is worse, not badly) and its too-wide case (an interval containing 0 with its
   lower end at or below −15 is worse, not badly). "Lower end" in the SHOWN and INCONCLUSIVE rows is the match line's
   `lo`, "point" its `elo`, "interval" and "upper end" its `eloLo` and `eloHi`, the arm the match's first player. A
   match is complete when its line names the arm and `search-v1-anytime` in that order at their config hashes, says
   `complete: true`, played all 1,200 games with engine errors plus timeouts at most 60, and carries the four
   numbers. Every threshold is compared on the numbers the match lines carry: Elo in integer tenths, the score's lower
   end in integer ten-thousandths. What follows is decided only when both arms are complete; an incomplete arm gives
   no reading and is reposted alone, and the reposted arm's job applies this rule to both lines (the repost is a job of
   its own in a ladder folder of its own, whose blocks start at 114,900,000, the incomplete line kept and never
   resumed; both arms incomplete are reposted in one job, (a) first; an arm incomplete a second time is diagnosed
   before any third post). Exactly one of three
   things follows. **A confirmation**: when either arm is a candidate (SHOWN, INCONCLUSIVE, indistinguishable or no
   weaker), a 4,800-game confirmation of that arm under D519's readings, posted as its own job — of the arm with the
   higher Elo point when both are, and of (a) when the points are equal. **The track closes**: when both arms lose
   badly, the random-rollout track closes at once, without random-v9, with a closing decision. The two-losing count
   going into J207 is 0 (J205's iteration lost badly and J206's did not, so D523's stop on two successive iterations
   that lose badly cannot fire on this night); D532 closes the track on both arms losing badly anyway, because
   random-v9 is the track's last iteration and is built on the better of these two arms, and with both losing badly
   there is none to build on. **random-v9**: otherwise (both arms to diagnose and not both losing badly), random-v9,
   point 5, at the margin of the arm with the higher Elo point, 40 for (a) and 20 for (b), 40 when the points are
   equal. A confirmation that does not hold sends the track to random-v9 the same way, at the margin this rule names
   from J207's two points; when both arms were candidates the other is not confirmed in its place (its point was the
   lower on the same deals, and one confirmation for the night is the guard against two looks at it). Reported beside, deciding nothing: point 3's comparisons; each arm minus J204 (b) with
   D528's `hw` and interval; each side's overrides of Forge by kind and by direction at priority (`fromPass`,
   `toOther`, `toPass`) beside J206's, J205 (a)'s and J202's; ms, rollouts and rounds a decision; every `search.rr.*`
   per random rollout; the deal blocks; each arm's ten longest and ten quickest lost games. The self-play-from-random
   path does not open and the live seat does not change on any reading of this night.
5. **random-v9, pre-registered: a per-rollout mix, the track's last iteration.** Each candidate's rollouts alternate,
   within a round, between search-v2's own Forge rollout (both seats Forge's Default AI) and a `random4-them` rollout
   (the opponent random-v4), the first rollout Forge's, at the margin rule and the margin point 4 names. The reason:
   J194 measured more Forge rollouts of the same kind buying nothing (`search-v2-ms6000-r48`, ×3.14 search-v2's
   rollouts a decision, +1.7 Elo [−6.7, +10.2] against it, D514's COMPUTE DOES NOT PAY), so the Forge-rollout search's
   limit is what a rollout tells, not how many it draws; every random arm so far replaced Forge's opponent model with a
   random one and lost strength, and a second, differently wrong opponent model beside Forge's is the one way random
   rollouts could add information to the search rather than replace it. D530 point 8 argued against mixing per round
   in the both-random seating: it kept the searching seat's biased continuation in half the rounds, which
   `random4-them` has removed; it needs a scoring rule for two kinds of leaf, which random-v9's decision settles; and it
   cannot be read apart from its mixture, which is accepted, since random-v9 is read as a whole against search-v2.
   random-v9 needs new Java (a rollout value whose seat choice alternates by the rollout's index) and gets **its own
   decision**, at the next free number when it is written, with a `DecisionSelfTest` case for the alternation, its own
   pilot and **one 1,200-game match** against `search-v1-anytime` on the confirm set, `alone: yes`, read under point
   4's table.
6. **The closing rule.** After random-v9 is read, the random-rollout track closes with a closing decision whatever it
   read, unless its arm is a candidate under point 4's table, when its 4,800-game confirmation decides: holding, the
   track reached its goal (the random opponent model is as good as Forge's for the search, Forge staying in the loop
   for the searching seat's own continuation and, under random-v9, for half the rollouts) and closes as reached, its
   closing decision saying so; failing, the track closes. A J207 candidate's confirmation that holds closes the track
   the same way, as reached, and random-v9 is not run under this rule: whether a mix is then worth a night is a new
   question with a decision of its own. **This amends two things in D530 and D531, by name.** Their "nothing closes on
   a schedule" (D530 point 7's last bullet, D531 point 6) no longer holds: the track closes after random-v9 at the
   latest, and a confirmation that holds closes it as reached where they had it "stay open". Their SIGNAL stops (NO
   SIGNAL, SIGNAL AGAINST and the SIGNAL INCONCLUSIVE count, in each rule's *The track closes* paragraph) do not apply
   from J207 on, since SIGNAL is no longer read (point 3). D523's stop on two successive iterations that lose badly
   stands. The closing decision is written from the track's
   closing draft with the counters of every iteration, and names what would reopen it (D530 point 7's list: a seating
   where the search decides the random defender's blocks; a learned rollout policy, D522's step 2 with a teacher that
   is not Forge). **The live seat is never changed by any of this**: a candidate that holds is a seat-queue row (D509),
   a separate decision.
7. **What the night's counters should show, not registered and deciding nothing.** (a)'s overrides above J206's in
   every kind (the margin rule holds none back) and near search-v2's, with its from-pass share near search-v2's 7.96%
   rather than J202 (b)'s 16.4%; (b)'s overrides above (a)'s at every kind (the lower margin), its attack overrides the
   question, since the random defender's attacks were what D527's margin suppressed (J202 (a), both seats random at
   margin 20: attack 19.9%; search-v2's, on the other side of J202 (b)'s match, 14.8%); both arms' rollouts a decision about J206's (×1.05 search-v2's).
8. **The hashes rule (D525 point 3) holds**: a config hash is the seat config's text and the code is pinned by the
   commit (D341). Both arms are new names over existing values; every earlier arm keeps its hash
   (`web/test/ai-ladder.test.ts`).

**Rejected.**

- **Keeping lcb** (`random4-them` with lcb at another margin, or at 20). J206's counters have lcb holding back a
  third of the overrides while the arm's from-pass share, the excess lcb was chosen for, already reads under
  search-v2's; lcb's two iterations read −35.4 and −34.3, then −23.2, and a third lcb arm would tune the rule before
  the seating has been measured without it.
- **One arm only, at 40.** (a) alone is the single change from J206; (b) costs one match and asks whether D527's
  margin is still needed at all. Both are registered under point 4's table, and the confirmation is the guard against
  two looks at one night, as at J205.
- **A SIGNAL condition, the successive count, or a replay of the baseline.** SIGNAL was the track's test of whether the
  random values carry anything beyond Forge's own choice, and it read SHOWN three times running on these deals; a
  fourth reading would decide nothing new, and each arm is read against search-v2 in its own match, so no
  other job's line is a condition. The difference is reported.
- **A replay of J206 on J207's pin**, for the comparisons across D529's change. The comparisons decide nothing, and the
  Context shows by reading and by the compiled classes that a match runs the same code on both pins.
- **random-v9 now, without random-v8.** random-v8 is configuration only and tests the plain reading of J206's counters;
  random-v9 needs Java, a self-test and a scoring choice, and its margin is what random-v8 measures.
- **An open-ended track** (D530's rejection of "a last iteration … whatever it reads" as a schedule, and D531 point 6's
  "nothing closes on a schedule"). Reversed here, deliberately: seven iterations and eleven arms have produced no
  candidate, the best three arms (J202 (b) −20.9, J206 −23.2, J204 (a) −24.4) sit within 4 Elo of one another on
  the same deals, each interval about ±12 to ±14 wide and wholly under 0, across three rules (the margin at 40 and at
  60, lcb) and both seatings: no change since J202 (b) has moved the point. random-v9 is the one construction left
  that could add information rather than replace it; if it does not, the evidence a reopening needs is written
  down, and the lab's nights go to other questions.
- **`random4-them` at margin 60.** J204 measured 60 against 40 on `random4` (−24.4 against −20.9) and
  the higher margin read no better; nothing in J206 asks for it.
- **Checking an absence with `== null`** in J207's job (J206's `failed`, Context). Every checked metric is a 0/1 flag
  or a number.

**Measured.**

- `web/test/ai-ladder.test.ts` (50 tests, 50 passed, `node --test`): (a)'s raw params are search-v2's plus margin 40
  and `rollout: random4-them`, its resolved params J206's arm's but `override`, its seat config J206's arm's with
  `override=lcb,z=1` removed and J202 (b)'s with the rollout value alone changed, hash `179ab0649521`; (b)'s raw params
  are search-v2's plus `rollout: random4-them`, its margin resolves to 20, its seat config search-v2's with
  `,rollout=random4-them` appended and J202 (a)'s with the rollout value alone changed, hash `d5381ade9e66`; the two
  differ in the margin alone; neither carries `override=` or `z=`; D527's to D531's arms, `rrandom-self`,
  `policy-outlet` and search-v2 keep their hashes.
- **The build** (`./bridge/build.sh` on the lane, 09:47 EST, no lab job running, the scenery painter on the GPU
  beside it): the lint's self-test (33 rules, 79 firing cases), the lint (96 files under `bridge/src`, 3 under
  `tools/`), javac, `decision selftest: 371 check(s), 0 failure(s)` (D531's 352 and D529's 19), `build OK`. Nothing
  under `bridge/src` changed; the build is the pilot's sanity check.
- **The pilot** (`./tools/ai-ladder.sh match <arm> search-v1-anytime --games 4 --batch-pairs 1 --jobs 1 --purpose pilot
  --dir var/pilot-rrandom8/<arm> --experiments var/pilot-rrandom8/experiments.jsonl --out
  var/pilot-rrandom8/<arm>/match.json`, (a) 09:49–09:51, (b) 09:51–09:53 EST, one worker each, the same deal, block
  114,900,000; read with J206's `rollouts.cjs`):

  | arm (4 games each) | score | errors, timeouts | ms a decision, arm / search-v2 | decisions searched, arm / search-v2 | changed Forge, arm | rollouts a decision, arm / search-v2 | random rollouts, arm / search-v2 | lcb counters, arm / search-v2 |
  |---|---|---|---|---|---|---|---|---|
  | (a) `search-v2-rrandom4them-m40` | 1–3 | 0, 0 | 652 / 668 | 90 / 93 | 11 (p 8/52, a 2/27, b 1/11) | 17.36 / 16.53 (×1.05) | 1,576 / 0 | none / none |
  | (b) `search-v2-rrandom4them` | 2–2 | 0, 0 | 666 / 670 | 95 / 97 | 12 (p 8/56, a 3/28, b 1/11) | 16.58 / 16.32 (×1.02) | 1,591 / 0 | none / none |

  Each match line names its arm at the hash above against `search-v1-anytime` at `cdd55e02a89c`. Every batch line's
  config A ends `margin=40,maxrounds=12,what=pab,seed=0,anytime=1,rollout=random4-them` for (a) and `margin=20,…`
  for (b), and config B is search-v2's (`margin=20`, no rollout value); the arm's side counts its random rollouts
  (466, 386, 401 and 323 in (a)'s games, 445, 373, 450 and 323 in (b)'s) and its guardrails fire (`search.rr.v2.*`
  1,363 and 1,476, `v3.goodBlock` 24 and 12, no `v4.` fire on this deal), 0 random-seat failures, 0 rollout errors, 0
  step caps; **no `search.lcb.*` key on either side of either match** (the margin rule); search-v2's side carries no
  `search.rr.*`. One `unmappable` fallback on each side of each match, 0 budget fallbacks. The pilot is a liveness
  check, not a strength reading.
- **J207's draft, dry-run** (in the session scratchpad, not posted). Its pilot blocks ran end to end (10:09–10:16
  EST) in a throwaway detached worktree of `03d5464f` with this lane merged into it `--no-ff` (a local merge, never on
  a branch, removed after), with J206's, J205 (a)'s, J204's and J202's lines copied in from the lab host: the build
  (`decision selftest: 371 check(s), 0 failure(s)`), the bench self-test and the registry test; the six players and
  both arms' seat configs and hashes as point 2 says; **the code check by content passed on the real merge** (two
  parents, the second the lane tip; the tree under every match path the lane tip's; `players.json` alone since
  `03d5464f`; D529's three files and `players.json` since `ecd9bb4e`) and its six synthetic cases each read as
  meant; the verdict's selftest 39 of 39 (every branch of point 4, D527's table at each edge in integers, an
  incomplete arm holding back what follows, every checked value a number); J206 re-read worse, not badly; the
  readers' selftests; and 4 games of each arm (2–2 and 2–2, 0 errors, 1,318 and 1,342 random rollouts on the arm's
  side, none on search-v2's, no `search.lcb.*` on either side, all 4 lines' configs exactly the arm's and
  search-v2's). `tools/runner.sh check` lints the draft clean, and with the metrics of that pilot and of six
  synthetic nights (a candidate in (a); both candidates, (b) higher; both losing badly; random-v9 at 40, at 40 on a
  tie, and at 20), each written by the draft's own `metrics:` lines over files the real verdict wrote, passes every
  check but `merged == 1` (the local merge is not on `origin/main`); the report block ran on one of them.

**What is unverified.**

- **That the margin rule over `random4-them` plays as read beyond four games.** Both arms ran clean on one deal; the
  margin rule's verdict is search-v2's own code, and `random4-them` ran J206's 1,200 games. J207's 2,400 games and its
  job's checks are the wider run.
- **That no class a match loads at run time but not by name differs.** The Context's comparison covers every class
  file under `bridge/out`; the jar is the pinned one (`check-forge.sh`) on both pins.

**Residuals.**

- **Two looks at one night.** Two registered arms, either of which can send the track to a confirmation; the 4,800
  games are the guard, as at J205.
- **The margin of random-v9 is chosen on two points about ±19 apart in their difference**; the choice decides only
  random-v9's margin, not whether it runs.
- **The cross-job numbers are across a commit** (D529's merge) whose effect on a match the Context shows to be one
  static initializer; they are labelled, and decide nothing.
- **random-v9's argument is an argument, not a measurement**: J194 shows more of the same rollouts buys nothing; it
  does not show that a mixed opponent model buys something. One 1,200-game match reads it, then the track closes.

**Follow-up.** The cube lab's 51 (`PLAN.md`): J207, the two 1,200-game matches above, and what point 4 says follows.
