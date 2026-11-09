## D525 — random-v3: the good block (R8) and the held instant (R9), `rollout=random3` and `random3-self`, two ladder arms, and the next night's pre-registered rule (amends D523)

*Branch `pc/rollout-random-v3`, off main `2ffb65fe` (D524's merge). `node tools/decisions.mjs next` printed D525.
Amends D523 (random rollouts, random-v2 and its seven guardrails R1–R7, the pre-registered rule of its point 9 and the
iteration loop of its point 10): this is point 10's first iteration, random-v3. Two ladder players, two rollout values,
two guardrails, tests and this file; the live seat, the atlas's random seat (D508's frozen population), D523's two arms,
the wire and the protocol are unchanged, so it is free under D509.*

**2026-11-09**

**Context.**

- **J199 read both random-v2 arms** (the runner's report, 1,200 games each, 0 errors, against `search-v1-anytime`):
  (a) `search-v2-rrandom` (random-v2 on both rollout seats) **0.4375 [0.4186, 0.4564], Elo −43.7 [−57.1, −30.4],
  NOT SHOWN, loses badly**; (b) `search-v2-rrandom-self` (random-v2 on the searching seat only, Forge the opponent)
  **0.4633 [0.4451, 0.4816], Elo −25.5 [−38.3, −12.8], NOT SHOWN, worse, not badly**. D523 point 10 says diagnose
  and iterate, without asking the owner. **(b) is 18 Elo better than (a): that is the defender fact.** The one
  difference between the arms is who plays the opponent's seat in the rollouts, and putting Forge back there recovers
  about 18 of (a)'s 44 Elo; the searching seat's own random play costs the rest. Both arms searched *more* than
  search-v2 (×1.15 and ×1.08 its rollouts a decision, 7.1 and 6.6 complete rounds against 6.0) at equal ms a
  decision: a bias of the value, not a budget. Counters per random rollout over the night, (a) / (b): R7 2.38 / 1.92,
  R3 0.57 / 0.31, R4 0.23 / 0.20, R5 0.050 / 0.058, R6 0.055 / 0, R2 0.016 / 0, R1 0.012 / 0.011; random-seat
  failures 86 / 2. The diagnosis below read (a)'s own batch lines at 976 of its 1,200 games (run
  `20261109T040906-3504993`, snapshot 2026-11-09 00:54, log analysis only, no JVM: 427 of 976, 0.438, about −45).
- **The counters do not locate the loss.** At the diagnosis's snapshot of (a), every guardrail fires within ×0.41–×2.2 of the pilot's rate per rollout
  (380,186 random rollouts, 389.5 a game): R7 2.39 a rollout, R3 0.55, R4 0.23, R6 0.056, R5 0.052, R2 0.017, R1 0.012,
  `failures` 55 in all. R1 and R2 fire almost only in games the arm won (game-ending combat). The fire rates are the
  same in won and lost games. Nor is it the budget: the arm runs **×1.15 search-v2's rollouts a decision** (17.89
  against 15.54), ×1.18 its complete rounds, 3 budget fallbacks against 38.
