id: J212
title: The search's horizon (D537, config only, no play change): three fixed 1,200-game matches (600 mirrored pairs each, D398, the confirm set, no stopping rule) of search-v2 with its rollouts played one turn further against search-v1-anytime (search-v2, the live seat), each in a ladder folder of its own on blocks 114,900,000-114,900,149 -- search-v2-t1 (priority and block rollouts to the end of the next turn at 1.5 s), search-v2-a1 (attack rollouts one turn further at 1.5 s), search-v2-t1-x3 (t1 at 4.5 s, the round cap still 12) -- each read by D519's four readings at 1,200 games, pre-registered in D537; then, information only, 720 recorded games of search-v2 against Forge Default summarised. This job never changes the live seat
public_title: Search one turn deeper: three 1,200-game matches
public_est: ~11 h (one long night)
public_decides: Whether the search AI is stronger when its rollouts see the next turn
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
alone: yes
repos: mtg-table@b48cad1dbdf0b7e8c1fa92705e4fbc90822988f1 (the merge commit of D537's lane, pc/search-horizon, on main, its first parent d1d6b20f (D536's merge, J211's pin) or a main equal to it under every path a match runs; pin b48cad1d. It carries: three config-only ladder players in tools/ai-ladder/players.json (search-v2-t1 63c35e9f7d5b, search-v2-a1 3cf65e94df28, search-v2-t1-x3 ce99b41f9898), a check method in bridge/src/mtgtable/ai/DecisionSelfTest.java (horizonArms, 12 checks, no behaviour), the registry test (web/test/ai-ladder.test.ts), docs/decisions/D537-search-horizon.md and PLAN's rows. The pilot checks by content that, against d1d6b20f, the only files changed under bridge/src, tools/ai-ladder and tools/ai-bench are those two, players.json by four added lines and one removed, DecisionSelfTest.java by added lines only. Pinned so every game is one code version, D341)
decides: D537 points 6 and 7, from each arm's own match line alone. Each match against search-v1-anytime reads exactly one of D519's four readings at 1,200 games: SHOWN (lo > 0.5 and elo >= +15), SMALL GAIN (lo > 0.5 and elo < +15), INCONCLUSIVE AT 1,200 (lo <= 0.5 and eloHi >= +15), NOT SHOWN (lo <= 0.5 and eloHi < +15). A SHOWN or SMALL GAIN arm is a candidate for one 4,800-game confirmation against search-v1-anytime on deals no match has played, as its own job under its own decision; INCONCLUSIVE AT 1,200 is information; a NOT SHOWN arm is not played again. Nothing is adopted from 1,200 games and this job never changes the live seat (D509): SearchConfig.LIVE_DEFAULTS stays anytime=1 at turns=0. D537 point 8 says, as consequences and not rules, what the three readings together point at (the horizon pays at search-v2's clock; pays per rollout but not per second; pays for attacks; or is closed for Forge rollouts at this leaf). The recording step decides nothing
hypothesis: none registered on any reading. What is known: search-v2's rollouts end with the turn the decision is made in (turns=0: the AI's own for a play or an attack, the opponent's for a block), so the reply to a play or an attack is never played; with turns=1 a block's rollout plays the AI's own next turn. D312's pilot (October, the fixed-round search) put one more turn at about three times a rollout's cost with 53% budget fallbacks at 1.5 s; it was never played. D351's aturns=1 on the fixed-three-round search (search-v1-fixed3-aturns1) SPRT-stopped at 50.2% over 488 games; never played on the anytime search. More clock at turns=0 bought nothing (x0.25 -14.5, x0.5 -4.6 and at 4,800 games -6.5 [-11.7, -1.3], x2 -4.1, x4 +1.7 [-6.7, +10.2] Elo; J194, J195, J198). On these deals against Forge Default (J210's pab corner) search-v2 ran 15.17 rollouts a searched decision at 53.4 ms of play each and its attacks alone (only-a corner) 11.09 at 85.9 ms. Expected, not registered (D537 point 4): t1 at 1.5 s decides most alternatives on one or two paired rounds (the anytime loop prunes to what the time left carries), so its reading is the horizon plus thinner evidence; t1-x3 is the horizon at about search-v2's evidence a decision. Each reading's noise: the arm's own interval about +-11 Elo at 1,200 games (J209: -6.9 [-17.8, +3.9])
rule: D537 points 6 and 7, merged before any J212 game was played (written 2026-11-11 while J211 played), in their words (D537's bold dropped, its list set as sentences): "A match is complete when its line names the arm and search-v1-anytime in that order at their hashes, says complete: true, played all 1,200 games with errors plus timeouts at most 60, carries score, lo, elo, eloLo and eloHi, was played on exactly blocks 114,900,000-114,900,149 with no other match's game in its folder, every batch line carried the two seat configs of point 1 exactly, and both sides searched priority, attack and block decisions. Exactly one reading of a complete match, in this precedence, compared as the line carries them (lo in integer ten-thousandths, Elo in integer tenths): SHOWN: lo above 0.5 and elo at least +15; SMALL GAIN: lo above 0.5 and elo below +15; INCONCLUSIVE AT 1,200: lo at most 0.5 and eloHi at least +15; NOT SHOWN: lo at most 0.5 and eloHi below +15. An incomplete match gets no reading and is reposted alone under a new job id. Beside each reading, deciding nothing: indistinguishable (the Elo interval holds 0), a measured loss (wholly below), a measured gain (wholly above). ... A SHOWN or SMALL GAIN arm is a candidate for one 4,800-game confirmation against search-v1-anytime on deals no match has played (a host name of its own, as D536 point 6 did), under D519's readings, as its own job under its own decision; nothing is adopted from 1,200 games. An INCONCLUSIVE AT 1,200 is information and is not confirmed by this decision. A NOT SHOWN arm is not played again. No reading changes the live seat (D509)." The arms: search-v2-t1 (63c35e9f7d5b), search-v2-a1 (3cf65e94df28), search-v2-t1-x3 (ce99b41f9898), each A against B = search-v1-anytime (cdd55e02a89c). Each arm is read on its own match; the three are never pooled and no arm is read against another. The cost, the horizon's trace and the recording are reported and change no reading
followup: morning-read
est: ~11 h at 7 workers (an estimate; range 9.5-13 h), 18.5 h at worst (the stops). From this host at 7 workers, alone: a 1,200-game match against search-v2 takes about 0.47 h + 0.0436 h x both sides' search seconds a game (a least-squares fit over 19 finished matches, J194 (b) and (c) to J209; residual sd 0.15 h, largest +0.37 h; J195 (b), search-v2-ranked against search-v2 at 41.3 s a game, took 2.17 h, and J194 (b), an arm at four times the clock, 79.0 s a game, 3.94 h). B searches about 22 s a game. t1 ~31 s a game (priority and blocks near the 1.5 s budget a decision, attacks as now): ~2.8 h. a1 ~25 s: ~2.5 h. t1-x3 ~60 s (priority and blocks near three times search-v2's 935 ms a decision, attacks ~1.3 s): ~4.0 h, 4.7 h at ~74 s. The recording, 720 games of search-v2 against Forge Default: J194 (a) played 1,200 such games in 1.27 h, plus D347's 12% for the records: ~0.9 h. Pilot ~0.5 h (the build, the tests, three 4-game ladder matches and four 4-game recorded runs). The matches stop themselves at --hours 4.5, 4 and 7 and the recording at 2 h, under the 8 h step timeout, so a slow match cannot let the timeout cut it; a match that reaches its own stop reports complete: false and gets no reading. Memory pressure holding the night at 5 or 6 workers (as in J210) adds about a fifth
resumable: no
timeout: 9h
clean: var/j212 var/j212-tools var/j212-t1 var/j212-a1 var/j212-x3 var/ai-ladder-pilot/J212-t1 var/ai-ladder-pilot/J212-a1 var/ai-ladder-pilot/J212-x3 var/ai-ladder/match-J212-t1.json var/ai-ladder/match-J212-a1.json var/ai-ladder/match-J212-x3.json var/ai-bench/j212-rec var/ai-bench/j212-pilot-rec-t1 var/ai-bench/j212-pilot-rec-a1 var/ai-bench/j212-pilot-rec-x3 var/ai-bench/j212-pilot-rec-v2
progress: metric j212_games games of 3600
metrics: j212_games = sh: node -e 'const fs=require("fs");const C={t1:"search-v2-t1",a1:"search-v2-a1",x3:"search-v2-t1-x3"};let n=0;for(const k in C){const f="var/j212-"+k+"/results";for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\""+C[k]+"\"")&&l.includes("\"b\":\"search-v1-anytime\""))n++}console.log(n)'
metrics: j212_err = sh: node -e 'const fs=require("fs");const C={t1:"search-v2-t1",a1:"search-v2-a1",x3:"search-v2-t1-x3"};let n=0;for(const k in C){const f="var/j212-"+k+"/results";for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\""+C[k]+"\"")&&l.includes("\"b\":\"search-v1-anytime\"")&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++}console.log(n)'
metrics: mt1 = sh: cat var/ai-ladder/match-J212-t1.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: ma1 = sh: cat var/ai-ladder/match-J212-a1.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: mx3 = sh: cat var/ai-ladder/match-J212-x3.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: v = sh: cat var/j212/v.json 2>/dev/null || echo '{"written":0,"completeCount":0,"readings":0,"candidates":-1,"t1Gain":-1,"a1Gain":-1,"x3Gain":-1,"perRolloutOnly":-1,"horizonClosedPB":-1,"horizonClosedA":-1,"liveSeatChanged":1,"t1":{"complete":0,"names":0,"hashes":0,"blocks":0,"cfgs":0,"kindsOk":0,"shown":-1,"smallGain":-1,"inconclusive1200":-1,"notShown":-1,"candidate":-1,"measuredLoss":-1,"measuredGain":-1,"indistinguishable":-1,"liveSeatChanged":1},"a1":{"complete":0,"names":0,"hashes":0,"blocks":0,"cfgs":0,"kindsOk":0,"shown":-1,"smallGain":-1,"inconclusive1200":-1,"notShown":-1,"candidate":-1,"measuredLoss":-1,"measuredGain":-1,"indistinguishable":-1,"liveSeatChanged":1},"x3":{"complete":0,"names":0,"hashes":0,"blocks":0,"cfgs":0,"kindsOk":0,"shown":-1,"smallGain":-1,"inconclusive1200":-1,"notShown":-1,"candidate":-1,"measuredLoss":-1,"measuredGain":-1,"indistinguishable":-1,"liveSeatChanged":1}}'
metrics: rec = sh: cat var/j212/records.json 2>/dev/null || echo '{"written":0,"games":0,"files":0,"bad":-1,"pSearched":0,"aSearched":0,"bSearched":0,"rc":-1}'
headline: mt1.played, mt1.elo, mt1.eloLo, mt1.eloHi, ma1.played, ma1.elo, ma1.eloLo, ma1.eloHi, mx3.played, mx3.elo, mx3.eloLo, mx3.eloHi, v.t1.shown, v.t1.smallGain, v.t1.inconclusive1200, v.t1.notShown, v.a1.shown, v.a1.smallGain, v.a1.inconclusive1200, v.a1.notShown, v.x3.shown, v.x3.smallGain, v.x3.inconclusive1200, v.x3.notShown, v.candidates, v.perRolloutOnly, v.horizonClosedPB, v.horizonClosedA, rec.games, rec.pSearched

**Why this job** (D536 point 10; D537). search-v2's rollouts stop at the end of the turn the decision is
made in (`turns=0`: the AI's own for a play or an attack, the opponent's for a block) and are scored by a heuristic
leaf, so the search never sees the reply to a play or an attack: a held card is worth the leaf's 40
points, an attack is valued with no crack-back, and passing is valued at this turn's end. More clock at this
horizon bought nothing (J194, J195, J198), and J210 put most of the search's strength in its priority decisions.
The horizon is the one value axis never matched on search-v2 (the anytime search). This night plays it, config
only.

**What it does not do.** It does not change the live seat, propose a change, tune anything, pool the three matches
or read one arm against another. It does not read any outcome by deck or by deal. The recording step decides
nothing.

**What is played.** Three `ai-ladder.sh match` runs of 1,200 games each: 600 mirrored pairs (each deal played twice
with the seats swapped) in 150 batches of 8 games on the confirm deck set, with no stopping rule on the score
(D398). B is `search-v1-anytime` (`cdd55e02a89c`, `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1`) in all three. A is, in order:
1. `search-v2-t1` (`63c35e9f7d5b`): `...turns=1,...,seed=0,aturns=0,anytime=1`. Priority and block rollouts play to
   the end of the next turn; attacks keep this turn (`aturns=0` is written out: unset, it follows `turns`). 1.5 s.
2. `search-v2-a1` (`3cf65e94df28`): `...turns=0,...,seed=0,aturns=1,anytime=1`. Attack rollouts play to the end of
   the next turn (the crack-back); priority and blocks keep this turn. 1.5 s.
3. `search-v2-t1-x3` (`ce99b41f9898`): `ms=4500,...,turns=1,...,seed=0,aturns=0,anytime=1`. t1 at 4.5 s a searched
   decision with the round cap still 12, about search-v2's evidence a decision at the deeper horizon. The budget is
   every kind's, so its attacks get 4.5 s at this turn's horizon too (D537 point 3).
Every match runs at `--game-timeout 900` (J194's for its arms that lift the clock; it cuts only a stuck game).

**The deals.** Each match runs in a ladder folder of its own, `var/j212-<arm>`, emptied by its own block before it
starts, on this host's own seed base, so each takes blocks 114,900,000-114,900,149 (J210's and J194 (a)'s deals),
on a first run and on a retry after a memory stop (D535 point 2). No arm here has played a game, so none was chosen
on these deals (D536 point 6's reason for J211's own host does not apply). The block reader checks the range after
each match and the verdict refuses any other.

**The readings** (D537 point 6): D519's four, at 1,200 games, exactly one per complete match: SHOWN, SMALL GAIN,
INCONCLUSIVE AT 1,200, NOT SHOWN. Beside each, deciding nothing: indistinguishable, a measured loss or a measured
gain. A SHOWN or SMALL GAIN arm is a candidate for one 4,800-game confirmation under its own decision.

**Beside each reading, as description only** (D537 point 9): each side's searched decisions by kind, ms a searched
decision overall and by kind, search seconds a game (ms a decision x searched / games played), rollouts and complete
rounds a searched decision (all kinds together: the counters are not kept by kind), ms of play a finished rollout
(the horizon's own trace), the share decided on fewer than 2 paired rounds, the priority overrides by direction (from
pass, to another play, to pass) a priority decision, and the land windows left to Forge a game.

**The recording step** (D537 point 10; information only). After the three matches and their reading:
`search-v1-anytime`'s seat config against `Default` (Forge Default) on the confirm set, 24 games a deck pair (720
games, seed 212100001: bench deals, not the ladder's), through `ai-bench.sh play --record-all`, which writes each
seat's own gzipped log with that seat's decision records under `var/ai-bench/j212-rec/games/` (D347). The
summarizer reads the search seat's records and reports, by kind: sigma_d (the standard deviation of a candidate's
paired difference to Forge's answer, seDiff x sqrt(n), Forge's answer being rolled first in every round), rollouts a
candidate, candidates a decision for all searched decisions, legal options against options considered, complete
rounds, the horizon; and for the priority windows the search did not search: the land drops it skipped (and how many
had another land or a castable play), the own-main windows Forge passed without a search, and the windows outside
the seat's own main phases with a legal non-mana play. What the records do not carry (the paired-round count itself,
per-round leaves, rollouts by kind) is said in the summary, not approximated. About 125 MB of logs. A failure here
is recorded (`rec.rc`) and changes nothing above it.

**When it runs.** Alone (`alone: yes`, D521): search players think against a wall clock. The PC session runs no
build, gate or test beside it.

## Pilot
About 30 minutes:
- the pin is merged;
- the build (the lint and its self-test, javac, the decision self-test with D537's 12 new checks: 404 in all), the
  bench self-test and the ladder registry test (which holds the three arms' params, seat configs and hashes);
- `ai-ladder.sh list` resolves the five players (the anchor, search-v2, the three arms) at their registered hashes,
  checked as strings, and each arm's seat config is exactly D537's, which is search-v2's with only the named keys
  changed;
- the code, by content: against J211's pin d1d6b20f the only files changed under `bridge/src`, `tools/ai-ladder`
  and `tools/ai-bench` are `tools/ai-ladder/players.json` (4 lines added, 1 removed: three players appended) and
  `bridge/src/mtgtable/ai/DecisionSelfTest.java` (lines added only), and git answered;
- this host's seed base is 114,000,000 and an empty folder's first match block 114,900,000;
- the verdict script, the rollout reader, the block reader and the recording summarizer written and tested on
  synthetic files;
- three 4-game ladder matches, one per arm against search-v1-anytime, one batch pair, one worker, each in its own
  pilot folder under `--host j212-pilot`: both sides search, the match line names the arm and search-v2 at their
  hashes, the batch lines carry the two seat configs exactly, and the rollout reader agrees with the match line;
  THE HORIZON, from these matches: t1's and t1-x3's ms of play a finished rollout at least 1.3 times search-v2's
  (`search.playUs / search.rollouts` on each side of the same 4 games; one more turn of play is expected at about
  two to three times, D312), a1's read and not checked (its deeper rollouts are attacks only, about a sixth of the
  rollouts);
- THE HORIZON, exactly: four recorded runs of 4 games each against Forge Default (one deck pair, two workers), one
  per arm and one of search-v2, whose decision records carry each searched decision's horizon: t1 and t1-x3 search
  priority at horizon 1 and attacks at 0 and no block at 0; a1 searches attacks at 1 and priority at 0 and no block
  at 1; search-v2 searches everything at 0. These runs also prove the recording step's command and summarizer on real
  records.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j212-merged.txt || echo 0 > var/j212-merged.txt
cat var/j212-merged.txt
rc=0; ./bridge/build.sh > var/j212-build.txt 2>&1 || rc=$?
cat var/j212-build.txt
# the build's decision self-test: its line, with 0 failures (J210's pilot printed 392 checks; D537 adds 12)
node -e 'const fs=require("fs");const t=fs.readFileSync("var/j212-build.txt","utf8");const m=/^decision selftest: (\d+) check\(s\), (\d+) failure\(s\)$/m.exec(t);const r={ok:m&&m[2]==="0"?1:0,checks:m?Number(m[1]):0,failures:m?Number(m[2]):-1};fs.writeFileSync("var/j212-decision-selftest.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
test "$rc" -eq 0
./tools/ai-bench.sh --selftest
node --test web/test/ai-ladder.test.ts
```
```bash
# the five players resolve at their registered hashes; each arm's seat config is exactly D537's
mkdir -p var/j212-tools
./tools/ai-ladder.sh list > var/j212-tools/players.txt
grep -E '^(forge-default|search-v1-anytime|search-v2-t1|search-v2-a1|search-v2-t1-x3) ' var/j212-tools/players.txt || true
node - <<'J212EOF'
// J212's pilot: the players resolve, at D537's hashes (compared as strings), and each arm's seat config is search-v2's
// with only the keys D537 names changed.
const fs = require('fs');
const L = fs.readFileSync('var/j212-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const V2 = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1';
const WANT = {
  'forge-default': { hash: '3ed453ffef1c', cfg: 'Default', kind: 'forge' },
  'search-v1-anytime': { hash: 'cdd55e02a89c', cfg: V2, kind: 'search' },
  'search-v2-t1': { hash: '63c35e9f7d5b', kind: 'search',
    cfg: V2.replace(',turns=0,', ',turns=1,').replace(',anytime=1', ',aturns=0,anytime=1') },
  'search-v2-a1': { hash: '3cf65e94df28', kind: 'search', cfg: V2.replace(',anytime=1', ',aturns=1,anytime=1') },
  'search-v2-t1-x3': { hash: 'ce99b41f9898', kind: 'search',
    cfg: V2.replace('ms=1500,', 'ms=4500,').replace(',turns=0,', ',turns=1,').replace(',anytime=1', ',aturns=0,anytime=1') },
};
// D537's seat configs, written out, so the replace() above cannot drift with them
const LITERAL = {
  'search-v2-t1': 'Default+outlets+search:ms=1500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=0,anytime=1',
  'search-v2-a1': 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=1,anytime=1',
  'search-v2-t1-x3': 'Default+outlets+search:ms=4500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=0,anytime=1',
};
const r = { present: 0, cfgs_ok: 0, literal_ok: 0, hashes_ok: 0, kinds_ok: 0, distinct: 0, hashes: {}, cfgs: {} };
const got = Object.fromEntries(Object.keys(WANT).map((n) => [n, get(n)]));
r.present = Object.values(got).every((p) => p && p.cfg) ? 1 : 0;
r.cfgs_ok = Object.entries(WANT).every(([n, w]) => got[n] && got[n].cfg === w.cfg) ? 1 : 0;
r.literal_ok = Object.entries(LITERAL).every(([n, c]) => got[n] && got[n].cfg === c && WANT[n].cfg === c) ? 1 : 0;
r.hashes_ok = Object.entries(WANT).every(([n, w]) => got[n] && String(got[n].hash) === w.hash) ? 1 : 0;
r.kinds_ok = Object.entries(WANT).every(([n, w]) => got[n] && got[n].kind === w.kind) ? 1 : 0;
r.distinct = new Set(Object.values(got).map((p) => p && p.hash)).size === 5 ? 1 : 0;
for (const n of Object.keys(WANT)) { r.hashes[n] = got[n]?.hash ?? null; r.cfgs[n] = got[n]?.cfg ?? null; }
r.ok = r.present && r.cfgs_ok && r.literal_ok && r.hashes_ok && r.kinds_ok && r.distinct ? 1 : 0;
fs.writeFileSync('var/j212-tools/players.json', JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J212EOF
# the code since J211's pin d1d6b20f under the paths a match runs: exactly players.json (+4 -1) and DecisionSelfTest.java (+n -0)
git diff --name-only d1d6b20fd87480c91ffc1ac7b794f8f85c030f9a HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j212-tools/search-diff.txt && echo 0 > var/j212-tools/search-diff.rc || echo 1 > var/j212-tools/search-diff.rc
git diff --numstat d1d6b20fd87480c91ffc1ac7b794f8f85c030f9a HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j212-tools/search-numstat.txt && echo 0 > var/j212-tools/search-numstat.rc || echo 1 > var/j212-tools/search-numstat.rc
node - <<'J212EOF'
const fs = require('fs');
const files = fs.readFileSync('var/j212-tools/search-diff.txt', 'utf8').split('\n').filter(Boolean).sort();
const rc = Number(fs.readFileSync('var/j212-tools/search-diff.rc', 'utf8').trim()) === 0 && Number(fs.readFileSync('var/j212-tools/search-numstat.rc', 'utf8').trim()) === 0 ? 0 : 1;
const num = {};
for (const l of fs.readFileSync('var/j212-tools/search-numstat.txt', 'utf8').split('\n').filter(Boolean)) {
  const [a, d, f] = l.split('\t');
  num[f] = { add: Number(a), del: Number(d) };
}
const P = 'tools/ai-ladder/players.json', D = 'bridge/src/mtgtable/ai/DecisionSelfTest.java';
const r = { files, count: files.length, rc,
  exact: JSON.stringify(files) === JSON.stringify([D, P].sort()) ? 1 : 0,
  playersAdd: num[P] ? num[P].add : -1, playersDel: num[P] ? num[P].del : -1,
  dstAdd: num[D] ? num[D].add : -1, dstDel: num[D] ? num[D].del : -1 };
fs.writeFileSync('var/j212-tools/search-diff.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J212EOF
# this host's seed base: an empty folder's first match block is 114,900,000 (J210's deals), and the pilot's host has another
cat > var/j212-tools/base.mjs <<'J212EOF'
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const S = await import(pathToFileURL(path.resolve('tools/ai-ladder/schedule.ts')).href);
const name = os.hostname().replace(/[^A-Za-z0-9._-]/g, '_') || 'host';
const own = S.hostBase(name), pilot = S.hostBase('j212-pilot');
const first = S.nextBseed(own + 900000, new Set());
const r = { own, first, pilot, ok: own === 114000000 && first === 114900000 && pilot !== own ? 1 : 0 };
fs.writeFileSync('var/j212-tools/base.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J212EOF
node var/j212-tools/base.mjs
```
```bash
cat > var/j212-tools/verdict.mjs <<'J212EOF'
// J212's reading, pre-registered 2026-11-11 before any J212 game (the job's rule: line; D537 points 5 to 8; D398's
// fixed match; D519's four readings, written for 1,200 games by D537 as D519 point 6 asks a later rule to).
// usage: node verdict.mjs <match dir> <j212 dir> <out.json>        node verdict.mjs --selftest <scratch dir>
//   <match dir>/match-J212-<k>.json is arm k's match line, <j212 dir>/seeds-<k>.json its block reader's file and
//   <j212 dir>/rollouts-<k>.json its rollout reader's, for k in t1, a1, x3.
// THE MATCHES: each arm (config A) against search-v1-anytime (config B, search-v2, the live seat), 1,200 games, 600
//   mirrored pairs, the confirm set, no stopping rule, each in a ladder folder of its own (var/j212-<k>, emptied by
//   its block) on this host's own seed base, so on deal blocks 114,900,000-114,900,149.
// COMPLETE, per match: the line names A and B in that order at their registered hashes, says complete: true, all
//   1,200 games were played, errors + timeouts <= 60 (one in 20), score, lo, elo, eloLo and eloHi are numbers, the
//   block reader found the match's 1,200 games on exactly the 150 blocks 114,900,000-114,900,149 with no other
//   match's game in the folder, every batch line carried A's and B's seat configs exactly, and both sides searched
//   priority, attack and block decisions.
// THE READINGS (D519's, at 1,200 games; exactly one per complete match, in this precedence), compared as the line
//   carries them, lo in integer ten-thousandths and Elo in integer tenths:
//   SHOWN                  lo > 0.5 and elo >= 15
//   SMALL GAIN             lo > 0.5 and elo < 15
//   INCONCLUSIVE AT 1,200  lo <= 0.5 and eloHi >= 15
//   NOT SHOWN              lo <= 0.5 and eloHi < 15
//   SHOWN and SMALL GAIN make the arm a CANDIDATE: one 4,800-game confirmation against search-v1-anytime on fresh
//   blocks, as its own job under its own decision. Nothing is adopted from 1,200 games and nothing here changes the
//   live seat (liveSeatChanged is 0 in every reading).
// DESCRIPTIVE, deciding nothing, exactly one per complete match: "a measured loss" (eloHi < 0), "a measured gain"
//   (eloLo > 0), "indistinguishable" otherwise (an end of exactly 0 holds 0).
// THE COST AND THE HORIZON, reported beside every reading and never changing one: each side's searched decisions by
//   kind, ms a searched decision (and by kind), search seconds a game (ms a decision x searched / games played),
//   rollouts and complete rounds a searched decision (all kinds together: the counters are not kept by kind), ms of
//   play a finished rollout (the horizon's own trace), the share decided on fewer than 2 paired rounds, and the
//   priority overrides by direction (from pass, to another play, to pass) a priority decision searched.
// THE NIGHT'S PATTERN (D537 point 8; descriptions of what each outcome leads to, never a rule): t1Gain, a1Gain,
//   x3Gain are the three candidate flags; perRolloutOnly is x3 a candidate and t1 not; horizonClosedPB is t1 and
//   x3 both NOT SHOWN; horizonClosedA is a1 NOT SHOWN. Each is 0 unless every match it names is complete.
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 1200;
export const BAR = GAMES / 20;
export const FIRST = 114900000;
export const BLOCKS = 150;
export const LAST = FIRST + BLOCKS - 1;
export const B = 'search-v1-anytime';
export const BH = 'cdd55e02a89c';
export const BCFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1';
export const ARMS = [
  { key: 't1', name: 'search-v2-t1', hash: '63c35e9f7d5b',
    cfg: 'Default+outlets+search:ms=1500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=0,anytime=1' },
  { key: 'a1', name: 'search-v2-a1', hash: '3cf65e94df28',
    cfg: 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=1,anytime=1' },
  { key: 'x3', name: 'search-v2-t1-x3', hash: 'ce99b41f9898',
    cfg: 'Default+outlets+search:ms=4500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=0,anytime=1' },
];

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const kinds = (t) => ({ p: num(t?.byKind?.p?.searched) ?? 0, a: num(t?.byKind?.a?.searched) ?? 0, b: num(t?.byKind?.b?.searched) ?? 0 });
const secPerGame = (t, played) => {
  const ms = num(t?.msPerDecision), n = num(t?.searched), g = num(played);
  return ms !== null && n !== null && g !== null && g > 0 ? Math.round((ms * n) / g) / 1000 : null;
};
const ratio = (x, y) => (x !== null && y !== null && y > 0 ? Math.round((x / y) * 1000) / 1000 : null);

export function readArm(arm, m, bs, ro) {
  const names = m !== null && m.a === arm.name && m.b === B ? 1 : 0;
  const hashes = m !== null && String(m.ah) === arm.hash && String(m.bh) === BH ? 1 : 0;
  const ak = kinds(m?.aSearch), bk = kinds(m?.bSearch);
  const kindsOk = m !== null && ak.p > 0 && ak.a > 0 && ak.b > 0 && bk.p > 0 && bk.a > 0 && bk.b > 0 ? 1 : 0;
  const purpose = typeof m?.id === 'string' ? `match:${m.id}` : null;
  const blocks = bs !== null && purpose !== null && bs.purpose === purpose && bs.games === GAMES && bs.blocks === BLOCKS
    && bs.min === FIRST && bs.max === LAST && bs.otherGames === 0 ? 1 : 0;
  const cfgs = ro !== null && typeof ro.lines === 'number' && ro.lines === GAMES && ro.cfgExact === GAMES
    && ro.aCfg === arm.cfg && ro.bCfg === BCFG ? 1 : 0;
  const s = {
    key: arm.key, a: arm.name, b: B, match: m === null ? 0 : 1, names, hashes, kindsOk, blocks, cfgs,
    id: m?.id ?? null, ah: m?.ah ?? null, bh: m?.bh ?? null, played: num(m?.played) ?? 0,
    errors: num(m?.errors), timeouts: num(m?.timeouts), pairs: num(m?.pairs),
    score: num(m?.score), lo: num(m?.lo), hi: num(m?.hi), elo: num(m?.elo), eloLo: num(m?.eloLo), eloHi: num(m?.eloHi),
    aSearched: num(m?.aSearch?.searched) ?? 0, bSearched: num(m?.bSearch?.searched) ?? 0,
    aP: ak.p, aA: ak.a, aB: ak.b, bP: bk.p, bA: bk.a, bB: bk.b,
    aMs: num(m?.aSearch?.msPerDecision), bMs: num(m?.bSearch?.msPerDecision),
    aMsP: num(m?.aSearch?.msMean?.p), aMsA: num(m?.aSearch?.msMean?.a), aMsB: num(m?.aSearch?.msMean?.b),
    bMsP: num(m?.bSearch?.msMean?.p), bMsA: num(m?.bSearch?.msMean?.a), bMsB: num(m?.bSearch?.msMean?.b),
  };
  const complete = names === 1 && hashes === 1 && m.complete === true && s.played === GAMES
    && (s.errors ?? 0) + (s.timeouts ?? 0) <= BAR && s.score !== null && s.lo !== null && s.elo !== null && s.eloLo !== null
    && s.eloHi !== null && blocks === 1 && cfgs === 1 && kindsOk === 1 ? 1 : 0;
  const ok = complete === 1;
  const LO = ok ? Math.round(s.lo * 10000) : 0, E = ok ? Math.round(s.elo * 10) : 0;
  const EL = ok ? Math.round(s.eloLo * 10) : 0, EH = ok ? Math.round(s.eloHi * 10) : 0;
  const shown = ok && LO > 5000 && E >= 150 ? 1 : 0;
  const smallGain = ok && LO > 5000 && E < 150 ? 1 : 0;
  const inconclusive1200 = ok && LO <= 5000 && EH >= 150 ? 1 : 0;
  const notShown = ok && LO <= 5000 && EH < 150 ? 1 : 0;
  const candidate = shown || smallGain ? 1 : 0;
  const measuredLoss = ok && EH < 0 ? 1 : 0;
  const measuredGain = ok && EL > 0 ? 1 : 0;
  const indistinguishable = ok && measuredLoss === 0 && measuredGain === 0 ? 1 : 0;
  const reading = !ok ? null : shown ? 'SHOWN' : smallGain ? 'SMALL GAIN' : inconclusive1200 ? 'INCONCLUSIVE AT 1,200' : 'NOT SHOWN';
  const word = !ok ? null : measuredLoss ? 'a measured loss' : measuredGain ? 'a measured gain' : 'indistinguishable';
  const aSecPerGame = secPerGame(m?.aSearch, m?.played), bSecPerGame = secPerGame(m?.bSearch, m?.played);
  const costRatio = aSecPerGame !== null && bSecPerGame !== null && bSecPerGame > 0 ? Math.round((aSecPerGame / bSecPerGame) * 10000) / 10000 : null;
  const r = ro ?? {};
  const horizon = {
    aRolloutsPerDecision: num(r.aRolloutsPerDecision), bRolloutsPerDecision: num(r.bRolloutsPerDecision),
    aRoundsPerDecision: num(r.aRoundsPerDecision), bRoundsPerDecision: num(r.bRoundsPerDecision),
    aPlayMsPerRollout: num(r.aPlayMsPerRollout), bPlayMsPerRollout: num(r.bPlayMsPerRollout),
    playMsRatio: ratio(num(r.aPlayMsPerRollout), num(r.bPlayMsPerRollout)),
    aCopyMsPerRollout: num(r.aCopyMsPerRollout), bCopyMsPerRollout: num(r.bCopyMsPerRollout),
    aShortShare: num(r.aShortShare), bShortShare: num(r.bShortShare),
    aFromPass: num(r.aFromPass), aToOther: num(r.aToOther), aToPass: num(r.aToPass),
    bFromPass: num(r.bFromPass), bToOther: num(r.bToOther), bToPass: num(r.bToPass),
    aSkipLand: num(r.aSkipLand), bSkipLand: num(r.bSkipLand), aStepCap: num(r.aStepCap), bStepCap: num(r.bStepCap),
  };
  const cost = costRatio === null ? 'no cost read'
    : `${aSecPerGame} against ${bSecPerGame} search seconds a game (x${costRatio}), ${s.aMs} against ${s.bMs} ms a searched decision, ${horizon.aPlayMsPerRollout} against ${horizon.bPlayMsPerRollout} ms of play a rollout (x${horizon.playMsRatio}), ${horizon.aRolloutsPerDecision} against ${horizon.bRolloutsPerDecision} rollouts a decision`;
  const why = s.match === 0 ? 'NO MATCH' : names === 0 ? 'NOT THIS MATCH (names)' : hashes === 0 ? 'NOT THESE PLAYERS (hashes)'
    : cfgs === 0 ? 'NOT THESE SEAT CONFIGS' : blocks === 0 ? 'NOT THE REGISTERED DEAL BLOCKS' : kindsOk === 0 ? 'A SIDE DID NOT SEARCH ALL THREE KINDS' : 'INCOMPLETE';
  const line = !ok ? `${arm.name}: ${why}: no reading`
    : `${arm.name}: ${reading} (${word}): ${s.elo} Elo [${s.eloLo}, ${s.eloHi}], score ${s.score} [${s.lo}, ${s.hi}]; ${cost}; ${candidate ? 'a candidate for one 4,800-game confirmation on fresh blocks, as its own job and decision' : 'not a candidate'}; the live seat is unchanged`;
  return { ...s, complete, shown, smallGain, inconclusive1200, notShown, candidate, measuredLoss, measuredGain,
    indistinguishable, reading, word, aSecPerGame, bSecPerGame, costRatio, horizon, line, liveSeatChanged: 0 };
}

export function verdict(byKey) {
  const arms = {};
  for (const arm of ARMS) {
    const x = byKey[arm.key] ?? {};
    arms[arm.key] = readArm(arm, x.m ?? null, x.bs ?? null, x.ro ?? null);
  }
  const t1 = arms.t1, a1 = arms.a1, x3 = arms.x3;
  const completeCount = t1.complete + a1.complete + x3.complete;
  const readings = t1.shown + t1.smallGain + t1.inconclusive1200 + t1.notShown + a1.shown + a1.smallGain
    + a1.inconclusive1200 + a1.notShown + x3.shown + x3.smallGain + x3.inconclusive1200 + x3.notShown;
  const pattern = {
    t1Gain: t1.candidate, a1Gain: a1.candidate, x3Gain: x3.candidate,
    perRolloutOnly: t1.complete && x3.complete && x3.candidate === 1 && t1.candidate === 0 ? 1 : 0,
    horizonClosedPB: t1.notShown === 1 && x3.notShown === 1 ? 1 : 0,
    horizonClosedA: a1.notShown,
  };
  const candidates = t1.candidate + a1.candidate + x3.candidate;
  return { written: 1, games: GAMES, bar: BAR, first: FIRST, last: LAST, completeCount, readings, candidates, ...pattern,
    liveSeatChanged: 0, arms, lines: ARMS.map((a) => arms[a.key].line) };
}

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const T = (o = {}) => ({ games: GAMES, searched: 29000, changed: 5300, msPerDecision: 935,
    byKind: { p: { searched: 20400 }, a: { searched: 6800 }, b: { searched: 1800 } }, msMean: { p: 940, a: 910, b: 912 }, ...o });
  const mk = (arm, o = {}) => ({ id: `h:run-${arm.key}`, a: arm.name, b: B, ah: arm.hash, bh: BH, complete: true, played: GAMES,
    errors: 0, timeouts: 0, pairs: 600, score: 0.5072, lo: 0.4934, hi: 0.521, elo: 5, eloLo: -4.6, eloHi: 14.6,
    aSearch: T({ msPerDecision: 1400 }), bSearch: T(), ...o });
  const SD = (arm, o = {}) => ({ purpose: `match:h:run-${arm.key}`, games: GAMES, blocks: BLOCKS, min: FIRST, max: LAST, fullBlocks: BLOCKS, otherGames: 0, ...o });
  const RO = (arm, o = {}) => ({ lines: GAMES, cfgExact: GAMES, aCfg: arm.cfg, bCfg: BCFG, aRolloutsPerDecision: 7.9, bRolloutsPerDecision: 15.2,
    aRoundsPerDecision: 2.6, bRoundsPerDecision: 5.8, aPlayMsPerRollout: 160, bPlayMsPerRollout: 53.4, aCopyMsPerRollout: 4.8,
    bCopyMsPerRollout: 4.8, aShortShare: 0.21, bShortShare: 0.04, aFromPass: 0.08, aToOther: 0.06, aToPass: 0.05,
    bFromPass: 0.08, bToOther: 0.065, bToPass: 0.049, aSkipLand: 7.5, bSkipLand: 7.5, aStepCap: 0, bStepCap: 0, ...o });
  const [A1, A2, A3] = ARMS;
  const all = (o = {}) => ({ t1: { m: mk(A1), bs: SD(A1), ro: RO(A1) }, a1: { m: mk(A2), bs: SD(A2), ro: RO(A2) }, x3: { m: mk(A3), bs: SD(A3), ro: RO(A3) }, ...o });
  const one = (r) => r.complete === 1 && r.shown + r.smallGain + r.inconclusive1200 + r.notShown === 1
    && r.indistinguishable + r.measuredLoss + r.measuredGain === 1 && r.candidate === r.shown + r.smallGain && r.liveSeatChanged === 0;
  const none = (r) => r.complete === 0 && r.shown + r.smallGain + r.inconclusive1200 + r.notShown + r.candidate
    + r.indistinguishable + r.measuredLoss + r.measuredGain === 0 && r.reading === null && r.line.endsWith('no reading');
  const t1m = (o) => all({ t1: { m: mk(A1, o), bs: SD(A1), ro: RO(A1) } });
  const cases = [
    ['+5 [-4.6, +14.6] with lo 0.4934: NOT SHOWN, indistinguishable, every arm', all(), (v) => ['t1', 'a1', 'x3'].every((k) => v.arms[k].notShown === 1 && one(v.arms[k]) && v.arms[k].indistinguishable === 1) && v.completeCount === 3 && v.readings === 3 && v.candidates === 0 && v.horizonClosedPB === 1 && v.horizonClosedA === 1],
    ['+20 [+8.5, +31.5], lo 0.5121: SHOWN, a measured gain, a candidate', t1m({ score: 0.5288, lo: 0.5121, hi: 0.5454, elo: 20, eloLo: 8.5, eloHi: 31.5 }), (v) => v.arms.t1.shown === 1 && one(v.arms.t1) && v.arms.t1.measuredGain === 1 && v.arms.t1.candidate === 1 && v.t1Gain === 1 && v.candidates === 1 && v.horizonClosedPB === 0],
    ['+12 [+0.6, +23.4], lo 0.5009: SMALL GAIN, a candidate', t1m({ score: 0.5173, lo: 0.5009, hi: 0.5336, elo: 12, eloLo: 0.6, eloHi: 23.4 }), (v) => v.arms.t1.smallGain === 1 && one(v.arms.t1) && v.arms.t1.candidate === 1],
    ['an Elo point of exactly 15.0 with lo above 0.5 is SHOWN', t1m({ score: 0.5216, lo: 0.5051, hi: 0.538, elo: 15, eloLo: 3.5, eloHi: 26.5 }), (v) => v.arms.t1.shown === 1 && one(v.arms.t1)],
    ['an Elo point of 14.9 with lo above 0.5 is SMALL GAIN', t1m({ score: 0.5214, lo: 0.505, hi: 0.5378, elo: 14.9, eloLo: 3.4, eloHi: 26.4 }), (v) => v.arms.t1.smallGain === 1 && one(v.arms.t1)],
    ['lo of exactly 0.5 is not above it: INCONCLUSIVE AT 1,200 when eloHi >= 15', t1m({ score: 0.5165, lo: 0.5, hi: 0.533, elo: 11.5, eloLo: 0, eloHi: 23 }), (v) => v.arms.t1.inconclusive1200 === 1 && one(v.arms.t1) && v.arms.t1.candidate === 0 && v.arms.t1.indistinguishable === 1],
    ['lo 0.5001 is above 0.5: SMALL GAIN', t1m({ score: 0.5166, lo: 0.5001, hi: 0.5331, elo: 11.5, eloLo: 0.1, eloHi: 23 }), (v) => v.arms.t1.smallGain === 1 && v.arms.t1.measuredGain === 1],
    ['an upper end of exactly 15.0 with lo <= 0.5 is INCONCLUSIVE AT 1,200', t1m({ score: 0.5049, lo: 0.4884, hi: 0.5214, elo: 3.4, eloLo: -8.1, eloHi: 15 }), (v) => v.arms.t1.inconclusive1200 === 1 && one(v.arms.t1)],
    ['an upper end of 14.9 with lo <= 0.5 is NOT SHOWN', t1m({ score: 0.5048, lo: 0.4883, hi: 0.5213, elo: 3.3, eloLo: -8.2, eloHi: 14.9 }), (v) => v.arms.t1.notShown === 1 && one(v.arms.t1)],
    ['-20 [-31.3, -8.7]: NOT SHOWN, a measured loss', t1m({ score: 0.4712, lo: 0.4551, hi: 0.4874, elo: -20, eloLo: -31.3, eloHi: -8.7 }), (v) => v.arms.t1.notShown === 1 && v.arms.t1.measuredLoss === 1 && one(v.arms.t1)],
    ['an upper end of exactly 0 holds 0: indistinguishable', t1m({ score: 0.4837, lo: 0.4672, hi: 0.5, elo: -11.3, eloLo: -22.7, eloHi: 0 }), (v) => v.arms.t1.indistinguishable === 1 && v.arms.t1.measuredLoss === 0 && v.arms.t1.notShown === 1],
    ['x3 a candidate and t1 not: perRolloutOnly', all({ x3: { m: mk(A3, { score: 0.5288, lo: 0.5121, hi: 0.5454, elo: 20, eloLo: 8.5, eloHi: 31.5 }), bs: SD(A3), ro: RO(A3) } }), (v) => v.perRolloutOnly === 1 && v.x3Gain === 1 && v.t1Gain === 0 && v.horizonClosedPB === 0 && v.horizonClosedA === 1],
    ['a1 a candidate alone', all({ a1: { m: mk(A2, { score: 0.5173, lo: 0.5009, hi: 0.5336, elo: 12, eloLo: 0.6, eloHi: 23.4 }), bs: SD(A2), ro: RO(A2) } }), (v) => v.a1Gain === 1 && v.horizonClosedA === 0 && v.horizonClosedPB === 1 && v.candidates === 1],
    ['a stopped match (complete: false, 900 played) gives no reading', t1m({ complete: false, played: 900 }), (v) => none(v.arms.t1) && v.completeCount === 2 && v.horizonClosedPB === 0 && v.perRolloutOnly === 0],
    ['1,199 games is not complete', t1m({ played: 1199 }), (v) => none(v.arms.t1)],
    ['61 errors and timeouts is not complete; 60 is', t1m({ errors: 50, timeouts: 11 }), (v) => none(v.arms.t1) && one(readArm(A1, mk(A1, { errors: 50, timeouts: 10 }), SD(A1), RO(A1)))],
    ['a line without eloHi is not complete', t1m({ eloHi: null }), (v) => none(v.arms.t1)],
    ['the players swapped is not this match', t1m({ a: B, b: A1.name, ah: BH, bh: A1.hash }), (v) => v.arms.t1.names === 0 && none(v.arms.t1)],
    ['another arm in t1\'s file is not this match', t1m({ a: A3.name, ah: A3.hash }), (v) => v.arms.t1.names === 0 && none(v.arms.t1)],
    ['the arm at another hash is not this match', t1m({ ah: 'ffffffffffff' }), (v) => v.arms.t1.hashes === 0 && none(v.arms.t1)],
    ['B at another hash is not this match', t1m({ bh: '59505e241363' }), (v) => v.arms.t1.hashes === 0 && none(v.arms.t1)],
    ['an arm that searched no block decision is not complete', t1m({ aSearch: T({ byKind: { p: { searched: 20400 }, a: { searched: 6800 } } }) }), (v) => v.arms.t1.kindsOk === 0 && none(v.arms.t1)],
    ['B that searched no attack is not complete', t1m({ bSearch: T({ byKind: { p: { searched: 20400 }, b: { searched: 1800 } } }) }), (v) => v.arms.t1.kindsOk === 0 && none(v.arms.t1)],
    ['no block file gives no reading', all({ t1: { m: mk(A1), bs: null, ro: RO(A1) } }), (v) => v.arms.t1.blocks === 0 && none(v.arms.t1)],
    ['149 blocks is not the registered 150', all({ t1: { m: mk(A1), bs: SD(A1, { blocks: 149 }), ro: RO(A1) } }), (v) => none(v.arms.t1)],
    ['the j211 blocks are not this night\'s', all({ t1: { m: mk(A1), bs: SD(A1, { min: 931900000, max: 931900149 }), ro: RO(A1) } }), (v) => none(v.arms.t1)],
    ['another match\'s game in the folder gives no reading', all({ t1: { m: mk(A1), bs: SD(A1, { otherGames: 4 }), ro: RO(A1) } }), (v) => none(v.arms.t1)],
    ['a block file for another match gives no reading', all({ t1: { m: mk(A1), bs: SD(A1, { purpose: 'match:h:run-x' }), ro: RO(A1) } }), (v) => none(v.arms.t1)],
    ['a batch line with another seat config gives no reading', all({ t1: { m: mk(A1), bs: SD(A1), ro: RO(A1, { cfgExact: 1199 }) } }), (v) => v.arms.t1.cfgs === 0 && none(v.arms.t1)],
    ['t1 read with a1\'s seat config is not t1', all({ t1: { m: mk(A1), bs: SD(A1), ro: RO(A1, { aCfg: A2.cfg }) } }), (v) => v.arms.t1.cfgs === 0 && none(v.arms.t1)],
    ['no rollout file gives no reading', all({ t1: { m: mk(A1), bs: SD(A1), ro: null } }), (v) => v.arms.t1.cfgs === 0 && none(v.arms.t1)],
    ['no match file gives no reading', all({ t1: { m: null, bs: SD(A1), ro: RO(A1) } }), (v) => v.arms.t1.match === 0 && none(v.arms.t1)],
    ['the cost: seconds a game, their ratio, the play-time ratio, and they change no reading', all(), (v) => v.arms.t1.aSecPerGame === 33.833 && v.arms.t1.bSecPerGame === 22.596 && v.arms.t1.costRatio === 1.4973 && v.arms.t1.horizon.playMsRatio === 2.996 && v.arms.t1.notShown === 1],
    ['every arm a candidate: three candidates, no closing pattern', all({ t1: { m: mk(A1, { lo: 0.51, elo: 20, eloLo: 8, eloHi: 32 }), bs: SD(A1), ro: RO(A1) }, a1: { m: mk(A2, { lo: 0.51, elo: 20, eloLo: 8, eloHi: 32 }), bs: SD(A2), ro: RO(A2) }, x3: { m: mk(A3, { lo: 0.51, elo: 20, eloLo: 8, eloHi: 32 }), bs: SD(A3), ro: RO(A3) } }), (v) => v.candidates === 3 && v.perRolloutOnly === 0 && v.horizonClosedPB === 0 && v.horizonClosedA === 0 && v.liveSeatChanged === 0],
  ];
  let ok = 0;
  cases.forEach(([what, input, pred], i) => {
    const d = path.join(scratch, `case-${i}`);
    fs.mkdirSync(d, { recursive: true });
    for (const arm of ARMS) {
      const x = input[arm.key] ?? {};
      if (x.m != null) fs.writeFileSync(path.join(d, `match-J212-${arm.key}.json`), JSON.stringify(x.m));
      if (x.bs != null) fs.writeFileSync(path.join(d, `seeds-${arm.key}.json`), JSON.stringify(x.bs));
      if (x.ro != null) fs.writeFileSync(path.join(d, `rollouts-${arm.key}.json`), JSON.stringify(x.ro));
    }
    const v = verdict(load(d, d));
    const pass = pred(v) === true;
    console.error(`${pass ? 'ok  ' : 'FAIL'} ${what}: ${v.lines.join(' | ')}`);
    ok += pass ? 1 : 0;
  });
  return { selftest: 1, cases: cases.length, passed: ok, ok: ok === cases.length ? 1 : 0 };
}

function read(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

export function load(matchDir, j212Dir) {
  const out = {};
  for (const arm of ARMS) {
    out[arm.key] = { m: read(path.join(matchDir, `match-J212-${arm.key}.json`)), bs: read(path.join(j212Dir, `seeds-${arm.key}.json`)),
      ro: read(path.join(j212Dir, `rollouts-${arm.key}.json`)) };
  }
  return out;
}

const argv = process.argv.slice(2);
if (argv[0] === '--selftest') {
  const r = selftest(argv[1]);
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
} else if (argv.length === 3) {
  const v = verdict(load(argv[0], argv[1]));
  fs.mkdirSync(path.dirname(argv[2]), { recursive: true });
  fs.writeFileSync(argv[2], JSON.stringify(v, null, 1) + '\n');
  console.log(JSON.stringify(v));
} else {
  console.error('usage: node verdict.mjs <match dir> <j212 dir> <out.json> | --selftest <dir>');
  process.exit(2);
}
J212EOF
cat > var/j212-tools/rollouts.cjs <<'J212EOF'
// J212: J211's rollout reader (var/j211-tools/rollouts.cjs) widened for the horizon. For each side of one match it
// sums the batch lines' aStats/bStats counters (config A is the match's first player, as tools/ai-ladder/match.ts
// tallyBatch reads it): `search.rollouts`, `search.rounds`, `search.anytime.short`, `search.<p|a|b>.considered`,
// `search.playUs` (the play time of the rollouts that finished, the horizon's own trace: a rollout that plays one
// more turn plays longer), `search.copyUs`, `search.p.skipLand` (priority windows left to Forge because it played a
// land), `search.p.changed.fromPass|toOther|toPass` and `search.rolloutStepCap`. Rollouts and rounds are counted over
// all kinds together; the counters are not kept by kind, so nothing here is split by kind but the decisions.
// It also reads each batch line's two seat configs (`a`, `b`): aCfg and bCfg are the one value each side carried
// (or "MIXED"), and cfgExact the lines that carried both.
// usage: node rollouts.cjs <ladder dir> <match.json> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : '';
const bdir = `${dir}/batches/${run}`;
const KEYS = { rollouts: 'search.rollouts', rounds: 'search.rounds', short: 'search.anytime.short', p: 'search.p.considered',
  a: 'search.a.considered', b: 'search.b.considered', playUs: 'search.playUs', copyUs: 'search.copyUs',
  skipLand: 'search.p.skipLand', fromPass: 'search.p.changed.fromPass', toOther: 'search.p.changed.toOther',
  toPass: 'search.p.changed.toPass', stepCap: 'search.rolloutStepCap' };
const side = () => Object.fromEntries(Object.keys(KEYS).map((k) => [k, 0]));
const t = { a: side(), b: side() };
let lines = 0;
const cfgA = new Set(), cfgB = new Set();
const rows = [];
for (const f of run && fs.existsSync(bdir) ? fs.readdirSync(bdir).filter((x) => /^b\d+\.jsonl$/.test(x)) : []) {
  for (const line of fs.readFileSync(`${bdir}/${f}`, 'utf8').split('\n')) {
    let l; try { l = JSON.parse(line); } catch { continue; }
    lines++;
    cfgA.add(String(l.a)); cfgB.add(String(l.b));
    rows.push([String(l.a), String(l.b)]);
    for (const [k, st] of [['a', l.aStats], ['b', l.bStats]]) {
      const c = (st && st.counts) || {};
      for (const [x, key] of Object.entries(KEYS)) t[k][x] += typeof c[key] === 'number' ? c[key] : 0;
    }
  }
}
const aCfg = cfgA.size === 1 ? [...cfgA][0] : cfgA.size === 0 ? null : 'MIXED';
const bCfg = cfgB.size === 1 ? [...cfgB][0] : cfgB.size === 0 ? null : 'MIXED';
const cfgExact = rows.filter(([x, y]) => x === aCfg && y === bCfg).length;
const r2 = (x) => Math.round(x * 100) / 100, r4 = (x) => Math.round(x * 10000) / 10000;
const dec = (s) => s.p + s.a + s.b;
const per = (s, x) => (dec(s) > 0 ? r2(s[x] / dec(s)) : null);
const perP = (s, x) => (s.p > 0 ? r4(s[x] / s.p) : null);
const msRoll = (s, x) => (s.rollouts > 0 ? Math.round((s[x] / s.rollouts) / 100) / 10 : null);
const r = { run, a: m?.a ?? null, b: m?.b ?? null, lines, games: lines, aCfg, bCfg, cfgExact };
for (const k of ['a', 'b']) {
  const s = t[k];
  Object.assign(r, {
    [`${k}Decisions`]: dec(s), [`${k}Priority`]: s.p, [`${k}Attacks`]: s.a, [`${k}Blocks`]: s.b,
    [`${k}Rollouts`]: s.rollouts, [`${k}Rounds`]: s.rounds, [`${k}Short`]: s.short,
    [`${k}RolloutsPerDecision`]: per(s, 'rollouts'), [`${k}RoundsPerDecision`]: per(s, 'rounds'),
    [`${k}ShortShare`]: dec(s) > 0 ? r4(s.short / dec(s)) : null,
    [`${k}PlayMsPerRollout`]: msRoll(s, 'playUs'), [`${k}CopyMsPerRollout`]: msRoll(s, 'copyUs'),
    [`${k}FromPass`]: perP(s, 'fromPass'), [`${k}ToOther`]: perP(s, 'toOther'), [`${k}ToPass`]: perP(s, 'toPass'),
    [`${k}FromPassN`]: s.fromPass, [`${k}ToOtherN`]: s.toOther, [`${k}ToPassN`]: s.toPass,
    [`${k}SkipLand`]: lines > 0 ? r2(s.skipLand / lines) : null, [`${k}SkipLandN`]: s.skipLand, [`${k}StepCap`]: s.stepCap,
  });
}
r.rolloutRatio = r.aRolloutsPerDecision !== null && r.bRolloutsPerDecision ? Math.round((r.aRolloutsPerDecision / r.bRolloutsPerDecision) * 1000) / 1000 : null;
r.playMsRatio = r.aPlayMsPerRollout !== null && r.bPlayMsPerRollout ? Math.round((r.aPlayMsPerRollout / r.bPlayMsPerRollout) * 1000) / 1000 : null;
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J212EOF
cat > var/j212-tools/seeds.cjs <<'J212EOF'
// J212: J211's block reader (var/j211-tools/seeds.cjs), unchanged but for this line: which deal blocks a match played
// (D398 point 2: a match takes its matchup's next unused blocks from its host name's match base; D537: under this
// host's own name in an emptied folder those are 114,900,000-114,900,149, J210's deals).
// Reads every results line of <ladder dir>/results/*.jsonl whose purpose is a match's, and reports for the match's
// own `match:<id>` (the id in <match.json>; none when the file is absent) its games, its distinct blocks (`bseed`),
// their lowest and highest and how many of them hold exactly 8 games, and how many match games in the folder
// belong to any other match (expected 0: the folder is the match's own).
// usage: node seeds.cjs <ladder dir> <match.json | none> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const purpose = m && typeof m.id === 'string' ? `match:${m.id}` : null;
const per = new Map();
let games = 0, otherGames = 0;
const rdir = `${dir}/results`;
for (const f of fs.existsSync(rdir) ? fs.readdirSync(rdir).filter((x) => x.endsWith('.jsonl')) : []) {
  for (const line of fs.readFileSync(`${rdir}/${f}`, 'utf8').split('\n')) {
    if (!line.includes('"purpose":"match:')) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (typeof r.bseed !== 'number') continue;
    if (purpose !== null && r.purpose === purpose) { games++; per.set(r.bseed, (per.get(r.bseed) ?? 0) + 1); } else otherGames++;
  }
}
const b = [...per.keys()].sort((x, y) => x - y);
const r = { purpose, games, blocks: b.length, min: b.length ? b[0] : 0, max: b.length ? b[b.length - 1] : 0,
  fullBlocks: [...per.values()].filter((n) => n === 8).length, otherGames };
fs.writeFileSync(out, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J212EOF
cat > var/j212-tools/records.cjs <<'J212EOF'
// J212's recording summarizer (D537 point 9: information only, it decides nothing). It reads the gzipped seat logs
// `ai-bench.sh play --record-all` writes (D347: <run>/games/p<pair>-g<game>-seat<s>.jsonl.gz, each seat's own
// redacted view, with that seat's decision records as dir:"ai" type:"decision" lines) and summarises the SEARCH
// seat's records only (the log whose own seat, hello_ok's `you` in the session header's `seats`, has policy
// "search"; the Forge seat's logs are counted and skipped).
// What a record carries (bridge/src/mtgtable/ai/Decision.java toJson): kind, turn, phase, every legal option as a
// token (`options`, a shortlist when `complete` is false), the answer (`chosen`), the policy that played it (`by`),
// and, when the search ran, `search`: per candidate its token, n (rollouts it finished), meanLeaf, se, diff (the
// paired mean difference to Forge's answer, candidate 0) and seDiff, then rounds (complete rounds), playouts,
// horizon, ms, budgetMs, timedOut, overrode and fallback.
// What it reports, by decision kind (p priority, a attack, b block), for the searched decisions:
//   - candidates a decision (the histogram 1..6+) and legal options against candidates considered;
//   - rollouts a candidate (n: Forge's answer, the alternatives, all);
//   - sigma_d, the standard deviation of a candidate's paired per-round difference to Forge's answer:
//     seDiff x sqrt(n) for every alternative with n >= 2 (Forge's answer is rolled first in every round,
//     Anytime.order, so its paired rounds are the alternative's n; a round where Forge's own rollout threw would
//     make it fewer, and the records do not say; seDiff is rounded to 0.1 in the record);
//   - complete rounds and the share decided on fewer than 2, ms, the horizon (a histogram), overrides, fallbacks.
// And for the priority windows the search did NOT search (the state line before each record gives the active
// player and the stack; `phase` is the record's own):
//   - the seat's own main phase with an empty stack where Forge played a land (the search skips these,
//     SearchPolicy.choosePriority's skipLand), and how many had another land or a castable non-mana play among
//     the legal options;
//   - the same windows where Forge passed or played something else without a search (the outlet policy, or no
//     alternative Forge's per-card AI accepts), with or without a legal non-mana play;
//   - windows outside the seat's own main phases (the opponent's turn; the seat's own other steps) and its own main
//     phase with a non-empty stack, each with how many had a legal non-mana play (cast or activate).
//   A priority window with one legal answer (a forced pass) writes no record; the seat's `decisions` summary line
//   counts them (forcedPriority).
// What it cannot report from the records: per-round leaves, the paired-round count itself, rollouts by kind in a
// mixed search, anything about a window the seat never had priority in.
// usage: node records.cjs <games dir> <out.json>        node records.cjs --selftest <scratch dir>
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const KIND = { priority: 'p', attack: 'a', block: 'b' };
const PLAY = /^(cast|activate):/;
const quant = (xs, q) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1) + 0.5))];
};
const r1 = (x) => (x === null ? null : Math.round(x * 10) / 10), r3 = (x) => (x === null ? null : Math.round(x * 1000) / 1000);
const mean = (xs) => (xs.length ? xs.reduce((t, x) => t + x, 0) / xs.length : null);
const kindStats = () => ({ searched: 0, cands: {}, candSum: 0, legalSum: 0, legalOver: 0, incomplete: 0, roundsSum: 0,
  short: 0, playouts: 0, ms: 0, horizon: {}, overrode: 0, fallback: {}, nForge: [], nAlt: [], sigma: [] });
const win = () => ({ n: 0, withPlay: 0 });

function summarize(dir) {
  const S = { p: kindStats(), a: kindStats(), b: kindStats() };
  const W = { landSkip: 0, landSkipOtherLand: 0, landSkipPlay: 0, landSkipEither: 0, ownMainNoSearch: win(),
    ownMainStack: win(), ownOther: win(), oppTurn: win(), searchedOffMain: 0 };
  let files = 0, searchLogs = 0, otherLogs = 0, bad = 0, bytes = 0, forcedPriority = 0, decisions = 0, overs = 0;
  const list = fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => x.endsWith('.jsonl.gz')).sort() : [];
  for (const f of list) {
    files++;
    let text;
    try { const buf = fs.readFileSync(path.join(dir, f)); bytes += buf.length; text = zlib.gunzipSync(buf).toString('utf8'); } catch { bad++; continue; }
    const lines = text.split('\n');
    let head = null, you = null, st = null, mine = null;
    const parsed = [];
    for (const l of lines) { if (!l) continue; try { parsed.push(JSON.parse(l)); } catch { /* a torn line */ } }
    head = parsed.find((j) => j.kind === 'session') || null;
    const hello = parsed.find((j) => j.type === 'hello_ok');
    you = hello && hello.body ? hello.body.you : null;
    const seats = head && Array.isArray(head.seats) ? head.seats : [];
    mine = seats.find((s) => s.player === you) || null;
    if (!mine || mine.policy !== 'search') { otherLogs++; continue; }
    searchLogs++;
    for (const j of parsed) {
      if (j.dir === 's2c' && j.type === 'state') { st = j.body; continue; }
      if (j.dir === 's2c' && j.type === 'over') { overs++; continue; }
      if (j.dir === 'ai' && j.type === 'decisions') {
        const fp = j.body && j.body.forced ? j.body.forced.priority : 0;
        forcedPriority += typeof fp === 'number' ? fp : 0;
        continue;
      }
      if (j.dir !== 'ai' || j.type !== 'decision') continue;
      const d = j.body || {};
      const k = KIND[d.kind];
      if (!k) continue;
      decisions++;
      const opts = Array.isArray(d.options) ? d.options : [];
      const own = st !== null && st.activePlayer === you;
      const main = d.phase === 'MAIN1' || d.phase === 'MAIN2';
      const stackEmpty = st !== null && Array.isArray(st.stack) && st.stack.length === 0;
      if (d.search) {
        const s = d.search, K = S[k];
        const co = Array.isArray(s.options) ? s.options : [];
        K.searched++;
        const c = co.length >= 6 ? '6+' : String(co.length);
        K.cands[c] = (K.cands[c] || 0) + 1;
        K.candSum += co.length;
        K.legalSum += opts.length;
        if (opts.length > co.length) K.legalOver++;
        if (d.complete === false) K.incomplete++;
        K.roundsSum += typeof s.rounds === 'number' ? s.rounds : 0;
        if (typeof s.rounds === 'number' && s.rounds < 2) K.short++;
        K.playouts += typeof s.playouts === 'number' ? s.playouts : 0;
        K.ms += typeof s.ms === 'number' ? s.ms : 0;
        const h = String(s.horizon);
        K.horizon[h] = (K.horizon[h] || 0) + 1;
        if (s.overrode === true) K.overrode++;
        if (s.fallback) K.fallback[s.fallback] = (K.fallback[s.fallback] || 0) + 1;
        co.forEach((o, i) => {
          const n = typeof o.n === 'number' ? o.n : 0;
          (i === 0 ? K.nForge : K.nAlt).push(n);
          if (i > 0 && n >= 2 && typeof o.seDiff === 'number' && Number.isFinite(o.seDiff)) K.sigma.push(o.seDiff * Math.sqrt(n));
        });
        if (k === 'p' && !(own && main && stackEmpty)) W.searchedOffMain++;
        continue;
      }
      if (k !== 'p') continue;
      const hasPlay = opts.some((o) => PLAY.test(o));
      const chosen = typeof d.chosen === 'string' ? d.chosen : '';
      if (own && main && stackEmpty) {
        if (chosen.startsWith('land:')) {
          const otherLand = opts.some((o) => o.startsWith('land:') && o !== chosen);
          W.landSkip++;
          if (otherLand) W.landSkipOtherLand++;
          if (hasPlay) W.landSkipPlay++;
          if (otherLand || hasPlay) W.landSkipEither++;
        } else {
          W.ownMainNoSearch.n++;
          if (hasPlay) W.ownMainNoSearch.withPlay++;
        }
      } else {
        const w = own && main ? W.ownMainStack : own ? W.ownOther : W.oppTurn;
        w.n++;
        if (hasPlay) w.withPlay++;
      }
    }
  }
  const out = { written: 1, files, searchLogs, otherLogs, bad, games: searchLogs, overs, bytes,
    kbPerSearchLog: searchLogs ? Math.round(bytes / files / 1024) : null, decisions, forcedPriority, windows: W, kinds: {} };
  for (const k of ['p', 'a', 'b']) {
    const K = S[k], n = K.searched;
    const all = K.nForge.concat(K.nAlt);
    out.kinds[k] = { searched: n, candidates: K.cands, candidatesMean: n ? r3(K.candSum / n) : null,
      legalMean: n ? r3(K.legalSum / n) : null, legalOverConsidered: K.legalOver, incompleteListings: K.incomplete,
      roundsMean: n ? r3(K.roundsSum / n) : null, shortShare: n ? r3(K.short / n) : null, playoutsMean: n ? r3(K.playouts / n) : null,
      msMean: n ? r1(K.ms / n) : null, horizon: K.horizon, overrode: K.overrode, fallback: K.fallback,
      nForgeMean: r3(mean(K.nForge)), nAltMean: r3(mean(K.nAlt)), nMean: r3(mean(all)),
      sigmaN: K.sigma.length, sigmaMean: r1(mean(K.sigma)), sigmaP10: r1(quant(K.sigma, 0.1)), sigmaP25: r1(quant(K.sigma, 0.25)),
      sigmaMedian: r1(quant(K.sigma, 0.5)), sigmaP75: r1(quant(K.sigma, 0.75)), sigmaP90: r1(quant(K.sigma, 0.9)),
      sigmaZero: K.sigma.filter((x) => x === 0).length,
      // the same over the alternatives whose paired differences were not all equal (a zero sd is common: both
      // candidates' rollouts ended the same way in every round), and the share over 1,000 leaf points (a rollout
      // that ends the game scores +-(100,000 - 100 x turn), so one decided round in a few dominates a mean)
      sigmaNonzeroMedian: r1(quant(K.sigma.filter((x) => x > 0), 0.5)), sigmaNonzeroP90: r1(quant(K.sigma.filter((x) => x > 0), 0.9)),
      sigmaOver1000: K.sigma.filter((x) => x > 1000).length };
  }
  // flat numbers for the runner's checks (every one a number)
  const hz = (k, h) => (out.kinds[k].horizon[h] || 0);
  Object.assign(out, { pSearched: out.kinds.p.searched, aSearched: out.kinds.a.searched, bSearched: out.kinds.b.searched,
    pH0: hz('p', '0'), pH1: hz('p', '1'), aH0: hz('a', '0'), aH1: hz('a', '1'), bH0: hz('b', '0'), bH1: hz('b', '1') });
  out.hOther = out.pSearched + out.aSearched + out.bSearched - (out.pH0 + out.pH1 + out.aH0 + out.aH1 + out.bH0 + out.bH1);
  return out;
}

function selftest(scratch) {
  fs.rmSync(scratch, { recursive: true, force: true });
  fs.mkdirSync(scratch, { recursive: true });
  const L = (o) => JSON.stringify(o);
  const head = (seat, pol0, pol1) => L({ v: 1, kind: 'session', seat, seats: [{ player: 0, kind: 'ai', policy: pol0 }, { player: 1, kind: 'ai', policy: pol1 }] });
  const hello = (you) => L({ v: 1, seq: 1, dir: 's2c', type: 'hello_ok', body: { you } });
  const state = (active, phase, stack) => L({ v: 1, dir: 's2c', type: 'state', body: { activePlayer: active, phase, stack } });
  const dec = (body) => L({ v: 1, dir: 'ai', type: 'decision', body });
  const opt = (token, n, seDiff) => ({ token, n, meanLeaf: 0, se: 0, diff: 0, seDiff, win: 0.5 });
  const searchLog = [
    head(0, 'search', 'forge'), hello(0),
    state(0, 'MAIN1', []),
    dec({ seat: 0, kind: 'priority', phase: 'MAIN1', options: ['pass', 'cast:7', 'cast:8', 'land:5'], chosen: 'cast:8', by: 'search',
      search: { options: [opt('pass', 4, 0), opt('cast:7', 4, 10), opt('cast:8', 3, 20)], rounds: 3, playouts: 11, horizon: 1, ms: 1490, overrode: true, fallback: null } }),
    dec({ seat: 0, kind: 'priority', phase: 'MAIN1', options: ['pass', 'land:5', 'land:6', 'cast:7'], chosen: 'land:5', by: 'forge' }),
    dec({ seat: 0, kind: 'priority', phase: 'MAIN2', options: ['pass', 'land:6'], chosen: 'land:6', by: 'forge' }),
    dec({ seat: 0, kind: 'priority', phase: 'MAIN2', options: ['pass', 'activate:9'], chosen: 'pass', by: 'forge' }),
    state(0, 'MAIN1', [{ id: 3 }]),
    dec({ seat: 0, kind: 'priority', phase: 'MAIN1', options: ['pass', 'cast:7'], chosen: 'pass', by: 'forge' }),
    state(0, 'COMBAT_DECLARE_ATTACKERS', []),
    dec({ seat: 0, kind: 'attack', phase: 'COMBAT_DECLARE_ATTACKERS', options: ['attack:none', 'attack:4'], chosen: 'attack:4', by: 'search',
      search: { options: [opt('attack:4', 1, null), opt('attack:none', 1, null)], rounds: 1, playouts: 2, horizon: 0, ms: 1500, overrode: false, fallback: null } }),
    dec({ seat: 0, kind: 'priority', phase: 'END_OF_TURN', options: ['pass', 'cast:7'], chosen: 'pass', by: 'forge' }),
    state(1, 'MAIN1', []),
    dec({ seat: 0, kind: 'priority', phase: 'MAIN1', options: ['pass', 'cast:7'], chosen: 'pass', by: 'forge' }),
    dec({ seat: 0, kind: 'priority', phase: 'UPKEEP', options: ['pass', 'land:6'], chosen: 'pass', by: 'forge' }),
    dec({ seat: 0, kind: 'target', phase: 'MAIN1', options: ['target:3', 'target:4'], chosen: 'target:3', by: 'forge' }),
    L({ v: 1, dir: 's2c', type: 'over', body: {} }),
    L({ v: 1, dir: 'ai', type: 'decisions', body: { seat: 0, forced: { priority: 10, choice: 2 } } }),
  ].join('\n') + '\n';
  const forgeLog = [head(1, 'search', 'forge'), hello(1), state(0, 'MAIN1', []),
    dec({ seat: 1, kind: 'priority', phase: 'MAIN1', options: ['pass', 'cast:2'], chosen: 'pass', by: 'forge' })].join('\n') + '\n';
  fs.writeFileSync(path.join(scratch, 'p0-g0-seat0.jsonl.gz'), zlib.gzipSync(searchLog));
  fs.writeFileSync(path.join(scratch, 'p0-g0-seat1.jsonl.gz'), zlib.gzipSync(forgeLog));
  fs.writeFileSync(path.join(scratch, 'p0-g1-seat0.jsonl.gz'), 'not gzip');
  const r = summarize(scratch);
  const p = r.kinds.p, a = r.kinds.a, W = r.windows;
  const checks = [
    ['three files, one search log, one Forge log skipped, one unreadable', r.files === 3 && r.searchLogs === 1 && r.otherLogs === 1 && r.bad === 1],
    ['one searched priority decision, three candidates against four legal options', p.searched === 1 && p.candidates['3'] === 1 && p.legalMean === 4 && p.legalOverConsidered === 1],
    ['rollouts a candidate: Forge 4, alternatives 3.5', p.nForgeMean === 4 && p.nAltMean === 3.5 && Math.abs(p.nMean - 11 / 3) < 0.001],
    ['sigma_d = seDiff x sqrt(n): 20 and 34.6', p.sigmaN === 2 && p.sigmaP10 === 20 && p.sigmaP90 === 34.6 && p.sigmaMean === 27.3],
    ['the horizon histogram: priority at 1, the attack at 0', r.pH1 === 1 && r.pH0 === 0 && r.aH0 === 1 && r.aH1 === 0 && r.hOther === 0],
    ['an attack on one round is short; a null seDiff gives no sigma', a.searched === 1 && a.shortShare === 1 && a.sigmaN === 0 && p.shortShare === 0],
    ['overrides counted', p.overrode === 1 && a.overrode === 0],
    ['two land windows skipped; one had another land and a castable play, one neither', W.landSkip === 2 && W.landSkipOtherLand === 1 && W.landSkipPlay === 1 && W.landSkipEither === 1],
    ['an own-main window Forge passed with a legal activation, unsearched', W.ownMainNoSearch.n === 1 && W.ownMainNoSearch.withPlay === 1],
    ['own main with a stack: one, with a play', W.ownMainStack.n === 1 && W.ownMainStack.withPlay === 1],
    ['own end step: one, with a play', W.ownOther.n === 1 && W.ownOther.withPlay === 1],
    ['the opponent\'s turn: two windows, one with a castable play (a land is not one)', W.oppTurn.n === 2 && W.oppTurn.withPlay === 1],
    ['no searched priority decision outside the own main phase', W.searchedOffMain === 0],
    ['the forced passes from the summary line; the target record is not a p/a/b decision', r.forcedPriority === 10 && r.decisions === 9],
  ];
  let ok = 0;
  for (const [what, pass] of checks) { console.error(`${pass ? 'ok  ' : 'FAIL'} ${what}`); ok += pass ? 1 : 0; }
  return { selftest: 1, cases: checks.length, passed: ok, ok: ok === checks.length ? 1 : 0 };
}

const argv = process.argv.slice(2);
if (argv[0] === '--selftest') {
  const r = selftest(argv[1]);
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
} else if (argv.length === 2) {
  const r = summarize(argv[0]);
  fs.mkdirSync(path.dirname(argv[1]), { recursive: true });
  fs.writeFileSync(argv[1], JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r));
} else {
  console.error('usage: node records.cjs <games dir> <out.json> | --selftest <dir>');
  process.exit(2);
}
J212EOF
rm -rf var/j212-tools/selftest
node var/j212-tools/verdict.mjs --selftest var/j212-tools/selftest > var/j212-tools/selftest.json
cat var/j212-tools/selftest.json
rm -rf var/j212-tools/rec-selftest
node var/j212-tools/records.cjs --selftest var/j212-tools/rec-selftest > var/j212-tools/rec-selftest.json
cat var/j212-tools/rec-selftest.json
# the block reader on a synthetic results log: a match at two blocks over three games, one game of another match
# (counted as other), and a pilot line that must not count at all
rm -rf var/j212-tools/seeds-selftest
mkdir -p var/j212-tools/seeds-selftest/results
printf '%s\n' '{"purpose":"match:h:new","bseed":114900000}' '{"purpose":"match:h:new","bseed":114900001}' '{"purpose":"match:h:new","bseed":114900001}' '{"purpose":"match:h:other","bseed":114900002}' '{"purpose":"pilot","bseed":5}' > var/j212-tools/seeds-selftest/results/h.jsonl
echo '{"id":"h:new"}' > var/j212-tools/seeds-selftest/match.json
node var/j212-tools/seeds.cjs var/j212-tools/seeds-selftest var/j212-tools/seeds-selftest/match.json var/j212-tools/seeds-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j212-tools/seeds-selftest/out.json","utf8"));const ok=r.purpose==="match:h:new"&&r.games===3&&r.blocks===2&&r.min===114900000&&r.max===114900001&&r.fullBlocks===0&&r.otherGames===1?1:0;require("fs").writeFileSync("var/j212-tools/seeds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the rollout reader on a synthetic batch folder: two games, each side's rollouts, rounds, play and copy time, short
# decisions, decisions by kind, priority overrides by direction, land skips, and the two seat configs (one line off)
rm -rf var/j212-tools/ro-selftest
mkdir -p var/j212-tools/ro-selftest/batches/run-s
printf '%s\n' '{"a":"X","b":"Y","aStats":{"counts":{"search.rollouts":90,"search.rounds":34,"search.anytime.short":1,"search.p.considered":8,"search.a.considered":2,"search.playUs":9000000,"search.copyUs":450000,"search.p.skipLand":3,"search.p.changed.fromPass":2,"search.p.changed.toPass":1}},"bStats":{"counts":{"search.rollouts":150,"search.rounds":60,"search.p.considered":7,"search.b.considered":3,"search.playUs":7500000,"search.copyUs":750000,"search.p.changed.toOther":1}}}' '{"a":"X","b":"Z","aStats":{"counts":{"search.rollouts":96,"search.rounds":34,"search.p.considered":10,"search.playUs":9600000}},"bStats":{"counts":{"search.rollouts":158,"search.rounds":58,"search.anytime.short":1,"search.a.considered":10,"search.playUs":7900000}}}' > var/j212-tools/ro-selftest/batches/run-s/b0.jsonl
echo '{"id":"h:run-s","a":"search-v2-t1","b":"search-v1-anytime"}' > var/j212-tools/ro-selftest/match.json
node var/j212-tools/rollouts.cjs var/j212-tools/ro-selftest var/j212-tools/ro-selftest/match.json var/j212-tools/ro-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j212-tools/ro-selftest/out.json","utf8"));const ok=r.games===2&&r.aDecisions===20&&r.bDecisions===20&&r.aPriority===18&&r.aAttacks===2&&r.aBlocks===0&&r.bBlocks===3&&r.aRolloutsPerDecision===9.3&&r.bRolloutsPerDecision===15.4&&r.aPlayMsPerRollout===100&&r.bPlayMsPerRollout===50&&r.playMsRatio===2&&r.aCopyMsPerRollout===2.4&&r.aShortShare===0.05&&r.aFromPass===0.1111&&r.aToPass===0.0556&&r.bToOther===0.1429&&r.aSkipLandN===3&&r.aSkipLand===1.5&&r.aCfg==="X"&&r.bCfg==="MIXED"&&r.cfgExact===0?1:0;require("fs").writeFileSync("var/j212-tools/ro-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
```
```bash
# three 4-game ladder matches, one per arm against search-v2 (one batch pair, one worker, each in its own pilot folder
# and seed range), then each side's searched decisions by kind from the match line and the batch counters, and the
# horizon's trace: A's ms of play a finished rollout against B's on the same games (numbers only, so no check reads a
# missing or null key)
for k in t1 a1 x3; do
  case "$k" in t1) A=search-v2-t1; AH=63c35e9f7d5b; AMS=1500 ;; a1) A=search-v2-a1; AH=3cf65e94df28; AMS=1500 ;; x3) A=search-v2-t1-x3; AH=ce99b41f9898; AMS=4500 ;; esac
  rm -rf "var/ai-ladder-pilot/J212-$k"
  ./tools/ai-ladder.sh match "$A" search-v1-anytime --games 4 --batch-pairs 1 --game-timeout 900 --host j212-pilot --purpose pilot --dir "var/ai-ladder-pilot/J212-$k" --experiments "var/ai-ladder-pilot/J212-$k/experiments.jsonl" --out "var/ai-ladder-pilot/J212-$k/match.json" --jobs 1
  node var/j212-tools/rollouts.cjs "var/ai-ladder-pilot/J212-$k" "var/ai-ladder-pilot/J212-$k/match.json" "var/j212-tools/rollouts-pilot-$k.json"
  K="$k" A="$A" AH="$AH" AMS="$AMS" node - <<'J212EOF'
