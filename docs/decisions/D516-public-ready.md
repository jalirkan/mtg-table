## D516 — The repository is made ready to be public: machine-neutral paths, a short README with the old one as the handbook, CONTRIBUTING, SECURITY and CITATION, a dataset release that carries its own licence and citation, and a public check in the gate

*Branch `pc/d516-public-ready`, off main `5ccc464b` (D515's merge). `node tools/decisions.mjs next` gave D516,
whose reservation D515 released at its merge. Nothing under `bridge/src` changes but `Config.forgeJar()`'s
reading of one key, and nothing the seat plays changes (D509): the engine-unplayable list's cards are as they were.*

**2026-11-06**

**Context.** D515 checked the repository for going public and left the owner three calls: this PC's paths in
tracked files, the history's author email, and `.claude/` untracked but not ignored. The owner read the check and
answered, 2026-11-06: *"Yeah that all seems okay. If you want, we can fix the file paths and organization to
something more suitable. This is basically contributing to the public so let's make it feel official and
trustworthy."* The owner accepts the owner's address as author and committer on the history and the owner's first name in the docs. Only
this repository goes public; `pc-results`, `pc-jobs`, ForgeCoach and the lab runner's data stay private. The owner flips
the repository and uploads the dataset himself.

**Decision.**

1. **No live file names this machine.** `config.json`'s `forgeJar` is
   `~/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar`, and every reader of it expands a **leading `~/`**
   to the home directory and nothing else (not `~user/`, not a `~` inside a path): `tools/config.sh` (which
   `check-forge.sh`, `bridge/run.sh`, `bridge/build.sh`, `make-forge-home.sh` and the gate source), `Config.forgeJar()`
   (`user.home`), `tools/audit-deck.mjs`, `tools/cubelab/census.ts` and `deckcensus.ts`, `tools/leaks/cli.ts` and
   `tools/ml/rollout_labels.py`. `FORGE_JAR` in the environment still wins (hard rule 9). `labArchiveRoot`
   (`/mnt/e/forgecoach-archive`) stays: a mount point, not anyone's home. `CLAUDE.md`'s hard rule 9 says *the repo
   root* and *`config.json` at the repo root*; *Environment* and *Never write outside this repo* say `~/forge`,
   `~/.forge` and *this repository's checkout* — the same meaning on any machine. `NOTICE`, `.gitignore`,
   `tools/javap-seam-diff.sh` and the tunnel's example config say `~/`; `tools/runner/PC-JOBS-README.md` says what
   the runner really rewrites (the checkout path, `$HOME/code/<repo>` written out, or its `--home-<repo>` flag).
   The balance-model v2 test reads its lab data from `CUBELAB_LAB_DATA` and `CUBELAB_LAB_FACTS`, else from `~/code/lab/` under
   the home folder (a conventional place, not a machine's), and skips when the files are absent. `tools/cubelab/engine-unplayable.json`'s evidence names *lab data lab-jNNN/…* and *pc-results
   (private) results/JNNN/…*; its cards, `since` and reasons are unchanged, so every deck draw is unchanged.
2. **The dated history is respelled, mechanically.** In `docs/` (evidence, decisions, research, guides and the
   rest), `PLAN.md` and `DECISIONS.md`, the owner's home folder's absolute path became `~/` and nothing else changed;
   `DECISIONS.md` stays frozen against new entries (D379), and a path's spelling is not an entry. By hand: three
   research reports' scratchpad paths are named as such; two evidence files' paths in another machine's home folder
   and report 04's home-folder placeholder became `~/`; `docs/evidence/d487-null-targets.py`'s `ZIP` expands its `~/`; D515's
   inventory sentence and PLAN's copy of it name *the owner's home folder* instead of spelling it (its counts are
   history and stand), and two of D515's lines name *a home folder* and *a Gmail address* rather than the strings.
3. **The front door.** `README.md` is now 160 lines for a stranger: what this is, two pictures
   (`docs/images/arena.jpg`, the arena mid-game of the Doom Legion replay, and `docs/images/board.jpg`, the 2D
   board at the same moment), the quickstart, *The move atlas dataset* (what it is, v1's counts, the licence split,
   the guide, and where the zip will be once the owner uploads it), *How this is built* (kept: Claude writes the
   code under the owner's review, which a reader should know), the full NON-GOALS list (still binding: `CLAUDE.md`'s
   *Scope*), where to read next and the licence. The old README moved **whole** to `docs/handbook.md` with every
   heading kept, so a reference to one of its sections still names one; its *How this is built*, *What you may not
   add* and *NON-GOALS* sections now point at the one copy each (README, `CONTRIBUTING.md`, README), so no list
   is written twice. Prose that named a README section now in the handbook names the handbook. One sentence was
   added to a NON-GOAL: *no release artifact* is about this program, and the dataset is data (D515).
4. **`CONTRIBUTING.md`** (a branch per change, the conventions, a decision file numbered by `decisions.mjs next`,
   the gate before merge and CI's half, *What you may not add* moved from the README with its decision numbers and
   this decision's line, GPL-3.0-or-later, the owner reviews and merges, a hobby project with no support promise);
   **`SECURITY.md`** (localhost by design; what `--lan`, the draft room, the table and the tunnels expose and under
   which token, citing `docs/security/endpoints.md`; report by issue, saying in the title when a running game or a
   token is exposed); **`CITATION.cff`** (the software, `mtg-table contributors`, GPL-3.0-or-later; the dataset as
   its first reference, CC-BY-4.0, v1, 2026-11-06, with D515's attribution line); `.gitignore` gains `/.claude/`.
5. **The release carries its licence and citation.** `tools/atlas/release.py`'s README opens with the YAML front
   matter Hugging Face reads as a dataset card (`license: cc-by-4.0`, `pretty_name`, `size_categories: 1K<n<10K`,
   `language: en`, four tags); `LICENSE.md` names CC BY 4.0 on the measurements with its canonical URL and the
   attribution line, Wizards of the Coast's material (card names, the deck lists) as not licensed and present under
   the Fan Content Policy, and the generator's GPL-3.0-or-later, and reproduces no legal text; `CITATION.cff` is the
   dataset block of the repository's. The manifest and the scrub check cover both as they cover every file, and
   `tools/atlas/tests` requires the three files in a built fixture release and the two citations to agree.
6. **The public check is a gate step and a CI step.** `tools/public-check.sh` greps every tracked text file (never
   `var/`, `personal/` or a binary) for a home-folder path, the owner's home-folder name, a personal mail address
   and the running machine's host name, and fails with each hit's file:line. Its `ALLOW` list is three paths, each
   with its reason: the script itself, and two tests whose planted leaks prove a scrub works
   (`web/test/lab-runner.test.ts`, `tools/atlas/tests/test_atlas.py`). `--selftest` plants each string in a scratch
   repository. Gate step **2c** runs both (62 jobs, 46 serially); CI's `redaction` job runs both.

**What deliberately did not change.**

- **The commit history.** The owner accepts that address as author and committer; nothing is rewritten (D515's
  follow-up 2, accepted).
- **The owner's first name** in the docs and tools (D515's inventory: 88 files). It is the owner's to keep, and it stays.
- **The code directories.** `bridge/`, `web/`, `tools/`, `scripts/`, `docs/`, `decks/`, `cubes/`, `fixtures/`,
  `forge-home/` and `notebooks/` stay where they are: every document links into them, and moving them buys a
  stranger nothing a README does not.

**Rejected.**

- **Expanding `~` everywhere a path is read** (`~user`, a `~` mid-path, every config key). One key needs it, and
  the shell's own expansion rules differ from Node's, Python's and Java's; one leading form, written the same way in
  seven readers, tested in three and proven in the fourth (Java) by a boot, is the whole of the need.
- **Leaving a second copy of the NON-GOALS in the handbook.** Two binding copies drift; the handbook's heading
  stays, pointing at the README's.
- **Building the banned strings at run time** in the tests that plant them, so the public check needs no
  exception. That hides from the check exactly the files whose job is to hold those strings; an allowed path with
  its reason is honest.

**Measured.**

- With no `FORGE_JAR` in the environment: `./tools/check-forge.sh` prints
  `3c0a7c385b9207e593fe149255e00d1cd7e556809f138568d07e3828b78e5dd9`; `./tools/make-forge-home.sh` derives `res/`
  from the tilde path; `./bridge/build.sh` is green; `mtgtable.Smoke` boots through `bridge/run.sh`, and again by a
  direct `java` call with the jar on the class path and no `FORGE_JAR`, so `Config.forgeJar()`'s own expansion
  printed `forge jar = <home>/forge/…` and `SMOKE OK`.
- `web/test/forge-jar-path.test.ts`: `config.sh` (a scratch copy, `HOME` pointed elsewhere) expands `~/x.jar` and
  `~/forge/<jar>`, leaves `/opt/…`, `~other/…` and `/opt/~/…` alone and lets `FORGE_JAR` win; `census.ts` and
  `deckcensus.ts` expand the same way. The balance-model v2 test with both variables exported: 7 of 7, its lab half
  43 s.
- `git grep` for the owner's home-folder name outside `var/`: 94 files before this branch, 2 after (the lab runner's
  leak fixtures and the public check itself); `tools/public-check.sh` clean, about 0.02 s, and its selftest catches its four plants.
- **The release**, rebuilt with the guide's commands at `692eb0a8` (the commit that last changed `release.py`):
  `var/release/move-atlas-v1.zip`, **8,903,513 bytes**, sha256
  `0f7d83c61d8cb91b06cee6b751233476f03f7f8e4ed0d92385bf0ac56c9a6c11`, 313 files and 112,594,485 bytes unpacked.
  Against D515's zip (`c8740753…`): its 311 entries are all present, every data file byte for byte the same; README
  and MANIFEST changed, `LICENSE.md` and `CITATION.cff` are new. The scrub check finds nothing; the counts are
  D515's (1,003 rows, 508 labels, 154 confident, 77 spines, 338,895 branch rows, 154 decks).
- **The gate**: green on `e0281b6c` (`rm -rf bridge/out && GATE_JOBS=2 WSPORT=9900 ./tools/check-all.sh`: `check-all OK`, 62 jobs, wall 974.4 s, job seconds 1926.4 s, load average 1.03 at the start, 84.73 at most, 8.26 at the end; run `20261106-103014-3628241`).
