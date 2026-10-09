id: J116
title: Target search confirmation: one 4,800-game match (2,400 mirrored pairs, fresh deals) at the live 1.5 s budget, search-v2-targets vs search-v2 (the ladder's search-v1-anytime), the score with a 95% interval in Elo and how often it changed Forge's target (D417; Justin asked for it after J115's +6.9 Elo [−2.7, +16.6])
public_title: Target search confirmation match
public_est: ~9 h (one night)
public_decides: Target search in the next search version
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@614f98f (the same commit J115 played, so J115 and J116 are one code version, D341)
decides: whether the target search (D417 targets=1) joins the next search version (search-v3)
hypothesis: J115 measured the target search at +6.9 Elo [−2.7, +16.6] over 600 pairs, changing 11.2% of the targets it searched; if that is real, a fresh match four times the size (±~5 Elo) puts its lower end above 0
rule: written 2026-10-09 before the run, read from var/ai-ladder/match-J116-targets.json alone (J115's games are not pooled in: J116 is the confirmation, on fresh deals). ADOPT targets=1 into the next search version if the match is complete (all 4,800 games) and the 95% interval on search-v2-targets' score against search-v1-anytime has its lower end above 0.5 (above 0 Elo). Otherwise NOT SHOWN: report the score and Elo with the interval and how often it changed Forge's target. An interval that includes 0.5 is "not shown", never "no effect"; a match that stopped early gives no verdict
followup: morning-read
est: ~9 h. J115's targets match played 1,200 games in about 2.2 h at 7 workers (the two matches took 4 h 24 m together), so 4,800 games take ~8.8 h; the pilot ~5-10 min. At J115's worst case (75 + 3 s a game) it would be ~15 h, so --hours 14 is the match's own stop and the timeout is 16 h
resumable: no
timeout: 16h
clean: var/ai-ladder-pilot/J116
progress: metric match_games games of 4800
metrics: match_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v2-targets\"")&&l.includes("\"b\":\"search-v1-anytime\""))n++;console.log(Math.max(0,n-1200))'
metrics: match_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v2-targets\"")&&l.includes("\"b\":\"search-v1-anytime\"")&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: mt = sh: cat var/ai-ladder/match-J116-targets.json 2>/dev/null || echo '{"played":0}'
headline: mt.played, mt.score, mt.lo, mt.hi, mt.elo, mt.eloLo, mt.eloHi

**What is measured.** J115 played `search-v2-targets` (search-v2 + `targets=1`: for each single-target part of its own priority play, Forge's target is rolled out against up to 5 other legal, visible targets under the search's own rule, margin 20, 1.5 s) against search-v2 over 600 mirrored pairs: 0.510 [0.496, 0.524], +6.9 Elo [−2.7, +16.6], NOT SHOWN. Justin asked for the larger match J115's summary proposed. This is that match, on its own, with nothing else changed.

**Size.** 2,400 pairs (4,800 games): score SE about 0.0036, 95% interval about ±4.9 Elo. A true +7 Elo (0.510) clears 0.5 with about 80% probability; a true +5 with about 50%.

**Seeds.** `match` takes the matchup's next unused block (D398), so these are fresh deals, not J115's. That is why J116 is read alone.

**Counting.** `var/ai-ladder/results` already holds J115's 1,200 games of this matchup; `match_games` subtracts them. `match_err` counts both (J115 had none).

**When it runs.** No `after:`; the queue is empty. `cores: 7` takes the whole width, so every player sees the same CPU. The deals are mirrored, so Justin at the table falls on both sides alike.

## Pilot
About 5-10 minutes: the build, the bench self-test, and 8 games in their own ladder folder, so they never enter the real results.
```bash
./bridge/build.sh
./tools/ai-bench.sh --selftest
./tools/ai-ladder.sh match search-v2-targets search-v1-anytime --games 8 --purpose pilot --dir var/ai-ladder-pilot/J116/targets --experiments var/ai-ladder-pilot/J116/targets/experiments.jsonl --out var/ai-ladder-pilot/J116/targets.json --jobs {workers}
```
metrics: pt = sh: cat var/ai-ladder-pilot/J116/targets.json 2>/dev/null || echo '{"played":0}'
check: pt.complete == true
check: pt.played == 8
check: pt.errors + pt.timeouts <= 1
check: pt.aSearch.byKind.t.searched >= 4
check: pt.bSearch.searched >= 20

## Commands
```bash
./tools/ai-ladder.sh match search-v2-targets search-v1-anytime --games 4800 --hours 14 --out var/ai-ladder/match-J116-targets.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
check: mt.complete == true
check: mt.played == 4800
check: mt.errors + mt.timeouts <= mt.played / 20

## Abort if
abort: match_err >= 30 and match_err > match_games / 10

Engine trouble only. The match has no stopping rule, so the job never stops early on the score.

## Report
collect: var/ai-ladder/match-J116-targets.json

summary.md should give:
- the score against search-v1-anytime with its 95% interval, the same in Elo, and the pair and game counts;
- `aSearch.byKind.t`: searched, changed, rate;
- each side's p/a/b decisions searched and changed, its budget-fallback rate with the interval, rollout errors and unmappable counts (J115's targets side had 107 unmappable against ~45 elsewhere: say whether that holds);
- draws, errors and timeouts;
- the reading under the rule: ADOPT, or NOT SHOWN with the interval.

A line setting J116 beside J115 (and a pooled 3,000-pair figure, labelled as decides nothing) is welcome. Never write "no gain" for an interval that includes 0.5. If the match stopped early (`complete: false`), say so; it gets no verdict.
