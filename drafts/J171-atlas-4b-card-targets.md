id: J171
title: The move atlas, rung 4b -- J170 re-posted on a pin whose seat-identity golden carries D486's regeneration (J170's pilot failed on `identity == 1` alone, 81 of its 82 checks passed): the first atlas night on D486's random seat (it targets cards, draws a modal spell's modes with their targets, and no listing offers a modal spell the cast would refuse), a NEW POPULATION: all 13 spines branched FRESH at the pin into lab-j170, the data folder J170's pilot drew into, on J166-J169's 13 deck draws as J170's pilot re-made them from the census (kept, verified at their registered sha256s, drawn only where absent) (deck seeds 2001-2013, bands cycled pauper, peasant, legacy, powered, D482's list applied) and the game seeds 2101-2113, the Forge map on s01, s07 and s13, every cut on (D480; min-options counting plays, D483), chunk 25, D484's guard and D485's stale-target fix in the tree; the lost casts scanned from the frames with no lost-cast option a check on every spine, and D486's counters (`cardTargetOffered`, `modesDrawn`, `MODES_DRAWN`, card target records); J166's validation draw as J170's pilot re-made it, never branched; the label contract v4, unchanged. Pre-registered reads, numbers only; no outcome rule beyond D451's and J156's (iv). Never pooled with any label, read, ladder result or grade from before D486 (contracts v1-v3 included)
public_title: Move atlas 4b: the random seat targets cards
public_est: ~9 h 30 to 12 h
public_decides: None by itself; the first atlas night on the D486 random seat, 13 fresh spines
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2.7
repos: mtg-table@f2b4e9c26227ef135e5df1102384e026cbf2f195 (origin/main: the merge that regenerates fixtures/cubelab/seat-identity.json for D486, after 24038bcd, D486's merge; the owner writes that merge's sha here before posting; merged == 1, the commits that added D481-D486's decision files and the golden's provenance checked by the pilot)
decides: nothing by itself. Rung 4b of the atlas ladder: the first night on D486's random seat, which is a NEW POPULATION (D486, Comparability: the seat now targets cards, draws a multi-target part's count and a modal spell's modes, the option lists lose uncastable modal spells, decision indices move; labels, reads, ladder results and grades from before D486 are never pooled with those after). So every spine is branched fresh, on the same decks and seeds as J166-J169, into a new data folder. It measures, on D486's seat: labels and confident labels per spine and per night, the sizing read, what the cuts save, the checks' share, D486's counters (how often a listing offered a play only a card target makes possible, the modes the seat drew, the target records that list cards), the lost casts from the frames, C1 and agreement on the three Forge-map spines, and each spine beside J168's numbers for the same decks and seeds, as two populations
hypothesis: none to confirm about the maps. Registered expectations, as information: no option anywhere loses its own forced cast in most of its branches (a check; D486's s05 reproduction: 0 stranded casts in 380 frame logs, where D485's tree stranded 136); few lost casts at all (D486 does not cover the plain Forge seat in a Forge-map continuation, which still meets `doTrigger(sa, true)` inside a cast, nor a trigger's targets); `cardTargetOffered` on most spines (D486's s05 reproduction: 1,539 of 12,958 randomised priority listings, 11.9%), `modesDrawn` where a deck holds a modal spell (s05's Suplex, Abrade, Branching Bolt; the reproduction: 50 in 190 branch games); every target record listing a card complete (the reproduction: 627 of 627; before D486: none); the walls near J168's 10 h 08 for the same 13 at 6 workers (D486's s05 reproduction ran at about D485's pace). The sizing read is NOT predicted from J168's 31.1 [20.5, 45.2] confident labels per 7-worker 10-h night or the review's ~25-27: both are another population
rule: D451 (method; no outcome rule) with D458/D462/D466 (G5), D459, D465, D466, D467, D470, D471 (G6), D472, D476, D477, D478, D479, D480 (the cuts) and its follow-up (the schedule's plan-hash guard), D481, D482, D483, D484, D485 and D486 (the random seat's card targets and drawn modes: `cardTargetOffered` and `modesDrawn` in the seat's `explore.guardrails`, `modesDrawn` on the branch row, why "MODES_DRAWN", target-record source "modes", protocol M75); D447 (the deck draw). Pre-registered by J170 and unchanged here (J170 branched nothing), before any J171 data: the label contract v4 and its reads (a)-(c) computed by var/lab-j171-local/bin/labels.py, the agreement reads (i)-(vi) by reads.py, the savings and the checks' share by cuts.py, the tool's counters, the lost casts and D486's counters by metrics.py, the comparison with J168 by compare.py, all exactly as written in the pilot. The final check `lostCastOptions == 0` over the 13 scanned spines (no option of any spine loses its own forced cast in more than half of its branches) is registered here. A candidate of (iv) HOLDS on a spine only if its point is > 0 and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. Every other difference is a candidate (D447 point 9). No read carries any other verdict
followup: morning-read
est: ~10.5 h at 6 workers (range 9.5-12 h; sizing below): pilot ~25 min (J169's ~15 plus the draws and the redraw, the lost-cast scan's self-test and the smoke's scan); the 13 spines ~10 h at J168's pace (10 h 08 for the same 13 at 6 workers, 22-75 min a spine; D486's s05 reproduction ran at about D485's pace); the scan of the 13 spines' frames ~6 min; the report ~3 min. Disk ~12-16 GB on the lab data folder /home/justin-a/code/lab/data (J168's 13 spines: ~12 GB)
resumable: yes
timeout: 3h
progress: lines /home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/branches.jsonl of 71525
metrics: branches = lines /home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/branches.jsonl
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/branches.jsonl "\"engineError\":true"
metrics: branch_timeouts = count /home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/branches.jsonl "\"timedOut\":true"
metrics: unavailable = count /home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/branches.jsonl "\"unavailable\":\""
metrics: modes_drawn_rows = count /home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/branches.jsonl "\"modesDrawn\":"
metrics: retargeted_rows = count /home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/branches.jsonl "\"retargeted\":"
metrics: unit_errors = count /home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/units.jsonl "\"ok\":false"
metrics: payfail = count /home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/logs/*.log "Didn't find what to pay for"
metrics: failed_to_target = count /home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/logs/*.log "failed to target"
metrics: big_frames = sh: python3 -c "import glob, os; print(sum(1 for f in glob.glob('/home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/frames/*.gz') if os.path.getsize(f) > 2e8))" 2>/dev/null || echo 0
metrics: armed = sh: cat var/lab-j171-local/armed.txt 2>/dev/null || echo 0
metrics: atlas = sh: python3 -I var/lab-j171-local/bin/metrics.py 2>/dev/null || echo '{"problems":-1}'
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: data_used_gb = sh: python3 -c "import os; print(round(sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk('/home/justin-a/code/lab/data/lab-j170') for f in fs) / 1e9, 2))" 2>/dev/null || echo 0
headline: branches, atlas.spinesDone, atlas.labels, atlas.confident, atlas.confidentPer7Worker10hNight, atlas.cardTargetOffered, atlas.cardTargetShare, atlas.modesDrawn, atlas.modesDrawnRows, atlas.lostCasts, atlas.lostCastOptions, atlas.timeoutShare, atlas.problems

**Before posting -- the owner, by hand (nothing in this file does them).**
1. **The data folder: nothing to make, nothing to move.** `/home/justin-a/code/lab/data/lab-j170` exists and holds J170's pilot
   outputs: `decks/` (14 folders: the 13 spine pairs and the smoke's), `validation/` (13) and `pilot-smoke-j170/`. Leave them. The pilot
   stops at its first lines if the folder is missing, and records once (`state`) that it holds nothing but those (no spine folder,
   no `report/`, no `exits.txt`); it keeps J170's draws after checking them against the registered sha256s, draws only a folder
   that is absent, runs its smoke in a new folder, `pilot-smoke-j171`, and never creates, moves, cleans or deletes anything there;
   no block of this job has a `clean:` line.
2. **Write the pin:** replace `f2b4e9c26227ef135e5df1102384e026cbf2f195` in `repos:` with the sha of the merge on origin/main that regenerates
   `fixtures/cubelab/seat-identity.json` for D486 (`runner.sh check` fails until then, on that placeholder alone).
3. **The golden's record:** the pilot's `golden` metric requires that the fixture was last changed by a commit descending from the
   one that added D486's decision file (818a9de4), that it differs from its text there, and that a decision file under
   `docs/decisions/` names both `D486` and `seat-identity` (the regeneration's record: D486's addendum or a decision naming it).
   If the regenerating lane wrote its record somewhere else, correct the `note` part of the pilot's golden lines before posting.
4. If the merge renamed any name this file reads -- `cardTargetOffered` and `modesDrawn` (the seat's guardrails, M75),
   `modesDrawn` on the branch row, why `"MODES_DRAWN"`, the record source `"modes"`, `modesAtCast` -- correct metrics.py, the
   `modes_drawn_rows` metric and the pilot's `has-d486` grep before posting.

**Why J171: J170, re-posted.** J170 (2026-10-25 23:51 to 2026-10-26 00:02, at 24038bcd) failed in its pilot after 11 minutes on
one check of 82, `identity == 1`: `tools/cubelab.sh seat-identity` found three of its four games different from the golden
`fixtures/cubelab/seat-identity.json` (forge: B in 15 turns, 57 lines against the golden's 59; search: A in 13, 92 lines against
93; explore: A in 18, 193 lines, another digest; plain: the same game). D486 did that on purpose -- every recorded seat's records
and the search seat's play changed -- while the golden was still D451's, last written at b4ea60a0. The other 81 checks passed: the
pin's D466-D486 greps, every reader's self-test, the eleven `draws.*` checks and the smoke (165 branch games, 0 problems, 0 lost
casts, `cardTargetOffered` 536). A lane regenerates the golden on main. **J171 is J170 on that pin, changed only where the re-post
needs it:** (1) the pin; (2) the data folder stays lab-j170, J170's pilot's draws in it are kept -- checked against the registered
sha256s, drawn only where absent -- and the smoke runs fresh in a new folder, `pilot-smoke-j171` (J170's `pilot-smoke-j170` is left
where it is and read by no line of this job); (3) a pilot check that the golden on the pin carries D486's regeneration (`golden`:
three parts), beside `identity == 1`, which stays the real check; (4) the ids: J171, `var/lab-j171-local/`,
`var/cubelab/homes-J171`, compare-j168.json's column `j171`. The label contract v4, the reads, the spines, the final checks, the
estimate and the Report are J170's. J170 branched nothing, so no J170 number exists to compare with.

**Why (J170's).** J166 began rung 4a's night (13 spines of random library decks, drawn as the census draws them, D447, on D480's cut
design, labels `training: true`); J167 and J168 finished it, and J169 mended it on D485's tree. **J168 (2026-10-25, 12:14-19:51)**
branched s05-s13 at 26a8db00: 71,525 branch rows over the 13 spines, 0 engine errors, 0 timeouts, 97 labels and 27 confident,
**31.1 [20.5, 45.2] confident labels per 7-worker 10-h night**; its read (`results/J168/summary.md`) found the random seat losing
spells it had paid for -- s05 18% of its branches (Suplex; J169's frame scan added Abrade, 600 more), s10 8.7%, s06 2.7% -- and
that **the random seat never picked a card-targeting play of its own**: `getAllCandidates(sa, true)` returns players only.
D485 mended the stale targets (s06, s10); **D486** mends the rest, and changes the seat:
- **The seat targets cards** (`Explorer.candidates`, `Decisions.targets`): every candidate `canTarget` allows, players and cards,
  that the seat can see; a part's target count drawn between its minimum and its maximum; the target redraw and the close call
  (D358) draw from the same candidates; a target record lists every candidate, players and cards, and is `complete: true` when
  the answer is among them (protocol **M75**).
- **A modal spell's modes are the seat's, with their targets** (`Explorer.randomModes`, `Explorer.modesAtCast`): its own listing
  draws the modes; Forge's answer with no modes, or modes D485 cannot make legal, gets modes the seat draws; inside the cast, a
  spell that arrives with no legal modes (the atlas's forced option) gets them then. Counted **`modesDrawn`** (the seat's
  guardrail and the branch row), its records `why: "MODES_DRAWN"`, the cast-time target records `source: "modes"`.
- **No listing offers a modal spell the cast would refuse** (`Explorer.modesCastable`): the atlas's options, the priority
  record's options and the seat's own listing leave it out -- **so option lists change, and decision indices move** (D486's s05
  reproduction branched d0, d10 and d11 where D485's tree branched d0 and d13).
- **The fork carries the modes' targets** (`SearchPolicy.mapSa`).
- **`cardTargetOffered`**: the seat's priority listings that offered at least one play of its own that only a card target made
  possible (one the players-only draw before D486 would have left out).

**So J171 is a new population, in the folder J170's pilot started** (D486, Comparability: "labels, reads, ladder results and grades from
before D486 are never pooled with those after it"). Nothing of lab-j166 is reused but read-only self-tests: the 13 deck draws
were made again by J170's pilot from the census, into lab-j170, and came out byte for byte the registered ones (J171's pilot
checks them again); every spine is branched fresh at the pin, into a folder that holds no spine yet; the Report reads lab-j170 alone. **J168's numbers are the comparison, never a baseline**: same decks,
same seeds, another random seat -- every difference is a candidate.

**What J171 does with lab-j166: nothing but read.** The pilot's readers' self-tests read J162's, J158's, J166's, J167's and six of
J168's spine folders (s05, s07, s08, s09, s11, s12: the six J169 leaves alone), and the lost-cast scan's self-test reads six of
J168's (J169's six, s06 and s10 in their `.j168-stale` asides when J169 has moved them). No glob of this job matches lab-j166.

## The decks

**The draw is D447's with D482's list**, as J167-J170's: `tools/cubelab.sh decks --band <b> --count 2 --seed <s> --cross-band 0.10
--out ...`, the committed list by default. **J170's pilot drew them into lab-j170** (J166's way: the 13 spine pairs, the 13
validation pairs and the smoke's pair, onto `lab-j170/decks/` and `lab-j170/validation/`), and every one came out the registered
sha256 (its eleven `draws.*` checks passed). **J171's pilot keeps them:** a draw onto the data folder is made only where its
`decks.jsonl` is not yet there, so J170's draws stay as they are and only an absent folder is drawn (a pilot re-run keeps the
first), and draws.py checks every one against the registered sha256s, whoever drew it. It draws them all **again into the clone**
(J167's redraw, `var/lab-j171-local/redraw/`, an absolute path so nothing is re-rooted); both must give the registered sha256s
below, deck by deck. The deck code is unchanged since J167's pin: `git log bf978690..ac56940d` touches none of `tools/cubelab/deckcensus.ts`,
`tools/cubelab/engine-unplayable.json` or `cubes/library/` (J171's pin adds the golden's regeneration; the redraw at the pin shows
whether anything moved a deck).

| spine | band | deck seed | game seed | Forge map | decks (J167's table) | in J168 (another population) |
|---|---|---|---|---|---|---|
| s01 | pauper | 2001 | 2101 | **40** | k 5 WUBRG, k 1 R | J166, 325c2dd8 |
| s02 | peasant | 2002 | 2102 | 0 | k 3 URG, k 1 B | J166, 325c2dd8 |
| s03 | legacy | 2003 | 2103 | 0 | k 5, k 5 | J166, 325c2dd8 |
| s04 | powered | 2004 | 2104 | 0 | **k 3 WRG (D482's deck 1)**, k 1 W | J167, bf978690 |
| s05 | pauper | 2005 | 2105 | 0 | k 2 RG (Suplex, Abrade, Branching Bolt, Goblin Surprise: modal), k 2 WG | J168, 26a8db00 |
| s06 | peasant | 2006 | 2106 | 0 | k 4 WBRG, k 1 U | J168 (J169 re-branched it on D485) |
| s07 | legacy | 2007 | 2107 | **40** | k 1 R, k 5 | J168, 26a8db00 |
| s08 | powered | 2008 | 2108 | 0 | k 2 UR, k 4 UBRG | J168, 26a8db00 |
| s09 | pauper | 2009 | 2109 | 0 | k 4 WURG, k 4 WBRG | J168, 26a8db00 |
| s10 | peasant | 2010 | 2110 | 0 | k 3 WBR, k 2 BG | J168 (J169 re-branched it on D485) |
| s11 | legacy | 2011 | 2111 | 0 | k 1 B, k 4 WURG | J168, 26a8db00 |
| s12 | powered | 2012 | 2112 | 0 | k 5, k 3 WUB | J168, 26a8db00 |
| s13 | pauper | 2013 | 2113 | **40** | k 2 BG, k 1 G | J168, 26a8db00 |

**The draws' sha256s, registered** (`drawsha.py`: each folder's `decks.jsonl`, then its `.dck` files by name; the twelve, s04,
the smoke's and the validation draw are J167's and J169's registered values; all 13 in order, each spine's draw and each deck
computed 2026-10-25 by this draft from lab-j166, read only, and equal to them):
- all 13 spine draws, s01-s13 in order (s04's the D482 one): **`faee7df31b55ffd0079f8deaf5280e8d2416f93493d13fc4cb2999a99f45ff6b`** (26 decks);
- the twelve D482 leaves alone (s01-s03, s05-s13): `e27796b73073bab5e172c2225047cecfe8424ee5ceeb4d839d44484d9da07419` (24 decks);
- s04: `81c4dd22dcdbd1a110b0339476cbab04e8f6d2791f1881e42499b97f8675dc00` (deck 1 `873bb7e41c40f2ad4a40fbd8e3abf7185820fa93b1e90c40d2abff5907e3f003`, no Scute Swarm);
- the smoke's (powered, 2099): `edfdc861736fb049bc1080d525269064c6776ecabd47de496463fa3dc684c931`;
- **the validation draw (v01-v13, deck seeds 2201-2213): `7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de`** (26 decks);
- each spine's draw and its two decks: `draws.py`'s `DECKS` table; each spine's block checks its own three values again before
  it plays.

**The validation draw is J166's, made again and never branched**: the same command at deck seeds 2201-2213 into
`lab-j170/validation/v<nn>-<band>-<seed>/`; game seeds 2301-2313 stay reserved for the job that branches them. J167's pilot
redrew it on bf978690 and got `7def89fa...` (`validationRedrawSame` 1); J170's pilot drew it into lab-j170 at 24038bcd and got it again (`draws.validationData` 1), and
J171's pilot keeps that draw. A check fails the job if any spine's plan names a
validation deck or any validation folder holds a plan or a phase B. The report records it (`validation.json`).

## The design: J166's, unchanged

The per-spine flags are J166's to J169's exactly: `--phase b --decisions 8 --min-options 3 --screen 25 --early-stop on
--branch-random 200 --branch-forge 40|0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers}` (the Forge
map, 40, on s01, s07 and s13 only). D480's cuts with D483's play count, D484's guard and D485's stale targets are in the tree.

**Sizing.** J168's measured walls for the same 13 spines at 6 workers (minutes): s01 47.8, s02 29.4, s03 48.6, s04 34.2, s05 46.2,
s06 75.3, s07 22.4, s08 65.7, s09 49.9, s10 52.3, s11 61.0, s12 36.0, s13 39.1 -- **10 h 08 in all**. D486's s05 reproduction
(190 branch games) ran at about D485's pace; D486 can move a spine either way (more options where a card target opens a play,
fewer where an uncastable modal spell leaves the list), so **~10.5 h, range 9.5-12 h**, with the pilot ~25 min, the scan ~6 min
and the report ~3 min. `timeout: 3h` bounds each block (~2.4x s06's 75 min). A stall costs at most 3 h and fails the job at that
block; a runner retry resumes it (`resumable: yes`). ~71,525 branch rows when done (`progress:`: J168's count for the same 13,
an estimate). **Disk** ~12-16 GB; the pilot and every block require 50 GB free, and `abort:` fires under 50 GB.

**Where it writes: the lab data folder, lab-j170**: every atlas and deck command runs under
`LAB_DATA_DIR=/home/justin-a/code/lab/data` with `--out var/lab-j170/...`. The Forge homes (`CUBELAB_HOME_ROOT=var/cubelab/homes-J171`),
the self-test's folder, the redraw and the job's scripts and caches (`var/lab-j171-local/`) stay in the clone. Every block asserts
the path, the 50 GB and its own decks again; **no `clean:`, nothing deleted**. A restart from scratch needs J171's own outputs in lab-j170 (the
`b-s*` folders, `report/`, `exits.txt`, `spine-times.txt`, `pilot-smoke-j171/`) moved aside by hand and
`var/lab-j171-local/state.txt` and `armed.txt` removed; J170's draws can stay.

**The abort lines read only this run's artefacts (the J152 lesson):** every abort that reads the atlas's files is gated on
`armed == 1`, written by this pilot and removed by the Report block's last line; and every glob is under lab-j170's `b-s??-*-21??`,
which only this job writes (J170 wrote only its draws and its smoke into lab-j170).

**Nothing beside it.** `cores: 7` of 8 reserves the box: post nothing heavy beside it. No `pilot_cores:`. **No `after:` line**:
J169 is a heavy job too, so the core budget serialises the two; J171 reads none of J169's outputs (its lab-j166 self-tests read
only folders J169 leaves alone, or J168's asides wherever they are). A runner retry of J171 resumes J171's own `run.json`
(`blocks_done`). J170's clone folder `var/lab-j170-local/` (its `armed.txt` still 1: J170 failed before its Report block) is
read by no line of this job.

## The lost casts and D486's counters, from the frames

**metrics.py `--scan`** (J169's, registered there, extended here) reads every branch frame log of a spine once, in a block of
its own after the 13 spines (one cache a folder, stamped with its `atlas.json`'s mtime; a cache of another atlas.json is never
read):
- **A lost cast** (J169's definition, unchanged): in the caster's own seat log, a zone event `{hand, that seat}` -> `{stack,
  null}` after which no state frame lists the card in `stackCards`, no zone event moves it off the stack and no `cast` event names
  it -- card and mana gone. **Forced**: the card is the branch's own option (`cast:<id>`) and is lost before the branch's first AI
  decision record. **A lost-cast option**: (decision, map, option) whose forced cast was lost in more than half of its branch
  rows. **New:** each lost card's **name**, read from the caster's own state frames (its hand named it), so the summary can say
  which spell. **`lostCastOptions == 0` is a final check over the 13 spines** (each scanned: `lostCastScanned == 13`); the lost
  casts themselves are information (expected few: D486's Not fixed -- the plain Forge seat in a Forge-map continuation, a
  trigger's targets).
- **D486's counters** (protocol M75), from the same logs:
  - from each log's `decisions` summary (its `explore` block): `decisionsRandomised`, `byKind.priority` (**the randomised priority
    listings**) and every guardrail count -- **`cardTargetOffered`**, **`modesDrawn`**, D485's `retargeted` and `staleRefused`;
  - from its decision records: `why: "MODES_DRAWN"` (`modesDrawnRecords`), `source: "modes"` (`modesSourceRecords`), D485's
    `why: "STALE_TARGETS"` (`staleTargetRecords`), and every `target` record: `targetRecords`, those listing a card
    (`targetRecordsCard`: a `target:<id>` option, not `target:p<id>`), those complete (`targetRecordsComplete`: no `complete:
    false`; M55 writes the key only when false) and both (`targetRecordsCardComplete`);
  - **`cardTargetShare`** = cardTargetOffered / randomised priority listings, per spine and for the night.
  Beside them, from `branches.jsonl` (live, in the `atlas` metric): `modesDrawnRows` / `modesDrawnOnRows` (D486's
  `BranchRow.modesDrawn`, written when > 0), `retargetedRows` / `retargetedOnRows` (D485's), `chooseSourceGuardRows` (D484's).
- **Verified by this draft on D486's own s05 reproduction** (`/home/justin-a/code/mtg-table-d486/var/d486-s05`, read only, 2 s):
  380 logs, 2,505 casts, **0 lost**, `cardTargetOffered` 1,539 of 12,958 randomised priority listings (0.1188), `modesDrawn` 50,
  627 target records, all 627 listing a card and complete, 0 `MODES_DRAWN` or `source: "modes"` records -- D486's evidence,
  number for number. On J168's s02 (pre-D486): 5,000 logs, 48,998 casts, 7 lost (Tear Asunder, by name), 9,143 target records,
  every one listing a card and **none complete**, `cardTargetOffered` 0 -- J169's numbers and D486's account of the old records.
- **Never from the worker logs**: `failed_to_target` stays a metric, as information only (J168's s05: 453 lines for 991 lost casts).

## The label set: the rung-4b contract, v4

`report/labels.jsonl`, one JSON row a branched decision of seat A on all 13 spines, written by labels.py, `contract`
**`mtg-table rung-4b label v4 (J170)`** (registered by J170 and kept verbatim: J171 changes nothing of v4), `v: 4`: every v3 field (J169's: `randomSeat`, `biased`, `lostCastOptions`, `lostCastVoid`,
`lostCastBranches`; J167's v2 fields; J166's v1 fields), and:

| field | value |
|---|---|
| `sha` | **the pin** on every row (`var/lab-j171-local/sha.txt`, 8 hex) |
| `pool` | **`random-<band>-d486`** (`random-pauper-d486`, `random-peasant-d486`, `random-legacy-d486`, `random-powered-d486`) |
| `randomSeat` | **`"D486"`** on every row |
| `listing` | `"D483"` on every row (a check: `d483Spines == 13`) |
| `biased` | `null` on every row (J171 marks nothing; a lost-cast option fails the job instead) |
| `modesDrawn`, `retargeted` | new: the sums over the decision's branch rows (both maps) of D486's and D485's branch-row counters |
| `modesDrawnBranches` | new: the decision's branch rows with `modesDrawn` > 0 |

- `training: true`, `split: "train"` on every row. **Never pooled with v1-v3** (D486): the pool names carry `-d486`, the contract
  and `v` differ, and every row names the pin.
- **Expected: 0 void labels** (D470's `void`), 0 `lostCastVoid`.
- **Nothing is cleaned**: rung 4 reads the spine folders through each row's paths.

## Pre-registered reads (numbers only)
J169's reads, definitions unchanged, over **all 13 spines**, and:
- **(a)-(b)** the confident share (pooled pool -> spine -> decision, by pool, by spine, by kind, by k, over Q), the gap, the
  regret, the settled share (labels.py).
- **(c) the sizing read** (`c_sizingRead`): labels and confident labels per spine, per pool and for the night at the measured
  walls (spine-times.txt, checks included), scaled to **7 workers and a 10-h night**, with the confident count's exact Poisson
  95% interval scaled the same way (`poisson95`). **Reported beside, as ANOTHER population, never pooled:** J168's 31.1 [20.5,
  45.2] (27 confident, 112 labels a night) and the review's ~25-27 (section 5, cube pairs). No verdict.
- **(d) the cuts' savings** (cuts.py): branch time saved by early stopping and the screen against a projection without them, the
  idle share, **the checks' wall and its share of the night** (`checksShare`; J168: 0.50 h, 4.9%), per 1,000 branch games.
- **(iv) C1 "cast now where Forge passes" on s01, s07, s13**: HOLDS / NOT SHOWN by the registered rule; **(i)-(iii)** same best,
  rho, regret by kind on the three Forge-map spines; C2 and the random-map C1 on the other ten as information.
- **(v)** the guardrails per spine and per pool; **(vi)** the sizing line per spine (reads.py).
- **(ix) D483**: `identityListingsShort` and `repeatedPlays` 0 (checks), `sharedToken` as information.
- **(xii) D484**: `chooseSourceGuardRows` and its sum per spine (information; J168's s05: 537 rows, Circle of Protection: Green).
- **(xiii) D485**: `retargetedRows` and their sum, the seats' `retargeted` and `staleRefused`, the frames' `staleTargetRecords`
  (information).
- **(xiv) the lost casts** per spine and for the night, by card name; **`lostCastOptions == 0`, a check**.
- **(xvi) D486** per spine and for the night: `cardTargetOffered`, the randomised priority listings and **`cardTargetShare`**,
  `cardTargetSpines` (spines where it fired), `modesDrawn` (the seats' count) beside `modesDrawnRows` / `modesDrawnOnRows` (the
  branch rows), `modesDrawnRecords`, `modesSourceRecords`, and the target records: total, with a card, complete, with a card and
  complete. **`cardTargetOffered >= 1` over the night is a check** (the seat that played is D486's); every other D486 number is
  information.
- **(xvii) J171 beside J168, ACROSS POPULATIONS** (compare.py, `report/compare-j168.json`; J168's own definitions from its
  `report/bin/spines.py`, its values registered in compare.py): per spine and for the night, decisions listed per baseline turn,
  options per decision in full, labels, confident labels and the confident share, the mean regret at Forge's choice, the capped
  share, the branch games and the wall. No verdict: same decks and seeds, another random seat.
- **(xi)** the draws and the redraw (pilot); the validation draw (final checks).
- Everything else is a candidate (D447 point 9).

**Outputs** (on the data folder, `/home/justin-a/code/lab/data/lab-j170/`).
- `decks/s<nn>-<band>-<seed>/`, `decks/p-powered-2099/`, `validation/v<nn>-<band>-<seed>/` (J170's pilot's draw, kept; J171's
  pilot draws only a folder that is absent).
- `b-s<nn>-<band>-<seed>/` (the 13 spines), `pilot-smoke-j171/` (the smoke; J170's `pilot-smoke-j170/` stays, read by nothing).
- `exits.txt`, `spine-times.txt`.
- `report/`: `labels.json`, `labels.jsonl`, `labels-head.jsonl`, `reads.json`, `cuts.json`, `tool.json`, `compare-j168.json`,
  `lost-<folder>.json` (13), `draws.json`, `validation.json`, `spines.json`, `<spine>.atlas.json` and `.atlas.md`, the two text
  files, `missing.txt`. Never `summary.md` or `metrics.json`.

## Pilot
About 25 minutes: the data folder (it must exist, holding nothing but J170's pilot outputs at the first pilot) and the abort
gate; the pin carries D466-D486 and the seat-identity golden D486 regenerated (`golden`, three parts; `identity == 1` stays the
real check); the node tests and the redaction checker's selftest; the readers' self-tests (J162's, J158's, J166's, J167's s04, six of J168's
spines, and compare.py against J168's own numbers); the lost-cast scan's self-test on six of J168's spines (J169's numbers, and
D486's counters at 0 on logs written before D486); the deck draws in lab-j170 (J170's pilot's, kept; drawn only where
absent) and the redraw into the clone, against the registered sha256s; the two engine self-tests; a 1-spine smoke with every cut on (J166's smoke pair at game seed 2199,
`pilot-smoke-j171`, a new folder so it runs fresh at the pin, J169's smoke exactly), and its frame scan.
```bash
# the lab data folder: exactly /home/justin-a/code/lab/data (README safety rules); lab-j170 made by the owner for J170, never by this job
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J171: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import json, sys; v = json.load(open('config.json')).get('labDataDir'); sys.exit(0 if v in (None, '', '/home/justin-a/code/lab/data') else 'J171: config.json labDataDir is %r, not /home/justin-a/code/lab/data' % v)"
test -d /home/justin-a/code/lab/data/lab-j170 || { echo "J171: /home/justin-a/code/lab/data/lab-j170 does not exist: it holds J170's pilot draws, and this job never creates it" >&2; exit 1; }
mkdir -p var/lab-j171-local/bin
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; print('J171: data folder free GB', round(f, 1)); sys.exit(0 if f >= 50 else 'J171: under 50 GB free on the data folder')"
echo 1 > var/lab-j171-local/datadir.txt
# state: what lab-j170 held at this job's first pilot, recorded once (a later pilot run keeps the first answer): 1 when it holds nothing
# but J170's pilot outputs (decks/, validation/, pilot-smoke-j170/) and this job's own smoke (pilot-smoke-j171/, from an earlier J171 pilot):
# no spine folder, no report/, no exits.txt or spine-times.txt (empty passes too: every draw is then made here). Else 0, and nothing is drawn
test -f var/lab-j171-local/state.txt || python3 -I -c "import os; d = '/home/justin-a/code/lab/data/lab-j170'; print(1 if os.path.isdir(d) and set(os.listdir(d)) <= {'decks', 'validation', 'pilot-smoke-j170', 'pilot-smoke-j171'} else 0)" > var/lab-j171-local/state.txt
# found (information, recorded once): which of J170's pilot's draws were there (13 spine folders, 13 validation folders, the smoke's) and its smoke folder
test -f var/lab-j171-local/found.json || python3 -I -c "import glob, json, os; d = '/home/justin-a/code/lab/data/lab-j170'; print(json.dumps({'spineDraws': len(glob.glob(d + '/decks/s??-*/decks.jsonl')), 'validationDraws': len(glob.glob(d + '/validation/v??-*/decks.jsonl')), 'smokeDraw': len(glob.glob(d + '/decks/p-powered-2099/decks.jsonl')), 'smokeJ170': 1 if os.path.isdir(d + '/pilot-smoke-j170') else 0, 'entries': len(os.listdir(d))}))" > var/lab-j171-local/found.json
echo "J171: lab-j170 at the first pilot: state $(cat var/lab-j171-local/state.txt), $(cat var/lab-j171-local/found.json)"
test "$(cat var/lab-j171-local/state.txt)" = 1 || { echo "J171: lab-j170 held more than J170's pilot outputs at this job's first pilot (var/lab-j171-local/state.txt): nothing drawn" >&2; exit 1; }
# the abort gate (the J152 lesson): this job's own run is armed from here; the Report block disarms it
echo 1 > var/lab-j171-local/armed.txt
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j171-local/merged.txt || echo 0 > var/lab-j171-local/merged.txt
git rev-parse --short=8 HEAD > var/lab-j171-local/sha.txt
grep -q 'chosenOptionalCosts' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'class StepClock' bridge/src/mtgtable/ai/Atlas.java && grep -q 'class OptionUnavailable' bridge/src/mtgtable/ai/RolloutController.java && grep -q 'zeroXLeftOut' bridge/src/mtgtable/ai/Explorer.java && grep -q 'restoreChoices' bridge/src/mtgtable/ai/Explorer.java && grep -q 'copyCandidates' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'COUNTED_GUARDRAILS' tools/cubelab/atlas.ts && grep -q 'unit-timeout' tools/cubelab/atlas.ts && grep -q 'empty-hand-ok' tools/check-redaction.mjs && echo 1 > var/lab-j171-local/has-d466-d472.txt || echo 0 > var/lab-j171-local/has-d466-d472.txt
grep -q 'D476' bridge/src/mtgtable/ai/SearchPolicy.java && echo 1 > var/lab-j171-local/has-d476.txt || echo 0 > var/lab-j171-local/has-d476.txt
grep -q 'final class ForkRestart' bridge/src/mtgtable/ai/ForkRestart.java && grep -q 'branchRestarted' tools/cubelab/atlas.ts && echo 1 > var/lab-j171-local/has-d477.txt || echo 0 > var/lab-j171-local/has-d477.txt
grep -q 'BRANCH_CAPPED_WARN_DEFAULT' tools/cubelab/atlas.ts && grep -q 'export function cappedBranches' tools/cubelab/atlas.ts && echo 1 > var/lab-j171-local/has-d478.txt || echo 0 > var/lab-j171-local/has-d478.txt
grep -q 'effectSourceNull' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'exileLinksLost' bridge/src/mtgtable/ai/Atlas.java && grep -q 'exileLinksLost' tools/cubelab/atlas.ts && echo 1 > var/lab-j171-local/has-d479.txt || echo 0 > var/lab-j171-local/has-d479.txt
grep -q 'export class AtlasSchedule' tools/cubelab/atlascuts.ts && grep -q "export const EARLY_STOP_ON = \[50, 100, 150\]" tools/cubelab/atlascuts.ts && grep -q 'export const SCREEN_LOW = 0.04' tools/cubelab/atlascuts.ts && grep -q 'export async function redactionCheckParallel' tools/cubelab/censusplay.ts && grep -q 'holdIdle' tools/cubelab/engine.ts && grep -q 'SELFTEST_CUTS' tools/cubelab/atlas.ts && test -f web/test/cubelab-atlas-cuts.test.ts && echo 1 > var/lab-j171-local/has-d480.txt || echo 0 > var/lab-j171-local/has-d480.txt
grep -q 'export function openSchedule' tools/cubelab/atlas.ts && grep -q 'SCHEDULE_PLAN_KEYS' tools/cubelab/atlas.ts && echo 1 > var/lab-j171-local/has-d480f.txt || echo 0 > var/lab-j171-local/has-d480f.txt
ls docs/decisions/D481-*.md >/dev/null 2>&1 && grep -q 'enteredBetweenFrames' tools/check-redaction.mjs && test -f fixtures/negative/redaction/m55-option-entered-between-frames.jsonl && echo 1 > var/lab-j171-local/has-d481.txt || echo 0 > var/lab-j171-local/has-d481.txt
ls docs/decisions/D482-*.md >/dev/null 2>&1 && test -f tools/cubelab/engine-unplayable.json && grep -q '"Scute Swarm"' tools/cubelab/engine-unplayable.json && grep -q 'engine-unplayable.json' tools/cubelab/deckcensus.ts && grep -q 'engineSkips' tools/cubelab/deckcensus.ts && echo 1 > var/lab-j171-local/has-d482.txt || echo 0 > var/lab-j171-local/has-d482.txt
ls docs/decisions/D483-*.md >/dev/null 2>&1 && grep -q 'public static String playIdentity' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'identities' bridge/src/mtgtable/ai/Atlas.java && grep -q 'export function playCount' tools/cubelab/atlascuts.ts && grep -q 'export function repeatedPlays' tools/cubelab/atlascuts.ts && echo 1 > var/lab-j171-local/has-d483.txt || echo 0 > var/lab-j171-local/has-d483.txt
ls docs/decisions/D484-*.md >/dev/null 2>&1 && grep -q 'ChooseSource' docs/decisions/D484-*.md && grep -rq 'chooseSourceGuard' bridge/src/mtgtable/ai tools/cubelab && echo 1 > var/lab-j171-local/has-d484.txt || echo 0 > var/lab-j171-local/has-d484.txt
ls docs/decisions/D485-*.md >/dev/null 2>&1 && grep -q 'STALE_TARGETS' docs/decisions/D485-*.md && grep -q 'retargeted' tools/cubelab/atlas.ts && grep -q 'retargeted' bridge/src/mtgtable/ai/Atlas.java && grep -q 'STALE_TARGETS' bridge/src/mtgtable/ai/Explorer.java && grep -q 'staleRefused' tools/check-redaction.mjs && test -f fixtures/negative/redaction/stale-token-died-earlier.jsonl && grep -q 'D485' docs/decisions/D481-*.md && echo 1 > var/lab-j171-local/has-d485.txt || echo 0 > var/lab-j171-local/has-d485.txt
# D486 (the names this file reads: guardrails cardTargetOffered and modesDrawn in the checker's GUARDRAIL_NAMES and the seat, modesDrawn on the branch
# row, why MODES_DRAWN, the record source "modes", the cast-time hook, protocol M75; the owner corrects them if the merge renamed any)
ls docs/decisions/D486-*.md >/dev/null 2>&1 && grep -q 'MODES_DRAWN' docs/decisions/D486-*.md && grep -q 'cardTargetOffered' bridge/src/mtgtable/ai/Explorer.java && grep -q 'MODES_DRAWN' bridge/src/mtgtable/ai/Explorer.java && grep -q 'modesAtCast' bridge/src/mtgtable/ai/PolicyControllerAi.java && grep -q 'modesDrawn' bridge/src/mtgtable/ai/Atlas.java && grep -q 'modesDrawn' tools/cubelab/atlas.ts && grep -q "'cardTargetOffered', 'modesDrawn'" tools/check-redaction.mjs && grep -q "'confirm', 'modes'" tools/check-redaction.mjs && grep -q '^| M75 |' docs/protocol.md && echo 1 > var/lab-j171-local/has-d486.txt || echo 0 > var/lab-j171-local/has-d486.txt
# D481-D486 by decision id: the commit that added each decision's file is an ancestor of the pin (whatever sha the merge gave it)
anc=1
for x in D481 D482 D483 D484 D485 D486; do
  f=$(git ls-tree -r --name-only HEAD docs/decisions/ | grep "^docs/decisions/$x-" | head -n 1 || true)
  c=""
  if [ -n "$f" ]; then c=$(git log --diff-filter=A --format=%H -n 1 HEAD -- "$f" || true); fi
  if [ -z "$c" ] || ! git merge-base --is-ancestor "$c" HEAD; then anc=0; fi
  echo "J171: $x: ${f:-no decision file} added by ${c:-no commit}"
done
echo $anc > var/lab-j171-local/has-d481-d486-commits.txt
# THE SEAT-IDENTITY GOLDEN (why J171 exists: J170's pilot failed on `identity == 1` alone, at 24038bcd, where
# fixtures/cubelab/seat-identity.json was still D451's, last changed at b4ea60a0, and D486 had changed the forge, search and explore games on
# purpose). On this pin it must carry D486's regeneration; three parts, each a check, all recorded in golden.json:
#   descends     the last commit that changed the fixture descends from the commit that added D486's decision file (written on D486's tree)
#   changed      the fixture differs from its text at that commit
#   note         a decision file under docs/decisions/ names both D486 and seat-identity (the regeneration's record)
#   digestsJ170  information only: the golden's forge, search and explore digests are the ones J170's pilot played at 24038bcd
#                (78f3a94998355ea8, c68c2a849b7b0d54, 82d6d18c57bbd861); a pin that also changes the seats' code moves them
# `identity == 1` below stays the real check: the four games played at the pin against the golden.
f486=$(git ls-tree -r --name-only HEAD docs/decisions/ | grep '^docs/decisions/D486-' | head -n 1 || true)
c486=""
if [ -n "$f486" ]; then c486=$(git log --diff-filter=A --format=%H -n 1 HEAD -- "$f486" || true); fi
cg=$(git log --format=%H -n 1 HEAD -- fixtures/cubelab/seat-identity.json || true)
g1=0
if [ -n "$c486" ] && [ -n "$cg" ] && git merge-base --is-ancestor "$c486" "$cg"; then g1=1; fi
g2=0
if [ -n "$c486" ] && ! git diff --quiet "$c486" HEAD -- fixtures/cubelab/seat-identity.json; then g2=1; fi
python3 -I -c "import glob, json, sys; t = [open(f).read() for f in sorted(glob.glob('docs/decisions/*.md'))]; r = json.load(open('fixtures/cubelab/seat-identity.json')).get('results') or {}; dg = {k: (r.get(k) or {}).get('digest') for k in ('forge', 'search', 'explore')}; print(json.dumps({'descends': int(sys.argv[1]), 'changed': int(sys.argv[2]), 'note': 1 if any('seat-identity' in x and 'D486' in x for x in t) else 0, 'digestsJ170': 1 if dg == {'forge': '78f3a94998355ea8', 'search': 'c68c2a849b7b0d54', 'explore': '82d6d18c57bbd861'} else 0}))" $g1 $g2 > var/lab-j171-local/golden.json || echo '{"descends":-1}' > var/lab-j171-local/golden.json
echo "J171: seat-identity golden: fixture last changed by ${cg:-no commit}, D486's file added by ${c486:-no commit}: $(cat var/lab-j171-local/golden.json)"
test -z "${CUBELAB_WORKER_XMX:-}" && echo 1 > var/lab-j171-local/xmx-unset.txt || echo 0 > var/lab-j171-local/xmx-unset.txt
env -u LAB_DATA_DIR node --test web/test/cubelab-atlas.test.ts web/test/cubelab-atlas-cuts.test.ts web/test/cubelab-atlas-resume.test.ts web/test/cubelab-atlas-redaction.test.ts web/test/cubelab-record.test.ts web/test/cubelab-watchdog.test.ts web/test/cubelab-deck-census.test.ts && echo 1 > var/lab-j171-local/nodetests.txt || echo 0 > var/lab-j171-local/nodetests.txt
node tools/check-redaction-selftest.mjs && echo 1 > var/lab-j171-local/redaction-self.txt || echo 0 > var/lab-j171-local/redaction-self.txt
cat > var/lab-j171-local/bin/drawsha.py <<'PY'
# J171: J170's drawsha.py, unchanged.
# J170: J169's drawsha.py, unchanged.
# J169 (J168's, J167's, J166's): the sha256 of a set of deck draws, in the order named: each folder's decks.jsonl, then its decks/*.dck by name.
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
cat > var/lab-j171-local/bin/draws.py <<'PY'
# J171: J170's draws.py with J171's paths (the redraw in var/lab-j171-local/redraw/). lab-j170 already holds J170's pilot's draws, which
# J171's pilot keeps (it draws only a folder whose decks.jsonl is absent) and this script checks against the same registered values. J170's:
# J170: the deck draws, made by J170's pilot into the NEW data folder lab-j170 (D447 with D482's list, at the pin) and again into
# the clone (var/lab-j171-local/redraw/, J167's redraw), each checked against the sha256s registered here, from files only (no engine).
# The values: J166's to J169's draws as they lie in lab-j166 (the twelve D482 leaves alone, s04's D482 draw, the smoke's pair and the
# validation draw: J167's and J169's registered values; all 13 in order, each spine's draw and each of its two decks: computed
# 2026-10-25 by this draft from lab-j166, read only). The deck code is unchanged since J167's pin (bf978690..the D486 branch touch no
# file of the draw: tools/cubelab/deckcensus.ts, engine-unplayable.json, cubes/library/), so the pin must give them byte for byte.
#   draws.py            one JSON object of 0/1 numbers (the pilot's `draws` metric reads it from draws.json)
#   draws.py --report   the sha256s as run (report/draws.json)
# Writes nothing.
import glob, hashlib, json, os, sys
D = '/home/justin-a/code/lab/data/lab-j170'
R = 'var/lab-j171-local/redraw'
BANDS = ['pauper', 'peasant', 'legacy', 'powered'] * 3 + ['pauper']
SP = ['s%02d-%s-%d' % (k, BANDS[k - 1], 2000 + k) for k in range(1, 14)]
VA = ['v%02d-%s-%d' % (k, BANDS[k - 1], 2200 + k) for k in range(1, 14)]
TWELVE = [x for x in SP if not x.startswith('s04-')]
REG_TWELVE = 'e27796b73073bab5e172c2225047cecfe8424ee5ceeb4d839d44484d9da07419 24'
REG_S04 = '81c4dd22dcdbd1a110b0339476cbab04e8f6d2791f1881e42499b97f8675dc00 2'
REG_ALL13 = 'faee7df31b55ffd0079f8deaf5280e8d2416f93493d13fc4cb2999a99f45ff6b 26'
REG_SMOKE = 'edfdc861736fb049bc1080d525269064c6776ecabd47de496463fa3dc684c931 2'
REG_VALIDATION = '7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de 26'
# each spine's draw (drawsha of its folder) and its two decks' sha256s (deck 1, deck 2): s04's deck 1 is D482's
DECKS = {
    's01-pauper-2001': ('a40fb5addec594bd6e97b0e7b16d78af1f08280dcc555366b3a2301feda4ff34', 'b734b44f5657a34d42179d3d634f2bcedbfb8896057a576270dd387939f12eee', '43565999f47b1ce5757f69c93e47a3fd3559db6e78b4a7c7e6f837603bbdf87f'),
    's02-peasant-2002': ('86ccaaf3b3ba6f5959aacf073a9dc0465aadf1a9d02ddac8eac695091eaea576', '3519db7d8a57ce08e1cf0094568d28b5011735a83f4025356204b60219c0ca88', '7196dc7b7545dd532c7f796938549dc53193adbf9fa8d199a49259bfe90bb467'),
    's03-legacy-2003': ('0e9d8c744abd6eff72d2fc1cca4003c7cecfdb85830c077d8c29e16891bfacc1', '56e4c68f74512c2e979fe195aad045e78600146520783bb0c2dfc83300525ea8', '67bd6d92c06d63c682d76cff88aca6fff78817663abb432b2c898dd0ea51ff8f'),
    's04-powered-2004': ('81c4dd22dcdbd1a110b0339476cbab04e8f6d2791f1881e42499b97f8675dc00', '873bb7e41c40f2ad4a40fbd8e3abf7185820fa93b1e90c40d2abff5907e3f003', 'f4f21079d66515481315687b3d369fd2a41d5dcac26a540b843552cee09b36d1'),
    's05-pauper-2005': ('afc7ce320e966d96e5c92ec9d28c357e6f603c59927f677549ce261227b1b92e', 'd2c9c9c0d7a4823bb02de196f7ca13d7fb9f2d3c9c2cdd105d4a8f3932bce72f', '37828917f92483f367b656d071ea09a72836b7cc7242d1db9556e926f23b28b3'),
    's06-peasant-2006': ('191a5d8aac5d516f5472f0a01a0cacf660a9fa931e70b806a42723e4dfba161f', 'f0b8532d0e13788503f751dc239f4f02e459239aa745f73b4178dfdc880d5c2f', 'b90d1ae102f4b9b7a8dfbbfbbd4080bfbb026b962eb0db1c7a40a6a4b35d1072'),
    's07-legacy-2007': ('5287d2666529b6dd35ec4a271a1b71c5b01d8096bcf1c3acd114945c7a435636', '8e72218462697f717590ba1e1ce17bdbc16418709c6658e3e89c9d39370fb01b', '357bebd01ee8c9bf4ba853ff9a9960ae7a64d8a83ce760bb23a3b506992445ee'),
    's08-powered-2008': ('d653b4cf2bf2d94649449caaf174d21453cd34b58972c3e22ea8e26dacf75f71', '6c664df890ade41bed55feb2841826c6212b289a501cac8e0caf1755209f70c8', '0eafaf9796cbf83792c257a29532d6d07fef807f629737209c8875a5b3eb8b8f'),
    's09-pauper-2009': ('1216932fb9807608a5bf859ac768e12efa40c031fc685f16b56b274a2bbf7601', 'da1c0de93863a59de35390647adce822a81cbfbc86cfdec9fbaacd7fabf3dd4b', '332d6216ea0ae96dbbef39544174aa3f17fe9521a49cca2c43c0d63f308524bd'),
    's10-peasant-2010': ('e4676bda05d0204f3ce43e3f8d1ee1a0ca0c8e24c7f8cf09860423d00ddedd9b', 'd051adba41580377b7b1f627bc62f40ae25b5bac182c37f8bd7ec877bba6ce59', '3ee08305330298d022189e0404dc8e0d0c874acb6e0a61ffea3ecb71ddb48b1d'),
    's11-legacy-2011': ('4ca069ba7bdae91d218e589a41c28da836c7544da53577d14c5994aa64ca8642', 'bc53db533642c7a538d93f53cf11951d98e1c36803425c3dcc84d6850860b749', '6a4856eac6d82235f865bb6c30d8eb2a1b0ff0cf9c92f5c1acc615c598368cf6'),
    's12-powered-2012': ('5d49d21add4ba8cc269babde10dc63c7b7885e94b1df7437d217e02bd2db820d', '54799f7d33dc4ddcd584bca5792d20a260ebca303cb5fcb3a1153d65fdfb3734', '03ac3948646b52acab0485f6dcaa9cb471519060c04fb90d20925351ba461815'),
    's13-pauper-2013': ('6f20b45b168bf6ba0e365bf27e507e31c431eb76c6f389336cfc8db3e3752591', '222547d0e174b42e63e2c711c8ee11167b273b7015818d00079d720178927969', 'cbaec2c6669cb188abd6334743ccc76455b201bbb4c538d2155ced378c4d6f88'),
}


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


def decks_ok(root, x):
    band, seed = x.split('-')[1], x.split('-')[2]
    want = DECKS[x]
    got = (safe(lambda: drawsha([root + '/' + x]).split()[0]), safe(lambda: fsha('%s/%s/decks/%s-%s-00001.dck' % (root, x, band, seed))),
           safe(lambda: fsha('%s/%s/decks/%s-%s-00002.dck' % (root, x, band, seed))))
    return got == want


if '--report' in sys.argv[1:]:
    print(json.dumps({'note': 'J171 deck draws: D447 with D482\'s engine-unplayable list, drawn into lab-j170 by J170\'s pilot at 24038bcd (kept by J171\'s pilot, which draws only an absent folder) and again into the clone by J171\'s pilot at its pin; drawsha = each folder\'s decks.jsonl, then its .dck files by name',
                      'spinesAsRun': safe(lambda: drawsha([D + '/decks/' + x for x in SP])), 'all13Registered': REG_ALL13,
                      'twelve': safe(lambda: drawsha([D + '/decks/' + x for x in TWELVE])), 'twelveRegistered': REG_TWELVE,
                      's04': safe(lambda: drawsha([D + '/decks/s04-powered-2004'])), 's04Registered': REG_S04,
                      'bySpine': {x: {'draw': safe(lambda x=x: drawsha([D + '/decks/' + x])), 'registered': DECKS[x][0], 'decksOk': decks_ok(D + '/decks', x)} for x in SP},
                      'smoke': safe(lambda: drawsha([D + '/decks/p-powered-2099'])), 'smokeRegistered': REG_SMOKE,
                      'validation': safe(lambda: drawsha([D + '/validation/' + x for x in VA])), 'validationRegistered': REG_VALIDATION,
                      'redrawSpines': safe(lambda: drawsha([R + '/' + x for x in SP])), 'redrawValidation': safe(lambda: drawsha([R + '/' + x for x in VA]))}, indent=1))
    sys.exit(0)
out = {}
out['data12'] = 1 if safe(lambda: drawsha([D + '/decks/' + x for x in TWELVE])) == REG_TWELVE else 0
out['s04Data'] = 1 if safe(lambda: drawsha([D + '/decks/s04-powered-2004'])) == REG_S04 else 0
out['s04Deck1'] = 1 if safe(lambda: fsha(D + '/decks/s04-powered-2004/decks/powered-2004-00001.dck')) == DECKS['s04-powered-2004'][1] else 0
out['all13'] = 1 if safe(lambda: drawsha([D + '/decks/' + x for x in SP])) == REG_ALL13 else 0
out['decks13'] = sum(1 for x in SP if decks_ok(D + '/decks', x))
out['smokeData'] = 1 if safe(lambda: drawsha([D + '/decks/p-powered-2099'])) == REG_SMOKE else 0
out['validationData'] = 1 if safe(lambda: drawsha([D + '/validation/' + x for x in VA])) == REG_VALIDATION else 0
out['redraw13'] = 1 if safe(lambda: drawsha([R + '/' + x for x in SP])) == REG_ALL13 else 0
out['redrawDecks13'] = sum(1 for x in SP if decks_ok(R, x))
out['smokeRedraw'] = 1 if safe(lambda: drawsha([R + '/p-powered-2099'])) == REG_SMOKE else 0
out['validationRedraw'] = 1 if safe(lambda: drawsha([R + '/' + x for x in VA])) == REG_VALIDATION else 0
print(json.dumps(out))
PY
cat > var/lab-j171-local/bin/labels.py <<'PY'
# J171 (drafts/J171-atlas-4b-card-targets.md): J170's labels.py, unchanged: the contract v4 as J170 registered it (CONTRACT keeps its name).
# J170 (drafts/J170-atlas-4b-card-targets.md): J169's labels.py (v3) with the rung-4b contract v4, registered before any J170 data.
# v4 is a NEW POPULATION (D486: the random seat targets cards and draws a modal spell's modes): its rows are never pooled with v1-v3's.
# What v4 changes (every v3 field kept): `v` 4, `contract` v4's; `randomSeat` is --seat= (default "D486"; the pilot's self-tests on
# J168's folders pass --seat=pre-D485), the same on every spine; the pool is as named on the command line (J170: `random-<band>-d486`);
# each row adds `modesDrawn` and `retargeted` (the sums over the decision's branch rows, both maps: D486's and D485's counters on
# BranchRow, written when > 0) and `modesDrawnBranches` (its branch rows with modesDrawn > 0); `byRandomSeat` counts whatever seats
# the rows carry; the sizing reads add `confidentPer7Poisson95` (the exact Poisson 95% interval of the confident count, Garwood's,
# scaled as the point is: J168's 27 confident gave 31.1 [20.5, 45.2]); the expectation names J168's numbers as ANOTHER population.
# --biased= and --lost= are J169's (J170 passes no --biased=: nothing is marked; `c_sizingReadUnbiased` is then the as-run read).
# J169 (drafts/J169-atlas-4a-night-four.md): J168's labels.py (J167's, v2) with the rung-4a contract v3, registered before any J169 data.
# What v3 adds (nothing of v2 changes): `randomSeat` ("D485" on the spines named by --d485=, else "pre-D485"); `biased` ("lost-cast"
# on the spines named by --biased=, else null); and, from metrics.py --scan's caches (--lost=DIR, one <folder>.json a spine), each
# row's `lostCastOptions` (the options whose OWN forced cast was lost in more than half of their branches, either map),
# `lostCastVoid` (option 0, Forge's own answer, is one of them: the regret measures throwing the card away) and
# `lostCastBranches` (branch games of the decision with any lost cast); out: `biasedRows`, `lostCastVoid`/`lostCastVoidList`,
# `lostCastOptionRows`, `byRandomSeat`, and `c_sizingReadUnbiased` (the sizing read over the spines not named by --biased=).
# A row of a spine with no cache carries null in the three lost-cast fields. J168's header (J167's) follows.
# J167's label set (drafts/J167-atlas-4a-night-two.md): J166's labels.py with the rung-4a contract v2, registered before any J167
# data. What changed from J166's: (1) each spine names its own sha (s01-s03 were branched at 325c2dd8, s04-s13 at the pin); (2) each
# row says which listing its decision was branched over (`listing`: "D483" when the baseline listing carries `identities`, else
# "pre-D483"), with `playCount` (distinct play identities; the token count on a pre-D483 listing), `tokenTwice` (the listing names
# one token twice) and each option's `identity` (null on a pre-D483 listing); (3) `byListing` counts labels and confident labels
# by listing; (4) the sizing read's expectation is J166's measured s01-s03. Everything else is J166's, unchanged.
# From spine folders named on the command line as NAME:POOL:DECKSEED:GAMESEED:SHA:DIR (DIR holds plan.json, atlas.json, phaseB/).
#   --out=FILE       write labels.jsonl there (one row per branched decision: complete, screened or neither)
#   --times=FILE     spine-times.txt ("<folder> <start epoch s> <end epoch s> <workers>", one line a run of a spine's block)
#   --training=1     mark every row `training: true` (the 4a night); anything else writes `training: false`
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
CONTRACT = 'mtg-table rung-4b label v4 (J170)'
args, opt = [], {}
for a in sys.argv[1:]:
    if a.startswith('--'):
        k, _, v = a[2:].partition('=')
        opt[k] = v
    else:
        args.append(a)
TRAINING = opt.get('training') == '1'
SEAT = opt.get('seat') or 'D486'
BIASED = set(x for x in opt.get('biased', '').split(',') if x)


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
    """v4: per decision, the sums of D486's `modesDrawn` and D485's `retargeted` over its branch rows (both maps), and its rows with modesDrawn"""
    rc = {}
    if os.path.exists(branches_file):
        for line in open(branches_file):
            try:
                r = json.loads(line)
            except ValueError:
                continue
            e = rc.setdefault(r['d'], {'modesDrawn': 0, 'retargeted': 0, 'modesDrawnBranches': 0})
            for k in ('modesDrawn', 'retargeted'):
                v = r.get(k)
                if isinstance(v, (int, float)) and v > 0:
                    e[k] += v
                    e['modesDrawnBranches'] += 1 if k == 'modesDrawn' else 0
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
    meta[name] = {'pool': pool, 'deckSeed': int(dseed), 'gameSeed': int(gseed), 'sha': sha, 'listing': spine_listing, 'folder': os.path.basename(spine), 'forgeMap': fm,
                  'deckA': plan['deckA'], 'deckB': plan['deckB'],
                  'baseline': {'turns': (pb.get('baseline') or {}).get('turns'), 'winner': (pb.get('baseline') or {}).get('winner'),
                               'listed': (pb.get('baseline') or {}).get('decisionsListed')},
                  'branchedInFull': sch.get('branchedInFull'), 'screened': len(sch.get('screened') or []), 'fill': sch.get('fill'),
                  'stoppedOptions': sch.get('stoppedOptions'), 'meanOptions': sch.get('meanOptions'),
                  'randomSeat': SEAT, 'biased': 'lost-cast' if name in BIASED else None,
                  'lostScanned': lc is not None, 'lostCasts': lc.get('lostCasts') if lc else None, 'lostCastBranches': lc.get('lostCastBranches') if lc else None}
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
            'v': 4, 'contract': CONTRACT, 'spine': name, 'pool': pool, 'training': TRAINING, 'split': 'train' if TRAINING else None,
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
            'confident': comp and x['random']['regretLo'] is not None and x['random']['regretLo'] > 0,
            'confidentForge': (comp and x['forge']['regretLo'] is not None and x['forge']['regretLo'] > 0) if fm else None,
            'complete': comp, 'screened': bool(x.get('screened')), 'screenMean': x.get('screenMean'),
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
        if lc is not None:
            bo = lc.get('byOption') or {}
            lab['lostCastOptions'] = sorted({o['o'] for o in x['options'] for c in ('random', 'forge')
                                             if (bo.get('d%d/%s/o%d' % (d, c, o['o'])) or {}).get('forcedLostBranches', 0) * 2 > (bo.get('d%d/%s/o%d' % (d, c, o['o'])) or {}).get('branches', 0) > 0})
            lab['lostCastVoid'] = 0 in lab['lostCastOptions']
            lab['lostCastBranches'] = sum((bo.get('d%d/%s/o%d' % (d, c, o['o'])) or {}).get('lostBranches', 0) for o in x['options'] for c in ('random', 'forge'))
        else:
            lab['lostCastOptions'], lab['lostCastVoid'], lab['lostCastBranches'] = None, None, None
        lab.update(rc_all.get(d, {'modesDrawn': 0, 'retargeted': 0, 'modesDrawnBranches': 0}))
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
       'trainingRows': sum(1 for x in labels if x['training'] is True)}
out['byListing'] = {L: {'spines': sorted({x['spine'] for x in labels if x['listing'] == L}), 'rows': sum(1 for x in labels if x['listing'] == L),
                        'labels': sum(1 for x in labels if x['listing'] == L and x['complete']), 'confident': sum(1 for x in labels if x['listing'] == L and x['confident']),
                        'tokenTwice': sum(1 for x in labels if x['listing'] == L and x['tokenTwice'])} for L in ('pre-D483', 'D483')}
out['biasedRows'] = sum(1 for x in labels if x['biased'])
out['lostCastVoid'] = sum(1 for x in labels if x['lostCastVoid'])
out['lostCastVoidList'] = ['%s d%d %s' % (x['spine'], x['d'], x['forgeToken']) for x in labels if x['lostCastVoid']]
out['lostCastOptionRows'] = ['%s d%d o%s' % (x['spine'], x['d'], ','.join(str(o) for o in x['lostCastOptions'])) for x in labels if x['lostCastOptions']]
out['byRandomSeat'] = {S: {'spines': sorted({x['spine'] for x in labels if x['randomSeat'] == S}), 'rows': sum(1 for x in labels if x['randomSeat'] == S),
                           'labels': sum(1 for x in labels if x['randomSeat'] == S and x['complete']), 'confident': sum(1 for x in labels if x['randomSeat'] == S and x['confident'])}
                       for S in sorted({x['randomSeat'] for x in labels})}
out['bySpine'] = {}
for name, m in meta.items():
    xs = [x for x in labels if x['spine'] == name]
    cs = [x for x in xs if x['complete']]
    out['bySpine'][name] = dict(m, rows=len(xs), labels=len(cs), screenedRows=sum(1 for x in xs if x['screened']),
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
    s = {'wallSec': 0, 'spinesTimed': 0, 'labels': 0, 'confident': 0, 'wallSecAt7': 0.0}
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
    h, h7 = s['wallSec'] / 3600, s['wallSecAt7'] / 3600
    ok7 = h7 == h7 and h7 > 0
    s['wallSecAt7'] = round(s['wallSecAt7']) if ok7 else None
    s['labelsPer10hNight'] = round(10 * s['labels'] / h) if h else None
    s['confidentPer10hNight'] = round(10 * s['confident'] / h) if h else None
    s['labelsPer7Worker10hNight'] = round(10 * s['labels'] / h7) if ok7 else None
    s['confidentPer7Worker10hNight'] = round(10 * s['confident'] / h7, 1) if ok7 else None
    lo, hi = poisson95(s['confident'])
    s['confidentPer7Poisson95'] = [round(10 * lo / h7, 1), round(10 * hi / h7, 1)] if ok7 else None
    return s


out['c_sizing7'] = {'bySpine': {n: size([n]) for n in meta}, 'byPool': {p: size(sorted(ss)) for p, ss in tree.items()}, 'asRun': size(list(meta))}
out['c_sizingRead'] = {'confidentPer7Worker10hNight': out['c_sizing7']['asRun']['confidentPer7Worker10hNight'],
                       'confident': out['c_sizing7']['asRun']['confident'], 'labelsPer7Worker10hNight': out['c_sizing7']['asRun']['labelsPer7Worker10hNight'],
                       'poisson95': out['c_sizing7']['asRun']['confidentPer7Poisson95'],
                       'expectation': 'ANOTHER POPULATION (before D486), as information, never pooled: J168 all 13 as run, 112 labels and 31.1 [20.5, 45.2] confident labels per 7-worker 10-h night (27 confident); the atlas review, section 5: ~25-27 (cube pairs); no verdict'}
unb = [n for n in meta if n not in BIASED]
out['c_sizingReadUnbiased'] = dict(size(unb), spines=sorted(unb), left=sorted(n for n in meta if n in BIASED),
                                   note='the sizing read over the spines not marked biased (--biased=); J171 marks none, so it is the as-run read')
out['d486Rows'] = {'modesDrawn': sum(x['modesDrawn'] for x in labels), 'modesDrawnBranches': sum(x['modesDrawnBranches'] for x in labels),
                   'retargeted': sum(x['retargeted'] for x in labels), 'rowsWithModesDrawn': sum(1 for x in labels if x['modesDrawn'] > 0)}
# the void count (0 expected since D470), any non-block decision that played one game under every option
out['voidLabels'] = sum(1 for x in labels if x['void'])
out['voidList'] = ['%s d%d %s' % (x['spine'], x['d'], x['forgeToken']) for x in labels if x['void']]
out['sameGameNotBlock'] = ['%s d%d' % (x['spine'], x['d']) for x, same in same_any if same and x['kind'] != 'b' and x['complete']]
print(json.dumps(out, indent=1))
PY
cat > var/lab-j171-local/bin/reads.py <<'PY'
# J171: J170's reads.py, unchanged.
# J170: J169's reads.py, unchanged.
# J169's reads: J168's, unchanged; J167's (drafts/J167-atlas-4a-night-two.md), which are J166's reads.py, unchanged (J162's, J156's definitions, made per spine),
# registered before any J166 data. From atlas.json files named on the command line as NAME:POOL:PATH. Standard library only; no engine.
# A spine is a pair of its own (random decks of one band; the pool is the band, `random-<band>`); `complete` and `decided` are
# atlas.json's (D480), with J158's definitions as the fallback for an atlas written before it; the agreement reads (i)-(iii) and the
# registered (iv) are made on the spines WITH a Forge map only (D480 point 5); C1's random-map statistic on a spine without one is
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
cat > var/lab-j171-local/bin/cuts.py <<'PY'
# J171: J170's cuts.py, unchanged. J170's header:
# J170: J169's cuts.py with one addition, registered before any J170 data: the night's `wallSec` (the spines' walls in spine-times.txt)
# and `checksShare` (the checks' wall over it; J168: 0.50 h, 4.9%). lab-j170 holds no atlas.j166/j168 copy, so every spine's timing is
# its own atlas.json's. J169's header:
# J169: J168's cuts.py with one change, registered before any J169 data: a spine re-checked by J169 (s13) reads phase B's timing
# from its `atlas.j168.json` copy, as J167's s02 and s03 read theirs from `atlas.j166.json` (the first of the two that exists).
# J168 (J167's cuts.py, unchanged): what the cut design (D480) saved, per spine and for the night: J166's cuts.py, with two changes registered before any J167
# data: (1) a spine whose atlas.json was rewritten by a re-check (s02, s03) reads phase B's timing from its `atlas.j166.json` copy,
# the run that played phase B (a re-check's own timing says 0 units, 0 ms); (2) --recheck-times=FILE (recheck-times.txt) gives each
# re-check's wall apart (`recheckSec`), never added to the spine's checks. Spine folders named on the command line.
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
import json, os, sys

J162_SERIAL_S_PER_KGAMES = 93
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
                                'unitMs': 0, 'heldMs': 0, 'screened': 0, 'stoppedOptions': 0, 'spines': 0, 'recheckSec': 0, 'wallSec': 0}
for spine in args:
    name = os.path.basename(os.path.abspath(spine))
    try:
        doc = json.load(open(os.path.join(spine, 'atlas.json')))
    except (OSError, ValueError):
        continue
    tfile = next((os.path.join(spine, x) for x in ('atlas.j166.json', 'atlas.j168.json') if os.path.exists(os.path.join(spine, x))), os.path.join(spine, 'atlas.j166.json'))
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
    s = {'forgeMap': fm, 'timingFrom': os.path.basename(tfile) if tdoc is not doc else 'atlas.json', 'branchGames': len(rows), 'branchMs': bms,
         'earlyStopAvoidedMs': round(es), 'screenAvoidedMs': round(sc), 'projectedMs': round(proj),
         'savedShare': round((proj - bms) / proj, 4) if proj else None, 'earlyStopShare': round(es / proj, 4) if proj else None,
         'screenShare': round(sc / proj, 4) if proj else None, 'screened': len(sch.get('screened') or []), 'stoppedOptions': sch.get('stoppedOptions', 0),
         'phaseBWallSec': round((tb.get('ms') or 0) / 1000), 'workers': tb.get('workers'), 'unitSec': round(sum(units) / 1000),
         'idleShare': round(1 - sum(units) / held, 4) if held else None, 'checksSec': round(chk), 'redactionSec': round(((doc.get('checks') or {}).get('redactionMs') or 0) / 1000),
         'checksSecPerKGames': round(1000 * chk / len(rows), 1) if rows else None, 'j162SerialSecPerKGames': J162_SERIAL_S_PER_KGAMES,
         'recheckSec': rewall.get(name)}
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
p = night['projectedMs']
out['night'] = {'spines': night['spines'], 'branchGames': night['branchGames'], 'branchHours': round(night['branchMs'] / 3.6e6, 2), 'projectedHours': round(p / 3.6e6, 2),
                'savedShare': round((p - night['branchMs']) / p, 4) if p else None, 'earlyStopShare': round(night['earlyStopAvoidedMs'] / p, 4) if p else None,
                'screenShare': round(night['screenAvoidedMs'] / p, 4) if p else None, 'screened': night['screened'], 'stoppedOptions': night['stoppedOptions'],
                'idleShare': round(1 - night['unitMs'] / night['heldMs'], 4) if night['heldMs'] else None, 'checksHours': round(night['checksSec'] / 3600, 2),
                'wallSec': night['wallSec'], 'checksShare': round(night['checksSec'] / night['wallSec'], 4) if night['wallSec'] else None,
                'checksSecPerKGames': round(1000 * night['checksSec'] / night['branchGames'], 1) if night['branchGames'] else None,
                'checksHoursAtJ162Serial': round(night['branchGames'] * J162_SERIAL_S_PER_KGAMES / 1000 / 3600, 2), 'recheckSec': night['recheckSec'],
                'reviewExpectation': 'cuts save 18-20% of branch time (atlas review 3b+3d; D480 replay 20.3%); J166 s01-s03 measured 7.7%'}
print(json.dumps(out, indent=1))
PY
cat > var/lab-j171-local/bin/metrics.py <<'PY'
# J171's metrics (drafts/J171-atlas-4b-card-targets.md): J170's metrics.py with J171's paths (var/lab-j171-local) and compare-j168.json's
# column for this job named 'j171'; the data folder is still lab-j170, where J171 branches all 13 spines (J170 branched none). J170's header:
# J170's metrics (drafts/J170-atlas-4b-card-targets.md): J169's metrics.py for a NEW data folder, lab-j170, where all 13 spines are
# J170's, branched fresh at the pin by D486's random seat; registered before any J170 data. What changed from J169's:
# (1) J166-J169's asides, re-checks and subsets are gone (lab-j170 holds none): every spine must list D483's identities, and every
#     spine is D486's; s04's plan must name D482's deck 1 by its registered sha256; the pre-D483 `kChanged` read is dropped.
# (2) THE SCAN (--scan) reads D486's counters (protocol M75) from the same frame logs, beside J169's lost casts: from each log's
#     `decisions` summary, the explore block's `decisionsRandomised`, `byKind.priority` (the randomised PRIORITY LISTINGS) and every
#     guardrail count (`cardTargetOffered`, `modesDrawn`, `retargeted`, `staleRefused` among them); from its decision records,
#     `why: "MODES_DRAWN"`, `source: "modes"`, D485's `why: "STALE_TARGETS"`, and every `target` record -- whether it lists a card
#     (a `target:<id>` option, not `target:p<id>`) and whether it is complete (no `complete: false`; M55 writes the key only when
#     false); and the NAME of each lost card, read from the caster's own state frames (its hand shows it).
#     `cardTargetShare` = cardTargetOffered / randomised priority listings (D486's s05 reproduction: 1,539 of 12,958, 11.9%).
# (3) The branch rows' `modesDrawn` (D486, `BranchRow.modesDrawn`, written when > 0), beside `retargeted` (D485) and
#     `chooseSourceGuard` (D484). If D486's merge renamed any name read here, the owner corrects it before posting.
# J169's definitions, unchanged: THE LOST CASTS, from the frames (never the worker logs, which undercount: J168's s05 logged 453 lines
# for 991 lost Suplex casts).
#   metrics.py --scan FOLDER CACHE_DIR [JOBS]  scans FOLDER's phase B branch frame logs and writes CACHE_DIR/<folder>.json, stamped
#                                              with FOLDER's atlas.json mtime (a cache of another atlas.json is never read)
#   A LOST CAST (J168's read, report/bin/strand.py, made generic over every card): in the seat log of the card's own caster, a zone
#   event {hand, that seat} -> {stack, null} after which no state frame lists the card in `stackCards`, no zone event moves it off
#   the stack and no `cast` event names it (no stack instance: the card and its mana are gone; D485's and D486's Context). FORCED:
#   the lost card is the branch's own option (`cast:<id>`) and is lost before the branch's first AI decision record. A LOST-CAST
#   OPTION: an option (decision, map, option) whose forced cast was lost in more than half of its branch rows.
#   metrics.py [DATA_DIR] [SPINE_GLOB]   default /home/justin-a/code/lab/data/lab-j170 and b-s??-*-21?? (never the pilot folders);
#                                        the pilot's self-tests pass J162's folder with b-* and J168's four with b-s0[5789]-*-210?
# Standard library only; no engine.
import glob, gzip, hashlib, json, math, os, re, sys
NAME = re.compile(r'd(\d+)-(random|forge)-o(\d+)-b(\d+)-seat(\d)\.jsonl\.gz$')
CAST_RE = re.compile(r'"kind":"zone","cardId":(\d+),"from":\{"zone":"hand","player":(\d+)\},"to":\{"zone":"stack","player":null\}')
LIVE_RE = re.compile(r'"kind":"zone","cardId":(\d+),"from":\{"zone":"stack"|"kind":"cast","stackId":-?\d+,"cardId":(\d+)')
SCAN_COUNTS = ('casts', 'lost', 'forced', 'stale', 'modesWhy', 'modesSource', 'targetRecords', 'targetRecordsCard', 'targetRecordsComplete',
               'targetRecordsCardComplete', 'randomised', 'randomisedPriority', 'summaries')


def scan_log(path):
    """one branch frame log: its casts from the viewer's own hand, the lost ones (with their names), the forced lost ones, D485's
    and D486's records, and its decisions summary's explore counts"""
    m = NAME.search(path)
    d, c, o, i, seat = int(m.group(1)), m.group(2), int(m.group(3)), int(m.group(4)), int(m.group(5))
    casts, live, first_dec, tok = [], {}, None, None
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
                            card = any(isinstance(t, str) and t.startswith('target:') and not t.startswith('target:p') for t in b.get('options') or [])
                            whole = b.get('complete') is not False
                            n['targetRecords'] += 1
                            n['targetRecordsCard'] += 1 if card else 0
                            n['targetRecordsComplete'] += 1 if whole else 0
                            n['targetRecordsCardComplete'] += 1 if card and whole else 0
                continue
            if '"type":"state"' not in l:
                continue
            for mm in CAST_RE.finditer(l):
                if int(mm.group(2)) == seat:
                    casts.append((int(mm.group(1)), k))
            for mm in LIVE_RE.finditer(l):
                live[int(mm.group(1) or mm.group(2))] = k
            if '"stackCards":[{' in l:
                try:
                    b = json.loads(l).get('body') or {}
                except ValueError:
                    b = {}
                for sc in b.get('stackCards') or []:
                    if isinstance(sc, dict) and isinstance(sc.get('id'), int):
                        live[sc['id']] = k
    lost = [(cid, ln) for cid, ln in casts if live.get(cid, -1) < ln]
    own = lambda cid: isinstance(tok, str) and (tok == 'cast:%d' % cid or tok.startswith('cast:%d#' % cid))
    n['casts'], n['lost'] = len(casts), len(lost)
    n['forced'] = sum(1 for cid, ln in lost if own(cid) and (first_dec is None or ln < first_dec))
    names = {}
    if lost:   # rare: the lost cards' names, from the caster's own state frames (its hand named them)
        want = {cid for cid, _ in lost}
        with gzip.open(path, 'rt') as f:
            for l in f:
                if '"type":"state"' not in l:
                    continue
                for cid in list(want - set(names)):
                    mm = re.search(r'\{"id":%d,"name":"((?:[^"\\]|\\.)*)"' % cid, l)
                    if mm:
                        names[cid] = mm.group(1)
                if len(names) == len(want):
                    break
    return {'key': 'd%d/%s/o%d' % (d, c, o), 'i': i, 'n': n, 'g': g, 'cards': [cid for cid, _ in lost],
            'names': [names.get(cid, '?') for cid, _ in lost]}


if len(sys.argv) > 1 and sys.argv[1] == '--scan':
    import multiprocessing
    Pool = multiprocessing.get_context('fork').Pool   # the module's top level is the default mode: never re-imported in a worker
    F, C = os.path.abspath(sys.argv[2]), sys.argv[3]
    J = int(sys.argv[4]) if len(sys.argv) > 4 else 1
    mt = int(os.path.getmtime(F + '/atlas.json'))
    bo = {}
    for line in open(F + '/phaseB/branches.jsonl'):
        try:
            r = json.loads(line)
        except ValueError:
            continue
        bo.setdefault('d%d/%s/o%d' % (r['d'], r['c'], r['o']), {'branches': 0, 'lostBranches': 0, 'forcedLostBranches': 0})['branches'] += 1
    files = sorted(glob.glob(F + '/phaseB/frames/d*-*-o*-b*-seat?.jsonl.gz'))
    tot = dict.fromkeys(SCAN_COUNTS, 0)
    res = {'folder': os.path.basename(F), 'atlasMtime': mt, 'logs': len(files), 'byCard': {}, 'byName': {}, 'guardrails': {}}
    lostb, forcedb = set(), set()
    with Pool(J) as p:
        for x in p.imap_unordered(scan_log, files, chunksize=16):
            for k in SCAN_COUNTS:
                tot[k] += x['n'][k]
            for k, v in x['g'].items():
                res['guardrails'][k] = res['guardrails'].get(k, 0) + v
            for cid, nm in zip(x['cards'], x['names']):
                res['byCard'][str(cid)] = res['byCard'].get(str(cid), 0) + 1
                res['byName'][nm] = res['byName'].get(nm, 0) + 1
            if x['n']['lost']:
                lostb.add((x['key'], x['i']))
            if x['n']['forced']:
                forcedb.add((x['key'], x['i']))
    for key, i in lostb:
        bo.setdefault(key, {'branches': 0, 'lostBranches': 0, 'forcedLostBranches': 0})['lostBranches'] += 1
    for key, i in forcedb:
        bo[key]['forcedLostBranches'] += 1
    res.update({'casts': tot['casts'], 'lostCasts': tot['lost'], 'lostCastForced': tot['forced'], 'staleTargetRecords': tot['stale'],
                'modesDrawnRecords': tot['modesWhy'], 'modesSourceRecords': tot['modesSource'], 'targetRecords': tot['targetRecords'],
                'targetRecordsCard': tot['targetRecordsCard'], 'targetRecordsComplete': tot['targetRecordsComplete'],
                'targetRecordsCardComplete': tot['targetRecordsCardComplete'], 'summaries': tot['summaries'], 'randomised': tot['randomised'],
                'randomisedPriority': tot['randomisedPriority'], 'cardTargetOffered': res['guardrails'].get('cardTargetOffered', 0),
                'modesDrawn': res['guardrails'].get('modesDrawn', 0), 'retargeted': res['guardrails'].get('retargeted', 0),
                'staleRefused': res['guardrails'].get('staleRefused', 0)})
    res['cardTargetShare'] = round(res['cardTargetOffered'] / res['randomisedPriority'], 4) if res['randomisedPriority'] else None
    res['lostCastBranches'] = len(lostb)
    res['byOption'] = bo
    res['lostCastOptions'] = sorted(k for k, v in bo.items() if v['branches'] and 2 * v['forcedLostBranches'] > v['branches'])
    os.makedirs(C, exist_ok=True)
    with open(os.path.join(C, res['folder'] + '.json'), 'w') as f:
        json.dump(res, f)
    print(json.dumps({k: v for k, v in res.items() if k != 'byOption'}))
    sys.exit(0)
D = sys.argv[1] if len(sys.argv) > 1 else '/home/justin-a/code/lab/data/lab-j170'
G = sys.argv[2] if len(sys.argv) > 2 else 'b-s??-*-21??'
L = 'var/lab-j171-local'
# name: (band, deck seed, game seed, branchForge) -- the registered spine table (J166's)
SPINES = {'s01': ('pauper', 2001, 2101, 40), 's02': ('peasant', 2002, 2102, 0), 's03': ('legacy', 2003, 2103, 0), 's04': ('powered', 2004, 2104, 0),
          's05': ('pauper', 2005, 2105, 0), 's06': ('peasant', 2006, 2106, 0), 's07': ('legacy', 2007, 2107, 40), 's08': ('powered', 2008, 2108, 0),
          's09': ('pauper', 2009, 2109, 0), 's10': ('peasant', 2010, 2110, 0), 's11': ('legacy', 2011, 2111, 0), 's12': ('powered', 2012, 2112, 0),
          's13': ('pauper', 2013, 2113, 40)}
VALIDATION_SHA = '7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de'
S04_DECK1 = '873bb7e41c40f2ad4a40fbd8e3abf7185820fa93b1e90c40d2abff5907e3f003'   # D482's deck 1 (J167's pilot registered it)
CUTS = {'earlyStop': [50, 100, 150], 'screen': 25, 'minOptions': 3}
SCAN_KEYS = ('lostCasts', 'lostCastBranches', 'lostCastForced', 'staleTargetRecords', 'modesDrawnRecords', 'modesSourceRecords', 'targetRecords',
             'targetRecordsCard', 'targetRecordsComplete', 'targetRecordsCardComplete', 'randomised', 'randomisedPriority', 'cardTargetOffered',
             'modesDrawn', 'retargeted', 'staleRefused')
out = {'atlases': 0, 'spinesDone': 0, 'problems': 0, 'warnings': 0, 'guardViolations': 0, 'violationsG1': 0, 'violationsG4': 0, 'violationsG6': 0,
       'g5keys': 0, 'g6keys': 0, 'd479keys': 0, 'scheduleKeys': 0, 'refusedCast': 0, 'noRepeatRefused': 0, 'noRepeatNoOp': 0,
       'xDrawn': 0, 'zeroXLeftOut': 0, 'zeroX': 0, 'branchErroredOptions': 0, 'unavailableOptionsOverBar': 0, 'cappedOptionsOverWarn': 0, 'truncatedLogs': 0,
       'planOk': 0, 'planBad': [], 'forgeSpines': 0, 'cutsSpines': 0,
       'branchRows': 0, 'branchTimeouts': 0, 'branchTimeoutsInStep': 0, 'timeoutShare': None, 'branchErrored': 0, 'branchUnavailable': 0,
       'branchRestarted': 0, 'branchCapped': 0, 'effectSourceNullBranches': 0, 'effectSourceNullCards': 0, 'exileLinksLostBranches': 0, 'exileLinksLostLinks': 0,
       'errorsByKind': {}, 'unavailableByReason': {}, 'decisions': 0, 'branchedInFull': 0, 'screened': 0, 'fill': 0, 'stoppedOptions': 0,
       'unitsPlanned': 0, 'unitsOk': 0, 'unitsShort': 0, 'fullShort': 0, 'meanRho': None,
       'listedDecisions': 0, 'identityDecisions': 0, 'identityOptions': 0, 'identityListingsShort': 0, 'd483Spines': 0, 'pre483Spines': 0,
       'repeatedPlays': 0, 'sharedToken': 0, 'scuteDecks': 0, 's04NewDeck': 0,
       'chooseSourceGuardRows': 0, 'chooseSourceGuard': 0, 'chooseSourceGuardKeyRows': 0, 'retargetedRows': 0, 'retargetedOnRows': 0,
       'modesDrawnRows': 0, 'modesDrawnOnRows': 0,
       'lostCastScanned': 0, 'lostCastOptions': 0, 'lostCastOptionList': [], 'lostCastCards': {}, 'scanLogs': 0, 'cardTargetSpines': 0, 'cardTargetShare': None,
       'validationFolders': 0, 'validationDecks': 0, 'validationShaOk': 0, 'validationBranched': 0,
       'reads': 0, 'labels': -1, 'confident': -1, 'confidentPer7Worker10hNight': None, 'confidentPer7Poisson95': None, 'rowsUnmatched': -1, 'voidLabels': -1,
       'branchedRows': -1, 'trainingRows': -1, 'lostCastVoid': -1, 'poolOk': 0, 'compare': 0, 'bySpine': {}}
for k in SCAN_KEYS:
    out[k] = 0
for b in ('pauper', 'peasant', 'legacy', 'powered'):
    out['spines_' + b] = 0


def key_of(name):
    """b-s01-pauper-2101 -> s01"""
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
                'seed': gs, 'branchForge': bf, 'branchRandom': 200, 'chunk': 25, 'decisions': 8}
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
    # D483: the baseline's listing (every J171 spine lists identities)
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
    for x in ('refusedCast', 'noRepeatRefused', 'noRepeatNoOp', 'xDrawn', 'zeroXLeftOut', 'zeroX'):
        out[x] += g.get(x, 0)
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
        full = s.get('branchedInFull', 0)
        out['branchedInFull'] += full
        out['screened'] += nscr
        out['fill'] += s.get('fill', 0)
        out['stoppedOptions'] += s.get('stoppedOptions', 0)
        plan_ = d['plan']
        want_full = min(plan_['decisions'] if plan_['decisions'] != 'all' else listed, listed - nscr)
        short = 1 if full < want_full else 0
        out['fullShort'] += short
        per = math.ceil(plan_['branchRandom'] / plan_['chunk']) + math.ceil(plan_['branchForge'] / plan_['chunk'])
        planned = full * per + nscr * math.ceil(((plan_.get('cuts') or {}).get('screen') or plan_['branchRandom']) / plan_['chunk'])
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
        sp.update({'listed': listed, 'branchedInFull': full, 'screened': nscr, 'fill': s.get('fill', 0), 'stoppedOptions': s.get('stoppedOptions', 0),
                   'meanOptions': s.get('meanOptions'), 'unitsPlanned': planned, 'unitsOk': len(ok), 'fullShort': short,
                   'baseline': '%s turns, winner %s' % (b['baseline']['turns'], b['baseline']['winner'])})
