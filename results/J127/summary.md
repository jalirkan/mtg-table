# J127 — B1, search-v2 distilled into a fast policy: rows, a per-kind scorer, two fixed matches (D435)

Written by the PC session, 2026-10-15, from STATUS, the runner's `metrics.json` (the training report is in it as
`mt.*`), `rows-stats.json`, `verdict.json`, `match-J127-search.json`, `match-J127-forge.json`, `checks.txt`,
`pilot-checks.txt` and the step logs.
- **Job:** 17:48:46 → 22:18:54 EDT on 2026-10-14, 4 h 30 m including the pilot. 7 workers. Every pilot check (26)
  and every final check (26) passed.
- **Which job this is:** J127 is J126 re-posted by the cloud (pc-jobs 508ac7f0). J126 failed its pilot only because
  mtg-table PR #141 was not merged yet.
- **Pinned to mtg-table@e8d2448:** the merge of PR #141 (D435). The pilot's `merged == 1` check passed.

## The rule and its verdict

**Pre-registered (job file, 2026-10-14, before any row was generated):**
- **SHIP** the distilled player as a lab policy only when all three hold:
  1. its fixed match against search-v2 (`search-v1-anytime`) is complete, 1,200 of 1,200 games;
  2. it is not shown worse than search-v2 by more than 0.03 in score: the 95% lower end of its score is ≥ 0.47;
  3. it is at least 10 times faster per decision: search-v2's mean time over the held-out test decisions, divided
     by the distilled seat's mean time in that match.
- Otherwise NOT SHOWN, naming the part that failed.
- The agreement report and the match against Forge Default decide nothing.

**Verdict: NOT SHIP (NOT SHOWN). The distilled player is not shipped as a lab policy.**

| Part | Bar | Result | |
|---|---|---|---|
| (1) complete | 1,200 of 1,200 | 1,200 of 1,200 | pass |
| (2) not worse by more than 0.03 | lower end ≥ 0.47 | **0.387 [0.365, 0.408]**, −80.1 Elo [−96.1, −64.5] | **fail** |
| (3) at least 10× faster | ≥ 10 | **161.75×** (826.8 ms held out ÷ 5.11 ms live) | pass |

- The verdict script's reading: "NOT SHOWN: the score's lower end 0.3652 is under 0.47".
- The runner's last five checks restate the rule. They agree: `ship = 0` = complete 1 × notWorse 0 × fast 1.
- This is not a borderline call. The whole interval sits far under 0.47, so the distilled player is **shown worse**
  than search-v2, by about 0.11 in score (~80 Elo).
- The job's hypothesis said SHIP was not the expected outcome and put the score at 0.45–0.49. It came in lower than
  that.

## The honest reading: the model learned to copy Forge's answer

The held-out top-1 agreement with what search-v2 played **is the "always play Forge's answer" baseline**:
0.8243 [0.8147, 0.8339] against 0.8229 [0.8126, 0.8331] over 8,778 test decisions in 192 games, a difference of
+0.15 points.

| Kind | Test decisions (games) | Agreement [95%] | Always Forge [95%] | Search-v2 overrode Forge | Recall: overrides recovered | Model overrides | Precision: of those, search-v2's pick |
|---|---|---|---|---|---|---|---|
| p (priority) | 6,042 (192) | 0.815 [0.804, 0.825] | 0.812 [0.800, 0.824] | 18.8% (1,137) | **9.1%** [6.1, 12.2] | 3.9% (234) | 44.4% [34.5, 54.4] |
| a (attack) | 1,920 (192) | 0.848 [0.826, 0.871] | 0.847 [0.828, 0.866] | 15.3% (294) | **19.4%** [14.4, 24.4] | 7.1% (136) | 41.9% [31.4, 52.4] |
| b (block) | 816 (171) | 0.838 [0.812, 0.865] | 0.848 [0.823, 0.874] | 15.2% (124) | **16.9%** [9.3, 24.6] | 7.0% (57) | 36.8% [22.7, 51.0] |
| p+a+b | 8,778 (192) | 0.824 [0.815, 0.834] | 0.823 [0.813, 0.833] | | | | |

Intervals are clustered by game. "Recall" is the share of search-v2's overrides of Forge where the model picked the
same candidate. "Precision" is the share of the model's own overrides that matched search-v2.

What the table says:
- **The model mostly plays Forge's answer.** It overrides Forge on 4–7% of test decisions, against search-v2's
  15–19%.
- **It finds few of search-v2's overrides.** It recovers 9% of the priority plays search-v2 changed, and 17–19% of
  the attacks and blocks.
- **When it does override, it is usually wrong.** It agrees with search-v2 only 37–44% of the time on its own
  overrides. In the rest it leaves an answer that search-v2 kept (or changed to something else) for one search-v2
  did not choose.
