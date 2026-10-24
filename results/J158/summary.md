# J158 — the move atlas, rung 3, the first labelling night (D451): summary of a stopped, withdrawn run

Written by the PC session, 2026-10-24, from the job's own readers run by hand over the finished data: `reads.py`, `labels.py` and `metrics.py` as the runner materialised them (`~/code/lab/mtg-table/var/lab-j158-local/bin/`, db496097), with the Report block's commands and paths, into `/home/justin-a/code/lab/data/lab-j158/report/`. Also read: `spine-times.txt`, `exits.txt`, every spine's `plan.json`, `atlas.json`/`atlas.md`, `phaseB/branches.jsonl` and `units.jsonl` (pauper5's partial one included), results/J158 (STATUS, pilot, prepare and run1–3 logs), the draft job file, results/J156 and J157, D470 (#191, merged), D471 (#192, open) and HEARTBEAT.md of 2026-10-24.

**Method only.** D451 registers no rule on what the maps say. The one registered verdict is (iv)'s; the sizing is the number this night was for.

## The run
- **Posted** 17:38 EDT 2026-10-23, pinned to db496097. **The pilot passed 26 of 26 checks at 17:44** (313 s): reads.py and labels.py reproduced J148's, J156's and J157's numbers (both sha256 pins); the ff5 smoke at seed 4600 logged G5 `refusedCast` 6 and `noRepeatRefused` 5, two labels, both rows matched.
- **Workers.** 6 (memory-sized; the job asked up to 7); peak worker RSS 1.14 GB.
- **Spines** (`spine-times.txt`, EDT):

| spine | start | end | wall | phase B | checks | exit |
|---|---|---|---|---|---|---|
| ff5 461 | 17:43:53 | 19:10:08 | 1 h 26 min | 71 min | 15 min | **3** (D470, below) |
| peasant7 463 | 19:10:12 | 20:56:05 | 1 h 46 min | 84 min | 22 min | 0 |
| pauper5 464 | 20:56:07 | stopped 00:11 | 3 h 15 min | — | — | none written |

- **The stop.** `tools/runner.sh stop` at **00:11 EDT 2026-10-24** (STATUS: finished 00:12:42), after 3 h 15 min of the third spine; **the job was withdrawn** and its pc-jobs copy deleted.
  - **The runner resumed it once.** At 00:13:37 it retried the stopped job at run3. At 00:14:37 it found the job file gone and marked J158 `skipped` (STATUS on origin).
  - **The data is as of 00:14:26.** In that minute pauper5's workers wrote rows and logs until then; no unit finished and no spine line was added. Every pauper5 count here is as of that time (6,065 branch rows, 80 units). Synergy9 465, modern7 466 and ff5 462 never started. The Report block never ran; this file's report is that block run by hand (*The report, by hand*).

**Why it was stopped.**
- **Pauper5's random branches ran into the 120-s step clock** (D467) in **4.0%** of branches: **243 of 6,065** branch games, every one a random continuation (0 of 960 Forge), 241 of them ended inside a step. Each cost a worker 120 s: together **8.1 worker-hours, 42% of the spine's branch time**. The cause is D471's (#192, G6): the random seat activated **Crypt Rats at X = 0**, which is free, thousands of times a branch (6,165 times in the replayed `d0-random-o0-b27`), because it never chose X.
- **It would not have finished.** At 00:11 it had **80 of 160 units** (6,065 of 14,400 branch games, 42%; the later decisions have more options). At that rate the spine needs ~7.7 h, and the 5-h block timeout would have failed it at ~01:56.
- **And the block decisions were void.** D470 (#191, merged) found that where Forge's own block was already on the copied combat and used every creature that could block, the seat was never asked again, so **every option played Forge's block**. In J158 that is 461 d10 and d30 (D470's table), and by the same signature d14 (below). The cloud asked that these stay in `labels.jsonl` marked `void: "D470"`, so the count stays honest.

## The two problems on ff5 461 (exit 3): D470
- **d10 option 0 `block:35>78`** (Kitesail Freebooter blocks Ledger Shredder): 47 of 240 branches errored (random 44, Forge 3), `NullPointerException: No band for attacker Ledger Shredder`.
- **d14 option 0 `block:21>71`** (Gray Merchant blocks Skyclave Apparition): 164 of 240 errored (random 126, Forge 38).
- **What D470 found under them.** The NPE is the forced block given at a *later* combat, because the fork's own combat never asked the seat. The branches that did not throw played Forge's block under every option. D470 point 1 fixes the install; point 2 makes an option the copy cannot give `unavailable`, not an error. **Neither is in this run** (db496097).

## The report, by hand
- **The Report block's commands, its paths, its readers**, from the data folder's `report/`: `b-ff5-461` and `b-peasant7-463` atlases copied in; `reads.json`; `labels.jsonl`, `labels.json` and `labels-head.jsonl`; `exits.txt`; `spine-times.txt`; `missing.txt`. Its last line (`rm -f var/lab-j158-local/armed.txt`, in the lab clone) was **not** run, because J159 is running in that clone. J158's marker is harmless while the job is withdrawn, but a re-post needs it removed and `lab-j158` moved aside by hand, as the job file says.
- **`missing.txt`: `b-pauper5-464: no atlas.json`.** No atlas was written for the partial spine (the J157 precedent: the report records the gap and goes on), so **every read below is over two spines**, ff5 461 and peasant7 463.
- **`metrics.py` by hand** (`report/metrics-by-hand.json`): 2 atlases, 2 problems, 0 violations, `refusedCastFf5` 172, `noRepeatRefusedFf5` 158, branchErrored 211, branchTimeouts 243 (241 in step), unitsShort 80 (pauper5's), `labels` 32, `confident` 6, `rowsUnmatched` 0.
- **The void mark.** labels.py's file is kept as `report/labels-raw.jsonl`. `report/labels.jsonl` is that file with one field added to every row (`void`), and `voidEvidence` on the marked rows. `labels-head.jsonl` was cut again from the marked file. The detection, below, is `report/void-d470.json`.

### The void rule, detected from the rows
- **The rule.** A label is `void: "D470"` when its decision is a **block** and, in **both** continuations, every branch index at which all options played (no error, no timeout) has identical `turns`, `steps` and `result` across all options. Each continuation needs at least one such index. This is D470's own signature, read from `branches.jsonl`, not a list of decisions.
- **Three matched, all on ff5 461:**

| label | Forge's block | random: identical / played (errored) | Forge: identical / played (errored) |
|---|---|---|---|
| d10 | `block:35>78` | 156 / 156 (44) | 37 / 37 (3) |
| **d14** | `block:21>71` | 74 / 74 (126) | 2 / 2 (38) |
| d30 | `block:25>80,40>81` (6 options) | 200 / 200 (0) | 40 / 40 (0) |

- **d14 is the one more than expected.** D470's table has it as "2 of 40 (74 of 200), the rest the NPE", and its chain names Gray Merchant as the only blocker, the same mechanism. Every branch of d14 that played at all played one game under both options.
- **Controls.** No non-block decision in the three spines (pauper5's partial rows included) has every option playing the same game. ff5 has no other block decision, and peasant7 and pauper5's first nine have none.
- **None of the three was confident.** All three are regret 0.0 [0.0, 0.0], "settled" (lost under every option) and "same best".

## Per spine

| spine | baseline | listed | branched | labels (void) | confident | decided / Q | same best (of Q) | mean ρ (n) | branch errors | wall |
|---|---|---|---|---|---|---|---|---|---|---|
| ff5 461 | 21 turns, B | 31 | 16 | 16 (3) | 4 | 0 / 16 | 7 (4 without the void) | −0.050 (11) | 211 (D470) | 1 h 26 min |
| peasant7 463 | 20, A | 23 | 16 | 16 (0) | 2 | 2 / 14 | 5 | 0.181 (10) | 0 | 1 h 46 min |
| pauper5 464 | 25, A | 32 | 16 planned, 8 played + d17 in part | — | — | — | — | — | 483 (below) | 3 h 15 min, stopped |

- **The confident labels** (random regret, points):
  - ff5 461: d6 6.5 [2.0, 11.5] (Mightstone over Freebooter), d8 6.0 [1.0, 11.5] (attack where Forge did not), d12 5.0 [2.0, 8.5], d18 11.5 [3.5, 18.5];
  - peasant7 463: d4 8.5 [3.0, 16.0] and d6 7.5 [2.0, 16.5].
  - Only ff5 d6 and peasant7 d4 are confident under the Forge map too.

## The labels: counts

| | labels | confident | voided | labels without void | confident without void | in Q (without void) |
|---|---|---|---|---|---|---|
| ff5 461 | 16 | 4 | 3 | 13 | 4 | 16 (13) |
| peasant7 463 | 16 | 2 | 0 | 16 | 2 | 14 (14) |
| **both** | **32** | **6** | **3** | **29** | **6** | 30 (27) |

- 32 branched, 32 complete, **0 rows unmatched**, `confidentForge` 2.
- By kind (labels / confident):
  - ff5: priority 8 / 3, attack 5 / 1, block 3 / 0 (all three void);
  - peasant7: priority 13 / 2, attack 3 / 0.

## (vi) The sizing: what this night was for
- **Measured** wall time is spine start to end, checks included, at **6 workers**. Worker-hours are 6 × wall.
- **"At 7"** scales the whole wall by 6/7. Leaving the checks unscaled instead gives the figures in brackets.

| | ff5 (461) | peasant7 (463) | as run (both) |
|---|---|---|---|
| wall, worker-hours | 1.44 h, 8.6 | 1.76 h, 10.6 | 3.20 h, 19.2 |
| labels / confident a spine | 16 / 4 | 16 / 2 | 32 / 6 |
| labels without void a spine | 13 | 16 | 29 |
| labels a worker-hour (without void) | 1.86 (1.51) | 1.51 | 1.67 (1.51) |
| **labels a 10-h night, 6 workers** | **111** (90 without void) | **91** | 100 (91) |
| **confident a 10-h night, 6 workers** | **28** | **11** | 19 |
| **labels a 7-worker 10-h night** | **130** [126] (106 [103] without void) | **106** [102] | 117 [113] (106 [102]) |
| **confident a 7-worker 10-h night** | **32** [32] | **13** [13] | 22 [21] |
| **the job's prior** (J156's spines, labels.py, 10 h at 6 workers; ×7/6) | 69 / 26 confident (80 / 30) | 135 / 31 (158 / 36) | — |
| 1,000 labels at 7 workers (without void) | 77 h, 7.7 nights (95 h, 9.5) | 95 h, 9.5 nights | 86 h, 8.6 nights (95 h, 9.5) |
| 1,000 confident at 7 workers | 308 h, 31 nights | 756 h, 76 nights | 457 h, 46 nights |

- **Against the prior, one spine each.**
  - **ff5: more labels, about the same confident.** ff5 461 gave more labels a night than the prior (111 against 69 at 6 workers) and about the same confident labels (28 against 26). It was a short spine: 14,160 branch games, 3.7 options a decision, 86 min. J156's three ff5 spines took 175, 85 and 156 min at 6 workers.
  - **peasant7: fewer labels, far fewer confident.** peasant7 463 gave fewer labels (91 against 135) and far fewer confident ones (11 against 31). It took 106 min against J156's 79, 74 and 60, with 4.5 options a decision and 17,280 branch games.
  - **Spine-to-spine spread.** One spine a pair cannot separate a pair's rate from that spread; J156's ff5 spines alone span a factor of two.
- **The prior is not void-corrected either.** D470's table voids J150's 455 d33 and 457 d16 (peasant7) outright, and 452/453 d25 (ff5) in part.
- **reads.py's worker-second line** (branch time only, at the measured branch means; no checks, no idle):

| | options a decision | branch games a label | s a branch (random / Forge) | worker-s a label | labels a 7-worker hour | a 10-h night |
|---|---|---|---|---|---|---|
| ff5 | 3.69 | 885 | 1.83 / 1.54 | 1,579 | 16.0 | 160 |
| peasant7 | 4.50 | 1,080 | 1.82 / 1.22 | 1,855 | 13.6 | 136 |
| both | 4.09 | 982 | 1.82 / 1.36 | 1,717 | 14.7 | 147 (144 without void) |

  The measured wall rate is about 70–80% of this line. The checks take 17% (ff5) and 21% (peasant7) of the wall time.
- **Pauper5: not a rate.** The 80 units it played say what a pauper label would cost before G6:
  - **Branch cost.** Wall time a branch game at d0 was **10.8 s**, against ff5 461's 5.3 and peasant7 463's 3.3. Over all 80 units it was 8.6 s (ff5 1.8, peasant7 1.7). Random branches averaged 13.2 s, Forge 1.7.
  - **Timeouts.** **243 of 6,065** (4.0%) timed out, all random. By decision: d0 16, d2 31, d4 18, d6 21, d8 26, d10 49, d12 65, d14 14, d17 3. Per option the share runs from 2.5% to 9% (Crypt Rats cast at d12: 18 of 200).
  - **Unit watchdog.** 10 units (d10, d12; 100- and 175-branch units) passed the 30-min unit watchdog on their first attempt and resumed at the branches they lacked. All 80 units are `ok`.
  - **Errors.** 483 errored branches: the 243 timeouts and **240 of 240 at d12 option 0**, Forge's own `cast:17` Snuff Out by its alternative cost: `IllegalStateException: optional cost AltCost is not offered on the copy`. Forge's choice at d12 cannot be forked, so d12 would give no label. This is a D466-class gap for alternative costs, and is new.
  - **Disk.** 8.2 GB for 42% of a spine, against ff5's 1.5 GB and peasant7's 2.4 GB complete.
  - **Not readable as a map.** 4% of the random branches are missing non-randomly (the long Crypt Rats games), and the random seat's X was never drawn (D471). No atlas was written, and nothing here reads pauper5's values.

## The reads
- **Intervals.** 95% percentile bootstrap, 10,000 draws, seed 150, as registered. **Coarse: two spines.**
  - Each pair has one spine, so a by-pair interval is **decision-level only**.
  - The "pooled" interval resamples two pairs at its top level.
- **Base:** 32 decisions, 32 complete, 2 decided, **Q 30**. Without the three void decisions: 29, 29, 2, **Q 27**.

**(i) Same best before decided.**

| | with the void | without | J156 (6fb13bf9, another policy) |
|---|---|---|---|
| both pairs | 0.400 [0.214, 0.571] (30) | **0.333 [0.154, 0.519] (27)** | 0.532 [0.375, 0.653] (124, three pairs) |
| ff5 | 0.438 [0.188, 0.688] (16) | 0.308 [0.077, 0.539] (13) | 0.625 [0.479, 0.771] (48) |
| peasant7 | 0.357 [0.143, 0.643] (14) | the same | 0.521 [0.354, 0.688] (48) |

**(ii) Mean ρ**, over 21 rankable decisions (8 of them two-option), the same with or without the void (ρ is undefined at all three):
- both **0.060 [−0.280, 0.394]**;
- ff5 −0.050 [−0.493, 0.387] (11);
- peasant7 0.181 [−0.226, 0.573] (10).
- Over Q, the same 21.
- J156: ff5 0.554 [0.289, 0.774], peasant7 0.179 [−0.121, 0.459].

**(iii) Regret at Forge's choice** (points, over Q; the void decisions are all of the block row):

| kind | n | random map | clear of 0 | Forge map | clear of 0 |
|---|---|---|---|---|---|
| priority | 20 | 3.0 [1.6, 5.0] | 5 | 3.8 [1.1, 6.7] | 2 |
| attack | 7 | 1.4 [0.1, 3.0] | 1 | 1.4 [0.0, 4.3] | 0 |
| block | 3, **all void** | 0.0 [0.0, 0.0] | 0 | 0.0 [0.0, 0.0] | 0 |

- **Priority by pair:**
  - random map: ff5 3.8 [1.4, 6.5] (8), peasant7 2.5 [1.1, 4.2] (12);
  - Forge map: 3.4 [0.3, 8.4], 4.0 [1.0, 7.5].
  - J156 (random map): ff5 8.9 [5.2, 13.7], peasant7 3.5 [1.7, 5.8].
- **(b) What a label tells.**
  - Median best-worst gap: ff5 **4.75** points (6.5 without the void), peasant7 **8.25**. J156: 9.75 and 6.0; J157 vintage 1.5.
  - Mean regret: 2.2 [1.2, 3.3] (2.4 [1.3, 3.9] without).
  - Settled share: 0.156 [0.031, 0.313] (0.069 [0.0, 0.207] without). ff5's three settled decisions are the three void ones.
- **(a) The confident share.**
  - Overall 0.188 [0.031, 0.344] (32); without the void 0.207 [0.063, 0.423] (29).
  - ff5 0.250 [0.063, 0.500] (0.308 [0.077, 0.539] without); peasant7 0.125 [0.0, 0.313].
  - By kind: priority 0.238 [0.048, 0.500] (21), attack 0.125 [0.0, 0.400] (8), block 0 (3, void).
  - J156, by this labels.py: ff5 0.375 [0.229, 0.521]; peasant7 11 of 48.

**(iv) C1 "cast now where Forge passes".**
- **ff5, new seed 461: HOLDS by the registered rule.** +4.3 points [1.0, 7.6], n 8, a decision-level interval (one spine). The Forge map gives +6.1 [0.2, 14.0].
  - Beside it: J156 +8.3 [4.2, 13.3] at 452–454 (another random policy) and J148 +1.3.
  - A repeat of a direction, not a value (D466 point 4). It also carries D471's caveat, below: ff5's decks hold X cards.
- **peasant7: HOLDS by the rule.** +2.8 [0.3, 5.0], n 12, decision-level. The Forge map gives +1.3 [−2.8, 5.5].
- **C2 "don't attack"** (information): ff5 n 1, −7.0; peasant7 n 2, −14.5 [−15.5, −13.5] (Forge map 0.0).
- The void decisions are blocks, so neither C1 nor C2 moves without them.

**(v) Guardrails** (the two atlases; no phase A, so no hands kept or mulligans):

| pair | logs | land offered / taken | violations (G1, G4) | G3 noRepeatNoOp | G5 refusedCast / noRepeatRefused | payfail |
|---|---|---|---|---|---|---|
| ff5 | 23,600 | 55,692 / 55,692 | 0 (0, 0) | 20,281 | **172 / 158** | 172 |
| peasant7 | 28,800 | 75,191 / 75,191 | 0 | 0 | 0 / 0 | 0 |

- **ff5 shows G5 both ways, as the job required.** `payfail` equals `refusedCast` (one line a refusal, as in J156). `forgePayCap` is 0.
- **`branchTimeouts` / `branchTimeoutsInStep`** are 0 / 0 on ff5 and peasant7, and **243 / 241 on pauper5**: all random, by decision as above.
  - Two pauper5 rows timed out between steps: d10 `attack:13` b34 and d14 `pass` b148.
  - pauper5 has no atlas, so it has no guardrail counts.

## Known gaps
- **Three voided block decisions** (ff5 461 d10, d14, d30). They are kept in `labels.jsonl` and in every count above; every table gives the with and without figures. The fix (D470, #191) is not in db496097. Maps made before it are not comparable at these decisions, and J156's prior counts its own void decisions.
- **Pre-G6 random X plays (D471).** Before G6 the random seat's X spells cast with whatever X was left on the card (J158's rows show Fireball cast at X = 0 to 8), and an X activation could go at X = 0.
  - **So the random map's X plays were never a random X.**
  - ff5's decks hold Walking Ballista (A) and Hangarback Walker, Rolling Thunder, Fireball and Crypt Rats (B), so ff5 461's random map is affected wherever those were cast.
  - peasant7's decks hold none of the X cards D471 lists.
- **Not pooled.**
  - **D470:** atlases from before #191 and after it are two tools at those block decisions, and so are search-v2 runs with block search on.
  - **D471:** an atlas after G6 is a fifth random policy. J158's random map is read beside a later one and never pooled, split by the plan's commit.
  - J158's random seat is J157's (9fe69ad8), so it is not J156's (6fb13bf9).
- **The missing four spines.** pauper5 464 is partial and has no atlas. synergy9 465, modern7 466 and ff5 462 were never played.
  - Three of the five pairs have no measured rate.
  - ff5 has one spine of two, and C1's repeat rests on one seed.
- **Two spines in all.** Every by-pair interval is decision-level, and the pooled one resamples two pairs.
- **Pauper5 d12** (Snuff Out by its alternative cost) cannot be forked at Forge's own choice. It is unread here, and it is a tool gap of D466's class.
- **Forge's map rests on n 40** an option. At the void decisions it is n 37 and 2.
- **"Decided" means won only.** ff5's three void decisions are lost under every option.
- **The runner's record is a stop, not a failure.** Its final checks never ran. On these two spines they would fail on spines-per-pair and `problems` (ff5's two D470 errors).

## What it says
Two complete spines give 32 labels: 29 without the three D470-void block decisions, and 6 confident, none of them void. At 6 workers, ff5 461 made labels at 111 a 10-h night (90 without the void), 28 of them confident. peasant7 463 made 91, 11 confident. Scaled to 7 workers that is ~130 (106) and 32 for ff5, and ~106 and 13 for peasant7, against the job's prior of 69 / 26 and 135 / 31 at 6 workers (80 / 30 and 158 / 36 at 7). Each pair rests on one spine, and J156's ff5 spines alone varied twofold. 1,000 labels at the run's mix is ~8.6 seven-worker nights (9.5 without the void); 1,000 confident is ~46. Pauper5 cost 10.8 s a branch at d0 against 5.3 and 3.3, and lost 4% of its random branches to the step clock (42% of its branch time). Its pre-G6 random map is not readable. C1 holds on ff5's new seed (+4.3 [1.0, 7.6], decision-level) and on peasant7 (+2.8 [0.3, 5.0]) by the registered rule. Before decided, the maps agree on the best move 0.33 [0.15, 0.52] of the time (without the void), and ρ is 0.06 [−0.28, 0.39].