- **The overrides do.** A batch line's `events` list every decision where the search overrode Forge's answer. The arm
  overrides **×2.06, ×1.47 and ×1.32** as often as search-v2 at priority, attack and block decisions (0.396, 0.210,
  0.221 a decision against 0.192, 0.143, 0.168). By class, with *paired* the arm's count on one deck-side of a deal
  minus search-v2's on the same deck, seat and seed in the mirrored twin:

  | override class | arm a game | search-v2 a game | ratio | games won, over each side's base | paired excess: arm lost & v2 won / tied / arm won & v2 lost |
  |---|---|---|---|---|---|
  | **A more attackers** (70% over Forge's "attack none") | 0.90 | 0.58 | ×1.55 | **0.72** against 0.86 | **+0.72** / +0.27 / **−0.18** |
  | B block over Forge's no block | 0.18 | 0.12 | ×1.55 | 0.76 against 1.01 | +0.05 / +0.07 / +0.07 |
  | B other blocks | 0.11 | 0.10 | ×1.06 | 0.63 against 0.83 | 0 / +0.01 / +0.04 |
  | **P pass over Forge's play, own main 2** | 0.48 | 0.21 | ×2.32 | 0.89 against 0.93 | **+0.59** / +0.20 / +0.21 |
  | P play over Forge's pass, own main 1 | 2.66 | 1.24 | ×2.14 | 1.05 against 1.05 | +1.49 / +1.34 / +2.27 (neutral) |

  The deficit sits in the mid-game (turns 15–24: 0.416 and 0.417) and in the creature-heavy cubes (synergy 0.369,
  vintage 0.419); the arm lost both sides of 89 of 488 mirrored deals and won both of 28. The arm's top quartile of
  override rate scores 0.347; search-v2's top quartile holds 0.552.
- **The diagnosis.** A rollout ends with the turn (`turns=0`), so in an attack decision's rollouts the opponent's one
  answer that matters is its block — and under `rollout=random` the opponent is random-v2, whose block is drawn per
  blocker **uniformly among no block and each attacker it can block**. A blocker that could block, kill the attacker
  and survive takes that block only about 1/(k+1) of the time (half the time against a lone attacker); Forge's takes
  it almost always. Nothing in R1–R7 makes a good block: R5 is the attacker's side of it and never touches the
  *forced* candidate attack, which is what an attack decision chooses; R6 only removes chumps. So attacks look safe
  in the rollouts, and the search overrides Forge's "attack none" with attacks a real opponent punishes. The second,
  weaker signal: the random seat fires its harmful instants at the first chance (R3 aims them at the creature just
  cast), so a main-2 play looks worse than a pass. The full diagnosis (counters, override classes, deal pairs, the
  twenty worst-lost games and their replay commands) is the session's
  `j199-diag/report.md`; the numbers above are its own.

**Decision.**

1. **R8, the good block** (`RolloutGuards.goodBlocks`, counted `v3.goodBlock`, so `search.rr.v3.goodBlock` per
   rollout on the match line). In **every** random block of a random-v3 seat — the block that answers the attack the
   search is evaluating included — an attacker that one of the seat's blockers can **block, destroy and survive**
   gets that blocker, alone. The pair predicate is R5's own (`RolloutGuards.goodBlock`: `canDestroyAttacker` and not
   `canDestroyBlocker`, Forge's combat arithmetic, read with none of the seat's blocks declared), so R5 and R8 are the
   two sides of one rule. The attackers are taken largest first (`damageIfUnblocked`); a blocker already drawn onto an
   attacker it blocks well stays; otherwise one of the blockers that would — not one already holding a good block —
   is drawn from the seat's seeded stream when there are several (common random numbers, D523 point 1), the other
   blockers drawn onto that attacker go back to no block, and the chosen one leaves whatever it was drawn to. Then R2
   (`lifeThatWouldRemain`, trample through a blocker included) and R6 judge the result exactly as before: under a
   lethal attack a draw R8 left dead is redrawn, and R2's greedy fallback is unchanged. A result that is not a legal
   declaration is not made (the draw stands). Each attacker given a good block counts once, when the block is the one
   declared.
2. **R9, the held instant** (`RolloutGuards.holdInstants`, counted `v3.heldInstant` once per priority it narrowed). On
   the **opponent's** turn, a `cast:` or `activate:` option any part of which is harmful by R3's own test
   (`RolloutGuards.harm`: a curse, DealDamage, Destroy, LoseLife, Discard, Sacrifice) is removed unless the stack is
   empty and the step is one of combat's after blockers are declared (declare blockers, first-strike damage, combat
   damage, end of combat) or the end step — so never in answer to a cast. Never the last option; pass stays. It is a
   two-line predicate on the option list and the step, so it is in; its evidence is the weaker signal above, and the
   night's counters say how often it held something.
3. **`random-v3`** is `ExploreMath.Config.randomV3()`: `randomV2()` (every guardrail of D451–D488 and R1–R7) plus the
   flag `v3` (which the constructor refuses without `v2`). Two more values of D390's `rollout` key seat it, through the
   same seam as D523's: **`rollout=random3`** (both rollout seats random-v3) and **`rollout=random3-self`** (the
   searching seat random-v3, the opponent Forge's `PlayerControllerAi`). `SearchConfig.rolloutRandomV3()` and
   `rolloutRandomSeat()` say which; `SearchPolicy.Limits` carries the seat's config into `RolloutController.Random`,
   which now refuses a config that is not random-v2 or v3. `parseLive` refuses both new values as it refuses D523's.
   **D523's `random` and `random-self` still seat random-v2, unchanged**: with `v3` off, R8's map is empty and no draw
   is taken for it, and R9 is not called, so their draws and code path are D523's.