out['meanRho'] = round(sum(rhos) / len(rhos), 4) if rhos else None
# the branch rows, live
for f in sorted(glob.glob(D + '/' + G + '/phaseB/branches.jsonl')):
    name = os.path.basename(os.path.dirname(os.path.dirname(f)))
    sp = out['bySpine'].setdefault(name, {})
    n = t = 0
    e = {'errored': 0, 'unavailable': 0, 'restarted': 0, 'capped': 0, 'effectSourceNull': 0, 'exileLinksLost': 0, 'chooseSourceGuardRows': 0, 'chooseSourceGuard': 0,
         'retargetedRows': 0, 'retargetedOnRows': 0, 'modesDrawnRows': 0, 'modesDrawnOnRows': 0, 'errorsByKind': {}}
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
        # D485: plays cast after their stale targets were replaced; D486: plays cast with modes the seat drew (each written when > 0)
        for key in ('retargeted', 'modesDrawn'):
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
    for key in ('chooseSourceGuardRows', 'chooseSourceGuard', 'retargetedRows', 'retargetedOnRows', 'modesDrawnRows', 'modesDrawnOnRows'):
        out[key] += e[key]
if out['branchRows']:
    out['timeoutShare'] = round(out['branchTimeouts'] / out['branchRows'], 5)
