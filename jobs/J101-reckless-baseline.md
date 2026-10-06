id: J101
title: Reckless baseline (the outside review's T5): SPRT forge-reckless vs forge-default; SPRT search-v1-reckless vs search-v1; fixed 1,200-game matches of search-v1-reckless and search-v1 against forge-default on the same deals
public_title: Reckless baseline
public_est: one night (~6 to 9 h)
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@c9ae213 (main with #85, D398: `ai-ladder.sh match` and the `search-v1-reckless` player; pinned so every game is one code version, D341)
decides: whether ForgeCoach's Play vs Forge should default to Forge's Reckless profile as the stronger opponent, and whether the search should sit on Reckless instead of Default
public_decides: Reckless as the default opponent and as the search base
hypothesis: Reckless beats Default in cube games (D311: 60-40 over 100 paired games, paired p = 0.004, about +70 Elo), and the gain carries over when the search sits on Reckless
rule: written 2026-10-06 before the run. (A) Play vs Forge's default profile: SPRT forge-reckless vs forge-default (elo0 0, elo1 20, alpha = beta = 0.05, at most 4,000 games, mirrored deals on the confirm set). H1 -> Reckless becomes the default opponent; H0 or inconclusive -> Default stays. (C) The search's base: SPRT search-v1-reckless vs search-v1 (same parameters, at most 3,000 games). H1 -> the next search version sits on Reckless; H0 or inconclusive -> it stays on Default. (B) The two fixed matches (search-v1-reckless vs forge-default and search-v1 vs forge-default, 1,200 games each on the same deals) are reported as scores with 95% intervals and carry no verdict. They size what the search adds on each base, against the one opponent the ladder's scale is anchored to. H0 reads "not shown >= 20 Elo better", never "no gain"
followup: morning-read
est: ~6-9 h. (A) Forge vs Forge, a few hundred to 4,000 games at roughly 4 s a game on 7 workers: 0.2-0.7 h. (C) search vs search at the PC's measured 550-680 games/h (J055, J058): up to 3,000 games in 4.5-5.5 h; it stops sooner if the effect is near +70. (B) 2 x 1,200 search-vs-Forge games, half the search seats of (C): about 1-1.5 h each. Pilot ~10 min
resumable: no
timeout: 15h
clean: var/ai-ladder-pilot/J101
progress: metric j101_games games of 9400
metrics: j101_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const want=["forge-reckless|forge-default|sprt:","search-v1-reckless|search-v1|sprt:","search-v1-reckless|forge-default|match:","search-v1|forge-default|match:"];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n")){let r;try{r=JSON.parse(l)}catch{continue}if(r.at>="2026-10-06T16:00"&&want.some((w)=>{const [a,b,p]=w.split("|");return r.a===a&&r.b===b&&r.purpose.startsWith(p)}))n++}console.log(n)'
metrics: j101_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const want=["forge-reckless|forge-default|sprt:","search-v1-reckless|search-v1|sprt:","search-v1-reckless|forge-default|match:","search-v1|forge-default|match:"];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n")){let r;try{r=JSON.parse(l)}catch{continue}if(r.at>="2026-10-06T16:00"&&want.some((w)=>{const [a,b,p]=w.split("|");return r.a===a&&r.b===b&&r.purpose.startsWith(p)})&&(r.error||r.timeout))n++}console.log(n)'
metrics: sa = sh: cat var/ai-ladder/J101-sprt-reckless-vs-default.json 2>/dev/null || echo '{"games":0}'
metrics: sc = sh: cat var/ai-ladder/J101-sprt-search-reckless-vs-search.json 2>/dev/null || echo '{"games":0}'
metrics: mr = sh: cat var/ai-ladder/match-J101-search-reckless.json 2>/dev/null || echo '{"played":0}'
metrics: md = sh: cat var/ai-ladder/match-J101-search-default.json 2>/dev/null || echo '{"played":0}'
headline: sa.games, sa.score, sc.games, sc.score, mr.score, mr.elo, md.score, md.elo

**Why now.** The outside review (2026-10-06, T5) found that switching Forge's profile from Default to Reckless (D311: 60-40 over 100 paired games, paired p = 0.004) is about as large as everything the search has gained (one paired 200-game run, 56.5% against a 47.0% control). Neither number has been checked on the confirm deck set with the ladder's mirrored deals. The coach's Play vs Forge offers a profile picker (`ui/PlayProfile.tsx`, `POST /engine/start` with `aiProfile`, D381) and an AI picker (`aiPolicy`, M56). This job says which default is the stronger opponent and which profile the search should sit on.

**The players** (`tools/ai-ladder/players.json`):
- `forge-reckless` and `forge-default`: the anchors, stock Forge 2.0.14.
- `search-v1`: the live search seat (Default base, outlets on, 1.5 s wall clock).
- `search-v1-reckless`: registered by #85 (D398). It is the same seat with `profile: Reckless`. Its own answers are Reckless's, and so is its side of every rollout: the game copy keeps the seat's lobby player, which carries the profile. **The registry supports a search player with a Reckless base**, so (b) is done as asked.

Both search players are wall clock on purpose: they are the opponents a player would meet.

**The four measurements, in this order:**
1. (A) `sprt forge-reckless forge-default --elo0 0 --elo1 20`. The question has a direction: is Reckless the stronger default?
2. (C) `sprt search-v1-reckless search-v1 --elo0 0 --elo1 20`. Same kind of question for the search's base. It runs second so the decisive tests come first.
3. (B1) `match search-v1-reckless forge-default --games 1200`.
4. (B2) `match search-v1 forge-default --games 1200`. Its deals are B1's: `match` starts every matchup at the host base + 900,000, and the deck pairs are a function of the seed. B2 is also the search-vs-Forge measurement on the confirm set that the review could not find.

The order is A, C, B1, B2. If the night runs short, only the descriptive matches are lost, and a match stopped early says `complete: false`.

**Size.** The SPRT bounds are D373's defaults: at least 100 pairs and a variance floor of 0.05. A true +70 Elo (D311) decides (A) in a few hundred games. A 1,200-game match (600 mirrored pairs) gives a 95% interval of about ±20 Elo at a pair-score SD of 0.35.

**When it runs.** There is no `after:`. J099 (queue night 4) holds 7 of the 8 cores, so this job waits on the core budget until J099 ends, around 18:40 EDT on 2026-10-06. J102 is the next job by id. It also takes 7 cores, so it starts when this job ends. `cores: 7` keeps heavy jobs off the machine while the wall-clock players play. One light job may still run beside it. The deals are mirrored, so any load falls on both sides alike.

## Pilot
About 10 minutes on the PC (23 min in a shared 4-core container at 3 workers): the build, the bench self-test, a few games of each SPRT, and an 8-game match, all in their own ladder folder so they never enter the real results.
```bash
./bridge/build.sh
./tools/ai-bench.sh --selftest
P=var/ai-ladder-pilot/J101
./tools/ai-ladder.sh sprt forge-reckless forge-default --elo0 0 --elo1 20 --max-games 8 --purpose pilot --dir $P --experiments $P/experiments.jsonl --jobs {workers}
./tools/ai-ladder.sh sprt search-v1-reckless search-v1 --elo0 0 --elo1 20 --max-games 8 --purpose pilot --dir $P --experiments $P/experiments.jsonl --jobs {workers}
./tools/ai-ladder.sh match search-v1-reckless forge-default --games 8 --purpose pilot --dir $P --experiments $P/experiments.jsonl --out $P/match.json --jobs {workers}
```
metrics: pilot = ladder var/ai-ladder-pilot/J101
metrics: pm = sh: cat var/ai-ladder-pilot/J101/match.json 2>/dev/null || echo '{"played":0}'
check: pilot.games >= 20
check: pilot.errors + pilot.timeouts <= 2
check: pm.played == 8
check: pm.aSearch.searched >= 20
check: pm.bSearch.searched == 0

The pilot only asks whether anything is broken. Every player boots, games finish, and the Reckless search searches while stock Forge does not. There are no timing or win-rate bounds.

## Commands
```bash
./tools/ai-ladder.sh sprt forge-reckless forge-default --elo0 0 --elo1 20 --max-games 4000 --hours 2 --jobs {workers}
tail -1 var/ai-ladder/sprt.jsonl > var/ai-ladder/J101-sprt-reckless-vs-default.json
grep -q '"a":"forge-reckless","b":"forge-default"' var/ai-ladder/J101-sprt-reckless-vs-default.json
```
```bash
./tools/ai-ladder.sh sprt search-v1-reckless search-v1 --elo0 0 --elo1 20 --max-games 3000 --hours 6 --jobs {workers}
tail -1 var/ai-ladder/sprt.jsonl > var/ai-ladder/J101-sprt-search-reckless-vs-search.json
grep -q '"a":"search-v1-reckless","b":"search-v1"' var/ai-ladder/J101-sprt-search-reckless-vs-search.json
```
```bash
./tools/ai-ladder.sh match search-v1-reckless forge-default --games 1200 --hours 3 --out var/ai-ladder/match-J101-search-reckless.json --jobs {workers}
./tools/ai-ladder.sh match search-v1 forge-default --games 1200 --hours 3 --out var/ai-ladder/match-J101-search-default.json --jobs {workers}
```
check: sa.games >= 200
check: sc.games >= 200
check: mr.played >= 600
check: md.played >= 600
check: mr.errors + mr.timeouts + md.errors + md.timeouts <= (mr.played + md.played) / 20

## Abort if
abort: j101_games >= 300 and j101_err > j101_games / 10

This aborts on engine trouble only: more than one game in ten ending in an engine error or a timeout. The SPRTs stop themselves, and the matches have no stopping rule.

## Report
collect: var/ai-ladder/J101-sprt-reckless-vs-default.json
collect: var/ai-ladder/J101-sprt-search-reckless-vs-search.json
collect: var/ai-ladder/match-J101-search-reckless.json
collect: var/ai-ladder/match-J101-search-default.json

summary.md should give, one line each:
- (A) and (C): the SPRT result (H1 / H0 / inconclusive / stopped), games, pairs, score as a percentage and as Elo, and LLR with its bounds; the decision the rule gives, in D373's words. H0 is "not shown >= 20 Elo better".
- (B1) and (B2): the score against forge-default with its 95% interval, the same in Elo, and complete or not. Also each search seat's decisions searched, answers changed, and budget-fallback rate with its interval.
- The difference B1 - B2 in score, labelled as descriptive: the same deals, but two separate intervals, not a paired test.
- Errors and timeouts.

If (C) is inconclusive at 3,000 games, give its score and do not read a direction into it. Say plainly what the two decisions are: the default profile for Play vs Forge, and the search's base.

**Caveat for the summary.** Wall-clock players depend on the PC's speed. Forge's own 5 s AI timeout weakens it on a busy machine, and every result line carries the load average. The ratings are "against Forge in Forge's hands" on cube decks, not against humans.
