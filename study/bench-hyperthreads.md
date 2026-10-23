# Hyperthreads for lab workers: 7 vs 10 vs 12 (2026-10-23)

Ryzen 7 9700X (8C/16T), 30 GB. Lab checkout `/home/justin-a/code/lab/mtg-table` at 9fe69ad8, runner idle
(`"running":[]` checked before each run), pc-fc-engine's idle JVM left up.
`tools/cubelab.sh decks --band legacy --count 100 --seed 9001`, then
`census-play --pairs 600 --seed 9001 --record none --jobs N`, Xmx4096m default. A 24-game warm-up at
`--jobs 12` first created homes 7–11. `ps` sampled every 10 s.

Throughput is measured as games/h at game 500, from the tool's progress line. Wall time and the session
line are dominated by one pathological game (g105: 256 s, 158 s, a 319 s timeout plus a retry, 301 s).

| N | games/h @500 | vs 7 | session games/h | wall s | mean game ms (excl. g105) | peak worker RSS | mean / peak load1 | swap-in pages |
|---|---|---|---|---|---|---|---|---|
| 7  | 8230 | 1.00 | 6627 | 326 | 2559 | 12.5 GB | 17.5 / 26.1 | 2030 |
| 10 | 7781 | 0.95 | 7885 | 274 | 3906 | 16.4 GB | 22.5 / 27.7 | 450 |
| 12 | 7330 | 0.89 | 2911 | 742 | 4947 | 20.3 GB | 28.7 / 37.5 | 1495 |
| 7 (control) | 8281 | 1.01 | 5831 | 371 | 2546 | 11.7 GB | 12.6 / 15.6 | 2940 |

The per-game time grows almost linearly with N (7/2.56 = 2.73 games/s, 10/3.91 = 2.56, 12/4.95 = 2.43).
The SMT siblings are already busy at 7 workers: load is about 17, from each JVM's GC and JIT threads.
Extra workers only slow every game down, which pushes long games toward the timeout (at 12, g105 hit it
and was restarted).
Swap-in is noise: a few MB per run against 3 GB already swapped before the runs started. Worker RSS was
1.7–2.3 GB each in this mode.

**Recommendation:** keep `physicalCores - 1 = 7`. Hyperthreads buy nothing, and 10–12 workers lose 5–11%.
Memory does not decide either way, because the core cap binds first.
