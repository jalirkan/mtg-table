id: J182
title: The move atlas, rung 4b, night seven -- J181's night carried onto the new main (D498: the determinizer keeps every card the seat may look at where it is and redeals only what it cannot see -- the shape that failed J181's s07; D499: a killed attempt's rows are abandoned, never audited -- J181's s13; D500: the fork carries the damage-this-turn history -- J181's s06) on J177's design, unchanged (D489's futility stop at the 50-branch checkpoint with a 0.25 control share, `--futility 0 --futility-tie 0 --futility-sample 0.25`; the 150 cap, `--branch-random 150 --early-stop 50,100`; `--decisions 10`; the Forge map on s01, s07 and s13; chunk 25); 13 NEW spines (breadth over depth) drawn by the pilot into a NEW data folder, lab-j182, at deck seeds 2401-2413 (D447 with D482's list as D490, D492 and D494 leave it, the bands cycled as J166's) and game seeds 2501-2513; a validation draw made fresh at deck seeds 2601-2613 (game seeds 2701-2713 reserved); THE FIRST NIGHT OF D498'S POPULATION, pooled with nothing before it; J181's night read beside, by position, as information
public_title: Move atlas 4b night seven: 13 new spines, D498-D500 lab fixes, a new population
public_est: ~8 h to 12 h
public_decides: None by itself; first night on the D498 determinizer, a new population
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2.7
repos: mtg-table@ac07876b97e052b3e0ddd530a1930173e998133c (origin/main: the merge of pc/d498, pc/d499, pc/d500 and pc/d501 (D498-D501) on 60177314 (D497's merge, on 7a984963, D496's); the coordinator writes that merge's full sha here before posting; merged == 1, the commits that added D481-D501's decision files, D493's, D495's, D496's, D497's, D498's, D499's, D500's and D501's names, the seat's code and the deck code exactly as this file states them, checked by the pilot)
decides: nothing by itself. Rung 4b's seventh night, the fifth on D489's futility stop with the review's 150 cap, and **the FIRST of D498's population**. **What changed under the seat since J181:** the fork, in two places, and a reader. The random seat's POLICY is D488's, as J173's, J177's, J180's and J181's, the recorder is D496's and the copier's paper-card carry D497's, as J181's; **what changed is the redeal and the damage history on the fork** (D498, D500): `Determinizer` keeps every card the searching seat may look at where it is (a card revealed on top of the opponent's library stays on top; a revealed hand card stays in the hand) and redeals only what the seat cannot see, where before it pooled the opponent's whole hand and library and could deal a known top card into the hand, still marked lookable -- so a branch's redealt world now agrees with the seat's own log (J181's s07: 48 of decision 14's 150 branches showed a named card in a hand with no reveal record, and the checker failed 51 logs); and `LenientGameCopier` carries the game's damage-this-turn history onto the copy, so a `DamagedBy` property on a forked board reads it instead of dereferencing a null (J181's s06: 3 branches). D499 changes no play: a killed attempt's rows (a `begin` with no `end` whose key another worker played to its end) are abandoned and counted, never audited or read (J181's s13). `git diff 7a984963 <pin> -- bridge/src` is exactly the files `seat_code` lists, and `fixtures/cubelab/seat-identity.json` is unchanged since D486's regeneration (a pilot check, `seat_code`; `identity == 1` stays the real check). **Comparability, the rule this night follows:** D489 pools nights across a change to HOW MANY branches a decision gets, and says "A future change to the seat or to what it offers does" open a new population; D493 and D497 opened populations when the copier changed what a branch plays, and D498 changes the redealt world a branch plays in wherever the seat may look at an opponent's card. So **J182's labels and reads are D498's population's first night: pooled with nothing -- a new `pool`, `random-<band>-d498`, a new `randomSeat: "D498"`; never with J181's v6 rows (D497's population), J177's and J180's (D493's), J173's v5 rows (D488's) nor anything before them**; the contract stays v6 (J177's fields, unchanged). It measures, on J177's design: labels, confident labels and partial labels per spine and per night; the futility read (the controls: how many of the decisions the rule would have stopped end confident at the full n -- the first read of this population, J181's 0 of 13, J180's 0 of 14 and J177's 0 of 12 beside it as information, with the review's 3 of 77); the cap read (the share of the final confident set already confident at 50 and 100 branches); the sizing read (confident labels per worker-hour and per 7-worker 10-h night with its Poisson interval, beside J181's 0.464, J180's 0.551 and J177's 0.563 [their intervals in their `reads.json`] and the review's ~46 as information); the decisions branched a spine; the cuts' savings, the checks' share, the refused payments and D484-D488's counters as J173 reads them; C1 and agreement on the three Forge-map spines; **each spine beside J181's at the same position (other decks, the same seat policy, the same branching design, the fork changed): a candidate, never a verdict**; and, by hand at the morning read, the field signals of D497 (no `paperCard` in any errored branch's stack, no bare exception in any worker log), D498 (no A6 failure of the checker on any branch log: the morning read's redaction sweep), D499 (`abandonedPlays` named in `atlas.json` if any unit was re-run, and no id problem from a killed attempt's rows) and D500 (no `getDamageLKI` in any errored branch's stack)
hypothesis: none to confirm about the maps. Registered expectations, as information: **the problem classes that failed J181 do not recur, J180's and J177's did not recur on J181, and J176's four stay away** -- a card the seat may look at stays where the seat knows it is on every fork and no branch log shows a full card in a hidden zone without a reveal record (D498: the determinizer's bench scenario fails on main's and passes on the pin's); a killed attempt's rows are abandoned and no id audit reads them (D499); a `DamagedBy` property on a forked board resolves (D500: the copier's bench scenario); a `CopyPermanent` effect choosing a token on a forked board resolves (D497), and every errored branch, if any, names its site in the worker log; a cascade's "cast it?" choice inside a held frame carries the engine's own `reveal` line and the checker accepts it (D496); no deck holds a Prepare card or Ob Nixilis, the Adversary (D492, D494; `deck_code`); a forced Plotted or Foretold cast from exile maps on the fork (D493); a target naming a spell copy on the stack passes (D495) -- so `atlas.problems == 0` is expected, though a random library deck can meet a tool gap no atlas has met (the check fails the night then, as it failed J181's on 9 across two faults, J180's and J177's on one each and J176's on 22); the rule reads ~105-155 decisions at 50 and stops about a quarter, a quarter of the futile ones played on as controls (J181: 153 read, 35 stopped, 13 controls, 0 partial rows confident; J180: 105, 29, 14, 0; J177: 121, 29, 12, 0); no option has its own forced cast refused in most of its branches and no lost-cast option (checks, J173's); 0 legacy null target records (a check); refused payments, `cardTargetShare` and the target records' complete share near J181's and J180's (read beside, not predicted); J181's yield, 23 confident of 80 labels, 0.464 confident labels a worker-hour on 49.6 worker-hours, J180's 0.551 on 43.6 and J177's 0.563 on 53.3 are other populations' and are read beside, never predicted; the walls ~8.5 h at 6 workers for all 13 at J181's pace (29,764 s of walls, 29,817 s from its first spine's start to its last's end; *Sizing*)
rule: D451 (method; no outcome rule) with D458/D462/D466 (G5), D459, D465, D466, D467, D470, D471 (G6), D472, D476, D477, D478, D479, D480 (the cuts) and its follow-up (the schedule's plan-hash guard), D481, D482, D483, D484, D485, D486, D487, D488 (the seat's policy, unchanged since J173), D489 (the futility stop, J177's flags), D490, D492 and D494 (the engine-unplayable list: Chain of Smog, the four Prepare cards, Ob Nixilis, the Adversary), D491 (the rows check knows the viewer's born token), D493 (the copier carries the plotted flag and a public card's turn in its zone: the population J177 opened), D495 (the redaction checker accepts a spell copy on the stack) D496 (the seat's log records what the engine revealed to it; the checker accepts an option revealed in the step), D497 (the fork's copy gives a re-made token its original's paper card; every lab worker keeps a hot exception's stack), D498 (the determinizer keeps what the seat may look at in place: the population J182 opens), D499 (a killed attempt's rows are abandoned) and D500 (the fork carries the damage-this-turn history); D447 (the deck draw). Pre-registered here, before any J182 data: J177's label contract v6 and its reads (a)-(c) and the futility read (f) computed by var/lab-j182-local/bin/labels.py, the cap read by ncurve.py, the agreement reads (i)-(vi) by reads.py, the savings, the checks' share and what the saved time bought by cuts.py, the tool's counters, the refused and lost casts and D486-D488's counters by metrics.py, the comparison with J181 by compare.py, all exactly as written in the pilot and every definition J177's; the final checks J177's, unchanged: `refusedCastOptions == 0`, `lostCastOptions == 0` and `legacyNullTargetRecords == 0` over the 13 scanned spines, D489's four counters on every spine, `partialLabels == futileStopped`, no partial row confident, and `atlas.problems == 0`. A candidate of (iv) HOLDS on a spine only if its point is > 0 and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. Every other difference is a candidate (D447 point 9). No read carries any other verdict
followup: morning-read
est: ~9.5 h at 6 workers (range 6-12 h; sizing below): pilot ~40 min (J173's ~35 plus the readers' self-tests, the cap read on J171's night ~1 min); the 13 spines ~8.3 h at J181's pace (13 x ~38 min; J181's ran 5.8 to 97.0 min); the scan ~6 min; the report ~5 min. Disk ~11-15 GB on the lab data folder /home/justin-a/code/lab/data (J171's 13 spines: 12.4 GB)
resumable: yes
timeout: 3h
progress: lines /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/branches.jsonl of 64000
metrics: branches = lines /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/branches.jsonl
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/branches.jsonl "\"engineError\":true"
metrics: branch_timeouts = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/branches.jsonl "\"timedOut\":true"
metrics: unavailable = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/branches.jsonl "\"unavailable\":\""
metrics: trimmed_rows = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/branches.jsonl "\"targetCountTrimmed\":"
metrics: avoided_rows = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/branches.jsonl "\"costTargetAvoided\":"
metrics: modes_drawn_rows = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/branches.jsonl "\"modesDrawn\":"
metrics: retargeted_rows = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/branches.jsonl "\"retargeted\":"
metrics: futility_reads = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/schedule.jsonl "\"type\":\"futility\""
metrics: futile_stopped_lines = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/schedule.jsonl "\"stopped\":true"
metrics: futile_control_lines = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/schedule.jsonl "\"control\":true"
metrics: unit_errors = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/units.jsonl "\"ok\":false"
metrics: failed_to_play = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/logs/*.log "AI failed to play"
metrics: payfail = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/logs/*.log "Didn't find what to pay for"
metrics: failed_to_target = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/logs/*.log "failed to target"
metrics: branch_error_stacks = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/logs/*.log "branch error, stack:"
metrics: big_frames = sh: python3 -c "import glob, os; print(sum(1 for f in glob.glob('/home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/frames/*.gz') if os.path.getsize(f) > 2e8))" 2>/dev/null || echo 0
metrics: armed = sh: cat var/lab-j182-local/armed.txt 2>/dev/null || echo 0
metrics: atlas = sh: python3 -I var/lab-j182-local/bin/metrics.py 2>/dev/null || echo '{"problems":-1}'
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: data_used_gb = sh: python3 -c "import os; print(round(sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk('/home/justin-a/code/lab/data/lab-j182') for f in fs) / 1e9, 2))" 2>/dev/null || echo 0
headline: branches, atlas.spinesDone, atlas.labels, atlas.confident, atlas.partialLabels, atlas.futileStopped, atlas.futileControls, atlas.confidentPerWorkerHour, atlas.confidentPer7Worker10hNight, atlas.refusedCastShare, atlas.refusedCastOptions, atlas.failedToPlay, atlas.cardTargetShare, atlas.lostCastOptions, atlas.legacyNullTargetRecords, atlas.timeoutShare, atlas.problems

**Why J182.** J181 (rung 4b, night six, the first of D497's population; posted 2026-11-01 11:40 EST, finished 20:02 EST after
30,589 s) played all 13 spines and its Report: 153 branched decisions, 80 labels, 23 confident, 35 partial, 13 controls (0 of them
confident at the full n), 0.464 confident labels a worker-hour [20.6, 48.7 a 7-worker night], all 13 spines at 6 workers, 29,764 s of
walls (8.3 h). **Two checks failed**, and each is a lab fault repaired by a decision merged since J181's pin (60177314):
- **`atlas.problems == 0` failed on 9 problems, two faults.** (a) **s07** (legacy, 2085/2185): the opponent cast Oracle of Mul Daya at
  turn 11, so card 44 sat revealed on top of its library (the seat's log lists it there, A3); every branch forked after that redealt
  card 44 with the hidden pool, and in 48 of decision 14's 150 branches it landed in the opponent's HAND, still marked lookable, so the
  branch log's first frame showed a full named card in a hand with no reveal record and `tools/check-redaction.mjs` failed 51 logs (A6).
  Not a new leak -- the seat had seen the card -- but a determinization that contradicts what the seat knows (the card is on top of the
  library, not in the hand) and a log that breaks the checker's law. **D498** repairs the Determinizer: a card the searching seat may look
  at stays where it is; only what it cannot see is redealt. (b) **s13** (pauper, 2091/2191): unit `d28-forge-25` hung on its first
  attempt (Forge's AI evaluation looped; the unit watchdog killed it after 1800 s), D465's re-run replayed branch b39 on another worker,
  and the killed attempt's 57 rows (a `begin` with no `end`, naming a card id only that play had) stayed in its rows file; the id audit
  merged both plays' rows and reported 8 problems against the re-run's log. **D499** repairs the rows readers: a game's rows are the rows
  between a `begin` and its `end` in one file, and a killed attempt's are abandoned and counted, never audited.
- **`atlas.poolOk == 13` failed with 0**: a derivation fault of J181's own file, not the night's -- its `poolOk` metric still compared
  `'random-%s-d493'` after the population moved to d497 (the regex that moved every other spelling missed the `%s` form), so the check
  could not pass. This file's derivation covers that form and greps itself for every old population token before it is written.
- **3 branches errored in s06** (peasant, 2084/2184, decision 19), with full stacks (D497's flag): `Game.getDamageLKI` returned null in a
  `DamagedBy` property during a replacement check on a forked board -- Forge's `GameCopier` copies each entity's damage-this-turn pairs but
  not the game's identity-keyed LKI map behind them. Under the 50-error bar, not a problem; **D500** repairs the copier for it.
- D497's two field signals held: no branch errored with `paperCard` in its stack, and no bare exception in any worker log.

J182 is J181's night carried forward onto that main: the same design, the same pilot, the same reads and checks, 13 new spines at the
next seeds in a new folder, `lab-j182`. J181's own outputs stay in `lab-j181/` and are read only, for the J181 columns. **J182 opens a
NEW population** (D498 changes what a branch plays wherever the seat may look at an opponent's card: the redealt world now keeps that
card in place; D493's and D497's precedent applies), so nothing of J182's is pooled with J181's or earlier; they are read beside, by
position, as information.

**Before posting -- the coordinator, by hand (nothing in this file does them).**
1. **The data folder, empty:** `/home/justin-a/code/lab/data/lab-j182` already exists (made 2026-11-01 21:28 EST, empty when this was
   drafted). Check it is still empty (`ls -A` prints nothing); if it is gone, `mkdir` it. The pilot stops at its first lines if it is
   missing, and records once (`state`) that it holds nothing (or only this job's own pilot outputs, `decks/`, `validation/` and
   `pilot-smoke-j182/`, from an earlier J182 pilot); it draws only a folder that is absent and never creates, moves, cleans or deletes
   anything there; no block of this job has a `clean:` line.
2. **The pin is written:** `ac07876b97e052b3e0ddd530a1930173e998133c`, the merge of `pc/d498`, `pc/d499` and `pc/d500` on origin/main (2026-11-01, gated once on the merged
   tree from a deleted `bridge/out`; the line is in the merge commit's message). `runner.sh check` would not catch a placeholder here; it
   is written by hand from `git rev-parse` of the pushed merge, and `grep -c PIN_SHA` on this file must print 0 before posting.
3. **If the merge of D498, D499 and D500 renamed or changed anything this file reads, correct it before posting** (drafted against the
   lanes' commits in `/home/justin-a/code/mtg-table-d498`, `-d499` and `-d500`, on main's 60177314): the three decision files, the
   names each `has_d49x`/`has_d500` grep reads (the pilot's lines), and **the merge changes `bridge/src` in exactly the files `seat_code`
   lists and nothing under `fixtures/cubelab/seat-identity.json`, `tools/cubelab/deckcensus.ts`, `cubes/library/` or
   `tools/cubelab/engine-unplayable.json`** (`git diff 60177314 <pin> --stat`); if the merge differs, re-derive the guard from the new
   diff and write here what it now accepts -- never loosen it to pass. D497's and D496's names (their item 3 on J181 and J180) are
   checked unchanged by `has_d497` and `has_d496`.
4. **J181 has ended** (failed on `atlas.problems == 0`, 9 problems across two faults, and on `atlas.poolOk == 13`, its own derivation
   fault; its Report written: `lab-j181/report/labels.json`, `reads.json`, `compare-j180.json` and the rest). J182 reads lab-j181
   read-only, for its J181 columns; nothing waits on another job, so there is **no `after:` line**. J181's job file needs nothing.
5. **`--decisions` stays 10.** J177's optional re-size (its item 5) is not carried: J182 compares with J181 position by position, and a
   second change beside the new decks and the new fork would make every difference ambiguous among the three.
6. **Nothing else to make, move or clean.** J182 reads lab-j170 (J171's night), lab-j181 (J181's), lab-j162 and lab-j158 for its
   readers' self-tests and comparisons and writes none of them; J177's 13 spine draws and its validation draw are registered below as
   constants (from J177's `var/lab-j177-local/draws-pilot.json` in the lab clone, read on 2026-10-31, J180's from
   `lab-j180/report/draws.json` and J181's from `lab-j181/report/draws.json`, read by this draft on 2026-11-01), so it reads no
   `var/lab-j1xx-local/` folder but its own. Post nothing that writes lab-j181 or lab-j182 beside J182.

**J177's design, unchanged, and its three choices with it** (J177's *Three choices this file makes*, from D489's skeptic review):
- **The saved time is spent, not banked**: `--decisions 10` (J173's 8 plus the futility stop's and the cap's saving; *Sizing*).
- **The control share stays 0.25**, not D489's default 0.1. J177 planned to drop to 0.1 "once the pooled control count is enough"; the
  count D498's population holds is 0 before tonight (D497's holds J181's 13, D493's J177's 12 and J180's 14, 0 of 39 confident, read
  beside); ~10-14 controls a night is too few to read on its own; 0.25 holds until this population's pooled count can carry the read.
- **The yield number to compare across nights is confident labels per worker-hour** (and per 7-worker 10-h night), **not the confident
  share** (the stopped futile decisions leave its denominator). Both are reported; the summary reads the per-hour one.

**So J182 is D498's population's first night, on new spines** (`decides:`): the seat's policy is D488's, the recorder D496's and the
copier's carry D497's, as J181's; the fork changed (D498's redeal, D500's damage history), so J182's labels pool with nothing before them
-- `pool: random-<band>-d498`, contract v6. **Breadth over depth:** 13 new pairs at the next 13 deck seeds (the bands cycled as J166's,
so s01 is pauper and s13 pauper again), into a new folder. **J181's numbers are a comparison by position, never a baseline**: s01 beside
s01 is the same band, the same seat policy and the same branching design, but other decks, other seeds and the fork before D498 -- every
difference is a candidate, and none can be put on D498 by itself. J180's, J177's, J173's and J171's nights stay other populations and
appear only in the readers' self-tests, their registered expectations and J177's sizing paragraph.

**The seeds are new, and the block jumped** (checked by this draft, 2026-11-01). J181's block plus 13 would have been 2092-2104 with
game seeds 2192-2204 and validation 2292-2304: deck seeds 2101-2104 and game seeds 2201-2204 are numbers J166-J170 drew as game and
validation seeds (folders `lab-j166/b-s04-powered-2104`, `lab-j170/b-s01-pauper-2101` ... `lab-j170/validation/v04-powered-2204` end
in them), so the "no folder ends in one of this block's" rule fails there, and the block jumps by 322 instead of 13 to the first block
clean on every count: deck seeds **2401-2413** (`$((2400 + K))`), game seeds **2501-2513** (the deck seed + 100), validation deck seeds
**2601-2613** (`$((2600 + K))`) with game seeds **2701-2713** reserved. `git -C /home/justin-a/code/mtg-table grep -n -w -E
'241[4-9]|242[0-6]|251[4-9]|252[0-6]|261[4-9]|262[0-6]|271[4-9]|272[0-6]' origin/pc-jobs -- jobs/` (origin/pc-jobs at a0d24c92, J181's
post) finds no seed of the block after this one, and this draft's own block appears in no job file and no draft as a seed (`2400` is a
game count in J052-J181's files, `2500` a deck count in J140's and J144's, and 2401 and 2708 sit in J170-J177's registered reads of
J168's and J171's nights as counts; none is drawn as a seed: K starts at 1); every computed seed in a
job or draft is `$((2000 + K))`, `$((2200 + K))` (2001-2013, 2201-2213), J173's `$((2013 + K))`, `$((2213 + K))` (2014-2026, 2214-2226),
J174-J177's `$((2026 + K))`, `$((2226 + K))` (2040-2052, 2240-2252), J178-J180's `$((2052 + K))` and `$((2065 + K))` (2053-2065 drawn
and never branched; 2066-2078 lab-j180's) or J181's `$((2078 + K))` (2079-2091, lab-j181's), with the older blocks' small ones below
1700; and no folder under `/home/justin-a/code/lab/data` (three levels deep) ends in one of this block's. Bases and literals were moved
together by one inclusive shift of J181's block ([2078, 2091] and its three companions, +322), skipping any number touching a letter or
hex digit, and every changed four-digit token was read in context (J171's registered `wallSec` 2282 fell in the validation range and was
restored by name): deck seeds `$((2400 + K))`, validation `$((2600 + K))`, game seeds the deck seed + 100. The smoke keeps J166's pair
(deck seed 2099) at game seed 2199, in a new folder, as every pilot since J167; that pair holds none of the six cards D490-D494 list, so
its draw on the list is J166's registered sha256.

## The decks

**The draw is D447's with D482's list**, as J167-J177's: `tools/cubelab.sh decks --band <b> --count 2 --seed <s> --cross-band 0.10
--out ...`, the committed list by default -- now seven cards: Scute Swarm (J166), Chain of Smog (J173, D490), Emeritus of Abundance,
Elite Interceptor, Emeritus of Ideation, Studious First-Year (J177, D492) and Ob Nixilis, the Adversary (J177, D494). **J182's pilot
draws them into lab-j182** (the 13 spine pairs onto `lab-j182/decks/`, the 13 validation pairs onto `lab-j182/validation/`, the smoke's
pair onto `lab-j182/decks/p-powered-2099/`), each only where its `decks.jsonl` is not yet there (a pilot re-run keeps the first draw),
and **again into the clone** (`var/lab-j182-local/redraw/`, an absolute path so nothing is re-rooted). The two must agree deck for deck;
the smoke's pair must be its registered sha256 (`edfdc861...`, J166's); and no spine draw may be one of J171's, J173's or J177's 13
registered draws, and the validation draw none of theirs (a guard against an unshifted seed; J177's are registered from J177's own
`draws-pilot.json`).

**The deck code is J171's pin's plus exactly D490, D492 and D494** (`deck_code`, the pilot): `cubes/library/` untouched since J171's pin
f2b4e9c2; `tools/cubelab/deckcensus.ts` differs from f2b4e9c2's in three lines out and six in and nothing else -- the header comment of
its point 5 (the list's cards and decisions named) and the doc comment and the error message of `parseEngineUnplayable` (D482/D492's
"a measured stall or fork crash"), the throw's condition unchanged -- the changed lines' sha256s registered; and
`tools/cubelab/engine-unplayable.json` is J171's pin's two-key list made seven, in this order: Scute Swarm unchanged, Chain of Smog as at
J177's pin (`since: "J173"`, D490), then Emeritus of Abundance, Elite Interceptor, Emeritus of Ideation, Studious First-Year (D492) and
Ob Nixilis, the Adversary (D494), each `since: "J176"`; and both files' blobs are main's 3d78fc18 blobs, byte for byte (the `about`
line's D492 sentence included). J177's guard accepted D490's one card; this one accepts D490's, D492's and D494's and nothing else.

**The sha256s are recorded, not registered.** These seeds were never drawn, and this draft runs nothing, so no value is known before the
pilot. The pilot writes them once into `var/lab-j182-local/draws-pilot.json` (`draws.py --record`), only when the data folder's draw
and the redraw agree on all 13 spines, all 13 validation pairs and the smoke's, and never over an earlier record; `draws.recorded == 1`
requires the file to equal the data folder as it lies. **Each spine block checks its own folder and both decks against that record
before it plays** (`deckcheck.py`), and the Report copies it (`draws.json`).

| spine | band | deck seed | game seed | Forge map | validation (deck seed / reserved game seed) | J181 at this position (the same seat policy and design, the fork changed: D498, D500; other decks): decisions branched, confident labels, wall |
|---|---|---|---|---|---|---|
| s01 | pauper | 2401 | 2501 | **40** | 2601 / 2701 | 2079 / 2179: 17, 0, 77.6 min |
| s02 | peasant | 2402 | 2502 | 0 | 2602 / 2702 | 2080 / 2180: 8, 0, 15.0 min |
| s03 | legacy | 2403 | 2503 | 0 | 2603 / 2703 | 2081 / 2181: 12, 4, 28.7 min |
| s04 | powered | 2404 | 2504 | 0 | 2604 / 2704 | 2082 / 2182: 11, 1, 15.9 min |
| s05 | pauper | 2405 | 2505 | 0 | 2605 / 2705 | 2083 / 2183: 13, 1, 41.2 min |
| s06 | peasant | 2406 | 2506 | 0 | 2606 / 2706 | 2084 / 2184: 14, 3, 25.3 min (3 branches errored, D500) |
| s07 | legacy | 2407 | 2507 | **40** | 2607 / 2707 | 2085 / 2185: 11, 5, 21.8 min (51 logs failed the checker, D498) |
| s08 | powered | 2408 | 2508 | 0 | 2608 / 2708 | 2086 / 2186: 14, 2, 54.2 min |
| s09 | pauper | 2409 | 2509 | 0 | 2609 / 2709 | 2087 / 2187: 12, 3, 51.1 min |
| s10 | peasant | 2410 | 2510 | 0 | 2610 / 2710 | 2088 / 2188: 15, 0, 23.9 min |
| s11 | legacy | 2411 | 2511 | 0 | 2611 / 2711 | 2089 / 2189: 5, 0, 5.8 min |
| s12 | powered | 2412 | 2512 | 0 | 2612 / 2712 | 2090 / 2190: 10, 1, 38.7 min |
| s13 | pauper | 2413 | 2513 | **40** | 2613 / 2713 | 2091 / 2191: 11, 3, 97.0 min (a hung unit re-run, D499) |

(J181's numbers from `lab-j181/report/labels.json`'s `bySpine`, `tool.json` and `spine-times.txt`, read only on 2026-11-01; all 13 at 6
workers. compare.py reads all 13 again at the Report.)

Folders: `lab-j182/decks/s<nn>-<band>-<deck seed>/` (decks `<band>-<deck seed>-0000{1,2}.dck`), `lab-j182/b-s<nn>-<band>-<game seed>/`,
`lab-j182/validation/v<nn>-<band>-<deck seed>/`.

**The validation draw is made fresh and never branched**: the same command at deck seeds 2601-2613 into
`lab-j182/validation/v<nn>-<band>-<seed>/`; game seeds 2701-2713 stay reserved for the job that branches them (J171's, J173's and J177's
validation draws stay theirs). A final check fails the job if any spine's plan names a validation deck or any validation folder holds a
plan or a phase B. The report records it (`validation.json`), with the sha256 the pilot recorded.

## The design: J177's, unchanged

The per-spine flags, J177's: `--phase b --decisions 10 --min-options 3 --screen 25 --early-stop 50,100 --branch-random 150
--branch-forge 40|0 --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs
{workers}` (the Forge map, 40, on s01, s07 and s13 only). Nothing changes against J177's: the cap and the checkpoints (the review's #1),
D489's stop at the first checkpoint with a quarter of the futile decisions played on as controls, 10 decisions, and the Forge map kept on
three spines for the agreement study (the review, section 3: it adds no label; a futile-stopped decision gets none). D480's other cuts with
D483's play count, D484's guard and D485-D488's seat policy are in the tree, unchanged since J173's pin; the fork under them is D493's.

**Sizing: J177's, unchanged; J181's walls beside it.** J181's 13 spines, all at 6 workers, took 29,764 s of walls (8.3 h; 5.8 to 97.0
min a spine, s13 the longest), 49.6 worker-hours, 53,300 branch rows, 153 decisions branched (11.8 a spine; J180's 105, 8.08). J177
measured the design: its 13 spines took 26,971 s of walls (7.5 h; s01-s05 at 6 workers, 9,454 s;
s06-s13 at 4, 17,517 s), 35.2 worker-hours, 49,425 branch rows, 110 decisions branched (8.46 a spine) -- with s03 and s10 cut short by
their crashes (71 s and 268 s) and s07's four dead decisions ending at the fork. The other eleven spines averaged 3.2 worker-hours, so a
night with all 13 played is **~41 worker-hours: ~6 h at 7 workers, ~7 h at 6, ~10 h at 4**, inside `est:`'s 6-12 h. D493 adds one
`checkStaticAbilities()` to nearly every copy (a playout runs one at every state check, D493 point 4), not measured as a wall; the walls
are read beside J177's. `timeout: 3h` bounds each block (J177's longest, s08, 78.7 min at 4 workers). A stall costs at most 3 h and fails
the job at that block; a runner retry resumes it (`resumable: yes`). **Disk** ~8-15 GB (J177: 7.4 GB); the pilot and every block
require 50 GB free, and `abort:` fires under 50 GB. ~64,000 branch rows when done (`progress:`, J177's estimate; J177 wrote 49,425 with
two spines short).

**What is expected of the rule on this night** (J177's measured, as information): 13 x 10 = 130 decisions, ~110 past the screen and read
at 50; about a third futile (J177: 39 of 110), a quarter of those controls (J177: 6) and the rest stopped (J177: 33 partial labels).
Neither is a prediction for these decks (*hypothesis*).

**Where it writes: the lab data folder, lab-j182**: every atlas and deck command runs under `LAB_DATA_DIR=/home/justin-a/code/lab/data`
with `--out var/lab-j182/...`. The Forge homes (`CUBELAB_HOME_ROOT=var/cubelab/homes-J182`), the self-test's folder, the redraw and the
job's scripts and caches (`var/lab-j182-local/`) stay in the clone. Every block asserts the path, the 50 GB and its own decks again; **no
`clean:`, nothing deleted**. A restart from scratch needs J182's outputs in lab-j182 (the `b-s*` folders, `report/`, `exits.txt`,
`spine-times.txt`, `pilot-smoke-j182/`) moved aside by hand and `var/lab-j182-local/state.txt` and `armed.txt` removed; the draws can stay
(and `draws-pilot.json` with them: a pilot never re-records). A resume under other futility flags is refused by the atlas itself (D489:
`cuts.futility` is in plan.json and the schedule's plan hash). **The atlas records no code version** (D493: `schedule.jsonl` holds the
plan and the decks' sha256, no git sha), so a phase B resumed across a code change would mix branches: the runner's retries check out the
pin the first `prepare` recorded, and nothing of J182's may be resumed on any other commit.

**The abort lines read only this run's artefacts (the J152 lesson):** every abort that reads the atlas's files is gated on `armed == 1`,
written by this pilot and removed by the Report block's last line; and every glob is under lab-j182's `b-s??-*-25??`, which only this
job writes.

**Nothing beside it.** `cores: 7` of 8 reserves the box: post nothing heavy beside it. No `pilot_cores:`. **No `after:` line** (*Before
posting* item 4).

## The refused casts, the lost casts and D484-D488's counters, from the frames

**J173's reading, unchanged** (`drafts/J173-atlas-4b-night-two.md`, the section of this name, as J177 carried it): metrics.py `--scan`
reads every branch frame log of a spine once, in a block of its own after the 13 spines (one cache a folder, stamped with its
`atlas.json`'s mtime and the scan's version, now `J182 v5` -- the same scan under this job's stamp; a cache of another atlas.json or
another version is never read). It places every cast: **ON THE STACK**; **REFUSED** (`castsRefused`; **forced** when the card is the
branch's own option and is put back before the branch's first AI decision record; **a refused-cast option** is one whose forced cast was
refused in more than half of its branch rows, and **`refusedCastOptions == 0` is a final check**); and J169's **LOST CAST** kept as
defined, split into `lostPutBack` and `lostStranded` (**`lostCastOptions == 0` stays a final check**). **The headline is
`refusedCastShare`** = the seats' own `refusedCast` (G5's count, an upper bound on the payment refusals: D488's Not fixed) over the
casts, per spine and for the night, beside `castsRefusedShare`, `staleRefused`, the worker logs' `AI failed to play <card>` lines
(`failedToPlay`, by card), `payFail` and `noRepeatRefused`; **by card, read twice** (the frames' put-backs and the worker logs), never
the worker logs' count alone. **D484-D488's counters** as J173 reads them: D488's `targetCountTrimmed`, `costTargetAvoided`; D486's
`cardTargetOffered`, `modesDrawn`, `cardTargetShare` and the target records with their `complete: true` share; D487's `target:none`
chosen and listed, `NO_TARGET`, null answers and **`legacyNullTargetRecords == 0`, a final check**; D485's `retargeted` /
`staleRefused` and `staleTargetRecords`; D484's `chooseSourceGuardRows`; and the branch rows' `...Rows` / `...OnRows`. **Self-tested on
J171's own night** (pilot, read only): the scan of lab-j170's s09 and s13 must give J173's registered numbers back, unchanged. A spell
copy on the stack (D495) is never a cast from the viewer's hand, so the scan neither counts nor misses one.

A futile-stopped decision's 50 random branches are scanned like any other; its later branches do not exist. **Beside J177's numbers**
(compare.py, the J177 column; another population), never predicted.

## The label set: the rung-4b contract, v6

`report/labels.jsonl`, one JSON row a **branched** decision of seat A on all 13 spines -- complete, screened, or futile-partial: every
row is kept -- written by labels.py, `contract` **`mtg-table rung-4b label v6 (J177)`** (J177's contract, unchanged: the fields are
J177's, the population is told by `pool`, `randomSeat` and `sha`), `v: 6`: every v5 field (J173's; J170's v4; J169's v3; J167's v2;
J166's v1) and J177's v6 fields, and:

| field | value |
|---|---|
| `sha` | **the pin** on every row (`var/lab-j182-local/sha.txt`, 8 hex) |
| `pool` | **`random-<band>-d498`**: D498's population, never J181's `random-<band>-d497`, J177's and J180's `random-<band>-d493` nor J173's `random-<band>-d488` (`decides:`) |
| `randomSeat` | **`"D493"`** on every row: the decision that opened the population (labels.py's `--seat` default, now D493; J177's rows say "D488"). The seat's policy is D488's |
| `branchRandom` | the plan's random-branch count, **150** on every row (J177's) |
| `partial`, `stoppedAt`, `stopWhy` | J177's (D489): `true`, the checkpoint's branch count (50) and `"futile"` on a decision the futility rule stopped; `false`, null, null elsewhere |
| `futilityControl`, `futilityGap` | J177's (D489) |
| `fullN`, `branchedInFull` | J177's: option 0's random branch rows, and whether the row is complete with `fullN >= branchRandom` |

- **`complete` and `confident` are J177's, unchanged**: `confident` = complete and the random `regretLo` > 0; a partial row is never
  complete, so never confident (a final check holds `confidentPartial == 0`).
- **`labels` is the count of complete rows**, `partialLabels` the partial rows, `branched` all rows (J177's).
- `training: true`, `split: "train"` on every row, partial rows included (a reader that drops them filters on `partial`, D489). **Never
  pooled with J177's v6 rows, J173's v5 rows, or v1-v4** (D493, *Comparability*; `decides:`): a model that reads several nights splits
  on `pool` (or `randomSeat`, or `sha`).
- **Expected: 0 void labels** (D470's `void`), 0 `lostCastVoid`, 0 `refusedCastVoid`.
- **Nothing is cleaned**: rung 4 reads the spine folders through each row's paths. `labels.jsonl` is collected.

## Pre-registered reads (numbers only)
J177's reads, definitions unchanged, over **all 13 spines**:
- **(a)-(b)** the confident share (pooled pool -> spine -> decision, by pool, by spine, by kind, by k, over Q), the gap, the regret, the
  settled share (labels.py), over complete rows. **The confident share is not this night's yield number**: the futile decisions it no
  longer holds would have lowered it.
- **(c) the sizing read** (`c_sizingRead`): labels and confident labels per spine, per pool and for the night at the measured walls
  (spine-times.txt, checks included), scaled to **7 workers and a 10-h night**, with the confident count's exact Poisson 95% interval
  scaled the same way (`poisson95`), and **`confidentPerWorkerHour`** (confident labels over the walls times the workers): **the number
  to compare across nights.** Beside it, **as information: J181's** (read from `lab-j181/report/labels.json` at the Report, `--j181=`;
  ANOTHER POPULATION -- the fork before D498 -- the same design, other decks: 0.464 a worker-hour on 49.6 worker-hours; J180's 0.551, J177's 0.563) and **the
  review's ~46 [41, 51] a 7-worker night** (32.8 x 1.39 [1.25, 1.55], no controls). The per-hour one named as the one to read. No
  verdict.
- **(d) the cuts' savings and what the saved time bought** (cuts.py, J177's): the branch time saved by early stopping and the screen,
  the idle share, the checks' wall and share, the redaction checker's wall, **the futility stop's saving** (`futileSavedMs`) and **the
  cap's** (`capSavedMs`, against a 200-branch design, J173's, a definition), their share (`futilityCapShare`), and the decisions
  branched a spine, beside J177's (compare.py).
- **(f) the futility read** (labels.py `f_futilityRead`): the decisions read at 50, the futile ones, the stopped ones (`partialLabels`)
  and **the controls and how many of them ended confident: the rule's measured loss**, its share with an exact (Clopper-Pearson) 95%
  interval, beside **the review's 3 of 77 (.04)**; the labels lost estimated from it. **This night's numbers are the FIRST contribution
  to D498's population's pooled read** (`pooledInputs`); J181's 0 of 13 (D497's population), J177's 0 of 12 and J180's 0 of 14
  (D493's) are read beside, as information, never added.
- **(g) the cap read** (ncurve.py, `report/ncurve.json`): at n = 50, 100 and 150, the share of the final confident set already confident
  (`keptShare`) and the expected confident count, beside the review's n curve (54%, 68%, 87% at 50 / 100 / 150 of a 200-branch design);
  150 is the final n, so the read is the curve below it.
- **(iv) C1 "cast now where Forge passes" on s01, s07, s13**: HOLDS / NOT SHOWN by the registered rule, over complete decisions; **(i)-(iii)**
  same best, rho, regret by kind on the three Forge-map spines; C2 and the random-map C1 on the other ten as information.
- **(v)** the guardrails per spine and per pool; **(vi)** the sizing line per spine (reads.py).
- **(ix) D483**, **(xii) D484**, **(xiii) D485**, **(xiv) the refused casts and the lost casts** (`refusedCastShare` the headline;
  **`refusedCastOptions == 0` and `lostCastOptions == 0`, checks**), **(xvi) D486** (`cardTargetOffered >= 1` a check), **(xviii) D487**
  (`legacyNullTargetRecords == 0` a check), **(xix) D488**, **(xx) D489's counters** (checks: the four counters on every spine,
  `partialLabels == futileStopped`, no partial row confident): J177's, unchanged.
- **(xvii) J182 beside J181, BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY AND DESIGN, THE FORK CHANGED (D498, D500)** (compare.py,
  `report/compare-j181.json`; J181's column computed from its folders and report with the same code): per spine position and for the
  night, decisions listed per baseline turn, decisions branched, branched in full, partial labels, options per decision branched, labels,
  confident labels, the confident share, **confident labels per worker-hour**, the mean regret at Forge's choice, the capped share, the
  branch games and the wall. **A candidate, never a verdict**: the decks differ at every position, so no difference is D498's by
  itself, and J181's s07 carries the redeal gap D498 closes.
- **(xi)** the draws and the redraw (pilot); the validation draw (final checks).
- Everything else is a candidate (D447 point 9).

**Outputs** (on the data folder, `/home/justin-a/code/lab/data/lab-j182/`).
- `decks/s<nn>-<band>-<seed>/`, `decks/p-powered-2099/`, `validation/v<nn>-<band>-<seed>/` (the pilot's draw).
- `b-s<nn>-<band>-<seed>/` (the 13 spines), `pilot-smoke-j182/` (the smoke).
- `exits.txt`, `spine-times.txt`.
- `report/`: `labels.json`, `labels.jsonl`, `labels-head.jsonl`, `ncurve.json`, `reads.json`, `cuts.json`, `tool.json`,
  `compare-j181.json`, `lost-<folder>.json` (13), `draws.json`, `validation.json`, `spines.json`, `<spine>.atlas.json` and `.atlas.md`,
  the two text files, `missing.txt`. Never `summary.md` or `metrics.json`.
## Pilot
About 40 minutes: J177's pilot on the new main. The data folder (it must exist, holding nothing at the first pilot) and the abort gate;
the pin carries D466-D489 (J177's greps, unchanged), **D493** (`has_d493`: the decision file, `ZONE_TURN_CARRIED`, `carryCastability`,
`plottedCarried()` and `zoneTurnsCarried()` in `LenientGameCopier.java`, the `copy-plotted` scenario in `tools/ai-bench/AiBench.java`) and
**D495** (`has_d495`: the decision file, the checker's `copyEnd` window and its stats line `M55 decision ids that are spell copies on the
stack=`, three of its controls: two files and two `REQUIRED` rows), **D496** (`has_d496`: the decision file, the checker's stats line
`M55 decision ids revealed to the seat, then moved where it sees them=`, two of its controls and two `REQUIRED` rows, the `cascade-reveal` scenario, the
bridge's `reveal(` override and the recorder's `"reveal"` line), the commits that added D481-D496's decision files, **the seat's code exactly
J173's plus D493's and D496's** (`seat_code`: D495's merge is an ancestor of the pin, since it `bridge/src` changed in D496's six files
only and the seat-identity golden not at all, and since J173's pin `bridge/src` changed in those six and D493's two only), the seat-identity golden D486 regenerated (`golden`, three
parts; `identity == 1` stays the real check) and **the deck code of J171's pin plus exactly D490, D492 and D494** (`deck_code`); the node
tests and the redaction checker's selftest (D495's controls among them); the readers' self-tests (J162's and J158's, and **J171's
own night in lab-j170**: labels.py, reads.py, cuts.py, compare.py, metrics.py and ncurve.py must give J171's registered numbers back); the
scan's self-test on J171's s09 and s13; J177's night read as information (`j177`: what its report holds); the deck draws into lab-j182 and
the redraw into the clone, which must agree, recorded once, and differ from J171's, J173's and J177's; the two engine self-tests
(`atlas-selftest` with its futility control and futile stop; `seat-identity`, now on D493's copier); the readers on the self-test's three
cuts legs; a 1-spine smoke with the futility stop on (J166's smoke pair at game seed 2199, `pilot-smoke-j182`, J177's smoke flags), which
must carry D489's four counters and plan.json's `cuts.futility` `{at: 0, tie: 0, sample: 0.25}`, and its frame scan.
```bash
# the lab data folder: exactly /home/justin-a/code/lab/data (README safety rules); lab-j182 made empty by the owner, never by this job
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J182: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import json, sys; v = json.load(open('config.json')).get('labDataDir'); sys.exit(0 if v in (None, '', '/home/justin-a/code/lab/data') else 'J182: config.json labDataDir is %r, not /home/justin-a/code/lab/data' % v)"
test -d /home/justin-a/code/lab/data/lab-j182 || { echo "J182: /home/justin-a/code/lab/data/lab-j182 does not exist: the owner makes it, empty, before posting; this job never creates it" >&2; exit 1; }
mkdir -p var/lab-j182-local/bin
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; print('J182: data folder free GB', round(f, 1)); sys.exit(0 if f >= 50 else 'J182: under 50 GB free on the data folder')"
echo 1 > var/lab-j182-local/datadir.txt
# state: what lab-j182 held at this job's first pilot, recorded once (a later pilot run keeps the first answer): 1 when it holds nothing, or
# nothing but this job's own pilot outputs (decks/, validation/, pilot-smoke-j182/, from an earlier J182 pilot). Else 0, and nothing is drawn
test -f var/lab-j182-local/state.txt || python3 -I -c "import os; d = '/home/justin-a/code/lab/data/lab-j182'; print(1 if os.path.isdir(d) and set(os.listdir(d)) <= {'decks', 'validation', 'pilot-smoke-j182'} else 0)" > var/lab-j182-local/state.txt
# found (information, recorded once): what lab-j182 held at the first pilot
test -f var/lab-j182-local/found.json || python3 -I -c "import glob, json, os; d = '/home/justin-a/code/lab/data/lab-j182'; print(json.dumps({'entries': sorted(os.listdir(d)), 'spineDraws': len(glob.glob(d + '/decks/s??-*/decks.jsonl')), 'validationDraws': len(glob.glob(d + '/validation/v??-*/decks.jsonl')), 'smokeDraw': len(glob.glob(d + '/decks/p-powered-2099/decks.jsonl')), 'smoke': 1 if os.path.isdir(d + '/pilot-smoke-j182') else 0}))" > var/lab-j182-local/found.json
echo "J182: lab-j182 at the first pilot: state $(cat var/lab-j182-local/state.txt), $(cat var/lab-j182-local/found.json)"
test "$(cat var/lab-j182-local/state.txt)" = 1 || { echo "J182: lab-j182 held more than this job's own pilot outputs at this job's first pilot (var/lab-j182-local/state.txt): nothing drawn" >&2; exit 1; }
# the abort gate (the J152 lesson): this job's own run is armed from here; the Report block disarms it
echo 1 > var/lab-j182-local/armed.txt
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j182-local/merged.txt || echo 0 > var/lab-j182-local/merged.txt
git rev-parse --short=8 HEAD > var/lab-j182-local/sha.txt
# D466-D486: J171's greps, unchanged
grep -q 'chosenOptionalCosts' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'class StepClock' bridge/src/mtgtable/ai/Atlas.java && grep -q 'class OptionUnavailable' bridge/src/mtgtable/ai/RolloutController.java && grep -q 'zeroXLeftOut' bridge/src/mtgtable/ai/Explorer.java && grep -q 'restoreChoices' bridge/src/mtgtable/ai/Explorer.java && grep -q 'copyCandidates' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'COUNTED_GUARDRAILS' tools/cubelab/atlas.ts && grep -q 'unit-timeout' tools/cubelab/atlas.ts && grep -q 'empty-hand-ok' tools/check-redaction.mjs && echo 1 > var/lab-j182-local/has-d466-d472.txt || echo 0 > var/lab-j182-local/has-d466-d472.txt
grep -q 'D476' bridge/src/mtgtable/ai/SearchPolicy.java && echo 1 > var/lab-j182-local/has-d476.txt || echo 0 > var/lab-j182-local/has-d476.txt
grep -q 'final class ForkRestart' bridge/src/mtgtable/ai/ForkRestart.java && grep -q 'branchRestarted' tools/cubelab/atlas.ts && echo 1 > var/lab-j182-local/has-d477.txt || echo 0 > var/lab-j182-local/has-d477.txt
grep -q 'BRANCH_CAPPED_WARN_DEFAULT' tools/cubelab/atlas.ts && grep -q 'export function cappedBranches' tools/cubelab/atlas.ts && echo 1 > var/lab-j182-local/has-d478.txt || echo 0 > var/lab-j182-local/has-d478.txt
grep -q 'effectSourceNull' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'exileLinksLost' bridge/src/mtgtable/ai/Atlas.java && grep -q 'exileLinksLost' tools/cubelab/atlas.ts && echo 1 > var/lab-j182-local/has-d479.txt || echo 0 > var/lab-j182-local/has-d479.txt
grep -q 'export class AtlasSchedule' tools/cubelab/atlascuts.ts && grep -q "export const EARLY_STOP_ON = \[50, 100, 150\]" tools/cubelab/atlascuts.ts && grep -q 'export const SCREEN_LOW = 0.04' tools/cubelab/atlascuts.ts && grep -q 'export async function redactionCheckParallel' tools/cubelab/censusplay.ts && grep -q 'holdIdle' tools/cubelab/engine.ts && grep -q 'SELFTEST_CUTS' tools/cubelab/atlas.ts && test -f web/test/cubelab-atlas-cuts.test.ts && echo 1 > var/lab-j182-local/has-d480.txt || echo 0 > var/lab-j182-local/has-d480.txt
grep -q 'export function openSchedule' tools/cubelab/atlas.ts && grep -q 'SCHEDULE_PLAN_KEYS' tools/cubelab/atlas.ts && echo 1 > var/lab-j182-local/has-d480f.txt || echo 0 > var/lab-j182-local/has-d480f.txt
ls docs/decisions/D481-*.md >/dev/null 2>&1 && grep -q 'enteredBetweenFrames' tools/check-redaction.mjs && test -f fixtures/negative/redaction/m55-option-entered-between-frames.jsonl && echo 1 > var/lab-j182-local/has-d481.txt || echo 0 > var/lab-j182-local/has-d481.txt
ls docs/decisions/D482-*.md >/dev/null 2>&1 && test -f tools/cubelab/engine-unplayable.json && grep -q '"Scute Swarm"' tools/cubelab/engine-unplayable.json && grep -q 'engine-unplayable.json' tools/cubelab/deckcensus.ts && grep -q 'engineSkips' tools/cubelab/deckcensus.ts && echo 1 > var/lab-j182-local/has-d482.txt || echo 0 > var/lab-j182-local/has-d482.txt
ls docs/decisions/D483-*.md >/dev/null 2>&1 && grep -q 'public static String playIdentity' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'identities' bridge/src/mtgtable/ai/Atlas.java && grep -q 'export function playCount' tools/cubelab/atlascuts.ts && grep -q 'export function repeatedPlays' tools/cubelab/atlascuts.ts && echo 1 > var/lab-j182-local/has-d483.txt || echo 0 > var/lab-j182-local/has-d483.txt
ls docs/decisions/D484-*.md >/dev/null 2>&1 && grep -q 'ChooseSource' docs/decisions/D484-*.md && grep -rq 'chooseSourceGuard' bridge/src/mtgtable/ai tools/cubelab && echo 1 > var/lab-j182-local/has-d484.txt || echo 0 > var/lab-j182-local/has-d484.txt
ls docs/decisions/D485-*.md >/dev/null 2>&1 && grep -q 'STALE_TARGETS' docs/decisions/D485-*.md && grep -q 'retargeted' tools/cubelab/atlas.ts && grep -q 'retargeted' bridge/src/mtgtable/ai/Atlas.java && grep -q 'STALE_TARGETS' bridge/src/mtgtable/ai/Explorer.java && grep -q 'staleRefused' tools/check-redaction.mjs && test -f fixtures/negative/redaction/stale-token-died-earlier.jsonl && grep -q 'D485' docs/decisions/D481-*.md && echo 1 > var/lab-j182-local/has-d485.txt || echo 0 > var/lab-j182-local/has-d485.txt
ls docs/decisions/D486-*.md >/dev/null 2>&1 && grep -q 'MODES_DRAWN' docs/decisions/D486-*.md && grep -q 'cardTargetOffered' bridge/src/mtgtable/ai/Explorer.java && grep -q 'MODES_DRAWN' bridge/src/mtgtable/ai/Explorer.java && grep -q 'modesAtCast' bridge/src/mtgtable/ai/PolicyControllerAi.java && grep -q 'modesDrawn' bridge/src/mtgtable/ai/Atlas.java && grep -q 'modesDrawn' tools/cubelab/atlas.ts && grep -q "'cardTargetOffered', 'modesDrawn'" tools/check-redaction.mjs && grep -q "'confirm', 'modes'" tools/check-redaction.mjs && grep -q '^| M75 |' docs/protocol.md && echo 1 > var/lab-j182-local/has-d486.txt || echo 0 > var/lab-j182-local/has-d486.txt
# D487: J172's grep, unchanged (the audit's legacy shape and its printed count, target:none in the checker and the bridge, protocol M76, its m76 fixtures)
ls docs/decisions/D487-*.md >/dev/null 2>&1 && grep -q 'legacy null target' docs/decisions/D487-*.md && grep -q 'function legacyNullTarget' tools/check-redaction.mjs && grep -q 'M55 legacy null target records=' tools/check-redaction.mjs && grep -q "target:none" tools/check-redaction.mjs && grep -q 'TARGET_NONE' bridge/src/mtgtable/ai/Decisions.java && grep -q '^| M76 |' docs/protocol.md && test -f fixtures/negative/redaction/m76-chosen-null-trigger.jsonl && echo 1 > var/lab-j182-local/has-d487.txt || echo 0 > var/lab-j182-local/has-d487.txt
# D488 (the names this file reads: the fit's four methods, the branch row's two fields in the bridge and the lab, the checker's GUARDRAIL_NAMES,
# the errored branch's stack, protocol M77; checked against the lane's 7f60b856 with its review edits; the owner corrects them if the merge renamed any)
ls docs/decisions/D488-*.md >/dev/null 2>&1 && grep -q 'costTargetAvoided' docs/decisions/D488-*.md && grep -q 'fitCosts(' bridge/src/mtgtable/ai/Explorer.java && grep -q 'trimToPayable(' bridge/src/mtgtable/ai/Explorer.java && grep -q 'refitRedraw(' bridge/src/mtgtable/ai/Explorer.java && grep -q 'manaPayable(' bridge/src/mtgtable/ai/Explorer.java && grep -q 'public int targetCountTrimmed;' bridge/src/mtgtable/ai/Atlas.java && grep -q 'public int costTargetAvoided;' bridge/src/mtgtable/ai/Atlas.java && grep -q 'static void logStack(' bridge/src/mtgtable/ai/Atlas.java && grep -q 'targetCountTrimmed?: number' tools/cubelab/atlas.ts && grep -q 'costTargetAvoided?: number' tools/cubelab/atlas.ts && grep -q "'modesDrawn', 'targetCountTrimmed', 'costTargetAvoided'" tools/check-redaction.mjs && grep -q '^| M77 |' docs/protocol.md && echo 1 > var/lab-j182-local/has-d488.txt || echo 0 > var/lab-j182-local/has-d488.txt
# D489 (the names this file reads: the flags, the schedule's counters, the label rows' stopWhy, the control draw and the futility read, the
# self-test's cuts-futile leg; checked against the lane's c4e1bda6 under its review; the owner corrects them if the merge renamed any)
ls docs/decisions/D489-*.md >/dev/null 2>&1 && grep -q 'futileStopped' docs/decisions/D489-*.md && grep -q -- '--futility' tools/cubelab/cli.ts && grep -q 'futileStopped' tools/cubelab/atlas.ts && grep -q 'partialLabels' tools/cubelab/atlas.ts && grep -q 'futileBranchGamesSaved' tools/cubelab/atlas.ts && grep -q "stopWhy: 'futile'" tools/cubelab/atlas.ts && grep -q 'futilityControl' tools/cubelab/atlas.ts && grep -q 'export const futilityDraw' tools/cubelab/atlascuts.ts && grep -q 'export function futileAt' tools/cubelab/atlascuts.ts && grep -q 'cuts-futile' tools/cubelab/atlas.ts && echo 1 > var/lab-j182-local/has-d489.txt || echo 0 > var/lab-j182-local/has-d489.txt
# D493 (the names this file reads: the copier's zone allow-list, its carry pass and two counters, the ai-bench scenario; checked against
# main's 3d78fc18)
ls docs/decisions/D493-*.md >/dev/null 2>&1 && grep -q 'ZONE_TURN_CARRIED' docs/decisions/D493-*.md && grep -q 'static final Set<ZoneType> ZONE_TURN_CARRIED' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'private void carryCastability(' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'carryCastability(copy, o, c);' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'public int plottedCarried()' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'public int zoneTurnsCarried()' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'scenario("copy-plotted"' tools/ai-bench/AiBench.java && echo 1 > var/lab-j182-local/has-d493.txt || echo 0 > var/lab-j182-local/has-d493.txt
# D495 (the names this file reads: the checker's stats line and its copyEnd window, three of its controls and their REQUIRED rows;
# checked against the lane's e91c9ddd, main merged in; the coordinator corrects them if the merge renamed any)
ls docs/decisions/D495-*.md >/dev/null 2>&1 && grep -q 'spell copies on the stack' docs/decisions/D495-*.md && grep -q 'M55 decision ids that are spell copies on the stack=' tools/check-redaction.mjs && grep -q 'copyEnd' tools/check-redaction.mjs && test -f fixtures/negative/redaction/stack-copy-cast-by-the-viewer.jsonl && test -f fixtures/negative/redaction/stack-copy-cast-after-empty-states.jsonl && grep -q "'stack-copy-cast-by-the-viewer.jsonl', 'pass'" tools/check-redaction-selftest.mjs && grep -q "'stack-copy-cast-a-step-too-late.jsonl', 'fail'" tools/check-redaction-selftest.mjs && echo 1 > var/lab-j182-local/has-d495.txt || echo 0 > var/lab-j182-local/has-d495.txt
# D496 (the names this file reads: the decision file, the checker's stats line, two controls and their REQUIRED rows, the ai-bench scenario,
# the bridge's override and the recorder's line; checked against the lane's c52946e2; the coordinator corrects them if the merge renamed any)
ls docs/decisions/D496-*.md >/dev/null 2>&1 && grep -q 'revealed' docs/decisions/D496-*.md && grep -q 'M55 decision ids revealed to the seat, then moved where it sees them=' tools/check-redaction.mjs && test -f fixtures/negative/redaction/reveal-vouches-the-option.jsonl && test -f fixtures/negative/redaction/reveal-before-the-decision-state.jsonl && grep -q "'reveal-vouches-the-option.jsonl', 'pass'" tools/check-redaction-selftest.mjs && grep -q "'reveal-after-the-decision.jsonl', 'fail'" tools/check-redaction-selftest.mjs && grep -q 'cascade-reveal' tools/ai-bench/AiBench.java && grep -q 'public void reveal(' bridge/src/mtgtable/ai/PolicyControllerAi.java && grep -q '"reveal"' bridge/src/mtgtable/SeatRecorder.java && echo 1 > var/lab-j182-local/has-d496.txt || echo 0 > var/lab-j182-local/has-d496.txt
# D497 (the names this file reads: the decision file, the lint's rule and its tag, the copier's carry and its counter, the ai-bench
# scenario and its deck, the worker flag; checked against the lane's b0cecfee; the coordinator corrects them if the merge renamed any)
ls docs/decisions/D497-*.md >/dev/null 2>&1 && grep -q 'paperCard' docs/decisions/D497-*.md && grep -q 'forge-field-write' tools/lint-bridge.sh && grep -q 'forge-field-write' tools/lint-bridge-selftest.sh && grep -q '// ALLOW paperCard write: D497' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'private void carryPaperCard(' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'public int paperCardsCarried()' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'fork-token-copy' tools/ai-bench/AiBench.java && test -f tools/ai-bench/decks/fork-token-copy.dck && grep -q -- '-XX:-OmitStackTraceInFastThrow' tools/cubelab/engine.ts && echo 1 > var/lab-j182-local/has-d497.txt || echo 0 > var/lab-j182-local/has-d497.txt
# D498 (the determinizer keeps what the seat may look at; the names this file reads, checked against the merge ac07876b)
ls docs/decisions/D498-*.md >/dev/null 2>&1 && grep -q 'mayPlayerLook' docs/decisions/D498-*.md && grep -q 'redealHidden(' bridge/src/mtgtable/ai/Determinizer.java && grep -q 'mayPlayerLook' bridge/src/mtgtable/ai/Determinizer.java && grep -q 'Determinizer.redealHidden' bridge/src/mtgtable/ai/Atlas.java && grep -q 'determinize-revealed' tools/ai-bench/AiBench.java && test -f tools/ai-bench/decks/determinize-revealed.dck && echo 1 > var/lab-j182-local/has-d498.txt || echo 0 > var/lab-j182-local/has-d498.txt
# D499 (a game's rows are one play; a killed attempt's are abandoned)
ls docs/decisions/D499-*.md >/dev/null 2>&1 && grep -q 'abandoned' docs/decisions/D499-*.md && grep -q 'abandonedPlays' tools/cubelab/atlas.ts && grep -q 'supersededPlays' tools/cubelab/atlas.ts && grep -q 'playedTwice' tools/cubelab/rowscheck.ts && grep -q 'orphanRows' tools/cubelab/rowscheck.ts && test -f web/test/cubelab-record-cake.test.ts && echo 1 > var/lab-j182-local/has-d499.txt || echo 0 > var/lab-j182-local/has-d499.txt
# D500 (the fork carries the damage-this-turn history) and D501 (the checker's empty-hand proof admits A3's revealed top card)
ls docs/decisions/D500-*.md >/dev/null 2>&1 && grep -q 'addGlobalDamageHistory' docs/decisions/D500-*.md && grep -q 'addGlobalDamageHistory' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'damageLkiLost()' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'search.damageLkiLost' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'damageLkiLost' tools/cubelab/atlas.ts && grep -q 'fork-damage-lki' tools/ai-bench/AiBench.java && test -f tools/ai-bench/decks/fork-damage-lki.dck && echo 1 > var/lab-j182-local/has-d500.txt || echo 0 > var/lab-j182-local/has-d500.txt
ls docs/decisions/D501-*.md >/dev/null 2>&1 && grep -q 'revealedTopCard' docs/decisions/D501-*.md && grep -q 'revealedTopCard' tools/check-redaction.mjs && grep -q 'revealed top card (A3)' tools/check-redaction.mjs && echo 1 > var/lab-j182-local/has-d501.txt || echo 0 > var/lab-j182-local/has-d501.txt
# the random seat's POLICY is J173's and J177's (D488's); the copier it forks on is D493's, as J177's; the recorder is D496's (`decides:`):
# D495's merge (480c837d, J177's pin) is an ancestor of the pin, and since it bridge/src changed in exactly ten files: D496's six (five of
# the lane plus GameLog.java's javadoc from the review, comments only), D497's LenientGameCopier.java (also D500's damage pass), D498's
# Determinizer.java and Atlas.java (the no-leak check redeals the same way) and D500's SearchPolicy.java (a counter into the search sink,
# `search.damageLkiLost`, 3 lines in, none out) and the seat-identity golden not at all; since J173's pin (6e87e5d4, D488's merge) the
# golden is unchanged and bridge/src changed in exactly those ten (SearchPolicy.java: D493's self-test accessor 5 lines plus D500's 3, 8 in,
# none out)
sc=0
D496_FILES="bridge/src/mtgtable/GameLog.java bridge/src/mtgtable/SeatRecorder.java bridge/src/mtgtable/ai/Atlas.java bridge/src/mtgtable/ai/DecisionClock.java bridge/src/mtgtable/ai/DecisionSelfTest.java bridge/src/mtgtable/ai/DecisionSink.java bridge/src/mtgtable/ai/Determinizer.java bridge/src/mtgtable/ai/LenientGameCopier.java bridge/src/mtgtable/ai/PolicyControllerAi.java bridge/src/mtgtable/ai/SearchPolicy.java "
if git merge-base --is-ancestor 480c837d7783d2fbe1a727143dc6069344dc9bf4 HEAD && git diff --quiet 480c837d7783d2fbe1a727143dc6069344dc9bf4 HEAD -- fixtures/cubelab/seat-identity.json && git diff --quiet 6e87e5d4a50e28649c9baa013f485da80a88aafd HEAD -- fixtures/cubelab/seat-identity.json; then
  test "$(git diff --name-only 480c837d7783d2fbe1a727143dc6069344dc9bf4 HEAD -- bridge/src | LC_ALL=C sort | tr '\n' ' ')" = "$D496_FILES" && test "$(git diff --name-only 6e87e5d4a50e28649c9baa013f485da80a88aafd HEAD -- bridge/src | LC_ALL=C sort | tr '\n' ' ')" = "bridge/src/mtgtable/GameLog.java bridge/src/mtgtable/SeatRecorder.java bridge/src/mtgtable/ai/Atlas.java bridge/src/mtgtable/ai/DecisionClock.java bridge/src/mtgtable/ai/DecisionSelfTest.java bridge/src/mtgtable/ai/DecisionSink.java bridge/src/mtgtable/ai/Determinizer.java bridge/src/mtgtable/ai/LenientGameCopier.java bridge/src/mtgtable/ai/PolicyControllerAi.java bridge/src/mtgtable/ai/SearchPolicy.java " && test "$(git diff --numstat 6e87e5d4a50e28649c9baa013f485da80a88aafd HEAD -- bridge/src/mtgtable/ai/SearchPolicy.java | cut -f1,2 | tr '\t' ' ')" = "8 0" && test "$(git diff --name-only 7a984963e61cdfe98cadfcc45fa7690a61dc37f6 HEAD -- bridge/src | LC_ALL=C sort | tr '\n' ' ')" = "bridge/src/mtgtable/ai/Atlas.java bridge/src/mtgtable/ai/Determinizer.java bridge/src/mtgtable/ai/LenientGameCopier.java bridge/src/mtgtable/ai/SearchPolicy.java " && sc=1
fi
echo $sc > var/lab-j182-local/seat-code.txt
echo "J182: seat code: the policy J173's and J177's, the recorder D496's, the copier D497's and D500's, the determinizer D498's (bridge/src since 7a984963: Atlas, Determinizer, LenientGameCopier, SearchPolicy): $sc"
# D481-D496 by decision id: the commit that added each decision's file is an ancestor of the pin (whatever sha the merge gave it)
anc=1
for x in D481 D482 D483 D484 D485 D486 D487 D488 D489 D490 D491 D492 D493 D494 D495 D496 D497 D498 D499 D500 D501; do
  f=$(git ls-tree -r --name-only HEAD docs/decisions/ | grep "^docs/decisions/$x-" | head -n 1 || true)
  c=""
  if [ -n "$f" ]; then c=$(git log --diff-filter=A --format=%H -n 1 HEAD -- "$f" || true); fi
  if [ -z "$c" ] || ! git merge-base --is-ancestor "$c" HEAD; then anc=0; fi
  echo "J182: $x: ${f:-no decision file} added by ${c:-no commit}"
done
echo $anc > var/lab-j182-local/has-d481-d501-commits.txt
# the seat-identity golden D486 regenerated: J171's three parts, unchanged (D488's gate: 12m, all 4 games the golden's, not regenerated)
f486=$(git ls-tree -r --name-only HEAD docs/decisions/ | grep '^docs/decisions/D486-' | head -n 1 || true)
c486=""
if [ -n "$f486" ]; then c486=$(git log --diff-filter=A --format=%H -n 1 HEAD -- "$f486" || true); fi
cg=$(git log --format=%H -n 1 HEAD -- fixtures/cubelab/seat-identity.json || true)
g1=0
if [ -n "$c486" ] && [ -n "$cg" ] && git merge-base --is-ancestor "$c486" "$cg"; then g1=1; fi
g2=0
if [ -n "$c486" ] && ! git diff --quiet "$c486" HEAD -- fixtures/cubelab/seat-identity.json; then g2=1; fi
python3 -I -c "import glob, json, sys; t = [open(f).read() for f in sorted(glob.glob('docs/decisions/*.md'))]; r = json.load(open('fixtures/cubelab/seat-identity.json')).get('results') or {}; dg = {k: (r.get(k) or {}).get('digest') for k in ('forge', 'search', 'explore')}; print(json.dumps({'descends': int(sys.argv[1]), 'changed': int(sys.argv[2]), 'note': 1 if any('seat-identity' in x and 'D486' in x for x in t) else 0, 'digestsJ170': 1 if dg == {'forge': '78f3a94998355ea8', 'search': 'c68c2a849b7b0d54', 'explore': '82d6d18c57bbd861'} else 0}))" $g1 $g2 > var/lab-j182-local/golden.json || echo '{"descends":-1}' > var/lab-j182-local/golden.json
echo "J182: seat-identity golden: fixture last changed by ${cg:-no commit}, D486's file added by ${c486:-no commit}: $(cat var/lab-j182-local/golden.json)"
# the deck draw's code is J171's pin's (D447 with D482's list) plus exactly D490, D492 and D494, and nothing else (deckcode.py's header):
# nothing since f2b4e9c2 touched cubes/library/; deckcensus.ts differs from f2b4e9c2's in D492's and D494's comment and message lines
# only; engine-unplayable.json is J171's list plus Chain of Smog (D490, as at J177's pin), the four Prepare cards (D492) and Ob Nixilis,
# the Adversary (D494); both files main's 3d78fc18 blobs
cat > var/lab-j182-local/bin/deckcode.py <<'PY'
# J182: the deck draw's code is J171's pin's (f2b4e9c2) plus exactly D490, D492 and D494, and nothing else (`deck_code`). Reads
# var/lab-j182-local/deckcensus.diff (`git diff -U0 f2b4e9c2 HEAD -- tools/cubelab/deckcensus.ts`), unplayable-j171.json and
# unplayable-j176.json (the list at J171's pin and at J176's, cc7467f6) and the tree's own list; argv[1] and argv[2] are the pin's blobs of
# deckcensus.ts and engine-unplayable.json (`git rev-parse HEAD:<file>`). Exits 0 when all three hold:
#   census  deckcensus.ts: 3 lines out and 6 in, the changed lines' sha256s registered below (point 5's header comment, the doc comment and
#           the error message of parseEngineUnplayable: D492's and D494's wording, checked by this draft on 2026-10-31), every changed line
#           a comment or the one `throw new Error(` line, whose code before the message is the same out and in (the message only);
#   list    J171's one-entry list made seven, in this order: Scute Swarm unchanged, Chain of Smog as at J177's pin (D490, since J173), the
#           four Prepare cards (D492) and Ob Nixilis, the Adversary (D494), each since J176 with a why and an evidence; `decision` D482;
#   blobs   both files byte for byte main's 3d78fc18 (D493's merge), the `about` line's D492 sentence included.
# Standard library only; prints one line.
import hashlib, json, sys
L = 'var/lab-j182-local/'
DC_BLOB, UP_BLOB = '6a7c3ce2dc4e72245ecb2bddf17ac9a9e741819b', 'b7671383f34048a51526f2b4ff6bdefae27c2998'
OUT_SHA = '9bd0075b03b71713577e7a5bbd693e047c65031ec4345b69e527ef761aae8c23'
IN_SHA = 'f7a8b0b4687fc0c7d2b8cf19f2eb17a74445be10588e22243557d00d02bd81e9'
NEW = ['Emeritus of Abundance', 'Elite Interceptor', 'Emeritus of Ideation', 'Studious First-Year', 'Ob Nixilis, the Adversary']
try:
    d = open(L + 'deckcensus.diff').read().splitlines()
    out = [x[1:] for x in d if x.startswith('-') and not x.startswith('---')]
    inn = [x[1:] for x in d if x.startswith('+') and not x.startswith('+++')]
    a = json.load(open(L + 'unplayable-j171.json'))['cards']
    c = json.load(open(L + 'unplayable-j176.json'))['cards']
    t = json.load(open('tools/cubelab/engine-unplayable.json'))
except (OSError, ValueError, KeyError) as e:
    sys.exit('J182 deck code: %s' % e)


def h(xs):
    return hashlib.sha256('\n'.join(xs).encode()).hexdigest()


def pre(x):
    return x.split('throw new Error(', 1)[0]


thr_out, thr_in = [pre(x) for x in out if 'throw new Error(' in x], [pre(x) for x in inn if 'throw new Error(' in x]
census = ((len(out), len(inn)) == (3, 6) and h(out) == OUT_SHA and h(inn) == IN_SHA and len(thr_out) == 1 and thr_out == thr_in
          and all(x.strip().startswith(('//', '/**')) or 'throw new Error(' in x for x in out + inn))
b = t.get('cards') or {}
lst = (t.get('decision') == 'D482' and list(b) == list(a) + ['Chain of Smog'] + NEW and all(b[k] == a[k] for k in a)
       and list(c) == list(a) + ['Chain of Smog'] and b['Chain of Smog'] == c['Chain of Smog'] and b['Chain of Smog'].get('since') == 'J173'
       and all(b[k].get('since') == 'J176' and str(b[k].get('why', '')).strip() != '' and str(b[k].get('evidence', '')).strip() != '' for k in NEW))
blobs = sys.argv[1:3] == [DC_BLOB, UP_BLOB]
print("J182 deck code: deckcensus.ts comments and the message only %d, the list J171's plus D490's, D492's and D494's %d, both blobs main 3d78fc18's %d" % (census, lst, blobs))
sys.exit(0 if census and lst and blobs else 1)
PY
dc=0
if git diff --quiet f2b4e9c26227ef135e5df1102384e026cbf2f195 HEAD -- cubes/library/; then
  git show f2b4e9c26227ef135e5df1102384e026cbf2f195:tools/cubelab/engine-unplayable.json > var/lab-j182-local/unplayable-j171.json
  git show cc7467f6e340f177fc9763086470a94efcaf457f:tools/cubelab/engine-unplayable.json > var/lab-j182-local/unplayable-j176.json
  git diff --no-color --no-ext-diff -U0 f2b4e9c26227ef135e5df1102384e026cbf2f195 HEAD -- tools/cubelab/deckcensus.ts > var/lab-j182-local/deckcensus.diff
  python3 -I var/lab-j182-local/bin/deckcode.py "$(git rev-parse HEAD:tools/cubelab/deckcensus.ts)" "$(git rev-parse HEAD:tools/cubelab/engine-unplayable.json)" && dc=1
fi
echo $dc > var/lab-j182-local/deck-code.txt
echo "J182: deck code: J171's pin's plus exactly D490, D492 and D494: $dc"
test -z "${CUBELAB_WORKER_XMX:-}" && echo 1 > var/lab-j182-local/xmx-unset.txt || echo 0 > var/lab-j182-local/xmx-unset.txt
env -u LAB_DATA_DIR node --test web/test/cubelab-atlas.test.ts web/test/cubelab-atlas-cuts.test.ts web/test/cubelab-atlas-resume.test.ts web/test/cubelab-atlas-redaction.test.ts web/test/cubelab-record.test.ts web/test/cubelab-watchdog.test.ts web/test/cubelab-deck-census.test.ts && echo 1 > var/lab-j182-local/nodetests.txt || echo 0 > var/lab-j182-local/nodetests.txt
node tools/check-redaction-selftest.mjs && echo 1 > var/lab-j182-local/redaction-self.txt || echo 0 > var/lab-j182-local/redaction-self.txt
cat > var/lab-j182-local/bin/drawsha.py <<'PY'
# J182 (drafts/J182-atlas-4b-night-seven.md): J177's drawsha.py, unchanged.
# J177: J171's drawsha.py, unchanged (J170's, J169's, J168's, J167's, J166's).
# The sha256 of a set of deck draws, in the order named: each folder's decks.jsonl, then its decks/*.dck by name.
# Usage: drawsha.py DIR... ; prints the hex digest and the deck count. Standard library only.
import glob, hashlib, os, sys
h, n = hashlib.sha256(), 0
for d in sys.argv[1:]:
    h.update(open(os.path.join(d, 'decks.jsonl'), 'rb').read())
    for f in sorted(glob.glob(os.path.join(d, 'decks', '*.dck'))):
        h.update(os.path.basename(f).encode() + b'\0' + open(f, 'rb').read())
        n += 1
print(h.hexdigest(), n)
PY
cat > var/lab-j182-local/bin/draws.py <<'PY'
# J182 (drafts/J182-atlas-4b-night-seven.md): J177's draws.py for J182's seeds and folder: the draws made by J182's pilot into the
# NEW data folder lab-j182 (D447 with D482's list as D490, D492 and D494 leave it, at the pin, deck seeds 2401-2413 and 2601-2613) and
# again into the clone (var/lab-j182-local/redraw/); recorded once into var/lab-j182-local/draws-pilot.json. One addition: J177's 13
# spine draws and its validation draw are registered beside J171's and J173's (J177_DRAWS, J177_VALIDATION, from J177's own
# var/lab-j177-local/draws-pilot.json), J180's beside them (J180_DRAWS, J180_VALIDATION, from lab-j180/report/draws.json, read
# on 2026-11-01) and J181's (J181_DRAWS, J181_VALIDATION, from lab-j181/report/draws.json, read
# var/lab-j177-local/draws-pilot.json in the lab clone, read by this draft on 2026-10-31): none may come back here.
# J177's header, unchanged below:
# J177 (drafts/J177-atlas-4b-night-three.md): J173's draws.py for J177's seeds. The deck draws, made by J177's pilot into the NEW data
# folder lab-j177 (D447 with D482's list, at the pin, deck seeds 2040-2052 and 2240-2252) and again into the clone (var/lab-j177-local/redraw/,
# J167's redraw). These seeds were never drawn before, so no spine's sha256 is registered: the two draws must agree deck for deck, the smoke's
# pair (deck seed 2099) must be J166's registered sha256, and no spine draw may be one of J171's 13 or J173's 13, nor the validation draw
# J171's or J173's (registered below: a guard against an unshifted seed). The pilot then
# RECORDS the sha256s once (--record), and every spine block checks its decks against that record (deckcheck.py). From files only (no engine).
#   draws.py            one JSON object of numbers (the pilot's `draws` metric reads it from draws.json)
#   draws.py --record   writes var/lab-j177-local/draws-pilot.json when it is absent and every check of agreement holds; never overwrites
#   draws.py --report   the sha256s as run and as recorded (report/draws.json)
import glob, hashlib, json, os, sys
D = '/home/justin-a/code/lab/data/lab-j182'
R = 'var/lab-j182-local/redraw'
REC = 'var/lab-j182-local/draws-pilot.json'
BANDS = ['pauper', 'peasant', 'legacy', 'powered'] * 3 + ['pauper']
SP = ['s%02d-%s-%d' % (k, BANDS[k - 1], 2400 + k) for k in range(1, 14)]
VA = ['v%02d-%s-%d' % (k, BANDS[k - 1], 2600 + k) for k in range(1, 14)]
REG_SMOKE = 'edfdc861736fb049bc1080d525269064c6776ecabd47de496463fa3dc684c931 2'
# J171's 13 spine draws (drafts/J171-atlas-4b-card-targets.md, draws.py's DECKS) and its validation draw: none may come back here
J171_DRAWS = {'a40fb5addec594bd6e97b0e7b16d78af1f08280dcc555366b3a2301feda4ff34', '86ccaaf3b3ba6f5959aacf073a9dc0465aadf1a9d02ddac8eac695091eaea576',
              '0e9d8c744abd6eff72d2fc1cca4003c7cecfdb85830c077d8c29e16891bfacc1', '81c4dd22dcdbd1a110b0339476cbab04e8f6d2791f1881e42499b97f8675dc00',
              'afc7ce320e966d96e5c92ec9d28c357e6f603c59927f677549ce261227b1b92e', '191a5d8aac5d516f5472f0a01a0cacf660a9fa931e70b806a42723e4dfba161f',
              '5287d2666529b6dd35ec4a271a1b71c5b01d8096bcf1c3acd114945c7a435636', 'd653b4cf2bf2d94649449caaf174d21453cd34b58972c3e22ea8e26dacf75f71',
              '1216932fb9807608a5bf859ac768e12efa40c031fc685f16b56b274a2bbf7601', 'e4676bda05d0204f3ce43e3f8d1ee1a0ca0c8e24c7f8cf09860423d00ddedd9b',
              '4ca069ba7bdae91d218e589a41c28da836c7544da53577d14c5994aa64ca8642', '5d49d21add4ba8cc269babde10dc63c7b7885e94b1df7437d217e02bd2db820d',
              '6f20b45b168bf6ba0e365bf27e507e31c431eb76c6f389336cfc8db3e3752591'}
J171_VALIDATION = '7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de'
# J173's 13 spine draws and its validation draw (lab-j173/decks and validation as this draft read them, 2026-10-27, equal to J173's
# var/lab-j173-local/draws-pilot.json): none may come back here either
J173_DRAWS = {'bda23027e30bfa785eb8800a59c13598c652bae8a32b5dfa6f72554675726ef2', 'a2cad311341fa662eaa0720286386e169b06eeb8270e8880a0f910d86b901646',
              '1009922ed3a4e306172d66c2e0808622464e16dcb7d8832b767623d8ec00a2bb', '6611f1104b84e8616449628d548e2caf764978a9881a0093e83e3424e6bee350',
              'bdaf4cdc41cb5b91c18b5f050e482949a7835694cc1e752e351c44aae6faeac5', '43d09352be81da6e0173079c35773d4ce23bc8490b9d4313351644fc80a5f150',
              '1b65977550215bded3baaa8349ba42281eb4f2d9e4c898c3ff36f4b5bbf2395e', '5c63e8e936bb1e0fb35aa12cb204088b51937c78655fabb5a57f4eb5709d852a',
              '3abe41cb921d801ca19c360fd02fb15c0a72332eae730f6d1525d639c96ec356', 'f70e76d1e77bf1d0d9675e854772b32709d115645959459d8a5cb14e4f5c615b',
              '6e54962a5e5f58e3b693f850879998fa37b6a863a4a416caaa1c2c79286879f4', '491a0e3a45844c784927cb120003115bb16eb2b0fd67b090322a916523b56b16',
              '45ddf51d3e764483d277f259f92e8a95127aa414872464709adb08fb510067d0'}
J173_VALIDATION = '2d8fc399fb267eb70b060f984d573843b8f5801976f69b38b6eb8f80810fae19'
# J177's 13 spine draws and its validation draw (J177's var/lab-j177-local/draws-pilot.json in the lab clone, as this draft read it on
# 2026-10-31, equal to lab-j177/report/draws.json's validation): none may come back here either
J177_DRAWS = {'9cb6954a1a2018613ef7a88d5406039f89014bcd7273644e9341c221e762d140', '9ee08a04d59d4cef9575fe61feb7526bb36c166a2a338ef3cda26dd5eb0a7d96',
              'a3c90f5f2f6daf5679edafb6f3bb5b0d68f0821fb5c8d90a4c7e4599a602c339', '2fe29b964b322dd121743f9269fba6443d1feb954f2d7adbbff2b36bce0e2eee',
              'f2fa7ce57d7fdb4044cd56e791c83fe783e5df1074658504376f53a4b036bb39', '7125dd10bc0e5c487cd9b342ae4aa932ea26b589866795908b2348ac4fea6589',
              '24afdee34caf8b20654e283685351bab754add41daff38d4f4ce15de67cf9db0', 'b81a1c8fbec01f102829e96fa1da431786bcba37f67d07c2e0fb549baf4d2c51',
              'dc50ecef44efc6bdad0354859a2e0ae5fcace5dcb342842e9d28f94d4d1145c0', '24ab94f77162760ca0be8cac3757332de5ac12b00c89a0750548433162e157a0',
              'dfc6b8a063e8b8271532f8a169ee7b58584ef3ce06bba0025d9ab1a030f1deea', '282e9cf4eaa716c9145b4e44e89692c72333a74b6ef8c74003e14c29d902ab0c',
              '1e6542665dadbc979388dfef4f156b8c02f16ea56166a360638304948e39836c'}
J177_VALIDATION = 'a892900b017e630a517fee6f98e455da36136c30ebd35690d71b1177410d8238'
# J180's 13 spine draws and its validation draw (lab-j180/report/draws.json's `recorded`, read by this draft on 2026-11-01): none may
# come back here either
J180_DRAWS = {'bc0921398ede73fec554271ccd54e7b1f6a801a4b7c407e454db8920ef64cb6f', '0fbfbc5e817ee0b5b56426078bb3b3c03468c510c824576654d975c43cdfea44',
              '302e3cc3389ee1d11b8d23fd173353d70b381ffb4d2b3c0aca9e59056b2b3b4c', 'ff1de9c3f8e0479070c9f0d50e828625648cdf2e57996649251d86d1720c534f',
              '7ffffda6fb658c10acdaa99154a4caae3d951f48206a111e4d304b9f7f8832a5', 'f1e9a5ccd84a7728d94b88a9c309fa398e0404692344b6ec5986e454d44e7cfc',
              '3e6b25e220b7edeb91f41b32529497750fbf58c596fc69e64b1e33953e2d842d', 'b6773207b60dec3ae6b3177d3a416260598319819f82e813cf81c6a8025a7de0',
              'f93ad6ee71ed52cb19ce07683288361dde93db552e50feba7f7e233b65965512', 'f3c093f82e8448cfc9490f51345121a84a4197bb712e13054775450bc39579d1',
              '5058cef2f48aa118e5a7963fe26573b2221d3c2afcff057d241c17a2d3ab130a', 'bebbe76188cfbb6768b1c9ecb0b009c65d709a7d42a0b9e415af4bebe02fabc2',
              '56cce468cfdf43d309f70aa4004e5c303a578e2b2fabee9b61c673893b9f8b24'}
J180_VALIDATION = '39eb160cd3c862914b8c263837678e12f3f47cd83a364e1c4a493d15306192bc'
# J181's 13 spine draws and its validation draw (lab-j181/report/draws.json's `asRun`, read by this draft on 2026-11-01): none may
# come back here either
J181_DRAWS = {'670dd90b817d7dfddc1e57b02d1f81da091f2cc6cf1e8f7da134186f7bc6ed2d', 'e151788b468ca9b8dffe9fb4492c82b45e6197c6c816b204064119d68f82b123',
              '275f71739cf43909b87eb88e8c095b8bc5eb02a467b948338fadf8e1ec1793ab', 'f025c63a3bbaa4b0497eff78517c63622b5067bc45fec4c999898905e288425b',
              '7b2a8b638866a605cd6a9dbbe7830a9076e6d4ea6ce22899ca282c7e9324bedb', 'a2e3e46b5db0826aa0925da5feea3fa4659c9c5419664664151b1f73c515193b',
              '3a2202e6883bf4968f3ff887ca7f89d216f4439cc8b926ad0f884dce39da1dfa', 'f0330e5e87a0e6518f47acca3d30dd40baa6923832a3063b1e0cb82d3f45044a',
              '33d0b5deb46dabcbcf7ddeb4233465a8e155f667f42b1fa1da8a09dc745061f9', 'c87048e84d7e7a14f21b6f8d697d4586ddc1f5825ebb941a7ca160fc427d56de',
              '9a9297c3936e57053716a38fb614af6918f25f7752681ab4ab6729201c810bce', 'c75c6407d2bfcd9a5ab9bc6173131ee4b5abe1b4e1f76429610d3adc27c2846e',
              '7c6e319abef8bd288115b3d783e5a6496bb2855aa8ae9d14e3c3857a70df13f1'}
J181_VALIDATION = '16cb39e8444faedf49f38e68758a3f37e47862037247cefa8b40989b78386a40'


def drawsha(dirs):
    h, n = hashlib.sha256(), 0
    for d in dirs:
        h.update(open(os.path.join(d, 'decks.jsonl'), 'rb').read())
        for f in sorted(glob.glob(os.path.join(d, 'decks', '*.dck'))):
            h.update(os.path.basename(f).encode() + b'\0' + open(f, 'rb').read())
            n += 1
    return '%s %d' % (h.hexdigest(), n)


def fsha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def safe(f):
    try:
        return f()
    except (OSError, ValueError, KeyError, IndexError, TypeError):
        return None


def now(root, x):
    """[the folder's draw, deck 1's sha256, deck 2's] (None where a file is missing)"""
    band, seed = x.split('-')[1], x.split('-')[2]
    return [safe(lambda: drawsha([root + '/' + x])), safe(lambda: fsha('%s/%s/decks/%s-%s-00001.dck' % (root, x, band, seed))),
            safe(lambda: fsha('%s/%s/decks/%s-%s-00002.dck' % (root, x, band, seed)))]


def agree(x, base):
    a, b = now(D + '/' + base, x), now(R, x)
    return None not in a and a == b and a[0].endswith(' 2')


def state():
    s = {'spines': {x: now(D + '/decks', x) for x in SP}, 'validationBySet': {x: now(D + '/validation', x) for x in VA},
         'all13': safe(lambda: drawsha([D + '/decks/' + x for x in SP])), 'validation': safe(lambda: drawsha([D + '/validation/' + x for x in VA])),
         'smoke': safe(lambda: drawsha([D + '/decks/p-powered-2099']))}
    return s


out = {}
out['spines13'] = sum(1 for x in SP if agree(x, 'decks'))
out['validation13'] = sum(1 for x in VA if agree(x, 'validation'))
a13, r13 = safe(lambda: drawsha([D + '/decks/' + x for x in SP])), safe(lambda: drawsha([R + '/' + x for x in SP]))
out['all13'] = 1 if a13 is not None and a13 == r13 and a13.endswith(' 26') else 0
av, rv = safe(lambda: drawsha([D + '/validation/' + x for x in VA])), safe(lambda: drawsha([R + '/' + x for x in VA]))
out['validationAll'] = 1 if av is not None and av == rv and av.endswith(' 26') else 0
out['smokeData'] = 1 if safe(lambda: drawsha([D + '/decks/p-powered-2099'])) == REG_SMOKE else 0
out['smokeRedraw'] = 1 if safe(lambda: drawsha([R + '/p-powered-2099'])) == REG_SMOKE else 0
out['newDraws13'] = sum(1 for x in SP for v in [now(D + '/decks', x)[0]] if v is not None and v.split()[0] not in J171_DRAWS | J173_DRAWS | J177_DRAWS | J180_DRAWS | J181_DRAWS)
out['newValidation'] = 1 if av is not None and av.split()[0] not in (J171_VALIDATION, J173_VALIDATION, J177_VALIDATION, J180_VALIDATION, J181_VALIDATION) else 0
ok = out['spines13'] == 13 and out['validation13'] == 13 and out['all13'] == 1 and out['validationAll'] == 1 and out['smokeData'] == 1 and out['smokeRedraw'] == 1
if '--record' in sys.argv[1:]:
    if os.path.exists(REC):
        print('J182 draws: %s exists, kept as recorded' % REC)
    elif not ok:
        print('J182 draws: the draws do not agree, nothing recorded: %s' % json.dumps(out))
    else:
        with open(REC, 'w') as f:
            json.dump(dict(state(), note='J182 deck draws, recorded once by the pilot at the pin: D447 with D482\'s list, deck seeds 2401-2413 (spines), 2601-2613 (validation), 2099 (smoke); drawsha = each folder\'s decks.jsonl, then its .dck files by name'), f, indent=1)
        print('J182 draws: recorded in %s' % REC)
    sys.exit(0)
rec = safe(lambda: json.load(open(REC)))
if '--report' in sys.argv[1:]:
    print(json.dumps({'note': 'J182 deck draws, made by J182\'s pilot into lab-j182 and again into the clone, recorded once (draws-pilot.json)',
                      'asRun': state(), 'recorded': rec, 'redrawSpines': r13, 'redrawValidation': rv, 'smokeRegistered': REG_SMOKE}, indent=1))
    sys.exit(0)
cur = state()
out['recorded'] = 1 if rec and all(rec.get(k) == cur[k] for k in ('spines', 'validationBySet', 'all13', 'validation', 'smoke')) else 0
print(json.dumps(out))
PY
cat > var/lab-j182-local/bin/deckcheck.py <<'PY'
# J182: J177's deckcheck.py, unchanged but for the record's path (var/lab-j182-local/draws-pilot.json).
# J177: a spine block's check of its own decks: the folder's draw and both decks are the sha256s the pilot recorded (draws-pilot.json).
# Usage: deckcheck.py NAME FOLDER DECK1 DECK2 ; exits 0 when they are, else 1. Standard library only.
import glob, hashlib, json, os, sys
name, k0, a, b = sys.argv[1:5]


def drawsha(d):
    h, n = hashlib.sha256(), 0
    h.update(open(os.path.join(d, 'decks.jsonl'), 'rb').read())
    for f in sorted(glob.glob(os.path.join(d, 'decks', '*.dck'))):
        h.update(os.path.basename(f).encode() + b'\0' + open(f, 'rb').read())
        n += 1
    return '%s %d' % (h.hexdigest(), n)


try:
    want = json.load(open('var/lab-j182-local/draws-pilot.json'))['spines'][name]
    got = [drawsha(k0), hashlib.sha256(open(a, 'rb').read()).hexdigest(), hashlib.sha256(open(b, 'rb').read()).hexdigest()]
except (OSError, ValueError, KeyError) as e:
    sys.exit('J182: %s: %s' % (name, e))
sys.exit(0 if got == want and got[0].endswith(' 2') else 'J182: %s: the decks under %s are not the draw the pilot recorded' % (name, k0))
PY
cat > var/lab-j182-local/bin/labels.py <<'PY'
# J182 (drafts/J182-atlas-4b-night-seven.md): J177's labels.py (contract v6, its string J177's: the fields are J177's), registered
# before any J182 data. What changes: nothing in the rows. J182 is D498's population's first night (D498 changed the determinizer, and
# with it the redealt world a branch plays in), so its rows pool with NOTHING before them (D493, Comparability): --seat= defaults to
# "D498" (the self-test on J171's night still passes --seat=D486), the Report names the pools `random-<band>-d498`; and the sizing read's
# beside-column is J181's (--j181= LABELS_JSON: its c_sizingRead and per-worker-hour yield, ANOTHER POPULATION's first night, as
# information; null when absent). Every field, read and definition otherwise J177's, unchanged; the scan stamp `J182 v5`.
# J177's header, unchanged below:
# J177 (drafts/J177-atlas-4b-night-three.md): J173's labels.py (contract v5) with the rung-4b contract v6, registered before any J177 data.
# v6 is v5 on D489's design: the SAME population as J173's v5 (D488's seat, unchanged), branched with fewer branches, so its rows may be
# pooled with J173's with the branch count as a column, and never with v1-v4's. What v6 changes (every v5 field kept, every v5 read and
# definition unchanged): `v` 6, `contract` v6's; EVERY branched row is kept -- complete, screened, or a futile-stopped PARTIAL one -- and
# each carries D489's `partial` (bool), `stoppedAt` and `stopWhy` (the decision-level checkpoint and "futile" on a partial row; null
# elsewhere: an option's own `stoppedAt` stays inside `options`), `futilityControl` (bool) and `futilityGap` (null where the rule did
# not read the decision), `branchRandom` (the plan's), `fullN` (option 0's random branch rows, any outcome) and `branchedInFull`
# (complete and fullN >= branchRandom, computed here whatever atlas.json's own `branchedInFull` counts). `confident` is v5's and also
# requires `partial` false (D489 makes a partial row incomplete; this is a second lock). `labels` stays the complete rows' count;
# `partialLabels`, `futilityControls`, `branchedInFullRows` and `confidentPartial` (0 expected) are new. New reads, registered before
# any J177 data:
#   f_futilityRead   the decisions the rule read (futilityGap not null), the futile ones (stopped or control), the stopped ones and the
#                    CONTROLS (futilityControl): how many controls are complete and confident at the full n (the rule's measured loss),
#                    their share with an exact Clopper-Pearson 95% interval, beside the atlas review's 3 of 77; the labels lost
#                    estimated as share x stopped, the interval scaled the same way. `pooledInputs` are the counts a later night adds to
#                    (the read is POOLED across nights; one night's is partial)
#   c_sizing7        adds `workerHours` (the walls times their workers) and `confidentPerWorkerHour`: THE yield number to compare
#                    across nights; the confident share over complete rows is not (the stopped futile decisions left the denominator)
#   c_sizingRead     adds J173's own sizing read (--j173=LABELS_JSON: its c_sizingRead and per-worker-hour yield, the same seat at 200
#                    branches, other decks; null when the file is absent) and the review's ~46 [41, 51] (32.8 x 1.39 [1.25, 1.55], no
#                    controls), as information, no verdict
# J173's header, unchanged below:
# v5 is a NEW POPULATION (D488, Comparability: "Labels and reads from before D488 are not pooled with those after it"): its rows are
# never pooled with v1-v4's. What v5 changes (every v4 field kept): `v` 5, `contract` v5's; `randomSeat` is --seat= (default "D488"; the
# pilot's self-test on J171's night passes --seat=D486), the same on every spine; the pool as named on the command line (J177:
# `random-<band>-d488`); each row adds D488's branch-row counters `targetCountTrimmed` and `costTargetAvoided` (the sums over the
# decision's branch rows, both maps; BranchRow writes each when > 0), `targetCountTrimmedBranches` and `costTargetAvoidedBranches` (its
# branch rows with each > 0) and `branchRows` (all of its branch rows); and, from metrics.py --scan's v5 caches (--lost=DIR),
# `refusedCastOptions` (the options whose OWN forced cast was refused -- put back in its caster's hand -- in more than half of their
# branches, either map), `refusedCastVoid` (option 0, Forge's own answer, is one of them), `refusedCastBranches` (the decision's branch
# games with any refused cast) and `refusedCastBranchShare` (over `branchRows`); a row with no v5 cache carries null in the four. Out:
# `d488Rows`, `refusedCastVoid` / `refusedCastVoidList`, `refusedCastOptionRows`; each spine's scan numbers beside its labels. The
# sizing read's expectation names J171's numbers as ANOTHER population. The reads themselves are J171's, unchanged.
# J171's (J170's v4) header, in short: --biased= and --lost= are J169's; `lostCastOptions`, `lostCastVoid` and `lostCastBranches` are
# J169's (the lost cast as J169 defined it; metrics.py's scan keeps it); `confidentPer7Poisson95` is Garwood's exact interval scaled
# as the point is; `byRandomSeat` counts whatever seats the rows carry. J167's: each spine names its own sha; `listing`, `playCount`,
# `tokenTwice`, each option's `identity`; `byListing`.
# From spine folders named on the command line as NAME:POOL:DECKSEED:GAMESEED:SHA:DIR (DIR holds plan.json, atlas.json, phaseB/).
#   --out=FILE       write labels.jsonl there (one row per branched decision: complete, screened or neither)
#   --times=FILE     spine-times.txt ("<folder> <start epoch s> <end epoch s> <workers>", one line a run of a spine's block)
#   --training=1     mark every row `training: true`; anything else writes `training: false`
# Standard library only; no engine. Prints one JSON object (the label reads) to stdout.
# Definitions (J166's, fixed before any J166 data):
#   label      a branched decision of seat A that atlas.json calls complete (D480), not screened
#   regret     atlas.json's random-map regret: the best option's mean minus option 0's (Forge's answer, the one the spine
#              played), with atlas.json's paired-bootstrap interval; an option early stopping dropped keeps its own n (D480)
#   confident  complete and the regret's low end is > 0 (random map); `confidentForge` the same under the Forge map, on a
#              spine with one (null on a spine without), as information
#   decided    atlas.json's (D480); fallback J158's: every option's mean >= 0.95 under both maps; inQ = complete, not decided
#   settled    atlas.json's (D480: decided, or every option <= 0.05 under each map, or screened); fallback J158's
#   gap        best minus worst option mean under the random map, over every option (J157's "information" measure)
#   k bucket   the decision's option count (listed and branched): 2, 3-4, 5-6, 7-8
#   interval   95% percentile bootstrap, 10,000 draws, seed 150: pool -> spine -> decision when more than one pool is read,
#              spine -> decision for one pool, decision for one spine
#   rows       the d-th row of seat A in the spine's baseline rows IS decision d (`rows.match`), J158's rule
#   void       J162's: "D470" when a block decision played one game under every option in every continuation the spine has
#   c_sizing7  labels and confident labels per 10-h night at the measured wall (spine-times.txt, checks included) scaled to 7
#              workers (wall x workers / 7), per spine, per pool and as run
import collections, glob, json, math, os, random, statistics, sys

B, SEED = 10000, 150
CONTRACT = 'mtg-table rung-4b label v6 (J177)'
SCAN_V = 'J182 v5'
args, opt = [], {}
for a in sys.argv[1:]:
    if a.startswith('--'):
        k, _, v = a[2:].partition('=')
        opt[k] = v
    else:
        args.append(a)
TRAINING = opt.get('training') == '1'
SEAT = opt.get('seat') or 'D498'
BIASED = set(x for x in opt.get('biased', '').split(',') if x)
ROW_KEYS = ('modesDrawn', 'retargeted', 'targetCountTrimmed', 'costTargetAvoided')
ROW0 = {'modesDrawn': 0, 'retargeted': 0, 'targetCountTrimmed': 0, 'costTargetAvoided': 0,
        'modesDrawnBranches': 0, 'targetCountTrimmedBranches': 0, 'costTargetAvoidedBranches': 0, 'branchRows': 0, 'fullN': 0}


def lost_cache(folder):
    """metrics.py --scan's cache for this spine folder, only when it was made from this folder's atlas.json as it stands"""
    if not opt.get('lost'):
        return None
    try:
        c = json.load(open(os.path.join(opt['lost'], os.path.basename(folder) + '.json')))
        return c if c.get('atlasMtime') == int(os.path.getmtime(os.path.join(folder, 'atlas.json'))) else None
    except (OSError, ValueError):
        return None


def forge_map(doc):
    return (doc.get('phaseB') or {}).get('forgeMap', True) is not False and doc['plan'].get('branchForge', 40) > 0


def complete(x, fm):
    if x.get('screened'):
        return False
    if 'decided' in x:   # D480's atlas: its own `complete`
        return bool(x['complete'])
    return x['complete'] and all(o['random']['mean'] is not None and (not fm or o['forge']['mean'] is not None) for o in x['options'])


def decided(x, fm):
    if 'decided' in x:
        return bool(x['decided'])
    return all(o['random']['mean'] >= 0.95 and (not fm or o['forge']['mean'] >= 0.95) for o in x['options'])


def settled(x, fm, comp):
    if 'settled' in x:
        return bool(x['settled'])
    return comp and decided(x, fm) or comp and all(o['random']['mean'] <= 0.05 and (not fm or o['forge']['mean'] <= 0.05) for o in x['options'])


def kbucket(k):
    return '2' if k <= 2 else '3-4' if k <= 4 else '5-6' if k <= 6 else '7-8'


def seat_rows(spine):
    for f in sorted(glob.glob(os.path.join(spine, 'phaseB', 'baseline', 'rows', '*.jsonl'))):
        rows, begin = [], None
        for line in open(f):
            try:
                r = json.loads(line)
            except ValueError:
                continue
            if r.get('type') == 'begin':
                begin = r
            elif r.get('type') == 'row':
                rows.append(r)
        if not begin:
            continue
        seat = 0 if begin.get('seat0') == 'Drafter A' else 1 if begin.get('seat1') == 'Drafter A' else None
        if seat is None:
            continue
        return f, seat, 'Drafter A', [r for r in rows if r.get('seat') == 'Drafter A']
    return None, None, None, []


def same_game(branches_file, conts):
    """Per decision: whether every option played the same game at every index where all of them played (J162's void test)."""
    rows, nopt = collections.defaultdict(dict), collections.defaultdict(set)
    if os.path.exists(branches_file):
        for line in open(branches_file):
            try:
                r = json.loads(line)
            except ValueError:
                continue
            rows[(r['d'], r['c'], r['i'])][r['o']] = r
            nopt[r['d']].add(r['o'])
    s = {}
    for (d, c, i), opts in rows.items():
        e = s.setdefault(d, {}).setdefault(c, {'indices': 0, 'allPlayed': 0, 'identical': 0})
        e['indices'] += 1
        if len(opts) < len(nopt[d]):
            continue
        if not all(r.get('error') is None and not r.get('timedOut') and not r.get('engineError') and not r.get('unavailable') for r in opts.values()):
            continue
        e['allPlayed'] += 1
        if len({(r['turns'], r['steps'], r['result']) for r in opts.values()}) == 1:
            e['identical'] += 1
    res = {}
    for d, cs in s.items():
        same = all(cs.get(c, {}).get('allPlayed', 0) > 0 and cs[c]['identical'] == cs[c]['allPlayed'] for c in conts)
        ev = {c: '%d of %d played indices identical across the %d options (%d of %d indices had an errored, timed-out, unavailable or stopped option)' % (
            cs.get(c, {}).get('identical', 0), cs.get(c, {}).get('allPlayed', 0), len(nopt[d]),
            cs.get(c, {}).get('indices', 0) - cs.get(c, {}).get('allPlayed', 0), cs.get(c, {}).get('indices', 0)) for c in conts}
        res[d] = {'same': same, 'evidence': ev}
    return res


def row_counts(branches_file):
    """v5: per decision, the sums of D486's modesDrawn, D485's retargeted and D488's targetCountTrimmed and costTargetAvoided over its
    branch rows (both maps), its rows with modesDrawn, targetCountTrimmed and costTargetAvoided above 0, and all of its branch rows"""
    rc = {}
    if os.path.exists(branches_file):
        for line in open(branches_file):
            try:
                r = json.loads(line)
            except ValueError:
                continue
            e = rc.setdefault(r['d'], dict(ROW0))
            e['branchRows'] += 1
            e['fullN'] += 1 if r.get('c') == 'random' and r.get('o') == 0 else 0
            for k in ROW_KEYS:
                v = r.get(k)
                if isinstance(v, (int, float)) and v > 0:
                    e[k] += v
                    if k != 'retargeted':
                        e[k + 'Branches'] += 1
    return rc


def poisson95(k):
    """the exact (Garwood) 95% interval of a Poisson mean with k observed, by bisection on the Poisson CDF"""
    def cdf(n, mu):
        return sum(math.exp(i * math.log(mu) - mu - math.lgamma(i + 1)) for i in range(n + 1)) if mu > 0 else 1.0

    def solve(f, lo, hi):
        for _ in range(200):   # f falls as mu grows: keep the root between lo and hi
            mid = (lo + hi) / 2
            lo, hi = (mid, hi) if f(mid) > 0 else (lo, mid)
        return (lo + hi) / 2
    top = 10.0 * (k + 10)
    lower = 0.0 if k == 0 else solve(lambda mu: cdf(k - 1, mu) - 0.975, 0.0, top)
    upper = solve(lambda mu: cdf(k, mu) - 0.025, 0.0, top)
    return lower, upper


labels, tree, same_any, meta = [], {}, [], {}
for a in args:
    name, pool, dseed, gseed, sha, spine = a.split(':', 5)
    spine = os.path.abspath(spine)
    doc = json.load(open(os.path.join(spine, 'atlas.json')))
    plan = json.load(open(os.path.join(spine, 'plan.json')))
    base = json.load(open(os.path.join(spine, 'phaseB', 'baseline.json')))
    fm = forge_map(doc)
    btok = {x['d']: x for x in base['decisions']}
    spine_listing = 'D483' if base['decisions'] and all(x.get('identities') for x in base['decisions']) else 'pre-D483' if not any(x.get('identities') for x in base['decisions']) else 'mixed'
    rf, seat, player, arows = seat_rows(spine)
    sg_all = same_game(os.path.join(spine, 'phaseB', 'branches.jsonl'), ('random', 'forge') if fm else ('random',))
    rc_all = row_counts(os.path.join(spine, 'phaseB', 'branches.jsonl'))
    pb = doc.get('phaseB') or {}
    sch = pb.get('schedule') or {}
    lc = lost_cache(spine)
    v5 = lc is not None and lc.get('scan') == SCAN_V
    meta[name] = {'pool': pool, 'deckSeed': int(dseed), 'gameSeed': int(gseed), 'sha': sha, 'listing': spine_listing, 'folder': os.path.basename(spine), 'forgeMap': fm,
                  'deckA': plan['deckA'], 'deckB': plan['deckB'],
                  'baseline': {'turns': (pb.get('baseline') or {}).get('turns'), 'winner': (pb.get('baseline') or {}).get('winner'),
                               'listed': (pb.get('baseline') or {}).get('decisionsListed')},
                  'branchedInFull': sch.get('branchedInFull'), 'screened': len(sch.get('screened') or []), 'fill': sch.get('fill'),
                  'stoppedOptions': sch.get('stoppedOptions'), 'meanOptions': sch.get('meanOptions'),
                  'randomSeat': SEAT, 'biased': 'lost-cast' if name in BIASED else None,
                  'lostScanned': lc is not None, 'lostCasts': lc.get('lostCasts') if lc else None, 'lostCastBranches': lc.get('lostCastBranches') if lc else None,
                  'scanV5': v5, 'casts': lc.get('casts') if v5 else None, 'refusedCast': lc.get('refusedCast') if v5 else None,
                  'refusedCastShare': lc.get('refusedCastShare') if v5 else None, 'castsRefused': lc.get('castsRefused') if v5 else None,
                  'refusedCastBranches': lc.get('refusedCastBranches') if v5 else None}
    tree.setdefault(pool, {}).setdefault(name, [])
    for x in pb.get('decisions', []):
        d = x['d']
        row = arows[d] if d < len(arows) else None
        match = bool(row) and d in btok and row['tokens'] == btok[d]['tokens'] and row['kind'] == x['kind'] and row['turn'] == x['turn']
        comp = complete(x, fm)
        dec = comp and decided(x, fm)
        rnd = [o['random']['mean'] for o in x['options'] if o['random']['mean'] is not None]
        lst = btok.get(d) or {}
        ids = lst.get('identities') or []
        toks = lst.get('tokens') or []
        lab = {
            'v': 6, 'contract': CONTRACT, 'spine': name, 'pool': pool, 'training': TRAINING, 'split': 'train' if TRAINING else None,
            'deckA': plan['deckA'], 'deckB': plan['deckB'], 'deckSeed': int(dseed), 'spineSeed': int(gseed), 'sha': sha,
            'listing': 'D483' if ids else 'pre-D483', 'playCount': len(set(ids)) if ids else len(toks), 'tokenTwice': len(set(toks)) < len(toks),
            'randomSeat': SEAT, 'biased': 'lost-cast' if name in BIASED else None,
            'd': d, 'kind': x['kind'], 'turn': x['turn'], 'k': len(x['options']), 'kBucket': kbucket(len(x['options'])),
            'why': x.get('why'), 'replaces': x.get('replaces'),
            'forgeOption': x['chosen'], 'forgeToken': x['options'][x['chosen']]['token'],
            'options': [{'o': o['o'], 'token': o['token'], 'label': o['label'], 'identity': ids[o['o']] if ids and o['o'] < len(ids) else None,
                         'stoppedAt': o.get('stoppedAt'),
                         'random': {k: o['random'][k] for k in ('n', 'mean', 'lo', 'hi')},
                         'forge': {k: o['forge'][k] for k in ('n', 'mean', 'lo', 'hi')}} for o in x['options']],
            'bestRandom': x['random']['best'], 'bestForge': x['forge']['best'] if fm else None,
            'regret': x['random']['regret'], 'regretLo': x['random']['regretLo'], 'regretHi': x['random']['regretHi'],
            'regretForge': x['forge']['regret'] if fm else None, 'regretForgeLo': x['forge']['regretLo'] if fm else None,
            'regretForgeHi': x['forge']['regretHi'] if fm else None,
            'confident': comp and not x.get('partial') and x['random']['regretLo'] is not None and x['random']['regretLo'] > 0,
            'confidentForge': (comp and x['forge']['regretLo'] is not None and x['forge']['regretLo'] > 0) if fm else None,
            'complete': comp, 'screened': bool(x.get('screened')), 'screenMean': x.get('screenMean'),
            'partial': bool(x.get('partial')), 'stoppedAt': x.get('stoppedAt') if x.get('partial') else None,
            'stopWhy': x.get('stopWhy') if x.get('partial') else None, 'futilityControl': bool(x.get('futilityControl')),
            'futilityGap': x.get('futilityGap'), 'branchRandom': plan['branchRandom'],
            'decided': dec, 'inQ': comp and not dec, 'settled': settled(x, fm, comp),
            'gap': round(max(rnd) - min(rnd), 4) if comp and rnd else None,
            'rho': x['rho'] if fm else None, 'sameBest': x['sameBest'] if fm else None, 'forgeMap': fm,
            'branches': {'random': plan['branchRandom'], 'forge': plan['branchForge'], 'branchTimeoutSec': plan.get('branchTimeoutSec'), 'cuts': plan.get('cuts')},
            'view': {'seat': seat, 'player': player, 'deck': 'A'},
            'frameLog': os.path.join(spine, 'phaseB', 'baseline', 'frames', 'baseline-seat%s.jsonl.gz' % seat) if seat is not None else None,
            'rows': {'file': rf, 'seatRow': d, 'match': match},
            'branchFrames': os.path.join(spine, 'phaseB', 'frames', 'd%d-{random|forge}-o{o}-b{i}-seat%s.jsonl.gz' % (d, seat)),
            'branchesFile': os.path.join(spine, 'phaseB', 'branches.jsonl'),
            'atlas': os.path.join(spine, 'atlas.json'),
        }
        lab.update(rc_all.get(d, dict(ROW0)))
        lab['branchedInFull'] = comp and lab['fullN'] >= plan['branchRandom']
        keys = [(o['o'], 'd%d/%s/o%d' % (d, c, o['o'])) for o in x['options'] for c in ('random', 'forge')]
        if lc is not None:
            bo = lc.get('byOption') or {}
            lab['lostCastOptions'] = sorted({oo for oo, kk in keys if (bo.get(kk) or {}).get('forcedLostBranches', 0) * 2 > (bo.get(kk) or {}).get('branches', 0) > 0})
            lab['lostCastVoid'] = 0 in lab['lostCastOptions']
            lab['lostCastBranches'] = sum((bo.get(kk) or {}).get('lostBranches', 0) for oo, kk in keys)
        else:
            lab['lostCastOptions'], lab['lostCastVoid'], lab['lostCastBranches'] = None, None, None
        if v5:
            bo = lc.get('byOption') or {}
            lab['refusedCastOptions'] = sorted({oo for oo, kk in keys if (bo.get(kk) or {}).get('forcedRefusedBranches', 0) * 2 > (bo.get(kk) or {}).get('branches', 0) > 0})
            lab['refusedCastVoid'] = 0 in lab['refusedCastOptions']
            lab['refusedCastBranches'] = sum((bo.get(kk) or {}).get('refusedBranches', 0) for oo, kk in keys)
            lab['refusedCastBranchShare'] = round(lab['refusedCastBranches'] / lab['branchRows'], 4) if lab['branchRows'] else None
        else:
            lab['refusedCastOptions'], lab['refusedCastVoid'], lab['refusedCastBranches'], lab['refusedCastBranchShare'] = None, None, None, None
        sg = sg_all.get(d, {'same': False, 'evidence': None})
        same_any.append((lab, sg['same']))
        lab['void'] = 'D470' if x['kind'] == 'b' and sg['same'] and comp else None
        if lab['void']:
            lab['voidEvidence'] = sg['evidence']
        labels.append(lab)
        if comp:
            tree[pool][name].append(lab)

if opt.get('out'):
    with open(opt['out'], 'w') as f:
        for lab in labels:
            f.write(json.dumps(lab, separators=(',', ':')) + '\n')


def mean(xs):
    return sum(xs) / len(xs) if xs else None


def boot(t, stat):
    """t: {pool: {spine: [items]}}: pool -> spine -> decision when t has several pools, spine -> decision for one, decision for one spine."""
    rng = random.Random(SEED)
    pools = sorted(t)
    vals = []
    for _ in range(B):
        items = []
        ps = [rng.choice(pools) for _ in pools] if len(pools) > 1 else pools
        for p in ps:
            ss = sorted(t[p])
            for s in ([rng.choice(ss) for _ in ss] if len(ss) > 1 else ss):
                xs = t[p][s]
                items.extend(rng.choice(xs) for _ in xs)
        v = stat(items)
        if v is not None:
            vals.append(v)
    if len(vals) < B / 2:
        return [None, None]
    vals.sort()
    return [round(vals[int(0.025 * len(vals))], 4), round(vals[min(len(vals) - 1, int(0.975 * len(vals)))], 4)]


def read(sel, stat, by_spine=False):
    t = {p: {s: [x for x in xs if sel(x)] for s, xs in ss.items()} for p, ss in tree.items()}
    flat = [x for ss in t.values() for xs in ss.values() for x in xs]
    pt = stat(flat)
    res = {'n': len(flat), 'point': None if pt is None else round(pt, 4), 'interval': boot(t, stat) if flat else [None, None], 'byPool': {}}
    for p in sorted(t):
        xs = [x for v in t[p].values() for x in v]
        q = stat(xs)
        res['byPool'][p] = {'n': len(xs), 'point': None if q is None else round(q, 4), 'interval': boot({p: t[p]}, stat) if xs else [None, None]}
    if by_spine:
        res['bySpine'] = {}
        for p in sorted(t):
            for s in sorted(t[p]):
                xs = t[p][s]
                q = stat(xs)
                res['bySpine'][s] = {'n': len(xs), 'point': None if q is None else round(q, 4), 'interval': boot({p: {s: xs}}, stat) if xs else [None, None]}
    return res


share = lambda key: (lambda xs: mean([1.0 if x[key] else 0.0 for x in xs]))
everything = lambda x: True
out = {'contract': CONTRACT, 'training': TRAINING, 'pools': {p: sorted(ss) for p, ss in tree.items()},
       'branched': len(labels), 'labels': sum(1 for x in labels if x['complete']),
       'screenedRows': sum(1 for x in labels if x['screened']),
       'rowsUnmatched': sum(1 for x in labels if not x['rows']['match']),
       'confident': sum(1 for x in labels if x['confident']),
       'confidentQ': sum(1 for x in labels if x['confident'] and x['inQ']),
       'confidentForge': sum(1 for x in labels if x['confidentForge']),
       'trainingRows': sum(1 for x in labels if x['training'] is True),
       'partialLabels': sum(1 for x in labels if x['partial']), 'futilityControls': sum(1 for x in labels if x['futilityControl']),
       'branchedInFullRows': sum(1 for x in labels if x['branchedInFull']), 'confidentPartial': sum(1 for x in labels if x['partial'] and x['confident']),
       'futilityRead': sum(1 for x in labels if x['futilityGap'] is not None)}
out['byListing'] = {L: {'spines': sorted({x['spine'] for x in labels if x['listing'] == L}), 'rows': sum(1 for x in labels if x['listing'] == L),
                        'labels': sum(1 for x in labels if x['listing'] == L and x['complete']), 'confident': sum(1 for x in labels if x['listing'] == L and x['confident']),
                        'tokenTwice': sum(1 for x in labels if x['listing'] == L and x['tokenTwice'])} for L in ('pre-D483', 'D483')}
out['biasedRows'] = sum(1 for x in labels if x['biased'])
out['lostCastVoid'] = sum(1 for x in labels if x['lostCastVoid'])
out['lostCastVoidList'] = ['%s d%d %s' % (x['spine'], x['d'], x['forgeToken']) for x in labels if x['lostCastVoid']]
out['lostCastOptionRows'] = ['%s d%d o%s' % (x['spine'], x['d'], ','.join(str(o) for o in x['lostCastOptions'])) for x in labels if x['lostCastOptions']]
out['refusedCastVoid'] = sum(1 for x in labels if x['refusedCastVoid'])
out['refusedCastVoidList'] = ['%s d%d %s' % (x['spine'], x['d'], x['forgeToken']) for x in labels if x['refusedCastVoid']]
out['refusedCastOptionRows'] = ['%s d%d o%s' % (x['spine'], x['d'], ','.join(str(o) for o in x['refusedCastOptions'])) for x in labels if x['refusedCastOptions']]
out['byRandomSeat'] = {S: {'spines': sorted({x['spine'] for x in labels if x['randomSeat'] == S}), 'rows': sum(1 for x in labels if x['randomSeat'] == S),
                           'labels': sum(1 for x in labels if x['randomSeat'] == S and x['complete']), 'confident': sum(1 for x in labels if x['randomSeat'] == S and x['confident'])}
                       for S in sorted({x['randomSeat'] for x in labels})}
out['bySpine'] = {}
for name, m in meta.items():
    xs = [x for x in labels if x['spine'] == name]
    cs = [x for x in xs if x['complete']]
    out['bySpine'][name] = dict(m, rows=len(xs), labels=len(cs), screenedRows=sum(1 for x in xs if x['screened']),
                                partialLabels=sum(1 for x in xs if x['partial']), futilityControls=sum(1 for x in xs if x['futilityControl']),
                                branchedInFullRows=sum(1 for x in xs if x['branchedInFull']), decisionsBranched=sum(1 for x in xs if not x['screened']),
                                inQ=sum(1 for x in cs if x['inQ']), decided=sum(1 for x in cs if x['decided']), settled=sum(1 for x in cs if x['settled']),
                                confident=sum(1 for x in cs if x['confident']), confidentForge=sum(1 for x in cs if x['confidentForge']) if m['forgeMap'] else None,
                                byKind={k: {'labels': sum(1 for x in cs if x['kind'] == k), 'confident': sum(1 for x in cs if x['kind'] == k and x['confident'])} for k in ('p', 'a', 'b')},
                                gapMedian=round(statistics.median([x['gap'] for x in cs]), 4) if cs else None,
                                regretMean=round(mean([x['regret'] for x in cs if x['regret'] is not None]), 4) if any(x['regret'] is not None for x in cs) else None,
                                confidentList=['d%d %s t%d k%d %s -> o%s, %.1f [%.1f, %.1f]' % (x['d'], x['kind'], x['turn'], x['k'], x['forgeToken'], x['bestRandom'],
                                               100 * x['regret'], 100 * x['regretLo'], 100 * x['regretHi']) for x in cs if x['confident']])
out['byPool'] = {p: {'spines': len(ss), 'labels': sum(len(v) for v in ss.values()), 'confident': sum(1 for v in ss.values() for x in v if x['confident'])} for p, ss in tree.items()}
# (a) the confident share: pooled, by pool, by spine; by kind; by option count; over Q
out['a_confidentShare'] = read(everything, share('confident'), by_spine=True)
out['a_confidentShareByKind'] = {k: read(lambda x, k=k: x['kind'] == k, share('confident')) for k in ('p', 'a', 'b')}
out['a_confidentShareByK'] = {k: read(lambda x, k=k: x['kBucket'] == k, share('confident')) for k in ('2', '3-4', '5-6', '7-8')}
out['a_confidentShareQ'] = read(lambda x: x['inQ'], share('confident'))
# (b) what a label tells: the gap, the regret, the settled share
out['b_gapMedian'] = {p: (round(statistics.median([x['gap'] for v in ss.values() for x in v]), 4) if any(ss.values()) else None) for p, ss in tree.items()}
out['b_gapMean'] = read(everything, lambda xs: mean([x['gap'] for x in xs]))
out['b_regretMean'] = read(everything, lambda xs: mean([x['regret'] for x in xs if x['regret'] is not None]))
out['b_settledShare'] = read(everything, share('settled'))
# (c) the sizing: per spine, per pool, per night, at the measured wall (checks included), and scaled to 7 workers
wall = {}
if opt.get('times') and os.path.exists(opt['times']):
    for line in open(opt['times']):
        f = line.split()
        if len(f) >= 3 and f[1].isdigit() and f[2].isdigit():
            prev = wall.get(f[0], (0, set()))
            wall[f[0]] = (prev[0] + int(f[2]) - int(f[1]), prev[1] | ({f[3]} if len(f) > 3 else set()))


def size(names):
    s = {'wallSec': 0, 'spinesTimed': 0, 'labels': 0, 'confident': 0, 'wallSecAt7': 0.0, 'workerHours': 0.0}
    for n in names:
        m = meta[n]
        w = wall.get(m['folder'])
        if w is None:
            continue
        ws = [int(v) for v in w[1] if str(v).isdigit()]
        s['wallSec'] += w[0]
        s['spinesTimed'] += 1
        s['labels'] += len(tree[m['pool']][n])
        s['confident'] += sum(1 for x in tree[m['pool']][n] if x['confident'])
        s['wallSecAt7'] += w[0] * (ws[0] / 7) if len(ws) == 1 else float('nan')
        s['workerHours'] += w[0] * ws[0] / 3600 if len(ws) == 1 else float('nan')
    h, h7 = s['wallSec'] / 3600, s['wallSecAt7'] / 3600
    ok7 = h7 == h7 and h7 > 0
    s['wallSecAt7'] = round(s['wallSecAt7']) if ok7 else None
    s['labelsPer10hNight'] = round(10 * s['labels'] / h) if h else None
    s['confidentPer10hNight'] = round(10 * s['confident'] / h) if h else None
    s['labelsPer7Worker10hNight'] = round(10 * s['labels'] / h7) if ok7 else None
    s['confidentPer7Worker10hNight'] = round(10 * s['confident'] / h7, 1) if ok7 else None
    lo, hi = poisson95(s['confident'])
    s['confidentPer7Poisson95'] = [round(10 * lo / h7, 1), round(10 * hi / h7, 1)] if ok7 else None
    okw = s['workerHours'] == s['workerHours'] and s['workerHours'] > 0
    s['confidentPerWorkerHour'] = round(s['confident'] / s['workerHours'], 4) if okw else None
    s['confidentPerWorkerHourPoisson95'] = [round(lo / s['workerHours'], 4), round(hi / s['workerHours'], 4)] if okw else None
    s['workerHours'] = round(s['workerHours'], 2) if okw else None
    return s


out['c_sizing7'] = {'bySpine': {n: size([n]) for n in meta}, 'byPool': {p: size(sorted(ss)) for p, ss in tree.items()}, 'asRun': size(list(meta))}
out['c_sizingRead'] = {'confidentPer7Worker10hNight': out['c_sizing7']['asRun']['confidentPer7Worker10hNight'],
                       'confident': out['c_sizing7']['asRun']['confident'], 'labelsPer7Worker10hNight': out['c_sizing7']['asRun']['labelsPer7Worker10hNight'],
                       'poisson95': out['c_sizing7']['asRun']['confidentPer7Poisson95'],
                       'confidentPerWorkerHour': out['c_sizing7']['asRun']['confidentPerWorkerHour'],
                       'confidentPerWorkerHourPoisson95': out['c_sizing7']['asRun']['confidentPerWorkerHourPoisson95'],
                       'readThis': 'confidentPerWorkerHour and confidentPer7Worker10hNight are the yield to compare across nights; the confident share over complete rows is not (D489: the stopped futile decisions are not in it)',
                       'review': {'confidentPer7Worker10hNight': 45.6, 'interval': [41.0, 50.8], 'base': 32.8, 'gain': [1.39, 1.25, 1.55],
                                  'note': 'the atlas review of 2026-10-27, section 5: the cap and the futility stop re-scored on 29 spines (no controls; ~43-44 with a quarter of the futile decisions played on: its hours x 0.675 / 0.71); another mix of decks and seats; as information'},
                       'expectation': 'as information, no verdict: J181 (ANOTHER POPULATION: D488\'s seat policy on D497\'s copier, before D498; the same design, other decks) below as its own report read it; J173 (D488, 200 branches) and J171 (D486, 28.9 [19.2, 41.8]) other populations too; the review ~46 [41, 51]'}
J181 = None
if opt.get('j181') and os.path.exists(opt['j181']):
    try:
        j6 = json.load(open(opt['j181']))
        a6 = j6['c_sizing7']['asRun']
        wh6 = a6['wallSecAt7'] * 7 / 3600 if a6.get('wallSecAt7') else None
        J181 = {'labels': j6['labels'], 'confident': j6['confident'], 'confidentShare': (j6.get('a_confidentShare') or {}).get('point'),
                'confidentPer7Worker10hNight': a6['confidentPer7Worker10hNight'], 'poisson95': a6['confidentPer7Poisson95'],
                'workerHours': round(wh6, 2) if wh6 else None, 'confidentPerWorkerHour': round(a6['confident'] / wh6, 4) if wh6 else None,
                'spines': len(j6.get('bySpine') or {}), 'contract': j6.get('contract'), 'pools': sorted(j6.get('pools') or {}),
                'futilityRead': {k: (j6.get('f_futilityRead') or {}).get(k) for k in ('controls', 'controlsConfident', 'stopped', 'read')},
                'population': 'D497 (the determinizer before D498): never pooled with this night (D498, Comparability)'}
    except (OSError, ValueError, KeyError, TypeError):
        J181 = None
out['c_sizingRead']['j181'] = J181


def clopper(k, n):
    """the exact (Clopper-Pearson) 95% interval of a binomial share, k of n, by bisection on the binomial CDF"""
    if n == 0:
        return [None, None]

    def cdf(kk, p):
        return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(kk + 1))

    def solve(f):
        lo, hi = 0.0, 1.0
        for _ in range(100):
            mid = (lo + hi) / 2
            lo, hi = (mid, hi) if f(mid) > 0 else (lo, mid)
        return (lo + hi) / 2
    low = 0.0 if k == 0 else solve(lambda p: cdf(k - 1, p) - 0.975)
    high = 1.0 if k == n else solve(lambda p: cdf(k, p) - 0.025)
    return [round(low, 4), round(high, 4)]


# (f) the futility read: the controls are the decisions the rule would have stopped, played to the full n; how many end confident is
# what the rule loses. POOLED across nights: this night's counts are pooledInputs; one night's ~10 controls are a partial read
ctl = [x for x in labels if x['futilityControl']]
stp = [x for x in labels if x['partial']]
kc = sum(1 for x in ctl if x['confident'])
cp = clopper(kc, len(ctl))
out['f_futilityRead'] = {'read': sum(1 for x in labels if x['futilityGap'] is not None), 'futile': len(ctl) + len(stp), 'stopped': len(stp),
                         'controls': len(ctl), 'controlsComplete': sum(1 for x in ctl if x['complete']), 'controlsConfident': kc,
                         'controlConfidentShare': round(kc / len(ctl), 4) if ctl else None, 'controlConfidentShare95': cp,
                         'labelsLostEstimate': round(kc / len(ctl) * len(stp), 2) if ctl else None,
                         'labelsLostEstimate95': [round(cp[0] * len(stp), 2), round(cp[1] * len(stp), 2)] if ctl else None,
                         'controlList': ['%s d%d k%d gap %s -> %s' % (x['spine'], x['d'], x['k'], x['futilityGap'], 'confident' if x['confident'] else 'not confident') for x in ctl],
                         'stoppedList': ['%s d%d k%d gap %s' % (x['spine'], x['d'], x['k'], x['futilityGap']) for x in stp],
                         'review': {'confident': 3, 'of': 77, 'share': 0.039, 'note': 'the atlas review of 2026-10-27, section 1: o0 leading or tied at 50 branches -> 3 of 77 confident at the full n (200), on 29 spines of three seats; read after the fact, not on controls'},
                         'pooledInputs': {'controls': len(ctl), 'controlsConfident': kc, 'stopped': len(stp), 'read': sum(1 for x in labels if x['futilityGap'] is not None)},
                         'partial': True, 'note': 'one night of a read pooled across nights: add pooledInputs to later nights\' before reading the share; no verdict'}
unb = [n for n in meta if n not in BIASED]
out['c_sizingReadUnbiased'] = dict(size(unb), spines=sorted(unb), left=sorted(n for n in meta if n in BIASED),
                                   note='the sizing read over the spines not marked biased (--biased=); J182 marks none, so it is the as-run read')
out['d486Rows'] = {'modesDrawn': sum(x['modesDrawn'] for x in labels), 'modesDrawnBranches': sum(x['modesDrawnBranches'] for x in labels),
                   'retargeted': sum(x['retargeted'] for x in labels), 'rowsWithModesDrawn': sum(1 for x in labels if x['modesDrawn'] > 0)}
out['d488Rows'] = {'targetCountTrimmed': sum(x['targetCountTrimmed'] for x in labels), 'costTargetAvoided': sum(x['costTargetAvoided'] for x in labels),
                   'targetCountTrimmedBranches': sum(x['targetCountTrimmedBranches'] for x in labels),
                   'costTargetAvoidedBranches': sum(x['costTargetAvoidedBranches'] for x in labels),
                   'rowsWithTrimmed': sum(1 for x in labels if x['targetCountTrimmed'] > 0), 'rowsWithAvoided': sum(1 for x in labels if x['costTargetAvoided'] > 0),
                   'refusedCastBranches': sum(x['refusedCastBranches'] or 0 for x in labels)}
# the void count (0 expected since D470), any non-block decision that played one game under every option
out['voidLabels'] = sum(1 for x in labels if x['void'])
out['voidList'] = ['%s d%d %s' % (x['spine'], x['d'], x['forgeToken']) for x in labels if x['void']]
out['sameGameNotBlock'] = ['%s d%d' % (x['spine'], x['d']) for x, same in same_any if same and x['kind'] != 'b' and x['complete']]
print(json.dumps(out, indent=1))
PY
cat > var/lab-j182-local/bin/reads.py <<'PY'
# J182: J177's reads.py, unchanged; the pools are `random-<band>-d498` on J182's night (D498's population).
# J177: J173's reads.py, unchanged. A futile-stopped (partial) decision is never complete, so (i)-(iv) and Q never read one; (vi) counts
# its branches in the branch games per label, the cost they are. J173's header: J171's reads.py, unchanged (J170's, J169's, J168's,
# J167's: J166's reads.py, J162's and J156's definitions, made per spine),
# registered before any J166 data. From atlas.json files named on the command line as NAME:POOL:PATH. Standard library only; no engine.
# A spine is a pair of its own (random decks of one band; the pool is the band, `random-<band>-d488` on J173's and J177's nights); `complete` and
# `decided` are atlas.json's (D480), with J158's definitions as the fallback for an atlas written before it; the agreement reads (i)-(iii)
# and the registered (iv) are made on the spines WITH a Forge map only (D480 point 5); C1's random-map statistic on a spine without one is
# printed as information, with no verdict. Definitions otherwise J156's, unchanged:
#   decided    atlas.json's (D480); fallback every option's mean >= 0.95 under BOTH maps
#   Q          the complete decisions that are not decided (screened decisions are never complete)
#   R          the complete decisions whose rank correlation is defined
#   interval   95% percentile bootstrap, 10,000 draws, seed 150: pool -> spine -> decision when several pools are read; spine ->
#              decision for one pool, which for one spine is decision-level
#   (i)   same best over Q;  (ii) mean rho over R, how many have two options;  (iii) regret at Forge's choice by kind under each
#         map, and how many decisions have a regret interval whose low end is above zero
#   (iv)  C1 "cast now where Forge passes": over Q priority decisions listing pass and at least one cast:/activate: option, the
#         mean over decisions of (the mean random value of the cast/activate options minus pass's random value; an option
#         early stopping dropped counts at its own n); HOLDS on a spine when the point is > 0 and the interval's low end is
#         > 0, else NOT SHOWN, on every spine with a Forge map; the Forge map's same statistic beside (over the options it
#         played), and C2 "don't attack" as information
#   (v)   the guardrail counts of every atlas.json, per spine and per pool
#   (vi)  the sizing line from atlas.json's branch counts and mean branch times, per spine
import json, random, sys

B, SEED = 10000, 150
spines, guard, pools, fmap = {}, {}, {}, {}
for a in sys.argv[1:]:
    name, pool, p = a.split(':', 2)
    doc = json.load(open(p))
    g = doc['checks']['guardrails']
    gp = guard.setdefault(name, {})
    for k, v in g.items():
        if isinstance(v, (int, float)):
            gp[k] = gp.get(k, 0) + v
    if not doc.get('phaseB'):
        continue
    spines[name] = doc
    pools[name] = pool
    fmap[name] = doc['phaseB'].get('forgeMap', True) is not False and doc['plan'].get('branchForge', 40) > 0


def complete(x, fm):
    if x.get('screened'):
        return False
    if 'decided' in x:
        return bool(x['complete'])
    return x['complete'] and all(o['random']['mean'] is not None and (not fm or o['forge']['mean'] is not None) for o in x['options'])


def decided(x, fm):
    if 'decided' in x:
        return bool(x['decided'])
    return all(o['random']['mean'] is not None and o['random']['mean'] >= 0.95 and (not fm or (o['forge']['mean'] is not None and o['forge']['mean'] >= 0.95)) for o in x['options'])


def Q(name):
    fm = fmap[name]
    return [x for x in spines[name]['phaseB']['decisions'] if complete(x, fm) and not decided(x, fm)]


def R(name):
    return [x for x in spines[name]['phaseB']['decisions'] if complete(x, fmap[name]) and x['rho'] is not None]


def mean(xs):
    return sum(xs) / len(xs) if xs else None


def boot(tree, stat):
    """J162's boot, the pool in the pair's place: tree {pool: {spine: [items]}}; levels 3 when several pools, else 2."""
    rng = random.Random(SEED)
    ps0 = sorted(tree)
    out = []
    for _ in range(B):
        items = []
        ps = [rng.choice(ps0) for _ in ps0] if len(ps0) > 1 else ps0
        for p in ps:
            ss = sorted(tree[p])
            for s in [rng.choice(ss) for _ in ss]:
                xs = tree[p][s]
                items.extend(rng.choice(xs) for _ in xs)
        v = stat(items)
        if v is not None:
            out.append(v)
    if len(out) < B / 2:
        return [None, None]
    out.sort()
    return [round(out[int(0.025 * len(out))], 4), round(out[min(len(out) - 1, int(0.975 * len(out)))], 4)]


def read(select, stat, names):
    """Pooled over `names` (pool -> spine -> decision), and each spine's (decision-level)."""
    tree = {}
    for n in names:
        tree.setdefault(pools[n], {})[n] = select(n)
    flat = [x for ss in tree.values() for xs in ss.values() for x in xs]
    pt = stat(flat)
    res = {'n': len(flat), 'point': None if pt is None else round(pt, 4), 'interval': boot(tree, stat) if flat else [None, None], 'bySpine': {}}
    for n in sorted(names):
        xs = select(n)
        q = stat(xs)
        res['bySpine'][n] = {'n': len(xs), 'point': None if q is None else round(q, 4), 'interval': boot({pools[n]: {n: xs}}, stat) if xs else [None, None]}
    return res


F = sorted(n for n in spines if fmap[n])
N = sorted(n for n in spines if not fmap[n])
out = {'spines': {n: {'pool': pools[n], 'forgeMap': fmap[n]} for n in sorted(spines)}, 'forgeSpines': F, 'definitions': 'see the header of this script'}
alld = [(n, x) for n in spines for x in spines[n]['phaseB']['decisions']]
out['decisions'] = len(alld)
out['complete'] = sum(1 for n, x in alld if complete(x, fmap[n]))
out['decided'] = sum(1 for n, x in alld if complete(x, fmap[n]) and decided(x, fmap[n]))
out['Q'] = out['complete'] - out['decided']
out['screened'] = sum(1 for n, x in alld if x.get('screened'))
# (i)-(iii), the spines with a Forge map
out['i_sameBest'] = read(Q, lambda xs: mean([1.0 if x['sameBest'] else 0.0 for x in xs if x['sameBest'] is not None]), F)
out['ii_rho'] = read(R, lambda xs: mean([x['rho'] for x in xs]), F)
out['ii_rho']['twoOption'] = sum(1 for n in F for x in R(n) if len(x.get('forgeOptions') or x['options']) == 2)
out['iii_regret'] = {}
for k in ('p', 'a', 'b'):
    sel = lambda n, k=k: [x for x in Q(n) if x['kind'] == k]
    row = {}
    for m in ('random', 'forge'):
        row[m] = read(sel, lambda xs, m=m: mean([x[m]['regret'] for x in xs if x[m]['regret'] is not None]), F)
        row[m]['clearOfZero'] = sum(1 for n in F for x in sel(n) if x[m]['regretLo'] is not None and x[m]['regretLo'] > 0)
    out['iii_regret'][k] = row


# (iv)
def val(x, tok, m):
    for o in x['options']:
        if o['token'] == tok:
            return o[m]['mean']
    return None


def c1(m):
    def sel(n):
        xs = []
        for x in Q(n):
            toks = [o['token'] for o in x['options']]
            acts = [o[m]['mean'] for o in x['options'] if o['token'].startswith(('cast:', 'activate:')) and o[m]['mean'] is not None]
            pv = val(x, 'pass', m)
            if x['kind'] == 'p' and 'pass' in toks and acts and pv is not None:
                xs.append(mean(acts) - pv)
        return xs
    return sel


def c2(m):
    def sel(n):
        xs = []
        for x in Q(n):
            toks = [o['token'] for o in x['options']]
            nv, v0 = val(x, 'attack:none', m), x['options'][0][m]['mean']
            if x['kind'] == 'a' and 'attack:none' in toks and toks[0] != 'attack:none' and nv is not None and v0 is not None:
                xs.append(nv - v0)
        return xs
    return sel


def verdict(r):
    lo = r['interval'][0]
    return 'HOLDS' if r['point'] is not None and r['point'] > 0 and lo is not None and lo > 0 else 'NOT SHOWN'


r1, f1 = read(c1('random'), mean, F), read(c1('forge'), mean, F)
r2, f2 = read(c2('random'), mean, F), read(c2('forge'), mean, F)
out['iv_bySpine'] = {}
for n in F:
    c = r1['bySpine'][n]
    out['iv_bySpine'][n] = {'C1_castNow': {'random': c, 'verdict': verdict(c), 'forgeMap': f1['bySpine'][n]},
                            'C2_dontAttack': {'random': r2['bySpine'][n], 'forgeMap': f2['bySpine'][n], 'verdict': None}}
out['iv_pooledForgeSpines'] = {'C1_castNow': {'random': {k: r1[k] for k in ('n', 'point', 'interval')}, 'forgeMap': {k: f1[k] for k in ('n', 'point', 'interval')}, 'verdict': None}}
ri = read(c1('random'), mean, N) if N else None
out['iv_information_noForgeSpines'] = {'C1_castNow_random': ri, 'verdict': None}
# (v)
tot, byPool = {}, {}
for n, gp in guard.items():
    bp = byPool.setdefault(pools.get(n, '?'), {})
    for k, v in gp.items():
        tot[k] = tot.get(k, 0) + v
        bp[k] = bp.get(k, 0) + v
out['v_guardrails'] = {'bySpine': guard, 'byPool': byPool, 'total': tot}


# (vi)
def sizing(n):
    doc = spines[n]
    ds = [x for x in doc['phaseB']['decisions'] if not x.get('screened')]
    nr = sum(o['random']['n'] for x in ds for o in x['options'])
    nf = sum(o['forge']['n'] for x in ds for o in x['options'])
    ms = doc['phaseB'].get('meanBranchMs') or {}
    tr, tf = (ms.get('random') or 0) / 1000, (ms.get('forge') or 0) / 1000
    comp = sum(1 for x in ds if complete(x, fmap[n]))
    if not comp or not tr:
        return None
    ws = (nr * tr + nf * tf) / comp
    return {'optionsPerDecision': round(sum(len(x['options']) for x in ds) / len(ds), 2), 'branchGamesPerLabel': round((nr + nf) / comp),
            'secRandomBranch': round(tr, 2), 'secForgeBranch': round(tf, 2) if nf else None, 'workerSecPerLabel': round(ws),
            'labelsPer7WorkerHour': round(7 * 3600 / ws, 1), 'labelsPer10hNightAt7': round(70 * 3600 / ws)}


out['vi_bySpine'] = {n: sizing(n) for n in sorted(spines)}
print(json.dumps(out, indent=1))
PY
cat > var/lab-j182-local/bin/cuts.py <<'PY'
# J182: J177's cuts.py, unchanged. `capSavedMs` stays measured against a 200-branch design (J173's; a definition, not a
# comparison); compare.py now carries J177's column, not J173's.
# J177: J173's cuts.py with D489's and the cap's savings and what they bought, registered before any J177 data (every J173 number and
# definition unchanged; on a spine with no futility read and branchRandom 200 the new ones are 0). New, per spine and for the night:
#   futileSavedMs     for each decision the futility rule STOPPED (its schedule.jsonl `futility` line, `stopped: true`): the options
#                     running at the checkpoint (`alive`) x (branchRandom - at) x the decision's mean random-branch ms, plus, on a
#                     Forge-map spine, branchForge x alive x the spine's mean Forge-branch ms (a stopped decision has no Forge map)
#   capSavedMs        for each complete decision when branchRandom < 200 (J173's design): its options early stopping did not stop x
#                     (200 - branchRandom) x its mean random-branch ms -- an upper bound (J173's design early-stops some at 150)
#   futilityCapShare  (futileSavedMs + capSavedMs) / (branchMs + futileSavedMs + capSavedMs): the branch time the two saved, against
#                     the same decisions on J173's design
#   futileBranchGamesSaved, futileStopped, futileControls   atlas.json's (an upper bound, D489)
#   decisionsBranched the decisions not screened (complete or partial); partial the futile-stopped ones; branchedInFullRows the complete
#                     ones whose option 0 has branchRandom random rows (computed here, whatever atlas.json's branchedInFull counts):
#                     what the saved time bought, against J173's 8 a spine (compare.py has J173's column)
# J173's header: J172's cuts.py (J171's with `atlas.j171.json` among the timing copies, so the pilot's self-test on J171's night, whose five
# re-checked spines carry J171's phase-B timing in that copy, gives J171's numbers back; lab-j177 holds no copy, so every J177 spine's
# timing is its own atlas.json's), with one addition registered before any J173 data: the night's `redactionHours` (the sum of each
# atlas.json's `checks.redactionMs`: the redaction checker's own wall, which J171's failing logs tripled on five spines) and
# `redactionShareOfChecks` (its share of `checksHours`). J171's header (J170's, J169's, J168's, J167's, J166's):
# What the cut design (D480) saved, per spine and for the night. A spine whose atlas.json was rewritten by a re-check reads phase B's
# timing from the first of its `atlas.j166.json`, `atlas.j168.json`, `atlas.j171.json` copies that exists (a re-check's own timing says
# 0 units, 0 ms); --recheck-times=FILE gives each re-check's wall apart (`recheckSec`), never added to the spine's checks.
# Definitions (J166's, registered before any J166 data):
#   branchMs         the sum of every branch row's ms (both continuations, errors included): the branch time as run
#   earlyStopAvoided for each option early stopping stopped at `at` random branches: (branchRandom - at) x the decision's mean
#                    random-branch ms, plus, on a spine with a Forge map, branchForge x the decision's mean Forge-branch ms
#   screenAvoided    for each screened decision: (branchRandom - screen) x k x its mean random-branch ms, plus, on a spine with
#                    a Forge map, branchForge x k x the spine's mean Forge-branch ms (a screened decision has no Forge map)
#   projectedMs      branchMs + earlyStopAvoided + screenAvoided: the same decisions branched in full, uncut
#   savedShare       (projectedMs - branchMs) / projectedMs; the review's replay of the cuts on six spines: 18-20%
#   idleShare        1 - (sum of the ok units' ms) / (phase B wall x workers): the workers' time phase B held without a unit
#   checksSec        the spine's wall in spine-times.txt (its block's start to end, summed over resumed runs) minus atlas.json's
#                    timing.wallMs (the baseline and phase B; written before the checks run): the post-spine checks' wall
#   checksSecPerKGames  checksSec per 1,000 branch games; J162's serial checks took 60-113 s per 1,000 (mean 93)
#   checksShare      the night's checksSec over its wallSec (J170's addition)
import json, os, sys

J162_SERIAL_S_PER_KGAMES = 93
J173_RANDOM = 200
args = [a for a in sys.argv[1:] if not a.startswith('--')]
wall, rewall = {}, {}
for a in sys.argv[1:]:
    for flag, dst in (('--times=', wall), ('--recheck-times=', rewall)):
        if a.startswith(flag) and os.path.exists(a.split('=', 1)[1]):
            for line in open(a.split('=', 1)[1]):
                f = line.split()
                if len(f) >= 3 and f[1].isdigit() and f[2].isdigit():
                    dst[f[0]] = dst.get(f[0], 0) + int(f[2]) - int(f[1])
out, night = {'bySpine': {}}, {'branchMs': 0, 'earlyStopAvoidedMs': 0, 'screenAvoidedMs': 0, 'projectedMs': 0, 'checksSec': 0, 'branchGames': 0,
                                'unitMs': 0, 'heldMs': 0, 'screened': 0, 'stoppedOptions': 0, 'spines': 0, 'recheckSec': 0, 'wallSec': 0, 'redactionSec': 0,
                                'futileSavedMs': 0, 'capSavedMs': 0, 'futileBranchGamesSaved': 0, 'futileStopped': 0, 'futileControls': 0,
                                'decisionsBranched': 0, 'partial': 0, 'branchedInFullRows': 0}
for spine in args:
    name = os.path.basename(os.path.abspath(spine))
    try:
        doc = json.load(open(os.path.join(spine, 'atlas.json')))
    except (OSError, ValueError):
        continue
    tfile = next((os.path.join(spine, x) for x in ('atlas.j166.json', 'atlas.j168.json', 'atlas.j171.json') if os.path.exists(os.path.join(spine, x))), os.path.join(spine, 'atlas.j166.json'))
    tdoc = doc
    if os.path.exists(tfile):
        try:
            tdoc = json.load(open(tfile))
        except (OSError, ValueError):
            pass
    plan, pb, tm = doc['plan'], doc.get('phaseB') or {}, tdoc.get('timing') or {}
    R, F, screen = plan['branchRandom'], plan['branchForge'], ((plan.get('cuts') or {}).get('screen') or 0)
    fm = pb.get('forgeMap', True) is not False and F > 0
    rows = []
    for line in open(os.path.join(spine, 'phaseB', 'branches.jsonl')):
        try:
            rows.append(json.loads(line))
        except ValueError:
            pass
    ms = {}
    for r in rows:
        ms.setdefault((r['d'], r['c']), []).append(r.get('ms') or 0)
    mean = lambda xs: sum(xs) / len(xs) if xs else 0.0
    allF = [m for (d, c), v in ms.items() if c == 'forge' for m in v]
    sch = pb.get('schedule') or {}
    kof = {int(k[1:]): v for k, v in (sch.get('optionsByDecision') or {}).items()}
    es = sum((R - s['at']) * mean(ms.get((s['d'], 'random'), [])) + (F * mean(ms.get((s['d'], 'forge'), [])) if fm else 0) for s in sch.get('stopped') or [])
    sc = sum((R - screen) * kof.get(s['d'], 0) * mean(ms.get((s['d'], 'random'), [])) + (F * kof.get(s['d'], 0) * mean(allF) if fm else 0) for s in sch.get('screened') or [])
    bms = sum(r.get('ms') or 0 for r in rows)
    proj = bms + es + sc
    # D489 and the cap: what they saved against the same decisions on J173's design
    fut = 0.0
    sf = os.path.join(spine, 'phaseB', 'schedule.jsonl')
    if os.path.exists(sf):
        for line in open(sf):
            try:
                e = json.loads(line)
            except ValueError:
                continue
            if e.get('type') == 'futility' and e.get('stopped'):
                na = len(e.get('alive') or [])
                fut += na * (R - e['at']) * mean(ms.get((e['d'], 'random'), [])) + (F * na * mean(allF) if fm else 0)
    o0r = {}
    for r in rows:
        if r['c'] == 'random' and r['o'] == 0:
            o0r[r['d']] = o0r.get(r['d'], 0) + 1
    cap = 0.0
    if R < J173_RANDOM:
        for x in pb.get('decisions') or []:
            if x.get('complete') and not x.get('partial'):
                cap += sum(1 for o in x['options'] if o.get('stoppedAt') is None) * (J173_RANDOM - R) * mean(ms.get((x['d'], 'random'), []))
    dec = [x for x in pb.get('decisions') or [] if not x.get('screened')]
    units = []
    uf = os.path.join(spine, 'phaseB', 'units.jsonl')
    if os.path.exists(uf):
        for line in open(uf):
            try:
                u = json.loads(line)
            except ValueError:
                continue
            if u.get('ok') and u.get('ms'):
                units.append(u['ms'])
    tb = tm.get('phaseB') or {}
    held = (tb.get('ms') or 0) * (tb.get('workers') or 0)
    chk = wall[name] - (tm.get('wallMs') or 0) / 1000 if name in wall else 0
    red = ((doc.get('checks') or {}).get('redactionMs') or 0) / 1000
    s = {'forgeMap': fm, 'timingFrom': os.path.basename(tfile) if tdoc is not doc else 'atlas.json', 'branchGames': len(rows), 'branchMs': bms,
         'earlyStopAvoidedMs': round(es), 'screenAvoidedMs': round(sc), 'projectedMs': round(proj),
         'savedShare': round((proj - bms) / proj, 4) if proj else None, 'earlyStopShare': round(es / proj, 4) if proj else None,
         'screenShare': round(sc / proj, 4) if proj else None, 'screened': len(sch.get('screened') or []), 'stoppedOptions': sch.get('stoppedOptions', 0),
         'phaseBWallSec': round((tb.get('ms') or 0) / 1000), 'workers': tb.get('workers'), 'unitSec': round(sum(units) / 1000),
         'idleShare': round(1 - sum(units) / held, 4) if held else None, 'checksSec': round(chk), 'redactionSec': round(red),
         'checksSecPerKGames': round(1000 * chk / len(rows), 1) if rows else None, 'j162SerialSecPerKGames': J162_SERIAL_S_PER_KGAMES,
         'recheckSec': rewall.get(name),
         'futileSavedMs': round(fut), 'capSavedMs': round(cap), 'futilityCapShare': round((fut + cap) / (bms + fut + cap), 4) if bms + fut + cap else None,
         'futileBranchGamesSaved': sch.get('futileBranchGamesSaved', 0), 'futileStopped': sch.get('futileStopped', 0), 'futileControls': sch.get('futileControls', 0),
         'decisionsBranched': len(dec), 'partial': sum(1 for x in dec if x.get('partial')),
         'branchedInFullRows': sum(1 for x in dec if x.get('complete') and o0r.get(x['d'], 0) >= R)}
    out['bySpine'][name] = s
    for k in ('branchMs', 'branchGames', 'screened', 'stoppedOptions'):
        night[k] += s[k]
    night['earlyStopAvoidedMs'] += es
    night['screenAvoidedMs'] += sc
    night['projectedMs'] += proj
    night['checksSec'] += chk
    night['unitMs'] += sum(units)
    night['heldMs'] += held
    night['spines'] += 1
    night['recheckSec'] += rewall.get(name) or 0
    night['wallSec'] += wall.get(name, 0)
    night['redactionSec'] += red
    night['futileSavedMs'] += fut
    night['capSavedMs'] += cap
    for k in ('futileBranchGamesSaved', 'futileStopped', 'futileControls', 'decisionsBranched', 'partial', 'branchedInFullRows'):
        night[k] += s[k]
p = night['projectedMs']
out['night'] = {'spines': night['spines'], 'branchGames': night['branchGames'], 'branchHours': round(night['branchMs'] / 3.6e6, 2), 'projectedHours': round(p / 3.6e6, 2),
                'savedShare': round((p - night['branchMs']) / p, 4) if p else None, 'earlyStopShare': round(night['earlyStopAvoidedMs'] / p, 4) if p else None,
                'screenShare': round(night['screenAvoidedMs'] / p, 4) if p else None, 'screened': night['screened'], 'stoppedOptions': night['stoppedOptions'],
                'idleShare': round(1 - night['unitMs'] / night['heldMs'], 4) if night['heldMs'] else None, 'checksHours': round(night['checksSec'] / 3600, 2),
                'wallSec': night['wallSec'], 'checksShare': round(night['checksSec'] / night['wallSec'], 4) if night['wallSec'] else None,
                'checksSecPerKGames': round(1000 * night['checksSec'] / night['branchGames'], 1) if night['branchGames'] else None,
                'checksHoursAtJ162Serial': round(night['branchGames'] * J162_SERIAL_S_PER_KGAMES / 1000 / 3600, 2), 'recheckSec': night['recheckSec'],
                'redactionHours': round(night['redactionSec'] / 3600, 2),
                'redactionShareOfChecks': round(night['redactionSec'] / night['checksSec'], 4) if night['checksSec'] else None,
                'reviewExpectation': 'cuts save 18-20% of branch time (atlas review 3b+3d; D480 replay 20.3%); J171 measured 31.5% (early stop 16.4%, screen 15.1%)',
                'futileSavedHours': round(night['futileSavedMs'] / 3.6e6, 2), 'capSavedHours': round(night['capSavedMs'] / 3.6e6, 2),
                'futilityCapShare': round((night['futileSavedMs'] + night['capSavedMs']) / (night['branchMs'] + night['futileSavedMs'] + night['capSavedMs']), 4) if night['branchMs'] else None,
                'futileBranchGamesSaved': night['futileBranchGamesSaved'], 'futileStopped': night['futileStopped'], 'futileControls': night['futileControls'],
                'decisionsBranched': night['decisionsBranched'], 'partial': night['partial'], 'branchedInFullRows': night['branchedInFullRows'],
                'decisionsBranchedPerSpine': round(night['decisionsBranched'] / night['spines'], 2) if night['spines'] else None,
                'futilityExpectation': 'the atlas review, policy.md: the cap and the futility stop take the same decisions from 110.61 to 74.67 branch worker-hours (32.5% saved; no controls); D489 replay of J171: the stop alone 16.5% of branch hours; J173 branched 8 decisions a spine'}
print(json.dumps(out, indent=1))
PY
cat > var/lab-j182-local/bin/metrics.py <<'PY'
# J182's metrics (drafts/J182-atlas-4b-night-seven.md): J177's metrics.py for a NEW data folder, lab-j182, where all 13 spines are
# J182's, branched at the pin by D488's random seat policy on D493's copier, on J177's design; registered before any J182 data.
# What changed from J177's (every J177 key and definition kept): (a) the spine table is J182's (deck seeds 2401-2413, game seeds
# 2501-2513, the bands cycled as J166's); (b) the pools are `random-<band>-d498` and the seat "D498" (poolOk: D493's population);
# (c) compare-j181.json for the `compare` key; (d) the scan stamp `J182 v5` and the defaults lab-j182, var/lab-j182-local.
# J177's header, unchanged below:
# J177's metrics (drafts/J177-atlas-4b-night-three.md): J173's metrics.py for a NEW data folder, lab-j177, where all 13 spines are J177's,
# branched at the pin by D488's random seat (unchanged since J173) on D489's design; registered before any J177 data. What changed from
# J173's (every J173 key and definition kept):
# (a) The spine table is J177's (deck seeds 2040-2052, game seeds 2140-2152, the bands cycled as J166's); the plan wanted is
#     --branch-random 150, --decisions 10 and the cuts {earlyStop [50, 100], screen 25, minOptions 3, futility {at 0, tie 0, sample 0.25}}.
# (b) D489's counters per spine and summed, from each atlas.json's phaseB.schedule: `futilityReads` (len of `futility`), `futileRead`
#     (those futile), `futileStopped`, `futileControls`, `futileBranchGamesSaved`, `partialLabels`; `futilityKeys` the spines whose schedule
#     carries all four counters; `partialDecisions` the decisions with `partial: true` (== futileStopped, a check through labels.json).
# (c) "Branched in full" and the units planned are computed per decision from atlas.json's own fields, so they are right whether or not
#     atlas.json's `branchedInFull` counts a futile-stopped decision: `decisionsBranched` = not screened (complete or partial); fullShort
#     when that is below min(decisions, listed - screened); units planned = a screened decision's ceil(screen / chunk), a partial one's
#     ceil(stoppedAt / chunk), every other's ceil(branchRandom / chunk) + ceil(branchForge / chunk).
# (d) From labels.json: `partialLabels` (rows), `confidentPartial` (0), `futilityControls`, `confidentPerWorkerHour`; compare-j173.json
#     (column `j177`) for the `compare` key.
# J173's header (J171's metrics.py, lab-j173): the validation draw's sha256 is the one the pilot recorded
#     (var/lab-j177-local/draws-pilot.json, made at the pin and checked against the redraw), not a constant; J167's s04 deck check is gone;
#     the pools are `random-<band>-d488` and the seat "D488" (poolOk).
# (2) THE SCAN places every cast, beside J169's lost casts. D488 (Context) found that 614 of J171's 645 "lost casts" were G5's refused
#     payments: D466's put-back returns the card to the hand by a zone move that fires no event, so J169's definition counts it lost,
#     and misses a refused cast whose card is cast again later. So, per cast (a zone event {hand, the viewer} -> {stack, null}):
#       ON THE STACK  a state frame at or after it lists the card in `stackCards`, or a `cast` event or a zone event off the stack names it;
#       REFUSED       before the first such line, the first state frame that lists the card anywhere lists it in its caster's own hand
#                     (the viewer's: `castsRefused`, by card name); FORCED when the card is the branch's own option and it is put back
#                     before the branch's first AI decision record (`castsRefusedForced`);
#       A REFUSED-CAST OPTION: (decision, map, option) whose forced cast was refused in more than half of its branch rows
#                     (`refusedCastOptions`; J173's final check, 0);
#     J169's LOST CAST is kept as defined (no stack evidence after the cast, ever; `lostCastOptions`, a final check at 0), split into
#     `lostPutBack` (its card is next listed in its caster's hand: a refusal J169 counted lost) and `lostStranded` (the rest).
#     THE HEADLINE: `refusedCastShare` = the seats' own `refusedCast` (G5's count, each log's guardrail summary) / casts, per spine and for
#     the night (J171: 4,451 / 840,488); `castsRefusedShare` = castsRefused / casts beside it. `refusedCast` is an upper bound on the
#     payment refusals (D488, Not fixed: it also counts D485's stale answers not offered and Forge's answers D488 could not fit), so
#     `staleRefused` is read beside it and the put-backs are the frames' own count of the payment refusals.
#     D488's counters from the same summaries: `targetCountTrimmed`, `costTargetAvoided` (protocol M77).
#     D487's from the target records: `target:none` chosen (`targetNoneChosen`) and listed (`targetNoneListed`), `why: "NO_TARGET"`
#     (`noTargetRecords`), any null answer (`nullChosenTargets`) and J171's legacy shape (`legacyNullTargets`: by forge, source targets,
#     chosen null, two or more target:<id> / target:p<id> options and nothing else, none of min, why, complete, hidden, explore, search;
#     D487, M76) -- 0 expected on a D487 pin, a final check (`legacyNullTargetRecords`). `completeShare`: complete target records / all.
#     The cache carries `scan: "J177 v5"`; main mode reads only such caches.
# (3) The branch rows' `targetCountTrimmed` and `costTargetAvoided` (D488, BranchRow, written when > 0), beside D486's `modesDrawn`.
# (4) The worker logs, per spine: `AI failed to play <card> (<id>) [...]` (`failedToPlay`, by card: Forge's own line for a payment the
#     AI refused, naming the card), `Didn't find what to pay for` (`payFail`) and D488's `branch error, stack:` (`branchErrorStacks`).
# (5) An optional third argument: the scan caches' folder (default var/lab-j177-local/lost; the pilot's self-tests pass lost-self).
# J169's and J171's definitions otherwise, unchanged.
#   metrics.py --scan FOLDER CACHE_DIR [JOBS]  scans FOLDER's phase B branch frame logs and writes CACHE_DIR/<folder>.json, stamped
#                                              with FOLDER's atlas.json mtime (a cache of another atlas.json is never read)
#   metrics.py [DATA_DIR] [SPINE_GLOB] [CACHE_DIR]   default /home/justin-a/code/lab/data/lab-j177, b-s??-*-21?? (never the pilot
#                                              folders) and var/lab-j177-local/lost
# Standard library only; no engine.
import bisect, glob, gzip, hashlib, json, math, os, re, sys
NAME = re.compile(r'd(\d+)-(random|forge)-o(\d+)-b(\d+)-seat(\d)\.jsonl\.gz$')
CAST_RE = re.compile(r'"kind":"zone","cardId":(\d+),"from":\{"zone":"hand","player":(\d+)\},"to":\{"zone":"stack","player":null\}')
LIVE_RE = re.compile(r'"kind":"zone","cardId":(\d+),"from":\{"zone":"stack"|"kind":"cast","stackId":-?\d+,"cardId":(\d+)')
CARD_TOKEN = re.compile(r'target:p?\d+$')
FTP = re.compile(r'AI failed to play (.+?) \(\d+\) \[')
LEGACY_BAN = ('min', 'why', 'complete', 'hidden', 'explore', 'search')
SCAN_V = 'J182 v5'
SCAN_COUNTS = ('casts', 'lost', 'forced', 'refused', 'refusedForced', 'lostPutBack', 'stale', 'modesWhy', 'modesSource', 'targetRecords',
               'targetRecordsCard', 'targetRecordsComplete', 'targetRecordsCardComplete', 'targetNoneChosen', 'targetNoneListed',
               'noTargetRecords', 'nullChosenTargets', 'legacyNullTargets', 'randomised', 'randomisedPriority', 'summaries')
BO0 = {'branches': 0, 'lostBranches': 0, 'forcedLostBranches': 0, 'refusedBranches': 0, 'forcedRefusedBranches': 0}


def where(body, cid, seat):
    """where a state frame lists card cid: 'stack', 'hand' (its caster's, the viewer's, own hand), another zone's name, or None"""
    for sc in body.get('stackCards') or []:
        if isinstance(sc, dict) and sc.get('id') == cid:
            return 'stack'
    for p in body.get('players') or []:
        zs = p.get('zones') if isinstance(p, dict) else None
        for zn, z in (zs if isinstance(zs, dict) else {}).items():
            for cd in (z.get('cards') if isinstance(z, dict) else None) or []:
                if isinstance(cd, dict) and cd.get('id') == cid:
                    return 'hand' if zn == 'hand' and p.get('id') == seat else zn
    return None


def legacy(b):
    """J171's legacy null target record (D487, M76), whatever the log's date"""
    opts = b.get('options') or []
    return (b.get('by') == 'forge' and b.get('source') == 'targets' and 'chosen' in b and b['chosen'] is None and len(opts) >= 2
            and all(isinstance(t, str) and CARD_TOKEN.match(t) for t in opts) and not any(k in b for k in LEGACY_BAN))


def scan_log(path):
    """one branch frame log: its casts from the viewer's own hand, where each went (the stack, back in hand: refused, or nowhere: J169's
    lost), the forced ones, the cards' names, D485's, D486's and D487's records, and its decisions summary's explore counts"""
    m = NAME.search(path)
    d, c, o, i, seat = int(m.group(1)), m.group(2), int(m.group(3)), int(m.group(4)), int(m.group(5))
    casts, live, states, first_dec, tok = [], {}, {}, None, None
    n = dict.fromkeys(SCAN_COUNTS, 0)
    g = {}
    with gzip.open(path, 'rt') as f:
        for k, l in enumerate(f):
            if k == 0:
                try:
                    h = json.loads(l)
                    tok, seat = (h.get('lab') or {}).get('optionToken'), h.get('seat', seat)
                except ValueError:
                    pass
                continue
            if '"dir":"ai"' in l:
                if '"type":"decisions"' in l:
                    try:
                        e = ((json.loads(l).get('body') or {}).get('explore')) or {}
                    except ValueError:
                        e = {}
                    n['summaries'] += 1
                    n['randomised'] += e.get('decisionsRandomised') or 0
                    n['randomisedPriority'] += (e.get('byKind') or {}).get('priority') or 0
                    for kk, v in (e.get('guardrails') or {}).items():
                        if isinstance(v, (int, float)):
                            g[kk] = g.get(kk, 0) + v
                elif '"type":"decision"' in l:
                    first_dec = k if first_dec is None else first_dec
                    n['stale'] += 1 if '"STALE_TARGETS"' in l else 0
                    n['modesWhy'] += 1 if '"MODES_DRAWN"' in l else 0
                    n['modesSource'] += 1 if '"source":"modes"' in l else 0
                    if '"kind":"target"' in l:
                        try:
                            b = json.loads(l).get('body') or {}
                        except ValueError:
                            b = {}
                        if b.get('kind') == 'target':
                            opts = b.get('options') or []
                            card = any(isinstance(t, str) and t.startswith('target:') and not t.startswith('target:p') and t != 'target:none' for t in opts)
                            whole = b.get('complete') is not False
                            n['targetRecords'] += 1
                            n['targetRecordsCard'] += 1 if card else 0
                            n['targetRecordsComplete'] += 1 if whole else 0
                            n['targetRecordsCardComplete'] += 1 if card and whole else 0
                            n['targetNoneChosen'] += 1 if b.get('chosen') == 'target:none' else 0
                            n['targetNoneListed'] += 1 if 'target:none' in opts else 0
                            n['noTargetRecords'] += 1 if b.get('why') == 'NO_TARGET' else 0
                            n['nullChosenTargets'] += 1 if 'chosen' in b and b['chosen'] is None else 0
                            n['legacyNullTargets'] += 1 if legacy(b) else 0
                continue
            if '"type":"state"' not in l:
                continue
            states[k] = l
            for mm in CAST_RE.finditer(l):
                if int(mm.group(2)) == seat:
                    casts.append((int(mm.group(1)), k))
            for mm in LIVE_RE.finditer(l):
                live.setdefault(int(mm.group(1) or mm.group(2)), []).append(k)
            if '"stackCards":[{' in l:
                try:
                    b = json.loads(l).get('body') or {}
                except ValueError:
                    b = {}
                for sc in b.get('stackCards') or []:
                    if isinstance(sc, dict) and isinstance(sc.get('id'), int):
                        live.setdefault(sc['id'], []).append(k)
    own = lambda cid: isinstance(tok, str) and (tok == 'cast:%d' % cid or tok.startswith('cast:%d#' % cid))
    order = sorted(states)
    lost, refused, putback = [], [], []
    for cid, ln in casts:
        lv = live.get(cid) or []
        j = bisect.bisect_left(lv, ln)
        fl = lv[j] if j < len(lv) else None   # the first line at or after the cast with the card on the stack
        placed = None
        if fl != ln:
            for k in order[bisect.bisect_left(order, ln):]:
                if fl is not None and k >= fl:
                    break
                try:
                    b = json.loads(states[k]).get('body') or {}
                except ValueError:
                    continue
                placed = where(b, cid, seat)
                if placed is not None:
                    break
        before = first_dec is None or ln < first_dec
        is_lost = not lv or lv[-1] < ln   # J169's: no stack evidence after the cast, ever
        if is_lost:
            lost.append(cid)
            n['forced'] += 1 if own(cid) and before else 0
        if placed == 'hand':
            refused.append(cid)
            n['refusedForced'] += 1 if own(cid) and before else 0
            if is_lost:
                putback.append(cid)
    n['casts'], n['lost'], n['refused'], n['lostPutBack'] = len(casts), len(lost), len(refused), len(putback)
    names = {}
    want = set(lost) | set(refused)
    if want:   # rare: the cards' names, from the caster's own state frames (its hand named them)
        for k in order:
            l = states[k]
            for cid in list(want - set(names)):
                mm = re.search(r'\{"id":%d,"name":"((?:[^"\\]|\\.)*)"' % cid, l)
                if mm:
                    names[cid] = mm.group(1)
            if len(names) == len(want):
                break
    return {'key': 'd%d/%s/o%d' % (d, c, o), 'i': i, 'n': n, 'g': g, 'cards': lost, 'names': [names.get(x, '?') for x in lost],
            'refusedNames': [names.get(x, '?') for x in refused], 'putBackNames': [names.get(x, '?') for x in putback]}


def scan_folder(F, J):
    """every phase B branch frame log of the spine folder F, on J processes: the cache's content"""
    import multiprocessing
    Pool = multiprocessing.get_context('fork').Pool   # the module's top level is the default mode: never re-imported in a worker
    F = os.path.abspath(F)
    mt = int(os.path.getmtime(F + '/atlas.json'))
    bo = {}
    for line in open(F + '/phaseB/branches.jsonl'):
        try:
            r = json.loads(line)
        except ValueError:
            continue
        bo.setdefault('d%d/%s/o%d' % (r['d'], r['c'], r['o']), dict(BO0))['branches'] += 1
    files = sorted(glob.glob(F + '/phaseB/frames/d*-*-o*-b*-seat?.jsonl.gz'))
    tot = dict.fromkeys(SCAN_COUNTS, 0)
    res = {'scan': SCAN_V, 'folder': os.path.basename(F), 'atlasMtime': mt, 'logs': len(files), 'byCard': {}, 'byName': {}, 'byNameRefused': {},
           'byNamePutBack': {}, 'guardrails': {}}
    sets = {'lostBranches': set(), 'forcedLostBranches': set(), 'refusedBranches': set(), 'forcedRefusedBranches': set()}
    with Pool(J) as p:
        for x in p.imap_unordered(scan_log, files, chunksize=16):
            for k in SCAN_COUNTS:
                tot[k] += x['n'][k]
            for k, v in x['g'].items():
                res['guardrails'][k] = res['guardrails'].get(k, 0) + v
            for cid, nm in zip(x['cards'], x['names']):
                res['byCard'][str(cid)] = res['byCard'].get(str(cid), 0) + 1
                res['byName'][nm] = res['byName'].get(nm, 0) + 1
            for nm in x['refusedNames']:
                res['byNameRefused'][nm] = res['byNameRefused'].get(nm, 0) + 1
            for nm in x['putBackNames']:
                res['byNamePutBack'][nm] = res['byNamePutBack'].get(nm, 0) + 1
            for key, cnt in (('lostBranches', 'lost'), ('forcedLostBranches', 'forced'), ('refusedBranches', 'refused'), ('forcedRefusedBranches', 'refusedForced')):
                if x['n'][cnt]:
                    sets[key].add((x['key'], x['i']))
    for key, s in sets.items():
        for k, i in s:
            bo.setdefault(k, dict(BO0))[key] += 1
    gr = res['guardrails']
    res.update({'casts': tot['casts'], 'lostCasts': tot['lost'], 'lostCastForced': tot['forced'], 'staleTargetRecords': tot['stale'],
                'modesDrawnRecords': tot['modesWhy'], 'modesSourceRecords': tot['modesSource'], 'targetRecords': tot['targetRecords'],
                'targetRecordsCard': tot['targetRecordsCard'], 'targetRecordsComplete': tot['targetRecordsComplete'],
                'targetRecordsCardComplete': tot['targetRecordsCardComplete'], 'summaries': tot['summaries'], 'randomised': tot['randomised'],
                'randomisedPriority': tot['randomisedPriority'], 'cardTargetOffered': gr.get('cardTargetOffered', 0),
                'modesDrawn': gr.get('modesDrawn', 0), 'retargeted': gr.get('retargeted', 0), 'staleRefused': gr.get('staleRefused', 0),
                'refusedCast': gr.get('refusedCast', 0), 'noRepeatRefused': gr.get('noRepeatRefused', 0),
                'targetCountTrimmed': gr.get('targetCountTrimmed', 0), 'costTargetAvoided': gr.get('costTargetAvoided', 0),
                'castsRefused': tot['refused'], 'castsRefusedForced': tot['refusedForced'], 'lostPutBack': tot['lostPutBack'],
                'lostStranded': tot['lost'] - tot['lostPutBack'], 'targetNoneChosen': tot['targetNoneChosen'], 'targetNoneListed': tot['targetNoneListed'],
                'noTargetRecords': tot['noTargetRecords'], 'nullChosenTargets': tot['nullChosenTargets'], 'legacyNullTargets': tot['legacyNullTargets']})
    res['cardTargetShare'] = round(res['cardTargetOffered'] / res['randomisedPriority'], 4) if res['randomisedPriority'] else None
    res['refusedCastShare'] = round(res['refusedCast'] / res['casts'], 5) if res['casts'] else None
    res['castsRefusedShare'] = round(res['castsRefused'] / res['casts'], 5) if res['casts'] else None
    res['completeShare'] = round(res['targetRecordsComplete'] / res['targetRecords'], 4) if res['targetRecords'] else None
    res['lostCastBranches'] = len(sets['lostBranches'])
    res['refusedCastBranches'] = len(sets['refusedBranches'])
    res['byOption'] = bo
    res['lostCastOptions'] = sorted(k for k, v in bo.items() if v['branches'] and 2 * v['forcedLostBranches'] > v['branches'])
    res['refusedCastOptions'] = sorted(k for k, v in bo.items() if v['branches'] and 2 * v['forcedRefusedBranches'] > v['branches'])
    return res


if len(sys.argv) > 1 and sys.argv[1] == '--scan':
    res = scan_folder(sys.argv[2], int(sys.argv[4]) if len(sys.argv) > 4 else 1)
    C = sys.argv[3]
    os.makedirs(C, exist_ok=True)
    with open(os.path.join(C, res['folder'] + '.json'), 'w') as f:
        json.dump(res, f)
    print(json.dumps({k: v for k, v in res.items() if k != 'byOption'}))
    sys.exit(0)
D = sys.argv[1] if len(sys.argv) > 1 else '/home/justin-a/code/lab/data/lab-j182'
G = sys.argv[2] if len(sys.argv) > 2 else 'b-s??-*-25??'
L = 'var/lab-j182-local'
CD = sys.argv[3] if len(sys.argv) > 3 else L + '/lost'
# name: (band, deck seed, game seed, branchForge) -- J182's spine table (deck seeds 2401-2413, game seeds 2501-2513)
BANDS = ['pauper', 'peasant', 'legacy', 'powered'] * 3 + ['pauper']
SPINES = {'s%02d' % k: (BANDS[k - 1], 2400 + k, 2500 + k, 40 if k in (1, 7, 13) else 0) for k in range(1, 14)}
try:
    VALIDATION_SHA = json.load(open(L + '/draws-pilot.json'))['validation'].split()[0]
except (OSError, ValueError, KeyError, AttributeError):
    VALIDATION_SHA = None
CUTS = {'earlyStop': [50, 100], 'screen': 25, 'minOptions': 3, 'futility': {'at': 0, 'tie': 0, 'sample': 0.25}}
SCAN_KEYS = ('casts', 'lostCasts', 'lostCastBranches', 'lostCastForced', 'lostPutBack', 'lostStranded', 'castsRefused', 'castsRefusedForced',
             'refusedCastBranches', 'refusedCast', 'noRepeatRefused', 'targetCountTrimmed', 'costTargetAvoided', 'staleTargetRecords',
             'modesDrawnRecords', 'modesSourceRecords', 'targetRecords', 'targetRecordsCard', 'targetRecordsComplete', 'targetRecordsCardComplete',
             'targetNoneChosen', 'targetNoneListed', 'noTargetRecords', 'nullChosenTargets', 'legacyNullTargets', 'randomised', 'randomisedPriority',
             'cardTargetOffered', 'modesDrawn', 'retargeted', 'staleRefused')
out = {'atlases': 0, 'spinesDone': 0, 'problems': 0, 'warnings': 0, 'guardViolations': 0, 'violationsG1': 0, 'violationsG4': 0, 'violationsG6': 0,
       'g5keys': 0, 'g6keys': 0, 'd479keys': 0, 'scheduleKeys': 0, 'noRepeatNoOp': 0,
       'xDrawn': 0, 'zeroXLeftOut': 0, 'zeroX': 0, 'branchErroredOptions': 0, 'unavailableOptionsOverBar': 0, 'cappedOptionsOverWarn': 0, 'truncatedLogs': 0,
       'atlasRefusedCast': 0, 'atlasNoRepeatRefused': 0, 'atlasTargetCountTrimmed': 0, 'atlasCostTargetAvoided': 0,
       'planOk': 0, 'planBad': [], 'forgeSpines': 0, 'cutsSpines': 0,
       'branchRows': 0, 'branchTimeouts': 0, 'branchTimeoutsInStep': 0, 'timeoutShare': None, 'branchErrored': 0, 'branchUnavailable': 0,
       'branchRestarted': 0, 'branchCapped': 0, 'effectSourceNullBranches': 0, 'effectSourceNullCards': 0, 'exileLinksLostBranches': 0, 'exileLinksLostLinks': 0,
       'errorsByKind': {}, 'unavailableByReason': {}, 'decisions': 0, 'branchedInFull': 0, 'screened': 0, 'fill': 0, 'stoppedOptions': 0,
       'unitsPlanned': 0, 'unitsOk': 0, 'unitsShort': 0, 'fullShort': 0, 'meanRho': None,
       'listedDecisions': 0, 'identityDecisions': 0, 'identityOptions': 0, 'identityListingsShort': 0, 'd483Spines': 0, 'pre483Spines': 0,
       'repeatedPlays': 0, 'sharedToken': 0, 'scuteDecks': 0,
       'chooseSourceGuardRows': 0, 'chooseSourceGuard': 0, 'chooseSourceGuardKeyRows': 0, 'retargetedRows': 0, 'retargetedOnRows': 0,
       'modesDrawnRows': 0, 'modesDrawnOnRows': 0, 'targetCountTrimmedRows': 0, 'targetCountTrimmedOnRows': 0, 'costTargetAvoidedRows': 0, 'costTargetAvoidedOnRows': 0,
       'failedToPlay': 0, 'failedToPlayByCard': {}, 'payFail': 0, 'branchErrorStacks': 0,
       'lostCastScanned': 0, 'lostCastOptions': 0, 'lostCastOptionList': [], 'lostCastCards': {}, 'lostPutBackCards': {}, 'refusedCastOptions': 0,
       'refusedCastOptionList': [], 'refusedCastCards': {}, 'scanLogs': 0, 'cardTargetSpines': 0, 'cardTargetShare': None, 'refusedCastShare': None,
       'castsRefusedShare': None, 'completeShare': None, 'legacyNullTargetRecords': 0, 'trimmedSpines': 0, 'avoidedSpines': 0,
       'validationFolders': 0, 'validationDecks': 0, 'validationShaOk': 0, 'validationBranched': 0,
       'reads': 0, 'labels': -1, 'confident': -1, 'confidentPer7Worker10hNight': None, 'confidentPer7Poisson95': None, 'rowsUnmatched': -1, 'voidLabels': -1,
       'branchedRows': -1, 'trainingRows': -1, 'lostCastVoid': -1, 'refusedCastVoid': -1, 'poolOk': 0, 'compare': 0, 'bySpine': {},
       'futilityKeys': 0, 'futilityReads': 0, 'futileRead': 0, 'futileStopped': 0, 'futileControls': 0, 'futileBranchGamesSaved': 0,
       'partialDecisions': 0, 'decisionsBranched': 0, 'ncurve': 0, 'partialLabels': -1, 'confidentPartial': -1, 'futilityControls': -1, 'confidentPerWorkerHour': None}
for k in SCAN_KEYS:
    out[k] = 0
for b in ('pauper', 'peasant', 'legacy', 'powered'):
    out['spines_' + b] = 0


def key_of(name):
    """b-s01-pauper-2114 -> s01"""
    return name.split('-')[1] if name.count('-') >= 3 else None


def kind_of(err):
    if err.startswith('BranchTimeout'):
        return 'timeout (D467)'
    if re.match(r"IllegalStateException: no .* on the copy's ", err):
        return 'play not rebuilt on the copy (D472, D476)'
    if re.match(r'IllegalStateException: optional cost .* is not offered on the copy', err):
        return 'optional cost not offered (D466)'
    if err.startswith('recording:'):
        return 'recording'
    return err.split(':', 1)[0].strip() or 'other'


def scute(p):
    try:
        return re.search(rb'(?m)^\d+ Scute Swarm\s*$', open(p, 'rb').read()) is not None
    except OSError:
        return False


rhos = []
for f in sorted(glob.glob(D + '/' + G + '/plan.json')):
    dd = os.path.dirname(f)
    name = os.path.basename(dd)
    k = key_of(name)
    plan = json.load(open(f))
    sp = out['bySpine'].setdefault(name, {})
    if k in SPINES:
        band, ds, gs, bf = SPINES[k]
        want = {'deckA': '%s/decks/%s-%s-%d/decks/%s-%d-00001.dck' % (D, k, band, ds, band, ds), 'deckB': '%s/decks/%s-%s-%d/decks/%s-%d-00002.dck' % (D, k, band, ds, band, ds),
                'seed': gs, 'branchForge': bf, 'branchRandom': 150, 'chunk': 25, 'decisions': 10}
        bad = [x for x, v in want.items() if plan.get(x) != v and not (x.startswith('deck') and str(plan.get(x, '')).endswith(v.split(D + '/', 1)[1]))]
        cuts = plan.get('cuts') or {}
        if any(cuts.get(x) != v for x, v in CUTS.items()):
            bad.append('cuts')
        if name != 'b-%s-%s-%d' % (k, band, gs):
            bad.append('folder')
    else:
        bad = ['not in the spine table']
    if bad:
        out['planBad'].append('%s: %s' % (name, ', '.join(bad)))
    else:
        out['planOk'] += 1
    out['forgeSpines'] += 1 if plan.get('branchForge', 0) > 0 else 0
    out['cutsSpines'] += 1 if (plan.get('cuts') or {}).get('decision') == 'D480' else 0
    out['scuteDecks'] += sum(1 for x in ('deckA', 'deckB') if scute(str(plan.get(x))))
    for x in ('deckA', 'deckB'):
        if '/validation/' in str(plan.get(x)):
            out['validationBranched'] += 1
    # D483: the baseline's listing (every J182 spine lists identities)
    try:
        ls = json.load(open(os.path.join(dd, 'phaseB', 'baseline.json')))['decisions']
    except (OSError, ValueError, KeyError, TypeError):
        ls = None
    if ls is not None:
        withid = [x for x in ls if x.get('identities')]
        out['listedDecisions'] += len(ls)
        out['identityDecisions'] += len(withid)
        out['identityOptions'] += sum(len(x['identities']) for x in withid)
        out['d483Spines'] += 1 if ls and all(len(x.get('identities') or []) == len(x['tokens']) for x in ls) else 0
        out['pre483Spines'] += 1 if not withid else 0
        out['identityListingsShort'] += sum(1 for x in ls if len(x.get('identities') or []) != len(x['tokens']))
        for x in ls:
            ids, toks = x.get('identities') or [], x['tokens']
            if ids:
                out['repeatedPlays'] += 1 if len(set(ids)) < len(ids) else 0
                by = {}
                for t, i in zip(toks, ids):
                    by.setdefault(t, set()).add(i)
                out['sharedToken'] += 1 if any(len(v) > 1 for v in by.values()) else 0
    af = os.path.join(dd, 'atlas.json')
    if not os.path.exists(af):
        continue
    d = json.load(open(af))
    c, g = d['checks'], d['checks']['guardrails']
    out['atlases'] += 1
    out['problems'] += len(c['problems'])
    out['warnings'] += len(c.get('warnings') or [])
    out['guardViolations'] += g.get('violations', 0)
    vb = g.get('violationsBy') or {}
    for x in ('G1', 'G4', 'G6'):
        out['violations' + x] += vb.get(x, 0)
    out['g5keys'] += 1 if 'refusedCast' in g and 'noRepeatRefused' in g else 0
    out['g6keys'] += 1 if all(x in g for x in ('xDrawn', 'zeroXLeftOut', 'zeroX')) else 0
    for x in ('noRepeatNoOp', 'xDrawn', 'zeroXLeftOut', 'zeroX'):
        out[x] += g.get(x, 0)
    for x, y in (('refusedCast', 'atlasRefusedCast'), ('noRepeatRefused', 'atlasNoRepeatRefused'), ('targetCountTrimmed', 'atlasTargetCountTrimmed'),
                 ('costTargetAvoided', 'atlasCostTargetAvoided')):
        out[y] += g.get(x, 0)
    out['branchErroredOptions'] += len((c.get('branchErrors') or {}).get('options', []))
    out['unavailableOptionsOverBar'] += len((c.get('optionUnavailable') or {}).get('options', []))
    out['cappedOptionsOverWarn'] += len((c.get('branchCapped') or {}).get('options', []))
    out['truncatedLogs'] += len(c.get('unreadableFrameLogs') or [])
    sp.update({'problems': len(c['problems']), 'warnings': len(c.get('warnings') or []), 'problemList': c['problems'][:5], 'warningList': (c.get('warnings') or [])[:5]})
    b = d.get('phaseB')
    if not b:
        continue
    out['spinesDone'] += 1
    if k in SPINES:
        out['spines_' + SPINES[k][0]] += 1
    out['decisions'] += len(b['decisions'])
    out['d479keys'] += 1 if isinstance(b.get('effectSourceNull'), dict) and isinstance(b.get('exileLinksLost'), dict) and 'branchRestarted' in b else 0
    rhos += [x['rho'] for x in b['decisions'] if x['complete'] and x.get('rho') is not None]
    s = b.get('schedule')
    if s:
        out['scheduleKeys'] += 1
        listed = b['baseline']['decisionsListed']
        nscr = len(s.get('screened') or [])
        # (c): branched and planned per decision, from atlas.json's own fields (whatever its branchedInFull counts)
        full = sum(1 for x in b['decisions'] if not x.get('screened'))
        out['branchedInFull'] += s.get('branchedInFull', 0)
        out['decisionsBranched'] += full
        # (b): D489's counters
        fk = all(isinstance(s.get(x), int) for x in ('futileStopped', 'futileControls', 'futileBranchGamesSaved', 'partialLabels')) and isinstance(s.get('futility'), list)
        out['futilityKeys'] += 1 if fk else 0
        fr = s.get('futility') or []
        fsum = {'futilityReads': len(fr), 'futileRead': sum(1 for x in fr if x.get('futile')), 'futileStopped': s.get('futileStopped', 0) or 0,
                'futileControls': s.get('futileControls', 0) or 0, 'futileBranchGamesSaved': s.get('futileBranchGamesSaved', 0) or 0,
                'partialDecisions': sum(1 for x in b['decisions'] if x.get('partial'))}
        for kk, vv in fsum.items():
            out[kk] += vv
        sp.update(fsum)
        out['screened'] += nscr
        out['fill'] += s.get('fill', 0)
        out['stoppedOptions'] += s.get('stoppedOptions', 0)
        plan_ = d['plan']
        want_full = min(plan_['decisions'] if plan_['decisions'] != 'all' else listed, listed - nscr)
        short = 1 if full < want_full else 0
        out['fullShort'] += short
        per = math.ceil(plan_['branchRandom'] / plan_['chunk']) + math.ceil(plan_['branchForge'] / plan_['chunk'])
        scr_units = math.ceil(((plan_.get('cuts') or {}).get('screen') or plan_['branchRandom']) / plan_['chunk'])
        planned = sum(scr_units if x.get('screened') else math.ceil(x['stoppedAt'] / plan_['chunk']) if x.get('partial') else per for x in b['decisions'])
        ok = set()
        uf = os.path.join(dd, 'phaseB', 'units.jsonl')
        if os.path.exists(uf):
            for line in open(uf):
                try:
                    u = json.loads(line)
                except ValueError:
                    continue
                if u.get('ok'):
                    ok.add(u['id'])
        out['unitsPlanned'] += planned
        out['unitsOk'] += len(ok)
        out['unitsShort'] += max(0, planned - len(ok))
        sp.update({'listed': listed, 'branchedInFull': s.get('branchedInFull', 0), 'decisionsBranched': full, 'screened': nscr, 'fill': s.get('fill', 0), 'stoppedOptions': s.get('stoppedOptions', 0),
                   'meanOptions': s.get('meanOptions'), 'unitsPlanned': planned, 'unitsOk': len(ok), 'fullShort': short,
                   'baseline': '%s turns, winner %s' % (b['baseline']['turns'], b['baseline']['winner'])})
out['meanRho'] = round(sum(rhos) / len(rhos), 4) if rhos else None
# the branch rows, live
ROWC = ('chooseSourceGuardRows', 'chooseSourceGuard', 'retargetedRows', 'retargetedOnRows', 'modesDrawnRows', 'modesDrawnOnRows',
        'targetCountTrimmedRows', 'targetCountTrimmedOnRows', 'costTargetAvoidedRows', 'costTargetAvoidedOnRows')
for f in sorted(glob.glob(D + '/' + G + '/phaseB/branches.jsonl')):
    name = os.path.basename(os.path.dirname(os.path.dirname(f)))
    sp = out['bySpine'].setdefault(name, {})
    n = t = 0
    e = dict({'errored': 0, 'unavailable': 0, 'restarted': 0, 'capped': 0, 'effectSourceNull': 0, 'exileLinksLost': 0, 'errorsByKind': {}}, **dict.fromkeys(ROWC, 0))
    for line in open(f):
        try:
            r = json.loads(line)
        except ValueError:
            continue
        n += 1
        if r.get('timedOut'):
            t += 1
            out['branchTimeoutsInStep'] += 1 if r.get('engineError') else 0
        if r.get('unavailable'):
            e['unavailable'] += 1
            kk = re.sub(r'\d+', '#', r['unavailable'])[:160]
            out['unavailableByReason'][kk] = out['unavailableByReason'].get(kk, 0) + 1
        if r.get('error'):
            e['errored'] += 1
            kk = kind_of(r['error'])
            out['errorsByKind'][kk] = out['errorsByKind'].get(kk, 0) + 1
            e['errorsByKind'][kk] = e['errorsByKind'].get(kk, 0) + 1
        e['restarted'] += 1 if (r.get('restarts') or 0) > 0 else 0
        e['capped'] += 1 if r.get('capped') else 0
        if (r.get('effectSourceNull') or 0) > 0:
            e['effectSourceNull'] += 1
            out['effectSourceNullCards'] += r['effectSourceNull']
        if (r.get('exileLinksLost') or 0) > 0:
            e['exileLinksLost'] += 1
            out['exileLinksLostLinks'] += r['exileLinksLost']
        # D484: the ChooseSource guard's counter on the branch row (a count, or true)
        v = r.get('chooseSourceGuard')
        if v is not None:
            out['chooseSourceGuardKeyRows'] += 1
        if isinstance(v, (int, float)) and v > 0:
            e['chooseSourceGuardRows'] += 1
            e['chooseSourceGuard'] += v
        # D485: plays cast after their stale targets were replaced; D486: with modes the seat drew; D488: with their target count cut to a
        # payable one, and with targets drawn away from what their own cost takes (each written when > 0)
        for key in ('retargeted', 'modesDrawn', 'targetCountTrimmed', 'costTargetAvoided'):
            v = r.get(key)
            if isinstance(v, (int, float)) and v > 0:
                e[key + 'Rows'] += 1
                e[key + 'OnRows'] += v
    sp.update({'rows': n, 'timeouts': t, **e})
    out['branchRows'] += n
    out['branchTimeouts'] += t
    out['branchErrored'] += e['errored']
    out['branchUnavailable'] += e['unavailable']
    out['branchRestarted'] += e['restarted']
    out['branchCapped'] += e['capped']
    out['effectSourceNullBranches'] += e['effectSourceNull']
    out['exileLinksLostBranches'] += e['exileLinksLost']
    for key in ROWC:
        out[key] += e[key]
    out['trimmedSpines'] += 1 if e['targetCountTrimmedRows'] else 0
    out['avoidedSpines'] += 1 if e['costTargetAvoidedRows'] else 0
if out['branchRows']:
    out['timeoutShare'] = round(out['branchTimeouts'] / out['branchRows'], 5)
# the worker logs: Forge's refused payments by card, the payment failures, D488's errored-branch stacks
for dd in sorted(glob.glob(D + '/' + G)):
    lfs = sorted(glob.glob(dd + '/phaseB/logs/*.log'))
    if not lfs:
        continue
    name = os.path.basename(dd)
    ftp = pay = stk = 0
    byc = {}
    for lf in lfs:
        with open(lf, errors='replace') as fh:
            for l in fh:
                if 'AI failed to play' in l:
                    ftp += 1
                    mm = FTP.search(l)
                    nm = mm.group(1) if mm else '?'
                    byc[nm] = byc.get(nm, 0) + 1
                if "Didn't find what to pay for" in l:
                    pay += 1
                if 'branch error, stack:' in l:
                    stk += 1
    out['bySpine'].setdefault(name, {}).update({'failedToPlay': ftp, 'failedToPlayByCard': byc, 'payFail': pay, 'branchErrorStacks': stk})
    out['failedToPlay'] += ftp
    out['payFail'] += pay
    out['branchErrorStacks'] += stk
    for nm, v in byc.items():
        out['failedToPlayByCard'][nm] = out['failedToPlayByCard'].get(nm, 0) + v
# the refused and lost casts and D486-D488's counters, from metrics.py --scan's v5 caches (a cache of another atlas.json or scan is not read)
for f in sorted(glob.glob(D + '/' + G + '/atlas.json')):
    name = os.path.basename(os.path.dirname(f))
    try:
        c = json.load(open(CD + '/' + name + '.json'))
    except (OSError, ValueError):
        continue
    if c.get('atlasMtime') != int(os.path.getmtime(f)) or c.get('scan') != SCAN_V:
        continue
    sp = out['bySpine'].setdefault(name, {})
    sp.update({k: c.get(k, 0) for k in SCAN_KEYS})
    sp.update({'cardTargetShare': c.get('cardTargetShare'), 'refusedCastShare': c.get('refusedCastShare'), 'castsRefusedShare': c.get('castsRefusedShare'),
               'completeShare': c.get('completeShare'), 'lostCastOptions': len(c['lostCastOptions']), 'refusedCastOptions': len(c['refusedCastOptions']),
               'lostCastCards': c.get('byName') or {}, 'lostPutBackCards': c.get('byNamePutBack') or {}, 'refusedCastCards': c.get('byNameRefused') or {},
               'scanLogs': c['logs']})
    out['lostCastScanned'] += 1
    out['scanLogs'] += c['logs']
    for k in SCAN_KEYS:
        out[k] += c.get(k, 0)
    out['cardTargetSpines'] += 1 if c.get('cardTargetOffered', 0) > 0 else 0
    out['lostCastOptions'] += len(c['lostCastOptions'])
    out['lostCastOptionList'] += ['%s %s' % (key_of(name), x) for x in c['lostCastOptions']]
    out['refusedCastOptions'] += len(c['refusedCastOptions'])
    out['refusedCastOptionList'] += ['%s %s' % (key_of(name), x) for x in c['refusedCastOptions']]
    for src, dst in (('byName', 'lostCastCards'), ('byNamePutBack', 'lostPutBackCards'), ('byNameRefused', 'refusedCastCards')):
        for nm, v in (c.get(src) or {}).items():
            out[dst][nm] = out[dst].get(nm, 0) + v
out['legacyNullTargetRecords'] = out['legacyNullTargets']
out['cardTargetShare'] = round(out['cardTargetOffered'] / out['randomisedPriority'], 4) if out['randomisedPriority'] else None
out['refusedCastShare'] = round(out['refusedCast'] / out['casts'], 5) if out['casts'] else None
out['castsRefusedShare'] = round(out['castsRefused'] / out['casts'], 5) if out['casts'] else None
out['completeShare'] = round(out['targetRecordsComplete'] / out['targetRecords'], 4) if out['targetRecords'] else None
# the validation draw: 13 folders of 2 decks, the sha256 the pilot recorded, and no spine folder of its own
vd = sorted(glob.glob(D + '/validation/v*'))
out['validationFolders'] = len(vd)
h = hashlib.sha256()
try:
    for v in vd:
        h.update(open(os.path.join(v, 'decks.jsonl'), 'rb').read())
        for x in sorted(glob.glob(os.path.join(v, 'decks', '*.dck'))):
            h.update(os.path.basename(x).encode() + b'\0' + open(x, 'rb').read())
            out['validationDecks'] += 1
    out['validationShaOk'] = 1 if VALIDATION_SHA and h.hexdigest() == VALIDATION_SHA else 0
except OSError:
    pass
out['validationBranched'] += len(glob.glob(D + '/validation/*/plan.json')) + len(glob.glob(D + '/validation/*/phaseB'))
try:
    r = json.load(open(D + '/report/reads.json'))
    out['reads'] = 1 if len(r['spines']) == 13 and r['forgeSpines'] == ['s01', 's07', 's13'] and len(r['iv_bySpine']) == 3 else 0
except (OSError, ValueError, KeyError, TypeError):
    pass
try:
    lb = json.load(open(D + '/report/labels.json'))
    sha = open(L + '/sha.txt').read().strip()
    out.update({'labels': lb['labels'], 'confident': lb['confident'], 'rowsUnmatched': lb['rowsUnmatched'], 'voidLabels': lb['voidLabels'],
                'branchedRows': lb['branched'], 'trainingRows': lb['trainingRows'], 'lostCastVoid': lb['lostCastVoid'], 'refusedCastVoid': lb['refusedCastVoid'],
                'confidentPer7Worker10hNight': lb['c_sizing7']['asRun']['confidentPer7Worker10hNight'],
                'confidentPer7Poisson95': lb['c_sizingRead'].get('poisson95'), 'partialLabels': lb['partialLabels'], 'confidentPartial': lb['confidentPartial'],
                'futilityControls': lb['futilityControls'], 'confidentPerWorkerHour': lb['c_sizingRead'].get('confidentPerWorkerHour')})
    # each spine's rows carry its band's D498 pool, its seeds, D483's listing, D498's population, the pin, and a v5 scan
    out['poolOk'] = sum(1 for n, m in lb['bySpine'].items() if n in SPINES and m['pool'] == 'random-%s-d498' % SPINES[n][0]
                        and m['deckSeed'] == SPINES[n][1] and m['gameSeed'] == SPINES[n][2] and m['forgeMap'] == (SPINES[n][3] > 0)
                        and m['listing'] == 'D483' and m['randomSeat'] == 'D498' and m['sha'] == sha and m['lostScanned'] is True and m['scanV5'] is True)
except (OSError, ValueError, KeyError, TypeError):
    pass
try:
    nc = json.load(open(D + '/report/ncurve.json'))
    out['ncurve'] = 1 if len(nc['bySpine']) == 13 and nc['complete'] == out['labels'] and sorted(nc['atN']) == ['100', '150', '50'] else 0
except (OSError, ValueError, KeyError, TypeError):
    pass
try:
    cp = json.load(open(D + '/report/compare-j181.json'))
    out['compare'] = 1 if len(cp['bySpine']) == 13 and all(v['this'].get('labels') is not None for v in cp['bySpine'].values()) else 0
except (OSError, ValueError, KeyError, TypeError, AttributeError):
    pass
print(json.dumps(out))
PY
cat > var/lab-j182-local/bin/compare.py <<'PY'
# J182 (drafts/J182-atlas-4b-night-seven.md): each spine's numbers beside J181's AT THE SAME POSITION (s01 beside s01, ...), registered
# before any J182 data. DIFFERENT DECKS (J181: deck seeds 2079-2091, game seeds 2179-2191; J182: 2401-2413, 2501-2513; the same band at
# each position), THE SAME SEAT POLICY (D488's) AND THE SAME BRANCHING DESIGN (150 random branches, the futility stop, 10 decisions),
# and ANOTHER FORK (D498's redeal, D500's damage history): J181 and J182 are two populations. A difference is a candidate, never a
# verdict, no position is a pair, and no difference is D498's by itself (the decks differ everywhere; J181's s07 carries the redeal gap
# D498 closes). J177's compare.py, unchanged but for its note: `this` is J182, `before` J181, read from lab-j181 at the Report (read only).
# J177's header, unchanged below:
# J177 (drafts/J177-atlas-4b-night-three.md): each spine's numbers beside J173's AT THE SAME POSITION (s01 beside s01, ...), registered
# before any J177 data. DIFFERENT DECKS (J173: deck seeds 2014-2026, game seeds 2114-2126; J177: 2040-2052, 2140-2152; the same band at
# each position), THE SAME SEAT (D488's, unchanged) and ANOTHER BRANCHING DESIGN (J173: 200 random branches, 8 decisions; J177: 150,
# the futility stop, 10 decisions): a difference is a candidate, never a verdict, and no position is a pair. J173's compare.py (J171's,
# J170's, on J168's definitions) made symmetric: BOTH columns are computed from their folders and labels.json by the same code, so
# J173's column is read from lab-j173 at the Report (read only) and is null where J173 left nothing.
# Definitions, per spine and for the night (J168's, plus J177's last five):
#   listedPerTurn    decisions listed (phaseB/baseline.json) / the baseline game's turns     (the night: sum / sum)
#   optionsPerFull   options of the decisions branched (not screened) / those decisions     (sum / sum)
#   labels, confident, confidentShare   labels.json's bySpine (confidentShare = confident / labels)   (sum, sum, sum / sum)
#   regretMean       labels.json's bySpine regretMean; the night: labels.json's b_regretMean point (pooled over every label)
#   cappedShare      branch rows ended at the turn cap / branch rows     (sum / sum)
#   branchGames      branch rows; wallSec: the spine's spine-times.txt lines summed
#   decisionsBranched   the decisions not screened (complete, or futile-stopped and partial); partial: those with `partial: true`
#   branchedInFullRows  the complete decisions whose option 0 has the plan's branchRandom random rows (computed here)
#   workerHours, confidentPerWorkerHour   the walls times their workers (spine-times.txt's fourth field); confident / workerHours:
#                    THE yield to compare (the confident share is not: D489's stopped decisions leave its denominator)
#   compare.py THIS_DIR THIS_LABELS_JSON [BEFORE_DIR BEFORE_LABELS_JSON] [--only=s01,s07,...]   prints one JSON object: `this` (J177),
#   `before` (J173). The pilot's self-test runs it with lab-j170 (J171's own folders) and J171's labels as labels.py gives them as THIS,
#   and requires J171's registered values (J173's compare.py) back (`selfMatch` 13).
# Standard library only; no engine.
import glob, json, os, sys
# J171's per-spine numbers (results/J172/compare-j168.json, column j171), registered in J173's compare.py: the self-test's want only;
# `by` says what each position held
J171 = {
    's01': {'by': 'J171 f2b4e9c2, pauper 2001/2101', 'listedPerTurn': 0.72, 'optionsPerFull': 3.25, 'labels': 8, 'confident': 2, 'regretMean': 0.0275, 'cappedShare': 0.2837, 'wallSec': 2808, 'branchGames': 5720},
    's02': {'by': 'J171 f2b4e9c2, peasant 2002/2102', 'listedPerTurn': 0.5, 'optionsPerFull': 2.0, 'labels': 5, 'confident': 1, 'regretMean': 0.043, 'cappedShare': 0.1017, 'wallSec': 1946, 'branchGames': 2075},
    's03': {'by': 'J171 f2b4e9c2, legacy 2003/2103', 'listedPerTurn': 0.79, 'optionsPerFull': 3.12, 'labels': 8, 'confident': 2, 'regretMean': 0.0481, 'cappedShare': 0.0389, 'wallSec': 2282, 'branchGames': 4550},
    's04': {'by': 'J171 f2b4e9c2, powered 2004/2104', 'listedPerTurn': 1.06, 'optionsPerFull': 3.38, 'labels': 8, 'confident': 1, 'regretMean': 0.025, 'cappedShare': 0.0005, 'wallSec': 4782, 'branchGames': 5775},
    's05': {'by': 'J171 f2b4e9c2, pauper 2005/2105', 'listedPerTurn': 0.86, 'optionsPerFull': 4.62, 'labels': 8, 'confident': 2, 'regretMean': 0.0225, 'cappedShare': 0.0563, 'wallSec': 3684, 'branchGames': 6325},
    's06': {'by': 'J171 f2b4e9c2, peasant 2006/2106', 'listedPerTurn': 1.05, 'optionsPerFull': 5.88, 'labels': 8, 'confident': 4, 'regretMean': 0.0819, 'cappedShare': 0.0, 'wallSec': 4367, 'branchGames': 6525},
    's07': {'by': 'J171 f2b4e9c2, legacy 2007/2107', 'listedPerTurn': 1.14, 'optionsPerFull': 3.75, 'labels': 8, 'confident': 1, 'regretMean': 0.015, 'cappedShare': 0.0008, 'wallSec': 1269, 'branchGames': 5110},
    's08': {'by': 'J171 f2b4e9c2, powered 2008/2108', 'listedPerTurn': 1.85, 'optionsPerFull': 5.0, 'labels': 8, 'confident': 4, 'regretMean': 0.0713, 'cappedShare': 0.0, 'wallSec': 3984, 'branchGames': 6750},
    's09': {'by': 'J171 f2b4e9c2, pauper 2009/2109', 'listedPerTurn': 1.17, 'optionsPerFull': 4.25, 'labels': 8, 'confident': 1, 'regretMean': 0.0381, 'cappedShare': 0.0533, 'wallSec': 3242, 'branchGames': 6075},
    's10': {'by': 'J171 f2b4e9c2, peasant 2010/2110', 'listedPerTurn': 1.7, 'optionsPerFull': 4.75, 'labels': 8, 'confident': 3, 'regretMean': 0.0503, 'cappedShare': 0.0122, 'wallSec': 3495, 'branchGames': 6500},
    's11': {'by': 'J171 f2b4e9c2, legacy 2011/2111', 'listedPerTurn': 1.22, 'optionsPerFull': 4.38, 'labels': 8, 'confident': 4, 'regretMean': 0.0528, 'cappedShare': 0.0056, 'wallSec': 4484, 'branchGames': 6450},
    's12': {'by': 'J171 f2b4e9c2, powered 2012/2112', 'listedPerTurn': 1.17, 'optionsPerFull': 3.0, 'labels': 8, 'confident': 2, 'regretMean': 0.0652, 'cappedShare': 0.0011, 'wallSec': 2317, 'branchGames': 3650},
    's13': {'by': 'J171 f2b4e9c2, pauper 2013/2113', 'listedPerTurn': 1.1, 'optionsPerFull': 4.25, 'labels': 8, 'confident': 1, 'regretMean': 0.0334, 'cappedShare': 0.0328, 'wallSec': 1993, 'branchGames': 6435},
}
# J171's night (results/J172/compare-j168.json, night.j171): 101 labels and 28 confident, 11 h 18 of walls at 6 workers, 71,940 rows
J171_NIGHT = {'listedPerTurn': 1.09, 'optionsPerFull': 4.03, 'labels': 101, 'confident': 28, 'confidentShare': 0.2772, 'regretMean': 0.0442,
              'cappedShare': 0.0421, 'wallSec': 40653, 'branchGames': 71940}
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
only = set(x for x in opt.get('only', '').split(',') if x)


def side(D, LJ):
    """one night's columns from its folder and labels.json: ({position: values}, night); empty when the labels are absent"""
    try:
        lab = json.load(open(LJ))
    except (OSError, ValueError):
        return {}, None
    wall, wk = {}, {}
    if os.path.exists(D + '/spine-times.txt'):
        for line in open(D + '/spine-times.txt'):
            f = line.split()
            if len(f) >= 3 and f[1].isdigit() and f[2].isdigit():
                wall[f[0]] = wall.get(f[0], 0) + int(f[2]) - int(f[1])
                if len(f) > 3 and f[3].isdigit():
                    wk[f[0]] = wk.get(f[0], 0) + (int(f[2]) - int(f[1])) * int(f[3])
    by = {}
    tot = {'listed': 0, 'turns': 0, 'options': 0, 'branched': 0, 'labels': 0, 'confident': 0, 'capped': 0, 'rows': 0, 'wallSec': 0, 'workerSec': 0,
           'partial': 0, 'fullRows': 0}
    for sp in sorted(glob.glob(D + '/b-s??-*-2???')):   # J182's folders end in 25??, J181's in 21??: one glob reads both
        name = os.path.basename(sp)
        s = name.split('-')[1]
        if only and s not in only:
            continue
        try:
            a = json.load(open(sp + '/atlas.json'))
            pb = a['phaseB']
            b = json.load(open(sp + '/phaseB/baseline.json'))['decisions']
            rows = [json.loads(x) for x in open(sp + '/phaseB/branches.jsonl') if x.strip()]
            m = lab['bySpine'][s]
        except (OSError, ValueError, KeyError, TypeError):
            continue
        R = a['plan']['branchRandom']
        br = [x for x in pb['decisions'] if not x.get('screened')]
        o0 = {}
        for r in rows:
            if r['c'] == 'random' and r['o'] == 0:
                o0[r['d']] = o0.get(r['d'], 0) + 1
        capped = sum(1 for r in rows if r.get('capped'))
        part = sum(1 for x in br if x.get('partial'))
        fullr = sum(1 for x in br if x.get('complete') and o0.get(x['d'], 0) >= R)
        ws = wk.get(name)
        v = {'folder': name, 'branchRandom': R, 'listedPerTurn': round(len(b) / pb['baseline']['turns'], 2), 'optionsPerFull': round(sum(len(x['options']) for x in br) / max(1, len(br)), 2),
             'decisionsBranched': len(br), 'partial': part, 'branchedInFullRows': fullr,
             'labels': m['labels'], 'confident': m['confident'], 'confidentShare': round(m['confident'] / m['labels'], 4) if m['labels'] else None,
             'regretMean': m['regretMean'], 'cappedShare': round(capped / len(rows), 4) if rows else None, 'wallSec': wall.get(name), 'branchGames': len(rows),
             'workerHours': round(ws / 3600, 2) if ws else None, 'confidentPerWorkerHour': round(m['confident'] / (ws / 3600), 4) if ws else None}
        by[s] = v
        tot['listed'] += len(b)
        tot['turns'] += pb['baseline']['turns']
        tot['options'] += sum(len(x['options']) for x in br)
        tot['branched'] += len(br)
        tot['labels'] += m['labels']
        tot['confident'] += m['confident']
        tot['capped'] += capped
        tot['rows'] += len(rows)
        tot['wallSec'] += wall.get(name) or 0
        tot['workerSec'] += ws or 0
        tot['partial'] += part
        tot['fullRows'] += fullr
    night = {'spines': len(by), 'listedPerTurn': round(tot['listed'] / tot['turns'], 2) if tot['turns'] else None,
             'optionsPerFull': round(tot['options'] / tot['branched'], 2) if tot['branched'] else None, 'labels': tot['labels'],
             'confident': tot['confident'], 'confidentShare': round(tot['confident'] / tot['labels'], 4) if tot['labels'] else None,
             'regretMean': (lab.get('b_regretMean') or {}).get('point'), 'cappedShare': round(tot['capped'] / tot['rows'], 4) if tot['rows'] else None,
             'wallSec': tot['wallSec'], 'branchGames': tot['rows'], 'decisionsBranched': tot['branched'], 'partial': tot['partial'],
             'branchedInFullRows': tot['fullRows'], 'decisionsBranchedPerSpine': round(tot['branched'] / len(by), 2) if by else None,
             'workerHours': round(tot['workerSec'] / 3600, 2) if tot['workerSec'] else None,
             'confidentPerWorkerHour': round(tot['confident'] / (tot['workerSec'] / 3600), 4) if tot['workerSec'] else None}
    return by, night


this, tn = side(args[0], args[1])
before, bn = side(args[2], args[3]) if len(args) >= 4 else ({}, None)
out = {'note': 'BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY AND DESIGN, THE FORK CHANGED: J181 (D497\'s population, its first night; deck seeds 2079-2091, 150 branches, the futility stop, 10 decisions) beside J182 (D498\'s population, its first night, on D498\'s determinizer and D500\'s copier; deck seeds 2401-2413, the same design), the same band at each position; read confidentPerWorkerHour, not confidentShare; a difference is a candidate, never a verdict, and none is D498\'s by itself: the decks differ at every position',
       'bySpine': {s: {'before': before.get(s), 'this': v} for s, v in this.items()}, 'night': {'before': bn, 'this': tn}}
# the self-test's number: positions whose every J171 value comes back from the folders read (meaningful only on J171's own, lab-j170)
K = ('listedPerTurn', 'optionsPerFull', 'labels', 'confident', 'regretMean', 'cappedShare', 'wallSec', 'branchGames')
out['selfMatch'] = sum(1 for s, v in this.items() if s in J171 and all(J171[s][k] == v[k] for k in K))
out['selfMatchNight'] = 1 if tn and all(tn.get(k) == J171_NIGHT[k] for k in K + ('confidentShare',)) else 0
print(json.dumps(out, indent=1))
PY
cat > var/lab-j182-local/bin/ncurve.py <<'PY'
# J182: J177's ncurve.py, unchanged (the cap read, (g), on J182's own branches).
# J177 (drafts/J177-atlas-4b-night-three.md): the cap read, (g) -- the atlas review's n curve (study/atlas-review-2026-10-27,
# bin/ncurve.py, report/ncurve.md) on this night's own branches, registered before any J177 data. Standard library only; no engine.
# For every COMPLETE decision of seat A (not screened, not a futility-stopped partial label; a futility control is complete):
#   the paired random-map matrix as decisionAtlas builds it -- branch rows i < N of every option, a row kept when every option
#   has a score there or is stopped by early stopping at or before i (its cell then empty), an errored or unavailable row empty;
#   the regret (the best option's mean minus option 0's) and its paired bootstrap interval, 1,000 draws, the best re-picked in
#   each draw, the 2.5% / 97.5% quantiles; CONFIDENT AT N when the low end is > 0. The bootstrap is Python's random.Random, seeded
#   s + 7 d + N for s in 101, 202, 303, 404, 505 (the review's seeds and offsets), and a decision's confident-at-N is the MEAN over
#   the five (the review's "smoothed over 5 bootstrap seeds"), so the read is a seed mean, not atlas.json's own interval.
#   the final set   the decisions atlas.json calls confident (complete and random.regretLo > 0) at their full n
#   keptAtN         the sum over the final set of the decision's confident-at-N: how much of the final set is already
#                   confident with N branches; keptShareAtN = keptAtN / |final set|
#   expectedAtN     the sum over every complete decision of its confident-at-N (the review's E[confident])
#   selfAgree       at the decision's full n, the decisions whose seed-mean verdict (> .5) is atlas.json's own (the review: 215 of 222)
#   ncurve.py [--n=50,100,150] NAME:DIR ...   prints one JSON object
import glob, json, os, random, sys

SEEDS = (101, 202, 303, 404, 505)
B = 1000
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
NS = [int(x) for x in opt.get('n', '50,100,150').split(',')]
# the review's n curve, all 29 spines (old, D486 and D488 seats; final n = 200): E[confident] and E[overlap with 200]
REVIEW = {'final': 65.4, 'atN': {'50': {'expected': 43.4, 'kept': 35.0}, '100': {'expected': 50.0, 'kept': 44.6},
                                 '150': {'expected': 64.8, 'kept': 57.0}, '200': {'expected': 65.4, 'kept': 65.4}},
          'note': 'study/atlas-review-2026-10-27/report/ncurve.md, seat "all": a 200-branch design; "at 150, 88% of the final confident set is already confident" (section 2)'}


def matrix(rows, k, nmax, stops):
    by = {}
    for o, i, s in rows:
        if nmax is not None and i >= nmax:
            continue
        if o in stops and i >= stops[o]:
            continue
        by.setdefault(i, [None] * k)[o] = s
    out = []
    for i in sorted(by):
        r = by[i]
        if all(r[o] is not None or (o in stops and i >= stops[o]) for o in range(k)):
            out.append(r)
    return out


def regret_lo(m, k, seed):
    n = len(m)
    if n < 2:
        return None
    v = [[(r[o] if r[o] is not None else 0.0) for r in m] for o in range(k)]
    w = [[(1.0 if r[o] is not None else 0.0) for r in m] for o in range(k)]
    full = [all(x == 1.0 for x in w[o]) for o in range(k)]
    if any(sum(w[o]) == 0 for o in range(k)):
        return None
    rng = random.Random(seed)
    idx_all = range(n)
    g = []
    for _ in range(B):
        idx = rng.choices(idx_all, k=n)
        mu = []
        ok = True
        for o in range(k):
            s = sum(map(v[o].__getitem__, idx))
            c = n if full[o] else sum(map(w[o].__getitem__, idx))
            if c == 0:
                ok = False
                break
            mu.append(s / c)
        if ok:
            g.append(max(mu) - mu[0])
    if not g:
        return None
    g.sort()
    return g[int(0.025 * (len(g) - 1) + 0.5)]


out = {'definitions': 'see the header of this script', 'n': NS, 'review': REVIEW, 'bySpine': {}, 'final': 0, 'complete': 0,
       'atN': {str(N): {'expected': 0.0, 'kept': 0.0} for N in NS}, 'selfAgree': 0}
for a in args:
    name, d0 = a.split(':', 1)
    try:
        doc = json.load(open(os.path.join(d0, 'atlas.json')))
    except (OSError, ValueError):
        continue
    rows = {}
    for line in open(os.path.join(d0, 'phaseB', 'branches.jsonl')):
        try:
            r = json.loads(line)
        except ValueError:
            continue
        if r.get('c') != 'random':
            continue
        s = r.get('score') if r.get('error') is None and not r.get('unavailable') else None
        rows.setdefault(r['d'], []).append((r['o'], r['i'], s))
    sp = {'final': 0, 'complete': 0, 'atN': {str(N): {'expected': 0.0, 'kept': 0.0} for N in NS}, 'selfAgree': 0}
    for x in doc['phaseB']['decisions']:
        if not x.get('complete') or x.get('screened') or x.get('partial'):
            continue
        k = len(x['options'])
        stops = {o['o']: o['stoppedAt'] for o in x['options'] if o.get('stoppedAt') is not None}
        conf = x['random']['regretLo'] is not None and x['random']['regretLo'] > 0
        sp['complete'] += 1
        sp['final'] += 1 if conf else 0
        full = matrix(rows.get(x['d'], []), k, None, stops)
        fm = sum(1 for s in SEEDS if (lambda lo: lo is not None and lo > 0)(regret_lo(full, k, s + 7 * x['d'] + len(full)))) / len(SEEDS)
        sp['selfAgree'] += 1 if (fm > 0.5) == conf else 0
        for N in NS:
            m = matrix(rows.get(x['d'], []), k, N, stops)
            e = sum(1 for s in SEEDS if (lambda lo: lo is not None and lo > 0)(regret_lo(m, k, s + 7 * x['d'] + N))) / len(SEEDS)
            sp['atN'][str(N)]['expected'] += e
            sp['atN'][str(N)]['kept'] += e if conf else 0.0
    for N in NS:
        for kk in ('expected', 'kept'):
            sp['atN'][str(N)][kk] = round(sp['atN'][str(N)][kk], 2)
            out['atN'][str(N)][kk] += sp['atN'][str(N)][kk]
    for kk in ('final', 'complete', 'selfAgree'):
        out[kk] += sp[kk]
    out['bySpine'][name] = sp
for N in NS:
    a = out['atN'][str(N)]
    a['expected'], a['kept'] = round(a['expected'], 2), round(a['kept'], 2)
    a['keptShare'] = round(a['kept'] / out['final'], 4) if out['final'] else None
print(json.dumps(out, indent=1))
PY
cat > var/lab-j182-local/bin/pilot.py <<'PY'
# J182 pilot: J177's pilot.py with J182's paths and scan stamp, unchanged otherwise.
# J177 pilot: J173's pilot.py with J177's paths and D489: the smoke runs with the futility stop on, so its plan must carry
# cuts.futility {at 0, tie 0, sample 0.25} and its schedule D489's four counters (futileStopped >= 0), `partialLabels` must equal the
# partial decisions, and its units are planned per decision (a partial one: ceil(stoppedAt / chunk)); the smoke's `labels` + `partial`
# are its two decisions; and the self-test's `cuts-futile` leg is read beside `cuts` (a control there, a stop here).
# J173's: J171's pilot.py with J173's paths (the smoke in its own folder, its decks the pilot's own draw) and the smoke's
# frame scan read with J173's scan (refused-cast options, D486-D488's counters, D487's null and legacy records). J171's (J170's, J169's):
# the smoke (J166's powered pair, deck seed 2099, game seed 2199, every cut on, a new folder) and the atlas-selftest's G5, G6 and cuts
# legs, as one JSON object; the smoke's D483 listing read (an identity beside every token, no play twice).
# Standard library only; no engine. Run from the clone (the self-test's folder is var/cubelab/atlas-selftest).
import json, math, os
S = '/home/justin-a/code/lab/data/lab-j182/pilot-smoke-j182'
out = {'smoke': {'problems': -1}, 'g5': {'refusedCast': -1}, 'g6': {'zeroXLeftOut': -1}, 'cuts': {'problems': -1}, 'cutsNoforge': {'problems': -1}, 'cutsFutile': {'problems': -1}}


def units_ok(d):
    ok = set()
    for line in open(os.path.join(d, 'phaseB', 'units.jsonl')):
        try:
            u = json.loads(line)
        except ValueError:
            continue
        if u.get('ok'):
            ok.add(u['id'])
    return len(ok)


try:
    d = json.load(open(S + '/atlas.json'))
    c, g, b = d['checks'], d['checks']['guardrails'], d['phaseB']
    s, p = b['schedule'], d['plan']
    rows = [json.loads(l) for l in open(S + '/phaseB/branches.jsonl') if l.strip()]
    lb = json.load(open('var/lab-j182-local/pilot-labels.json'))
    ls = json.load(open(S + '/phaseB/baseline.json'))['decisions']
    per = math.ceil(p['branchRandom'] / p['chunk']) + math.ceil(p['branchForge'] / p['chunk'])
    scr = math.ceil(p['cuts']['screen'] / p['chunk'])
    planned = sum(scr if x.get('screened') else math.ceil(x['stoppedAt'] / p['chunk']) if x.get('partial') else per for x in b['decisions'])
    fu = (p.get('cuts') or {}).get('futility')
    out['smoke'] = {'problems': len(c['problems']), 'warnings': len(c.get('warnings') or []), 'decisions': len(b['decisions']),
                    'branchedInFull': s['branchedInFull'], 'branched': sum(1 for x in b['decisions'] if not x.get('screened')),
                    'screened': len(s['screened']), 'stoppedOptions': s['stoppedOptions'],
                    'unitsPlanned': planned, 'unitsOk': units_ok(S),
                    'futilityPlan': 1 if fu == {'at': 0, 'tie': 0, 'sample': 0.25} else 0,
                    'futileStopped': s['futileStopped'] if isinstance(s.get('futileStopped'), int) else -1,
                    'futileControls': s['futileControls'] if isinstance(s.get('futileControls'), int) else -1,
                    'futileBranchGamesSaved': s['futileBranchGamesSaved'] if isinstance(s.get('futileBranchGamesSaved'), int) else -1,
                    'partialLabelsKey': s['partialLabels'] if isinstance(s.get('partialLabels'), int) else -1,
                    'futilityReads': len(s['futility']) if isinstance(s.get('futility'), list) else -1,
                    'partialDecisions': sum(1 for x in b['decisions'] if x.get('partial')), 'partial': lb['partialLabels'], 'confidentPartial': lb['confidentPartial'],
                    'cuts': 1 if p.get('cuts', {}).get('decision') == 'D480' and p['cuts']['minOptions'] == 3 else 0,
                    'g6': 1 if all(k in g for k in ('xDrawn', 'zeroXLeftOut', 'zeroX')) else 0, 'zeroX': g.get('zeroX', -1),
                    'd479': 1 if isinstance(b.get('effectSourceNull'), dict) and isinstance(b.get('exileLinksLost'), dict) and 'branchRestarted' in b else 0,
                    'guardViolations': g['violations'], 'branchTimeoutSec': p['branchTimeoutSec'],
                    'branches': len(rows), 'timeouts': sum(1 for r in rows if r.get('timedOut')),
                    'unavailable': sum(1 for r in rows if r.get('unavailable')), 'errored': sum(1 for r in rows if r.get('error')),
                    'trimmedRows': sum(1 for r in rows if (r.get('targetCountTrimmed') or 0) > 0), 'avoidedRows': sum(1 for r in rows if (r.get('costTargetAvoided') or 0) > 0),
                    'labels': lb['labels'], 'rowsUnmatched': lb['rowsUnmatched'], 'voidLabels': lb['voidLabels'],
                    'trainingRows': lb['trainingRows'], 'branchedRows': lb['branched'],
                    'listed': len(ls), 'identities': 1 if ls and all(len(x.get('identities') or []) == len(x['tokens']) for x in ls) else 0,
                    'repeatedPlays': sum(1 for x in ls if len(set(x.get('identities') or [])) < len(x.get('identities') or []))}
except (OSError, ValueError, KeyError, TypeError):
    pass
try:
    c = json.load(open('var/lab-j182-local/lost-smoke/pilot-smoke-j182.json'))
    out['smoke']['scan'] = {'scanned': 1 if c.get('atlasMtime') == int(os.path.getmtime(S + '/atlas.json')) and c.get('scan') == 'J182 v5' else 0, 'logs': c['logs'],
                            'lostCastOptions': len(c['lostCastOptions']), 'refusedCastOptions': len(c['refusedCastOptions']), 'lostCasts': c['lostCasts'],
                            **{k: c.get(k, 0) for k in ('casts', 'refusedCast', 'castsRefused', 'lostPutBack', 'lostStranded', 'cardTargetOffered', 'randomisedPriority',
                                                         'modesDrawn', 'retargeted', 'targetCountTrimmed', 'costTargetAvoided', 'modesDrawnRecords', 'modesSourceRecords',
                                                         'targetRecords', 'targetRecordsCard', 'targetRecordsCardComplete', 'targetNoneChosen', 'targetNoneListed',
                                                         'noTargetRecords', 'nullChosenTargets', 'legacyNullTargets')},
                            'refusedCastShare': c.get('refusedCastShare')}
except (OSError, ValueError, KeyError, TypeError):
    out['smoke']['scan'] = {'scanned': 0, 'lostCastOptions': -1, 'refusedCastOptions': -1, 'legacyNullTargets': -1, 'nullChosenTargets': -1}
for leg in ('g5', 'g6'):
    try:
        d = json.load(open('var/cubelab/atlas-selftest/%s/atlas.json' % leg))
        g = d['checks']['guardrails']
        out[leg] = {'problems': len(d['checks']['problems']), 'refusedCast': g.get('refusedCast', 0), 'noRepeatRefused': g.get('noRepeatRefused', 0),
                    'xDrawn': g.get('xDrawn', 0), 'zeroXLeftOut': g.get('zeroXLeftOut', 0), 'zeroX': g.get('zeroX', -1)}
    except (OSError, ValueError, KeyError, TypeError):
        pass
for key, leg in (('cuts', 'cuts'), ('cutsNoforge', 'cuts-noforge'), ('cutsFutile', 'cuts-futile')):
    try:
        d = json.load(open('var/cubelab/atlas-selftest/%s/atlas.json' % leg))
        sc = d['phaseB']['schedule']
        out[key] = {'problems': len(d['checks']['problems']), 'schedule': 1 if d['phaseB'].get('schedule') else 0,
                    'forgeMap': 0 if d['phaseB'].get('forgeMap') is False else 1, 'labels': sc['labels'],
                    'futileStopped': sc.get('futileStopped', -1), 'futileControls': sc.get('futileControls', -1),
                    'partial': sum(1 for x in d['phaseB']['decisions'] if x.get('partial')),
                    'control': sum(1 for x in d['phaseB']['decisions'] if x.get('futilityControl'))}
    except (OSError, ValueError, KeyError, TypeError):
        pass
print(json.dumps(out))
PY
# the readers' self-tests on J162's and J158's files (read, never written): each must give the registered numbers (J169's to J171's pilots')
L2=/home/justin-a/code/lab/data/lab-j162
L8=/home/justin-a/code/lab/data/lab-j158
python3 -I var/lab-j182-local/bin/labels.py pauper5:confirm-j162:0:464:f6dba5e4:$L2/b-pauper5-464 synergy9:confirm-j162:0:465:f6dba5e4:$L2/b-synergy9-465 modern7:confirm-j162:0:466:f6dba5e4:$L2/b-modern7-466 ff5:confirm-j162:0:462:f6dba5e4:$L2/b-ff5-462 --out=var/lab-j182-local/labels-j162.jsonl --times=$L2/spine-times.txt > var/lab-j182-local/labels-j162.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j182-local/labels-j162.json')); a = d['a_confidentShare']; print(1 if (d['labels'], d['confident'], d['confidentForge'], d['rowsUnmatched'], d['voidLabels'], d['trainingRows'], a['point'], a['interval'], d['c_sizing7']['asRun']['labelsPer7Worker10hNight']) == (59, 7, 5, 0, 0, 0, 0.1186, [0.0339, 0.2203], 91) else 0)" > var/lab-j182-local/labels-self.txt 2>/dev/null || echo 0 > var/lab-j182-local/labels-self.txt
python3 -I var/lab-j182-local/bin/labels.py ff5:confirm-j158:0:461:-:$L8/b-ff5-461 peasant7:confirm-j158:0:463:-:$L8/b-peasant7-463 --times=$L8/spine-times.txt > var/lab-j182-local/labels-j158.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j182-local/labels-j158.json')); print(1 if (d['labels'], d['confident'], d['voidLabels'], d['voidList'], d['sameGameNotBlock']) == (32, 6, 3, ['ff5 d10 block:35>78', 'ff5 d14 block:21>71', 'ff5 d30 block:25>80,40>81'], []) else 0)" > var/lab-j182-local/void-self.txt 2>/dev/null || echo 0 > var/lab-j182-local/void-self.txt
python3 -I var/lab-j182-local/bin/reads.py pauper5:pauper5:$L2/b-pauper5-464/atlas.json synergy9:synergy9:$L2/b-synergy9-465/atlas.json modern7:modern7:$L2/b-modern7-466/atlas.json ff5:ff5:$L2/b-ff5-462/atlas.json > var/lab-j182-local/reads-j162.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j182-local/reads-j162.json')); iv = {n: (v['C1_castNow']['random']['point'], v['C1_castNow']['random']['interval'], v['C1_castNow']['verdict']) for n, v in d['iv_bySpine'].items()}; ok = iv == {'pauper5': (0.0411, [0.0126, 0.069], 'HOLDS'), 'synergy9': (0.0002, [-0.0133, 0.0136], 'NOT SHOWN'), 'modern7': (0.063, [0.017, 0.1231], 'HOLDS'), 'ff5': (0.0523, [-0.0047, 0.1313], 'NOT SHOWN')} and (d['i_sameBest']['point'], d['i_sameBest']['interval'], d['ii_rho']['point'], d['ii_rho']['interval']) == (0.5088, [0.322, 0.7], 0.2181, [-0.1188, 0.5799]); print(1 if ok else 0)" > var/lab-j182-local/reads-self.txt 2>/dev/null || echo 0 > var/lab-j182-local/reads-self.txt
python3 -I var/lab-j182-local/bin/cuts.py $L2/b-pauper5-464 $L2/b-synergy9-465 $L2/b-modern7-466 $L2/b-ff5-462 --times=$L2/spine-times.txt > var/lab-j182-local/cuts-j162.json || true
python3 -I -c "import json; n = json.load(open('var/lab-j182-local/cuts-j162.json'))['night']; print(1 if (n['spines'], n['branchGames'], n['savedShare'], n['checksSecPerKGames']) == (4, 55680, 0.0, 92.3) else 0)" > var/lab-j182-local/cuts-self.txt 2>/dev/null || echo 0 > var/lab-j182-local/cuts-self.txt
python3 -I var/lab-j182-local/bin/metrics.py $L2 'b-*' var/lab-j182-local/lost-none > var/lab-j182-local/metrics-j162.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j182-local/metrics-j162.json')); print(1 if (d['atlases'], d['problems'], d['branchRows'], d['errorsByKind'].get('play not rebuilt on the copy (D472, D476)'), d['xDrawn'], d['planOk']) == (4, 10, 55680, 2400, 32626, 0) else 0)" > var/lab-j182-local/metrics-self.txt 2>/dev/null || echo 0 > var/lab-j182-local/metrics-self.txt
# ... ON J171'S OWN NIGHT (lab-j170 as J172 left it: J171's 13 spines, five atlases re-checked under D487 with J171's in atlas.j171.json; read only):
# labels.py, reads.py, cuts.py, compare.py and metrics.py must give J171's numbers back (results/J172/: labels.json, reads.json, cuts.json,
# compare-j168.json's j171 column, metrics.json; J171's pool names, seat and sha on the command line, as J171's Report passed them)
L7=/home/justin-a/code/lab/data/lab-j170
largs=""; args=""; dirs=""; nargs=""
for d in $L7/b-s??-*-21??; do
  n=$(basename "$d"); s=$(echo "$n" | cut -d- -f2); b=$(echo "$n" | cut -d- -f3); g=$(echo "$n" | cut -d- -f4)
  largs="$largs $s:random-$b-d486:$((g - 100)):$g:f2b4e9c2:$d"; args="$args $s:random-$b-d486:$d/atlas.json"; dirs="$dirs $d"; nargs="$nargs $s:$d"
done
python3 -I var/lab-j182-local/bin/labels.py $largs --times=$L7/spine-times.txt --training=1 --seat=D486 > var/lab-j182-local/labels-j171.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j182-local/labels-j171.json')); a = d['a_confidentShare']; z = d['c_sizing7']['asRun']; sp = {n: (m['labels'], m['confident']) for n, m in d['bySpine'].items()}; ok = (d['labels'], d['confident'], d['confidentForge'], d['rowsUnmatched'], d['voidLabels'], d['trainingRows'], d['branched'], a['point'], a['interval'], z['labelsPer7Worker10hNight'], z['confidentPer7Worker10hNight'], z['confidentPer7Poisson95'], d['byListing']['D483']['labels'], d['d486Rows'], d['d488Rows']['targetCountTrimmed'], d['d488Rows']['costTargetAvoided']) == (101, 28, 1, 0, 0, 147, 147, 0.2772, [0.1607, 0.4253], 104, 28.9, [19.2, 41.8], 101, {'modesDrawn': 1125, 'modesDrawnBranches': 1125, 'retargeted': 2401, 'rowsWithModesDrawn': 14}, 0, 0) and sp == {'s01': (8, 2), 's02': (5, 1), 's03': (8, 2), 's04': (8, 1), 's05': (8, 2), 's06': (8, 4), 's07': (8, 1), 's08': (8, 4), 's09': (8, 1), 's10': (8, 3), 's11': (8, 4), 's12': (8, 2), 's13': (8, 1)} and {p: v['confident'] for p, v in d['byPool'].items()} == {'random-pauper-d486': 6, 'random-peasant-d486': 8, 'random-legacy-d486': 7, 'random-powered-d486': 7}; print(1 if ok else 0)" > var/lab-j182-local/labels-j171-self.txt 2>/dev/null || echo 0 > var/lab-j182-local/labels-j171-self.txt
python3 -I var/lab-j182-local/bin/reads.py $args > var/lab-j182-local/reads-j171.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j182-local/reads-j171.json')); iv = {n: (v['C1_castNow']['random']['point'], v['C1_castNow']['random']['interval'], v['C1_castNow']['verdict']) for n, v in d['iv_bySpine'].items()}; print(1 if d['forgeSpines'] == ['s01', 's07', 's13'] and iv == {'s01': (-0.0313, [-0.0472, -0.0148], 'NOT SHOWN'), 's07': (-0.0099, [-0.0598, 0.045], 'NOT SHOWN'), 's13': (0.014, [-0.0042, 0.025], 'NOT SHOWN')} and (d['i_sameBest']['point'], d['i_sameBest']['interval'], d['ii_rho']['point'], d['ii_rho']['interval'], d['decisions'], d['complete'], d['Q']) == (0.5833, [0.3438, 0.875], 0.2833, [-0.0568, 0.875], 147, 101, 101) else 0)" > var/lab-j182-local/reads-j171-self.txt 2>/dev/null || echo 0 > var/lab-j182-local/reads-j171-self.txt
python3 -I var/lab-j182-local/bin/cuts.py $dirs --times=$L7/spine-times.txt > var/lab-j182-local/cuts-j171.json || true
python3 -I -c "import json; n = json.load(open('var/lab-j182-local/cuts-j171.json'))['night']; print(1 if (n['spines'], n['branchGames'], n['savedShare'], n['earlyStopShare'], n['screenShare'], n['checksSecPerKGames'], n['idleShare'], n['wallSec'], n['checksShare'], n['checksHours']) == (13, 71940, 0.315, 0.1639, 0.1511, 32.5, 0.1391, 40653, 0.0575, 0.65) else 0)" > var/lab-j182-local/cuts-j171-self.txt 2>/dev/null || echo 0 > var/lab-j182-local/cuts-j171-self.txt
python3 -I var/lab-j182-local/bin/compare.py $L7 var/lab-j182-local/labels-j171.json > var/lab-j182-local/compare-j171.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j182-local/compare-j171.json')); print(1 if d['selfMatch'] == 13 and len(d['bySpine']) == 13 and d['selfMatchNight'] == 1 else 0)" > var/lab-j182-local/compare-self.txt 2>/dev/null || echo 0 > var/lab-j182-local/compare-self.txt
# ... the cap read (ncurve.py, new) on J171's 13 spines at 50/100/150/200 branches: the numbers this draft's own read-only run gave,
# 2026-10-27, 37 s (the review's D486 row at 150: E[confident] 28.8, the same; its RNG is numpy's, so the other points differ a little)
python3 -I var/lab-j182-local/bin/ncurve.py --n=50,100,150,200 $nargs > var/lab-j182-local/ncurve-j171.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j182-local/ncurve-j171.json')); a = d['atN']; print(1 if (d['final'], d['complete'], d['selfAgree'], len(d['bySpine'])) == (28, 101, 100, 13) and {n: (a[n]['expected'], a[n]['kept'], a[n]['keptShare']) for n in a} == {'50': (18.8, 15.2, 0.5429), '100': (21.8, 20.0, 0.7143), '150': (28.8, 24.0, 0.8571), '200': (29.6, 28.0, 1.0)} else 0)" > var/lab-j182-local/ncurve-self.txt 2>/dev/null || echo 0 > var/lab-j182-local/ncurve-self.txt
# J181's night, read only, as information (it ended 2026-11-01, its report written): what compare.py and labels.py's c_sizingRead will
# read at the Report (ANOTHER POPULATION's first night: beside, never pooled)
python3 -I -c "import glob, json, os; D = '/home/justin-a/code/lab/data/lab-j181'; r = {'atlases': len(glob.glob(D + '/b-s??-*-21??/atlas.json')), 'report': 1 if os.path.exists(D + '/report/labels.json') else 0}
try:
    lb = json.load(open(D + '/report/labels.json')); r.update({'labels': lb['labels'], 'confident': lb['confident'], 'confidentPer7Worker10hNight': lb['c_sizing7']['asRun']['confidentPer7Worker10hNight'], 'poisson95': lb['c_sizingRead'].get('poisson95'), 'confidentPerWorkerHour': lb['c_sizingRead'].get('confidentPerWorkerHour'), 'contract': lb.get('contract')})
except (OSError, ValueError, KeyError, TypeError):
    pass
print(json.dumps(r))" > var/lab-j182-local/j181.json 2>/dev/null || echo '{"atlases":-1}' > var/lab-j182-local/j181.json
cat var/lab-j182-local/j181.json
# ... THE SCAN on J171's s09 and s13 (read only; caches in lost-self/, never the Report's lost/): J171's numbers for every key J171's scan read
# (results/J172/lost-*.json), D488's classification of every lost cast as a refused payment put back in hand (D488, Context: Fireball 545 on
# s09; Bone Shards 36, Vicious Offering 28, Candy Grapple 4, Disfigure 1 on s13), D487's legacy count on s09 (J172's sweep: 2,361), no
# target:none and no D488 count on logs written before them, and at least as many put-backs as lost casts (a refusal later cast again is one)
mkdir -p var/lab-j182-local/lost-self
for n in b-s09-pauper-2109 b-s13-pauper-2113; do
  python3 -I var/lab-j182-local/bin/metrics.py --scan $L7/$n var/lab-j182-local/lost-self {workers} > /dev/null || true
done
python3 -I -c "
import json
W = {'b-s09-pauper-2109': dict(logs=12150, casts=91317, lostCasts=545, lostCastBranches=362, lostCastForced=0, lostCastOptions=[], byName={'Fireball': 545},
                               byNamePutBack={'Fireball': 545}, lostPutBack=545, lostStranded=0, refusedCast=1509, noRepeatRefused=1500, cardTargetOffered=22733,
                               randomisedPriority=310861, targetRecords=38324, targetRecordsCard=37341, targetRecordsComplete=38270, targetRecordsCardComplete=37287,
                               nullChosenTargets=2361, legacyNullTargets=2361, targetNoneChosen=0, targetNoneListed=0, targetCountTrimmed=0, costTargetAvoided=0, scan='J182 v5',
                               castsRefused=1448, castsRefusedForced=0, refusedCastBranches=951, byNameRefused={'Fireball': 1448}, refusedCastOptions=[]),
     'b-s13-pauper-2113': dict(logs=12870, casts=71632, lostCasts=69, lostCastBranches=32, lostCastForced=0, lostCastOptions=[],
                               byName={'Bone Shards': 36, 'Candy Grapple': 4, 'Vicious Offering': 28, 'Disfigure': 1},
                               byNamePutBack={'Bone Shards': 36, 'Candy Grapple': 4, 'Vicious Offering': 28, 'Disfigure': 1}, lostPutBack=69, lostStranded=0,
                               refusedCast=844, noRepeatRefused=795, cardTargetOffered=72778, randomisedPriority=326131, targetRecords=31221, targetRecordsCard=31221,
                               targetRecordsComplete=31221, targetRecordsCardComplete=31221, nullChosenTargets=0, legacyNullTargets=0, targetNoneChosen=0,
                               targetNoneListed=0, targetCountTrimmed=0, costTargetAvoided=0, scan='J182 v5', castsRefused=787, castsRefusedForced=0, refusedCastBranches=347,
                               byNameRefused={'Bone Shards': 195, 'Vicious Offering': 522, 'Candy Grapple': 41, 'Stab': 6, 'Howl from Beyond': 15, 'Disfigure': 8}, refusedCastOptions=[])}
ok = 1
for n, w in W.items():
    try:
        c = json.load(open('var/lab-j182-local/lost-self/%s.json' % n))
    except (OSError, ValueError):
        c = {}
    bad = {k: (c.get(k), v) for k, v in w.items() if c.get(k) != v}
    more = c.get('castsRefused', -1) >= c.get('lostCasts', 0) and c.get('castsRefused', -1) >= 1
    print('J182 scan self-test', n, 'castsRefused', c.get('castsRefused'), 'refusedCastOptions', c.get('refusedCastOptions'), 'ok' if not bad and more else 'WANT (got, want) %s; castsRefused >= lostCasts %s' % (bad, more))
    ok = ok if not bad and more else 0
print(ok)
" > var/lab-j182-local/scan-self.txt 2>/dev/null || echo 0 > var/lab-j182-local/scan-self.txt
cat var/lab-j182-local/scan-self.txt
# ... and metrics.py's live reads of J171's night, with the two scanned spines' caches: the branch rows' counters, the D483 listing, the worker
# logs' refused payments by spine and card (this draft's count over lab-j170, 2026-10-26: 4,474 lines, 2,077 payment failures), the two scans
python3 -I var/lab-j182-local/bin/metrics.py $L7 'b-s??-*-21??' var/lab-j182-local/lost-self > var/lab-j182-local/metrics-j171.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j182-local/metrics-j171.json')); b = d['bySpine']; c = d['failedToPlayByCard']; print(1 if (d['atlases'], d['spinesDone'], d['branchRows'], d['problems'], d['chooseSourceGuardRows'], d['chooseSourceGuard'], d['retargetedRows'], d['retargetedOnRows'], d['modesDrawnRows'], d['modesDrawnOnRows'], d['targetCountTrimmedRows'], d['costTargetAvoidedRows'], d['d483Spines'], d['identityListingsShort'], d['repeatedPlays'], d['atlasRefusedCast'], d['failedToPlay'], d['payFail'], b['b-s09-pauper-2109']['failedToPlay'], b['b-s13-pauper-2113']['failedToPlay'], b['b-s03-legacy-2103']['failedToPlay'], c.get('Fireball'), c.get('Vicious Offering'), c.get('Bone Shards'), c.get('Candy Grapple'), d['lostCastScanned'], d['lostCasts'], d['lostPutBack'], d['refusedCast'], d['casts'], d['legacyNullTargetRecords']) == (13, 13, 71940, 0, 416, 5086, 1564, 2401, 1125, 1125, 0, 0, 13, 0, 0, 4451, 4474, 2077, 1514, 859, 1420, 1505, 536, 196, 41, 2, 614, 614, 2353, 162949, 2361) else 0)" > var/lab-j182-local/metrics-j171-self.txt 2>/dev/null || echo 0 > var/lab-j182-local/metrics-j171-self.txt
export CUBELAB_HOME_ROOT=var/cubelab/homes-J182
export LAB_DATA_DIR=/home/justin-a/code/lab/data
# THE DECK DRAWS (D447 with D482's list; no engine): the 13 spine pairs, the 13 validation pairs and the smoke's pair into lab-j182 (each only
# where its decks.jsonl is not there yet: a pilot re-run keeps the first draw), then all of them again into the clone (absolute paths, so
# nothing is re-rooted); draws.py --record writes the sha256s once when the two agree
K=0
for B in pauper peasant legacy powered pauper peasant legacy powered pauper peasant legacy powered pauper; do
  K=$((K + 1)); N=$(printf '%02d' $K)
  test -s /home/justin-a/code/lab/data/lab-j182/decks/s$N-$B-$((2400 + K))/decks.jsonl || tools/cubelab.sh decks --band $B --count 2 --seed $((2400 + K)) --cross-band 0.10 --out var/lab-j182/decks/s$N-$B-$((2400 + K))
  test -s /home/justin-a/code/lab/data/lab-j182/validation/v$N-$B-$((2600 + K))/decks.jsonl || tools/cubelab.sh decks --band $B --count 2 --seed $((2600 + K)) --cross-band 0.10 --out var/lab-j182/validation/v$N-$B-$((2600 + K))
  tools/cubelab.sh decks --band $B --count 2 --seed $((2400 + K)) --cross-band 0.10 --out "$PWD/var/lab-j182-local/redraw/s$N-$B-$((2400 + K))"
  tools/cubelab.sh decks --band $B --count 2 --seed $((2600 + K)) --cross-band 0.10 --out "$PWD/var/lab-j182-local/redraw/v$N-$B-$((2600 + K))"
done
test -s /home/justin-a/code/lab/data/lab-j182/decks/p-powered-2099/decks.jsonl || tools/cubelab.sh decks --band powered --count 2 --seed 2099 --cross-band 0.10 --out var/lab-j182/decks/p-powered-2099
tools/cubelab.sh decks --band powered --count 2 --seed 2099 --cross-band 0.10 --out "$PWD/var/lab-j182-local/redraw/p-powered-2099"
python3 -I var/lab-j182-local/bin/draws.py --record || true
python3 -I var/lab-j182-local/bin/draws.py > var/lab-j182-local/draws.json || echo '{"spines13":-1}' > var/lab-j182-local/draws.json
cat var/lab-j182-local/draws.json
# the engine self-tests: atlas-selftest with its G5, G6, cuts and D483 legs, then seat-identity
tools/cubelab.sh atlas-selftest --jobs 2 && echo 1 > var/lab-j182-local/selftest.txt || echo 0 > var/lab-j182-local/selftest.txt
tools/cubelab.sh seat-identity --jobs {workers} && echo 1 > var/lab-j182-local/identity.txt || echo 0 > var/lab-j182-local/identity.txt
# the readers on the self-test's own cuts legs (D489: `cuts` carries a futility control, `cuts-futile` a futile stop; J173's two-leg
# read below is unchanged, then labels.py and cuts.py on all three)
C=var/cubelab/atlas-selftest
python3 -I var/lab-j182-local/bin/labels.py cuts:selftest:0:464:selftest:$C/cuts nf:selftest:0:464:selftest:$C/cuts-noforge --out=var/lab-j182-local/labels-cuts.jsonl --training=1 > var/lab-j182-local/labels-cuts.json || true
python3 -I var/lab-j182-local/bin/reads.py cuts:selftest:$C/cuts/atlas.json nf:selftest:$C/cuts-noforge/atlas.json > var/lab-j182-local/reads-cuts.json || true
python3 -I var/lab-j182-local/bin/cuts.py $C/cuts $C/cuts-noforge > var/lab-j182-local/cuts-cuts.json || true
python3 -I var/lab-j182-local/bin/labels.py cuts:selftest:0:464:selftest:$C/cuts nf:selftest:0:464:selftest:$C/cuts-noforge fu:selftest:0:464:selftest:$C/cuts-futile --out=var/lab-j182-local/labels-futile.jsonl --training=1 > var/lab-j182-local/labels-futile.json || true
python3 -I var/lab-j182-local/bin/cuts.py $C/cuts $C/cuts-noforge $C/cuts-futile > var/lab-j182-local/cuts-futile.json || true
# the v6 rows: the stopped decision is a partial row (stoppedAt 4, "futile", not complete, not confident, futilityGap set), the control a
# complete row marked as one; labels, partialLabels and the controls equal the schedules' own counts; cuts.py sees the stop and its saving
python3 -I -c "
import json
l = json.load(open('var/lab-j182-local/labels-futile.json'))
rows = [json.loads(x) for x in open('var/lab-j182-local/labels-futile.jsonl') if x.strip()]
sc = {x: json.load(open('var/cubelab/atlas-selftest/%s/atlas.json' % x))['phaseB']['schedule'] for x in ('cuts', 'cuts-noforge', 'cuts-futile')}
c = json.load(open('var/lab-j182-local/cuts-futile.json'))['night']
part = [r for r in rows if r['partial']]
ctl = [r for r in rows if r['futilityControl']]
ok = (l['contract'] == 'mtg-table rung-4b label v6 (J177)' and all(r['v'] == 6 for r in rows) and l['rowsUnmatched'] == 0
      and l['labels'] == sum(x['labels'] for x in sc.values()) and l['partialLabels'] == sum(x['futileStopped'] for x in sc.values()) >= 1
      and l['futilityControls'] == sum(x['futileControls'] for x in sc.values()) >= 1 and l['confidentPartial'] == 0 and l['trainingRows'] == l['branched']
      and all(r['stoppedAt'] == 4 and r['stopWhy'] == 'futile' and not r['complete'] and not r['confident'] and r['futilityGap'] is not None and r['spine'] == 'fu' for r in part)
      and all(r['complete'] and not r['partial'] and r['spine'] == 'cuts' for r in ctl) and all(r['branchRandom'] in (6, 4) for r in rows)
      and l['f_futilityRead']['stopped'] == len(part) and l['f_futilityRead']['controls'] == len(ctl)
      and c['spines'] == 3 and c['futileStopped'] >= 1 and c['futileSavedHours'] >= 0 and c['partial'] == len(part))
print(1 if ok else 0)
" > var/lab-j182-local/labels-futile-self.txt 2>/dev/null || echo 0 > var/lab-j182-local/labels-futile-self.txt
python3 -I -c "import json; l = json.load(open('var/lab-j182-local/labels-cuts.json')); r = json.load(open('var/lab-j182-local/reads-cuts.json')); c = json.load(open('var/lab-j182-local/cuts-cuts.json')); s = [json.load(open('var/cubelab/atlas-selftest/%s/atlas.json' % x))['phaseB']['schedule']['labels'] for x in ('cuts', 'cuts-noforge')]; ok = l['rowsUnmatched'] == 0 and l['labels'] == sum(s) and l['trainingRows'] == l['branched'] and l['branched'] >= 2 and r['forgeSpines'] == ['cuts'] and list(r['iv_bySpine']) == ['cuts'] and c['night']['spines'] == 2 and l['byListing']['D483']['rows'] == l['branched']; print(1 if ok else 0)" > var/lab-j182-local/readers-cuts.txt 2>/dev/null || echo 0 > var/lab-j182-local/readers-cuts.txt
# the smoke: J166's powered pair (this pilot's draw, its registered sha256) at game seed 2199, a new folder, every cut on at that scale (J169's
# to J173's smoke) and D489's futility stop on as the night runs it (at the first checkpoint, 10 here; tie 0; a quarter played on), then its
# frame scan; a smoke decision may stop as futile, so its labels and partial rows together are its two decisions
P=/home/justin-a/code/lab/data/lab-j182/decks/p-powered-2099/decks
tools/cubelab.sh atlas --deck-a $P/powered-2099-00001.dck --deck-b $P/powered-2099-00002.dck --seed 2199 --phase b --decisions 2 --min-options 3 --screen 5 --early-stop 10,15,20 --branch-random 25 --branch-forge 5 --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 5 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j182/pilot-smoke-j182 || true
python3 -I var/lab-j182-local/bin/metrics.py --scan /home/justin-a/code/lab/data/lab-j182/pilot-smoke-j182 var/lab-j182-local/lost-smoke {workers} || true
python3 -I var/lab-j182-local/bin/labels.py smoke:random-powered-d498:2099:2199:$(cat var/lab-j182-local/sha.txt):/home/justin-a/code/lab/data/lab-j182/pilot-smoke-j182 --out=var/lab-j182-local/pilot-labels.jsonl --training=1 --lost=var/lab-j182-local/lost-smoke > var/lab-j182-local/pilot-labels.json || true
python3 -I var/lab-j182-local/bin/reads.py smoke:random-powered-d498:/home/justin-a/code/lab/data/lab-j182/pilot-smoke-j182/atlas.json > var/lab-j182-local/pilot-reads.json || true
python3 -I var/lab-j182-local/bin/cuts.py /home/justin-a/code/lab/data/lab-j182/pilot-smoke-j182 > var/lab-j182-local/pilot-cuts.json || true
python3 -I -c "import json; r = json.load(open('var/lab-j182-local/pilot-reads.json')); c = json.load(open('var/lab-j182-local/pilot-cuts.json')); print(1 if r['forgeSpines'] == ['smoke'] and 'smoke' in r['iv_bySpine'] and c['night']['spines'] == 1 and c['night']['branchGames'] >= 1 else 0)" > var/lab-j182-local/pilot-readers.txt 2>/dev/null || echo 0 > var/lab-j182-local/pilot-readers.txt
```
metrics: datadir = sh: cat var/lab-j182-local/datadir.txt 2>/dev/null || echo 0
metrics: state = sh: cat var/lab-j182-local/state.txt 2>/dev/null || echo 0
metrics: merged = sh: cat var/lab-j182-local/merged.txt 2>/dev/null || echo 0
metrics: has_d466_d472 = sh: cat var/lab-j182-local/has-d466-d472.txt 2>/dev/null || echo 0
metrics: has_d476 = sh: cat var/lab-j182-local/has-d476.txt 2>/dev/null || echo 0
metrics: has_d477 = sh: cat var/lab-j182-local/has-d477.txt 2>/dev/null || echo 0
metrics: has_d478 = sh: cat var/lab-j182-local/has-d478.txt 2>/dev/null || echo 0
metrics: has_d479 = sh: cat var/lab-j182-local/has-d479.txt 2>/dev/null || echo 0
metrics: has_d480 = sh: cat var/lab-j182-local/has-d480.txt 2>/dev/null || echo 0
metrics: has_d480f = sh: cat var/lab-j182-local/has-d480f.txt 2>/dev/null || echo 0
metrics: has_d481 = sh: cat var/lab-j182-local/has-d481.txt 2>/dev/null || echo 0
metrics: has_d482 = sh: cat var/lab-j182-local/has-d482.txt 2>/dev/null || echo 0
metrics: has_d483 = sh: cat var/lab-j182-local/has-d483.txt 2>/dev/null || echo 0
metrics: has_d484 = sh: cat var/lab-j182-local/has-d484.txt 2>/dev/null || echo 0
metrics: has_d485 = sh: cat var/lab-j182-local/has-d485.txt 2>/dev/null || echo 0
metrics: has_d486 = sh: cat var/lab-j182-local/has-d486.txt 2>/dev/null || echo 0
metrics: has_d487 = sh: cat var/lab-j182-local/has-d487.txt 2>/dev/null || echo 0
metrics: has_d488 = sh: cat var/lab-j182-local/has-d488.txt 2>/dev/null || echo 0
metrics: has_d489 = sh: cat var/lab-j182-local/has-d489.txt 2>/dev/null || echo 0
metrics: has_d493 = sh: cat var/lab-j182-local/has-d493.txt 2>/dev/null || echo 0
metrics: has_d495 = sh: cat var/lab-j182-local/has-d495.txt 2>/dev/null || echo 0
metrics: has_d496 = sh: cat var/lab-j182-local/has-d496.txt 2>/dev/null || echo 0
metrics: has_d497 = sh: cat var/lab-j182-local/has-d497.txt 2>/dev/null || echo 0
metrics: has_d498 = sh: cat var/lab-j182-local/has-d498.txt 2>/dev/null || echo 0
metrics: has_d499 = sh: cat var/lab-j182-local/has-d499.txt 2>/dev/null || echo 0
metrics: has_d500 = sh: cat var/lab-j182-local/has-d500.txt 2>/dev/null || echo 0
metrics: has_d501 = sh: cat var/lab-j182-local/has-d501.txt 2>/dev/null || echo 0
metrics: seat_code = sh: cat var/lab-j182-local/seat-code.txt 2>/dev/null || echo 0
metrics: d481_d501_commits = sh: cat var/lab-j182-local/has-d481-d501-commits.txt 2>/dev/null || echo 0
metrics: golden = sh: cat var/lab-j182-local/golden.json 2>/dev/null || echo '{"descends":-1}'
metrics: deck_code = sh: cat var/lab-j182-local/deck-code.txt 2>/dev/null || echo 0
metrics: found = sh: cat var/lab-j182-local/found.json 2>/dev/null || echo '{"spineDraws":-1}'
metrics: xmx_unset = sh: cat var/lab-j182-local/xmx-unset.txt 2>/dev/null || echo 0
metrics: nodetests = sh: cat var/lab-j182-local/nodetests.txt 2>/dev/null || echo 0
metrics: redaction_self = sh: cat var/lab-j182-local/redaction-self.txt 2>/dev/null || echo 0
metrics: labels_self = sh: cat var/lab-j182-local/labels-self.txt 2>/dev/null || echo 0
metrics: void_self = sh: cat var/lab-j182-local/void-self.txt 2>/dev/null || echo 0
metrics: reads_self = sh: cat var/lab-j182-local/reads-self.txt 2>/dev/null || echo 0
metrics: cuts_self = sh: cat var/lab-j182-local/cuts-self.txt 2>/dev/null || echo 0
metrics: metrics_self = sh: cat var/lab-j182-local/metrics-self.txt 2>/dev/null || echo 0
metrics: labels_j171_self = sh: cat var/lab-j182-local/labels-j171-self.txt 2>/dev/null || echo 0
metrics: reads_j171_self = sh: cat var/lab-j182-local/reads-j171-self.txt 2>/dev/null || echo 0
metrics: cuts_j171_self = sh: cat var/lab-j182-local/cuts-j171-self.txt 2>/dev/null || echo 0
metrics: compare_self = sh: cat var/lab-j182-local/compare-self.txt 2>/dev/null || echo 0
metrics: scan_self = sh: tail -n 1 var/lab-j182-local/scan-self.txt 2>/dev/null || echo 0
metrics: metrics_j171_self = sh: cat var/lab-j182-local/metrics-j171-self.txt 2>/dev/null || echo 0
metrics: ncurve_self = sh: cat var/lab-j182-local/ncurve-self.txt 2>/dev/null || echo 0
metrics: j181 = sh: cat var/lab-j182-local/j181.json 2>/dev/null || echo '{"atlases":-1}'
metrics: labels_futile_self = sh: cat var/lab-j182-local/labels-futile-self.txt 2>/dev/null || echo 0
metrics: draws = sh: cat var/lab-j182-local/draws.json 2>/dev/null || echo '{"spines13":-1}'
metrics: selftest = sh: cat var/lab-j182-local/selftest.txt 2>/dev/null || echo 0
metrics: identity = sh: cat var/lab-j182-local/identity.txt 2>/dev/null || echo 0
metrics: readers_cuts = sh: cat var/lab-j182-local/readers-cuts.txt 2>/dev/null || echo 0
metrics: pilot_readers = sh: cat var/lab-j182-local/pilot-readers.txt 2>/dev/null || echo 0
metrics: pilot = sh: python3 -I var/lab-j182-local/bin/pilot.py 2>/dev/null || echo '{"smoke":{"problems":-1}}'
check: datadir == 1
check: data_free_gb >= 50
check: state == 1
check: merged == 1
check: has_d466_d472 == 1
check: has_d476 == 1
check: has_d477 == 1
check: has_d478 == 1
check: has_d479 == 1
check: has_d480 == 1
check: has_d480f == 1
check: has_d481 == 1
check: has_d482 == 1
check: has_d483 == 1
check: has_d484 == 1
check: has_d485 == 1
check: has_d486 == 1
check: has_d487 == 1
check: has_d488 == 1
check: has_d489 == 1
check: has_d493 == 1
check: has_d495 == 1
check: has_d496 == 1
check: has_d497 == 1
check: has_d498 == 1
check: has_d499 == 1
check: has_d500 == 1
check: has_d501 == 1
check: seat_code == 1
check: d481_d501_commits == 1
check: golden.descends == 1
check: golden.changed == 1
check: golden.note == 1
check: deck_code == 1
check: xmx_unset == 1
check: nodetests == 1
check: redaction_self == 1
check: labels_self == 1
check: void_self == 1
check: reads_self == 1
check: cuts_self == 1
check: metrics_self == 1
check: labels_j171_self == 1
check: reads_j171_self == 1
check: cuts_j171_self == 1
check: compare_self == 1
check: scan_self == 1
check: metrics_j171_self == 1
check: ncurve_self == 1
check: draws.spines13 == 13
check: draws.all13 == 1
check: draws.validation13 == 13
check: draws.validationAll == 1
check: draws.smokeData == 1
check: draws.smokeRedraw == 1
check: draws.newDraws13 == 13
check: draws.newValidation == 1
check: draws.recorded == 1
check: selftest == 1
check: identity == 1
check: readers_cuts == 1
check: labels_futile_self == 1
check: pilot_readers == 1
check: pilot.g5.problems == 0
check: pilot.g5.refusedCast >= 1
check: pilot.g5.noRepeatRefused >= 1
check: pilot.g6.problems == 0
check: pilot.g6.xDrawn >= 1
check: pilot.g6.zeroXLeftOut >= 1
check: pilot.g6.zeroX == 0
check: pilot.cuts.problems == 0
check: pilot.cuts.schedule == 1
check: pilot.cutsNoforge.problems == 0
check: pilot.cutsNoforge.schedule == 1
check: pilot.cutsNoforge.forgeMap == 0
check: pilot.cuts.futileControls >= 1
check: pilot.cuts.control >= 1
check: pilot.cutsFutile.problems == 0
check: pilot.cutsFutile.futileStopped >= 1
check: pilot.cutsFutile.partial == pilot.cutsFutile.futileStopped
check: pilot.smoke.problems == 0
check: pilot.smoke.cuts == 1
check: pilot.smoke.branched == 2
check: pilot.smoke.futilityPlan == 1
check: pilot.smoke.futileStopped >= 0
check: pilot.smoke.futileControls >= 0
check: pilot.smoke.futileBranchGamesSaved >= 0
check: pilot.smoke.futilityReads >= 0
check: pilot.smoke.partialLabelsKey == pilot.smoke.partialDecisions
check: pilot.smoke.partial == pilot.smoke.futileStopped
check: pilot.smoke.confidentPartial == 0
check: pilot.smoke.unitsOk >= pilot.smoke.unitsPlanned
check: pilot.smoke.g6 == 1
check: pilot.smoke.zeroX == 0
check: pilot.smoke.d479 == 1
check: pilot.smoke.branches >= 1
check: pilot.smoke.timeouts == 0
check: pilot.smoke.guardViolations == 0
check: pilot.smoke.branchTimeoutSec == 120
check: pilot.smoke.labels + pilot.smoke.partial == 2
check: pilot.smoke.rowsUnmatched == 0
check: pilot.smoke.voidLabels == 0
check: pilot.smoke.trainingRows == pilot.smoke.branchedRows
check: pilot.smoke.identities == 1
check: pilot.smoke.repeatedPlays == 0
check: pilot.smoke.scan.scanned == 1
check: pilot.smoke.scan.lostCastOptions == 0
check: pilot.smoke.scan.refusedCastOptions == 0
check: pilot.smoke.scan.legacyNullTargets == 0
check: pilot.smoke.scan.nullChosenTargets == 0
## Commands
One block a spine, s01 to s13 in the table's order (run1-run13), then the scan of the 13 spines' frames (run14), then the Report.
Every atlas command resumes what is done (under the same futility flags: D489 refuses another). A spine atlas that finds a problem
exits 3 and the job goes on (the exit is kept in `exits.txt`; `atlas.problems == 0` fails the job at the end). Each block asserts the
data folder, its 50 GB and its own decks -- the pilot's draw, byte for byte the one it recorded -- before it plays. **Expected wall:
~7 h for the 13 at 6 workers at J177's pace (*Sizing*)**; the 3-h block timeout is over twice J177's longest block (78.7 min).
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J182: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J182: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J182
D=/home/justin-a/code/lab/data/lab-j182
n=b-s01-pauper-2501; K0=$D/decks/s01-pauper-2401; A=$K0/decks/pauper-2401-00001.dck; B=$K0/decks/pauper-2401-00002.dck
# s01's decks: the pilot's draw, byte for byte the one it recorded (the folder's draw, then each deck)
python3 -I var/lab-j182-local/bin/deckcheck.py s01-pauper-2401 $K0 $A $B || { echo "J182: $n: the decks under $K0 are not the recorded draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2501 --phase b --decisions 10 --min-options 3 --screen 25 --early-stop 50,100 --branch-random 150 --branch-forge 40 --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j182/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J182: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J182: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J182
D=/home/justin-a/code/lab/data/lab-j182
n=b-s02-peasant-2502; K0=$D/decks/s02-peasant-2402; A=$K0/decks/peasant-2402-00001.dck; B=$K0/decks/peasant-2402-00002.dck
# s02's decks: the pilot's draw, byte for byte the one it recorded (the folder's draw, then each deck)
python3 -I var/lab-j182-local/bin/deckcheck.py s02-peasant-2402 $K0 $A $B || { echo "J182: $n: the decks under $K0 are not the recorded draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2502 --phase b --decisions 10 --min-options 3 --screen 25 --early-stop 50,100 --branch-random 150 --branch-forge 0 --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j182/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J182: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J182: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J182
D=/home/justin-a/code/lab/data/lab-j182
n=b-s03-legacy-2503; K0=$D/decks/s03-legacy-2403; A=$K0/decks/legacy-2403-00001.dck; B=$K0/decks/legacy-2403-00002.dck
# s03's decks: the pilot's draw, byte for byte the one it recorded (the folder's draw, then each deck)
python3 -I var/lab-j182-local/bin/deckcheck.py s03-legacy-2403 $K0 $A $B || { echo "J182: $n: the decks under $K0 are not the recorded draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2503 --phase b --decisions 10 --min-options 3 --screen 25 --early-stop 50,100 --branch-random 150 --branch-forge 0 --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j182/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J182: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J182: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J182
D=/home/justin-a/code/lab/data/lab-j182
n=b-s04-powered-2504; K0=$D/decks/s04-powered-2404; A=$K0/decks/powered-2404-00001.dck; B=$K0/decks/powered-2404-00002.dck
# s04's decks: the pilot's draw, byte for byte the one it recorded (the folder's draw, then each deck)
python3 -I var/lab-j182-local/bin/deckcheck.py s04-powered-2404 $K0 $A $B || { echo "J182: $n: the decks under $K0 are not the recorded draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2504 --phase b --decisions 10 --min-options 3 --screen 25 --early-stop 50,100 --branch-random 150 --branch-forge 0 --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j182/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J182: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J182: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J182
D=/home/justin-a/code/lab/data/lab-j182
n=b-s05-pauper-2505; K0=$D/decks/s05-pauper-2405; A=$K0/decks/pauper-2405-00001.dck; B=$K0/decks/pauper-2405-00002.dck
# s05's decks: the pilot's draw, byte for byte the one it recorded (the folder's draw, then each deck)
python3 -I var/lab-j182-local/bin/deckcheck.py s05-pauper-2405 $K0 $A $B || { echo "J182: $n: the decks under $K0 are not the recorded draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2505 --phase b --decisions 10 --min-options 3 --screen 25 --early-stop 50,100 --branch-random 150 --branch-forge 0 --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j182/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J182: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J182: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J182
D=/home/justin-a/code/lab/data/lab-j182
n=b-s06-peasant-2506; K0=$D/decks/s06-peasant-2406; A=$K0/decks/peasant-2406-00001.dck; B=$K0/decks/peasant-2406-00002.dck
# s06's decks: the pilot's draw, byte for byte the one it recorded (the folder's draw, then each deck)
python3 -I var/lab-j182-local/bin/deckcheck.py s06-peasant-2406 $K0 $A $B || { echo "J182: $n: the decks under $K0 are not the recorded draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2506 --phase b --decisions 10 --min-options 3 --screen 25 --early-stop 50,100 --branch-random 150 --branch-forge 0 --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j182/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J182: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J182: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J182
D=/home/justin-a/code/lab/data/lab-j182
n=b-s07-legacy-2507; K0=$D/decks/s07-legacy-2407; A=$K0/decks/legacy-2407-00001.dck; B=$K0/decks/legacy-2407-00002.dck
# s07's decks: the pilot's draw, byte for byte the one it recorded (the folder's draw, then each deck)
python3 -I var/lab-j182-local/bin/deckcheck.py s07-legacy-2407 $K0 $A $B || { echo "J182: $n: the decks under $K0 are not the recorded draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2507 --phase b --decisions 10 --min-options 3 --screen 25 --early-stop 50,100 --branch-random 150 --branch-forge 40 --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j182/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J182: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J182: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J182
D=/home/justin-a/code/lab/data/lab-j182
n=b-s08-powered-2508; K0=$D/decks/s08-powered-2408; A=$K0/decks/powered-2408-00001.dck; B=$K0/decks/powered-2408-00002.dck
# s08's decks: the pilot's draw, byte for byte the one it recorded (the folder's draw, then each deck)
python3 -I var/lab-j182-local/bin/deckcheck.py s08-powered-2408 $K0 $A $B || { echo "J182: $n: the decks under $K0 are not the recorded draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2508 --phase b --decisions 10 --min-options 3 --screen 25 --early-stop 50,100 --branch-random 150 --branch-forge 0 --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j182/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J182: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J182: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J182
D=/home/justin-a/code/lab/data/lab-j182
n=b-s09-pauper-2509; K0=$D/decks/s09-pauper-2409; A=$K0/decks/pauper-2409-00001.dck; B=$K0/decks/pauper-2409-00002.dck
# s09's decks: the pilot's draw, byte for byte the one it recorded (the folder's draw, then each deck)
python3 -I var/lab-j182-local/bin/deckcheck.py s09-pauper-2409 $K0 $A $B || { echo "J182: $n: the decks under $K0 are not the recorded draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2509 --phase b --decisions 10 --min-options 3 --screen 25 --early-stop 50,100 --branch-random 150 --branch-forge 0 --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j182/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J182: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J182: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J182
D=/home/justin-a/code/lab/data/lab-j182
n=b-s10-peasant-2510; K0=$D/decks/s10-peasant-2410; A=$K0/decks/peasant-2410-00001.dck; B=$K0/decks/peasant-2410-00002.dck
# s10's decks: the pilot's draw, byte for byte the one it recorded (the folder's draw, then each deck)
python3 -I var/lab-j182-local/bin/deckcheck.py s10-peasant-2410 $K0 $A $B || { echo "J182: $n: the decks under $K0 are not the recorded draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2510 --phase b --decisions 10 --min-options 3 --screen 25 --early-stop 50,100 --branch-random 150 --branch-forge 0 --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j182/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J182: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J182: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J182
D=/home/justin-a/code/lab/data/lab-j182
n=b-s11-legacy-2511; K0=$D/decks/s11-legacy-2411; A=$K0/decks/legacy-2411-00001.dck; B=$K0/decks/legacy-2411-00002.dck
# s11's decks: the pilot's draw, byte for byte the one it recorded (the folder's draw, then each deck)
python3 -I var/lab-j182-local/bin/deckcheck.py s11-legacy-2411 $K0 $A $B || { echo "J182: $n: the decks under $K0 are not the recorded draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2511 --phase b --decisions 10 --min-options 3 --screen 25 --early-stop 50,100 --branch-random 150 --branch-forge 0 --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j182/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J182: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J182: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J182
D=/home/justin-a/code/lab/data/lab-j182
n=b-s12-powered-2512; K0=$D/decks/s12-powered-2412; A=$K0/decks/powered-2412-00001.dck; B=$K0/decks/powered-2412-00002.dck
# s12's decks: the pilot's draw, byte for byte the one it recorded (the folder's draw, then each deck)
python3 -I var/lab-j182-local/bin/deckcheck.py s12-powered-2412 $K0 $A $B || { echo "J182: $n: the decks under $K0 are not the recorded draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2512 --phase b --decisions 10 --min-options 3 --screen 25 --early-stop 50,100 --branch-random 150 --branch-forge 0 --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j182/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J182: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J182: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J182
D=/home/justin-a/code/lab/data/lab-j182
n=b-s13-pauper-2513; K0=$D/decks/s13-pauper-2413; A=$K0/decks/pauper-2413-00001.dck; B=$K0/decks/pauper-2413-00002.dck
# s13's decks: the pilot's draw, byte for byte the one it recorded (the folder's draw, then each deck)
python3 -I var/lab-j182-local/bin/deckcheck.py s13-pauper-2413 $K0 $A $B || { echo "J182: $n: the decks under $K0 are not the recorded draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2513 --phase b --decisions 10 --min-options 3 --screen 25 --early-stop 50,100 --branch-random 150 --branch-forge 40 --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j182/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
# the refused and lost casts and D486-D488's counters, from the frames (J173's scan under J182's stamp): one cache a spine folder, stamped with
# its atlas.json's mtime
D=/home/justin-a/code/lab/data/lab-j182
mkdir -p var/lab-j182-local/lost
for d in $D/b-s??-*-25??; do
  test -f $d/atlas.json || { echo "J182: $d: no atlas.json, not scanned"; continue; }
  python3 -I var/lab-j182-local/bin/metrics.py --scan $d var/lab-j182-local/lost {workers}
done
```
cores: 1
```bash
D=/home/justin-a/code/lab/data/lab-j182
mkdir -p $D/report
: > $D/report/missing.txt
T=$D/spine-times.txt
SHA=$(cat var/lab-j182-local/sha.txt)
LO="--lost=var/lab-j182-local/lost --training=1 --times=$T"
args=""; largs=""; dirs=""; nargs=""
# J181's night, read only, for the J181 columns (compare.py) and J181's sizing read (labels.py --j181): ANOTHER POPULATION, read beside,
# never pooled; absent files read as null
J6=/home/justin-a/code/lab/data/lab-j181
# the night's 13 spines: b-s??-*-25?? matches no pilot folder; every row names the pin and its band's D498 pool (D498's population)
for d in $D/b-s??-*-25??; do
  n=$(basename "$d"); s=$(echo "$n" | cut -d- -f2); b=$(echo "$n" | cut -d- -f3); g=$(echo "$n" | cut -d- -f4)
  if [ -f "$d/atlas.json" ]; then
    cp "$d/atlas.json" "$D/report/$n.atlas.json"
    cp "$d/atlas.md" "$D/report/$n.atlas.md" || echo "$n: no atlas.md" >> $D/report/missing.txt
    largs="$largs $s:random-$b-d498:$((g - 100)):$g:$SHA:$d"; args="$args $s:random-$b-d498:$d/atlas.json"; dirs="$dirs $d"; nargs="$nargs $s:$d"
  else
    echo "$n: no atlas.json" >> $D/report/missing.txt
  fi
done
for f in var/lab-j182-local/lost/*.json; do cp "$f" "$D/report/lost-$(basename "$f")"; done || echo "lost caches: none" >> $D/report/missing.txt
python3 -I var/lab-j182-local/bin/labels.py $largs --out=$D/report/labels.jsonl $LO --j181=$J6/report/labels.json > $D/report/labels.json || echo "labels.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j182-local/bin/ncurve.py --n=50,100,150 $nargs > $D/report/ncurve.json || echo "ncurve.py exited $?" >> $D/report/missing.txt
head -n 20 $D/report/labels.jsonl > $D/report/labels-head.jsonl || echo "labels.jsonl: none" >> $D/report/missing.txt
python3 -I var/lab-j182-local/bin/reads.py $args > $D/report/reads.json || echo "reads.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j182-local/bin/cuts.py $dirs --times=$T > $D/report/cuts.json || echo "cuts.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j182-local/bin/compare.py $D $D/report/labels.json $J6 $J6/report/labels.json > $D/report/compare-j181.json || echo "compare.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j182-local/bin/metrics.py > $D/report/tool.json || echo "metrics.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j182-local/bin/draws.py --report > $D/report/draws.json || echo "draws.py exited $?" >> $D/report/missing.txt
# the validation draw (made fresh by this pilot, never branched), recorded for the job that will branch it
python3 -I -c "import glob, json, os; D = '$D'; vs = sorted(glob.glob(D + '/validation/v*')); rec = json.load(open('var/lab-j182-local/draws-pilot.json')); rows = [{'set': os.path.basename(v).split('-')[0], 'band': os.path.basename(v).split('-')[1], 'pool': 'random-' + os.path.basename(v).split('-')[1], 'deckSeed': int(os.path.basename(v).split('-')[2]), 'reservedGameSeed': int(os.path.basename(v).split('-')[2]) + 100, 'decks': sorted(glob.glob(v + '/decks/*.dck')), 'split': 'validation', 'training': False} for v in vs]; print(json.dumps({'note': 'the 4b night-four validation draw, made by the J182 pilot into lab-j182 at deck seeds 2601-2613 (D447 with D482\'s list as D490, D492 and D494 leave it, --cross-band 0.10): deck files only, never branched; no job may train on these decks or use these seeds (game seeds 2701-2713 reserved) before the validation job that branches them', 'drawSha256': rec.get('validation'), 'sets': rows}, indent=1))" > $D/report/validation.json || echo "validation.json: failed" >> $D/report/missing.txt
python3 -I -c "import glob, json, os; D = '$D'; out = {}; [out.__setitem__(os.path.basename(d), {k: json.load(open(d + '/plan.json')).get(k) for k in ('deckA', 'deckB', 'seed', 'branchRandom', 'branchForge', 'decisions', 'chunk', 'cuts')}) for d in sorted(glob.glob(D + '/b-s??-*-25??'))]; print(json.dumps({'note': 'all 13 spines branched by J182 at the pin, by D488s random seat policy on D498s determinizer, on new decks (deck seeds 2401-2413, game seeds 2501-2513), on J177s design (150 random branches, the futility stop at 50 with a 0.25 control share, 10 decisions): D498s population, NEW; never pooled with J181 (D497), J177 or J180 (D493), J173 (D488) nor J166-J172 (D486 or earlier seats); split by pool, randomSeat or sha', 'sha': '$SHA', 'spines': out}, indent=1))" > $D/report/spines.json || echo "spines.json: failed" >> $D/report/missing.txt
for f in exits.txt spine-times.txt; do cp $D/$f $D/report/$f || echo "$f: none" >> $D/report/missing.txt; done
# disarm the abort gate: a re-post of this file starts disarmed until its own pilot
rm -f var/lab-j182-local/armed.txt
```
check: atlas.atlases == 13
check: atlas.spinesDone == 13
check: atlas.planOk == 13
check: atlas.cutsSpines == 13
check: atlas.forgeSpines == 3
check: atlas.scheduleKeys == 13
check: atlas.spines_pauper == 4
check: atlas.spines_peasant == 3
check: atlas.spines_legacy == 3
check: atlas.spines_powered == 3
check: unit_errors == 0
check: atlas.unitsShort == 0
check: atlas.fullShort == 0
check: atlas.g5keys == 13
check: atlas.g6keys == 13
check: atlas.d479keys == 13
check: atlas.zeroX == 0
check: atlas.guardViolations == 0
check: atlas.problems == 0
check: atlas.unavailableOptionsOverBar == 0
check: atlas.timeoutShare < 1%
check: engine_errors - atlas.branchTimeoutsInStep <= 50
check: atlas.validationFolders == 13
check: atlas.validationDecks == 26
check: atlas.validationShaOk == 1
check: atlas.validationBranched == 0
check: atlas.reads == 1
check: atlas.labels >= 1
check: atlas.rowsUnmatched == 0
check: atlas.voidLabels == 0
check: atlas.trainingRows == atlas.branchedRows
check: atlas.poolOk == 13
check: atlas.compare == 1
check: atlas.scuteDecks == 0
check: atlas.d483Spines == 13
check: atlas.pre483Spines == 0
check: atlas.identityListingsShort == 0
check: atlas.repeatedPlays == 0
check: atlas.lostCastScanned == 13
check: atlas.refusedCastOptions == 0
check: atlas.lostCastOptions == 0
check: atlas.legacyNullTargetRecords == 0
check: atlas.cardTargetOffered >= 1
check: atlas.futilityKeys == 13
check: atlas.futilityReads >= 1
check: atlas.partialDecisions == atlas.futileStopped
check: atlas.partialLabels == atlas.futileStopped
check: atlas.futilityControls == atlas.futileControls
check: atlas.confidentPartial == 0
check: atlas.ncurve == 1

## Abort if
abort: armed == 1 and unit_errors > 20
abort: armed == 1 and engine_errors > 500
abort: armed == 1 and big_frames >= 6
abort: data_free_gb < 50
`armed` is 1 only from this job's pilot to its Report block, so the first three cannot read another run's files; and every count
reads `lab-j182/b-s??-*-25??`, which only this job writes. **`big_frames`** is J167's hung s05's signature (a frame log over 200
MB, where a sound branch's is kilobytes); D484 makes it impossible, and if it fires a loop D484 does not cover is back. D493's re-run of
the statics on nearly every copy is new code on every fork, so it is watched from the first spine like D488's fit was.
`unit_errors == 0` means every unit of the 13 spines finished; `atlas.unitsShort` and `atlas.fullShort` as J169.
**`atlas.problems == 0`** includes the redaction check over every frame log, so D487's record shapes (`target:none`, `min`, `why:
"NO_TARGET"`), D488's guardrail names, D495's spell copies on the stack and D496's reveal lines are checked on every spine by the checker
D487, D488, D495 and D496 amended; it is the check J177 failed, on the cascade gap D496 closes (and J176 on four gaps D492-D495 close). **`atlas.refusedCastOptions == 0`** fails if any option
of any spine had its own forced cast refused (put back in hand) in more than half of its branches (a cost D488 does not fit: a modal
spell's mode costs, D488's Not fixed, or a new one); **`atlas.lostCastOptions == 0`** if one lost its forced cast outright; the summary
names the spine, the option and the card. **`atlas.legacyNullTargetRecords == 0`** fails a night whose seats wrote J171's legacy null
target shape, which D487's bridge cannot write. **`atlas.cardTargetOffered >= 1`** fails a night whose random seats never offered a
card-only play: not D486's seat or later. **A random library deck can meet a card no atlas has played**: a new tool gap fails
`atlas.problems == 0`, its spine's exit 3 is kept, and the summary names it with its error text and cost; an errored branch row's stack
is in its spine's worker logs (D488's `branch error, stack:`; Forge 2.0.14's `PumpEffect.java:299` is known). A fork crash that kills
every branch of a decision (D492's and D494's shape) or D472's alarm on a cast the fork cannot rebuild (D493's) is such a gap: report the
card and the stack, never a verdict on the card. An option capped past 0.25 is a warning, reported, never a failed check. **D489's
checks:** `atlas.futilityKeys == 13` fails a spine whose schedule lacks the rule's counters (the flags did not reach it);
`atlas.futilityReads >= 1` a night where the rule read nothing; `partialDecisions`, `partialLabels` (labels.json's rows) and
`futileStopped` must agree, and so must the controls; and `atlas.confidentPartial == 0` fails any partial row counted confident.
`atlas.unitsShort == 0` and `atlas.fullShort == 0` count a futile-stopped decision's units as its two stages to 50 and the decision as
branched, so the rule cannot trip them.

## Report
collect: /home/justin-a/code/lab/data/lab-j182/report/*.atlas.md
collect: /home/justin-a/code/lab/data/lab-j182/report/*.atlas.json
collect: /home/justin-a/code/lab/data/lab-j182/report/labels.json
collect: /home/justin-a/code/lab/data/lab-j182/report/labels.jsonl
collect: /home/justin-a/code/lab/data/lab-j182/report/labels-head.jsonl
collect: /home/justin-a/code/lab/data/lab-j182/report/reads.json
collect: /home/justin-a/code/lab/data/lab-j182/report/cuts.json
collect: /home/justin-a/code/lab/data/lab-j182/report/tool.json
collect: /home/justin-a/code/lab/data/lab-j182/report/compare-j181.json
collect: /home/justin-a/code/lab/data/lab-j182/report/ncurve.json
collect: /home/justin-a/code/lab/data/lab-j182/report/lost-*.json
collect: /home/justin-a/code/lab/data/lab-j182/report/draws.json
collect: /home/justin-a/code/lab/data/lab-j182/report/validation.json
collect: /home/justin-a/code/lab/data/lab-j182/report/spines.json
collect: /home/justin-a/code/lab/data/lab-j182/report/exits.txt
collect: /home/justin-a/code/lab/data/lab-j182/report/spine-times.txt
collect: /home/justin-a/code/lab/data/lab-j182/report/missing.txt
The summary says, for Justin, in plain words and numbers only:
- **The population, first line:** random library decks by band, drawn as the census draws them (D447, D482 with D490's, D492's and
  D494's cards never dealt), on J177's design (**D489's futility stop and the 150 cap**, 10 decisions); **13 NEW spines (deck seeds
  2401-2413, game seeds 2501-2513) branched by J182 at the pin, by D488's random seat policy forking on D498's determinizer, the FIRST
  night of D498's population**: `training: true`, `pool: random-<band>-d498`, `randomSeat: "D498"`, contract v6 with `branchRandom: 150`
  and the partial rows marked; **pooled with nothing before: not J181's rows (D497's population: the fork before D498), not J177's and
  J180's (D493's), not J173's nor anything older** (D493, Comparability, quoted: "search-v2 results and atlas maps from before and after
  D493 are not pooled"; D489's "A future change to the seat or to what it offers does", quoted -- a redeal that changes the world a branch
  plays in does).
- **The run:** exits, walls per spine and for the night (against J181's, and the ~8.3 h at 6 workers *Sizing* expected), rows, timeouts,
  unit errors, engine errors (with any errored row's stack from the worker logs), capped, D479's and D477's counters, disk. **Whether
  J181's three gaps, J180's and J177's stayed closed**: no branch log failed the checker's A6 on a card the seat may look at (D498;
  the sweep's count per spine, as information), no id problem from a killed attempt's rows and `abandonedPlays` said when a unit was
  re-run (D499), no `getDamageLKI` and no `paperCard` in any errored branch's stack and no bare exception in any worker log (D500,
  D497), no checker failure on a cascade's "cast it?" inside a held frame (D496), no Prepare card and no Ob Nixilis, the Adversary in
  any deck, no `no ... on the copy's` error on a Plotted or Foretold cast, no checker failure on a spell copy on the stack.
- **The yield, the number to read** (`labels.json` (c)): **confident labels per worker-hour and per 7-worker 10-h night, with the
  Poisson 95% interval** (`c_sizingRead`), per spine, per band and for the night; beside it **J181's** (0.464 a worker-hour, 32.5 a 7-worker night [20.6, 48.7]; another population: the fork before D498, other
  decks), **J180's** (0.551), **J177's** (0.563) and **the review's ~46 [41, 51]**. Then labels, partial labels and confident labels, and the confident share, **said plainly to be inflated** by the
  stopped futile decisions it no longer holds; what 1,000 confident labels take at this rate.
- **(f) The futility read** (`labels.json` `f_futilityRead`, atlas.md's futility lines): decisions read at 50, futile, stopped (partial
  labels) and **controls**; **how many controls ended confident at the full n, with the exact 95% interval, beside the review's 3 of 77
  (.04)**, and the labels lost estimated from it; each control and each stopped decision in one line (spine, d, k, gap). **Say that this
  is the first night of D498's population's pooled read** (`pooledInputs`), that J181's 0 of 13, J177's 0 of 12 and J180's 0 of 14
  are other populations' and are not added in, and that ~10-14 controls cannot tell .04 from .2.
- **(g) The cap read** (`ncurve.json`): at 50, 100 and 150 branches, the share of the night's final confident set already confident
  (`keptShare`) and the expected confident count, beside the review's 54%, 68% and 87% and J181's, J180's and J177's own (their `ncurve.json`);
  `selfAgree` beside the review's 215 of 222.
- **(d) What the saved time bought** (`cuts.json`, `compare-j181.json`): the branch time the futility stop and the cap saved
  (`futileSavedHours`, `capSavedHours`, `futilityCapShare`), `futileBranchGamesSaved` (an upper bound), and **the decisions branched a
  spine (10 asked; branched, branched in full, partial) against J181's 11.8, J180's 8.08 and J177's 9.31**. Then J173's reads: early stop and screen savings, the idle
  share, the checks' wall and share, the redaction wall.
- **The refused payments, the headline of J173's reading** (`tool.json`, `lost-*.json`, the worker logs): `refusedCastShare` per spine
  and for the night beside J181's (0.02%), J180's (0.10%), J177's (0.35%) and J171's (0.53%), `castsRefusedShare`, `staleRefused`, `failedToPlay` and `payFail`; **by
  card, read twice** (the frames' put-backs and the worker logs), never the worker logs' count alone; `refusedCastOptions` (checked 0)
  and the label rows' `refusedCastBranchShare` where above 0; J169's lost casts as `lostPutBack` and `lostStranded`, by name (checked:
  no lost-cast option).
- **D484-D488's counters** as J173's summary gives them: D488's `targetCountTrimmed` and `costTargetAvoided` (seats and rows, where they
  fired, the spells if traced, else "not traced", `d488Rows`); D486's `cardTargetOffered` / `cardTargetShare`, `modesDrawn`, the target
  records and the `complete: true` share; D487's `target:none`, `NO_TARGET`, null answers and `legacyNullTargetRecords` (checked 0);
  D485's and D484's as information.
- **D489's counters** (`tool.json`): per spine and for the night `futilityReads`, `futileRead`, `futileStopped`, `futileControls`,
  `futileBranchGamesSaved`, `partialLabels`, and the checks that tie them together.
- **The three Forge-map spines:** **(iv)** C1 on s01, s07, s13, HOLDS / NOT SHOWN, with J181's values at the same positions beside
  (another population, other decks); **(i)-(iii)** same best, rho, regret by kind, `confidentForge`, over complete decisions (a
  futile-stopped one has no Forge map); C2 and the random-map C1 on the other ten as information; and one line that the Forge map was kept
  for this agreement study, not for labels (the review: it adds none).
- **J182 beside J181, by position** (`compare-j181.json`): **a table, one row a position and a night row**: decisions listed per baseline
  turn, decisions branched / branched in full / partial, options per decision, labels / confident labels, **confident per worker-hour**,
  the confident share, mean regret at Forge's choice, capped share and wall; **labelled: different decks, the same seat policy and
  design, the fork changed (D498, D500), J181's s07 carrying the redeal gap; a candidate, never a verdict** -- no difference is D498's by
  itself.
- **(a)** the confident share by pool, kind and k (over complete rows, with the same caution), **(b)**, **(v)**, **D483** (identities, 0
  short, 0 repeated), **per spine** one line (decks, baseline, listed, branched / partial / screened / fill, options, labels /
  confident, wall), **the draws** (made fresh, recorded, each block's check passed), **the validation draw** (made fresh, its recorded
  sha256, never branched, game seeds 2701-2713 reserved), **the checks** with any exit explained, **the intervals' coarseness**, and
  **the label set** (`labels.jsonl`'s rows: complete, screened and partial; v6's fields; one random seat policy, one copier, one commit;
  the spine folders kept for rung 4).
- **No verdict** beyond (iv)'s: any other surprise is a candidate until a fresh draw shows it.
