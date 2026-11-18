# J223: the combination on the confirm set, search-v3-wide-t1-x2 against the live seat search-v3-wide, 4,800 games (D551)

2026-11-17 06:39 to 2026-11-18 00:39 (18.0 h; the match itself 17.81 h), mtg-table `2802940`, alone, 7 workers
(4 to 6 for parts of the run under memory pressure, 30 drops and raises; the scenery painting shared the
machine's memory until 23:48). One fixed 4,800-game match (mirrored pairs, the confirm set
`tools/ai-bench/pairs-confirm.txt`, blocks 405,900,000-405,900,599, host `j223`, no stopping rule):
`search-v3-wide-t1-x2` (`709c83cc4d48`: the live seat with the rollout horizon one turn deeper and twice the
clock, 3 s) against `search-v3-wide` (`b95340935592`, the live seat since D550, search-v5, 1.5 s). A's seat
config is B's with `ms=3000` and `turns=1` and nothing else (4,800 of 4,800 lines exact). The pilot's gate
passed (4 + 4 games, 0 errors, A's wide windows open, every recorded horizon 1, play a rollout x2.926) and the
match was played. Complete and valid: 4,800 games, 0 draws, 0 engine errors, 0 timeouts, 2,400 mirrored pairs,
30 deck pairs at 160 games each, 28 of 28 checks passed. The numbers are in `report.md` and `verdict.json`
beside this file; this is what they say.

**The answer: SHOWN, a measured gain.** 2,516 wins of 4,800, score 0.5242 [0.5150, 0.5333],
**+16.8 Elo [+10.4, +23.2]**. The lower end is far above 0 and the point is above D519's +15 line. This is the
first reading of the deeper search against a seat that already has the wide windows, and the first of the
combination on the confirm set.

**The recommendation (D551 point 7): RECOMMEND.** The PC session recommends to the owner that the live seat
become `search-v3-wide-t1-x2` at a 3 s clock. The size and the cost, beside the word:

| | search-v3-wide-t1-x2 (3 s) | search-v3-wide (live, 1.5 s) | ratio |
|---|---|---|---|
| search seconds a game | 56.8 | 23.1 | x2.46 |
| ms a searched decision | 2,077 | 847 | x2.45 |
| ms of play a rollout | 117.9 | 46.3 | x2.55 |
| rollouts a decision | 16.12 | 16.00 | x1.01 |
| decisions short of two rounds | 4.59% | 2.96% | |
| budget fallbacks | 1.16% [0.95%, 1.38%] | 0.56% [0.46%, 0.66%] | |
| step timeouts | 165 | 40 | |

So: about +17 Elo (a 52.4% score against the seat at the table today) for about two and a half times the
thinking, 2.1 s a searched decision against 0.8 s, close to a minute of thinking a game against 23 s. The
seconds are this machine's (D388). The clock is the owner's; adoption is a later decision (D552 on); nothing
changes at the table until the owner says so.

**Both sides had the wide windows open and used them.** A: stack windows 1.479 a game, pass 0.472,
declined-activation 1.822, all above their floors; 2,079 decisions changed by the three keys, 0.433 a game.
B: 1.495, 0.471, 1.742; 1,502 changed, 0.313 a game. A's stack windows refused 7.0% of those met. No land was
searched on either side. The deeper rollout held its count at the 3 s clock (16.12 against 16.00 rollouts a
decision).

**What changed in play.** A changed Forge's priority decision in 20.6% of its priority decisions against B's
18.5%, and its attack in 16.6% against 16.5%; from pass, to another play, to pass 8.2%, 6.6%, 5.8% against
7.5%, 6.0%, 4.9%.

**Beside the earlier matches (never pooled, never read as a difference: D551 point 8).** Each of these was
against the older seat `search-v3-declined-instant` (search-v4), not against J223's B:

| match | player | clock | set | Elo [95%] |
|---|---|---|---|---|
| J217 | search-v3-wide | 1.5 s | confirm | +6.9 [+1.5, +12.4] |
| J220 | search-v3-declined-instant-t1-x2 | 3 s | confirm | +14.2 [+7.8, +20.6] |
| J222 | search-v3-wide-t1-x2 | 3 s | dev | +20.7 [+14.1, +27.3] |
| **J223** | **search-v3-wide-t1-x2** | 3 s | confirm, **against search-v3-wide** | **+16.8 [+10.4, +23.2]** |

**No seat moved.** `liveSeatChanged` is 0; the live seat is still `search-v3-wide` (search-v5) at 1.5 s.

**What is not read.** Whether the gain is the deeper horizon or the doubled clock (the two were only ever
played together at this horizon); and how a 3 s clock feels at the table, which no match measures.
