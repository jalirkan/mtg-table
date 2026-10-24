# J162 — the move atlas, rung 3b: the four spines J158 did not finish, on the fixed tool (D470, D471 + #195, D472, D474): summary

Written by the PC session's lab analyst, 2026-10-24, from the job's own report under `/home/justin-a/code/lab/data/lab-j162/report/` (the four `atlas.json`/`.atlas.md`, `labels.jsonl` and `labels.json`, `reads.json`, `tool.json`, `j158-labels.json` and `j158-reads.json`, `exits.txt`, `spine-times.txt`, `missing.txt`, empty), each spine's `phaseB/branches.jsonl`, `baseline.json` and `units.jsonl`, results/J162 (STATUS, checks, metrics, pilot and run1–5 logs), the job file (`origin/pc-jobs:jobs/J162-move-atlas-3b.md`), results/J158/summary.md, D472 and D474. Read-only on the data; no engine. Extra arithmetic (branch speeds, the what-if on ff5 462's lost decisions) is from scripts in the session scratchpad (`bin6/`), over the same files.

**Method only.** D451 registers no rule on what the maps say. The one registered verdict is (iv)'s, per pair. **These labels are a new random policy and tool (f6dba5e4: D470, D471 with #195, D472, D474), and are never pooled with J156's, J157's or J158's.** J158's two spines are printed beside them, in their own column.

