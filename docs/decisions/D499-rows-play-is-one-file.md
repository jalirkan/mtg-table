## D499 — A game's rows are one play: a begin and its end in one rows file; a killed attempt's unfinished play is abandoned when its key ended elsewhere, a stuck game's ok:false play is superseded by its retry's ok:true one, and a key that ended ok:true twice is a problem (amends D450's rows check, D465's resume, D466)

*Branch `pc/d499`, off `main` `60177314` (#225, D497's merge). D499 was reserved for this lane (D498 is a parallel lane's).
Amends **D450**'s id check (`tools/cubelab/rowscheck.ts`), read by the move atlas (**D451**, **D466**, **D480**'s parallel
checks) and by `census-play` / `census-replay`; follows from **D465** point 4, the unit's re-run.*

**2026-11-01**

**Context.** J181 (atlas night six), spine `b-s13-pauper-2191`, failed `atlas.problems == 0` on 8 problems, every one
`atlas:d28:forge:o2:b39: seat Drafter B's row names id 250 (attack:…), which its own log never shows it`
(`lab-j181/report/b-s13-pauper-2191.atlas.json`). The evidence (`lab-j181/b-s13-pauper-2191/phaseB/`, read only):

- **The unit hung.** `d28-forge-25` (decision 28, the Forge continuation, branches 25–39) stopped answering on its first
  attempt: worker 2's log (pid 1522578) carries Forge's `java.util.concurrent.TimeoutException` in
  `forge.ai.AiController.chooseSpellAbilityToPlayFromList` ("AI eval thread at timeout"), and the unit watchdog killed it
  after 1800 s. `units.jsonl`: `"attempts":2,"attemptErrors":["no answer in 1800 s (hung)"]`.
- **D465 re-ran it, as designed.** The branches with no `branches.jsonl` row went to worker 3 (pid 1522575), including
  `o2:b39`, the branch in flight at the kill. The re-run played it to the 120 s branch timeout and wrote its end
  (`ok:false`), its `branches.jsonl` row and its frame logs, over the names the killed attempt had used.
- **Both plays are in the rows folder.** `rows/rows-1522578.jsonl` ends with b39's `begin` and 57 rows to turn 38, and no
  `end`; `rows/rows-1522575.jsonl` holds b39's `begin`, 55 rows and its `end`.
- **The check merged them.** `collectRows` kept one entry per game key across every file, so b39's 112 rows from two
  different games were checked against the re-run's log. Id 250 was a card of the killed play alone.
- **It was not the only one.** The same spine's `d28-forge-0` hung too (worker 1, pid 1522574), and its `o2:b21` has 20
  rows with no end in `rows-1522574.jsonl` beside a complete play in `rows-1522573.jsonl`. Its rows happened to name only
  ids the re-run's log showed. A scan of every atlas rows folder of J173, J176, J177, J180 and J181 finds three more
  spines whose plays passed by the same luck: J173's `b-s04-powered-2117` (8 plays, 255 rows) and `b-s06-peasant-2119`
  (21 plays, 487 rows), and J176's `b-s06-peasant-2132` (11 plays, 324 rows, from a spine resumed after a restart). No
  atlas folder holds a key that ended twice, and none holds a row outside a `begin`…`end`.
- **Nothing else noticed.** `atlas.repeatedPlays == 0` passed: the job defines it over the baseline's listings (two
  options with one play identity, D483), not over the rows.

**Every reader of a rows folder, and what each did.**

| reader | what it read | before D499 |
|---|---|---|
| `rowscheck.ts` `collectRows` / `checkRowsDir` (the atlas, serial and `--checks-parallel`; `census-play` and `census-replay` in `full` mode) | each game key's rows across all files, one game | **the fault** |
| `rowscheck.ts` `rowBytesByGame` (`census-play`'s size per game) | each key's bytes across all files | counted a killed attempt's bytes too, and both plays of a retried stuck game |
| `censusreplay.ts` `gameLines` | one file, the last play that ended `ok:true` | already per play |
| `tools/ml/distill.py` `read_rows` / `stats` | per file, rows pending until their `end`; unended dropped (`gamesUnended`); a repeat dropped (`gamesDuplicate`); atlas rows barred (`notForTraining`) | already per play |
| the atlas's labels and maps (`atlas.ts`, `atlascuts.ts`, the job's `labels.py`) | `branches.jsonl` and `baseline/rows` (one worker, one play) | not the rows folder of the branches |

`tools/lab/*.py` and the rest of `tools/ml/` read no rows folder.

**Decision.**