- **The right and wrong overrides cancel.** Blocks come out 1 point under the baseline, and priority and attacks
  0.1–0.3 points over it.
- **It did not learn more even on its training data**, so this is not mainly overfitting:
  - Training agreement: p 0.824 against a training baseline of 0.810, a 0.884 / 0.844, b 0.859 / 0.824. Recall on
    training overrides: p 11.5%, a 29.7%, b 25.9%.
  - Early stopping took priority's best epoch at 3 of 7, attack 13 of 17, block 11 of 15.
  - With this feature set and model size, there is little signal it can find in which of search-v2's candidates
    the rollouts will favour.
  - That is not surprising: search-v2 decides on noisy rollout means with a 20-point margin, and the features see
    the board, not the rollouts.

**Rows and split.**
- **Games:** 1,800 lab games, 600 a cube: Vintage 180, Evan's cube (360), Synergy. Seeds 814,000,001+, search-v2
  in both seats.
- **Kept:** 1,799 ended games. One Synergy game ended in an engine error and was dropped. No game was left
  unended or counted twice, and every file had one layout, the expected one.
- **Rows:** 83,460 in all: p 57,648, a 18,300, b 7,512.
  - Search-v2 overrode Forge on 17.8% of them, and took 821.5 ms a decision on average.
  - 1,310 rows where search-v2 fell back to Forge's answer were left out by rule: p 1,023, a 201, b 86.

| Kind | Train | Val | Test |
|---|---|---|---|
| p | 44,775 | 5,808 | 6,042 |
| a | 14,330 | 1,849 | 1,920 |
| b | 5,835 | 775 | 816 |

