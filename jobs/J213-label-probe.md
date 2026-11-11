id: J213
title: The label probe (D538, no play change): at the 605 judged move-atlas decisions (515 with a label two blind judges agreed on), which option each of twelve ladder players picks there -- forge-default and policy-outlet once, search-v1-anytime, search-v2-rrandom, search-v2-rrandom4 and seven more search players three times each, --seed 538, one fresh rows file a player -- then D538's one pre-registered read, agreement.py --rule d538 over the five rule seats' rows, whose rule.word is the verdict: AGREEMENT TRACKS ELO, AGREEMENT DOES NOT TRACK ELO or INCONCLUSIVE (VOID or NOT READ when point 6's stops fire, NOT READ (refused) when the tool refuses the rows); point 8's other reads beside it, deciding nothing. This job changes no seat and buys nothing
public_title: Label probe: do stronger AI seats agree more with judged move labels
public_est: ~6 h (range 4-9 h)
public_decides: Whether agreement with judged move labels tracks measured AI strength
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2.7
alone: yes
control: no
repos: mtg-table@31daf3ec148f9b844f99791cee50953ce0372b70 (the merge commit of D538's lane, pc/label-probe, on main after D537's merge of pc/search-horizon; pin 31daf3ec. It carries D538's code: bridge/src/mtgtable/ai/LabelProbe.java, the probe hook in Atlas.java, the refactor of PolicyControllerAi.choose and two loops of SearchPolicy (D509's frozen seat path: gate step 12m and atlas-selftest passed unchanged at the merge, and the pilot runs both again), tools/cubelab/AtlasProbe.java and CubeLab.java, tools/label-probe.sh, tools/atlas/agreement.py with --rule d538 and its tests, ai-ladder.sh cfg, the labels file fixtures/atlas/judged/labels-judged-v1.jsonl and docs/decisions/D538-label-probe.md; and D537's three config-only players in tools/ai-ladder/players.json. Pinned so every row is one code version, D341)
decides: D538 point 9, from rule.word of the one read of point 7 alone. AGREEMENT TRACKS ELO: wave 2 is judged (the 392 decisions, about 6.5 million tokens), the set grows to about 850 labels, and a new arm's agreement is read before its ladder night beside its Elo, as a screen, never adopting or dropping an arm. AGREEMENT DOES NOT TRACK ELO: wave 2 is not bought; the labels stay as data. INCONCLUSIVE: wave 2 is bought once only when P1's point is above 0 on all 515 labels and on the 409 nobody selected and P2's or P3's point is above 0 (rule.wave2, the tool's own answer), and the same rule is read once more on every label, finally; otherwise not. VOID: a mapping fault, fixed, and the night replayed under a new job id; not a finding. NOT READ (a stop, or the tool's refusal): no reading until the cause is explained in writing. No seat, budget, wire or protocol changes here, and nothing is bought by this job: the PC session and the owner act on the word
hypothesis: none registered on the word. What is known: 289 of the 515 labels are Forge's own move, so forge-default's agreement is about 0.561 by construction and its option-0 share 1. The search changes Forge's move at about 18% of the decisions it searches (5,282 of 29,083 in J210), so P1 rests on roughly a hundred decisions where search-v1-anytime leaves Forge (D538 point 9); P2 and P3 above 0 are what a labels-are-Forge-plus-noise null also predicts (a noisier search leaves Forge more often), and P1 is the one pair that null gets wrong. Round 2's 106 labels are the atlas's confident rows, where the judges leave Forge most (67 of 106); the rule also needs P1's point above 0 on the other 409. The interval of each pair is a percentile bootstrap over 77 spines, 4,000 draws, seed 538
rule: D538 points 6 and 7, merged before any J213 row was written (written 2026-11-11 while J211 played, amended by four reviews of the text and, after the first build, a fifth of the compiled lane that changed no word of them, all before the merge), in their words (D538's bold dropped, its table set as sentences): "Before any reading: the run must be a measurement. In this order, each a stop that --rule d538 prints in place of point 7's word. (Point 4's refusal comes before all of them: rows that are refused print no stop, VOID among them, until the rows are the night's own.) VOID: forge-default has an ok row that is not option 0, or an off-atlas row. It is Forge's own answer handed back, so anything else is a fault in the mapping: the fault is fixed and the night is replayed. Not a finding. NOT READ: forge-default or policy-outlet has a row with searched: true, labelled or not, whichever players the read names; or one of point 7's four players has an answer (ok or off-atlas) at fewer than 95% of the 515 labelled decisions; or one of the four does not have its repeats (3 rows for a search player, 1 for forge-default) at every labelled decision it was probed at, or answered fewer than 95% of its repeats of the labelled decisions; or a pair of the rule, P1 on the unselected labels among them, shares no decision or has no interval; or the run is not whole: one of the five seats of point 7 (policy-outlet among them) lacks a row at a (decision, repeat) of the 605 x its repeats, labelled or not, an error row being a row; or the read refuses the rows (point 4, exit 2). The night is not read until the cause is explained in writing, and a replay after a fix is read by the same rule. ... One night (J213, after J212), alone, {workers} JVMs: the 605 decisions, 3 repeats for a search player and 1 for forge-default and policy-outlet, --seed 538; read over the 515 labels with one command, whose rule.word is the verdict ... ROWS are the night's own --out files and no others, every one made with --seed 538. The statistic is the tool's pair line, delta(A, B) = the mean over the labelled decisions both answered of (A's agreement - B's), A first, with its 95% interval; off-atlas counts as a miss. Every comparison below is strict and on the unrounded number. Three pairs, each the live search against a seat it has beaten by about 40 Elo or more in a 1,200-game match: P1 search-v1-anytime - forge-default (+89.4 [+73.9, +105.1], J210); P2 search-v1-anytime - search-v2-rrandom (+43.7 [+30.4, +57.1], J199 a); P3 search-v1-anytime - search-v2-rrandom4 (+39.5 [+25.3, +53.9], J202 a). AGREEMENT TRACKS ELO: P1's interval is above 0, P1's point is above 0 on the labels whose source is not round2 (409 of the 515), P2's and P3's points are above 0, and at least one of their two intervals is above 0. AGREEMENT DOES NOT TRACK ELO: any of the three intervals is wholly below 0 (a seat measured about 40 Elo or more stronger agrees with the judges less). INCONCLUSIVE otherwise. DOES NOT TRACK is tested first ... No other pair, subset or player enters the verdict." The job computes none of this: the word is rule.word of agreement.py --rule d538's JSON, copied into var/j213/v.json; an exit other than 0 is NOT READ (refused) and no word. ROWS are the five rule seats' night files (forge-default, search-v1-anytime, search-v2-rrandom, search-v2-rrandom4, policy-outlet): the other seven players' rows enter no part of the verdict (point 7's last sentence) and are read beside it
followup: morning-read
est: ~6 h at 7 workers (an estimate; range 4-9 h), the probe steps held near 8 h by D538 point 8's guard. 19,360 replays (D538: forge-default and policy-outlet 605 each, ten search players 1,815 each); at D538's 6 s a replay that is 4.6 h at 7 JVMs, plus t1-x3's 3 s more a search (+0.2 h) and the JVM boots between players (12 x ~30 s): ~4.9 h of probe; the five rule seats alone 6,655 replays, ~1.6 h. Pilot ~0.5 h (the build, the unit tests, atlas-selftest, seat-identity, the ladder test, 35 smoke replays at 3 JVMs); the reads under 2 min (about 1 s for the rule read on 6,655 synthetic rows when drafted). Unmeasured: no replay of the probe has run (the lane is uncompiled as this is written); the pilot's smoke measures replayMs, projects the night, refuses it if the five rule seats alone would take over 4 h, and drops point-8 players from the end of its list where the projection passes 8 h; before each of those players starts, the same guard runs on the night's own replayMs. At 10 s a replay the probe is ~7.9 h with t1-x3 dropped
resumable: yes
timeout: 3h
clean: var/j213 var/j213-tools var/j213-pilot var/j213-merged.txt var/j213-build.txt var/label-probe
progress: metric j213_done replays of 19360
metrics: j213_done = sh: node -e 'const fs=require("fs");const P=["forge-default","search-v1-anytime","search-v2-rrandom","search-v2-rrandom4","policy-outlet","search-v2-rrandom4-m40","search-v2-rmix4them-m40","search-v2-ms750-r6","search-v2-no-b","search-v2-t1","search-v2-a1","search-v2-t1-x3"];const d=new Set();for(const p of P){const f="var/j213/rows-"+p+".jsonl";if(!fs.existsSync(f))continue;for(const l of fs.readFileSync(f,"utf8").split("\n")){let r=null;try{r=JSON.parse(l)}catch(e){continue}if(r&&r.player===p)d.add(p+"|"+r.key+"|"+r.repeat)}}console.log(d.size)'
metrics: rw = sh: node -e 'const fs=require("fs");const P=["forge-default","search-v1-anytime","search-v2-rrandom","search-v2-rrandom4","policy-outlet","search-v2-rrandom4-m40","search-v2-rmix4them-m40","search-v2-ms750-r6","search-v2-no-b","search-v2-t1","search-v2-a1","search-v2-t1-x3"];let n=0,e=0,m=0;for(const p of P){const f="var/j213/rows-"+p+".jsonl";if(!fs.existsSync(f))continue;for(const l of fs.readFileSync(f,"utf8").split("\n")){let r=null;try{r=JSON.parse(l)}catch(x){continue}if(!r||r.player!==p)continue;n++;if(r.status==="error")e++;if(r.status==="mismatch")m++}}console.log(JSON.stringify({lines:n,err:e,mis:m}))'
metrics: v = sh: cat var/j213/v.json 2>/dev/null || echo '{"written":0,"readRc":-1,"refused":1,"known":0,"words":0,"tracks":0,"doesNotTrack":0,"inconclusive":0,"void":0,"notRead":0,"stops":-1,"auditBad":-1,"seedChecked":0,"auditKeys":0,"cells":{"fd":0,"v1":0,"rr":0,"rr4":0,"po":0},"labelled":0,"shaOk":0,"look":0,"wave2":0,"droppedCount":-1}'
metrics: rc = sh: cat var/j213/rowcheck.json 2>/dev/null || echo '{"written":0,"ruleFull":0,"droppedRule":-1,"secondaryFull":0,"errShareMax":1,"errors":-1,"wrongHash":-1,"extra":-1,"seatsMax":-1,"unsupported":-1,"played":0,"dropped":-1,"fdRows":0,"v1Rows":0,"rrRows":0,"rr4Rows":0,"poRows":0}'
metrics: sr = sh: cat var/j213/side-rc.json 2>/dev/null || echo '{"written":0,"ok":0}'
headline: j213_done, v.tracks, v.doesNotTrack, v.inconclusive, v.void, v.notRead, v.refused, v.wave2, v.p1.mean, v.p1.lo, v.p1.hi, v.p1Unselected.mean, v.p2.mean, v.p2.lo, v.p2.hi, v.p3.mean, v.p3.lo, v.p3.hi, v.droppedCount, rc.errors, rc.errShareMax

**Why this job** (D538). Two judge rounds showed that where two blind language-model judges agree on a move that
is not Forge's, their move is worth something on the Forge map (J200, +0.050 on 82 selected decisions; J203, +0.012
[-0.011, +0.036] on 58 unselected, INCONCLUSIVE). Neither says whether *agreeing with the judges* is a property
stronger players have more of. If it is, agreement is a score a new arm can be given in minutes, before its
1,200-game night; if it is not, more labels buy nothing for the ladder. The owner chose judged labels on
2026-11-11; wave 1 brought the set to 605 decisions with 515 agreed labels, and this night is the validity test D538
wrote before any probe row existed. It costs no tokens.

**What it does not do.** It changes no seat, budget, wire or protocol, registers and tunes no player, adopts or drops
no arm, and buys nothing by itself: wave 2 is bought (or not) by the PC session and the owner on the word, and the
tool's `rule.wave2` says which point 9 means. It plays no game to its end and reads no outcome. It computes no
statistic and no word of its own: every number in the verdict and beside it is agreement.py's. It writes nothing in
the lab's data folder.

**What is played.** For each player, `tools/label-probe.sh --decisions fixtures/atlas/judged/labels-judged-v1.jsonl
--player <name> --data /home/justin-a/code/lab/data --repeats <1|3> --seed 538 --workers {workers}
--game-timeout 180 --out var/j213/rows-<name>.jsonl`: each of the 605 recorded atlas decisions (the labels file's
own `key` lines; AtlasProbe reads `key` and nothing else of a line, so no keys file is derived) is replayed from its
spine's baseline exactly as an atlas branch unit replays it, and at decision d the player is asked for its move,
mapped to an atlas option and the replay ended. One row a (decision, repeat). In this order, five rule seats then
D538 point 8's other players in its order:
1. `forge-default` (`3ed453ffef1c`), 1 repeat, 605 replays: Forge's own answer handed back, the VOID check;
2. `search-v1-anytime` (`cdd55e02a89c`, search-v2, the live seat), 3 repeats, 1,815;
3. `search-v2-rrandom` (`fb8ae32c014d`), 3 repeats, 1,815;
4. `search-v2-rrandom4` (`646d59a008f6`), 3 repeats, 1,815;
5. `policy-outlet` (`e350d94649a4`), 1 repeat, 605: first on point 8's list, but one of the five seats the rule's
   whole-run stop requires (point 6), so it is played with the rule seats and never dropped;
6. to 12. `search-v2-rrandom4-m40` (`968c9003c616`), `search-v2-rmix4them-m40` (`fcf472f384b7`),
   `search-v2-ms750-r6` (`ef6def992355`, 750 ms), `search-v2-no-b` (`59505e241363`), `search-v2-t1`
   (`63c35e9f7d5b`), `search-v2-a1` (`3cf65e94df28`), `search-v2-t1-x3` (`ce99b41f9898`, 4.5 s), 3 repeats,
   1,815 each, dropped from the end of this list by the guard below.
Each player's rows file is its own and fresh: the night's files do not exist before the night (the pilot removes
`var/j213`, and the first player refuses to start if any exists), and the smoke run writes `var/j213-pilot/smoke.jsonl`,
which no read of the night is handed (D538 point 4). A block that a memory stop or a restart runs again resumes its
player's file (label-probe.sh skips what it holds, tries an error once more, and a second error is final), so a retry
loses no row. The driver runs label-probe.sh again, up to three runs in all, while rows are missing or an error has
had one try; exit 2 (a refusal: another seat config or seed in the file, the lock) fails the step. `--game-timeout
180` is the lane's figure (the probe's default is 1,800 s): a replay to decision d is a few seconds, and a stuck one
is written `error` and retried.

