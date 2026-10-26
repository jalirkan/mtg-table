id: J169
title: The move atlas, rung 4a, night four -- J168's night mended on the merged tree of D485 (the random seat re-targets or refuses a play whose targets went stale instead of handing the engine an illegal cast; the redaction checker accepts the viewer's own token that ceased to exist): J168's s06, s10 and s13 RE-CHECKED under D485's checker by resuming their finished atlases (no game replayed); J168's s06 and s10 moved aside, never deleted, and RE-BRANCHED fresh on D485's tree at the same decks and seeds (every cut on, chunk 25); s05 kept as J168 left it, its labels marked biased by its lost Suplex and Abrade casts and kept out of the headline sizing read (D486's later night re-branches it); a new check from the frames: no option of a re-branched spine loses its own forced cast in most of its branches; the Report over all 13 spines, labels contract v3. Pre-registered reads, numbers only; no outcome rule beyond D451's and J156's (iv). Never pooled with J156's, J157's, J158's or J162's labels
public_title: Move atlas 4a night four: stale targets mended
public_est: ~2 h 30 to 3 h 30
public_decides: None by itself; 4a night mended: two spines re-branched without lost spells
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2.7
repos: mtg-table@e9f7ed0c2df633bb5587ebb757788607a1beb5d8 (origin/main: the merge of D485 on 26a8db00; the owner writes the merge's sha here before posting; merged == 1 and the commits that added D481-D485's decision files checked by the pilot)
decides: nothing by itself. Rung 4a's night, mended: J168 (2026-10-25) finished the 13 spines but failed `atlas.problems == 0` on s06, s10 and s13 (the redaction checker flagged the viewer's own dead token in Forge's stale target lists), and its read found the random seat losing spells it had paid for -- s10 8.7% of its branches, s06 2.7%, s05 18% (Suplex; J169's frame scan adds Abrade) -- with 6 of the night's 27 confident labels doubtful. D485 mends the stale-target loss (s06, s10) and the checker; it does not mend s05's modal spells (D486, a later night). J169 re-checks s06, s10 and s13 under D485's checker, re-branches s06 and s10 on D485's tree, and measures the night again on 13 spines with s05 marked: labels and confident labels per spine and night, the lost casts per spine from the frames, and D485's counter
hypothesis: none to confirm about the maps. Registered expectations, as information: D485's checker passes J168's s06, s10 and s13 (exit 0, 0 problems; D485's sweep: 26,450 + 13,850 logs, 0 FAIL); the re-branched s06 and s10 lose no option's own forced cast in most of its branches (a check) and lose few casts at all (J168: s06 212 lost casts in 201 branches, s10 514 in 512; D485's s10 reproduction: 0 "failed to target" lines), `retargeted` firing on both (D485's s10 sample: 20 of 215 rows); s06's and s10's walls near J168's (75 and 52 min; D485's sample ran ~20% slower). The sizing read, all 13 as run: J168's 31.1 confident labels per 7-worker 10-h night (27 confident) and 32.4 without s05; the review's ~25-27
rule: D451 (method; no outcome rule) with D458/D462/D466 (G5), D459, D465, D466, D467, D470, D471 (G6), D472, D476, D477, D478, D479, D480 (the cuts) and its follow-up (the schedule's plan-hash guard), D481, D482, D483, D484 and D485 (the random seat's stale targets: re-targeted or refused, `retargeted` on the branch row, why "STALE_TARGETS" on the decision record, guardrails `retargeted` and `staleRefused`; the M55 audit's ceased-to-exist rule). Pre-registered here, before any J169 data: the label contract v3 and its reads (a)-(c) computed by var/lab-j169-local/bin/labels.py, the agreement reads (i)-(vi) by reads.py, the savings by cuts.py, the tool's counters and the lost casts by metrics.py, all exactly as written in the pilot. The final check `lostCastOptionsD485 == 0` (no option of the re-branched s06 or s10 loses its own forced cast in more than half of its branches) is registered here. A candidate of (iv) HOLDS on a spine only if its point is > 0 and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. Every other difference is a candidate (D447 point 9). No read carries any other verdict
followup: morning-read
est: ~2.75 h at 6 workers (range 2.5-3.5 h; sizing below): pilot ~15 min (the readers' self-tests on J168's 13 spines and the lost-cast scan's on six of them added); run1 ~10 min (two moves, three re-checks); s06 ~75 min and s10 ~52 min at J168's pace (D485's sample ran ~20% slower: up to ~90 and ~64); the lost-cast scan of 15 folders ~4 min; the report ~3 min. Disk ~1.6 GB more on the lab data folder /home/justin-a/code/lab/data (J168's s06 and s10: 0.8 GB each, kept aside)
resumable: yes
timeout: 3h
progress: lines /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/branches.jsonl of 71525
metrics: branches = lines /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/branches.jsonl
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/branches.jsonl "\"engineError\":true"
metrics: branch_timeouts = count /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/branches.jsonl "\"timedOut\":true"
metrics: unavailable = count /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/branches.jsonl "\"unavailable\":\""
metrics: retargeted_rows = count /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/branches.jsonl "\"retargeted\":"
metrics: unit_errors = count /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/units.jsonl "\"ok\":false"
metrics: payfail = count /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/logs/*.log "Didn't find what to pay for"
metrics: failed_to_target = count /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/logs/*.log "failed to target"
metrics: big_frames = sh: python3 -c "import glob, os; print(sum(1 for d in glob.glob('/home/justin-a/code/lab/data/lab-j166/b-s??-*-21??') if os.path.exists(d + '/plan.json') and os.path.getmtime(d + '/plan.json') > 1792972283 for f in glob.glob(d + '/phaseB/frames/*.gz') if os.path.getsize(f) > 2e8))" 2>/dev/null || echo 0
metrics: armed = sh: cat var/lab-j169-local/armed.txt 2>/dev/null || echo 0
metrics: atlas = sh: python3 -I var/lab-j169-local/bin/metrics.py 2>/dev/null || echo '{"problems":-1}'
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: data_used_gb = sh: python3 -c "import os; print(round(sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk('/home/justin-a/code/lab/data/lab-j166') for f in fs) / 1e9, 2))" 2>/dev/null || echo 0
headline: branches, atlas.spinesDone, atlas.labels, atlas.confident, atlas.confidentPer7Worker10hNight, atlas.confidentPer7Unbiased, atlas.lostCastsD485, atlas.lostCastOptionsD485, atlas.lostCastOptions, atlas.retargetedRows, atlas.retargeted, atlas.recheckJ169Ok, atlas.timeoutShare, atlas.chooseSourceGuardRows, atlas.problems

**Why.** J166 began rung 4a's night (13 spines of random library decks, drawn as the census draws them, D447, on D480's
cut design, labels `training: true`); J167 and J168 finished it. **J168 (2026-10-25, 12:14-19:51, STATUS `failed`)**
branched s05-s13 at 26a8db00: every block exit 0, 71,525 branch rows over the 13 spines, 0 engine errors, 0 timeouts,
97 labels and 27 confident, 31.1 confident labels per 7-worker 10-h night; 43 of 44 final checks passed and
`atlas.problems == 0` read **3**: the redaction check alone, on s06 (2 frame logs), s10 (16) and s13 (6). Its read
(`results/J168/summary.md`, `report/stranded.md`, `report/labels-recheck.md`) found the cause and a worse one:
- **Not a leak.** Each flagged id is the viewer's own token that had already died or gone back to its hand, still in
  Forge's target list for the viewer's own spell (Troll Negotiations and Knockout Maneuver on s06 and s10, Tamiyo's
  Safekeeping on s13): Forge's `FightAi` only appends targets, and the random seat handed Forge's answer to the engine as
  it was.
- **A spell paid for and lost.** With an over-full or dead list, `MagicStack.add` refuses the spell after the card has
  gone to the stack and the mana is spent ("failed to target"): **s10 512 of 5,875 branch games (8.7%), s06 201 of 7,350
  (2.7%), s02 7, and s05 991 of 5,500 (18.0%, Suplex, a modal spell: four of s05's options lost their own cast in every
  branch, and s05 d8's confident label measures throwing Suplex away)**. The worker logs undercount (s05: 453 lines for
  991 lost casts); the frames do not.
- **6 of the 27 confident labels are doubtful** (s05 d8 void; s06 d6 and s10 d28 lose confidence beyond chance; s10 d2,
  d10, d15 about as a random drop would). The read's advice: re-check s06, s10 and s13 under D485's checker; re-branch
  s05, s06 and s10 at the same seeds; count lost casts from the frames, with a check that fails an option whose own
  forced cast is lost in most of its branches.

**D485 is in the pin** (the pilot checks it). It mends what lost the spells on s06 and s10, and the checker; **it does
not mend s05** (Suplex and Abrade are modal: Forge chooses their modes during the cast, after D485's check -- that is
**D486**, a separate lane, which also changes the random policy: today's seat never picks a card-targeting play by
itself, `getAllCandidates(sa, true)` returning players only). So **s05 is not re-branched tonight**: it stays J168's,
its 8 rows marked `biased: "lost-cast"`, its d8 row `lostCastVoid: true`, and it is **kept out of the headline sizing
read** (beside it, the read over all 13 as run); a later night re-branches it on D486's tree, as a new population.

**What changed since J168** (in the pin; the pilot checks it is there):
- **D485, part 1: the random seat never hands the engine a stale targeting of Forge's answer.** A targeting part whose
  count is invalid, or whose target is no longer legal, keeps its legal targets, is cut to its maximum and filled to its
  minimum from the seat's seeded stream (`Explorer.staleTargets`, `legalTargetList`); one that cannot be made legal is
  not offered (G5's refused play, counted `staleRefused`). A pick of a re-targeted answer is counted **`retargeted`** in
  the seat's `explore.guardrails` and **on the branch row** (`BranchRow.retargeted`, written when above 0), and its
  decision records carry **`why: "STALE_TARGETS"`**. This file reads those names (metrics.py `retargeted`; the frame
  scan's `staleTargetRecords`). **If D485's merge renamed any of them, the owner corrects metrics.py, the `retargeted_rows`
  metric and the pilot's `has-d485` grep before posting.**
- **D485, part 2: the M55 audit accepts the viewer's own token that ceased to exist** (its latest move from the viewer's
  battlefield to the viewer's own graveyard or hand), counted apart, never a problem; D481's two shapes unchanged; D481's
  s02 note corrected in a dated addendum (the pilot greps D485 in D481's file).
- **Comparability (D485's own).** Only a decision that meets a stale list changes; a re-branched spine is a new random
  policy wherever its decks carry such a card (s06 and s10 do). Every row names its spine's commit and its random seat
  (`sha`, `randomSeat`), and the reads are given over the 13 and over the D485 spines alone, as information.

## What J169 does with J168's folders: the answers

**(a) The pilot is J168's, with D485 added and J168's own numbers as a self-test.** It checks the pin carries D466-D472,
D476-D480 and its follow-up, D481-D484 and **D485** (its decision file naming `STALE_TARGETS`, the code naming
`retargeted` in `tools/cubelab/atlas.ts` and `Atlas.java`, `STALE_TARGETS` in `Explorer.java`, `staleRefused` in the
checker, D485's stale-token fixture, D485 named in D481's file, and the commits that added D481-D485's files ancestors
of the pin); the node tests and the redaction checker's selftest; the two engine self-tests; the readers' self-tests on
J162's, J158's, J166's and J167's spines as J168's pilot ran them, **and on J168's 13 spines** before anything is moved:
labels.py **97 labels, 27 confident, 2 `confidentForge`, 136 rows, the share 0.2784 [0.1417, 0.449], 112 labels and 31.1
confident a 7-worker night, 22 pre-D483 and 75 D483 labels, each spine's labels and confident labels as
`results/J168/report/spines.json` gives them** (8/1, 6/1, 8/2, 3/0, 8/1, 8/5, 8/1, 8/3, 8/4, 8/4, 8/1, 8/3, 8/1), and v3's
marks (8 biased rows, 1 lost-cast void, `s05 d8 cast:1`; 32.4 confident a night without s05); reads.py (C1 on s01 +4.09
[0.87, 7.52] HOLDS, s07 -5.30 [-9.50, -1.80] and s13 -2.10 [-3.38, -1.17] NOT SHOWN; same best 0.4583 [0.2188, 0.7917];
rho 0.2284 [-0.1598, 0.8621]); cuts.py (13 spines, 71,525 games, saved 31.86%, 25.2 s of checks per 1,000 games, idle
11.57%); metrics.py (13 atlases, 71,525 rows, 3 problems, 537 guard rows summing 6,187, 0 `retargeted`). **The lost-cast
scan's self-test on J168's s02, s05, s06, s07, s10 and s13** (its registered numbers below); the deck draws, s06's and
s10's among them; a 1-spine smoke with every cut on.

**(b) s06, s10 and s13 are re-checked by resuming their finished atlases**, as J167's run1 re-checked s02 and s03: at the
pin the atlas command on a folder whose phase B is done plays nothing and redoes only the checks. The code relied on, at
26a8db00 (D485's diff touches `tools/cubelab/atlas.ts` only to add `retargeted` to the branch row, lines 149 and 677 on
the branch):
- `plan.json`'s resume check compares `deckA, deckB, seed, turnCap, options, chunk, branchTimeoutSec, cuts`
  (`tools/cubelab/atlas.ts:378-382`, the keys at `:380`): J168's flags and decks, unchanged (the decks' paths are absolute, under the data
  folder, so they do not depend on the clone: `shownPath`, `tools/cubelab/labdata.ts:99-102`). The file is then
  rewritten (`:384`), which is why the move in (c) happens **before** the re-check.
- `baseline.json` exists, so the baseline is not played again (`:482`).
- `phaseB/schedule.jsonl`'s header was written by J168 at 26a8db00 (D480's follow-up), and `openSchedule` refuses a plan
  or deck hash that differs (`:452-475`): J169's flags and decks give J168's `planSha256` (s06 `6af35a6c...`, s10
  `9b8f221c...`, s13 `90fb5c7c...`) and deck hashes, so it replays.
- `AtlasSchedule` puts in `initial` only units not done (`tools/cubelab/atlascuts.ts:297-299`); J168's spines have every unit done (`unitsShort` 0), so phase B
  returns at once with `units: 0` (`atlas.ts:511-518`); no worker starts, so D485's seat plays no game here.
- `writeAtlasChecked` (`atlas.ts:929`, `checkInputs` `:939`) runs every check from the folder's files -- the rows, the
  guardrails and `tools/check-redaction.mjs` over every frame log on `--checks-parallel` workers -- and rewrites
  `atlas.json` and `atlas.md`. No check reads the folder's own name (`tools/cubelab/atlaschecks.ts` uses `basename` only
  on a frame log's file name, `:119`), so a folder moved aside re-checks as it stands.
Around it, as J167's: J168's `atlas.json` and `atlas.md` are **copied** to `atlas.j168.json` and `atlas.j168.md` once,
first (cuts.py reads s13's phase B timing from that copy, the first of `atlas.j166.json` / `atlas.j168.json` that
exists); the branch and unit line counts before and after go to `recheck-rows.txt` (they must not move); each re-check
is bounded at 30 minutes (`timeout 30m`; J168's checks took 135, 165 and 235 s on these three); exits and walls go to
`recheck-exits.txt` and `recheck-times.txt`, never `exits.txt` and `spine-times.txt`. s06's and s10's are re-checked **in
their aside folders** (named `b-s06-peasant-2106.j168-stale`, `b-s10-peasant-2110.j168-stale` in those files, so no
line names J169's fresh spines); s13 in place.

**(c) J168's s06 and s10 are moved aside, never deleted, and branched again** -- by run1, after the pilot, before the
re-check: `b-s06-peasant-2106` to `b-s06-peasant-2106.j168-stale` and `b-s10-peasant-2110` to
`b-s10-peasant-2110.j168-stale`, **only if each is J168's**: an `atlas.json`, a `plan.json` **and** a
`phaseB/baseline.json` written inside J168's run (mtime 1792944870-1792972283, 2026-10-25 12:14:30-19:51:23 EDT; J168's
s06 1792948148 and 1792948155, s10 1792960955 and 1792960962), and J168's branch rows (7,350 and 5,875). A folder J169
itself began (a runner retry) has a later baseline and is resumed by its block, never moved, and a block refuses to play
into a spine folder whose baseline is J168's. The decks are not moved: each block checks them byte for byte against
their registered sha256s (the draws and each deck, below: the values J168's schedule headers name) and plays **fresh**
at J168's seeds (deck 2006 / game 2106, deck 2010 / game 2110), chunk 25, the full cut design -- J168's flags exactly.
**s05 is not moved and not played** (above).
- **Every glob of this job is `b-s??-*-21??`** (spines): the `.j168-stale`, `.j167-cop` and `.j166-scute` folders,
  `pilot-smoke*` and `p-powered-2099` match none, so no metric, check or reader sees an aside or a pilot.
- **`big_frames`** counts frame logs over 200 MB only in spine folders whose plan was written after J168 ended
  (> 1792972283): J169's s06 and s10, and s13 once its re-check rewrites its plan (J168's s13 has none: 0).
- **The walls.** J169's blocks append to `spine-times.txt` under the spine's name, after J168's lines for the same names;
  the Report writes `report/spine-times-asrun.txt`, where J168's s06 and s10 lines (begun inside J168's run) carry their
  aside names, and the readers read that, so each spine's wall is the run that made its rows.

**(d) The lost casts, from the frames** (metrics.py, registered here; J168's read's `report/bin/strand.py`, made
generic over every card). In the caster's own seat log, a zone event `{hand, that seat}` -> `{stack, null}` after which
no state frame lists the card in `stackCards`, no zone event moves it off the stack and no `cast` event names it: no
stack instance, card and mana gone. **Forced**: the card is the branch's own option (`cast:<id>`) and is lost before the
branch's first AI decision record. **A lost-cast option**: (decision, map, option) whose forced cast was lost in more
than half of its branch rows. **Never from the worker logs.** One rule is J169's, found drafting this file: without the
`cast`-event rule, J168's s07 read 528 lost casts, 526 of them a Vicious Rivalry cast in the frame that ended the game;
with it, 2. Measured on J168's folders (read only, 2026-10-25; the pilot's self-test):

| J168 spine | logs | casts | lost casts | branches | forced | lost-cast options | cards (id: lost) |
|---|---|---|---|---|---|---|---|
| s02 | 5,000 | 48,998 | 7 | 7 | 0 | 0 | Tear Asunder 17: 7 (the read: 7) |
| s05 | 11,000 | 80,369 | 1,614 | 1,125 | 850 | **5**: d0 o1, d0 o2, d3 o2, d5 o4, d8 o0 | Suplex 1: 991 (the read: 991), **Abrade 2: 600**, 16: 23 |
| s06 | 14,700 | 74,595 | 212 | 201 | 0 | 0 | Knockout Maneuver 15: 105, Troll Negotiations 35: 107 (the read: 105, 107) |
| s07 | 11,940 | 31,631 | 2 | 2 | 0 | 0 | Vicious Rivalry 65: 2 |
| s10 | 11,750 | 68,053 | 514 | 512 | 0 | 0 | Troll Negotiations 76: 507, Tear Asunder 51: 7 (the read: 507, 7) |
| s13 | 13,850 | 71,403 | 0 | 0 | 0 | 0 | (Tamiyo's Safekeeping fizzles leave the stack: not lost) |

s05's scan says more than the read: **Abrade (a modal spell too) is lost 600 times, its own option d0 o1 in 200 of
200 branches**, so at s05 d0 every option but pass loses its own cast and pass loses one later in all 200. D486's
territory; s05 stays marked. J168's s06 and s10 have **no** lost-cast option (their losses come later in the branch),
so the check alone cannot tell D485 from J168; `lostCastsD485` (the re-branched pair's lost casts, against J168's 726)
is reported beside it, as information. The metrics: `lostCasts`, `lostCastBranches`, `lostCastForced`,
`lostCastOptions`, `staleTargetRecords` per spine and for the night, `lostCastOptionsD485` (**0, a check**; read only
from J169's own s06 and s10, else -1, so the check cannot pass on J168's folders), `lostCastScanned` (**13, a check**).
The scan is too heavy for the runner's minute-by-minute metrics (13 spines, ~150,000 logs, ~3 min on 6 processes), so
`metrics.py --scan` writes one cache per folder (stamped with its `atlas.json`'s mtime; a cache of another atlas.json is
never read) in a block of its own before the Report, and the metrics read the caches.

**(e) The Report over all 13 spines**: s01-s03 J166's at 325c2dd8 (pre-D483 listings), s04 J167's at bf978690, s05,
s07-s09 and s11-s13 J168's at 26a8db00 (s13 re-checked by J169), **s06 and s10 J169's at the pin** (J168's kept aside).
The label contract **v3** (below), J168's reads, and the sizing read over all 13 as run, **without s05 (the headline)**
and over the two D485 spines alone.

**Nothing beside it.** `cores: 7` of 8 reserves the box: post nothing heavy beside it. No `pilot_cores:`. **No
`after:` line**: J168 is finished (`failed`), and the core budget serialises it against any heavy job. A runner retry
of J169 resumes J169's own `run.json` (`blocks_done`), never J168's.

## The decks

**The draw is D447's with D482's list**, as J168's; J169 draws nothing. s06's and s10's decks were written by J166's
pilot at 325c2dd8 and played by J168; the data folder is checked against the registered values.

| spine | band | deck seed | game seed | Forge map | branched by | J169 |
|---|---|---|---|---|---|---|
| s01-s03 | pauper, peasant, legacy | 2001-2003 | 2101-2103 | 40, 0, 0 | J166, 325c2dd8 (s02, s03 re-checked by J167) | kept |
| s04 | powered | 2004 | 2104 | 0 | J167, bf978690 | kept |
| s05 | pauper | 2005 | 2105 | 0 | J168, 26a8db00 | **kept, marked `biased: lost-cast`** |
| s06 | peasant | 2006 | 2106 | 0 | **J169, the pin** | **fresh** (J168's aside, re-checked) |
| s07-s09 | legacy, powered, pauper | 2007-2009 | 2107-2109 | 40, 0, 0 | J168, 26a8db00 | kept |
| s10 | peasant | 2010 | 2110 | 0 | **J169, the pin** | **fresh** (J168's aside, re-checked) |
| s11, s12 | legacy, powered | 2011, 2012 | 2111, 2112 | 0 | J168, 26a8db00 | kept |
| s13 | pauper | 2013 | 2113 | 40 | J168, 26a8db00 | kept, **re-checked** |

**The draws' sha256s, registered** (`drawsha.py`: a folder's `decks.jsonl`, then its `.dck` files by name; J168's
values, and s06's and s10's computed 2026-10-25 from the data folder, each deck the value J168's schedule header names):
- the twelve D482 leaves alone (s01-s03, s05-s13): `e27796b73073bab5e172c2225047cecfe8424ee5ceeb4d839d44484d9da07419` (24 decks);
- **s06**: `191a5d8aac5d516f5472f0a01a0cacf660a9fa931e70b806a42723e4dfba161f` (2 decks); deck A
  `f0b8532d0e13788503f751dc239f4f02e459239aa745f73b4178dfdc880d5c2f`, deck B
  `b90d1ae102f4b9b7a8dfbbfbbd4080bfbb026b962eb0db1c7a40a6a4b35d1072`;
- **s10**: `e4676bda05d0204f3ce43e3f8d1ee1a0ca0c8e24c7f8cf09860423d00ddedd9b` (2 decks); deck A
  `d051adba41580377b7b1f627bc62f40ae25b5bac182c37f8bd7ec877bba6ce59`, deck B
  `3ee08305330298d022189e0404dc8e0d0c874acb6e0a61ffea3ecb71ddb48b1d`;
- s04, s05, J166's s04 aside, the smoke's and the validation draw: J168's values, unchanged (draws.py).

## The design: J166's, unchanged

The per-spine flags are J166's, J167's and J168's exactly: `--phase b --decisions 8 --min-options 3 --screen 25
--early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs
{workers}` (s06 and s10 have no Forge map; s13's re-check passes 40, as J168 ran it).

**Sizing** (J168's measured walls at 6 workers): s06 75.3 min, s10 52.3 min; D485's s10 reproduction ran 341 s against
280 s before (~20% slower), so up to ~90 and ~64. The pilot ~15 min, run1 ~10 min, the scan ~4 min, the report ~3 min:
**~2.75 h, range 2.5-3.5 h**. `timeout: 3h` bounds each block (~2x s06). A stall costs at most 3 h and fails the job at
that block; a runner retry resumes it (`resumable: yes`). ~71,525 branch rows when done (`progress:`): J168's 58,300 on
the eleven kept spines plus ~7,350 and ~5,875. **Disk** ~1.6 GB more; the pilot and every block require 50 GB free, and
`abort:` fires under 50 GB.

**Where it writes: the lab data folder, lab-j166,** as J166-J168 did: every atlas command runs under
`LAB_DATA_DIR=/home/justin-a/code/lab/data`. The Forge homes (`CUBELAB_HOME_ROOT=var/cubelab/homes-J169`), the
self-test's folder and the job's scripts and caches (`var/lab-j169-local/`) stay in the clone. As J168: the pilot's
first lines assert the data folder and stop under 50 GB free; the pilot records once that lab-j166 is as J168 left it
(`state`); every block asserts the path, the 50 GB and its deck files again; **no `clean:`, nothing deleted**. A restart
from scratch needs J169's s06 and s10 moved aside by hand, the `.j168-stale` folders moved back, and
`var/lab-j169-local/armed.txt` and `state.txt` removed.

**The abort lines read only this run's artefacts (the J152 lesson):** every abort that reads the atlas's files is gated
on `armed == 1`, written by this pilot and removed by the Report block's last line.

## The label set: the rung-4a contract, v3

`report/labels.jsonl`, one JSON row a branched decision of seat A on all 13 spines, written by labels.py, `contract`
**`mtg-table rung-4a label v3 (J169)`**, `v: 3`: every v2 field (J167's: `sha`, `listing`, `playCount`, `tokenTwice`,
`options[].identity`, and J166's v1 fields), unchanged, and four more:

| field | value |
|---|---|
| `randomSeat` | `"D485"` on s06 and s10 (J169's); `"pre-D485"` on the other eleven |
| `biased` | `"lost-cast"` on every s05 row (J168's, its Suplex and Abrade casts lost; D486); `null` elsewhere |
| `lostCastOptions` | the row's options whose own forced cast was lost in more than half of their branches (either map), from the scan; `[]` when none |
| `lostCastVoid` | `true` when option 0 (Forge's own answer, the one the spine played) is among them: the regret measures throwing the card away. Expected: s05 d8 alone |
| `lostCastBranches` | the decision's branch games with any lost cast (either side) |

| spine | `sha` | `listing` | `randomSeat` |
|---|---|---|---|
| s01-s03 | `325c2dd8` | `"pre-D483"` | `"pre-D485"` |
| s04 | `bf978690` | `"D483"` | `"pre-D485"` |
| s05, s07-s09, s11-s13 | `26a8db00` | `"D483"` | `"pre-D485"` |
| s06, s10 | the pin (`var/lab-j169-local/sha.txt`, 8 hex) | `"D483"` | `"D485"` |

- `training: true`, `split: "train"`, `pool: "random-<band>"` on every row, s05's included: **a `biased` row is kept and
  marked, never dropped**; rung 4 decides what to do with it. **Expected: 0 void labels** (D470's `void`, unchanged; the
  lost-cast void is its own field).
- **Nothing is cleaned**: rung 4 reads the spine folders through each row's paths; J168's s06 and s10 rows stay
  reachable in their `.j168-stale` folders (never in the label set).

## Pre-registered reads (numbers only)
J168's reads, definitions unchanged, over **all 13 spines**, and:
- **(c) the sizing read** (`c_sizingRead`, all 13 as run; **`c_sizingReadUnbiased`, s05 out: the headline**), with
  J166's walls for s01-s03, J167's for s04, J168's for s05, s07-s09 and s11-s13, J169's for s06 and s10 (the re-checks'
  walls apart), beside J168's 31.1 (13) and 32.4 (12), J166's 22.3 and the review's ~25-27. **Over the two D485 spines
  alone** (`report/labels-d485.json`), as information. No verdict.
- (a)-(c) once more over the ten D483 spines (`labels-d483.json`), the nine D484 spines (`labels-d484.json`) and the
  twelve unbiased spines (`labels-unbiased.json`), as information.
- **(d) the cuts' savings**: as J168 (s13's phase B timing from its `.j168` copy; the re-checks' walls apart).
- **(iv) C1 "cast now where Forge passes" on s01, s07, s13**: HOLDS / NOT SHOWN by the registered rule (none of the three
  is re-branched; J168's values recomputed).
- **(ix) D483**, **(xii) D484**: as J168 (`identityListingsShort` and `repeatedPlays` 0, checks;
  `chooseSourceGuardOffD484` 0, a check; s05 keeps J168's 537 guard rows).
- **(xiii) D485** (metrics.py, `report/tool.json`): `retargetedRows` and `retargeted` per spine, `retargetedOffD485`
  (**0, a check**), the frames' `staleTargetRecords`, the worker logs' `failed_to_target` lines (information only: the
  logs undercount).
- **(xiv) The lost casts** (`report/lost-*.json`, `tool.json`): per spine and for the night; `lostCastOptionsD485`
  (**0, a check**), `lostCastsD485` against J168's 726 on the same two spines (information); J168's aside s06 and s10
  scanned beside.
- **(xv) The re-checks** (`recheckJ169Ok`, **3, a check**: s06 and s10 aside and s13 each exit 0, 0 problems, rows and
  units unmoved, J168's timing kept, nothing played), J168's problems on each against D485's.
- **(x)** J167's re-check (`recheckOk` **2**) and **(xi)** the draws, as J168.
- Everything else is a candidate (D447 point 9).

**Outputs** (on the data folder, `/home/justin-a/code/lab/data/lab-j166/`).
- `b-s06-peasant-2106/`, `b-s10-peasant-2110/` (J169's), `b-s06-peasant-2106.j168-stale/`,
  `b-s10-peasant-2110.j168-stale/` (J168's, re-checked, each with `atlas.j168.json`), `b-s13-pauper-2113/atlas.j168.*`.
- `exits.txt`, `spine-times.txt` (J169's s06 and s10 lines appended); `recheck-*.txt` (J169's three appended);
  `pilot-smoke-j169/`, the smoke.
- `report/`: J168's files rewritten for the 13 as J169 leaves them, and `labels-d485.json`, `labels-unbiased.json`,
  `lost-<folder>.json` (15: the 13 spines and the two asides), `spine-times-asrun.txt`. J168's report is kept as the
  runner collected it (`pc-results/results/J168/`); J169's Report overwrites the data folder's `report/` copy.
- Never `summary.md` or `metrics.json`.

## Pilot
About 15 minutes: the data folder and the abort gate; lab-j166 as J168 left it; the pin carries D466-D485; the node
tests and the redaction checker's selftest; the readers' self-tests (J162's, J158's, J166's, J167's s04 and **J168's 13
spines**); **the lost-cast scan's self-test on six of J168's spines**; the deck draws; the two engine self-tests; a
1-spine smoke with every cut on (J166's smoke pair at game seed 2199, `pilot-smoke-j169`, J168's smoke exactly).
```bash
# the lab data folder: exactly /home/justin-a/code/lab/data (README safety rules), 50 GB free or stop
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J169: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import json, sys; v = json.load(open('config.json')).get('labDataDir'); sys.exit(0 if v in (None, '', '/home/justin-a/code/lab/data') else 'J169: config.json labDataDir is %r, not /home/justin-a/code/lab/data' % v)"
mkdir -p /home/justin-a/code/lab/data/lab-j166 var/lab-j169-local/bin
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; print('J169: data folder free GB', round(f, 1)); sys.exit(0 if f >= 50 else 'J169: under 50 GB free on the data folder')"
echo 1 > var/lab-j169-local/datadir.txt
# state: lab-j166 as J168 left it, recorded once (a later pilot run keeps the first answer): the 13 spines each with an atlas.json,
# J166's s04 and J167's s05 aside; s06 and s10 J168's (an atlas.json, a plan.json and a baseline.json from J168's run) or already set
# aside by run1; J168's exits for s06, s10 and s13 were 3 (the redaction check alone)
test -f var/lab-j169-local/state.txt || python3 -I -c "
import glob, os
D = '/home/justin-a/code/lab/data/lab-j166'
N = ['b-s01-pauper-2101', 'b-s02-peasant-2102', 'b-s03-legacy-2103', 'b-s04-powered-2104', 'b-s05-pauper-2105', 'b-s06-peasant-2106', 'b-s07-legacy-2107',
     'b-s08-powered-2108', 'b-s09-pauper-2109', 'b-s10-peasant-2110', 'b-s11-legacy-2111', 'b-s12-powered-2112', 'b-s13-pauper-2113']
J168 = (1792944870, 1792972283)
def j168(d):
    try:
        return os.path.exists(d + '/atlas.json') and all(J168[0] <= os.path.getmtime(d + f) <= J168[1] for f in ('/plan.json', '/phaseB/baseline.json'))
    except OSError:
        return False
ok = all(os.path.exists(D + '/' + n + '/atlas.json') for n in N if n not in ('b-s06-peasant-2106', 'b-s10-peasant-2110'))
ok = ok and os.path.isdir(D + '/b-s04-powered-2104.j166-scute') and os.path.isdir(D + '/b-s05-pauper-2105.j167-cop')
ok = ok and all(j168(D + '/' + n) or os.path.isdir(D + '/' + n + '.j168-stale') for n in ('b-s06-peasant-2106', 'b-s10-peasant-2110'))
ok = ok and sorted(os.path.basename(x) for x in glob.glob(D + '/b-s??-*-21??')) == [n for n in N if os.path.isdir(D + '/' + n)]
ex = {}
for line in open(D + '/exits.txt'):
    f = line.split()
    if len(f) == 2:
        ex[f[0]] = f[1]
ok = ok and all(ex.get(n) == '3' for n in ('b-s06-peasant-2106', 'b-s10-peasant-2110', 'b-s13-pauper-2113'))
print(1 if ok else 0)
" > var/lab-j169-local/state.txt
# the abort gate (the J152 lesson): this job's own run is armed from here; the Report block disarms it
echo 1 > var/lab-j169-local/armed.txt
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j169-local/merged.txt || echo 0 > var/lab-j169-local/merged.txt
git rev-parse --short=8 HEAD > var/lab-j169-local/sha.txt
grep -q 'chosenOptionalCosts' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'class StepClock' bridge/src/mtgtable/ai/Atlas.java && grep -q 'class OptionUnavailable' bridge/src/mtgtable/ai/RolloutController.java && grep -q 'zeroXLeftOut' bridge/src/mtgtable/ai/Explorer.java && grep -q 'restoreChoices' bridge/src/mtgtable/ai/Explorer.java && grep -q 'copyCandidates' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'COUNTED_GUARDRAILS' tools/cubelab/atlas.ts && grep -q 'unit-timeout' tools/cubelab/atlas.ts && grep -q 'empty-hand-ok' tools/check-redaction.mjs && echo 1 > var/lab-j169-local/has-d466-d472.txt || echo 0 > var/lab-j169-local/has-d466-d472.txt
grep -q 'D476' bridge/src/mtgtable/ai/SearchPolicy.java && echo 1 > var/lab-j169-local/has-d476.txt || echo 0 > var/lab-j169-local/has-d476.txt
grep -q 'final class ForkRestart' bridge/src/mtgtable/ai/ForkRestart.java && grep -q 'branchRestarted' tools/cubelab/atlas.ts && echo 1 > var/lab-j169-local/has-d477.txt || echo 0 > var/lab-j169-local/has-d477.txt
grep -q 'BRANCH_CAPPED_WARN_DEFAULT' tools/cubelab/atlas.ts && grep -q 'export function cappedBranches' tools/cubelab/atlas.ts && echo 1 > var/lab-j169-local/has-d478.txt || echo 0 > var/lab-j169-local/has-d478.txt
grep -q 'effectSourceNull' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'exileLinksLost' bridge/src/mtgtable/ai/Atlas.java && grep -q 'exileLinksLost' tools/cubelab/atlas.ts && echo 1 > var/lab-j169-local/has-d479.txt || echo 0 > var/lab-j169-local/has-d479.txt
grep -q 'export class AtlasSchedule' tools/cubelab/atlascuts.ts && grep -q "export const EARLY_STOP_ON = \[50, 100, 150\]" tools/cubelab/atlascuts.ts && grep -q 'export const SCREEN_LOW = 0.04' tools/cubelab/atlascuts.ts && grep -q 'export async function redactionCheckParallel' tools/cubelab/censusplay.ts && grep -q 'holdIdle' tools/cubelab/engine.ts && grep -q 'SELFTEST_CUTS' tools/cubelab/atlas.ts && test -f web/test/cubelab-atlas-cuts.test.ts && echo 1 > var/lab-j169-local/has-d480.txt || echo 0 > var/lab-j169-local/has-d480.txt
grep -q 'export function openSchedule' tools/cubelab/atlas.ts && grep -q 'SCHEDULE_PLAN_KEYS' tools/cubelab/atlas.ts && echo 1 > var/lab-j169-local/has-d480f.txt || echo 0 > var/lab-j169-local/has-d480f.txt
ls docs/decisions/D481-*.md >/dev/null 2>&1 && grep -q 'enteredBetweenFrames' tools/check-redaction.mjs && test -f fixtures/negative/redaction/m55-option-entered-between-frames.jsonl && echo 1 > var/lab-j169-local/has-d481.txt || echo 0 > var/lab-j169-local/has-d481.txt
ls docs/decisions/D482-*.md >/dev/null 2>&1 && test -f tools/cubelab/engine-unplayable.json && grep -q '"Scute Swarm"' tools/cubelab/engine-unplayable.json && grep -q 'engine-unplayable.json' tools/cubelab/deckcensus.ts && grep -q 'engineSkips' tools/cubelab/deckcensus.ts && echo 1 > var/lab-j169-local/has-d482.txt || echo 0 > var/lab-j169-local/has-d482.txt
ls docs/decisions/D483-*.md >/dev/null 2>&1 && grep -q 'public static String playIdentity' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'identities' bridge/src/mtgtable/ai/Atlas.java && grep -q 'export function playCount' tools/cubelab/atlascuts.ts && grep -q 'export function repeatedPlays' tools/cubelab/atlascuts.ts && echo 1 > var/lab-j169-local/has-d483.txt || echo 0 > var/lab-j169-local/has-d483.txt
ls docs/decisions/D484-*.md >/dev/null 2>&1 && grep -q 'ChooseSource' docs/decisions/D484-*.md && grep -rq 'chooseSourceGuard' bridge/src/mtgtable/ai tools/cubelab && echo 1 > var/lab-j169-local/has-d484.txt || echo 0 > var/lab-j169-local/has-d484.txt
# D485 (the names this file reads: `retargeted` on the branch row, why "STALE_TARGETS", guardrails retargeted and staleRefused; the owner corrects them if the merge renamed any)
ls docs/decisions/D485-*.md >/dev/null 2>&1 && grep -q 'STALE_TARGETS' docs/decisions/D485-*.md && grep -q 'retargeted' tools/cubelab/atlas.ts && grep -q 'retargeted' bridge/src/mtgtable/ai/Atlas.java && grep -q 'STALE_TARGETS' bridge/src/mtgtable/ai/Explorer.java && grep -q 'staleRefused' tools/check-redaction.mjs && test -f fixtures/negative/redaction/stale-token-died-earlier.jsonl && grep -q 'D485' docs/decisions/D481-*.md && echo 1 > var/lab-j169-local/has-d485.txt || echo 0 > var/lab-j169-local/has-d485.txt
# D481-D485 by decision id: the commit that added each decision's file is an ancestor of the pin (whatever sha the merge gave it)
anc=1
for x in D481 D482 D483 D484 D485; do
  f=$(git ls-tree -r --name-only HEAD docs/decisions/ | grep "^docs/decisions/$x-" | head -n 1 || true)
  c=""
  if [ -n "$f" ]; then c=$(git log --diff-filter=A --format=%H -n 1 HEAD -- "$f" || true); fi
  if [ -z "$c" ] || ! git merge-base --is-ancestor "$c" HEAD; then anc=0; fi
  echo "J169: $x: ${f:-no decision file} added by ${c:-no commit}"
done
echo $anc > var/lab-j169-local/has-d481-d485-commits.txt
test -z "${CUBELAB_WORKER_XMX:-}" && echo 1 > var/lab-j169-local/xmx-unset.txt || echo 0 > var/lab-j169-local/xmx-unset.txt
env -u LAB_DATA_DIR node --test web/test/cubelab-atlas.test.ts web/test/cubelab-atlas-cuts.test.ts web/test/cubelab-atlas-resume.test.ts web/test/cubelab-atlas-redaction.test.ts web/test/cubelab-record.test.ts web/test/cubelab-watchdog.test.ts web/test/cubelab-deck-census.test.ts && echo 1 > var/lab-j169-local/nodetests.txt || echo 0 > var/lab-j169-local/nodetests.txt
node tools/check-redaction-selftest.mjs && echo 1 > var/lab-j169-local/redaction-self.txt || echo 0 > var/lab-j169-local/redaction-self.txt
cat > var/lab-j169-local/bin/drawsha.py <<'PY'
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
cat > var/lab-j169-local/bin/draws.py <<'PY'
# J169: J168's draws.py with s06's and s10's draws and decks registered (computed 2026-10-25 from the data folder; each deck's value is
# the one J168's schedule header for that spine names, `deckSha256`), the two spines J169 re-branches. J168's header:
# J168: the deck draws J168 plays, checked on the data folder against their registered sha256s, from files only (no engine, no
# redraw: J167's pilot redrew all 27 pairs on bf978690 and found the twelve unchanged and s04's D482 deck; D484 is not a deck change).
#   draws.py            one JSON object of 0/1 numbers (the pilot's `draws` metric reads it from draws.json)
#   draws.py --report   the sha256s as run (report/draws.json)
# Writes nothing.
import glob, hashlib, json, os, re, sys
D = '/home/justin-a/code/lab/data/lab-j166'
BANDS = ['pauper', 'peasant', 'legacy', 'powered'] * 3 + ['pauper']
SP = ['s%02d-%s-%d' % (k, BANDS[k - 1], 2000 + k) for k in range(1, 14)]
VA = ['v%02d-%s-%d' % (k, BANDS[k - 1], 2200 + k) for k in range(1, 14)]
TWELVE = [x for x in SP if not x.startswith('s04-')]
# registered: the twelve, J166's s04, the smoke and the validation draw by J167 (2026-10-25, from J166's pilot's files); s04's D482 draw by
# J167's pilot (its log, 2026-10-25 07:2x); s05 alone and its two decks by this draft (2026-10-25, from the data folder; the decks' values
# are the ones J167's s05 schedule header names)
REG_TWELVE = 'e27796b73073bab5e172c2225047cecfe8424ee5ceeb4d839d44484d9da07419 24'
REG_S04 = '81c4dd22dcdbd1a110b0339476cbab04e8f6d2791f1881e42499b97f8675dc00 2'
S04_DECK1 = '873bb7e41c40f2ad4a40fbd8e3abf7185820fa93b1e90c40d2abff5907e3f003'
REG_J166_S04 = 'd78468cde81712cfcbf350e53f6caaeac8aecaabf657829067c94f92b100271a 2'
REG_S05 = 'afc7ce320e966d96e5c92ec9d28c357e6f603c59927f677549ce261227b1b92e 2'
S05_DECK_A = 'd2c9c9c0d7a4823bb02de196f7ca13d7fb9f2d3c9c2cdd105d4a8f3932bce72f'
S05_DECK_B = '37828917f92483f367b656d071ea09a72836b7cc7242d1db9556e926f23b28b3'
REG_S06 = '191a5d8aac5d516f5472f0a01a0cacf660a9fa931e70b806a42723e4dfba161f 2'
S06_DECKS = ('f0b8532d0e13788503f751dc239f4f02e459239aa745f73b4178dfdc880d5c2f', 'b90d1ae102f4b9b7a8dfbbfbbd4080bfbb026b962eb0db1c7a40a6a4b35d1072')
REG_S10 = 'e4676bda05d0204f3ce43e3f8d1ee1a0ca0c8e24c7f8cf09860423d00ddedd9b 2'
S10_DECKS = ('d051adba41580377b7b1f627bc62f40ae25b5bac182c37f8bd7ec877bba6ce59', '3ee08305330298d022189e0404dc8e0d0c874acb6e0a61ffea3ecb71ddb48b1d')
REG_SMOKE = 'edfdc861736fb049bc1080d525269064c6776ecabd47de496463fa3dc684c931 2'
REG_VALIDATION = '7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de 26'


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


S05 = D + '/decks/s05-pauper-2005/decks/pauper-2005-0000%d.dck'
S06 = D + '/decks/s06-peasant-2006/decks/peasant-2006-0000%d.dck'
S10 = D + '/decks/s10-peasant-2010/decks/peasant-2010-0000%d.dck'
if '--report' in sys.argv[1:]:
    print(json.dumps({'note': 'J169 deck draws: D447 with D482\'s engine-unplayable list, drawn by J166\'s pilot (s04: J167\'s run2); drawsha = each folder\'s decks.jsonl, then its .dck files by name',
                      'spinesAsRun': safe(lambda: drawsha([D + '/decks/' + x for x in SP])), 'twelveUnchanged': safe(lambda: drawsha([D + '/decks/' + x for x in TWELVE])),
                      'twelveRegistered': REG_TWELVE, 's04': safe(lambda: drawsha([D + '/decks/s04-powered-2004'])), 's04Registered': REG_S04,
                      's04Deck1': safe(lambda: fsha(D + '/decks/s04-powered-2004/decks/powered-2004-00001.dck')), 's04Deck1Registered': S04_DECK1,
                      's05': safe(lambda: drawsha([D + '/decks/s05-pauper-2005'])), 's05Registered': REG_S05,
                      's05DeckA': safe(lambda: fsha(S05 % 1)), 's05DeckB': safe(lambda: fsha(S05 % 2)),
                      's06': safe(lambda: drawsha([D + '/decks/s06-peasant-2006'])), 's06Registered': REG_S06,
                      's06Decks': [safe(lambda: fsha(S06 % 1)), safe(lambda: fsha(S06 % 2))], 's06DecksRegistered': list(S06_DECKS),
                      's10': safe(lambda: drawsha([D + '/decks/s10-peasant-2010'])), 's10Registered': REG_S10,
                      's10Decks': [safe(lambda: fsha(S10 % 1)), safe(lambda: fsha(S10 % 2))], 's10DecksRegistered': list(S10_DECKS),
                      'j166S04Aside': safe(lambda: drawsha([D + '/decks/s04-powered-2004.j166-scute'])), 'j166S04Registered': REG_J166_S04,
                      'smoke': safe(lambda: drawsha([D + '/decks/p-powered-2099'])), 'validation': safe(lambda: drawsha([D + '/validation/' + x for x in VA])),
                      'validationRegistered': REG_VALIDATION}, indent=1))
    sys.exit(0)
out = {}
out['data12'] = 1 if safe(lambda: drawsha([D + '/decks/' + x for x in TWELVE])) == REG_TWELVE else 0
out['s04Data'] = 1 if safe(lambda: drawsha([D + '/decks/s04-powered-2004'])) == REG_S04 else 0
out['s04Deck1'] = 1 if safe(lambda: fsha(D + '/decks/s04-powered-2004/decks/powered-2004-00001.dck')) == S04_DECK1 else 0
out['j166S04Aside'] = 1 if safe(lambda: drawsha([D + '/decks/s04-powered-2004.j166-scute'])) == REG_J166_S04 else 0
out['s05Draw'] = 1 if safe(lambda: drawsha([D + '/decks/s05-pauper-2005'])) == REG_S05 else 0
out['s05DeckA'] = 1 if safe(lambda: fsha(S05 % 1)) == S05_DECK_A else 0
out['s05DeckB'] = 1 if safe(lambda: fsha(S05 % 2)) == S05_DECK_B else 0
out['s05CircleInB'] = 1 if safe(lambda: re.search(rb'(?m)^\d+ Circle of Protection: Green\s*$', open(S05 % 2, 'rb').read())) else 0   # information
out['s06Draw'] = 1 if safe(lambda: drawsha([D + '/decks/s06-peasant-2006'])) == REG_S06 else 0
out['s06Decks'] = 1 if (safe(lambda: fsha(S06 % 1)), safe(lambda: fsha(S06 % 2))) == S06_DECKS else 0
out['s10Draw'] = 1 if safe(lambda: drawsha([D + '/decks/s10-peasant-2010'])) == REG_S10 else 0
out['s10Decks'] = 1 if (safe(lambda: fsha(S10 % 1)), safe(lambda: fsha(S10 % 2))) == S10_DECKS else 0
out['smokeData'] = 1 if safe(lambda: drawsha([D + '/decks/p-powered-2099'])) == REG_SMOKE else 0
out['validationData'] = 1 if safe(lambda: drawsha([D + '/validation/' + x for x in VA])) == REG_VALIDATION else 0
print(json.dumps(out))
PY
cat > var/lab-j169-local/bin/labels.py <<'PY'
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
import collections, glob, json, os, random, statistics, sys

B, SEED = 10000, 150
CONTRACT = 'mtg-table rung-4a label v3 (J169)'
args, opt = [], {}
for a in sys.argv[1:]:
    if a.startswith('--'):
        k, _, v = a[2:].partition('=')
        opt[k] = v
    else:
        args.append(a)
TRAINING = opt.get('training') == '1'
D485 = set(x for x in opt.get('d485', '').split(',') if x)
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
    pb = doc.get('phaseB') or {}
    sch = pb.get('schedule') or {}
    lc = lost_cache(spine)
    meta[name] = {'pool': pool, 'deckSeed': int(dseed), 'gameSeed': int(gseed), 'sha': sha, 'listing': spine_listing, 'folder': os.path.basename(spine), 'forgeMap': fm,
                  'deckA': plan['deckA'], 'deckB': plan['deckB'],
                  'baseline': {'turns': (pb.get('baseline') or {}).get('turns'), 'winner': (pb.get('baseline') or {}).get('winner'),
                               'listed': (pb.get('baseline') or {}).get('decisionsListed')},
                  'branchedInFull': sch.get('branchedInFull'), 'screened': len(sch.get('screened') or []), 'fill': sch.get('fill'),
                  'stoppedOptions': sch.get('stoppedOptions'), 'meanOptions': sch.get('meanOptions'),
                  'randomSeat': 'D485' if name in D485 else 'pre-D485', 'biased': 'lost-cast' if name in BIASED else None,
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
            'v': 3, 'contract': CONTRACT, 'spine': name, 'pool': pool, 'training': TRAINING, 'split': 'train' if TRAINING else None,
            'deckA': plan['deckA'], 'deckB': plan['deckB'], 'deckSeed': int(dseed), 'spineSeed': int(gseed), 'sha': sha,
            'listing': 'D483' if ids else 'pre-D483', 'playCount': len(set(ids)) if ids else len(toks), 'tokenTwice': len(set(toks)) < len(toks),
            'randomSeat': 'D485' if name in D485 else 'pre-D485', 'biased': 'lost-cast' if name in BIASED else None,
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
                       for S in ('pre-D485', 'D485')}
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
    return s


out['c_sizing7'] = {'bySpine': {n: size([n]) for n in meta}, 'byPool': {p: size(sorted(ss)) for p, ss in tree.items()}, 'asRun': size(list(meta))}
out['c_sizingRead'] = {'confidentPer7Worker10hNight': out['c_sizing7']['asRun']['confidentPer7Worker10hNight'],
                       'expectation': 'J168 all 13 as run: 112 labels and 31.1 confident labels per 7-worker 10-h night (27 confident labels), 24.2-29.9 with the lost-spell bias taken out by its read; J166 s01-s03: 122 / 22.3; the atlas review, section 5: ~25-27 (cube pairs); registered as the sizing read, no verdict'}
unb = [n for n in meta if n not in BIASED]
out['c_sizingReadUnbiased'] = dict(size(unb), spines=sorted(unb), left=sorted(n for n in meta if n in BIASED),
                                   note='the sizing read over the spines not marked biased (J169: s05 out, its Suplex and Abrade casts lost); the headline')
# the void count (0 expected since D470), any non-block decision that played one game under every option
out['voidLabels'] = sum(1 for x in labels if x['void'])
out['voidList'] = ['%s d%d %s' % (x['spine'], x['d'], x['forgeToken']) for x in labels if x['void']]
out['sameGameNotBlock'] = ['%s d%d' % (x['spine'], x['d']) for x, same in same_any if same and x['kind'] != 'b' and x['complete']]
print(json.dumps(out, indent=1))
PY
cat > var/lab-j169-local/bin/reads.py <<'PY'
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
cat > var/lab-j169-local/bin/cuts.py <<'PY'
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
                                'unitMs': 0, 'heldMs': 0, 'screened': 0, 'stoppedOptions': 0, 'spines': 0, 'recheckSec': 0}
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
p = night['projectedMs']
out['night'] = {'spines': night['spines'], 'branchGames': night['branchGames'], 'branchHours': round(night['branchMs'] / 3.6e6, 2), 'projectedHours': round(p / 3.6e6, 2),
                'savedShare': round((p - night['branchMs']) / p, 4) if p else None, 'earlyStopShare': round(night['earlyStopAvoidedMs'] / p, 4) if p else None,
                'screenShare': round(night['screenAvoidedMs'] / p, 4) if p else None, 'screened': night['screened'], 'stoppedOptions': night['stoppedOptions'],
                'idleShare': round(1 - night['unitMs'] / night['heldMs'], 4) if night['heldMs'] else None, 'checksHours': round(night['checksSec'] / 3600, 2),
                'checksSecPerKGames': round(1000 * night['checksSec'] / night['branchGames'], 1) if night['branchGames'] else None,
                'checksHoursAtJ162Serial': round(night['branchGames'] * J162_SERIAL_S_PER_KGAMES / 1000 / 3600, 2), 'recheckSec': night['recheckSec'],
                'reviewExpectation': 'cuts save 18-20% of branch time (atlas review 3b+3d; D480 replay 20.3%); J166 s01-s03 measured 7.7%'}
print(json.dumps(out, indent=1))
PY
cat > var/lab-j169-local/bin/metrics.py <<'PY'
# J169's metrics (drafts/J169-atlas-4a-night-four.md): J168's metrics.py with these additions, registered before any J169 data:
# THE LOST CASTS, from the frames (never the worker logs, which undercount: J168's s05 logged 453 lines for 991 lost Suplex casts).
#   metrics.py --scan FOLDER CACHE_DIR [JOBS]  scans FOLDER's phase B branch frame logs and writes CACHE_DIR/<folder>.json, stamped
#                                              with FOLDER's atlas.json mtime (a cache of another atlas.json is never read)
#   A LOST CAST (J168's read, report/bin/strand.py, made generic over every card): in the seat log of the card's own caster, a zone
#   event {hand, that seat} -> {stack, null} after which no state frame lists the card in `stackCards`, no zone event moves it off
#   the stack and no `cast` event names it (no stack instance: Forge's MagicStack.add refused it, "failed to target", and the card
#   and its mana are gone; D485's Context). The `cast` event rule is J169's: without it a cast in the frame that ends the game (J168's
#   s07, Vicious Rivalry, 526 rows) read as lost. FORCED: the lost card is the branch's own option (`cast:<id>`) and is lost before
#   the branch's first AI decision record. A LOST-CAST OPTION: an option (decision, map, option) whose forced cast was lost in more
#   than half of its branch rows. Per spine: `lostCasts` (events), `lostCastBranches`, `lostCastForced`, `lostCastOptions`,
#   `staleTargetRecords` (decision records carrying D485's why "STALE_TARGETS"); `lostCastOptionsD485` sums the spines J169
#   re-branched (s06, s10), a final check (== 0).
# D485's counter: `retargeted` on a branch row (its rows and sum per spine; `retargetedOffD485`, rows carrying it off s06/s10, 0 by
# construction); the spines J169 branched (`j169Spines`: s06/s10 whose baseline.json was written after J168 ended); J168's s06 and
# s10 set aside (`asideJ168Ok`); the re-check of J168's s06, s10 (aside) and s13 under D485's checker (`recheckJ169Ok`, its
# J168 atlas kept as atlas.j168.json). If D485 named its counter otherwise, the owner renames `retargeted` here. J168's header:
# J168's metrics (drafts/J168-atlas-4a-night-three.md): J167's metrics.py with these additions, registered before any J168 data:
# D484's counter (`chooseSourceGuard` on a branch row, a count or true: the rows where it fired, its sum, the rows carrying the key,
# any fired on s01-s04), J167's s05 set aside (`asideS05Ok`), s04 as J167 left it (`s04J167Ok`), and s04's deck 1 by its registered
# sha256 instead of J167's pilot file. If D484 named its counter otherwise, the owner renames `chooseSourceGuard` here. J167's header:
# J167's metrics (drafts/J167-atlas-4a-night-two.md): J166's metrics.py over the night's 13 spine folders, with the glob a parameter
# and these additions, registered before any J167 data: D483's listings (identities, repeated plays, two plays under one token, and
# the pre-D483 listings' decisions that name a token twice -- the decisions whose k D483 lowers), the re-check of s02 and s03, J166's
# s04 set aside, s04's new deck, and any spine deck holding Scute Swarm. Standard library only; no engine.
#   metrics.py [DATA_DIR] [SPINE_GLOB]   default /home/justin-a/code/lab/data/lab-j166 and b-s??-*-21?? (never the .j166-scute, .j167-cop or
#                                        pilot folders); the pilot's self-tests pass J162's folder with b-* and J166's with b-s0[123]-*-210?; J168's: J167's s04 with b-s04-*-2104
import glob, gzip, hashlib, json, math, os, re, sys
NAME = re.compile(r'd(\d+)-(random|forge)-o(\d+)-b(\d+)-seat(\d)\.jsonl\.gz$')
CAST_RE = re.compile(r'"kind":"zone","cardId":(\d+),"from":\{"zone":"hand","player":(\d+)\},"to":\{"zone":"stack","player":null\}')
LIVE_RE = re.compile(r'"kind":"zone","cardId":(\d+),"from":\{"zone":"stack"|"kind":"cast","stackId":-?\d+,"cardId":(\d+)')


def scan_log(path):
    """one branch frame log: its casts from the viewer's own hand, the lost ones, the forced lost ones, D485's records"""
    m = NAME.search(path)
    d, c, o, i, seat = int(m.group(1)), m.group(2), int(m.group(3)), int(m.group(4)), int(m.group(5))
    casts, live, first_dec, tok, stale = [], {}, None, None, 0
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
                if '"type":"decision"' in l:
                    first_dec = k if first_dec is None else first_dec
                    stale += 1 if '"STALE_TARGETS"' in l else 0
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
    forced = sum(1 for cid, ln in lost if own(cid) and (first_dec is None or ln < first_dec))
    return {'key': 'd%d/%s/o%d' % (d, c, o), 'i': i, 'casts': len(casts), 'lost': len(lost), 'forced': forced, 'cards': [cid for cid, _ in lost], 'stale': stale}


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
    res = {'folder': os.path.basename(F), 'atlasMtime': mt, 'logs': len(files), 'casts': 0, 'lostCasts': 0, 'lostCastForced': 0, 'staleTargetRecords': 0, 'byCard': {}}
    lostb, forcedb = set(), set()
    with Pool(J) as p:
        for x in p.imap_unordered(scan_log, files, chunksize=16):
            res['casts'] += x['casts']
            res['lostCasts'] += x['lost']
            res['lostCastForced'] += x['forced']
            res['staleTargetRecords'] += x['stale']
            for cid in x['cards']:
                res['byCard'][str(cid)] = res['byCard'].get(str(cid), 0) + 1
            if x['lost']:
                lostb.add((x['key'], x['i']))
            if x['forced']:
                forcedb.add((x['key'], x['i']))
    for key, i in lostb:
        bo.setdefault(key, {'branches': 0, 'lostBranches': 0, 'forcedLostBranches': 0})['lostBranches'] += 1
    for key, i in forcedb:
        bo[key]['forcedLostBranches'] += 1
    res['lostCastBranches'] = len(lostb)
    res['byOption'] = bo
    res['lostCastOptions'] = sorted(k for k, v in bo.items() if v['branches'] and 2 * v['forcedLostBranches'] > v['branches'])
    os.makedirs(C, exist_ok=True)
    with open(os.path.join(C, res['folder'] + '.json'), 'w') as f:
        json.dump(res, f)
    print(json.dumps({k: v for k, v in res.items() if k != 'byOption'}))
    sys.exit(0)
D = sys.argv[1] if len(sys.argv) > 1 else '/home/justin-a/code/lab/data/lab-j166'
G = sys.argv[2] if len(sys.argv) > 2 else 'b-s??-*-21??'
L = 'var/lab-j169-local'
# name: (band, deck seed, game seed, branchForge) -- the registered spine table (J166's)
SPINES = {'s01': ('pauper', 2001, 2101, 40), 's02': ('peasant', 2002, 2102, 0), 's03': ('legacy', 2003, 2103, 0), 's04': ('powered', 2004, 2104, 0),
          's05': ('pauper', 2005, 2105, 0), 's06': ('peasant', 2006, 2106, 0), 's07': ('legacy', 2007, 2107, 40), 's08': ('powered', 2008, 2108, 0),
          's09': ('pauper', 2009, 2109, 0), 's10': ('peasant', 2010, 2110, 0), 's11': ('legacy', 2011, 2111, 0), 's12': ('powered', 2012, 2112, 0),
          's13': ('pauper', 2013, 2113, 40)}
D483_SPINES = {'s%02d' % k for k in range(4, 14)}   # branched at the pin; s01-s03 at 325c2dd8, over pre-D483 listings
RECHECKED = ('b-s02-peasant-2102', 'b-s03-legacy-2103')
VALIDATION_SHA = '7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de'
J166_S04_SHA = 'd78468cde81712cfcbf350e53f6caaeac8aecaabf657829067c94f92b100271a 2'
S04_DECK1_J167 = '873bb7e41c40f2ad4a40fbd8e3abf7185820fa93b1e90c40d2abff5907e3f003'   # J167's D482 deck 1 (its pilot registered it)
D484_SPINES = {'s%02d' % k for k in range(5, 14)}   # branched at J168's pin, by D484's random seat
D485_SPINES = {'s06', 's10'}   # re-branched by J169 at its pin, by D485's random seat
J168_RUN = (1792944870, 1792972283)   # J168: 2026-10-25 12:14:30 to 19:51:23 EDT
J168_ASIDE = {'b-s06-peasant-2106.j168-stale': 7350, 'b-s10-peasant-2110.j168-stale': 5875}   # J168's branch rows
RECHECKED_J169 = ('b-s06-peasant-2106.j168-stale', 'b-s10-peasant-2110.j168-stale', 'b-s13-pauper-2113')
J167_RUN3 = (1792929600, 1792940475)   # J167's run3: 2026-10-25 08:00 to 11:01:15 EDT (its s05 plan.json: 1792929653)
CUTS = {'earlyStop': [50, 100, 150], 'screen': 25, 'minOptions': 3}
out = {'atlases': 0, 'spinesDone': 0, 'problems': 0, 'warnings': 0, 'guardViolations': 0, 'violationsG1': 0, 'violationsG4': 0, 'violationsG6': 0,
       'g5keys': 0, 'g6keys': 0, 'd479keys': 0, 'scheduleKeys': 0, 'refusedCast': 0, 'noRepeatRefused': 0, 'noRepeatNoOp': 0,
       'xDrawn': 0, 'zeroXLeftOut': 0, 'zeroX': 0, 'branchErroredOptions': 0, 'unavailableOptionsOverBar': 0, 'cappedOptionsOverWarn': 0, 'truncatedLogs': 0,
       'planOk': 0, 'planBad': [], 'forgeSpines': 0, 'cutsSpines': 0,
       'branchRows': 0, 'branchTimeouts': 0, 'branchTimeoutsInStep': 0, 'timeoutShare': None, 'branchErrored': 0, 'branchUnavailable': 0,
       'branchRestarted': 0, 'branchCapped': 0, 'effectSourceNullBranches': 0, 'effectSourceNullCards': 0, 'exileLinksLostBranches': 0, 'exileLinksLostLinks': 0,
       'errorsByKind': {}, 'unavailableByReason': {}, 'decisions': 0, 'branchedInFull': 0, 'screened': 0, 'fill': 0, 'stoppedOptions': 0,
       'unitsPlanned': 0, 'unitsOk': 0, 'unitsShort': 0, 'fullShort': 0, 'meanRho': None,
       'listedDecisions': 0, 'identityDecisions': 0, 'identityOptions': 0, 'identityListingsShort': 0, 'd483Spines': 0, 'pre483Spines': 0,
       'repeatedPlays': 0, 'sharedToken': 0, 'kChanged': 0, 'kChangedBranched': 0, 'kChangedList': [],
       'scuteDecks': 0, 's04NewDeck': 0, 'asideOk': 0, 'recheckOk': 0, 'recheck': {},
       'asideS05Ok': 0, 's04J167Ok': 0, 'aside': {}, 'chooseSourceGuardRows': 0, 'chooseSourceGuard': 0, 'chooseSourceGuardKeyRows': 0, 'chooseSourceGuardOffD484': 0,
       'retargetedRows': 0, 'retargeted': 0, 'retargetedOffD485': 0, 'j169Spines': 0, 'asideJ168Ok': 0, 'recheckJ169Ok': 0, 'recheckJ169': {},
       'lostCastScanned': 0, 'lostCasts': 0, 'lostCastBranches': 0, 'lostCastForced': 0, 'lostCastOptions': 0, 'lostCastOptionsD485': -1, 'lostCastsD485': -1,
       'staleTargetRecords': 0, 'lostCastOptionList': [], 'biasedRows': -1, 'lostCastVoid': -1, 'confidentPer7Unbiased': None,
       'validationFolders': 0, 'validationDecks': 0, 'validationShaOk': 0, 'validationBranched': 0,
       'reads': 0, 'labels': -1, 'confident': -1, 'confidentPer7Worker10hNight': None, 'rowsUnmatched': -1, 'voidLabels': -1,
       'branchedRows': -1, 'trainingRows': -1, 'poolOk': 0, 'bySpine': {}}
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


def drawsha(d):
    h, n = hashlib.sha256(), 0
    h.update(open(os.path.join(d, 'decks.jsonl'), 'rb').read())
    for f in sorted(glob.glob(os.path.join(d, 'decks', '*.dck'))):
        h.update(os.path.basename(f).encode() + b'\0' + open(f, 'rb').read())
        n += 1
    return '%s %d' % (h.hexdigest(), n)


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
    # D483: the baseline's listing
    branched = set()
    af = os.path.join(dd, 'atlas.json')
    if os.path.exists(af):
        try:
            branched = {x['d'] for x in (json.load(open(af)).get('phaseB') or {}).get('decisions', [])}
        except (OSError, ValueError, KeyError, TypeError):
            pass
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
        if k in D483_SPINES:
            out['identityListingsShort'] += sum(1 for x in ls if len(x.get('identities') or []) != len(x['tokens']))
        for x in ls:
            ids, toks = x.get('identities') or [], x['tokens']
            if ids:
                out['repeatedPlays'] += 1 if len(set(ids)) < len(ids) else 0
                by = {}
                for t, i in zip(toks, ids):
                    by.setdefault(t, set()).add(i)
                out['sharedToken'] += 1 if any(len(v) > 1 for v in by.values()) else 0
            elif len(set(toks)) < len(toks):
                # a pre-D483 listing naming one token twice: the decision whose k D483 lowers (its twin)
                out['kChanged'] += 1
                out['kChangedBranched'] += 1 if x['d'] in branched else 0
                out['kChangedList'].append('%s d%d%s' % (k, x['d'], ' (branched)' if x['d'] in branched else ''))
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
    e = {'errored': 0, 'unavailable': 0, 'restarted': 0, 'capped': 0, 'effectSourceNull': 0, 'exileLinksLost': 0, 'chooseSourceGuard': 0, 'retargetedRows': 0, 'retargeted': 0, 'errorsByKind': {}}
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
            e['chooseSourceGuard'] += 1
            out['chooseSourceGuard'] += v
            out['chooseSourceGuardOffD484'] += 0 if key_of(name) in D484_SPINES else 1
        # D485: the plays the branch's random seats cast after replacing stale targets (a count, written when > 0)
        v = r.get('retargeted')
        if isinstance(v, (int, float)) and v > 0:
            e['retargetedRows'] += 1
            e['retargeted'] += v
            out['retargetedOffD485'] += 0 if key_of(name) in D485_SPINES else 1
    sp.update({'rows': n, 'timeouts': t, **e})
    out['branchRows'] += n
    out['branchTimeouts'] += t
    out['branchErrored'] += e['errored']
    out['branchUnavailable'] += e['unavailable']
    out['branchRestarted'] += e['restarted']
    out['branchCapped'] += e['capped']
    out['effectSourceNullBranches'] += e['effectSourceNull']
    out['exileLinksLostBranches'] += e['exileLinksLost']
    out['chooseSourceGuardRows'] += e['chooseSourceGuard']
    out['retargetedRows'] += e['retargetedRows']
    out['retargeted'] += e['retargeted']
if out['branchRows']:
    out['timeoutShare'] = round(out['branchTimeouts'] / out['branchRows'], 5)
# s04: its plan names J167's D482 deck 1 (registered: S04_DECK1_J167), which holds no Scute Swarm
try:
    p1 = json.load(open(D + '/b-s04-powered-2104/plan.json'))['deckA']
    out['s04NewDeck'] = 1 if hashlib.sha256(open(p1, 'rb').read()).hexdigest() == S04_DECK1_J167 and not scute(p1) else 0
except (OSError, ValueError, KeyError, IndexError, TypeError):
    pass
# J166's s04, set aside by run1: its spine folder (no atlas.json, its branch rows) and its deck folder (J166's draw)
try:
    a = D + '/b-s04-powered-2104.j166-scute'
    out['asideOk'] = 1 if os.path.isdir(a) and not os.path.exists(a + '/atlas.json') and os.path.exists(a + '/phaseB/branches.jsonl') \
        and drawsha(D + '/decks/s04-powered-2004.j166-scute') == J166_S04_SHA else 0
except OSError:
    pass


# the re-check of s02 and s03: J166's atlas kept as atlas.j166.json (phase B played), the new atlas.json's phase B 0 units (nothing
# played), exit 0, 0 problems, branches.jsonl and units.jsonl unmoved (recheck-rows.txt: name, rows before, after, units before, after)
def last_line(path, name):
    v = None
    try:
        for line in open(path):
            f = line.split()
            if f and f[0] == name:
                v = f[1:]
    except OSError:
        pass
    return v


for n in RECHECKED:
    r = {'exit': None, 'rowsSame': 0, 'j166Timing': 0, 'nothingPlayed': 0, 'problems': None}
    try:
        j = json.load(open(D + '/' + n + '/atlas.j166.json'))
        a = json.load(open(D + '/' + n + '/atlas.json'))
        r['j166Timing'] = 1 if ((j.get('timing') or {}).get('phaseB') or {}).get('units', 0) > 0 else 0
        r['nothingPlayed'] = 1 if ((a.get('timing') or {}).get('phaseB') or {}).get('units') == 0 else 0
        r['problems'] = len(a['checks']['problems'])
    except (OSError, ValueError, KeyError, TypeError):
        pass
    ex = last_line(D + '/recheck-exits.txt', n)
    r['exit'] = int(ex[0]) if ex and ex[0].lstrip('-').isdigit() else None
    rw = last_line(D + '/recheck-rows.txt', n)
    r['rowsSame'] = 1 if rw and len(rw) == 4 and rw[0] == rw[1] and rw[2] == rw[3] else 0
    out['recheck'][n] = r
    out['recheckOk'] += 1 if r['exit'] == 0 and r['problems'] == 0 and r['rowsSame'] and r['j166Timing'] and r['nothingPlayed'] else 0
# s04 as J167 left it (J168 plays nothing on it): an atlas.json with 0 problems, 2,900 branch rows, exit 0 in exits.txt, J167's deck 1
try:
    a = json.load(open(D + '/b-s04-powered-2104/atlas.json'))
    nrow = sum(1 for _ in open(D + '/b-s04-powered-2104/phaseB/branches.jsonl'))
    ex = last_line(D + '/exits.txt', 'b-s04-powered-2104')
    out['aside']['s04'] = {'rows': nrow, 'problems': len(a['checks']['problems']), 'exit': ex}
    out['s04J167Ok'] = 1 if nrow == 2900 and len(a['checks']['problems']) == 0 and ex == ['0'] and out['s04NewDeck'] == 1 else 0
except (OSError, ValueError, KeyError, TypeError):
    pass
# J167's s05, set aside by J168's run1: no atlas.json, a plan.json written inside J167's run3, its hung seat-1 frame logs (18 over 200 MB)
try:
    a = D + '/b-s05-pauper-2105.j167-cop'
    big = sum(1 for f in glob.glob(a + '/phaseB/frames/*.gz') if os.path.getsize(f) > 2e8)
    mt = os.path.getmtime(a + '/plan.json')
    out['aside']['s05'] = {'bigFrameLogs': big, 'planMtime': int(mt)}
    out['asideS05Ok'] = 1 if not os.path.exists(a + '/atlas.json') and J167_RUN3[0] <= mt <= J167_RUN3[1] and big >= 10 else 0
except OSError:
    pass
# J169: J168's s06 and s10 set aside by run1 (J168's atlas kept beside as atlas.j168.json, J168's branch rows, a baseline from J168's run)
for a, nrow in J168_ASIDE.items():
    try:
        p = D + '/' + a
        bt = os.path.getmtime(p + '/phaseB/baseline.json')
        rows = sum(1 for _ in open(p + '/phaseB/branches.jsonl'))
        out['aside'][a] = {'rows': rows, 'baselineMtime': int(bt), 'j168Atlas': os.path.exists(p + '/atlas.j168.json')}
        out['asideJ168Ok'] += 1 if rows == nrow and J168_RUN[0] <= bt <= J168_RUN[1] and os.path.exists(p + '/atlas.j168.json') else 0
    except OSError:
        pass
# J169: the spines it branched -- s06 and s10 whose baseline.json (written once, when a spine's play begins; a resume never rewrites it) is newer than J168
for f in glob.glob(D + '/' + G + '/phaseB/baseline.json'):
    name = os.path.basename(os.path.dirname(os.path.dirname(f)))
    out['j169Spines'] += 1 if key_of(name) in D485_SPINES and os.path.getmtime(f) > J168_RUN[1] else 0
# J169's re-check of J168's s06, s10 (aside) and s13 under D485's checker: as J167's of s02 and s03, J168's atlas kept as atlas.j168.json
for n in RECHECKED_J169:
    r = {'exit': None, 'rowsSame': 0, 'j168Timing': 0, 'nothingPlayed': 0, 'problems': None}
    try:
        j = json.load(open(D + '/' + n + '/atlas.j168.json'))
        a = json.load(open(D + '/' + n + '/atlas.json'))
        r['j168Problems'] = len(j['checks']['problems'])
        r['j168Timing'] = 1 if ((j.get('timing') or {}).get('phaseB') or {}).get('units', 0) > 0 else 0
        r['nothingPlayed'] = 1 if ((a.get('timing') or {}).get('phaseB') or {}).get('units') == 0 else 0
        r['problems'] = len(a['checks']['problems'])
    except (OSError, ValueError, KeyError, TypeError):
        pass
    ex = last_line(D + '/recheck-exits.txt', n)
    r['exit'] = int(ex[0]) if ex and ex[0].lstrip('-').isdigit() else None
    rw = last_line(D + '/recheck-rows.txt', n)
    r['rowsSame'] = 1 if rw and len(rw) == 4 and rw[0] == rw[1] and rw[2] == rw[3] else 0
    out['recheckJ169'][n] = r
    out['recheckJ169Ok'] += 1 if r['exit'] == 0 and r['problems'] == 0 and r['rowsSame'] and r['j168Timing'] and r['nothingPlayed'] else 0
# the lost casts, from metrics.py --scan's caches (the Report block writes them; a cache of another atlas.json is not read)
lsum = {'D485': 0, 'D485opts': 0, 'D485n': 0}
for f in sorted(glob.glob(D + '/' + G + '/atlas.json')):
    name = os.path.basename(os.path.dirname(f))
    try:
        c = json.load(open(L + '/lost/' + name + '.json'))
    except (OSError, ValueError):
        continue
    if c.get('atlasMtime') != int(os.path.getmtime(f)):
        continue
    sp = out['bySpine'].setdefault(name, {})
    sp.update({k: c[k] for k in ('lostCasts', 'lostCastBranches', 'lostCastForced', 'staleTargetRecords')})
    sp['lostCastOptions'] = len(c['lostCastOptions'])
    sp['lostCastCards'] = c['byCard']
    out['lostCastScanned'] += 1
    for k in ('lostCasts', 'lostCastBranches', 'lostCastForced', 'staleTargetRecords'):
        out[k] += c[k]
    out['lostCastOptions'] += len(c['lostCastOptions'])
    out['lostCastOptionList'] += ['%s %s' % (key_of(name), x) for x in c['lostCastOptions']]
    if key_of(name) in D485_SPINES and os.path.getmtime(os.path.dirname(f) + '/phaseB/baseline.json') > J168_RUN[1]:   # J169's own s06, s10 only
        lsum['D485'] += c['lostCasts']
        lsum['D485opts'] += len(c['lostCastOptions'])
        lsum['D485n'] += 1
if lsum['D485n'] == len(D485_SPINES):
    out['lostCastOptionsD485'], out['lostCastsD485'] = lsum['D485opts'], lsum['D485']
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
    out.update({'labels': lb['labels'], 'confident': lb['confident'], 'rowsUnmatched': lb['rowsUnmatched'], 'voidLabels': lb['voidLabels'],
                'branchedRows': lb['branched'], 'trainingRows': lb['trainingRows'],
                'confidentPer7Worker10hNight': lb['c_sizing7']['asRun']['confidentPer7Worker10hNight'],
                'biasedRows': lb['biasedRows'], 'lostCastVoid': lb['lostCastVoid'], 'confidentPer7Unbiased': lb['c_sizingReadUnbiased']['confidentPer7Worker10hNight']})
    # each spine's rows carry its band's pool, its registered seeds and its listing
    out['poolOk'] = sum(1 for n, m in lb['bySpine'].items() if n in SPINES and m['pool'] == 'random-' + SPINES[n][0]
                        and m['deckSeed'] == SPINES[n][1] and m['gameSeed'] == SPINES[n][2] and m['forgeMap'] == (SPINES[n][3] > 0)
                        and m['listing'] == ('D483' if n in D483_SPINES else 'pre-D483')
                        and m['randomSeat'] == ('D485' if n in D485_SPINES else 'pre-D485') and m['biased'] == ('lost-cast' if n == 's05' else None)
                        and m['lostScanned'] is True)
except (OSError, ValueError, KeyError, TypeError):
    pass
print(json.dumps(out))
PY
cat > var/lab-j169-local/bin/pilot.py <<'PY'
# J169 pilot: J168's pilot.py (J167's) with J169's paths. The smoke (J166's powered pair, deck seed 2099, game seed 2199, every cut on, a new folder) and the atlas-selftest's G5, G6
# and cuts legs, as one JSON object. J166's pilot.py, with the smoke's D483 listing read (an identity beside every token, no play twice).
# Standard library only; no engine. Run from the clone (the self-test's folder is var/cubelab/atlas-selftest).
import json, math, os
S = '/home/justin-a/code/lab/data/lab-j166/pilot-smoke-j169'
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
    lb = json.load(open('var/lab-j169-local/pilot-labels.json'))
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
# the readers' self-tests on J162's and J158's files (read, never written): each must give the registered numbers (J168's pilot's)
L2=/home/justin-a/code/lab/data/lab-j162
L8=/home/justin-a/code/lab/data/lab-j158
python3 -I var/lab-j169-local/bin/labels.py pauper5:confirm-j162:0:464:f6dba5e4:$L2/b-pauper5-464 synergy9:confirm-j162:0:465:f6dba5e4:$L2/b-synergy9-465 modern7:confirm-j162:0:466:f6dba5e4:$L2/b-modern7-466 ff5:confirm-j162:0:462:f6dba5e4:$L2/b-ff5-462 --out=var/lab-j169-local/labels-j162.jsonl --times=$L2/spine-times.txt > var/lab-j169-local/labels-j162.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j169-local/labels-j162.json')); a = d['a_confidentShare']; print(1 if (d['labels'], d['confident'], d['confidentForge'], d['rowsUnmatched'], d['voidLabels'], d['trainingRows'], a['point'], a['interval'], d['c_sizing7']['asRun']['labelsPer7Worker10hNight']) == (59, 7, 5, 0, 0, 0, 0.1186, [0.0339, 0.2203], 91) else 0)" > var/lab-j169-local/labels-self.txt 2>/dev/null || echo 0 > var/lab-j169-local/labels-self.txt
python3 -I var/lab-j169-local/bin/labels.py ff5:confirm-j158:0:461:-:$L8/b-ff5-461 peasant7:confirm-j158:0:463:-:$L8/b-peasant7-463 --times=$L8/spine-times.txt > var/lab-j169-local/labels-j158.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j169-local/labels-j158.json')); print(1 if (d['labels'], d['confident'], d['voidLabels'], d['voidList'], d['sameGameNotBlock']) == (32, 6, 3, ['ff5 d10 block:35>78', 'ff5 d14 block:21>71', 'ff5 d30 block:25>80,40>81'], []) else 0)" > var/lab-j169-local/void-self.txt 2>/dev/null || echo 0 > var/lab-j169-local/void-self.txt
python3 -I var/lab-j169-local/bin/reads.py pauper5:pauper5:$L2/b-pauper5-464/atlas.json synergy9:synergy9:$L2/b-synergy9-465/atlas.json modern7:modern7:$L2/b-modern7-466/atlas.json ff5:ff5:$L2/b-ff5-462/atlas.json > var/lab-j169-local/reads-j162.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j169-local/reads-j162.json')); iv = {n: (v['C1_castNow']['random']['point'], v['C1_castNow']['random']['interval'], v['C1_castNow']['verdict']) for n, v in d['iv_bySpine'].items()}; ok = iv == {'pauper5': (0.0411, [0.0126, 0.069], 'HOLDS'), 'synergy9': (0.0002, [-0.0133, 0.0136], 'NOT SHOWN'), 'modern7': (0.063, [0.017, 0.1231], 'HOLDS'), 'ff5': (0.0523, [-0.0047, 0.1313], 'NOT SHOWN')} and (d['i_sameBest']['point'], d['i_sameBest']['interval'], d['ii_rho']['point'], d['ii_rho']['interval']) == (0.5088, [0.322, 0.7], 0.2181, [-0.1188, 0.5799]); print(1 if ok else 0)" > var/lab-j169-local/reads-self.txt 2>/dev/null || echo 0 > var/lab-j169-local/reads-self.txt
python3 -I var/lab-j169-local/bin/cuts.py $L2/b-pauper5-464 $L2/b-synergy9-465 $L2/b-modern7-466 $L2/b-ff5-462 --times=$L2/spine-times.txt > var/lab-j169-local/cuts-j162.json || true
python3 -I -c "import json; n = json.load(open('var/lab-j169-local/cuts-j162.json'))['night']; print(1 if (n['spines'], n['branchGames'], n['savedShare'], n['checksSecPerKGames']) == (4, 55680, 0.0, 92.3) else 0)" > var/lab-j169-local/cuts-self.txt 2>/dev/null || echo 0 > var/lab-j169-local/cuts-self.txt
python3 -I var/lab-j169-local/bin/metrics.py $L2 'b-*' > var/lab-j169-local/metrics-j162.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j169-local/metrics-j162.json')); print(1 if (d['atlases'], d['problems'], d['branchRows'], d['errorsByKind'].get('play not rebuilt on the copy (D472, D476)'), d['xDrawn'], d['planOk']) == (4, 10, 55680, 2400, 32626, 0) else 0)" > var/lab-j169-local/metrics-self.txt 2>/dev/null || echo 0 > var/lab-j169-local/metrics-self.txt
# ... and on J166's s01-s03 and J167's s04 (J168's pilot's registered numbers, unchanged)
L6=/home/justin-a/code/lab/data/lab-j166
python3 -I var/lab-j169-local/bin/labels.py s01:random-pauper:2001:2101:325c2dd8:$L6/b-s01-pauper-2101 s02:random-peasant:2002:2102:325c2dd8:$L6/b-s02-peasant-2102 s03:random-legacy:2003:2103:325c2dd8:$L6/b-s03-legacy-2103 --times=$L6/spine-times.txt --training=1 > var/lab-j169-local/labels-j166.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j169-local/labels-j166.json')); a = d['a_confidentShare']; z = d['c_sizing7']['asRun']; print(1 if (d['labels'], d['confident'], d['confidentForge'], d['rowsUnmatched'], d['voidLabels'], d['trainingRows'], d['branched'], a['point'], a['interval'], z['labelsPer7Worker10hNight'], z['confidentPer7Worker10hNight'], d['byListing']['pre-D483']['labels']) == (22, 4, 1, 0, 0, 22, 22, 0.1818, [0.0417, 0.3636], 122, 22.3, 22) else 0)" > var/lab-j169-local/labels-j166-self.txt 2>/dev/null || echo 0 > var/lab-j169-local/labels-j166-self.txt
python3 -I var/lab-j169-local/bin/reads.py s01:random-pauper:$L6/b-s01-pauper-2101/atlas.json s02:random-peasant:$L6/b-s02-peasant-2102/atlas.json s03:random-legacy:$L6/b-s03-legacy-2103/atlas.json > var/lab-j169-local/reads-j166.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j169-local/reads-j166.json')); c = d['iv_bySpine']['s01']['C1_castNow']; print(1 if d['forgeSpines'] == ['s01'] and (c['random']['point'], c['random']['interval'], c['verdict'], d['i_sameBest']['point'], d['i_sameBest']['interval'], d['ii_rho']['point'], d['ii_rho']['interval']) == (0.0409, [0.0087, 0.0752], 'HOLDS', 0.5, [0.125, 0.875], 0.1933, [-0.4667, 0.82]) else 0)" > var/lab-j169-local/reads-j166-self.txt 2>/dev/null || echo 0 > var/lab-j169-local/reads-j166-self.txt
python3 -I var/lab-j169-local/bin/cuts.py $L6/b-s01-pauper-2101 $L6/b-s02-peasant-2102 $L6/b-s03-legacy-2103 --times=$L6/spine-times.txt > var/lab-j169-local/cuts-j166.json || true
python3 -I -c "import json; n = json.load(open('var/lab-j169-local/cuts-j166.json'))['night']; print(1 if (n['spines'], n['branchGames'], n['savedShare'], n['checksSecPerKGames'], n['idleShare']) == (3, 14280, 0.0769, 38.0, 0.089) else 0)" > var/lab-j169-local/cuts-j166-self.txt 2>/dev/null || echo 0 > var/lab-j169-local/cuts-j166-self.txt
python3 -I var/lab-j169-local/bin/labels.py s04:random-powered:2004:2104:bf978690:$L6/b-s04-powered-2104 --times=$L6/spine-times.txt --training=1 > var/lab-j169-local/labels-s04.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j169-local/labels-s04.json')); a = d['a_confidentShare']; z = d['c_sizing7']['asRun']; print(1 if (d['labels'], d['confident'], d['confidentForge'], d['rowsUnmatched'], d['voidLabels'], d['trainingRows'], d['branched'], a['point'], a['interval'], z['labelsPer7Worker10hNight'], z['confidentPer7Worker10hNight'], d['byListing']['D483']['labels']) == (3, 0, 0, 0, 0, 17, 17, 0.0, [0.0, 0.0], 61, 0.0, 3) else 0)" > var/lab-j169-local/labels-s04-self.txt 2>/dev/null || echo 0 > var/lab-j169-local/labels-s04-self.txt
# ... THE LOST-CAST SCAN on six of J168's spines (read only; caches in lost-self/, never the Report's lost/): the numbers in (d).
# s06 and s10 are read where J168's rows are (a pilot re-run after run1 finds them aside)
mkdir -p var/lab-j169-local/lost-self
for n in b-s02-peasant-2102 b-s05-pauper-2105 b-s06-peasant-2106 b-s07-legacy-2107 b-s10-peasant-2110 b-s13-pauper-2113; do
  p=$L6/$n; test -d $p.j168-stale && p=$p.j168-stale
  python3 -I var/lab-j169-local/bin/metrics.py --scan $p var/lab-j169-local/lost-self {workers} || true
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
            c = json.load(open('var/lab-j169-local/lost-self/%s.json' % f))
        except (OSError, ValueError):
            pass
    got = (c['logs'], c['casts'], c['lostCasts'], c['lostCastBranches'], c['lostCastForced'], c['lostCastOptions']) if c else None
    print('J169 lost-cast self-test', n, got, 'ok' if got == w else 'WANT %s' % (w,))
    ok = ok if got == w else 0
c = json.load(open('var/lab-j169-local/lost-self/b-s05-pauper-2105.json'))
ok = ok if (c['byCard'].get('1'), c['byCard'].get('2'), c['byOption']['d8/random/o0']) == (991, 600, {'branches': 200, 'lostBranches': 200, 'forcedLostBranches': 200}) else 0
print(ok)
" > var/lab-j169-local/lost-self.txt 2>/dev/null || echo 0 > var/lab-j169-local/lost-self.txt
cat var/lab-j169-local/lost-self.txt
# ... and on J168's 13 spines (results/J168/report/spines.json; computed 2026-10-25 by these readers from the data folder, read only),
# before run1 moves anything: s06 and s10 at J168's folders (or, on a pilot re-run after run1, their asides); v3's marks from lost-self/
largs=""; args=""; dirs=""
for n in b-s01-pauper-2101 b-s02-peasant-2102 b-s03-legacy-2103 b-s04-powered-2104 b-s05-pauper-2105 b-s06-peasant-2106 b-s07-legacy-2107 b-s08-powered-2108 b-s09-pauper-2109 b-s10-peasant-2110 b-s11-legacy-2111 b-s12-powered-2112 b-s13-pauper-2113; do
  s=$(echo "$n" | cut -d- -f2); b=$(echo "$n" | cut -d- -f3); g=$(echo "$n" | cut -d- -f4); d=$L6/$n
  case $n in b-s06-*|b-s10-*) test -d $d.j168-stale && d=$d.j168-stale ;; esac
  case $s in s01|s02|s03) sh=325c2dd8 ;; s04) sh=bf978690 ;; *) sh=26a8db00 ;; esac
  largs="$largs $s:random-$b:$((g - 100)):$g:$sh:$d"; args="$args $s:random-$b:$d/atlas.json"; dirs="$dirs $d"
done
python3 -I var/lab-j169-local/bin/labels.py $largs --times=$L6/spine-times.txt --training=1 --biased=s05 --lost=var/lab-j169-local/lost-self > var/lab-j169-local/labels-j168.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j169-local/labels-j168.json')); a = d['a_confidentShare']; z = d['c_sizing7']['asRun']; u = d['c_sizingReadUnbiased']; sp = {n: (m['labels'], m['confident']) for n, m in d['bySpine'].items()}; print(1 if (d['labels'], d['confident'], d['confidentForge'], d['rowsUnmatched'], d['voidLabels'], d['trainingRows'], d['branched'], a['point'], a['interval'], z['labelsPer7Worker10hNight'], z['confidentPer7Worker10hNight'], d['byListing']['pre-D483']['labels'], d['byListing']['D483']['labels']) == (97, 27, 2, 0, 0, 136, 136, 0.2784, [0.1417, 0.449], 112, 31.1, 22, 75) and sp == {'s01': (8, 1), 's02': (6, 1), 's03': (8, 2), 's04': (3, 0), 's05': (8, 1), 's06': (8, 5), 's07': (8, 1), 's08': (8, 3), 's09': (8, 4), 's10': (8, 4), 's11': (8, 1), 's12': (8, 3), 's13': (8, 1)} and (d['biasedRows'], d['lostCastVoid'], d['lostCastVoidList'], d['lostCastOptionRows'], u['labelsPer7Worker10hNight'], u['confidentPer7Worker10hNight'], u['left']) == (8, 1, ['s05 d8 cast:1'], ['s05 d0 o1,2', 's05 d3 o2', 's05 d5 o4', 's05 d8 o0'], 111, 32.4, ['s05']) else 0)" > var/lab-j169-local/labels-j168-self.txt 2>/dev/null || echo 0 > var/lab-j169-local/labels-j168-self.txt
python3 -I var/lab-j169-local/bin/reads.py $args > var/lab-j169-local/reads-j168.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j169-local/reads-j168.json')); iv = {n: (v['C1_castNow']['random']['point'], v['C1_castNow']['random']['interval'], v['C1_castNow']['verdict']) for n, v in d['iv_bySpine'].items()}; print(1 if d['forgeSpines'] == ['s01', 's07', 's13'] and iv == {'s01': (0.0409, [0.0087, 0.0752], 'HOLDS'), 's07': (-0.053, [-0.095, -0.018], 'NOT SHOWN'), 's13': (-0.021, [-0.0338, -0.0117], 'NOT SHOWN')} and (d['i_sameBest']['point'], d['i_sameBest']['interval'], d['ii_rho']['point'], d['ii_rho']['interval']) == (0.4583, [0.2188, 0.7917], 0.2284, [-0.1598, 0.8621]) else 0)" > var/lab-j169-local/reads-j168-self.txt 2>/dev/null || echo 0 > var/lab-j169-local/reads-j168-self.txt
python3 -I var/lab-j169-local/bin/cuts.py $dirs --times=$L6/spine-times.txt --recheck-times=$L6/recheck-times.txt > var/lab-j169-local/cuts-j168.json || true
python3 -I -c "import json; n = json.load(open('var/lab-j169-local/cuts-j168.json'))['night']; print(1 if (n['spines'], n['branchGames'], n['savedShare'], n['checksSecPerKGames'], n['idleShare']) == (13, 71525, 0.3186, 25.2, 0.1157) else 0)" > var/lab-j169-local/cuts-j168-self.txt 2>/dev/null || echo 0 > var/lab-j169-local/cuts-j168-self.txt
python3 -I var/lab-j169-local/bin/metrics.py $L6 'b-s??-*-21??' > var/lab-j169-local/metrics-j168.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j169-local/metrics-j168.json')); print(1 if (d['atlases'], d['spinesDone'], d['branchRows'], d['problems'], d['chooseSourceGuardRows'], d['chooseSourceGuard'], d['retargetedRows'], d['j169Spines'], d['d483Spines'], d['planOk']) == (13, 13, 71525, 3, 537, 6187, 0, 0, 10, 13) else 0)" > var/lab-j169-local/metrics-j168-self.txt 2>/dev/null || echo 0 > var/lab-j169-local/metrics-j168-self.txt
export CUBELAB_HOME_ROOT=var/cubelab/homes-J169
export LAB_DATA_DIR=/home/justin-a/code/lab/data
# the deck draws, on the data folder (no redraw); s06's and s10's decks are the ones J168's schedule headers hashed
python3 -I var/lab-j169-local/bin/draws.py > var/lab-j169-local/draws.json || echo '{"data12":-1}' > var/lab-j169-local/draws.json
cat var/lab-j169-local/draws.json
# the engine self-tests: atlas-selftest with its G5, G6, cuts and D483 legs, then seat-identity
tools/cubelab.sh atlas-selftest --jobs 2 && echo 1 > var/lab-j169-local/selftest.txt || echo 0 > var/lab-j169-local/selftest.txt
tools/cubelab.sh seat-identity --jobs {workers} && echo 1 > var/lab-j169-local/identity.txt || echo 0 > var/lab-j169-local/identity.txt
# the readers on the self-test's own cuts legs
C=var/cubelab/atlas-selftest
python3 -I var/lab-j169-local/bin/labels.py cuts:selftest:0:464:selftest:$C/cuts nf:selftest:0:464:selftest:$C/cuts-noforge --out=var/lab-j169-local/labels-cuts.jsonl --training=1 > var/lab-j169-local/labels-cuts.json || true
python3 -I var/lab-j169-local/bin/reads.py cuts:selftest:$C/cuts/atlas.json nf:selftest:$C/cuts-noforge/atlas.json > var/lab-j169-local/reads-cuts.json || true
python3 -I var/lab-j169-local/bin/cuts.py $C/cuts $C/cuts-noforge > var/lab-j169-local/cuts-cuts.json || true
python3 -I -c "import json; l = json.load(open('var/lab-j169-local/labels-cuts.json')); r = json.load(open('var/lab-j169-local/reads-cuts.json')); c = json.load(open('var/lab-j169-local/cuts-cuts.json')); s = [json.load(open('var/cubelab/atlas-selftest/%s/atlas.json' % x))['phaseB']['schedule']['labels'] for x in ('cuts', 'cuts-noforge')]; ok = l['rowsUnmatched'] == 0 and l['labels'] == sum(s) and l['trainingRows'] == l['branched'] and l['branched'] >= 2 and r['forgeSpines'] == ['cuts'] and list(r['iv_bySpine']) == ['cuts'] and c['night']['spines'] == 2 and l['byListing']['D483']['rows'] == l['branched']; print(1 if ok else 0)" > var/lab-j169-local/readers-cuts.txt 2>/dev/null || echo 0 > var/lab-j169-local/readers-cuts.txt
# the smoke: J166's powered pair at game seed 2199, a new folder, every cut on at that scale (J168's smoke exactly)
P=/home/justin-a/code/lab/data/lab-j166/decks/p-powered-2099/decks
tools/cubelab.sh atlas --deck-a $P/powered-2099-00001.dck --deck-b $P/powered-2099-00002.dck --seed 2199 --phase b --decisions 2 --min-options 3 --screen 5 --early-stop 10,15,20 --branch-random 25 --branch-forge 5 --chunk 5 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/pilot-smoke-j169 || true
python3 -I var/lab-j169-local/bin/labels.py smoke:random-powered:2099:2199:$(cat var/lab-j169-local/sha.txt):/home/justin-a/code/lab/data/lab-j166/pilot-smoke-j169 --out=var/lab-j169-local/pilot-labels.jsonl --training=1 > var/lab-j169-local/pilot-labels.json || true
python3 -I var/lab-j169-local/bin/reads.py smoke:random-powered:/home/justin-a/code/lab/data/lab-j166/pilot-smoke-j169/atlas.json > var/lab-j169-local/pilot-reads.json || true
python3 -I var/lab-j169-local/bin/cuts.py /home/justin-a/code/lab/data/lab-j166/pilot-smoke-j169 > var/lab-j169-local/pilot-cuts.json || true
python3 -I -c "import json; r = json.load(open('var/lab-j169-local/pilot-reads.json')); c = json.load(open('var/lab-j169-local/pilot-cuts.json')); print(1 if r['forgeSpines'] == ['smoke'] and 'smoke' in r['iv_bySpine'] and c['night']['spines'] == 1 and c['night']['branchGames'] >= 1 else 0)" > var/lab-j169-local/pilot-readers.txt 2>/dev/null || echo 0 > var/lab-j169-local/pilot-readers.txt
```
metrics: datadir = sh: cat var/lab-j169-local/datadir.txt 2>/dev/null || echo 0
metrics: state = sh: cat var/lab-j169-local/state.txt 2>/dev/null || echo 0
metrics: merged = sh: cat var/lab-j169-local/merged.txt 2>/dev/null || echo 0
metrics: has_d466_d472 = sh: cat var/lab-j169-local/has-d466-d472.txt 2>/dev/null || echo 0
metrics: has_d476 = sh: cat var/lab-j169-local/has-d476.txt 2>/dev/null || echo 0
metrics: has_d477 = sh: cat var/lab-j169-local/has-d477.txt 2>/dev/null || echo 0
metrics: has_d478 = sh: cat var/lab-j169-local/has-d478.txt 2>/dev/null || echo 0
metrics: has_d479 = sh: cat var/lab-j169-local/has-d479.txt 2>/dev/null || echo 0
metrics: has_d480 = sh: cat var/lab-j169-local/has-d480.txt 2>/dev/null || echo 0
metrics: has_d480f = sh: cat var/lab-j169-local/has-d480f.txt 2>/dev/null || echo 0
metrics: has_d481 = sh: cat var/lab-j169-local/has-d481.txt 2>/dev/null || echo 0
metrics: has_d482 = sh: cat var/lab-j169-local/has-d482.txt 2>/dev/null || echo 0
metrics: has_d483 = sh: cat var/lab-j169-local/has-d483.txt 2>/dev/null || echo 0
metrics: has_d484 = sh: cat var/lab-j169-local/has-d484.txt 2>/dev/null || echo 0
metrics: has_d485 = sh: cat var/lab-j169-local/has-d485.txt 2>/dev/null || echo 0
metrics: d481_d485_commits = sh: cat var/lab-j169-local/has-d481-d485-commits.txt 2>/dev/null || echo 0
metrics: xmx_unset = sh: cat var/lab-j169-local/xmx-unset.txt 2>/dev/null || echo 0
metrics: nodetests = sh: cat var/lab-j169-local/nodetests.txt 2>/dev/null || echo 0
metrics: redaction_self = sh: cat var/lab-j169-local/redaction-self.txt 2>/dev/null || echo 0
metrics: labels_self = sh: cat var/lab-j169-local/labels-self.txt 2>/dev/null || echo 0
metrics: void_self = sh: cat var/lab-j169-local/void-self.txt 2>/dev/null || echo 0
metrics: reads_self = sh: cat var/lab-j169-local/reads-self.txt 2>/dev/null || echo 0
metrics: cuts_self = sh: cat var/lab-j169-local/cuts-self.txt 2>/dev/null || echo 0
metrics: metrics_self = sh: cat var/lab-j169-local/metrics-self.txt 2>/dev/null || echo 0
metrics: labels_j166_self = sh: cat var/lab-j169-local/labels-j166-self.txt 2>/dev/null || echo 0
metrics: reads_j166_self = sh: cat var/lab-j169-local/reads-j166-self.txt 2>/dev/null || echo 0
metrics: cuts_j166_self = sh: cat var/lab-j169-local/cuts-j166-self.txt 2>/dev/null || echo 0
metrics: labels_s04_self = sh: cat var/lab-j169-local/labels-s04-self.txt 2>/dev/null || echo 0
metrics: lost_self = sh: tail -n 1 var/lab-j169-local/lost-self.txt 2>/dev/null || echo 0
metrics: labels_j168_self = sh: cat var/lab-j169-local/labels-j168-self.txt 2>/dev/null || echo 0
metrics: reads_j168_self = sh: cat var/lab-j169-local/reads-j168-self.txt 2>/dev/null || echo 0
metrics: cuts_j168_self = sh: cat var/lab-j169-local/cuts-j168-self.txt 2>/dev/null || echo 0
metrics: metrics_j168_self = sh: cat var/lab-j169-local/metrics-j168-self.txt 2>/dev/null || echo 0
metrics: draws = sh: cat var/lab-j169-local/draws.json 2>/dev/null || echo '{"data12":-1}'
metrics: selftest = sh: cat var/lab-j169-local/selftest.txt 2>/dev/null || echo 0
metrics: identity = sh: cat var/lab-j169-local/identity.txt 2>/dev/null || echo 0
metrics: readers_cuts = sh: cat var/lab-j169-local/readers-cuts.txt 2>/dev/null || echo 0
metrics: pilot_readers = sh: cat var/lab-j169-local/pilot-readers.txt 2>/dev/null || echo 0
metrics: pilot = sh: python3 -I var/lab-j169-local/bin/pilot.py 2>/dev/null || echo '{"smoke":{"problems":-1}}'
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
check: d481_d485_commits == 1
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
check: lost_self == 1
check: labels_j168_self == 1
check: reads_j168_self == 1
check: cuts_j168_self == 1
check: metrics_j168_self == 1
check: atlas.s04J167Ok == 1
check: atlas.asideOk == 1
check: atlas.asideS05Ok == 1
check: atlas.recheckOk == 2
check: draws.data12 == 1
check: draws.s06Draw == 1
check: draws.s06Decks == 1
check: draws.s10Draw == 1
check: draws.s10Decks == 1
check: draws.s04Data == 1
check: draws.s05Draw == 1
check: draws.smokeData == 1
check: draws.validationData == 1
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

## Commands
run1 sets J168's s06 and s10 aside and re-checks them there, then re-checks s13 in place; run2 and run3 play s06 and s10
fresh; run4 scans the frames of the 13 spines and the two asides; the last block is the Report. Every atlas command
resumes what is done. A spine atlas that finds a problem exits 3 and the job goes on (the exit is kept in `exits.txt`, a
re-check's in `recheck-exits.txt`). Each block asserts the data folder, its 50 GB and its deck files before it plays.
**Expected wall: run1 ~10 min; s06 ~75 min, s10 ~52 min at 6 workers (up to ~90 and ~64)**; the 3-h block timeout is ~2x
the longest.
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J169: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J169: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J169
D=/home/justin-a/code/lab/data/lab-j166
# J168's s06 and s10 (their stale targets lost spells: J168's read), set aside once and never deleted, BEFORE the re-check rewrites
# their plan.json: only if each is J168's -- an atlas.json, a plan.json and a baseline.json written inside J168's run, J168's branch
# rows. A folder this job began (a retry) has a later baseline and is resumed by its own block, never moved.
for x in b-s06-peasant-2106:7350 b-s10-peasant-2110:5875; do
  n=${x%%:*}; rows=${x##*:}; S=$D/$n
  if [ ! -e $S.j168-stale ] && [ -d $S ]; then
    python3 -I -c "import os, sys; d, want = sys.argv[1], int(sys.argv[2]); mt = [int(os.path.getmtime(d + f)) for f in ('/plan.json', '/phaseB/baseline.json')]; rows = sum(1 for _ in open(d + '/phaseB/branches.jsonl')); print('J169: %s: plan.json and baseline.json written at %s, %d branch rows' % (d, mt, rows)); sys.exit(0 if os.path.exists(d + '/atlas.json') and all(1792944870 <= t <= 1792972283 for t in mt) and rows == want else 'J169: ' + d + ' is not J168s spine (no atlas.json, files from outside J168s run, or other rows): not moved')" $S $rows
    mv $S $S.j168-stale
    echo "J169: J168's spine set aside: $S.j168-stale"
  fi
  test -d $S.j168-stale || { echo "J169: J168's $n is not set aside as $S.j168-stale" >&2; exit 1; }
done
# the re-check under D485's checker: J168's finished atlases resumed at the pin -- every unit is done, so nothing plays and only the
# checks run again; J168's atlas.json and atlas.md kept as .j168 copies first; rows and units counted before and after
for x in b-s06-peasant-2106.j168-stale:s06:peasant:2006:2106:0 b-s10-peasant-2110.j168-stale:s10:peasant:2010:2110:0 b-s13-pauper-2113:s13:pauper:2013:2113:40; do
  IFS=: read -r n s b ds g bf <<< "$x"
  K=$D/decks/$s-$b-$ds/decks; A=$K/$b-$ds-00001.dck; Bk=$K/$b-$ds-00002.dck
  test -s $D/$n/atlas.json && test -s $A && test -s $Bk || { echo "J169: $n: J168's atlas.json or its decks are missing" >&2; exit 1; }
  test -f $D/$n/atlas.j168.json || cp $D/$n/atlas.json $D/$n/atlas.j168.json
  test -f $D/$n/atlas.j168.md || cp $D/$n/atlas.md $D/$n/atlas.j168.md
  r0=$(wc -l < $D/$n/phaseB/branches.jsonl); u0=$(wc -l < $D/$n/phaseB/units.jsonl)
  t0=$(date +%s)
  rc=0; timeout 30m tools/cubelab.sh atlas --deck-a $A --deck-b $Bk --seed $g --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge $bf --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/$n || rc=$?
  echo "$n $rc" >> $D/recheck-exits.txt
  echo "$n $t0 $(date +%s) {workers}" >> $D/recheck-times.txt
  echo "$n $r0 $(wc -l < $D/$n/phaseB/branches.jsonl) $u0 $(wc -l < $D/$n/phaseB/units.jsonl)" >> $D/recheck-rows.txt
done
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J169: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J169: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J169
D=/home/justin-a/code/lab/data/lab-j166
n=b-s06-peasant-2106; K0=$D/decks/s06-peasant-2006; K=$K0/decks; A=$K/peasant-2006-00001.dck; B=$K/peasant-2006-00002.dck
# J168's s06 aside (run1), and the folder this block plays into is new or J169's own (a baseline written after J168 ended)
test -d $D/$n.j168-stale || { echo "J169: J168's s06 is not set aside (run1 does it)" >&2; exit 1; }
if [ -e $D/$n/phaseB/baseline.json ]; then python3 -I -c "import os, sys; sys.exit(0 if os.path.getmtime(sys.argv[1]) > 1792972283 else 'J169: ' + sys.argv[1] + ' is J168s: refusing to resume it')" $D/$n/phaseB/baseline.json; fi
# s06's decks: J166's draw, byte for byte the two decks J168's s06 schedule hashed
test "$(python3 -I var/lab-j169-local/bin/drawsha.py $K0)" = "191a5d8aac5d516f5472f0a01a0cacf660a9fa931e70b806a42723e4dfba161f 2" || { echo "J169: $K0 is not J166's s06 draw" >&2; exit 1; }
test "$(sha256sum < $A | cut -d ' ' -f 1)" = f0b8532d0e13788503f751dc239f4f02e459239aa745f73b4178dfdc880d5c2f && test "$(sha256sum < $B | cut -d ' ' -f 1)" = b90d1ae102f4b9b7a8dfbbfbbd4080bfbb026b962eb0db1c7a40a6a4b35d1072 || { echo "J169: $n: the decks under $K are not the ones J168's s06 hashed" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2106 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J169: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J169: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J169
D=/home/justin-a/code/lab/data/lab-j166
n=b-s10-peasant-2110; K0=$D/decks/s10-peasant-2010; K=$K0/decks; A=$K/peasant-2010-00001.dck; B=$K/peasant-2010-00002.dck
test -d $D/$n.j168-stale || { echo "J169: J168's s10 is not set aside (run1 does it)" >&2; exit 1; }
if [ -e $D/$n/phaseB/baseline.json ]; then python3 -I -c "import os, sys; sys.exit(0 if os.path.getmtime(sys.argv[1]) > 1792972283 else 'J169: ' + sys.argv[1] + ' is J168s: refusing to resume it')" $D/$n/phaseB/baseline.json; fi
test "$(python3 -I var/lab-j169-local/bin/drawsha.py $K0)" = "e4676bda05d0204f3ce43e3f8d1ee1a0ca0c8e24c7f8cf09860423d00ddedd9b 2" || { echo "J169: $K0 is not J166's s10 draw" >&2; exit 1; }
test "$(sha256sum < $A | cut -d ' ' -f 1)" = d051adba41580377b7b1f627bc62f40ae25b5bac182c37f8bd7ec877bba6ce59 && test "$(sha256sum < $B | cut -d ' ' -f 1)" = 3ee08305330298d022189e0404dc8e0d0c874acb6e0a61ffea3ecb71ddb48b1d || { echo "J169: $n: the decks under $K are not the ones J168's s10 hashed" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2110 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
# the lost casts, from the frames: one cache a folder (the 13 spines and J168's two asides), stamped with its atlas.json's mtime
D=/home/justin-a/code/lab/data/lab-j166
mkdir -p var/lab-j169-local/lost
for d in $D/b-s??-*-21?? $D/b-s06-peasant-2106.j168-stale $D/b-s10-peasant-2110.j168-stale; do
  test -f $d/atlas.json || { echo "J169: $d: no atlas.json, not scanned"; continue; }
  python3 -I var/lab-j169-local/bin/metrics.py --scan $d var/lab-j169-local/lost {workers}
done
```
cores: 1
```bash
D=/home/justin-a/code/lab/data/lab-j166
mkdir -p $D/report
: > $D/report/missing.txt
# the walls as run: J168's s06 and s10 lines (begun inside J168's run) carry their aside names; J169's keep the spine's
python3 -I -c "
import sys
D = sys.argv[1]
with open(D + '/report/spine-times-asrun.txt', 'w') as out:
    for line in open(D + '/spine-times.txt'):
        f = line.split()
        if len(f) >= 3 and f[0] in ('b-s06-peasant-2106', 'b-s10-peasant-2110') and f[1].isdigit() and int(f[1]) <= 1792972283:
            f[0] += '.j168-stale'
        out.write(' '.join(f) + '\n')
" $D || echo "spine-times-asrun.txt: failed" >> $D/report/missing.txt
T=$D/report/spine-times-asrun.txt
LO="--lost=var/lab-j169-local/lost --d485=s06,s10 --biased=s05 --training=1 --times=$T"
args=""; largs=""; largs10=""; largs9=""; largsU=""; largsD=""; dirs=""
# the night's 13 spines: b-s??-*-21?? matches no .j168-stale, .j167-cop, .j166-scute or pilot folder
for d in $D/b-s??-*-21??; do
  n=$(basename "$d"); s=$(echo "$n" | cut -d- -f2); b=$(echo "$n" | cut -d- -f3); g=$(echo "$n" | cut -d- -f4)
  # each spine's branches' own commit: s01-s03 J166's (325c2dd8), s04 J167's (bf978690), s06 and s10 this pin, the rest J168's (26a8db00)
  case $s in s01|s02|s03) sh=325c2dd8 ;; s04) sh=bf978690 ;; s06|s10) sh=$(cat var/lab-j169-local/sha.txt) ;; *) sh=26a8db00 ;; esac
  if [ -f "$d/atlas.json" ]; then
    cp "$d/atlas.json" "$D/report/$n.atlas.json"
    cp "$d/atlas.md" "$D/report/$n.atlas.md" || echo "$n: no atlas.md" >> $D/report/missing.txt
    a="$s:random-$b:$((g - 100)):$g:$sh:$d"
    args="$args $s:random-$b:$d/atlas.json"; largs="$largs $a"; dirs="$dirs $d"
    case $s in s01|s02|s03) ;; *) largs10="$largs10 $a" ;; esac
    case $s in s01|s02|s03|s04) ;; *) largs9="$largs9 $a" ;; esac
    case $s in s05) ;; *) largsU="$largsU $a" ;; esac
    case $s in s06|s10) largsD="$largsD $a" ;; esac
  else
    echo "$n: no atlas.json" >> $D/report/missing.txt
  fi
done
for f in var/lab-j169-local/lost/*.json; do cp "$f" "$D/report/lost-$(basename "$f")"; done || echo "lost caches: none" >> $D/report/missing.txt
python3 -I var/lab-j169-local/bin/labels.py $largs --out=$D/report/labels.jsonl $LO > $D/report/labels.json || echo "labels.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j169-local/bin/labels.py $largs10 $LO > $D/report/labels-d483.json || echo "labels.py (the D483 spines) exited $?" >> $D/report/missing.txt
python3 -I var/lab-j169-local/bin/labels.py $largs9 $LO > $D/report/labels-d484.json || echo "labels.py (the D484 spines) exited $?" >> $D/report/missing.txt
python3 -I var/lab-j169-local/bin/labels.py $largsU $LO > $D/report/labels-unbiased.json || echo "labels.py (the unbiased spines) exited $?" >> $D/report/missing.txt
python3 -I var/lab-j169-local/bin/labels.py $largsD $LO > $D/report/labels-d485.json || echo "labels.py (the D485 spines) exited $?" >> $D/report/missing.txt
head -n 20 $D/report/labels.jsonl > $D/report/labels-head.jsonl || echo "labels.jsonl: none" >> $D/report/missing.txt
python3 -I var/lab-j169-local/bin/reads.py $args > $D/report/reads.json || echo "reads.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j169-local/bin/cuts.py $dirs --times=$T --recheck-times=$D/recheck-times.txt > $D/report/cuts.json || echo "cuts.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j169-local/bin/metrics.py > $D/report/tool.json || echo "metrics.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j169-local/bin/draws.py --report > $D/report/draws.json || echo "draws.py exited $?" >> $D/report/missing.txt
# the validation draw (J166's, untouched), recorded for the job that will branch it
python3 -I -c "import glob, json, os; D = '$D'; vs = sorted(glob.glob(D + '/validation/v*')); rows = [{'set': os.path.basename(v).split('-')[0], 'band': os.path.basename(v).split('-')[1], 'pool': 'random-' + os.path.basename(v).split('-')[1], 'deckSeed': int(os.path.basename(v).split('-')[2]), 'reservedGameSeed': int(os.path.basename(v).split('-')[2]) + 100, 'decks': sorted(glob.glob(v + '/decks/*.dck')), 'split': 'validation', 'training': False} for v in vs]; print(json.dumps({'note': 'the 4a validation draw (J166): drawn as the spines were (D447, --cross-band 0.10, before D482), written as deck files only, never branched; no job may train on these decks or use these seeds before the validation job that branches them', 'drawSha256': '7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de', 'sets': rows}, indent=1))" > $D/report/validation.json || echo "validation.json: failed" >> $D/report/missing.txt
python3 -I -c "import glob, json, os; D = '$D'; out = {}; [out.__setitem__(os.path.basename(d), {k: json.load(open(d + '/plan.json')).get(k) for k in ('deckA', 'deckB', 'seed', 'branchRandom', 'branchForge', 'decisions', 'chunk', 'cuts')}) for d in sorted(glob.glob(D + '/b-s??-*-21??'))]; print(json.dumps({'note': 's01-s03 branched by J166 at 325c2dd8 (s02, s03 re-checked by J167); s04 by J167 at bf978690 on the D482 draw; s05, s07-s09, s11-s13 by J168 at 26a8db00 (s13 re-checked by J169; s05 marked biased: lost-cast); s06 and s10 by J169 at the pin (D485), J168s kept aside as .j168-stale; the hung J167 s05 kept aside as b-s05-pauper-2105.j167-cop', 'spines': out}, indent=1))" > $D/report/spines.json || echo "spines.json: failed" >> $D/report/missing.txt
for f in exits.txt spine-times.txt recheck-exits.txt recheck-times.txt recheck-rows.txt; do cp $D/$f $D/report/$f || echo "$f: none" >> $D/report/missing.txt; done
# disarm the abort gate: a re-post of this file starts disarmed until its own pilot
rm -f var/lab-j169-local/armed.txt
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
check: atlas.j169Spines == 2
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
check: atlas.biasedRows >= 1
check: atlas.poolOk == 13
check: atlas.recheckOk == 2
check: atlas.recheckJ169Ok == 3
check: atlas.asideJ168Ok == 2
check: atlas.asideOk == 1
check: atlas.asideS05Ok == 1
check: atlas.s04J167Ok == 1
check: atlas.s04NewDeck == 1
check: atlas.scuteDecks == 0
check: atlas.d483Spines == 10
check: atlas.pre483Spines == 3
check: atlas.identityListingsShort == 0
check: atlas.repeatedPlays == 0
check: atlas.chooseSourceGuardOffD484 == 0
check: atlas.retargetedOffD485 == 0
check: atlas.lostCastScanned == 13
check: atlas.lostCastOptionsD485 == 0

## Abort if
abort: armed == 1 and unit_errors > 20
abort: armed == 1 and engine_errors > 500
abort: armed == 1 and big_frames >= 6
abort: data_free_gb < 50
`armed` is 1 only from this job's pilot to its Report block, so the first three cannot read another run's files. The
counts read `b-s??-*-21??` only: the eleven kept spines add J168's 0 unit errors and 0 engine errors, and J168's s06 and
s10 stop counting once run1 has set them aside. **`big_frames`** is J167's hung s05's signature (a frame log over 200
MB, where a sound branch's is kilobytes), counted only in spine folders whose plan was written after J168 ended; D484
makes it impossible, and if it fires a loop D484 does not cover is back. `unit_errors == 0` means every unit of the 13
spines finished; `atlas.unitsShort` and `atlas.fullShort` as J168. **`atlas.problems == 0`** over the 13 now includes
s13 **after** its re-check and J169's s06 and s10: a D485 that does not cover one of J168's flagged logs fails it, and
`recheckJ169` names which. **`atlas.lostCastOptionsD485 == 0`** fails if any option of J169's s06 or s10 lost its own
forced cast in more than half of its branches (it reads -1, and fails, until both are J169's and scanned). **A random
library deck can meet a card no atlas has played**: a new tool gap fails `atlas.problems == 0`, its spine's exit 3 is
kept, and the summary names it with its error text and cost. An option capped past 0.25 is a warning, reported, never a
failed check.

## Report
collect: /home/justin-a/code/lab/data/lab-j166/report/*.atlas.md
collect: /home/justin-a/code/lab/data/lab-j166/report/*.atlas.json
collect: /home/justin-a/code/lab/data/lab-j166/report/labels.json
collect: /home/justin-a/code/lab/data/lab-j166/report/labels-d483.json
collect: /home/justin-a/code/lab/data/lab-j166/report/labels-d484.json
collect: /home/justin-a/code/lab/data/lab-j166/report/labels-d485.json
collect: /home/justin-a/code/lab/data/lab-j166/report/labels-unbiased.json
collect: /home/justin-a/code/lab/data/lab-j166/report/labels-head.jsonl
collect: /home/justin-a/code/lab/data/lab-j166/report/reads.json
collect: /home/justin-a/code/lab/data/lab-j166/report/cuts.json
collect: /home/justin-a/code/lab/data/lab-j166/report/tool.json
collect: /home/justin-a/code/lab/data/lab-j166/report/lost-*.json
collect: /home/justin-a/code/lab/data/lab-j166/report/draws.json
collect: /home/justin-a/code/lab/data/lab-j166/report/validation.json
collect: /home/justin-a/code/lab/data/lab-j166/report/spines.json
collect: /home/justin-a/code/lab/data/lab-j166/report/exits.txt
collect: /home/justin-a/code/lab/data/lab-j166/report/spine-times.txt
collect: /home/justin-a/code/lab/data/lab-j166/report/spine-times-asrun.txt
collect: /home/justin-a/code/lab/data/lab-j166/report/recheck-exits.txt
collect: /home/justin-a/code/lab/data/lab-j166/report/recheck-times.txt
collect: /home/justin-a/code/lab/data/lab-j166/report/recheck-rows.txt
collect: /home/justin-a/code/lab/data/lab-j166/report/missing.txt
The summary says, for Justin, in plain words and numbers only:
- **The population, first line:** random library decks by band, drawn as the census draws them, on the cut design;
  `training: true`, `pool: random-<band>`; s01-s03 branched by J166 at 325c2dd8 over pre-D483 listings, s04 by J167 at
  bf978690, s05, s07-s09 and s11-s13 by J168 at 26a8db00, **s06 and s10 by J169 at the pin (D485's random seat)**;
  **s05 marked `biased: lost-cast`** and out of the headline sizing; never pooled with any earlier atlas.
- **The re-checks** (`recheckJ169`): s06 and s10 (aside) and s13 under D485's checker -- exit, problems against J168's
  (2, 16 and 6 logs), rows and units unmoved, nothing played, each re-check's wall.
- **s06 and s10 on D485, against J168's:** exit, wall, rows, timeouts, unit errors; **the lost casts** from the frames
  (`lostCastsD485` against J168's 212 and 514; the cards; `lostCastOptionsD485`, checked 0) and `failed_to_target` in the
  logs (information); **D485's counter** (`retargetedRows`, `retargeted`, `staleTargetRecords`); the labels and confident
  labels on each against J168's (s06 8/5, s10 8/4), and what happened at the decisions J168's read doubted (s06 d2, d6,
  d8; s10 d2, d10, d15, d22, d28), by decision index and option token, with no verdict: a re-branched spine is a new random
  policy (D485's comparability), so a difference is a candidate.
- **The lost casts over the night** (`lost-*.json`, `tool.json`): per spine, the lost-cast options (s05's five
  expected), and J168's aside s06 and s10 beside.
- **Labels per night** (`labels.json` (c)): labels and confident labels per spine, per band and for the night, per
  7-worker 10-h night; **the sizing read without s05 (`c_sizingReadUnbiased`, the headline) and over all 13 as run
  (`c_sizingRead`)**, against J168's 32.4 and 31.1, J166's 22.3 and the review's ~25-27; over the two D485 spines alone
  (`labels-d485.json`) beside; what 1,000 labels and 1,000 confident labels take at this rate. Say that s05 is marked
  and kept, and out of the headline only.
- **What the cuts saved** (`cuts.json`), **D483**, **D484** and **the tool on 26 decks** (`tool.json`), **(a)**,
  **(b)**, **(i)-(iii)**, **(iv)** on s01, s07, s13 with J158's and J162's per-pair verdicts beside, never pooled,
  **(v)**, **per spine** one line (with the job and commit that branched it), **the validation draw** (unchanged), **the
  checks** with any exit explained, **the intervals' coarseness**, and **the label set** (`labels.jsonl`'s rows, v3's
  fields, its two listings, two random seats and four commits, that the spine folders and the asides are kept for rung
  4), as J168's Report asks.
- **No verdict** beyond (iv)'s: any other surprise is a candidate until a fresh draw shows it.
