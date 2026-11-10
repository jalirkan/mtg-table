## D530 — random-v6, no new rollout logic: D350's `override=lcb` on `random4` at margins 60 and 40, both registered arms, the one at J204's `v6Margin` deciding SIGNAL, read against search-v2 and against J204's `policy-outlet` on the same deals; random-v7 pre-registered as `random4-them` (amends D528)

*Branch `pc/rollout-random-v6`, off main `137b2bf6` (D528's merge). `node tools/decisions.mjs next` printed D529,
which another lane holds tonight; this file takes D530 (D200: a gap is allowed). **Merge order:** D530 merges alone,
first, and J205 is pinned to D530's own merge commit (first parent `137b2bf6`); D529's lane merges after it. Amends
D528 (random-v5, its points 6–8) and through it D527, D525 and D523 (the iteration loop of D523's point 10): this is
point 10's fifth iteration, random-v6 (J199 random-v2, J201 random-v3, J202 random-v4, J204 random-v5), the one D528
point 8 pre-registered. Two ladder players, one existing rollout value and one existing override rule at two margins;
tests and this file. **Nothing under `bridge/src` changes** — `override=lcb` is D350's, in `SearchConfig`,
`SearchPolicy.Report.verdict` and the anytime loop since 2026-10-03 — so no self-test changes either, and the live
seat, the atlas's random seat (D508's frozen population), D523's to D528's arms, the wire and the protocol are
unchanged: free under D509.*

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
  | random-v5 (J204 a) | `search-v2-rrandom4-m60` | the override margin 40 → 60 | TODO(J204): J204 (a)'s Elo [eloLo, eloHi] | TODO(J204): its D527 reading |
  | random-v5 (J204 b) | `policy-outlet` (the baseline) | search-v2's seat, the search off | TODO(J204): J204 (b)'s Elo [eloLo, eloHi] | (no reading of its own) |

- **J204 read random-v5** (the runner's lines, 1,200 games each): TODO(J204): (a) `search-v2-rrandom4-m60`'s score,
  Elo and D527 reading, errors and timeouts; (b) `policy-outlet`'s score and Elo; SIGNAL (a) − (b) = TODO(J204): diff
  [lo, hi] (±hw), the reading (SIGNAL SHOWN or SIGNAL INCONCLUSIVE: either keeps the track open on the margin/LCB
  line, D528 point 6); `signalInconclusiveCount` TODO(J204): 0 or 1; (a) − J202 (b) = TODO(J204): `marginStep`, so
  **`v6Margin` = TODO(J204): 60 or 40**, and **the deciding arm is TODO(J204): `search-v2-rrandom4-lcb-m60` or
  `-lcb-m40`** (point 2). This file is written for the case the job's report names `v.iterate` 1 (the arm to diagnose,
  the track open); a candidate (a) goes to its 4,800-game confirmation instead, and a closed track to the closing
  decision D528 point 6 names (written from the track's closing draft; D529, the number D528 expected, is another
  lane's since), and then this decision is not merged.
- **What D528 point 8 fixed, and what is left to fix here.** random-v6 is D350's `override=lcb` — the paired
  difference's lower bound, `mean_d − z·se_d`, of the best candidate's per-round difference to Forge's answer must
  clear the margin, over at least 3 paired rounds — on `random4`, at `v6Margin`; one change from J204 (a) when
  `v6Margin` is 60 (the verdict's rule), one from J202 (b) when it is 40. D528 left three things to this file: z, the
  second margin and the night. **z is D350's registered value, 1** (D350: "`override=lcb` (with `z`, default 1)"; the
  ladder's `z` param defaults to `'1'`, `kinds.ts`), not tuned. The second margin is played beside the deciding one
  as a registered arm of its own (point 3).
- **The code composes as D350 says** (read, not assumed). `SearchConfig.parse` takes `override` and `rollout` as
  independent keys; the rollout's seats are chosen by `rolloutRandomUs()` / `rolloutRandomThem()` /
  `rolloutRandomSeat()` (`random4`: both seats, `Config.randomV4Block()`) and passed to `rollout(…)`, which never reads
  the override rule; the verdict is `SearchPolicy.Report.verdict(lcb, z, margin, rep, best, rounds)`, which with `lcb`
  returns Forge's answer when the best's paired rounds are under `LCB_MIN_ROUNDS` (3) or its `seDiff` is NaN and
  otherwise overrides when `diffLeaf[best] − z·seDiff[best] > margin` (`SearchPolicy.java:416–431`). In the anytime
  loop (`searchAnytime`) the rule is `lcbFor(kind)` = `cfg.lcb` for p, a and b, `best` is `Anytime.best` (the highest
  paired difference among the best-covered candidates) and `rounds` that candidate's paired rounds
  (`Anytime.paired`); `seDiff` is the sample sd of the paired differences over √n (`Report.fillStats`). Nothing in the
  budget, the rounds, the pruning or the racing reads `lcb` or `margin`. So an `lcb` arm uses the same rollout procedure
  as its margin arm and overrides only where its margin arm's verdict would and the evidence is at least one standard
  error beyond it. Each decision counts `search.lcb.overrode`, `search.lcb.held` (the best's mean clears the margin
  and its lower bound does not: an override the margin arm makes and this one refuses) or `search.lcb.none` on the
  batch lines, and the decision report says `rule lcb margin <m> z 1.00`.
- **Are J204 (b)'s deals provably this night's?** Yes, under two conditions the job checks. (1) The deal function:
  `ai-ladder.sh match` gives a batch the matchup's next unused block from the host's match base, 114,900,000
  (`cmdMatch`, `session.spec`, `nextBseed`), counting blocks per unordered matchup **by name** (`mkey`); both lcb arms
  are new names, so each takes 114,900,000–114,900,149 as `policy-outlet` did; a block's deck pairs are
  `batchPairs(bseed, nPairs, per)`, a fixed function of the block and the set, and its games' seeds are the bench's
  `--seed <bseed>` (`bench.ts`); the set, `tools/ai-bench/pairs-confirm.txt`, and its 60 decks are all under
  `tools/ai-bench/` (unchanged since D340's `20125168`). So the same blocks on the same code and set are the same deals.
  The pilot checks the code and the set: `git diff --name-only 137b2bf6 <pin> --` over everything a ladder match runs
  — `bridge/src`, `tools/ai-bench` (with the set and its decks), `tools/ai-ladder` (`cli.ts` and every module it
  imports), the three modules outside it that the ladder imports (`tools/cubelab/lines.ts`, `tools/cubelab/rng.ts`,
  `tools/runner/control.ts`), `tools/ai-ladder.sh`, `tools/ai-bench.sh`, `tools/config.sh` (which `ai-ladder.sh`
  sources: each worker's Forge home), `forge-home/custom-cards` (D14's overlay, copied into each home) and
  `config.json` (the jar's path) — lists `tools/ai-ladder/players.json` alone. J204's pin is `137b2bf6`, and with D530
  merged alone first and J205 pinned to that merge, the list is this lane's own; it also makes search-v2 the same code
  on both nights. (2) The blocks actually played: J204 (b) played 150 blocks, 114,900,000–114,900,149, every
  game (`var/j204/seeds-b.json`, TODO(J204): its `blocks`, `min`, `max`, `games`), and J205 (a) does too
  (`var/j205/seeds-a.json`; a memory retry would move it). The verdict reads both.
  **If J204 (b)'s seeds file does not show exactly those blocks**, or main has moved under `bridge/src`,
  `tools/ai-bench` or the ladder's code when J205 is pinned, the baseline is not on these deals, and J205 is posted
  with its match (b) replaced: `policy-outlet` against `search-v1-anytime`, 1,200 games, `--dir var/ai-ladder-j205b`
  (a ladder folder of its own on the same host, so its blocks start at 114,900,000), in place of the other margin's match,
  and SIGNAL reads (a) against it. Decided here, so no choice is left for the night.

**Decision.**

1. **random-v6 is an iteration, not a rollout value.** No guardrail changes, so there is no `random5`; both arms seat
   `rollout=random4` exactly as D527 built it.
2. **Two arms**, kind `search`, every param search-v2's plus `rollout: random4`, `override: lcb`, `z: '1'` and the
   margin. Each note says "for measurement, never the live seat".

   | player | role | seat config | config hash |
   |---|---|---|---|
   | `search-v1-anytime` (search-v2) | the opponent | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1` | `cdd55e02a89c` (unchanged) |
   | `search-v2-rrandom4-m60` (D528) | J204 (a) | `…,margin=60,…,anytime=1,rollout=random4` | `216e66d89fe3` (unchanged) |
   | `search-v2-rrandom4-m40` (D527) | J202 (b) | `…,margin=40,…,anytime=1,rollout=random4` | `968c9003c616` (unchanged) |
   | `policy-outlet` (D310) | J204 (b), the baseline | `Default+outlets` | `e350d94649a4` (unchanged) |
   | **`search-v2-rrandom4-lcb-m60`** | the lcb arm at 60 | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=60,maxrounds=12,what=pab,seed=0,override=lcb,z=1,anytime=1,rollout=random4` | **`d6d75fdefd25`** (new) |
   | **`search-v2-rrandom4-lcb-m40`** | the lcb arm at 40 | the same with `margin=40` | **`98eea870967e`** (new) |

   Each lcb arm's seat config is its margin arm's with `override=lcb,z=1` where `SearchConfig.toString` prints it
   (after `seed`, before `anytime`); its resolved params are the margin arm's plus `override: lcb` (`z` at its default
   is out of the hash, as every default is). `web/test/ai-ladder.test.ts` holds all of it.
   **The deciding arm** is the one at `v6Margin` (D528 point 8: 60, unless J204 (a)'s Elo point minus J202 (b)'s is
   below 0, then 40): TODO(J204): `search-v2-rrandom4-lcb-m60` or `-lcb-m40`. When it is `-lcb-m60` it is one change
   from J204 (a) (the rule, at the same margin); when it is `-lcb-m40`, one change from J202 (b). Two things are the
   deciding arm's alone: SIGNAL is read on it (point 5), and it is the arm random-v7 inherits its rule from (point 7).
3. **The other margin is a registered arm too.** Both lcb arms are read under D527's table, unamended: a candidate
   from **either** arm gets its 4,800-game confirmation under D519's readings, as its own job (the confirmation is the
   guard against two looks at one night), and the iteration loses badly only when **every** arm it registered does —
   both (D527 point 7). The other margin is not read for SIGNAL: its difference to J204 (b) and to (a) (the margin
   under lcb, about ±19) is reported beside.
4. **The night** (drafted as J205): (a) the deciding arm, then (b) the other margin, each a fixed D398 match of
   **1,200 games on the confirm set against `search-v1-anytime`, `alone: yes`** (D521), in the real ladder folder.
   Both matchups are new, so both take blocks 114,900,000–114,900,149, J204's deals. **The baseline is not replayed**:
   SIGNAL reads J204 (b)'s match line on the host (`var/ai-ladder/match-J204b.json`), on the same deals by the Context's
   two conditions, unless they fail, when (b) is the replay (Context).
5. **The pre-registered rule for J205** (written on 2026-11-10 before any rated game of either arm; the night's job
   quotes it word for word). Three readings, each from the match lines alone.

   *First, D527's table for each arm*, unchanged, exactly as D528 point 6 states it: each lcb arm against
   `search-v1-anytime`, read once by the first row that holds — **SHOWN** (lower end above 0.5 and point at least +15
   Elo: Forge leaves the rollout loop for this arm, after a 4,800-game confirmation under D519's readings holds it),
   **INCONCLUSIVE** (upper end at least +15 and lower end at most 0.5: confirm at 4,800 games under D519's readings
   before anything), **NOT SHOWN, indistinguishable** (upper end below +15, the interval contains 0, and its lower end is
   above −15 Elo: a candidate, confirmed at 4,800 games before it replaces Forge in the loop), **NOT SHOWN, worse, not
   badly** (upper end below 0 and at least −15 Elo: diagnose and iterate), **NOT SHOWN, loses badly** (upper end below
   −15 Elo: the same, the principle's cheap path in doubt) — with D527's three unreached cases read as D527 reads them
   (a lower end above 0.5 with a point under +15 and an upper end at least +15 is INCONCLUSIVE; an interval wholly at or
   above 0 with an upper end below +15 is NOT SHOWN, no weaker, a candidate; an upper end of exactly 0 is worse, not
   badly) and its too-wide case (an interval containing 0 with its lower end at or below −15 is worse, not badly).
   "Lower end" in the SHOWN and INCONCLUSIVE rows is the match line's `lo`, "point" its `elo`, "interval" and "upper
   end" its `eloLo` and `eloHi`, the arm the match's first player.

   *Second, SIGNAL*, D528's, with J204's baseline, on the deciding arm (a) alone: `diff` = (a)'s Elo point minus J204 (b)'s (`policy-outlet` against
   `search-v1-anytime`, its own match line), `hw` = √(((a.eloHi − a.eloLo)/2)² + ((b.eloHi − b.eloLo)/2)²), the
   interval [`diff − hw`, `diff + hw`]; read only when (a) is complete, J204 (b)'s line is complete by D528's test (the
   two players in that order at `e350d94649a4` and `cdd55e02a89c`, `complete: true`, 1,200 games, errors plus timeouts
   at most 60, the four numbers) and both played exactly blocks 114,900,000–114,900,149, 150 blocks, every game:

   | reading | when | what it decides |
   |---|---|---|
   | **SIGNAL SHOWN** | `diff` ≥ +15 and `diff − hw` > 0 | the random values under lcb carry signal beyond Forge's choice: the track stays open |
   | **SIGNAL AGAINST** | `diff` ≤ −15 and `diff + hw` < 0 | worse than no search at all: the track closes |
   | **NO SIGNAL** | `diff − hw` ≤ 0 ≤ `diff + hw` and \|`diff`\| < 15 | no signal under lcb at margin `v6Margin` at ±15 on the point (not a finding of equivalence): the track closes |
   | **SIGNAL INCONCLUSIVE** | anything else | counted (point 6); the track stays open only if the count stays under 2 |

   *Third, the count.* **The SIGNAL INCONCLUSIVE count is of successive readings and is re-read from J204's two match
   lines**, not from J204's verdict file or this text: the verdict recomputes J204's SIGNAL from
   `var/ai-ladder/match-J204a.json` (the arm at `216e66d89fe3`) and `match-J204b.json` by D528's rule, which gives
   J204's count (its `signalInconclusive`, 0 or 1); this night's count is J204's plus 1 on SIGNAL INCONCLUSIVE and 0
   on any other SIGNAL reading, and J204's unchanged when SIGNAL is unread. **Two successive SIGNAL INCONCLUSIVE
   readings — J204's and J205's — close the track as NO SIGNAL does** (D528 point 6). J205 emits
   `signalInconclusiveCount` (0, 1 or 2) for the next job to re-read the same way. If J204's lines are not both
   complete on the host, the count is unread, and the verdict says so (no closing on it).

   *Numbers.* Every threshold above is compared on the numbers the match lines carry: Elo in integer tenths, the score's
   lower end in integer ten-thousandths (so −63.1 − (−78.1) is the +15.0 it is, not 14.999999999999993); `hw` is the
   root of those exact numbers.

   *The other margin (b)* is read under the first table, as (a) is; its difference to J204 (b) and to (a) is reported,
   not read as SIGNAL.

   *The track closes* (D523 point 10's stop, the owner told with the counters which way it went; a closing decision
   writes it from the track's closing draft with the night's numbers) on NO SIGNAL, SIGNAL AGAINST, a SIGNAL
   INCONCLUSIVE count of 2, or the loop's stop (point 6) — **unless either arm is a candidate** under the first
   reading, in which case its 4,800-game confirmation runs first and the closing waits on it (holding, the track
   reached its goal and stays open; failing, it closes as on NO SIGNAL). NO SIGNAL is worded as the table words it,
   never as equivalence. An incomplete arm gives no reading of its own and is reposted; SIGNAL needs (a), and
   random-v7 waits on both arms' readings. A complete (a) whose blocks are not exactly 114,900,000–114,900,149 (a
   memory retry) is read under the first table, but SIGNAL is unread, nothing closes and nothing iterates on it: the
   next job replays what puts the arm and the baseline on the same blocks (each in a ladder folder of its own, whose
   blocks start at 114,900,000: the arm, and the baseline too when J204 (b)'s were not those) and reads SIGNAL, the
   count and what follows by this rule.

   Reported beside, deciding nothing: (a) minus J204 (a) (the rule at margin 60, when (a) is `-lcb-m60`) or minus J202
   (b) (at margin 40, when it is `-lcb-m40`), the rule's own effect, about ±19; (a) minus the other margin arm of the
   chain; each side's overrides of Forge by kind and by direction at priority (`fromPass`, `toOther`, `toPass`) against
   J202's and J204's; `search.lcb.overrode`, `held` and `none` a decision, and `held` as a share of what the margin rule
   would have overridden; ms, rollouts and rounds a decision; every `search.rr.*` per random rollout; the deal blocks.
6. **The loop's count** (D523 point 10, D527 point 7, D528 point 7). random-v5 is an iteration that lost badly exactly
   when J204 (a) did (one random arm): TODO(J204): J204 (a)'s upper end and whether it is below −15. random-v6
   registers two arms, so it loses badly exactly when both do (each complete, each upper end below −15). **The loop
   stops** when both of J205's arms lose badly and J204 (a) lost badly, all read from the match lines
   (`var/ai-ladder/match-J204a.json` at `216e66d89fe3`, complete by D528's test, `eloHi < −15`).
7. **What follows each case, decided now.**
   - **A candidate, from either arm** (SHOWN, INCONCLUSIVE, indistinguishable or no weaker): its **4,800-game
     confirmation** under D519's readings, posted as its own job; a closing waits on it (point 5), and random-v7 waits
     too.
   - **The track closes** (point 5's four ways, no candidate): no random-v7; the closing decision names what
     would reopen it, the closing draft's list (a seating where the search decides the random defender's blocks; a
     learned rollout policy, D522's step 2 with a teacher that is not Forge) **plus** point 8's finding, which is the
     evidence a reopening would start from.
   - **Both arms to diagnose with the track open**: **random-v7 is pre-registered here, one change:
     `rollout=random4-them`** — the rollout's *opponent* seat plays random-v4 (`Config.randomV4Block()`), the
     *searching* seat plays its own continuation as search-v2's rollouts do (Forge's Default AI) — on the deciding
     arm's verdict unchanged (`override=lcb,z=1` at `v6Margin`): `search-v2-rrandom4them-lcb-m<v6Margin>`. It is the
     seam's existing seat choice (`rolloutRandomUs()` false, `rolloutRandomThem()` true; `random-self` is the reverse)
     under a new rollout value, so random-v7's lane adds the value (`SearchConfig`, refused by `parseLive`, the
     ladder's enum) and no guardrail. **That seating, us false and them true, has never been run or self-tested**:
     random-v7's lane must add a `DecisionSelfTest` case for it (the opponent seat random-v4 with R8 made lethal-aware,
     the searching seat no random seat at all) before its pilot. Its night: one 1,200-game match on the confirm set against
     `search-v1-anytime`, `alone: yes`, blocks 114,900,000–114,900,149, read under D527's table and SIGNAL against
     J204 (b), with the successive count carried.
   - **What a `random4-them` candidate would decide.** That the random opponent model in the rollouts is as good as
     Forge's opponent model for the search (or better); Forge stays in the rollout loop for the searching seat's own
     continuation. So D527's SHOWN row ("Forge leaves the rollout loop for this arm") does not apply to it, and is
     restated for random-v7: **SHOWN** — Forge's opponent model leaves the rollout loop for this arm, after a
     4,800-game confirmation under D519's readings holds it; the other rows, their bounds and their cases are D527's.
   - **After random-v7, only the existing stops close the track**: NO SIGNAL, SIGNAL AGAINST, two successive SIGNAL
     INCONCLUSIVE readings, two successive iterations that lose badly, or a candidate whose confirmation holds, which
     ends the loop the good way. Otherwise the next step is decided from random-v7's counters and worst-lost games in
     a new decision, as D523 point 10 has it. Nothing closes on a schedule.
8. **Why `random4-them`, from the code and the logs** (J199 to J202's batch lines on this host, read-only; the
   counts are the bench's `search.<kind>.considered` and `.changed`, and `search.p.changed.fromPass`, `.toOther`,
   `.toPass`):

   | arm (each against search-v2) | p changed from pass | p changed to another play | p changed to pass | a changed | b changed |
   |---|---|---|---|---|---|
   | search-v2 (the other side of J202 b) | 8.15% | 6.27% | 4.65% | 14.8% | 19.5% |
   | J199 (a) random-v2, both seats, margin 20 | 19.4% | 12.3% | 7.6% | 21.3% | 22.1% |
   | J199 (b) random-v2, **searching seat only** (Forge the opponent), margin 20 | 19.0% | 12.4% | 8.0% | 15.8% | 25.3% |
   | J202 (a) random4, both seats, margin 20 | 19.2% | 12.4% | 7.9% | 19.9% | 22.1% |
   | J202 (b) random4, both seats, **margin 40** | **16.4%** | **10.5%** | 4.82% | 14.3% | 18.0% |

   - **The excess left after the margin is at priority, and it is about acting.** At margin 40 the arm's attack, block
     and to-pass overrides sit at search-v2's rates (14.3% against 14.8%, 18.0% against 19.5%, 4.82% against 4.65%).
     Its priority overrides stay +12.7 points above search-v2's (31.7% of priority decisions against 19.1%): about two
     thirds of that from a pass to a play (16.4% against 8.15%, ×2.01, +8.3 points) and about a third from one play to
     another (10.5% against 6.27%, ×1.68, +4.2). Noise inflates every direction a margin can cut, and the margin cut
     the to-pass excess to nothing; what it left is the random values rating acting now above passing, and one play
     above Forge's.
   - **The counts point at the searching seat's own continuation, not the opponent** (an inference from four nights'
     direction counts, which random-v7 tests). J199's `random-self` (the searching seat random, Forge the opponent)
     overrode at priority exactly as both-seats random did (from pass 19.0% against 19.4%, to pass 8.0% against 7.6%);
     what the Forge opponent changed was the attacks (15.8% against 21.3%, search-v2 14.8%) and 18.2 Elo (−25.5 against
     −43.7). A pass hands the rest of the turn to the random seat, which then plays its cards by draw — casts, targets
     and attacks drawn among the legal ones (R4 forces a drawn non-instant cast in its second main, 0.23 a rollout at
     J202 (b)) — while a play chosen now is made as the candidate says. So every "pass" is scored as a random
     continuation and every "play" partly as a chosen one, and the search prefers to act. The margin and lcb only
     suppress that; `random4-them` removes its source and keeps the random opponent, whose attack excess the margin
     already brought to search-v2's rate.
   - **The three other candidates the evidence argues against.** *More rollouts per option at the same budget*: random
     rollouts are barely cheaper on an unloaded machine (play 43.7–49.0 ms a rollout against search-v2's 49.2–53.2
     across J199–J202, copy alike at 4.2–4.9; ×0.71 in the loaded pilot, so the gap depends on the machine), so the arms
     drew only ×1.08–1.15 search-v2's rollouts a decision, and both sides spent about 890–945 ms of the 1,500 ms budget
     (the anytime loop mostly stops on its races and on `maxrounds=12` before the budget): there is little time to buy,
     a `maxrounds` raise would buy it only on the decisions near the cap (a standard error shrinks as √R, so 12 → 16
     rounds is ×0.87), and a one-sided bias does not average out. The pilot's reports put the random values' paired
     standard error at about ×2.3 search-v2's (Measured; 8 games, under load); to match search-v2's precision by rounds
     alone would take about five times its rounds, where the budget leaves well under twice. *A longer horizon*
     (`turns=1`) doubles the random continuation that is the bias's source and halves the rounds. *Mixing random with
     Forge rollouts per round* keeps the biased continuation in half the rounds, needs a new scoring rule for two kinds
     of leaf, and cannot be read apart from its mixture; `random4-them` is the mixture by seat that the evidence points
     at, one switch of an existing seam.
   - **What the night's counters should show, not registered and deciding nothing**: random-v7's from-pass overrides
     near search-v2's 8.15%, its attack overrides back above search-v2's at margin 20 and suppressed by lcb.
9. **The hashes rule (D525 point 3) holds**: a config hash is the seat config's text and the code is pinned by the
   commit (D341). Neither lcb arm is an edit of an existing one; `random4` is D527's, unchanged.

**Rejected.**

- **Replaying the baseline beside the deciding arm** (J205 (b) = `policy-outlet` again). J204 (b) is on the same deals
  by the block function and the checks the job makes; a replay would spend a night's second match on a number the
  host already has, where the second margin describes the curve the deciding arm sits on. It is the fallback when the
  two conditions fail (Context).
- **One arm only.** The second margin costs one match and tells whether lcb's gain, if any, depends on the margin. It
  is a registered arm under D527's table, and the 4,800-game confirmation any candidate needs is the guard against two
  looks at one night.
- **z = 2 or 1.645** (the ladder's other `z` values). D350 registered 1 and D528 named D350's rule; a different z
  would be a tuned value chosen after J204's numbers.
- **A `random5` rollout value for this iteration.** Nothing in the rollout changed (D528 point 1).
- **A `DecisionSelfTest` case for the lcb arms.** D527 added `configOnly("rrandom4-m40", …)` because its lane changed
  the bridge anyway; D528 added none for `-m60`, with nothing under `bridge/src` changing, and neither does this lane:
  the composition is read above, the registry test holds the seat configs, and the pilot shows `rule lcb margin <m> z
  1.00` on the engine.
- **`random4-self` for random-v7** (the searching seat random, Forge the opponent: J199 (b)'s seating on random-v4).
  J199 measured it at margin 20, where its gain was the attack overrides; at margin 40 those are already at
  search-v2's rate, and its priority overrides were the both-seats arm's. It would test the half the margin has
  already fixed.
- **Calling the second margin exploratory, counting for nothing.** A candidate it produced would then be left
  unconfirmed, and D527 point 7 counts every registered arm; the arms are both registered and the confirmation guards.
- **A last iteration, the track closing after random-v7 whatever it reads.** That would be a schedule, not a reading;
  the track's stops are the readings above.
- **Closing the track now, on J202's and J204's numbers.** D528 point 8 pre-registered random-v6 for this reading,
  and it is the only iteration that tests the verdict's noise directly.

**Measured.**

- Nothing under `bridge/src` changes; `./bridge/build.sh` (nice 19) green as on main: `lint-bridge-selftest OK: 33
  rules, 79 firing cases`, `bridge lint OK (95 file(s) under bridge/src, 3 under tools/; 33 rules)`, `decision
  selftest: 337 check(s), 0 failure(s)`, `build OK`.
- `web/test/ai-ladder.test.ts` (48 tests, 48 passed): each lcb arm's raw params are search-v2's plus the margin,
  `override: lcb`, `z: '1'` and `rollout: random4`; its resolved params are its margin arm's plus `override`; its seat
  config is its margin arm's with `override=lcb,z=1` after `seed=0`; the two differ in the margin alone; hashes
  `d6d75fdefd25` and `98eea870967e`; D527's and D528's arms, `policy-outlet` and search-v2 keep theirs.
- **The pilot**: D528's recipe, `./tools/ai-ladder.sh match <arm> search-v1-anytime --games 2 --batch-pairs 1 --jobs 1
  --purpose pilot --dir var/pilot-rrandom6/<arm> --experiments var/pilot-rrandom6/experiments.jsonl` at **nice 19**,
  4 games each on one worker (seed 114900000, the same deal for both), `-lcb-m60` first, then `-lcb-m40`, about 4 and
  4.5 minutes, **beside J204's running match** (load average about 18 on 16 threads: both sides' ms a decision are
  over J202's ~900 and their rollouts fewer, so the cost columns are not J205's). The JVMs ran with
  `JAVA_TOOL_OPTIONS=-Dmtgtable.search.reportEvents=true` (D350's event line per searched decision, which changes no
  choice) to see the rule each side used. Each match line names its arm at the hash above. Read with J205's
  `rollouts.cjs` (J204's, plus the `search.lcb.*` verdicts and the priority overrides by direction).

  | match (4 games) | side | decisions | ms a decision | rollouts a decision | rounds a decision | play ms a rollout | copy ms a rollout | overrides (priority) | lcb overrode / held / none | rollout errors |
  |---|---|---|---|---|---|---|---|---|---|---|
  | rrandom4-lcb-m60 vs search-v2 | **rrandom4-lcb-m60** | 87 | 1,111 | **15.54** (×1.34) | 6.39 | 59.8 | 7.4 | 8, 9.2% (7/52) | 8 / 5 / 73 | 0 |
  | | search-v2 | 96 | 1,122 | 11.59 | 4.86 | 83.8 | 7.6 | 12, 12.5% (9/57) | — (margin rule) | 0 |
  | rrandom4-lcb-m40 vs search-v2 | **rrandom4-lcb-m40** | 89 | 1,068 | **16.12** (×1.42) | 6.42 | 56.5 | 7.0 | 8, 9.0% (7/56) | 8 / 5 / 75 | 0 |
  | | search-v2 | 96 | 1,123 | 11.36 | 4.51 | 84.5 | 7.2 | 13, 13.5% (11/58) | — (margin rule) | 0 |

  Both matches 1–3, complete, no engine error, no timeout, no budget fallback, one `unmappable` fallback on each side
  (the decision the lcb counters do not count: 86 and 88 of 87 and 89); 0 random-seat failures; 1,392 and 1,472 random
  rollouts (both seats), R7 2.02 and 1.90, R3 1.13 and 1.13, R4 0.25 and 0.26, R8 `v3.goodBlock` 0.014 and 0.009 a
  rollout, no `v4.` fire on this deal; search-v2's side carries no `search.rr.*` and no `search.lcb.*`. **Every one of
  the arms' decision reports says `rule lcb margin 60 z 1.00`** (86 of 86) **and `rule lcb margin 40 z 1.00`** (88 of
  88), and every one of search-v2's `rule margin margin 20`. Of the decisions where an alternative led Forge's answer
  (the best paired difference above 0), the arms had 37 of 86 and 37 of 88, search-v2 16 of 95 and 19 of 95; the median
  paired standard error of that best alternative was 30 and 22 leaf points on the arms' side against 13 and 9 on
  search-v2's, at more rounds (6.4 against 4.5–4.9 a decision): about ×2.3 the noise per paired difference, from 8
  games under load, information only. The pilot is a liveness check, not a strength reading.
- **Two lanes' runs overlapped J204 (a), an `alone: yes` match, from 21:55 to 22:27 EST on 2026-11-09** (disclosed;
  neither should have): this lane's 8-game pilot (21:55–22:03) and the D529 lane's Java (its `bridge/build.sh`
  self-tests from 21:55, an atlas self-test 21:56–22:20 at nice 19, and a second short leg to about 22:26). The runner
  dropped a J204 worker under memory pressure at 21:58 (to 6 workers, swap-in 6,405/s) and again at 22:03
  (to 5), and had 7 workers again at 22:13. J204 (a) fixes `v6Margin` and enters SIGNAL; the effect is probably small
  (a wall-clock budget squeezed for a share of 1,200 games, on both sides of mirrored deals) and its sign is unknown.
  For information, a script outside the repo recomputes J204 (a)'s line without the batches whose span overlapped that
  window and says how many batches and games it left out; it decides nothing. No pilot of this lane runs beside a lab
  job again.

**Residuals.**

- **lcb's bound is per decision, not per search.** `Anytime.best` picks the best-covered candidate with the highest
  paired difference, then lcb bounds that one; the choice of the best among up to five is not corrected for, so a
  winner's curse remains, smaller than the margin rule's.
- **Fewer than 3 paired rounds never override** under lcb (`LCB_MIN_ROUNDS`), where the margin rule could. The arms'
  decisions decided on fewer than two rounds were 1.6–1.9% at J202 (`search.anytime.short`); those on exactly two are
  not counted anywhere, so how many decisions lcb holds back for want of rounds is unmeasured (`search.lcb.none`
  includes them).
- **`hw` ignores the shared deals** (D528's residual): the conservative width.
- **The baseline is one night old.** J204 (b) was played on the pin `137b2bf6`; the pilot's code check is what makes
  it this night's baseline, and a change to search-v2's code in between would make SIGNAL compare two code versions
  of the same opponent (the fallback, Context).
- **random-v7's argument rests on direction counts at margin 20 and 40**, from four nights; it predicts the counters,
  and the night reads the score, under the same table.

**Follow-up.** The cube lab's 49 (`PLAN.md`): J205, the two 1,200-game matches above, and the track's next step on
point 7.
