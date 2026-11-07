## D518 — evaluator v3's tooling: `dataset_merge.py` joins encoded datasets row for row and keeps every game's split, `train_eval.py --load-subsample` holds a fixed share of each training game's rows so five nights fit one job, and `config.json`'s `coach.evalModel` names the win chance's model (null: the night-1 ensemble, as today)

*Branch `pc/d518-eval-v3-tooling`, off main `ea313c01` (D517's merge). D518 was reserved for this lane
(`node tools/decisions.mjs next` gave D518). Extends D364 (evaluator v2: the pair split, `eval_compare`, `--subsample`,
`--compact`), D361 and D368 (the win chance served by the coach helper, and its ensemble default) and D369 (where the
helper finds a model). Serves the play-AI review of 2026-11-05 (`~/code/pc-results/study/play-ai-review-2026-11-05.md`,
§3b, §4's row "nights 4–5's 76k idle games" and §5 row 7) and the job it asks for, the J196 draft
(`pc-jobs`, `drafts/J196-eval-v3.md`). Tools, their tests and a config key; no model, trainer default, search leaf,
bridge, wire or protocol changes, so it is free under D509.*

**2026-11-07**

**Context.** The review's §5 row 7 asks for "evaluator v3 over nights 1–5, **for the win-chance strip only**", judged
by "D364's `eval_compare` against v2 on the same pairs", killed if "not better on compare". The reason is §4's: more
games still help a win predictor (J092's curve: half to all of v2's training pairs lowered test log-loss by 0.0093
[+0.0061, +0.0123]), and nights 4–5's games have never been used. That is a better strip, not a stronger AI: §3b and
J194 closed the search leaf. The J196 study found the pipeline lacks three things:

1. **One dataset over five nights.** `train_eval.py`, `eval_compare.py`, `split_audit.py` and `gates.py` each read
   one dataset folder, and the obvious build, `dataset.py --nights 1,2,3,4,5`, cannot run: nights 1 and 2's
   recordings are on the cold drive (D378; a count of `night-N.json`'s seed folders in the lab clone on 2026-11-07
   finds 0 of 20,000 hot for nights 1 and 2, 20,000 of 20,000 for night 3, 38,000 of 38,000 for nights 4 and 5),
   `/mnt/e` is not attached, and `archive.py restore-night` reads each unit's absolute path from the hot manifest.
   v2's encoded dataset, `var/ml/data/nights-1-3` (19,517,006 rows, 119,816 chair recordings, 59,997 games), is hot
   in the lab clone (1.7 GB), so nights 4–5 can be encoded alone over night 1's vocabulary and joined to it — but
   nothing joins two datasets.
2. **Rows that fit.** v2's full load of 19.5 M rows held 9.62 GB and peaked at 12.63 GB (J092's dry load) to
   12.94 GB (its fit), against J092's own 17 GB cap; five nights are about 45 M rows (19.5 M plus ~25.9 M: 151,847
   recordings at ~171 rows each), about 22 GB loaded and 29 GB at the peak by the same ratio, past a heavy unit's
   ~21 GB `MemoryMax`. No flag holds fewer rows than the dataset has: `--subsample` draws each epoch's share after
   the whole split is in memory, and `--train-fraction` drops whole deck pairs, so to fit it would train v3 on about
   0.29 of five nights' training pairs, fewer games than v2 had.
3. **A place to name the strip's model.** The helper serves `var/ml/models/night-1-ensemble.json` (D368), else
   `night-1-eval.json`, because `eval-runner.mjs` hard-codes them and nobody passes `--eval-model`. v2 is
   registered only as the search leaf's `var/ml/models/eval-dcdae3745b84.json` (D437); no config key says what the
   strip serves, so registering a strip model would mean editing a default in code or a launch line.

**Decision.**

