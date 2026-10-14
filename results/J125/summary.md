# J125 — search leaf weights (growth plan #3): eight coordinate steps tuned, one fixed match on held-out deals (D431)

Written by the PC session, 2026-10-14, from `selection.json`, the eight tuning files `search-v2-*.json`,
`match-J125.json`, `metrics.json`, `checks.txt`, STATUS and the step logs. Job 05:44:53 → 12:19:18 EDT (6 h 34 m,
pilot included), 7 workers, every pilot check (12) and every final check (7) PASS. **Pinned mtg-table@c74468e**:
the head of PR #140 (`pc/j125-leaf-weights`, D431), **which was not yet merged when the job ran**. So these games
were played on the PR's branch code exactly as posted.

## The rule and its verdict

**Pre-registered (job file, 2026-10-14 01:40, before any game):**
- *Tuning:* eight coordinate steps (×0.5 and ×1.5 on the leaf's life, hand, creature and other-permanent terms),
  280 games each (140 mirrored pairs) against search-v2 on the dev deck set, all on the same deals.
- *Selection:* the highest tuning score; ties go to the first listed; a best score of 0.5000 or less chooses none.
- *Confirmation:* ONE fixed D398 match of the chosen step against search-v2 (`search-v1-anytime`), 1,200 games
  (600 mirrored pairs) at the live 1.5 s budget, on the confirm deck set.
- *ADOPT* only if that match is complete and its 95% lower end is above 0.5. Otherwise NOT SHOWN.

**Verdict: NOT SHOWN. The current leaf weights stay.**
- The tuning chose **`search-v2-whand50`** (cards in hand at 50%) with 0.511.
- On the held-out deals it scored **0.492, 95% [0.477, 0.507], −5.8 Elo [−16.1, +4.5]**. The match was complete,
  1,200 of 1,200 games.
- The lower end is below 0.5, so it is not shown to help. The point estimate is on the wrong side, but the interval
  also includes 0.5, so it is not shown to hurt either.
- The runner's last two checks restate the rule and agreed with the verdict script (`v.adopt = 0`).

## Tuning (dev deck set, seed blocks 610,900,000–610,900,034, the same deals for all eight)

All eight matches were complete: 280 of 280 games each, 0 draws, 0 engine errors, 0 timeouts. No step was
incomplete, so the selection ran (`tuned: 8`).

| Step | Term, weight | Score | 95% | Elo [95%] | Wins / 280 |
|---|---|---|---|---|---|
| `search-v2-wlife50` | life ×0.5 | 0.475 | [0.445, 0.505] | −17.4 [−38.6, +3.7] | 133 |
| `search-v2-wlife150` | life ×1.5 | 0.500 | [0.474, 0.526] | 0.0 [−18.3, +18.3] | 140 |
| **`search-v2-whand50`** | **hand ×0.5** | **0.511** | **[0.482, 0.540]** | **+7.4 [−12.6, +27.6]** | **143** |
| `search-v2-whand150` | hand ×1.5 | 0.504 | [0.475, 0.533] | +2.5 [−17.7, +22.6] | 141 |
| `search-v2-wcreature50` | creatures ×0.5 | 0.500 | [0.460, 0.540] | 0.0 [−27.7, +27.7] | 140 |
| `search-v2-wcreature150` | creatures ×1.5 | 0.493 | [0.463, 0.523] | −5.0 [−25.7, +15.7] | 138 |
| `search-v2-wother50` | other permanents ×0.5 | 0.504 | [0.473, 0.534] | +2.5 [−18.8, +23.8] | 141 |
| `search-v2-wother150` | other permanents ×1.5 | 0.475 | [0.448, 0.502] | −17.4 [−36.2, +1.3] | 133 |

**Which step won, and by how much:**
- `whand50` won by 0.0071 (about 5 Elo, two games in 280) over `whand150` and `wother50`, which tied at 0.5036.
- Its own tuning interval already included 0.5.

**These scores are the selection's, and decide nothing on their own.**
- Every interval includes 0.5. The spread, 0.475 to 0.511, is what eight noisy draws around 0.5 look like at a
  standard error of about 0.015: the best of eight null steps would be expected near 0.52.
- So the winner's 0.511 was not evidence of a gain, and the confirmation was the test.
- Two steps came closest to being shown *worse*: life ×0.5 and other permanents ×1.5 (upper ends +3.7 and +1.3
  Elo). Halving life's value, or overvaluing lands and non-creature permanents, may cost a little. That is a
  reading of the tuning only, and it decides nothing.

## Confirmation (confirm deck set, this host's seed blocks 114,900,000–114,900,149; J115's deals)

| | |
|---|---|
| Match | `search-v2-whand50` (hash `edf02782b17a`) vs `search-v1-anytime` = search-v2 (`cdd55e02a89c`) |
| Games | 1,200 of 1,200 played, **complete**; 600 mirrored pairs; 0 draws, 0 engine errors, 0 timeouts |
| Wins | 590 of 1,200 |
| Score | **0.4917**, SE 0.0075, 95% **[0.4769, 0.5065]** |
| Elo | **−5.8**, 95% **[−16.1, +4.5]** |

Each side's searched decisions (p/a/b = priority plays, attacks, blocks), searched → changed Forge's answer:

| Side | p | a | b | All | Budget fallback | Other fallbacks |
|---|---|---|---|---|---|---|
| whand50 | 18,959 → 3,687 (19.4%) | 6,127 → 851 (13.9%) | 2,352 → 395 (16.8%) | 27,438 → 4,933 (18.0%) | 116 = 0.42% [0.30, 0.55] | rollout errors 59, unmappable 44 |
| search-v2 | 19,028 → 3,827 (20.1%) | 6,149 → 891 (14.5%) | 2,371 → 383 (16.2%) | 27,548 → 5,101 (18.5%) | 125 = 0.45% [0.33, 0.58] | rollout errors 57, unmappable 44 |

Halving the hand term barely moved how often the search overrules Forge: 18.0% against 18.5%, and slightly fewer
changed priority plays. The budget-fallback rates are the same within their intervals. A weight that changes
little of what the search does was always going to show little in the score.

## Run

- **J124 ran first.** The runner took it at 01:07, and it ran 01:07 → 05:45.
- **J125 ran 05:44:53 → 12:19:18 (6 h 34 m), in its estimate of ~6–7 h:**
  - Pilot: 05:45 → 05:55 (~11 min).
  - Tuning (run1): 05:55:39 → 10:18:57, 4 h 23 m for 2,240 games, about **511 games/h**.
  - Selection (run2): 14 s.
  - Confirmation (run3): 10:19:11 → 12:19:18, 2 h 00 m for 1,200 games, about **600 games/h**, J116's rate.
- **Resources:** 3,440 games in all (`j125_games`), 0 engine errors or timeouts (`j125_err` 0). 7 workers, peak
  1.19 GB a worker (2 GB declared), 0 memory-pressure events.
- **The PC was in other use for most of the tuning.** The GPU scenery lane ran until about 10:40, which likely
  explains why tuning ran at ~511 games/h against the confirmation's ~600. Justin did not play during the job.
  - The mirrored deals put any slowdown on both sides of every pair alike.
  - All eight steps share the same deals, and each step's games ran in one sitting, so the slower hours fell on
    every step alike and do not favour any one of them.

## What it means for the growth plan

- **#3 is done: the current leaf weights hold.**
  - No single ×0.5 or ×1.5 step on the four big terms showed a gain.
  - The step the tuning split liked best (cards in hand at 50%) scored below 0.5 on held-out deals. Its win on the
    tuning split did not carry over: a winner's-curse pick, as the job's hypothesis warned.
  - In plain terms, no evidence here that the leaf is mis-weighted by a margin a 600-pair match can see (about
    ±10 Elo). That fits D412/J115's picture: search-v2's remaining gains are small.
- **If weights are revisited:**
  - Single-term steps at ×0.5/×1.5 look flat to within ±20 Elo.
  - A further try would need a different shape: the life curve's breakpoints, or the margin rule rescaled with
    the leaf. It would also need far more games per candidate, which this plan does not ask for.
- **PR #140 (D431):**
  - The mechanism is harmless at its default: bit-identical leaf, search-v2's hash unchanged.
  - It is the only way to run a weights job again.
  - Merging or closing it is the cloud's call. If it is closed, the eight `search-v2-w*` ladder names and their
    games stay in this result only.

Never "no gain": the confirmation's interval [0.477, 0.507] includes 0.5. The step is **not shown** to help, and
not shown to hurt.
