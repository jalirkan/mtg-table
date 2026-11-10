# J203 — judge the judge, unselected: read 2026-11-09 21:25 EST

**Readings under the pre-registered rule: PRIMARY INCONCLUSIVE, CONTROL INCONCLUSIVE.** J200's KNOWLEDGE SHOWN is
neither repeated nor contradicted on decisions nobody chose. The direction is the same; the size is about a quarter.

160 move-atlas decisions drawn at random (seed 203, stratified by kind, no filter), each read blind by two LLM judges.
The judges agree with each other on 128 (0.80). Judge A is on Forge's option on 84 of 160, judge B on 78.

| set | what is compared (D451's Forge map, 40 branch games an option) | decisions valid | better / worse / tied | share of untied [95%] | mean gain [95%] |
|---|---|---|---|---|---|
| **i, primary**: both judges on one option that is not Forge's | the judges' option − Forge's | 58 of 58 | 23 / 15 / 20 | 0.605 [0.432, 0.750] | +0.012 [−0.011, +0.036] |
| **ii, control**: both judges on Forge's option | Forge's option − the judges' second choice | 69 of 70 | 30 / 14 / 25 | 0.682 [0.500, 0.800] | +0.015 [−0.012, +0.040] |
| whole sample, i + ii (0 on set ii) | the judges' first choice − Forge's | 127 | 23 / 15 / 89 | 0.605 [0.436, 0.750] | +0.006 [−0.005, +0.017] |
| J200, for comparison (82 selected decisions) | the judges' option − Forge's | 82 of 82 | 43 / 24 / 15 | 0.642 [0.515, 0.767] | +0.050 [+0.018, +0.082] |

Set iii (the judges split, 32 decisions) was not branched, as planned. 10,710 branch games, 14 errors, 14 timeouts,
282 capped; reproduction of the night's Forge rows 1,040 of 1,040 cells the same.

**What it says.**

- On a random decision where the judges jointly leave Forge's option, their option wins about 60% of the untied
  comparisons and is worth about one point of win probability. The interval reaches from one point worse to three and
  a half better. That is a much smaller effect than J200's five points, and this sample cannot tell it from zero.
- The control did not hold either, by a hair (share lower bound exactly 0.500; gain lower bound below 0). The control
  is the known-good case: both judges and Forge name the same option, tested against the judges' second choice. That
  the design cannot show even this at 69 decisions says the job was sized for J200's effect and unselected decisions
  carry far less: 45 of the 127 valid decisions are already decided (both options at or under 0.05, or at or over
  0.95), and the mean absolute difference between the two options is about 0.05.
- J200's population inside this sample (the atlas label confident; 17 of set i's decisions): 10 / 5 / 2, share 0.667
  [0.357, 0.846], gain +0.015 [−0.024, +0.058]. Consistent with J200's share; too few to say more.
- Beside the readings, deciding nothing (not pre-registered, computed after the read): pooling sets i and ii as "the
  judges' first choice against the alternative tested", 53 better / 29 worse / 45 tied on 127; share 0.646
  [0.542, 0.753], gain +0.014 [−0.001, +0.029] (bootstrap over spines of the per-decision differences). The judges'
  first choice looks better than the alternative by the same small amount whether or not Forge agrees with it.

**Why the runner marked it FAILED.** `v.checks.leaks == 0` failed: 1 of 128 no-leak checks moved
(J186/b-s04-powered-2543, d34, an attack decision on turn 26, Forge continuation, option 0, branch 0: seat A's rows
moved when only seat B's hidden cards were dealt again; the negative control moved as it must). Unlike J200's
over-strict problems gate, this check is one I kept on purpose, and it is the first no-leak check to move on any
atlas night. It does not touch the readings: the decision is in the control set, both its options scored 1.0, so it is
a tie in set ii whether it is kept or dropped, and set i has no decision on that spine. **The cause, diagnosed the same
night: it is not a leak; the branch is not deterministic.** On a one-worker reproduction the determinized copy's hands
and libraries were identical (ids, in order) for the base and the redealt replays, so the redeal never reaches the
branch. Replayed 58 times with nothing changed, the branch itself came out one of two ways (base flipped as often as
the redeal: 4 of 18, 2 of 22, 0 of 18), and one run reproduced the night's exact failure. The first difference is
turn 27: Goblin Rabblemaster forces Goblin Engineer and a Goblin token to attack a planeswalker, Forge 2.0.14's
`AiAttackController` adds forced attackers from one `CompletableFuture.supplyAsync` each, in whichever order the
threads finish, and `AiBlockController` then hands the best blocker to whichever of two equal-power attackers came
first. No hidden information is involved, so the published rows and labels stand; the cost is that such a branch
cannot be replayed exactly from its seed (an upper bound of 281 of J203's 10,720 branch games, 2.6%, in 6 of 62
spines, had a qualifying forced attack; Forge's 5 s AI timeouts, 201 this night, can do the same). The fix is in the
check: when the redealt replay differs, the base is replayed once more, and a base that moves too is reported as
non-determinism, not as a leak (the next mtg-table decision). The second atlas problem (J191/b-s08, one unit
whose replay diverged at d10) is the control decision the validity rule already excluded.

**What it decides.** Nothing closes. The outside-knowledge result stands where J200 put it: on high-stakes decisions
where two judges confidently leave Forge's option, they are right about two times in three and it is worth about five
points. On typical decisions the judges' edge over Forge is small, and settling its exact size by this route would
take roughly four to five times this sample for a borderline answer. The per-decision route is therefore the wrong
instrument for the next step; a game-level test of a policy that carries the judges' choices (judged decisions as
labels for a fit, or a second opinion at the high-stakes decisions only) is the one that would say whether the edge
adds up over a game. That choice spends judge usage and is the owner's.

The run's own report is beside this file as `report-from-run3.md`.
