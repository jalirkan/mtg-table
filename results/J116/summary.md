# J116 — target search confirmation: one 4,800-game match, search-v2-targets vs search-v2 (D417)

Written by the PC session, 2026-10-09 16:50 EDT, from `match-J116-targets.json`. Job 07:41 → 16:12 EDT
(8 h 31 m; pilot included), 7 workers at the live 1.5 s budget, all 3 checks PASS. **Complete: 4,800 of
4,800 games played**, so the 14 h cap and the top-up amendment never came into play. Rate: about 585 games/h
over the run (the 320/h the cloud saw at 08:15 was the opening minutes). **The PC was not in other use**:
Justin did not play or sit at it while J116 ran (he said so at 11:40, and no game process ran).

## The score

- **0.5031 [0.4956, 0.5106]**, i.e. **+2.2 Elo [−3.0, +7.4]**; 2,400 mirrored pairs on fresh deals, 4,800
  games, 2,415 wins for the targets side, 0 draws, 0 errors, 7 timeouts (0.15%).
- **Reading under the rule: NOT SHOWN.** The interval includes 0.5 (its lower end is 0.4956). The switch does
  not join the next search version.

## How often the target search changed Forge's answer

- `aSearch.byKind.t`: searched 10,917, changed 1,312, **rate 12.0%** (J115: 11.2%). One target in eight.

## Each side's ordinary decisions (p = priority plays, a = attacks, b = blocks), searched → changed

| side | p | a | b | budget fallback | rollout errors | unmappable |
|---|---|---|---|---|---|---|
| targets | 77,916 → 15,848 (20.3%) | 24,377 → 3,398 (13.9%) | 9,476 → 1,566 (16.5%) | 0.72% [0.62, 0.82] (807) | 282 | **392** |
| search-v2 | 77,337 → 15,381 (19.9%) | 24,344 → 3,419 (14.0%) | 9,391 → 1,610 (17.1%) | 0.57% [0.49, 0.65] (633) | 246 | 150 |

- **The unmappable excess holds.** J115's targets side had 107 unmappable against about 45 elsewhere; here it
  is 392 against 150, the same 2.6× ratio. Target choices the search makes that cannot be mapped back onto
  the engine's offer are a real, small cost of the switch (0.35% of its searches), and its budget fallback
  is a quarter higher too.

## Beside J115, and pooled (decides nothing)

- J115 targets match: 0.510 [0.496, 0.524], +6.9 Elo on 600 pairs. J116: 0.503 [0.496, 0.511], +2.2 Elo
  on 2,400 fresh pairs. The larger sample pulled the estimate toward even.
- Pooled, 3,000 pairs / 6,000 games: 0.5045 [0.492, 0.517], about +3 Elo [−6, +12]. Labelled "decides
  nothing": the pre-registered reading is J116's alone, and it is NOT SHOWN.

**Plainly:** the target search changes one target in eight and the games come out the same. If there is a
gain it is under about 5 Elo, below what 2,400 pairs can see, and not worth its extra fallbacks.
