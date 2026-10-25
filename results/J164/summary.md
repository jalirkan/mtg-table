# J164 — the Monarch replay: J162's pauper5 464 spine re-branched at its eight Monarch decisions (d17–d31) on the fixed copier (D479, with D476–D478): summary

Written by the PC session's lab reader, 2026-10-24. Sources: the job's report under `/home/justin-a/code/lab/data/lab-j164/report/` (`b-pauper5-464.atlas.json`/`.md`, `labels.jsonl`, `labels.json`, `j162-labels-d17-d31.jsonl`, `shift.json`, `shift-head.json`, `monarch.json`, `monarch-j162.json`, `tool.json`, `exits.txt`, `spine-times.txt`, `missing.txt` (empty)); the spine's `phaseB/branches.jsonl` and `units.jsonl`; J162's same files under `lab-j162/b-pauper5-464/`; results/J164 (STATUS, checks, metrics, pilot, prepare, run1–2 logs, events); the job file (`origin/pc-jobs:jobs/J164-monarch-replay.md`); results/J162/summary.md; and D479 on origin/main. I only read the data and ran no engine. The extra arithmetic is mine, from the same files: per-decision speeds, the spread of shifts inside a decision, the agreement means and where J162's capped rows fell.

**The policy, first line.** These eight labels are on **ce42306a** (D479's copier, D478's draws). J162's labels for the same decisions are on **f6dba5e4**. The two sets appear side by side and are never pooled. J162's other 51 labels, including pauper5 d0–d14 and its three other spines, are untouched and stay J162's.

**No verdict.** D451 registers no outcome rule, and J164 registers none either. A shift says how far these eight labels moved on this spine. It says nothing about how far any other pair's would move.

## The run
- **Posted** on ce42306a. Started 20:02:34 EDT and finished 21:23:06, so **1 h 20.5 min** (4,821 s) against the ~1.4-h estimate. STATUS `done`.
- **Pilot: 41 of 41 checks passed** in about 13 min (20:02:58–20:15:55; estimate ~20). The pilot confirmed:
  - the pin carries D474, D476, D477, D478 and D479, and its merged check is 1;
  - the node tests pass;
  - `atlas-selftest` passes, `seat-identity` gives all 4 golden games, and `ai-bench --selftest` passes, including D479's `copy-monarch-triggers`;
  - J162's inputs match by sha256, and the 80 skip lines (28 for the smoke) are written;
  - the readers reproduce J162's own rows by sha256: labels.py gives J162's eight d17–d31 rows, shift.py reproduces J162's atlas.json and gives shift 0 against itself, and monarch.py gives the pinned 0 fork draws and 0 fork steals over 8,640 branches;
  - the smoke (d17 and d19, 450 branch games) shows 0 problems, both decisions complete, 450 of 450 seeds equal to J162's, and **the fork's own Monarch drawing in 445 of 450 branches**.
- **Workers.** 6, memory-sized. **Peak worker RSS 1.12 GB** against the 2.70 GB declared, the atlas's usual footprint (J162 1.15).
  - **One pressure episode.** At 20:17:15 the pool dropped to 5 workers: "some" avg10 was 21.8% and swap-in 22,557/s, while the job held 5.4 of 21.4 GB, so the job itself was not what filled memory. The pool went back to 6 at 20:35:42.
  - **A runner restart, with no effect on the run.** At 20:42:22 `tools/runner.sh install` restarted the service to 325c2dd8 (same boot, D461 clocks). run1 was adopted, and all 80 units finished on their first attempt.
- **The spine** (`spine-times.txt`, EDT): 20:15:55–21:21:09, **65.2 min** against ~1.0 h, exit 0.
  - Phase B took 53.3 min (estimate ~45) for 8,640 branch games, which is **9,725 an hour**. J162's whole pauper5 phase B ran at 9,100 an hour over all 16 decisions.
  - The serial checks took 11.9 min (estimate ~16) and came back clean: 193,478 rows, 17,282 frame logs, 16 leak checks.
  - The report block (run2) took 2 min.
