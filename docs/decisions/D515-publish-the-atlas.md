## D515 — The move atlas goes public: its label pipeline moves into the repository as `tools/atlas/`, a first dataset release is built from D508's six nights, scrubbed of paths and rules text, under CC BY 4.0, and the repository is checked for going public

*Branch `pc/d515-publish-atlas`, off main `72302c69` (D514's merge). D515–D518 were reserved for this lane
(`node tools/decisions.mjs next` gave D515); only D515 is used, and D516–D518 stay unused. Nothing under
`bridge/src`, `tools/cubelab/`, `forge-home/` or `fixtures/cubelab/` changes, so it is free under D509: the seat,
its record and the atlas's engine half are as they were.*

**2026-11-06**

**Context.** The move atlas (D451) has run fifteen lab nights. Its engine half, `tools/cubelab.sh atlas` and the
search seat's code, is in this repository; its second half, the eleven Python scripts that read a finished spine
folder into label rows and a night's reads, lived only as heredocs inside each night's job file in the private
`pc-jobs` queue, copied forward night by night. D508's population (J186, J187, J188, J190, J191, J193) is the
largest set of label rows made on one frozen seat (D509), and the owner was asked whether to publish it and how.
The recommendations put to him: (1) move the label pipeline into the main repository; (2) scrub, so that no path
from this PC, no card rules text and nothing of the personal tier ships; (3) build the first release as one file
with a README for him to look at; the main repository alone goes public, while the lab runner's results repository
(`pc-results`), the job queue (`pc-jobs`) and ForgeCoach stay private. The owner, 2026-11-06: *"Yes, we should
publish the generator too"* and *"Sure, let's follow your recommendations."* He flips the repository public and
uploads the dataset himself.

**Decision.**

1. **The label pipeline is `tools/atlas/`.** The eleven scripts J193 ran (`labels.py`, `reads.py`, `cuts.py`,
   `ncurve.py`, `compare.py`, `metrics.py`, and the pilot's `draws.py`, `drawsha.py`, `deckcheck.py`, `deckcode.py`,
   `pilot.py`), one file each, each with the GPL header `tools/lab/warehouse.py` has and a docstring saying what it
   reads and writes; the job's own comment block stays below it as the record of how the definitions grew. **The
   code is J193's byte for byte** but for what named the lab machine and one constant: the data folder (argument 1
   or `ATLAS_DATA`), the job folder (`ATLAS_LOCAL`, defaulting to the old repo-relative `var/lab-j193-local`) and
   the scan caches' stamp (`ATLAS_SCAN_STAMP`, default `J193 v5`, so an older night's caches can be read). No
   `/home/` path is left. A later atlas job runs these at its pin instead of writing heredocs; the five pilot
   scripts and `metrics.py`'s spine table carry J193's seeds and are edited per night, as they were.
2. **The dataset, v1** (`tools/atlas/release.py`), one folder and its zip under `var/release/` (gitignored):
   - `labels.jsonl`: every label row of the six nights, J186's made again with `labels.py` exactly as its report
     would have (J186 stopped before its report; J187's job file names the arguments, and the rows equal those
     J186's own `labels.py` makes, byte for byte), **minus D509 point 4's excluded units**: J186's s11 d13–d16 (a
     redaction failure on an all-hidden target record, D510) and J187's s03 d23, d25, d27 and d29 (all 975 of their
     branch forks not the position, D511; the decisions were read off the branch rows' `forkProblems`). Every field
     of contract v6 is kept, `night` is added, and `deckA`/`deckB` become `decks/<night>/<deck folder>/<file>.dck`
     (the night is in the path so it resolves from the release's root);
   - `branches/<night>/<spine>.branches.jsonl`: each spine's `phaseB/branches.jsonl`, the excluded decisions left out.
     A row is one branch game's outcome (below); it carries no frame-level text;
   - `atlas/<night>/<spine>.atlas.json`: each spine's summary as it ran, every option of `phaseB.decisions` given its
     scrubbed play identity from `phaseB/baseline.json`, so the check can hold its label;
   - `decks/<night>/<deck folder>/*.dck`: the two decks each spine played;
   - `README.md` (what it is, how it was made, the nights, the exclusions, the known limits, the licences, and the
     field dictionary copied from `docs/guides/move-atlas.md`, so it is written once) and `MANIFEST.json` (sha256
     and bytes per file, the counts, the exclusions, the source commit).
   **No frame logs** (about a gigabyte a spine): the rows name where they sit, relative to a night's data folder,
   and the README says they exist and how to make them again.
3. **The scrub.** A play identity is `SearchPolicy.playIdentity`'s nine `|`-separated fields — the card's name,
   spell or ability, the face, the alternative cost, AltCost, the may-play host, free, the optional costs, and
   `matchKey`, Forge's description of the play, which renders the card's rules text; **the ninth field and anything
   after it is dropped** ("Holy Light|spell|Original|-|-|-|-|"). An `activate:` option's label is the card's name
   followed by the ability's text cut at 60 characters (every one of the 2,313 cast and activate options in the
   six baselines starts with its identity's name, read before deciding); **it becomes the name**, and the token
   keeps the ability's index. Cast, attack and block labels are names and stay (a cast label can carry a face,
   "Bonecrusher Giant — Stomp", or "(may play)"). atlas.json's warnings and problems have each raw label replaced.
   Every absolute path becomes relative. **Card names stay**: the Fan Content Policy allows them; Wizards' text does
   not ship.