const fs = require('fs');
const { K, A, AH, AMS } = process.env;
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const m = read(`var/ai-ladder-pilot/J212-${K}/match.json`), ro = read(`var/j212-tools/rollouts-pilot-${K}.json`);
const pl = read('var/j212-tools/players.json');
const n = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const k = (t, x) => n(t && t.byKind && t.byKind[x] ? t.byKind[x].searched : 0, 0);
const aS = n(m.aSearch && m.aSearch.searched, 0), bS = n(m.bSearch && m.bSearch.searched, 0);
const r = { written: 1, k: K,
  namesOk: m.a === A && m.b === 'search-v1-anytime' ? 1 : 0,
  hashesOk: String(m.ah) === AH && String(m.bh) === 'cdd55e02a89c' ? 1 : 0,
  cfgOk: pl.cfgs && ro.aCfg === pl.cfgs[A] && ro.bCfg === pl.cfgs['search-v1-anytime'] && ro.cfgExact === ro.lines && ro.lines === 4 ? 1 : 0,
  games: n(ro.games, 0), aSearched: aS, bSearched: bS,
  aP: k(m.aSearch, 'p'), aA: k(m.aSearch, 'a'), aB: k(m.aSearch, 'b'), bP: k(m.bSearch, 'p'), bA: k(m.bSearch, 'a'), bB: k(m.bSearch, 'b'),
  agree: n(ro.aDecisions, -1) === aS && n(ro.bDecisions, -1) === bS ? 1 : 0,
  aMs: n(m.aSearch && m.aSearch.msPerDecision, 99999), bMs: n(m.bSearch && m.bSearch.msPerDecision, 99999), budgetMs: Number(AMS),
  aPlayMs: n(ro.aPlayMsPerRollout, 0), bPlayMs: n(ro.bPlayMsPerRollout, 0), playRatio: n(ro.playMsRatio, 0),
  aRollouts: n(ro.aRolloutsPerDecision, 0), bRollouts: n(ro.bRolloutsPerDecision, 0), aShortShare: n(ro.aShortShare, -1) };
