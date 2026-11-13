# J215: declined spells and instant-speed windows together, 4,800 games (D541)

2026-11-12 12:34 to 21:09, mtg-table `1eaa00d3`, alone, 7 workers. One fixed 4,800-game match (2,400 mirrored
pairs, the confirm set, blocks 519,900,000-519,900,599, host `j215`, no stopping rule):
`search-v3-declined-instant` (`af6771947a25`, search-v3 with `declined=1` and `instant=1`) against
`search-v2-no-b` (the live seat, `59505e241363`). Complete and valid: 4,800 games, 0 draws, 0 errors, 0 timeouts,
every name, hash, config and block check passed, no D540 counter moved on the B side and A's lands counters stayed
at 0. The numbers are in `report.md` and `verdict.json` beside this file; this is what they say.

**The answer: SMALL GAIN, a measured gain.** The search plays a little better against the live seat when it
considers the spells Forge's per-card AI declines and the empty-stack instant-speed windows together: 2,448 wins
of 4,800, score 0.510 [0.502, 0.518], **+6.9 Elo [+1.4, +12.5]**. The interval is above 0 and the point is under
D519's +15 line, so the reading is SMALL GAIN, not SHOWN. Under D541 this names a **live-seat candidate for the
owner**, under a separate decision and a seat-queue row (D509), with its cost beside it: 21.9 against 19.2 search
seconds a game (x1.14, 2.7 s more a game). This job changes nothing: the live seat is `search-v2-no-b` as before
(`liveSeatChanged` 0).

It is the first change to what the search does whose interval is clear of 0 against the live seat of its night.
J211's no-block seat (4,800 games) and the six one-key arms of J212 and J214 (1,200 games each) each read between
-2 and +10 Elo with 0 inside the interval.

**What it does not say.** Which key carried it: nothing here ablates them, and J214's two one-key arms
(`search-v3-declined` +5.8 [-4.6, +16.2] and `search-v3-instant` +10.4 [-0.7, +21.5], 1,200 games each, both
INCONCLUSIVE AT 1,200) stay beside this match as they were, never pooled with it and never read against it. Nor
that the gain is as large as +12: the lower end is +1.4.

**The exposure: both keys fired far above the 0.25-a-game floor.**

| key | windows a game | candidates a window | decisions changed a game | retries (all 4,800 games) |
|---|---|---|---|---|
| declined | 3.46 | 1.17 | 0.382 | 2 |
| instant | 1.80 | 2.24 | 0.234 | 0 |

The declined key listed 19,968 aimed spells (4.16 a game) and dropped 22,897 that had no legal target (4.77 a
game). A retry is a widened pick that did not happen (under `declined` most likely a card left in the stack
zone); it counts against the player uncorrected, and there were 2 in 115,641 searched decisions. The match's
counters cannot say how often a declined spell was a candidate in an instant-speed window: the declined counter
counts both kinds of window, and the pilot's four recorded games can only show none there (8 instant-speed
decisions recorded, 7 of them with 2 candidates and 1 with 3, none on a stack). The retry count in those windows
is a lower bound.

**The cost.** A searched 115,641 decisions against B's 101,684 (the instant windows are the extra 13,400
priority decisions), at 909 against 905 ms a searched decision, so the 14% is more decisions searched, not
slower ones. Rollouts a decision 15.5 against 15.4; decisions with fewer than 2 rounds 3.5% on both sides; budget
fallbacks 0.6% on both sides. A changed Forge's play in 18.3% of its searched decisions, B in 18.2%. The seconds
are this machine's (D388).

**The install at an instant-speed step (D540 point 5).** On a copy, after a forced pass in the opponent's turn
the opponent is asked once more before the step ends, which can only help the opponent after a pass, so the
instant key's rollouts lean against passing, toward keeping Forge's play. The gain was measured with that lean in
place.

**The pilot.** Played: 4 ladder and 4 recorded games, 44 declined windows and 21 instant windows, 0 errors,
timeouts or retries; recorded searched priority decisions 50 in the own main phase, 0 in a land window, 8 at
instant speed, 0 on a stack.

**The run.** 8.45 h against the 9 h estimate. Four pressure events in STATUS (two drops to 6 workers, at 16:04
and 20:21, each raised back within seven minutes); no block retried. It ran alone (D521).

**Next.** The candidate goes to the owner as seat-queue row 10 with a recommendation to adopt (a measured gain
for 2.7 s a game); adopting it is a decision of its own. J216 (D542, deeper rollouts where the shallow ones have
settled) is the next match and plays against the live seat as it stands when it is posted.
