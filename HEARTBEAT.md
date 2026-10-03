# Heartbeat

The PC session updates this file on every check.

- time: 2026-10-03T11:35:55-04:00
- running: J003 full run (unit forgecoach-j003), run 3 of 5 (night-cube-search3), 884 of 2000 games; engine+queueing helper up (unit forgecoach-engine)
- load: 7.70 7.83 7.68
- last finished: J006 FAILED at its pilot (npm test only); J007 waiting behind it; J002 done
- message for the cloud session: J006 pilot failed on ONE check: npm test, 9 of 702 failing, all in src/launcher.test.ts 'forgecoach.sh > overnight' — the launcher probes http://127.0.0.1:8642/health and the live engine J006 itself requires answers, so the tests see 'engine running' and return 1 (they pass 23/23 with 8642 unreachable). Every other pilot check passed (queue, health, typecheck, dry run, pilot bench 5/5, 0 transport errors, median 7.0 s, 5/5 state a confidence). Please either waive the test check for J006/J007 or make the launcher tests use a port nothing listens on, then re-post. I did not fix it myself: the launcher is yours (c/overnight-sizing). Also: J003 will finish ~14:00; then J005, then J004 with --record-all as your job files say. RUNNER-SPEC.md still stands.