# s04: its plan names D482's deck 1 (registered: S04_DECK1), which holds no Scute Swarm
try:
    p1 = json.load(open(D + '/b-s04-powered-2104/plan.json'))['deckA']
    out['s04NewDeck'] = 1 if hashlib.sha256(open(p1, 'rb').read()).hexdigest() == S04_DECK1 and not scute(p1) else 0
except (OSError, ValueError, KeyError, IndexError, TypeError):
    pass
# the lost casts and D486's counters, from metrics.py --scan's caches (the scan block writes them; a cache of another atlas.json is not read)
for f in sorted(glob.glob(D + '/' + G + '/atlas.json')):
    name = os.path.basename(os.path.dirname(f))
    try:
        c = json.load(open(L + '/lost/' + name + '.json'))
    except (OSError, ValueError):
        continue
    if c.get('atlasMtime') != int(os.path.getmtime(f)):
        continue
    sp = out['bySpine'].setdefault(name, {})
    sp.update({k: c.get(k, 0) for k in SCAN_KEYS})
    sp.update({'cardTargetShare': c.get('cardTargetShare'), 'lostCastOptions': len(c['lostCastOptions']), 'lostCastCards': c.get('byName') or c['byCard'], 'scanLogs': c['logs']})
    out['lostCastScanned'] += 1
    out['scanLogs'] += c['logs']
    for k in SCAN_KEYS:
        out[k] += c.get(k, 0)
    out['cardTargetSpines'] += 1 if c.get('cardTargetOffered', 0) > 0 else 0
    out['lostCastOptions'] += len(c['lostCastOptions'])
    out['lostCastOptionList'] += ['%s %s' % (key_of(name), x) for x in c['lostCastOptions']]
    for nm, v in (c.get('byName') or {}).items():
        out['lostCastCards'][nm] = out['lostCastCards'].get(nm, 0) + v
