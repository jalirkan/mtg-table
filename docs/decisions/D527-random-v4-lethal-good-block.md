## D527 — random-v4, one change at a time: R8 made lethal-aware under `rollout=random4`, then the override margin at 40 on top; two ladder arms and the next night's pre-registered rule (amends D525)

*Branch `pc/rollout-random-v4`, off main `5876b554` (D526's merge). `node tools/decisions.mjs next` printed D527.
Amends D525 (random-v3, R8 and R9, the two-arm chain, its point 6's rule and point 7's loop count) and through it D523
(random-v2, the iteration loop of its point 10): this is point 10's third iteration, random-v4 (J199 random-v2,
J201 random-v3). Two ladder players, a chain of single changes: one rollout value with one change to one guardrail,
and the same seat with the search's existing override margin raised; tests and this file; the live seat, the atlas's random seat (D508's
frozen population), D523's and D525's four arms, the wire and the protocol are unchanged, so it is free under D509.*

**2026-11-09**

**Context.**

- **J201 read random-v3** (the runner's lines, 1,200 games each against `search-v1-anytime`, the same 600 deals as
  J199): (a) `search-v2-rrandom3` (random-v2 + R8, both seats) **0.4558 [0.4365, 0.4752], Elo −30.8 [−44.4, −17.2],
  NOT SHOWN, loses badly**, 0 errors, 1 timeout; against J199 (a)'s −43.7 [−57.1, −30.4] that is **+12.9 Elo on the
  point**, the direction the diagnosis predicted, still losing badly by the bar. (b) `search-v2-rrandom3-held` (R8 +
  R9) **0.4575 [0.4374, 0.4776], Elo −29.6 [−43.7, −15.6], NOT SHOWN, loses badly**, 0 errors, 0 timeouts: R9 adds
  +1.2 Elo over (a), nothing measurable (the difference carries about ±18.5 Elo of noise, D525's residual). So R9 is
  not carried forward, and R8 is the rule to fix.
- **(a)'s overrides moved where R8 acts.** The search overrode Forge's answer at **×2.09** search-v2's rate at
  priority, **×1.26** at attack and **×1.34** at block decisions (0.393, 0.187, 0.242 a decision against 0.188, 0.149,
  0.180), against J199 (a)'s ×2.06, ×1.47 and ×1.32: the attack overrides — the class the diagnosis named — fell by
  about half their excess; the priority overrides did not move (0.393 of the arm's priority decisions overrode
  Forge, 0.188 of search-v2's, under the same margin of 20 leaf points). It searched ×1.13 search-v2's rollouts a decision
  (17.40 against 15.34) at equal ms (932 against 923).
- **R8 met R2 far more often than it acted.** Over (a)'s 469,811 random rollouts (both seats, deadline-cut ones
  included): `v3.goodBlock` **0.0211** a rollout (9,893 good blocks declared), **`v3.goodBlockDead` 0.1469** (69,010:
  an R8 result R2 rejected), `v3.goodBlockIllegal` 0.0004 (186), R2 `v2.lethalBlock` 0.0148 (6,930), R6 0.0505.
  `goodBlockDead` is counted per attempt and a lethal block can take up to 64, so it overstates the decisions it
  touched (69,010 against the 6,930 lethal blocks R2 redrew); but every one of them is a block under a lethal attack where
  R8's whole result left the seat dead. **The mechanism:** D525's R8 makes every good block at once; under a lethal
  attack one of its moves often takes a blocker off the attacker whose chump kept the seat alive (for example, a 2/2 that
  can kill an attacking 2/1 and live is the only thing in front of a lethal 6/6), R2 rejects the whole result, and the
  uniform draw stands — so exactly where the defender's block matters most, the defender is still random, and R2's
  redraw takes the first surviving draw whatever its blocks are. That is the diagnosis's own failure (the random
  defender rarely takes the block that kills the attacker) left standing in R2's domain.