1. **`tools/ml/dataset_merge.py SRC SRC [...] --out DIR [--allow-shared-seeds] [--jobs N]`** writes dataset.py's
   own folder format (features.json, `<split>-NNNNN.npz` shards of `X y turn turns_to_end rows_to_end active game`,
   games.jsonl, stats.json last):
   - the first source's shards are copied byte for byte; each later source's are rewritten with only `game` moved
     up by the games before it (the other six members are the source's arrays; `savez_fixed`, so the files are the
     same for every `--jobs`);
   - games.jsonl is the sources' lines in order, `index` renumbered and every other field as it was (`split`,
     `match`, `night`, `explore`, `profiles`, `deckKeys`);
   - stats.json sums rows, games, splits, labels, versions, nights, skipped and reserved counts and exploring games,
     recounts each split's groups, and carries a `merged` block; `merge.json` beside it names every source with the
     sha256 of its features.json, games.jsonl and stats.json and one sha256 over its shard list, the output's the
     same way, and the checks below.

   It **refuses** (exit 2, no stats.json): features.json that differ, or another schemaId, vocabulary, phases,
   groupBy, split weights, salt or exploration mode; a game (`game_key`) in two sources, always; a source whose
   shards do not hold the rows its stats.json and games.jsonl say, split by split; and **any game whose split would
   change** — dataset.py's `split` field or train_eval's pair split (`--split-by pair`, D317). From 20 pairs on the
   pair split is a hash of the pair's name alone (`assign_pairs`), so it cannot move; below 20 a source is split by
   rank and could, and the merge refuses rather than move a held-out game. So a test row of any source is a test row
   of the merge, and no training or validation row of one source becomes a test row: v2's 916 test pairs stay
   exactly v2's held-out pairs inside the five-night dataset.
2. **What the merge does about pairs.** A pair's name is `cubelab <seed> A|cubelab <seed> B` in every cube (D364
   §1), so a "pair" is a seed number. Nights 4–5 share 5,237 seed numbers with nights 1–3, never with the same pool
   key (0 `(key, seed)` drafts in both: each shared seed is a different draft of another cube or bridge). The merge
   **refuses a pair named in two sources unless `--allow-shared-seeds`**, and with the flag **keeps the name**: the
   pair's games from every source are one split group, in the split its name hashes to, exactly as one
   `dataset.py` run over all five nights would make it. That is already how v2's own dataset works: 4,488 seed
   numbers of nights 1–3 span more than one of its nights, and 8,739 of its 8,777 sit under more than one folder.
   The brief for this lane asked the other way — "keep pairing within the source night", so that a shared seed
   makes no cross-night pair. It is not done (Rejected): no game is ever "paired" with another by the merge (pairing
   is the split's hash and `eval_compare`'s resampling unit, both of the name), renaming would move the added
   source's games out of the split they have in their own dataset, and it would make the merge something no
   `dataset.py` run produces. What a joined pair costs is named instead: a five-night `eval_compare` puts nights
   4–5's games of a shared seed into the `reference` subset (they are the same pair by name), which is why J196's
   rule reads v2's own dataset (below), where nothing is joined.
