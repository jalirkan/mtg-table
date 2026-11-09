## D525 — random-v3, one rule at a time: the good block (R8) under `rollout=random3`, R8 and the held instant (R9) under `random3-held`, two ladder arms, and the next night's pre-registered rule (amends D523)

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
   rollout on the match line). In **every** random block of an R8 seat (`rollout=random3` and `random3-held`, point 3) — the block that answers the attack the
   search is evaluating included — an attacker that one of the seat's blockers can **block, destroy and survive**
   gets that blocker, alone. The pair predicate is R5's own (`RolloutGuards.goodBlock`: `canDestroyAttacker` and not
   `canDestroyBlocker`, Forge's combat arithmetic, read with none of the seat's blocks declared), so R5 and R8 are the
   two sides of one rule. An attacker no lone blocker may block (menace, "can't be blocked except by two or more":
   `CombatUtil.canAttackerBeBlockedWithAmount(a, 1, combat)` false) is left out, since a lone good blocker on it would
   make the whole result illegal. The attackers are taken largest first (`damageIfUnblocked`); a blocker already drawn onto an
   attacker it blocks well stays; otherwise one of the blockers that would — not one already holding a good block —
   is drawn from the seat's seeded stream when there are several (common random numbers, D523 point 1), the other
   blockers drawn onto that attacker go back to no block, and the chosen one leaves whatever it was drawn to. Then R2
   (`lifeThatWouldRemain`, trample through a blocker included) and R6 judge the result as before, with one difference:
   under a lethal attack an R8 result R2 rejects gives way to the draw as it was, which is redrawn only if it is dead
   too; R2's greedy fallback is unchanged. A result that is not a legal declaration is not made (the draw stands). Each
   attacker given a good block counts once, when the block is the one declared. Two diagnostics take no draw, so the
   streams stay: `v3.goodBlockIllegal` (an R8 result refused as illegal) and `v3.goodBlockDead` (an R8 result R2
   rejected), on the match line's batch counts like the others (`search.rr.v3.goodBlockIllegal`,
   `search.rr.v3.goodBlockDead`).
2. **R9, the held instant** (`RolloutGuards.holdInstants`, counted `v3.heldInstant` once per priority it narrowed). For
   an R9 seat (`rollout=random3-held`, point 3), on the **opponent's** turn, a `cast:` or `activate:` option any part of which is harmful by R3's own test
   (`RolloutGuards.harm`: a curse, DealDamage, Destroy, LoseLife, Discard, Sacrifice) is removed unless the stack is
   empty and the step is one of combat's after blockers are declared (declare blockers, first-strike damage, combat
   damage, end of combat) or the end step — so never in answer to a cast. Never the last option; pass stays. It is a
   two-line predicate on the option list and the step, so it is in; its evidence is the weaker signal above, and the
   night's counters say how often it held something.
