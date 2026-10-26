# Lost casts after J169, from the frames (metrics.py --scan caches, `results/J169/lost-*.json`)

A lost cast: the card goes hand -> stack, then no state frame shows it on the stack, no zone event moves it off and no
`cast` event names it (card and mana gone). Card names are mine, read from the frame logs and deck files (the caches
carry ids only).

| spine (who branched it) | logs | casts | lost casts | branches with one | forced (the option's own cast) | lost-cast options | cards (id: lost) |
|---|---|---|---|---|---|---|---|
| s01 (J166, 325c2dd8) | 11,560 | 84,441 | **29** | 25 of 5,780 | 0 | 0 | B's Pyrotechnics 42: 18, B's Suplex 43: 10, B's Rolling Thunder 76: 1; 2 of the 25 branches are Forge-map branches (Forge's own play) |
| s02 (J166) | 5,000 | 48,998 | 7 | 7 of 2,500 | 0 | 0 | A's Tear Asunder 17: 7 |
| s03 (J166) | 12,000 | 32,941 | 0 | 0 | 0 | 0 | |
| s04 (J167) | 5,800 | 34,987 | 0 | 0 | 0 | 0 | |
| **s05 (J168, biased)** | 11,000 | 80,369 | **1,614** | 1,125 of 5,500 | **850** | **5**: d0 o1, d0 o2, d3 o2, d5 o4, d8 o0 | A's Suplex 1: 991, A's Abrade 2: 600, A's Branching Bolt 16: 23 |
| **s06 (J169, D485)** | 15,000 | 76,830 | **0** | 0 | 0 | 0 | (J168's: 212; Knockout Maneuver 105, Troll Negotiations 107) |
| s07 (J168) | 11,940 | 31,631 | 2 | 2 of 5,970 | 0 | 0 | B's Vicious Rivalry 65: 2 |
| s08 (J168) | 14,400 | 70,251 | 0 | 0 | 0 | 0 | |
| s09 (J168) | 11,900 | 87,854 | 0 | 0 | 0 | 0 | |
| **s10 (J169, D485)** | 12,550 | 72,302 | **0** | 0 | 0 | 0 | (J168's: 514; Troll Negotiations 507, Tear Asunder 7) |
| s11 (J168) | 11,950 | 55,696 | 0 | 0 | 0 | 0 | |
| s12 (J168) | 7,200 | 26,682 | 0 | 0 | 0 | 0 | |
| s13 (J168, re-checked) | 13,850 | 71,403 | 0 | 0 | 0 | 0 | (14 Tamiyo's Safekeeping fizzles leave the stack: not lost) |
| **the 13** | | | **1,652** | **1,159** | **850** | **5 (all s05)** | s05 98%, s01 1.8%, s02 0.4%, s07 0.1% |

- Total 29 + 7 + 1,614 + 2 = 1,652 (tool.json `lostCasts`). J168's 13 read 1,623 + 726 on s06/s10 = 2,349 before the
  re-branch; J169's two re-branched spines lose none (`lostCastsD485` 0, `lostCastOptionsD485` 0).
- **Not seen by this scan:** Headliner Scarlett's dropped enter trigger on s07 (118 frames in J168's read; a trigger, not
  a cast) and s13's Tamiyo fizzles. Both are Forge's own behaviour or a fizzle, not a stranded card.
- **s01 is new** (J169's self-test did not scan it): 29 lost casts in 25 branches, at most 5 of an option's 200 branches
  (d3 o0 and o1; d3 o2 3 of 50), none forced; 23 random-map branches and 2 Forge-map ones. Pyrotechnics and Rolling Thunder divide damage, Suplex is modal: D485
  refuses a stale divided-damage part rather than re-targeting it, and modal spells are D486's.
- Worker logs, for comparison (never the measure): `failed to target` 599 lines, all on J168's kept spines (s02 8,
  s05 453, s07 138); J169's s06 and s10 logs have 0 (J168's asides 214 and 515).
