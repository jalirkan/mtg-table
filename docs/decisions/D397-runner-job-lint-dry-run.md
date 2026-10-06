## D397 — A job lint in `runner.sh check`, and `runner.sh dry-run` over an overlay of the real data

*Branch `c/job-lint`.* Amends D337 (the runner's `check`). The outside review's §4 and its T7.

**2026-10-06**

**Context.** Of the jobs that failed on the PC from J070 to J096, most failed for a reason a
reader of the job file, or a minute's run against the real data, could have caught
(pc-results `results/J0*/STATUS` and `failure.txt`):

- J093 died at once on `timeout -s TERM 10h30m` (GNU timeout takes one unit: "invalid time interval");
- J086's pilot hit "Argument list too long" from `$(ls -d var/cubelab/queue/normal/*/games/*)`;
- J088 and J090, `cpu: light`, read a `var/cubelab/...` their lane did not have (fixed by D392);
- J084 failed `left3 == n3.stillFail` (44 against 45) and J082 `rq3.newKinds == 0` (3): counts
  that took in files the jobs themselves had written;
- J087 stopped itself: the dataset's dry load was over its 8.5 GB cap even with one worker;
- J096's pilot passed in its own folder, then run1 met the queue's version guard ("holds a run
  with a different ... profiles -- use a new --out", D341) on the real folders within seconds;
- J071, J072 and J083 failed prepare on git auth at boot (fixed by D391).

`tools/runner.sh check` only parsed the file.

**Decision.**

1. **`check` lints** (`tools/runner/lint.ts`, over a small bash scanner, `shscan.ts`). A lint
   *error* fails the check (exit 1); a *warning* does not. `tools/runner.sh lint <files...>`
   runs it over many files, `lint --list-rules` names the rules. The rules:
   `timeout-duration` (timeout and sleep durations GNU accepts), `argmax-glob` (an unquoted
   glob two or more folders deep passed to a program, not a builtin: an error over data the job
   does not make, a warning over a tree it makes; with `--var DIR` it is expanded over the real
   data and over half of ARG_MAX is an error), `light-var` (a warning), `metric-self-count` (a
   metric that counts a folder the job's blocks write a matching *file* into: a redirect, `tee`,
   `touch`, `cp`/`mv`, `--out`, `clean:`, `collect:`), `after-missing` (with `--jobs-dir`, default
   a pc-jobs worktree's `jobs/`), `placeholder-id` (`J0XX`, `J###`, `followup: -`, `@<sha>`, and
   anything `after:` would drop), `bash-syntax` (`bash -n` on every block and `metrics: sh:` line,
   and a here-document that never ends) and `python-syntax` (Python's `compile()` on every
   Python here-document and every literal `python3 -c`). The runner itself does not lint: a job
   already on `pc-jobs` runs as before.
2. **`tools/runner.sh dry-run <job.md> --root <checkout>`** (`tools/runner/dryrun.ts`) runs the
   lint, then the blocks as the runner writes them, each stopped after `--max-seconds` (60), and
   evaluates the pilot's checks on what they wrote. Two sandboxes:
   - **ns** (when unprivileged user namespaces work): `unshare -Urm`, an overlayfs over the
     checkout and over the real `var/` it points to (writes land in the scratch folder; the real
     tree is only ever the lower layer), the rest of the file system remounted read-only but
     `/tmp`, `/var/tmp`, `/dev/shm`, and a network namespace per block with loopback only. The
     checkout may be the lane clone; another commit than the job's pin is checked out and built
     inside the overlay. **The `## Commands` blocks run too**, each for `--max-seconds`.
   - **none**: `--root` must be a scratch checkout with no `var/`; its `var/` is built of
     symlinks to the real entries and copies below the folders the blocks visibly write. A tool
     writing elsewhere would write through a symlink, so **only the pilot runs**.
3. **Limits, written down rather than papered over.** A block cut at the limit proves only that
   it got that far; final checks after cut-short blocks are printed, never a verdict. Memory
   (J087) shows only if the peak comes inside the limit. The lint reads the shell, not the
   tools: a tool's own output folder (`requarantine.mjs` writing `recheck.jsonl` into the
   quarantine it checks) is invisible to `metric-self-count`; the dry run on the real data is
   what shows it.

**Rejected.** *Linting inside the runner* (refusing a posted job on a lint error): a false
positive would stop the PC on a job a person checked; the coordinator runs `check` before
posting. *A generic `--max` flag for every tool*: the tools have no common one; a time limit is
the one knob every block shares. *Hard links for the overlay's fallback*: a tool that appends
in place (a queue's `drafts.jsonl`) would write the real file through the link.

**Evidence.** `tools/runner.sh lint` over every job on `origin/pc-jobs` (64 files, J001-J096,
`--jobs-dir` the same folder): J093 and J082 `timeout-duration` (the real failure, `630m` the
fix); J086, J083 and J067 `argmax-glob` errors (J086's real failure; J067 and J083 carry the same
line); J020, J029, J059 and J061 `argmax-glob` errors on `$(ls var/cubelab/queue-pilot*/*/*/games/*/g1-seat*.jsonl.gz)`
over a pilot root the tool makes (`--root`, not visible as a write; small in practice);
J066 and J073 `metric-self-count` (`nbs = files var/warehouse-J066/*.txt` also counts the job's
own `du.txt`); J006, J008 and J011 `bash-syntax` (`cd <mtg-table checkout on main>`, old
hand-run jobs); J007's parse error (`repos: same as J006`). Warnings: `light-var` on J014, J088
and J090; `argmax-glob` over trees the jobs make on J005, J019, J027, J048, J034, J082, J093 and
J096. **J091, J092, J094, J095 and J096 have no lint error**; J093's is the one it failed on.
`web/test/lab-runner-lint.test.ts`: every rule on its failing shape and its control, and the
dry run in both sandboxes (in a namespace, a commands block meeting a D341-style guard on the
real folder is caught and the real `var/` is byte-identical after).
