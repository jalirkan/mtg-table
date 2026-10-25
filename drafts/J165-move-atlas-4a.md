id: J165
title: The move atlas, rung 4a -- the cut design (D480) in the wide shape, on decks nobody designed: 13 spines, each a pair of random library decks of one band drawn as the census draws them (D447; deck seeds 2001-2013, bands cycled pauper, peasant, legacy, powered), the baseline game Forge vs Forge at a fresh game seed (2101-2113), 8 decisions a spine from those with 3+ options, every option 200 times random with the 25-branch screen and early stopping at 50/100/150, the Forge map at 40 on spines 1, 7 and 13 only, the checks on the workers; the labels marked `training: true` with `pool: "random-<band>"`, and a held-out VALIDATION draw (13 more pairs, deck seeds 2201-2213) written as deck files only and never branched; a new data folder lab-j165; on <PIN>. Pre-registered reads, numbers only; no outcome rule beyond D451's and J156's (iv). These labels are a new deck population, tool and design, and are never pooled with J156's, J157's, J158's or J162's
public_title: Move atlas 4a: the cut design on random library decks
public_est: ~9 to 11 h
public_decides: None by itself; first trainable labels on random library decks, cut savings
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2.7
repos: mtg-table@<PIN> (origin/main: the merge of #207, D480 the atlas's cut design, on D476 the may-play fork, D477 Karn's restart, D478 the capped branch, D479 the copier's carry pass; merged == 1, checked by the pilot)
decides: nothing by itself. Rung 4a of the atlas ladder: the first night whose labels a future model MAY train on (Justin, 2026-10-24 19:35-19:50 EDT), so the decks are nobody's -- random library decks by band, as the census draws them -- and a validation set drawn the same way is set aside, never branched. It measures, on the cut design D480 built from the atlas review, labels and confident labels per spine and per night, what the cuts actually save (branch time against a projection without them; the checks on the workers; the barriers' idle tail D480 did not measure), and the tool's counters on 26 decks no job has played
hypothesis: none to confirm about the maps. The sizing has a registered expectation: the atlas review (2026-10-24, section 5) put design B's cuts in C's wide shape with k >= 3 at ~25-27 confident labels a 7-worker 10-h night with the Forge map on every spine (~30-32 with it on 1 spine in 6), from six cube-pair spines; random library decks are a new population, so this is the sizing read, not a prediction. The cuts are expected to save 18-20% of branch time (the review's replay; D480's 20.3%) and the parallel checks to take the checks from ~19% of a spine's wall toward ~6%. One candidate is read on every spine with a Forge map, (iv) C1 "cast now where Forge passes", which HELD on four of the six current-tool cube spines (J158, J162)
rule: D451 (method; no outcome rule) with D458/D462/D466 (G5), D459, D465, D466, D467, D470, D471 (G6), D472, D476, D477, D478, D479 and D480 (the cuts; amends D451 points 5-7); D447 (the deck draw, unchanged). Pre-registered here, before any J165 data: the label contract and reads (a)-(c) computed by var/lab-j165-local/bin/labels.py, the agreement reads (i)-(vi) by var/lab-j165-local/bin/reads.py, the savings by var/lab-j165-local/bin/cuts.py and the tool's counters by var/lab-j165-local/bin/metrics.py, all exactly as written in the pilot. A candidate of (iv) HOLDS on a spine only if its point is > 0 and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. Every other difference is a candidate (D447 point 9). No read carries any other verdict
followup: morning-read
est: ~9 h at 7 workers, ~10.5 h at 6 (range 8-12 h; sizing below): pilot ~20 min; 13 spines ~40 min each at 7 workers (the three with a Forge map ~45), the checks on the workers included; report ~2 min. Disk ~15 GB on the lab data folder /home/justin-a/code/lab/data (~1.1 GB a spine: J162's 16-decision spines were 1.5-2.5 GB)
resumable: yes
timeout: 3h
progress: lines /home/justin-a/code/lab/data/lab-j165/b-*/phaseB/branches.jsonl of 92000
metrics: branches = lines /home/justin-a/code/lab/data/lab-j165/b-*/phaseB/branches.jsonl
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j165/b-*/phaseB/branches.jsonl "\"engineError\":true"
metrics: branch_timeouts = count /home/justin-a/code/lab/data/lab-j165/b-*/phaseB/branches.jsonl "\"timedOut\":true"
metrics: unavailable = count /home/justin-a/code/lab/data/lab-j165/b-*/phaseB/branches.jsonl "\"unavailable\":\""
metrics: unit_errors = count /home/justin-a/code/lab/data/lab-j165/b-*/phaseB/units.jsonl "\"ok\":false"
metrics: payfail = count /home/justin-a/code/lab/data/lab-j165/b-*/phaseB/logs/*.log "Didn't find what to pay for"
metrics: armed = sh: cat var/lab-j165-local/armed.txt 2>/dev/null || echo 0
metrics: atlas = sh: python3 -I var/lab-j165-local/bin/metrics.py 2>/dev/null || echo '{"problems":-1}'
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: data_used_gb = sh: python3 -c "import os; print(round(sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk('/home/justin-a/code/lab/data/lab-j165') for f in fs) / 1e9, 2))" 2>/dev/null || echo 0
headline: branches, atlas.spinesDone, atlas.branchedInFull, atlas.screened, atlas.stoppedOptions, atlas.labels, atlas.confident, atlas.confidentPer7Worker10hNight, atlas.timeoutShare, atlas.effectSourceNullBranches, atlas.exileLinksLostBranches, atlas.branchRestarted, atlas.branchCapped, atlas.problems

**Why.** Justin's rules for the atlas's next rung (2026-10-24, 19:35-19:50 EDT, binding): a future model MAY train
on these labels; the training pool carries **no bias toward his decks or cubes** ("they're arbitrary and will
change"), so the decks are **decks nobody designed** -- random library decks by band, drawn as the census draws them,
and later the generated cubes' drafts; a held-out **validation** set drawn the same way on fresh seeds and never
branched; breadth over depth; branch decisions with several options. The atlas review of the same day
(`study/atlas-review-2026-10-24.md`, section 5) recommended B's cuts in C's wide shape with k >= 3, "the strongest
lever the data shows"; D480 (#207) built the cuts. **This job is that night, on those decks.**

**What changed since J162** (in the pin; the pilot checks each is there):
- **D476: the may-play play is found by its permission's host id.** J162's ff5 462 lost five decisions to Murderous
  Rider cast from exile after Swift End (2,400 errored branches); that play now maps onto the copy.
- **D477: a fork whose game Karn Liberated restarts plays the new game on** (J162 modern7's 62 NPEs); a branch row
  carries `restarts`, atlas.json `branchRestarted`.
- **D478: a capped branch is a draw** (`result` 0, `score` .5; every capped branch through J162 was scored a win).
  Capped branches are counted by option in `checks.branchCapped`; an option capped past 0.25 is a **warning**, never
  exit 3.
- **D479: the copier carries an effect card's triggers, replacements, SVars and source, every "exiled with" link,
  and the timestamps.** What it still cannot map is counted on the branch row: `effectSourceNull`, `exileLinksLost`.
- **D480: the cut design**, five flags (below). Each defaults off; this job turns them all on.

**These labels are a population of their own, and are never pooled.** A new tool (D476-D480), a new design (the
cuts change an option's n and which decisions are branched, D480) and a new deck population (random library decks,
not confirm-set cube pairs). They are **never pooled** with J156's, J157's, J158's or J162's labels or reads; every
row carries its `sha`, `contract` and `pool`, the split keys for rung 4 and anyone after.

## The decks: drawn as the census draws them

**The draw is D447's, unchanged** (`docs/decisions/D447-deck-census.md`; `docs/guides/cube-lab.md`, *The deck
census*; J149's night drew 2,500 decks a band at seeds 1501-1504 the same way): `tools/cubelab.sh decks --band <b>
--count 2 --seed <s> --cross-band 0.10 --out var/lab-j165/decks/<spine>`. The prior (k colours uniform on 1-5, flat
Dirichlet shares), 25 spells with the band pool's colourless share and the 10% cross-band slice, the one land
formula, castability (a deck that fails it is redrawn, every rejection counted), and the bands from census.tsv,
**powered drawn as one pool with legacy** (its cross slice from peasant). `decks` writes `decks/<band>-<seed>-<i>.dck`,
`decks.jsonl` and `decks.json`; deck i depends only on the census, the flags, the seed and i, so a 2-deck draw's two
decks are the first two of a 2,500-deck draw at that seed (checked by hand: a 40-deck powered draw at 2004 gives the
same first two `.dck` files and `decks.jsonl` lines). Deck 1 is the spine's deck A (the labelled seat), deck 2 its
deck B. No engine: the costs are Forge's own scripts, read from the zip beside the jar.

**Every seed below is fresh.** A grep of every job on `origin/pc-jobs` (118 files) and every draft under
`pc-results/drafts` on 2026-10-24 for `--seed` on a `decks` or `atlas` command finds the deck seeds 1401-1404,
1455, 1495, 1501-1504, 1665, 1675, 1808 and 1908, and the atlas seeds 451-466, 4515 (the self-test's), 4590, 4600,
4601 and 4640; nothing in 2001-2313.

| spine | band | deck seed | decks (A, B) | game seed | Forge map |
|---|---|---|---|---|---|
| s01 | pauper | 2001 | pauper-2001-00001 (k 5, WUBRG), -00002 (k 1, R) | 2101 | **40** |
| s02 | peasant | 2002 | peasant-2002-00001 (k 3, URG), -00002 (k 1, B) | 2102 | 0 |
| s03 | legacy | 2003 | legacy-2003-00001 (k 5), -00002 (k 5) | 2103 | 0 |
| s04 | powered | 2004 | powered-2004-00001 (k 3, WRG), -00002 (k 1, W) | 2104 | 0 |
| s05 | pauper | 2005 | pauper-2005-00001 (k 2, RG), -00002 (k 2, WG) | 2105 | 0 |
| s06 | peasant | 2006 | peasant-2006-00001 (k 4, WBRG), -00002 (k 1, U) | 2106 | 0 |
| s07 | legacy | 2007 | legacy-2007-00001 (k 1, R), -00002 (k 5) | 2107 | **40** |
| s08 | powered | 2008 | powered-2008-00001 (k 2, UR), -00002 (k 4, UBRG) | 2108 | 0 |
| s09 | pauper | 2009 | pauper-2009-00001 (k 4, WURG), -00002 (k 4, WBRG) | 2109 | 0 |
| s10 | peasant | 2010 | peasant-2010-00001 (k 3, WBR), -00002 (k 2, BG) | 2110 | 0 |
| s11 | legacy | 2011 | legacy-2011-00001 (k 1, B), -00002 (k 4, WURG) | 2111 | 0 |
| s12 | powered | 2012 | powered-2012-00001 (k 5), -00002 (k 3, WUB) | 2112 | 0 |
| s13 | pauper | 2013 | pauper-2013-00001 (k 2, BG), -00002 (k 1, G) | 2113 | **40** |

- **Bands cycled** pauper, peasant, legacy, powered: pauper 4 spines, the others 3. Legacy and powered share the
  legacy pool as the census draws them (powered = powered + legacy, one uniform pool).
- **The Forge map on every sixth spine counting from the first: s01, s07 and s13** (pauper, legacy, pauper), 40
  branches an option on the options still running after early stopping (D480). The other ten run `--branch-forge 0`:
  `complete`, `decided` and `settled` read the random map alone and there is no agreement read (D480 point 5). The
  agreement reads (i)-(iii) and the registered (iv) are made on these three.
- **The makeups above are the draw's own** (computed on 2026-10-24 at the pin's deck code, unchanged by #207); the
  pilot draws them again and must reproduce them byte for byte (below). Five-colour decks are in it on purpose: the
  draw makes them a fifth of the time, and nobody designed any of these.
- Folders: decks under `/home/justin-a/code/lab/data/lab-j165/decks/<spine>-<band>-<deckseed>/`, spines under
  `.../lab-j165/b-<spine>-<band>-<gameseed>/` (`b-s01-pauper-2101` ...). The atlas resolves `--deck-a` against the
  clone, so every block passes the decks by their absolute data-folder path.

**The validation draw: drawn, written, never branched.** Thirteen more pairs, the same bands in the same order, deck
seeds **2201-2213**, written by the same `decks` command to `.../lab-j165/validation/v<nn>-<band>-<seed>/` and
nothing else. Their game seeds are reserved now as **2301-2313** (v01 2301 ... v13 2313) for the validation job that
will one day branch them on the tool that is current then; no job before it may use these decks or seeds, for
training or anything else. The report records them in `validation.json` (ids, bands, deck seeds, reserved game
seeds, paths, the draw's sha256). A check fails the job if any spine's plan names a validation deck or any validation
folder holds a plan or a phase B.

**The draw's sha256, registered** (`drawsha.py`: each folder's `decks.jsonl`, then its `.dck` files by name, in the
order named), computed 2026-10-24 at 325c2dd8's deck code (`tools/cubelab/deckcensus.ts` is unchanged by #207):
- the 13 spine draws, s01-s13: **`e998ad3c246d7cf5a6ab92e45a133918e2a42ff63440c2dd35507cc19b08df3c`** (26 decks);
- the 13 validation draws, v01-v13: **`7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de`** (26 decks);
- the smoke's draw (powered, 2099): **`edfdc861736fb049bc1080d525269064c6776ecabd47de496463fa3dc684c931`**;
- s01 alone: **`a40fb5addec594bd6e97b0e7b16d78af1f08280dcc555366b3a2301feda4ff34`** (the same from two output folders).

## The design: D480's cuts in the wide shape

| | |
|---|---|
| spines | 13 Forge-vs-Forge baseline games, one a block, in the table's order. `--phase b` plays its own baseline at `--seed` (Forge's Default on both seats, recorded like a census game) and lists seat A's decisions; no ladder line is needed |
| phase A | **none** (it labels nothing) |
| decisions | **8 a spine** (`--decisions 8`), spread by D451's `spread` over the listed decisions with **3 or more options** (`--min-options 3`); a spine that lists fewer than 8 such fills from the rest (`fill`, recorded) |
| screen | **25 random branches** (`--screen 25`): a decision whose mean value is <= .04 or >= .96 is settled, kept as a cheap row (`screened: true`, never a label), and the next listed decision takes its place (3+ options first) |
| branches | every option **200 times random**, early stopping at **50, 100 and 150** (`--early-stop on`: an option whose paired-bootstrap interval against the leader lies below zero stops; option 0 and the leader never stop; a stopped option keeps its own n); the Forge map **40** on s01, s07, s13 (on the options still running), **0** elsewhere |
| units | 25 branches (`--chunk 25`), released stage by stage behind each checkpoint (`phaseB/schedule.jsonl`); `--unit-timeout 30` (minutes, monotonic); the branch timeout at its 120-s default, read inside a step (D467); `--branch-error-max` 0.1, `--branch-capped-warn` 0.25 (defaults) |
| checks | D451 point 6 on every folder, as D466, D470, D471 and D478 amend it, **on the workers** (`--checks-parallel {workers}`: atlas.json's checks byte for byte the serial run's but `redactionMs`) |

The per-spine flags are D480's lane's, exactly: `--phase b --decisions 8 --min-options 3 --screen 25 --early-stop on
--branch-random 200 --branch-forge <40|0> --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers}`.

**Sizing** (worker-hours = wh; a 7-worker night 70 wh):
- **Per decision.** J162's current-tool rates: 2.3 s a random branch, 1.7 s a Forge one. A k >= 3 decision has ~4.8
  options (J158 + J162: 3-4 options 31 decisions, 5-6 20, 7-8 10). Uncut, 200 random branches an option is ~2,200
  worker-s; early stopping saves ~14% of random time (the review's 3b, D480's 14.3%), so ~1,900 worker-s, ~0.53 wh;
  the Forge map adds ~0.07 wh on the options still running.
- **Per spine.** 8 decisions ~4.2 wh, plus ~1.5 screened decisions at 25 branches (~0.1 wh): ~4.3 wh without the
  Forge map, ~4.9 with it. Overheads: replay ~2%, the checks on the workers ~6% (J162 serial: 19% of the wall),
  the barriers' idle tail unmeasured (assumed ~10%).
- **Night.** 10 x 4.3 + 3 x 4.9 = ~58 wh of branch work, ~68 reserved wh: **~9.0 h at 7 workers, ~10.5 h at 6**.
  The review's own figure for this shape was ~9.5-10 h at 7 with the Forge map on every spine; the map on 3 of 13
  takes ~10% off that. **Random library decks are the uncertainty**: the census played pauper games at 22.6 turns and
  ~5,200 games an hour on 5 workers, legacy at ~9,500, so a slow pauper pair could double a spine. Range 8-12 h.
- **`timeout: 3h`** bounds each block (one spine a block): ~4x the expected 40-45 min.
- ~104 labels if every spine branches 8 in full; ~92,000 branch games (`progress:`).
- **Disk** ~15 GB; the pilot and every block require 50 GB free, and `abort:` fires under 50 GB.

**Where it writes: the lab data folder,** as J156-J162: every atlas and decks command runs under
`LAB_DATA_DIR=/home/justin-a/code/lab/data`, which re-roots `--out var/lab-j165/...` there. **A new folder,
`lab-j165`**, created empty by the PC session before posting; the pilot creates it again if absent. Nothing else
there is read except J158's and J162's folders, by the readers' self-tests (read, never written). The Forge homes
(`CUBELAB_HOME_ROOT=var/cubelab/homes-J165`), `atlas-selftest`'s own folder and the job's scripts
(`var/lab-j165-local/`) stay in the clone. As J162:
- the pilot's first lines assert that `LAB_DATA_DIR` is unset or exactly that path, and so is `config.json`'s
  `labDataDir`; they `mkdir -p` the data folder before anything reads it, and stop under 50 GB free;
- the pilot records whether `lab-j165` held no spine folder when it first ran (`fresh`, checked);
- every run block asserts the path, the 50 GB and its two deck files again before it plays;
- the metrics, `progress:` and `collect:` read the data folder by its absolute path;
- **no `clean:`, and nothing is deleted there: rung 4 reads these folders.** A restart from scratch needs
  `/home/justin-a/code/lab/data/lab-j165` moved aside by hand and `var/lab-j165-local/armed.txt` and
  `var/lab-j165-local/fresh.txt` removed (the J152 lesson).

**Nothing beside it.** `cores: 7` of 8 reserves the box: post nothing heavy beside it. No `pilot_cores:` (the J146
lesson). **No `after:` line**: J164 is lower-numbered and short, and the core budget serialises the two.

**The abort lines read only this run's artefacts (the J152 lesson).** Every abort that reads the atlas's own files is
gated on `armed == 1`; `var/lab-j165-local/armed.txt` is written by this job's pilot (after the data-folder guard) and
removed by the Report block's last line.

## The label set: the rung-4a contract

`report/labels.jsonl`, one JSON row a branched decision of seat A (complete, screened or neither), written by
labels.py. `contract` reads **`mtg-table rung-4a label v1 (J165)`**. J162's fields, with these changes:

| field | what it is |
|---|---|
| `spine`, `pool`, `deckA`, `deckB`, `deckSeed`, `spineSeed`, `sha` | the spine (`s01`...), **`pool: "random-<band>"`**, the two deck files, the draw's seed, the baseline's game seed, the pin |
| **`training`**, `split` | **`true`** and `"train"` on every row of this night (labels.py `--training=1`; anything else writes `false`, as the self-tests do on J158's and J162's confirm-set spines). Replaces J158's `notForTraining`: these decks are random library decks, not D318's confirm set, and Justin's rule of 2026-10-24 makes them trainable. The validation draw is never in this file |
| `d`, `kind`, `turn`, `k`, `kBucket`, `why`, `replaces` | the decision; its option count and bucket (2, 3-4, 5-6, 7-8); why it was branched (`spread`, `fill`, `replaces`) and the screened decision it replaced |
| `forgeOption`, `forgeToken`, `options[]` | as J158, each option with `stoppedAt` (null if it ran to 200) |
| `regret`, `regretLo`, `regretHi` (**the label**), `bestRandom`, `confident` | atlas.json's random-map regret at Forge's choice; `confident` = complete and the low end > 0 |
| `regretForge*`, `bestForge`, `confidentForge`, `rho`, `sameBest` | the Forge map's, on s01, s07, s13 only (`forgeMap: true`); null elsewhere |
| `complete`, `decided`, `inQ`, `settled` | **atlas.json's own (D480)**: complete on the random map alone on a spine with no Forge map; settled includes a screened decision |
| `screened`, `screenMean` | a screened decision: kept, `complete: false`, never a label |
| `gap`, `branches`, `view`, `frameLog`, `rows`, `branchFrames`, `branchesFile`, `atlas`, `void`, `voidEvidence` | as J162 (`branches` adds the plan's `cuts`; the void test over the continuations the spine has) |

- **Expected: 0 void labels** (D470); `atlas.voidLabels == 0` is a check, and labels.py's `sameGameNotBlock` lists any
  non-block decision that passes the same test (reported, never voided).
- **Nothing is cleaned**: rung 4 reads the spine folders (frames, rows, branches) through each row's paths.

## Pre-registered reads (numbers only)
- **(a) Labels produced and confident** (labels.py): labels, screened rows and confident labels **per spine, per pool
  (band) and for the night**; the confident share with its interval, pooled (pool -> spine -> decision), by pool and
  by spine (decision-level), by kind, by option count (`a_confidentShareByK`: 2, 3-4, 5-6, 7-8) and over Q;
  `confidentForge` beside on the three Forge-map spines. Intervals: 95% percentile bootstrap, 10,000 draws, seed 150.
- **(b) What a label tells**: the median best-worst gap (random map) by pool, the mean regret, the settled share.
- **(c) The sizing, first in the summary**: labels and confident labels per spine, per pool and **per night**, at the
  measured wall and per **7-worker 10-h night** (`c_sizing7`: the wall times its workers / 7, checks included).
  **The sizing read** (`c_sizingRead`): confident labels per 7-worker 10-h night as run, beside the review's
  expectation **~25-27** (and ~30-32 with the Forge map on 1 spine in 6). No verdict: the review's rates are cube
  pairs. Then what 1,000 labels and 1,000 confident labels take at this rate.
- **(d) What the cuts saved** (cuts.py, per spine and for the night): branch time as run against a projection
  without the cuts (each stopped option's missing branches and each screened decision's at their decision's measured
  ms), with early stopping's and the screen's shares; the options stopped and the decisions screened; **the idle
  share** of the workers phase B held (the barriers' tail, `units.jsonl`'s unit ms against phase B's wall x workers);
  **the checks' wall** a spine and per 1,000 branch games against J162's serial 93 s (60-113). Beside them: the
  review's 18-20% and D480's replay's 20.3%.
- **(i)-(iii) Agreement, as rung 2** (reads.py, J156's definitions) **on s01, s07 and s13**: (i) same best over Q;
  (ii) mean rho over the rankable decisions, how many have two options; (iii) regret at Forge's choice by kind under
  each map, with how many clear zero. Pooled over the three and by spine. On a cut spine both are over the options the
  Forge map played (D480).
- **(iv) C1 "cast now where Forge passes"** (J156's statistic) **on every spine with a Forge map**, s01, s07, s13
  (`iv_bySpine`): **HOLDS** if the point is > 0 and the interval's low end is > 0, else **NOT SHOWN**; the Forge map
  and C2 beside, as information; the three pooled, as information. The random-map C1 on the ten spines without a
  Forge map is printed as information, no verdict. Beside, never pooled: J158's and J162's per-pair verdicts.
- **(v) Guardrails** per spine and pool: G1 lands offered and taken, violations (G1, G4, G6 apart), G3
  `noRepeatNoOp`, G5 `refusedCast` / `noRepeatRefused`, `payfail` beside, G6 `xDrawn`, `zeroXLeftOut`, `zeroX` (**any
  `zeroX` > 0 fails the atlas**, and is a check here).
- **(vi)** reads.py's worker-second line per spine.
- **(vii) The tool's counters** (metrics.py, `report/tool.json`, per spine and in all): **`effectSourceNull`** and
  **`exileLinksLost`** (D479: branches and cards / links), **`branchRestarted`** (D477), **`branchCapped`** (D478: the
  capped branches, and the options past the 0.25 warning, each named), branch timeouts and in-step timeouts (D467),
  D470's unavailable by reason, branch errors by kind (D472/D476's `no <description> [<kind>] on the copy's <card>`
  named), the atlas warnings, engine errors other than step-clock timeouts (bounded at 50, a check). The cut design's
  own: decisions branched in full, screened, filled from under 3 options, options stopped, units planned (from the
  schedule) against units done.
- **(viii) The validation draw**: its 26 decks, their bands and seeds, the reserved game seeds, its sha256.
- Everything else is a candidate (D447 point 9).

**Outputs** (on the data folder, `/home/justin-a/code/lab/data/lab-j165/`).
- `decks/<spine>-<band>-<seed>/` and `validation/v<nn>-<band>-<seed>/`: `decks/*.dck`, `decks.jsonl`, `decks.json`.
- `b-<spine>-<band>-<gameseed>/`: `plan.json`, `atlas.json`, `atlas.md`, `phaseB/` (the baseline, branches.jsonl,
  units.jsonl, schedule.jsonl, every branch's frames and rows, the worker logs). `pilot-smoke/`, the smoke.
- `exits.txt` (each atlas command's exit) and `spine-times.txt`.
- `report/`: each spine's `atlas.json` and `atlas.md` under its folder's name, `labels.jsonl`, `labels.json`
  (reads (a)-(c), `c_sizing7`, `c_sizingRead`), `labels-head.jsonl` (its first 20 rows), `reads.json`, `cuts.json`,
  `tool.json`, `validation.json`, `spines.json` (the spine table as run), `exits.txt`, `spine-times.txt` and
  `missing.txt` (empty when nothing was missing).
- Never `summary.md` or `metrics.json`.

## Pilot
About 20 minutes: the data folder and the abort gate; the pin carries D466-D472 and D476-D480; the node tests,
the cut design's among them; the two engine self-tests (`atlas-selftest`, with its G5, G6 and **cuts** legs, and
`seat-identity`); the readers' self-tests on J158's, J162's and the cuts legs' own files; the deck draw, reproduced
by sha256; a 1-spine smoke with every cut on.

**The readers' self-tests** (all run by hand on 2026-10-24 on the lab's files and the cut lane's self-test folders;
every value matched):
- **labels.py on J162's four spines** (lab-j162, f6dba5e4; atlas.json files written before D480, so its J158
  fallbacks) must give J162's `labels.json`: 59 labels, 7 confident, 5 `confidentForge`, 0 rows unmatched, 0 void,
  the confident share 0.1186 [0.0339, 0.2203], and 91 labels a 7-worker night as run. With no `--training` every row
  says `training: false`.
- **labels.py on J158's two spines** (the void rule's positive control): 32 labels, 6 confident, exactly the void
  list `ff5 d10 block:35>78`, `ff5 d14 block:21>71`, `ff5 d30 block:25>80,40>81`, and no non-block decision.
- **reads.py on J162's four spines, each its own pool,** must give J162's `reads.json`: C1 on pauper5 0.0411 [0.0126,
  0.069] HOLDS, synergy9 0.0002 [-0.0133, 0.0136] NOT SHOWN, modern7 0.063 [0.017, 0.1231] HOLDS, ff5 0.0523 [-0.0047,
  0.1313] NOT SHOWN; (i) 0.5088 [0.322, 0.7]; (ii) 0.2181 [-0.1188, 0.5799].
- **cuts.py on J162's four spines** (cuts off): saved share 0, 55,680 branch games, the checks at 92.3 s per 1,000
  branch games (J162's serial checks; the 93 the reads compare against).
- **All four on the pilot's own `atlas-selftest` cuts legs** (`var/cubelab/atlas-selftest/cuts`, Forge map 2, and
  `cuts-noforge`, Forge map 0): labels.py rows all matched, labels equal the schedule's, every row `training: true`
  under `--training=1`; reads.py makes the agreement read on the leg with a Forge map only.

**The smoke** draws its own pair (powered, deck seed **2099**, not a spine seed) and plays it at game seed **2199**:
2 decisions, 25 random branches and 5 Forge an option, chunks of 5, with every cut on at the smoke's scale
(`--min-options 3 --screen 5 --early-stop 10,15,20 --checks-parallel {workers}`). It must show **0 problems**, 0
violations, G6's keys and `zeroX` 0, D479's keys, a schedule, **2 decisions branched in full**, every unit the
schedule planned done, no branch timed out, the 120-s branch timeout in its plan, and two labels whose rows match,
none void, every row `training: true`. Then the readers run on it.

**The draw's determinism.** The pilot draws the 13 spine pairs, the 13 validation pairs and the smoke's pair onto the
data folder, then draws s01 and v01 again into the clone (`var/lab-j165-local/redraw/`, absolute paths so nothing is
re-rooted). The three sets must give the registered sha256s above, and each redraw its data-folder twin's.
```bash
# the lab data folder: exactly /home/justin-a/code/lab/data (README safety rules), created before anything reads it, 50 GB free or stop
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J165: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import json, sys; v = json.load(open('config.json')).get('labDataDir'); sys.exit(0 if v in (None, '', '/home/justin-a/code/lab/data') else 'J165: config.json labDataDir is %r, not /home/justin-a/code/lab/data' % v)"
mkdir -p /home/justin-a/code/lab/data/lab-j165 var/lab-j165-local/bin var/lab-j165-local/redraw
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; print('J165: data folder free GB', round(f, 1)); sys.exit(0 if f >= 50 else 'J165: under 50 GB free on the data folder')"
echo 1 > var/lab-j165-local/datadir.txt
# fresh: lab-j165 held no spine folder when this pilot first ran (written once; a later pilot run keeps the first answer)
test -f var/lab-j165-local/fresh.txt || { if ls -d /home/justin-a/code/lab/data/lab-j165/b-* >/dev/null 2>&1; then echo 0; else echo 1; fi; } > var/lab-j165-local/fresh.txt
# the abort gate (the J152 lesson): this job's own run is armed from here; the Report block disarms it
echo 1 > var/lab-j165-local/armed.txt
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j165-local/merged.txt || echo 0 > var/lab-j165-local/merged.txt
git rev-parse --short=8 HEAD > var/lab-j165-local/sha.txt
grep -q 'chosenOptionalCosts' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'class StepClock' bridge/src/mtgtable/ai/Atlas.java && grep -q 'class OptionUnavailable' bridge/src/mtgtable/ai/RolloutController.java && grep -q 'zeroXLeftOut' bridge/src/mtgtable/ai/Explorer.java && grep -q 'restoreChoices' bridge/src/mtgtable/ai/Explorer.java && grep -q 'copyCandidates' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'COUNTED_GUARDRAILS' tools/cubelab/atlas.ts && grep -q 'unit-timeout' tools/cubelab/atlas.ts && grep -q 'empty-hand-ok' tools/check-redaction.mjs && echo 1 > var/lab-j165-local/has-d466-d472.txt || echo 0 > var/lab-j165-local/has-d466-d472.txt
grep -q 'D476' bridge/src/mtgtable/ai/SearchPolicy.java && echo 1 > var/lab-j165-local/has-d476.txt || echo 0 > var/lab-j165-local/has-d476.txt
grep -q 'final class ForkRestart' bridge/src/mtgtable/ai/ForkRestart.java && grep -q 'branchRestarted' tools/cubelab/atlas.ts && echo 1 > var/lab-j165-local/has-d477.txt || echo 0 > var/lab-j165-local/has-d477.txt
grep -q 'BRANCH_CAPPED_WARN_DEFAULT' tools/cubelab/atlas.ts && grep -q 'export function cappedBranches' tools/cubelab/atlas.ts && echo 1 > var/lab-j165-local/has-d478.txt || echo 0 > var/lab-j165-local/has-d478.txt
grep -q 'effectSourceNull' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'exileLinksLost' bridge/src/mtgtable/ai/Atlas.java && grep -q 'exileLinksLost' tools/cubelab/atlas.ts && echo 1 > var/lab-j165-local/has-d479.txt || echo 0 > var/lab-j165-local/has-d479.txt
grep -q 'export class AtlasSchedule' tools/cubelab/atlascuts.ts && grep -q "export const EARLY_STOP_ON = \[50, 100, 150\]" tools/cubelab/atlascuts.ts && grep -q 'export const SCREEN_LOW = 0.04' tools/cubelab/atlascuts.ts && grep -q 'export async function redactionCheckParallel' tools/cubelab/censusplay.ts && grep -q 'holdIdle' tools/cubelab/engine.ts && grep -q 'SELFTEST_CUTS' tools/cubelab/atlas.ts && test -f web/test/cubelab-atlas-cuts.test.ts && echo 1 > var/lab-j165-local/has-d480.txt || echo 0 > var/lab-j165-local/has-d480.txt
grep -q 'export function decksCommand' tools/cubelab/deckcensus.ts && grep -q 'export const MIN_BAND_POOL = 200' tools/cubelab/deckcensus.ts && echo 1 > var/lab-j165-local/has-d447.txt || echo 0 > var/lab-j165-local/has-d447.txt
test -z "${CUBELAB_WORKER_XMX:-}" && echo 1 > var/lab-j165-local/xmx-unset.txt || echo 0 > var/lab-j165-local/xmx-unset.txt
env -u LAB_DATA_DIR node --test web/test/cubelab-atlas.test.ts web/test/cubelab-atlas-cuts.test.ts web/test/cubelab-atlas-resume.test.ts web/test/cubelab-atlas-redaction.test.ts web/test/cubelab-record.test.ts web/test/cubelab-watchdog.test.ts web/test/cubelab-deck-census.test.ts && echo 1 > var/lab-j165-local/nodetests.txt || echo 0 > var/lab-j165-local/nodetests.txt
cat > var/lab-j165-local/bin/drawsha.py <<'PY'
# J165: the sha256 of a set of deck draws, in the order named: each folder's decks.jsonl, then its decks/*.dck by name.
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
cat > var/lab-j165-local/bin/labels.py <<'PY'
# J165's label set (pc-results drafts/J165-move-atlas-4a.md): J162's labels.py made the rung-4a contract, registered before
# any J165 data. What changed from J162's: (1) a label is atlas.json's own `complete`, and `decided` / `settled` are atlas.json's
# (D480: the random map alone on a spine with no Forge map; the Forge map's options only where early stopping dropped some),
# with J158's reader definitions as the fallback for an atlas written before D480 (the pilot's self-test on J162 and J158);
# (2) a screened decision (D480's 25-branch screen) is a row of its own, `screened: true`, never complete, never a label;
# (3) the row names its spine, its decks' pool and seeds, and carries `training` (true only under --training=1) with `pool`,
# in place of J158's `notForTraining` (Justin, 2026-10-24 19:35-19:50 EDT: a future model MAY train on these labels; the
# training pool carries no bias toward his decks or cubes); (4) the reads are per spine and per pool (band), the bootstrap
# pool -> spine -> decision; (5) the sizing is per spine, per pool and per night, scaled to 7 workers as J162's c_sizing7.
# From spine folders named on the command line as NAME:POOL:DECKSEED:GAMESEED:DIR (DIR holds plan.json, atlas.json, phaseB/).
#   --out=FILE       write labels.jsonl there (one row per branched decision: complete, screened or neither)
#   --times=FILE     spine-times.txt ("<folder> <start epoch s> <end epoch s> <workers>", one line a run of a spine's block)
#   --sha=SHA        the mtg-table commit the labels were made on
#   --training=1     mark every row `training: true` (the J165 night); anything else writes `training: false`
# Standard library only; no engine. Prints one JSON object (the label reads) to stdout.
# Definitions (fixed before any J165 data):
#   label      a branched decision of seat A that atlas.json calls complete (D480), not screened
#   regret     atlas.json's random-map regret: the best option's mean minus option 0's (Forge's answer, the one the spine
#              played), with atlas.json's paired-bootstrap interval; an option early stopping dropped keeps its own n (D480)
#   confident  complete and the regret's low end is > 0 (random map); `confidentForge` the same under the Forge map, on a
#              spine with one (null on a spine without), as information
#   decided    atlas.json's (D480); fallback J158's: every option's mean >= 0.95 under both maps; inQ = complete, not decided
#   settled    atlas.json's (D480: decided, or every option <= 0.05 under each map, or screened); fallback J158's
#   gap        best minus worst option mean under the random map, over every option (J157's "information" measure)
#   k bucket   the decision's option count: 2, 3-4, 5-6, 7-8
#   interval   95% percentile bootstrap, 10,000 draws, seed 150: pool -> spine -> decision when more than one pool is read,
#              spine -> decision for one pool, decision for one spine
#   rows       the d-th row of seat A in the spine's baseline rows IS decision d (`rows.match`), J158's rule
#   void       J162's: "D470" when a block decision played one game under every option in every continuation the spine has
#   c_sizing7  labels and confident labels per 10-h night at the measured wall (spine-times.txt, checks included) scaled to 7
#              workers (wall x workers / 7), per spine, per pool and as run
import collections, glob, json, os, random, statistics, sys

B, SEED = 10000, 150
CONTRACT = 'mtg-table rung-4a label v1 (J165)'
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
    name, pool, dseed, gseed, spine = a.split(':', 4)
    spine = os.path.abspath(spine)
    doc = json.load(open(os.path.join(spine, 'atlas.json')))
    plan = json.load(open(os.path.join(spine, 'plan.json')))
    base = json.load(open(os.path.join(spine, 'phaseB', 'baseline.json')))
    fm = forge_map(doc)
    btok = {x['d']: x for x in base['decisions']}
    rf, seat, player, arows = seat_rows(spine)
    sg_all = same_game(os.path.join(spine, 'phaseB', 'branches.jsonl'), ('random', 'forge') if fm else ('random',))
    pb = doc.get('phaseB') or {}
    sch = pb.get('schedule') or {}
    meta[name] = {'pool': pool, 'deckSeed': int(dseed), 'gameSeed': int(gseed), 'folder': os.path.basename(spine), 'forgeMap': fm,
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
        lab = {
            'v': 1, 'contract': CONTRACT, 'spine': name, 'pool': pool, 'training': TRAINING, 'split': 'train' if TRAINING else None,
            'deckA': plan['deckA'], 'deckB': plan['deckB'], 'deckSeed': int(dseed), 'spineSeed': int(gseed), 'sha': opt.get('sha'),
            'd': d, 'kind': x['kind'], 'turn': x['turn'], 'k': len(x['options']), 'kBucket': kbucket(len(x['options'])),
            'why': x.get('why'), 'replaces': x.get('replaces'),
            'forgeOption': x['chosen'], 'forgeToken': x['options'][x['chosen']]['token'],
            'options': [{'o': o['o'], 'token': o['token'], 'label': o['label'], 'stoppedAt': o.get('stoppedAt'),
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
                       'expectation': '~25-27 (atlas review 2026-10-24, section 5: design B in C\'s shape, k >= 3, cube pairs; registered as the sizing read, no verdict)'}
# the void count (0 expected since D470), any non-block decision that played one game under every option
out['voidLabels'] = sum(1 for x in labels if x['void'])
out['voidList'] = ['%s d%d %s' % (x['spine'], x['d'], x['forgeToken']) for x in labels if x['void']]
out['sameGameNotBlock'] = ['%s d%d' % (x['spine'], x['d']) for x, same in same_any if same and x['kind'] != 'b' and x['complete']]
print(json.dumps(out, indent=1))
PY
cat > var/lab-j165-local/bin/reads.py <<'PY'
# J165's reads (pc-results drafts/J165-move-atlas-4a.md): J162's reads.py (J156's definitions) made per spine, registered
# before any J165 data. From atlas.json files named on the command line as NAME:POOL:PATH. Standard library only; no engine.
# What changed from J162's: a spine is a pair of its own (random decks of one band; the pool is the band, `random-<band>`);
# `complete` and `decided` are atlas.json's (D480), with J158's definitions as the fallback for an atlas written before it;
# the agreement reads (i)-(iii) and the registered (iv) are made on the spines WITH a Forge map only (D480 point 5: a spine
# with --branch-forge 0 has no agreement read); C1's random-map statistic on a spine without one is printed as information,
# with no verdict. Definitions otherwise J156's, unchanged:
#   decided    atlas.json's (D480); fallback every option's mean >= 0.95 under BOTH maps
#   Q          the complete decisions that are not decided (screened decisions are never complete)
#   R          the complete decisions whose rank correlation is defined
#   interval   95% percentile bootstrap, 10,000 draws, seed 150: J162's scheme with the pool in the pair's place (pool ->
#              spine -> decision when several pools are read; spine -> decision for one pool, which for one spine is
#              decision-level, J162's per-pair read exactly)
#   (i)   same best over Q;  (ii) mean rho over R, how many have two options;  (iii) regret at Forge's choice by kind under each
#         map, and how many decisions have a regret interval whose low end is above zero
#   (iv)  C1 "cast now where Forge passes": over Q priority decisions listing pass and at least one cast:/activate: option, the
#         mean over decisions of (the mean random value of the cast/activate options minus pass's random value; an option
#         early stopping dropped counts at its own n); HOLDS on a spine when the point is > 0 and the interval's low end is
#         > 0, else NOT SHOWN, on every spine with a Forge map; the Forge map's same statistic beside (over the options it
#         played), and C2 "don't attack" as information
#   (v)   the guardrail counts of every atlas.json, per spine and per pool
#   (vi)  the sizing line from atlas.json's branch counts and mean branch times, per spine: options per decision, branch games
#         and worker-seconds per complete decision, complete decisions per 7-worker hour
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
cat > var/lab-j165-local/bin/cuts.py <<'PY'
# J165: what the cut design (D480) saved, per spine and for the night, from each spine's own files: phaseB/branches.jsonl (every
# branch's `ms`), phaseB/schedule.jsonl via atlas.json's phaseB.schedule (the screened decisions, the options stopped and where),
# phaseB/units.jsonl (each unit's `ms`), atlas.json's timing and the run blocks' spine-times.txt (--times=FILE). Spine folders named
# on the command line. Standard library only.
# Definitions (registered before any J165 data):
#   branchMs         the sum of every branch row's ms (both continuations, errors included): the branch time as run
#   earlyStopAvoided for each option early stopping stopped at `at` random branches: (branchRandom - at) x the decision's mean
#                    random-branch ms, plus, on a spine with a Forge map, branchForge x the decision's mean Forge-branch ms
#                    (D480 plays the Forge map on the options still running)
#   screenAvoided    for each screened decision: (branchRandom - screen) x k x its mean random-branch ms, plus, on a spine with
#                    a Forge map, branchForge x k x the spine's mean Forge-branch ms (a screened decision has no Forge map)
#   projectedMs      branchMs + earlyStopAvoided + screenAvoided: the same decisions branched in full, uncut (the screened
#                    ones as well; their replacements were played either way)
#   savedShare       (projectedMs - branchMs) / projectedMs; the review's replay of the cuts on six spines: 18-20%
#   idleShare        1 - (sum of the ok units' ms) / (phase B wall x workers): the workers' time phase B held without a unit
#                    running -- the barriers' tail D480 did not measure (atlas.json timing: the last run of the command only)
#   checksSec        the spine's wall in spine-times.txt (its block's start to end, summed over resumed runs) minus atlas.json's
#                    timing.wallMs (the baseline and phase B; written before the checks run): the post-spine checks' wall
#                    (--checks-parallel), with the command's start-up
#   checksSecPerKGames  checksSec per 1,000 branch games; J162's serial checks took 60-113 s per 1,000 (mean 93: pauper5 27 min
#                    for 14,400 games, synergy9 13 for 12,960, modern7 20 for 13,440, ff5 462 27 for 14,880)
import json, os, sys

J162_SERIAL_S_PER_KGAMES = 93
args = [a for a in sys.argv[1:] if not a.startswith('--')]
wall = {}
for a in sys.argv[1:]:
    if a.startswith('--times='):
        for line in open(a.split('=', 1)[1]):
            f = line.split()
            if len(f) >= 3 and f[1].isdigit() and f[2].isdigit():
                wall[f[0]] = wall.get(f[0], 0) + int(f[2]) - int(f[1])
out, night = {'bySpine': {}}, {'branchMs': 0, 'earlyStopAvoidedMs': 0, 'screenAvoidedMs': 0, 'projectedMs': 0, 'checksSec': 0, 'branchGames': 0,
                                'unitMs': 0, 'heldMs': 0, 'screened': 0, 'stoppedOptions': 0, 'spines': 0}
for spine in args:
    name = os.path.basename(os.path.abspath(spine))
    try:
        doc = json.load(open(os.path.join(spine, 'atlas.json')))
    except (OSError, ValueError):
        continue
    plan, pb, tm = doc['plan'], doc.get('phaseB') or {}, doc.get('timing') or {}
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
    s = {'forgeMap': fm, 'branchGames': len(rows), 'branchMs': bms, 'earlyStopAvoidedMs': round(es), 'screenAvoidedMs': round(sc), 'projectedMs': round(proj),
         'savedShare': round((proj - bms) / proj, 4) if proj else None, 'earlyStopShare': round(es / proj, 4) if proj else None,
         'screenShare': round(sc / proj, 4) if proj else None, 'screened': len(sch.get('screened') or []), 'stoppedOptions': sch.get('stoppedOptions', 0),
         'phaseBWallSec': round((tb.get('ms') or 0) / 1000), 'workers': tb.get('workers'), 'unitSec': round(sum(units) / 1000),
         'idleShare': round(1 - sum(units) / held, 4) if held else None, 'checksSec': round(chk), 'redactionSec': round(((doc.get('checks') or {}).get('redactionMs') or 0) / 1000),
         'checksSecPerKGames': round(1000 * chk / len(rows), 1) if rows else None, 'j162SerialSecPerKGames': J162_SERIAL_S_PER_KGAMES}
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
p = night['projectedMs']
out['night'] = {'spines': night['spines'], 'branchGames': night['branchGames'], 'branchHours': round(night['branchMs'] / 3.6e6, 2), 'projectedHours': round(p / 3.6e6, 2),
                'savedShare': round((p - night['branchMs']) / p, 4) if p else None, 'earlyStopShare': round(night['earlyStopAvoidedMs'] / p, 4) if p else None,
                'screenShare': round(night['screenAvoidedMs'] / p, 4) if p else None, 'screened': night['screened'], 'stoppedOptions': night['stoppedOptions'],
                'idleShare': round(1 - night['unitMs'] / night['heldMs'], 4) if night['heldMs'] else None, 'checksHours': round(night['checksSec'] / 3600, 2),
                'checksSecPerKGames': round(1000 * night['checksSec'] / night['branchGames'], 1) if night['branchGames'] else None,
                'checksHoursAtJ162Serial': round(night['branchGames'] * J162_SERIAL_S_PER_KGAMES / 1000 / 3600, 2),
                'reviewExpectation': 'cuts save 18-20% of branch time (atlas review 3b+3d; D480 replay 20.3%); checks 1.26 -> ~1.06 x branch time'}
print(json.dumps(out, indent=1))
PY
cat > var/lab-j165-local/bin/metrics.py <<'PY'
# J165's metrics (pc-results drafts/J165-move-atlas-4a.md): one JSON object over the 13 spine folders b-* under the data folder's
# lab-j165: each plan against the registered spine table (decks, seeds, cuts, the Forge map), the atlases' problems, warnings,
# guardrails (G1, G4, G5, G6), the cut design's schedule (units planned against units done), the branch rows (timeouts, D470's
# unavailable, errors by kind, D477's restarts, D478's capped, D479's effectSourceNull / exileLinksLost), the validation draw
# (written, matching its registered sha256, never branched), and the report's labels.json and reads.json. Standard library only.
import glob, hashlib, json, math, os, re, sys
D = sys.argv[1] if len(sys.argv) > 1 else '/home/justin-a/code/lab/data/lab-j165'
# name: (band, deck seed, game seed, branchForge) -- the registered spine table
SPINES = {'s01': ('pauper', 2001, 2101, 40), 's02': ('peasant', 2002, 2102, 0), 's03': ('legacy', 2003, 2103, 0), 's04': ('powered', 2004, 2104, 0),
          's05': ('pauper', 2005, 2105, 0), 's06': ('peasant', 2006, 2106, 0), 's07': ('legacy', 2007, 2107, 40), 's08': ('powered', 2008, 2108, 0),
          's09': ('pauper', 2009, 2109, 0), 's10': ('peasant', 2010, 2110, 0), 's11': ('legacy', 2011, 2111, 0), 's12': ('powered', 2012, 2112, 0),
          's13': ('pauper', 2013, 2113, 40)}
VALIDATION_SHA = '7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de'
CUTS = {'earlyStop': [50, 100, 150], 'screen': 25, 'minOptions': 3}
out = {'atlases': 0, 'spinesDone': 0, 'problems': 0, 'warnings': 0, 'guardViolations': 0, 'violationsG1': 0, 'violationsG4': 0, 'violationsG6': 0,
       'g5keys': 0, 'g6keys': 0, 'd479keys': 0, 'scheduleKeys': 0, 'refusedCast': 0, 'noRepeatRefused': 0, 'noRepeatNoOp': 0,
       'xDrawn': 0, 'zeroXLeftOut': 0, 'zeroX': 0, 'branchErroredOptions': 0, 'unavailableOptionsOverBar': 0, 'cappedOptionsOverWarn': 0, 'truncatedLogs': 0,
       'planOk': 0, 'planBad': [], 'forgeSpines': 0, 'cutsSpines': 0,
       'branchRows': 0, 'branchTimeouts': 0, 'branchTimeoutsInStep': 0, 'timeoutShare': None, 'branchErrored': 0, 'branchUnavailable': 0,
       'branchRestarted': 0, 'branchCapped': 0, 'effectSourceNullBranches': 0, 'effectSourceNullCards': 0, 'exileLinksLostBranches': 0, 'exileLinksLostLinks': 0,
       'errorsByKind': {}, 'unavailableByReason': {}, 'decisions': 0, 'branchedInFull': 0, 'screened': 0, 'fill': 0, 'stoppedOptions': 0,
       'unitsPlanned': 0, 'unitsOk': 0, 'unitsShort': 0, 'fullShort': 0, 'meanRho': None,
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


rhos = []
for f in sorted(glob.glob(D + '/b-*/plan.json')):
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
    for x in ('deckA', 'deckB'):
        if '/validation/' in str(plan.get(x)):
            out['validationBranched'] += 1
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
for f in sorted(glob.glob(D + '/b-*/phaseB/branches.jsonl')):
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
    # each spine's rows carry its band's pool and its registered seeds
    out['poolOk'] = sum(1 for n, m in lb['bySpine'].items() if n in SPINES and m['pool'] == 'random-' + SPINES[n][0]
                        and m['deckSeed'] == SPINES[n][1] and m['gameSeed'] == SPINES[n][2] and m['forgeMap'] == (SPINES[n][3] > 0))
except (OSError, ValueError, KeyError, TypeError):
    pass
print(json.dumps(out))
PY
cat > var/lab-j165-local/bin/pilot.py <<'PY'
# J165 pilot: the smoke (powered, deck seed 2099, game seed 2199, every cut on) and the atlas-selftest's G5, G6 and cuts legs,
# as one JSON object. Standard library only; no engine. Run from the clone (the self-test's folder is var/cubelab/atlas-selftest).
import json, math, os
S = '/home/justin-a/code/lab/data/lab-j165/pilot-smoke'
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
    lb = json.load(open('var/lab-j165-local/pilot-labels.json'))
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
                    'trainingRows': lb['trainingRows'], 'branchedRows': lb['branched']}
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
# the readers' self-tests on J158's and J162's files (read, never written): each must give the registered numbers
L2=/home/justin-a/code/lab/data/lab-j162
L8=/home/justin-a/code/lab/data/lab-j158
python3 -I var/lab-j165-local/bin/labels.py pauper5:confirm-j162:0:464:$L2/b-pauper5-464 synergy9:confirm-j162:0:465:$L2/b-synergy9-465 modern7:confirm-j162:0:466:$L2/b-modern7-466 ff5:confirm-j162:0:462:$L2/b-ff5-462 --out=var/lab-j165-local/labels-j162.jsonl --times=$L2/spine-times.txt --sha=f6dba5e4 > var/lab-j165-local/labels-j162.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j165-local/labels-j162.json')); a = d['a_confidentShare']; print(1 if (d['labels'], d['confident'], d['confidentForge'], d['rowsUnmatched'], d['voidLabels'], d['trainingRows'], a['point'], a['interval'], d['c_sizing7']['asRun']['labelsPer7Worker10hNight']) == (59, 7, 5, 0, 0, 0, 0.1186, [0.0339, 0.2203], 91) else 0)" > var/lab-j165-local/labels-self.txt 2>/dev/null || echo 0 > var/lab-j165-local/labels-self.txt
python3 -I var/lab-j165-local/bin/labels.py ff5:confirm-j158:0:461:$L8/b-ff5-461 peasant7:confirm-j158:0:463:$L8/b-peasant7-463 --times=$L8/spine-times.txt > var/lab-j165-local/labels-j158.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j165-local/labels-j158.json')); print(1 if (d['labels'], d['confident'], d['voidLabels'], d['voidList'], d['sameGameNotBlock']) == (32, 6, 3, ['ff5 d10 block:35>78', 'ff5 d14 block:21>71', 'ff5 d30 block:25>80,40>81'], []) else 0)" > var/lab-j165-local/void-self.txt 2>/dev/null || echo 0 > var/lab-j165-local/void-self.txt
python3 -I var/lab-j165-local/bin/reads.py pauper5:pauper5:$L2/b-pauper5-464/atlas.json synergy9:synergy9:$L2/b-synergy9-465/atlas.json modern7:modern7:$L2/b-modern7-466/atlas.json ff5:ff5:$L2/b-ff5-462/atlas.json > var/lab-j165-local/reads-j162.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j165-local/reads-j162.json')); iv = {n: (v['C1_castNow']['random']['point'], v['C1_castNow']['random']['interval'], v['C1_castNow']['verdict']) for n, v in d['iv_bySpine'].items()}; ok = iv == {'pauper5': (0.0411, [0.0126, 0.069], 'HOLDS'), 'synergy9': (0.0002, [-0.0133, 0.0136], 'NOT SHOWN'), 'modern7': (0.063, [0.017, 0.1231], 'HOLDS'), 'ff5': (0.0523, [-0.0047, 0.1313], 'NOT SHOWN')} and (d['i_sameBest']['point'], d['i_sameBest']['interval'], d['ii_rho']['point'], d['ii_rho']['interval']) == (0.5088, [0.322, 0.7], 0.2181, [-0.1188, 0.5799]); print(1 if ok else 0)" > var/lab-j165-local/reads-self.txt 2>/dev/null || echo 0 > var/lab-j165-local/reads-self.txt
python3 -I var/lab-j165-local/bin/cuts.py $L2/b-pauper5-464 $L2/b-synergy9-465 $L2/b-modern7-466 $L2/b-ff5-462 --times=$L2/spine-times.txt > var/lab-j165-local/cuts-j162.json || true
python3 -I -c "import json; n = json.load(open('var/lab-j165-local/cuts-j162.json'))['night']; print(1 if (n['spines'], n['branchGames'], n['savedShare'], n['checksSecPerKGames']) == (4, 55680, 0.0, 92.3) else 0)" > var/lab-j165-local/cuts-self.txt 2>/dev/null || echo 0 > var/lab-j165-local/cuts-self.txt
python3 -I var/lab-j165-local/bin/metrics.py $L2 > var/lab-j165-local/metrics-j162.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j165-local/metrics-j162.json')); print(1 if (d['atlases'], d['problems'], d['branchRows'], d['errorsByKind'].get('play not rebuilt on the copy (D472, D476)'), d['xDrawn'], d['planOk']) == (4, 10, 55680, 2400, 32626, 0) else 0)" > var/lab-j165-local/metrics-self.txt 2>/dev/null || echo 0 > var/lab-j165-local/metrics-self.txt
export CUBELAB_HOME_ROOT=var/cubelab/homes-J165
export LAB_DATA_DIR=/home/justin-a/code/lab/data
# the deck draw (D447, no engine): 13 spine pairs, 13 validation pairs, the smoke's pair; then s01 and v01 again into the clone
K=0
for B in pauper peasant legacy powered pauper peasant legacy powered pauper peasant legacy powered pauper; do
  K=$((K + 1)); N=$(printf '%02d' $K)
  tools/cubelab.sh decks --band $B --count 2 --seed $((2000 + K)) --cross-band 0.10 --out var/lab-j165/decks/s$N-$B-$((2000 + K))
  tools/cubelab.sh decks --band $B --count 2 --seed $((2200 + K)) --cross-band 0.10 --out var/lab-j165/validation/v$N-$B-$((2200 + K))