3. **A chain of single additions, both seats random, so each reading is attributed to one rule.** `random-v3` is
   two seats, each `randomV2()` (every guardrail of D451–D488 and R1–R7) plus flags the constructor refuses without
   `v2`: **`ExploreMath.Config.randomV3Block()`** (`goodBlock`, R8) and **`randomV3BlockHeld()`** (`goodBlock` and
   `heldInstant`, R8 and R9). Two more values of D390's `rollout` key seat them on **both** rollout seats, through the
   same seam as D523's:
   - **`rollout=random3`**: random-v2 + **R8** → `search-v2-rrandom3` is J199 (a)'s `search-v2-rrandom` with the good
     block added; its reading against J199 (a)'s −43.7 says whether R8 fixes the defender;
   - **`rollout=random3-held`**: random-v2 + R8 + **R9** → `search-v2-rrandom3-held` is `search-v2-rrandom3` with the
     held instant added; read against `search-v2-rrandom3`'s own result on the same night and the same 600 deals, the
     difference is R9.

   **The `-self` path pauses**, with J199 (b)'s −25.5 recorded as its baseline. Under `random-self` only the searching
   seat is random and a rollout ends with the turn, so neither new rule acts there: the searching seat never defends
   against an attack it chose (R8), and it reaches a priority on the opponent's turn only in rollouts of decisions
   taken on that turn (R9 fired 8 times in 1,517 rollouts in the lane's pilot of a random-v2 + R9 `-self` seat). What
   would test the searching seat's own random play is a seating where its random seat plays the opponent's turn — a
   longer horizon, or rollouts of the opponent's turn — which is a separate arm and decision.

   `SearchConfig.rolloutRandomV3()` and `rolloutRandomSeat()` say which; `SearchPolicy.Limits` carries the seat's
   config into `RolloutController.Random`, which refuses a config that is not v2. `parseLive` refuses both new values
   as it refuses D523's. **D523's `random` and `random-self` still seat random-v2, unchanged**: with neither flag, R8's
   map is empty and no draw is taken for it, and R9 is not called, so their draws and code path are D523's. (The lane
   built this twice before: one random-v3 with both rules in both seatings, then one rule per seating — `random3` R8
   on both seats, `random3-self` R9 on the searching seat. The coordinator split the first because `random3` was
   confounded, and replaced the second because R9 hardly acts under `-self`. Both pilots are kept, under
   `var/pilot-rrandom3/first/` and `var/pilot-rrandom3/split/`; `rollout=random3-self` is now refused as unknown.
   `first/`'s `search-v2-rrandom3` lines carry hash `8d1623965986` with R8 **and** R9 in both seatings: a config hash is
   the seat config's text only, and the code is pinned by the commit (D341), so the same hash then meant other code.
   From the merge on, any change to R8's or R9's definition takes a **new** rollout value and a new arm, never an edit
   under `random3` or `random3-held`. The final pilot is `var/pilot-rrandom3/final2/`, after the skeptic's fixes to R8
   (menace, the lethal fallback).)
4. **The atlas's random seat is untouched** (D523 point 6): `Config.randomSeat()` and a job line's `playExplore:
   {random: true}` are not v2 and carry neither R8 nor R9; `DecisionSelfTest.randomSeat` is unchanged and
   `rolloutRandomV3` asserts it.
5. **Two ladder players**, kind `search`, every param byte for byte `search-v1-anytime`'s plus `rollout`, whose enum
   gains `random3` and `random3-held`. Each note says "for measurement, never the live seat".

   | player | rollout | seat config | config hash |
   |---|---|---|---|
   | `search-v1-anytime` (search-v2) | default | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1` | `cdd55e02a89c` (unchanged) |
   | `search-v2-rrandom` (D523) | random | the same plus `,rollout=random` | `fb8ae32c014d` (unchanged) |
   | `search-v2-rrandom-self` (D523) | random-self | the same plus `,rollout=random-self` | `d3aa28be73b2` (unchanged) |
   | `search-v2-rrandom3` | random3 (both seats random-v2 + R8) | the same plus `,rollout=random3` | `8d1623965986` |
   | `search-v2-rrandom3-held` | random3-held (both seats random-v2 + R8 + R9) | the same plus `,rollout=random3-held` | `a484402b1185` |

6. **The pre-registered rule for the night that follows** (the job is drafted as J201). D523's point 9, copied with
   the arms renamed; these thresholds are written on 2026-11-09 before any rated game of either arm, and the night's
   job quotes this file word for word. J201 plays `search-v2-rrandom3` first, as its match (a): does R8 fix the defender
   (against J199 (a)'s −43.7)? Then `search-v2-rrandom3-held` as (b): what does R9 add on top of R8 (against (a)'s own
   result on the same night and deals; (b) − (a) is R9)? The rule's readings themselves are each arm against
   search-v2, as D523's; the attributions are read beside them, J199's lines printed in the night's report.

   Each arm, `search-v2-rrandom3` and `search-v2-rrandom3-held`, plays a fixed D398 match of **1,200 games on the
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
  79 firing cases`, `bridge lint OK`; no new hop, no `CardView`, no thread); `decision selftest: 319 check(s), 0
  failure(s)` (289 before; `DecisionSelfTest.rolloutRandomV3`: each arm's config is search-v2's in the field `rollout`
  alone; both values seat both rollout seats; `random3` seats random-v2 plus R8 (R8 on, R9 quiet) and `random3-held`
  random-v2 plus R8 and R9 (both on); D523's two still random-v2 with neither; the texts; `random3-self` refused as an
  unknown value naming the new ones; `parseLive` refusing both; the atlas's and a job line's random seats carry neither rule; R8 fires for a blocker drawn as no block, replaces a drawn chump on the attacker, moves a blocker drawn onto an
  attacker it does not block well, gives one blocker good against two attackers the larger, and on several good
  blockers draws one from the seeded stream — the same on the same seed, each on some seed — and is quiet when the
  attacker already has a good block or no blocker kills and survives; R8's map leaves out an attacker no lone blocker may
  block (menace) and keeps only the pairs that kill and survive; R9 holds the harmful plays on their turn,
  counted once, is quiet on its own turn and in the window, never removes the last option, and its window is combat
  after blockers or the end step with the stack empty); `build OK`.
