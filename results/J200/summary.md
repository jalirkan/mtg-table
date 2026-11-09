# J200 — judge the judge: read 2026-11-09 06:50 EST

**Reading under the pre-registered rule: KNOWLEDGE SHOWN.** On the atlas's 82 tier-1 decisions — the ones where both
LLM judges, given the real position, chose the same option and it was not Forge's — the judges' option, continued by
Forge for 40 branch games an option (D451's Forge map), beats Forge's own option:

| map | decisions valid | judge better / worse / tied | share of untied decisions the judge wins [95%] | mean gain, judge − Forge [95%] |
|---|---|---|---|---|
| Forge map (J200) | 82 of 82 | 43 / 24 / 15 | **0.642 [0.515, 0.767]** | **+0.050 [+0.018, +0.082]** |
| random map (the night's rows, biased toward the judges by the confident filter) | 82 | 79 / 3 / 0 | 0.963 [0.886, 0.987] | +0.156 [+0.120, +0.199] |

shareLo 0.515 > 0.5 and gainLo 0.018 > 0: SHOWN. Reproduction of the night's Forge rows: 1,200 of 1,200 cells the same.
Beside it, deciding nothing: priority decisions 0.642 [0.490, 0.775] on 62; attacks 5/3/5 and blocks 4/2/1 on 13 and 7
(too few to read); the 63 live decisions 0.655 [0.521, 0.797], gain +0.065; Spearman of random-map vs Forge-map gains
0.088 — the random map and the Forge map rank the decisions almost independently, so the random map's 96% says little
about the Forge map's 64%.

**Why the runner marked it FAILED.** One atlas problem in 53 spines (J188-b-s10-peasant-2575, d38 option 3, Grizzly
Fate: 9 of 40 Forge branches hit a BranchTimeout inside one engine step) tripped the job's `v.checks.problems == 0`
check, written as a hard gate. The read itself ran (run3.log carries the whole report, copied beside this file as
`report-from-run3.md`), every one of the 82 decisions is valid under the rule (at least 30 paired Forge branches, no
replay divergence), 8,840 Forge rows with 15 errors, 15 timeouts, 170 capped, 0 leaks. The data stands; the check was
over-strict. Lesson for the next job of this shape: a problems counter is information beside the read, and the rule's
own validity conditions decide which decisions count.

**What it decides.** Outside knowledge — two LLM judges reading the real position — picks better than Forge where it
confidently disagrees with Forge, by about five points of win probability on those decisions, under Forge's own
continuation. That is the second of the two tests of the owner's principle (Forge is not the ceiling); the first,
random rollouts inside the search, failed its first iteration (J199) and is in its second (J201). What follows is the
coordinator's: a judge pass over a wider, unselected set of decisions (the confident filter biased the sample toward
the judges on the random map; the Forge map is the independent read), and the question of how judged decisions reach
the policy — as labels for a fit (D522's step 2 with judged targets), or as a coach-time second opinion.
