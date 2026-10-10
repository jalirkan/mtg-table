# J120 — Synergy evolve with Counter Blitz's counters cards (Final Fantasy X Commander) in the seed pool

Written by the PC session, 2026-10-10 02:05 EDT, from `evolve.json`, `changelog.md`, `health.json`,
`stats.json` (generation 4) and the logs. Job 23:50 → 01:04 EDT (1 h 14 m), 7 workers at 1.32 GB peak, all 7
checks PASS. 4 generations × 400 drafts, best of 3, exploration on, unrecorded; mtg-table `c7d1e4d`.

## Forge and the pool
The pilot's facts step looked up all 217 cards (180 cube + 37 pool) in 2.1 s and reported **no missing card**
(it prints `MISSING` per card it cannot find, and none appears in `pilot1.log` or `run1.log`). So every pool
card was eligible. (The `WARNING: 180 cube cards not in the pool` line is the usual notice that cube cards'
colours come from their sections; it is not a lookup failure.)

## Per generation
| gen | drafts (seeds) | explored / plain | decisive games | design effect | family | candidates | confirmation | swaps |
|---|---|---|---|---|---|---|---|---|
| 1 | 400 (140,000,001–400) | — | 647 | 1.24 | 280 tests, FDR 0.1 | **Lotus Petal** (dominant-pick: first line in 299 of 358 grids, 0.84 vs 0.75, p 6.8e-5, q 0.009) | 47 fresh drafts (seeds 141,000,001–047, 119 decisive): first line in 39 of 44 grids (0.89 vs 0.75), **p 0.021, Holm p 0.021 — confirmed** | **Lotus Petal out → Tromell, Seymour's Butler in** (G for C; mv 3 for 0; rating 40; helps weak CTR ETB G; notes say try) |
| 2 | 400 (…401–800) | — | — | — | 280 | none; 5 leads to watch (~1,341 drafts a generation would find half) | — | none |
| 3 | 400 (…801–1,200) | — | — | — | 280 | none; 7 leads (~3,811 drafts) | — | none |
| 4 | 400 (…1,201–1,600) | 491 / 1,109 over the run | mean 0.499 | 1.24 | 280 | **Skullclamp** (dominant-pick: 329 of 371, 0.887 vs 0.75, p 3.4e-11, q 9.5e-9) | 46 fresh drafts (seeds 141,000,901–946, 114 games): 34 of 43, 0.79 vs 0.75, **p 0.339 — not confirmed**, kept | none |
Per-generation explored/plain splits and decisive counts for gens 2–3 were not collected into `results/`
(only gen 4's `stats.json` was); the run total is 491 explored + 1,109 plain = 1,600.

## The one Final Fantasy card that entered: Tromell, Seymour's Butler (in from generation 2)
- Generation 4 (the only per-generation stats collected): dealt 356, picked 171, first line 57, **in 9 decks**
  of 115 on-colour pools (deck rate 0.08, CI 0.04–0.14), 12 decisive games, won 5 (0.42, CI 0.18–0.70;
  shrunk 0.47) against a mean of 0.50. The engine's assessment calls its signal "dead" with status
  `note-keep`: rarely played by rating, not a drafts verdict.
- Pooled exploration row (forced into decks when on colour): 13 forced decks (31 games), expected 15.7, win
  rate 0.50 with it vs 0.38 without, **delta +0.12 (−0.11 to +0.35), undecided**. (In gen 4 alone, 5 forced
  decks, 13 games, +0.32, "too few".) No direction is read into it.
- It replaced Lotus Petal, cut on a dominant-pick confirmation (above).

## The other Final Fantasy tries
Six `try` cards remain untested, no slot having opened for them: **Auron, Venerated Guardian; Kimahri,
Valiant Guardian; Maester Seymour; Shelinda, Yevon Acolyte; Summon: Ixion; Wakka, Devoted Guardian.**
(The pool's seventh try was Tromell, which entered.)

## Health, beside each check
| number | value | check |
|---|---|---|
| generations_done | 4 | == 4 PASS |
| drafts | 1,600 | == 1,600 PASS |
| engine_error_rate | 0.0031 (5 errors in 3,817 games) | ≤ 1% PASS |
| explored + plain | 491 + 1,109 | == 1,600 PASS |
| share (explored) | 0.307, z 0.60 against the 0.3 asked | z within ±4 PASS |
| explored vs plain error rate | 0.41% vs 0.27% | ≤ plain + 1% PASS |
| treated / expected | 772 / 786 (z −0.51) | balance |
| pooled delta (se) | +0.0009 (0.015) | exploration is neutral overall |
| targets / holds / weak / undecided / too few | 70 / 10 / 3 / 16 / 41 | — |
| rating-limited | 43 | — |
| plain design effect max | 1.24 | — |

Totals: discovery drafts 1,600; confirmation drafts 93 (47 + 46); wall 1 h 14 m; engine errors 5; timeouts 3;
draws 3; mean game 6.1 s, median 2.2 s.

## Exploration notes (D356, no verdict, from the changelog)
Weak when played: Charming Prince (−0.19), Ulvenwald Mysteries (−0.16), Carrion Feeder (−0.37). Holds its own
(underrated by its rating): Myr Sire (+0.14, CI above 0), Intangible Virtue (+0.15), Hordeling Outburst
(+0.36), plus Candy Trail, Ajani's Pridemate, Soulherder, Flickerwisp and others with intervals that include 0.
