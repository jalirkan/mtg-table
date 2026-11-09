id: J203
title: Judge the judge, unselected -- does J200's KNOWLEDGE SHOWN hold on decisions nobody chose? 160 move-atlas decisions drawn at random (seed 203, stratified by kind, no filter on confidence, disagreement or either map), each read blind by two judges for a first choice, a second choice and a confidence; set i (both judges on one option that is not Forge's) branched on D451's Forge map for Forge's option and theirs, exactly as J200; set ii (both judges on Forge's option) branched for Forge's option and their second choice, as a control; set iii (the judges split) recorded, not branched; two pre-registered readings: J200's rule on set i (KNOWLEDGE SHOWN, NOT SHOWN or INCONCLUSIVE) and the control on set ii (CONTROL HOLDS, FAILS or INCONCLUSIVE)
public_title: Judge the judge, unselected: language model picks on decisions nobody chose
public_est: ~3 h (range 2-6 h)
public_decides: Whether language model picks beat Forge AI choices on unselected decisions
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2.7
repos: mtg-table@1ac01c0baf9e47b04e7da1e894f71384e7a9ed23 (main after D527's merge, 1ac01c0baf9e47b04e7da1e894f71384e7a9ed23 on 2026-11-09; the merger replaces 1ac01c0baf9e47b04e7da1e894f71384e7a9ed23 with main's full sha at posting and confirms it is on origin/main. Since J193's pin 1d0d18f3 the atlas seat's code is J193's: `git diff --numstat 1d0d18f3 1ac01c0b -- bridge/src tools/cubelab/CubeLab.java` is the same eight files as J200's, measured 2026-11-09: `Config.java` 8/1 (D516), `DecisionSelfTest.java` 515/0 (self-tests), and the search seat's six files (`ExploreMath` 68/0, `Explorer` 208/2, `RolloutController` 109/0, `RolloutGuards` 731/0, `SearchConfig` 72/5, `SearchPolicy` 79/3: D523, D525 and D527, reached only through a `rollout` key no atlas job line passes; D526 is the runner's). The `--only` lane (D524) is J200's, unchanged since 2ffb65fe (`tools/cubelab` has no diff 2ffb65fe..1ac01c0b). The pilot checks the numstat and the seat identity)
decides: whether J200's reading survives an unselected sample, and so what the outside-knowledge design (J200's `decides:`) may assume. KNOWLEDGE SHOWN on set i AND CONTROL HOLDS on set ii: the judges are a signal on decisions nobody chose -- where two agree against Forge their option is better under Forge continuation, and where they agree with Forge their own ranking still puts Forge's option above their second choice; the outside-knowledge design (a language model as candidate ranker or rollout policy, its own lane and decision, never this job's) goes ahead as a ranker, with set i's gain and the whole-sample gain as its expected size; nothing in the seat or the atlas changes here. KNOWLEDGE SHOWN without CONTROL HOLDS: the gain where two judges agree against Forge stands on an unselected sample, but the judges' ranking is not shown to separate options where they agree with Forge; the design goes ahead only as a disagreement filter (act where two judges agree against Forge, defer to Forge elsewhere), not as a general ranker. NOT SHOWN on set i: J200's 82 do not generalize; J200's reading is attributed to its selection (the confident filter) and the outside-knowledge direction closes for this population of decisions (the owner may decide otherwise at the read). INCONCLUSIVE: no design on this evidence; J200 stands as a selected-sample result and the question stays open only for a new, larger judged sample, never by re-reading these 160. INCOMPLETE (set i under 30 decisions planned, or fewer than 90% of them valid): no verdict. The control's reading alone decides nothing when set i is not SHOWN
hypothesis: information only, never read by a check. **What J200 showed.** On 82 selected decisions (the atlas's confident rows, both judges confidently against Forge) the judges' option beat Forge's under Forge continuation: share 0.642 [0.515, 0.767], gain +0.050 [+0.018, +0.082]; the random map read 0.963 on the same rows, its Spearman correlation with the Forge map per decision 0.088, so the selection toward the random map said little about the Forge map. **What changes here.** Nothing filters this sample: 29 of the 160 are confident rows, 31 partial (the futility rule stopped them with option 0 leading or tied), 38 screened (cut after 25 branches) and 62 complete; many decisions have options worth about the same (a land's ability, a pass against a castable spell that makes no difference), so set i's true gain is expected below J200's and ties above J200's 15 of 82. Judge A sided with Forge on 84 of 160 (52.5%), confidence 1/2/3 on 36/93/31. **What set i can see.** With about 60 decisions (A's 76 non-Forge picks times J200's two-judge agreement) the gain interval is about +-0.037 (J200's +-0.032 at 82, times sqrt(82/60)) and the share's about +-0.15: KNOWLEDGE SHOWN needs a true gain of about +0.04 or more; J200's +0.050 would read SHOWN a little more often than not. **The control.** Where both judges side with Forge, Forge's option against their second choice: if their ranking is signal, Forge's option should win there by about as much as the judges' option wins on set i; a control near zero says the judges' preferences among the options they did not pick are noise around 50%
rule: written 2026-11-09 before any J203 branch game was played, word for word: "PRIMARY (set i, J200's rule): on the valid set-i decisions, the SHARE is the decisions where the judges' option's Forge-map mean beats Forge's option 0's over decisions where they differ (ties excluded and counted), and the GAIN is the mean over all valid set-i decisions of (judges' option's Forge-map mean - option 0's), each mean over the branch indices where both options have a score. Both carry a 95% interval from a two-level cluster bootstrap, 10,000 draws, seed 203: spines resampled with replacement, then each drawn decision's paired branch indices resampled with replacement. KNOWLEDGE SHOWN if shareLo > 0.5 and gainLo > 0. NOT SHOWN if shareHi < 0.5 or gainHi < 0. Otherwise INCONCLUSIVE. Read only when set i has at least 30 valid decisions and at least 90% of its planned decisions (rounded up) are valid; else INCOMPLETE, no verdict. CONTROL (set ii): the same SHARE and GAIN with each decision's paired difference taken as option 0's Forge-map score minus the mean of the judges' distinct second choices' scores at that branch index (one second when both judges named the same, two when they differ), over the branch indices where all compared options have a score, the same bootstrap and seed. CONTROL HOLDS if shareLo > 0.5 and gainLo > 0. CONTROL FAILS if shareHi < 0.5 or gainHi < 0. Otherwise CONTROL INCONCLUSIVE; read under the same completeness condition on set ii, else INCOMPLETE. WHOLE SAMPLE, reported with the readings: each judge's agreement with Forge's option and with each other over all 160; the WHOLE GAIN, the mean over the valid decisions of sets i and ii of (the judges' first choice's Forge-map mean - option 0's), which is set i's paired differences and 0 on set ii, with the same bootstrap; and set i's gain minus set ii's control gain with a joint bootstrap (spines resampled once a draw for both sets), deciding nothing." A decision is VALID when J203's baseline game lists, decision for decision, what the night's listed (tokens, kind and turn: the same game, D511), its listing at d is the plan's tokens, every Forge unit of the decision finished with no replay divergence, and it has at least 30 paired Forge branches. A branch scores as the atlas scores it (win 1, draw or the turn cap or a timeout between steps 0.5, loss 0; D478); a row with an error or an unavailable option is no score (D470). Set iii (the judges split) is never branched and never read. The atlas's own checks (problems, frame logs, leak checks) are information beside the readings: the validity conditions above decide which decisions count, and the job's checks hold only the verdict file to the rule and the leak count to zero (J200's `problems == 0` gate, which failed J200 on one BranchTimeout inside one engine step of a valid decision, is not carried over). Beside the readings, deciding nothing (2,000 draws): the random map (the night's rows of the same decisions and options), by kind, by the label's status (confident rows, J200's population, against the rest), live decisions (any compared option's Forge mean strictly between 0.05 and 0.95), both judges at confidence 3, the Spearman correlation of the random-map difference with the Forge-map difference, and the reproduction of the night's Forge rows. All of it is computed by var/j203-tools/read.py exactly as written in the pilot
followup: morning-read
est: ~3.3 h at 7 workers (an estimate; range 2-6 h). 10720 branch games (128 entries: set i 58 x 2 options x 40, set ii 70 with 12 of them on three options), ~12.4 worker-hours scaled from J200 (10.3 worker-hours for 106 entries; 9.5 from the nights' own rows, J200's way: Forge rows where the night had them, else 1.3x the random rows); wall scaled from J200's 2.69 h for 8,840 games. Pilot ~15 min. Disk ~4 GB on /home/justin-a/code/lab/data
resumable: yes
timeout: 9h
progress: lines /home/justin-a/code/lab/data/lab-j203/J1*-b-s*/phaseB/branches.jsonl of 10720
metrics: branches = lines /home/justin-a/code/lab/data/lab-j203/J1*-b-s*/phaseB/branches.jsonl
metrics: branch_errors = count /home/justin-a/code/lab/data/lab-j203/J1*-b-s*/phaseB/branches.jsonl "\"error\":\""
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j203/J1*-b-s*/phaseB/branches.jsonl "\"engineError\":true"
metrics: branch_timeouts = count /home/justin-a/code/lab/data/lab-j203/J1*-b-s*/phaseB/branches.jsonl "\"timedOut\":true"
metrics: unit_errors = count /home/justin-a/code/lab/data/lab-j203/J1*-b-s*/phaseB/units.jsonl "\"ok\":false"
metrics: replay_diverged = count /home/justin-a/code/lab/data/lab-j203/J1*-b-s*/phaseB/units.jsonl "replay diverged"
metrics: spines_done = sh: ls -d /home/justin-a/code/lab/data/lab-j203/J1*-b-s*/atlas.json 2>/dev/null | wc -l
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: v = sh: cat var/j203/verdict.json 2>/dev/null || echo '{"written":0,"valid":0,"validControl":0,"complete":0,"shown":0,"notShown":0,"inconclusive":0,"controlComplete":0,"controlHolds":0,"controlFails":0,"controlInconclusive":0,"forge":{},"control":{},"whole":{},"random":{},"checks":{"problems":-1,"leaks":-1}}'
headline: branches, spines_done, branch_errors, branch_timeouts, replay_diverged, v.valid, v.validControl, v.forge.wins, v.forge.losses, v.forge.ties, v.forge.share, v.forge.shareLo, v.forge.shareHi, v.forge.gain, v.forge.gainLo, v.forge.gainHi, v.control.share, v.control.shareLo, v.control.gain, v.control.gainLo, v.control.gainHi, v.whole.gain, v.shown, v.notShown, v.inconclusive, v.controlHolds, v.controlFails, v.checks.problems

**Why this job.** J200 read KNOWLEDGE SHOWN: on 82 decisions where two blind language-model judges confidently agreed
against Forge, their option beat Forge's under Forge continuation (share 0.642 [0.515, 0.767], gain +0.050 [+0.018,
+0.082]). Those 82 were selected twice: by the atlas's confident filter (some option beat Forge's on the random map) and
by the judges' own confidence and agreement. The selection made the random map read 96% for the judges while the Forge
map read 64%, and it leaves open whether the judges add anything on the decisions a policy actually meets. This job asks
the same question on an unselected sample: 160 decisions drawn at random from the atlas's provenance-checked rows, read
by two judges with the same renderer and protocol as J200's round 2, branched on the Forge map wherever the two judges
agree. Where they agree with Forge it adds a control J200 could not have: Forge's option against the judges' own second
choice, which says whether their ranking is a signal or noise around 50%.

**What it does not say.** Its scope is the atlas v1 population (77 games between random 40-card decks of four pool
bands, seat A's decisions at the atlas's spread), the decisions on which two judges agree, and Forge's AI as the
continuation for both seats, a stronger stand-in for good play than the random map but not a perfect one. The judges saw
what J200's round 2 showed (the board as seat A saw it, both decklists, the sampled history), never an option's value
or which option was Forge's; the history line of a later decision of the same game names Forge's earlier choices, as in
J200, and the judges decide in order without revising. Judge A was the PC session's own model reading the 160 positions
in the session that drew them, after it had read J200's job, result and round 2's report; judge B is a fresh agent with
only the batch files: their agreement on set i is the filter, and neither judge saw a value. A KNOWLEDGE SHOWN ranks no
options anywhere and changes nothing.

## The sample (llm-judge3, 2026-11-09; read only)

- **Population:** every row of the move atlas v1 release's `labels.jsonl` (1,003 rows; the release already leaves out
  D509's 8 excluded units) whose night spine folder is on disk under `/home/justin-a/code/lab/data/lab-j18{6,7,8}` and
  `lab-j19{0,1,3}`, whose `plan.json` seed is the row's `spineSeed`, whose two deck files hash to the `deckSha256` its
  `phaseB/schedule.jsonl` header recorded, whose `phaseB/baseline.json` lists at d exactly the row's option tokens, kind
  and turn (J200's provenance rules), with at least 2 options, and whose baseline frame log aligns (llm-judge2's align:
  one seat-0 decision frame of that turn and kind with Forge's chosen token, its state frame matching the seat row's state
  vector on every field): **997 decisions** (6 fail the alignment: J188/s02/d6, J188/s07/d16, J190/s06/d38, d40, d42,
  J193/s04/d19), 643 priority, 286 attack, 68 block. Nothing else filters it: 154 confident, 350 complete, 222 partial,
  271 screened.
- **Draw:** stratified by kind in the population's proportion, largest remainder to 160: **103 priority, 46 attack, 11
  block**; `random.Random(203)`, then for p, a, b in that order `rng.sample(sorted keys of the kind, n)`. The sample: 29
  confident, 62 complete, 31 partial, 38 screened; nights J186 28, J187 31, J188 29, J190 18, J191 26, J193 28; 66
  spines. `draw.json` records the seed, the source's sha256 (`a246d32a...`), the population's 997 keys and the draw
  order; `sample.jsonl` the 160 with their tokens.
- **Judging:** the positions rendered by llm-judge2's renderer unchanged (the board as seat A saw it, verified against
  the seat row; both decklists; the sampled history; the options in a random order, one letter map for both judges,
  seed 203), 11 batch files grouped by spine. Each judge gave every decision a first choice, a second choice, a
  confidence 1-3 and one line of reasoning. ingest.py mapped the letters to options and wrote the sets and the plan.

## The three sets

Written by llm-judge3's ingest.py from the two judges' picks (`ingest.json`); the plan below is these sets, line for line.

| set | decisions | kinds (p / a / b) | branched | options a decision | branch games |
|---|---|---|---|---|---|
| **i, disagree**: A and B on the same option, not Forge's | 58 | 49 / 6 / 3 | yes | 0 and the judges' | 4,640 |
| **ii, control**: A and B both on Forge's option | 70 | 35 / 27 / 8 | yes | 0 and their second choice(s) | 6,080 |
| iii, split: A and B differ | 32 | 19 / 13 / 0 | no | none (recorded) | 0 |

Judge A on Forge's option 84 of 160, judge B 78; A = B on 128 (80%). Set ii's two seconds agree on 58 of 70 (the other 12 branch three options). Of set iii, 22 have one judge on Forge's option. Set i holds 17 of the atlas's confident rows (J200's population); 61 spines in all, 41 with a set-i decision.

## How a decision is played: one atlas spine, given decisions, given options

Exactly J200's way. Per spine folder, one `tools/cubelab.sh atlas` on the night's own deck files and seed, with J177's
unit settings and the Forge map only:

    --phase b --turn-cap 40 --options 8 --branch-random 0 --branch-forge 40 --chunk 5 --branch-timeout 120
    --unit-timeout 30 --leak-checks 1 --checks-parallel {workers} --jobs {workers} --only <file> --out var/lab-j203/<night>-<folder>

- **The baseline is played again** and the reader requires its listing to be the night's, decision for decision: the
  same game, so `d` is the same position (D511; J200 replayed all 53 of its spines' baselines as the nights' games).
- **Each unit replays to d** through D511's sink and checks the listing at d; a divergence fails the unit and the reader
  excludes the decision.
- **Each branch** forces its option on a fork, redeals what seat A cannot see (D498), reseeds with branch i's seed (the
  same for every option: the options are paired by branch index) and plays to the end with Forge's AI on both seats.
- **The `--only` file** (D524): `[{d, options, tokens}]`, set i's `[0, j]` and set ii's `[0, s]` or `[0, s1, s2]`; the atlas
  exits 4 before any unit if the baseline lists other tokens at d.

## Where it writes

Every atlas command runs under `LAB_DATA_DIR=/home/justin-a/code/lab/data` with `--out var/lab-j203/<night>-<folder>`, so
J203's spines land in a new data folder, `/home/justin-a/code/lab/data/lab-j203/` (`J1*-b-s*` folders, the pilot's
`pilot-J193-b-s01-pauper-3785`, `exits.txt`, `spine-times.txt`). The nights' folders are read only. The Forge homes
(`CUBELAB_HOME_ROOT=var/cubelab/homes-J203`), the job's scripts and plan (`var/j203-tools/`) and its outputs
(`var/j203/`) stay in the clone. No `clean:` on the data folder; nothing is deleted. A retry resumes (the driver skips a
spine whose atlas.json exists with exit 0; the atlas resumes a spine from its own `branches.jsonl`); nothing of J203's may
be resumed on another commit.

## Before posting -- the coordinator, by hand (nothing in this file does them)
1. **Judge B is in and ingest has run**: llm-judge3's `picks-B.jsonl` holds 160 lines from a fresh agent given only the
   batch files and `scripts/judge-prompt.txt`; then `python3 -I scripts/ingest.py <llm-judge3> <picks-B.jsonl> --draft
   <this draft> --job-out <the job>` writes the plan below, drive.py's `EXPECT`, the `est:`, `public_est:`, `progress:` and
   `timeout:` lines and "The three sets". Set i must hold at least 30 decisions (ingest warns): under 30 the rule reads
   INCOMPLETE and the job is not worth posting. Lint the written job.
2. **The pin is written**: 1ac01c0baf9e47b04e7da1e894f71384e7a9ed23 in `repos:` replaced with main's full sha (1ac01c0baf9e47b04e7da1e894f71384e7a9ed23
   when this was drafted), on origin/main.
3. **The seat is J193's**: `git diff --numstat 1d0d18f3 <pin> -- bridge/src tools/cubelab/CubeLab.java` prints exactly the
   eight lines the pilot's `want` list names (measured at 1ac01c0b). A pin past 1ac01c0b re-measures: a changed count in
   the search seat's files needs D509's argument (reached only through a `rollout` key) and an updated `want`; anything
   else under `bridge/src` is a seat change and needs its own argument first.
