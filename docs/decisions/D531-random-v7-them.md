## D531 — random-v7, one change: `rollout=random4-them` — the rollout's opponent random-v4, the searching seat's own continuation Forge's — at J205's deciding arm's rule (`override=lcb`, z 1, margin 40), read against search-v2 and against J204's `policy-outlet` on the same deals (amends D530)

*Branch `pc/rollout-random-v7`, off main `1e72a8ec` (D530's merge, J205's pin). `node tools/decisions.mjs next` printed
D531. **Prepared before J205's reading and merged only on one of them**: J205's verdict says `v.iterate` 1 and `v.v7`
`search-v2-rrandom4them-lcb-m40` (both arms to diagnose, the track open: D530 point 7's third case). If J205 finds a
candidate or closes the track, this lane is shelved, unmerged, and this number stays unused (D200). Amends D530 (its
point 7, which pre-registered random-v7 word for word) and through it D528, D527 and D523 (the iteration loop of D523's
point 10): this is point 10's sixth iteration (J199 random-v2, J201 random-v3, J202 random-v4, J204 random-v5, J205
random-v6). One new rollout value, one ladder player, one self-test case, tests and this file. **Two files under
`bridge/src` change** — `SearchConfig.java` (the value, and `parseLive`'s refusal now tests either seat) and
`DecisionSelfTest.java` (the case D530 point 7 requires) — and no existing value's behaviour does: the live seat, the
atlas's random seat (D508's frozen population), D523's to D530's arms, the wire and the protocol are unchanged, so this
is free under D509. Everything that depends on J205's numbers is a marked placeholder, `TODO(J205)`, filled in when
J205 has read.*

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
  | random-v6 (J205 a) | `search-v2-rrandom4-lcb-m40` | D350's `override=lcb`, z 1, at margin 40 | TODO(J205) | TODO(J205) |
  | random-v6 (J205 b) | `search-v2-rrandom4-lcb-m60` | the same at margin 60 | TODO(J205) | TODO(J205) |

- **J205 read random-v6** (the runner's lines, 1,200 games each): (a) `search-v2-rrandom4-lcb-m40` (the deciding arm,
  `98eea870967e`) scored TODO(J205) [lo, hi], TODO(J205) Elo [eloLo, eloHi], **TODO(J205): its D527 reading**, errors
  and timeouts TODO(J205); (b) `search-v2-rrandom4-lcb-m60` (`d6d75fdefd25`) TODO(J205) Elo [eloLo, eloHi],
  **TODO(J205): its reading**; SIGNAL (a) − J204 (b) = **TODO(J205): diff [lo, hi] (±hw), its reading**;
  `signalInconclusiveCount` TODO(J205) (J204's 0, plus 1 or reset); this iteration lost badly TODO(J205) (both arms:
  TODO(J205)/TODO(J205)), so the loop count going into J206 is TODO(J205); the rule's own effect, (a) − J202 (b),
  TODO(J205). The report named `v.iterate` 1 and `v.v7` `search-v2-rrandom4them-lcb-m40`: both arms to diagnose, the
  track open — the case this file is written for and the only one on which it merges.