- **The stakes.** Both of J201's arms lost badly, so random-v3 is the first iteration that loses badly (D525 point 7)
  and the next one, this, stops the loop if it loses badly too (point 7 below). So this iteration gives the principle
  two shots, each one change, read in a chain as D525's were: the guardrail the counters point at, and on top of it
  the search's override threshold, which the priority overrides point at: random rollouts give noisier values, and a
  fixed margin lets more noise through (J201 (a) overrode Forge at priority about twice as often as search-v2, with
  no gain to show for it).

**Decision.**

1. **R8 made lethal-aware** (`RolloutGuards.goodBlocksAlive`, counted `v4.goodBlockLethal`, so
   `search.rr.v4.goodBlockLethal` per rollout on the match line). For an R8-lethal seat (`rollout=random4`, point 3),
   **in a block decision under a lethal attack** (R2's domain: unblocked, the attack takes the seat to 0, D523's
   `lethalIncoming`) with at least one good block on the board (R8's map, D525's `goodMap`, the menace exclusion
   kept):
   - **each good block is made only if the seat survives the assignment after it.** The order and the draws are R8's
     (attackers largest first; a blocker already on an attacker it blocks well stays; among several good blockers
     one drawn from the seat's seeded stream; the chosen one leaves whatever it was drawn to, the blockers drawn
     onto its attacker go back to no block); the test is R2's own (`deadAfter`: the block declared,
     `ComputerUtilCombat.lifeThatWouldRemain` below 1 — unblocked attackers and a blocked trampler's damage past its
     blockers). When the drawn good blocker would leave the seat dead, the attacker's other good blockers follow in
     list order after it, with no further draw; when none survives, the attacker keeps its drawn blocks. A blocker
     whose good block was refused stays free for a later attacker. From a draw that is already dead, a good block is
     made only if it rescues the seat;
   - **after a dead draw, R2's redraws keep the surviving assignment with the most good blocks.** If the first draw
     (with the good blocks above) survives and is legal, it is the block, as before. Once a draw has left the seat
     dead, the redraws (each with the good blocks above) do not stop at the first survivor: the surviving, legal one
     that holds the most good blocks, drawn or made (`goodCount`), is kept (the first at a tie), and the redraws stop early at one that reaches an upper bound
     (`goodBound`: the attackers some blocker blocks well, at most one per good blocker) — only a bound, so when no
     surviving assignment reaches it they run all 64 attempts;
   - **R2's greedy fallback** (no surviving draw in 64: the most damage blocked, greedily) takes the good blocks that
     keep it alive, by the same rule, before it is declared.

   A result that is not a legal declaration is not made (the draw stands, counted `v3.goodBlockIllegal` as in D525).
   Each attacker given a good block in the declared assignment counts once under `v3.goodBlock` **and**
   `v4.goodBlockLethal`. **A block not under a lethal attack is R8's as D525 built it** — the same code path, the same
   draws — and R6 judges it as before. One diagnostic takes no draw: `v4.goodBlockRefused`, a good block not made
   because it would have taken the seat **from alive to dead** (D525's `goodBlockDead` case, one attacker at a time;
   per attempt, like it). Under `random4` the lethal path never builds an R8 result R2 rejects, so
   **`v3.goodBlockDead` is 0 there by construction**, and `v4.goodBlockRefused` is the number that says how often the
   lethal-awareness bit. The point of the rule, on the night's counters: `v3.goodBlock` up from (a)'s 0.0211 a
   rollout, `v4.goodBlockLethal` its share in R2's domain, `goodBlockDead` at 0.