**The 8 h guard** (D538 point 8: "if the smoke run's replayMs puts the night over 8 hours, players are dropped from
the end of this list, never from point 7's"). In the pilot the smoke run's replayMs project the night: a replay of a
player is forge-default's mean replay plus, for a search player, the 1.5 s players' mean ask scaled by its budget
(t1-x3 three times, ms750-r6 half), 605 x its repeats of them over 5.6 parallel JVMs (7 at 80%); the point-8 players
that would carry the night past 8 h are dropped from the end before the night starts. Then, before each of them
starts, the same projection from the night's own rows (its replayMs, and the night's own parallelism: replay seconds
over wall seconds since the first player began) must fit with the hours already spent inside 8 h, or that player
and every later one are dropped. A player that has begun is never dropped. `var/j213/dropped.json` names them and
why; `v.droppedCount` and the report say so. The five rule seats are never dropped.

**The read** (D538 point 7), one command, in the read block exactly as D538 writes it, with ROWS the five rule
seats' night files. Its JSON's `rule.word` is copied to `var/j213/v.json`; `rule.wave2` is point 9's answer; an
exit other than 0 (the tool's refusal, point 4: not one run of the probe under seed 538, another labels file, ...) is
written `NOT READ (refused)` with no word, and the job fails on it. **Beside it, deciding nothing** (point 8), from
the rule read's own JSON: P1 by kind, P1 at `label=forge` and `label!=forge`, P1 on `source!=round2` with its
interval and on `source=round2`, each player's option-0 shares and departure precision; and agreement.py again (no
`--rule`), over every player the night played with the same bootstrap and split, the live search against each and
both random seats against forge-default, once with off-atlas a miss and once dropped: each player's agreement beside
its measured Elo against search-v1-anytime (J211's and J212's match lines read from `var/ai-ladder/` when they are
there), how often a search player's three repeats agree. **Not produced:** the rank correlation of agreement
against Elo that point 8 names; agreement.py computes none and this job writes no statistic of its own.

**When it runs.** Alone (`alone: yes`, D521): every search player's budget is wall-clock, so the probe runs at a
ladder night's worker count with nothing beside it (D538 point 5). `control: no`: the probe does not read the pool
control file, so under memory pressure the runner stops the step and retries it one worker fewer, and the block
resumes its rows; the workers of every run are in `run-<player>.json`.

## Pilot
About 30 minutes:
- the pin is merged;
- the build (the lint and its self-test, javac, the decision self-test: 434 checks expected, 392 on main at
  d1d6b20f as J209 to J211's pilots printed, D537's 12 and D538's 30), the atlas unit tests (33: 25 in
  test_agreement.py, 8 in test_atlas.py), `atlas-selftest` and `seat-identity` (gate step 12m: D538's refactor is on
  D509's frozen seat path), the ladder registry test;
- the twelve players resolve by `ai-ladder.sh cfg` at their registered hashes, the five rule seats at agreement.py's
  `D538_RUN['hashes']`, every seat on Default, a search part last;
- the labels file: sha256 `bbdcd021ef93447f9158bff1f7f2a3c236f91ea98367374b3fc213a654ecd9bb` (also D538_RUN's),
  605 rows and keys, 515 labelled (334 p, 142 a, 39 b; 289 Forge's move; 409 not round 2, 106 round 2), 77 spines;
- the data: every key's spine folder resolves as AtlasProbe resolves it, its baseline lists the decision with the
  label row's options, option 0 Forge's token and the label's token where the labels say, every deck on disk (read
  only; 605 of 605 and 154 decks when this was drafted);
- the code since d1d6b20f under the paths the probe runs: recorded, and the lane's files present;
- the driver's self-test (25 synthetic cases: the guard, the projection, the row tally, and the verdict's copy of the
  word, a refusal and a stale file among them);
- the smoke: the seven decisions of spine J186/s01 (six labelled) with forge-default and policy-outlet once,
  search-v1-anytime twice and search-v2-rrandom4 once, `--seed 538`, at the pilot's workers, into a file of its own;
  checked by agreement.py's own `audit()` under seed 538 (every count 0, the seeds checked) and per player: every
  row present, no error, mismatch or unsupported row, forge-default on option 0 at every ok row and never off the
  atlas, forge-default and policy-outlet never searched, both search players searching at least once and
  search-v1-anytime under its 1.5 s budget on average; then agreement.py's plain read over it (no `--rule`: under
  the rule a smoke of seven decisions reads NOT READ by design, the run not whole); the night projected from its
  replayMs, the five rule seats under 4 h.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j213-merged.txt || echo 0 > var/j213-merged.txt
