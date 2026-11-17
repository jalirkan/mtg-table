id: J223
title: The combination on the confirm set, against the wide seat (D551): one fixed 4,800-game match (2,400 mirrored pairs, D398, the confirm set tools/ai-bench/pairs-confirm.txt, no stopping rule) of search-v3-wide-t1-x2 (709c83cc4d48, D549's player: search-v3-wide's params with turns=1 and budgetMs=3000) against search-v3-wide (b95340935592, D544's player, the live seat since D550 merged), so the deeper horizon and the doubled clock together with the wide windows on both sides, in a ladder folder of its own under --host j223 on deal blocks no job has played, 405,900,000-405,900,599, at --game-timeout 3600, read by D519's four readings at 4,800 games with D549's completeness parts (B's keys-off part replaced by B's windows above 0) and exposure condition; a SHOWN or SMALL GAIN is the PC session's recommendation to the owner of a 3 s live seat, search-v3-wide-t1-x2. Never pooled with J217, J218, J220, J221 or J222. This job never changes the live seat
public_title: The deeper search at twice the clock against the live seat: 4,800 games
public_est: ~16 h (one day)
public_decides: Whether the live search AI should think one turn deeper at a 3 s clock
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
alone: yes
repos: mtg-table@2802940e7efdb785d55bc5b2849f00a2882b82fc (the merge commit of D551's lane, pc/d551-confirm-wide-deep, on main, after D550's merge bfa3c6a01 (lane pc/live-seat-wide, its code cc417e4d1's) on J222's pin 6fd2e726df2c90952aae455a2cb901261c5d676d. D551 is text only: docs/decisions/D551-confirm-wide-deep.md and PLAN's rows; no file under bridge/src, tools/ai-bench or tools/ai-ladder. The pilot checks by content that, against J222's pin, the files changed under bridge/src, tools/ai-ladder and tools/ai-bench are exactly D550's six, that their changed lines that are not comments are exactly the two live-seat constants and the start line's words before and after (read only by parseLive, which no ladder seat goes through), that players.json changes two notes and no name, kind or params and adds no player, and that from J220's pin 847e50a29ae5ca3240d41a2cf68567e434fbdea9 to J222's only players.json changed, so J220, J221, J222 and J223 play one search code, D551 point 2)
decides: D551 points 4 to 7, from the match line, its result rows and its batch counters alone. A complete match that is not NOT READ reads exactly one of D519's four readings at 4,800 games: SHOWN (lo > 0.5 and elo >= +15), SMALL GAIN (lo > 0.5 and elo < +15), INCONCLUSIVE AT 4,800 (lo <= 0.5 and eloHi >= +15), NOT SHOWN (lo <= 0.5 and eloHi < +15); complete includes the line's and every row's set being tools/ai-bench/pairs-confirm.txt, the rows' mirrored pairs reproducing the line, B's stack and declined-activation windows each above 0 over the match, neither side with a lands counter above 0, and A's ms of play a finished rollout at least 1.3 times B's. NOT READ when A's three window keys together changed fewer than 0.25 decisions a game; INCOMPLETE for any other failed part (owed a repost alone under a new job id, except a valid-looking match whose trace alone is under 1.3: owed a new decision, never a repost unchanged); NOT PLAYED when the pilot's gate kept the match out. SHOWN or SMALL GAIN: RECOMMEND, the PC session recommends to the owner that the live seat become search-v3-wide-t1-x2 at a 3 s clock (the clock and the adoption are the owner's, under a later decision); INCONCLUSIVE AT 4,800 or NOT SHOWN: STAYS, search-v3-wide stays the live seat and the 3 s clock is not recommended; no reading: OPEN. This job never changes the live seat
hypothesis: registered as information before any game (D551's hypothesis; no check reads it). A against B is the deeper horizon and the doubled clock with the wide windows on both sides. If the horizon's gain over the pair carries over on top of the windows, about +14 Elo (J220's +14.2 on this set); J222's +20.7 less the windows' pooled +5.3 is about +15.4 (never computed as a check). With J220's pair standard error on the confirm set (0.0046966; SMALL GAIN needs a point above about +6.4) and J217's in brackets (0.0040138, +5.5), by the normal approximation, SHOWN or SMALL GAIN: a true 0 2.5% [2.5%]; +5 33.4% [43.4%]; +10 86.5% [94.8%]; +14.2 99.2% [99.9%], of which SHOWN 40.3% [38.7%]; +15.4 99.7% [100%], SHOWN 54.9% [55.7%]; +20.7 100% [100%], SHOWN 95.9% [97.9%]
rule: D551 points 4 to 7, merged before any J223 game was played (written 2026-11-17 after J222's read), in their words (the decision's bold dropped, its lists set as sentences): "Complete when D549 point 4's parts hold with this match's names, hashes, set and blocks (the confirm set, the rebuilt pairs, neither side with a search.p.lands. counter above 0, A's ms of play a finished rollout at least 1.3 times B's), with one part replaced, because B is wide: in place of D548 point 5's 'B's batch counters show no search.p.stackwin., search.p.passwin., search.p.dactiv. or search.wide. counter above 0' (B's keys-off path, which B no longer has), B's search.p.stackwin.windows and search.p.dactiv.windows, summed over the match's batch lines, are each above 0 ... A valid-looking match under the trace's bar is INCOMPLETE and owed a new decision, never a repost unchanged (D547 point 3); any other incomplete match is owed a repost alone under a new job id after its cause is found. NOT READ as D549 point 5, on A's side: no reading when A's three keys changed fewer than 0.25 decisions a game together (changed x 4 < played) ... Not played on the confirm set again without a new decision. The readings, written before any game, D519's four at 4,800 ... for a complete match that is not NOT READ (lo in integer ten-thousandths, Elo in integer tenths): SHOWN lo > 0.5 and elo >= +15; SMALL GAIN lo > 0.5 and elo < +15; INCONCLUSIVE AT 4,800 lo <= 0.5 and eloHi >= +15; NOT SHOWN lo <= 0.5 and eloHi < +15. Beside it, deciding nothing: indistinguishable, a measured loss, a measured gain. What it decides: the PC session's recommendation to the owner. It amends D549 point 7. SHOWN or SMALL GAIN, RECOMMEND: the PC session recommends to the owner that the live seat become search-v3-wide-t1-x2 at a 3 s clock, with this match's point, interval and cost (search seconds a game, ms a searched decision) beside J222's. The clock at the table is the owner's to decide; the adoption is a later decision with its own lane (D550's form), and nothing moves here. INCONCLUSIVE AT 4,800 or NOT SHOWN, STAYS: search-v3-wide stays the live seat, and the PC session does not recommend the 3 s clock ... No reading (NOT PLAYED, NOT READ, INCOMPLETE), OPEN: nothing recommended and nothing withdrawn; search-v3-wide stays the live seat ... This match moves no seat." The players: A = search-v3-wide-t1-x2 (709c83cc4d48), B = search-v3-wide (b95340935592), fixed (D551 point 1). Timed-out games count as the rows record them; the pairs reader's toLoss decides nothing (D548 point 5)
followup: morning-read
est: ~16 h at 7 workers (an estimate; range 15-18.5 h), 31.4 h at worst for one attempt (the pilot and the match's own stop). From this host at 7 workers, alone, a 1,200-game match takes about 0.47 h + 0.0436 h x both sides' search seconds a game (D537 point 11's fit; residual sd 0.15 h), read at four times the games (J220 14.48 h against its 14.58, alone and unpressed; J222 18.31 h against its 15.84, with 30 memory-pressure drops and raises between 4 and 7 workers while the scenery GPU job shared the machine's memory). B about 23.5 s a game on the confirm set (J217's A, the same config); A about 56.3-56.9 s (J220's A, 51.9 s, times J217's x1.0855 for the wide windows; or J222's A, 58.5 s, times the pair's confirm-to-dev ratio 20.9/21.5), so both sides about 80 s a game: 15.8 h by the fit; about 18.5 h if memory pressure holds it at 6 workers. Pilot about 20-25 minutes. The match stops itself at --hours 29 under the step's 31 h timeout: the ladder starts a batch only while its expected time fits before the stop, so the 2 h left is for a batch already running when the stop comes, one game at the 3,600 s cap and its 30 s grace beside the batch's others. A memory-stop retry is a new attempt with the whole budget again (the runner restarts the step's elapsed count at every unit start, and the ladder's --hours counts from its own start), one worker fewer, replaying the match from its first block: a full replay fits at 5 workers (about 22.2 h) and at 4 (about 27.7 h by the fit, 28.7 h at J218's excess over it); the job then holds the machine for both attempts together, and the third memory stop fails it. A match that reaches its own stop reports complete: false and gets no reading
resumable: no
timeout: 31h
clean: var/j223 var/j223-tools var/j223-ladder var/ai-ladder-pilot/J223 var/ai-ladder/match-J223.json var/ai-bench/j223-pilot-rec
progress: metric j223_games games of 4800
metrics: j223_games = sh: node -e 'const fs=require("fs");const f="var/j223-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v3-wide-t1-x2\"")&&l.includes("\"b\":\"search-v3-wide\""))n++;console.log(n)'
metrics: j223_err = sh: node -e 'const fs=require("fs");const f="var/j223-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v3-wide-t1-x2\"")&&l.includes("\"b\":\"search-v3-wide\"")&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cm = sh: cat var/ai-ladder/match-J223.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: bs = sh: cat var/j223/seeds.json 2>/dev/null || echo '{"games":0,"blocks":0,"min":0,"max":0,"fullBlocks":0,"otherGames":-1,"offSet":-1,"registered":0}'
metrics: v = sh: cat var/j223/v.json 2>/dev/null || echo '{"written":0,"complete":0,"incomplete":1,"notRead":0,"notPlayed":0,"shown":0,"smallGain":0,"inconclusive4800":0,"notShown":0,"aloneGain":0,"indistinguishable":0,"measuredLoss":0,"measuredGain":0,"liveSeatChanged":1,"recDeep":0,"recStay":0,"recOpen":0,"horizonTrace":0,"landsClean":0,"bWide":0,"owedDecision":0,"playMsRatio":0,"aRolloutsPerDecision":0,"bRolloutsPerDecision":0,"aShortShare":0,"bShortShare":0,"stackwinWindowsPerGame":0,"passwinWindowsPerGame":0,"dactivWindowsPerGame":0,"unionChangedPerGame":0,"bStackwinWindowsPerGame":0,"bDactivWindowsPerGame":0,"bUnionChangedPerGame":0,"refusalShare":0,"aSecPerGame":0,"bSecPerGame":0,"costRatio":0,"noCost":0}'
headline: cm.played, cm.score, cm.lo, cm.hi, cm.elo, cm.eloLo, cm.eloHi, v.shown, v.smallGain, v.inconclusive4800, v.notShown, v.notRead, v.notPlayed, v.incomplete, v.indistinguishable, v.measuredLoss, v.measuredGain, v.recDeep, v.recStay, v.recOpen, v.owedDecision, v.playMsRatio, v.aRolloutsPerDecision, v.bRolloutsPerDecision, v.aShortShare, v.bShortShare, v.stackwinWindowsPerGame, v.passwinWindowsPerGame, v.dactivWindowsPerGame, v.unionChangedPerGame, v.bStackwinWindowsPerGame, v.bDactivWindowsPerGame, v.bUnionChangedPerGame, v.refusalShare, v.aSecPerGame, v.bSecPerGame, v.costRatio, v.noCost, bs.min, bs.max

**Why this job** (D551; J222, J217, J220). J222 read `search-v3-wide-t1-x2` (the search answering on the stack, in
three steps where Forge passes and with the sorcery-speed activations Forge declines, rolled out one turn further at
twice the clock) SHOWN against the old live seat on the dev set, +20.7 Elo [+14.1, +27.3] at x2.72 the search time.
D550 makes `search-v3-wide`, the same search at the 1.5 s clock and the old horizon, the live seat. Nobody has played
the two against each other, and a seat change reads the confirm set (D318). This night plays them on the confirm set
(`tools/ai-bench/pairs-confirm.txt`, the ladder's default). Its reading fixes whether the PC session recommends to the
owner that the live seat move to the deeper search at a 3 s clock.

**What it does not do.** It does not change the live seat, adopt anything, tune anything, pool any games, separate
the horizon from the clock (A differs from B by both), read J223's point against J222's or the parts' as a
difference, say which key or which depth carried a reading, or read any outcome by deck or by deal. It never pools with
or reads against J217, J218, J220, J221 or J222 (D551 point 8); their numbers are described beside it as they were.

**What is played.** One `ai-ladder.sh match`: 4,800 games, 2,400 mirrored pairs in 600 batches of 8 on the confirm
deck set (`--pairs tools/ai-bench/pairs-confirm.txt`), no stopping rule on the score (D398), at `--game-timeout 3600`:
- A = `search-v3-wide-t1-x2` (`709c83cc4d48`):
  `Default+outlets+search:ms=3000,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1`;
- B = `search-v3-wide` (`b95340935592`, D544's player, the live seat since D550 merged; the ladder plays it by name and
  hash through `SearchConfig.parse`, never `parseLive`):
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1`.

A's seat config is B's with `ms=1500` made `ms=3000` and `turns=0` made `turns=1` and nothing else. A's `aturns` is
unset, so its attack rollouts follow `turns=1` (`SearchConfig.horizonFor`), and every searched priority decision, the
stack and pass windows among them, rolls out one turn further; `what=pa`, so neither side searches a block. B is
fixed, written once as a constant in each place that names it. Every row and the match line carry `set:
"tools/ai-bench/pairs-confirm.txt"`. The game timeout is 3,600 s: J222's longest game ran 1,113 s at this match's
thinking (both sides about 80 s a game) on the dev set; J220's longest on the confirm set 492 s; J217's one timeout on
the confirm set, a game cut at 930 s at both sides' 45.1 s a game, would run at least about 1,650 s scaled by both
sides' thinking; so that the cap cuts only a stuck game is an estimate (D551 point 11).

**The deals** (D551 point 3). The match runs with `--host j223` in a ladder folder of its own, `var/j223-ladder`,
emptied by its step before it starts, so it takes the 600 blocks **405,900,000-405,900,599** (`hostBase('j223')` is
405,000,000; an emptied folder's first match block is its base plus 900,000, `nextBseed`) on a first run and on a
retry after a memory stop. These blocks are new: of the 389,092 ladder result rows under the lab checkout's `var/` on
2026-11-17 (the other three lab checkouts' `var/` are links to it; the rows lie on 42 bases) and the 348 under this
machine's `mtg-table*` checkouts' `var/`, none is on base 405 or on the pilot host's base, and none names a `j223`
host; no job file in this folder or in `drafts/` names `j223` or a block on either base. The pilot host is
`j223-pilot3`, base 548,000,000, whose first block, 548,900,000, deals the confirm set's `synergy-900000001` (pair 20)
at one batch pair (`j223-pilot` and `j223-pilot2` would deal `fair-fight-900000001`, pair 0, where declined
activations opened in 0.200 of J217's games against 0.506 here, D551 point 3). 600 consecutive blocks give each of the
confirm set's 30 deck pairs exactly 40 batches, 160 games, in both seat orders (`batchPairs`). The block reader checks
the range and the set after the match and the verdict refuses any other.

**The readings** (D551 points 4 to 6): D519's four at 4,800 games, exactly one for a complete match that is not NOT
READ; NOT READ when the match is complete in every other part but A's three window keys together changed fewer than
0.25 decisions a game (1,200 at 4,800); INCOMPLETE for anything else (a set other than the confirm set, pairs that do
not reproduce the line, B's stack or declined-activation windows at 0 over the match, a lands counter above 0 on
either side, or A's rollouts under 1.3 times B's in play time among them). A valid-looking match whose trace alone is
under 1.3 is owed a new decision saying what was wrong, never a repost unchanged; any other INCOMPLETE match is owed a
repost alone under a new job id after its cause is found. A key of A's under its floor (stackwin 0.25, passwin 0.10,
dactiv 0.25 windows a game) is reported as unexposed and decides nothing. Beside the reading, deciding nothing:
indistinguishable, a measured loss or a measured gain.

**The recommendation** (D551 point 7, amending D549 point 7): SHOWN or SMALL GAIN, RECOMMEND: the PC session
recommends to the owner that the live seat become `search-v3-wide-t1-x2` at a 3 s clock, with this match's point,
interval and cost beside J222's (the clock and the adoption are the owner's, under a later decision); INCONCLUSIVE AT
4,800 or NOT SHOWN, STAYS: `search-v3-wide` stays the live seat and the 3 s clock is not recommended; no reading,
OPEN: nothing recommended, nothing withdrawn, `search-v3-wide` stays. A reading never separates the horizon from the
clock.

**Beside the reading, as description only** (D551 point 9): each of A's keys' windows a game, candidates a window,
changes a game and retries a game, and B's beside them (both sides search the wide windows), the stack windows refused
by reason and their share, and the rest of D548 point 12's list; rollouts and complete rounds a decision, the share
short of two rounds, budget fallbacks, ms of play and copy a rollout and the trace's ratio (D547 point 9); each side's
searched decisions by kind, ms a searched decision, search seconds a game, their ratio and D519 point 5's "no cost"
flag; priority overrides by direction; land windows left to Forge a game; the games per confirm deck pair; the
timeouts, and the score with every timed-out game counted as A's loss (`pairs.json`'s `toLoss`); and J222's, J217's
and J220's lines, costs and depth as they were.

**When it runs.** Alone (`alone: yes`, D521): both players think against a wall clock, and J220, J221 and J222 ran
alone too. After this lane's merge (D550 merged first, bfa3c6a01).

## Pilot
About 20-25 minutes:
- the pin is merged;
- the build (the lint and its self-test, javac, the decision self-test at 0 failures and exactly 526 checks, the count
  D550's lane build printed at `cc417e4d1` on 2026-11-17, this lane adding no source), the ai-bench self-test at 0
  failures and exactly 476 checks (the count J221's and J222's pilots read; nothing under `tools/ai-bench` changed
  since), its D540 and D544 lines kept in `var/j223-tools/d54x-selftest.txt` whatever they say, and the ladder
  registry test;
- `ai-ladder.sh list` resolves six players (the anchor, search-v2-no-b, search-v3-declined-instant, search-v3-wide,
  search-v3-declined-instant-t1-x2 and search-v3-wide-t1-x2) at their registered hashes, checked as strings, and A's
  seat config is exactly search-v3-declined-instant-t1-x2's plus `,stackwin=1,passwin=1,dactiv=1` and exactly B's
  (search-v3-wide's) with `ms=1500` made `ms=3000` and `turns=0` made `turns=1`;
- the code, by content (D551 point 2): against J222's pin `6fd2e726d` the files changed under `bridge/src`,
  `tools/ai-ladder` and `tools/ai-bench` are exactly D550's six; the changed lines of `SearchConfig.java`,
  `SearchPolicy.java`, `MtgTable.java` and `RecordMatch.java` that are not comments are exactly the two live-seat
  constants and the start line's words before and after; `players.json` is J222's pin's player for player with every
  field but `note` unchanged and no player added; between J220's pin `847e50a29` and J222's only `players.json`
  changed; and git answered;
- the `j223` host's seed base is 405,000,000, an empty folder's first match block 405,900,000, the pilot's host base
  548,000,000 (`j223-pilot3`) with its first block dealing `synergy-900000001` (confirm pair 20) at one batch pair, and
  the confirm set's 30 deck pairs get exactly 40 batches each from the 600 blocks;
- the exposure reader, the verdict (with the recommendation), the block, rollout, pairs and recording readers and the
  gate written, and each tested on synthetic files;
- one 4-game ladder match of A against B on the confirm set, one batch pair, one worker, in its own pilot folder under
  `--host j223-pilot3` (so on `synergy-900000001`): both sides search priority and attacks and no block, the match line
  names A and B at their hashes and the confirm set, the batch lines carry the two seat configs exactly, neither side's
  `search.p.lands.` counters are above 0 (either stops the night), B's three keys' windows are reported, and the pairs
  reader reproduces the line;
- one recorded run of 4 games against Forge Default on the confirm set's `modern-era-900000001`, chosen by name (two
  workers; D551 point 3: in J217's games it opened stack windows in 0.656 of them and declined activations in 0.700; the
  rates were read, the scores were not), whose decision records give each searched decision's horizon by kind and the
  searched priority decisions by window (own main, land, instant-speed or pass window, stack) with their ms by
  candidate count, printed, and checked only for what must hold: no searched priority decision on a stack whose top
  item is the seat's own (`ownTop`), none in a land window, and no `search.p.lands.` counter in A's bench lines;
- **the gate** (D551 point 10: D549 point 10's on A's side): the match is played only if, over the 4 ladder games and
  the 4 recorded games, **A's wide windows open** (A's `search.p.stackwin.windows` and `search.p.dactiv.windows` each
  above 0, `search.p.passwin.windows` reported and may be 0; A's three keys' retries together at most 2 a game; A's
  stack windows refused under half of those met, `refused / (refused + windows)` < 0.5) **and A's rollouts are
  deeper** (every searched priority and attack decision in A's records carries horizon 1, at least one of each and none
  another; A's ms of play a finished rollout in the 4 ladder games at least 1.3 times B's; at most 15% of A's searched
  decisions decided on fewer than 2 paired rounds), none of the 8 games ended in an engine error or a timeout, and A's
  `search.p.declined.retry` and `search.p.instant.retry` together are at most 2 a game. **What changed from D549's
  pilot, and why**: B is now `search-v3-wide`, so D549's "B's D544 counters all 0" night stop (`bClean`) is gone, B's
  keys being on by config; nothing new is gated in its place: B's config is held exactly by `pl` and by every batch
  line (`cfgOk`), and B's windows in the 4 ladder games are reported, not gated (at J217's rates on
  `synergy-900000001` a gate on them would keep a sound match out about 17% of the time; the match's completeness
  holds B's windows over 4,800 games instead). `var/j223-tools/gate.json` says whether the match plays and, if not, the
  condition it failed; the match step then writes `var/ai-ladder/match-J223.json` as `{"notPlayed": true, "reason":
  ...}` (with the match metrics' zeros beside it, so every metric reads a number), plays nothing, and the report says
  so (the recommendation OPEN). The gate is not a pilot failure. The pilot's longest game is reported beside it.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j223-merged.txt || echo 0 > var/j223-merged.txt
cat var/j223-merged.txt
rc=0; ./bridge/build.sh > var/j223-build.txt 2>&1 || rc=$?
cat var/j223-build.txt
# the build's decision self-test: its line, with 0 failures (526 on D550's lane build at cc417e4d1, 2026-11-17: D546's
# 514 and D550's 12; D551 changes no bridge source)
node -e 'const fs=require("fs");const t=fs.readFileSync("var/j223-build.txt","utf8");const m=/^decision selftest: (\d+) check\(s\), (\d+) failure\(s\)$/m.exec(t);const r={ok:m&&m[2]==="0"?1:0,checks:m?Number(m[1]):0,failures:m?Number(m[2]):-1};fs.writeFileSync("var/j223-decision-selftest.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
test "$rc" -eq 0
mkdir -p var/j223-tools
# the ai-bench self-test; its D540 and D544 lines are kept in d54x-selftest.txt whatever they say, then it must have
# passed (476 checks at J221's and J222's pins; tools/ai-bench is unchanged since by the code check below)
brc=0; ./tools/ai-bench.sh --selftest > var/j223-tools/bench-selftest.txt 2>&1 || brc=$?
grep -iE 'd54[04]' var/j223-tools/bench-selftest.txt > var/j223-tools/d54x-selftest.txt || true
cat var/j223-tools/d54x-selftest.txt
tail -3 var/j223-tools/bench-selftest.txt
node -e 'const fs=require("fs");const t=fs.readFileSync("var/j223-tools/bench-selftest.txt","utf8");const m=/^ai-bench selftest: (\d+) check\(s\), (\d+) failure\(s\)$/m.exec(t);const r={ok:m&&m[2]==="0"?1:0,checks:m?Number(m[1]):0,failures:m?Number(m[2]):-1};fs.writeFileSync("var/j223-tools/bench-selftest.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
test "$brc" -eq 0
node --test web/test/ai-ladder.test.ts
```
```bash
# six players resolve at their registered hashes (compared as strings); A's seat config is exactly
# search-v3-declined-instant-t1-x2's plus ,stackwin=1,passwin=1,dactiv=1, and B's (search-v3-wide's) with ms=3000 and
# turns=1 and nothing else (D551 point 1)
mkdir -p var/j223-tools
./tools/ai-ladder.sh list > var/j223-tools/players.txt
grep -E '^(forge-default|search-v2-no-b|search-v3-declined-instant|search-v3-wide|search-v3-declined-instant-t1-x2|search-v3-wide-t1-x2) ' var/j223-tools/players.txt || true
node - <<'J223EOF'
// J223's pilot (J222's players check, unchanged but for these lines): the players resolve, at their registered hashes
// (compared as strings), and search-v3-wide-t1-x2's seat config (A) is search-v3-declined-instant-t1-x2's with exactly
// ,stackwin=1,passwin=1,dactiv=1 appended and search-v3-wide's (B) with ms=3000 and turns=1 (D551 point 1).
const fs = require('fs');
const L = fs.readFileSync('var/j223-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const V3 = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1';
const PAIR = V3 + ',declined=1,instant=1';
const KEYS = ',stackwin=1,passwin=1,dactiv=1';
const X2 = PAIR.replace('ms=1500,', 'ms=3000,').replace('turns=0,', 'turns=1,');
const WANT = {
  'forge-default': { hash: '3ed453ffef1c', cfg: 'Default', kind: 'forge' },
  'search-v2-no-b': { hash: '59505e241363', cfg: V3, kind: 'search' },
  'search-v3-declined-instant': { hash: 'af6771947a25', cfg: PAIR, kind: 'search' },
  'search-v3-wide': { hash: 'b95340935592', cfg: PAIR + KEYS, kind: 'search' },
  'search-v3-declined-instant-t1-x2': { hash: '5319a60d7e3b', cfg: X2, kind: 'search' },
  'search-v3-wide-t1-x2': { hash: '709c83cc4d48', cfg: X2 + KEYS, kind: 'search' },
};
// the match's two seat configs (D551 point 1: A and B are search-v3-wide-t1-x2 and search-v3-wide) and the others',
// written out, so the building above cannot drift
const LITERAL = {
  'search-v3-declined-instant': 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1',
  'search-v3-wide': 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1',
  'search-v3-declined-instant-t1-x2': 'Default+outlets+search:ms=3000,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1',
  'search-v3-wide-t1-x2': 'Default+outlets+search:ms=3000,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1',
};
const r = { present: 0, cfgs_ok: 0, literal_ok: 0, hashes_ok: 0, kinds_ok: 0, distinct: 0, wideAtDepth: 0, hashes: {}, cfgs: {} };
const got = Object.fromEntries(Object.keys(WANT).map((n) => [n, get(n)]));
r.present = Object.values(got).every((p) => p && p.cfg) ? 1 : 0;
r.cfgs_ok = Object.entries(WANT).every(([n, w]) => got[n] && got[n].cfg === w.cfg) ? 1 : 0;
r.literal_ok = Object.entries(LITERAL).every(([n, c]) => got[n] && got[n].cfg === c && WANT[n].cfg === c) ? 1 : 0;
r.hashes_ok = Object.entries(WANT).every(([n, w]) => got[n] && String(got[n].hash) === w.hash) ? 1 : 0;
r.kinds_ok = Object.entries(WANT).every(([n, w]) => got[n] && got[n].kind === w.kind) ? 1 : 0;
r.distinct = new Set(Object.values(got).map((p) => p && p.hash)).size === 6 ? 1 : 0;
// A is B (search-v3-wide) at the deeper horizon and twice the clock, nothing else different
const w = got['search-v3-wide'], a = got['search-v3-wide-t1-x2'];
r.wideAtDepth = w && a && w.cfg && a.cfg === w.cfg.replace('ms=1500,', 'ms=3000,').replace('turns=0,', 'turns=1,') ? 1 : 0;
for (const n of Object.keys(WANT)) { r.hashes[n] = got[n]?.hash ?? null; r.cfgs[n] = got[n]?.cfg ?? null; }
r.ok = r.present && r.cfgs_ok && r.literal_ok && r.hashes_ok && r.kinds_ok && r.distinct && r.wideAtDepth ? 1 : 0;
fs.writeFileSync('var/j223-tools/players.json', JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J223EOF
# the j223 host's seed base (D551 point 3): hostBase('j223') is 405,000,000, so an empty folder's first match block is
# 405,900,000 and the 600th 405,900,599; the pilot's host name, j223-pilot3, has base 548,000,000, whose first block
# deals confirm pair 20 (synergy-900000001) at one batch pair (j223-pilot and j223-pilot2 deal pair 0); and the confirm
# set the match plays has 30 deck pairs (D318), so 600 blocks give each 40 batches
cat > var/j223-tools/base.mjs <<'J223EOF'
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const S = await import(pathToFileURL(path.resolve('tools/ai-ladder/schedule.ts')).href);
const own = S.hostBase('j223'), pilot = S.hostBase('j223-pilot3');
const first = S.nextBseed(own + 900000, new Set());
const setPairs = fs.readFileSync('tools/ai-bench/pairs-confirm.txt', 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).length;
// each confirm pair's batches over the 600 blocks (2 pairs a batch, ai-ladder's default for match)
const per = new Array(setPairs).fill(0);
for (let b = first; b < first + 600; b++) for (const p of S.batchPairs(b, setPairs, 2)) per[p]++;
const pfirst = S.nextBseed(pilot + 900000, new Set());
const setLines = fs.readFileSync('tools/ai-bench/pairs-confirm.txt', 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
const pilotPairs = S.batchPairs(pfirst, setPairs, 1), pilotPair = pilotPairs.length === 1 ? pilotPairs[0] : -1;
const pilotPairName = pilotPair >= 0 ? (/([a-z-]+-9\d{8})-A\.dck/.exec(setLines[pilotPair] || '') || [])[1] ?? null : null;
const r = { own, first, last: first + 599, pilot, pfirst, pilotPair, pilotPairName, setPairs,
  perPairMin: Math.min(...per), perPairMax: Math.max(...per),
  ok: own === 405000000 && first === 405900000 && pilot === 548000000 && pilotPair === 20 && pilotPairName === 'synergy-900000001' && setPairs === 30 && Math.min(...per) === 40 && Math.max(...per) === 40 ? 1 : 0 };
fs.mkdirSync('var/j223-tools', { recursive: true });
fs.writeFileSync('var/j223-tools/base.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J223EOF
node var/j223-tools/base.mjs
```
```bash
# the code (D551 point 2), by content, under the paths a match runs (bridge/src, tools/ai-ladder, tools/ai-bench),
# J221's check (D548 point 2's form) with J222's pin as its base: (1) from J222's pin 6fd2e726d to the pin, exactly
# D550's six files (`exact`); (2) the changed lines of SearchConfig.java, SearchPolicy.java, MtgTable.java and
# RecordMatch.java that are not comment lines are exactly D550's six (`codeLinesOk`): LIVE_VERSION and LIVE_DEFAULTS
# before and after, and the start line's words, so the rest of D550's lines there are javadoc and comments
# (DecisionSelfTest.java, D550's sixth file under bridge/src, is the build's self-test and no game runs it); (3)
# players.json is J222's pin's, player for player, with every field but `note` unchanged and no player added
# (`playersOk`; D550 rewrote two notes, `notesChanged` counts them, description); (4) from J220's pin 847e50a29 to
# J222's pin, tools/ai-ladder/players.json alone (`sameAsJ220`: D549's one player appended). With the two hashes held
# by `pl` above, that is the argument that J223's two players play the search code J220, J221 and J222 played:
# SearchConfig.parse, the bench and the ladder's code are byte for byte J222's.
mkdir -p var/j223-tools
J222PIN=6fd2e726df2c90952aae455a2cb901261c5d676d
J220PIN=847e50a29ae5ca3240d41a2cf68567e434fbdea9
git diff --name-only "$J222PIN" HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j223-tools/src-diff1.txt && echo 0 > var/j223-tools/src-diff1.rc || echo 1 > var/j223-tools/src-diff1.rc
git diff --name-only "$J220PIN" "$J222PIN" -- bridge/src tools/ai-ladder tools/ai-bench > var/j223-tools/src-diff0.txt && echo 0 > var/j223-tools/src-diff0.rc || echo 1 > var/j223-tools/src-diff0.rc
git diff -U0 "$J222PIN" HEAD -- bridge/src/mtgtable/ai/SearchConfig.java bridge/src/mtgtable/ai/SearchPolicy.java bridge/src/mtgtable/MtgTable.java bridge/src/mtgtable/RecordMatch.java > var/j223-tools/src-lines.txt && echo 0 > var/j223-tools/src-lines.rc || echo 1 > var/j223-tools/src-lines.rc
git diff --numstat "$J222PIN" HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j223-tools/src-numstat.txt && echo 0 > var/j223-tools/src-numstat.rc || echo 1 > var/j223-tools/src-numstat.rc
git show "$J222PIN:tools/ai-ladder/players.json" > var/j223-tools/players-j222.json && echo 0 > var/j223-tools/players-j222.rc || echo 1 > var/j223-tools/players-j222.rc
node - <<'J223EOF'
const fs = require('fs');
const lines = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
const rcOf = (f) => Number(fs.readFileSync(f, 'utf8').trim());
const rc = ['src-diff1', 'src-diff0', 'src-lines', 'src-numstat', 'players-j222'].every((x) => rcOf(`var/j223-tools/${x}.rc`) === 0) ? 0 : 1;
const P = 'tools/ai-ladder/players.json';
const SIX = ['bridge/src/mtgtable/MtgTable.java', 'bridge/src/mtgtable/RecordMatch.java', 'bridge/src/mtgtable/ai/DecisionSelfTest.java',
  'bridge/src/mtgtable/ai/SearchConfig.java', 'bridge/src/mtgtable/ai/SearchPolicy.java', P].sort();
const files = lines('var/j223-tools/src-diff1.txt').sort(), files0 = lines('var/j223-tools/src-diff0.txt').sort();
// the changed lines that are not comments: a +/- line whose text, trimmed, is not empty and does not open with
// *, /**, */ or //
const code = [];
for (const l of fs.readFileSync('var/j223-tools/src-lines.txt', 'utf8').split('\n')) {
  if (!/^[+-]/.test(l) || /^(\+\+\+|---) /.test(l)) continue;
  const c = l.slice(1).trim();
  if (c === '' || /^(\*|\/\*\*|\*\/|\/\/)/.test(c)) continue;
  code.push(l[0] + c);
}
const WANT = [
  '-public static final String LIVE_VERSION = "search-v4";',
  '+public static final String LIVE_VERSION = "search-v5";',
  '-public static final String LIVE_DEFAULTS = "what=pa,anytime=1,declined=1,instant=1";',
  '+public static final String LIVE_DEFAULTS = "what=pa,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1";',
  '-? "; " + SearchConfig.LIVE_VERSION + ", D412, D539, D546" : "") + ")" : ""));',
  '+? "; " + SearchConfig.LIVE_VERSION + ", D412, D539, D546, D550" : "") + ")" : ""));',
];
const codeLinesOk = JSON.stringify([...code].sort()) === JSON.stringify([...WANT].sort()) ? 1 : 0;
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const was = read('var/j223-tools/players-j222.json'), now = read(P);
const wl = was && Array.isArray(was.players) ? was.players : null, nl = now && Array.isArray(now.players) ? now.players : null;
const bare = (p) => { const q = { ...p }; delete q.note; return JSON.stringify(q); };
// the registry at the pin is J222's pin's, player for player, every field but `note` unchanged, and no player added
const playersOk = wl && nl && was && now && nl.length === wl.length && wl.every((p, i) => bare(p) === bare(nl[i]))
  && JSON.stringify(Object.keys(was).sort()) === JSON.stringify(Object.keys(now).sort()) ? 1 : 0;
const notesChanged = wl && nl ? wl.filter((p, i) => nl[i] && p.note !== nl[i].note).map((p) => p.name) : null;
const r = { rc, files, count: files.length, exact: JSON.stringify(files) === JSON.stringify(SIX) ? 1 : 0,
  code, codeLines: code.length, codeLinesOk, playersOk, notesChanged, notesChangedN: notesChanged ? notesChanged.length : -1,
  numstat: lines('var/j223-tools/src-numstat.txt'), playersBefore: wl ? wl.length : -1, playersAfter: nl ? nl.length : -1,
  files0, sameAsJ220: JSON.stringify(files0) === JSON.stringify([P]) ? 1 : 0 };
fs.writeFileSync('var/j223-tools/src-diff.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J223EOF
```
```bash
# the exposure reader: for one match folder, the summed D540 and D544 counters of each side from the batch lines'
# aStats and bStats (config A is the match's first player), A's three keys' exposure and the union's changes, B's three
# keys beside them and B's windows-open part (B is search-v3-wide), and both sides' lands-off checks
mkdir -p var/j223-tools
cat > var/j223-tools/exposure.cjs <<'J223EOF'
// J223 (D551 points 4 and 5: D549's, D548 points 5 and 6, D544 points 12 and 13): the union's exposure. J222's
// exposure reader (J221's, J217's and J215's before it), unchanged but for these lines and B's three keys. Sums, for
// each side of one match, every batch line's counters whose key starts with search.p.declined., search.p.instant.,
// search.p.lands., search.p.stackwin., search.p.passwin., search.p.dactiv. or search.wide., plus search.p.considered,
// search.a.considered, search.p.skipLand and search.b.considered. For each of A's three keys (stackwin, passwin,
// dactiv): its windows, candidates, changes and retries. `<key>Floor` is 1 when that key's windows reach its floor
// (stackwin 0.25 a game, passwin 0.10, dactiv 0.25; compared in integers: windows x 4 >= games, windows x 10 >= games,
// windows x 4 >= games), description only. `unionChanged` is the three keys' changes summed, `exposed` 1 when it is at
// least 0.25 a game (unionChanged x 4 >= games: 1,200 at 4,800), D544 point 13's NOT READ condition. The refusals:
// search.p.stackwin.refused and each reason, read by its suffix (so the skeptic's read's `stale` and `hidden` come through
// with every other), `refusalShare` = refused / (refused + stackwin windows). B is search-v3-wide (D551 point 1), so
// its D544 and D540 counters are its own keys: `bNew` counts B's D544 counters above 0 and `bD540` its D540 counters
// above 0 (description only), and B's three keys are summed as A's are (`b<Key>Windows`, `...Changed`, `...Retry`,
// `bUnionChanged`, `bRefused`); `bWideOpen` is 1 when B's search.p.stackwin.windows and search.p.dactiv.windows are each
// above 0, D551 point 4's part in place of D549's B-clean part; `aLands` and `bLands` each side's search.p.lands. counters
// above 0 (the third D540 key is off on both sides, D547 point 3; `landsClean` 1 when both are 0); `kindsOk` 1 when both sides searched priority and attacks and neither searched a block. A game is a batch line.
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
const Bk = (key, x) => sum.b[`search.p.${key}.${x}`] || 0;
const bNew = Object.entries(sum.b).filter(([x, v]) => D544.test(x) && v > 0).length;
const bD540 = Object.entries(sum.b).filter(([x, v]) => D540.test(x) && v > 0).length;
const aLands = Object.entries(sum.a).filter(([x, v]) => LANDS.test(x) && v > 0).length;
const bLands = Object.entries(sum.b).filter(([x, v]) => LANDS.test(x) && v > 0).length;
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
// B's three keys, described beside A's; B's windows open (D551 point 4)
for (const key of ['stackwin', 'passwin', 'dactiv']) {
  const K = key[0].toUpperCase() + key.slice(1);
  Object.assign(r, {
    [`b${K}Windows`]: Bk(key, 'windows'), [`b${K}Cands`]: Bk(key, 'cands'), [`b${K}Changed`]: Bk(key, 'changed'), [`b${K}Retry`]: Bk(key, 'retry'),
    [`b${K}WindowsPerGame`]: pg(Bk(key, 'windows')), [`b${K}ChangedPerGame`]: pg(Bk(key, 'changed')),
  });
}
const bUnionChanged = r.bStackwinChanged + r.bPasswinChanged + r.bDactivChanged;
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
  bUnionChanged, bUnionChangedPerGame: pg(bUnionChanged), bRefused: Bk('stackwin', 'refused'),
  bWideOpen: r.bStackwinWindows > 0 && r.bDactivWindows > 0 ? 1 : 0,
  bNew, bD540, aLands, aLandsClean: aLands === 0 ? 1 : 0,
  bLands, bLandsClean: bLands === 0 ? 1 : 0, landsClean: aLands === 0 && bLands === 0 ? 1 : 0,
  kindsOk: pos(sum.a['search.p.considered']) && pos(sum.b['search.p.considered'])
    && pos(sum.a['search.a.considered']) && pos(sum.b['search.a.considered'])
    && (sum.a['search.b.considered'] || 0) === 0 && (sum.b['search.b.considered'] || 0) === 0 ? 1 : 0,
});
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J223EOF
# its self-test, on synthetic batch folders of 8 games: (1) every key of A's above its floor, the union at 0.375
# changes a game, B wide with its own windows open (exposed, bWideOpen 1, both kinds, B's keys summed); (2) B with no
# stack window in any game (bWideOpen 0); (3) B with D540 counters above 0 and its D544 counters (bD540 1, bNew > 0: B's
# own keys, description; bWideOpen 1); (4) A with a lands counter above 0 (aLandsClean 0); (5) the union at exactly
# 0.25 a game (2 in 8) is exposed, passwin at 1 in 8 is above its 0.10 floor and dactiv at 0 is under its floor; (6)
# the union at 1 in 8 is not exposed; (7) refusals: 2 refused against 6 windows is a share of 0.25, with each reason;
# (8) A with no attack search (kindsOk 0); (9) B with a lands counter above 0 (bLandsClean 0, landsClean 0); (10) B
# with no declined-activation window in any game (bWideOpen 0). Writes
# var/j223-tools/exposure-selftest.json
rm -rf var/j223-tools/exposure-selftest
node - <<'J223EOF'
const fs = require('fs');
const { execFileSync } = require('child_process');
const S = 'var/j223-tools/exposure-selftest';
const line = (a, b) => JSON.stringify({ a: 'X', b: 'Y', aStats: { counts: a }, bStats: { counts: b } });
const base = () => ({ 'search.p.considered': 9, 'search.a.considered': 2, 'search.p.skipLand': 3 });
const mk = (name, rows) => {
  const d = `${S}/${name}`;
  fs.mkdirSync(`${d}/batches/run-${name}`, { recursive: true });
  fs.writeFileSync(`${d}/match.json`, JSON.stringify({ id: `j223:run-${name}`, played: rows.length }));
  fs.writeFileSync(`${d}/batches/run-${name}/b0.jsonl`, rows.slice(0, 4).map(([a, b]) => line(a, b)).join('\n') + '\n');
  fs.writeFileSync(`${d}/batches/run-${name}/b1.jsonl`, rows.slice(4).map(([a, b]) => line(a, b)).join('\n') + '\n');
  execFileSync(process.execPath, ['var/j223-tools/exposure.cjs', d, `${d}/match.json`, `${d}/out.json`], { stdio: 'ignore' });
  return JSON.parse(fs.readFileSync(`${d}/out.json`, 'utf8'));
};
const rows = (f) => Array.from({ length: 8 }, (_, i) => f(i));
const SW = (ch = 0) => ({ 'search.p.stackwin.windows': 2, 'search.p.stackwin.cands': 6, 'search.p.stackwin.changed': ch, 'search.p.stackwin.oppPassed': 2 });
const PW = () => ({ 'search.p.passwin.windows': 1, 'search.p.passwin.cands': 2 });
const DA = (ch = 0) => ({ 'search.p.dactiv.windows': 1, 'search.p.dactiv.cands': 1, 'search.p.dactiv.changed': ch, 'search.p.dactiv.sameHost': 1 });
const A1 = (i) => ({ ...base(), ...SW(i % 4 === 0 ? 1 : 0), ...PW(), ...DA(i === 1 ? 1 : 0), 'search.p.declined.windows': 1, 'search.wide.oppPassed': 3 });
// B is search-v3-wide: its own windows open (a stack window and a declined activation in game 0, a stack window and a
// change in game 5)
const B0 = (i) => ({ ...base(), ...(i === 0 ? { 'search.p.stackwin.windows': 1, 'search.p.stackwin.cands': 2, 'search.p.dactiv.windows': 1 } : {}),
  ...(i === 5 ? { 'search.p.stackwin.windows': 1, 'search.p.stackwin.changed': 1, 'search.p.passwin.windows': 0 } : {}) });
const Bnone = () => ({ ...base(), 'search.p.stackwin.windows': 0 });
const c1 = mk('c1', rows((i) => [A1(i), B0(i)]));
const c2 = mk('c2', rows((i) => [A1(i), i === 0 ? { ...base(), 'search.p.dactiv.windows': 1 } : Bnone()]));
const c3 = mk('c3', rows((i) => [A1(i), i === 2 ? { ...B0(i), 'search.p.declined.windows': 4 } : B0(i)]));
const c4 = mk('c4', rows((i) => [i === 5 ? { ...A1(i), 'search.p.lands.windows': 1 } : A1(i), B0(i)]));
const c5 = mk('c5', rows((i) => [{ ...base(), ...(i === 0 || i === 4 ? SW(1) : {}), ...(i === 2 ? PW() : {}) }, B0(i)]));
const c6 = mk('c6', rows((i) => [{ ...base(), ...SW(i === 0 ? 1 : 0), ...DA(0) }, B0(i)]));
const c7 = mk('c7', rows((i) => [{ ...base(), ...(i < 3 ? SW(1) : {}), ...(i === 6 ? { 'search.p.stackwin.refused': 1, 'search.p.stackwin.refused.faceDown': 1 } : {}),
  ...(i === 7 ? { 'search.p.stackwin.refused': 1, 'search.p.stackwin.refused.stale': 1 } : {}) }, B0(i)]));
const noA = (i) => { const x = A1(i); delete x['search.a.considered']; return x; };
const c8 = mk('c8', rows((i) => [noA(i), B0(i)]));
const c9 = mk('c9', rows((i) => [A1(i), i === 6 ? { ...B0(i), 'search.p.lands.windows': 2 } : B0(i)]));
const c10 = mk('c10', rows((i) => [A1(i), i === 0 ? { ...base(), 'search.p.stackwin.windows': 3 } : Bnone()]));
const cases = [
  ['every key of A\'s above its floor, the union at 3 changes in 8 games; B\'s own windows open and summed beside A\'s', c1.games === 8 && c1.stackwinWindows === 16 && c1.stackwinWindowsPerGame === 2 && c1.stackwinCandsPerWindow === 3 && c1.passwinWindows === 8 && c1.dactivWindows === 8 && c1.stackwinChanged === 2 && c1.dactivChanged === 1 && c1.unionChanged === 3 && c1.unionChangedPerGame === 0.375 && c1.exposed === 1 && c1.stackwinFloor === 1 && c1.passwinFloor === 1 && c1.dactivFloor === 1 && c1.sameHost === 8 && c1.stackwinOppPassed === 16 && c1.wideOppPassed === 24 && c1.bWideOpen === 1 && c1.bStackwinWindows === 2 && c1.bDactivWindows === 1 && c1.bPasswinWindows === 0 && c1.bStackwinChanged === 1 && c1.bUnionChanged === 1 && c1.bUnionChangedPerGame === 0.125 && c1.bStackwinWindowsPerGame === 0.25 && c1.bNew === 4 && c1.bD540 === 0 && c1.aLandsClean === 1 && c1.kindsOk === 1],
  ['B with no stack window in any game: bWideOpen 0, A unchanged', c2.bWideOpen === 0 && c2.bStackwinWindows === 0 && c2.bDactivWindows === 1 && c2.exposed === 1 && c2.unionChanged === 3],
  ['B with search.p.declined.windows 4 in one game: bD540 1, its D544 counters its own (bNew 4), bWideOpen 1', c3.bD540 === 1 && c3.bNew === 4 && c3.bWideOpen === 1],
  ['A with search.p.lands.windows 1 in one game: A not lands-clean', c4.aLandsClean === 0 && c4.aLands === 1 && c4.bWideOpen === 1],
  ['the union at exactly 0.25 a game (2 in 8) is exposed; passwin 1 in 8 is above 0.10; dactiv 0 is under its floor', c5.unionChanged === 2 && c5.exposed === 1 && c5.passwinWindows === 1 && c5.passwinFloor === 1 && c5.dactivFloor === 0 && c5.dactivFired === 0 && c5.stackwinFloor === 1],
  ['the union at 1 change in 8 is not exposed', c6.unionChanged === 1 && c6.exposed === 0 && c6.dactivFloor === 1],
  ['2 stack windows refused against 6 searched: a share of 0.25, by reason', c7.refused === 2 && c7.stackwinWindows === 6 && c7.refusalShare === 0.25 && c7.refusedReasons.faceDown === 1 && c7.refusedReasons.stale === 1],
  ['A with no attack search: kindsOk 0', c8.kindsOk === 0 && c8.exposed === 1 && c8.bWideOpen === 1],
  ['B with a lands counter above 0 in one game: bLands 1, landsClean 0, bWideOpen 1', c9.bLands === 1 && c9.bLandsClean === 0 && c9.landsClean === 0 && c9.aLandsClean === 1 && c9.bWideOpen === 1 && c1.landsClean === 1 && c4.landsClean === 0],
  ['B with no declined-activation window in any game: bWideOpen 0', c10.bWideOpen === 0 && c10.bStackwinWindows === 3 && c10.bDactivWindows === 0],
];
let passed = 0;
for (const [what, ok] of cases) { console.error(`${ok ? 'ok  ' : 'FAIL'} ${what}`); passed += ok ? 1 : 0; }
const r = { ok: passed === cases.length ? 1 : 0, cases: cases.length, passed };
fs.writeFileSync('var/j223-tools/exposure-selftest.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J223EOF
```
```bash
mkdir -p var/j223-tools
cat > var/j223-tools/verdict.mjs <<'J223EOF'
// J223's reading, pre-registered in D551 (points 4 to 7, written 2026-11-17 before any J223 game; the job's rule: line;
// D398's fixed match; D519's four readings at 4,800 games; D549 point 4's completeness parts with this match's names
// and set and B's keys-off part replaced by B's windows open; D549 point 5's exposure condition on A's side; the
// recommendation, D551 point 7). J222's verdict, unchanged but for these lines, the constants, `bWide` in place of
// `bClean`, the parts described and the recommendation's three words.
// usage: node verdict.mjs <match.json> <j223 dir> <out.json>        node verdict.mjs --selftest <scratch dir>
//   <match.json> is the match line (or the match step's {"notPlayed": true, "reason": ...}); <j223 dir>/seeds.json
//   is the block reader's file, rollouts.json the rollout reader's, exposure.json the exposure reader's and pairs.json
//   the pairs reader's (the match's mirrored pairs rebuilt from its result rows with the ladder's own functions).
// THE MATCH: search-v3-wide-t1-x2 (config A, 709c83cc4d48: search-v3-wide with turns=1 and ms=3000) against
//   search-v3-wide (config B, b95340935592, the live seat since D550 merged), 4,800 games, 2,400 mirrored pairs, the
//   CONFIRM deck set (tools/ai-bench/pairs-confirm.txt), no stopping rule, under --host j223 in a ladder folder of its own
//   (var/j223-ladder, emptied by its step), so on deal blocks 405,900,000-405,900,599. B is fixed.
// EXACTLY ONE OUTCOME, in this precedence:
//   NOT PLAYED   the pilot's gate (D551 point 10) kept the match out: the match file says notPlayed.
//   INCOMPLETE   any part of D551 point 4's completeness fails: the line does not name A and B in that order at their
//                registered hashes, or does not say complete: true, or played fewer than 4,800 games, or errors +
//                timeouts > 240 (one in 20), or lacks score, lo, elo, eloLo or eloHi, or its set is not the confirm set or
//                a row of the match names another set, or the block reader did not find the match's 4,800 games on
//                exactly the 600 blocks 405,900,000-405,900,599 with no other match's game in the folder, or a batch
//                line did not carry A's and B's seat configs exactly, or a side did not search priority and attacks or
//                searched a block, or the exposure reader did not read this match's 4,800 batch lines, or the pairs
//                rebuilt from the rows do not reproduce the line's pairs, score, lo and hi, or B's search.p.stackwin.
//                windows or search.p.dactiv.windows summed over the match is 0 (B did not play as search-v3-wide), or
//                either side shows a search.p.lands. counter above 0 (a keys-off path fired: a code fault), or there is no
//                rollout read of this match, or A's ms of play a finished rollout is under 1.3 times B's (the horizon's
//                trace, D547 point 3), whatever the rate. No reading and not NOT READ. Owed: a repost alone under a new
//                job id after the cause is found, except when the trace alone failed on a match valid in every other
//                part (owedDecision): a new decision saying what was wrong, never a repost unchanged.
//   NOT READ     every other part holds, but A's three keys together changed fewer than 0.25 decisions a game played
//                (search.p.stackwin.changed + search.p.passwin.changed + search.p.dactiv.changed, changed x 4 <
//                played: under 1,200 at 4,800), D551 point 5. No reading; every rate reported; not played on the
//                confirm set again without a new decision.
//   one of D519's four readings, for a COMPLETE match, compared as the line carries them, lo in integer
//   ten-thousandths and Elo in integer tenths:
//     SHOWN                  lo > 0.5 and elo >= 15
//     SMALL GAIN             lo > 0.5 and elo < 15
//     INCONCLUSIVE AT 4,800  lo <= 0.5 and eloHi >= 15
//     NOT SHOWN              lo <= 0.5 and eloHi < 15
// DESCRIPTIVE, deciding nothing, exactly one for a complete match: "a measured loss" (eloHi < 0), "a measured gain"
//   (eloLo > 0), "indistinguishable" otherwise (an end of exactly 0 holds 0). A key of A's under its floor (stackwin
//   0.25, passwin 0.10, dactiv 0.25 windows a game) is named unexposed and decides nothing.
// THE RECOMMENDATION (D551 point 7, amending D549 point 7), exactly one:
//   RECOMMEND  SHOWN or SMALL GAIN (recDeep): the PC session recommends to the owner that the live seat become
//              search-v3-wide-t1-x2 at a 3 s clock (the clock and the adoption are the owner's, under a later decision);
//   STAYS      INCONCLUSIVE AT 4,800 or NOT SHOWN (recStay): search-v3-wide stays the live seat and the 3 s clock is not
//              recommended; the report describes the depth and both sides' window counters;
//   OPEN       no reading (NOT PLAYED, NOT READ or INCOMPLETE) (recOpen): nothing recommended, nothing withdrawn;
//              search-v3-wide stays.
//   Nothing here changes the live seat (liveSeatChanged is 0 in every outcome); a seat change is the owner's, under a
//   separate decision and the seat queue (D509).
// BESIDE EVERY OUTCOME, never changing one (D551 point 9): each key's exposure a game (windows, candidates a window,
//   changes, retries), the union's changes, the stack windows refused and their share, the own-stack aims and same-host
//   equips dropped, the memory sets put back, the windows the opponent had passed in, the declined spells in
//   instant-speed windows, each side's searched decisions by kind and ms a searched decision, search seconds a game and
//   their ratio, D519 point 5's "no cost" flag (aMs x 100 <= 105 x bMs, in integer microseconds), rollouts and rounds a
//   decision, the share short of two rounds, ms of play and copy a rollout, the priority overrides by direction a
//   priority decision, the land windows left to Forge a game, the games per confirm deck pair, and B's three keys'
//   windows, changes and retries a game beside A's.
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 4800;
export const BAR = GAMES / 20;
export const FIRST = 405900000;
export const BLOCKS = 600;
export const LAST = FIRST + BLOCKS - 1;
export const SET = 'tools/ai-bench/pairs-confirm.txt';
export const A = 'search-v3-wide-t1-x2';
export const AH = '709c83cc4d48';
export const ACFG = 'Default+outlets+search:ms=3000,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1';
export const B = 'search-v3-wide';
export const BH = 'b95340935592';
export const BCFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1';
// D547 point 3 (D551 point 4): A's ms of play a finished rollout at least 1.3 times B's, in integer thousandths
export const TRACE = 1300;
// the earlier matches' numbers, described beside the reading and never read against it (D551 point 8), each against
// search-v3-declined-instant: J222 (this A, the dev set), J217 (this B, the confirm set) and J220 (the horizon alone,
// the confirm set), from pc-results/results/J222/, J217/ and J220/ (match-*.json, rollouts.json, exposure.json)
export const PARTS = {
  J222: { a: 'search-v3-wide-t1-x2', b: 'search-v3-declined-instant', set: 'dev', score: 0.5298, lo: 0.5203, hi: 0.5393, elo: 20.7, eloLo: 14.1, eloHi: 27.3, aSec: 58.5, bSec: 21.5, aMs: 2099, bMs: 864, aRolloutsPerDecision: 16.09, bRolloutsPerDecision: 16.37, aShortShare: 0.0399, bShortShare: 0.0258, playMsRatio: 2.585, stackwinWindowsPerGame: 1.731, passwinWindowsPerGame: 0.466, dactivWindowsPerGame: 1.885, unionChangedPerGame: 0.478 },
  J217: { a: 'search-v3-wide', b: 'search-v3-declined-instant', set: 'confirm', score: 0.51, lo: 0.5021, hi: 0.5179, elo: 6.9, eloLo: 1.5, eloHi: 12.4, aSec: 23.5, bSec: 21.6, aMs: 907, bMs: 913, stackwinWindowsPerGame: 1.293, passwinWindowsPerGame: 0.415, dactivWindowsPerGame: 1.705, unionChangedPerGame: 0.279 },
  J220: { a: 'search-v3-declined-instant-t1-x2', b: 'search-v3-declined-instant', set: 'confirm', score: 0.5204, lo: 0.5112, hi: 0.5296, elo: 14.2, eloLo: 7.8, eloHi: 20.6, aSec: 51.9, bSec: 20.9, aMs: 2084, bMs: 848, aRolloutsPerDecision: 16.54, bRolloutsPerDecision: 16.48, aShortShare: 0.0429, bShortShare: 0.0267, playMsRatio: 2.562 },
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
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const per = (x, n) => (num(x) !== null && num(n) !== null && n > 0 ? r3(x / n) : null);

export function verdict(m, bs, ro, ex, pr) {
  const notPlayed = m !== null && m.notPlayed === true ? 1 : 0;
  const names = !notPlayed && m !== null && m.a === A && m.b === B ? 1 : 0;
  const hashes = !notPlayed && m !== null && String(m.ah) === AH && String(m.bh) === BH ? 1 : 0;
  const ak = kinds(m?.aSearch), bk = kinds(m?.bSearch);
  const kindsOk = !notPlayed && m !== null && ak.p > 0 && ak.a > 0 && ak.b === 0 && bk.p > 0 && bk.a > 0 && bk.b === 0 ? 1 : 0;
  const purpose = typeof m?.id === 'string' ? `match:${m.id}` : null;
  const run = typeof m?.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : null;
  const blocks = bs !== null && purpose !== null && bs.purpose === purpose && bs.games === GAMES && bs.blocks === BLOCKS
    && bs.min === FIRST && bs.max === LAST && bs.otherGames === 0 ? 1 : 0;
  // the confirm set: the line's set, and no row of the match on another set (the block reader counts them)
  const setOk = !notPlayed && m !== null && m.set === SET && bs !== null && bs.purpose === purpose && bs.offSet === 0 ? 1 : 0;
  const cfgs = ro !== null && typeof ro.lines === 'number' && ro.lines === GAMES && ro.cfgExact === GAMES
    && ro.aCfg === ACFG && ro.bCfg === BCFG ? 1 : 0;
  // the exposure reader's file is this match's when it names the match's run; it is the whole match when it read
  // all 4,800 batch lines
  const exThis = ex !== null && run !== null && ex.run === run && num(ex.games) !== null
    && KEYS.every((k) => num(ex[`${k}Windows`]) !== null) && num(ex.unionChanged) !== null;
  const exposureRead = exThis && ex.games === GAMES ? 1 : 0;
  // B played as search-v3-wide: its stack and declined-activation windows each above 0 over the match (D551 point 4, in
  // place of D549's B-clean part; B's D540 and D544 counters are otherwise its own keys, description only)
  const bWide = exThis && ex.bWideOpen === 1 && num(ex.bStackwinWindows) > 0 && num(ex.bDactivWindows) > 0 ? 1 : 0;
  // the third D540 key is off on both sides (D547 point 3)
  const landsClean = exThis && ex.landsClean === 1 && ex.aLands === 0 && ex.bLands === 0 ? 1 : 0;
  // the horizon's trace (D547 point 3): this match's rollout file, A's play time a finished rollout over B's
  const roThis = ro !== null && run !== null && ro.run === run;
  const aPlay = roThis ? num(ro.aPlayMsPerRollout) : null, bPlay = roThis ? num(ro.bPlayMsPerRollout) : null;
  const playMsRatio = aPlay !== null && bPlay !== null && bPlay > 0 ? r3(aPlay / bPlay) : null;
  const horizonTrace = playMsRatio !== null && Math.round(playMsRatio * 1000) >= TRACE ? 1 : 0;
  // the rebuilt pairs reproduce the line
  const pairsOk = !notPlayed && m !== null && pr !== null && purpose !== null && pr.purpose === purpose
    && num(pr.pairs) !== null && pr.pairs === m.pairs && num(pr.score) !== null && num(pr.se) !== null && pr.se > 0
    && num(pr.lo) !== null && num(pr.hi) !== null
    && r4(pr.score) === m.score && r4(pr.lo) === m.lo && r4(pr.hi) === m.hi ? 1 : 0;
  const s = {
    a: A, b: B, match: m === null ? 0 : 1, names, hashes, setOk, kindsOk, blocks, cfgs, exposureRead, bWide, landsClean,
    horizonTrace, pairsOk,
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
    && s.eloHi !== null && setOk === 1 && blocks === 1 && cfgs === 1 && kindsOk === 1 && exposureRead === 1 && pairsOk === 1
    && bWide === 1 && landsClean === 1 && horizonTrace === 1;
  // the exposure, as description for every match it was read on (a cut-short one included), and as D551 point 5's
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
    declinedWindowsPerGame: E ? per(num(E.declinedWindows) ?? 0, g) : null, instantWindowsPerGame: E ? per(num(E.instantWindows) ?? 0, g) : null,
    bNew: E ? num(E.bNew) : null, bD540: E ? num(E.bD540) : null, aLands: E ? num(E.aLands) : null, bLands: E ? num(E.bLands) : null,
  });
  // B's three keys, beside A's (description only; bWide above is the one part read from them)
  for (const k of KEYS) {
    const K = k[0].toUpperCase() + k.slice(1);
    const w = E ? num(E[`b${K}Windows`]) ?? 0 : null, c = E ? num(E[`b${K}Changed`]) ?? 0 : null, rt = E ? num(E[`b${K}Retry`]) ?? 0 : null;
    Object.assign(exposure, { [`b${K}Windows`]: w, [`b${K}WindowsPerGame`]: per(w, g), [`b${K}Changed`]: c, [`b${K}ChangedPerGame`]: per(c, g),
      [`b${K}Retry`]: rt, [`b${K}RetryPerGame`]: per(rt, g) });
  }
  const buc = E ? num(E.bUnionChanged) ?? 0 : null;
  Object.assign(exposure, { bUnionChanged: buc, bUnionChangedPerGame: per(buc, g), bRefused: E ? num(E.bRefused) ?? 0 : null });
  // D551 point 5: A's union is read when its changes are at least 0.25 a game played, in integers (1,200 at 4,800)
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
  const aloneGain = shown || smallGain ? 1 : 0;
  const measuredLoss = ok && EH < 0 ? 1 : 0;
  const measuredGain = ok && EL10 > 0 ? 1 : 0;
  const indistinguishable = ok && measuredLoss === 0 && measuredGain === 0 ? 1 : 0;
  const reading = !ok ? null : shown ? 'SHOWN' : smallGain ? 'SMALL GAIN' : inconclusive4800 ? 'INCONCLUSIVE AT 4,800' : 'NOT SHOWN';
  const outcome = notPlayed ? 'NOT PLAYED' : incomplete ? 'INCOMPLETE' : notRead ? 'NOT READ' : reading;
  const word = !ok ? null : measuredLoss ? 'a measured loss' : measuredGain ? 'a measured gain' : 'indistinguishable';
  // the recommendation (D551 point 7)
  const recDeep = ok && aloneGain === 1 ? 1 : 0;
  const recStay = ok && aloneGain === 0 ? 1 : 0;
  const recOpen = ok ? 0 : 1;
  const recommendation = recOpen ? 'OPEN' : recDeep ? 'RECOMMEND' : 'STAYS';
  const recWhy = recOpen ? `J223 gave no reading (${outcome}): nothing recommended and nothing withdrawn; ${B} stays the live seat`
    : recDeep ? `J223 reads ${reading} on the confirm set: the PC session recommends to the owner that the live seat become ${A} at a 3 s clock; the clock and the adoption are the owner's, under a later decision`
    : `J223 reads ${reading} (${word}): ${B} stays the live seat and the 3 s clock is not recommended`;
  const aSecPerGame = notPlayed ? null : secPerGame(m?.aSearch, m?.played), bSecPerGame = notPlayed ? null : secPerGame(m?.bSearch, m?.played);
  const costRatio = aSecPerGame !== null && bSecPerGame !== null && bSecPerGame > 0 ? Math.round((aSecPerGame / bSecPerGame) * 10000) / 10000 : null;
  // D519 point 5's "no cost" (A's ms a searched decision within 5% of B's), in integer microseconds; deciding nothing
  const noCost = notPlayed || s.aMs === null || s.bMs === null ? 0 : Math.round(s.aMs * 1000) * 100 <= 105 * Math.round(s.bMs * 1000) ? 1 : 0;
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
  const unexposed = KEYS.filter((k) => exposure[`${k}Floor`] !== 1);
  const expo = KEYS.map((k) => `${k} ${d(exposure[`${k}Windows`])} windows (${d(exposure[`${k}WindowsPerGame`])} a game, floor ${FLOORS[k]}${exposure[`${k}Floor`] === 1 ? '' : ', UNEXPOSED'}), ${d(exposure[`${k}CandsPerWindow`])} candidates a window, ${d(exposure[`${k}Changed`])} changes, ${d(exposure[`${k}RetryPerGame`])} retries a game`).join('; ')
    + `; the union ${d(uc)} changes over ${d(g)} games (${d(exposure.unionChangedPerGame)} a game; 0.25 is the rate); stack windows refused ${d(exposure.refused)} (a share of ${d(exposure.refusalShare)})`;
  const cost = costRatio === null ? 'no cost read'
    : `${aSecPerGame} against ${bSecPerGame} search seconds a game (x${costRatio}), ${s.aMs} against ${s.bMs} ms a searched decision (${noCost ? 'no cost: within 5%' : 'a cost: more than 5% over B'}, D519 point 5)`;
  const depth = `${d(desc.aRolloutsPerDecision)} against ${d(desc.bRolloutsPerDecision)} rollouts a decision, ${d(desc.aShortShare)} against ${d(desc.bShortShare)} of decisions short of two rounds, ${d(aPlay)} against ${d(bPlay)} ms of play a rollout (x${d(playMsRatio)}; 1.3 is the trace's bar)`;
  const why = s.match === 0 ? 'NO MATCH' : names === 0 ? 'NOT THIS MATCH (names)' : hashes === 0 ? 'NOT THESE PLAYERS (hashes)'
    : m.complete !== true ? 'STOPPED (complete: false)' : s.played !== GAMES ? `NOT ALL 4,800 GAMES (${s.played})`
    : (s.errors ?? 0) + (s.timeouts ?? 0) > BAR ? 'ERRORS AND TIMEOUTS OVER 240'
    : [s.score, s.lo, s.elo, s.eloLo, s.eloHi].some((x) => x === null) ? 'A NUMBER MISSING FROM THE LINE'
    : setOk === 0 ? 'NOT THE CONFIRM SET' : cfgs === 0 ? 'NOT THESE SEAT CONFIGS' : blocks === 0 ? 'NOT THE REGISTERED DEAL BLOCKS'
    : kindsOk === 0 ? 'A SIDE DID NOT SEARCH PRIORITY AND ATTACKS, OR SEARCHED A BLOCK'
    : exposureRead === 0 ? 'NO EXPOSURE READ ON THIS MATCH'
    : pairsOk === 0 ? 'THE REBUILT PAIRS DO NOT REPRODUCE THE LINE'
    : bWide === 0 ? `B'S WIDE WINDOWS DID NOT OPEN (stack ${d(exposure.bStackwinWindows)}, declined activations ${d(exposure.bDactivWindows)}): B DID NOT PLAY AS ${B}`
    : landsClean === 0 ? `A LANDS COUNTER ABOVE 0 (A ${d(exposure.aLands)}, B ${d(exposure.bLands)}): A KEYS-OFF PATH FIRED`
    : !roThis ? 'NO ROLLOUT READ ON THIS MATCH'
    : horizonTrace === 0 ? `A'S ROLLOUTS NOT DEEPER: ms of play a rollout x${d(playMsRatio)} of B's, under 1.3` : 'INCOMPLETE';
  // D547 point 3: every other part held and only the trace failed -- not reposted unchanged, owed a new decision
  const owedDecision = incomplete && roThis && horizonTrace === 0 && why.startsWith("A'S ROLLOUTS NOT DEEPER") ? 1 : 0;
  const owed = owedDecision ? 'owed: a new decision saying what was wrong (the bar, or the horizon not applied), never a repost unchanged'
    : 'owed: a repost alone under a new job id after its cause is found';
  const rec = `the recommendation is ${recommendation}: ${recWhy}`;
  const bexpo = `B's windows a game: stack ${d(exposure.bStackwinWindowsPerGame)}, pass ${d(exposure.bPasswinWindowsPerGame)}, declined activations ${d(exposure.bDactivWindowsPerGame)}; B's union ${d(buc)} changes (${d(exposure.bUnionChangedPerGame)} a game)`;
  const line = notPlayed ? `${A}: NOT PLAYED: the pilot's gate (D551 point 10): ${m.reason ?? 'no reason given'}; no reading; ${rec}; the live seat is unchanged`
    : incomplete ? `${A}: INCOMPLETE (${why}): no reading, and not NOT READ; ${s.played} of 4,800 games; ${expo}; ${bexpo}; ${depth}; B's D544 counters above 0: ${d(exposure.bNew)}, B's D540 counters above 0: ${d(exposure.bD540)} (its own keys), lands counters above 0: A ${d(exposure.aLands)}, B ${d(exposure.bLands)}; ${owed}; ${rec}; the live seat is unchanged`
    : notRead ? `${A}: NOT READ: A's three keys changed ${uc} decisions over ${s.played} games, ${exposure.unionChangedPerGame} a game, under 0.25 (1,200 at 4,800); ${expo}; ${bexpo}; ${depth}; no reading on the confirm set; not played on the confirm set again without a new decision; ${rec}; the live seat is unchanged`
    : `${A}: ${reading} on the confirm set (${word}): ${s.elo} Elo [${s.eloLo}, ${s.eloHi}], score ${s.score} [${s.lo}, ${s.hi}], against ${B}; ${rec}; ${inconclusive4800 ? 'INCONCLUSIVE AT 4,800 is information; ' : ''}${expo}${unexposed.length ? `; unexposed, so not judged: ${unexposed.join(', ')}` : ''}; ${bexpo}; ${depth}; ${cost}; a seat change is the owner's, under a separate decision; the live seat is unchanged`;
  return { ...s, notPlayed, incomplete, notRead, complete, exposed, shown, smallGain, inconclusive4800, notShown, aloneGain,
    measuredLoss, measuredGain, indistinguishable, outcome, reading, word, playMsRatio,
    recDeep, recStay, recOpen, recommendation, recWhy,
    reason: notPlayed ? m.reason ?? null : null, ...exposure, unexposed, ...desc, aSecPerGame, bSecPerGame, costRatio, noCost,
    owedDecision, parts: PARTS, line, written: 1, games: GAMES, bar: BAR, first: FIRST, last: LAST, liveSeatChanged: 0 };
}

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const T = (o = {}) => ({ games: GAMES, searched: 114000, changed: 21000, msPerDecision: 895,
    byKind: { p: { searched: 89000 }, a: { searched: 25000 } }, msMean: { p: 900, a: 880 }, fallback: { budget: 600 }, budgetRate: 0.005, ...o });
  const mk = (o = {}) => ({ id: 'j223:run-s', host: 'j223', set: SET, a: A, b: B, ah: AH, bh: BH, complete: true,
    played: GAMES, planned: GAMES, errors: 0, timeouts: 0, pairs: 2400, score: 0.5042, lo: 0.497, hi: 0.5113, elo: 2.9, eloLo: -2.1,
    eloHi: 7.9, aSearch: T({ msPerDecision: 2100, searched: 125000, msMean: { p: 2110, a: 2060 } }), bSearch: T(), ...o });
  const SD = (o = {}) => ({ purpose: 'match:j223:run-s', games: GAMES, blocks: BLOCKS, min: FIRST, max: LAST, fullBlocks: BLOCKS, otherGames: 0,
    offSet: 0, deckPairs: 30, perDeckPairMin: 160, perDeckPairMax: 160, ...o });
  const RO = (o = {}) => ({ run: 'run-s', lines: GAMES, cfgExact: GAMES, aCfg: ACFG, bCfg: BCFG, aFromPass: 0.08, aToOther: 0.06, aToPass: 0.05,
    bFromPass: 0.08, bToOther: 0.065, bToPass: 0.049, aSkipLand: 7.2, bSkipLand: 7.2, aRolloutsPerDecision: 16.2, bRolloutsPerDecision: 16.5,
    aRoundsPerDecision: 6.2, bRoundsPerDecision: 6.4, aShortShare: 0.045, bShortShare: 0.027, aPlayMsPerRollout: 115, bPlayMsPerRollout: 46,
    aCopyMsPerRollout: 4.1, bCopyMsPerRollout: 3.9, aStepCap: 0, bStepCap: 0, ...o });
  const EX = (o = {}) => ({ run: 'run-s', lines: GAMES, games: GAMES, stackwinWindows: 9100, stackwinCands: 27300, stackwinChanged: 1100,
    stackwinRetry: 3, passwinWindows: 2900, passwinCands: 6100, passwinChanged: 340, passwinRetry: 0, dactivWindows: 4800, dactivCands: 5200,
    dactivChanged: 560, dactivRetry: 1, unionChanged: 2000, refused: 900, refusalShare: 0.09, refusedReasons: { faceDown: 30, verify: 2 },
    ownAim: 40, sameHost: 2100, dactivListed: 5200, memoryRestored: 3900, stackwinOppPassed: 8000, passwinOppPassed: 1900,
    declinedInstantWindows: 600, declinedWindows: 16800, instantWindows: 9100, bNew: 6, bD540: 4,
    bWideOpen: 1, bStackwinWindows: 8300, bStackwinChanged: 1000, bStackwinRetry: 0, bPasswinWindows: 2100, bPasswinChanged: 200,
    bPasswinRetry: 0, bDactivWindows: 8600, bDactivChanged: 450, bDactivRetry: 2, bUnionChanged: 1650, bRefused: 700,
    aLands: 0, aLandsClean: 1, bLands: 0, bLandsClean: 1, landsClean: 1, ...o });
  // the pairs reader's file: by default the pairs that reproduce the case's line (se from its interval)
  const PRof = (m, o = {}) => ({ purpose: `match:${m.id}`, pairs: m.pairs, games: m.played, score: m.score, lo: m.lo, hi: m.hi,
    se: typeof m.hi === 'number' && typeof m.lo === 'number' ? (m.hi - m.lo) / 3.92 : null, ...o });
  const C = (m = {}, bs = {}, ro = {}, ex = {}, pr = {}) => { const mm = mk(m); return { m: mm, bs: SD(bs), ro: RO(ro), ex: EX(ex), pr: PRof(mm, pr) }; };
  const flags = (r) => [r.shown, r.smallGain, r.inconclusive4800, r.notShown, r.notRead, r.notPlayed, r.incomplete];
  const exactlyOne = (r) => flags(r).reduce((t, x) => t + x, 0) === 1 && r.recDeep + r.recStay + r.recOpen === 1
    && r.liveSeatChanged === 0;
  const one = (r) => exactlyOne(r) && r.complete === 1 && r.shown + r.smallGain + r.inconclusive4800 + r.notShown === 1
    && r.indistinguishable + r.measuredLoss + r.measuredGain === 1 && r.aloneGain === r.shown + r.smallGain
    && r.recDeep === r.aloneGain && r.recStay === 1 - r.aloneGain && r.recOpen === 0;
  const noReading = (r) => r.complete === 0 && r.shown + r.smallGain + r.inconclusive4800 + r.notShown + r.aloneGain
    + r.indistinguishable + r.measuredLoss + r.measuredGain + r.recDeep + r.recStay === 0 && r.recOpen === 1
    && r.reading === null && r.liveSeatChanged === 0 && r.line.includes('is OPEN');
  const none = (r) => noReading(r) && exactlyOne(r) && r.incomplete === 1 && r.notRead === 0 && r.notPlayed === 0 && r.outcome === 'INCOMPLETE'
    && (r.owedDecision === 1 ? r.line.includes('owed: a new decision') : r.line.includes('owed: a repost'));
  const nread = (r) => noReading(r) && exactlyOne(r) && r.notRead === 1 && r.outcome === 'NOT READ' && r.line.includes('not played on the confirm set again without a new decision');
  const recommend = (r) => r.recDeep === 1 && r.recommendation === 'RECOMMEND' && r.line.includes('is RECOMMEND') && r.line.includes('the live seat become search-v3-wide-t1-x2 at a 3 s clock') && r.line.includes('the clock and the adoption are the owner') && r.line.includes('on the confirm set');
  const stays = (r) => r.recStay === 1 && r.recommendation === 'STAYS' && r.line.includes('is STAYS') && r.line.includes('search-v3-wide stays the live seat and the 3 s clock is not recommended');
  const SG8 = { score: 0.5115, lo: 0.5037, hi: 0.5193, elo: 8, eloLo: 2.6, eloHi: 13.4 };
  const SH20 = { score: 0.5288, lo: 0.521, hi: 0.5366, elo: 20, eloLo: 14.6, eloHi: 25.4 };
  const cases = [
    ['J197-like +2.9 [-2.1, +7.9], lo 0.4970: NOT SHOWN, indistinguishable; search-v3-wide stays', C(), (r) => r.notShown === 1 && one(r) && r.indistinguishable === 1 && stays(r)],
    ['+20 [+14.6, +25.4], lo 0.5210: SHOWN, a measured gain, the 3 s seat recommended', C(SH20), (r) => r.shown === 1 && one(r) && r.measuredGain === 1 && recommend(r)],
    ['+8 [+2.6, +13.4], lo 0.5037: SMALL GAIN, a measured gain, the 3 s seat recommended', C(SG8), (r) => r.smallGain === 1 && one(r) && r.measuredGain === 1 && recommend(r)],
    ['J220\'s line (0.5204 [0.5112, 0.5296], +14.2) as J223\'s: SMALL GAIN, recommended', C({ score: 0.5204, lo: 0.5112, hi: 0.5296, elo: 14.2, eloLo: 7.8, eloHi: 20.6 }), (r) => r.smallGain === 1 && one(r) && recommend(r)],
    ['J222\'s line (0.5298 [0.5203, 0.5393], +20.7) as J223\'s: SHOWN, recommended', C({ score: 0.5298, lo: 0.5203, hi: 0.5393, elo: 20.7, eloLo: 14.1, eloHi: 27.3 }), (r) => r.shown === 1 && one(r) && r.measuredGain === 1 && recommend(r)],
    ['J221\'s line (0.5052 [0.4981, 0.5123], +3.6) as J223\'s: NOT SHOWN, search-v3-wide stays', C({ score: 0.5052, lo: 0.4981, hi: 0.5123, elo: 3.6, eloLo: -1.3, eloHi: 8.6 }), (r) => r.notShown === 1 && one(r) && stays(r)],
    ['J217\'s line (0.51 [0.5021, 0.5179], +6.9) as J223\'s: SMALL GAIN, recommended', C({ score: 0.51, lo: 0.5021, hi: 0.5179, elo: 6.9, eloLo: 1.5, eloHi: 12.4 }), (r) => r.smallGain === 1 && one(r) && recommend(r)],
    ['an Elo point of exactly 15.0 with lo above 0.5 is SHOWN', C({ score: 0.5216, lo: 0.5138, hi: 0.5294, elo: 15, eloLo: 9.6, eloHi: 20.5 }), (r) => r.shown === 1 && one(r) && recommend(r)],
    ['an Elo point of 14.9 with lo above 0.5 is SMALL GAIN', C({ score: 0.5214, lo: 0.5136, hi: 0.5292, elo: 14.9, eloLo: 9.5, eloHi: 20.4 }), (r) => r.smallGain === 1 && one(r) && recommend(r)],
    ['lo of exactly 0.5 is not above it: INCONCLUSIVE AT 4,800 when eloHi >= 15, search-v3-wide stays', C({ score: 0.5104, lo: 0.5, hi: 0.5216, elo: 7.2, eloLo: 0, eloHi: 15 }), (r) => r.inconclusive4800 === 1 && one(r) && r.aloneGain === 0 && r.indistinguishable === 1 && r.line.includes('INCONCLUSIVE AT 4,800 is information') && stays(r)],
    ['lo of exactly 0.5 with eloHi 10.6 is NOT SHOWN, not SMALL GAIN', C({ score: 0.5076, lo: 0.5, hi: 0.5153, elo: 5.3, eloLo: 0, eloHi: 10.6 }), (r) => r.notShown === 1 && one(r) && r.indistinguishable === 1 && r.measuredGain === 0 && stays(r)],
    ['lo 0.5001 is above 0.5: SMALL GAIN, recommended', C({ score: 0.5077, lo: 0.5001, hi: 0.5154, elo: 5.4, eloLo: 0.1, eloHi: 10.7 }), (r) => r.smallGain === 1 && one(r) && r.measuredGain === 1 && recommend(r)],
    ['an upper end of exactly 15.0 with lo <= 0.5 is INCONCLUSIVE AT 4,800', C({ score: 0.5104, lo: 0.4995, hi: 0.5216, elo: 7.2, eloLo: -0.3, eloHi: 15 }), (r) => r.inconclusive4800 === 1 && one(r)],
    ['an upper end of 14.9 with lo <= 0.5 is NOT SHOWN', C({ score: 0.5103, lo: 0.4994, hi: 0.5214, elo: 7.1, eloLo: -0.4, eloHi: 14.9 }), (r) => r.notShown === 1 && one(r)],
    ['-12 [-17.3, -6.7]: NOT SHOWN, a measured loss, search-v3-wide stays', C({ score: 0.4827, lo: 0.4751, hi: 0.4904, elo: -12, eloLo: -17.3, eloHi: -6.7 }), (r) => r.notShown === 1 && r.measuredLoss === 1 && one(r) && stays(r)],
    ['an upper end of exactly 0 holds 0: indistinguishable, not a loss', C({ score: 0.4924, lo: 0.4847, hi: 0.5, elo: -5.3, eloLo: -10.6, eloHi: 0 }), (r) => r.indistinguishable === 1 && r.measuredLoss === 0 && r.notShown === 1 && one(r)],
    ['a stopped match (complete: false, 3,600 played) is INCOMPLETE: no reading, OPEN', C({ complete: false, played: 3600 }, {}, {}, { games: 3600, lines: 3600 }), (r) => none(r) && r.stackwinWindowsPerGame === 2.528 && r.line.includes('STOPPED') && r.owedDecision === 0],
    ['cut short AND under the rate: INCOMPLETE, not NOT READ, its rates reported', C({ complete: false, played: 3600 }, {}, {}, { games: 3600, lines: 3600, unionChanged: 40 }), (r) => none(r) && r.unionChangedPerGame === 0.011 && r.notRead === 0],
    ['complete: true but 4,799 games is INCOMPLETE', C({ played: 4799 }), (r) => none(r)],
    ['241 errors and timeouts is INCOMPLETE; 240 is complete', C({ errors: 200, timeouts: 41 }), (r) => none(r) && r.line.includes('OVER 240') && one(verdict(mk({ errors: 200, timeouts: 40 }), SD(), RO(), EX(), PRof(mk())))],
    ['a line without eloHi is INCOMPLETE', C({ eloHi: null }), (r) => none(r)],
    ['a line on the dev set is INCOMPLETE (not the confirm set)', C({ set: 'tools/ai-bench/pairs-dev.txt' }), (r) => r.setOk === 0 && none(r) && r.line.includes('NOT THE CONFIRM SET')],
    ['a line with no set is INCOMPLETE', C({ set: undefined }), (r) => r.setOk === 0 && none(r)],
    ['4 rows of the match on another set is INCOMPLETE', C({}, { offSet: 4 }), (r) => r.setOk === 0 && none(r)],
    ['the players swapped is not this match', C({ a: B, b: A, ah: BH, bh: AH }), (r) => r.names === 0 && none(r)],
    ['J222\'s match (B search-v3-declined-instant at its hash) is not this match', C({ b: 'search-v3-declined-instant', bh: 'af6771947a25' }), (r) => r.names === 0 && none(r)],
    ['B named search-v3-wide at search-v3-declined-instant\'s hash is not these players', C({ bh: 'af6771947a25' }), (r) => r.names === 1 && r.hashes === 0 && none(r)],
    ['search-v3-declined-instant-t1-x2 (J220\'s A) at its hash is not this match', C({ a: 'search-v3-declined-instant-t1-x2', ah: '5319a60d7e3b' }), (r) => r.names === 0 && none(r)],
    ['A at search-v3-wide\'s hash is not this match', C({ ah: 'b95340935592' }), (r) => r.hashes === 0 && none(r)],
    ['B the old live seat search-v2-no-b at its hash is not this match', C({ b: 'search-v2-no-b', bh: '59505e241363' }), (r) => r.names === 0 && none(r)],
    ['A that searched a block is INCOMPLETE', C({ aSearch: T({ byKind: { p: { searched: 99000 }, a: { searched: 26000 }, b: { searched: 3 } } }) }), (r) => r.kindsOk === 0 && none(r)],
    ['B that searched no attack is INCOMPLETE', C({ bSearch: T({ byKind: { p: { searched: 89000 } } }) }), (r) => r.kindsOk === 0 && none(r)],
    ['no block file is INCOMPLETE', { m: mk(), bs: null, ro: RO(), ex: EX(), pr: PRof(mk()) }, (r) => r.blocks === 0 && r.setOk === 0 && none(r)],
    ['599 blocks is not the registered 600', C({}, { blocks: 599 }), (r) => r.blocks === 0 && none(r)],
    ['J222\'s blocks (508,900,000 on) are not this match\'s', C({}, { min: 508900000, max: 508900599 }), (r) => none(r)],
    ['J220\'s blocks (302,900,000 on, the confirm set too) are not this match\'s', C({}, { min: 302900000, max: 302900599 }), (r) => none(r)],
    ['J217\'s blocks (725,900,000 on, the confirm set too) are not this match\'s', C({}, { min: 725900000, max: 725900599 }), (r) => none(r)],
    ['the pilot host\'s blocks (548,900,000 on) are not this match\'s', C({}, { min: 548900000, max: 548900599 }), (r) => none(r)],
    ['another match\'s game in the folder is INCOMPLETE', C({}, { otherGames: 4 }), (r) => none(r)],
    ['a block file for another match is INCOMPLETE', C({}, { purpose: 'match:j223:run-x' }), (r) => none(r)],
    ['a batch line with another seat config is INCOMPLETE', C({}, {}, { cfgExact: 4799 }), (r) => r.cfgs === 0 && none(r)],
    ['B at search-v3-declined-instant\'s seat config (no window keys) is INCOMPLETE', C({}, {}, { bCfg: 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1' }), (r) => r.cfgs === 0 && none(r)],
    ['A at search-v3-wide\'s seat config (B\'s: 1.5 s, turns=0) is INCOMPLETE', C({}, {}, { aCfg: 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1' }), (r) => r.cfgs === 0 && none(r)],
    ['A at search-v3-declined-instant-t1-x2\'s seat config (no window keys) is INCOMPLETE', C({}, {}, { aCfg: 'Default+outlets+search:ms=3000,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1' }), (r) => r.cfgs === 0 && none(r)],
    ['no rollout file is INCOMPLETE', { m: mk(), bs: SD(), ro: null, ex: EX(), pr: PRof(mk()) }, (r) => r.cfgs === 0 && r.horizonTrace === 0 && none(r)],
    ['a rollout file of another run is INCOMPLETE', C({}, {}, { run: 'run-x' }), (r) => r.horizonTrace === 0 && none(r) && r.line.includes('NO ROLLOUT READ')],
    ['no match file is INCOMPLETE', { m: null, bs: SD(), ro: RO(), ex: EX(), pr: null }, (r) => r.match === 0 && none(r) && r.line.includes('NO MATCH')],
    ['no exposure file is INCOMPLETE, not NOT READ', { m: mk(), bs: SD(), ro: RO(), ex: null, pr: PRof(mk()) }, (r) => r.exposureRead === 0 && none(r) && r.stackwinWindows === null],
    ['an exposure file of another run is INCOMPLETE', C({}, {}, {}, { run: 'run-x' }), (r) => r.exposureRead === 0 && none(r)],
    ['an exposure file that read 4,792 lines is INCOMPLETE', C({}, {}, {}, { games: 4792, lines: 4792 }), (r) => r.exposureRead === 0 && none(r)],
    ['no pairs file is INCOMPLETE', { m: mk(), bs: SD(), ro: RO(), ex: EX(), pr: null }, (r) => r.pairsOk === 0 && none(r) && r.line.includes('REBUILT PAIRS')],
    ['pairs whose score does not round to the line\'s is INCOMPLETE', C({}, {}, {}, {}, { score: 0.50431 }), (r) => r.pairsOk === 0 && none(r)],
    ['pairs of another match is INCOMPLETE', C({}, {}, {}, {}, { purpose: 'match:j223:run-x' }), (r) => r.pairsOk === 0 && none(r)],
    ['2,399 pairs against the line\'s 2,400 is INCOMPLETE', C({}, {}, {}, {}, { pairs: 2399 }), (r) => r.pairsOk === 0 && none(r)],
    ['pairs with no standard error is INCOMPLETE', C({}, {}, {}, {}, { se: null }), (r) => r.pairsOk === 0 && none(r)],
    ['the union at 1,199 changes (0.25 less one) is NOT READ, its rate reported, OPEN', C({}, {}, {}, { unionChanged: 1199 }), (r) => nread(r) && r.exposed === 0 && r.unionChangedPerGame === 0.25 && r.line.includes('changed 1199 decisions')],
    ['the union at exactly 1,200 changes (0.25 a game) is read', C({}, {}, {}, { unionChanged: 1200 }), (r) => one(r) && r.exposed === 1 && r.notShown === 1],
    ['the union under the rate is NOT READ even with a SHOWN line', C(SH20, {}, {}, { unionChanged: 300 }), (r) => nread(r) && r.recDeep === 0],
    ['passwin under its 0.10 floor (479 windows) is named unexposed and changes no reading', C(SG8, {}, {}, { passwinWindows: 479 }), (r) => r.smallGain === 1 && one(r) && r.passwinFloor === 0 && r.stackwinFloor === 1 && r.dactivFloor === 1 && r.unexposed.length === 1 && r.line.includes('unexposed, so not judged: passwin') && recommend(r)],
    ['passwin at exactly 480 windows (0.10 a game) and dactiv at exactly 1,200 (0.25) reach their floors', C({}, {}, {}, { passwinWindows: 480, dactivWindows: 1200 }), (r) => r.passwinFloor === 1 && r.dactivFloor === 1 && r.unexposed.length === 0 && one(r)],
    ['B with no stack window over the match is INCOMPLETE, not NOT READ, whatever the line says', C(SH20, {}, {}, { bWideOpen: 0, bStackwinWindows: 0 }), (r) => none(r) && r.bWide === 0 && r.recDeep === 0 && r.line.includes('B\'S WIDE WINDOWS DID NOT OPEN (stack 0, declined activations 8600)')],
    ['B with no declined-activation window over the match is INCOMPLETE', C({}, {}, {}, { bWideOpen: 0, bDactivWindows: 0 }), (r) => none(r) && r.bWide === 0],
    ['B\'s reader flag without its counts is not trusted: bWideOpen 1 with no stack window is INCOMPLETE', C({}, {}, {}, { bStackwinWindows: 0 }), (r) => none(r) && r.bWide === 0],
    ['B with D540 and D544 counters above 0 is B as registered (its own keys)', C({}, {}, {}, { bD540: 4, bNew: 6 }), (r) => r.bWide === 1 && one(r) && r.bNew === 6],
    ['B\'s windows closed and A under the rate is INCOMPLETE, not NOT READ', C({}, {}, {}, { unionChanged: 10, bWideOpen: 0, bDactivWindows: 0 }), (r) => none(r) && r.notRead === 0],
    ['A with a lands counter above 0 is INCOMPLETE', C({}, {}, {}, { aLands: 1, aLandsClean: 0, landsClean: 0 }), (r) => none(r) && r.landsClean === 0 && r.line.includes('A LANDS COUNTER ABOVE 0 (A 1, B 0)')],
    ['B with a lands counter above 0 is INCOMPLETE, whatever the line says', C(SH20, {}, {}, { bLands: 1, bLandsClean: 0, landsClean: 0 }), (r) => none(r) && r.landsClean === 0 && r.recDeep === 0 && r.line.includes('(A 0, B 1)')],
    ['A\'s rollouts 1.299 times B\'s are not deeper: INCOMPLETE, owed a new decision, whatever the line says', C(SH20, {}, { aPlayMsPerRollout: 64.95, bPlayMsPerRollout: 50 }), (r) => none(r) && r.horizonTrace === 0 && r.playMsRatio === 1.299 && r.line.includes('NOT DEEPER') && r.owedDecision === 1 && r.recDeep === 0],
    ['A\'s rollouts exactly 1.3 times B\'s are deeper: complete', C({}, {}, { aPlayMsPerRollout: 65, bPlayMsPerRollout: 50 }), (r) => one(r) && r.horizonTrace === 1 && r.playMsRatio === 1.3 && r.notShown === 1],
    ['a rollout file with no play time is INCOMPLETE', C({}, {}, { aPlayMsPerRollout: null }), (r) => none(r) && r.horizonTrace === 0 && r.playMsRatio === null],
    ['a short trace AND under the union\'s rate is INCOMPLETE (owed a new decision), not NOT READ', C({}, {}, { aPlayMsPerRollout: 60, bPlayMsPerRollout: 50 }, { unionChanged: 100 }), (r) => none(r) && r.notRead === 0 && r.owedDecision === 1],
    ['a stopped match with a short trace is owed a repost, not a new decision (the trace was not the only failure)', C({ complete: false, played: 3600 }, {}, { aPlayMsPerRollout: 60, bPlayMsPerRollout: 50 }, { games: 3600, lines: 3600 }), (r) => none(r) && r.owedDecision === 0],
    ['a match the pilot\'s gate kept out is NOT PLAYED, with its reason, OPEN', { m: { notPlayed: true, reason: 'search.p.dactiv.windows fired in no window of its 8 games', played: 0, complete: false }, bs: null, ro: null, ex: null, pr: null }, (r) => exactlyOne(r) && r.notPlayed === 1 && noReading(r) && r.incomplete === 0 && r.outcome === 'NOT PLAYED' && r.line.includes('fired in no window') && r.noCost === 0],
    ['A at exactly 5% over B a decision (939.75 against 895 ms) is "no cost", and changes no reading', C({ aSearch: T({ msPerDecision: 939.75, searched: 125000 }) }), (r) => r.noCost === 1 && r.line.includes('no cost: within 5%') && r.notShown === 1 && one(r)],
    ['A at 2,100 against 895 ms a decision is a cost, and changes no reading', C(), (r) => r.noCost === 0 && r.line.includes('a cost: more than 5% over B') && r.notShown === 1 && one(r)],
    ['the cost, the depth and the exposure are described and change no reading', C(), (r) => r.aSecPerGame === 54.688 && r.bSecPerGame === 21.256 && r.costRatio === 2.5728 && r.playMsRatio === 2.5 && r.aRolloutsPerDecision === 16.2 && r.aShortShare === 0.045 && r.aBudget === 600 && r.stackwinWindowsPerGame === 1.896 && r.stackwinCandsPerWindow === 3 && r.dactivChangedPerGame === 0.117 && r.unionChangedPerGame === 0.417 && r.refusalShare === 0.09 && r.refusedReasons.faceDown === 30 && r.declinedWindowsPerGame === 3.5 && r.sameHost === 2100 && r.deckPairs === 30 && r.perDeckPairMin === 160 && r.parts.J222.elo === 20.7 && r.parts.J217.elo === 6.9 && r.parts.J220.elo === 14.2 && r.bStackwinWindowsPerGame === 1.729 && r.bDactivRetryPerGame === 0 && r.bUnionChangedPerGame === 0.344 && r.line.includes('B\'s windows a game: stack 1.729') && r.notShown === 1 && one(r)],
  ];
  let ok = 0;
  cases.forEach(([what, input, pred], n) => {
    const d = path.join(scratch, `case-${n}`);
    fs.mkdirSync(d, { recursive: true });
    if (input.m != null) fs.writeFileSync(path.join(d, 'match.json'), JSON.stringify(input.m));
    if (input.bs != null) fs.writeFileSync(path.join(d, 'seeds.json'), JSON.stringify(input.bs));
    if (input.ro != null) fs.writeFileSync(path.join(d, 'rollouts.json'), JSON.stringify(input.ro));
    if (input.ex != null) fs.writeFileSync(path.join(d, 'exposure.json'), JSON.stringify(input.ex));
    if (input.pr != null) fs.writeFileSync(path.join(d, 'pairs.json'), JSON.stringify(input.pr));
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

export function load(matchFile, j223Dir) {
  return [read(matchFile), read(path.join(j223Dir, 'seeds.json')), read(path.join(j223Dir, 'rollouts.json')),
    read(path.join(j223Dir, 'exposure.json')), read(path.join(j223Dir, 'pairs.json'))];
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
  console.error('usage: node verdict.mjs <match.json> <j223 dir> <out.json> | --selftest <dir>');
  process.exit(2);
}
J223EOF
cat > var/j223-tools/rollouts.cjs <<'J223EOF'
// J223: J222's rollout reader (J221's, J220's, J217's, J215's, J214's and J212's before it), unchanged but for these lines. Its
// play time a finished rollout, A's over B's (`playMsRatio`), is the horizon's trace D551 point 4 reads (D547 point 3;
// J220 x2.562, J222 x2.585, J218 x2.84; here B is wide too, at turns=0). For each side of one
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
J223EOF
cat > var/j223-tools/seeds.cjs <<'J223EOF'
// J223: J222's block reader (J216's, J215's, J214's and J212's before it), unchanged but for these lines and its set:
// which deal blocks a match played (D398 point 2: a match takes its matchup's next unused blocks from its host
// name's match base; D551 point 3: under --host j223 in an emptied folder those are 405,900,000-405,900,599), and on
// which set. Reads every results line of <ladder dir>/results/*.jsonl whose purpose is a match's, and reports for the
// match's own `match:<id>` (the id in <match.json>; none when the file is absent or has no id) its games, its distinct
// blocks (`bseed`), their lowest and highest and how many of them hold exactly 8 games, how many match games in the
// folder belong to any other match (expected 0: the folder is the match's own), how many of its own games name a set
// other than tools/ai-bench/pairs-confirm.txt (`offSet`, expected 0, D548 point 5), and, as description, its distinct deck
// pairs and the fewest and most games any one of them played (30 and 160 each for the registered match).
// usage: node seeds.cjs <ladder dir> <match.json | none> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const SET = 'tools/ai-bench/pairs-confirm.txt';
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
  registered: b.length === 600 && b[0] === 405900000 && b[b.length - 1] === 405900599 && otherGames === 0 && offSet === 0 ? 1 : 0 };
fs.writeFileSync(out, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J223EOF
cat > var/j223-tools/records.cjs <<'J223EOF'
// J223's recording reader: J222's records.cjs, unchanged but for its names (J221's, J217's, J215's, J214's and J212's before it), widened for D544's stack windows (D544
// point 19): a searched priority decision on a stack is its own class, and the one count that must be 0 is `ownTop`;
// with J220's horizon read flat (D547 point 10, D551 point 10): `pH1` and `aH1`, the searched priority and attack
// decisions whose record carries horizon 1, and `hOther`, the searched decisions of any kind at another horizon (A must
// have none: its rollouts were given turns=1, attacks following it), and the bench lines' search counters for config
// A summed (`benchShort`, search.anytime.short; `benchDecisions`, search.p/a/b.considered; `benchRollouts`,
// `benchPlayUs`) and the longest game (`benchMaxMs`). It reads the gzipped seat logs `ai-bench.sh play --record-all`
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
    stackwinRefused: bc('stackwin', 'refused'), landsRetry: bc('lands', 'retry'),
    declinedRetry: bc('declined', 'retry'), instantRetry: bc('instant', 'retry') });
  // D547 point 10 (D551 point 10): the horizon each searched decision's rollouts were given, by kind
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
    shard({ ms: 61000, aStats: { counts: { 'search.p.stackwin.windows': 2, 'search.p.stackwin.cands': 4, 'search.p.stackwin.retry': 1, 'search.p.declined.retry': 2, 'search.p.considered': 9, 'search.a.considered': 3, 'search.anytime.short': 2, 'search.rollouts': 200, 'search.playUs': 23000000 } } }),
    shard({ ms: 95000, error: 'java.lang.IllegalStateException', aStats: { counts: { 'search.p.stackwin.windows': 1, 'search.p.stackwin.refused': 1, 'search.p.considered': 4, 'search.anytime.short': 1 } } }),
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
    ['the bench counters: stackwin windows 3, retry 1, refused 1, cands 4; declined retry 2; no other key; search.p.considered not a key counter', r.stackwinWindows === 3 && r.stackwinRetry === 1 && r.stackwinRefused === 1 && r.bench.counts['search.p.stackwin.cands'] === 4 && r.declinedRetry === 2 && r.instantRetry === 0 && r.dactivWindows === 0 && r.passwinWindows === 0 && r.landsWindows === 0 && r.bench.counts['search.p.considered'] === undefined],
    ['the horizons: five priority decisions at 1, the attack at 0 (one at another horizon)', r.pH1 === 5 && r.aH1 === 0 && r.bH1 === 0 && r.hOther === 1 && r.kinds.a.horizon['0'] === 1],
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
J223EOF
cat > var/j223-tools/gate.cjs <<'J223EOF'
// J223's gate (D551 point 10: J222's gate, D549 point 10's, unchanged in what it gates; D548 point 13's and D544 point
// 19's joined with D547 point 10's), after the pilot's games. Every condition reads A's side: B is search-v3-wide, its
// windows are its own config, and B's windows in the 4 ladder games are reported beside the gate and never gate it
// (D551 point 10: D549's B-clean night stop is gone, and a gate on B's windows in 4 games would keep a sound match
// out about 17% of the time). The match is played only if, over A's 4 ladder games against B and its 4 recorded games
// against Forge Default:
//   the wide windows open: (1) search.p.stackwin.windows summed is above 0 and search.p.dactiv.windows summed is above 0
//       (search.p.passwin.windows is reported and may be 0 in 8 games); (2) the three keys' retries together are at
//       most 2 a game; (3) the stack windows refused are under half of those met (refused / (refused + stackwin
//       windows) < 0.5);
//   the rollouts are deeper: (4) in A's recorded decision records every searched priority and attack decision carries
//       horizon 1 (pH1 and aH1 above 0, hOther 0), and in the 4 ladder games A's ms of play a finished rollout is at
//       least 1.3 times B's (in integer thousandths of the ratio); (5) A's searched decisions decided on fewer than 2
//       paired rounds are at most 15%: search.anytime.short summed against search.p.considered + search.a.considered
//       + search.b.considered summed, over the ladder games' batch lines (A's side) and the recorded games' bench lines
//       (config A), compared in integers (short x 100 <= 15 x decisions) and with at least one decision;
//   and (6) none of the 8 games ended in an engine error or a timeout; (7) A's search.p.declined.retry and
//       search.p.instant.retry together are at most 2 a game (J215's bar).
// Both pilot runs must have played their 4 games. It reads:
//   var/ai-ladder-pilot/J223/match.json        the ladder match line (played, complete, errors, timeouts, its id);
//   var/ai-ladder-pilot/J223/results/*.jsonl   its result rows (the longest game, described);
//   var/j223-tools/pilot-exposure.json         the exposure reader on that match (A's counters, summed; `a` holds every
//                                              D540 and D544 counter, the declined and instant retries among them);
//   var/j223-tools/rollouts-pilot.json         the rollout reader on that match (A's short and decisions, both sides'
//                                              play time a rollout);
//   var/ai-bench/j223-pilot-rec/shard-*.jsonl  the recorded run's bench lines (error, timeout, ms, aStats: config A is
//                                              the new player's seat);
//   var/j223-tools/rec-pilot.json              the recording reader on that run (the horizons).
// Writes var/j223-tools/gate.json {written, play: 1|0, reason, and its numbers}. The pilot fails on none of this: a
// match the gate keeps out is NOT PLAYED and the report says why.
// usage: node gate.cjs [root]   (every path above is under root; '.' by default)
const fs = require('fs');
const path = require('path');
const root = process.argv[2] || '.';
const P = (...x) => path.join(root, ...x);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const n = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const m = read(P('var/ai-ladder-pilot', 'J223', 'match.json'));
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : null;
const ex = read(P('var/j223-tools', 'pilot-exposure.json'));
const exOk = ex !== null && run !== null && ex.run === run;
const ro = read(P('var/j223-tools', 'rollouts-pilot.json'));
const roOk = ro !== null && run !== null && ro.run === run;
const rc = read(P('var/j223-tools', 'rec-pilot.json'));
const rcOk = rc !== null && rc.written === 1;
const bdir = P('var/ai-bench', 'j223-pilot-rec');
const K = ['stackwin', 'passwin', 'dactiv'], K2 = ['declined', 'instant'];
let bGames = 0, bErr = 0, bTo = 0, bRefused = 0, bShort = 0, bDec = 0, bRetry2 = 0, bMax = 0;
const bW = { stackwin: 0, passwin: 0, dactiv: 0 }, bR = { stackwin: 0, passwin: 0, dactiv: 0 };
for (const f of fs.existsSync(bdir) ? fs.readdirSync(bdir).filter((x) => /^shard-\d+\.jsonl$/.test(x)) : []) {
  for (const line of fs.readFileSync(path.join(bdir, f), 'utf8').split('\n')) {
    let l; try { l = JSON.parse(line); } catch { continue; }
    bGames++;
    if (l.error !== '' && l.error !== null && l.error !== undefined && l.error !== false) bErr++;
    if (l.timeout === true) bTo++;
    if (n(l.ms) > bMax) bMax = n(l.ms);
    const c = (l.aStats && l.aStats.counts) || {};
    for (const k of K) { bW[k] += n(c[`search.p.${k}.windows`]); bR[k] += n(c[`search.p.${k}.retry`]); }
    bRefused += n(c['search.p.stackwin.refused']);
    bShort += n(c['search.anytime.short']);
    bDec += n(c['search.p.considered']) + n(c['search.a.considered']) + n(c['search.b.considered']);
    for (const k of K2) bRetry2 += n(c[`search.p.${k}.retry`]);
  }
}
let lMax = 0;
const rdir = P('var/ai-ladder-pilot', 'J223', 'results');
for (const f of fs.existsSync(rdir) ? fs.readdirSync(rdir).filter((x) => x.endsWith('.jsonl')) : []) {
  for (const line of fs.readFileSync(path.join(rdir, f), 'utf8').split('\n')) {
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (n(r.ms) > lMax) lMax = n(r.ms);
  }
}
const lGames = m ? n(m.played) : 0, lBad = m ? n(m.errors) + n(m.timeouts) : 0;
const lW = {}, lR = {};
for (const k of K) { lW[k] = exOk ? n(ex[`${k}Windows`]) : 0; lR[k] = exOk ? n(ex[`${k}Retry`]) : 0; }
const lRefused = exOk ? n(ex.refused) : 0;
// B's windows in the 4 ladder games: description only
const bLW = Object.fromEntries(K.map((k) => [k, exOk ? n(ex[`b${k[0].toUpperCase()}${k.slice(1)}Windows`]) : 0]));
const lRetry2 = exOk && ex.a ? K2.reduce((t, k) => t + n(ex.a[`search.p.${k}.retry`]), 0) : 0;
const lShort = roOk ? n(ro.aShort) : 0, lDec = roOk ? n(ro.aDecisions) : 0;
const games = lGames + bGames, bad = lBad + bErr + bTo;
const windows = Object.fromEntries(K.map((k) => [k, lW[k] + bW[k]]));
const retry = K.reduce((t, k) => t + lR[k] + bR[k], 0);
const retry2 = lRetry2 + bRetry2;
const refused = lRefused + bRefused;
const share = refused + windows.stackwin > 0 ? Math.round((refused / (refused + windows.stackwin)) * 1000) / 1000 : 0;
const short = lShort + bShort, decisions = lDec + bDec;
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
// the wide windows open
for (const k of ['stackwin', 'dactiv']) if (windows[k] <= 0) why.push(`search.p.${k}.windows fired in no window of its ${games} games`);
if (retry > 2 * games) why.push(`the three keys' retries ${retry} over ${games} games, above 2 a game`);
if (refused * 2 >= refused + windows.stackwin && refused > 0) why.push(`stack windows refused ${refused} against ${windows.stackwin} searched, a share of ${share}, not under one half`);
// the rollouts are deeper
if (decisions <= 0) why.push('A searched no decision');
else if (short * 100 > 15 * decisions) why.push(`${short} of A's ${decisions} searched decisions short of two rounds, above 15%`);
if (rcOk && (pH1 <= 0 || aH1 <= 0)) why.push(`A's records hold ${pH1} searched priority and ${aH1} searched attack decisions at horizon 1; each must be above 0`);
if (rcOk && hOther > 0) why.push(`${hOther} of A's searched decisions at a horizon other than 1`);
if (roOk && (playMsRatio === null || Math.round(playMsRatio * 1000) < 1300)) why.push(`A's ms of play a rollout x${playMsRatio} of B's in the ladder games, under 1.3`);
if (retry2 > 2 * games) why.push(`search.p.declined.retry and search.p.instant.retry ${retry2} over ${games} games, above 2 a game`);
const wideOpen = windows.stackwin > 0 && windows.dactiv > 0 && retry <= 2 * games && !(refused * 2 >= refused + windows.stackwin && refused > 0) ? 1 : 0;
const deeper = rcOk && roOk && pH1 > 0 && aH1 > 0 && hOther === 0 && playMsRatio !== null && Math.round(playMsRatio * 1000) >= 1300
  && decisions > 0 && short * 100 <= 15 * decisions ? 1 : 0;
const out = { written: 1, play: why.length === 0 ? 1 : 0, reason: why.length === 0 ? null : why.join('; '), wideOpen, deeper,
  ladderGames: lGames, benchGames: bGames, games, errorsTimeouts: bad,
  ladderStackwinWindows: lW.stackwin, benchStackwinWindows: bW.stackwin, stackwinWindows: windows.stackwin,
  ladderPasswinWindows: lW.passwin, benchPasswinWindows: bW.passwin, passwinWindows: windows.passwin,
  ladderDactivWindows: lW.dactiv, benchDactivWindows: bW.dactiv, dactivWindows: windows.dactiv,
  bLadderStackwinWindows: bLW.stackwin, bLadderPasswinWindows: bLW.passwin, bLadderDactivWindows: bLW.dactiv,
  refused, refusalShare: share, retry, retryPerGame: games ? Math.round((retry / games) * 1000) / 1000 : null,
  retry2, retry2PerGame: games ? Math.round((retry2 / games) * 1000) / 1000 : null,
  ladderShort: lShort, ladderDecisions: lDec, benchShort: bShort, benchDecisions: bDec, short, decisions,
  shortShare: decisions ? Math.round((short / decisions) * 10000) / 10000 : null,
  pH1, aH1, hOther, aPlayMsPerRollout: aPlay, bPlayMsPerRollout: bPlay, playMsRatio,
  longestLadderMs: lMax, longestBenchMs: bMax, longestMs: Math.max(lMax, bMax) };
fs.mkdirSync(P('var/j223-tools'), { recursive: true });
fs.writeFileSync(P('var/j223-tools', 'gate.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out));
J223EOF
cat > var/j223-tools/pairs.mjs <<'J223EOF'
// J223's pairs reader (D551 point 4, D548 point 5): J222's (J221's and J216's before it), unchanged but for these
// lines. The match's mirrored pairs rebuilt from its result rows with the ladder's own functions -- results.ts's
// blockKey, sprt.ts's pairScores and match.ts's matchSummary, as cmdMatch calls them -- so the line is checked against
// its own rows; J223 has no pooled line (D551 point 8). A row is the match's when its purpose is the match line's
// `match:<id>`; A won it when it is decisive and its winner is the side whose hash is A's (the ladder names a finished
// game's sides by hash). Reports the pairs, games, score, se, lo, hi and Elo, unrounded, and whether they round to the
// match line's (`agree`: pairs equal, and score, lo and hi equal at four places, as the line rounds them). Beside them,
// as description only (D551 point 9): `timeouts`, the match's rows that ended at the game timeout, and `toLoss`, the
// same summary with every timed-out row counted as A's loss (nothing reads it but the summary).
// usage: node pairs.mjs <ladder dir> <match.json> <out.json>        node pairs.mjs --selftest <scratch dir>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const imp = (f) => import(pathToFileURL(path.resolve(f)).href);
const { blockKey } = await imp('tools/ai-ladder/results.ts');
const { pairScores } = await imp('tools/ai-ladder/sprt.ts');
const { matchSummary } = await imp('tools/ai-ladder/match.ts');
const AH = '709c83cc4d48';
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const r4 = (x) => (typeof x === 'number' && Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : null);

export function rebuild(dir, m) {
  const purpose = m && typeof m.id === 'string' ? `match:${m.id}` : null;
  const rows = [];
  const rdir = path.join(dir, 'results');
  for (const f of fs.existsSync(rdir) ? fs.readdirSync(rdir).filter((x) => x.endsWith('.jsonl')) : []) {
    for (const line of fs.readFileSync(path.join(rdir, f), 'utf8').split('\n')) {
      if (!line.includes('"purpose":"match:')) continue;
      let r; try { r = JSON.parse(line); } catch { continue; }
      if (purpose !== null && r.purpose === purpose) rows.push(r);
    }
  }
  const won = (r) => (r.w === 'd' ? null : (r.w === 'a') === (String(r.ah) === AH));
  const s = matchSummary(pairScores(rows.map((r) => ({ block: blockKey(r), aWon: won(r) }))));
  const t = matchSummary(pairScores(rows.map((r) => ({ block: blockKey(r), aWon: r.timeout === true ? false : won(r) }))));
  const out = { purpose, rows: rows.length, pairs: s.pairs, games: s.games, score: s.score, se: s.se, lo: s.lo, hi: s.hi,
    elo: s.elo, eloLo: s.eloLo, eloHi: s.eloHi, timeouts: rows.filter((r) => r.timeout === true).length,
    toLoss: { pairs: t.pairs, score: t.score, lo: t.lo, hi: t.hi, elo: t.elo, eloLo: t.eloLo, eloHi: t.eloHi } };
  out.agree = m !== null && purpose !== null && s.se !== null && s.pairs === m.pairs && r4(s.score) === m.score
    && r4(s.lo) === m.lo && r4(s.hi) === m.hi ? 1 : 0;
  return out;
}

function selftest(scratch) {
  fs.rmSync(scratch, { recursive: true, force: true });
  fs.mkdirSync(path.join(scratch, 'results'), { recursive: true });
  // three mirrored pairs (g 0-3 of one batch pair is two pairs: g 0 and 3, g 1 and 2) and a third in another batch:
  // A (by hash) wins both of pair 1, splits pair 2, loses both of pair 3; a draw in a fourth pair is dropped; a row of
  // another match is not read. A is config a in some rows and config b in others. One of A's wins (pair 2's) is a
  // timeout, which toLoss counts as A's loss.
  const row = (o) => JSON.stringify({ purpose: 'match:j223:run-t', host: 'j223', run: 'run-t', ah: AH, bh: 'bbbbbbbbbbbb', ...o });
  const swap = { ah: 'bbbbbbbbbbbb', bh: AH };
  const L = [
    row({ batch: 0, pair: 0, g: 0, w: 'a' }), row({ batch: 0, pair: 0, g: 3, ...swap, w: 'b' }),
    row({ batch: 0, pair: 0, g: 1, w: 'a', timeout: true }), row({ batch: 0, pair: 0, g: 2, ...swap, w: 'a' }),
    row({ batch: 1, pair: 1, g: 0, w: 'b' }), row({ batch: 1, pair: 1, g: 3, ...swap, w: 'a' }),
    row({ batch: 2, pair: 0, g: 0, w: 'd' }), row({ batch: 2, pair: 0, g: 3, ...swap, w: 'd' }),
    JSON.stringify({ purpose: 'match:j223:run-x', host: 'j223', run: 'run-x', batch: 0, pair: 0, g: 0, ah: AH, w: 'a' }),
  ];
  fs.writeFileSync(path.join(scratch, 'results', 'j223.jsonl'), L.join('\n') + '\n');
  // pair scores 1, 0.5, 0: mean 0.5, sd 0.5, se 0.5/sqrt(3); the interval, 0.5 -+ 0.566, clamped to [0, 1] as
  // matchSummary clamps it. With the timeout as A's loss: 1, 0, 0, a mean of 1/3
  const se = 0.5 / Math.sqrt(3);
  const line = { id: 'j223:run-t', pairs: 3, score: 0.5, lo: 0, hi: 1 };
  const a = rebuild(scratch, line);
  const b = rebuild(scratch, { ...line, score: 0.5001 });
  const c = rebuild(scratch, null);
  const checks = [
    ['the match\'s 8 rows read, the other match\'s not', a.rows === 8],
    ['three decisive pairs (the drawn pair dropped), six games', a.pairs === 3 && a.games === 6],
    ['score 0.5 and se 0.5/sqrt(3), A found by hash on either side', a.score === 0.5 && Math.abs(a.se - se) < 1e-12],
    ['the rebuilt pairs agree with a line that rounds the same', a.agree === 1],
    ['a line whose score differs at four places does not agree', b.agree === 0],
    ['no match line reads nothing and agrees with nothing', c.rows === 0 && c.agree === 0],
    ['one timeout, counted as A\'s loss beside it: a score of 1/3', a.timeouts === 1 && Math.abs(a.toLoss.score - 1 / 3) < 1e-12 && a.toLoss.pairs === 3],
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
} else if (argv.length === 3) {
  const r = rebuild(argv[0], read(argv[1]));
  fs.mkdirSync(path.dirname(argv[2]), { recursive: true });
  fs.writeFileSync(argv[2], JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r));
} else {
  console.error('usage: node pairs.mjs <ladder dir> <match.json> <out.json> | --selftest <dir>');
  process.exit(2);
}
J223EOF
rm -rf var/j223-tools/pairs-selftest
node var/j223-tools/pairs.mjs --selftest var/j223-tools/pairs-selftest > var/j223-tools/pairs-selftest.json || true
cat var/j223-tools/pairs-selftest.json
rm -rf var/j223-tools/selftest
node var/j223-tools/verdict.mjs --selftest var/j223-tools/selftest > var/j223-tools/selftest.json || true
cat var/j223-tools/selftest.json
rm -rf var/j223-tools/rec-selftest
node var/j223-tools/records.cjs --selftest var/j223-tools/rec-selftest > var/j223-tools/rec-selftest.json || true
cat var/j223-tools/rec-selftest.json
# the block reader on a synthetic results log: a match at two blocks over three games (two on the confirm set, one on
# the dev set: offSet 1), one game of another match (counted as other), and a pilot line that must not count at all
rm -rf var/j223-tools/seeds-selftest
mkdir -p var/j223-tools/seeds-selftest/results
printf '%s\n' '{"purpose":"match:j223:new","bseed":405900000,"set":"tools/ai-bench/pairs-confirm.txt","aDeck":"x-A.dck","bDeck":"x-B.dck"}' '{"purpose":"match:j223:new","bseed":405900001,"set":"tools/ai-bench/pairs-confirm.txt","aDeck":"x-B.dck","bDeck":"x-A.dck"}' '{"purpose":"match:j223:new","bseed":405900001,"set":"tools/ai-bench/pairs-dev.txt","aDeck":"y-A.dck","bDeck":"y-B.dck"}' '{"purpose":"match:j223:other","bseed":405900002}' '{"purpose":"pilot","bseed":5}' > var/j223-tools/seeds-selftest/results/j223.jsonl
echo '{"id":"j223:new"}' > var/j223-tools/seeds-selftest/match.json
node var/j223-tools/seeds.cjs var/j223-tools/seeds-selftest var/j223-tools/seeds-selftest/match.json var/j223-tools/seeds-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j223-tools/seeds-selftest/out.json","utf8"));const ok=r.purpose==="match:j223:new"&&r.games===3&&r.blocks===2&&r.min===405900000&&r.max===405900001&&r.fullBlocks===0&&r.otherGames===1&&r.offSet===1&&r.deckPairs===2&&r.perDeckPairMin===1&&r.perDeckPairMax===2&&r.registered===0?1:0;require("fs").writeFileSync("var/j223-tools/seeds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the rollout reader on a synthetic batch folder: two games, each side's decisions by kind, priority overrides by
# direction, land skips, and the two seat configs (one line off)
rm -rf var/j223-tools/ro-selftest
mkdir -p var/j223-tools/ro-selftest/batches/run-s
printf '%s\n' '{"a":"X","b":"Y","aStats":{"counts":{"search.rollouts":90,"search.rounds":34,"search.anytime.short":1,"search.p.considered":8,"search.a.considered":2,"search.playUs":9000000,"search.copyUs":450000,"search.p.skipLand":3,"search.p.changed.fromPass":2,"search.p.changed.toPass":1}},"bStats":{"counts":{"search.rollouts":150,"search.rounds":60,"search.p.considered":7,"search.b.considered":3,"search.playUs":7500000,"search.copyUs":750000,"search.p.changed.toOther":1}}}' '{"a":"X","b":"Z","aStats":{"counts":{"search.rollouts":96,"search.rounds":34,"search.p.considered":10,"search.playUs":9600000}},"bStats":{"counts":{"search.rollouts":158,"search.rounds":58,"search.anytime.short":1,"search.a.considered":10,"search.playUs":7900000}}}' > var/j223-tools/ro-selftest/batches/run-s/b0.jsonl
echo '{"id":"j223:run-s","a":"search-v3-wide-t1-x2","b":"search-v3-wide"}' > var/j223-tools/ro-selftest/match.json
node var/j223-tools/rollouts.cjs var/j223-tools/ro-selftest var/j223-tools/ro-selftest/match.json var/j223-tools/ro-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j223-tools/ro-selftest/out.json","utf8"));const ok=r.games===2&&r.aDecisions===20&&r.bDecisions===20&&r.aPriority===18&&r.aAttacks===2&&r.aBlocks===0&&r.bBlocks===3&&r.aRolloutsPerDecision===9.3&&r.bRolloutsPerDecision===15.4&&r.aPlayMsPerRollout===100&&r.bPlayMsPerRollout===50&&r.playMsRatio===2&&r.aCopyMsPerRollout===2.4&&r.aShortShare===0.05&&r.aFromPass===0.1111&&r.aToPass===0.0556&&r.bToOther===0.1429&&r.aSkipLandN===3&&r.aSkipLand===1.5&&r.aCfg==="X"&&r.bCfg==="MIXED"&&r.cfgExact===0?1:0;require("fs").writeFileSync("var/j223-tools/ro-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the gate on eight synthetic pilots: one passes (passwin at 0 and B's own windows at 0 do not stop it); one with B's
# windows open, reported and passing; one at exactly its depth bars (15%
# short, x1.3 play time) passes; one whose dactiv key fired in no window (the windows did not open); one starved, with
# decisions at another horizon (the rollouts not deeper); one with a timeout, too many window-key retries, no attack at
# horizon 1 and short rollouts; one with half its stack windows refused; one with too many declined and instant retries
rm -rf var/j223-tools/gate-selftest
node - <<'J223EOF'
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const R = 'var/j223-tools/gate-selftest';
const pilot = (name, { sw = 10, dw = 1, bsw = 3, bdw = 2, timeout = false, retry = 0, refused = 0, lShort = 2, bShort = 1,
  aPlay = 115, bPlay = 46, pH1 = 30, aH1 = 8, hOther = 0, r2 = 0, lr2 = 0 }) => {
  const root = `${R}/${name}`;
  const put = (f, s) => { fs.mkdirSync(path.dirname(`${root}/${f}`), { recursive: true }); fs.writeFileSync(`${root}/${f}`, s); };
  put('var/ai-ladder-pilot/J223/match.json', JSON.stringify({ id: 'j223-pilot3:run-g', complete: true, played: 4, errors: 0, timeouts: 0 }));
  put('var/ai-ladder-pilot/J223/results/j223-pilot3.jsonl', [JSON.stringify({ ms: 120000 }), JSON.stringify({ ms: 250000 })].join('\n') + '\n');
  // B's own windows are 0 in every synthetic pilot but 'bOpen': they never gate (D551 point 10)
  put('var/j223-tools/pilot-exposure.json', JSON.stringify({ run: 'run-g', stackwinWindows: sw, passwinWindows: 0, dactivWindows: dw,
    bStackwinWindows: name === 'bOpen' ? 5 : 0, bPasswinWindows: 0, bDactivWindows: name === 'bOpen' ? 2 : 0,
    stackwinRetry: retry, passwinRetry: 0, dactivRetry: retry, refused, a: { 'search.p.declined.retry': lr2, 'search.p.instant.retry': lr2 } }));
  put('var/j223-tools/rollouts-pilot.json', JSON.stringify({ run: 'run-g', aShort: lShort, aDecisions: 60, aPlayMsPerRollout: aPlay, bPlayMsPerRollout: bPlay }));
  put('var/j223-tools/rec-pilot.json', JSON.stringify({ written: 1, pH1, aH1, hOther }));
  const line = (i) => JSON.stringify({ error: '', timeout: timeout && i === 1, ms: 60000 + i * 1000, aStats: { counts: {
    'search.p.stackwin.windows': i === 0 ? bsw : 0, 'search.p.dactiv.windows': i === 0 ? bdw : 0, 'search.p.stackwin.retry': retry,
    'search.anytime.short': bShort, 'search.p.considered': 15, 'search.a.considered': 5, 'search.p.declined.retry': r2 } } });
  put('var/ai-bench/j223-pilot-rec/shard-0.jsonl', [0, 1].map(line).join('\n') + '\n');
  put('var/ai-bench/j223-pilot-rec/shard-1.jsonl', [2, 3].map(line).join('\n') + '\n');
  execFileSync(process.execPath, ['var/j223-tools/gate.cjs', root], { stdio: 'ignore' });
  return JSON.parse(fs.readFileSync(`${root}/var/j223-tools/gate.json`, 'utf8'));
};
const a = pilot('pass', { dw: 0, refused: 1 });
const e = pilot('edge', { lShort: 9, bShort: 3, aPlay: 65, bPlay: 50 });
const b = pilot('noDactiv', { dw: 0, bdw: 0 });
const f = pilot('starved', { lShort: 20, bShort: 3, hOther: 2 });
const c = pilot('bad', { sw: 2, dw: 1, timeout: true, retry: 3, aH1: 0, aPlay: 60, bPlay: 50 });
const g = pilot('refused', { sw: 3, dw: 2, bsw: 1, refused: 4 });
const h = pilot('retries2', { r2: 4, lr2: 1 });
const k = pilot('bOpen', {});
const ok = a.written === 1 && a.play === 1 && a.reason === null && a.wideOpen === 1 && a.deeper === 1 && a.stackwinWindows === 13
    && a.dactivWindows === 2 && a.passwinWindows === 0 && a.games === 8 && a.refusalShare === 0.071 && a.short === 6 && a.decisions === 140
    && a.playMsRatio === 2.5 && a.longestMs === 250000 && a.longestBenchMs === 63000
    && a.bLadderStackwinWindows === 0 && a.bLadderDactivWindows === 0
  && k.play === 1 && k.reason === null && k.bLadderStackwinWindows === 5 && k.bLadderDactivWindows === 2 && k.bLadderPasswinWindows === 0
  && e.play === 1 && e.short === 21 && e.shortShare === 0.15 && e.playMsRatio === 1.3 && e.deeper === 1
  && b.play === 0 && b.wideOpen === 0 && b.deeper === 1 && /search\.p\.dactiv\.windows fired in no window/.test(b.reason || '') && !/stackwin\.windows fired/.test(b.reason || '')
  && f.play === 0 && f.wideOpen === 1 && f.deeper === 0 && /32 of A's 140 searched decisions short of two rounds, above 15%/.test(f.reason || '') && /2 of A's searched decisions at a horizon other than 1/.test(f.reason || '') && !/x2\.5/.test(f.reason || '')
  && c.play === 0 && /1 of its 8 games/.test(c.reason || '') && /retries 18 over 8 games/.test(c.reason || '') && c.retryPerGame === 2.25
    && /0 searched attack decisions at horizon 1/.test(c.reason || '') && /x1\.2 of B's/.test(c.reason || '')
  && g.play === 0 && /refused 4 against 4 searched, a share of 0\.5/.test(g.reason || '')
  && h.play === 0 && /search\.p\.declined\.retry and search\.p\.instant\.retry 18 over 8 games, above 2 a game/.test(h.reason || '') && h.retry2PerGame === 2.25 && h.wideOpen === 1 && h.deeper === 1 ? 1 : 0;
fs.writeFileSync('var/j223-tools/gate-selftest.json', JSON.stringify({ ok }) + '\n');
console.log(JSON.stringify({ ok, pass: a, edge: e.reason, noDactiv: b.reason, starved: f.reason, bad: c.reason, refused: g.reason, retries2: h.reason, bOpen: k.reason }));
J223EOF
```
```bash
# one 4-game ladder match of A against B on the confirm set, in a pilot folder under another host (one batch pair, one
# worker; j223-pilot3 deals synergy-900000001); then its exposure (A's three keys, B's three keys and D540 counters,
# both sides' lands counters, both sides' kinds), its rollout reader (A's short decisions and both sides' play time a
# rollout, for the gate), its pairs rebuilt from its rows, and the match line's names, hashes, set and seat configs
# (numbers only, so no check reads a missing key)
mkdir -p var/j223-tools
rm -rf var/ai-ladder-pilot/J223
./tools/ai-ladder.sh match search-v3-wide-t1-x2 search-v3-wide --pairs tools/ai-bench/pairs-confirm.txt --games 4 --batch-pairs 1 --game-timeout 3600 --host j223-pilot3 --purpose pilot --dir var/ai-ladder-pilot/J223 --experiments var/ai-ladder-pilot/J223/experiments.jsonl --out var/ai-ladder-pilot/J223/match.json --jobs 1
node var/j223-tools/exposure.cjs var/ai-ladder-pilot/J223 var/ai-ladder-pilot/J223/match.json var/j223-tools/pilot-exposure.json
node var/j223-tools/rollouts.cjs var/ai-ladder-pilot/J223 var/ai-ladder-pilot/J223/match.json var/j223-tools/rollouts-pilot.json > /dev/null
node var/j223-tools/pairs.mjs var/ai-ladder-pilot/J223 var/ai-ladder-pilot/J223/match.json var/j223-tools/pairs-pilot.json
node - <<'J223EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const m = read('var/ai-ladder-pilot/J223/match.json'), ro = read('var/j223-tools/rollouts-pilot.json');
const pl = read('var/j223-tools/players.json'), px = read('var/j223-tools/pilot-exposure.json'), pr = read('var/j223-tools/pairs-pilot.json');
const n = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const k = (t, x) => n(t && t.byKind && t.byKind[x] ? t.byKind[x].searched : 0, 0);
const A = 'search-v3-wide-t1-x2', B = 'search-v3-wide';
const r = { written: 1,
  namesOk: m.a === A && m.b === B ? 1 : 0,
  hashesOk: String(m.ah) === '709c83cc4d48' && String(m.bh) === 'b95340935592' ? 1 : 0,
  setOk: m.set === 'tools/ai-bench/pairs-confirm.txt' ? 1 : 0,
  cfgOk: pl.cfgs && ro.aCfg === pl.cfgs[A] && ro.bCfg === pl.cfgs[B] && ro.cfgExact === ro.lines && ro.lines === 4 ? 1 : 0,
  // B is search-v3-wide (D551 point 10): its windows in these 4 games are reported, never checked
  bStackwinWindows: n(px.bStackwinWindows, -1), bPasswinWindows: n(px.bPasswinWindows, -1), bDactivWindows: n(px.bDactivWindows, -1),
  bUnionChanged: n(px.bUnionChanged, -1),
  pairsAgree: pr.agree === 1 && pr.rows === 4 ? 1 : 0,
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
fs.writeFileSync('var/j223-tools/pilot.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J223EOF
```
```bash
# one recorded run of 4 games against Forge Default on the confirm set's modern-era-900000001, chosen by name (D551
# point 3: in J217's 4,800 games its decks opened stack windows in 0.656 of the games and declined-activation windows
# in 0.700; the rates were read, the scores were not), two workers: each searched decision's horizon by kind, the
# searched priority decisions by window (own main, land, instant-speed or pass window, stack) and their ms by candidate
# count from the search seat's decision records, with the bench lines' D540, D544 and search counters (records.cjs
# above); then the gate
mkdir -p var/j223-tools
grep -F 'tools/ai-bench/decks/sets/modern-era-900000001-A.dck' tools/ai-bench/pairs-confirm.txt > var/j223-tools/pair1.txt
cat var/j223-tools/pair1.txt
test "$(grep -c . var/j223-tools/pair1.txt)" -eq 1
ACFG='Default+outlets+search:ms=3000,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1'
rm -rf var/ai-bench/j223-pilot-rec
./tools/ai-bench.sh play --pairs var/j223-tools/pair1.txt --a "$ACFG" --b Default --games 4 --seed 223000001 --timeout 3600 --jobs 2 --run j223-pilot-rec --record-all
node var/j223-tools/records.cjs var/ai-bench/j223-pilot-rec/games var/j223-tools/rec-pilot.json > /dev/null
node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("var/j223-tools/rec-pilot.json","utf8"));const o={};for(const x of ["written","files","searchLogs","bad","games","pSearched","aSearched","bSearched","pH1","aH1","bH1","hOther","ownMainSearched","landSearched","instantSearched","stackSearched","outsideOwnMain","onStack","ownTop","noState","benchGames","benchErrors","benchTimeouts","benchShort","benchDecisions","benchShortShare","benchPlayMsPerRollout","benchMaxMs","stackwinWindows","passwinWindows","dactivWindows","stackwinRefused","stackwinRetry","passwinRetry","dactivRetry","declinedRetry","instantRetry","landsWindows"])o[x]=typeof r[x]==="number"?r[x]:-1;console.log(JSON.stringify(o),JSON.stringify(r.kinds.p.horizon),JSON.stringify(r.kinds.a.horizon),JSON.stringify(r.classes),JSON.stringify(r.msByCands),JSON.stringify(r.bench.counts))'
# the gate (D551 point 10, D549 point 10's on A's side): A's wide windows open (A's stackwin and dactiv windows over
# the 4 ladder and 4 recorded games above 0, A's three keys' retries together at most 2 a game, A's stack windows
# refused under half) and A's rollouts are deeper (A's records at horizon 1, its play time a rollout at least 1.3 times
# B's, at most 15% of its decisions short of two rounds); no error or timeout in the 8; A's declined and instant retries
# at most 2 a game; B's windows reported, never gated; writes var/j223-tools/gate.json {written, play, reason}
node var/j223-tools/gate.cjs
```
metrics: merged = sh: cat var/j223-merged.txt 2>/dev/null || echo 0
metrics: dst = sh: cat var/j223-decision-selftest.json 2>/dev/null || echo '{"ok":0,"checks":0,"failures":-1}'
metrics: bst = sh: cat var/j223-tools/bench-selftest.json 2>/dev/null || echo '{"ok":0,"checks":0,"failures":-1}'
metrics: pl = sh: cat var/j223-tools/players.json 2>/dev/null || echo '{"ok":0,"present":0,"cfgs_ok":0,"literal_ok":0,"hashes_ok":0,"kinds_ok":0,"distinct":0,"wideAtDepth":0}'
metrics: sd = sh: cat var/j223-tools/src-diff.json 2>/dev/null || echo '{"rc":1,"count":-1,"exact":0,"codeLines":-1,"codeLinesOk":0,"playersOk":0,"notesChangedN":-1,"playersBefore":-1,"playersAfter":-2,"sameAsJ220":0}'
metrics: hb = sh: cat var/j223-tools/base.json 2>/dev/null || echo '{"ok":0,"own":0,"first":0,"last":0,"pilot":0,"pilotPair":-1,"setPairs":0,"perPairMin":0,"perPairMax":0}'
metrics: est = sh: cat var/j223-tools/exposure-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: st = sh: cat var/j223-tools/selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: rst = sh: cat var/j223-tools/rec-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: pst = sh: cat var/j223-tools/pairs-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: sst = sh: cat var/j223-tools/seeds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: ost = sh: cat var/j223-tools/ro-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: gst = sh: cat var/j223-tools/gate-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: px = sh: cat var/j223-tools/pilot-exposure.json 2>/dev/null || echo '{"landsClean":0,"kindsOk":0,"games":0}'
metrics: pp = sh: cat var/j223-tools/pilot.json 2>/dev/null || echo '{"written":0,"namesOk":0,"hashesOk":0,"setOk":0,"cfgOk":0,"pairsAgree":0}'
metrics: gate = sh: cat var/j223-tools/gate.json 2>/dev/null || echo '{"written":0,"play":0}'
metrics: rc = sh: cat var/j223-tools/rec-pilot.json 2>/dev/null || echo '{"written":0,"games":0,"bad":-1,"ownTop":-1,"landSearched":-1,"landsWindows":-1}'
check: merged == 1
check: dst.ok == 1
check: dst.failures == 0
check: dst.checks == 526
check: bst.ok == 1
check: bst.failures == 0
check: bst.checks == 476
check: pl.ok == 1
check: pl.present == 1
check: pl.cfgs_ok == 1
check: pl.literal_ok == 1
check: pl.hashes_ok == 1
check: pl.kinds_ok == 1
check: pl.distinct == 1
check: pl.wideAtDepth == 1
check: sd.rc == 0
check: sd.count == 6
check: sd.exact == 1
check: sd.codeLines == 6
check: sd.codeLinesOk == 1
check: sd.playersOk == 1
check: sd.sameAsJ220 == 1
check: hb.ok == 1
check: hb.own == 405000000
check: hb.first == 405900000
check: hb.last == 405900599
check: hb.pilot == 548000000
check: hb.pilotPair == 20
check: hb.setPairs == 30
check: hb.perPairMin == 40
check: hb.perPairMax == 40
check: est.ok == 1
check: est.cases == 10
check: est.passed == 10
check: st.ok == 1
check: st.cases == 76
check: st.passed == 76
check: rst.ok == 1
check: rst.cases == 16
check: pst.ok == 1
check: pst.cases == 7
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
check: pp.pairsAgree == 1
check: gate.written == 1
check: rc.written == 1
check: rc.bad == 0
check: rc.ownTop == 0
check: rc.landSearched == 0
check: rc.landsWindows == 0

The pilot asks only whether anything is broken; whether the match plays is the gate's:
- `merged`: the pinned commit is on `origin/main`;
- the build passes with the decision self-test at 0 failures and exactly 526 checks (the count D550's lane build
  printed at `cc417e4d1` on 2026-11-17: D546's 514 and D550's 12; D551 adds no source), the ai-bench self-test at 0
  failures and exactly 476 checks (its D540 and D544 lines kept in `d54x-selftest.txt`), and the ladder registry test;
- `pl`: six players resolve on this PC at their registered hashes (compared as strings), and A's ai-bench config is
  exactly search-v3-declined-instant-t1-x2's plus `,stackwin=1,passwin=1,dactiv=1`, written out (`literal_ok`) and
  built (`cfgs_ok`), and B's (search-v3-wide's) with `ms=3000` and `turns=1` and nothing else (`wideAtDepth`);
- `sd`: git answered; against J222's pin `6fd2e726d` the files changed under `bridge/src`, `tools/ai-ladder` and
  `tools/ai-bench` are exactly D550's six; the changed lines of `SearchConfig.java`, `SearchPolicy.java`,
  `MtgTable.java` and `RecordMatch.java` that are not comments are exactly six, the two live-seat constants and the
  start line's words before and after (`codeLinesOk`; read only by `parseLive`, which no ladder seat goes through);
  `players.json` is J222's pin's player for player with every field but `note` unchanged and no player added
  (`playersOk`; D550's two notes counted in `notesChangedN`); and from J220's pin `847e50a29` to J222's only
  `players.json` changed (`sameAsJ220`): the search is the code J220, J221 and J222 played. If D550's review changed
  its code before it merged, `codeLinesOk` or `exact` fails here and D551 point 2 is rewritten before a repost;
- `hb`: `hostBase('j223')` is 405,000,000, an empty folder's first match block 405,900,000 (the 600th 405,900,599),
  the pilot's host name (`j223-pilot3`) has base 548,000,000 and its first block deals `synergy-900000001` (pair 20)
  at one batch pair, and the confirm set's 30 deck pairs get exactly 40 batches each from the 600 blocks;
- the readers: the exposure reader on 10 synthetic folders (`est`: J222's 9 with B wide, B's three keys summed and
  `bWideOpen` 0 when B has no stack window, plus one with no declined-activation window), the verdict on 76 synthetic
  cases (`st`: each reading at and either side of its bars, each with its recommendation, RECOMMEND for SHOWN and SMALL
  GAIN and STAYS for INCONCLUSIVE AT 4,800 and NOT SHOWN, J222's, J220's, J217's and J221's lines taken as J223's; the
  dev set, a missing set and rows on another set INCOMPLETE; J222's, J220's, J217's and the pilot host's blocks
  INCOMPLETE; J222's B and the parts' names, hashes and seat configs INCOMPLETE, B at search-v3-declined-instant's
  config among them; absent, other-match, short, unrounded-mismatch and se-less pairs files INCOMPLETE; NOT READ for
  A's union at 1,199 changes and read at exactly 1,200, under the rate with a SHOWN line; a key under its floor named
  unexposed and deciding nothing; B's stack or declined-activation windows at 0 INCOMPLETE at any rate and whatever
  the line says, a reader's flag without its counts not trusted, and B's own D540 and D544 counters as registered; a
  lands counter on either side INCOMPLETE; the trace at 1.299 INCOMPLETE and owed a new decision, at 1.3 complete,
  missing INCOMPLETE; and NOT READ, NOT PLAYED and INCOMPLETE all OPEN), the recording reader on 16 synthetic checks
  (`rst`), the pairs reader on 7 (`pst`), and the block, rollout and gate readers on synthetic files (`sst`, `ost`,
  `gst`: the gate passing with B's windows at 0 and with them open, at exactly its depth bars, with no dactiv window,
  starved and at another horizon, with a timeout, too many retries and short rollouts, with half its stack windows
  refused, and with too many declined and instant retries);
- in 4 games against B on the confirm set: the names, hashes, set and seat configs are A's and B's, every batch line
  carried both seat configs exactly, both sides searched priority and attacks and neither a block (`kindsOk`), and
  neither side's lands counters are above 0 (`landsClean`): a lands counter stops the night; and the pairs reader
  reproduces the pilot's line from its 4 rows (`pairsAgree`). D549's `bClean` (B's D544 counters all 0) is gone: B is
  search-v3-wide, its keys on by config (D551 point 10);
- in 4 recorded games against Forge Default on the confirm set's `modern-era-900000001`: the logs read, no searched
  priority decision on a stack whose top item is the seat's own (`ownTop`), none in a land window (`landSearched`) and
  no lands window in A's bench counters (`landsWindows`): a key that fires in a window it does not own stops the
  night.

Read, not checked: each of A's keys' windows, candidates, changes and retries in the 8 pilot games and B's windows in
the 4 ladder games (`pilot.json`, `gate.json`), the refusals by reason, the recorded searched windows by class and their
ms by candidate count, the recorded horizons, A's and B's search seconds a game, ms a searched decision, rollouts and
rounds a decision, the share short of two rounds and the play time a rollout in the 4 ladder games (`pilot.json`; D551
point 11's 56.3-56.9 and 23.5 s are the yardstick), the pilot's longest game against the 3,600 s timeout
(`gate.json`). The gate (`gate.json`: `wideOpen`, `deeper` and its reason) decides whether the match plays; a match it
keeps out is not a pilot failure.

## Commands
cores: 7
clean: var/ai-ladder/match-J223.json var/j223-ladder
```bash
# the match: search-v3-wide-t1-x2 (709c83cc4d48) against search-v3-wide (b95340935592), 4,800 games on the CONFIRM
# set, in a ladder folder of its own under --host j223, emptied here (so a restart replays the same blocks), so it is
# dealt blocks 405,900,000-405,900,599
test -f var/j223-tools/verdict.mjs
test -f var/j223-tools/gate.json
mkdir -p var/j223
rm -rf var/j223-ladder var/ai-ladder/match-J223.json
if ! node -e 'const g=require("./var/j223-tools/gate.json");process.exit(g.play===1?0:1)'; then
  node -e 'const g=require("./var/j223-tools/gate.json");require("fs").writeFileSync("var/ai-ladder/match-J223.json",JSON.stringify({notPlayed:true,reason:g.reason||"the gate did not pass",played:0,complete:false,errors:0,timeouts:0,score:0,lo:0,hi:0,elo:0,eloLo:0,eloHi:0})+"\n")'
  echo "J223: search-v3-wide-t1-x2 not played (the pilot's gate)"; exit 0
fi
echo "J223: search-v3-wide-t1-x2 against search-v3-wide, 4,800 games on the confirm set, blocks 405,900,000-405,900,599"
./tools/ai-ladder.sh match search-v3-wide-t1-x2 search-v3-wide --pairs tools/ai-bench/pairs-confirm.txt --host j223 --dir var/j223-ladder --games 4800 --hours 29 --game-timeout 3600 --out var/ai-ladder/match-J223.json --jobs {workers}
tail -1 var/j223-ladder/match.jsonl
```
cores: 1
clean: var/j223/verdict.json var/j223/v.json var/j223/report.md var/j223/exposure.json var/j223/rollouts.json var/j223/seeds.json var/j223/pairs.json
```bash
# the pre-registered reading: the match's blocks and set, rollouts, exposure and pairs, the verdict with the
# recommendation, and report.md (numbers only; the PC session writes the summary beside it). Nothing here plays a
# game; a reading is never a failure.
test -f var/j223-tools/verdict.mjs
mkdir -p var/j223
node var/j223-tools/rollouts.cjs var/j223-ladder var/ai-ladder/match-J223.json var/j223/rollouts.json > /dev/null
node var/j223-tools/seeds.cjs var/j223-ladder var/ai-ladder/match-J223.json var/j223/seeds.json
node var/j223-tools/exposure.cjs var/j223-ladder var/ai-ladder/match-J223.json var/j223/exposure.json > /dev/null
node var/j223-tools/pairs.mjs var/j223-ladder var/ai-ladder/match-J223.json var/j223/pairs.json
node var/j223-tools/verdict.mjs var/ai-ladder/match-J223.json var/j223 var/j223/verdict.json > /dev/null
# the checks' copy: the verdict's numbers only (every value a number; strings, nulls and the description detail dropped)
node -e 'const fs=require("fs");const v=JSON.parse(fs.readFileSync("var/j223/verdict.json","utf8"));const out={};for(const [k,x] of Object.entries(v)){if(typeof x==="number")out[k]=x}fs.writeFileSync("var/j223/v.json",JSON.stringify(out)+"\n");console.log(JSON.stringify(out))'
node - <<'J223EOF'
// J223's report: the job's own numbers (D551 points 4 to 9), nothing worded beyond them.
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const v = read('var/j223/verdict.json'), m = read('var/ai-ladder/match-J223.json'), bs = read('var/j223/seeds.json');
const pr = read('var/j223/pairs.json');
const g = read('var/j223-tools/gate.json'), rc = read('var/j223-tools/rec-pilot.json'), pp = read('var/j223-tools/pilot.json');
const P = v.parts || {}, P2 = P.J222 || {}, P7 = P.J217 || {}, P0 = P.J220 || {};
const d = (x) => (x === null || x === undefined ? '-' : x);
const pct = (x, n = 1) => (typeof x === 'number' ? `${(x * 100).toFixed(n)}%` : '-');
const x = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(m.id || '');
const t0 = x ? Date.UTC(+x[1], +x[2] - 1, +x[3], +x[4], +x[5], +x[6]) : null, t1 = typeof m.at === 'string' ? Date.parse(m.at) : null;
const hours = t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null;
const tl = pr.toLoss || {};
const L = ['# J223: search-v3-wide-t1-x2 against search-v3-wide (the live seat since D550 merged, search-v5) on the confirm deck set, 4,800 games (D398; D551; D519\'s four readings)', ''];
L.push('**Outcome under the pre-registered rule (D551 points 4 to 7):**', '', `- ${d(v.line)}`, '');
L.push(`**The recommendation:** ${d(v.recommendation)} (${d(v.recWhy)}). RECOMMEND ${d(v.recDeep)}, STAYS ${d(v.recStay)}, OPEN ${d(v.recOpen)}. **NOT READ:** ${d(v.notRead)}. **NOT PLAYED:** ${d(v.notPlayed)}. **INCOMPLETE:** ${d(v.incomplete)} (owed a new decision, not a repost, when only the trace failed: ${d(v.owedDecision)}). **The live seat:** unchanged by this job (liveSeatChanged ${d(v.liveSeatChanged)}); a seat change is the owner's, under a separate decision.`, '');
L.push('| match | set | played / planned | complete | outcome | described | score [95%] | Elo [95%] | pairs | draws, errors, timeouts | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
if (m.notPlayed === true) L.push(`| J223 search-v3-wide-t1-x2 | confirm | not played | - | NOT PLAYED | - | - | - | - | - | - |`);
else L.push(`| J223 ${d(m.a)} vs ${d(m.b)} | ${d(m.set)} | ${d(m.played)} / ${d(m.planned)} | ${d(m.complete)} | ${d(v.outcome)} | ${d(v.word)} | ${d(m.score)} [${d(m.lo)}, ${d(m.hi)}] | ${d(m.elo)} [${d(m.eloLo)}, ${d(m.eloHi)}] | ${d(m.pairs)} | ${d(m.draws)}, ${d(m.errors)}, ${d(m.timeouts)} | ${d(hours)} |`);
L.push('', `Timeouts in J223's rows ${d(pr.timeouts)}; with every timed-out game counted as A's loss (description only, D551 point 9): score ${d(tl.score)} [${d(tl.lo)}, ${d(tl.hi)}], ${d(tl.elo)} Elo [${d(tl.eloLo)}, ${d(tl.eloHi)}] (unrounded).`, '');
L.push('**The earlier matches, each against search-v3-declined-instant (search-v4), as they were** (literals from pc-results/results/J222/, J217/ and J220/; never pooled with J223 and never read against it as a difference, D551 point 8; J221 search-v3-wide on the dev set +3.6 [-1.3, +8.6], pooled with J217 +5.3 [+1.6, +9.0]; J218 search-v3-declined-instant-t1-x3 on the dev set +15.9 [+9.4, +22.5] at x3.15, another code version):', '');
L.push('| match | player | set | score [95%] | Elo [95%] | search s a game A / B | ms a decision A / B | rollouts a decision A / B | fewer than 2 rounds A / B | play ms a rollout A / B (x) | stack / pass / declined-activation windows a game | union changes a game |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
L.push(`| J222 | ${d(P2.a)} | ${d(P2.set)} | ${d(P2.score)} [${d(P2.lo)}, ${d(P2.hi)}] | ${d(P2.elo)} [${d(P2.eloLo)}, ${d(P2.eloHi)}] | ${d(P2.aSec)} / ${d(P2.bSec)} | ${d(P2.aMs)} / ${d(P2.bMs)} | ${d(P2.aRolloutsPerDecision)} / ${d(P2.bRolloutsPerDecision)} | ${pct(P2.aShortShare, 2)} / ${pct(P2.bShortShare, 2)} | x${d(P2.playMsRatio)} | ${d(P2.stackwinWindowsPerGame)} / ${d(P2.passwinWindowsPerGame)} / ${d(P2.dactivWindowsPerGame)} | ${d(P2.unionChangedPerGame)} |`);
L.push(`| J217 | ${d(P7.a)} | ${d(P7.set)} | ${d(P7.score)} [${d(P7.lo)}, ${d(P7.hi)}] | ${d(P7.elo)} [${d(P7.eloLo)}, ${d(P7.eloHi)}] | ${d(P7.aSec)} / ${d(P7.bSec)} | ${d(P7.aMs)} / ${d(P7.bMs)} | - | - | - | ${d(P7.stackwinWindowsPerGame)} / ${d(P7.passwinWindowsPerGame)} / ${d(P7.dactivWindowsPerGame)} | ${d(P7.unionChangedPerGame)} |`);
L.push(`| J220 | ${d(P0.a)} | ${d(P0.set)} | ${d(P0.score)} [${d(P0.lo)}, ${d(P0.hi)}] | ${d(P0.elo)} [${d(P0.eloLo)}, ${d(P0.eloHi)}] | ${d(P0.aSec)} / ${d(P0.bSec)} | ${d(P0.aMs)} / ${d(P0.bMs)} | ${d(P0.aRolloutsPerDecision)} / ${d(P0.bRolloutsPerDecision)} | ${pct(P0.aShortShare, 2)} / ${pct(P0.bShortShare, 2)} | x${d(P0.playMsRatio)} | - | - |`);
L.push('', '**J223 itself, against search-v3-wide** (A\'s windows and union on the left; B\'s windows a game, stack / pass / declined activations, and union beside them):', '');
L.push('| match | player | set | score [95%] | Elo [95%] | search s a game A / B | ms a decision A / B | rollouts a decision A / B | fewer than 2 rounds A / B | play ms a rollout A / B (x) | A: stack / pass / declined-activation windows a game | A: union changes a game | B: windows a game | B: union changes a game |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
L.push(`| **J223** | ${d(m.a)} | confirm | ${d(m.score)} [${d(m.lo)}, ${d(m.hi)}] | ${d(m.elo)} [${d(m.eloLo)}, ${d(m.eloHi)}] | ${d(v.aSecPerGame)} / ${d(v.bSecPerGame)} | ${d(v.aMs)} / ${d(v.bMs)} | ${d(v.aRolloutsPerDecision)} / ${d(v.bRolloutsPerDecision)} | ${pct(v.aShortShare, 2)} / ${pct(v.bShortShare, 2)} | ${d(v.aPlayMsPerRollout)} / ${d(v.bPlayMsPerRollout)} (x${d(v.playMsRatio)}) | ${d(v.stackwinWindowsPerGame)} / ${d(v.passwinWindowsPerGame)} / ${d(v.dactivWindowsPerGame)} | ${d(v.unionChangedPerGame)} | ${d(v.bStackwinWindowsPerGame)} / ${d(v.bPasswinWindowsPerGame)} / ${d(v.bDactivWindowsPerGame)} | ${d(v.bUnionChangedPerGame)} |`);
L.push('', '**The exposure, A\'s three keys (D551 point 5, D548 point 6; the union\'s changes decide NOT READ, a key under its floor is named unexposed, the rest is description; on every match it was read on, a cut-short one included):**', '');
L.push('| key | games read | windows | a game | floor | at the floor | candidates | a window | changed | a game | retries | a game |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [k, f] of [['stackwin', 0.25], ['passwin', 0.1], ['dactiv', 0.25]]) {
  L.push(`| ${k} | ${d(v.exGames)} | ${d(v[`${k}Windows`])} | ${d(v[`${k}WindowsPerGame`])} | ${f} | ${v[`${k}Floor`] === 1 ? 'yes' : 'no'} | ${d(v[`${k}Cands`])} | ${d(v[`${k}CandsPerWindow`])} | ${d(v[`${k}Changed`])} | ${d(v[`${k}ChangedPerGame`])} | ${d(v[`${k}Retry`])} | ${d(v[`${k}RetryPerGame`])} |`);
}
const reasons = Object.entries(v.refusedReasons || {}).map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
L.push('', `The union: ${d(v.unionChanged)} changed decisions, ${d(v.unionChangedPerGame)} a game (0.25 is the rate; read: ${v.exposed === 1 ? 'yes' : 'no'}; J222's A on the dev set 0.478, J217's A on the confirm set 0.279). B's (search-v3-wide's) own: stack ${d(v.bStackwinWindows)}, pass ${d(v.bPasswinWindows)}, declined-activation ${d(v.bDactivWindows)} windows, ${d(v.bUnionChanged)} changed decisions, retries ${d(v.bStackwinRetry)}, ${d(v.bPasswinRetry)}, ${d(v.bDactivRetry)}, stack windows refused ${d(v.bRefused)}; B's windows open (the completeness part): ${d(v.bWide)}. A's stack windows refused ${d(v.refused)}, a share of ${d(v.refusalShare)} of those met (J222 0.065, J217 0.088), by reason: ${reasons}. Aims at the seat's own stack item dropped ${d(v.ownAim)}; equips aimed at their host dropped ${d(v.sameHost)}; declined activations listed ${d(v.dactivListed)}; memory sets put back ${d(v.memoryRestored)}; windows the opponent had passed in: stack ${d(v.stackwinOppPassed)}, pass ${d(v.passwinOppPassed)}; declined spells in instant-speed windows ${d(v.declinedInstantWindows)}; A's declined and instant windows a game ${d(v.declinedWindowsPerGame)} and ${d(v.instantWindowsPerGame)} (A's search.p.declined.* counters include the stack and pass windows, so they are never compared with B's). B's D544 counters above 0: ${d(v.bNew)}; B's D540 counters above 0: ${d(v.bD540)} (B's own keys, description). Lands counters above 0: A ${d(v.aLands)}, B ${d(v.bLands)}.`, '');
L.push('**The depth and the cost, A against B on the same games (description only; the seconds are this machine\'s, D388):**', '');
L.push('| search s a game A / B (x) | no cost (D519 point 5) | ms a decision A / B | ms p, a A | ms p, a B | searched p, a, b A | searched p, a, b B | rollouts a decision A / B | complete rounds a decision A / B | fewer than 2 rounds A / B | ms of play a rollout A / B (x; 1.3 is the bar) | ms of copy a rollout A / B | rollouts the step cap cut A / B |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
L.push(`| ${d(v.aSecPerGame)} / ${d(v.bSecPerGame)} (x${d(v.costRatio)}) | ${d(v.noCost)} | ${d(v.aMs)} / ${d(v.bMs)} | ${d(v.aMsP)}, ${d(v.aMsA)} | ${d(v.bMsP)}, ${d(v.bMsA)} | ${d(v.aP)}, ${d(v.aA)}, ${d(v.aB)} | ${d(v.bP)}, ${d(v.bA)}, ${d(v.bB)} | ${d(v.aRolloutsPerDecision)} / ${d(v.bRolloutsPerDecision)} | ${d(v.aRoundsPerDecision)} / ${d(v.bRoundsPerDecision)} | ${pct(v.aShortShare, 2)} / ${pct(v.bShortShare, 2)} | ${d(v.aPlayMsPerRollout)} / ${d(v.bPlayMsPerRollout)} (x${d(v.playMsRatio)}) | ${d(v.aCopyMsPerRollout)} / ${d(v.bCopyMsPerRollout)} | ${d(v.aStepCap)} / ${d(v.bStepCap)} |`);
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
L.push('', `Rule parts: names ${d(v.names)}, hashes ${d(v.hashes)}, the confirm set ${d(v.setOk)} (line set ${d(v.set)}, ${d(bs.offSet)} rows on another set), seat configs ${d(v.cfgs)}, the registered blocks ${d(v.blocks)} (${d(bs.blocks)} blocks ${d(bs.min)} to ${d(bs.max)}, ${d(bs.games)} games, ${d(bs.otherGames)} of another match; ${d(bs.deckPairs)} deck pairs, ${d(bs.perDeckPairMin)} to ${d(bs.perDeckPairMax)} games each), priority and attacks searched and no block on both sides ${d(v.kindsOk)}, the exposure read on this match ${d(v.exposureRead)}, the rebuilt pairs reproduce the line ${d(v.pairsOk)}, B's windows open ${d(v.bWide)}, both sides' lands counters clean ${d(v.landsClean)}, A's rollouts deeper ${d(v.horizonTrace)} (x${d(v.playMsRatio)}), the union at the rate ${d(v.exposed)}; complete ${d(v.complete)}. SHOWN ${d(v.shown)}, SMALL GAIN ${d(v.smallGain)}, INCONCLUSIVE AT 4,800 ${d(v.inconclusive4800)}, NOT SHOWN ${d(v.notShown)}, NOT READ ${d(v.notRead)}, NOT PLAYED ${d(v.notPlayed)}, INCOMPLETE ${d(v.incomplete)}. Described: indistinguishable ${d(v.indistinguishable)}, a measured loss ${d(v.measuredLoss)}, a measured gain ${d(v.measuredGain)}. Match id ${d(m.id)}, host ${d(m.host)}, set ${d(m.set)}.`);
L.push('', '## The pilot (D551 point 10): the gate, the recorded windows and horizons, the longest game', '');
L.push(`The gate: ${g.play === 1 ? 'played' : `not played: ${d(g.reason)}`} (A's wide windows open ${d(g.wideOpen)}, A's rollouts deeper ${d(g.deeper)}). B's windows in the 4 ladder games, reported and not gated: stack ${d(g.bLadderStackwinWindows)}, pass ${d(g.bLadderPasswinWindows)}, declined activations ${d(g.bLadderDactivWindows)}.`, '');
L.push('| games (ladder + recorded) | errors and timeouts | stackwin windows (ladder + recorded) | passwin windows | dactiv windows | refused (share) | retries, three keys (a game) | retries, declined and instant (a game) | short of two rounds (A) | recorded horizon 1: p, a; other | play ms a rollout A / B (x) | recorded searched p: own main / stack / instant or pass / land | own item on top | ladder search s a game A / B | longest game, ladder / recorded (s) |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
const sec = (ms) => (typeof ms === 'number' ? Math.round(ms / 100) / 10 : '-');
L.push(`| ${d(g.ladderGames)} + ${d(g.benchGames)} | ${d(g.errorsTimeouts)} | ${d(g.ladderStackwinWindows)} + ${d(g.benchStackwinWindows)} | ${d(g.ladderPasswinWindows)} + ${d(g.benchPasswinWindows)} | ${d(g.ladderDactivWindows)} + ${d(g.benchDactivWindows)} | ${d(g.refused)} (${d(g.refusalShare)}) | ${d(g.retry)} (${d(g.retryPerGame)}) | ${d(g.retry2)} (${d(g.retry2PerGame)}) | ${d(g.short)} of ${d(g.decisions)} (${pct(g.shortShare, 2)}) | ${d(g.pH1)}, ${d(g.aH1)}; ${d(g.hOther)} | ${d(g.aPlayMsPerRollout)} / ${d(g.bPlayMsPerRollout)} (x${d(g.playMsRatio)}) | ${d(rc.ownMainSearched)} / ${d(rc.stackSearched)} / ${d(rc.instantSearched)} / ${d(rc.landSearched)} | ${d(rc.ownTop)} | ${d(pp.aSecPerGame)} / ${d(pp.bSecPerGame)} | ${sec(g.longestLadderMs)} / ${sec(g.longestBenchMs)} |`);
fs.mkdirSync('var/j223', { recursive: true });
fs.writeFileSync('var/j223/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J223EOF
```
The verdict (`verdict.mjs`, J222's with this match's constants: the exposure, union, NOT READ, confirm-set, rebuilt
pairs, lands and horizon-trace parts, `bWide` (B's stack and declined-activation windows each above 0 over the match)
in place of J222's `bClean`, the blocks 405,900,000-405,900,599, and D551 point 7's recommendation) gives the match
exactly one outcome, in this precedence: NOT PLAYED when the pilot's gate kept it out (with the gate's reason);
INCOMPLETE when any part of D551 point 4's completeness fails, a line or a row off the confirm set, pairs that do not
reproduce the line, B's stack or declined-activation windows at 0 over the match, a lands counter above 0 on either
side or A's rollouts under 1.3 times B's in play time among them (no reading, and not NOT READ either, whatever the
rate); NOT READ when every other part holds but A's three keys together changed fewer than 0.25 decisions a game
played (under 1,200 at 4,800); else one of D519's four readings, compared in integers as the line carries them.
Exactly one recommendation: RECOMMEND (SHOWN or SMALL GAIN), STAYS (INCONCLUSIVE AT 4,800 or NOT SHOWN), OPEN (no
reading). It writes `v.json` with the completeness parts, exactly one of shown / smallGain / inconclusive4800 /
notShown / notRead / notPlayed / incomplete, exactly one description for a complete match, exactly one of recDeep /
recStay / recOpen, each of A's keys' exposure and floor, B's keys beside them, the union's changes, the refusals, the
depth, the cost and its "no cost" flag, owedDecision, and `liveSeatChanged` 0.
check: v.written == 1
check: v.liveSeatChanged == 0
check: v.incomplete == 0
check: v.complete + v.notRead + v.notPlayed == 1
check: v.shown + v.smallGain + v.inconclusive4800 + v.notShown + v.notRead + v.notPlayed == 1
check: v.shown + v.smallGain + v.inconclusive4800 + v.notShown == v.complete
check: v.indistinguishable + v.measuredLoss + v.measuredGain == v.complete
check: v.aloneGain == v.shown + v.smallGain
check: v.recDeep + v.recStay + v.recOpen == 1
check: v.recOpen + v.complete == 1
check: v.recDeep == v.aloneGain
check: v.recStay == v.complete - v.aloneGain
check: v.notPlayed == 0 or cm.played == 0
check: v.complete + v.notRead == 0 or (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240)
check: v.complete + v.notRead == 0 or (bs.blocks == 600 and bs.min == 405900000 and bs.max == 405900599 and bs.games == 4800 and bs.otherGames == 0 and bs.offSet == 0)
check: v.complete + v.notRead == 0 or (v.horizonTrace == 1 and v.playMsRatio >= 1.3 and v.landsClean == 1 and v.bWide == 1)
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
on the 600 registered blocks of the confirm set with no other match's game in the folder, with A's rollouts deeper by
the trace, no lands counter on either side and B's own windows open; a NOT PLAYED match played nothing; a complete
match has exactly one reading and one description; exactly one recommendation, OPEN exactly when there is no reading,
RECOMMEND exactly for SHOWN or SMALL GAIN, STAYS exactly for INCONCLUSIVE AT 4,800 or NOT SHOWN; the four readings and
the two descriptions agree with the match line in the runner's own language; the live seat is unchanged. Any reading
passes them, and so do NOT READ and NOT PLAYED: they are outcomes D551 registered, not failures. If the match is cut
short by its own stop at 29 h, it is INCOMPLETE. A memory stop is not a cut: the runner retries the match step as a
new attempt (a new unit, its elapsed count from 0, the folder emptied and the same blocks replayed, with the whole
--hours again, one worker fewer; the third memory stop fails the job). An INCOMPLETE match fails the job on its
checks; the report is still written (the recommendation OPEN), and what is owed is a repost alone under a new job id
after its cause is found, not a reading of a cut match, except for a match valid in every other part whose play-time
trace is under its bar: that one is owed a new decision saying what was wrong, never a repost unchanged (D547 point
3). A match both cut short and under the exposure rate is INCOMPLETE, not NOT READ. A NOT READ match is reported with
every rate and is not played on the confirm set again without a new decision; no repost is owed.

## Abort if
abort: j223_err >= 30 and j223_err > j223_games / 10

Engine trouble only: once 30 games of the match have ended in an engine error or a timeout, the job stops if they are
more than one in ten. The match has no stopping rule on the score.

## Report
collect: var/ai-ladder/match-J223.json
collect: var/j223/verdict.json
collect: var/j223/report.md
collect: var/j223/exposure.json
collect: var/j223/rollouts.json
collect: var/j223/seeds.json
collect: var/j223/pairs.json
collect: var/j223-tools/d54x-selftest.txt
collect: var/j223-tools/src-diff.json
collect: var/j223-tools/gate.json
collect: var/j223-tools/pilot.json
collect: var/j223-tools/pilot-exposure.json
collect: var/j223-tools/rollouts-pilot.json
collect: var/j223-tools/rec-pilot.json

`report.md` is the job's own numbers. The PC session writes `summary.md` from it:
- **the answer first:** in one sentence a person can act on: whether the search that looks one turn further at twice
  the clock plays better than the live seat's search, `search-v3-wide` (the same windows at 1.5 s and the old
  horizon), on the 30 confirm deck pairs, the outcome under D551's rule (SHOWN, SMALL GAIN, INCONCLUSIVE AT 4,800 or
  NOT SHOWN; or NOT READ with every rate; or NOT PLAYED with the gate's reason; or INCOMPLETE, owed a repost or a new
  decision, with its cause) with the score and Elo interval against search-v3-wide and the describing word;
- **then the recommendation:** RECOMMEND, the PC session recommends to the owner that the live seat become
  `search-v3-wide-t1-x2` at a 3 s clock (D551 point 7, amending D549 point 7), with this match's point, interval and
  cost (search seconds a game on each side and their ratio, ms a searched decision; at the table a searched decision
  waits about 2.1 s instead of 0.9 s) beside J222's (+20.7 [+14.1, +27.3] against search-v4 on the dev set at x2.72);
  the clock and the adoption are the owner's, under a later decision and a seat-queue row (D509); STAYS,
  `search-v3-wide` stays the live seat and the 3 s clock J222's summary recommended is not recommended, with the depth
  and both sides' window counters described; or OPEN, with its cause, nothing recommended or withdrawn;
- **what it does not say:** which of the horizon and the clock carried a reading (A differs from B by both), whether
  the parts add up as a number (J223's point against J222's, J220's or J217's is never read), which key carried
  anything, anything against J217, J218, J220, J221 or J222 beyond their numbers beside it, and anything beyond these
  30 deck pairs of six cubes and this one opponent;
- **the exposure, the depth and the cost:** each of A's keys' windows a game against its floor (an unexposed key is
  named and not judged), candidates a window, changes and retries a game, and B's beside them; A's union's changes a
  game; the stack windows refused, their share and their reasons; rollouts and complete rounds a decision, the share
  short of two rounds, ms of play a rollout and the trace's ratio beside J222's and J220's; search seconds a game on
  each side and their ratio, ms a searched decision and the "no cost" flag; the pilot's recorded windows and horizons,
  B's pilot windows, and its longest game;
- **the run:** draws, errors and timeouts (and the score with timed-out games counted as A's losses, `pairs.json`'s
  `toLoss`), the deal blocks (405,900,000-405,900,599, new to every job), the games per confirm deck pair, the match's
  hours against the 16 h estimate, the pressure events in STATUS and any block the runner retried, and that it ran
  alone (D521).

Never write "no effect", "no gain" or "no cost" for an interval that includes 0 (the "no cost" flag is D519 point 5's
5% bar on ms a decision, and is named as that). J223 is read against search-v3-wide and never against J222's, J220's
or J217's point as a difference.