3. **`train_eval.py --load-subsample F`** holds m = ceil(F × c) of every c-row game's rows in the **train and val**
   splits, positions floor((u + j) c / m) for j < m — `--subsample`'s systematic draw, from a fixed start u instead
   of a fresh one, in integers — where u is `sha256("load-v1|<seed>|<game_key>")`'s first 20 bits. It is applied in
   `evalnet.load_splits`'s first pass (a row's position is `rows - 1 - rows_to_end`), so nothing is allocated for a
   dropped row. **Test is never sampled**; every game stays present; the same game keeps the same rows in any
   dataset that holds it (keyed on `game_key`, not its index); `F = 1` is the default path, bit for bit. The report
   and the model's `training` block carry `loadSubsample` (share, seed, rows in the data and rows held per split)
   only when F < 1. Refused with `--cv` and `--curve`. Rows of one game share its outcome (within-game residual
   correlation 0.774 on v2's test split, design effect 148: J092), so a fixed half of each game costs little of
   what the game teaches; v3 then runs `--subsample 0.25 / F` on the held rows, so an epoch sees a quarter of a
   game's rows as v2's did. This is the one place v3's trainer is not v2's.
4. **`config.json` `coach.evalModel`** names the win chance's model, and `tools/eval-runner.mjs`'s
   `chooseEvalModel` is the one resolver: **`--eval-model` (play.sh's or the helper's) wins, then
   `coach.evalModel`, then the defaults** (the night-1 ensemble, else night-1-eval.json, D368). The configured
   name is looked up as the flag is (a path, a comma list, a folder or a manifest; this checkout, then the lab
   clone, D369), and one found nowhere is reported missing, never replaced by the default. `coach` is the helper's
   block (`autoReview`, the watch caps); `match` is play.sh's and the helper never reads it. The committed value is
   **`null`**, so nothing changes until a decision registers a model there. `COACH EVAL` logs which of the three
   named it; `docs/handbook.md` (*Which model the win chance serves*) and `tools/ml/README.md` say where it is named.

**What J196 then does** (its draft, updated to these names). Encode nights 4–5 over night 1's vocabulary
(`dataset.py --queue-root var/cubelab/queue --nights 4,5 --vocab-from var/ml/data/night-1`); merge
(`dataset_merge.py var/ml/data/nights-1-3 var/ml/data/nights-4-5 --out var/ml/data/nights-1-5
--allow-shared-seeds --jobs 6` — **the flag is required**, the draft's command lacks it and would be refused);
`split_audit.py --reference var/ml/data/nights-1-3`; a dry load picks the largest of F = 0.5 and 0.33 that peaks
under 17 GB; then **one plain fit of v2's winning configuration** (hidden 128, card dim 8, l2 1e-3, card_l2 1e-3,
dropout 0.1, lr 1e-3, batch 4096, `--fast --compact --aux-turns 0.1`, `--seed 0`, early stopping on its own
validation split), with `--load-subsample F --subsample 0.25/F`, and no search. It is judged by D364's rule
unchanged: `eval_compare.py var/ml/data/nights-1-3 --model <v3> --against <v2> --reference var/ml/data/nights-1-3`,
both models on exactly v2's held-out test rows (873 plain pairs). **BETTER** (log-loss(v2) − log-loss(v3) > 0 with
the lower end of its 95% interval above 0) → v3 is registered **for the strip only**, by a follow-up that copies it
to `var/ml/models/eval-<sha12>.json` and sets `coach.evalModel` under a decision of its own — never the search
leaf, which needs Java parity and D354's three gates and which §3b and J194 closed. **Not shown better** → v3 is
killed: not served, not refitted with other settings. `eval_serve.py` must accept it (D361's refusals), and ECE is
reported on every line.

**`human_eval` is not a gate for a strip model** (D369): its first check is pre-registered to read once, at the
30th human game, on "the model `play.sh` serves when the 30th game is in" — using it to choose that model would be
a second, model-dependent reading of a check written to be read once; under 30 games it is DESCRIPTIVE ONLY and
draws no conclusion (14 games today, the review's §1b); and it scores the evaluator against `core`, not one
evaluator against another. If v3 is registered before the 30th game, FIRST_CHECK reads v3; if not, whatever the
strip serves then.

**Rejected.**

- **A new architecture**, or a search for v3. The review asks whether v2's model gets better with more games; a
  search may choose another architecture and confounds the data with the configuration (J092's took 2 h 22 min).
  A schema change (the on-the-play column D364 names) would also stop v2 scoring the new rows.
- **Re-encoding nights 1–2 from the cold drive.** `/mnt/e` is not attached and `restore-night` reads the hot
  manifest's absolute paths; a copy at `/mnt/windows/staging/forgecoach-archive` is unverified. And a re-encode
  would be a new nights-1-3, not the rows v2 trained and was scored on: the merge keeps them byte for byte.
- **`--subsample` as the memory fix.** It draws each epoch's rows after the whole split is loaded; the peak is
  unchanged.
- **`--train-fraction`.** It drops whole training pairs: fitting 45 M rows into v2's envelope would keep about 0.29
  of five nights' training pairs, fewer games than v2 trained on, which defeats the point.
- **Renaming pairs per night** in the merge (the brief's "keep pairing within the source night"), e.g. prefixing the
  added source's `match` with its night. It moves the added games' splits away from their own dataset's and makes
  the merge differ from what `dataset.py` over all nights writes, for a gain only the report-only five-night
  comparison would see; J196's rule reads v2's dataset, where nothing is joined. Reopen it only if a five-night
  `reference` subset is ever made a rule.
- **Copying the later sources' zip members raw** (no recompression; seconds instead of minutes). It needs
  `zipfile` internals (`fp`, `filelist`, `header_offset`); `savez_fixed` is what dataset.py writes and its cost is
  measured below.
- **A per-night `--load-subsample` share or a game-count cap.** One share for every game keeps the nights in their
  natural proportion, which is what "more games" means here.
- **`ml.stripModel`** as the key's name. The helper reads only its `coach` block and the flag it mirrors is
  `--eval-model`; a top-level `ml` block would be read by nothing else.

**Measured.**

- `tools/ml/tests/test_eval_v3.py` (5 tests, gate 12h, ~4 s): made-up nights in dataset.py's format whose rows are
  the fixtures' real encoded rows, shards cut across games (37 and 53 rows), 50 and 40 pairs:
  - **the merge is the concatenation**: every split's every member equals the sources' arrays concatenated (the
    later source's `game` + the first's game count), the first source's shards and features.json are its files
    byte for byte, games.jsonl is the sources' lines with `index` renumbered and nothing else changed, stats.json's
    rows, games, splits, shards and nights are the sums, merge.json names both sources with their hashes, and
    train_eval loads the result;
  - **the split is preserved**: every game's pair split and dataset split in the merge are its source's;
    `split_audit.py --reference <first source>` passes with 0 missing, 0 moved and 0 test pairs the reference
    trained on; each of the 10 shared seeds is in one split;
  - **the refusals fire**: shared seeds without the flag (and with it, the merge succeeds), a game in two sources
    (even with the flag), another schema, a source of 6 pairs whose games would change split, a damaged source
    (stats.json one row over its shards), an incomplete source, one source, the output inside a source; the CLI
    exits 2 refused and 0 merged, and `--jobs 1` and `--jobs 2` write identical shards and games.jsonl;
  - **`--load-subsample`**: at F = 0.25, 0.5 and 0.33 every train and val game is present with exactly
    ceil(F × c) rows, test is identical to the full load (board, card cells, labels), and train holds between F and
    F + 0.15 of its rows; the held rows are the full split's rows at `load_keep`'s positions, in order (board, card
    cells, labels, game, rows_to_end); the same seed gives the same rows, another seed others; a game keeps the same
    rows in the merge and in its source; each game's kept positions are the systematic draw from its own start;
    `--compact` holds the same numbers;
  - **the CLI**: `--load-subsample 1` writes the same report numbers and the same model file (but its date) as no
    flag, with no `loadSubsample` key; at 0.5 the report and the model carry it, test rows and every split's game
    count are unchanged; `--dry-load` reports the held rows; 0, 1.5, and with `--cv` or `--curve`, are refused.
- `tools/eval-runner-selftest.mjs` (12f, 63 checks, 6 of them new): `--eval-model` wins over `coach.evalModel`; without the flag
  the key is used and found in the lab clone; with the key null the night-1 ensemble; an empty flag or key is no
  choice; a configured model found nowhere stays as given, never the default; nothing anywhere is none.
  `tools/coach-helper-selftest.mjs` (12f, 151 checks): a `coach.evalModel` that is not a path is refused at start,
  exit 2.
- **The shard rewrite**: 40 real nights-1-3 shards (200,000 rows) rewritten with an offset in 26.0 s on one process
  beside other work, 0.65 s a shard, ~7,700 rows/s: nights 4–5's ~25.9 M rows are about 56 min on one process and
  about 10 min at `--jobs 6` (an estimate from that rate); the first source's 1.7 GB is a file copy.
- **Memory, on a real dataset**: `train_eval.py <nights-1-3> --split-by pair --compact --fast --aux-turns 0.1 --hidden
  128 --dim 8 --batch 4096 --dry-load` on v2's own dataset in the lab clone (read only), one process, `nice 10`
  beside other work, at `--load-subsample 0.5 --subsample 0.5` and at `--load-subsample 1 --subsample 0.25` (the
  default path):

  | share | rows held (train / val / test) | load: rss | peak (baselines) | `time -v` max RSS | wall |
  |---|---|---|---|---|---|
  | 1 | 15,417,966 / 2,054,045 / 2,044,995 | 6.52 GB | 10.88 GB | 11.41 GB | 53 min 19 s |
  | 0.5 | 7,732,640 / 1,030,157 / 2,044,995 | 3.03 GB | 6.05 GB | 6.34 GB | 54 min 0 s |

  At 0.5 every train and val game kept ceil(c/2) rows (7,732,640 is 50.2% of the train rows; test whole). The
  peak is close to linear in the rows held: about 0.555 GB a million rows, with almost no fixed part. **For five
  nights (an estimate, not measured: nights 4–5 are not encoded):** ~25.9 M more rows split as nights 1–3's are,
  so about 25.1 M rows held at 0.5 (**~14 GB peak**, under J196's 17 GB), 18.2 M at 0.33 (~10 GB) and 45.4 M at 1
  (~25 GB, past a heavy unit's ~21 GB). J092's own full dry load peaked higher, 12.63 GB, with another
  configuration (card dim 4, `--weight-by game`, four forked workers). Each dry load read every shard and took
  53–54 min here, not J087's 35: a five-night dry load is about 2.3 times the shards, so J196's "1–2 × ~35 min"
  for its dry loads is low by about a factor of three.
- On this tree: `./bridge/build.sh` (unchanged code) `build OK`; `npm --prefix web test` node 1,864 pass, 0 fail,
  vitest 161 passed; gate 12h alone (`python3 -m unittest discover -s tools/ml/tests`) 298 tests OK, 3 skipped,
  454 s; the 12f selftests above; `tools/public-check.sh` and `node tools/decisions.mjs check` OK. The full gate
  was not run (the lane's brief).

**Residuals.**

- J196's draft must take these names and the `--allow-shared-seeds` flag, and its pilot's 60-folder samples must
  hold at least 20 distinct seed numbers each, or the merge refuses (the split would be by rank).
- The five-night comparison (report only) still joins nights 4–5's shared-seed games to v2's test pairs by name;
  J196 says so beside that line.
