## D383 — CI runs the whole tools/ml suite with numpy and zstandard (a fourth job, `ml`); test_eval_v2's night-1 copy gets its run's real drafts.jsonl

*Branch `c/eval-v2-fixture`. D382 is held by the open rollout-labels PR (#69).*

**2026-10-04**

**Context.** `test_eval_v2.test_queue_nights_and_comparison` (D364) failed on `main` from
58f3fa5 onwards, with every CI run green.

- **Why it failed.** Its night-1 queue folder is a copy of `fixtures/cubelab/recorded`,
  which has recordings but no `drafts.jsonl`. D365 made the reserved-deck filter fail closed
  on a lab game whose decks are unknown. D365 merged before #59, while #59 was written
  before it, so night 1's two games were dropped.
- **Why CI did not see it.** The `redaction` job runs `tools/ml/tests` without numpy (its
  "standard-library half"), and the whole `EvalV2Test` class is
  `skipIf(np is None)`. So are the dataset, training, gate and evaluator tests: CI ran
  none of them.

**Decision.**

- **The test is fixed, not the filter.** Night 1's copy gets
  `tools/ml/tests/data/recorded-drafts.jsonl`, the fixture run's real draft line: seed 7
  of the Synergy cube, redrafted by the lab with the run's own settings (a draft is a
  function of its seed, D294).
  - Checked against both recordings: every card each player shows is in that player's
    redrafted deck (A for player 0, B for player 1), and nearly none are in the other's.
  - The committed fixture folder itself stays without a `drafts.jsonl`, because
    `test_outside_exam` uses exactly that copy to hold D365's fail-closed path.
- **CI gets a fourth job, `ml`.** It makes a venv (ubuntu-latest's Python refuses a
  system pip install, PEP 668), installs `numpy>=2,<3` and `zstandard`, and runs
  `python3 -m unittest discover -v -s tools/ml/tests` with one BLAS thread.
  - It fails if any test skips for numpy or zstandard: the job exists to run those.
  - Measured here: 230 tests in 200 s, exit 0. The only skips are torch-optional and one
    "numpy is installed" control.
  - The `redaction` job keeps its standard-library half unchanged, so that half still
    proves the encoder needs no numpy.

**Rejected.**

- *Relax the filter for fixtures.* D365's fail-closed rule is the protection, so the test
  must take the real path.
- *Add `drafts.jsonl` to `fixtures/cubelab/recorded`.* That would turn
  `test_outside_exam`'s fail-closed case off.
- *Install numpy in the `redaction` job.* It would lose the evidence that the
  standard-library half stands alone, and lengthen the job everyone waits on.
