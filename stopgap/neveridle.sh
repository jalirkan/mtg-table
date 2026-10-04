#!/usr/bin/env bash
# STOPGAP by the PC session (2026-10-03), until the runner has its own filler: keep the PC busy.
# - If the lab runner is running a job (a lab-J* unit), stop any hand-started job at once: the runner always wins.
# - If nothing has run for 5 minutes, start a FILLER: unrecorded grid drafts of the next cube (2,000 each,
#   resumable, seeds 900001+), inside forgecoach-lab.slice so the memory cap applies, at nice 15.
# Mechanical, no Claude. Unit: forgecoach-neveridle.service (enabled; survives reboot with linger).
SRC=/home/justin-a/code/mtg-table-install
LOG=$SRC/var/neveridle.log
idle=0
say(){ echo "$(date -Is) $*" >> "$LOG"; }
runner_busy(){ systemctl --user list-units 'lab-J*' --no-legend 2>/dev/null | grep -q running; }
# Cores the runner's own job units used over the last tick (CPU-seconds per second, x10 to stay in integers).
lab_prev=0
lab_cores10(){ now=0; for u in $(systemctl --user list-units 'lab-J*' --no-legend 2>/dev/null | awk '/running/{print $1}'); do
    n=$(systemctl --user show "$u" -p CPUUsageNSec --value 2>/dev/null); case "$n" in ''|*[!0-9]*) n=0;; esac; now=$((now + n)); done
  d=$((now - lab_prev)); lab_prev=$now; [ "$d" -lt 0 ] && d=0; c10=$(( d / 3000000000 )); }   # 30 s tick -> tenths of a core
start_filler(){ # $1 = workers, $2 = why
  for target in 2000 6000 12000; do for c in synergy-cube-180 modern-era-cube-180 vintage-cube-180 pauper-cube-180; do
    n=$(wc -l < "$SRC/var/cubelab/runs/filler-$c/drafts.jsonl" 2>/dev/null || echo 0)
    [ "${n:-0}" -ge "$target" ] && continue
    say "$2: starting filler on $c ($n of $target drafts done), $1 worker(s)"
    systemd-run --user --unit=forgecoach-filler-job --slice=forgecoach-lab.slice --collect -p Nice=15 \
      --working-directory="$SRC" --setenv=PATH="$PATH" --setenv=HOME="$HOME" \
      bash -c "tools/cubelab.sh run cubes/$c.md --format grid --drafts $target --jobs $1 --seed 900001 --out var/cubelab/runs/filler-$c >> var/filler.log 2>&1 && tools/cubelab.sh report var/cubelab/runs/filler-$c >> var/filler.log 2>&1" >/dev/null 2>&1
    return; done; done; }
light=0
hand_busy(){ systemctl --user is-active --quiet forgecoach-hand-evolve || systemctl --user is-active --quiet forgecoach-filler-job; }
mkdir -p "$SRC/var"; say "neveridle started"
# Usage ledger, one line a day: 30-second ticks spent on the runner's jobs, on hand/filler work, and idle.
tick(){ f="$SRC/var/usage-$(date +%F).txt"; read -r a b c < "$f" 2>/dev/null || { a=0; b=0; c=0; }; case "$1" in runner) a=$((a+1));; filler) b=$((b+1));; idle) c=$((c+1));; esac; echo "$a $b $c" > "$f"; }
while true; do
  if runner_busy; then
    idle=0; tick runner
    # LIGHT-JOB RULE (2026-10-03 22:45, Justin: "wasted resources"): a runner job that uses under 2.5 cores (J049 used ONE of
    # sixteen for hours) may share the machine with a 5-worker filler. A heavy job (>= 2.5 cores) still stops the filler at once.
    lab_cores10   # sets c10 (no subshell: lab_prev must persist)
    if [ "$c10" -ge 25 ]; then light=0
      systemctl --user is-active --quiet forgecoach-filler-job && { systemctl --user stop forgecoach-filler-job; say "runner job is heavy ($c10/10 cores): stopped filler"; }
    else light=$((light + 1))
      if [ "$light" -ge 10 ] && ! systemctl --user is-active --quiet forgecoach-filler-job; then
        avail=$(awk '/MemAvailable/{print int($2/1048576)}' /proc/meminfo)
        [ "$avail" -ge 14 ] && start_filler 5 "runner job is light ($c10/10 cores for 5 min)"; light=0
      fi
    fi
  elif hand_busy; then idle=0; tick filler
  else
    idle=$((idle + 1)); tick idle
    if [ "$idle" -ge 10 ]; then   # 10 x 30 s with nothing running
      start_filler 7 "idle 5 min"
      idle=0
    fi
  fi
  sleep 30
done
