# J131 — search-v2 with the learned evaluator at its leaves: one fixed 1,200-game match against search-v2 (D437)

Written by the PC session, 2026-10-16, from `report.md`, `match-J131.json`, `verdict.json`, `checks.txt`, `pilot-checks.txt`, `metrics.json`, STATUS (and its history on this branch), `prepare.log` and the step logs.

- **Which job this is:** J131 is J128 re-posted by the cloud. J128 failed its pilot only because mtg-table PR #143 was not merged yet.
- **Pinned to mtg-table@0c5de78:** the merge of PR #143 (D437). The pilot's `merged == 1` check passed.
- **Checks:** every pilot check (13) and every final check (7) passed.
- **The run:** 22:31 on 2026-10-15 to 04:39 on 2026-10-16. A memory stop at 23:54 interrupted it (see *The run*).

## The rule and its verdict

**Pre-registered (job file, 2026-10-15, before any game):**
- **The match:** ONE fixed D398 match, 1,200 games (600 mirrored pairs), at the live 1.5 s budget on the confirm deck set, with nothing tuned.
  - The players: `search-v2-evalleaf` against `search-v1-anytime` (search-v2).
  - `search-v2-evalleaf` is search-v2 with every knob its own, except that a rollout which does not finish the game is scored by evaluator v2's P(win) for the searching seat. That is D354's `leaf=eval`, model `dcdae3745b84`.
- **Complete** means three things: the match line says `complete: true`, all 1,200 games were played, and errors plus timeouts are at most 60.
- **ADOPT** the evaluator leaf into the next search version if the match is complete and the 95% lower end of the score is above 0.5. **Otherwise NOT SHOWN.**

**Verdict: NOT SHOWN. The hand-written leaf stays.**
- **The score:** search-v2-evalleaf scored **0.5125, 95% [0.4933, 0.5317]**, which is **+8.7 Elo [−4.7, +22.1]**.
- **Completeness:** the match was complete, 1,200 of 1,200 games, with 0 draws, 0 engine errors and 0 timeouts.
- **The rule:** the lower end, 0.4933, is below 0.5, so the evaluator leaf is not shown to help. The point estimate is on the positive side and the interval also includes 0.5, so it is not shown to hurt either. This is not "no effect".
- **The script and the checks agree:** `verdict.json` reads "NOT SHOWN: the lower end 0.4933 is not above 0.5". `v.adopt = 0`, and the runner's last two checks restate the rule and pass.

## The match

| | |
|---|---|
| Match | `search-v2-evalleaf` (hash `c6d9a3990415`) vs `search-v1-anytime` = search-v2 (`cdd55e02a89c`) |
| Deck set | `tools/ai-bench/pairs-confirm.txt` (34 deck pairs, never tuned on) |
| Games | 1,200 of 1,200, **complete**; 600 mirrored pairs; 0 draws, 0 engine errors, 0 timeouts |
| Score | **0.5125 [0.4933, 0.5317]**, SE 0.0098 |
| Elo | **+8.7 [−4.7, +22.1]** |

**The interval is wider than planned.**
- The job file expected about ±0.015, from J125's SE of 0.0075 on the same design. The SE here is 0.0098, so the interval is ±0.019.
- Each pair's result varied more with the evaluator leaf in one seat. A likely reason is that it changes Forge's answer far more often (the next section). That is a reading of the numbers, not something the job measured.
- At this width a true +9 Elo clears 0.5 only about one time in four.

## What the evaluator leaf changed

|  | search-v2-evalleaf | search-v2 |
|---|---|---|
| decisions searched (games) | 27,900 (1,200) | 28,025 (1,200) |
| changed Forge's answer, priority (p) | 4,830 / 19,673 = **24.6%** | 3,869 / 19,227 = 20.1% |
| changed, attacks (a) | 1,282 / 5,999 = **21.4%** | 812 / 6,092 = 13.3% |
| changed, blocks (b) | 600 / 2,228 = **26.9%** | 388 / 2,706 = 14.3% |
| changed, all p + a + b | 6,712 / 27,900 = **24.1%** | 5,069 / 28,025 = 18.1% |
| ms per decision (p + a + b) | 772.4 | 767.0 |
| ms per decision, p / a / b | 779.4 / 695.7 / 916.9 | 772.1 / 704.9 / 871.3 |
| budget fallbacks [95%] | 99 = **0.4%** [0.2%, 0.5%] | 135 = **0.5%** [0.3%, 0.6%] |
| other fallbacks | rollout errors 59, unmappable 34 | rollout errors 65, unmappable 43 |
| evaluator leaves | 452,130, **122.9 µs each** | 0 |

What the table says:
- **The evaluator leaf overrides Forge far more often.** Overrides rose by 4.5 points at priority, 8.1 at attacks and 12.6 at blocks. The search's override rule (beat Forge's answer by a 20-point margin, about 1 point of win rate) is crossed much more easily on the evaluator's scale. Combat is where the two leaves disagree most.
- **It costs nothing in time.** Each decision scored about 16 evaluator leaves, about 2 ms a decision. The decision times are 772 and 767 ms. The leaf costs 123 µs here against 79 µs in the one-worker smoke, which fits 5 workers sharing the machine.
- **Budget fallbacks:** both sides are at 0.4–0.5%, and the intervals overlap.
- **The switch was live on one side only.** The pilot measured 4,065 evaluator leaves on the evaluator side and 0 on search-v2. Both sides averaged under 1.5 s a decision in the pilot: 709 ms and 681 ms.