4. **The atlas's random seat is untouched** (D523 point 6): `Config.randomSeat()` and a job line's `playExplore:
   {random: true}` are neither v2 nor v3; `DecisionSelfTest.randomSeat` is unchanged and `rolloutRandomV3` asserts it.
5. **Two ladder players**, kind `search`, every param byte for byte `search-v1-anytime`'s plus `rollout`, whose enum
   gains `random3` and `random3-self`. Each note says "for measurement, never the live seat".

   | player | rollout | seat config | config hash |
   |---|---|---|---|
   | `search-v1-anytime` (search-v2) | default | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1` | `cdd55e02a89c` (unchanged) |
   | `search-v2-rrandom` (D523) | random | the same plus `,rollout=random` | `fb8ae32c014d` (unchanged) |
   | `search-v2-rrandom-self` (D523) | random-self | the same plus `,rollout=random-self` | `d3aa28be73b2` (unchanged) |
   | `search-v2-rrandom3` | random3 (both seats random-v3) | the same plus `,rollout=random3` | `8d1623965986` |
   | `search-v2-rrandom3-self` | random3-self (the searching seat random-v3, the opponent Forge) | the same plus `,rollout=random3-self` | `0403f4770b26` |

6. **The pre-registered rule for the night that follows** (the job is drafted as J201). D523's point 9, copied with
   the arms renamed; these thresholds are written on 2026-11-09 before any rated game of either arm, and the night's
   job quotes this file word for word. J201 plays `search-v2-rrandom3-self` first, as its match (a): the question it
   answers first is whether R8 lifts the `-self` arm into "indistinguishable or better", and second, with
   `search-v2-rrandom3` as (b), whether R8 rescues the both-sides arm.

   Each arm, `search-v2-rrandom3-self` and `search-v2-rrandom3`, plays a fixed D398 match of **1,200 games on the
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
   | **NOT SHOWN, worse, not badly** | upper end below 0 and at least −15 Elo | diagnose from the counters and the worst-lost games (D523 point 10) and iterate as random-v4 |
   | **NOT SHOWN, loses badly** | upper end below −15 Elo | the same diagnosis and iteration; and the principle's cheap path — Forge out of the loop at no cost — is in doubt until a v4 recovers it |

   A NOT SHOWN whose interval contains 0 but whose lower end is at or below −15 is too wide to call: it is read as
   "worse, not badly" for the iteration and says so. A confirmed SHOWN or indistinguishable arm also opens the
   self-play-from-random path (search over random rollouts generating the games and values a later policy learns
   from, D522's step 2 with this rollout instead of Forge's). If both arms are confirmed, the one with the higher
   point is taken, `random3` at a tie (no Forge in the loop at all). Any change to the live seat is a separate
   decision (a seat-queue row, D509).

   *Three cases the rows do not reach*, read here before any game, so the job's checks and this file say the same
   thing: (1) a lower end above 0.5 with a point under +15 and an upper end at least +15 (for example +12 [+2.5,
   +21.5]) is **INCONCLUSIVE** — the SHOWN row needs both of its conditions, and D517's shape, which this table
   takes, reads everything the SHOWN row does not reach and the INCONCLUSIVE row does as INCONCLUSIVE; (2) a NOT
   SHOWN interval that lies wholly at or above 0 (lower end at or above 0, upper end below +15 — it needs a
   half-width under 7.5 Elo, not expected at 1,200 games) is **NOT SHOWN, no weaker**, read with the
   indistinguishable row: a candidate, confirmed at 4,800 games before anything; (3) a NOT SHOWN upper end of exactly
   0 — the interval does not contain 0 and the upper end is not below 0 — is **worse, not badly**. "Lower end" in
   the SHOWN and INCONCLUSIVE rows is the match line's 95% lower end on the score (`lo`), "point" its Elo point
   estimate (`elo`), and "interval", "upper end" and the non-inferiority bound's "lower end" its Elo interval
   (`eloLo`, `eloHi`), the arm being the match's first player.

7. **The loop's count.** D523 point 10 stops the iteration on two successive v-iterations that lose badly. An
   iteration loses badly when every arm it registered does (its best arm is the iteration's answer). random-v2 (J199)
   did not: (a) lost badly, (b) read worse, not badly. So J201 cannot stop the loop on that rule whatever it reads;
   if both its arms lose badly, random-v3 is the first iteration that loses badly, and the next one (v4) stops the
   loop if it loses badly too, when the owner is told, with the counters, which way it went.

**Rejected.**

- **R8 only for blockers drawn as no block** (the diagnosis's first sketch). A blocker drawn onto an attacker it
  merely trades with, or chumps, while it could kill another and live, is the same failure; R8 moves it.
- **R8 as a gang block** (the good blocker added beside the drawn ones). The good blocker kills the attacker alone
  and lives; a creature drawn beside it adds only a damage assignment the attacker can aim at it.
- **R8 as Forge's whole block AI** (`AiBlockController`: trades, chump for life, reinforcement). That is Forge's
  judgment back in the loop, which the principle takes out, and a strategy, not a guardrail (D523's rejected list).
  R8 is the same combat arithmetic R5 already trusts, on the defender's side.
- **A verdict knob in the same arm** (`override=lcb` or a wider `margin` over the flatter random values, the
  diagnosis's third hypothesis). It changes the search, not the rollout, and would confound the two; it is a separate
  arm if v3 still over-overrides.
- **R4 extended to main 1.** The main-1 overrides it would address are neutral on the evidence (win share 1.05
  against 1.05).
- **Changing D523's arms.** They measured random-v2; v3 is new names and new hashes.

**Measured.**

- `./bridge/build.sh` (nice 19): the lint and its self-test unchanged and green (`lint-bridge-selftest OK: 33 rules,
  79 firing cases`, `bridge lint OK`; no new hop, no `CardView`, no thread); `decision selftest: 315 check(s), 0
  failure(s)` (289 before; `DecisionSelfTest.rolloutRandomV3`: each arm's config is search-v2's in the field `rollout`
  alone, random3 seats random-v3 and D523's two still random-v2, the texts, an unknown value refused naming the new
  ones, `parseLive` refusing both; random-v3 is random-v2 plus the flag and the atlas's and a job line's seats are
  not; R8 fires for a blocker drawn as no block, replaces a drawn chump on the attacker, moves a blocker drawn onto an
  attacker it does not block well, gives one blocker good against two attackers the larger, and on several good
  blockers draws one from the seeded stream — the same on the same seed, each on some seed — and is quiet when the
  attacker already has a good block or no blocker kills and survives; R9 holds the harmful plays on their turn,
  counted once, is quiet on its own turn and in the window, never removes the last option, and its window is combat
  after blockers or the end step with the stack empty); `build OK`.
- `web/test/ai-ladder.test.ts`: each new arm's raw params are search-v2's plus `rollout`, its resolved params
  search-v2's but that, its seat config search-v2's with `,rollout=random3` / `,rollout=random3-self` appended, the
  hashes above; D523's two and search-v2's hashes unchanged. `npm --prefix web test` green (node --test 1,890 passed
  of 1,900, 0 failed; vitest 161 of 161); `tsc --noEmit` clean; `node tools/decisions.mjs check` OK; `tools/public-check.sh`
  OK.
- **The pilot**: D523's recipe, `./tools/ai-ladder.sh match <arm> search-v1-anytime --games 2 --batch-pairs 1 --jobs 1
  --purpose pilot --dir var/pilot-rrandom3/<arm>` at nice 10, 4 games each, after J199 ended, while J200 ran its pilot
  (so the machine was contended a little). It played `search-v2-rrandom3-self` first, in 2 min 45 s, then
  `search-v2-rrandom3`, in 2 min 16 s. Rollouts a decision is `search.rollouts` over `search.{p,a,b}.considered`; play
  and copy time are `search.playUs` and `search.copyUs` over `search.rollouts`. J201's reader (`rollouts.cjs`, J199's
  plus the `v3.` sums) reproduces D523's pilot table exactly from its batches.

  | match (4 games) | side | decisions | ms a decision | rollouts a decision | rounds a decision | play ms a rollout | copy ms a rollout | rollout errors |
  |---|---|---|---|---|---|---|---|---|
  | rrandom3-self vs search-v2 | **rrandom3-self** | 84 | 864 | **15.95** (×1.10) | 6.51 | 47.4 | 4.6 | 0 |
  | | search-v2 | 96 | 798 | 14.56 | 5.89 | 49.0 | 4.1 | 0 |
  | rrandom3 vs search-v2 | **rrandom3** | 80 | 731 | **18.52** (×1.19) | 7.73 | 34.8 | 3.8 | 0 |
  | | search-v2 | 90 | 731 | 15.60 | 6.41 | 42.1 | 3.6 | 0 |

  Both matches 2–2, no engine error, no step timeout, no step cap, no budget fallback; each side one `unmappable`
  fallback; 0 random-seat failures. Guardrail fires: `search.rr.<rule>` over `search.rr.rollouts` (every rollout that
  seated a random seat, deadline-cut ones included; under `random3` summed over both seats):

  | rule | rrandom3-self (1,365 rollouts) | rrandom3 (1,495) |
  |---|---|---|
  | R1 `v2.lethalAttack` | 0 | 24 (0.016) |
  | R2 `v2.lethalBlock` | 0 | 118 (0.079) |
  | R3 `v2.targetSide` | 869 (0.64) | 1,593 (1.07) |
  | R4 `v2.castSomething` | 237 (0.17) | 336 (0.22) |
  | R5 `v2.dominatedAttacker` | 123 (0.090) | 89 (0.060) |
  | R6 `v2.chumpBlock` | 0 | 96 (0.064) |
  | R7 `v2.ownStack` | 2,042 (1.50) | 2,799 (1.87) |
  | **R8 `v3.goodBlock`** | **0** | **28 (0.019)** |
  | **R9 `v3.heldInstant`** | **10 (0.007)** | **542 (0.36)** |
  | D451's `land` / `zeroXLeftOut` / `refusedCast` | 179 / 392 / 7 | 255 / 396 / 0 |

  R8 fires under `random3` (the opponent's random blocks, the ones the diagnosis named) and not in 4 games under
  `random3-self`, where the searching seat is the only random one and blocks only in rollouts of its own block
  decisions; R9 holds a harmful play in about one `random3` rollout in three, almost never under `random3-self` (its
  rollouts rarely reach the opponent's turn). R8's 0.019 a rollout is per attacker given a good block, against R6's
  0.064 chumps removed: most random blocks have no good block to take. Rollouts a decision rose ×1.10 and ×1.19 over
  search-v2 (J199's night: ×1.08 and ×1.15). The pilot is 8 games: a cost and a liveness check, not a strength
  reading.

**Residuals.**

- **R8's predicate is the pair's.** `canDestroyAttacker` / `canDestroyBlocker` judge one blocker against one attacker
  with Forge's combat prediction (first strike, deathtouch, indestructible, regeneration, the static pumps it
  predicts); it does not foresee the attacker's combat trick, and does not look for a pair of blockers that kill
  together. D523's residual on the evidence's definitions holds here too.
- **R8 gives up an attacker's chump for a good block elsewhere.** Under a lethal attack that can leave the seat dead;
  R2 then redraws, and when no draw survives in 64 the greedy fallback blocks without R8.
- **R9's harm is R3's list.** A harmful play outside it (a bounce, a tap, a -X/-X that is not a curse by Forge's flag)
  is not held; a beneficial instant (a pump on its own creature) is never held, so it can still fire early. Activated
  abilities that are harmful (a pinger) are held with the spells.
- **The diagnosis read 976 of (a)'s 1,200 games** and none of (b)'s; it located (a)'s loss, not (b)'s. (b)'s −25.5
  is the searching seat's own random play, which R8 touches only in the seat's own blocks and R9 in its priorities
  on the opponent's turn, so most of R8's effect is in `random3`; what (b)'s remaining loss is made of is the next
  diagnosis's, from J201 (a)'s counters and worst-lost games.

**Follow-up.** The cube lab's 44 (`PLAN.md`): J201, the two 1,200-game matches above, and D523's iteration loop on
their reading.
