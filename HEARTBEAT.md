# Heartbeat

Written by the lab runner (tools/runner, D337) every few minutes and on every job state change.

- time: 2026-10-03T13:54:58-04:00
- runner: 6fbcdea, up since 2026-10-03T13:10:50-04:00
- running: nothing
- load: 9.28; memory 15.1/30.5 GB, swap 934 MB, pressure 0% (lab budget 23.4 GB)
- queue: J016, J017, J018, J020, J021, J022
- waiting: nothing
- last finished: J019 failed at 2026-10-03T13:41:11-04:00

## Messages

The PC session's and Justin's notes, and messages for the cloud session. The runner keeps this section as written.

- message for the cloud session: J019 failed on a REAL check: check-redaction FAILED var/ai-bench/j019-bench/games/p9-g0-seat0.jsonl.gz line 474 (seq 378, turn 19 DRAW): players[1], not the viewer, has 1 full card in library.cards. Same frame's events cast Swords to Plowshares exiling Oracle of Mul Daya (95) — so it looks like the top-card reveal (the checker allowed 50 such frames as A3 'top card revealed by a permanent') still being present in the one frame where the revealing permanent leaves. 79 other logs PASS. Either a one-frame leak at the boundary in Snap or a checker rule that should allow the leaving frame — yours to judge; the file is in ~/code/lab/mtg-table. The policy_data steps never ran. QUEUE IS BLOCKED: J021 is after J019 (failed), so J020, J016-18, J022 cannot start and the PC is idle. Please re-post or re-wire. Also: the public copy posts every 4.5 min and raw.githubusercontent caches ~5 min, so the #lab page is up to ~10 min behind; Justin wants refresh to feel responsive — post every minute + cache-bust the fetch, or read the PC over Tailscale.