- **The same 80 units, J162 against J164:**

  | | J162 (f6dba5e4) | J164 (ce42306a) | change |
  |---|---|---|---|
  | worker-hours | 4.41 | 5.04 | +14% |
  | branch games a worker-hour | **1,958** | **1,716** | −12% |
  | CPU-hours | 4.78 | 5.61 | +17% |
  | steps a branch | 205.7 | 202.3 | −1.7% |
  | ms a step | 8.79 | 10.20 | +16% |

  - **When the slowdown happened.** The units that ran during the pressure window (d17–d21) were 15–24% slower a step than J162's. The later ones were 3–16% slower (d23 1.08, d25 1.16, d27 1.11, d29 1.12, d31 1.03).
  - **Why, unresolved.** Part of the slowdown is the machine's load. The rest may be D479's carry pass on every fork. This run cannot separate the two.
- **Disk.** 1.27 GB: the spine 1.2 GB and the smoke 86 MB (expected ~1.5). 655 GB free.
- **Checks: 21 of 21 passed.** In particular:
  - problems 0;
  - all 8 decisions complete, no other decision played, and no row for a skipped decision;
  - 8,640 rows, **seeds match on all 8,640**;
  - 80 skip lines, 0 units short, 0 units failed;
  - 8 labels, 0 rows unmatched;
  - `shiftOk` 1;
  - `forkDrawBranches` 7,457 (the check needed ≥ 1).

## The Monarch, observed (monarch.py, seat 0's frame logs)
**J162 on the old copier: 0 fork draws and 0 fork steals in 8,640 branches. J164 on the new one: the fork's own Monarch drew in 7,457 branches (86%) and changed hands by combat damage in 5,048 (58%).**

| | J162 | J164 |
|---|---|---|
| branches with the Monarch at the fork | 8,640 | 8,640 |
| **fork's Monarch drew (branches / draws)** | **0 / 0** | **7,457 / 16,638** (random 6,313 of 7,200; Forge 1,144 of 1,440) |
| **fork's Monarch changed hands (branches / steals)** | **0 / 0** | **5,048 / 8,071** (random 4,043; Forge 1,005) |
| a Monarch made later in the branch drew (branches / draws) | 2,375 / 4,911 | 5,558 / 13,944 |
| a later Monarch changed hands (steals) | 1,059 | 3,424 |
| frames with two Monarchs at once | 0 | 0 |
| other Monarch-card events, information only | 0 | 7 (random) |
| unreadable logs | 0 | 0 |

