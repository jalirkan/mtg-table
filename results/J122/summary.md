# J122 — lab meta for the Final Fantasy Cube (PC summary, 2026-10-10 11:50 EDT)

**Done, exit 0, all 9 checks PASS, the meta SHIPS (`cov.ship 1`).** 10:02 → 10:30 EDT (28 min), 7 workers.
Written by the PC session from `coverage.json`, `check.json`, `forge-check.txt` and the meta.

## Forge 2.0.14 and the 180 cards
All **180 of 180** are in Forge's database; none missing. 18 are two-faced (looked up by the front face),
0 unsupported, 0 flagged `AI:RemAIDeck`, 1 unranked (starts at 40).

## The rule, each number beside its bar
| check | value | bar |
|---|---|---|
| schema / ForgeCoach id / orphans | ok / ok / 0 | ok / ok / 0 |
| drafts | 6,000 | ≥ 100 |
| playable nonland cards with 80+ decisive games | **83.3%** (of 168) | ≥ 81% |
| median games per card | 940 | — |
| 10th-percentile card's games | 36 | — |
| lands played | 12 of 12 | — |
Ladder: the first 3,000 drafts did not reach the bar at the pilot's read, the 6,000-draft step did (83.3%),
so it stopped there; 7,500 never ran. Games: 6,000, 0 engine errors, 0 timeouts, 0 draws, 1.5 s a game.

## Descriptive only (Forge AI vs Forge AI; not a verdict on the cube)
Colour-pair deck win rates, shrunk toward 50% with a beta prior of strength 20:

| pair | win rate | 95% | games |
|---|---|---|---|
| WG | 56.2% | [52.8, 59.5] | 838 |
| WB | 55.8% | [53.8, 57.7] | 2582 |
| WR | 53.1% | [51.0, 55.2] | 2145 |
| BG | 49.5% | [46.1, 52.9] | 818 |
| WU | 49.1% | [45.7, 52.6] | 814 |
| RG | 48.0% | [44.2, 51.8] | 648 |
| BR | 45.9% | [43.8, 48.0] | 2240 |
| UB | 45.1% | [42.1, 48.1] | 1041 |
| UR | 39.3% | [35.7, 43.1] | 671 |
| UG | 36.0% | [29.7, 42.8] | 203 |

Most decisive games: Summon: Bahamut (5336), The Regalia (5324), Genji Glove (5088), Ultima, Origin of Oblivion (5027), Blitzball (5001). Fewest: Magic Pot (9), Airship Crash (7), Cid, Timeless Artificer (5), Garnet, Princess of Alexandria (3), Tidus, Blitzball Star (0) (the last few are cards the AI
barely plays; their numbers say nothing yet).
