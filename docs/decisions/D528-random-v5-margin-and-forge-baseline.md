## D528 — random-v5, no new rollout logic: `random4` at the override margin 60, read against search-v2 and against the seat under the search with the search off (`policy-outlet`) on the same deals; the SIGNAL rule that closes or keeps the random-rollout track (amends D527)

*Branch `pc/rollout-random-v5`, off main `1ac01c0b` (D527's merge). `node tools/decisions.mjs next` printed D528.
Amends D527 (random-v4, its point 6's rule and point 7's loop count) and through it D525 and D523 (the iteration
loop of D523's point 10): this is point 10's fourth iteration, random-v5 (J199 random-v2, J201 random-v3, J202
random-v4). One ladder player, `random4`'s seat at a higher override margin, and one existing player played as a
baseline; tests and this file. **Nothing under `bridge/src` changes** — no rollout value, no guardrail, no counter, so no
self-test changes either — and the live seat, the atlas's random seat (D508's frozen population), D523's, D525's and
D527's six arms, the wire and the protocol are unchanged, so it is free under D509.*

**2026-11-09**

**Context.**

- **The chain so far**, every arm against `search-v1-anytime` (search-v2) on the same 600 deals (blocks
  114,900,000–114,900,149, the confirm set), each one night, each one change, each read under the same
  pre-registered table (D523 point 9, D525 point 6, D527 point 6):

  | iteration | arm | change | Elo vs search-v2 [95%] | reading |
  |---|---|---|---|---|
  | random-v2 (J199 a) | `search-v2-rrandom` | the atlas's random seat + seven guardrails R1–R7, both rollout seats | −43.7 [−57.1, −30.4] | loses badly |
  | random-v2 (J199 b) | `search-v2-rrandom-self` | the same, searching seat only (Forge the opponent) | −25.5 [−38.3, −12.8] | worse, not badly |
  | random-v3 (J201 a) | `search-v2-rrandom3` | + R8 the good block | −30.8 [−44.4, −17.2] | loses badly |
  | random-v3 (J201 b) | `search-v2-rrandom3-held` | + R9 the held instant | −29.6 [−43.7, −15.6] | loses badly |
  | random-v4 (J202 a) | `search-v2-rrandom4` | R8 made lethal-aware | −39.5 [−53.9, −25.3] | loses badly |
  | random-v4 (J202 b) | `search-v2-rrandom4-m40` | + the override margin 20 → 40 | −20.9 [−34.1, −7.7] | worse, not badly |

- **J202 read random-v4** (the runner's lines, 1,200 games each, 0 errors, 0 timeouts, the deal blocks
  114,900,000–114,900,149 in both): (a) `search-v2-rrandom4` **NOT SHOWN, loses badly**; (b) `search-v2-rrandom4-m40`
  **NOT SHOWN, worse, not badly**. So random-v4 is not an iteration that loses badly (D527 point 7: only when every
  arm does), and the loop did not stop.
- **The guardrail did nothing; the margin did.** R8 made lethal-aware fired 0.0022 a random rollout
  (`v4.goodBlockLethal`, 1,033 in (a)'s 464,833 random rollouts), against `v4.goodBlockRefused` 0.0232: good blocks
  that also keep the seat alive under a lethal attack barely exist, and (a)'s point sat 8.7 Elo under J201 (a)'s.
  (b) − (a), the margin alone on the same deals, was **+18.6 Elo on the point** (about ±19 of noise), and the
  override counts say how: the arm replaced Forge's answer in **33.3%** of its searched decisions at margin 20 (priority
  39.5%, attack 19.8%, block 22.1%) and in **26.4%** at margin 40 (31.7%, 14.3%, 18.0%), where search-v2 itself, on
  the other side of the same matches, replaced it in **18.0%** (19.0%, 14.6%, 18.6%). The two arms' rollouts were the
  same (the margin is read by the verdict alone: `v3.goodBlock` 0.0209 and 0.0231 a rollout, rollouts a decision ×1.141
  and ×1.134 search-v2's at equal ms). So the margin did not make the random values better: it made the search trust
  them less, and the arm moved toward the seat it would be with no override at all.
- **That seat is the question now.** As the margin rises, the arm converges on the seat the search sits on with the
  search off: Forge's Default AI behind D310's outlet policy, which is the ladder's **`policy-outlet`** (kind
  `policy`, `Default+outlets`, hash `e350d94649a4`). Whether the random values carry **any** signal beyond Forge's
  own choice is then read against that seat on the same deals, not only against search-v2: an arm that gains on
  search-v2 only by overriding less could be gaining by becoming `policy-outlet`.
- **Is that baseline already on this host?** Not exactly. The match nearest it is **J194 (a)**, `search-v1-anytime`
  against **`forge-default`** (`Default`, `3ed453ffef1c`), 1,200 games on exactly these blocks
  (114,900,000–114,900,149; match id `…:20261106T013313-3031475`): search-v2 **+87.5 [+72.1, +103.2]**, so
  `forge-default` **−87.5 [−103.2, −72.1]** from its own side. But `forge-default` is not the seat under the search:
  both are `Bootstrap.createAiSeat` seats, and they differ in D310's outlet policy, off in `forge-default` and on in
  `policy-outlet` and in search-v2 (`PolicyControllerAi.choose0`: the outlet policy answers first, the search only
  reconsiders a priority none of its rules claimed). On J194 (a)'s search-v2 side the outlet policy acted **311 times,
  in 72 of the 1,200 games** (`policy.LETHAL` 154, `COMBAT` 58, `CAST_OUTLET` 41, `THREATENED` 32, `FODDER` 26). No
  results line on this host names `policy-outlet` at all. So the exact baseline is not here, and J204 plays it; J194
  (a) is quoted beside it as information.
- **What the information already says (not registered, and no check reads it).** J202 (b)'s −20.9 against
  `forge-default`'s −87.5 on the same deals is **+66.6 Elo**, about ±20 of noise (√(13.2² + 15.55²) from the two
  intervals): a search over random-v4 rollouts at margin 40, with no Forge in its rollouts, played about three
  quarters of search-v2's own gain over the seat under it. Unless the outlet policy is worth tens of Elo on these
  decks (it acted in 6% of games), J204 will read **SIGNAL SHOWN** by a wide margin, and the question left open is
  the other one: whether random values can match Forge's, which D527's table against search-v2 keeps asking.

