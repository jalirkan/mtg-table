id: J172
title: The move atlas, rung 4b, re-checked -- J171's night on the D487 pin, NOTHING REPLAYED: J171's five flagged spines (s02, s04, s08, s09, s10: 4,501 frame logs failed the M55 audit on one record shape, a targeting part Forge's answer left empty written `chosen: null`) re-checked in place by resuming their finished atlases under D487's checker, which accepts exactly J171's legacy null-target shape and counts it (`M55 legacy null target records=<n>`); J171's atlas.json and atlas.md kept beside as `atlas.j171.*`, rows and units unmoved, the re-checks' exits and walls in files of their own; the legacy count read from the pinned checker's own per-log lines by a sweep of the five spines' 54,350 branch logs (expected 4,717 records in 4,501 logs); then J171's Report re-run over all 13 spines with J171's readers (byte for byte, two one-line path edits, registered), the label contract v4 and the labels unchanged (101 labels, 28 confident, a check). No deck drawn, no game played, no smoke. Never pooled with any label, read, ladder result or grade from before D486
public_title: Move atlas 4b re-check: legacy null targets
public_est: ~45 min
public_decides: None by itself; J171 night re-checked under D487, nothing replayed
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2.7
repos: mtg-table@7476e706c98b5bce31d814e84ae7fed4b15faa85 (origin/main: the merge of pc/d487-target-none, D487, on f2b4e9c2; the owner writes that merge's sha here before posting; merged == 1, the commits that added D481-D487's decision files and atlas_code (the atlas's resume path is f2b4e9c2's) checked by the pilot)
decides: nothing by itself. It puts J171's night on record clean: J171 (2026-10-26, 00:22-11:55, STATUS `failed`) passed 41 of its 42 final checks and failed `atlas.problems == 0` with 5 -- the redaction checker's M55 audit on s02 (1,212 logs), s04 (61), s08 (38), s09 (2,361) and s10 (829), every one the same record shape (`results/J171/summary.md` section 1; D487's Context): a `target` record of Forge's own answer whose part was left empty, `chosen: null`, beside options that list cards since D486. D487 read all 4,717 records against their casts (no target outside the options; nothing leaked), decided to accept that legacy shape, dated and counted, rather than re-run the five spines (about four hours), and writes `target:none` in records from now on. J172 re-checks the five under D487's checker, counts the legacy records, and re-runs J171's Report, so that `atlas.problems == 0` stands on the night's record beside J171's labels, unchanged
hypothesis: none about the maps. Registered expectations: each re-check exits 0 with `checks: clean` and plays nothing (phase B 0 units; branch and unit rows unmoved); the five spines' 54,350 branch logs all PASS the pinned checker with 4,717 legacy null target records in 4,501 logs (D487's sweep: s02 1,426 in 1,212, s04 62 in 61, s08 39 in 38, s09 2,361 in 2,361, s10 829 in 829) and 0 empty mandatory target parts; the eight spines J171 left clean are untouched; the frame scan gives J171's numbers on all 13; the Report gives J171's labels (101, 28 confident) and, as information, J171's labels.jsonl byte for byte and J171's reads, cuts and comparison
rule: D451 (method; no outcome rule) with D458-D486 as J171's file names them, and D487 (a targeting part left empty answers `target:none`; the M55 audit accepts J171's legacy null-target shape, counted as `M55 legacy null target records`; decided: accept, not re-run). Pre-registered here, before any J172 data: J171's label contract v4 and its readers (labels.py, reads.py, cuts.py, metrics.py, compare.py, draws.py) exactly as J171 ran them, copied byte for byte by readers.py with two one-line path edits (metrics.py's scan caches and sha.txt in var/lab-j172-local; cuts.py's phase B timing from `atlas.j171.json`), every sha256 registered; recheck.py (the re-checks, the untouched eight, the scan against J171's) and legacy.py (the legacy count); the final checks `recheck.ok == 5`, `legacy.records == 4717`, `legacy.logsWithRecords == 4501`, `atlas.labels == 101` and `atlas.confident == 28` beside J171's 42. J171's reads stand as J171 measured them: J172 adds no read
followup: morning-read
est: ~45 min at 6 workers (range 35 min to 1 h): pilot ~5 min (the pin's greps, the node tests, the redaction self-test, the readers' copy and the legacy sweep's self-test; no deck draw, no engine self-test, no smoke); the five re-checks ~15 min (J169's re-checks took 130-150 s on 11,752-14,702 frame logs; J171's flagged spines took up to 382 s of redaction only because a failing batch is re-run one log at a time, which D487's checker no longer meets); the legacy sweep ~8-15 min (D487's: 7 min 42 s at six for 54,360 logs; this draft's run of s02 at four: 104 s for 4,150); the frame scan of the 13 ~4 min (J171's run14: 3.5 min); the Report ~1 min. Disk: a few MB (five atlas copies, the report)
resumable: yes
timeout: 1h
progress: lines /home/justin-a/code/lab/data/lab-j170/recheck-exits.txt of 5
metrics: branches = lines /home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/branches.jsonl
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/branches.jsonl "\"engineError\":true"
metrics: branch_timeouts = count /home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/branches.jsonl "\"timedOut\":true"
metrics: unit_errors = count /home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/units.jsonl "\"ok\":false"
metrics: big_frames = sh: python3 -c "import glob, os; print(sum(1 for f in glob.glob('/home/justin-a/code/lab/data/lab-j170/b-s??-*-21??/phaseB/frames/*.gz') if os.path.getsize(f) > 2e8))" 2>/dev/null || echo 0
metrics: armed = sh: cat var/lab-j172-local/armed.txt 2>/dev/null || echo 0
metrics: atlas = sh: python3 -I var/lab-j172-local/bin/metrics.py 2>/dev/null || echo '{"problems":-1}'
metrics: recheck = sh: python3 -I var/lab-j172-local/bin/recheck.py 2>/dev/null || echo '{"ok":-1}'
metrics: legacy = sh: cat var/lab-j172-local/legacy.json 2>/dev/null || echo '{"scanned":-1}'
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: data_used_gb = sh: python3 -c "import os; print(round(sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk('/home/justin-a/code/lab/data/lab-j170') for f in fs) / 1e9, 2))" 2>/dev/null || echo 0
headline: atlas.problems, recheck.ok, legacy.records, legacy.logsWithRecords, legacy.scanned, atlas.labels, atlas.confident, atlas.confidentPer7Worker10hNight, atlas.lostCastOptions, recheck.recheckSec

**Before posting -- the owner, by hand (nothing in this file does them).**
1. **Write the pin:** replace `7476e706c98b5bce31d814e84ae7fed4b15faa85` in `repos:` with the sha of the merge of `pc/d487-target-none` on origin/main
   (`runner.sh check` fails until then, on that placeholder alone).
2. **If D487's review renamed anything this file reads, correct it before posting:** the checker's printed line
   `M55 legacy null target records=<n>` and `M76 empty mandatory target parts=<n>` (legacy.py's `LEG` and `NOT`), the names the
   pilot's `has-d487` grep reads (`legacyNullTarget`, `target:none` and that line in `tools/check-redaction.mjs`, `TARGET_NONE`
   in `Decisions.java`, protocol `| M76 |`, an `m76-*.jsonl` fixture), and the negative control of the legacy self-test,
   `fixtures/negative/redaction/m76-chosen-null-trigger.jsonl` (a trigger's null target, which must FAIL). This draft was checked
   against the branch's 651d7d52 and its review edits in the worktree (the legacy shape bounded to a move-atlas log started
   before 2026-10-26T18:00Z, `LEGACY_NULL_TARGET_BEFORE`): J171's logs (05:20Z-11:52Z) pass under both, and the trigger fixture fails.
3. **If anything else merged between f2b4e9c2 and the pin**, the pilot's `atlas_code` fails when it touched the atlas's resume
   path (`tools/cubelab.sh`, `tools/cubelab/{atlas,atlaschecks,atlascuts,censusplay,labdata}.ts`): read the change, and either
   re-pin on D487's merge alone or write here why the resume of J171's finished plans is unaffected.
4. **Nothing to make, move or clean in lab-j170**, and `var/lab-j171-local/` must stay as J171 left it (its readers, `sha.txt`,
   its scan caches, its redraw): J172 reads them and writes none of them. Post nothing that writes lab-j170 beside J172.

**Why J172.** J171 (2026-10-26 00:22-11:55, at f2b4e9c2) was the first atlas night on D486's random seat: 13 fresh spines,
71,940 branch rows, 0 engine errors, 0 timeouts, 0 unit errors, 101 labels and 28 confident (28.9 [19.2, 41.8] a 7-worker 10-h
night), 85 of 85 pilot checks and 41 of 42 final checks passed. `atlas.problems == 0` read **5**: the redaction checker's M55
audit failed on one record shape on five spines -- `decision N chosen null is not a token (M55, D347)` -- and nothing else
(J171's read, `results/J171/summary.md` section 1):

| spine | logs failed | records of the shape | the spell behind it |
|---|---|---|---|
| s02 | 1,212 | 1,426 | Tear Asunder |
| s04 | 61 | 62 | The Wandering Emperor's +1, Garruk, Curse Breaker's +2 |
| s08 | 38 | 39 | Minsc & Boo's +1 |
| s09 | 2,361 | 2,361 | Tear Asunder |
| s10 | 829 | 829 | Tear Asunder |
| **all** | **4,501** | **4,717** | |

**D487 is in the pin** (the pilot checks it). It verified every one of the 4,717 records against the cast that followed (no
cast carried a target outside its records' options; nothing leaked: the shut half of Tear Asunder's kicker, `TargetMin$` and
`TargetMax$` both 0, and "up to" planeswalker abilities Forge left empty), and decided two things:
- **From now on** a part left empty answers `target:none`, listed beside the part's `min` (M76); a part whose maximum is 0
  writes nothing, as before D486.
- **J171's records are accepted, not re-run** (D487 point 3): the audit accepts exactly J171's legacy shape -- `kind:
  "target"`, `by: "forge"`, `source: "targets"`, `chosen: null`, two or more `target:<id>` / `target:p<id>` options, no
  `target:none`, none of `min`, `why`, `complete`, `hidden`, `explore`, `search` -- and counts it per log, printing
  `M55 legacy null target records=<n>`. Any other null answer still fails. D487's own sweep of the five spines' frame logs
  under the new checker: **54,360 PASS, 0 FAIL, 4,717 legacy records in 4,501 logs**, the logs J171 flagged and no other.
So J172 needs no game: it re-runs the checks J171's atlases ran, under the checker that now passes them, and puts the result
on the night's record.

**What J172 does, in order.**
1. **The pilot**: J171's pin checks and D487's; J171's outputs as J171 left them (rows, exits, walls, report, the five
   flagged atlases with J171's one problem each, the eight clean ones); J171's readers copied byte for byte (two one-line
   edits, registered); the legacy sweep's self-test on two flagged J171 logs, one clean one and a negative control.
   **No deck drawn, no engine self-test, no smoke: J172 plays no game**, so there is nothing a smoke would show.
2. **run1-run5: the five re-checks**, one block a spine (s02, s04, s08, s09, s10), each resuming J171's finished atlas in place
   under `timeout 30m`. run1 first moves J171's `report/` aside to `report.j171/` (never deleted; the Report writes `report/`
   anew).
3. **run6: the legacy count** (legacy.py): the pinned checker over the five spines' 54,350 branch logs, 100 a call.
4. **run7: the frame scan** of the 13 spines (J171's metrics.py `--scan`, into J172's caches: a re-check rewrites atlas.json, so
   J171's caches, stamped with the atlas.json each was made from, no longer apply to the five; all 13 are made again, ~4 min,
   and each must equal J171's but for the stamp).
5. **The Report**: J171's Report block over all 13 spines, with J171's readers.

## The re-check: resuming a finished atlas plays nothing and redoes only the checks

As J167's run1 re-checked s02 and s03 and J169's run1 re-checked J168's s06, s10 and s13 (`drafts/J169-atlas-4a-night-four.md`,
(b): every re-check exit 0, rows and units unmoved, phase B 0 units, `checks: clean`, 130-150 s each). The code is J171's: the
pilot's `atlas_code` requires `git diff f2b4e9c2 HEAD` to touch none of `tools/cubelab.sh` and
`tools/cubelab/{atlas,atlaschecks,atlascuts,censusplay,labdata}.ts` (D487 touches none of `tools/cubelab/`; D487 point 4: the
replay and the schedule compare the search's candidate tokens and the plan's and decks' hashes, never a decision record, and
its s09 baseline on the branch listed J171's 27 decisions with J171's tokens). So, on each of the five:
- `plan.json`'s resume check compares `deckA, deckB, seed, turnCap, options, chunk, branchTimeoutSec, cuts`: J171's flags and
  decks exactly (the decks' paths absolute under the data folder; each block checks the draw and both decks against J171's
  registered sha256s first). The file is then rewritten with the same keys.
- `baseline.json` exists, so the baseline is not played again; `phaseB/schedule.jsonl`'s header (J171's plan and deck hashes)
  replays; every unit is done (`unitsShort` 0 on all 13), so phase B returns at once with `units: 0` and no worker starts.
