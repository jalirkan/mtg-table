# J216: the declined + instant gain replayed on the dev deck set, 4,800 games (D543)

2026-11-12 22:50 to 2026-11-13 07:27, mtg-table `97122947`, alone, 7 workers. One fixed 4,800-game match (2,400
mirrored pairs, the dev set `tools/ai-bench/pairs-dev.txt`, blocks 622,900,000-622,900,599, host `j216`, no
stopping rule): `search-v3-declined-instant` (`af6771947a25`) against `search-v2-no-b` (the live seat,
`59505e241363`), the same two players, hashes and code as J215, on the other 30 drafts of the same six cubes,
which had never been played with either key on. Complete and valid: 4,800 games, 1 draw, 1 engine error (the
bar is 240), 0 timeouts, every name, hash, config, set and block check passed, no D540 counter moved on the B
side and A's lands counters stayed at 0. The numbers are in `report.md` and `verdict.json` beside this file;
this is what they say.

**The answer, J216 alone: SMALL GAIN, a measured gain.** 2,456 wins of 4,799 decisive games, score 0.512
[0.503, 0.520], **+8.3 Elo [+2.4, +14.1]**. The interval is above 0 and the point is under D519's +15 line, the
same reading as J215 (+6.9 [+1.4, +12.5]) on decks neither player's settings had been tried on. The gain did not
come from the confirm set's decks.

**The recommendation to adopt `search-v3-declined-instant` STANDS, and J216 alone carried it** (D543 point 6:
`recByAlone` 1, `recByPooled` 0). It did not need the pooled line, which is the branch a true null would have
reached 37% of the time.

**The pooled line, J215 + J216 (9,600 games, 4,800 pairs):** score 0.5109 [0.5051, 0.5168], **+7.6 Elo
[+3.5, +11.7]**. That is the best estimate of the size: a real gain of a few Elo, under +12, not a +15 one.

**The exposure: both keys fired far above the 0.25-a-game floor, as on the confirm set.**

| key | windows a game | candidates a window | decisions changed a game | retries (all 4,800 games) |
|---|---|---|---|---|
| declined | 3.51 (J215: 3.46) | 1.15 | 0.423 | 0 |
| instant | 1.89 (J215: 1.80) | 2.26 | 0.256 | 0 |

The declined key listed 20,012 aimed spells (4.17 a game) and dropped 25,553 with no legal target (5.32 a game).

**The cost.** 22.2 against 18.9 search seconds a game (x1.17, 3.3 s more a game; J215 read x1.14). A searched
115,231 decisions against B's 100,534 at 925 against 904 ms each, so the cost is again more decisions searched,
not slower ones. Rollouts a decision 15.5 against 15.4; decisions with fewer than 2 rounds 3.2% against 3.0%;
budget fallbacks 0.6% on both sides. A changed Forge's play in 18.3% of its searched decisions, B in 18.2%. The
seconds are this machine's (D388).

**What it does not say.** Which key carried it (nothing here ablates them), or that the gain is +12: the pooled
lower end is +3.5.

**The pilot.** Played: 4 ladder and 4 recorded games, 21 declined and 10 instant windows, 0 errors, timeouts or
retries; recorded searched priority decisions 61 in the own main phase, 0 in a land window, 4 at instant speed,
0 on a stack.

**The run.** 8.6 h. Five pressure events in STATUS (drops to 6 workers at 02:53, 06:52 and 07:21, the first two
raised back within six minutes); no block retried. It ran alone (D521).

**This job changes nothing:** the live seat is `search-v2-no-b` as before (`liveSeatChanged` 0). Adoption is the
owner's, under a decision of its own (seat-queue row 10), and the PC session's recommendation is to adopt: two
independent 4,800-game matches on disjoint deck sets, both above 0, for about 3 s more a game.

**Next.** J217 (D544, wide windows: the search also answers on a stack, in the opponent's turn's pass windows and
with activated abilities) plays against `search-v3-declined-instant`, as D544 registered for a STANDS reading.
