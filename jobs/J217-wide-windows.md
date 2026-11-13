id: J217
title: D544's wide windows: one fixed 4,800-game match (2,400 mirrored pairs, D398, the confirm set, no stopping rule) of search-v3-wide (search-v3-declined-instant with stackwin=1, passwin=1 and dactiv=1, a new player, b95340935592) against B = search-v3-declined-instant (af6771947a25), fixed by D544 point 10 from J216's read: D543's recommendation STANDS (J216 SMALL GAIN alone, +8.3 Elo [+2.4, +14.1]); the live seat has not moved, in a ladder folder of its own under --host j217 on deal blocks no job has played, 725,900,000-725,900,599, read by D519's four readings at 4,800 games as D544 writes them for this match, with D544's completeness parts and exposure conditions. Never pooled with J215 or J216. This job never changes the live seat
public_title: The search on the stack and in quiet steps: one 4,800-game match
public_est: ~10 h (one night)
public_decides: Whether the search AI gains from answering on the stack and wider windows
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
alone: yes
repos: mtg-table@9fb702f33e93d3c3d6de52af362eff3e8f36bdec (the merge commit of D544's lane, pc/d544-wide-windows, on main, after D543's merge 97122947c. It carries the stack carry in LenientGameCopier (off unless asked), three SearchConfig keys off by default (stackwin, passwin, dactiv), the opponent's conditional pass in D544's windows, the ladder's three params and one player appended to tools/ai-ladder/players.json, search-v3-wide (b95340935592: search-v3-declined-instant's params with stackwin, passwin and dactiv on). Every registered player's hash is unchanged; the live seat is unchanged.)
decides: D544 points 12 to 15, from the match line and its batch counters alone. A complete match that is not NOT READ reads exactly one of D519's four readings at 4,800 games: SHOWN (lo > 0.5 and elo >= +15), SMALL GAIN (lo > 0.5 and elo < +15), INCONCLUSIVE AT 4,800 (lo <= 0.5 and eloHi >= +15), NOT SHOWN (lo <= 0.5 and eloHi < +15). SHOWN or SMALL GAIN names search-v3-wide a live-seat candidate for the owner under a separate decision; NOT SHOWN closes these three keys as a union on the confirm set; a measured loss removes the union. NOT READ when the three keys together changed fewer than 0.25 decisions a game on A's side. Nothing here changes the live seat
hypothesis: registered as information before any game (D544's hypothesis and its table, kept as registered; no check reads it), and measured since: an exposure run of 240 dev-set games at the lane's 04bafbfb3 (before the skeptic's fixes; D544 Verification) changed 0.292 decisions a game (stackwin 0.154, passwin 0.033, dactiv 0.104; about +-0.035 from counting alone), not the hypothesis's 0.4-0.5, so the union is expected to clear point 13's 0.25 though not by much (a true rate under 0.25 about one chance in nine on counting alone, more on the confirm set). At J215's and J216's +11 Elo per changed decision a game that is about +3 Elo, not +5 to +6. With J211's score standard error at 4,800 games (0.0039, 2.71 Elo; SMALL GAIN needs a point above about +5.3): a true +3 reads SHOWN or SMALL GAIN about one time in five (19.7%), +5 45%, +6 60%, a null 2.5%; a NOT SHOWN, which closes the union, cannot tell +3 Elo from 0
rule: D544 points 10 to 15, merged before any J217 game was played (written 2026-11-12, before J216's read), in their words (the decision's bold dropped, its lists set as sentences): "Opponent B, by a rule written now and resolved before any game. ... STANDS: B = search-v3-declined-instant (af6771947a25). The match measures the three keys' increment directly, the union's base against itself plus the keys. WITHDRAWN or OPEN: B = the live seat search-v2-no-b (59505e241363). The match measures the union against the live seat, the two D541 keys included. ... The match is complete when its line names A and B in that order at their hashes, says complete: true, played all 4,800 games with engine errors plus timeouts at most 240 (one in 20, D519 point 2), and carries score, lo, elo, eloLo and eloHi; it was played on exactly the 600 blocks 725,900,000-725,900,599 with no other match's game in its folder; every batch line carried the two seat configs exactly; both sides searched priority and attack decisions and neither searched a block; B's batch counters show no search.p.stackwin., search.p.passwin., search.p.dactiv. or search.wide. counter above 0 (the new keys' off path), and, when B is search-v2-no-b, no search.p.declined., search.p.instant. or search.p.lands. counter above 0 either; and A's show no search.p.lands. counter above 0. An incomplete match gets no reading and is reposted alone under a new job id after its cause is found. Exposure and NOT READ. Summed over the match's batch lines on A's side, per game played: each key's windows against its floor ... search.p.stackwin.windows at least 0.25 a game, search.p.passwin.windows at least 0.10, search.p.dactiv.windows at least 0.25. A key under its floor is reported as unexposed: the reading says nothing about that key, and the report names it; the union is NOT READ when the three keys together changed fewer than 0.25 decisions a game (search.p.stackwin.changed + search.p.passwin.changed + search.p.dactiv.changed, in integers changed x 4 < played): the report gives every rate, the match gets no reading, and the player is not played again without a new decision. ... The readings, written before any game: D519's four at 4,800 games, exactly one for a complete match that is not NOT READ, in this precedence, compared as the line carries them (lo in integer ten-thousandths, Elo in integer tenths): SHOWN: lo above 0.5 and elo at least +15; SMALL GAIN: lo above 0.5 and elo below +15; INCONCLUSIVE AT 4,800: lo at most 0.5 and eloHi at least +15; NOT SHOWN: lo at most 0.5 and eloHi below +15. Beside the reading, deciding nothing: indistinguishable (the interval holds 0), a measured loss (wholly below 0), a measured gain (wholly above). What a reading earns. SHOWN or SMALL GAIN names search-v3-wide a live-seat candidate for the owner, under a separate decision and a seat-queue row (D509), with the match's point, interval and cost beside it ... INCONCLUSIVE AT 4,800 is information and is not confirmed again (D519 point 3). NOT SHOWN closes these three keys as a union on the confirm set ... A measured loss (the interval wholly below 0) removes the union ... No reading changes the live seat." The players: A = search-v3-wide (b95340935592), B = search-v3-declined-instant (af6771947a25), D544 point 10's under STANDS, resolved in this job's two B lines. The match is never pooled with J215 or J216 (D544 point 17)
followup: morning-read
est: ~10 h at 7 workers (an estimate; range 9.5-11 h), 13.8 h at worst (the pilot and the match's own stop). From this host at 7 workers, alone, a 1,200-game match against the search's family takes about 0.47 h + 0.0436 h x both sides' search seconds a game (D537 point 11's fit; residual sd 0.15 h), about 9.01 h for J211 at four times the games against its 8.57. B searched about 21.7 s a game as search-v3-declined-instant (J215) and 19 s as search-v2-no-b; A about B-as-declined-instant's plus the three keys', about 24-26 s (D544 point 20). Both sides 46-48 s a game (B = search-v3-declined-instant) or 43-45 s (B = the live seat): the match about 9.5-10.3 h. Pilot about 15 minutes (the build, the self-tests with D544's scenarios, 8 games). About 11.5 h if memory pressure holds the night at 6 workers; the match stops itself at --hours 13.5 under the step's 14 h timeout, and a match that reaches its own stop reports complete: false and gets no reading
resumable: no
timeout: 14h
clean: var/j217 var/j217-tools var/j217-ladder var/ai-ladder-pilot/J217 var/ai-ladder/match-J217.json var/ai-bench/j217-pilot-rec
progress: metric j217_games games of 4800
metrics: j217_games = sh: node -e 'const fs=require("fs");const f="var/j217-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v3-wide\""))n++;console.log(n)'
metrics: j217_err = sh: node -e 'const fs=require("fs");const f="var/j217-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v3-wide\"")&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cm = sh: cat var/ai-ladder/match-J217.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: bs = sh: cat var/j217/seeds.json 2>/dev/null || echo '{"games":0,"blocks":0,"min":0,"max":0,"fullBlocks":0,"otherGames":-1,"registered":0}'
metrics: v = sh: cat var/j217/v.json 2>/dev/null || echo '{"written":0,"complete":0,"incomplete":1,"notRead":0,"notPlayed":0,"shown":0,"smallGain":0,"inconclusive4800":0,"notShown":0,"liveSeatCandidate":0,"unionClosed":0,"unionRemoved":0,"indistinguishable":0,"measuredLoss":0,"measuredGain":0,"liveSeatChanged":1,"bIsLive":0,"stackwinWindowsPerGame":0,"passwinWindowsPerGame":0,"dactivWindowsPerGame":0,"stackwinChangedPerGame":0,"passwinChangedPerGame":0,"dactivChangedPerGame":0,"unionChangedPerGame":0,"refusalShare":0,"aSecPerGame":0,"bSecPerGame":0,"costRatio":0}'
headline: cm.played, cm.score, cm.lo, cm.hi, cm.elo, cm.eloLo, cm.eloHi, v.shown, v.smallGain, v.inconclusive4800, v.notShown, v.notRead, v.notPlayed, v.incomplete, v.indistinguishable, v.measuredLoss, v.measuredGain, v.bIsLive, v.stackwinWindowsPerGame, v.passwinWindowsPerGame, v.dactivWindowsPerGame, v.unionChangedPerGame, v.refusalShare, v.aSecPerGame, v.bSecPerGame, v.costRatio, v.liveSeatCandidate, v.unionClosed, v.unionRemoved

**Why this job** (D544; J215, J212). The search seat searched its priority decisions only on an empty stack: in its
own main phases, and (D540's `instant=1`) in the empty-stack windows where Forge plays. J215 read D540's two positive
keys together at SMALL GAIN, +6.9 Elo [+1.4, +12.5], about 0.62 changed decisions a game. What it still never
considered, counted from J212's 720 recorded games: the stack windows (3.33 a game in the opponent's turn and 1.66 in
its own, about 1.9 with a castable spell; counter-magic is half of it), three steps where Forge passes with a castable
spell in hand (about 1 a game), and the sorcery-speed activations Forge declines (equip and loyalty, about 1.9 windows
a game). The stack could not be searched because the copy had no stack (D544's *Context*: `GameSimulator.COPY_STACK`
false on the jar); D544 carries it, refusing what it cannot rebuild faithfully, and adds the three keys to one union
player. D544's hypothesis put the union at about 0.4-0.5 changed decisions a game; a 240-game exposure run on the dev
set since measured 0.292 (before the review's fixes), about +3 Elo at J215's rate, which this match reads as SHOWN or
SMALL GAIN about one time in five. One 4,800-game match on deals nobody has played, under a rule written before its
games.

**What it does not do.** It does not change the live seat, propose a change, tune anything, pool its games with
J215's or J216's, or say which key carried a reading. It does not read any outcome by deck or by deal.

**What is played.** One `ai-ladder.sh match`: 4,800 games, 2,400 mirrored pairs in 600 batches of 8 on the confirm
deck set (`tools/ai-bench/pairs-confirm.txt`), no stopping rule on the score (D398), at `--game-timeout 900`:
- A = `search-v3-wide` (`b95340935592`):
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1`;
- B = D544 point 10's, resolved from J216's read: **`search-v3-declined-instant`**, D543's recommendation STANDS (J216
  SMALL GAIN on the dev set alone, +8.3 Elo [+2.4, +14.1]); the live seat itself has not moved (the owner has not
  answered). Both forms are written below, the STANDS one uncommented in the pilot's B block and in the match step, and
  the match step refuses to play if they disagree:
  - D543's recommendation STANDS: `search-v3-declined-instant` (`af6771947a25`),
    `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1`;
  - WITHDRAWN or OPEN: `search-v2-no-b` (`59505e241363`, search-v3, the live seat since D539),
    `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1`.

**The deals** (D544 point 11). The match runs with `--host j217` in a ladder folder of its own, `var/j217-ladder`,
emptied by its step before it starts, so it takes the 600 blocks **725,900,000-725,900,599** (`hostBase('j217')` is
725,000,000; an emptied folder's first match block is its base plus 900,000, `nextBseed`) on a first run and on a
retry after a memory stop. No job file in this folder or in `drafts/` names `j217` or a block on base 725, and of the
360,238 ladder result rows under the lab's four checkouts' `var/` on 2026-11-13 none is on base 725 (the rows lie on
30 bases; 4,804 on J215's 519 and 4,804 on J216's 622). The pilot host here is `j217-pilot2`, base 63,000,000, on which
no row lies either: the name `j217-pilot` was not used because it hashes to 679, where J214's three pilots (host
`j214-pilot`, the same base) played 12 games on block 679,900,000. 600 consecutive blocks give each of the confirm set's
30 deck pairs exactly 40 batches, 160 games, in both seat orders (`batchPairs`). The block reader checks the range
after the match and the verdict refuses any other.

**The readings** (D544 points 12 to 14): D519's four at 4,800 games, exactly one for a complete match that is not
NOT READ; NOT READ when the match is complete in every other part but the three keys together changed fewer than
0.25 decisions a game on A's side (1,200 at 4,800); INCOMPLETE, owed a repost under a new job id after its cause is
found, for anything else, a B that shows any new-key counter above 0 (or, when B is the live seat, any D540 counter),
or an A that shows a `search.p.lands.` counter above 0 among them (a keys-off path fired: a code fault, not the
player's exposure), whatever the rate. A key under its floor (stackwin 0.25, passwin 0.10, dactiv 0.25 windows a game)
is reported as unexposed and decides nothing. Beside the reading, deciding nothing: indistinguishable, a measured
loss or a measured gain.

**Beside the reading, as description only** (D544 points 13 and 18): each side's searched decisions by kind and ms
a searched decision; search seconds a game and their ratio; each key's windows a game, candidates a window, changes a
game and retries a game; the stack windows refused, by reason, and their share; the own-stack aims dropped, the equips
aimed at their host dropped, the memory sets put back, the windows the opponent had passed in; the declined spells in
instant-speed windows (D541's review); priority overrides by direction a priority decision; the land windows left to
Forge a game. On an INCOMPLETE match the exposure is printed too.

**When it runs.** Alone (`alone: yes`, D521): both players think against a wall clock.

## Pilot
About 15 minutes:
- the pin is merged;
- the build (the lint and its self-test, javac, the decision self-test, at least 502 checks at D544's merge), the
  ai-bench self-test (at least 460 checks, its D540 and D544 lines kept in `var/j217-tools/d54x-selftest.txt` whatever
  they say) and the ladder registry test (which holds the new player's params, seat config and hash);
- B, written once (`var/j217-tools/b.json`) from the B block below, is one of the two players D544 point 10 allows;
- `ai-ladder.sh list` resolves the four players (the anchor, search-v2-no-b, search-v3-declined-instant and the new
  player) at their registered hashes, checked as strings, and the new player's seat config is exactly
  search-v3-declined-instant's plus `,stackwin=1,passwin=1,dactiv=1`;
- the code, by content: against D543's merge the files changed under `bridge/src`, `tools/ai-ladder` and
  `tools/ai-bench` are exactly D544's nine (its *Under D509* paragraph's six under `bridge/src`, `AiBench.java`,
  `kinds.ts` and `players.json`), `players.json` one line out and one in per appended player plus one, its players
  D543's followed only by new players with this one among them exactly once (another lane's append passes), and git
  answered (the block's comment says what it does not see and how to re-derive it at posting time);
- the `j217` host's seed base is 725,000,000 and an empty folder's first match block 725,900,000;
- the exposure reader, the verdict, the block, rollout and recording readers and the gate written, and each tested
  on synthetic files;
- one 4-game ladder match of the new player against B, one batch pair, one worker, in its own pilot folder under
  `--host j217-pilot2`: both sides search priority and attacks and no block, the match line names A and B at their
  hashes, the batch lines carry the two seat configs exactly, B's new-key counters are all 0 (and its D540 counters
  when B is the live seat), and A's `search.p.lands.` counters are all 0 (any of them stops the night);
- one recorded run of 4 games against Forge Default (the confirm set's first deck pair, two workers), whose decision
  records give the searched priority decisions by window (own main, land, instant-speed or pass window, stack) and
  their ms by candidate count, printed, and checked only for what must hold: no searched priority decision on a stack
  whose top item is the seat's own (`ownTop`), none in a land window, and no `search.p.lands.` counter in A's bench
  lines;
- **the gate** (D544 point 19): the match is played only if `search.p.stackwin.windows` and
  `search.p.dactiv.windows`, each summed over the 4 ladder games and the 4 recorded games, are above 0
  (`search.p.passwin.windows` is reported and may be 0 in 8 games), none of the 8 games ended in an engine error or a
  timeout, the three keys' retries together are at most 2 a game, and the stack windows refused are under half of the
  stack windows met (`refused / (refused + windows)` < 0.5). `var/j217-tools/gate.json` says whether the match plays
  and, if not, the condition it failed; the match step then writes `var/ai-ladder/match-J217.json` as
  `{"notPlayed": true, "reason": ...}`, plays nothing, and the report says so. The gate is not a pilot failure.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j217-merged.txt || echo 0 > var/j217-merged.txt
cat var/j217-merged.txt
rc=0; ./bridge/build.sh > var/j217-build.txt 2>&1 || rc=$?
cat var/j217-build.txt
# the build's decision self-test: its line, with 0 failures (502 at D544's lane: D541's 472 plus wideWindows' 30)
node -e 'const fs=require("fs");const t=fs.readFileSync("var/j217-build.txt","utf8");const m=/^decision selftest: (\d+) check\(s\), (\d+) failure\(s\)$/m.exec(t);const r={ok:m&&m[2]==="0"?1:0,checks:m?Number(m[1]):0,failures:m?Number(m[2]):-1};fs.writeFileSync("var/j217-decision-selftest.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
test "$rc" -eq 0
mkdir -p var/j217-tools
# the ai-bench self-test; its D540 and D544 lines are kept in d54x-selftest.txt whatever they say, then it must have
# passed with at least 460 checks (D544's lane: 352 plus the stack carry's and the three keys' scenarios)
brc=0; ./tools/ai-bench.sh --selftest > var/j217-tools/bench-selftest.txt 2>&1 || brc=$?
grep -iE 'd54[04]' var/j217-tools/bench-selftest.txt > var/j217-tools/d54x-selftest.txt || true
cat var/j217-tools/d54x-selftest.txt
tail -3 var/j217-tools/bench-selftest.txt
node -e 'const fs=require("fs");const t=fs.readFileSync("var/j217-tools/bench-selftest.txt","utf8");const m=/^ai-bench selftest: (\d+) check\(s\), (\d+) failure\(s\)$/m.exec(t);const r={ok:m&&m[2]==="0"?1:0,checks:m?Number(m[1]):0,failures:m?Number(m[2]):-1};fs.writeFileSync("var/j217-tools/bench-selftest.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
test "$brc" -eq 0
node --test web/test/ai-ladder.test.ts
```
```bash
# B (D544 point 10), resolved from J216's read (STANDS) before this job is posted: EXACTLY ONE of the two lines below is
# uncommented, and the match step's two lines must agree with it (the match step checks). D543 point 6:
# STANDS -> search-v3-declined-instant; WITHDRAWN or OPEN -> search-v2-no-b.
mkdir -p var/j217-tools
B_NAME=search-v3-declined-instant     # D543's recommendation STANDS (J216's read, 2026-11-13: SMALL GAIN alone)
# B_NAME=search-v2-no-b               # D543's recommendation WITHDRAWN or OPEN (J216's read)
node - "$B_NAME" <<'J217EOF'
// J217's B (D544 point 10): one of the two players the rule allows, with its hash and seat config written out, and
// whether it is the live seat (then B's D540 counters must be 0 too). Anything else stops the pilot.
const fs = require('fs');
const name = process.argv[2];
const V3 = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1';
const ALLOWED = {
  'search-v3-declined-instant': { hash: 'af6771947a25', cfg: V3 + ',declined=1,instant=1', live: 0, why: "D543's recommendation STANDS" },
  'search-v2-no-b': { hash: '59505e241363', cfg: V3, live: 1, why: "D543's recommendation WITHDRAWN or OPEN" },
};
const b = ALLOWED[name];
const r = b ? { ok: 1, name, hash: b.hash, cfg: b.cfg, isLive: b.live, why: b.why } : { ok: 0, name: String(name), hash: null, cfg: null, isLive: 0, why: 'B not resolved' };
fs.writeFileSync('var/j217-tools/b.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J217EOF
```
```bash
# the four players resolve at their registered hashes (compared as strings); the new player's seat config is exactly
# search-v3-declined-instant's plus ,stackwin=1,passwin=1,dactiv=1 (J215's players check, the names D544's)
mkdir -p var/j217-tools
./tools/ai-ladder.sh list > var/j217-tools/players.txt
grep -E '^(forge-default|search-v2-no-b|search-v3-declined-instant|search-v3-wide) ' var/j217-tools/players.txt || true
node - <<'J217EOF'
// J217's pilot: the players resolve, at their registered hashes (compared as strings), and search-v3-wide's seat
// config is search-v3-declined-instant's with exactly ,stackwin=1,passwin=1,dactiv=1 appended (D544 point 9).
const fs = require('fs');
const L = fs.readFileSync('var/j217-tools/players.txt', 'utf8').split('\n');
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
  'search-v3-declined-instant': { hash: 'af6771947a25', cfg: V3 + ',declined=1,instant=1', kind: 'search' },
  'search-v3-wide': { hash: 'b95340935592', cfg: V3 + ',declined=1,instant=1,stackwin=1,passwin=1,dactiv=1', kind: 'search' },
};
// D544 point 9's seat config and B's two, written out, so the concatenation above cannot drift with them
const LITERAL = {
  'search-v2-no-b': 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1',
  'search-v3-declined-instant': 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1',
  'search-v3-wide': 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1',
};
const b = (() => { try { return JSON.parse(fs.readFileSync('var/j217-tools/b.json', 'utf8')); } catch { return {}; } })();
const r = { present: 0, cfgs_ok: 0, literal_ok: 0, hashes_ok: 0, kinds_ok: 0, distinct: 0, b_ok: 0, hashes: {}, cfgs: {} };
const got = Object.fromEntries(Object.keys(WANT).map((n) => [n, get(n)]));
r.present = Object.values(got).every((p) => p && p.cfg) ? 1 : 0;
r.cfgs_ok = Object.entries(WANT).every(([n, w]) => got[n] && got[n].cfg === w.cfg) ? 1 : 0;
r.literal_ok = Object.entries(LITERAL).every(([n, c]) => got[n] && got[n].cfg === c && WANT[n].cfg === c) ? 1 : 0;
r.hashes_ok = Object.entries(WANT).every(([n, w]) => got[n] && String(got[n].hash) === w.hash) ? 1 : 0;
r.kinds_ok = Object.entries(WANT).every(([n, w]) => got[n] && got[n].kind === w.kind) ? 1 : 0;
r.distinct = new Set(Object.values(got).map((p) => p && p.hash)).size === 4 ? 1 : 0;
// B (b.json) is one of the two the rule allows, at the hash and seat config this PC resolves for it
r.b_ok = b.ok === 1 && (b.name === 'search-v3-declined-instant' || b.name === 'search-v2-no-b') && got[b.name]
  && String(got[b.name].hash) === b.hash && got[b.name].cfg === b.cfg ? 1 : 0;
for (const n of Object.keys(WANT)) { r.hashes[n] = got[n]?.hash ?? null; r.cfgs[n] = got[n]?.cfg ?? null; }
r.ok = r.present && r.cfgs_ok && r.literal_ok && r.hashes_ok && r.kinds_ok && r.distinct && r.b_ok ? 1 : 0;
fs.writeFileSync('var/j217-tools/players.json', JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J217EOF
# the j217 host's seed base (D544 point 11): hostBase('j217') is 725,000,000, so an empty folder's first match block is
# 725,900,000 and the 600th 725,900,599; the pilot's host name has another base (63,000,000, on which no row lies)
cat > var/j217-tools/base.mjs <<'J217EOF'
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const S = await import(pathToFileURL(path.resolve('tools/ai-ladder/schedule.ts')).href);
const own = S.hostBase('j217'), pilot = S.hostBase('j217-pilot2');
const first = S.nextBseed(own + 900000, new Set());
const r = { own, first, last: first + 599, pilot, ok: own === 725000000 && first === 725900000 && pilot === 63000000 ? 1 : 0 };
fs.mkdirSync('var/j217-tools', { recursive: true });
fs.writeFileSync('var/j217-tools/base.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J217EOF
node var/j217-tools/base.mjs
```
```bash
# the code since D543's merge under the paths a match runs: exactly D544's nine files, tools/ai-ladder/players.json 2
# lines in and 1 out, its players D543's with exactly search-v3-wide appended
mkdir -p var/j217-tools
# D543 is main at D543's merge (97122947c), whose bridge/src, tools/ai-ladder and tools/ai-bench are the code J215 and
# J216 measured B on (byte-identical there to 1eaa00d30's). What this block compares, from D543 to the pin: (1) the
# files changed under bridge/src, tools/ai-ladder and tools/ai-bench, which must be exactly D544's nine (`exact`);
# (2) tools/ai-ladder/players.json, which must be D543's players element for element followed only by players new to
# it, search-v3-wide among them exactly once, the file's top-level keys unchanged (`onePlayer`) -- so another lane's
# appended player (D545's search-v3-declined-instant-t1-x3, merged first) passes and nothing else in the registry may
# move; (3) its numstat: one line out (the comma added to D543's last player) and one in per appended player plus one
# (`playersLinesOk`). It does NOT see a change another lane makes inside one of the nine files. RE-DERIVE AT POSTING
# TIME, with <pin> the merge commit named in repos:
#   git diff --name-only 97122947c <pin> -- bridge/src tools/ai-ladder tools/ai-bench
#   git log --oneline 97122947c..<pin> -- bridge/src tools/ai-ladder tools/ai-bench
# Every commit the log lists must be D544's own or one that only appends to players.json (D545's). If any other lane
# changed code there (D546, which makes search-v3-declined-instant the live seat as search-v4, would touch
# SearchConfig.java), B's code is no longer J215's by this argument: write the argument that B plays unchanged, then
# move D543 below to that lane's merge (the base the argument is about) and extend the file list only by what it
# names, before posting. Leave D543 as it is when the log shows only D544 and players.json appends.
D543=97122947cfe6e60a5a9e2daa46d470a5a74f2c1f
git diff --name-only "$D543" HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j217-tools/src-diff.txt && echo 0 > var/j217-tools/src-diff.rc || echo 1 > var/j217-tools/src-diff.rc
git diff --numstat "$D543" HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j217-tools/src-numstat.txt && echo 0 > var/j217-tools/src-numstat.rc || echo 1 > var/j217-tools/src-numstat.rc
git show "$D543:tools/ai-ladder/players.json" > var/j217-tools/players-d543.json && echo 0 > var/j217-tools/players-d543.rc || echo 1 > var/j217-tools/players-d543.rc
node - <<'J217EOF'
const fs = require('fs');
const files = fs.readFileSync('var/j217-tools/src-diff.txt', 'utf8').split('\n').filter(Boolean).sort();
const rcOf = (f) => Number(fs.readFileSync(f, 'utf8').trim());
const rc = rcOf('var/j217-tools/src-diff.rc') === 0 && rcOf('var/j217-tools/src-numstat.rc') === 0 && rcOf('var/j217-tools/players-d543.rc') === 0 ? 0 : 1;
const num = {};
for (const l of fs.readFileSync('var/j217-tools/src-numstat.txt', 'utf8').split('\n').filter(Boolean)) {
  const [a, d, f] = l.split('\t');
  num[f] = { add: Number(a), del: Number(d) };
}
const P = 'tools/ai-ladder/players.json';
// D544's Under D509 paragraph: six files under bridge/src, the ai-bench self-test, the ladder's params and its registry
const NINE = ['bridge/src/mtgtable/ai/DecisionSelfTest.java', 'bridge/src/mtgtable/ai/LenientGameCopier.java',
  'bridge/src/mtgtable/ai/RolloutController.java', 'bridge/src/mtgtable/ai/RolloutForcing.java',
  'bridge/src/mtgtable/ai/SearchConfig.java', 'bridge/src/mtgtable/ai/SearchPolicy.java',
  'tools/ai-bench/AiBench.java', 'tools/ai-ladder/kinds.ts', P].sort();
const at = (f, x) => (num[f] ? num[f][x] : -1);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const was = read('var/j217-tools/players-d543.json'), now = read(P);
const wl = was && Array.isArray(was.players) ? was.players : null, nl = now && Array.isArray(now.players) ? now.players : null;
// the registry at the pin is D543's, player for player, followed only by players new to it (another lane's append,
// D545's, passes), search-v3-wide among them exactly once, the file's top-level keys unchanged
const appended = wl && nl && nl.length > wl.length && wl.every((p, i) => JSON.stringify(p) === JSON.stringify(nl[i]))
  ? nl.slice(wl.length) : null;
const wasNames = new Set((wl || []).map((p) => p && p.name));
const onePlayer = appended && was && now
  && appended.every((p) => p && typeof p.name === 'string' && !wasNames.has(p.name))
  && new Set(appended.map((p) => p.name)).size === appended.length
  && appended.filter((p) => p.name === 'search-v3-wide').length === 1
  && JSON.stringify(Object.keys(was).sort()) === JSON.stringify(Object.keys(now).sort()) ? 1 : 0;
// one player a line: one line out (the comma on D543's last player), one in per appended player plus that one
const playersLinesOk = appended && at(P, 'del') === 1 && at(P, 'add') === appended.length + 1 ? 1 : 0;
const r = { files, count: files.length, rc, exact: JSON.stringify(files) === JSON.stringify(NINE) ? 1 : 0,
  playersAdd: at(P, 'add'), playersDel: at(P, 'del'), onePlayer, playersLinesOk,
  appended: appended ? appended.map((p) => p.name) : null, playersBefore: wl ? wl.length : -1, playersAfter: nl ? nl.length : -1 };
fs.writeFileSync('var/j217-tools/src-diff.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J217EOF
```
```bash
# the exposure reader: for one match folder, the summed D540 and D544 counters of each side from the batch lines'
# aStats and bStats (config A is the match's first player), the three keys' exposure and the union's changes, B's
# keys-off checks and A's lands-off check
mkdir -p var/j217-tools
cat > var/j217-tools/exposure.cjs <<'J217EOF'
// J217 (D544 points 12 and 13): the union's exposure. J215's exposure reader, read for D544's three keys. Sums, for
// each side of one match, every batch line's counters whose key starts with search.p.declined., search.p.instant.,
// search.p.lands., search.p.stackwin., search.p.passwin., search.p.dactiv. or search.wide., plus search.p.considered,
// search.a.considered, search.p.skipLand and search.b.considered. For each of A's three keys (stackwin, passwin,
// dactiv): its windows, candidates, changes and retries. `<key>Floor` is 1 when that key's windows reach its floor
// (stackwin 0.25 a game, passwin 0.10, dactiv 0.25; compared in integers: windows x 4 >= games, windows x 10 >= games,
// windows x 4 >= games), description only. `unionChanged` is the three keys' changes summed, `exposed` 1 when it is at
// least 0.25 a game (unionChanged x 4 >= games: 1,200 at 4,800), D544 point 13's NOT READ condition. The refusals:
// search.p.stackwin.refused and each reason, read by its suffix (so the skeptic's read's `stale` and `hidden` come through
// with every other), `refusalShare` = refused / (refused + stackwin windows). `bNew` counts B's
// D544 counters above 0 (stackwin, passwin, dactiv, wide), `bD540` B's D540 counters above 0 (they must be 0 only when B
// is the live seat: the verdict reads b.json); `aLands` A's search.p.lands. counters above 0 (A's third D540 key is
// off); `kindsOk` 1 when both sides searched priority and attacks and neither searched a block. A game is a batch line.
// usage: node exposure.cjs <ladder dir> <match.json> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : '';
const bdir = `${dir}/batches/${run}`;
const D540 = /^search\.p\.(declined|instant|lands)\./;
const D544 = /^search\.(p\.(stackwin|passwin|dactiv)\.|wide\.)/;
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
        if (typeof v === 'number' && (D540.test(x) || D544.test(x) || x === 'search.p.considered' || x === 'search.a.considered' || x === 'search.p.skipLand' || x === 'search.b.considered')) {
          sum[k][x] = (sum[k][x] || 0) + v;
        }
      }
    }
  }
}
const games = lines;
const A = (key, x) => sum.a[`search.p.${key}.${x}`] || 0;
const bNew = Object.entries(sum.b).filter(([x, v]) => D544.test(x) && v > 0).length;
const bD540 = Object.entries(sum.b).filter(([x, v]) => D540.test(x) && v > 0).length;
const aLands = Object.entries(sum.a).filter(([x, v]) => LANDS.test(x) && v > 0).length;
const pos = (x) => (x || 0) > 0;
const r3 = (x) => Math.round(x * 1000) / 1000;
const pg = (x) => (games ? r3(x / games) : null);
const r = { run, matchPlayed: m && typeof m.played === 'number' ? m.played : null, lines, games, a: sum.a, b: sum.b };
const FLOOR = { stackwin: 4, passwin: 10, dactiv: 4 };   // windows x FLOOR >= games: 0.25, 0.10 and 0.25 a game
for (const key of ['stackwin', 'passwin', 'dactiv']) {
  const w = A(key, 'windows');
  Object.assign(r, {
    [`${key}Windows`]: w, [`${key}Cands`]: A(key, 'cands'), [`${key}Changed`]: A(key, 'changed'), [`${key}Retry`]: A(key, 'retry'),
    [`${key}Fired`]: w > 0 ? 1 : 0, [`${key}Floor`]: games > 0 && w * FLOOR[key] >= games ? 1 : 0,
    [`${key}WindowsPerGame`]: pg(w), [`${key}CandsPerWindow`]: w ? Math.round((A(key, 'cands') / w) * 100) / 100 : null,
    [`${key}ChangedPerGame`]: pg(A(key, 'changed')), [`${key}RetryPerGame`]: pg(A(key, 'retry')),
  });
}
const unionChanged = r.stackwinChanged + r.passwinChanged + r.dactivChanged;
const refused = A('stackwin', 'refused');
const reasons = {};
for (const [x, v] of Object.entries(sum.a)) {
  const mm = /^search\.p\.stackwin\.refused\.(.+)$/.exec(x);
  if (mm && typeof v === 'number') reasons[mm[1]] = v;
}
Object.assign(r, {
  unionChanged, unionChangedPerGame: pg(unionChanged), exposed: games > 0 && unionChanged * 4 >= games ? 1 : 0,
  refused, refusedReasons: reasons, refusalShare: refused + r.stackwinWindows > 0 ? r3(refused / (refused + r.stackwinWindows)) : 0,
  ownAim: A('stackwin', 'ownAim'), sameHost: A('dactiv', 'sameHost'), dactivListed: A('dactiv', 'listed'),
  dactivNoTarget: A('dactiv', 'noTarget'), memoryRestored: A('dactiv', 'memoryRestored'),
  stackwinOppPassed: A('stackwin', 'oppPassed'), passwinOppPassed: A('passwin', 'oppPassed'),
  wideOppPassed: sum.a['search.wide.oppPassed'] || 0,
  declinedInstantWindows: A('declined', 'instantWindows'), declinedWindows: A('declined', 'windows'), instantWindows: A('instant', 'windows'),
  bNew, bNewClean: bNew === 0 ? 1 : 0, bD540, bD540Clean: bD540 === 0 ? 1 : 0, aLands, aLandsClean: aLands === 0 ? 1 : 0,
  kindsOk: pos(sum.a['search.p.considered']) && pos(sum.b['search.p.considered'])
    && pos(sum.a['search.a.considered']) && pos(sum.b['search.a.considered'])
    && (sum.a['search.b.considered'] || 0) === 0 && (sum.b['search.b.considered'] || 0) === 0 ? 1 : 0,
});
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J217EOF
# its self-test, on synthetic batch folders of 8 games: (1) every key above its floor, the union at 0.375 changes a
# game, B clean but for a new counter at 0 (exposed, clean, both kinds); (2) B with a stackwin counter above 0 (bNew 1);
# (3) B with a D540 counter above 0 (bD540 1, bNew 0: the verdict decides with b.json); (4) A with a lands counter above
# 0 (aLandsClean 0); (5) the union at exactly 0.25 a game (2 in 8) is exposed, passwin at 1 in 8 is above its 0.10
# floor and dactiv at 0 is under its floor; (6) the union at 1 in 8 is not exposed; (7) refusals: 2 refused against 6
# windows is a share of 0.25, with each reason; (8) A with no attack search (kindsOk 0). Writes
# var/j217-tools/exposure-selftest.json
rm -rf var/j217-tools/exposure-selftest
node - <<'J217EOF'
const fs = require('fs');
const { execFileSync } = require('child_process');
const S = 'var/j217-tools/exposure-selftest';
const line = (a, b) => JSON.stringify({ a: 'X', b: 'Y', aStats: { counts: a }, bStats: { counts: b } });
const base = () => ({ 'search.p.considered': 9, 'search.a.considered': 2, 'search.p.skipLand': 3 });
const mk = (name, rows) => {
  const d = `${S}/${name}`;
  fs.mkdirSync(`${d}/batches/run-${name}`, { recursive: true });
  fs.writeFileSync(`${d}/match.json`, JSON.stringify({ id: `j217:run-${name}`, played: rows.length }));
  fs.writeFileSync(`${d}/batches/run-${name}/b0.jsonl`, rows.slice(0, 4).map(([a, b]) => line(a, b)).join('\n') + '\n');
  fs.writeFileSync(`${d}/batches/run-${name}/b1.jsonl`, rows.slice(4).map(([a, b]) => line(a, b)).join('\n') + '\n');
  execFileSync(process.execPath, ['var/j217-tools/exposure.cjs', d, `${d}/match.json`, `${d}/out.json`], { stdio: 'ignore' });
  return JSON.parse(fs.readFileSync(`${d}/out.json`, 'utf8'));
};
const rows = (f) => Array.from({ length: 8 }, (_, i) => f(i));
const SW = (ch = 0) => ({ 'search.p.stackwin.windows': 2, 'search.p.stackwin.cands': 6, 'search.p.stackwin.changed': ch, 'search.p.stackwin.oppPassed': 2 });
const PW = () => ({ 'search.p.passwin.windows': 1, 'search.p.passwin.cands': 2 });
const DA = (ch = 0) => ({ 'search.p.dactiv.windows': 1, 'search.p.dactiv.cands': 1, 'search.p.dactiv.changed': ch, 'search.p.dactiv.sameHost': 1 });
const A1 = (i) => ({ ...base(), ...SW(i % 4 === 0 ? 1 : 0), ...PW(), ...DA(i === 1 ? 1 : 0), 'search.p.declined.windows': 1, 'search.wide.oppPassed': 3 });
const B0 = () => ({ ...base(), 'search.p.stackwin.windows': 0 });
const c1 = mk('c1', rows((i) => [A1(i), B0()]));
const c2 = mk('c2', rows((i) => [A1(i), i === 3 ? { ...B0(), 'search.p.stackwin.windows': 1 } : B0()]));
const c3 = mk('c3', rows((i) => [A1(i), i === 2 ? { ...B0(), 'search.p.declined.windows': 4 } : B0()]));
const c4 = mk('c4', rows((i) => [i === 5 ? { ...A1(i), 'search.p.lands.windows': 1 } : A1(i), B0()]));
const c5 = mk('c5', rows((i) => [{ ...base(), ...(i === 0 || i === 4 ? SW(1) : {}), ...(i === 2 ? PW() : {}) }, B0()]));
const c6 = mk('c6', rows((i) => [{ ...base(), ...SW(i === 0 ? 1 : 0), ...DA(0) }, B0()]));
const c7 = mk('c7', rows((i) => [{ ...base(), ...(i < 3 ? SW(1) : {}), ...(i === 6 ? { 'search.p.stackwin.refused': 1, 'search.p.stackwin.refused.faceDown': 1 } : {}),
  ...(i === 7 ? { 'search.p.stackwin.refused': 1, 'search.p.stackwin.refused.stale': 1 } : {}) }, B0()]));
const noA = (i) => { const x = A1(i); delete x['search.a.considered']; return x; };
const c8 = mk('c8', rows((i) => [noA(i), B0()]));
const cases = [
  ['every key above its floor, the union at 3 changes in 8 games, B clean (a new counter at 0 is clean)', c1.games === 8 && c1.stackwinWindows === 16 && c1.stackwinWindowsPerGame === 2 && c1.stackwinCandsPerWindow === 3 && c1.passwinWindows === 8 && c1.dactivWindows === 8 && c1.stackwinChanged === 2 && c1.dactivChanged === 1 && c1.unionChanged === 3 && c1.unionChangedPerGame === 0.375 && c1.exposed === 1 && c1.stackwinFloor === 1 && c1.passwinFloor === 1 && c1.dactivFloor === 1 && c1.sameHost === 8 && c1.stackwinOppPassed === 16 && c1.wideOppPassed === 24 && c1.bNew === 0 && c1.bNewClean === 1 && c1.bD540Clean === 1 && c1.aLandsClean === 1 && c1.kindsOk === 1],
  ['B with search.p.stackwin.windows 1 in one game: bNew 1', c2.bNew === 1 && c2.bNewClean === 0 && c2.bD540 === 0 && c2.exposed === 1],
  ['B with search.p.declined.windows 4 in one game: bD540 1, bNew 0', c3.bD540 === 1 && c3.bD540Clean === 0 && c3.bNew === 0 && c3.bNewClean === 1],
  ['A with search.p.lands.windows 1 in one game: A not lands-clean', c4.aLandsClean === 0 && c4.aLands === 1 && c4.bNewClean === 1],
  ['the union at exactly 0.25 a game (2 in 8) is exposed; passwin 1 in 8 is above 0.10; dactiv 0 is under its floor', c5.unionChanged === 2 && c5.exposed === 1 && c5.passwinWindows === 1 && c5.passwinFloor === 1 && c5.dactivFloor === 0 && c5.dactivFired === 0 && c5.stackwinFloor === 1],
  ['the union at 1 change in 8 is not exposed', c6.unionChanged === 1 && c6.exposed === 0 && c6.dactivFloor === 1],
  ['2 stack windows refused against 6 searched: a share of 0.25, by reason', c7.refused === 2 && c7.stackwinWindows === 6 && c7.refusalShare === 0.25 && c7.refusedReasons.faceDown === 1 && c7.refusedReasons.stale === 1],
  ['A with no attack search: kindsOk 0', c8.kindsOk === 0 && c8.exposed === 1 && c8.bNewClean === 1],
];
let passed = 0;
for (const [what, ok] of cases) { console.error(`${ok ? 'ok  ' : 'FAIL'} ${what}`); passed += ok ? 1 : 0; }
const r = { ok: passed === cases.length ? 1 : 0, cases: cases.length, passed };
fs.writeFileSync('var/j217-tools/exposure-selftest.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J217EOF
```
```bash
mkdir -p var/j217-tools
cat > var/j217-tools/verdict.mjs <<'J217EOF'
// J217's reading, pre-registered in D544 (points 10 to 15, written 2026-11-12 before any J217 game and before J216's
// read; the job's rule: line; D398's fixed match; D519's four readings at 4,800 games, rewritten for this match as D519
// point 6 asks; D544's completeness parts and exposure conditions).
// usage: node verdict.mjs <match.json> <j217 dir> <out.json> [b.json]     node verdict.mjs --selftest <scratch dir>
//   <match.json> is the match line (or the match step's {"notPlayed": true, "reason": ...}); <j217 dir>/seeds.json
//   is the block reader's file, rollouts.json the rollout reader's and exposure.json the exposure reader's; b.json
//   (var/j217-tools/b.json by default) is B as the pilot resolved it (D544 point 10).
// THE MATCH: search-v3-wide (config A, search-v3-declined-instant with stackwin=1, passwin=1 and dactiv=1) against B,
//   D544 point 10's: search-v3-declined-instant when D543's recommendation STANDS, the live seat search-v2-no-b when it
//   is WITHDRAWN or OPEN; 4,800 games, 2,400 mirrored pairs, the confirm set, no stopping rule, under --host j217 in a
//   ladder folder of its own (var/j217-ladder, emptied by its step), so on deal blocks 725,900,000-725,900,599. A new
//   player on new deals: never pooled with J215 or J216.
// EXACTLY ONE OUTCOME, in this precedence:
//   NOT PLAYED   the pilot's gate (D544 point 19) kept the match out: the match file says notPlayed.
//   INCOMPLETE   any part of D544 point 12's completeness fails: B is not resolved to one of point 10's two players,
//                or the line does not name A and B in that order at their registered hashes, or does not say
//                complete: true, or played fewer than 4,800 games, or errors + timeouts > 240 (one in 20), or lacks
//                score, lo, elo, eloLo or eloHi, or its set is not the confirm set's file (point 11), or the block reader did not find the match's 4,800 games on exactly
//                the 600 blocks 725,900,000-725,900,599 with no other match's game in the folder, or a batch line did
//                not carry A's and B's seat configs exactly, or a side did not search priority and attacks or searched
//                a block, or the exposure reader did not read this match's 4,800 batch lines, or B's batch counters
//                show any search.p.stackwin., search.p.passwin., search.p.dactiv. or search.wide. counter above 0,
//                or (B the live seat) any search.p.declined., search.p.instant. or search.p.lands. counter above 0, or
//                A's show a search.p.lands. counter above 0 (a keys-off path fired: a code fault), whatever the rate.
//                No reading and not NOT READ: owed a repost alone under a new job id after the cause is found. A
//                match cut short and under the rate is INCOMPLETE; its rates are still reported, as description.
//   NOT READ     every other part holds, but A's three keys together changed fewer than 0.25 decisions a game played
//                (search.p.stackwin.changed + search.p.passwin.changed + search.p.dactiv.changed, changed x 4 <
//                played: under 1,200 at 4,800), D544 point 13. No reading; every rate reported; not played again
//                without a new decision.
//   one of D519's four readings, for a COMPLETE match, compared as the line carries them, lo in integer
//   ten-thousandths and Elo in integer tenths:
//     SHOWN                  lo > 0.5 and elo >= 15
//     SMALL GAIN             lo > 0.5 and elo < 15
//     INCONCLUSIVE AT 4,800  lo <= 0.5 and eloHi >= 15
//     NOT SHOWN              lo <= 0.5 and eloHi < 15
//   SHOWN and SMALL GAIN make search-v3-wide a LIVE-SEAT CANDIDATE for the owner (liveSeatCandidate 1), to be decided
//   under a separate decision and a seat-queue row (D509), with the cost beside it; NOT SHOWN closes the three keys as
//   a union on the confirm set (unionClosed 1); a measured loss removes the union (unionRemoved 1, beside NOT SHOWN);
//   INCONCLUSIVE AT 4,800 is information, not confirmed again. Nothing here changes the live seat (liveSeatChanged is
//   0 in every outcome).
// DESCRIPTIVE, deciding nothing, exactly one for a complete match: "a measured loss" (eloHi < 0), "a measured gain"
//   (eloLo > 0), "indistinguishable" otherwise (an end of exactly 0 holds 0). A key under its floor (stackwin 0.25,
//   passwin 0.10, dactiv 0.25 windows a game) is named unexposed and decides nothing.
// BESIDE EVERY OUTCOME, never changing one (D544 points 13 and 18): each key's exposure a game (windows, candidates a
//   window, changes, retries), the union's changes, the stack windows refused and their share, the own-stack aims and
//   same-host equips dropped, the memory sets put back, the windows the opponent had passed in, the declined spells in
//   instant-speed windows, each side's searched decisions by kind and ms a searched decision, search seconds a game and
//   their ratio, the priority overrides by direction a priority decision and the land windows left to Forge a game.
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 4800;
export const BAR = GAMES / 20;
export const FIRST = 725900000;
export const BLOCKS = 600;
export const LAST = FIRST + BLOCKS - 1;
export const A = 'search-v3-wide';
export const AH = 'b95340935592';
// D544 point 11's deck set: the match line's `set` (the ladder writes the --pairs file it played, the confirm set's by
// default), a completeness part since the skeptic's read
export const SET = 'tools/ai-bench/pairs-confirm.txt';
const V3 = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1';
export const ACFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1';
// D544 point 10: the two players B may be
export const BS = {
  'search-v3-declined-instant': { hash: 'af6771947a25', cfg: V3 + ',declined=1,instant=1', live: 0 },
  'search-v2-no-b': { hash: '59505e241363', cfg: V3, live: 1 },
};
const KEYS = ['stackwin', 'passwin', 'dactiv'];
const FLOORS = { stackwin: 0.25, passwin: 0.1, dactiv: 0.25 };
const MULT = { stackwin: 4, passwin: 10, dactiv: 4 };   // in integers: windows x MULT >= games played is the floor

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const kinds = (t) => ({ p: num(t?.byKind?.p?.searched) ?? 0, a: num(t?.byKind?.a?.searched) ?? 0, b: num(t?.byKind?.b?.searched) ?? 0 });
const secPerGame = (t, played) => {
  const ms = num(t?.msPerDecision), n = num(t?.searched), g = num(played);
  return ms !== null && n !== null && g !== null && g > 0 ? Math.round((ms * n) / g) / 1000 : null;
};
const r3 = (x) => Math.round(x * 1000) / 1000;
const per = (x, n) => (num(x) !== null && num(n) !== null && n > 0 ? r3(x / n) : null);

export function verdict(m, bs, ro, ex, bsel) {
  const B = bsel && bsel.ok === 1 && BS[bsel.name] && BS[bsel.name].hash === bsel.hash && BS[bsel.name].cfg === bsel.cfg ? bsel.name : null;
  const BH = B ? BS[B].hash : null, BCFG = B ? BS[B].cfg : null, bIsLive = B ? BS[B].live : 0;
  const bResolved = B !== null ? 1 : 0;
  const notPlayed = m !== null && m.notPlayed === true ? 1 : 0;
  const names = !notPlayed && m !== null && B !== null && m.a === A && m.b === B ? 1 : 0;
  const hashes = !notPlayed && m !== null && B !== null && String(m.ah) === AH && String(m.bh) === BH ? 1 : 0;
  const setOk = !notPlayed && m !== null && m.set === SET ? 1 : 0;
  const ak = kinds(m?.aSearch), bk = kinds(m?.bSearch);
  const kindsOk = !notPlayed && m !== null && ak.p > 0 && ak.a > 0 && ak.b === 0 && bk.p > 0 && bk.a > 0 && bk.b === 0 ? 1 : 0;
  const purpose = typeof m?.id === 'string' ? `match:${m.id}` : null;
  const run = typeof m?.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : null;
  const blocks = bs !== null && purpose !== null && bs.purpose === purpose && bs.games === GAMES && bs.blocks === BLOCKS
    && bs.min === FIRST && bs.max === LAST && bs.otherGames === 0 ? 1 : 0;
  const cfgs = ro !== null && B !== null && typeof ro.lines === 'number' && ro.lines === GAMES && ro.cfgExact === GAMES
    && ro.aCfg === ACFG && ro.bCfg === BCFG ? 1 : 0;
  // the exposure reader's file is this match's when it names the match's run; it is the whole match when it read
  // all 4,800 batch lines
  const exThis = ex !== null && run !== null && ex.run === run && num(ex.games) !== null
    && KEYS.every((k) => num(ex[`${k}Windows`]) !== null) && num(ex.unionChanged) !== null;
  const exposureRead = exThis && ex.games === GAMES ? 1 : 0;
  const bClean = exThis && ex.bNew === 0 && (bIsLive === 0 || ex.bD540 === 0) ? 1 : 0;
  const aLandsClean = exThis && ex.aLandsClean === 1 && ex.aLands === 0 ? 1 : 0;
  const s = {
    a: A, b: B, bIsLive, bResolved, match: m === null ? 0 : 1, names, hashes, setOk, kindsOk, blocks, cfgs, exposureRead, bClean, aLandsClean,
    id: m?.id ?? null, set: m?.set ?? null, ah: m?.ah ?? null, bh: m?.bh ?? null, played: num(m?.played) ?? 0, planned: num(m?.planned),
    errors: num(m?.errors), timeouts: num(m?.timeouts), pairs: num(m?.pairs),
    score: num(m?.score), lo: num(m?.lo), hi: num(m?.hi), elo: num(m?.elo), eloLo: num(m?.eloLo), eloHi: num(m?.eloHi),
    aSearched: num(m?.aSearch?.searched) ?? 0, bSearched: num(m?.bSearch?.searched) ?? 0,
    aP: ak.p, aA: ak.a, aB: ak.b, bP: bk.p, bA: bk.a, bB: bk.b,
    aMs: num(m?.aSearch?.msPerDecision), bMs: num(m?.bSearch?.msPerDecision),
    aMsP: num(m?.aSearch?.msMean?.p), aMsA: num(m?.aSearch?.msMean?.a),
    bMsP: num(m?.bSearch?.msMean?.p), bMsA: num(m?.bSearch?.msMean?.a),
  };
  const parts = !notPlayed && bResolved === 1 && names === 1 && hashes === 1 && m.complete === true && s.played === GAMES
    && (s.errors ?? 0) + (s.timeouts ?? 0) <= BAR && s.score !== null && s.lo !== null && s.elo !== null && s.eloLo !== null
    && s.eloHi !== null && setOk === 1 && blocks === 1 && cfgs === 1 && kindsOk === 1 && exposureRead === 1 && bClean === 1 && aLandsClean === 1;
  // the exposure, as description for every match it was read on (a cut-short one included), and as D544 point 13's
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
      // the key's floor, description only: windows / games played >= the floor, in integers
      [`${k}Floor`]: E && s.played > 0 && w * MULT[k] >= s.played ? 1 : 0,
    });
  }
  const uc = E ? num(E.unionChanged) ?? 0 : null;
  Object.assign(exposure, {
    unionChanged: uc, unionChangedPerGame: per(uc, g),
    refused: E ? num(E.refused) ?? 0 : null, refusalShare: E ? num(E.refusalShare) ?? 0 : null,
    refusedReasons: E && E.refusedReasons ? E.refusedReasons : {},
    ownAim: E ? num(E.ownAim) ?? 0 : null, sameHost: E ? num(E.sameHost) ?? 0 : null,
    dactivListed: E ? num(E.dactivListed) ?? 0 : null, memoryRestored: E ? num(E.memoryRestored) ?? 0 : null,
    stackwinOppPassed: E ? num(E.stackwinOppPassed) ?? 0 : null, passwinOppPassed: E ? num(E.passwinOppPassed) ?? 0 : null,
    declinedInstantWindows: E ? num(E.declinedInstantWindows) ?? 0 : null,
    bNew: E ? num(E.bNew) : null, bD540: E ? num(E.bD540) : null, aLands: E ? num(E.aLands) : null,
  });
  // D544 point 13: the union is read when its changes are at least 0.25 a game played, in integers (1,200 at 4,800)
  const exposed = E && s.played > 0 && uc * 4 >= s.played ? 1 : 0;
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
  const unionClosed = notShown;
  const measuredLoss = ok && EH < 0 ? 1 : 0;
  const measuredGain = ok && EL10 > 0 ? 1 : 0;
  const unionRemoved = measuredLoss;
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
  const unexposed = KEYS.filter((k) => exposure[`${k}Floor`] !== 1);
  const expo = KEYS.map((k) => `${k} ${d(exposure[`${k}Windows`])} windows (${d(exposure[`${k}WindowsPerGame`])} a game, floor ${FLOORS[k]}${exposure[`${k}Floor`] === 1 ? '' : ', UNEXPOSED'}), ${d(exposure[`${k}CandsPerWindow`])} candidates a window, ${d(exposure[`${k}Changed`])} changes, ${d(exposure[`${k}RetryPerGame`])} retries a game`).join('; ')
    + `; the union ${d(uc)} changes over ${d(g)} games (${d(exposure.unionChangedPerGame)} a game; 0.25 is the rate); stack windows refused ${d(exposure.refused)} (a share of ${d(exposure.refusalShare)})`;
  const cost = costRatio === null ? 'no cost read'
    : `${aSecPerGame} against ${bSecPerGame} search seconds a game (x${costRatio}), ${s.aMs} against ${s.bMs} ms a searched decision`;
  const why = bResolved === 0 ? 'B NOT RESOLVED (D544 point 10)' : s.match === 0 ? 'NO MATCH' : names === 0 ? 'NOT THIS MATCH (names)'
    : hashes === 0 ? 'NOT THESE PLAYERS (hashes)'
    : m.complete !== true ? 'STOPPED (complete: false)' : s.played !== GAMES ? `NOT ALL 4,800 GAMES (${s.played})`
    : (s.errors ?? 0) + (s.timeouts ?? 0) > BAR ? 'ERRORS AND TIMEOUTS OVER 240'
    : [s.score, s.lo, s.elo, s.eloLo, s.eloHi].some((x) => x === null) ? 'A NUMBER MISSING FROM THE LINE'
    : setOk === 0 ? 'NOT THE CONFIRM SET' : cfgs === 0 ? 'NOT THESE SEAT CONFIGS' : blocks === 0 ? 'NOT THE REGISTERED DEAL BLOCKS'
    : kindsOk === 0 ? 'A SIDE DID NOT SEARCH PRIORITY AND ATTACKS, OR SEARCHED A BLOCK'
    : exposureRead === 0 ? 'NO EXPOSURE READ ON THIS MATCH'
    : bClean === 0 ? `B SHOWED ${d(exposure.bNew)} D544 COUNTER(S)${bIsLive ? ` AND ${d(exposure.bD540)} D540 COUNTER(S)` : ''} ABOVE 0: A KEYS-OFF PATH FIRED`
    : aLandsClean === 0 ? `A SHOWED ${d(exposure.aLands)} LANDS COUNTER(S) ABOVE 0: A KEYS-OFF PATH FIRED` : 'INCOMPLETE';
  const vsB = `against ${d(B)}${bIsLive ? ' (the live seat: the union with D541\'s two keys)' : ' (search-v3-declined-instant: the three keys\' increment)'}`;
  const line = notPlayed ? `${A}: NOT PLAYED: the pilot's gate (D544 point 19): ${m.reason ?? 'no reason given'}; no reading; the live seat is unchanged`
    : incomplete ? `${A}: INCOMPLETE (${why}): no reading, and not NOT READ; ${s.played} of 4,800 games; ${expo}; B's D544 counters above 0: ${d(exposure.bNew)}, B's D540 counters above 0: ${d(exposure.bD540)}, A's lands counters above 0: ${d(exposure.aLands)} (description only); owed: a repost alone under a new job id after its cause is found; the live seat is unchanged`
    : notRead ? `${A}: NOT READ: the three keys changed ${uc} decisions over ${s.played} games, ${exposure.unionChangedPerGame} a game, under 0.25 (1,200 at 4,800); ${expo}; no reading on the union; not played again without a new decision; the live seat is unchanged`
    : `${A}: ${reading} (${word}): ${s.elo} Elo [${s.eloLo}, ${s.eloHi}], score ${s.score} [${s.lo}, ${s.hi}], ${vsB}; ${expo}${unexposed.length ? `; unexposed, so not judged: ${unexposed.join(', ')}` : ''}; ${cost}; ${liveSeatCandidate ? 'a live-seat candidate for the owner, under a separate decision and a seat-queue row (D509)' : unionClosed ? `not a candidate; the three keys close as a union on the confirm set${unionRemoved ? ', and a measured loss removes the union' : ''}` : 'not a candidate; information, not confirmed again'}; the live seat is unchanged`;
  return { ...s, notPlayed, incomplete, notRead, complete, exposed, shown, smallGain, inconclusive4800, notShown,
    liveSeatCandidate, unionClosed, unionRemoved, measuredLoss, measuredGain, indistinguishable, outcome, reading, word,
    reason: notPlayed ? m.reason ?? null : null, ...exposure, unexposed, aSecPerGame, bSecPerGame, costRatio, desc, line,
    written: 1, games: GAMES, bar: BAR, first: FIRST, last: LAST, liveSeatChanged: 0 };
}

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const BD = { ok: 1, name: 'search-v3-declined-instant', hash: 'af6771947a25', cfg: BS['search-v3-declined-instant'].cfg, isLive: 0 };
  const BL = { ok: 1, name: 'search-v2-no-b', hash: '59505e241363', cfg: BS['search-v2-no-b'].cfg, isLive: 1 };
  const T = (o = {}) => ({ games: GAMES, searched: 120000, changed: 21000, msPerDecision: 930,
    byKind: { p: { searched: 94000 }, a: { searched: 26000 } }, msMean: { p: 940, a: 890 }, ...o });
  const mk = (o = {}, b = BD) => ({ id: 'j217:run-s', host: 'j217', a: A, b: b.name, ah: AH, bh: b.hash, set: SET, complete: true,
    played: GAMES, planned: GAMES, errors: 0, timeouts: 0, pairs: 2400, score: 0.5042, lo: 0.497, hi: 0.5113, elo: 2.9, eloLo: -2.1,
    eloHi: 7.9, aSearch: T({ msPerDecision: 1000, searched: 125000 }), bSearch: T(), ...o });
  const SD = (o = {}) => ({ purpose: 'match:j217:run-s', games: GAMES, blocks: BLOCKS, min: FIRST, max: LAST, fullBlocks: BLOCKS, otherGames: 0, ...o });
  const RO = (o = {}, b = BD) => ({ lines: GAMES, cfgExact: GAMES, aCfg: ACFG, bCfg: b.cfg, aFromPass: 0.08, aToOther: 0.06, aToPass: 0.05,
    bFromPass: 0.08, bToOther: 0.065, bToPass: 0.049, aSkipLand: 7.2, bSkipLand: 7.2, ...o });
  const EX = (o = {}) => ({ run: 'run-s', lines: GAMES, games: GAMES, stackwinWindows: 9100, stackwinCands: 27300, stackwinChanged: 1100,
    stackwinRetry: 3, passwinWindows: 2900, passwinCands: 6100, passwinChanged: 340, passwinRetry: 0, dactivWindows: 4800, dactivCands: 5200,
    dactivChanged: 560, dactivRetry: 1, unionChanged: 2000, refused: 900, refusalShare: 0.09, refusedReasons: { faceDown: 30, verify: 2 },
    ownAim: 40, sameHost: 2100, dactivListed: 5200, memoryRestored: 3900, stackwinOppPassed: 8000, passwinOppPassed: 1900,
    declinedInstantWindows: 600, bNew: 0, bNewClean: 1, bD540: 4, bD540Clean: 0, aLands: 0, aLandsClean: 1, ...o });
  const C = (m = {}, bs = {}, ro = {}, ex = {}, b = BD) => ({ m: mk(m, b), bs: SD(bs), ro: RO(ro, b), ex: EX(ex), b });
  const CL = (m = {}, bs = {}, ro = {}, ex = {}) => C(m, bs, ro, { bD540: 0, bD540Clean: 1, ...ex }, BL);
  const flags = (r) => [r.shown, r.smallGain, r.inconclusive4800, r.notShown, r.notRead, r.notPlayed, r.incomplete];
  const exactlyOne = (r) => flags(r).reduce((t, x) => t + x, 0) === 1;
  const one = (r) => exactlyOne(r) && r.complete === 1 && r.shown + r.smallGain + r.inconclusive4800 + r.notShown === 1
    && r.indistinguishable + r.measuredLoss + r.measuredGain === 1 && r.liveSeatCandidate === r.shown + r.smallGain
    && r.unionClosed === r.notShown && r.unionRemoved === r.measuredLoss && r.liveSeatChanged === 0;
  const noReading = (r) => r.complete === 0 && r.shown + r.smallGain + r.inconclusive4800 + r.notShown + r.liveSeatCandidate
    + r.unionClosed + r.unionRemoved + r.indistinguishable + r.measuredLoss + r.measuredGain === 0 && r.reading === null && r.liveSeatChanged === 0;
  const none = (r) => noReading(r) && exactlyOne(r) && r.incomplete === 1 && r.notRead === 0 && r.notPlayed === 0 && r.outcome === 'INCOMPLETE' && r.line.includes('owed: a repost');
  const nread = (r) => noReading(r) && exactlyOne(r) && r.notRead === 1 && r.outcome === 'NOT READ' && r.line.includes('not played again without a new decision');
  const cases = [
    ['+2.9 [-2.1, +7.9], lo 0.4970, B search-v3-declined-instant: NOT SHOWN, indistinguishable, the union closes', C(), (r) => r.notShown === 1 && one(r) && r.indistinguishable === 1 && r.unionClosed === 1 && r.unionRemoved === 0 && r.liveSeatCandidate === 0 && r.bIsLive === 0 && r.line.includes('close as a union') && r.line.includes("increment")],
    ['the same against the live seat (its D540 counters at 0): NOT SHOWN, read against the live seat', CL(), (r) => r.notShown === 1 && one(r) && r.bIsLive === 1 && r.b === 'search-v2-no-b' && r.line.includes('the live seat: the union')],
    ['+20 [+14.6, +25.4], lo 0.5210: SHOWN, a measured gain, a live-seat candidate', C({ score: 0.5288, lo: 0.521, hi: 0.5366, elo: 20, eloLo: 14.6, eloHi: 25.4 }), (r) => r.shown === 1 && one(r) && r.measuredGain === 1 && r.liveSeatCandidate === 1 && r.unionClosed === 0 && r.line.includes('live-seat candidate')],
    ['+8 [+2.6, +13.4], lo 0.5037: SMALL GAIN, a measured gain, a live-seat candidate', C({ score: 0.5115, lo: 0.5037, hi: 0.5193, elo: 8, eloLo: 2.6, eloHi: 13.4 }), (r) => r.smallGain === 1 && one(r) && r.measuredGain === 1 && r.liveSeatCandidate === 1],
    ['an Elo point of exactly 15.0 with lo above 0.5 is SHOWN', C({ score: 0.5216, lo: 0.5138, hi: 0.5294, elo: 15, eloLo: 9.6, eloHi: 20.5 }), (r) => r.shown === 1 && one(r)],
    ['an Elo point of 14.9 with lo above 0.5 is SMALL GAIN', C({ score: 0.5214, lo: 0.5136, hi: 0.5292, elo: 14.9, eloLo: 9.5, eloHi: 20.4 }), (r) => r.smallGain === 1 && one(r)],
    ['lo of exactly 0.5 with eloHi 15: INCONCLUSIVE AT 4,800 (a wider interval than planned)', C({ score: 0.5104, lo: 0.5, hi: 0.5216, elo: 7.2, eloLo: 0, eloHi: 15 }), (r) => r.inconclusive4800 === 1 && one(r) && r.liveSeatCandidate === 0 && r.unionClosed === 0 && r.indistinguishable === 1 && r.line.includes('information, not confirmed again')],
    ['lo of exactly 0.5 with eloHi 10.6 is NOT SHOWN, not SMALL GAIN', C({ score: 0.5076, lo: 0.5, hi: 0.5153, elo: 5.3, eloLo: 0, eloHi: 10.6 }), (r) => r.notShown === 1 && one(r) && r.measuredGain === 0],
    ['lo 0.5001 is above 0.5: SMALL GAIN', C({ score: 0.5077, lo: 0.5001, hi: 0.5154, elo: 5.4, eloLo: 0.1, eloHi: 10.7 }), (r) => r.smallGain === 1 && one(r) && r.measuredGain === 1],
    ['an upper end of 14.9 with lo <= 0.5 is NOT SHOWN', C({ score: 0.5103, lo: 0.4994, hi: 0.5214, elo: 7.1, eloLo: -0.4, eloHi: 14.9 }), (r) => r.notShown === 1 && one(r)],
    ['-12 [-17.3, -6.7]: NOT SHOWN, a measured loss, the union removed', C({ score: 0.4827, lo: 0.4751, hi: 0.4904, elo: -12, eloLo: -17.3, eloHi: -6.7 }), (r) => r.notShown === 1 && r.measuredLoss === 1 && r.unionRemoved === 1 && one(r) && r.line.includes('removes the union')],
    ['an upper end of exactly 0 holds 0: indistinguishable, not removed', C({ score: 0.4924, lo: 0.4847, hi: 0.5, elo: -5.3, eloLo: -10.6, eloHi: 0 }), (r) => r.indistinguishable === 1 && r.measuredLoss === 0 && r.unionRemoved === 0 && one(r)],
    ['B unresolved (no b.json) is INCOMPLETE', { m: mk(), bs: SD(), ro: RO(), ex: EX(), b: null }, (r) => r.bResolved === 0 && none(r) && r.line.includes('B NOT RESOLVED')],
    ['a b.json naming a third player is INCOMPLETE', C({}, {}, {}, {}, { ok: 1, name: 'search-v3-declined', hash: '795daea97aaa', cfg: 'x' }), (r) => r.bResolved === 0 && none(r)],
    ['a match played against the other B than b.json resolved is not this match', C({ b: 'search-v2-no-b', bh: '59505e241363' }), (r) => r.names === 0 && none(r)],
    ['a stopped match (complete: false, 3,600 played) is INCOMPLETE', C({ complete: false, played: 3600 }, {}, {}, { games: 3600, lines: 3600 }), (r) => none(r) && r.line.includes('STOPPED')],
    ['cut short AND under the rate: INCOMPLETE, not NOT READ, its rates reported', C({ complete: false, played: 3600 }, {}, {}, { games: 3600, lines: 3600, unionChanged: 40 }), (r) => none(r) && r.unionChangedPerGame === 0.011 && r.notRead === 0],
    ['complete: true but 4,799 games is INCOMPLETE', C({ played: 4799 }), (r) => none(r)],
    ['241 errors and timeouts is INCOMPLETE; 240 is complete', C({ errors: 200, timeouts: 41 }), (r) => none(r) && r.line.includes('OVER 240') && one(verdict(mk({ errors: 200, timeouts: 40 }), SD(), RO(), EX(), BD))],
    ['a line without eloHi is INCOMPLETE', C({ eloHi: null }), (r) => none(r)],
    ['a line on the dev set is INCOMPLETE (not the confirm set)', C({ set: 'tools/ai-bench/pairs-dev.txt' }), (r) => r.setOk === 0 && none(r) && r.line.includes('NOT THE CONFIRM SET')],
    ['a line with no set is INCOMPLETE', C({ set: undefined }), (r) => r.setOk === 0 && none(r)],
    ['the players swapped is not this match', C({ a: 'search-v3-declined-instant', b: A, ah: 'af6771947a25', bh: AH }), (r) => r.names === 0 && none(r)],
    ['A at search-v3-declined-instant\'s hash is not this match', C({ ah: 'af6771947a25' }), (r) => r.hashes === 0 && none(r)],
    ['A that searched a block is INCOMPLETE', C({ aSearch: T({ byKind: { p: { searched: 94000 }, a: { searched: 26000 }, b: { searched: 3 } } }) }), (r) => r.kindsOk === 0 && none(r)],
    ['B that searched no attack is INCOMPLETE', C({ bSearch: T({ byKind: { p: { searched: 94000 } } }) }), (r) => r.kindsOk === 0 && none(r)],
    ['no block file is INCOMPLETE', { m: mk(), bs: null, ro: RO(), ex: EX(), b: BD }, (r) => r.blocks === 0 && none(r)],
    ['599 blocks is not the registered 600', C({}, { blocks: 599 }), (r) => r.blocks === 0 && none(r)],
    ['J215\'s blocks (519,900,000 on) are not this match\'s', C({}, { min: 519900000, max: 519900599 }), (r) => none(r)],
    ['J216\'s blocks (622,900,000 on) are not this match\'s', C({}, { min: 622900000, max: 622900599 }), (r) => none(r)],
    ['the pilot host\'s blocks (63,900,000 on) are not this match\'s', C({}, { min: 63900000, max: 63900599 }), (r) => none(r)],
    ['another match\'s game in the folder is INCOMPLETE', C({}, { otherGames: 4 }), (r) => none(r)],
    ['a batch line with another seat config is INCOMPLETE', C({}, {}, { cfgExact: 4799 }), (r) => r.cfgs === 0 && none(r)],
    ['A at search-v3-declined-instant\'s seat config is INCOMPLETE', C({}, {}, { aCfg: BS['search-v3-declined-instant'].cfg }), (r) => r.cfgs === 0 && none(r)],
    ['no rollout file is INCOMPLETE', { m: mk(), bs: SD(), ro: null, ex: EX(), b: BD }, (r) => r.cfgs === 0 && none(r)],
    ['no match file is INCOMPLETE', { m: null, bs: SD(), ro: RO(), ex: EX(), b: BD }, (r) => r.match === 0 && none(r) && r.line.includes('NO MATCH')],
    ['no exposure file is INCOMPLETE, not NOT READ', { m: mk(), bs: SD(), ro: RO(), ex: null, b: BD }, (r) => r.exposureRead === 0 && none(r) && r.stackwinWindows === null],
    ['an exposure file of another run is INCOMPLETE', C({}, {}, {}, { run: 'run-x' }), (r) => r.exposureRead === 0 && none(r)],
    ['the union at 1,199 changes (0.25 less one) is NOT READ, its rate reported', C({}, {}, {}, { unionChanged: 1199 }), (r) => nread(r) && r.exposed === 0 && r.unionChangedPerGame === 0.25 && r.line.includes('changed 1199 decisions')],
    ['the union at exactly 1,200 changes (0.25 a game) is read', C({}, {}, {}, { unionChanged: 1200 }), (r) => one(r) && r.exposed === 1 && r.notShown === 1],
    ['the union under the rate is NOT READ even with a SHOWN line', C({ score: 0.5288, lo: 0.521, hi: 0.5366, elo: 20, eloLo: 14.6, eloHi: 25.4 }, {}, {}, { unionChanged: 300 }), (r) => nread(r) && r.liveSeatCandidate === 0],
    ['passwin under its 0.10 floor (479 windows) is named unexposed and changes no reading', C({ score: 0.5115, lo: 0.5037, hi: 0.5193, elo: 8, eloLo: 2.6, eloHi: 13.4 }, {}, {}, { passwinWindows: 479 }), (r) => r.smallGain === 1 && one(r) && r.passwinFloor === 0 && r.stackwinFloor === 1 && r.dactivFloor === 1 && r.unexposed.length === 1 && r.line.includes('unexposed, so not judged: passwin')],
    ['passwin at exactly 480 windows (0.10 a game) and dactiv at exactly 1,200 (0.25) reach their floors', C({}, {}, {}, { passwinWindows: 480, dactivWindows: 1200 }), (r) => r.passwinFloor === 1 && r.dactivFloor === 1 && r.unexposed.length === 0 && one(r)],
    ['B with a D544 counter above 0 is INCOMPLETE, not NOT READ, whatever the line says', C({ score: 0.5288, lo: 0.521, hi: 0.5366, elo: 20, eloLo: 14.6, eloHi: 25.4 }, {}, {}, { bNew: 1, bNewClean: 0 }), (r) => none(r) && r.bClean === 0 && r.liveSeatCandidate === 0 && r.line.includes('B SHOWED 1 D544 COUNTER')],
    ['B search-v3-declined-instant with D540 counters above 0 is clean (its own keys)', C({}, {}, {}, { bD540: 4 }), (r) => r.bClean === 1 && one(r)],
    ['B the live seat with a D540 counter above 0 is INCOMPLETE', CL({}, {}, {}, { bD540: 1, bD540Clean: 0 }), (r) => none(r) && r.bClean === 0 && r.line.includes('D540 COUNTER')],
    ['B dirty and under the rate is INCOMPLETE, not NOT READ', C({}, {}, {}, { unionChanged: 10, bNew: 2, bNewClean: 0 }), (r) => none(r) && r.notRead === 0],
    ['A with a lands counter above 0 is INCOMPLETE', C({}, {}, {}, { aLands: 1, aLandsClean: 0 }), (r) => none(r) && r.aLandsClean === 0 && r.line.includes('A SHOWED 1 LANDS COUNTER')],
    ['a match the pilot\'s gate kept out is NOT PLAYED, with its reason, and nothing else', { m: { notPlayed: true, reason: 'search.p.dactiv.windows fired in no window of its 8 games', played: 0, complete: false }, bs: null, ro: null, ex: null, b: BD }, (r) => exactlyOne(r) && r.notPlayed === 1 && noReading(r) && r.incomplete === 0 && r.outcome === 'NOT PLAYED' && r.line.includes('fired in no window')],
    ['the cost and the exposure are described and change no reading', C(), (r) => r.aSecPerGame === 26.042 && r.bSecPerGame === 23.25 && r.costRatio === 1.1201 && r.stackwinWindowsPerGame === 1.896 && r.stackwinCandsPerWindow === 3 && r.dactivChangedPerGame === 0.117 && r.unionChangedPerGame === 0.417 && r.refusalShare === 0.09 && r.refusedReasons.faceDown === 30 && r.sameHost === 2100 && r.notShown === 1 && one(r)],
  ];
  let ok = 0;
  cases.forEach(([what, input, pred], n) => {
    const d = path.join(scratch, `case-${n}`);
    fs.mkdirSync(d, { recursive: true });
    if (input.m != null) fs.writeFileSync(path.join(d, 'match.json'), JSON.stringify(input.m));
    if (input.bs != null) fs.writeFileSync(path.join(d, 'seeds.json'), JSON.stringify(input.bs));
    if (input.ro != null) fs.writeFileSync(path.join(d, 'rollouts.json'), JSON.stringify(input.ro));
    if (input.ex != null) fs.writeFileSync(path.join(d, 'exposure.json'), JSON.stringify(input.ex));
    if (input.b != null) fs.writeFileSync(path.join(d, 'b.json'), JSON.stringify(input.b));
    const v = verdict(...load(path.join(d, 'match.json'), d, path.join(d, 'b.json')));
    const pass = pred(v) === true;
    console.error(`${pass ? 'ok  ' : 'FAIL'} ${what}: ${v.line}`);
    ok += pass ? 1 : 0;
  });
  return { selftest: 1, cases: cases.length, passed: ok, ok: ok === cases.length ? 1 : 0 };
}

function read(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

export function load(matchFile, j217Dir, bFile) {
  return [read(matchFile), read(path.join(j217Dir, 'seeds.json')), read(path.join(j217Dir, 'rollouts.json')),
    read(path.join(j217Dir, 'exposure.json')), read(bFile)];
}

const argv = process.argv.slice(2);
if (argv[0] === '--selftest') {
  const r = selftest(argv[1]);
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
} else if (argv.length === 3 || argv.length === 4) {
  const v = verdict(...load(argv[0], argv[1], argv[3] ?? 'var/j217-tools/b.json'));
  fs.mkdirSync(path.dirname(argv[2]), { recursive: true });
  fs.writeFileSync(argv[2], JSON.stringify(v, null, 1) + '\n');
  console.log(JSON.stringify(v));
} else {
  console.error('usage: node verdict.mjs <match.json> <j217 dir> <out.json> [b.json] | --selftest <dir>');
  process.exit(2);
}
J217EOF
cat > var/j217-tools/rollouts.cjs <<'J217EOF'
// J217: J215's rollout reader (var/j215-tools/rollouts.cjs, J214's and J212's before it), unchanged but for these lines. For each side of one
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
J217EOF
cat > var/j217-tools/seeds.cjs <<'J217EOF'
// J217: J215's block reader (var/j215-tools/seeds.cjs, J214's and J212's before it), unchanged but for these lines: which deal
// blocks a match played (D398 point 2: a match takes its matchup's next unused blocks from its host name's match base;
// D544 point 11: under --host j217 in an emptied folder those are 725,900,000-725,900,599).
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
  registered: b.length === 600 && b[0] === 725900000 && b[b.length - 1] === 725900599 && otherGames === 0 ? 1 : 0 };
fs.writeFileSync(out, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J217EOF
cat > var/j217-tools/records.cjs <<'J217EOF'
// J217's recording reader: J215's records.cjs (J214's and J212's before it), widened for D544's stack windows (D544
// point 19): a searched priority decision on a stack is its own class, and the one count that must be 0 is `ownTop`. It reads the gzipped seat logs `ai-bench.sh play --record-all`
// writes (D347: <run>/games/p<pair>-g<game>-seat<s>.jsonl.gz, each seat's own redacted view, with that seat's decision
// records as dir:"ai" type:"decision" lines) and summarises the SEARCH seat's records only (the log whose own seat,
// hello_ok's `you` in the session header's `seats`, has policy "search"; the Forge seat's logs are counted and
// skipped). The state line before each record gives the active player and the stack; `phase` is the record's own.
// Each searched PRIORITY decision is put in one class:
//   land      a land is among its candidates or its answer (`land:` tokens: D540's land window, which this player
//             never searches: lands=1 is off);
//   stack     otherwise, on a non-empty stack (stackwin's windows);
//   ownMain   otherwise, the seat's own main phase (MAIN1, MAIN2);
//   instant   otherwise: outside the seat's own main phases on an empty stack (instant's and passwin's windows).
// For each class: decisions, candidates a decision (the histogram 1..6+), ms, overrides; and for all searched priority
// decisions, ms by candidate count. One count must be 0 for this player: `ownTop`, searched priority decisions on a
// stack whose top item (the last of the state's bottom-first stack) the seat controls (stackwin searches the
// opponent's top item only). `onStack` (searched on any stack) and `outsideOwnMain` are above 0 here and nothing
// requires them. `noState` counts searched decisions with no state line before them (counted in outsideOwnMain, not
// in onStack).
// It also reads the run's bench lines (<run>/shard-*.jsonl, beside <games dir>): games, engine errors (a non-empty
// `error`), timeouts, and config A's (the search seat's) D540 and D544 counters summed, `search.p.<key>.windows`,
// `.cands`, `.changed`, `.retry`, `.listed`, `.noTarget`, `.refused`. The unsearched priority windows are J212's
// (description only).
// usage: node records.cjs <games dir> <out.json>        node records.cjs --selftest <scratch dir>
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const KIND = { priority: 'p', attack: 'a', block: 'b' };
const PLAY = /^(cast|activate):/;
const D540 = /^search\.p\.(declined|instant|lands|stackwin|passwin|dactiv)\./;
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
  const C = { land: cls(), stack: cls(), ownMain: cls(), instant: cls() };
  const msBy = {};
  const W = { landSkip: 0, landSkipOtherLand: 0, landSkipPlay: 0, ownMainNoSearch: win(), ownMainStack: win(), ownOther: win(),
    oppTurn: win(), outsideOwnMain: 0, onStack: 0, ownTop: 0, noState: 0 };
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
          const onStk = hasStack && st.stack.length > 0;
          const c = C[isLand ? 'land' : onStk ? 'stack' : own && main ? 'ownMain' : 'instant'];
          c.n++; c.candSum += co.length; c.ms += ms; if (s.overrode === true) c.overrode++;
          c.cands[bucket(co.length)] = (c.cands[bucket(co.length)] || 0) + 1;
          const mb = (msBy[bucket(co.length)] = msBy[bucket(co.length)] || { n: 0, ms: 0 });
          mb.n++; mb.ms += ms;
          if (!(own && main && stackEmpty)) W.outsideOwnMain++;
          if (onStk) {
            W.onStack++;
            const top = st.stack[st.stack.length - 1];
            if (top && top.controller === you) W.ownTop++;
          }
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
    landSearched: C.land.n, stackSearched: C.stack.n, ownMainSearched: C.ownMain.n, instantSearched: C.instant.n,
    outsideOwnMain: W.outsideOwnMain, onStack: W.onStack, ownTop: W.ownTop, noState: W.noState,
    benchGames: B.lines, benchErrors: B.errors, benchTimeouts: B.timeouts,
    declinedWindows: bc('declined', 'windows'), instantWindows: bc('instant', 'windows'), landsWindows: bc('lands', 'windows'),
    stackwinWindows: bc('stackwin', 'windows'), passwinWindows: bc('passwin', 'windows'), dactivWindows: bc('dactiv', 'windows'),
    stackwinRetry: bc('stackwin', 'retry'), passwinRetry: bc('passwin', 'retry'), dactivRetry: bc('dactiv', 'retry'),
    stackwinRefused: bc('stackwin', 'refused'), landsRetry: bc('lands', 'retry') });
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
    state(1, 'MAIN1', [{ id: 4, controller: 1 }, { id: 5, controller: 0 }]),
    // a stack whose top item (the last, bottom first) is the seat's own, searched: stack class, ownTop
    dec({ seat: 0, kind: 'priority', phase: 'MAIN1', options: ['pass', 'cast:7'], chosen: 'pass', by: 'search',
      search: srch([opt('pass', 3, 0), opt('cast:7', 3, 4)], 800, false) }),
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
    shard({ aStats: { counts: { 'search.p.stackwin.windows': 2, 'search.p.stackwin.cands': 4, 'search.p.stackwin.retry': 1, 'search.p.considered': 9 } } }),
    shard({ error: 'java.lang.IllegalStateException', aStats: { counts: { 'search.p.stackwin.windows': 1, 'search.p.stackwin.refused': 1 } } }),
  ].join('\n') + '\n');
  fs.writeFileSync(path.join(scratch, 'shard-1.jsonl'), shard({ timeout: true }) + '\n');
  const r = summarize(g);
  const C = r.classes, W = r.windows;
  const checks = [
    ['three files, one search log, one Forge log skipped, one unreadable', r.files === 3 && r.searchLogs === 1 && r.otherLogs === 1 && r.bad === 1 && r.games === 1],
    ['five searched priority decisions and one attack', r.pSearched === 5 && r.aSearched === 1 && r.bSearched === 0],
    ['the classes: own main 1, land 1, instant-speed 1, stack 2', r.ownMainSearched === 1 && r.landSearched === 1 && r.instantSearched === 1 && r.stackSearched === 2],
    ['the land class: 2 candidates, 1,510 ms, overrode', C.land.n === 1 && C.land.candidatesMean === 2 && C.land.msMean === 1510 && C.land.overrode === 1],
    ['the own-main class: 3 candidates, 1,490 ms, overrode', C.ownMain.candidates['3'] === 1 && C.ownMain.n === 1 && C.ownMain.msMean === 1490 && C.ownMain.overrode === 1],
    ['the stack class: 2 decisions, 700 ms', C.stack.n === 2 && C.stack.msMean === 700 && C.stack.candidates['2'] === 2],
    ['ms by candidate count: 2 candidates 4 decisions at 902.5 ms, 3 candidates 1 at 1,490', r.msByCands['2'].n === 4 && r.msByCands['2'].msMean === 902.5 && r.msByCands['3'].n === 1 && r.msByCands['3'].msMean === 1490],
    ['outside the own-main empty-stack window: 3; on a stack: 2, one of them with the seat\'s own item on top', r.outsideOwnMain === 3 && r.onStack === 2 && r.ownTop === 1 && r.noState === 0],
    ['an attack on one round is short', r.kinds.a.shortShare === 1 && r.kinds.p.shortShare === 0],
    ['one land drop left to Forge, no other land among its options', W.landSkip === 1 && W.landSkipOtherLand === 0],
    ['the own end step and the opponent\'s upkeep: one unsearched window each, with a play', W.ownOther.n === 1 && W.ownOther.withPlay === 1 && W.oppTurn.n === 1 && W.oppTurn.withPlay === 1],
    ['the forced passes from the summary line; the target record is not a p/a/b decision', r.forcedPriority === 10 && r.decisions === 9],
    ['the bench lines: 3 games, 1 error, 1 timeout', r.benchGames === 3 && r.benchErrors === 1 && r.benchTimeouts === 1],
    ['the bench counters: stackwin windows 3, retry 1, refused 1, cands 4; no other key; search.p.considered not a key counter', r.stackwinWindows === 3 && r.stackwinRetry === 1 && r.stackwinRefused === 1 && r.bench.counts['search.p.stackwin.cands'] === 4 && r.dactivWindows === 0 && r.passwinWindows === 0 && r.landsWindows === 0 && r.bench.counts['search.p.considered'] === undefined],
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
J217EOF
cat > var/j217-tools/gate.cjs <<'J217EOF'
// J217's gate (D544 point 19), after the pilot's games. The match is played only if, over the new player's 4 ladder
// games against B and its 4 recorded games against Forge Default: search.p.stackwin.windows summed is above 0,
// search.p.dactiv.windows summed is above 0 (search.p.passwin.windows is reported and may be 0 in 8 games), none of the
// 8 games ended in an engine error or a timeout, the three keys' retries together are at most 2 a game (summed, at
// most 2 x 8), and the stack windows refused are under half of those met (refused / (refused + stackwin windows) <
// 0.5). Both pilot runs must have played their 4 games. It reads:
//   var/ai-ladder-pilot/J217/match.json        the ladder match line (played, complete, errors, timeouts, its id);
//   var/j217-tools/pilot-exposure.json         the exposure reader on that match (A's counters, summed);
//   var/ai-bench/j217-pilot-rec/shard-*.jsonl  the recorded run's bench lines (error, timeout, aStats: config A is
//                                              the new player's seat).
// Writes var/j217-tools/gate.json {written, play: 1|0, reason, and its numbers}. The pilot fails on none of this: a
// match the gate keeps out is NOT PLAYED and the report says why.
// usage: node gate.cjs [root]   (every path above is under root; '.' by default)
const fs = require('fs');
const path = require('path');
const root = process.argv[2] || '.';
const P = (...x) => path.join(root, ...x);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const n = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const m = read(P('var/ai-ladder-pilot', 'J217', 'match.json'));
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : null;
const ex = read(P('var/j217-tools', 'pilot-exposure.json'));
const exOk = ex !== null && run !== null && ex.run === run;
const bdir = P('var/ai-bench', 'j217-pilot-rec');
const K = ['stackwin', 'passwin', 'dactiv'];
let bGames = 0, bErr = 0, bTo = 0, bRefused = 0;
const bW = { stackwin: 0, passwin: 0, dactiv: 0 }, bR = { stackwin: 0, passwin: 0, dactiv: 0 };
for (const f of fs.existsSync(bdir) ? fs.readdirSync(bdir).filter((x) => /^shard-\d+\.jsonl$/.test(x)) : []) {
  for (const line of fs.readFileSync(path.join(bdir, f), 'utf8').split('\n')) {
    let l; try { l = JSON.parse(line); } catch { continue; }
    bGames++;
    if (l.error !== '' && l.error !== null && l.error !== undefined && l.error !== false) bErr++;
    if (l.timeout === true) bTo++;
    const c = (l.aStats && l.aStats.counts) || {};
    for (const k of K) { bW[k] += n(c[`search.p.${k}.windows`]); bR[k] += n(c[`search.p.${k}.retry`]); }
    bRefused += n(c['search.p.stackwin.refused']);
  }
}
const lGames = m ? n(m.played) : 0, lBad = m ? n(m.errors) + n(m.timeouts) : 0;
const lW = {}, lR = {};
for (const k of K) { lW[k] = exOk ? n(ex[`${k}Windows`]) : 0; lR[k] = exOk ? n(ex[`${k}Retry`]) : 0; }
const lRefused = exOk ? n(ex.refused) : 0;
const games = lGames + bGames, bad = lBad + bErr + bTo;
const windows = Object.fromEntries(K.map((k) => [k, lW[k] + bW[k]]));
const retry = K.reduce((t, k) => t + lR[k] + bR[k], 0);
const refused = lRefused + bRefused;
const share = refused + windows.stackwin > 0 ? Math.round((refused / (refused + windows.stackwin)) * 1000) / 1000 : 0;
const why = [];
if (m === null) why.push('no pilot ladder match line');
else if (m.complete !== true || lGames !== 4) why.push(`the pilot ladder match played ${lGames} of its 4 games (complete: ${m.complete})`);
if (m !== null && !exOk) why.push('no exposure read on the pilot ladder match');
if (bGames !== 4) why.push(`the recorded run wrote ${bGames} of its 4 games`);
if (bad > 0) why.push(`${bad} of its ${games} games ended in an engine error or a timeout`);
for (const k of ['stackwin', 'dactiv']) if (windows[k] <= 0) why.push(`search.p.${k}.windows fired in no window of its ${games} games`);
if (retry > 2 * games) why.push(`the three keys' retries ${retry} over ${games} games, above 2 a game`);
if (refused * 2 >= refused + windows.stackwin && refused > 0) why.push(`stack windows refused ${refused} against ${windows.stackwin} searched, a share of ${share}, not under one half`);
const out = { written: 1, play: why.length === 0 ? 1 : 0, reason: why.length === 0 ? null : why.join('; '),
  ladderGames: lGames, benchGames: bGames, games, errorsTimeouts: bad,
  ladderStackwinWindows: lW.stackwin, benchStackwinWindows: bW.stackwin, stackwinWindows: windows.stackwin,
  ladderPasswinWindows: lW.passwin, benchPasswinWindows: bW.passwin, passwinWindows: windows.passwin,
  ladderDactivWindows: lW.dactiv, benchDactivWindows: bW.dactiv, dactivWindows: windows.dactiv,
  refused, refusalShare: share, retry, retryPerGame: games ? Math.round((retry / games) * 1000) / 1000 : null };
fs.mkdirSync(P('var/j217-tools'), { recursive: true });
fs.writeFileSync(P('var/j217-tools', 'gate.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out));
J217EOF
rm -rf var/j217-tools/selftest
node var/j217-tools/verdict.mjs --selftest var/j217-tools/selftest > var/j217-tools/selftest.json || true
cat var/j217-tools/selftest.json
rm -rf var/j217-tools/rec-selftest
node var/j217-tools/records.cjs --selftest var/j217-tools/rec-selftest > var/j217-tools/rec-selftest.json || true
cat var/j217-tools/rec-selftest.json
# the block reader on a synthetic results log: a match at two blocks over three games, one game of another match
# (counted as other), and a pilot line that must not count at all
rm -rf var/j217-tools/seeds-selftest
mkdir -p var/j217-tools/seeds-selftest/results
printf '%s\n' '{"purpose":"match:j217:new","bseed":725900000}' '{"purpose":"match:j217:new","bseed":725900001}' '{"purpose":"match:j217:new","bseed":725900001}' '{"purpose":"match:j217:other","bseed":725900002}' '{"purpose":"pilot","bseed":5}' > var/j217-tools/seeds-selftest/results/j217.jsonl
echo '{"id":"j217:new"}' > var/j217-tools/seeds-selftest/match.json
node var/j217-tools/seeds.cjs var/j217-tools/seeds-selftest var/j217-tools/seeds-selftest/match.json var/j217-tools/seeds-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j217-tools/seeds-selftest/out.json","utf8"));const ok=r.purpose==="match:j217:new"&&r.games===3&&r.blocks===2&&r.min===725900000&&r.max===725900001&&r.fullBlocks===0&&r.otherGames===1&&r.registered===0?1:0;require("fs").writeFileSync("var/j217-tools/seeds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the rollout reader on a synthetic batch folder: two games, each side's decisions by kind, priority overrides by
# direction, land skips, and the two seat configs (one line off)
rm -rf var/j217-tools/ro-selftest
mkdir -p var/j217-tools/ro-selftest/batches/run-s
printf '%s\n' '{"a":"X","b":"Y","aStats":{"counts":{"search.rollouts":90,"search.rounds":34,"search.anytime.short":1,"search.p.considered":8,"search.a.considered":2,"search.playUs":9000000,"search.copyUs":450000,"search.p.skipLand":3,"search.p.changed.fromPass":2,"search.p.changed.toPass":1}},"bStats":{"counts":{"search.rollouts":150,"search.rounds":60,"search.p.considered":7,"search.b.considered":3,"search.playUs":7500000,"search.copyUs":750000,"search.p.changed.toOther":1}}}' '{"a":"X","b":"Z","aStats":{"counts":{"search.rollouts":96,"search.rounds":34,"search.p.considered":10,"search.playUs":9600000}},"bStats":{"counts":{"search.rollouts":158,"search.rounds":58,"search.anytime.short":1,"search.a.considered":10,"search.playUs":7900000}}}' > var/j217-tools/ro-selftest/batches/run-s/b0.jsonl
echo '{"id":"j217:run-s","a":"search-v3-wide","b":"search-v3-declined-instant"}' > var/j217-tools/ro-selftest/match.json
node var/j217-tools/rollouts.cjs var/j217-tools/ro-selftest var/j217-tools/ro-selftest/match.json var/j217-tools/ro-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j217-tools/ro-selftest/out.json","utf8"));const ok=r.games===2&&r.aDecisions===20&&r.bDecisions===20&&r.aPriority===18&&r.aAttacks===2&&r.aBlocks===0&&r.bBlocks===3&&r.aRolloutsPerDecision===9.3&&r.bRolloutsPerDecision===15.4&&r.aPlayMsPerRollout===100&&r.bPlayMsPerRollout===50&&r.playMsRatio===2&&r.aCopyMsPerRollout===2.4&&r.aShortShare===0.05&&r.aFromPass===0.1111&&r.aToPass===0.0556&&r.bToOther===0.1429&&r.aSkipLandN===3&&r.aSkipLand===1.5&&r.aCfg==="X"&&r.bCfg==="MIXED"&&r.cfgExact===0?1:0;require("fs").writeFileSync("var/j217-tools/ro-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the gate on four synthetic pilots: one passes (passwin at 0 does not stop it); one whose dactiv key fired in no
# window; one with a timeout and too many retries; one with half its stack windows refused
rm -rf var/j217-tools/gate-selftest
node - <<'J217EOF'
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const R = 'var/j217-tools/gate-selftest';
const pilot = (name, { sw, dw, bsw = 0, bdw = 0, timeout = false, retry = 0, refused = 0 }) => {
  const root = `${R}/${name}`;
  const put = (f, s) => { fs.mkdirSync(path.dirname(`${root}/${f}`), { recursive: true }); fs.writeFileSync(`${root}/${f}`, s); };
  put('var/ai-ladder-pilot/J217/match.json', JSON.stringify({ id: 'j217-pilot2:run-g', complete: true, played: 4, errors: 0, timeouts: 0 }));
  put('var/j217-tools/pilot-exposure.json', JSON.stringify({ run: 'run-g', stackwinWindows: sw, passwinWindows: 0, dactivWindows: dw, stackwinRetry: retry, passwinRetry: 0, dactivRetry: retry, refused }));
  const line = (i) => JSON.stringify({ error: '', timeout: timeout && i === 1, aStats: { counts: { 'search.p.stackwin.windows': i === 0 ? bsw : 0, 'search.p.dactiv.windows': i === 0 ? bdw : 0, 'search.p.stackwin.retry': retry } } });
  put('var/ai-bench/j217-pilot-rec/shard-0.jsonl', [0, 1].map(line).join('\n') + '\n');
  put('var/ai-bench/j217-pilot-rec/shard-1.jsonl', [2, 3].map(line).join('\n') + '\n');
  execFileSync(process.execPath, ['var/j217-tools/gate.cjs', root], { stdio: 'ignore' });
  return JSON.parse(fs.readFileSync(`${root}/var/j217-tools/gate.json`, 'utf8'));
};
const a = pilot('pass', { sw: 10, dw: 0, bsw: 3, bdw: 2, refused: 1 });
const b = pilot('noDactiv', { sw: 10, dw: 0, bsw: 3, bdw: 0 });
const c = pilot('bad', { sw: 2, dw: 1, timeout: true, retry: 3 });
const e = pilot('refused', { sw: 3, dw: 2, bsw: 1, refused: 4 });
const ok = a.written === 1 && a.play === 1 && a.reason === null && a.stackwinWindows === 13 && a.dactivWindows === 2 && a.passwinWindows === 0 && a.games === 8 && a.refusalShare === 0.071
  && b.play === 0 && /search\.p\.dactiv\.windows fired in no window/.test(b.reason || '') && !/stackwin\.windows fired/.test(b.reason || '')
  && c.play === 0 && /1 of its 8 games/.test(c.reason || '') && /retries 18 over 8 games/.test(c.reason || '') && c.retryPerGame === 2.25
  && e.play === 0 && /refused 4 against 4 searched, a share of 0\.5/.test(e.reason || '') ? 1 : 0;
fs.writeFileSync('var/j217-tools/gate-selftest.json', JSON.stringify({ ok }) + '\n');
console.log(JSON.stringify({ ok, pass: a, noDactiv: b.reason, bad: c.reason, refused: e.reason }));
J217EOF
```
```bash
# one 4-game ladder match of the new player against B, in a pilot folder under another host (one batch pair, one
# worker); then its exposure (the three keys, B's new-key and D540 counters, A's lands counters, both sides' kinds),
# its rollout reader and the match line's names, hashes and seat configs (numbers only, so no check reads a missing key)
mkdir -p var/j217-tools
B_NAME=$(node -e 'const b=JSON.parse(require("fs").readFileSync("var/j217-tools/b.json","utf8"));if(b.ok!==1)process.exit(1);console.log(b.name)')
rm -rf var/ai-ladder-pilot/J217
./tools/ai-ladder.sh match search-v3-wide "$B_NAME" --games 4 --batch-pairs 1 --game-timeout 900 --host j217-pilot2 --purpose pilot --dir var/ai-ladder-pilot/J217 --experiments var/ai-ladder-pilot/J217/experiments.jsonl --out var/ai-ladder-pilot/J217/match.json --jobs 1
node var/j217-tools/exposure.cjs var/ai-ladder-pilot/J217 var/ai-ladder-pilot/J217/match.json var/j217-tools/pilot-exposure.json
node var/j217-tools/rollouts.cjs var/ai-ladder-pilot/J217 var/ai-ladder-pilot/J217/match.json var/j217-tools/rollouts-pilot.json > /dev/null
node - <<'J217EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const m = read('var/ai-ladder-pilot/J217/match.json'), ro = read('var/j217-tools/rollouts-pilot.json');
const pl = read('var/j217-tools/players.json'), b = read('var/j217-tools/b.json'), px = read('var/j217-tools/pilot-exposure.json');
const n = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const k = (t, x) => n(t && t.byKind && t.byKind[x] ? t.byKind[x].searched : 0, 0);
const A = 'search-v3-wide';
const r = { written: 1,
  namesOk: m.a === A && b.ok === 1 && m.b === b.name ? 1 : 0,
  hashesOk: String(m.ah) === 'b95340935592' && b.ok === 1 && String(m.bh) === b.hash ? 1 : 0,
  cfgOk: pl.cfgs && ro.aCfg === pl.cfgs[A] && b.ok === 1 && ro.bCfg === b.cfg && ro.cfgExact === ro.lines && ro.lines === 4 ? 1 : 0,
  // B's keys-off paths: no D544 counter above 0, and none of D540's either when B is the live seat
  bClean: px.bNewClean === 1 && (b.isLive !== 1 || px.bD540Clean === 1) ? 1 : 0,
  played: n(m.played, 0), errorsTimeouts: n(m.errors, 9) + n(m.timeouts, 9),
  aP: k(m.aSearch, 'p'), aA: k(m.aSearch, 'a'), aB: k(m.aSearch, 'b'), bP: k(m.bSearch, 'p'), bA: k(m.bSearch, 'a'), bB: k(m.bSearch, 'b'),
  aMs: n(m.aSearch && m.aSearch.msPerDecision, -1), bMs: n(m.bSearch && m.bSearch.msPerDecision, -1),
  aSecPerGame: m.played ? Math.round(n(m.aSearch && m.aSearch.msPerDecision, 0) * n(m.aSearch && m.aSearch.searched, 0) / m.played) / 1000 : -1,
  bSecPerGame: m.played ? Math.round(n(m.bSearch && m.bSearch.msPerDecision, 0) * n(m.bSearch && m.bSearch.searched, 0) / m.played) / 1000 : -1 };
fs.writeFileSync('var/j217-tools/pilot.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J217EOF
```
```bash
# one recorded run of 4 games against Forge Default (the confirm set's first deck pair, two workers): the searched
# priority decisions by window (own main, land, instant-speed or pass window, stack) and their ms by candidate count
# from the search seat's decision records, with the bench lines' D540 and D544 counters (records.cjs above); then the
# gate
mkdir -p var/j217-tools
awk '!/^#/ && NF { print; exit }' tools/ai-bench/pairs-confirm.txt > var/j217-tools/pair1.txt
cat var/j217-tools/pair1.txt
V3='Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1'
rm -rf var/ai-bench/j217-pilot-rec
./tools/ai-bench.sh play --pairs var/j217-tools/pair1.txt --a "$V3,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1" --b Default --games 4 --seed 217000001 --timeout 900 --jobs 2 --run j217-pilot-rec --record-all
node var/j217-tools/records.cjs var/ai-bench/j217-pilot-rec/games var/j217-tools/rec-pilot.json > /dev/null
node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("var/j217-tools/rec-pilot.json","utf8"));const o={};for(const x of ["written","files","searchLogs","bad","games","pSearched","aSearched","bSearched","ownMainSearched","landSearched","instantSearched","stackSearched","outsideOwnMain","onStack","ownTop","noState","benchGames","benchErrors","benchTimeouts","stackwinWindows","passwinWindows","dactivWindows","stackwinRefused","stackwinRetry","passwinRetry","dactivRetry","landsWindows"])o[x]=typeof r[x]==="number"?r[x]:-1;console.log(JSON.stringify(o),JSON.stringify(r.classes),JSON.stringify(r.msByCands),JSON.stringify(r.bench.counts))'
# the gate (D544 point 19): stackwin's and dactiv's windows over the 4 ladder and 4 recorded games above 0, no error or
# timeout in the 8, the three keys' retries together at most 2 a game, the stack windows refused under half; writes
# var/j217-tools/gate.json {written, play, reason}
node var/j217-tools/gate.cjs
```
metrics: merged = sh: cat var/j217-merged.txt 2>/dev/null || echo 0
metrics: dst = sh: cat var/j217-decision-selftest.json 2>/dev/null || echo '{"ok":0,"checks":0,"failures":-1}'
metrics: bst = sh: cat var/j217-tools/bench-selftest.json 2>/dev/null || echo '{"ok":0,"checks":0,"failures":-1}'
metrics: bb = sh: cat var/j217-tools/b.json 2>/dev/null || echo '{"ok":0,"isLive":0}'
metrics: pl = sh: cat var/j217-tools/players.json 2>/dev/null || echo '{"ok":0,"present":0,"cfgs_ok":0,"literal_ok":0,"hashes_ok":0,"kinds_ok":0,"distinct":0,"b_ok":0}'
metrics: sd = sh: cat var/j217-tools/src-diff.json 2>/dev/null || echo '{"count":-1,"rc":1,"exact":0,"playersAdd":-1,"playersDel":-1,"onePlayer":0}'
metrics: hb = sh: cat var/j217-tools/base.json 2>/dev/null || echo '{"ok":0,"own":0,"first":0,"last":0,"pilot":0}'
metrics: est = sh: cat var/j217-tools/exposure-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: st = sh: cat var/j217-tools/selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: rst = sh: cat var/j217-tools/rec-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: sst = sh: cat var/j217-tools/seeds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: ost = sh: cat var/j217-tools/ro-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: gst = sh: cat var/j217-tools/gate-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: px = sh: cat var/j217-tools/pilot-exposure.json 2>/dev/null || echo '{"bNewClean":0,"bD540Clean":0,"aLandsClean":0,"kindsOk":0,"games":0}'
metrics: pp = sh: cat var/j217-tools/pilot.json 2>/dev/null || echo '{"written":0,"namesOk":0,"hashesOk":0,"cfgOk":0,"bClean":0}'
metrics: gate = sh: cat var/j217-tools/gate.json 2>/dev/null || echo '{"written":0,"play":0}'
metrics: rc = sh: cat var/j217-tools/rec-pilot.json 2>/dev/null || echo '{"written":0,"games":0,"bad":-1,"ownTop":-1,"landSearched":-1,"landsWindows":-1}'
check: merged == 1
check: dst.ok == 1
check: dst.failures == 0
check: dst.checks >= 502
check: bst.ok == 1
check: bst.failures == 0
check: bst.checks >= 460
check: bb.ok == 1
check: pl.ok == 1
check: pl.present == 1
check: pl.cfgs_ok == 1
check: pl.literal_ok == 1
check: pl.hashes_ok == 1
check: pl.kinds_ok == 1
check: pl.distinct == 1
check: pl.b_ok == 1
check: sd.rc == 0
check: sd.count == 9
check: sd.exact == 1
check: sd.playersLinesOk == 1
check: sd.playersDel == 1
check: sd.onePlayer == 1
check: hb.ok == 1
check: hb.own == 725000000
check: hb.first == 725900000
check: hb.last == 725900599
check: est.ok == 1
check: est.cases == 8
check: est.passed == 8
check: st.ok == 1
check: st.cases == 50
check: st.passed == 50
check: rst.ok == 1
check: rst.cases == 14
check: sst.ok == 1
check: ost.ok == 1
check: gst.ok == 1
check: px.bNewClean == 1
check: px.aLandsClean == 1
check: px.kindsOk == 1
check: px.games == 4
check: pp.written == 1
check: pp.namesOk == 1
check: pp.hashesOk == 1
check: pp.cfgOk == 1
check: pp.bClean == 1
check: gate.written == 1
check: rc.written == 1
check: rc.bad == 0
check: rc.ownTop == 0
check: rc.landSearched == 0
check: rc.landsWindows == 0

The pilot asks only whether anything is broken; whether the match plays is the gate's:
- `merged`: the pinned commit is on `origin/main`;
- the build passes with the decision self-test at 0 failures and at least 502 checks, the ai-bench self-test at 0
  failures and at least 460 checks (its D540 and D544 lines kept in `d54x-selftest.txt`), and the ladder registry test
  passes;
- `bb`: B was resolved to one of D544 point 10's two players (an unresolved B line stops the pilot);
- `pl`: the four players resolve on this PC at their registered hashes (compared as strings), the new player's
  ai-bench config is exactly search-v3-declined-instant's plus `,stackwin=1,passwin=1,dactiv=1`, written out
  (`literal_ok`) and built (`cfgs_ok`), and B is at its hash and seat config (`b_ok`);
- `sd`: git answered, and since D543's merge the files changed under `bridge/src`, `tools/ai-ladder` and
  `tools/ai-bench` are exactly D544's nine, `players.json` one line out and one in per appended player plus one, its
  players D543's followed only by new players, the new one among them exactly once;
- `hb`: `hostBase('j217')` is 725,000,000, an empty folder's first match block 725,900,000 (the 600th 725,900,599),
  and the pilot's host name has another base;
- the readers: the exposure reader on 8 synthetic folders (`est`), the verdict on 50 synthetic cases (`st`: each
  reading at and either side of its bars against each B; the three descriptions with an end at exactly 0; a measured
  loss removing the union; INCONCLUSIVE AT 4,800 with a wider interval than planned; NOT READ for the union at 1,199
  changes and read at exactly 1,200, under the rate with a SHOWN line; a key under its floor named unexposed and
  deciding nothing, and each floor met at exactly its bar; NOT PLAYED with its reason; B unresolved or a third player;
  a B new-key counter above 0 at any rate and under the rate, B's D540 counters clean for search-v3-declined-instant
  and dirty for the live seat, an A lands counter above 0, a stopped match and a match cut short and under the rate
  all INCOMPLETE and never NOT READ; 4,799 games, 241 errors and timeouts, a missing end, a line on the dev set or
  with no set, swapped players, the other
  B, other hashes, a block searched or attacks not searched, absent, short, other (J215's, J216's, the pilot host's)
  or shared block files, other seat configs, absent or other exposure files, all INCOMPLETE; the cost and the exposure
  that never change a reading), the recording reader on 14 synthetic checks (`rst`), and the block, rollout and gate
  readers on synthetic files (`sst`, `ost`, `gst`);
- in 4 games against B: the names, hashes and seat configs are A's and B's, every batch line carried both seat
  configs exactly, both sides searched priority and attacks and neither a block (`kindsOk`), B's new-key counters are
  all 0 and, when B is the live seat, its D540 counters too (`bClean`), and A's lands counters are all 0
  (`aLandsClean`): any of them stops the night;
- in 4 recorded games against Forge Default: the logs read, no searched priority decision on a stack whose top item
  is the seat's own (`ownTop`), none in a land window (`landSearched`) and no lands window in A's bench counters
  (`landsWindows`): a key that fires in a window it does not own stops the night.

Read, not checked: each key's windows, candidates, changes and retries in the 8 pilot games, the refusals by reason,
the recorded searched windows by class (own main, stack, instant-speed or pass window), their ms by candidate count,
and A's and B's search seconds a game (`pilot.json`); D544 point 20's 24-26 s for A is the yardstick. The gate
(`gate.json`) decides whether the match plays; a match it keeps out is not a pilot failure.

## Commands
cores: 7
clean: var/ai-ladder/match-J217.json var/j217-ladder
```bash
# the match: search-v3-wide (b95340935592) against D544 point 10's B, 4,800 games on the confirm set, in a ladder
# folder of its own under --host j217, emptied here (so a restart replays the same blocks), so it is dealt blocks
# 725,900,000-725,900,599. EXACTLY ONE of the two match lines below is uncommented, the same B as the pilot's B block
# (b.json); this step refuses to play when they disagree.
test -f var/j217-tools/verdict.mjs
test -f var/j217-tools/gate.json
test -f var/j217-tools/b.json
mkdir -p var/j217
rm -rf var/j217-ladder var/ai-ladder/match-J217.json
if ! node -e 'const g=require("./var/j217-tools/gate.json");process.exit(g.play===1?0:1)'; then
  node -e 'const g=require("./var/j217-tools/gate.json");require("fs").writeFileSync("var/ai-ladder/match-J217.json",JSON.stringify({notPlayed:true,reason:g.reason||"the gate did not pass",played:0,complete:false,errors:0,timeouts:0,score:0,lo:0,hi:0,elo:0,eloLo:0,eloHi:0})+"\n")'
  echo "J217: search-v3-wide not played (the pilot's gate)"; exit 0
fi
MATCH_B=search-v3-declined-instant    # D543's recommendation STANDS (J216's read, 2026-11-13: SMALL GAIN alone)
# MATCH_B=search-v2-no-b               # D543's recommendation WITHDRAWN or OPEN (J216's read)
node -e 'const b=require("./var/j217-tools/b.json");if(b.ok!==1||b.name!==process.argv[1]){console.error("J217: the match step names B "+process.argv[1]+", the pilot resolved "+b.name);process.exit(1)}' "$MATCH_B"
echo "J217: search-v3-wide against $MATCH_B, 4,800 games on the confirm set, blocks 725,900,000-725,900,599"
./tools/ai-ladder.sh match search-v3-wide "$MATCH_B" --host j217 --dir var/j217-ladder --games 4800 --hours 13.5 --game-timeout 900 --out var/ai-ladder/match-J217.json --jobs {workers}
tail -1 var/j217-ladder/match.jsonl
```
cores: 1
clean: var/j217/verdict.json var/j217/v.json var/j217/report.md var/j217/exposure.json var/j217/rollouts.json var/j217/seeds.json
```bash
# the pre-registered reading: the match's blocks, rollouts and exposure, the verdict, and report.md (numbers only;
# the PC session writes the summary beside it). Nothing here plays a game; a reading is never a failure.
test -f var/j217-tools/verdict.mjs
mkdir -p var/j217
node var/j217-tools/rollouts.cjs var/j217-ladder var/ai-ladder/match-J217.json var/j217/rollouts.json > /dev/null
node var/j217-tools/seeds.cjs var/j217-ladder var/ai-ladder/match-J217.json var/j217/seeds.json
node var/j217-tools/exposure.cjs var/j217-ladder var/ai-ladder/match-J217.json var/j217/exposure.json > /dev/null
node var/j217-tools/verdict.mjs var/ai-ladder/match-J217.json var/j217 var/j217/verdict.json var/j217-tools/b.json > /dev/null
# the checks' copy: the verdict's numbers only (every value a number; strings, nulls and the description detail dropped)
node -e 'const fs=require("fs");const v=JSON.parse(fs.readFileSync("var/j217/verdict.json","utf8"));const out={};for(const [k,x] of Object.entries(v)){if(typeof x==="number")out[k]=x}fs.writeFileSync("var/j217/v.json",JSON.stringify(out)+"\n");console.log(JSON.stringify(out))'
node - <<'J217EOF'
// J217's report: the job's own numbers (D544 points 10 to 15 and 18), nothing worded beyond them.
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const v = read('var/j217/verdict.json'), m = read('var/ai-ladder/match-J217.json'), bs = read('var/j217/seeds.json');
const g = read('var/j217-tools/gate.json'), rc = read('var/j217-tools/rec-pilot.json'), pp = read('var/j217-tools/pilot.json');
const b = read('var/j217-tools/b.json');
const h = v.desc || {};
const d = (x) => (x === null || x === undefined ? '-' : x);
const pct = (x, n = 1) => (typeof x === 'number' ? `${(x * 100).toFixed(n)}%` : '-');
const x = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(m.id || '');
const t0 = x ? Date.UTC(+x[1], +x[2] - 1, +x[3], +x[4], +x[5], +x[6]) : null, t1 = typeof m.at === 'string' ? Date.parse(m.at) : null;
const hours = t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null;
const L = [`# J217: search-v3-wide against ${d(b.name)} (${b.isLive === 1 ? 'the live seat' : "search-v3-declined-instant, D541's pair"}), 4,800 games (D398; D544; D519's four readings)`, ''];
L.push(`B is ${d(b.name)} (${d(b.hash)}) by D544 point 10: ${d(b.why)}.`, '');
L.push('**Outcome under the pre-registered rule (D544 points 12 to 15):**', '', `- ${d(v.line)}`, '');
L.push(`**Live-seat candidate for the owner (SHOWN or SMALL GAIN):** ${d(v.liveSeatCandidate)}. **The union closed (NOT SHOWN):** ${d(v.unionClosed)}. **The union removed (a measured loss):** ${d(v.unionRemoved)}. **NOT READ:** ${d(v.notRead)}. **NOT PLAYED:** ${d(v.notPlayed)}. **INCOMPLETE (owed a repost):** ${d(v.incomplete)}. **The live seat:** unchanged by this job (liveSeatChanged ${d(v.liveSeatChanged)}).`, '');
L.push('| match | played / planned | complete | outcome | described | score [95%] | Elo [95%] | pairs | draws, errors, timeouts | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|');
if (m.notPlayed === true) L.push(`| search-v3-wide | not played | - | NOT PLAYED | - | - | - | - | - | - |`);
else L.push(`| ${d(m.a)} vs ${d(m.b)} | ${d(m.played)} / ${d(m.planned)} | ${d(m.complete)} | ${d(v.outcome)} | ${d(v.word)} | ${d(m.score)} [${d(m.lo)}, ${d(m.hi)}] | ${d(m.elo)} [${d(m.eloLo)}, ${d(m.eloHi)}] | ${d(m.pairs)} | ${d(m.draws)}, ${d(m.errors)}, ${d(m.timeouts)} | ${d(hours)} |`);
L.push('', "Beside it, never pooled and never read against it (D544 point 17): J215, search-v3-declined-instant against search-v2-no-b on blocks 519,900,000-519,900,599, SMALL GAIN, +6.9 Elo [+1.4, +12.5]; J216, the same pair on the dev set, as D543 read it.", '');
L.push('**The exposure, the three keys (D544 point 13; the union\'s changes decide NOT READ, a key under its floor is named unexposed, the rest is description; on every match it was read on, a cut-short one included):**', '');
L.push('| key | games read | windows | a game | floor | at the floor | candidates | a window | changed | a game | retries | a game |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [k, f] of [['stackwin', 0.25], ['passwin', 0.1], ['dactiv', 0.25]]) {
  L.push(`| ${k} | ${d(v.exGames)} | ${d(v[`${k}Windows`])} | ${d(v[`${k}WindowsPerGame`])} | ${f} | ${v[`${k}Floor`] === 1 ? 'yes' : 'no'} | ${d(v[`${k}Cands`])} | ${d(v[`${k}CandsPerWindow`])} | ${d(v[`${k}Changed`])} | ${d(v[`${k}ChangedPerGame`])} | ${d(v[`${k}Retry`])} | ${d(v[`${k}RetryPerGame`])} |`);
}
const reasons = Object.entries(v.refusedReasons || {}).map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
L.push('', `The union: ${d(v.unionChanged)} changed decisions, ${d(v.unionChangedPerGame)} a game (0.25 is the rate; read: ${v.exposed === 1 ? 'yes' : 'no'}). Stack windows refused ${d(v.refused)}, a share of ${d(v.refusalShare)} of those met, by reason: ${reasons}. Aims at the seat's own stack item dropped ${d(v.ownAim)}; equips aimed at their host dropped ${d(v.sameHost)}; declined activations listed ${d(v.dactivListed)}; memory sets put back ${d(v.memoryRestored)}; windows the opponent had passed in: stack ${d(v.stackwinOppPassed)}, pass ${d(v.passwinOppPassed)}; declined spells in instant-speed windows (D541's review) ${d(v.declinedInstantWindows)} (A's search.p.declined.* counters include the stack and pass windows, which list the aimed declined spells whether or not declined is on, so they are never compared with B's). Changes: stackwin's and passwin's count every change in their window, a switch to pass included; dactiv's only a pick of a widened activation. B's D544 counters above 0: ${d(v.bNew)}; B's D540 counters above 0: ${d(v.bD540)} (${b.isLive === 1 ? 'must be 0: B is the live seat' : 'B\'s own keys'}). A's lands counters above 0: ${d(v.aLands)}.`, '');
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
L.push('', `Rule parts: B resolved ${d(v.bResolved)}, names ${d(v.names)}, the confirm set ${d(v.setOk)} (line set ${d(v.set)}), hashes ${d(v.hashes)}, seat configs ${d(v.cfgs)}, the registered blocks ${d(v.blocks)} (${d(bs.blocks)} blocks ${d(bs.min)} to ${d(bs.max)}, ${d(bs.games)} games, ${d(bs.otherGames)} of another match), priority and attacks searched and no block on both sides ${d(v.kindsOk)}, the exposure read on this match ${d(v.exposureRead)}, B clean ${d(v.bClean)}, A's lands counters clean ${d(v.aLandsClean)}, the union at the rate ${d(v.exposed)}; complete ${d(v.complete)}. SHOWN ${d(v.shown)}, SMALL GAIN ${d(v.smallGain)}, INCONCLUSIVE AT 4,800 ${d(v.inconclusive4800)}, NOT SHOWN ${d(v.notShown)}, NOT READ ${d(v.notRead)}, NOT PLAYED ${d(v.notPlayed)}, INCOMPLETE ${d(v.incomplete)}. Described: indistinguishable ${d(v.indistinguishable)}, a measured loss ${d(v.measuredLoss)}, a measured gain ${d(v.measuredGain)}. Match id ${d(m.id)}, host ${d(m.host)}, set ${d(m.set)}.`);
L.push('', '## The pilot (D544 point 19): the gate and the recorded windows', '');
L.push(`The gate: ${g.play === 1 ? 'played' : `not played: ${d(g.reason)}`}.`, '');
L.push('| games (ladder + recorded) | stackwin windows (ladder + recorded) | passwin windows | dactiv windows | refused (share) | errors and timeouts | retries, three keys (a game) | recorded searched p: own main / stack / instant or pass / land | own item on top | ms by candidate count (decisions) | ladder search s a game A / B |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
const mb = Object.entries(rc.msByCands || {}).map(([c, o]) => `${c}: ${o.msMean} (${o.n})`).join('; ') || '-';
L.push(`| ${d(g.ladderGames)} + ${d(g.benchGames)} | ${d(g.ladderStackwinWindows)} + ${d(g.benchStackwinWindows)} | ${d(g.ladderPasswinWindows)} + ${d(g.benchPasswinWindows)} | ${d(g.ladderDactivWindows)} + ${d(g.benchDactivWindows)} | ${d(g.refused)} (${d(g.refusalShare)}) | ${d(g.errorsTimeouts)} | ${d(g.retry)} (${d(g.retryPerGame)}) | ${d(rc.ownMainSearched)} / ${d(rc.stackSearched)} / ${d(rc.instantSearched)} / ${d(rc.landSearched)} | ${d(rc.ownTop)} | ${mb} | ${d(pp.aSecPerGame)} / ${d(pp.bSecPerGame)} |`);
fs.mkdirSync('var/j217', { recursive: true });
fs.writeFileSync('var/j217/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J217EOF
```
The verdict (`verdict.mjs`, J215's made D544's: B read from the pilot's `b.json` and checked against point 10's two
players, the names, hashes, blocks 725,900,000-725,900,599 and seat configs D544's, the bar 240, the three keys'
exposure and the union's changes, B's new-key counters always and its D540 counters when it is the live seat, and A's
lands counters, as the keys-off checks) gives the match exactly one outcome, in this precedence: NOT PLAYED when the
pilot's gate kept it out (with the gate's reason); INCOMPLETE when any part of D544 point 12's completeness fails, B
unresolved, a B that shows a keys-off counter above 0 or an A that shows a lands counter above 0 among them (no
reading, and not NOT READ either, whatever the rate); NOT READ when every other part holds but the three keys
together changed fewer than 0.25 decisions a game played (under 1,200 at 4,800); else one of D519's four readings,
compared in integers as the line carries them. It writes `v.json` with the completeness parts (bResolved, names,
hashes, blocks, cfgs, kindsOk, exposureRead, bClean, aLandsClean, exposed), exactly one of shown / smallGain /
inconclusive4800 / notShown / notRead / notPlayed / incomplete, exactly one description for a complete match,
`liveSeatCandidate` (SHOWN or SMALL GAIN), `unionClosed` (NOT SHOWN), `unionRemoved` (a measured loss), each key's
exposure and floor, the union's changes, the refusals, the cost, `bIsLive`, and `liveSeatChanged` 0.
check: v.written == 1
check: v.liveSeatChanged == 0
check: v.incomplete == 0
check: v.complete + v.notRead + v.notPlayed == 1
check: v.shown + v.smallGain + v.inconclusive4800 + v.notShown + v.notRead + v.notPlayed == 1
check: v.shown + v.smallGain + v.inconclusive4800 + v.notShown == v.complete
check: v.indistinguishable + v.measuredLoss + v.measuredGain == v.complete
check: v.liveSeatCandidate == v.shown + v.smallGain
check: v.unionClosed == v.notShown
check: v.unionRemoved == v.measuredLoss
check: v.notPlayed == 0 or cm.played == 0
check: v.complete + v.notRead == 0 or (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240)
check: v.complete + v.notRead == 0 or (bs.blocks == 600 and bs.min == 725900000 and bs.max == 725900599 and bs.games == 4800 and bs.otherGames == 0)
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
match has exactly one reading and one description, the candidate flag is exactly SHOWN or SMALL GAIN, the union
closes exactly on NOT SHOWN and is removed exactly on a measured loss; the four readings and the two descriptions
agree with the match line in the runner's own language; the live seat is unchanged. Any reading passes them, and so
do NOT READ and NOT PLAYED: they are outcomes D544 registered, not failures. If the match is cut short (its own stop
at 13.5 h, or a memory stop the runner retries from the match's block, which empties the folder and replays the same
blocks), or is incomplete for any other reason (a B that shows a keys-off counter above 0 or an A that shows a lands
counter above 0 among them: a keys-off path fired, a code fault, so the player is reposted, never retired for it), it
is INCOMPLETE and the job fails on its checks; the report is still written, and what is owed is a repost alone under
a new job id after its cause is found, not a reading of a cut match. A match both cut short and under the exposure
rate is INCOMPLETE, not NOT READ. A NOT READ match is reported with every rate and is not played again without a new
decision; no repost is owed.

## Abort if
abort: j217_err >= 30 and j217_err > j217_games / 10

Engine trouble only: once 30 games of the match have ended in an engine error or a timeout, the job stops if they are
more than one in ten. The match has no stopping rule on the score.

## Report
collect: var/ai-ladder/match-J217.json
collect: var/j217/verdict.json
collect: var/j217/report.md
collect: var/j217/exposure.json
collect: var/j217/rollouts.json
collect: var/j217/seeds.json
collect: var/j217-tools/b.json
collect: var/j217-tools/d54x-selftest.txt
collect: var/j217-tools/gate.json
collect: var/j217-tools/pilot.json
collect: var/j217-tools/pilot-exposure.json
collect: var/j217-tools/rec-pilot.json

`report.md` is the job's own numbers. The PC session writes `summary.md` from it:
- **the answer first:** whether the search plays better when it also answers on the stack, in the three steps where
  Forge passes and with the sorcery-speed activations Forge declines, in one sentence a person can act on: the
  outcome under D544's rule (SHOWN, SMALL GAIN, INCONCLUSIVE AT 4,800 or NOT SHOWN; or NOT READ with every rate; or
  NOT PLAYED with the gate's reason; or INCOMPLETE, owed a repost, with its cause) with the score and Elo interval
  against B and the describing word, and what B was and why (D544 point 10: against search-v3-declined-instant the
  three keys' increment, against the live seat the union with D541's keys); for SHOWN or SMALL GAIN, that it names a
  live-seat candidate for the owner under a separate decision and a seat-queue row, with the cost beside it, and that
  this job changes nothing; for NOT SHOWN, that the three keys close as a union on the confirm set, that the union is
  shown to be worth less than the interval's upper end, not nothing, and which keys' per-key changes would need to
  grow toward 0.5 a game for one to be read alone; for a measured loss, that the union is removed;
- **what it does not say:** which key carried it (no ablation), that the carry was faithful in a window it accepted
  (the refusals and the self-tests bound it; D544's *What is unverified*), and anything about J215's or J216's
  matches, which stay beside it as they were and are never pooled;
- **the exposure and the cost:** each key's windows a game against its floor (an unexposed key is named and not
  judged), candidates a window, changes a game and retries a game (a retry is a widened pick that did not happen, and
  it counts against the player uncorrected); the union's changes a game; the stack windows refused, their share and
  their reasons; the own-stack aims and same-host equips dropped and the memory sets put back; search seconds a game
  on each side and their ratio, ms a searched decision; the pilot's recorded windows by class;
- **the opponent's pass:** the sentence D544 point 6 asks for: in D544's windows where the opponent had already passed,
  the rollouts gave it a conditional pass, so those windows carry no lean toward passing; J215's instant arm carried
  that lean and this player's instant windows still do;
- **the run:** draws, errors and timeouts, the deal blocks (725,900,000-725,900,599, new to every job), the match's
  hours against the 10 h estimate, the pressure events in STATUS and any block the runner retried, and that it ran
  alone (D521).

Never write "no effect", "no gain" or "no cost" for an interval that includes 0. The match is read against B and
never against J215's or J216's lines.
