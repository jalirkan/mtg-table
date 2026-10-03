id: J001
title: Check the channel and describe the machine
cpu: light
repos: mtg-table@main, ForgeCoach@main
est: 2 min

## Commands
```bash
cd /home/justin-a/code/mtg-table && git fetch -q && git log --oneline -1 origin/main
cd /home/justin-a/code/ForgeCoach && git fetch -q && git log --oneline -1 origin/main
nproc; free -g | head -2; uptime; java -version 2>&1 | head -1; node --version
```

## Report
- The output above.
- Whether either checkout has local changes (`git status -s`).
- What is running now, or was run today, that a later job could clash with: the coach bench
  rerun, the search benchmark, the cube-lab queue.