- **The counters D530 point 8 used, at J205** (TODO(J205), from `var/j205/rollouts-a.json` and `-b.json`; each as a
  share of the side's decisions of that kind):

  | side | p changed from pass | p to another play | p to pass | a changed | b changed | lcb overrode / held / none | held share |
  |---|---|---|---|---|---|---|---|
  | search-v2 (J202 b's other side) | 8.15% | 6.27% | 4.65% | 14.8% | 19.5% | — (margin rule) | — |
  | J202 (b) `rrandom4-m40` (margin rule) | 16.4% | 10.5% | 4.82% | 14.3% | 18.0% | — | — |
  | J205 (a) `rrandom4-lcb-m40` | TODO(J205) | TODO(J205) | TODO(J205) | TODO(J205) | TODO(J205) | TODO(J205) | TODO(J205) |
  | J205 (b) `rrandom4-lcb-m60` | TODO(J205) | TODO(J205) | TODO(J205) | TODO(J205) | TODO(J205) | TODO(J205) | TODO(J205) |
  | search-v2 (J205 a's other side) | TODO(J205) | TODO(J205) | TODO(J205) | TODO(J205) | TODO(J205) | — | — |

  TODO(J205): one sentence on whether lcb cut the from-pass excess or only the rest; it decides nothing here, since
  random-v7 was pre-registered before J205 and is what D530 point 7 says it is.
- **What D530 point 7 fixed, and what is left to fix here.** random-v7 is "`rollout=random4-them` — the rollout's
  *opponent* seat plays random-v4 (`Config.randomV4Block()`), the *searching* seat plays its own continuation as
  search-v2's rollouts do (Forge's Default AI) — on the deciding arm's verdict unchanged (`override=lcb,z=1` at
  `v6Margin`)", one arm, `search-v2-rrandom4them-lcb-m<v6Margin>`; J204 read `v6Margin` 40, so the arm is
  **`search-v2-rrandom4them-lcb-m40`**, one change from J205 (a). D530 point 7 also fixed the night (one 1,200-game match
  on the confirm set against `search-v1-anytime`, `alone: yes`, blocks 114,900,000–114,900,149, D527's table, SIGNAL
  against J204 (b), the successive count carried), the restated SHOWN row, and what follows (only the existing stops
  close the track; otherwise a new decision from random-v7's counters). It left the lane's code, the self-test, the
  night's exact rule and the loop's count for this file.
- **The seam composes as D530 says** (read, not assumed). `SearchPolicy.playout` seats each player of a rollout's copy
  from two booleans of `Limits`, which `SearchPolicy.rollout` builds from `cfg.rolloutRandomUs()` and
  `cfg.rolloutRandomThem()` (the ranking's playouts at `SearchPolicy.java:1955` take the same two; the arm does not
  rank): the searching seat is `RecordingController` (the hint's line, never in a search), else
  `RolloutController.Random` when `randomUs`, else `RolloutController.Outlets` when `outletsUs`, else plain
  `RolloutController` — Forge's AI with the candidate forced first, which is what every search-v2 rollout seats; the
  opponent is `RolloutController.Random` when `randomThem`, else `PolicyControllerAi` with D310's outlet policy when
  `outletsThem`, else `PlayerControllerAi`. Each random seat is built with `lim.randomSeat` (`cfg.rolloutRandomSeat()`)
  and seeded `ExploreMath.seedFor(seed, RANDOM_ROLLOUT_GAME, k)`, k its index in the copy, so under `random4-them`
  the opponent's random seat draws the same stream it drew under `random4` on the same rollout seed.
  `countRandomSeats` counts `search.rr.rollouts` once per rollout that seated a random seat and sums the guardrail
  counts over the random seats, now the opponent's alone, into the searching seat's counters. The verdict
  (`Report.verdict`, `lcb`, `z`, `margin`) never reads the rollout value. So `random4-them` is the existing seat choice
  with `randomUs` false and `randomThem` true, which no value has produced before (`random-self` is the reverse).

**Decision.**

1. **One new rollout value, `random4-them`, and no guardrail.** In `SearchConfig`: it joins `ROLLOUTS` (and the
   unknown-value message); `rolloutRandomV4()` is true for `random4` and `random4-them` (so `rolloutRandomSeat()`
   returns `Config.randomV4Block()` for both: random-v2 plus R8 made lethal-aware, no R9, D527's seat unchanged);
   `rolloutRandomThem()` is true for it (through `rolloutRandomV4()`); `rolloutRandomUs()` names `random4` itself
   instead of `rolloutRandomV4()`, so it is false for `random4-them`. For every value that existed before, the three
   predicates return what they returned (`random4`: both true, V4 true; the others unchanged), and the self-tests of
   D523, D525 and D527 hold them. `parseLive` refuses a config when `rolloutRandomUs() || rolloutRandomThem()`: before
   this, `rolloutRandomUs()` alone, which was the same test while every random value seated the searching seat; now it
   also refuses `random4-them`, whose only random seat is the opponent's. Measurement only, as D523's, D525's and
   D527's values.
2. **The self-test case** (`DecisionSelfTest.rolloutRandomV4Them`, engine-free, beside D527's): `random4-them` seats
   no random seat for the searching seat and none of D390's outlet policy, and random-v4 for the opponent
   (`rolloutRandomSeat()` field for field `random4`'s: `v2`, R8, lethal-aware, no R9, epsilon 1, no close call, no
   opening); `random4` still seats both and `random-self` the searching seat alone; the `SearchPolicy.Limits` that
   `rollout` builds from it carries `randomUs` false, `randomThem` true and the lethal-aware seat, the reverse of
   `random-self`'s; its text is search-v2's plus `,rollout=random4-them`, and it differs from search-v2 and from
   `random4` in the field `rollout` alone (`configOnly`); the arm's config (`margin=40`, `override=lcb,z=1`) differs
   from `search-v2-rrandom4-lcb-m40`'s in `rollout` alone; `parseLive` refuses it and still takes `default`, `outlets`
   and `both`; an unknown value is refused naming `random4-them`. **Written while J205 held the machine alone, so
   uncompiled and unrun when this file was written**: `./bridge/build.sh` (the lint, javac, this self-test) runs before
   the pilot, on the lane, after J205.
3. **One arm**, kind `search`, every param search-v2's plus J205 (a)'s rule and the new value. Its note says "for
   measurement, never the live seat".

   | player | role | seat config | config hash |
   |---|---|---|---|
   | `search-v1-anytime` (search-v2) | the opponent | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1` | `cdd55e02a89c` (unchanged) |
   | `search-v2-rrandom4-lcb-m40` (D530) | J205 (a) | `…,margin=40,…,seed=0,override=lcb,z=1,anytime=1,rollout=random4` | `98eea870967e` (unchanged) |
   | `policy-outlet` (D310) | J204 (b), the baseline | `Default+outlets` | `e350d94649a4` (unchanged) |
   | **`search-v2-rrandom4them-lcb-m40`** | random-v7 | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=40,maxrounds=12,what=pab,seed=0,override=lcb,z=1,anytime=1,rollout=random4-them` | **`01e2aba2d33e`** (new) |

   Its seat config is J205 (a)'s with `rollout=random4-them` for `rollout=random4`, and nothing else; the hash is
   `registry.ts`'s (`configHash`), computed in node on the lane. The ladder's `rollout` enum (`tools/ai-ladder/kinds.ts`)
   takes the value. `web/test/ai-ladder.test.ts` holds all of it, and that `-lcb-m60` has no random-v7 arm: D530 point 7
   names one arm, at `v6Margin`.
4. **The night** (drafted as J206): one fixed D398 match of **1,200 games on the confirm set against
   `search-v1-anytime`, `alone: yes`** (D521), in the real ladder folder, `var/ai-ladder/match-J206a.json`. The matchup
   is new, so it takes blocks 114,900,000–114,900,149, J204's deals. **The baseline is not replayed**: SIGNAL reads
   J204 (b)'s match line, as J205 did, under D530's two conditions with condition (1) restated for this lane, which is
   the first since D528 to change code a match runs. **(1) The code.** The pilot lists `git diff --name-only 137b2bf6
   <pin>` over everything a ladder match runs (D530's list: `bridge/src`, `tools/ai-bench`, `tools/ai-ladder`,
   `tools/cubelab/lines.ts`, `tools/cubelab/rng.ts`, `tools/runner/control.ts`, `tools/ai-ladder.sh`,
   `tools/ai-bench.sh`, `tools/config.sh`, `forge-home/custom-cards`, `config.json`) and requires it to be exactly this
   lane's four files: `tools/ai-ladder/players.json`, `tools/ai-ladder/kinds.ts`,
   `bridge/src/mtgtable/ai/SearchConfig.java` and `bridge/src/mtgtable/ai/DecisionSelfTest.java`. None of them changes
   what search-v2 or `policy-outlet` plays: `players.json` adds a player; `kinds.ts` adds an enum value and a doc
   string; `DecisionSelfTest` is not on a match's path; `SearchConfig`'s changes return what they returned for every
   existing value (point 1), and `parseLive` is not on the bench's path (`SeatSpec` parses with `parse`). The pilot
   also requires the arm's own build to pass the decision self-test. **(2) The blocks**: J204 (b)'s seeds file
   (`var/j204/seeds-b.json`) and J206's (`var/j206/seeds-a.json`) each show exactly 150 blocks, 114,900,000 to
   114,900,149, and every game. **If (1) fails** — main has moved under any of those paths since D530's merge, D529's
   lane included — the job is not posted as drafted: it is posted with a second match, `policy-outlet` against
   `search-v1-anytime`, 1,200 games, `--dir var/ai-ladder-j206b` (a ladder folder of its own on the same host, whose
   blocks start at 114,900,000), and SIGNAL reads (a) against that; the count and the loop are read as below. Decided
   here, so no choice is left for the night.
5. **The pre-registered rule for J206** (written on 2026-11-10 before any rated game of the arm; the night's job quotes
   it word for word). Three readings and the loop, each from the match lines alone.

   *First, D527's table*, exactly as D530 point 5 states it, with the SHOWN row restated as D530 point 7 restates it for
   a `random4-them` candidate: the arm against `search-v1-anytime`, read once by the first row that holds — **SHOWN**
   (lower end above 0.5 and point at least +15 Elo: Forge's opponent model leaves the rollout loop for this arm, after
   a 4,800-game confirmation under D519's readings holds it), **INCONCLUSIVE** (upper end at least +15 and lower end at
   most 0.5: confirm at 4,800 games under D519's readings before anything), **NOT SHOWN, indistinguishable** (upper end
   below +15, the interval contains 0, and its lower end is above −15 Elo: a candidate, confirmed at 4,800 games before
   Forge's opponent model leaves the loop), **NOT SHOWN, worse, not badly** (upper end below 0 and at least −15 Elo:
   diagnose), **NOT SHOWN, loses badly** (upper end below −15 Elo: the same, the principle's cheap path in doubt) —
   with D527's three unreached cases read as D527 reads them (a lower end above 0.5 with a point under +15 and an upper
   end at least +15 is INCONCLUSIVE; an interval wholly at or above 0 with an upper end below +15 is NOT SHOWN, no
   weaker, a candidate; an upper end of exactly 0 is worse, not badly) and its too-wide case (an interval containing 0
   with its lower end at or below −15 is worse, not badly). "Lower end" in the SHOWN and INCONCLUSIVE rows is the match
   line's `lo`, "point" its `elo`, "interval" and "upper end" its `eloLo` and `eloHi`, the arm the match's first player.

   *Second, SIGNAL*, D528's, with J204's baseline, on the arm: `diff` = the arm's Elo point minus J204 (b)'s
   (`policy-outlet` against `search-v1-anytime`, its own match line), `hw` = √(((a.eloHi − a.eloLo)/2)² + ((b.eloHi −
   b.eloLo)/2)²), the interval [`diff − hw`, `diff + hw`]; read only when the arm's match is complete, J204 (b)'s line
   is complete by D528's test (the two players in that order at `e350d94649a4` and `cdd55e02a89c`, `complete: true`,
   1,200 games, errors plus timeouts at most 60, the four numbers) and both played exactly blocks
   114,900,000–114,900,149, 150 blocks, every game:

   | reading | when | what it decides |
   |---|---|---|
   | **SIGNAL SHOWN** | `diff` ≥ +15 and `diff − hw` > 0 | the random opponent under lcb carries signal beyond Forge's choice: the track stays open |
   | **SIGNAL AGAINST** | `diff` ≤ −15 and `diff + hw` < 0 | worse than no search at all: the track closes |
   | **NO SIGNAL** | `diff − hw` ≤ 0 ≤ `diff + hw` and \|`diff`\| < 15 | no signal under lcb at margin 40 with the opponent alone random at ±15 on the point (not a finding of equivalence): the track closes |
   | **SIGNAL INCONCLUSIVE** | anything else | counted (third); the track stays open only if the count stays under 2 |

   *Third, the count.* **The SIGNAL INCONCLUSIVE count is of successive readings and is re-read from J205's and
   J204's match lines**, not from J205's verdict file or this text: the verdict recomputes J204's SIGNAL from
   `var/ai-ladder/match-J204a.json` (at `216e66d89fe3`) and `match-J204b.json` by D528's rule, which gives J204's count
   (0 or 1); then J205's SIGNAL from `var/ai-ladder/match-J205a.json` (the deciding arm at `98eea870967e`) against J204
   (b) by D530's rule, with D530's block condition on J205's (`var/j205/seeds-a.json`), which gives J205's count (J204's
   plus 1 on SIGNAL INCONCLUSIVE, 0 on any other reading, J204's when unread); this night's count is J205's plus 1 on
   SIGNAL INCONCLUSIVE and 0 on any other SIGNAL reading, and J205's unchanged when SIGNAL is unread. **Two successive
   SIGNAL INCONCLUSIVE readings — J205's and J206's — close the track as NO SIGNAL does** (D528 point 6). J206 emits
   `signalInconclusiveCount` (0, 1 or 2) for the next job to re-read the same way. If J204's two lines or J205 (a)'s
   line are not complete on the host (J205 (a) by the same test, at `98eea870967e`), the count is unread, and the
   verdict says so (no closing on it). J205's own verdict, kept unchanged in J206's, is what re-reads it.

   *The loop* (D523 point 10, D527 point 7). random-v7 registers one arm, so it loses badly exactly when that arm does
   (complete, upper end below −15). **The loop stops** when it does and J205's iteration lost badly — both of J205's
   arms complete and each with its upper end below −15, read from `var/ai-ladder/match-J205a.json` (`98eea870967e`) and
   `match-J205b.json` (`d6d75fdefd25`), complete by the same test; when they are not both complete, whether J205's
   iteration lost badly is unread and the loop does not stop on it. Going into J206 the count is TODO(J205) (J205's iteration lost
   badly: TODO(J205)).

   *Numbers.* Every threshold above is compared on the numbers the match lines carry: Elo in integer tenths, the
   score's lower end in integer ten-thousandths; `hw` is the root of those exact numbers.

   *The track closes* (D523 point 10's stop, the owner told with the counters which way it went; a closing decision
   writes it from the track's closing draft with the night's numbers) on NO SIGNAL, SIGNAL AGAINST, a SIGNAL
   INCONCLUSIVE count of 2, or the loop's stop — **unless the arm is a candidate** under the first reading, in which
   case its 4,800-game confirmation runs first and the closing waits on it (holding, the track reached its goal and
   stays open; failing, it closes as on NO SIGNAL). NO SIGNAL is worded as the table words it, never as equivalence.
   An incomplete arm gives no reading and is reposted. A complete arm whose blocks are not exactly
   114,900,000–114,900,149 (a memory retry) is read under the first table, but SIGNAL is unread, nothing closes and
   nothing follows from it: the next job replays what puts the arm and the baseline on the same blocks (each in a
   ladder folder of its own, whose blocks start at 114,900,000: the arm, and the baseline too when J204 (b)'s were not
   those) and reads SIGNAL, the count and what follows by this rule.

   Reported beside, deciding nothing: the arm minus J205 (a) (`search-v2-rrandom4-lcb-m40`, the same rule on the same
   deals with both rollout seats random: the effect of giving the searching seat Forge's continuation, about ±19); the
   arm minus J205 (b) and minus J202 (b); each side's overrides of Forge by kind and by direction at priority
   (`fromPass`, `toOther`, `toPass`) against J205's and J202's; `search.lcb.overrode`, `held` and `none` a decision,
   and `held` as a share of overrode plus held; ms, rollouts and rounds a decision; every `search.rr.*` per random
   rollout (one random seat now, so about half of J205's where both seats fired alike); the deal blocks; the arm's
   ten longest and ten quickest lost games.
6. **What follows each case, decided now** (D530 point 7's last two bullets).
   - **A candidate** (SHOWN, INCONCLUSIVE, indistinguishable or no weaker): its **4,800-game confirmation** under
     D519's readings, posted as its own job, before anything; a closing waits on it. Holding, the loop ends the good
     way (D523 point 10): the random opponent model is as good as Forge's opponent model for the search, and Forge
     stays in the rollout loop for the searching seat's own continuation — what that means for the self-play path and
     for the live seat is a separate decision (a seat-queue row, D509), never the night's.
   - **The track closes** (point 5's four ways, no candidate): the closing decision, written from the track's closing
     draft, names what would reopen it (D530 point 7's list: a seating where the search decides the random defender's
     blocks; a learned rollout policy, D522's step 2 with a teacher that is not Forge) **plus** D530 point 8's finding
     and random-v7's counters, which together are the evidence a reopening starts from.
   - **The arm to diagnose with the track open**: **no random-v8 is pre-registered here.** After random-v7 only the
     existing stops close the track (NO SIGNAL, SIGNAL AGAINST, two successive SIGNAL INCONCLUSIVE readings, two
     successive iterations that lose badly, or a candidate whose confirmation holds); the next step is decided from
     random-v7's counters and worst-lost games in a new decision, as D523 point 10 has it. Nothing closes on a
     schedule.
7. **What the night's counters should show, not registered and deciding nothing** (D530 point 8's last bullet):
   random-v7's from-pass overrides near search-v2's 8.15% (the bias D530 point 8 traces to the searching seat's own
   random continuation is gone with it); its attack overrides at or under J205 (a)'s, the random defender still the
   margin's to suppress; its rollouts a decision nearer search-v2's than J205's (the searching seat's continuation is
   Forge's AI again, which costs what it cost search-v2), so its paired standard errors nearer search-v2's too.
8. **The hashes rule (D525 point 3) holds**: a config hash is the seat config's text and the code is pinned by the
   commit (D341). `random4-them` is a new value, not an edit of `random4`; every earlier arm keeps its hash
   (`web/test/ai-ladder.test.ts`).

**Rejected.**

- **A second arm at margin 60** (`search-v2-rrandom4them-lcb-m60`). D530 point 7 registers one, at `v6Margin`; J205's
  second margin answered whether lcb's gain depends on the margin, and that question is not random-v7's.
- **`random4-them` on the margin rule** (no lcb). Two changes from J205's deciding arm; D530 point 7 keeps its verdict.
- **Replaying the baseline beside the arm.** As D530: J204 (b) is on the same deals by the block function and the
  pilot's checks; the replay is the fallback when condition (1) fails (point 4).
- **Treating this lane's `bridge/src` diff as a reason to replay the baseline.** The diff is four files, each read in
  point 4 for whether it changes what search-v2 or `policy-outlet` plays; it does not, and the pilot requires the diff
  to be exactly those files, so a change by anyone else still forces the replay.
- **Pre-registering random-v8 now.** D530 point 7 sends the step after random-v7 to its counters; naming it before
  J206 would be a schedule.
- **Leaving `parseLive`'s test at `rolloutRandomUs()`.** It would have let `rollout=random4-them` through to the live
  seat, since its searching seat is not random: a measurement-only value reaching a person.

**Measured.**

- Nothing was run on the engine: J205 held the machine alone while this lane was written, so no Java was compiled and
  no pilot played. `web/test/ai-ladder.test.ts` (49 tests, 49 passed, `node --test`): the arm's raw params are
  search-v2's plus margin 40, `override: lcb`, `z: '1'` and `rollout: random4-them`; its resolved params are J205
  (a)'s but `rollout`; its seat config is J205 (a)'s with the rollout value alone changed; hash `01e2aba2d33e`; the
  ladder's enum takes the value; no `-lcb-m60` arm; D527's, D528's and D530's arms, `rrandom-self`, `policy-outlet`
  and search-v2 keep theirs.
- TODO(build): `./bridge/build.sh` (nice 19, after J205): the lint and its self-test, javac, `decision selftest: <n>
  check(s), 0 failure(s)` (D530's build: 337; this case adds 15).
- TODO(pilot): `./tools/ai-ladder.sh match search-v2-rrandom4them-lcb-m40 search-v1-anytime --games 4 --batch-pairs 1
  --jobs 1 --purpose pilot --dir var/pilot-rrandom7 …` at nice 19, never beside a lab job: the arm's decision reports
  say `rule lcb margin 40 z 1.00`, its random rollouts are counted (`search.rr.rollouts` > 0, guardrails firing) and
  search-v2's side carries none.

**What is unverified.**

- **That the Java compiles and the self-test passes.** Written against the surrounding code (every method and field it
  calls read), never compiled. The case constructs `SearchPolicy.Limits` through its 14-argument constructor with
  three `null`s, the first such use outside `SearchPolicy`.
- **That the seating plays as read.** `playout`'s seat choice has never run with `randomUs` false and `randomThem`
  true; the self-test checks what `playout` reads, not a game. The pilot is the first run.
- **That nothing else assumed "random means the searching seat is random".** Every reader of `rolloutRandomUs()` under
  `bridge/src` was read (`parseLive`, the two `Limits` constructions); `tools/` has none. The batch counters were not
  run.
- **J205's numbers**, every `TODO(J205)` above, and so whether this decision merges at all.

**Residuals.**

- **The per-rollout guardrail counts change meaning.** Under `random4` they summed two random seats; here one. Read
  per random rollout against J205's, about half is the expected level, not a finding.
- **The two seats' compute differs again.** A Forge continuation for the searching seat costs about what search-v2's
  does, so the arm draws fewer rollouts a decision than J205's arms; the seating's effect on the score includes that.
- **`hw` ignores the shared deals** (D528's residual) and **the baseline is now two nights old**: J204 (b) on
  `137b2bf6`; condition (1) is what makes it this night's.
- **random-v7's argument rests on direction counts** (D530 point 8), from J199's `random-self` and J202's arms; it
  predicts the counters, and the night reads the score, under the same table.

**Follow-up.** The cube lab's 50 (`PLAN.md`): J206, the one 1,200-game match above, and the track's next step on point
6.
