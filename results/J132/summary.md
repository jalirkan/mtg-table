# J132 — A3, the leak report: Justin's recurring mistakes in his own games (J129 re-posted, D438)

Written by the PC session on 2026-10-16. Sources: `leaks.json`, `report.md`, `decisions.jsonl`, `inventory.json`,
`review-status.json`, `checks.txt`, `pilot-checks.txt`, STATUS, and the step logs.
- **Which job this is:** J132 is J129 re-posted by the cloud on merged mtg-table PR #142, pinned to `0c5de78`.
- **Input:** staged on 2026-10-15 at 23:20 EDT.
- **Checks:** every pilot check and all 11 final checks passed. Among them: strict JSON, 0 mismatches when `verify`
  redid the arithmetic, and the rule's bars at 5 / 3 / 10,000.

## The rule and its verdict

**Pre-registered (job file and D438, before any of his decisions was graded):**
- A decision is a **clear mistake** only when its regret's 95% interval is above zero (`regretLo > 0`).
- A kind of decision is a **leak** only when all three hold:
  - at least **5** clear mistakes;
  - in at least **3** different games;
  - a mean regret over all its graded decisions whose 95% interval is above zero (a game-cluster bootstrap,
    10,000 resamples, seed 129).
- Anything else is NOT SHOWN.

**Verdict: no leak shown (`leaks: 0`).** No kind met the first two bars.
- **Sequencing** came closest: 3 clear mistakes in 2 games, against 5 in 3.
- **Every other covered kind** had at most 1 clear mistake.
- **Three kinds have a mean-regret interval above zero:** sequencing, holding up vs tapping out, and other attacks.
  None of them has the mistakes to go with it, so the rule calls none of them a leak.

"Not shown" means these seven games show no pattern. It does not mean he plays these decisions well.

## Inventory

| | count |
|---|---|
| Games that are his for certain | **14** (13 ForgeCoach matches + seat 0 of one recorded table game) |
| Gradable (an act, his deck, a cube for pool mode) | **9** |
| Graded, i.e. with at least one decision | **7** (the other 2 held no decision of his) |
| Reviews failed | 0 |
| Decisions planned by the review's planner | **153**: 95 main-phase plays, 30 attacks, 12 blocks, 16 targets |
| Graded | **103** (63 to the end of the game, 40 to the end of the turn) |

**Why 153 planned became 103 graded:**
- 40 decisions had only one legal answer, so there was nothing to grade.
- 10 could not be graded (the grader's status was not `ok`, or his choice was not one of its options).

**Not in the 153 at all:**
- **Keep or mulligan:** no grader takes the opening hand. He answered 7 of these in the graded games (8 counting a
  game with no other decision).
- **Land drops:** the review plays Forge's land drop the same way in every option of a main-phase play. So "a land
  played late" is listed as not graded.

**The 34 excluded logs:**
- **31 play.sh logs** (`human-ws-…` / `human-console-…`; 29 at the first staging, 31 when J132's input was
  re-staged). Scripted clients and Claude's own verification games write the same ids, so they cannot be told from
  his. The owner can admit any of them by name with `--include-id`.
- **2 seat-1 logs of table games**, never opened. The friend's decisions were never read or graded.
- **1 table seat (his own)** whose header carries no recording consent (D407).

Of the 14 games that are his:
- 4 were not graded because they have no act;
- 1 was not graded because no cube holds his deck (pool mode would have no pool);
- 2 held no decision.

## The five clear mistakes

Units are win-chance points: the regret × 100, with its 95% interval. All five were deepened and graded to the end
of the game. No card names: the job's privacy rule keeps them out of its outputs.

| # | game | frame seq | turn | kind | regret [95%] |
|---|---|---|---|---|---|
| 1 | `friend-m1791336206841` | 22 | 5 | sequencing: which spell first, of 2+ castable | 7.0 [0.4, 13.6] |
| 2 | `friend-m1791336206841` | 46 | 7 | holding up vs tapping out: he passed with a spell castable | 35.0 [11.4, 58.6] |
| 3 | `friend-m1791336206841` | 100 | 13 | sequencing | 18.2 [1.3, 35.1] |
| 4 | `match-m1791649145759` | 189 | 16 | chump or double block | 30.0 [7.2, 52.8] |
| 5 | `match-m1791666843336` | 127 | 13 | sequencing | 50.0 [16.2, 83.8] |

## Per kind

| kind | graded | games | clear mistakes | in games | mean regret [95%] | verdict |
|---|---|---|---|---|---|---|
| holding up vs tapping out (held 15, cast 13) | 28 | 7 | 1 (held) | 1 | 1.8 [0.1, 5.1] | not shown |
| sequencing | 17 | 5 | 3 | 2 | 5.1 [0.2, 8.4] | not shown |
| casting into open mana (2+ untapped lands) | 11 | 4 | 0 | 0 | 0.7 [-0.2, 1.5] | not shown |
| other attacks | 30 | 5 | 0 | 0 | 2.1 [0.5, 3.8] | not shown |
| not attacking when free | 0 | 0 | 0 | 0 | - | not shown (no such decision) |
| chump or double block | 5 | 2 | 1 | 1 | 6.0 [-1.3, 40.3] | not shown |
| other blocks | 4 | 3 | 0 | 0 | 2.0 [-2.4, 5.8] | not shown |
| choosing a target | 8 | 5 | 0 | 0 | 0.0 [-0.5, 0.5] | not shown |
| land played late | - | - | - | - | - | not graded |
| keep or mulligan | - | - | - | - | - | not graded (7 seen) |

## What a verdict would need

- The kind with the most clear mistakes is sequencing: 3 mistakes over 7 graded games, about **0.43 a game**.
- At that rate it would reach 5 mistakes in about **12 graded games**; he has 7. That is roughly 5 more games like
  these, if the rate holds and the mistakes spread across 3 or more games.
- The other kinds have one clear mistake or none, so they would need many more games than that.
- What adds to the data: games against the AI launched from ForgeCoach (match ids), or table games with recording
  on. Plain play.sh games are excluded unless named.

## The run

- **Pilot:** 23:55–23:57 EDT on 2026-10-15. It passed.
- **run1, first try:** started 23:57 on 7 workers. At 00:02 it was killed without an exit code, during the first
  game's deepening; the runner recorded it as a memory stop (oomd or the OOM killer). It happened while the PC
  session's agents were also loading the machine. The runner set `workers_cap: 6` and a retry after 00:17.
- **run1, retry:** J131 ran in between. The retry started at 04:39:38 on 6 workers, reviewed all 7 games, and
  finished at 05:32:56 (53 minutes; the measured peak was 1.08 GB a worker).
- **run2:** aggregate and verify, 13 s.
- **Done:** 05:33:09.

## For Justin, in plain words

Across your seven graded games the engine found five decisions where it is clear you lost win chance. That is too
few, and too bunched, to call any of them a habit. These are observations, not a verdict:
- **Four of the five were in your own main phase, about what to cast.** Three were the order of your spells when
  two or more were castable. One was holding a spell back when casting it was better.
- **The odd one out is a block late in a long game.** It was a chump or a double block.
- **Three of the five came from the one game against your friend.** In that game the engine played your friend's
  side as Forge's AI would. Two of them were sequencing calls.
- **The costly ones came later in their games**, on turns 13 and 16, where one wrong order or block decided more.
- **If one thing is worth watching, it is which spell to cast first.** It has the most clear mistakes, and its
  average cost has an interval above zero. A few more recorded games would show whether it holds.
