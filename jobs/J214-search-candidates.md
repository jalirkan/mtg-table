id: J214
title: What the search considers (D540): three fixed 1,200-game matches (600 mirrored pairs each, D398, the confirm set, no stopping rule) of search-v3 with one widening of its priority search against search-v2-no-b (search-v3, the live seat since D539), each in a ladder folder of its own under --host j214 on blocks 416,900,000-416,900,149 -- search-v3-declined (castable spells Forge declines, aimed by Forge's own targeting), search-v3-instant (the empty-stack instant-speed windows where Forge plays, either turn), search-v3-lands (Forge's land drop against each other-named land) -- each read by D519's four readings at 1,200 games with D537's completeness rule and D540's exposure condition, pre-registered in D540. This job never changes the live seat
public_title: The search considers more: three 1,200-game matches
public_est: ~8 h (one night)
public_decides: Whether the search AI gains from declined spells, instant speed or land choice
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
alone: yes
repos: mtg-table@7ff7d6ab233e767f9c71639432250bfc66bc8aed (the merge commit of D540's lane, pc/search-candidates, on main, after D539's merge. It carries: three SearchConfig keys off by default -- declined, instant, lands -- in bridge/src/mtgtable/ai/SearchConfig.java; their search paths in SearchPolicy.java; one call in PolicyControllerAi.java (wantsPriority(player, forge)) and one in Explorer.java (alternatives(..., null)); DecisionSelfTest.searchCandidates (29 checks, no behaviour); the ai-bench self-test's searchCandidatesScenarios (engine); three ladder players in tools/ai-ladder/players.json (search-v3-declined 795daea97aaa, search-v3-instant 25ee7e76b741, search-v3-lands e0b09eb7b014); the ladder's three params (tools/ai-ladder/kinds.ts) and its test; docs/decisions/D540-search-candidates.md and PLAN's rows. The pilot checks by content that, against D539's merge (bf9fe5f175a4111ad34a979edab2466130c1c896), the only files changed under bridge/src, tools/ai-ladder and tools/ai-bench are those five, players.json (+4 -1: three players appended), kinds.ts (added lines only) and AiBench.java (added lines only), so every game is one code version, D341)
decides: D540 points 8 and 9, from each arm's own match line and its batch counters alone. Each match against search-v2-no-b reads exactly one of D519's four readings at 1,200 games: SHOWN (lo > 0.5 and elo >= +15), SMALL GAIN (lo > 0.5 and elo < +15), INCONCLUSIVE AT 1,200 (lo <= 0.5 and eloHi >= +15), NOT SHOWN (lo <= 0.5 and eloHi < +15); a match complete in every other part (B's batch counters showing no search.p.declined., search.p.instant. or search.p.lands. counter above 0 among them) whose key fired in fewer than 0.25 search.p.<key>.windows a game played (300 at 1,200 games) is NOT READ, gets no reading, its rate is reported, and the arm is not played again without a new decision. A match incomplete for any other reason (cut short, or a B showing any such counter above 0, among them, whatever its rate) gets neither a reading nor NOT READ and is reposted alone under a new job id after its cause is found; an arm the pilot's arm gate (D540 point 11) kept out is NOT PLAYED. A SHOWN or SMALL GAIN arm is a candidate for one 4,800-game confirmation against the live seat on deals no match has played, as its own job under its own decision, before any live-seat question goes to the owner; INCONCLUSIVE AT 1,200 is information; a NOT SHOWN arm is not played again. Nothing is adopted from 1,200 games and this job never changes the live seat (D509): SearchConfig.LIVE_DEFAULTS stays what=pa,anytime=1. D540 point 13 says, as consequences and not rules, what the three readings together point at
hypothesis: none registered on any reading. What is known (D540's context, from J212's recording of search-v2 against Forge Default, 720 games): the search searched 11,939 priority decisions and left 5,384 land drops to Forge (another land NAME legal in 2,630), 4,122 own-main windows where Forge passed with no alternative, and 1,430 empty-stack windows outside its own main phases where Forge played (1.99 a game); 8,145 of the searched decisions had a legal option outside the candidates (10,696 activations, 2,151 sorcery-speed casts, 2,955 instants); its overrides land on casts (13.1% of offered casts picked, 7.6% of passes, 5.1% of activations). Expected, not registered: each arm's key fires in a few windows a game (declined about 2.5 more searched windows and 0.2 more candidates a searched decision; instant about 2; lands about 3.65), so each arm's exposure is small against search-v3's 16.6 searched priority decisions a game, and an effect it can carry may be under the 1,200-game width of about +-11 Elo
rule: D540 points 8 and 9, merged before any J214 game was played (written 2026-11-11 while J213 played), in their words (D540's bold dropped, its list set as sentences): "A match is complete when its line names the arm and search-v2-no-b in that order at their hashes, says complete: true, played all 1,200 games with errors plus timeouts at most 60, carries score, lo, elo, eloLo and eloHi, was played on exactly blocks 416,900,000-416,900,149 with no other match's game in its folder, every batch line carried the two seat configs of point 6 exactly, both sides searched priority and attack decisions and neither searched a block, and the arm's key fired often enough: A's batch counters show search.p.<key>.windows summed over the match's games at least 0.25 a game played (300 at 1,200 games; for declined, search.p.declined.windows), and B's show no search.p.declined., search.p.instant. or search.p.lands. counter above 0. A match under that rate is NOT READ: the report gives the rate, the match gets no reading, and the arm is not played again without a new decision. A match incomplete for any other reason gets no reading and is reposted alone under a new job id after its cause is found. Exactly one reading of a complete match, in this precedence, compared as the line carries them (lo in integer ten-thousandths, Elo in integer tenths): SHOWN: lo above 0.5 and elo at least +15; SMALL GAIN: lo above 0.5 and elo below +15; INCONCLUSIVE AT 1,200: lo at most 0.5 and eloHi at least +15; NOT SHOWN: lo at most 0.5 and eloHi below +15. Beside each reading, deciding nothing: indistinguishable (the Elo interval holds 0), a measured loss (wholly below), a measured gain (wholly above). Each arm is read on its own match; the three are never pooled and no arm is read against another. ... A SHOWN or SMALL GAIN arm is a candidate for one 4,800-game confirmation against the live seat on deals no match has played (a host name of its own), under D519's readings, as its own job under its own decision, before any live-seat question goes to the owner; nothing is adopted from 1,200 games. An INCONCLUSIVE AT 1,200 is information and is not confirmed by this decision. A NOT SHOWN arm is not played again. No reading changes the live seat (D509)." The arms: search-v3-declined (795daea97aaa), search-v3-instant (25ee7e76b741), search-v3-lands (e0b09eb7b014), each A against B = search-v2-no-b (59505e241363). The cost and the exposure are reported and change no reading
followup: morning-read
est: ~8 h at 7 workers (an estimate; range 7-9.5 h), 11.25 h at worst (the three stops and the pilot). From this host at 7 workers, alone: a 1,200-game match against the search's family takes about 0.47 h + 0.0436 h x both sides' search seconds a game (D537 point 11's fit; residual sd 0.15 h). B searches about 19.3 s a game (J211). declined ~22.8 s: ~2.3 h; instant ~24.4 s: ~2.4 h; lands ~24.8 s: ~2.4 h (the lane's pilot's A/B search-time ratios, x1.18, x1.26 and x1.29, applied to B's 19.3 s; D540's Verification). Pilot ~0.75 h (the build, the tests, three 4-game ladder matches and three 4-game recorded runs). The matches stop themselves at --hours 3.5 each, under the job's 12 h timeout; a match that reaches its own stop reports complete: false and gets no reading. Memory pressure holding the night at 5 or 6 workers adds about a fifth
resumable: no
timeout: 12h
clean: var/j214 var/j214-tools var/j214-declined var/j214-instant var/j214-lands var/ai-ladder-pilot/J214-declined var/ai-ladder-pilot/J214-instant var/ai-ladder-pilot/J214-lands var/ai-ladder/match-J214-declined.json var/ai-ladder/match-J214-instant.json var/ai-ladder/match-J214-lands.json var/ai-bench/j214-pilot-rec-declined var/ai-bench/j214-pilot-rec-instant var/ai-bench/j214-pilot-rec-lands
progress: metric j214_games games of 3600
metrics: j214_games = sh: node -e 'const fs=require("fs");const C={declined:"search-v3-declined",instant:"search-v3-instant",lands:"search-v3-lands"};let n=0;for(const k in C){const f="var/j214-"+k+"/results";for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\""+C[k]+"\"")&&l.includes("\"b\":\"search-v2-no-b\""))n++}console.log(n)'
metrics: j214_err = sh: node -e 'const fs=require("fs");const C={declined:"search-v3-declined",instant:"search-v3-instant",lands:"search-v3-lands"};let n=0;for(const k in C){const f="var/j214-"+k+"/results";for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\""+C[k]+"\"")&&l.includes("\"b\":\"search-v2-no-b\"")&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++}console.log(n)'
metrics: mde = sh: cat var/ai-ladder/match-J214-declined.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: min = sh: cat var/ai-ladder/match-J214-instant.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: mla = sh: cat var/ai-ladder/match-J214-lands.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: v = sh: cat var/j214/v.json 2>/dev/null || echo '{"written":0,"completeCount":0,"readings":0,"notRead":-1,"notPlayed":-1,"incomplete":-1,"candidates":-1,"liveSeatChanged":1,"declined":{"complete":0,"incomplete":1,"notRead":0,"notPlayed":0,"shown":0,"smallGain":0,"inconclusive1200":0,"notShown":0,"candidate":0,"indistinguishable":0,"measuredLoss":0,"measuredGain":0,"liveSeatChanged":1},"instant":{"complete":0,"incomplete":1,"notRead":0,"notPlayed":0,"shown":0,"smallGain":0,"inconclusive1200":0,"notShown":0,"candidate":0,"indistinguishable":0,"measuredLoss":0,"measuredGain":0,"liveSeatChanged":1},"lands":{"complete":0,"incomplete":1,"notRead":0,"notPlayed":0,"shown":0,"smallGain":0,"inconclusive1200":0,"notShown":0,"candidate":0,"indistinguishable":0,"measuredLoss":0,"measuredGain":0,"liveSeatChanged":1}}'
headline: mde.played, mde.elo, mde.eloLo, mde.eloHi, min.played, min.elo, min.eloLo, min.eloHi, mla.played, mla.elo, mla.eloLo, mla.eloHi, v.declined.shown, v.declined.smallGain, v.declined.inconclusive1200, v.declined.notShown, v.declined.notRead, v.declined.notPlayed, v.instant.shown, v.instant.smallGain, v.instant.inconclusive1200, v.instant.notShown, v.instant.notRead, v.instant.notPlayed, v.lands.shown, v.lands.smallGain, v.lands.inconclusive1200, v.lands.notShown, v.lands.notRead, v.lands.notPlayed, v.declined.windowsPerGame, v.instant.windowsPerGame, v.lands.windowsPerGame, v.candidates, v.notRead

**Why this job** (D540; D537 point 8). The search's knobs are tapped out: more clock bought nothing (J194, J195,
J198), blocks are worth about +2 Elo (J211), a rollout one turn deeper bought nothing at the same clock (J212). The
search has only ever considered its own main phases on an empty stack, never the land drop, and only the plays
Forge's per-card AI accepts plus untargeted spells it declines. J212's recording counted what it never looks at.
This night plays three widenings, one key each, against the live seat.

**What it does not do.** It does not change the live seat, propose a change, tune anything, pool the three matches
or read one arm against another. It does not read any outcome by deck or by deal.

**What is played.** Three `ai-ladder.sh match` runs of 1,200 games each: 600 mirrored pairs in 150 batches of 8 games
on the confirm deck set, with no stopping rule on the score (D398). B is `search-v2-no-b` (`59505e241363`,
`Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1`, search-v3)
in all three. A is, in order:
1. `search-v3-declined` (`795daea97aaa`): B's config plus `,declined=1`.
2. `search-v3-instant` (`25ee7e76b741`): B's config plus `,instant=1`.
3. `search-v3-lands` (`e0b09eb7b014`): B's config plus `,lands=1`.
Every match runs at `--game-timeout 900`.

**The deals** (D540 point 7). Each match runs with `--host j214` in a ladder folder of its own, `var/j214-<arm>`,
emptied by its own block before it starts, so each takes blocks 416,900,000-416,900,149 (`hostBase('j214')` is
416,000,000), on a first run and on a retry after a memory stop; no ladder row in the lab checkout's `var/` was on
base 416 on 2026-11-11. The block reader checks the range after each match and the verdict refuses any other.

**The readings** (D540 point 8): D519's four, at 1,200 games, exactly one per complete match, or NOT READ when the
match is complete in every other part (B showing no `search.p.declined.`, `search.p.instant.` or `search.p.lands.`
counter above 0 among them) but the arm's key fired in fewer than 0.25 `search.p.<key>.windows` a game played (300
at 1,200 games): "a match under that rate". A NOT READ match gets no reading, its rate is reported, and the arm is
not played again without a new decision. A match incomplete for any other reason gets neither a reading nor NOT READ
and is reposted alone under a new job id after its cause is found (below); a B that shows any such counter above 0
is one of those reasons (the keys-off path fired: a code fault, not the arm's exposure), whatever A's rate. Beside
each reading, deciding nothing: indistinguishable, a measured loss or a measured gain.

**Beside each reading, as description only** (D540 point 10): each side's searched decisions by kind and ms a
searched decision; search seconds a game; the arm's exposure a game (its windows, its candidates a window, its
changes, and `search.p.<key>.retry` a game; for `declined` the aimed spells listed and dropped for no legal target);
priority overrides by direction a priority decision; the land windows left to Forge a game. On an INCOMPLETE match
the exposure is printed too, as description.

**When it runs.** Alone (`alone: yes`, D521): search players think against a wall clock.

## Pilot
About 45 minutes:
- the pin is merged;
- the build (the lint and its self-test, javac, the decision self-test with D540's 29 new checks: 472 on the lane), the ai-bench
  self-test (its D540 lines, each saying what it saw; the instant-install lines are the D540 point 5 evidence and
  are printed into `var/j214-tools/d540-selftest.txt` whatever they say) and the ladder registry test (which holds
  the three arms' params, seat configs and hashes);
- `ai-ladder.sh list` resolves the five players (the anchor, search-v2-no-b, the three arms) at their registered
  hashes, checked as strings, and each arm's seat config is exactly B's plus its key;
- the code, by content: against D539's merge the only files changed under `bridge/src`, `tools/ai-ladder` and
  `tools/ai-bench` are D540's five under `bridge/src` (`DecisionSelfTest.java` by added lines only),
  `tools/ai-ladder/players.json` (4 lines in, 1 out: three players appended), `tools/ai-ladder/kinds.ts` and
  `tools/ai-bench/AiBench.java` (added lines only), and git answered;
- the `j214` host's seed base is 416,000,000 and an empty folder's first match block 416,900,000;
- the verdict script, the exposure reader (below), the rollout and block readers (J212's `rollouts.cjs` and
  `seeds.cjs`, names changed), the recording reader (J212's `records.cjs`, widened) and the arm gate written, and each
  tested on synthetic files;
- three 4-game ladder matches, one per arm against search-v2-no-b, one batch pair, one worker, each in its own pilot
  folder under `--host j214-pilot`: both sides search priority and attacks and no block, the match line names the
  arm and B at their hashes, the batch lines carry the two seat configs exactly, and B's D540 counters are all 0
  (a D540 counter in B stops the night);
- three recorded runs of 4 games each against Forge Default (the confirm set's first deck pair, two workers), one per
  arm, whose decision records give the arm's searched priority decisions by window (own main, land, instant-speed),
  their ms by candidate count, and, with the batch counters, the key's windows and candidates: printed, and checked
  only for what must hold (no searched window outside the arm's own: `declined` and `lands` none outside the seat's
  own main phase with an empty stack, `instant` none on a non-empty stack);
- **the arm gate** (D540 point 11): an arm is played that night only if its key's `search.p.<key>.windows`, summed
  over its 4 ladder games and its 4 recorded games, is above 0, none of its 8 games ended in an error or a timeout,
  and its `search.p.<key>.retry` is at most 2 a game. `var/j214-tools/arms.json` lists the arms that passed and, for
  each that did not, the condition it failed; a match step whose arm is not listed writes
  `var/ai-ladder/match-J214-<arm>.json` as `{"notPlayed": true, "reason": ...}` (with the match metrics' zeros
  beside them, so every metric reads a number) and plays nothing, and the report says so. The pilot itself fails
  only on the checks below (the build, the tests, the players, the code, the readers' self-tests, the pilot matches'
  names, hashes, seat configs and kinds, B's counters, and a searched window outside the arm's own).
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j214-merged.txt || echo 0 > var/j214-merged.txt
cat var/j214-merged.txt
rc=0; ./bridge/build.sh > var/j214-build.txt 2>&1 || rc=$?
cat var/j214-build.txt
# the build's decision self-test: its line, with 0 failures (443 at D539's merge; D540's searchCandidates adds 29: 472)
node -e 'const fs=require("fs");const t=fs.readFileSync("var/j214-build.txt","utf8");const m=/^decision selftest: (\d+) check\(s\), (\d+) failure\(s\)$/m.exec(t);const r={ok:m&&m[2]==="0"?1:0,checks:m?Number(m[1]):0,failures:m?Number(m[2]):-1};fs.writeFileSync("var/j214-decision-selftest.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
test "$rc" -eq 0
mkdir -p var/j214-tools
# the ai-bench self-test; its D540 lines (each saying what it saw; the d540-instant-install lines are D540 point 5's
# evidence) are kept in d540-selftest.txt whatever they say, and then the self-test must have passed
brc=0; ./tools/ai-bench.sh --selftest > var/j214-tools/bench-selftest.txt 2>&1 || brc=$?
grep -iE 'd540' var/j214-tools/bench-selftest.txt > var/j214-tools/d540-selftest.txt || true
cat var/j214-tools/d540-selftest.txt
tail -3 var/j214-tools/bench-selftest.txt
test "$brc" -eq 0
node --test web/test/ai-ladder.test.ts
```
```bash
# the five players resolve at their registered hashes (compared as strings); each arm's seat config is exactly B's
# plus its one key (J212's players check, names changed)
mkdir -p var/j214-tools
./tools/ai-ladder.sh list > var/j214-tools/players.txt
grep -E '^(forge-default|search-v2-no-b|search-v3-declined|search-v3-instant|search-v3-lands) ' var/j214-tools/players.txt || true
node - <<'J214EOF'
// J214's pilot: the players resolve, at D540's hashes (compared as strings), and each arm's seat config is
// search-v2-no-b's (search-v3, the live seat since D539) with exactly one key appended (D540 point 6).
const fs = require('fs');
const L = fs.readFileSync('var/j214-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const V3 = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1';
const WANT = {
  'forge-default': { hash: '3ed453ffef1c', cfg: 'Default', kind: 'forge' },
  'search-v2-no-b': { hash: '59505e241363', cfg: V3, kind: 'search' },
  'search-v3-declined': { hash: '795daea97aaa', cfg: V3 + ',declined=1', kind: 'search' },
  'search-v3-instant': { hash: '25ee7e76b741', cfg: V3 + ',instant=1', kind: 'search' },
  'search-v3-lands': { hash: 'e0b09eb7b014', cfg: V3 + ',lands=1', kind: 'search' },
};
// D540 point 6's seat configs, written out, so the concatenation above cannot drift with them
const LITERAL = {
  'search-v2-no-b': 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1',
  'search-v3-declined': 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1',
  'search-v3-instant': 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,instant=1',
  'search-v3-lands': 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,lands=1',
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
fs.writeFileSync('var/j214-tools/players.json', JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J214EOF
# the j214 host's seed base (D540 point 7): hostBase('j214') is 416,000,000, so an empty folder's first match block is
# 416,900,000; the pilot's host name has another base
cat > var/j214-tools/base.mjs <<'J214EOF'
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const S = await import(pathToFileURL(path.resolve('tools/ai-ladder/schedule.ts')).href);
const own = S.hostBase('j214'), pilot = S.hostBase('j214-pilot');
const first = S.nextBseed(own + 900000, new Set());
const r = { own, first, pilot, ok: own === 416000000 && first === 416900000 && pilot !== own ? 1 : 0 };
fs.mkdirSync('var/j214-tools', { recursive: true });
fs.writeFileSync('var/j214-tools/base.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J214EOF
node var/j214-tools/base.mjs
```
```bash
# the code since D539's merge under the paths a match runs: exactly D540's five files under bridge/src
# (DecisionSelfTest.java by added lines only), players.json (+4 -1: three players appended), kinds.ts and
# AiBench.java (added lines only)
mkdir -p var/j214-tools
D539=bf9fe5f175a4111ad34a979edab2466130c1c896
git diff --name-only "$D539" HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j214-tools/src-diff.txt && echo 0 > var/j214-tools/src-diff.rc || echo 1 > var/j214-tools/src-diff.rc
git diff --numstat "$D539" HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j214-tools/src-numstat.txt && echo 0 > var/j214-tools/src-numstat.rc || echo 1 > var/j214-tools/src-numstat.rc
node - <<'J214EOF'
const fs = require('fs');
const files = fs.readFileSync('var/j214-tools/src-diff.txt', 'utf8').split('\n').filter(Boolean).sort();
const rc = Number(fs.readFileSync('var/j214-tools/src-diff.rc', 'utf8').trim()) === 0 && Number(fs.readFileSync('var/j214-tools/src-numstat.rc', 'utf8').trim()) === 0 ? 0 : 1;
const num = {};
for (const l of fs.readFileSync('var/j214-tools/src-numstat.txt', 'utf8').split('\n').filter(Boolean)) {
  const [a, d, f] = l.split('\t');
  num[f] = { add: Number(a), del: Number(d) };
}
const SRC = ['bridge/src/mtgtable/ai/DecisionSelfTest.java', 'bridge/src/mtgtable/ai/Explorer.java',
  'bridge/src/mtgtable/ai/PolicyControllerAi.java', 'bridge/src/mtgtable/ai/SearchConfig.java',
  'bridge/src/mtgtable/ai/SearchPolicy.java'];
const P = 'tools/ai-ladder/players.json', K = 'tools/ai-ladder/kinds.ts', A = 'tools/ai-bench/AiBench.java', D = SRC[0];
const want = [...SRC, P, K, A].sort();
const at = (f, x) => (num[f] ? num[f][x] : -1);
const r = { files, count: files.length, rc,
  exact: JSON.stringify(files) === JSON.stringify(want) ? 1 : 0,
  srcExact: JSON.stringify(files.filter((f) => f.startsWith('bridge/src/'))) === JSON.stringify([...SRC].sort()) ? 1 : 0,
  playersAdd: at(P, 'add'), playersDel: at(P, 'del'), kindsAdd: at(K, 'add'), kindsDel: at(K, 'del'),
  benchAdd: at(A, 'add'), benchDel: at(A, 'del'), dstAdd: at(D, 'add'), dstDel: at(D, 'del') };
fs.writeFileSync('var/j214-tools/src-diff.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J214EOF
```
```bash
# the exposure reader: for one match folder, the summed D540 counters of each side from the batch lines' aStats and
# bStats (config A is the match's first player), and the games
mkdir -p var/j214-tools
cat > var/j214-tools/exposure.cjs <<'J214EOF'
// J214 (D540 point 8): an arm's exposure. Sums, for each side of one match, every batch line's counters whose key
// starts with search.p.declined., search.p.instant. or search.p.lands., plus search.p.considered, search.a.considered,
// search.p.skipLand and search.b.considered. `fired` is 1 when A's search.p.<key>.windows is above 0; `exposed` 1 when
// it is at least 0.25 a game played (D540 point 8: 300 at 1,200 games; compared in integers, windows x 4 >= games);
// `bClean` 1 when no D540 counter of B's is above 0 (`bD540` counts those that are); `kindsOk` 1 when both sides
// searched priority and attacks and neither searched a block. A game is a batch line.
// usage: node exposure.cjs <ladder dir> <match.json> <key> <out.json>
const fs = require('fs');
const [dir, matchFile, key, out] = process.argv.slice(2);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : '';
const bdir = `${dir}/batches/${run}`;
const D540 = /^search\.p\.(declined|instant|lands)\./;
const sum = { a: {}, b: {} };
let lines = 0;
for (const f of run && fs.existsSync(bdir) ? fs.readdirSync(bdir).filter((x) => /^b\d+\.jsonl$/.test(x)) : []) {
  for (const line of fs.readFileSync(`${bdir}/${f}`, 'utf8').split('\n')) {
    let l; try { l = JSON.parse(line); } catch { continue; }
    lines++;
    for (const [k, st] of [['a', l.aStats], ['b', l.bStats]]) {
      const c = (st && st.counts) || {};
      for (const [x, v] of Object.entries(c)) {
        if (typeof v === 'number' && (D540.test(x) || x === 'search.p.considered' || x === 'search.a.considered' || x === 'search.p.skipLand' || x === 'search.b.considered')) {
          sum[k][x] = (sum[k][x] || 0) + v;
        }
      }
    }
  }
}
const games = lines;
const A = (x) => sum.a[`search.p.${key}.${x}`] || 0;
const w = A('windows');
const bD540 = Object.entries(sum.b).filter(([x, v]) => D540.test(x) && v > 0).length;
const pos = (x) => (x || 0) > 0;
const r3 = (x) => Math.round(x * 1000) / 1000;
const r = { key, run, matchPlayed: m && typeof m.played === 'number' ? m.played : null, lines, games, a: sum.a, b: sum.b,
  windows: w, cands: A('cands'), changed: A('changed'), retry: A('retry'), listed: A('listed'), noTarget: A('noTarget'),
  fired: w > 0 ? 1 : 0, exposed: games > 0 && w * 4 >= games ? 1 : 0, bClean: bD540 === 0 ? 1 : 0, bD540,
  kindsOk: pos(sum.a['search.p.considered']) && pos(sum.b['search.p.considered'])
    && pos(sum.a['search.a.considered']) && pos(sum.b['search.a.considered'])
    && (sum.a['search.b.considered'] || 0) === 0 && (sum.b['search.b.considered'] || 0) === 0 ? 1 : 0,
  windowsPerGame: games ? r3(w / games) : null,
  candsPerWindow: w ? Math.round((A('cands') / w) * 100) / 100 : null,
  changedPerGame: games ? r3(A('changed') / games) : null,
  retryPerGame: games ? r3(A('retry') / games) : null,
  listedPerGame: games ? r3(A('listed') / games) : null,
  noTargetPerGame: games ? r3(A('noTarget') / games) : null };
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J214EOF
# its self-test, on synthetic batch folders of 8 games: (1) A's declined counters at 1 window a game and B clean but for
# a D540 counter at 0 (exposed 1, bClean 1, kindsOk 1); (2) B with a D540 counter above 0 (bClean 0); (3) 1 window in
# 8 games (fired 1, exposed 0) and 2 in 8, exactly 0.25 a game (exposed 1); (4) one side with no attack search
# (kindsOk 0). Writes var/j214-tools/exposure-selftest.json {ok, cases, passed}
rm -rf var/j214-tools/exposure-selftest
node - <<'J214EOF'
const fs = require('fs');
const { execFileSync } = require('child_process');
const S = 'var/j214-tools/exposure-selftest';
const line = (a, b) => JSON.stringify({ a: 'X', b: 'Y', aStats: { counts: a }, bStats: { counts: b } });
const base = () => ({ 'search.p.considered': 9, 'search.a.considered': 2, 'search.p.skipLand': 3 });
const mk = (name, rows) => {
  const d = `${S}/${name}`;
  fs.mkdirSync(`${d}/batches/run-${name}`, { recursive: true });
  fs.writeFileSync(`${d}/match.json`, JSON.stringify({ id: `j214:run-${name}`, played: rows.length }));
  fs.writeFileSync(`${d}/batches/run-${name}/b0.jsonl`, rows.slice(0, 4).map(([a, b]) => line(a, b)).join('\n') + '\n');
  fs.writeFileSync(`${d}/batches/run-${name}/b1.jsonl`, rows.slice(4).map(([a, b]) => line(a, b)).join('\n') + '\n');
  execFileSync(process.execPath, ['var/j214-tools/exposure.cjs', d, `${d}/match.json`, 'declined', `${d}/out.json`], { stdio: 'ignore' });
  return JSON.parse(fs.readFileSync(`${d}/out.json`, 'utf8'));
};
const rows = (f) => Array.from({ length: 8 }, (_, i) => f(i));
const A1 = () => ({ ...base(), 'search.p.declined.windows': 1, 'search.p.declined.cands': 2, 'search.p.declined.listed': 2, 'search.p.declined.noTarget': 1 });
const B0 = () => ({ ...base(), 'search.p.declined.listed': 0 });
const c1 = mk('c1', rows(() => [A1(), B0()]));
const c2 = mk('c2', rows((i) => [A1(), i === 3 ? { ...B0(), 'search.p.lands.windows': 1 } : B0()]));
const c3a = mk('c3a', rows((i) => [i === 5 ? A1() : base(), B0()]));
const c3b = mk('c3b', rows((i) => [i === 2 || i === 6 ? A1() : base(), B0()]));
const noA = () => { const x = A1(); delete x['search.a.considered']; return x; };
const c4 = mk('c4', rows(() => [noA(), B0()]));
const cases = [
  ['1 window a game, B clean (a D540 counter at 0 is clean): exposed, clean, both kinds', c1.games === 8 && c1.lines === 8 && c1.windows === 8 && c1.windowsPerGame === 1 && c1.cands === 16 && c1.candsPerWindow === 2 && c1.listed === 16 && c1.noTarget === 8 && c1.fired === 1 && c1.exposed === 1 && c1.bClean === 1 && c1.bD540 === 0 && c1.kindsOk === 1],
  ['B with search.p.lands.windows 1 in one game: not clean', c2.bClean === 0 && c2.bD540 === 1 && c2.exposed === 1 && c2.kindsOk === 1],
  ['1 window in 8 games fired but is under 0.25 a game; 2 in 8 is exactly 0.25 and exposed', c3a.windows === 1 && c3a.fired === 1 && c3a.exposed === 0 && c3b.windows === 2 && c3b.exposed === 1 && c3b.windowsPerGame === 0.25],
  ['A with no attack search: kindsOk 0', c4.kindsOk === 0 && c4.exposed === 1 && c4.bClean === 1],
];
let passed = 0;
for (const [what, ok] of cases) { console.error(`${ok ? 'ok  ' : 'FAIL'} ${what}`); passed += ok ? 1 : 0; }
const r = { ok: passed === cases.length ? 1 : 0, cases: cases.length, passed };
fs.writeFileSync('var/j214-tools/exposure-selftest.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J214EOF
```
```bash
mkdir -p var/j214-tools
cat > var/j214-tools/verdict.mjs <<'J214EOF'
// J214's reading, pre-registered in D540 (points 6 to 10, written 2026-11-11 before any J214 game; the job's rule:
// line; D398's fixed match; D519's four readings at 1,200 games, as D537 point 6 wrote them, with the names, the
// blocks, B and the kinds searched changed and D540's exposure condition added).
// usage: node verdict.mjs <match dir> <j214 dir> <out.json>        node verdict.mjs --selftest <scratch dir>
//   <match dir>/match-J214-<k>.json is arm k's match line (or the arm step's {"notPlayed": true, "reason": ...}),
//   <j214 dir>/seeds-<k>.json its block reader's file, rollouts-<k>.json its rollout reader's and exposure-<k>.json
//   its exposure reader's, for k in declined, instant, lands.
// THE MATCHES: each arm (config A) against search-v2-no-b (config B, search-v3, the live seat since D539), 1,200
//   games, 600 mirrored pairs, the confirm set, no stopping rule, each under --host j214 in a ladder folder of its own
//   (var/j214-<k>, emptied by its step), so on deal blocks 416,900,000-416,900,149.
// EXACTLY ONE OUTCOME per arm, in this precedence:
//   NOT PLAYED   the pilot's arm gate (D540 point 11) kept the arm out: its match file says notPlayed.
//   INCOMPLETE   any part of D540 point 8's completeness but the exposure fails: the line does not name A and B in
//                that order at their registered hashes, or does not say complete: true, or played fewer than 1,200
//                games, or errors + timeouts > 60 (one in 20), or lacks score, lo, elo, eloLo or eloHi, or the block
//                reader did not find the match's 1,200 games on exactly the 150 blocks 416,900,000-416,900,149 with no
//                other match's game in the folder, or a batch line did not carry A's and B's seat configs exactly,
//                or a side did not search priority and attacks or searched a block, or the exposure reader did not
//                read this match's 1,200 batch lines, or B's batch counters show any search.p.declined.,
//                search.p.instant. or search.p.lands. counter above 0 (the keys-off path fired: a code fault),
//                whatever A's rate. No reading and not NOT READ: the arm is owed a repost alone under a new job id
//                after the cause is found. A match cut short and under the rate is INCOMPLETE; its rate and B's
//                D540 counters are still reported, as description.
//   NOT READ     every other part holds, B clean among them, but A's search.p.<key>.windows summed over the match
//                is under 0.25 a game played (windows x 4 < played: under 300 at 1,200), D540 point 8's "a match
//                under that rate". No reading; the rate is reported; the arm is not played again without a new
//                decision.
//   one of D519's four readings, for a COMPLETE match, compared as the line carries them, lo in integer
//   ten-thousandths and Elo in integer tenths:
//     SHOWN                  lo > 0.5 and elo >= 15
//     SMALL GAIN             lo > 0.5 and elo < 15
//     INCONCLUSIVE AT 1,200  lo <= 0.5 and eloHi >= 15
//     NOT SHOWN              lo <= 0.5 and eloHi < 15
//   SHOWN and SMALL GAIN make the arm a CANDIDATE: one 4,800-game confirmation against the live seat on deals no match
//   has played, as its own job under its own decision, before any live-seat question goes to the owner. Nothing is
//   adopted from 1,200 games and nothing here changes the live seat (liveSeatChanged is 0 in every outcome).
// DESCRIPTIVE, deciding nothing, exactly one per complete match: "a measured loss" (eloHi < 0), "a measured gain"
//   (eloLo > 0), "indistinguishable" otherwise (an end of exactly 0 holds 0).
// BESIDE EVERY OUTCOME, never changing one (D540 point 10): the arm's exposure a game (its windows, its candidates a
//   window, its changes, search.p.<key>.retry a game; for declined the aimed spells listed and dropped), each side's
//   searched decisions by kind and ms a searched decision, search seconds a game, the priority overrides by direction
//   a priority decision and the land windows left to Forge a game.
// THE NIGHT'S PATTERN (D540 point 13, descriptions of what each outcome leads to, never a rule): declinedGain,
//   instantGain and landsGain are the three candidate flags; allNotShown is all three complete and NOT SHOWN.
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 1200;
export const BAR = GAMES / 20;
export const FIRST = 416900000;
export const BLOCKS = 150;
export const LAST = FIRST + BLOCKS - 1;
export const B = 'search-v2-no-b';
export const BH = '59505e241363';
export const BCFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1';
export const ARMS = [
  { key: 'declined', name: 'search-v3-declined', hash: '795daea97aaa',
    cfg: 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1' },
  { key: 'instant', name: 'search-v3-instant', hash: '25ee7e76b741',
    cfg: 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,instant=1' },
  { key: 'lands', name: 'search-v3-lands', hash: 'e0b09eb7b014',
    cfg: 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,lands=1' },
];

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const kinds = (t) => ({ p: num(t?.byKind?.p?.searched) ?? 0, a: num(t?.byKind?.a?.searched) ?? 0, b: num(t?.byKind?.b?.searched) ?? 0 });
const secPerGame = (t, played) => {
  const ms = num(t?.msPerDecision), n = num(t?.searched), g = num(played);
  return ms !== null && n !== null && g !== null && g > 0 ? Math.round((ms * n) / g) / 1000 : null;
};
const r3 = (x) => Math.round(x * 1000) / 1000;
const per = (x, n) => (num(x) !== null && num(n) !== null && n > 0 ? r3(x / n) : null);

export function readArm(arm, m, bs, ro, ex) {
  const notPlayed = m !== null && m.notPlayed === true ? 1 : 0;
  const names = !notPlayed && m !== null && m.a === arm.name && m.b === B ? 1 : 0;
  const hashes = !notPlayed && m !== null && String(m.ah) === arm.hash && String(m.bh) === BH ? 1 : 0;
  const ak = kinds(m?.aSearch), bk = kinds(m?.bSearch);
  const kindsOk = !notPlayed && m !== null && ak.p > 0 && ak.a > 0 && ak.b === 0 && bk.p > 0 && bk.a > 0 && bk.b === 0 ? 1 : 0;
  const purpose = typeof m?.id === 'string' ? `match:${m.id}` : null;
  const run = typeof m?.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : null;
  const blocks = bs !== null && purpose !== null && bs.purpose === purpose && bs.games === GAMES && bs.blocks === BLOCKS
    && bs.min === FIRST && bs.max === LAST && bs.otherGames === 0 ? 1 : 0;
  const cfgs = ro !== null && typeof ro.lines === 'number' && ro.lines === GAMES && ro.cfgExact === GAMES
    && ro.aCfg === arm.cfg && ro.bCfg === BCFG ? 1 : 0;
  // the exposure reader's file is this match's when it names the match's run; it is the whole match when it read
  // all 1,200 batch lines
  const exThis = ex !== null && run !== null && ex.run === run && num(ex.windows) !== null && num(ex.games) !== null;
  const exposureRead = exThis && ex.games === GAMES && (ex.bClean === 0 || ex.bClean === 1) ? 1 : 0;
  const s = {
    key: arm.key, a: arm.name, b: B, match: m === null ? 0 : 1, names, hashes, kindsOk, blocks, cfgs, exposureRead,
    id: m?.id ?? null, ah: m?.ah ?? null, bh: m?.bh ?? null, played: num(m?.played) ?? 0, planned: num(m?.planned),
    errors: num(m?.errors), timeouts: num(m?.timeouts), pairs: num(m?.pairs),
    score: num(m?.score), lo: num(m?.lo), hi: num(m?.hi), elo: num(m?.elo), eloLo: num(m?.eloLo), eloHi: num(m?.eloHi),
    aSearched: num(m?.aSearch?.searched) ?? 0, bSearched: num(m?.bSearch?.searched) ?? 0,
    aP: ak.p, aA: ak.a, aB: ak.b, bP: bk.p, bA: bk.a, bB: bk.b,
    aMs: num(m?.aSearch?.msPerDecision), bMs: num(m?.bSearch?.msPerDecision),
    aMsP: num(m?.aSearch?.msMean?.p), aMsA: num(m?.aSearch?.msMean?.a),
    bMsP: num(m?.bSearch?.msMean?.p), bMsA: num(m?.bSearch?.msMean?.a),
  };
  const parts = !notPlayed && names === 1 && hashes === 1 && m.complete === true && s.played === GAMES
    && (s.errors ?? 0) + (s.timeouts ?? 0) <= BAR && s.score !== null && s.lo !== null && s.elo !== null && s.eloLo !== null
    && s.eloHi !== null && blocks === 1 && cfgs === 1 && kindsOk === 1 && exposureRead === 1 && ex.bClean === 1;
  // the exposure, as description for every match it was read on (a cut-short one included), and as D540 point 8's
  // condition for a match complete in every other part
  const E = exThis ? ex : null, Ea = E && E.a ? E.a : {};
  const cnt = (x) => (E ? num(Ea[`search.p.${arm.key}.${x}`]) ?? 0 : null);
  const g = E ? E.games : null;
  const exposure = {
    windows: E ? E.windows : null, games: g, windowsPerGame: per(E ? E.windows : null, g),
    cands: cnt('cands'), candsPerWindow: E && E.windows > 0 ? Math.round((cnt('cands') / E.windows) * 100) / 100 : null,
    changed: cnt('changed'), changedPerGame: per(cnt('changed'), g), retry: cnt('retry'), retryPerGame: per(cnt('retry'), g),
    listed: arm.key === 'declined' ? cnt('listed') : null, listedPerGame: arm.key === 'declined' ? per(cnt('listed'), g) : null,
    noTarget: arm.key === 'declined' ? cnt('noTarget') : null, noTargetPerGame: arm.key === 'declined' ? per(cnt('noTarget'), g) : null,
    bD540: E ? num(E.bD540) ?? Object.entries(E.b || {}).filter(([x, v]) => /^search\.p\.(declined|instant|lands)\./.test(x) && v > 0).length : null,
  };
  // at the rate: windows x 4 >= games played, in integers (300 at 1,200); both flags are read on any match the
  // exposure was read on; bClean is a completeness part (above), the rate decides only for a match complete in every
  // other part
  const exposed = E && s.played > 0 && exposure.windows * 4 >= s.played ? 1 : 0;
  const bClean = E && E.bClean === 1 ? 1 : 0;
  const complete = parts && exposed === 1 ? 1 : 0;
  const notRead = parts && complete === 0 ? 1 : 0;
  const incomplete = notPlayed === 0 && !parts ? 1 : 0;
  const ok = complete === 1;
  const LO = ok ? Math.round(s.lo * 10000) : 0, EL10 = ok ? Math.round(s.eloLo * 10) : 0;
  const E10 = ok ? Math.round(s.elo * 10) : 0, EH = ok ? Math.round(s.eloHi * 10) : 0;
  const shown = ok && LO > 5000 && E10 >= 150 ? 1 : 0;
  const smallGain = ok && LO > 5000 && E10 < 150 ? 1 : 0;
  const inconclusive1200 = ok && LO <= 5000 && EH >= 150 ? 1 : 0;
  const notShown = ok && LO <= 5000 && EH < 150 ? 1 : 0;
  const candidate = shown || smallGain ? 1 : 0;
  const measuredLoss = ok && EH < 0 ? 1 : 0;
  const measuredGain = ok && EL10 > 0 ? 1 : 0;
  const indistinguishable = ok && measuredLoss === 0 && measuredGain === 0 ? 1 : 0;
  const reading = !ok ? null : shown ? 'SHOWN' : smallGain ? 'SMALL GAIN' : inconclusive1200 ? 'INCONCLUSIVE AT 1,200' : 'NOT SHOWN';
  const outcome = notPlayed ? 'NOT PLAYED' : incomplete ? 'INCOMPLETE' : notRead ? 'NOT READ' : reading;
  const word = !ok ? null : measuredLoss ? 'a measured loss' : measuredGain ? 'a measured gain' : 'indistinguishable';
  const aSecPerGame = notPlayed ? null : secPerGame(m?.aSearch, m?.played), bSecPerGame = notPlayed ? null : secPerGame(m?.bSearch, m?.played);
  const costRatio = aSecPerGame !== null && bSecPerGame !== null && bSecPerGame > 0 ? Math.round((aSecPerGame / bSecPerGame) * 10000) / 10000 : null;
  const r = ro ?? {};
  const desc = {
    aFromPass: num(r.aFromPass), aToOther: num(r.aToOther), aToPass: num(r.aToPass),
    bFromPass: num(r.bFromPass), bToOther: num(r.bToOther), bToPass: num(r.bToPass),
    aSkipLand: num(r.aSkipLand), bSkipLand: num(r.bSkipLand),
    aRolloutsPerDecision: num(r.aRolloutsPerDecision), bRolloutsPerDecision: num(r.bRolloutsPerDecision),
    aShortShare: num(r.aShortShare), bShortShare: num(r.bShortShare),
  };
  const expo = `its key's windows ${exposure.windows ?? '-'} over ${exposure.games ?? '-'} games (${exposure.windowsPerGame ?? '-'} a game; 0.25 a game is the rate), ${exposure.candsPerWindow ?? '-'} candidates a window, ${exposure.changed ?? '-'} changes, ${exposure.retryPerGame ?? '-'} retries a game${arm.key === 'declined' ? `, aimed spells listed ${exposure.listed ?? '-'} and dropped ${exposure.noTarget ?? '-'}` : ''}`;
  const cost = costRatio === null ? 'no cost read'
    : `${aSecPerGame} against ${bSecPerGame} search seconds a game (x${costRatio}), ${s.aMs} against ${s.bMs} ms a searched decision`;
  const why = s.match === 0 ? 'NO MATCH' : names === 0 ? 'NOT THIS MATCH (names)' : hashes === 0 ? 'NOT THESE PLAYERS (hashes)'
    : m.complete !== true ? 'STOPPED (complete: false)' : s.played !== GAMES ? `NOT ALL 1,200 GAMES (${s.played})`
    : (s.errors ?? 0) + (s.timeouts ?? 0) > BAR ? 'ERRORS AND TIMEOUTS OVER 60'
    : [s.score, s.lo, s.elo, s.eloLo, s.eloHi].some((x) => x === null) ? 'A NUMBER MISSING FROM THE LINE'
    : cfgs === 0 ? 'NOT THESE SEAT CONFIGS' : blocks === 0 ? 'NOT THE REGISTERED DEAL BLOCKS'
    : kindsOk === 0 ? 'A SIDE DID NOT SEARCH PRIORITY AND ATTACKS, OR SEARCHED A BLOCK'
    : exposureRead === 0 ? 'NO EXPOSURE READ ON THIS MATCH'
    : bClean === 0 ? `B SHOWED ${exposure.bD540} D540 COUNTER(S) ABOVE 0: THE KEYS-OFF PATH FIRED` : 'INCOMPLETE';
  const notReadWhy = `A's search.p.${arm.key}.windows ${exposure.windows} over ${s.played} games, ${exposure.windowsPerGame} a game, under 0.25 (300 at 1,200)`;
  const line = notPlayed ? `${arm.name}: NOT PLAYED: the pilot's arm gate (D540 point 11): ${m.reason ?? 'no reason given'}; no reading; the live seat is unchanged`
    : incomplete ? `${arm.name}: INCOMPLETE (${why}): no reading, and not NOT READ; ${s.played} of 1,200 games; ${expo}; B's D540 counters above 0: ${exposure.bD540 ?? '-'} (description only); owed: a repost of this arm alone under a new job id after its cause is found; the live seat is unchanged`
    : notRead ? `${arm.name}: NOT READ: ${notReadWhy}; no reading; the arm is not played again without a new decision; the live seat is unchanged`
    : `${arm.name}: ${reading} (${word}): ${s.elo} Elo [${s.eloLo}, ${s.eloHi}], score ${s.score} [${s.lo}, ${s.hi}]; ${expo}; ${cost}; ${candidate ? 'a candidate for one 4,800-game confirmation against the live seat on fresh deals, as its own job and decision' : 'not a candidate'}; the live seat is unchanged`;
  return { ...s, notPlayed, incomplete, notRead, complete, exposed, bClean, shown, smallGain, inconclusive1200, notShown,
    candidate, measuredLoss, measuredGain, indistinguishable, outcome, reading, word, reason: notPlayed ? m.reason ?? null : null,
    ...exposure, aSecPerGame, bSecPerGame, costRatio, desc, line, liveSeatChanged: 0 };
}

export function verdict(byKey) {
  const arms = {};
  for (const arm of ARMS) {
    const x = byKey[arm.key] ?? {};
    arms[arm.key] = readArm(arm, x.m ?? null, x.bs ?? null, x.ro ?? null, x.ex ?? null);
  }
  const all = ARMS.map((a) => arms[a.key]);
  const sum = (f) => all.reduce((t, r) => t + f(r), 0);
  const d = arms.declined, i = arms.instant, l = arms.lands;
  return { written: 1, games: GAMES, bar: BAR, first: FIRST, last: LAST,
    completeCount: sum((r) => r.complete), readings: sum((r) => r.shown + r.smallGain + r.inconclusive1200 + r.notShown),
    notRead: sum((r) => r.notRead), notPlayed: sum((r) => r.notPlayed), incomplete: sum((r) => r.incomplete),
    candidates: sum((r) => r.candidate),
    declinedGain: d.candidate, instantGain: i.candidate, landsGain: l.candidate,
    allNotShown: d.notShown === 1 && i.notShown === 1 && l.notShown === 1 ? 1 : 0,
    liveSeatChanged: 0, arms, lines: all.map((r) => r.line) };
}

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const T = (o = {}) => ({ games: GAMES, searched: 25000, changed: 4000, msPerDecision: 930,
    byKind: { p: { searched: 19900 }, a: { searched: 5100 } }, msMean: { p: 940, a: 890 }, ...o });
  const mk = (arm, o = {}) => ({ id: `j214:run-${arm.key}`, host: 'j214', a: arm.name, b: B, ah: arm.hash, bh: BH, complete: true,
    played: GAMES, planned: GAMES, errors: 0, timeouts: 0, pairs: 600, score: 0.5072, lo: 0.4934, hi: 0.521, elo: 5, eloLo: -4.6,
    eloHi: 14.6, aSearch: T({ msPerDecision: 1100 }), bSearch: T(), ...o });
  const SD = (arm, o = {}) => ({ purpose: `match:j214:run-${arm.key}`, games: GAMES, blocks: BLOCKS, min: FIRST, max: LAST, fullBlocks: BLOCKS, otherGames: 0, ...o });
  const RO = (arm, o = {}) => ({ lines: GAMES, cfgExact: GAMES, aCfg: arm.cfg, bCfg: BCFG, aFromPass: 0.08, aToOther: 0.06, aToPass: 0.05,
    bFromPass: 0.08, bToOther: 0.065, bToPass: 0.049, aSkipLand: 7.5, bSkipLand: 7.5, ...o });
  const EX = (arm, o = {}) => ({ key: arm.key, run: `run-${arm.key}`, lines: GAMES, games: GAMES, windows: 3000, bClean: 1, bD540: 0,
    a: { [`search.p.${arm.key}.windows`]: 3000, [`search.p.${arm.key}.cands`]: 6600, [`search.p.${arm.key}.changed`]: 420,
      [`search.p.${arm.key}.retry`]: 12, ...(arm.key === 'declined' ? { 'search.p.declined.listed': 3600, 'search.p.declined.noTarget': 5000 } : {}) },
    b: { 'search.p.considered': 20000 }, ...o });
  const [A1, A2, A3] = ARMS;
  const arm1 = (o = {}, bs = {}, ro = {}, ex = {}) => ({ m: mk(A1, o), bs: SD(A1, bs), ro: RO(A1, ro), ex: EX(A1, ex) });
  const all = (o = {}) => ({ declined: arm1(), instant: { m: mk(A2), bs: SD(A2), ro: RO(A2), ex: EX(A2) }, lands: { m: mk(A3), bs: SD(A3), ro: RO(A3), ex: EX(A3) }, ...o });
  const d1 = (o, bs, ro, ex) => all({ declined: arm1(o, bs, ro, ex) });
  const flags = (r) => [r.shown, r.smallGain, r.inconclusive1200, r.notShown, r.notRead, r.notPlayed, r.incomplete];
  const exactlyOne = (r) => flags(r).reduce((t, x) => t + x, 0) === 1;
  const one = (r) => exactlyOne(r) && r.complete === 1 && r.shown + r.smallGain + r.inconclusive1200 + r.notShown === 1
    && r.indistinguishable + r.measuredLoss + r.measuredGain === 1 && r.candidate === r.shown + r.smallGain && r.liveSeatChanged === 0;
  const noReading = (r) => r.complete === 0 && r.shown + r.smallGain + r.inconclusive1200 + r.notShown + r.candidate
    + r.indistinguishable + r.measuredLoss + r.measuredGain === 0 && r.reading === null && r.liveSeatChanged === 0;
  const none = (r) => noReading(r) && exactlyOne(r) && r.incomplete === 1 && r.notRead === 0 && r.notPlayed === 0 && r.outcome === 'INCOMPLETE' && r.line.includes('owed: a repost');
  const nread = (r) => noReading(r) && exactlyOne(r) && r.notRead === 1 && r.outcome === 'NOT READ' && r.line.includes('not played again without a new decision');
  const D = 'declined';
  const cases = [
    ['+5 [-4.6, +14.6] with lo 0.4934: NOT SHOWN, indistinguishable, every arm', all(), (v) => ['declined', 'instant', 'lands'].every((k) => v.arms[k].notShown === 1 && one(v.arms[k]) && v.arms[k].indistinguishable === 1) && v.completeCount === 3 && v.readings === 3 && v.candidates === 0 && v.allNotShown === 1 && v.notRead === 0 && v.notPlayed === 0 && v.incomplete === 0],
    ['+20 [+8.5, +31.5], lo 0.5121: SHOWN, a measured gain, a candidate', d1({ score: 0.5288, lo: 0.5121, hi: 0.5454, elo: 20, eloLo: 8.5, eloHi: 31.5 }), (v) => v.arms[D].shown === 1 && one(v.arms[D]) && v.arms[D].measuredGain === 1 && v.arms[D].candidate === 1 && v.declinedGain === 1 && v.candidates === 1 && v.allNotShown === 0],
    ['+12 [+0.6, +23.4], lo 0.5009: SMALL GAIN, a candidate', d1({ score: 0.5173, lo: 0.5009, hi: 0.5336, elo: 12, eloLo: 0.6, eloHi: 23.4 }), (v) => v.arms[D].smallGain === 1 && one(v.arms[D]) && v.arms[D].candidate === 1],
    ['an Elo point of exactly 15.0 with lo above 0.5 is SHOWN', d1({ score: 0.5216, lo: 0.5051, hi: 0.538, elo: 15, eloLo: 3.5, eloHi: 26.5 }), (v) => v.arms[D].shown === 1 && one(v.arms[D])],
    ['an Elo point of 14.9 with lo above 0.5 is SMALL GAIN', d1({ score: 0.5214, lo: 0.505, hi: 0.5378, elo: 14.9, eloLo: 3.4, eloHi: 26.4 }), (v) => v.arms[D].smallGain === 1 && one(v.arms[D])],
    ['lo of exactly 0.5 is not above it: INCONCLUSIVE AT 1,200 when eloHi >= 15', d1({ score: 0.5165, lo: 0.5, hi: 0.533, elo: 11.5, eloLo: 0, eloHi: 23 }), (v) => v.arms[D].inconclusive1200 === 1 && one(v.arms[D]) && v.arms[D].candidate === 0 && v.arms[D].indistinguishable === 1],
    ['lo 0.5001 is above 0.5: SMALL GAIN', d1({ score: 0.5166, lo: 0.5001, hi: 0.5331, elo: 11.5, eloLo: 0.1, eloHi: 23 }), (v) => v.arms[D].smallGain === 1 && v.arms[D].measuredGain === 1],
    ['an upper end of exactly 15.0 with lo <= 0.5 is INCONCLUSIVE AT 1,200', d1({ score: 0.5049, lo: 0.4884, hi: 0.5214, elo: 3.4, eloLo: -8.1, eloHi: 15 }), (v) => v.arms[D].inconclusive1200 === 1 && one(v.arms[D])],
    ['an upper end of 14.9 with lo <= 0.5 is NOT SHOWN', d1({ score: 0.5048, lo: 0.4883, hi: 0.5213, elo: 3.3, eloLo: -8.2, eloHi: 14.9 }), (v) => v.arms[D].notShown === 1 && one(v.arms[D])],
    ['-20 [-31.3, -8.7]: NOT SHOWN, a measured loss', d1({ score: 0.4712, lo: 0.4551, hi: 0.4874, elo: -20, eloLo: -31.3, eloHi: -8.7 }), (v) => v.arms[D].notShown === 1 && v.arms[D].measuredLoss === 1 && one(v.arms[D])],
    ['an upper end of exactly 0 holds 0: indistinguishable', d1({ score: 0.4837, lo: 0.4672, hi: 0.5, elo: -11.3, eloLo: -22.7, eloHi: 0 }), (v) => v.arms[D].indistinguishable === 1 && v.arms[D].measuredLoss === 0 && v.arms[D].notShown === 1],
    ['lands a candidate alone: landsGain, one candidate, not allNotShown', all({ lands: { m: mk(A3, { score: 0.5173, lo: 0.5009, hi: 0.5336, elo: 12, eloLo: 0.6, eloHi: 23.4 }), bs: SD(A3), ro: RO(A3), ex: EX(A3) } }), (v) => v.landsGain === 1 && v.declinedGain === 0 && v.instantGain === 0 && v.candidates === 1 && v.allNotShown === 0],
    ['a stopped match (complete: false, 900 played) is INCOMPLETE: no reading, not NOT READ', d1({ complete: false, played: 900 }, {}, {}, { games: 900, lines: 900, windows: 2250 }), (v) => none(v.arms[D]) && v.completeCount === 2 && v.incomplete === 1 && v.notRead === 0 && v.allNotShown === 0 && v.arms[D].windowsPerGame === 2.5],
    ['cut short AND under the rate: INCOMPLETE, not NOT READ, its rate reported', d1({ complete: false, played: 900 }, {}, {}, { games: 900, lines: 900, windows: 10 }), (v) => none(v.arms[D]) && v.arms[D].windowsPerGame === 0.011 && v.arms[D].windows === 10 && v.notRead === 0 && v.arms[D].line.includes('0.011 a game')],
    ['complete: true but 1,199 games is INCOMPLETE', d1({ played: 1199 }), (v) => none(v.arms[D])],
    ['61 errors and timeouts is INCOMPLETE; 60 is complete', d1({ errors: 50, timeouts: 11 }), (v) => none(v.arms[D]) && one(readArm(A1, mk(A1, { errors: 50, timeouts: 10 }), SD(A1), RO(A1), EX(A1)))],
    ['a line without eloHi is INCOMPLETE', d1({ eloHi: null }), (v) => none(v.arms[D])],
    ['the players swapped is not this match', d1({ a: B, b: A1.name, ah: BH, bh: A1.hash }), (v) => v.arms[D].names === 0 && none(v.arms[D])],
    ['another arm in declined\'s file is not this match', d1({ a: A2.name, ah: A2.hash }), (v) => v.arms[D].names === 0 && none(v.arms[D])],
    ['the arm at another hash is not this match', d1({ ah: 'ffffffffffff' }), (v) => v.arms[D].hashes === 0 && none(v.arms[D])],
    ['B at search-v2\'s hash is not this match', d1({ bh: 'cdd55e02a89c' }), (v) => v.arms[D].hashes === 0 && none(v.arms[D])],
    ['an arm that searched a block is INCOMPLETE', d1({ aSearch: T({ byKind: { p: { searched: 19900 }, a: { searched: 5100 }, b: { searched: 3 } } }) }), (v) => v.arms[D].kindsOk === 0 && none(v.arms[D])],
    ['B that searched no attack is INCOMPLETE', d1({ bSearch: T({ byKind: { p: { searched: 19900 } } }) }), (v) => v.arms[D].kindsOk === 0 && none(v.arms[D])],
    ['B that searched a block is INCOMPLETE', d1({ bSearch: T({ byKind: { p: { searched: 19900 }, a: { searched: 5100 }, b: { searched: 1 } } }) }), (v) => v.arms[D].kindsOk === 0 && none(v.arms[D])],
    ['no block file is INCOMPLETE', all({ declined: { m: mk(A1), bs: null, ro: RO(A1), ex: EX(A1) } }), (v) => v.arms[D].blocks === 0 && none(v.arms[D])],
    ['149 blocks is not the registered 150', d1({}, { blocks: 149 }), (v) => none(v.arms[D])],
    ['J212\'s blocks (114,900,000 on) are not this night\'s', d1({}, { min: 114900000, max: 114900149 }), (v) => none(v.arms[D])],
    ['the pilot host\'s blocks are not this night\'s', d1({}, { min: 679900000, max: 679900149 }), (v) => none(v.arms[D])],
    ['another match\'s game in the folder is INCOMPLETE', d1({}, { otherGames: 4 }), (v) => none(v.arms[D])],
    ['a block file for another match is INCOMPLETE', d1({}, { purpose: 'match:j214:run-x' }), (v) => none(v.arms[D])],
    ['a batch line with another seat config is INCOMPLETE', d1({}, {}, { cfgExact: 1199 }), (v) => v.arms[D].cfgs === 0 && none(v.arms[D])],
    ['declined read with instant\'s seat config is not declined', d1({}, {}, { aCfg: A2.cfg }), (v) => v.arms[D].cfgs === 0 && none(v.arms[D])],
    ['B at search-v2\'s seat config (what=pab) is INCOMPLETE', d1({}, {}, { bCfg: BCFG.replace('what=pa,', 'what=pab,') }), (v) => v.arms[D].cfgs === 0 && none(v.arms[D])],
    ['no rollout file is INCOMPLETE', all({ declined: { m: mk(A1), bs: SD(A1), ro: null, ex: EX(A1) } }), (v) => v.arms[D].cfgs === 0 && none(v.arms[D])],
    ['no match file is INCOMPLETE', all({ declined: { m: null, bs: SD(A1), ro: RO(A1), ex: EX(A1) } }), (v) => v.arms[D].match === 0 && none(v.arms[D])],
    ['no exposure file is INCOMPLETE, not NOT READ', all({ declined: { m: mk(A1), bs: SD(A1), ro: RO(A1), ex: null } }), (v) => v.arms[D].exposureRead === 0 && none(v.arms[D])],
    ['an exposure file of another run is INCOMPLETE', d1({}, {}, {}, { run: 'run-x' }), (v) => v.arms[D].exposureRead === 0 && none(v.arms[D]) && v.arms[D].windows === null],
    ['an exposure file that read 1,192 lines is INCOMPLETE', d1({}, {}, {}, { games: 1192, lines: 1192 }), (v) => v.arms[D].exposureRead === 0 && none(v.arms[D])],
    ['299 windows in 1,200 games (0.249 a game) is NOT READ, its rate reported', d1({}, {}, {}, { windows: 299 }), (v) => nread(v.arms[D]) && v.arms[D].exposed === 0 && v.arms[D].bClean === 1 && v.arms[D].windowsPerGame === 0.249 && v.notRead === 1 && v.completeCount === 2 && v.arms[D].line.includes('0.249 a game, under 0.25')],
    ['exactly 300 windows (0.25 a game) is read', d1({}, {}, {}, { windows: 300 }), (v) => one(v.arms[D]) && v.arms[D].exposed === 1 && v.arms[D].notShown === 1],
    ['the key firing in no window is NOT READ', d1({}, {}, {}, { windows: 0 }), (v) => nread(v.arms[D]) && v.arms[D].windowsPerGame === 0],
    ['B with a D540 counter above 0 is INCOMPLETE, not NOT READ, whatever A\'s rate', d1({ score: 0.5288, lo: 0.5121, hi: 0.5454, elo: 20, eloLo: 8.5, eloHi: 31.5 }, {}, {}, { bClean: 0, bD540: 1 }), (v) => none(v.arms[D]) && v.arms[D].bClean === 0 && v.arms[D].exposed === 1 && v.candidates === 0 && v.notRead === 0 && v.arms[D].line.includes('B SHOWED 1 D540 COUNTER') && v.arms[D].line.includes("B's D540 counters above 0: 1")],
    ['B dirty and under the rate is INCOMPLETE, not NOT READ', d1({}, {}, {}, { windows: 10, bClean: 0, bD540: 1 }), (v) => none(v.arms[D]) && v.arms[D].exposed === 0 && v.arms[D].windowsPerGame === 0.008 && v.notRead === 0],
    ['a cut-short match with B dirty is INCOMPLETE', d1({ complete: false, played: 900 }, {}, {}, { games: 900, lines: 900, bClean: 0, bD540: 2 }), (v) => none(v.arms[D])],
    ['an arm the pilot kept out is NOT PLAYED, with its reason, and nothing else', all({ instant: { m: { notPlayed: true, reason: 'its key fired in no window of its 8 games', played: 0, complete: false }, bs: null, ro: null, ex: null } }), (v) => exactlyOne(v.arms.instant) && v.arms.instant.notPlayed === 1 && noReading(v.arms.instant) && v.arms.instant.incomplete === 0 && v.arms.instant.outcome === 'NOT PLAYED' && v.arms.instant.line.includes('fired in no window') && v.notPlayed === 1 && v.incomplete === 0 && v.allNotShown === 0],
    ['a night of NOT PLAYED, NOT READ and SHOWN', all({ declined: { m: { notPlayed: true, reason: 'x' }, bs: null, ro: null, ex: null }, instant: { m: mk(A2), bs: SD(A2), ro: RO(A2), ex: EX(A2, { windows: 120 }) }, lands: { m: mk(A3, { lo: 0.51, elo: 20, eloLo: 8, eloHi: 32 }), bs: SD(A3), ro: RO(A3), ex: EX(A3) } }), (v) => v.notPlayed === 1 && v.notRead === 1 && v.completeCount === 1 && v.readings === 1 && v.candidates === 1 && v.landsGain === 1 && v.incomplete === 0 && ['declined', 'instant', 'lands'].every((k) => exactlyOne(v.arms[k]))],
    ['the cost and the exposure, and they change no reading', all(), (v) => v.arms[D].aSecPerGame === 22.917 && v.arms[D].bSecPerGame === 19.375 && v.arms[D].costRatio === 1.1828 && v.arms[D].windowsPerGame === 2.5 && v.arms[D].candsPerWindow === 2.2 && v.arms[D].changed === 420 && v.arms[D].retryPerGame === 0.01 && v.arms[D].listed === 3600 && v.arms[D].noTarget === 5000 && v.arms.instant.listed === null && v.arms[D].notShown === 1],
    ['every arm a candidate: three candidates', all({ declined: arm1({ lo: 0.51, elo: 20, eloLo: 8, eloHi: 32 }), instant: { m: mk(A2, { lo: 0.51, elo: 20, eloLo: 8, eloHi: 32 }), bs: SD(A2), ro: RO(A2), ex: EX(A2) }, lands: { m: mk(A3, { lo: 0.51, elo: 20, eloLo: 8, eloHi: 32 }), bs: SD(A3), ro: RO(A3), ex: EX(A3) } }), (v) => v.candidates === 3 && v.declinedGain + v.instantGain + v.landsGain === 3 && v.allNotShown === 0 && v.liveSeatChanged === 0],
  ];
  let ok = 0;
  cases.forEach(([what, input, pred], n) => {
    const d = path.join(scratch, `case-${n}`);
    fs.mkdirSync(d, { recursive: true });
    for (const arm of ARMS) {
      const x = input[arm.key] ?? {};
      if (x.m != null) fs.writeFileSync(path.join(d, `match-J214-${arm.key}.json`), JSON.stringify(x.m));
      if (x.bs != null) fs.writeFileSync(path.join(d, `seeds-${arm.key}.json`), JSON.stringify(x.bs));
      if (x.ro != null) fs.writeFileSync(path.join(d, `rollouts-${arm.key}.json`), JSON.stringify(x.ro));
      if (x.ex != null) fs.writeFileSync(path.join(d, `exposure-${arm.key}.json`), JSON.stringify(x.ex));
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

export function load(matchDir, j214Dir) {
  const out = {};
  for (const arm of ARMS) {
    out[arm.key] = { m: read(path.join(matchDir, `match-J214-${arm.key}.json`)), bs: read(path.join(j214Dir, `seeds-${arm.key}.json`)),
      ro: read(path.join(j214Dir, `rollouts-${arm.key}.json`)), ex: read(path.join(j214Dir, `exposure-${arm.key}.json`)) };
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
  console.error('usage: node verdict.mjs <match dir> <j214 dir> <out.json> | --selftest <dir>');
  process.exit(2);
}
J214EOF
cat > var/j214-tools/rollouts.cjs <<'J214EOF'
// J214: J212's rollout reader (var/j212-tools/rollouts.cjs), unchanged but for these lines. For each side of one
// match it sums the batch lines' aStats/bStats counters (config A is the match's first player, as
// tools/ai-ladder/match.ts tallyBatch reads it): `search.rollouts`, `search.rounds`, `search.anytime.short`,
// `search.<p|a|b>.considered`, `search.playUs`, `search.copyUs`, `search.p.skipLand` (priority windows left to Forge
// because it played a land), `search.p.changed.fromPass|toOther|toPass` and `search.rolloutStepCap`. Rollouts and
// rounds are counted over all kinds together; the counters are not kept by kind, so nothing here is split by kind but
// the decisions. It also reads each batch line's two seat configs (`a`, `b`): aCfg and bCfg are the one value each
// side carried (or "MIXED"), and cfgExact the lines that carried both.
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
J214EOF
cat > var/j214-tools/seeds.cjs <<'J214EOF'
// J214: J212's block reader (var/j212-tools/seeds.cjs), unchanged but for this line: which deal blocks a match played
// (D398 point 2: a match takes its matchup's next unused blocks from its host name's match base; D540 point 7: under
// --host j214 in an emptied folder those are 416,900,000-416,900,149).
// Reads every results line of <ladder dir>/results/*.jsonl whose purpose is a match's, and reports for the match's
// own `match:<id>` (the id in <match.json>; none when the file is absent or has no id) its games, its distinct blocks
// (`bseed`), their lowest and highest and how many of them hold exactly 8 games, and how many match games in the
// folder belong to any other match (expected 0: the folder is the match's own).
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
  fullBlocks: [...per.values()].filter((n) => n === 8).length, otherGames,
  registered: b.length === 150 && b[0] === 416900000 && b[b.length - 1] === 416900149 && otherGames === 0 ? 1 : 0 };
fs.writeFileSync(out, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J214EOF
cat > var/j214-tools/records.cjs <<'J214EOF'
// J214's recording reader: J212's records.cjs (var/j212-tools/records.cjs) widened for D540's windows (point 11:
// information, and two checks of what must hold). It reads the gzipped seat logs `ai-bench.sh play --record-all`
// writes (D347: <run>/games/p<pair>-g<game>-seat<s>.jsonl.gz, each seat's own redacted view, with that seat's decision
// records as dir:"ai" type:"decision" lines) and summarises the SEARCH seat's records only (the log whose own seat,
// hello_ok's `you` in the session header's `seats`, has policy "search"; the Forge seat's logs are counted and
// skipped). The state line before each record gives the active player and the stack; `phase` is the record's own.
// Each searched PRIORITY decision is put in one class:
//   land      a land is among its candidates or its answer (`land:` tokens: D540's land window, Forge's land against
//             each other-named land);
//   ownMain   otherwise, the seat's own main phase (MAIN1, MAIN2);
//   instant   otherwise: outside the seat's own main phases (the opponent's turn, the seat's own other steps).
// For each class: decisions, candidates a decision (the histogram 1..6+), ms, overrides; and for all searched priority
// decisions, ms by candidate count. Two counts must be 0 for an arm in its own window: `outsideOwnMain`, searched
// priority decisions anywhere but the seat's own main phase with an empty stack (declined and lands search there
// only), and `onStack`, searched priority decisions with a non-empty stack (instant searches empty stacks only).
// `noState` counts searched decisions with no state line before them (counted in outsideOwnMain, not in onStack).
// It also reads the run's bench lines (<run>/shard-*.jsonl, beside <games dir>): games, engine errors (a non-empty
// `error`), timeouts, and config A's (the search seat's) D540 counters summed, `search.p.<key>.windows`, `.cands`,
// `.changed`, `.retry`, `.listed`, `.noTarget`. The unsearched priority windows are J212's (description only).
// usage: node records.cjs <games dir> <out.json>        node records.cjs --selftest <scratch dir>
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const KIND = { priority: 'p', attack: 'a', block: 'b' };
const PLAY = /^(cast|activate):/;
const D540 = /^search\.p\.(declined|instant|lands)\./;
const r1 = (x) => (x === null ? null : Math.round(x * 10) / 10), r3 = (x) => (x === null ? null : Math.round(x * 1000) / 1000);
const kindStats = () => ({ searched: 0, cands: {}, candSum: 0, legalSum: 0, legalOver: 0, roundsSum: 0, short: 0, ms: 0,
  horizon: {}, overrode: 0, fallback: {} });
const cls = () => ({ n: 0, cands: {}, candSum: 0, ms: 0, overrode: 0 });
const win = () => ({ n: 0, withPlay: 0 });
const bucket = (n) => (n >= 6 ? '6+' : String(n));

function bench(runDir) {
  const B = { lines: 0, errors: 0, timeouts: 0, counts: {} };
  for (const f of fs.existsSync(runDir) ? fs.readdirSync(runDir).filter((x) => /^shard-\d+\.jsonl$/.test(x)).sort() : []) {
    for (const line of fs.readFileSync(path.join(runDir, f), 'utf8').split('\n')) {
      let l; try { l = JSON.parse(line); } catch { continue; }
      B.lines++;
      if (l.error !== '' && l.error !== null && l.error !== undefined && l.error !== false) B.errors++;
      if (l.timeout === true) B.timeouts++;
      const c = (l.aStats && l.aStats.counts) || {};
      for (const [x, v] of Object.entries(c)) if (typeof v === 'number' && D540.test(x)) B.counts[x] = (B.counts[x] || 0) + v;
    }
  }
  return B;
}

function summarize(dir) {
  const S = { p: kindStats(), a: kindStats(), b: kindStats() };
  const C = { land: cls(), ownMain: cls(), instant: cls() };
  const msBy = {};
  const W = { landSkip: 0, landSkipOtherLand: 0, landSkipPlay: 0, ownMainNoSearch: win(), ownMainStack: win(), ownOther: win(),
    oppTurn: win(), outsideOwnMain: 0, onStack: 0, noState: 0 };
  let files = 0, searchLogs = 0, otherLogs = 0, bad = 0, bytes = 0, forcedPriority = 0, decisions = 0, overs = 0;
  const list = fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => x.endsWith('.jsonl.gz')).sort() : [];
  for (const f of list) {
    files++;
    let text;
    try { const buf = fs.readFileSync(path.join(dir, f)); bytes += buf.length; text = zlib.gunzipSync(buf).toString('utf8'); } catch { bad++; continue; }
    const parsed = [];
    for (const l of text.split('\n')) { if (!l) continue; try { parsed.push(JSON.parse(l)); } catch { /* a torn line */ } }
    const head = parsed.find((j) => j.kind === 'session') || null;
    const hello = parsed.find((j) => j.type === 'hello_ok');
    const you = hello && hello.body ? hello.body.you : null;
    const seats = head && Array.isArray(head.seats) ? head.seats : [];
    const mine = seats.find((s) => s.player === you) || null;
    if (!mine || mine.policy !== 'search') { otherLogs++; continue; }
    searchLogs++;
    let st = null;
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
      const chosen = typeof d.chosen === 'string' ? d.chosen : '';
      const own = st !== null && st.activePlayer === you;
      const main = d.phase === 'MAIN1' || d.phase === 'MAIN2';
      const hasStack = st !== null && Array.isArray(st.stack);
      const stackEmpty = hasStack && st.stack.length === 0;
      if (d.search) {
        const s = d.search, K = S[k];
        const co = Array.isArray(s.options) ? s.options : [];
        const ms = typeof s.ms === 'number' ? s.ms : 0;
        K.searched++;
        K.cands[bucket(co.length)] = (K.cands[bucket(co.length)] || 0) + 1;
        K.candSum += co.length;
        K.legalSum += opts.length;
        if (opts.length > co.length) K.legalOver++;
        K.roundsSum += typeof s.rounds === 'number' ? s.rounds : 0;
        if (typeof s.rounds === 'number' && s.rounds < 2) K.short++;
        K.ms += ms;
        const h = String(s.horizon);
        K.horizon[h] = (K.horizon[h] || 0) + 1;
        if (s.overrode === true) K.overrode++;
        if (s.fallback) K.fallback[s.fallback] = (K.fallback[s.fallback] || 0) + 1;
        if (k === 'p') {
          const isLand = chosen.startsWith('land:') || co.some((o) => o && typeof o.token === 'string' && o.token.startsWith('land:'));
          const c = C[isLand ? 'land' : own && main ? 'ownMain' : 'instant'];
          c.n++; c.candSum += co.length; c.ms += ms; if (s.overrode === true) c.overrode++;
          c.cands[bucket(co.length)] = (c.cands[bucket(co.length)] || 0) + 1;
          const mb = (msBy[bucket(co.length)] = msBy[bucket(co.length)] || { n: 0, ms: 0 });
          mb.n++; mb.ms += ms;
          if (!(own && main && stackEmpty)) W.outsideOwnMain++;
          if (hasStack && st.stack.length > 0) W.onStack++;
          if (st === null) W.noState++;
        }
        continue;
      }
      if (k !== 'p') continue;
      const hasPlay = opts.some((o) => PLAY.test(o));
      if (own && main && stackEmpty) {
        if (chosen.startsWith('land:')) {
          W.landSkip++;
          if (opts.some((o) => o.startsWith('land:') && o !== chosen)) W.landSkipOtherLand++;
          if (hasPlay) W.landSkipPlay++;
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
  const B = bench(path.dirname(path.resolve(dir)));
  const out = { written: 1, files, searchLogs, otherLogs, bad, games: searchLogs, overs, bytes, decisions, forcedPriority,
    windows: W, kinds: {}, classes: {}, msByCands: {}, bench: B };
  for (const k of ['p', 'a', 'b']) {
    const K = S[k], n = K.searched;
    out.kinds[k] = { searched: n, candidates: K.cands, candidatesMean: n ? r3(K.candSum / n) : null,
      legalMean: n ? r3(K.legalSum / n) : null, legalOverConsidered: K.legalOver, roundsMean: n ? r3(K.roundsSum / n) : null,
      shortShare: n ? r3(K.short / n) : null, msMean: n ? r1(K.ms / n) : null, horizon: K.horizon, overrode: K.overrode, fallback: K.fallback };
  }
  for (const [name, c] of Object.entries(C)) {
    out.classes[name] = { n: c.n, candidates: c.cands, candidatesMean: c.n ? r3(c.candSum / c.n) : null, msMean: c.n ? r1(c.ms / c.n) : null, overrode: c.overrode };
  }
  for (const b of ['1', '2', '3', '4', '5', '6+']) if (msBy[b]) out.msByCands[b] = { n: msBy[b].n, msMean: r1(msBy[b].ms / msBy[b].n) };
  // flat numbers for the runner's checks (every one a number)
  const bc = (key, x) => B.counts[`search.p.${key}.${x}`] || 0;
  Object.assign(out, { pSearched: out.kinds.p.searched, aSearched: out.kinds.a.searched, bSearched: out.kinds.b.searched,
    landSearched: C.land.n, ownMainSearched: C.ownMain.n, instantSearched: C.instant.n,
    outsideOwnMain: W.outsideOwnMain, onStack: W.onStack, noState: W.noState,
    benchGames: B.lines, benchErrors: B.errors, benchTimeouts: B.timeouts,
    declinedWindows: bc('declined', 'windows'), instantWindows: bc('instant', 'windows'), landsWindows: bc('lands', 'windows'),
    declinedRetry: bc('declined', 'retry'), instantRetry: bc('instant', 'retry'), landsRetry: bc('lands', 'retry') });
  return out;
}

function selftest(scratch) {
  fs.rmSync(scratch, { recursive: true, force: true });
  const g = path.join(scratch, 'games');
  fs.mkdirSync(g, { recursive: true });
  const L = (o) => JSON.stringify(o);
  const head = (seat, pol0, pol1) => L({ v: 1, kind: 'session', seat, seats: [{ player: 0, kind: 'ai', policy: pol0 }, { player: 1, kind: 'ai', policy: pol1 }] });
  const hello = (you) => L({ v: 1, seq: 1, dir: 's2c', type: 'hello_ok', body: { you } });
  const state = (active, phase, stack) => L({ v: 1, dir: 's2c', type: 'state', body: { activePlayer: active, phase, stack } });
  const dec = (body) => L({ v: 1, dir: 'ai', type: 'decision', body });
  const opt = (token, n, seDiff) => ({ token, n, meanLeaf: 0, se: 0, diff: 0, seDiff, win: 0.5 });
  const srch = (options, ms, overrode, rounds = 3) => ({ options, rounds, playouts: 11, horizon: 0, ms, overrode, fallback: null });
  const searchLog = [
    head(0, 'search', 'forge'), hello(0),
    state(0, 'MAIN1', []),
    // own main, empty stack: a cast against pass (ownMain, 3 candidates, overrode)
    dec({ seat: 0, kind: 'priority', phase: 'MAIN1', options: ['pass', 'cast:7', 'cast:8', 'land:5'], chosen: 'cast:8', by: 'search',
      search: srch([opt('pass', 4, 0), opt('cast:7', 4, 10), opt('cast:8', 3, 20)], 1490, true) }),
    // the land window: Forge's land against another name (land, 2 candidates, overrode)
    dec({ seat: 0, kind: 'priority', phase: 'MAIN1', options: ['pass', 'land:5', 'land:6', 'cast:7'], chosen: 'land:6', by: 'search',
      search: srch([opt('land:5', 5, 0), opt('land:6', 5, 12)], 1510, true) }),
    // a land drop left to Forge, unsearched
    dec({ seat: 0, kind: 'priority', phase: 'MAIN2', options: ['pass', 'land:6'], chosen: 'land:6', by: 'forge' }),
    state(0, 'MAIN1', [{ id: 3 }]),
    // own main with a stack, searched: ownMain, outside the own-main empty-stack window, on a stack
    dec({ seat: 0, kind: 'priority', phase: 'MAIN1', options: ['pass', 'cast:7'], chosen: 'pass', by: 'search',
      search: srch([opt('pass', 2, 0), opt('cast:7', 2, 5)], 600, false) }),
    state(0, 'COMBAT_DECLARE_ATTACKERS', []),
    dec({ seat: 0, kind: 'attack', phase: 'COMBAT_DECLARE_ATTACKERS', options: ['attack:none', 'attack:4'], chosen: 'attack:4', by: 'search',
      search: srch([opt('attack:4', 1, null), opt('attack:none', 1, null)], 1500, false, 1) }),
    dec({ seat: 0, kind: 'priority', phase: 'END_OF_TURN', options: ['pass', 'cast:7'], chosen: 'pass', by: 'forge' }),
    state(1, 'END_OF_TURN', []),
    // the opponent's end step, empty stack: Forge's activation against pass (instant, 2 candidates)
    dec({ seat: 0, kind: 'priority', phase: 'END_OF_TURN', options: ['pass', 'activate:9'], chosen: 'activate:9', by: 'search',
      search: srch([opt('activate:9', 6, 0), opt('pass', 6, 8)], 700, false) }),
    dec({ seat: 0, kind: 'priority', phase: 'UPKEEP', options: ['pass', 'cast:7'], chosen: 'pass', by: 'forge' }),
    dec({ seat: 0, kind: 'target', phase: 'MAIN1', options: ['target:3', 'target:4'], chosen: 'target:3', by: 'forge' }),
    L({ v: 1, dir: 's2c', type: 'over', body: {} }),
    L({ v: 1, dir: 'ai', type: 'decisions', body: { seat: 0, forced: { priority: 10, choice: 2 } } }),
  ].join('\n') + '\n';
  const forgeLog = [head(1, 'search', 'forge'), hello(1), state(0, 'MAIN1', []),
    dec({ seat: 1, kind: 'priority', phase: 'MAIN1', options: ['pass', 'cast:2'], chosen: 'pass', by: 'forge' })].join('\n') + '\n';
  fs.writeFileSync(path.join(g, 'p0-g0-seat0.jsonl.gz'), zlib.gzipSync(searchLog));
  fs.writeFileSync(path.join(g, 'p0-g0-seat1.jsonl.gz'), zlib.gzipSync(forgeLog));
  fs.writeFileSync(path.join(g, 'p0-g1-seat0.jsonl.gz'), 'not gzip');
  const shard = (o) => L({ pair: 0, game: 0, a: 'X', b: 'Default', timeout: false, error: '', aStats: { counts: {} }, bStats: { counts: {} }, ...o });
  fs.writeFileSync(path.join(scratch, 'shard-0.jsonl'), [
    shard({ aStats: { counts: { 'search.p.lands.windows': 2, 'search.p.lands.cands': 4, 'search.p.lands.retry': 1, 'search.p.considered': 9 } } }),
    shard({ error: 'java.lang.IllegalStateException', aStats: { counts: { 'search.p.lands.windows': 1 } } }),
  ].join('\n') + '\n');
  fs.writeFileSync(path.join(scratch, 'shard-1.jsonl'), shard({ timeout: true }) + '\n');
  const r = summarize(g);
  const C = r.classes, W = r.windows;
  const checks = [
    ['three files, one search log, one Forge log skipped, one unreadable', r.files === 3 && r.searchLogs === 1 && r.otherLogs === 1 && r.bad === 1 && r.games === 1],
    ['four searched priority decisions and one attack', r.pSearched === 4 && r.aSearched === 1 && r.bSearched === 0],
    ['the classes: own main 2, land 1, instant-speed 1', r.ownMainSearched === 2 && r.landSearched === 1 && r.instantSearched === 1],
    ['the land class: 2 candidates, 1,510 ms, overrode', C.land.n === 1 && C.land.candidatesMean === 2 && C.land.msMean === 1510 && C.land.overrode === 1],
    ['the own-main class: 3 and 2 candidates, 1,045 ms', C.ownMain.candidates['3'] === 1 && C.ownMain.candidates['2'] === 1 && C.ownMain.msMean === 1045 && C.ownMain.overrode === 1],
    ['ms by candidate count: 2 candidates 3 decisions at 936.7 ms, 3 candidates 1 at 1,490', r.msByCands['2'].n === 3 && r.msByCands['2'].msMean === 936.7 && r.msByCands['3'].n === 1 && r.msByCands['3'].msMean === 1490],
    ['outside the own-main empty-stack window: 2 (the stack one and the end step one); on a stack: 1', r.outsideOwnMain === 2 && r.onStack === 1 && r.noState === 0],
    ['an attack on one round is short', r.kinds.a.shortShare === 1 && r.kinds.p.shortShare === 0],
    ['one land drop left to Forge, no other land among its options', W.landSkip === 1 && W.landSkipOtherLand === 0],
    ['the own end step and the opponent\'s upkeep: one unsearched window each, with a play', W.ownOther.n === 1 && W.ownOther.withPlay === 1 && W.oppTurn.n === 1 && W.oppTurn.withPlay === 1],
    ['the forced passes from the summary line; the target record is not a p/a/b decision', r.forcedPriority === 10 && r.decisions === 8],
    ['the bench lines: 3 games, 1 error, 1 timeout', r.benchGames === 3 && r.benchErrors === 1 && r.benchTimeouts === 1],
    ['the bench counters: lands windows 3, retry 1, cands 4; no other key; search.p.considered not a D540 counter', r.landsWindows === 3 && r.landsRetry === 1 && r.bench.counts['search.p.lands.cands'] === 4 && r.declinedWindows === 0 && r.instantWindows === 0 && r.bench.counts['search.p.considered'] === undefined],
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
J214EOF
cat > var/j214-tools/arms.cjs <<'J214EOF'
// J214's arm gate (D540 point 11), after the pilot's games. An arm is played that night only if, over its 4 ladder
// games against search-v2-no-b and its 4 recorded games against Forge Default: its key's search.p.<key>.windows summed
// is above 0, none of the 8 games ended in an engine error or a timeout, and search.p.<key>.retry is at most 2 a game
// (summed, at most 2 x 8). Both pilot runs must have played their 4 games. It reads, for k in declined, instant, lands:
//   var/ai-ladder-pilot/J214-<k>/match.json   the ladder match line (played, complete, errors, timeouts, its id);
//   var/j214-tools/pilot-exposure-<k>.json     the exposure reader on that match (A's counters, summed);
//   var/ai-bench/j214-pilot-rec-<k>/shard-*.jsonl  the recorded run's bench lines (error, timeout, aStats: config A is
//                                              the arm's seat).
// Writes var/j214-tools/arms.json {written, play: [the arms that passed, in this order], reasons: {arm: what failed},
// arms: {arm: its numbers}}. The pilot fails on none of this: an arm that fails is not played and the report says why.
// usage: node arms.cjs [root]   (every path above is under root; '.' by default)
const fs = require('fs');
const path = require('path');
const root = process.argv[2] || '.';
const P = (...x) => path.join(root, ...x);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const n = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const out = { written: 1, play: [], reasons: {}, arms: {} };
for (const k of ['declined', 'instant', 'lands']) {
  const m = read(P('var/ai-ladder-pilot', `J214-${k}`, 'match.json'));
  const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : null;
  const ex = read(P('var/j214-tools', `pilot-exposure-${k}.json`));
  const exOk = ex !== null && run !== null && ex.run === run;
  const ea = exOk && ex.a ? ex.a : {};
  const bdir = P('var/ai-bench', `j214-pilot-rec-${k}`);
  let bGames = 0, bErr = 0, bTo = 0, bW = 0, bR = 0;
  for (const f of fs.existsSync(bdir) ? fs.readdirSync(bdir).filter((x) => /^shard-\d+\.jsonl$/.test(x)) : []) {
    for (const line of fs.readFileSync(path.join(bdir, f), 'utf8').split('\n')) {
      let l; try { l = JSON.parse(line); } catch { continue; }
      bGames++;
      if (l.error !== '' && l.error !== null && l.error !== undefined && l.error !== false) bErr++;
      if (l.timeout === true) bTo++;
      const c = (l.aStats && l.aStats.counts) || {};
      bW += n(c[`search.p.${k}.windows`]);
      bR += n(c[`search.p.${k}.retry`]);
    }
  }
  const lGames = m ? n(m.played) : 0, lBad = m ? n(m.errors) + n(m.timeouts) : 0;
  const lW = n(ea[`search.p.${k}.windows`]), lR = n(ea[`search.p.${k}.retry`]);
  const games = lGames + bGames, windows = lW + bW, retry = lR + bR, bad = lBad + bErr + bTo;
  const why = [];
  if (m === null) why.push('no pilot ladder match line');
  else if (m.complete !== true || lGames !== 4) why.push(`the pilot ladder match played ${lGames} of its 4 games (complete: ${m.complete})`);
  if (m !== null && !exOk) why.push('no exposure read on the pilot ladder match');
  if (bGames !== 4) why.push(`the recorded run wrote ${bGames} of its 4 games`);
  if (bad > 0) why.push(`${bad} of its ${games} games ended in an engine error or a timeout`);
  if (windows <= 0) why.push(`search.p.${k}.windows fired in no window of its ${games} games`);
  if (retry > 2 * games) why.push(`search.p.${k}.retry ${retry} over ${games} games, above 2 a game`);
  out.arms[k] = { ladderGames: lGames, benchGames: bGames, games, ladderWindows: lW, benchWindows: bW, windows,
    errorsTimeouts: bad, retry, retryPerGame: games ? Math.round((retry / games) * 1000) / 1000 : null, pass: why.length === 0 ? 1 : 0 };
  if (why.length === 0) out.play.push(k); else out.reasons[k] = why.join('; ');
}
out.playCount = out.play.length;
fs.mkdirSync(P('var/j214-tools'), { recursive: true });
fs.writeFileSync(P('var/j214-tools', 'arms.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out));
J214EOF
rm -rf var/j214-tools/selftest
node var/j214-tools/verdict.mjs --selftest var/j214-tools/selftest > var/j214-tools/selftest.json || true
cat var/j214-tools/selftest.json
rm -rf var/j214-tools/rec-selftest
node var/j214-tools/records.cjs --selftest var/j214-tools/rec-selftest > var/j214-tools/rec-selftest.json || true
cat var/j214-tools/rec-selftest.json
# the block reader on a synthetic results log: a match at two blocks over three games, one game of another match
# (counted as other), and a pilot line that must not count at all
rm -rf var/j214-tools/seeds-selftest
mkdir -p var/j214-tools/seeds-selftest/results
printf '%s\n' '{"purpose":"match:j214:new","bseed":416900000}' '{"purpose":"match:j214:new","bseed":416900001}' '{"purpose":"match:j214:new","bseed":416900001}' '{"purpose":"match:j214:other","bseed":416900002}' '{"purpose":"pilot","bseed":5}' > var/j214-tools/seeds-selftest/results/j214.jsonl
echo '{"id":"j214:new"}' > var/j214-tools/seeds-selftest/match.json
node var/j214-tools/seeds.cjs var/j214-tools/seeds-selftest var/j214-tools/seeds-selftest/match.json var/j214-tools/seeds-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j214-tools/seeds-selftest/out.json","utf8"));const ok=r.purpose==="match:j214:new"&&r.games===3&&r.blocks===2&&r.min===416900000&&r.max===416900001&&r.fullBlocks===0&&r.otherGames===1&&r.registered===0?1:0;require("fs").writeFileSync("var/j214-tools/seeds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the rollout reader on a synthetic batch folder: two games, each side's decisions by kind, priority overrides by
# direction, land skips, and the two seat configs (one line off)
rm -rf var/j214-tools/ro-selftest
mkdir -p var/j214-tools/ro-selftest/batches/run-s
printf '%s\n' '{"a":"X","b":"Y","aStats":{"counts":{"search.rollouts":90,"search.rounds":34,"search.anytime.short":1,"search.p.considered":8,"search.a.considered":2,"search.playUs":9000000,"search.copyUs":450000,"search.p.skipLand":3,"search.p.changed.fromPass":2,"search.p.changed.toPass":1}},"bStats":{"counts":{"search.rollouts":150,"search.rounds":60,"search.p.considered":7,"search.b.considered":3,"search.playUs":7500000,"search.copyUs":750000,"search.p.changed.toOther":1}}}' '{"a":"X","b":"Z","aStats":{"counts":{"search.rollouts":96,"search.rounds":34,"search.p.considered":10,"search.playUs":9600000}},"bStats":{"counts":{"search.rollouts":158,"search.rounds":58,"search.anytime.short":1,"search.a.considered":10,"search.playUs":7900000}}}' > var/j214-tools/ro-selftest/batches/run-s/b0.jsonl
echo '{"id":"j214:run-s","a":"search-v3-declined","b":"search-v2-no-b"}' > var/j214-tools/ro-selftest/match.json
node var/j214-tools/rollouts.cjs var/j214-tools/ro-selftest var/j214-tools/ro-selftest/match.json var/j214-tools/ro-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j214-tools/ro-selftest/out.json","utf8"));const ok=r.games===2&&r.aDecisions===20&&r.bDecisions===20&&r.aPriority===18&&r.aAttacks===2&&r.aBlocks===0&&r.bBlocks===3&&r.aRolloutsPerDecision===9.3&&r.bRolloutsPerDecision===15.4&&r.aPlayMsPerRollout===100&&r.bPlayMsPerRollout===50&&r.playMsRatio===2&&r.aCopyMsPerRollout===2.4&&r.aShortShare===0.05&&r.aFromPass===0.1111&&r.aToPass===0.0556&&r.bToOther===0.1429&&r.aSkipLandN===3&&r.aSkipLand===1.5&&r.aCfg==="X"&&r.bCfg==="MIXED"&&r.cfgExact===0?1:0;require("fs").writeFileSync("var/j214-tools/ro-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the arm gate on a synthetic pilot: one arm passes, one fired in no window, one had a timeout and too many retries
rm -rf var/j214-tools/arms-selftest
node - <<'J214EOF'
const fs = require('fs');
const { execFileSync } = require('child_process');
const R = 'var/j214-tools/arms-selftest';
const put = (f, s) => { fs.mkdirSync(require('path').dirname(`${R}/${f}`), { recursive: true }); fs.writeFileSync(`${R}/${f}`, s); };
const arm = (k, { lw, bw, timeout = false, retry = 0 }) => {
  put(`var/ai-ladder-pilot/J214-${k}/match.json`, JSON.stringify({ id: `j214-pilot:run-${k}`, complete: true, played: 4, errors: 0, timeouts: 0 }));
  put(`var/j214-tools/pilot-exposure-${k}.json`, JSON.stringify({ run: `run-${k}`, a: { [`search.p.${k}.windows`]: lw, [`search.p.${k}.retry`]: retry } }));
  const line = (i) => JSON.stringify({ error: '', timeout: timeout && i === 1, aStats: { counts: { [`search.p.${k}.windows`]: i === 0 ? bw : 0, [`search.p.${k}.retry`]: retry } } });
  put(`var/ai-bench/j214-pilot-rec-${k}/shard-0.jsonl`, [0, 1].map(line).join('\n') + '\n');
  put(`var/ai-bench/j214-pilot-rec-${k}/shard-1.jsonl`, [2, 3].map(line).join('\n') + '\n');
};
arm('declined', { lw: 3, bw: 0 });
arm('instant', { lw: 0, bw: 0 });
arm('lands', { lw: 2, bw: 1, timeout: true, retry: 4 });
execFileSync(process.execPath, ['var/j214-tools/arms.cjs', R], { stdio: 'ignore' });
const a = JSON.parse(fs.readFileSync(`${R}/var/j214-tools/arms.json`, 'utf8'));
const ok = a.written === 1 && JSON.stringify(a.play) === '["declined"]' && /no window/.test(a.reasons.instant || '')
  && /1 of its 8 games/.test(a.reasons.lands || '') && /retry 20 over 8 games/.test(a.reasons.lands || '')
  && a.arms.declined.windows === 3 && a.arms.declined.games === 8 && a.arms.lands.retryPerGame === 2.5 ? 1 : 0;
fs.writeFileSync('var/j214-tools/arms-selftest.json', JSON.stringify({ ok }) + '\n');
console.log(JSON.stringify({ ok, play: a.play, reasons: a.reasons }));
J214EOF
```
```bash
# three 4-game ladder matches, one per arm against search-v2-no-b, in pilot folders under another host (one batch
# pair, one worker); then each match's exposure (B's D540 counters, both sides' kinds), its rollout reader and the
# match line's names, hashes and seat configs (numbers only, so no check reads a missing or null key)
for k in declined instant lands; do
  case "$k" in declined) AH=795daea97aaa ;; instant) AH=25ee7e76b741 ;; lands) AH=e0b09eb7b014 ;; esac
  rm -rf "var/ai-ladder-pilot/J214-$k"
  ./tools/ai-ladder.sh match "search-v3-$k" search-v2-no-b --games 4 --batch-pairs 1 --game-timeout 900 --host j214-pilot --purpose pilot --dir "var/ai-ladder-pilot/J214-$k" --experiments "var/ai-ladder-pilot/J214-$k/experiments.jsonl" --out "var/ai-ladder-pilot/J214-$k/match.json" --jobs 1
  node var/j214-tools/exposure.cjs "var/ai-ladder-pilot/J214-$k" "var/ai-ladder-pilot/J214-$k/match.json" "$k" "var/j214-tools/pilot-exposure-$k.json"
  node var/j214-tools/rollouts.cjs "var/ai-ladder-pilot/J214-$k" "var/ai-ladder-pilot/J214-$k/match.json" "var/j214-tools/rollouts-pilot-$k.json" > /dev/null
  K="$k" AH="$AH" node - <<'J214EOF'
const fs = require('fs');
const { K, AH } = process.env;
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const m = read(`var/ai-ladder-pilot/J214-${K}/match.json`), ro = read(`var/j214-tools/rollouts-pilot-${K}.json`);
const pl = read('var/j214-tools/players.json');
const n = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const k = (t, x) => n(t && t.byKind && t.byKind[x] ? t.byKind[x].searched : 0, 0);
const A = `search-v3-${K}`;
const r = { written: 1, k: K,
  namesOk: m.a === A && m.b === 'search-v2-no-b' ? 1 : 0,
  hashesOk: String(m.ah) === AH && String(m.bh) === '59505e241363' ? 1 : 0,
  cfgOk: pl.cfgs && ro.aCfg === pl.cfgs[A] && ro.bCfg === pl.cfgs['search-v2-no-b'] && ro.cfgExact === ro.lines && ro.lines === 4 ? 1 : 0,
  played: n(m.played, 0), errorsTimeouts: n(m.errors, 9) + n(m.timeouts, 9),
  aP: k(m.aSearch, 'p'), aA: k(m.aSearch, 'a'), aB: k(m.aSearch, 'b'), bP: k(m.bSearch, 'p'), bA: k(m.bSearch, 'a'), bB: k(m.bSearch, 'b'),
  aMs: n(m.aSearch && m.aSearch.msPerDecision, -1), bMs: n(m.bSearch && m.bSearch.msPerDecision, -1),
  aSecPerGame: m.played ? Math.round(n(m.aSearch && m.aSearch.msPerDecision, 0) * n(m.aSearch && m.aSearch.searched, 0) / m.played) / 1000 : -1,
  bSecPerGame: m.played ? Math.round(n(m.bSearch && m.bSearch.msPerDecision, 0) * n(m.bSearch && m.bSearch.searched, 0) / m.played) / 1000 : -1 };
fs.writeFileSync(`var/j214-tools/pilot-${K}.json`, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J214EOF
done
```
```bash
# three recorded runs of 4 games each against Forge Default (the confirm set's first deck pair, two workers), one per
# arm: each arm's searched priority decisions by window (own main, land, instant-speed) and their ms by candidate
# count from the search seat's decision records, with the bench lines' D540 counters (records.cjs above)
mkdir -p var/j214-tools
awk '!/^#/ && NF { print; exit }' tools/ai-bench/pairs-confirm.txt > var/j214-tools/pair1.txt
cat var/j214-tools/pair1.txt
V3='Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1'
for k in declined instant lands; do
  rm -rf "var/ai-bench/j214-pilot-rec-$k"
  ./tools/ai-bench.sh play --pairs var/j214-tools/pair1.txt --a "$V3,$k=1" --b Default --games 4 --seed 214000001 --timeout 900 --jobs 2 --run "j214-pilot-rec-$k" --record-all
  node var/j214-tools/records.cjs "var/ai-bench/j214-pilot-rec-$k/games" "var/j214-tools/rec-pilot-$k.json" > /dev/null
  node -e 'const fs=require("fs");const k=process.argv[1];const r=JSON.parse(fs.readFileSync("var/j214-tools/rec-pilot-"+k+".json","utf8"));const o={};for(const x of ["written","files","searchLogs","bad","games","pSearched","aSearched","bSearched","ownMainSearched","landSearched","instantSearched","outsideOwnMain","onStack","noState","benchGames","benchErrors","benchTimeouts",k+"Windows",k+"Retry"])o[x]=typeof r[x]==="number"?r[x]:-1;console.log(JSON.stringify(o),JSON.stringify(r.classes),JSON.stringify(r.msByCands),JSON.stringify(r.bench.counts))' "$k"
done
# the arm gate (D540 point 11): windows over the 4 ladder and 4 recorded games above 0, no error or timeout in the 8,
# retry at most 2 a game; writes var/j214-tools/arms.json {written, play: [...], reasons: {arm: why}}
node var/j214-tools/arms.cjs
```
metrics: merged = sh: cat var/j214-merged.txt 2>/dev/null || echo 0
metrics: dst = sh: cat var/j214-decision-selftest.json 2>/dev/null || echo '{"ok":0,"checks":0,"failures":-1}'
metrics: pl = sh: cat var/j214-tools/players.json 2>/dev/null || echo '{"ok":0,"present":0,"cfgs_ok":0,"literal_ok":0,"hashes_ok":0,"kinds_ok":0,"distinct":0}'
metrics: sd = sh: cat var/j214-tools/src-diff.json 2>/dev/null || echo '{"count":-1,"rc":1,"exact":0,"srcExact":0,"playersAdd":-1,"playersDel":-1,"kindsAdd":-1,"kindsDel":-1,"benchAdd":-1,"benchDel":-1,"dstAdd":-1,"dstDel":-1}'
metrics: hb = sh: cat var/j214-tools/base.json 2>/dev/null || echo '{"ok":0,"own":0,"first":0,"pilot":0}'
metrics: est = sh: cat var/j214-tools/exposure-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: st = sh: cat var/j214-tools/selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: rst = sh: cat var/j214-tools/rec-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: sst = sh: cat var/j214-tools/seeds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: ost = sh: cat var/j214-tools/ro-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: ast = sh: cat var/j214-tools/arms-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: pxd = sh: cat var/j214-tools/pilot-exposure-declined.json 2>/dev/null || echo '{"bClean":0,"kindsOk":0,"games":0}'
metrics: pxi = sh: cat var/j214-tools/pilot-exposure-instant.json 2>/dev/null || echo '{"bClean":0,"kindsOk":0,"games":0}'
metrics: pxl = sh: cat var/j214-tools/pilot-exposure-lands.json 2>/dev/null || echo '{"bClean":0,"kindsOk":0,"games":0}'
metrics: ppd = sh: cat var/j214-tools/pilot-declined.json 2>/dev/null || echo '{"written":0,"namesOk":0,"hashesOk":0,"cfgOk":0}'
metrics: ppi = sh: cat var/j214-tools/pilot-instant.json 2>/dev/null || echo '{"written":0,"namesOk":0,"hashesOk":0,"cfgOk":0}'
metrics: ppl = sh: cat var/j214-tools/pilot-lands.json 2>/dev/null || echo '{"written":0,"namesOk":0,"hashesOk":0,"cfgOk":0}'
metrics: arms = sh: cat var/j214-tools/arms.json 2>/dev/null || echo '{"written":0,"playCount":0,"play":[],"reasons":{}}'
metrics: rd = sh: cat var/j214-tools/rec-pilot-declined.json 2>/dev/null || echo '{"written":0,"games":0,"bad":-1,"outsideOwnMain":-1,"onStack":-1}'
metrics: ri = sh: cat var/j214-tools/rec-pilot-instant.json 2>/dev/null || echo '{"written":0,"games":0,"bad":-1,"outsideOwnMain":-1,"onStack":-1}'
metrics: rl = sh: cat var/j214-tools/rec-pilot-lands.json 2>/dev/null || echo '{"written":0,"games":0,"bad":-1,"outsideOwnMain":-1,"onStack":-1}'
check: merged == 1
check: dst.ok == 1
check: dst.failures == 0
check: dst.checks >= 472
check: pl.ok == 1
check: pl.present == 1
check: pl.cfgs_ok == 1
check: pl.literal_ok == 1
check: pl.hashes_ok == 1
check: pl.kinds_ok == 1
check: pl.distinct == 1
check: sd.rc == 0
check: sd.count == 8
check: sd.exact == 1
check: sd.srcExact == 1
check: sd.playersAdd == 4
check: sd.playersDel == 1
check: sd.kindsDel == 0
check: sd.benchDel == 0
check: sd.dstDel == 0
check: hb.ok == 1
check: hb.own == 416000000
check: hb.first == 416900000
check: est.ok == 1
check: est.cases == 4
check: est.passed == 4
check: st.ok == 1
check: st.cases == 48
check: st.passed == 48
check: rst.ok == 1
check: rst.cases == 13
check: sst.ok == 1
check: ost.ok == 1
check: ast.ok == 1
check: pxd.bClean == 1
check: pxd.kindsOk == 1
check: pxd.games == 4
check: pxi.bClean == 1
check: pxi.kindsOk == 1
check: pxi.games == 4
check: pxl.bClean == 1
check: pxl.kindsOk == 1
check: pxl.games == 4
check: ppd.written == 1
check: ppd.namesOk == 1
check: ppd.hashesOk == 1
check: ppd.cfgOk == 1
check: ppi.written == 1
check: ppi.namesOk == 1
check: ppi.hashesOk == 1
check: ppi.cfgOk == 1
check: ppl.written == 1
check: ppl.namesOk == 1
check: ppl.hashesOk == 1
check: ppl.cfgOk == 1
check: arms.written == 1
check: rd.written == 1
check: rd.bad == 0
check: rd.outsideOwnMain == 0
check: ri.written == 1
check: ri.bad == 0
check: ri.onStack == 0
check: rl.written == 1
check: rl.bad == 0
check: rl.outsideOwnMain == 0

The pilot asks only whether anything is broken, and the night's arms are the gate's:
- `merged`: the pinned commit is on `origin/main`;
- the build passes with the decision self-test at 0 failures and at least 472 checks (D539's 443 and D540's
  `searchCandidates`, 29), and the ai-bench self-test (its D540 lines kept in `d540-selftest.txt`) and the ladder
  registry test pass;
- `pl`: the five players resolve on this PC at D540's hashes (compared as strings) and each arm's ai-bench config is
  exactly B's plus its one key, written out (`literal_ok`) and built (`cfgs_ok`);
- `sd`: git answered, and since D539's merge the only files changed under `bridge/src`, `tools/ai-ladder` and
  `tools/ai-bench` are D540's five under `bridge/src` (`DecisionSelfTest.java` lines in, none out), `players.json`
  (three players appended: 4 lines in, 1 out), `kinds.ts` and `AiBench.java` (lines in, none out);
- `hb`: `hostBase('j214')` is 416,000,000, an empty folder's first match block 416,900,000, and the pilot's host
  name has another base;
- the readers: the exposure reader on 4 synthetic folders (`est`), the verdict on 48 synthetic cases (`st`: each
  reading at and either side of its bars; the three descriptions with an end at exactly 0; NOT READ at 299 windows
  and at none, read at exactly 300; NOT PLAYED with its reason; a B counter above 0 (at any rate, under the rate,
  and in a cut-short match), a stopped match and a match cut short and under the rate all INCOMPLETE and never NOT
  READ; 1,199
  games, 61 errors, a missing end, swapped or other players, other hashes, a block searched or attacks not searched,
  absent, short, other or shared block files, other seat configs, absent or other exposure files, all INCOMPLETE; the
  cost and the exposure that never change a reading), the recording reader on 13 synthetic checks (`rst`), and the
  block, rollout and arm-gate readers on synthetic files (`sst`, `ost`, `ast`);
- in 4 games of each arm against search-v2-no-b: the names, hashes and seat configs are the arm's and B's, every
  batch line carried both seat configs exactly, both sides searched priority and attacks and neither a block
  (`kindsOk`), and B's D540 counters are all 0 (`bClean`; a D540 counter in B stops the night);
- in 4 recorded games of each arm against Forge Default: the logs read, and no arm searched outside its own window
  (`declined` and `lands` none outside the seat's own main phase with an empty stack, `instant` none on a non-empty
  stack): a key that fires under the wrong window stops the night (D540 point 11).

Read, not checked: each arm's windows, candidates, changes and retries a game in the 8 pilot games, its ms by
candidate count and by window, and A's and B's search seconds a game (`pilot-<arm>.json`); D540 point 12's estimate
is the yardstick. The arm gate (`arms.json`) decides which arms the night plays; an arm it keeps out is not a pilot
failure.

## Commands
cores: 7
clean: var/ai-ladder/match-J214-declined.json var/j214-declined
```bash
# match 1 of 3: search-v3-declined (795daea97aaa) against search-v2-no-b, 1,200 games on the confirm set, in a ladder
# folder of its own under --host j214, emptied here, so this match is dealt blocks 416,900,000-416,900,149
test -f var/j214-tools/verdict.mjs
test -f var/j214-tools/arms.json
mkdir -p var/j214
rm -rf var/j214-declined var/ai-ladder/match-J214-declined.json
if ! node -e 'const a=require("./var/j214-tools/arms.json");process.exit(a.play.includes("declined")?0:1)'; then
  node -e 'const a=require("./var/j214-tools/arms.json");require("fs").writeFileSync("var/ai-ladder/match-J214-declined.json",JSON.stringify({notPlayed:true,reason:a.reasons["declined"]||"not listed in arms.json play",played:0,complete:false,errors:0,timeouts:0,score:0,lo:0,hi:0,elo:0,eloLo:0,eloHi:0})+"\n")'
  echo "J214: search-v3-declined not played (the pilot's arm gate)"; exit 0
fi
echo "J214 1/3: search-v3-declined against search-v2-no-b, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v3-declined search-v2-no-b --host j214 --dir var/j214-declined --games 1200 --hours 3.5 --game-timeout 900 --out var/ai-ladder/match-J214-declined.json --jobs {workers}
tail -1 var/j214-declined/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J214-instant.json var/j214-instant
```bash
# match 2 of 3: search-v3-instant (25ee7e76b741) against search-v2-no-b, its own folder, blocks 416,900,000-416,900,149
test -f var/j214-tools/verdict.mjs
test -f var/j214-tools/arms.json
mkdir -p var/j214
rm -rf var/j214-instant var/ai-ladder/match-J214-instant.json
if ! node -e 'const a=require("./var/j214-tools/arms.json");process.exit(a.play.includes("instant")?0:1)'; then
  node -e 'const a=require("./var/j214-tools/arms.json");require("fs").writeFileSync("var/ai-ladder/match-J214-instant.json",JSON.stringify({notPlayed:true,reason:a.reasons["instant"]||"not listed in arms.json play",played:0,complete:false,errors:0,timeouts:0,score:0,lo:0,hi:0,elo:0,eloLo:0,eloHi:0})+"\n")'
  echo "J214: search-v3-instant not played (the pilot's arm gate)"; exit 0
fi
echo "J214 2/3: search-v3-instant against search-v2-no-b, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v3-instant search-v2-no-b --host j214 --dir var/j214-instant --games 1200 --hours 3.5 --game-timeout 900 --out var/ai-ladder/match-J214-instant.json --jobs {workers}
tail -1 var/j214-instant/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J214-lands.json var/j214-lands
```bash
# match 3 of 3: search-v3-lands (e0b09eb7b014) against search-v2-no-b, its own folder, blocks 416,900,000-416,900,149
test -f var/j214-tools/verdict.mjs
test -f var/j214-tools/arms.json
mkdir -p var/j214
rm -rf var/j214-lands var/ai-ladder/match-J214-lands.json
if ! node -e 'const a=require("./var/j214-tools/arms.json");process.exit(a.play.includes("lands")?0:1)'; then
  node -e 'const a=require("./var/j214-tools/arms.json");require("fs").writeFileSync("var/ai-ladder/match-J214-lands.json",JSON.stringify({notPlayed:true,reason:a.reasons["lands"]||"not listed in arms.json play",played:0,complete:false,errors:0,timeouts:0,score:0,lo:0,hi:0,elo:0,eloLo:0,eloHi:0})+"\n")'
  echo "J214: search-v3-lands not played (the pilot's arm gate)"; exit 0
fi
echo "J214 3/3: search-v3-lands against search-v2-no-b, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v3-lands search-v2-no-b --host j214 --dir var/j214-lands --games 1200 --hours 3.5 --game-timeout 900 --out var/ai-ladder/match-J214-lands.json --jobs {workers}
tail -1 var/j214-lands/match.jsonl
```
cores: 1
clean: var/j214/verdict.json var/j214/v.json var/j214/report.md var/j214/exposure-declined.json var/j214/exposure-instant.json var/j214/exposure-lands.json var/j214/rollouts-declined.json var/j214/rollouts-instant.json var/j214/rollouts-lands.json var/j214/seeds-declined.json var/j214/seeds-instant.json var/j214/seeds-lands.json
```bash
# the pre-registered readings: each match's blocks, rollouts and exposure, the verdict over the three, and report.md
# (numbers only; the PC session writes the summary beside it). Nothing here plays a game; a reading is never a failure.
test -f var/j214-tools/verdict.mjs
mkdir -p var/j214
for k in declined instant lands; do
  node var/j214-tools/rollouts.cjs "var/j214-$k" "var/ai-ladder/match-J214-$k.json" "var/j214/rollouts-$k.json" > /dev/null
  node var/j214-tools/seeds.cjs "var/j214-$k" "var/ai-ladder/match-J214-$k.json" "var/j214/seeds-$k.json"
  node var/j214-tools/exposure.cjs "var/j214-$k" "var/ai-ladder/match-J214-$k.json" "$k" "var/j214/exposure-$k.json" > /dev/null
done
node var/j214-tools/verdict.mjs var/ai-ladder var/j214 var/j214/verdict.json > /dev/null
# the checks' copy: the verdict's numbers only (every value a number; strings, nulls and the description detail dropped)
node -e 'const fs=require("fs");const v=JSON.parse(fs.readFileSync("var/j214/verdict.json","utf8"));const flat=(o)=>{const r={};for(const [k,x] of Object.entries(o)){if(typeof x==="number")r[k]=x}return r};const out=flat(v);for(const k of ["declined","instant","lands"])out[k]=flat(v.arms[k]);fs.writeFileSync("var/j214/v.json",JSON.stringify(out)+"\n");console.log(JSON.stringify(out))'
node - <<'J214EOF'
// J214's report: the job's own numbers (D540 points 8 to 10 and 13), nothing worded beyond them.
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const v = read('var/j214/verdict.json');
const arms = v.arms || {};
const K = ['declined', 'instant', 'lands'];
const d = (x) => (x === null || x === undefined ? '-' : x);
const pct = (x, n = 1) => (typeof x === 'number' ? `${(x * 100).toFixed(n)}%` : '-');
const runStart = (id) => {
  const x = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(id || '');
  return x ? Date.UTC(+x[1], +x[2] - 1, +x[3], +x[4], +x[5], +x[6]) : null;
};
const L = ['# J214: what the search considers, three arms against search-v2-no-b (search-v3, the live seat), 1,200 games each (D398; D540; D519\'s four readings)', ''];
L.push('**Outcomes under the pre-registered rule (D540 point 8):**', '');
for (const l of v.lines || []) L.push(`- ${l}`);
L.push('', `**Candidates for a 4,800-game confirmation (SHOWN or SMALL GAIN):** ${d(v.candidates)}. **NOT READ:** ${d(v.notRead)}. **NOT PLAYED:** ${d(v.notPlayed)}. **INCOMPLETE (owed a repost):** ${d(v.incomplete)}. **The live seat:** unchanged by this job (liveSeatChanged ${d(v.liveSeatChanged)}).`, '');
L.push(`**The night's pattern (D540 point 13, descriptions, not rules):** declined a candidate ${d(v.declinedGain)}, instant a candidate ${d(v.instantGain)}, lands a candidate ${d(v.landsGain)}; all three NOT SHOWN ${d(v.allNotShown)}.`, '');
L.push('| arm | played / planned | complete | outcome | described | score [95%] | Elo [95%] | pairs | draws, errors, timeouts | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|');
const M = {};
for (const k of K) {
  const m = read(`var/ai-ladder/match-J214-${k}.json`); M[k] = m;
  const a = arms[k] || {};
  const t0 = runStart(m.id), t1 = typeof m.at === 'string' ? Date.parse(m.at) : null;
  const hours = t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null;
  if (m.notPlayed === true) { L.push(`| search-v3-${k} | not played | - | NOT PLAYED | - | - | - | - | - | - |`); continue; }
  L.push(`| ${d(m.a)} | ${d(m.played)} / ${d(m.planned)} | ${d(m.complete)} | ${d(a.outcome)} | ${d(a.word)} | ${d(m.score)} [${d(m.lo)}, ${d(m.hi)}] | ${d(m.elo)} [${d(m.eloLo)}, ${d(m.eloHi)}] | ${d(m.pairs)} | ${d(m.draws)}, ${d(m.errors)}, ${d(m.timeouts)} | ${d(hours)} |`);
}
L.push('', '**The exposure, the arm\'s own key (D540 points 8 and 10; the rate decides NOT READ, the rest is description; on every match it was read on, a cut-short one included):**', '');
L.push('| arm | games read | windows | a game (0.25 is the rate) | at the rate | B\'s D540 counters above 0 | candidates | a window | changed | a game | retries | a game | aimed listed (a game) | dropped, no legal target (a game) |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of K) {
  const a = arms[k] || {};
  if (a.notPlayed === 1) { L.push(`| search-v3-${k} | not played: ${d(a.reason)} | | | | | | | | | | | | |`); continue; }
  const atRate = typeof a.windows === 'number' && typeof a.games === 'number' && a.games > 0 ? (a.windows * 4 >= a.games ? 'yes' : 'no') : '-';
  L.push(`| ${d(a.a)} | ${d(a.games)} | ${d(a.windows)} | ${d(a.windowsPerGame)} | ${atRate} | ${d(a.bD540)} | ${d(a.cands)} | ${d(a.candsPerWindow)} | ${d(a.changed)} | ${d(a.changedPerGame)} | ${d(a.retry)} | ${d(a.retryPerGame)} | ${k === 'declined' ? `${d(a.listed)} (${d(a.listedPerGame)})` : '-'} | ${k === 'declined' ? `${d(a.noTarget)} (${d(a.noTargetPerGame)})` : '-'} |`);
}
L.push('', '**The cost, A against B on the same games (description only; the seconds are this machine\'s, D388):**', '');
L.push('| arm | search s a game A / B (x) | ms a decision A / B | ms p, a A | ms p, a B | searched p, a, b A | searched p, a, b B | from pass, to other, to pass a p decision A | same, B | land windows left to Forge a game A / B | rollouts a decision A / B | fewer than 2 rounds A / B |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of K) {
  const a = arms[k] || {}, h = a.desc || {};
  if (a.notPlayed === 1) continue;
  L.push(`| ${d(a.a)} | ${d(a.aSecPerGame)} / ${d(a.bSecPerGame)} (x${d(a.costRatio)}) | ${d(a.aMs)} / ${d(a.bMs)} | ${d(a.aMsP)}, ${d(a.aMsA)} | ${d(a.bMsP)}, ${d(a.bMsA)} | ${d(a.aP)}, ${d(a.aA)}, ${d(a.aB)} | ${d(a.bP)}, ${d(a.bA)}, ${d(a.bB)} | ${pct(h.aFromPass)}, ${pct(h.aToOther)}, ${pct(h.aToPass)} | ${pct(h.bFromPass)}, ${pct(h.bToOther)}, ${pct(h.bToPass)} | ${d(h.aSkipLand)} / ${d(h.bSkipLand)} | ${d(h.aRolloutsPerDecision)} / ${d(h.bRolloutsPerDecision)} | ${pct(h.aShortShare, 2)} / ${pct(h.bShortShare, 2)} |`);
}
L.push('', '| side | decisions searched (games) | changed Forge: p | a | b | all | budget fallbacks [95%] | other fallbacks | step timeouts |');
L.push('|---|---|---|---|---|---|---|---|---|');
for (const k of K) {
  const m = M[k] || {};
  if (m.notPlayed === true) continue;
  for (const [who, t] of [[m.a, m.aSearch], [`${m.b} (vs ${m.a})`, m.bSearch]]) {
    if (!t || !t.searched) { L.push(`| ${who ?? k} | no search | | | | | | | |`); continue; }
    const kd = t.byKind || {};
    const ch = (x) => (kd[x] ? `${kd[x].changed}/${kd[x].searched} (${pct(kd[x].rate)})` : '-');
    const other = Object.entries(t.fallback || {}).filter(([r]) => r !== 'budget').map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
    L.push(`| ${who} | ${t.searched} (${t.games}) | ${ch('p')} | ${ch('a')} | ${ch('b')} | ${t.changed}/${t.searched} (${pct(t.searched ? t.changed / t.searched : null)}) | ${(t.fallback || {}).budget ?? 0} = ${pct(t.budgetRate)} [${pct(t.budgetLo)}, ${pct(t.budgetHi)}] | ${other} | ${d(t.stepTimeouts)} |`);
  }
}
for (const k of K) {
  const a = arms[k] || {}, bs = read(`var/j214/seeds-${k}.json`);
  if (a.notPlayed === 1) { L.push('', `search-v3-${k}: NOT PLAYED; the pilot's arm gate said: ${d(a.reason)}.`); continue; }
  L.push('', `${d(a.a)}: rule parts names ${d(a.names)}, hashes ${d(a.hashes)}, seat configs ${d(a.cfgs)}, the registered blocks ${d(a.blocks)} (${d(bs.blocks)} blocks ${d(bs.min)} to ${d(bs.max)}, ${d(bs.games)} games, ${d(bs.otherGames)} of another match), priority and attacks searched and no block on both sides ${d(a.kindsOk)}, the exposure read on this match ${d(a.exposureRead)}, at the rate ${d(a.exposed)}, B clean ${d(a.bClean)}; complete ${d(a.complete)}. SHOWN ${d(a.shown)}, SMALL GAIN ${d(a.smallGain)}, INCONCLUSIVE AT 1,200 ${d(a.inconclusive1200)}, NOT SHOWN ${d(a.notShown)}, NOT READ ${d(a.notRead)}, INCOMPLETE ${d(a.incomplete)}; candidate ${d(a.candidate)}. Described: indistinguishable ${d(a.indistinguishable)}, a measured loss ${d(a.measuredLoss)}, a measured gain ${d(a.measuredGain)}. Match id ${d(M[k]?.id)}, host ${d(M[k]?.host)}, set ${d(M[k]?.set)}.`);
}
// the pilot: the arm gate and the recorded windows (D540 points 11 and 12)
const g = read('var/j214-tools/arms.json');
L.push('', '## The pilot (D540 point 11): the arm gate and the recorded windows', '');
L.push(`Arms played: ${(g.play || []).join(', ') || 'none'}.`, '');
L.push('| arm | games (ladder + recorded) | key windows (ladder + recorded) | errors and timeouts | retries (a game) | gate | recorded searched p: own main / land / instant-speed | outside own main, on a stack | ms by candidate count (decisions) | ladder search s a game A / B |');
L.push('|---|---|---|---|---|---|---|---|---|---|');
for (const k of K) {
  const x = (g.arms || {})[k] || {}, r = read(`var/j214-tools/rec-pilot-${k}.json`), p = read(`var/j214-tools/pilot-${k}.json`);
  const mb = Object.entries(r.msByCands || {}).map(([c, o]) => `${c}: ${o.msMean} (${o.n})`).join('; ') || '-';
  L.push(`| ${k} | ${d(x.ladderGames)} + ${d(x.benchGames)} | ${d(x.ladderWindows)} + ${d(x.benchWindows)} | ${d(x.errorsTimeouts)} | ${d(x.retry)} (${d(x.retryPerGame)}) | ${x.pass === 1 ? 'played' : `not played: ${d((g.reasons || {})[k])}`} | ${d(r.ownMainSearched)} / ${d(r.landSearched)} / ${d(r.instantSearched)} | ${d(r.outsideOwnMain)}, ${d(r.onStack)} | ${mb} | ${d(p.aSecPerGame)} / ${d(p.bSecPerGame)} |`);
}
fs.mkdirSync('var/j214', { recursive: true });
fs.writeFileSync('var/j214/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J214EOF
```
The verdict (`verdict.mjs`, J212's with the names, hashes, B, the blocks 416,900,000-416,900,149 and the kinds check
changed to "both sides searched priority and attacks, neither a block", and D540's exposure condition added) gives
each arm exactly one outcome, in this precedence: NOT PLAYED when the pilot's arm gate kept the arm out (with the
gate's reason); INCOMPLETE when any part of D540 point 8's completeness but the rate fails, a B that shows any
`search.p.declined.`, `search.p.instant.` or `search.p.lands.` counter above 0 among them (no reading, and not NOT
READ either, whatever its rate); NOT READ when every other part holds, B clean among them, but A's
`search.p.<key>.windows` is under 0.25 a game played (under 300 at 1,200: "a match under that rate"); else one of
D519's four readings,
compared in integers as the line carries them. It writes `v.json` with, per arm, the completeness parts (names,
hashes, blocks, cfgs, kindsOk, exposureRead, exposed, bClean), exactly one of shown / smallGain / inconclusive1200 /
notShown / notRead / notPlayed / incomplete, exactly one description for a complete match, the candidate flag (SHOWN
or SMALL GAIN), the exposure (windows, windowsPerGame, candsPerWindow, changed, retryPerGame; for declined listed and
noTarget), and `liveSeatChanged` 0.
check: v.written == 1
check: v.liveSeatChanged == 0
check: v.candidates == v.declined.candidate + v.instant.candidate + v.lands.candidate
check: v.notRead == v.declined.notRead + v.instant.notRead + v.lands.notRead
check: v.declined.incomplete == 0
check: v.declined.complete + v.declined.notRead + v.declined.notPlayed == 1
check: v.declined.shown + v.declined.smallGain + v.declined.inconclusive1200 + v.declined.notShown + v.declined.notRead + v.declined.notPlayed == 1
check: v.declined.shown + v.declined.smallGain + v.declined.inconclusive1200 + v.declined.notShown == v.declined.complete
check: v.declined.indistinguishable + v.declined.measuredLoss + v.declined.measuredGain == v.declined.complete
check: v.declined.candidate == v.declined.shown + v.declined.smallGain
check: v.declined.notPlayed == 0 or mde.played == 0
check: v.declined.complete + v.declined.notRead == 0 or (mde.complete == true and mde.played == 1200 and mde.errors + mde.timeouts <= 60)
check: v.declined.shown == 1 or not (v.declined.complete == 1 and mde.lo > 0.5 and mde.elo >= 15)
check: v.declined.shown == 0 or (v.declined.complete == 1 and mde.lo > 0.5 and mde.elo >= 15)
check: v.declined.smallGain == 1 or not (v.declined.complete == 1 and mde.lo > 0.5 and mde.elo < 15)
check: v.declined.smallGain == 0 or (v.declined.complete == 1 and mde.lo > 0.5 and mde.elo < 15)
check: v.declined.inconclusive1200 == 1 or not (v.declined.complete == 1 and mde.lo <= 0.5 and mde.eloHi >= 15)
check: v.declined.inconclusive1200 == 0 or (v.declined.complete == 1 and mde.lo <= 0.5 and mde.eloHi >= 15)
check: v.declined.notShown == 1 or not (v.declined.complete == 1 and mde.lo <= 0.5 and mde.eloHi < 15)
check: v.declined.notShown == 0 or (v.declined.complete == 1 and mde.lo <= 0.5 and mde.eloHi < 15)
check: v.declined.measuredLoss == 1 or not (v.declined.complete == 1 and mde.eloHi < 0)
check: v.declined.measuredLoss == 0 or (v.declined.complete == 1 and mde.eloHi < 0)
check: v.declined.measuredGain == 1 or not (v.declined.complete == 1 and mde.eloLo > 0)
check: v.declined.measuredGain == 0 or (v.declined.complete == 1 and mde.eloLo > 0)
check: v.declined.liveSeatChanged == 0
check: v.instant.incomplete == 0
check: v.instant.complete + v.instant.notRead + v.instant.notPlayed == 1
check: v.instant.shown + v.instant.smallGain + v.instant.inconclusive1200 + v.instant.notShown + v.instant.notRead + v.instant.notPlayed == 1
check: v.instant.shown + v.instant.smallGain + v.instant.inconclusive1200 + v.instant.notShown == v.instant.complete
check: v.instant.indistinguishable + v.instant.measuredLoss + v.instant.measuredGain == v.instant.complete
check: v.instant.candidate == v.instant.shown + v.instant.smallGain
check: v.instant.notPlayed == 0 or min.played == 0
check: v.instant.complete + v.instant.notRead == 0 or (min.complete == true and min.played == 1200 and min.errors + min.timeouts <= 60)
check: v.instant.shown == 1 or not (v.instant.complete == 1 and min.lo > 0.5 and min.elo >= 15)
check: v.instant.shown == 0 or (v.instant.complete == 1 and min.lo > 0.5 and min.elo >= 15)
check: v.instant.smallGain == 1 or not (v.instant.complete == 1 and min.lo > 0.5 and min.elo < 15)
check: v.instant.smallGain == 0 or (v.instant.complete == 1 and min.lo > 0.5 and min.elo < 15)
check: v.instant.inconclusive1200 == 1 or not (v.instant.complete == 1 and min.lo <= 0.5 and min.eloHi >= 15)
check: v.instant.inconclusive1200 == 0 or (v.instant.complete == 1 and min.lo <= 0.5 and min.eloHi >= 15)
check: v.instant.notShown == 1 or not (v.instant.complete == 1 and min.lo <= 0.5 and min.eloHi < 15)
check: v.instant.notShown == 0 or (v.instant.complete == 1 and min.lo <= 0.5 and min.eloHi < 15)
check: v.instant.measuredLoss == 1 or not (v.instant.complete == 1 and min.eloHi < 0)
check: v.instant.measuredLoss == 0 or (v.instant.complete == 1 and min.eloHi < 0)
check: v.instant.measuredGain == 1 or not (v.instant.complete == 1 and min.eloLo > 0)
check: v.instant.measuredGain == 0 or (v.instant.complete == 1 and min.eloLo > 0)
check: v.instant.liveSeatChanged == 0
check: v.lands.incomplete == 0
check: v.lands.complete + v.lands.notRead + v.lands.notPlayed == 1
check: v.lands.shown + v.lands.smallGain + v.lands.inconclusive1200 + v.lands.notShown + v.lands.notRead + v.lands.notPlayed == 1
check: v.lands.shown + v.lands.smallGain + v.lands.inconclusive1200 + v.lands.notShown == v.lands.complete
check: v.lands.indistinguishable + v.lands.measuredLoss + v.lands.measuredGain == v.lands.complete
check: v.lands.candidate == v.lands.shown + v.lands.smallGain
check: v.lands.notPlayed == 0 or mla.played == 0
check: v.lands.complete + v.lands.notRead == 0 or (mla.complete == true and mla.played == 1200 and mla.errors + mla.timeouts <= 60)
check: v.lands.shown == 1 or not (v.lands.complete == 1 and mla.lo > 0.5 and mla.elo >= 15)
check: v.lands.shown == 0 or (v.lands.complete == 1 and mla.lo > 0.5 and mla.elo >= 15)
check: v.lands.smallGain == 1 or not (v.lands.complete == 1 and mla.lo > 0.5 and mla.elo < 15)
check: v.lands.smallGain == 0 or (v.lands.complete == 1 and mla.lo > 0.5 and mla.elo < 15)
check: v.lands.inconclusive1200 == 1 or not (v.lands.complete == 1 and mla.lo <= 0.5 and mla.eloHi >= 15)
check: v.lands.inconclusive1200 == 0 or (v.lands.complete == 1 and mla.lo <= 0.5 and mla.eloHi >= 15)
check: v.lands.notShown == 1 or not (v.lands.complete == 1 and mla.lo <= 0.5 and mla.eloHi < 15)
check: v.lands.notShown == 0 or (v.lands.complete == 1 and mla.lo <= 0.5 and mla.eloHi < 15)
check: v.lands.measuredLoss == 1 or not (v.lands.complete == 1 and mla.eloHi < 0)
check: v.lands.measuredLoss == 0 or (v.lands.complete == 1 and mla.eloHi < 0)
check: v.lands.measuredGain == 1 or not (v.lands.complete == 1 and mla.eloLo > 0)
check: v.lands.measuredGain == 0 or (v.lands.complete == 1 and mla.eloLo > 0)
check: v.lands.liveSeatChanged == 0

For each arm the checks say: exactly one outcome and it is not INCOMPLETE; a played outcome (a reading or NOT READ)
comes from a match line that says complete, played all 1,200 games and had at most one in 20 end in an engine error
or a timeout; a NOT PLAYED arm played nothing; a complete match has exactly one reading and one description and the
candidate flag is exactly SHOWN or SMALL GAIN; the four readings and the two descriptions agree with the match line in
the runner's own language; the live seat is unchanged. Any reading passes them, and so do NOT READ and NOT PLAYED:
they are outcomes D540 registered, not failures. If a match is cut short (its own stop, or a memory stop the runner
retries from that match's block), or is incomplete for any other reason (a B that shows any D540 counter above 0
among them: the keys-off path fired, a code fault, so the arm is reposted, never retired for it), it is INCOMPLETE
and the job fails on that
match's checks; the report is still written with the other matches' outcomes, and what is owed is a repost of that arm
alone under a new job id after its cause is found, not a reading of a cut match. A match both cut short (or
incomplete for another reason) and under the exposure rate is INCOMPLETE, not NOT READ: D540 point 8's order puts the
other completeness parts first, so it gets neither a reading nor NOT READ, the repost under a new job id after the
cause is found is what is owed, and the report still prints its exposure rate, as description. A NOT READ arm is
reported with its rate and is not played again without a new decision; no repost is owed.

## Abort if
abort: j214_err >= 30 and j214_err > j214_games / 10

Engine trouble only: once 30 games of the three matches have ended in an engine error or a timeout, the job stops if
they are more than one in ten. No match has a stopping rule on the score.

## Report
collect: var/ai-ladder/match-J214-declined.json
collect: var/ai-ladder/match-J214-instant.json
collect: var/ai-ladder/match-J214-lands.json
collect: var/j214/verdict.json
collect: var/j214/report.md
collect: var/j214/exposure-declined.json
collect: var/j214/exposure-instant.json
collect: var/j214/exposure-lands.json
collect: var/j214/rollouts-declined.json
collect: var/j214/rollouts-instant.json
collect: var/j214/rollouts-lands.json
collect: var/j214/seeds-declined.json
collect: var/j214/seeds-instant.json
collect: var/j214/seeds-lands.json
collect: var/j214-tools/d540-selftest.txt
collect: var/j214-tools/arms.json
collect: var/j214-tools/rec-pilot-declined.json
collect: var/j214-tools/rec-pilot-instant.json
collect: var/j214-tools/rec-pilot-lands.json

`report.md` is the job's own numbers. The PC session writes `summary.md` from it:
- **the answer first:** whether the search plays better when it considers more, in one sentence a person can act on:
  each arm's outcome under D540's rule (SHOWN, SMALL GAIN, INCONCLUSIVE AT 1,200 or NOT SHOWN; or NOT READ with its
  rate; or NOT PLAYED with the arm gate's reason; or INCOMPLETE, owed a repost, with its cause, a B showing a D540
  counter above 0 among the causes) with its score and Elo interval
  against search-v2-no-b for a reading, the describing word, and the candidates (each earns one 4,800-game
  confirmation as its own job under its own decision; nothing is adopted and this job does not change the live seat);
- **what the three readings together point at** (D540 point 13, as consequences, never as rules);
- **the exposure and the cost:** each arm's windows a game, candidates a window, changes a game and retries a game
  (D540 point 10: a retry is a widened pick that did not happen, under `declined` likely a card left in the stack
  zone, and it counts against the arm uncorrected); for `declined` the aimed spells listed and dropped; search seconds a game on each side and their ratio, ms a searched decision;
  the pilot's ms by candidate count against D540 point 12's estimate;
- **the install at an instant-speed step:** what the ai-bench self-test's instant-install lines said
  (D540 point 5; kept in `d540-selftest.txt`), word for word, and this sentence beside the instant arm's reading: on a copy, after a forced pass
  in the opponent's turn the opponent is asked once more before the step ends, which can only help the opponent
  after a pass, so the instant arm's rollouts lean against passing, toward keeping Forge's play; a NOT SHOWN
  `instant` reading is therefore weaker evidence than the other two arms', and a SHOWN one is not inflated by it;
- **the run:** draws, errors and timeouts, the deal blocks, each match's hours against its estimate (2.3, 2.4 and
  2.4 h), the pressure events in STATUS and any block the runner retried, and that it ran alone (D521).

Never write "no effect", "no gain" or "no cost" for an interval that includes 0. The three arms are each read
against search-v2-no-b and never against each other.
