# J195 read (2026-11-07, the PC session): the knobs and the curve's lower half

Pin ea313c01 (D517). Ran 10:13–18:35 EST on 7 workers beside the scenery GPU queue; 4 × 1,200 games on the confirm
set, the same 600 deals as J194; 0 errors, 0 timeouts; 40/40 final checks PASS. The rule was pre-registered in D517
and quoted by the job before any game; this read applies it and adds nothing to it.

## The knobs (the play-AI review's §5 row 6)

| match | score [95%] | Elo [95%] | ms a decision (arm / search-v2) | rollouts a decision | reading |
|---|---|---|---|---|---|
| (a) search-v2-routlets vs search-v2 | 0.510 [0.4962, 0.5238] | +6.9 [−2.7, +16.6] | 984 / 978 | 14.45 / 14.52 | **INCONCLUSIVE** — lower end below 0.5, upper end above +15; exposure 74 of 1,200 games (6.2%, above the 3% bar, so not UNEXPOSED) → confirm with 4,800 games (J197, drafted tonight) |
| (b) search-v2-ranked vs search-v2 | 0.4825 [0.4692, 0.4958] | −12.2 [−21.4, −2.9] | 904 / 906 | 15.52 / 15.61 | **NOT SHOWN** — upper end below +15; at no cost in time, the one-step prior on the ~8% of wide decisions made the seat measurably worse |

**The knob track stays open** on (a) alone. (b) closes its half for this deck set: D389's candidate ranking is a loss,
not a wash, and nothing further is planned for it.

## The curve's lower half (no verdict; read beside J194's upper half)

| arm | Elo vs search-v2 [95%] | ms a decision | rollouts a decision (× search-v2) | budget fallbacks | reading |
|---|---|---|---|---|---|
| (c) ×0.5: 750 ms, 6 rounds | −4.6 [−14.3, +5.0] | 535 | 9.28 (0.60×) | 1.5% | indistinguishable from search-v2 (interval contains 0); NOT "at most 10 Elo weaker" (lower end −14.3) |
| (d) ×0.25: 375 ms, 3 rounds | −14.5 [−26.1, −2.9] | 314 | 5.54 (0.36×) | 6.2% | weaker than search-v2 by [2.9, 26.1] Elo; changed Forge's answer at 15.8% of searched decisions against search-v2's 18.4% |

**The whole curve, one deck set, the same 600 deals**, each arm against search-v2: ×0.25 −14.5 [−26.1, −2.9] ·
×0.5 −4.6 [−14.3, +5.0] · ×1 0 by definition · ×2 (J194) −4.1 [−13.1, +5.0] · ×4 (J194) +1.7 [−6.7, +10.2]. Forge
itself sits at −87.5 [−103.2, −72.1] (J194 a). Read: the search's strength is a step from Forge to about ×0.5 and a
plateau from ×0.5 to ×4, flat within about ±10 Elo at 1,200 games a point; only the ×0.25 arm, at ~5.5 rollouts and
one round short of overruling Forge on 6% of decisions, falls off it. The live seat stays search-v2 at 1.5 s and 12
rounds (D514 point 3); whether 750 ms is "free" is a question for a 4,800-game match and a separate decision, not
asked here.

## What follows

- **J197** (drafted 2026-11-07 evening, posted behind J196): search-v2-routlets vs search-v2, 4,800 games, D517's rule
  at that size; SHOWN makes the knob a candidate for the live seat under its own decision; NOT SHOWN closes the knob
  track for this deck set.
- Cube-lab follow-up 38 (a rollout-level outlet counter) stands; J195's exposure reading used the outer seat's
  `opportunity.*` keys as the proxy, 6.2% of games, in line with J194's 5.3–6.0%.
- The review's §5: rows 4 and 5 were closed by J194; row 6 is half closed by this night; row 7 is J196, running now
  (encode, merge and split audit passed: 271,643 games, v2's 916 test pairs intact, none trained on); row 3 waits on
  the owner's games.