out['cardTargetShare'] = round(out['cardTargetOffered'] / out['randomisedPriority'], 4) if out['randomisedPriority'] else None
# the validation draw: 13 folders of 2 decks, its registered sha256, and no spine folder of its own
vd = sorted(glob.glob(D + '/validation/v*'))
out['validationFolders'] = len(vd)
h = hashlib.sha256()
try:
    for v in vd:
        h.update(open(os.path.join(v, 'decks.jsonl'), 'rb').read())
        for x in sorted(glob.glob(os.path.join(v, 'decks', '*.dck'))):
            h.update(os.path.basename(x).encode() + b'\0' + open(x, 'rb').read())
            out['validationDecks'] += 1
    out['validationShaOk'] = 1 if h.hexdigest() == VALIDATION_SHA else 0
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
                'branchedRows': lb['branched'], 'trainingRows': lb['trainingRows'], 'lostCastVoid': lb['lostCastVoid'],
                'confidentPer7Worker10hNight': lb['c_sizing7']['asRun']['confidentPer7Worker10hNight'],
                'confidentPer7Poisson95': lb['c_sizingRead'].get('poisson95')})
    # each spine's rows carry its band's D486 pool, its registered seeds, D483's listing, D486's seat, the pin, and a scan
    out['poolOk'] = sum(1 for n, m in lb['bySpine'].items() if n in SPINES and m['pool'] == 'random-%s-d486' % SPINES[n][0]
                        and m['deckSeed'] == SPINES[n][1] and m['gameSeed'] == SPINES[n][2] and m['forgeMap'] == (SPINES[n][3] > 0)
                        and m['listing'] == 'D483' and m['randomSeat'] == 'D486' and m['sha'] == sha and m['lostScanned'] is True)
