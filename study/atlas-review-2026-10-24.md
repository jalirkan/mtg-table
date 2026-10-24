# Move atlas review: where the information is, what it costs, what to cut (2026-10-24, before J162's end)

Prepared by the PC session's lab analyst for Justin's review with the main session. **Read-only on the lab data, no engine.**
**Method only:** these are design numbers, not verdicts on any deck, card or the AI.

**Data used**

| corpus | spines | tool / random policy | used for |
|---|---|---|---|
| **primary** | ff5 461, peasant7 463 (J158, db496097, pre-G6); pauper5 464, synergy9 465 (J162, f6dba5e4, complete) | the latest two | every headline number |
| **secondary** | ff5 452-454, peasant7 455-457 (J156, 6fb13bf9); vintage7 458-460 (J157, 9fe69ad8) | older policies | a second check of the design simulations, and vintage for contrast. **Never pooled with the primary corpus as labels.** |
| not used | modern7 466 (J162, running: 2,432 branch rows at 09:40), ff5 462 (not started) | | |

**How the numbers were made**

- J162's own `labels.py` and `reads.py` were run by hand over the two complete J162 spines into the scratchpad (`work/labels-j162.json`, `work/reads-j162.json`). J158's numbers are from results/J158.
- The design simulations re-score `phaseB/branches.jsonl` with `atlasmath.regretInterval`'s arithmetic: paired rows, complete branches only, the best picked after the fact, and a 2.5% bootstrap low end. My bootstrap reproduces the atlas's `confident` flag at **182 of 183** decisions; the one miss is a boundary case in ff5 452.
- Scripts: `scratchpad/bin/` (`load.py`, `s12.py`, `s1.py`, `s2.py`, `s3.py`, `s3b.py`, `s3d.py`, `s5.py`). Outputs: `scratchpad/work/`.
- Bootstrap draws: 1,000 for the simulations and 30 subsample repeats. Seeds are fixed in the scripts.
- The simulations use the 63 primary and 139 secondary decisions with at least 150 complete random rows. This leaves out ff5 461 d14 (74 complete, D470's NPE).

---

## 1. Where the information is

### 1a. Per pair (one spine each in the primary corpus; vintage as contrast)

| pair (spine) | job | baseline turns | listed | branched | decided / settled / Q | median best-worst gap (random map, pts) | mean regret (pts) | confident (share) | confidentForge | same best (of Q) | mean rho | C1 "cast now" (random map, pts) | labels / confident per 7-worker 10-h night |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ff5 461 | J158 | 21 | 31 | 16 | 0 / 3 (all D470-void) / 16 | 4.8 | 2.4 | **4** (.25) | 1 | 7/16 | -0.05 | **+4.3 [1.0, 7.6] HOLDS** (n 8) | 130 / **32** |
| peasant7 463 | J158 | 20 | 23 | 16 | 2 / 2 / 14 | 8.3 | 2.0 | 2 (.13) | 1 | 5/14 | 0.18 | **+2.8 [0.3, 5.0] HOLDS** (n 12) | 106 / **13** |
| pauper5 464 | J162 | 25 | 32 | 16 | 0 / 0 / 16 | 8.5 | 4.2 | 3 (.19) | 0 | 5/16 | -0.10 | **+4.1 [1.3, 6.9] HOLDS** (n 10) | 92 / **17** |
| synergy9 465 | J162 | 23 | 43 | 16 | 0 / 4 / 16 | **2.8** | 1.9 | 1 (.06) | 2 | 9/16 | 0.25 | +0.0 [-1.3, 1.4] NOT SHOWN (n 11) | 155 / **10** |
| vintage7 458-460 (contrast) | J157 | 11-14 | 11-18 | 43 | 8 / 12 / 35 | 1.0-4.1 | 0.8-1.3 | 1 of 43 (.02) | 0 | 11/35 | 0.00 | not registered | ~290 / **~6** |
| ff5 452-454 (old policy) | J156 | 17-20 | 26-27 | 48 | 0 / 3 / 48 | 5.5-15.0 | 5.1-9.8 | 18 (.38) | 17 | 30/48 | 0.55 | +8.3 [4.2, 13.3] | 21-52 confident |

- **The C1 verdicts** are the registered (iv) by pair: `iv_byPair` for J162 and J158's summary for J158.
- **The night rates** are labels.py's `c_sizing7`: the 6-worker wall scaled to 7, checks included.
- **Pooled J162** (two spines): 32 labels, 4 confident (0.125 [0.0, 0.28]), 0 void, 0 decided. (i) same best is 0.44 [0.22, 0.69]; (ii) rho is 0.06 [-0.28, 0.46].

### 1b. By decision kind (primary corpus, 64 decisions; secondary beside)

| kind | n | settled | mean regret (pts) | median regret | mean gap | confident (share) | confident per branch worker-hour | secondary: n / confident (share) / conf per wh |
|---|---|---|---|---|---|---|---|---|
| priority | 42 | 4 | 2.9 | 1.5 | 7.2 | 7 (.17) | 0.31 | 103 / 24 (.23) / 0.51 |
| attack | 17 | 1 | 2.8 | 1.0 | 8.9 | 3 (.18) | 0.43 | 28 / 4 (.14) / 0.35 |
| block | 5 | 4 | **0.0** | 0.0 | 1.1 | **0** | 0 | 8 / 2 (.25) / 1.9 (pre-D470, suspect) |

### 1c. What predicts a confident label (primary, then all 13 spines)

| predictor | bucket | decisions | confident (share) | confident per branch worker-hour |
|---|---|---|---|---|
| **options k** (primary) | 2 | 25 | 1 (.04) | 0.11 |
| | 3-4 | 19 | 1 (.05) | 0.14 |
| | 5-6 | 11 | 4 (.36) | 0.55 |
| | 7-8 | 9 | 4 (.44) | 0.62 |
| options k (all 13 spines) | 2 | 80 | 7 (.09) | 0.30 |
| | 3-4 | 75 | 15 (.20) | 0.45 |
| | 5-8 | 48 | 18 (.38) | 0.55 |
| **random-map base value p** (mean over options; all 13 spines) | p(1-p) < .05 (p < ~.05 or > ~.95) | 38 | 2 (.05) | |
| | .05-.15 | 42 | 6 (.14) | |
| | .15-.20 | 34 | 5 (.15) | |
| | > .20 (p ~ .3-.7) | 89 | **27 (.30)** | |
| **inertness** (share of branch indices where every option scored the same; primary) | >= .95 | 10 | 0 | 1.4 wh spent |
| | .8-.95 | 11 | 2 | |
| | < .8 | 43 | 8 | |

**Spine-level base values** (random map / Forge map, seat A's mean):

| spine | random | Forge | confident |
|---|---|---|---|
| synergy9 | .10 | .29 | 1 |
| ff5 461 | .14 | .16 | 4 |
| peasant7 | .75 | .79 | 2 |
| pauper5 | .42 | .68 | 3 |
| vintage 458 | .91 | | 0 |

**Headlines**
- **The pair is the biggest lever.** Confident labels per 7-worker night run from ~6 (vintage) and 10 (synergy9) to 32 (ff5 461). J156's ff5 spines gave 21-52.
- **Information follows two measurable things:**
  - **Option count.** A decision with 5 or more options is 4-5x as likely to give a confident label as a 2-option one, and 4-5x more productive per worker-hour.
  - **The random-map base value.** Where random play has the game nearly decided, the options cannot separate.
- **D451's pair rule optimises the opposite.** It ranks by the Forge ladder's evenness, but synergy9 is "even" under Forge (.29 here) and lopsided under random play (.10).
- **The kinds.**
  - Attack decisions are the most productive per worker-hour on the primary corpus (0.43).
  - **Blocks have yielded nothing usable yet.** All 5 branched blocks are void (3, D470) or settled (2).
- **The vintage lesson repeats on synergy9:** a median gap under 3 points and 1 confident label in 16.

---

## 2. Cost per label

### 2a. Per spine (6 workers; worker-hours = wh)

| spine | random s / branch | Forge s / branch | Forge share of branch time | timeouts | errors | branch wh | unit wh (with replay) | replay overhead | phase B wall h | checks h (**one core**) | checks share of wall | worker-h idle during checks | reserved wh (wall x 6) | reserved wh / label |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ff5 461 | 1.82 | 1.52 | 14% | 0 | 211 (D470) | 6.97 | 7.11 | 2.1% | 1.19 | 0.25 | 17% | 1.25 | 8.6 | 0.54 |
| peasant7 463 | 1.82 | 1.22 | 12% | 0 | 0 | 8.24 | 8.35 | 1.3% | 1.40 | 0.37 | 21% | 1.84 | 10.6 | 0.66 |
| pauper5 464 | 2.47 | 1.57 | 11% | **0** (J158: 243) | 0 | 9.27 | 9.43 | 1.7% | 1.58 | 0.45 | 22% | 2.23 | 12.2 | 0.76 |
| synergy9 465 | 1.44 | 2.32 | 24% | 0 | 0 | 5.72 | 5.93 | 3.7% | 0.99 | 0.22 | 18% | 1.08 | 7.2 | 0.45 |
| **mean** | 1.89 | 1.66 | 15% | 0 | | 7.55 | 7.71 | 2.2% | 1.29 | 0.32 | **20%** | 1.60 | **9.66** | 0.60 |

- **Phase B keeps the workers busy.** The sum of unit time equals the phase B wall x 6 to within 0.3%, so there is no idle tail.
- **The checks are serial.**
  - They are `rowscheck` plus `redactionCheck`, which spawns `node tools/check-redaction.mjs` 100 logs at a time, one batch after another. Redaction is 8-15 min of each spine's checks (482-926 s, ~60% of them): 26,000-35,000 frame logs.
  - So **for ~20% of every spine's wall, 5 of the 6 workers sit idle.** That is ~1.6 reserved worker-hours a spine, or ~11.6 of a 70-wh night.
- **J162's fixes work at scale.** pauper5 had 0 timeouts (J158: 4.0%, 42% of its branch time), 0 errors and 0 unavailable options. Its random branches cost 2.47 s (J158's partial: 13.2).

### 2b. By decision position (rank of the 16 in the spine, quarters)

| quarter | primary: n / mean turn | s / random branch | s / Forge branch | mean options | worker-s / decision | confident | confident per branch wh | secondary: worker-s / decision, confident per wh |
|---|---|---|---|---|---|---|---|---|
| Q1 (earliest) | 16 / 6.2 | 3.42 | 2.95 | 2.8 | 2,077 | 3 | 0.33 | 1,933, 0.32 |
| Q2 | 16 / 12.8 | 2.21 | 2.10 | 4.1 | 2,092 | 5 | 0.54 | 1,909, 0.43 |
| Q3 | 16 / 16.8 | 1.92 | 1.60 | 3.6 | 1,661 | 1 | 0.14 | 1,441, 0.71 |
| Q4 (latest) | 16 / 20.6 | 0.94 | 0.66 | 4.9 | 966 | 1 | 0.23 | 891, 0.71 |

- **Cost by position.** An early branch costs 3.6x a late one, and an early decision 2x a late one (late decisions have more options).
- **Yield by position.** No position wins consistently: the primary corpus favours Q2, the secondary Q3-Q4.

### 2c. Rates

| | ff5 | peasant7 | pauper5 | synergy9 | as run (4 spines) |
|---|---|---|---|---|---|
| reserved wh a spine | 8.6 | 10.6 | 12.2 | 7.2 | 9.66 |
| labels / confident a spine | 16 / 4 | 16 / 2 | 16 / 3 | 16 / 1 | 16 / 2.5 |
| **labels / confident per 7-worker 10-h night** | 130 / 32 | 106 / 13 | 92 / 17 | 155 / 10 | **~116 / ~18** |
| 1,000 confident labels at that rate | 31 nights | 77 | 59 | 100 | **~54 nights** |

---

## 3. What a smaller design would have found (simulated on the existing branches)

### 3a. Fewer random branches (paired subsample of the 200, 30 repeats)

| n random | branch time saved | same best as 200 | same CONFIDENT status | confident found | of the 10 kept | new (not confident at 200) | confident per branch wh | secondary: same status, kept of 32 |
|---|---|---|---|---|---|---|---|---|
| 200 | 0 | — | — | 10 | 10 | 0 | 0.33 | — |
| 150 | 21% | 85% | 96% | 9.3 | 8.4 | 0.9 | 0.39 | 95%, 26.8 |
| 100 | 43% | 77% | 93% | 7.9 | 6.8 | 1.1 | 0.46 | 91%, 22.4 |
| 50 | 64% | 66% | 89% | 6.4 | 4.8 | 1.6 | 0.59 | 87%, 16.4 |

- **The trade.** Fewer branches find more confident labels per hour, because the big effects show early. But they lose a third of the labels at 100 and identify the best option worse.
- **A confident label is marginal.**
  - **Split-half test** at 100 vs 100 on independent halves: a label confident on one half is confident on the other only **54%** of the time (primary; secondary 60%).
  - The "best option" agrees on 55% (primary) and 63% (secondary) of decisions.
  - **This is the main quality caveat for rung 4.**

### 3b. Early stopping per option (checkpoints at 50, or at 50/100/150; drop an option clearly below the leader)

| rule | options dropped | o0 (Forge's) dropped | random time saved | of all branch time | same confident status | same best | secondary: saved, same status |
|---|---|---|---|---|---|---|---|
| W50: Wilson, unpaired, at 50 (the brief's rule) | 12 | 2 | 4,176 s | 3.9% | 63/63 | 63/63 | 3.9%, 138/139 |
| P50: paired bootstrap (CRN), at 50 | 35 | 6 | 11,019 s | 10.2% | 62/63 | 63/63 | 10.7%, 137/139 |
| P50/100/150 | 65 | 9 | 16,523 s | 15.3% | 62-63/63 | 63/63 | 15.5%, 136/139 |
| **P50/100/150, o0 never dropped** | not counted | 0 | 13,750 s | **12.7%** | **63/63** | 63/63 | 11.2%, 139/139 |
| ... + Forge map only on surviving options | | | +3,754 s | **16.2%** | 63/63 | | 14.5%, 139/139 |

- **Use the paired test.** Branch i of every option shares its seed, so the paired test drops 3-5x what the Wilson rule drops.
- **Keep Forge's own option (o0) to the full 200.** Then the label (regret, measured against o0) loses no precision.
- **Code needed.** A unit today plays all options per branch index. Stopping needs a unit to carry an option subset and a barrier after each checkpoint.

### 3c. What the Forge map buys

| | primary | secondary |
|---|---|---|
| Forge share of branch time | **14.7%** (11-24% by pair; synergy9 24%) | 13.5% |
| Q decisions where Forge's best ≠ random's best | **36 of 61** | 65 of 131 |
| decided by both maps vs random map alone | 2 vs 2 | 8 vs 8 |
| settled by both maps vs random map alone | 9 vs 11 | 17 vs 17 |
| Forge at 20 (not 40): saves | 7.3% | 6.8% |
| ... Forge's best unchanged | 79% | 81% |
| ... (i) same-best status unchanged | 88% | 86% |
| ... decided unchanged | 100% | 100% |
| ... confidentForge unchanged | 96% | 92% |
| Forge on the top 2 only (o0 and random's best): saves | 7.4% | 7.2% |
| ... and rho | undefined (two options) | |

**What depends on the Forge map**

| uses it | does not use it |
|---|---|
| (i) same best (defined on it), (ii) rho, (iii)'s Forge column, `confidentForge`, `regretForge*`, C1 and C2's Forge column | **the label** (`regret` and `confident` are random-map only) |
| `complete`, `decided`, `settled` and Q (they need both maps; random alone gives the same `decided` here) | |

- **Agreement is near chance.** After three rungs, same best is ~.33-.44 and rho ~.06 on the latest policy.
- **So the Forge map is the agreement study's instrument, not the label's.** It costs ~15% of every labelling night.

### 3d. Skipping decisions after a 25-branch pre-screen (the first unit, indices 0-24)

| rule at 25 branches | primary: skipped | net branch time saved | confident lost | secondary: skipped, saved, lost |
|---|---|---|---|---|
| settled (every option >= .95, or every option <= .05) | 10 | 3.8% | 0 | 23, 3.7%, 1 |
| inert (24 of 25 indices identical across options) | 11 | 4.7% | 0 | 20, 2.2%, 1 |
| **near-decided: mean value <= .04 or >= .96** | 12 | **7%** | **0** | 25, 4%, 1 |
| near-decided at .06 / .94 | 17 | 13% | 1 | 29, 6%, 1 |
| near-decided at .10 / .90 | 19 | 16% | 3 | 40, 11%, 2 |

- **Prefer replacing to skipping.** A skipped decision's budget is better spent on the next listed decision than saved.
- **The .04 threshold was picked on this data.** The secondary corpus is its holdout: 1 of 31 lost.

### 3e. 16 decisions a spine vs 8 (halves of each spine: even and odd ranks)

| corpus | confident per branch wh: 16 | even 8 | odd 8 | only k >= 3 | per-spine confident counts | variance / binomial |
|---|---|---|---|---|---|---|
| primary | 0.331 | 0.322 | 0.341 | **0.425** | 4, 2, 3, 1 | 1.7 / 2.1 |
| secondary | 0.502 | 0.306 | 0.692 | 0.532 | 5, 6, 7, 3, 2, 6, 0, 1, 0 | **7.5 / 2.6** |

- **No fixed cost per spine.** The baseline is 5-7 s and the replay ~2%; the checks and leak checks scale with branches. So 8 decisions cost half a spine, and **wide-and-shallow is yield-neutral in expectation.**
- **What it buys is spread.**
  - The secondary corpus is ~3x over-dispersed between spines. The pair and seed dominate the variance (vintage spines give 0).
  - So 2x the spines gives the same mean with a lower-variance night and twice the pairs and seeds. The labels are also less correlated, which rung 4 wants.
- **Is k >= 3 selection feasible?** Every primary spine lists at least 8 decisions with k >= 3 (3 of 4 list at least 16). In the secondary corpus, 7 of 9 list at least 8.

---

## 4. What the atlas cannot do yet / open gains

| item | the measure | gain / what it needs |
|---|---|---|
| **Blocks** | Listed: 15 of 148 decisions (ff5 461 4, peasant7 0, pauper5 1, synergy9 8, modern7 2). Branched: 5 (J158 3 void, J162's synergy9 d28 and d42 both near-lost, regret 0). **0 unavailable rows** in J162's complete spines. | D470's fix has not met an informative block yet. A block quota (branch every listed block with k >= 3: synergy9 alone has 6) would test it. |
| **The option cap (8)** | k = 8 at 3 of 129 listed decisions (primary), 5 of 209 (secondary) | Rarely binds; low priority. The productive end is k 5-8, so the cap is not the limit. |
| **Forge's own line as a baseline** | The label is regret against o0 (Forge's choice) under the random map. Seat A's base value differs by map (pauper5 .42 random vs .68 Forge; synergy9 .10 vs .29). | The random map measures "value under random play". On lopsided pairs it is near-decided and silent. Pair choice should use the **random-map** base value (phase A, or the spine's first decisions), not Forge ladder evenness. |
| **The labels' use (rung 4)** | Every label is `notForTraining` (confirm-set decks, D318/D340). | Rung 4 has no consumer until **Justin's confirm-set call**. Alternative: **`tools/ai-bench/pairs-dev.txt` exists.** An atlas on dev pairs removes the held-out objection, though the generic `notForTraining` marker still needs its own decision. |
| **The vintage lesson** | J157: median gap 1.5, 1 confident in 43; synergy9 repeats it (2.8, 1 in 16) | **Screen pairs by information before spending nights.** |
| **Label quality** | A confident label replicates on an independent half only ~50% of the time (3a) | A "confirmed" tier, where confident needs both halves or 400 branches, would be cheaper than more nights of marginal labels. |
| **Pairs not yet measured** | D451's rule, recomputed from the lab's ladder (25,056 games; it reproduces J158's top 7 exactly) | See the table below. |

**Pair-rule ranks 1-10 (ranks 11-30 are in `work/`)**

| rank | line | pair | games | score | ladder turns | atlas status |
|---|---|---|---|---|---|---|
| 1 | 2 | fair-fight-900000005 | 844 | .0538 | 17.9 | measured (J156 x3, J158) |
| 2 | 18 | peasant-900000007 | 828 | .0546 | 16.6 | measured (J156 x3, J158) |
| 3 | 28 | vintage-900000007 | 832 | .0592 | 14.5 | measured (J157), low info |
| 4 | 25 | vintage-900000001 | 836 | .0625 | 16.3 | untried; same cube as vintage7, out |
| 5 | 12 | pauper-900000005 | 832 | .0747 | 21.2 | measured (J162) |
| 6 | 24 | synergy-900000009 | 836 | .0756 | 17.7 | measured (J162), low info |
| 7 | 8 | modern-era-900000007 | 836 | .0840 | 15.8 | J162, running |
| **8** | 7 | **modern-era-900000005** | 836 | .0970 | 19.2 | **untried** |
| **9** | 19 | **peasant-900000009** | 828 | .0978 | 18.1 | **untried** |
| **10** | 4 | **fair-fight-900000009** | 836 | .1053 | 18.4 | **untried; the fair-fight cube is the high-information one** |

D451's rule offers "the pair we are most sure is even" on the Forge ladder. It says nothing about information. By cube, the measured order is fair-fight > pauper ≈ peasant > synergy ≈ vintage.

---

## 5. Three candidate designs for the next atlas job

**Common basis**
- A 7-worker 10-h night = **70 reserved worker-hours**.
- Primary-corpus rates; ranges by pair from section 1. These are expectations from 4 spines, not promises.
- Today's measured overhead is reserved = 1.25 x branch time (checks serial). With parallel checks it is ~1.06.

| | **A: same shape, the next 3 pairs by the rule** | **B: the cut design** | **C: wide and shallow** |
|---|---|---|---|
| pairs / spines | modern-era-5, peasant-9, fair-fight-9; 2 seeds each = 6 spines | the same 3 pairs, 3 seeds each = 9 spines (or any pairs) | 7 pairs x 2 seeds = 14 spines: the 3 new + ff5, peasant7, pauper5, modern7 |
| decisions a spine | 16 by `spread` | 16 by `spread`; a decision near-decided at 25 branches (<= .04 / >= .96) is replaced by the next listed one | **8** by `spread` |
| branches an option | 200 random + 40 Forge | 200 random for o0; the others stop early (paired bootstrap at 50/100/150, o0 never dropped); Forge 40 on every option | 200 + 40 |
| checks | as now (serial) | **parallel** (redaction and rows checks over the workers) | as now |
| code | none | one lane: unit option subsets with a checkpoint barrier, the 25-branch screen, a parallel `redactionCheck`/`checkRowsDir` | none (`--decisions 8`) |
| validated here | J158's measured shape | 3b + 3d replayed on 202 decisions: **primary 10/10 confident labels identical, 0 status flips; secondary 29/31** (1 lost to the screen, 1 flip). Branch time -18% (primary) / -15% (secondary), wall overhead -15% | 3e: confident per wh 0.32-0.34 at 8 vs 0.33 at 16 |
| reserved wh | 6 x 9.66 = **58 wh, ~8.3 h** | 9 x ~6.5 = **59 wh, ~8.4 h** | 14 x 4.83 = **68 wh, ~9.7 h** |
| labels | ~96 | ~115 + ~27 screened (near-decided, cheap) | ~112 |
| **confident labels** | **~15** (range ~8-27 by pair) | **~22-23**; per full night ~27 (vs ~18 today: **+45-50%**) | **~17-18** (same rate); twice the pairs and seeds, lower nightly variance, every pair's rate measured |
| 1,000 confident | ~54 nights | ~37 nights | ~54 nights |

**Variants (each composes with B or C)**
- **k >= 3 selection** (branch only decisions with 3 or more options):
  - confident per branch wh 0.425 → **0.557** with B's cuts (primary; secondary 0.532 → 0.625);
  - **~37 confident a night**;
  - changes the label population: most 2-option attack-or-not and cast-or-pass decisions leave.
- **No Forge map** (`--branch-forge 0`, keeping 1 spine in 6 with it for the agreement reads):
  - with B's cuts: 0.486 per wh (all k) and 0.668 (k >= 3), so **~32 / ~44 confident a night**;
  - drops reads (i)-(iii)'s Forge side and redefines `decided` and `complete` (on this data, random-only `decided` is identical).

**What I would run: B's cuts, in C's shape, once the B lane lands.**
- **The night:** 8 decisions a spine, taken from k >= 3 where the spine lists enough, on ~7 pairs x 2 seeds.
- **The pairs:** weighted toward the information measures above (fair-fight-900000009 first; synergy and vintage cubes last).
- **Its cost:** ~9-9.5 h of the 7-worker night, for **~30-37 confident labels** (about 2x today's ~18).
- **Why:**
  - The cuts are free in information: identical labels on the primary replay, and they remove ~1/3 of the night's cost (serial checks ~16% of reserved time, early stopping and screening ~18% of branch time).
  - The wide shape spreads the pair and seed variance, which is the dominant variance.
- **If the next night must run before a code lane, run C (`--decisions 8`, no code), not A.**
  - It costs the same night as A for the same expected confident labels.
  - It measures 7 pairs' information rates instead of 3, so later nights can be spent on the productive ones.
- **One decision first:** Justin's confirm-set call, or a switch to `pairs-dev.txt`. Until then no night of labels has a consumer, and pair choice should follow that answer.