// the arm is held to 1.25 x its budget: a deeper rollout runs past the deadline by up to a step (the deadline is read
// every 8 steps and Forge in the copy may think 1 s), and 4 games are few; the check guards a runaway, not the mean
r.underBudget = r.aMs < 1.25 * r.budgetMs && r.bMs < 1500 ? 1 : 0;
fs.writeFileSync(`var/j212-tools/pilot-${K}.json`, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J212EOF
done
```
```bash
# THE HORIZON, exactly, and the recording step's command and summarizer on real records: 4 recorded games of each arm
# and of search-v2 against Forge Default (the confirm set's first deck pair, two workers), and each searched
# decision's horizon from the search seat's records
mkdir -p var/j212-tools
awk '!/^#/ && NF { print; exit }' tools/ai-bench/pairs-confirm.txt > var/j212-tools/pair1.txt
cat var/j212-tools/pair1.txt
for k in t1 a1 x3 v2; do
  case "$k" in
    t1) CFG='Default+outlets+search:ms=1500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=0,anytime=1' ;;
    a1) CFG='Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=1,anytime=1' ;;
    x3) CFG='Default+outlets+search:ms=4500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=0,anytime=1' ;;
    v2) CFG='Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1' ;;
  esac
  rm -rf "var/ai-bench/j212-pilot-rec-$k"
  ./tools/ai-bench.sh play --pairs var/j212-tools/pair1.txt --a "$CFG" --b Default --games 4 --seed 212000001 --timeout 900 --jobs 2 --run "j212-pilot-rec-$k" --record-all
  node var/j212-tools/records.cjs "var/ai-bench/j212-pilot-rec-$k/games" "var/j212-tools/rec-pilot-$k.json" > /dev/null
  node -e 'const fs=require("fs");const k=process.argv[1];const r=JSON.parse(fs.readFileSync("var/j212-tools/rec-pilot-"+k+".json","utf8"));const o={};for(const x of ["written","files","searchLogs","otherLogs","bad","games","pSearched","aSearched","bSearched","pH0","pH1","aH0","aH1","bH0","bH1","hOther","forcedPriority","decisions","kbPerSearchLog"])o[x]=typeof r[x]==="number"?r[x]:-1;fs.writeFileSync("var/j212-tools/rec-pilot-"+k+"-flat.json",JSON.stringify(o)+"\n");console.log(JSON.stringify(o))' "$k"
