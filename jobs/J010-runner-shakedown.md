id: J010
title: Lab runner shakedown on the PC: units, memory limits, pause, resize, resume
cpu: heavy
after: J003
repos: mtg-table@main
est: ~25 min
public_title: Lab runner shakedown
public_est: ~25 min
control: yes
resumable: yes
max_workers: 3
mem_per_worker_gb: 1.5
timeout: 90m
progress: aibench var/ai-bench/shake-* of 56
metrics: shake = aibench var/ai-bench/shake-bench
metrics: lab = cubelab var/cubelab/runs/shake-lab
metrics: parked_lines = count {logs} "ai-bench: shard"
headline: shake.games, lab.drafts, parked_lines, peak_worker_rss_gb

What only the PC can show: that the runner's steps really run as transient units in
forgecoach-lab.slice with their memory limits; that a pilot's JVM peak RSS is measured;
that the pools obey the control file under systemd; and that a resumable job survives a
runner restart. The cloud session verified the logic in node with fakes and the control
file on one JVM at smoke size; this is the real thing. The steps that need a person are
in the Report section; the runner does the rest unattended.


**Run this only through the lab runner,** once the runner is installed (docs/guides/lab-runner.md) and J003 has finished. The PC session doesn't run it by hand.

## Pilot
```bash
systemctl --user show "lab-$LAB_JOB-$LAB_STEP" -p Slice -p MemoryMax -p MemoryHigh -p Nice -p KillMode | tee var/runner-shake-unit.txt
grep -qx 'Slice=forgecoach-lab.slice' var/runner-shake-unit.txt
grep -qx 'KillMode=control-group' var/runner-shake-unit.txt
grep -qx 'Nice=10' var/runner-shake-unit.txt
./tools/ai-bench.sh --selftest --no-engine
awk 'NF && $1 !~ /^#/ && n++ < 2' tools/ai-bench/pairs-cube.txt > var/shake-pairs.txt
./tools/ai-bench.sh play --pairs var/shake-pairs.txt --games 4 --seed 3 --jobs 2 --run shake-pilot --a Default --b Default
```
metrics: pilot = aibench var/ai-bench/shake-pilot
check: pilot.games == 8 and pilot.errors == 0
check: peak_worker_rss_gb between 0.3 and 4.5

## Commands
```bash
# 1. ai-bench under the control file: the runner's own backoff may resize it; a person resizes it by hand (Report).
./tools/ai-bench.sh play --pairs var/shake-pairs.txt --games 24 --seed 5 --jobs {workers} --run shake-bench --a Default --b Default
# 2. the same line again: every game is already played, so it plays none.
./tools/ai-bench.sh play --pairs var/shake-pairs.txt --games 24 --seed 5 --jobs {workers} --run shake-bench --a Default --b Default 2>&1 | tee var/runner-shake-rerun.txt
grep -q 'skipped as already played' var/ai-bench/shake-bench/shard-0.log
# 3. the cube lab's pool under the control file.
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 12 --games 1 --jobs {workers} --seed 77 --out var/cubelab/runs/shake-lab
```
check: shake.errors == 0 and lab.engine_errors == 0
check: lab.drafts == 12

## Abort if
abort: shake.games >= 10 and shake.error_rate > 10%

## Report
collect: var/runner-shake-unit.txt
collect: var/runner-shake-rerun.txt

By hand, while step 1 runs (`tools/runner.sh status` shows `run1`):

1. `tools/runner.sh pause`; within one game per worker, `tools/runner.sh logs` shows
   `paused by the control file` and no new game lines; `tools/runner.sh resume`.
2. `echo '{"paused":false,"maxWorkers":1}' > var/runner/control/J010.json` in the runner's
   checkout (`~/code/lab/runner`); the shard logs show `parked`, and `ps -C java` shows one
   JVM. The runner rewrites the file within 10 s (its own value), which shows the shards come
   back too.
3. `systemctl --user restart forgecoach-runner` during step 3: STATUS gets an `adopted:`
   line and the job carries on.
4. `systemctl --user show forgecoach-runner -p MemoryMax -p Environment` (2G, and
   GIT_TERMINAL_PROMPT=0 with ssh in batch mode), then `systemctl --user show forgecoach-lab.slice -p MemoryMax -p ManagedOOMMemoryPressure` and
   `cat /proc/pressure/memory` into summary.md, with what happened in 1–3.
