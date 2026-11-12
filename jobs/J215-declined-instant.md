id: J215
title: D540's two positive keys together (D541): one fixed 4,800-game match (2,400 mirrored pairs, D398, the confirm set, no stopping rule) of search-v3-declined-instant (search-v3 with declined=1 and instant=1, a new player, af6771947a25) against search-v2-no-b (search-v3, the live seat since D539), in a ladder folder of its own under --host j215 on deal blocks no job has played, 519,900,000-519,900,599, read by D519's four readings at 4,800 games as D541 writes them for this match (SHOWN, SMALL GAIN, INCONCLUSIVE AT 4,800, NOT SHOWN), with D540's completeness parts and exposure condition for both keys. Never pooled with J214. This job never changes the live seat
public_title: Two search widenings together: one 4,800-game match
public_est: ~9 h (one night)
public_decides: Whether the search AI gains from declined spells and instant speed together
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
alone: yes
repos: mtg-table@1eaa00d3065eb9da83e7c2dcb50e0e707a0001b9 (the merge commit of D541's lane, pc/d541-declined-instant, on main, after D540's merge. It carries one ladder player appended to tools/ai-ladder/players.json, search-v3-declined-instant (af6771947a25: search-v3-declined's params with instant=on added), the ladder test that holds its hash, the ladder guide's line, docs/decisions/D541-declined-instant.md and PLAN's rows; no file under bridge/src, tools/ai-bench or the ladder's code. The pilot checks by content that, against D540's merge (7ff7d6ab233e767f9c71639432250bfc66bc8aed, J214's pin), the only file changed under bridge/src, tools/ai-ladder and tools/ai-bench is tools/ai-ladder/players.json, by 2 lines in and 1 out, and that its players are D540's merge's with exactly this one appended, so the search is J214's code and every game is one code version, D341)
decides: D541 points 3 to 6, from the match line and its batch counters alone. A complete match reads exactly one of D519's four readings at 4,800 games: SHOWN (lo > 0.5 and elo >= +15), SMALL GAIN (lo > 0.5 and elo < +15), INCONCLUSIVE AT 4,800 (lo <= 0.5 and eloHi >= +15), NOT SHOWN (lo <= 0.5 and eloHi < +15). A match complete in every other part in which either key fired in fewer than 0.25 windows a game on A's side (search.p.declined.windows or search.p.instant.windows under 1,200 at 4,800 games) is NOT READ: no reading on the pair, both rates reported, and the player is not played again without a new decision. A match incomplete for any other reason (cut short, a B batch counter search.p.declined., search.p.instant. or search.p.lands. above 0, an A counter search.p.lands. above 0, among them) gets neither and is reposted alone under a new job id after its cause is found; a player the pilot's gate kept out is NOT PLAYED. SHOWN or SMALL GAIN names search-v3-declined-instant a live-seat candidate for the owner, decided under a separate decision and a seat-queue row (D509), with the cost (search seconds a game, A against B) reported beside it and never part of the reading; INCONCLUSIVE AT 4,800 is information and is not confirmed again; NOT SHOWN closes the candidate-list track for the confirm set (declined spells and the empty-stack instant-speed windows, these two keys and nothing beyond them; the land drop is closed by J214) and the next search lane is the value side. Whatever it reads, it does not say which key carried it, and this job never changes the live seat: SearchConfig.LIVE_DEFAULTS stays what=pa,anytime=1
hypothesis: registered as information before any game (D541's hypothesis; no check reads it). J214's two points, search-v3-declined +5.8 Elo [-4.6, +16.2] and search-v3-instant +10.4 [-0.7, +21.5] (each 1,200 games against search-v2-no-b, INCONCLUSIVE AT 1,200), are single draws picked because they were positive, so each true effect is more likely below its point than above; the six 1,200-game points of J212 and J214 (-1.7, +5.2, +9.8, +5.8, +10.4, +1.2) have a mean of +5.1 Elo and a standard deviation of 4.7, no wider than the noise each carries (5.3-6.6 Elo), which points the same way. If both were true as measured and added, the pair would be about +16 Elo; if each is near +5 and they add, about +10; if they overlap, about +5. At J211's 4,800-game score standard error (0.0039, about 2.7 Elo, an interval of about +-5.3), by the normal approximation: a true 0 reads SMALL GAIN 2.5% and NOT SHOWN 97.5%; +3 SMALL GAIN 19.7%; +5 SMALL GAIN 45.4%; +8 SHOWN 0.5% and SMALL GAIN 83.4% (84% together); +10 SHOWN 3.3% and SMALL GAIN 92.5%; +12 SHOWN 13.5%; +16 SHOWN 64.4%; +20 SHOWN 96.7%. INCONCLUSIVE AT 4,800 needs a score standard error of 0.0055 or more (an interval about 15 Elo wide) and cannot happen at the expected width; so a NOT SHOWN here says the pair is worth under about +10.6 Elo against the live seat, not nothing. Expected exposure, from J214: declined about 3 windows a game and instant about 1.8, both far above 0.25; with both keys on, the instant-speed windows also list declined spells, which neither J214 arm did, so the declined count may be higher
rule: D541 points 3 to 6, merged before any J215 game was played (written 2026-11-12 after J214's read), in their words (the decision's bold dropped, its list set as sentences): "The match is complete when its line names A and B in that order at their hashes, says complete: true, played all 4,800 games with engine errors plus timeouts at most 240 (one in 20, D519 point 2), and carries score, lo, elo, eloLo and eloHi; it was played on exactly the 600 blocks 519,900,000-519,900,599 with no other match's game in its folder; every batch line carried the two seat configs exactly (point 1's and search-v3's); both sides searched priority and attack decisions and neither searched a block; B's batch counters show no search.p.declined., search.p.instant. or search.p.lands. counter above 0 (D540's keys-off path); and A's show no search.p.lands. counter above 0 (its third key is off). An incomplete match gets no reading and is reposted alone under a new job id after its cause is found. NOT READ. A match complete in every other part in which either key fired in fewer than 0.25 windows a game on A's side -- search.p.declined.windows or search.p.instant.windows, summed over the match's batch lines, under 1,200 at 4,800 games (in integers, windows x 4 < played) -- gives no reading on the pair; the report gives both rates, and the player is not played again without a new decision. The readings, written before any game: D519's four at 4,800 games, exactly one for a complete match, in this precedence, compared as the line carries them (lo in integer ten-thousandths, Elo in integer tenths): SHOWN: lo above 0.5 and elo at least +15; SMALL GAIN: lo above 0.5 and elo below +15; INCONCLUSIVE AT 4,800: lo at most 0.5 and eloHi at least +15; NOT SHOWN: lo at most 0.5 and eloHi below +15. Beside the reading, deciding nothing: indistinguishable (the Elo interval holds 0), a measured loss (wholly below 0), a measured gain (wholly above). ... SHOWN or SMALL GAIN names search-v3-declined-instant a live-seat candidate for the owner, decided under a separate decision and a seat-queue row (D509), with the match's point, interval and cost (A's and B's search seconds a game and their ratio) beside it; the cost is reported and never part of the reading. INCONCLUSIVE AT 4,800 is information and is not confirmed again (D519 point 3). NOT SHOWN closes the candidate-list track for the confirm set -- the declined spells and the empty-stack instant-speed windows, these two keys and nothing beyond them (D540 point 13's untested arms, the stack windows, the windows Forge passes in and the activations Forge declines, are not judged by this match); the land drop is already closed by J214 -- and the next search lane is the value side. No reading changes the live seat." The players: A = search-v3-declined-instant (af6771947a25), B = search-v2-no-b (59505e241363). The match is never pooled with J214 (D541 point 8)
followup: morning-read
est: ~9.2 h at 7 workers (an estimate; range 8.5-10.5 h), 13.75 h at worst (the pilot and the match's own stop). From this host at 7 workers, alone, a 1,200-game match against the search's family takes about 0.47 h + 0.0436 h x both sides' search seconds a game (D537 point 11's fit; residual sd 0.15 h); at four times the games it put J211 at 9.01 h against its 8.57 and J197 at 9.41 h against its 9.50. B searched 18.8-19.1 s a game in J214; A about B's plus both J214 arms' extra seconds (0.6 for declined, 2.1 for instant), about 21.7 s, 21-23 s if the declined spells in the instant-speed windows add candidates there. Both sides 40-42 s a game: the match about 8.8-9.3 h. Pilot about 10 minutes (J214's took about 10 for 24 games; this one plays 8, after the build and the self-tests). About 10.5 h if memory pressure holds the night at 6 workers, 12.6 h at 5; the match stops itself at --hours 13.5 under the step's 14 h timeout, and a match that reaches its own stop reports complete: false and gets no reading
resumable: no
timeout: 14h
clean: var/j215 var/j215-tools var/j215-ladder var/ai-ladder-pilot/J215 var/ai-ladder/match-J215.json var/ai-bench/j215-pilot-rec
progress: metric j215_games games of 4800
metrics: j215_games = sh: node -e 'const fs=require("fs");const f="var/j215-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v3-declined-instant\"")&&l.includes("\"b\":\"search-v2-no-b\""))n++;console.log(n)'
metrics: j215_err = sh: node -e 'const fs=require("fs");const f="var/j215-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v3-declined-instant\"")&&l.includes("\"b\":\"search-v2-no-b\"")&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cm = sh: cat var/ai-ladder/match-J215.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: bs = sh: cat var/j215/seeds.json 2>/dev/null || echo '{"games":0,"blocks":0,"min":0,"max":0,"fullBlocks":0,"otherGames":-1,"registered":0}'
metrics: v = sh: cat var/j215/v.json 2>/dev/null || echo '{"written":0,"complete":0,"incomplete":1,"notRead":0,"notPlayed":0,"shown":0,"smallGain":0,"inconclusive4800":0,"notShown":0,"liveSeatCandidate":0,"trackClosed":0,"indistinguishable":0,"measuredLoss":0,"measuredGain":0,"liveSeatChanged":1,"declinedWindowsPerGame":0,"instantWindowsPerGame":0,"declinedChangedPerGame":0,"instantChangedPerGame":0,"aSecPerGame":0,"bSecPerGame":0,"costRatio":0}'
headline: cm.played, cm.score, cm.lo, cm.hi, cm.elo, cm.eloLo, cm.eloHi, v.shown, v.smallGain, v.inconclusive4800, v.notShown, v.notRead, v.notPlayed, v.incomplete, v.indistinguishable, v.measuredLoss, v.measuredGain, v.declinedWindowsPerGame, v.instantWindowsPerGame, v.declinedChangedPerGame, v.instantChangedPerGame, v.aSecPerGame, v.bSecPerGame, v.costRatio, v.liveSeatCandidate, v.trackClosed, bs.min, bs.max

**Why this job** (D541; J214). J214 played D540's three widenings of what the priority search considers, one key
each, 1,200 games each against the live seat: `search-v3-declined` +5.8 Elo [-4.6, +16.2] and `search-v3-instant`
+10.4 [-0.7, +21.5], both INCONCLUSIVE AT 1,200, `search-v3-lands` +1.2 [-9.6, +11.9], NOT SHOWN; no candidate.
Every single change to the search since J211 has read between about -2 and +10 Elo, and a 1,200-game match (about
+-11 Elo) cannot resolve that. The two positive keys are config keys of one player, so this night plays them
together, once, at the size that can read an effect of that order: one 4,800-game match on deals nobody has played,
under a rule written before its games. It is not a confirmation of either J214 arm and is never pooled with J214.

**What it does not do.** It does not change the live seat, propose a change, tune anything, pool its games with
J214's, read itself against a J214 arm, or say which key carried a reading. It does not read any outcome by deck or
by deal.

**What is played.** One `ai-ladder.sh match`: 4,800 games, 2,400 mirrored pairs in 600 batches of 8 on the confirm
deck set (`tools/ai-bench/pairs-confirm.txt`), no stopping rule on the score (D398), at `--game-timeout 900`:
- A = `search-v3-declined-instant` (`af6771947a25`):
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1`;
- B = `search-v2-no-b` (`59505e241363`, search-v3, the live seat since D539):
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1`.

With both keys on, an instant-speed window (outside A's own main phases, on an empty stack, where Forge plays a
non-land, non-mana play) lists the declined spells too, aimed by Forge's own targeting: one thing neither J214 arm
searched (D541's *Context*). `search.p.declined.windows` counts such a window as well as an own-main one.

**The deals** (D541 point 2). The match runs with `--host j215` in a ladder folder of its own, `var/j215-ladder`,
emptied by its step before it starts, so it takes the 600 blocks **519,900,000-519,900,599** (`hostBase('j215')` is
519,000,000; an emptied folder's first match block is its base plus 900,000, `nextBseed`) on a first run and on a
retry after a memory stop. These blocks are new: of the 350,620 ladder result rows under the lab's four checkouts'
`var/` on 2026-11-12, none is on base 519 (the rows are on 114, this host's own, where J194 to J212 played; 416,
J214's; 931, J211's; and the pilot hosts' bases); no job file in this folder names `--host j215` or a block on that
base; and the pilot host here, `j215-pilot`, has base 912,000,000, on which no row lies either. 600 consecutive
blocks give each of the confirm set's 30 deck pairs exactly 40 batches, 160 games, in both seat orders
(`batchPairs`). The block reader checks the range after the match and the verdict refuses any other.

**The readings** (D541 points 3 to 5): D519's four at 4,800 games, exactly one for a complete match; NOT READ when
the match is complete in every other part but either key fired in fewer than 0.25 windows a game on A's side (1,200
at 4,800); INCOMPLETE, owed a repost under a new job id after its cause is found, for anything else, a B that shows
any D540 counter above 0 or an A that shows a `search.p.lands.` counter above 0 among them (a keys-off path fired: a
code fault, not the player's exposure), whatever the rate. Beside the reading, deciding nothing: indistinguishable, a
measured loss or a measured gain.

**Beside the reading, as description only** (D541 point 9): each side's searched decisions by kind and ms a
searched decision; search seconds a game and their ratio; each key's windows a game, candidates a window, changes a
game and `search.p.<key>.retry` a game; the declined spells listed and dropped for no legal target; priority
overrides by direction a priority decision; the land windows left to Forge a game; and, never pooled, J214's two
arms' lines as they were. On an INCOMPLETE match the exposure is printed too.

**When it runs.** Alone (`alone: yes`, D521): both players think against a wall clock.

## Pilot
About 10 minutes:
- the pin is merged;
- the build (the lint and its self-test, javac, the decision self-test, 472 checks at D540's merge and this pin),
  the ai-bench self-test (its D540 lines kept in `var/j215-tools/d540-selftest.txt` whatever they say) and the
  ladder registry test (which holds the new player's params, seat config and hash);
- `ai-ladder.sh list` resolves the five players (the anchor, search-v2-no-b, J214's two positive arms and the new
  player) at their registered hashes, checked as strings, and the new player's seat config is exactly B's plus
  `,declined=1,instant=1`;
- the code, by content: against D540's merge the only file changed under `bridge/src`, `tools/ai-ladder` and
  `tools/ai-bench` is `tools/ai-ladder/players.json` (2 lines in, 1 out), its players D540's with exactly this one
  appended, and git answered;
- the `j215` host's seed base is 519,000,000 and an empty folder's first match block 519,900,000;
- the exposure reader, the verdict, the block, rollout and recording readers and the gate written, and each tested
  on synthetic files;
- one 4-game ladder match of the new player against search-v2-no-b, one batch pair, one worker, in its own pilot
  folder under `--host j215-pilot`: both sides search priority and attacks and no block, the match line names A and
  B at their hashes, the batch lines carry the two seat configs exactly, B's D540 counters are all 0 and A's
  `search.p.lands.` counters are all 0 (either stops the night);
- one recorded run of 4 games against Forge Default (the confirm set's first deck pair, two workers), whose decision
  records give the searched priority decisions by window (own main, land, instant-speed) and their ms by candidate
  count, printed, and checked only for what must hold: no searched priority decision on a non-empty stack and none
  in a land window, and no `search.p.lands.` counter in A's bench lines;
- **the gate** (D541 point 10): the match is played only if both keys' `search.p.<key>.windows`, each summed over
  the 4 ladder games and the 4 recorded games, are above 0, none of the 8 games ended in an engine error or a
  timeout, and the two keys' `search.p.<key>.retry` together are at most 2 a game. `var/j215-tools/gate.json` says
  whether the match plays and, if not, the condition it failed; the match step then writes
  `var/ai-ladder/match-J215.json` as `{"notPlayed": true, "reason": ...}` (with the match metrics' zeros beside it,
  so every metric reads a number), plays nothing, and the report says so. The gate is not a pilot failure.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j215-merged.txt || echo 0 > var/j215-merged.txt
cat var/j215-merged.txt
rc=0; ./bridge/build.sh > var/j215-build.txt 2>&1 || rc=$?
cat var/j215-build.txt
# the build's decision self-test: its line, with 0 failures (472 at D540's merge; D541 changes no bridge source)
node -e 'const fs=require("fs");const t=fs.readFileSync("var/j215-build.txt","utf8");const m=/^decision selftest: (\d+) check\(s\), (\d+) failure\(s\)$/m.exec(t);const r={ok:m&&m[2]==="0"?1:0,checks:m?Number(m[1]):0,failures:m?Number(m[2]):-1};fs.writeFileSync("var/j215-decision-selftest.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
test "$rc" -eq 0
mkdir -p var/j215-tools
# the ai-bench self-test; its D540 lines are kept in d540-selftest.txt whatever they say, then it must have passed
brc=0; ./tools/ai-bench.sh --selftest > var/j215-tools/bench-selftest.txt 2>&1 || brc=$?
grep -iE 'd540' var/j215-tools/bench-selftest.txt > var/j215-tools/d540-selftest.txt || true
cat var/j215-tools/d540-selftest.txt
tail -3 var/j215-tools/bench-selftest.txt
test "$brc" -eq 0
node --test web/test/ai-ladder.test.ts
```
```bash
# the five players resolve at their registered hashes (compared as strings); the new player's seat config is exactly
# B's plus ,declined=1,instant=1 (J214's players check, names changed)
mkdir -p var/j215-tools
./tools/ai-ladder.sh list > var/j215-tools/players.txt
grep -E '^(forge-default|search-v2-no-b|search-v3-declined|search-v3-instant|search-v3-declined-instant) ' var/j215-tools/players.txt || true
node - <<'J215EOF'
// J215's pilot: the players resolve, at their registered hashes (compared as strings), and search-v3-declined-instant's
// seat config is search-v2-no-b's (search-v3, the live seat since D539) with exactly ,declined=1,instant=1 appended
// (D541 point 1). J214's two positive arms are checked too: the new player is their two keys, and they are unchanged.
const fs = require('fs');
const L = fs.readFileSync('var/j215-tools/players.txt', 'utf8').split('\n');
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
  'search-v3-declined-instant': { hash: 'af6771947a25', cfg: V3 + ',declined=1,instant=1', kind: 'search' },
};
// D541 point 1's two seat configs, written out, so the concatenation above cannot drift with them
const LITERAL = {
  'search-v2-no-b': 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1',
  'search-v3-declined-instant': 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1',
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
fs.writeFileSync('var/j215-tools/players.json', JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J215EOF
# the j215 host's seed base (D541 point 2): hostBase('j215') is 519,000,000, so an empty folder's first match block is
# 519,900,000 and the 600th 519,900,599; the pilot's host name has another base
cat > var/j215-tools/base.mjs <<'J215EOF'
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const S = await import(pathToFileURL(path.resolve('tools/ai-ladder/schedule.ts')).href);
const own = S.hostBase('j215'), pilot = S.hostBase('j215-pilot');
const first = S.nextBseed(own + 900000, new Set());
const r = { own, first, last: first + 599, pilot, ok: own === 519000000 && first === 519900000 && pilot !== own ? 1 : 0 };
fs.mkdirSync('var/j215-tools', { recursive: true });
fs.writeFileSync('var/j215-tools/base.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J215EOF
node var/j215-tools/base.mjs
```
```bash
# the code since D540's merge (J214's pin) under the paths a match runs: tools/ai-ladder/players.json alone, 2 lines
# in and 1 out, and its players D540's with exactly search-v3-declined-instant appended
mkdir -p var/j215-tools
D540=7ff7d6ab233e767f9c71639432250bfc66bc8aed
git diff --name-only "$D540" HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j215-tools/src-diff.txt && echo 0 > var/j215-tools/src-diff.rc || echo 1 > var/j215-tools/src-diff.rc
git diff --numstat "$D540" HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j215-tools/src-numstat.txt && echo 0 > var/j215-tools/src-numstat.rc || echo 1 > var/j215-tools/src-numstat.rc
git show "$D540:tools/ai-ladder/players.json" > var/j215-tools/players-d540.json && echo 0 > var/j215-tools/players-d540.rc || echo 1 > var/j215-tools/players-d540.rc
node - <<'J215EOF'
const fs = require('fs');
const files = fs.readFileSync('var/j215-tools/src-diff.txt', 'utf8').split('\n').filter(Boolean).sort();
const rcOf = (f) => Number(fs.readFileSync(f, 'utf8').trim());
const rc = rcOf('var/j215-tools/src-diff.rc') === 0 && rcOf('var/j215-tools/src-numstat.rc') === 0 && rcOf('var/j215-tools/players-d540.rc') === 0 ? 0 : 1;
const num = {};
for (const l of fs.readFileSync('var/j215-tools/src-numstat.txt', 'utf8').split('\n').filter(Boolean)) {
  const [a, d, f] = l.split('\t');
  num[f] = { add: Number(a), del: Number(d) };
}
const P = 'tools/ai-ladder/players.json';
const at = (f, x) => (num[f] ? num[f][x] : -1);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const was = read('var/j215-tools/players-d540.json'), now = read(P);
const wl = was && Array.isArray(was.players) ? was.players : null, nl = now && Array.isArray(now.players) ? now.players : null;
// the registry at the pin is D540's, player for player, with exactly one player appended: the new one
const onePlayer = wl && nl && nl.length === wl.length + 1
  && wl.every((p, i) => JSON.stringify(p) === JSON.stringify(nl[i]))
  && nl[nl.length - 1].name === 'search-v3-declined-instant'
  && JSON.stringify(Object.keys(was).sort()) === JSON.stringify(Object.keys(now).sort()) ? 1 : 0;
const r = { files, count: files.length, rc, exact: JSON.stringify(files) === JSON.stringify([P]) ? 1 : 0,
  playersAdd: at(P, 'add'), playersDel: at(P, 'del'), onePlayer, playersBefore: wl ? wl.length : -1, playersAfter: nl ? nl.length : -1 };
fs.writeFileSync('var/j215-tools/src-diff.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J215EOF
```
```bash
# the exposure reader: for one match folder, the summed D540 counters of each side from the batch lines' aStats and
# bStats (config A is the match's first player), both keys' exposure, B's keys-off check and A's lands-off check
mkdir -p var/j215-tools
cat > var/j215-tools/exposure.cjs <<'J215EOF'
// J215 (D541 points 3 and 4): the pair's exposure. J214's exposure reader with two keys read at once and one more
// keys-off check. Sums, for each side of one match, every batch line's counters whose key starts with
// search.p.declined., search.p.instant. or search.p.lands., plus search.p.considered, search.a.considered,
// search.p.skipLand and search.b.considered. For each of A's two keys (declined, instant): its windows, candidates,
// changes and retries (and for declined the aimed spells listed and dropped). `declinedExposed` and `instantExposed`
// are 1 when that key's windows are at least 0.25 a game played (compared in integers, windows x 4 >= games: 1,200 at
// 4,800), `exposed` 1 when both are; `bClean` 1 when no D540 counter of B's is above 0 (`bD540` counts those that
// are); `aLandsClean` 1 when no search.p.lands. counter of A's is above 0 (`aLands` counts those that are: A's third
// key is off); `kindsOk` 1 when both sides searched priority and attacks and neither searched a block. A game is a
// batch line.
// usage: node exposure.cjs <ladder dir> <match.json> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : '';
const bdir = `${dir}/batches/${run}`;
const D540 = /^search\.p\.(declined|instant|lands)\./;
const LANDS = /^search\.p\.lands\./;
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
const A = (key, x) => sum.a[`search.p.${key}.${x}`] || 0;
const bD540 = Object.entries(sum.b).filter(([x, v]) => D540.test(x) && v > 0).length;
const aLands = Object.entries(sum.a).filter(([x, v]) => LANDS.test(x) && v > 0).length;
const pos = (x) => (x || 0) > 0;
const r3 = (x) => Math.round(x * 1000) / 1000;
const pg = (x) => (games ? r3(x / games) : null);
const r = { run, matchPlayed: m && typeof m.played === 'number' ? m.played : null, lines, games, a: sum.a, b: sum.b };
for (const key of ['declined', 'instant']) {
  const w = A(key, 'windows');
  Object.assign(r, {
    [`${key}Windows`]: w, [`${key}Cands`]: A(key, 'cands'), [`${key}Changed`]: A(key, 'changed'), [`${key}Retry`]: A(key, 'retry'),
    [`${key}Fired`]: w > 0 ? 1 : 0, [`${key}Exposed`]: games > 0 && w * 4 >= games ? 1 : 0,
    [`${key}WindowsPerGame`]: pg(w), [`${key}CandsPerWindow`]: w ? Math.round((A(key, 'cands') / w) * 100) / 100 : null,
    [`${key}ChangedPerGame`]: pg(A(key, 'changed')), [`${key}RetryPerGame`]: pg(A(key, 'retry')),
  });
}
Object.assign(r, {
  declinedListed: A('declined', 'listed'), declinedNoTarget: A('declined', 'noTarget'),
  declinedListedPerGame: pg(A('declined', 'listed')), declinedNoTargetPerGame: pg(A('declined', 'noTarget')),
  exposed: r.declinedExposed === 1 && r.instantExposed === 1 ? 1 : 0,
  bD540, bClean: bD540 === 0 ? 1 : 0, aLands, aLandsClean: aLands === 0 ? 1 : 0,
  kindsOk: pos(sum.a['search.p.considered']) && pos(sum.b['search.p.considered'])
    && pos(sum.a['search.a.considered']) && pos(sum.b['search.a.considered'])
    && (sum.a['search.b.considered'] || 0) === 0 && (sum.b['search.b.considered'] || 0) === 0 ? 1 : 0,
});
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J215EOF
# its self-test, on synthetic batch folders of 8 games: (1) both keys at 1 window a game and B clean but for a D540
# counter at 0 (exposed, clean, both kinds); (2) B with a D540 counter above 0 (bClean 0); (3) A with a lands counter
# above 0 (aLandsClean 0); (4) declined at exactly 0.25 a game (2 in 8) and instant at 1 in 8 (declined exposed,
# instant not, the pair not); (5) A with no attack search (kindsOk 0). Writes var/j215-tools/exposure-selftest.json
rm -rf var/j215-tools/exposure-selftest
node - <<'J215EOF'
const fs = require('fs');
const { execFileSync } = require('child_process');
const S = 'var/j215-tools/exposure-selftest';
const line = (a, b) => JSON.stringify({ a: 'X', b: 'Y', aStats: { counts: a }, bStats: { counts: b } });
const base = () => ({ 'search.p.considered': 9, 'search.a.considered': 2, 'search.p.skipLand': 3 });
const mk = (name, rows) => {
  const d = `${S}/${name}`;
  fs.mkdirSync(`${d}/batches/run-${name}`, { recursive: true });
  fs.writeFileSync(`${d}/match.json`, JSON.stringify({ id: `j215:run-${name}`, played: rows.length }));
  fs.writeFileSync(`${d}/batches/run-${name}/b0.jsonl`, rows.slice(0, 4).map(([a, b]) => line(a, b)).join('\n') + '\n');
  fs.writeFileSync(`${d}/batches/run-${name}/b1.jsonl`, rows.slice(4).map(([a, b]) => line(a, b)).join('\n') + '\n');
  execFileSync(process.execPath, ['var/j215-tools/exposure.cjs', d, `${d}/match.json`, `${d}/out.json`], { stdio: 'ignore' });
  return JSON.parse(fs.readFileSync(`${d}/out.json`, 'utf8'));
};
const rows = (f) => Array.from({ length: 8 }, (_, i) => f(i));
const D = () => ({ 'search.p.declined.windows': 1, 'search.p.declined.cands': 2, 'search.p.declined.listed': 2, 'search.p.declined.noTarget': 1 });
const I = () => ({ 'search.p.instant.windows': 1, 'search.p.instant.cands': 3, 'search.p.instant.changed': 1 });
const A1 = () => ({ ...base(), ...D(), ...I() });
const B0 = () => ({ ...base(), 'search.p.declined.listed': 0 });
const c1 = mk('c1', rows(() => [A1(), B0()]));
const c2 = mk('c2', rows((i) => [A1(), i === 3 ? { ...B0(), 'search.p.instant.windows': 1 } : B0()]));
const c3 = mk('c3', rows((i) => [i === 5 ? { ...A1(), 'search.p.lands.windows': 1 } : A1(), B0()]));
const c4 = mk('c4', rows((i) => [{ ...base(), ...(i === 2 || i === 6 ? D() : {}), ...(i === 4 ? I() : {}) }, B0()]));
const noA = () => { const x = A1(); delete x['search.a.considered']; return x; };
const c5 = mk('c5', rows(() => [noA(), B0()]));
const cases = [
  ['both keys 1 window a game, B clean (a D540 counter at 0 is clean): exposed, clean, both kinds', c1.games === 8 && c1.lines === 8 && c1.declinedWindows === 8 && c1.instantWindows === 8 && c1.declinedWindowsPerGame === 1 && c1.instantCandsPerWindow === 3 && c1.declinedCands === 16 && c1.declinedListed === 16 && c1.declinedNoTarget === 8 && c1.instantChanged === 8 && c1.declinedExposed === 1 && c1.instantExposed === 1 && c1.exposed === 1 && c1.bClean === 1 && c1.bD540 === 0 && c1.aLandsClean === 1 && c1.aLands === 0 && c1.kindsOk === 1],
  ['B with search.p.instant.windows 1 in one game: not clean', c2.bClean === 0 && c2.bD540 === 1 && c2.exposed === 1 && c2.aLandsClean === 1],
  ['A with search.p.lands.windows 1 in one game: A not lands-clean', c3.aLandsClean === 0 && c3.aLands === 1 && c3.bClean === 1 && c3.exposed === 1],
  ['declined 2 in 8 (exactly 0.25) is exposed, instant 1 in 8 is not, so the pair is not', c4.declinedWindows === 2 && c4.declinedExposed === 1 && c4.declinedWindowsPerGame === 0.25 && c4.instantWindows === 1 && c4.instantFired === 1 && c4.instantExposed === 0 && c4.exposed === 0],
  ['A with no attack search: kindsOk 0', c5.kindsOk === 0 && c5.exposed === 1 && c5.bClean === 1],
];
let passed = 0;
for (const [what, ok] of cases) { console.error(`${ok ? 'ok  ' : 'FAIL'} ${what}`); passed += ok ? 1 : 0; }
const r = { ok: passed === cases.length ? 1 : 0, cases: cases.length, passed };
fs.writeFileSync('var/j215-tools/exposure-selftest.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J215EOF
```
```bash
mkdir -p var/j215-tools
cat > var/j215-tools/verdict.mjs <<'J215EOF'
// J215's reading, pre-registered in D541 (points 2 to 6, written 2026-11-12 before any J215 game; the job's rule: line;
// D398's fixed match; D519's four readings at 4,800 games, rewritten for this match as D519 point 6 asks; D540's
// completeness parts and exposure condition, for both keys).
// usage: node verdict.mjs <match.json> <j215 dir> <out.json>        node verdict.mjs --selftest <scratch dir>
//   <match.json> is the match line (or the match step's {"notPlayed": true, "reason": ...}); <j215 dir>/seeds.json
//   is the block reader's file, rollouts.json the rollout reader's and exposure.json the exposure reader's.
// THE MATCH: search-v3-declined-instant (config A, search-v3 with declined=1 and instant=1) against search-v2-no-b
//   (config B, search-v3, the live seat since D539), 4,800 games, 2,400 mirrored pairs, the confirm set, no stopping
//   rule, under --host j215 in a ladder folder of its own (var/j215-ladder, emptied by its step), so on deal blocks
//   519,900,000-519,900,599. A new player on new deals: never pooled with J214.
// EXACTLY ONE OUTCOME, in this precedence:
//   NOT PLAYED   the pilot's gate (D541 point 10) kept the match out: the match file says notPlayed.
//   INCOMPLETE   any part of D541 point 3's completeness fails: the line does not name A and B in that order at their
//                registered hashes, or does not say complete: true, or played fewer than 4,800 games, or errors +
//                timeouts > 240 (one in 20), or lacks score, lo, elo, eloLo or eloHi, or the block reader did not find
//                the match's 4,800 games on exactly the 600 blocks 519,900,000-519,900,599 with no other match's game
//                in the folder, or a batch line did not carry A's and B's seat configs exactly, or a side did not
//                search priority and attacks or searched a block, or the exposure reader did not read this match's
//                4,800 batch lines, or B's batch counters show any search.p.declined., search.p.instant. or
//                search.p.lands. counter above 0, or A's show a search.p.lands. counter above 0 (a keys-off path
//                fired: a code fault), whatever the rate. No reading and not NOT READ: owed a repost alone under a new
//                job id after the cause is found. A match cut short and under the rate is INCOMPLETE; its rates are
//                still reported, as description.
//   NOT READ     every other part holds, but search.p.declined.windows or search.p.instant.windows on A's side,
//                summed over the match, is under 0.25 a game played (windows x 4 < played: under 1,200 at 4,800),
//                D541 point 4. No reading on the pair; both rates reported; not played again without a new decision.
//   one of D519's four readings, for a COMPLETE match, compared as the line carries them, lo in integer
//   ten-thousandths and Elo in integer tenths:
//     SHOWN                  lo > 0.5 and elo >= 15
//     SMALL GAIN             lo > 0.5 and elo < 15
//     INCONCLUSIVE AT 4,800  lo <= 0.5 and eloHi >= 15
//     NOT SHOWN              lo <= 0.5 and eloHi < 15
//   SHOWN and SMALL GAIN make search-v3-declined-instant a LIVE-SEAT CANDIDATE for the owner (liveSeatCandidate 1), to
//   be decided under a separate decision and a seat-queue row (D509), with the cost beside it; NOT SHOWN closes the
//   candidate-list track for the confirm set (trackClosed 1); INCONCLUSIVE AT 4,800 is information, not confirmed
//   again. Nothing here changes the live seat (liveSeatChanged is 0 in every outcome).
// DESCRIPTIVE, deciding nothing, exactly one for a complete match: "a measured loss" (eloHi < 0), "a measured gain"
//   (eloLo > 0), "indistinguishable" otherwise (an end of exactly 0 holds 0).
// BESIDE EVERY OUTCOME, never changing one (D541 point 9): each key's exposure a game (windows, candidates a window,
//   changes, retries; for declined the aimed spells listed and dropped), each side's searched decisions by kind and ms
//   a searched decision, search seconds a game and their ratio, the priority overrides by direction a priority
//   decision and the land windows left to Forge a game.
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 4800;
export const BAR = GAMES / 20;
export const FIRST = 519900000;
export const BLOCKS = 600;
export const LAST = FIRST + BLOCKS - 1;
export const A = 'search-v3-declined-instant';
export const AH = 'af6771947a25';
export const ACFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1';
export const B = 'search-v2-no-b';
export const BH = '59505e241363';
export const BCFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1';
const KEYS = ['declined', 'instant'];

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const kinds = (t) => ({ p: num(t?.byKind?.p?.searched) ?? 0, a: num(t?.byKind?.a?.searched) ?? 0, b: num(t?.byKind?.b?.searched) ?? 0 });
const secPerGame = (t, played) => {
  const ms = num(t?.msPerDecision), n = num(t?.searched), g = num(played);
  return ms !== null && n !== null && g !== null && g > 0 ? Math.round((ms * n) / g) / 1000 : null;
};
const r3 = (x) => Math.round(x * 1000) / 1000;
const per = (x, n) => (num(x) !== null && num(n) !== null && n > 0 ? r3(x / n) : null);

export function verdict(m, bs, ro, ex) {
  const notPlayed = m !== null && m.notPlayed === true ? 1 : 0;
  const names = !notPlayed && m !== null && m.a === A && m.b === B ? 1 : 0;
  const hashes = !notPlayed && m !== null && String(m.ah) === AH && String(m.bh) === BH ? 1 : 0;
  const ak = kinds(m?.aSearch), bk = kinds(m?.bSearch);
  const kindsOk = !notPlayed && m !== null && ak.p > 0 && ak.a > 0 && ak.b === 0 && bk.p > 0 && bk.a > 0 && bk.b === 0 ? 1 : 0;
  const purpose = typeof m?.id === 'string' ? `match:${m.id}` : null;
  const run = typeof m?.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : null;
  const blocks = bs !== null && purpose !== null && bs.purpose === purpose && bs.games === GAMES && bs.blocks === BLOCKS
    && bs.min === FIRST && bs.max === LAST && bs.otherGames === 0 ? 1 : 0;
  const cfgs = ro !== null && typeof ro.lines === 'number' && ro.lines === GAMES && ro.cfgExact === GAMES
    && ro.aCfg === ACFG && ro.bCfg === BCFG ? 1 : 0;
  // the exposure reader's file is this match's when it names the match's run; it is the whole match when it read
  // all 4,800 batch lines
  const exThis = ex !== null && run !== null && ex.run === run && num(ex.games) !== null
    && num(ex.declinedWindows) !== null && num(ex.instantWindows) !== null;
  const exposureRead = exThis && ex.games === GAMES ? 1 : 0;
  const bClean = exThis && ex.bClean === 1 && ex.bD540 === 0 ? 1 : 0;
  const aLandsClean = exThis && ex.aLandsClean === 1 && ex.aLands === 0 ? 1 : 0;
  const s = {
    a: A, b: B, match: m === null ? 0 : 1, names, hashes, kindsOk, blocks, cfgs, exposureRead, bClean, aLandsClean,
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
    && s.eloHi !== null && blocks === 1 && cfgs === 1 && kindsOk === 1 && exposureRead === 1 && bClean === 1 && aLandsClean === 1;
  // the exposure, as description for every match it was read on (a cut-short one included), and as D541 point 4's
  // condition for a match complete in every other part
  const E = exThis ? ex : null, g = E ? E.games : null;
  const exposure = { exGames: g };
  for (const k of KEYS) {
    const w = E ? num(E[`${k}Windows`]) ?? 0 : null;
    const c = (x) => (E ? num(E[`${k}${x}`]) ?? 0 : null);
    Object.assign(exposure, {
      [`${k}Windows`]: w, [`${k}WindowsPerGame`]: per(w, g), [`${k}Cands`]: c('Cands'),
      [`${k}CandsPerWindow`]: E && w > 0 ? Math.round((c('Cands') / w) * 100) / 100 : null,
      [`${k}Changed`]: c('Changed'), [`${k}ChangedPerGame`]: per(c('Changed'), g),
      [`${k}Retry`]: c('Retry'), [`${k}RetryPerGame`]: per(c('Retry'), g),
      // at the rate: windows x 4 >= games played, in integers (1,200 at 4,800)
      [`${k}Exposed`]: E && s.played > 0 && w * 4 >= s.played ? 1 : 0,
    });
  }
  Object.assign(exposure, {
    declinedListed: E ? num(E.declinedListed) ?? 0 : null, declinedListedPerGame: per(E ? E.declinedListed : null, g),
    declinedNoTarget: E ? num(E.declinedNoTarget) ?? 0 : null, declinedNoTargetPerGame: per(E ? E.declinedNoTarget : null, g),
    bD540: E ? num(E.bD540) : null, aLands: E ? num(E.aLands) : null,
  });
  const exposed = exposure.declinedExposed === 1 && exposure.instantExposed === 1 ? 1 : 0;
  const complete = parts && exposed === 1 ? 1 : 0;
  const notRead = parts && complete === 0 ? 1 : 0;
  const incomplete = notPlayed === 0 && !parts ? 1 : 0;
  const ok = complete === 1;
  const LO = ok ? Math.round(s.lo * 10000) : 0, EL10 = ok ? Math.round(s.eloLo * 10) : 0;
  const E10 = ok ? Math.round(s.elo * 10) : 0, EH = ok ? Math.round(s.eloHi * 10) : 0;
  const shown = ok && LO > 5000 && E10 >= 150 ? 1 : 0;
  const smallGain = ok && LO > 5000 && E10 < 150 ? 1 : 0;
  const inconclusive4800 = ok && LO <= 5000 && EH >= 150 ? 1 : 0;
  const notShown = ok && LO <= 5000 && EH < 150 ? 1 : 0;
  const liveSeatCandidate = shown || smallGain ? 1 : 0;
  const trackClosed = notShown;
  const measuredLoss = ok && EH < 0 ? 1 : 0;
  const measuredGain = ok && EL10 > 0 ? 1 : 0;
  const indistinguishable = ok && measuredLoss === 0 && measuredGain === 0 ? 1 : 0;
  const reading = !ok ? null : shown ? 'SHOWN' : smallGain ? 'SMALL GAIN' : inconclusive4800 ? 'INCONCLUSIVE AT 4,800' : 'NOT SHOWN';
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
  const d = (x) => (x === null || x === undefined ? '-' : x);
  const expo = `declined ${d(exposure.declinedWindows)} windows over ${d(g)} games (${d(exposure.declinedWindowsPerGame)} a game), ${d(exposure.declinedCandsPerWindow)} candidates a window, ${d(exposure.declinedChanged)} changes, ${d(exposure.declinedRetryPerGame)} retries a game, aimed spells listed ${d(exposure.declinedListed)} and dropped ${d(exposure.declinedNoTarget)}; instant ${d(exposure.instantWindows)} windows (${d(exposure.instantWindowsPerGame)} a game), ${d(exposure.instantCandsPerWindow)} candidates a window, ${d(exposure.instantChanged)} changes, ${d(exposure.instantRetryPerGame)} retries a game; 0.25 a game is each key's rate`;
  const cost = costRatio === null ? 'no cost read'
    : `${aSecPerGame} against ${bSecPerGame} search seconds a game (x${costRatio}), ${s.aMs} against ${s.bMs} ms a searched decision`;
  const why = s.match === 0 ? 'NO MATCH' : names === 0 ? 'NOT THIS MATCH (names)' : hashes === 0 ? 'NOT THESE PLAYERS (hashes)'
    : m.complete !== true ? 'STOPPED (complete: false)' : s.played !== GAMES ? `NOT ALL 4,800 GAMES (${s.played})`
    : (s.errors ?? 0) + (s.timeouts ?? 0) > BAR ? 'ERRORS AND TIMEOUTS OVER 240'
    : [s.score, s.lo, s.elo, s.eloLo, s.eloHi].some((x) => x === null) ? 'A NUMBER MISSING FROM THE LINE'
    : cfgs === 0 ? 'NOT THESE SEAT CONFIGS' : blocks === 0 ? 'NOT THE REGISTERED DEAL BLOCKS'
    : kindsOk === 0 ? 'A SIDE DID NOT SEARCH PRIORITY AND ATTACKS, OR SEARCHED A BLOCK'
    : exposureRead === 0 ? 'NO EXPOSURE READ ON THIS MATCH'
    : bClean === 0 ? `B SHOWED ${d(exposure.bD540)} D540 COUNTER(S) ABOVE 0: A KEYS-OFF PATH FIRED`
    : aLandsClean === 0 ? `A SHOWED ${d(exposure.aLands)} LANDS COUNTER(S) ABOVE 0: A KEYS-OFF PATH FIRED` : 'INCOMPLETE';
  const notReadWhy = KEYS.filter((k) => exposure[`${k}Exposed`] !== 1)
    .map((k) => `A's search.p.${k}.windows ${exposure[`${k}Windows`]} over ${s.played} games, ${exposure[`${k}WindowsPerGame`]} a game, under 0.25 (1,200 at 4,800)`).join('; ');
  const line = notPlayed ? `${A}: NOT PLAYED: the pilot's gate (D541 point 10): ${m.reason ?? 'no reason given'}; no reading; the live seat is unchanged`
    : incomplete ? `${A}: INCOMPLETE (${why}): no reading, and not NOT READ; ${s.played} of 4,800 games; ${expo}; B's D540 counters above 0: ${d(exposure.bD540)}, A's lands counters above 0: ${d(exposure.aLands)} (description only); owed: a repost alone under a new job id after its cause is found; the live seat is unchanged`
    : notRead ? `${A}: NOT READ: ${notReadWhy}; ${expo}; no reading on the pair; not played again without a new decision; the live seat is unchanged`
    : `${A}: ${reading} (${word}): ${s.elo} Elo [${s.eloLo}, ${s.eloHi}], score ${s.score} [${s.lo}, ${s.hi}], against ${B}; ${expo}; ${cost}; ${liveSeatCandidate ? 'a live-seat candidate for the owner, under a separate decision and a seat-queue row (D509)' : trackClosed ? 'not a candidate; the candidate-list track closes for the confirm set' : 'not a candidate; information, not confirmed again'}; the live seat is unchanged`;
  return { ...s, notPlayed, incomplete, notRead, complete, exposed, shown, smallGain, inconclusive4800, notShown,
    liveSeatCandidate, trackClosed, measuredLoss, measuredGain, indistinguishable, outcome, reading, word,
    reason: notPlayed ? m.reason ?? null : null, ...exposure, aSecPerGame, bSecPerGame, costRatio, desc, line,
    written: 1, games: GAMES, bar: BAR, first: FIRST, last: LAST, liveSeatChanged: 0 };
}

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const T = (o = {}) => ({ games: GAMES, searched: 106000, changed: 19000, msPerDecision: 930,
    byKind: { p: { searched: 81000 }, a: { searched: 25000 } }, msMean: { p: 940, a: 890 }, ...o });
  const mk = (o = {}) => ({ id: 'j215:run-s', host: 'j215', a: A, b: B, ah: AH, bh: BH, complete: true,
    played: GAMES, planned: GAMES, errors: 0, timeouts: 0, pairs: 2400, score: 0.5042, lo: 0.497, hi: 0.5113, elo: 2.9, eloLo: -2.1,
    eloHi: 7.9, aSearch: T({ msPerDecision: 980, searched: 110000 }), bSearch: T(), ...o });
  const SD = (o = {}) => ({ purpose: 'match:j215:run-s', games: GAMES, blocks: BLOCKS, min: FIRST, max: LAST, fullBlocks: BLOCKS, otherGames: 0, ...o });
  const RO = (o = {}) => ({ lines: GAMES, cfgExact: GAMES, aCfg: ACFG, bCfg: BCFG, aFromPass: 0.08, aToOther: 0.06, aToPass: 0.05,
    bFromPass: 0.08, bToOther: 0.065, bToPass: 0.049, aSkipLand: 7.2, bSkipLand: 7.2, ...o });
  const EX = (o = {}) => ({ run: 'run-s', lines: GAMES, games: GAMES, declinedWindows: 14500, declinedCands: 16800, declinedChanged: 1600,
    declinedRetry: 0, declinedListed: 17300, declinedNoTarget: 21500, instantWindows: 8800, instantCands: 18900, instantChanged: 900,
    instantRetry: 48, bD540: 0, bClean: 1, aLands: 0, aLandsClean: 1, ...o });
  const C = (m = {}, bs = {}, ro = {}, ex = {}) => ({ m: mk(m), bs: SD(bs), ro: RO(ro), ex: EX(ex) });
  const flags = (r) => [r.shown, r.smallGain, r.inconclusive4800, r.notShown, r.notRead, r.notPlayed, r.incomplete];
  const exactlyOne = (r) => flags(r).reduce((t, x) => t + x, 0) === 1;
  const one = (r) => exactlyOne(r) && r.complete === 1 && r.shown + r.smallGain + r.inconclusive4800 + r.notShown === 1
    && r.indistinguishable + r.measuredLoss + r.measuredGain === 1 && r.liveSeatCandidate === r.shown + r.smallGain
    && r.trackClosed === r.notShown && r.liveSeatChanged === 0;
  const noReading = (r) => r.complete === 0 && r.shown + r.smallGain + r.inconclusive4800 + r.notShown + r.liveSeatCandidate
    + r.trackClosed + r.indistinguishable + r.measuredLoss + r.measuredGain === 0 && r.reading === null && r.liveSeatChanged === 0;
  const none = (r) => noReading(r) && exactlyOne(r) && r.incomplete === 1 && r.notRead === 0 && r.notPlayed === 0 && r.outcome === 'INCOMPLETE' && r.line.includes('owed: a repost');
  const nread = (r) => noReading(r) && exactlyOne(r) && r.notRead === 1 && r.outcome === 'NOT READ' && r.line.includes('not played again without a new decision');
  const cases = [
    ['J197-like +2.9 [-2.1, +7.9], lo 0.4970: NOT SHOWN, indistinguishable, the track closes', C(), (r) => r.notShown === 1 && one(r) && r.indistinguishable === 1 && r.trackClosed === 1 && r.liveSeatCandidate === 0 && r.line.includes('track closes')],
    ['+20 [+14.6, +25.4], lo 0.5210: SHOWN, a measured gain, a live-seat candidate', C({ score: 0.5288, lo: 0.521, hi: 0.5366, elo: 20, eloLo: 14.6, eloHi: 25.4 }), (r) => r.shown === 1 && one(r) && r.measuredGain === 1 && r.liveSeatCandidate === 1 && r.trackClosed === 0 && r.line.includes('live-seat candidate')],
    ['+8 [+2.6, +13.4], lo 0.5037: SMALL GAIN, a measured gain, a live-seat candidate', C({ score: 0.5115, lo: 0.5037, hi: 0.5193, elo: 8, eloLo: 2.6, eloHi: 13.4 }), (r) => r.smallGain === 1 && one(r) && r.measuredGain === 1 && r.liveSeatCandidate === 1 && r.trackClosed === 0],
    ['an Elo point of exactly 15.0 with lo above 0.5 is SHOWN', C({ score: 0.5216, lo: 0.5138, hi: 0.5294, elo: 15, eloLo: 9.6, eloHi: 20.5 }), (r) => r.shown === 1 && one(r)],
    ['an Elo point of 14.9 with lo above 0.5 is SMALL GAIN', C({ score: 0.5214, lo: 0.5136, hi: 0.5292, elo: 14.9, eloLo: 9.5, eloHi: 20.4 }), (r) => r.smallGain === 1 && one(r)],
    ['lo of exactly 0.5 is not above it: INCONCLUSIVE AT 4,800 when eloHi >= 15 (a wider interval than planned)', C({ score: 0.5104, lo: 0.5, hi: 0.5216, elo: 7.2, eloLo: 0, eloHi: 15 }), (r) => r.inconclusive4800 === 1 && one(r) && r.liveSeatCandidate === 0 && r.trackClosed === 0 && r.indistinguishable === 1 && r.line.includes('information, not confirmed again')],
    ['lo of exactly 0.5 with eloHi 10.6 is NOT SHOWN, not SMALL GAIN', C({ score: 0.5076, lo: 0.5, hi: 0.5153, elo: 5.3, eloLo: 0, eloHi: 10.6 }), (r) => r.notShown === 1 && one(r) && r.indistinguishable === 1 && r.measuredGain === 0],
    ['lo 0.5001 is above 0.5: SMALL GAIN', C({ score: 0.5077, lo: 0.5001, hi: 0.5154, elo: 5.4, eloLo: 0.1, eloHi: 10.7 }), (r) => r.smallGain === 1 && one(r) && r.measuredGain === 1],
    ['an upper end of exactly 15.0 with lo <= 0.5 is INCONCLUSIVE AT 4,800', C({ score: 0.5104, lo: 0.4995, hi: 0.5216, elo: 7.2, eloLo: -0.3, eloHi: 15 }), (r) => r.inconclusive4800 === 1 && one(r)],
    ['an upper end of 14.9 with lo <= 0.5 is NOT SHOWN', C({ score: 0.5103, lo: 0.4994, hi: 0.5214, elo: 7.1, eloLo: -0.4, eloHi: 14.9 }), (r) => r.notShown === 1 && one(r)],
    ['-12 [-17.3, -6.7]: NOT SHOWN, a measured loss', C({ score: 0.4827, lo: 0.4751, hi: 0.4904, elo: -12, eloLo: -17.3, eloHi: -6.7 }), (r) => r.notShown === 1 && r.measuredLoss === 1 && one(r)],
    ['an upper end of exactly 0 holds 0: indistinguishable', C({ score: 0.4924, lo: 0.4847, hi: 0.5, elo: -5.3, eloLo: -10.6, eloHi: 0 }), (r) => r.indistinguishable === 1 && r.measuredLoss === 0 && r.notShown === 1 && one(r)],
    ['a stopped match (complete: false, 3,600 played) is INCOMPLETE: no reading, not NOT READ', C({ complete: false, played: 3600 }, {}, {}, { games: 3600, lines: 3600 }), (r) => none(r) && r.declinedWindowsPerGame === 4.028 && r.line.includes('STOPPED')],
    ['cut short AND under the rate: INCOMPLETE, not NOT READ, its rates reported', C({ complete: false, played: 3600 }, {}, {}, { games: 3600, lines: 3600, instantWindows: 40 }), (r) => none(r) && r.instantWindowsPerGame === 0.011 && r.notRead === 0 && r.line.includes('(0.011 a game)')],
    ['complete: true but 4,799 games is INCOMPLETE', C({ played: 4799 }), (r) => none(r)],
    ['241 errors and timeouts is INCOMPLETE; 240 is complete', C({ errors: 200, timeouts: 41 }), (r) => none(r) && r.line.includes('OVER 240') && one(verdict(mk({ errors: 200, timeouts: 40 }), SD(), RO(), EX()))],
    ['a line without eloHi is INCOMPLETE', C({ eloHi: null }), (r) => none(r)],
    ['the players swapped is not this match', C({ a: B, b: A, ah: BH, bh: AH }), (r) => r.names === 0 && none(r)],
    ['J214\'s search-v3-declined at its hash is not this match', C({ a: 'search-v3-declined', ah: '795daea97aaa' }), (r) => r.names === 0 && none(r)],
    ['the new player at J214 instant\'s hash is not this match', C({ ah: '25ee7e76b741' }), (r) => r.hashes === 0 && none(r)],
    ['B at search-v2\'s hash (search-v1-anytime) is not this match', C({ bh: 'cdd55e02a89c' }), (r) => r.hashes === 0 && none(r)],
    ['A that searched a block is INCOMPLETE', C({ aSearch: T({ byKind: { p: { searched: 81000 }, a: { searched: 25000 }, b: { searched: 3 } } }) }), (r) => r.kindsOk === 0 && none(r)],
    ['B that searched no attack is INCOMPLETE', C({ bSearch: T({ byKind: { p: { searched: 81000 } } }) }), (r) => r.kindsOk === 0 && none(r)],
    ['no block file is INCOMPLETE', { m: mk(), bs: null, ro: RO(), ex: EX() }, (r) => r.blocks === 0 && none(r)],
    ['599 blocks is not the registered 600', C({}, { blocks: 599 }), (r) => r.blocks === 0 && none(r)],
    ['J214\'s blocks (416,900,000 on) are not this match\'s', C({}, { min: 416900000, max: 416900599 }), (r) => none(r)],
    ['J211\'s blocks (931,900,000-931,900,599) are not this match\'s', C({}, { min: 931900000, max: 931900599 }), (r) => none(r)],
    ['the pilot host\'s blocks (912,900,000 on) are not this match\'s', C({}, { min: 912900000, max: 912900599 }), (r) => none(r)],
    ['another match\'s game in the folder is INCOMPLETE', C({}, { otherGames: 4 }), (r) => none(r)],
    ['a block file for another match is INCOMPLETE', C({}, { purpose: 'match:j215:run-x' }), (r) => none(r)],
    ['a batch line with another seat config is INCOMPLETE', C({}, {}, { cfgExact: 4799 }), (r) => r.cfgs === 0 && none(r)],
    ['A at search-v3-declined\'s seat config is INCOMPLETE', C({}, {}, { aCfg: BCFG + ',declined=1' }), (r) => r.cfgs === 0 && none(r)],
    ['B at search-v2\'s seat config (what=pab) is INCOMPLETE', C({}, {}, { bCfg: BCFG.replace('what=pa,', 'what=pab,') }), (r) => r.cfgs === 0 && none(r)],
    ['no rollout file is INCOMPLETE', { m: mk(), bs: SD(), ro: null, ex: EX() }, (r) => r.cfgs === 0 && none(r)],
    ['no match file is INCOMPLETE', { m: null, bs: SD(), ro: RO(), ex: EX() }, (r) => r.match === 0 && none(r) && r.line.includes('NO MATCH')],
    ['no exposure file is INCOMPLETE, not NOT READ', { m: mk(), bs: SD(), ro: RO(), ex: null }, (r) => r.exposureRead === 0 && none(r) && r.declinedWindows === null],
    ['an exposure file of another run is INCOMPLETE', C({}, {}, {}, { run: 'run-x' }), (r) => r.exposureRead === 0 && none(r) && r.instantWindows === null],
    ['an exposure file that read 4,792 lines is INCOMPLETE', C({}, {}, {}, { games: 4792, lines: 4792 }), (r) => r.exposureRead === 0 && none(r)],
    ['declined at 1,199 windows (0.25 less one) is NOT READ, its rate reported', C({}, {}, {}, { declinedWindows: 1199 }), (r) => nread(r) && r.declinedExposed === 0 && r.instantExposed === 1 && r.declinedWindowsPerGame === 0.25 && r.line.includes('search.p.declined.windows 1199') && !r.line.includes('search.p.instant.windows')],
    ['instant at 1,199 windows is NOT READ', C({}, {}, {}, { instantWindows: 1199 }), (r) => nread(r) && r.instantExposed === 0 && r.declinedExposed === 1 && r.line.includes('search.p.instant.windows 1199')],
    ['both keys at exactly 1,200 windows (0.25 a game) are read', C({}, {}, {}, { declinedWindows: 1200, instantWindows: 1200 }), (r) => one(r) && r.exposed === 1 && r.notShown === 1],
    ['declined firing in no window is NOT READ, even with a SHOWN line', C({ score: 0.5288, lo: 0.521, hi: 0.5366, elo: 20, eloLo: 14.6, eloHi: 25.4 }, {}, {}, { declinedWindows: 0 }), (r) => nread(r) && r.declinedWindowsPerGame === 0 && r.liveSeatCandidate === 0],
    ['B with a D540 counter above 0 is INCOMPLETE, not NOT READ, whatever the line says', C({ score: 0.5288, lo: 0.521, hi: 0.5366, elo: 20, eloLo: 14.6, eloHi: 25.4 }, {}, {}, { bClean: 0, bD540: 1 }), (r) => none(r) && r.bClean === 0 && r.liveSeatCandidate === 0 && r.line.includes('B SHOWED 1 D540 COUNTER') && r.line.includes("B's D540 counters above 0: 1")],
    ['B dirty and under the rate is INCOMPLETE, not NOT READ', C({}, {}, {}, { instantWindows: 10, bClean: 0, bD540: 1 }), (r) => none(r) && r.instantExposed === 0 && r.notRead === 0],
    ['A with a lands counter above 0 is INCOMPLETE', C({}, {}, {}, { aLands: 1, aLandsClean: 0 }), (r) => none(r) && r.aLandsClean === 0 && r.line.includes('A SHOWED 1 LANDS COUNTER')],
    ['a match the pilot\'s gate kept out is NOT PLAYED, with its reason, and nothing else', { m: { notPlayed: true, reason: 'search.p.instant.windows fired in no window of its 8 games', played: 0, complete: false }, bs: null, ro: null, ex: null }, (r) => exactlyOne(r) && r.notPlayed === 1 && noReading(r) && r.incomplete === 0 && r.outcome === 'NOT PLAYED' && r.line.includes('fired in no window')],
    ['the cost and the exposure are described and change no reading', C(), (r) => r.aSecPerGame === 22.458 && r.bSecPerGame === 20.538 && r.costRatio === 1.0935 && r.declinedWindowsPerGame === 3.021 && r.declinedCandsPerWindow === 1.16 && r.instantWindowsPerGame === 1.833 && r.instantCandsPerWindow === 2.15 && r.instantRetryPerGame === 0.01 && r.declinedListed === 17300 && r.declinedNoTarget === 21500 && r.notShown === 1 && one(r)],
  ];
  let ok = 0;
  cases.forEach(([what, input, pred], n) => {
    const d = path.join(scratch, `case-${n}`);
    fs.mkdirSync(d, { recursive: true });
    if (input.m != null) fs.writeFileSync(path.join(d, 'match.json'), JSON.stringify(input.m));
    if (input.bs != null) fs.writeFileSync(path.join(d, 'seeds.json'), JSON.stringify(input.bs));
    if (input.ro != null) fs.writeFileSync(path.join(d, 'rollouts.json'), JSON.stringify(input.ro));
    if (input.ex != null) fs.writeFileSync(path.join(d, 'exposure.json'), JSON.stringify(input.ex));
    const v = verdict(...load(path.join(d, 'match.json'), d));
    const pass = pred(v) === true;
    console.error(`${pass ? 'ok  ' : 'FAIL'} ${what}: ${v.line}`);
    ok += pass ? 1 : 0;
  });
  return { selftest: 1, cases: cases.length, passed: ok, ok: ok === cases.length ? 1 : 0 };
}

function read(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

export function load(matchFile, j215Dir) {
  return [read(matchFile), read(path.join(j215Dir, 'seeds.json')), read(path.join(j215Dir, 'rollouts.json')), read(path.join(j215Dir, 'exposure.json'))];
}

const argv = process.argv.slice(2);
if (argv[0] === '--selftest') {
  const r = selftest(argv[1]);
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
} else if (argv.length === 3) {
  const v = verdict(...load(argv[0], argv[1]));
  fs.mkdirSync(path.dirname(argv[2]), { recursive: true });
  fs.writeFileSync(argv[2], JSON.stringify(v, null, 1) + '\n');
  console.log(JSON.stringify(v));
} else {
  console.error('usage: node verdict.mjs <match.json> <j215 dir> <out.json> | --selftest <dir>');
  process.exit(2);
}
J215EOF
cat > var/j215-tools/rollouts.cjs <<'J215EOF'
// J215: J214's rollout reader (var/j214-tools/rollouts.cjs, itself J212's), unchanged but for these lines. For each side of one
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
J215EOF
cat > var/j215-tools/seeds.cjs <<'J215EOF'
// J215: J214's block reader (var/j214-tools/seeds.cjs, itself J212's), unchanged but for these lines: which deal
// blocks a match played (D398 point 2: a match takes its matchup's next unused blocks from its host name's match base;
// D541 point 2: under --host j215 in an emptied folder those are 519,900,000-519,900,599).
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
  registered: b.length === 600 && b[0] === 519900000 && b[b.length - 1] === 519900599 && otherGames === 0 ? 1 : 0 };
fs.writeFileSync(out, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J215EOF
cat > var/j215-tools/records.cjs <<'J215EOF'
// J215's recording reader: J214's records.cjs (J212's, widened for D540's windows), unchanged but for its first two
// lines (information, and the checks of what must hold, D541 point 10). It reads the gzipped seat logs `ai-bench.sh play --record-all`
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
// decisions, ms by candidate count. One count must be 0 for this player: `onStack`, searched priority decisions with
// a non-empty stack (both keys search empty stacks only). `outsideOwnMain`, searched priority decisions anywhere but
// the seat's own main phase with an empty stack, is above 0 here, since `instant` is on, and nothing requires it.
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
J215EOF
cat > var/j215-tools/gate.cjs <<'J215EOF'
// J215's gate (D541 point 10), after the pilot's games. The match is played only if, over the new player's 4 ladder
// games against search-v2-no-b and its 4 recorded games against Forge Default: search.p.declined.windows summed is
// above 0, search.p.instant.windows summed is above 0, none of the 8 games ended in an engine error or a timeout, and
// search.p.declined.retry and search.p.instant.retry together are at most 2 a game (summed, at most 2 x 8). Both pilot
// runs must have played their 4 games. It reads:
//   var/ai-ladder-pilot/J215/match.json        the ladder match line (played, complete, errors, timeouts, its id);
//   var/j215-tools/pilot-exposure.json         the exposure reader on that match (A's counters, summed);
//   var/ai-bench/j215-pilot-rec/shard-*.jsonl  the recorded run's bench lines (error, timeout, aStats: config A is
//                                              the new player's seat).
// Writes var/j215-tools/gate.json {written, play: 1|0, reason, and its numbers}. The pilot fails on none of this: a
// match the gate keeps out is NOT PLAYED and the report says why.
// usage: node gate.cjs [root]   (every path above is under root; '.' by default)
const fs = require('fs');
const path = require('path');
const root = process.argv[2] || '.';
const P = (...x) => path.join(root, ...x);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const n = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const m = read(P('var/ai-ladder-pilot', 'J215', 'match.json'));
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : null;
const ex = read(P('var/j215-tools', 'pilot-exposure.json'));
const exOk = ex !== null && run !== null && ex.run === run;
const bdir = P('var/ai-bench', 'j215-pilot-rec');
const K = ['declined', 'instant'];
let bGames = 0, bErr = 0, bTo = 0;
const bW = { declined: 0, instant: 0 }, bR = { declined: 0, instant: 0 };
for (const f of fs.existsSync(bdir) ? fs.readdirSync(bdir).filter((x) => /^shard-\d+\.jsonl$/.test(x)) : []) {
  for (const line of fs.readFileSync(path.join(bdir, f), 'utf8').split('\n')) {
    let l; try { l = JSON.parse(line); } catch { continue; }
    bGames++;
    if (l.error !== '' && l.error !== null && l.error !== undefined && l.error !== false) bErr++;
    if (l.timeout === true) bTo++;
    const c = (l.aStats && l.aStats.counts) || {};
    for (const k of K) { bW[k] += n(c[`search.p.${k}.windows`]); bR[k] += n(c[`search.p.${k}.retry`]); }
  }
}
const lGames = m ? n(m.played) : 0, lBad = m ? n(m.errors) + n(m.timeouts) : 0;
const lW = {}, lR = {};
for (const k of K) { lW[k] = exOk ? n(ex[`${k}Windows`]) : 0; lR[k] = exOk ? n(ex[`${k}Retry`]) : 0; }
const games = lGames + bGames, bad = lBad + bErr + bTo;
const windows = Object.fromEntries(K.map((k) => [k, lW[k] + bW[k]]));
const retry = K.reduce((t, k) => t + lR[k] + bR[k], 0);
const why = [];
if (m === null) why.push('no pilot ladder match line');
else if (m.complete !== true || lGames !== 4) why.push(`the pilot ladder match played ${lGames} of its 4 games (complete: ${m.complete})`);
if (m !== null && !exOk) why.push('no exposure read on the pilot ladder match');
if (bGames !== 4) why.push(`the recorded run wrote ${bGames} of its 4 games`);
if (bad > 0) why.push(`${bad} of its ${games} games ended in an engine error or a timeout`);
for (const k of K) if (windows[k] <= 0) why.push(`search.p.${k}.windows fired in no window of its ${games} games`);
if (retry > 2 * games) why.push(`search.p.declined.retry and search.p.instant.retry ${retry} over ${games} games, above 2 a game`);
const out = { written: 1, play: why.length === 0 ? 1 : 0, reason: why.length === 0 ? null : why.join('; '),
  ladderGames: lGames, benchGames: bGames, games, errorsTimeouts: bad,
  ladderDeclinedWindows: lW.declined, benchDeclinedWindows: bW.declined, declinedWindows: windows.declined,
  ladderInstantWindows: lW.instant, benchInstantWindows: bW.instant, instantWindows: windows.instant,
  retry, retryPerGame: games ? Math.round((retry / games) * 1000) / 1000 : null };
fs.mkdirSync(P('var/j215-tools'), { recursive: true });
fs.writeFileSync(P('var/j215-tools', 'gate.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out));
J215EOF
rm -rf var/j215-tools/selftest
node var/j215-tools/verdict.mjs --selftest var/j215-tools/selftest > var/j215-tools/selftest.json || true
cat var/j215-tools/selftest.json
rm -rf var/j215-tools/rec-selftest
node var/j215-tools/records.cjs --selftest var/j215-tools/rec-selftest > var/j215-tools/rec-selftest.json || true
cat var/j215-tools/rec-selftest.json
# the block reader on a synthetic results log: a match at two blocks over three games, one game of another match
# (counted as other), and a pilot line that must not count at all
rm -rf var/j215-tools/seeds-selftest
mkdir -p var/j215-tools/seeds-selftest/results
printf '%s\n' '{"purpose":"match:j215:new","bseed":519900000}' '{"purpose":"match:j215:new","bseed":519900001}' '{"purpose":"match:j215:new","bseed":519900001}' '{"purpose":"match:j215:other","bseed":519900002}' '{"purpose":"pilot","bseed":5}' > var/j215-tools/seeds-selftest/results/j215.jsonl
echo '{"id":"j215:new"}' > var/j215-tools/seeds-selftest/match.json
node var/j215-tools/seeds.cjs var/j215-tools/seeds-selftest var/j215-tools/seeds-selftest/match.json var/j215-tools/seeds-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j215-tools/seeds-selftest/out.json","utf8"));const ok=r.purpose==="match:j215:new"&&r.games===3&&r.blocks===2&&r.min===519900000&&r.max===519900001&&r.fullBlocks===0&&r.otherGames===1&&r.registered===0?1:0;require("fs").writeFileSync("var/j215-tools/seeds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the rollout reader on a synthetic batch folder: two games, each side's decisions by kind, priority overrides by
# direction, land skips, and the two seat configs (one line off)
rm -rf var/j215-tools/ro-selftest
mkdir -p var/j215-tools/ro-selftest/batches/run-s
printf '%s\n' '{"a":"X","b":"Y","aStats":{"counts":{"search.rollouts":90,"search.rounds":34,"search.anytime.short":1,"search.p.considered":8,"search.a.considered":2,"search.playUs":9000000,"search.copyUs":450000,"search.p.skipLand":3,"search.p.changed.fromPass":2,"search.p.changed.toPass":1}},"bStats":{"counts":{"search.rollouts":150,"search.rounds":60,"search.p.considered":7,"search.b.considered":3,"search.playUs":7500000,"search.copyUs":750000,"search.p.changed.toOther":1}}}' '{"a":"X","b":"Z","aStats":{"counts":{"search.rollouts":96,"search.rounds":34,"search.p.considered":10,"search.playUs":9600000}},"bStats":{"counts":{"search.rollouts":158,"search.rounds":58,"search.anytime.short":1,"search.a.considered":10,"search.playUs":7900000}}}' > var/j215-tools/ro-selftest/batches/run-s/b0.jsonl
echo '{"id":"j215:run-s","a":"search-v3-declined-instant","b":"search-v2-no-b"}' > var/j215-tools/ro-selftest/match.json
node var/j215-tools/rollouts.cjs var/j215-tools/ro-selftest var/j215-tools/ro-selftest/match.json var/j215-tools/ro-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j215-tools/ro-selftest/out.json","utf8"));const ok=r.games===2&&r.aDecisions===20&&r.bDecisions===20&&r.aPriority===18&&r.aAttacks===2&&r.aBlocks===0&&r.bBlocks===3&&r.aRolloutsPerDecision===9.3&&r.bRolloutsPerDecision===15.4&&r.aPlayMsPerRollout===100&&r.bPlayMsPerRollout===50&&r.playMsRatio===2&&r.aCopyMsPerRollout===2.4&&r.aShortShare===0.05&&r.aFromPass===0.1111&&r.aToPass===0.0556&&r.bToOther===0.1429&&r.aSkipLandN===3&&r.aSkipLand===1.5&&r.aCfg==="X"&&r.bCfg==="MIXED"&&r.cfgExact===0?1:0;require("fs").writeFileSync("var/j215-tools/ro-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the gate on three synthetic pilots: one passes; one whose instant key fired in no window; one with a timeout and too
# many retries
rm -rf var/j215-tools/gate-selftest
node - <<'J215EOF'
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const R = 'var/j215-tools/gate-selftest';
const pilot = (name, { dw, iw, bdw = 0, biw = 0, timeout = false, retry = 0 }) => {
  const root = `${R}/${name}`;
  const put = (f, s) => { fs.mkdirSync(path.dirname(`${root}/${f}`), { recursive: true }); fs.writeFileSync(`${root}/${f}`, s); };
  put('var/ai-ladder-pilot/J215/match.json', JSON.stringify({ id: 'j215-pilot:run-g', complete: true, played: 4, errors: 0, timeouts: 0 }));
  put('var/j215-tools/pilot-exposure.json', JSON.stringify({ run: 'run-g', declinedWindows: dw, instantWindows: iw, declinedRetry: retry, instantRetry: retry }));
  const line = (i) => JSON.stringify({ error: '', timeout: timeout && i === 1, aStats: { counts: { 'search.p.declined.windows': i === 0 ? bdw : 0, 'search.p.instant.windows': i === 0 ? biw : 0, 'search.p.declined.retry': retry } } });
  put('var/ai-bench/j215-pilot-rec/shard-0.jsonl', [0, 1].map(line).join('\n') + '\n');
  put('var/ai-bench/j215-pilot-rec/shard-1.jsonl', [2, 3].map(line).join('\n') + '\n');
  execFileSync(process.execPath, ['var/j215-tools/gate.cjs', root], { stdio: 'ignore' });
  return JSON.parse(fs.readFileSync(`${root}/var/j215-tools/gate.json`, 'utf8'));
};
const a = pilot('pass', { dw: 20, iw: 0, bdw: 3, biw: 2 });
const b = pilot('noInstant', { dw: 20, iw: 0, bdw: 3, biw: 0 });
const c = pilot('bad', { dw: 2, iw: 1, timeout: true, retry: 3 });
const ok = a.written === 1 && a.play === 1 && a.reason === null && a.declinedWindows === 23 && a.instantWindows === 2 && a.games === 8
  && b.play === 0 && /search\.p\.instant\.windows fired in no window/.test(b.reason || '') && !/declined\.windows fired/.test(b.reason || '')
  && c.play === 0 && /1 of its 8 games/.test(c.reason || '') && /retry 18 over 8 games/.test(c.reason || '') && c.retryPerGame === 2.25 ? 1 : 0;
fs.writeFileSync('var/j215-tools/gate-selftest.json', JSON.stringify({ ok }) + '\n');
console.log(JSON.stringify({ ok, pass: a, noInstant: b.reason, bad: c.reason }));
J215EOF
```
```bash
# one 4-game ladder match of the new player against search-v2-no-b, in a pilot folder under another host (one batch
# pair, one worker); then its exposure (both keys, B's D540 counters, A's lands counters, both sides' kinds), its
# rollout reader and the match line's names, hashes and seat configs (numbers only, so no check reads a missing key)
mkdir -p var/j215-tools
rm -rf var/ai-ladder-pilot/J215
./tools/ai-ladder.sh match search-v3-declined-instant search-v2-no-b --games 4 --batch-pairs 1 --game-timeout 900 --host j215-pilot --purpose pilot --dir var/ai-ladder-pilot/J215 --experiments var/ai-ladder-pilot/J215/experiments.jsonl --out var/ai-ladder-pilot/J215/match.json --jobs 1
node var/j215-tools/exposure.cjs var/ai-ladder-pilot/J215 var/ai-ladder-pilot/J215/match.json var/j215-tools/pilot-exposure.json
node var/j215-tools/rollouts.cjs var/ai-ladder-pilot/J215 var/ai-ladder-pilot/J215/match.json var/j215-tools/rollouts-pilot.json > /dev/null
node - <<'J215EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const m = read('var/ai-ladder-pilot/J215/match.json'), ro = read('var/j215-tools/rollouts-pilot.json');
const pl = read('var/j215-tools/players.json');
const n = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const k = (t, x) => n(t && t.byKind && t.byKind[x] ? t.byKind[x].searched : 0, 0);
const A = 'search-v3-declined-instant';
const r = { written: 1,
  namesOk: m.a === A && m.b === 'search-v2-no-b' ? 1 : 0,
  hashesOk: String(m.ah) === 'af6771947a25' && String(m.bh) === '59505e241363' ? 1 : 0,
  cfgOk: pl.cfgs && ro.aCfg === pl.cfgs[A] && ro.bCfg === pl.cfgs['search-v2-no-b'] && ro.cfgExact === ro.lines && ro.lines === 4 ? 1 : 0,
  played: n(m.played, 0), errorsTimeouts: n(m.errors, 9) + n(m.timeouts, 9),
  aP: k(m.aSearch, 'p'), aA: k(m.aSearch, 'a'), aB: k(m.aSearch, 'b'), bP: k(m.bSearch, 'p'), bA: k(m.bSearch, 'a'), bB: k(m.bSearch, 'b'),
  aMs: n(m.aSearch && m.aSearch.msPerDecision, -1), bMs: n(m.bSearch && m.bSearch.msPerDecision, -1),
  aSecPerGame: m.played ? Math.round(n(m.aSearch && m.aSearch.msPerDecision, 0) * n(m.aSearch && m.aSearch.searched, 0) / m.played) / 1000 : -1,
  bSecPerGame: m.played ? Math.round(n(m.bSearch && m.bSearch.msPerDecision, 0) * n(m.bSearch && m.bSearch.searched, 0) / m.played) / 1000 : -1 };
fs.writeFileSync('var/j215-tools/pilot.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J215EOF
```
```bash
# one recorded run of 4 games against Forge Default (the confirm set's first deck pair, two workers): the searched
# priority decisions by window (own main, land, instant-speed) and their ms by candidate count from the search seat's
# decision records, with the bench lines' D540 counters (records.cjs above); then the gate
mkdir -p var/j215-tools
awk '!/^#/ && NF { print; exit }' tools/ai-bench/pairs-confirm.txt > var/j215-tools/pair1.txt
cat var/j215-tools/pair1.txt
V3='Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1'
rm -rf var/ai-bench/j215-pilot-rec
./tools/ai-bench.sh play --pairs var/j215-tools/pair1.txt --a "$V3,declined=1,instant=1" --b Default --games 4 --seed 215000001 --timeout 900 --jobs 2 --run j215-pilot-rec --record-all
node var/j215-tools/records.cjs var/ai-bench/j215-pilot-rec/games var/j215-tools/rec-pilot.json > /dev/null
node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("var/j215-tools/rec-pilot.json","utf8"));const o={};for(const x of ["written","files","searchLogs","bad","games","pSearched","aSearched","bSearched","ownMainSearched","landSearched","instantSearched","outsideOwnMain","onStack","noState","benchGames","benchErrors","benchTimeouts","declinedWindows","instantWindows","landsWindows","declinedRetry","instantRetry","landsRetry"])o[x]=typeof r[x]==="number"?r[x]:-1;console.log(JSON.stringify(o),JSON.stringify(r.classes),JSON.stringify(r.msByCands),JSON.stringify(r.bench.counts))'
# the gate (D541 point 10): both keys' windows over the 4 ladder and 4 recorded games above 0, no error or timeout in
# the 8, the two keys' retries together at most 2 a game; writes var/j215-tools/gate.json {written, play, reason}
node var/j215-tools/gate.cjs
```
metrics: merged = sh: cat var/j215-merged.txt 2>/dev/null || echo 0
metrics: dst = sh: cat var/j215-decision-selftest.json 2>/dev/null || echo '{"ok":0,"checks":0,"failures":-1}'
metrics: pl = sh: cat var/j215-tools/players.json 2>/dev/null || echo '{"ok":0,"present":0,"cfgs_ok":0,"literal_ok":0,"hashes_ok":0,"kinds_ok":0,"distinct":0}'
metrics: sd = sh: cat var/j215-tools/src-diff.json 2>/dev/null || echo '{"count":-1,"rc":1,"exact":0,"playersAdd":-1,"playersDel":-1,"onePlayer":0}'
metrics: hb = sh: cat var/j215-tools/base.json 2>/dev/null || echo '{"ok":0,"own":0,"first":0,"last":0,"pilot":0}'
metrics: est = sh: cat var/j215-tools/exposure-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: st = sh: cat var/j215-tools/selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: rst = sh: cat var/j215-tools/rec-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: sst = sh: cat var/j215-tools/seeds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: ost = sh: cat var/j215-tools/ro-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: gst = sh: cat var/j215-tools/gate-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: px = sh: cat var/j215-tools/pilot-exposure.json 2>/dev/null || echo '{"bClean":0,"aLandsClean":0,"kindsOk":0,"games":0}'
metrics: pp = sh: cat var/j215-tools/pilot.json 2>/dev/null || echo '{"written":0,"namesOk":0,"hashesOk":0,"cfgOk":0}'
metrics: gate = sh: cat var/j215-tools/gate.json 2>/dev/null || echo '{"written":0,"play":0}'
metrics: rc = sh: cat var/j215-tools/rec-pilot.json 2>/dev/null || echo '{"written":0,"games":0,"bad":-1,"onStack":-1,"landSearched":-1,"landsWindows":-1}'
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
check: sd.count == 1
check: sd.exact == 1
check: sd.playersAdd == 2
check: sd.playersDel == 1
check: sd.onePlayer == 1
check: hb.ok == 1
check: hb.own == 519000000
check: hb.first == 519900000
check: hb.last == 519900599
check: est.ok == 1
check: est.cases == 5
check: est.passed == 5
check: st.ok == 1
check: st.cases == 47
check: st.passed == 47
check: rst.ok == 1
check: rst.cases == 13
check: sst.ok == 1
check: ost.ok == 1
check: gst.ok == 1
check: px.bClean == 1
check: px.aLandsClean == 1
check: px.kindsOk == 1
check: px.games == 4
check: pp.written == 1
check: pp.namesOk == 1
check: pp.hashesOk == 1
check: pp.cfgOk == 1
check: gate.written == 1
check: rc.written == 1
check: rc.bad == 0
check: rc.onStack == 0
check: rc.landSearched == 0
check: rc.landsWindows == 0

The pilot asks only whether anything is broken; whether the match plays is the gate's:
- `merged`: the pinned commit is on `origin/main`;
- the build passes with the decision self-test at 0 failures and at least 472 checks, and the ai-bench self-test
  (its D540 lines kept in `d540-selftest.txt`) and the ladder registry test pass;
- `pl`: the five players resolve on this PC at their registered hashes (compared as strings) and the new player's
  ai-bench config is exactly B's plus `,declined=1,instant=1`, written out (`literal_ok`) and built (`cfgs_ok`);
- `sd`: git answered, and since D540's merge the only file changed under `bridge/src`, `tools/ai-ladder` and
  `tools/ai-bench` is `players.json`, 2 lines in and 1 out, its players D540's with exactly the new one appended;
- `hb`: `hostBase('j215')` is 519,000,000, an empty folder's first match block 519,900,000 (the 600th 519,900,599),
  and the pilot's host name has another base;
- the readers: the exposure reader on 5 synthetic folders (`est`), the verdict on 47 synthetic cases (`st`: each
  reading at and either side of its bars; the three descriptions with an end at exactly 0; INCONCLUSIVE AT 4,800
  with a wider interval than planned; NOT READ for each key at 1,199 windows and for a key that never fired, read
  at exactly 1,200 for both; NOT PLAYED with its reason; a B counter above 0 at any rate and under the rate, an A
  lands counter above 0, a stopped match and a match cut short and under the rate all INCOMPLETE and never NOT READ;
  4,799 games, 241 errors and timeouts, a missing end, swapped players, a J214 arm, other hashes, a block searched
  or attacks not searched, absent, short, other (J214's, J211's, the pilot host's) or shared block files, other seat
  configs, absent or other exposure files, all INCOMPLETE; the cost and the exposure that never change a reading),
  the recording reader on 13 synthetic checks (`rst`), and the block, rollout and gate readers on synthetic files
  (`sst`, `ost`, `gst`);
- in 4 games against search-v2-no-b: the names, hashes and seat configs are A's and B's, every batch line carried
  both seat configs exactly, both sides searched priority and attacks and neither a block (`kindsOk`), B's D540
  counters are all 0 (`bClean`) and A's lands counters are all 0 (`aLandsClean`): either counter stops the night;
- in 4 recorded games against Forge Default: the logs read, no searched priority decision on a non-empty stack
  (`onStack`; the instant key searches empty stacks only), none in a land window (`landSearched`) and no lands
  window in A's bench counters (`landsWindows`): a key that fires in a window it does not own stops the night.

Read, not checked: each key's windows, candidates, changes and retries in the 8 pilot games, the recorded searched
windows by class (own main and instant-speed; with both keys on, a declined spell can be a candidate in an
instant-speed window), their ms by candidate count, and A's and B's search seconds a game (`pilot.json`); D541 point
11's 21-23 s for A is the yardstick. The gate (`gate.json`) decides whether the match plays; a match it keeps out is
not a pilot failure.

## Commands
cores: 7
clean: var/ai-ladder/match-J215.json var/j215-ladder
```bash
# the match: search-v3-declined-instant (af6771947a25) against search-v2-no-b (59505e241363), 4,800 games on the
# confirm set, in a ladder folder of its own under --host j215, emptied here (so a restart replays the same blocks),
# so it is dealt blocks 519,900,000-519,900,599
test -f var/j215-tools/verdict.mjs
test -f var/j215-tools/gate.json
mkdir -p var/j215
rm -rf var/j215-ladder var/ai-ladder/match-J215.json
if ! node -e 'const g=require("./var/j215-tools/gate.json");process.exit(g.play===1?0:1)'; then
  node -e 'const g=require("./var/j215-tools/gate.json");require("fs").writeFileSync("var/ai-ladder/match-J215.json",JSON.stringify({notPlayed:true,reason:g.reason||"the gate did not pass",played:0,complete:false,errors:0,timeouts:0,score:0,lo:0,hi:0,elo:0,eloLo:0,eloHi:0})+"\n")'
  echo "J215: search-v3-declined-instant not played (the pilot's gate)"; exit 0
fi
echo "J215: search-v3-declined-instant against search-v2-no-b, 4,800 games on the confirm set, blocks 519,900,000-519,900,599"
./tools/ai-ladder.sh match search-v3-declined-instant search-v2-no-b --host j215 --dir var/j215-ladder --games 4800 --hours 13.5 --game-timeout 900 --out var/ai-ladder/match-J215.json --jobs {workers}
tail -1 var/j215-ladder/match.jsonl
```
cores: 1
clean: var/j215/verdict.json var/j215/v.json var/j215/report.md var/j215/exposure.json var/j215/rollouts.json var/j215/seeds.json
```bash
# the pre-registered reading: the match's blocks, rollouts and exposure, the verdict, and report.md (numbers only;
# the PC session writes the summary beside it). Nothing here plays a game; a reading is never a failure.
test -f var/j215-tools/verdict.mjs
mkdir -p var/j215
node var/j215-tools/rollouts.cjs var/j215-ladder var/ai-ladder/match-J215.json var/j215/rollouts.json > /dev/null
node var/j215-tools/seeds.cjs var/j215-ladder var/ai-ladder/match-J215.json var/j215/seeds.json
node var/j215-tools/exposure.cjs var/j215-ladder var/ai-ladder/match-J215.json var/j215/exposure.json > /dev/null
node var/j215-tools/verdict.mjs var/ai-ladder/match-J215.json var/j215 var/j215/verdict.json > /dev/null
# the checks' copy: the verdict's numbers only (every value a number; strings, nulls and the description detail dropped)
node -e 'const fs=require("fs");const v=JSON.parse(fs.readFileSync("var/j215/verdict.json","utf8"));const out={};for(const [k,x] of Object.entries(v)){if(typeof x==="number")out[k]=x}fs.writeFileSync("var/j215/v.json",JSON.stringify(out)+"\n");console.log(JSON.stringify(out))'
node - <<'J215EOF'
// J215's report: the job's own numbers (D541 points 3 to 6 and 9), nothing worded beyond them.
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const v = read('var/j215/verdict.json'), m = read('var/ai-ladder/match-J215.json'), bs = read('var/j215/seeds.json');
const g = read('var/j215-tools/gate.json'), rc = read('var/j215-tools/rec-pilot.json'), pp = read('var/j215-tools/pilot.json');
const h = v.desc || {};
const d = (x) => (x === null || x === undefined ? '-' : x);
const pct = (x, n = 1) => (typeof x === 'number' ? `${(x * 100).toFixed(n)}%` : '-');
const x = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(m.id || '');
const t0 = x ? Date.UTC(+x[1], +x[2] - 1, +x[3], +x[4], +x[5], +x[6]) : null, t1 = typeof m.at === 'string' ? Date.parse(m.at) : null;
const hours = t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null;
const L = ['# J215: search-v3-declined-instant against search-v2-no-b (search-v3, the live seat), 4,800 games (D398; D541; D519\'s four readings)', ''];
L.push('**Outcome under the pre-registered rule (D541 points 3 to 6):**', '', `- ${d(v.line)}`, '');
L.push(`**Live-seat candidate for the owner (SHOWN or SMALL GAIN):** ${d(v.liveSeatCandidate)}. **The candidate-list track closed (NOT SHOWN):** ${d(v.trackClosed)}. **NOT READ:** ${d(v.notRead)}. **NOT PLAYED:** ${d(v.notPlayed)}. **INCOMPLETE (owed a repost):** ${d(v.incomplete)}. **The live seat:** unchanged by this job (liveSeatChanged ${d(v.liveSeatChanged)}).`, '');
L.push('| match | played / planned | complete | outcome | described | score [95%] | Elo [95%] | pairs | draws, errors, timeouts | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|');
if (m.notPlayed === true) L.push(`| search-v3-declined-instant | not played | - | NOT PLAYED | - | - | - | - | - | - |`);
else L.push(`| ${d(m.a)} vs ${d(m.b)} | ${d(m.played)} / ${d(m.planned)} | ${d(m.complete)} | ${d(v.outcome)} | ${d(v.word)} | ${d(m.score)} [${d(m.lo)}, ${d(m.hi)}] | ${d(m.elo)} [${d(m.eloLo)}, ${d(m.eloHi)}] | ${d(m.pairs)} | ${d(m.draws)}, ${d(m.errors)}, ${d(m.timeouts)} | ${d(hours)} |`);
L.push('', 'Beside it, never pooled and never read against it (D541 point 8): J214\'s two one-key arms, 1,200 games each against search-v2-no-b on blocks 416,900,000-416,900,149: `search-v3-declined` +5.8 Elo [-4.6, +16.2] and `search-v3-instant` +10.4 [-0.7, +21.5], both INCONCLUSIVE AT 1,200.', '');
L.push('**The exposure, both keys (D541 points 4 and 9; the rate decides NOT READ, the rest is description; on every match it was read on, a cut-short one included):**', '');
L.push('| key | games read | windows | a game (0.25 is the rate) | at the rate | candidates | a window | changed | a game | retries | a game |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of ['declined', 'instant']) {
  L.push(`| ${k} | ${d(v.exGames)} | ${d(v[`${k}Windows`])} | ${d(v[`${k}WindowsPerGame`])} | ${v[`${k}Exposed`] === 1 ? 'yes' : 'no'} | ${d(v[`${k}Cands`])} | ${d(v[`${k}CandsPerWindow`])} | ${d(v[`${k}Changed`])} | ${d(v[`${k}ChangedPerGame`])} | ${d(v[`${k}Retry`])} | ${d(v[`${k}RetryPerGame`])} |`);
}
L.push('', `Declined spells aimed and listed ${d(v.declinedListed)} (${d(v.declinedListedPerGame)} a game), dropped with no legal target ${d(v.declinedNoTarget)} (${d(v.declinedNoTargetPerGame)} a game). B's D540 counters above 0: ${d(v.bD540)}. A's lands counters above 0: ${d(v.aLands)}.`, '');
L.push('**The cost, A against B on the same games (description only; the seconds are this machine\'s, D388):**', '');
L.push('| search s a game A / B (x) | ms a decision A / B | ms p, a A | ms p, a B | searched p, a, b A | searched p, a, b B | from pass, to other, to pass a p decision A | same, B | land windows left to Forge a game A / B | rollouts a decision A / B | fewer than 2 rounds A / B |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
L.push(`| ${d(v.aSecPerGame)} / ${d(v.bSecPerGame)} (x${d(v.costRatio)}) | ${d(v.aMs)} / ${d(v.bMs)} | ${d(v.aMsP)}, ${d(v.aMsA)} | ${d(v.bMsP)}, ${d(v.bMsA)} | ${d(v.aP)}, ${d(v.aA)}, ${d(v.aB)} | ${d(v.bP)}, ${d(v.bA)}, ${d(v.bB)} | ${pct(h.aFromPass)}, ${pct(h.aToOther)}, ${pct(h.aToPass)} | ${pct(h.bFromPass)}, ${pct(h.bToOther)}, ${pct(h.bToPass)} | ${d(h.aSkipLand)} / ${d(h.bSkipLand)} | ${d(h.aRolloutsPerDecision)} / ${d(h.bRolloutsPerDecision)} | ${pct(h.aShortShare, 2)} / ${pct(h.bShortShare, 2)} |`);
L.push('', '| side | decisions searched (games) | changed Forge: p | a | b | all | budget fallbacks [95%] | other fallbacks | step timeouts |');
L.push('|---|---|---|---|---|---|---|---|---|');
if (m.notPlayed !== true) {
  for (const [who, t] of [[m.a, m.aSearch], [m.b, m.bSearch]]) {
    if (!t || !t.searched) { L.push(`| ${d(who)} | no search | | | | | | | |`); continue; }
    const kd = t.byKind || {};
    const ch = (y) => (kd[y] ? `${kd[y].changed}/${kd[y].searched} (${pct(kd[y].rate)})` : '-');
    const other = Object.entries(t.fallback || {}).filter(([r]) => r !== 'budget').map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
    L.push(`| ${who} | ${t.searched} (${t.games}) | ${ch('p')} | ${ch('a')} | ${ch('b')} | ${t.changed}/${t.searched} (${pct(t.searched ? t.changed / t.searched : null)}) | ${(t.fallback || {}).budget ?? 0} = ${pct(t.budgetRate)} [${pct(t.budgetLo)}, ${pct(t.budgetHi)}] | ${other} | ${d(t.stepTimeouts)} |`);
  }
}
L.push('', `Rule parts: names ${d(v.names)}, hashes ${d(v.hashes)}, seat configs ${d(v.cfgs)}, the registered blocks ${d(v.blocks)} (${d(bs.blocks)} blocks ${d(bs.min)} to ${d(bs.max)}, ${d(bs.games)} games, ${d(bs.otherGames)} of another match), priority and attacks searched and no block on both sides ${d(v.kindsOk)}, the exposure read on this match ${d(v.exposureRead)}, B clean ${d(v.bClean)}, A's lands counters clean ${d(v.aLandsClean)}, both keys at the rate ${d(v.exposed)}; complete ${d(v.complete)}. SHOWN ${d(v.shown)}, SMALL GAIN ${d(v.smallGain)}, INCONCLUSIVE AT 4,800 ${d(v.inconclusive4800)}, NOT SHOWN ${d(v.notShown)}, NOT READ ${d(v.notRead)}, NOT PLAYED ${d(v.notPlayed)}, INCOMPLETE ${d(v.incomplete)}. Described: indistinguishable ${d(v.indistinguishable)}, a measured loss ${d(v.measuredLoss)}, a measured gain ${d(v.measuredGain)}. Match id ${d(m.id)}, host ${d(m.host)}, set ${d(m.set)}.`);
L.push('', '## The pilot (D541 point 10): the gate and the recorded windows', '');
L.push(`The gate: ${g.play === 1 ? 'played' : `not played: ${d(g.reason)}`}.`, '');
L.push('| games (ladder + recorded) | declined windows (ladder + recorded) | instant windows (ladder + recorded) | errors and timeouts | retries, both keys (a game) | recorded searched p: own main / land / instant-speed | on a stack | ms by candidate count (decisions) | ladder search s a game A / B |');
L.push('|---|---|---|---|---|---|---|---|---|');
const mb = Object.entries(rc.msByCands || {}).map(([c, o]) => `${c}: ${o.msMean} (${o.n})`).join('; ') || '-';
L.push(`| ${d(g.ladderGames)} + ${d(g.benchGames)} | ${d(g.ladderDeclinedWindows)} + ${d(g.benchDeclinedWindows)} | ${d(g.ladderInstantWindows)} + ${d(g.benchInstantWindows)} | ${d(g.errorsTimeouts)} | ${d(g.retry)} (${d(g.retryPerGame)}) | ${d(rc.ownMainSearched)} / ${d(rc.landSearched)} / ${d(rc.instantSearched)} | ${d(rc.onStack)} | ${mb} | ${d(pp.aSecPerGame)} / ${d(pp.bSecPerGame)} |`);
fs.mkdirSync('var/j215', { recursive: true });
fs.writeFileSync('var/j215/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J215EOF
```
The verdict (`verdict.mjs`, J214's per-arm reader made one match at 4,800 games: the names, hashes, blocks
519,900,000-519,900,599 and seat configs D541's, the bar 240, both keys' exposure, and A's lands counters added to
the keys-off checks) gives the match exactly one outcome, in this precedence: NOT PLAYED when the pilot's gate kept
it out (with the gate's reason); INCOMPLETE when any part of D541 point 3's completeness fails, a B that shows any
D540 counter above 0 or an A that shows a lands counter above 0 among them (no reading, and not NOT READ either,
whatever the rate); NOT READ when every other part holds but either key's windows are under 0.25 a game played
(under 1,200 at 4,800); else one of D519's four readings, compared in integers as the line carries them. It writes
`v.json` with the completeness parts (names, hashes, blocks, cfgs, kindsOk, exposureRead, bClean, aLandsClean,
exposed), exactly one of shown / smallGain / inconclusive4800 / notShown / notRead / notPlayed / incomplete, exactly
one description for a complete match, `liveSeatCandidate` (SHOWN or SMALL GAIN), `trackClosed` (NOT SHOWN), both
keys' exposure, the cost, and `liveSeatChanged` 0.
check: v.written == 1
check: v.liveSeatChanged == 0
check: v.incomplete == 0
check: v.complete + v.notRead + v.notPlayed == 1
check: v.shown + v.smallGain + v.inconclusive4800 + v.notShown + v.notRead + v.notPlayed == 1
check: v.shown + v.smallGain + v.inconclusive4800 + v.notShown == v.complete
check: v.indistinguishable + v.measuredLoss + v.measuredGain == v.complete
check: v.liveSeatCandidate == v.shown + v.smallGain
check: v.trackClosed == v.notShown
check: v.notPlayed == 0 or cm.played == 0
check: v.complete + v.notRead == 0 or (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240)
check: v.complete + v.notRead == 0 or (bs.blocks == 600 and bs.min == 519900000 and bs.max == 519900599 and bs.games == 4800 and bs.otherGames == 0)
check: v.shown == 1 or not (v.complete == 1 and cm.lo > 0.5 and cm.elo >= 15)
check: v.shown == 0 or (v.complete == 1 and cm.lo > 0.5 and cm.elo >= 15)
check: v.smallGain == 1 or not (v.complete == 1 and cm.lo > 0.5 and cm.elo < 15)
check: v.smallGain == 0 or (v.complete == 1 and cm.lo > 0.5 and cm.elo < 15)
check: v.inconclusive4800 == 1 or not (v.complete == 1 and cm.lo <= 0.5 and cm.eloHi >= 15)
check: v.inconclusive4800 == 0 or (v.complete == 1 and cm.lo <= 0.5 and cm.eloHi >= 15)
check: v.notShown == 1 or not (v.complete == 1 and cm.lo <= 0.5 and cm.eloHi < 15)
check: v.notShown == 0 or (v.complete == 1 and cm.lo <= 0.5 and cm.eloHi < 15)
check: v.measuredLoss == 1 or not (v.complete == 1 and cm.eloHi < 0)
check: v.measuredLoss == 0 or (v.complete == 1 and cm.eloHi < 0)
check: v.measuredGain == 1 or not (v.complete == 1 and cm.eloLo > 0)
check: v.measuredGain == 0 or (v.complete == 1 and cm.eloLo > 0)

The checks say: exactly one outcome and it is not INCOMPLETE; a played outcome (a reading or NOT READ) comes from a
match line that says complete, played all 4,800 games and had at most one in 20 end in an engine error or a timeout,
on the 600 registered blocks with no other match's game in the folder; a NOT PLAYED match played nothing; a complete
match has exactly one reading and one description, the candidate flag is exactly SHOWN or SMALL GAIN and the track
closes exactly on NOT SHOWN; the four readings and the two descriptions agree with the match line in the runner's own
language; the live seat is unchanged. Any reading passes them, and so do NOT READ and NOT PLAYED: they are outcomes
D541 registered, not failures. If the match is cut short (its own stop at 13.5 h, or a memory stop the runner
retries from the match's block, which empties the folder and replays the same blocks), or is incomplete for any other
reason (a B that shows any D540 counter above 0 or an A that shows a lands counter above 0 among them: a keys-off
path fired, a code fault, so the player is reposted, never retired for it), it is INCOMPLETE and the job fails on its
checks; the report is still written, and what is owed is a repost alone under a new job id after its cause is found,
not a reading of a cut match. A match both cut short and under the exposure rate is INCOMPLETE, not NOT READ. A NOT
READ match is reported with both rates and is not played again without a new decision; no repost is owed.

## Abort if
abort: j215_err >= 30 and j215_err > j215_games / 10

Engine trouble only: once 30 games of the match have ended in an engine error or a timeout, the job stops if they are
more than one in ten. The match has no stopping rule on the score.

## Report
collect: var/ai-ladder/match-J215.json
collect: var/j215/verdict.json
collect: var/j215/report.md
collect: var/j215/exposure.json
collect: var/j215/rollouts.json
collect: var/j215/seeds.json
collect: var/j215-tools/d540-selftest.txt
collect: var/j215-tools/gate.json
collect: var/j215-tools/pilot.json
collect: var/j215-tools/pilot-exposure.json
collect: var/j215-tools/rec-pilot.json

`report.md` is the job's own numbers. The PC session writes `summary.md` from it:
- **the answer first:** whether the search plays better against the live seat when it considers the declined spells
  and the empty-stack instant-speed windows together, in one sentence a person can act on: the outcome under D541's
  rule (SHOWN, SMALL GAIN, INCONCLUSIVE AT 4,800 or NOT SHOWN; or NOT READ with both rates; or NOT PLAYED with the
  gate's reason; or INCOMPLETE, owed a repost, with its cause) with the score and Elo interval against
  search-v2-no-b for a reading and the describing word; for SHOWN or SMALL GAIN, that it names a live-seat candidate
  for the owner under a separate decision and a seat-queue row, with the cost beside it, and that this job changes
  nothing; for NOT SHOWN, that the candidate-list track closes for the confirm set and the next search lane is the
  value side, that this closes these two keys and nothing beyond them, and that the pair is shown to be worth less
  than the interval's upper end, not nothing;
- **what it does not say:** which key carried it (no ablation), and anything about J214's arms, which stay beside it
  as they were and are never pooled;
- **the exposure and the cost:** each key's windows a game, candidates a window, changes a game and retries a game
  (a retry is a widened pick that did not happen, under `declined` likely a card left in the stack zone, and it
  counts against the player uncorrected); the declined spells listed and dropped; search seconds a game on each side
  and their ratio, ms a searched decision; the pilot's recorded windows by class, and that the match's counters
  cannot say how often a declined spell was a candidate in an instant-speed window (the declined counter counts both
  kinds of window; the pilot's recordings can only show none), and that the retry count there is a lower bound;
- **the install at an instant-speed step:** the sentence D540 point 5 asks for, beside the reading: on a copy, after
  a forced pass in the opponent's turn the opponent is asked once more before the step ends, which can only help the
  opponent after a pass, so the instant key's rollouts lean against passing, toward keeping Forge's play;
- **the run:** draws, errors and timeouts, the deal blocks (519,900,000-519,900,599, new to every job), the match's
  hours against the 9 h estimate, the pressure events in STATUS and any block the runner retried, and that it ran
  alone (D521).

Never write "no effect", "no gain" or "no cost" for an interval that includes 0. The match is read against
search-v2-no-b and never against J214's arms.
