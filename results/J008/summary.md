# J008: failed (pilot)

One pilot check failed: "every answer takes 5–30 s". Two of the five pilot answers came back
under 5 s (4.78 s and 4.86 s). Per the README, the full job (`--repeat 3 --label
J008-classic-r3`) and its `--compare` were **not** run. Every other pilot check passed, and
the answers themselves look healthy: Sonnet, legal, all acceptable.

- mtg-table: `e54aa16` in the worktree `~/code/mtg-table-main` (J003 keeps `~/code/mtg-table`
  untouched). The engine and queueing helper were already running from that worktree as the
  systemd user unit `forgecoach-engine`, healthy, so they were not restarted.
- ForgeCoach: `2bf68d4` (main after `git pull` and `npm ci`; it contains 8cc33bd).

## Pilot checks

| check | result |
|---|---|
| selftest prints "coach-helper-selftest OK (67 checks)" | pass (`pilot/pilot-selftest.txt`) |
| `/health` has `"concurrency":1` and `"queue":{"max":4` | pass (`pilot/pilot-health.txt`) |
| exactly one of q1/q2 has a `queued` line; both end with `{"type":"done",...}` | pass: q1 0, q2 1; both end `{"type":"done","stopReason":"end_turn","model":"claude-haiku-4-5-20251001"}` |
| typecheck, tests and dry run pass | pass: tsc clean; vitest 46 files, 767/767; dry run "28 cases built ... every answer is legal" (`pilot/pilot-tests.txt`). The #32 fix works: the launcher tests pass with the engine live on 8642. |
| pilot bench exits 0, 0 transport errors, at most 1 format failure | pass: exit 0, 0 of 5 transport, 0 of 5 format, 0 retry lines |
| **every answer takes 5–30 s** | **FAIL**: 8.10, **4.78**, 6.91, 11.78, **4.86** s (`latencyMs` 8096, 4776, 6908, 11781, 4857) |
| at least 4 of 5 answers state a confidence | pass: 5 of 5 (4 high, 1 medium) |

Pilot bench: score 1.00 [1.00, 1.00] over 5 spell cases, acceptable 100%, model
claude-sonnet-5-5, prompt classic; latency mean 7.3 s, median 6.9 s, p90 11.8 s. The two
fast answers are `spell-comfort13-first-land` and `spell-yield13-turn1`, both one-land,
turn-1 decisions that answered correctly (`land:9`, `cast:9`). They are complete Sonnet
answers, not errors or cached replies. J006's pilot answers on the same cases ran 5.1–10.1 s,
so the bound was close then too.

Files: `2026-10-03T15-37-13Z-J008-pilot.json` / `.md`, and `pilot/` (selftest, health,
q1/q2, npm ci tail, typecheck/test/dry-run output, bench output).

## To unblock

The failing check looks too tight at its low end, not like a sign of bad data. Either waive
its lower bound for this job, or change it (for example to "under 30 s" or "3–30 s"), then
re-post. J007 (`after: J008`) stays `waiting`.
