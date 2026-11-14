# J218: the deeper horizon at three times the clock, on the declined + instant pair, 4,800 games on the dev set (D545)

2026-11-13 10:09 to 2026-11-14 05:00, mtg-table `23854dd`, alone, 7 workers. One fixed 4,800-game match (2,400
mirrored pairs, the dev set `tools/ai-bench/pairs-dev.txt`, blocks 655,900,000-655,900,599, host `j218`, no
stopping rule): `search-v3-declined-instant-t1-x3` (`9aeacaff9142`: the pair with `turns=1` and `ms=4500`, so
priority and attack rollouts both play to the end of the opponent's next turn) against
`search-v3-declined-instant` (`af6771947a25`, the live seat since D546, search-v4). Complete and valid: 4,800
games, 0 draws, 0 engine errors, 0 timeouts, every name, hash, config, set and block check passed, both sides'
lands counters at 0, and A's rollouts were the deeper ones (140.4 against 49.4 ms of play a rollout, x2.84; the
trace's bar is 1.3). The numbers are in `report.md` and `verdict.json` beside this file; this is what they say.

**The answer: SHOWN, a measured gain.** 2,510 wins of 4,800, score 0.5229 [0.5136, 0.5323], **+15.9 Elo
[+9.4, +22.5]**. The interval is well above 0. The point sits on D519's +15 line, not clear of it: seven fewer
wins (2,503) would have read SMALL GAIN at +14.9. Read it as "a gain of about +16, at least +9", not as "more
than +15".

**It is the first depth arm to read above 0, and the largest gain of any search key since the search went
live.** J212's `t1-x3` on the old base read +9.8 [-1.7, +21.4] at 1,200 games on the confirm set; this is the
same horizon on the new base, on decks no deeper rollout had been played on, at four times the games. Positive
1,200-game points have shrunk at 4,800 before (D519 point 8); this one did not.

**The timed-out-games sensitivity (D545 point 8):** there were no timed-out games and no errors, so the score
with every timeout counted as A's loss is the same 0.5229.

**The cost: three times the thinking.**

| | A (`t1-x3`) | B (the live seat) | ratio |
|---|---|---|---|
| search seconds a game | 70.4 | 22.3 | x3.15 |
| ms a searched decision | 2,800 | 900 | x3.11 |
| rollouts a decision | 18.5 | 15.8 | x1.17 |
| complete rounds a decision | 7.1 | 6.2 | |
| decisions short of two rounds | 2.4% | 3.1% | |
| ms of play a rollout | 140.4 | 49.4 | x2.84 |
| budget fallbacks | 0.91% [0.66, 1.16] | 0.69% [0.55, 0.83] | |
| rollouts cut inside one engine step | 323 | 83 | |

About 48 more seconds of AI thinking a game, and a searched decision takes 2.8 s where it takes 0.9 s now. The
clock bought the evidence back (A is short of two rounds less often than B), which is what J212's starved `t1`
at 1.5 s lacked. The seconds are this machine's (D388).

**What changed in play.** A changed Forge's answer in 20.0% of its searched decisions against B's 18.8%
(priority 21.1% against 19.4%, attacks 16.2% against 16.6%): the difference is in priority decisions, not
attacks. A turned Forge's pass into a play as often as B (7.6% of priority decisions on both sides) and turned
a play into another play or a pass more often (7.2% against 6.6%, 6.2% against 5.3%). The pair's two keys fired
on both seats as in J215 and J216 (declined 3.8 and 3.7 windows a game, instant 2.3 and 2.0), 1 retry in 4,800
games.

**What it does not say** (D545 point 6). Not which depth carried it, the priority rollouts' or the attacks',
and not how much is the clock. On the clock there is outside evidence: more clock at the old horizon bought
nothing (x0.25 to x4 against search-v2: -14.5 to +1.7 Elo, J194, J195, J198), so the gain is the horizon, and
the clock is what the horizon needs to be fed. Never pooled with J212 (other players, another opponent, other
deals).

**What it earns** (D545 point 5). `search-v3-declined-instant-t1-x3` is a **live-seat candidate for the owner**,
under a separate decision, with its cost beside it. The horizon track stays open. This job moves no seat
(`liveSeatChanged` 0); the live seat is search-v4 as before.

**The PC session's recommendation: do not adopt at 4.5 s yet.** The cost is not only the table's wait. The live
seat is the lab's baseline, and every later match against a seat that thinks three times as long takes about
twice the night (this match took 18.7 h against J216's 8.6 h). Two cheaper arms say whether the gain can be had
for less, and they are next:

1. **The cheaper clock** (D545's registered follow-up): the same player at `ms=3000`. Does most of +16 survive
   at twice the thinking instead of three times?
2. **Attacks only**: `aturns=1` with `turns=0` at the live seat's 1.5 s. In J212 the attack arm cost x1.13 to
   x1.20 and read +5.2 [-5.7, +16.2] at 1,200 games. If the attack rollouts carry part of the gain, that part
   is nearly free.

After that, the engineering lane is the rollout itself: a deep rollout costs 140 ms of play against 49, and a
cheaper deep rollout is the same depth without the clock.

**The pilot.** Played: 4 ladder and 4 recorded games, 0 errors or timeouts, 0 of 165 decisions short of two
rounds, recorded horizon 1 on 60 priority and 18 attack decisions and no other horizon, play a rollout 90.9
against 31.5 ms (x2.89), longest game 99.8 s.

**The run.** 18.7 h; D545 point 10 expected about 17 h (16 to 20). Fifteen memory-pressure drops in STATUS
(swap-in bursts; 7 workers to 6, twice to 5), each raised back within 5 to 15 minutes; no block retried. The
job itself held 6 to 9 GB of its 21.4 GB budget, so the pressure came from outside it: the PC session's scenery
painting was the other load on the machine through the night. Both seats of every game share the machine, and
the pairs are mirrored, so the pressure does not favour a side; it shows as the slightly higher budget-fallback
rates on both. It ran alone among lab jobs (D521).