- `writeAtlasChecked` runs every check from the folder's files on `--checks-parallel` workers -- the rows, the guardrails, the
  forks, the leak checks and `tools/check-redaction.mjs` over every frame log (a branch's with `--empty-hand-ok`, D460) -- and
  rewrites `atlas.json` and `atlas.md`.
Around it, as J169's: J171's `atlas.json` and `atlas.md` are **copied** to `atlas.j171.json` and `atlas.j171.md` once, first, and
only if they are byte for byte J171's report copies (`report.j171/<spine>.atlas.*`); the branch and unit line counts before and
after go to `recheck-rows.txt` (they must not move); each re-check is bounded at 30 minutes (`timeout 30m`); its exit and wall go
to `recheck-exits.txt` and `recheck-times.txt`, **never `exits.txt` or `spine-times.txt`**, which stay J171's (a final check
holds both to J171's sha256s, so the Report's walls and sizing are J171's). A re-check that finds a problem exits 3 and the job
goes on; `recheck.ok == 5` and `atlas.problems == 0` fail it at the end, and `recheck` names the spine.
**`abort: armed == 1 and branches > 71940`** stops the job the minute a re-check adds a branch row, which would mean it played.

**The eight spines J171 left clean** (s01, s03, s05, s06, s07, s11, s12, s13) are not touched: `recheck.untouched == 8` holds
their `atlas.json` and `atlas.md` byte for byte to J171's report copies at the end.

## The legacy count

The atlas runs the checker with its output discarded (`tools/cubelab/censusplay.ts`, `redactionCheckParallel`: `stdio:
'ignore'`): `atlas.json` says how many logs failed, never what the checker counted in them. So **legacy.py** (registered in the
pilot) runs the pinned checker itself, as the atlas and D487's sweep do -- `node tools/check-redaction.mjs --empty-hand-ok`, 100
branch logs a call, `{workers}` calls at once -- and reads the checker's own per-log output: the status line (`PASS`,
`PARTIAL` or `FAIL`, then the path) and, under it, `M55 legacy null target records=<n>` and `M76 empty mandatory target
parts=<n>`. Over the five spines' branch logs (`d<n>-<map>-o<n>-b<n>-seat<n>.jsonl.gz` in `phaseB/frames/`: s02 4,150, s04
11,550, s08 13,500, s09 12,150, s10 13,000):