**Decision.**

1. **random-v5 is an iteration, not a rollout value.** No guardrail is added or changed, so there is no `random5`:
   the hash rule (D525 point 3, D527 point 5) is that a changed definition takes a new rollout value, and nothing is
   changed. random-v5's one random arm seats `rollout=random4` exactly as D527 built it (`Config.randomV4Block()`, both
   rollout seats); `random5` stays free for the next change to a guardrail.
2. **Arm (a), `search-v2-rrandom4-m60`**: `search-v2-rrandom4-m40` with D312's `margin` at **60** for 40 (the leaf
   points an alternative's mean must beat Forge's own answer's by to override it; 20 in search-v2, about 1 point of
   win rate at 50% on D349's scale, so 60 is about 3), every other param search-v2's. One change from J202 (b), read
   against it (the margin chain: 20 → 40 → 60) and against (b) below. The margin is read by the verdict alone
   (`SearchPolicy.Report.verdict`); the rollouts, the anytime loop's budget, rounds and stopping are J202's.
3. **Arm (b), the baseline, `policy-outlet`**: the existing ladder player (kind `policy`, `{profile: Default, outlets:
   on}`, seat config `Default+outlets`, hash `e350d94649a4`, registered with D310 and unplayed on this host),
   **byte for byte the seat search-v2 sits on with the search off** — search-v2's seat config is this one with
   `+search:…` appended, and `web/test/ai-ladder.test.ts` holds that. It plays the same 1,200-game match against
   `search-v1-anytime` on the same deals. It searches nothing, so it has no D527 reading; it is the "no override at
   all" end of the margin line. `forge-default` is not it (Context), and its J194 (a) line is printed beside, as
   information.
4. **The night** (drafted as J204): (a) then (b), each a fixed D398 match of **1,200 games on the confirm set against
   `search-v1-anytime`, `alone: yes`** (D521: the budget is wall-clock, so contention changes the rollouts; (b) has
   search-v2 on its other side). Both matchups are new on this host, so both take blocks 114,900,000–114,900,149: the
   same 600 deals as J194, J195, J199, J201 and J202.