done
```
metrics: merged = sh: cat var/j212-merged.txt 2>/dev/null || echo 0
metrics: dst = sh: cat var/j212-decision-selftest.json 2>/dev/null || echo '{"ok":0,"checks":0,"failures":-1}'
metrics: pl = sh: cat var/j212-tools/players.json 2>/dev/null || echo '{"ok":0,"present":0,"cfgs_ok":0,"literal_ok":0,"hashes_ok":0,"kinds_ok":0,"distinct":0}'
metrics: sd = sh: cat var/j212-tools/search-diff.json 2>/dev/null || echo '{"count":-1,"rc":1,"exact":0,"playersAdd":-1,"playersDel":-1,"dstAdd":-1,"dstDel":-1}'
metrics: hb = sh: cat var/j212-tools/base.json 2>/dev/null || echo '{"ok":0,"own":0,"first":0}'
metrics: st = sh: cat var/j212-tools/selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: rst = sh: cat var/j212-tools/rec-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: sst = sh: cat var/j212-tools/seeds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: ost = sh: cat var/j212-tools/ro-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: pmt1 = sh: cat var/ai-ladder-pilot/J212-t1/match.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":9,"timeouts":9}'
metrics: pma1 = sh: cat var/ai-ladder-pilot/J212-a1/match.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":9,"timeouts":9}'
metrics: pmx3 = sh: cat var/ai-ladder-pilot/J212-x3/match.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":9,"timeouts":9}'
metrics: pt1 = sh: cat var/j212-tools/pilot-t1.json 2>/dev/null || echo '{"written":0,"namesOk":0,"hashesOk":0,"cfgOk":0,"games":0,"aSearched":0,"bSearched":0,"aP":0,"aA":0,"aB":0,"bP":0,"bA":0,"bB":0,"agree":0,"underBudget":0,"playRatio":0}'
metrics: pa1 = sh: cat var/j212-tools/pilot-a1.json 2>/dev/null || echo '{"written":0,"namesOk":0,"hashesOk":0,"cfgOk":0,"games":0,"aSearched":0,"bSearched":0,"aP":0,"aA":0,"aB":0,"bP":0,"bA":0,"bB":0,"agree":0,"underBudget":0,"playRatio":0}'
metrics: px3 = sh: cat var/j212-tools/pilot-x3.json 2>/dev/null || echo '{"written":0,"namesOk":0,"hashesOk":0,"cfgOk":0,"games":0,"aSearched":0,"bSearched":0,"aP":0,"aA":0,"aB":0,"bP":0,"bA":0,"bB":0,"agree":0,"underBudget":0,"playRatio":0}'
metrics: rt1 = sh: cat var/j212-tools/rec-pilot-t1-flat.json 2>/dev/null || echo '{"written":0,"games":0,"bad":-1,"pSearched":0,"aSearched":0,"pH0":-1,"pH1":-1,"aH0":-1,"aH1":-1,"bH0":-1,"bH1":-1,"hOther":-1}'
metrics: ra1 = sh: cat var/j212-tools/rec-pilot-a1-flat.json 2>/dev/null || echo '{"written":0,"games":0,"bad":-1,"pSearched":0,"aSearched":0,"pH0":-1,"pH1":-1,"aH0":-1,"aH1":-1,"bH0":-1,"bH1":-1,"hOther":-1}'
metrics: rx3 = sh: cat var/j212-tools/rec-pilot-x3-flat.json 2>/dev/null || echo '{"written":0,"games":0,"bad":-1,"pSearched":0,"aSearched":0,"pH0":-1,"pH1":-1,"aH0":-1,"aH1":-1,"bH0":-1,"bH1":-1,"hOther":-1}'
metrics: rv2 = sh: cat var/j212-tools/rec-pilot-v2-flat.json 2>/dev/null || echo '{"written":0,"games":0,"bad":-1,"pSearched":0,"aSearched":0,"pH0":-1,"pH1":-1,"aH0":-1,"aH1":-1,"bH0":-1,"bH1":-1,"hOther":-1}'
check: merged == 1
check: dst.ok == 1
check: dst.failures == 0
check: dst.checks >= 404
check: pl.ok == 1
check: pl.present == 1
check: pl.cfgs_ok == 1
check: pl.literal_ok == 1
check: pl.hashes_ok == 1
check: pl.kinds_ok == 1
check: pl.distinct == 1
check: sd.rc == 0
check: sd.count == 2
check: sd.exact == 1
check: sd.playersAdd == 4
check: sd.playersDel == 1
check: sd.dstAdd >= 40
check: sd.dstDel == 0
check: hb.ok == 1
check: hb.own == 114000000
check: hb.first == 114900000
check: st.ok == 1
check: st.cases == 34
check: st.passed == 34
check: rst.ok == 1
check: rst.cases == 14
check: sst.ok == 1
check: ost.ok == 1
check: pmt1.complete == true
check: pmt1.played == 4
check: pmt1.errors + pmt1.timeouts <= 1
check: pt1.written == 1
check: pt1.namesOk == 1
check: pt1.hashesOk == 1
check: pt1.cfgOk == 1
check: pt1.games == 4
check: pt1.aSearched >= 10
check: pt1.bSearched >= 10
check: pt1.aP >= 1
check: pt1.bP >= 1
check: pt1.agree == 1
check: pt1.underBudget == 1
check: pt1.playRatio >= 1.3
check: pma1.complete == true
check: pma1.played == 4
check: pma1.errors + pma1.timeouts <= 1
check: pa1.written == 1
check: pa1.namesOk == 1
check: pa1.hashesOk == 1
check: pa1.cfgOk == 1
check: pa1.games == 4
check: pa1.aSearched >= 10
check: pa1.bSearched >= 10
check: pa1.aP >= 1
check: pa1.bP >= 1
check: pa1.agree == 1
check: pa1.underBudget == 1
check: pmx3.complete == true
check: pmx3.played == 4
check: pmx3.errors + pmx3.timeouts <= 1
check: px3.written == 1
check: px3.namesOk == 1
check: px3.hashesOk == 1
check: px3.cfgOk == 1
check: px3.games == 4
check: px3.aSearched >= 10
check: px3.bSearched >= 10
check: px3.aP >= 1
check: px3.bP >= 1
check: px3.agree == 1
check: px3.underBudget == 1
check: px3.playRatio >= 1.3
check: rt1.written == 1
check: rt1.games == 4
check: rt1.bad == 0
check: rt1.pH1 >= 1
check: rt1.pH0 == 0
check: rt1.aH1 == 0
check: rt1.bH0 == 0
check: rt1.hOther == 0
check: ra1.written == 1
check: ra1.games == 4
check: ra1.bad == 0
check: ra1.aH1 >= 1
check: ra1.aH0 == 0
check: ra1.pH0 >= 1
check: ra1.pH1 == 0
check: ra1.bH1 == 0
check: ra1.hOther == 0
check: rx3.written == 1
check: rx3.games == 4
check: rx3.bad == 0
check: rx3.pH1 >= 1
check: rx3.pH0 == 0
check: rx3.aH1 == 0
check: rx3.bH0 == 0
check: rx3.hOther == 0
check: rv2.written == 1
check: rv2.games == 4
check: rv2.bad == 0
check: rv2.pH0 >= 1
check: rv2.pH1 + rv2.aH1 + rv2.bH1 == 0
check: rv2.hOther == 0

The pilot asks only whether anything is broken:
- `merged`: the pinned commit is on `origin/main`;
- the build passes with the decision self-test at 0 failures and at least 404 checks (J210's 392 and D537's
  `horizonArms`, 12), and the bench self-test and the ladder registry test pass;
- `pl`: the five players resolve on this PC at D537's hashes (compared as strings) and each arm's ai-bench config is
  exactly D537's (`literal_ok`), which is search-v2's with only the named keys changed (`cfgs_ok`);
- `sd`: git answered, and since J211's pin the only files changed under `bridge/src`, `tools/ai-ladder` and
  `tools/ai-bench` are `players.json` (three players appended: 4 lines in, 1 out) and `DecisionSelfTest.java`
  (lines in, none out), so no line a game plays by changed;
- `hb`: this host's seed base is 114,000,000, an empty folder's first match block 114,900,000 (J210's deals), and
  the pilot's host name has another base;
- the verdict script reads 34 synthetic cases as D537 says (each reading at and either side of its bars: lo 0.5 and
  0.5001, Elo 15.0 and 14.9, eloHi 15.0 and 14.9; the three descriptions with an end at exactly 0; a stopped match,
  1,199 games, 61 errors, a missing end, swapped or other players, other hashes, an arm or B that searched one kind
  less, absent, short, other or shared block files, other seat configs, absent files, all refused; the night's
  pattern flags; the cost that never changes a reading); the recording summarizer reads 14 synthetic cases; the
  block reader and the rollout reader count synthetic files exactly;
- in 4 games of each arm against search-v2: both sides search, the names and hashes are the arm's and search-v2's,
  every batch line carried the two seat configs exactly, the batch counters hold exactly the decisions the match
  line counts, search-v2 stays under its 1.5 s on average and each arm under 1.25 times its own budget (1.5 s; t1-x3 4.5 s: a guard against a runaway, t1 is expected near its budget), and t1's and t1-x3's rollouts
  play at least 1.3 times as long as search-v2's in the same games (the horizon's trace; one more turn is expected
  at about two to three times);
- THE HORIZON, from 4 recorded games of each arm and of search-v2 against Forge Default: every searched decision's
  record carries the horizon its rollouts were given, and t1 and t1-x3 searched priority at 1 and no attack at 1 and
  no block at 0, a1 attacks at 1 and priority at 0 and no block at 1, search-v2 nothing at 1, with no other horizon
  anywhere (`hOther`). The same runs prove the recording command and the summarizer on real records.

Read, not checked:
- a1's ms of play a rollout against search-v2's (`pa1.playRatio`): its deeper rollouts are attacks only, about a
  sixth of all rollouts (J210: 6,861 attack decisions at 11.1 rollouts against 22,222 priority and block decisions at
  about 16), so the ratio sits near 1 and is the recorded horizon's to prove;
- blocks: in 4 games a side may search none; the night's checks require both sides' blocks;
- each side's ms a decision, rollouts a decision and the share decided on fewer than 2 rounds (`pt1`, `pa1`,
  `px3`); a recorded seat log's size (`kbPerSearchLog`; D347 measured 178 KiB a game for both seats).

There are no win-rate bounds. The matches are the test.

## Commands
cores: 7
clean: var/ai-ladder/match-J212-t1.json var/j212-t1
```bash
# match 1 of 3: search-v2-t1 (63c35e9f7d5b; priority and block rollouts to the end of the next turn, attacks this
# turn, 1.5 s) against search-v1-anytime, 1,200 games on the confirm set, in a ladder folder of its own, emptied
# here, so this match is dealt blocks 114,900,000-114,900,149 whatever ran before
test -f var/j212-tools/verdict.mjs
mkdir -p var/j212
rm -rf var/j212-t1 var/ai-ladder/match-J212-t1.json
echo "J212 1/3: search-v2-t1 against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-t1 search-v1-anytime --dir var/j212-t1 --games 1200 --hours 4.5 --game-timeout 900 --out var/ai-ladder/match-J212-t1.json --jobs {workers}
tail -1 var/j212-t1/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J212-a1.json var/j212-a1
```bash
# match 2 of 3: search-v2-a1 (3cf65e94df28; attack rollouts to the end of the next turn, priority and blocks this
# turn, 1.5 s) against search-v1-anytime, 1,200 games, its own folder, blocks 114,900,000-114,900,149
test -f var/j212-tools/verdict.mjs
mkdir -p var/j212
rm -rf var/j212-a1 var/ai-ladder/match-J212-a1.json
echo "J212 2/3: search-v2-a1 against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-a1 search-v1-anytime --dir var/j212-a1 --games 1200 --hours 4 --game-timeout 900 --out var/ai-ladder/match-J212-a1.json --jobs {workers}
tail -1 var/j212-a1/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J212-x3.json var/j212-x3
```bash
# match 3 of 3: search-v2-t1-x3 (ce99b41f9898; t1's horizons at 4.5 s a searched decision, the round cap still 12)
# against search-v1-anytime, 1,200 games, its own folder, blocks 114,900,000-114,900,149
test -f var/j212-tools/verdict.mjs
mkdir -p var/j212
rm -rf var/j212-x3 var/ai-ladder/match-J212-x3.json
echo "J212 3/3: search-v2-t1-x3 against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-t1-x3 search-v1-anytime --dir var/j212-x3 --games 1200 --hours 7.5 --game-timeout 900 --out var/ai-ladder/match-J212-x3.json --jobs {workers}
tail -1 var/j212-x3/match.jsonl
```
cores: 1
clean: var/j212/verdict.json var/j212/v.json var/j212/report.md var/j212/rollouts-t1.json var/j212/rollouts-a1.json var/j212/rollouts-x3.json var/j212/seeds-t1.json var/j212/seeds-a1.json var/j212/seeds-x3.json
```bash
# the pre-registered readings: each match's blocks and rollouts, the verdict over the three, and report.md (numbers
# only; the PC session writes the summary beside it). Nothing here plays a game; a reading is never a failure.
test -f var/j212-tools/verdict.mjs
mkdir -p var/j212
for k in t1 a1 x3; do
  node var/j212-tools/rollouts.cjs "var/j212-$k" "var/ai-ladder/match-J212-$k.json" "var/j212/rollouts-$k.json" > /dev/null
  node var/j212-tools/seeds.cjs "var/j212-$k" "var/ai-ladder/match-J212-$k.json" "var/j212/seeds-$k.json"
