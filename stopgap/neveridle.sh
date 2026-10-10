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
  # 2026-10-10: cubelab's resume reads the whole drafts.jsonl into one string, and the synergy file (36k drafts,
  # ~600 MB) hit V8's string limit ("Cannot create a string longer than 0x1fffffe8"). So no folder grows past
  # 24,000 drafts: later rungs are fresh batches of 12,000 in their own folders with their own seed blocks.
  for spec in "2000 filler-%s 900001" "6000 filler-%s 900001" "12000 filler-%s 900001" "24000 filler-%s 900001" \
              "12000 filler-%s-b1 950001" "12000 filler-%s-b2 960001" "12000 filler-%s-b3 970001" "12000 filler-%s-b4 980001"; do
    set -- $1 $spec   # $1 workers, $2 target, $3 folder pattern, $4 seed
    for c in synergy-cube-180 modern-era-cube-180 vintage-cube-180 pauper-cube-180; do
      folder=$(printf "$3" "$c")
      n=$(wc -l < "$SRC/var/cubelab/runs/$folder/drafts.jsonl" 2>/dev/null || echo 0)
      [ "${n:-0}" -ge "$2" ] && continue
      say "filler: starting $c in $folder ($n of $2 drafts done, seed $4), $1 worker(s)"
      systemd-run --user --unit=forgecoach-filler-job --slice=forgecoach-lab.slice --collect -p Nice=15 \
        --working-directory="$SRC" --setenv=PATH="$PATH" --setenv=HOME="$HOME" \
        bash -c "tools/cubelab.sh run cubes/$c.md --format grid --drafts $2 --jobs $1 --seed $4 --out var/cubelab/runs/$folder >> var/filler.log 2>&1 && tools/cubelab.sh report var/cubelab/runs/$folder >> var/filler.log 2>&1" >/dev/null 2>&1
      return; done; done; }
light=0
hand_busy(){ systemctl --user is-active --quiet forgecoach-hand-evolve || systemctl --user is-active --quiet forgecoach-filler-job; }
mkdir -p "$SRC/var"; say "neveridle started"
# Usage ledger, one line a day: 30-second ticks spent on the runner's jobs, on hand/filler work, and idle.
tick(){ f="$SRC/var/usage-$(date +%F).txt"; read -r a b c < "$f" 2>/dev/null || { a=0; b=0; c=0; }; case "$1" in runner) a=$((a+1));; filler) b=$((b+1));; idle) c=$((c+1));; esac; echo "$a $b $c" > "$f"; }
while true; do
  if runner_busy; then
    idle=0; tick runner
    # The light-job rule (filler beside a job under 2.5 cores) was REMOVED 2026-10-04 02:20: it judged by cores only, and when
    # J049 moved from a 1.5 GB encode to a 10 GB one-core fit, filler + fit + the art job filled RAM and swap and the runner had to
    # stop J049. The runner's own cores:/mem_gb: co-scheduling (mtg-table #44) replaces it.
    systemctl --user is-active --quiet forgecoach-filler-job && { systemctl --user stop forgecoach-filler-job; say "runner has work: stopped filler"; }
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