- `web/test/ai-ladder.test.ts`: each new arm's raw params are search-v2's plus `rollout`, its resolved params
  search-v2's but that, its seat config search-v2's with `,rollout=random3` / `,rollout=random3-held` appended, the
  hashes above; D523's two and search-v2's hashes unchanged; no `search-v2-rrandom3-self` registered. `npm --prefix web test` green (node --test 1,890 passed
  of 1,900, 0 failed; vitest 161 of 161); `tsc --noEmit` clean; `node tools/decisions.mjs check` OK; `tools/public-check.sh`
  OK.
- **The pilot** (final, after the skeptic's fixes): D523's recipe, `./tools/ai-ladder.sh match <arm> search-v1-anytime
  --games 2 --batch-pairs 1 --jobs 1 --purpose pilot --dir var/pilot-rrandom3/final2/<arm>` at nice 10, 4 games each,
  after J199 ended, while J200 ran (so the machine was contended a little). It played `search-v2-rrandom3` first, in
  2 min 38 s, then `search-v2-rrandom3-held`, in 2 min 45 s; each match line names its arm at its hash
  (`8d1623965986`, `a484402b1185`). Rollouts a decision is `search.rollouts` over `search.{p,a,b}.considered`; play and
  copy time are `search.playUs` and `search.copyUs` over `search.rollouts`. J201's reader (`rollouts.cjs`, J199's plus
  the `v3.` sums) reproduces D523's pilot table exactly from its batches.

  | match (4 games) | side | decisions | ms a decision | rollouts a decision | rounds a decision | play ms a rollout | copy ms a rollout | rollout errors |
  |---|---|---|---|---|---|---|---|---|
  | rrandom3 (R8) vs search-v2 | **rrandom3** | 71 | 886 | **17.14** (×1.24) | 7.13 | 44.8 | 5.4 | 0 |
  | | search-v2 | 89 | 852 | 13.88 | 5.78 | 53.9 | 5.3 | 0 |
  | rrandom3-held (R8+R9) vs search-v2 | **rrandom3-held** | 79 | 868 | **16.75** (×1.20) | 6.87 | 44.8 | 5.2 | 0 |
  | | search-v2 | 95 | 846 | 13.94 | 5.61 | 53.3 | 4.7 | 0 |

  Both matches 2–2, no engine error, no step timeout, no step cap, no budget fallback; one `unmappable` fallback on
  each side except `rrandom3`'s arm (none); 0 random-seat failures. Guardrail fires: `search.rr.<rule>` over
  `search.rr.rollouts` (every rollout that seated a random seat, deadline-cut ones included; summed over both seats):

  | rule | rrandom3, R8 (1,238 rollouts) | rrandom3-held, R8+R9 (1,343) |
  |---|---|---|
  | R1 `v2.lethalAttack` | 0 | 23 (0.017) |
  | R2 `v2.lethalBlock` | 22 (0.018) | 61 (0.045) |
  | R3 `v2.targetSide` | 1,356 (1.10) | 1,412 (1.05) |
  | R4 `v2.castSomething` | 256 (0.21) | 294 (0.22) |
  | R5 `v2.dominatedAttacker` | 45 (0.036) | 58 (0.043) |
  | R6 `v2.chumpBlock` | 38 (0.031) | 81 (0.060) |
  | R7 `v2.ownStack` | 2,638 (2.13) | 2,524 (1.88) |
  | **R8 `v3.goodBlock`** | **14 (0.011)** | **21 (0.016)** |
  | R8 `v3.goodBlockIllegal` | 0 | 0 |
  | R8 `v3.goodBlockDead` | 107 (0.086) | 258 (0.19) |
  | **R9 `v3.heldInstant`** | **— (off)** | **480 (0.36)** |
  | D451's `land` / `zeroXLeftOut` / `refusedCast` | 253 / 334 / 9 | 230 / 481 / 10 |

  **No R8 result was refused as illegal** after the menace exclusion. **`v3.goodBlockDead` outnumbers the good blocks
  taken by about ×8 and ×12**: under a lethal attack R8 often moves a blocker off the attacker whose block kept the
  seat alive, R2 rejects that, and the draw as it was is kept or redrawn (the skeptic's fallback, point 1). It is
  counted per attempt, and a lethal block can take up to 64 attempts, so it says how often R8 met R2 rather than how
  many blocks it changed; but it says that most of R8's chances in these 8 games came under lethal attacks, where R2's
  arithmetic overrules it. R8 took a good block about once every 70–90 random rollouts; R9 held a harmful play in
  about one `random3-held` rollout in three and is absent from `random3`'s lines. Rollouts a decision rose ×1.24 and
  ×1.20 over search-v2 (J199's night under `random`: ×1.15). The pilot is 8 games: a cost and a liveness check, not a
  strength reading.

**Residuals.**

- **R8's predicate is the pair's.** `canDestroyAttacker` / `canDestroyBlocker` judge one blocker against one attacker
  with Forge's combat prediction (first strike, deathtouch, indestructible, regeneration, the static pumps it
  predicts); it does not foresee the attacker's combat trick, and does not look for a pair of blockers that kill
  together. D523's residual on the evidence's definitions holds here too. It is called with `withoutAbilities` false,
  as R5 calls it: that credits the blocker's own activated pumps and damage prevention, which the random seat may
  never use, and also the attacker's regeneration, transform and prevention, which the attacker's side may. `true`
  would drop both sides, and would change R5, which D523's arms share; so R8 keeps R5's call and can call a block good
  that needs the blocker's own pump to be.
- **R8 ranks attackers by their damage to the seat** (`damageIfUnblocked` with the seat as defender), the attackers on
  a planeswalker or a battle included, while R2 counts only those at the seat. The ranking only orders the attackers
  for the choice of good blockers; every attacker is still eligible.
- **R8 gives up an attacker's chump for a good block elsewhere.** Under a lethal attack that can leave the seat dead;
  R2 then rejects the R8 result and the draw as it was is kept if it survives (counted `v3.goodBlockDead`), else
  redrawn, and when no draw survives in 64 the greedy fallback blocks without R8.
- **R9's harm is R3's list.** A harmful play outside it (a bounce, a tap, a -X/-X that is not a curse by Forge's flag)
  is not held; a beneficial instant (a pump on its own creature) is never held, so it can still fire early. Activated
  abilities that are harmful (a pinger) are held with the spells.
- **The diagnosis read 976 of J199 (a)'s 1,200 games** and none of (b)'s; it located (a)'s loss, not (b)'s. (b)'s
  −25.5 is the searching seat's own random play, which neither new rule reaches (point 3): that path pauses until an
  arm seats the random seat on the opponent's turn.
- **(b) − (a) is R9 only on identical deals and code.** Both arms play the same 600 deals on the same pin and night,
  each against search-v2; their difference carries both arms' noise: about ±18.5 Elo at 1,200 games each, from J199's
  own 95% intervals of ±13.35 (a) and ±12.75 (b), √(13.35² + 12.75²) ≈ 18.5. The shared deals may lower it (the two
  arms' outcomes are correlated deal by deal), but nothing has measured that; so only a large R9 effect reads clearly
  from one night.

**Follow-up.** The cube lab's 44 (`PLAN.md`): J201, the two 1,200-game matches above, and D523's iteration loop on
their reading.
