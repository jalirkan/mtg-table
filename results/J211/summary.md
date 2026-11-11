# J211: the no-block seat against the live seat, 4,800 games (D536)

2026-11-11 02:53 to 11:34, mtg-table `d1d6b20f`, alone, 7 workers. One fixed 4,800-game match (2,400 mirrored
pairs, the confirm set, blocks 931,900,000-931,900,599, no stopping rule): `search-v2-no-b` (priority plays and
attacks searched, blocks left to Forge; hash `59505e241363`) against `search-v1-anytime` (the live seat, all three
kinds searched; `cdd55e02a89c`). Complete and valid: 4,800 games, 0 draws, 0 errors, 1 timeout, every config and
block check passed. The numbers are in `report.md` and `verdict.json` beside this file; this is what they say.

**The reading, under the rule written before a game: NO-BLOCK SEAT HOLDS.**

| | score [95%] | Elo [95%] | search seconds a game |
|---|---|---|---|
| `search-v2-no-b` against `search-v1-anytime` | 0.4969 [0.4893, 0.5045] | -2.2 [-7.4, +3.1] | 19.3 against 21.6 |

The lower end, -7.4, is above the -10 Elo bar. The interval holds 0, so the two seats are indistinguishable at
4,800 games: searching blocks buys +2.2 Elo [-3.1, +7.4] head to head. J210 said the same from the other side
(the block search taken last against Forge's AI, +0.0017 score [-0.0148, +0.0182]); the two are different
opponents and different deals and are not pooled.

**What it saves.** 2.2 search seconds a game, 10% (19.345 against 21.554; J210 measured 8%). The saving is the
9,674 block decisions the live seat searched (8.6% of its searched decisions, 967 ms each); the time per searched
decision is the same (905 against 916 ms), and so is how often the search changes Forge's move on the kinds both
search (priority 19.2% against 19.5%, attacks 14.9% against 14.7%). Where the live seat did search a block it
changed Forge's block 23.8% of the time, and that bought nothing measurable.

**What it does not say.** Not that block search is worthless: the interval allows it up to about 7 Elo. Not that
the no-block seat is stronger. And the seconds are this machine's (D388).

**The live seat** is unchanged by this job. HOLDS makes `search-v2-no-b` a live-seat candidate; whether the game's
AI stops searching blocks is the owner's one word (D509). What the player would see: the AI answers a block
declaration at Forge's speed (no thinking pause) and plays the same strength within 7 Elo.

**The run.** 8.57 h against an estimate of about 9. Fourteen pressure events (five short drops to 6 or 5 workers,
all raised back within ten minutes; swap-in bursts with the job at 5.5 to 8.4 of its 21.4 GB).

**Next.** J212 (D537): the search's horizon, whether a one-turn rollout or one more priority round is worth more
than the two-turn rollout the seat plays.
