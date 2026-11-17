# J222: the wide windows and the deeper horizon together, search-v3-wide-t1-x2 against the live seat on the dev set, 4,800 games (D549)

2026-11-16 11:09 to 2026-11-17 05:38 (18.5 h), mtg-table `6fd2e72`, alone, 7 workers (4 to 6 for parts of
the night under memory pressure, 30 drops and raises; the scenery painting shared the machine's memory). One
fixed 4,800-game match (mirrored pairs, the dev set `tools/ai-bench/pairs-dev.txt`, blocks
508,900,000-508,900,599, host `j222`, no stopping rule): `search-v3-wide-t1-x2` (`709c83cc4d48`: the live seat
with the three wide windows, the rollout horizon one turn deeper and twice the clock, 3 s) against
`search-v3-declined-instant` (`af6771947a25`, the live seat, search-v4, 1.5 s). The pilot's gate passed (4 + 4
games, 0 errors, the wide windows open, every recorded horizon 1, play a rollout x2.497) and the match was
played. Complete and valid: 4,800 games, 2 draws, 2 engine errors, 0 timeouts, 2,400 mirrored pairs, 30 deck
pairs at 160 games each, 28 of 28 checks passed. The numbers are in `report.md` and `verdict.json` beside this
file; this is what they say.

**The answer: SHOWN, a measured gain.** 2,542 wins of 4,800, score 0.5298 [0.5203, 0.5393],
**+20.7 Elo [+14.1, +27.3]**. The lower end is far above 0 and the point is above D519's +15 line.

**Beside its two parts (never pooled, never read as a difference: D549 point 8).** Each row is its own match
against the same live seat:

| player | clock | set | Elo [95%] | search s a game A / B | ms a decision A / B | rollouts a decision A / B | short of two rounds A / B |
|---|---|---|---|---|---|---|---|
| wide (J217 + J221 pooled) | 1.5 s | confirm + dev | +5.3 [+1.6, +9.0] | 23.4 / 21.3 (J221; x1.095 pooled) | 897 / 895 | - | - |
| t1-x2 (J220) | 3 s | confirm | +14.2 [+7.8, +20.6] | 51.9 / 20.9 (x2.48) | 2,084 / 848 | 16.54 / 16.48 | 4.29% / 2.67% |
| **wide-t1-x2 (J222)** | 3 s | dev | **+20.7 [+14.1, +27.3]** | 58.5 / 21.5 (x2.72) | 2,099 / 864 | 16.09 / 16.37 | 3.99% / 2.58% |

The match does not claim the combination beats either part: no match between them was played, and the
intervals of J220 and J222 overlap. What it shows is that the two changes do not cancel: with both on, the gain
over the live seat is at least as large as the larger part's.

**The windows were open and used.** Stack windows 1.73 a game, pass windows 0.47, declined-activation windows
1.89, all above their floors; 2,292 decisions changed by the three keys, 0.478 a game (J221 0.30, J217 0.279).
Stack windows refused 6.5% of those met (J221 6.9%). The deeper rollout held its count at the 3 s clock: 16.09
rollouts a decision against the live seat's 16.37, each 119.7 ms of play against 46.3 (x2.585).

**The cost.** 58.5 against 21.5 search seconds a game (x2.72), 2,099 against 864 ms a searched decision.
Budget fallbacks 0.98% [0.73%, 1.24%] against 0.45%; step timeouts 174 against 51; 3.99% of decisions short
of two rounds against 2.58%. None of it invalid; all of it the price of a longer rollout on the same machine
(the seconds are this machine's, D388).

**What changed in play.** A changed Forge's priority decision in 20.6% of its priority decisions against the
live seat's 19.8%, and its attack in 16.6% against 16.7%; from pass, to another play, to pass 8.5%, 6.4%,
5.7% against 8.0%, 6.5%, 5.3%.

**No seat moved.** `liveSeatChanged` is 0. Under D549 point 7 `search-v3-wide-t1-x2` is a live-seat candidate
put to the owner beside `search-v3-declined-instant-t1-x2` and `search-v3-wide`.

**The recommendation, from cost (not a reading of this match).** The choice is the clock at the table, not the
player:

- **If the table keeps the 1.5 s clock: `search-v3-wide`.** It is the only one of the three that fits it,
  +5.3 Elo for a tenth more search time. The owner has already said yes to it (lane D550).
- **If the table takes a 3 s clock: `search-v3-wide-t1-x2`.** At that clock the wide windows cost about an
  eighth more search time than `t1-x2` alone (58.5 against 51.9 s a game) and the combination's reading is the
  highest of the three. `t1-x2` alone is not recommended at either clock.

The PC session recommends the 3 s clock: about 2.1 s a searched decision against 0.9 s, a minute of thinking a
game against 21 s, for the largest measured step over the live seat so far.

**What is not yet read.** The combination is read on the dev set only; each part has a confirm-set reading
(J217, J220), and promotion reads the confirm set (D318). The next match is the combination on the confirm
set.