except (OSError, ValueError, KeyError, TypeError):
    pass
try:
    cp = json.load(open(D + '/report/compare-j168.json'))
    out['compare'] = 1 if len(cp['bySpine']) == 13 and all(v['j171'].get('labels') is not None for v in cp['bySpine'].values()) else 0
except (OSError, ValueError, KeyError, TypeError, AttributeError):
    pass
print(json.dumps(out))
PY
cat > var/lab-j171-local/bin/compare.py <<'PY'
# J171 (drafts/J171-atlas-4b-card-targets.md): J170's compare.py, its column for this job named 'j171'. J170's header:
# J170 (drafts/J170-atlas-4b-card-targets.md): each spine's numbers beside J168's for the same decks and seeds, ACROSS POPULATIONS
# (J168's spines were branched before D486 -- s01-s03 by J166 at 325c2dd8, s04 by J167 at bf978690, s05-s13 by J168 at 26a8db00;
# J170's at the pin, by D486's random seat): a difference is a candidate, never a repeat's verdict. Registered before any J170 data.
# Definitions: J168's own (pc-results results/J168/report/bin/spines.py), per spine and for the night:
#   listedPerTurn    decisions listed (phaseB/baseline.json) / the baseline game's turns     (the night: sum / sum)
#   optionsPerFull   options of the decisions branched in full (not screened) / decisions branched in full   (sum / sum)
#   labels, confident, confidentShare   labels.json's bySpine (confidentShare = confident / labels)   (sum, sum, sum / sum)
#   regretMean       labels.json's bySpine regretMean (the mean random-map regret at Forge's choice over the labels); the night:
#                    labels.json's b_regretMean point (pooled over every label)
#   cappedShare      branch rows ended at the turn cap / branch rows     (sum / sum)
#   branchGames      branch rows; wallSec: the spine's spine-times.txt lines summed
#   compare.py DATA_DIR LABELS_JSON [--only=s05,s07,...]   prints one JSON object. The pilot's self-test runs it on J168's own folders
#   (the six J169 leaves alone) and requires J168's registered values back (`selfMatch`). Standard library only; no engine.
import glob, json, os, sys
# J168's per-spine numbers (results/J168/report/spines.json, J168's read of 2026-10-25), registered here
J168 = {
    's01': {'by': 'J166 325c2dd8', 'listedPerTurn': 0.72, 'optionsPerFull': 3.5, 'labels': 8, 'confident': 1, 'regretMean': 0.0231, 'cappedShare': 0.2106, 'wallSec': 2866, 'branchGames': 5780},
    's02': {'by': 'J166 325c2dd8', 'listedPerTurn': 0.5, 'optionsPerFull': 2.17, 'labels': 6, 'confident': 1, 'regretMean': 0.0308, 'cappedShare': 0.0496, 'wallSec': 1763, 'branchGames': 2500},
    's03': {'by': 'J166 325c2dd8', 'listedPerTurn': 0.79, 'optionsPerFull': 4.12, 'labels': 8, 'confident': 2, 'regretMean': 0.0509, 'cappedShare': 0.0472, 'wallSec': 2916, 'branchGames': 6000},
    's04': {'by': 'J167 bf978690', 'listedPerTurn': 1.06, 'optionsPerFull': 2.67, 'labels': 3, 'confident': 0, 'regretMean': 0.0075, 'cappedShare': 0.0014, 'wallSec': 2053, 'branchGames': 2900},
    's05': {'by': 'J168 26a8db00', 'listedPerTurn': 1.0, 'optionsPerFull': 4.12, 'labels': 8, 'confident': 1, 'regretMean': 0.0181, 'cappedShare': 0.0549, 'wallSec': 2772, 'branchGames': 5500},
    's06': {'by': 'J168 26a8db00', 'listedPerTurn': 1.05, 'optionsPerFull': 6.25, 'labels': 8, 'confident': 5, 'regretMean': 0.0959, 'cappedShare': 0.0004, 'wallSec': 4520, 'branchGames': 7350},
    's07': {'by': 'J168 26a8db00', 'listedPerTurn': 1.14, 'optionsPerFull': 4.5, 'labels': 8, 'confident': 1, 'regretMean': 0.0138, 'cappedShare': 0.0, 'wallSec': 1341, 'branchGames': 5970},
    's08': {'by': 'J168 26a8db00', 'listedPerTurn': 1.85, 'optionsPerFull': 5.0, 'labels': 8, 'confident': 3, 'regretMean': 0.0725, 'cappedShare': 0.0, 'wallSec': 3944, 'branchGames': 7200},
    's09': {'by': 'J168 26a8db00', 'listedPerTurn': 1.17, 'optionsPerFull': 4.38, 'labels': 8, 'confident': 4, 'regretMean': 0.0678, 'cappedShare': 0.0264, 'wallSec': 2991, 'branchGames': 5950},
    's10': {'by': 'J168 26a8db00', 'listedPerTurn': 1.7, 'optionsPerFull': 4.25, 'labels': 8, 'confident': 4, 'regretMean': 0.0472, 'cappedShare': 0.0124, 'wallSec': 3136, 'branchGames': 5875},
    's11': {'by': 'J168 26a8db00', 'listedPerTurn': 1.22, 'optionsPerFull': 4.12, 'labels': 8, 'confident': 1, 'regretMean': 0.0453, 'cappedShare': 0.0028, 'wallSec': 3658, 'branchGames': 5975},
    's12': {'by': 'J168 26a8db00', 'listedPerTurn': 1.17, 'optionsPerFull': 3.0, 'labels': 8, 'confident': 3, 'regretMean': 0.0822, 'cappedShare': 0.0003, 'wallSec': 2159, 'branchGames': 3600},
    's13': {'by': 'J168 26a8db00', 'listedPerTurn': 1.1, 'optionsPerFull': 4.25, 'labels': 8, 'confident': 1, 'regretMean': 0.0241, 'cappedShare': 0.0296, 'wallSec': 2349, 'branchGames': 6925},
}
# J168's night (results/J168/summary.md): 286 listed over 260 baseline turns, 401 options over 97 decisions in full, 97 labels and 27
# confident, mean regret 4.7 points [2.7, 7.3], 2,386 of 71,525 branch rows capped, 10 h 08 of walls at 6 workers
J168_NIGHT = {'listedPerTurn': 1.1, 'optionsPerFull': 4.13, 'labels': 97, 'confident': 27, 'confidentShare': 0.2784, 'regretMean': 0.047,
              'cappedShare': 0.0334, 'wallSec': 36468, 'branchGames': 71525}
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
D, LJ = args[0], args[1]
only = set(x for x in opt.get('only', '').split(',') if x)
lab = json.load(open(LJ))
wall = {}
if os.path.exists(D + '/spine-times.txt'):
    for line in open(D + '/spine-times.txt'):
        f = line.split()
        if len(f) >= 3 and f[1].isdigit() and f[2].isdigit():
            wall[f[0]] = wall.get(f[0], 0) + int(f[2]) - int(f[1])
out = {'note': 'ACROSS POPULATIONS: J168 (before D486) against J171 (D486), same decks and seeds; a difference is a candidate, not a verdict',
       'bySpine': {}, 'night': {}}
tot = {'listed': 0, 'turns': 0, 'options': 0, 'full': 0, 'labels': 0, 'confident': 0, 'capped': 0, 'rows': 0, 'wallSec': 0}
for sp in sorted(glob.glob(D + '/b-s??-*-21??')):
    name = os.path.basename(sp)
    s = name.split('-')[1]
    if only and s not in only:
        continue
    try:
        a = json.load(open(sp + '/atlas.json'))
        pb = a['phaseB']
        sch = pb['schedule']
        b = json.load(open(sp + '/phaseB/baseline.json'))['decisions']
        rows = [json.loads(x) for x in open(sp + '/phaseB/branches.jsonl') if x.strip()]
        m = lab['bySpine'][s]
    except (OSError, ValueError, KeyError, TypeError):
        continue
    br = [x for x in pb['decisions'] if not x.get('screened')]
    full = sch.get('branchedInFull', 0)
    capped = sum(1 for r in rows if r.get('capped'))
    v = {'listedPerTurn': round(len(b) / pb['baseline']['turns'], 2), 'optionsPerFull': round(sum(len(x['options']) for x in br) / max(1, full), 2),
         'labels': m['labels'], 'confident': m['confident'], 'confidentShare': round(m['confident'] / m['labels'], 4) if m['labels'] else None,
         'regretMean': m['regretMean'], 'cappedShare': round(capped / len(rows), 4) if rows else None, 'wallSec': wall.get(name), 'branchGames': len(rows)}
    j = dict(J168.get(s) or {})
    if j:
        j['confidentShare'] = round(j['confident'] / j['labels'], 4) if j['labels'] else None
    out['bySpine'][s] = {'j168': j, 'j171': v}
    tot['listed'] += len(b)
    tot['turns'] += pb['baseline']['turns']
    tot['options'] += sum(len(x['options']) for x in br)
    tot['full'] += full
    tot['labels'] += m['labels']
    tot['confident'] += m['confident']
    tot['capped'] += capped
    tot['rows'] += len(rows)
    tot['wallSec'] += wall.get(name) or 0