cat var/j213-merged.txt
mkdir -p var/j213-tools
rc=0; ./bridge/build.sh > var/j213-build.txt 2>&1 || rc=$?
cat var/j213-build.txt
python3 -I -c 'import json, re; t = open("var/j213-build.txt", encoding="utf-8").read(); m = re.search(r"^decision selftest: (\d+) check\(s\), (\d+) failure\(s\)$", t, re.M); r = {"ok": 1 if m and m.group(2) == "0" else 0, "checks": int(m.group(1)) if m else 0, "failures": int(m.group(2)) if m else -1}; json.dump(r, open("var/j213-tools/build.json", "w")); print(r)'
test "$rc" -eq 0
python3 -m unittest discover -s tools/atlas/tests > var/j213-tools/unittest.txt 2>&1 && echo 0 > var/j213-tools/unittest.rc || echo 1 > var/j213-tools/unittest.rc
cat var/j213-tools/unittest.txt
python3 -I -c 'import json, re; t = open("var/j213-tools/unittest.txt", encoding="utf-8").read(); m = re.search(r"^Ran (\d+) tests? in", t, re.M); rc = open("var/j213-tools/unittest.rc").read().strip(); r = {"ok": 1 if rc == "0" and re.search(r"^OK$", t, re.M) else 0, "ran": int(m.group(1)) if m else 0}; json.dump(r, open("var/j213-tools/unittest.json", "w")); print(r)'
env -u LAB_DATA_DIR tools/cubelab.sh atlas-selftest --jobs 3 && echo 1 > var/j213-tools/atlas-selftest.txt || echo 0 > var/j213-tools/atlas-selftest.txt
env -u LAB_DATA_DIR tools/cubelab.sh seat-identity --jobs 3 && echo 1 > var/j213-tools/seat-identity.txt || echo 0 > var/j213-tools/seat-identity.txt
node --test web/test/ai-ladder.test.ts && echo 1 > var/j213-tools/ladder-test.txt || echo 0 > var/j213-tools/ladder-test.txt
```
```bash
# the driver, the players, the labels, the data and the code; the night's folder emptied here (its rows files must
# not exist before the night, D538 point 4); nothing in the lab's data folder is written
rm -rf var/j213 var/j213-pilot
mkdir -p var/j213 var/j213-pilot var/j213-tools
cat > var/j213-tools/night.py <<'J213EOF'
#!/usr/bin/env python3
# J213 (D538 points 6 to 8): the label probe night's driver and its numbers.  Written by the job's pilot to
# var/j213-tools/night.py; run from the mtg-table clone's root with python3 -I.  Standard library and
# tools/atlas/agreement.py (imported for its own row rule, audit() and D538_RUN) only.  It computes no statistic
# and no word: the verdict is rule.word of agreement.py --rule d538's JSON, copied.
#
#   night.py play <player> <workers>   one player's rows: tools/label-probe.sh --seed 538 into var/j213/rows-<p>.jsonl,
#                                      run again (it resumes) while rows are missing or an error is unsettled; before a
#                                      point-8 player starts, the 8 h guard
#   night.py predrop <smoke.jsonl>     the pilot: the night projected from the smoke run's replayMs (D538 point 8's
#                                      words); point-8 players that would put it past 8 h are dropped from the end
#   night.py smoke <smoke.jsonl>       the pilot's smoke rows: agreement.py's audit() under seed 538, and per player
#   night.py rowcheck                  the night's rows, a player at a time (var/j213/rowcheck.json)
#   night.py verdict                   the rule read's exit code and JSON -> var/j213/v.json (the word copied)
#   night.py report                    var/j213/report.md from v.json, the side reads and the runs (numbers only)
#   night.py side | report | players CFG | labels | data | selftest   the side reads, the report, the pilot checks
import collections
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.join(os.getcwd(), 'tools', 'atlas'))
import agreement as A  # noqa: E402

LABELS = 'fixtures/atlas/judged/labels-judged-v1.jsonl'
LABELS_SHA = 'bbdcd021ef93447f9158bff1f7f2a3c236f91ea98367374b3fc213a654ecd9bb'
DATA = '/home/justin-a/code/lab/data'
SEED = 538
GAME_TIMEOUT_S = 180
OUT = 'var/j213'
TOOLS = 'var/j213-tools'
CAP_S = 8 * 3600
PILOT_PARALLEL = 7 * 0.8
ATTEMPTS = 3
LIVE = 'search-v1-anytime'
# point 7's five seats (the rule reads all five, D538 point 6: the run is whole), then point 8's other players in
# its order; policy-outlet is first on point 8's list but is one of the five, so it is never dropped
RULE = ['forge-default', 'search-v1-anytime', 'search-v2-rrandom', 'search-v2-rrandom4', 'policy-outlet']
SECONDARY = ['search-v2-rrandom4-m40', 'search-v2-rmix4them-m40', 'search-v2-ms750-r6', 'search-v2-no-b',
             'search-v2-t1', 'search-v2-a1', 'search-v2-t1-x3']
ALL = RULE + SECONDARY
NOSEARCH = ('forge-default', 'policy-outlet')
BUDGET_MS = {'search-v2-ms750-r6': 750, 'search-v2-t1-x3': 4500}
HASH = {'forge-default': '3ed453ffef1c', 'search-v1-anytime': 'cdd55e02a89c', 'search-v2-rrandom': 'fb8ae32c014d',
        'search-v2-rrandom4': '646d59a008f6', 'policy-outlet': 'e350d94649a4',
        'search-v2-rrandom4-m40': '968c9003c616', 'search-v2-rmix4them-m40': 'fcf472f384b7',
        'search-v2-ms750-r6': 'ef6def992355', 'search-v2-no-b': '59505e241363', 'search-v2-t1': '63c35e9f7d5b',
        'search-v2-a1': '3cf65e94df28', 'search-v2-t1-x3': 'ce99b41f9898'}
TAG = {'forge-default': 'fd', LIVE: 'v1', 'search-v2-rrandom': 'rr', 'search-v2-rrandom4': 'rr4', 'policy-outlet': 'po'}
# each player's Elo against search-v1-anytime as measured (A = the player), D538 points 7 and 8; the four not yet
# measured when D538 was written are read from their match lines in var/ai-ladder/ when those exist (information)
ELO = {'search-v1-anytime': [0.0, 0.0, 0.0, 'the reference'],
       'forge-default': [-89.4, -105.1, -73.9, 'J210 pab'],
       'search-v2-rrandom': [-43.7, -57.1, -30.4, 'J199 a'],
       'search-v2-rrandom4': [-39.5, -53.9, -25.3, 'J202 a'],
       'policy-outlet': [-84.4, -99.9, -69.3, 'J204 b'],
       'search-v2-rrandom4-m40': [-20.9, -34.1, -7.7, 'J202 b'],
       'search-v2-rmix4them-m40': [-6.9, -17.8, 3.9, 'J209 a'],
       'search-v2-ms750-r6': [-6.5, -11.7, -1.3, 'J198']}
LATER = {'search-v2-no-b': 'var/ai-ladder/match-J211.json', 'search-v2-t1': 'var/ai-ladder/match-J212-t1.json',
         'search-v2-a1': 'var/ai-ladder/match-J212-a1.json', 'search-v2-t1-x3': 'var/ai-ladder/match-J212-x3.json'}
WORDS = {'AGREEMENT TRACKS ELO': 'tracks', 'AGREEMENT DOES NOT TRACK ELO': 'doesNotTrack',
         'INCONCLUSIVE': 'inconclusive', 'VOID': 'void', 'NOT READ': 'notRead'}
ANSWERED = ('ok', 'off-atlas', 'ambiguous')   # rows where the ask ran, so `searched` is reported


def repeats(p):
    return 1 if p in NOSEARCH else 3


def rows_path(p):
    return OUT + '/rows-' + p + '.jsonl'


def stamp():
    return time.strftime('%Y-%m-%dT%H:%M:%S%z')


def load(path, default=None):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def save(path, obj):
    d = os.path.dirname(path)
    if d:
        os.makedirs(d, exist_ok=True)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(json.dumps(obj, indent=1, sort_keys=True) + '\n')
    os.replace(tmp, path)


def rows_of(path, player=None):
    if not os.path.exists(path):
        return []
    return [r for r in A.read_jsonl(path) if player is None or r.get('player') == player]


def label_rows():
    return A.read_jsonl(LABELS)


def mean(xs):
    xs = list(xs)
    return sum(xs) / len(xs) if xs else None


def num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def tally(p, rows, keys):
    """Player p's (key, repeat) cells: wanted (keys x its repeats), held, missing, outside the plan; the held row's
    status (agreement.py's row: the last that is not an error, else the last error); errors tried once only
    (`unsettled`: the probe tries an error once more, AtlasProbe.ERROR_TRIES)."""
    reps = A.collect(rows).get(p, {'reps': {}})['reps']
    want = {(k, r) for k in keys for r in range(repeats(p))}
    got = set(reps)
    st = collections.Counter(str(reps[c].get('status')) for c in got & want)
    errs = collections.Counter((r.get('key'), r.get('repeat')) for r in rows if r.get('status') == 'error')
    unsettled = sum(1 for c in got & want if reps[c].get('status') == 'error' and errs[c] < A.ERROR_TRIES)
    return {'expected': len(want), 'rows': len(got & want), 'missing': len(want - got), 'extra': len(got - want),
            'error': st.get('error', 0), 'unsettled': unsettled, 'statuses': dict(sorted(st.items()))}


# ------------------------------------------------------------------ the projection and the guard (D538 point 8)

def replay_ms(rows):
    return [r['replayMs'] for r in rows if num(r.get('replayMs')) and r['replayMs'] >= 0]


def timing(byp):
    """forge-default's mean replay (the replay to d; Forge's answer is option 0 and not asked again), the 1.5 s
    search players' mean (the replay and a 1.5 s ask), and every row's replay seconds summed."""
    sf = mean(replay_ms(byp.get('forge-default', [])))
    s15 = mean([x for p, rs in byp.items() if p not in NOSEARCH and BUDGET_MS.get(p, 1500) == 1500
                for x in replay_ms(rs)])
    total = sum(x for rs in byp.values() for x in replay_ms(rs)) / 1000.0
    return sf, s15, total


def per_replay_s(p, sf, s15):
    """A replay of p in seconds: forge-default's, plus for a search player the 1.5 s players' ask scaled by p's
    budget."""
    if sf is None:
        return None
    if p in NOSEARCH:
        return sf / 1000.0
    if s15 is None:
        return None
    return (sf + max(0.0, s15 - sf) * BUDGET_MS.get(p, 1500) / 1500.0) / 1000.0


def fits(elapsed_s, projected_s, cap_s=CAP_S):
    return projected_s is None or elapsed_s + projected_s <= cap_s


def plan_drops(rule_s, sec_s, cap_s=CAP_S):
    """Point 8's players in order, each kept while the night still fits; from the first that does not, it and every
    later one dropped (from the end of the list, never point 7's seats)."""
    t, out = rule_s, []
    for p, s in sec_s:
        if out or not fits(t, s, cap_s):
            out.append(p)
            continue
        t += s
    return out, t


def drop(p, run, dr, why, guard):
    if p not in dr['dropped']:
        dr['dropped'].append(p)
    dr['why'][p] = why
    save(OUT + '/dropped.json', dr)
    run.update({'dropped': 1, 'why': why, 'guard': guard})
    save(OUT + '/run-' + p + '.json', run)
    print('J213: %s dropped: %s' % (p, why), flush=True)
    return 0


