# Move atlas review: where the information is, what it costs, what to cut (2026-10-24, updated after J162's end)

Prepared by the PC session's lab analyst for Justin's review with the main session. **Read-only on the lab data, no engine.**
**Method only:** these are design numbers, not verdicts on any deck, card or the AI.

## What J162 changed

J162 finished with its last two spines, modern7 466 and ff5 462. The primary corpus is now **six spines**: J158's two and J162's four, 96 branched decisions, 91 labels, 13 confident.

- **ff5 462 gave 5 confident labels a 7-worker night, against ff5 461's 32.** The factor of 6.4 is the product of three parts:
  - **a slow spine** (×1.8: 3.9-s random branches in 25-turn games; ff5 461 was the short one);
  - **a new tool gap** (×1.45): Murderous Rider cast from exile after its adventure cannot be rebuilt on the copy, D472's `[may play]` kind. That cost the spine its five 5–6-option decisions and a quarter of its branch time, but at most two confident labels;
  - **an ordinary binomial draw** (×2.75: 1 of 11 against 4 of 16, Fisher p ≈ 0.6).
- **The options were not tighter** (median gap 7.5 against 4.8). Forge simply chose at or near the best.
- **Across the six current-tool spines the confident counts (4, 2, 3, 1, 2, 1) fit one common rate, ~14% a decision.** The variance is 1.4 against a binomial 1.9.
- **So section 1's headline, "the pair is the biggest lever", does not survive.** ff5's high rates were J156's, on a random policy that found several times today's regret at Forge's choice on the same pairs (ff5: 5.1–9.8 points against 1.2–2.4).
- **What still separates nights measurably:**
  - the option count (k ≥ 5 gives a confident label at ~5× the rate of k = 2);
  - the random-map base value;
  - the spine's cost (1.2–2.6 h).
- **The simulations' conclusions hold, with lower yields.**
  - B's cuts again lose no confident label (13 of 13) and save 18% of branch time.
  - Every yield estimate falls by a quarter to a third, because the current-tool rate is lower than the four-spine one.
- **The pick stands, two parts change:**
  - the recommendation is still B's cuts in C's shape with k ≥ 3, now **~27 confident a night** (was ~30–37);
  - **"fair-fight first" is withdrawn;**
  - **the Rider fix joins the B lane as a precondition** for any deck with an adventure card.

**Data used**

| corpus | spines | tool / random policy | used for |
|---|---|---|---|
| **primary** | ff5 461, peasant7 463 (J158, db496097, pre-G6); pauper5 464, synergy9 465, modern7 466, ff5 462 (J162, f6dba5e4) | the latest two | every headline number |
| **secondary** | ff5 452-454, peasant7 455-457 (J156, 6fb13bf9); vintage7 458-460 (J157, 9fe69ad8) | older policies | a second check of the design simulations, and vintage for contrast. **Never pooled with the primary corpus as labels.** |

**How the numbers were made**

- **Readers.** J162's own report (`/home/justin-a/code/lab/data/lab-j162/report/`: `labels.json`, `reads.json`, `tool.json`) for J162; results/J158 for J158.
- **The simulations.** They re-score `phaseB/branches.jsonl` with `atlasmath.regretInterval`'s arithmetic: paired rows, complete branches only, the best picked after the fact, and a 2.5% bootstrap low end.
  - My bootstrap reproduces the atlas's `confident` flag at **every one of the 230 complete decisions** this run. Last time it missed one boundary case in ff5 452; that case is RNG-sensitive.