4. **The check** that ends every build, and the zip is not written when it finds anything: no file holds `/home/`,
   `justin` in any case, or `CARDNAME` (Forge's placeholder in rules text); no identity in `labels.jsonl` or an
   atlas file has a ninth field; an activate option's label is its identity's name, and in `branches/` the label
   the atlas file gives the same decision and option; every row's decks are in the release. `release.py --check
   <folder>` runs it alone, and `tools/atlas/tests` plants each case.
5. **The licences.** The data, CC BY 4.0, attributed as *"mtg-table move atlas, https://github.com/jalirkan/mtg-table"*;
   the generator, GPL-3.0-or-later, as the whole repository (hard rule 7); and the Wizards of the Coast Fan Content
   Policy's notice: card names and Magic are Wizards' property, the dataset is unofficial Fan Content, not
   approved or endorsed by Wizards. The engine is named with its pin: Forge 2.0.14,
   `3c0a7c385b9207e593fe149255e00d1cd7e556809f138568d07e3828b78e5dd9` — every baseline frame log of the six
   nights carries this jar's sha256, checked one spine a night.
6. **The seat's configuration.** The atlas plays no search seat: option 0 is Forge's Default AI's choice in the
   baseline, and the branches are played by the random seat (D488's policy, D498's redeal, D508's gate) or by Forge
   on both sides. The ladder's search-v2 hash `cdd55e02a89c` is a ladder player's (D514) and **does not apply**; the
   README says the seat is the random seat, frozen for the population (D509), and names no configuration hash.
7. **The reproduction route** is `docs/guides/move-atlas.md`: what the atlas is (cited: D451, contract v6, D508,
   D509), the pipeline, one spine on another machine with Forge 2.0.14 (the deck draw, `tools/cubelab.sh atlas` at
   J193's settings, the frame-log scan, `labels.py`), the field dictionary of a label row, the release and the
   fixture. `fixtures/atlas/night/` is J193's s07 cut to three branches an option by `make_fixture.py`, and gate step
   **12n** (and CI's `redaction` job) runs `tools/atlas/tests` over it: `labels.py` and `compare.py` against golden
   counts, a release built from it twice to the same bytes, and the check's plants.
8. **What stays the owner's.** Flipping the repository public; uploading the zip and its listing (Kaggle, Hugging
   Face, or neither), with the title, the description and the attribution he wants (the attribution line above is a
   default he may change, in `release.py`'s `ATTRIBUTION`); and whatever the public-repo check below leaves for him.
   Nothing here pushes, publishes or uploads.

**Rejected.**

- **Shipping the identities whole.** The ninth field is Forge's rendering of the card's text; with it the rows
  would carry Wizards' rules text for every card played. The play's kind, face and costs survive without it.
- **Dropping the activate labels' text by a regular expression** (a cost in braces, a colon). Card names hold
  colons ("Circle of Protection: Black") and abilities need no braces ("Reconfigure"); the identity's own name is
  exact, and a label of any other shape stops the build.
- **The frame logs in v1.** About 77 GB for 77 spines, and their state frames carry text the scrub was not built
  for; a v2 can add them per spine with a scrub of their own.
- **Re-making J187–J193's rows with the repository's `labels.py`.** Their own reports' rows are what was read and
  are byte for byte what `labels.py` makes (Measured), so the release uses them; only J186, which has none, is made.
- **Excluding J187's two s06 logs and J191's two s08 logs.** Both were the redaction checker's misreads (D512, D513
  admit them); nothing hidden was shown, and D509 point 4 leaves out only a night's real faults.
- **Excluding J187's s06 d21 (Lively Dirge's refused cast).** A queued seat fault (D509), not a night fault; the row
  says so in `refusedCastOptions` and `lostCastOptions`.
- **Writing the field dictionary twice.** The guide holds it between two markers; `release.py` copies it into the
  README and the tests hold every key of a row to it.

**Measured.**

- **The sources are one.** The eleven heredocs of `pc-results/drafts/J193-atlas-4b-night-fifteen.md` (lines 633,
  698, 712, 950, 974, 1512, 1720, 1891, 2530, 2668, 2793) and the runner clone's `var/lab-j193-local/bin/*.py`
  (2,221 lines) are identical, file for file (`cmp`).
- **J171's self-comparison**, on `lab-j170` with the pilot's own arguments: `compare.py` gives `selfMatch` 13, 13
  spines and `selfMatchNight` 1; `labels.py` (101 labels, 28 confident, the registered bootstrap and sizing),
  `reads.py`, `cuts.py` and `ncurve.py` give every number J193's pilot required; and on J162's and J158's nights so
  do `labels.py`, `reads.py`, `cuts.py` and `metrics.py` (`metrics-self` 1).
- **J193 reproduced byte for byte** from `lab-j193` with its report's arguments: `labels.jsonl` (180 rows, 89
  labels, 41 confident), `labels.json`, `ncurve.json`, `reads.json`, `cuts.json`, `compare-j191.json` and
  `tool.json` (metrics.py's main mode) are each identical to `pc-results/results/J193/`'s, and `tool.json` equals
  every `atlas.*` value of the runner's `metrics.json`. `metrics.py --scan` on s06 gives its report's cache byte for
  byte, and on s12 the same JSON in another key order (the worker pool's completion order).
- **J191, J190, J188 and J187**: `labels.jsonl` byte for byte their reports' (171, 176, 168, 163 rows) with
  `ATLAS_SCAN_STAMP` set to the night's stamp; J191's `labels.json`, `ncurve.json`, `reads.json` and `cuts.json`
  identical but for `c_sizingRead`'s beside-night key and two sentences, which name the night (`--j190` against
  `--j191`). Without the stamp an older night's caches are read for their lost casts only and the four
  refused-cast fields are null, which is why the stamp became a variable. **J186**: 153 rows, 81 labels, 21
  confident, 0.349 confident a worker-hour [0.216, 0.533] on 60.2 worker-hours — J187's by-hand numbers — and the
  rows byte for byte J186's own `labels.py`'s.
- **The deck draw reproduces**: `tools/cubelab.sh decks --band legacy --count 2 --seed 3691 --cross-band 0.10` at
  this branch gives J193's s07 draw (`drawsha.py` 1686096d…57cf, both decks' sha256 equal).
- **The release**, built at `6a131387` (the commit that added `release.py`): `var/release/move-atlas-v1.zip`,
  **8,900,834 bytes** (sha256 `fbd46816d1a1e97c7371bac432a257522c0d8256120c462f9662fffea139891d`), 311 files and
  112,534,537 bytes unpacked: **1,003 label rows**, 508 complete labels, **154 confident**, 222 partial, 74
  futility controls (1 confident), 273 screened; 77 spines (12 + 13 × 5); 154 decks; **338,895 branch rows**
  (342,964 on disk, less 3,825 of the excluded decisions and 244 of J186's unfinished s13); 8 rows left out. By
  night: J186 149 rows / 77 labels / 19 confident; J187 159 / 83 / 28; J188 168 / 85 / 24; J190 176 / 86 / 17;
  J191 171 / 88 / 25; J193 180 / 89 / 41. The scrub check finds nothing, and a grep of the folder for `var/`,
  `lab-j1`, `{T}`, `Sacrifice` and `until end of turn` finds nothing either.
- **The fixture**: `labels.py` over it gives 13 rows, 8 labels, 6 confident, 2 partial, 3 screened, every key but
  the paths, the options' scrub and the branch-row sums equal to J193's own s07 rows; the tests run in about half a
  second.
- **The gate**: `rm -rf bridge/out && ./tools/check-all.sh` at `cc52d3b3` (this file's commit but this line), green: `check-all OK`, `wall 530.9 s for 61 jobs whose seconds sum to 1881.8 s; load average (1 min) 1.64 at the start, 13.72 at most, 3.92 at the end`, `GATE_JOBS=4`, run `20261106-083240-3102164`; 12n took 0.6 s.

**The public-repo check** (2026-11-06, on `72302c69` plus this branch; read, mostly not edited).

- **`git grep -l "justin-a"`: 93 tracked files.** 77 are history — `docs/evidence/` (35), `docs/decisions/` (30)
  and `docs/research/` (12) — dated records of what ran where, left as they are. The rest:
  - **the owner's machine convention, a follow-up for him**: `CLAUDE.md` (hard rule 9's working directory and the
    engine's path) and `docs/claude-md-rules.txt` (its manifest), `NOTICE` (the jar's path), `.gitignore` (a
    comment), `config.json` (`forgeJar`, and `labArchiveRoot` `/mnt/e/forgecoach-archive`; `wsAllowedOrigins`
    names `https://jalirkan.github.io`, public anyway), `PLAN.md` (worktree paths in eight places);
  - **guides with this PC's paths as examples**: `docs/guides/cube-lab.md` (two lab-data commands),
    `gpu-day.md`, `java-for-typescript-people.md`, `lab-runner.md`; `scripts/tunnel/config.yml.example` (a
    credentials-file path with a placeholder id); `tools/javap-seam-diff.sh` (a usage comment);
    `tools/runner/PC-JOBS-README.md` (the rewrite rule it documents);
  - **data**: `tools/cubelab/engine-unplayable.json`'s ten `evidence` strings name lab-data folders;
  - **tests**: `web/test/lab-runner.test.ts` uses the path as a planted leak, on purpose;
    `web/test/cubelab-balance-model-v2.test.ts` defaults its optional lab data to this PC's folder (overridable).
  None is a secret; each says where this PC keeps things.
- **Secrets: none found.** Tracked files and the whole history (`git log --all -p -G`) were searched for private
  keys, GitHub, Anthropic, AWS, Slack, Google and Tailscale key shapes, bearer tokens and `password`/`secret`/`api
  key` assignments. The hits are a fake key in `tools/bug-reports-selftest.mjs` (planted to prove `bug-reports.mjs`
  redacts it), that file's own redaction pattern, two test tokens (`coach-helper-selftest.mjs`,
  `match-launcher-selftest.mjs`) and a fixture file name; the earlier prose and card-name hits are the same. No key,
  certificate or credentials file is tracked or was ever committed (every path in the history checked).
- **The history's author email.** 206 commits on `main` are authored as `jalirkan@gmail.com` (the rest as
  `27876133+jalirkan@users.noreply.github.com`, `noreply@anthropic.com` and the runner's `runner@localhost` on
  lab branches); once the repository is public, the address is in its history. Accepting that or rewriting the
  history is the owner's call.
- **`.claude/` is untracked** (no file under it has ever been committed) **but not ignored**: a `git add -A` in
  the main checkout would add it. `/personal/` is ignored (anchored, D190), and no `*.jar` is tracked.

**Residuals.**

- The five pilot scripts and `metrics.py` are J193's night: the next atlas job edits their seeds and spine table, as
  its job file used to. `labels.py`'s beside-night option (`--j191`) and `compare.py`'s note name J191; a generic
  option is a change to the label reads' text, held until a night needs it.
- J186's refused- and lost-cast fields are null: its frame-log scan never ran. `metrics.py --scan` over its twelve
  spines would fill them for a v2.
- `tools/README.md`'s table is not held to the files under `tools/` by any test (this lane added its rows by hand).
- The root `CLAUDE.md` counted 55 gate jobs while the gate ran 60 (12i–12m were never counted); this lane recounts
  from the job table, 61 with 12n. Its gate timings (about four minutes) are older than the last month's gates.
