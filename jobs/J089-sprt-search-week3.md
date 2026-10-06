id: J089
title: Search week 3 SPRT: the anytime search (anytime=1, D388) vs search-v1 at the live 1.5 s budget
public_title: Search week 3 SPRT
public_est: one to two nights
cpu: heavy
after: J093
repos: mtg-table@8b8fd7f (main with #79, the week-3 search; pinned so every game is one code version, D341)
decides: whether the anytime search (D388) becomes search-v1's loop in the next search version (a league candidate), or D312's loop with its budget fallback stays
hypothesis: keeping cut rounds, pruning to the budget and racing turn the 18.5% of searched decisions that fell back to Forge's answer on budget (docs/evidence/search-week3.md) into verdicts, and that is worth at least the SPRT's elo1 of 20 at the same 1.5 s wall-clock budget
rule: written 2026-10-06 before the run: ai-ladder sprt search-v1-anytime vs search-v1, elo0 0, elo1 20, alpha = beta = 0.05, mirrored deals on the confirm set, at most 2,400 games. H1 = PASS: anytime=1 goes into the next search version. H0 = FAIL: keep D312's loop. Inconclusive at 2,400 games = no change, report the score as Elo
followup: league-candidate
est: one to two nights (up to 2,400 search-vs-search games at about 1,500 a night on 7 workers; an SPRT usually stops earlier)
resumable: no
max_workers: 7
cores: 7
timeout: 30h
progress: metric sprt_games games of 2400
metrics: all = ladder var/ai-ladder
metrics: sprt_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"sprt:")&&l.includes("search-v1-anytime"))n++;console.log(n)'
headline: sprt_games, all.games, all.errors, all.timeouts

The engine review's budget finding. At 1.5 s, D312's loop kept Forge's answer without a verdict on 18.5% of searched decisions (11.7% on a larger dev run), because two complete rounds did not fit the budget. Under `anytime=1` (D388) a round the deadline cuts keeps the rollouts it finished. Candidates are pruned to what the time left can carry, the clearly worse are raced out, and the verdict is taken on the paired evidence that exists. On the 12-game smoke, budget fallbacks went from 18.5% to 0%.

This tests the anytime switch alone. Prior ranking (`rank=prior`, D389) and outlets in the rollouts (`rollout=outlets`, D390) have their own players and their own SPRTs against `search-v1-fixed3`, so one result never mixes two changes.

Players (`tools/ai-ladder/players.json`, registered by #79): `search-v1-anytime` (search-v1 plus `anytime=1`) against `search-v1`. **Both are wall clock on purpose**: the budget behaviour is what is measured, so this is NOT D318's fixed-rollout mode. `cores: 7` reserves the job's whole width, so no heavy job runs beside it and the two players see the same CPU. The deals are mirrored, so any load falls on both alike. Games are on the confirm deck set. `sprt` writes its own hypothesis line to `docs/evidence/experiments.jsonl` before the first game and its verdict to `var/ai-ladder/sprt.jsonl`.

**Decision rule, fixed before the run:** H1 (anytime is at least +20 Elo better) -> `anytime=1` goes into the next search version (a league candidate). H0 -> keep D312's loop; the budget fallback stays, and the next budget work is a faster rollout, not a different schedule. Inconclusive at 2,400 games -> no change; report the score as Elo.

## Pilot
A few games, into a separate ladder folder so they never enter the real results.
```bash
./bridge/build.sh
./tools/ai-bench.sh --selftest
./tools/ai-ladder.sh sprt search-v1-anytime search-v1 --elo0 0 --elo1 20 --max-games 8 --purpose pilot --dir var/ai-ladder-pilot/J089 --experiments var/ai-ladder-pilot/J089/experiments.jsonl --jobs {workers}
```
metrics: pilot = ladder var/ai-ladder-pilot/J089
check: pilot.games >= 4
check: pilot.errors + pilot.timeouts <= 1

Only "is it broken". The build passes. The bench self-test runs a ranked anytime search with `rollout=both` and an anytime search at a 60 ms budget. A handful of games finish. No timing or win-rate bounds: the SPRT is the test.

## Commands
```bash
./tools/ai-ladder.sh sprt search-v1-anytime search-v1 --elo0 0 --elo1 20 --max-games 2400 --jobs {workers}
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