def play(p, workers):
    if p not in ALL:
        print('night: %s is not one of J213 players' % p, file=sys.stderr)
        return 2
    os.makedirs(OUT, exist_ok=True)
    start = load(OUT + '/night-start.json')
    if start is None:
        # D538 point 4: the night's --out files do not exist before the night (a smoke run's rows in one would be
        # read as the night's own); the marker below is written once, so a retried block resumes
        old = [rows_path(q) for q in ALL if os.path.exists(rows_path(q))]
        if old:
            print('J213: the night has not started and its rows files exist: %s' % ', '.join(old), file=sys.stderr)
            return 2
        start = {'t': time.time(), 'at': stamp()}
        save(OUT + '/night-start.json', start)
    keys = [r['key'] for r in label_rows()]
    runf = OUT + '/run-' + p + '.json'
    run = load(runf) or {'player': p, 'hash': HASH[p], 'repeats': repeats(p), 'attempts': [], 'dropped': 0,
                         'guard': None}
    dr = load(OUT + '/dropped.json') or {'dropped': [], 'why': {}}
    if p in dr['dropped']:
        print('J213: %s was dropped: %s' % (p, dr['why'].get(p)), flush=True)
        run.update({'dropped': 1, 'why': dr['why'].get(p)})
        save(runf, run)
        return 0
    if p in SECONDARY:
        have = tally(p, rows_of(rows_path(p), p), keys)
        if dr['dropped']:
            return drop(p, run, dr, 'after %s: point 8 drops players from the end of its list' % dr['dropped'][0], None)
        if have['rows'] == 0:
            byp = {q: rows_of(rows_path(q), q) for q in ALL if q != p}
            sf, s15, total = timing(byp)
            elapsed = time.time() - start['t']
            par = total / elapsed if elapsed > 0 and total > 0 else None
            per = per_replay_s(p, sf, s15)
            proj = have['expected'] * per / par if per is not None and par else None
            guard = {'elapsedS': round(elapsed), 'projectedS': None if proj is None else round(proj),
                     'replayS': per, 'parallel': par, 'remaining': have['expected'], 'capS': CAP_S, 'at': stamp()}
            run['guard'] = guard
            if not fits(elapsed, proj):
                return drop(p, run, dr, 'the night: %.2f h elapsed + %.2f h projected > 8 h'
                            % (elapsed / 3600, proj / 3600), guard)
    for _ in range(ATTEMPTS):
        t0 = time.time()
        cmd = ['./tools/label-probe.sh', '--decisions', LABELS, '--player', p, '--data', DATA,
               '--repeats', str(repeats(p)), '--seed', str(SEED), '--workers', str(workers),
               '--game-timeout', str(GAME_TIMEOUT_S), '--out', rows_path(p)]
        print('J213: ' + ' '.join(cmd), flush=True)
        rc = subprocess.call(cmd)
        t = tally(p, rows_of(rows_path(p), p), keys)
        run['attempts'].append({'rc': rc, 'wallS': round(time.time() - t0, 1), 'workers': int(workers), 'at': stamp(),
                                'rows': t['rows'], 'missing': t['missing'], 'error': t['error'],
                                'unsettled': t['unsettled']})
        run['tally'] = t
        save(runf, run)
        if rc == 2:
            print('J213: label-probe.sh refused %s (exit 2: usage, the lock, or rows of another seat config or seed)'
                  % p, file=sys.stderr)
            return 2
        if rc == 0 and t['missing'] == 0 and t['unsettled'] == 0:
            break
    print('J213: %s: %s' % (p, json.dumps(run['tally'], sort_keys=True)), flush=True)
    return 0


def predrop(smoke_path):
    byp = collections.defaultdict(list)
    for r in rows_of(smoke_path):
        byp[r.get('player')].append(r)
    sf, s15, _ = timing(dict(byp))
    n = len(label_rows())
    per = {p: per_replay_s(p, sf, s15) for p in ALL}
    secs = {p: None if per[p] is None else n * repeats(p) * per[p] / PILOT_PARALLEL for p in ALL}
    ok = all(v is not None for v in secs.values())
    rule_s = sum(secs[p] for p in RULE) if ok else None
    dropped, kept_s = plan_drops(rule_s, [(p, secs[p]) for p in SECONDARY]) if ok else ([], None)
    out = {'written': 1, 'ok': 1 if ok else 0, 'forgeReplayMs': sf, 'search15ReplayMs': s15,
           'askMs': None if sf is None or s15 is None else max(0.0, s15 - sf), 'parallel': PILOT_PARALLEL,
           'decisions': n, 'hours': {p: None if v is None else round(v / 3600, 3) for p, v in secs.items()},
           'ruleHours': round(rule_s / 3600, 3) if ok else 99,
           'allHours': round(sum(secs.values()) / 3600, 3) if ok else 99,
           'keptHours': round(kept_s / 3600, 3) if ok else 99,
           'predropped': dropped, 'predroppedCount': len(dropped)}
    save(TOOLS + '/projection.json', out)
    if ok and dropped:
        why = ('the smoke run projects the night at %.2f h with every point-8 player and %.2f h without these '
               '(D538 point 8)' % (out['allHours'], out['keptHours']))
        save(OUT + '/dropped.json', {'dropped': dropped, 'why': {p: why for p in dropped}, 'predropped': dropped})
    print(json.dumps(out, sort_keys=True))
    return 0


def smoke(smoke_path):
    rows = rows_of(smoke_path)
    lrows = label_rows()
    keys = [r['key'] for r in lrows if r['key'].startswith('J186/s01/')]
    au = A.audit(rows, lrows, SEED)
    out = {'written': 1, 'keys': len(keys), 'audit': au['counts'], 'auditFirst': au['first'],
           'auditBad': sum(v for v in au['counts'].values() if num(v)),
           'seedChecked': 1 if au['counts'].get('seedMismatch') == 0 else 0, 'hashes': au['hashes']}
    for p, n in (('forge-default', 1), ('policy-outlet', 1), (LIVE, 2), ('search-v2-rrandom4', 1)):
        pr = [r for r in rows if r.get('player') == p]
        reps = A.collect(pr).get(p, {'reps': {}})['reps']
        want = {(k, r) for k in keys for r in range(n)}
        fin = [reps[c] for c in set(reps) & want]
        st = collections.Counter(str(r.get('status')) for r in fin)
        srch = [r for r in fin if r.get('searched') is True]
        sms = [r['searchMs'] for r in srch if num(r.get('searchMs'))]
        out[TAG[p]] = {'rows': len(fin), 'expected': len(want), 'extra': len(set(reps) - want), 'ok': st.get('ok', 0),
                       'offAtlas': st.get('off-atlas', 0), 'ambiguous': st.get('ambiguous', 0),
                       'mismatch': st.get('mismatch', 0), 'error': st.get('error', 0),
                       'unsupported': st.get('unsupported', 0),
                       'bad': st.get('error', 0) + st.get('mismatch', 0) + st.get('unsupported', 0),
                       'nonZero': sum(1 for r in fin if r.get('status') == 'ok' and r.get('option') != 0),
                       'searched': len(srch),
                       'askedNotFalse': sum(1 for r in fin if r.get('status') in ANSWERED and r.get('searched') is not False),
                       'hashOk': 1 if pr and all(r.get('hash') == HASH[p] for r in pr) else 0,
                       'seats': len({r.get('seat') for r in pr}),
                       'searchMsMean': round(mean(sms), 1) if sms else 0, 'searchMsMax': max(sms) if sms else 0,
                       'replayMsMean': round(mean(replay_ms(fin)), 1) if replay_ms(fin) else 0}
    print(json.dumps(out, sort_keys=True))
    return 0


def rowcheck():
    keys = [r['key'] for r in label_rows()]
    dr = load(OUT + '/dropped.json') or {'dropped': [], 'why': {}}
    out = {'written': 1, 'players': {}, 'dropped': len(dr['dropped']),
           'droppedRule': sum(1 for p in RULE if p in dr['dropped'])}
    full = {}
    for p in ALL:
        rows = rows_of(rows_path(p), p)
        if p in dr['dropped']:
            out['players'][p] = {'dropped': 1, 'rowsHeld': len(rows)}
            continue
        t = tally(p, rows, keys)
        t['wrongHash'] = sum(1 for r in rows if r.get('hash') != HASH[p])
        t['seats'] = len({r.get('seat') for r in rows})
        t['errShare'] = t['error'] / t['expected']
        t['full'] = 1 if t['rows'] == t['expected'] and t['extra'] == 0 else 0
        t['run'] = load(OUT + '/run-' + p + '.json')
        out['players'][p] = t
        full[p] = t['full']
        if p in TAG:
            out[TAG[p] + 'Rows'] = t['rows']
    kept = [p for p in ALL if p not in dr['dropped']]
    out['played'] = len(kept)
    out['ruleFull'] = sum(full.get(p, 0) for p in RULE)
    out['secondaryFull'] = 1 if all(full.get(p, 0) for p in SECONDARY if p in kept) else 0
    out['errShareMax'] = max([out['players'][p]['errShare'] for p in kept] or [0])
    out['errors'] = sum(out['players'][p]['error'] for p in kept)
    out['wrongHash'] = sum(out['players'][p]['wrongHash'] for p in kept)
    out['extra'] = sum(out['players'][p]['extra'] for p in kept)
    out['seatsMax'] = max([out['players'][p]['seats'] for p in kept] or [0])
    out['unsupported'] = sum(out['players'][p]['statuses'].get('unsupported', 0) for p in kept)
    for tag in TAG.values():
        out.setdefault(tag + 'Rows', 0)
    save(OUT + '/rowcheck.json', out)
    print(json.dumps({k: x for k, x in out.items() if k != 'players'}, sort_keys=True))
    return 0


def pair_of(read, a, b):
    for d in (read or {}).get('pairs', []):
        if d.get('a') == a and d.get('b') == b:
            return d
    return None


def short(d, sub=None):
    if d is None:
        return None
    m = d if sub is None else (d.get('subsets') or {}).get(sub)
    if not m:
        return None
    return {'n': m.get('n'), 'mean': m.get('mean'), 'lo': m.get('lo'), 'hi': m.get('hi')}


def verdict_of(rc, read):
    """v.json: the rule read's exit code and its JSON, the word copied from rule.word (exit 2, or no rule in the
    JSON: NOT READ (refused), no word of point 7). Every number the checks read, numeric."""
    rule = (read or {}).get('rule') if rc == 0 else None
    au = (read or {}).get('audit') or {}
    counts = au.get('counts') or {}
    cells = au.get('cells') or {}
    word = rule.get('word') if isinstance(rule, dict) else None
    v = {'written': 1, 'readRc': rc, 'refused': 0 if rule else 1,
         'word': word if word in WORDS else ('NOT READ (refused)' if not rule else 'UNKNOWN WORD %r' % word),
         'stops': len(rule.get('stops') or []) if rule else -1, 'stopLines': (rule or {}).get('stops'),
         'why': (rule or {}).get('why'), 'look': (rule or {}).get('look', 0) or 0,
         'wave2': 1 if rule and rule.get('wave2') is True else 0,
         'auditBad': sum(n for n in counts.values() if num(n)) if rule else -1,
         'seedChecked': 1 if rule and counts.get('seedMismatch') == 0 else 0,
         'audit': counts, 'auditKeys': au.get('keys', 0) if rule else 0,
         'cells': {TAG[p]: (cells.get(p, 0) if rule else 0) for p in RULE},
         'labelled': ((read or {}).get('labels') or {}).get('labelled', 0) if rule else 0,
         'shaOk': 1 if rule and ((read or {}).get('labels') or {}).get('sha256') == LABELS_SHA else 0,
         'liveSeatChanged': 0}
    for w, k in WORDS.items():
        v[k] = 1 if rule and word == w else 0
    v['words'] = sum(v[k] for k in WORDS.values())
    v['known'] = 1 if v['words'] == 1 else 0
    for name, (a, b) in (('p1', (LIVE, 'forge-default')), ('p2', (LIVE, 'search-v2-rrandom')),
                         ('p3', (LIVE, 'search-v2-rrandom4'))):
        v[name] = short(pair_of(read, a, b)) if rule else None
    v['p1Unselected'] = short(pair_of(read, LIVE, 'forge-default'), A.D538_UNSELECTED) if rule else None
    return v


