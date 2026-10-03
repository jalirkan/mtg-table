id: J032
title: (was J025, earlier J018) Night 2 SPRT: the noise-aware override (lower confidence bound) vs the mean margin
cpu: heavy
repos: mtg-table@main (main once it merges)
est: one to two nights (up to 2,400 games)
resumable: no
max_workers: 7
timeout: 14h
progress: metric sprt_games games of 2400
metrics: all = ladder var/ai-ladder
metrics: sprt_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"sprt:")&&l.includes("search-v1-fixed3-lcb")&&l.includes("search-v1-fixed3"))n++;console.log(n)'
headline: sprt_games, all.games, all.errors, all.timeouts

The engine review's M1: the search overrides Forge's answer when an alternative's MEAN beats Forge's by 20 leaf points after about 3 rounds, ignoring how noisy those rounds were. `search-v1-fixed3-lcb` (D350's `override=lcb,z=1,margin=0`) overrides only when the lower bound mean_d - 1 x se_d of the paired per-round difference to Forge's answer is above 0, over its 3 rounds.

Players (`tools/ai-ladder/players.json`, registered by `main`): `search-v1-fixed3-lcb` against
`search-v1-fixed3`. Both are D318's fixed-rollout benchmark mode (exactly 3 rounds per searched
decision, a fixed seed, no budget fallback), so the result measures the search, not the
CPU. Games are mirrored deals on the confirm deck set; `sprt` writes its own hypothesis line
to `docs/evidence/experiments.jsonl` before the first game and its verdict to
`var/ai-ladder/sprt.jsonl`.

**Decision rule, fixed before the run:** H1 (lcb is at least +20 Elo better) -> the lcb rule goes into the next search version (a league candidate). H0 -> keep the margin rule. Inconclusive -> keep the margin rule; the search's per-decision reports (D350, recorded once decision records land) say whether the paired sd is large enough to matter.

## Pilot
A few games, into a separate ladder folder so they never enter the real results.
```bash
./bridge/build.sh
./tools/ai-bench.sh --selftest
./tools/ai-ladder.sh sprt search-v1-fixed3-lcb search-v1-fixed3 --elo0 0 --elo1 20 --max-games 8 --purpose pilot --dir var/ai-ladder-pilot/J018 --experiments var/ai-ladder-pilot/J018/experiments.jsonl --jobs {workers}
```
metrics: pilot = ladder var/ai-ladder-pilot/J018
check: pilot.games >= 4
check: pilot.errors + pilot.timeouts <= 1

Only "is it broken": the build and the bench self-test (which runs the search with every
D350/D351 switch on, `oracle=1` included) pass, and a handful of games finish. No timing
or win-rate bounds: the SPRT is the test.

## Commands
```bash
./tools/ai-ladder.sh sprt search-v1-fixed3-lcb search-v1-fixed3 --elo0 0 --elo1 20 --max-games 2400 --jobs {workers}
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
