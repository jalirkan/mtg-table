id: J037
title: Evaluator gate 3: SPRT search-v1-fixed3 with the evaluator's leaves vs search-v1-fixed3 (D354)
public_title: Evaluator SPRT
public_est: one to two nights
cpu: heavy
after: J036
repos: mtg-table@9ca3329 (main with the gates merged, #36; pinned so the truth and the rankers share one code version, D341)
est: one to two nights (up to 2,400 search-vs-search games at about 1,500 a night on 7 workers; an SPRT usually stops earlier)
resumable: no
max_workers: 7
timeout: 30h
progress: metric sprt_games games of 2400
metrics: all = ladder var/ai-ladder
metrics: sprt_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"sprt:")&&l.includes("search-v1-fixed3-eval-"))n++;console.log(n)'
metrics: g3 = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/sprt.json
headline: sprt_games, all.games, all.errors, all.timeouts, g3.pass

Gate 3 (D354): in games, does the search with D316's evaluator at its leaves beat the search
with the hand leaf?
- The player is `search-v1-fixed3-eval-<sha12>`: search-v1-fixed3's own params plus
  `leaf=eval:var/ml/models/eval-<sha12>.json`. `tools/ml/gate_sprt.py register` copies the model
  there and writes `var/ml/gates/players.json`; the committed registry is not touched.
- The opponent is `search-v1-fixed3`.
- Mirrored deals on the confirm set, which the evaluator never trained on (D340).
- elo0 0, elo1 20, alpha = beta = 0.05, at most 2,400 games.

**The rule:** H1 = PASS. H0, or inconclusive at 2,400 games, = FAIL. Promotion past this gate is
D321's league (non-inferiority against forge-default too).

The SPRT runs only if gates 1 and 2 passed: the pilot checks both, so a failed gate stops the
job before any game.

## Pilot
A few games into a separate ladder folder, so they never enter the real results.
```bash
./bridge/build.sh
./tools/ai-bench.sh --selftest
N=$(python3 tools/ml/gate_sprt.py register --model var/ml/models/night-1-eval.json --registry var/ml/gates/players.json)
./tools/ai-ladder.sh sprt "$N" search-v1-fixed3 --elo0 0 --elo1 20 --max-games 8 --purpose pilot \
    --registry var/ml/gates/players.json --dir var/ai-ladder-pilot/J037 --experiments var/ai-ladder-pilot/J037/experiments.jsonl --jobs {workers}
```
metrics: pilot = ladder var/ai-ladder-pilot/J037
metrics: g1 = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/fit/report.json
metrics: g2 = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/regret/report.json
check: g1.pass == 1
check: g2.pass == 1
check: pilot.games >= 4
check: pilot.errors + pilot.timeouts <= 1

Gates 1 and 2 passed (D354's order), the evaluator player loads in ai-bench, and a handful of
games finish. There are no win-rate bounds: the SPRT is the test.

## Commands
```bash
N=$(python3 tools/ml/gate_sprt.py register --model var/ml/models/night-1-eval.json --registry var/ml/gates/players.json)
./tools/ai-ladder.sh sprt "$N" search-v1-fixed3 --elo0 0 --elo1 20 --max-games 2400 --registry var/ml/gates/players.json --jobs {workers}
python3 tools/ml/gate_sprt.py verdict --name "$N" --report var/ml/gates/sprt.json | tee var/ml/gates/sprt-verdict.txt || true
```
check: sprt_games >= 1
check: all.errors + all.timeouts <= all.games / 20
check: g3.written == 1

## Abort if
abort: sprt_games >= 200 and all.errors > all.games / 20

## Report
collect: var/ai-ladder/sprt.jsonl
collect: var/ml/gates/sprt-verdict.txt
collect: var/ml/gates/sprt.json
collect: var/ml/gates/players.json

summary.md:
- the SPRT's last line (result, games, pairs, score, LLR) and its score as Elo with the pair
  count;
- errors and timeouts;
- gate 3's verdict line.

If it stopped at --max-games inconclusive, say so and give the score; do not read a direction
into it. On a PASS the player becomes a league candidate in a follow-up commit, not in this job.
