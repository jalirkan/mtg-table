id: J002
title: PR #27 coach-bench comparison, run one question at a time
cpu: light
repos: ForgeCoach@bench/pre-prompt-fixes then ForgeCoach@main
est: ~35 min (needs the coach helper, so play.sh must be up)

This is the serial rerun you started already. If it has finished, don't run it again:
just report it.

## Commands
```bash
cd /home/justin-a/code/ForgeCoach
git checkout bench/pre-prompt-fixes && git pull && npm ci
npm run bench:coach -- --repeat 3 --concurrency 1 --label baseline-r3c
git checkout main && git pull && npm ci
npm run bench:coach -- --repeat 3 --concurrency 1 --label after-fixes-r3c
npm run bench:coach -- --compare bench/coach/results/<…>-baseline-r3c.json bench/coach/results/<…>-after-fixes-r3c.json
```

## Report
- The full `--compare` output.
- Both runs' summary tables, from the `.md` reports.
- Copy the two `.json` result files into `results/J002/`.
- How many answers were transport errors (helper busy or network), as opposed to format
  failures.