1. **A game is one play.** `checkRowsText` collects plays, not keys: a `begin` opens its key's play in that file, a row joins
   its key's open play, an `end` closes it. A play still open at the end of its file, or when its key begins again in the
   same file, never ended. Each ended play keeps its `end` line's `ok`. A row with no open play (before its key's `begin`,
   or after its `end`, in its file) is an **orphan**: counted (`orphanRows`) and not id-checked. Before D499 it joined its
   key's merged game and was checked. No writer makes one: `DistillRows` writes a game's rows only between its `begin` and
   its `end`, and the scan above found none. An `end` with no open play closes nothing; J176 holds such lines (an `ok:false` end with no begin and no rows, a branch whose
   game never began).
2. **Which plays are the game** (`gamePlays`), per key, from each play's `end` alone:
   - **some play ended in its own file:** the plays that never ended are **abandoned**: a killed attempt's, which D465's
     re-run replayed over frame logs it rewrote. Their rows stay in the shape check (they are on disk, and a name in them
     would still be a leak) and are left out of the id check;
   - **of the ended plays, one ended `ok:true`:** it is the game. The plays that ended `ok:false` are **superseded**,
     counted (`superseded`) and left out of the id check, never a problem. This is census-play's retry of a stuck game:
     a game that timed out and whose thread would not stop gets `end ok:false` from `CubeLab.java` (written and flushed),
     the worker exits 3, the pool calls it an engine error (`engine.ts`, "a game thread would not stop after its timeout"),
     and `census-play` plays it again on a fresh worker under the same `census:<seed>` key. Its frame logs are the
     retry's;
   - **the ended plays all ended `ok:false`:** they are all kept and each is checked on its own, never a problem. That is
     a stuck game whose retry got stuck too: J160's `balanced-legacy-even-mid/games/B-lab/rows` holds two
     (`census:1803001831` in `rows-1397354.jsonl` and `rows-3965728.jsonl`, `census:1803001575` in `rows-1397355.jsonl`
     and `rows-3965741.jsonl`), each pair line for line the same game. In the atlas it would be a branch the 120 s timeout
     ended twice, which its resume never replays. Which play the logs on disk belong to is not known (see *Rejected*);
     the PLAN's cube-lab follow-up 15 holds the case;
   - **no play ended:** the **truncated case**, unchanged. That is a branch the night ended on, or a unit given up after
     its attempts, which `units.jsonl` already makes a problem. Each play is checked as a single truncated play always was.
     With two killed attempts and no ended play, each play is now checked on its own rather than merged, and the earlier
     one can still name ids the last attempt's logs never show. A given-up unit is a problem already, and nothing in the
     folder orders plays across files (see *Rejected*), so this is left as it is;
   - **two or more plays ended `ok:true`:** a **key played twice**, a problem
     (`<key>: ended ok:true 2 times (<files>) -- one game key, 2 games`), each play id-checked on its own. The atlas never
     plays a recorded branch again (D465: a resume skips every branch with a row), and census retries only an engine
     error, which never ends `ok:true` (CubeLab's `ok` is `!stuck && error == null`). So two `ok:true` ends mean a game
     that finished and then lost its row (a worker killed between the rows' `end` and its result), or a folder written
     into twice. Either way the folder holds two finished games under one name, and `distill.py` keeps only one.
   - **Why two `ok:false` ends are not a problem**, the review's choice between that and making them one: a game that
     timed out twice is a result census-play already records (an engine error, `retried`), not a fault in the folder. A
     problem there would fail `census-play --record full` on a stuck game, which `main` did not do; the review measured
     exactly that regression on the first cut of this decision.
3. **The counts, added and never renamed.** `RowsCheck` gains `abandoned` and `superseded` (`{game, file, rows}` per
   play), `playedTwice` (`{game, files}`) and `orphanRows`. `atlas.json`'s `checks` gains `abandonedPlays`,
   `abandonedRows`, `abandoned` (the first 20), `playedTwice`, `supersededPlays`, `supersededRows` and `orphanRows`, and
   `census-play.json`'s `record.rowsCheck` gains `abandonedPlays` and `supersededPlays` (full mode) and `orphanRows`. `rows` still counts every row shape-checked, and `gamesIdChecked` every play checked, so a night's
   `metrics.py` reads what it read before (it reads `problems`, `warnings`, `guardrails`, `branchErrors`,
   `optionUnavailable`, `branchCapped` and `unreadableFrameLogs`). Abandoned plays are said once in the say line
   (`atlas: 2 plays abandoned by a killed attempt, their 77 rows left out (D499): …`) and once in atlas.md's checks. They
   are never a problem: a killed worker is D465's business, and `units.jsonl` already records the attempt. Superseded
   plays and orphan rows get one line each in the say line when there are any.
4. **The size reads the same plays.** `rowBytesByGame` builds plays the same way (orphan lines and begin-less ends make
   none) and keeps the plays `gamePlays` keeps. Of those it takes the largest, so a game's rows size is one play's even
   when two are kept: a stuck game retried and stuck again, or a key played twice. On J160's two stuck games that is
   129,233 and 116,139 bytes where `main` added both plays (258,465 and 232,277).
5. **The parallel checks are unchanged in shape.** `collectRows` decides the plays before the games are sliced, so
   `--checks-parallel n` stays the serial run's byte for byte (measured below).

**Rejected.**

- **Keep the last play by file order or pid.** Nothing in the folder orders plays across files: the re-run here was on
  the *older* worker (1522575 < 1522578), pids wrap, and every file is appended to all night. The `end` is the only mark
  a play finished.
- **Delete or rewrite the killed attempt's lines when the unit resumes.** The rows file belongs to the worker that writes
  it, and a reader that tolerates the folder as written also reads every older night correctly. D465's "every branch
  recorded, never dropped" holds for rows too.
- **Leave abandoned rows out of the shape check.** A name or an engine string in them would still sit in the folder. Only
  the id check needs the play's own frame logs, and those were overwritten.
- **Make abandoned plays a problem.** That would fail every night with a hung unit, which D465 recovers by design.
- **Read the abandoned play against the re-run's log and forgive what fails.** That is the merge again, with a filter.
- **Make two `ok:false` ends a key played twice** (this decision's first cut). It fails `census-play --record full` on
  every stuck game that census retried and that got stuck again: see point 2.
- **Name the atlas.json count `repeatedPlays`.** The job already uses that name at its top level for D483's listing
  check, so the rows' count is `playedTwice`.

**Measured.**

- **J181 s13, `--phase report`.** The copy is `var/d499-s13/`: `plan.json`, `phaseB/{rows/, baseline/rows/, units.jsonl,
  branches.jsonl, baseline.json, schedule.jsonl}`, and only the frame logs of the two abandoned branches, `d28-forge-o2-b39`
  and `d28-forge-o2-b21`, both seats.
  - On `60177314`, without this change: **8 problems**, the night's eight lines word for word, with `gamesIdChecked` 5,441
    and `rows` 150,398, as the night's atlas.json.
  - With it: **0 problems**, `abandonedPlays` 2, `abandonedRows` 77 (b21: 20 in `rows-1522574.jsonl`; b39: 57 in
    `rows-1522578.jsonl`), `playedTwice` [], and the same `gamesIdChecked` and `rows`.
  - At `--checks-parallel 4`, `checks` is the serial run's but for `redactionMs`.
- **`collectRows` alone**, over the original folders (read only): J181 s13, 5,440 games, 2 abandoned plays, 77 rows;
  J176 s06, 2,000 games, 11 abandoned plays, 324 rows; J173 s04 8 and 255, s06 21 and 487. None has a superseded play,
  a key played twice or an orphan row. J160 B-lab (census, rows mode): 4,002 plays kept for 4,000 keys (its two stuck
  games, each kept twice), no problem, nothing abandoned or superseded.
- **The review's census probe.** `recordReport` in full mode on J160's shape (a stuck play, then its retry ending
  `ok:true`) now returns what `main` returns. On the probe's synthetic logs, both fail only on `check-redaction.mjs`,
  and neither reports a key played twice. The stuck play is counted as superseded.
- **Node.** `web/test/cubelab-record-cake.test.ts` adds two tests. The first is on a fixture of J181's shape: two rows files,
  one key, the killed play naming 250 and the re-run's naming 77, against a seat log showing 77. It asserts:
  - no problem, every row still shape-checked, and the abandoned play named with its 3 rows;
  - the game's rows are the ended play's alone, and its size is the re-run's bytes;
  - the control: with the re-run's file removed (the truncated case), 250 fails as before and the size is the killed
    play's;
  - two `ok:true` ends are a key played twice, a problem, with each play checked on its own;
  - an `ok:false` end beside an `ok:true` one is superseded, with no problem and the size the `ok:true` play's;
  - a `begin` again in the same file leaves the earlier play abandoned;
  - rows before a `begin` and after an `end` are two orphans, not checked;
  - a begin-less play gives no size.

  The second is J160's census shape: two files, one key, both `ok:false`, which is no problem, two plays checked, and
  one play's size. Then the retry ending `ok:true`, which makes the stuck play superseded. `web/test/cubelab-atlas.test.ts`
  adds one through `writeAtlas`: atlas.json's counts, the say line once, atlas.md once, and the three controls (two
  `ok:false` ends, two `ok:true` ends, one of each). `npm --prefix web test` (with the review): node 1,869 tests, 1,859 pass, 0 fail (10 skipped); vitest 161 of 161; `tsc --noEmit` clean.
- No engine run and no full gate (the lane's instructions; the parent gates the merged tree).