out['night'] = {'j168': J168_NIGHT, 'j171': {'spines': len(out['bySpine']), 'listedPerTurn': round(tot['listed'] / tot['turns'], 2) if tot['turns'] else None,
                                             'optionsPerFull': round(tot['options'] / tot['full'], 2) if tot['full'] else None, 'labels': tot['labels'],
                                             'confident': tot['confident'], 'confidentShare': round(tot['confident'] / tot['labels'], 4) if tot['labels'] else None,
                                             'regretMean': (lab.get('b_regretMean') or {}).get('point'), 'cappedShare': round(tot['capped'] / tot['rows'], 4) if tot['rows'] else None,
                                             'wallSec': tot['wallSec'], 'branchGames': tot['rows']}}
# the self-test's number: spines whose every J168 value comes back from J168's own folders (meaningful only on those folders)
K = ('listedPerTurn', 'optionsPerFull', 'labels', 'confident', 'regretMean', 'cappedShare', 'wallSec', 'branchGames')
out['selfMatch'] = sum(1 for v in out['bySpine'].values() if v['j168'] and all(v['j168'][k] == v['j171'][k] for k in K))
print(json.dumps(out, indent=1))
PY
cat > var/lab-j171-local/bin/pilot.py <<'PY'
# J171 pilot: J170's pilot.py with J171's paths (the smoke in lab-j170/pilot-smoke-j171, a new folder; its decks J170's pilot's draw). J170's:
# J170 pilot: J169's pilot.py with J170's paths (the smoke in lab-j170, its decks J170's own draw) and the smoke's frame scan (metrics.py --scan's
# cache, var/lab-j171-local/lost-smoke/): its lost-cast options (0, a check) and D486's counters (information). J169's header:
# J169 pilot: J168's pilot.py (J167's) with J169's paths. The smoke (J166's powered pair, deck seed 2099, game seed 2199, every cut on, a new folder) and the atlas-selftest's G5, G6
# and cuts legs, as one JSON object. J166's pilot.py, with the smoke's D483 listing read (an identity beside every token, no play twice).
# Standard library only; no engine. Run from the clone (the self-test's folder is var/cubelab/atlas-selftest).
import json, math, os
S = '/home/justin-a/code/lab/data/lab-j170/pilot-smoke-j171'
out = {'smoke': {'problems': -1}, 'g5': {'refusedCast': -1}, 'g6': {'zeroXLeftOut': -1}, 'cuts': {'problems': -1}, 'cutsNoforge': {'problems': -1}}


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
    lb = json.load(open('var/lab-j171-local/pilot-labels.json'))
    ls = json.load(open(S + '/phaseB/baseline.json'))['decisions']
    per = math.ceil(p['branchRandom'] / p['chunk']) + math.ceil(p['branchForge'] / p['chunk'])
    out['smoke'] = {'problems': len(c['problems']), 'warnings': len(c.get('warnings') or []), 'decisions': len(b['decisions']),
                    'branchedInFull': s['branchedInFull'], 'screened': len(s['screened']), 'stoppedOptions': s['stoppedOptions'],
                    'unitsPlanned': s['branchedInFull'] * per + len(s['screened']) * math.ceil(p['cuts']['screen'] / p['chunk']), 'unitsOk': units_ok(S),
                    'cuts': 1 if p.get('cuts', {}).get('decision') == 'D480' and p['cuts']['minOptions'] == 3 else 0,
                    'g6': 1 if all(k in g for k in ('xDrawn', 'zeroXLeftOut', 'zeroX')) else 0, 'zeroX': g.get('zeroX', -1),
                    'd479': 1 if isinstance(b.get('effectSourceNull'), dict) and isinstance(b.get('exileLinksLost'), dict) and 'branchRestarted' in b else 0,
                    'guardViolations': g['violations'], 'branchTimeoutSec': p['branchTimeoutSec'],
                    'branches': len(rows), 'timeouts': sum(1 for r in rows if r.get('timedOut')),
                    'unavailable': sum(1 for r in rows if r.get('unavailable')), 'errored': sum(1 for r in rows if r.get('error')),
                    'labels': lb['labels'], 'rowsUnmatched': lb['rowsUnmatched'], 'voidLabels': lb['voidLabels'],
                    'trainingRows': lb['trainingRows'], 'branchedRows': lb['branched'],
                    'listed': len(ls), 'identities': 1 if ls and all(len(x.get('identities') or []) == len(x['tokens']) for x in ls) else 0,
                    'repeatedPlays': sum(1 for x in ls if len(set(x.get('identities') or [])) < len(x.get('identities') or []))}
except (OSError, ValueError, KeyError, TypeError):
    pass
try:
    c = json.load(open('var/lab-j171-local/lost-smoke/pilot-smoke-j171.json'))
    out['smoke']['scan'] = {'scanned': 1 if c.get('atlasMtime') == int(os.path.getmtime(S + '/atlas.json')) else 0, 'logs': c['logs'],
                            'lostCastOptions': len(c['lostCastOptions']), 'lostCasts': c['lostCasts'],
                            **{k: c.get(k, 0) for k in ('cardTargetOffered', 'randomisedPriority', 'modesDrawn', 'retargeted', 'modesDrawnRecords',
                                                         'modesSourceRecords', 'targetRecords', 'targetRecordsCard', 'targetRecordsCardComplete')}}
except (OSError, ValueError, KeyError, TypeError):
    out['smoke']['scan'] = {'scanned': 0, 'lostCastOptions': -1}
for leg in ('g5', 'g6'):
    try:
        d = json.load(open('var/cubelab/atlas-selftest/%s/atlas.json' % leg))
        g = d['checks']['guardrails']
        out[leg] = {'problems': len(d['checks']['problems']), 'refusedCast': g.get('refusedCast', 0), 'noRepeatRefused': g.get('noRepeatRefused', 0),
                    'xDrawn': g.get('xDrawn', 0), 'zeroXLeftOut': g.get('zeroXLeftOut', 0), 'zeroX': g.get('zeroX', -1)}
    except (OSError, ValueError, KeyError, TypeError):
        pass
for key, leg in (('cuts', 'cuts'), ('cutsNoforge', 'cuts-noforge')):
    try:
        d = json.load(open('var/cubelab/atlas-selftest/%s/atlas.json' % leg))
        out[key] = {'problems': len(d['checks']['problems']), 'schedule': 1 if d['phaseB'].get('schedule') else 0,
                    'forgeMap': 0 if d['phaseB'].get('forgeMap') is False else 1, 'labels': d['phaseB']['schedule']['labels']}
    except (OSError, ValueError, KeyError, TypeError):
        pass
print(json.dumps(out))
PY
# the readers' self-tests on J162's and J158's files (read, never written): each must give the registered numbers (J169's pilot's)
L2=/home/justin-a/code/lab/data/lab-j162
L8=/home/justin-a/code/lab/data/lab-j158
python3 -I var/lab-j171-local/bin/labels.py pauper5:confirm-j162:0:464:f6dba5e4:$L2/b-pauper5-464 synergy9:confirm-j162:0:465:f6dba5e4:$L2/b-synergy9-465 modern7:confirm-j162:0:466:f6dba5e4:$L2/b-modern7-466 ff5:confirm-j162:0:462:f6dba5e4:$L2/b-ff5-462 --out=var/lab-j171-local/labels-j162.jsonl --times=$L2/spine-times.txt > var/lab-j171-local/labels-j162.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j171-local/labels-j162.json')); a = d['a_confidentShare']; print(1 if (d['labels'], d['confident'], d['confidentForge'], d['rowsUnmatched'], d['voidLabels'], d['trainingRows'], a['point'], a['interval'], d['c_sizing7']['asRun']['labelsPer7Worker10hNight']) == (59, 7, 5, 0, 0, 0, 0.1186, [0.0339, 0.2203], 91) else 0)" > var/lab-j171-local/labels-self.txt 2>/dev/null || echo 0 > var/lab-j171-local/labels-self.txt
python3 -I var/lab-j171-local/bin/labels.py ff5:confirm-j158:0:461:-:$L8/b-ff5-461 peasant7:confirm-j158:0:463:-:$L8/b-peasant7-463 --times=$L8/spine-times.txt > var/lab-j171-local/labels-j158.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j171-local/labels-j158.json')); print(1 if (d['labels'], d['confident'], d['voidLabels'], d['voidList'], d['sameGameNotBlock']) == (32, 6, 3, ['ff5 d10 block:35>78', 'ff5 d14 block:21>71', 'ff5 d30 block:25>80,40>81'], []) else 0)" > var/lab-j171-local/void-self.txt 2>/dev/null || echo 0 > var/lab-j171-local/void-self.txt
python3 -I var/lab-j171-local/bin/reads.py pauper5:pauper5:$L2/b-pauper5-464/atlas.json synergy9:synergy9:$L2/b-synergy9-465/atlas.json modern7:modern7:$L2/b-modern7-466/atlas.json ff5:ff5:$L2/b-ff5-462/atlas.json > var/lab-j171-local/reads-j162.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j171-local/reads-j162.json')); iv = {n: (v['C1_castNow']['random']['point'], v['C1_castNow']['random']['interval'], v['C1_castNow']['verdict']) for n, v in d['iv_bySpine'].items()}; ok = iv == {'pauper5': (0.0411, [0.0126, 0.069], 'HOLDS'), 'synergy9': (0.0002, [-0.0133, 0.0136], 'NOT SHOWN'), 'modern7': (0.063, [0.017, 0.1231], 'HOLDS'), 'ff5': (0.0523, [-0.0047, 0.1313], 'NOT SHOWN')} and (d['i_sameBest']['point'], d['i_sameBest']['interval'], d['ii_rho']['point'], d['ii_rho']['interval']) == (0.5088, [0.322, 0.7], 0.2181, [-0.1188, 0.5799]); print(1 if ok else 0)" > var/lab-j171-local/reads-self.txt 2>/dev/null || echo 0 > var/lab-j171-local/reads-self.txt
python3 -I var/lab-j171-local/bin/cuts.py $L2/b-pauper5-464 $L2/b-synergy9-465 $L2/b-modern7-466 $L2/b-ff5-462 --times=$L2/spine-times.txt > var/lab-j171-local/cuts-j162.json || true
python3 -I -c "import json; n = json.load(open('var/lab-j171-local/cuts-j162.json'))['night']; print(1 if (n['spines'], n['branchGames'], n['savedShare'], n['checksSecPerKGames']) == (4, 55680, 0.0, 92.3) else 0)" > var/lab-j171-local/cuts-self.txt 2>/dev/null || echo 0 > var/lab-j171-local/cuts-self.txt
python3 -I var/lab-j171-local/bin/metrics.py $L2 'b-*' > var/lab-j171-local/metrics-j162.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j171-local/metrics-j162.json')); print(1 if (d['atlases'], d['problems'], d['branchRows'], d['errorsByKind'].get('play not rebuilt on the copy (D472, D476)'), d['xDrawn'], d['planOk']) == (4, 10, 55680, 2400, 32626, 0) else 0)" > var/lab-j171-local/metrics-self.txt 2>/dev/null || echo 0 > var/lab-j171-local/metrics-self.txt
# ... on J166's s01-s03 and J167's s04 (J169's pilot's registered numbers, unchanged; --seat=pre-D485 names their seat)
L6=/home/justin-a/code/lab/data/lab-j166
python3 -I var/lab-j171-local/bin/labels.py s01:random-pauper:2001:2101:325c2dd8:$L6/b-s01-pauper-2101 s02:random-peasant:2002:2102:325c2dd8:$L6/b-s02-peasant-2102 s03:random-legacy:2003:2103:325c2dd8:$L6/b-s03-legacy-2103 --times=$L6/spine-times.txt --training=1 --seat=pre-D485 > var/lab-j171-local/labels-j166.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j171-local/labels-j166.json')); a = d['a_confidentShare']; z = d['c_sizing7']['asRun']; print(1 if (d['labels'], d['confident'], d['confidentForge'], d['rowsUnmatched'], d['voidLabels'], d['trainingRows'], d['branched'], a['point'], a['interval'], z['labelsPer7Worker10hNight'], z['confidentPer7Worker10hNight'], d['byListing']['pre-D483']['labels']) == (22, 4, 1, 0, 0, 22, 22, 0.1818, [0.0417, 0.3636], 122, 22.3, 22) else 0)" > var/lab-j171-local/labels-j166-self.txt 2>/dev/null || echo 0 > var/lab-j171-local/labels-j166-self.txt
python3 -I var/lab-j171-local/bin/reads.py s01:random-pauper:$L6/b-s01-pauper-2101/atlas.json s02:random-peasant:$L6/b-s02-peasant-2102/atlas.json s03:random-legacy:$L6/b-s03-legacy-2103/atlas.json > var/lab-j171-local/reads-j166.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j171-local/reads-j166.json')); c = d['iv_bySpine']['s01']['C1_castNow']; print(1 if d['forgeSpines'] == ['s01'] and (c['random']['point'], c['random']['interval'], c['verdict'], d['i_sameBest']['point'], d['i_sameBest']['interval'], d['ii_rho']['point'], d['ii_rho']['interval']) == (0.0409, [0.0087, 0.0752], 'HOLDS', 0.5, [0.125, 0.875], 0.1933, [-0.4667, 0.82]) else 0)" > var/lab-j171-local/reads-j166-self.txt 2>/dev/null || echo 0 > var/lab-j171-local/reads-j166-self.txt
python3 -I var/lab-j171-local/bin/cuts.py $L6/b-s01-pauper-2101 $L6/b-s02-peasant-2102 $L6/b-s03-legacy-2103 --times=$L6/spine-times.txt > var/lab-j171-local/cuts-j166.json || true
python3 -I -c "import json; n = json.load(open('var/lab-j171-local/cuts-j166.json'))['night']; print(1 if (n['spines'], n['branchGames'], n['savedShare'], n['checksSecPerKGames'], n['idleShare']) == (3, 14280, 0.0769, 38.0, 0.089) else 0)" > var/lab-j171-local/cuts-j166-self.txt 2>/dev/null || echo 0 > var/lab-j171-local/cuts-j166-self.txt
python3 -I var/lab-j171-local/bin/labels.py s04:random-powered:2004:2104:bf978690:$L6/b-s04-powered-2104 --times=$L6/spine-times.txt --training=1 --seat=pre-D485 > var/lab-j171-local/labels-s04.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j171-local/labels-s04.json')); a = d['a_confidentShare']; z = d['c_sizing7']['asRun']; print(1 if (d['labels'], d['confident'], d['confidentForge'], d['rowsUnmatched'], d['voidLabels'], d['trainingRows'], d['branched'], a['point'], a['interval'], z['labelsPer7Worker10hNight'], z['confidentPer7Worker10hNight'], d['byListing']['D483']['labels']) == (3, 0, 0, 0, 0, 17, 17, 0.0, [0.0, 0.0], 61, 0.0, 3) else 0)" > var/lab-j171-local/labels-s04-self.txt 2>/dev/null || echo 0 > var/lab-j171-local/labels-s04-self.txt
# ... on six of J168's spines J169 leaves alone (s05, s07, s08, s09, s11, s12 at 26a8db00; computed 2026-10-25 by these readers, read only):
# each spine's labels and confident labels are J168's (results/J168/report/spines.json), s07's C1 is J168's, and compare.py gives J168's values back
largs=""; args=""; dirs=""
for n in b-s05-pauper-2105 b-s07-legacy-2107 b-s08-powered-2108 b-s09-pauper-2109 b-s11-legacy-2111 b-s12-powered-2112; do
  s=$(echo "$n" | cut -d- -f2); b=$(echo "$n" | cut -d- -f3); g=$(echo "$n" | cut -d- -f4); d=$L6/$n
  largs="$largs $s:random-$b:$((g - 100)):$g:26a8db00:$d"; args="$args $s:random-$b:$d/atlas.json"; dirs="$dirs $d"
done
python3 -I var/lab-j171-local/bin/labels.py $largs --times=$L6/spine-times.txt --training=1 --seat=pre-D485 > var/lab-j171-local/labels-j168.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j171-local/labels-j168.json')); a = d['a_confidentShare']; z = d['c_sizing7']['asRun']; sp = {n: (m['labels'], m['confident']) for n, m in d['bySpine'].items()}; print(1 if (d['labels'], d['confident'], d['confidentForge'], d['rowsUnmatched'], d['voidLabels'], d['trainingRows'], d['branched'], a['point'], a['interval'], z['labelsPer7Worker10hNight'], z['confidentPer7Worker10hNight'], z['confidentPer7Poisson95'], d['byListing']['D483']['labels'], d['d486Rows']['modesDrawn']) == (48, 13, 1, 0, 0, 67, 67, 0.2708, [0.0833, 0.4583], 120, 32.4, [17.2, 55.4], 48, 0) and sp == {'s05': (8, 1), 's07': (8, 1), 's08': (8, 3), 's09': (8, 4), 's11': (8, 1), 's12': (8, 3)} else 0)" > var/lab-j171-local/labels-j168-self.txt 2>/dev/null || echo 0 > var/lab-j171-local/labels-j168-self.txt
python3 -I var/lab-j171-local/bin/reads.py $args > var/lab-j171-local/reads-j168.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j171-local/reads-j168.json')); iv = {n: (v['C1_castNow']['random']['point'], v['C1_castNow']['random']['interval'], v['C1_castNow']['verdict']) for n, v in d['iv_bySpine'].items()}; print(1 if d['forgeSpines'] == ['s07'] and iv == {'s07': (-0.053, [-0.095, -0.018], 'NOT SHOWN')} and (d['i_sameBest']['point'], d['i_sameBest']['interval'], d['ii_rho']['point'], d['ii_rho']['interval']) == (0.625, [0.25, 1.0], 0.6, [-0.1464, 1.0]) else 0)" > var/lab-j171-local/reads-j168-self.txt 2>/dev/null || echo 0 > var/lab-j171-local/reads-j168-self.txt
python3 -I var/lab-j171-local/bin/cuts.py $dirs --times=$L6/spine-times.txt > var/lab-j171-local/cuts-j168.json || true
python3 -I -c "import json; n = json.load(open('var/lab-j171-local/cuts-j168.json'))['night']; print(1 if (n['spines'], n['branchGames'], n['savedShare'], n['checksSecPerKGames'], n['idleShare'], n['wallSec'], n['checksShare']) == (6, 34195, 0.336, 19.8, 0.1228, 16865, 0.0402) else 0)" > var/lab-j171-local/cuts-j168-self.txt 2>/dev/null || echo 0 > var/lab-j171-local/cuts-j168-self.txt
python3 -I var/lab-j171-local/bin/compare.py $L6 var/lab-j171-local/labels-j168.json --only=s05,s07,s08,s09,s11,s12 > var/lab-j171-local/compare-j168.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j171-local/compare-j168.json')); print(1 if d['selfMatch'] == 6 and len(d['bySpine']) == 6 else 0)" > var/lab-j171-local/compare-self.txt 2>/dev/null || echo 0 > var/lab-j171-local/compare-self.txt
python3 -I var/lab-j171-local/bin/metrics.py $L6 'b-s0[5789]-*-210?' > var/lab-j171-local/metrics-j168.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j171-local/metrics-j168.json')); print(1 if (d['atlases'], d['spinesDone'], d['branchRows'], d['problems'], d['chooseSourceGuardRows'], d['chooseSourceGuard'], d['retargetedRows'], d['modesDrawnRows'], d['d483Spines'], d['pre483Spines'], d['planOk'], d['identityListingsShort'], d['repeatedPlays']) == (4, 4, 24620, 0, 537, 6187, 0, 0, 4, 0, 4, 0, 0) else 0)" > var/lab-j171-local/metrics-j168-self.txt 2>/dev/null || echo 0 > var/lab-j171-local/metrics-j168-self.txt
# ... THE LOST-CAST SCAN on J169's six of J168's spines (read only; caches in lost-self/, never the Report's lost/): J169's registered numbers,
# and D486's names at 0 on logs written before D486; s02 in full (this draft's scan, 2026-10-25). s06 and s10 are read where J168's rows are
mkdir -p var/lab-j171-local/lost-self
for n in b-s02-peasant-2102 b-s05-pauper-2105 b-s06-peasant-2106 b-s07-legacy-2107 b-s10-peasant-2110 b-s13-pauper-2113; do
  p=$L6/$n; test -d $p.j168-stale && p=$p.j168-stale
  python3 -I var/lab-j171-local/bin/metrics.py --scan $p var/lab-j171-local/lost-self {workers} || true
