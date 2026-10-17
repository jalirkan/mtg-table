# J139 — the evaluator-leaf confirmation: one fixed 4,800-game match against search-v2 on fresh deals (D437)

Written by the PC session, 2026-10-17, from `report.md`, `match-J139.json`, `verdict.json`, `checks.txt`, `pilot-checks.txt`, `metrics.json`, STATUS (and its history on this branch), `prepare.log`, the step logs, and J131's summary.

- **Which job this is:** J139 is the confirmation of J131's +8.7 Elo lead. Justin asked for it on 2026-10-16. The cloud posted it as J138. J138's pilot failed only on a stale planted case in the verdict self-test (61 errors, the 1,200-game bar, where 4,800 games allow 240). J139 is the same file with that case set to 241.
- **Pinned to mtg-table@0c9bab7.** The pilot's `merged == 1` check passed.
- **Checks:** every pilot check (13) and every final check (7) passed.
- **The run:** 16:40 on 2026-10-16 to 01:29 on 2026-10-17, 8 h 49 m, pilot included, in one attempt.

## The rule and its verdict

**Pre-registered (job file, 2026-10-16, before any J139 game):**
- **The match:** ONE fixed D398 match of `search-v2-evalleaf` against `search-v1-anytime` (search-v2). That is 4,800 games (600 batches of 8, 2,400 mirrored pairs), at the live 1.5 s budget on the confirm deck set.
  - **Fresh deals:** the matchup's next unused seed blocks, so no J131 deal repeats.
  - **Read alone:** from `match-J139.json`. J131's games are not pooled in; J139 is the confirmation, as J116 was for J115.
  - **Nothing is tuned:** evaluator v2 as trained (`dcdae3745b84`), every search knob search-v2's.
- **Complete** means three things: the match line says `complete: true`, all 4,800 games were played, and errors plus timeouts are at most 240.
- **ADOPT** the evaluator leaf into the next search version if the match is complete and the 95% lower end of the score is above 0.5. **Otherwise NOT SHOWN.**

**Verdict: NOT SHOWN. The hand-written leaf stays.**
- **The score:** search-v2-evalleaf scored **0.5031, 95% [0.4933, 0.5130]**, which is **+2.2 Elo [−4.7, +9.0]**.
- **Completeness:** the match was complete, 4,800 of 4,800 games, with 0 draws, 0 engine errors and 7 timeouts.
- **The rule:** the lower end, 0.4933, is below 0.5, so the evaluator leaf is not shown to help. The interval is centred near 0.5. Any true gain is at most about +9 Elo at this size, and a true +8.7 sits right at the interval's top.
- **The script and the checks agree:** `verdict.json` reads "NOT SHOWN: the lower end 0.4933 is not above 0.5". `v.adopt = 0`, and the runner's last two checks restate the rule and pass.

## The match

