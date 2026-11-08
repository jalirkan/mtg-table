id: J198
title: The faster seat: one fixed 4,800-game match (2,400 mirrored pairs, D398, the confirm set, no stopping rule) of search-v2-ms750-r6, search-v2 at 0.75 s and 6 rounds a decision, against search-v1-anytime (search-v2, the live seat at 1.5 s and 12), on new deal blocks, J195's (c) never pooled, with a pre-registered reading: FASTER SEAT HOLDS, FASTER SEAT FAILS or INCONCLUSIVE AT 4,800. This job never changes the live seat
public_title: Faster search seat: one fixed 4,800-game match
public_est: ~8-9 h (one night)
public_decides: Whether the AI seat could think half as long at a small, bounded cost
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
alone: yes
repos: mtg-table@456150367b87379bd61365007eb77925da8dd504 (main at 45615036, D519's review on top of D521's and D519's merges; the newest main when this job was written. Its players and its search are J195's: `git diff ea313c01 45615036` (J195's pin to this one) changes nothing under bridge/src, tools/ai-ladder or tools/ai-bench; its one config.json line is D518's coach.evalModel, which nothing the ladder runs reads. Pinned so every game of the match is one code version, D341, and the pilot checks that diff is empty)
decides: whether the live seat could think half as long (0.75 s and 6 rounds a decision instead of 1.5 s and 12) at a cost of at most 10 Elo, measured with 95% confidence at four times J195's (c) games. FASTER SEAT HOLDS makes search-v2-ms750-r6's settings a candidate for the live seat, for the owner to decide under a separate decision (D52x) with its own evidence and, under D509, a seat-queue row, never this job's. FASTER SEAT FAILS says it is clearly more than 10 Elo weaker, and the live seat stays. INCONCLUSIVE AT 4,800 leaves the question as information and the live seat stays. Whatever the reading, this job never changes the live seat: SearchConfig.LIVE_DEFAULTS stays `anytime=1` over the parse defaults of 1,500 ms and 12 rounds (D517 Decision 4)
hypothesis: J195's (c) read -4.6 Elo [-14.3, +5.0] (score 0.4933 [0.4795, 0.5072], 600 pairs, 0 errors and timeouts) for search-v2-ms750-r6 against search-v2, "indistinguishable from search-v2" but not "at most 10 Elo weaker" (its lower end -14.3), at 535 against 928 ms a decision (x0.58) and 9.28 against 15.45 rollouts (x0.60), with budget fallbacks 1.5% [1.2%, 1.9%] against search-v2's 0.5% [0.3%, 0.7%]. J194 and J195 together drew a flat curve from x0.5 to x4 (x2 -4.1, x4 +1.7) with a bend only at x0.25 (-14.5 [-26.1, -2.9]), so a true effect for x0.5 near J195's point, a few Elo, is the expectation; J195's point is itself a 1,200-game estimate (+-9.65 Elo), so the true value could be anywhere from about -14 to +5. At 4,800 games the interval is about +-4.8 Elo (J197, this host's last 4,800-game search-vs-search match, came out +-5.0), so HOLDS needs a point above about -5.2 Elo, FAILS a point below about -14.8, and anything between reads INCONCLUSIVE AT 4,800. Under that width, as approximations: a true -4.6 (J195's point) HOLDS about 60% of the time, FAILS essentially never (about 0.002%) and is INCONCLUSIVE about 40%; a true 0 HOLDS about 98%; a true -2.5 about 87%; a true -5 about 53%; a true -7.5 about 17%; a true -10 HOLDS about 2.5% (the lower end's one-sided error, the reason HOLDS is a candidate for a decision and not an adoption), FAILS about 2.5% and is INCONCLUSIVE about 95%; a true -15 FAILS about 53%; a true -20 FAILS about 98%. "Indistinguishable from search-v2" (the interval contains 0) holds for a point within about +-4.8: a true -4.6 reads so about 53% of the time, a true 0 about 95%. All of this is information, not a prediction any check reads
rule: written 2026-11-08 before any J198 game was played (after J195, whose (c) line is the reason for this match, and after J197, whose 4,800-game width it sizes from), word for word: "FASTER SEAT HOLDS if the match is complete and search-v2-ms750-r6's Elo lower end is above −10 (eloLo > −10): the live seat at 0.75 s and 6 rounds is at most 10 Elo weaker than at 1.5 s and 12, and a separate decision may move the live seat there. FASTER SEAT FAILS if its upper end is below −10 (eloHi < −10): clearly weaker, the live seat stays. Otherwise INCONCLUSIVE AT 4,800: the live seat stays and the question is left as information." The bar is D517's own "at most 10 Elo weaker" (D517 Decision 5: "when its LOWER end is above −10 Elo — the bar a later, separate live-seat decision would cite"), now with a verdict at four times the games. The match: one fixed match (D398, no stopping rule) of 4,800 games (600 batches of 8, 2,400 mirrored pairs) on the confirm deck set (tools/ai-bench/pairs-confirm.txt, 30 deck pairs never tuned on), search-v2-ms750-r6 vs search-v1-anytime, var/ai-ladder/match-J198.json. In the rule the "Elo lower end" and "upper end" are the match line's eloLo and eloHi, the arm being the match's first player. The match is COMPLETE when its line names the two players in that order, is not J195's (c) (id justin-a-B650-GAMING-X-AX-V2:20261107T201409-2913027), says complete: true, all 4,800 games were played, engine errors plus timeouts are at most 240 (one in 20, J195's 60 of 1,200) and it carries eloLo and eloHi as numbers. Read only when complete, exactly one reading: FASTER SEAT HOLDS when eloLo > -10 (verdict holds 1, liveSeatCandidate 1); FASTER SEAT FAILS when eloHi < -10 (fails 1); INCONCLUSIVE AT 4,800 otherwise (inconclusive4800 1); the first two cannot both hold, since eloLo <= eloHi. An incomplete match gives no verdict. Beside the reading, descriptive and deciding nothing, as D517 words it: "indistinguishable from search-v2" when the complete match's Elo interval contains 0 (eloLo < 0 < eloHi; verdict indistinguishable 1); a HOLDS whose lower end is at or above 0 is reported as what it is (the faster seat measured no weaker), never as a reason to change anything here. The match is a NEW match: its games are those whose purpose is its own match:<host>:<run>, never J195's (c) 1,200, which are not pooled with it; J195's (c) line is reported beside it as a description only. Reported beside every reading, never changing one: each side's milliseconds per decision (p + a + b, and by kind) and their ratio, rollouts and rounds per searched decision and the decisions decided on fewer than two rounds (`search.anytime.short`), budget fallbacks with their interval on both sides (J195's (c): 1.5% [1.2%, 1.9%] against 0.5% [0.3%, 0.7%]) and other fallbacks, searched and changed decisions by kind, what the live 1.5 s buys over the arm (minus its Elo, interval [-eloHi, -eloLo]), and the deal blocks played. The verdict never sets the live seat: liveSeatChanged is 0 in every reading. An interval that includes 0 is never "no effect" and never "no cost"
followup: morning-read
est: ~8-9 h at 7 workers (an estimate; range 7-9.5 h), 11.25 h at worst (the match's own stop). From two walls on this host at 7 workers: J195's (c), this very matchup, took 1 h 48 min for 1,200 games (15:14 to 17:02 on 2026-11-07, two brief drops to 6 workers), so 4,800 games are ~7.2 h at that pace; J197, a search-v2 mirror at ~935 ms a decision on both sides, took 9 h 30 min for 4,800 games (00:23 to 09:53 on 2026-11-08) under 30 pressure events (workers down to 4 at times), and J195's (c) ran at 0.83 of the same night's (b) mirror's wall (1 h 48 min against 2 h 10 min), so J197's pressured pace scaled is ~7.9 h. That is the "about 25% faster" one side thinking half as long buys: a game costs both sides' thinking plus 3.5-4 s of engine time, and here one side's thinking is 0.58x. ~8-9 h allows for a night as pressured as J197's. The match stops itself at --hours 11.25 (about 1.3x the estimate), under the 12 h timeout; a match that reaches its stop reports complete: false and gives no verdict. The ladder's default 300 s per-game timeout, as J195's (c). Pilot ~10 min (the build, the bench self-test, the ladder tests, 4 games on one worker)
resumable: no
timeout: 12h
clean: var/j198 var/ai-ladder-pilot/J198 var/ai-ladder/match-J198.json
progress: metric j198_games games of 4800
metrics: j198_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const J195C="match:justin-a-B650-GAMING-X-AX-V2:20261107T201409-2913027";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&!l.includes("\"purpose\":\""+J195C+"\"")&&l.includes("\"a\":\"search-v2-ms750-r6\"")&&l.includes("\"b\":\"search-v1-anytime\""))n++;console.log(n)'
metrics: j198_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const J195C="match:justin-a-B650-GAMING-X-AX-V2:20261107T201409-2913027";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&!l.includes("\"purpose\":\""+J195C+"\"")&&l.includes("\"a\":\"search-v2-ms750-r6\"")&&l.includes("\"b\":\"search-v1-anytime\"")&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cm = sh: cat var/ai-ladder/match-J198.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: ro = sh: cat var/j198/rollouts.json 2>/dev/null || echo '{"games":0}'
metrics: bs = sh: cat var/j198/seeds.json 2>/dev/null || echo '{"blocks":0,"games":0,"j195cBlocks":0,"overlap":-1}'
metrics: v = sh: cat var/j198/verdict.json 2>/dev/null || echo '{"written":0,"complete":0,"holds":0,"fails":0,"inconclusive4800":0,"indistinguishable":0,"liveSeatCandidate":0,"liveSeatChanged":0}'
headline: cm.played, cm.score, cm.lo, cm.hi, cm.elo, cm.eloLo, cm.eloHi, cm.aSearch.msPerDecision, cm.bSearch.msPerDecision, v.costRatio, cm.aSearch.budgetRate, cm.bSearch.budgetRate, ro.aRolloutsPerDecision, ro.bRolloutsPerDecision, ro.ratio, v.holds, v.fails, v.inconclusive4800, v.indistinguishable, v.liveSeatCandidate, bs.min, bs.max, bs.overlap

**Why this job** (J195's (c); D517 Decision 5's curve readings). J195 matched search-v2 with its wall-clock budget and
its round cap halved together, `search-v2-ms750-r6`, against search-v2 at 1,200 games: -4.6 Elo [-14.3, +5.0], score
0.4933 [0.4795, 0.5072] over 600 pairs, no engine errors or timeouts, at 535 against 928 ms a decision. D517 gave the
curve arms no verdict, only two descriptive readings; (c) earned the first, "indistinguishable from search-v2" (its
interval contains 0), and missed the second, "at most 10 Elo weaker" (its lower end -14.3 is under -10), which D517
names "the bar a later, separate live-seat decision would cite". D517 also said what 1,200 games could do with that
bar: an arm about as strong as search-v2 misses it about a third of the time, so "a later live-seat decision that
cites the bar may need more games than this". This is those games: one matchup, one fixed size, the bar D517 named,
with a verdict this time, written before any game. J195's report and verdict are
`~/code/lab/pc-results/results/J195/report.md` and `verdict.json`.

**What it does not do.** It never changes the live seat. `SearchConfig.LIVE_DEFAULTS` stays `anytime=1` over the
parse defaults of 1,500 ms and 12 rounds (D517 Decision 4; D412's search-v2). A FASTER SEAT HOLDS reading makes the
0.75 s / 6-round settings a candidate, and nothing more: moving the seat is a separate decision (D52x) the owner
approves, with its own evidence, and under D509 a seat-queue row. The owner's words on the curve (D514's point 3) are
why the question is worth a night: "a production model needs to be fast but we can experiment for testing".

**What is played** (D517's players, unchanged at this pin). `tools/ai-ladder/players.json`, kind `search`:
- `search-v2-ms750-r6`, config hash `ef6def992355`:
  `Default+outlets+search:ms=750,cands=6,turns=0,rounds=2,margin=20,maxrounds=6,what=pab,seed=0,anytime=1`;
- against `search-v1-anytime` (search-v2, the live seat's config), config hash `cdd55e02a89c`:
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1`.

These are the hashes J195's (c) match line recorded, and the pilot checks both, as strings, with the config strings:
the arm's must be search-v1-anytime's with `ms=1500` and `maxrounds=12` replaced by 750 and 6 and nothing else. The
budget and the cap are scaled together for D514's reason (a budget alone leaves the cap binding where the deadline
had been). The pin moved from J195's `ea313c01` to `45615036` only because main moved (D518, D519, D520, D521:
the evaluator's tooling, a reading, the fit's saves, the runner): `git diff ea313c01 45615036 --stat -- bridge/src
tools/ai-ladder tools/ai-bench config.json` lists only `config.json`'s `coach.evalModel`, which the coach helper
reads and the ladder does not. The pilot repeats the diff over the three code folders on the runner's checkout and
fails if it is not empty, so the 4,800 games play J195's code.

**A new match, not a pooled one** (D398). The match counts only games whose purpose is its own `match:<host>:<run>`
(`cmdMatch` in `tools/ai-ladder/cli.ts` filters the results by purpose), so J195's (c) 1,200 games are not in it.
Pooling them would put the games that prompted this match inside it; J195's (c) line is reported beside J198's as a
description, in its own row, and never added in. The verdict script refuses a match line carrying J195's (c) id.

**Deal blocks.** A match's batches take the host's match base (114,000,000 + 900,000 = 114,900,000) and then, one
batch at a time, the matchup's next unused block: `nextBseed` (`tools/ai-ladder/schedule.ts`) walks up from the base
past every block the matchup has used in either order, counted from the results log and from the batches running
(`Session.usedBseeds`, keyed by the unordered matchup). On this host the matchup `search-v2-ms750-r6` /
`search-v1-anytime` has used exactly 114,900,000-114,900,149, J195's (c) (read from the runner's results log on
2026-11-08: 1,200 games, 150 blocks, no other purpose). So J198's 600 batches take **114,900,150-114,900,749**: new
blocks for this matchup, not J195's 150 again. A deal is a function of the block number, so these are the deals
J197 played (its routlets match took the same 600 blocks), which this matchup has never played; nothing is read
across the two matches. Each batch plays two consecutive deck pairs from a start fixed by the block number
(`batchPairs`: start (bseed mod 30) x 2 mod 30), and 600 consecutive blocks give each of the confirm set's 30 deck
pairs exactly 40 batches, 160 games, in both seat orders. `var/j198-tools/seeds.cjs` reads the blocks the match
actually played from the results log; the checks require 600 blocks, all 4,800 games, none of J195's (c) 150
blocks, and those 150 still in the log (if they had vanished, `nextBseed` would hand out J195's (c) deals again, and
the overlap check would mean nothing). A match retried after a memory stop takes the next unused blocks after the
stopped attempt's, so its deals then differ from these; the stopped attempt's games stay in the log under their own
purpose and are never counted.

**The cost, read beside the reading.** The match line carries each side's milliseconds per decision (p + a + b, by
kind), decisions searched and changed by kind, and fallbacks with the budget fallback rate and its interval. It has
no rollout count, so `var/j198-tools/rollouts.cjs` (J197's reader, which is J195's, with one counter added,
`search.anytime.short`, the decisions decided on fewer than the two minimum rounds) sums each side's batch counters
into rollouts, rounds and short decisions per searched decision. J195's (c): 535 against 928 ms (x0.58), 9.28
against 15.45 rollouts (x0.60), 3.36 against 5.94 rounds, budget fallbacks 424 of 27,744 (1.5% [1.2%, 1.9%]) against
137 of 27,549 (0.5% [0.3%, 0.7%]). Run read-only over J195's (c) batches on 2026-11-08, this reader reproduces J195's 9.28 / 15.45 rollouts and 3.36 / 5.94 rounds a decision, and finds 3,174 of the arm's 27,744 decisions short (11.4%) against search-v2's 950 of 27,549 (3.4%); D517's pilot had 5 of 99. A budget fallback hands the
decision back to Forge's answer, so the arm's higher rate is part of what it costs in strength, and the score already
holds it. The exposure fields the reader also writes (`opportunity.*`, `policy.*`) are J197's, read here as
information about nothing in particular: neither side runs the outlet rollouts.

**The match** (D398, `ai-ladder.sh match`, the confirm set, mirrored pairs, no stopping rule), 4,800 games, 2,400
pairs, in the real ladder folder `var/ai-ladder` on this host: `search-v2-ms750-r6` vs `search-v1-anytime`, `--out
var/ai-ladder/match-J198.json`. Verdict: FASTER SEAT HOLDS, FASTER SEAT FAILS or INCONCLUSIVE AT 4,800.

**Why one match and no tuning.** The arm changes two linked numbers, scaled together, and that change is the
hypothesis; the deals and decks are the held-out confirm set on blocks this matchup never played. Nothing is
selected, so the score is read as it is. The match was posted because J195's (c) came out close to search-v2; that
selection is why its 1,200 games stay out.

**When it runs.** `alone: yes` (D521 Decision 5): a ladder match plays to wall-clock budgets, and this one's whole
question is what half the budget buys, so it is admitted only onto an empty machine and nothing, heavy or light, is
admitted beside it; while it is next and waits, nothing newer starts. `cores: 7` keeps the width J195's (c) and
J197's estimates were measured at. No `after:`. It may run beside the art session's GPU painting queue, which is
outside the lab and CPU-light but not memory-free: J197 logged 30 memory-pressure events (drops and raises, workers
down to 4), J195 24. The runner's memory rule handles that without the job: a drop takes one worker away as that
worker's game ends and a raise gives it back; it changes no deal and no side's budget, and the deals are mirrored,
so the load falls on both sides alike. Since D521 the runner raises a running step's reservation once it has run an
hour (the largest worker's VmHWM x 1.4 against the declared 2 GB: J197's 1.76 GB gave 17.2 GB for 7 workers), and a
memory stop is retried first. A memory stop is still the one event this single block handles badly: the retry starts
the match again from its first game on new blocks, under a fresh `--hours 11.25`.

## Pilot
About 10 minutes:
- the pin is merged;
- the build, the bench self-test and the ladder registry test;
- `ai-ladder.sh list` resolves both players at J195's (c) hashes, `ef6def992355` and `cdd55e02a89c`, checked as
  strings, and the arm's seat config is search-v1-anytime's with `ms=1500` and `maxrounds=12` replaced by 750 and 6
  and nothing else;
- the files changed under `bridge/src`, `tools/ai-ladder` and `tools/ai-bench` since J195's pin: none;
- J195's (c) blocks are in the results log (150 blocks, 114,900,000-114,900,149, 1,200 games), so the match's blocks
  will start after them;
- the verdict script, the block reader and the rollout reader written and tested on synthetic files;
- 4 games of the arm against `search-v1-anytime`, one worker, in the pilot's own folder: both sides search, the arm
  thinks less a decision than search-v2 and stays within its 6-round cap, and the rollout reader agrees with the
  match line.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j198-merged.txt || echo 0 > var/j198-merged.txt
cat var/j198-merged.txt
./bridge/build.sh
./tools/ai-bench.sh --selftest
node --test web/test/ai-ladder.test.ts
```
```bash
# both players resolve at J195's (c) hashes, and the arm is search-v2 with ms and maxrounds halved and nothing else (D517)
mkdir -p var/j198-tools
./tools/ai-ladder.sh list > var/j198-tools/players.txt
grep -E '^(search-v1-anytime|search-v2-ms750-r6) ' var/j198-tools/players.txt
node - <<'J198EOF'
// J198's pilot: both players resolve, at the hashes J195's (c) match line recorded (compared as strings), and the arm
// is search-v1-anytime (search-v2) with `ms=1500` -> `ms=750` and `maxrounds=12` -> `maxrounds=6` and nothing else.
const fs = require('fs');
const L = fs.readFileSync('var/j198-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const v1 = get('search-v1-anytime'), m7 = get('search-v2-ms750-r6');
const V1CFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1';
const M7CFG = 'Default+outlets+search:ms=750,cands=6,turns=0,rounds=2,margin=20,maxrounds=6,what=pab,seed=0,anytime=1';
const r = {
  present: [v1, m7].every((p) => p && p.cfg) ? 1 : 0,
  v1_cfg_ok: v1 && v1.kind === 'search' && v1.cfg === V1CFG ? 1 : 0,
  ms750_only_ms_and_cap: m7 && m7.kind === 'search' && v1 && v1.cfg === V1CFG && m7.cfg === M7CFG
    && m7.cfg === v1.cfg.replace(':ms=1500,', ':ms=750,').replace(',maxrounds=12,', ',maxrounds=6,') ? 1 : 0,
  hashes_ok: v1 && m7 && String(v1.hash) === 'cdd55e02a89c' && String(m7.hash) === 'ef6def992355' ? 1 : 0,
  hashes: { 'search-v1-anytime': v1?.hash ?? null, 'search-v2-ms750-r6': m7?.hash ?? null },
  cfgs: { 'search-v1-anytime': v1?.cfg ?? null, 'search-v2-ms750-r6': m7?.cfg ?? null },
};
r.ok = r.present && r.v1_cfg_ok && r.ms750_only_ms_and_cap && r.hashes_ok ? 1 : 0;
fs.writeFileSync('var/j198-tools/players.json', JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J198EOF
# the players and the search since J195's pin ea313c01: expected none (D518-D521 touched neither)
git diff --name-only ea313c01c3a11b4653fb332b0647a031988f3ac3 HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j198-tools/search-diff.txt || true
node -e 'const fs=require("fs");const f=fs.readFileSync("var/j198-tools/search-diff.txt","utf8").split("\n").filter(Boolean);const r={files:f,count:f.length};fs.writeFileSync("var/j198-tools/search-diff.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
```
```bash
cat > var/j198-tools/verdict.mjs <<'J198EOF'
// J198's reading, pre-registered 2026-11-08 before any J198 game (the job's rule: line; D517 Decision 5's "at most 10
// Elo weaker" bar, given a verdict at 4,800 games; D398's fixed match).
// usage: node verdict.mjs <match.json> <rollouts.json> <out.json>     node verdict.mjs --selftest <scratch dir>
// THE MATCH: search-v2-ms750-r6 (config A) against search-v1-anytime (search-v2, the live seat), 4,800 games, 2,400
//   mirrored pairs, the confirm set, no stopping rule. It is a NEW match: J195's (c) 1,200 games (match id J195C_ID)
//   are never in it and never pooled with it; J195's (c) line is carried beside it as a description only (J195_C).
// COMPLETE: the match line names the two players in that order, is not J195's (c), says complete: true, all 4,800
//   games were played, errors + timeouts <= 240 (one in 20), and eloLo and eloHi are numbers.
// THE RULE, word for word: "FASTER SEAT HOLDS if the match is complete and search-v2-ms750-r6's Elo lower end is
//   above −10 (eloLo > −10): the live seat at 0.75 s and 6 rounds is at most 10 Elo weaker than at 1.5 s and 12, and
//   a separate decision may move the live seat there. FASTER SEAT FAILS if its upper end is below −10 (eloHi < −10):
//   clearly weaker, the live seat stays. Otherwise INCONCLUSIVE AT 4,800: the live seat stays and the question is left
//   as information." Exactly one reading when complete:
//   HOLDS                  eloLo > -10      (holds 1, liveSeatCandidate 1: a candidate for a separate decision);
//   FAILS                  eloHi < -10      (fails 1);
//   INCONCLUSIVE AT 4,800  otherwise        (inconclusive4800 1).
//   HOLDS and FAILS cannot meet (eloLo <= eloHi).
// DESCRIPTIVE, deciding nothing (D517's wording): "indistinguishable from search-v2" when the complete match's Elo
//   interval contains 0, eloLo < 0 < eloHi (indistinguishable 1).
// THE COST, reported beside every reading and never changing one: each side's ms per decision and their ratio, each
//   side's budget fallbacks with their interval, and (from rollouts.cjs, only when its file names this match's run)
//   rollouts, rounds and short decisions per searched decision.
// THE LIVE SEAT: this job never changes it; liveSeatChanged is 0 in every reading.
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 4800;
export const BAR = GAMES / 20;
export const LINE = -10;
export const A = 'search-v2-ms750-r6';
export const B = 'search-v1-anytime';
export const J195C_ID = 'justin-a-B650-GAMING-X-AX-V2:20261107T201409-2913027';
export const J195_C = { id: J195C_ID, played: 1200, pairs: 600, score: 0.4933, lo: 0.4795, hi: 0.5072, elo: -4.6, eloLo: -14.3, eloHi: 5,
  aMs: 534.972, bMs: 927.53, aRolloutsPerDecision: 9.28, bRolloutsPerDecision: 15.45, aRoundsPerDecision: 3.36, bRoundsPerDecision: 5.94,
  aBudget: { n: 424, rate: 0.015283, lo: 0.01154, hi: 0.019025 }, bBudget: { n: 137, rate: 0.004973, lo: 0.003031, hi: 0.006915 },
  indistinguishable: 1, atMost10Weaker: 0, blocks: '114900000-114900149' };

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const neg = (x) => (x === null ? null : Math.round(-x * 10) / 10 + 0);
const budget = (t) => ({ n: num(t?.fallback?.budget) ?? 0, rate: num(t?.budgetRate), lo: num(t?.budgetLo), hi: num(t?.budgetHi) });

export function verdict(m, ro = null) {
  const names = m !== null && m.a === A && m.b === B ? 1 : 0;
  const notJ195c = m !== null && m.id !== J195C_ID ? 1 : 0;
  const s = {
    match: m === null ? 0 : 1, names, notJ195c, a: A, b: B, id: m?.id ?? null, ah: m?.ah ?? null, bh: m?.bh ?? null,
    played: m?.played ?? 0, errors: m?.errors ?? null, timeouts: m?.timeouts ?? null, pairs: m?.pairs ?? null,
    score: num(m?.score), lo: num(m?.lo), hi: num(m?.hi), elo: num(m?.elo), eloLo: num(m?.eloLo), eloHi: num(m?.eloHi),
    aMs: num(m?.aSearch?.msPerDecision), bMs: num(m?.bSearch?.msPerDecision),
  };
  const complete = names === 1 && notJ195c === 1 && m.complete === true && m.played === GAMES && (m.errors ?? 0) + (m.timeouts ?? 0) <= BAR
    && s.eloLo !== null && s.eloHi !== null ? 1 : 0;
  const ok = complete === 1;
  const holds = ok && s.eloLo > LINE ? 1 : 0;
  const fails = ok && holds === 0 && s.eloHi < LINE ? 1 : 0;
  const inconclusive4800 = ok && holds === 0 && fails === 0 ? 1 : 0;
  const indistinguishable = ok && s.eloLo < 0 && s.eloHi > 0 ? 1 : 0;
  const buys = ok ? { elo: neg(s.elo), lo: neg(s.eloHi), hi: neg(s.eloLo) } : { elo: null, lo: null, hi: null };
  const costRatio = s.aMs !== null && s.bMs !== null && s.bMs > 0 ? Math.round((s.aMs / s.bMs) * 10000) / 10000 : null;
  const aBudget = budget(m?.aSearch), bBudget = budget(m?.bSearch);
  const run = typeof m?.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : null;
  const sameRun = ro !== null && run !== null && ro.run === run ? 1 : 0;
  const rr = (k) => (sameRun ? num(ro[k]) : null);
  const rollouts = { read: sameRun, games: rr('games'), a: rr('aRolloutsPerDecision'), b: rr('bRolloutsPerDecision'), ratio: rr('ratio'),
    aRounds: rr('aRoundsPerDecision'), bRounds: rr('bRoundsPerDecision'), aShortShare: rr('aShortShare'), bShortShare: rr('bShortShare') };
  const liveSeatCandidate = holds;
  const liveSeatChanged = 0;
  const pct = (x) => (x === null ? '-' : `${(x * 100).toFixed(1)}%`);
  const cost = costRatio === null ? 'no cost read'
    : `${s.aMs} against ${s.bMs} ms a decision (x${costRatio}); budget fallbacks ${pct(aBudget.rate)} [${pct(aBudget.lo)}, ${pct(aBudget.hi)}] against ${pct(bBudget.rate)} [${pct(bBudget.lo)}, ${pct(bBudget.hi)}]`;
  const ind = indistinguishable ? '; indistinguishable from search-v2 (its Elo interval contains 0)' : '';
  const reading = !ok ? (s.match === 0 ? 'NO MATCH: no verdict' : s.names === 0 ? 'NOT THIS MATCH: no verdict' : s.notJ195c === 0 ? 'J195\'S (c), NOT J198\'S: no verdict' : 'INCOMPLETE: no verdict')
    : holds ? `FASTER SEAT HOLDS: ${A}'s Elo lower end ${s.eloLo} is above -10 (point ${s.elo}, upper end ${s.eloHi})${ind}; ${cost}; the live 1.5 s buys ${buys.elo} Elo [${buys.lo}, ${buys.hi}] over it; a candidate for the live seat under a separate decision the owner approves; this job changes nothing`
    : fails ? `FASTER SEAT FAILS: ${A}'s Elo upper end ${s.eloHi} is below -10 (point ${s.elo}, lower end ${s.eloLo})${ind}; ${cost}; clearly weaker: the live seat stays`
    : `INCONCLUSIVE AT 4,800: ${A}'s Elo lower end ${s.eloLo}, point ${s.elo}, upper end ${s.eloHi}${ind}; ${cost}; the live seat stays and the question is left as information`;
  return { written: 1, games: GAMES, bar: BAR, line: LINE, ...s, complete, holds, fails, inconclusive4800, indistinguishable, buys,
    costRatio, aBudget, bBudget, rollouts, liveSeatCandidate, liveSeatChanged, reading, j195c: J195_C };
}

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const mk = (o = {}) => ({ id: 'host:run-198', a: A, b: B, complete: true, played: GAMES, errors: 0, timeouts: 0,
    score: 0.4934, lo: 0.4864, hi: 0.5003, elo: -4.6, eloLo: -9.4, eloHi: 0.2,
    aSearch: { msPerDecision: 535, budgetRate: 0.015, budgetLo: 0.0134, budgetHi: 0.0168, fallback: { budget: 1660, unmappable: 110 } },
    bSearch: { msPerDecision: 928, budgetRate: 0.005, budgetLo: 0.0042, budgetHi: 0.0059, fallback: { budget: 550, unmappable: 112 } }, ...o });
  const RO = (o = {}) => ({ run: 'run-198', games: GAMES, aRolloutsPerDecision: 9.3, bRolloutsPerDecision: 15.4, ratio: 0.604,
    aRoundsPerDecision: 3.4, bRoundsPerDecision: 5.9, aShortShare: 0.05, bShortShare: 0.004, ...o });
  const one = (r) => r.holds + r.fails + r.inconclusive4800 === 1 && r.liveSeatCandidate === r.holds && r.liveSeatChanged === 0;
  const none = (r) => r.complete === 0 && r.holds + r.fails + r.inconclusive4800 + r.indistinguishable === 0 && r.liveSeatCandidate === 0 && r.liveSeatChanged === 0;
  const cases = [
    ['J195 (c)\'s point at 4,800 games\' width ([-9.4, +0.2]) HOLDS, indistinguishable', mk(), RO(), (r) => r.holds === 1 && one(r) && r.indistinguishable === 1 && r.liveSeatCandidate === 1],
    ['a lower end of -9.9 HOLDS', mk({ elo: -5.1, eloLo: -9.9, eloHi: -0.3 }), RO(), (r) => r.holds === 1 && one(r) && r.indistinguishable === 0],
    ['a lower end of exactly -10 does not HOLD: INCONCLUSIVE AT 4,800', mk({ elo: -5.2, eloLo: -10, eloHi: -0.4 }), RO(), (r) => r.inconclusive4800 === 1 && one(r) && r.holds === 0 && r.liveSeatCandidate === 0],
    ['a lower end of -10.1 is INCONCLUSIVE AT 4,800', mk({ elo: -5.3, eloLo: -10.1, eloHi: -0.5 }), RO(), (r) => r.inconclusive4800 === 1 && one(r)],
    ['an upper end of -10.1 FAILS', mk({ elo: -14.9, eloLo: -19.7, eloHi: -10.1 }), RO(), (r) => r.fails === 1 && one(r) && r.liveSeatCandidate === 0],
    ['an upper end of exactly -10 does not FAIL: INCONCLUSIVE AT 4,800', mk({ elo: -14.8, eloLo: -19.6, eloHi: -10 }), RO(), (r) => r.inconclusive4800 === 1 && one(r) && r.fails === 0],
    ['an upper end of -9.9 is INCONCLUSIVE AT 4,800', mk({ elo: -14.7, eloLo: -19.5, eloHi: -9.9 }), RO(), (r) => r.inconclusive4800 === 1 && one(r)],
    ['a clear loss (-20 [-24.8, -15.2]) FAILS, not indistinguishable', mk({ score: 0.4712, elo: -20, eloLo: -24.8, eloHi: -15.2 }), RO(), (r) => r.fails === 1 && one(r) && r.indistinguishable === 0],
    ['-7 [-11.8, -2.2] is INCONCLUSIVE AT 4,800, not indistinguishable', mk({ elo: -7, eloLo: -11.8, eloHi: -2.2 }), RO(), (r) => r.inconclusive4800 === 1 && one(r) && r.indistinguishable === 0],
    ['-12 [-16.8, -7.2] is INCONCLUSIVE AT 4,800', mk({ elo: -12, eloLo: -16.8, eloHi: -7.2 }), RO(), (r) => r.inconclusive4800 === 1 && one(r)],
    ['0 [-4.8, +4.8] HOLDS, indistinguishable', mk({ score: 0.5, elo: 0, eloLo: -4.8, eloHi: 4.8 }), RO(), (r) => r.holds === 1 && one(r) && r.indistinguishable === 1],
    ['+6 [+1.2, +10.8] HOLDS, not indistinguishable (the faster seat measured no weaker)', mk({ score: 0.5086, elo: 6, eloLo: 1.2, eloHi: 10.8 }), RO(), (r) => r.holds === 1 && one(r) && r.indistinguishable === 0],
    ['a lower end of exactly 0 is not indistinguishable', mk({ elo: 4.8, eloLo: 0, eloHi: 9.6 }), RO(), (r) => r.holds === 1 && r.indistinguishable === 0],
    ['an upper end of exactly 0 is not indistinguishable, and HOLDS', mk({ elo: -4.8, eloLo: -9.6, eloHi: 0 }), RO(), (r) => r.holds === 1 && r.indistinguishable === 0],
    ['what the live 1.5 s buys is minus the interval', mk(), RO(), (r) => r.buys.elo === 4.6 && r.buys.lo === -0.2 && r.buys.hi === 9.4],
    ['the arm thinking longer than search-v2 still HOLDS: the cost never changes a reading', mk({ aSearch: { msPerDecision: 1600, budgetRate: 0.05, budgetLo: 0.04, budgetHi: 0.06, fallback: { budget: 5000 } } }), RO(), (r) => r.holds === 1 && one(r) && r.costRatio === 1.7241],
    ['the cost and both budget fallbacks are carried', mk(), RO(), (r) => r.costRatio === 0.5765 && r.aBudget.rate === 0.015 && r.aBudget.n === 1660 && r.bBudget.hi === 0.0059],
    ['the rollouts are read from this match\'s run', mk(), RO(), (r) => r.rollouts.read === 1 && r.rollouts.a === 9.3 && r.rollouts.aShortShare === 0.05],
    ['a rollout file from another run is not read, and changes no reading', mk(), RO({ run: 'run-x' }), (r) => r.rollouts.read === 0 && r.rollouts.a === null && r.holds === 1],
    ['J195 (c)\'s rollout file (its run) is not read', mk(), RO({ run: '20261107T201409-2913027', games: 1200 }), (r) => r.rollouts.read === 0],
    ['no rollout file changes no reading', mk(), null, (r) => r.holds === 1 && one(r) && r.rollouts.read === 0],
    ['a stopped match (complete: false, 3,000 played) gets no verdict', { ...mk(), complete: false, played: 3000 }, RO(), none],
    ['4,799 games is not complete', { ...mk(), played: 4799 }, RO(), none],
    ['241 errors and timeouts is not complete', mk({ errors: 200, timeouts: 41 }), RO(), none],
    ['240 errors and timeouts is complete', mk({ errors: 200, timeouts: 40 }), RO(), (r) => r.complete === 1 && r.holds === 1 && one(r)],
    ['a line without eloLo is not complete', { ...mk(), eloLo: null }, RO(), none],
    ['J195 (c)\'s own 1,200-game line is not this match', { id: J195C_ID, a: A, b: B, complete: true, played: 1200, errors: 0, timeouts: 0, score: 0.4933, lo: 0.4795, hi: 0.5072, elo: -4.6, eloLo: -14.3, eloHi: 5 }, RO(), none],
    ['J195 (c)\'s id on a 4,800-game line is still not this match', { ...mk(), id: J195C_ID }, RO(), (r) => r.notJ195c === 0 && none(r)],
    ['the players swapped is not this match', { ...mk(), a: B, b: A }, RO(), (r) => r.names === 0 && none(r)],
    ['search-v2-ms375-r3 in the file is not this match', { ...mk(), a: 'search-v2-ms375-r3' }, RO(), (r) => r.names === 0 && none(r)],
    ['search-v2-routlets (J197\'s arm) in the file is not this match', { ...mk(), a: 'search-v2-routlets' }, RO(), (r) => r.names === 0 && none(r)],
    ['no match file gives no verdict', null, RO(), (r) => r.match === 0 && none(r)],
    ['J195 (c) is carried beside, never pooled: the score is this match\'s alone', mk(), RO(), (r) => r.played === 4800 && r.eloLo === -9.4 && r.j195c.played === 1200 && r.j195c.eloLo === -14.3],
  ];
  let ok = 0;
  cases.forEach(([what, m, ro, pred], i) => {
    const fm = path.join(scratch, `case-${i}-m.json`), fr = path.join(scratch, `case-${i}-ro.json`);
    if (m !== null) fs.writeFileSync(fm, JSON.stringify(m));
    if (ro !== null) fs.writeFileSync(fr, JSON.stringify(ro));
    const r = verdict(read(fm), read(fr));
    const pass = pred(r);
    console.error(`${pass ? 'ok  ' : 'FAIL'} ${what}: ${r.reading}`);
    ok += pass ? 1 : 0;
  });
  return { selftest: 1, cases: cases.length, passed: ok, ok: ok === cases.length ? 1 : 0 };
}

function read(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

const argv = process.argv.slice(2);
if (argv[0] === '--selftest') {
  const r = selftest(argv[1]);
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
} else if (argv.length === 3) {
  const r = verdict(read(argv[0]), read(argv[1]));
  fs.mkdirSync(path.dirname(argv[2]), { recursive: true });
  fs.writeFileSync(argv[2], JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r));
} else {
  console.error('usage: node verdict.mjs <match.json> <rollouts.json> <out.json> | --selftest <dir>');
  process.exit(2);
}
J198EOF
cat > var/j198-tools/rollouts.cjs <<'J198EOF'
// J198: J197's reader (var/j197-tools/rollouts.cjs, itself J195's) with one counter added, `search.anytime.short`
// (decisions decided on fewer than the two minimum rounds, D517's Residuals), so J198's rollouts are read the way
// J195's (c) were. Rollouts per searched decision (p + a + b) for each side of one match: the match line has no
// rollouts field, so this reads each batch line's aStats/bStats `search.rollouts`, `search.rounds`,
// `search.anytime.short` and `search.<p|a|b>.considered` (config A is the match's first player, as
// tools/ai-ladder/match.ts tallyBatch reads it), and D389's ranking counters, which are 0 on both sides (neither ranks).
// Per game (one batch line is one game), as J197 read them and here information only: EXPOSED when a side's counts
// hold an `opportunity.*` key above 0, POLICY a `policy.*` key, TOUCHED `search.prior.ranked` above 0.
// usage: node rollouts.cjs <ladder dir> <match.json> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : '';
const bdir = `${dir}/batches/${run}`;
const side = () => ({ rollouts: 0, rounds: 0, short: 0, decisions: 0, ranked: 0, priorPlayouts: 0, priorCut: 0, priorTimedOut: 0, exposed: 0, policy: 0, touched: 0, lines: 0 });
const t = { a: side(), b: side() };
for (const f of run && fs.existsSync(bdir) ? fs.readdirSync(bdir).filter((x) => /^b\d+\.jsonl$/.test(x)) : []) {
  for (const line of fs.readFileSync(`${bdir}/${f}`, 'utf8').split('\n')) {
    let l; try { l = JSON.parse(line); } catch { continue; }
    for (const [k, st] of [['a', l.aStats], ['b', l.bStats]]) {
      const c = (st && st.counts) || {};
      const n = (x) => (typeof c[x] === 'number' ? c[x] : 0);
      t[k].rollouts += n('search.rollouts'); t[k].rounds += n('search.rounds'); t[k].short += n('search.anytime.short');
      t[k].decisions += n('search.p.considered') + n('search.a.considered') + n('search.b.considered');
      t[k].ranked += n('search.prior.ranked'); t[k].priorPlayouts += n('search.prior.playouts');
      t[k].priorCut += n('search.prior.cut'); t[k].priorTimedOut += n('search.prior.timedOut'); t[k].lines++;
      const keys = Object.keys(c).filter((x) => n(x) > 0);
      if (keys.some((x) => x.startsWith('opportunity.'))) t[k].exposed++;
      if (keys.some((x) => x.startsWith('policy.'))) t[k].policy++;
      if (n('search.prior.ranked') > 0) t[k].touched++;
    }
  }
}
const per = (s, x) => (s.decisions > 0 ? Math.round((s[x] / s.decisions) * 100) / 100 : null);
const sh = (s) => (s.decisions > 0 ? Math.round((s.short / s.decisions) * 10000) / 10000 : null);
const r = { run, a: m?.a ?? null, b: m?.b ?? null, aRolloutsPerDecision: per(t.a, 'rollouts'), bRolloutsPerDecision: per(t.b, 'rollouts'),
  aRoundsPerDecision: per(t.a, 'rounds'), bRoundsPerDecision: per(t.b, 'rounds'), aDecisions: t.a.decisions, bDecisions: t.b.decisions,
  aShort: t.a.short, bShort: t.b.short, aShortShare: sh(t.a), bShortShare: sh(t.b),
  aRanked: t.a.ranked, bRanked: t.b.ranked, aPriorPlayouts: t.a.priorPlayouts, aPriorCut: t.a.priorCut, aPriorTimedOut: t.a.priorTimedOut,
  aExposedGames: t.a.exposed, bExposedGames: t.b.exposed, aPolicyGames: t.a.policy, bPolicyGames: t.b.policy, aTouchedGames: t.a.touched, games: t.a.lines };
r.ratio = r.aRolloutsPerDecision !== null && r.bRolloutsPerDecision ? Math.round((r.aRolloutsPerDecision / r.bRolloutsPerDecision) * 1000) / 1000 : null;
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J198EOF
cat > var/j198-tools/seeds.cjs <<'J198EOF'
// J198: which deal blocks a match played, and that none of them is one J195's (c) played (D398 point 2: the
// matchup's next unused block from the host's match base, so a new match of the same matchup takes new blocks).
// Reads every results line of <ladder dir>/results/*.jsonl whose purpose is the match's own `match:<id>` (the id in
// <match.json>; none when the file is absent) and those of J195's (c) (its id below, a constant), and reports each
// one's games, distinct blocks (`bseed`), their lowest and highest, and how many of this match's blocks J195's (c) used.
// usage: node seeds.cjs <ladder dir> <match.json | none> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const J195C_PURPOSE = 'match:justin-a-B650-GAMING-X-AX-V2:20261107T201409-2913027';
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const purpose = m && typeof m.id === 'string' ? `match:${m.id}` : null;
const t = { mine: { games: 0, blocks: new Set() }, j195c: { games: 0, blocks: new Set() } };
const rdir = `${dir}/results`;
for (const f of fs.existsSync(rdir) ? fs.readdirSync(rdir).filter((x) => x.endsWith('.jsonl')) : []) {
  for (const line of fs.readFileSync(`${rdir}/${f}`, 'utf8').split('\n')) {
    if (!line.includes('"purpose":"match:')) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (typeof r.bseed !== 'number') continue;
    if (purpose !== null && r.purpose === purpose) { t.mine.games++; t.mine.blocks.add(r.bseed); }
    if (r.purpose === J195C_PURPOSE) { t.j195c.games++; t.j195c.blocks.add(r.bseed); }
  }
}
const sum = (s) => { const b = [...s.blocks].sort((x, y) => x - y); return { games: s.games, blocks: b.length, min: b.length ? b[0] : null, max: b.length ? b[b.length - 1] : null }; };
const mine = sum(t.mine), j195c = sum(t.j195c);
const r = { purpose, ...mine, j195cGames: j195c.games, j195cBlocks: j195c.blocks, j195cMin: j195c.min, j195cMax: j195c.max,
  overlap: [...t.mine.blocks].filter((b) => t.j195c.blocks.has(b)).length };
fs.writeFileSync(out, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J198EOF
rm -rf var/j198-tools/selftest
node var/j198-tools/verdict.mjs --selftest var/j198-tools/selftest > var/j198-tools/selftest.json
cat var/j198-tools/selftest.json
# the block reader on a synthetic results log: J195 (c)'s purpose at two blocks, a new match at two blocks (one of
# them J195 (c)'s) over three games, and a third purpose that must not count
rm -rf var/j198-tools/seeds-selftest
mkdir -p var/j198-tools/seeds-selftest/results
printf '%s\n' '{"purpose":"match:justin-a-B650-GAMING-X-AX-V2:20261107T201409-2913027","bseed":114900000}' '{"purpose":"match:justin-a-B650-GAMING-X-AX-V2:20261107T201409-2913027","bseed":114900149}' '{"purpose":"match:h:new","bseed":114900149}' '{"purpose":"match:h:new","bseed":114900150}' '{"purpose":"match:h:new","bseed":114900150}' '{"purpose":"match:h:other","bseed":114900151}' > var/j198-tools/seeds-selftest/results/h.jsonl
echo '{"id":"h:new"}' > var/j198-tools/seeds-selftest/match.json
node var/j198-tools/seeds.cjs var/j198-tools/seeds-selftest var/j198-tools/seeds-selftest/match.json var/j198-tools/seeds-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j198-tools/seeds-selftest/out.json","utf8"));const ok=r.games===3&&r.blocks===2&&r.min===114900149&&r.max===114900150&&r.j195cGames===2&&r.j195cBlocks===2&&r.overlap===1?1:0;require("fs").writeFileSync("var/j198-tools/seeds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the rollout reader on a synthetic batch folder: two games, each side's rollouts, rounds and short decisions
rm -rf var/j198-tools/ro-selftest
mkdir -p var/j198-tools/ro-selftest/batches/run-s
printf '%s\n' '{"aStats":{"counts":{"search.rollouts":90,"search.rounds":34,"search.anytime.short":1,"search.p.considered":8,"search.a.considered":2}},"bStats":{"counts":{"search.rollouts":150,"search.rounds":60,"search.p.considered":7,"search.b.considered":3}}}' '{"aStats":{"counts":{"search.rollouts":96,"search.rounds":34,"search.p.considered":10}},"bStats":{"counts":{"search.rollouts":158,"search.rounds":58,"search.anytime.short":1,"search.a.considered":10}}}' > var/j198-tools/ro-selftest/batches/run-s/b0.jsonl
echo '{"id":"h:run-s","a":"search-v2-ms750-r6","b":"search-v1-anytime"}' > var/j198-tools/ro-selftest/match.json
node var/j198-tools/rollouts.cjs var/j198-tools/ro-selftest var/j198-tools/ro-selftest/match.json var/j198-tools/ro-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j198-tools/ro-selftest/out.json","utf8"));const ok=r.games===2&&r.aDecisions===20&&r.bDecisions===20&&r.aRolloutsPerDecision===9.3&&r.bRolloutsPerDecision===15.4&&r.aRoundsPerDecision===3.4&&r.aShort===1&&r.bShort===1&&r.aShortShare===0.05&&r.ratio===0.604?1:0;require("fs").writeFileSync("var/j198-tools/ro-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# J195 (c)'s blocks in the real results log, before the match: the match's blocks start after them (nextBseed)
node var/j198-tools/seeds.cjs var/ai-ladder none var/j198-tools/seeds-j195c.json
```
```bash
# 4 games (one batch of one deck pair, one worker), in the pilot's own ladder folder and seed range, then each side's
# rollouts, rounds and short decisions per searched decision from the batch's counters (the match line has none)
./tools/ai-ladder.sh match search-v2-ms750-r6 search-v1-anytime --games 4 --batch-pairs 1 --host j198-pilot --purpose pilot --dir var/ai-ladder-pilot/J198 --experiments var/ai-ladder-pilot/J198/experiments.jsonl --out var/ai-ladder-pilot/J198/match.json --jobs 1
node var/j198-tools/rollouts.cjs var/ai-ladder-pilot/J198 var/ai-ladder-pilot/J198/match.json var/j198-tools/rollouts-pilot.json
```
metrics: merged = sh: cat var/j198-merged.txt 2>/dev/null || echo 0
metrics: pl = sh: cat var/j198-tools/players.json 2>/dev/null || echo '{"ok":0}'
metrics: sd = sh: cat var/j198-tools/search-diff.json 2>/dev/null || echo '{"count":-1}'
metrics: st = sh: cat var/j198-tools/selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: sst = sh: cat var/j198-tools/seeds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: rst = sh: cat var/j198-tools/ro-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: s195 = sh: cat var/j198-tools/seeds-j195c.json 2>/dev/null || echo '{"j195cBlocks":0}'
metrics: pm = sh: cat var/ai-ladder-pilot/J198/match.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pr = sh: cat var/j198-tools/rollouts-pilot.json 2>/dev/null || echo '{"games":0}'
check: merged == 1
check: pl.ok == 1
check: pl.ms750_only_ms_and_cap == 1
check: pl.hashes_ok == 1
check: sd.count == 0
check: st.ok == 1
check: st.cases == 33
check: sst.ok == 1
check: rst.ok == 1
check: s195.j195cGames == 1200
check: s195.j195cBlocks == 150
check: s195.j195cMin == 114900000
check: s195.j195cMax == 114900149
check: pm.complete == true
check: pm.played == 4
check: pm.errors + pm.timeouts <= 1
check: pm.aSearch.searched >= 10
check: pm.bSearch.searched >= 10
check: pr.games == 4
check: pr.aDecisions == pm.aSearch.searched
check: pr.bDecisions == pm.bSearch.searched
check: pr.aRoundsPerDecision <= 6
check: pm.aSearch.msPerDecision < pm.bSearch.msPerDecision
check: pm.bSearch.msPerDecision < 1500

The pilot asks only whether anything is broken:
- `merged`: the pinned commit is on `origin/main`;
- the build and the self-tests pass;
- both players resolve on this PC: `pl.ms750_only_ms_and_cap` says the arm's ai-bench config is search-v1-anytime's
  (itself checked against search-v2's string) with `ms=1500` and `maxrounds=12` replaced by 750 and 6 and nothing
  else, and `pl.hashes_ok` that both carry the hashes J195's (c) recorded, `ef6def992355` and `cdd55e02a89c`,
  compared as strings;
- `sd.count`: no file under `bridge/src`, `tools/ai-ladder` or `tools/ai-bench` changed since J195's pin, so the
  match plays J195's code (`sd.files` would list them);
- the verdict script reads thirty-three synthetic match files (and rollout files) as the rule says: the -10 lower end
  at and either side of its bar (-9.9 HOLDS, -10 and -10.1 do not), the -10 upper end the same (-10.1 FAILS, -10 and
  -9.9 do not), J195's (c) point at 4,800 games' width (HOLDS, indistinguishable), "indistinguishable" at an end of
  exactly 0 (not), a faster seat that measures stronger (HOLDS, reported as no weaker), a cost and a fallback rate
  that never change a reading, a rollout file from another run (J195's (c) among them) not read, 4,799 games, 241
  errors, a missing lower end and J195's (c) own line (by its id, and by its 1,200 games) refused, and the live seat
  never changed in any reading (`liveSeatChanged` 0);
- the block reader counts a match's own blocks, J195's (c) and their overlap on a synthetic log (`sst.ok`), the
  rollout reader sums rollouts, rounds and short decisions on a synthetic batch (`rst.ok`), and the real results log
  still holds J195's (c) 150 blocks, 114,900,000-114,900,149, 1,200 games (`s195`), which is what makes the match take
  114,900,150 onward;
- in 4 games both sides search, the rollout reader saw all 4 games and exactly the decisions the match line counts,
  search-v2 stays under its 1.5 s budget on average, the arm thinks less a decision than search-v2 (D517's pilot:
  439.7 against 699.1 ms; J195's (c): 535 against 928), and its rounds per searched decision stay at or under its cap
  of 6. The arm's own ms per decision is not bounded by 750 (a rollout in flight, ~63 ms, and its step clock 2 s past
  the deadline can carry a decision past it, D468); the two checks on it say only that the halved budget and the cap
  reached its seat.

Read, not checked:
- the arm's rollouts per decision against search-v2's (`pr.ratio`; J195's (c): 0.601) and its short decisions
  (`pr.aShort` of `pr.aDecisions`; D517's pilot: 5 of 99; J195's (c): 11.4% against search-v2's 3.4%).

There are no win-rate bounds. The match is the test.

## Commands
cores: 7
clean: var/ai-ladder/match-J198.json
```bash
# the faster seat: search-v2 at 0.75 s and 6 rounds against search-v2 at 1.5 s and 12, 4,800 games on new blocks, a verdict
test -f var/j198-tools/verdict.mjs
mkdir -p var/j198
echo "J198: search-v2-ms750-r6 against search-v1-anytime, 4,800 games on the confirm set (the faster seat; J195's (c) at four times the games)"
./tools/ai-ladder.sh match search-v2-ms750-r6 search-v1-anytime --games 4800 --hours 11.25 --out var/ai-ladder/match-J198.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 1
clean: var/j198/verdict.json var/j198/report.md var/j198/rollouts.json var/j198/seeds.json
```bash
# the pre-registered reading; the rollouts, rounds and short decisions; the blocks played; report.md (numbers only;
# the PC session writes the summary beside it)
node var/j198-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J198.json var/j198/rollouts.json
node var/j198-tools/seeds.cjs var/ai-ladder var/ai-ladder/match-J198.json var/j198/seeds.json
node var/j198-tools/verdict.mjs var/ai-ladder/match-J198.json var/j198/rollouts.json var/j198/verdict.json
node - <<'J198EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const m = read('var/ai-ladder/match-J198.json');
const ro = read('var/j198/rollouts.json');
const bs = read('var/j198/seeds.json');
const v = read('var/j198/verdict.json');
const j = v.j195c || {};
const pct = (x, d = 1) => (typeof x === 'number' ? `${(x * 100).toFixed(d)}%` : '-');
const runStart = (id) => {
  const x = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(id || '');
  return x ? Date.UTC(+x[1], +x[2] - 1, +x[3], +x[4], +x[5], +x[6]) : null;
};
const t0 = runStart(m.id), t1 = typeof m.at === 'string' ? Date.parse(m.at) : null;
const hours = t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null;
const b = v.buys || {};
const L = ['# J198: the faster seat, search-v2-ms750-r6 against search-v1-anytime, 4,800 games (D398; D517\'s "at most 10 Elo weaker" bar)', ''];
L.push(`**Reading under the pre-registered rule:** ${v.reading ?? 'no verdict'}.`, '');
L.push(`**The live seat:** unchanged by this job (liveSeatChanged ${v.liveSeatChanged ?? 0}); SearchConfig.LIVE_DEFAULTS stays anytime=1 at 1,500 ms and 12 rounds. ${v.holds ? 'FASTER SEAT HOLDS: the 0.75 s / 6-round settings are a candidate for the live seat, for the owner to decide under a separate decision (D52x) with its own evidence, and under D509 a seat-queue row.' : v.fails ? 'FASTER SEAT FAILS: clearly more than 10 Elo weaker; the live seat stays.' : v.inconclusive4800 ? 'INCONCLUSIVE AT 4,800: the live seat stays and the question is left as information.' : 'No verdict (the match is not complete).'}`, '');
L.push('| match | played / planned | complete | score [95%] | Elo [95%] | the live 1.5 s buys | pairs | draws, errors, timeouts | A ms per decision | B ms per decision | A / B ms | A rollouts per decision | B rollouts per decision | A / B rollouts | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
L.push(`| J198 ${m.a} vs ${m.b} | ${m.played} / ${m.planned} | ${m.complete} | ${m.score} [${m.lo}, ${m.hi}] | ${m.elo} [${m.eloLo}, ${m.eloHi}] | ${b.elo ?? '-'} [${b.lo ?? '-'}, ${b.hi ?? '-'}] | ${m.pairs} | ${m.draws}, ${m.errors}, ${m.timeouts} | ${(m.aSearch || {}).msPerDecision ?? '-'} | ${(m.bSearch || {}).msPerDecision ?? '-'} | ${v.costRatio ?? '-'} | ${ro.aRolloutsPerDecision ?? '-'} | ${ro.bRolloutsPerDecision ?? '-'} | ${ro.ratio ?? '-'} | ${hours ?? '-'} |`);
L.push(`| beside it, never pooled: J195 (c), the same matchup | ${j.played ?? '-'} / 1200 | true | ${j.score ?? '-'} [${j.lo ?? '-'}, ${j.hi ?? '-'}] | ${j.elo ?? '-'} [${j.eloLo ?? '-'}, ${j.eloHi ?? '-'}] | 4.6 [-5, 14.3] | ${j.pairs ?? '-'} | 0, 0, 0 | ${j.aMs ?? '-'} | ${j.bMs ?? '-'} | 0.5768 | ${j.aRolloutsPerDecision ?? '-'} | ${j.bRolloutsPerDecision ?? '-'} | 0.601 | 1.8 |`);
L.push('');
L.push(`Config hashes: ${m.a} ${m.ah}, ${m.b} ${m.bh}. Deck set ${m.set}; match id ${m.id}. Rounds per searched decision ${ro.aRoundsPerDecision ?? '-'} / ${ro.bRoundsPerDecision ?? '-'} (J195 (c): 3.36 / 5.94); decided on fewer than two rounds (search.anytime.short) ${ro.aShort ?? '-'} = ${pct(ro.aShortShare, 2)} / ${ro.bShort ?? '-'} = ${pct(ro.bShortShare, 2)}; the rollout reader saw ${ro.games ?? '-'} games and ${ro.aDecisions ?? '-'} / ${ro.bDecisions ?? '-'} searched decisions (the match line: ${(m.aSearch || {}).searched ?? '-'} / ${(m.bSearch || {}).searched ?? '-'}).`);
L.push(`Deal blocks: ${bs.blocks ?? '-'} blocks, ${bs.min ?? '-'} to ${bs.max ?? '-'}, ${bs.games ?? '-'} games; J195's (c) played ${bs.j195cBlocks ?? '-'} blocks, ${bs.j195cMin ?? '-'} to ${bs.j195cMax ?? '-'}; blocks in both: ${bs.overlap ?? '-'}. J195's (c) games are not in this match (its purpose is its own) and are not pooled with it.`);
const ab = v.aBudget || {}, bb = v.bBudget || {};
L.push(`Cost: the arm thought ${v.aMs ?? '-'} ms a decision against search-v2's ${v.bMs ?? '-'} (x${v.costRatio ?? '-'}); rollouts a decision x${ro.ratio ?? '-'}; budget fallbacks ${ab.n ?? '-'} = ${pct(ab.rate)} [${pct(ab.lo)}, ${pct(ab.hi)}] against ${bb.n ?? '-'} = ${pct(bb.rate)} [${pct(bb.lo)}, ${pct(bb.hi)}] (J195 (c): 1.5% [1.2%, 1.9%] against 0.5% [0.3%, 0.7%]). The cost changes no reading.`);
L.push('', '| side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks | step timeouts |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
for (const [who, t] of [[m.a, m.aSearch], [m.b, m.bSearch]]) {
  if (!t || !t.searched) { L.push(`| ${who} | no search | | | | | | | | | |`); continue; }
  const kd = t.byKind || {};
  const ch = (x) => (kd[x] ? `${kd[x].changed}/${kd[x].searched} (${pct(kd[x].rate)})` : '-');
  const other = Object.entries(t.fallback || {}).filter(([r]) => r !== 'budget').map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
  const ms = t.msMean || {};
  L.push(`| ${who} | ${t.searched} (${t.games}) | ${ch('p')} | ${ch('a')} | ${ch('b')} | ${t.changed}/${t.searched} (${pct(t.searched ? t.changed / t.searched : null)}) | ${t.msPerDecision} | ${ms.p ?? '-'} / ${ms.a ?? '-'} / ${ms.b ?? '-'} | ${(t.fallback || {}).budget ?? 0} = ${pct(t.budgetRate)} [${pct(t.budgetLo)}, ${pct(t.budgetHi)}] | ${other} | ${t.stepTimeouts ?? '-'} |`);
}
L.push('', `Rule parts: complete ${v.complete ?? 0} (complete: true, ${v.games} games, errors + timeouts at most ${v.bar}, eloLo and eloHi numbers); Elo lower end above -10: ${typeof m.eloLo === 'number' && m.eloLo > -10 ? 1 : 0}; Elo upper end below -10: ${typeof m.eloHi === 'number' && m.eloHi < -10 ? 1 : 0}. FASTER SEAT HOLDS ${v.holds ?? 0}, FASTER SEAT FAILS ${v.fails ?? 0}, INCONCLUSIVE AT 4,800 ${v.inconclusive4800 ?? 0}. Descriptive, deciding nothing: indistinguishable from search-v2 (the Elo interval contains 0) ${v.indistinguishable ?? 0}. Live-seat candidate (HOLDS; a separate decision) ${v.liveSeatCandidate ?? 0}; live seat changed by this job ${v.liveSeatChanged ?? 0}.`);
fs.mkdirSync('var/j198', { recursive: true });
fs.writeFileSync('var/j198/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J198EOF
```
check: cm.complete == true
check: cm.played == 4800
check: cm.errors + cm.timeouts <= 240
check: bs.games == cm.played
check: bs.blocks == 600
check: bs.j195cBlocks == 150
check: bs.overlap == 0
check: v.written == 1
check: v.complete == 1
check: v.holds + v.fails + v.inconclusive4800 == 1
check: v.holds == 1 or not (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloLo > -10)
check: v.holds == 0 or (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloLo > -10)
check: v.fails == 1 or not (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloHi < -10)
check: v.fails == 0 or (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloHi < -10)
check: v.indistinguishable == 1 or not (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloLo < 0 and cm.eloHi > 0)
check: v.indistinguishable == 0 or (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloLo < 0 and cm.eloHi > 0)
check: v.liveSeatCandidate == v.holds
check: v.liveSeatChanged == 0

The first three checks say the match is complete: it was not stopped, all 4,800 games were played, and at most one in
20 ended in an engine error or a timeout. The next four say it is a new match on new deals: the block reader found
every game, 600 blocks, J195's (c) 150 blocks still in the log, and none of them among the match's. The next three
say the verdict script ran, agrees the match is complete, and gave exactly one reading. The next four are the rule in
the runner's own language: `v.holds` is 1 exactly when the match is complete with its Elo lower end above -10, and
`v.fails` exactly when it is complete with its Elo upper end below -10 (so `v.inconclusive4800` is the rest, by the
check before). The next two say `v.indistinguishable` is 1 exactly when the complete match's Elo interval contains
0. The last two say the faster settings are a live-seat candidate exactly when HOLDS, and that the verdict never
changes the live seat. Any reading passes them; a reading is not a failure. The time per decision, the rollouts,
the short decisions, the changed answers and the fallbacks are reported, not gated.

## Abort if
abort: j198_err >= 30 and j198_err > j198_games / 10

Engine trouble only: once 30 games of the match have ended in an engine error or a timeout, the job stops if they are
more than one in ten. The match has no stopping rule on the score, so the job never stops early on a result. Both
counts leave out J195's (c) 1,200 games of the same matchup, which are in the same results log.

## Report
collect: var/ai-ladder/match-J198.json
collect: var/j198/verdict.json
collect: var/j198/report.md

`report.md` is the job's own numbers. The PC session writes `summary.md` from it, the same way as J195 and J197:
- **the reading under the rule:** FASTER SEAT HOLDS, FASTER SEAT FAILS or INCONCLUSIVE AT 4,800. Give the arm's score
  against search-v2 with its 95% interval, the same in Elo, what the live 1.5 s buys over it (minus that, interval
  [-eloHi, -eloLo]), and the pair and game counts. Say plainly, whatever the reading, that this job does not change
  the live seat: `SearchConfig.LIVE_DEFAULTS` stays `anytime=1` at 1,500 ms and 12 rounds. On a HOLDS, say that the
  0.75 s / 6-round seat is measured at most 10 Elo weaker with 95% confidence and that moving the live seat there is
  a separate decision (D52x) for the owner, with its own evidence and, under D509, a seat-queue row; say that a seat
  truly 10 Elo weaker reads HOLDS about 2.5% of the time, and if the lower end is at or above 0, that the faster
  seat measured no weaker. On a FAILS, say that it is clearly weaker and the live seat stays. On an INCONCLUSIVE AT
  4,800, say that the live seat stays and the question is left as information. Add "indistinguishable from
  search-v2" when `v.indistinguishable` is 1, as a description;
- **J195's (c) beside it, never pooled:** its line in its own row (-4.6 Elo [-14.3, +5.0] at 1,200 games, on blocks
  114,900,000-114,900,149) as a description of the match that prompted this one; never a combined score;
- **the compute each side spent:** ms per searched decision on both sides and their ratio (`v.costRatio`; J195's (c)
  0.58), by kind; rollouts and rounds per searched decision (`ro.ratio`; J195's (c) 0.60) and the short decisions
  on both sides (J195's (c): 11.4% against 3.4%); budget fallbacks with their interval on both sides against J195's (c) 1.5% and 0.5%, other
  fallbacks and step timeouts; the changed answers by kind on both sides. Read as what a person would wait: the
  arm's ms per decision is about what the faster seat would save a decision at the table, on this machine (wall
  clock budgets are machine-dependent, D388);
- **the deals:** the blocks played (`bs.min` to `bs.max`, expected 114,900,150-114,900,749) and that none was J195's
  (c);
- **the run:** draws, errors and timeouts, the match's hours against the 8-9 h estimate, the pressure events in
  STATUS (drops, raises, any stop and its retry), that it ran alone (D521), and whether the GPU queue or anything
  else outside the lab was running.

Never write "no loss", "no effect" or "no cost" for an interval that includes 0. If the match stopped early
(`complete: false`), say so: it gets no verdict, and what follows is a decision about reposting, not a reading.
