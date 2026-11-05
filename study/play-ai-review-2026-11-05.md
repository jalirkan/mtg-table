# Play-AI review (2026-11-05): what we have, what has paid, what the goal is, what is left on the table

Justin's question: "a comprehensive analysis on what we have, our methods, our goals, and potential/optimization
we're leaving on the table." A read-only pass: no engine, no lab night, no training. The tables and the five
scripts that made the new numbers are in `study/play-ai-review-2026-11-05/` (`tables/`, `bin/`; each script runs
in seconds over files already on disk). Every number names its source; anything I could not source says
*hypothesis*.

**Answer in five lines.**
1. **All the measured strength is the search's one-step lookahead over Forge**, about **+60 to +80 Elo** over Forge
   Default. Since the anytime loop (+9), every addition we measured landed between −80 and +9 Elo, and none was
   adopted.
2. **The search is short of samples, and the leaf hardly matters.** It plays 2–3 rollouts per candidate. At that
   count its options sit about one standard error apart, so a better win predictor cannot show. Whether more
   compute buys strength is the most important number we have never measured.
3. **Our two learned models learned the wrong thing for the job.** The evaluator predicts who wins but orders
   moves no better than the hand leaf. The distilled policy learned to copy Forge.
4. **Large data sets sit unused.** 76,000 recorded lab games were never encoded. The evaluator has never been
   scored on your 14 games, and the hint never checked against them. No model has read an atlas label.
5. **The atlas has answered its question.** Measured as labels per hour it is now the lab's most expensive
   product, and nothing consumes it. I recommend pausing it for two measurement nights, below.

---

## 1. The goal as a number

**(a) Strength: Elo over forge-default at the live 1.5 s budget, on the confirm set (34 deck pairs).**

| what | score [95%] | Elo [95%] | source |
|---|---|---|---|
| search-v1 (outlets + search) vs forge-default, 600 pairs | 0.603 [0.582, 0.625] | **+72.9 [+57.5, +88.5]** | J101, `match.jsonl` |
| search-v1 on Reckless vs forge-default, 600 pairs | 0.623 [0.602, 0.645] | +87.5 [+71.6, +103.8] | J101 (the profile itself: SPRT H0, 0.501 at 808 games) |
| search-v2 (= v1 + anytime) vs search-v1, 1,200 pairs | 0.513 [0.504, 0.523] | +9.3 [+2.5, +16.0] | J102, D412 |
| search-v2 vs Forge, random census decks, sides swapped | 0.589 [0.580, 0.598] | **+62 [+56, +69]** | J141 read 4 (3,970 deck-games; Elo is my conversion) |

So search-v2 sits at roughly **+60 to +80** (a 59–61% win rate against Forge). Two caveats:

- **Search-v2 has never been measured against forge-default on the confirm set.** +82 is a chain of J101 and J102.
- **The search has changed underneath since the last ladder line (2026-10-17).** The fixes found by the atlas
  changed the copier and the determinizer, and the search's rollouts run on both (D474, D477, D479, D493, D497,
  D498, D500; each names the search's rollouts). D498 says search results from before and after it "are not pooled", and nothing has been re-measured
  since.

The rollouts model the opponent as Forge Default (D312). Against Forge that is an exact opponent model. Against
you it is not, so the Elo above is not a strength against people (*hypothesis*: nothing measures that). Your record
against search-v2 is 1 win in 9 cube games (`var/ml/human/manifest.json`), far too few to read.

**What a target would take.** +100 Elo is a 64% win rate against Forge, and +150 is 70%. From about +70, +100
needs +20 to +40 more. Since 2026-10-07 every tuned or learned addition measured between −80 and +9 Elo (table in
§3), so +100 needs a structural lever, and §5 tests the cheapest one first. +150 would take a learned prior or
value that captures what the search finds. Nothing we have trained so far has done that (§3b, §3c).

