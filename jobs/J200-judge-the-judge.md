id: J200
title: Judge the judge -- does the language model's pick beat Forge's under STRONG continuation? The 82 move-atlas decisions (v1's confident rows) where both blind judges of round 2 (the board shown) picked the same option and it is not Forge's option 0, each played on D451's Forge map (Forge's AI on both seats, 40 branches an option, D498's redeal, D511's replay of the night's recorded game) for exactly two options, Forge's and the judges'; the 24 split decisions beside them as information; a pre-registered reading: KNOWLEDGE SHOWN, NOT SHOWN or INCONCLUSIVE. Needs the `--only` lane first (an atlas spine branched at given decisions and options)
public_title: Judge the judge: language model picks on the Forge map
public_est: ~3 h (range 2-5 h)
public_decides: Whether language model picks beat Forge AI choices when Forge plays on
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2.7
repos: mtg-table@2ffb65fed00aebfda7647f91af824389895d6594 (main after 2026-11-08's merges and the `--only` lane's merge; on origin/main. Since J193's pin 1d0d18f3 the atlas seat's code is J193's: `git diff --numstat 1d0d18f3 <pin> -- bridge/src tools/cubelab/CubeLab.java` is exactly eight lines, measured at the D524 merge 2ffb65fe on 2026-11-08: `bridge/src/mtgtable/Config.java` 8/1 (D516: a leading `~/` in config.json's forgeJar), `bridge/src/mtgtable/ai/DecisionSelfTest.java` 255/0 (self-tests), and D523's six search-seat files (`ExploreMath` 20/0, `Explorer` 94/1, `RolloutController` 103/0, `RolloutGuards` 440/0, `SearchConfig` 29/5, `SearchPolicy` 65/3), which are reached only through a `rollout` key no atlas job line passes; the atlas's random seat is untouched (D523 point 6) and the seat-identity golden is byte-for-byte J193's; the lane changes tools/cubelab's atlas.ts, atlascuts.ts and cli.ts behind a flag that is off by default. The pilot checks the numstat and the seat identity)
decides: whether the outside-knowledge direction gets a design. KNOWLEDGE SHOWN (the judges' option is better under Forge continuation in a share of the untied decisions whose 95% lower end is above 0.5, AND the mean value gain, judges' option minus Forge's, has a 95% lower end above 0): a language model as candidate ranker or rollout policy, distilled for the nights, gets a design -- a lane with its own decision, never this job's; nothing in the seat or the atlas changes here. NOT SHOWN (the share's upper end below 0.5, or the gain's upper end below 0): the random/self-play direction alone; the outside-knowledge direction is closed for this population of decisions. INCONCLUSIVE (anything else): no design on this evidence; the random/self-play direction proceeds as the default and the outside-knowledge question stays open only for a new, larger set of judged decisions, never by re-reading these 82 (the owner may decide otherwise at the read). Round 2's 44% hit rate on the random map decides nothing either way: that map rewards chaos (the all-in attack) and punishes sound sequencing (pass the first main phase to attack, then cast), because everything after the forced option is played at random
hypothesis: information only, never read by a check. **What is already known on these decisions.** 12 of the 82 sit on the nights' Forge-map spines and already have both options' Forge maps at 40 branches (the release's rows): the judges' option is better on 6, worse on 2 and tied on 4, a mean gain of +0.005 [-0.070, +0.053] (this job's reader, 500-4,000-draw cluster bootstrap over their 8 spines); on the random map the same 12 read 12 better / 0 worse, +0.137 [+0.089, +0.173], and the per-decision rank correlation of the random-map gain with the Forge-map gain is 0.14. Round 2's own Forge-map read (24 rows, every confident row with a Forge map): the judges' picks 0.560 and 0.558 mean value against 0.557 for option 0 and 0.561 for a uniform pick. **What 82 decisions can see.** Resampling those 12 decisions' branch vectors to 82 decisions on the 46 spines gives a gain interval about +-0.023 wide on each side and a share interval about +-0.13: KNOWLEDGE SHOWN needs a true mean gain of about +0.03 or more (about one branch game in 40, on average, at every decision) with most untied decisions going the judges' way; NOT SHOWN needs a true loss of about -0.025; the 12's point (+0.005) reads INCONCLUSIVE. So INCONCLUSIVE is the likeliest reading and is not "no knowledge"; an interval that includes 0 is never "no effect". The random map's side will read strongly for the judges whatever the truth: these rows were chosen (the confident filter) because some option beat option 0 there, and the judges' option is the random map's best on 59 of the 82
rule: written 2026-11-08 before any J200 branch game was played, word for word: "On the valid tier-1 decisions, the SHARE is the decisions where the judges' option's Forge-map mean beats Forge's option 0's over decisions where they differ (ties excluded and counted), and the GAIN is the mean over all valid decisions of (judges' option's Forge-map mean - option 0's), each mean over the branch indices where both options have a score. Both carry a 95% interval from a two-level cluster bootstrap, 10,000 draws, seed 200: spines resampled with replacement, then each drawn decision's paired branch indices resampled with replacement. KNOWLEDGE SHOWN if shareLo > 0.5 and gainLo > 0. NOT SHOWN if shareHi < 0.5 or gainHi < 0. Otherwise INCONCLUSIVE. Read only when at least 74 of the 82 tier-1 decisions are valid; else INCOMPLETE, no verdict." A decision is VALID when J200's baseline game lists, decision for decision, what the night's listed (tokens, kind and turn: the same game, D511), its listing at d is the plan's tokens, every Forge unit of the decision finished with no replay divergence, and it has at least 30 paired Forge branches. A branch scores as the atlas scores it (win 1, draw or the turn cap or a timeout between steps 0.5, loss 0; D478); a row with an error or an unavailable option is no score (D470). The two readings cannot both hold (SHOWN implies shareHi > 0.5 and gainHi > 0); a share with no untied decision in a draw leaves that draw out of the share's interval (counted). The share's interval carries each decision's own branch noise, so a decision won by one branch game in 40 counts close to a coin flip and the interval can sit below its point; that is the rule, not a defect. Beside the reading, deciding nothing: the same share and gain on the random map (the night's rows of the same decisions and option pairs), by kind, on live decisions (either option's Forge mean strictly between 0.05 and 0.95), on the decisions both judges gave confidence 3, the per-decision Spearman correlation of the random-map gain with the Forge-map gain, the reproduction of the night's Forge rows on the decisions the night mapped (expected identical: the same position, the same branch seeds), and tier 2 (each judge's non-0 pick against option 0, and the two judges' picks against each other where both are non-0), all with the same bootstrap at 2,000 draws. All of it is computed by var/j200-tools/read.py exactly as written in the pilot
followup: morning-read
est: ~3 h at 7 workers (an estimate; range 2-5 h). 8,840 Forge-map branch games (tier 1: 82 decisions x 2 options x 40 = 6,560; tier 2: 15 x 2 x 40 + 9 x 3 x 40 = 2,280), ~9.9 worker-hours of branch games (7.9 and 1.9, including the unit replays), estimated per decision from its own Forge rows where the night had them and otherwise 1.3x its random rows' mean (the release's 14,320 Forge rows average 4.07 s, median 1.55 s, 95th percentile 14.9 s, and run 1.24-1.35x the random rows of the same bands; a unit's wall is its branches' ms plus a median 2.9 s of replay). Over that: 53 spine commands, each one baseline game (4-42 s), seven JVM boots and the tail of its last units, and the checks (~13 ms a frame log at 7). Longest spine J193's s07 (4 decisions, ~65 worker-min). Pilot ~15 min (the build, atlas-selftest, the node tests, seat-identity, the readers' self-tests, one decision at 2 x 5 branches). Disk ~3 GB on /home/justin-a/code/lab/data
resumable: yes
timeout: 7h
progress: lines /home/justin-a/code/lab/data/lab-j200/J1*-b-s*/phaseB/branches.jsonl of 8840
metrics: branches = lines /home/justin-a/code/lab/data/lab-j200/J1*-b-s*/phaseB/branches.jsonl
metrics: branch_errors = count /home/justin-a/code/lab/data/lab-j200/J1*-b-s*/phaseB/branches.jsonl "\"error\":\""
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j200/J1*-b-s*/phaseB/branches.jsonl "\"engineError\":true"
metrics: branch_timeouts = count /home/justin-a/code/lab/data/lab-j200/J1*-b-s*/phaseB/branches.jsonl "\"timedOut\":true"
metrics: unit_errors = count /home/justin-a/code/lab/data/lab-j200/J1*-b-s*/phaseB/units.jsonl "\"ok\":false"
metrics: replay_diverged = count /home/justin-a/code/lab/data/lab-j200/J1*-b-s*/phaseB/units.jsonl "replay diverged"
metrics: spines_done = sh: ls -d /home/justin-a/code/lab/data/lab-j200/J1*-b-s*/atlas.json 2>/dev/null | wc -l
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: v = sh: cat var/j200/verdict.json 2>/dev/null || echo '{"written":0,"valid":0,"complete":0,"shown":0,"notShown":0,"inconclusive":0,"forge":{},"random":{},"checks":{"problems":-1,"leaks":-1}}'
headline: branches, spines_done, branch_errors, branch_timeouts, replay_diverged, v.valid, v.forge.wins, v.forge.losses, v.forge.ties, v.forge.share, v.forge.shareLo, v.forge.shareHi, v.forge.gain, v.forge.gainLo, v.forge.gainHi, v.random.share, v.random.gain, v.shown, v.notShown, v.inconclusive

**Why this job.** Two rounds of blind judging (2026-11-08; Claude Opus subagents, two per decision, never told which
option was Forge's or any value) put the move atlas v1's 154 confident decisions in front of a language model. Round 1
saw the decklists and the options; round 2 also saw the board as seat A saw it, reconstructed from the night's frame log
and verified field by field on all 154. On the random map the judges hit the best option 42-45% of the time against
26% for a uniform pick, and their pick is worth +0.05 over a uniform one (round 2: +0.047 [0.026, 0.069] and +0.051
[0.031, 0.071]). But the random map is the wrong yardstick for this question. It plays everything after the forced
option at random, so it rewards the all-in attack (a random defender blocks badly and swings back badly; "always the
largest attack" hits 32 of 44 attacks) and punishes sound sequencing: in round 2, with the board visible, the judges
passed the first main phase "to attack first and cast after" and lost 9 and 6 hits for it (McNemar p = 0.004 and 0.03),
because the random continuation never makes that attack. On the 24 confident rows that have a Forge map the judges,
option 0 and a uniform pick are within 0.004 of each other in value: nothing can be concluded from 24. The yardstick we
trust most is the Forge map: Forge's AI on both seats, 40 branches an option, every option forced on a fork of the real
position with what seat A cannot see redealt (D451 phase B, D498). The atlas already knows how to play it at a chosen
decision of a recorded spine. This job plays it for the decisions where the judges disagree with Forge, for exactly the
two options that matter.

**What it does not say.** Its scope is the 82: confident rows of D508's population (an option beat option 0 on the
random map) where both judges agreed against Forge; not every decision, and not the 48 where the judges agreed with
Forge. Forge's AI is the continuation for BOTH seats after the forced option, so a judge's plan ("pass now, attack,
then cast") is carried out only where Forge's AI would carry it out; that is a stronger stand-in for good play than
random play, not a perfect one. The judge never saw an activated ability's text, B's hand or B's open mana colours,
and an option can be unpayable (round 2's Uro). A KNOWLEDGE SHOWN is evidence that the model's priors add something
Forge lacks on these decisions; it ranks no options anywhere and changes nothing.

## The disagreement set (from round 2's picks.jsonl, joined to v1's labels)

| set | decisions | kinds (p / a / b) | spines | options played | branch games |
|---|---|---|---|---|---|
| **tier 1**: both judges, the same option, not option 0 | **82** | 62 / 13 / 7 | 46 | 0 and the judges' | 6,560 |
| tier 2: the judges split, as information | 24 | 15 / 8 / 1 | (18, 7 of them only tier 2) | 0, J1's, J2's (15 with one judge on 0: two options; 9 with two different non-0 picks: three) | 2,280 |
| not played: both judges on option 0 | 48 | | | | 0 |

Tier 1 by night: J186 12, J187 16, J188 12, J190 14, J191 12, J193 16; by band: powered 26, peasant 23, legacy 21,
pauper 12. The judges' option is the random map's best on 59 of the 82. Tier 1 is the only set the rule reads; tier 2
rides along on the spines it shares with tier 1 (one baseline a spine) and plays its 7 spines of its own last.

**Checked against the nights on 2026-11-08 (read only), and again by the pilot:** every one of the 106 decisions sits
on a spine folder of its night under `/home/justin-a/code/lab/data/lab-j18{6,7,8}` and `lab-j19{0,1,3}` (53
folders); each folder's `plan.json` seed is the label's `spineSeed`; both deck files hash to the `deckSha256` its
`phaseB/schedule.jsonl` header recorded when the night played them (53 of 53); and its `phaseB/baseline.json` lists, at
the label's `d`, exactly the label's option tokens, kind and turn (106 of 106). The plan is embedded below; its
`estSec` is each decision's estimated Forge-map seconds, used only to order the spines.

## How a decision is played: one atlas spine, given decisions, given options

Per spine folder, one `tools/cubelab.sh atlas` on the night's own deck files and seed, with J177's unit settings and
the Forge map only:

    --phase b --turn-cap 40 --options 8 --branch-random 0 --branch-forge 40 --chunk 5 --branch-timeout 120
    --unit-timeout 30 --leak-checks 1 --checks-parallel {workers} --jobs {workers} --only <file> --out var/lab-j200/<night>-<folder>

- **The baseline is played again** (Forge's Default on both seats, recorded, from the seed) and the reader requires
  its listing to be the night's, decision for decision: the same game, so `d` is the same position. Since J193's pin
  nothing the baseline runs has changed (`repos:`); J186's and J187's pins predate D510 (record-only) and D511 (the
  replay's sink), whose own measurement found every succeeded unit's position and every branch unchanged.
- **Each unit replays to d** through D511's sink (it is the recorded game) and checks the listing at d against the
  baseline's; a divergence fails the unit and the reader excludes the decision.
- **Each branch** forces its option on a fork, redeals what seat A cannot see (D498, canonical), reseeds `MyRandom`
  with branch i's seed, `Atlas.branchSeed(seed, d, i)`, the same for every option (common random numbers, so the two
  options are paired by branch index), and plays to the end with Forge's AI on both seats (`--branch-forge`), a fresh
  controller on every seat of the copy.
- **chunk 5**: a unit is the decision's 2 (or 3) options x 5 branch indices, eight units a decision, so seven workers
  stay busy on a spine of one decision; a unit is at most 15 branch games of at most 120 s, inside its 30 minutes.
- **The checks are the atlas's own** (rows ids, the redaction checker over every frame log, the guardrails, the
  leak check on branch 0): atlas.json's `checks`.

**The atlas cannot do this today: the lane `--only` comes first.** `tools/cubelab.sh atlas` chooses its decisions
itself (`--decisions all|N`, spread by `pickDecisions`, with D480's `--min-options` and screen) and plays every
listed option of each; there is no flag for a decision list or an option subset. The bridge already plays a subset:
`Atlas.Unit.options` (D480, early stopping's survivors) makes the hook skip every other option, and
`unitJob` forwards a unit's `options`. What is missing is the TypeScript half that sets it from a list. Two
workarounds were rejected: `--decisions all --branch-random 0 --branch-forge 40` plays every option of every listed
decision (~60 decisions x ~4 options a spine, ~30x the cost), and a hand-written `schedule.jsonl` (AtlasSchedule
replays its `pick` lines, so it can choose the decisions, but options can be dropped only by a `stop` line at a
random-map checkpoint, so every option would still play a chunk of random branches, and it depends on the plan hash
and on a frozen path's internal format). **The lane, `pc/atlas-only`, about half a day, its own decision (D524,
reserved with `node tools/decisions.mjs next`; D522 is free on 2026-11-08):**
1. `--only <file>`: a JSON array of `{d, options, tokens?}` -- `d` an index into the baseline's listing, `options` two
   or more distinct option indices below its k, `tokens` the listing the caller expects at d.
2. Phase B branches exactly those decisions (`why: "only"` on each pick), every unit of a decision carrying its sorted
   `options`, on whichever maps `--branch-random` and `--branch-forge` ask for; `--branch-random 0` allowed with it.
3. Before any unit: every entry's d exists in the baseline listing and, when `tokens` is given, lists exactly those
   tokens; otherwise the atlas exits 4 naming d and both token lists, with no unit played and `baseline.json` kept
   (this job's reader then reads the drift itself).
4. Refused (exit 2) with `--decisions`, `--screen`, `--early-stop`, `--futility` or `--min-options` above 1: it is a
   measurement of given options, not a schedule.
5. `plan.json` and the schedule header carry `only` (its entries and their sha256), so a resume under another list is
   refused like a resume under other cuts.
6. atlas.json and atlas.md are written for such a spine: an option not played has n 0; with `--branch-random 0` a
   decision reads its Forge map alone (complete on it) and nothing divides by zero; the checks run unchanged.
7. Without `--only` nothing changes, byte for byte: the cut tests, atlas-selftest's legs and seat-identity pass
   unchanged. atlas.ts and atlascuts.ts are D509 frozen paths; the argument is that the flag is off by default, the
   bridge (`Atlas.Unit.options`, D480) is untouched and no unit job of a run without `--only` changes, and J200 is a
   measurement that pools with no night.
8. Tests: `web/test/cubelab-atlas-only.test.ts` (the picks and units from a list; each refusal; the drift exit), and
   an atlas-selftest leg on the committed D511 pair (`fixtures/cubelab/atlas-replay/`, seed 2552): `--only` at d30
   with two options and their tokens, `--branch-random 0 --branch-forge 2`, rows for exactly those options and
   indices 0-1 on the Forge map; a second run with a wrong token exits 4 with no unit line. The cube-lab guide's
   atlas section and `tools/cubelab/cli.ts`'s usage line name the flag.

This file is written assuming that lane, exactly as above.

## Where it writes

Every atlas command runs under `LAB_DATA_DIR=/home/justin-a/code/lab/data` with `--out var/lab-j200/<night>-<folder>`,
so J200's spines land in a NEW data folder, `/home/justin-a/code/lab/data/lab-j200/` (`J1*-b-s*` folders, the pilot's
`pilot-*` folder, `exits.txt`, `spine-times.txt`). The nights' folders (`lab-j186` ... `lab-j193`) are read only: their
`plan.json`, decks, `baseline.json`, `schedule.jsonl` header and `branches.jsonl`. The Forge homes
(`CUBELAB_HOME_ROOT=var/cubelab/homes-J200`), the job's scripts and plan (`var/j200-tools/`) and its outputs
(`var/j200/`) stay in the clone. No `clean:` on the data folder; nothing is deleted. A retry resumes: the driver skips a
spine whose atlas.json exists with exit 0 in `exits.txt`, and the atlas resumes a spine from its own `branches.jsonl`;
the atlas records no code version, so nothing of J200's may be resumed on another commit (the runner's retries check
out the pinned commit).

## Before posting -- the coordinator, by hand (nothing in this file does them)
1. **The lane is merged**: `pc/atlas-only` (D524) as specified above, with the full gate on its merge.
2. **The pin is written**: replace `2ffb65fed00aebfda7647f91af824389895d6594` in `repos:` with main's full sha after today's merges and the lane's,
   pushed to origin/main.
3. **The seat is J193's**: `git diff --numstat 1d0d18f3 <pin> -- bridge/src tools/cubelab/CubeLab.java` prints exactly
   the eight lines the pilot's `want` list names, measured on the D524 merge `2ffb65fe` on 2026-11-08: D516's
   `8 1 Config.java`, the self-test `255 0 DecisionSelfTest.java`, and D523's six search-seat files (`ExploreMath` 20/0,
   `Explorer` 94/1, `RolloutController` 103/0, `RolloutGuards` 440/0, `SearchConfig` 29/5, `SearchPolicy` 65/3). D523's
   D509 argument: `rollout=random` and `random-self` are reached only through a `rollout` key no atlas job line
   passes, `Config.randomSeat()` and a job line's random seat are not random-v2 (D523 point 6, held by its self-test),
   and the seat-identity golden `fixtures/cubelab/seat-identity.json` is byte-for-byte J193's (gate step 12m passes on
   the merge). Anything else under `bridge/src` since J193 is a seat change: write its D509 argument first, or the
   reproduction read and the baseline check will be the first to say so.
4. **The data folder**: `/home/justin-a/code/lab/data/lab-j200` absent or empty (the pilot creates it, and refuses one
   holding anything but J200's own files).
5. No `alone:` (no wall-clock budget: Forge's AI plays without a clock here) and no `after:`. It may run beside the art
   session's GPU queue; the runner's memory rule handles pressure per game.

## Pilot
About 15 minutes: the pin is merged; the build; the lane is there (its usage line and atlas-selftest with its new leg);
the atlas's node tests; seat-identity (the four games, the golden's); the seat's code since J193's pin; the plan
written and checked against the nights; the reader's self-test (eleven synthetic cases with known readings); then one
decision, J193's s01 d12 (pauper, options 0 and 3, the night's Forge map ~1.2 s a branch), on the Forge map at 5
branches an option: its baseline is the night's game decision for decision, its unit replays without divergence, it
writes exactly 10 Forge rows of options 0 and 3 and nothing else, every score parses, and its checks are clean.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j200-merged.txt || echo 0 > var/j200-merged.txt
cat var/j200-merged.txt
./bridge/build.sh
mkdir -p var/j200-tools var/j200
# the lane (D524): the usage line names --only, and atlas-selftest (with the lane's leg) passes
grep -c -- '--only <file>' tools/cubelab/cli.ts > var/j200-tools/lane.txt || echo 0 > var/j200-tools/lane.txt
env -u LAB_DATA_DIR tools/cubelab.sh atlas-selftest --jobs 3 && echo 1 > var/j200-tools/selftest.txt || echo 0 > var/j200-tools/selftest.txt
env -u LAB_DATA_DIR node --test web/test/cubelab-atlas.test.ts web/test/cubelab-atlas-cuts.test.ts web/test/cubelab-atlas-resume.test.ts web/test/cubelab-atlas-only.test.ts && echo 1 > var/j200-tools/nodetests.txt || echo 0 > var/j200-tools/nodetests.txt
env -u LAB_DATA_DIR tools/cubelab.sh seat-identity --jobs 3 && echo 1 > var/j200-tools/identity.txt || echo 0 > var/j200-tools/identity.txt
# the seat since J193's pin: D516's Config.java, D523's search-seat files (rollout=random*, reached only through a `rollout` key the atlas never passes; the atlas's random seat untouched, D523 point 6) and the self-test
git diff --numstat 1d0d18f364005651db78ca31c07393f14265daf7 HEAD -- bridge/src tools/cubelab/CubeLab.java > var/j200-tools/seat-diff.txt || true
python3 -I -c 'import json; L=[l.split() for l in open("var/j200-tools/seat-diff.txt") if l.strip()]; want=[["8","1","bridge/src/mtgtable/Config.java"],["255","0","bridge/src/mtgtable/ai/DecisionSelfTest.java"],["20","0","bridge/src/mtgtable/ai/ExploreMath.java"],["94","1","bridge/src/mtgtable/ai/Explorer.java"],["103","0","bridge/src/mtgtable/ai/RolloutController.java"],["440","0","bridge/src/mtgtable/ai/RolloutGuards.java"],["29","5","bridge/src/mtgtable/ai/SearchConfig.java"],["65","3","bridge/src/mtgtable/ai/SearchPolicy.java"]]; r={"lines":L,"ok":1 if L==want else 0}; json.dump(r,open("var/j200-tools/seat-diff.json","w")); print(json.dumps(r))'
# the data folder: absent or J200's own
python3 -I -c 'import os, re, json; d="/home/justin-a/code/lab/data/lab-j200"; xs=os.listdir(d) if os.path.isdir(d) else []; bad=[x for x in xs if not re.match(r"^(J1\d\d-b-s\d\d-[a-z]+-\d+|pilot-J193-b-s01-pauper-3785|exits\.txt|spine-times\.txt)$", x)]; os.makedirs(d, exist_ok=True); r={"ok":0 if bad else 1,"entries":len(xs),"bad":bad[:10]}; json.dump(r,open("var/j200-tools/datadir.json","w")); print(json.dumps(r))'
```
```bash
# the plan: 106 decisions (82 tier 1, 24 tier 2) from round 2's picks.jsonl joined to move-atlas-v1's labels
cat > var/j200-tools/plan.jsonl <<'J200EOF'
{"key":"J186/s02/d5","tier":1,"night":"J186","folder":"b-s02-peasant-2541","d":5,"kind":"p","turn":8,"options":[0,4],"j1":4,"j2":4,"seed":2541,"tokens":["cast:1","pass","cast:19","cast:20","cast:28"],"estSec":623,"c1":2,"c2":2}
{"key":"J186/s02/d16","tier":1,"night":"J186","folder":"b-s02-peasant-2541","d":16,"kind":"b","turn":13,"options":[0,2],"j1":2,"j2":2,"seed":2541,"tokens":["block:none","block:27>96","block:27>46"],"estSec":477,"c1":2,"c2":3}
{"key":"J186/s02/d21","tier":1,"night":"J186","folder":"b-s02-peasant-2541","d":21,"kind":"p","turn":16,"options":[0,2],"j1":2,"j2":2,"seed":2541,"tokens":["cast:5","pass","cast:35"],"estSec":544,"c1":2,"c2":2}
{"key":"J186/s03/d18","tier":1,"night":"J186","folder":"b-s03-legacy-2542","d":18,"kind":"a","turn":15,"options":[0,1],"j1":1,"j2":1,"seed":2542,"tokens":["attack:none","attack:36"],"estSec":117,"c1":1,"c2":2}
{"key":"J186/s06/d1","tier":2,"night":"J186","folder":"b-s06-peasant-2545","d":1,"kind":"p","turn":6,"options":[0,3,6],"j1":3,"j2":6,"seed":2545,"tokens":["cast:39","pass","cast:16","cast:3","cast:22","cast:10","cast:4"],"estSec":365,"c1":1,"c2":2}
{"key":"J186/s06/d4","tier":2,"night":"J186","folder":"b-s06-peasant-2545","d":4,"kind":"p","turn":8,"options":[0,2,6],"j1":2,"j2":6,"seed":2545,"tokens":["cast:16","pass","cast:3","cast:22","cast:10","cast:4","cast:25"],"estSec":297,"c1":3,"c2":2}
{"key":"J186/s06/d5","tier":1,"night":"J186","folder":"b-s06-peasant-2545","d":5,"kind":"p","turn":10,"options":[0,2],"j1":2,"j2":2,"seed":2545,"tokens":["pass","cast:1","cast:3","cast:22","cast:10","cast:4","cast:25"],"estSec":184,"c1":2,"c2":2}
{"key":"J186/s06/d11","tier":1,"night":"J186","folder":"b-s06-peasant-2545","d":11,"kind":"b","turn":13,"options":[0,2],"j1":2,"j2":2,"seed":2545,"tokens":["block:3>78,22>78","block:none","block:22>78","block:3>78"],"estSec":128,"c1":2,"c2":2}
{"key":"J186/s07/d6","tier":1,"night":"J186","folder":"b-s07-legacy-2546","d":6,"kind":"p","turn":7,"options":[0,1],"j1":1,"j2":1,"seed":2546,"tokens":["pass","cast:4"],"estSec":103,"c1":3,"c2":3}
{"key":"J186/s08/d3","tier":1,"night":"J186","folder":"b-s08-powered-2547","d":3,"kind":"p","turn":14,"options":[0,1],"j1":1,"j2":1,"seed":2547,"tokens":["pass","cast:21","cast:29"],"estSec":269,"c1":2,"c2":2}
{"key":"J186/s09/d15","tier":2,"night":"J186","folder":"b-s09-pauper-2548","d":15,"kind":"a","turn":11,"options":[0,2],"j1":2,"j2":0,"seed":2548,"tokens":["attack:10,30","attack:none","attack:30","attack:10"],"estSec":220,"c1":1,"c2":2}
{"key":"J186/s10/d18","tier":1,"night":"J186","folder":"b-s10-peasant-2549","d":18,"kind":"b","turn":15,"options":[0,1],"j1":1,"j2":1,"seed":2549,"tokens":["block:none","block:40>63"],"estSec":210,"c1":3,"c2":2}
{"key":"J186/s10/d23","tier":2,"night":"J186","folder":"b-s10-peasant-2549","d":23,"kind":"b","turn":17,"options":[0,1],"j1":1,"j2":0,"seed":2549,"tokens":["block:none","block:40>63"],"estSec":214,"c1":1,"c2":2}
{"key":"J186/s12/d5","tier":1,"night":"J186","folder":"b-s12-powered-2551","d":5,"kind":"p","turn":10,"options":[0,4],"j1":4,"j2":4,"seed":2551,"tokens":["pass","cast:13","cast:21","cast:10","cast:4","cast:23"],"estSec":272,"c1":2,"c2":2}
{"key":"J186/s12/d8","tier":1,"night":"J186","folder":"b-s12-powered-2551","d":8,"kind":"p","turn":12,"options":[0,5],"j1":5,"j2":5,"seed":2551,"tokens":["pass","cast:13","cast:21","cast:10","cast:23","cast:15","cast:37"],"estSec":316,"c1":3,"c2":2}
{"key":"J186/s12/d11","tier":1,"night":"J186","folder":"b-s12-powered-2551","d":11,"kind":"p","turn":12,"options":[0,2],"j1":2,"j2":2,"seed":2551,"tokens":["cast:13","pass","cast:15","cast:37"],"estSec":327,"c1":2,"c2":2}
{"key":"J187/s02/d29","tier":1,"night":"J187","folder":"b-s02-peasant-2554","d":29,"kind":"a","turn":17,"options":[0,1],"j1":1,"j2":1,"seed":2554,"tokens":["attack:none","attack:5,10,14,231","attack:10","attack:231","attack:5","attack:14"],"estSec":275,"c1":2,"c2":2}
{"key":"J187/s02/d32","tier":1,"night":"J187","folder":"b-s02-peasant-2554","d":32,"kind":"a","turn":19,"options":[0,1],"j1":1,"j2":1,"seed":2554,"tokens":["attack:none","attack:5,8,10,14","attack:10","attack:5","attack:14","attack:8"],"estSec":228,"c1":2,"c2":3}
{"key":"J187/s02/d33","tier":1,"night":"J187","folder":"b-s02-peasant-2554","d":33,"kind":"b","turn":20,"options":[0,1],"j1":1,"j2":1,"seed":2554,"tokens":["block:10>56","block:none","block:10>56,14>56"],"estSec":202,"c1":3,"c2":3}
{"key":"J187/s04/d8","tier":1,"night":"J187","folder":"b-s04-powered-2556","d":8,"kind":"p","turn":11,"options":[0,3],"j1":3,"j2":3,"seed":2556,"tokens":["cast:12","pass","cast:38","cast:40","cast:7"],"estSec":212,"c1":2,"c2":2}
{"key":"J187/s05/d19","tier":1,"night":"J187","folder":"b-s05-pauper-2557","d":19,"kind":"p","turn":18,"options":[0,1],"j1":1,"j2":1,"seed":2557,"tokens":["pass","cast:34","cast:24"],"estSec":599,"c1":2,"c2":2}
{"key":"J187/s05/d33","tier":2,"night":"J187","folder":"b-s05-pauper-2557","d":33,"kind":"a","turn":26,"options":[0,1,3],"j1":3,"j2":1,"seed":2557,"tokens":["attack:none","attack:29,30,34,40","attack:40","attack:34","attack:30","attack:29"],"estSec":513,"c1":2,"c2":2}
{"key":"J187/s05/d38","tier":2,"night":"J187","folder":"b-s05-pauper-2557","d":38,"kind":"a","turn":30,"options":[0,1,3],"j1":3,"j2":1,"seed":2557,"tokens":["attack:none","attack:2,29,30,34,40","attack:40","attack:34","attack:30","attack:29","attack:2"],"estSec":452,"c1":2,"c2":1}
{"key":"J187/s05/d44","tier":1,"night":"J187","folder":"b-s05-pauper-2557","d":44,"kind":"a","turn":34,"options":[0,1],"j1":1,"j2":1,"seed":2557,"tokens":["attack:none","attack:2,29,30,34,40,112","attack:40","attack:34","attack:30","attack:29","attack:2","attack:112"],"estSec":193,"c1":1,"c2":2}
{"key":"J187/s06/d8","tier":1,"night":"J187","folder":"b-s06-peasant-2558","d":8,"kind":"p","turn":7,"options":[0,2],"j1":2,"j2":2,"seed":2558,"tokens":["pass","cast:1","cast:35","cast:22"],"estSec":373,"c1":3,"c2":2}
{"key":"J187/s08/d0","tier":1,"night":"J187","folder":"b-s08-powered-2560","d":0,"kind":"p","turn":3,"options":[0,2],"j1":2,"j2":2,"seed":2560,"tokens":["pass","cast:1","cast:32"],"estSec":261,"c1":2,"c2":2}
{"key":"J187/s08/d6","tier":1,"night":"J187","folder":"b-s08-powered-2560","d":6,"kind":"p","turn":7,"options":[0,2],"j1":2,"j2":2,"seed":2560,"tokens":["pass","cast:8","cast:37"],"estSec":199,"c1":3,"c2":2}
{"key":"J187/s08/d16","tier":2,"night":"J187","folder":"b-s08-powered-2560","d":16,"kind":"p","turn":13,"options":[0,2],"j1":0,"j2":2,"seed":2560,"tokens":["activate:38#0","pass","cast:29","cast:8","cast:5"],"estSec":58,"c1":2,"c2":2}
{"key":"J187/s09/d0","tier":1,"night":"J187","folder":"b-s09-pauper-2561","d":0,"kind":"p","turn":2,"options":[0,2],"j1":2,"j2":2,"seed":2561,"tokens":["cast:13","pass","cast:4"],"estSec":599,"c1":2,"c2":2}
{"key":"J187/s10/d11","tier":2,"night":"J187","folder":"b-s10-peasant-2562","d":11,"kind":"a","turn":15,"options":[0,1,2],"j1":2,"j2":1,"seed":2562,"tokens":["attack:none","attack:8,11,18,103,117","attack:18","attack:8","attack:103","attack:11","attack:117"],"estSec":268,"c1":1,"c2":1}
{"key":"J187/s11/d6","tier":1,"night":"J187","folder":"b-s11-legacy-2563","d":6,"kind":"p","turn":12,"options":[0,3],"j1":3,"j2":3,"seed":2563,"tokens":["cast:20","pass","cast:31","cast:17","cast:38"],"estSec":385,"c1":2,"c2":1}
{"key":"J187/s11/d9","tier":1,"night":"J187","folder":"b-s11-legacy-2563","d":9,"kind":"p","turn":14,"options":[0,2],"j1":2,"j2":2,"seed":2563,"tokens":["pass","cast:31","cast:17","cast:38"],"estSec":335,"c1":2,"c2":1}
{"key":"J187/s11/d11","tier":1,"night":"J187","folder":"b-s11-legacy-2563","d":11,"kind":"p","turn":16,"options":[0,1],"j1":1,"j2":1,"seed":2563,"tokens":["pass","cast:31","cast:38","cast:16","cast:14"],"estSec":357,"c1":2,"c2":2}
{"key":"J187/s11/d15","tier":2,"night":"J187","folder":"b-s11-legacy-2563","d":15,"kind":"p","turn":18,"options":[0,1],"j1":0,"j2":1,"seed":2563,"tokens":["pass","cast:5"],"estSec":201,"c1":1,"c2":2}
{"key":"J187/s12/d0","tier":1,"night":"J187","folder":"b-s12-powered-2564","d":0,"kind":"p","turn":3,"options":[0,1],"j1":1,"j2":1,"seed":2564,"tokens":["pass","cast:33","cast:24","cast:27"],"estSec":198,"c1":2,"c2":2}
{"key":"J187/s12/d15","tier":1,"night":"J187","folder":"b-s12-powered-2564","d":15,"kind":"p","turn":11,"options":[0,1],"j1":1,"j2":1,"seed":2564,"tokens":["cast:31","pass","cast:1","cast:30","cast:5","cast:34","cast:32"],"estSec":27,"c1":3,"c2":2}
{"key":"J187/s13/d10","tier":1,"night":"J187","folder":"b-s13-pauper-2565","d":10,"kind":"b","turn":13,"options":[0,2],"j1":2,"j2":2,"seed":2565,"tokens":["block:none","block:4>48","block:4>78"],"estSec":75,"c1":2,"c2":2}
{"key":"J188/s02/d0","tier":1,"night":"J188","folder":"b-s02-peasant-2567","d":0,"kind":"p","turn":2,"options":[0,2],"j1":2,"j2":2,"seed":2567,"tokens":["cast:6","pass","cast:14"],"estSec":236,"c1":2,"c2":2}
{"key":"J188/s03/d14","tier":1,"night":"J188","folder":"b-s03-legacy-2568","d":14,"kind":"a","turn":15,"options":[0,1],"j1":1,"j2":1,"seed":2568,"tokens":["attack:none","attack:11,21","attack:21","attack:11"],"estSec":25,"c1":2,"c2":3}
{"key":"J188/s04/d0","tier":1,"night":"J188","folder":"b-s04-powered-2569","d":0,"kind":"p","turn":4,"options":[0,1],"j1":1,"j2":1,"seed":2569,"tokens":["pass","cast:24"],"estSec":252,"c1":3,"c2":3}
{"key":"J188/s07/d0","tier":1,"night":"J188","folder":"b-s07-legacy-2572","d":0,"kind":"p","turn":7,"options":[0,1],"j1":1,"j2":1,"seed":2572,"tokens":["pass","cast:27","cast:24","cast:20","cast:21"],"estSec":89,"c1":2,"c2":2}
{"key":"J188/s08/d3","tier":2,"night":"J188","folder":"b-s08-powered-2573","d":3,"kind":"p","turn":6,"options":[0,1],"j1":1,"j2":0,"seed":2573,"tokens":["pass","cast:39","cast:4"],"estSec":206,"c1":2,"c2":2}
{"key":"J188/s10/d6","tier":1,"night":"J188","folder":"b-s10-peasant-2575","d":6,"kind":"p","turn":8,"options":[0,1],"j1":1,"j2":1,"seed":2575,"tokens":["pass","cast:17","cast:34","cast:36"],"estSec":307,"c1":2,"c2":3}
{"key":"J188/s10/d14","tier":1,"night":"J188","folder":"b-s10-peasant-2575","d":14,"kind":"p","turn":12,"options":[0,1],"j1":1,"j2":1,"seed":2575,"tokens":["pass","cast:22","cast:36","cast:32","cast:35"],"estSec":218,"c1":2,"c2":2}
{"key":"J188/s10/d18","tier":1,"night":"J188","folder":"b-s10-peasant-2575","d":18,"kind":"p","turn":14,"options":[0,2],"j1":2,"j2":2,"seed":2575,"tokens":["pass","cast:36","cast:32","cast:35","cast:19"],"estSec":177,"c1":2,"c2":2}
{"key":"J188/s10/d36","tier":1,"night":"J188","folder":"b-s10-peasant-2575","d":36,"kind":"p","turn":22,"options":[0,4],"j1":4,"j2":4,"seed":2575,"tokens":["pass","cast:21","cast:39","cast:37","cast:18","cast:12"],"estSec":106,"c1":3,"c2":3}
{"key":"J188/s10/d38","tier":1,"night":"J188","folder":"b-s10-peasant-2575","d":38,"kind":"p","turn":22,"options":[0,3],"j1":3,"j2":3,"seed":2575,"tokens":["cast:37","pass","cast:21","cast:39","cast:12","cast:18"],"estSec":88,"c1":3,"c2":3}
{"key":"J188/s11/d3","tier":1,"night":"J188","folder":"b-s11-legacy-2576","d":3,"kind":"p","turn":3,"options":[0,2],"j1":2,"j2":2,"seed":2576,"tokens":["pass","cast:22","cast:38"],"estSec":514,"c1":3,"c2":3}
{"key":"J188/s12/d8","tier":1,"night":"J188","folder":"b-s12-powered-2577","d":8,"kind":"p","turn":8,"options":[0,1],"j1":1,"j2":1,"seed":2577,"tokens":["pass","cast:28","cast:17"],"estSec":171,"c1":2,"c2":3}
{"key":"J188/s12/d12","tier":1,"night":"J188","folder":"b-s12-powered-2577","d":12,"kind":"b","turn":9,"options":[0,6],"j1":6,"j2":6,"seed":2577,"tokens":["block:82>43,18>59,24>59","block:none","block:18>59,24>59","block:17>43,82>43,18>59,24>59","block:82>43,83>43,18>59,24>59","block:82>43,17>59,18>59,24>59","block:82>43,18>59,24>59,83>59"],"estSec":126,"c1":2,"c2":2}
{"key":"J190/s02/d7","tier":1,"night":"J190","folder":"b-s02-peasant-2918","d":7,"kind":"a","turn":9,"options":[0,1],"j1":1,"j2":1,"seed":2918,"tokens":["attack:none","attack:2,82,83,84","attack:2","attack:82","attack:83","attack:84"],"estSec":216,"c1":2,"c2":2}
{"key":"J190/s02/d19","tier":1,"night":"J190","folder":"b-s02-peasant-2918","d":19,"kind":"a","turn":15,"options":[0,2],"j1":2,"j2":2,"seed":2918,"tokens":["attack:7","attack:none","attack:2,7,82,83,84","attack:2,7","attack:7,82","attack:7,83","attack:7,84"],"estSec":33,"c1":2,"c2":2}
{"key":"J190/s03/d0","tier":1,"night":"J190","folder":"b-s03-legacy-2919","d":0,"kind":"p","turn":4,"options":[0,2],"j1":2,"j2":2,"seed":2919,"tokens":["pass","cast:18","cast:40","cast:10","cast:2"],"estSec":709,"c1":2,"c2":2}
{"key":"J190/s03/d2","tier":1,"night":"J190","folder":"b-s03-legacy-2919","d":2,"kind":"p","turn":6,"options":[0,3],"j1":3,"j2":3,"seed":2919,"tokens":["pass","cast:18","cast:10","cast:2","cast:2"],"estSec":659,"c1":3,"c2":2}
{"key":"J190/s03/d14","tier":1,"night":"J190","folder":"b-s03-legacy-2919","d":14,"kind":"p","turn":14,"options":[0,1],"j1":1,"j2":1,"seed":2919,"tokens":["cast:11","pass","cast:11"],"estSec":551,"c1":2,"c2":2}
{"key":"J190/s08/d0","tier":1,"night":"J190","folder":"b-s08-powered-2924","d":0,"kind":"p","turn":7,"options":[0,3],"j1":3,"j2":3,"seed":2924,"tokens":["cast:7","pass","cast:32","cast:1"],"estSec":219,"c1":2,"c2":2}
{"key":"J190/s08/d4","tier":1,"night":"J190","folder":"b-s08-powered-2924","d":4,"kind":"p","turn":11,"options":[0,1],"j1":1,"j2":1,"seed":2924,"tokens":["pass","cast:2","cast:32","cast:4"],"estSec":122,"c1":3,"c2":3}
{"key":"J190/s09/d0","tier":1,"night":"J190","folder":"b-s09-pauper-2925","d":0,"kind":"p","turn":2,"options":[0,3],"j1":3,"j2":3,"seed":2925,"tokens":["cast:11","pass","cast:39","cast:1"],"estSec":588,"c1":2,"c2":2}
{"key":"J190/s09/d41","tier":1,"night":"J190","folder":"b-s09-pauper-2925","d":41,"kind":"a","turn":26,"options":[0,1],"j1":1,"j2":1,"seed":2925,"tokens":["attack:1,19","attack:none","attack:1,10,12,19,39","attack:19","attack:1","attack:1,19,39","attack:1,10,19","attack:1,12,19"],"estSec":306,"c1":2,"c2":1}
{"key":"J190/s10/d5","tier":1,"night":"J190","folder":"b-s10-peasant-2926","d":5,"kind":"p","turn":7,"options":[0,1],"j1":1,"j2":1,"seed":2926,"tokens":["pass","cast:13","cast:1","cast:37","cast:17"],"estSec":268,"c1":2,"c2":2}
{"key":"J190/s10/d17","tier":1,"night":"J190","folder":"b-s10-peasant-2926","d":17,"kind":"p","turn":13,"options":[0,2],"j1":2,"j2":2,"seed":2926,"tokens":["cast:17","pass","cast:13","cast:37"],"estSec":303,"c1":2,"c2":2}
{"key":"J190/s10/d21","tier":1,"night":"J190","folder":"b-s10-peasant-2926","d":21,"kind":"p","turn":17,"options":[0,3],"j1":3,"j2":3,"seed":2926,"tokens":["pass","cast:13","cast:37","cast:33"],"estSec":264,"c1":2,"c2":2}
{"key":"J190/s10/d29","tier":1,"night":"J190","folder":"b-s10-peasant-2926","d":29,"kind":"a","turn":23,"options":[0,2],"j1":2,"j2":2,"seed":2926,"tokens":["attack:none","attack:12,13,33","attack:12","attack:33","attack:13"],"estSec":100,"c1":2,"c2":2}
{"key":"J190/s12/d2","tier":1,"night":"J190","folder":"b-s12-powered-2928","d":2,"kind":"p","turn":5,"options":[0,1],"j1":1,"j2":1,"seed":2928,"tokens":["pass","cast:20"],"estSec":396,"c1":3,"c2":3}
{"key":"J191/s01/d23","tier":2,"night":"J191","folder":"b-s01-pauper-3001","d":23,"kind":"p","turn":20,"options":[0,2],"j1":0,"j2":2,"seed":3001,"tokens":["pass","cast:40","cast:19"],"estSec":576,"c1":2,"c2":2}
{"key":"J191/s02/d25","tier":1,"night":"J191","folder":"b-s02-peasant-3002","d":25,"kind":"a","turn":19,"options":[0,2],"j1":2,"j2":2,"seed":3002,"tokens":["attack:11,15","attack:none","attack:15","attack:11"],"estSec":23,"c1":3,"c2":3}
{"key":"J191/s04/d3","tier":1,"night":"J191","folder":"b-s04-powered-3004","d":3,"kind":"p","turn":9,"options":[0,2],"j1":2,"j2":2,"seed":3004,"tokens":["activate:23","pass","cast:17"],"estSec":398,"c1":2,"c2":3}
{"key":"J191/s04/d6","tier":1,"night":"J191","folder":"b-s04-powered-3004","d":6,"kind":"p","turn":13,"options":[0,4],"j1":4,"j2":4,"seed":3004,"tokens":["pass","cast:20","cast:13","cast:5","cast:17"],"estSec":474,"c1":3,"c2":2}
{"key":"J191/s04/d17","tier":1,"night":"J191","folder":"b-s04-powered-3004","d":17,"kind":"p","turn":17,"options":[0,3],"j1":3,"j2":3,"seed":3004,"tokens":["pass","cast:13","cast:11","cast:17"],"estSec":381,"c1":2,"c2":3}
{"key":"J191/s04/d22","tier":1,"night":"J191","folder":"b-s04-powered-3004","d":22,"kind":"a","turn":19,"options":[0,2],"j1":2,"j2":2,"seed":3004,"tokens":["attack:7","attack:none","attack:7,17,20","attack:7,20","attack:7,17"],"estSec":158,"c1":3,"c2":3}
{"key":"J191/s06/d6","tier":2,"night":"J191","folder":"b-s06-peasant-3006","d":6,"kind":"p","turn":13,"options":[0,4],"j1":0,"j2":4,"seed":3006,"tokens":["cast:6","pass","activate:34#1","activate:29#1","cast:2"],"estSec":263,"c1":2,"c2":2}
{"key":"J191/s07/d5","tier":1,"night":"J191","folder":"b-s07-legacy-3007","d":5,"kind":"p","turn":10,"options":[0,3],"j1":3,"j2":3,"seed":3007,"tokens":["pass","cast:32","cast:34","cast:37"],"estSec":594,"c1":2,"c2":2}
{"key":"J191/s08/d9","tier":1,"night":"J191","folder":"b-s08-powered-3008","d":9,"kind":"p","turn":9,"options":[0,1],"j1":1,"j2":1,"seed":3008,"tokens":["pass","cast:21"],"estSec":273,"c1":3,"c2":3}
{"key":"J191/s09/d30","tier":1,"night":"J191","folder":"b-s09-pauper-3009","d":30,"kind":"p","turn":24,"options":[0,3],"j1":3,"j2":3,"seed":3009,"tokens":["cast:21","pass","cast:13","cast:39","cast:17"],"estSec":149,"c1":3,"c2":3}
{"key":"J191/s11/d1","tier":1,"night":"J191","folder":"b-s11-legacy-3011","d":1,"kind":"p","turn":6,"options":[0,3],"j1":3,"j2":3,"seed":3011,"tokens":["cast:1","pass","cast:40","cast:39"],"estSec":232,"c1":3,"c2":3}
{"key":"J191/s11/d3","tier":2,"night":"J191","folder":"b-s11-legacy-3011","d":3,"kind":"p","turn":8,"options":[0,3],"j1":0,"j2":3,"seed":3011,"tokens":["cast:12","pass","cast:40","cast:39"],"estSec":193,"c1":2,"c2":2}
{"key":"J191/s12/d6","tier":1,"night":"J191","folder":"b-s12-powered-3012","d":6,"kind":"p","turn":7,"options":[0,3],"j1":3,"j2":3,"seed":3012,"tokens":["pass","cast:27","cast:26","cast:37"],"estSec":306,"c1":3,"c2":3}
{"key":"J191/s12/d12","tier":1,"night":"J191","folder":"b-s12-powered-3012","d":12,"kind":"p","turn":11,"options":[0,2],"j1":2,"j2":2,"seed":3012,"tokens":["pass","cast:27","cast:26","cast:40"],"estSec":284,"c1":2,"c2":2}
{"key":"J191/s13/d8","tier":1,"night":"J191","folder":"b-s13-pauper-3013","d":8,"kind":"p","turn":12,"options":[0,1],"j1":1,"j2":1,"seed":3013,"tokens":["cast:5","pass","cast:30","cast:36"],"estSec":353,"c1":2,"c2":2}
{"key":"J193/s01/d12","tier":1,"night":"J193","folder":"b-s01-pauper-3785","d":12,"kind":"p","turn":14,"options":[0,3],"j1":3,"j2":3,"seed":3785,"tokens":["pass","cast:12","cast:4","cast:13"],"estSec":99,"c1":3,"c2":3}
{"key":"J193/s01/d14","tier":1,"night":"J193","folder":"b-s01-pauper-3785","d":14,"kind":"p","turn":16,"options":[0,3],"j1":3,"j2":3,"seed":3785,"tokens":["pass","cast:12","cast:4","cast:38"],"estSec":120,"c1":3,"c2":3}
{"key":"J193/s03/d4","tier":2,"night":"J193","folder":"b-s03-legacy-3787","d":4,"kind":"p","turn":10,"options":[0,2,4],"j1":2,"j2":4,"seed":3787,"tokens":["cast:32","pass","cast:24","cast:18","cast:37"],"estSec":259,"c1":3,"c2":1}
{"key":"J193/s03/d5","tier":1,"night":"J193","folder":"b-s03-legacy-3787","d":5,"kind":"p","turn":12,"options":[0,2],"j1":2,"j2":2,"seed":3787,"tokens":["activate:31","pass","cast:24","cast:18","cast:37"],"estSec":165,"c1":2,"c2":2}
{"key":"J193/s03/d6","tier":1,"night":"J193","folder":"b-s03-legacy-3787","d":6,"kind":"p","turn":12,"options":[0,1],"j1":1,"j2":1,"seed":3787,"tokens":["pass","cast:24","cast:18","cast:37"],"estSec":155,"c1":3,"c2":2}
{"key":"J193/s03/d7","tier":1,"night":"J193","folder":"b-s03-legacy-3787","d":7,"kind":"p","turn":12,"options":[0,2],"j1":2,"j2":2,"seed":3787,"tokens":["cast:37","pass","cast:24","cast:18"],"estSec":145,"c1":3,"c2":2}
{"key":"J193/s03/d11","tier":2,"night":"J193","folder":"b-s03-legacy-3787","d":11,"kind":"p","turn":14,"options":[0,4],"j1":0,"j2":4,"seed":3787,"tokens":["cast:18","pass","cast:3","cast:3","cast:22","cast:1"],"estSec":79,"c1":2,"c2":2}
{"key":"J193/s04/d15","tier":1,"night":"J193","folder":"b-s04-powered-3788","d":15,"kind":"p","turn":17,"options":[0,1],"j1":1,"j2":1,"seed":3788,"tokens":["pass","cast:20"],"estSec":190,"c1":2,"c2":2}
{"key":"J193/s04/d16","tier":2,"night":"J193","folder":"b-s04-powered-3788","d":16,"kind":"a","turn":17,"options":[0,4],"j1":0,"j2":4,"seed":3788,"tokens":["attack:128","attack:none","attack:30,36,128","attack:36,128","attack:30,128"],"estSec":162,"c1":2,"c2":2}
{"key":"J193/s05/d12","tier":1,"night":"J193","folder":"b-s05-pauper-3789","d":12,"kind":"b","turn":9,"options":[0,1],"j1":1,"j2":1,"seed":3789,"tokens":["block:84>79,85>79","block:none","block:84>79","block:85>79","block:7>79,84>79,85>79"],"estSec":84,"c1":2,"c2":2}
{"key":"J193/s05/d17","tier":2,"night":"J193","folder":"b-s05-pauper-3789","d":17,"kind":"a","turn":12,"options":[0,2],"j1":0,"j2":2,"seed":3789,"tokens":["attack:3","attack:none","attack:3,7,9,10,36","attack:3,9","attack:3,36","attack:3,7","attack:3,10"],"estSec":31,"c1":2,"c2":2}
{"key":"J193/s07/d2","tier":1,"night":"J193","folder":"b-s07-legacy-3791","d":2,"kind":"p","turn":8,"options":[0,2],"j1":2,"j2":2,"seed":3791,"tokens":["cast:6","pass","cast:32","cast:14","cast:4"],"estSec":809,"c1":2,"c2":2}
{"key":"J193/s07/d19","tier":1,"night":"J193","folder":"b-s07-legacy-3791","d":19,"kind":"p","turn":16,"options":[0,2],"j1":2,"j2":2,"seed":3791,"tokens":["pass","cast:22","cast:21"],"estSec":1338,"c1":2,"c2":3}
{"key":"J193/s07/d23","tier":1,"night":"J193","folder":"b-s07-legacy-3791","d":23,"kind":"a","turn":18,"options":[0,2],"j1":2,"j2":2,"seed":3791,"tokens":["attack:17","attack:none","attack:4,9,17,21,40,84,91,92","attack:17,84","attack:17,91","attack:17,92","attack:4,17","attack:17,40"],"estSec":902,"c1":2,"c2":2}
{"key":"J193/s07/d36","tier":1,"night":"J193","folder":"b-s07-legacy-3791","d":36,"kind":"a","turn":24,"options":[0,2],"j1":2,"j2":2,"seed":3791,"tokens":["attack:35","attack:none","attack:4,9,15,17,21,35,40,84,91,92,100,103","attack:35,84","attack:35,91","attack:35,92","attack:4,35","attack:17,35"],"estSec":400,"c1":2,"c2":1}
{"key":"J193/s08/d2","tier":1,"night":"J193","folder":"b-s08-powered-3792","d":2,"kind":"p","turn":3,"options":[0,3],"j1":3,"j2":3,"seed":3792,"tokens":["cast:5","pass","cast:21","cast:39"],"estSec":776,"c1":2,"c2":2}
{"key":"J193/s08/d4","tier":1,"night":"J193","folder":"b-s08-powered-3792","d":4,"kind":"p","turn":5,"options":[0,2],"j1":2,"j2":2,"seed":3792,"tokens":["cast:22","pass","cast:21","cast:39"],"estSec":695,"c1":1,"c2":1}
{"key":"J193/s09/d16","tier":2,"night":"J193","folder":"b-s09-pauper-3793","d":16,"kind":"p","turn":12,"options":[0,2],"j1":2,"j2":0,"seed":3793,"tokens":["cast:21","pass","cast:23","cast:3","cast:34","cast:4"],"estSec":271,"c1":2,"c2":2}
{"key":"J193/s09/d22","tier":2,"night":"J193","folder":"b-s09-pauper-3793","d":22,"kind":"p","turn":14,"options":[0,1,2],"j1":2,"j2":1,"seed":3793,"tokens":["pass","cast:23","cast:17","cast:4","cast:34"],"estSec":234,"c1":1,"c2":2}
{"key":"J193/s10/d1","tier":2,"night":"J193","folder":"b-s10-peasant-3794","d":1,"kind":"p","turn":3,"options":[0,2],"j1":0,"j2":2,"seed":3794,"tokens":["cast:8","pass","cast:12"],"estSec":496,"c1":2,"c2":2}
{"key":"J193/s11/d4","tier":1,"night":"J193","folder":"b-s11-legacy-3795","d":4,"kind":"p","turn":8,"options":[0,1],"j1":1,"j2":1,"seed":3795,"tokens":["pass","cast:32","cast:35","cast:36"],"estSec":215,"c1":2,"c2":2}
{"key":"J193/s12/d13","tier":1,"night":"J193","folder":"b-s12-powered-3796","d":13,"kind":"p","turn":9,"options":[0,2],"j1":2,"j2":2,"seed":3796,"tokens":["cast:15","pass","cast:33","activate:87"],"estSec":106,"c1":2,"c2":2}
{"key":"J193/s12/d18","tier":2,"night":"J193","folder":"b-s12-powered-3796","d":18,"kind":"p","turn":11,"options":[0,1,2],"j1":1,"j2":2,"seed":3796,"tokens":["cast:33","pass","activate:94"],"estSec":46,"c1":1,"c2":1}
{"key":"J193/s12/d20","tier":2,"night":"J193","folder":"b-s12-powered-3796","d":20,"kind":"a","turn":13,"options":[0,2,3],"j1":2,"j2":3,"seed":3796,"tokens":["attack:24","attack:none","attack:20,24,33","attack:20,24","attack:24,33"],"estSec":16,"c1":2,"c2":1}
{"key":"J193/s13/d4","tier":2,"night":"J193","folder":"b-s13-pauper-3797","d":4,"kind":"p","turn":8,"options":[0,3],"j1":0,"j2":3,"seed":3797,"tokens":["pass","cast:36","cast:28","cast:3","cast:30"],"estSec":203,"c1":2,"c2":2}
{"key":"J193/s13/d8","tier":2,"night":"J193","folder":"b-s13-pauper-3797","d":8,"kind":"a","turn":10,"options":[0,1],"j1":1,"j2":0,"seed":3797,"tokens":["attack:none","attack:3"],"estSec":172,"c1":1,"c2":2}
{"key":"J193/s13/d17","tier":1,"night":"J193","folder":"b-s13-pauper-3797","d":17,"kind":"p","turn":18,"options":[0,2],"j1":2,"j2":2,"seed":3797,"tokens":["cast:40","pass","cast:35"],"estSec":13,"c1":2,"c2":2}
J200EOF
cat > var/j200-tools/read.py <<'J200EOF'
# J200 "judge the judge": the pre-registered reading, written 2026-11-08 before any J200 branch game was played.
# usage: python3 -I read.py <plan.jsonl> <J200 root> <night data root> <out.json> [--boot 10000] [--seed 200] [--report <md>] [--slim <json>]
#        python3 -I read.py --pilot <pilot spine folder> <night spine folder> <d> <o,o> <branches> <out.json>
#        python3 -I read.py --selftest <scratch dir>
#
# THE QUESTION. On the decisions where both blind judges (round 2, the board shown) picked the same option and it is
# not Forge's option 0 (tier 1, 82 decisions), is the judges' option better than Forge's when the rest of the game is
# played by Forge's AI on both seats (D451's Forge map, 40 branches an option, D498's redeal, D511's replay)?
# INPUTS. <plan.jsonl>: one line per decision (key, tier, night, folder, d, kind, turn, options, j1, j2, tokens).
#   <J200 root>/<night>-<folder>/phaseB/{baseline.json,units.jsonl,branches.jsonl}: J200's own spine folders.
#   <night data root>/lab-<night lower>/<folder>/phaseB/{baseline.json,branches.jsonl}: the night's folders, read only
#   (the random map, and the Forge map where the night had one, for the reproduction read).
# A BRANCH ROW scores as the atlas scores it (D478: a capped or timed-out branch is the draw it was written as); a row
# with `error` or `unavailable` is no score (D470). A branch index is PAIRED when both options have a score there.
# A TIER-1 DECISION IS VALID when (a) J200's baseline listing equals the night's, decision for decision (tokens, kind,
#   turn): the same game, so d is the same position (D511); (b) the listing at d is the plan's tokens; (c) no forge
#   unit line of the decision is missing, failed, or names a replay divergence; (d) it has >= 30 paired Forge branches.
# PER DECISION: judge mean J and Forge mean F over the paired indices, diff = J - F, a 2,000-draw paired bootstrap
#   interval of diff (indices resampled).
# OVERALL (valid tier-1 decisions): SHARE = decisions with diff > 0 over decisions with diff != 0 (ties excluded and
#   counted); GAIN = the mean of diff over all valid decisions (ties count 0). Intervals: a two-level cluster bootstrap,
#   --boot draws (10,000), seeded: spines (night/folder) resampled with replacement, then each drawn decision's paired
#   indices resampled with replacement; the 2.5% and 97.5% points. A draw with no untied decision is left out of the
#   share's interval (counted).
# COMPLETE when >= 74 of the 82 tier-1 decisions are valid (90%). Exactly one reading when complete:
#   KNOWLEDGE SHOWN  shareLo > 0.5 and gainLo > 0;
#   NOT SHOWN        shareHi < 0.5 or gainHi < 0;
#   INCONCLUSIVE     otherwise.
#   (SHOWN implies shareHi > 0.5 and gainHi > 0, so SHOWN and NOT SHOWN cannot both hold.)
# BESIDE IT, deciding nothing: the same share and gain on the RANDOM map (the night's rows, the same decisions and
#   option pairs; biased toward the judge by the confident filter, which chose these rows because an option beat
#   option 0 there); by kind; on live decisions (either option's Forge mean in (0.05, 0.95)); by confidence (both
#   judges at 3); the per-decision correlation of the random-map diff with the Forge-map diff; the reproduction of the
#   night's Forge rows where the night had a Forge map; and tier 2 (the 24 split decisions: each judge's non-0 pick
#   against option 0, and j1 against j2 where both are non-0).
import json, math, os, random, sys

TIER1 = 82
MINVALID = 74
MINPAIRED = 30
BOOT_DEC = 2000

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

def paired(by, a, b):
    idx = sorted(set(by[a]) & set(by[b]))
    return [by[a][i] - by[b][i] for i in idx], [by[a][i] for i in idx], [by[b][i] for i in idx]

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

def dec_interval(diffs, rng):
    n = len(diffs)
    if n == 0:
        return None, None
    ms = [sum(rng.choices(diffs, k=n)) / n for _ in range(BOOT_DEC)]
    return pct(ms, 0.025), pct(ms, 0.975)

def overall(decs, boot, seed):
    """decs: [{'spine': str, 'diffs': [...]}] -> share, gain and their cluster-bootstrap intervals."""
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

def verdict(t1, valid):
    complete = 1 if valid >= MINVALID else 0
    sl, shh, gl, gh = t1.get('shareLo'), t1.get('shareHi'), t1.get('gainLo'), t1.get('gainHi')
    # a share with no untied decision has no interval: it is then neither above nor below 0.5
    ok = complete == 1 and None not in (gl, gh)
    shown = 1 if ok and sl is not None and sl > 0.5 and gl > 0 else 0
    notshown = 1 if ok and not shown and ((shh is not None and shh < 0.5) or gh < 0) else 0
    inconclusive = 1 if ok and not shown and not notshown else 0
    if not ok:
        reading = 'INCOMPLETE: %d of %d tier-1 decisions valid (at least %d needed); no verdict' % (valid, TIER1, MINVALID)
    elif shown:
        reading = 'KNOWLEDGE SHOWN'
    elif notshown:
        reading = 'NOT SHOWN'
    else:
        reading = 'INCONCLUSIVE'
    return {'complete': complete, 'shown': shown, 'notShown': notshown, 'inconclusive': inconclusive, 'reading': reading}

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

def read(plan_file, root, night_root, boot=10000, seed=200):
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
    per, t1f, t1r, repro = [], [], [], {'cells': 0, 'same': 0, 'decisions': 0}
    for x in plan:
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
        row = {'key': x['key'], 'tier': x['tier'], 'kind': x['kind'], 'turn': x['turn'], 'options': opts, 'spine': '%s/%s' % (x['night'], x['folder'])}
        pairs = []
        if x['tier'] == 1:
            pairs = [('judge', x['j1'], 0)]
        else:
            for name, o in (('j1', x['j1']), ('j2', x['j2'])):
                if o != 0:
                    pairs.append((name + 'vs0', o, 0))
            if x['j1'] != 0 and x['j2'] != 0:
                pairs.append(('j1vsj2', x['j1'], x['j2']))
        for name, a, b in pairs:
            d, ja, fb0 = paired(fb, a, b)
            rd, _, _ = paired(rb, a, b)
            lo, hi = dec_interval(d, rng) if d else (None, None)
            row[name] = {'n': len(d), 'a': a, 'b': b, 'meanA': r4(mean(ja)), 'meanB': r4(mean(fb0)), 'diff': r4(mean(d)), 'lo': r4(lo), 'hi': r4(hi),
                         'randomN': len(rd), 'randomDiff': r4(mean(rd))}
            if x['tier'] == 1:
                if why is None and len(d) < MINPAIRED:
                    why = 'fewer than %d paired branches' % MINPAIRED
                live = (mean(ja) is not None and 0.05 < mean(ja) < 0.95) or (mean(fb0) is not None and 0.05 < mean(fb0) < 0.95)
                row['live'] = live
                row['conf3'] = x.get('c1') == 3 and x.get('c2') == 3
                if why is None:
                    t1f.append({'spine': row['spine'], 'diffs': d, 'kind': x['kind'], 'live': live, 'conf3': row['conf3'], 'rd': mean(rd)})
                    if rd:
                        t1r.append({'spine': row['spine'], 'diffs': rd})
        row['excluded'] = why
        per.append(row)
    t1 = [r for r in per if r['tier'] == 1]
    valid = len(t1f)
    forge = overall(t1f, boot, seed)
    rnd = overall(t1r, boot, seed)
    v = verdict(forge, valid)
    sub = lambda pred: overall([x for x in t1f if pred(x)], max(1, boot // 5), seed)
    corr_pairs = [(x['rd'], mean(x['diffs'])) for x in t1f if x['rd'] is not None]
    t2 = [r for r in per if r['tier'] == 2]
    t2out = {}
    for name in ('j1vs0', 'j2vs0', 'j1vsj2'):
        decs = []
        for r in t2:
            p = r.get(name)
            if not p or r['excluded'] is not None or p['n'] < MINPAIRED:
                continue
            a, b = p['a'], p['b']
            s = cache[tuple(r['spine'].split('/', 1))]
            d, _, _ = paired(scores(s['rows'], 'forge', [y for y in plan if y['key'] == r['key']][0]['d'], r['options']), a, b)
            decs.append({'spine': r['spine'], 'diffs': d})
        t2out[name] = overall(decs, max(1, boot // 5), seed)
    ck = {'spinesWithAtlas': 0, 'problems': 0, 'frameLogs': 0, 'frameLogsFailed': 0, 'leaks': 0, 'leakChecks': 0, 'forkProblems': 0,
          'branchRows': 0, 'forgeRows': 0, 'forgeErrors': 0, 'forgeTimedOut': 0, 'forgeCapped': 0, 'forgeMs': 0}
    for c in cache.values():
        a = c['atlas']
        if a and isinstance(a.get('checks'), dict):
            ck['spinesWithAtlas'] += 1
            ch = a['checks']
            ck['problems'] += len(ch.get('problems') or [])
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
    excl = {}
    for r in t1:
        if r['excluded']:
            excl[r['excluded']] = excl.get(r['excluded'], 0) + 1
    out = {'written': 1, 'tier1': len(t1), 'tier2': len(t2), 'valid': valid, 'minValid': MINVALID, 'excluded': excl,
           'spinesPlayed': sum(1 for c in cache.values() if c['played']), 'spinesSame': sum(1 for c in cache.values() if c['same']),
           'spines': len(cache), 'checks': ck, 'forge': forge, 'random': rnd, **v,
           'byKind': {k: sub(lambda x, k=k: x['kind'] == k) for k in ('p', 'a', 'b')},
           'live': sub(lambda x: x['live']), 'conf3': sub(lambda x: x['conf3']),
           'randomVsForgeSpearman': spearman([a for a, _ in corr_pairs], [b for _, b in corr_pairs]),
           'reproduction': {**repro, 'share': r4(repro['same'] / repro['cells']) if repro['cells'] else None},
           'tier2read': t2out, 'decisions': per}
    return out

# ---------------------------------------------------------------- the self-test: synthetic spines with known answers
def _mk(root, night_root, plan, gen, drift=(), diverge=(), fail=(), short=()):
    os.makedirs(os.path.dirname(plan), exist_ok=True)
    rng = random.Random(7)
    lines = []
    spines = {}
    for j in range(TIER1 + 4):
        tier = 1 if j < TIER1 else 2
        night, folder = 'J9%02d' % (j // 2 % 5), 'b-s%02d-x-%d' % (j // 2, 9000 + j // 2)
        d = j % 2
        x = {'key': '%s/s%02d/d%d' % (night, j // 2, d), 'tier': tier, 'night': night, 'folder': folder, 'd': d, 'kind': 'pab'[j % 3],
             'turn': 5 + d, 'options': [0, 1] if tier == 1 or j % 2 == 0 else [0, 1, 2], 'j1': 1, 'j2': 1 if tier == 1 else (0 if j % 2 == 0 else 2),
             'tokens': ['pass', 'cast:%d' % j, 'cast:%d' % (j + 100)][: (2 if tier == 1 or j % 2 == 0 else 3)], 'c1': 3, 'c2': 3 if j % 4 else 2}
        lines.append(x)
        spines.setdefault((night, folder), []).append(x)
    with open(plan, 'w') as f:
        for x in lines:
            f.write(json.dumps(x) + '\n')
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
        rows, nrows, units = [], [], []
        for x in xs:
            for o in x['options']:
                for i in range(40):
                    if x['key'] in short and i >= 20:
                        continue
                    if o == 1 and i == 39:
                        continue   # this cell gets only the errored row below
                    rows.append({'c': 'forge', 'd': x['d'], 'o': o, 'i': i, 'score': gen(x, o, i, rng, 'forge'), 'error': None})
                    nrows.append({'c': 'forge', 'd': x['d'], 'o': o, 'i': i, 'score': rows[-1]['score'], 'error': None})
                for i in range(150):
                    nrows.append({'c': 'random', 'd': x['d'], 'o': o, 'i': i, 'score': gen(x, o, i, rng, 'random'), 'error': None})
            rows.append({'c': 'forge', 'd': x['d'], 'o': 1, 'i': 39, 'score': 1, 'error': 'boom'})   # an errored row: no score
            for i0 in (0, 20):
                err = 'the replay diverged at decision %d' % x['d'] if x['key'] in diverge else None
                ok = err is None and x['key'] not in fail
                units.append({'id': 'd%d-forge-%d' % (x['d'], i0), 'd': x['d'], 'c': 'forge', 'i0': i0, 'ok': ok, 'error': err})
        with open(os.path.join(md, 'branches.jsonl'), 'w') as f:
            for r in rows:
                f.write(json.dumps(r) + '\n')
        with open(os.path.join(nd, 'branches.jsonl'), 'w') as f:
            for r in nrows:
                f.write(json.dumps(r) + '\n')
        with open(os.path.join(md, 'units.jsonl'), 'w') as f:
            for u in units:
                f.write(json.dumps(u) + '\n')

def selftest(scratch):
    def bern(p, rng):
        return 1.0 if rng.random() < p else 0.0
    def make(name, gen, **kw):
        base = os.path.join(scratch, name)
        root, night, plan = os.path.join(base, 'j200'), os.path.join(base, 'night'), os.path.join(base, 'plan.jsonl')
        _mk(root, night, plan, gen, **kw)
        return read(plan, root, night, boot=400, seed=200)
    # the judge's option better by 0.2 in every decision (base 0.4): SHOWN
    better = lambda x, o, i, rng, c: bern(0.4 + (0.2 if o == x['j1'] and o != 0 else 0), rng)
    # Forge's option better by 0.2: NOT SHOWN
    worse = lambda x, o, i, rng, c: bern(0.6 - (0.2 if o == x['j1'] and o != 0 else 0), rng)
    # no difference at all, noisy: INCONCLUSIVE
    same = lambda x, o, i, rng, c: bern(0.5, rng)
    # every branch decided the same way for both options: all ties -> no share; gain 0 with a zero-width interval
    flat = lambda x, o, i, rng, c: 1.0
    # better on the random map only (the chaos map), worse on Forge's: NOT SHOWN, the random side SHOWN-like
    chaos = lambda x, o, i, rng, c: bern(0.4 + (0.25 if o == x['j1'] and o != 0 else 0) if c == 'random' else 0.6 - (0.2 if o == x['j1'] and o != 0 else 0), rng)
    keys8 = ['J9%02d/s%02d/d%d' % (j // 2 % 5, j // 2, j % 2) for j in range(0, 18, 2)]   # 9 decisions, spines 0-8 (one per spine)
    cases = [
        ('the judge better by 0.2 everywhere: KNOWLEDGE SHOWN', 'better', better, {}, lambda r: r['shown'] == 1 and r['notShown'] + r['inconclusive'] == 0 and r['forge']['shareLo'] > 0.5 and r['forge']['gainLo'] > 0 and r['valid'] == TIER1),
        ('Forge better by 0.2 everywhere: NOT SHOWN', 'worse', worse, {}, lambda r: r['notShown'] == 1 and r['shown'] + r['inconclusive'] == 0 and r['forge']['shareHi'] < 0.5),
        ('no difference: INCONCLUSIVE', 'same', same, {}, lambda r: r['inconclusive'] == 1 and r['shown'] + r['notShown'] == 0),
        ('every branch a win for both: all ties, no share, INCONCLUSIVE never SHOWN', 'flat', flat, {}, lambda r: r['forge']['ties'] == TIER1 and r['forge']['share'] is None and r['shown'] == 0 and r['complete'] == 1 and r['reading'].startswith('INCOMPLETE') is False and r['forge']['gain'] == 0),
        ('better on the random map only: NOT SHOWN on Forge, the random side above 0.5', 'chaos', chaos, {}, lambda r: r['notShown'] == 1 and r['random']['shareLo'] > 0.5 and r['random']['gainLo'] > 0),
        ('8 decisions excluded (a drifted spine: 2; divergence, failure, short: 2 each) still complete at 74', 'excl8', better,
            {'drift': {keys8[0]}, 'diverge': {keys8[2], keys8[3]}, 'fail': {keys8[4], keys8[5]}, 'short': {keys8[6], keys8[7]}},
            lambda r: r['valid'] == 74 and r['complete'] == 1 and r['shown'] == 1 and r['excluded'].get('baseline drifted') == 2 and r['excluded'].get('replay diverged') == 2 and r['excluded'].get('unit failed or missing') == 2),
        ('9 excluded: 73 valid, INCOMPLETE, no verdict', 'excl9', better,
            {'drift': {keys8[0]}, 'diverge': {keys8[2], keys8[3]}, 'fail': {keys8[4], keys8[5]}, 'short': {keys8[6], keys8[7], keys8[8]}},
            lambda r: r['valid'] == 73 and r['complete'] == 0 and r['shown'] + r['notShown'] + r['inconclusive'] == 0 and r['reading'].startswith('INCOMPLETE')),
        ('the errored row is no score: 40 paired less one', 'rows', better, {}, lambda r: all(d['judge']['n'] == 39 for d in r['decisions'] if d['tier'] == 1)),
        ('a drifted spine is the only exclusion: 80 valid, its two decisions named', 'drift1', better, {'drift': {keys8[1]}}, lambda r: r['valid'] == 80 and r['excluded'] == {'baseline drifted': 2} and r['spinesSame'] == r['spines'] - 1),
        ('the reproduction read sees identical night rows', 'repro', better, {}, lambda r: r['reproduction']['share'] == 1.0 and r['reproduction']['decisions'] == TIER1 + 4),
        ('tier 2 is read and never in the verdict', 'tier2', better, {}, lambda r: r['tier2'] == 4 and r['tier1'] == TIER1 and r['tier2read']['j1vs0']['n'] >= 1 and r['forge']['n'] == TIER1),
    ]
    ok = 0
    for what, name, gen, kw, pred in cases:
        try:
            r = make(name, gen, **kw)
            p = bool(pred(r)) and report(r).startswith('# J200')
            line = r['reading']
        except Exception as e:   # a crash fails the case
            p, line = False, 'crash: %r' % (e,)
        print('%s %s: %s' % ('ok  ' if p else 'FAIL', what, line), file=sys.stderr)
        ok += 1 if p else 0
    return {'selftest': 1, 'cases': len(cases), 'passed': ok, 'ok': 1 if ok == len(cases) else 0}

def pilot(mine, night, d, opts, n, out):
    """The pilot's spine: the same game (D511), the lane's restriction, the values parse."""
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
    f, rd = r['forge'], r['random']
    fmt = lambda o: '%s [%s, %s]' % (o.get('share'), o.get('shareLo'), o.get('shareHi'))
    fmg = lambda o: '%s [%s, %s]' % (o.get('gain'), o.get('gainLo'), o.get('gainHi'))
    L = ['# J200: judge the judge -- the judges\' option against Forge\'s under Forge continuation (D451\'s Forge map)', '',
         '**Reading under the pre-registered rule:** %s.' % r['reading'], '',
         'Tier 1: %d decisions (both judges, one option, not Forge\'s); %d valid (at least %d needed); excluded: %s. Spines: %d, played %d, the night\'s game %d.' % (
             r['tier1'], r['valid'], r['minValid'], json.dumps(r['excluded']), r['spines'], r['spinesPlayed'], r['spinesSame']), '',
         '| map | decisions | judge better / worse / tied | share of untied decisions where the judge\'s option is better [95%] | mean gain, judge - Forge [95%] |',
         '|---|---|---|---|---|',
         '| **Forge map (J200, 40 branches an option)** | %s | %s / %s / %s | %s | %s |' % (f.get('n'), f.get('wins'), f.get('losses'), f.get('ties'), fmt(f), fmg(f)),
         '| random map (the night\'s rows; biased toward the judge by the confident filter) | %s | %s / %s / %s | %s | %s |' % (rd.get('n'), rd.get('wins'), rd.get('losses'), rd.get('ties'), fmt(rd), fmg(rd)), '',
         'Beside the reading, deciding nothing (Forge map):', '',
         '| subset | decisions | better / worse / tied | share [95%] | gain [95%] |', '|---|---|---|---|---|']
    for name, o in [('priority', r['byKind']['p']), ('attack', r['byKind']['a']), ('block', r['byKind']['b']), ('live (an option between .05 and .95)', r['live']),
                    ('both judges at confidence 3', r['conf3'])] + [('tier 2: ' + k, v) for k, v in r['tier2read'].items()]:
        L.append('| %s | %s | %s / %s / %s | %s | %s |' % (name, o.get('n'), o.get('wins'), o.get('losses'), o.get('ties'), fmt(o), fmg(o)))
    rp, ck = r['reproduction'], r['checks']
    L += ['', 'Random-map diff against Forge-map diff, per decision (Spearman): %s.' % r['randomVsForgeSpearman'],
          'Reproduction of the night\'s Forge rows (decisions the night mapped): %s of %s cells the same (%s), over %s decisions.' % (rp['same'], rp['cells'], rp['share'], rp['decisions']),
          'Checks: %(spinesWithAtlas)s spines with atlas.json; problems %(problems)s; frame logs %(frameLogs)s, failed %(frameLogsFailed)s; leaks %(leaks)s of %(leakChecks)s leak checks; fork problems %(forkProblems)s.' % ck,
          'Forge rows %(forgeRows)s (errors %(forgeErrors)s, timed out %(forgeTimedOut)s, capped %(forgeCapped)s); %(forgeWorkerHours)s worker-hours of branch games.' % ck, '',
          '| decision | kind | turn | options | judge mean | Forge mean | diff [95%] | random diff | excluded |', '|---|---|---|---|---|---|---|---|---|']
    for x in r['decisions']:
        if x['tier'] != 1:
            continue
        j = x.get('judge') or {}
        L.append('| %s | %s | %s | %s | %s | %s | %s [%s, %s] | %s | %s |' % (x['key'], x['kind'], x['turn'], x['options'], j.get('meanA'), j.get('meanB'), j.get('diff'), j.get('lo'), j.get('hi'), j.get('randomDiff'), x['excluded'] or ''))
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
        print('usage: read.py <plan.jsonl> <J200 root> <night data root> <out.json> [--boot N] [--seed S] | --selftest <dir>', file=sys.stderr)
        sys.exit(2)
    boot = int(a[a.index('--boot') + 1]) if '--boot' in a else 10000
    seed = int(a[a.index('--seed') + 1]) if '--seed' in a else 200
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
    print(json.dumps({k: r[k] for k in ('valid', 'tier1', 'complete', 'shown', 'notShown', 'inconclusive', 'reading')}))
    print(json.dumps({'forge': r['forge'], 'random': r['random']}))
J200EOF
cat > var/j200-tools/drive.py <<'J200EOF'
# J200: the plan's checks and the spine driver.
# usage: python3 -I drive.py check <plan.jsonl> <night root> <out.json>
#        python3 -I drive.py run <plan.jsonl> <night root> <group: t1|t2|pilot> <workers> [--dry]
# THE PLAN (embedded in the job): one line per decision, 82 tier 1 (both judges, one option, not option 0) and 24 tier 2
#   (the judges split). Each names its night, its spine folder, d, the options to branch (0 and the pick(s)), the
#   baseline's tokens at d, the spine's seed and an estimate of its Forge-map seconds (the order the spines run in).
# `check` (the pilot): every spine folder of the night is on disk; its plan.json seed is the plan's; its decks' sha256 are
#   the ones its schedule.jsonl header recorded when the night played them; its baseline listing at d is the plan's
#   tokens, kind and turn; 82 + 24 decisions, every tier-1 decision's options are [0, pick] with pick != 0.
# `run`: the spines of a group, one `tools/cubelab.sh atlas` each, in order: t1 = every spine with a tier-1 decision (its
#   tier-2 decisions ride along: one baseline per spine), longest estimate first; t2 = the spines with only tier-2
#   decisions; pilot = J193's s01, d12 only, options [0, 3], 5 Forge branches. Each spine gets an --only file (the lane's
#   format: [{d, options, tokens}]), the night's own deck files and seed, and J177's unit settings (turn cap 40, 8
#   candidates, branch timeout 120 s, unit timeout 30 min); --branch-random 0 --branch-forge 40 --chunk 5. A spine whose
#   atlas.json exists with exit 0 in exits.txt is done and skipped (a retry resumes the rest; the atlas resumes a spine
#   from its own branches.jsonl). The exit of every spine is appended to exits.txt and its wall to spine-times.txt, and a
#   non-zero exit does not stop the group (the reader names what it excludes).
import hashlib, json, os, shutil, subprocess, sys, time

DATA = '/home/justin-a/code/lab/data'
OUT = 'lab-j200'
PILOT = ('J193', 'b-s01-pauper-3785', 12)

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

def check(plan_file, root, out):
    plan = plan_of(plan_file)
    r = {'decisions': len(plan), 'tier1': sum(1 for x in plan if x['tier'] == 1), 'tier2': sum(1 for x in plan if x['tier'] == 2),
         'spines': 0, 'spinesOk': 0, 'decksOk': 0, 'seedOk': 0, 'listingOk': 0, 'optionsOk': 0, 'bad': []}
    seen = {}
    for x in plan:
        k = (x['night'], x['folder'])
        if k not in seen:
            try:
                nd, pj, head = spine_facts(root, x)
                ok_decks = all(os.path.exists(pj[d]) and sha(pj[d]) == head['deckSha256'][d] for d in ('deckA', 'deckB'))
                seen[k] = {'ok': True, 'decks': ok_decks, 'seed': pj['seed'] == x['seed'],
                           'base': json.load(open(os.path.join(nd, 'phaseB', 'baseline.json')))}
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
        if x['tier'] == 1:
            good = x['j1'] == x['j2'] and x['j1'] != 0 and x['options'] == [0, x['j1']] and x['j1'] < len(x['tokens'])
        else:
            good = x['j1'] != x['j2'] and x['options'] == sorted({0, x['j1'], x['j2']}) and max(x['options']) < len(x['tokens'])
        r['optionsOk'] += 1 if good else 0
        if not good:
            r['bad'].append('%s: options %s' % (x['key'], x['options']))
    r['spines'] = len(seen)
    r['spinesOk'] = sum(1 for s in seen.values() if s['ok'])
    r['decksOk'] = sum(1 for s in seen.values() if s['decks'])
    r['seedOk'] = sum(1 for s in seen.values() if s['seed'])
    r['spinesT1'] = len({(x['night'], x['folder']) for x in plan if x['tier'] == 1})
    r['ok'] = 1 if (r['tier1'] == 82 and r['tier2'] == 24 and r['spines'] == 53 and r['spinesT1'] == 46 and r['spinesOk'] == 53
                    and r['decksOk'] == 53 and r['seedOk'] == 53 and r['listingOk'] == 106 and r['optionsOk'] == 106) else 0
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
        by.setdefault((x['night'], x['folder']), []).append(x)
    t1 = [k for k, xs in by.items() if any(x['tier'] == 1 for x in xs)]
    t2 = [k for k, xs in by.items() if all(x['tier'] == 2 for x in xs)]
    est = lambda k: -sum(x['estSec'] for x in by[k])
    return by, sorted(t1, key=lambda k: (est(k), k)), sorted(t2, key=lambda k: (est(k), k))

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
    by, t1, t2 = groups(plan)
    data = os.path.join(DATA, OUT)
    only_dir = os.path.abspath('var/j200-tools/only')
    if not dry:   # a dry run writes nothing
        os.makedirs(data, exist_ok=True)
        os.makedirs(only_dir, exist_ok=True)
    if group == 'pilot':
        keys = [(PILOT[0], PILOT[1])]
    else:
        keys = t1 if group == 't1' else t2
    ex = exits(os.path.join(data, 'exits.txt'))
    env = dict(os.environ, LAB_DATA_DIR=DATA, CUBELAB_HOME_ROOT='var/cubelab/homes-J200')
    played = 0
    for k in keys:
        xs = by[k]
        if group == 'pilot':
            xs = [x for x in xs if x['d'] == PILOT[2]]
            name, forge = 'pilot-%s-%s' % k, 5
        else:
            name, forge = '%s-%s' % k, 40
        if ex.get(name) == '0' and os.path.exists(os.path.join(data, name, 'atlas.json')):
            print('J200: %s done (exit 0, atlas.json), skipped' % name)
            continue
        if shutil.disk_usage(DATA).free / 1e9 < 20:
            print('J200: under 20 GB free on %s; stopping before %s' % (DATA, name), file=sys.stderr)
            return 1
        nd, pj, head = spine_facts(root, xs[0])
        for d in ('deckA', 'deckB'):
            if sha(pj[d]) != head['deckSha256'][d]:
                print('J200: %s: %s is not the deck the night played' % (name, pj[d]), file=sys.stderr)
                return 1
        if pj['seed'] != xs[0]['seed']:
            print('J200: %s: the night plan seed %s is not the plan seed %s' % (name, pj['seed'], xs[0]['seed']), file=sys.stderr)
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
        print('J200: %s: %d decision(s) %s; %s' % (name, len(only), ', '.join('d%d %s' % (o['d'], o['options']) for o in only), ' '.join(cmd)), flush=True)
        if dry:
            continue
        t0 = time.time()
        rc = subprocess.call(cmd, env=env)
        played += 1
        with open(os.path.join(data, 'exits.txt'), 'a') as f:
            f.write('%s %d\n' % (name, rc))
        with open(os.path.join(data, 'spine-times.txt'), 'a') as f:
            f.write('%s %d %d %d\n' % (name, int(t0), int(time.time()), workers))
    print('J200: group %s: %d spine command(s) run' % (group, played))
    return 0

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['check'] and len(a) == 4:
        sys.exit(0 if check(a[1], a[2], a[3]) else 1)
    if a[:1] == ['run'] and len(a) >= 5:
        sys.exit(run(a[1], a[2], a[3], int(a[4]), '--dry' in a))
    print('usage: drive.py check <plan> <night root> <out.json> | run <plan> <night root> <t1|t2|pilot> <workers> [--dry]', file=sys.stderr)
    sys.exit(2)
J200EOF
python3 -I var/j200-tools/drive.py check var/j200-tools/plan.jsonl /home/justin-a/code/lab/data var/j200-tools/plan-check.json || true
rm -rf var/j200-tools/selftest
python3 -I var/j200-tools/read.py --selftest var/j200-tools/selftest > var/j200-tools/read-selftest.json || true
cat var/j200-tools/read-selftest.json
```
```bash
# one decision on the Forge map at 5 branches an option: J193's s01 d12, options 0 and 3
python3 -I var/j200-tools/drive.py run var/j200-tools/plan.jsonl /home/justin-a/code/lab/data pilot 3
python3 -I var/j200-tools/read.py --pilot /home/justin-a/code/lab/data/lab-j200/pilot-J193-b-s01-pauper-3785 /home/justin-a/code/lab/data/lab-j193/b-s01-pauper-3785 12 0,3 5 var/j200-tools/pilot.json
```
metrics: merged = sh: cat var/j200-merged.txt 2>/dev/null || echo 0
metrics: lane = sh: cat var/j200-tools/lane.txt 2>/dev/null || echo 0
metrics: selftest = sh: cat var/j200-tools/selftest.txt 2>/dev/null || echo 0
metrics: nodetests = sh: cat var/j200-tools/nodetests.txt 2>/dev/null || echo 0
metrics: identity = sh: cat var/j200-tools/identity.txt 2>/dev/null || echo 0
metrics: sd = sh: cat var/j200-tools/seat-diff.json 2>/dev/null || echo '{"ok":0}'
metrics: dd = sh: cat var/j200-tools/datadir.json 2>/dev/null || echo '{"ok":0}'
metrics: pc = sh: cat var/j200-tools/plan-check.json 2>/dev/null || echo '{"ok":0}'
metrics: rt = sh: cat var/j200-tools/read-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0}'
metrics: p = sh: cat var/j200-tools/pilot.json 2>/dev/null || echo '{"baseline":0,"sameGame":0,"listingAtD":0,"units":0,"unitsOk":-1,"diverged":-1,"rowsHere":0,"scored":0,"scoresValid":0,"otherOptionRows":-1,"randomRows":-1,"atlasJson":0,"problems":-1,"leaks":-1}'
check: merged == 1
check: lane >= 1
check: selftest == 1
check: nodetests == 1
check: identity == 1
check: sd.ok == 1
check: dd.ok == 1
check: pc.ok == 1
check: pc.tier1 == 82
check: pc.tier2 == 24
check: pc.listingOk == 106
check: pc.decksOk == 53
check: rt.ok == 1
check: rt.cases == 11
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
check: p.problems == 0
check: p.leaks == 0

The pilot asks only whether anything is broken:
- `merged`, `lane`, `selftest`, `nodetests`: the pinned commit is on origin/main and carries the `--only` lane, whose
  self-test leg and tests pass with the atlas's existing ones;
- `identity` and `sd.ok`: the Forge, search and explore seats play the golden's four games, and nothing under
  `bridge/src` or `CubeLab.java` changed since J193's pin but D516's `Config.java`, D523's six search-seat files
  (behind a `rollout` key the atlas never passes) and the self-test;
- `dd.ok`: the data folder is absent (now made) or holds only J200's own files;
- `pc`: the embedded plan is the 82 + 24, on 53 night folders whose seeds, deck bytes and listings at d are the ones
  the nights played;
- `rt`: the reader gives the right reading on eleven synthetic sets (the judge better: SHOWN; Forge better: NOT SHOWN;
  no difference: INCONCLUSIVE; all ties; better on the random map only: NOT SHOWN with the random side above 0.5; 74
  valid still read, 73 INCOMPLETE; an errored row is no score; a drifted spine excluded and named; the reproduction
  read; tier 2 never in the verdict);
- `p` (D511's check and the lane's restriction on a real spine): the baseline game is the night's decision for
  decision, its listing at d12 the night's, the unit replays without divergence, exactly 10 Forge rows of options 0
  and 3 and no other option's or map's, at least 9 scored with values in {0, 0.5, 1}, and atlas.json's checks
  clean.

Read, not checked: `p.nightSame` of `p.nightCells`, the pilot's Forge rows against the night's same branch indices
(expected 10 of 10: the same position and the same seeds), and `p.means`.

## Commands
cores: 7
```bash
# tier 1: the 46 spines with a tier-1 decision (their tier-2 decisions ride along), longest first
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J200: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
test -f var/j200-tools/drive.py && test -f var/j200-tools/plan.jsonl
python3 -I var/j200-tools/drive.py run var/j200-tools/plan.jsonl /home/justin-a/code/lab/data t1 {workers}
```
cores: 7
```bash
# tier 2 only: the 7 spines whose every planned decision is a split one (information; never in the verdict)
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J200: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -I var/j200-tools/drive.py run var/j200-tools/plan.jsonl /home/justin-a/code/lab/data t2 {workers}
```
cores: 1
clean: var/j200/read.json var/j200/verdict.json var/j200/report.md
```bash
# the pre-registered reading, the reads beside it and report.md (numbers only; the PC session writes the summary)
python3 -I var/j200-tools/read.py var/j200-tools/plan.jsonl /home/justin-a/code/lab/data/lab-j200 /home/justin-a/code/lab/data var/j200/read.json --boot 10000 --seed 200 --slim var/j200/verdict.json --report var/j200/report.md
cat var/j200/report.md
```
check: v.written == 1
check: v.complete == 1
check: v.valid >= 74
check: v.shown + v.notShown + v.inconclusive == 1
check: v.shown == 0 or (v.forge.shareLo > 0.5 and v.forge.gainLo > 0)
check: v.notShown == 0 or (v.shown == 0 and (v.forge.shareHi < 0.5 or v.forge.gainHi < 0))
check: replay_diverged == 0
check: v.checks.problems == 0
check: v.checks.leaks == 0

The checks hold the verdict file to the rule (exactly one reading, and each reading's own condition), and the run to
the atlas's own guarantees: no unit replayed another game (D511), no redaction or id problem, no leak. Any reading
passes them; a reading is not a failure. `v.complete` fails the job when fewer than 74 of the 82 tier-1 decisions are
valid: then there is no verdict, and the morning read names what was excluded (`v.excluded`) and why.

## Abort if
abort: branches >= 400 and branch_errors > branches / 10

Engine trouble only: past 400 Forge rows, the job stops if more than one in ten carries an error (the release's Forge
rows: 32 errors in 14,320). Nothing stops it on a result.

## Report
collect: var/j200/verdict.json
collect: var/j200/read.json
collect: var/j200/report.md
collect: /home/justin-a/code/lab/data/lab-j200/exits.txt
collect: /home/justin-a/code/lab/data/lab-j200/spine-times.txt

`report.md` is the job's own numbers. The PC session writes `summary.md` from it:
- **the reading under the rule**: KNOWLEDGE SHOWN, NOT SHOWN or INCONCLUSIVE (or INCOMPLETE, no verdict), with the
  share (better / worse / tied, the share of untied decisions and its interval) and the mean gain with its interval,
  and what it decides in this file's words (`decides:`). On KNOWLEDGE SHOWN, say that the outside-knowledge direction
  gets a design under its own decision and that nothing changed here. On NOT SHOWN, say which half fired (the share's
  upper end, the gain's, or both). On INCONCLUSIVE, give the widths and say plainly that an interval including 0 is
  not "no knowledge";
- **the random map beside it**, the same decisions and pairs, with the confident filter's bias said in one line; and
  the Spearman correlation between the two maps' gains per decision: how far the random map's verdict on a decision
  predicts Forge's;
- **where it came from**: by kind (priority, attack, block), live decisions, both judges at confidence 3, and the
  largest gains and losses by decision with round 2's one-line reasons (picks.jsonl) for the five each way;
- **tier 2**: each judge's non-0 pick against option 0, and J1 against J2, as information;
- **the machinery**: valid decisions and what was excluded; the baselines that were the night's game; the
  reproduction of the night's Forge rows (cells the same of cells compared, expected all); errors, timeouts, the
  turn cap's draws; the checks; worker-hours and the walls from `spine-times.txt`.

Never write "no effect" or "the judge knows nothing" for an interval that includes 0, and never pool these Forge
rows with a night's: they are a measurement of two options at 82 decisions, not labels.