def verdict():
    rc_text = open(OUT + '/read-rc.txt', encoding='utf-8').read().strip() if os.path.exists(OUT + '/read-rc.txt') else '9'
    rc = int(rc_text) if rc_text.isdigit() else 9
    read = load(OUT + '/read.json') if rc == 0 else None
    v = verdict_of(rc, read)
    dr = load(OUT + '/dropped.json') or {'dropped': [], 'why': {}}
    v.update({'dropped': dr['dropped'], 'droppedCount': len(dr['dropped']), 'droppedWhy': dr['why'],
              'predropped': dr.get('predropped', []), 'at': stamp()})
    save(OUT + '/v.json', v)
    print(json.dumps({k: v[k] for k in ('word', 'readRc', 'stops', 'wave2', 'p1', 'p2', 'p3', 'p1Unselected')},
                     sort_keys=True))
    return 0


def side():
    """D538 point 8, deciding nothing: agreement.py (no --rule) over every player the night played, the point-7 read's
    bootstrap and split, the live search against each and the two random seats against forge-default, with
    off-atlas a miss and then dropped. A failure is recorded in side-rc.json and changes nothing above it."""
    dr = load(OUT + '/dropped.json') or {'dropped': [], 'why': {}}
    played = [p for p in [LIVE] + [q for q in ALL if q != LIVE] if p not in dr['dropped'] and os.path.exists(rows_path(p))]
    pairs = ['%s:%s' % (LIVE, p) for p in played if p != LIVE] + \
        ['%s:forge-default' % p for p in ('search-v2-rrandom', 'search-v2-rrandom4') if p in played]
    rcs = {}
    for mode, name in (('miss', 'side'), ('drop', 'side-drop')):
        cmd = [sys.executable, '-I', 'tools/atlas/agreement.py', '--labels', LABELS, '--boot', '4000', '--seed', str(SEED),
               '--players', ','.join(played), '--pairs', ','.join(pairs), '--split', 'source=round2',
               '--off-atlas', mode, '--json', OUT + '/' + name + '.json'] + [rows_path(p) for p in played]
        print('J213: ' + ' '.join(cmd), flush=True)
        with open(OUT + '/' + name + '.txt', 'w', encoding='utf-8') as f:
            rcs[name] = subprocess.call(cmd, stdout=f)
    save(OUT + '/side-rc.json', {'written': 1, 'rc': rcs, 'ok': 1 if all(v == 0 for v in rcs.values()) else 0,
                                 'players': played})
    print(json.dumps(rcs, sort_keys=True))
    return 0


def players(cfg_txt):
    """The pilot: `ai-ladder.sh cfg NAME` for the twelve (lines NAME<TAB>HASH<TAB>SEAT): each resolves at its
    registered hash, the five rule seats at agreement.py's D538_RUN hashes; a search player's seat ends in its
    +search part, a non-search one has none; every seat on the Default profile."""
    got = {}
    for line in open(cfg_txt, encoding='utf-8'):
        f = line.rstrip('\n').split('\t')
        if len(f) == 3:
            got[f[0]] = (f[1], f[2])
    bad = []
    for p in ALL:
        h, seat = got.get(p, (None, ''))
        at = seat.find('+search')
        if h != HASH[p]:
            bad.append('%s hash %s, not %s' % (p, h, HASH[p]))
        if p in A.D538_RUN['hashes'] and h != A.D538_RUN['hashes'][p]:
            bad.append('%s hash %s, not D538_RUN %s' % (p, h, A.D538_RUN['hashes'][p]))
        if not (seat == 'Default' or seat.startswith('Default+')):
            bad.append('%s seat %r is not on Default' % (p, seat))
        if (p in NOSEARCH) != (at < 0) or (at >= 0 and '+' in seat[at + 1:]):
            bad.append('%s seat %r: +search wrong' % (p, seat))
    out = {'written': 1, 'resolved': len([p for p in ALL if p in got]), 'bad': bad, 'ok': 0 if bad else 1,
           'rule': sum(1 for p in RULE if got.get(p, (None,))[0] == A.D538_RUN['hashes'][p]),
           'seats': {p: got.get(p, (None, None))[1] for p in ALL}}
    print(json.dumps(out, sort_keys=True))
    return 0


def labels_check():
    import hashlib
    with open(LABELS, 'rb') as f:
        sha = hashlib.sha256(f.read()).hexdigest()
    rs = label_rows()
    lab = [r for r in rs if r.get('label') is not None]
    out = {'written': 1, 'shaOk': 1 if sha == LABELS_SHA == A.D538_RUN['labelsSha256'] else 0, 'rows': len(rs),
           'keys': len({r['key'] for r in rs}), 'labelled': len(lab),
           'p': sum(1 for r in lab if r['kind'] == 'p'), 'a': sum(1 for r in lab if r['kind'] == 'a'),
           'b': sum(1 for r in lab if r['kind'] == 'b'), 'forge': sum(1 for r in lab if r['label'] == 0),
           'spines': len({(r['night'], r['spine']) for r in lab}),
           'unselected': sum(1 for r in lab if r.get('source') != 'round2'),
           'round2': sum(1 for r in lab if r.get('source') == 'round2'),
           'pilotKeys': sum(1 for r in rs if r['key'].startswith('J186/s01/')), 'runLabelled': A.D538_RUN['labelled']}
    print(json.dumps(out, sort_keys=True))
    return 0


def data_check():
    """Every key's spine folder under the lab's data, as AtlasProbe finds it (<data>/lab-<night>/b-<spine>-*, exactly
    one), its plan.json and phaseB/baseline.json, the baseline's listing at d (k options, option 0 Forge's token,
    the label's token), and both decks on disk. Read only."""
    rs = label_rows()
    bad, found, decks = [], 0, set()
    cache = {}
    for r in rs:
        nd = os.path.join(DATA, 'lab-' + r['night'].lower())
        sk = (r['night'], r['spine'])
        if sk not in cache:
            try:
                hits = [x for x in os.listdir(nd) if x.startswith('b-' + r['spine'] + '-') and os.path.isdir(os.path.join(nd, x))]
            except OSError:
                hits = []
            if len(hits) != 1:
                cache[sk] = None
            else:
                d = os.path.join(nd, hits[0])
                plan = load(os.path.join(d, 'plan.json'))
                base = load(os.path.join(d, 'phaseB', 'baseline.json'))
                cache[sk] = None if not plan or not base else (plan, {m.get('d'): m for m in base.get('decisions', [])})
                if plan:
                    decks.update([plan.get('deckA'), plan.get('deckB')])
        sp = cache[sk]
        m = sp[1].get(r['d']) if sp else None
        if not m:
            bad.append(r['key'])
            continue
        t = m.get('tokens') or []
        if len(t) != r['k'] or t[0] != r['forgeToken'] or (r['label'] is not None and t[r['label']] != r['labelToken']):
            bad.append(r['key'])
            continue
        found += 1
    missing = [x for x in decks if not x or not os.path.isfile(x)]
    out = {'written': 1, 'keys': len(rs), 'found': found, 'bad': len(bad), 'badKeys': bad[:10],
           'spines': len(cache), 'spinesBad': sum(1 for v in cache.values() if v is None), 'decks': len(decks),
           'decksMissing': len(missing), 'ok': 1 if found == len(rs) and not missing else 0}
    print(json.dumps(out, sort_keys=True))
    return 0


def later_elo(p):
    m = load(LATER[p]) if p in LATER else None
    if not m or m.get('a') != p or m.get('b') != LIVE or str(m.get('ah')) != HASH[p] or str(m.get('bh')) != HASH[LIVE] \
            or m.get('complete') is not True or not all(num(m.get(k)) for k in ('elo', 'eloLo', 'eloHi')):
        return None
    return [m['elo'], m['eloLo'], m['eloHi'], os.path.basename(LATER[p])]


def fmt(m):
    if not m or not num(m.get('mean')):
        return '-'
    lo, hi = m.get('lo'), m.get('hi')
    return '%+.4f [%s, %s] (n %s)' % (m['mean'], '%+.4f' % lo if num(lo) else 'n/a', '%+.4f' % hi if num(hi) else 'n/a',
                                      m.get('n'))


