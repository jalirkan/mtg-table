# J220: the cheaper clock, search-v3-declined-instant-t1-x2 against the live seat on the confirm set, 4,800 games (D547)

2026-11-15 11:05 to 2026-11-16 01:44 (14.5 h), mtg-table `847e50a`, alone, 7 workers (5 to 7 for the first
half hour under memory pressure). One fixed 4,800-game match (mirrored pairs, the confirm set
`tools/ai-bench/pairs-confirm.txt`, blocks 302,900,000-302,900,599, host `j220`, no stopping rule):
`search-v3-declined-instant-t1-x2` (`5319a60d7e3b`: the live seat with the rollout horizon one turn deeper and
twice the clock) against `search-v3-declined-instant` (`af6771947a25`, the live seat, search-v4). The pilot's
gate passed (4 + 4 games, 0 errors, the recorded horizons all 1, play a rollout x2.378) and the match was
played. Complete and valid: 4,800 games, 0 draws, 0 engine errors, 0 timeouts, 2,400 mirrored pairs, 30 deck
pairs at 160 games each, 25 of 25 checks passed. The numbers are in `report.md` and `verdict.json` beside this
file; this is what they say.

**The answer: SMALL GAIN, a measured gain.** 2,498 wins of 4,800, score 0.5204 [0.5112, 0.5296],
**+14.2 Elo [+7.8, +20.6]**. The lower end is well above 0; the point estimate is 0.8 Elo under D519's +15
line, which is the whole of the difference between SMALL GAIN and SHOWN here.

**Beside J218 (never pooled: another clock, another deck set).** J218 was the same depth at three times the
clock, on the dev set: +15.9 Elo [+9.4, +22.5]. The two intervals sit almost on top of each other. Two thirds
of the clock bought the same gain within the noise:

| player | clock | Elo [95%] | search s a game A / B | ms a decision A / B | rollouts a decision A / B | short of two rounds A / B |
|---|---|---|---|---|---|---|
| t1-x2 (J220, confirm set) | 3 s | +14.2 [+7.8, +20.6] | 51.9 / 20.9 (x2.48) | 2,084 / 848 | 16.54 / 16.48 | 4.29% / 2.67% |
| t1-x3 (J218, dev set) | 4.5 s | +15.9 [+9.4, +22.5] | 70.4 / 22.3 (x3.15) | - | 18.47 / 15.81 | 2.43% / 3.08% |

**What the 3 s clock does.** It restores the live seat's number of rollouts at the deeper horizon: 16.54 a
decision against the live seat's 16.48, each rollout 115 ms of play against 45 (x2.56). At the live seat's own
1.5 s clock the deeper horizon had starved the search (J212's `search-v2-t1`: 11.5 rollouts, 11.8% of decisions
short of two rounds, -1.7 Elo). The extra 1.5 s (J218, a 4.5 s clock) adds two rollouts a decision and, by these two
matches, nothing that can be told from zero.

**The cost.** 51.9 against 20.9 search seconds a game (x2.48), 2,084 against 848 ms a searched decision.
Budget fallbacks 1.26% [1.02%, 1.50%] against 0.58%; step timeouts 188 against 51; 4.29% of decisions short
of two rounds against 2.67%. None of it invalid, all of it the price of a longer rollout on the same machine
(the seconds are this machine's, D388).

**What changed in play.** A changed Forge's priority decision in 20.9% of its priority decisions against the
live seat's 19.3%, and its attack in 16.7% against 17.0%; from pass, to another play, to pass 8.0%, 6.8%,
6.1% against 7.6%, 6.4%, 5.3%. The pair's two keys opened alike on both sides (declined 3.55 and 3.37 windows
a game, instant 2.07 and 1.91).

**No seat moved.** `liveSeatChanged` is 0. `t1-x2` is a live-seat candidate for the owner under a separate
decision. The three measured steps over the live seat, never pooled with each other:

- `search-v3-wide`: +5.3 Elo [+1.6, +9.0] pooled over J217 and J221, at x1.095 the search time;
- `t1-x2`: +14.2 [+7.8, +20.6] at x2.48 (this job);
- `t1-x3`: +15.9 [+9.4, +22.5] at x3.15 (J218).

`t1-x2` dominates `t1-x3` on these readings: the same gain for less waiting. Whether the wide windows and the
deeper rollout add up when both are on is not measured; that is the next match.