- **Scripts.** `scratchpad/bin6/` (`load.py`, `s12.py`, `s1b.py`, `s2.py`, `s3.py`, `s3b.py`, `s3d.py`, `s5.py`, `whatif.py`, `s6speed.py`). Outputs: `scratchpad/work6/`. The four-spine version is kept as `scratchpad/atlas-review.before-j162.md`, with `bin/` and `work/`.
- **Bootstrap.** 1,000 draws for the simulations and 30 subsample repeats. Seeds are fixed in the scripts.
- **Which decisions.** The simulations use the **90 primary** and 139 secondary decisions with at least 150 complete random rows. They leave out ff5 461 d14 (74 complete, D470's NPE) and **ff5 462's five Rider decisions** (0 complete rows).
  - Those five cost 3.18 branch worker-hours. That cost is in every *as-run* rate below, and out of the per-decision simulation rates.

---

## 1. Where the information is

### 1a. Per pair (one spine each in the primary corpus; vintage as contrast)

| pair (spine) | job | baseline turns | listed | branched | labels | decided / settled / Q | median best-worst gap (random map, pts) | mean regret (pts) | confident (share) | confidentForge | same best (of Q) | mean rho | C1 "cast now" (random map, pts) | labels / confident per 7-worker 10-h night |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ff5 461 | J158 | 21 | 31 | 16 | 16 (3 void) | 0 / 3 (all D470-void) / 16 | 4.8 | 2.4 | **4** (.25) | 1 | 7/16 | -0.05 | **+4.3 [1.0, 7.6] HOLDS** (n 8) | 130 / **32** |
| peasant7 463 | J158 | 20 | 23 | 16 | 16 | 2 / 2 / 14 | 8.3 | 2.0 | 2 (.13) | 1 | 5/14 | 0.18 | **+2.8 [0.3, 5.0] HOLDS** (n 12) | 106 / **13** |
| pauper5 464 | J162 | 25 | 32 | 16 | 16 | 0 / 0 / 16 | 8.5 | 4.2 | 3 (.19) | 0 | 5/16 | -0.10 | **+4.1 [1.3, 6.9] HOLDS** (n 10) | 92 / **17** |
| synergy9 465 | J162 | 23 | 43 | 16 | 16 | 0 / 4 / 16 | **2.8** | 1.9 | 1 (.06) | 2 | 9/16 | 0.25 | +0.0 [-1.3, 1.4] NOT SHOWN (n 11) | 155 / **10** |
| **modern7 466** | J162 | **13** | 19 | 16 | 16 | 2 / 2 / 14 | 4.9 | 2.8 | 2 (.13) | 2 | **10/14** | **0.67** | **+6.3 [1.7, 12.3] HOLDS** (n 11) | 107 / **13** |
| **ff5 462** | J162 | 19 | 25 | 16 | **11** (5 lost to the Rider gap) | 0 / 0 / 11 | 7.5 | **1.2** | 1 (.09) | 1 | 5/11 | 0.14 | +5.2 [-0.5, 13.1] NOT SHOWN (n 8) | **50 / 5** |
| vintage7 458-460 (contrast) | J157 | 11-14 | 11-18 | 43 | 43 | 8 / 12 / 35 | 1.0-4.1 | 0.8-1.3 | 1 of 43 (.02) | 0 | 11/35 | 0.00 | not registered | ~290 / **~6** |
| ff5 452-454 (old policy) | J156 | 17-20 | 26-27 | 48 | 48 | 0 / 3 / 48 | 5.5-15.0 | **5.1-9.8** | 18 (.38) | 17 | 30/48 | 0.55 | +8.3 [4.2, 13.3] | 21-52 confident |
| peasant7 455-457 (old policy) | J156 | 15-23 | 17-34 | 48 | 48 | 0 / 2 / 48 | 5.5-7.0 | 2.5-4.9 | 11 (.23) | 12 | 25/48 | | | 19-75 confident |

- **The C1 verdicts** are the registered (iv) by pair: `iv_byPair` for J162 and J158's summary for J158.
- **The night rates** are labels.py's `c_sizing7`: the 6-worker wall scaled to 7, checks included.
- **Pooled J162** (four spines): 59 labels, 7 confident (0.119 [0.034, 0.220]), 0 void, 2 decided. (i) same best is 0.509 [0.322, 0.700]; (ii) rho is 0.218 [-0.119, 0.580]. J158 (two spines): 32, 6 (0.188 [0.031, 0.344]), 0.400 and 0.060.
- **Six current-tool spines, as a cost read:** 91 labels, 13 confident, **~99 / ~14 per 7-worker night**.

### 1b. By decision kind (primary corpus, 96 decisions; secondary beside)

| kind | n (labels) | settled | mean regret (pts) | median regret | mean gap | confident (share) | confident per branch worker-hour | secondary: n / confident (share) / conf per wh |
|---|---|---|---|---|---|---|---|---|
| priority | 62 (+5 Rider-lost) | 5 | 2.9 | 1.0 | 7.6 | 10 (.16) | 0.27 | 103 / 24 (.23) / 0.51 |
| attack | 24 | 2 | 2.1 | 0.5 | 8.6 | 3 (.12) | 0.23 | 28 / 4 (.14) / 0.35 |
| block | 5 | 4 | **0.0** | 0.0 | 1.1 | **0** | 0 | 8 / 2 (.25) / 1.9 (pre-D470, suspect) |

- **Priority and attack are now level per worker-hour.** On four spines attacks led (0.43 against 0.31). Neither J162 spine added an attack label that was confident.

### 1c. What predicts a confident label (primary, then all 15 spines)

| predictor | bucket | decisions | confident (share) | confident per branch worker-hour |
|---|---|---|---|---|
| **options k** (primary) | 2 | 35 | 2 (.06) | 0.15 |
| | 3-4 | 31 | 3 (.10) | 0.18 |
| | 5-6 | 15 (+5 Rider-lost) | 4 (.27) | 0.28 (the lost five's cost included) |
| | 7-8 | 10 | 4 (**.40**) | **0.61** |
| options k (all 15 spines) | 2 | 90 | 8 (.09) | 0.28 |
| | 3-4 | 87 | 17 (.20) | 0.40 |
| | 5-8 | 53 (+5) | 18 (.34) | 0.45 |
| **random-map base value p** (mean over options; all 15 spines) | p(1-p) < .05 (p < ~.05 or > ~.95) | 44 | 2 (.05) | |
| | .05-.15 | 51 | 7 (.14) | |
| | .15-.20 | 38 | 5 (.13) | |
| | > .20 (p ~ .3-.7) | 97 | **29 (.30)** | |
| same, primary only | < .05 / .05-.15 / .15-.20 / > .20 | 20 / 27 / 15 / 29 | 1 / 4 / 2 / 6 (.05 / .15 / .13 / .21) | |
| **inertness** (share of branch indices where every option scored the same; primary) | >= .95 | 12 | 0 | 1.5 wh spent |
| | .8-.95 | 17 | 2 | |
| | < .8 | 62 | 11 | |

**Spine-level base values** (random map / Forge map, seat A's mean over its complete decisions):

| spine | random | Forge | confident |
|---|---|---|---|
| synergy9 | .10 | .28 | 1 |
| ff5 461 | .14 | .16 | 4 |
| pauper5 | .42 | .68 | 3 |
| **ff5 462** | .43 | .55 | 1 |
| peasant7 | .75 | .79 | 2 |
| **modern7** | **.87** | .84 | 2 |
| vintage 458 | .91 | | 0 |

**Headlines**
- **Six current-tool spines cannot tell pairs apart on information.**
  - The confident counts a spine (4, 2, 3, 1, 2, 1) vary less than one common binomial rate would (variance 1.4 against 1.9 at p = .135).
  - ff5's two seeds give 4 of 16 and 1 of 11 (Fisher p ≈ 0.6).
  - The nightly spread, 5–32 confident, is mostly **cost per spine** (1.21–2.56 h) and **labels lost to tool gaps**, not the pair's information.
  - The older corpus is different: its spine-level variance was 7.5 against 2.6 binomial, and vintage gave 1 of 43. So low-information pairs do exist, but one spine does not find them.
- **ff5's reputation was a J156-policy number.**
  - On J156's random policy (before D466's fixes), the mean regret at Forge's choice was **5.1–9.8 points on ff5 and 2.5–4.9 on peasant7**, and the confident share .38 and .23.
  - The current policy finds 1.2–2.4 and 2.0 on the same pairs, and ~.14.
  - The two are never pooled; this is a design read: the old seat made Forge's choices look worse.
- **Information still follows two measurable things:**
  - **Option count.** A decision with 7–8 options gave a confident label 40% of the time on the current tool, 5–8 options 34% over all spines, 2 options 6–9%. Per worker-hour, 7–8 options are 4× as productive as 2 on the current tool.
  - **The random-map base value.** Where random play has the game nearly decided (p(1-p) < .05), the options cannot separate: 2 of 44 confident.
- **D451's pair rule still optimises the wrong thing.** It ranks by the Forge ladder's evenness. modern7, rank 7 by that rule, is .87 for seat A under the random map; synergy9 (rank 6) is .10.
- **The vintage lesson repeats on synergy9:** a median gap under 3 points, 4 of 16 settled, 1 confident.
- **Agreement.** The maps agree clearly on modern7 (ρ .67 [.32, .89], same best 10 of 14), the first pair where they do. Elsewhere they are near chance.

---

## 2. Cost per label

### 2a. Per spine (6 workers; worker-hours = wh)

| spine | random s / branch | Forge s / branch | Forge share of branch time | timeouts | errors | branch wh | unit wh (with replay) | replay overhead | phase B wall h | checks h (**one core**) | checks share of wall | worker-h idle during checks | reserved wh (wall x 6) | reserved wh / label |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ff5 461 | 1.82 | 1.52 | 14% | 0 | 211 (D470) | 6.97 | 7.11 | 2.1% | 1.19 | 0.25 | 17% | 1.25 | 8.6 | 0.54 |
| peasant7 463 | 1.82 | 1.22 | 12% | 0 | 0 | 8.24 | 8.35 | 1.3% | 1.40 | 0.37 | 21% | 1.84 | 10.6 | 0.66 |
| pauper5 464 | 2.47 | 1.57 | 11% | **0** (J158: 243) | 0 | 9.27 | 9.43 | 1.7% | 1.58 | 0.45 | 22% | 2.23 | 12.2 | 0.76 |
| synergy9 465 | 1.44 | 2.32 | 24% | 0 | 0 | 5.72 | 5.93 | 3.7% | 0.99 | 0.22 | 18% | 1.08 | 7.2 | 0.45 |
| modern7 466 | 2.38 | 1.54 | 11% | 0 | 62 (NPE) | 8.38 | 8.47 | 1.1% | 1.42 | 0.33 | 19% | 1.65 | 10.5 | 0.65 |
| ff5 462 | **3.89** (played) | 2.23 | 10% | 0 | 2,400 (Rider) | **12.52** | 12.66 | 1.1% | 2.12 | 0.44 | 17% | 2.22 | **15.4** | **1.40** |
| **mean (6)** | 2.30 | 1.73 | 14% | 0 | | 8.52 | 8.66 | 1.8% | 1.45 | 0.34 | **19%** | 1.71 | **10.75** | 0.71 |

- **Phase B keeps the workers busy.** The sum of unit time equals the phase B wall x 6 to within 0.5%, so there is no idle tail.
- **The checks are serial.**
  - They are `rowscheck` plus `redactionCheck`, which spawns `node tools/check-redaction.mjs` 100 logs at a time, one batch after another. Redaction is 8–16 min of each J162 spine's checks (482–978 s): 25,000–29,000 frame logs.
  - So **for ~19% of every spine's wall, 5 of the 6 workers sit idle.** That is ~1.7 reserved worker-hours a spine, or ~11 of a 70-wh night.
- **ff5 462 is the dearest spine yet on the current tool.** Its random games run 24.9 turns, 444 steps and 8.75 ms a step, against ff5 461's 21.3, 220 and 8.35 (J156's ff5: 2.1–3.4 s a branch). The Rider gap's five decisions took 3.18 of its 12.52 branch wh and gave no label, so its cost a label is nearly 2x any other spine's (1.40 reserved wh against at most 0.76).
- **J162's fixes work at scale.** 0 timeouts on 55,680 branches, 0 unavailable options, and pauper5's random branches cost 2.47 s (J158's partial: 13.2).

### 2b. By decision position (rank of the 16 in the spine, quarters)

| quarter | primary: n / mean turn | s / random branch | s / Forge branch | mean options | worker-s / decision | confident | confident per branch wh | secondary: worker-s / decision, confident per wh |
|---|---|---|---|---|---|---|---|---|
| Q1 (earliest) | 24 / 5.8 | 3.60 | 2.80 | 2.9 | 2,334 | 4 | 0.26 | 1,933, 0.32 |
| Q2 | 24 / 11.3 | 2.81 | 2.24 | 3.8 | 2,399 | 5 | 0.31 | 1,909, 0.43 |
| Q3 | 24 / 15.1 | 2.27 | 1.63 | 3.5 | 1,754 | 3 | 0.26 | 1,441, 0.71 |
| Q4 (latest) | 24 / 18.8 | 1.08 | 0.66 | 4.9 | 1,178 | 1 | 0.13 | 891, 0.71 |

- **Cost by position.** An early branch costs 3.3x a late one, and an early decision 2x a late one (late decisions have more options).
- **Yield by position.** No position wins consistently: the primary corpus now favours Q1–Q3, the secondary Q3–Q4. ff5 462's late Rider decisions and its won late turns pull Q4 down.

### 2c. Rates

| | ff5 461 | peasant7 | pauper5 | synergy9 | modern7 | ff5 462 | **as run (6 spines)** |
|---|---|---|---|---|---|---|---|
| reserved wh a spine | 8.6 | 10.6 | 12.2 | 7.2 | 10.5 | 15.4 | 10.75 |
| labels / confident a spine | 16 / 4 | 16 / 2 | 16 / 3 | 16 / 1 | 16 / 2 | 11 / 1 | 15.2 / 2.2 |
| **labels / confident per 7-worker 10-h night** | 130 / 32 | 106 / 13 | 92 / 17 | 155 / 10 | 107 / 13 | 50 / 5 | **~99 / ~14** |
| 1,000 confident labels at that rate | 31 nights | 77 | 59 | 100 | 77 | 200 | **~71 nights** |

- **The four-spine version** of this table said ~116 / ~18 a night and ~54 nights for 1,000 confident.
- **With the Rider gap fixed** (ff5 462 at 16 labels, 1–3 confident), the six-spine mix is ~104 / ~14–16 a night: the gap costs labels more than confident labels.

---

## 3. What a smaller design would have found (simulated on the existing branches)

### 3a. Fewer random branches (paired subsample of the 200, 30 repeats; 90 primary decisions)

| n random | branch time saved | same best as 200 | same CONFIDENT status | confident found | of the 13 kept | new (not confident at 200) | confident per branch wh | secondary: same status, kept of 31 |
|---|---|---|---|---|---|---|---|---|
| 200 | 0 | — | — | 13 | 13 | 0 | 0.27 | — |
| 150 | 21% | 85% | 96% | 11.4 | 10.4 | 1.0 | 0.30 | 96%, 26.5 |
| 100 | 43% | 76% | 93% | 10.0 | 8.5 | 1.5 | 0.37 | 92%, 22.5 |
| 50 | 65% | 66% | 90% | 8.2 | 6.2 | 2.0 | 0.49 | 87%, 16.0 |

- **The trade is unchanged.** Fewer branches find more confident labels per hour, because the big effects show early. But they lose a third of the labels at 100 and identify the best option worse.
- **A confident label is marginal (unchanged).**
  - **Split-half test** at 100 vs 100 on independent halves: a label confident on one half is confident on the other only **54%** of the time (primary; secondary 60%).
  - The "best option" agrees on 55% (primary) and 62% (secondary) of decisions.
  - **This is the main quality caveat for rung 4.**

### 3b. Early stopping per option (checkpoints at 50, or at 50/100/150; drop an option clearly below the leader)

| rule | options dropped | o0 (Forge's) dropped | random time saved | of all branch time | same confident status | same best | secondary: saved, same status |
|---|---|---|---|---|---|---|---|
| W50: Wilson, unpaired, at 50 (the brief's rule) | 15 | 3 | 5,630 s | 3.3% | 90/90 | 90/90 | 3.9%, 137/139 |
| P50: paired bootstrap (CRN), at 50 | 42 | 7 | 14,372 s | 8.4% | 89/90 | 90/90 | 11.4%, 135/139 |
| P50/100/150 | 86 | 11 | 23,700 s | 13.8% | 88-89/90 | 89/90 | 15.3%, 134-135/139 |
| **P50/100/150, o0 never dropped** | not counted | 0 | 20,482 s | **12.0%** | **90/90** | 90/90 (at 50) | 11.5%, 139/139 |
| ... + Forge map only on surviving options | | | +5,711 s | **15.3%** | 90/90 | | 14.8%, 139/139 |

- **Use the paired test.** Branch i of every option shares its seed, so the paired test drops ~3–6x what the Wilson rule drops.
- **Keep Forge's own option (o0) to the full 200.** Then the label (regret, measured against o0) loses no precision: 13 of 13 confident labels kept, 0 flips.
- **Code needed.** A unit today plays all options per branch index. Stopping needs a unit to carry an option subset and a barrier after each checkpoint.

### 3c. What the Forge map buys

| | primary | secondary |
|---|---|---|
| Forge share of branch time | **13.3%** (10-24% by pair; synergy9 24%) | 13.5% |
| Q decisions where Forge's best ≠ random's best | **46 of 86** | 65 of 131 |
| decided by both maps vs random map alone | 4 vs 4 | 8 vs 8 |
| settled by both maps vs random map alone | 11 vs 13 | 17 vs 17 |
| Forge at 20 (not 40): saves | 6.7% | 6.8% |
| ... Forge's best unchanged | 80% | 81% |
| ... (i) same-best status unchanged | 86% | 86% |
| ... decided unchanged | 100% | 100% |
| ... confidentForge unchanged | 95% | 92% |
| Forge on the top 2 only (o0 and random's best): saves | 7.0% | 7.2% |
| ... and rho | undefined (two options) | |

**What depends on the Forge map** (unchanged)

| uses it | does not use it |
|---|---|
| (i) same best (defined on it), (ii) rho, (iii)'s Forge column, `confidentForge`, `regretForge*`, C1 and C2's Forge column | **the label** (`regret` and `confident` are random-map only) |
| `complete`, `decided`, `settled` and Q (they need both maps; random alone gives the same `decided` here) | |

- **Agreement is near chance, with one exception.** Same best is .51 [.32, .70] and ρ .22 on J162, and .33–.40 and .06 on J158. modern7 is the exception: ρ .67, same best 10 of 14.
- **So the Forge map is the agreement study's instrument, not the label's.** It costs ~13% of every labelling night. modern7 shows the instrument can find agreement where it exists.

### 3d. Skipping decisions after a 25-branch pre-screen (the first unit, indices 0-24)

| rule at 25 branches | primary: skipped (of 90) | branch time saved | confident lost | secondary: skipped, saved, lost |
|---|---|---|---|---|
| settled (every option >= .95, or every option <= .05) | 14 | 4.8% | 0 | 23, 3.7%, 1 |
| inert (24 of 25 indices identical across options) | 14 | 4.5% | 0 | 20, 2.2%, 1 |
| **near-decided: mean value <= .04 or >= .96** | 17 | **8%** | **0** | 25, 4%, 1 |
| near-decided at .06 / .94 | 23 | 12% | 1 | 29, 6%, 1 |
| near-decided at .10 / .90 | 28 | 19% | 3 | 40, 11%, 2 |

- **The .04 rule held out of sample.** It was picked on the four-spine data. On the two new spines it skipped 5 more decisions (modern7's lopsided late turns among them) and lost nothing.
- **Prefer replacing to skipping.** A skipped decision's budget is better spent on the next listed decision than saved.

### 3e. 16 decisions a spine vs 8 (halves of each spine: even and odd ranks)

| corpus | confident per branch wh: 16 | even 8 | odd 8 | only k >= 3 | per-spine confident counts | variance / binomial |
|---|---|---|---|---|---|---|
| primary (6) | 0.254 | 0.230 | 0.279 | **0.293** | 4, 2, 3, 1, 2, 1 | **1.4 / 1.9** |
| secondary | 0.502 | 0.306 | 0.692 | 0.532 | 5, 6, 7, 3, 2, 6, 0, 1, 0 | **7.5 / 2.6** |

- **No fixed cost per spine (unchanged).** The baseline is 4–7 s and the replay ~2%; the checks and leak checks scale with branches. So 8 decisions cost half a spine, and **wide-and-shallow is yield-neutral in expectation.**
- **What it buys has changed.**
  - On four spines the argument was *information* variance between spines. On the current tool there is none to spread: the counts are under-dispersed.
  - **Cost variance and fault exposure.** Spines cost 7.2–15.4 reserved wh, and one card (the Rider) took a third of one spine's labels. Twice the spines halves the night's exposure to any one slow game or tool gap.
  - **Measurement.** Twice the pairs and seeds measured. The labels are also less correlated, which rung 4 wants.
- **Is k >= 3 selection feasible?** Every primary spine lists at least 8 decisions with k >= 3 (4 of 6 list at least 16; modern7 lists 14). In the secondary corpus, 7 of 9 list at least 8.

---

## 4. What the atlas cannot do yet / open gains

| item | the measure | gain / what it needs |
|---|---|---|
| **The Rider gap (new, J162)** | ff5 462: 10 options at 5 decisions errored on 240 of 240 branches, `no Murderous Rider ... by Swift End [may play] on the copy's Murderous Rider`. A creature cast from exile after its adventure is not rebuilt on the copy. D472 lists may-play as covered but planted no case. | **A D472 follow-up before the next night on any deck with an adventure card** (the fair-fight cube holds at least Murderous Rider): replay ff5 462 d11 branch 0, plant an adventure in `altcost-map`. Until then such a spine loses its later wide decisions, and the runner fails the job on `problems`. |
| **modern7's NPEs (new)** | 62 random branches (0.55%), mid-game, `PhaseHandler.getPhase()` null or message-less; below the 10% bar | Unexplained; it drops paired rows only. Worth a look in the same lane. |
| **Blocks** | Listed: 16 of 173 primary decisions (ff5 461 4, peasant7 0, pauper5 1, synergy9 8, modern7 2, ff5 462 1). Branched: 5 (J158 3 void, synergy9 d28 and d42 both settled, regret 0). **0 unavailable rows on 55,680 J162 branches.** | D470's fix has still not met an informative block. A block quota (branch every listed block with k >= 3: synergy9 alone has 6) would test it. |
| **The option cap (8)** | k = 8 at 3 of 173 listed decisions (primary), 5 of 209 (secondary) | Rarely binds; low priority. |
| **Forge's own line as a baseline** | The label is regret against o0 (Forge's choice) under the random map. Seat A's base value differs by map (pauper5 .42 random vs .68 Forge; synergy9 .10 vs .28). | Pair choice should use the **random-map** base value (phase A, or the spine's first decisions), not Forge ladder evenness. modern7 (.87) is the newest case. |
| **The labels' use (rung 4)** | Every label is `notForTraining` (confirm-set decks, D318/D340). | Rung 4 has no consumer until **Justin's confirm-set call**. Alternative: **`tools/ai-bench/pairs-dev.txt` exists.** An atlas on dev pairs removes the held-out objection, though the generic `notForTraining` marker still needs its own decision. |
| **The vintage lesson** | J157: median gap 1.5, 1 confident in 43; synergy9 repeats it (2.8, 1 in 16) | A median gap under 3 in a spine's first decisions is the one pair-level signal one spine gives. |
| **Label quality** | A confident label replicates on an independent half only ~54% of the time (3a) | A "confirmed" tier (confident on both halves, or at 400 branches) would be cheaper than more nights of marginal labels. |
| **Pairs not yet measured** | D451's rule, recomputed from the lab's ladder (25,056 games; it reproduces J158's top 7 exactly) | See the table below. |

**Pair-rule ranks 1-10 (ranks 11-30 are in `work/`)**

| rank | line | pair | games | score | ladder turns | atlas status |
|---|---|---|---|---|---|---|
| 1 | 2 | fair-fight-900000005 | 844 | .0538 | 17.9 | measured (J156 x3, J158 461, **J162 462**: 32 and 5 a night on the current tool) |
| 2 | 18 | peasant-900000007 | 828 | .0546 | 16.6 | measured (J156 x3, J158) |
| 3 | 28 | vintage-900000007 | 832 | .0592 | 14.5 | measured (J157), low gap |
| 4 | 25 | vintage-900000001 | 836 | .0625 | 16.3 | untried; same cube as vintage7, out |
| 5 | 12 | pauper-900000005 | 832 | .0747 | 21.2 | measured (J162) |
| 6 | 24 | synergy-900000009 | 836 | .0756 | 17.7 | measured (J162), low gap |
| 7 | 8 | modern-era-900000007 | 836 | .0840 | 15.8 | **measured (J162)**: 13-turn spine, base .87, maps agree |
| **8** | 7 | **modern-era-900000005** | 836 | .0970 | 19.2 | **untried** |
| **9** | 19 | **peasant-900000009** | 828 | .0978 | 18.1 | **untried** |
| **10** | 4 | **fair-fight-900000009** | 836 | .1053 | 18.4 | **untried; needs the Rider fix if its decks hold an adventure card** |

- **D451's rule offers "the pair we are most sure is even" on the Forge ladder.** It says nothing about information.
- **The by-cube order is withdrawn.** The four-spine review said fair-fight > pauper ≈ peasant > synergy ≈ vintage. On the current tool, only the low-gap end (synergy, vintage) is visible. The order among the rest was J156's policy and one ff5 seed.

---

## 5. Three candidate designs for the next atlas job

**Common basis**
- A 7-worker 10-h night = **70 reserved worker-hours**.
- Primary-corpus rates over **six spines**; ranges by pair from section 1. These are expectations, not promises.
- Today's measured overhead is reserved = **1.26 x branch time** (checks serial). With parallel checks it is ~1.06.
- Per decision (90 decisions with complete rows): 0.53 branch wh and 0.144 confident.
- As run, with the Rider gap's waste: 51.1 branch wh for 91 labels and 13 confident.

| | **A: same shape, the next 3 pairs by the rule** | **B: the cut design** | **C: wide and shallow** |
|---|---|---|---|
| pairs / spines | modern-era-5, peasant-9, fair-fight-9; 2 seeds each = 6 spines | the same 3 pairs, 3 seeds each = 9 spines (or any pairs) | 7 pairs x 2 seeds, less one = 13 spines: the 3 new + ff5, peasant7, pauper5, modern7 |
| decisions a spine | 16 by `spread` | 16 by `spread`; a decision near-decided at 25 branches (<= .04 / >= .96) is replaced by the next listed one | **8** by `spread` |
| branches an option | 200 random + 40 Forge | 200 random for o0; the others stop early (paired bootstrap at 50/100/150, o0 never dropped); Forge 40 on every option | 200 + 40 |
| checks | as now (serial) | **parallel** (redaction and rows checks over the workers) | as now |
| code | none (but see the Rider gap) | one lane: unit option subsets with a checkpoint barrier, the 25-branch screen, a parallel `redactionCheck`/`checkRowsDir`, **and the Rider fix** | none (`--decisions 8`), the Rider gap as for A |
| validated here | J158 + J162's measured shape | 3b + 3d replayed on 229 decisions: **primary 13/13 confident labels identical, 0 status flips; secondary 30/31 kept** (1 lost to the screen, 1 gained by a flip). Branch time -18% (primary) / -15% (secondary); wall overhead -16% | 3e: confident per wh 0.23-0.28 at 8 vs 0.25 at 16 |
| reserved wh | 6 x 10.75 = **64.5 wh, ~9.2 h** | 9 x ~7.4 = **~67 wh, ~9.6 h** | 13 x 5.4 = **~70 wh, ~10 h** |
| labels | ~91-96 | ~110 + ~25 screened (near-decided, cheap) | ~100 |
| **confident labels** | **~13-15** (range ~5-32 by spine) | **~19-20**; per full night **~22** (vs ~14-15: **+45-55%**) | **~14** (same rate); twice the pairs and seeds, half the exposure to any one slow spine or tool gap |
| 1,000 confident | ~71 nights | ~46 nights | ~71 nights |

**Variants (each composes with B or C)**
- **k >= 3 selection** (branch only decisions with 3 or more options):
  - confident per branch wh 0.32 → **0.42** with B's cuts (primary; secondary 0.56 → 0.68);
  - **~27 confident a night** (the four-spine estimate was ~37);
  - changes the label population: most 2-option attack-or-not and cast-or-pass decisions leave, and with them two of the 13 current confident labels (modern7 d13 and ff5 461 d8).
- **No Forge map** (`--branch-forge 0`, keeping 1 spine in 6 with it for the agreement reads):
  - with B's cuts: 0.39 per wh (all k) and 0.49 (k >= 3), so **~26 / ~32 confident a night** (was ~32 / ~44);
  - drops reads (i)-(iii)'s Forge side and redefines `decided` and `complete` (on this data, random-only `decided` is identical);
  - modern7 shows the agreement read can find something. Keep it on 1 spine in 6 rather than none.

**What I would run: still B's cuts, in C's shape, once the B lane lands, now with the Rider fix inside the lane.**
- **The night:** 8 decisions a spine, taken from k >= 3 where the spine lists enough (every primary spine does), on ~7 pairs x 2 seeds.
- **The pairs:** chosen for spread and cost, not for a measured information rate, because six spines measure none.
  - Leave out pairs whose spines show a median gap under 3 (synergy, vintage).
  - Prefer pairs whose random-map base value is near even.
  - **No longer "fair-fight-900000009 first".**
- **Its cost:** ~9.5-10 h of the 7-worker night, for **~25-27 confident labels** (about 2x today's ~14). That is ~30-32 with the Forge map on 1 spine in 6 only.
- **Why:**
  - The cuts are free in information: identical labels on the six-spine replay, and they remove ~1/3 of the night's cost (serial checks ~16% of reserved time, early stopping and screening ~18% of branch time).
  - **k >= 3 is now the strongest lever the data shows**, ahead of any pair choice.
  - The wide shape spreads cost and fault exposure.
- **What the six spines changed in the pick:**
  - the expected yield (~27, not ~37);
  - the pair weighting (withdrawn);
  - the Rider fix, now a precondition;
  - the reason for the wide shape (cost and fault exposure, not information variance).
  - **They did not change the design.**
- **If the next night must run before a code lane, run C (`--decisions 8`, no code), not A, and leave fair-fight pairs out of it** until the Rider fix lands. Otherwise expect `problems` to fail the job and ~25% of each fair-fight spine to buy nothing.
  - C costs the same night as A for the same expected confident labels.
  - It measures 7 pairs' costs and gaps instead of 3.
- **One decision first (unchanged):** Justin's confirm-set call, or a switch to `pairs-dev.txt`. Until then no night of labels has a consumer, and pair choice should follow that answer.