done
python3 -I -c "
import json
W = {'b-s02-peasant-2102': (5000, 48998, 7, 7, 0, []), 'b-s05-pauper-2105': (11000, 80369, 1614, 1125, 850, ['d0/random/o1', 'd0/random/o2', 'd3/random/o2', 'd5/random/o4', 'd8/random/o0']),
     'b-s06-peasant-2106': (14700, 74595, 212, 201, 0, []), 'b-s07-legacy-2107': (11940, 31631, 2, 2, 0, []), 'b-s10-peasant-2110': (11750, 68053, 514, 512, 0, []),
     'b-s13-pauper-2113': (13850, 71403, 0, 0, 0, [])}
ok = 1
for n, w in W.items():
    c = None
    for f in (n, n + '.j168-stale'):
        try:
            c = json.load(open('var/lab-j171-local/lost-self/%s.json' % f))
        except (OSError, ValueError):
            pass
    got = (c['logs'], c['casts'], c['lostCasts'], c['lostCastBranches'], c['lostCastForced'], c['lostCastOptions']) if c else None
    d486 = (c['cardTargetOffered'], c['modesDrawn'], c['modesDrawnRecords'], c['modesSourceRecords']) if c else None
    print('J171 lost-cast self-test', n, got, d486, 'ok' if got == w and d486 == (0, 0, 0, 0) else 'WANT %s (0, 0, 0, 0)' % (w,))
    ok = ok if got == w and d486 == (0, 0, 0, 0) else 0
c = json.load(open('var/lab-j171-local/lost-self/b-s05-pauper-2105.json'))
ok = ok if (c['byCard'].get('1'), c['byCard'].get('2'), c['byOption']['d8/random/o0']) == (991, 600, {'branches': 200, 'lostBranches': 200, 'forcedLostBranches': 200}) else 0
c = json.load(open('var/lab-j171-local/lost-self/b-s02-peasant-2102.json'))
ok = ok if (c['byName'], c['targetRecords'], c['targetRecordsCard'], c['targetRecordsCardComplete'], c['randomisedPriority'], c['summaries']) == ({'Tear Asunder': 7}, 9143, 9143, 0, 186379, 5000) else 0
print(ok)
" > var/lab-j171-local/lost-self.txt 2>/dev/null || echo 0 > var/lab-j171-local/lost-self.txt
cat var/lab-j171-local/lost-self.txt
export CUBELAB_HOME_ROOT=var/cubelab/homes-J171
export LAB_DATA_DIR=/home/justin-a/code/lab/data
# THE DECK DRAWS (D447 with D482's list; no engine): the 13 spine pairs, the 13 validation pairs and the smoke's pair into lab-j170 (each only
# where its decks.jsonl is not there yet: J170's pilot drew all 27 there, and they are kept; draws.py checks each against the registered
# sha256s, whoever drew it), then all of them again into the clone (absolute paths, so nothing is re-rooted)
K=0
for B in pauper peasant legacy powered pauper peasant legacy powered pauper peasant legacy powered pauper; do
  K=$((K + 1)); N=$(printf '%02d' $K)
  test -s /home/justin-a/code/lab/data/lab-j170/decks/s$N-$B-$((2000 + K))/decks.jsonl || tools/cubelab.sh decks --band $B --count 2 --seed $((2000 + K)) --cross-band 0.10 --out var/lab-j170/decks/s$N-$B-$((2000 + K))
  test -s /home/justin-a/code/lab/data/lab-j170/validation/v$N-$B-$((2200 + K))/decks.jsonl || tools/cubelab.sh decks --band $B --count 2 --seed $((2200 + K)) --cross-band 0.10 --out var/lab-j170/validation/v$N-$B-$((2200 + K))
  tools/cubelab.sh decks --band $B --count 2 --seed $((2000 + K)) --cross-band 0.10 --out "$PWD/var/lab-j171-local/redraw/s$N-$B-$((2000 + K))"
  tools/cubelab.sh decks --band $B --count 2 --seed $((2200 + K)) --cross-band 0.10 --out "$PWD/var/lab-j171-local/redraw/v$N-$B-$((2200 + K))"
