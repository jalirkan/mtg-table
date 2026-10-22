# J149 — the deck census, night 2 (D447, D450): summary

Written by the PC session, 2026-10-22, from `confirm.md`/`.json`, `spectrum.md`/`.json`, `cards.tsv`, `counts.json`, `record.json` and each band's `census-play.json` (under `/home/justin-a/code/lab/data/lab-j144/`); J149's checks, metrics, STATUS, `events.jsonl` and step logs; J144's and J147's STATUS and logs; the heartbeat; and the job file (J144's, re-posted).

**A confirmation job: 12 of 12 candidates HOLD.** The runner marked it **failed** on one check, a rounding tie in the read's cross-check (below). No verdict depends on it.

## The verdicts (D447 point 9, registered 2026-10-19 23:20 UTC, before any night-2 game)
"Holds" means night 2's 95% deck-clustered bootstrap interval, on night 2's data alone, excludes the null in night 1's direction. **No multiple-comparison correction was registered or applied**: each verdict stands on its own. The pooled row is information, not the verdict.

| band | (i) 1 colour > .5 | (ii) 4 colours < .5 | (ii) 5 colours < .5 | (iii) mono − < .4 share > 0 |
|---|---|---|---|---|
| pauper | .577 (.564–.590) | .412 (.394–.429) | .381 (.333–.429) | +.195 (.170–.217) |
| peasant | .609 (.597–.622) | .394 (.381–.409) | .360 (.331–.389) | +.228 (.210–.248) |
| legacy | .611 (.597–.623) | .405 (.392–.419) | .365 (.343–.389) | +.219 (.200–.239) |
| powered | .586 (.572–.601) | .419 (.405–.434) | .390 (.369–.414) | +.179 (.158–.199) |
| night 1, four bands | .574–.599 | .393–.415 | .341–.400 | +.179–.210 |
| pooled (info) | .575–.604 | .394–.417 | .363–.380 | +.187–.219 |

- **(i), (ii) and (iii) each hold in 4 of 4 bands.** The bound nearest its null is pauper (i)'s .564, which clears it by .064.
- **What moved most:** the five-colour cells (powered +.049, peasant −.040). Every cell outside the five-colour column and (iii) is within .02 of night 1.
- **(iii)'s joint deck bootstrap** (information) is within .003 of the verdict interval in every band.
- **Expected failures by chance.** Suppose all twelve are true at night 1's estimates, with night 1's interval widths as standard errors. The expected number of not-shown verdicts is then **0.00015**, about one night in 7,000. Nearly all of it comes from pauper's five-colour cell (night 1 z = 5.6 from 56 decks; night 2 drew 30). Twelve of twelve was the expected result.

## The read's check, and why the runner says failed
- **The line:** `J149: failed (check: cf.check.estimatesEqual == cf.check.cellsCompared (51 vs 52))`. 23 of 24 final checks pass, and all 33 pilot checks pass.
- **The cell is pauper, colours with 3+ spells = 5.** Both readers have 30 decks and 183 wins of 480 decisive games, which is exactly 0.38125. census-read's `Math.round(x * 1e4) / 1e4` rounds the half up to **0.3813**. confirm.py's `round(x, 4)` sees the double 0.381249999… and gives **0.3812**.
- **It is a rounding tie:** the two are 0.0001 apart on identical counts. The verdict uses census-read's interval (.333–.429) either way. Night 1's self-test had no exact half, so it passed 52/52. Next time, compare counts, not rounded rates.
- **Intervals:** all 52 are within 0.02. The largest gap, **0.0055**, is in pauper's main share 0.9–<1.0 (91 decks; .5003–.5695 against .4962–.5750), which is not a candidate cell. Re-running the read in a scratch folder reproduced 51/52 and 0.0055.

## The run (EDT)
Night 2 was played across two jobs. census-play resumes by game, so the 80,000 are exactly the planned seeds.
- **J144** (10-21) aborted 13 s after its 15:42:22 start on `data_free_gb < 50` (= 0). The data folder did not exist, and the metric read the missing path as 0. The folder was created and the file re-posted as J147.
- **J147** (pin 60252b3, 5 workers). The pilot passed at 16:43 (self-test 12/12, 52/52, gap .0047), and pauper ran from 16:45.
  - **18:29:** stopped for the atlas at **8,706** games. The heartbeat's "~7,400" was an estimate; the resume line says 8,706. The runner put it back at 18:31 on 4 workers beside J146's pilot.
  - **19:39:** interrupted at 12,891, the minute J146 was OOM-killed. It restarted twice, then was held at 14,310 from about 19:57 while the atlas ran.
  - **00:12:** resumed on 5. Pauper was complete at 01:17. It stopped at 01:19:52 with 272 peasant games and was withdrawn for J149. J147's total: **20,272 games**.
- **J149** (max_workers 7). The pilot passed 01:24–01:25: the decks were redrawn byte-identical and the 48 pilot games re-read. It sized to **6 workers** by memory (21.4 GB budget, 3 GB declared a worker), so the GPU lane's stop at 03:43 did not raise it.
  - **Peasant from 01:25.** It stopped cleanly at about 02:20 at 6,958 games (27,006 recorded with the pilot's; heartbeat 02:24) for Justin's Windows reboot for the RTC fix. Linux booted again at 03:33.
  - **03:36:** resumed on 6. It dropped to 5 at **03:50:09** (swap-in 2,054/s, job 10.1/21.4 GB) and went back to 6 at **03:56:57**.
  - Peasant finished at 05:09. Legacy ran 05:09–07:07 and powered 07:07–09:06. The read ran 09:06:22–09:06:36.
- **Play time:** about 10 h 40 m (J147 4 h 17 m, J149 6 h 25 m), inside the job's 10.5–12.5 h. `elapsed_s` 19,838 counts from 03:36 only.

| band | games/h (last session) | workers | mean turns | first player won | decisive / drawn / timeouts |
|---|---|---|---|---|---|
| pauper | 5,332 (5,690 games, J147) | 5 | 22.7 | .506 | 19,982 / 18 / 16 |
| peasant | 8,458 (13,042) | 6 | 19.2 | .520 | 19,982 / 18 / 12 |
| legacy | 10,215 (20,000) | 6 | 16.7 | .537 | 19,975 / 25 / 6 |
| powered | 10,071 (20,000) | 6 | 16.5 | .534 | 19,974 / 26 / 4 |

- **Against night 1** (5 workers, unrecorded: 5,203 / 8,186 / 9,467 / 9,156): per worker, recorded play at 6 workers was 8–14% slower, and pauper at 5 was 2% faster. The worker counts differ, so this does not measure D450's ~4%.
- **Errors.** Engine errors: 0. Timeouts: 38 (1,600 allowed). Five games ended as draws on an in-game Java exception (`error` set, `engineError` null): 1 in pauper, 4 in legacy.
- **Peak worker RSS was not measured on J149** (STATUS gives the declared 3.00 GB). J147 measured 2.01 GB.

## Decks
Seeds 1501–1504, 2,500 decks a band. Every deck is 40 cards, castable, and played exactly 16 games. **Rejections: 0**, and 0 new makeups, in every band. The cross-band slice is 10%: 2.41 / 2.30 / 2.26 / 2.34 cross cards a deck.

| band | prior k = 1…5 | colours with 3+ = 1…5 | share < .4 / mono |
|---|---|---|---|
| pauper | 514/510/523/484/469 | 656/797/697/320/30 | 284/532 |
| peasant | 501/522/479/502/496 | 582/695/698/421/104 | 393/505 |
| legacy | 468/506/494/526/506 | 544/660/660/485/151 | 433/475 |
| powered | 530/479/528/502/461 | 596/663/665/438/138 | 402/538 |

## The spectrum (reported, not confirmed)
Colours with 3+ spells, bins 2 and 3: .518/.452, .528/.466, .536/.473, .533/.466 (about ±.012). Main-colour share of pips:

| band | < .4 | .4–.5 | .5–.6 | .6–.7 | .7–.8 | .8–.9 | .9–<1 | mono |
|---|---|---|---|---|---|---|---|---|
| pauper | .391 | .438 | .486 | .501 | .533 | .529 | .535 | .586 (.572–.601) |
| peasant | .385 | .435 | .479 | .500 | .549 | .563 | .597 | .612 (.598–.626) |
| legacy | .398 | .420 | .479 | .525 | .541 | .558 | .600 | .617 (.602–.632) |
| powered | .411 | .442 | .476 | .524 | .522 | .553 | .561 | .591 (.576–.605) |

Half-widths: about ±.015 at the ends, ±.02–.025 in .7–.9 and ±.035–.045 in .9–<1. The two dips (pauper .7–.8 → .8–.9, powered .6–.7 → .7–.8) sit inside overlapping intervals. The prior's k tables are in `spectrum.md`.

## Cards (`cards.tsv`: 4,263 rows; reported, not confirmed)

| band | in-band rows | median deck-games (min) | cross / fill rows |
|---|---|---|---|
| pauper | 423 | 2,192 (1,680) | 398 / 7 |
| peasant | 399 | 2,080 (1,376) | 917 / 43 |
| legacy | 613 | 1,568 (992) | 420 / 0 |
| powered | 645 | 1,504 (816) | 398 / 0 |

No top or bottom list is a finding, and none is given.

## The record (D450, rows mode)
- **Rows a game:** 75.3 / 59.2 / 50.8 / 50.1 KB, 58.9 KB overall, about 30% over the job's 45 KB. **One legacy game wrote 13.6 MB**, while no other band's largest passed 414 KB; it is worth a look. Ledger lines: 2.0 / 1.8 / 1.6 / 1.6 KB.
- **Checks:** all 80,000 games were recorded, with 0 problems. 3,601,677 rows were checked in 54 files, with 0 problems. The leak check ran 28,250 times and found **0 leaks**. The own-hand controls moved in 26,662 of 27,026; the check does not count a control that stayed still as a problem.
- **Storage:** `lab-j144` holds **4.93 GB** (rows 4.71 GB, ledgers 0.14 GB), against ~3.7 GB estimated. 735.5 GB was free at the end.

## Inputs for the next phase
The inputs are 80,000 games of both seats' decisions as D435 rows (candidates plus Forge's answer) and a public per-turn ledger. They are keyed by game seed to `games.jsonl` and `decks.jsonl`, under `games/<band>/rows/` and `ledger.jsonl`. Night 1 was not recorded. They make possible:
- **The card-in-context model:** a card's value given the deck around it (cards.tsv's context columns) and whether and when it was cast, rather than its unadjusted rate. This is what the gold-card caveat needs.
- **Cast and stranded rates by makeup:** do four- and five-colour decks lose to uncastable cards or to weaker ones?
- **The colour slope turn by turn**, from the ledger.
- **Forge's choices as labels** for a policy or regret model.
- **Frames for a seed-chosen 2%** via `census-play --replay --record full`, with no new code.

## Known gaps
- **"Failed" comes from the cross-check's rounding, not the data.** The cloud decides: accept it with a note, or re-run only the read with a count-based comparison (no engine needed).
- **Games/h covers each band's last session only.**
- **Pauper's five-colour cell holds only 30 decks.**
- **D447's caveats stand.** The decks are uniform random draws with no utility lands, powered is drawn with legacy, and peasant's fixers are mostly pauper's. Every rate is "in a random deck of this makeup, as Forge's Default AI plays it", not a finding about built decks.
