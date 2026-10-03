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
hand_busy(){ systemctl --user is-active --quiet forgecoach-hand-evolve || systemctl --user is-active --quiet forgecoach-filler-job; }
mkdir -p "$SRC/var"; say "neveridle started"
# Usage ledger, one line a day: 30-second ticks spent on the runner's jobs, on hand/filler work, and idle.
tick(){ f="$SRC/var/usage-$(date +%F).txt"; read -r a b c < "$f" 2>/dev/null || { a=0; b=0; c=0; }; case "$1" in runner) a=$((a+1));; filler) b=$((b+1));; idle) c=$((c+1));; esac; echo "$a $b $c" > "$f"; }
while true; do
  if runner_busy; then
    idle=0; tick runner
    for u in forgecoach-hand-evolve forgecoach-filler-job; do
      systemctl --user is-active --quiet $u && { systemctl --user stop $u; say "runner has work: stopped $u"; }
    done
  elif hand_busy; then idle=0; tick filler
  else
    idle=$((idle + 1)); tick idle
    if [ "$idle" -ge 10 ]; then   # 10 x 30 s with nothing running
      for c in synergy-cube-180 modern-era-cube-180 vintage-cube-180 pauper-cube-180; do
        n=$(wc -l < "$SRC/var/cubelab/runs/filler-$c/drafts.jsonl" 2>/dev/null || echo 0)
        [ "${n:-0}" -ge 2000 ] && continue
        say "idle 5 min: starting filler on $c ($n of 2000 drafts done)"
        systemd-run --user --unit=forgecoach-filler-job --slice=forgecoach-lab.slice --collect -p Nice=15 \
          --working-directory="$SRC" --setenv=PATH="$PATH" --setenv=HOME="$HOME" \
          bash -c "tools/cubelab.sh run cubes/$c.md --format grid --drafts 2000 --jobs 7 --seed 900001 --out var/cubelab/runs/filler-$c >> var/filler.log 2>&1 && tools/cubelab.sh report var/cubelab/runs/filler-$c >> var/filler.log 2>&1" >/dev/null 2>&1
        break
      done
      idle=0
    fi
  fi
  sleep 30
done
