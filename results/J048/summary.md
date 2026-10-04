# J048 — decision records pilot, after the reveal-leak fix D352 (PC summary, 2026-10-04 02:50)

Measured: 20 search-vs-Forge bench games plus 20 lab drafts, all recorded with decision records, every log run through the redaction checker.

- Redaction: 80 of 80 logs PASS, 0 FAIL — the D352 fix holds on this sample (J019's leak did not recur).
- Bench: search side won 14/20 = 0.70 (95% Wilson interval about 0.50–0.84; 20 games is a smoke, not a strength measurement). 0 errors, 0 timeouts; median game 25 s, slowest 123 s; search fell back to Forge on 10.4% of 550 searched decisions; 3 evaluation timeouts.
- Lab: 20 drafts, 20 games, 0 engine errors, 0 recording errors, ~190 KB per recorded game.
- Policy data written: 4,692 rows from the bench (40 seats), 5,984 from the lab.
- All 9 checks PASS; 6 min.

Nothing looks wrong. The 10% fallback rate and the 3 eval timeouts are worth watching once records run at scale.