4. **The data folder**: `/home/justin-a/code/lab/data/lab-j203` absent or empty.
5. No `alone:`, no `after:`; it queues behind J202 like any heavy job.

## Pilot
About 15 minutes: the pin is merged; the build; the lane (its usage line and atlas-selftest); the atlas's node tests;
seat-identity; the seat's code since J193's pin; the data folder; the plan written and checked against the nights and
against ingest's counts and sha256; the reader's self-test (fourteen synthetic cases with known readings); then J200's
pilot decision, J193's s01 d12 (pauper, options 0 and 3, the night's Forge map ~1.2 s a branch), at 5 branches an option.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j203-merged.txt || echo 0 > var/j203-merged.txt
cat var/j203-merged.txt
./bridge/build.sh
mkdir -p var/j203-tools var/j203
grep -c -- '--only <file>' tools/cubelab/cli.ts > var/j203-tools/lane.txt || echo 0 > var/j203-tools/lane.txt
env -u LAB_DATA_DIR tools/cubelab.sh atlas-selftest --jobs 3 && echo 1 > var/j203-tools/selftest.txt || echo 0 > var/j203-tools/selftest.txt
env -u LAB_DATA_DIR node --test web/test/cubelab-atlas.test.ts web/test/cubelab-atlas-cuts.test.ts web/test/cubelab-atlas-resume.test.ts web/test/cubelab-atlas-only.test.ts && echo 1 > var/j203-tools/nodetests.txt || echo 0 > var/j203-tools/nodetests.txt
env -u LAB_DATA_DIR tools/cubelab.sh seat-identity --jobs 3 && echo 1 > var/j203-tools/identity.txt || echo 0 > var/j203-tools/identity.txt
# the seat since J193's pin: D516's Config.java, the search seat's six files (D523, D525, D527: rollout=random*, reached only through a `rollout` key the atlas never passes) and the self-test
git diff --numstat 1d0d18f364005651db78ca31c07393f14265daf7 HEAD -- bridge/src tools/cubelab/CubeLab.java > var/j203-tools/seat-diff.txt || true
python3 -I -c 'import json; L=[l.split() for l in open("var/j203-tools/seat-diff.txt") if l.strip()]; want=[["8","1","bridge/src/mtgtable/Config.java"],["515","0","bridge/src/mtgtable/ai/DecisionSelfTest.java"],["68","0","bridge/src/mtgtable/ai/ExploreMath.java"],["208","2","bridge/src/mtgtable/ai/Explorer.java"],["109","0","bridge/src/mtgtable/ai/RolloutController.java"],["731","0","bridge/src/mtgtable/ai/RolloutGuards.java"],["72","5","bridge/src/mtgtable/ai/SearchConfig.java"],["79","3","bridge/src/mtgtable/ai/SearchPolicy.java"]]; r={"lines":L,"ok":1 if L==want else 0}; json.dump(r,open("var/j203-tools/seat-diff.json","w")); print(json.dumps(r))'
python3 -I -c 'import os, re, json; d="/home/justin-a/code/lab/data/lab-j203"; xs=os.listdir(d) if os.path.isdir(d) else []; bad=[x for x in xs if not re.match(r"^(J1\d\d-b-s\d\d-[a-z]+-\d+|pilot-J193-b-s01-pauper-3785|exits\.txt|spine-times\.txt)$", x)]; os.makedirs(d, exist_ok=True); r={"ok":0 if bad else 1,"entries":len(xs),"bad":bad[:10]}; json.dump(r,open("var/j203-tools/datadir.json","w")); print(json.dumps(r))'
```
```bash
# the plan: the 160 sampled decisions and their sets, written by llm-judge3's ingest.py from the two judges' picks
cat > var/j203-tools/plan.jsonl <<'J203EOF'
{"key": "J186/s01/d12", "set": "disagree", "night": "J186", "folder": "b-s01-pauper-2540", "d": 12, "kind": "a", "turn": 15, "k": 6, "options": [0, 3], "j1": 3, "j2": 3, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 2540, "tokens": ["attack:none", "attack:10,19,293,294", "attack:10", "attack:19", "attack:293", "attack:294"], "estSec": 59, "status": "complete"}
{"key": "J186/s01/d15", "set": "control", "night": "J186", "folder": "b-s01-pauper-2540", "d": 15, "kind": "p", "turn": 15, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 3, "c2": 3, "seed": 2540, "tokens": ["cast:9", "pass"], "estSec": 111, "status": "screened"}
{"key": "J186/s02/d16", "set": "disagree", "night": "J186", "folder": "b-s02-peasant-2541", "d": 16, "kind": "b", "turn": 13, "k": 3, "options": [0, 2], "j1": 2, "j2": 2, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 2541, "tokens": ["block:none", "block:27>96", "block:27>46"], "estSec": 500, "status": "confident"}
{"key": "J186/s03/d6", "set": "disagree", "night": "J186", "folder": "b-s03-legacy-2542", "d": 6, "kind": "p", "turn": 7, "k": 3, "options": [0, 2], "j1": 2, "j2": 2, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 2542, "tokens": ["activate:10", "pass", "cast:37"], "estSec": 344, "status": "partial"}
{"key": "J186/s03/d10", "set": "disagree", "night": "J186", "folder": "b-s03-legacy-2542", "d": 10, "kind": "p", "turn": 9, "k": 3, "options": [0, 2], "j1": 2, "j2": 2, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 2542, "tokens": ["activate:6", "pass", "cast:38"], "estSec": 271, "status": "partial"}
{"key": "J186/s04/d34", "set": "control", "night": "J186", "folder": "b-s04-powered-2543", "d": 34, "kind": "a", "turn": 26, "k": 6, "options": [0, 5], "j1": 0, "j2": 0, "s1": 5, "s2": 5, "c1": 2, "c2": 2, "seed": 2543, "tokens": ["attack:none", "attack:8,27,31,37", "attack:8", "attack:31", "attack:37", "attack:27"], "estSec": 927, "status": "partial"}
{"key": "J186/s05/d1", "set": "disagree", "night": "J186", "folder": "b-s05-pauper-2544", "d": 1, "kind": "p", "turn": 9, "k": 4, "options": [0, 2], "j1": 2, "j2": 2, "s1": 0, "s2": 3, "c1": 2, "c2": 2, "seed": 2544, "tokens": ["cast:35", "pass", "cast:3", "cast:16"], "estSec": 570, "status": "partial"}
{"key": "J186/s05/d2", "set": "disagree", "night": "J186", "folder": "b-s05-pauper-2544", "d": 2, "kind": "p", "turn": 11, "k": 3, "options": [0, 1], "j1": 1, "j2": 1, "s1": 2, "s2": 2, "c1": 2, "c2": 2, "seed": 2544, "tokens": ["pass", "cast:3", "cast:16"], "estSec": 551, "status": "complete"}
{"key": "J186/s05/d3", "set": "control", "night": "J186", "folder": "b-s05-pauper-2544", "d": 3, "kind": "p", "turn": 11, "k": 3, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 2, "c2": 2, "seed": 2544, "tokens": ["cast:3", "pass", "cast:16"], "estSec": 488, "status": "complete"}
{"key": "J186/s05/d11", "set": "split", "night": "J186", "folder": "b-s05-pauper-2544", "d": 11, "kind": "p", "turn": 21, "k": 2, "options": [0, 1], "j1": 0, "j2": 1, "s1": 1, "s2": 0, "c1": 1, "c2": 1, "seed": 2544, "tokens": ["cast:5", "pass"], "estSec": 0, "status": "screened"}
{"key": "J186/s06/d4", "set": "disagree", "night": "J186", "folder": "b-s06-peasant-2545", "d": 4, "kind": "p", "turn": 8, "k": 7, "options": [0, 2], "j1": 2, "j2": 2, "s1": 6, "s2": 6, "c1": 2, "c2": 2, "seed": 2545, "tokens": ["cast:16", "pass", "cast:3", "cast:22", "cast:10", "cast:4", "cast:25"], "estSec": 229, "status": "confident"}
{"key": "J186/s06/d5", "set": "disagree", "night": "J186", "folder": "b-s06-peasant-2545", "d": 5, "kind": "p", "turn": 10, "k": 7, "options": [0, 2], "j1": 2, "j2": 2, "s1": 1, "s2": 1, "c1": 2, "c2": 2, "seed": 2545, "tokens": ["pass", "cast:1", "cast:3", "cast:22", "cast:10", "cast:4", "cast:25"], "estSec": 207, "status": "confident"}
{"key": "J186/s06/d12", "set": "disagree", "night": "J186", "folder": "b-s06-peasant-2545", "d": 12, "kind": "p", "turn": 14, "k": 6, "options": [0, 3], "j1": 3, "j2": 3, "s1": 4, "s2": 2, "c1": 1, "c2": 2, "seed": 2545, "tokens": ["pass", "cast:10", "cast:4", "cast:25", "cast:2", "cast:1"], "estSec": 123, "status": "complete"}
{"key": "J186/s06/d13", "set": "disagree", "night": "J186", "folder": "b-s06-peasant-2545", "d": 13, "kind": "p", "turn": 14, "k": 6, "options": [0, 4], "j1": 4, "j2": 4, "s1": 0, "s2": 3, "c1": 1, "c2": 2, "seed": 2545, "tokens": ["cast:2", "pass", "cast:10", "cast:4", "cast:25", "cast:1"], "estSec": 162, "status": "partial"}
{"key": "J186/s07/d15", "set": "disagree", "night": "J186", "folder": "b-s07-legacy-2546", "d": 15, "kind": "p", "turn": 13, "k": 3, "options": [0, 2], "j1": 2, "j2": 2, "s1": 1, "s2": 0, "c1": 2, "c2": 2, "seed": 2546, "tokens": ["activate:2#1", "pass", "cast:13"], "estSec": 419, "status": "partial"}
{"key": "J186/s07/d16", "set": "control", "night": "J186", "folder": "b-s07-legacy-2546", "d": 16, "kind": "a", "turn": 13, "k": 8, "options": [0, 7], "j1": 0, "j2": 0, "s1": 7, "s2": 7, "c1": 2, "c2": 2, "seed": 2546, "tokens": ["attack:6,179,180", "attack:none", "attack:6,37,144,179,180,184", "attack:6,180", "attack:6,179", "attack:179,180", "attack:6,144,179,180", "attack:6,179,180,184"], "estSec": 216, "status": "screened"}
{"key": "J186/s07/d22", "set": "disagree", "night": "J186", "folder": "b-s07-legacy-2546", "d": 22, "kind": "p", "turn": 17, "k": 2, "options": [0, 1], "j1": 1, "j2": 1, "s1": 0, "s2": 0, "c1": 3, "c2": 3, "seed": 2546, "tokens": ["pass", "cast:9"], "estSec": 126, "status": "screened"}
{"key": "J186/s09/d5", "set": "control", "night": "J186", "folder": "b-s09-pauper-2548", "d": 5, "kind": "p", "turn": 5, "k": 4, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 1, "c2": 1, "seed": 2548, "tokens": ["cast:10", "pass", "cast:17", "cast:30"], "estSec": 414, "status": "complete"}
{"key": "J186/s09/d17", "set": "split", "night": "J186", "folder": "b-s09-pauper-2548", "d": 17, "kind": "a", "turn": 13, "k": 4, "options": [0, 1, 2], "j1": 1, "j2": 2, "s1": 3, "s2": 0, "c1": 1, "c2": 2, "seed": 2548, "tokens": ["attack:10,30", "attack:none", "attack:30", "attack:10"], "estSec": 0, "status": "complete"}
{"key": "J186/s09/d26", "set": "disagree", "night": "J186", "folder": "b-s09-pauper-2548", "d": 26, "kind": "p", "turn": 19, "k": 3, "options": [0, 2], "j1": 2, "j2": 2, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 2548, "tokens": ["activate:21", "pass", "cast:11"], "estSec": 87, "status": "complete"}
{"key": "J186/s10/d2", "set": "disagree", "night": "J186", "folder": "b-s10-peasant-2549", "d": 2, "kind": "p", "turn": 4, "k": 4, "options": [0, 3], "j1": 3, "j2": 3, "s1": 2, "s2": 2, "c1": 2, "c2": 3, "seed": 2549, "tokens": ["cast:32", "pass", "activate:84", "cast:1"], "estSec": 384, "status": "partial"}
{"key": "J186/s10/d17", "set": "control", "night": "J186", "folder": "b-s10-peasant-2549", "d": 17, "kind": "p", "turn": 14, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 2, "seed": 2549, "tokens": ["cast:3", "pass"], "estSec": 227, "status": "screened"}
{"key": "J186/s10/d22", "set": "control", "night": "J186", "folder": "b-s10-peasant-2549", "d": 22, "kind": "p", "turn": 16, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 2, "seed": 2549, "tokens": ["cast:35", "pass"], "estSec": 224, "status": "complete"}
{"key": "J186/s11/d11", "set": "control", "night": "J186", "folder": "b-s11-legacy-2550", "d": 11, "kind": "p", "turn": 9, "k": 3, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 3, "seed": 2550, "tokens": ["cast:6", "pass", "cast:1"], "estSec": 370, "status": "complete"}
{"key": "J186/s11/d24", "set": "disagree", "night": "J186", "folder": "b-s11-legacy-2550", "d": 24, "kind": "p", "turn": 13, "k": 5, "options": [0, 2], "j1": 2, "j2": 2, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 2550, "tokens": ["cast:38", "pass", "cast:10", "cast:16", "cast:1"], "estSec": 405, "status": "screened"}
{"key": "J186/s12/d8", "set": "disagree", "night": "J186", "folder": "b-s12-powered-2551", "d": 8, "kind": "p", "turn": 12, "k": 7, "options": [0, 5], "j1": 5, "j2": 5, "s1": 3, "s2": 2, "c1": 2, "c2": 2, "seed": 2551, "tokens": ["pass", "cast:13", "cast:21", "cast:10", "cast:23", "cast:15", "cast:37"], "estSec": 339, "status": "confident"}
{"key": "J186/s12/d9", "set": "disagree", "night": "J186", "folder": "b-s12-powered-2551", "d": 9, "kind": "a", "turn": 12, "k": 2, "options": [0, 1], "j1": 1, "j2": 1, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 2551, "tokens": ["attack:none", "attack:38"], "estSec": 333, "status": "screened"}
{"key": "J186/s12/d12", "set": "control", "night": "J186", "folder": "b-s12-powered-2551", "d": 12, "kind": "p", "turn": 14, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 1, "c2": 1, "seed": 2551, "tokens": ["cast:3", "pass"], "estSec": 284, "status": "complete"}
{"key": "J187/s01/d9", "set": "control", "night": "J187", "folder": "b-s01-pauper-2553", "d": 9, "kind": "a", "turn": 8, "k": 4, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 3, "c2": 3, "seed": 2553, "tokens": ["attack:8,28", "attack:none", "attack:28", "attack:8"], "estSec": 148, "status": "complete"}
{"key": "J187/s01/d12", "set": "control", "night": "J187", "folder": "b-s01-pauper-2553", "d": 12, "kind": "a", "turn": 10, "k": 4, "options": [0, 2, 3], "j1": 0, "j2": 0, "s1": 3, "s2": 2, "c1": 3, "c2": 3, "seed": 2553, "tokens": ["attack:8,28", "attack:none", "attack:28", "attack:8"], "estSec": 384, "status": "complete"}
{"key": "J187/s01/d15", "set": "disagree", "night": "J187", "folder": "b-s01-pauper-2553", "d": 15, "kind": "p", "turn": 14, "k": 4, "options": [0, 2], "j1": 2, "j2": 2, "s1": 3, "s2": 3, "c1": 2, "c2": 3, "seed": 2553, "tokens": ["pass", "cast:24", "cast:35", "cast:3"], "estSec": 120, "status": "complete"}
{"key": "J187/s02/d2", "set": "disagree", "night": "J187", "folder": "b-s02-peasant-2554", "d": 2, "kind": "p", "turn": 3, "k": 3, "options": [0, 2], "j1": 2, "j2": 2, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 2554, "tokens": ["activate:37#0", "pass", "cast:1"], "estSec": 299, "status": "complete"}
{"key": "J187/s02/d26", "set": "control", "night": "J187", "folder": "b-s02-peasant-2554", "d": 26, "kind": "a", "turn": 15, "k": 3, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 2, "seed": 2554, "tokens": ["attack:231", "attack:none", "attack:10,231"], "estSec": 369, "status": "complete"}
{"key": "J187/s02/d32", "set": "disagree", "night": "J187", "folder": "b-s02-peasant-2554", "d": 32, "kind": "a", "turn": 19, "k": 6, "options": [0, 1], "j1": 1, "j2": 1, "s1": 3, "s2": 5, "c1": 2, "c2": 3, "seed": 2554, "tokens": ["attack:none", "attack:5,8,10,14", "attack:10", "attack:5", "attack:14", "attack:8"], "estSec": 251, "status": "confident"}
{"key": "J187/s03/d8", "set": "control", "night": "J187", "folder": "b-s03-legacy-2555", "d": 8, "kind": "p", "turn": 10, "k": 3, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 2, "c2": 3, "seed": 2555, "tokens": ["cast:37", "pass", "cast:28"], "estSec": 502, "status": "partial"}
{"key": "J187/s03/d12", "set": "split", "night": "J187", "folder": "b-s03-legacy-2555", "d": 12, "kind": "p", "turn": 14, "k": 4, "options": [0, 3], "j1": 0, "j2": 3, "s1": 3, "s2": 2, "c1": 1, "c2": 2, "seed": 2555, "tokens": ["activate:10", "pass", "cast:35", "cast:28"], "estSec": 0, "status": "screened"}
{"key": "J187/s03/d13", "set": "split", "night": "J187", "folder": "b-s03-legacy-2555", "d": 13, "kind": "p", "turn": 14, "k": 4, "options": [0, 3], "j1": 0, "j2": 3, "s1": 3, "s2": 2, "c1": 2, "c2": 2, "seed": 2555, "tokens": ["cast:27", "pass", "cast:35", "cast:28"], "estSec": 0, "status": "complete"}
{"key": "J187/s04/d3", "set": "disagree", "night": "J187", "folder": "b-s04-powered-2556", "d": 3, "kind": "p", "turn": 5, "k": 3, "options": [0, 2], "j1": 2, "j2": 2, "s1": 1, "s2": 1, "c1": 3, "c2": 3, "seed": 2556, "tokens": ["cast:12", "pass", "cast:38"], "estSec": 288, "status": "complete"}
{"key": "J187/s04/d8", "set": "disagree", "night": "J187", "folder": "b-s04-powered-2556", "d": 8, "kind": "p", "turn": 11, "k": 5, "options": [0, 3], "j1": 3, "j2": 3, "s1": 2, "s2": 2, "c1": 2, "c2": 2, "seed": 2556, "tokens": ["cast:12", "pass", "cast:38", "cast:40", "cast:7"], "estSec": 242, "status": "confident"}
{"key": "J187/s05/d13", "set": "disagree", "night": "J187", "folder": "b-s05-pauper-2557", "d": 13, "kind": "a", "turn": 14, "k": 3, "options": [0, 1], "j1": 1, "j2": 1, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 2557, "tokens": ["attack:4", "attack:none", "attack:4,40"], "estSec": 623, "status": "complete"}
{"key": "J187/s05/d26", "set": "control", "night": "J187", "folder": "b-s05-pauper-2557", "d": 26, "kind": "a", "turn": 22, "k": 5, "options": [0, 2, 4], "j1": 0, "j2": 0, "s1": 4, "s2": 2, "c1": 2, "c2": 2, "seed": 2557, "tokens": ["attack:30,34", "attack:none", "attack:30,34,40", "attack:30", "attack:34"], "estSec": 597, "status": "partial"}
{"key": "J187/s05/d33", "set": "split", "night": "J187", "folder": "b-s05-pauper-2557", "d": 33, "kind": "a", "turn": 26, "k": 6, "options": [0, 1, 3], "j1": 1, "j2": 3, "s1": 3, "s2": 0, "c1": 2, "c2": 2, "seed": 2557, "tokens": ["attack:none", "attack:29,30,34,40", "attack:40", "attack:34", "attack:30", "attack:29"], "estSec": 0, "status": "confident"}
{"key": "J187/s05/d38", "set": "disagree", "night": "J187", "folder": "b-s05-pauper-2557", "d": 38, "kind": "a", "turn": 30, "k": 7, "options": [0, 3], "j1": 3, "j2": 3, "s1": 1, "s2": 0, "c1": 1, "c2": 2, "seed": 2557, "tokens": ["attack:none", "attack:2,29,30,34,40", "attack:40", "attack:34", "attack:30", "attack:29", "attack:2"], "estSec": 410, "status": "confident"}
{"key": "J187/s06/d5", "set": "split", "night": "J187", "folder": "b-s06-peasant-2558", "d": 5, "kind": "p", "turn": 5, "k": 4, "options": [0, 1, 2], "j1": 1, "j2": 2, "s1": 2, "s2": 1, "c1": 2, "c2": 2, "seed": 2558, "tokens": ["pass", "cast:33", "cast:35", "cast:22"], "estSec": 0, "status": "partial"}
{"key": "J187/s06/d8", "set": "disagree", "night": "J187", "folder": "b-s06-peasant-2558", "d": 8, "kind": "p", "turn": 7, "k": 4, "options": [0, 2], "j1": 2, "j2": 2, "s1": 3, "s2": 3, "c1": 2, "c2": 3, "seed": 2558, "tokens": ["pass", "cast:1", "cast:35", "cast:22"], "estSec": 396, "status": "confident"}
{"key": "J187/s06/d14", "set": "split", "night": "J187", "folder": "b-s06-peasant-2558", "d": 14, "kind": "p", "turn": 9, "k": 3, "options": [0, 1], "j1": 1, "j2": 0, "s1": 2, "s2": 1, "c1": 1, "c2": 2, "seed": 2558, "tokens": ["activate:35#1", "pass", "activate:35#0"], "estSec": 0, "status": "complete"}
{"key": "J187/s06/d20", "set": "split", "night": "J187", "folder": "b-s06-peasant-2558", "d": 20, "kind": "a", "turn": 13, "k": 7, "options": [0, 2, 6], "j1": 6, "j2": 2, "s1": 0, "s2": 4, "c1": 2, "c2": 2, "seed": 2558, "tokens": ["attack:1", "attack:none", "attack:1,22,33,39,105", "attack:1,39", "attack:1,33", "attack:1,22", "attack:1,105"], "estSec": 0, "status": "complete"}
{"key": "J187/s06/d24", "set": "split", "night": "J187", "folder": "b-s06-peasant-2558", "d": 24, "kind": "a", "turn": 15, "k": 7, "options": [0, 2], "j1": 2, "j2": 0, "s1": 0, "s2": 2, "c1": 3, "c2": 2, "seed": 2558, "tokens": ["attack:1,22,33,105", "attack:none", "attack:1,22,33,39,105", "attack:22,33,105", "attack:1,22,105", "attack:1,33,105", "attack:1,22,33"], "estSec": 0, "status": "complete"}
{"key": "J187/s08/d0", "set": "disagree", "night": "J187", "folder": "b-s08-powered-2560", "d": 0, "kind": "p", "turn": 3, "k": 3, "options": [0, 2], "j1": 2, "j2": 2, "s1": 1, "s2": 1, "c1": 1, "c2": 2, "seed": 2560, "tokens": ["pass", "cast:1", "cast:32"], "estSec": 285, "status": "confident"}
{"key": "J187/s08/d1", "set": "control", "night": "J187", "folder": "b-s08-powered-2560", "d": 1, "kind": "p", "turn": 3, "k": 3, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 1, "c2": 2, "seed": 2560, "tokens": ["cast:32", "pass", "cast:1"], "estSec": 267, "status": "partial"}
{"key": "J187/s08/d18", "set": "control", "night": "J187", "folder": "b-s08-powered-2560", "d": 18, "kind": "a", "turn": 13, "k": 7, "options": [0, 2, 6], "j1": 0, "j2": 0, "s1": 2, "s2": 6, "c1": 3, "c2": 3, "seed": 2560, "tokens": ["attack:1,19,29,30,37", "attack:none", "attack:19,29,30,37", "attack:1,29,30,37", "attack:1,19,29,30", "attack:1,19,30,37", "attack:1,19,29,37"], "estSec": 30, "status": "screened"}
{"key": "J187/s09/d1", "set": "disagree", "night": "J187", "folder": "b-s09-pauper-2561", "d": 1, "kind": "p", "turn": 2, "k": 2, "options": [0, 1], "j1": 1, "j2": 1, "s1": 0, "s2": 0, "c1": 3, "c2": 3, "seed": 2561, "tokens": ["pass", "cast:4"], "estSec": 580, "status": "partial"}
{"key": "J187/s10/d0", "set": "disagree", "night": "J187", "folder": "b-s10-peasant-2562", "d": 0, "kind": "p", "turn": 5, "k": 2, "options": [0, 1], "j1": 1, "j2": 1, "s1": 0, "s2": 0, "c1": 3, "c2": 3, "seed": 2562, "tokens": ["pass", "cast:18"], "estSec": 327, "status": "partial"}
{"key": "J187/s11/d6", "set": "split", "night": "J187", "folder": "b-s11-legacy-2563", "d": 6, "kind": "p", "turn": 12, "k": 5, "options": [0, 3], "j1": 0, "j2": 3, "s1": 2, "s2": 0, "c1": 2, "c2": 1, "seed": 2563, "tokens": ["cast:20", "pass", "cast:31", "cast:17", "cast:38"], "estSec": 0, "status": "confident"}
{"key": "J187/s12/d14", "set": "disagree", "night": "J187", "folder": "b-s12-powered-2564", "d": 14, "kind": "p", "turn": 11, "k": 8, "options": [0, 6], "j1": 6, "j2": 6, "s1": 1, "s2": 1, "c1": 2, "c2": 2, "seed": 2564, "tokens": ["cast:35", "pass", "cast:31", "cast:1", "cast:30", "cast:5", "cast:34", "cast:32"], "estSec": 54, "status": "complete"}
{"key": "J187/s12/d17", "set": "split", "night": "J187", "folder": "b-s12-powered-2564", "d": 17, "kind": "a", "turn": 11, "k": 8, "options": [0, 2, 3], "j1": 2, "j2": 3, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 2564, "tokens": ["attack:2,25,26,28,33,36,38", "attack:none", "attack:2,25,26,28,36,38", "attack:25,26,28,33,36,38", "attack:2,25,26,28,33,38", "attack:2,25,26,28,33,36", "attack:2,26,28,33,36,38", "attack:2,25,28,33,36,38"], "estSec": 0, "status": "partial"}
{"key": "J187/s13/d3", "set": "disagree", "night": "J187", "folder": "b-s13-pauper-2565", "d": 3, "kind": "p", "turn": 6, "k": 2, "options": [0, 1], "j1": 1, "j2": 1, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 2565, "tokens": ["pass", "cast:38"], "estSec": 320, "status": "partial"}
{"key": "J187/s13/d10", "set": "disagree", "night": "J187", "folder": "b-s13-pauper-2565", "d": 10, "kind": "b", "turn": 13, "k": 3, "options": [0, 2], "j1": 2, "j2": 2, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 2565, "tokens": ["block:none", "block:4>48", "block:4>78"], "estSec": 99, "status": "confident"}
{"key": "J187/s13/d12", "set": "control", "night": "J187", "folder": "b-s13-pauper-2565", "d": 12, "kind": "a", "turn": 16, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 2, "seed": 2565, "tokens": ["attack:none", "attack:4"], "estSec": 77, "status": "complete"}
{"key": "J188/s01/d13", "set": "disagree", "night": "J188", "folder": "b-s01-pauper-2566", "d": 13, "kind": "p", "turn": 13, "k": 3, "options": [0, 2], "j1": 2, "j2": 2, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 2566, "tokens": ["cast:16", "pass", "cast:39"], "estSec": 90, "status": "complete"}
{"key": "J188/s03/d5", "set": "disagree", "night": "J188", "folder": "b-s03-legacy-2568", "d": 5, "kind": "p", "turn": 11, "k": 3, "options": [0, 2], "j1": 2, "j2": 2, "s1": 1, "s2": 1, "c1": 2, "c2": 2, "seed": 2568, "tokens": ["pass", "cast:12", "cast:21"], "estSec": 226, "status": "partial"}
{"key": "J188/s03/d6", "set": "control", "night": "J188", "folder": "b-s03-legacy-2568", "d": 6, "kind": "p", "turn": 11, "k": 3, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 2, "c2": 2, "seed": 2568, "tokens": ["cast:21", "pass", "cast:12"], "estSec": 227, "status": "complete"}
{"key": "J188/s03/d16", "set": "control", "night": "J188", "folder": "b-s03-legacy-2568", "d": 16, "kind": "b", "turn": 16, "k": 5, "options": [0, 3], "j1": 0, "j2": 0, "s1": 3, "s2": 3, "c1": 1, "c2": 1, "seed": 2568, "tokens": ["block:11>59,23>68,21>104", "block:none", "block:11>59,21>104", "block:11>59,23>68", "block:23>68,21>104"], "estSec": 29, "status": "screened"}
{"key": "J188/s04/d15", "set": "control", "night": "J188", "folder": "b-s04-powered-2569", "d": 15, "kind": "a", "turn": 16, "k": 8, "options": [0, 4], "j1": 0, "j2": 0, "s1": 4, "s2": 4, "c1": 3, "c2": 3, "seed": 2569, "tokens": ["attack:14,18,93,99,107,117", "attack:none", "attack:14,93,99,107,117", "attack:14,18,93,107,117", "attack:14,18,93,99,107", "attack:14,18,93,99,117", "attack:14,18,99,107,117", "attack:18,93,99,107,117"], "estSec": 30, "status": "screened"}
{"key": "J188/s05/d10", "set": "control", "night": "J188", "folder": "b-s05-pauper-2570", "d": 10, "kind": "p", "turn": 9, "k": 3, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 2, "seed": 2570, "tokens": ["cast:18", "pass", "cast:14"], "estSec": 428, "status": "complete"}
{"key": "J188/s05/d19", "set": "control", "night": "J188", "folder": "b-s05-pauper-2570", "d": 19, "kind": "p", "turn": 15, "k": 4, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 1, "c2": 2, "seed": 2570, "tokens": ["cast:16", "pass", "cast:19", "cast:14"], "estSec": 306, "status": "complete"}
{"key": "J188/s05/d20", "set": "control", "night": "J188", "folder": "b-s05-pauper-2570", "d": 20, "kind": "p", "turn": 17, "k": 6, "options": [0, 4], "j1": 0, "j2": 0, "s1": 4, "s2": 4, "c1": 2, "c2": 2, "seed": 2570, "tokens": ["cast:31", "pass", "cast:14", "cast:27", "cast:34", "cast:19"], "estSec": 267, "status": "complete"}
{"key": "J188/s05/d21", "set": "control", "night": "J188", "folder": "b-s05-pauper-2570", "d": 21, "kind": "a", "turn": 17, "k": 4, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 2, "c2": 2, "seed": 2570, "tokens": ["attack:16,17", "attack:none", "attack:17", "attack:16"], "estSec": 169, "status": "complete"}
{"key": "J188/s06/d5", "set": "control", "night": "J188", "folder": "b-s06-peasant-2571", "d": 5, "kind": "a", "turn": 6, "k": 4, "options": [0, 3], "j1": 0, "j2": 0, "s1": 3, "s2": 3, "c1": 3, "c2": 3, "seed": 2571, "tokens": ["attack:4,11", "attack:none", "attack:11", "attack:4"], "estSec": 192, "status": "partial"}
{"key": "J188/s06/d6", "set": "disagree", "night": "J188", "folder": "b-s06-peasant-2571", "d": 6, "kind": "p", "turn": 8, "k": 3, "options": [0, 2], "j1": 2, "j2": 2, "s1": 1, "s2": 1, "c1": 2, "c2": 2, "seed": 2571, "tokens": ["pass", "cast:13", "cast:18"], "estSec": 157, "status": "screened"}
{"key": "J188/s07/d1", "set": "split", "night": "J188", "folder": "b-s07-legacy-2572", "d": 1, "kind": "p", "turn": 7, "k": 4, "options": [0, 2], "j1": 0, "j2": 2, "s1": 2, "s2": 0, "c1": 1, "c2": 2, "seed": 2572, "tokens": ["cast:20", "pass", "cast:27", "cast:21"], "estSec": 0, "status": "partial"}
{"key": "J188/s07/d4", "set": "control", "night": "J188", "folder": "b-s07-legacy-2572", "d": 4, "kind": "b", "turn": 10, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 3, "c2": 3, "seed": 2572, "tokens": ["block:24>181", "block:none"], "estSec": 80, "status": "complete"}
{"key": "J188/s07/d9", "set": "disagree", "night": "J188", "folder": "b-s07-legacy-2572", "d": 9, "kind": "p", "turn": 13, "k": 5, "options": [0, 3], "j1": 3, "j2": 3, "s1": 0, "s2": 2, "c1": 2, "c2": 2, "seed": 2572, "tokens": ["cast:27", "pass", "cast:21", "cast:12", "activate:36"], "estSec": 88, "status": "screened"}
{"key": "J188/s08/d5", "set": "control", "night": "J188", "folder": "b-s08-powered-2573", "d": 5, "kind": "p", "turn": 6, "k": 5, "options": [0, 3], "j1": 0, "j2": 0, "s1": 3, "s2": 3, "c1": 2, "c2": 2, "seed": 2573, "tokens": ["cast:22", "pass", "cast:39", "cast:4", "cast:8"], "estSec": 240, "status": "confident"}
{"key": "J188/s08/d14", "set": "control", "night": "J188", "folder": "b-s08-powered-2573", "d": 14, "kind": "p", "turn": 10, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 3, "c2": 3, "seed": 2573, "tokens": ["activate:39", "pass"], "estSec": 196, "status": "complete"}
{"key": "J188/s08/d15", "set": "control", "night": "J188", "folder": "b-s08-powered-2573", "d": 15, "kind": "p", "turn": 12, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 2, "seed": 2573, "tokens": ["activate:39", "pass"], "estSec": 156, "status": "screened"}
{"key": "J188/s09/d2", "set": "split", "night": "J188", "folder": "b-s09-pauper-2574", "d": 2, "kind": "p", "turn": 7, "k": 5, "options": [0, 3, 4], "j1": 4, "j2": 3, "s1": 3, "s2": 4, "c1": 2, "c2": 2, "seed": 2574, "tokens": ["activate:39#0", "pass", "cast:34", "cast:33", "cast:28"], "estSec": 0, "status": "complete"}
{"key": "J188/s09/d5", "set": "disagree", "night": "J188", "folder": "b-s09-pauper-2574", "d": 5, "kind": "p", "turn": 9, "k": 4, "options": [0, 1], "j1": 1, "j2": 1, "s1": 2, "s2": 3, "c1": 1, "c2": 2, "seed": 2574, "tokens": ["pass", "cast:33", "cast:28", "cast:29"], "estSec": 469, "status": "partial"}
{"key": "J188/s09/d9", "set": "split", "night": "J188", "folder": "b-s09-pauper-2574", "d": 9, "kind": "p", "turn": 13, "k": 4, "options": [0, 1], "j1": 1, "j2": 0, "s1": 0, "s2": 2, "c1": 2, "c2": 2, "seed": 2574, "tokens": ["cast:29", "pass", "cast:35", "cast:32"], "estSec": 0, "status": "confident"}
{"key": "J188/s09/d12", "set": "split", "night": "J188", "folder": "b-s09-pauper-2574", "d": 12, "kind": "p", "turn": 15, "k": 5, "options": [0, 3], "j1": 3, "j2": 0, "s1": 0, "s2": 2, "c1": 1, "c2": 2, "seed": 2574, "tokens": ["cast:40", "pass", "activate:29", "cast:28", "cast:32"], "estSec": 0, "status": "screened"}
{"key": "J188/s11/d10", "set": "split", "night": "J188", "folder": "b-s11-legacy-2576", "d": 10, "kind": "a", "turn": 7, "k": 4, "options": [0, 3], "j1": 0, "j2": 3, "s1": 3, "s2": 0, "c1": 1, "c2": 1, "seed": 2576, "tokens": ["attack:none", "attack:22,86", "attack:86", "attack:22"], "estSec": 0, "status": "partial"}
{"key": "J188/s11/d12", "set": "split", "night": "J188", "folder": "b-s11-legacy-2576", "d": 12, "kind": "a", "turn": 9, "k": 4, "options": [0, 3], "j1": 0, "j2": 3, "s1": 3, "s2": 0, "c1": 2, "c2": 1, "seed": 2576, "tokens": ["attack:none", "attack:22,86", "attack:86", "attack:22"], "estSec": 0, "status": "confident"}
{"key": "J188/s11/d14", "set": "split", "night": "J188", "folder": "b-s11-legacy-2576", "d": 14, "kind": "a", "turn": 11, "k": 2, "options": [0, 1], "j1": 1, "j2": 0, "s1": 0, "s2": 1, "c1": 1, "c2": 1, "seed": 2576, "tokens": ["attack:none", "attack:22"], "estSec": 0, "status": "partial"}
{"key": "J188/s11/d15", "set": "control", "night": "J188", "folder": "b-s11-legacy-2576", "d": 15, "kind": "b", "turn": 12, "k": 4, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 1, "c2": 1, "seed": 2576, "tokens": ["block:22>43,33>49", "block:none", "block:22>43", "block:33>49"], "estSec": 27, "status": "screened"}
{"key": "J188/s12/d8", "set": "disagree", "night": "J188", "folder": "b-s12-powered-2577", "d": 8, "kind": "p", "turn": 8, "k": 3, "options": [0, 1], "j1": 1, "j2": 1, "s1": 2, "s2": 2, "c1": 2, "c2": 3, "seed": 2577, "tokens": ["pass", "cast:28", "cast:17"], "estSec": 194, "status": "confident"}
{"key": "J188/s12/d17", "set": "control", "night": "J188", "folder": "b-s12-powered-2577", "d": 17, "kind": "a", "turn": 12, "k": 5, "options": [0, 3, 4], "j1": 0, "j2": 0, "s1": 4, "s2": 3, "c1": 2, "c2": 3, "seed": 2577, "tokens": ["attack:none", "attack:17,83,86", "attack:17", "attack:83", "attack:86"], "estSec": 142, "status": "confident"}
{"key": "J188/s13/d2", "set": "control", "night": "J188", "folder": "b-s13-pauper-2578", "d": 2, "kind": "p", "turn": 5, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 3, "c2": 3, "seed": 2578, "tokens": ["cast:12", "pass"], "estSec": 235, "status": "complete"}
{"key": "J188/s13/d6", "set": "control", "night": "J188", "folder": "b-s13-pauper-2578", "d": 6, "kind": "p", "turn": 9, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 2, "seed": 2578, "tokens": ["cast:22", "pass"], "estSec": 110, "status": "confident"}
{"key": "J190/s01/d18", "set": "disagree", "night": "J190", "folder": "b-s01-pauper-2917", "d": 18, "kind": "p", "turn": 16, "k": 2, "options": [0, 1], "j1": 1, "j2": 1, "s1": 0, "s2": 0, "c1": 1, "c2": 2, "seed": 2917, "tokens": ["pass", "cast:18"], "estSec": 50, "status": "screened"}
{"key": "J190/s02/d15", "set": "split", "night": "J190", "folder": "b-s02-peasant-2918", "d": 15, "kind": "a", "turn": 13, "k": 7, "options": [0, 2], "j1": 2, "j2": 0, "s1": 3, "s2": 3, "c1": 1, "c2": 2, "seed": 2918, "tokens": ["attack:7", "attack:none", "attack:2,7,82,83,84", "attack:2,7", "attack:7,82", "attack:7,83", "attack:7,84"], "estSec": 0, "status": "complete"}
{"key": "J190/s04/d3", "set": "control", "night": "J190", "folder": "b-s04-powered-2920", "d": 3, "kind": "a", "turn": 3, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 3, "c2": 3, "seed": 2920, "tokens": ["attack:18", "attack:none"], "estSec": 378, "status": "complete"}
{"key": "J190/s04/d12", "set": "split", "night": "J190", "folder": "b-s04-powered-2920", "d": 12, "kind": "p", "turn": 11, "k": 3, "options": [0, 2], "j1": 0, "j2": 2, "s1": 2, "s2": 0, "c1": 1, "c2": 2, "seed": 2920, "tokens": ["pass", "cast:25", "cast:26"], "estSec": 0, "status": "screened"}
{"key": "J190/s05/d16", "set": "control", "night": "J190", "folder": "b-s05-pauper-2921", "d": 16, "kind": "a", "turn": 16, "k": 4, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 3, "c2": 2, "seed": 2921, "tokens": ["attack:none", "attack:3,19", "attack:3", "attack:19"], "estSec": 245, "status": "complete"}
{"key": "J190/s05/d27", "set": "control", "night": "J190", "folder": "b-s05-pauper-2921", "d": 27, "kind": "p", "turn": 20, "k": 3, "options": [0, 1, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 1, "c1": 3, "c2": 2, "seed": 2921, "tokens": ["cast:11", "pass", "cast:7"], "estSec": 434, "status": "complete"}
{"key": "J190/s05/d33", "set": "disagree", "night": "J190", "folder": "b-s05-pauper-2921", "d": 33, "kind": "p", "turn": 24, "k": 3, "options": [0, 1], "j1": 1, "j2": 1, "s1": 2, "s2": 2, "c1": 3, "c2": 3, "seed": 2921, "tokens": ["cast:18", "pass", "cast:8"], "estSec": 176, "status": "complete"}
{"key": "J190/s06/d13", "set": "control", "night": "J190", "folder": "b-s06-peasant-2922", "d": 13, "kind": "a", "turn": 15, "k": 3, "options": [0, 1, 2], "j1": 0, "j2": 0, "s1": 1, "s2": 2, "c1": 2, "c2": 2, "seed": 2922, "tokens": ["attack:18", "attack:none", "attack:18,131"], "estSec": 483, "status": "complete"}
{"key": "J190/s07/d11", "set": "split", "night": "J190", "folder": "b-s07-legacy-2923", "d": 11, "kind": "p", "turn": 12, "k": 2, "options": [0, 1], "j1": 0, "j2": 1, "s1": 1, "s2": 0, "c1": 2, "c2": 1, "seed": 2923, "tokens": ["cast:26", "pass"], "estSec": 0, "status": "partial"}
{"key": "J190/s07/d12", "set": "disagree", "night": "J190", "folder": "b-s07-legacy-2923", "d": 12, "kind": "p", "turn": 14, "k": 2, "options": [0, 1], "j1": 1, "j2": 1, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 2923, "tokens": ["pass", "cast:4"], "estSec": 162, "status": "screened"}
{"key": "J190/s07/d18", "set": "disagree", "night": "J190", "folder": "b-s07-legacy-2923", "d": 18, "kind": "p", "turn": 16, "k": 5, "options": [0, 1], "j1": 1, "j2": 1, "s1": 0, "s2": 2, "c1": 2, "c2": 2, "seed": 2923, "tokens": ["activate:1#1", "pass", "cast:27", "cast:15", "cast:40"], "estSec": 62, "status": "screened"}
{"key": "J190/s09/d19", "set": "control", "night": "J190", "folder": "b-s09-pauper-2925", "d": 19, "kind": "a", "turn": 12, "k": 8, "options": [0, 6], "j1": 0, "j2": 0, "s1": 6, "s2": 6, "c1": 2, "c2": 2, "seed": 2925, "tokens": ["attack:1,12,13,19,22,39", "attack:none", "attack:12,13,19,22,39", "attack:1,12,13,22,39", "attack:1,12,13,19,39", "attack:1,12,13,19,22", "attack:1,13,19,22,39", "attack:1,12,19,22,39"], "estSec": 303, "status": "complete"}
{"key": "J190/s10/d14", "set": "disagree", "night": "J190", "folder": "b-s10-peasant-2926", "d": 14, "kind": "p", "turn": 13, "k": 6, "options": [0, 1], "j1": 1, "j2": 1, "s1": 5, "s2": 5, "c1": 2, "c2": 2, "seed": 2926, "tokens": ["pass", "cast:13", "cast:37", "cast:33", "cast:17", "cast:34"], "estSec": 292, "status": "complete"}
{"key": "J190/s10/d32", "set": "control", "night": "J190", "folder": "b-s10-peasant-2926", "d": 32, "kind": "b", "turn": 24, "k": 6, "options": [0, 4, 5], "j1": 0, "j2": 0, "s1": 5, "s2": 4, "c1": 1, "c2": 1, "seed": 2926, "tokens": ["block:4>49,33>50,12>53,13>53", "block:none", "block:33>50,12>53,13>53", "block:4>49,12>53,13>53", "block:4>49,33>50,12>53", "block:4>49,33>50,13>53"], "estSec": 36, "status": "screened"}
{"key": "J190/s11/d0", "set": "disagree", "night": "J190", "folder": "b-s11-legacy-2927", "d": 0, "kind": "p", "turn": 4, "k": 2, "options": [0, 1], "j1": 1, "j2": 1, "s1": 0, "s2": 0, "c1": 3, "c2": 3, "seed": 2927, "tokens": ["pass", "cast:4"], "estSec": 661, "status": "partial"}
{"key": "J190/s11/d3", "set": "control", "night": "J190", "folder": "b-s11-legacy-2927", "d": 3, "kind": "p", "turn": 6, "k": 3, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 2, "c2": 2, "seed": 2927, "tokens": ["cast:17", "pass", "cast:22"], "estSec": 727, "status": "partial"}
{"key": "J190/s12/d2", "set": "disagree", "night": "J190", "folder": "b-s12-powered-2928", "d": 2, "kind": "p", "turn": 5, "k": 2, "options": [0, 1], "j1": 1, "j2": 1, "s1": 0, "s2": 0, "c1": 3, "c2": 3, "seed": 2928, "tokens": ["pass", "cast:20"], "estSec": 420, "status": "confident"}
{"key": "J190/s12/d11", "set": "disagree", "night": "J190", "folder": "b-s12-powered-2928", "d": 11, "kind": "b", "turn": 16, "k": 5, "options": [0, 4], "j1": 4, "j2": 4, "s1": 3, "s2": 3, "c1": 2, "c2": 2, "seed": 2928, "tokens": ["block:none", "block:1>75", "block:4>75", "block:1>43", "block:4>43"], "estSec": 255, "status": "screened"}
{"key": "J191/s01/d10", "set": "disagree", "night": "J191", "folder": "b-s01-pauper-3001", "d": 10, "kind": "p", "turn": 14, "k": 3, "options": [0, 1], "j1": 1, "j2": 1, "s1": 2, "s2": 2, "c1": 2, "c2": 2, "seed": 3001, "tokens": ["pass", "cast:12", "cast:20"], "estSec": 382, "status": "complete"}
{"key": "J191/s02/d16", "set": "split", "night": "J191", "folder": "b-s02-peasant-3002", "d": 16, "kind": "a", "turn": 13, "k": 4, "options": [0, 2], "j1": 2, "j2": 0, "s1": 0, "s2": 2, "c1": 2, "c2": 2, "seed": 3002, "tokens": ["attack:15,105", "attack:none", "attack:15", "attack:105"], "estSec": 0, "status": "partial"}
{"key": "J191/s03/d1", "set": "control", "night": "J191", "folder": "b-s03-legacy-3003", "d": 1, "kind": "a", "turn": 2, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 3, "seed": 3003, "tokens": ["attack:22", "attack:none"], "estSec": 365, "status": "screened"}
{"key": "J191/s03/d16", "set": "disagree", "night": "J191", "folder": "b-s03-legacy-3003", "d": 16, "kind": "p", "turn": 14, "k": 2, "options": [0, 1], "j1": 1, "j2": 1, "s1": 0, "s2": 0, "c1": 3, "c2": 3, "seed": 3003, "tokens": ["pass", "cast:26"], "estSec": 120, "status": "screened"}
{"key": "J191/s03/d21", "set": "disagree", "night": "J191", "folder": "b-s03-legacy-3003", "d": 21, "kind": "a", "turn": 18, "k": 5, "options": [0, 2], "j1": 2, "j2": 2, "s1": 3, "s2": 4, "c1": 3, "c2": 2, "seed": 3003, "tokens": ["attack:4", "attack:none", "attack:4,22,26", "attack:4,22", "attack:4,26"], "estSec": 108, "status": "screened"}
{"key": "J191/s04/d6", "set": "disagree", "night": "J191", "folder": "b-s04-powered-3004", "d": 6, "kind": "p", "turn": 13, "k": 5, "options": [0, 4], "j1": 4, "j2": 4, "s1": 1, "s2": 2, "c1": 2, "c2": 3, "seed": 3004, "tokens": ["pass", "cast:20", "cast:13", "cast:5", "cast:17"], "estSec": 497, "status": "confident"}
{"key": "J191/s05/d16", "set": "control", "night": "J191", "folder": "b-s05-pauper-3005", "d": 16, "kind": "a", "turn": 18, "k": 6, "options": [0, 5], "j1": 0, "j2": 0, "s1": 5, "s2": 5, "c1": 2, "c2": 2, "seed": 3005, "tokens": ["attack:13,14,38", "attack:none", "attack:7,13,14,38", "attack:13,14", "attack:14,38", "attack:13,38"], "estSec": 334, "status": "complete"}
{"key": "J191/s05/d29", "set": "control", "night": "J191", "folder": "b-s05-pauper-3005", "d": 29, "kind": "a", "turn": 30, "k": 5, "options": [0, 2, 3], "j1": 0, "j2": 0, "s1": 2, "s2": 3, "c1": 2, "c2": 3, "seed": 3005, "tokens": ["attack:none", "attack:7,37,38", "attack:38", "attack:7", "attack:37"], "estSec": 348, "status": "confident"}
{"key": "J191/s05/d37", "set": "control", "night": "J191", "folder": "b-s05-pauper-3005", "d": 37, "kind": "a", "turn": 36, "k": 5, "options": [0, 3], "j1": 0, "j2": 0, "s1": 3, "s2": 3, "c1": 3, "c2": 3, "seed": 3005, "tokens": ["attack:none", "attack:7,37,38", "attack:38", "attack:7", "attack:37"], "estSec": 84, "status": "confident"}
{"key": "J191/s06/d4", "set": "control", "night": "J191", "folder": "b-s06-peasant-3006", "d": 4, "kind": "p", "turn": 11, "k": 5, "options": [0, 4], "j1": 0, "j2": 0, "s1": 4, "s2": 4, "c1": 1, "c2": 1, "seed": 3006, "tokens": ["cast:5", "pass", "activate:34#1", "activate:29#1", "cast:2"], "estSec": 285, "status": "partial"}
{"key": "J191/s06/d6", "set": "split", "night": "J191", "folder": "b-s06-peasant-3006", "d": 6, "kind": "p", "turn": 13, "k": 5, "options": [0, 4], "j1": 0, "j2": 4, "s1": 4, "s2": 0, "c1": 2, "c2": 1, "seed": 3006, "tokens": ["cast:6", "pass", "activate:34#1", "activate:29#1", "cast:2"], "estSec": 0, "status": "confident"}
{"key": "J191/s07/d4", "set": "split", "night": "J191", "folder": "b-s07-legacy-3007", "d": 4, "kind": "p", "turn": 8, "k": 5, "options": [0, 2, 4], "j1": 4, "j2": 2, "s1": 3, "s2": 0, "c1": 1, "c2": 2, "seed": 3007, "tokens": ["cast:35", "pass", "cast:32", "cast:34", "cast:37"], "estSec": 0, "status": "complete"}
{"key": "J191/s07/d26", "set": "split", "night": "J191", "folder": "b-s07-legacy-3007", "d": 26, "kind": "p", "turn": 24, "k": 3, "options": [0, 2], "j1": 0, "j2": 2, "s1": 2, "s2": 0, "c1": 1, "c2": 2, "seed": 3007, "tokens": ["activate:31", "pass", "cast:3"], "estSec": 0, "status": "complete"}
{"key": "J191/s08/d7", "set": "control", "night": "J191", "folder": "b-s08-powered-3008", "d": 7, "kind": "a", "turn": 7, "k": 4, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 3, "c2": 3, "seed": 3008, "tokens": ["attack:18,25", "attack:none", "attack:25", "attack:18"], "estSec": 310, "status": "complete"}
{"key": "J191/s08/d10", "set": "control", "night": "J191", "folder": "b-s08-powered-3008", "d": 10, "kind": "a", "turn": 9, "k": 4, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 3, "c2": 3, "seed": 3008, "tokens": ["attack:18,25", "attack:none", "attack:25", "attack:18"], "estSec": 286, "status": "complete"}
{"key": "J191/s08/d15", "set": "control", "night": "J191", "folder": "b-s08-powered-3008", "d": 15, "kind": "a", "turn": 11, "k": 6, "options": [0, 2, 3], "j1": 0, "j2": 0, "s1": 2, "s2": 3, "c1": 2, "c2": 2, "seed": 3008, "tokens": ["attack:18,25,30,35", "attack:none", "attack:25,30,35", "attack:18,25,30", "attack:18,30,35", "attack:18,25,35"], "estSec": 230, "status": "screened"}
{"key": "J191/s08/d17", "set": "control", "night": "J191", "folder": "b-s08-powered-3008", "d": 17, "kind": "p", "turn": 13, "k": 3, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 2, "seed": 3008, "tokens": ["activate:21#0", "pass", "cast:14"], "estSec": 75, "status": "screened"}
{"key": "J191/s10/d0", "set": "disagree", "night": "J191", "folder": "b-s10-peasant-3010", "d": 0, "kind": "p", "turn": 5, "k": 2, "options": [0, 1], "j1": 1, "j2": 1, "s1": 0, "s2": 0, "c1": 2, "c2": 3, "seed": 3010, "tokens": ["pass", "cast:17"], "estSec": 288, "status": "partial"}
{"key": "J191/s10/d1", "set": "control", "night": "J191", "folder": "b-s10-peasant-3010", "d": 1, "kind": "p", "turn": 5, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 3, "seed": 3010, "tokens": ["cast:17", "pass"], "estSec": 226, "status": "screened"}
{"key": "J191/s10/d3", "set": "control", "night": "J191", "folder": "b-s10-peasant-3010", "d": 3, "kind": "p", "turn": 7, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 3, "seed": 3010, "tokens": ["cast:11", "pass"], "estSec": 133, "status": "complete"}
{"key": "J191/s10/d13", "set": "control", "night": "J191", "folder": "b-s10-peasant-3010", "d": 13, "kind": "p", "turn": 15, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 3, "c2": 3, "seed": 3010, "tokens": ["cast:1", "pass"], "estSec": 53, "status": "complete"}
{"key": "J191/s11/d0", "set": "split", "night": "J191", "folder": "b-s11-legacy-3011", "d": 0, "kind": "p", "turn": 4, "k": 4, "options": [0, 2, 3], "j1": 2, "j2": 3, "s1": 3, "s2": 2, "c1": 2, "c2": 1, "seed": 3011, "tokens": ["cast:39", "pass", "cast:1", "cast:40"], "estSec": 0, "status": "complete"}
{"key": "J191/s11/d12", "set": "control", "night": "J191", "folder": "b-s11-legacy-3011", "d": 12, "kind": "b", "turn": 13, "k": 4, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 2, "c2": 3, "seed": 3011, "tokens": ["block:1>50,39>53", "block:none", "block:39>53", "block:1>50"], "estSec": 113, "status": "screened"}
{"key": "J191/s11/d14", "set": "control", "night": "J191", "folder": "b-s11-legacy-3011", "d": 14, "kind": "p", "turn": 14, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 3, "c2": 3, "seed": 3011, "tokens": ["activate:38", "pass"], "estSec": 80, "status": "screened"}
{"key": "J191/s11/d15", "set": "control", "night": "J191", "folder": "b-s11-legacy-3011", "d": 15, "kind": "p", "turn": 14, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 3, "seed": 3011, "tokens": ["cast:24", "pass"], "estSec": 89, "status": "screened"}
{"key": "J191/s12/d8", "set": "control", "night": "J191", "folder": "b-s12-powered-3012", "d": 8, "kind": "p", "turn": 7, "k": 4, "options": [0, 3], "j1": 0, "j2": 0, "s1": 3, "s2": 3, "c1": 3, "c2": 3, "seed": 3012, "tokens": ["cast:37", "pass", "cast:27", "cast:26"], "estSec": 356, "status": "partial"}
{"key": "J193/s01/d12", "set": "disagree", "night": "J193", "folder": "b-s01-pauper-3785", "d": 12, "kind": "p", "turn": 14, "k": 4, "options": [0, 3], "j1": 3, "j2": 3, "s1": 0, "s2": 1, "c1": 3, "c2": 2, "seed": 3785, "tokens": ["pass", "cast:12", "cast:4", "cast:13"], "estSec": 122, "status": "confident"}
{"key": "J193/s01/d19", "set": "control", "night": "J193", "folder": "b-s01-pauper-3785", "d": 19, "kind": "p", "turn": 18, "k": 3, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 2, "seed": 3785, "tokens": ["pass", "cast:12", "cast:4"], "estSec": 33, "status": "complete"}
{"key": "J193/s02/d40", "set": "split", "night": "J193", "folder": "b-s02-peasant-3786", "d": 40, "kind": "a", "turn": 25, "k": 8, "options": [0, 1], "j1": 1, "j2": 0, "s1": 0, "s2": 4, "c1": 1, "c2": 2, "seed": 3786, "tokens": ["attack:none", "attack:1,11,13,14,15,34,83,88,92", "attack:83", "attack:88", "attack:92", "attack:14", "attack:13", "attack:15"], "estSec": 0, "status": "confident"}
{"key": "J193/s04/d14", "set": "control", "night": "J193", "folder": "b-s04-powered-3788", "d": 14, "kind": "a", "turn": 15, "k": 5, "options": [0, 4], "j1": 0, "j2": 0, "s1": 4, "s2": 4, "c1": 2, "c2": 2, "seed": 3788, "tokens": ["attack:128", "attack:none", "attack:30,36,128", "attack:36,128", "attack:30,128"], "estSec": 248, "status": "complete"}
{"key": "J193/s04/d15", "set": "disagree", "night": "J193", "folder": "b-s04-powered-3788", "d": 15, "kind": "p", "turn": 17, "k": 2, "options": [0, 1], "j1": 1, "j2": 1, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 3788, "tokens": ["pass", "cast:20"], "estSec": 213, "status": "confident"}
{"key": "J193/s05/d11", "set": "control", "night": "J193", "folder": "b-s05-pauper-3789", "d": 11, "kind": "p", "turn": 8, "k": 3, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 2, "c2": 3, "seed": 3789, "tokens": ["cast:7", "pass", "cast:10"], "estSec": 220, "status": "partial"}
{"key": "J193/s05/d18", "set": "control", "night": "J193", "folder": "b-s05-pauper-3789", "d": 18, "kind": "a", "turn": 14, "k": 7, "options": [0, 5], "j1": 0, "j2": 0, "s1": 5, "s2": 5, "c1": 3, "c2": 3, "seed": 3789, "tokens": ["attack:3,7,9,10,36", "attack:none", "attack:7,9,10,36", "attack:3,7,9,10", "attack:3,9,10,36", "attack:3,7,10,36", "attack:3,7,9,36"], "estSec": 35, "status": "screened"}
{"key": "J193/s06/d1", "set": "split", "night": "J193", "folder": "b-s06-peasant-3790", "d": 1, "kind": "p", "turn": 9, "k": 2, "options": [0, 1], "j1": 0, "j2": 1, "s1": 1, "s2": 0, "c1": 1, "c2": 2, "seed": 3790, "tokens": ["pass", "cast:3"], "estSec": 0, "status": "screened"}
{"key": "J193/s06/d6", "set": "control", "night": "J193", "folder": "b-s06-peasant-3790", "d": 6, "kind": "b", "turn": 12, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 1, "c2": 1, "seed": 3790, "tokens": ["block:7>55", "block:none"], "estSec": 25, "status": "screened"}
{"key": "J193/s08/d12", "set": "control", "night": "J193", "folder": "b-s08-powered-3792", "d": 12, "kind": "p", "turn": 11, "k": 4, "options": [0, 3], "j1": 0, "j2": 0, "s1": 3, "s2": 3, "c1": 2, "c2": 2, "seed": 3792, "tokens": ["cast:16", "pass", "cast:21", "cast:39"], "estSec": 543, "status": "complete"}
{"key": "J193/s08/d17", "set": "control", "night": "J193", "folder": "b-s08-powered-3792", "d": 17, "kind": "a", "turn": 15, "k": 5, "options": [0, 2], "j1": 0, "j2": 0, "s1": 2, "s2": 2, "c1": 3, "c2": 3, "seed": 3792, "tokens": ["attack:16,39", "attack:none", "attack:16,21,39", "attack:39", "attack:16"], "estSec": 236, "status": "complete"}
{"key": "J193/s09/d26", "set": "control", "night": "J193", "folder": "b-s09-pauper-3793", "d": 26, "kind": "b", "turn": 15, "k": 5, "options": [0, 2, 3], "j1": 0, "j2": 0, "s1": 3, "s2": 2, "c1": 2, "c2": 2, "seed": 3793, "tokens": ["block:3>46,23>46,119>46", "block:none", "block:3>46,23>46", "block:23>46,119>46", "block:3>46,119>46"], "estSec": 337, "status": "confident"}
{"key": "J193/s09/d32", "set": "split", "night": "J193", "folder": "b-s09-pauper-3793", "d": 32, "kind": "a", "turn": 18, "k": 7, "options": [0, 5], "j1": 0, "j2": 5, "s1": 5, "s2": 0, "c1": 1, "c2": 1, "seed": 3793, "tokens": ["attack:none", "attack:3,4,16,17,119", "attack:16", "attack:3", "attack:119", "attack:17", "attack:4"], "estSec": 0, "status": "complete"}
{"key": "J193/s10/d0", "set": "disagree", "night": "J193", "folder": "b-s10-peasant-3794", "d": 0, "kind": "p", "turn": 3, "k": 3, "options": [0, 2], "j1": 2, "j2": 2, "s1": 1, "s2": 1, "c1": 1, "c2": 2, "seed": 3794, "tokens": ["pass", "cast:8", "cast:12"], "estSec": 511, "status": "complete"}
{"key": "J193/s10/d1", "set": "disagree", "night": "J193", "folder": "b-s10-peasant-3794", "d": 1, "kind": "p", "turn": 3, "k": 3, "options": [0, 2], "j1": 2, "j2": 2, "s1": 0, "s2": 0, "c1": 1, "c2": 2, "seed": 3794, "tokens": ["cast:8", "pass", "cast:12"], "estSec": 519, "status": "confident"}
{"key": "J193/s10/d2", "set": "disagree", "night": "J193", "folder": "b-s10-peasant-3794", "d": 2, "kind": "p", "turn": 5, "k": 3, "options": [0, 1], "j1": 1, "j2": 1, "s1": 2, "s2": 0, "c1": 2, "c2": 2, "seed": 3794, "tokens": ["pass", "cast:12", "cast:25"], "estSec": 568, "status": "complete"}
{"key": "J193/s10/d6", "set": "control", "night": "J193", "folder": "b-s10-peasant-3794", "d": 6, "kind": "p", "turn": 7, "k": 3, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 1, "c2": 2, "seed": 3794, "tokens": ["cast:12", "pass", "cast:25"], "estSec": 466, "status": "complete"}
{"key": "J193/s11/d1", "set": "control", "night": "J193", "folder": "b-s11-legacy-3795", "d": 1, "kind": "p", "turn": 4, "k": 4, "options": [0, 2, 3], "j1": 0, "j2": 0, "s1": 2, "s2": 3, "c1": 2, "c2": 2, "seed": 3795, "tokens": ["cast:2", "pass", "cast:32", "cast:35"], "estSec": 407, "status": "partial"}
{"key": "J193/s11/d2", "set": "disagree", "night": "J193", "folder": "b-s11-legacy-3795", "d": 2, "kind": "p", "turn": 6, "k": 5, "options": [0, 2], "j1": 2, "j2": 2, "s1": 3, "s2": 3, "c1": 1, "c2": 1, "seed": 3795, "tokens": ["cast:9", "pass", "cast:32", "cast:35", "cast:36"], "estSec": 298, "status": "complete"}
{"key": "J193/s11/d7", "set": "control", "night": "J193", "folder": "b-s11-legacy-3795", "d": 7, "kind": "p", "turn": 8, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 2, "seed": 3795, "tokens": ["pass", "cast:35"], "estSec": 223, "status": "complete"}
{"key": "J193/s11/d11", "set": "split", "night": "J193", "folder": "b-s11-legacy-3795", "d": 11, "kind": "p", "turn": 10, "k": 3, "options": [0, 2], "j1": 0, "j2": 2, "s1": 1, "s2": 0, "c1": 2, "c2": 2, "seed": 3795, "tokens": ["cast:37", "pass", "cast:36"], "estSec": 0, "status": "complete"}
{"key": "J193/s11/d13", "set": "disagree", "night": "J193", "folder": "b-s11-legacy-3795", "d": 13, "kind": "p", "turn": 12, "k": 2, "options": [0, 1], "j1": 1, "j2": 1, "s1": 0, "s2": 0, "c1": 2, "c2": 2, "seed": 3795, "tokens": ["pass", "cast:36"], "estSec": 143, "status": "screened"}
{"key": "J193/s11/d14", "set": "split", "night": "J193", "folder": "b-s11-legacy-3795", "d": 14, "kind": "a", "turn": 12, "k": 3, "options": [0, 1, 2], "j1": 2, "j2": 1, "s1": 0, "s2": 0, "c1": 2, "c2": 1, "seed": 3795, "tokens": ["attack:35", "attack:none", "attack:32,35"], "estSec": 0, "status": "screened"}
{"key": "J193/s11/d16", "set": "control", "night": "J193", "folder": "b-s11-legacy-3795", "d": 16, "kind": "b", "turn": 13, "k": 3, "options": [0, 1, 2], "j1": 0, "j2": 0, "s1": 1, "s2": 2, "c1": 1, "c2": 2, "seed": 3795, "tokens": ["block:none", "block:32>49", "block:32>84"], "estSec": 190, "status": "screened"}
{"key": "J193/s12/d6", "set": "control", "night": "J193", "folder": "b-s12-powered-3796", "d": 6, "kind": "a", "turn": 5, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 2, "c2": 3, "seed": 3796, "tokens": ["attack:20", "attack:none"], "estSec": 244, "status": "complete"}
{"key": "J193/s12/d19", "set": "control", "night": "J193", "folder": "b-s12-powered-3796", "d": 19, "kind": "p", "turn": 11, "k": 2, "options": [0, 1], "j1": 0, "j2": 0, "s1": 1, "s2": 1, "c1": 1, "c2": 1, "seed": 3796, "tokens": ["activate:94", "pass"], "estSec": 50, "status": "partial"}
{"key": "J193/s13/d12", "set": "split", "night": "J193", "folder": "b-s13-pauper-3797", "d": 12, "kind": "p", "turn": 14, "k": 4, "options": [0, 2, 3], "j1": 3, "j2": 2, "s1": 0, "s2": 0, "c1": 2, "c2": 1, "seed": 3797, "tokens": ["cast:30", "pass", "cast:36", "cast:25"], "estSec": 0, "status": "screened"}
{"key": "J193/s13/d17", "set": "disagree", "night": "J193", "folder": "b-s13-pauper-3797", "d": 17, "kind": "p", "turn": 18, "k": 3, "options": [0, 2], "j1": 2, "j2": 2, "s1": 0, "s2": 0, "c1": 2, "c2": 3, "seed": 3797, "tokens": ["cast:40", "pass", "cast:35"], "estSec": 37, "status": "confident"}
J203EOF
cat > var/j203-tools/read.py <<'J203EOF'
# J203 "judge the judge, unselected": the pre-registered readings, written before any J203 branch game was played.
# usage: python3 -I read.py <plan.jsonl> <J203 root> <night data root> <out.json> [--boot 10000] [--seed 203] [--report <md>] [--slim <json>]
#        python3 -I read.py --pilot <pilot spine folder> <night spine folder> <d> <o,o> <branches> <out.json>
#        python3 -I read.py --selftest <scratch dir>
#
# THE SAMPLE. 160 decisions drawn at random (seed 203) from move-atlas v1's rows that J200's provenance rules admit,
# stratified by kind, NOT filtered by confidence, disagreement or either map. Two blind judges (A and B) read each
# position and gave a first choice, a second choice and a confidence. Three sets, from their picks alone:
#   DISAGREE (set i): A and B pick the same option and it is not Forge's option 0. Branched: 0 and the judges' option.
#   CONTROL (set ii): A and B both pick option 0. Branched: 0 and the judges' second choice(s) (one or two options).
#   SPLIT (set iii): A and B pick different options. Recorded in the plan, never branched, never read.
# INPUTS. <plan.jsonl>: one line per sampled decision (key, set, night, folder, d, kind, turn, options, j1, j2, s1, s2,
#   c1, c2, seed, tokens, estSec, status). <J203 root>/<night>-<folder>/phaseB/{baseline.json,units.jsonl,branches.jsonl}:
#   J203's own spine folders. <night data root>/lab-<night lower>/<folder>/phaseB/{baseline.json,branches.jsonl}: the
#   night's folders, read only (the random map, and the night's Forge rows for the reproduction read).
# A BRANCH ROW scores as the atlas scores it (D478); a row with `error` or `unavailable` is no score (D470). A branch index
#   is PAIRED when every option the decision compares has a score there.
# A DECISION IS VALID (either set) when (a) J203's baseline listing equals the night's, decision for decision (tokens,
#   kind, turn: the same game, D511); (b) the listing at d is the plan's tokens; (c) no forge unit line of the decision is
#   missing, failed, or names a replay divergence; (d) it has >= 30 paired Forge branches.
# PER DECISION, one paired difference vector over the paired indices:
#   DISAGREE: diff_i = judges'(j)_i - F_i (F = option 0).
#   CONTROL:  diff_i = F_i - mean over the judges' distinct second choices s of S_i (one second when A and B named the
#             same one, two when they differ). Positive = Forge's option (the judges' shared first choice) beats their
#             second choice.
# OVERALL (per set, valid decisions): SHARE = decisions with mean diff > 0 over decisions with mean diff != 0 (ties
#   excluded and counted); GAIN = mean of the decisions' mean diffs (ties count 0). 95% intervals from a two-level cluster
#   bootstrap, --boot draws (10,000), seed 203: spines resampled with replacement, then each drawn decision's paired
#   indices resampled with replacement; the 2.5% and 97.5% points. A draw with no untied decision is left out of the
#   share's interval (counted).
# COMPLETE (per set) when its valid decisions are >= 30 AND >= ceil(0.9 x its planned decisions).
# PRIMARY READING (set i, exactly J200's rule): KNOWLEDGE SHOWN if shareLo > 0.5 and gainLo > 0; NOT SHOWN if shareHi < 0.5
#   or gainHi < 0; otherwise INCONCLUSIVE; INCOMPLETE (no verdict) when set i is not complete.
# CONTROL READING (set ii): CONTROL HOLDS if shareLo > 0.5 and gainLo > 0; CONTROL FAILS if shareHi < 0.5 or gainHi < 0;
#   otherwise CONTROL INCONCLUSIVE; INCOMPLETE when set ii is not complete.
# WHOLE SAMPLE, pre-registered and reported: each judge's agreement with Forge and with each other (from the plan);
#   WHOLE GAIN = mean over the valid decisions of sets i and ii of (judges' first choice - Forge's option): set i's diffs,
#   and 0 on set ii (the first choice there IS option 0), with the same cluster bootstrap; and DIFF = set i's gain minus
#   set ii's control gain, bootstrapped jointly (spines resampled once per draw for both sets), deciding nothing.
# BESIDE IT, deciding nothing (2,000 draws): the random map (the night's rows of the same decisions and options), by
#   kind, by the label's status (confident or not), live decisions (any compared option's Forge mean in (0.05, 0.95)),
#   both judges at confidence 3, the Spearman correlation of the random-map diff with the Forge-map diff, the
#   reproduction of the night's Forge rows, and the atlas's checks (problems, frame logs, leaks), which are INFORMATION:
#   the validity conditions above decide which decisions count, never a problems counter.
import json, math, os, random, sys

MINPAIRED = 30
MINSET = 30
FRAC = 0.9
BOOT_DEC = 2000
SETS = ('disagree', 'control')

def read_jsonl(f):
    out = []
    if not os.path.exists(f):
        return out
    with open(f) as fh:
        for l in fh:
            l = l.strip()
            if not l:
                continue
            try:
                out.append(json.loads(l))
            except ValueError:
                pass   # a torn last line
    return out

def read_json(f):
    try:
        with open(f) as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None

def scores(rows, c, d, opts):
    by = {o: {} for o in opts}
    for r in rows:
        if r.get('c') != c or r.get('d') != d or r.get('o') not in by:
            continue
        if r.get('error') or r.get('unavailable'):
            continue
        s = r.get('score')
        if isinstance(s, (int, float)):
            by[r['o']][r['i']] = float(s)
    return by

def mean(x):
    return sum(x) / len(x) if x else None

def pct(xs, q):
    if not xs:
        return None
    xs = sorted(xs)
    k = (len(xs) - 1) * q
    f = math.floor(k)
    c = min(f + 1, len(xs) - 1)
    return xs[f] + (xs[c] - xs[f]) * (k - f)

def r4(x):
    return None if x is None else round(x, 4)

def need(n):
    return max(MINSET, int(math.ceil(FRAC * n)))

def dvec(by, x):
    """The decision's paired difference vector and the two sides' means (per its set)."""
    if x['set'] == 'disagree':
        a = x['j1']
        idx = sorted(set(by[a]) & set(by[0]))
        return [by[a][i] - by[0][i] for i in idx], mean([by[a][i] for i in idx]), mean([by[0][i] for i in idx])
    secs = sorted({x['s1'], x['s2']})
    idx = sorted(set(by[0]).intersection(*[set(by[s]) for s in secs]))
    sv = [mean([by[s][i] for s in secs]) for i in idx]
    return [by[0][i] - v for i, v in zip(idx, sv)], mean([by[0][i] for i in idx]), mean(sv)

def dec_interval(diffs, rng):
    n = len(diffs)
    if n == 0:
        return None, None
    ms = [sum(rng.choices(diffs, k=n)) / n for _ in range(BOOT_DEC)]
    return pct(ms, 0.025), pct(ms, 0.975)

def overall(decs, boot, seed):
    """decs: [{'spine': str, 'diffs': [...]}] -> share, gain and their cluster-bootstrap intervals (J200's function)."""
    if not decs:
        return {'n': 0}
    pts = [mean(x['diffs']) for x in decs]
    wins = sum(1 for p in pts if p > 0)
    losses = sum(1 for p in pts if p < 0)
    ties = len(pts) - wins - losses
    share = wins / (wins + losses) if wins + losses else None
    gain = mean(pts)
    spines = {}
    for x in decs:
        spines.setdefault(x['spine'], []).append(x['diffs'])
    keys = sorted(spines)
    rng = random.Random(seed)
    sh, gn, skipped = [], [], 0
    for _ in range(boot):
        w = l = 0
        tot = 0.0
        n = 0
        for s in rng.choices(keys, k=len(keys)):
            for diffs in spines[s]:
                k = len(diffs)
                m = sum(rng.choices(diffs, k=k)) / k
                tot += m
                n += 1
                if m > 0:
                    w += 1
                elif m < 0:
                    l += 1
        gn.append(tot / n)
        if w + l:
            sh.append(w / (w + l))
        else:
            skipped += 1
    return {'n': len(decs), 'spines': len(keys), 'wins': wins, 'losses': losses, 'ties': ties,
            'share': r4(share), 'shareLo': r4(pct(sh, 0.025)), 'shareHi': r4(pct(sh, 0.975)),
            'gain': r4(gain), 'gainLo': r4(pct(gn, 0.025)), 'gainHi': r4(pct(gn, 0.975)),
            'boot': boot, 'shareDrawsSkipped': skipped}

def joint_diff(d1, d2, boot, seed):
    """GAIN(set i) - GAIN(set ii) with spines resampled once per draw for both sets."""
    if not d1 or not d2:
        return {'diff': None, 'lo': None, 'hi': None}
    sp = {}
    for tag, decs in (('a', d1), ('b', d2)):
        for x in decs:
            sp.setdefault(x['spine'], {'a': [], 'b': []})[tag].append(x['diffs'])
    keys = sorted(sp)
    rng = random.Random(seed + 7)
    out = []
    for _ in range(boot):
        ta = tb = 0.0
        na = nb = 0
        for s in rng.choices(keys, k=len(keys)):
            for tag in ('a', 'b'):
                for diffs in sp[s][tag]:
                    m = sum(rng.choices(diffs, k=len(diffs))) / len(diffs)
                    if tag == 'a':
                        ta += m
                        na += 1
                    else:
                        tb += m
                        nb += 1
        if na and nb:
            out.append(ta / na - tb / nb)
    pt = mean([mean(x['diffs']) for x in d1]) - mean([mean(x['diffs']) for x in d2])
    return {'diff': r4(pt), 'lo': r4(pct(out, 0.025)), 'hi': r4(pct(out, 0.975)), 'draws': len(out)}

def verdict(o, valid, planned, names):
    shown_name, not_name, inc_name = names
    complete = 1 if planned and valid >= need(planned) else 0
    sl, shh, gl, gh = o.get('shareLo'), o.get('shareHi'), o.get('gainLo'), o.get('gainHi')
    ok = complete == 1 and None not in (gl, gh)
    shown = 1 if ok and sl is not None and sl > 0.5 and gl > 0 else 0
    notshown = 1 if ok and not shown and ((shh is not None and shh < 0.5) or gh < 0) else 0
    inconclusive = 1 if ok and not shown and not notshown else 0
    if not ok:
        reading = 'INCOMPLETE: %d of %d decisions valid (at least %d needed); no verdict' % (valid, planned, need(planned) if planned else MINSET)
    elif shown:
        reading = shown_name
    elif notshown:
        reading = not_name
    else:
        reading = inc_name
    return {'complete': complete, 'shown': shown, 'notShown': notshown, 'inconclusive': inconclusive, 'reading': reading,
            'needed': need(planned) if planned else MINSET}

def spearman(x, y):
    n = len(x)
    if n < 3:
        return None
    def ranks(v):
        o = sorted(range(n), key=lambda i: v[i])
        r = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j + 1 < n and v[o[j + 1]] == v[o[i]]:
                j += 1
            for k in range(i, j + 1):
                r[o[k]] = (i + j) / 2.0
            i = j + 1
        return r
    rx, ry = ranks(x), ranks(y)
    mx, my = mean(rx), mean(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = math.sqrt(sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry))
    return r4(num / den) if den else None

def listing(b):
    return [(x.get('kind'), x.get('turn'), list(x.get('tokens') or [])) for x in (b or {}).get('decisions', [])]

def agreement(plan):
    n = len(plan)
    if not n:
        return {'n': 0}
    a0 = sum(1 for x in plan if x['j1'] == 0)
    b0 = sum(1 for x in plan if x['j2'] == 0)
    ab = sum(1 for x in plan if x['j1'] == x['j2'])
    by = {s: sum(1 for x in plan if x['set'] == s) for s in ('disagree', 'control', 'split')}
    return {'n': n, 'aForge': a0, 'bForge': b0, 'aForgeShare': r4(a0 / n), 'bForgeShare': r4(b0 / n), 'ab': ab, 'abShare': r4(ab / n),
            'bothForge': by['control'], 'bothOther': by['disagree'], 'split': by['split'],
            'secondsAgree': sum(1 for x in plan if x['set'] == 'control' and x['s1'] == x['s2'])}

def read(plan_file, root, night_root, boot=10000, seed=203):
    plan = read_jsonl(plan_file)
    cache = {}
    def spine(x):
        k = (x['night'], x['folder'])
        if k in cache:
            return cache[k]
        mine = os.path.join(root, '%s-%s' % (x['night'], x['folder']), 'phaseB')
        nd = os.path.join(night_root, 'lab-%s' % x['night'].lower(), x['folder'], 'phaseB')
        b, nb = read_json(os.path.join(mine, 'baseline.json')), read_json(os.path.join(nd, 'baseline.json'))
        cache[k] = {'played': b is not None, 'same': b is not None and nb is not None and listing(b) == listing(nb),
                    'atlas': read_json(os.path.join(os.path.dirname(mine), 'atlas.json')),
                    'base': b, 'units': read_jsonl(os.path.join(mine, 'units.jsonl')),
                    'rows': read_jsonl(os.path.join(mine, 'branches.jsonl')), 'night': read_jsonl(os.path.join(nd, 'branches.jsonl'))}
        return cache[k]
    rng = random.Random(seed + 1)
    per = []
    good = {s: [] for s in SETS}
    rnd = {s: [] for s in SETS}
    repro = {'cells': 0, 'same': 0, 'decisions': 0}
    for x in plan:
        if x['set'] not in SETS:
            per.append({'key': x['key'], 'set': x['set'], 'kind': x['kind'], 'turn': x['turn'], 'options': x['options'], 'excluded': 'split: not branched'})
            continue
        s = spine(x)
        opts = x['options']
        why = None
        if not s['played']:
            why = 'not played'
        elif not s['same']:
            why = 'baseline drifted'
        else:
            lst = s['base']['decisions']
            if x['d'] >= len(lst) or list(lst[x['d']].get('tokens') or []) != x['tokens']:
                why = 'listing at d differs'
        units = [u for u in s['units'] if u.get('d') == x['d'] and u.get('c') == 'forge']
        last = {}
        for u in units:
            last[u.get('id')] = u
        diverged = sum(1 for u in units if 'replay diverged' in str(u.get('error') or ''))
        if why is None and diverged:
            why = 'replay diverged'
        if why is None and (not last or not all(u.get('ok') for u in last.values())):
            why = 'unit failed or missing'
        fb = scores(s['rows'], 'forge', x['d'], opts)
        rb = scores(s['night'], 'random', x['d'], opts)
        nf = scores(s['night'], 'forge', x['d'], opts)
        if all(nf[o] for o in opts):
            repro['decisions'] += 1
            for o in opts:
                for i, v in nf[o].items():
                    if i in fb[o]:
                        repro['cells'] += 1
                        repro['same'] += 1 if fb[o][i] == v else 0
        d, ma, mb = dvec(fb, x)
        rd, _, _ = dvec(rb, x)
        lo, hi = dec_interval(d, rng) if d else (None, None)
        if why is None and len(d) < MINPAIRED:
            why = 'fewer than %d paired branches' % MINPAIRED
        side = [mean(list(fb[o].values())) for o in opts]
        live = any(v is not None and 0.05 < v < 0.95 for v in side)
        row = {'key': x['key'], 'set': x['set'], 'kind': x['kind'], 'turn': x['turn'], 'options': opts, 'spine': '%s/%s' % (x['night'], x['folder']),
               'status': x.get('status'), 'n': len(d), 'meanA': r4(ma), 'meanB': r4(mb), 'diff': r4(mean(d)), 'lo': r4(lo), 'hi': r4(hi),
               'randomN': len(rd), 'randomDiff': r4(mean(rd)), 'live': live, 'conf3': x.get('c1') == 3 and x.get('c2') == 3, 'excluded': why}
        per.append(row)
        if why is None:
            good[x['set']].append({'spine': row['spine'], 'diffs': d, 'kind': x['kind'], 'live': live, 'conf3': row['conf3'],
                                   'confident': x.get('status') == 'confident', 'rd': mean(rd)})
            if rd:
                rnd[x['set']].append({'spine': row['spine'], 'diffs': rd})
    planned = {s: sum(1 for x in plan if x['set'] == s) for s in SETS}
    res = {s: overall(good[s], boot, seed) for s in SETS}
    v1 = verdict(res['disagree'], len(good['disagree']), planned['disagree'], ('KNOWLEDGE SHOWN', 'NOT SHOWN', 'INCONCLUSIVE'))
    v2 = verdict(res['control'], len(good['control']), planned['control'], ('CONTROL HOLDS', 'CONTROL FAILS', 'CONTROL INCONCLUSIVE'))
    whole = [dict(x) for x in good['disagree']] + [{'spine': x['spine'], 'diffs': [0.0] * len(x['diffs'])} for x in good['control']]
    sb = max(1, boot // 5)
    sub = lambda st, pred: overall([x for x in good[st] if pred(x)], sb, seed)
    excl = {}
    for r in per:
        if r['excluded'] and r['set'] in SETS:
            excl['%s: %s' % (r['set'], r['excluded'])] = excl.get('%s: %s' % (r['set'], r['excluded']), 0) + 1
    ck = {'spinesWithAtlas': 0, 'problems': 0, 'frameLogs': 0, 'frameLogsFailed': 0, 'leaks': 0, 'leakChecks': 0, 'forkProblems': 0,
          'branchRows': 0, 'forgeRows': 0, 'forgeErrors': 0, 'forgeTimedOut': 0, 'forgeCapped': 0, 'forgeMs': 0, 'problemList': []}
    for k, c in sorted(cache.items()):
        a = c['atlas']
        if a and isinstance(a.get('checks'), dict):
            ck['spinesWithAtlas'] += 1
            ch = a['checks']
            pr = ch.get('problems') or []
            ck['problems'] += len(pr)
            ck['problemList'] += ['%s/%s: %s' % (k[0], k[1], str(p)[:200]) for p in pr][:5]
            for f in ('frameLogs', 'frameLogsFailed', 'leaks', 'leakChecks', 'forkProblems'):
                ck[f] += ch.get(f) or 0
        for r in c['rows']:
            ck['branchRows'] += 1
            if r.get('c') == 'forge':
                ck['forgeRows'] += 1
                ck['forgeErrors'] += 1 if r.get('error') else 0
                ck['forgeTimedOut'] += 1 if r.get('timedOut') else 0
                ck['forgeCapped'] += 1 if r.get('capped') else 0
                ck['forgeMs'] += r.get('ms') or 0
    ck['forgeWorkerHours'] = round(ck['forgeMs'] / 3.6e6, 2)
    corr = {s: spearman([x['rd'] for x in good[s] if x['rd'] is not None], [mean(x['diffs']) for x in good[s] if x['rd'] is not None]) for s in SETS}
    out = {'written': 1, 'planned': planned, 'splits': sum(1 for x in plan if x['set'] == 'split'),
           'valid': len(good['disagree']), 'validControl': len(good['control']), 'excluded': excl,
           'spines': len(cache), 'spinesPlayed': sum(1 for c in cache.values() if c['played']), 'spinesSame': sum(1 for c in cache.values() if c['same']),
           'checks': ck, 'forge': res['disagree'], 'control': res['control'], **v1,
           'controlComplete': v2['complete'], 'controlHolds': v2['shown'], 'controlFails': v2['notShown'], 'controlInconclusive': v2['inconclusive'],
           'controlReading': v2['reading'], 'controlNeeded': v2['needed'], 'needed': v1['needed'],
           'agreement': agreement(plan), 'whole': overall(whole, boot, seed) if whole else {'n': 0},
           'gainMinusControl': joint_diff(good['disagree'], good['control'], sb, seed),
           'random': overall(rnd['disagree'], boot, seed), 'randomControl': overall(rnd['control'], sb, seed),
           'byKind': {st: {k: sub(st, lambda x, k=k: x['kind'] == k) for k in ('p', 'a', 'b')} for st in SETS},
           'byStatus': {st: {'confident': sub(st, lambda x: x['confident']), 'notConfident': sub(st, lambda x: not x['confident'])} for st in SETS},
           'live': {st: sub(st, lambda x: x['live']) for st in SETS}, 'conf3': {st: sub(st, lambda x: x['conf3']) for st in SETS},
           'randomVsForgeSpearman': corr,
           'reproduction': {**repro, 'share': r4(repro['same'] / repro['cells']) if repro['cells'] else None},
           'decisions': per}
    return out

# ---------------------------------------------------------------- the self-test: synthetic spines with known answers
def _mk(root, night_root, plan, gen, n1=40, n2=40, n3=6, drift=(), diverge=(), fail=(), short=(), seconds2=False, problems=0):
    os.makedirs(os.path.dirname(plan), exist_ok=True)
    lines, spines = [], {}
    total = n1 + n2 + n3
    for j in range(total):
        st = 'disagree' if j < n1 else 'control' if j < n1 + n2 else 'split'
        night, folder = 'J9%02d' % (j // 2 % 5), 'b-s%02d-x-%d' % (j // 2, 9000 + j // 2)
        d = j % 2
        tok = ['pass', 'cast:%d' % j, 'cast:%d' % (j + 100), 'cast:%d' % (j + 200)]
        if st == 'disagree':
            j1 = j2 = 1
            s1 = s2 = 0
            opts = [0, 1]
        elif st == 'control':
            j1 = j2 = 0
            s1, s2 = (1, 2) if seconds2 else (1, 1)
            opts = sorted({0, s1, s2})
        else:
            j1, j2, s1, s2 = 1, 2, 0, 0
            opts = [0, 1, 2]
        x = {'key': '%s/s%02d/d%d' % (night, j // 2, d), 'set': st, 'night': night, 'folder': folder, 'd': d, 'kind': 'pab'[j % 3], 'turn': 5 + d,
             'options': opts, 'j1': j1, 'j2': j2, 's1': s1, 's2': s2, 'c1': 3, 'c2': 3 if j % 4 else 2, 'seed': 9000 + j // 2, 'tokens': tok,
             'estSec': 10, 'status': 'confident' if j % 5 == 0 else 'complete'}
        lines.append(x)
        spines.setdefault((night, folder), []).append(x)
    with open(plan, 'w') as f:
        for x in lines:
            f.write(json.dumps(x) + '\n')
    rng = random.Random(7)
    for (night, folder), xs in spines.items():
        decs = [{'d': k, 'kind': 'p', 'turn': 5 + k, 'tokens': ['pass']} for k in range(3)]
        for x in xs:
            decs[x['d']] = {'d': x['d'], 'kind': x['kind'], 'turn': x['turn'], 'tokens': x['tokens']}
        nd = os.path.join(night_root, 'lab-%s' % night.lower(), folder, 'phaseB')
        md = os.path.join(root, '%s-%s' % (night, folder), 'phaseB')
        os.makedirs(nd, exist_ok=True)
        os.makedirs(md, exist_ok=True)
        json.dump({'decisions': decs}, open(os.path.join(nd, 'baseline.json'), 'w'))
        mine = json.loads(json.dumps(decs))
        if any(x['key'] in drift for x in xs):
            mine[2]['tokens'] = ['pass', 'cast:999']
        json.dump({'decisions': mine}, open(os.path.join(md, 'baseline.json'), 'w'))
        if problems:
            json.dump({'checks': {'problems': ['synthetic problem'] * problems, 'frameLogs': 3, 'frameLogsFailed': 0, 'leaks': 0, 'leakChecks': 1, 'forkProblems': 0}},
                      open(os.path.join(root, '%s-%s' % (night, folder), 'atlas.json'), 'w'))
        rows, nrows, units = [], [], []
        for x in xs:
            if x['set'] == 'split':
                continue
            for o in x['options']:
                for i in range(40):
                    if x['key'] in short and i >= 20:
                        continue
                    if o == x['options'][-1] and i == 39:
                        continue   # this cell gets only the errored row below
                    rows.append({'c': 'forge', 'd': x['d'], 'o': o, 'i': i, 'score': gen(x, o, i, rng, 'forge'), 'error': None})
                    nrows.append({'c': 'forge', 'd': x['d'], 'o': o, 'i': i, 'score': rows[-1]['score'], 'error': None})
                for i in range(150):
                    nrows.append({'c': 'random', 'd': x['d'], 'o': o, 'i': i, 'score': gen(x, o, i, rng, 'random'), 'error': None})
            rows.append({'c': 'forge', 'd': x['d'], 'o': x['options'][-1], 'i': 39, 'score': 1, 'error': 'boom'})   # an errored row: no score
            for i0 in (0, 20):
                err = 'the replay diverged at decision %d' % x['d'] if x['key'] in diverge else None
                ok = err is None and x['key'] not in fail
                units.append({'id': 'd%d-forge-%d' % (x['d'], i0), 'd': x['d'], 'c': 'forge', 'i0': i0, 'ok': ok, 'error': err})
        for path, rr in ((os.path.join(md, 'branches.jsonl'), rows), (os.path.join(nd, 'branches.jsonl'), nrows), (os.path.join(md, 'units.jsonl'), units)):
            with open(path, 'w') as f:
                for r in rr:
                    f.write(json.dumps(r) + '\n')

def selftest(scratch):
    bern = lambda p, rng: 1.0 if rng.random() < p else 0.0
    def make(name, gen, **kw):
        base = os.path.join(scratch, name)
        root, night, plan = os.path.join(base, 'j203'), os.path.join(base, 'night'), os.path.join(base, 'plan.jsonl')
        _mk(root, night, plan, gen, **kw)
        return read(plan, root, night, boot=300, seed=203)
    def judge(better, control):
        # set i: the judges' option (1) vs 0; set ii: option 0 vs the second (1, 2)
        def g(x, o, i, rng, c):
            if x['set'] == 'disagree':
                return bern(0.4 + (better if o == 1 else 0), rng)
            return bern(0.4 + (control if o == 0 else 0), rng)
        return g
    same = lambda x, o, i, rng, c: bern(0.5, rng)
    flat = lambda x, o, i, rng, c: 1.0
    chaos = lambda x, o, i, rng, c: bern((0.65 if o == 1 else 0.4) if c == 'random' else (0.4 if o == 1 else 0.6), rng) if x['set'] == 'disagree' else bern(0.5, rng)
    exact = lambda x, o, i, rng, c: (1.0 if o == 0 else 0.0 if o == 1 else 0.5) if x['set'] == 'control' else 0.5
    k = lambda j: 'J9%02d/s%02d/d%d' % (j // 2 % 5, j // 2, j % 2)
    cases = [
        ('judges better on i, Forge better than the second on ii: SHOWN and CONTROL HOLDS', 'both', judge(0.2, 0.2), {},
            lambda r: r['shown'] == 1 and r['controlHolds'] == 1 and r['notShown'] + r['inconclusive'] + r['controlFails'] + r['controlInconclusive'] == 0),
        ('Forge better on i, second better on ii: NOT SHOWN and CONTROL FAILS', 'worse', judge(-0.2, -0.2), {},
            lambda r: r['notShown'] == 1 and r['controlFails'] == 1 and r['shown'] == 0),
        ('no difference: INCONCLUSIVE and CONTROL INCONCLUSIVE', 'same', same, {},
            lambda r: r['inconclusive'] == 1 and r['controlInconclusive'] == 1),
        ('every branch a win: all ties, no share, never SHOWN', 'flat', flat, {},
            lambda r: r['forge']['ties'] == 40 and r['forge']['share'] is None and r['shown'] == 0 and r['complete'] == 1 and r['forge']['gain'] == 0),
        ('better on the random map only: NOT SHOWN, the random side above 0.5', 'chaos', chaos, {},
            lambda r: r['notShown'] == 1 and r['random']['shareLo'] > 0.5 and r['random']['gainLo'] > 0),
        ('4 of 40 set-i decisions excluded: 36 valid = ceil(0.9 x 40), complete', 'excl4', judge(0.2, 0.2),
            {'diverge': {k(0)}, 'fail': {k(1)}, 'short': {k(2), k(3)}},
            lambda r: r['valid'] == 36 and r['complete'] == 1 and r['shown'] == 1 and r['excluded'].get('disagree: replay diverged') == 1),
        ('5 excluded: 35 valid, INCOMPLETE, no primary verdict; the control still reads', 'excl5', judge(0.2, 0.2),
            {'diverge': {k(0)}, 'fail': {k(1)}, 'short': {k(2), k(3), k(4)}},
            lambda r: r['valid'] == 35 and r['complete'] == 0 and r['shown'] + r['notShown'] + r['inconclusive'] == 0 and r['reading'].startswith('INCOMPLETE') and r['controlHolds'] == 1),
        ('a set under 30 planned is INCOMPLETE however many are valid', 'small', judge(0.2, 0.2), {'n1': 20, 'n2': 40},
            lambda r: r['planned']['disagree'] == 20 and r['complete'] == 0 and r['reading'].startswith('INCOMPLETE')),
        ('the errored row is no score: 40 paired less one', 'rows', judge(0.2, 0.2), {},
            lambda r: all(d['n'] == 39 for d in r['decisions'] if d['set'] in SETS)),
        ('a drifted spine (two decisions) is excluded and named', 'drift', judge(0.2, 0.2), {'drift': {k(1)}},
            lambda r: r['valid'] == 38 and r['excluded'] == {'disagree: baseline drifted': 2} and r['spinesSame'] == r['spines'] - 1),
        ('two different seconds: the control diff is F minus their mean (1 - 0.25 = 0.75 everywhere)', 'twosec', exact, {'seconds2': True},
            lambda r: r['control']['gain'] == 0.75 and all(d['options'] == [0, 1, 2] for d in r['decisions'] if d['set'] == 'control')),
        ('splits are never read; the agreement counts come from the plan', 'split', judge(0.2, 0.2), {},
            lambda r: r['splits'] == 6 and r['agreement']['split'] == 6 and r['agreement']['ab'] == 80 and r['forge']['n'] == 40 and r['control']['n'] == 40),
        ('atlas problems are counted and decide nothing: still SHOWN', 'problems', judge(0.2, 0.2), {'problems': 1},
            lambda r: r['checks']['problems'] == r['checks']['spinesWithAtlas'] == 40 and r['shown'] == 1 and r['controlHolds'] == 1),
        ('the whole-sample gain is set i diluted by zeros on set ii', 'whole', judge(0.2, 0.2), {},
            lambda r: r['whole']['n'] == 80 and abs(r['whole']['gain'] - r['forge']['gain'] / 2) < 1e-3),
    ]
    ok = 0
    for what, name, gen, kw, pred in cases:
        try:
            r = make(name, gen, **kw)
            p = bool(pred(r)) and report(r).startswith('# J203')
            line = '%s; %s' % (r['reading'], r['controlReading'])
        except Exception as e:   # a crash fails the case
            p, line = False, 'crash: %r' % (e,)
        print('%s %s: %s' % ('ok  ' if p else 'FAIL', what, line), file=sys.stderr)
        ok += 1 if p else 0
    return {'selftest': 1, 'cases': len(cases), 'passed': ok, 'ok': 1 if ok == len(cases) else 0}

def pilot(mine, night, d, opts, n, out):
    """The pilot's spine: the same game (D511), the lane's restriction, the values parse (J200's pilot read)."""
    b, nb = read_json(os.path.join(mine, 'phaseB', 'baseline.json')), read_json(os.path.join(night, 'phaseB', 'baseline.json'))
    units = [u for u in read_jsonl(os.path.join(mine, 'phaseB', 'units.jsonl')) if u.get('c') == 'forge']
    rows = read_jsonl(os.path.join(mine, 'phaseB', 'branches.jsonl'))
    forge = [r for r in rows if r.get('c') == 'forge']
    mineRows = [r for r in forge if r.get('d') == d and r.get('o') in opts]
    nf = scores(read_jsonl(os.path.join(night, 'phaseB', 'branches.jsonl')), 'forge', d, opts)
    fb = scores(rows, 'forge', d, opts)
    same = sum(1 for o in opts for i, v in fb[o].items() if nf[o].get(i) == v)
    cells = sum(1 for o in opts for i in fb[o] if i in nf[o])
    a = read_json(os.path.join(mine, 'atlas.json')) or {}
    ch = a.get('checks') or {}
    r = {'baseline': 1 if b else 0, 'sameGame': 1 if b and nb and listing(b) == listing(nb) else 0,
         'listingAtD': 1 if b and d < len(b['decisions']) and b['decisions'][d].get('tokens') == (nb or {}).get('decisions', [{}] * (d + 1))[d].get('tokens') else 0,
         'units': len(units), 'unitsOk': sum(1 for u in units if u.get('ok')), 'diverged': sum(1 for u in units if 'replay diverged' in str(u.get('error') or '')),
         'forgeRows': len(forge), 'randomRows': sum(1 for r in rows if r.get('c') == 'random'), 'rowsHere': len(mineRows),
         'otherOptionRows': sum(1 for r in forge if r.get('o') not in opts or r.get('d') != d),
         'scored': sum(1 for o in opts for _ in fb[o]), 'scoresValid': 1 if all(r.get('score') in (0, 0.5, 1) for r in mineRows if not r.get('error')) else 0,
         'errors': sum(1 for r in mineRows if r.get('error')), 'expected': n * len(opts),
         'nightCells': cells, 'nightSame': same, 'atlasJson': 1 if a else 0, 'problems': len(ch.get('problems') or []) if a else -1,
         'frameLogsFailed': ch.get('frameLogsFailed', -1), 'leaks': ch.get('leaks', -1),
         'means': {str(o): r4(mean(list(fb[o].values()))) for o in opts}}
    with open(out, 'w') as f:
        json.dump(r, f, indent=1)
        f.write('\n')
    print(json.dumps(r))
    return r

def report(r):
    f, c, rd, w, ag = r['forge'], r['control'], r['random'] or {}, r['whole'], r['agreement']
    fs = lambda o: '%s [%s, %s]' % (o.get('share'), o.get('shareLo'), o.get('shareHi'))
    fg = lambda o: '%s [%s, %s]' % (o.get('gain'), o.get('gainLo'), o.get('gainHi'))
    row = lambda name, o: '| %s | %s | %s / %s / %s | %s | %s |' % (name, o.get('n'), o.get('wins'), o.get('losses'), o.get('ties'), fs(o), fg(o))
    gm = r['gainMinusControl']
    L = ['# J203: judge the judge, unselected -- 160 random atlas decisions, the judges against Forge under Forge continuation', '',
         '**Primary reading (set i, J200\'s rule):** %s.' % r['reading'], '',
         '**Control reading (set ii):** %s.' % r['controlReading'], '',
         'Judges on the whole sample (from the picks): A on Forge\'s option %s of %s (%s), B %s (%s); A = B on %s (%s): both on Forge %s (set ii), both on another option %s (set i), split %s (set iii, not branched); the control\'s two seconds the same on %s.' % (
             ag.get('aForge'), ag.get('n'), ag.get('aForgeShare'), ag.get('bForge'), ag.get('bForgeShare'), ag.get('ab'), ag.get('abShare'),
             ag.get('bothForge'), ag.get('bothOther'), ag.get('split'), ag.get('secondsAgree')), '',
         'Set i: %s planned, %s valid (at least %s needed). Set ii: %s planned, %s valid (at least %s needed). Excluded: %s. Spines: %s, played %s, the night\'s game %s.' % (
             r['planned']['disagree'], r['valid'], r['needed'], r['planned']['control'], r['validControl'], r['controlNeeded'], json.dumps(r['excluded']),
             r['spines'], r['spinesPlayed'], r['spinesSame']), '',
         '| reading | decisions | better / worse / tied | share of untied [95%] | mean gain [95%] |', '|---|---|---|---|---|',
         row('**set i: judges\' option vs Forge\'s (Forge map)**', f),
         row('**set ii: Forge\'s option (the judges\' first) vs their second (Forge map)**', c),
         row('whole sample, sets i + ii: judges\' first choice vs Forge\'s (0 on set ii)', w),
         row('set i, random map (the night\'s rows)', rd),
         row('set ii, random map (the night\'s rows)', r['randomControl']), '',
         'Set i\'s gain minus set ii\'s control gain: %s [%s, %s] (joint bootstrap; deciding nothing).' % (gm.get('diff'), gm.get('lo'), gm.get('hi')), '',
         'Beside the readings, deciding nothing (Forge map, 2,000 draws):', '', '| subset | decisions | better / worse / tied | share [95%] | gain [95%] |', '|---|---|---|---|---|']
    for st in SETS:
        for kk, nm in (('p', 'priority'), ('a', 'attack'), ('b', 'block')):
            L.append(row('%s, %s' % (st, nm), r['byKind'][st][kk]))
        L.append(row('%s, the label confident (J200\'s population)' % st, r['byStatus'][st]['confident']))
        L.append(row('%s, the label not confident' % st, r['byStatus'][st]['notConfident']))
        L.append(row('%s, live (an option between .05 and .95)' % st, r['live'][st]))
        L.append(row('%s, both judges at confidence 3' % st, r['conf3'][st]))
    rp, ck = r['reproduction'], r['checks']
    L += ['', 'Random-map diff against Forge-map diff, per decision (Spearman): set i %s, set ii %s.' % (r['randomVsForgeSpearman'].get('disagree'), r['randomVsForgeSpearman'].get('control')),
          'Reproduction of the night\'s Forge rows (decisions the night mapped): %s of %s cells the same (%s), over %s decisions.' % (rp['same'], rp['cells'], rp['share'], rp['decisions']),
          'Checks (information; the validity conditions decide): %(spinesWithAtlas)s spines with atlas.json; problems %(problems)s; frame logs %(frameLogs)s, failed %(frameLogsFailed)s; leaks %(leaks)s of %(leakChecks)s leak checks; fork problems %(forkProblems)s.' % ck]
    for p in ck.get('problemList') or []:
        L.append('- problem: %s' % p)
    L += ['Forge rows %(forgeRows)s (errors %(forgeErrors)s, timed out %(forgeTimedOut)s, capped %(forgeCapped)s); %(forgeWorkerHours)s worker-hours of branch games.' % ck, '',
          '| decision | set | kind | turn | options | side A mean | side B mean | diff [95%] | random diff | label | excluded |', '|---|---|---|---|---|---|---|---|---|---|---|']
    for x in r['decisions']:
        if x['set'] not in SETS:
            continue
        L.append('| %s | %s | %s | %s | %s | %s | %s | %s [%s, %s] | %s | %s | %s |' % (x['key'], x['set'], x['kind'], x['turn'], x['options'], x['meanA'], x['meanB'],
                                                                                     x['diff'], x['lo'], x['hi'], x['randomDiff'], x.get('status'), x['excluded'] or ''))
    return '\n'.join(L) + '\n'

if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == '--pilot':
        pilot(a[1], a[2], int(a[3]), [int(x) for x in a[4].split(',')], int(a[5]), a[6])
        sys.exit(0)
    if a and a[0] == '--selftest':
        r = selftest(a[1])
        print(json.dumps(r))
        sys.exit(0 if r['ok'] else 1)
    if len(a) < 4:
        print('usage: read.py <plan.jsonl> <J203 root> <night data root> <out.json> [--boot N] [--seed S] | --selftest <dir>', file=sys.stderr)
        sys.exit(2)
    boot = int(a[a.index('--boot') + 1]) if '--boot' in a else 10000
    seed = int(a[a.index('--seed') + 1]) if '--seed' in a else 203
    r = read(a[0], a[1], a[2], boot, seed)
    os.makedirs(os.path.dirname(os.path.abspath(a[3])), exist_ok=True)
    with open(a[3], 'w') as f:
        json.dump(r, f, indent=1)
        f.write('\n')
    if '--slim' in a:
        with open(a[a.index('--slim') + 1], 'w') as f:
            json.dump({k: v for k, v in r.items() if k != 'decisions'}, f, indent=1)
            f.write('\n')
    if '--report' in a:
        with open(a[a.index('--report') + 1], 'w') as f:
            f.write(report(r))
    print(json.dumps({k: r[k] for k in ('valid', 'validControl', 'complete', 'shown', 'notShown', 'inconclusive', 'reading', 'controlReading')}))
    print(json.dumps({'forge': r['forge'], 'control': r['control'], 'whole': r['whole']}))
J203EOF
cat > var/j203-tools/drive.py <<'J203EOF'
# J203: the plan's checks and the spine driver (J200's drive.py, for three sets).
# usage: python3 -I drive.py check <plan.jsonl> <night root> <out.json>
#        python3 -I drive.py run <plan.jsonl> <night root> <group: i|ii|pilot> <workers> [--dry]
# THE PLAN (embedded in the job, written by llm-judge3's ingest.py from the two judges' picks): one line per sampled
#   decision, 160 in all: set "disagree" (both judges on one option that is not Forge's: options [0, j]), set "control"
#   (both judges on option 0: options 0 and their second choice(s)), set "split" (the judges differ: recorded, never
#   branched). EXPECT below is the plan's counts and sha256 as ingest.py wrote them; `check` fails on any difference.
# `check` (the pilot): every spine folder of a branched decision is on disk; its plan.json seed is the plan's; its decks'
#   sha256 are the ones its schedule.jsonl header recorded; its baseline listing at d is the plan's tokens, kind and turn;
#   every line's options have its set's shape; the counts and the plan's sha256 are EXPECT's.
# `run`: the spines of a group, one `tools/cubelab.sh atlas` each, longest estimate first: i = every spine with a set-i
#   decision (its set-ii decisions ride along: one baseline per spine), ii = the spines with only set-ii decisions,
#   pilot = J193's s01, d12 only, options [0, 3], 5 Forge branches (J200's pilot decision, whose night has a Forge map;
#   independent of the plan). Each spine gets an --only file (the lane's format: [{d, options, tokens}]), the night's own
#   deck files and seed, and J177's unit settings; --branch-random 0 --branch-forge 40 --chunk 5. A spine whose atlas.json
#   exists with exit 0 in exits.txt is skipped (a retry resumes the rest); every exit goes to exits.txt and every wall to
#   spine-times.txt, and a non-zero exit does not stop the group (the reader names what it excludes).
import hashlib, json, os, shutil, subprocess, sys, time

DATA = '/home/justin-a/code/lab/data'
OUT = 'lab-j203'
PILOT = {'night': 'J193', 'folder': 'b-s01-pauper-3785', 'd': 12, 'options': [0, 3], 'seed': 3785,
         'tokens': ['pass', 'cast:12', 'cast:4', 'cast:13']}
BRANCHED = ('disagree', 'control')
EXPECT = {"disagree": 58, "control": 70, "split": 32, "spines": 61, "spinesI": 41, "sha256": "1a13dd299c5486032975e09ac901367f57008409a7a002d9826e5a274b6dda38"}  # written by ingest.py: {"disagree": n, "control": n, "split": n, "spines": n, "spinesI": n, "sha256": "..."}

def plan_of(f):
    with open(f) as fh:
        return [json.loads(l) for l in fh if l.strip()]

def night_dir(root, x):
    return os.path.join(root, 'lab-%s' % x['night'].lower(), x['folder'])

def sha(f):
    with open(f, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()

def spine_facts(root, x):
    nd = night_dir(root, x)
    pj = json.load(open(os.path.join(nd, 'plan.json')))
    head = json.loads(open(os.path.join(nd, 'phaseB', 'schedule.jsonl')).readline())
    return nd, pj, head

def shape_ok(x):
    t = len(x['tokens'])
    if x['set'] == 'disagree':
        return x['j1'] == x['j2'] and x['j1'] != 0 and x['options'] == [0, x['j1']] and x['j1'] < t
    if x['set'] == 'control':
        return (x['j1'] == x['j2'] == 0 and x['s1'] != 0 and x['s2'] != 0 and x['options'] == sorted({0, x['s1'], x['s2']})
                and max(x['options']) < t)
    if x['set'] == 'split':
        return x['j1'] != x['j2'] and max(x['j1'], x['j2']) < t
    return False

def check(plan_file, root, out):
    plan = plan_of(plan_file)
    r = {'decisions': len(plan), 'spines': 0, 'spinesOk': 0, 'decksOk': 0, 'seedOk': 0, 'listingOk': 0, 'shapeOk': 0, 'bad': []}
    for s in ('disagree', 'control', 'split'):
        r[s] = sum(1 for x in plan if x['set'] == s)
    r['branched'] = r['disagree'] + r['control']
    seen = {}
    for x in plan:
        r['shapeOk'] += 1 if shape_ok(x) else 0
        if not shape_ok(x):
            r['bad'].append('%s: set %s, options %s' % (x['key'], x['set'], x['options']))
        if x['set'] not in BRANCHED:
            continue
        k = (x['night'], x['folder'])
        if k not in seen:
            try:
                nd, pj, head = spine_facts(root, x)
                seen[k] = {'ok': True, 'decks': all(os.path.exists(pj[d]) and sha(pj[d]) == head['deckSha256'][d] for d in ('deckA', 'deckB')),
                           'seed': pj['seed'] == x['seed'], 'base': json.load(open(os.path.join(nd, 'phaseB', 'baseline.json')))}
            except (OSError, ValueError, KeyError) as e:
                seen[k] = {'ok': False, 'decks': False, 'seed': False, 'base': None}
                r['bad'].append('%s/%s: %r' % (k[0], k[1], e))
        s = seen[k]
        lst = (s['base'] or {}).get('decisions', [])
        y = lst[x['d']] if x['d'] < len(lst) else {}
        if y.get('tokens') == x['tokens'] and y.get('kind') == x['kind'] and y.get('turn') == x['turn']:
            r['listingOk'] += 1
        else:
            r['bad'].append('%s: the night baseline lists another decision at d%d' % (x['key'], x['d']))
    r['spines'] = len(seen)
    r['spinesI'] = len({(x['night'], x['folder']) for x in plan if x['set'] == 'disagree'})
    r['spinesOk'] = sum(1 for s in seen.values() if s['ok'])
    r['decksOk'] = sum(1 for s in seen.values() if s['decks'])
    r['seedOk'] = sum(1 for s in seen.values() if s['seed'])
    r['sha256'] = sha(plan_file)
    r['expect'] = EXPECT
    r['expectOk'] = 1 if EXPECT and all(r.get(k) == v for k, v in EXPECT.items()) else 0
    r['ok'] = 1 if (r['expectOk'] and r['decisions'] == 160 and r['shapeOk'] == 160 and r['listingOk'] == r['branched']
                    and r['spinesOk'] == r['spines'] == r['decksOk'] == r['seedOk']) else 0
    with open(out, 'w') as f:
        json.dump(r, f, indent=1)
        f.write('\n')
    print(json.dumps({k: v for k, v in r.items() if k != 'bad'}))
    for b in r['bad'][:20]:
        print('  ' + b, file=sys.stderr)
    return r['ok']

def groups(plan):
    by = {}
    for x in plan:
        if x['set'] in BRANCHED:
            by.setdefault((x['night'], x['folder']), []).append(x)
    g1 = [k for k, xs in by.items() if any(x['set'] == 'disagree' for x in xs)]
    g2 = [k for k, xs in by.items() if all(x['set'] == 'control' for x in xs)]
    est = lambda k: -sum(x['estSec'] for x in by[k])
    return by, sorted(g1, key=lambda k: (est(k), k)), sorted(g2, key=lambda k: (est(k), k))

def exits(path):
    done = {}
    if os.path.exists(path):
        for l in open(path):
            p = l.split()
            if len(p) == 2:
                done[p[0]] = p[1]
    return done

def run(plan_file, root, group, workers, dry):
    plan = plan_of(plan_file)
    by, g1, g2 = groups(plan)
    data = os.path.join(DATA, OUT)
    only_dir = os.path.abspath('var/j203-tools/only')
    if not dry:   # a dry run writes nothing
        os.makedirs(data, exist_ok=True)
        os.makedirs(only_dir, exist_ok=True)
    if group == 'pilot':
        p = dict(PILOT, key='pilot', set='pilot', kind=None, turn=None)
        keys, by = [(p['night'], p['folder'])], {(p['night'], p['folder']): [p]}
    else:
        keys = g1 if group == 'i' else g2
    ex = exits(os.path.join(data, 'exits.txt'))
    env = dict(os.environ, LAB_DATA_DIR=DATA, CUBELAB_HOME_ROOT='var/cubelab/homes-J203')
    played = 0
    for k in keys:
        xs = by[k]
        name, forge = ('pilot-%s-%s' % k, 5) if group == 'pilot' else ('%s-%s' % k, 40)
        if ex.get(name) == '0' and os.path.exists(os.path.join(data, name, 'atlas.json')):
            print('J203: %s done (exit 0, atlas.json), skipped' % name)
            continue
        if shutil.disk_usage(DATA).free / 1e9 < 20:
            print('J203: under 20 GB free on %s; stopping before %s' % (DATA, name), file=sys.stderr)
            return 1
        nd, pj, head = spine_facts(root, xs[0])
        for d in ('deckA', 'deckB'):
            if sha(pj[d]) != head['deckSha256'][d]:
                print('J203: %s: %s is not the deck the night played' % (name, pj[d]), file=sys.stderr)
                return 1
        if pj['seed'] != xs[0]['seed']:
            print('J203: %s: the night plan seed %s is not the plan seed %s' % (name, pj['seed'], xs[0]['seed']), file=sys.stderr)
            return 1
        only = [{'d': x['d'], 'options': x['options'], 'tokens': x['tokens']} for x in sorted(xs, key=lambda y: y['d'])]
        of = os.path.join(only_dir, name + '.json')
        if not dry:
            with open(of, 'w') as f:
                json.dump(only, f)
                f.write('\n')
        cmd = ['tools/cubelab.sh', 'atlas', '--deck-a', pj['deckA'], '--deck-b', pj['deckB'], '--seed', str(pj['seed']), '--phase', 'b',
               '--turn-cap', '40', '--options', '8', '--branch-random', '0', '--branch-forge', str(forge), '--chunk', '5',
               '--branch-timeout', '120', '--unit-timeout', '30', '--leak-checks', '1', '--checks-parallel', str(workers),
               '--jobs', str(workers), '--only', of, '--out', 'var/%s/%s' % (OUT, name)]
        print('J203: %s: %d decision(s) %s; %s' % (name, len(only), ', '.join('d%d %s' % (o['d'], o['options']) for o in only), ' '.join(cmd)), flush=True)
        if dry:
            continue
        t0 = time.time()
        rc = subprocess.call(cmd, env=env)
        played += 1
        with open(os.path.join(data, 'exits.txt'), 'a') as f:
            f.write('%s %d\n' % (name, rc))
        with open(os.path.join(data, 'spine-times.txt'), 'a') as f:
            f.write('%s %d %d %d\n' % (name, int(t0), int(time.time()), workers))
    print('J203: group %s: %d spine command(s) run' % (group, played))
    return 0

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['check'] and len(a) == 4:
        sys.exit(0 if check(a[1], a[2], a[3]) else 1)
    if a[:1] == ['run'] and len(a) >= 5:
        sys.exit(run(a[1], a[2], a[3], int(a[4]), '--dry' in a))
    print('usage: drive.py check <plan> <night root> <out.json> | run <plan> <night root> <i|ii|pilot> <workers> [--dry]', file=sys.stderr)
    sys.exit(2)
J203EOF
python3 -I var/j203-tools/drive.py check var/j203-tools/plan.jsonl /home/justin-a/code/lab/data var/j203-tools/plan-check.json || true
rm -rf var/j203-tools/selftest
python3 -I var/j203-tools/read.py --selftest var/j203-tools/selftest > var/j203-tools/read-selftest.json || true
cat var/j203-tools/read-selftest.json
```
```bash
# one decision on the Forge map at 5 branches an option: J193's s01 d12, options 0 and 3 (J200's pilot decision)
python3 -I var/j203-tools/drive.py run var/j203-tools/plan.jsonl /home/justin-a/code/lab/data pilot 3
python3 -I var/j203-tools/read.py --pilot /home/justin-a/code/lab/data/lab-j203/pilot-J193-b-s01-pauper-3785 /home/justin-a/code/lab/data/lab-j193/b-s01-pauper-3785 12 0,3 5 var/j203-tools/pilot.json
```
metrics: merged = sh: cat var/j203-merged.txt 2>/dev/null || echo 0
metrics: lane = sh: cat var/j203-tools/lane.txt 2>/dev/null || echo 0
metrics: selftest = sh: cat var/j203-tools/selftest.txt 2>/dev/null || echo 0
metrics: nodetests = sh: cat var/j203-tools/nodetests.txt 2>/dev/null || echo 0
metrics: identity = sh: cat var/j203-tools/identity.txt 2>/dev/null || echo 0
metrics: sd = sh: cat var/j203-tools/seat-diff.json 2>/dev/null || echo '{"ok":0}'
metrics: dd = sh: cat var/j203-tools/datadir.json 2>/dev/null || echo '{"ok":0}'
metrics: pc = sh: cat var/j203-tools/plan-check.json 2>/dev/null || echo '{"ok":0,"expectOk":0,"decisions":0,"shapeOk":0}'
metrics: rt = sh: cat var/j203-tools/read-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0}'
metrics: p = sh: cat var/j203-tools/pilot.json 2>/dev/null || echo '{"baseline":0,"sameGame":0,"listingAtD":0,"units":0,"unitsOk":-1,"diverged":-1,"rowsHere":0,"scored":0,"scoresValid":0,"otherOptionRows":-1,"randomRows":-1,"atlasJson":0,"problems":-1,"leaks":-1}'
check: merged == 1
check: lane >= 1
check: selftest == 1
check: nodetests == 1
check: identity == 1
check: sd.ok == 1
check: dd.ok == 1
check: pc.ok == 1
check: pc.expectOk == 1
check: pc.decisions == 160
check: pc.shapeOk == 160
check: rt.ok == 1
check: rt.cases == 14
check: data_free_gb >= 20
check: p.baseline == 1
check: p.sameGame == 1
check: p.listingAtD == 1
check: p.units >= 1
check: p.unitsOk == p.units
check: p.diverged == 0
check: p.rowsHere == 10
check: p.scored >= 9
check: p.scoresValid == 1
check: p.otherOptionRows == 0
check: p.randomRows == 0
check: p.atlasJson == 1
check: p.leaks == 0

The pilot asks only whether anything is broken:
- `merged`, `lane`, `selftest`, `nodetests`: the pinned commit is on origin/main and carries D524's `--only` lane, whose
  self-test leg and tests pass with the atlas's existing ones;
- `identity` and `sd.ok`: the Forge, search and explore seats play the golden's four games, and nothing under
  `bridge/src` or `CubeLab.java` changed since J193's pin but D516's `Config.java`, the search seat's six files (behind a
  `rollout` key the atlas never passes) and the self-test;
- `dd.ok`: the data folder is absent (now made) or holds only J203's own files;
- `pc`: the embedded plan is 160 lines, every line has its set's shape, its counts and sha256 are the ones ingest.py
  wrote into drive.py's `EXPECT`, and every branched decision sits on a night folder whose seed, deck bytes and listing at
  d are the ones the night played (`pc.ok` holds all of it);
- `rt`: the reader gives the right readings on fourteen synthetic sets (judges better and Forge above the second: SHOWN
  and CONTROL HOLDS; the reverse: NOT SHOWN and CONTROL FAILS; no difference; all ties; better on the random map only;
  36 of 40 valid still reads and 35 is INCOMPLETE while the control reads; a set under 30 planned is INCOMPLETE; an errored
  row is no score; a drifted spine excluded and named; two different seconds averaged; splits never read; atlas problems
  counted and never deciding; the whole-sample gain);
- `p` (D511's check and the lane's restriction on a real spine): the baseline is the night's game, its listing at d12 the
  night's, the unit replays without divergence, exactly 10 Forge rows of options 0 and 3 and no other, at least 9 scored
  with values in {0, 0.5, 1}, atlas.json written, no leak.

Read, not checked: `p.problems` (information, as in the readings: J200's one problem was a BranchTimeout inside an engine
step, not a broken position), `p.nightSame` of `p.nightCells` (expected 10 of 10: the same position, the same seeds) and
`p.means`.

## Commands
cores: 7
```bash
# set i: every spine with a set-i decision (its set-ii decisions ride along), longest first
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J203: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
test -f var/j203-tools/drive.py && test -f var/j203-tools/plan.jsonl
python3 -I var/j203-tools/drive.py run var/j203-tools/plan.jsonl /home/justin-a/code/lab/data i {workers}
```
cores: 7
```bash
# set ii only: the spines whose every branched decision is a control one
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J203: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -I var/j203-tools/drive.py run var/j203-tools/plan.jsonl /home/justin-a/code/lab/data ii {workers}
```
cores: 1
clean: var/j203/read.json var/j203/verdict.json var/j203/report.md
```bash
# the pre-registered readings, the reads beside them and report.md (numbers only; the PC session writes the summary)
python3 -I var/j203-tools/read.py var/j203-tools/plan.jsonl /home/justin-a/code/lab/data/lab-j203 /home/justin-a/code/lab/data var/j203/read.json --boot 10000 --seed 203 --slim var/j203/verdict.json --report var/j203/report.md
cat var/j203/report.md
```
check: v.written == 1
check: v.complete == 1
check: v.shown + v.notShown + v.inconclusive == 1
check: v.shown == 0 or (v.forge.shareLo > 0.5 and v.forge.gainLo > 0)
check: v.notShown == 0 or (v.shown == 0 and (v.forge.shareHi < 0.5 or v.forge.gainHi < 0))
check: v.controlComplete == 0 or v.controlHolds + v.controlFails + v.controlInconclusive == 1
check: v.controlHolds == 0 or (v.control.shareLo > 0.5 and v.control.gainLo > 0)
check: v.controlFails == 0 or (v.controlHolds == 0 and (v.control.shareHi < 0.5 or v.control.gainHi < 0))
check: v.checks.leaks == 0

The checks hold the verdict file to the rule (exactly one primary reading and each reading's own condition; exactly one
control reading when set ii is complete) and the run to one guarantee: no leak. Any reading passes them; a reading is not
a failure. `v.complete` fails the job when set i is INCOMPLETE: then there is no verdict and the morning read names what
was excluded (`v.excluded`) and why. **What J200 checked and this job does not, on purpose:** `v.checks.problems == 0`
and `replay_diverged == 0`. An atlas problem (J200's one: 9 of 40 Forge branches of J188 s10 d38 hit a BranchTimeout
inside one engine step) and a replay divergence are already handled by the validity conditions, which exclude the
decisions they touch and name them; as gates they failed J200 on data that stood. Both are reported beside the readings
(`v.checks`, `v.excluded`, the metrics), and the summary must say any non-zero count.

## Abort if
abort: branches >= 400 and branch_errors > branches / 10

Engine trouble only: past 400 Forge rows, the job stops if more than one in ten carries an error (J200: 15 errors in
8,840). Nothing stops it on a result.

## Report
collect: var/j203/verdict.json
collect: var/j203/read.json
collect: var/j203/report.md
collect: /home/justin-a/code/lab/data/lab-j203/exits.txt
collect: /home/justin-a/code/lab/data/lab-j203/spine-times.txt

`report.md` is the job's own numbers. The PC session writes `summary.md` from it:
- **the two readings under the rule**: set i's KNOWLEDGE SHOWN, NOT SHOWN or INCONCLUSIVE (or INCOMPLETE) with the share
  (better / worse / tied, the share of untied decisions and its interval) and the gain with its interval; set ii's
  CONTROL HOLDS, FAILS or INCONCLUSIVE the same way; and what the pair decides in this file's words (`decides:`). Never
  write "no effect" or "the judge knows nothing" for an interval that includes 0;
- **the whole sample**: each judge's agreement with Forge and with the other, the split count, the whole gain and set
  i's gain minus the control's, beside J200's 82 (share 0.642, gain +0.050);
- **J200's population inside this one**: set i's confident rows against the rest (the by-status rows), and the random
  map beside the Forge map with the Spearman correlation;
- **where it came from**: by kind, live decisions, both judges at confidence 3, and the five largest gains and losses of
  each set with both judges' one-line reasons (llm-judge3's `picks.jsonl`);
- **the machinery**: valid decisions and what was excluded and why, the baselines that were the night's game, the
  reproduction of the night's Forge rows, errors, timeouts, the turn cap's draws, the atlas's problems and frame-log
  failures (information), worker-hours and the walls from `spine-times.txt`.

Never pool these Forge rows with a night's: they are a measurement of two or three options at chosen decisions, not
labels.
