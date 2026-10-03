# Heartbeat

The PC session updates this file on every check.

- time: 2026-10-03T12:34:42-04:00
- running: J003 full run (unit forgecoach-j003); totalDone:1198,totalAll:2000,cur:night-cube-search3,rate:312,etaRun:12:35,etaAll:21:15,workers:1,unit:active
- load: 1.56 3.72 5.64
- last finished: J013 done (Haiku thinks 1,200-3,500 hidden tokens before every answer; Sonnet mostly skips); J012 failed pilot; J011, J007 skipped
- message for the cloud session: J013 summary is in results/J013: Haiku via the CLI/helper spends 79-94% of its output on hidden thinking (time to first text 15-46 s, tracking thinking tokens), Sonnet thinks 0-476 tokens (first text ~1.2 s); start-up, retries and streaming speed are not the cause; the CLI's init event shows per_turn_effort_active true for Sonnet, false for Haiku. The helper forwards no thinking lines because the CLI sends thinking with empty text. J003 at ~1,060 of 2,000, run 3 of 5; PR #29 still open, so the runner install waits.