def report():
    v = load(OUT + '/v.json') or {}
    read = load(OUT + '/read.json') or {}
    side = load(OUT + '/side.json')
    drop_ = load(OUT + '/side-drop.json')
    rc = load(OUT + '/rowcheck.json') or {}
    L = ['# J213: the label probe (D538) -- does agreement with the judged labels track Elo?', '',
         '**The rule read** (agreement.py --rule d538, exit %s): **%s**. Wave 2 (point 9): %s. Look %s.'
         % (v.get('readRc'), v.get('word'), 'bought' if v.get('wave2') else 'not bought', v.get('look')), '']
    for x in v.get('stopLines') or []:
        L.append('- stop: %s' % x)
    L += ['', '| pair | A - B | delta [95%] |', '|---|---|---|',
          '| P1 | search-v1-anytime - forge-default | %s |' % fmt(v.get('p1')),
          '| P1, source!=round2 | the same, the 409 labels nobody selected | %s |' % fmt(v.get('p1Unselected')),
          '| P2 | search-v1-anytime - search-v2-rrandom | %s |' % fmt(v.get('p2')),
          '| P3 | search-v1-anytime - search-v2-rrandom4 | %s |' % fmt(v.get('p3')), '',
          'Audit (rows as the files hold them): %s; decisions %s; cells %s; labelled %s; labels sha256 ok %s.'
          % (json.dumps(v.get('audit'), sort_keys=True), v.get('auditKeys'), json.dumps(v.get('cells'), sort_keys=True),
             v.get('labelled'), v.get('shaOk')), '',
          'Dropped from point 8 (from the end): %s. Rows: %s errors held, the largest error share %.4f, %s unsupported.'
          % (', '.join(v.get('dropped') or []) or 'none', rc.get('errors'), rc.get('errShareMax') or 0,
             rc.get('unsupported')), '']
    L += ['| player | rows | statuses | attempts (rc, wall s, workers) |', '|---|---|---|---|']
    for p, t in (rc.get('players') or {}).items():
        if t.get('dropped'):
            L.append('| %s | dropped | | |' % p)
            continue
        att = ', '.join('(%s, %s, %s)' % (a['rc'], a['wallS'], a['workers']) for a in ((t.get('run') or {}).get('attempts') or []))
        L.append('| %s | %d / %d | %s | %s |' % (p, t['rows'], t['expected'], json.dumps(t['statuses'], sort_keys=True), att))
    pr = read.get('pairs') or []
    if read.get('rule'):
        L += ['', 'P1 by subset, from the rule read (deciding nothing, D538 point 8):', '']
        p1 = pair_of(read, LIVE, 'forge-default') or {}
        for sub in read.get('subsets') or []:
            L.append('- %s: %s' % (sub, fmt((p1.get('subsets') or {}).get(sub))))
    if side:
        L += ['', 'Beside the rule, deciding nothing (D538 point 8): agreement.py over every player probed, '
              '--off-atlas miss and drop.', '',
              '| player | Elo vs search-v1-anytime | agreement | option 0 | option 0 at label=forge | '
              'option 0 at label!=forge | departure precision | answered | off-atlas | repeats agree |',
              '|---|---|---|---|---|---|---|---|---|---|']
        for p, e in side['players'].items():
            c, s = e['counts'], e['stats']
            elo = ELO.get(p) or later_elo(p)
            L.append('| %s | %s | %s | %s | %s | %s | %s | %d | %d | %s |' % (
                p, '-' if not elo else '%+.1f [%+.1f, %+.1f] %s' % tuple(elo), fmt(s['all']['label']),
                fmt(s['all']['zero']), fmt(s['label=forge']['zero']), fmt(s['label!=forge']['zero']),
                fmt(e.get('departure')), c['answered'], c['offAtlas'],
                '%.3f' % (c['stable'] / c['answered']) if c['answered'] else '-'))
        L += ['', 'Pairs, A - B, --off-atlas miss | drop:', '']
        for d in side['pairs']:
            dd = pair_of(drop_, d['a'], d['b']) if drop_ else None
            L.append('- %s - %s: %s | %s' % (d['a'], d['b'], fmt(d), fmt(dd)))
    L += ['', 'Not produced: the rank correlation of agreement against Elo (D538 point 8); agreement.py computes '
          'none and this job writes no statistic of its own.']
    del pr
    with open(OUT + '/report.md', 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')
    print('\n'.join(L))
    return 0


# ------------------------------------------------------------------ the self-test

def selftest():
    cases = []

    def case(name, ok):
        cases.append({'name': name, 'ok': bool(ok)})

    case('the guard: 7 h + 0.5 h fits', fits(7 * 3600, 1800))
    case('the guard: 7.5 h + 0.5 h fits (at most 8 h)', fits(7.5 * 3600, 1800))
    case('the guard: 7.6 h + 0.5 h does not', not fits(7.6 * 3600, 1800))
    case('the guard: no projection, no drop', fits(9 * 3600, None))
    dl, kept = plan_drops(5 * 3600, [('a', 3600), ('b', 2.5 * 3600), ('c', 600), ('d', 60)])
    case('point 8 drops from the first that does not fit to the end', dl == ['b', 'c', 'd'] and kept == 6 * 3600)
    dl, kept = plan_drops(5 * 3600, [('a', 3600), ('b', 2 * 3600)])
    case('exactly 8 h fits', dl == [] and kept == 8 * 3600)
    case('a search replay: forge replay plus the 1.5 s ask scaled by the budget',
         per_replay_s('search-v2-t1-x3', 3000, 4500) == 7.5 and per_replay_s('search-v2-ms750-r6', 3000, 4500) == 3.75
         and per_replay_s('search-v2-a1', 3000, 4500) == 4.5 and per_replay_s('policy-outlet', 3000, 4500) == 3.0)
    case('no measurement: no projection',
         per_replay_s('search-v2-a1', 3000, None) is None and per_replay_s('policy-outlet', None, None) is None)
    sf, s15, total = timing({'forge-default': [{'replayMs': 2000}, {'replayMs': 4000}, {'replayMs': -1}],
                             LIVE: [{'replayMs': 4000}], 'search-v2-t1-x3': [{'replayMs': 9000}]})
    case('timing: forge-default mean, the 1.5 s players mean, every replay summed', sf == 3000 and s15 == 4000 and total == 19.0)
    case('policy-outlet is a rule seat, never on the drop list', 'policy-outlet' in RULE and 'policy-outlet' not in SECONDARY)
    case('the five rule seats are agreement.py D538_RUN seats, at its repeats and hashes',
         set(RULE) == set(A.D538_RUN['repeats']) and all(A.D538_RUN['repeats'][p] == repeats(p) for p in RULE)
         and all(A.D538_RUN['hashes'][p] == HASH[p] for p in RULE))
    case('the labels sha256 is D538_RUN', A.D538_RUN['labelsSha256'] == LABELS_SHA)

    keys = ['N1/s01/d%d' % i for i in range(4)]

    def r(p, k, rep, st='ok'):
        return {'player': p, 'key': k, 'repeat': rep, 'status': st}
    rows = [r(LIVE, k, rep) for k in keys for rep in range(3)]
    t = tally(LIVE, rows, keys)
    case('tally: a whole player', t['rows'] == 12 and t['missing'] == 0 and t['unsettled'] == 0)
    rows2 = rows[1:] + [r(LIVE, keys[0], 0, 'error')]
    t = tally(LIVE, rows2, keys)
    case('tally: one error, unsettled', t['error'] == 1 and t['unsettled'] == 1 and t['missing'] == 0)
    t = tally(LIVE, rows2 + [r(LIVE, keys[0], 0, 'error')], keys)
    case('tally: the second error is final', t['error'] == 1 and t['unsettled'] == 0)
    t = tally(LIVE, rows2 + [r(LIVE, keys[0], 0, 'ok')], keys)
    case('tally: an error then an ok row is the ok row', t['error'] == 0 and t['rows'] == 12)
    t = tally(LIVE, rows[:-1] + [r(LIVE, 'X/s9/d1', 0), r(LIVE, keys[0], 3)], keys)
    case('tally: missing and outside the plan counted', t['missing'] == 1 and t['extra'] == 2)

    def rd(word, counts=None, cells=None, sha=LABELS_SHA, wave2=False):
        c = dict.fromkeys(A.AUDIT, 0)
        c.update(counts or {})
        return {'labels': {'labelled': 515, 'sha256': sha},
                'audit': {'counts': c, 'keys': 605, 'cells': cells or {p: 605 * repeats(p) for p in RULE}},
                'rule': {'word': word, 'stops': [] if word in ('INCONCLUSIVE', 'AGREEMENT TRACKS ELO',
                                                               'AGREEMENT DOES NOT TRACK ELO') else ['x'],
                         'why': [], 'look': 1, 'wave2': wave2},
                'pairs': [{'a': LIVE, 'b': 'forge-default', 'n': 100, 'mean': .02, 'lo': .01, 'hi': .03,
                           'subsets': {A.D538_UNSELECTED: {'n': 80, 'mean': .01, 'lo': -.01, 'hi': .03}}}]}
    v = verdict_of(0, rd('AGREEMENT TRACKS ELO', wave2=True))
    case('the word is copied: TRACKS', v['tracks'] == 1 and v['words'] == 1 and v['wave2'] == 1 and v['auditBad'] == 0
         and v['seedChecked'] == 1 and v['cells'] == {'fd': 605, 'v1': 1815, 'rr': 1815, 'rr4': 1815, 'po': 605}
         and v['p1']['mean'] == .02 and v['p1Unselected']['n'] == 80 and v['p2'] is None and v['shaOk'] == 1)
    v = verdict_of(0, rd('NOT READ', cells={'forge-default': 604}))
    case('NOT READ copied, a missing cell seen', v['notRead'] == 1 and v['words'] == 1 and v['cells']['fd'] == 604
         and v['cells']['po'] == 0 and v['stops'] == 1)
    v = verdict_of(0, rd('VOID'))
    case('VOID copied', v['void'] == 1 and v['words'] == 1)
    v = verdict_of(2, rd('AGREEMENT TRACKS ELO'))
    case('exit 2: NOT READ (refused), no word whatever a stale file says', v['refused'] == 1 and v['words'] == 0
         and v['word'] == 'NOT READ (refused)' and v['tracks'] == 0 and v['auditBad'] == -1)
    v = verdict_of(0, None)
    case('exit 0 and no JSON: refused, no word', v['refused'] == 1 and v['words'] == 0)
    v = verdict_of(0, rd('MAYBE'))
    case('a word the rule does not have: no word', v['words'] == 0 and v['known'] == 0)
    v = verdict_of(0, dict(rd('INCONCLUSIVE'), audit={'counts': dict(dict.fromkeys(A.AUDIT, 0), seedMismatch=None),
                                                      'keys': 605, 'cells': {}}))
    case('seeds not checked: seedChecked 0', v['seedChecked'] == 0)
    case('another labels file: shaOk 0', verdict_of(0, rd('INCONCLUSIVE', sha='0' * 64))['shaOk'] == 0)
    passed = sum(1 for c in cases if c['ok'])
    out = {'selftest': 1, 'cases': len(cases), 'passed': passed, 'ok': 1 if passed == len(cases) else 0,
           'failed': [c['name'] for c in cases if not c['ok']]}
    print(json.dumps(out, sort_keys=True))
    return 0


def main(argv):
    cmds = {'play': (2, play), 'predrop': (1, predrop), 'smoke': (1, smoke), 'rowcheck': (0, rowcheck),
            'verdict': (0, verdict), 'side': (0, side), 'report': (0, report), 'selftest': (0, selftest),
            'players': (1, players), 'labels': (0, labels_check), 'data': (0, data_check)}
    if not argv or argv[0] not in cmds or len(argv) - 1 != cmds[argv[0]][0]:
        print('night.py play P W | predrop SMOKE | smoke SMOKE | rowcheck | verdict | side | report | selftest | '
              'players CFG | labels | data', file=sys.stderr)
        return 2
    return cmds[argv[0]][1](*argv[1:])


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
J213EOF
python3 -I var/j213-tools/night.py selftest > var/j213-tools/selftest.json
cat var/j213-tools/selftest.json
python3 -I var/j213-tools/night.py labels > var/j213-tools/labels.json
cat var/j213-tools/labels.json
python3 -I var/j213-tools/night.py data > var/j213-tools/data.json
cat var/j213-tools/data.json
: > var/j213-tools/cfg.txt
for p in forge-default search-v1-anytime search-v2-rrandom search-v2-rrandom4 policy-outlet search-v2-rrandom4-m40 search-v2-rmix4them-m40 search-v2-ms750-r6 search-v2-no-b search-v2-t1 search-v2-a1 search-v2-t1-x3; do
  line="$(./tools/ai-ladder.sh cfg "$p" 2>> var/j213-tools/cfg.err || echo FAIL)"
  printf '%s\t%s\n' "$p" "$line" >> var/j213-tools/cfg.txt
done
cat var/j213-tools/cfg.txt
python3 -I var/j213-tools/night.py players var/j213-tools/cfg.txt > var/j213-tools/players.json
cat var/j213-tools/players.json
crc=0; git diff --name-only d1d6b20fd87480c91ffc1ac7b794f8f85c030f9a HEAD -- bridge/src tools/ai-ladder tools/ai-ladder.sh tools/ai-bench tools/cubelab tools/atlas tools/label-probe.sh > var/j213-tools/code-diff.txt || crc=$?
cat var/j213-tools/code-diff.txt
python3 -I -c 'import json, sys; f = [l.strip() for l in open("var/j213-tools/code-diff.txt") if l.strip()]; need = ["bridge/src/mtgtable/ai/LabelProbe.java", "tools/cubelab/AtlasProbe.java", "tools/atlas/agreement.py", "tools/label-probe.sh", "tools/ai-ladder/players.json"]; r = {"rc": int(sys.argv[1]), "count": len(f), "lane": 1 if all(x in f for x in need) else 0, "files": f}; json.dump(r, open("var/j213-tools/code-diff.json", "w")); print(json.dumps(r))' "$crc"
```
```bash
# the smoke: one spine's seven decisions, the four players the rule needs most, --seed 538, a file of its own that no
# read of the night is handed (D538 point 4); then the projection, and point 8's players it drops from the end
python3 -I -c 'import json; [print(json.dumps({"key": r["key"]})) for r in map(json.loads, open("fixtures/atlas/judged/labels-judged-v1.jsonl", encoding="utf-8")) if r["key"].startswith("J186/s01/")]' > var/j213-pilot/keys.jsonl
cat var/j213-pilot/keys.jsonl
./tools/label-probe.sh --decisions var/j213-pilot/keys.jsonl --player forge-default --data /home/justin-a/code/lab/data --repeats 1 --seed 538 --workers {workers} --game-timeout 180 --out var/j213-pilot/smoke.jsonl
./tools/label-probe.sh --decisions var/j213-pilot/keys.jsonl --player policy-outlet --data /home/justin-a/code/lab/data --repeats 1 --seed 538 --workers {workers} --game-timeout 180 --out var/j213-pilot/smoke.jsonl
./tools/label-probe.sh --decisions var/j213-pilot/keys.jsonl --player search-v1-anytime --data /home/justin-a/code/lab/data --repeats 2 --seed 538 --workers {workers} --game-timeout 180 --out var/j213-pilot/smoke.jsonl
./tools/label-probe.sh --decisions var/j213-pilot/keys.jsonl --player search-v2-rrandom4 --data /home/justin-a/code/lab/data --repeats 1 --seed 538 --workers {workers} --game-timeout 180 --out var/j213-pilot/smoke.jsonl
python3 -I var/j213-tools/night.py smoke var/j213-pilot/smoke.jsonl > var/j213-tools/smoke.json
cat var/j213-tools/smoke.json
src=0; python3 -I tools/atlas/agreement.py --labels fixtures/atlas/judged/labels-judged-v1.jsonl --boot 200 --seed 538 --players search-v1-anytime,forge-default,policy-outlet,search-v2-rrandom4 --pairs search-v1-anytime:forge-default,search-v1-anytime:search-v2-rrandom4 --split source=round2 --json var/j213-pilot/smoke-read.json var/j213-pilot/smoke.jsonl > var/j213-pilot/smoke-read.txt || src=$?
cat var/j213-pilot/smoke-read.txt
python3 -I -c 'import json, sys; rc = int(sys.argv[1]); s = {}
try:
    s = json.load(open("var/j213-pilot/smoke-read.json")) if rc == 0 else {}
except (OSError, ValueError):
    pass
pl = s.get("players") or {}
r = {"rc": rc, "players": len(pl), "labelled": (s.get("labels") or {}).get("labelled", 0), "pairs": len(s.get("pairs") or []), "fdAnswered": ((pl.get("forge-default") or {}).get("counts") or {}).get("answered", 0), "v1Answered": ((pl.get("search-v1-anytime") or {}).get("counts") or {}).get("answered", 0)}
json.dump(r, open("var/j213-tools/smoke-read.json", "w")); print(json.dumps(r))' "$src"
python3 -I var/j213-tools/night.py predrop var/j213-pilot/smoke.jsonl
```
metrics: merged = sh: cat var/j213-merged.txt 2>/dev/null || echo 0
metrics: bld = sh: cat var/j213-tools/build.json 2>/dev/null || echo '{"ok":0,"checks":0,"failures":-1}'
metrics: ut = sh: cat var/j213-tools/unittest.json 2>/dev/null || echo '{"ok":0,"ran":0}'
metrics: ast = sh: cat var/j213-tools/atlas-selftest.txt 2>/dev/null || echo 0
metrics: sid = sh: cat var/j213-tools/seat-identity.txt 2>/dev/null || echo 0
metrics: lt = sh: cat var/j213-tools/ladder-test.txt 2>/dev/null || echo 0
metrics: stt = sh: cat var/j213-tools/selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: lb = sh: cat var/j213-tools/labels.json 2>/dev/null || echo '{"shaOk":0,"rows":0,"keys":0,"labelled":0,"p":0,"a":0,"b":0,"forge":0,"spines":0,"unselected":0,"round2":0,"pilotKeys":0,"runLabelled":0}'
metrics: dd = sh: cat var/j213-tools/data.json 2>/dev/null || echo '{"ok":0,"found":0,"keys":0,"spinesBad":-1,"decksMissing":-1}'
metrics: pl = sh: cat var/j213-tools/players.json 2>/dev/null || echo '{"ok":0,"resolved":0,"rule":0}'
metrics: cd = sh: cat var/j213-tools/code-diff.json 2>/dev/null || echo '{"rc":1,"lane":0,"count":-1}'
metrics: sm = sh: cat var/j213-tools/smoke.json 2>/dev/null || echo '{"written":0,"auditBad":-1,"seedChecked":0,"keys":0,"fd":{"rows":0,"ok":0,"nonZero":-1,"offAtlas":-1,"searched":-1,"askedNotFalse":-1,"hashOk":0,"bad":-1},"po":{"rows":0,"bad":-1,"searched":-1,"askedNotFalse":-1,"hashOk":0},"v1":{"rows":0,"bad":-1,"searched":0,"searchMsMean":9999,"hashOk":0},"rr4":{"rows":0,"bad":-1,"searched":0,"hashOk":0}}'
metrics: ag = sh: cat var/j213-tools/smoke-read.json 2>/dev/null || echo '{"rc":-1,"players":0,"labelled":0,"pairs":0,"fdAnswered":0,"v1Answered":0}'
metrics: pj = sh: cat var/j213-tools/projection.json 2>/dev/null || echo '{"ok":0,"ruleHours":99,"allHours":99,"keptHours":99,"predroppedCount":-1}'
check: merged == 1
check: bld.ok == 1
check: bld.failures == 0
check: bld.checks >= 434
check: ut.ok == 1
check: ut.ran == 33
check: ast == 1
check: sid == 1
check: lt == 1
check: stt.ok == 1
check: stt.cases == 25
check: stt.passed == 25
check: lb.shaOk == 1
check: lb.rows == 605
check: lb.keys == 605
check: lb.labelled == 515
check: lb.runLabelled == 515
check: lb.p == 334
check: lb.a == 142
check: lb.b == 39
check: lb.forge == 289
check: lb.spines == 77
check: lb.unselected == 409
check: lb.round2 == 106
check: lb.pilotKeys == 7
check: dd.ok == 1
check: dd.found == 605
check: dd.spinesBad == 0
check: dd.decksMissing == 0
check: pl.ok == 1
check: pl.resolved == 12
check: pl.rule == 5
check: cd.rc == 0
check: cd.lane == 1
check: sm.written == 1
check: sm.keys == 7
check: sm.auditBad == 0
check: sm.seedChecked == 1
check: sm.fd.rows == 7
check: sm.fd.ok == 7
check: sm.fd.nonZero == 0
check: sm.fd.offAtlas == 0
check: sm.fd.searched == 0
check: sm.fd.askedNotFalse == 0
check: sm.fd.hashOk == 1
check: sm.po.rows == 7
check: sm.po.bad == 0
check: sm.po.searched == 0
check: sm.po.askedNotFalse == 0
check: sm.po.hashOk == 1
check: sm.v1.rows == 14
check: sm.v1.bad == 0
check: sm.v1.searched >= 1
check: sm.v1.searchMsMean < 1500
check: sm.v1.hashOk == 1
check: sm.rr4.rows == 7
check: sm.rr4.bad == 0
check: sm.rr4.searched >= 1
check: sm.rr4.hashOk == 1
check: ag.rc == 0
check: ag.players == 4
check: ag.labelled == 515
check: ag.pairs == 2
check: ag.fdAnswered == 6
check: ag.v1Answered == 6
check: pj.ok == 1
check: pj.ruleHours <= 4

The pilot asks only whether anything is broken:
- `merged`: the pinned commit is on `origin/main`;
- `bld`: the build passed and printed its decision self-test with 0 failures and at least 434 checks (392 on main
  at d1d6b20f, D537's 12, D538's 30 as the lane is written); `ut`: the 33 atlas unit tests ran and passed; `ast`,
  `sid`: atlas-selftest and seat-identity passed, so D538's refactor moved no record of the frozen seat; `lt`: the
  ladder registry test (D537's three arms' params, seat configs and hashes);
- `stt`: the driver's 25 synthetic cases;
- `lb`, `dd`: the labels file is D538's (by sha256, the same string as agreement.py's D538_RUN) with its recorded
  counts, and every one of its 605 keys replays from a spine folder the probe will find, with the listing the labels
  were judged on;
- `pl`: the twelve players resolve at the hashes their Elo nights recorded (J198, J199, J202, J204, J209, J210 and
  D537's registration; compared as strings), the five rule seats at D538_RUN's;
- `cd`: git answered, and the lane's files are in the pin (`cd.files` lists every file changed under the probe's
  paths since d1d6b20f, read in the summary, not checked: the lane's first build may move code between files);
- `sm`: on the pilot spine the probe wrote every row, none an error, mismatch or unsupported; agreement.py's own
  audit() under seed 538 finds no row one run of the probe would not write (so the night's rows will pass the
  rule's refusal on seeds, repeats, options and hashes); forge-default handed back option 0 at every row and never
  went off the atlas (VOID's condition); forge-default and policy-outlet never searched (stop 2's); both search
  players searched, search-v1-anytime under its 1.5 s budget on average;
- `ag`: agreement.py's plain read parses the smoke (four players, 515 labels, two pairs, the six labelled decisions
  answered); the rule's word is not read on a smoke: under --rule d538 it is NOT READ (the run not whole) by design;
- `pj`: the projection was made and the five rule seats alone fit in 4 h (the rest of the 8 h is point 8's).

Read, not checked: each smoke player's replayMs and ms a search (`sm.*.replayMsMean`, `searchMsMax`), the
projection's hours and the players it dropped (`pj.predropped`), `pl.seats`, `cd.files`.

## Commands
cores: 7
```bash
# J213 1/12 (a rule seat, D538 points 6 and 7): forge-default, Forge's own answer handed back -- 605 decisions x 1
test -f var/j213-tools/night.py
python3 -I var/j213-tools/night.py play forge-default {workers}
```
cores: 7
```bash
# J213 2/12 (a rule seat): search-v1-anytime, search-v2, the live seat -- 605 x 3, --seed 538
test -f var/j213-tools/night.py
python3 -I var/j213-tools/night.py play search-v1-anytime {workers}
```
cores: 7
```bash
# J213 3/12 (a rule seat): search-v2-rrandom (P2) -- 605 x 3
test -f var/j213-tools/night.py
python3 -I var/j213-tools/night.py play search-v2-rrandom {workers}
```
cores: 7
```bash
# J213 4/12 (a rule seat): search-v2-rrandom4 (P3) -- 605 x 3
test -f var/j213-tools/night.py
python3 -I var/j213-tools/night.py play search-v2-rrandom4 {workers}
```
cores: 7
```bash
# J213 5/12 (a rule seat: point 6's whole run and stop 2 need it): policy-outlet -- 605 x 1
test -f var/j213-tools/night.py
python3 -I var/j213-tools/night.py play policy-outlet {workers}
```
cores: 7
```bash
# J213 6/12 (point 8, dropped from the end by the 8 h guard): search-v2-rrandom4-m40 -- 605 x 3
test -f var/j213-tools/night.py
python3 -I var/j213-tools/night.py play search-v2-rrandom4-m40 {workers}
```
cores: 7
```bash
# J213 7/12 (point 8): search-v2-rmix4them-m40 -- 605 x 3
test -f var/j213-tools/night.py
python3 -I var/j213-tools/night.py play search-v2-rmix4them-m40 {workers}
```
cores: 7
```bash
# J213 8/12 (point 8): search-v2-ms750-r6, 750 ms a search -- 605 x 3
test -f var/j213-tools/night.py
python3 -I var/j213-tools/night.py play search-v2-ms750-r6 {workers}
```
cores: 7
```bash
# J213 9/12 (point 8): search-v2-no-b (J211's arm) -- 605 x 3
test -f var/j213-tools/night.py
python3 -I var/j213-tools/night.py play search-v2-no-b {workers}
```
cores: 7
```bash
# J213 10/12 (point 8): search-v2-t1 (D537) -- 605 x 3
test -f var/j213-tools/night.py
python3 -I var/j213-tools/night.py play search-v2-t1 {workers}
```
cores: 7
```bash
# J213 11/12 (point 8): search-v2-a1 (D537) -- 605 x 3
test -f var/j213-tools/night.py
python3 -I var/j213-tools/night.py play search-v2-a1 {workers}
```
cores: 7
```bash
# J213 12/12 (point 8): search-v2-t1-x3 (D537), 4.5 s a search -- 605 x 3
test -f var/j213-tools/night.py
python3 -I var/j213-tools/night.py play search-v2-t1-x3 {workers}
```
cores: 1
```bash
# the rows, a player at a time; then D538 point 7's one read over the five rule seats' night files, exactly as D538
# writes it -- its rule.word is the verdict, copied to v.json; an exit other than 0 is NOT READ (refused), no word,
# its stderr kept in read.err and in this step's log; then point 8's reads beside it (deciding nothing) and the report
test -f var/j213-tools/night.py
python3 -I var/j213-tools/night.py rowcheck
rm -f var/j213/read.json
rc=0
python3 -I tools/atlas/agreement.py --labels fixtures/atlas/judged/labels-judged-v1.jsonl --boot 4000 --seed 538 --pairs search-v1-anytime:forge-default,search-v1-anytime:search-v2-rrandom,search-v1-anytime:search-v2-rrandom4 --split source=round2 --rule d538 --json var/j213/read.json var/j213/rows-forge-default.jsonl var/j213/rows-search-v1-anytime.jsonl var/j213/rows-search-v2-rrandom.jsonl var/j213/rows-search-v2-rrandom4.jsonl var/j213/rows-policy-outlet.jsonl > var/j213/read.txt 2> var/j213/read.err || rc=$?
echo "$rc" > var/j213/read-rc.txt
cat var/j213/read.txt
cat var/j213/read.err >&2
echo "J213: the rule read exited $rc"
python3 -I var/j213-tools/night.py verdict
python3 -I var/j213-tools/night.py side
python3 -I var/j213-tools/night.py report
```
check: v.written == 1
check: v.readRc == 0
check: v.refused == 0
check: v.known == 1
check: v.words == 1
check: v.void + v.notRead == 0
check: v.stops == 0
check: v.tracks + v.doesNotTrack + v.inconclusive == 1
check: v.auditBad == 0
check: v.seedChecked == 1
check: v.auditKeys == 605
check: v.cells.fd == 605
check: v.cells.po == 605
check: v.cells.v1 == 1815
check: v.cells.rr == 1815
check: v.cells.rr4 == 1815
check: v.labelled == 515
check: v.shaOk == 1
check: v.look == 1
check: rc.written == 1
check: rc.ruleFull == 5
check: rc.droppedRule == 0
check: rc.fdRows == 605
check: rc.poRows == 605
check: rc.v1Rows == 1815
check: rc.rrRows == 1815
check: rc.rr4Rows == 1815
check: rc.secondaryFull == 1
check: rc.played + rc.dropped == 12
check: rc.errShareMax <= 0.02
check: rc.wrongHash == 0
check: rc.extra == 0
check: rc.seatsMax == 1
check: rc.unsupported == 0
check: sr.written == 1

The first eight checks say the rule read ran on the night's rows and gave one of point 7's three words: it exited 0
(an exit 2 is the tool refusing the rows, D538 point 4: NOT READ (refused), no verdict), its JSON has a rule with a
word the rule knows, exactly one, and it is neither VOID nor NOT READ with no stop printed. A VOID or a NOT READ
fails the job on purpose: the night is then not a measurement (point 6), the word is still in `v.json` and
`report.md`, and what follows is the cause in writing and a replay under a new job id, not a reading. The next
eleven repeat, from the read's own JSON, what the rule needs and the job promised: no audit count (every row is one
run of the probe under seed 538, its seeds checked), the 605 decisions and every cell of the five seats (605 x 1 for
forge-default and policy-outlet, 605 x 3 for the three search seats), the labels file by count and sha256, and the
first look. The rest are the night's rows by the driver's own count: all five rule seats whole and never dropped,
every point-8 player that was not dropped whole, all twelve accounted for, at most 2% of any player's (decision,
repeat)s ending in an error after the probe's second try (D538 gives no bound; 2% is this job's: at that share the
95% stops still pass with room), every row under its player's registered hash and one seat config, none outside the
plan, none unsupported; and the side reads ran (their exit codes are in `side-rc.json`, read, not checked: they
decide nothing). No check recomputes the word: every number is agreement.py's.

## Abort if
abort: rw.err >= 100 and rw.err > rw.lines / 10
abort: rw.mis >= 60 and rw.mis > rw.lines / 10

Engine and mapping trouble only: once 100 rows have ended in an error the job stops if errors are more than one row
in ten, and once 60 rows are a mismatch (the replay is not the baseline's position) it stops if mismatches are more
than one in ten: 60 mismatched decisions of forge-default's 605 would leave about 51 of the 515 labels unanswered,
under point 6's 95%, so the night could not be read. Both count every row of the twelve files, retries included.
Nothing stops on a pick.

## Report
collect: var/j213/v.json
collect: var/j213/read.json
collect: var/j213/read.txt
collect: var/j213/read.err
collect: var/j213/report.md
collect: var/j213/rowcheck.json
collect: var/j213/side.json
collect: var/j213/side-drop.json
collect: var/j213/dropped.json
collect: var/j213-tools/projection.json
collect: var/j213-tools/smoke.json

`report.md` is the job's own numbers. The PC session writes `summary.md` from it:
- **the answer first:** the word, `rule.word` of the read, in one sentence a person can act on, with P1, P1 on the
  409 unselected labels, P2 and P3 (each delta with its interval and n) and what point 9 does on it (`rule.wave2`):
  TRACKS buys wave 2 and makes agreement a screen read beside a new arm's Elo, never a reason to adopt or drop one;
  DOES NOT TRACK buys nothing more; INCONCLUSIVE buys wave 2 once only on the rule's own `wave2`, for a second and
  final look. Say plainly that this job changed no seat and bought nothing. A VOID, a NOT READ or a refusal: say
  which stop (`rule.stops`, `read.err`), that it is no finding, and what must be written before a replay;
- **beside it, deciding nothing** (D538 point 8): P1 by kind against J210's split of the search's Elo (two thirds
  priority, a quarter attacks, none shown in blocks); the option-0 share at label=forge against label!=forge; P1 on
  round 2's labels; each search player's departure precision; the two random seats against forge-default as
  context; the agreement and Elo table over every player played (with no rank correlation: none is computed, and
  any the session adds is its own and decides nothing); how often three repeats agree; off-atlas dropped;
- **the run:** each player's rows and statuses, attempts and workers, the hours against the ~5.5 h estimate and the
  projection, which point-8 players were dropped and why, the pressure events in STATUS, that it ran alone (D521).

Never write "no difference" for an interval that holds 0, and never read a word from the text or a recomputation:
the word is the JSON's.
