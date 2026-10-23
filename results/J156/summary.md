# J156 — the move atlas, rung 2 (D451): summary

Written by the PC session, 2026-10-23, from `report/reads.json` (the job's own `reads.py`), the twelve `report/*.atlas.json`/`.atlas.md`, `exits.txt`, each spine's `units.jsonl` and `branches.jsonl`, the vintage frame logs, the job's `metrics.py` re-run over the final folder, results/J156 (STATUS, failure.txt, pilot, run1–4 logs), the job file, HEARTBEAT.md, the vintage decks, Forge's scripts for Laelia and Six, and `Explorer.java`, `SearchPolicy.java` and `atlas.ts` at 6fb13bf9.

**Method only.** D451 registers no rule on what the maps say. The one verdict below is (iv)'s, which was registered.

## How it got here
- **J150:** the pilot failed on a one-off selftest worker exit and an over-strict `noRepeatRefused` check, which was dropped.
- **J151:** aborted on `unit_errors > 30` because of heap OOMs. They were our leak, not Forge's pay loop: each branch's GameLedger held its game copy until the unit ended (#183, D465).
- **J152:** aborted at start, because its abort metric read J151's leftover `units.jsonl`.
- **J153 and J154:** the pilot failed on the "two maps" node test, which passed 30 of 30 runs elsewhere. J155 skipped it in the pilot.
- **J155** (4096m, before #183) lost 10 of 31 units to the leak and was stopped.

## The run
- **Start.** Posted 14:55, pinned to 6fb13bf9. The pilot passed 17/17 at 15:00, and G5 fired 5 times in the 60-game smoke.
- **Workers.** 6, memory-sized beside the GPU lane.
- **Blocks.** run1, run2 and run3 exited 0 at 22:32, 02:28 and 05:27: 14.4 h against the 16 h estimated at 7 workers.
- **Units: 1,389 of 1,390 ok** (8 × 160 + 110; spine 460 listed only 11 decisions). The heartbeat's "1,429 of 1,430" was a miscount.
- **No leak.** One worker retired after two OOMs on 458, and #183's resume finished its unit.
- **Why the runner says "failed".**
  - 458's unit d9-random-150 hung twice on the same branch (d9, option 0, b165): deterministic.
  - The 120-s branch timeout did not end it; the 30-min unit watchdog did. The unit stopped at 75/125.
  - The end-of-spine checks then died on that branch's two truncated frame logs (`unexpected end of file`, exit 1), so no `atlas.json` was written.
  - run4's `cp` failed, and run4 exited 1 at 05:27.
- **The hand repair.** The PC moved the two logs to `b-vintage7-458/truncated/`, wrote 458's atlas with `--phase report` and ran run4's block by hand (06:41). Every number below is reads.py's, on the job's own data.
- **Exits.** a-vintage7 3, 458 1, 459 3, 460 3; the rest 0. The 3s are the G1 flags in (v); the 1 is the crash above.
- **Had run4 passed,** 10 of the 14 final checks pass. Four fail: `unit_errors` 2, `unitsShort` 1, `guardViolations` 200 and `problems` 41.

## A gap the run log does not show: 458 is 9 of 16 complete
- **The errors.** 6,615 of 458's 16,990 branch games errored (39%):
  - 6,480 `optional costs are not copied` (`SearchPolicy.mapSa` refuses any play carrying an optional cost);
  - 133 NPEs;
  - 2 OOMs.
- **Which options.** From d5 on, all 240 branches failed for each cast of Bowmasters, Retrofitter Foundry, Recurring Nightmare, Tireless Tracker, Walking Ballista and Eternal Witness. The likely cause is retrace casts from the graveyard after Six (cast at d2), since Forge's `OptionalCost` has `Retrace`.
- **The cost.** Seven decisions (d5, d7, d8, d10, d12, d14 and d15) lack a value at one or more options: 139 − 7 = 132 complete. The hung unit only shortens d9 (n 177 random, 36 Forge).
- **Spine 460** lost 23 block branches to an NPE.
- **Not flagged.** The atlas named none of this as a problem. Next file: count branch errors in `atlas.problems`.

## Phase A: 2,400 rollouts a pair, both seats random, 0 engine errors

| pair | seat A score | A / B / draws | turns mean, median, 10–90th | rollouts for ±2 |
|---|---|---|---|---|
| ff5 | 54.7% [52.7, 56.7] | 1,270 / 1,045 / 85 (cap) | 26.1, 25, 19–35 | 2,296 |
| peasant7 | 71.2% [69.4, 73.0] | 1,709 / 691 / 0 | 20.5, 20, 15–26 | 1,970 |
| vintage7 | 53.3% [51.3, 55.3] | 1,276 / 1,118 / 6 | 20.2, 19, 14–27 | 2,386 |

## Per spine

| spine | baseline | listed | branched | decided / Q | same best (of Q) | mean ρ (n) |
|---|---|---|---|---|---|---|
| ff5 452 | 20 turns, B | 26 | 16 | 0 / 16 | 11 | 0.353 (12) |
| ff5 453 | 17, B | 26 | 16 | 0 / 16 | 10 | 0.751 (14) |
| ff5 454 | 19, A | 27 | 16 | 0 / 16 | 9 | 0.532 (16) |
| peasant 455 | 21, B | 34 | 16 | 0 / 16 | 10 | 0.241 (14) |
| peasant 456 | 23, A | 33 | 16 | 0 / 16 | 8 | 0.305 (13) |
| peasant 457 | 15, B | 17 | 16 | 0 / 16 | 7 | 0.011 (15) |
| vintage 458 | 11, A | 18 | 16 (9 complete) | 2 / 7 | 3 | 0.233 (5) |
| vintage 459 | 14, A | 17 | 16 | 6 / 10 | 4 | −0.113 (10) |
| vintage 460 | 12, B | 11 | 11 | 0 / 11 | 4 | −0.106 (6) |

## The reads
- **Intervals:** 95% bootstrap, pair → spine → decision. The pooled pair level is coarse (three pairs give ten compositions), and so is each pair's spine level (three spines). Both are wide by design.
- **Base:** 139 decisions, 132 complete, 8 decided (every option ≥ 95 under both maps; all 8 vintage). **Q = 124.**

**(i) Same best before decided.**
- **Pooled: 0.532 [0.375, 0.653]**, n 124.
- ff5 0.625 [0.479, 0.771] (48); peasant 0.521 [0.354, 0.688] (48); vintage 0.393 [0.214, 0.583] (28).

**(ii) Mean ρ.**
- **Pooled: 0.287 [−0.065, 0.569]** over 105 rankable decisions, 38 of them two-option (ρ is ±1 by construction there).
- **ff5 0.554 [0.289, 0.774]** (42); peasant 0.179 [−0.121, 0.459] (42); vintage −0.028 [−0.400, 0.412] (21).
- Over Q alone: 0.292 [−0.076, 0.569] (103).
- **Against J148.** J148 measured −0.34 [−0.63, −0.03] on ONE spine of this same pair. Three fresh spines reverse it: 0.353, 0.751 and 0.532, with a pair interval above zero. The two runs are read side by side and not pooled, because G5 changed the random policy.

**(iii) Regret at Forge's choice** (best minus option 0, in points, over Q):

| kind | n | random map | clear of 0 | Forge map | clear of 0 |
|---|---|---|---|---|---|
| priority | 91 | 5.1 [1.5, 9.2] | 24 | 6.6 [0.8, 10.9] | 19 |
| attack | 25 | 3.8 [1.3, 6.8] | 4 | 11.6 [0.8, 21.1] | 8 |
| block | 8 | 3.2 [0.0, 6.9] | 2 | 10.7 [0.0, 27.0] | 2 |

- **Priority by pair:**
  - random map: ff5 8.9 [5.2, 13.7], peasant 3.5 [1.7, 5.8], vintage 1.5 [0.4, 2.9];
  - Forge map: 7.5 [3.2, 12.8], 9.4 [4.8, 15.7], 0.7 [0.2, 1.7].
- **Leans high.** The best is picked after the fact, so regret is ≥ 0 and leans high.
- **Forge's map is wide.** At n 40 an option, it is about twice as wide as the random map.

**(iv) J148's candidates, repeat pair, seeds 452–454.**
- **C1 "cast now where Forge passes": HOLDS.**
  - The cast/activate value minus pass's, random map: **+8.3 points [4.2, 13.3]**, n 35. This is a difference in value, not a regret.
  - Forge's map: +3.3 [−0.0, 6.5]. J148: +1.3 over 18.
- **C2 "don't attack where Forge attacks": NOT SHOWN.**
  - n 4, and reversed: −16.8 [−35.4, −3.5].
  - Forge's map: −15.6 [−26.3, −2.5].
- **Direction, not value.** Under G5 this repeats a direction, not a value.

**(v) Guardrails.**

| pair | logs | land offered / taken | kept | violations | G3 noRepeatNoOp | G5 refusedCast / noRepeatRefused |
|---|---|---|---|---|---|---|
| ff5 | 76,000 | 349,260 / 349,260 | 4,800 / 4,800 | 0 | 109,293 | 4,942 / 0 |
| peasant7 | 66,800 | 192,865 / 192,865 | 4,800 / 4,800 | 0 | 0 | 0 / 0 |
| vintage7 | 49,900 | 176,843 / 173,772 | 4,800 / 4,800 | 200 | 20,637 | 0 / 0 |

- **`forgePayCap`** was 0 everywhere.
- **`payfail` beside G5.** ff5's worker logs hold 4,961 "Didn't find what to pay for" lines against 4,942 refusals: one line a refusal. J148 logged 1,066 in this pair's branches.
- **`noRepeatRefused` 0 of 4,942.** No refused play was ever offered again in its window. Either #181's land-count key moves the window first, or the listing already drops an unpayable play, or the counter is miswired.
  - Next file: a planted refusal, then a same-window decision that would still list the play.
- **Vintage G1.**
  - **The count.** 200 is the checker's cap (50 listed per atlas × 4). The true count is **3,071 offered-not-taken** (phase A 321; 458 1,834; 459 496; 460 420). The 30 ATLAS PROBLEM lines are each atlas's first ten.
  - **The deck.** Seat 1 is vintage-900000007-B. Its lands are 7 Plains, 8 Mountain, Plateau and Arid Mesa: no Workshop, Bazaar, Strip Mine, Library or Urza's land.
  - **All 3,071 lands were in exile, none in hand.** Laelia, the Blade Reforged (deck B) exiles the top card on attack: "You may play that card this turn".
  - **2,518 came after the seat had already played a land that turn** (mostly MAIN2). The land was not legal there.
  - **The other 553** are all on 458, in branch logs that can start mid-turn. The logs cannot settle them.
  - **The seat's own option list held none of them.**
  - **So: the checker, not the seat.** The decision record G1 reads lists play-permitted exile lands without the land-drop limit.
  - **The fix:** build the record's options and the seat's from one listing. Plant "Laelia attacks after a land drop; the exiled land is not listed". If a flag survives on a land from hand, it is the seat's.

**(vi) Rung 3's sizing.**
- **reads.py:** 3.4 options a decision, 817 branch games a label, 2.06 s a random branch and 1.56 s a Forge branch, **1,614 worker-s a label: 15.6 a 7-worker hour, 156 a 10-h night.** Q's share 0.939.
- **Measured end to end:** 139 decisions in ~13.3 h of phase B and checks at 6 workers: ~10.4/h, ~12/h scaled to 7. Checks take ~20% of the wall time.
- **Branch rate:** phase B averaged 10,253 branch games/h, from 6,751 (ff5 454) to 20,556 (vintage 459). The ~14,000/h late in run3 is vintage's short games.
- **1,000 labels:** ~64 h by reads.py, ~83 h at the measured pace with 7 workers: 7–8 nights.

## Known gaps
- **One unit short:** d9 on 458 has n 177 random and 36 Forge.
- **Two frame logs excluded** from 458's checks.
- **458 is 9 of 16 complete** (the retrace fork error). The NPE branches (133 on 458, 23 on 460) dropped out of their options' means.
- **The vintage G1 flags** make `atlas.problems` ≠ 0 on four atlases (a-vintage7, 458, 459, 460), and the cap hides the true count.
- **16 decisions a spine were capped:** 139 of the 209 listed.
- **Forge's map** rests on n 40.
- **The random map's opponent does not punish.** Its values are against random play.
- **"Decided" means won only.** 9 complete decisions with every option ≤ 5 under both maps sit in Q.
- **The runner's record is "failed".** The reads were finished by hand; no job code changed.

## What it says
Before the game is decided, the two maps agree on the best move about half the time: 0.53 [0.38, 0.65] over 124 decisions. Their rank correlation is positive on the repeat pair (0.55 [0.29, 0.77]), which reverses J148's one-spine −0.34, and it cannot be told from zero on peasant or vintage. J148's "cast now where Forge passes" holds on three fresh spines (+8.3 points [4.2, 13.3]), "don't attack" is not shown, and the vintage G1 flags are the checker over-listing Laelia's exiled lands, not the seat skipping a land.
