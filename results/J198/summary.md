# J198 — the faster seat: read 2026-11-08 23:05 EST

**Reading (pre-registered, D517's shape with a −10 Elo bar): INCONCLUSIVE AT 4,800.** search-v2-ms750-r6 (0.75 s, 6 rounds)
against search-v1-anytime (the live 1.5 s seat) on the confirm set, 4,800 games, 2,400 mirrored pairs, 0 errors, 0 timeouts:
49.06% [48.32, 49.81], Elo −6.5 [−11.7, −1.3]. The interval excludes 0 — the faster seat *is* weaker, by about 1 to 12
Elo — and contains the −10 bar, so neither HOLDS nor FAILS fires. The live seat stays at 1.5 s (liveSeatChanged 0).

**Cost it measured:** 552 against 955 ms a decision (×0.58), 8.9 against 14.8 rollouts a decision (×0.60), budget fallbacks
2.2% against 0.6%, decisions decided on fewer than two rounds 13.7% against 4.4%. J195 (c), the same matchup at 1,200
games on other deals, read −4.6 [−14.3, +5.0]; the two agree and are not pooled.

**What it decides:** the owner's conditional ("move the live seat to 0.75 s if J198 holds") does not fire. Half the wait
costs about 6 Elo; that is the answer the job was posted to measure, and a further 4,800 to place the point against −10
would only narrow a number that already says the seat is weaker. The seat question is closed as information; no seat
change, no repost. The runner's own report is `report.md` beside this file.