**(b) Coaching quality on your own games.** The human test set is **14 games: 1 won, 13 lost**
(`human_collect.py --status`). Ten are against search-v2 (9 cube drafts and 1 Pacho vs Doom), and four are the
early Pacho games. Beside them are 2 seats of a game between two people. The last game is from 2026-10-17. What
it measures today: nothing, because `human_eval.py` has never been run. Its pre-registered `FIRST_CHECK` (D369)
waits for 30 games, and it scores the win-chance strip's calibration, not advice. The hint itself (D429, a 3 s
search) has never been scored against anything. The only grading of your play is J132's leak report:

- 7 games (one of them against a friend) and 103 graded decisions;
- 5 mistakes and 0 leaks;
- mean full-game regret on the 63 deep-graded decisions: 0.039 (my read of `results/J132/decisions.jsonl`; the
  deep grading picks decisions likely to matter, so this is not comparable to Forge's 0.021).

A coaching number needs about 16 more of your games. One small job (J132's machinery: 7 games cost 54 minutes
on 6 workers) would then score the hint's pick against deep full-game truth on your decisions.

**The one-line choice:** *"Beat Forge by more"* means the runner's nights go to fixed matches. *"Help me play
better"* means you play about 16 more games with the hint on, and the runner spends an hour grading them. The two
do not compete for the same resource.

## 2. Inventory

Long form in `tables/`. Sizes are measured. "Consumed by" means a job that read the data.

| data set | size | trust | consumed by |
|---|---|---|---|
| Queue nights 1–3 recordings → `var/ml/data/nights-1-3` | 119,816 games, **19,517,006 rows**, 12,670 features, 1.7 GB; nights 1–2 moved to the cold drive (`archive/cold-night-1.json`) | Forge-vs-Forge, ~15% exploring on night 3 (D358), reserved decks dropped; within-game residual correlation **0.764**, design effect 146: the 2.04M test rows are worth **~14k independent outcomes** (J092 `v2-curve.txt`) | evaluator v1/v2, the ensemble, gates 1–2, the coach's win chance (D361), J131/J139 |
| Queue nights 4–5 recordings | **75,988 games** (37,994 on night 4, `queue-night-5-stats/night-4.json`), both chairs, 6.1 GB on night 4, profile mix Default/Reckless/Cautious, 15% exploring | the same pipeline, never encoded | **nothing** (no dataset exists, `var/ml/data/`) |
| Gate 2 truth tables (J050) and rankers | 291 decisions, 232,029 playouts; hand and eval rankers at 3 and 12 rounds | per-decision truth reliability median **0.06**, 90% of option pairs within 1.96 SE (J100) | J051, J081, J097/J100, J068 |
| Gate 1 turn-end rows | 27,628 positions, 1,500 held-out games | Java rebuild of the leaf's own positions | J092; this review (`leaf-within.md`) |
| r17 and 17Lands | 85,436 rows; 17Lands Powered Cube file (266,117 games), 338 MB | human games, a reduced schema | J063 (outside exam PASS), J113 (calibration PASS, `coachUse` 0) |
| Distill rows (J127) | 83,460 searched decisions from 1,799 search-v2-vs-search-v2 games, 172 MB | the target is the search's argmax only, with no per-option values | J127 (NOT SHIP) |
| Decision records (D347) in every lab and bench recording | every AI decision, with per-option search statistics when a search seat played | for Forge seats the record is Forge's choice | `policy_data.py`, run once on j048-bench (2 MB) |
| Atlas label files (`report/labels.json`) | 16 files since J158: **1,218 labels, 347 confident**, 395 partial; D508 population (J186–J191): **115 confident on 281.3 worker-hours** | six seat populations, never pooled (D486–D509); random-continuation values | the two atlas reviews and the nightly reads; **no model** |
| Atlas branch logs | **826k branch games**: 111 GB random-continuation, 5.0 GB Forge-map (≈39k games), 43 GB rows, ledgers and baselines (`tables/branch-census.md`); `lab/data` holds 214 GB in all | stamped `notForTraining` (D451) | the checker and the seat-fault hunt only |
| Ladder results | 11 fixed matches, 5 SPRTs (`tables/ladder.md`); recordings dropped as deck-set games (D340) | the judge | the decisions D412, D414 and D437 |
| Human test set | 14 games and 2 friend seats | your seat's own redacted log | J132 (leaks); **never `human_eval`** |
| Rollout labels (D382) | built, **never run** | — | — |

**Never used by anything:** the 76k games of nights 4–5, the D382 producer, `human_eval.py`, every atlas label as
a training or benchmark target, and the per-option search statistics in the decision records of search-piloted
games.

## 3. Methods, judged by results

### 3a. Where search-v2's strength comes from, and whether compute buys more

| addition | Elo [95%] vs its base | source |
|---|---|---|
| the search over Forge (v1, outlets included) | +72.9 [+57.5, +88.5] | J101 |
| anytime loop (budget fallbacks 5.6% → 0.7%) | +9.3 [+2.5, +16.0] | J102 |
| opening-hand search | −5.8 [−17.4, +5.8] | J115 |
| target search (confirmation) | +2.2 [−3.0, +7.4] | J116 |
| hand-leaf weight step | −5.8 [−16.1, +4.5] | J125 |
| learned evaluator at the leaves (confirmation) | +2.2 [−4.7, +9.0] | J139 |
| distilled policy in place of rollouts | −80.1 [−96.1, −64.5] | J127 |
| attack rollouts one turn deeper; LCB override; Reckless base | H0 at 0.502, 0.507, 0.487 | `sprt.jsonl` |

The rest is fixed by the budget. A searched decision takes 907 ms and plays about **14–16 rollouts** (J139:
1,600,784 evaluator leaves over 110,800 decisions, one leaf per unfinished rollout; J131: 16.2), at roughly 63 ms
each.
Against up to six candidates (D312), that is **2–3 rollouts per candidate**. The search's own noise report agrees
(J068 §3):

- 42% of its picks overlap the runner-up's interval;
- in 18% the pick is more likely the worse of the two.

**Evidence that compute buys more:**

- **Anytime, +9 Elo.** Its gain came from deciding the 5% of decisions the old loop handed back to Forge.
- **12 rounds against 3 on gate 2's set.** The picks flip on 4.4% of decisions, and regret(3) − regret(12) is
  +0.001 [−0.000, +0.003] a decision (J068).
- **What that per-decision gain could be worth.** About 23 decisions are searched a game (J139). If the
  per-decision gains added up, which is a *hypothesis*, +0.001 would be about +0.02 in score, or +16 Elo, and the
  upper end, 0.003, about +50.
- **No ladder match has ever been played at another budget.** The default hint already runs at 3 s, twice the
  seat's budget (D429).

### 3b. Why an evaluator trained on 19.5M positions could not beat the hand leaf

The facts:

- **It predicts outcomes much better.** On turn-end positions its log-loss is 0.518 against the hand leaf's
  0.600, and it is better in every turn band (`tables/leaf-within.md`; gate 1 B: +0.083 [+0.067, +0.098], J092).
- **It does not order moves better.** On gate 2 its pairwise accuracy is 0.680 against 0.711, a difference of
  −0.031 [−0.067, +0.004]. On spells it is −0.077 [−0.158, −0.002] (J100).
- **In play it is worth +2.2 [−4.7, +9.0] Elo.** It changed 23% of Forge's answers, against the hand leaf's 18%
  (J139).

**What I measured (`tables/gate2-within.md`, `tables/leaf-within.md`):**

1. **Both rankers are inside their own noise.** At gate 2's 3 rounds the options' spread inside a decision is
   about 0.9 SE (spread/noise is 0.46 for the hand leaf and 0.47 for the evaluator). The full-game truth itself is
   mostly noise: within-decision reliability has a median of 0.06, and it exceeds 0.5 on only 27% of decisions.
2. **The evaluator's extra information is partly between games.** 48% of its score's variance is between games,
   against 35% for the hand leaf. That part, deck and matchup strength, cancels inside a decision.
3. **It is not blind within a game.** Its turn-to-turn moves point toward the eventual winner 53.1% of the time,
   against 49.7% for the hand leaf: +0.034 [+0.030, +0.038] over games. Its pooled within-decision correlation
   with the truth is 0.57, against 0.47.

**Hypothesis, supported by 1 and by §3a:** the search is noise-limited. At 2–3 rollouts per candidate, the
difference between two leaves is smaller than the rollout noise both of them read. The training target makes it
worse: a single game outcome per game under Forge-vs-Forge play, so the 19.5M rows are about 120k independent
bits. It also explains the spell stratum: a better leaf only pays once the rollouts are precise enough to show the
difference. Point 3 rules out the simpler story that the evaluator "only knows the decks".

### 3c. Why the distilled policy lost 80 Elo

It was designed to replace about 900 ms of rollouts with a model of about 5 ms (D435). It learned to **copy
Forge** (J127):

- its held-out agreement with search-v2 was 0.824, against 0.823 for "always play Forge's answer";
- it recovered 9–19% of the search's overrides;
- 37–44% of its own overrides matched the search's choice.

Its target was the argmax of 2–3 noisy rollouts per candidate (J068 puts an average 18% chance on a search pick
being the worse of the top two), on features that see the board and not the rollouts. The model took the 82% of
answers that are Forge's and made coin-flip changes elsewhere. The result was −10.4 [−24.4, +3.6] against Forge itself, and against search-v2 a
Forge-strength score. The lesson for any later policy: **train on the per-option values, not on the pick.**

### 3d. What the atlas taught beyond its labels

- **"Forge is rarely wrong when it leads at 50" holds out of sample.** The October review found 3 confident of 77.
  Since then the futility controls have ended confident **4 times in 132** in the label files (3%, Wilson
  [1.2%, 7.5%]; `tables/atlas-agreement.md`; J186's 0 of 13 is outside them).
- **The random map and the Forge map disagree.** They name the same best option 0.46 of the time over 515
  decisions, with a mean rank correlation of 0.18 over 433 (nightly reads, pooled across seats; a description, not
  an estimate). A random-continuation label is "best if both players then play at random". It does not stand in
  for "best against Forge or against you".
- **It found faults.** About 50 of the 62 decisions D451–D513 are atlas, seat, fork, copier or checker faults (my
  count by title). Some improve the search's own rollouts (the copier and the determinizer, above). D511 found that recording a game
  changes it.

**Yield against cost:**

- **Yield.** The D508 population gives 0.41 confident labels per worker-hour, about 28 per 7-worker night. The
  October review projected about 46 with its two cuts, both since adopted (`tables/atlas-nights.md`).
- **Disk.** About 10 GB a night.
- **Runner time.** Since J142 (2026-10-19) nearly every runner night has gone to the atlas. Of 39 atlas jobs, 4
  ended `done`, 32 `failed` and 3 `aborted` (`ledger.jsonl`). Most failures were strict checks, and the labels mostly survived.

## 4. Left on the table: tested against the evidence

| idea | verdict | why |
|---|---|---|
| **More compute per decision** (budget, or parallel rollouts on the PC's 16 threads) | **Real, unmeasured; the top test** | 2–3 rollouts per candidate; the anytime gain; 12 vs 3 rounds pointing the same way (§3a). Parallel rollouts conflict with D312's "no thread of ours" and need a written decision. |
| Self-play (search vs search) as the data generator | **Not now for the value model; necessary later for a policy** | The leaf is not the bottleneck (§3b). Cost: 46 s a search-vs-search game per worker (J139: 4,800 games in 8.8 h on 7 workers) against Forge's 4.1 s (night 4). That is about 5,000 games a night against 38,000, or about 22 nights to match nights 1–3's game count. |
| The evaluator to truncate rollouts | **Not real at this horizon** (*hypothesis*) | Rollouts already stop at the end of the turn. The week-3 smoke's apply-only prior cost about 69 ms a candidate against 73 + 8 ms for a full rollout (`search-week3.md`), so time goes to Forge's choices and the copy, not depth. A deeper horizon with an evaluator cutoff is worth testing only if compute pays (attack rollouts one turn deeper: H0). |
| The distilled policy to order candidates (D389, `rank=prior`) | **Weak as trained; worth it only if compute pays** | Recall of the search's overrides was 9–19% (J127). Ordering acts on the ~8% of decisions with more than 6 candidates (25 of 324, week-3 smoke). What could pay is concentrating 14 rollouts on 2–3 candidates, which needs a better prior (§5 #5). |
| The atlas's per-option values as the fixed benchmark | **Not real for strength** | They are random-continuation values (same best as the Forge map 0.46, ρ 0.18). 115 confident items cannot resolve the 0.002–0.004 per decision that separates players 30–70 Elo apart. Gate 2's realised MDE was 0.0077 even with Forge-continuation truth (J081). Use fixed matches to judge, and decision sets only to diagnose. |
| The GPU (GTX 1080, idle for the lab) | **Not the bottleneck** | v2's whole search trained in 1.7 h on 4 CPU workers (6,261 s, 51,545 parameters; J092). A leaf costs 123–158 µs in Java (J131, J139). Data generation is CPU-bound Forge. It matters only at #5's scale with a bigger network. |
| Branch games for training | **Random branches: no. Forge-map branches: a different case, too small** | Random-vs-random play after a forced move is off every distribution we play. The ≈39k Forge-continuation branches are exactly "a non-Forge move, then Forge play", which is the leaf's question, but they hang off only ~515 base decisions, 40 correlated branches each. |
| The October label-yield levers not taken (k ≥ 4: +13–15% [−5, +41]; skip turns 1–8: +15% [−2, +40]; the screen exemption: ~+5%) | **Moot until a label has a consumer** | They raise the yield of a product nothing reads. |
| *Mine:* nights 4–5's 76k idle games | **Real, cheap, for the coach's win chance only** | More data still helps the evaluator: doubling the training pairs lowered test log-loss by 0.0093 [+0.0061, +0.0123] (J092 curve). That is a better win-chance strip, not strength. |
| *Mine:* the measured search is not today's search | **Real** | Seven copier and determinizer decisions since the last match (§1). |
| *Mine:* perfect information barely helps (the oracle) | **Weak signal** | Search with the real hidden cards: SPRT H0, 0.475 at 40 games, before the 100-pair floor (D373). Determinization is probably not the ceiling (*hypothesis*). |

## 5. A ranked plan

Matches follow D398: fixed size, mirrored pairs on the confirm set, read from the match line alone. 1,200 games
give an interval about ±15 Elo wide, and 4,800 games about ±7. Costs come from J101 and J139 on 7 workers:
search vs Forge at about 600 games an hour, search vs search at about 550 (46 s a game a worker); a side thinking
6 s stretches a search-vs-search game about 2.5×.

| # | what | cost | judged by (pre-registered) | depends on | kill |
|---|---|---|---|---|---|
| **1** | **Re-anchor today's search-v2**: search-v2 (current main) vs forge-default, 1,200 games | ~2 h, part of a night | Score and Elo with the interval; no verdict. It is the baseline for #2 and the strength number in §1. | — | — |
| **2** | **The compute curve**: `search-v2-ms6000` and `-ms3000` (two new ladder names, the budget the only change) vs search-v2, 1,200 games each | ~5.5 h + ~3.3 h; with #1, **one long night (~11 h)** | COMPUTE PAYS if ms6000's lower end is above 0.5 and its point is ≥ +15 Elo. COMPUTE DOES NOT PAY if its upper end is below +20 Elo (0.529). Otherwise inconclusive: confirm with 4,800 games. | a players.json lane (small) | DOES NOT PAY closes #4 and #5's ordering arm |
| **3** | **The coaching number**: you play ≥16 more games with the hint on; one job grades your decisions deep (J132's settings) and scores the hint's pick against that truth; `human_eval` FIRST_CHECK at 30 | your games; ~2 h of the runner; a small scorer lane | the hint's mean regret below yours, paired by game, interval above 0; FIRST_CHECK as written (D369) | games | the hint not better than you: the hint is not a coach, stop presenting it as one |
| 4 | If #2 pays: **parallel rollouts** (or a faster copy), aiming for 4× rollouts at 1.5 s | a lane of 2–4 days + a written decision on threads (D312, hard rule 3's accounting) + 1.5 nights of matches | fixed 1,200 then 4,800 against search-v2 | #2 PAYS | measured speed-up below 2.5× rollouts a decision, or the confirmation's upper end below +10 |
| 5 | If #2 pays: **a prior from per-option values** (expert iteration, step one): 2–3 nights of search-v2 self-play with decision records (~10–15k games), a prior trained on the per-option win estimates, then search-v2 with prior-pruned candidates | 3 nights + a lane + 1.5 nights | pre-check before any match: held-out top-2 recall of the search's pick ≥ 0.80 and top-1 ≥ 5 points over always-Forge; then fixed matches | #2 PAYS | the pre-check fails (J127's 82.4 vs 82.3 is the warning) |
| 6 | The built, never-matched knobs: `rollout=outlets` (D390) and `rank=prior` (D389) | one night for both | fixed 1,200 each | — | both NOT SHOWN closes the knob track |
| 7 | Evaluator v3 over nights 1–5, **for the win-chance strip only** | ~1 night of CPU | D364's `eval_compare` against v2 on the same pairs; `human_eval` at 30 games | — | not better on compare |

*Note, 2026-11-05 (D514): the arms as played are `search-v2-ms3000-r24` and `search-v2-ms6000-r48`, the budget AND the 12-round cap scaled together. The budget alone bought 1.41× the time and ~15% more rollouts, because the race and the round cap end most decisions before the deadline (D514's pilot and census); the scaled arms play 1.75× and 3.07× search-v2's rollouts. The rule above is unchanged and applies to the r48 arm.*

**The atlas meanwhile: pause it.** Its question ("what would we gain from random play?") is answered:

- the random map does not stand in for the Forge map;
- Forge almost never loses a decision it leads at 50 branches.

No model reads its labels, and its yield levers do not matter until one does. #1 and #2 also run the copier and
the determinizer at scale (over 1.6M rollout copies on one side of J139 alone),
so the main side benefit, fault-finding in the code the search shares, continues. Two exceptions are your call:

- **if you want the random-map catalogue to keep growing as a study in itself:** one night a week, on the
  frozen seat;
- **if the seat queue (8 rows) lands:** one night after the landing, to confirm the new population is clean.

Neither should outrank #1 and #2.

## The ten numbers

1. Search-v2 ≈ **+60 to +80 Elo** over Forge Default (J101 +72.9 [+57.5, +88.5]; J141 +62 [+56, +69]); never
   matched directly on the confirm set; no ladder line since 2026-10-17.
2. Every addition since the anytime loop: −80 to +9 Elo; none adopted.
3. **14–16 rollouts a decision, 2–3 a candidate**, ~63 ms each; 42% of picks inside the runner-up's noise (J068).
4. No match at any budget but 1.5 s; 12 vs 3 rounds: +0.001 [−0.000, +0.003] regret a decision.
5. Evaluator v2 predicts better (turn-end log-loss 0.518 vs 0.600) and orders worse (pairwise 0.680 vs 0.711);
   both leaves' option spread ≈ 0.9 SE; truth reliability 0.06.
6. 19.5M rows ≈ 120k outcomes (design effect 146); more data still helps (−0.0093 from doubling).
7. Distilled policy: agreement 0.824 vs always-Forge 0.823; −80 Elo vs search-v2, −10 vs Forge.
8. Idle: 76k recorded games (nights 4–5), D382, `human_eval`, every atlas label.
9. Your games: 14 (1–13), last on 2026-10-17; 103 graded decisions, 5 mistakes, 0 leaks; the hint never scored.
10. Atlas: same best 0.46, ρ 0.18 against the Forge map; futility controls 4 of 132; 0.41 confident labels a
    worker-hour; 214 GB; 4 of 39 atlas jobs `done`.