| final check | expected (D487's sweep) |
|---|---|
| `legacy.spines` | 5 |
| `legacy.scanned`, `legacy.pass` | 54,350 each (the five atlases' 54,360 frame logs less their ten baseline logs) |
| `legacy.fail`, `legacy.partial`, `legacy.unreported`, `legacy.noTarget` | 0 |
| `legacy.records` / `legacy.logsWithRecords` | **4,717 / 4,501** |
| `legacy.registeredOk` | 5: each spine's logs, records and logs with records exactly D487's (s02 1,426 in 1,212, s04 62 in 61, s08 39 in 38, s09 2,361 in 2,361, s10 829 in 829) |

**Its self-test** (pilot): legacy.py `--files` over s09's `d0-random-o0-b100-seat1` (1 legacy record), s02's
`d0-random-o0-b1-seat0` (2), s01's `d11-forge-o0-b0-seat0` (clean: 0) and the negative control
`fixtures/negative/redaction/m76-chosen-null-trigger.jsonl` (a trigger's null target: FAIL): 4 scanned, 3 PASS, 1 FAIL, 3 records
in 2 logs -- this draft's run on the D487 branch. The sweep counts only the five spines: the eight others hold no `chosen: null`
at all (J171's read scanned all 143,880 logs for it).

## The readers: J171's, byte for byte

The Report is J171's, run again over the same 13 spines, and its readers are the files J171's pilot self-tested and J171's
Report ran. **readers.py** (pilot) copies them from `var/lab-j171-local/bin/` into `var/lab-j172-local/bin/` after checking
each original's sha256, and checks each copy's:

| file | J171's sha256 (the original) | J172's copy |
|---|---|---|
| labels.py | `83f307f6f9da326b1730c254f81fab7fdbeb84c7c0e0a76cd79d3fdcdc153414` | unchanged |
| reads.py | `17ba6d73d6ca91f73a81cd20f866d594cdb7502f79a6e0daa79c94cc051dfe36` | unchanged |
| compare.py | `5cb2e66ab6fa531e883b3c7c839686988d85c5d1f53d0f3988496f9c1516fb15` | unchanged (its column stays `j171`: the labels are J171's) |
| draws.py | `88ec0e08748d41ea375a8b8b3ff29c8997a3e9b4993515f455556d933dbac302` | unchanged (`--report` reads J171's redraw in `var/lab-j171-local/redraw/`) |
| drawsha.py | `45f353fe4f48577f981aa0effa16b3e9fd59941be481bde5cafe17e514a46f85` | unchanged |
| metrics.py | `da53133402d07984d56b7d7dc3c2cfaf391a57991797f9fb4555ab5d8a6134af` | `L = 'var/lab-j172-local'`: `b80cb2371c7b2bf4f027a9affb4688daf981ded3417eb8a6b7bbdf9dafdf8247` |
| cuts.py | `f0460197e6dfefd02a7861874e13667f04458ae5ca825efcce6a31d040760010` | timing also from `atlas.j171.json`: `7bf7e75ec8acfbf673c1748aa66d21dded5862a087f1dbfa1027378fdab1b953` |

- **metrics.py** reads its scan caches and `sha.txt` under `L`: J172's caches (run7) are made from the atlas.json each spine has
  after the re-checks. `var/lab-j172-local/sha.txt` is **J171's `f2b4e9c2`** (copied, checked): the commit that branched the
  rows, which every label row names and `poolOk` checks; the D487 pin is `pin.txt` and `spines.json`'s `recheckPin`.
- **cuts.py**: a re-check's own `timing` says 0 units and 0 ms, so a spine re-checked reads phase B's timing from the copy of
  the run that played it -- J169's change (`atlas.j168.json`), one name longer. The checks' wall stays J171's (`spine-times.txt`);
  each re-check's wall is reported apart (`--recheck-times=`, `recheckSec`).
- **labels.py's rows are J171's**: the same `atlas.json` decisions (recomputed from the same rows), the same seeds, pools,
  `randomSeat: "D486"`, `sha: "f2b4e9c2"`, contract `mtg-table rung-4b label v4 (J170)`, and the lost-cast fields from caches
  equal to J171's. **`atlas.labels == 101` and `atlas.confident == 28` are checks**; `labels.jsonl` byte for byte J171's
  (`recheck.labelsSame`), reads.json and compare-j168.json equal to J171's (`readsSame`, `compareSame`) and cuts.json equal but
  for the re-checks' own fields (`cutsSame`) are information, in the summary.

**recheck.py** (pilot; the `recheck` metric) reads the rest: `rowsSame13`, `j171Five`, `ok`, `untouched`, `exitsJ171`,
`timesJ171`, `reportJ171`, `lostJ171`, `scanSame`, `recheckSec` and the four `*Same` reads, each defined in its header. Run by the
pilot it must find J171's outputs as J171 left them (`pre.json`); at the end, the re-checks done.

**Outputs** (on the data folder, `/home/justin-a/code/lab/data/lab-j170/`).
- In each of the five: `atlas.j171.json`, `atlas.j171.md` (J171's), and `atlas.json`, `atlas.md`, `plan.json` rewritten by
  the re-check (the same plan keys). Nothing else in a spine folder changes.
- `report.j171/` (J171's report, moved aside by run1, never deleted) and `report/` (J172's: J171's files, plus
  `labels.jsonl` collected this time, `legacy-j172.json`, `recheck-j172.json` and the three `recheck-*.txt`).
- `recheck-exits.txt`, `recheck-times.txt`, `recheck-rows.txt`. `exits.txt` and `spine-times.txt` stay J171's.
- In the clone: `var/lab-j172-local/` (the readers, the caches, `legacy.json`, `pin.txt`, `sha.txt`). `var/lab-j171-local/` is
  read, never written.

## Pilot
About 5 minutes: the data folder and the abort gate; J171's outputs as J171 left them; the pin carries D466-D486 (J171's greps)
and D487, the commits that added D481-D487's files, the seat-identity golden D486 regenerated (J171's `golden`, three parts) and
J171's atlas resume path (`atlas_code`); the node tests and the redaction checker's selftest (D487's nine `m76-*` controls among
them); J171's readers copied and checked; the legacy sweep's self-test. Nothing drawn, no engine started, no game.
```bash
# the lab data folder: exactly /home/justin-a/code/lab/data (README safety rules); lab-j170 holds J171's night, and this job writes no spine's rows
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J172: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import json, sys; v = json.load(open('config.json')).get('labDataDir'); sys.exit(0 if v in (None, '', '/home/justin-a/code/lab/data') else 'J172: config.json labDataDir is %r, not /home/justin-a/code/lab/data' % v)"
test -d /home/justin-a/code/lab/data/lab-j170 || { echo "J172: /home/justin-a/code/lab/data/lab-j170 does not exist: it holds J171's night" >&2; exit 1; }
mkdir -p var/lab-j172-local/bin
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; print('J172: data folder free GB', round(f, 1)); sys.exit(0 if f >= 50 else 'J172: under 50 GB free on the data folder')"
echo 1 > var/lab-j172-local/datadir.txt
# state: what lab-j170 held at this job's first pilot, recorded once: 1 when it holds J171's night and nothing else -- the 13 spine folders
# (each with an atlas.json, and nothing but atlas.json, atlas.md, plan.json, phaseB/ and J172's own .j171 copies), decks/, validation/, the two
# pilot smokes, report/, exits.txt, spine-times.txt -- or J172's own outputs from an earlier run (report.j171/, recheck-*.txt). Else 0: nothing runs
test -f var/lab-j172-local/state.txt || python3 -I - > var/lab-j172-local/state.txt <<'PY'
import os
D = '/home/justin-a/code/lab/data/lab-j170'
BANDS = ['pauper', 'peasant', 'legacy', 'powered'] * 3 + ['pauper']
SP = ['b-s%02d-%s-%d' % (k, BANDS[k - 1], 2100 + k) for k in range(1, 14)]
TOP = set(SP) | {'decks', 'validation', 'pilot-smoke-j170', 'pilot-smoke-j171', 'report', 'exits.txt', 'spine-times.txt',
                 'report.j171', 'recheck-exits.txt', 'recheck-times.txt', 'recheck-rows.txt'}
IN = {'atlas.json', 'atlas.md', 'plan.json', 'phaseB', 'atlas.j171.json', 'atlas.j171.md'}
try:
    ok = set(os.listdir(D)) <= TOP and all(os.path.isdir(D + '/' + n) and os.path.exists(D + '/' + n + '/atlas.json') and set(os.listdir(D + '/' + n)) <= IN for n in SP)
except OSError:
    ok = False
print(1 if ok else 0)
PY
# found (information, recorded once): what lab-j170 held, and whether an earlier J172 run had begun
test -f var/lab-j172-local/found.json || python3 -I -c "import glob, json, os; d = '/home/justin-a/code/lab/data/lab-j170'; print(json.dumps({'entries': sorted(os.listdir(d)), 'j171Copies': len(glob.glob(d + '/b-s??-*-21??/atlas.j171.json')), 'recheckLines': sum(1 for _ in open(d + '/recheck-exits.txt')) if os.path.exists(d + '/recheck-exits.txt') else 0}))" > var/lab-j172-local/found.json
echo "J172: lab-j170 at the first pilot: state $(cat var/lab-j172-local/state.txt), $(cat var/lab-j172-local/found.json)"
test "$(cat var/lab-j172-local/state.txt)" = 1 || { echo "J172: lab-j170 held more than J171's night at this job's first pilot (var/lab-j172-local/state.txt): nothing runs" >&2; exit 1; }
# the abort gate (the J152 lesson): this job's own run is armed from here; the Report block disarms it
echo 1 > var/lab-j172-local/armed.txt
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j172-local/merged.txt || echo 0 > var/lab-j172-local/merged.txt
git rev-parse --short=8 HEAD > var/lab-j172-local/pin.txt
# the rows' commit: J171's pin, which branched every row the labels name (J172 branches nothing)
test "$(cat var/lab-j171-local/sha.txt 2>/dev/null)" = f2b4e9c2 && cp var/lab-j171-local/sha.txt var/lab-j172-local/sha.txt && echo 1 > var/lab-j172-local/branch-sha.txt || echo 0 > var/lab-j172-local/branch-sha.txt
# D466-D486: J171's greps, unchanged
grep -q 'chosenOptionalCosts' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'class StepClock' bridge/src/mtgtable/ai/Atlas.java && grep -q 'class OptionUnavailable' bridge/src/mtgtable/ai/RolloutController.java && grep -q 'zeroXLeftOut' bridge/src/mtgtable/ai/Explorer.java && grep -q 'restoreChoices' bridge/src/mtgtable/ai/Explorer.java && grep -q 'copyCandidates' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'COUNTED_GUARDRAILS' tools/cubelab/atlas.ts && grep -q 'unit-timeout' tools/cubelab/atlas.ts && grep -q 'empty-hand-ok' tools/check-redaction.mjs && echo 1 > var/lab-j172-local/has-d466-d472.txt || echo 0 > var/lab-j172-local/has-d466-d472.txt
grep -q 'D476' bridge/src/mtgtable/ai/SearchPolicy.java && echo 1 > var/lab-j172-local/has-d476.txt || echo 0 > var/lab-j172-local/has-d476.txt
grep -q 'final class ForkRestart' bridge/src/mtgtable/ai/ForkRestart.java && grep -q 'branchRestarted' tools/cubelab/atlas.ts && echo 1 > var/lab-j172-local/has-d477.txt || echo 0 > var/lab-j172-local/has-d477.txt
grep -q 'BRANCH_CAPPED_WARN_DEFAULT' tools/cubelab/atlas.ts && grep -q 'export function cappedBranches' tools/cubelab/atlas.ts && echo 1 > var/lab-j172-local/has-d478.txt || echo 0 > var/lab-j172-local/has-d478.txt
grep -q 'effectSourceNull' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'exileLinksLost' bridge/src/mtgtable/ai/Atlas.java && grep -q 'exileLinksLost' tools/cubelab/atlas.ts && echo 1 > var/lab-j172-local/has-d479.txt || echo 0 > var/lab-j172-local/has-d479.txt
grep -q 'export class AtlasSchedule' tools/cubelab/atlascuts.ts && grep -q "export const EARLY_STOP_ON = \[50, 100, 150\]" tools/cubelab/atlascuts.ts && grep -q 'export const SCREEN_LOW = 0.04' tools/cubelab/atlascuts.ts && grep -q 'export async function redactionCheckParallel' tools/cubelab/censusplay.ts && grep -q 'holdIdle' tools/cubelab/engine.ts && grep -q 'SELFTEST_CUTS' tools/cubelab/atlas.ts && test -f web/test/cubelab-atlas-cuts.test.ts && echo 1 > var/lab-j172-local/has-d480.txt || echo 0 > var/lab-j172-local/has-d480.txt
grep -q 'export function openSchedule' tools/cubelab/atlas.ts && grep -q 'SCHEDULE_PLAN_KEYS' tools/cubelab/atlas.ts && echo 1 > var/lab-j172-local/has-d480f.txt || echo 0 > var/lab-j172-local/has-d480f.txt
ls docs/decisions/D481-*.md >/dev/null 2>&1 && grep -q 'enteredBetweenFrames' tools/check-redaction.mjs && test -f fixtures/negative/redaction/m55-option-entered-between-frames.jsonl && echo 1 > var/lab-j172-local/has-d481.txt || echo 0 > var/lab-j172-local/has-d481.txt
ls docs/decisions/D482-*.md >/dev/null 2>&1 && test -f tools/cubelab/engine-unplayable.json && grep -q '"Scute Swarm"' tools/cubelab/engine-unplayable.json && grep -q 'engine-unplayable.json' tools/cubelab/deckcensus.ts && grep -q 'engineSkips' tools/cubelab/deckcensus.ts && echo 1 > var/lab-j172-local/has-d482.txt || echo 0 > var/lab-j172-local/has-d482.txt
ls docs/decisions/D483-*.md >/dev/null 2>&1 && grep -q 'public static String playIdentity' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'identities' bridge/src/mtgtable/ai/Atlas.java && grep -q 'export function playCount' tools/cubelab/atlascuts.ts && grep -q 'export function repeatedPlays' tools/cubelab/atlascuts.ts && echo 1 > var/lab-j172-local/has-d483.txt || echo 0 > var/lab-j172-local/has-d483.txt
ls docs/decisions/D484-*.md >/dev/null 2>&1 && grep -q 'ChooseSource' docs/decisions/D484-*.md && grep -rq 'chooseSourceGuard' bridge/src/mtgtable/ai tools/cubelab && echo 1 > var/lab-j172-local/has-d484.txt || echo 0 > var/lab-j172-local/has-d484.txt
ls docs/decisions/D485-*.md >/dev/null 2>&1 && grep -q 'STALE_TARGETS' docs/decisions/D485-*.md && grep -q 'retargeted' tools/cubelab/atlas.ts && grep -q 'retargeted' bridge/src/mtgtable/ai/Atlas.java && grep -q 'STALE_TARGETS' bridge/src/mtgtable/ai/Explorer.java && grep -q 'staleRefused' tools/check-redaction.mjs && test -f fixtures/negative/redaction/stale-token-died-earlier.jsonl && grep -q 'D485' docs/decisions/D481-*.md && echo 1 > var/lab-j172-local/has-d485.txt || echo 0 > var/lab-j172-local/has-d485.txt
# D486 (the names this file reads: guardrails cardTargetOffered and modesDrawn in the checker's GUARDRAIL_NAMES and the seat, modesDrawn on the branch
# row, why MODES_DRAWN, the record source "modes", the cast-time hook, protocol M75; the owner corrects them if the merge renamed any)
ls docs/decisions/D486-*.md >/dev/null 2>&1 && grep -q 'MODES_DRAWN' docs/decisions/D486-*.md && grep -q 'cardTargetOffered' bridge/src/mtgtable/ai/Explorer.java && grep -q 'MODES_DRAWN' bridge/src/mtgtable/ai/Explorer.java && grep -q 'modesAtCast' bridge/src/mtgtable/ai/PolicyControllerAi.java && grep -q 'modesDrawn' bridge/src/mtgtable/ai/Atlas.java && grep -q 'modesDrawn' tools/cubelab/atlas.ts && grep -q "'cardTargetOffered', 'modesDrawn'" tools/check-redaction.mjs && grep -q "'confirm', 'modes'" tools/check-redaction.mjs && grep -q '^| M75 |' docs/protocol.md && echo 1 > var/lab-j172-local/has-d486.txt || echo 0 > var/lab-j172-local/has-d486.txt
# D487 (the names this file reads: the audit's legacy shape and its printed count, target:none in the checker and the bridge, protocol M76,
# its m76 fixtures; the owner corrects them if the merge renamed any)
ls docs/decisions/D487-*.md >/dev/null 2>&1 && grep -q 'legacy null target' docs/decisions/D487-*.md && grep -q 'function legacyNullTarget' tools/check-redaction.mjs && grep -q 'M55 legacy null target records=' tools/check-redaction.mjs && grep -q "target:none" tools/check-redaction.mjs && grep -q 'TARGET_NONE' bridge/src/mtgtable/ai/Decisions.java && grep -q '^| M76 |' docs/protocol.md && test -f fixtures/negative/redaction/m76-chosen-null-trigger.jsonl && echo 1 > var/lab-j172-local/has-d487.txt || echo 0 > var/lab-j172-local/has-d487.txt
# D481-D487 by decision id: the commit that added each decision's file is an ancestor of the pin (whatever sha the merge gave it)
anc=1
for x in D481 D482 D483 D484 D485 D486 D487; do
  f=$(git ls-tree -r --name-only HEAD docs/decisions/ | grep "^docs/decisions/$x-" | head -n 1 || true)
  c=""
  if [ -n "$f" ]; then c=$(git log --diff-filter=A --format=%H -n 1 HEAD -- "$f" || true); fi
  if [ -z "$c" ] || ! git merge-base --is-ancestor "$c" HEAD; then anc=0; fi
  echo "J172: $x: ${f:-no decision file} added by ${c:-no commit}"
done
echo $anc > var/lab-j172-local/has-d481-d487-commits.txt
# the seat-identity golden D486 regenerated: J171's three parts, unchanged (D487 changed no game of seat-identity: gate 12m, the golden's in all four)
f486=$(git ls-tree -r --name-only HEAD docs/decisions/ | grep '^docs/decisions/D486-' | head -n 1 || true)
c486=""
if [ -n "$f486" ]; then c486=$(git log --diff-filter=A --format=%H -n 1 HEAD -- "$f486" || true); fi
cg=$(git log --format=%H -n 1 HEAD -- fixtures/cubelab/seat-identity.json || true)
g1=0
if [ -n "$c486" ] && [ -n "$cg" ] && git merge-base --is-ancestor "$c486" "$cg"; then g1=1; fi
g2=0
if [ -n "$c486" ] && ! git diff --quiet "$c486" HEAD -- fixtures/cubelab/seat-identity.json; then g2=1; fi
python3 -I -c "import glob, json, sys; t = [open(f).read() for f in sorted(glob.glob('docs/decisions/*.md'))]; r = json.load(open('fixtures/cubelab/seat-identity.json')).get('results') or {}; dg = {k: (r.get(k) or {}).get('digest') for k in ('forge', 'search', 'explore')}; print(json.dumps({'descends': int(sys.argv[1]), 'changed': int(sys.argv[2]), 'note': 1 if any('seat-identity' in x and 'D486' in x for x in t) else 0, 'digestsJ170': 1 if dg == {'forge': '78f3a94998355ea8', 'search': 'c68c2a849b7b0d54', 'explore': '82d6d18c57bbd861'} else 0}))" $g1 $g2 > var/lab-j172-local/golden.json || echo '{"descends":-1}' > var/lab-j172-local/golden.json
echo "J172: seat-identity golden: fixture last changed by ${cg:-no commit}, D486's file added by ${c486:-no commit}: $(cat var/lab-j172-local/golden.json)"
# J171's atlas resume path: the code that resumes J171's finished plans and runs the checks is f2b4e9c2's (only the checker it calls is D487's)
git diff --quiet f2b4e9c26227ef135e5df1102384e026cbf2f195 HEAD -- tools/cubelab.sh tools/cubelab/atlas.ts tools/cubelab/atlaschecks.ts tools/cubelab/atlascuts.ts tools/cubelab/censusplay.ts tools/cubelab/labdata.ts && echo 1 > var/lab-j172-local/atlas-code.txt || echo 0 > var/lab-j172-local/atlas-code.txt
env -u LAB_DATA_DIR node --test web/test/cubelab-atlas.test.ts web/test/cubelab-atlas-cuts.test.ts web/test/cubelab-atlas-resume.test.ts web/test/cubelab-atlas-redaction.test.ts web/test/cubelab-record.test.ts web/test/cubelab-watchdog.test.ts web/test/cubelab-deck-census.test.ts && echo 1 > var/lab-j172-local/nodetests.txt || echo 0 > var/lab-j172-local/nodetests.txt
node tools/check-redaction-selftest.mjs && echo 1 > var/lab-j172-local/redaction-self.txt || echo 0 > var/lab-j172-local/redaction-self.txt
cat > var/lab-j172-local/bin/readers.py <<'PY'
# J172 (drafts/J172-atlas-4b-recheck.md): J171's readers, copied from var/lab-j171-local/bin -- the files J171's pilot self-tested and
# J171's Report ran -- into var/lab-j172-local/bin, registered before any J172 data. Every original must be byte for byte the sha256
# registered here; five are copied unchanged (labels.py, reads.py, compare.py, draws.py, drawsha.py) and two get one line each:
#   metrics.py  `L = 'var/lab-j171-local'` -> `L = 'var/lab-j172-local'`: its scan caches and sha.txt are J172's (J171's caches are
#               stamped with the atlas.json each was made from, and a re-check rewrites five of them, so they are made again)
#   cuts.py     a spine whose atlas.json a re-check rewrote reads phase B's timing from its `atlas.j171.json` copy, as J169's read
#               J168's from `atlas.j168.json` (a re-check's own timing says 0 units, 0 ms; J169's change, one name longer)
# Every copy must then be the sha256 registered here. Prints 1 when all fourteen files are the registered ones, else 0. pilot.py is
# not copied: J172 plays no smoke.
import hashlib, os, sys

SRC, DST = 'var/lab-j171-local/bin', 'var/lab-j172-local/bin'
ORIG = {'compare.py': '5cb2e66ab6fa531e883b3c7c839686988d85c5d1f53d0f3988496f9c1516fb15',
        'cuts.py': 'f0460197e6dfefd02a7861874e13667f04458ae5ca825efcce6a31d040760010',
        'drawsha.py': '45f353fe4f48577f981aa0effa16b3e9fd59941be481bde5cafe17e514a46f85',
        'draws.py': '88ec0e08748d41ea375a8b8b3ff29c8997a3e9b4993515f455556d933dbac302',
        'labels.py': '83f307f6f9da326b1730c254f81fab7fdbeb84c7c0e0a76cd79d3fdcdc153414',
        'metrics.py': 'da53133402d07984d56b7d7dc3c2cfaf391a57991797f9fb4555ab5d8a6134af',
        'reads.py': '17ba6d73d6ca91f73a81cd20f866d594cdb7502f79a6e0daa79c94cc051dfe36'}
EDIT = {'metrics.py': ("\nL = 'var/lab-j171-local'\n", "\nL = 'var/lab-j172-local'\n"),
        'cuts.py': ("for x in ('atlas.j166.json', 'atlas.j168.json') if", "for x in ('atlas.j166.json', 'atlas.j168.json', 'atlas.j171.json') if")}
COPY = dict(ORIG, **{'metrics.py': 'b80cb2371c7b2bf4f027a9affb4688daf981ded3417eb8a6b7bbdf9dafdf8247',
                     'cuts.py': '7bf7e75ec8acfbf673c1748aa66d21dded5862a087f1dbfa1027378fdab1b953'})


def sha(b):
    return hashlib.sha256(b).hexdigest()


ok = 1
os.makedirs(DST, exist_ok=True)
for f, want in sorted(ORIG.items()):
    try:
        b = open(os.path.join(SRC, f), 'rb').read()
    except OSError as e:
        print('J172 readers: %s: %s' % (f, e), file=sys.stderr)
        ok = 0
        continue
    if sha(b) != want:
        print('J172 readers: %s/%s is not J171\'s (sha256 %s)' % (SRC, f, sha(b)), file=sys.stderr)
        ok = 0
        continue
    if f in EDIT:
        old, new = EDIT[f]
        t = b.decode('utf-8')
        if t.count(old) != 1:
            print('J172 readers: %s: the edited text occurs %d times' % (f, t.count(old)), file=sys.stderr)
            ok = 0
            continue
        b = t.replace(old, new).encode('utf-8')
    if sha(b) != COPY[f]:
        print('J172 readers: %s: the copy is not the registered one (sha256 %s)' % (f, sha(b)), file=sys.stderr)
        ok = 0
        continue
    with open(os.path.join(DST, f), 'wb') as g:
        g.write(b)
for f, want in sorted(COPY.items()):
    try:
        ok = ok if sha(open(os.path.join(DST, f), 'rb').read()) == want else 0
    except OSError:
        ok = 0
print(ok)
PY
cat > var/lab-j172-local/bin/legacy.py <<'PY'
# J172 (drafts/J172-atlas-4b-recheck.md): D487's legacy count, registered before any J172 data. The atlas runs the redaction checker
# with its output discarded (tools/cubelab/censusplay.ts, redactionCheckParallel: stdio 'ignore'), so atlas.json says whether a log
# passed but never what the checker counted in it. This sweep runs the pinned checker itself, as the atlas does and as D487's sweep
# did -- `node tools/check-redaction.mjs --empty-hand-ok`, 100 logs a call -- and reads, per log, its status line (PASS / PARTIAL /
# FAIL, then the path) and the counted lines under it: `M55 legacy null target records=<n>` (D487: J171's shape, accepted and
# counted) and `M76 empty mandatory target parts=<n>` (D487: none can be in a log written before M76).
#   legacy.py OUT JOBS SPINE_DIR...   every phase B branch frame log (d<n>-<map>-o<n>-b<n>-seat<n>.jsonl.gz) of each SPINE_DIR,
#                                     JOBS calls at once; writes OUT (one JSON object) and prints it
#   legacy.py --files OUT FILE...     the same over the files named, one call (the pilot's self-test)
# Registered expectation (D487's sweep, 54,350 branch logs of the five spines, 2026-10-26): 4,717 legacy records in 4,501 logs, 0 FAIL,
# per spine below; `registeredOk` counts the spines whose logs, records and logs-with-records are exactly these.
# Standard library only; no engine (the checker reads files). Writes OUT alone.
import glob, json, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

NAME = re.compile(r'd\d+-(random|forge)-o\d+-b\d+-seat\d\.jsonl\.gz$')
ST = re.compile(r'^(PASS|PARTIAL|FAIL)  (.+)$')
LEG = re.compile(r'^\s+M55 legacy null target records=(\d+)')
NOT = re.compile(r'^\s+M76 empty mandatory target parts=(\d+)')
# folder: (branch logs, legacy records, logs with one or more)
REGISTERED = {'b-s02-peasant-2102': (4150, 1426, 1212), 'b-s04-powered-2104': (11550, 62, 61), 'b-s08-powered-2108': (13500, 39, 38),
              'b-s09-pauper-2109': (12150, 2361, 2361), 'b-s10-peasant-2110': (13000, 829, 829)}
KEYS = ('scanned', 'pass', 'partial', 'fail', 'unreported', 'records', 'logsWithRecords', 'noTarget')


def run(batch):
    p = subprocess.run(['node', 'tools/check-redaction.mjs', '--empty-hand-ok'] + batch, capture_output=True, text=True)
    res, cur = {}, None
    for line in p.stdout.splitlines():
        m = ST.match(line)
        if m:
            cur = m.group(2)
            res[cur] = {'st': m.group(1), 'legacy': 0, 'noTarget': 0}
            continue
        if cur is None:
            continue
        m = LEG.match(line)
        if m:
            res[cur]['legacy'] += int(m.group(1))
            continue
        m = NOT.match(line)
        if m:
            res[cur]['noTarget'] += int(m.group(1))
    return p.returncode, res


def sweep(groups, jobs):
    out = dict.fromkeys(KEYS, 0)
    out.update({'spines': 0, 'registeredOk': 0, 'failList': [], 'bySpine': {}})
    batches = [(name, files[i:i + 100]) for name, files in groups for i in range(0, len(files), 100)]
    for name, files in groups:
        out['bySpine'][name] = dict.fromkeys(KEYS, 0)
    with ThreadPoolExecutor(max(1, jobs)) as ex:
        for (name, batch), (rc, res) in zip(batches, ex.map(lambda b: run(b[1]), batches)):
            s = out['bySpine'][name]
            for f in batch:
                x = res.get(f)
                s['scanned'] += 1
                if x is None:
                    s['unreported'] += 1
                    continue
                s[{'PASS': 'pass', 'PARTIAL': 'partial', 'FAIL': 'fail'}[x['st']]] += 1
                s['records'] += x['legacy']
                s['logsWithRecords'] += 1 if x['legacy'] else 0
                s['noTarget'] += x['noTarget']
                if x['st'] != 'PASS' and len(out['failList']) < 20:
                    out['failList'].append(f)
    for name, s in out['bySpine'].items():
        for k in KEYS:
            out[k] += s[k]
        out['spines'] += 1
        r = REGISTERED.get(name)
        s['registered'] = list(r) if r else None
        out['registeredOk'] += 1 if r and (s['scanned'], s['records'], s['logsWithRecords']) == r else 0
    return out


if len(sys.argv) > 2 and sys.argv[1] == '--files':
    OUT, groups, jobs = sys.argv[2], [('files', sys.argv[3:])], 1
else:
    OUT, jobs = sys.argv[1], int(sys.argv[2])
    groups = [(os.path.basename(os.path.abspath(d)), sorted(f for f in glob.glob(os.path.join(d, 'phaseB', 'frames', 'd*-*-o*-b*-seat?.jsonl.gz')) if NAME.search(f)))
              for d in sys.argv[3:]]
res = sweep(groups, jobs)
with open(OUT + '.tmp', 'w') as f:
    json.dump(res, f, indent=1)
os.replace(OUT + '.tmp', OUT)
print(json.dumps({k: v for k, v in res.items() if k != 'bySpine'}))
PY
cat > var/lab-j172-local/bin/recheck.py <<'PY'
# J172 (drafts/J172-atlas-4b-recheck.md): the re-check's own reader, registered before any J172 data. Standard library only; no
# engine; writes nothing; prints one JSON object. Run by the pilot (var/lab-j172-local/pre.json: J171's outputs as J171 left them)
# and as the `recheck` metric (the re-checks, the eight spines left alone, the scan, and the Report against J171's).
#   rowsSame13   spines whose branches.jsonl and units.jsonl hold J171's line counts (registered below)
#   j171Five     of the five flagged spines, those whose J171 atlas (atlas.j171.json once the re-check has kept it, else atlas.json)
#                is byte for byte J171's report copy and carries J171's one problem: "<n> frame log(s) failed tools/check-redaction.mjs"
#                with frameLogsFailed n (s02 1,212, s04 61, s08 38, s09 2,361, s10 829)
#   ok           of the five, those re-checked: that, and the re-check's exit 0 (recheck-exits.txt), 0 problems, 0 frame logs failed,
#                as many frame logs checked as J171's, branch and unit rows unmoved and J171's (recheck-rows.txt), nothing played
#                (the new atlas.json's timing: phase B 0 units)
#   untouched    of the other eight, those whose atlas.json and atlas.md are byte for byte J171's report copies, with no .j171 copy
#   exitsJ171, timesJ171    exits.txt and spine-times.txt are J171's (sha256 registered): the re-checks wrote neither
#   reportJ171   J171's report (report.j171/ once run1 has moved it, else report/): labels.json 101 labels, 28 confident, and
#                labels.jsonl the registered sha256
#   lostJ171     J171's 13 scan caches present (var/lab-j171-local/lost); scanSame: J172's caches (var/lab-j172-local/lost) made
#                from the atlas.json each spine now has, and equal to J171's but for that stamp
#   after the Report: labelsSame (labels.jsonl byte for byte J171's), readsSame and compareSame (reads.json, compare-j168.json equal
#   as JSON), cutsSame (cuts.json equal but for each spine's recheckSec, redactionSec and timingFrom and the night's recheckSec):
#   information, -1 until the Report has written them
import hashlib, json, os

D = '/home/justin-a/code/lab/data/lab-j170'
FIVE = {'b-s02-peasant-2102': 1212, 'b-s04-powered-2104': 61, 'b-s08-powered-2108': 38, 'b-s09-pauper-2109': 2361, 'b-s10-peasant-2110': 829}
ROWS = {'b-s01-pauper-2101': (5720, 80), 'b-s02-peasant-2102': (2075, 41), 'b-s03-legacy-2103': (4550, 65), 'b-s04-powered-2104': (5775, 73),
        'b-s05-pauper-2105': (6325, 67), 'b-s06-peasant-2106': (6525, 70), 'b-s07-legacy-2107': (5110, 85), 'b-s08-powered-2108': (6750, 71),
        'b-s09-pauper-2109': (6075, 73), 'b-s10-peasant-2110': (6500, 64), 'b-s11-legacy-2111': (6450, 68), 'b-s12-powered-2112': (3650, 64),
        'b-s13-pauper-2113': (6435, 81)}
EXITS = '50a2be8982f0c2d05d77d1f7684aef9dde83d4a0506e85c56f1966a9f241e1f9'
TIMES = '36adc5f8400b65a21532b952f9ee24464f0fd7dbff45d7b6cb845eed994aa676'
LABELS_JSONL = '20dee1503ca403047d25a8112315e84059663344c48ba920e790506c690073a8'


def sha(p):
    try:
        return hashlib.sha256(open(p, 'rb').read()).hexdigest()
    except OSError:
        return None


def load(p):
    try:
        return json.load(open(p))
    except (OSError, ValueError):
        return None


def lines(p):
    try:
        return sum(1 for _ in open(p, 'rb'))
    except OSError:
        return None


def last_line(p, n):
    got = None
    try:
        for line in open(p):
            f = line.split()
            if f and f[0] == n:
                got = f
    except OSError:
        pass
    return got


R = D + '/report.j171' if os.path.isdir(D + '/report.j171') else D + '/report'
out = {'reportMoved': 1 if os.path.isdir(D + '/report.j171') else 0, 'rowsSame13': 0, 'j171Five': 0, 'ok': 0, 'untouched': 0,
       'exitsJ171': 1 if sha(D + '/exits.txt') == EXITS else 0, 'timesJ171': 1 if sha(D + '/spine-times.txt') == TIMES else 0,
       'reportJ171': 0, 'lostJ171': 0, 'scanSame': 0, 'recheckSec': 0, 'labelsSame': -1, 'readsSame': -1, 'compareSame': -1, 'cutsSame': -1,
       'bySpine': {}}
lb = load(R + '/labels.json') or {}
out['reportJ171'] = 1 if lb.get('labels') == 101 and lb.get('confident') == 28 and sha(R + '/labels.jsonl') == LABELS_JSONL else 0
for n, (rows, units) in sorted(ROWS.items()):
    s = out['bySpine'].setdefault(n, {})
    s['rows'] = [lines(D + '/' + n + '/phaseB/branches.jsonl'), lines(D + '/' + n + '/phaseB/units.jsonl')]
    out['rowsSame13'] += 1 if s['rows'] == [rows, units] else 0
    # the scan: J171's cache and J172's, equal but for the atlas.json stamp; J172's made from the atlas.json the spine has now
    a, b = load('var/lab-j171-local/lost/' + n + '.json'), load('var/lab-j172-local/lost/' + n + '.json')
    out['lostJ171'] += 1 if a else 0
    try:
        mt = int(os.path.getmtime(D + '/' + n + '/atlas.json'))
    except OSError:
        mt = None
    s['scanSame'] = bool(a and b and b.get('atlasMtime') == mt and {k: v for k, v in a.items() if k != 'atlasMtime'} == {k: v for k, v in b.items() if k != 'atlasMtime'})
    out['scanSame'] += 1 if s['scanSame'] else 0
    if n not in FIVE:
        s['untouched'] = (sha(D + '/' + n + '/atlas.json') == sha(R + '/' + n + '.atlas.json') is not None
                          and sha(D + '/' + n + '/atlas.md') == sha(R + '/' + n + '.atlas.md') is not None
                          and not os.path.exists(D + '/' + n + '/atlas.j171.json'))
        out['untouched'] += 1 if s['untouched'] else 0
        continue
    kept = D + '/' + n + '/atlas.j171.json'
    a171 = kept if os.path.exists(kept) else D + '/' + n + '/atlas.json'
    j = load(a171) or {}
    c171 = j.get('checks') or {}
    p171 = c171.get('problems') or []
    s['j171'] = (sha(a171) == sha(R + '/' + n + '.atlas.json') is not None and len(p171) == 1
                 and p171[0].startswith('%d frame log(s) failed tools/check-redaction.mjs' % FIVE[n]) and c171.get('frameLogsFailed') == FIVE[n])
    out['j171Five'] += 1 if s['j171'] else 0
    ex, rw, tm = last_line(D + '/recheck-exits.txt', n), last_line(D + '/recheck-rows.txt', n), last_line(D + '/recheck-times.txt', n)
    d = load(D + '/' + n + '/atlas.json') if os.path.exists(kept) else None
    if not (ex and rw and tm and d):
        s['ok'] = False
        continue
    c = d.get('checks') or {}
    s.update({'exit': int(ex[1]), 'problems': len(c.get('problems') or []), 'frameLogs': c.get('frameLogs'), 'frameLogsJ171': c171.get('frameLogs'),
              'frameLogsFailed': c.get('frameLogsFailed'), 'redactionSec': round((c.get('redactionMs') or 0) / 1000),
              'redactionSecJ171': round((c171.get('redactionMs') or 0) / 1000), 'recheckSec': int(tm[2]) - int(tm[1]),
              'rowsBeforeAfter': rw[1:], 'phaseBUnits': ((d.get('timing') or {}).get('phaseB') or {}).get('units'), 'warnings': len(c.get('warnings') or [])})
    out['recheckSec'] += s['recheckSec']
    s['ok'] = (s['j171'] and s['exit'] == 0 and s['problems'] == 0 and s['frameLogsFailed'] == 0 and s['frameLogs'] == s['frameLogsJ171']
               and rw[1:] == [str(rows), str(rows), str(units), str(units)] and s['phaseBUnits'] == 0)
    out['ok'] += 1 if s['ok'] else 0
# the Report against J171's (information): written only once J172's report/ exists beside report.j171/
if out['reportMoved'] and os.path.exists(D + '/report/labels.jsonl'):
    out['labelsSame'] = 1 if sha(D + '/report/labels.jsonl') == sha(D + '/report.j171/labels.jsonl') else 0
    for k, f in (('readsSame', 'reads.json'), ('compareSame', 'compare-j168.json')):
        x, y = load(D + '/report/' + f), load(D + '/report.j171/' + f)
        out[k] = 1 if x is not None and x == y else 0
    x, y = load(D + '/report/cuts.json'), load(D + '/report.j171/cuts.json')
    try:
        drop = ('recheckSec', 'redactionSec', 'timingFrom')
        same = {k: {kk: vv for kk, vv in v.items() if kk not in drop} for k, v in x['bySpine'].items()} == {k: {kk: vv for kk, vv in v.items() if kk not in drop} for k, v in y['bySpine'].items()}
        same = same and {k: v for k, v in x['night'].items() if k != 'recheckSec'} == {k: v for k, v in y['night'].items() if k != 'recheckSec'}
        out['cutsSame'] = 1 if same else 0
    except (TypeError, KeyError, AttributeError):
        out['cutsSame'] = 0
print(json.dumps(out))
PY
python3 -I var/lab-j172-local/bin/readers.py > var/lab-j172-local/readers.txt || echo 0 > var/lab-j172-local/readers.txt
cat var/lab-j172-local/readers.txt
# the legacy sweep's self-test: two of J171's flagged logs (1 and 2 legacy records), a clean one (0) and a trigger's null target (FAIL)
F=/home/justin-a/code/lab/data/lab-j170
python3 -I var/lab-j172-local/bin/legacy.py --files var/lab-j172-local/legacy-self.json $F/b-s09-pauper-2109/phaseB/frames/d0-random-o0-b100-seat1.jsonl.gz $F/b-s02-peasant-2102/phaseB/frames/d0-random-o0-b1-seat0.jsonl.gz $F/b-s01-pauper-2101/phaseB/frames/d11-forge-o0-b0-seat0.jsonl.gz fixtures/negative/redaction/m76-chosen-null-trigger.jsonl || true
python3 -I -c "import json; c = json.load(open('var/lab-j172-local/legacy-self.json')); print(1 if (c['scanned'], c['pass'], c['fail'], c['partial'], c['unreported'], c['records'], c['logsWithRecords'], c['noTarget'], c['failList']) == (4, 3, 1, 0, 0, 3, 2, 0, ['fixtures/negative/redaction/m76-chosen-null-trigger.jsonl']) else 0)" > var/lab-j172-local/legacy-self.txt 2>/dev/null || echo 0 > var/lab-j172-local/legacy-self.txt
cat var/lab-j172-local/legacy-self.txt
# J171's outputs as J171 left them (or as an earlier J172 run kept them): rows, exits, walls, report, the five flagged atlases, the eight clean ones
python3 -I var/lab-j172-local/bin/recheck.py > var/lab-j172-local/pre.json || echo '{"rowsSame13":-1}' > var/lab-j172-local/pre.json
cat var/lab-j172-local/pre.json
```
metrics: datadir = sh: cat var/lab-j172-local/datadir.txt 2>/dev/null || echo 0
metrics: state = sh: cat var/lab-j172-local/state.txt 2>/dev/null || echo 0
metrics: merged = sh: cat var/lab-j172-local/merged.txt 2>/dev/null || echo 0
metrics: branch_sha = sh: cat var/lab-j172-local/branch-sha.txt 2>/dev/null || echo 0
metrics: has_d466_d472 = sh: cat var/lab-j172-local/has-d466-d472.txt 2>/dev/null || echo 0
metrics: has_d476 = sh: cat var/lab-j172-local/has-d476.txt 2>/dev/null || echo 0
metrics: has_d477 = sh: cat var/lab-j172-local/has-d477.txt 2>/dev/null || echo 0
metrics: has_d478 = sh: cat var/lab-j172-local/has-d478.txt 2>/dev/null || echo 0
metrics: has_d479 = sh: cat var/lab-j172-local/has-d479.txt 2>/dev/null || echo 0
metrics: has_d480 = sh: cat var/lab-j172-local/has-d480.txt 2>/dev/null || echo 0
metrics: has_d480f = sh: cat var/lab-j172-local/has-d480f.txt 2>/dev/null || echo 0
metrics: has_d481 = sh: cat var/lab-j172-local/has-d481.txt 2>/dev/null || echo 0
metrics: has_d482 = sh: cat var/lab-j172-local/has-d482.txt 2>/dev/null || echo 0
metrics: has_d483 = sh: cat var/lab-j172-local/has-d483.txt 2>/dev/null || echo 0
metrics: has_d484 = sh: cat var/lab-j172-local/has-d484.txt 2>/dev/null || echo 0
metrics: has_d485 = sh: cat var/lab-j172-local/has-d485.txt 2>/dev/null || echo 0
metrics: has_d486 = sh: cat var/lab-j172-local/has-d486.txt 2>/dev/null || echo 0
metrics: has_d487 = sh: cat var/lab-j172-local/has-d487.txt 2>/dev/null || echo 0
metrics: d481_d487_commits = sh: cat var/lab-j172-local/has-d481-d487-commits.txt 2>/dev/null || echo 0
metrics: golden = sh: cat var/lab-j172-local/golden.json 2>/dev/null || echo '{"descends":-1}'
metrics: atlas_code = sh: cat var/lab-j172-local/atlas-code.txt 2>/dev/null || echo 0
metrics: found = sh: cat var/lab-j172-local/found.json 2>/dev/null || echo '{"j171Copies":-1}'
metrics: nodetests = sh: cat var/lab-j172-local/nodetests.txt 2>/dev/null || echo 0
metrics: redaction_self = sh: cat var/lab-j172-local/redaction-self.txt 2>/dev/null || echo 0
metrics: readers = sh: cat var/lab-j172-local/readers.txt 2>/dev/null || echo 0
metrics: legacy_self = sh: cat var/lab-j172-local/legacy-self.txt 2>/dev/null || echo 0
metrics: pre = sh: cat var/lab-j172-local/pre.json 2>/dev/null || echo '{"rowsSame13":-1}'
check: datadir == 1
check: data_free_gb >= 50
check: state == 1
check: merged == 1
check: branch_sha == 1
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
check: d481_d487_commits == 1
check: golden.descends == 1
check: golden.changed == 1
check: golden.note == 1
check: atlas_code == 1
check: nodetests == 1
check: redaction_self == 1
check: readers == 1
check: legacy_self == 1
check: pre.rowsSame13 == 13
check: pre.j171Five == 5
check: pre.untouched == 8
check: pre.exitsJ171 == 1
check: pre.timesJ171 == 1
check: pre.reportJ171 == 1
check: pre.lostJ171 == 13

## Commands
run1-run5 re-check s02, s04, s08, s09 and s10 in place, one block a spine (run1 first moves J171's report aside); run6 counts the
legacy records with the pinned checker; run7 scans the 13 spines' frames; the last block is the Report. Every atlas command
resumes J171's finished atlas and plays nothing. A re-check that finds a problem exits 3 and the job goes on (the exit is kept
in `recheck-exits.txt`; `recheck.ok == 5` and `atlas.problems == 0` fail the job at the end). Each re-check block asserts the
data folder, its 50 GB and its decks -- J171's draw, byte for byte -- and that the atlas it keeps aside is J171's. **Expected
wall: ~15 min for the five re-checks, ~8-15 min for the legacy sweep, ~4 min for the scan.**
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J172: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J172: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J172
D=/home/justin-a/code/lab/data/lab-j170
# run1 only: J171's report kept -- moved aside once, never deleted, and only if it is J171's (101 labels, 28 confident, its labels.jsonl);
# the Report block writes report/ anew
if [ ! -e $D/report.j171 ]; then
  python3 -I -c "import hashlib, json, sys; r = sys.argv[1]; l = json.load(open(r + '/labels.json')); ok = l['labels'] == 101 and l['confident'] == 28 and hashlib.sha256(open(r + '/labels.jsonl', 'rb').read()).hexdigest() == '20dee1503ca403047d25a8112315e84059663344c48ba920e790506c690073a8'; sys.exit(0 if ok else 'J172: ' + r + ' is not J171s report: not moved')" $D/report
  mv $D/report $D/report.j171
  echo "J172: J171's report kept as $D/report.j171"
fi
test -d $D/report.j171 || { echo "J172: J171's report is not kept as $D/report.j171 (run1 moves it): nothing re-checked" >&2; exit 1; }
n=b-s02-peasant-2102; K0=$D/decks/s02-peasant-2002; A=$K0/decks/peasant-2002-00001.dck; B=$K0/decks/peasant-2002-00002.dck
# s02's decks: J171's draw, byte for byte (the folder's draw, then each deck)
test "$(python3 -I var/lab-j172-local/bin/drawsha.py $K0)" = "86ccaaf3b3ba6f5959aacf073a9dc0465aadf1a9d02ddac8eac695091eaea576 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = 3519db7d8a57ce08e1cf0094568d28b5011735a83f4025356204b60219c0ca88 && test "$(sha256sum < $B | cut -d ' ' -f 1)" = 7196dc7b7545dd532c7f796938549dc53193adbf9fa8d199a49259bfe90bb467 || { echo "J172: $n: the decks under $K0 are not J171's draw" >&2; exit 1; }
# J171's atlas.json and atlas.md kept beside once, as atlas.j171.*, and only if they are J171's (byte for byte its report copies)
if [ ! -f $D/$n/atlas.j171.json ]; then
  test "$(sha256sum < $D/$n/atlas.json)" = "$(sha256sum < $D/report.j171/$n.atlas.json)" && test "$(sha256sum < $D/$n/atlas.md)" = "$(sha256sum < $D/report.j171/$n.atlas.md)" || { echo "J172: $n: atlas.json or atlas.md is not J171's (report.j171's copy): not re-checked" >&2; exit 1; }
  cp $D/$n/atlas.md $D/$n/atlas.j171.md
  cp $D/$n/atlas.json $D/$n/atlas.j171.json
fi
# the re-check under D487's checker: J171's finished atlas resumed at the pin -- every unit is done, so nothing plays and only the checks run
# again; rows and units counted before and after; the exit and the wall to recheck-*.txt, never exits.txt or spine-times.txt (J171's)
r0=$(wc -l < $D/$n/phaseB/branches.jsonl); u0=$(wc -l < $D/$n/phaseB/units.jsonl)
t0=$(date +%s)
rc=0; timeout 30m tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2102 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/recheck-exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/recheck-times.txt
echo "$n $r0 $(wc -l < $D/$n/phaseB/branches.jsonl) $u0 $(wc -l < $D/$n/phaseB/units.jsonl)" >> $D/recheck-rows.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J172: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J172: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J172
D=/home/justin-a/code/lab/data/lab-j170
test -d $D/report.j171 || { echo "J172: J171's report is not kept as $D/report.j171 (run1 moves it): nothing re-checked" >&2; exit 1; }
n=b-s04-powered-2104; K0=$D/decks/s04-powered-2004; A=$K0/decks/powered-2004-00001.dck; B=$K0/decks/powered-2004-00002.dck
# s04's decks: J171's draw, byte for byte (the folder's draw, then each deck)
test "$(python3 -I var/lab-j172-local/bin/drawsha.py $K0)" = "81c4dd22dcdbd1a110b0339476cbab04e8f6d2791f1881e42499b97f8675dc00 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = 873bb7e41c40f2ad4a40fbd8e3abf7185820fa93b1e90c40d2abff5907e3f003 && test "$(sha256sum < $B | cut -d ' ' -f 1)" = f4f21079d66515481315687b3d369fd2a41d5dcac26a540b843552cee09b36d1 || { echo "J172: $n: the decks under $K0 are not J171's draw" >&2; exit 1; }
# J171's atlas.json and atlas.md kept beside once, as atlas.j171.*, and only if they are J171's (byte for byte its report copies)
if [ ! -f $D/$n/atlas.j171.json ]; then
  test "$(sha256sum < $D/$n/atlas.json)" = "$(sha256sum < $D/report.j171/$n.atlas.json)" && test "$(sha256sum < $D/$n/atlas.md)" = "$(sha256sum < $D/report.j171/$n.atlas.md)" || { echo "J172: $n: atlas.json or atlas.md is not J171's (report.j171's copy): not re-checked" >&2; exit 1; }
  cp $D/$n/atlas.md $D/$n/atlas.j171.md
  cp $D/$n/atlas.json $D/$n/atlas.j171.json
fi
# the re-check under D487's checker: J171's finished atlas resumed at the pin -- every unit is done, so nothing plays and only the checks run
# again; rows and units counted before and after; the exit and the wall to recheck-*.txt, never exits.txt or spine-times.txt (J171's)
r0=$(wc -l < $D/$n/phaseB/branches.jsonl); u0=$(wc -l < $D/$n/phaseB/units.jsonl)
t0=$(date +%s)
rc=0; timeout 30m tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2104 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/recheck-exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/recheck-times.txt
echo "$n $r0 $(wc -l < $D/$n/phaseB/branches.jsonl) $u0 $(wc -l < $D/$n/phaseB/units.jsonl)" >> $D/recheck-rows.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J172: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J172: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J172
D=/home/justin-a/code/lab/data/lab-j170
test -d $D/report.j171 || { echo "J172: J171's report is not kept as $D/report.j171 (run1 moves it): nothing re-checked" >&2; exit 1; }
n=b-s08-powered-2108; K0=$D/decks/s08-powered-2008; A=$K0/decks/powered-2008-00001.dck; B=$K0/decks/powered-2008-00002.dck
# s08's decks: J171's draw, byte for byte (the folder's draw, then each deck)
test "$(python3 -I var/lab-j172-local/bin/drawsha.py $K0)" = "d653b4cf2bf2d94649449caaf174d21453cd34b58972c3e22ea8e26dacf75f71 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = 6c664df890ade41bed55feb2841826c6212b289a501cac8e0caf1755209f70c8 && test "$(sha256sum < $B | cut -d ' ' -f 1)" = 0eafaf9796cbf83792c257a29532d6d07fef807f629737209c8875a5b3eb8b8f || { echo "J172: $n: the decks under $K0 are not J171's draw" >&2; exit 1; }
# J171's atlas.json and atlas.md kept beside once, as atlas.j171.*, and only if they are J171's (byte for byte its report copies)
if [ ! -f $D/$n/atlas.j171.json ]; then
  test "$(sha256sum < $D/$n/atlas.json)" = "$(sha256sum < $D/report.j171/$n.atlas.json)" && test "$(sha256sum < $D/$n/atlas.md)" = "$(sha256sum < $D/report.j171/$n.atlas.md)" || { echo "J172: $n: atlas.json or atlas.md is not J171's (report.j171's copy): not re-checked" >&2; exit 1; }
  cp $D/$n/atlas.md $D/$n/atlas.j171.md
  cp $D/$n/atlas.json $D/$n/atlas.j171.json
fi
# the re-check under D487's checker: J171's finished atlas resumed at the pin -- every unit is done, so nothing plays and only the checks run
# again; rows and units counted before and after; the exit and the wall to recheck-*.txt, never exits.txt or spine-times.txt (J171's)
r0=$(wc -l < $D/$n/phaseB/branches.jsonl); u0=$(wc -l < $D/$n/phaseB/units.jsonl)
t0=$(date +%s)
rc=0; timeout 30m tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2108 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/recheck-exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/recheck-times.txt
echo "$n $r0 $(wc -l < $D/$n/phaseB/branches.jsonl) $u0 $(wc -l < $D/$n/phaseB/units.jsonl)" >> $D/recheck-rows.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J172: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J172: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J172
D=/home/justin-a/code/lab/data/lab-j170
test -d $D/report.j171 || { echo "J172: J171's report is not kept as $D/report.j171 (run1 moves it): nothing re-checked" >&2; exit 1; }
n=b-s09-pauper-2109; K0=$D/decks/s09-pauper-2009; A=$K0/decks/pauper-2009-00001.dck; B=$K0/decks/pauper-2009-00002.dck
# s09's decks: J171's draw, byte for byte (the folder's draw, then each deck)
test "$(python3 -I var/lab-j172-local/bin/drawsha.py $K0)" = "1216932fb9807608a5bf859ac768e12efa40c031fc685f16b56b274a2bbf7601 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = da1c0de93863a59de35390647adce822a81cbfbc86cfdec9fbaacd7fabf3dd4b && test "$(sha256sum < $B | cut -d ' ' -f 1)" = 332d6216ea0ae96dbbef39544174aa3f17fe9521a49cca2c43c0d63f308524bd || { echo "J172: $n: the decks under $K0 are not J171's draw" >&2; exit 1; }
# J171's atlas.json and atlas.md kept beside once, as atlas.j171.*, and only if they are J171's (byte for byte its report copies)
if [ ! -f $D/$n/atlas.j171.json ]; then
  test "$(sha256sum < $D/$n/atlas.json)" = "$(sha256sum < $D/report.j171/$n.atlas.json)" && test "$(sha256sum < $D/$n/atlas.md)" = "$(sha256sum < $D/report.j171/$n.atlas.md)" || { echo "J172: $n: atlas.json or atlas.md is not J171's (report.j171's copy): not re-checked" >&2; exit 1; }
  cp $D/$n/atlas.md $D/$n/atlas.j171.md
  cp $D/$n/atlas.json $D/$n/atlas.j171.json
fi
# the re-check under D487's checker: J171's finished atlas resumed at the pin -- every unit is done, so nothing plays and only the checks run
# again; rows and units counted before and after; the exit and the wall to recheck-*.txt, never exits.txt or spine-times.txt (J171's)
r0=$(wc -l < $D/$n/phaseB/branches.jsonl); u0=$(wc -l < $D/$n/phaseB/units.jsonl)
t0=$(date +%s)
rc=0; timeout 30m tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2109 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/recheck-exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/recheck-times.txt
echo "$n $r0 $(wc -l < $D/$n/phaseB/branches.jsonl) $u0 $(wc -l < $D/$n/phaseB/units.jsonl)" >> $D/recheck-rows.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J172: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J172: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J172
D=/home/justin-a/code/lab/data/lab-j170
test -d $D/report.j171 || { echo "J172: J171's report is not kept as $D/report.j171 (run1 moves it): nothing re-checked" >&2; exit 1; }
n=b-s10-peasant-2110; K0=$D/decks/s10-peasant-2010; A=$K0/decks/peasant-2010-00001.dck; B=$K0/decks/peasant-2010-00002.dck
# s10's decks: J171's draw, byte for byte (the folder's draw, then each deck)
test "$(python3 -I var/lab-j172-local/bin/drawsha.py $K0)" = "e4676bda05d0204f3ce43e3f8d1ee1a0ca0c8e24c7f8cf09860423d00ddedd9b 2" && test "$(sha256sum < $A | cut -d ' ' -f 1)" = d051adba41580377b7b1f627bc62f40ae25b5bac182c37f8bd7ec877bba6ce59 && test "$(sha256sum < $B | cut -d ' ' -f 1)" = 3ee08305330298d022189e0404dc8e0d0c874acb6e0a61ffea3ecb71ddb48b1d || { echo "J172: $n: the decks under $K0 are not J171's draw" >&2; exit 1; }
# J171's atlas.json and atlas.md kept beside once, as atlas.j171.*, and only if they are J171's (byte for byte its report copies)
if [ ! -f $D/$n/atlas.j171.json ]; then
  test "$(sha256sum < $D/$n/atlas.json)" = "$(sha256sum < $D/report.j171/$n.atlas.json)" && test "$(sha256sum < $D/$n/atlas.md)" = "$(sha256sum < $D/report.j171/$n.atlas.md)" || { echo "J172: $n: atlas.json or atlas.md is not J171's (report.j171's copy): not re-checked" >&2; exit 1; }
  cp $D/$n/atlas.md $D/$n/atlas.j171.md
  cp $D/$n/atlas.json $D/$n/atlas.j171.json
fi
# the re-check under D487's checker: J171's finished atlas resumed at the pin -- every unit is done, so nothing plays and only the checks run
# again; rows and units counted before and after; the exit and the wall to recheck-*.txt, never exits.txt or spine-times.txt (J171's)
r0=$(wc -l < $D/$n/phaseB/branches.jsonl); u0=$(wc -l < $D/$n/phaseB/units.jsonl)
t0=$(date +%s)
rc=0; timeout 30m tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2110 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j170/$n || rc=$?
echo "$n $rc" >> $D/recheck-exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/recheck-times.txt
echo "$n $r0 $(wc -l < $D/$n/phaseB/branches.jsonl) $u0 $(wc -l < $D/$n/phaseB/units.jsonl)" >> $D/recheck-rows.txt
```
```bash
# the legacy count (D487): the pinned checker over the five re-checked spines' branch logs, 100 a call, {workers} calls at once; per log its
# status and its `M55 legacy null target records=` and `M76 empty mandatory target parts=` lines
D=/home/justin-a/code/lab/data/lab-j170
python3 -I var/lab-j172-local/bin/legacy.py var/lab-j172-local/legacy.json {workers} $D/b-s02-peasant-2102 $D/b-s04-powered-2104 $D/b-s08-powered-2108 $D/b-s09-pauper-2109 $D/b-s10-peasant-2110
```
```bash
# the lost casts and D486's counters, from the frames (J171's scan): one cache a spine folder in J172's own folder, stamped with its atlas.json's
# mtime -- the five re-checks rewrote theirs, so all 13 are made again, and recheck.py holds each to J171's but for that stamp
D=/home/justin-a/code/lab/data/lab-j170
mkdir -p var/lab-j172-local/lost
for d in $D/b-s??-*-21??; do
  test -f $d/atlas.json || { echo "J172: $d: no atlas.json, not scanned"; continue; }
  python3 -I var/lab-j172-local/bin/metrics.py --scan $d var/lab-j172-local/lost {workers}
done
```
cores: 1
```bash
# J171's Report over all 13 spines, with J171's readers (var/lab-j172-local/bin: byte for byte, two path lines), into a new report/ (J171's is report.j171/)
D=/home/justin-a/code/lab/data/lab-j170
test -d $D/report.j171 || { echo "J172: J171's report is not kept as $D/report.j171 (run1 moves it)" >&2; exit 1; }
mkdir -p $D/report
: > $D/report/missing.txt
T=$D/spine-times.txt
SHA=$(cat var/lab-j172-local/sha.txt)
PIN=$(cat var/lab-j172-local/pin.txt)
LO="--lost=var/lab-j172-local/lost --training=1 --times=$T"
args=""; largs=""; dirs=""
# the night's 13 spines: b-s??-*-21?? matches no pilot folder; every row names J171's pin (the rows' commit) and its band's D486 pool
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
for f in var/lab-j172-local/lost/*.json; do cp "$f" "$D/report/lost-$(basename "$f")"; done || echo "lost caches: none" >> $D/report/missing.txt
python3 -I var/lab-j172-local/bin/labels.py $largs --out=$D/report/labels.jsonl $LO > $D/report/labels.json || echo "labels.py exited $?" >> $D/report/missing.txt
head -n 20 $D/report/labels.jsonl > $D/report/labels-head.jsonl || echo "labels.jsonl: none" >> $D/report/missing.txt
python3 -I var/lab-j172-local/bin/reads.py $args > $D/report/reads.json || echo "reads.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j172-local/bin/cuts.py $dirs --times=$T --recheck-times=$D/recheck-times.txt > $D/report/cuts.json || echo "cuts.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j172-local/bin/compare.py $D $D/report/labels.json > $D/report/compare-j168.json || echo "compare.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j172-local/bin/metrics.py > $D/report/tool.json || echo "metrics.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j172-local/bin/draws.py --report > $D/report/draws.json || echo "draws.py exited $?" >> $D/report/missing.txt
# the validation draw (J166's, made again by J170's pilot, never branched), recorded for the job that will branch it: J171's line, unchanged
python3 -I -c "import glob, json, os; D = '$D'; vs = sorted(glob.glob(D + '/validation/v*')); rows = [{'set': os.path.basename(v).split('-')[0], 'band': os.path.basename(v).split('-')[1], 'pool': 'random-' + os.path.basename(v).split('-')[1], 'deckSeed': int(os.path.basename(v).split('-')[2]), 'reservedGameSeed': int(os.path.basename(v).split('-')[2]) + 100, 'decks': sorted(glob.glob(v + '/decks/*.dck')), 'split': 'validation', 'training': False} for v in vs]; print(json.dumps({'note': 'the 4a validation draw (J166), made again by the J170 pilot into lab-j170 at deck seeds 2201-2213 (D447, --cross-band 0.10; D482 changes none of it) and kept by the J171 pilot: deck files only, never branched; no job may train on these decks or use these seeds before the validation job that branches them', 'drawSha256': '7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de', 'sets': rows}, indent=1))" > $D/report/validation.json || echo "validation.json: failed" >> $D/report/missing.txt
python3 -I -c "import glob, json, os; D = '$D'; out = {}; [out.__setitem__(os.path.basename(d), {k: json.load(open(d + '/plan.json')).get(k) for k in ('deckA', 'deckB', 'seed', 'branchRandom', 'branchForge', 'decisions', 'chunk', 'cuts')}) for d in sorted(glob.glob(D + '/b-s??-*-21??'))]; print(json.dumps({'note': 'all 13 spines branched fresh by J171 at f2b4e9c2, by D486s random seat (a new population: never pooled with J166-J169); s02, s04, s08, s09 and s10 re-checked in place by J172 at its pin under D487s checker, nothing played (J171s atlases kept beside as atlas.j171.*)', 'sha': '$SHA', 'recheckPin': '$PIN', 'recheckedSpines': ['b-s02-peasant-2102', 'b-s04-powered-2104', 'b-s08-powered-2108', 'b-s09-pauper-2109', 'b-s10-peasant-2110'], 'spines': out}, indent=1))" > $D/report/spines.json || echo "spines.json: failed" >> $D/report/missing.txt
cp var/lab-j172-local/legacy.json $D/report/legacy-j172.json || echo "legacy.json: none" >> $D/report/missing.txt
for f in exits.txt spine-times.txt recheck-exits.txt recheck-times.txt recheck-rows.txt; do cp $D/$f $D/report/$f || echo "$f: none" >> $D/report/missing.txt; done
# last, so its reads of report/ against report.j171/ see every file above
python3 -I var/lab-j172-local/bin/recheck.py > $D/report/recheck-j172.json || echo "recheck.py exited $?" >> $D/report/missing.txt
# disarm the abort gate: a re-post of this file starts disarmed until its own pilot
rm -f var/lab-j172-local/armed.txt
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
check: atlas.labels == 101
check: atlas.confident == 28
check: branches == 71940
check: recheck.ok == 5
check: recheck.j171Five == 5
check: recheck.untouched == 8
check: recheck.rowsSame13 == 13
check: recheck.exitsJ171 == 1
check: recheck.timesJ171 == 1
check: recheck.scanSame == 13
check: legacy.spines == 5
check: legacy.scanned == 54350
check: legacy.pass == 54350
check: legacy.fail == 0
check: legacy.partial == 0
check: legacy.unreported == 0
check: legacy.noTarget == 0
check: legacy.records == 4717
check: legacy.logsWithRecords == 4501
check: legacy.registeredOk == 5

## Abort if
abort: armed == 1 and branches > 71940
abort: armed == 1 and unit_errors > 20
abort: armed == 1 and engine_errors > 500
abort: armed == 1 and big_frames >= 6
abort: data_free_gb < 50
`armed` is 1 only from this job's pilot to its Report block. **`branches > 71940`** is the one that matters here: J171 left
71,940 branch rows on the 13 spines and a re-check adds none, so a new row means a re-check played, and the job stops within a
minute. The next three are J171's, kept as they were (J171's own values are 0, 0 and 0: they can fire only if a game is played).
**`atlas.problems == 0`** over the 13, after the re-checks, is the night's check: a log D487's checker does not pass fails it,
and `recheck` names the spine. **`legacy.records == 4717` and `legacy.logsWithRecords == 4501`** hold the accepted shape to
exactly the records D487 read against their casts: one more is a record D487 did not read, one fewer is a log that failed or a
count that moved.

## Report
collect: /home/justin-a/code/lab/data/lab-j170/report/*.atlas.md
collect: /home/justin-a/code/lab/data/lab-j170/report/*.atlas.json
collect: /home/justin-a/code/lab/data/lab-j170/report/labels.json
collect: /home/justin-a/code/lab/data/lab-j170/report/labels.jsonl
collect: /home/justin-a/code/lab/data/lab-j170/report/labels-head.jsonl
collect: /home/justin-a/code/lab/data/lab-j170/report/reads.json
collect: /home/justin-a/code/lab/data/lab-j170/report/cuts.json
collect: /home/justin-a/code/lab/data/lab-j170/report/tool.json
collect: /home/justin-a/code/lab/data/lab-j170/report/compare-j168.json
collect: /home/justin-a/code/lab/data/lab-j170/report/lost-*.json
collect: /home/justin-a/code/lab/data/lab-j170/report/draws.json
collect: /home/justin-a/code/lab/data/lab-j170/report/validation.json
collect: /home/justin-a/code/lab/data/lab-j170/report/spines.json
collect: /home/justin-a/code/lab/data/lab-j170/report/legacy-j172.json
collect: /home/justin-a/code/lab/data/lab-j170/report/recheck-j172.json
collect: /home/justin-a/code/lab/data/lab-j170/report/exits.txt
collect: /home/justin-a/code/lab/data/lab-j170/report/spine-times.txt
collect: /home/justin-a/code/lab/data/lab-j170/report/recheck-exits.txt
collect: /home/justin-a/code/lab/data/lab-j170/report/recheck-times.txt
collect: /home/justin-a/code/lab/data/lab-j170/report/recheck-rows.txt
collect: /home/justin-a/code/lab/data/lab-j170/report/missing.txt
The summary says, for Justin, in plain words and numbers only:
- **First line:** J171's night, re-checked under D487's checker with nothing replayed; the same 13 spines, rows and labels as
  J171 (D486's random seat, contract v4, `pool: random-<band>-d486`, every row naming f2b4e9c2), never pooled with any label or
  read from before D486. J172 adds no read: J171's summary is the night's read.
- **The re-checks** (`recheck-j172.json`, `recheck-*.txt`): per spine (s02, s04, s08, s09, s10) the exit, the problems (0
  against J171's one: 1,212, 61, 38, 2,361, 829 logs failed), the frame logs checked against J171's, rows and units unmoved, phase
  B 0 units, the re-check's wall and its redaction time against J171's (J171's flagged spines spent up to 382 s re-running
  failing batches one log at a time); the eight others untouched.
- **The legacy count** (`legacy-j172.json`): logs scanned and PASS, legacy records and the logs that hold them, per spine and
  in all, against D487's 4,717 in 4,501; `M76 empty mandatory target parts` (0); the sweep's wall.
- **The night's checks:** `atlas.problems` now 0, and every other J171 check as it stood (all passed in J171); the scan's 13
  caches equal to J171's.
- **The labels:** 101 labels and 28 confident (checks), the sizing read 28.9 [19.2, 41.8] as J171's; whether `labels.jsonl`,
  reads.json, compare-j168.json and cuts.json came out as J171's (`labelsSame`, `readsSame`, `compareSame`, `cutsSame`) -- and, if
  any did not, which fields moved and why, with no verdict.
- **What stays open** (from J171's read, not J172's to settle): D486's new lost casts (s09's Fireball 545, s13's Bone Shards and
  Vicious Offering), the fix lane before the next full night, and J171's small job changes.
- **No verdict** beyond the checks: J172 measures nothing new.
