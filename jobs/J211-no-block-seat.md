id: J211
title: The no-block seat: one fixed 4,800-game match (2,400 mirrored pairs, D398, the confirm set, no stopping rule) of search-v2-no-b, search-v2 searching priority and attack decisions and leaving blocks to Forge, against search-v1-anytime (search-v2, the live seat, searching all three), on deal blocks no match has played (--host j211, 931,900,000-931,900,599), with D536's pre-registered reading: NO-BLOCK SEAT HOLDS, NO-BLOCK SEAT FAILS or INCONCLUSIVE AT 4,800. This job never changes the live seat
public_title: Search without block search: one fixed 4,800-game match
public_est: ~9 h (one night)
public_decides: Whether the AI seat can skip searching its blocks at a small bounded cost
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
alone: yes
repos: mtg-table@d1d6b20fd87480c91ffc1ac7b794f8f85c030f9a (main at d1d6b20f, D536's merge on c744a0e8, J210's pin; the newest main when this job was written. D536 is docs only: `git diff c744a0e8 d1d6b20f` changes nothing under bridge/src, tools/ai-ladder or tools/ai-bench, so the players and the search are J210's, and the pilot checks that diff is empty. Pinned so every game of the match is one code version, D341)
decides: whether search-v2 without its block search (what=pa, `search-v2-no-b`) is at most 10 Elo weaker than search-v2 (what=pab, `search-v1-anytime`, the live seat), measured head to head with 95% confidence at 4,800 games on deals neither has played (D536 points 5 to 9). NO-BLOCK SEAT HOLDS makes search-v2-no-b a live-seat candidate: a seat-queue row with the measured point, interval and seconds saved, for the owner's one word (D509), never this job's change. NO-BLOCK SEAT FAILS says the block search is worth more than 10 Elo head to head; the arm stays registered and is not retried. INCONCLUSIVE AT 4,800: not adopted and not played again. Whatever the reading, the match is the sharpest measure there is of what the block search is worth (about +-5 Elo against J210's +-12 by deal), the next lane reads it, and this job never changes the live seat: SearchConfig.LIVE_DEFAULTS stays `what=pab`
hypothesis: J210 (D535; 1,200 games each against forge-default on the same 600 deals) read search-v2-no-b +88.1 Elo [72.9, 103.7] and search-v1-anytime +89.4 [73.9, 105.1], and the block search's paired contribution on top of the other two kinds (LAST b) +0.0017 score [-0.0148, +0.0182], about +1.2 Elo [-11, +13] against Forge, NOT SHOWN NEEDED, where priority's was +0.0742 and attacks' +0.0342. Searching blocks alone was worth +0.0158 over no search (ALONE b), so the block search is not nothing, and against search-v2 itself (which attacks by search) it may be worth more or less than against Forge: nothing here predicts the sign. If the true head-to-head difference is near J210's point (about -1 Elo for the arm), an interval of about +-5 Elo (J198: +-5.2; J197: +-5.0) reads HOLDS about 9 times in 10 (a standard error of about 2.6 Elo; HOLDS needs a point above about -5). FAILS needs a point below about -15, and a true -10 reads HOLDS about 2.5% of the time. The arm searched 22.7 decisions a game against 24.3 and spent 20.9 against 22.7 search seconds a game in J210 (x0.92): the saving, if it holds, is about 1.8 s a game, 8%, not the half J198 asked about
rule: D536 point 7, merged before any J211 game was played (written 2026-11-11 after J210, whose table named the arm), in its words (its list set as sentences): "the match is **complete** when its two names and hashes are A's and B's in that order, `complete` is true, 4,800 games were played and errors plus timeouts are at most 240, its blocks are exactly 931,900,000–931,900,599, and A's side searched no block decision while searching priority and attacks. NO-BLOCK SEAT HOLDS: complete and the interval's lower end is above −10 Elo. NO-BLOCK SEAT FAILS: complete and the interval's upper end is below −10 Elo. INCONCLUSIVE AT 4,800: complete and neither. Three words describe the interval beside the verdict and decide nothing: indistinguishable when it holds 0, a measured loss when it is wholly below 0, a measured gain when wholly above. A HOLDS that is also a measured loss is reported as both (holds the bar and loses about N)." The ends are the match line's own eloLo and eloHi, which the ladder rounds to 0.1 Elo, so a printed -10.0 is not above -10 and not below it. The bar is J198's and D517's "at most 10 Elo weaker", named for this match in D535 point 6 before the candidate was known. D519's reading of the same line (SHOWN, SMALL GAIN, INCONCLUSIVE AT 4,800 or NOT SHOWN, for the arm as a gain over search-v2) is printed beside the verdict as information and decides nothing. The match: one fixed match (D398, no stopping rule) of 2,400 mirrored pairs on the confirm set, A = search-v2-no-b (59505e241363), B = search-v1-anytime (cdd55e02a89c). An incomplete match gets no verdict. J210's numbers stand beside it as a description and are never pooled with it. The cost (each side's searched decisions by kind, ms a searched decision, search seconds a game, A's as a share of B's) is reported beside every reading and changes none
followup: morning-read
est: ~9-9.5 h at 7 workers (an estimate; range 7.5-12 h), 15.5 h at worst (the match's own stop). From three walls on this host at 7 workers: J197, a search-v2 mirror at ~935 ms a decision on both sides, took 9 h 33 min for 4,800 games under 30 pressure events; J198, one side at half the clock, 7.44 h; J210's eight 1,200-game matches against forge-default 7.37 h in all, 23% over their estimate, with the matches held at 5 or 6 workers for stretches. Here both sides think at search-v2's clock and A searches about 7% fewer decisions, so the match is J197's mirror less a few percent: about 9 h, 11 to 12 if memory pressure holds it at 5 or 6 workers. The match stops itself at --hours 15.5 and the step's timeout is 16 h, so a slow night still completes; a match that reaches its own clock is `complete: false` and gets no verdict
resumable: no
timeout: 16h
clean: var/j211 var/j211-ladder var/ai-ladder-pilot/J211 var/ai-ladder/match-J211.json
progress: metric j211_games games of 4800
metrics: j211_games = sh: node -e 'const fs=require("fs");const f="var/j211-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v2-no-b\"")&&l.includes("\"b\":\"search-v1-anytime\""))n++;console.log(n)'
metrics: j211_err = sh: node -e 'const fs=require("fs");const f="var/j211-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v2-no-b\"")&&l.includes("\"b\":\"search-v1-anytime\"")&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cm = sh: cat var/ai-ladder/match-J211.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: ro = sh: cat var/j211/rollouts.json 2>/dev/null || echo '{"games":0,"aDecisions":0,"bDecisions":0,"aBlocks":-1,"bBlocks":-1}'
metrics: bs = sh: cat var/j211/seeds.json 2>/dev/null || echo '{"blocks":0,"games":0,"min":0,"max":0,"fullBlocks":0,"otherGames":-1}'
metrics: v = sh: cat var/j211/verdict.json 2>/dev/null || echo '{"written":0,"complete":0,"names":0,"hashes":0,"aKinds":0,"bKinds":0,"blocks":0,"holds":0,"fails":0,"inconclusive4800":0,"indistinguishable":0,"measuredLoss":0,"measuredGain":0,"liveSeatCandidate":0,"liveSeatChanged":0,"aBlocksSearched":-1,"bBlocksSearched":-1,"aSearched":-1,"bSearched":-1}'
headline: cm.played, cm.score, cm.lo, cm.hi, cm.elo, cm.eloLo, cm.eloHi, v.holds, v.fails, v.inconclusive4800, v.indistinguishable, v.measuredLoss, v.measuredGain, v.d519, v.aSecPerGame, v.bSecPerGame, v.costRatio, v.secSaved, cm.aSearch.msPerDecision, cm.bSearch.msPerDecision, v.aSearched, v.bSearched, v.aBlocksSearched, v.bBlocksSearched, v.liveSeatCandidate, bs.min, bs.max

**Why this job** (J210's table; D535 point 6; D536). J210 played the eight corners of search-v2's `what=` knob,
each 1,200 games against Forge Default on the same 600 deals, and paired them by deal. Search as a whole was worth
+0.1217 score over the no-search seat (about 87 Elo). Taken last, on top of the other two kinds, searching priority
decisions was worth +0.0742 and attacks +0.0342, both NEEDED; searching blocks was worth +0.0017 [-0.0148, +0.0182],
NOT SHOWN NEEDED. D535's rule, written before any J210 game, names a corner a candidate when the kind it leaves out
is not shown needed, and promises it one 4,800-game head-to-head against search-v2 under the -10 Elo bar. One corner
qualified: `search-v2-no-b` (`what=pa`). This is that match (D536).

**What it does not do.** It does not change the live seat, propose a change, add or register a player, tune
anything, or play a second match. It is not the faster seat J198 asked about: the arm spent 20.9 against 22.7 search
seconds a game in J210, 8% less, at the same clock a decision. It reads no outcome by deck or by deal, and it does
not pool J210's games with its own.

**What is played.** One `ai-ladder.sh match` of 4,800 games: 2,400 mirrored pairs (each deal played twice with the
seats swapped) in 600 batches of 8 games on the confirm deck set (30 deck pairs, each 40 batches, 160 games, in both
seat orders), with no stopping rule on the score (D398). A is `search-v2-no-b` (`59505e241363`), B is
`search-v1-anytime` (`cdd55e02a89c`). Their ai-bench configs are
`Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1` and the
same with `what=pab`: one key differs.

**Deal blocks no match has played** (D536 point 6). A match's batch seeds start at its host name's base plus 900,000
and walk up past the blocks its ladder folder has played. Under this PC's own name the match would take
114,900,000-114,900,599, and the first 150 of those are the 600 deals J210 named the candidate on: an arm chosen
because its difference was small on some deals is flattered by those deals. So the match runs under `--host j211`
(`hostBase('j211')` is 931,000,000; the pilot checks it) in a ladder folder of its own, `var/j211-ladder`, and takes
**931,900,000-931,900,599**. No game in any of the lab's ladder logs is on base 931 (338,577 rows read on 2026-11-11: all on base 114 but 2,240
tuning rows on base 610 and the pilots' own hosts), so
these are new deals for both players. `--host` changes the seed base and the names in the log, nothing a game plays
by (J198's pilot used the flag the same way). The match's own block empties the folder before it starts, so a match
the runner starts again after a memory stop replays the same 600 blocks instead of taking the next ones (D535 point
2's reason, and J210's eight matches did the same). The block reader checks the range after the match, and the
verdict refuses any other.

**The verdict and the three words.** The verdict is the -10 Elo bar's three cases, as J198's was: the question is a
bounded loss. Beside it, deciding nothing, the interval is described as indistinguishable (it holds 0), a measured
loss (wholly below 0) or a measured gain (wholly above); J198's -6.5 Elo [-11.7, -1.3] would be
described as a measured loss. A HOLDS that is also a measured loss is reported as both. D519's four readings are
for a gain; the same line's reading under them is printed as information.

**The cost** (D536 point 8). From the match line: each side's searched decisions by kind, its ms a searched
decision, and its search seconds a game (ms a decision x searched / games), A's as a share of B's and the seconds a
game A saves. Wall-clock budgets are machine-dependent (D388); the seconds are this machine's. The cost changes no
reading.

**A's side must not have searched a block.** The match line's `aSearch.byKind` has a key only for a kind that was
searched; the verdict requires A's block count to be 0 with priority and attacks above 0, and reports whether B
searched all three (`bKinds`), which the job checks on its own line. The rollout reader counts the same from the
batch counters (`search.b.considered`), and the job checks the two agree.

**Why one match and no tuning.** D398: a fixed match has no stopping rule to bias its score, and one match per
question keeps the reading clean. D536 rejected a 1,200-game match first (at +-10 Elo it could not separate -10
from 0), a different bar for a smaller saving (the bar was written before the candidate was known), and other arms
in the same night.

**When it runs.** Alone (`alone: yes`, D521): search players think against a wall clock, and anything heavy beside
the match changes what a decision's 1.5 s buys. The PC session runs no build, gate or test beside it.

## Pilot
About 10 minutes:
- the pin is merged;
- the build, the bench self-test and the ladder registry test;
- `ai-ladder.sh list` resolves both players at their registered hashes, `59505e241363` and `cdd55e02a89c`, checked
  as strings, and the arm's seat config is search-v1-anytime's with `what=pab` replaced by `what=pa` and nothing
  else;
- the files changed under `bridge/src`, `tools/ai-ladder` and `tools/ai-bench` since J210's pin: none;
- `hostBase('j211')` is 931,000,000, so the match's base is 931,900,000;
- the verdict script, the block reader and the rollout reader written and tested on synthetic files;
- 4 games of the arm against `search-v1-anytime`, one worker, in the pilot's own folder and seed range: both sides
  search, the arm searches no block decision, and the rollout reader agrees with the match line.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j211-merged.txt || echo 0 > var/j211-merged.txt
cat var/j211-merged.txt
./bridge/build.sh
./tools/ai-bench.sh --selftest
node --test web/test/ai-ladder.test.ts
```
```bash
# both players resolve at their registered hashes, and the arm is search-v2 with what=pab -> what=pa and nothing else (D535)
mkdir -p var/j211-tools
./tools/ai-ladder.sh list > var/j211-tools/players.txt
grep -E '^(search-v1-anytime|search-v2-no-b) ' var/j211-tools/players.txt
node - <<'J211EOF'
// J211's pilot: both players resolve, at the hashes J210's match lines recorded (compared as strings), and the arm is
// search-v1-anytime (search-v2) with `what=pab` -> `what=pa` and nothing else.
const fs = require('fs');
const L = fs.readFileSync('var/j211-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const v1 = get('search-v1-anytime'), nb = get('search-v2-no-b');
const V1CFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1';
const NBCFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1';
const r = {
  present: [v1, nb].every((p) => p && p.cfg) ? 1 : 0,
  v1_cfg_ok: v1 && v1.kind === 'search' && v1.cfg === V1CFG ? 1 : 0,
  nob_only_what: nb && nb.kind === 'search' && v1 && v1.cfg === V1CFG && nb.cfg === NBCFG
    && nb.cfg === v1.cfg.replace(',what=pab,', ',what=pa,') ? 1 : 0,
  hashes_ok: v1 && nb && String(v1.hash) === 'cdd55e02a89c' && String(nb.hash) === '59505e241363' ? 1 : 0,
  hashes: { 'search-v1-anytime': v1?.hash ?? null, 'search-v2-no-b': nb?.hash ?? null },
  cfgs: { 'search-v1-anytime': v1?.cfg ?? null, 'search-v2-no-b': nb?.cfg ?? null },
};
r.ok = r.present && r.v1_cfg_ok && r.nob_only_what && r.hashes_ok ? 1 : 0;
fs.writeFileSync('var/j211-tools/players.json', JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J211EOF
# the players and the search since J210's pin c744a0e8: expected none (D536 is docs only)
git diff --name-only c744a0e848cdecc8ddf7c61e128b6c4e590004fd HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j211-tools/search-diff.txt && echo 0 > var/j211-tools/search-diff.rc || echo 1 > var/j211-tools/search-diff.rc
node -e 'const fs=require("fs");const f=fs.readFileSync("var/j211-tools/search-diff.txt","utf8").split("\n").filter(Boolean);const rc=Number(fs.readFileSync("var/j211-tools/search-diff.rc","utf8").trim());const r={files:f,count:f.length,rc:rc===0?0:1};fs.writeFileSync("var/j211-tools/search-diff.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
# the seed base --host j211 gives a match: hostBase('j211') + 900,000 = 931,900,000 (D536 point 6), and the first block
# an empty folder takes from it is the base itself
cat > var/j211-tools/base.mjs <<'J211EOF'
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const S = await import(pathToFileURL(path.resolve('tools/ai-ladder/schedule.ts')).href);
const host = S.hostBase('j211'), pilot = S.hostBase('j211-pilot'), own = S.hostBase('justin-a-B650-GAMING-X-AX-V2');
const first = S.nextBseed(host + 900000, new Set());
const r = { host, matchBase: host + 900000, first, pilot, own, ok: host === 931000000 && first === 931900000 && pilot !== host && own === 114000000 ? 1 : 0 };
fs.writeFileSync('var/j211-tools/base.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J211EOF
node var/j211-tools/base.mjs
```
```bash
cat > var/j211-tools/verdict.mjs <<'J211EOF'
// J211's reading, pre-registered 2026-11-11 before any J211 game (the job's rule: line; D536 point 7: J198's -10 Elo
// bar; D398's fixed match).
// usage: node verdict.mjs <match.json> <seeds.json> <out.json>     node verdict.mjs --selftest <scratch dir>
// THE MATCH: search-v2-no-b (config A: search-v2 with what=pa, blocks left to Forge) against search-v1-anytime
//   (config B: search-v2, the live seat, what=pab), 4,800 games, 2,400 mirrored pairs, the confirm set, no stopping
//   rule, under --host j211 in the ladder folder var/j211-ladder, on deal blocks 931,900,000-931,900,599.
// COMPLETE (D536 point 7): the match line names A and B in that order at their registered hashes, says
//   complete: true, all 4,800 games were played, errors + timeouts <= 240 (one in 20), eloLo and eloHi are numbers,
//   the block reader (seeds.cjs) found the match's 4,800 games on exactly the 600 blocks 931,900,000-931,900,599,
//   and A searched no block decision while searching priority and attack decisions.
// THE RULE: exactly one reading when complete:
//   NO-BLOCK SEAT HOLDS    eloLo > -10      (holds 1, liveSeatCandidate 1: a seat-queue row for the owner, D509);
//   NO-BLOCK SEAT FAILS    eloHi < -10      (fails 1);
//   INCONCLUSIVE AT 4,800  otherwise        (inconclusive4800 1).
//   HOLDS and FAILS cannot meet (eloLo <= eloHi).
// DESCRIPTIVE, deciding nothing, exactly one when complete: "a measured loss" when the Elo interval is wholly
//   below 0 (eloHi < 0), "a measured gain" when wholly above (eloLo > 0), "indistinguishable" when it holds 0
//   (an end of exactly 0 holds it). A HOLDS that is also a measured loss is worded as both.
// D519'S READING of the same line, for A as a gain over B, as information only: SHOWN (lo > 0.5 and elo >= 15),
//   SMALL GAIN (lo > 0.5, elo < 15), INCONCLUSIVE AT 4,800 (lo <= 0.5 and eloHi >= 15), NOT SHOWN (eloHi < 15).
// THE COST, reported beside every reading and never changing one: each side's searched decisions by kind, ms a
//   searched decision, and search seconds a game (ms a decision x searched / games), A's as a share of B's, and
//   the seconds a game A saves.
// B'S KINDS: bKinds says B searched all three kinds. It is not part of COMPLETE (D536 names A's side); the job
//   checks it on its own line, because a B that searched no block would not be search-v2.
// THE LIVE SEAT: this job never changes it; liveSeatChanged is 0 in every reading.
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 4800;
export const BAR = GAMES / 20;
export const LINE = -10;
export const A = 'search-v2-no-b';
export const B = 'search-v1-anytime';
export const AH = '59505e241363';
export const BH = 'cdd55e02a89c';
export const FIRST = 931900000;
export const BLOCKS = 600;
export const LAST = FIRST + BLOCKS - 1;
// J210's numbers for the same two players, each against forge-default on 600 shared deals (blocks
// 114,900,000-114,900,149), paired by deal: beside this match as a description, never pooled with it.
export const J210 = { pin: 'c744a0e8', games: 1200, blocks: '114900000-114900149',
  aScore: 0.6242, aLo: 0.6034, aHi: 0.6450, aElo: 88.1, bScore: 0.6258, bLo: 0.6048, bHi: 0.6468, bElo: 89.4,
  lastB: 0.0017, lastBLo: -0.0148, lastBHi: 0.0182, aSecPerGame: 20.9, bSecPerGame: 22.7 };

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const neg = (x) => (x === null ? null : Math.round(-x * 10) / 10 + 0);
const kinds = (t) => ({ p: num(t?.byKind?.p?.searched) ?? 0, a: num(t?.byKind?.a?.searched) ?? 0, b: num(t?.byKind?.b?.searched) ?? 0 });
// search seconds a game: ms a searched decision x searched decisions / the match's games played (D535 point 6's and
// D536's own division, so the three agree)
const secPerGame = (t, played) => {
  const ms = num(t?.msPerDecision), n = num(t?.searched), g = num(played);
  return ms !== null && n !== null && g !== null && g > 0 ? Math.round((ms * n) / g) / 1000 : null;
};

export function verdict(m, bs = null) {
  const names = m !== null && m.a === A && m.b === B ? 1 : 0;
  const hashes = m !== null && String(m.ah) === AH && String(m.bh) === BH ? 1 : 0;
  const ak = kinds(m?.aSearch), bk = kinds(m?.bSearch);
  const aKinds = m !== null && ak.b === 0 && ak.p > 0 && ak.a > 0 ? 1 : 0;
  const bKinds = m !== null && bk.p > 0 && bk.a > 0 && bk.b > 0 ? 1 : 0;
  const purpose = typeof m?.id === 'string' ? `match:${m.id}` : null;
  const blocks = bs !== null && purpose !== null && bs.purpose === purpose && bs.games === GAMES && bs.blocks === BLOCKS
    && bs.min === FIRST && bs.max === LAST ? 1 : 0;
  const s = {
    match: m === null ? 0 : 1, names, hashes, aKinds, bKinds, blocks, a: A, b: B, id: m?.id ?? null, host: m?.host ?? null,
    ah: m?.ah ?? null, bh: m?.bh ?? null, played: m?.played ?? 0, errors: m?.errors ?? null, timeouts: m?.timeouts ?? null,
    pairs: m?.pairs ?? null, score: num(m?.score), lo: num(m?.lo), hi: num(m?.hi), elo: num(m?.elo), eloLo: num(m?.eloLo),
    eloHi: num(m?.eloHi), aMs: num(m?.aSearch?.msPerDecision), bMs: num(m?.bSearch?.msPerDecision),
    aSearched: num(m?.aSearch?.searched) ?? 0, bSearched: num(m?.bSearch?.searched) ?? 0,
    aPrioritySearched: ak.p, aAttacksSearched: ak.a, aBlocksSearched: ak.b,
    bPrioritySearched: bk.p, bAttacksSearched: bk.a, bBlocksSearched: bk.b,
    blocksPlayed: num(bs?.blocks) ?? 0, blockMin: num(bs?.min) ?? 0, blockMax: num(bs?.max) ?? 0, blockGames: num(bs?.games) ?? 0,
  };
  const complete = names === 1 && hashes === 1 && m.complete === true && m.played === GAMES
    && (m.errors ?? 0) + (m.timeouts ?? 0) <= BAR && s.eloLo !== null && s.eloHi !== null && blocks === 1 && aKinds === 1 ? 1 : 0;
  const ok = complete === 1;
  const holds = ok && s.eloLo > LINE ? 1 : 0;
  const fails = ok && holds === 0 && s.eloHi < LINE ? 1 : 0;
  const inconclusive4800 = ok && holds === 0 && fails === 0 ? 1 : 0;
  const measuredLoss = ok && s.eloHi < 0 ? 1 : 0;
  const measuredGain = ok && s.eloLo > 0 ? 1 : 0;
  const indistinguishable = ok && measuredLoss === 0 && measuredGain === 0 ? 1 : 0;
  const d519 = !ok || s.lo === null || s.elo === null ? null
    : s.lo > 0.5 ? (s.elo >= 15 ? 'SHOWN' : 'SMALL GAIN') : s.eloHi >= 15 ? 'INCONCLUSIVE AT 4,800' : 'NOT SHOWN';
  const buys = ok ? { elo: neg(s.elo), lo: neg(s.eloHi), hi: neg(s.eloLo) } : { elo: null, lo: null, hi: null };
  const aSecPerGame = secPerGame(m?.aSearch, m?.played), bSecPerGame = secPerGame(m?.bSearch, m?.played);
  const costRatio = aSecPerGame !== null && bSecPerGame !== null && bSecPerGame > 0 ? Math.round((aSecPerGame / bSecPerGame) * 10000) / 10000 : null;
  const secSaved = aSecPerGame !== null && bSecPerGame !== null ? Math.round((bSecPerGame - aSecPerGame) * 1000) / 1000 : null;
  const liveSeatCandidate = holds;
  const liveSeatChanged = 0;
  const cost = costRatio === null ? 'no cost read'
    : `${aSecPerGame} against ${bSecPerGame} search seconds a game (x${costRatio}, ${secSaved} s saved), ${s.aMs} against ${s.bMs} ms a searched decision, ${s.aSearched} against ${s.bSearched} decisions searched`;
  const word = measuredLoss ? `a measured loss (the interval is wholly below 0: it loses about ${buys.elo} Elo)`
    : measuredGain ? 'a measured gain (the interval is wholly above 0)' : 'indistinguishable (the interval holds 0)';
  const why = s.match === 0 ? 'NO MATCH' : names === 0 ? 'NOT THIS MATCH (names)' : hashes === 0 ? 'NOT THESE PLAYERS (hashes)'
    : aKinds === 0 ? 'A DID NOT SEARCH PRIORITY AND ATTACKS ONLY' : blocks === 0 ? 'NOT THE REGISTERED DEAL BLOCKS' : 'INCOMPLETE';
  const reading = !ok ? `${why}: no verdict`
    : holds ? `NO-BLOCK SEAT HOLDS${measuredLoss ? ' (holds the bar and loses about ' + buys.elo + ' Elo)' : ''}: ${A}'s Elo lower end ${s.eloLo} is above -10 (point ${s.elo}, upper end ${s.eloHi}); ${word}; ${cost}; searching blocks buys ${buys.elo} Elo [${buys.lo}, ${buys.hi}] head to head; a live-seat candidate for the owner's one word (a seat-queue row, D509); this job changes nothing`
    : fails ? `NO-BLOCK SEAT FAILS: ${A}'s Elo upper end ${s.eloHi} is below -10 (point ${s.elo}, lower end ${s.eloLo}); ${word}; ${cost}; searching blocks buys ${buys.elo} Elo [${buys.lo}, ${buys.hi}] head to head: the live seat stays and the arm is not retried`
    : `INCONCLUSIVE AT 4,800: ${A}'s Elo lower end ${s.eloLo}, point ${s.elo}, upper end ${s.eloHi}; ${word}; ${cost}; searching blocks buys ${buys.elo} Elo [${buys.lo}, ${buys.hi}] head to head; not adopted and not played again`;
  return { written: 1, games: GAMES, bar: BAR, line: LINE, first: FIRST, last: LAST, ...s, complete, holds, fails, inconclusive4800,
    indistinguishable, measuredLoss, measuredGain, d519, buys, aSecPerGame, bSecPerGame, costRatio, secSaved,
    liveSeatCandidate, liveSeatChanged, reading, j210: J210 };
}

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const AS = (o = {}) => ({ games: GAMES, searched: 96000, changed: 17800, msPerDecision: 900,
    byKind: { p: { searched: 72000, changed: 14200, rate: 0.1972 }, a: { searched: 24000, changed: 3600, rate: 0.15 } }, ...o });
  const BSR = (o = {}) => ({ games: GAMES, searched: 105600, changed: 19200, msPerDecision: 1000,
    byKind: { p: { searched: 72000, changed: 14000, rate: 0.1944 }, a: { searched: 24000, changed: 3700, rate: 0.1542 }, b: { searched: 9600, changed: 1500, rate: 0.1563 } }, ...o });
  const mk = (o = {}) => ({ id: 'j211:run-211', host: 'j211', a: A, b: B, ah: AH, bh: BH, complete: true, played: GAMES, errors: 0, timeouts: 0,
    pairs: 2400, score: 0.4977, lo: 0.4907, hi: 0.5046, elo: -1.6, eloLo: -6.4, eloHi: 3.2, aSearch: AS(), bSearch: BSR(), ...o });
  const SD = (o = {}) => ({ purpose: 'match:j211:run-211', games: GAMES, blocks: BLOCKS, min: FIRST, max: LAST, otherGames: 0, ...o });
  const one = (r) => r.complete === 1 && r.holds + r.fails + r.inconclusive4800 === 1 && r.indistinguishable + r.measuredLoss + r.measuredGain === 1
    && r.liveSeatCandidate === r.holds && r.liveSeatChanged === 0 && r.d519 !== null;
  const none = (r) => r.complete === 0 && r.holds + r.fails + r.inconclusive4800 + r.indistinguishable + r.measuredLoss + r.measuredGain === 0
    && r.liveSeatCandidate === 0 && r.liveSeatChanged === 0 && r.d519 === null && r.reading.endsWith('no verdict');
  const cases = [
    ['-1.6 [-6.4, +3.2] HOLDS, indistinguishable, a candidate', mk(), SD(), (r) => r.holds === 1 && one(r) && r.indistinguishable === 1 && r.liveSeatCandidate === 1],
    ['a lower end of -9.9 HOLDS, and with the upper end below 0 it is also a measured loss', mk({ elo: -5.1, eloLo: -9.9, eloHi: -0.3 }), SD(), (r) => r.holds === 1 && one(r) && r.measuredLoss === 1 && r.reading.includes('holds the bar and loses about 5.1 Elo')],
    ['a lower end of exactly -10 does not HOLD: INCONCLUSIVE AT 4,800', mk({ elo: -5.2, eloLo: -10, eloHi: -0.4 }), SD(), (r) => r.inconclusive4800 === 1 && one(r) && r.holds === 0 && r.liveSeatCandidate === 0],
    ['a lower end of -10.1 is INCONCLUSIVE AT 4,800', mk({ elo: -5.3, eloLo: -10.1, eloHi: -0.5 }), SD(), (r) => r.inconclusive4800 === 1 && one(r)],
    ['an upper end of -10.1 FAILS, a measured loss', mk({ elo: -14.9, eloLo: -19.7, eloHi: -10.1 }), SD(), (r) => r.fails === 1 && one(r) && r.measuredLoss === 1 && r.liveSeatCandidate === 0],
    ['an upper end of exactly -10 does not FAIL: INCONCLUSIVE AT 4,800', mk({ elo: -14.8, eloLo: -19.6, eloHi: -10 }), SD(), (r) => r.inconclusive4800 === 1 && one(r) && r.fails === 0],
    ['an upper end of -9.9 is INCONCLUSIVE AT 4,800', mk({ elo: -14.7, eloLo: -19.5, eloHi: -9.9 }), SD(), (r) => r.inconclusive4800 === 1 && one(r)],
    ['a clear loss (-20 [-24.8, -15.2]) FAILS', mk({ score: 0.4712, lo: 0.4643, hi: 0.4782, elo: -20, eloLo: -24.8, eloHi: -15.2 }), SD(), (r) => r.fails === 1 && one(r) && r.indistinguishable === 0],
    ['-7 [-11.8, -2.2] is INCONCLUSIVE AT 4,800 and a measured loss', mk({ elo: -7, eloLo: -11.8, eloHi: -2.2 }), SD(), (r) => r.inconclusive4800 === 1 && one(r) && r.measuredLoss === 1],
    ['-12 [-16.8, -7.2] is INCONCLUSIVE AT 4,800', mk({ elo: -12, eloLo: -16.8, eloHi: -7.2 }), SD(), (r) => r.inconclusive4800 === 1 && one(r)],
    ['0 [-4.8, +4.8] HOLDS, indistinguishable', mk({ score: 0.5, lo: 0.4931, hi: 0.5069, elo: 0, eloLo: -4.8, eloHi: 4.8 }), SD(), (r) => r.holds === 1 && one(r) && r.indistinguishable === 1],
    ['+6 [+1.2, +10.8] HOLDS, a measured gain; D519 reads SMALL GAIN', mk({ score: 0.5086, lo: 0.5017, hi: 0.5155, elo: 6, eloLo: 1.2, eloHi: 10.8 }), SD(), (r) => r.holds === 1 && one(r) && r.measuredGain === 1 && r.d519 === 'SMALL GAIN'],
    ['a lower end of exactly 0 holds 0: indistinguishable, not a measured gain', mk({ score: 0.5069, lo: 0.5, hi: 0.5138, elo: 4.8, eloLo: 0, eloHi: 9.6 }), SD(), (r) => r.holds === 1 && r.indistinguishable === 1 && r.measuredGain === 0 && r.d519 === 'NOT SHOWN'],
    ['an upper end of exactly 0 holds 0: indistinguishable, not a measured loss, and HOLDS', mk({ elo: -4.8, eloLo: -9.6, eloHi: 0 }), SD(), (r) => r.holds === 1 && r.indistinguishable === 1 && r.measuredLoss === 0],
    ['what searching blocks buys is minus the interval', mk(), SD(), (r) => r.buys.elo === 1.6 && r.buys.lo === -3.2 && r.buys.hi === 6.4],
    ['the cost: search seconds a game on each side, their ratio and the seconds saved', mk(), SD(), (r) => r.aSecPerGame === 18 && r.bSecPerGame === 22 && r.costRatio === 0.8182 && r.secSaved === 4 && r.aBlocksSearched === 0 && r.bBlocksSearched === 9600],
    ['A thinking longer than B still HOLDS: the cost never changes a reading', mk({ aSearch: AS({ msPerDecision: 1400 }) }), SD(), (r) => r.holds === 1 && one(r) && r.aSecPerGame === 28 && r.costRatio === 1.2727 && r.secSaved === -6],
    ['D519 reads the default line NOT SHOWN (its upper end is under 15)', mk(), SD(), (r) => r.d519 === 'NOT SHOWN'],
    ['D519 reads +20 [+15.2, +24.8] SHOWN, and the rule HOLDS', mk({ score: 0.5288, lo: 0.5219, hi: 0.5356, elo: 20, eloLo: 15.2, eloHi: 24.8 }), SD(), (r) => r.d519 === 'SHOWN' && r.holds === 1 && one(r)],
    ['D519 reads +8 [-0.7, +16.7] INCONCLUSIVE AT 4,800, and the rule still HOLDS', mk({ score: 0.5115, lo: 0.499, hi: 0.524, elo: 8, eloLo: -0.7, eloHi: 16.7 }), SD(), (r) => r.d519 === 'INCONCLUSIVE AT 4,800' && r.holds === 1 && r.inconclusive4800 === 0 && one(r)],
    ['a stopped match (complete: false, 3,000 played) gets no verdict', { ...mk(), complete: false, played: 3000 }, SD({ games: 3000, blocks: 375, max: FIRST + 374 }), none],
    ['4,799 games is not complete', { ...mk(), played: 4799 }, SD(), none],
    ['241 errors and timeouts is not complete', mk({ errors: 200, timeouts: 41 }), SD(), none],
    ['240 errors and timeouts is complete', mk({ errors: 200, timeouts: 40 }), SD(), (r) => r.holds === 1 && one(r)],
    ['a line without eloLo is not complete', { ...mk(), eloLo: null }, SD(), none],
    ['the players swapped is not this match', { ...mk(), a: B, b: A, ah: BH, bh: AH }, SD(), (r) => r.names === 0 && none(r)],
    ['search-v2-only-p in the file is not this match', { ...mk(), a: 'search-v2-only-p' }, SD(), (r) => r.names === 0 && none(r)],
    ['A at another config hash is not this match', { ...mk(), ah: 'ffffffffffff' }, SD(), (r) => r.hashes === 0 && none(r)],
    ['B at another config hash is not this match', { ...mk(), bh: '3ed453ffef1c' }, SD(), (r) => r.hashes === 0 && none(r)],
    ['A searched three block decisions: not the no-block seat, no verdict', mk({ aSearch: AS({ byKind: { p: { searched: 72000 }, a: { searched: 24000 }, b: { searched: 3 } } }) }), SD(), (r) => r.aKinds === 0 && r.aBlocksSearched === 3 && none(r)],
    ['A searched no attack: no verdict', mk({ aSearch: AS({ byKind: { p: { searched: 96000 } } }) }), SD(), (r) => r.aKinds === 0 && none(r)],
    ['A searched nothing at all: no verdict', mk({ aSearch: { games: GAMES, searched: 0 } }), SD(), (r) => r.aKinds === 0 && none(r)],
    ['a block entry of 0 searched on A is still no block searched', mk({ aSearch: AS({ byKind: { p: { searched: 72000 }, a: { searched: 24000 }, b: { searched: 0 } } }) }), SD(), (r) => r.aKinds === 1 && r.holds === 1 && one(r)],
    ['B searched no block: reported (bKinds 0) for the job\'s own check, the rule reads as written', mk({ bSearch: BSR({ byKind: { p: { searched: 72000 }, a: { searched: 24000 } } }) }), SD(), (r) => r.bKinds === 0 && r.complete === 1],
    ['no block file gives no verdict', mk(), null, (r) => r.blocks === 0 && none(r)],
    ['a block file for another match gives no verdict', mk(), SD({ purpose: 'match:j211:run-x' }), (r) => r.blocks === 0 && none(r)],
    ['599 blocks is not the registered 600', mk(), SD({ blocks: 599 }), (r) => r.blocks === 0 && none(r)],
    ['the host\'s own blocks (114,900,000 on) are not the registered ones', mk(), SD({ min: 114900000, max: 114900599 }), (r) => r.blocks === 0 && none(r)],
    ['blocks one off the registered range are not it', mk(), SD({ min: FIRST + 1, max: LAST + 1 }), (r) => r.blocks === 0 && none(r)],
    ['4,792 of the games found in the results log is not all of them', mk(), SD({ games: 4792 }), (r) => r.blocks === 0 && none(r)],
    ['no match file gives no verdict', null, SD(), (r) => r.match === 0 && none(r)],
    ['J210 is carried beside, never pooled: the score is this match\'s alone', mk(), SD(), (r) => r.played === 4800 && r.eloLo === -6.4 && r.j210.games === 1200 && r.j210.lastB === 0.0017],
  ];
  let ok = 0;
  cases.forEach(([what, m, sd, pred], i) => {
    const fm = path.join(scratch, `case-${i}-m.json`), fsd = path.join(scratch, `case-${i}-sd.json`);
    if (m !== null) fs.writeFileSync(fm, JSON.stringify(m));
    if (sd !== null) fs.writeFileSync(fsd, JSON.stringify(sd));
    const r = verdict(read(fm), read(fsd));
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
  console.error('usage: node verdict.mjs <match.json> <seeds.json> <out.json> | --selftest <dir>');
  process.exit(2);
}
J211EOF
cat > var/j211-tools/rollouts.cjs <<'J211EOF'
// J211: J198's reader (var/j198-tools/rollouts.cjs) with the searched decisions also split by kind, so the batch
// counters say for themselves that config A searched no block decision. Rollouts per searched decision (p + a + b) for each side of one match: the match line has no
// rollouts field, so this reads each batch line's aStats/bStats `search.rollouts`, `search.rounds`,
// `search.anytime.short` and `search.<p|a|b>.considered` (config A is the match's first player, as
// tools/ai-ladder/match.ts tallyBatch reads it), and D389's ranking counters, which are 0 on both sides (neither ranks).
// Per game (one batch line is one game), information only: EXPOSED when a side's counts
// hold an `opportunity.*` key above 0, POLICY a `policy.*` key, TOUCHED `search.prior.ranked` above 0.
// usage: node rollouts.cjs <ladder dir> <match.json> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : '';
const bdir = `${dir}/batches/${run}`;
const side = () => ({ rollouts: 0, rounds: 0, short: 0, decisions: 0, p: 0, a: 0, b: 0, ranked: 0, priorPlayouts: 0, priorCut: 0, priorTimedOut: 0, exposed: 0, policy: 0, touched: 0, lines: 0 });
const t = { a: side(), b: side() };
for (const f of run && fs.existsSync(bdir) ? fs.readdirSync(bdir).filter((x) => /^b\d+\.jsonl$/.test(x)) : []) {
  for (const line of fs.readFileSync(`${bdir}/${f}`, 'utf8').split('\n')) {
    let l; try { l = JSON.parse(line); } catch { continue; }
    for (const [k, st] of [['a', l.aStats], ['b', l.bStats]]) {
      const c = (st && st.counts) || {};
      const n = (x) => (typeof c[x] === 'number' ? c[x] : 0);
      t[k].rollouts += n('search.rollouts'); t[k].rounds += n('search.rounds'); t[k].short += n('search.anytime.short');
      t[k].decisions += n('search.p.considered') + n('search.a.considered') + n('search.b.considered');
      t[k].p += n('search.p.considered'); t[k].a += n('search.a.considered'); t[k].b += n('search.b.considered');
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
  aPriority: t.a.p, aAttacks: t.a.a, aBlocks: t.a.b, bPriority: t.b.p, bAttacks: t.b.a, bBlocks: t.b.b,
  aShort: t.a.short, bShort: t.b.short, aShortShare: sh(t.a), bShortShare: sh(t.b),
  aRanked: t.a.ranked, bRanked: t.b.ranked, aPriorPlayouts: t.a.priorPlayouts, aPriorCut: t.a.priorCut, aPriorTimedOut: t.a.priorTimedOut,
  aExposedGames: t.a.exposed, bExposedGames: t.b.exposed, aPolicyGames: t.a.policy, bPolicyGames: t.b.policy, aTouchedGames: t.a.touched, games: t.a.lines };
r.ratio = r.aRolloutsPerDecision !== null && r.bRolloutsPerDecision ? Math.round((r.aRolloutsPerDecision / r.bRolloutsPerDecision) * 1000) / 1000 : null;
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J211EOF
cat > var/j211-tools/seeds.cjs <<'J211EOF'
// J211: which deal blocks a match played (D398 point 2: a match takes its matchup's next unused blocks from its
// host name's match base; D536 point 6: under --host j211 in an emptied folder those are 931,900,000-931,900,599).
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
J211EOF
rm -rf var/j211-tools/selftest
node var/j211-tools/verdict.mjs --selftest var/j211-tools/selftest > var/j211-tools/selftest.json
cat var/j211-tools/selftest.json
# the block reader on a synthetic results log: a match at two blocks over three games, one game of another match
# (counted as other), and a pilot line that must not count at all
rm -rf var/j211-tools/seeds-selftest
mkdir -p var/j211-tools/seeds-selftest/results
printf '%s\n' '{"purpose":"match:h:new","bseed":931900000}' '{"purpose":"match:h:new","bseed":931900001}' '{"purpose":"match:h:new","bseed":931900001}' '{"purpose":"match:h:other","bseed":931900002}' '{"purpose":"pilot","bseed":5}' > var/j211-tools/seeds-selftest/results/h.jsonl
echo '{"id":"h:new"}' > var/j211-tools/seeds-selftest/match.json
node var/j211-tools/seeds.cjs var/j211-tools/seeds-selftest var/j211-tools/seeds-selftest/match.json var/j211-tools/seeds-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j211-tools/seeds-selftest/out.json","utf8"));const ok=r.purpose==="match:h:new"&&r.games===3&&r.blocks===2&&r.min===931900000&&r.max===931900001&&r.fullBlocks===0&&r.otherGames===1?1:0;require("fs").writeFileSync("var/j211-tools/seeds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the rollout reader on a synthetic batch folder: two games, each side's rollouts, rounds, short decisions and
# searched decisions by kind (A none of them a block, B three)
rm -rf var/j211-tools/ro-selftest
mkdir -p var/j211-tools/ro-selftest/batches/run-s
printf '%s\n' '{"aStats":{"counts":{"search.rollouts":90,"search.rounds":34,"search.anytime.short":1,"search.p.considered":8,"search.a.considered":2}},"bStats":{"counts":{"search.rollouts":150,"search.rounds":60,"search.p.considered":7,"search.b.considered":3}}}' '{"aStats":{"counts":{"search.rollouts":96,"search.rounds":34,"search.p.considered":10}},"bStats":{"counts":{"search.rollouts":158,"search.rounds":58,"search.anytime.short":1,"search.a.considered":10}}}' > var/j211-tools/ro-selftest/batches/run-s/b0.jsonl
echo '{"id":"h:run-s","a":"search-v2-no-b","b":"search-v1-anytime"}' > var/j211-tools/ro-selftest/match.json
node var/j211-tools/rollouts.cjs var/j211-tools/ro-selftest var/j211-tools/ro-selftest/match.json var/j211-tools/ro-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j211-tools/ro-selftest/out.json","utf8"));const ok=r.games===2&&r.aDecisions===20&&r.bDecisions===20&&r.aPriority===18&&r.aAttacks===2&&r.aBlocks===0&&r.bPriority===7&&r.bAttacks===10&&r.bBlocks===3&&r.aRolloutsPerDecision===9.3&&r.bRolloutsPerDecision===15.4&&r.aShort===1&&r.bShort===1&&r.ratio===0.604?1:0;require("fs").writeFileSync("var/j211-tools/ro-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
```
```bash
# 4 games (one batch of one deck pair, one worker), in the pilot's own ladder folder and seed range, then each side's
# searched decisions by kind from the match line (numbers only, so no check reads a missing key) and from the batch
# counters
rm -rf var/ai-ladder-pilot/J211
./tools/ai-ladder.sh match search-v2-no-b search-v1-anytime --games 4 --batch-pairs 1 --host j211-pilot --purpose pilot --dir var/ai-ladder-pilot/J211 --experiments var/ai-ladder-pilot/J211/experiments.jsonl --out var/ai-ladder-pilot/J211/match.json --jobs 1
node var/j211-tools/rollouts.cjs var/ai-ladder-pilot/J211 var/ai-ladder-pilot/J211/match.json var/j211-tools/rollouts-pilot.json
node -e 'const fs=require("fs");let m={};try{m=JSON.parse(fs.readFileSync("var/ai-ladder-pilot/J211/match.json","utf8"))}catch{}const k=(t,x)=>{const n=t&&t.byKind&&t.byKind[x]?t.byKind[x].searched:0;return typeof n==="number"?n:0};const r={written:1,aP:k(m.aSearch,"p"),aA:k(m.aSearch,"a"),aB:k(m.aSearch,"b"),bP:k(m.bSearch,"p"),bA:k(m.bSearch,"a"),bB:k(m.bSearch,"b"),namesOk:m.a==="search-v2-no-b"&&m.b==="search-v1-anytime"?1:0,hashesOk:String(m.ah)==="59505e241363"&&String(m.bh)==="cdd55e02a89c"?1:0};fs.writeFileSync("var/j211-tools/pilot-kinds.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
```
metrics: merged = sh: cat var/j211-merged.txt 2>/dev/null || echo 0
metrics: pl = sh: cat var/j211-tools/players.json 2>/dev/null || echo '{"ok":0,"nob_only_what":0,"hashes_ok":0}'
metrics: sd = sh: cat var/j211-tools/search-diff.json 2>/dev/null || echo '{"count":-1,"rc":1}'
metrics: hb = sh: cat var/j211-tools/base.json 2>/dev/null || echo '{"ok":0,"host":0,"first":0}'
metrics: st = sh: cat var/j211-tools/selftest.json 2>/dev/null || echo '{"ok":0,"cases":0}'
metrics: sst = sh: cat var/j211-tools/seeds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: rst = sh: cat var/j211-tools/ro-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: pm = sh: cat var/ai-ladder-pilot/J211/match.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":9,"timeouts":9,"aSearch":{"searched":0},"bSearch":{"searched":0,"msPerDecision":9999}}'
metrics: pr = sh: cat var/j211-tools/rollouts-pilot.json 2>/dev/null || echo '{"games":0,"aDecisions":-1,"bDecisions":-1,"aBlocks":-1}'
metrics: pk = sh: cat var/j211-tools/pilot-kinds.json 2>/dev/null || echo '{"written":0,"aP":0,"aA":0,"aB":-1,"bP":0,"bA":0,"bB":0,"namesOk":0,"hashesOk":0}'
check: merged == 1
check: pl.ok == 1
check: pl.nob_only_what == 1
check: pl.hashes_ok == 1
check: sd.rc == 0
check: sd.count == 0
check: hb.ok == 1
check: hb.host == 931000000
check: hb.first == 931900000
check: st.ok == 1
check: st.cases == 42
check: sst.ok == 1
check: rst.ok == 1
check: pm.complete == true
check: pm.played == 4
check: pm.errors + pm.timeouts <= 1
check: pm.aSearch.searched >= 10
check: pm.bSearch.searched >= 10
check: pk.written == 1
check: pk.namesOk == 1
check: pk.hashesOk == 1
check: pk.aB == 0
check: pk.aP >= 1
check: pk.aP + pk.aA == pm.aSearch.searched
check: pr.games == 4
check: pr.aDecisions == pm.aSearch.searched
check: pr.bDecisions == pm.bSearch.searched
check: pr.aBlocks == 0
check: pm.bSearch.msPerDecision < 1500

The pilot asks only whether anything is broken:
- `merged`: the pinned commit is on `origin/main`;
- the build and the self-tests pass;
- both players resolve on this PC: `pl.nob_only_what` says the arm's ai-bench config is search-v1-anytime's (itself
  checked against search-v2's string) with `what=pab` replaced by `what=pa` and nothing else, and `pl.hashes_ok`
  that both carry the hashes J210's match lines recorded, `59505e241363` and `cdd55e02a89c`, compared as strings;
- `sd.rc` and `sd.count`: git answered, and no file under `bridge/src`, `tools/ai-ladder` or `tools/ai-bench` changed since J210's pin, so the
  match plays J210's code (`sd.files` would list them);
- `hb`: the ladder's own `hostBase('j211')` is 931,000,000 and the first block an empty folder takes from its match
  base is 931,900,000, the pilot's host name has another base, and this PC's own is 114,000,000, the one J198's
  and J210's games are on;
- the verdict script reads forty-two synthetic match files (and block files) as the rule says: the -10 lower end at
  and either side of its bar (-9.9 HOLDS, -10 and -10.1 do not), the -10 upper end the same (-10.1 FAILS, -10 and
  -9.9 do not), the three descriptions and their ends of exactly 0 (an end at 0 holds 0), a HOLDS that is also a
  measured loss worded as both, D519's four readings beside the verdict, a cost that never changes a reading, 4,799
  games, 241 errors, a missing lower end, a stopped match, swapped or other players, other hashes, an arm that
  searched a block or no attack, a block file that is absent, another match's, short, or on other blocks (this
  host's own 114,900,000 among them) all refused, and the live seat never changed in any reading;
- the block reader counts a match's own games and blocks and another match's games on a synthetic log (`sst.ok`),
  and the rollout reader sums rollouts, rounds, short decisions and searched decisions by kind on a synthetic batch
  (`rst.ok`);
- in 4 games both sides search, the match line names the two players at their hashes, the arm's searched decisions
  are all priority or attack decisions and none a block (`pk`, and `pr.aBlocks` from the batch counters), the
  rollout reader saw all 4 games and exactly the decisions the match line counts, and search-v2 stays under its
  1.5 s budget on average.

Read, not checked:
- whether search-v2 searched a block in the pilot's 4 games (`pk.bB`; about six are expected, and none in so few
  games would not be a fault: the config string and hash above are what say B searches blocks, and the real match
  checks `v.bKinds`);
- each side's ms a decision and rollouts a decision (`pr`).

There are no win-rate bounds. The match is the test.

## Commands
cores: 7
clean: var/ai-ladder/match-J211.json var/j211-ladder
```bash
# the no-block seat: search-v2 searching priority and attacks against search-v2 searching all three, 4,800 games on
# blocks 931,900,000-931,900,599 (--host j211, a folder of its own, emptied here so a restart replays the same blocks)
test -f var/j211-tools/verdict.mjs
rm -rf var/j211-ladder var/ai-ladder/match-J211.json
mkdir -p var/j211
echo "J211: search-v2-no-b against search-v1-anytime, 4,800 games on the confirm set (the no-block seat, D536)"
./tools/ai-ladder.sh match search-v2-no-b search-v1-anytime --dir var/j211-ladder --host j211 --games 4800 --hours 15.5 --out var/ai-ladder/match-J211.json --jobs {workers}
tail -1 var/j211-ladder/match.jsonl
```
cores: 1
clean: var/j211/verdict.json var/j211/report.md var/j211/rollouts.json var/j211/seeds.json
```bash
# the pre-registered reading; the blocks played; the rollouts and the decisions by kind; report.md (numbers only; the
# PC session writes the summary beside it)
node var/j211-tools/rollouts.cjs var/j211-ladder var/ai-ladder/match-J211.json var/j211/rollouts.json
node var/j211-tools/seeds.cjs var/j211-ladder var/ai-ladder/match-J211.json var/j211/seeds.json
node var/j211-tools/verdict.mjs var/ai-ladder/match-J211.json var/j211/seeds.json var/j211/verdict.json
node - <<'J211EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const m = read('var/ai-ladder/match-J211.json');
const ro = read('var/j211/rollouts.json');
const bs = read('var/j211/seeds.json');
const v = read('var/j211/verdict.json');
const j = v.j210 || {};
const pct = (x, d = 1) => (typeof x === 'number' ? `${(x * 100).toFixed(d)}%` : '-');
const runStart = (id) => {
  const x = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(id || '');
  return x ? Date.UTC(+x[1], +x[2] - 1, +x[3], +x[4], +x[5], +x[6]) : null;
};
const t0 = runStart(m.id), t1 = typeof m.at === 'string' ? Date.parse(m.at) : null;
const hours = t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null;
const b = v.buys || {};
const word = v.measuredLoss ? 'a measured loss (the interval is wholly below 0)' : v.measuredGain ? 'a measured gain (the interval is wholly above 0)' : v.indistinguishable ? 'indistinguishable (the interval holds 0)' : 'none (no verdict)';
const L = ['# J211: the no-block seat, search-v2-no-b against search-v1-anytime, 4,800 games (D398; D536; the -10 Elo bar)', ''];
L.push(`**Reading under the pre-registered rule:** ${v.reading ?? 'no verdict'}.`, '');
L.push(`**Described, deciding nothing:** ${word}. **D519's reading of the same line, as information:** ${v.d519 ?? 'none'}.`, '');
L.push(`**The live seat:** unchanged by this job (liveSeatChanged ${v.liveSeatChanged ?? 0}); SearchConfig.LIVE_DEFAULTS stays what=pab. ${v.holds ? 'NO-BLOCK SEAT HOLDS: search-v2-no-b is a live-seat candidate, a seat-queue row with this point, interval and the seconds saved, for the owner to say yes or no in one word (D509).' : v.fails ? 'NO-BLOCK SEAT FAILS: the block search is worth more than 10 Elo head to head; the arm stays registered and is not retried.' : v.inconclusive4800 ? 'INCONCLUSIVE AT 4,800: not adopted and not played again.' : 'No verdict (the match is not complete under D536 point 7).'}`, '');
L.push('| match | played / planned | complete | score [95%] | Elo [95%] | searching blocks buys | pairs | draws, errors, timeouts | A search s per game | B search s per game | A / B | s saved per game | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
L.push(`| J211 ${m.a} vs ${m.b} | ${m.played} / ${m.planned} | ${m.complete} | ${m.score} [${m.lo}, ${m.hi}] | ${m.elo} [${m.eloLo}, ${m.eloHi}] | ${b.elo ?? '-'} [${b.lo ?? '-'}, ${b.hi ?? '-'}] | ${m.pairs} | ${m.draws}, ${m.errors}, ${m.timeouts} | ${v.aSecPerGame ?? '-'} | ${v.bSecPerGame ?? '-'} | ${v.costRatio ?? '-'} | ${v.secSaved ?? '-'} | ${hours ?? '-'} |`);
L.push('');
L.push(`Beside it, never pooled: J210 (pin ${j.pin ?? '-'}), each player ${j.games ?? '-'} games against forge-default on the same 600 deals (blocks ${j.blocks ?? '-'}): ${m.a ?? 'A'} ${j.aScore ?? '-'} [${j.aLo ?? '-'}, ${j.aHi ?? '-'}] (+${j.aElo ?? '-'} Elo), ${m.b ?? 'B'} ${j.bScore ?? '-'} [${j.bLo ?? '-'}, ${j.bHi ?? '-'}] (+${j.bElo ?? '-'} Elo); the block search taken last, paired by deal, ${j.lastB ?? '-'} score [${j.lastBLo ?? '-'}, ${j.lastBHi ?? '-'}]; search seconds a game ${j.aSecPerGame ?? '-'} against ${j.bSecPerGame ?? '-'}. A different opponent and different deals: a description of the night that named the arm, not part of this match.`);
L.push('');
L.push(`Config hashes: ${m.a} ${m.ah}, ${m.b} ${m.bh}. Deck set ${m.set}; match id ${m.id}; host ${m.host}.`);
L.push(`Deal blocks: ${bs.blocks ?? '-'} blocks, ${bs.min ?? '-'} to ${bs.max ?? '-'} (registered: ${v.first ?? '-'} to ${v.last ?? '-'}), ${bs.games ?? '-'} games, ${bs.fullBlocks ?? '-'} blocks of exactly 8 games; games of any other match in the folder: ${bs.otherGames ?? '-'}.`);
L.push(`Cost: ${m.a} spent ${v.aSecPerGame ?? '-'} search seconds a game against ${m.b}'s ${v.bSecPerGame ?? '-'} (x${v.costRatio ?? '-'}, ${v.secSaved ?? '-'} s a game saved), at ${v.aMs ?? '-'} against ${v.bMs ?? '-'} ms a searched decision, over ${v.aSearched ?? '-'} against ${v.bSearched ?? '-'} searched decisions. Searched by kind (priority / attacks / blocks): ${v.aPrioritySearched ?? '-'} / ${v.aAttacksSearched ?? '-'} / ${v.aBlocksSearched ?? '-'} against ${v.bPrioritySearched ?? '-'} / ${v.bAttacksSearched ?? '-'} / ${v.bBlocksSearched ?? '-'}; the batch counters: ${ro.aPriority ?? '-'} / ${ro.aAttacks ?? '-'} / ${ro.aBlocks ?? '-'} against ${ro.bPriority ?? '-'} / ${ro.bAttacks ?? '-'} / ${ro.bBlocks ?? '-'}. Rollouts a searched decision ${ro.aRolloutsPerDecision ?? '-'} / ${ro.bRolloutsPerDecision ?? '-'}, rounds ${ro.aRoundsPerDecision ?? '-'} / ${ro.bRoundsPerDecision ?? '-'}, decided on fewer than two rounds ${ro.aShort ?? '-'} = ${pct(ro.aShortShare, 2)} / ${ro.bShort ?? '-'} = ${pct(ro.bShortShare, 2)}. The seconds are this machine's (D388). The cost changes no reading.`);
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
L.push('', `Rule parts (D536 point 7): names ${v.names ?? 0}, hashes ${v.hashes ?? 0}, the registered blocks ${v.blocks ?? 0}, A searched priority and attacks and no block ${v.aKinds ?? 0}, complete ${v.complete ?? 0} (those four, complete: true, ${v.games} games, errors + timeouts at most ${v.bar}, eloLo and eloHi numbers); B searched all three kinds ${v.bKinds ?? 0} (the job's own check). Elo lower end above -10: ${typeof m.eloLo === 'number' && m.eloLo > -10 ? 1 : 0}; Elo upper end below -10: ${typeof m.eloHi === 'number' && m.eloHi < -10 ? 1 : 0}. NO-BLOCK SEAT HOLDS ${v.holds ?? 0}, NO-BLOCK SEAT FAILS ${v.fails ?? 0}, INCONCLUSIVE AT 4,800 ${v.inconclusive4800 ?? 0}. Descriptive, deciding nothing: indistinguishable ${v.indistinguishable ?? 0}, a measured loss ${v.measuredLoss ?? 0}, a measured gain ${v.measuredGain ?? 0}. Live-seat candidate (HOLDS; the owner's word, D509) ${v.liveSeatCandidate ?? 0}; live seat changed by this job ${v.liveSeatChanged ?? 0}.`);
fs.mkdirSync('var/j211', { recursive: true });
fs.writeFileSync('var/j211/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J211EOF
```
check: cm.complete == true
check: cm.played == 4800
check: cm.errors + cm.timeouts <= 240
check: bs.games == cm.played
check: bs.blocks == 600
check: bs.min == 931900000
check: bs.max == 931900599
check: bs.otherGames == 0
check: v.written == 1
check: v.names == 1
check: v.hashes == 1
check: v.blocks == 1
check: v.aKinds == 1
check: v.aBlocksSearched == 0
check: ro.aBlocks == 0
check: v.bKinds == 1
check: ro.aDecisions == v.aSearched
check: ro.bDecisions == v.bSearched
check: v.complete == 1
check: v.holds + v.fails + v.inconclusive4800 == 1
check: v.indistinguishable + v.measuredLoss + v.measuredGain == 1
check: v.holds == 1 or not (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloLo > -10)
check: v.holds == 0 or (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloLo > -10)
check: v.fails == 1 or not (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloHi < -10)
check: v.fails == 0 or (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloHi < -10)
check: v.measuredLoss == 1 or not (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloHi < 0)
check: v.measuredLoss == 0 or (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloHi < 0)
check: v.measuredGain == 1 or not (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloLo > 0)
check: v.measuredGain == 0 or (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloLo > 0)
check: v.liveSeatCandidate == v.holds
check: v.liveSeatChanged == 0

The first three checks say the match is complete: it was not stopped, all 4,800 games were played, and at most one in
20 ended in an engine error or a timeout. The next five say it was played on the registered deals: the block reader
found every game, 600 blocks from 931,900,000 to 931,900,599, and no other match's game in the folder. The next ten
say the verdict script ran on this match (names, hashes, blocks), that the arm searched priority and attack
decisions and no block (from the match line and, separately, from the batch counters), that search-v2 searched all
three kinds, and that the batch counters hold exactly the decisions the match line counts. The next three say the
verdict agrees the match is complete and gave exactly one reading and exactly one description. The next four are the
rule in the runner's own language: `v.holds` is 1 exactly when the match is complete with its Elo lower end above
-10, and `v.fails` exactly when it is complete with its Elo upper end below -10 (so `v.inconclusive4800` is the rest,
by the check before). The next four say the same of "a measured loss" (upper end below 0) and "a measured gain"
(lower end above 0), so "indistinguishable" is the rest. The last two say the arm is a live-seat candidate exactly
when HOLDS, and that the verdict never changes the live seat. Any reading passes them; a reading is not a failure.
The time per decision, the seconds a game, the rollouts, the changed answers and the fallbacks are reported, not
gated.

## Abort if
abort: j211_err >= 30 and j211_err > j211_games / 10

Engine trouble only: once 30 games of the match have ended in an engine error or a timeout, the job stops if they are
more than one in ten. The match has no stopping rule on the score, so the job never stops early on a result. Both
counts read the match's own folder, which holds nothing else.

## Report
collect: var/ai-ladder/match-J211.json
collect: var/j211/verdict.json
collect: var/j211/report.md
collect: var/j211/seeds.json
collect: var/j211/rollouts.json

`report.md` is the job's own numbers. The PC session writes `summary.md` from it, the same way as J198 and J210:
- **the reading under the rule:** NO-BLOCK SEAT HOLDS, NO-BLOCK SEAT FAILS or INCONCLUSIVE AT 4,800. Give the arm's
  score against search-v2 with its 95% interval, the same in Elo, what searching blocks buys head to head (minus
  that, interval [-eloHi, -eloLo]), and the pair and game counts. Say plainly, whatever the reading, that this job
  does not change the live seat. On a HOLDS, say that search-v2 without its block search is measured at most 10 Elo
  weaker with 95% confidence, that it is a live-seat candidate and a seat-queue row for the owner's one word
  (D509), with the seconds a game it saves, and that a seat truly 10 Elo weaker reads HOLDS about 2.5% of the time.
  On a FAILS, say that the block search is worth more than 10 Elo head to head, the live seat stays and the arm is
  not retried. On an INCONCLUSIVE AT 4,800, say that it is not adopted and not played again;
- **the description beside it:** exactly one of indistinguishable, a measured loss, a measured gain, as a
  description. A HOLDS that is also a measured loss is said as both: it holds the bar and loses about N Elo.
  D519's reading (`v.d519`) is information for a gain and decides nothing;
- **J210 beside it, never pooled:** each player's line against forge-default and the block search's paired
  contribution taken last (+0.0017 [-0.0148, +0.0182]) as a description of the night that named the arm; never a
  combined score, and a different opponent;
- **the compute each side spent:** search seconds a game on both sides, their ratio and the seconds saved
  (`v.costRatio`, `v.secSaved`; J210: 20.9 against 22.7, x0.92), ms a searched decision by kind, searched decisions
  by kind, rollouts and rounds a searched decision, budget fallbacks with their interval, other fallbacks and step
  timeouts, the changed answers by kind. Read as what a person would wait at the table, on this machine (D388);
- **the deals:** the blocks played (`bs.min` to `bs.max`, 931,900,000-931,900,599) and that they are new to every
  recorded game;
- **the run:** draws, errors and timeouts, the match's hours against the 9 h estimate, the pressure events in STATUS
  (drops, raises, any stop and its retry), that it ran alone (D521), and whether the GPU queue or anything else
  outside the lab was running.

Never write "no loss", "no effect" or "no cost" for an interval that includes 0. If the match stopped early
(`complete: false`), say so: it gets no verdict, and what follows is a decision about reposting, not a reading.
