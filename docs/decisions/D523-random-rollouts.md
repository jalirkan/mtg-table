## D523 — Rollouts played by the random seat: `rollout=random` and `random-self`, random-v2's seven guardrails from the atlas's evidence, two ladder arms, and J199's pre-registered rule with the agent's iteration loop

*Branch `pc/rollout-random`, off main `45615036` (D519's review). `node tools/decisions.mjs next` printed D522, which
the unmerged branch `pc/d522-rollout-policy` already holds (D522, expert iteration for the rollout policy, proposed),
so this lane took **D523**. Extends D312 (the search and its rollouts), D390 (`rollout=outlets`, the seam this uses),
D412 (search-v2, the ladder's `search-v1-anytime`), D451–D488 and D508 (the move atlas's random seat, its guardrails
G1–G6 and D485–D488, its frozen population), D498 (the determinizer) and D517 (the arm-and-night shape, its +15 bar).
Two ladder players, a rollout policy, tests and this file; the live seat, the atlas's random seat, the wire and the
protocol are unchanged, so it is free under D509.*

**2026-11-08**

**The principle (the owner's).** In his words: *"Yes, there are terribly useless situations that will arise from
randomized moves, but you are the agent in the loop who can recognize that, iterate to avoid it, so we waste less time
on useless data."* As the lane's brief puts it: knowledge comes from randomised exploration within reasonable bounds,
not from Forge's heuristics; the agent in the loop (us) makes the exploration smart by recognising useless lines and
ruling them out, iterating from data.

**Context.**

- **What a rollout plays is the lever left.** A search-v2 rollout is D312's: the copy is redealt, the candidate is
  forced as the searching seat's first answer, and Forge's Default AI plays both seats to the end of the turn. J194
  and J195 found the strength flat from ×0.5 to ×4 rollouts (D514, D517), and both built knobs are closed (J195
  `rank=prior` NOT SHOWN, J197 `rollout=outlets` NOT SHOWN, D519). D522 proposes a learned rollout policy; this
  decision takes the other road the principle names: take Forge's judgment out of the rollout and put guarded
  randomness in.
- **The random seat exists and is not good enough as it is.** The atlas's random seat (D451; `Explorer` with
  `ExploreMath.Config.randomSeat()`) picks uniformly among pass, each land, Forge's answer and every play it can make
  and pay for, under mechanical guardrails (G1 a land drop is always taken, G3 no repeated no-op ability, G4 the
  opening hand is kept, G5 no refused play again in its window, G6 X from 1 to the maximum, D485–D488 legal targets
  and payable costs). The play-AI review's §3d (`~/code/lab/pc-results/study/play-ai-review-2026-11-05.md`) found the
  random map names the same best option as the Forge map 0.46 of the time, with a mean rank correlation of 0.18:
  "best if both players then play at random" is not "best against a player". The atlas's own frame logs say why.
- **The evidence: what random play does that Forge does not.** I read the atlas's random branch games of J193
  (`~/code/lab/data/lab-j193/b-s*/phaseB/frames/*-random-*.jsonl.gz`, D508's population at `fe063f94`): 300 logs a
  spine drawn at random (seed 7) from each of the 13 spines, 3,900 logs, both seats. Every random decision record
  carries Forge's answer at the same decision (`explore.forge`), so each rate below has Forge's beside it on the very
  same positions. State is read from the frame the record points at (`stateSeq`); power, toughness, `tapped` and
  `attacking` are the wire's. Definitions are the counts' own; a script of the session read them, and a later
  iteration re-reads the logs the same way.

  | what random play did | random | Forge's answer at the same decisions |
  |---|---|---|
  | **lethal on board not taken**: attackers' power ≥ the opponent's life and the opponent has no untapped creature; the attack declared falls short | 486 of 1,073 (45.3%) | 3 (0.3%) |
  | **lethal attack not blocked**: the attackers' power ≥ the seat's life and some block (one blocker an attacker, printed power, no trample) leaves it alive; the blocks declared leave it dead | 417 of 1,015 (41.1%) | 32 (3.2%) |
  | **a target on the wrong side**: of the random seat's single-target redraws that differ from Forge's target, the share on the other side of the table from Forge's (Fireblast at its own face or creature 52 times, Incinerate 19, Terminate 12, Stab 11; Blessing on the opponent's creature 17) | 1,345 of 4,021 (33.4%): 765 its own side, 580 the opponent's | — |
  | **nothing cast in main 2**: own second main phase, stack empty, a spell castable; the seat passes | 3,059 of 7,702 (39.7%) | 542 (7.0%) |
  | … and over whole turns: a turn with a castable spell at a main-phase decision in which nothing was cast | 4,286 of 16,143 turns (26.6%) | Forge would have cast at one of them in 2,401 |
  | **attacking into a losing block**: an attacker some untapped opposing creature can block, kill and survive (flying respected), when the attack is not lethal | 4,843 of 17,229 attackers (28.1%) | 2,005 of 22,199 (9.0%) |
  | **chump blocks**: a blocker that dies without killing its attacker, when the attack was not lethal | 2,532 of 6,605 blocks (38.3%) | 616 of 4,849 (12.7%) |
  | **answering itself**: a priority with a stack holding only the seat's own items; the seat plays something more (6,129 of them activations: Circle of Protection: Black alone 1,370 of 7,705 random activations in a 780-log draw) | 6,458 of 11,799 (54.7%; 1,300 logs) | 121 (1.0%) |

  Two of the owner's examples are not on this list on the evidence. **Discarding to hand size at random** does not
  happen: the cleanup discard is not one of the random seat's decisions (it randomises priority, attack, block and
  single targets; the rest stay Forge's), and the 145 card-choice records in the 3,900 logs are Forge's answers.
  **Sacrificing its own permanents to no end** has no measurement of its own here: sacrifice-cost activations (Food
  232, Hidden Stockpile 222, Blood 68, Yahenni 67 in the 780-log draw) are mostly answers to its own stack, which R7
  removes; what is left is for the first iteration to read (below).

**Decision.**

1. **The seam: `rollout=random` and `rollout=random-self`, two more values of D390's `rollout` key.**
   `SearchPolicy.playout` seats the copy's controllers; under `rollout=random` both seats get
   `RolloutController.Random`, under `random-self` only the searching seat does and the opponent keeps Forge's
   `PlayerControllerAi`. The searching seat's candidate is forced first exactly as before (`RolloutController.Forced`,
   D470's combat rules included), then the random seat plays. `SearchConfig.rolloutRandomUs()` /
   `rolloutRandomThem()` say which; `rolloutOutletsUs()` now names `outlets` and `both` explicitly (it was "not
   default", which would have turned the outlet policy on under the new values). The random seats' draws are seeded
   from the rollout's seed (`ExploreMath.seedFor(seed, -523, seat)`), so every candidate of a round meets the same
   random opponent and the same random self: common random numbers, as the redeal and the engine stream already are.
   The prior's playouts (`rank=prior`) seat the same controllers. The leaf, the horizon, the budget, the race and
   every other knob are search-v2's.
2. **The rollout's random seat is `random-v2`**: `Explorer` with `ExploreMath.Config.randomV2()`, the atlas's random
   seat with every one of its guardrails plus seven of D523's, and **it never asks Forge's AI for an answer**: a
   priority is the random pick among pass, each land and every play it can make and pay for (the listing's Forge
   answer is null), an attack and a block are drawn from an empty declaration. That is the principle (Forge's
   judgment out of the loop) and half of the cost (the atlas's seat runs Forge's whole priority, attack and block AI
   before discarding most of its answers). Mana payment, costs, triggers' targets and effects' choices stay Forge's,
   as for every random seat.
3. **The seven guardrails** (`RolloutGuards`, each a one-line predicate on the random seat's choice, each counted
   under its `v2.` name; the evidence is the table above):

   | rule | the check | the failure it prevents | counter |
   |---|---|---|---|
   | **R1** lethal attack | the damage the creatures that may attack deal through no untapped creature of the defender that could block them (`CombatUtil.canBlock`, `ComputerUtilCombat.damageIfUnblocked`) is at least its life, and it can lose life → attack with all of them | lethal on board not taken (45.3% vs 0.3%) | `v2.lethalAttack` |
   | **R2** lethal block | unblocked, the attack kills the seat → redraw the random blocks (up to 64) until the seat's life after the attack is above 0 by Forge's arithmetic (`ComputerUtilCombat.lifeThatWouldRemain` on the declared block: unblocked attackers plus a blocked trampler's damage past its blockers); if no draw does, the most damage blocked, greedily, which need not save it | not blocking a lethal attack (41.1% vs 3.2%) | `v2.lethalBlock` |
   | **R3** target side | a harmful part (a curse; DealDamage, Destroy, LoseLife, Discard, Sacrifice) never targets the seat or its own permanents while a target on the other side is legal; a helpful one (not a curse; Pump, PutCounter, GainLife, Regenerate, Protection) never the opponent's side while one of its own is legal | removal at its own creatures, pumps on the opponent's (33.4% of redraws on the wrong side) | `v2.targetSide` (per target list it narrowed) |
   | **R4** cast something | its own main 2, the stack empty, no spell cast this turn, a `cast:` option listed that is not an instant → pass is not an option (an instant may wait for the opponent's turn, so it never forces the cast) | casting nothing with mana up and spells in hand (39.7% vs 7.0%) | `v2.castSomething` |
   | **R5** no losing attack | a rule on the attack as a set: when the drawn attack is not lethal through the defender's untapped potential blockers (the blockers take the largest attackers, the rest must reach its life) and the attackers do not outnumber those blockers, each attacker that one of them can block, destroy and survive (`canDestroyAttacker` and not `canDestroyBlocker`) is taken out; an attack that outnumbers the blockers is left whole, so a go-wide attack (two 2/2s into one 4/4) stands | attacking into a losing block (28.1% vs 9.0%) | `v2.dominatedAttacker` |
   | **R6** no chump | unless the attack is lethal (R2), judged on the assignment as a whole: with the drawn block declared, a blocker that dies (`blockerWouldBeDestroyed`) while the blockers on its attacker together do not kill it (`attackerWouldBeDestroyed`) is taken out; a gang block that kills its attacker keeps every blocker | chump blocks with nothing at stake (38.3% vs 12.7%) | `v2.chumpBlock` |
   | **R7** own stack | the stack is not empty and every item on it is the seat's own → pass | answering itself, mostly with mana-sink activations (54.7% vs 1.0%) | `v2.ownStack` |

   R1, R2, R5 and R6 read Forge's combat arithmetic (what the damage would be), never what Forge's AI would do. A
   removal that would leave a declaration illegal is not made (the drawn one stands), so a rule never produces an
   illegal answer. Everything read is on the battlefield, the stack or the seat's own (hard rule 8's reading of the
   copy: the random seat lists only its own plays and visible targets, `Explorer`'s header).
4. **Measurement only.** `SearchConfig.parseLive` (the game's seat, `MtgTable --ai-search`) refuses
   `rollout=random` and `random-self` as it refuses the bench-only `oracle=1`; the ladder and `tools/ai-bench` parse
   with `SearchConfig.parse` and take them.
5. **The counters reach the match line.** After each rollout `SearchPolicy.countRandomSeats` adds
   `search.rr.rollouts` and `search.rr.<guardrail>` (D451's names and the `v2.` ones, summed over the rollout's random
   seats) and `search.rr.failures` to the searching seat's counts (`search.prior.rr.` for the ranking's playouts), which
   a batch line already carries (`aStats.counts` / `bStats.counts`). The night reads how often each rule fired per
   rollout from those alone.
6. **The atlas's random seat is untouched** (D508's population is frozen). `Config.randomSeat()` and a job line's
   `playExplore: {random: true}` build `v2 = false`; every new branch in `Explorer` sits under `math.config().v2`, and
   with it false the draws and the code path are the old ones (`randomTarget`'s one changed test is the old one when
   the list still holds Forge's target, which it always does without R3). `DecisionSelfTest` asserts both.
7. **Two ladder players**, kind `search`, every param byte for byte `search-v1-anytime`'s (search-v2: `profile
   Default`, `outlets on`, `budgetMs 1500`, `anytime on`) plus `rollout`, which the kind already had (D390); its enum
   gains `random` and `random-self`. Each note says "for measurement, never the live seat".

   | player | rollout | seat config | config hash |
   |---|---|---|---|
   | `search-v1-anytime` (search-v2) | default | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1` | `cdd55e02a89c` (unchanged) |
   | `search-v2-rrandom` | random (both seats random-v2) | the same plus `,rollout=random` | `fb8ae32c014d` |
   | `search-v2-rrandom-self` | random-self (the searching seat random-v2, the opponent Forge) | the same plus `,rollout=random-self` | `d3aa28be73b2` |

8. **The pilot** (below, Measured): random rollouts are **not** much faster than Forge's. A random-v2 seat still asks
   the engine whether each of its plays can be made and paid for at every priority, which costs about what Forge's
   own evaluation does; R7 saves the listings it answers. Rollouts a decision went up by ×1.31 (both seats) and ×1.01
   (searching seat only) over search-v2 in the same matches (the first pilot, before the review's amendments: ×1.21
   and ×1.10).
9. **The pre-registered rule for the night that follows, J199.** These thresholds are this decision's own, written
   on 2026-11-08 before any rated game of either arm; they take D517's shape and its +15 Elo bar. J199's job quotes
   this file word for word.

   Each arm, `search-v2-rrandom` and `search-v2-rrandom-self`, plays a fixed D398 match of **1,200 games on the
   confirm set against `search-v1-anytime`, `alone: yes`** (D521: the budget is wall-clock, so contention changes
   the rollouts). Reported with each: the score and Elo with the 95% interval, ms and rollouts a decision against
   search-v2's in the same match, and each guardrail's fires per rollout, `search.rr.<rule>` over
   `search.rr.rollouts` — every rollout that seated a random seat, those the deadline cut included — summed over the
   match's games.

   *The readings and what each decides* (every arm is read once, by the first row that holds):

   | reading | when (the arm against search-v2) | what it decides |
   |---|---|---|
   | **SHOWN** | lower end above 0.5 and point at least +15 Elo | Forge leaves the rollout loop for this arm, **after** a 4,800-game confirmation under D519's readings holds it |
   | **INCONCLUSIVE** | upper end at least +15 and lower end at most 0.5 | nothing yet: confirm at 4,800 games under D519's readings before anything |
   | **NOT SHOWN, indistinguishable** | upper end below +15, the interval contains 0, and its lower end is above −15 Elo (a non-inferiority bound) | the arm is a candidate to replace Forge in the loop, confirmed at 4,800 games (the same three conditions) before it does |
   | **NOT SHOWN, worse, not badly** | upper end below 0 and at least −15 Elo | diagnose from the counters and the worst-lost games (point 10) and iterate as random-v3 |
   | **NOT SHOWN, loses badly** | upper end below −15 Elo | the same diagnosis and iteration; and the principle's cheap path — Forge out of the loop at no cost — is in doubt until a v3 recovers it |

   A NOT SHOWN whose interval contains 0 but whose lower end is at or below −15 is too wide to call: it is read as
   "worse, not badly" for the iteration and says so. A confirmed SHOWN or indistinguishable arm also opens the
   self-play-from-random path (search over random rollouts generating the games and values a later policy learns
   from, D522's step 2 with this rollout instead of Forge's). If both arms are confirmed, the one with the higher
   point is taken, `random` at a tie (no Forge in the loop at all). Any change to the live seat is a separate
   decision (a seat-queue row, D509).
10. **The iteration rule.** After J199, the agent reads the counters and the worst-lost games — the arm's lost games
   with the longest turn count and the lowest arm life at the end, the batch line's `seed` replayed with
   `--record full` into a frame log (the searched decisions' reports say which candidate each rollout preferred) —
   names the useless lines random-v2 still plays, adds or fixes guardrails (each a rule with the failure it
   prevents, the evidence and a counter, as above, in a new decision that amends this one), registers the result
   as a new arm (`random-v3`, a new name and hash; the arms above stay what they measured), pilots it and re-runs the
   same 1,200-game match **without asking the owner**, who gets each night's results. The loop stops only on a
   SHOWN or indistinguishable reading **confirmed at 4,800 games**, or on **two successive v-iterations that lose
   badly**; then the owner is told, with the counters, which way it went.

**Rejected.**

- **The atlas's random seat as it is in the rollouts** (random v1). The table: in about half of the positions where
  a game is decided in one combat it does the opposite of the obvious, and it answers itself more often than not.
  Rollout values over such play are the chaotic-line bias the review measured (0.46, ρ 0.18).
- **Offering Forge's answer among the random ones**, as the atlas's seat does. It runs Forge's whole decision at
  every priority, attack and block (the cost the pilot would otherwise save) and leans the rollout toward Forge's
  heuristics, which the principle takes out.
- **Strategy rules** (a mana curve, holding removal, a race calculator). Each guardrail removes an answer that is
  wrong on the board's arithmetic or does nothing; none chooses what is best. More than that is a policy, which is
  D522's road.
- **Changing the atlas's seat** to random-v2. D508's population is frozen; a v2 atlas is a new population and a
  separate decision.
- **`rollout=random` against a human, or as the live seat.** Measurement only until a separate decision.

**Measured.**

- `./bridge/build.sh`: the lint and its self-test unchanged and green (no new hop, no `CardView`, no thread);
  `decision selftest: 289 check(s), 0 failure(s)` (255 before; `DecisionSelfTest.rolloutRandom`: each arm's config is
  search-v2's in the field `rollout` alone, with the texts and the refusal of an unknown value; the live seat's
  rollouts stay plain Forge and `parseLive` refuses both random values; R4 quiet when the only cast is an instant; R5
  keeps a go-wide attack and drops nothing from one lethal through the blockers; R6 keeps a double block that kills; `randomSeat()` and a job line's random seat are not random-v2; each rule's engine-free
  core fires where it must and is quiet where it must not, with its counter); `build OK`.
- `web/test/ai-ladder.test.ts`: each arm's raw params are search-v2's plus `rollout`, its resolved params search-v2's
  but that, its seat config search-v2's with `,rollout=random` / `,rollout=random-self` appended, the hashes above,
  search-v2's and D517's routlets' unchanged. `npm --prefix web test` green (node --test 1,880 passed of 1,890, 0
  failed; vitest 161 of 161); `tsc --noEmit` clean.
- **The pilot**: `./tools/ai-ladder.sh match <arm> search-v1-anytime --games 2 --batch-pairs 1 --jobs 1 --purpose
  pilot --dir var/pilot-rrandom/<arm>` at nice 10, 4 games each, while J198 ran a lab match on 7 workers (so the
  machine was contended and both sides' rollouts are lower than J197's uncontended 15.18 a decision). Rollouts a
  decision is `search.rollouts` over `search.{p,a,b}.considered`; play and copy time are `search.playUs` and
  `search.copyUs` over `search.rollouts`.

  | match (4 games) | side | decisions | ms a decision | rollouts a decision | rounds a decision | play ms a rollout | copy ms a rollout | rollout errors |
  |---|---|---|---|---|---|---|---|---|
  | rrandom vs search-v2 | **rrandom** | 75 | 968 | **16.84** (×1.31) | 6.73 | 49.2 | 6.2 | 0 |
  | | search-v2 | 91 | 920 | 12.81 | 5.11 | 62.6 | 5.9 | 0 |
  | rrandom-self vs search-v2 | **rrandom-self** | 87 | 929 | **13.45** (×1.01) | 5.39 | 59.8 | 6.2 | 0 |
  | | search-v2 | 95 | 969 | 13.28 | 5.31 | 64.0 | 5.8 | 0 |

  Both matches 2–2, no engine error, no step timeout, no step cap, no budget fallback; each side one `unmappable`
  fallback. Guardrail fires: `search.rr.<rule>` over `search.rr.rollouts` (every rollout that seated a random seat,
  deadline-cut ones included; under `random` summed over both seats):

  | rule | rrandom (1,291 rollouts) | rrandom-self (1,203) |
  |---|---|---|
  | R1 `v2.lethalAttack` | 19 (0.01) | 16 (0.01) |
  | R2 `v2.lethalBlock` | 56 (0.04) | 0 |
  | R3 `v2.targetSide` | 1,039 (0.80, per target list narrowed) | 710 (0.59) |
  | R4 `v2.castSomething` | 274 (0.21) | 231 (0.19) |
  | R5 `v2.dominatedAttacker` | 58 (0.04) | 57 (0.05) |
  | R6 `v2.chumpBlock` | 91 (0.07) | 0 |
  | R7 `v2.ownStack` | 2,261 (1.75) | 1,801 (1.50) |
  | D451's `land` / `zeroXLeftOut` / `refusedCast` | 180 / 372 / 3 | 183 / 295 / 4 |

  Under `random-self` the searching seat is the only random one and a rollout ends with the turn, so it blocks only
  in rollouts of a block decision: R2 and R6 did not fire in 4 games. Two earlier pilots on the same seeds are kept
  under `var/pilot-rrandom/`: before R7 existed (`pre-r7-search-v2-rrandom`: 15.81 rollouts a decision against
  11.91), and before the review's amendments (`first-*`: rrandom 15.59 against 12.85, R5 85 and R6 112 fires;
  rrandom-self 13.44 against 12.17). R7 was added from the own-stack row of the evidence table, not from a pilot
  result; the amendments moved R5's fires from 85 to 58 and R6's from 112 to 91 on rrandom (different games, so
  indicative only).

**Residuals.**

- **R3's counter counts listings, not picks.** The random seat lists every play at every priority, so a narrowed
  target list is counted each time it is listed. A count per pick would need the pick's own record, which a rollout
  does not keep.
- **The evidence's definitions are the wire's arithmetic** (printed power, `tapped`, no trample, no first strike, no
  "can't block"); the guardrails use Forge's combat arithmetic (`damageIfUnblocked`, `lifeThatWouldRemain`,
  `canDestroyAttacker`, `attackerWouldBeDestroyed` and the rest), which reads keywords such as trample, first strike
  and deathtouch and the "can't block" restrictions, but is a prediction, not the combat itself: it does not foresee
  a combat trick, a damage trigger or a replacement the copy will play. The two agree on the plain cases the table
  counts; they can differ at the edges.
- **R5 counts blockers, not their assignment.** "The attackers do not outnumber the blockers" counts every untapped
  creature of the defender that could block now, not whether each could block each attacker (a flier against
  ground blockers), and the lethal test gives every blocker the largest attacker it might meet. Both err toward
  keeping the attack.
- **A rule can only remove an answer.** When every legal answer is nonsense (a forced chump), the random seat still
  plays one, as the rules of the game require.
- **The pilot is 8 games on a contended machine**: a cost and a liveness check, not a strength reading. J199 is
  `alone: yes`.

**Follow-up.** The cube lab's 42 (`PLAN.md`): J199, the two 1,200-game matches above, and the iteration loop of
point 10.

**Amended before any rated game (2026-11-08, the lane's skeptic review).** R5 became a rule on the attack as a set
(it had judged each attacker against any one blocker, so it broke up go-wide attacks Forge makes 9% of the time); R6
judges the block assignment as a whole (it had judged each pair alone, so it broke up gang blocks that kill); R2's
redraw reads trample through a blocker (`lifeThatWouldRemain`; it had counted a blocked attacker as 0); R4 exempts
instants; `parseLive` refuses the random rollouts; point 9's outcome map was made complete (SHOWN and INCONCLUSIVE
both go to a 4,800-game confirmation, NOT SHOWN splits into three readings with a −15 non-inferiority bound, and the
earlier "INCONCLUSIVE with its point above 0 counts as a win" is gone), and the iteration rule's stop with it; the
owner's words are quoted. The pilots were re-run on the amended code (Measured).
