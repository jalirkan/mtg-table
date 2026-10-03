# J001 — the channel works, and the machine

Output of the commands is in `output.txt`: origin/main is ee4d127 (mtg-table, PR #20 search AI) and
39eb318 (ForgeCoach, PR #29); 16 threads (Ryzen 7 9700X, 8 cores); 30 GB RAM, 12 GB available at
09:51 with the lab's last job running; load 17.1 / 10.4 / 12.6; OpenJDK 21.0.12.1; Node v24.20.0.
GTX 1080 present (no lab job uses it).

Local changes: none in either checkout (`git status -s` empty). mtg-table is at e49800e (one behind
origin/main: PR #20 is not pulled yet, on purpose — the cube lab was running on this checkout and
`bridge/build.sh` under running workers is unsafe). ForgeCoach is on main at 39eb318; playwright-core
and its Chromium were installed earlier today for e2e:draft (`npm install --no-save`, so `npm ci`
removes it again).

Running now / today, for clashes:
- The overnight cube-lab queue (`forgecoach overnight --jobs 9`, pid 818548, started 07:48, restarted
  at 9 workers 08:01): evolve 8x200, four meta runs of 300, learn 4 iterations — in its last phase
  (deck-h2h) at 09:51. Two ENGINE ERRORS at the tail of the learner's h2h (seeds 500117, 500193:
  "a game thread would not stop after its timeout; the worker was restarted"); 0 errors elsewhere.
- J002's serial rerun (`--repeat 3 --concurrency 1`): baseline-r3c done on bench/pre-prompt-fixes,
  after-fixes-r3c running on main at 09:51; uses the coach helper on 8643 (engine on 8642, started
  with `forgecoach start --no-open --no-pull` for the bench).
- Queued behind both (a local chain script): `forgecoach stop`, mtg-table pull to ee4d127, bridge
  build, `ai-bench --selftest`, then Justin's request — the Omega evolve rerun at 1,200 drafts a
  generation (8 gen, 8 workers, ~3-4 h, var/cubelab/evolve/omega-1200) — and THEN J003 (pilot first).
  So J003 starts roughly 4 h after the queue ends unless Justin reorders.
- Measured today: a draft + Bo3 = 8-10 core-seconds (not 25); games 3.8 s / 18.7 turns; ~3,100 drafts/h
  ceiling at 7-9 workers; 9 workers no faster than 7.
