# J219: the attack horizon alone, on the declined + instant pair, 4,800 games on the dev set (D547)

2026-11-14 15:08 to 2026-11-15 01:12, mtg-table `847e50a`, alone, 7 workers. One fixed 4,800-game match (2,400
mirrored pairs, the dev set `tools/ai-bench/pairs-dev.txt`, blocks 758,900,000-758,900,599, host `j219`, no
stopping rule): `search-v3-declined-instant-a1` (`dbf415e66452`: the pair with `aturns=1` alone, so attack
rollouts play to the end of the opponent's next turn and priority rollouts are the live seat's, at the live
seat's 1.5 s) against `search-v3-declined-instant` (`af6771947a25`, the live seat, search-v4). Complete and
valid: 4,800 games, 1 draw, 0 engine errors, 0 timeouts, every name, hash, config, set and block check passed,
both sides' lands counters at 0, and A's rollouts were the deeper ones (59.9 against 51.0 ms of play a rollout,
x1.175; the trace's bar is 1.05). The numbers are in `report.md` and `verdict.json` beside this file; this is
what they say.

**The answer: NOT SHOWN, indistinguishable.** 2,391 wins of 4,799 decisive games, score 0.4981 [0.4902,
0.5060], **-1.3 Elo [-6.8, +4.2]**. The interval sits across 0 and its top is far under D519's +15 line. Seeing
the crack-back in attack rollouts, at the live clock, is worth nothing we can measure: less than about +4 at
this match's own width, and D547's wording is "not shown to carry J218's gain (worth less than about +11.8)".

**It is not free either.** The deeper attack rollouts took their time out of the same 1.5 s:

| | A (`a1`) | B (the live seat) | ratio |
|---|---|---|---|
| search seconds a game | 24.8 | 22.4 | x1.10 |
| ms a searched decision | 1,012 | 914 | x1.11 |
| ms an attack decision | 1,312 | 847 | x1.55 |
| ms a priority decision | 932 | 932 | x1.00 |
| rollouts a decision | 14.6 | 15.6 | |
| decisions short of two rounds | 7.2% | 3.4% | |
| budget fallbacks | 1.28% [1.10, 1.46] | 0.71% [0.57, 0.85] | |
| ms of play a rollout | 59.9 | 51.0 | x1.175 |

D519 point 5's "no cost" flag is 0: A is more than 5% over B a decision. The seconds are this machine's (D388).

**What changed in play.** Almost nothing. A changed Forge's attack in 16.4% of its attack decisions against B's
15.2% (4,073 of 24,783 against 3,785 of 24,833), and its priority decisions were B's (19.0% against 19.3%
changed; from pass, to another play, to pass 7.5%, 6.4%, 5.1% against 7.5%, 6.5%, 5.2%). The pair's two keys
fired on both seats alike (declined 3.6 windows a game, instant 2.0), 0 retries.

**What it says about J218.** J218's `t1-x3` (both horizons at three times the clock) read +15.9 [+9.4, +22.5]
on this same deck set against this same opponent. This match takes the attack horizon out as the carrier at
1.5 s: J218's gain is in the priority rollouts' horizon, or in the two horizons together with the clock to feed
them, and not in the attacks alone. Never pooled with J218 (another player, other deals). J212's `a1` point on
the old base (+5.2 [-5.7, +16.2] at 1,200 games) was noise around 0, as D519 point 8 warns a positive
1,200-game point can be.

**What it earns** (D547). Nothing moves: no live-seat candidate, `liveSeatChanged` 0, the live seat is
search-v4 as before. No attacks-only arm at 1.5 s is played again without a new decision. The horizon track
stays open on its other two questions: **J220** (the same deep player as J218 at `ms=3000`, on the confirm set)
asks whether the 3 s deep player is a gain there, and after it the engineering lane is the rollout itself (a
deep rollout costs about 140 ms of play against 50).

**The pilot.** Played: 4 ladder and 4 recorded games, 0 errors or timeouts, 1 of 212 decisions short of two
rounds, recorded horizons 0 on 87 priority and 1 on 28 attack decisions and no other, play a rollout 35.9
against 29.1 ms (x1.234), longest game 53.5 s.

**The run.** 10.07 h; D547 expected about 10.5 h. Twenty memory-pressure entries in STATUS (swap-in bursts;
7 workers to 6, twice to 5, once down to 3 between 19:35 and 20:14), each raised back within 5 to 40 minutes;
no block retried. The job itself held 5 to 9 GB of its 21.4 GB budget, so the pressure came from outside it:
the PC session's scenery painting. Both seats of every game share the machine, so the pressure fell on A and B
alike.