Per decision on the new copy (branches where the fork's Monarch drew / where it changed hands, random of its branches; Forge in brackets):

| d | holder at fork | random: drew | random: changed hands | Forge: drew | Forge: changed hands | J162 later-Monarch draws (random + Forge branches) |
|---|---|---|---|---|---|---|
| 17 | B | 998 / 1,000 | 519 | 200 / 200 | 178 | 377 |
| 19 | B | 775 / 800 | 593 | 154 / 160 | 160 | 320 |
| 21 | B | 520 / 600 | 489 | 79 / 120 | 118 | 247 |
| 23 | A | 400 / 400 | 200 | 80 / 80 | 41 | 185 |
| 25 | B | 1,016 / 1,400 | 1,171 | 115 / 280 | 248 | 1,231 |
| 27 | A | 600 / 600 | 297 | 120 / 120 | 25 | 5 |
| 29 | A | 913 / 1,200 | 488 | 240 / 240 | 206 | 10 |
| 31 | A | 1,091 / 1,200 | 286 | 156 / 240 | 29 | 0 |

D479 reached the atlas: the copied Monarch now draws and can be taken.

- **d27–d31 were worst affected in J162.** Almost no branch made a new Monarch there (15 of 3,600 branches), so the J162 branches played with no live Monarch at all.
- **Games are shorter, and none reached the cap.** No J164 branch reached the turn cap. In J162, 37 rows at these decisions reached it (turn 41, all written as wins for A, 33 of them random). Mean branch length fell from 27.3 to 26.8 turns, and the longest from 41 to 38.

## (i) The shift (new − old, points, paired bootstrap over J162's seeds)

| | mean \|shift\| | noiseFloor | mean signed | max \|shift\| | clear of 0 (of 36) |
|---|---|---|---|---|---|
| **random map, `shift`** | **6.0** | 2.6 | **−4.9** | **−13.0**, d21 o0 attack Gurmag Angler (Forge's choice), [−21.0, −5.0] | **17** |
| Forge map, `shift` | 5.9 | 3.9 | +1.2 | −22.5, d17 o1 pass, [−40.0, −5.0] | 3 |
| random map, `shift478` | 5.9 | 2.6 | −4.7 | −13.0, d21 o0, [−21.0, −5.0] | 17 |
| Forge map, `shift478` | 5.8 | 3.9 | +1.3 | −22.5, d17 o1, [−40.0, −5.0] | 3 |

- **Random map: the values moved well beyond noise.**
  - The mean |shift| is 2.3 times the floor that no effect at all would give.
  - 17 of 36 shifts are clear of zero, where about 2 would be by chance, and all 17 are negative.
- **Forge map: barely above noise.**
  - 5.9 against a floor of 3.9.
  - 3 shifts are clear, about what chance gives: d17 o1 pass −22.5, d21 o2 attack Angler + Archaeomancer +20.0, d25 o4 attack Mist Raven +10.0.
- **D478's rescoring explains almost nothing.** Rescoring J162's 37 capped rows as draws moves the random mean |shift| from 6.0 to 5.9 and leaves the clear count at 17. Nearly all of the shift is the copier.
- **The shift is mostly a level move, decision by decision** (random map, my arithmetic from `shift.json`). Within a decision the options moved together:
  - mean shift by decision: d17 −9.0, d19 −10.1, d21 −11.0, d23 +4.2, d25 −4.4, d27 −1.7, d29 +1.9, d31 −7.1;
  - the spread of shifts inside a decision is 0.9–3.3 points (sd), and the mean |shift − its decision's mean| is **1.8 points**, against 6.0 for the shift itself;
  - a regret is a difference between options, so it moved far less than the values did (as (ii)–(iv) show).

Every option's shift (points; n = 200 random and 40 Forge on both copies, every index paired; * = clear of 0):

| d | o | option | random old → new | random shift [95%] | Forge old → new | Forge shift [95%] |
|---|---|---|---|---|---|---|
| 17 | 0 | Generous Ent (Forge's) | 40.5 → 29.0 | −11.5 [−19.0, −4.0] * | 85.0 → 82.5 | −2.5 [−12.5, 7.5] |
| 17 | 1 | pass | 19.0 → 8.5 | −10.5 [−16.0, −5.0] * | 70.0 → 47.5 | −22.5 [−40.0, −5.0] * |
| 17 | 2 | Crypt Rats | 21.5 → 15.5 | −6.0 [−12.0, 0.0] | 87.5 → 85.0 | −2.5 [−12.5, 7.5] |
| 17 | 3 | Gurmag Angler | 37.0 → 29.0 | −8.0 [−16.0, 0.0] | 85.0 → 77.5 | −7.5 [−17.5, 2.5] |
| 17 | 4 | Night's Whisper | 22.5 → 13.5 | −9.0 [−15.5, −2.5] * | 72.5 → 65.0 | −7.5 [−20.0, 5.0] |
| 19 | 0 | Mist Raven (Forge's) | 38.5 → 26.0 | −12.5 [−19.5, −5.5] * | 57.5 → 65.0 | +7.5 [−7.5, 22.5] |
| 19 | 1 | pass | 36.0 → 27.3 | −8.8 [−15.5, −2.0] * | 57.5 → 70.0 | +12.5 [0.0, 25.0] |
| 19 | 2 | Crypt Rats | 30.0 → 19.0 | −11.0 [−18.0, −4.0] * | 50.0 → 65.0 | +15.0 [0.0, 30.0] |
| 19 | 3 | Night's Whisper | 30.0 → 22.0 | −8.0 [−15.0, −1.0] * | 60.0 → 62.5 | +2.5 [−15.0, 20.0] |
| 21 | 0 | attack Gurmag Angler (Forge's) | 50.0 → 37.0 | −13.0 [−21.0, −5.0] * | 62.5 → 65.0 | +2.5 [−12.5, 20.0] |
| 21 | 1 | attack none | 35.0 → 22.5 | −12.5 [−19.0, −6.0] * | 55.0 → 52.5 | −2.5 [−10.0, 5.0] |
| 21 | 2 | attack Angler + Archaeomancer | 45.5 → 38.0 | −7.5 [−15.5, 0.5] | 42.5 → 62.5 | +20.0 [7.5, 35.0] * |
| 23 | 0 | Night's Whisper (Forge's) | 48.0 → 55.0 | +7.0 [−0.5, 14.5] | 57.5 → 67.5 | +10.0 [0.0, 22.5] |
| 23 | 1 | pass | 51.5 → 53.0 | +1.5 [−6.5, 9.5] | 50.0 → 62.5 | +12.5 [0.0, 27.5] |
| 25 | 0 | attack Mist Raven + Angler (Forge's) | 58.5 → 53.0 | −5.5 [−13.0, 2.0] | 95.0 → 92.5 | −2.5 [−7.5, 0.0] |
| 25 | 1 | attack none | 49.0 → 40.5 | −8.5 [−15.5, −1.5] * | 87.5 → 82.5 | −5.0 [−12.5, 0.0] |
| 25 | 2 | attack Raven + Angler + Archaeomancer + Rats | 59.5 → 58.0 | −1.5 [−8.0, 5.0] | 47.5 → 52.5 | +5.0 [−5.0, 15.0] |
| 25 | 3 | attack Gurmag Angler | 46.0 → 45.5 | −0.5 [−7.5, 6.5] | 92.5 → 90.0 | −2.5 [−10.0, 5.0] |
| 25 | 4 | attack Mist Raven | 54.5 → 46.0 | −8.5 [−15.5, −1.5] * | 82.5 → 92.5 | +10.0 [2.5, 20.0] * |
| 25 | 5 | attack Raven + Angler + Archaeomancer | 60.0 → 59.5 | −0.5 [−7.0, 6.0] | 95.0 → 90.0 | −5.0 [−12.5, 0.0] |
| 25 | 6 | attack Raven + Angler + Rats | 60.5 → 54.5 | −6.0 [−13.5, 1.5] | 75.0 → 65.0 | −10.0 [−22.5, 0.0] |
| 27 | 0 | Thorn of the Black Rose (Forge's) | 84.0 → 80.0 | −4.0 [−10.0, 1.5] | 92.5 → 92.5 | 0.0 |
| 27 | 1 | pass | 78.5 → 78.5 | 0.0 [−6.5, 7.0] | 97.5 → 97.5 | 0.0 |
| 27 | 2 | Flayer Husk | 85.0 → 84.0 | −1.0 [−6.0, 4.0] | 92.5 → 95.0 | +2.5 [−5.0, 10.0] |
| 29 | 0 | attack Gurmag Angler (Forge's) | 53.5 → 55.0 | +1.5 [−4.0, 7.0] | 55.0 → 52.5 | −2.5 [−12.5, 5.0] |
| 29 | 1 | attack none | 57.0 → 58.5 | +1.5 [−6.0, 9.0] | 52.5 → 65.0 | +12.5 [−2.5, 27.5] |
| 29 | 2 | attack all four | 69.5 → 70.0 | +0.5 [−3.0, 4.0] | 7.5 → 5.0 | −2.5 [−10.0, 5.0] |
| 29 | 3 | attack Angler + Archaeomancer | 60.5 → 65.5 | +5.0 [−0.5, 10.5] | 35.0 → 37.5 | +2.5 [−7.5, 15.0] |
| 29 | 4 | attack Angler + Mist Raven | 58.5 → 60.5 | +2.0 [−3.5, 7.5] | 57.5 → 55.0 | −2.5 [−15.0, 10.0] |
| 29 | 5 | attack Angler + Crypt Rats | 61.0 → 62.0 | +1.0 [−4.5, 7.0] | 25.0 → 32.5 | +7.5 [−5.0, 20.0] |
| 31 | 0 | attack Mist Raven (Forge's) | 74.0 → 67.5 | −6.5 [−11.5, −1.5] * | 95.0 → 95.0 | 0.0 |
| 31 | 1 | attack none | 67.5 → 58.5 | −9.0 [−14.5, −3.5] * | 95.0 → 92.5 | −2.5 [−7.5, 0.0] |
| 31 | 2 | attack Raven + Archaeomancer + Rats + Germ | 76.0 → 70.0 | −6.0 [−11.5, −0.5] * | 70.0 → 72.5 | +2.5 [−5.0, 10.0] |
| 31 | 3 | attack Raven + Archaeomancer | 76.0 → 69.0 | −7.0 [−12.5, −1.5] * | 92.5 → 92.5 | 0.0 |
| 31 | 4 | attack Raven + Crypt Rats | 74.5 → 67.5 | −7.0 [−12.5, −1.5] * | 75.0 → 70.0 | −5.0 [−12.5, 0.0] |
| 31 | 5 | attack Raven + Germ token | 76.0 → 69.0 | −7.0 [−12.5, −1.5] * | 92.5 → 95.0 | +2.5 [0.0, 7.5] |

## (ii)–(iii) The labels, side by side (J162 on f6dba5e4 | J164 on ce42306a; never pooled)

| d | kind, turn, options | Forge chose | J162 best (random) | J162 regret [95%] | **J164 best (random)** | **J164 regret [95%]** | Forge-map best, J162 → J164 | Forge-map regret, J162 → J164 |
|---|---|---|---|---|---|---|---|---|
| 17 | priority, t17, 5 | Generous Ent | o0 Generous Ent | 0 [0, 4.5] | o0 | 0 [0, 9.0] | o2 → o2 | 2.5 → 2.5 |
| 19 | priority, t19, 4 | Mist Raven | o0 Mist Raven | 0 [0, 6.0] | **o1 pass** | 1.3 [0, 8.5] | o3 → **o1** | 2.5 → 5.0 |
| 21 | attack, t19, 3 | attack Gurmag Angler | o0 | 0 [0, 4.5] | **o2 Angler + Archaeomancer** | 1.0 [0, 9.0] | o0 → o0 | 0 → 0 |
| 23 | priority, t19, 2 | Night's Whisper | o1 pass | 3.5 [0, 11.0] | **o0 Night's Whisper** | 0 [0, 6.0] | o0 → o0 | 0 → 0 |
| 25 | attack, t21, 7 | attack Raven + Angler | o6 Raven + Angler + Rats | 2.0 [0, 9.5] | **o5 Raven + Angler + Archaeomancer** | **6.5 [0.5, 14.5] confident** | o0 → o0 | 0 → 0 |
| 27 | priority, t21, 3 | Thorn of the Black Rose | o2 Flayer Husk | 1.0 [0, 7.5] | o2 | 4.0 [0, 10.5] | o1 → o1 | 5.0 → 5.0 |
| 29 | attack, t23, 6 | attack Gurmag Angler | o2 all four | **16.0 [10.5, 21.5] confident** | o2 | **15.0 [9.5, 21.0] confident** | o4 → **o1 attack none** | 2.5 → 12.5 [0, 30.0] |
| 31 | attack, t25, 6 | attack Mist Raven | o2 Raven + Arch + Rats + Germ | 2.0 [0, 5.5] | o2 | 2.5 [0, 6.5] | o0 → o0 | 0 → 0 |

- **(ii) One label's confident status changed: d25, not confident → confident.**
  - Its regret went from 2.0 [0, 9.5] to 6.5 [0.5, 14.5], with the best option now o5 (Mist Raven + Gurmag Angler + Archaeomancer) over Forge's two-creature attack.
  - The low end, 0.5, is just above zero, on a best picked after the fact.
  - **No label lost its status.** `confidentForge` did not change anywhere (0 of 8 on both copies).
  - **Confident: 1 of 8 (J162) → 2 of 8 (J164).**
- **(iii) Four best-option flips on the random map: d19 (o0 → o1), d21 (o0 → o2), d23 (o1 → o0) and d25 (o6 → o5).**
  - **Three of them are near-ties.** At d19, d21 and d23 the best's regret is 0–3.5 points with a low end of 0 on both copies, so the flips changed which of two near-equal options came out on top.
  - **d25's flip is the confident change above.**
  - **Forge map:** two flips, d19 (o3 → o1) and d29 (o4 → o1).
- **Information.**
  - Mean regret at Forge's choice over these eight: 3.1 points (J162) → 3.8 (J164).
  - Median best–worst gap: 11.5 → 13.25.
  - The two maps agree slightly more on the new copy, but on eight decisions neither number is a read. Same best: 1 of 8 → 2 of 8. Mean ρ: −0.34 → +0.15 [−0.26, 0.53].
  - Void labels 0.

## (iv) J162's three confident pauper5 labels
- **d29 survives.** Its best is still attacking with all four, and Forge's choice is still Gurmag Angler alone. The regret went from **16.0 [10.5, 21.5] to 15.0 [9.5, 21.0]**: the label is essentially unmoved, and its options' random-map values moved by only +0.5 to +5.0 points. Its Forge-map regret rose from 2.5 to 12.5, still not confident ([0, 30.0]).
- **d10 and d12 were not replayed.** Both forked before anyone was the monarch (no Monarch at d0–d14 in any fork's first frame), so the copier's Monarch could not touch them. Their J162 labels stand as J162's, on J162's tool: d10 13.5 [8.0, 21.0] and d12 21.0 [13.5, 28.5].

## (v) By Monarch holder, and Forge's own choice (information)
- **Mean signed random-map shift by who held the Monarch at the fork.**
  - **Seat B held it** (d17, d19, d21, d25; 19 options): **−7.9 points**. Seat A's values fell, the direction the mechanism suggests.
  - **Seat A held it** (d23, d27, d29, d31; 17 options): **−1.6 points**. The mechanism suggests a rise, and only d23 (+4.2) and d29 (+1.9) rose, neither clearly. d27 moved −1.7.
  - **d31 is the exception.** Seat A held the crown, yet A's values fell at every option, all six clear (−6.0 to −9.0). On the new copy B took the crown in 286 of d31's 1,200 random branches.
  - **Not tested here:** the reading that the dead crown had protected A more than its missing draws had cost it.
  - **The bias was not largest at d27–d31,** where the job expected it from J162's near-absence of new Monarchs. The largest moves were at d17–d21 (−9 to −11 a decision).
- **Option 0 (Forge's choice), random / Forge map:**

  | d | Forge's choice | random | Forge |
  |---|---|---|---|
  | 17 | Generous Ent | −11.5 | −2.5 |
  | 19 | Mist Raven | −12.5 | +7.5 |
  | 21 | attack Gurmag Angler | −13.0 | +2.5 |
  | 23 | Night's Whisper | +7.0 | +10.0 |
  | 25 | attack Mist Raven + Angler | −5.5 | −2.5 |
  | 27 | Thorn of the Black Rose | −4.0 | 0.0 |
  | 29 | attack Gurmag Angler | +1.5 | −2.5 |
  | 31 | attack Mist Raven | −6.5 | 0.0 |

## The tool's counters (`tool.json`, `atlas.json`)
- **Errors.** 0 branch errors, 0 engine errors, 0 unavailable, 0 timeouts (and 0 in a step), 0 unit errors.
- **Capped.** 0 rows, so D478's "capped is a draw" never applied here. J162 had 37 at these decisions, as above.
- **D479's counters.** `effectSourceNull` 0 branches (0 cards) and `exileLinksLost` 0 branches (0 links). They are reported only, never checked.
- **D477's counter.** `branchRestarted` 0. No card in either deck uses D476's or D477's paths, as the job expected.
- **G6.** X drawn 9,002 times, X = 0-only offers left out 50,126 times, X = 0 paid 0 times. Guard violations 0.
- **payfail** 0. `exits.txt`: `b-pauper5-464 0`. `missing.txt` is empty.

## What it says about D479's exposure claim
D479 named J162's pauper5 d17–d31 as the place a fork's game "most plausibly differs" (8,640 branch games, the copied Monarch never drawing). It said no unit had been replayed to size the shift. J164 sized it, and the answer splits in two:
- **The values moved materially. Yes.** On the random map the option values moved 6.0 points on average, 2.3 times the noise floor, and 17 of 36 moved clearly. Whole decisions moved by up to 11 points (d17–d21 −9 to −11, d31 −7). D479's rule not to pool maps across the fix is borne out at these decisions. On the Forge map the move is barely above noise (5.9 against 3.9, 3 clear).
- **The labels mostly did not move.** The options of a decision moved together, so the spread inside a decision is 1.8 points, and a regret is a difference between options. The one confident label in the range (d29) survives at 15.0 against 16.0. One label became confident (d25, low end 0.5). Three of the four best flips are among near-tied options.

Separating the Monarch from D479's other carries (timestamps, exile links, effect sources) is not possible from this design. Both copies ran on the same seeds, but the shift is new tool against old tool at these forks. The Monarch counter shows that half of D479 at work in 86% of branches, and D479's other counters show nothing lost on the new copy.

## Known gaps
- **One spine, eight decisions.** The shift is this spine's. It does not measure the bias on any other pair or seed, and no other spine had the Monarch at the scale D479's table names: J158's partial pauper5 464 and the J161/J162 pilots hold the other 3 decisions and 449 branch games.
- **What the shift contains.** It is everything that changed between f6dba5e4 and ce42306a at these forks: D479's whole carry pass, D478's scoring (0.1 point of it) and D476/D477 (unexercised). The Monarch is the part the counter sees.
- **The same seed is not the same game.** Once the copy differs, a branch's seed plays a different game, so the pairing reduces noise but does not match games one for one. noiseFloor (2.6 random, 3.9 Forge) is the paired bootstrap's own estimate.
- **The direction expectation was mixed.** It was not a registered rule. It held at 6 of 8 decisions, reading d23 and d29 as rises, though neither is clear. It failed clearly at d31.
- **The speed comparison is muddied** by the 18-minute memory-pressure episode from outside the job. Branch cost per step rose 3–16% outside that window.
- **The sizing in `labels.json`** (74 labels / 18 confident a 6-worker night) is over a replay of eight Monarch decisions only. It is not a sizing read for pauper5.

## What it says
The copier fix is live in the atlas. On J162's pauper5 464 spine, the Monarch at the fork drew in none of 8,640 branches on the old copier. On the new one it drew in 7,457 (86%) and changed hands in 5,048 (58%). The run was clean: 21 of 21 checks, all seeds J162's, 0 errors or timeouts, 1 h 20 min.

The bias was material for the values and small for the labels:
- **Values.** On the random map the 36 option values moved 6.0 points on average (noise 2.6), with 17 clear of zero, all downward, and up to 13 points at a single option (d21's Gurmag Angler attack, −13.0 [−21.0, −5.0]). The Forge map barely moved beyond noise.
- **Labels.** Within a decision the options moved together. J162's confident d29 survives (16.0 → 15.0), d25 turns confident (6.5 [0.5, 14.5]), and the other best-option flips are near-ties.
- **Accounting.** D478's draw rescoring explains 0.1 point of the shift. The rest is the copier.

These eight labels replace nothing in J162. They sit beside J162's, on their own sha, and J162's d10 and d12 stand because they forked before the Monarch existed.