5. **The players.**

   | player | role | seat config | config hash |
   |---|---|---|---|
   | `search-v1-anytime` (search-v2) | the opponent of both | `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1` | `cdd55e02a89c` (unchanged) |
   | `search-v2-rrandom4` (D527) | J202 (a), margin 20 | the same plus `,rollout=random4` | `646d59a008f6` (unchanged) |
   | `search-v2-rrandom4-m40` (D527) | J202 (b), margin 40 | `search-v2-rrandom4`'s with `margin=40` | `968c9003c616` (unchanged) |
   | **`search-v2-rrandom4-m60`** | **J204 (a), margin 60** | `search-v2-rrandom4`'s with `margin=60` | **`216e66d89fe3`** (new) |
   | **`policy-outlet`** (D310) | **J204 (b), no search** | `Default+outlets` | **`e350d94649a4`** (existing, unchanged) |
   | `forge-default` | J194 (a), information only | `Default` | `3ed453ffef1c` (unchanged) |

6. **The pre-registered rule for J204** (written on 2026-11-09 before any rated game of either; the night's job quotes
   it word for word). Two readings, each from the match lines alone.

   *First, D527's table for (a)*, unchanged: `search-v2-rrandom4-m60` against `search-v1-anytime`, read once by the
   first row that holds — **SHOWN** (lower end above 0.5 and point at least +15 Elo: Forge leaves the rollout loop for
   this arm, after a 4,800-game confirmation under D519's readings holds it), **INCONCLUSIVE** (upper end at least +15
   and lower end at most 0.5: confirm at 4,800 games under D519's readings before anything), **NOT SHOWN,
   indistinguishable** (upper end below +15, the interval contains 0, and its lower end is above −15 Elo: a candidate,
   confirmed at 4,800 games before it replaces Forge in the loop), **NOT SHOWN, worse, not badly** (upper end below 0
   and at least −15 Elo: diagnose and iterate), **NOT SHOWN, loses badly** (upper end below −15 Elo: the same, the
   principle's cheap path in doubt) — with D527's three unreached cases read as D527 reads them (a lower end above 0.5
   with a point under +15 and an upper end at least +15 is INCONCLUSIVE; an interval wholly at or above 0 with an upper
   end below +15 is NOT SHOWN, no weaker, a candidate; an upper end of exactly 0 is worse, not badly) and its too-wide
   case (an interval containing 0 with its lower end at or below −15 is worse, not badly).

   *Second, SIGNAL*: does the random value carry any signal beyond Forge's own choice? `diff` = (a)'s Elo point minus
   (b)'s, each against `search-v1-anytime` on the same deals, each from its own match line (`elo`, the arm the match's
   first player). Its noise is the two intervals' half-widths combined, `hw` = √(((a.eloHi − a.eloLo)/2)² +
   ((b.eloHi − b.eloLo)/2)²) (about ±19 at 1,200 games each, D525's residual), and its interval [`diff − hw`,
   `diff + hw`]; the shared deals may narrow the true one, unmeasured, so this is the conservative width. Read once,
   only when both matches are complete:

   | reading | when | what it decides |
   |---|---|---|
   | **SIGNAL SHOWN** | `diff` ≥ +15 and `diff − hw` > 0 | the random values carry signal beyond Forge's choice: the track stays open on the margin/LCB line (point 8) |
   | **SIGNAL AGAINST** | `diff` ≤ −15 and `diff + hw` < 0 | the random values are worse than no search at all: the track closes |
   | **NO SIGNAL** | `diff − hw` ≤ 0 ≤ `diff + hw` and \|`diff`\| < 15 | no signal at margin 60 at ±15 on the point (not a finding of equivalence): the track closes |
   | **SIGNAL INCONCLUSIVE** | anything else (a small signal whose interval excludes 0, or a large point whose interval reaches 0) | the track stays open for one more iteration on the margin/LCB line, whose decision registers this reading again; two successive SIGNAL INCONCLUSIVE readings close it as NO SIGNAL does |

   The four rows exclude each other, so the order does not matter. **The track closes** (D523 point 10's stop, the
   owner told, with the counters, which way it went; a **D529** writes the closing from the track's closing draft,
   with this night's numbers) on NO SIGNAL or SIGNAL AGAINST — **unless (a) is a candidate** under the first reading,
   in which case the 4,800-game confirmation runs first and the closing waits on it (a candidate is an arm level with
   search-v2, which is the track's goal, whatever its distance from the seat under it): if the confirmation holds, the
   track reached its goal and stays open; if it fails, the track closes as on NO SIGNAL. D529, if it is written, words
   a NO SIGNAL reading as this table does — no signal at margin 60 at ±15 on the point — and never as equivalence. An
   incomplete match gives its reading nothing and is reposted, the verdict naming which ((b) alone when (a) is
   complete); the SIGNAL reading needs both.

   **The SIGNAL INCONCLUSIVE count is kept in the match lines**, not in this text: random-v5 is the first SIGNAL
   reading, so J204's count is its own (the verdict emits `signalInconclusiveCount`, 0 or 1), and random-v6's job
   re-reads J204's two match lines on the host to count it, as J204 reads J202's for point 7.

   Reported beside, deciding nothing: J202 (b) minus (b) (margin 40 against the same baseline on the same deals, about
   ±20 of noise); (a) minus J202 (b) (the margin 40 → 60, which also fixes random-v6's margin, point 8) and (a) minus
   J202 (a) (20 → 60), each about ±19 of noise; whether both matches start at block 114,900,000 (a memory retry starts
   later, and its deals then differ in part); `diff` as a share of search-v2's own gain over the seat under it, `diff / (0 − b.elo)` (the
   fraction of what the search does over Forge's own answer that random values keep, when (b) is below 0); (b) beside
   J194 (a)'s `forge-default` (the outlet policy's worth, about ±21 of noise); each side's overrides of Forge by kind
   against J202's; ms and rollouts a decision; every `search.rr.*` per random rollout.
7. **The loop's count** (D523 point 10, D525 point 7, D527 point 7). random-v4 did **not** lose badly as a whole (J202
   (b) read worse, not badly), so the count of successive iterations that lose badly **restarts at 0**. random-v5
   registers one random arm, (a), so it is an iteration that loses badly exactly when (a) does (count 1); `policy-outlet`
   is a baseline and counts for nothing. So **the two-losing-iterations stop cannot fire on this night**. This night's
   stop is the SIGNAL rule, written here before any game: NO SIGNAL or SIGNAL AGAINST closes the track (point 6), the
   paused `-self` path (D525 point 3) with it; and two successive SIGNAL INCONCLUSIVE readings close it too, counted
   from the match lines as point 6 says (J204's own reading is the first).
8. **What follows each case.** A candidate (a): its 4,800-game confirmation, posted as its own job (D527 point 6).
   (a) to diagnose with SIGNAL SHOWN or INCONCLUSIVE: random-v6 continues the margin/LCB line, one change: D350's
   `override=lcb` (the paired difference's lower bound must clear the margin), the arm D527 kept "for a later arm if
   the margin moves the overrides and not the score" — here the margin moved both, so it is the verdict's noise-aware
   form of the same lever. **Its margin is fixed here, before any game**: 60, unless (a)'s Elo point minus J202 (b)'s
   is below 0, then 40 (the verdict emits it as `v6Margin`); no choice is left for after the night. A closed track: no
   random-v6; what would reopen it is the closing draft's list (a seating where the search decides the random
   defender's blocks; a learned rollout policy, D522's step 2 with a teacher that is not Forge).

**Rejected.**

- **Citing J194 (a) as the baseline** and making J204 a one-match night. It is on these deals at 1,200 games, but
  its seat is `forge-default`, outlets off, and search-v2 sits on outlets on: the policy acted in 72 of J194 (a)'s 1,200
  games. The brief's test was the exact seat; it is quoted as information, and the night measures `policy-outlet`
  for about 1.3 hours (J194 (a)'s own wall) rather than read a baseline one rule away.
- **A new rollout value (`random5`) for this iteration.** Nothing in the rollout changed; a new value would be the same
  code under a new hash, and the hash rule exists to tie a value to a definition.
- **Margins 60 and 80 in two arms.** One change at a time, as D525's and D527's chains; the SIGNAL reading needs one
  arm, and an 80 is the next step if 60 moves the score again.
- **An infinite margin as the baseline** (`margin=1000`). It never overrides, so it plays `policy-outlet`'s answers
  at search-v2's cost, about a second a decision for nothing (twice (b)'s wall), its rollouts' copies the only
  difference; `policy-outlet` is the seat itself.
- **`override=lcb` now.** It answers the noise more directly, but it would be a second change beside the margin and
  could not be read against J202 (b); it is random-v6's step when the track stays open.
- **Reading SIGNAL against `forge-default`'s J194 (a) line.** It decides nothing here because it is the wrong seat;
  it is printed beside, and (b) − J194 (a) is the outlet policy's worth on these deals.

**Measured.**

- No file under `bridge/src` changes, so no self-test changes; `./bridge/build.sh` (nice 19) is green as on main:
  `lint-bridge-selftest OK: 33 rules, 79 firing cases`, `bridge lint OK (95 file(s) under bridge/src, 3 under tools/; 33
  rules)`, `decision selftest: 337 check(s), 0 failure(s)`, `build OK`.
- `web/test/ai-ladder.test.ts` (47 tests, 47 passed): `search-v2-rrandom4-m60`'s raw params are search-v2's plus
  `margin: 60` and `rollout: random4`, its resolved params `search-v2-rrandom4`'s but `margin`, its seat config
  `search-v2-rrandom4`'s with `margin=60` (and `-m40`'s with 60 for 40), hash `216e66d89fe3`; `policy-outlet` is kind
  `policy` with search-v2's profile and outlets and nothing else, seat config `Default+outlets`, search-v2's seat config
  is it with `+search:…` appended, hash `e350d94649a4`, and `forge-default`'s config is not it; D525's and D527's arms,
  `forge-default` and search-v2 keep their hashes.
- **The pilot**: D523's recipe, `./tools/ai-ladder.sh match <arm> search-v1-anytime --games 2 --batch-pairs 1 --jobs 1
  --purpose pilot --dir var/pilot-rrandom5/<arm>` at nice 10, 4 games each on one worker (seed 114900000, the same
  deal for both), beside the lab's J203 (load average about 8), `search-v2-rrandom4-m60` first, then `policy-outlet`,
  about 2.5 and 1.5 minutes. Each match line names its players at the hashes above. Read with J202's `rollouts.cjs`
  (J204's adds each side's outlet-policy actions, the `policy.*` keys); `docs/evidence/experiments.jsonl`'s pilot
  lines reverted.

  | match (4 games) | side | decisions | ms a decision | rollouts a decision | rounds a decision | play ms a rollout | copy ms a rollout | overrides (priority) | rollout errors |
  |---|---|---|---|---|---|---|---|---|---|
  | rrandom4-m60 vs search-v2 | **rrandom4-m60** | 84 | 779 | **20.27** (×1.22) | 8.17 | 33.8 | 3.8 | 10, 11.9% (7/49) | 0 |
  | | search-v2 | 87 | 753 | 16.62 | 6.76 | 40.4 | 3.6 | 11, 12.6% (7/49) | 0 |
  | policy-outlet vs search-v2 | **policy-outlet** | — | — | — (no search) | — | — | — | — | — |
  | | search-v2 | 94 | 859 | 16.89 | 6.84 | 45.9 | 3.7 | 21, 22.3% (13/59) | 0 |

  Both matches complete, no engine error, no timeout, no budget fallback, one `unmappable` fallback on each searching
  side. `rrandom4-m60` 2–2: 1,718 random rollouts (both seats), R7 2.08, R3 1.12, R4 0.27, R2 0.027, R8
  `v3.goodBlock` 0.016 a rollout, no `v4.` fire on this deal, 0 random-seat failures; search-v2's side carries no
  `search.rr.*`. `policy-outlet` 1–3: its side searched nothing and its outlet policy did not act on this deal (no
  `policy.*` key; J194 (a)'s search-v2 side, the same seat under its search, acted 311 times in 72 of 1,200 games).
  The pilot is 8 games: a cost and a liveness check, not a strength reading.

**Residuals.**

- **`hw` ignores the shared deals.** Both matches play the same 600 deals, which correlates their scores and would
  narrow the difference's true interval; the rule takes the conservative sum of variances, so it can call a real
  small signal INCONCLUSIVE, never call a null one SHOWN more often than its own matches' intervals allow.
- **(b) is not the arm at an infinite margin, exactly.** With the search on, a rollout copies the game but the seat
  also spends its wall-clock budget, and the opponent's share of the machine differs; the ladder plays both at `alone`,
  so this is the same small difference every arm already carries against search-v2.
- **The margin is in leaf points, not win rate.** 60 leaf points is about 3 points of win rate near 50% on D349's
  scale and less near the ends, so the bar is uneven across positions, as at 20 and 40.
- **A NO SIGNAL closing is about this rollout family.** It would say random-v4's values at this margin add nothing to
  Forge's choice on these deals; it would not test a learned rollout policy or a search that decides the random
  defender's blocks, which the closing draft lists as what would reopen it.

**Follow-up.** The cube lab's 47 (`PLAN.md`): J204, the two 1,200-game matches above, and the track's next step on the
SIGNAL reading (point 6).
