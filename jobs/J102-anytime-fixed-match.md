id: J102
title: Anytime search, fixed measurement: 2,400 games (1,200 mirrored pairs) of search-v1-anytime vs search-v1 at the live 1.5 s budget, score with a 95% interval in Elo and each side's budget-fallback rate (replaces the withdrawn J089)
public_title: Anytime search fixed match
public_est: ~2 to 3 h
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@c9ae213 (main with #85, D398: `ai-ladder.sh match`, a fixed-size paired match with an interval and search counters; #79's search-v1-anytime, D388; pinned so every game is one code version, D341)
decides: whether the anytime search (D388, anytime=1) becomes search-v1's default loop in the next search version
public_decides: Anytime search as the default loop
hypothesis: keeping cut rounds, pruning to the budget and racing turn most of the searched decisions that fell back on budget (18.5% on the week-3 smoke, 11.7% on a larger dev run) into verdicts; the outside review puts the gain at about 10-13 Elo at best
rule: written 2026-10-06 before the run, read from var/ai-ladder/match-J102.json: ADOPT anytime=1 as the default loop if (a) the match is complete (all 2,400 games), (b) the 95% interval on search-v1-anytime's score against search-v1 has its lower end above 0.5 (above 0 Elo), and (c) the budget-fallback rate falls: search-v1-anytime's 95% upper end is below search-v1's 95% lower end (both game-clustered). Otherwise NO VERDICT: report the score and Elo with the interval, and both fallback rates, and keep D312's loop as the default; an interval that includes 0 is "not shown", never "no gain"
followup: morning-read
est: ~4-5 h (2,400 search-vs-search games (coordinator: raised from 1,200 for a ~±14 Elo interval): the PC's fixed-3 search SPRTs played 550-680 games an hour on 7 workers, J055 904 games in 81 min and J058 552 in 67 min; the 1.5 s budget's ms per decision is the same as fixed-3's, 1,407 vs 1,415 in docs/evidence/search-week3.md); the pilot ~5 min
resumable: no
timeout: 8h
clean: var/ai-ladder-pilot/J102
progress: metric match_games games of 2400
metrics: match_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v1-anytime\"")&&l.includes("\"b\":\"search-v1\""))n++;console.log(n)'
metrics: match_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v1-anytime\"")&&l.includes("\"b\":\"search-v1\"")&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: m = sh: cat var/ai-ladder/match-J102.json 2>/dev/null || echo '{"played":0}'
headline: m.played, m.score, m.lo, m.hi, m.elo, m.eloLo, m.eloHi, m.aSearch.budgetRate, m.bSearch.budgetRate

**Why this replaces J089.** J089 was an SPRT with elo0 0 and elo1 20 that could run for up to 2,400 games over one to two nights. The outside review (2026-10-06) estimated the plausible gain at 10-13 Elo, below elo1. That SPRT would most likely end in H0 after a long run and say nothing about the size. This job measures the size instead. It plays a fixed number of mirrored games, has no stopping rule, and reports an interval (`ai-ladder.sh match`, D398, merged in #85).

**Size.** Each mirrored pair (one deal played from both sides) is one observation. At a pair-score SD of about 0.35:
- 600 pairs give a 95% interval of about ±20 Elo;
- 300 pairs (600 games) give about ±28 Elo.

**Coordinator, 2026-10-06:** raised to 2,400 games (1,200 pairs, about 4-5 h) for an interval of about ±14 Elo. The text below was written for 1,200.

The coordinator asked for about 600 paired games. This job plays 600 *pairs* (1,200 games). The PC's measured rate (above) puts that at about 2 h, inside half a night. Even so, an interval of ±20 cannot separate a true +10 from 0. If the result is "no verdict", the next question is whether a second match is worth posting. For a rough ±10 Elo, the matches together would need about 2,300 pairs (1,700 more) (`pairsForHalfWidth` in `tools/ai-ladder/match.ts`).

**Players** (`tools/ai-ladder/players.json`, from #79):
- `search-v1-anytime`: search-v1 plus `anytime=1`;
- `search-v1`: the live seat's loop.

Both are wall clock on purpose: the budget is what is measured, so this is not D318's fixed-rollout mode.

`cores: 7` takes the job's whole width, so no heavy job runs beside it and the two players see the same CPU. One light job may still run beside it. The deals are mirrored, so any load falls on both players alike. Every result line carries the load average.

**Budget fallbacks.** The match reads each seat's `aStats` / `bStats` counters from the batches' own ai-bench lines and reports, for each side:
- decisions searched and answers changed;
- `search.fallback.*` counts by reason;
- the budget-fallback rate with a 95% interval clustered by game.

At 1.5 s, search-v1 should fall back on budget on 10-20% of searched decisions. search-v1-anytime should fall back on about 1%.

**Seeds.** `match` starts at the PC host's base + 900,000 and takes the matchup's next unused block. No earlier job ran this matchup, so it starts at that base.

**When it runs.** There is no `after:`. J099 (queue night 4) holds 7 cores, and this job needs 7 of 8, so the runner's core budget keeps it waiting until J099 ends, around 18:40 EDT on 2026-10-06. J101 runs before it in id order, also at full width.

## Pilot
About 5-10 minutes on the PC (12 min in a shared 4-core container at 2 workers): the build, the bench self-test, and 8 games in their own ladder folder so they never enter the real results.
```bash
./bridge/build.sh
./tools/ai-bench.sh --selftest
./tools/ai-ladder.sh match search-v1-anytime search-v1 --games 8 --purpose pilot --dir var/ai-ladder-pilot/J102 --experiments var/ai-ladder-pilot/J102/experiments.jsonl --out var/ai-ladder-pilot/J102/match.json --jobs {workers}
```
metrics: pilot = sh: cat var/ai-ladder-pilot/J102/match.json 2>/dev/null || echo '{"played":0}'
check: pilot.complete == true
check: pilot.played == 8
check: pilot.errors + pilot.timeouts <= 1
check: pilot.aSearch.searched >= 20
check: pilot.bSearch.searched >= 20

The pilot only asks whether anything is broken. The build and self-test pass, 8 games finish, and both seats search. There are no timing or win-rate bounds: the match itself is the test.

## Commands
```bash
./tools/ai-ladder.sh match search-v1-anytime search-v1 --games 2400 --hours 7 --out var/ai-ladder/match-J102.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
check: m.complete == true
check: m.played == 2400
check: m.errors + m.timeouts <= m.played / 20

## Abort if
abort: match_err >= 30 and match_err > match_games / 10

This aborts on engine trouble only: more than one game in ten ending in an engine error or a timeout, once 30 have. The match has no stopping rule, so the job never stops early on the score.

## Report
collect: var/ai-ladder/match-J102.json

summary.md should give:
- search-v1-anytime's score against search-v1 with its 95% interval, the same in Elo, and the pair and game counts;
- each side's decisions searched, answers changed, and budget-fallback rate with its interval, plus the other fallback reasons;
- draws, errors and timeouts;
- the reading under the rule above: ADOPT, or NO VERDICT with the interval.

Never write "no gain" for an interval that includes 0. If the match stopped early (`complete: false`), say so. In that case the rule gives no verdict.
