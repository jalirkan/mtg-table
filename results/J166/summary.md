# J166 — move atlas 4a: the cut design (D480) on random library decks: summary

Written 2026-10-25 by the PC session (the morning read ran the job's own readers, unchanged, over the data; no
engine). The job's Report block never ran, because the runner stopped at run4, so the readers (`labels.py`,
`reads.py`, `cuts.py`, `metrics.py` from `var/lab-j166-local/bin` at 325c2dd8, the Report block's own flags,
`--training=1`) were run by hand over the three finished spines; `metrics.py` over a shadow folder of links so s04's
rows and the validation draw were counted too. The arithmetic beyond the readers is in `report/` (`spines.json`,
`compare.json`, `cuts.json`, `redaction.txt`, `duplicates.txt`, `labels.json`, `labels.jsonl`, `reads.json`,
`tool.json`).

**Which number where a log and a file disagree:** spine wall from `spine-times.txt`; checks = that wall minus
atlas.json's `timing.wallMs` (as `cuts.py` defines it; 175 s on s01 where run1.log says 174 — start-up); s04 has no
`spine-times.txt` line and no atlas.json, so its wall is run4's window (00:05:25–03:05:48, 10,823 s) and its counts
come from its own `branches.jsonl` and `units.jsonl`. Nothing else disagrees.

**The population.** Random library decks by band, drawn as the census draws them (D447), on the D476–D480 tool with
the cut design, pinned at 325c2dd8. Every row carries `training: true` and `pool: random-<band>`; none is pooled
with any earlier atlas.

## The run

- 21:50:53 to 03:05:48 EDT (5 h 15 min). STATUS `failed`, "step run4 ran past 10800 s".
- 6 workers, sized by memory (the job asked for 7); peak worker RSS 1.11 GB.
- The pilot passed 50 of 50 checks: the pin carries D466–D472 and D476–D480; the draw reproduced all three
  registered sha256s; the smoke branched 2 decisions in full and made 2 labels, no problems.
- One memory dip during s04: the pool dropped to 5 workers 02:34–02:48 (swap-in 5,230/s at 6.0 of 21.4 GB).
- Exits: s01 exit 0; s02 and s03 exit 3 on the redaction check alone; s04 killed by the runner; s05–s13 never ran.
- Disk 4.2 GB.

## (1) Per spine and in total

| | s01 pauper | s02 peasant | s03 legacy | **s01–s03** | s04 powered (killed) |
|---|---|---|---|---|---|
| decks A / B | k5 / k1 R | k3 URG / k1 B | k5 / k5 | | k3 WRG / k1 W |
| baseline (turns, winner) | 32, A | 12, B | 28, A | | 38, A |
| decisions listed / with k ≥ 3 | 23 / 9 | **6 / 1** | 22 / 13 | 51 / 23 | 63 / 41 |
| in full / screened / filled from k < 3 | 8 / 0 / 0 | 6 / 0 / 5 | 8 / 0 / 0 | **22 / 0 / 5** | 8 picked, 3 with complete random rows, no atlas |
| options (distinct plays) | 28 (26) | 13 | 33 (27) | 74 (66) | 42 |
| options stopped early | 6 | 1 | 4 | **11** | 7 |
| branch games | 5,780 (880 Forge) | 2,500 | 6,000 | **14,280** | 3,887 |
| labels / confident | 8 / 1 (confidentForge 1) | 6 / 1 | 8 / 2 | **22 / 4** | 0 |
| engine errors / timeouts | 0 / 0 | 0 / 0 | 0 / 0 | **0 / 0** | 135 / 135, all in-step; plus 14 hung units |
| unavailable / restarts | 0 | 0 | 0 | 0 | 0 |
| capped (a draw, D478) | **1,217 (21.1%)** | 124 (5.0%) | 283 (4.7%) | 1,624 (11.4%) | 4 |
| effectSourceNull / exileLinksLost | 0 / 0 | 0 / 0 | 0 / 0 | **0 / 0** | 0 / 0 |
| units done / planned | 80 / 80 | 48 / 48 | 64 / 64 | 192 / 192 | 33 done, 3 hung |
| wall (phase B; checks) | 47.8 min (44.8; 175 s) | 29.4 min (27.9; 83 s) | 48.6 min (43.7; 285 s) | **2 h 05.8 min** | 3 h 00.4 min |
| branch games an hour, wall / phase B | 7,260 / 7,749 | 5,105 / 5,367 | 7,407 / 8,230 | **6,813** | 1,293 |
| mean random branch | 2.81 s | 3.47 s | 2.31 s | | 14.0 s (9.5 s without timeouts) |

All 22 decisions branched in full are complete, 0 void, 0 rows unmatched: 7.3 labels a spine, not 8, because
s02's game listed only 6 decisions. The four confident labels: s01 d7 (priority, k5) Flayer Husk over Forge's
Mindstab Thrull by 5.2 [0.2, 13.2]; s02 d3 (attack, k2) attacking with none over Forge's attack with Evolution
Sage by 13.2 [5.2, 21.2]; s03 d0 (priority, k3) Springheart Nantuko over Forge's pass by 13.0 [4.2, 22.3]; s03 d15
(priority, k5) Hornet Queen over Forge's pass by 21.8 [13.8, 28.8]. Confident share 0.18 [0.04, 0.36],
decision-level, each band one spine.