More overrides did not turn into a shown gain. Some overrides of Forge's answer by the evaluator leaf may help and others may hurt, and the score cannot separate them. This match measured only the total.

## The run

- **The first attempt** started at 22:31:24 on 2026-10-15.
  - The pilot passed and the match began at 22:38.
  - From 23:24 the runner's memory backoff moved the pool between 5 and 7 workers seven times. The pressure lines show memory pressure of 11–33% and swap-in up to 315/s. All the while the job itself held only 5.7–9.4 GB of its 21.4 GB budget. The pressure came from outside the job: the PC session's own agents, which were running gates and engine dry runs beside the runner (a rule now limits that to one at a time).
  - At 23:54:57, step run1 was killed without an exit code (oomd or the OOM killer). The runner marked the job `waiting`, capped it at 5 workers and set `retry_after` 00:09:57.
- **J135 ran in between,** 00:06–01:56.
- **The retry** started at 01:56:37, at run1 with 5 workers. The pilot had already passed, and the runner moved aside `var/j131` and `var/ai-ladder-pilot/J131`.
  - The PC session's own board check held the table from 02:14 to 02:19 (a live game on the engine, for the bridges PR), and new games waited.
  - The match finished at 04:38 and the job at 04:39:13.
  - Peak memory was 1.14 GB per worker.
- **The first attempt's games are not in the reading.**
  - It had finished 77 batches, 616 games (308 pairs), when it was killed. Its running score in the log was 49.0%, roughly ±0.027 at that size: a rough figure from J131's pair spread, not a measured interval.
  - Those games stay in `var/ai-ladder/results` under their own match id (`…20261016T023828-309089`). The rule reads `match-J131.json` alone, the retry's complete 1,200 games, so they are not pooled.
  - They are reported here because they leaned the other way. They are one more reason not to read the +8.7 Elo as a gain.
- **The deals moved.** The rule named seed blocks 114,900,000–149, the deals of J115's and J125's confirmations.
  - A restarted match takes the matchup's next unused blocks. The retry therefore played the 73 blocks of that range the first attempt had not finished, plus 77 fresh blocks (114,900,150–226).
  - The decks are the same confirm set, so the match is valid as a held-out D398 match. It is only half on the same deals as J125.
  - The job file did not foresee this. A future fixed match that may be retried should name its blocks explicitly or record that a retry continues past them.

## What it means: the search growth plan, closed

J131 was the last item of the search growth plan (approved 2026-10-08). Justin has now parked the plan, so this is the plan's closing account.

**The evidence**, each a pre-registered fixed match against the current live search, on the confirm deck set:

| job | what was tried | match | score [95%] | Elo [95%] | reading |
|---|---|---|---|---|---|
| J102 | the anytime search (search-v1-anytime vs search-v1) | 2,400 games | 0.5133 [0.5036, 0.5230] | +9.3 [+2.5, +16.0] | **ADOPTED: search-v2** (D412); budget fallbacks 0.7% vs 5.6% |
| J115 | the opening-hand search (`mull=1`) | 1,200 | 0.492 [0.475, 0.508] | −5.8 [−17.4, +5.8] | NOT SHOWN |
| J115 | the target search (`targets=1`) | 1,200 | 0.510 [0.496, 0.524] | +6.9 [−2.7, +16.6] | NOT SHOWN |
| J116 | the target search, confirmation on fresh deals | 4,800 | 0.5031 [0.4956, 0.5106] | +2.2 [−3.0, +7.4] | NOT SHOWN |
| J125 | the hand leaf's weights (the dev set chose `whand50`) | 1,200 | 0.492 [0.477, 0.507] | −5.8 [−16.1, +4.5] | NOT SHOWN |
| J127 | the distilled policy (no rollouts, 162× faster) | 1,200 | 0.387 [0.365, 0.408] | −80.1 [−96.1, −64.5] | NOT SHIP: shown worse |
| J131 | the evaluator v2 leaf | 1,200 | 0.5125 [0.4933, 0.5317] | +8.7 [−4.7, +22.1] | NOT SHOWN |

What the evidence says:
- **One thing was adopted:** search-v2 itself, the anytime loop. It was the only change whose interval cleared 0.5. It also cut budget fallbacks by a factor of eight. It is the live `--ai-policy search` seat and the ladder's `search-v1-anytime`.
- **Nothing tried on top of search-v2 was shown to help.** That covers four switches (opening hands, targets, leaf weights, the evaluator leaf) over 9,600 confirmation games. Two point estimates were positive (targets, the evaluator leaf) and two negative (mulligans, leaf weights). Every interval included 0.5.
- **One alternative was shown worse:** the distilled policy. It learned to copy Forge's answer rather than search-v2's.
- **No interval rules out a small gain.** These 1,200-game matches can see about 10–15 Elo. A true effect of 5 Elo or less on any of the four switches would not have shown at these sizes. J116's 4,800 games put targets under about +7.

**Recommendation** (the PC session's, separate from the evidence; Justin decides):
- Keep search-v2 as the live seat and the ladder's reference, unchanged.
- Leave the four switches off. They are in the code, default off, with their ladder players registered, so nothing needs removing.
- If the plan is ever reopened, the evaluator leaf is the only lead worth a second look. A confirmation would have to resolve about +9 Elo at J131's pair spread, which is about 2,400 pairs (4,800 games, ~8 h). Its own first, interrupted 616 games leaned the other way (49.0%), so it is a weak lead, not a promising one.
- The blended leaf (evaluator plus hand, one mix chosen on the dev set) stays the unstarted follow-up named in D437.
- Nothing here argues for spending more lab time on search strength now.
