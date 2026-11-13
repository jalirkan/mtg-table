id: J218
title: The search's horizon on the pair (D545): one fixed 4,800-game match (2,400 mirrored pairs, D398, tools/ai-bench/pairs-dev.txt, no stopping rule) of search-v3-declined-instant-t1-x3 (9aeacaff9142, a new player: search-v3-declined-instant with turns=1 and ms=4500, aturns unset so attacks follow turns -- J212's two positive depth points, t1-x3 +9.8 and a1 +5.2 Elo at 1,200 games, together) against B = search-v3-declined-instant (af6771947a25, D543 point 6's base: J216 SMALL GAIN, the recommendation STANDS), in a ladder folder of its own under --host j218 on deal blocks no job has played, 655,900,000-655,900,599, at --game-timeout 1800, read by D519's four readings at 4,800 games as D545 writes them for this match, with D545's completeness parts. Never pooled. This job never changes the live seat
public_title: The search one turn deeper on held-out decks: 4,800 games
public_est: ~17 h (one day)
public_decides: Whether the search AI gains from looking one turn further (3x the clock)
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
alone: yes
repos: mtg-table@23854dde030e7d2b609789c0cef2e4ce03027cda (the merge commit of D545's lane, pc/d545-deep-horizon, on main, after D543's merge 97122947cfe6e60a5a9e2daa46d470a5a74f2c1f, J216's pin. It carries one ladder player appended to tools/ai-ladder/players.json, search-v3-declined-instant-t1-x3 (9aeacaff9142: search-v3-declined-instant's params with turns=1 and budgetMs=4500), the ladder test that holds its hash, the ladder guide's line, docs/decisions/D545-deep-horizon.md and PLAN's rows; no file under bridge/src, tools/ai-bench or the ladder's code. The pilot checks by content that, against D543's merge, the only file changed under bridge/src, tools/ai-ladder and tools/ai-bench is tools/ai-ladder/players.json, by 2 lines in and 1 out, and that its players are D543's merge's with exactly this one appended, so the search is J216's code and every game is one code version, D341)
decides: D545 points 3 to 5, from the match line and its batch counters alone. A complete match reads exactly one of D519's four readings at 4,800 games: SHOWN (lo > 0.5 and elo >= +15), SMALL GAIN (lo > 0.5 and elo < +15), INCONCLUSIVE AT 4,800 (lo <= 0.5 and eloHi >= +15), NOT SHOWN (lo <= 0.5 and eloHi < +15); complete includes the line's and every row's set being tools/ai-bench/pairs-dev.txt, no lands counter above 0 on either side, and A's ms of play a finished rollout at least 1.3 times B's. INCOMPLETE (owed a repost alone under a new job id) for any failed part; NOT PLAYED when the pilot's gate kept the match out. SHOWN or SMALL GAIN names search-v3-declined-instant-t1-x3 a live-seat candidate for the owner under a separate decision and a seat-queue row, its cost beside it, and the cheaper clock (ms=3000) is the next depth lane, not this job's; INCONCLUSIVE AT 4,800 is information; NOT SHOWN closes the horizon track at practical clocks (no arm deepening the Forge rollouts at three times the clock or less without a new decision). This job never changes the live seat: B is the config the owner adopted on 2026-11-13, which D546 (a separate lane, merged after this job's pin) makes the live seat as search-v4
hypothesis: registered as information before any game (D545's hypothesis; no check reads it). J212's two points are single 1,200-game draws against search-v1-anytime on the confirm set, each picked because it was positive: search-v2-t1-x3 +9.8 Elo [-1.7, +21.4] at x2.72 search time, search-v2-a1 +5.2 [-5.7, +16.2] at x1.13; every earlier positive 1,200-game point read again at 4,800 came back at about +2 to +3 (targets, the evaluator leaf, routlets), and the dev set is held out from the selection. Both as measured and adding: about +15 Elo; each shrunk to +2 or +3: about +5. With J216's pair standard error on the dev set (0.0043192, about +-5.9 Elo; SMALL GAIN needs a point above about +5.9), by the normal approximation: a true 0 reads SHOWN or SMALL GAIN 2.5%; +2.5 13.0%; +5 38.4%; +8 76.0%; +9.8 (t1-x3's point) 90.4%; +12 97.9%. At J211's 0.0039 (D541's table): 2.5% at 0, 45% at +5, 84% at +8, 96% at +10. A NOT SHOWN says the effect over the pair is below about +11.8 Elo at this width (+10.6 at J211's)
rule: D545 points 3 to 5, merged before any J218 game was played (written 2026-11-13 after J216's read), in their words (the decision's bold dropped, its lists set as sentences): "The match is complete when its line names A and B in that order at their hashes, says complete: true, played all 4,800 games with engine errors plus timeouts at most 240 (one in 20, D519 point 2), and carries score, lo, elo, eloLo and eloHi; its line's set is the dev set and every one of its result rows says so; it was played on exactly the 600 blocks 655,900,000-655,900,599 with no other match's game in its folder; every batch line carried the two seat configs exactly; both sides searched priority and attack decisions and neither searched a block; neither side's batch counters show a search.p.lands. counter above 0 (both sides' third D540 key is off); and A's rollouts were deeper than B's on the same games: A's ms of play a finished rollout (search.playUs / search.rollouts, D537 point 9's trace of the horizon) at least 1.3 times B's over the match (J212: x2.49 for t1-x3, x1.85 for t1). An incomplete match gets no reading and is reposted alone under a new job id after its cause is found. There is no NOT READ ... The readings, written before any game: D519's four at 4,800 games, exactly one for a complete match, in this precedence, compared as the line carries them (lo in integer ten-thousandths, Elo in integer tenths): SHOWN: lo above 0.5 and elo at least +15; SMALL GAIN: lo above 0.5 and elo below +15; INCONCLUSIVE AT 4,800: lo at most 0.5 and eloHi at least +15; NOT SHOWN: lo at most 0.5 and eloHi below +15. Beside the reading, deciding nothing: indistinguishable (the Elo interval holds 0), a measured loss (wholly below 0), a measured gain (wholly above). ... SHOWN or SMALL GAIN: the deeper horizon with three times the clock beats the pair; the match does not separate the depth from the clock (point 6). Adopting it as it stands means about three times the wait a searched decision at the table (the pilot: 2,150 against 658 ms), so it is offered with that cost beside it, and the cheaper clock is what would make it adoptable without it. search-v3-declined-instant-t1-x3 is a live-seat candidate for the owner, under a separate decision and a seat-queue row (D509), with the match's point and interval and its cost stated beside them ... The follow-up is the cheaper clock ... under its own decision; it is not this job's. INCONCLUSIVE AT 4,800: information, not confirmed again (D519 point 3). NOT SHOWN: ... the horizon track closes at practical clocks ... No reading changes the live seat: this job moves no seat." The players: A = search-v3-declined-instant-t1-x3 (9aeacaff9142), B = search-v3-declined-instant (af6771947a25). Never pooled with J212, J215 or J216 (D545 point 7)
followup: morning-read
est: ~17-18 h at 7 workers (an estimate; range 16-21 h), 32.75 h at worst (the pilot and the match's own stop). From this host at 7 workers, alone, a 1,200-game match takes about 0.47 h + 0.0436 h x both sides' search seconds a game (D537 point 11's fit; residual sd 0.15 h), read at four times the games (J211 9.01 h against its 8.57, J216 9.05 h against its 8.50). B searched 22.2 s a game on the dev set (J216's A); A about 60-65 s (J212's t1-x3 searched x2.72 its base's seconds, and its attacks now roll one turn deeper too at 4.5 s). Both sides 82-87 s a game: 16.2-17.0 h by the fit; the pilot's dry-run (4 games, one deck pair) ran A at x3.09 B's seconds, about 91 s for both, 17.8 h. J212's t1-x3 match ran 4.31 h against the fit's 3.68 h (+17%): about 19.4 h at that ratio. Pilot about 15 minutes. About 19.4 h by the fit if memory pressure holds the match at 6 workers, about 22.7 h at 6 with t1-x3's excess; the match stops itself at --hours 32 under the step's 32.5 h timeout (room for 5 workers after a memory-stop retry, which replays the match from its first block, about 29 h), and a match that reaches its own stop reports complete: false and gets no reading. It holds the machine alone for most of a day
resumable: no
timeout: 32.5h
clean: var/j218 var/j218-tools var/j218-ladder var/ai-ladder-pilot/J218 var/ai-ladder/match-J218.json var/ai-bench/j218-pilot-rec
progress: metric j218_games games of 4800
metrics: j218_games = sh: node -e 'const fs=require("fs");const f="var/j218-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v3-declined-instant-t1-x3\"")&&l.includes("\"b\":\"search-v3-declined-instant\""))n++;console.log(n)'
metrics: j218_err = sh: node -e 'const fs=require("fs");const f="var/j218-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v3-declined-instant-t1-x3\"")&&l.includes("\"b\":\"search-v3-declined-instant\"")&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cm = sh: cat var/ai-ladder/match-J218.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: bs = sh: cat var/j218/seeds.json 2>/dev/null || echo '{"games":0,"blocks":0,"min":0,"max":0,"fullBlocks":0,"otherGames":-1,"offSet":-1,"registered":0}'
metrics: v = sh: cat var/j218/v.json 2>/dev/null || echo '{"written":0,"complete":0,"incomplete":1,"notPlayed":0,"shown":0,"smallGain":0,"inconclusive4800":0,"notShown":0,"liveSeatCandidate":0,"horizonClosed":0,"indistinguishable":0,"measuredLoss":0,"measuredGain":0,"liveSeatChanged":1,"horizonTrace":0,"landsClean":0,"playMsRatio":0,"aShortShare":0,"bShortShare":0,"aRolloutsPerDecision":0,"bRolloutsPerDecision":0,"aSecPerGame":0,"bSecPerGame":0,"costRatio":0}'
headline: cm.played, cm.score, cm.lo, cm.hi, cm.elo, cm.eloLo, cm.eloHi, v.shown, v.smallGain, v.inconclusive4800, v.notShown, v.notPlayed, v.incomplete, v.indistinguishable, v.measuredLoss, v.measuredGain, v.liveSeatCandidate, v.horizonClosed, v.aSecPerGame, v.bSecPerGame, v.costRatio, v.aMs, v.bMs, v.aRolloutsPerDecision, v.bRolloutsPerDecision, v.aShortShare, v.bShortShare, v.playMsRatio, bs.min, bs.max

**Why this job** (D545; J212, J216). The search's value is deterministic and biased at its horizon: every rollout of
the live seat and of `search-v3-declined-instant` ends with the turn its decision is made in, so the reply to a play
or an attack is never played. J212 (D537) played three depth arms at 1,200 games against the then-live seat on the
confirm set: `search-v2-t1-x3` (priority and block rollouts one turn deeper, three times the clock) read +9.8 Elo
[-1.7, +21.4] at x2.72 search time; `search-v2-a1` (attack rollouts see the crack-back) +5.2 [-5.7, +16.2] at x1.13;
`search-v2-t1` (deeper at the same 1.5 s) -1.7, because it starved (11.5 rollouts a decision against 15.8, 11.8% of
decisions short of two rounds). Neither positive point was confirmed. Since then D541's pair read SMALL GAIN against
the live seat twice (J215 +6.9, J216 +8.3 on the dev set; pooled +7.6 [+3.5, +11.7]), D543 point 6 builds the
next candidate-side lane on it, and the owner adopted it on 2026-11-13 (D546, a separate lane, makes it the live seat
as search-v4; this job's pin carries main 97122947c's `bridge/src`, and the match names B by its ladder config). This night puts both depth points on the pair as one new player and plays it once
against the pair, at 4,800 games, on the dev set, where no game with a deeper horizon has ever been played: held out
from the selection J212's points came from.

**What it does not do.** It does not change the live seat, adopt anything, tune anything, pool any games, say which
depth (priority or attacks) or how much of the clock carried a reading, read anything against J212's points or
search-v2-no-b, or read any outcome by deck or by deal.

**What is played.** One `ai-ladder.sh match`: 4,800 games, 2,400 mirrored pairs in 600 batches of 8 on the dev deck
set (`--pairs tools/ai-bench/pairs-dev.txt`), no stopping rule on the score (D398), at `--game-timeout 1800`:
- A = `search-v3-declined-instant-t1-x3` (`9aeacaff9142`):
  `Default+outlets+search:ms=4500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1`;
- B = `search-v3-declined-instant` (`af6771947a25`):
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1`.

A's `aturns` is unset, so its attack rollouts follow `turns=1` (`SearchConfig.horizonFor`); `what=pa`, so neither
side searches a block. The game timeout is 1,800 s, not J216's 900: J216's longest dev-set game ran 706 s with both
sides at 1.5 s, and A thinks about three times as long (D545 point 2).

**The deals** (D545 point 2). The match runs with `--host j218` in a ladder folder of its own, `var/j218-ladder`,
emptied by its step before it starts, so it takes the 600 blocks **655,900,000-655,900,599** (`hostBase('j218')` is
655,000,000; an emptied folder's first match block is its base plus 900,000, `nextBseed`) on a first run and on a
retry after a memory stop. These blocks are new: of the 360,238 ladder result rows under the lab's four checkouts'
`var/` on 2026-11-13 and the 141 under the PC session's checkouts, none is on base 655, and no job file or draft in
this folder names `j218` or a block on that base. The pilot host, `j218-pilot`, has base 87,000,000, on which no row
lies either. 600 consecutive blocks give each of the dev set's 30 deck pairs exactly 40 batches, 160 games, in both
seat orders (`batchPairs`). The block reader checks the range and the set after the match and the verdict refuses any
other.

**The readings** (D545 points 3 and 4): D519's four at 4,800 games, exactly one for a complete match; INCOMPLETE, owed
a repost under a new job id after its cause is found, for any failed part (a set other than the dev set, a lands
counter above 0 on either side, or A's rollouts not at least 1.3 times as long as B's among them); there is no NOT
READ. Beside the reading, deciding nothing: indistinguishable, a measured loss or a measured gain.

**Beside the reading, as description only** (D545 point 8): each side's searched decisions by kind and ms a searched
decision; search seconds a game and their ratio; rollouts and complete rounds a decision; the share short of two
rounds; budget fallbacks; ms of play and copy a rollout; priority overrides by direction; land windows left to Forge
a game; both sides' declined and instant windows, changes and retries a game; the games per dev deck pair; and
J212's three rows as they were.

**When it runs.** Alone (`alone: yes`, D521): both players think against a wall clock.

## Pilot
About 15 minutes:
- the pin is merged;
- the build (the lint and its self-test, javac, the decision self-test, 472 checks at J216's pin and this one), the
  ai-bench self-test and the ladder registry test;
- `ai-ladder.sh list` resolves six players (the anchor, search-v2-no-b, the pair, the new player and
  J212's search-v2-t1-x3 and search-v2-a1) at their registered hashes, checked as strings, and A's seat config is
  exactly B's with `ms=1500` made `ms=4500` and `turns=0` made `turns=1`;
- the code, by content: against D543's merge (J216's pin, `97122947cfe6e60a5a9e2daa46d470a5a74f2c1f`) the only file
  changed under `bridge/src`, `tools/ai-ladder` and `tools/ai-bench` is `tools/ai-ladder/players.json`, 2 lines in and
  1 out, its players the pin's with exactly the new one appended;
- the `j218` host's seed base is 655,000,000 and an empty folder's first match block 655,900,000; the pilot host's
  87,000,000; the dev set has 30 deck pairs, 40 batches each over the 600 blocks;
- the exposure reader, the verdict, the block, rollout and recording readers and the gate written, and each tested on
  synthetic files;
- one 4-game ladder match of A against B on the dev set, one batch pair, one worker, in its own pilot folder under
  `--host j218-pilot`: both sides search priority and attacks and no block, the match line names A and B at their
  hashes and the dev set, the batch lines carry the two seat configs exactly, and neither side's `search.p.lands.`
  counters are above 0 (either stops the night);
- one recorded run of 4 games of A against Forge Default (the dev set's first deck pair, two workers), whose decision
  records give each searched decision's horizon by kind and the searched priority decisions by window, printed, and
  checked only for what must hold: no searched priority decision on a non-empty stack, none in a land window, and no
  `search.p.lands.` counter in A's bench lines;
- **the gate** (D545 point 9): the match is played only if, over the 4 ladder games and the 4 recorded games, none
  ended in an engine error or a timeout; A's decisions decided on fewer than 2 paired rounds are at most 15% of its
  searched decisions; every searched priority and attack decision in A's records carries horizon 1 (at least one of
  each, none another) and A's ms of play a finished rollout in the 4 ladder games is at least 1.3 times B's; and A's
  `search.p.declined.retry` and `search.p.instant.retry` together are at most 2 a game. `var/j218-tools/gate.json`
  says whether the match plays and, if not, the condition it failed; the match step then writes
  `var/ai-ladder/match-J218.json` as `{"notPlayed": true, "reason": ...}` (with the match metrics' zeros beside it,
  so every metric reads a number), plays nothing, and the report says so. The gate is not a pilot failure. The pilot's
  longest game is reported beside it.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j218-merged.txt || echo 0 > var/j218-merged.txt
cat var/j218-merged.txt
rc=0; ./bridge/build.sh > var/j218-build.txt 2>&1 || rc=$?
cat var/j218-build.txt
# the build's decision self-test: its line, with 0 failures (472 at J216's pin; D545 changes no bridge source)
node -e 'const fs=require("fs");const t=fs.readFileSync("var/j218-build.txt","utf8");const m=/^decision selftest: (\d+) check\(s\), (\d+) failure\(s\)$/m.exec(t);const r={ok:m&&m[2]==="0"?1:0,checks:m?Number(m[1]):0,failures:m?Number(m[2]):-1};fs.writeFileSync("var/j218-decision-selftest.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
test "$rc" -eq 0
mkdir -p var/j218-tools
# the ai-bench self-test, then it must have passed
brc=0; ./tools/ai-bench.sh --selftest > var/j218-tools/bench-selftest.txt 2>&1 || brc=$?
tail -3 var/j218-tools/bench-selftest.txt
test "$brc" -eq 0
node --test web/test/ai-ladder.test.ts
```
```bash
# six players resolve at their registered hashes (compared as strings); the new player's seat config is exactly B's
# with ms=1500 made ms=4500 and turns=0 made turns=1, nothing else (D545 point 1)
mkdir -p var/j218-tools
./tools/ai-ladder.sh list > var/j218-tools/players.txt
grep -E '^(forge-default|search-v2-no-b|search-v3-declined-instant|search-v3-declined-instant-t1-x3|search-v2-t1-x3|search-v2-a1) ' var/j218-tools/players.txt || true
node - <<'J218EOF'
// J218's pilot: the players resolve, at their registered hashes (compared as strings), and
// search-v3-declined-instant-t1-x3's seat config is search-v3-declined-instant's with ms=4500 and turns=1 and nothing
// else (D545 point 1; no aturns key: attacks follow turns). J212's two depth arms are checked too, unchanged.
const fs = require('fs');
const L = fs.readFileSync('var/j218-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const V3 = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1';
const PAIR = V3 + ',declined=1,instant=1';
const WANT = {
  'forge-default': { hash: '3ed453ffef1c', cfg: 'Default', kind: 'forge' },
  'search-v2-no-b': { hash: '59505e241363', cfg: V3, kind: 'search' },
  'search-v3-declined-instant': { hash: 'af6771947a25', cfg: PAIR, kind: 'search' },
  'search-v3-declined-instant-t1-x3': { hash: '9aeacaff9142', cfg: PAIR.replace('ms=1500,', 'ms=4500,').replace('turns=0,', 'turns=1,'), kind: 'search' },
  'search-v2-t1-x3': { hash: 'ce99b41f9898', cfg: 'Default+outlets+search:ms=4500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=0,anytime=1', kind: 'search' },
  'search-v2-a1': { hash: '3cf65e94df28', cfg: 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=1,anytime=1', kind: 'search' },
};
// D545 point 1's two seat configs, written out, so the replacements above cannot drift with them
const LITERAL = {
  'search-v3-declined-instant': 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1',
  'search-v3-declined-instant-t1-x3': 'Default+outlets+search:ms=4500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1',
};
const r = { present: 0, cfgs_ok: 0, literal_ok: 0, hashes_ok: 0, kinds_ok: 0, distinct: 0, hashes: {}, cfgs: {} };
const got = Object.fromEntries(Object.keys(WANT).map((n) => [n, get(n)]));
r.present = Object.values(got).every((p) => p && p.cfg) ? 1 : 0;
r.cfgs_ok = Object.entries(WANT).every(([n, w]) => got[n] && got[n].cfg === w.cfg) ? 1 : 0;
r.literal_ok = Object.entries(LITERAL).every(([n, c]) => got[n] && got[n].cfg === c && WANT[n].cfg === c) ? 1 : 0;
r.hashes_ok = Object.entries(WANT).every(([n, w]) => got[n] && String(got[n].hash) === w.hash) ? 1 : 0;
r.kinds_ok = Object.entries(WANT).every(([n, w]) => got[n] && got[n].kind === w.kind) ? 1 : 0;
r.distinct = new Set(Object.values(got).map((p) => p && p.hash)).size === 6 ? 1 : 0;
for (const n of Object.keys(WANT)) { r.hashes[n] = got[n]?.hash ?? null; r.cfgs[n] = got[n]?.cfg ?? null; }
r.ok = r.present && r.cfgs_ok && r.literal_ok && r.hashes_ok && r.kinds_ok && r.distinct ? 1 : 0;
fs.writeFileSync('var/j218-tools/players.json', JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J218EOF
# the j218 host's seed base (D545 point 2): hostBase('j218') is 655,000,000, so an empty folder's first match block is
# 655,900,000 and the 600th 655,900,599; the pilot's host name, j218-pilot, has another base (87,000,000); and the
# dev set the match plays has 30 deck pairs (D318), so 600 blocks give each 40 batches
cat > var/j218-tools/base.mjs <<'J218EOF'
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const S = await import(pathToFileURL(path.resolve('tools/ai-ladder/schedule.ts')).href);
const own = S.hostBase('j218'), pilot = S.hostBase('j218-pilot');
const first = S.nextBseed(own + 900000, new Set());
const devPairs = fs.readFileSync('tools/ai-bench/pairs-dev.txt', 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).length;
// each dev pair's batches over the 600 blocks (2 pairs a batch, ai-ladder's default for match)
const per = new Array(devPairs).fill(0);
for (let b = first; b < first + 600; b++) for (const p of S.batchPairs(b, devPairs, 2)) per[p]++;
const r = { own, first, last: first + 599, pilot, pfirst: S.nextBseed(pilot + 900000, new Set()), devPairs,
  perPairMin: Math.min(...per), perPairMax: Math.max(...per),
  ok: own === 655000000 && first === 655900000 && pilot === 87000000 && devPairs === 30 && Math.min(...per) === 40 && Math.max(...per) === 40 ? 1 : 0 };
fs.mkdirSync('var/j218-tools', { recursive: true });
fs.writeFileSync('var/j218-tools/base.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J218EOF
node var/j218-tools/base.mjs
```
```bash
# the code since D543's merge (J216's pin) under the paths a match runs: tools/ai-ladder/players.json alone, 2 lines
# in and 1 out, and its players the pin's with exactly search-v3-declined-instant-t1-x3 appended
mkdir -p var/j218-tools
D543=97122947cfe6e60a5a9e2daa46d470a5a74f2c1f
git diff --name-only "$D543" HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j218-tools/src-diff.txt && echo 0 > var/j218-tools/src-diff.rc || echo 1 > var/j218-tools/src-diff.rc
git diff --numstat "$D543" HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j218-tools/src-numstat.txt && echo 0 > var/j218-tools/src-numstat.rc || echo 1 > var/j218-tools/src-numstat.rc
git show "$D543:tools/ai-ladder/players.json" > var/j218-tools/players-d543.json && echo 0 > var/j218-tools/players-d543.rc || echo 1 > var/j218-tools/players-d543.rc
node - <<'J218EOF'
const fs = require('fs');
const files = fs.readFileSync('var/j218-tools/src-diff.txt', 'utf8').split('\n').filter(Boolean).sort();
const rcOf = (f) => Number(fs.readFileSync(f, 'utf8').trim());
const rc = rcOf('var/j218-tools/src-diff.rc') === 0 && rcOf('var/j218-tools/src-numstat.rc') === 0 && rcOf('var/j218-tools/players-d543.rc') === 0 ? 0 : 1;
const num = {};
for (const l of fs.readFileSync('var/j218-tools/src-numstat.txt', 'utf8').split('\n').filter(Boolean)) {
  const [a, d, f] = l.split('\t');
  num[f] = { add: Number(a), del: Number(d) };
}
const P = 'tools/ai-ladder/players.json';
const at = (f, x) => (num[f] ? num[f][x] : -1);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const was = read('var/j218-tools/players-d543.json'), now = read(P);
const wl = was && Array.isArray(was.players) ? was.players : null, nl = now && Array.isArray(now.players) ? now.players : null;
// the registry at the pin is D543's merge's, player for player, with exactly one player appended: the new one
const onePlayer = wl && nl && nl.length === wl.length + 1
  && wl.every((p, i) => JSON.stringify(p) === JSON.stringify(nl[i]))
  && nl[nl.length - 1].name === 'search-v3-declined-instant-t1-x3'
  && JSON.stringify(Object.keys(was).sort()) === JSON.stringify(Object.keys(now).sort()) ? 1 : 0;
const r = { files, count: files.length, rc, exact: JSON.stringify(files) === JSON.stringify([P]) ? 1 : 0,
  playersAdd: at(P, 'add'), playersDel: at(P, 'del'), onePlayer, playersBefore: wl ? wl.length : -1, playersAfter: nl ? nl.length : -1 };
fs.writeFileSync('var/j218-tools/src-diff.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J218EOF
```
```bash
# the exposure reader: for one match folder, the summed D540 counters of each side from the batch lines' aStats and
# bStats (config A is the match's first player): both sides' declined and instant windows (description: both seats
# carry the pair's two keys), both sides' lands-off check, and both sides' kinds
mkdir -p var/j218-tools
cat > var/j218-tools/exposure.cjs <<'J218EOF'
// J218 (D545 points 3 and 8): J216's exposure reader read on both sides. Sums, for each side of one match, every
// batch line's counters whose key starts with search.p.declined., search.p.instant. or search.p.lands., plus
// search.p.considered, search.a.considered, search.p.skipLand and search.b.considered. For each side (a, b) and each
// of the pair's two keys (declined, instant): its windows, candidates, changes and retries, a game -- description only,
// since both seats carry both keys. `aLandsClean` and `bLandsClean` are 1 when no search.p.lands. counter of that
// side is above 0 (`aLands`, `bLands` count those that are: both sides' third key is off), `landsClean` when both are;
// `kindsOk` 1 when both sides searched priority and attacks and neither searched a block. A game is a batch line.
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
const S = (side, key, x) => sum[side][`search.p.${key}.${x}`] || 0;
const lands = (side) => Object.entries(sum[side]).filter(([x, v]) => LANDS.test(x) && v > 0).length;
const pos = (x) => (x || 0) > 0;
const r3 = (x) => Math.round(x * 1000) / 1000;
const pg = (x) => (games ? r3(x / games) : null);
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const r = { run, matchPlayed: m && typeof m.played === 'number' ? m.played : null, lines, games, a: sum.a, b: sum.b };
for (const side of ['a', 'b']) {
  for (const key of ['declined', 'instant']) {
    const p = `${side}${cap(key)}`, w = S(side, key, 'windows');
    Object.assign(r, {
      [`${p}Windows`]: w, [`${p}Cands`]: S(side, key, 'cands'), [`${p}Changed`]: S(side, key, 'changed'), [`${p}Retry`]: S(side, key, 'retry'),
      [`${p}WindowsPerGame`]: pg(w), [`${p}CandsPerWindow`]: w ? Math.round((S(side, key, 'cands') / w) * 100) / 100 : null,
      [`${p}ChangedPerGame`]: pg(S(side, key, 'changed')), [`${p}RetryPerGame`]: pg(S(side, key, 'retry')),
    });
  }
  Object.assign(r, { [`${side}DeclinedListed`]: S(side, 'declined', 'listed'), [`${side}DeclinedNoTarget`]: S(side, 'declined', 'noTarget') });
}
const aLands = lands('a'), bLands = lands('b');
Object.assign(r, {
  aLands, bLands, aLandsClean: aLands === 0 ? 1 : 0, bLandsClean: bLands === 0 ? 1 : 0, landsClean: aLands === 0 && bLands === 0 ? 1 : 0,
  kindsOk: pos(sum.a['search.p.considered']) && pos(sum.b['search.p.considered'])
    && pos(sum.a['search.a.considered']) && pos(sum.b['search.a.considered'])
    && (sum.a['search.b.considered'] || 0) === 0 && (sum.b['search.b.considered'] || 0) === 0 ? 1 : 0,
});
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J218EOF
# its self-test, on synthetic batch folders of 8 games: (1) both keys on both sides at 1 window a game and no lands
# counter above 0 (a lands counter at 0 is clean); (2) B with a lands counter above 0 (bLandsClean 0); (3) A with a
# lands counter above 0 (aLandsClean 0); (4) A with no attack search (kindsOk 0); (5) B that searched a block
# (kindsOk 0). Writes var/j218-tools/exposure-selftest.json
rm -rf var/j218-tools/exposure-selftest
node - <<'J218EOF'
const fs = require('fs');
const { execFileSync } = require('child_process');
const S = 'var/j218-tools/exposure-selftest';
const line = (a, b) => JSON.stringify({ a: 'X', b: 'Y', aStats: { counts: a }, bStats: { counts: b } });
const base = () => ({ 'search.p.considered': 9, 'search.a.considered': 2, 'search.p.skipLand': 3 });
const mk = (name, rows) => {
  const d = `${S}/${name}`;
  fs.mkdirSync(`${d}/batches/run-${name}`, { recursive: true });
  fs.writeFileSync(`${d}/match.json`, JSON.stringify({ id: `j218:run-${name}`, played: rows.length }));
  fs.writeFileSync(`${d}/batches/run-${name}/b0.jsonl`, rows.slice(0, 4).map(([a, b]) => line(a, b)).join('\n') + '\n');
  fs.writeFileSync(`${d}/batches/run-${name}/b1.jsonl`, rows.slice(4).map(([a, b]) => line(a, b)).join('\n') + '\n');
  execFileSync(process.execPath, ['var/j218-tools/exposure.cjs', d, `${d}/match.json`, `${d}/out.json`], { stdio: 'ignore' });
  return JSON.parse(fs.readFileSync(`${d}/out.json`, 'utf8'));
};
const rows = (f) => Array.from({ length: 8 }, (_, i) => f(i));
const D = () => ({ 'search.p.declined.windows': 1, 'search.p.declined.cands': 2, 'search.p.declined.listed': 2, 'search.p.declined.noTarget': 1 });
const I = () => ({ 'search.p.instant.windows': 1, 'search.p.instant.cands': 3, 'search.p.instant.changed': 1, 'search.p.instant.retry': 1 });
const K = () => ({ ...base(), ...D(), ...I(), 'search.p.lands.windows': 0 });
const c1 = mk('c1', rows(() => [K(), { ...K(), 'search.p.instant.cands': 2 }]));
const c2 = mk('c2', rows((i) => [K(), i === 3 ? { ...K(), 'search.p.lands.windows': 1 } : K()]));
const c3 = mk('c3', rows((i) => [i === 5 ? { ...K(), 'search.p.lands.cands': 2 } : K(), K()]));
const noA = () => { const x = K(); delete x['search.a.considered']; return x; };
const c4 = mk('c4', rows(() => [noA(), K()]));
const c5 = mk('c5', rows((i) => [K(), i === 0 ? { ...K(), 'search.b.considered': 1 } : K()]));
const cases = [
  ['both keys 1 window a game on both sides, no lands counter above 0: clean, both kinds', c1.games === 8 && c1.lines === 8 && c1.aDeclinedWindows === 8 && c1.bDeclinedWindows === 8 && c1.aInstantWindowsPerGame === 1 && c1.aInstantCandsPerWindow === 3 && c1.bInstantCandsPerWindow === 2 && c1.aDeclinedListed === 16 && c1.bDeclinedNoTarget === 8 && c1.aInstantChanged === 8 && c1.bInstantRetryPerGame === 1 && c1.aLandsClean === 1 && c1.bLandsClean === 1 && c1.landsClean === 1 && c1.aLands === 0 && c1.bLands === 0 && c1.kindsOk === 1],
  ['B with search.p.lands.windows 1 in one game: B not lands-clean', c2.bLandsClean === 0 && c2.bLands === 1 && c2.aLandsClean === 1 && c2.landsClean === 0],
  ['A with search.p.lands.cands 2 in one game: A not lands-clean', c3.aLandsClean === 0 && c3.aLands === 1 && c3.bLandsClean === 1 && c3.landsClean === 0],
  ['A with no attack search: kindsOk 0', c4.kindsOk === 0 && c4.landsClean === 1],
  ['B that searched a block: kindsOk 0', c5.kindsOk === 0 && c5.landsClean === 1],
];
let passed = 0;
for (const [what, ok] of cases) { console.error(`${ok ? 'ok  ' : 'FAIL'} ${what}`); passed += ok ? 1 : 0; }
const r = { ok: passed === cases.length ? 1 : 0, cases: cases.length, passed };
fs.writeFileSync('var/j218-tools/exposure-selftest.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J218EOF
```
```bash
mkdir -p var/j218-tools
cat > var/j218-tools/verdict.mjs <<'J218EOF'
// J218's reading, pre-registered in D545 (points 3 to 5, written 2026-11-13 before any J218 game; the job's rule:
// line; D398's fixed match; D519's four readings at 4,800 games as D541 points 3 to 5 wrote them, for this match on
// the dev deck set; no NOT READ, D545 point 3).
// usage: node verdict.mjs <match.json> <j218 dir> <out.json>        node verdict.mjs --selftest <scratch dir>
//   <match.json> is the match line (or the match step's {"notPlayed": true, "reason": ...}); <j218 dir>/seeds.json
//   is the block reader's file, rollouts.json the rollout reader's and exposure.json the exposure reader's.
// THE MATCH: search-v3-declined-instant-t1-x3 (config A: search-v3-declined-instant with turns=1 and ms=4500, aturns
//   unset) against search-v3-declined-instant (config B, the pair), 4,800 games, 2,400 mirrored pairs, the DEV deck set
//   (tools/ai-bench/pairs-dev.txt), no stopping rule, under --host j218 in a ladder folder of its own (var/j218-ladder,
//   emptied by its step), so on deal blocks 655,900,000-655,900,599.
// EXACTLY ONE OUTCOME, in this precedence:
//   NOT PLAYED   the pilot's gate kept the match out: the match file says notPlayed.
//   INCOMPLETE   any part of D545 point 3's completeness fails: the line does not name A and B in that order at their
//                registered hashes, or does not say complete: true, or played fewer than 4,800 games, or errors +
//                timeouts > 240 (one in 20), or lacks score, lo, elo, eloLo or eloHi, or its set is not the dev set or
//                a row of the match names another set, or the block reader did not find the match's 4,800 games on
//                exactly the 600 blocks 655,900,000-655,900,599 with no other match's game in the folder, or a batch
//                line did not carry A's and B's seat configs exactly, or a side did not search priority and attacks or
//                searched a block, or the exposure reader did not read this match's 4,800 batch lines, or either side's
//                batch counters show a search.p.lands. counter above 0 (a keys-off path fired: a code fault), or the
//                rollout reader did not read this match, or A's ms of play a finished rollout is under 1.3 times B's
//                (compared in integer thousandths of the ratio: A's rollouts were not deeper). No reading: owed a
//                repost alone under a new job id after the cause is found.
//   one of D519's four readings, for a COMPLETE match, compared as the line carries them, lo in integer
//   ten-thousandths and Elo in integer tenths:
//     SHOWN                  lo > 0.5 and elo >= 15
//     SMALL GAIN             lo > 0.5 and elo < 15
//     INCONCLUSIVE AT 4,800  lo <= 0.5 and eloHi >= 15
//     NOT SHOWN              lo <= 0.5 and eloHi < 15
// WHAT IT EARNS (D545 point 5): liveSeatCandidate 1 for SHOWN or SMALL GAIN (a candidate for the owner, under a
//   separate decision; the cheaper clock is the next depth lane, not this job's); horizonClosed 1 for NOT SHOWN (the
//   horizon track closes at practical clocks). Nothing here changes the live seat (liveSeatChanged is 0 always).
// DESCRIPTIVE, deciding nothing, exactly one for a complete match: "a measured loss" (eloHi < 0), "a measured gain"
//   (eloLo > 0), "indistinguishable" otherwise (an end of exactly 0 holds 0).
// BESIDE EVERY OUTCOME, never changing one (D545 point 8): each side's searched decisions by kind and ms a searched
//   decision, search seconds a game and their ratio, rollouts and complete rounds a decision, the share short of two
//   rounds, budget fallbacks, ms of play and copy a rollout, the priority overrides by direction a priority decision,
//   the land windows left to Forge a game, both sides' declined and instant exposure, and the games per dev deck pair.
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 4800;
export const BAR = GAMES / 20;
export const FIRST = 655900000;
export const BLOCKS = 600;
export const LAST = FIRST + BLOCKS - 1;
export const SET = 'tools/ai-bench/pairs-dev.txt';
export const A = 'search-v3-declined-instant-t1-x3';
export const AH = '9aeacaff9142';
export const ACFG = 'Default+outlets+search:ms=4500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1';
export const B = 'search-v3-declined-instant';
export const BH = 'af6771947a25';
export const BCFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1';
// D545 point 3: A's ms of play a finished rollout at least 1.3 times B's, in integer thousandths of the ratio
export const TRACE = 1300;
const KEYS = ['declined', 'instant'];

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const kinds = (t) => ({ p: num(t?.byKind?.p?.searched) ?? 0, a: num(t?.byKind?.a?.searched) ?? 0, b: num(t?.byKind?.b?.searched) ?? 0 });
const secPerGame = (t, played) => {
  const ms = num(t?.msPerDecision), n = num(t?.searched), g = num(played);
  return ms !== null && n !== null && g !== null && g > 0 ? Math.round((ms * n) / g) / 1000 : null;
};
const r3 = (x) => Math.round(x * 1000) / 1000;
const per = (x, n) => (num(x) !== null && num(n) !== null && n > 0 ? r3(x / n) : null);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

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
  // the dev set: the line's set, and no row of the match on another set (the block reader counts them)
  const setOk = !notPlayed && m !== null && m.set === SET && bs !== null && bs.purpose === purpose && bs.offSet === 0 ? 1 : 0;
  const cfgs = ro !== null && typeof ro.lines === 'number' && ro.lines === GAMES && ro.cfgExact === GAMES
    && ro.aCfg === ACFG && ro.bCfg === BCFG ? 1 : 0;
  const exThis = ex !== null && run !== null && ex.run === run && num(ex.games) !== null;
  const exposureRead = exThis && ex.games === GAMES ? 1 : 0;
  const landsClean = exThis && ex.landsClean === 1 && ex.aLands === 0 && ex.bLands === 0 ? 1 : 0;
  // the horizon's trace (D545 point 3): this match's rollout file, A's play time a finished rollout over B's
  const roThis = ro !== null && run !== null && ro.run === run;
  const aPlay = roThis ? num(ro.aPlayMsPerRollout) : null, bPlay = roThis ? num(ro.bPlayMsPerRollout) : null;
  const playMsRatio = aPlay !== null && bPlay !== null && bPlay > 0 ? r3(aPlay / bPlay) : null;
  const horizonTrace = playMsRatio !== null && Math.round(playMsRatio * 1000) >= TRACE ? 1 : 0;
  const s = {
    a: A, b: B, match: m === null ? 0 : 1, names, hashes, kindsOk, blocks, setOk, cfgs, exposureRead, landsClean, horizonTrace,
    id: m?.id ?? null, set: m?.set ?? null, ah: m?.ah ?? null, bh: m?.bh ?? null, played: num(m?.played) ?? 0, planned: num(m?.planned),
    errors: num(m?.errors), timeouts: num(m?.timeouts), pairs: num(m?.pairs),
    score: num(m?.score), lo: num(m?.lo), hi: num(m?.hi), elo: num(m?.elo), eloLo: num(m?.eloLo), eloHi: num(m?.eloHi),
    aSearched: num(m?.aSearch?.searched) ?? 0, bSearched: num(m?.bSearch?.searched) ?? 0,
    aP: ak.p, aA: ak.a, aB: ak.b, bP: bk.p, bA: bk.a, bB: bk.b,
    aMs: num(m?.aSearch?.msPerDecision), bMs: num(m?.bSearch?.msPerDecision),
    aMsP: num(m?.aSearch?.msMean?.p), aMsA: num(m?.aSearch?.msMean?.a),
    bMsP: num(m?.bSearch?.msMean?.p), bMsA: num(m?.bSearch?.msMean?.a),
    aBudget: num(m?.aSearch?.fallback?.budget) ?? (m?.aSearch ? 0 : null), bBudget: num(m?.bSearch?.fallback?.budget) ?? (m?.bSearch ? 0 : null),
    aBudgetRate: num(m?.aSearch?.budgetRate), bBudgetRate: num(m?.bSearch?.budgetRate),
    perDeckPairMin: num(bs?.perDeckPairMin), perDeckPairMax: num(bs?.perDeckPairMax), deckPairs: num(bs?.deckPairs),
  };
  const parts = !notPlayed && names === 1 && hashes === 1 && m.complete === true && s.played === GAMES
    && (s.errors ?? 0) + (s.timeouts ?? 0) <= BAR && s.score !== null && s.lo !== null && s.elo !== null && s.eloLo !== null
    && s.eloHi !== null && setOk === 1 && blocks === 1 && cfgs === 1 && kindsOk === 1 && exposureRead === 1
    && landsClean === 1 && horizonTrace === 1;
  const complete = parts ? 1 : 0;
  const incomplete = notPlayed === 0 && !parts ? 1 : 0;
  const ok = complete === 1;
  const LO = ok ? Math.round(s.lo * 10000) : 0, EL10 = ok ? Math.round(s.eloLo * 10) : 0;
  const E10 = ok ? Math.round(s.elo * 10) : 0, EH = ok ? Math.round(s.eloHi * 10) : 0;
  const shown = ok && LO > 5000 && E10 >= 150 ? 1 : 0;
  const smallGain = ok && LO > 5000 && E10 < 150 ? 1 : 0;
  const inconclusive4800 = ok && LO <= 5000 && EH >= 150 ? 1 : 0;
  const notShown = ok && LO <= 5000 && EH < 150 ? 1 : 0;
  const liveSeatCandidate = shown || smallGain ? 1 : 0;
  const horizonClosed = notShown;
  const measuredLoss = ok && EH < 0 ? 1 : 0;
  const measuredGain = ok && EL10 > 0 ? 1 : 0;
  const indistinguishable = ok && measuredLoss === 0 && measuredGain === 0 ? 1 : 0;
  const reading = !ok ? null : shown ? 'SHOWN' : smallGain ? 'SMALL GAIN' : inconclusive4800 ? 'INCONCLUSIVE AT 4,800' : 'NOT SHOWN';
  const outcome = notPlayed ? 'NOT PLAYED' : incomplete ? 'INCOMPLETE' : reading;
  const word = !ok ? null : measuredLoss ? 'a measured loss' : measuredGain ? 'a measured gain' : 'indistinguishable';
  // the exposure of both sides' keys, as description (both seats carry the pair's two keys)
  const E = exThis ? ex : null, g = E ? E.games : null;
  const exposure = { exGames: g, aLands: E ? num(E.aLands) : null, bLands: E ? num(E.bLands) : null };
  for (const side of ['a', 'b']) {
    for (const k of KEYS) {
      const p = `${side}${cap(k)}`;
      const c = (x) => (E ? num(E[`${p}${x}`]) ?? 0 : null);
      Object.assign(exposure, {
        [`${p}Windows`]: c('Windows'), [`${p}WindowsPerGame`]: per(c('Windows'), g),
        [`${p}CandsPerWindow`]: E && c('Windows') > 0 ? Math.round((c('Cands') / c('Windows')) * 100) / 100 : null,
        [`${p}Changed`]: c('Changed'), [`${p}ChangedPerGame`]: per(c('Changed'), g),
        [`${p}Retry`]: c('Retry'), [`${p}RetryPerGame`]: per(c('Retry'), g),
      });
    }
  }
  const aSecPerGame = notPlayed ? null : secPerGame(m?.aSearch, m?.played), bSecPerGame = notPlayed ? null : secPerGame(m?.bSearch, m?.played);
  const costRatio = aSecPerGame !== null && bSecPerGame !== null && bSecPerGame > 0 ? Math.round((aSecPerGame / bSecPerGame) * 10000) / 10000 : null;
  const r = roThis ? ro : {};
  const desc = {
    aRolloutsPerDecision: num(r.aRolloutsPerDecision), bRolloutsPerDecision: num(r.bRolloutsPerDecision),
    aRoundsPerDecision: num(r.aRoundsPerDecision), bRoundsPerDecision: num(r.bRoundsPerDecision),
    aShortShare: num(r.aShortShare), bShortShare: num(r.bShortShare),
    aPlayMsPerRollout: aPlay, bPlayMsPerRollout: bPlay, aCopyMsPerRollout: num(r.aCopyMsPerRollout), bCopyMsPerRollout: num(r.bCopyMsPerRollout),
    aFromPass: num(r.aFromPass), aToOther: num(r.aToOther), aToPass: num(r.aToPass),
    bFromPass: num(r.bFromPass), bToOther: num(r.bToOther), bToPass: num(r.bToPass),
    aSkipLand: num(r.aSkipLand), bSkipLand: num(r.bSkipLand), aStepCap: num(r.aStepCap), bStepCap: num(r.bStepCap),
  };
  const d = (x) => (x === null || x === undefined ? '-' : x);
  const cost = costRatio === null ? 'no cost read'
    : `${aSecPerGame} against ${bSecPerGame} search seconds a game (x${costRatio}), ${s.aMs} against ${s.bMs} ms a searched decision`;
  const depth = `${d(desc.aRolloutsPerDecision)} against ${d(desc.bRolloutsPerDecision)} rollouts a decision, ${d(desc.aShortShare)} against ${d(desc.bShortShare)} of decisions short of two rounds, ${d(aPlay)} against ${d(bPlay)} ms of play a rollout (x${d(playMsRatio)}; 1.3 is the trace's bar)`;
  const why = s.match === 0 ? 'NO MATCH' : names === 0 ? 'NOT THIS MATCH (names)' : hashes === 0 ? 'NOT THESE PLAYERS (hashes)'
    : m.complete !== true ? 'STOPPED (complete: false)' : s.played !== GAMES ? `NOT ALL 4,800 GAMES (${s.played})`
    : (s.errors ?? 0) + (s.timeouts ?? 0) > BAR ? 'ERRORS AND TIMEOUTS OVER 240'
    : [s.score, s.lo, s.elo, s.eloLo, s.eloHi].some((x) => x === null) ? 'A NUMBER MISSING FROM THE LINE'
    : setOk === 0 ? 'NOT THE DEV SET' : cfgs === 0 ? 'NOT THESE SEAT CONFIGS' : blocks === 0 ? 'NOT THE REGISTERED DEAL BLOCKS'
    : kindsOk === 0 ? 'A SIDE DID NOT SEARCH PRIORITY AND ATTACKS, OR SEARCHED A BLOCK'
    : exposureRead === 0 ? 'NO EXPOSURE READ ON THIS MATCH'
    : landsClean === 0 ? `A LANDS COUNTER ABOVE 0 (A ${d(exposure.aLands)}, B ${d(exposure.bLands)}): A KEYS-OFF PATH FIRED`
    : !roThis ? 'NO ROLLOUT READ ON THIS MATCH'
    : horizonTrace === 0 ? `A'S ROLLOUTS NOT DEEPER: ms of play a rollout x${d(playMsRatio)} of B's, under 1.3` : 'INCOMPLETE';
  const earns = shown || smallGain ? 'a live-seat candidate for the owner under a separate decision, its cost beside it; the cheaper clock (ms=3000) is the next depth lane, not this job\'s'
    : inconclusive4800 ? 'INCONCLUSIVE AT 4,800 is information, not confirmed again'
    : 'the horizon track closes at practical clocks (no arm deepening the Forge rollouts at three times the clock or less without a new decision)';
  const line = notPlayed ? `${A}: NOT PLAYED: the pilot's gate: ${m.reason ?? 'no reason given'}; no reading; the live seat is unchanged`
    : incomplete ? `${A}: INCOMPLETE (${why}): no reading; ${s.played} of 4,800 games; ${depth}; ${cost}; owed: a repost alone under a new job id after its cause is found; the live seat is unchanged`
    : `${A}: ${reading} on the dev set (${word}): ${s.elo} Elo [${s.eloLo}, ${s.eloHi}], score ${s.score} [${s.lo}, ${s.hi}], against ${B}; ${earns}; ${cost}; ${depth}; the live seat is unchanged`;
  return { ...s, notPlayed, incomplete, complete, shown, smallGain, inconclusive4800, notShown, liveSeatCandidate, horizonClosed,
    measuredLoss, measuredGain, indistinguishable, outcome, reading, word, playMsRatio,
    reason: notPlayed ? m.reason ?? null : null, ...exposure, ...desc, aSecPerGame, bSecPerGame, costRatio, line,
    written: 1, games: GAMES, bar: BAR, first: FIRST, last: LAST, liveSeatChanged: 0 };
}

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const T = (o = {}) => ({ games: GAMES, searched: 106000, changed: 19000, msPerDecision: 930,
    byKind: { p: { searched: 81000 }, a: { searched: 25000 } }, msMean: { p: 940, a: 890 }, fallback: { budget: 600 }, budgetRate: 0.0057, ...o });
  const mk = (o = {}) => ({ id: 'j218:run-s', host: 'j218', set: SET, a: A, b: B, ah: AH, bh: BH, complete: true,
    played: GAMES, planned: GAMES, errors: 0, timeouts: 0, pairs: 2400, score: 0.5042, lo: 0.497, hi: 0.5113, elo: 2.9, eloLo: -2.1,
    eloHi: 7.9, aSearch: T({ msPerDecision: 2500, searched: 115000, msMean: { p: 2700, a: 2000 } }), bSearch: T(), ...o });
  const SD = (o = {}) => ({ purpose: 'match:j218:run-s', games: GAMES, blocks: BLOCKS, min: FIRST, max: LAST, fullBlocks: BLOCKS, otherGames: 0,
    offSet: 0, deckPairs: 30, perDeckPairMin: 160, perDeckPairMax: 160, ...o });
  const RO = (o = {}) => ({ run: 'run-s', lines: GAMES, cfgExact: GAMES, aCfg: ACFG, bCfg: BCFG, aFromPass: 0.08, aToOther: 0.06, aToPass: 0.05,
    bFromPass: 0.08, bToOther: 0.065, bToPass: 0.049, aSkipLand: 7.2, bSkipLand: 7.2, aRolloutsPerDecision: 19.1, bRolloutsPerDecision: 15.5,
    aRoundsPerDecision: 7.3, bRoundsPerDecision: 6, aShortShare: 0.016, bShortShare: 0.0315, aPlayMsPerRollout: 115, bPlayMsPerRollout: 46,
    aCopyMsPerRollout: 3.1, bCopyMsPerRollout: 3, aStepCap: 0, bStepCap: 0, ...o });
  const EX = (o = {}) => ({ run: 'run-s', lines: GAMES, games: GAMES, aDeclinedWindows: 16800, aDeclinedCands: 19300, aDeclinedChanged: 2000,
    aDeclinedRetry: 0, aInstantWindows: 9100, aInstantCands: 20600, aInstantChanged: 1200, aInstantRetry: 0,
    bDeclinedWindows: 16822, bDeclinedCands: 19345, bDeclinedChanged: 2029, bDeclinedRetry: 0, bInstantWindows: 9076, bInstantCands: 20512,
    bInstantChanged: 1229, bInstantRetry: 0, aLands: 0, bLands: 0, aLandsClean: 1, bLandsClean: 1, landsClean: 1, ...o });
  const C = (m = {}, bs = {}, ro = {}, ex = {}) => ({ m: mk(m), bs: SD(bs), ro: RO(ro), ex: EX(ex) });
  const flags = (r) => [r.shown, r.smallGain, r.inconclusive4800, r.notShown, r.notPlayed, r.incomplete];
  const exactlyOne = (r) => flags(r).reduce((t, x) => t + x, 0) === 1 && r.liveSeatChanged === 0
    && r.liveSeatCandidate === r.shown + r.smallGain && r.horizonClosed === r.notShown;
  const one = (r) => exactlyOne(r) && r.complete === 1 && r.shown + r.smallGain + r.inconclusive4800 + r.notShown === 1
    && r.indistinguishable + r.measuredLoss + r.measuredGain === 1;
  const noReading = (r) => r.complete === 0 && r.shown + r.smallGain + r.inconclusive4800 + r.notShown + r.liveSeatCandidate
    + r.horizonClosed + r.indistinguishable + r.measuredLoss + r.measuredGain === 0 && r.reading === null && r.liveSeatChanged === 0;
  const none = (r) => noReading(r) && exactlyOne(r) && r.incomplete === 1 && r.notPlayed === 0 && r.outcome === 'INCOMPLETE' && r.line.includes('owed: a repost');
  const cand = (r) => r.liveSeatCandidate === 1 && r.line.includes('live-seat candidate') && r.line.includes('ms=3000');
  const closed = (r) => r.horizonClosed === 1 && r.line.includes('horizon track closes');
  const cases = [
    ['J197-like +2.9 [-2.1, +7.9], lo 0.4970: NOT SHOWN, indistinguishable, the horizon closed', C(), (r) => r.notShown === 1 && one(r) && r.indistinguishable === 1 && closed(r)],
    ['+20 [+14.6, +25.4], lo 0.5210: SHOWN, a measured gain, a candidate', C({ score: 0.5288, lo: 0.521, hi: 0.5366, elo: 20, eloLo: 14.6, eloHi: 25.4 }), (r) => r.shown === 1 && one(r) && r.measuredGain === 1 && cand(r)],
    ['+8 [+2.6, +13.4], lo 0.5037: SMALL GAIN, a measured gain, a candidate', C({ score: 0.5115, lo: 0.5037, hi: 0.5193, elo: 8, eloLo: 2.6, eloHi: 13.4 }), (r) => r.smallGain === 1 && one(r) && r.measuredGain === 1 && cand(r)],
    ['an Elo point of exactly 15.0 with lo above 0.5 is SHOWN', C({ score: 0.5216, lo: 0.5138, hi: 0.5294, elo: 15, eloLo: 9.6, eloHi: 20.5 }), (r) => r.shown === 1 && one(r) && cand(r)],
    ['an Elo point of 14.9 with lo above 0.5 is SMALL GAIN', C({ score: 0.5214, lo: 0.5136, hi: 0.5292, elo: 14.9, eloLo: 9.5, eloHi: 20.4 }), (r) => r.smallGain === 1 && one(r)],
    ['lo of exactly 0.5 is not above it: INCONCLUSIVE AT 4,800 when eloHi >= 15 (a wider interval than planned)', C({ score: 0.5104, lo: 0.5, hi: 0.5216, elo: 7.2, eloLo: 0, eloHi: 15 }), (r) => r.inconclusive4800 === 1 && one(r) && r.liveSeatCandidate === 0 && r.horizonClosed === 0 && r.indistinguishable === 1 && r.line.includes('INCONCLUSIVE AT 4,800 is information')],
    ['lo of exactly 0.5 with eloHi 10.6 is NOT SHOWN, not SMALL GAIN', C({ score: 0.5076, lo: 0.5, hi: 0.5153, elo: 5.3, eloLo: 0, eloHi: 10.6 }), (r) => r.notShown === 1 && one(r) && r.indistinguishable === 1 && r.measuredGain === 0 && closed(r)],
    ['lo 0.5001 is above 0.5: SMALL GAIN', C({ score: 0.5077, lo: 0.5001, hi: 0.5154, elo: 5.4, eloLo: 0.1, eloHi: 10.7 }), (r) => r.smallGain === 1 && one(r) && r.measuredGain === 1 && cand(r)],
    ['an upper end of exactly 15.0 with lo <= 0.5 is INCONCLUSIVE AT 4,800', C({ score: 0.5104, lo: 0.4995, hi: 0.5216, elo: 7.2, eloLo: -0.3, eloHi: 15 }), (r) => r.inconclusive4800 === 1 && one(r)],
    ['an upper end of 14.9 with lo <= 0.5 is NOT SHOWN', C({ score: 0.5103, lo: 0.4994, hi: 0.5214, elo: 7.1, eloLo: -0.4, eloHi: 14.9 }), (r) => r.notShown === 1 && one(r)],
    ['-12 [-17.3, -6.7]: NOT SHOWN, a measured loss, the horizon closed', C({ score: 0.4827, lo: 0.4751, hi: 0.4904, elo: -12, eloLo: -17.3, eloHi: -6.7 }), (r) => r.notShown === 1 && r.measuredLoss === 1 && one(r) && closed(r)],
    ['an upper end of exactly 0 holds 0: indistinguishable, not a loss', C({ score: 0.4924, lo: 0.4847, hi: 0.5, elo: -5.3, eloLo: -10.6, eloHi: 0 }), (r) => r.indistinguishable === 1 && r.measuredLoss === 0 && r.notShown === 1 && one(r)],
    ['a stopped match (complete: false, 3,600 played) is INCOMPLETE: no reading', C({ complete: false, played: 3600 }, {}, {}, { games: 3600, lines: 3600 }), (r) => none(r) && r.line.includes('STOPPED')],
    ['complete: true but 4,799 games is INCOMPLETE', C({ played: 4799 }), (r) => none(r)],
    ['241 errors and timeouts is INCOMPLETE; 240 is complete', C({ errors: 200, timeouts: 41 }), (r) => none(r) && r.line.includes('OVER 240') && one(verdict(mk({ errors: 200, timeouts: 40 }), SD(), RO(), EX()))],
    ['a line without eloHi is INCOMPLETE', C({ eloHi: null }), (r) => none(r)],
    ['the players swapped is not this match', C({ a: B, b: A, ah: BH, bh: AH }), (r) => r.names === 0 && none(r)],
    ['J212\'s search-v2-t1-x3 at its hash is not this match', C({ a: 'search-v2-t1-x3', ah: 'ce99b41f9898' }), (r) => r.names === 0 && none(r)],
    ['the new player at the pair\'s hash is not this match', C({ ah: BH }), (r) => r.hashes === 0 && none(r)],
    ['B search-v2-no-b is not this match', C({ b: 'search-v2-no-b', bh: '59505e241363' }), (r) => r.names === 0 && none(r)],
    ['B at search-v2-no-b\'s hash is not this match', C({ bh: '59505e241363' }), (r) => r.hashes === 0 && none(r) && r.line.includes('hashes')],
    ['a line on the confirm set is INCOMPLETE (not the dev set)', C({ set: 'tools/ai-bench/pairs-confirm.txt' }), (r) => r.setOk === 0 && none(r) && r.line.includes('NOT THE DEV SET')],
    ['a line with no set is INCOMPLETE', C({ set: undefined }), (r) => r.setOk === 0 && none(r)],
    ['4 rows of the match on another set is INCOMPLETE', C({}, { offSet: 4 }), (r) => r.setOk === 0 && none(r)],
    ['A that searched a block is INCOMPLETE', C({ aSearch: T({ byKind: { p: { searched: 81000 }, a: { searched: 25000 }, b: { searched: 3 } } }) }), (r) => r.kindsOk === 0 && none(r)],
    ['B that searched no attack is INCOMPLETE', C({ bSearch: T({ byKind: { p: { searched: 81000 } } }) }), (r) => r.kindsOk === 0 && none(r)],
    ['no block file is INCOMPLETE', { m: mk(), bs: null, ro: RO(), ex: EX() }, (r) => r.blocks === 0 && none(r)],
    ['599 blocks is not the registered 600', C({}, { blocks: 599 }), (r) => r.blocks === 0 && none(r)],
    ['J216\'s blocks (622,900,000 on) are not this match\'s', C({}, { min: 622900000, max: 622900599 }), (r) => none(r)],
    ['J217\'s blocks (725,900,000 on) are not this match\'s', C({}, { min: 725900000, max: 725900599 }), (r) => none(r)],
    ['the pilot host\'s blocks (87,900,000 on) are not this match\'s', C({}, { min: 87900000, max: 87900599 }), (r) => none(r)],
    ['another match\'s game in the folder is INCOMPLETE', C({}, { otherGames: 4 }), (r) => none(r)],
    ['a block file for another match is INCOMPLETE', C({}, { purpose: 'match:j218:run-x' }), (r) => none(r)],
    ['a batch line with another seat config is INCOMPLETE', C({}, {}, { cfgExact: 4799 }), (r) => r.cfgs === 0 && none(r)],
    ['A at the pair\'s seat config (turns=0, 1.5 s) is INCOMPLETE', C({}, {}, { aCfg: BCFG }), (r) => r.cfgs === 0 && none(r)],
    ['A at search-v2-t1-x3\'s seat config (what=pab, aturns=0) is INCOMPLETE', C({}, {}, { aCfg: 'Default+outlets+search:ms=4500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=0,anytime=1' }), (r) => r.cfgs === 0 && none(r)],
    ['B at search-v2-no-b\'s seat config is INCOMPLETE', C({}, {}, { bCfg: 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1' }), (r) => r.cfgs === 0 && none(r)],
    ['no rollout file is INCOMPLETE', { m: mk(), bs: SD(), ro: null, ex: EX() }, (r) => r.cfgs === 0 && r.horizonTrace === 0 && none(r)],
    ['a rollout file of another run is INCOMPLETE', C({}, {}, { run: 'run-x' }), (r) => r.horizonTrace === 0 && none(r) && r.line.includes('NO ROLLOUT READ')],
    ['no match file is INCOMPLETE', { m: null, bs: SD(), ro: RO(), ex: EX() }, (r) => r.match === 0 && none(r) && r.line.includes('NO MATCH')],
    ['no exposure file is INCOMPLETE', { m: mk(), bs: SD(), ro: RO(), ex: null }, (r) => r.exposureRead === 0 && none(r) && r.aDeclinedWindows === null],
    ['an exposure file of another run is INCOMPLETE', C({}, {}, {}, { run: 'run-x' }), (r) => r.exposureRead === 0 && none(r) && r.bInstantWindows === null],
    ['an exposure file that read 4,792 lines is INCOMPLETE', C({}, {}, {}, { games: 4792, lines: 4792 }), (r) => r.exposureRead === 0 && none(r)],
    ['B with a lands counter above 0 is INCOMPLETE, whatever the line says', C({ score: 0.5288, lo: 0.521, hi: 0.5366, elo: 20, eloLo: 14.6, eloHi: 25.4 }, {}, {}, { bLands: 1, bLandsClean: 0, landsClean: 0 }), (r) => none(r) && r.landsClean === 0 && r.liveSeatCandidate === 0 && r.line.includes('A LANDS COUNTER ABOVE 0 (A 0, B 1)')],
    ['A with a lands counter above 0 is INCOMPLETE', C({}, {}, {}, { aLands: 2, aLandsClean: 0, landsClean: 0 }), (r) => none(r) && r.landsClean === 0 && r.line.includes('(A 2, B 0)')],
    ['A\'s rollouts 1.299 times B\'s are not deeper: INCOMPLETE, whatever the line says', C({ score: 0.5288, lo: 0.521, hi: 0.5366, elo: 20, eloLo: 14.6, eloHi: 25.4 }, {}, { aPlayMsPerRollout: 64.95, bPlayMsPerRollout: 50 }), (r) => none(r) && r.horizonTrace === 0 && r.playMsRatio === 1.299 && r.line.includes('NOT DEEPER')],
    ['A\'s rollouts exactly 1.3 times B\'s are deeper: complete', C({}, {}, { aPlayMsPerRollout: 65, bPlayMsPerRollout: 50 }), (r) => one(r) && r.horizonTrace === 1 && r.playMsRatio === 1.3 && r.notShown === 1],
    ['a rollout file with no play time is INCOMPLETE', C({}, {}, { aPlayMsPerRollout: null }), (r) => none(r) && r.horizonTrace === 0 && r.playMsRatio === null],
    ['a match the pilot\'s gate kept out is NOT PLAYED, with its reason', { m: { notPlayed: true, reason: '22 of 140 searched decisions short of two rounds, above 15%', played: 0, complete: false }, bs: null, ro: null, ex: null }, (r) => exactlyOne(r) && r.notPlayed === 1 && noReading(r) && r.incomplete === 0 && r.outcome === 'NOT PLAYED' && r.line.includes('above 15%')],
    ['the cost, the depth and the exposure are described and change no reading', C(), (r) => r.aSecPerGame === 59.896 && r.bSecPerGame === 20.538 && r.costRatio === 2.9164 && r.playMsRatio === 2.5 && r.aRolloutsPerDecision === 19.1 && r.aShortShare === 0.016 && r.aBudget === 600 && r.aDeclinedWindowsPerGame === 3.5 && r.bInstantWindowsPerGame === 1.891 && r.bInstantCandsPerWindow === 2.26 && r.aInstantChangedPerGame === 0.25 && r.notShown === 1 && one(r)],
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

export function load(matchFile, j218Dir) {
  return [read(matchFile), read(path.join(j218Dir, 'seeds.json')), read(path.join(j218Dir, 'rollouts.json')), read(path.join(j218Dir, 'exposure.json'))];
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
  console.error('usage: node verdict.mjs <match.json> <j218 dir> <out.json> | --selftest <dir>');
  process.exit(2);
}
J218EOF
cat > var/j218-tools/rollouts.cjs <<'J218EOF'
// J218: J216's rollout reader (itself J215's, J214's and J212's), unchanged but for these lines; its play time a
// rollout is the horizon's trace D545 point 3 reads (J212: x2.49 for t1-x3). For each side of one
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
J218EOF
cat > var/j218-tools/seeds.cjs <<'J218EOF'
// J218: J216's block reader (itself J215's, J214's and J212's, with the dev set): which deal blocks a match played
// (D398 point 2: a match takes its matchup's next unused blocks from its host name's match base; D545 point 2: under
// --host j218 in an emptied folder those are 655,900,000-655,900,599), and on which set.
// Reads every results line of <ladder dir>/results/*.jsonl whose purpose is a match's, and reports for the match's
// own `match:<id>` (the id in <match.json>; none when the file is absent or has no id) its games, its distinct blocks
// (`bseed`), their lowest and highest and how many of them hold exactly 8 games, how many match games in the folder
// belong to any other match (expected 0: the folder is the match's own), how many of its own games name a set other
// than tools/ai-bench/pairs-dev.txt (`offSet`, expected 0, D545 point 3), and, as description, its distinct deck pairs
// and the fewest and most games any one of them played (30 and 160 each for the registered match).
// usage: node seeds.cjs <ladder dir> <match.json | none> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const SET = 'tools/ai-bench/pairs-dev.txt';
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const purpose = m && typeof m.id === 'string' ? `match:${m.id}` : null;
const per = new Map(), decks = new Map();
let games = 0, otherGames = 0, offSet = 0;
const rdir = `${dir}/results`;
for (const f of fs.existsSync(rdir) ? fs.readdirSync(rdir).filter((x) => x.endsWith('.jsonl')) : []) {
  for (const line of fs.readFileSync(`${rdir}/${f}`, 'utf8').split('\n')) {
    if (!line.includes('"purpose":"match:')) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (typeof r.bseed !== 'number') continue;
    if (purpose !== null && r.purpose === purpose) {
      games++;
      per.set(r.bseed, (per.get(r.bseed) ?? 0) + 1);
      if (r.set !== SET) offSet++;
      const k = [String(r.aDeck), String(r.bDeck)].sort().join(' ');
      decks.set(k, (decks.get(k) ?? 0) + 1);
    } else otherGames++;
  }
}
const b = [...per.keys()].sort((x, y) => x - y);
const dv = [...decks.values()];
const r = { purpose, games, blocks: b.length, min: b.length ? b[0] : 0, max: b.length ? b[b.length - 1] : 0,
  fullBlocks: [...per.values()].filter((n) => n === 8).length, otherGames, offSet,
  deckPairs: decks.size, perDeckPairMin: dv.length ? Math.min(...dv) : 0, perDeckPairMax: dv.length ? Math.max(...dv) : 0,
  registered: b.length === 600 && b[0] === 655900000 && b[b.length - 1] === 655900599 && otherGames === 0 && offSet === 0 ? 1 : 0 };
fs.writeFileSync(out, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J218EOF
cat > var/j218-tools/records.cjs <<'J218EOF'
// J218's recording reader: J216's records.cjs (itself J215's, J214's and J212's), with D545 point 9's horizon read
// flat: `pH1` and `aH1`, the searched priority and attack decisions whose record carries horizon 1, and `hOther`, the
// searched decisions of any kind at another horizon (A must have none: its rollouts were given turns=1, attacks
// following it); and the bench lines' search counters for config A summed (`benchShort`, search.anytime.short;
// `benchDecisions`, search.p/a/b.considered; `benchRollouts`, `benchPlayUs`) and the longest game (`benchMaxMs`).
// It reads the gzipped seat logs `ai-bench.sh play --record-all`
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
// The searched priority decisions' classes are described; for this player (both keys on) an instant-speed class
// above 0 is expected and nothing requires it.
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
  const B = { lines: 0, errors: 0, timeouts: 0, counts: {}, short: 0, decisions: 0, rollouts: 0, playUs: 0, maxMs: 0 };
  for (const f of fs.existsSync(runDir) ? fs.readdirSync(runDir).filter((x) => /^shard-\d+\.jsonl$/.test(x)).sort() : []) {
    for (const line of fs.readFileSync(path.join(runDir, f), 'utf8').split('\n')) {
      let l; try { l = JSON.parse(line); } catch { continue; }
      B.lines++;
      if (l.error !== '' && l.error !== null && l.error !== undefined && l.error !== false) B.errors++;
      if (l.timeout === true) B.timeouts++;
      const c = (l.aStats && l.aStats.counts) || {};
      for (const [x, v] of Object.entries(c)) if (typeof v === 'number' && D540.test(x)) B.counts[x] = (B.counts[x] || 0) + v;
      const n = (k) => (typeof c[k] === 'number' ? c[k] : 0);
      B.short += n('search.anytime.short');
      B.decisions += n('search.p.considered') + n('search.a.considered') + n('search.b.considered');
      B.rollouts += n('search.rollouts');
      B.playUs += n('search.playUs');
      if (typeof l.ms === 'number' && l.ms > B.maxMs) B.maxMs = l.ms;
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
  // D545 point 9: the horizon each searched decision's rollouts were given, by kind
  const hz = (k, h) => out.kinds[k].horizon[h] || 0;
  const hOther = ['p', 'a', 'b'].reduce((t, k) => t + Object.entries(out.kinds[k].horizon).filter(([h]) => h !== '1').reduce((u, [, n]) => u + n, 0), 0);
  Object.assign(out, { pH1: hz('p', '1'), aH1: hz('a', '1'), bH1: hz('b', '1'), hOther,
    benchShort: B.short, benchDecisions: B.decisions, benchRollouts: B.rollouts, benchPlayUs: B.playUs, benchMaxMs: B.maxMs,
    benchShortShare: B.decisions ? r3(B.short / B.decisions) : null,
    benchPlayMsPerRollout: B.rollouts ? r1(B.playUs / B.rollouts / 1000) : null });
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
  const srch = (options, ms, overrode, rounds = 3, horizon = 1) => ({ options, rounds, playouts: 11, horizon, ms, overrode, fallback: null });
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
      search: srch([opt('attack:4', 1, null), opt('attack:none', 1, null)], 1500, false, 1, 0) }),
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
    shard({ ms: 61000, aStats: { counts: { 'search.p.lands.windows': 2, 'search.p.lands.cands': 4, 'search.p.lands.retry': 1, 'search.p.considered': 9, 'search.a.considered': 3, 'search.anytime.short': 2, 'search.rollouts': 200, 'search.playUs': 23000000 } } }),
    shard({ ms: 95000, error: 'java.lang.IllegalStateException', aStats: { counts: { 'search.p.lands.windows': 1, 'search.p.considered': 4, 'search.anytime.short': 1 } } }),
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
    ['the horizons: four priority decisions at 1, the attack at 0 (one at another horizon)', r.pH1 === 4 && r.aH1 === 0 && r.bH1 === 0 && r.hOther === 1 && r.kinds.a.horizon['0'] === 1],
    ['the bench search counters: 3 short of 16 decisions, 200 rollouts at 115 ms of play, the longest game 95 s', r.benchShort === 3 && r.benchDecisions === 16 && r.benchShortShare === 0.188 && r.benchRollouts === 200 && r.benchPlayMsPerRollout === 115 && r.benchMaxMs === 95000],
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
J218EOF
cat > var/j218-tools/gate.cjs <<'J218EOF'
// J218's gate (D545 point 9), after the pilot's games. The match is played only if, over the new player's 4 ladder
// games against search-v3-declined-instant and its 4 recorded games against Forge Default:
//   (1) none of the 8 games ended in an engine error or a timeout;
//   (2) A's searched decisions decided on fewer than 2 paired rounds are at most 15%: search.anytime.short summed
//       against search.p.considered + search.a.considered + search.b.considered summed, over the ladder games' batch
//       lines (A's side) and the recorded games' bench lines (config A), compared in integers (short x 100 <= 15 x
//       decisions) and with at least one decision;
//   (3) A's rollouts were played to turns=1: in A's recorded decision records every searched priority and attack
//       decision carries horizon 1 (pH1 and aH1 above 0, hOther 0), and in the 4 ladder games A's ms of play a
//       finished rollout is at least 1.3 times B's (in integer thousandths of the ratio);
//   (4) A's search.p.declined.retry and search.p.instant.retry together are at most 2 a game (J215's bar).
// Both pilot runs must have played their 4 games. It reads:
//   var/ai-ladder-pilot/J218/match.json        the ladder match line (played, complete, errors, timeouts, its id);
//   var/ai-ladder-pilot/J218/results/*.jsonl   its result rows (the longest game, described);
//   var/j218-tools/pilot-exposure.json         the exposure reader on that match (A's retries);
//   var/j218-tools/rollouts-pilot.json         the rollout reader on that match (A's short and decisions, both sides'
//                                              play time a rollout);
//   var/ai-bench/j218-pilot-rec/shard-*.jsonl  the recorded run's bench lines (error, timeout, aStats: config A is
//                                              the new player's seat);
//   var/j218-tools/rec-pilot.json              the recording reader on that run (the horizons).
// Writes var/j218-tools/gate.json {written, play: 1|0, reason, and its numbers}. The pilot fails on none of this: a
// match the gate keeps out is NOT PLAYED and the report says why.
// usage: node gate.cjs [root]   (every path above is under root; '.' by default)
const fs = require('fs');
const path = require('path');
const root = process.argv[2] || '.';
const P = (...x) => path.join(root, ...x);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const n = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const m = read(P('var/ai-ladder-pilot', 'J218', 'match.json'));
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : null;
const ex = read(P('var/j218-tools', 'pilot-exposure.json'));
const exOk = ex !== null && run !== null && ex.run === run;
const ro = read(P('var/j218-tools', 'rollouts-pilot.json'));
const roOk = ro !== null && run !== null && ro.run === run;
const rc = read(P('var/j218-tools', 'rec-pilot.json'));
const rcOk = rc !== null && rc.written === 1;
const bdir = P('var/ai-bench', 'j218-pilot-rec');
const K = ['declined', 'instant'];
let bGames = 0, bErr = 0, bTo = 0, bShort = 0, bDec = 0, bRetry = 0, bMax = 0;
for (const f of fs.existsSync(bdir) ? fs.readdirSync(bdir).filter((x) => /^shard-\d+\.jsonl$/.test(x)) : []) {
  for (const line of fs.readFileSync(path.join(bdir, f), 'utf8').split('\n')) {
    let l; try { l = JSON.parse(line); } catch { continue; }
    bGames++;
    if (l.error !== '' && l.error !== null && l.error !== undefined && l.error !== false) bErr++;
    if (l.timeout === true) bTo++;
    if (n(l.ms) > bMax) bMax = n(l.ms);
    const c = (l.aStats && l.aStats.counts) || {};
    bShort += n(c['search.anytime.short']);
    bDec += n(c['search.p.considered']) + n(c['search.a.considered']) + n(c['search.b.considered']);
    for (const k of K) bRetry += n(c[`search.p.${k}.retry`]);
  }
}
let lMax = 0;
const rdir = P('var/ai-ladder-pilot', 'J218', 'results');
for (const f of fs.existsSync(rdir) ? fs.readdirSync(rdir).filter((x) => x.endsWith('.jsonl')) : []) {
  for (const line of fs.readFileSync(path.join(rdir, f), 'utf8').split('\n')) {
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (n(r.ms) > lMax) lMax = n(r.ms);
  }
}
const lGames = m ? n(m.played) : 0, lBad = m ? n(m.errors) + n(m.timeouts) : 0;
const lShort = roOk ? n(ro.aShort) : 0, lDec = roOk ? n(ro.aDecisions) : 0;
const lRetry = exOk ? K.reduce((t, k) => t + n(ex[`a${k[0].toUpperCase()}${k.slice(1)}Retry`]), 0) : 0;
const games = lGames + bGames, bad = lBad + bErr + bTo;
const short = lShort + bShort, decisions = lDec + bDec;
const retry = lRetry + bRetry;
const aPlay = roOk ? n(ro.aPlayMsPerRollout) : 0, bPlay = roOk ? n(ro.bPlayMsPerRollout) : 0;
const playMsRatio = bPlay > 0 ? Math.round((aPlay / bPlay) * 1000) / 1000 : null;
const pH1 = rcOk ? n(rc.pH1) : 0, aH1 = rcOk ? n(rc.aH1) : 0, hOther = rcOk ? n(rc.hOther) : 0;
const why = [];
if (m === null) why.push('no pilot ladder match line');
else if (m.complete !== true || lGames !== 4) why.push(`the pilot ladder match played ${lGames} of its 4 games (complete: ${m.complete})`);
if (m !== null && !exOk) why.push('no exposure read on the pilot ladder match');
if (m !== null && !roOk) why.push('no rollout read on the pilot ladder match');
if (bGames !== 4) why.push(`the recorded run wrote ${bGames} of its 4 games`);
if (!rcOk) why.push('no recording read on the recorded run');
if (bad > 0) why.push(`${bad} of its ${games} games ended in an engine error or a timeout`);
if (decisions <= 0) why.push('A searched no decision');
else if (short * 100 > 15 * decisions) why.push(`${short} of A's ${decisions} searched decisions short of two rounds, above 15%`);
if (rcOk && (pH1 <= 0 || aH1 <= 0)) why.push(`A's records hold ${pH1} searched priority and ${aH1} searched attack decisions at horizon 1; each must be above 0`);
if (rcOk && hOther > 0) why.push(`${hOther} of A's searched decisions at a horizon other than 1`);
if (roOk && (playMsRatio === null || Math.round(playMsRatio * 1000) < 1300)) why.push(`A's ms of play a rollout x${playMsRatio} of B's in the ladder games, under 1.3`);
if (retry > 2 * games) why.push(`search.p.declined.retry and search.p.instant.retry ${retry} over ${games} games, above 2 a game`);
const out = { written: 1, play: why.length === 0 ? 1 : 0, reason: why.length === 0 ? null : why.join('; '),
  ladderGames: lGames, benchGames: bGames, games, errorsTimeouts: bad,
  ladderShort: lShort, ladderDecisions: lDec, benchShort: bShort, benchDecisions: bDec, short, decisions,
  shortShare: decisions ? Math.round((short / decisions) * 10000) / 10000 : null,
  pH1, aH1, hOther, aPlayMsPerRollout: aPlay, bPlayMsPerRollout: bPlay, playMsRatio,
  retry, retryPerGame: games ? Math.round((retry / games) * 1000) / 1000 : null,
  longestLadderMs: lMax, longestBenchMs: bMax, longestMs: Math.max(lMax, bMax) };
fs.mkdirSync(P('var/j218-tools'), { recursive: true });
fs.writeFileSync(P('var/j218-tools', 'gate.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out));
J218EOF
rm -rf var/j218-tools/selftest
node var/j218-tools/verdict.mjs --selftest var/j218-tools/selftest > var/j218-tools/selftest.json || true
cat var/j218-tools/selftest.json
rm -rf var/j218-tools/rec-selftest
node var/j218-tools/records.cjs --selftest var/j218-tools/rec-selftest > var/j218-tools/rec-selftest.json || true
cat var/j218-tools/rec-selftest.json
# the block reader on a synthetic results log: a match at two blocks over three games (two on the dev set, one on
# another set: offSet 1), one game of another match (counted as other), and a pilot line that must not count at all
rm -rf var/j218-tools/seeds-selftest
mkdir -p var/j218-tools/seeds-selftest/results
printf '%s\n' '{"purpose":"match:j218:new","bseed":655900000,"set":"tools/ai-bench/pairs-dev.txt","aDeck":"x-A.dck","bDeck":"x-B.dck"}' '{"purpose":"match:j218:new","bseed":655900001,"set":"tools/ai-bench/pairs-dev.txt","aDeck":"x-B.dck","bDeck":"x-A.dck"}' '{"purpose":"match:j218:new","bseed":655900001,"set":"tools/ai-bench/pairs-confirm.txt","aDeck":"y-A.dck","bDeck":"y-B.dck"}' '{"purpose":"match:j218:other","bseed":655900002}' '{"purpose":"pilot","bseed":5}' > var/j218-tools/seeds-selftest/results/j218.jsonl
echo '{"id":"j218:new"}' > var/j218-tools/seeds-selftest/match.json
node var/j218-tools/seeds.cjs var/j218-tools/seeds-selftest var/j218-tools/seeds-selftest/match.json var/j218-tools/seeds-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j218-tools/seeds-selftest/out.json","utf8"));const ok=r.purpose==="match:j218:new"&&r.games===3&&r.blocks===2&&r.min===655900000&&r.max===655900001&&r.fullBlocks===0&&r.otherGames===1&&r.offSet===1&&r.deckPairs===2&&r.perDeckPairMin===1&&r.perDeckPairMax===2&&r.registered===0?1:0;require("fs").writeFileSync("var/j218-tools/seeds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the rollout reader on a synthetic batch folder: two games, each side's decisions by kind, priority overrides by
# direction, land skips, the play time a rollout (the horizon's trace) and the two seat configs (one line off)
rm -rf var/j218-tools/ro-selftest
mkdir -p var/j218-tools/ro-selftest/batches/run-s
printf '%s\n' '{"a":"X","b":"Y","aStats":{"counts":{"search.rollouts":90,"search.rounds":34,"search.anytime.short":1,"search.p.considered":8,"search.a.considered":2,"search.playUs":9000000,"search.copyUs":450000,"search.p.skipLand":3,"search.p.changed.fromPass":2,"search.p.changed.toPass":1}},"bStats":{"counts":{"search.rollouts":150,"search.rounds":60,"search.p.considered":7,"search.b.considered":3,"search.playUs":7500000,"search.copyUs":750000,"search.p.changed.toOther":1}}}' '{"a":"X","b":"Z","aStats":{"counts":{"search.rollouts":96,"search.rounds":34,"search.p.considered":10,"search.playUs":9600000}},"bStats":{"counts":{"search.rollouts":158,"search.rounds":58,"search.anytime.short":1,"search.a.considered":10,"search.playUs":7900000}}}' > var/j218-tools/ro-selftest/batches/run-s/b0.jsonl
echo '{"id":"j218:run-s","a":"search-v3-declined-instant-t1-x3","b":"search-v3-declined-instant"}' > var/j218-tools/ro-selftest/match.json
node var/j218-tools/rollouts.cjs var/j218-tools/ro-selftest var/j218-tools/ro-selftest/match.json var/j218-tools/ro-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j218-tools/ro-selftest/out.json","utf8"));const ok=r.run==="run-s"&&r.games===2&&r.aDecisions===20&&r.bDecisions===20&&r.aPriority===18&&r.aAttacks===2&&r.aBlocks===0&&r.bBlocks===3&&r.aRolloutsPerDecision===9.3&&r.bRolloutsPerDecision===15.4&&r.aPlayMsPerRollout===100&&r.bPlayMsPerRollout===50&&r.playMsRatio===2&&r.aCopyMsPerRollout===2.4&&r.aShort===1&&r.aShortShare===0.05&&r.aFromPass===0.1111&&r.aToPass===0.0556&&r.bToOther===0.1429&&r.aSkipLandN===3&&r.aSkipLand===1.5&&r.aCfg==="X"&&r.bCfg==="MIXED"&&r.cfgExact===0?1:0;require("fs").writeFileSync("var/j218-tools/ro-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the gate on four synthetic pilots: one passes; one at exactly its bars (15% short, x1.3 play time) passes; one starved
# with a decision at another horizon; one with a timeout, too many retries, no attack at horizon 1 and short rollouts
rm -rf var/j218-tools/gate-selftest
node - <<'J218EOF'
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const R = 'var/j218-tools/gate-selftest';
const pilot = (name, { lShort = 2, bShort = 1, aPlay = 115, bPlay = 46, pH1 = 30, aH1 = 8, hOther = 0, timeout = false, retry = 0, lRetry = 0 }) => {
  const root = `${R}/${name}`;
  const put = (f, s) => { fs.mkdirSync(path.dirname(`${root}/${f}`), { recursive: true }); fs.writeFileSync(`${root}/${f}`, s); };
  put('var/ai-ladder-pilot/J218/match.json', JSON.stringify({ id: 'j218-pilot:run-g', complete: true, played: 4, errors: 0, timeouts: 0 }));
  put('var/ai-ladder-pilot/J218/results/j218-pilot.jsonl', [JSON.stringify({ ms: 120000 }), JSON.stringify({ ms: 250000 })].join('\n') + '\n');
  put('var/j218-tools/pilot-exposure.json', JSON.stringify({ run: 'run-g', aDeclinedRetry: lRetry, aInstantRetry: lRetry }));
  put('var/j218-tools/rollouts-pilot.json', JSON.stringify({ run: 'run-g', aShort: lShort, aDecisions: 60, aPlayMsPerRollout: aPlay, bPlayMsPerRollout: bPlay }));
  put('var/j218-tools/rec-pilot.json', JSON.stringify({ written: 1, pH1, aH1, hOther }));
  const line = (i) => JSON.stringify({ error: '', timeout: timeout && i === 1, ms: 60000 + i * 1000, aStats: { counts: { 'search.anytime.short': bShort, 'search.p.considered': 15, 'search.a.considered': 5, 'search.p.declined.retry': retry } } });
  put('var/ai-bench/j218-pilot-rec/shard-0.jsonl', [0, 1].map(line).join('\n') + '\n');
  put('var/ai-bench/j218-pilot-rec/shard-1.jsonl', [2, 3].map(line).join('\n') + '\n');
  execFileSync(process.execPath, ['var/j218-tools/gate.cjs', root], { stdio: 'ignore' });
  return JSON.parse(fs.readFileSync(`${root}/var/j218-tools/gate.json`, 'utf8'));
};
const a = pilot('pass', {});
const e = pilot('edge', { lShort: 9, bShort: 3, aPlay: 65, bPlay: 50 });
const b = pilot('starved', { lShort: 20, bShort: 3, hOther: 2 });
const c = pilot('bad', { timeout: true, retry: 3, lRetry: 2, aH1: 0, aPlay: 60, bPlay: 50 });
const ok = a.written === 1 && a.play === 1 && a.reason === null && a.games === 8 && a.short === 6 && a.decisions === 140 && a.playMsRatio === 2.5 && a.longestMs === 250000 && a.longestBenchMs === 63000
  && e.play === 1 && e.short === 21 && e.shortShare === 0.15 && e.playMsRatio === 1.3
  && b.play === 0 && /32 of A's 140 searched decisions short of two rounds, above 15%/.test(b.reason || '') && /2 of A's searched decisions at a horizon other than 1/.test(b.reason || '') && !/x2\.5/.test(b.reason || '')
  && c.play === 0 && /1 of its 8 games/.test(c.reason || '') && !/above 2 a game/.test(c.reason || '')
  && /0 searched attack decisions at horizon 1/.test(c.reason || '') && /x1\.2 of B's/.test(c.reason || '') && c.retry === 16 && c.retryPerGame === 2 ? 1 : 0;
const d = pilot('retries', { retry: 4, lRetry: 1 });
const ok2 = d.play === 0 && /retry 18 over 8 games, above 2 a game/.test(d.reason || '') && d.retryPerGame === 2.25 ? 1 : 0;
fs.writeFileSync('var/j218-tools/gate-selftest.json', JSON.stringify({ ok: ok && ok2 ? 1 : 0 }) + '\n');
console.log(JSON.stringify({ ok: ok && ok2 ? 1 : 0, pass: a, edge: e.reason, starved: b.reason, bad: c.reason, retries: d.reason }));
J218EOF
```
```bash
# one 4-game ladder match of A against B on the dev set, in a pilot folder under another host (one batch pair, one
# worker); then its exposure (both sides' keys, both sides' lands counters, both sides' kinds), its rollout reader (A's
# short decisions and both sides' play time a rollout, for the gate), and the match line's names, hashes, set and seat
# configs (numbers only, so no check reads a missing key)
mkdir -p var/j218-tools
rm -rf var/ai-ladder-pilot/J218
./tools/ai-ladder.sh match search-v3-declined-instant-t1-x3 search-v3-declined-instant --pairs tools/ai-bench/pairs-dev.txt --games 4 --batch-pairs 1 --game-timeout 1800 --host j218-pilot --purpose pilot --dir var/ai-ladder-pilot/J218 --experiments var/ai-ladder-pilot/J218/experiments.jsonl --out var/ai-ladder-pilot/J218/match.json --jobs 1
node var/j218-tools/exposure.cjs var/ai-ladder-pilot/J218 var/ai-ladder-pilot/J218/match.json var/j218-tools/pilot-exposure.json
node var/j218-tools/rollouts.cjs var/ai-ladder-pilot/J218 var/ai-ladder-pilot/J218/match.json var/j218-tools/rollouts-pilot.json
node - <<'J218EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const m = read('var/ai-ladder-pilot/J218/match.json'), ro = read('var/j218-tools/rollouts-pilot.json');
const pl = read('var/j218-tools/players.json');
const n = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const k = (t, x) => n(t && t.byKind && t.byKind[x] ? t.byKind[x].searched : 0, 0);
const A = 'search-v3-declined-instant-t1-x3', B = 'search-v3-declined-instant';
const r = { written: 1,
  namesOk: m.a === A && m.b === B ? 1 : 0,
  hashesOk: String(m.ah) === '9aeacaff9142' && String(m.bh) === 'af6771947a25' ? 1 : 0,
  setOk: m.set === 'tools/ai-bench/pairs-dev.txt' ? 1 : 0,
  cfgOk: pl.cfgs && ro.aCfg === pl.cfgs[A] && ro.bCfg === pl.cfgs[B] && ro.cfgExact === ro.lines && ro.lines === 4 ? 1 : 0,
  played: n(m.played, 0), errorsTimeouts: n(m.errors, 9) + n(m.timeouts, 9),
  aP: k(m.aSearch, 'p'), aA: k(m.aSearch, 'a'), aB: k(m.aSearch, 'b'), bP: k(m.bSearch, 'p'), bA: k(m.bSearch, 'a'), bB: k(m.bSearch, 'b'),
  aMs: n(m.aSearch && m.aSearch.msPerDecision, -1), bMs: n(m.bSearch && m.bSearch.msPerDecision, -1),
  aMsP: n(m.aSearch && m.aSearch.msMean && m.aSearch.msMean.p, -1), aMsA: n(m.aSearch && m.aSearch.msMean && m.aSearch.msMean.a, -1),
  aSecPerGame: m.played ? Math.round(n(m.aSearch && m.aSearch.msPerDecision, 0) * n(m.aSearch && m.aSearch.searched, 0) / m.played) / 1000 : -1,
  bSecPerGame: m.played ? Math.round(n(m.bSearch && m.bSearch.msPerDecision, 0) * n(m.bSearch && m.bSearch.searched, 0) / m.played) / 1000 : -1,
  aRolloutsPerDecision: n(ro.aRolloutsPerDecision, -1), bRolloutsPerDecision: n(ro.bRolloutsPerDecision, -1),
  aRoundsPerDecision: n(ro.aRoundsPerDecision, -1), aShortShare: n(ro.aShortShare, -1), bShortShare: n(ro.bShortShare, -1),
  aPlayMsPerRollout: n(ro.aPlayMsPerRollout, -1), bPlayMsPerRollout: n(ro.bPlayMsPerRollout, -1), playMsRatio: n(ro.playMsRatio, -1),
  aBudget: n(m.aSearch && m.aSearch.fallback && m.aSearch.fallback.budget, 0), bBudget: n(m.bSearch && m.bSearch.fallback && m.bSearch.fallback.budget, 0) };
fs.writeFileSync('var/j218-tools/pilot.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J218EOF
```
```bash
# one recorded run of 4 games of A against Forge Default (the dev set's first deck pair, two workers): each searched
# decision's horizon by kind and the searched priority decisions by window, from the search seat's decision records,
# with the bench lines' D540 and search counters (records.cjs above); then the gate
mkdir -p var/j218-tools
awk '!/^#/ && NF { print; exit }' tools/ai-bench/pairs-dev.txt > var/j218-tools/pair1.txt
cat var/j218-tools/pair1.txt
ACFG='Default+outlets+search:ms=4500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1'
rm -rf var/ai-bench/j218-pilot-rec
./tools/ai-bench.sh play --pairs var/j218-tools/pair1.txt --a "$ACFG" --b Default --games 4 --seed 218000001 --timeout 1800 --jobs 2 --run j218-pilot-rec --record-all
node var/j218-tools/records.cjs var/ai-bench/j218-pilot-rec/games var/j218-tools/rec-pilot.json > /dev/null
node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("var/j218-tools/rec-pilot.json","utf8"));const o={};for(const x of ["written","files","searchLogs","bad","games","pSearched","aSearched","bSearched","pH1","aH1","bH1","hOther","ownMainSearched","landSearched","instantSearched","outsideOwnMain","onStack","noState","benchGames","benchErrors","benchTimeouts","benchShort","benchDecisions","benchShortShare","benchPlayMsPerRollout","benchMaxMs","declinedWindows","instantWindows","landsWindows","declinedRetry","instantRetry","landsRetry"])o[x]=typeof r[x]==="number"?r[x]:-1;console.log(JSON.stringify(o),JSON.stringify(r.kinds.p.horizon),JSON.stringify(r.kinds.a.horizon),JSON.stringify(r.classes),JSON.stringify(r.msByCands))'
# the gate (D545 point 9): no error or timeout in the 8 games, A at most 15% of its searched decisions short of two
# rounds, A's records at horizon 1 and its rollouts at least 1.3 times B's, the two keys' retries at most 2 a game;
# writes var/j218-tools/gate.json {written, play, reason}
node var/j218-tools/gate.cjs
```
metrics: merged = sh: cat var/j218-merged.txt 2>/dev/null || echo 0
metrics: dst = sh: cat var/j218-decision-selftest.json 2>/dev/null || echo '{"ok":0,"checks":0,"failures":-1}'
metrics: pl = sh: cat var/j218-tools/players.json 2>/dev/null || echo '{"ok":0,"present":0,"cfgs_ok":0,"literal_ok":0,"hashes_ok":0,"kinds_ok":0,"distinct":0}'
metrics: sd = sh: cat var/j218-tools/src-diff.json 2>/dev/null || echo '{"count":-1,"rc":1,"exact":0,"playersAdd":-1,"playersDel":-1,"onePlayer":0}'
metrics: hb = sh: cat var/j218-tools/base.json 2>/dev/null || echo '{"ok":0,"own":0,"first":0,"last":0,"pilot":0,"devPairs":0,"perPairMin":0,"perPairMax":0}'
metrics: est = sh: cat var/j218-tools/exposure-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: st = sh: cat var/j218-tools/selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: rst = sh: cat var/j218-tools/rec-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: sst = sh: cat var/j218-tools/seeds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: ost = sh: cat var/j218-tools/ro-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: gst = sh: cat var/j218-tools/gate-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: px = sh: cat var/j218-tools/pilot-exposure.json 2>/dev/null || echo '{"landsClean":0,"kindsOk":0,"games":0}'
metrics: pp = sh: cat var/j218-tools/pilot.json 2>/dev/null || echo '{"written":0,"namesOk":0,"hashesOk":0,"setOk":0,"cfgOk":0}'
metrics: gate = sh: cat var/j218-tools/gate.json 2>/dev/null || echo '{"written":0,"play":0}'
metrics: rc = sh: cat var/j218-tools/rec-pilot.json 2>/dev/null || echo '{"written":0,"games":0,"bad":-1,"onStack":-1,"landSearched":-1,"landsWindows":-1}'
check: merged == 1
check: dst.ok == 1
check: dst.failures == 0
check: dst.checks == 472
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
check: hb.own == 655000000
check: hb.first == 655900000
check: hb.last == 655900599
check: hb.pilot == 87000000
check: hb.devPairs == 30
check: hb.perPairMin == 40
check: hb.perPairMax == 40
check: est.ok == 1
check: est.cases == 5
check: est.passed == 5
check: st.ok == 1
check: st.cases == 50
check: st.passed == 50
check: rst.ok == 1
check: rst.cases == 15
check: sst.ok == 1
check: ost.ok == 1
check: gst.ok == 1
check: px.landsClean == 1
check: px.kindsOk == 1
check: px.games == 4
check: pp.written == 1
check: pp.namesOk == 1
check: pp.hashesOk == 1
check: pp.setOk == 1
check: pp.cfgOk == 1
check: gate.written == 1
check: rc.written == 1
check: rc.bad == 0
check: rc.onStack == 0
check: rc.landSearched == 0
check: rc.landsWindows == 0

The pilot asks only whether anything is broken; whether the match plays is the gate's:
- `merged`: the pinned commit is on `origin/main`;
- the build passes with the decision self-test at 0 failures and exactly 472 checks (J216's pin's count: no bridge
  source changed), and the ai-bench self-test and the ladder registry test pass;
- `pl`: six players resolve on this PC at their registered hashes (compared as strings) and A's ai-bench config is
  exactly B's with `ms=4500` and `turns=1`, written out (`literal_ok`) and built (`cfgs_ok`);
- `sd`: git answered, and against D543's merge the only file changed under `bridge/src`, `tools/ai-ladder` and
  `tools/ai-bench` is `tools/ai-ladder/players.json`, 2 lines in and 1 out, its players the pin's with exactly the new
  one appended: the search is J216's code;
- `hb`: `hostBase('j218')` is 655,000,000, an empty folder's first match block 655,900,000 (the 600th 655,900,599),
  the pilot's host name has base 87,000,000, and the dev set's 30 deck pairs get exactly 40 batches each from the 600
  blocks;
- the readers: the exposure reader on 5 synthetic folders (`est`), the verdict on 50 synthetic cases (`st`: each
  reading on both sides of its bars, the descriptions, NOT PLAYED, and INCOMPLETE for every completeness part, the
  horizon's trace at 1.299 and 1.3 among them), the recording reader on 15 synthetic checks (`rst`, the horizons and
  the bench search counters among them), and the block, rollout and gate readers on synthetic files (`sst`, `ost`,
  `gst`: the gate at exactly its bars, starved, at another horizon, short rollouts, a timeout and too many retries);
- in 4 games against search-v3-declined-instant on the dev set: the names, hashes, set and seat configs are A's and
  B's, every batch line carried both seat configs exactly, both sides searched priority and attacks and neither a
  block (`kindsOk`), and neither side's lands counters are above 0 (`landsClean`): a lands counter stops the night;
- in 4 recorded games against Forge Default on the dev set's first pair: the logs read, no searched priority decision
  on a non-empty stack (`onStack`), none in a land window (`landSearched`) and no lands window in A's bench counters
  (`landsWindows`): a key that fires in a window it does not own stops the night.

Read, not checked: A's and B's search seconds a game, ms a searched decision, rollouts and rounds a decision, the
share short of two rounds and the play time a rollout in the 4 ladder games (`pilot.json`); the recorded horizons and
windows; the pilot's longest game against the 1,800 s timeout (`gate.json`). The gate decides whether the match plays;
a match it keeps out is not a pilot failure.

## Commands
cores: 7
clean: var/ai-ladder/match-J218.json var/j218-ladder
```bash
# the match: search-v3-declined-instant-t1-x3 (9aeacaff9142) against search-v3-declined-instant (af6771947a25), 4,800
# games on the DEV set, in a ladder folder of its own under --host j218, emptied here (so a restart replays the same
# blocks), so it is dealt blocks 655,900,000-655,900,599
test -f var/j218-tools/verdict.mjs
test -f var/j218-tools/gate.json
mkdir -p var/j218
rm -rf var/j218-ladder var/ai-ladder/match-J218.json
if ! node -e 'const g=require("./var/j218-tools/gate.json");process.exit(g.play===1?0:1)'; then
  node -e 'const g=require("./var/j218-tools/gate.json");require("fs").writeFileSync("var/ai-ladder/match-J218.json",JSON.stringify({notPlayed:true,reason:g.reason||"the gate did not pass",played:0,complete:false,errors:0,timeouts:0,score:0,lo:0,hi:0,elo:0,eloLo:0,eloHi:0})+"\n")'
  echo "J218: search-v3-declined-instant-t1-x3 not played (the pilot's gate)"; exit 0
fi
echo "J218: search-v3-declined-instant-t1-x3 against search-v3-declined-instant, 4,800 games on the dev set, blocks 655,900,000-655,900,599"
./tools/ai-ladder.sh match search-v3-declined-instant-t1-x3 search-v3-declined-instant --pairs tools/ai-bench/pairs-dev.txt --host j218 --dir var/j218-ladder --games 4800 --hours 32 --game-timeout 1800 --out var/ai-ladder/match-J218.json --jobs {workers}
tail -1 var/j218-ladder/match.jsonl
```
cores: 1
clean: var/j218/verdict.json var/j218/v.json var/j218/report.md var/j218/exposure.json var/j218/rollouts.json var/j218/seeds.json
```bash
# the pre-registered reading: the match's blocks and set, rollouts and exposure, the verdict, and report.md (numbers
# only; the PC session writes the summary beside it). Nothing here plays a game; a reading is never a failure.
test -f var/j218-tools/verdict.mjs
mkdir -p var/j218
node var/j218-tools/rollouts.cjs var/j218-ladder var/ai-ladder/match-J218.json var/j218/rollouts.json > /dev/null
node var/j218-tools/seeds.cjs var/j218-ladder var/ai-ladder/match-J218.json var/j218/seeds.json
node var/j218-tools/exposure.cjs var/j218-ladder var/ai-ladder/match-J218.json var/j218/exposure.json > /dev/null
node var/j218-tools/verdict.mjs var/ai-ladder/match-J218.json var/j218 var/j218/verdict.json > /dev/null
# the checks' copy: the verdict's numbers only (every value a number; strings, nulls and the description detail dropped)
node -e 'const fs=require("fs");const v=JSON.parse(fs.readFileSync("var/j218/verdict.json","utf8"));const out={};for(const [k,x] of Object.entries(v)){if(typeof x==="number")out[k]=x}fs.writeFileSync("var/j218/v.json",JSON.stringify(out)+"\n");console.log(JSON.stringify(out))'
node - <<'J218EOF'
// J218's report: the job's own numbers (D545 points 3 to 5 and 8), nothing worded beyond them.
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const v = read('var/j218/verdict.json'), m = read('var/ai-ladder/match-J218.json'), bs = read('var/j218/seeds.json');
const g = read('var/j218-tools/gate.json'), rc = read('var/j218-tools/rec-pilot.json'), pp = read('var/j218-tools/pilot.json');
const d = (x) => (x === null || x === undefined ? '-' : x);
const pct = (x, n = 1) => (typeof x === 'number' ? `${(x * 100).toFixed(n)}%` : '-');
const x = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(m.id || '');
const t0 = x ? Date.UTC(+x[1], +x[2] - 1, +x[3], +x[4], +x[5], +x[6]) : null, t1 = typeof m.at === 'string' ? Date.parse(m.at) : null;
const hours = t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null;
const L = ['# J218: search-v3-declined-instant-t1-x3 against search-v3-declined-instant on the dev deck set, 4,800 games (D398; D545; D519\'s four readings)', ''];
L.push('**Outcome under the pre-registered rule (D545 points 3 to 5):**', '', `- ${d(v.line)}`, '');
L.push(`**What it earns:** a live-seat candidate for the owner ${d(v.liveSeatCandidate)}; the horizon track closed at practical clocks ${d(v.horizonClosed)}. **NOT PLAYED:** ${d(v.notPlayed)}. **INCOMPLETE (owed a repost):** ${d(v.incomplete)}. **The live seat:** unchanged by this job (liveSeatChanged ${d(v.liveSeatChanged)}); adoption is the owner's.`, '');
L.push('| match | set | played / planned | complete | outcome | described | score [95%] | Elo [95%] | pairs | draws, errors, timeouts | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
if (m.notPlayed === true) L.push(`| J218 search-v3-declined-instant-t1-x3 | dev | not played | - | NOT PLAYED | - | - | - | - | - | - |`);
else L.push(`| J218 ${d(m.a)} vs ${d(m.b)} | ${d(m.set)} | ${d(m.played)} / ${d(m.planned)} | ${d(m.complete)} | ${d(v.outcome)} | ${d(v.word)} | ${d(m.score)} [${d(m.lo)}, ${d(m.hi)}] | ${d(m.elo)} [${d(m.eloLo)}, ${d(m.eloHi)}] | ${d(m.pairs)} | ${d(m.draws)}, ${d(m.errors)}, ${d(m.timeouts)} | ${d(hours)} |`);
L.push('', 'J212\'s three depth arms, as they were (literals from pc-results/results/J212/; 1,200 games each, the confirm set, against search-v1-anytime; never pooled, never read against this match):', '');
L.push('| arm | Elo [95%] | reading | search s a game A / B | rollouts a decision A / B | fewer than 2 rounds A / B | ms of play a rollout A / B |');
L.push('|---|---|---|---|---|---|---|');
L.push('| search-v2-t1 (63c35e9f7d5b) | -1.7 [-14.6, 11.2] | NOT SHOWN | 27.8 / 20.6 | 11.47 / 15.79 | 11.8% / 2.8% | 92.1 / 49.7 |');
L.push('| search-v2-a1 (3cf65e94df28) | 5.2 [-5.7, 16.2] | INCONCLUSIVE AT 1,200 | 24.3 / 21.5 | 14.39 / 15.53 | 7.7% / 3.4% | 61.3 / 51.2 |');
L.push('| search-v2-t1-x3 (ce99b41f9898) | 9.8 [-1.7, 21.4] | INCONCLUSIVE AT 1,200 | 53.9 / 19.8 | 19.08 / 16.43 | 1.6% / 2.4% | 114.9 / 46.1 |');
L.push('', '**The depth and the cost, A against B on the same games (description only; the seconds are this machine\'s, D388):**', '');
L.push('| search s a game A / B (x) | ms a decision A / B | ms p, a A | ms p, a B | searched p, a, b A | searched p, a, b B | rollouts a decision A / B | complete rounds a decision A / B | fewer than 2 rounds A / B | ms of play a rollout A / B (x; 1.3 is the bar) | ms of copy a rollout A / B | rollouts the step cap cut A / B |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
L.push(`| ${d(v.aSecPerGame)} / ${d(v.bSecPerGame)} (x${d(v.costRatio)}) | ${d(v.aMs)} / ${d(v.bMs)} | ${d(v.aMsP)}, ${d(v.aMsA)} | ${d(v.bMsP)}, ${d(v.bMsA)} | ${d(v.aP)}, ${d(v.aA)}, ${d(v.aB)} | ${d(v.bP)}, ${d(v.bA)}, ${d(v.bB)} | ${d(v.aRolloutsPerDecision)} / ${d(v.bRolloutsPerDecision)} | ${d(v.aRoundsPerDecision)} / ${d(v.bRoundsPerDecision)} | ${pct(v.aShortShare, 2)} / ${pct(v.bShortShare, 2)} | ${d(v.aPlayMsPerRollout)} / ${d(v.bPlayMsPerRollout)} (x${d(v.playMsRatio)}) | ${d(v.aCopyMsPerRollout)} / ${d(v.bCopyMsPerRollout)} | ${d(v.aStepCap)} / ${d(v.bStepCap)} |`);
L.push('', '| side | decisions searched (games) | changed Forge: p | a | b | all | budget fallbacks [95%] | other fallbacks | step timeouts | from pass, to other, to pass a p decision | land windows left to Forge a game |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
if (m.notPlayed !== true) {
  for (const [who, t, side] of [[m.a, m.aSearch, 'a'], [m.b, m.bSearch, 'b']]) {
    if (!t || !t.searched) { L.push(`| ${d(who)} | no search | | | | | | | | | |`); continue; }
    const kd = t.byKind || {};
    const ch = (y) => (kd[y] ? `${kd[y].changed}/${kd[y].searched} (${pct(kd[y].rate)})` : '-');
    const other = Object.entries(t.fallback || {}).filter(([r]) => r !== 'budget').map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
    L.push(`| ${who} | ${t.searched} (${t.games}) | ${ch('p')} | ${ch('a')} | ${ch('b')} | ${t.changed}/${t.searched} (${pct(t.searched ? t.changed / t.searched : null)}) | ${(t.fallback || {}).budget ?? 0} = ${pct(t.budgetRate, 2)} [${pct(t.budgetLo, 2)}, ${pct(t.budgetHi, 2)}] | ${other} | ${d(t.stepTimeouts)} | ${pct(v[`${side}FromPass`])}, ${pct(v[`${side}ToOther`])}, ${pct(v[`${side}ToPass`])} | ${d(v[`${side}SkipLand`])} |`);
  }
}
L.push('', '**The pair\'s two keys, on both sides (description only: both seats carry them):**', '');
L.push('| side | key | windows a game | candidates a window | changed a game | retries a game |');
L.push('|---|---|---|---|---|---|');
for (const s of ['a', 'b']) for (const k of ['Declined', 'Instant']) L.push(`| ${s === 'a' ? 'A' : 'B'} | ${k.toLowerCase()} | ${d(v[`${s}${k}WindowsPerGame`])} | ${d(v[`${s}${k}CandsPerWindow`])} | ${d(v[`${s}${k}ChangedPerGame`])} | ${d(v[`${s}${k}RetryPerGame`])} |`);
L.push('', `Rule parts: names ${d(v.names)}, hashes ${d(v.hashes)}, the dev set ${d(v.setOk)} (line set ${d(v.set)}, ${d(bs.offSet)} rows on another set), seat configs ${d(v.cfgs)}, the registered blocks ${d(v.blocks)} (${d(bs.blocks)} blocks ${d(bs.min)} to ${d(bs.max)}, ${d(bs.games)} games, ${d(bs.otherGames)} of another match; ${d(bs.deckPairs)} deck pairs, ${d(bs.perDeckPairMin)} to ${d(bs.perDeckPairMax)} games each), priority and attacks searched and no block on both sides ${d(v.kindsOk)}, the exposure read on this match ${d(v.exposureRead)}, both sides' lands counters clean ${d(v.landsClean)} (A ${d(v.aLands)}, B ${d(v.bLands)} above 0), A's rollouts deeper ${d(v.horizonTrace)} (x${d(v.playMsRatio)}); complete ${d(v.complete)}. SHOWN ${d(v.shown)}, SMALL GAIN ${d(v.smallGain)}, INCONCLUSIVE AT 4,800 ${d(v.inconclusive4800)}, NOT SHOWN ${d(v.notShown)}, NOT PLAYED ${d(v.notPlayed)}, INCOMPLETE ${d(v.incomplete)}. Described: indistinguishable ${d(v.indistinguishable)}, a measured loss ${d(v.measuredLoss)}, a measured gain ${d(v.measuredGain)}. Match id ${d(m.id)}, host ${d(m.host)}, set ${d(m.set)}.`);
L.push('', '## The pilot (D545 point 9): the gate, the recorded horizons and the longest game', '');
L.push(`The gate: ${g.play === 1 ? 'played' : `not played: ${d(g.reason)}`}.`, '');
L.push('| games (ladder + recorded) | errors and timeouts | short of two rounds (A) | recorded horizon 1: p, a; other | play ms a rollout A / B (x) | retries, both keys (a game) | ladder search s a game A / B | ladder ms a decision A / B | recorded searched p: own main / land / instant-speed | on a stack | longest game, ladder / recorded (s) |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
const sec = (ms) => (typeof ms === 'number' ? Math.round(ms / 100) / 10 : '-');
L.push(`| ${d(g.ladderGames)} + ${d(g.benchGames)} | ${d(g.errorsTimeouts)} | ${d(g.short)} of ${d(g.decisions)} (${pct(g.shortShare, 2)}) | ${d(g.pH1)}, ${d(g.aH1)}; ${d(g.hOther)} | ${d(g.aPlayMsPerRollout)} / ${d(g.bPlayMsPerRollout)} (x${d(g.playMsRatio)}) | ${d(g.retry)} (${d(g.retryPerGame)}) | ${d(pp.aSecPerGame)} / ${d(pp.bSecPerGame)} | ${d(pp.aMs)} / ${d(pp.bMs)} | ${d(rc.ownMainSearched)} / ${d(rc.landSearched)} / ${d(rc.instantSearched)} | ${d(rc.onStack)} | ${sec(g.longestLadderMs)} / ${sec(g.longestBenchMs)} |`);
fs.mkdirSync('var/j218', { recursive: true });
fs.writeFileSync('var/j218/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J218EOF
```
The verdict (`verdict.mjs`, J216's reader made J218's: the pooled line, the recommendation, the pairs reader and NOT
READ dropped; both sides' lands counters and the horizon's trace added to the completeness parts; the blocks
655,900,000-655,900,599) gives the match exactly one outcome, in this precedence: NOT PLAYED when the pilot's gate kept
it out (with the gate's reason); INCOMPLETE when any part of D545 point 3's completeness fails, a line or a row off the
dev set, a lands counter above 0 on either side, or A's rollouts under 1.3 times B's in play time among them (no
reading); else one of D519's four readings, compared in integers as the line carries them. It writes `v.json` with the
completeness parts, exactly one of shown / smallGain / inconclusive4800 / notShown / notPlayed / incomplete, exactly
one description for a complete match, liveSeatCandidate and horizonClosed, the depth, the cost, both sides' exposure,
and `liveSeatChanged` 0.
check: v.written == 1
check: v.liveSeatChanged == 0
check: v.incomplete == 0
check: v.complete + v.notPlayed == 1
check: v.shown + v.smallGain + v.inconclusive4800 + v.notShown + v.notPlayed == 1
check: v.shown + v.smallGain + v.inconclusive4800 + v.notShown == v.complete
check: v.indistinguishable + v.measuredLoss + v.measuredGain == v.complete
check: v.liveSeatCandidate == v.shown + v.smallGain
check: v.horizonClosed == v.notShown
check: v.notPlayed == 0 or cm.played == 0
check: v.complete == 0 or (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240)
check: v.complete == 0 or (bs.blocks == 600 and bs.min == 655900000 and bs.max == 655900599 and bs.games == 4800 and bs.otherGames == 0 and bs.offSet == 0)
check: v.complete == 0 or (v.horizonTrace == 1 and v.playMsRatio >= 1.3 and v.landsClean == 1)
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

The checks say: exactly one outcome and it is not INCOMPLETE; a reading comes from a match line that says complete,
played all 4,800 games and had at most one in 20 end in an engine error or a timeout, on the 600 registered blocks of
the dev set with no other match's game in the folder, with A's rollouts deeper by the trace and no lands counter on
either side; a NOT PLAYED match played nothing; a complete match has exactly one reading and one description; a
live-seat candidate exactly for SHOWN or SMALL GAIN and the horizon closed exactly for NOT SHOWN; the four readings and
the two descriptions agree with the match line in the runner's own language; the live seat is unchanged. Any reading
passes them, and so does NOT PLAYED: outcomes D545 registered, not failures. If the match is cut short (its own stop at
32 h, or a memory stop the runner retries from the match's block, which empties the folder and replays the same
blocks), or is incomplete for any other reason, it is INCOMPLETE and the job fails on its checks; the report is still
written, and what is owed is a repost alone under a new job id after its cause is found, not a reading of a cut match.

## Abort if
abort: j218_err >= 30 and j218_err > j218_games / 10

Engine trouble only: once 30 games of the match have ended in an engine error or a timeout, the job stops if they are
more than one in ten. The match has no stopping rule on the score.

## Report
collect: var/ai-ladder/match-J218.json
collect: var/j218/verdict.json
collect: var/j218/report.md
collect: var/j218/exposure.json
collect: var/j218/rollouts.json
collect: var/j218/seeds.json
collect: var/j218-tools/gate.json
collect: var/j218-tools/pilot.json
collect: var/j218-tools/pilot-exposure.json
collect: var/j218-tools/rollouts-pilot.json
collect: var/j218-tools/rec-pilot.json

`report.md` is the job's own numbers. The PC session writes `summary.md` from it:
- **the answer first**, in one sentence a person can act on: whether the search looking one turn further at three
  times the clock plays better than the pair on the 30 dev deck pairs, the outcome under D545's rule (SHOWN, SMALL
  GAIN, INCONCLUSIVE AT 4,800 or NOT SHOWN; or NOT PLAYED with the gate's reason; or INCOMPLETE, owed a repost, with
  its cause) with the score and Elo interval against search-v3-declined-instant and the describing word;
- **what it earns:** for SHOWN or SMALL GAIN, a live-seat candidate for the owner under its own decision and a
  seat-queue row, with its cost (search seconds a game on each side and their ratio, ms a searched decision), and the
  cheaper clock (ms=3000) as the next depth lane; for NOT SHOWN, that the deeper horizon at 2.7 to 3 times the thinking
  time is worth less than about +11.8 Elo over the pair at this width and the horizon track closes at practical clocks;
- **what it does not say:** which depth (priority or attacks) carried it, how much is the clock, anything against the
  search-v2-no-b or against J212's points, and anything beyond these 30 deck pairs of six cubes and this one opponent;
- **the depth and the cost:** rollouts and complete rounds a decision, the share short of two rounds, budget
  fallbacks, ms of play a rollout and its ratio, on each side, beside J212's t1-x3 row; search seconds a game and ms a
  searched decision; both sides' declined and instant exposure; the pilot's recorded horizons and its longest game;
- **the run:** draws, errors and timeouts, the deal blocks (655,900,000-655,900,599, new to every job), the games per
  dev deck pair, the match's hours against the 17 h estimate, the pressure events in STATUS and any block the runner
  retried, and that it ran alone (D521).

Never write "no effect", "no gain" or "no cost" for an interval that includes 0. J218 is read against
search-v3-declined-instant and never against J212's points.