## The run
- **Posted** on f6dba5e4; started 06:04 EDT 2026-10-24. **The pilot passed 39 of 39 checks** in about 4 min (06:04:24–06:08:37): the pin carries D466, D467, D470 (+#193), D471 (+#195) and D472; the node tests; `atlas-selftest` with its G5 leg (ff5) and G6 leg (pauper5); reads.py and labels.py reproduced J158's `reads.json`, `labels.json` and `labels-raw.jsonl` by sha256 and marked exactly J158's three void blocks; the pauper5 smoke at seed 4640 drew X 10 times, left out 63 X = 0-only offers (323 in the smoke proper), paid 0 at X = 0, timed out 0 of 96 branches.
- **Workers.** 6 (memory-sized; the job asked up to 7). **Peak worker RSS 1.15 GB** against the 2.70 GB declared. That is the atlas's usual footprint (J156 1.17, J158 1.14, J157 1.62). The 2.3 GB peaks of J159 and J160 were cube-lab nights, a different workload, so this is not a drop D465 or D474 bought. The declared 2.70 GB a worker is well above any atlas job's measured peak.
- **Disk.** 8.82 GB (ff5 2.5, pauper5 2.5, modern7 2.1, synergy9 1.5). J158's pauper5 partial was 8.2 GB for 42% of a spine.
- **Spines** (`spine-times.txt`, EDT; phase B from each `atlas.json`; checks = the rest):

| spine | start | end | wall | phase B | checks | exit | branch games | games / h (phase B) | games / h (wall) |
|---|---|---|---|---|---|---|---|---|---|
| pauper5 464 | 06:08:37 | 08:10:17 | **2 h 02 min** | 95 min | 27 min | 0 | 14,400 | 9,100 | 7,100 |
| synergy9 465 | 08:10:24 | 09:22:44 | 1 h 12 min | 59 min | 13 min | 0 | 12,960 | 13,090 | 10,750 |
| modern7 466 | 09:22:49 | 11:07:31 | 1 h 45 min | 85 min | 20 min | 0 | 13,440 | 9,500 | 7,700 |
| ff5 462 | 11:07:34 | 13:41:26 | **2 h 34 min** | 127 min | 27 min | **3** | 14,880 | 7,020 | 5,800 |

- **Against the estimate.** The four spines took 7 h 33 min at 6 workers (estimate ~8.1 h). pauper5 came in under its ~2.5-h estimate, and synergy9 came in under too. modern7 (1.75 h against 1.3) and ff5 462 (2.56 h against 1.6) ran over. The whole job took 7 h 37 min (06:04–13:41:43) against ~8.5 h.
- **The Crypt Rats loop is gone.** pauper5 played 14,400 branch games in 2 h 02 min with **0 timeouts** (J158: 243 of 6,065, 4.0%, 42% of its branch time, and it would not have finished). Its random branches averaged **2.47 s** (J158's partial: 13.2 s). G6 drew X 14,086 times on pauper5 and left out 116,104 offers payable only at X = 0.
- **Where the time went.** The checks are serial and took 17–22% of each spine's wall; redaction alone was 482–978 s a spine. **ff5 462 is the slow spine.** Its played random branches averaged **3.89 s**, against ff5 461's 1.83, with longer games: 24.9 turns and 444 steps against 21.3 and 220, and 8.75 ms a step. That is the top of J156's ff5 range (2.08–3.35 s), so ff5 461 was the short one.
- **Runner blocks.** run1–run4 one spine each (exit 0 each), run5 the report (exit 0 at 13:41:43). STATUS `failed` on one check.

## Why the runner says "failed": ten problems, one card, one new tool gap
**22 of 23 checks pass.** The one that fails is `atlas.problems == 0`: atlas.problems = 10, all on ff5 462 (exit 3).

**The ten problems** (`checks.problems`). Every one is an option that **errored on 240 of 240 branches** (random 200, Forge 40), **the same card, Murderous Rider (card 25), cast as a creature from exile after its adventure, Swift End**:

| decision | turn | options | errored options (Forge's choice) | error |
|---|---|---|---|---|
| d11 | 13 | 6 | o4, o5 `cast:25` (Forge: `pass`) | `IllegalStateException: no Murderous Rider - Creature # / # by Swift End (#) [may play] on the copy's Murderous Rider (#)`; o5's text has `by Swift End (#)` twice |
| d16 | 15 | 5 | o3, o4 (Forge: `pass`) | the same pair of texts |
| d19 | 17 | 6 | o4, o5 (Forge: Kitesail Freebooter) | the same |
| d22 | 19 | 5 | o3, o4 (Forge: `pass`) | the same |
| d24 | 19 | 6 | o3, o4 (Forge: Gray Merchant) | the same |

- **The kind.** All ten are **errors, not unavailable**. `tool.json` files all 2,400 under `play not rebuilt on the copy (D472)`, and `optionUnavailable` is 0 everywhere. It is D472 point 4's failure text, `no <description> [<kind>] on the copy's <card>`, with kind `[may play]`.
- **How it happened.** At d5 (turn 7) Forge cast the Rider's adventure, Swift End. Both of d5's Rider options (adventure and creature, from hand) played every branch. From turn 9 on, the Rider sits in exile with Swift End's permission to cast it, and every later priority decision lists that cast twice (two may-play variants, one description doubled). The fork finds neither on the copy.
- **Is it new? Yes: a new tool gap, in a known reporting class.**
  - **Not a known fault.** It is not D466 (optional costs), not D470 (that would be `unavailable`), not D474 (a stand-in NPE), not D467 (no timeouts).
  - **It sits in the class D472 made.** D472 made "a play the copy cannot rebuild" a named error and a problem, and it worked as designed: the fault was named and counted, not hidden.
  - **What D472 says about it.** D472 lists **may-play permissions** (`getMayPlaySpellOptions`) among the kinds it covers, but planted no may-play case in `altcost-map` (Snuff Out, Think Twice, Mulldrifter, Bone Shards). This is the first may-play play the atlas has met.
  - **Not replayed (no engine here).** My reading of the text is that the copied Rider lacks the adventure's cast-from-exile permission, so `copyCandidates` never builds a `[may play]` variant to match. Forge's own `GameCopier` carries a `// TODO ExiledWith` at the copied card. The other reading is that the copy builds the play with a different description. A replay of one d11 branch settles which.
- **What it cost.** Five of the spine's 16 branched decisions have no complete label (11 labels, not 16). These were its **five 5- and 6-option decisions**, the class that yields confident labels most often (*The labels*). Their other options played: **3.18 of the spine's 12.52 branch worker-hours (25%) bought no label**. The 2,400 errored branches themselves failed at the install and cost ~10 s in all.
- **What they would have said without the Rider options** (what-if, the playable options only; a lower bound on regret):
  - d22 and d24 are won under every option (100/100);
  - d19 is near-won (90–97.5);
  - d16 has a 1.5-point regret [0, 11];
  - d11 has a 4.5-point regret [0, 11.5].
  - So **at most two (d11, d16) could have been confident**, and only if a Rider cast was well above Forge's pass. The fault cost this spine 0–2 confident labels, not the night.
- **The other branch errors, below the bar.** **modern7: 62 NPEs** (0.55% of its random branches), random continuations only and 1–3 an option, across d0–d18. 46 carry no message (a hot-path NPE whose message the JIT dropped). 16 read `Cannot invoke "PhaseType.isMain()" because ... PhaseHandler.getPhase() is null`.
  - They fail mid-game (~4 s each), not at the install.
  - No option comes near 10%, so they are not problems; they only drop those branch indices from the paired rows.
  - **New and unexplained**: no earlier job or decision names this NPE. It is a candidate for the Rider fix's lane to look at, not a blocker.
- **Everything else is clean:**
  - 0 timeouts (in step or out);
  - 0 unavailable;
  - 0 unit errors, 0 units short;
  - 0 engine errors;
  - 0 truncated logs;
  - 0 guard violations (G1, G4, G6);
  - **0 void labels**, and no non-block decision passed the same-game test;
  - 0 rows unmatched.

## The labels

| | J162: pauper5 464 | synergy9 465 | modern7 466 | ff5 462 | **J162 (4)** | J158: ff5 461 | peasant7 463 | **J158 (2)** |
|---|---|---|---|---|---|---|---|---|
| baseline (turns, winner) | 25, A | 23, B | 13, A | 19, A | | 21, B | 20, A | |
| listed / branched | 32 / 16 | 43 / 16 | 19 / 16 | 25 / 16 | 119 / 64 | 31 / 16 | 23 / 16 | 54 / 32 |
| complete = labels | 16 | 16 | 16 | **11** | **59** | 16 (3 void) | 16 | 32 (29) |
| decided / Q | 0 / 16 | 0 / 16 | 2 / 14 | 0 / 11 | 2 / 57 | 0 / 16 | 2 / 14 | 2 / 30 |
| **confident** | **3** | 1 | 2 | **1** | **7** | **4** | 2 | **6** |
| confidentForge | 0 | 2 | 2 | 1 | 5 | 1 | 1 | 2 |
| confident share | .19 [.0, .38] | .06 [.0, .19] | .13 [.0, .31] | .09 [.0, .27] | **.119 [.034, .220]** | .25 [.06, .50] | .13 [.0, .31] | .188 [.031, .344] |
| median best–worst gap (random, pts) | **8.5** | **2.75** | 4.9 | 7.5 | | 4.75 | 8.25 | |
| mean regret at Forge's choice (pts) | 4.3 [1.4, 7.6] | 1.9 [0.9, 3.1] | 2.8 [0.5, 6.7] | **1.2 [0.1, 3.1]** | 2.7 [1.2, 4.5] | 2.4 | 2.0 | 2.2 [1.2, 3.3] |
| settled share | 0 | .25 | .125 | 0 | .10 | .19 (the 3 void) | .13 | .16 |
| Forge's choice is the random map's best | 7 / 16 | 5 / 16 | 9 / 16 | 6 / 11 | | 8 / 16 | 5 / 16 | |
| mean options (complete) | 3.75 | 3.38 | 3.50 | **3.09** | | 3.69 | 4.50 | |

- **7 of 59 confident (0.119), against J158's 6 of 32 (0.188).** The two shares are not distinguishable: Fisher p = 0.37, and the intervals overlap almost entirely. The per-spine confident counts over all six spines (4, 2, 3, 1, 2, 1) vary *less* than a common binomial rate would (variance 1.37 against 1.87 at p = 0.135). So on the current tool, **one spine cannot tell any pair's information rate from any other's**.
- **Where they went:**

| label | kind, turn, options | Forge chose | the random map's best | regret (pts) | gap |
|---|---|---|---|---|---|
| pauper5 d10 | attack, t13, 4 | attack none | attack with Archaeomancer | 13.5 [8.0, 21.0] | 13.5 |
| **pauper5 d12** | priority, t15, 7 | **Snuff Out by its alternative cost** | Generous Ent | **21.0 [13.5, 28.5]** | 26.5 |
| pauper5 d29 | attack, t23, 6 | attack with Gurmag Angler | all four attackers | 16.0 [10.5, 21.5] | 16.0 |
| synergy9 d8 | priority, t8, 5 | pass | Seasoned Pyromancer | 9.0 [1.0, 16.5] | 21.0 |
| modern7 d4 | priority, t7, 3 | pass | Garruk Wildspeaker | 5.6 [1.5, 11.2] | 5.6 |
| **modern7 d13** | priority, t11, 2 | pass | Beast Within | **28.4 [19.3, 36.5]**, Forge map 25.0 (confident on both) | 28.4 |
| ff5 462 d13 | priority, t13, 3 | Walking Ballista | Llanowar Visionary | 9.5 [1.5, 17.5] | 12.0 |

  - **By kind:**
    - 5 priority (41 labels, 0.122 [0.025, 0.233]);
    - 2 attacks, both pauper5 (16 labels, 0.125 [0.0, 0.368]);
    - 0 blocks (2 labels, synergy9's, both settled).
  - **Shape.** Three of the seven are "cast where Forge passed" (synergy9 d8, modern7 d4 and d13), the C1 shape.
  - **pauper5 d12 is the decision D472 fixed.** In J158 it errored on 240 of 240 branches; here it is the second-largest label in the night.
  - **Medians.** The confident labels' median best–worst gap is 16 points. The 52 others have a median of 4.5.
- **Why only 7.**
  - **synergy9 is low-gap.** Its median gap is 2.75 and 4 of 16 decisions are settled: the vintage lesson again.
  - **ff5 462 lost its five widest decisions** to the Rider gap, as above.
  - **On what remained, Forge chose well.** Its median regret is 0, Forge's choice is the random map's best at 6 of 11, and the mean regret is 1.2. The gaps are not narrow (median 7.5, wider than ff5 461's 4.75): a label is the regret *at Forge's choice*, and here Forge was usually at or near the top.
  - **modern7's game is short and lopsided.** 13 turns, the random-map base value is .87 for seat A, and 2 of its decisions are decided. Its 2 confident labels are two clear "cast now" spots.

## The reads (J162 over four pairs; J158 beside, never pooled)
- **Intervals.** 95% percentile bootstrap, 10,000 draws, seed 150, as registered. One spine a pair, so every by-pair interval is decision-level, and the pooled one resamples four pairs.
- **Base:** 64 decisions, **59 complete**, 2 decided, **Q 57** (J158: 32, 32, 2, 30).

**(i) Same best over Q**

| | J162 | J158 |
|---|---|---|
| pooled | **0.509 [0.322, 0.700]** (57) | 0.400 [0.214, 0.571] (30); 0.333 without the void (27) |
| pauper5 | 0.313 [0.125, 0.563] (16) | |
| synergy9 | 0.563 [0.313, 0.813] (16) | |
| modern7 | **0.714 [0.500, 0.929]** (14) | |
| ff5 | 0.455 [0.182, 0.727] (11, seed 462) | 0.438 [0.188, 0.688] (16, seed 461) |
| peasant7 | | 0.357 [0.143, 0.643] (14) |

**(ii) Mean ρ**: 51 rankable decisions, 19 of them two-option.

| | J162 | J158 |
|---|---|---|
| pooled | 0.218 [−0.119, 0.580] | 0.060 [−0.280, 0.394] (21) |
| pauper5 | −0.101 [−0.455, 0.268] (16) | |
| synergy9 | 0.254 [−0.193, 0.676] (13) | |
| modern7 | **0.667 [0.320, 0.887]** (12) | |
| ff5 | 0.143 [−0.410, 0.680] (10) | −0.050 [−0.493, 0.387] (11) |
| peasant7 | | 0.181 [−0.226, 0.573] (10) |

- **modern7 is the first pair whose two maps order the options alike clearly** (ρ above zero, same best 10 of 14). The others stay near chance, as in J158. Over Q, ρ is the same 51.

**(iii) Regret at Forge's choice** (points, over Q):

| kind | J162 n | random map | clear of 0 | Forge map | clear of 0 | J158 (n; random / Forge) |
|---|---|---|---|---|---|---|
| priority | 40 | 2.9 [1.3, 5.1] | 5 | 4.8 [2.2, 8.6] | 5 | 20; 3.0 [1.6, 5.0] / 3.8 [1.1, 6.7] |
| attack | 15 | 2.7 [0.5, 6.0] | 2 | 1.5 [0.2, 4.4] | 0 | 7; 1.4 [0.1, 3.0] / 1.4 [0.0, 4.3] |
| block | 2 | 0.0 | 0 | 0.0 | 0 | 3, all void |

- **Priority by pair:**
  - random map: pauper5 3.5 [0.5, 7.8] (10), synergy9 2.4 [1.1, 4.1] (11), modern7 3.9 [0.6, 9.3] (11), ff5 1.5 [0.0, 3.9] (8);
  - Forge map: 2.0, 4.3, 5.5, **8.1 [0.9, 18.8]** (ff5's d5: Forge's Swift End against Llanowar Visionary, 42.5 points on the Forge map, 2.5 on the random).

**(iv) C1 "cast now where Forge passes", the registered rule on every pair**

| pair | n | random map | verdict | Forge map (information) | C2 "don't attack" (information) |
|---|---|---|---|---|---|
| pauper5 464 | 10 | **+4.1 [1.3, 6.9]** | **HOLDS** | +3.1 [−0.9, 7.5] | −6.5 [−11.7, −0.8] (5) |
| synergy9 465 | 11 | +0.0 [−1.3, 1.4] | NOT SHOWN | −0.4 [−3.9, 3.1] | −0.5 [−3.5, 2.5] (2) |
| modern7 466 | 11 | **+6.3 [1.7, 12.3]** | **HOLDS** | +9.9 [1.4, 19.1] | −1.7 [−5.1, 1.5] (3) |
| ff5 462 (`iv_repeat`) | 8 | +5.2 [−0.5, 13.1] | **NOT SHOWN** | +4.2 [−2.7, 11.1] | −9.5 [−14.5, −7.0] (3) |
| *beside, never pooled:* J158 ff5 461 | 8 | +4.3 [1.0, 7.6] | HOLDS | +6.1 [0.2, 14.0] | −7.0 (1) |
| J158 peasant7 463 | 12 | +2.8 [0.3, 5.0] | HOLDS | +1.3 [−2.8, 5.5] | −14.5 (2) |
| J156 ff5 452–454 | | +8.3 [4.2, 13.3] | HOLDS | | |
| J148 | | +1.3 | | | |

- **C1's direction is positive on five of the six current-tool spines.** By the rule it holds on four (ff5 461, peasant7, pauper5, modern7). On ff5 462 the point is +5.2 but the interval's low end is −0.5, at the same n (8) as ff5 461. synergy9 is flat. **ff5's repeat is NOT SHOWN on seed 462.** A repeat is of a direction (D466 point 4), and the direction repeats; the rule does not pass.
- **C2 runs the other way wherever it can be read.** Attacking where Forge attacked beats not attacking: pauper5 −6.5 and ff5 −9.5, both clear of zero. That is information only.

**(v) Guardrails** (four atlases; no phase A):

| pair | logs | land offered / taken | violations (G1, G4, G6) | G3 noRepeatNoOp | G5 refusedCast / noRepeatRefused | G6 xDrawn / zeroXLeftOut / zeroX |
|---|---|---|---|---|---|---|
| pauper5 | 24,000 | 104,363 / 104,363 | 0 | 312 | 0 / 0 | 14,086 / 116,104 / **0** |
| synergy9 | 21,600 | 47,338 / 47,338 | 0 | 2,349 | 2 / 0 | 933 / 1,622 / 0 |
| modern7 | 22,400 | 78,239 / 78,239 | 0 | 12,817 | 0 / 0 | 12,160 / 147,740 / 0 |
| ff5 462 | 20,800 | 91,560 / 91,560 | 0 | 38,242 | **502 / 450** | 5,447 / 27,921 / 0 |
| **all** | 88,800 | 321,500 / 321,500 | **0** | 53,720 | **504 / 450** | 32,626 / 293,387 / **0** |
| *J158* ff5 461 / peasant7 | 23,600 / 28,800 | all taken | 0 | 20,281 / 0 | 172 / 158; 0 / 0 | not counted (pre-G6) |

- **G5 is almost all ff5** (502 of 504, Elite Spellbinder's tax). It is three times J158's ff5 461, on a spine with longer random games.
- **`payfail`** is 506 against 504 refusals (J158: equal), and `forgePayCap` is 0.
- **G6 fired on every pair and never let an X = 0 play through.** The random map's X plays are a random X for the first time.

**(vi) Sizing** (reads.py's worker-second line, branch time only):

| | options a decision | branch games a label | s a branch (random / Forge) | worker-s a label | labels a 7-worker hour | a 10-h night |
|---|---|---|---|---|---|---|
| J162 (4) | 3.62 | 870 | 2.41 / 1.87 | 2,017 | 12.5 | 125 |
| pauper5 | 3.75 | 900 | 2.47 / 1.57 | 2,087 | 12.1 | 121 |
| synergy9 | 3.38 | 810 | 1.44 / 2.32 | 1,286 | 19.6 | 196 |
| modern7 | 3.50 | 840 | 2.38 / 1.54 | 1,878 | 13.4 | 134 |
| ff5 462 | 3.88 | 930 | 3.89 / 2.23 | 3,359 | 7.5 | 75 |
| *J158 (2)* | 4.09 | 982 | 1.82 / 1.36 | 1,717 | 14.7 | 147 |

The measured wall rate (below) is ~73% of this line, as J158's was 70–80%. The checks take 17–22% of the wall.

**(vii) The tool's counters** (`tool.json`):
- **Timeouts.** 0, and 0 in a step, on every spine. pauper5's share is 0 of 14,400 (check < 1%; J158 4.0%).
- **Unavailable.** 0 branches; no option near the bar.
- **Errors by kind:**
  - `play not rebuilt on the copy (D472)` 2,400, all ff5 462's Rider;
  - `NullPointerException` 62, all modern7;
  - `optional cost not offered (D466)` 0;
  - recording errors 0.
- **Engine errors.** 0 beyond the step clock (check ≤ 50).

## The sizing per pair: what this night was for

| | labels / confident a spine | spine wall at 6 | **labels / confident a 6-worker 10-h night** | **labels / confident a 7-worker 10-h night** | 1,000 labels (7-worker nights) | 1,000 confident |
|---|---|---|---|---|---|---|
| pauper5 464 | 16 / 3 | 2.03 h | 79 / 15 | **92 / 17** | 10.9 | 59 |
| synergy9 465 | 16 / 1 | 1.21 h | 133 / 8 | **155 / 10** | 6.5 | 100 |
| modern7 466 | 16 / 2 | 1.75 h | 92 / 11 | **107 / 13** | 9.3 | 77 |
| ff5 462 | **11** / 1 | 2.56 h | 43 / 4 | **50 / 5** | 20 | 200 |
| **J162 as run** | 59 / 7 | 7.54 h | 78 / 9 | **91 / 11** | 11.0 | 91 |
| *J158 ff5 461* | 16 / 4 | 1.44 h | 111 / 28 | *130 / 32* | 7.7 | 31 |
| *J158 peasant7 463* | 16 / 2 | 1.76 h | 91 / 11 | *106 / 13* | 9.4 | 77 |
| *ff5, both seeds (461 + 462)* | 27 / 5 | 4.00 h | 68 / 13 | *79 / 15* | 12.7 | 68 |
| *the prior (J156's spines, at 7)* | | | | *ff5 80 / 30; peasant7 158 / 36* | | |
| **all six measured spines, as a cost read** | 91 / 13 | 10.75 h | 85 / 12 | **99 / 14** | **10.1** | **71** |

- **The arithmetic.** "At 7" scales each wall by 6/7 (`c_sizing7`). The six-spine line is the mix of J158's two spines and these four, a **cost** read only: it is two random policies.
- **ff5 462 against ff5 461: 5 against 32 a night, a factor of 6.4.** It splits into three parts that multiply:
  - **cost** ×1.78: a 2.56-h spine against 1.44 h, from 3.89-s random branches in 25-turn games;
  - **lost labels** ×1.45: 11 against 16, the Rider gap;
  - **confident share** ×2.75: 1 of 11 against 4 of 16. That is a binomial draw at the night's common rate (Fisher p ≈ 0.6), not a measured difference between seeds.
  - With the Rider gap fixed, ff5 462 would give ~16 labels and 1–3 confident at the same cost: **~73 labels and 5–14 confident a night**.
- **Against the prior.**
  - ff5 (80 / 30) and peasant7 (158 / 36) were J156's numbers, from a random policy whose mean regret at Forge's choice was 5.1–9.8 points on ff5 and 2.5–4.9 on peasant7. The current policy finds 1.2–2.4 and 2.0 on the same pairs.
  - The prior's confident counts are that policy's, and no current-tool spine reaches them.

## Known gaps
- **The Rider gap (new).** A creature cast from exile after its adventure (`[may play]`) does not map onto the copy. Any deck with an adventure card can lose every later priority decision that lists the cast, and those are the wide ones. It needs a D472 follow-up (a replay of ff5 462 d11, a planted adventure case in `altcost-map`) **before the next atlas night on any deck that holds one**. The fair-fight cube holds at least Murderous Rider. Until then the runner will fail such a night on `problems`.
- **modern7's 62 NPEs** (new, unexplained, below the bar): `PhaseHandler.getPhase()` null and a message-less NPE, mid-game, random continuations only.
- **One spine a pair.** Every by-pair interval is decision-level. The six current-tool spines are consistent with one common confident rate (~0.14 a decision), so **no pair's information rate is measured yet**; what differs measurably between pairs is cost and option count.
- **Two policies, never pooled:**
  - J158 (db496097) is J157's random seat;
  - J162 (f6dba5e4) adds G6's X and #195's restore of X and targets, D470's block install, D472 and D474.
  - The `sha` on every label row is the split key.
- **Blocks.** 12 listed across these spines (synergy9 8, modern7 2, pauper5 1, ff5 462 1; from each `baseline.json`), and 2 branched (synergy9 d28 and d42, both settled at regret 0). D470's fix has run at scale with 0 unavailable rows, but has not yet met an informative block.
- **The confirm set.** Every row carries `notForTraining` (D318/D340). Rung 4 has no consumer until that call is made.
- **"Decided" means won only.** ff5 462's d22 and d24 would be won under every playable option.

## What it says
J162 played the four spines J158 could not, and the three fixes held at scale:
- pauper5 ran in 2 h 02 min with no timeouts (J158 lost 42% of its time to the Crypt Rats loop);
- D470 gave 0 unavailable options and 0 void blocks;
- G6 drew X 32,626 times and paid nothing at X = 0;
- D472 turned pauper5 d12's 240-of-240 error into a confident 21-point label.

The run fails on one new tool gap. Murderous Rider cast from exile after Swift End cannot be rebuilt on the copy (D472's `[may play]` kind, which it listed but never planted). That gap is ten problems on ff5 462: five 5–6-option decisions with no label, a quarter of that spine's branch time, and at most two confident labels lost.

The night made 59 labels, 7 confident (0.119 [0.034, 0.220]), against J158's 32 and 6. A 7-worker night is pauper5 92 / 17, synergy9 155 / 10, modern7 107 / 13 and ff5 462 50 / 5. Over all six current-tool spines that is ~99 labels and ~14 confident a night: ~10 nights for 1,000 labels and ~71 for 1,000 confident.

C1 holds on pauper5 (+4.1 [1.3, 6.9]) and modern7 (+6.3 [1.7, 12.3]), is flat on synergy9, and is NOT SHOWN on ff5's second seed (+5.2 [−0.5, 13.1], n 8). Same best is 0.51 [0.32, 0.70] and ρ 0.22 [−0.12, 0.58]; modern7 is the first pair whose two maps clearly agree (ρ 0.67).

ff5's second seed is the night's lowest yield, not its highest. Six spines on the current tool cannot tell any pair's information rate apart from one common ~14% a decision. What separates the nights is spine cost (1.2–2.6 h) and how many wide decisions a spine offers.
