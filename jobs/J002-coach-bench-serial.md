id: J002
title: PR #27 coach-bench comparison, run one question at a time
cpu: light
repos: ForgeCoach@bench/pre-prompt-fixes then ForgeCoach@main
est: ~35 min (needs the coach helper, so play.sh must be up)

This is the serial rerun you started already. If it has finished, don't run it again:
just report it.

## Pilot
On main, with the helper up:
```bash
cd /home/justin-a/code/ForgeCoach && npm run bench:coach -- --repeat 1 --concurrency 1 --type spell --label pilot
```
Checks:
- 0 answers end in a transport error ("busy", network, helper down).
- At most 1 format failure in the 5 answers.
- Each answer takes 5–30 s.

If the rerun already finished, skip the pilot. Instead, check its two reports against the
same rules: transport errors must be 0, and every case must have 3 valid answers or be
explained.

## Commands
```bash
cd /home/justin-a/code/ForgeCoach
git checkout bench/pre-prompt-fixes && git pull && npm ci
npm run bench:coach -- --repeat 3 --concurrency 1 --label baseline-r3c
git checkout main && git pull && npm ci
npm run bench:coach -- --repeat 3 --concurrency 1 --label after-fixes-r3c
npm run bench:coach -- --compare bench/coach/results/<…>-baseline-r3c.json bench/coach/results/<…>-after-fixes-r3c.json
```

## Abort if
- Any answer ends in a transport error. Stop and report: the comparison would be invalid.
- More than 10% of answers are format failures by the half-way mark.

## Report
- The full `--compare` output.
- Both runs' summary tables, from the `.md` reports.
- Copy the two `.json` result files into `results/J002/`.
- How many answers were transport errors (helper busy or network), as opposed to format
  failures.
