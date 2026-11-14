# J217: the wide windows on the live seat, 4,800 games on the confirm set (D544)

2026-11-14 05:00 to 14:23, mtg-table `9fb702f`, alone, 7 workers. One fixed 4,800-game match (2,400 mirrored
pairs, the confirm set `tools/ai-bench/pairs-confirm.txt`, blocks 725,900,000-725,900,599, host `j217`, no
stopping rule): `search-v3-wide` (`b95340935592`: the live seat plus three keys, `stackwin`, `passwin` and
`dactiv`, with the stack carried onto the search's copies) against `search-v3-declined-instant` (`af6771947a25`,
the live seat since D546, search-v4). Complete and valid: 4,800 games, 0 draws, 0 engine errors, 1 timeout, all
25 checks passed, every name, hash, config, set and block check passed, B's D544 counters at 0 and A's lands
counters at 0. The numbers are in `report.md` and `verdict.json` beside this file; this is what they say.

**The answer: SMALL GAIN, a measured gain.** The search plays a little better when it also searches the windows
the live seat leaves to Forge: 2,448 wins of 4,800, score 0.510 [0.5021, 0.5179], **+6.9 Elo [+1.5, +12.4]**.
The interval is above 0 and the point is under D519's +15 line, so the reading is SMALL GAIN. Under D544 point 15
this names `search-v3-wide` a **live-seat candidate for the owner**, as the increment on the live seat, under a
separate decision and a seat-queue row (D509), with its cost beside it. This job moves no seat (`liveSeatChanged`
0).

(The point and the win count are the same as J215's, 2,448 and +6.9. That is a coincidence: other players, other
blocks, another night.)

**The cost: 9% more thinking.** 23.5 against 21.6 search seconds a game (x1.0855, 1.9 s more a game). A searched
decision is no slower (907 against 913 ms); the seat searches more of them, 124,282 against 113,705, which is the
new windows. The seconds are this machine's (D388).

| | A (`search-v3-wide`) | B (the live seat) |
|---|---|---|
| search seconds a game | 23.5 | 21.6 |
| ms a searched decision | 907 | 913 |
| decisions searched (priority, attacks) | 99,656, 24,626 | 89,294, 24,411 |
| rollouts a decision | 15.3 | 15.6 |
| decisions short of two rounds | 3.49% | 3.30% |
| changed Forge's answer | 17.7% | 18.4% |
| budget fallbacks | 0.6% [0.5, 0.7] | 0.5% [0.4, 0.7] |
| rollouts cut inside one engine step | 44 | 39 |

**The exposure: all three keys fired above their floors, and the union changed 0.279 decisions a game** (1,340 in
4,800 games; the registered rate to be read at all was 0.25, and the 240-game exposure run before the match had
measured 0.292).

| key | what it opens | windows a game (floor) | candidates a window | decisions changed a game | retries (all 4,800 games) |
|---|---|---|---|---|---|
| stackwin | the seat's priority with something on the stack | 1.293 (0.25) | 2.11 | 0.150 | 0 |
| passwin | the window after the opponent passes on an empty stack | 0.415 (0.1) | 2.16 | 0.040 | 0 |
| dactiv | activated abilities Forge's per-card AI declines | 1.705 (0.25) | 1.04 | 0.090 | 7 |

More than half the changes are in stack windows. The search refused 598 stack windows, 8.8% of those it met, the
largest reasons a stack item it could not map onto the copy (326) and a triggering ability on the stack (145).
Seven retries in 124,282 searched decisions (a widened pick that did not happen; it counts against the player
uncorrected).

**It read above the registered expectation, so the true size is probably under the point.** D544 wrote before any
game that at the measured exposure, and at J215's and J216's rate of about +11 Elo per changed decision a game,
the union was worth about +3 Elo, where a match this size reads SMALL GAIN about one time in five. It read +6.9,
which would be about +25 Elo per changed decision a game. Either stack windows are worth more per changed
decision than the other keys' windows (counter-magic and combat tricks live there, so that is possible), or this
is the high side of the draw. The lower end, +1.5, is the honest floor. One match cannot tell the two apart.

**What it does not say.** Which key carried it: nothing here ablates them. Nor anything about decks outside the
confirm set: the three keys have never been played on the dev set at this size.

**What it earns, and the PC session's recommendation: replicate before the seat moves.** The pair before it went
the same way: J215 read SMALL GAIN on the confirm set, the owner was asked only after J216 read it again on the
dev set (D543), and the live seat moved on the two together (D546). The same is right here, for the reason above
and because it is cheap (about 9.3 h): one fixed 4,800-game match of the same two players on the dev set, under
its own decision, read alone by the same four readings. If it reads SHOWN or SMALL GAIN, `search-v3-wide` goes to
the owner with both matches. The owner can say "adopt wide" sooner; at 9% more time the cost is not the
question.

The wide windows and the depth arms (D545's `t1-x3`, SHOWN +15.9 at x3.15 the time; D547's attacks-only horizon
and 3 s clock, next) change different things, which windows are searched against how far a rollout plays, so they
are expected to stack. Nothing measures that yet; a player with both is a later lane.

**The pilot.** Played: 4 ladder and 4 recorded games, 0 errors or timeouts, 0 retries, stack windows 2 + 3, pass
windows 1 + 1, dactiv windows 1 + 15, 1 refused.

**The run.** 9.4 h wall, 9.28 h of match; D544 expected about 9. Three memory-pressure drops in STATUS (7 workers
to 6, each raised back within 5 to 8 minutes; no block retried), from the PC session's scenery painting beside
it. Both seats of every game share the machine and the pairs are mirrored, so the pressure favours no side. It
ran alone among lab jobs (D521).

Beside it, never pooled and never read against it (D544 point 17): J215 (`search-v3-declined-instant` against
`search-v2-no-b`, confirm set, +6.9 [+1.4, +12.5]) and J216 (the same pair on the dev set, +8.3 [+2.4, +14.1]).