**Training settings (pre-registered; `distill.py train`'s defaults at e8d2448):**
- **Split:** by game, `sha256("J126|<rows folder>|<lab key>")` mod 100: 80/10/10.
- **Model:** one scorer per kind. Inputs are the state (D361's encoder with no cube cards, 396 numbers), the
  candidate's vector, and its difference to Forge's answer. One hidden layer of 32 ReLU units, plus a linear term,
  with a softmax over the decision's candidates.
- **Optimiser:** Adam, learning rate 0.003, L2 0.0001, batch 512, seed 126. At most 40 epochs, stopping after 4
  epochs without a better validation loss.
- **Coverage:** a kind needs at least 200 training decisions to get a model. All three kinds got one.
- **Cost:** the fit took 6.8 s, and numpy's forward pass is about 1 µs a decision.

## The two matches (D398, confirm deck set, 600 mirrored pairs each)

| Against | Played | Score [95%] | Elo [95%] | Wins | Draws, errors, timeouts | Distilled ms a decision | Opponent ms a decision |
|---|---|---|---|---|---|---|---|
| search-v2 (`search-v1-anytime`, `cdd55e02a89c`) | 1,200 / 1,200, complete | **0.387 [0.365, 0.408]** | **−80.1 [−96.1, −64.5]** | 464 | 0, 0, 0 | 5.11 | 896.3 |
| Forge Default (`forge-default`) | 1,200 / 1,200, complete | **0.485 [0.465, 0.505]** | **−10.4 [−24.4, +3.6]** | 582 | 0, 0, 0 | 7.93 | — |

The player is `search-v2-distill-150cee98c455` (hash `d39ca16ee970`): Default plus D310's outlet policy, with the
model choosing among search-v2's candidates.

**How often each side changed Forge's answer:**
- **Distilled vs search-v2:** 7.2% of 29,936 decisions (p 7.6%, a 6.2%, b 6.7%).
- **Search-v2 in the same match:** 17.6% of 28,876 decisions (p 19.6%, a 13.6%, b 10.9%).
  - Its budget fallbacks were 0.68% [0.47, 0.89] (197), plus 59 rollout errors and 39 unmappable.
  - Its rates match J115–J125.
- **Distilled vs Forge Default:** 7.3% of 31,866 decisions.

**Against search-v2, the distilled seat plays at about Forge's level.**
- J101 measured search-v1 against Forge Default at 0.603, +73 Elo, and J102 put search-v2 about 9 Elo above
  search-v1.
- So −80 Elo against search-v2 is what a Forge-strength player would score.

**Against Forge Default, it scored below 0.5: 0.485, −10 Elo.** The hypothesis did not predict this. It said the
distilled seat would play "close to Forge Default plus outlets", and expected a small edge if anything. The interval
[0.465, 0.505] includes 0.5, so it is **not shown worse** than Forge Default. But the point estimate is on the wrong
side, and the upper end is only +3.6 Elo.

What it suggests:
- **Where the model leaves Forge's answer, it is more often wrong than right.** That is 7% of decisions, and its
  overrides match search-v2's choice only 37–44% of the time.
- **Its tie-breaker is worse than Forge's own judgement.** The other 56–63% of its overrides swap Forge's answer
  for a candidate that neither Forge nor search-v2 preferred.
- **The outlet policy did not make up for it.** D310's outlet policy is the one thing the distilled seat has that
  Forge Default lacks.
- **So the policy as trained costs a little.** A "never override" version would be Forge plus outlets, which is
  probably about even with Forge.

This is a reading, not a pre-registered result.

## Speed

- **The rule's speed-up: 161.75×.** Search-v2's mean decision time over the held-out test decisions was 826.8 ms.
  The distilled seat measured 5.11 ms a decision live in the match against search-v2: p 6.88, a 0.59, b 1.24 ms.
- **Inside the same match: 175×.** Search-v2 there took 896.3 ms.
- **Against Forge Default:** 7.93 ms a decision.
- **What the time is:** almost all of it is search-v2's own candidate generation (Forge's AI asked about every
  playable spell). The model's arithmetic is microseconds.
- Speed was never the question. Strength is.

## Run

- **Pilot:** 17:49 → 17:54, about 6 min. Every check passed: the six pilot games ended, 272 rows were exported, a
  model was trained, and both 8-game matches were complete.
- **Rows:**

  | Cube | Block | Time | Median game |
  |---|---|---|---|
  | Vintage | run1 | 17:54 → 18:43, 49 min | 28.7 s, one timeout counted as a draw |
  | Evan's cube | run2 | 18:43 → 19:29, 46 min | 28.0 s |
  | Synergy | run3 | 19:29 → 20:50, 81 min | 48.1 s, one engine error, one timeout |

  That is 1,800 search-vs-search games in 2 h 56 m, **about 614 games/h** on 7 workers. It was faster than the
  estimate (J115's 51 s a game): lab games are short, 15–17 turns.
- **Training:** run4, 14 s.
- **Match against search-v2:** run5, 20:50 → 22:02, 71 min for 1,200 games, about **1,010 games/h**.
- **Match against Forge Default:** run6, 22:02 → 22:18, 16.5 min, about **4,360 games/h**.
- **Verdict and summary:** run7, 14 s.
- **Total 4 h 30 m**, against an estimate of 6–9 h.
- **Resources and conditions:** peak 1.07 GB a worker (2 GB declared). 0 engine errors and 0 timeouts in the
  matches. No memory-pressure events. **Justin was not using the PC**, and no other heavy job ran beside it.

**One defect in the job file** (the PC session wrote it). Its `collect:` named `metrics.json` and `summary.md`. The
runner reserves both names for its own outputs, so it skipped them (`collect-skipped.txt`):
- The training report is complete inside the runner's `metrics.json`, as `mt.*`, and this summary reads it from
  there.
- The job's generated `summary.md` stays in the lab clone, at `var/ml/distill/J127/summary.md`.
- The runner's lint could flag a `collect:` of a reserved name. That is a small follow-up for whoever touches
  `tools/runner/lint.ts`.

## If B1 continues: suggestions, NOT pre-registered

Each of these would need its own job and rule, written before its data.
1. **Defer to Forge unless confident.** Override only when the model's top candidate beats Forge's answer by a
   probability margin tuned on the validation split. The table shows precision is the problem: 37–44% on
   overrides. A policy that rarely overrides cannot be worse than Forge plus outlets by much. Measure its precision
   at fixed override rates before any match.
2. **Train only on the decisions where search-v2 overrode Forge**, or weight them up (about 18% of rows, ~15,000).
   Then ask a narrower question: given that search-v2 leaves Forge's answer, which alternative? Combine it with a
   separate "override or not" head.
3. **Give the scorer Forge's own view of the candidates as features.** Use Forge's per-candidate evaluations
   (`AiPlayDecision`, Forge's card value of each target or attacker) and search-v2's rank order, not only the
   board. Or take search-v2's per-candidate rollout means as soft targets (the decision records, D347, already
   carry them) instead of only the hard pick.
4. **More rows.** The training-set fit is weak too (priority recall 11.5% even on training rows), so more of the
   same rows alone is unlikely to be enough. Use more rows only together with 2 or 3.
5. **For the live hint**, none of this is needed: the hint already runs the real search in a few seconds (D429).
   A distilled policy matters for lab throughput, where Forge Default is already the fast choice. Until a variant
   beats Forge Default, Forge Default stays the lab's fast policy.

Never "the distilled policy is no worse than Forge Default": its interval against Forge Default includes 0.5 with
the point estimate below it. And never "no better than search-v2" alone: it is shown **worse** than search-v2
(upper end 0.408).
