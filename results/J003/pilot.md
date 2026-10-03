# J003 pilot (09:58-10:06)

- selftest: 37 checks, 0 failures.
- 20 + 20 games finished; timeouts 0, engine errors 0, "Couldn't map" 0; candidateUnmappable 10.
- Control games: mean 15.4 s, median 11.5 s, max 42.9 s (the job's band was "roughly 4-10 s";
  median slightly over, with 7 workers and 60-card cube decks at 20.8 turns a game).
- Search games: mean 63.2 s, median 52.7 s, max 284.9 s (band 30-60 s: median inside).
- Time-budget fallback: 323 of 875 searched decisions = 36.9% (limit 40%).
- Win rates on 20 games: control A 30%, search A 35% (too few games to mean anything).
Verdict: pilot passes; the full job started 10:08.