## (2) The registered sizing read

| | labels / confident per 7-worker 10-h night |
|---|---|
| **J166 s01–s03 as run** (`c_sizing7`) | **122 / 22.3** (s01 117 / 14.7, s02 143 / 23.8, s03 115 / 28.8) |
| J166 counting s04's wasted 3.0 h | 50 / 9.1 |
| the review, section 5 | ~25–27 (Forge map on every spine), ~30–32 (on 1 in 6); J166 had it on 1 of 3 finished spines |
| J162 as run (pre-cut) | 91 / 11 |
| the six current-tool cube spines | 99 / 14 |
| J164 | not comparable (a replay of 8 decisions) |

22.3 sits just under ~25–27 but rests on 4 confident labels: a Poisson 95% interval on 4 spans roughly 6–57 a
night, so the night cannot separate 22 from 27, nor from J162's 11. Labels per night are firmer: 122 against 91
(+34%). s04 would have cost about 6–6.5 h for the one spine (3,887 of at most ~7,500 rows at 14 s a branch, with
hangs), about 8 times an s01–s03 spine. Cost per label against J162, in reserved worker-hours: a decision 0.57 vs
0.71, a label 0.57 vs 0.77, a confident label 3.1 vs 6.5 (mixed causes: no Forge map on 2 of 3 spines, fewer
options).

**Did the cuts save what section 5 said? Partly** (`report/cuts.json`):

| | J166 s01–s03 | expected |
|---|---|---|
| branch time saved, early stopping + screen | **7.7%** (s01 11.4, s02 4.6, s03 5.3) | 18–20%; D480's replay 20.3% |
| … early stopping (11 options stopped) | 7.7% | 14.3% |
| … the screen | **0%: no decision screened** (closest s03 d21 at .9475 vs .96; s02 d5 at .0867 vs .04) | 7.7% |
| the checks | **38 s per 1,000 branch games; 7.2% of the wall** (6.1 / 4.7 / 9.8) | serial 93 s and ~19%; expected ~6% |
| idle share in phase B | **8.9%** (5.2 / 12.5 / 10.4) | ~10% assumed |
| reserved time against branch time | 12.58 / 10.43 wh = **1.21** | 1.26 serial; ~1.06 expected |

Why early stopping saved less: s02 averaged 2.17 options a decision and nothing can stop in a 2-option decision
(option 0 and the leader never stop); the duplicate options in (3) cannot be separated from their twins. Whether
the labels were kept cannot be tested here (no uncut control); D480's replay (13 of 13) remains the only evidence.

## (3) Random library decks against the cube pairs (J158, J162)

- **Fewer decisions, fewer wide ones.** Listed per baseline turn 0.50–0.79 against 1.15–1.87 on the cube pairs
  (s04 1.66); listed with k ≥ 3: 9, 1, 13 against 14–29; options per branched decision 3.50, 2.17, 4.13 (distinct
  plays 3.25, 2.17, 3.38) against 3.38–4.50.
- **Longer games, far more capped.** 33.2, 25.1, 30.4 turns against 17.4–26.8; capped 21.1%, 5.0%, 4.7% against at
  most 0.5%. s01's worst full-n option is d14's `pass`, capped 89 of 240 (37%); a stopped option on its short n
  reached 26 of 50.
- **Branch cost and rates.** Mean random branch 2.81, 3.47, 2.31 s against 1.44–3.89; confident share 0.18 against
  J162's 0.119 and J158's 0.188; median best–worst gap 5.5, 3.0, 9.1 points against 2.75–8.5; mean regret at
  Forge's choice 3.5 [1.5, 6.6] against J162's 2.7; kinds branched: 20 priority, 2 attacks, 0 blocks.
- **Error kinds:** none on s01–s03; s04 timeouts and hangs; J162 had the Rider's 2,400 errors and 62 NPEs.
- **Duplicate options.** Eight branched options repeat another option's `cast:<id>` token and are identical at 200
  of 200 paired branches: Mindstab Thrull at s01 d6 and d7, Murderous Rider at s03 d7, d9, d11, d15, d18, d19. They
  cost 1.31 of 10.43 branch worker-hours (**12.5%**; 9.9% of s01's, 23.3% of s03's); they inflate k (s03's d7, d9,
  d11 are really 2-way but sit in the k ≥ 3 pool; the two "5–6-option" confident labels are really 4-option). **The
  Rider's adventure was never played:** both Rider options put the creature on the stack (20 branches each of d9 and
  d15). In J162's ff5 462 d5, where Forge chose Swift End, the pair differed at 198 of 200; in J158 (before D472)
  identical at 200 of 200. Not replayed. (A diagnosis is running; see the heartbeat.)

## (4) D479's counters and D478's capped options