done
node var/j212-tools/verdict.mjs var/ai-ladder var/j212 var/j212/verdict.json > /dev/null
# the checks' copy: the verdict's numbers only (every value a number; strings, nulls and the horizon detail dropped)
node -e 'const fs=require("fs");const v=JSON.parse(fs.readFileSync("var/j212/verdict.json","utf8"));const flat=(o)=>{const r={};for(const [k,x] of Object.entries(o)){if(typeof x==="number")r[k]=x}return r};const out=flat(v);for(const k of ["t1","a1","x3"])out[k]=flat(v.arms[k]);fs.writeFileSync("var/j212/v.json",JSON.stringify(out)+"\n");console.log(JSON.stringify(out))'
node - <<'J212EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const v = read('var/j212/verdict.json');
const pct = (x, d = 1) => (typeof x === 'number' ? `${(x * 100).toFixed(d)}%` : '-');
const runStart = (id) => {
  const x = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(id || '');
  return x ? Date.UTC(+x[1], +x[2] - 1, +x[3], +x[4], +x[5], +x[6]) : null;
};
const L = ['# J212: the search\'s horizon, three arms against search-v1-anytime, 1,200 games each (D398; D537; D519\'s four readings)', ''];
L.push('**Readings under the pre-registered rule:**', '');
for (const l of v.lines || []) L.push(`- ${l}`);
L.push('', `**Candidates for a 4,800-game confirmation (SHOWN or SMALL GAIN):** ${v.candidates ?? '-'}. **The live seat:** unchanged by this job (liveSeatChanged ${v.liveSeatChanged ?? 0}).`, '');
L.push(`**The night's pattern (D537 point 8, descriptions, not rules):** t1 a candidate ${v.t1Gain ?? '-'}, a1 a candidate ${v.a1Gain ?? '-'}, t1-x3 a candidate ${v.x3Gain ?? '-'}; per rollout but not per second (t1-x3 a candidate, t1 not) ${v.perRolloutOnly ?? '-'}; the horizon closed for priority and blocks at this leaf (t1 and t1-x3 both NOT SHOWN) ${v.horizonClosedPB ?? '-'}; the deeper attack horizon closed (a1 NOT SHOWN) ${v.horizonClosedA ?? '-'}.`, '');
L.push('| arm | played / planned | complete | score [95%] | Elo [95%] | reading | described | pairs | draws, errors, timeouts | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|');
const arms = v.arms || {};
const M = {};
for (const k of ['t1', 'a1', 'x3']) {
  const m = read(`var/ai-ladder/match-J212-${k}.json`); M[k] = m;
  const a = arms[k] || {};
  const t0 = runStart(m.id), t1 = typeof m.at === 'string' ? Date.parse(m.at) : null;
  const hours = t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null;
  L.push(`| ${m.a ?? k} | ${m.played ?? '-'} / ${m.planned ?? '-'} | ${m.complete ?? '-'} | ${m.score ?? '-'} [${m.lo ?? '-'}, ${m.hi ?? '-'}] | ${m.elo ?? '-'} [${m.eloLo ?? '-'}, ${m.eloHi ?? '-'}] | ${a.reading ?? 'no reading'} | ${a.word ?? '-'} | ${m.pairs ?? '-'} | ${m.draws ?? '-'}, ${m.errors ?? '-'}, ${m.timeouts ?? '-'} | ${hours ?? '-'} |`);
}
L.push('', '**The cost and the horizon, A against B on the same games (description only; the seconds are this machine\'s, D388):**', '');
L.push('| arm | search s a game A / B (x) | ms a decision A / B | ms p, a, b A | ms p, a, b B | rollouts a decision A / B | rounds a decision A / B | ms of play a rollout A / B (x) | copy ms a rollout A / B | fewer than 2 rounds A / B | from pass, to other, to pass a p decision A | same, B | land windows a game A / B | step caps A / B |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of ['t1', 'a1', 'x3']) {
  const a = arms[k] || {}, h = a.horizon || {};
  L.push(`| ${a.a ?? k} | ${a.aSecPerGame ?? '-'} / ${a.bSecPerGame ?? '-'} (x${a.costRatio ?? '-'}) | ${a.aMs ?? '-'} / ${a.bMs ?? '-'} | ${a.aMsP ?? '-'}, ${a.aMsA ?? '-'}, ${a.aMsB ?? '-'} | ${a.bMsP ?? '-'}, ${a.bMsA ?? '-'}, ${a.bMsB ?? '-'} | ${h.aRolloutsPerDecision ?? '-'} / ${h.bRolloutsPerDecision ?? '-'} | ${h.aRoundsPerDecision ?? '-'} / ${h.bRoundsPerDecision ?? '-'} | ${h.aPlayMsPerRollout ?? '-'} / ${h.bPlayMsPerRollout ?? '-'} (x${h.playMsRatio ?? '-'}) | ${h.aCopyMsPerRollout ?? '-'} / ${h.bCopyMsPerRollout ?? '-'} | ${pct(h.aShortShare, 2)} / ${pct(h.bShortShare, 2)} | ${pct(h.aFromPass)}, ${pct(h.aToOther)}, ${pct(h.aToPass)} | ${pct(h.bFromPass)}, ${pct(h.bToOther)}, ${pct(h.bToPass)} | ${h.aSkipLand ?? '-'} / ${h.bSkipLand ?? '-'} | ${h.aStepCap ?? '-'} / ${h.bStepCap ?? '-'} |`);
}
L.push('', '| side | decisions searched (games) | changed Forge: p | a | b | all | budget fallbacks [95%] | other fallbacks | step timeouts |');
L.push('|---|---|---|---|---|---|---|---|---|');
for (const k of ['t1', 'a1', 'x3']) {
  const m = M[k] || {};
  for (const [who, t] of [[m.a, m.aSearch], [`${m.b} (vs ${m.a})`, m.bSearch]]) {
    if (!t || !t.searched) { L.push(`| ${who ?? k} | no search | | | | | | | |`); continue; }
    const kd = t.byKind || {};
    const ch = (x) => (kd[x] ? `${kd[x].changed}/${kd[x].searched} (${pct(kd[x].rate)})` : '-');
    const other = Object.entries(t.fallback || {}).filter(([r]) => r !== 'budget').map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
    L.push(`| ${who} | ${t.searched} (${t.games}) | ${ch('p')} | ${ch('a')} | ${ch('b')} | ${t.changed}/${t.searched} (${pct(t.searched ? t.changed / t.searched : null)}) | ${(t.fallback || {}).budget ?? 0} = ${pct(t.budgetRate)} [${pct(t.budgetLo)}, ${pct(t.budgetHi)}] | ${other} | ${t.stepTimeouts ?? '-'} |`);
  }
}
for (const k of ['t1', 'a1', 'x3']) {
  const a = arms[k] || {}, bs = read(`var/j212/seeds-${k}.json`);
  L.push('', `${a.a ?? k}: rule parts names ${a.names ?? 0}, hashes ${a.hashes ?? 0}, seat configs ${a.cfgs ?? 0}, the registered blocks ${a.blocks ?? 0} (${bs.blocks ?? '-'} blocks ${bs.min ?? '-'} to ${bs.max ?? '-'}, ${bs.games ?? '-'} games, ${bs.otherGames ?? '-'} of another match), all three kinds on both sides ${a.kindsOk ?? 0}, complete ${a.complete ?? 0}. SHOWN ${a.shown ?? 0}, SMALL GAIN ${a.smallGain ?? 0}, INCONCLUSIVE AT 1,200 ${a.inconclusive1200 ?? 0}, NOT SHOWN ${a.notShown ?? 0}; candidate ${a.candidate ?? 0}. Described: indistinguishable ${a.indistinguishable ?? 0}, a measured loss ${a.measuredLoss ?? 0}, a measured gain ${a.measuredGain ?? 0}. Match id ${M[k]?.id ?? '-'}, set ${M[k]?.set ?? '-'}.`);
}
fs.mkdirSync('var/j212', { recursive: true });
fs.writeFileSync('var/j212/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J212EOF
```
cores: 7
clean: var/ai-bench/j212-rec var/j212/records-full.json var/j212/records.json var/j212/rec-rc.txt
```bash
# the recording step, information only (D537 point 10): search-v2's seat config against Forge Default, 24 games a deck
# pair on the confirm set (720 games, bench seed 212100001), every decision of both seats recorded; stopped at 2 h.
# Its exit code is recorded and nothing above depends on it.
test -f var/j212-tools/records.cjs
mkdir -p var/j212
rm -rf var/ai-bench/j212-rec var/j212/records-full.json var/j212/records.json
rc=0
timeout 2h ./tools/ai-bench.sh play --pairs tools/ai-bench/pairs-confirm.txt --a 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1' --b Default --games 24 --seed 212100001 --timeout 900 --jobs {workers} --run j212-rec --record-all || rc=$?
echo "$rc" > var/j212/rec-rc.txt
node var/j212-tools/records.cjs var/ai-bench/j212-rec/games var/j212/records-full.json > /dev/null
node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("var/j212/records-full.json","utf8"));const rc=Number(fs.readFileSync("var/j212/rec-rc.txt","utf8").trim());const o={written:r.written===1?1:0,games:r.games,files:r.files,bad:r.bad,pSearched:r.pSearched,aSearched:r.aSearched,bSearched:r.bSearched,rc:Number.isFinite(rc)?rc:-1};fs.writeFileSync("var/j212/records.json",JSON.stringify(o)+"\n");console.log(JSON.stringify(o))'
node - <<'J212EOF'
// the recording's summary, appended to report.md (numbers only; information, deciding nothing)
const fs = require('fs');
const r = JSON.parse(fs.readFileSync('var/j212/records-full.json', 'utf8'));
const rc = fs.readFileSync('var/j212/rec-rc.txt', 'utf8').trim();
const W = r.windows || {};
const pct = (x, n) => (n > 0 ? `${((100 * x) / n).toFixed(1)}%` : '-');
const L = ['', '## The recording (D537 point 10): search-v2 against Forge Default, its own decision records (information only)', ''];
L.push(`ai-bench exit ${rc}; ${r.files} logs, ${r.searchLogs} of the search seat (games), ${r.otherLogs} of Forge's, ${r.bad} unreadable; ${r.overs} game ends; ${r.kbPerSearchLog} KiB a log; ${r.decisions} priority, attack and block records of the search seat; ${r.forcedPriority} forced priority passes (counted, never recorded).`, '');
L.push('| kind | searched | candidates a decision (1..6+) | mean | legal options a decision | legal > considered | rollouts a candidate: Forge / alternatives / all | complete rounds | fewer than 2 | ms | horizon | overrode | fallbacks | sigma_d n | sigma_d p10 / p25 / median / p75 / p90 | mean | zero | nonzero median / p90 | over 1,000 |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of ['p', 'a', 'b']) {
  const x = (r.kinds || {})[k] || {};
  const hist = ['1', '2', '3', '4', '5', '6+'].map((c) => (x.candidates || {})[c] || 0).join(' / ');
  L.push(`| ${k} | ${x.searched} | ${hist} | ${x.candidatesMean} | ${x.legalMean} | ${x.legalOverConsidered} (${x.incompleteListings} listings a shortlist) | ${x.nForgeMean} / ${x.nAltMean} / ${x.nMean} | ${x.roundsMean} | ${x.shortShare} | ${x.msMean} | ${JSON.stringify(x.horizon)} | ${x.overrode} | ${JSON.stringify(x.fallback)} | ${x.sigmaN} | ${x.sigmaP10} / ${x.sigmaP25} / ${x.sigmaMedian} / ${x.sigmaP75} / ${x.sigmaP90} | ${x.sigmaMean} | ${x.sigmaZero} | ${x.sigmaNonzeroMedian} / ${x.sigmaNonzeroP90} | ${x.sigmaOver1000} |`);
}
const w = (o) => (o ? `${o.n} (with a legal non-mana play ${o.withPlay}, ${pct(o.withPlay, o.n)})` : '-');
L.push('', 'Priority windows the search did not search (recorded windows only: a window with one legal answer is a forced pass, counted above and never recorded):');
L.push(`- its own main phase, empty stack, Forge played a land (skipped by the search): ${W.landSkip}; with another land among the legal options ${W.landSkipOtherLand} (${pct(W.landSkipOtherLand, W.landSkip)}), with a castable non-mana play ${W.landSkipPlay} (${pct(W.landSkipPlay, W.landSkip)}), with either ${W.landSkipEither} (${pct(W.landSkipEither, W.landSkip)});`);
L.push(`- its own main phase, empty stack, no land and no search (the outlet policy, or no alternative Forge's per-card AI accepts): ${w(W.ownMainNoSearch)};`);
L.push(`- its own main phase with a non-empty stack: ${w(W.ownMainStack)};`);
L.push(`- its own turn outside the main phases: ${w(W.ownOther)};`);
L.push(`- the opponent's turn: ${w(W.oppTurn)};`);
L.push(`- searched priority decisions outside its own main phase with an empty stack (expected 0): ${W.searchedOffMain}.`);
L.push('', 'Not in the records, so not reported: the paired-round count itself (sigma_d takes n, Forge\'s answer being rolled first in every round; a round where Forge\'s own rollout threw is not marked), per-round leaves, rollouts by kind. sigma_d is in leaf points; a rollout that ends the game scores +-(100,000 - 100 x turn), which is what the over-1,000 column counts.');
fs.appendFileSync('var/j212/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J212EOF
```
check: mt1.complete == true
check: mt1.played == 1200
check: mt1.errors + mt1.timeouts <= 60
check: ma1.complete == true
check: ma1.played == 1200
check: ma1.errors + ma1.timeouts <= 60
check: mx3.complete == true
check: mx3.played == 1200
check: mx3.errors + mx3.timeouts <= 60
check: v.written == 1
check: v.completeCount == 3
check: v.readings == 3
check: v.liveSeatChanged == 0
check: v.t1.names == 1
check: v.t1.hashes == 1
check: v.t1.blocks == 1
check: v.t1.cfgs == 1
check: v.t1.kindsOk == 1
check: v.t1.complete == 1
check: v.t1.shown + v.t1.smallGain + v.t1.inconclusive1200 + v.t1.notShown == 1
check: v.t1.indistinguishable + v.t1.measuredLoss + v.t1.measuredGain == 1
check: v.t1.candidate == v.t1.shown + v.t1.smallGain
check: v.t1.shown == 1 or not (v.t1.complete == 1 and mt1.lo > 0.5 and mt1.elo >= 15)
check: v.t1.shown == 0 or (v.t1.complete == 1 and mt1.lo > 0.5 and mt1.elo >= 15)
check: v.t1.smallGain == 1 or not (v.t1.complete == 1 and mt1.lo > 0.5 and mt1.elo < 15)
check: v.t1.smallGain == 0 or (v.t1.complete == 1 and mt1.lo > 0.5 and mt1.elo < 15)
check: v.t1.inconclusive1200 == 1 or not (v.t1.complete == 1 and mt1.lo <= 0.5 and mt1.eloHi >= 15)
check: v.t1.inconclusive1200 == 0 or (v.t1.complete == 1 and mt1.lo <= 0.5 and mt1.eloHi >= 15)
check: v.t1.notShown == 1 or not (v.t1.complete == 1 and mt1.lo <= 0.5 and mt1.eloHi < 15)
check: v.t1.notShown == 0 or (v.t1.complete == 1 and mt1.lo <= 0.5 and mt1.eloHi < 15)
check: v.t1.measuredLoss == 1 or not (v.t1.complete == 1 and mt1.eloHi < 0)
check: v.t1.measuredLoss == 0 or (v.t1.complete == 1 and mt1.eloHi < 0)
check: v.t1.measuredGain == 1 or not (v.t1.complete == 1 and mt1.eloLo > 0)
check: v.t1.measuredGain == 0 or (v.t1.complete == 1 and mt1.eloLo > 0)
check: v.t1.liveSeatChanged == 0
check: v.a1.names == 1
check: v.a1.hashes == 1
check: v.a1.blocks == 1
check: v.a1.cfgs == 1
check: v.a1.kindsOk == 1
check: v.a1.complete == 1
check: v.a1.shown + v.a1.smallGain + v.a1.inconclusive1200 + v.a1.notShown == 1
check: v.a1.indistinguishable + v.a1.measuredLoss + v.a1.measuredGain == 1
check: v.a1.candidate == v.a1.shown + v.a1.smallGain
check: v.a1.shown == 1 or not (v.a1.complete == 1 and ma1.lo > 0.5 and ma1.elo >= 15)
check: v.a1.shown == 0 or (v.a1.complete == 1 and ma1.lo > 0.5 and ma1.elo >= 15)
check: v.a1.smallGain == 1 or not (v.a1.complete == 1 and ma1.lo > 0.5 and ma1.elo < 15)
check: v.a1.smallGain == 0 or (v.a1.complete == 1 and ma1.lo > 0.5 and ma1.elo < 15)
check: v.a1.inconclusive1200 == 1 or not (v.a1.complete == 1 and ma1.lo <= 0.5 and ma1.eloHi >= 15)
check: v.a1.inconclusive1200 == 0 or (v.a1.complete == 1 and ma1.lo <= 0.5 and ma1.eloHi >= 15)
check: v.a1.notShown == 1 or not (v.a1.complete == 1 and ma1.lo <= 0.5 and ma1.eloHi < 15)
check: v.a1.notShown == 0 or (v.a1.complete == 1 and ma1.lo <= 0.5 and ma1.eloHi < 15)
check: v.a1.measuredLoss == 1 or not (v.a1.complete == 1 and ma1.eloHi < 0)
check: v.a1.measuredLoss == 0 or (v.a1.complete == 1 and ma1.eloHi < 0)
check: v.a1.measuredGain == 1 or not (v.a1.complete == 1 and ma1.eloLo > 0)
check: v.a1.measuredGain == 0 or (v.a1.complete == 1 and ma1.eloLo > 0)
check: v.a1.liveSeatChanged == 0
check: v.x3.names == 1
check: v.x3.hashes == 1
check: v.x3.blocks == 1
check: v.x3.cfgs == 1
check: v.x3.kindsOk == 1
check: v.x3.complete == 1
check: v.x3.shown + v.x3.smallGain + v.x3.inconclusive1200 + v.x3.notShown == 1
check: v.x3.indistinguishable + v.x3.measuredLoss + v.x3.measuredGain == 1
check: v.x3.candidate == v.x3.shown + v.x3.smallGain
check: v.x3.shown == 1 or not (v.x3.complete == 1 and mx3.lo > 0.5 and mx3.elo >= 15)
check: v.x3.shown == 0 or (v.x3.complete == 1 and mx3.lo > 0.5 and mx3.elo >= 15)
check: v.x3.smallGain == 1 or not (v.x3.complete == 1 and mx3.lo > 0.5 and mx3.elo < 15)
check: v.x3.smallGain == 0 or (v.x3.complete == 1 and mx3.lo > 0.5 and mx3.elo < 15)
check: v.x3.inconclusive1200 == 1 or not (v.x3.complete == 1 and mx3.lo <= 0.5 and mx3.eloHi >= 15)
check: v.x3.inconclusive1200 == 0 or (v.x3.complete == 1 and mx3.lo <= 0.5 and mx3.eloHi >= 15)
check: v.x3.notShown == 1 or not (v.x3.complete == 1 and mx3.lo <= 0.5 and mx3.eloHi < 15)
check: v.x3.notShown == 0 or (v.x3.complete == 1 and mx3.lo <= 0.5 and mx3.eloHi < 15)
check: v.x3.measuredLoss == 1 or not (v.x3.complete == 1 and mx3.eloHi < 0)
check: v.x3.measuredLoss == 0 or (v.x3.complete == 1 and mx3.eloHi < 0)
check: v.x3.measuredGain == 1 or not (v.x3.complete == 1 and mx3.eloLo > 0)
check: v.x3.measuredGain == 0 or (v.x3.complete == 1 and mx3.eloLo > 0)
check: v.x3.liveSeatChanged == 0
check: v.candidates == v.t1.candidate + v.a1.candidate + v.x3.candidate
check: rec.written == 1

The first nine checks say each match is complete: not stopped, all 1,200 games played, at most one in 20 ended in
an engine error or a timeout. Then the verdict ran on the three matches, read all three, and changed nothing. For
each arm: the verdict's own completeness parts (names, hashes, the registered blocks with no other match's game in
the folder, the two seat configs on every batch line, all three kinds searched on both sides), exactly one reading
and exactly one description, the candidate flag exactly SHOWN or SMALL GAIN, then the four readings and the two
descriptions in the runner's own language against the match line (so the verdict and the line cannot disagree), and
the live seat unchanged. Any reading passes them; a reading is not a failure. The recording's only check is that its
summary was written: its numbers, its exit code (`rec.rc`) and its games are reported, not gated, because it decides
nothing. If a match is cut short (its own stop, or a memory stop the runner retries from that match's block), the job
fails on that match's checks, the report is still written with the other matches' readings, and what is owed is a
repost of the missing arm under a new job id, not a reading of a cut match.

## Abort if
abort: j212_err >= 30 and j212_err > j212_games / 10

Engine trouble only: once 30 games of the three matches have ended in an engine error or a timeout, the job stops if
they are more than one in ten. No match has a stopping rule on the score, and a slow night is not trouble: each
match has its own clock and the step its timeout, so the job never stops early on a result or on time.

## Report
collect: var/ai-ladder/match-J212-t1.json
collect: var/ai-ladder/match-J212-a1.json
collect: var/ai-ladder/match-J212-x3.json
collect: var/j212/verdict.json
collect: var/j212/report.md
collect: var/j212/seeds-t1.json
collect: var/j212/seeds-a1.json
collect: var/j212/seeds-x3.json
collect: var/j212/rollouts-t1.json
collect: var/j212/rollouts-a1.json
collect: var/j212/rollouts-x3.json
collect: var/j212/records-full.json

`report.md` is the job's own numbers. The PC session writes `summary.md` from it, the same way as J210 and J211:
- **the answer first:** whether the search plays better one turn deeper, in one sentence a person can act on: each
  arm's reading under D537's rule (SHOWN, SMALL GAIN, INCONCLUSIVE AT 1,200 or NOT SHOWN) with its score and Elo
  interval against search-v2, the describing word, and the candidates (each earns one 4,800-game confirmation as
  its own job under its own decision; nothing is adopted from 1,200 games and this job does not change the live
  seat);
- **what the three readings together point at** (D537 point 8, as consequences, never as rules): t1 against t1-x3
  (the horizon at search-v2's clock and at about its evidence), a1 alone (attacks), and the case that applies;
  t1-x3's attacks also had 4.5 s at this turn's horizon (D537 point 3), which a t1-x3 gain does not separate;
- **the cost and the horizon:** search seconds a game on each side and their ratio, ms a searched decision by kind,
  rollouts and rounds a decision, ms of play a rollout (the horizon's trace) and the share decided on fewer than 2
  rounds, the overrides by direction; t1's thinner evidence at search-v2's clock (D537 point 4) is read here;
- **the recording:** sigma_d by kind against the margin of 20 leaf points, candidates and legal options, rollouts a
  candidate, the land windows the search skips and how many had a choice, and the windows outside its own main
  phases with a legal play, as information for the next lane; what the records cannot say;
- **the run:** draws, errors and timeouts, the deal blocks, each match's hours against its estimate (2.8, 2.5 and
  4.0 h), the recording's 0.9 h, the pressure events in STATUS and any block the runner retried, that it ran alone
  (D521), and whether the GPU queue or anything else outside the lab was running.

Never write "no effect", "no gain" or "no cost" for an interval that includes 0: the reading is NOT SHOWN or
INCONCLUSIVE AT 1,200, and the interval says how large an effect the match could not have seen. The three arms are
each read against search-v2 and never against each other. If a match stopped early (`complete: false`), say so: it
gets no reading, and what is owed is a repost of that arm.
