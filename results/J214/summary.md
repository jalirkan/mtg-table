# J214: what the search considers, three arms, 1,200 games each (D540)

2026-11-12 05:07 to 11:46, mtg-table `7ff7d6ab`, alone, 7 workers. Three fixed 1,200-game matches (600 mirrored
pairs each, the confirm set, blocks 416,900,000-416,900,149, host `j214`, no stopping rule), each one key added to
search-v3 and played against `search-v2-no-b` (the live seat, `59505e241363`). All three matches complete and
valid: 3,600 games, 0 draws, 0 errors, 0 timeouts, every name, hash, config and block check passed, and no D540
counter moved on the B side. The numbers are in `report.md` and `verdict.json` beside this file; this is what they
say.

**The readings, under the rule written before a game: no arm is a candidate.**

| arm | what changed | score [95%] | Elo [95%] | reading | search seconds a game |
|---|---|---|---|---|---|
| `search-v3-declined` (`795daea97aaa`) | castable spells Forge's per-card AI declines become candidates | 0.5083 [0.4934, 0.5233] | +5.8 [-4.6, +16.2] | INCONCLUSIVE AT 1,200 | 19.5 against 18.9 (x1.03) |
| `search-v3-instant` (`25ee7e76b741`) | empty-stack windows outside its own main phases, where Forge plays, are searched | 0.5150 [0.4990, 0.5310] | +10.4 [-0.7, +21.5] | INCONCLUSIVE AT 1,200 | 21.2 against 19.1 (x1.11) |
| `search-v3-lands` (`e0b09eb7b014`) | Forge's land drop against each other land | 0.5017 [0.4862, 0.5172] | +1.2 [-9.6, +11.9] | NOT SHOWN | 21.7 against 18.8 (x1.16) |

Every interval holds 0. Candidates for a 4,800-game confirmation: 0. Nothing is adopted and nothing is confirmed
(D540 point 9); the NOT SHOWN arm is not played again. No arm is NOT READ: each key fired far above the registered
floor of 0.25 windows a game.

**The keys fired, and changed little.**

| arm | windows a game | candidates a window | decisions changed a game | retries |
|---|---|---|---|---|
| declined | 3.03 | 1.16 | 0.335 | 0 |
| instant | 1.84 | 2.15 | 0.187 | 0 |
| lands | 3.50 | 2.19 | 0.286 | 0 |

So each arm had what it was built to have, and the search took the new option in a fifth to a third of a decision
a game. The declined arm listed 4,318 aimed spells and dropped 5,378 that had no legal target. The lands arm
halved the land windows left to Forge (3.68 a game against 7.16) and moved nothing: which land to play, on these
decks, is a choice Forge already makes well enough that the search cannot be shown to improve it.

**What the pattern says (D540 point 13, descriptions).** Two arms INCONCLUSIVE AT 1,200 and one NOT SHOWN, every
point between 0 and +10: point 13's line is "no direction from this night". It is the same shape as J212's table
(-1.7, +5.2, +9.8). Across J211 to J214 every single change to the search has read between -2 and +10 Elo, and a
1,200-game match (standard error about 5.5 Elo) cannot tell any of them from 0.

**What it does not say.** Not that the wider candidate lists are worthless: the declined and instant intervals
allow up to about +16 and +21 Elo, and both points are positive at a cost of 3% and 11% more thinking time. Not
that the two would add: nothing here played them together. The seconds are this machine's (D388).

**The live seat** was unchanged by this job (`liveSeatChanged` 0).

**The run.** 6.65 h (2.12, 2.15 and 2.21 h a match). Twenty-four pressure events, short drops to 6 or 5 workers,
each raised back.

**Next.** The two positive arms are config keys of one player, so the next match plays them together, once, at
the size that can read a sum of that order: `declined=1` and `instant=1` on search-v3 against the live seat over
4,800 games on unplayed deals, a new player and a new decision (D541), read by D519's rule. It is not a
confirmation of either J214 arm.
