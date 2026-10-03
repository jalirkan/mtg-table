id: J007
title: Coach latency experiments: Haiku on routine types; answer-first layout
cpu: light
after: J008
repos: same as J008
est: ~45 min (two runs of 84 calls)

## Pilot
```bash
cd /home/justin-a/code/ForgeCoach
npm run bench:coach -- --repeat 1 --type mulligan --model-by-type mulligan=claude-haiku-4-5 --label J007-pilot-haiku; echo "exit $?"
npm run bench:coach -- --repeat 1 --type spell --prompt-format answer-first --label J007-pilot-af; echo "exit $?"
```
Checks:
- Both exit 0, with 0 transport errors.
- The Haiku pilot's per-type table shows a Haiku model in the mulligan row, and a median
  latency below J008's mulligan median.
- At least 4 of 5 answer-first replies start with the ANSWER line, and there is at most 1
  format failure.

## Commands
```bash
npm run bench:coach -- --repeat 3 --model-by-type mulligan=claude-haiku-4-5,play_draw=claude-haiku-4-5,target=claude-haiku-4-5,choice=claude-haiku-4-5 --label J007-haiku-routine; echo "exit $?"
npm run bench:coach -- --repeat 3 --prompt-format answer-first --label J007-answer-first; echo "exit $?"
npm run bench:coach -- --compare bench/coach/results/<…>-J008-classic-r3.json bench/coach/results/<…>-J007-haiku-routine.json
npm run bench:coach -- --compare bench/coach/results/<…>-J008-classic-r3.json bench/coach/results/<…>-J007-answer-first.json
```

## Abort if
- Any "TRANSPORT ERROR", or exit code 3.
- More than 3 retry lines.
- In the Haiku run, the mulligan row's model isn't Haiku.
- In the answer-first run, more than 15% format failures by the half-way mark.

## Report
- Both .md reports and both `--compare` outputs.
- A per-type table comparing J008 with each J007 run: median and p90 latency, and score.
- How many answer-first replies put ANSWER on the first line.
- Copy the .json files to results/J007/.