done
test -s /home/justin-a/code/lab/data/lab-j170/decks/p-powered-2099/decks.jsonl || tools/cubelab.sh decks --band powered --count 2 --seed 2099 --cross-band 0.10 --out var/lab-j170/decks/p-powered-2099
tools/cubelab.sh decks --band powered --count 2 --seed 2099 --cross-band 0.10 --out "$PWD/var/lab-j171-local/redraw/p-powered-2099"
python3 -I var/lab-j171-local/bin/draws.py > var/lab-j171-local/draws.json || echo '{"data12":-1}' > var/lab-j171-local/draws.json
cat var/lab-j171-local/draws.json
# the engine self-tests: atlas-selftest with its G5, G6, cuts and D483 legs, then seat-identity
tools/cubelab.sh atlas-selftest --jobs 2 && echo 1 > var/lab-j171-local/selftest.txt || echo 0 > var/lab-j171-local/selftest.txt
tools/cubelab.sh seat-identity --jobs {workers} && echo 1 > var/lab-j171-local/identity.txt || echo 0 > var/lab-j171-local/identity.txt
# the readers on the self-test's own cuts legs
C=var/cubelab/atlas-selftest
python3 -I var/lab-j171-local/bin/labels.py cuts:selftest:0:464:selftest:$C/cuts nf:selftest:0:464:selftest:$C/cuts-noforge --out=var/lab-j171-local/labels-cuts.jsonl --training=1 > var/lab-j171-local/labels-cuts.json || true
python3 -I var/lab-j171-local/bin/reads.py cuts:selftest:$C/cuts/atlas.json nf:selftest:$C/cuts-noforge/atlas.json > var/lab-j171-local/reads-cuts.json || true
python3 -I var/lab-j171-local/bin/cuts.py $C/cuts $C/cuts-noforge > var/lab-j171-local/cuts-cuts.json || true
python3 -I -c "import json; l = json.load(open('var/lab-j171-local/labels-cuts.json')); r = json.load(open('var/lab-j171-local/reads-cuts.json')); c = json.load(open('var/lab-j171-local/cuts-cuts.json')); s = [json.load(open('var/cubelab/atlas-selftest/%s/atlas.json' % x))['phaseB']['schedule']['labels'] for x in ('cuts', 'cuts-noforge')]; ok = l['rowsUnmatched'] == 0 and l['labels'] == sum(s) and l['trainingRows'] == l['branched'] and l['branched'] >= 2 and r['forgeSpines'] == ['cuts'] and list(r['iv_bySpine']) == ['cuts'] and c['night']['spines'] == 2 and l['byListing']['D483']['rows'] == l['branched']; print(1 if ok else 0)" > var/lab-j171-local/readers-cuts.txt 2>/dev/null || echo 0 > var/lab-j171-local/readers-cuts.txt
# the smoke: J166's powered pair (J170's pilot's draw, kept) at game seed 2199, a new folder (J170's pilot-smoke-j170 is never read), every cut on at that scale (J169's smoke exactly), then its frame scan
P=/home/justin-a/code/lab/data/lab-j170/decks/p-powered-2099/decks
tools/cubelab.sh atlas --deck-a $P/powered-2099-00001.dck --deck-b $P/powered-2099-00002.dck --seed 2199 --phase b --decisions 2 --min-options 3 --screen 5 --early-stop 10,15,20 --branch-random 25 --branch-forge 5 --chunk 5 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/pilot-smoke-j171 || true
python3 -I var/lab-j171-local/bin/metrics.py --scan /home/justin-a/code/lab/data/lab-j170/pilot-smoke-j171 var/lab-j171-local/lost-smoke {workers} || true
python3 -I var/lab-j171-local/bin/labels.py smoke:random-powered-d486:2099:2199:$(cat var/lab-j171-local/sha.txt):/home/justin-a/code/lab/data/lab-j170/pilot-smoke-j171 --out=var/lab-j171-local/pilot-labels.jsonl --training=1 --lost=var/lab-j171-local/lost-smoke > var/lab-j171-local/pilot-labels.json || true
python3 -I var/lab-j171-local/bin/reads.py smoke:random-powered-d486:/home/justin-a/code/lab/data/lab-j170/pilot-smoke-j171/atlas.json > var/lab-j171-local/pilot-reads.json || true
python3 -I var/lab-j171-local/bin/cuts.py /home/justin-a/code/lab/data/lab-j170/pilot-smoke-j171 > var/lab-j171-local/pilot-cuts.json || true
python3 -I -c "import json; r = json.load(open('var/lab-j171-local/pilot-reads.json')); c = json.load(open('var/lab-j171-local/pilot-cuts.json')); print(1 if r['forgeSpines'] == ['smoke'] and 'smoke' in r['iv_bySpine'] and c['night']['spines'] == 1 and c['night']['branchGames'] >= 1 else 0)" > var/lab-j171-local/pilot-readers.txt 2>/dev/null || echo 0 > var/lab-j171-local/pilot-readers.txt
```
metrics: datadir = sh: cat var/lab-j171-local/datadir.txt 2>/dev/null || echo 0
metrics: state = sh: cat var/lab-j171-local/state.txt 2>/dev/null || echo 0
metrics: merged = sh: cat var/lab-j171-local/merged.txt 2>/dev/null || echo 0
metrics: has_d466_d472 = sh: cat var/lab-j171-local/has-d466-d472.txt 2>/dev/null || echo 0
metrics: has_d476 = sh: cat var/lab-j171-local/has-d476.txt 2>/dev/null || echo 0
metrics: has_d477 = sh: cat var/lab-j171-local/has-d477.txt 2>/dev/null || echo 0
metrics: has_d478 = sh: cat var/lab-j171-local/has-d478.txt 2>/dev/null || echo 0
metrics: has_d479 = sh: cat var/lab-j171-local/has-d479.txt 2>/dev/null || echo 0
metrics: has_d480 = sh: cat var/lab-j171-local/has-d480.txt 2>/dev/null || echo 0
metrics: has_d480f = sh: cat var/lab-j171-local/has-d480f.txt 2>/dev/null || echo 0
metrics: has_d481 = sh: cat var/lab-j171-local/has-d481.txt 2>/dev/null || echo 0
metrics: has_d482 = sh: cat var/lab-j171-local/has-d482.txt 2>/dev/null || echo 0
metrics: has_d483 = sh: cat var/lab-j171-local/has-d483.txt 2>/dev/null || echo 0
metrics: has_d484 = sh: cat var/lab-j171-local/has-d484.txt 2>/dev/null || echo 0
metrics: has_d485 = sh: cat var/lab-j171-local/has-d485.txt 2>/dev/null || echo 0
metrics: has_d486 = sh: cat var/lab-j171-local/has-d486.txt 2>/dev/null || echo 0
metrics: d481_d486_commits = sh: cat var/lab-j171-local/has-d481-d486-commits.txt 2>/dev/null || echo 0
metrics: golden = sh: cat var/lab-j171-local/golden.json 2>/dev/null || echo '{"descends":-1}'
metrics: found = sh: cat var/lab-j171-local/found.json 2>/dev/null || echo '{"spineDraws":-1}'
metrics: xmx_unset = sh: cat var/lab-j171-local/xmx-unset.txt 2>/dev/null || echo 0
metrics: nodetests = sh: cat var/lab-j171-local/nodetests.txt 2>/dev/null || echo 0
metrics: redaction_self = sh: cat var/lab-j171-local/redaction-self.txt 2>/dev/null || echo 0
metrics: labels_self = sh: cat var/lab-j171-local/labels-self.txt 2>/dev/null || echo 0
metrics: void_self = sh: cat var/lab-j171-local/void-self.txt 2>/dev/null || echo 0
metrics: reads_self = sh: cat var/lab-j171-local/reads-self.txt 2>/dev/null || echo 0
metrics: cuts_self = sh: cat var/lab-j171-local/cuts-self.txt 2>/dev/null || echo 0
metrics: metrics_self = sh: cat var/lab-j171-local/metrics-self.txt 2>/dev/null || echo 0
metrics: labels_j166_self = sh: cat var/lab-j171-local/labels-j166-self.txt 2>/dev/null || echo 0
metrics: reads_j166_self = sh: cat var/lab-j171-local/reads-j166-self.txt 2>/dev/null || echo 0
metrics: cuts_j166_self = sh: cat var/lab-j171-local/cuts-j166-self.txt 2>/dev/null || echo 0
metrics: labels_s04_self = sh: cat var/lab-j171-local/labels-s04-self.txt 2>/dev/null || echo 0
metrics: labels_j168_self = sh: cat var/lab-j171-local/labels-j168-self.txt 2>/dev/null || echo 0
metrics: reads_j168_self = sh: cat var/lab-j171-local/reads-j168-self.txt 2>/dev/null || echo 0
metrics: cuts_j168_self = sh: cat var/lab-j171-local/cuts-j168-self.txt 2>/dev/null || echo 0
metrics: compare_self = sh: cat var/lab-j171-local/compare-self.txt 2>/dev/null || echo 0
metrics: metrics_j168_self = sh: cat var/lab-j171-local/metrics-j168-self.txt 2>/dev/null || echo 0
metrics: lost_self = sh: tail -n 1 var/lab-j171-local/lost-self.txt 2>/dev/null || echo 0
metrics: draws = sh: cat var/lab-j171-local/draws.json 2>/dev/null || echo '{"data12":-1}'
metrics: selftest = sh: cat var/lab-j171-local/selftest.txt 2>/dev/null || echo 0
metrics: identity = sh: cat var/lab-j171-local/identity.txt 2>/dev/null || echo 0
metrics: readers_cuts = sh: cat var/lab-j171-local/readers-cuts.txt 2>/dev/null || echo 0
metrics: pilot_readers = sh: cat var/lab-j171-local/pilot-readers.txt 2>/dev/null || echo 0
metrics: pilot = sh: python3 -I var/lab-j171-local/bin/pilot.py 2>/dev/null || echo '{"smoke":{"problems":-1}}'
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
check: d481_d486_commits == 1
check: golden.descends == 1
check: golden.changed == 1
check: golden.note == 1
check: xmx_unset == 1
check: nodetests == 1
check: redaction_self == 1
check: labels_self == 1
check: void_self == 1
check: reads_self == 1
check: cuts_self == 1
check: metrics_self == 1
check: labels_j166_self == 1
check: reads_j166_self == 1
check: cuts_j166_self == 1
check: labels_s04_self == 1
check: labels_j168_self == 1
check: reads_j168_self == 1
check: cuts_j168_self == 1
check: compare_self == 1
check: metrics_j168_self == 1
check: lost_self == 1
check: draws.data12 == 1
check: draws.s04Data == 1
check: draws.s04Deck1 == 1
check: draws.all13 == 1
check: draws.decks13 == 13
check: draws.smokeData == 1
check: draws.validationData == 1
check: draws.redraw13 == 1
check: draws.redrawDecks13 == 13
check: draws.smokeRedraw == 1
check: draws.validationRedraw == 1
check: selftest == 1
check: identity == 1
check: readers_cuts == 1
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
check: pilot.smoke.problems == 0
check: pilot.smoke.cuts == 1
check: pilot.smoke.branchedInFull == 2
check: pilot.smoke.unitsOk >= pilot.smoke.unitsPlanned
check: pilot.smoke.g6 == 1
check: pilot.smoke.zeroX == 0
check: pilot.smoke.d479 == 1
check: pilot.smoke.branches >= 1
check: pilot.smoke.timeouts == 0
check: pilot.smoke.guardViolations == 0
check: pilot.smoke.branchTimeoutSec == 120
check: pilot.smoke.labels == 2
check: pilot.smoke.rowsUnmatched == 0
check: pilot.smoke.voidLabels == 0
check: pilot.smoke.trainingRows == pilot.smoke.branchedRows
check: pilot.smoke.identities == 1
check: pilot.smoke.repeatedPlays == 0
check: pilot.smoke.scan.scanned == 1
check: pilot.smoke.scan.lostCastOptions == 0

## Commands
One block a spine, s01 to s13 in the table's order (run1-run13), then the scan of the 13 spines' frames (run14), then the Report.
Every atlas command resumes what is done. A spine atlas that finds a problem exits 3 and the job goes on (the exit is kept in
`exits.txt`; `atlas.problems == 0` fails the job at the end). Each block asserts the data folder, its 50 GB and its own decks --
the pilot's draw, byte for byte the registered one -- before it plays. **Expected wall: ~10 h for the 13 at 6 workers, 22-75 min a
spine at J168's pace**; the 3-h block timeout is ~2.4x the longest.
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J171: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J171: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J171
D=/home/justin-a/code/lab/data/lab-j170
n=b-s01-pauper-2101; K0=$D/decks/s01-pauper-2001; A=$K0/decks/pauper-2001-00001.dck; B=$K0/decks/pauper-2001-00002.dck
# s01's decks: the pilot's draw, byte for byte the registered one (the folder's draw, then each deck)
test "$(python3 -I var/lab-j171-local/bin/drawsha.py $K0)" = "a40fb5addec594bd6e97b0e7b16d78af1f08280dcc555366b3a2301feda4ff34 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = b734b44f5657a34d42179d3d634f2bcedbfb8896057a576270dd387939f12eee && test "$(sha256sum < $B | cut -d ' ' -f 1)" = 43565999f47b1ce5757f69c93e47a3fd3559db6e78b4a7c7e6f837603bbdf87f || { echo "J171: $n: the decks under $K0 are not the registered draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2101 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 40 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J171: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J171: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J171
D=/home/justin-a/code/lab/data/lab-j170
n=b-s02-peasant-2102; K0=$D/decks/s02-peasant-2002; A=$K0/decks/peasant-2002-00001.dck; B=$K0/decks/peasant-2002-00002.dck
# s02's decks: the pilot's draw, byte for byte the registered one (the folder's draw, then each deck)
test "$(python3 -I var/lab-j171-local/bin/drawsha.py $K0)" = "86ccaaf3b3ba6f5959aacf073a9dc0465aadf1a9d02ddac8eac695091eaea576 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = 3519db7d8a57ce08e1cf0094568d28b5011735a83f4025356204b60219c0ca88 && test "$(sha256sum < $B | cut -d ' ' -f 1)" = 7196dc7b7545dd532c7f796938549dc53193adbf9fa8d199a49259bfe90bb467 || { echo "J171: $n: the decks under $K0 are not the registered draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2102 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J171: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J171: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J171
D=/home/justin-a/code/lab/data/lab-j170
n=b-s03-legacy-2103; K0=$D/decks/s03-legacy-2003; A=$K0/decks/legacy-2003-00001.dck; B=$K0/decks/legacy-2003-00002.dck
# s03's decks: the pilot's draw, byte for byte the registered one (the folder's draw, then each deck)
test "$(python3 -I var/lab-j171-local/bin/drawsha.py $K0)" = "0e9d8c744abd6eff72d2fc1cca4003c7cecfdb85830c077d8c29e16891bfacc1 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = 56e4c68f74512c2e979fe195aad045e78600146520783bb0c2dfc83300525ea8 && test "$(sha256sum < $B | cut -d ' ' -f 1)" = 67bd6d92c06d63c682d76cff88aca6fff78817663abb432b2c898dd0ea51ff8f || { echo "J171: $n: the decks under $K0 are not the registered draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2103 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J171: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J171: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J171
D=/home/justin-a/code/lab/data/lab-j170
n=b-s04-powered-2104; K0=$D/decks/s04-powered-2004; A=$K0/decks/powered-2004-00001.dck; B=$K0/decks/powered-2004-00002.dck
# s04's decks: the pilot's draw, byte for byte the registered one (the folder's draw, then each deck)
test "$(python3 -I var/lab-j171-local/bin/drawsha.py $K0)" = "81c4dd22dcdbd1a110b0339476cbab04e8f6d2791f1881e42499b97f8675dc00 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = 873bb7e41c40f2ad4a40fbd8e3abf7185820fa93b1e90c40d2abff5907e3f003 && test "$(sha256sum < $B | cut -d ' ' -f 1)" = f4f21079d66515481315687b3d369fd2a41d5dcac26a540b843552cee09b36d1 || { echo "J171: $n: the decks under $K0 are not the registered draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2104 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J171: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J171: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J171
D=/home/justin-a/code/lab/data/lab-j170
n=b-s05-pauper-2105; K0=$D/decks/s05-pauper-2005; A=$K0/decks/pauper-2005-00001.dck; B=$K0/decks/pauper-2005-00002.dck
# s05's decks: the pilot's draw, byte for byte the registered one (the folder's draw, then each deck)
test "$(python3 -I var/lab-j171-local/bin/drawsha.py $K0)" = "afc7ce320e966d96e5c92ec9d28c357e6f603c59927f677549ce261227b1b92e 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = d2c9c9c0d7a4823bb02de196f7ca13d7fb9f2d3c9c2cdd105d4a8f3932bce72f && test "$(sha256sum < $B | cut -d ' ' -f 1)" = 37828917f92483f367b656d071ea09a72836b7cc7242d1db9556e926f23b28b3 || { echo "J171: $n: the decks under $K0 are not the registered draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2105 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J171: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J171: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J171
D=/home/justin-a/code/lab/data/lab-j170
n=b-s06-peasant-2106; K0=$D/decks/s06-peasant-2006; A=$K0/decks/peasant-2006-00001.dck; B=$K0/decks/peasant-2006-00002.dck
# s06's decks: the pilot's draw, byte for byte the registered one (the folder's draw, then each deck)
test "$(python3 -I var/lab-j171-local/bin/drawsha.py $K0)" = "191a5d8aac5d516f5472f0a01a0cacf660a9fa931e70b806a42723e4dfba161f 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = f0b8532d0e13788503f751dc239f4f02e459239aa745f73b4178dfdc880d5c2f && test "$(sha256sum < $B | cut -d ' ' -f 1)" = b90d1ae102f4b9b7a8dfbbfbbd4080bfbb026b962eb0db1c7a40a6a4b35d1072 || { echo "J171: $n: the decks under $K0 are not the registered draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2106 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J171: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J171: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J171
D=/home/justin-a/code/lab/data/lab-j170
n=b-s07-legacy-2107; K0=$D/decks/s07-legacy-2007; A=$K0/decks/legacy-2007-00001.dck; B=$K0/decks/legacy-2007-00002.dck
# s07's decks: the pilot's draw, byte for byte the registered one (the folder's draw, then each deck)
test "$(python3 -I var/lab-j171-local/bin/drawsha.py $K0)" = "5287d2666529b6dd35ec4a271a1b71c5b01d8096bcf1c3acd114945c7a435636 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = 8e72218462697f717590ba1e1ce17bdbc16418709c6658e3e89c9d39370fb01b && test "$(sha256sum < $B | cut -d ' ' -f 1)" = 357bebd01ee8c9bf4ba853ff9a9960ae7a64d8a83ce760bb23a3b506992445ee || { echo "J171: $n: the decks under $K0 are not the registered draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2107 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 40 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J171: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J171: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J171
D=/home/justin-a/code/lab/data/lab-j170
n=b-s08-powered-2108; K0=$D/decks/s08-powered-2008; A=$K0/decks/powered-2008-00001.dck; B=$K0/decks/powered-2008-00002.dck
# s08's decks: the pilot's draw, byte for byte the registered one (the folder's draw, then each deck)
test "$(python3 -I var/lab-j171-local/bin/drawsha.py $K0)" = "d653b4cf2bf2d94649449caaf174d21453cd34b58972c3e22ea8e26dacf75f71 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = 6c664df890ade41bed55feb2841826c6212b289a501cac8e0caf1755209f70c8 && test "$(sha256sum < $B | cut -d ' ' -f 1)" = 0eafaf9796cbf83792c257a29532d6d07fef807f629737209c8875a5b3eb8b8f || { echo "J171: $n: the decks under $K0 are not the registered draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2108 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J171: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J171: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J171
D=/home/justin-a/code/lab/data/lab-j170
n=b-s09-pauper-2109; K0=$D/decks/s09-pauper-2009; A=$K0/decks/pauper-2009-00001.dck; B=$K0/decks/pauper-2009-00002.dck
# s09's decks: the pilot's draw, byte for byte the registered one (the folder's draw, then each deck)
test "$(python3 -I var/lab-j171-local/bin/drawsha.py $K0)" = "1216932fb9807608a5bf859ac768e12efa40c031fc685f16b56b274a2bbf7601 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = da1c0de93863a59de35390647adce822a81cbfbc86cfdec9fbaacd7fabf3dd4b && test "$(sha256sum < $B | cut -d ' ' -f 1)" = 332d6216ea0ae96dbbef39544174aa3f17fe9521a49cca2c43c0d63f308524bd || { echo "J171: $n: the decks under $K0 are not the registered draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2109 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J171: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J171: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J171
D=/home/justin-a/code/lab/data/lab-j170
n=b-s10-peasant-2110; K0=$D/decks/s10-peasant-2010; A=$K0/decks/peasant-2010-00001.dck; B=$K0/decks/peasant-2010-00002.dck
# s10's decks: the pilot's draw, byte for byte the registered one (the folder's draw, then each deck)
test "$(python3 -I var/lab-j171-local/bin/drawsha.py $K0)" = "e4676bda05d0204f3ce43e3f8d1ee1a0ca0c8e24c7f8cf09860423d00ddedd9b 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = d051adba41580377b7b1f627bc62f40ae25b5bac182c37f8bd7ec877bba6ce59 && test "$(sha256sum < $B | cut -d ' ' -f 1)" = 3ee08305330298d022189e0404dc8e0d0c874acb6e0a61ffea3ecb71ddb48b1d || { echo "J171: $n: the decks under $K0 are not the registered draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2110 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J171: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J171: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J171
D=/home/justin-a/code/lab/data/lab-j170
n=b-s11-legacy-2111; K0=$D/decks/s11-legacy-2011; A=$K0/decks/legacy-2011-00001.dck; B=$K0/decks/legacy-2011-00002.dck
# s11's decks: the pilot's draw, byte for byte the registered one (the folder's draw, then each deck)
test "$(python3 -I var/lab-j171-local/bin/drawsha.py $K0)" = "4ca069ba7bdae91d218e589a41c28da836c7544da53577d14c5994aa64ca8642 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = bc53db533642c7a538d93f53cf11951d98e1c36803425c3dcc84d6850860b749 && test "$(sha256sum < $B | cut -d ' ' -f 1)" = 6a4856eac6d82235f865bb6c30d8eb2a1b0ff0cf9c92f5c1acc615c598368cf6 || { echo "J171: $n: the decks under $K0 are not the registered draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2111 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J171: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J171: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J171
D=/home/justin-a/code/lab/data/lab-j170
n=b-s12-powered-2112; K0=$D/decks/s12-powered-2012; A=$K0/decks/powered-2012-00001.dck; B=$K0/decks/powered-2012-00002.dck
# s12's decks: the pilot's draw, byte for byte the registered one (the folder's draw, then each deck)
test "$(python3 -I var/lab-j171-local/bin/drawsha.py $K0)" = "5d49d21add4ba8cc269babde10dc63c7b7885e94b1df7437d217e02bd2db820d 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = 54799f7d33dc4ddcd584bca5792d20a260ebca303cb5fcb3a1153d65fdfb3734 && test "$(sha256sum < $B | cut -d ' ' -f 1)" = 03ac3948646b52acab0485f6dcaa9cb471519060c04fb90d20925351ba461815 || { echo "J171: $n: the decks under $K0 are not the registered draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2112 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J171: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J171: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J171
D=/home/justin-a/code/lab/data/lab-j170
n=b-s13-pauper-2113; K0=$D/decks/s13-pauper-2013; A=$K0/decks/pauper-2013-00001.dck; B=$K0/decks/pauper-2013-00002.dck
# s13's decks: the pilot's draw, byte for byte the registered one (the folder's draw, then each deck)
test "$(python3 -I var/lab-j171-local/bin/drawsha.py $K0)" = "6f20b45b168bf6ba0e365bf27e507e31c431eb76c6f389336cfc8db3e3752591 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = 222547d0e174b42e63e2c711c8ee11167b273b7015818d00079d720178927969 && test "$(sha256sum < $B | cut -d ' ' -f 1)" = cbaec2c6669cb188abd6334743ccc76455b201bbb4c538d2155ced378c4d6f88 || { echo "J171: $n: the decks under $K0 are not the registered draw" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2113 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 40 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
# the lost casts and D486's counters, from the frames: one cache a spine folder, stamped with its atlas.json's mtime
D=/home/justin-a/code/lab/data/lab-j170
mkdir -p var/lab-j171-local/lost
for d in $D/b-s??-*-21??; do
  test -f $d/atlas.json || { echo "J171: $d: no atlas.json, not scanned"; continue; }
  python3 -I var/lab-j171-local/bin/metrics.py --scan $d var/lab-j171-local/lost {workers}
done
```
cores: 1
```bash
D=/home/justin-a/code/lab/data/lab-j170
mkdir -p $D/report
: > $D/report/missing.txt
T=$D/spine-times.txt
SHA=$(cat var/lab-j171-local/sha.txt)
LO="--lost=var/lab-j171-local/lost --training=1 --times=$T"
args=""; largs=""; dirs=""
# the night's 13 spines: b-s??-*-21?? matches no pilot folder; every row names the pin and its band's D486 pool
for d in $D/b-s??-*-21??; do
  n=$(basename "$d"); s=$(echo "$n" | cut -d- -f2); b=$(echo "$n" | cut -d- -f3); g=$(echo "$n" | cut -d- -f4)
  if [ -f "$d/atlas.json" ]; then
    cp "$d/atlas.json" "$D/report/$n.atlas.json"
    cp "$d/atlas.md" "$D/report/$n.atlas.md" || echo "$n: no atlas.md" >> $D/report/missing.txt
    largs="$largs $s:random-$b-d486:$((g - 100)):$g:$SHA:$d"; args="$args $s:random-$b-d486:$d/atlas.json"; dirs="$dirs $d"
  else
    echo "$n: no atlas.json" >> $D/report/missing.txt
  fi
done
for f in var/lab-j171-local/lost/*.json; do cp "$f" "$D/report/lost-$(basename "$f")"; done || echo "lost caches: none" >> $D/report/missing.txt
python3 -I var/lab-j171-local/bin/labels.py $largs --out=$D/report/labels.jsonl $LO > $D/report/labels.json || echo "labels.py exited $?" >> $D/report/missing.txt
head -n 20 $D/report/labels.jsonl > $D/report/labels-head.jsonl || echo "labels.jsonl: none" >> $D/report/missing.txt
python3 -I var/lab-j171-local/bin/reads.py $args > $D/report/reads.json || echo "reads.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j171-local/bin/cuts.py $dirs --times=$T > $D/report/cuts.json || echo "cuts.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j171-local/bin/compare.py $D $D/report/labels.json > $D/report/compare-j168.json || echo "compare.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j171-local/bin/metrics.py > $D/report/tool.json || echo "metrics.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j171-local/bin/draws.py --report > $D/report/draws.json || echo "draws.py exited $?" >> $D/report/missing.txt
# the validation draw (J166's, made again by this pilot, never branched), recorded for the job that will branch it
python3 -I -c "import glob, json, os; D = '$D'; vs = sorted(glob.glob(D + '/validation/v*')); rows = [{'set': os.path.basename(v).split('-')[0], 'band': os.path.basename(v).split('-')[1], 'pool': 'random-' + os.path.basename(v).split('-')[1], 'deckSeed': int(os.path.basename(v).split('-')[2]), 'reservedGameSeed': int(os.path.basename(v).split('-')[2]) + 100, 'decks': sorted(glob.glob(v + '/decks/*.dck')), 'split': 'validation', 'training': False} for v in vs]; print(json.dumps({'note': 'the 4a validation draw (J166), made again by the J170 pilot into lab-j170 at deck seeds 2201-2213 (D447, --cross-band 0.10; D482 changes none of it) and kept by the J171 pilot: deck files only, never branched; no job may train on these decks or use these seeds before the validation job that branches them', 'drawSha256': '7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de', 'sets': rows}, indent=1))" > $D/report/validation.json || echo "validation.json: failed" >> $D/report/missing.txt
python3 -I -c "import glob, json, os; D = '$D'; out = {}; [out.__setitem__(os.path.basename(d), {k: json.load(open(d + '/plan.json')).get(k) for k in ('deckA', 'deckB', 'seed', 'branchRandom', 'branchForge', 'decisions', 'chunk', 'cuts')}) for d in sorted(glob.glob(D + '/b-s??-*-21??'))]; print(json.dumps({'note': 'all 13 spines branched fresh by J171 at the pin, by D486s random seat (a new population: never pooled with J166-J169)', 'sha': '$SHA', 'spines': out}, indent=1))" > $D/report/spines.json || echo "spines.json: failed" >> $D/report/missing.txt
for f in exits.txt spine-times.txt; do cp $D/$f $D/report/$f || echo "$f: none" >> $D/report/missing.txt; done
# disarm the abort gate: a re-post of this file starts disarmed until its own pilot
rm -f var/lab-j171-local/armed.txt
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
check: atlas.s04NewDeck == 1
check: atlas.scuteDecks == 0
check: atlas.d483Spines == 13
check: atlas.pre483Spines == 0
check: atlas.identityListingsShort == 0
check: atlas.repeatedPlays == 0
check: atlas.lostCastScanned == 13
check: atlas.lostCastOptions == 0
check: atlas.cardTargetOffered >= 1

## Abort if
abort: armed == 1 and unit_errors > 20
abort: armed == 1 and engine_errors > 500
abort: armed == 1 and big_frames >= 6
abort: data_free_gb < 50
`armed` is 1 only from this job's pilot to its Report block, so the first three cannot read another run's files; and every count
reads `lab-j170/b-s??-*-21??`, which only this job writes. **`big_frames`** is J167's hung s05's signature (a frame log over 200
MB, where a sound branch's is kilobytes); D484 makes it impossible, and if it fires a loop D484 does not cover is back -- D486's
cast-time hook is new code inside a cast, so it is watched from the first spine. `unit_errors == 0` means every unit of the 13
spines finished; `atlas.unitsShort` and `atlas.fullShort` as J169. **`atlas.problems == 0`** includes the redaction check over
every frame log, so D486's new record shapes (cards in target options, `source: "modes"`, `why: "MODES_DRAWN"`, the two new
guardrail names) are checked on every spine by the checker D486 amended. **`atlas.lostCastOptions == 0`** fails if any option of
any spine lost its own forced cast in more than half of its branches (a modal spell D486 does not cover, a new tool gap); the
summary names the spine, the option and the card. **`atlas.cardTargetOffered >= 1`** fails a night whose random seats never
offered a card-only play: not D486's seat. **A random library deck can meet a card no atlas has played**: a new tool gap fails
`atlas.problems == 0`, its spine's exit 3 is kept, and the summary names it with its error text and cost. An option capped past
0.25 is a warning, reported, never a failed check.

## Report
collect: /home/justin-a/code/lab/data/lab-j170/report/*.atlas.md
collect: /home/justin-a/code/lab/data/lab-j170/report/*.atlas.json
collect: /home/justin-a/code/lab/data/lab-j170/report/labels.json
collect: /home/justin-a/code/lab/data/lab-j170/report/labels-head.jsonl
collect: /home/justin-a/code/lab/data/lab-j170/report/reads.json
collect: /home/justin-a/code/lab/data/lab-j170/report/cuts.json
collect: /home/justin-a/code/lab/data/lab-j170/report/tool.json
collect: /home/justin-a/code/lab/data/lab-j170/report/compare-j168.json
collect: /home/justin-a/code/lab/data/lab-j170/report/lost-*.json
collect: /home/justin-a/code/lab/data/lab-j170/report/draws.json
collect: /home/justin-a/code/lab/data/lab-j170/report/validation.json
collect: /home/justin-a/code/lab/data/lab-j170/report/spines.json
collect: /home/justin-a/code/lab/data/lab-j170/report/exits.txt
collect: /home/justin-a/code/lab/data/lab-j170/report/spine-times.txt
collect: /home/justin-a/code/lab/data/lab-j170/report/missing.txt
The summary says, for Justin, in plain words and numbers only:
- **The population, first line:** random library decks by band, drawn as the census draws them (D447, D482), on the cut design;
  **all 13 spines branched by J171 at the pin, by D486's random seat** -- a new population, `training: true`, `pool:
  random-<band>-d486`, contract v4, never pooled with J156-J169's labels or any read from before D486.
- **The run:** exits, walls per spine and for the night (against J168's 10 h 08 for the same 13), rows, timeouts, unit errors,
  engine errors, capped, D479's and D477's counters, disk.
- **Labels per night** (`labels.json` (c)): labels and confident labels per spine, per band and for the night; **the sizing read:
  confident labels per 7-worker 10-h night with its Poisson 95% interval** (`c_sizingRead`); beside it, **as a DIFFERENT
  population**, J168's 31.1 [20.5, 45.2] and the review's ~25-27; what 1,000 labels and 1,000 confident labels take at this rate.
- **What the cuts saved** (`cuts.json`): branch time saved (early stop; screen) against J168's 31.9% (15.3; 16.6), the idle
  share, **the checks' wall and share** against J168's 0.50 h and 4.9%.
- **D486's counters** (`tool.json`, `lost-*.json`): `cardTargetOffered` and the randomised priority listings with
  `cardTargetShare`, per spine and for the night (D486's s05 reproduction: 11.9%), and on how many spines it fired; `modesDrawn`
  (the seats') beside `modesDrawnRows` / `modesDrawnOnRows` (the branch rows), with the spines and decks where it fired;
  `modesDrawnRecords` and `modesSourceRecords`; the target records, those listing a card, those complete, and any that list a
  card and are not complete (information: an answer outside the engine's candidates). D485's `retargeted` / `staleRefused` and
  `staleTargetRecords`, D484's guard rows, as information.
- **The lost casts** (`lost-*.json`): per spine, lost casts, the branches with one, the forced ones, the lost-cast options
  (checked 0), and **if any cast was lost, which spell, by name and spine** and in which map; `failed_to_target` in the logs
  beside it (information: the logs undercount).
- **The three Forge-map spines:** **(iv)** C1 on s01, s07, s13, HOLDS / NOT SHOWN, with J168's values beside as another
  population (s01 +4.1 [0.9, 7.5] HOLDS; s07 -5.3 [-9.5, -1.8], s13 -2.1 [-3.4, -1.2] NOT SHOWN); **(i)-(iii)** same best, rho,
  regret by kind, `confidentForge`; C2 and the random-map C1 on the other ten as information.
- **J171 beside J168, across populations** (`compare-j168.json`): **a table, one row a spine and a night row**, with J168's and
  J171's decisions listed per baseline turn, options per decision in full, labels / confident labels and the confident share, mean
  regret at Forge's choice, capped share and wall; J168's column names who branched it (J166 at 325c2dd8 for s01-s03, J167 at
  bf978690 for s04, J168 at 26a8db00 for s05-s13); s06's and s10's J169 re-branch (D485) mentioned by name only if J169's read is
  in. **Labelled across populations, no verdict:** a difference is a candidate.
- **(a)** the confident share by pool, kind and k, **(b)**, **(v)**, **D483** (identities, 0 short, 0 repeated), **per spine** one
  line (decks, baseline, listed, in full / screened / fill, options, labels / confident, wall), **the validation draw** (made
  again, `7def89fa...`, never branched), **the checks** with any exit explained, **the intervals' coarseness**, and **the label
  set** (`labels.jsonl`'s rows, v4's fields, one random seat, one commit; the spine folders kept for rung 4).
- **No verdict** beyond (iv)'s: any other surprise is a candidate until a fresh draw shows it.