2. **The draws (D523 point 1's common random numbers).** `random4` consumes the seat's seeded stream as `random3`
   does everywhere except a block under a lethal attack with a good block on the board. There, exactly: (i) a refused
   good block draws nothing more (the attacker's other good blockers follow in list order), and frees its blocker
   for a later attacker, so a later attacker's draw among several good blockers can be taken or not where `random3`'s
   was not or was; (ii) after a dead draw the redraws go on past the first survivor (each redraw is `random3`'s own
   per-blocker draw), up to 64 or the bound; (iii) the greedy fallback may draw among several good blockers, where
   `random3`'s took no draw. With no refusal, the good blocks and the draws are `random3`'s on the same seed
   (`DecisionSelfTest`); with no good block on the board, or no lethal attack, the code path is `random3`'s. **The
   offset carries forward**: a random seat's stream is one `SplittableRandom` per seat per rollout
   (`ExploreMath(cfg, seedFor(seed, -523, seat))`, built once with the seat's controller), never re-keyed per
   decision, so once a lethal block has drawn more (or fewer) than `random3`'s would, every later draw of that seat
   in that rollout is offset from `random3`'s — as `random3`'s own R2 redraws already offset `random`'s. Common
   random numbers hold across a round's candidates (each meets the same seat on the same seed), not across rollout
   values.
3. **One rollout value, one seat config.** `random-v4` is two seats, each **`ExploreMath.Config.randomV4Block()`**:
   `randomV3Block()` (random-v2's every guardrail plus R8) with the flag `lethalGood` on — which the constructor
   refuses without R8 — and **no R9** (J201 (b) measured nothing for it). **`rollout=random4`** seats it on **both**
   rollout seats through D523's seam: `search-v2-rrandom4` is J201 (a)'s `search-v2-rrandom3` with this one change, and
   its reading against J201 (a)'s −30.8 says whether R8's failure under a lethal attack was where the rest of the loss
   sat. **The second arm, the margin** (`search-v2-rrandom4-m40`): the same seat config with D312's `margin` — the
   leaf points an alternative's mean must beat Forge's own answer's by to override it, 20 in search-v2 (≈ 1 point of
   win rate at 50%, D349) — at **40**, an existing knob of the verdict alone (`SearchPolicy.Report.verdict`; the
   anytime loop's budget, rounds and stopping do not read it). Read against `search-v2-rrandom4` on the same night and
   the same 600 deals, (b) − (a) is the margin. `SearchConfig.rolloutRandomV4()` says which; `rolloutRandomUs()` and `rolloutRandomThem()` are true for it;
   `parseLive` refuses it as it refuses D523's and D525's values. **D523's `random` and `random-self` and D525's
   `random3` and `random3-held` seat what they did, byte for byte** (none carries `lethalGood`; `DecisionSelfTest`
   asserts it), so their hashes are their own and their games stay what they measured. The `-self` path stays paused
   (D525 point 3).
4. **The atlas's random seat is untouched** (D523 point 6): `Config.randomSeat()` and a job line's random seat are
   not v2 and carry no R8, so no `lethalGood`.
5. **Two ladder players**, kind `search`, every param byte for byte `search-v1-anytime`'s plus `rollout`, whose enum
   gains `random4`, and for the second `margin` (an existing param of the kind). Each note says "for measurement,
   never the live seat".

   | player | rollout | seat config | config hash |
   |---|---|---|---|
   | `search-v1-anytime` (search-v2) | default | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1` | `cdd55e02a89c` (unchanged) |
   | `search-v2-rrandom3` (D525) | random3 | the same plus `,rollout=random3` | `8d1623965986` (unchanged) |
   | `search-v2-rrandom4` | random4 (both seats random-v2 + R8 made lethal-aware) | the same plus `,rollout=random4` | `646d59a008f6` |
   | `search-v2-rrandom4-m40` | random4, margin 40 | `search-v2-rrandom4`'s with `margin=40` for `margin=20` | `968c9003c616` |

   **The hashes rule (D525 point 3) holds:** a config hash is the seat config's text, and the code is pinned by the
   commit (D341); a changed guardrail is a **new** rollout value and a new arm, never an edit under an existing one.
   From the merge on, any change to random-v4's definition takes `random5`.
6. **The pre-registered rule for the night that follows** (the job is drafted as J202). D525's point 6, copied with
   the arms renamed; these thresholds are written on 2026-11-09 before any rated game of either arm, and the night's
   job quotes this file word for word. J202 plays `search-v2-rrandom4` first, as its match (a): does R8 made
   lethal-aware recover more of the loss (against J201 (a)'s −30.8 [−44.4, −17.2] on the same 600 deals and the same
   opponent)? Then `search-v2-rrandom4-m40` as (b): what does the margin of 40 add on top (against (a)'s own result on
   the same night and deals; (b) − (a) is the margin)? The rule's readings themselves are each arm against
   search-v2, as D523's and D525's; the attributions are read beside them, J201's lines printed in the night's
   report. Each difference carries about ±19 Elo of noise (√(13.6² + 13.6²) from J201 (a)'s own 95% interval), so
   only a large effect reads clearly from one night.

   Each arm, `search-v2-rrandom4` and `search-v2-rrandom4-m40`, plays a fixed D398 match of **1,200 games on the
   confirm set against `search-v1-anytime`, `alone: yes`** (D521: the budget is wall-clock, so contention changes the
   rollouts). Reported with each: the score and Elo with the 95% interval, ms and rollouts a decision against search-v2's in the same
   match, and each guardrail's fires per rollout, `search.rr.<rule>` over `search.rr.rollouts` — every rollout that
   seated a random seat, those the deadline cut included — summed over the match's games.

   *The readings and what each decides* (every arm is read once, by the first row that holds):

   | reading | when (the arm against search-v2) | what it decides |
   |---|---|---|
   | **SHOWN** | lower end above 0.5 and point at least +15 Elo | Forge leaves the rollout loop for this arm, **after** a 4,800-game confirmation under D519's readings holds it |
   | **INCONCLUSIVE** | upper end at least +15 and lower end at most 0.5 | nothing yet: confirm at 4,800 games under D519's readings before anything |
   | **NOT SHOWN, indistinguishable** | upper end below +15, the interval contains 0, and its lower end is above −15 Elo (a non-inferiority bound) | the arm is a candidate to replace Forge in the loop, confirmed at 4,800 games (the same three conditions) before it does |
   | **NOT SHOWN, worse, not badly** | upper end below 0 and at least −15 Elo | diagnose from the counters and the worst-lost games (D523 point 10) and iterate as random-v5 |
   | **NOT SHOWN, loses badly** | upper end below −15 Elo | the same diagnosis and iteration; and the principle's cheap path — Forge out of the loop at no cost — is in doubt until a v5 recovers it |

   A NOT SHOWN whose interval contains 0 but whose lower end is at or below −15 is too wide to call: it is read as
   "worse, not badly" for the iteration and says so. A confirmed SHOWN or indistinguishable arm also opens the
   self-play-from-random path (search over random rollouts generating the games and values a later policy learns
   from, D522's step 2 with this rollout instead of Forge's). If both arms are confirmed, the one with the higher
   point is taken, `rrandom4` at a tie (the search as search-v2 has it). Any change to the live seat is a separate
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
7. **The loop's count** (D523 point 10, D525 point 7). The loop stops on two successive v-iterations that lose badly,
   an iteration losing badly when every arm it registered does. random-v2 (J199) did not ((b) read worse, not
   badly). **random-v3 (J201) did: both its arms lose badly** ((a) upper end −17.2, (b) −15.6). So **if both of
   J202's arms lose badly (each upper end below −15 Elo), the loop stops** after J202: the owner is told, with the
   counters, which way it went, and the principle's cheap path — Forge out of the rollout loop at no cost — is not
   reached by guardrails on random play and a stricter verdict, on this evidence. Any other reading keeps the loop
   going: a candidate goes to its 4,800-game confirmation, and an arm that avoids losing badly sends the loop on to
   random-v5. random-v5 starts from `rrandom4` (margin 20) whenever `rrandom4` avoids losing badly, since (b) − (a)
   cannot be read at ±19; it inherits margin 40 only if `rrandom4-m40` alone avoids losing badly, and then v5 is two
   changes from random4 (the guardrail it adds and the margin) and its decision says so. **The paused `-self` path**
   (D525 point 3, J199 (b)'s −25.5) stops with the loop if the loop stops; it is resumed only by a new decision.

**Rejected.**

- **R8 dropped under a lethal attack** (the lethal block left to R2 alone). That is random-v2's defender there, the
  diagnosis's failure; the good block that also keeps the seat alive is the one the rollout most needs.
- **R2's redraw replaced by a search for the best surviving block** (every assignment enumerated, the most good
  blocks taken). That is a block AI, not a guardrail; the redraws keep D523's draw as the source of the block and
  only choose among the draws they already make.
- **The best surviving redraw on the first draw too** (redraw even when the first draw survives). It would make every
  lethal block a best-of-64 and drift further from random play than the failure asks for; the first draw already
  takes every good block it survives.
- **Keeping R9.** J201 (b) measured nothing for it; carrying it would confound the one change with a rule of no
  measured value. It stays registered under `random3-held` as what it measured.
- **Editing `random3`.** Its games measured D525's R8; v4 is a new value, a new name and a new hash (D525 point 3).
- **The margin in the same arm as the rule** (one arm, `random4` at margin 40). It would confound the two changes;
  the chain reads each, as D525's did, at the cost of a second match.
- **`override=lcb` instead of a wider margin** (D350's noise-aware verdict: the paired difference's lower bound clears
  the margin, over at least 3 rounds). It answers the same noise more directly, but it is a different rule shape with
  its own z and a round floor, and it reads differently on decisions with few rounds; the margin is the one-number
  change the evidence names (overrides ×2.09 at the same margin). `lcb` stays a later arm if the margin moves the
  overrides and not the score.

**Measured.**

- `./bridge/build.sh` (nice 19): the lint and its self-test unchanged and green (`lint-bridge-selftest OK: 33 rules,
  79 firing cases`, `bridge lint OK (95 file(s) under bridge/src, 3 under tools/; 33 rules)`; no new hop, no
  `CardView`, no thread); `decision selftest: 337 check(s), 0 failure(s)` (319 before; `DecisionSelfTest.rolloutRandomV4`:
  `random4` seats both rollout seats with random-v2 plus R8 made lethal-aware and no R9; D523's and D525's four values
  seat what they did, none lethal-aware, `random3` with R8 and `random` without; the atlas's, a job line's, random-v2's
  and random-v3's seats not lethal-aware; the text is search-v2's plus `,rollout=random4`, the config search-v2's in
  `rollout` alone; `parseLive` refuses it; an unknown value is refused naming it; `rrandom4-m40`'s config is
  `rrandom4`'s in `margin` alone, 40 for 20, with the same random-v4 seat; under a lethal attack (life 3, a
  giant 5 and a bear 2) the good block fires where it survives (the token keeps the giant, the wall takes the bear,
  counted under both names), is quiet where none survives (D525's R8 moves the wall off the giant and dies; random-v4
  keeps the drawn chump, counted refused), makes from a dead draw only a good block that rescues the seat (and does
  not count the others refused), takes the next good blocker in list order when the drawn one is the chump, with no
  draw; with no refusal it is D525's R8, the same blocks and the same draws on 64 seeds; and the redraws' bound and their count of the good blocks an assignment
  holds, drawn or made);
  `build OK`.
- `web/test/ai-ladder.test.ts`: `rrandom4`'s raw params are search-v2's plus `rollout: random4`, its resolved params
  search-v2's but that, its seat config search-v2's with `,rollout=random4` appended, hash `646d59a008f6`;
  `rrandom4-m40`'s raw params are search-v2's plus `margin: 40` and `rollout: random4`, its resolved params
  `rrandom4`'s but `margin`, its seat config `rrandom4`'s with `margin=40`, hash `968c9003c616`; D523's and D525's
  four arms and search-v2 keep their hashes. `npm --prefix web test` green (node --test 1,900 passed of 1,910, 0
  failed; vitest 161 of 161); `tsc --noEmit` clean; `node tools/decisions.mjs check` OK; `tools/public-check.sh` OK.
- **The pilot** (final, after the redraws' preference was made to count the good blocks an assignment holds rather
  than those R8 made in it): D523's recipe, `./tools/ai-ladder.sh match <arm> search-v1-anytime --games 2
  --batch-pairs 1 --jobs 1 --purpose pilot --dir var/pilot-rrandom4/<arm>` at nice 10, 4 games each (seed 114900000,
  the same deal), after J201 ended, on an otherwise idle machine (so both sides' ms a decision are under J201's ~930).
  `rrandom4` played first, then `rrandom4-m40`, about 2 min each; each match line names its arm at its hash. Read with
  J201's `rollouts.cjs` (D525's reader; it sums every `search.rr.*` key). The first pilot, before that fix, is kept
  under `var/pilot-rrandom4/first/` (`rrandom4` 19.73 rollouts a decision, 11 `v4.goodBlockLethal`, 83 refusals, 0
  `goodBlockDead`).

  | match (4 games) | side | decisions | ms a decision | rollouts a decision | rounds a decision | play ms a rollout | copy ms a rollout | overrides (priority) | rollout errors |
  |---|---|---|---|---|---|---|---|---|---|
  | rrandom4 vs search-v2 | **rrandom4** | 81 | 644 | **19.56** (×1.23) | 8.07 | 29.2 | 3.0 | 17, 21.0% (14/47) | 0 |
  | | search-v2 | 93 | 664 | 15.91 | 6.58 | 37.7 | 2.8 | 11, 11.8% (8/54) | 0 |
  | rrandom4-m40 vs search-v2 | **rrandom4-m40** | 71 | 619 | **20.82** (×1.32) | 8.54 | 26.3 | 2.9 | 12, 16.9% (9/43) | 0 |
  | | search-v2 | 86 | 588 | 15.72 | 6.60 | 34.0 | 2.7 | 9, 10.5% (6/49) | 0 |

  Both matches 2–2, no engine error, no timeout, no budget fallback, one `unmappable` fallback on each side; 0
  random-seat failures. Guardrail fires, `search.rr.<rule>` over `search.rr.rollouts` (summed over both seats):

  | rule | rrandom4 (1,595 rollouts) | rrandom4-m40 (1,484) | J201 (a), rrandom3, 1,200 games |
  |---|---|---|---|
  | R1 `v2.lethalAttack` | 0 | 0 | 0.011 |
  | R2 `v2.lethalBlock` | 48 (0.030) | 47 (0.032) | 0.015 |
  | R3 `v2.targetSide` | 1,506 (0.94) | 1,624 (1.09) | 0.58 |
  | R4 `v2.castSomething` | 339 (0.21) | 388 (0.26) | 0.23 |
  | R5 `v2.dominatedAttacker` | 61 (0.038) | 42 (0.028) | 0.053 |
  | R6 `v2.chumpBlock` | 128 (0.080) | 69 (0.047) | 0.051 |
  | R7 `v2.ownStack` | 3,125 (1.96) | 3,030 (2.04) | 2.41 |
  | **R8 `v3.goodBlock`** | **27 (0.017)** | **18 (0.012)** | 0.021 |
  | **… of which `v4.goodBlockLethal`** | **6 (0.0038)** | 0 | — |
  | `v4.goodBlockRefused` | 76 (0.048) | 0 | — |
  | R8 `v3.goodBlockDead` | **0** | 0 | 0.147 |
  | R8 `v3.goodBlockIllegal` | 0 | 0 | 0.0004 |

  **The change acts where it was aimed**: in `rrandom4`'s games 6 of the 27 good blocks were made under a lethal
  attack (D525's R8 made one there only when its whole result survived; its counters do not separate how often), and
  `goodBlockDead` is 0 as built; the 76 refusals (per attempt) are the good blocks that would have taken the seat from
  alive to dead, which D525 counted as whole-result rejections. `rrandom4-m40`'s 4 games diverge from (a)'s at the
  first override that differs; R2 fired there 47 times but never with a good block the seat survives on the board
  (no `v4.` count): a liveness check only, as is the 4-game override count (12 of 71 decisions against `rrandom4`'s 17
  of 81; priority 9 of 43 against 14 of 47). Rollouts a decision rose ×1.23 and ×1.32 over search-v2 (J201 (a) over its
  night: ×1.13); the redraws' extra R2 tests do not show at this size. The pilot is 8 games: a cost and a liveness
  check, not a strength reading.

**Residuals.**

- **R2's arithmetic judges each move.** `lifeThatWouldRemain` is Forge's prediction of the combat (trample through a
  blocker, the static pumps it predicts), not the combat itself: a combat trick, a damage trigger or a replacement
  the copy will play can make a surviving assignment dead or the reverse. D523's residual on the definitions holds.
- **One good blocker per attacker, as R8.** A pair of blockers that kill together, or a good block that survives
  only beside a second chump, is not looked for (D525's residual on the pair predicate).
- **Menace, in the moves and the fallback.** `goodMap` leaves out an attacker no lone blocker may block (D525), but
  `goodBlocksAlive` and `greedyBlock` do not check a menace attacker's legality: a good blocker moved off a menace
  attacker the draw had double-blocked leaves one blocker on it, and the greedy fallback gives a menace attacker one
  blocker. R2's test is then run on an illegal intermediate, and the final legality check refuses the result (the
  draw stands, `goodBlockIllegal`; for the greedy block, Forge's answer and a failure), as in D525.
- **Deathtouch on a trampler.** `lifeThatWouldRemain` (R2, inherited from D523) counts a blocked trampler's damage
  past its blockers' toughness, not past one point each when it has deathtouch, so it under-counts that damage and
  errs toward survival: an assignment it calls alive can be dead.
- **The ranking of the redraws is tested only through `goodCount`.** `DecisionSelfTest` holds `goodBlocksAlive`,
  `goodBound` and `goodCount` engine-free; the loop in `Explorer.randomBlock` that keeps the best survivor, stops at
  the bound and hands the greedy block its good blocks runs only on the engine, and only the pilot's counters
  (`v4.goodBlockLethal` 6, `goodBlockDead` 0) exercise it.
- **The redraws' preference is over the draws they make.** After a dead draw the kept block is the best of at most 64
  surviving draws, not the best assignment; a survivor with more good blocks that no draw reaches is not found. The
  greedy fallback's good blocks are added to a block chosen for damage, not chosen with them.
- **`v4.goodBlockRefused` is per attempt**, like `goodBlockDead`: a refusal repeated over R2's redraws counts each
  time, so it says how often R8 met R2 one attacker at a time, not how many decisions it touched.
- **Cost.** Under a lethal attack each attempt with a good block on the board makes one R2 test for the draw and one
  per good blocker tried, and after a dead draw the redraws can run to 64 where `random3`'s stopped at the first
  survivor. The motivating case is the worst one: when the only good blocker is also the only chump in front of a
  lethal attacker, no surviving assignment reaches `goodBound`, so after a dead first draw all 64 attempts run, each
  with its `deadAfter` calls (the draw's, and one per good blocker tried). R2's domain is about 0.015 lethal blocks a
  rollout (J201 (a)), so the cost per rollout is small, but it may be part of the pilot's ×1.23 rollouts a decision
  against J201 (a)'s ×1.13 — or the idle machine, or 8 games' noise; the night's own ratio is the check.
- **The priority overrides did not move under R8** (×2.06 to ×2.09), and the guardrail does not reach them: D525's
  second signal (the random seat firing its harmful instants at the first chance) was R9's, which measured nothing.
  The margin arm is the one that reaches them; it raises the bar for every override, the good ones with the bad, so it
  can cut the gain search-v2 itself gets from overriding as well as the noise.
- **(b) − (a) is the margin only on identical deals and code**, and carries about ±19 Elo of noise (D525's
  residual), so only a large effect of the margin reads clearly from one night.

**Follow-up.** The cube lab's 46 (`PLAN.md`): J202, the two 1,200-game matches above, and D523's iteration loop on its
reading.
