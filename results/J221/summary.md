# J221: search-v3-wide against the live seat on the dev set, 4,800 games (D548), and the pooled read with J217

2026-11-15 01:31 to 11:02, mtg-table `afe4f3e`, alone, 7 workers (5 to 7 under memory pressure). One fixed
4,800-game match (mirrored pairs, the dev set `tools/ai-bench/pairs-dev.txt`, blocks 199,900,000-199,900,599,
host `j221`, no stopping rule): `search-v3-wide` (`b95340935592`: the live seat plus the three wider windows,
stack, pass and declined activations) against `search-v3-declined-instant` (`af6771947a25`, the live seat,
search-v4). The pilot's gate passed (8 games, every window kind opened, 0 errors) and the match was played.
Complete and valid: 4,800 games, 3 draws, 3 engine errors and 0 timeouts in the rows (the cap is 240), 2,399
mirrored pairs, 30 deck pairs at 160 games each, every name, hash, config, set and block check passed, B clean
of A's keys, A's lands counters at 0. The numbers are in `report.md` and `verdict.json` beside this file; this
is what they say.

**The answer by itself: NOT SHOWN, indistinguishable.** 2,423 wins of 4,797 decisive games, score 0.5052
[0.4981, 0.5123], **+3.6 Elo [-1.3, +8.6]**. The interval crosses 0, and its top is under D519's +15 line.

**The pooled read with J217 (D548 point 8, written before any game): the lower end is above 0.5.** J217 was
the same two seats on the confirm set: +6.9 Elo [+1.5, +12.4]. Together, 4,799 pairs over two deck sets:
score 0.5076 [0.5023, 0.5129], **+5.3 Elo [+1.6, +9.0]**. Under D548's rule the recommendation to adopt
`search-v3-wide` **stands**, by the pooled line and not by J221 alone: J221 is not a measured loss and the
pooled lower end clears 0.5.

**What that is worth.** A small real gain, about +5 Elo, and no more than about +9. The two sets agree within
their widths (+6.9 and +3.6); the dev set did not repeat the confirm set's reading by itself.

**The windows were open.** The three keys all sat above their floors on every game read:

| key | windows a game | floor | candidates a window | changed decisions |
|---|---|---|---|---|
| stack window | 1.54 | 0.25 | 2.14 | 859 |
| pass window | 0.42 | 0.10 | 2.20 | 152 |
| declined activations | 1.77 | 0.25 | 1.05 | 445 |

The union changed 1,456 decisions, 0.30 a game (the rate is 0.25; J217 had 0.28). Stack windows refused: 551,
a share of 0.069 (J217 0.088). Retries: 5 in 4,800 games.

**The cost.** A searched more decisions (125,130 against 114,453) at the same time a decision (897 against
895 ms), so 23.4 against 21.3 search seconds a game, x1.095. D519 point 5's "no cost" flag is 1: the cost a
decision is the live seat's. Budget fallbacks 0.6% against 0.5%. The seconds are this machine's (D388).

**What changed in play.** Little, as the size of the gain says. A changed Forge's priority decision in 18.4%
of its priority decisions against B's 19.1%, and its attack in 13.9% against 14.1%; from pass, to another
play, to pass 7.9%, 5.9%, 4.6% against 7.7%, 6.5%, 4.9%.

**No seat moved.** `liveSeatChanged` is 0. Adopting `search-v3-wide` as the live seat is the owner's call
under a separate decision; the evidence for it is the pooled +5.3 [+1.6, +9.0] at x1.095 the search time a
game. Beside it and never pooled with it: J218's `t1-x3` (+15.9 at x3.15 the clock) and J219's attack horizon
(NOT SHOWN). J220 (the cheaper clock) plays next.