| | |
|---|---|
| Match | `search-v2-evalleaf` (hash `c6d9a3990415`) vs `search-v1-anytime` = search-v2 (`cdd55e02a89c`) |
| Deck set | `tools/ai-bench/pairs-confirm.txt` (34 deck pairs, never tuned on) |
| Deals | seed blocks 114,900,227–114,900,826 (600 blocks, all after J131's last, 114,900,226) |
| Games | 4,800 of 4,800, **complete**; 2,400 mirrored pairs; 2,415 wins; 0 draws, 0 engine errors, 7 timeouts |
| Score | **0.5031 [0.4933, 0.5130]**, SE 0.0050 |
| Elo | **+2.2 [−4.7, +9.0]** |

- **The pair spread matched J131's.** It came out at about 0.245 (SE 0.0050 at 2,400 pairs), as in J131. So the interval is the width the job planned, about ±5 Elo, four times J131's size.
- **The rule named the wrong range for J131's deals, but no deal repeated.** The rule says J131 used blocks 114,900,000–149. J131's retry actually ran to 114,900,226 (J131's summary, *The run*). The ladder took the next unused blocks, 227 onward, so "no J131 deal repeats" holds as intended.

## What the evaluator leaf changed

|  | search-v2-evalleaf | search-v2 |
|---|---|---|
| decisions searched (games) | 110,800 (4,798) | 113,761 (4,798) |
| changed Forge's answer, priority (p) | 18,477 / 78,097 = **23.7%** | 15,890 / 78,438 = 20.3% |
| changed, attacks (a) | 4,995 / 23,935 = **20.9%** | 3,186 / 24,685 = 12.9% |
| changed, blocks (b) | 2,317 / 8,768 = **26.4%** | 1,600 / 10,638 = 15.0% |
| changed, all p + a + b | 25,789 / 110,800 = **23.3%** | 20,676 / 113,761 = 18.2% |
| ms per decision (p + a + b) | 907.1 | 909.5 |
| ms per decision, p / a / b | 911.6 / 830.6 / 1,076.2 | 910.3 / 856.6 / 1,026.7 |
| budget fallbacks [95%] | 683 = **0.6%** [0.5%, 0.7%] | 643 = **0.6%** [0.5%, 0.6%] |
| other fallbacks | rollout errors 236, unmappable 143 | rollout errors 254, unmappable 154 |
| evaluator leaves | 1,600,784, **158.3 µs each** | 0 |

What the table says:
- **The override pattern is J131's again, at four times the size.** The evaluator leaf changes Forge's answer more often: +3.4 points at priority, +8.0 at attacks, +11.4 at blocks. Combat is again where the two leaves disagree most. Changing more answers did not turn into a measurable gain.
- **It costs nothing in time.** About 14 evaluator leaves a decision, about 2.3 ms. Both sides took 907–910 ms a decision.
  - That is about 140 ms more per decision than in J131 (772 and 767). Both sides moved together. The machine was evidently busier overall than in J131; STATUS does not record why (the GPU scenery lane was painting beside it for much of the run, which the PC session can confirm but the lab did not record).
  - A leaf cost 158 µs against J131's 123 µs, consistent with that.
- **Budget fallbacks** are 0.6% on both sides, with overlapping intervals.
- **The switch was live on one side only.** The pilot measured 3,321 evaluator leaves on the evaluator side and 0 on search-v2, and 670 and 628 ms a decision.

## The run

- **Prepare** started at 16:40:10 on 2026-10-16, the moment J137 finished. **The pilot** (4 blocks, 3 workers) ran 16:40–16:46.
- **The match** (run1) ran 16:46:01 → 01:29:13, 8 h 43 m, at 7 workers; run2 (the verdict and `report.md`) at 01:29.
- **No interruptions.** STATUS records no restart, no memory stop and no pressure line, and the pool stayed at 7 workers throughout. Peak memory was 1.12 GB per worker.
- **Nothing ran beside it in the queue.** J137 had finished as J139 started, and J140 started at 02:49 after it.
- **7 games timed out**, well inside the 240 the rule allows. Both sides searched in 4,798 games.

## What it means: J131's lead did not hold, and the search growth plan is closed

**J131's +8.7 Elo did not hold.** On 4,800 fresh games the evaluator leaf scored +2.2 Elo [−4.7, +9.0] against search-v2, an interval that includes 0. That is what a real gain of about 0–9 Elo or none at all would look like. J131's point estimate sits at the very top of it, so J131's number was most likely a high draw. J131's own interrupted first attempt had leaned the other way: 616 games at 49.0%, not pooled.

**Pooled, as information only** (it decides nothing): J131 and J139 together are 3,000 pairs, 6,000 games. Weighted by pairs that gives about **0.505 [0.496, 0.514], about +3.5 Elo [−2.6, +9.5]**. The pooled interval also includes 0.5, and adding J131's interrupted 616 games would only pull it lower. This is a rough combination of the two match lines, not a pre-registered reading.

**The search growth plan, final account** (each a pre-registered fixed match against the current live search, on the confirm deck set):

| job | what was tried | match | score [95%] | Elo [95%] | reading |
|---|---|---|---|---|---|
| J102 | the anytime search (search-v1-anytime vs search-v1) | 2,400 games | 0.5133 [0.5036, 0.5230] | +9.3 [+2.5, +16.0] | **ADOPTED: search-v2** (D412); budget fallbacks 0.7% vs 5.6% |
| J115 | the opening-hand search (`mull=1`) | 1,200 | 0.492 [0.475, 0.508] | −5.8 [−17.4, +5.8] | NOT SHOWN |
| J115 | the target search (`targets=1`) | 1,200 | 0.510 [0.496, 0.524] | +6.9 [−2.7, +16.6] | NOT SHOWN |
| J116 | the target search, confirmation on fresh deals | 4,800 | 0.5031 [0.4956, 0.5106] | +2.2 [−3.0, +7.4] | NOT SHOWN |
| J125 | the hand leaf's weights (the dev set chose `whand50`) | 1,200 | 0.492 [0.477, 0.507] | −5.8 [−16.1, +4.5] | NOT SHOWN |
| J127 | the distilled policy (no rollouts, 162× faster) | 1,200 | 0.387 [0.365, 0.408] | −80.1 [−96.1, −64.5] | NOT SHIP: shown worse |
| J131 | the evaluator v2 leaf | 1,200 | 0.5125 [0.4933, 0.5317] | +8.7 [−4.7, +22.1] | NOT SHOWN |
| J139 | the evaluator v2 leaf, confirmation on fresh deals | 4,800 | 0.5031 [0.4933, 0.5130] | +2.2 [−4.7, +9.0] | NOT SHOWN |

What the evidence says:
- **One thing was adopted:** search-v2 itself, the anytime loop. It was the only change whose interval cleared 0.5, and it cut budget fallbacks by a factor of eight.
- **Nothing tried on top of search-v2 was shown to help,** over 14,400 confirmation games. Both leads that looked positive at 1,200 games came back near zero at 4,800 on fresh deals:
  - targets went from +6.9 to +2.2;
  - the evaluator leaf went from +8.7 to +2.2.
- **One alternative was shown worse:** the distilled policy.
- **No interval rules out a gain of a few Elo,** but every 4,800-game match puts the gain under about +7 to +9.

**Recommendation** (the PC session's, separate from the evidence; Justin decides):
- The search growth plan is closed for good. search-v2 stays the live `--ai-policy search` seat and the ladder's reference (`search-v1-anytime`), unchanged.
- The four switches (`mull`, `targets`, the leaf weights, `leaf=eval`) stay in the code, default off, with their ladder players registered. Nothing needs removing.
- The blended leaf (evaluator plus hand, its one mix chosen on the dev set first) stays an unstarted follow-up, as D437 named it. On this evidence it is not worth lab time: the pure evaluator leaf is within a few Elo of the hand leaf, so a mix of the two has little room to differ from either.
- The path to a stronger pilot is no longer tuning the search; it is the move atlas (J142) and a policy learned from regret-labelled decisions, per Justin's 2026-10-17 direction.