- effectSourceNull 0 and exileLinksLost 0 over all 18,167 rows, s04's included (written only above 0, so real).
- Restarts 0, unavailable 0; no branch errors on s01–s03.
- Capped 1,624 of 14,280 (11.4%), all 9 warnings on s01 — a warning by design, the nearest thing to a threshold.
- Timeouts 135 of 18,167 (0.74%), all s04's: under the job's 1% check only because the good spines dilute it; s04
  alone 3.5%.
- The screen: nothing crossed it (near misses s03 d21 .9475, s02 d5 .0867).
- Guardrails: 0 violations; G6 X drawn 8,537 times, 147,626 X=0-only offers left out, X=0 paid 0 times; G5
  refusedCast 129 vs payfail 131; noRepeatNoOp 215.
- Agreement and C1 on s01, the one finished Forge-map spine: same best 0.50 [0.13, 0.88]; ρ 0.19 [−0.47, 0.82];
  **C1 +4.1 [0.9, 7.5], HOLDS** (the Forge map +5.5 [−5.2, 16.3]). Random-map C1 on s02 and s03, information only:
  +3.6 [−0.1, 8.9] and +4.9 [−0.1, 9.4].
- The validation draw: 13 folders, 26 decks, sha256 ok, none branched.

## (5) The two faults

**The redaction "problem" (M55/D347).** `tools/check-redaction.mjs --empty-hand-ok` re-run over all 17,004 frame
logs of s02 and s03 reproduces atlas.json's counts exactly: 1 log on s02, 1,395 on s03. s03: 1,395 logs (11.6%)
with 1,891 failing decisions, every one a `choice` with source `entity` and two options, one an id no frame of that
log ever names before it: 1,701 the legend-rule choice between two Boo (Minsc & Boo), 190 (71 logs) between Zirda,
the Dawnwaker and a token copy of it from Springheart Nantuko's landfall; in all 8 branched decisions, 6 in seat 1's
logs. s02's one failure is a different shape: d2-random-o1-b21, decision 88, a `target` naming card 17, seat 0's own
Tear Asunder, cast and then targeted by seat 0's Take It Back between frames (seqs 323–324 show an empty stack; 325
shows it). Neither a token nor a legend-rule choice. **D481** (in review) accepts an id the next state frame shows
the viewer owning in a public zone; whether s02 and s03 pass on re-check depends on it covering all three.

**Scute Swarm (s04).** Deck A holds one; no other spine or validation deck does. 135 branches hit the 120-s
timeout, all inside one engine step; in 123 of them the last frame shows 50 or more Scute Swarms (median 128, max
608); the step clock fired late on 15, as late as 1,343 s. 14 units gave no answer for 1,800 s (d0, d6, d12, d29),
7.0 worker-hours, 3 units failed. The spine's branches ran slow throughout: 14.0 s mean (median 5.4; 197 over
60 s), 27.5-turn games of 395 steps. In 3 h 0 min (~17.8 reserved worker-hours) it played 3,887 branch games,
finished 3 of its 8 decisions' random rows, wrote no atlas. **D482** (in review) puts the card on an
engine-unplayable list the census draw skips.

## (6) What J167 should be

- **s04 starts fresh, not resumed:** new decks mean a new plan; plan.json's resume check and the schedule header
  (03c5ab94) refuse other decks. The old s04 folder is moved aside by hand (nothing deleted under lab-j166) or J167
  names its s04 folder differently.
- **`--chunk 10` will not run with `--screen 25`:** `checkCuts` refuses a checkpoint that is not a multiple of the
  chunk. A smaller chunk barely changes what a hang costs anyway (a hung unit keeps its finished rows; each hang
  costs the 30-min unit timeout). Keep chunk 25.
- **Run s05–s13:** at s01–s03's mean of 42 min a spine, ~6.3 h; with s04 (~45 min if it behaves), the pilot and
  the re-check, ~7.5 h at 6 workers. s08 and s12 are powered, the slow-tail risk; keep the 3-h block cap.
- **Re-check s02 and s03 under D481; do not re-run them.** A finished spine's atlas command, resumed, should redo
  only the checks (~1.5 and ~5 min); untried on a pin newer than 325c2dd8.
- **D482 and the draw:** if it filters the pool rather than redrawing a deck that holds the card, any legacy or
  powered deck that drew green may change and the registered sha256s (e998ad3c…, 7def89fa…) no longer reproduce;
  s03 was drawn from the old pool; the validation draw holds no Scute Swarm.
- **Raise first:** count distinct plays rather than tokens in `--min-options`, and check whether the fork maps the
  Rider's adventure at all (12.5% of branch time; three 2-way decisions in the k ≥ 3 pool).
- **Keep everything else:** the screen cost nothing and fired on nothing; early stopping helps; three spines give
  no grounds to change k ≥ 3, the Forge map on 3 of 13, or the sizing.

**Unsure of:** every interval is one pair's; 22.3 a night rests on 4 confident labels; s04's what-if cost is a
rough estimate; the Rider reading has not been replayed; whether a finished spine re-checks cleanly on a newer pin.
