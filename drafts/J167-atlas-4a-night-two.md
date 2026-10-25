id: J167
title: The move atlas, rung 4a, night two -- J166's night finished on the merged tree of D481 (the redaction checker accepts a decision id entered between frames), D482 (the census draw's engine-unplayable list: Scute Swarm never dealt) and D483 (one atlas option per distinct play): s02 and s03 RE-CHECKED under the new checker by resuming their finished atlases (no game replayed), s04 FRESH on its D482 deck (J166's s04 moved aside, never deleted), s05-s13 as J166 planned them (same seeds, the Forge map at 40 on s07 and s13, every cut on, chunk 25); the data folder lab-j166 resumed; the Report over all 13 spines, with the D483 identities and the decisions whose k D483 changes. Pre-registered reads, numbers only; no outcome rule beyond D451's and J156's (iv). Never pooled with J156's, J157's, J158's or J162's labels
public_title: Move atlas 4a night two: random library decks
public_est: ~7 to 10 h
public_decides: None by itself; 4a night finished: labels on random library decks
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2.7
repos: mtg-table@bf9786903b86da77c17da5b0df6415ca41c71d65 (origin/main: the merge of D481, D482 and D483 on 49c0308e, #208; the owner writes the merge's sha here before posting; merged == 1 and the three decisions' commits checked by the pilot)
decides: nothing by itself. Rung 4a's night, finished: J166 (2026-10-24/25) branched s01-s03 and lost s04 to Scute Swarm and the 3-h block cap; J167 re-checks s02 and s03 under D481, runs s04 on the deck D482 deals in its place and runs s05-s13, so the night's 13 spines and their labels exist on one data folder. It measures what J166 measured on 3 spines, on 13: labels and confident labels per spine, band and night, what the cuts save, and the tool's counters, now with D483's play identities
hypothesis: none to confirm about the maps. The sizing has a registered expectation from J166's three finished spines (morning read 2026-10-25): ~122 labels and ~22.3 confident labels per 7-worker 10-h night (resting on 4 confident labels; a Poisson interval on 4 spans ~6-57), against the atlas review's ~25-27; early stopping saving ~8% of branch time (J166: 7.7%, the review 18-20%), the screen firing rarely (J166: never). D483 is expected to remove the twin options J166 paid 12.5% of its branch time for, and D481 to pass s02's and s03's 17,000 branch logs (D481's own proof: 17,000 PASS)
rule: D451 (method; no outcome rule) with D458/D462/D466 (G5), D459, D465, D466, D467, D470, D471 (G6), D472, D476, D477, D478, D479, D480 (the cuts) and its follow-up (the schedule's plan-hash guard); D481 (the redaction checker's between-frames rule, amends D347), D482 (the engine-unplayable list, amends D447's draw), D483 (one option per play identity; --min-options counts plays). Pre-registered here, before any J167 data: the label contract (v2) and reads (a)-(c) computed by var/lab-j167-local/bin/labels.py, the agreement reads (i)-(vi) by reads.py, the savings by cuts.py and the tool's counters by metrics.py, all exactly as written in the pilot. A candidate of (iv) HOLDS on a spine only if its point is > 0 and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. Every other difference is a candidate (D447 point 9). No read carries any other verdict
followup: morning-read
est: ~7.5 h at 6 workers, ~6.5 h at 7 (range 6.5-10 h; sizing below): pilot ~20 min; the re-check of s02 and s03 ~7 min; 10 spines ~42 min each at 6 workers (J166's s01-s03 mean; s07 and s13, with a Forge map, ~48 as s01 was); report ~2 min. Disk ~11 GB more on the lab data folder /home/justin-a/code/lab/data (J166: 4.2 GB for its 3 spines and s04's partial)
resumable: yes
timeout: 3h
progress: lines /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/branches.jsonl of 65000
metrics: branches = lines /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/branches.jsonl
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/branches.jsonl "\"engineError\":true"
metrics: branch_timeouts = count /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/branches.jsonl "\"timedOut\":true"
metrics: unavailable = count /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/branches.jsonl "\"unavailable\":\""
metrics: unit_errors = count /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/units.jsonl "\"ok\":false"
metrics: payfail = count /home/justin-a/code/lab/data/lab-j166/b-s??-*-21??/phaseB/logs/*.log "Didn't find what to pay for"
metrics: armed = sh: cat var/lab-j167-local/armed.txt 2>/dev/null || echo 0
metrics: atlas = sh: python3 -I var/lab-j167-local/bin/metrics.py 2>/dev/null || echo '{"problems":-1}'
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: data_used_gb = sh: python3 -c "import os; print(round(sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk('/home/justin-a/code/lab/data/lab-j166') for f in fs) / 1e9, 2))" 2>/dev/null || echo 0
headline: branches, atlas.spinesDone, atlas.branchedInFull, atlas.screened, atlas.stoppedOptions, atlas.labels, atlas.confident, atlas.confidentPer7Worker10hNight, atlas.timeoutShare, atlas.identityOptions, atlas.kChanged, atlas.recheckOk, atlas.effectSourceNullBranches, atlas.exileLinksLostBranches, atlas.branchRestarted, atlas.branchCapped, atlas.problems

**Why.** J166 was rung 4a's first night: 13 spines of random library decks, drawn as the census draws them (D447),
on D480's cut design, labels marked `training: true` (Justin's rules of 2026-10-24, 19:35-19:50 EDT: the training
pool carries no bias toward his decks or cubes; breadth over depth; a validation set drawn the same way and never
branched). It ran 5 h 15 min and stopped at its fourth block (STATUS `failed`, "step run4 ran past 10800 s"): s01
finished clean; s02 and s03 finished their games but exited 3 on the redaction check alone; s04 met Scute Swarm and
never finished; s05-s13 never ran. Its morning read (section 6) is this job's brief, and the three decisions it asked
for are in the pin. **This job is the rest of that night.**

**What changed since J166** (in the pin; the pilot checks each is there):
- **D481: the redaction checker accepts a decision's id entered between frames** -- a token of the viewer's own born
  and gone inside one resolution (Boo's and Zirda's legend-rule choices: 1,891 ids in 1,395 of s03's logs), and a
  spell moved from the viewer's own hand to the stack with no stack instance yet (s02's one log). Counted on the
  file's report, never a problem; everything else fails as before. D481 measured s02's and s03's 17,000 branch logs
  at 17,000 PASS. `tools/check-redaction.mjs` is what the atlas's checks run, so a re-check picks it up.
- **D482: the census draw's engine-unplayable list** (`tools/cubelab/engine-unplayable.json`: Scute Swarm, since
  J166). `decks --band` re-picks from the same list when a pick lands on a listed card and counts the skip
  (`engineSkips`); a deck none of whose picks landed on one is byte for byte the deck it was. Of J166's 14 deck
  folders only s04's deck 1 changes: k = 3 W/R/G at the same shares, 18 lands, one skip, its first spells Lovestruck
  Beast, Momo, Friendly Flier, then **Hexdrinker** where Scute Swarm was. Deck 2 (mono-white) is unchanged.
- **D483: one atlas option per distinct play.** Forge's doubled may-play twin (the Rider from exile, the Thrull
  under Wrenn's Resolve) is no longer a second option; each listing carries `identities` beside `tokens`;
  `--min-options` counts distinct plays (`playCount`). J166's twins were 8 branched options, identical to their
  twins at 200 of 200 paired branches, 12.5% of its branch time; three of s03's k >= 3 decisions were really two-way.
  **A plan made before D483 cannot be resumed** where a unit still has to play (the replay lists fewer options than
  the unit expects: "the replay diverged"), so **s04 starts fresh** and nothing of J166's is resumed *into play*.
- **D480's follow-up** (#208, in 49c0308e): the schedule's first line is a plan header (the plan's and the deck
  files' sha256), and a resume against another plan is refused naming both hashes. J166's schedules (325c2dd8)
  have no header and are replayed unchecked, said once.

**These labels are J166's population, with two listings.** The decks, the draw, the design, the seeds and the cuts
are J166's, so the 13 spines are one population (`pool: "random-<band>"`, `training: true`), never pooled with J156's,
J157's, J158's or J162's labels. But s01-s03 were branched at 325c2dd8 over **pre-D483 listings** (their twins
included: s01 d6, d7; s03 d7, d9, d11, d15, d18, d19 -- each such decision's k is one too many) and s04-s13 at the
pin over **D483 listings**. Every row says which (`listing`, with its spine's `sha`), and the reads are given over the
13 and again over the ten D483 spines alone, as information. Rung 4 splits on those keys; nothing here drops a row.

## What J167 does with J166's folders: the answers, with the code

**(b) s02 and s03 are re-checked by resuming their finished atlases, not by a direct checker sweep.** At the pin
(D483's `tools/cubelab/atlas.ts`, which D481 and D482 do not touch), the atlas command on a folder whose phase B is
done plays nothing and redoes only the checks:
- `plan.json`'s resume check compares `deckA, deckB, seed, turnCap, options, chunk, branchTimeoutSec, cuts`
  (atlas.ts:376-380): J166's flags, decks and paths, all unchanged (D482: s02's and s03's decks are byte-identical).
- `baseline.json` exists, so the baseline is not played again (atlas.ts:480); its listing is J166's, pre-D483.
- The schedule (`phaseB/schedule.jsonl`) has no plan header (325c2dd8 wrote none), so `openSchedule` replays it
  unchecked (atlas.ts:458-460); its picks are J166's, not re-picked under `playCount`.
- `AtlasSchedule` puts in `initial` only units not in `units.jsonl` as done (atlascuts.ts:297): every unit is done
  (48 of 48, 64 of 64), so `units` is empty and phase B returns at once (atlas.ts:509, 514-517) -- no worker, no
  replay, so D483's "the replay diverged" (Atlas.java:402, a unit's check) is never reached.
- `writeAtlasChecked` (atlas.ts:387) then runs every check from the folder's files -- the rows, the guardrails, and
  `tools/check-redaction.mjs` over every frame log (branch logs with `--empty-hand-ok`, on `--checks-parallel`
  workers) -- and rewrites `atlas.json` and `atlas.md`.

What the re-check block adds around it: it **copies** J166's `atlas.json` and `atlas.md` to `atlas.j166.json` and
`atlas.j166.md` first (once; the re-check overwrites `atlas.json`, whose `timing` would then say phase B took 0 s:
`cuts.py` reads phase B's timing from the `.j166` copy); it records `branches.jsonl`'s and `units.jsonl`'s line counts
before and after (`recheck-rows.txt`: they must not move); it bounds each re-check at 30 minutes (`timeout 30m`; D481
measured both spines' checks at 123 s on six calls); and it writes its exits and walls to `recheck-exits.txt` and
`recheck-times.txt`, not to J166's `exits.txt` and `spine-times.txt`, so the night's sizing keeps J166's walls.
s01 passed J166's checker and D481 only loosens it, so s01 is not re-checked.

**The data folder stays `/home/justin-a/code/lab/data/lab-j166`, resumed.** Nothing in the runner forbids a second job
on a folder: its README's only rule about shared paths is about jobs running side by side ("Jobs side by side share
`var/`: they must not write the same paths", PC-JOBS-README.md:301), and J166 is finished (`failed`). The
code-version refusal (D341, docs/guides/lab-runner.md:464) is the cube lab's `run`, `evolve` and `selfplay`, not the
atlas; the atlas's own guards are the plan keys and the schedule header above, which J167's flags meet. A runner
retry of J167 resumes J167's own `run.json` (`blocks_done`), never J166's.

**(c) J166's s04 is moved aside, never deleted** -- by run1, after the pilot has passed, never by the pilot:
`b-s04-powered-2104` to `b-s04-powered-2104.j166-scute` (only if it is J166's: no `atlas.json`, a schedule with no
plan header) and its deck folder `decks/s04-powered-2004` to `decks/s04-powered-2004.j166-scute` (only if its draw's
sha256 is J166's, `d78468cd...`). run2 then draws s04 again with the list into `decks/s04-powered-2004`, checks it is
byte for byte the pilot's redraw, and plays the spine fresh at the same seeds (deck 2004, game 2104) and chunk 25
(`--chunk 10` is refused with `--screen 25`: `checkCuts` wants every checkpoint a multiple of the chunk).
- **Every glob of this job is `b-s??-*-21??`** (spines) **and `s??-*-20??`** (deck folders): the `.j166-scute`
  folders, `pilot-smoke*` and `p-powered-2099` match neither, so no metric, check or reader sees J166's s04 or a pilot.
- **D482's evidence names J166's s04 paths** (`engine-unplayable.json`'s `evidence`, and the decision's text):
  after run1 they live under the `.j166-scute` names.

## The decks

**The draw is D447's with D482's list** (`docs/decisions/D482-census-engine-unplayable-list.md`):
`tools/cubelab.sh decks --band <b> --count 2 --seed <s> --cross-band 0.10 --out ...`, the committed list by default.
J166's 13 spine draws, its smoke's and its validation draw are on the data folder, written by J166's pilot at
325c2dd8; J167 writes no deck there but s04's.

| spine | band | deck seed | decks (A, B) | game seed | Forge map | J167 |
|---|---|---|---|---|---|---|
| s01 | pauper | 2001 | k 5 WUBRG, k 1 R | 2101 | **40** | J166's, finished, exit 0: kept as is |
| s02 | peasant | 2002 | k 3 URG, k 1 B | 2102 | 0 | J166's games, **re-checked** |
| s03 | legacy | 2003 | k 5, k 5 | 2103 | 0 | J166's games, **re-checked** |
| s04 | powered | 2004 | **k 3 WRG (D482's deck 1)**, k 1 W | 2104 | 0 | **fresh** |
| s05 | pauper | 2005 | k 2 RG, k 2 WG | 2105 | 0 | new |
| s06 | peasant | 2006 | k 4 WBRG, k 1 U | 2106 | 0 | new |
| s07 | legacy | 2007 | k 1 R, k 5 | 2107 | **40** | new |
| s08 | powered | 2008 | k 2 UR, k 4 UBRG | 2108 | 0 | new |
| s09 | pauper | 2009 | k 4 WURG, k 4 WBRG | 2109 | 0 | new |
| s10 | peasant | 2010 | k 3 WBR, k 2 BG | 2110 | 0 | new |
| s11 | legacy | 2011 | k 1 B, k 4 WURG | 2111 | 0 | new |
| s12 | powered | 2012 | k 5, k 3 WUB | 2112 | 0 | new |
| s13 | pauper | 2013 | k 2 BG, k 1 G | 2113 | **40** | new |

**The draws' sha256s, registered** (`drawsha.py`: each folder's `decks.jsonl`, then its `.dck` files by name),
computed 2026-10-25 from the data folder as J166's pilot wrote it:
- J166's 13 spine draws: `e998ad3c246d7cf5a6ab92e45a133918e2a42ff63440c2dd35507cc19b08df3c` (26 decks, J166's
  registered value);
- **the 12 that D482 leaves alone** (s01-s03, s05-s13, in order): **`e27796b73073bab5e172c2225047cecfe8424ee5ceeb4d839d44484d9da07419`** (24 decks);
- J166's s04 alone: **`d78468cde81712cfcbf350e53f6caaeac8aecaabf657829067c94f92b100271a`** (its deck 1
  `bec1f985...e4cb9ff`, deck 2 `f4f21079...ee09b36d1`, `decks.jsonl` line 2 `d49125a1...9c2c0`);
- the smoke's (powered, 2099): `edfdc861736fb049bc1080d525269064c6776ecabd47de496463fa3dc684c931`;
- the validation draw (v01-v13): `7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de` (26 decks).

**The new s04 draw's sha256 is the pilot's to compute** (no engine has drawn it on the pin yet; D482's lane printed
the deck): the pilot draws all 13 spine pairs and the smoke's into the clone, requires the 12 and the smoke to give
the registered values above, requires s04's deck 2 and its `decks.jsonl` line 2 to be J166's byte for byte and deck
1 to be the deck D482 describes (no Scute Swarm, `engineSkips: {"Scute Swarm": 1}`, k 3 WRG at J166's shares, 18
lands, first spells Lovestruck Beast, Momo, Friendly Flier, Hexdrinker), then **prints its sha256s into the pilot's
log and registers them** in `var/lab-j167-local/draw-s04.txt` (the folder) and `draw-s04-deck1.txt` (deck 1). run2's
draw onto the data folder must match them; the final checks require s04's plan to name that deck 1; the report
carries both (`report/draws.json`). The owner may pin the value beforehand in `draws.py` (`S04_NEW_DECK1`).

**The validation draw is J166's, untouched**: v01-v13, deck seeds 2201-2213, game seeds 2301-2313 reserved for the
job that branches them. The pilot checks its folders still give `7def89fa...`, and as **information only** redraws
it on the pin into the clone (`validationRedrawSame`): D482 may change a deck one of whose rejected attempts picked
Scute Swarm, and none of J166's validation decks holds it. A check fails the job if any spine's plan names a
validation deck or any validation folder holds a plan or a phase B.

## The design: J166's, unchanged

| | |
|---|---|
| spines | 13 Forge-vs-Forge baseline games, one a block; s01-s03 J166's, s04-s13 J167's |
| decisions | **8 a spine** (`--decisions 8`), spread over the listed decisions with **3 or more plays** (`--min-options 3`, which D483 makes a count of distinct play identities); fewer such fill from the rest (`fill`) |
| screen | **25 random branches** (`--screen 25`): mean <= .04 or >= .96 settles it (`screened: true`, never a label), the next listed decision replaces it |
| branches | every option **200 times random**, early stopping at **50, 100, 150** (`--early-stop on`); the Forge map **40** on s01, s07, s13, **0** elsewhere |
| units | 25 branches (`--chunk 25`), released behind each checkpoint; `--unit-timeout 30`; the 120-s branch timeout; `--branch-error-max` 0.1, `--branch-capped-warn` 0.25 |
| checks | on the workers (`--checks-parallel {workers}`) |

The per-spine flags are J166's exactly: `--phase b --decisions 8 --min-options 3 --screen 25 --early-stop on
--branch-random 200 --branch-forge <40|0> --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers}`.

**Sizing** (J166's measured rates; worker-hours = wh):
- J166's s01-s03 took 47.8, 29.4 and 48.6 min at 6 workers (mean 42; s01 had the Forge map); 4,760 branch games a
  spine on average (s02's game listed only 6 decisions). J166's projection was ~40 min at 7.
- **Ten spines** at ~42 min (s07, s13 ~48): **~7.1 h at 6 workers**; the pilot ~20 min and the re-check ~7 min:
  **~7.5 h at 6, ~6.5 h at 7.** D483's dropped twins make a spine with a may-play card cheaper; nothing else here is
  faster than J166.
- **The slow tail**: s08 and s12 are powered, and random library decks can meet a card no atlas has played (Scute
  Swarm cost J166 3 h). **`timeout: 3h`** bounds each block (one spine a block): ~4x a spine. A spine that stalls
  costs at most 3 h and fails the job at that block; a runner retry resumes it (`resumable: yes`). Range 6.5-10 h.
- ~65,000 branch rows when done (`progress:`): J166's 14,280 on s01-s03, ~4,900 on a spine without a Forge map and
  ~5,800 with one.
- **Disk** ~11 GB more; the pilot and every block require 50 GB free, and `abort:` fires under 50 GB.

**Where it writes: the lab data folder, lab-j166,** as J166 did: every atlas and decks command runs under
`LAB_DATA_DIR=/home/justin-a/code/lab/data`, which re-roots `--out var/lab-j166/...` there. The Forge homes
(`CUBELAB_HOME_ROOT=var/cubelab/homes-J167`), `atlas-selftest`'s own folder and the job's scripts
(`var/lab-j167-local/`) stay in the clone. As J166:
- the pilot's first lines assert that `LAB_DATA_DIR` is unset or exactly that path, and so is `config.json`'s
  `labDataDir`; they stop under 50 GB free;
- the pilot records, once, that lab-j166 is as J166 left it (`state`: s01-s03 with an `atlas.json`, s04 J166's or
  already set aside, no s05-s13 folder) -- the analogue of J166's `fresh`;
- every run block asserts the path, the 50 GB and its two deck files again before it plays;
- the metrics, `progress:` and `collect:` read the data folder by its absolute path;
- **no `clean:`, and nothing is deleted there**: rung 4 reads these folders; J166's s04 is moved aside, and J166's
  `atlas.json` of s02 and s03 kept as `.j166` copies. A restart from scratch needs the J167 spines (s04-s13) moved
  aside by hand, `.j166-scute` moved back if s04 should be J166's again, and `var/lab-j167-local/armed.txt` and
  `state.txt` removed (the J152 lesson).

**Nothing beside it.** `cores: 7` of 8 reserves the box: post nothing heavy beside it. No `pilot_cores:`. **No
`after:` line**: it waits for no job; J166 is finished, and the core budget serialises it against any heavy job.

**The abort lines read only this run's artefacts (the J152 lesson).** Every abort that reads the atlas's own files is
gated on `armed == 1`; `var/lab-j167-local/armed.txt` is written by this job's pilot and removed by the Report block's
last line. J166's own `var/lab-j166-local/armed.txt` (left at 1 when its Report block never ran) is not read.

## The label set: the rung-4a contract, v2

`report/labels.jsonl`, one JSON row a branched decision of seat A on all 13 spines, written by labels.py.
`contract` reads **`mtg-table rung-4a label v2 (J167)`**: J166's v1 fields (its draft, *The label set*), with:

| field | what it is |
|---|---|
| `sha` | **the spine's own**: `325c2dd8` on s01-s03 (J166's branches), the pin on s04-s13 |
| **`listing`** | `"pre-D483"` (s01-s03: no `identities`, twins listed) or `"D483"` (s04-s13) |
| **`playCount`** | the decision's distinct plays (`identities`; the token count on a pre-D483 listing), beside `k` (the options listed and branched) |
| **`tokenTwice`** | the listing names one token twice: on a pre-D483 listing a twin (k is one too many), on a D483 listing two plays under one token (the Rider's creature and Swift End from the hand) |
| `options[].identity` | each option's play identity (null on a pre-D483 listing) |

- `training: true`, `split: "train"`, `pool: "random-<band>"` on every row, as J166; the validation draw is never in it.
- **Expected: 0 void labels** (D470).
- **Nothing is cleaned**: rung 4 reads the spine folders through each row's paths.

## Pre-registered reads (numbers only)
J166's reads (a)-(viii), definitions unchanged, over **all 13 spines**, with these additions:
- **(a)-(c) once more over the ten D483 spines (s04-s13)** (`report/labels-d483.json`), as information beside.
- **(c) the sizing read** (`c_sizingRead`): confident labels per 7-worker 10-h night as run (J166's walls for s01-s03,
  J167's for s04-s13; the re-check's walls apart), beside **J166's s01-s03 measured 122 labels / 22.3 confident**
  and the review's ~25-27. No verdict.
- **(d) the cuts' savings**: phase B's timing of s02 and s03 from their `.j166` copies; the re-check's wall per
  spine apart (`recheckSec`).
- **(iv) C1 "cast now where Forge passes" on s01, s07, s13**: HOLDS / NOT SHOWN by the registered rule (s01's
  J166 value, +4.1 [0.9, 7.5] HOLDS, recomputed with the others); random-map C1 on the other ten as information.
- **(ix) D483** (metrics.py, `report/tool.json`): **`identityDecisions`** and **`identityOptions`** (the listed
  decisions carrying `identities`, and the identities in all: the D483 identities count), `identityListingsShort`
  (a D483 spine's listing without an identity beside every token: **0, a check**), `repeatedPlays` (a listing naming
  one identity twice: **0, a check**), `sharedToken` (D483 listings with two plays under one token), and
  **`kChanged`** / **`kChangedBranched`**: the decisions on the pre-D483 listings (s01-s03) that list a token twice,
  i.e. whose k D483 lowers -- listed and branched. **Expected (information): 10 listed (s01 d6, d7; s03 d7, d9, d11,
  d13, d15, d18, d19, d20, as D483 measured on these decks) and 8 branched** (J166's 8 twin options). On a D483
  listing a twin is dropped before it is listed and nothing counts it, so k cannot be seen to change there: the
  check is that none repeats.
- **(x) The re-check** (metrics.py): `recheckOk` = s02 and s03 each re-checked with exit 0, 0 problems, its rows and
  units unmoved, phase B's timing 0 units in the new atlas.json and J166's in the `.j166` copy: **2, a check**.
- **(xi) The draws** (`report/draws.json`): the new s04 draw's sha256s, the 13-spine set as run, the 12 unchanged,
  the validation draw on file, and whether its redraw on the pin is the same (information).
- Everything else is a candidate (D447 point 9).

**Outputs** (on the data folder, `/home/justin-a/code/lab/data/lab-j166/`).
- `decks/s04-powered-2004/` (D482's draw) beside `decks/s04-powered-2004.j166-scute/` (J166's, moved aside).
- `b-s04-powered-2104/` ... `b-s13-pauper-2113/` (fresh), `b-s04-powered-2104.j166-scute/` (J166's, moved aside);
  `b-s02-.../atlas.json`, `atlas.md` (re-checked) beside `atlas.j166.json`, `atlas.j166.md`.
- `exits.txt` and `spine-times.txt` (J166's lines, then J167's s04-s13), `recheck-exits.txt`, `recheck-times.txt`,
  `recheck-rows.txt`; `pilot-smoke-j167/`, the smoke.
- `report/`: each spine's `atlas.json` and `atlas.md` under its folder's name, `labels.jsonl`, `labels.json`,
  `labels-d483.json`, `labels-head.jsonl`, `reads.json`, `cuts.json`, `tool.json`, `validation.json`, `spines.json`,
  `draws.json`, `exits.txt`, `spine-times.txt`, `recheck-exits.txt`, `recheck-times.txt`, `recheck-rows.txt` and
  `missing.txt` (empty when nothing was missing). J166's Report block never ran, so `report/` is new.
- Never `summary.md` or `metrics.json`.

## Pilot
About 20 minutes: the data folder and the abort gate; J166's folder as J166 left it; the pin carries D466-D472,
D476-D480 and its follow-up, and D481, D482 and D483 (their decision files, their code, and the commits that added
the files ancestors of the pin); the node tests and the redaction checker's selftest; the two engine self-tests
(`atlas-selftest`, whose D483 leg fails on a listing without identities or with a play twice, and `seat-identity`);
the readers' self-tests on J158's, J162's and **J166's own three spines**; the deck draws under D482; a 1-spine smoke
with every cut on.

**The readers' self-tests** (J166's, re-run on J167's readers, and one more):
- **labels.py on J162's four spines** must give J162's `labels.json`: 59 labels, 7 confident, 5 `confidentForge`, 0
  unmatched, 0 void, the confident share 0.1186 [0.0339, 0.2203], 91 labels a 7-worker night; no `--training`, so
  every row `training: false`. **On J158's two spines**: 32 labels, 6 confident, the void list
  `ff5 d10 block:35>78`, `ff5 d14 block:21>71`, `ff5 d30 block:25>80,40>81`, no non-block decision.
- **reads.py on J162's four spines**: C1 pauper5 0.0411 [0.0126, 0.069] HOLDS, synergy9 0.0002 [-0.0133, 0.0136]
  NOT SHOWN, modern7 0.063 [0.017, 0.1231] HOLDS, ff5 0.0523 [-0.0047, 0.1313] NOT SHOWN; (i) 0.5088 [0.322, 0.7];
  (ii) 0.2181 [-0.1188, 0.5799]. **cuts.py on J162's**: saved share 0, 55,680 branch games, 92.3 s per 1,000.
  **metrics.py on J162's** (its glob `b-*`): 4 atlases, 10 problems, 55,680 rows, 2,400 D472/D476 errors, 32,626 X
  drawn, 0 plans in this table.
- **On J166's s01-s03, as the morning read gave them** (`pc-results` `results/J166/report/`, 2026-10-25): labels.py
  22 labels, 4 confident, 1 `confidentForge`, 0 unmatched, 0 void, 22 training rows, the confident share 0.1818
  [0.0417, 0.3636], 122 labels and 22.3 confident a 7-worker night; reads.py s01's C1 0.0409 [0.0087, 0.0752] HOLDS,
  (i) 0.5 [0.125, 0.875], (ii) 0.1933 [-0.4667, 0.82]; cuts.py 14,280 branch games, saved share 0.0769, 38.0 s of
  checks per 1,000, idle share 0.089; metrics.py (glob `b-s0[123]-*-210?`) 3 atlases, 3 spines done, 14,280 rows,
  3 pre-D483 listings, 0 identities, **`kChanged` 10 and `kChangedBranched` 8**. The same whether the pilot runs
  before run1's re-check or after it (labels and reads never read the checks; cuts.py reads the `.j166` timing).
- **All four on the pilot's own `atlas-selftest` cuts legs**, as J166.

**The smoke** plays J166's smoke pair (`decks/p-powered-2099`, unchanged by D482: checked) at game seed **2199** into a
new folder, `pilot-smoke-j167`: 2 decisions, 25 random and 5 Forge branches an option, chunks of 5, every cut on at
the smoke's scale. It must show 0 problems, 0 violations, G6's keys and `zeroX` 0, D479's keys, **2 decisions in
full**, every planned unit done, no timeout, the 120-s branch timeout, two labels whose rows match, none void, every
row `training: true`, and **a D483 listing: an identity beside every token at every listed decision, no play
twice**. Then the readers run on it.
```bash
# the lab data folder: exactly /home/justin-a/code/lab/data (README safety rules), 50 GB free or stop
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J167: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import json, sys; v = json.load(open('config.json')).get('labDataDir'); sys.exit(0 if v in (None, '', '/home/justin-a/code/lab/data') else 'J167: config.json labDataDir is %r, not /home/justin-a/code/lab/data' % v)"
mkdir -p /home/justin-a/code/lab/data/lab-j166 var/lab-j167-local/bin var/lab-j167-local/redraw
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; print('J167: data folder free GB', round(f, 1)); sys.exit(0 if f >= 50 else 'J167: under 50 GB free on the data folder')"
echo 1 > var/lab-j167-local/datadir.txt
# state: lab-j166 as J166 left it, recorded once (a later pilot run keeps the first answer): s01-s03 each with an atlas.json,
# s04 J166's (no atlas.json, a schedule without D480's plan header) or already set aside, and no s05-s13 folder
test -f var/lab-j167-local/state.txt || python3 -I -c "
import glob, json, os
D = '/home/justin-a/code/lab/data/lab-j166'
ok = all(os.path.exists(D + '/' + n + '/atlas.json') for n in ('b-s01-pauper-2101', 'b-s02-peasant-2102', 'b-s03-legacy-2103'))
s4 = D + '/b-s04-powered-2104'
try:
    j166s4 = not os.path.exists(s4 + '/atlas.json') and json.loads(open(s4 + '/phaseB/schedule.jsonl').readline()).get('type') != 'plan'
except (OSError, ValueError):
    j166s4 = False
ok = ok and (j166s4 or os.path.isdir(s4 + '.j166-scute'))
ok = ok and not any(glob.glob(D + '/b-s%02d-*' % k) for k in range(5, 14))
print(1 if ok else 0)
" > var/lab-j167-local/state.txt
# the abort gate (the J152 lesson): this job's own run is armed from here; the Report block disarms it
echo 1 > var/lab-j167-local/armed.txt
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j167-local/merged.txt || echo 0 > var/lab-j167-local/merged.txt
git rev-parse --short=8 HEAD > var/lab-j167-local/sha.txt
grep -q 'chosenOptionalCosts' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'class StepClock' bridge/src/mtgtable/ai/Atlas.java && grep -q 'class OptionUnavailable' bridge/src/mtgtable/ai/RolloutController.java && grep -q 'zeroXLeftOut' bridge/src/mtgtable/ai/Explorer.java && grep -q 'restoreChoices' bridge/src/mtgtable/ai/Explorer.java && grep -q 'copyCandidates' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'COUNTED_GUARDRAILS' tools/cubelab/atlas.ts && grep -q 'unit-timeout' tools/cubelab/atlas.ts && grep -q 'empty-hand-ok' tools/check-redaction.mjs && echo 1 > var/lab-j167-local/has-d466-d472.txt || echo 0 > var/lab-j167-local/has-d466-d472.txt
grep -q 'D476' bridge/src/mtgtable/ai/SearchPolicy.java && echo 1 > var/lab-j167-local/has-d476.txt || echo 0 > var/lab-j167-local/has-d476.txt
grep -q 'final class ForkRestart' bridge/src/mtgtable/ai/ForkRestart.java && grep -q 'branchRestarted' tools/cubelab/atlas.ts && echo 1 > var/lab-j167-local/has-d477.txt || echo 0 > var/lab-j167-local/has-d477.txt
grep -q 'BRANCH_CAPPED_WARN_DEFAULT' tools/cubelab/atlas.ts && grep -q 'export function cappedBranches' tools/cubelab/atlas.ts && echo 1 > var/lab-j167-local/has-d478.txt || echo 0 > var/lab-j167-local/has-d478.txt
grep -q 'effectSourceNull' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'exileLinksLost' bridge/src/mtgtable/ai/Atlas.java && grep -q 'exileLinksLost' tools/cubelab/atlas.ts && echo 1 > var/lab-j167-local/has-d479.txt || echo 0 > var/lab-j167-local/has-d479.txt
grep -q 'export class AtlasSchedule' tools/cubelab/atlascuts.ts && grep -q "export const EARLY_STOP_ON = \[50, 100, 150\]" tools/cubelab/atlascuts.ts && grep -q 'export const SCREEN_LOW = 0.04' tools/cubelab/atlascuts.ts && grep -q 'export async function redactionCheckParallel' tools/cubelab/censusplay.ts && grep -q 'holdIdle' tools/cubelab/engine.ts && grep -q 'SELFTEST_CUTS' tools/cubelab/atlas.ts && test -f web/test/cubelab-atlas-cuts.test.ts && echo 1 > var/lab-j167-local/has-d480.txt || echo 0 > var/lab-j167-local/has-d480.txt
grep -q 'export function openSchedule' tools/cubelab/atlas.ts && grep -q 'SCHEDULE_PLAN_KEYS' tools/cubelab/atlas.ts && echo 1 > var/lab-j167-local/has-d480f.txt || echo 0 > var/lab-j167-local/has-d480f.txt
ls docs/decisions/D481-*.md >/dev/null 2>&1 && grep -q 'enteredBetweenFrames' tools/check-redaction.mjs && test -f fixtures/negative/redaction/m55-option-entered-between-frames.jsonl && echo 1 > var/lab-j167-local/has-d481.txt || echo 0 > var/lab-j167-local/has-d481.txt
ls docs/decisions/D482-*.md >/dev/null 2>&1 && test -f tools/cubelab/engine-unplayable.json && grep -q '"Scute Swarm"' tools/cubelab/engine-unplayable.json && grep -q 'engine-unplayable.json' tools/cubelab/deckcensus.ts && grep -q 'engineSkips' tools/cubelab/deckcensus.ts && echo 1 > var/lab-j167-local/has-d482.txt || echo 0 > var/lab-j167-local/has-d482.txt
ls docs/decisions/D483-*.md >/dev/null 2>&1 && grep -q 'public static String playIdentity' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'identities' bridge/src/mtgtable/ai/Atlas.java && grep -q 'export function playCount' tools/cubelab/atlascuts.ts && grep -q 'export function repeatedPlays' tools/cubelab/atlascuts.ts && echo 1 > var/lab-j167-local/has-d483.txt || echo 0 > var/lab-j167-local/has-d483.txt
# D481-D483 by decision id: the commit that added each decision's file is an ancestor of the pin (whatever sha the merge gave it)
anc=1
for x in D481 D482 D483; do
  f=$(git ls-tree -r --name-only HEAD docs/decisions/ | grep "^docs/decisions/$x-" | head -n 1 || true)
  c=""
  if [ -n "$f" ]; then c=$(git log --diff-filter=A --format=%H -n 1 HEAD -- "$f" || true); fi
  if [ -z "$c" ] || ! git merge-base --is-ancestor "$c" HEAD; then anc=0; fi
  echo "J167: $x: ${f:-no decision file} added by ${c:-no commit}"
done
echo $anc > var/lab-j167-local/has-d481-d483-commits.txt
test -z "${CUBELAB_WORKER_XMX:-}" && echo 1 > var/lab-j167-local/xmx-unset.txt || echo 0 > var/lab-j167-local/xmx-unset.txt
env -u LAB_DATA_DIR node --test web/test/cubelab-atlas.test.ts web/test/cubelab-atlas-cuts.test.ts web/test/cubelab-atlas-resume.test.ts web/test/cubelab-atlas-redaction.test.ts web/test/cubelab-record.test.ts web/test/cubelab-watchdog.test.ts web/test/cubelab-deck-census.test.ts && echo 1 > var/lab-j167-local/nodetests.txt || echo 0 > var/lab-j167-local/nodetests.txt
node tools/check-redaction-selftest.mjs && echo 1 > var/lab-j167-local/redaction-self.txt || echo 0 > var/lab-j167-local/redaction-self.txt
cat > var/lab-j167-local/bin/drawsha.py <<'PY'
# J167 (J166's): the sha256 of a set of deck draws, in the order named: each folder's decks.jsonl, then its decks/*.dck by name.
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
cat > var/lab-j167-local/bin/draws.py <<'PY'
# J167: the deck draws under D482 (the engine-unplayable list), checked against J166's, from files only (no engine).
#   draws.py            one JSON object of 0/1 numbers (the pilot's `draws` metric reads it from draws.json); writes the new s04 draw's
#                       sha256s to var/lab-j167-local/draw-s04.txt (the folder, drawsha's form) and draw-s04-deck1.txt (deck 1's
#                       .dck), and prints them
#   draws.py --report   the sha256s as run (report/draws.json); writes nothing
# The redraws are the pilot's, in var/lab-j167-local/redraw/<folder> (the same folder names as the data folder's).
import glob, hashlib, json, os, sys
D = '/home/justin-a/code/lab/data/lab-j166'
L = 'var/lab-j167-local'
R = L + '/redraw'
BANDS = ['pauper', 'peasant', 'legacy', 'powered'] * 3 + ['pauper']
SP = ['s%02d-%s-%d' % (k, BANDS[k - 1], 2000 + k) for k in range(1, 14)]
VA = ['v%02d-%s-%d' % (k, BANDS[k - 1], 2200 + k) for k in range(1, 14)]
TWELVE = [x for x in SP if not x.startswith('s04-')]
# registered 2026-10-25 from the data folder as J166's pilot wrote it (325c2dd8's deck code)
REG_TWELVE = 'e27796b73073bab5e172c2225047cecfe8424ee5ceeb4d839d44484d9da07419 24'
REG_J166_S04 = 'd78468cde81712cfcbf350e53f6caaeac8aecaabf657829067c94f92b100271a 2'
REG_J166_ALL = 'e998ad3c246d7cf5a6ab92e45a133918e2a42ff63440c2dd35507cc19b08df3c 26'
REG_SMOKE = 'edfdc861736fb049bc1080d525269064c6776ecabd47de496463fa3dc684c931 2'
REG_VALIDATION = '7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de 26'
J166_S04_DECK1 = 'bec1f985f976f194e6323e993ea8d901925805da85c4786d0557bd8e7e4cb9ff'
J166_S04_DECK2 = 'f4f21079d66515481315687b3d369fd2a41d5dcac26a540b843552cee09b36d1'
J166_S04_ROW2 = 'd49125a11ae732daf7c475f2b41ad987303093009c68f5fa8074d40eb46fc2c0'
J166_S04_MAKEUP = {'k': 3, 'colours': 'WRG', 'shares': {'G': 0.3409, 'R': 0.2635, 'W': 0.3957}}
# the owner may register the new deck 1's sha256 here before posting; empty: the pilot computes it and registers it in its own log
S04_NEW_DECK1 = ''


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


def j166_s04():
    """J166's s04 deck folder, wherever it is now: moved aside by run1, or not yet."""
    a = D + '/decks/s04-powered-2004.j166-scute'
    return a if os.path.isdir(a) else D + '/decks/s04-powered-2004'


if '--report' in sys.argv[1:]:
    print(json.dumps({'note': 'J167 deck draws: D447 with D482\'s engine-unplayable list; drawsha = each folder\'s decks.jsonl, then its .dck files by name',
                      'spinesAsRun': safe(lambda: drawsha([D + '/decks/' + x for x in SP])), 'twelveUnchanged': safe(lambda: drawsha([D + '/decks/' + x for x in TWELVE])),
                      'twelveRegistered': REG_TWELVE, 's04New': safe(lambda: drawsha([D + '/decks/s04-powered-2004'])),
                      's04NewDeck1': safe(lambda: fsha(D + '/decks/s04-powered-2004/decks/powered-2004-00001.dck')),
                      's04PilotRegistered': safe(lambda: open(L + '/draw-s04.txt').read().strip()), 's04Deck1PilotRegistered': safe(lambda: open(L + '/draw-s04-deck1.txt').read().strip()),
                      'j166S04Aside': safe(lambda: drawsha([D + '/decks/s04-powered-2004.j166-scute'])), 'j166S04Registered': REG_J166_S04, 'j166SpinesRegistered': REG_J166_ALL,
                      'smoke': safe(lambda: drawsha([D + '/decks/p-powered-2099'])), 'validation': safe(lambda: drawsha([D + '/validation/' + x for x in VA])),
                      'validationRegistered': REG_VALIDATION, 'validationRedrawOnPin': safe(lambda: drawsha([R + '/' + x for x in VA]))}, indent=1))
    sys.exit(0)
out = {}
out['data12'] = 1 if safe(lambda: drawsha([D + '/decks/' + x for x in TWELVE])) == REG_TWELVE else 0
out['redraw12'] = 1 if safe(lambda: drawsha([R + '/' + x for x in TWELVE])) == REG_TWELVE else 0
out['smokeData'] = 1 if safe(lambda: drawsha([D + '/decks/p-powered-2099'])) == REG_SMOKE else 0
out['smokeRedraw'] = 1 if safe(lambda: drawsha([R + '/p-powered-2099'])) == REG_SMOKE else 0
out['j166S04'] = 1 if safe(lambda: drawsha([j166_s04()])) == REG_J166_S04 else 0
out['validationData'] = 1 if safe(lambda: drawsha([D + '/validation/' + x for x in VA])) == REG_VALIDATION else 0
out['validationRedrawSame'] = 1 if safe(lambda: drawsha([R + '/' + x for x in VA])) == REG_VALIDATION else 0   # information
N = R + '/s04-powered-2004'
for k in ('s04Deck2Same', 's04Row2Same', 's04Deck1Changed', 's04Skip', 's04NoScute', 's04Spells3', 's04Makeup', 's04Registered'):
    out[k] = 0
try:
    raw = open(N + '/decks.jsonl', 'rb').read().split(b'\n')
    rows = [json.loads(x) for x in raw if x.strip()]
    d1 = open(N + '/decks/powered-2004-00001.dck', 'rb').read()
    old1 = json.loads(open(j166_s04() + '/decks.jsonl', 'rb').read().split(b'\n')[0])
    out['s04Deck2Same'] = 1 if fsha(N + '/decks/powered-2004-00002.dck') == J166_S04_DECK2 else 0
    out['s04Row2Same'] = 1 if hashlib.sha256(raw[1]).hexdigest() == J166_S04_ROW2 else 0
    out['s04Deck1Changed'] = 1 if fsha(N + '/decks/powered-2004-00001.dck') != J166_S04_DECK1 else 0
    out['s04Skip'] = 1 if rows[0].get('engineSkips') == {'Scute Swarm': 1} and 'engineSkips' not in rows[1] else 0
    out['s04NoScute'] = 1 if all(c != 'Scute Swarm' for _, c in rows[0]['main']) and b'Scute Swarm' not in d1 else 0
    out['s04Spells3'] = 1 if rows[0]['spells'][:3] == ['Lovestruck Beast', 'Momo, Friendly Flier', 'Hexdrinker'] and rows[0]['spells'][:2] == old1['spells'][:2] else 0
    out['s04Makeup'] = 1 if rows[0]['makeup'] == J166_S04_MAKEUP == old1['makeup'] and rows[0]['lands'] == 18 else 0
    new1 = fsha(N + '/decks/powered-2004-00001.dck')
    out['s04Registered'] = 1 if not S04_NEW_DECK1 or S04_NEW_DECK1 == new1 else 0
    if sys.argv[1:] == ['--write']:
        open(L + '/draw-s04.txt', 'w').write(drawsha([N]) + '\n')
        open(L + '/draw-s04-deck1.txt', 'w').write(new1 + '\n')
        print('J167: the new s04 draw (D482), registered in var/lab-j167-local/: folder %s; deck 1 %s' % (drawsha([N]), new1), file=sys.stderr)
except (OSError, ValueError, KeyError, IndexError, TypeError) as e:
    print('J167: the s04 redraw could not be read: %r' % e, file=sys.stderr)
print(json.dumps(out))
PY
cat > var/lab-j167-local/bin/labels.py <<'PY'
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
CONTRACT = 'mtg-table rung-4a label v2 (J167)'
args, opt = [], {}
for a in sys.argv[1:]:
    if a.startswith('--'):
        k, _, v = a[2:].partition('=')
        opt[k] = v
    else:
        args.append(a)
TRAINING = opt.get('training') == '1'


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
    meta[name] = {'pool': pool, 'deckSeed': int(dseed), 'gameSeed': int(gseed), 'sha': sha, 'listing': spine_listing, 'folder': os.path.basename(spine), 'forgeMap': fm,
                  'deckA': plan['deckA'], 'deckB': plan['deckB'],
                  'baseline': {'turns': (pb.get('baseline') or {}).get('turns'), 'winner': (pb.get('baseline') or {}).get('winner'),
                               'listed': (pb.get('baseline') or {}).get('decisionsListed')},
                  'branchedInFull': sch.get('branchedInFull'), 'screened': len(sch.get('screened') or []), 'fill': sch.get('fill'),
                  'stoppedOptions': sch.get('stoppedOptions'), 'meanOptions': sch.get('meanOptions')}
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
            'v': 2, 'contract': CONTRACT, 'spine': name, 'pool': pool, 'training': TRAINING, 'split': 'train' if TRAINING else None,
            'deckA': plan['deckA'], 'deckB': plan['deckB'], 'deckSeed': int(dseed), 'spineSeed': int(gseed), 'sha': sha,
            'listing': 'D483' if ids else 'pre-D483', 'playCount': len(set(ids)) if ids else len(toks), 'tokenTwice': len(set(toks)) < len(toks),
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
                       'expectation': 'J166 s01-s03 as run: 122 labels and 22.3 confident labels per 7-worker 10-h night (4 confident labels); the atlas review, section 5: ~25-27 (cube pairs); registered as the sizing read, no verdict'}
# the void count (0 expected since D470), any non-block decision that played one game under every option
out['voidLabels'] = sum(1 for x in labels if x['void'])
out['voidList'] = ['%s d%d %s' % (x['spine'], x['d'], x['forgeToken']) for x in labels if x['void']]
out['sameGameNotBlock'] = ['%s d%d' % (x['spine'], x['d']) for x, same in same_any if same and x['kind'] != 'b' and x['complete']]
print(json.dumps(out, indent=1))
PY
cat > var/lab-j167-local/bin/reads.py <<'PY'
# J167's reads (drafts/J167-atlas-4a-night-two.md): J166's reads.py, unchanged (J162's, J156's definitions, made per spine),
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
cat > var/lab-j167-local/bin/cuts.py <<'PY'
# J167: what the cut design (D480) saved, per spine and for the night: J166's cuts.py, with two changes registered before any J167
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
    tfile = os.path.join(spine, 'atlas.j166.json')
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
cat > var/lab-j167-local/bin/metrics.py <<'PY'
# J167's metrics (drafts/J167-atlas-4a-night-two.md): J166's metrics.py over the night's 13 spine folders, with the glob a parameter
# and these additions, registered before any J167 data: D483's listings (identities, repeated plays, two plays under one token, and
# the pre-D483 listings' decisions that name a token twice -- the decisions whose k D483 lowers), the re-check of s02 and s03, J166's
# s04 set aside, s04's new deck, and any spine deck holding Scute Swarm. Standard library only; no engine.
#   metrics.py [DATA_DIR] [SPINE_GLOB]   default /home/justin-a/code/lab/data/lab-j166 and b-s??-*-21?? (never the .j166-scute or
#                                        pilot folders); the pilot's self-tests pass J162's folder with b-* and J166's with b-s0[123]-*-210?
import glob, hashlib, json, math, os, re, sys
D = sys.argv[1] if len(sys.argv) > 1 else '/home/justin-a/code/lab/data/lab-j166'
G = sys.argv[2] if len(sys.argv) > 2 else 'b-s??-*-21??'
L = 'var/lab-j167-local'
# name: (band, deck seed, game seed, branchForge) -- the registered spine table (J166's)
SPINES = {'s01': ('pauper', 2001, 2101, 40), 's02': ('peasant', 2002, 2102, 0), 's03': ('legacy', 2003, 2103, 0), 's04': ('powered', 2004, 2104, 0),
          's05': ('pauper', 2005, 2105, 0), 's06': ('peasant', 2006, 2106, 0), 's07': ('legacy', 2007, 2107, 40), 's08': ('powered', 2008, 2108, 0),
          's09': ('pauper', 2009, 2109, 0), 's10': ('peasant', 2010, 2110, 0), 's11': ('legacy', 2011, 2111, 0), 's12': ('powered', 2012, 2112, 0),
          's13': ('pauper', 2013, 2113, 40)}
D483_SPINES = {'s%02d' % k for k in range(4, 14)}   # branched at the pin; s01-s03 at 325c2dd8, over pre-D483 listings
RECHECKED = ('b-s02-peasant-2102', 'b-s03-legacy-2103')
VALIDATION_SHA = '7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de'
J166_S04_SHA = 'd78468cde81712cfcbf350e53f6caaeac8aecaabf657829067c94f92b100271a 2'
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
    e = {'errored': 0, 'unavailable': 0, 'restarted': 0, 'capped': 0, 'effectSourceNull': 0, 'exileLinksLost': 0, 'errorsByKind': {}}
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
    sp.update({'rows': n, 'timeouts': t, **e})
    out['branchRows'] += n
    out['branchTimeouts'] += t
    out['branchErrored'] += e['errored']
    out['branchUnavailable'] += e['unavailable']
    out['branchRestarted'] += e['restarted']
    out['branchCapped'] += e['capped']
    out['effectSourceNullBranches'] += e['effectSourceNull']
    out['exileLinksLostBranches'] += e['exileLinksLost']
if out['branchRows']:
    out['timeoutShare'] = round(out['branchTimeouts'] / out['branchRows'], 5)
# s04: its plan names the pilot's D482 deck 1 (registered in var/lab-j167-local/draw-s04-deck1.txt), which holds no Scute Swarm
try:
    want1 = open(L + '/draw-s04-deck1.txt').read().split()[0]
    p1 = json.load(open(D + '/b-s04-powered-2104/plan.json'))['deckA']
    out['s04NewDeck'] = 1 if hashlib.sha256(open(p1, 'rb').read()).hexdigest() == want1 and not scute(p1) else 0
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
                'confidentPer7Worker10hNight': lb['c_sizing7']['asRun']['confidentPer7Worker10hNight']})
    # each spine's rows carry its band's pool, its registered seeds and its listing
    out['poolOk'] = sum(1 for n, m in lb['bySpine'].items() if n in SPINES and m['pool'] == 'random-' + SPINES[n][0]
                        and m['deckSeed'] == SPINES[n][1] and m['gameSeed'] == SPINES[n][2] and m['forgeMap'] == (SPINES[n][3] > 0)
                        and m['listing'] == ('D483' if n in D483_SPINES else 'pre-D483'))
except (OSError, ValueError, KeyError, TypeError):
    pass
print(json.dumps(out))
PY
cat > var/lab-j167-local/bin/pilot.py <<'PY'
# J167 pilot: the smoke (J166's powered pair, deck seed 2099, game seed 2199, every cut on, a new folder) and the atlas-selftest's G5, G6
# and cuts legs, as one JSON object. J166's pilot.py, with the smoke's D483 listing read (an identity beside every token, no play twice).
# Standard library only; no engine. Run from the clone (the self-test's folder is var/cubelab/atlas-selftest).
import json, math, os
S = '/home/justin-a/code/lab/data/lab-j166/pilot-smoke-j167'
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
    lb = json.load(open('var/lab-j167-local/pilot-labels.json'))
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
# the readers' self-tests on J162's and J158's files (read, never written): each must give the registered numbers
L2=/home/justin-a/code/lab/data/lab-j162
L8=/home/justin-a/code/lab/data/lab-j158
python3 -I var/lab-j167-local/bin/labels.py pauper5:confirm-j162:0:464:f6dba5e4:$L2/b-pauper5-464 synergy9:confirm-j162:0:465:f6dba5e4:$L2/b-synergy9-465 modern7:confirm-j162:0:466:f6dba5e4:$L2/b-modern7-466 ff5:confirm-j162:0:462:f6dba5e4:$L2/b-ff5-462 --out=var/lab-j167-local/labels-j162.jsonl --times=$L2/spine-times.txt > var/lab-j167-local/labels-j162.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j167-local/labels-j162.json')); a = d['a_confidentShare']; print(1 if (d['labels'], d['confident'], d['confidentForge'], d['rowsUnmatched'], d['voidLabels'], d['trainingRows'], a['point'], a['interval'], d['c_sizing7']['asRun']['labelsPer7Worker10hNight']) == (59, 7, 5, 0, 0, 0, 0.1186, [0.0339, 0.2203], 91) else 0)" > var/lab-j167-local/labels-self.txt 2>/dev/null || echo 0 > var/lab-j167-local/labels-self.txt
python3 -I var/lab-j167-local/bin/labels.py ff5:confirm-j158:0:461:-:$L8/b-ff5-461 peasant7:confirm-j158:0:463:-:$L8/b-peasant7-463 --times=$L8/spine-times.txt > var/lab-j167-local/labels-j158.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j167-local/labels-j158.json')); print(1 if (d['labels'], d['confident'], d['voidLabels'], d['voidList'], d['sameGameNotBlock']) == (32, 6, 3, ['ff5 d10 block:35>78', 'ff5 d14 block:21>71', 'ff5 d30 block:25>80,40>81'], []) else 0)" > var/lab-j167-local/void-self.txt 2>/dev/null || echo 0 > var/lab-j167-local/void-self.txt
python3 -I var/lab-j167-local/bin/reads.py pauper5:pauper5:$L2/b-pauper5-464/atlas.json synergy9:synergy9:$L2/b-synergy9-465/atlas.json modern7:modern7:$L2/b-modern7-466/atlas.json ff5:ff5:$L2/b-ff5-462/atlas.json > var/lab-j167-local/reads-j162.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j167-local/reads-j162.json')); iv = {n: (v['C1_castNow']['random']['point'], v['C1_castNow']['random']['interval'], v['C1_castNow']['verdict']) for n, v in d['iv_bySpine'].items()}; ok = iv == {'pauper5': (0.0411, [0.0126, 0.069], 'HOLDS'), 'synergy9': (0.0002, [-0.0133, 0.0136], 'NOT SHOWN'), 'modern7': (0.063, [0.017, 0.1231], 'HOLDS'), 'ff5': (0.0523, [-0.0047, 0.1313], 'NOT SHOWN')} and (d['i_sameBest']['point'], d['i_sameBest']['interval'], d['ii_rho']['point'], d['ii_rho']['interval']) == (0.5088, [0.322, 0.7], 0.2181, [-0.1188, 0.5799]); print(1 if ok else 0)" > var/lab-j167-local/reads-self.txt 2>/dev/null || echo 0 > var/lab-j167-local/reads-self.txt
python3 -I var/lab-j167-local/bin/cuts.py $L2/b-pauper5-464 $L2/b-synergy9-465 $L2/b-modern7-466 $L2/b-ff5-462 --times=$L2/spine-times.txt > var/lab-j167-local/cuts-j162.json || true
python3 -I -c "import json; n = json.load(open('var/lab-j167-local/cuts-j162.json'))['night']; print(1 if (n['spines'], n['branchGames'], n['savedShare'], n['checksSecPerKGames']) == (4, 55680, 0.0, 92.3) else 0)" > var/lab-j167-local/cuts-self.txt 2>/dev/null || echo 0 > var/lab-j167-local/cuts-self.txt
python3 -I var/lab-j167-local/bin/metrics.py $L2 'b-*' > var/lab-j167-local/metrics-j162.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j167-local/metrics-j162.json')); print(1 if (d['atlases'], d['problems'], d['branchRows'], d['errorsByKind'].get('play not rebuilt on the copy (D472, D476)'), d['xDrawn'], d['planOk']) == (4, 10, 55680, 2400, 32626, 0) else 0)" > var/lab-j167-local/metrics-self.txt 2>/dev/null || echo 0 > var/lab-j167-local/metrics-self.txt
# ... and on J166's own s01-s03 (the morning read's numbers, 2026-10-25): the same before run1's re-check and after it
L6=/home/justin-a/code/lab/data/lab-j166
python3 -I var/lab-j167-local/bin/labels.py s01:random-pauper:2001:2101:325c2dd8:$L6/b-s01-pauper-2101 s02:random-peasant:2002:2102:325c2dd8:$L6/b-s02-peasant-2102 s03:random-legacy:2003:2103:325c2dd8:$L6/b-s03-legacy-2103 --times=$L6/spine-times.txt --training=1 > var/lab-j167-local/labels-j166.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j167-local/labels-j166.json')); a = d['a_confidentShare']; z = d['c_sizing7']['asRun']; print(1 if (d['labels'], d['confident'], d['confidentForge'], d['rowsUnmatched'], d['voidLabels'], d['trainingRows'], d['branched'], a['point'], a['interval'], z['labelsPer7Worker10hNight'], z['confidentPer7Worker10hNight'], d['byListing']['pre-D483']['labels']) == (22, 4, 1, 0, 0, 22, 22, 0.1818, [0.0417, 0.3636], 122, 22.3, 22) else 0)" > var/lab-j167-local/labels-j166-self.txt 2>/dev/null || echo 0 > var/lab-j167-local/labels-j166-self.txt
python3 -I var/lab-j167-local/bin/reads.py s01:random-pauper:$L6/b-s01-pauper-2101/atlas.json s02:random-peasant:$L6/b-s02-peasant-2102/atlas.json s03:random-legacy:$L6/b-s03-legacy-2103/atlas.json > var/lab-j167-local/reads-j166.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j167-local/reads-j166.json')); c = d['iv_bySpine']['s01']['C1_castNow']; print(1 if d['forgeSpines'] == ['s01'] and (c['random']['point'], c['random']['interval'], c['verdict'], d['i_sameBest']['point'], d['i_sameBest']['interval'], d['ii_rho']['point'], d['ii_rho']['interval']) == (0.0409, [0.0087, 0.0752], 'HOLDS', 0.5, [0.125, 0.875], 0.1933, [-0.4667, 0.82]) else 0)" > var/lab-j167-local/reads-j166-self.txt 2>/dev/null || echo 0 > var/lab-j167-local/reads-j166-self.txt
python3 -I var/lab-j167-local/bin/cuts.py $L6/b-s01-pauper-2101 $L6/b-s02-peasant-2102 $L6/b-s03-legacy-2103 --times=$L6/spine-times.txt > var/lab-j167-local/cuts-j166.json || true
python3 -I -c "import json; n = json.load(open('var/lab-j167-local/cuts-j166.json'))['night']; print(1 if (n['spines'], n['branchGames'], n['savedShare'], n['checksSecPerKGames'], n['idleShare']) == (3, 14280, 0.0769, 38.0, 0.089) else 0)" > var/lab-j167-local/cuts-j166-self.txt 2>/dev/null || echo 0 > var/lab-j167-local/cuts-j166-self.txt
python3 -I var/lab-j167-local/bin/metrics.py $L6 'b-s0[123]-*-210?' > var/lab-j167-local/metrics-j166.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j167-local/metrics-j166.json')); print(1 if (d['atlases'], d['spinesDone'], d['branchRows'], d['pre483Spines'], d['identityDecisions'], d['kChanged'], d['kChangedBranched'], d['planOk']) == (3, 3, 14280, 3, 0, 10, 8, 3) else 0)" > var/lab-j167-local/metrics-j166-self.txt 2>/dev/null || echo 0 > var/lab-j167-local/metrics-j166-self.txt
export CUBELAB_HOME_ROOT=var/cubelab/homes-J167
export LAB_DATA_DIR=/home/justin-a/code/lab/data
# the deck draws on the pin (D447 with D482's list; no engine), all into the clone (absolute paths, so nothing is re-rooted and
# nothing on the data folder is written): the 13 spine pairs, the smoke's pair, and the 13 validation pairs (information)
K=0
for B in pauper peasant legacy powered pauper peasant legacy powered pauper peasant legacy powered pauper; do
  K=$((K + 1)); N=$(printf '%02d' $K)
  tools/cubelab.sh decks --band $B --count 2 --seed $((2000 + K)) --cross-band 0.10 --out "$PWD/var/lab-j167-local/redraw/s$N-$B-$((2000 + K))"
  tools/cubelab.sh decks --band $B --count 2 --seed $((2200 + K)) --cross-band 0.10 --out "$PWD/var/lab-j167-local/redraw/v$N-$B-$((2200 + K))"
done
tools/cubelab.sh decks --band powered --count 2 --seed 2099 --cross-band 0.10 --out "$PWD/var/lab-j167-local/redraw/p-powered-2099"
# the checks, and the new s04 draw's sha256s printed here and registered in var/lab-j167-local/draw-s04.txt and draw-s04-deck1.txt
python3 -I var/lab-j167-local/bin/draws.py --write > var/lab-j167-local/draws.json || echo '{"data12":-1}' > var/lab-j167-local/draws.json
cat var/lab-j167-local/draws.json
echo "J167: the new s04 draw (folder): $(cat var/lab-j167-local/draw-s04.txt 2>/dev/null || echo none)"
echo "J167: the new s04 deck 1 (.dck): $(cat var/lab-j167-local/draw-s04-deck1.txt 2>/dev/null || echo none)"
# the engine self-tests: atlas-selftest with its G5, G6, cuts and D483 legs, then seat-identity
tools/cubelab.sh atlas-selftest --jobs 2 && echo 1 > var/lab-j167-local/selftest.txt || echo 0 > var/lab-j167-local/selftest.txt
tools/cubelab.sh seat-identity --jobs {workers} && echo 1 > var/lab-j167-local/identity.txt || echo 0 > var/lab-j167-local/identity.txt
# the readers on the self-test's own cuts legs
C=var/cubelab/atlas-selftest
python3 -I var/lab-j167-local/bin/labels.py cuts:selftest:0:464:selftest:$C/cuts nf:selftest:0:464:selftest:$C/cuts-noforge --out=var/lab-j167-local/labels-cuts.jsonl --training=1 > var/lab-j167-local/labels-cuts.json || true
python3 -I var/lab-j167-local/bin/reads.py cuts:selftest:$C/cuts/atlas.json nf:selftest:$C/cuts-noforge/atlas.json > var/lab-j167-local/reads-cuts.json || true
python3 -I var/lab-j167-local/bin/cuts.py $C/cuts $C/cuts-noforge > var/lab-j167-local/cuts-cuts.json || true
python3 -I -c "import json; l = json.load(open('var/lab-j167-local/labels-cuts.json')); r = json.load(open('var/lab-j167-local/reads-cuts.json')); c = json.load(open('var/lab-j167-local/cuts-cuts.json')); s = [json.load(open('var/cubelab/atlas-selftest/%s/atlas.json' % x))['phaseB']['schedule']['labels'] for x in ('cuts', 'cuts-noforge')]; ok = l['rowsUnmatched'] == 0 and l['labels'] == sum(s) and l['trainingRows'] == l['branched'] and l['branched'] >= 2 and r['forgeSpines'] == ['cuts'] and list(r['iv_bySpine']) == ['cuts'] and c['night']['spines'] == 2 and l['byListing']['D483']['rows'] == l['branched']; print(1 if ok else 0)" > var/lab-j167-local/readers-cuts.txt 2>/dev/null || echo 0 > var/lab-j167-local/readers-cuts.txt
# the smoke: J166's powered pair (unchanged by D482: checked above) at game seed 2199, a new folder, every cut on at that scale
P=/home/justin-a/code/lab/data/lab-j166/decks/p-powered-2099/decks
tools/cubelab.sh atlas --deck-a $P/powered-2099-00001.dck --deck-b $P/powered-2099-00002.dck --seed 2199 --phase b --decisions 2 --min-options 3 --screen 5 --early-stop 10,15,20 --branch-random 25 --branch-forge 5 --chunk 5 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/pilot-smoke-j167 || true
python3 -I var/lab-j167-local/bin/labels.py smoke:random-powered:2099:2199:$(cat var/lab-j167-local/sha.txt):/home/justin-a/code/lab/data/lab-j166/pilot-smoke-j167 --out=var/lab-j167-local/pilot-labels.jsonl --training=1 > var/lab-j167-local/pilot-labels.json || true
python3 -I var/lab-j167-local/bin/reads.py smoke:random-powered:/home/justin-a/code/lab/data/lab-j166/pilot-smoke-j167/atlas.json > var/lab-j167-local/pilot-reads.json || true
python3 -I var/lab-j167-local/bin/cuts.py /home/justin-a/code/lab/data/lab-j166/pilot-smoke-j167 > var/lab-j167-local/pilot-cuts.json || true
python3 -I -c "import json; r = json.load(open('var/lab-j167-local/pilot-reads.json')); c = json.load(open('var/lab-j167-local/pilot-cuts.json')); print(1 if r['forgeSpines'] == ['smoke'] and 'smoke' in r['iv_bySpine'] and c['night']['spines'] == 1 and c['night']['branchGames'] >= 1 else 0)" > var/lab-j167-local/pilot-readers.txt 2>/dev/null || echo 0 > var/lab-j167-local/pilot-readers.txt
```
metrics: datadir = sh: cat var/lab-j167-local/datadir.txt 2>/dev/null || echo 0
metrics: state = sh: cat var/lab-j167-local/state.txt 2>/dev/null || echo 0
metrics: merged = sh: cat var/lab-j167-local/merged.txt 2>/dev/null || echo 0
metrics: has_d466_d472 = sh: cat var/lab-j167-local/has-d466-d472.txt 2>/dev/null || echo 0
metrics: has_d476 = sh: cat var/lab-j167-local/has-d476.txt 2>/dev/null || echo 0
metrics: has_d477 = sh: cat var/lab-j167-local/has-d477.txt 2>/dev/null || echo 0
metrics: has_d478 = sh: cat var/lab-j167-local/has-d478.txt 2>/dev/null || echo 0
metrics: has_d479 = sh: cat var/lab-j167-local/has-d479.txt 2>/dev/null || echo 0
metrics: has_d480 = sh: cat var/lab-j167-local/has-d480.txt 2>/dev/null || echo 0
metrics: has_d480f = sh: cat var/lab-j167-local/has-d480f.txt 2>/dev/null || echo 0
metrics: has_d481 = sh: cat var/lab-j167-local/has-d481.txt 2>/dev/null || echo 0
metrics: has_d482 = sh: cat var/lab-j167-local/has-d482.txt 2>/dev/null || echo 0
metrics: has_d483 = sh: cat var/lab-j167-local/has-d483.txt 2>/dev/null || echo 0
metrics: d481_d483_commits = sh: cat var/lab-j167-local/has-d481-d483-commits.txt 2>/dev/null || echo 0
metrics: xmx_unset = sh: cat var/lab-j167-local/xmx-unset.txt 2>/dev/null || echo 0
metrics: nodetests = sh: cat var/lab-j167-local/nodetests.txt 2>/dev/null || echo 0
metrics: redaction_self = sh: cat var/lab-j167-local/redaction-self.txt 2>/dev/null || echo 0
metrics: labels_self = sh: cat var/lab-j167-local/labels-self.txt 2>/dev/null || echo 0
metrics: void_self = sh: cat var/lab-j167-local/void-self.txt 2>/dev/null || echo 0
metrics: reads_self = sh: cat var/lab-j167-local/reads-self.txt 2>/dev/null || echo 0
metrics: cuts_self = sh: cat var/lab-j167-local/cuts-self.txt 2>/dev/null || echo 0
metrics: metrics_self = sh: cat var/lab-j167-local/metrics-self.txt 2>/dev/null || echo 0
metrics: labels_j166_self = sh: cat var/lab-j167-local/labels-j166-self.txt 2>/dev/null || echo 0
metrics: reads_j166_self = sh: cat var/lab-j167-local/reads-j166-self.txt 2>/dev/null || echo 0
metrics: cuts_j166_self = sh: cat var/lab-j167-local/cuts-j166-self.txt 2>/dev/null || echo 0
metrics: metrics_j166_self = sh: cat var/lab-j167-local/metrics-j166-self.txt 2>/dev/null || echo 0
metrics: draws = sh: cat var/lab-j167-local/draws.json 2>/dev/null || echo '{"data12":-1}'
metrics: selftest = sh: cat var/lab-j167-local/selftest.txt 2>/dev/null || echo 0
metrics: identity = sh: cat var/lab-j167-local/identity.txt 2>/dev/null || echo 0
metrics: readers_cuts = sh: cat var/lab-j167-local/readers-cuts.txt 2>/dev/null || echo 0
metrics: pilot_readers = sh: cat var/lab-j167-local/pilot-readers.txt 2>/dev/null || echo 0
metrics: pilot = sh: python3 -I var/lab-j167-local/bin/pilot.py 2>/dev/null || echo '{"smoke":{"problems":-1}}'
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
check: d481_d483_commits == 1
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
check: metrics_j166_self == 1
check: draws.data12 == 1
check: draws.redraw12 == 1
check: draws.smokeData == 1
check: draws.smokeRedraw == 1
check: draws.j166S04 == 1
check: draws.validationData == 1
check: draws.s04Deck2Same == 1
check: draws.s04Row2Same == 1
check: draws.s04Deck1Changed == 1
check: draws.s04Skip == 1
check: draws.s04NoScute == 1
check: draws.s04Spells3 == 1
check: draws.s04Makeup == 1
check: draws.s04Registered == 1
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
run1 sets J166's s04 aside and re-checks s02 and s03; run2 draws s04's D482 deck onto the data folder and plays s04
fresh; run3-run11 play s05-s13 in the table's order, one block a spine, exactly as J166's blocks; the last block is
the Report. Every atlas command resumes what is done. An atlas that finds a problem exits 3 and the job goes on to
the next spine (the exit is kept in `exits.txt`, a re-check's in `recheck-exits.txt`); each spine block appends its
wall to `spine-times.txt`. Each block asserts the data folder, its 50 GB and its two deck files before it plays.
**Expected wall: run1 ~7 min; ~42 min a spine at 6 workers (s07, s13 ~48)**; the 3-h block timeout is ~4x that.
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J167: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J167: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J167
D=/home/justin-a/code/lab/data/lab-j166
# J166's s04 (Scute Swarm in deck 1; killed by the runner at 3 h; no atlas.json), set aside once and never deleted: the spine folder
# only if it is J166's (no atlas.json, a schedule written before D480's plan header), the deck folder only if it is J166's draw
S4=$D/b-s04-powered-2104
K4=$D/decks/s04-powered-2004
if [ ! -e $S4.j166-scute ] && [ -d $S4 ]; then
  python3 -I -c "import json, os, sys; d = sys.argv[1]; h = json.loads(open(d + '/phaseB/schedule.jsonl').readline()); sys.exit(0 if not os.path.exists(d + '/atlas.json') and h.get('type') != 'plan' else 'J167: ' + d + ' is not J166s s04 (an atlas.json, or a D480 plan header): not moved')" $S4
  mv $S4 $S4.j166-scute
  echo "J167: J166's s04 spine set aside: $S4.j166-scute"
fi
if [ ! -e $K4.j166-scute ]; then
  test "$(python3 -I var/lab-j167-local/bin/drawsha.py $K4)" = "d78468cde81712cfcbf350e53f6caaeac8aecaabf657829067c94f92b100271a 2" || { echo "J167: $K4 is not J166's s04 draw: not moved" >&2; exit 1; }
  mv $K4 $K4.j166-scute
  echo "J167: J166's s04 decks set aside: $K4.j166-scute"
fi
# s02 and s03: J166's finished atlases resumed at the pin -- every unit is done, so nothing plays and only the checks run again
# (D481's checker); J166's atlas.json and atlas.md kept as .j166 copies first; rows and units counted before and after
for x in s02:peasant:2002:2102 s03:legacy:2003:2103; do
  IFS=: read -r s b ds g <<< "$x"
  n=b-$s-$b-$g; K=$D/decks/$s-$b-$ds/decks; A=$K/$b-$ds-00001.dck; Bk=$K/$b-$ds-00002.dck
  test -s $D/$n/atlas.json && test -s $A && test -s $Bk || { echo "J167: $n: J166's atlas.json or its decks are missing" >&2; exit 1; }
  test -f $D/$n/atlas.j166.json || cp $D/$n/atlas.json $D/$n/atlas.j166.json
  test -f $D/$n/atlas.j166.md || cp $D/$n/atlas.md $D/$n/atlas.j166.md
  r0=$(wc -l < $D/$n/phaseB/branches.jsonl); u0=$(wc -l < $D/$n/phaseB/units.jsonl)
  t0=$(date +%s)
  rc=0; timeout 30m tools/cubelab.sh atlas --deck-a $A --deck-b $Bk --seed $g --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/$n || rc=$?
  echo "$n $rc" >> $D/recheck-exits.txt
  echo "$n $t0 $(date +%s) {workers}" >> $D/recheck-times.txt
  echo "$n $r0 $(wc -l < $D/$n/phaseB/branches.jsonl) $u0 $(wc -l < $D/$n/phaseB/units.jsonl)" >> $D/recheck-rows.txt
done
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J167: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J167: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J167
D=/home/justin-a/code/lab/data/lab-j166
n=b-s04-powered-2104; K0=$D/decks/s04-powered-2004; K=$K0/decks; A=$K/powered-2004-00001.dck; B=$K/powered-2004-00002.dck
test -d $D/$n.j166-scute && test -d $K0.j166-scute || { echo "J167: J166's s04 is not set aside (run1 does it)" >&2; exit 1; }
# s04's decks, drawn again with D482's list onto the data folder; byte for byte the pilot's redraw (its registered sha256)
test -s $K0/decks.jsonl || tools/cubelab.sh decks --band powered --count 2 --seed 2004 --cross-band 0.10 --out var/lab-j166/decks/s04-powered-2004
test "$(python3 -I var/lab-j167-local/bin/drawsha.py $K0)" = "$(cat var/lab-j167-local/draw-s04.txt)" || { echo "J167: $K0 is not the pilot's D482 draw" >&2; exit 1; }
test -s $A && test -s $B || { echo "J167: $n: no decks under $K" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2104 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J167: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J167: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J167
D=/home/justin-a/code/lab/data/lab-j166
n=b-s05-pauper-2105; K=$D/decks/s05-pauper-2005/decks; A=$K/pauper-2005-00001.dck; B=$K/pauper-2005-00002.dck
test -s $A && test -s $B || { echo "J167: $n: no decks under $K (J166's pilot drew them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2105 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J167: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J167: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J167
D=/home/justin-a/code/lab/data/lab-j166
n=b-s06-peasant-2106; K=$D/decks/s06-peasant-2006/decks; A=$K/peasant-2006-00001.dck; B=$K/peasant-2006-00002.dck
test -s $A && test -s $B || { echo "J167: $n: no decks under $K (J166's pilot drew them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2106 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J167: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J167: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J167
D=/home/justin-a/code/lab/data/lab-j166
n=b-s07-legacy-2107; K=$D/decks/s07-legacy-2007/decks; A=$K/legacy-2007-00001.dck; B=$K/legacy-2007-00002.dck
test -s $A && test -s $B || { echo "J167: $n: no decks under $K (J166's pilot drew them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2107 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 40 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J167: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J167: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J167
D=/home/justin-a/code/lab/data/lab-j166
n=b-s08-powered-2108; K=$D/decks/s08-powered-2008/decks; A=$K/powered-2008-00001.dck; B=$K/powered-2008-00002.dck
test -s $A && test -s $B || { echo "J167: $n: no decks under $K (J166's pilot drew them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2108 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J167: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J167: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J167
D=/home/justin-a/code/lab/data/lab-j166
n=b-s09-pauper-2109; K=$D/decks/s09-pauper-2009/decks; A=$K/pauper-2009-00001.dck; B=$K/pauper-2009-00002.dck
test -s $A && test -s $B || { echo "J167: $n: no decks under $K (J166's pilot drew them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2109 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J167: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J167: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J167
D=/home/justin-a/code/lab/data/lab-j166
n=b-s10-peasant-2110; K=$D/decks/s10-peasant-2010/decks; A=$K/peasant-2010-00001.dck; B=$K/peasant-2010-00002.dck
test -s $A && test -s $B || { echo "J167: $n: no decks under $K (J166's pilot drew them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2110 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J167: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J167: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J167
D=/home/justin-a/code/lab/data/lab-j166
n=b-s11-legacy-2111; K=$D/decks/s11-legacy-2011/decks; A=$K/legacy-2011-00001.dck; B=$K/legacy-2011-00002.dck
test -s $A && test -s $B || { echo "J167: $n: no decks under $K (J166's pilot drew them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2111 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J167: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J167: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J167
D=/home/justin-a/code/lab/data/lab-j166
n=b-s12-powered-2112; K=$D/decks/s12-powered-2012/decks; A=$K/powered-2012-00001.dck; B=$K/powered-2012-00002.dck
test -s $A && test -s $B || { echo "J167: $n: no decks under $K (J166's pilot drew them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2112 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J167: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J167: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J167
D=/home/justin-a/code/lab/data/lab-j166
n=b-s13-pauper-2113; K=$D/decks/s13-pauper-2013/decks; A=$K/pauper-2013-00001.dck; B=$K/pauper-2013-00002.dck
test -s $A && test -s $B || { echo "J167: $n: no decks under $K (J166's pilot drew them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2113 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 40 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j166/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
cores: 1
```bash
D=/home/justin-a/code/lab/data/lab-j166
mkdir -p $D/report
: > $D/report/missing.txt
args=""; largs=""; largs10=""; dirs=""
# the night's 13 spines: b-s??-*-21?? matches no .j166-scute and no pilot folder
for d in $D/b-s??-*-21??; do
  n=$(basename "$d"); s=$(echo "$n" | cut -d- -f2); b=$(echo "$n" | cut -d- -f3); g=$(echo "$n" | cut -d- -f4)
  # each spine's branches' own commit: s01-s03 J166's (325c2dd8), s04-s13 this pin
  case $s in s01|s02|s03) sh=325c2dd8 ;; *) sh=$(cat var/lab-j167-local/sha.txt) ;; esac
  if [ -f "$d/atlas.json" ]; then
    cp "$d/atlas.json" "$D/report/$n.atlas.json"
    cp "$d/atlas.md" "$D/report/$n.atlas.md" || echo "$n: no atlas.md" >> $D/report/missing.txt
    args="$args $s:random-$b:$d/atlas.json"; largs="$largs $s:random-$b:$((g - 100)):$g:$sh:$d"; dirs="$dirs $d"
    case $s in s01|s02|s03) ;; *) largs10="$largs10 $s:random-$b:$((g - 100)):$g:$sh:$d" ;; esac
  else
    echo "$n: no atlas.json" >> $D/report/missing.txt
  fi
done
python3 -I var/lab-j167-local/bin/labels.py $largs --out=$D/report/labels.jsonl --times=$D/spine-times.txt --training=1 > $D/report/labels.json || echo "labels.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j167-local/bin/labels.py $largs10 --times=$D/spine-times.txt --training=1 > $D/report/labels-d483.json || echo "labels.py (the D483 spines) exited $?" >> $D/report/missing.txt
head -n 20 $D/report/labels.jsonl > $D/report/labels-head.jsonl || echo "labels.jsonl: none" >> $D/report/missing.txt
python3 -I var/lab-j167-local/bin/reads.py $args > $D/report/reads.json || echo "reads.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j167-local/bin/cuts.py $dirs --times=$D/spine-times.txt --recheck-times=$D/recheck-times.txt > $D/report/cuts.json || echo "cuts.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j167-local/bin/metrics.py > $D/report/tool.json || echo "metrics.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j167-local/bin/draws.py --report > $D/report/draws.json || echo "draws.py exited $?" >> $D/report/missing.txt
# the validation draw (J166's, untouched), recorded for the job that will branch it: decks, bands, seeds, the reserved game seeds, the sha256
python3 -I -c "import glob, json, os; D = '$D'; vs = sorted(glob.glob(D + '/validation/v*')); rows = [{'set': os.path.basename(v).split('-')[0], 'band': os.path.basename(v).split('-')[1], 'pool': 'random-' + os.path.basename(v).split('-')[1], 'deckSeed': int(os.path.basename(v).split('-')[2]), 'reservedGameSeed': int(os.path.basename(v).split('-')[2]) + 100, 'decks': sorted(glob.glob(v + '/decks/*.dck')), 'split': 'validation', 'training': False} for v in vs]; print(json.dumps({'note': 'the 4a validation draw (J166): drawn as the spines were (D447, --cross-band 0.10, before D482), written as deck files only, never branched; no job may train on these decks or use these seeds before the validation job that branches them', 'drawSha256': '7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de', 'sets': rows}, indent=1))" > $D/report/validation.json || echo "validation.json: failed" >> $D/report/missing.txt
python3 -I -c "import glob, json, os; D = '$D'; out = {}; [out.__setitem__(os.path.basename(d), {k: json.load(open(d + '/plan.json')).get(k) for k in ('deckA', 'deckB', 'seed', 'branchRandom', 'branchForge', 'decisions', 'chunk', 'cuts')}) for d in sorted(glob.glob(D + '/b-s??-*-21??'))]; print(json.dumps({'note': 's01-s03 branched by J166 at 325c2dd8 (s02, s03 re-checked by J167); s04-s13 by J167 at the pin; s04 on the D482 draw', 'spines': out}, indent=1))" > $D/report/spines.json || echo "spines.json: failed" >> $D/report/missing.txt
for f in exits.txt spine-times.txt recheck-exits.txt recheck-times.txt recheck-rows.txt; do cp $D/$f $D/report/$f || echo "$f: none" >> $D/report/missing.txt; done
# disarm the abort gate: a re-post of this file starts disarmed until its own pilot
rm -f var/lab-j167-local/armed.txt
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
check: atlas.recheckOk == 2
check: atlas.asideOk == 1
check: atlas.s04NewDeck == 1
check: atlas.scuteDecks == 0
check: atlas.d483Spines == 10
check: atlas.pre483Spines == 3
check: atlas.identityListingsShort == 0
check: atlas.repeatedPlays == 0

## Abort if
abort: armed == 1 and unit_errors > 20
abort: armed == 1 and engine_errors > 500
abort: data_free_gb < 50
`armed` is 1 only from this job's pilot to its Report block, so the first two cannot read another run's files. The
counts read `b-s??-*-21??` only, so J166's s04 (3 unfinished units, 135 engine errors) stops counting once run1 has
set it aside: until then it adds 3 and 135, under both bars. `unit_errors == 0` means every unit of the 13 spines
finished; **`atlas.unitsShort`** is every unit each spine's schedule planned, against the distinct ok unit ids, and
**`atlas.fullShort`** the spines that branched fewer than min(8, listed - screened) in full (s02 branched 6 of its 6).
`engine_errors` counts branch rows with `engineError`; the 500 abort stops a night whose engine has come apart, while
the checks bound the rest (all timeouts under 1% of branch games; engine errors other than step-clock timeouts at 50).
`atlas.problems == 0` over the 13 now includes s02 and s03 **after** their re-check: a D481 that does not cover one of
their failures fails it, with the failing logs named in their `atlas.json`. **A random library deck can meet a card no
atlas has played**: a new tool gap fails this check, its spine's exit 3 is kept while the others play on, and the
summary names it with its error text and cost; a spine that stalls as s04 did fails the job at its block's 3-h
timeout (a runner retry resumes it). An option capped past 0.25 is a warning, reported, never a failed check.

## Report
collect: /home/justin-a/code/lab/data/lab-j166/report/*.atlas.md
collect: /home/justin-a/code/lab/data/lab-j166/report/*.atlas.json
collect: /home/justin-a/code/lab/data/lab-j166/report/labels.json
collect: /home/justin-a/code/lab/data/lab-j166/report/labels-d483.json
collect: /home/justin-a/code/lab/data/lab-j166/report/labels-head.jsonl
collect: /home/justin-a/code/lab/data/lab-j166/report/reads.json
collect: /home/justin-a/code/lab/data/lab-j166/report/cuts.json
collect: /home/justin-a/code/lab/data/lab-j166/report/tool.json
collect: /home/justin-a/code/lab/data/lab-j166/report/draws.json
collect: /home/justin-a/code/lab/data/lab-j166/report/validation.json
collect: /home/justin-a/code/lab/data/lab-j166/report/spines.json
collect: /home/justin-a/code/lab/data/lab-j166/report/exits.txt
collect: /home/justin-a/code/lab/data/lab-j166/report/spine-times.txt
collect: /home/justin-a/code/lab/data/lab-j166/report/recheck-exits.txt
collect: /home/justin-a/code/lab/data/lab-j166/report/recheck-times.txt
collect: /home/justin-a/code/lab/data/lab-j166/report/recheck-rows.txt
collect: /home/justin-a/code/lab/data/lab-j166/report/missing.txt
The summary says, for Justin, in plain words and numbers only:
- **The population, first line:** random library decks by band, drawn as the census draws them, on the cut design;
  `training: true`, `pool: random-<band>`; s01-s03 branched by J166 at 325c2dd8 over pre-D483 listings, s04-s13 by
  J167 at the pin; never pooled with any earlier atlas.
- **The re-check:** s02 and s03, exit and problems after D481, that nothing was replayed (rows and units unmoved),
  and how long each took.
- **Labels per night** (`labels.json` (c), `c_sizing7`, `c_sizingRead`): labels and confident labels per spine, per
  band and for the night, per 7-worker 10-h night; **the sizing read against J166's s01-s03 (122 / 22.3) and the
  review's ~25-27**; the same over the ten D483 spines (`labels-d483.json`) beside; what 1,000 labels and 1,000
  confident labels take at this rate.
- **What the cuts saved** (`cuts.json`): as J166's Report asks, over 13 spines.
- **D483** (`tool.json`): the identities count (decisions and options), `repeatedPlays` and
  `identityListingsShort` (0, checked), `sharedToken`, and the decisions whose k D483 changes on s01-s03
  (`kChanged`, `kChangedBranched`, `kChangedList`) against D483's measured 10 and J166's 8; the options per branched
  decision on s04-s13 against s01-s03.
- **s04 on its new deck**: the deck's sha256 (`draws.json`), its makeup, and how its spine ran against J166's s04 (14.0
  s a branch, 135 timeouts).
- **The tool on 26 decks** (`tool.json`), **(a)**, **(b)**, **(i)-(iii)**, **(iv)** on s01, s07, s13 with J158's
  and J162's per-pair verdicts beside, never pooled, **(v)**, **per spine** one line, **the validation draw**
  (unchanged; whether a redraw on the pin reproduces it), **the checks** with any exit explained, **the intervals'
  coarseness**, and **the label set** (`labels.jsonl`'s rows, its two listings, that the spine folders are kept for
  rung 4), as J166's Report asks.
- **No verdict** beyond (iv)'s: any other surprise is a candidate until a fresh draw shows it.
