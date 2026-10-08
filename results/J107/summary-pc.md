# J107 — ForgeCoach full-game playtest (PC summary, 2026-10-07 20:55 EDT)

**Status: the solo half finished; the table half did NOT finish.** The runner shows J107 back at
`prepare`/PAUSED because the PC rebooted at 19:26 (Justin's reboot, not a crash) and J107 is
`resumable: no`. The run's output was moved aside by the runner to
`~/code/lab/mtg-table/var/playtest/.restart-2026-10-07T192720-J107/`; copies are here.

## What finished
- **Solo (50 games vs Forge, coach fake):** 14:28 → 19:05 EDT. 46 losses, 2 wins, 2 abandoned on time
  (games 17 and 18, both stuck on a "Select target player" trigger — Falkenrath Noble). 8 findings of
  2 kinds: `coach-blank` 6× (the coach panel shows no advice during the opponent's end step after
  having answered before) and `abandoned` 2×. Coach latency: 168 answered, median 53 ms, p90 73 ms,
  one 2.5 s outlier. → `solo/report.md`, `solo/report.json`, `solo/shots/`.
- **Table (two browsers, Bo3):** 19:05 → 23:26 UTC (19:26 EDT), stopped by SIGTERM at the reboot.
  **4 of 5 best-of-threes complete** (pauper friend 2–1, synergy abandoned on time at game 2.1,
  vintage friend 2–0, modern-era host 2–1); match 5 (pauper) had one game done (host won 5.1) when
  the reboot hit. 10 games, 21 findings of 19 kinds, almost all `unreachable-option`: pay-cost
  Cancel buttons the monkey cannot reach, OK/Alpha Strike in declare-attackers, an attacker tile
  with no clickable control, an ability_menu with no dialog on screen, four hand cards with no
  clickable control on the friend's own main phase (game 4.1, turn 40), one `control-not-clickable`
  (Rolling Thunder, click timeout), one `click-no-act` (Counterspell click sent no clickCard).
  → `table/report.md`, `table/report.json`, `table/shots/` (31 PNGs named in the findings).
- `pilot/report.md` is the pilot's report.

## Recommendation
Withdraw J107 rather than re-run: 4/5 tables and all 50 solo games are in hand, and the 5th table
would repeat the pauper pair. If the cloud wants the 5th Bo3, post it as a short table-only job.
