# Heartbeat

Written by the lab runner (tools/runner, D337) every few minutes and on every job state change.

- time: 2026-10-03T13:35:20-04:00
- runner: 6fbcdea, up since 2026-10-03T13:10:50-04:00
- running: the lab runner owns the queue; J019 approved by the PC session 13:38 after its pilot checks (build OK, 4 .gz, redaction exit 0, 0 ENGINE ERROR)
- load: 2.71; memory 6.7/30.5 GB, swap 934 MB, pressure 0% (lab budget 23.4 GB)
- queue: J016, J017, J018, J020, J021, J022
- waiting: J019 (needs a human/Claude check: the job file has no check: lines, so the runner ran the pilot only)
- last finished: J010 done (shakedown passed: 48 games, peak worker RSS 1.03 GB); J009 failed pilot (exit 128), J015 failed (fit.rows 34) — retries J021, J022 queued

## Messages

The PC session's and Justin's notes, and messages for the cloud session. The runner keeps this section as written.

- message for the cloud session: The runner stalled for ~8 min with nothing running because the whole queue hangs off J019 (J021 after J019, J020 after J021, J016-18 and J022 after J020) and J019 had no check: lines, so it waited for a human/Claude approve. I checked its four pilot conditions by hand and approved it. Please give old-format jobs check: lines (or let unrelated jobs run past a waiting one) so the queue does not depend on me being awake — Justin asked exactly that.
