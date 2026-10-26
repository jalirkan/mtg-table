# J171: move atlas 4b, the first night on D486's random seat: summary

Written 2026-10-26 by a read-only pass: no engine, no browser, nothing written on the data folder or in the repo. Numbers
come from `results/J171/` (STATUS, checks.txt, metrics.json, run1-15.log), from `lab-j170/report/` (tool.json,
labels.json/.jsonl, reads.json, cuts.json, compare-j168.json, lost-*.json), from the spine folders, and from three
scripts of mine in `report/bin/`. **This is a new population (D486, contract v4). J168/J169 numbers below are another
population, for comparison only.**

## The run

- 00:22-11:55 EDT, **11 h 33 min** (estimate ~10.5 h, range 9.5-12). The 13 spines took 11 h 18 min of that.
- 6 workers. One memory dip to 5 workers for 6 minutes (02:34-02:40). Peak worker RSS 1.56 GB.
- run1-run15 all exit 0. 85 of 85 pilot checks pass. **41 of 42 final checks pass; `atlas.problems == 0` fails with 5.**
- 71,940 branch rows. 0 engine errors, 0 timeouts, 0 unit errors. 10 errored rows, all on s12 (IndexOutOfBounds, the
  same kind J168 had there). 12.4 GB on disk.

## (1) The five problems: one record shape, not a leak

**All five are the redaction checker's M55 check failing on one shape of decision record.** No card was revealed.

| spine | logs failed | records of the shape | sample (line) | the spell behind it |
|---|---|---|---|---|
| s09 | 2,361 | 2,361 | d0-random-o0-b100-seat1 (145) | Tear Asunder |
| s02 | 1,212 | 1,426 | d0-random-o0-b1-seat0 (40) | Tear Asunder |
| s10 | 829 | 829 | d10-random-o0-b102-seat1 (266) | Tear Asunder |
| s04 | 61 | 62 | d0-random-o0-b148-seat0 (169) | The Wandering Emperor's +1 |
| s08 | 38 | 39 | d10-random-o0-b166-seat1 (231) | Minsc & Boo's +1 |
| **total** | **4,501** | **4,717** | | |

