id: J054
title: (was J024, earlier J017) Night 2 SPRT (TEST ONLY): a search that sees the real hidden cards vs the honest one -- the value of inference
cpu: heavy
after: J057
repos: mtg-table@main (main once it merges)
est: about one night (up to 1,500 games; the 20-vs-40 Elo test usually stops sooner)
resumable: no
max_workers: 7
timeout: 14h
progress: metric sprt_games games of 1500
metrics: all = ladder var/ai-ladder
metrics: sprt_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"sprt:")&&l.includes("search-v1-fixed3-oracle")&&l.includes("search-v1-fixed3"))n++;console.log(n)'
headline: sprt_games, all.games, all.errors, all.timeouts

The engine review's M5: before building any inference about the opponent's hand, measure what perfect information is worth. `search-v1-fixed3-oracle` skips the determinization, so its rollouts play the opponent's REAL hand and library order (D350's `oracle=1`). It is a measuring stick and nothing else: the game's AI seat refuses `oracle=1`, the ladder never rates it in `run` unless named, and the league never takes it as a candidate. Do not register any other player with oracle on.

Players (`tools/ai-ladder/players.json`, registered by `main`): `search-v1-fixed3-oracle` against
`search-v1-fixed3`. Both are D318's fixed-rollout benchmark mode (exactly 3 rounds per searched
decision, a fixed seed, no budget fallback), so the result measures the search, not the
CPU. Games are mirrored deals on the confirm deck set; `sprt` writes its own hypothesis line
to `docs/evidence/experiments.jsonl` before the first game and its verdict to
`var/ai-ladder/sprt.jsonl`.

**Decision rule, fixed before the run:** the SPRT tests 'the oracle gains at least +40 Elo' (H1) against 'at most +20' (H0). H1 -> build the constraint sampler (redeals consistent with the opponent's missed land drops and unplayed creatures). H0 -> inference is not worth building now; spend the effort on the evaluator. Inconclusive -> report the score as Elo; between 20 and 40 is the review's grey zone, no work either way.

## Pilot
A few games, into a separate ladder folder so they never enter the real results.
```bash
./bridge/build.sh
./tools/ai-bench.sh --selftest
./tools/ai-ladder.sh sprt search-v1-fixed3-oracle search-v1-fixed3 --elo0 20 --elo1 40 --max-games 8 --purpose pilot --dir var/ai-ladder-pilot/J017 --experiments var/ai-ladder-pilot/J017/experiments.jsonl --jobs {workers}
```
metrics: pilot = ladder var/ai-ladder-pilot/J017
check: pilot.games >= 4
check: pilot.errors + pilot.timeouts <= 1

Only "is it broken": the build and the bench self-test (which runs the search with every
D350/D351 switch on, `oracle=1` included) pass, and a handful of games finish. No timing
or win-rate bounds: the SPRT is the test.

## Commands
```bash
./tools/ai-ladder.sh sprt search-v1-fixed3-oracle search-v1-fixed3 --elo0 20 --elo1 40 --max-games 1500 --jobs {workers}
tail -1 var/ai-ladder/sprt.jsonl
```
check: sprt_games >= 1
check: all.errors + all.timeouts <= all.games / 20

## Abort if
abort: sprt_games >= 200 and all.errors > all.games / 20

## Report
collect: var/ai-ladder/sprt.jsonl

summary.md: the SPRT's last line (result H1 / H0 / inconclusive / stopped, games, pairs,
score, LLR), its score as Elo with the pair count, the errors and timeouts, and the
decision the rule above gives. If it stopped at --max-games inconclusive, say so and give
the score: do not read a direction into it.
