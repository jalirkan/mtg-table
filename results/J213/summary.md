# J213: the label probe, does agreement with the judged labels track Elo? (D538)

2026-11-11 23:19 to 2026-11-12 02:34, mtg-table `31daf3ec`, alone, 6 workers. Twelve ladder players were put at
the 605 judged move-atlas decisions (the recorded spine replayed to the decision, then the player's own policy and
search asked there; search seats three times each), and `agreement.py --rule d538` read the five rule seats' rows
against the 515 agreed labels. All 13 runs exit 0; every check in `checks.txt` passed: 605 keys, every cell whole,
0 errors, 0 unsupported, 0 audit faults, the labels' sha256 the pinned one, look 1. The numbers are in
`report.md`, `read.txt` and `v.json` beside this file; this is what they say.

**The reading, under the rule written before a row: AGREEMENT DOES NOT TRACK ELO.**

| pair | A - B | Elo of A over B (measured) | agreement of A minus B [95%] |
|---|---|---|---|
| P1 | search-v1-anytime - forge-default | +89.4 | +0.019 [-0.021, +0.060] (n 515) |
| P1, the 409 labels nobody selected | the same | | +0.002 [-0.033, +0.040] |
| P2 | search-v1-anytime - search-v2-rrandom | +43.7 | -0.066 [-0.111, -0.021] |
| P3 | search-v1-anytime - search-v2-rrandom4 | +39.5 | -0.063 [-0.107, -0.018] |

The seat that is 89 Elo above Forge's AI agrees with the labels no more than Forge's AI does (58.1% against
56.1%), and the two random-rollout searches that are 40 Elo *below* the live seat agree with the labels *more*
(64.7% and 64.4%), with intervals that exclude 0. On two of three pairs the sign is the wrong way.

**Why.** The labels differ from Forge's move at 226 of the 515 decisions, so a player scores by departing from
option 0 at the right places. The random-rollout searches depart most (41% of answers against 28%) and hit the
label at 51% of their departures; the live seat departs less and hits at 40%. They are also the least stable
players: repeats of one decision agree 77% of the time against 93%. So the labels reward a willingness to leave
Forge's move that the ladder does not reward. Among the seven searches within 17 Elo of each other (the live seat and six arms of it), agreement
spans 57.0% to 59.5% and every interval against the live seat holds 0: no signal there either.

**What it decides (D538 point 9).** Wave 2 (392 more decisions judged, about 6.5M tokens) is **not bought**.
Agreement with these labels is **not** used as a screen before ladder nights; arms keep going to the ladder. The
605 judged decisions stay what they were: a dataset and a description, not a yardstick.

**What it does not say.** Not that the labels are wrong: a judge can be right about a single move while a player
who finds that move loses elsewhere, and this probe cannot tell those apart. Not that no cheap screen exists:
only this one was tested. The rank correlation of agreement against Elo was not produced, by the rule.

**Beside the rule, deciding nothing.** Mismatches (the replay did not reach the recorded decision) are 1 to 11 a
player of 605 to 1,815 rows, final by rule; off-atlas answers 4 to 5 rows for the three random-rollout seats;
`--off-atlas miss` and `drop` give the same pairs to the third decimal.

**The live seat** was unchanged by this job (`liveSeatChanged` 0).

**The run.** 3.25 h. Forge-default and policy-outlet 289 s each; a search seat 860 to 1,060 s; `t1-x3` 1,465 s.

**Next.** The lab is free: ForgeCoach's `pc/search-v3`, then D539 (the live seat to the no-block search, the
owner's yes of 2026-11-11), then D540 and J214 (the windows the search never looks at), measured on the ladder.
