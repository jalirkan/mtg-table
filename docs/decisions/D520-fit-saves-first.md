## D520 — `train_eval.py` saves the model the moment the fit ends, writes a partial report beside it, and `--resume-model` runs only what follows the fit

*Branch `pc/d519-fit-saves-first`, off main `310ba71b` (D518's merge). `node tools/decisions.mjs next` gave D519, which
J197's job text reserves for its SMALL GAIN reading, so this lane took D520 and leaves D519 to J197's read (the
branch keeps the name its brief gave it). Extends D316 (the evaluator's export, now written earlier) and D518; serves
J196 (D518's evaluator v3 fit). A trainer change with every default output unchanged but the report's new
`complete` key; no model, default, search leaf, bridge, wire or protocol change, so it is free under D509.*

**2026-11-08**

**Context.** Last night's lab job J196 ran D518's plan: one plain fit of v2's configuration over nights 1–5 at
`--load-subsample 0.5 --subsample 0.5`, about 24 million rows held. `tools/ml/train_eval.py` loaded for about 2 hours,
trained 39 epochs (best epoch 15, val log-loss 0.4918, about 2.5 hours in all), and was then OOM-killed in the
baselines and scoring that follow the fit, while the GPU scenery painter held 12 GB beside it. The model file
(`--out var/ml/models/nights-1-5-eval.json`) did not exist afterwards, and the lab runner's retry would redo
everything. Reading `run_train` on `310ba71b` confirms why: its order was load → fit → `fit_baselines` →
`score_all` and `held_out_detail` (inside the report) → `eval_human` → `N.save_model(--out)`, and `--report` was
written later still, by `main()`. D518's own dry load put the peak at the baselines (10.88 GB against 6.52 GB after
the load, at F = 1 on three nights), so the step after the fit is exactly the one most likely to be killed, and the
model was not on disk when it was.

**Decision.**

1. **`--out` is written as soon as the best epoch's weights are in the net**, after the `fit` memory note and
   before anything else is computed — only a log line sits between the fit and the write: the same `net.to_json`
   the end writes, with the same `training` block in the same order (now built by one function, `training_block`),
   through `evalnet.save_model`'s temp file and `os.replace`. It **lacks** `training.metrics` (the val and test
   scores of every model, which need the baselines and the scoring) and, under `--aux-turns`,
   `training.auxTurnsToEnd` (measured after the write, item 2), and **adds** a top-level `partial: {"complete":
   false, "fit": {valLogloss, epochsRun, seconds}}` (the fit's facts the training block does not hold, so a resumed
   run can report them), with `auxTurnsWeight` beside them under `--aux-turns` (the weight, not the error, so a
   resume can check it). Everything else — weights, standardisation, `excluded`, `bestEpoch`, `rows`, `games`,
   `loadSubsample`, `fast`, `subsample` — is already there. The end rewrites the file in its old shape (no
   `partial`), atomically, so a kill between the two leaves the first, valid model in place. Java's `EvalModel`,
   `eval_serve.py` and `eval_compare.py` ignore keys they do not read; `eval_compare` reads only `training.data`,
   `training.splitBy` and `schemaId`, so **a job's `eval_compare` rule can be read from the early file alone**.
   **Registering a model judged that way:** the early file's sha256 is not the final file's, and a resume to the
   same `--out` rewrites the final bytes (and changes the hash). So the file registered (`eval-<sha12>.json`) is the
   one whose sha12 the compare printed — the early file, copied aside before anything resumes onto its path — or
   the compare is re-run on the final file before that is registered.
2. **The auxiliary head's held-out error is measured after that write** (it was measured after the baselines; it
   reads only the net and the rows, so the number is the same) and joins the report and the final file's
   `training.auxTurnsToEnd` as before. The head itself is never exported, so a run resumed from an early file has
   no head to measure: its report and final model carry no `auxTurnsToEnd`, and it logs why. (A run resumed from a
   finished model takes that model's block.) Nothing but the write sits between the fit and the disk, which is
   worth more than that one number on a resume.
3. **A partial `--report`** is written beside the early model: `{"complete": false, schemaId, data, backend,
   splitBy, splitSummary, rows, games, hyper, fit, memory}` — the fit's epochs run, best epoch, val log-loss and
   seconds, and the memory stages so far (`load`, `fit`). The full report at the end is what it was plus
   `"complete": true` as its last key, and `main()` now writes every report through a temp file and a rename (the
   same `json.dump(indent=1)` bytes).
4. **`--resume-model PATH`** skips the fit: it loads the model, takes `bestEpoch` and `excluded` from it and the
   rest of the fit's facts from `partial.fit` (null when given a finished model, which has none), and the date
   from its training block, and runs everything that follows the fit — the early write to `--out`, the partial
   report, the baselines, the scoring, the report and the final `--out`. It is **refused** unless the model's
   **recorded dataset, split, load share and configuration** are this run's — not the same command line: its
   schema and vocabulary are the dataset's, and every one of `data`, `backend`, `splitBy`, `hyper` (which holds the
   epochs and patience too), `rows`, `games`, `fast`, `trainFraction`, `weightBy`, `subsample`, `loadSubsample`
   (whose block holds the seed under F < 1), `softLabels` and the auxiliary weight equals what this run would
   write, which is what makes the report describe the model. What those fields do not record passes: `--seed` at
   F = 1 (it seeds only the fit), `--compact` (the same numbers), `--threads`, `--verbose`, `--eval-human`. Also
   refused for a searched model and with `--grid`, `--search`, `--cv`, `--curve` or `--dry-load`. The loaded weight
   matrices are made C-ordered (`from_json`'s are transposed views): with the same layout the products are the
   same bit for bit, without it the scores differ in the last digit (measured below). The resumed report says
   `resumedFrom` and its memory stage after the load is `resume`.
5. **The model's `training.date` is the time the fit ended** (it was the time the scoring ended, minutes later), so
   the early and the final file carry the same date and a resumed run keeps it.

**What J196's retry and future training jobs do.** **J196 ran before this code**: its kill left no model, so its
retry is one full refit, load and fit included; nothing here recovers it. Only a run of this code killed after
its fit is resumable. Such a run leaves `--out` (loadable, scorable, enough for `eval_compare`) and a `complete:
false` report, and the retry is the same run plus `--resume-model <that --out>`; it reuses the fit and writes the
final model and the full report. **It still loads the dataset**, because the baselines are fitted on the training
rows and every model is scored on val and test: at J196's size the load was about 2 of the 2.5 hours, so a resume
saves the fit (about half an hour there, by those round numbers), not the load, and it peaks where the full run
peaked (the baselines), so it must run when that memory is free — not beside the painter. If the early file is
all a job needs — J196's own rule, `eval_compare.py var/ml/data/nights-1-3 --model <v3> --against <v2>
--reference var/ml/data/nights-1-3`, needs no train_eval report — it can be read from that file directly, under
item 1's registration rule. A job that reads `train_eval`'s report should check `complete` is `true`.

**Rejected.**

- **A runner-level checkpoint** (the lab runner snapshotting the process or its outputs between steps). The runner
  sees one command; the boundary that matters — the fit is chosen, nothing after it is expensive to redo — exists
  only inside `run_train`, and a model file is already the checkpoint format every consumer reads. A per-epoch
  checkpoint to resume an interrupted *fit* was not asked for and would need the optimiser's state and the RNG's.
- **A smaller job** (a lower `--load-subsample`, or no painter beside it). It lowers the chance of a kill, not its
  cost: any kill after the fit still lost the fit, and the scheduling of GPU work beside lab jobs is the queue's
  business. The share stays D518's.
- **Skipping the baselines on a resume, or loading only their columns.** It would make a resumed report differ from
  a full one, or need a second loader; the load is the cost, and it is named above instead.
- **Writing `metrics` as null in the early file.** A null field reads as "scored, nothing there"; the field is absent
  until it exists, and `partial.complete` says so.

**Measured.**

- **Today's outputs, unchanged.** On a fixture dataset (`dataset.py` over `fixtures/games`, as `test_eval_v2.py`
  builds it), `310ba71b`'s `train_eval.py` and this one, the same command lines, two shapes — a plain fit (`--epochs
  3 --hidden 4 --dim 2 --batch 64`) and J196's (`--hidden 8 --l2 1e-3 --fast --compact --aux-turns 0.1
  --load-subsample 0.5 --subsample 0.5`): the model files are **byte-identical but the date string** (34,939 and
  52,254 bytes), and the reports are equal but `memory` and `fit.seconds` (wall-clock) and the one new key,
  `complete: true`.
- `tools/ml/tests/test_fit_saves_first.py` (4 tests, gate 12h, ~2.4 s), both shapes, a kill simulated by making
  `fit_baselines` raise: the early model exists, loads through `evalnet.load_model`, has `partial.complete` false and
  the three fit facts (and `auxTurnsWeight` in J196's shape), lacks `training.metrics` and `training.auxTurnsToEnd`,
  and is otherwise the full run's model (weights, training block)
  but its date, with no `.tmp` left; the partial report has `complete` false, no `models`, memory stages `load, fit`
  and the full run's fit but its seconds, and the full report ends with `complete: true`; `--resume-model` on the
  killed run's file gives the full run's report (every score, bit for bit) but `memory`, `fit.seconds` (the killed
  fit's, carried), `resumedFrom` and, in J196's shape, `auxTurnsToEnd` (absent), and the full run's model file but
  its date (and that block); refused, each with its message asserted (the differing fields named), for another
  hidden size, load share, split, an auxiliary weight it did not train, `--search sha`, `--grid`, `--cv`, `--curve`,
  `--dry-load`, a missing file and the other shape's model; `--seed 7 --compact --threads 1` passes. With the C-order line removed, the resume test fails in
  the last digits of both shapes' scores (0.…8549225 against 0.…854923).
- On this tree, `nice -n 10` beside a lab match on 7 workers: gate 12h alone (`python3 -m unittest discover -s
  tools/ml/tests`) **303 tests OK, 3 skipped**, 577 s (D518's 299 plus these 4); `./bridge/build.sh` (unchanged
  code) `build OK`; `npm --prefix web test` node 1,864 pass, 0 fail, vitest 161 passed; `node tools/decisions.mjs
  check` OK. The full gate was not run (the lane's brief).
- After the skeptic review's fixup (the aux error after the early write, the recorded-fields wording, the refusal
  messages asserted, J196's retry, the registration rule): `test_fit_saves_first.py` 4 OK (~2.3 s), and
  `test_eval.py`, `test_eval_v2.py`, `test_eval_v3.py` and `test_eval_serve.py` 50 OK, 2 skipped, 356 s, at
  `nice -n 10` beside a fit and a match; the comparison with `310ba71b`'s outputs above, re-run: unchanged (both
  shapes' model files byte-identical but the date, reports equal but memory, seconds and `complete`).

**Residuals.**

- A resume is not cheap at J196's size: the load is most of the run. Making it cheap would mean caching the
  baselines or loading only their columns for the training split — a second loader, not done here (Rejected).
- A run resumed from an early file reports no `auxTurnsToEnd` (the head is never exported, and its error is
  measured after the write, the review's order). If that number is ever needed from a resume, the head would have
  to be saved beside the model.
- Nothing yet checks a report's `complete` key; the lab runner and J196's derive steps read the report as before.