- **The message:** `decision N chosen null is not a token (M55, D347)`. s08's sample also prints `decision N chose null,
  which is not among its options`. I ran `node tools/check-redaction.mjs --empty-hand-ok` on one flagged log per spine.
  Each FAILs on exactly this and nothing else.
- **The shape:** `kind: "target"`, `by: "forge"`, `source: "targets"`, options listing cards, **`chosen: null`**, no
  `complete: false`, no `hidden`, no `explore` mark. I checked every one of the 4,717 records: all have this shape.
- **The count matches exactly.** A scan of all 143,880 logs for `"chosen":null` finds those 4,501 logs on the five
  spines, and none on the other eight.
- **What it is:** a targeting part left empty. Tear Asunder has two targeting parts and uses only one (kicked or not).
  The two planeswalker abilities say "up to one target". `Decisions.targets0` writes `chosen: null` when a part has no
  targets (`Decision.java` line 193). D486 now lists card candidates, so these records have options for the first time.
  Before D486 their options would have been empty.
- **Classification: a record shape the checker needs a rule for. Not a leak, not a tool fault.** This matches the
  coordinator's reading. The D487 lane is checking whether any chosen target falls outside its options.
- **Selftest shape, in D481/D485 terms:** a `target` record whose `options` are non-empty card/player tokens, `chosen`
  null (or the new `target:none`), with no `complete:false` and no `hidden`. It must pass as "an empty optional part,
  zero targets". A null `chosen` on any other kind still fails, and so does a null on a target record with no options.
- **Labels are unaffected.** This is how a record is written, not how a game was played. Rows, ids and forks all checked
  clean (`rowsUnmatched` 0, `forkProblems` 0, `leaks` 0).
- **Every other check is clean:** 0 errored or unavailable options over the bar, 0 repeated plays (D483), 0 short
  listings, 0 guard violations, 0 unreadable logs. There were 20 capped-option warnings (s01 18, s09 2). These are
  warnings, not problems.
- **Cost:** a batch that fails is re-run one log at a time. That roughly tripled redaction time on the five spines: s09
  375 s and s10 382 s, against 108 s on s01. My estimate is about 0.2 h of the checks' 0.65 h.

## (2) The night per spine

Full tables: `report/night.md`. Walls are at 6 workers; J168's wall is in brackets.

| spine | listed | k≥3 | branched | screened | stopped | rows | labels / conf | capped | wall min |
|---|---|---|---|---|---|---|---|---|---|
| s01 | 23 | 9 | 8 | 0 | 3 | 5,720 | 8 / 2 | 28.4% | 46.8 (47.8) |
| s02 | 6 | 1 | 5 | 1 | 0 | 2,075 | 5 / 1 | 10.2% | 32.4 (29.4) |
| s03 | 22 | 8 | 8 | 1 | 6 | 4,550 | 8 / 2 | 3.9% | 38.0 (48.6) |
| s04 | 17 | 12 | 8 | 9 | 4 | 5,775 | 8 / 1 | 0.1% | 79.7 (34.2*) |
| s05 | 12 | 11 | 8 | 3 | 11 | 6,325 | 8 / 2 | 5.6% | 61.4 (46.2) |
| s06 | 23 | 14 | 8 | 6 | 30 | 6,525 | 8 / 4 | 0 | 72.8 (75.3) |
| s07 | 16 | 10 | 8 | 5 | 16 | 5,110 | 8 / 1 | 0.1% | 21.1 (22.4) |
| s08 | 24 | 16 | 8 | 7 | 21 | 6,750 | 8 / 4 | 0 | 66.4 (65.7) |
| s09 | 27 | 12 | 8 | 9 | 11 | 6,075 | 8 / 1 | 5.3% | 54.0 (49.9) |
| s10 | 46 | 31 | 8 | 0 | 10 | 6,500 | 8 / 3 | 1.2% | 58.2 (52.3) |
| s11 | 22 | 15 | 8 | 4 | 8 | 6,450 | 8 / 4 | 0.6% | 74.7 (61.0) |
| s12 | 14 | 5 | 8 | 0 | 8 | 3,650 | 8 / 2 | 0.1% | 38.6 (36.0) |
| s13 | 32 | 18 | 8 | 1 | 10 | 6,435 | 8 / 1 | 3.3% | 33.2 (39.1) |
| **night** | 284 | | **101** | **46** | **138** | **71,940** | **101 / 28** | 4.2% | **677.5** (607.8) |

\* J168's s04 column is J167's run at bf978690. It had 3 labels, so this is not a like-for-like comparison.

- **"k≥3"** counts the baseline's listed decisions with 3 or more option tokens. D483 counts plays, so treat it as
  approximate.
- **s02 is short:** a 12-turn baseline with 6 listed decisions. Five were branched to fill the eight places (`fill` 5).
  s12 has 3 fill decisions.
- **Counters over the night:**
  - errors 10 (s12), timeouts 0, capped 3,028
  - chooseSourceGuard: 416 rows / 5,086 (s05 only, as in J168)
  - retargeted: 1,564 rows / 2,384 seat-counted (s03, s04, s06, s10, s12); `staleRefused` 0
  - modesDrawn 1,125 (s05 275, s08 850); cardTargetOffered 653,579
- **Card-targeting share of priority listings: 653,579 / 3,992,453 = 16.4%**, and it fires on all 13 spines. The range
  is 7.3% (s09) to 33.4% (s01). s05 reads 12.4%, close to D486's reproduction (11.9%).
- **Lost casts, confirmed from all 13 `lost-*.json`:** `lostCastOptions` is [] on every spine, so the check passes.
  - The residual is **645 lost casts in 423 branches, 1 of them forced** (on s08). No option loses its cast in more than
    12% of its branches (s09 d8 o0).
  - **s09 Fireball 545 (362 branches).** This is new, and it is D486. In my trace (d15-random-o0-b126), B's random seat
    drew 8 targets for Fireball, a spell whose cost goes up by 1 for each extra target. It tapped 3 lands, and the card
    sat on the stack with no `cast`. s09 also has 1,514 "Didn't find what to pay for" worker lines and 1,509 refused
    casts.
  - **s13 Bone Shards 36 and Vicious Offering 28.** In my trace (d0-random-o0-b108), A targeted its only creature,
    Sinister Starfish. That creature is the one the additional cost sacrifices, and the card stranded.
  - **Smaller:** s08 Primal Might 8, Flame of Anor 5, Prismari Command 4; s04 Pest Infestation 6; s01 Pyrotechnics 4;
    s07 Vicious Rivalry 3; s13 Candy Grapple 4, Disfigure 1; s11 Murderous Rider 1.
  - **s05 is fixed:** 0 lost casts, against J169's 1,614 (Suplex, Abrade, Branching Bolt).
  - **Labels touched:** s09's only confident label (d13) has 64 of its 850 branches with B's Fireball lost.

## (3) Sizing on the new population

| | confident | per 7-worker 10-h night | Poisson 95% |
|---|---|---|---|
| **J171, D486 seat, all 13** | 28 | **28.9** | **19.2-41.8** |
| J171 labels | 101 | 104 | |
| J171 by pool: pauper / peasant / legacy / powered | 6 / 8 / 7 / 7 | 21.5 / 34.3 / 36.6 / 26.5 | wide |
| *another population:* J169 (s05 out) / all 13 | 26 / 27 | 32.0 / 30.7 | 20.9-46.9 / 20.2-44.7 |
| *another population:* J168 all 13 | 27 | 31.1 | 20.5-45.2 |
| the review (cube pairs) | | ~25-27 | |

- I checked the arithmetic: 28 × 36,000 / 40,653 × 7/6 = 28.9. The exact Poisson interval [18.6, 40.5], scaled the same
  way, gives [19.2, 41.8].
- **28.9 is inside the review's range and inside J168's interval.** The night ran 11.5% longer for the same number of
  games:
  - a mean random branch of 2.71 s against J169's 2.54 s (+6.5%);
  - idle share 13.9% against 11.6%;
  - checks 0.65 h against 0.49 h, partly the failing logs' one-at-a-time re-runs.
- **The cuts:** 31.5% of branch time saved (early stop 16.4%, screen 15.1%; 46 screened, 138 stopped). J169 measured
  31.4%.
- **The checks:** 0.65 h, **5.75% of the night**, 32.5 s per 1,000 games. J168 measured 0.50 h, 4.9%. Without the
  failure re-runs I estimate about 0.43 h, about 4%.

## (4) J171 beside J168, across populations (compare.py)

| | J168 | J171 |
|---|---|---|
| listed decisions per baseline turn | 1.10 | 1.09 |
| options per decision in full | 4.13 | 4.03 |
| labels / confident | 97 / 27 | 101 / 28 |
| confident share | 0.278 | 0.277 |
| mean regret at Forge's choice | 0.047 | 0.044 |
| capped share | 3.3% | 4.2% |
| wall | 10 h 08 | 11 h 18 |

- **More options? No.** Option counts are the baseline's, and Forge plays the baseline. The baseline listings are the
  same everywhere except s05, which fell from 1.00 to 0.86 listed decisions per turn because uncastable modal spells
  leave the list, as D486 predicted.
- **Capped share rose** on s01 (21% to 28%), s02 (5% to 10%) and s09 (2.6% to 5.3%). Random games with card targets
  last longer there.
- **Per spine, confident labels moved both ways.** s11 went from 1 to 4 and s09 from 4 to 1, but the night total held at
  28 against 27.
- **Paired decision by decision against J169** (`report/paired-j169.json`; same spine, index, turn and option tokens):
  - 116 of 147 decisions pair; 69 have a label on both sides.
  - Same best option in 44 of 69 (64%).
  - Of J169's 21 confident labels among the pairs, **13 stay confident and 12 keep their best option**. 8 lose
    confidence and 8 gain it.
  - Option values moved by a mean of 5.2 points (median 3.5). **The labels depend on the rollout seat about as much as
    J169 expected.** s05 does not pair: its indices moved.
- **C1 "cast now where Forge passes" (iv):**
  - **s01 flips: random map −3.13 [−4.72, −1.48], NOT SHOWN** (J169: +4.09 [0.87, 7.52], HOLDS). The Forge map is
    +7.34 [0.78, 14.06].
  - s07: −0.99 [−5.98, 4.50], NOT SHOWN.
  - s13: +1.40 [−0.42, 2.50], NOT SHOWN.
  - Pooled over the three, random −1.6, Forge map +5.7.
  - **The one C1 that held before D486 does not hold on the new seat.**
- **Agreement on the Forge-map spines:** same best 0.583 [0.344, 0.875] against J169's 0.458; ρ 0.283 [−0.057, 0.875]
  against 0.228.
- **Random-map C1 on the other ten** (information): +4.24 [1.64, 7.36], n 54 (J169: +4.50).

## (5) D486's counters

- **When the best option is a card-targeting play** (`report/best-targets-j171.json`). An option counts as
  card-targeting when its forced cast's text names another card's id in at least half of 10 sampled branches. This is a
  heuristic.
  - 22 of 101 labels offer such an option (24 of 407 options). It is the best option in **10 of those 22**; chance would
    give about 1 in 4.
  - Among the 28 confident labels it is the best in **1** (s05 d0, Suplex).
  - J169's labels, read the same way: 16 labels, best in 7, and 0 of 27 confident.
  - **The forced options already targeted cards before D486.** D486 changes the continuations, not the options.
- **MODES_DRAWN records:** 1,704 (s05 50, s08 1,654), equal to the `source: "modes"` records (1,704). `modesDrawn`
  counters: 1,125 on the seats, matching the branch rows (1,125 rows, 14 label rows).
- **`complete: true`:**
  - 353,054 of 354,454 target records (**99.6%**); 298,687 of 300,087 of those that list a card (99.5%).
  - D486's reproduction was 627 of 627.
  - The 1,400 incomplete ones are s01 680, s02 666 and s09 54. All the ones I sampled are one-option records whose
    chosen target was added from the answer, which is the code's stack-target case. I did not trace any further.
- **D485 alongside:** `staleTargetRecords` 4,578, `staleRefused` 0.

## (6) What J172 should be

1. **The five problems first, without playing anything again.** The D487 lane needs to add the checker rule (the shape
   above, with selftest cases both ways) and, if it changes the emitter to `target:none`, it should keep accepting
   `chosen: null` on such records. Then **J172 re-checks the five spines in place**, as J169 did J168's: s02, s04, s08,
   s09, s10, about 25-30 minutes of checks. Rows and labels do not move.
   - If D487 only changes the emitter, these 4,501 logs keep failing. Re-branching the five would then cost about 5 h.
2. **A fix lane for D486's new lost casts before the next full night** (owner's call; they are information under the
   registered rule):
   - **Fireball-like costs** (each extra target costs more): draw the target count within what the seat can pay, or let
     G5 refuse it.
   - **A target that is also the additional-cost sacrifice:** Bone Shards, Vicious Offering.
   - Together that is 609 of the 645 lost casts.
3. **Small changes to the job:**
   - Count the redaction re-run time apart from the checks' share.
   - Record the per-spine lost-cast branch share in labels.jsonl. s09 d13's 7.5% is unmarked.
   - Collect `labels.jsonl` into results: only the head is there today.
   - `progress:` for the next night should be about 71,940.

## Unsure of

- **The cause of the empty parts** (Tear Asunder's unused part, "up to one"). It comes from five samples and the code, not
  from all 4,717 records. The D487 lane is checking it.
- **The Fireball and Bone Shards mechanisms.** Each rests on one traced branch, plus the counts.
- **The redaction overhead (~0.2 h)** is estimated from per-log rates on the clean spines.
- **The card-targeting option test** reads the engine's cast text. It is a heuristic, and it may miss targets the text
  does not name.
- **The J169 pairing** takes J169's final labels (`lab-j166/report/labels.jsonl`, v3) as the old seat, with J169's
  re-branched s06 and s10.
