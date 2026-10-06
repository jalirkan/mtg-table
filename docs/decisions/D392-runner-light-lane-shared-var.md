## D392 — The light lane's `var/` is lane 1's, by the same link as a heavy lane's

*Branch `c/runner-light-var`.* Amends D337 (the runner) and its LANES (co-scheduling).

**2026-10-06**

**Context.** The runner runs a `cpu: light` job in its own clone, `~/code/lab/mtg-table-light`.
Heavy lanes k > 1 (`mtg-table-lane2`, `-lane3`) get `var/` as a symlink to lane 1's
(`~/code/lab/mtg-table/var`), so every job's outputs and the data a job reads are in one place.
The light clone did not: `prepareScript` made the link only for `cpu: heavy` with `lane > 0`. Its
`var/` was its own and had no `cubelab/`, so J088 (light) failed on its first line, `test -d
var/cubelab/queue-quarantine-n3`, while the same line passes in a heavy lane.

**Decision.**

- **Every mtg-table checkout but lane 1's links `var/` to lane 1's.** The condition is now "this
  run's checkout is not lane 1's" (`dest !== checkout('mtg-table', 'heavy')`), which covers the
  heavy lanes k > 1 and the light lane with one rule and one set of shell lines: `mkdir -p` lane
  1's `var/`, move a real `var/` aside to `.var-before-lane-<time>` (never deleted), `ln -s`, and
  `var` in `.git/info/exclude` so the version stamps see a clean tree.
- The PC's existing `mtg-table-light/var` is moved aside at the next light job's `prepare`; look
  in it before removing it by hand.
- What the header already says for lanes now holds for the light job too: jobs side by side
  share `var/` and must not write the same paths.

**Tests** (`web/test/lab-runner.test.ts`, `D392:`). A heavy job writes
`var/cubelab/queue-quarantine-n3/`; a light job `after:` it, in a light clone that already has a
`var/` of its own, passes `test -d` on it. The light clone's `var/` is a symlink to lane 1's, the
old one is moved aside with its contents, `git status` is clean, and lane 1's `var/` stays a
directory. The test fails on the runner before this change.

**Rejected.**

- *Linking only `var/cubelab/…`.* The heavy lanes link all of `var/`; a second, narrower
  mechanism would leave every other shared path (`var/ai-ladder/`, the evaluator's data) to fail
  the same way later.
- *Running light jobs in lane 1's clone.* A light job would then move the code under a running
  heavy job at `prepare`, which the lanes exist to prevent.
