id: J115
title: Opening-hand and target search, fixed measurement: two 1,200-game matches (600 mirrored pairs each) at the live 1.5 s budget, search-v2-mull vs search-v2 and search-v2-targets vs search-v2 (search-v2 = the ladder's search-v1-anytime), each switch's score with a 95% interval in Elo and how often it changed Forge's answer (D417)
public_title: Mulligan and target search fixed matches
public_est: ~6 h (one night)
public_decides: Mulligan and target search in the next search version
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@614f98f (main with #104, D417: SearchConfig mull=1 and targets=1, the ladder players search-v2-mull, search-v2-targets and search-v2-mull-targets, and the match line's per-kind byKind counters; #105 renumbered its decision from D416 to D417. Pinned so every game is one code version, D341)
decides: whether the opening-hand search (D417 mull=1) and the target search (D417 targets=1), each on its own, join the next search version (search-v3); each switch is decided separately
hypothesis: Forge's land-count mulligan rule and its greedy single-target choices both lose games the search can see; the target search changes a quarter of the targeted plays it looks at (smoke 2/8) and the opening-hand search rarely overrules Forge (the lcb rule, smoke 0/5 keeps and 1/1 bottoms), so each gain, if any, is expected small, about +5 to +15 Elo
rule: written 2026-10-08 before the run, read from var/ai-ladder/match-J115-mull.json and var/ai-ladder/match-J115-targets.json, each switch on its own: ADOPT the switch into the next search version if its match is complete (all 1,200 games) and the 95% interval on its score against search-v1-anytime (search-v2) has its lower end above 0.5 (above 0 Elo). Otherwise NOT SHOWN for that switch: report the score and Elo with the interval and how often it changed Forge's answer; an interval that includes 0.5 is "not shown", never "no effect", and a match that stopped early gives no verdict
followup: morning-read
est: ~5.5-7 h. J102 on this PC: 2,400 search-vs-search games in 4.8 h of play (7 workers, the 41-minute pause excluded), 51 s a game per worker; J112's arm B allowed up to 75 s. The cloud smoke (4 games each, 1 worker) measured the new switches' cost at about +7 s a game for the mulligan seat (one or two 6 s searches) and +3 s for the target seat (two 1.5 s searches). Mull match 1,200 x 58 s / 7 = ~2.8 h (up to 3.9 h at 75 + 7 s); targets match 1,200 x 54 s / 7 = ~2.6 h (up to 3.7 h); pilot ~10-15 min. Total ~5.5 h, at most ~8 h, under one night, so the two matches stay one job
resumable: no
timeout: 11h
clean: var/ai-ladder-pilot/J115
progress: metric match_games games of 2400
metrics: match_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&(l.includes("\"a\":\"search-v2-mull\"")||l.includes("\"a\":\"search-v2-targets\""))&&l.includes("\"b\":\"search-v1-anytime\""))n++;console.log(n)'
metrics: match_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&(l.includes("\"a\":\"search-v2-mull\"")||l.includes("\"a\":\"search-v2-targets\""))&&l.includes("\"b\":\"search-v1-anytime\"")&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: mm = sh: cat var/ai-ladder/match-J115-mull.json 2>/dev/null || echo '{"played":0}'
metrics: mt = sh: cat var/ai-ladder/match-J115-targets.json 2>/dev/null || echo '{"played":0}'
headline: mm.played, mm.score, mm.lo, mm.hi, mm.elo, mm.eloLo, mm.eloHi, mt.played, mt.score, mt.lo, mt.hi, mt.elo, mt.eloLo, mt.eloHi

**What is measured.** D417 (mtg-table #104) gave the search two more decision kinds. Each sits behind its own `SearchConfig` switch, and both are off by default, so search-v2 is unchanged:
- **`mull=1`, the opening hand.**
  - At `mulliganKeepHand`, keep is rolled out against one more London mulligan.
  - At the London bottom, Forge's cards are rolled out against single-card alternatives.
  - Rollouts start from the pre-game copy, after the determinization, and run to the end of game turn 6, with 6 s per decision.
  - Forge's answer is overruled only on the lcb rule: z 1, at least 3 paired rounds.
- **`targets=1`, the targets of the seat's own priority play.** For each part with a single target, Forge's target is rolled out against up to 5 other legal, visible targets. The search's own rule (margin 20) and budget (1.5 s) apply.

This job measures each switch alone, against the live seat's config, at the live budget.

**Players** (`tools/ai-ladder/players.json`, from #104). One name per config:
- `search-v2-mull`: search-v1-anytime + `mull=1`;
- `search-v2-targets`: search-v1-anytime + `targets=1`;
- `search-v1-anytime`: search-v2's exact config, hash `cdd55e02a89c`; the ladder keeps its name, as D412 says.

All three run on the wall clock (1.5 s) on purpose, because the live seat is what is measured. `search-v2-mull-targets` is registered but not played here.

**Size.** The question is whether each switch is worth about +15 Elo:
- J102 got ±6.8 Elo from 1,200 pairs, a score SE of 0.0050.
- At 600 pairs (1,200 games), the SE is 0.0071 and the 95% interval is about ±9.6 Elo.
- A true +15 Elo (a score of 0.5216) then clears 0.5 with about 86% probability.
- Two such matches take about 5.5 h. Matching J102's ±7 for each would need 2,400 games apiece, about 11 h or more, over a night.

**Seeds.** `match` starts at the PC host's base + 900,000 and takes the matchup's next unused block (D398). Neither matchup has been played before, and both have the same opponent, so the two matches play the **same deals**. That makes the two switches directly comparable.

**Changed answers.** Each match line carries `aSearch.byKind`: for each decision kind (p, a, b, m = keep/mulligan, k = London bottom, t = targets), decisions searched, how many changed Forge's answer, and the rate. `searched` and `changed` stay p + a + b, as J102 counted them, so the budget-fallback rate means what it did.

**When it runs.** There is no `after:`. J114 (heavy, 7 cores, ~1-1.5 h) is ahead of it in id order, and the core budget keeps this job waiting until J114 ends. `cores: 7` takes the whole width, so no other heavy job runs beside it, and every player sees the same CPU. The deals are mirrored, so Justin at the table or any light job falls on both sides alike.

## Pilot
About 10-15 minutes: the build, the bench self-test (its ten D417 scenarios included), and 8 games of each match in their own ladder folder, so they never enter the real results.
```bash
./bridge/build.sh
./tools/ai-bench.sh --selftest
./tools/ai-ladder.sh match search-v2-mull search-v1-anytime --games 8 --purpose pilot --dir var/ai-ladder-pilot/J115/mull --experiments var/ai-ladder-pilot/J115/mull/experiments.jsonl --out var/ai-ladder-pilot/J115/mull.json --jobs {workers}
./tools/ai-ladder.sh match search-v2-targets search-v1-anytime --games 8 --purpose pilot --dir var/ai-ladder-pilot/J115/targets --experiments var/ai-ladder-pilot/J115/targets/experiments.jsonl --out var/ai-ladder-pilot/J115/targets.json --jobs {workers}
```
metrics: pm = sh: cat var/ai-ladder-pilot/J115/mull.json 2>/dev/null || echo '{"played":0}'
metrics: pt = sh: cat var/ai-ladder-pilot/J115/targets.json 2>/dev/null || echo '{"played":0}'
check: pm.complete == true
check: pm.played == 8
check: pm.errors + pm.timeouts <= 1
check: pm.aSearch.byKind.m.searched >= 4
check: pm.bSearch.searched >= 20
check: pt.complete == true
check: pt.played == 8
check: pt.errors + pt.timeouts <= 1
check: pt.aSearch.byKind.t.searched >= 4
check: pt.bSearch.searched >= 20

The pilot only asks whether anything is broken:
- the build and the self-test pass;
- both 8-game matches finish;
- the mulligan seat searched its opening hands (one per game at least: the smoke had 5 in 4 games);
- the target seat searched its targets (the smoke had 8 in 4 games);
- the opponent searched as search-v2.

There are no timing or win-rate bounds. The matches themselves are the test.

## Commands
```bash
./tools/ai-ladder.sh match search-v2-mull search-v1-anytime --games 1200 --hours 5 --out var/ai-ladder/match-J115-mull.json --jobs {workers}
./tools/ai-ladder.sh match search-v2-targets search-v1-anytime --games 1200 --hours 5 --out var/ai-ladder/match-J115-targets.json --jobs {workers}
tail -2 var/ai-ladder/match.jsonl
```
check: mm.complete == true
check: mm.played == 1200
check: mm.errors + mm.timeouts <= mm.played / 20
check: mt.complete == true
check: mt.played == 1200
check: mt.errors + mt.timeouts <= mt.played / 20

## Abort if
abort: match_err >= 30 and match_err > match_games / 10

This aborts on engine trouble only: once 30 games have ended in an engine error or a timeout, it stops if they are more than one in ten. The matches have no stopping rule, so the job never stops early on the score.

## Report
collect: var/ai-ladder/match-J115-mull.json
collect: var/ai-ladder/match-J115-targets.json

summary.md should give, for each switch on its own:
- the score against search-v1-anytime with its 95% interval, the same in Elo, and the pair and game counts;
- how often it changed Forge's answer:
  - for mull: `aSearch.byKind.m` (keep/mulligan) and `aSearch.byKind.k` (London bottom);
  - for targets: `aSearch.byKind.t`;
  - each as searched, changed and rate;
- each side's p/a/b decisions searched and changed, its budget-fallback rate with the interval, and the other fallback reasons;
- draws, errors and timeouts;
- the reading under the rule above: ADOPT, or NOT SHOWN with the interval.

The two matches were played on the same deals, so a line comparing the two scores is welcome. It decides nothing.

Never write "no gain" for an interval that includes 0.5. If a match stopped early (`complete: false`), say so; that switch gets no verdict.