done
tools/cubelab.sh decks --band powered --count 2 --seed 2099 --cross-band 0.10 --out var/lab-j165/decks/p-powered-2099
tools/cubelab.sh decks --band pauper --count 2 --seed 2001 --cross-band 0.10 --out "$PWD/var/lab-j165-local/redraw/s01-pauper-2001"
tools/cubelab.sh decks --band pauper --count 2 --seed 2201 --cross-band 0.10 --out "$PWD/var/lab-j165-local/redraw/v01-pauper-2201"
DK=/home/justin-a/code/lab/data/lab-j165/decks
VK=/home/justin-a/code/lab/data/lab-j165/validation
python3 -I var/lab-j165-local/bin/drawsha.py $(ls -d $DK/s* | sort) > var/lab-j165-local/draw-spines.txt || true
python3 -I var/lab-j165-local/bin/drawsha.py $(ls -d $VK/v* | sort) > var/lab-j165-local/draw-validation.txt || true
python3 -I var/lab-j165-local/bin/drawsha.py $DK/p-powered-2099 > var/lab-j165-local/draw-smoke.txt || true
test "$(cat var/lab-j165-local/draw-spines.txt)" = "e998ad3c246d7cf5a6ab92e45a133918e2a42ff63440c2dd35507cc19b08df3c 26" && test "$(cat var/lab-j165-local/draw-validation.txt)" = "7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de 26" && test "$(cat var/lab-j165-local/draw-smoke.txt)" = "edfdc861736fb049bc1080d525269064c6776ecabd47de496463fa3dc684c931 2" && test "$(python3 -I var/lab-j165-local/bin/drawsha.py var/lab-j165-local/redraw/s01-pauper-2001)" = "$(python3 -I var/lab-j165-local/bin/drawsha.py $DK/s01-pauper-2001)" && test "$(python3 -I var/lab-j165-local/bin/drawsha.py var/lab-j165-local/redraw/v01-pauper-2201)" = "$(python3 -I var/lab-j165-local/bin/drawsha.py $VK/v01-pauper-2201)" && test "$(python3 -I var/lab-j165-local/bin/drawsha.py $DK/s01-pauper-2001)" = "a40fb5addec594bd6e97b0e7b16d78af1f08280dcc555366b3a2301feda4ff34 2" && echo 1 > var/lab-j165-local/draw.txt || echo 0 > var/lab-j165-local/draw.txt
# the engine self-tests: atlas-selftest with its G5, G6 and cuts legs (D480), then seat-identity
tools/cubelab.sh atlas-selftest --jobs 2 && echo 1 > var/lab-j165-local/selftest.txt || echo 0 > var/lab-j165-local/selftest.txt
tools/cubelab.sh seat-identity --jobs {workers} && echo 1 > var/lab-j165-local/identity.txt || echo 0 > var/lab-j165-local/identity.txt
# the readers on the self-test's own cuts legs
C=var/cubelab/atlas-selftest
python3 -I var/lab-j165-local/bin/labels.py cuts:selftest:0:464:$C/cuts nf:selftest:0:464:$C/cuts-noforge --out=var/lab-j165-local/labels-cuts.jsonl --training=1 > var/lab-j165-local/labels-cuts.json || true
python3 -I var/lab-j165-local/bin/reads.py cuts:selftest:$C/cuts/atlas.json nf:selftest:$C/cuts-noforge/atlas.json > var/lab-j165-local/reads-cuts.json || true
python3 -I var/lab-j165-local/bin/cuts.py $C/cuts $C/cuts-noforge > var/lab-j165-local/cuts-cuts.json || true
python3 -I -c "import json; l = json.load(open('var/lab-j165-local/labels-cuts.json')); r = json.load(open('var/lab-j165-local/reads-cuts.json')); c = json.load(open('var/lab-j165-local/cuts-cuts.json')); s = [json.load(open('var/cubelab/atlas-selftest/%s/atlas.json' % x))['phaseB']['schedule']['labels'] for x in ('cuts', 'cuts-noforge')]; ok = l['rowsUnmatched'] == 0 and l['labels'] == sum(s) and l['trainingRows'] == l['branched'] and l['branched'] >= 2 and r['forgeSpines'] == ['cuts'] and list(r['iv_bySpine']) == ['cuts'] and c['night']['spines'] == 2; print(1 if ok else 0)" > var/lab-j165-local/readers-cuts.txt 2>/dev/null || echo 0 > var/lab-j165-local/readers-cuts.txt
# the smoke: the powered pair at game seed 2199, 2 decisions, 25 random and 5 Forge branches an option, every cut on at that scale
P=/home/justin-a/code/lab/data/lab-j165/decks/p-powered-2099/decks
tools/cubelab.sh atlas --deck-a $P/powered-2099-00001.dck --deck-b $P/powered-2099-00002.dck --seed 2199 --phase b --decisions 2 --min-options 3 --screen 5 --early-stop 10,15,20 --branch-random 25 --branch-forge 5 --chunk 5 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j165/pilot-smoke || true
python3 -I var/lab-j165-local/bin/labels.py smoke:random-powered:2099:2199:/home/justin-a/code/lab/data/lab-j165/pilot-smoke --out=var/lab-j165-local/pilot-labels.jsonl --sha=$(cat var/lab-j165-local/sha.txt) --training=1 > var/lab-j165-local/pilot-labels.json || true
python3 -I var/lab-j165-local/bin/reads.py smoke:random-powered:/home/justin-a/code/lab/data/lab-j165/pilot-smoke/atlas.json > var/lab-j165-local/pilot-reads.json || true
python3 -I var/lab-j165-local/bin/cuts.py /home/justin-a/code/lab/data/lab-j165/pilot-smoke > var/lab-j165-local/pilot-cuts.json || true
python3 -I -c "import json; r = json.load(open('var/lab-j165-local/pilot-reads.json')); c = json.load(open('var/lab-j165-local/pilot-cuts.json')); print(1 if r['forgeSpines'] == ['smoke'] and 'smoke' in r['iv_bySpine'] and c['night']['spines'] == 1 and c['night']['branchGames'] >= 1 else 0)" > var/lab-j165-local/pilot-readers.txt 2>/dev/null || echo 0 > var/lab-j165-local/pilot-readers.txt
```
metrics: datadir = sh: cat var/lab-j165-local/datadir.txt 2>/dev/null || echo 0
metrics: fresh = sh: cat var/lab-j165-local/fresh.txt 2>/dev/null || echo 0
metrics: merged = sh: cat var/lab-j165-local/merged.txt 2>/dev/null || echo 0
metrics: has_d466_d472 = sh: cat var/lab-j165-local/has-d466-d472.txt 2>/dev/null || echo 0
metrics: has_d476 = sh: cat var/lab-j165-local/has-d476.txt 2>/dev/null || echo 0
metrics: has_d477 = sh: cat var/lab-j165-local/has-d477.txt 2>/dev/null || echo 0
metrics: has_d478 = sh: cat var/lab-j165-local/has-d478.txt 2>/dev/null || echo 0
metrics: has_d479 = sh: cat var/lab-j165-local/has-d479.txt 2>/dev/null || echo 0
metrics: has_d480 = sh: cat var/lab-j165-local/has-d480.txt 2>/dev/null || echo 0
metrics: has_d447 = sh: cat var/lab-j165-local/has-d447.txt 2>/dev/null || echo 0
metrics: xmx_unset = sh: cat var/lab-j165-local/xmx-unset.txt 2>/dev/null || echo 0
metrics: nodetests = sh: cat var/lab-j165-local/nodetests.txt 2>/dev/null || echo 0
metrics: labels_self = sh: cat var/lab-j165-local/labels-self.txt 2>/dev/null || echo 0
metrics: void_self = sh: cat var/lab-j165-local/void-self.txt 2>/dev/null || echo 0
metrics: reads_self = sh: cat var/lab-j165-local/reads-self.txt 2>/dev/null || echo 0
metrics: cuts_self = sh: cat var/lab-j165-local/cuts-self.txt 2>/dev/null || echo 0
metrics: metrics_self = sh: cat var/lab-j165-local/metrics-self.txt 2>/dev/null || echo 0
metrics: draw = sh: cat var/lab-j165-local/draw.txt 2>/dev/null || echo 0
metrics: selftest = sh: cat var/lab-j165-local/selftest.txt 2>/dev/null || echo 0
metrics: identity = sh: cat var/lab-j165-local/identity.txt 2>/dev/null || echo 0
metrics: readers_cuts = sh: cat var/lab-j165-local/readers-cuts.txt 2>/dev/null || echo 0
metrics: pilot_readers = sh: cat var/lab-j165-local/pilot-readers.txt 2>/dev/null || echo 0
metrics: pilot = sh: python3 -I var/lab-j165-local/bin/pilot.py 2>/dev/null || echo '{"smoke":{"problems":-1}}'
check: datadir == 1
check: data_free_gb >= 50
check: fresh == 1
check: merged == 1
check: has_d466_d472 == 1
check: has_d476 == 1
check: has_d477 == 1
check: has_d478 == 1
check: has_d479 == 1
check: has_d480 == 1
check: has_d447 == 1
check: xmx_unset == 1
check: nodetests == 1
check: labels_self == 1
check: void_self == 1
check: reads_self == 1
check: cuts_self == 1
check: metrics_self == 1
check: draw == 1
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

## Commands
One block a spine, in the table's order s01-s13. Every atlas command resumes what is done (the plan's cuts must match;
`schedule.jsonl` is replayed). An atlas that finds a problem exits 3 and the job goes on to the next spine (the exit
is kept in `/home/justin-a/code/lab/data/lab-j165/exits.txt`); each block appends its spine's wall time to
`/home/justin-a/code/lab/data/lab-j165/spine-times.txt`; the final checks read every folder's `atlas.json`. Each block
asserts the data folder, its 50 GB and its two deck files before it plays. **Expected wall ~40 min a spine at 7
workers (s01, s07, s13 ~45)**; the 3-h block timeout is ~4x that.
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J165: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J165: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J165
D=/home/justin-a/code/lab/data/lab-j165
n=b-s01-pauper-2101; K=$D/decks/s01-pauper-2001/decks; A=$K/pauper-2001-00001.dck; B=$K/pauper-2001-00002.dck
test -s $A && test -s $B || { echo "J165: $n: no decks under $K (the pilot draws them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2101 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 40 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j165/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J165: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J165: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J165
D=/home/justin-a/code/lab/data/lab-j165
n=b-s02-peasant-2102; K=$D/decks/s02-peasant-2002/decks; A=$K/peasant-2002-00001.dck; B=$K/peasant-2002-00002.dck
test -s $A && test -s $B || { echo "J165: $n: no decks under $K (the pilot draws them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2102 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j165/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J165: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J165: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J165
D=/home/justin-a/code/lab/data/lab-j165
n=b-s03-legacy-2103; K=$D/decks/s03-legacy-2003/decks; A=$K/legacy-2003-00001.dck; B=$K/legacy-2003-00002.dck
test -s $A && test -s $B || { echo "J165: $n: no decks under $K (the pilot draws them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2103 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j165/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J165: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J165: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J165
D=/home/justin-a/code/lab/data/lab-j165
n=b-s04-powered-2104; K=$D/decks/s04-powered-2004/decks; A=$K/powered-2004-00001.dck; B=$K/powered-2004-00002.dck
test -s $A && test -s $B || { echo "J165: $n: no decks under $K (the pilot draws them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2104 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j165/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J165: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J165: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J165
D=/home/justin-a/code/lab/data/lab-j165
n=b-s05-pauper-2105; K=$D/decks/s05-pauper-2005/decks; A=$K/pauper-2005-00001.dck; B=$K/pauper-2005-00002.dck
test -s $A && test -s $B || { echo "J165: $n: no decks under $K (the pilot draws them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2105 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j165/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J165: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J165: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J165
D=/home/justin-a/code/lab/data/lab-j165
n=b-s06-peasant-2106; K=$D/decks/s06-peasant-2006/decks; A=$K/peasant-2006-00001.dck; B=$K/peasant-2006-00002.dck
test -s $A && test -s $B || { echo "J165: $n: no decks under $K (the pilot draws them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2106 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j165/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J165: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J165: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J165
D=/home/justin-a/code/lab/data/lab-j165
n=b-s07-legacy-2107; K=$D/decks/s07-legacy-2007/decks; A=$K/legacy-2007-00001.dck; B=$K/legacy-2007-00002.dck
test -s $A && test -s $B || { echo "J165: $n: no decks under $K (the pilot draws them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2107 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 40 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j165/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J165: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J165: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J165
D=/home/justin-a/code/lab/data/lab-j165
n=b-s08-powered-2108; K=$D/decks/s08-powered-2008/decks; A=$K/powered-2008-00001.dck; B=$K/powered-2008-00002.dck
test -s $A && test -s $B || { echo "J165: $n: no decks under $K (the pilot draws them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2108 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j165/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J165: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J165: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J165
D=/home/justin-a/code/lab/data/lab-j165
n=b-s09-pauper-2109; K=$D/decks/s09-pauper-2009/decks; A=$K/pauper-2009-00001.dck; B=$K/pauper-2009-00002.dck
test -s $A && test -s $B || { echo "J165: $n: no decks under $K (the pilot draws them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2109 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j165/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J165: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J165: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J165
D=/home/justin-a/code/lab/data/lab-j165
n=b-s10-peasant-2110; K=$D/decks/s10-peasant-2010/decks; A=$K/peasant-2010-00001.dck; B=$K/peasant-2010-00002.dck
test -s $A && test -s $B || { echo "J165: $n: no decks under $K (the pilot draws them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2110 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j165/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J165: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J165: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J165
D=/home/justin-a/code/lab/data/lab-j165
n=b-s11-legacy-2111; K=$D/decks/s11-legacy-2011/decks; A=$K/legacy-2011-00001.dck; B=$K/legacy-2011-00002.dck
test -s $A && test -s $B || { echo "J165: $n: no decks under $K (the pilot draws them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2111 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j165/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J165: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J165: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J165
D=/home/justin-a/code/lab/data/lab-j165
n=b-s12-powered-2112; K=$D/decks/s12-powered-2012/decks; A=$K/powered-2012-00001.dck; B=$K/powered-2012-00002.dck
test -s $A && test -s $B || { echo "J165: $n: no decks under $K (the pilot draws them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2112 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 0 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j165/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J165: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J165: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J165
D=/home/justin-a/code/lab/data/lab-j165
n=b-s13-pauper-2113; K=$D/decks/s13-pauper-2013/decks; A=$K/pauper-2013-00001.dck; B=$K/pauper-2013-00002.dck
test -s $A && test -s $B || { echo "J165: $n: no decks under $K (the pilot draws them)" >&2; exit 1; }
t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 2113 --phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 40 --chunk 25 --checks-parallel {workers} --unit-timeout 30 --jobs {workers} --out var/lab-j165/$n || rc=$?
echo "$n $rc" >> $D/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> $D/spine-times.txt
```
cores: 1
```bash
D=/home/justin-a/code/lab/data/lab-j165
mkdir -p $D/report
: > $D/report/missing.txt
args=""; largs=""; dirs=""
for d in $D/b-*; do
  n=$(basename "$d"); s=$(echo "$n" | cut -d- -f2); b=$(echo "$n" | cut -d- -f3); g=$(echo "$n" | cut -d- -f4)
  if [ -f "$d/atlas.json" ]; then
    cp "$d/atlas.json" "$D/report/$n.atlas.json"
    cp "$d/atlas.md" "$D/report/$n.atlas.md" || echo "$n: no atlas.md" >> $D/report/missing.txt
    args="$args $s:random-$b:$d/atlas.json"; largs="$largs $s:random-$b:$((g - 100)):$g:$d"; dirs="$dirs $d"
  else
    echo "$n: no atlas.json" >> $D/report/missing.txt
  fi
done
python3 -I var/lab-j165-local/bin/labels.py $largs --out=$D/report/labels.jsonl --times=$D/spine-times.txt --sha=$(cat var/lab-j165-local/sha.txt) --training=1 > $D/report/labels.json || echo "labels.py exited $?" >> $D/report/missing.txt
head -n 20 $D/report/labels.jsonl > $D/report/labels-head.jsonl || echo "labels.jsonl: none" >> $D/report/missing.txt
python3 -I var/lab-j165-local/bin/reads.py $args > $D/report/reads.json || echo "reads.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j165-local/bin/cuts.py $dirs --times=$D/spine-times.txt > $D/report/cuts.json || echo "cuts.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j165-local/bin/metrics.py > $D/report/tool.json || echo "metrics.py exited $?" >> $D/report/missing.txt
# the validation draw, recorded for the job that will branch it: decks, bands, seeds, the reserved game seeds, the sha256
python3 -I -c "import glob, json, os; D = '$D'; vs = sorted(glob.glob(D + '/validation/v*')); rows = [{'set': os.path.basename(v).split('-')[0], 'band': os.path.basename(v).split('-')[1], 'pool': 'random-' + os.path.basename(v).split('-')[1], 'deckSeed': int(os.path.basename(v).split('-')[2]), 'reservedGameSeed': int(os.path.basename(v).split('-')[2]) + 100, 'decks': sorted(glob.glob(v + '/decks/*.dck')), 'split': 'validation', 'training': False} for v in vs]; print(json.dumps({'note': 'J165 validation draw: drawn as the spines were (D447, --cross-band 0.10), written as deck files only, never branched; no job may train on these decks or use these seeds before the validation job that branches them', 'drawSha256': open('var/lab-j165-local/draw-validation.txt').read().split()[0], 'sets': rows}, indent=1))" > $D/report/validation.json || echo "validation.json: failed" >> $D/report/missing.txt
python3 -I -c "import glob, json, os; D = '$D'; out = {}; [out.__setitem__(os.path.basename(d), {k: json.load(open(d + '/plan.json')).get(k) for k in ('deckA', 'deckB', 'seed', 'branchRandom', 'branchForge', 'decisions', 'chunk', 'cuts')}) for d in sorted(glob.glob(D + '/b-*'))]; print(json.dumps({'drawSha256': open('var/lab-j165-local/draw-spines.txt').read().split()[0], 'spines': out}, indent=1))" > $D/report/spines.json || echo "spines.json: failed" >> $D/report/missing.txt
cp $D/exits.txt $D/report/exits.txt || echo "exits.txt: none" >> $D/report/missing.txt
cp $D/spine-times.txt $D/report/spine-times.txt || echo "spine-times.txt: none" >> $D/report/missing.txt
# disarm the abort gate: a re-post of this file starts disarmed until its own pilot
rm -f var/lab-j165-local/armed.txt
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

## Abort if
abort: armed == 1 and unit_errors > 20
abort: armed == 1 and engine_errors > 500
abort: data_free_gb < 50
`armed` is 1 only from this job's pilot to its Report block (above), so the first two cannot read another run's files.
`unit_errors` counts units that did not finish (one line a unit since D465), so `== 0` means every unit finished;
**`atlas.unitsShort` is "every unit the schedule planned finished"**: with the cuts the old formula (decisions x
(R/chunk + F/chunk)) no longer holds, so each spine's `phaseB.schedule` gives it -- decisions branched in full x
(8 + 2 on a Forge-map spine, 8 elsewhere) + screened decisions x 1 -- against the distinct ok unit ids.
`atlas.fullShort` counts spines that branched fewer than min(8, listed - screened) in full. `engine_errors` counts
branch rows with `engineError`; the 500 abort stops a night whose engine has come apart, while the checks bound the
rest (all timeouts under 1% of branch games; engine errors other than step-clock timeouts at 50). No abort reads
the timeouts alone.
`atlas.problems == 0` covers branch errors and unavailable options past the 0.1 share (D466, D470), a capped branch
not scored a draw (D478), G6's `zeroX` (D471) and unreadable frame logs. **A random library deck can meet a card no
atlas has played**: a new tool gap fails this check (as the Rider did J162's), and its spine's exit 3 is kept while
the other spines play on; the summary names it with its error text and what it cost. An option capped past 0.25 is
a warning (D478's addendum), reported, never a failed check.

## Report
collect: /home/justin-a/code/lab/data/lab-j165/report/*.atlas.md
collect: /home/justin-a/code/lab/data/lab-j165/report/*.atlas.json
collect: /home/justin-a/code/lab/data/lab-j165/report/labels.json
collect: /home/justin-a/code/lab/data/lab-j165/report/labels-head.jsonl
collect: /home/justin-a/code/lab/data/lab-j165/report/reads.json
collect: /home/justin-a/code/lab/data/lab-j165/report/cuts.json
collect: /home/justin-a/code/lab/data/lab-j165/report/tool.json
collect: /home/justin-a/code/lab/data/lab-j165/report/validation.json
collect: /home/justin-a/code/lab/data/lab-j165/report/spines.json
collect: /home/justin-a/code/lab/data/lab-j165/report/exits.txt
collect: /home/justin-a/code/lab/data/lab-j165/report/spine-times.txt
collect: /home/justin-a/code/lab/data/lab-j165/report/missing.txt
The summary says, for Justin, in plain words and numbers only:
- **The population, first line:** random library decks by band, drawn as the census draws them, on the D476-D480
  tool and the cut design (the pin); `training: true`, `pool: random-<band>`; never pooled with any earlier atlas.
- **Labels per night** (`labels.json` (c), `c_sizing7`, `c_sizingRead`): labels and confident labels per spine, per
  band and for the night, per 7-worker 10-h night; **the sizing read against the review's ~25-27**; what 1,000 labels
  and 1,000 confident labels take at this rate.
- **What the cuts saved** (`cuts.json`): branch time as run against the projection without them, early stopping's and
  the screen's shares, against the review's 18-20%; the checks' wall per 1,000 branch games against J162's serial 93
  s; the barriers' idle share; decisions screened, filled from under 3 options, options stopped.
- **The tool on 26 new decks** (`tool.json`): `effectSourceNull` and `exileLinksLost` (branches, cards / links),
  `branchRestarted`, `branchCapped` (and any option past the warning), timeouts and in-step timeouts, unavailable by
  reason, errors by kind, the atlas warnings, any problem named with its card and decision.
- **(a)** labels and confident labels per spine, band and kind and by option count, with the confident share's
  interval (pooled, by band, by spine, over Q), `confidentForge` beside on s01, s07, s13.
- **(b)** median gap, mean regret, settled share by band.
- **(i)-(iii)** as `reads.json` gives them on s01, s07, s13, pooled and by spine.
- **(iv)** C1 on s01, s07 and s13, **HOLDS** or **NOT SHOWN** by the registered rule, the Forge map beside; the three
  pooled and the other ten's random-map C1 as information; J158's and J162's per-pair verdicts beside, never pooled.
- **(v)** the guardrail, G5 and G6 counts and `payfail`, per band.
- **Per spine,** one line: band, deck seed, the two decks' makeups, game seed, Forge map on or off, the baseline
  (turns, winner), decisions listed / branched in full / screened / filled, labels, confident, options stopped,
  branch errors, timeouts, capped, wall time.
- **The validation draw** (`validation.json`): its 13 pairs, seeds 2201-2213, reserved game seeds 2301-2313, its
  sha256, and that no spine touched it.
- **The checks,** with any exit in `exits.txt` and anything in `missing.txt` explained.
- **The intervals' coarseness:** one spine a pair, so every per-spine interval is decision-level, and each band has
  3-4 spines; say so beside each.
- **The label set:** where `labels.jsonl` is, its row count, that the spine folders are kept for rung 4, and that
  these are the first rows marked `training: true`.
- **No verdict** beyond (iv)'s: any other surprise is a candidate until a fresh draw shows it.
