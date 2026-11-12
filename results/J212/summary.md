# J212: the search one turn deeper, three arms, 1,200 games each (D537)

2026-11-11 12:33 to 23:18, mtg-table `b48cad1d`, alone, 7 workers. Three fixed 1,200-game matches (600 mirrored
pairs each, the confirm set, blocks 114,900,000-114,900,149, no stopping rule), each a config-only arm of search-v2
against `search-v1-anytime` (the live seat that night, `cdd55e02a89c`), then a recording of search-v2 against
Forge's AI. All three matches complete and valid: 3,600 games, 0 draws, 0 errors, 0 timeouts, every name, hash,
config and block check passed. The numbers are in `report.md` and `verdict.json` beside this file; this is what
they say.

**The readings, under the rule written before a game: no arm is a candidate.**

| arm | what changed | score [95%] | Elo [95%] | reading | search seconds a game |
|---|---|---|---|---|---|
| `search-v2-t1` (`63c35e9f7d5b`) | priority and block rollouts play to the end of the next turn | 0.4975 [0.4789, 0.5161] | -1.7 [-14.6, +11.2] | NOT SHOWN | 27.8 against 20.6 (x1.35) |
| `search-v2-a1` (`3cf65e94df28`) | attack rollouts see the crack-back | 0.5075 [0.4917, 0.5233] | +5.2 [-5.7, +16.2] | INCONCLUSIVE AT 1,200 | 24.3 against 21.5 (x1.13) |
| `search-v2-t1-x3` (`ce99b41f9898`) | `t1` with three times the clock (4.5 s) | 0.5142 [0.4976, 0.5307] | +9.8 [-1.7, +21.4] | INCONCLUSIVE AT 1,200 | 53.9 against 19.8 (x2.72) |

Every interval holds 0. Candidates for a 4,800-game confirmation: 0. Nothing is adopted and nothing is confirmed
(D537 point 7); the NOT SHOWN arm is not played again.

**Why the deeper rollout does not pay at the same clock.** A rollout one turn longer costs 1.85 times the play
(92.1 against 49.7 ms), so on the same 1.5 s `t1` gets 11.5 rollouts a decision where search-v2 gets 15.8, and 11.8%
of its decisions finish fewer than two rounds (2.8% for search-v2; budget fallbacks 2.5% against 0.4%). It sees
further and less often, and the two cancel. Given three times the clock it gets its rollouts back (19.1 a
decision) and the point moves to +9.8, but the interval still holds 0 and the seat thinks 2.3 s a decision, 54 s
a game. The attack arm costs the least (13% more time) and its point is +5.2, also inside 0.

**What the pattern says (D537 point 8, descriptions).** None of the named outcomes fired: no arm a candidate, and
the horizon is not *closed* either, because only `t1` read NOT SHOWN (`t1-x3` and `a1` are INCONCLUSIVE). That is
point 8's last line: no direction from this night, and the PC session chooses the next lane with the table and the
recording in front of it.

**The recording** (720 games, search-v2 against Forge Default, 60.7% [57.1, 64.2], information only). Of the
priority windows it recorded, the search searched 11,939 and did not search 63,815:

- 5,384 where Forge played a land and the search skipped the window; another land was among the options in 3,506
  of them, a castable non-mana play in 4,057;
- 4,122 in its own main phase with an empty stack where no alternative reached the search;
- 4,970 in its own main phase with something on the stack, 26,377 elsewhere in its own turn and 22,962 in the
  opponent's turn, every one with a legal non-mana play.

Where it did search, most alternatives changed nothing: the paired difference between an alternative and Forge's
move was exactly 0 in 14,459 of 20,560 priority comparisons (70%), 8,525 of 10,560 for attacks (81%) and 1,825 of
2,724 for blocks (67%).

**What it does not say.** Not that a deeper horizon is worthless: `t1-x3`'s interval allows up to about +21 Elo,
at 2.7 times the thinking time. Not that the windows the search skips hold wins: the recording counts them and
measures nothing about them. The seconds are this machine's (D388).

**The live seat** was unchanged by this job (`liveSeatChanged` 0). Separately, on J211's reading and the owner's
yes of 2026-11-11, D539 moves it to `search-v2-no-b`; that lane is written and waits for the lab to be free.

**The run.** 10.75 h against an estimate of about 11. Thirteen pressure events (short drops to 6 or 5 workers, each
raised back; the job at 6.7 to 8.9 of its 21.4 GB).

**Next.** J213 (D538, the label probe) started at 23:19 and runs alone. The next search lane is chosen after it,
from this table and the recording: the windows the search never looks at (which land to play, and the
instant-speed windows on both turns) rather than a deeper look at the ones it already searches.
