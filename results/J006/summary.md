# J006: failed (pilot)

The pilot's "typecheck, tests and dry run all pass" check failed: `npm test` exited 1, with
9 of 702 tests failing, all in `src/launcher.test.ts` (`forgecoach.sh > overnight`). Per the
README, the full job (`--repeat 3 --label J006-classic-r3`) and its `--compare` were **not**
run. All the other pilot checks passed.

- mtg-table: `e54aa16` in the worktree `~/code/mtg-table-main` (J003 keeps
  `~/code/mtg-table` on `ee4d127`, untouched). The engine and queueing helper run from that
  worktree as the systemd user unit `forgecoach-engine`.
- ForgeCoach: `be989fa` (main, after `git pull` and `npm ci`).

## Pilot checks

| check | result |
|---|---|
| selftest prints "coach-helper-selftest OK (67 checks)" | pass (main session, before this run) |
| `/health` has `"concurrency":1` and `"queue":{"max":4` | pass (`health.json`) |
| exactly one of q1/q2 has a `queued` line; both end with `{"type":"done",...}` | pass: q1 0, q2 1; both end `{"type":"done","stopReason":"end_turn","model":"claude-haiku-4-5-20251001"}` |
| typecheck passes | pass (`typecheck.txt`) |
| **tests pass** | **FAIL**: `npm test` exit 1, 9 failed / 693 passed (`npm-test.txt`) |
| dry run passes | pass: "28 cases built ... every answer is legal", exit 0 (`dry-run.txt`) |
| pilot bench exits 0, 0 transport errors, at most 1 format failure, each answer 5-30 s | pass: exit 0, 0 of 5 transport, 0 of 5 format, answers 5.1-10.1 s (median 7.0, p90 10.1) |
| at least 4 of 5 answers state a confidence | pass: 5 of 5 (4 high, 1 medium) |

Pilot bench: score 1.00 [1.00, 1.00] over 5 spell cases, acceptable 100%, model
claude-sonnet-5-5, prompt classic. Files: `2026-10-03T14-54-10Z-J006-pilot.json` / `.md`.
Retry lines: 0.

## Why the tests fail (diagnosis, no code changed)

The 9 failing tests run `public/forgecoach.sh overnight` against a fake mtg-table and a fake
`HOME`, but the launcher's preflight also calls `health 8642` (`curl
http://127.0.0.1:8642/health`), and the test does not isolate that port. On this PC the
engine this job requires (`play.sh --engine-only`, unit `forgecoach-engine`) answers `ok`
there, so the launcher prints "The Forge engine is running (a game may be open)", has no TTY
to ask, and returns 1 ("expected 1 to be +0"). The status tests likewise print
"[ok] Engine running ...".

Confirmed: the same file run in a private network namespace with only loopback up
(`unshare -rn sh -c 'ip link set lo up && npx vitest run src/launcher.test.ts'`) passes
23/23. So this is a test-isolation bug that shows up whenever an engine is live on 8642,
not a coach regression; the coach bench itself was healthy.

To unblock: either waive this check for J006 (the failures are in the overnight launcher,
which the bench never uses), or make the test stub `health` / use a port nothing listens on,
then re-post J006. J007 (`after: J006`) is left `waiting`.
