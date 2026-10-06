## D391 — The lab runner waits for git at boot: a prepare that fails because git cannot reach the remote is retried for 10 minutes, and no job is admitted after a start until `git ls-remote` answers

*Branch `c/runner-boot-race`.* Amends D337 (the runner) and D365 (what a step's end means).

**2026-10-06**

**Context.** The runner (`forgecoach-runner.service`, a systemd user service with linger) starts
at boot. On the PC, the first jobs' `prepare` steps failed with `fatal: could not read
Username for 'https://github.com': No such device or address` (exit 128): the git credentials
were not ready for about two minutes after login. Those jobs were marked failed, and the jobs
`after:` them stayed blocked, because a job only waits on dependencies that are *done*. One
boot cost the queue until a person noticed.

**Decision.**

- **A transient git failure in `prepare` is retried.** When the prepare step exits **128** and
  its log holds one of git's "cannot reach the remote" lines (`TRANSIENT_GIT` in
  `tools/runner/runner.ts`: `could not read Username/Password for`, `Could not resolve host`,
  `Temporary failure in name resolution`, `Failed to connect to`, `Connection timed
  out/refused/reset`, `Network is unreachable`, `unable to access 'https://…'`, a 5xx or 429,
  `RPC failed`, `early EOF`, a TLS handshake failure, ssh's connect or resolve errors), the
  step runs again after `prepareRetryDelay`: 15 s, 30 s, 1 min, then every 2 min. That
  continues for `PREPARE_RETRY_WINDOW_MS` (10 minutes) from the first such failure. The run
  stays `running` meanwhile. Its pending retry is `prepareRetry` in `run.json`, so a restarted
  runner keeps the window, and STATUS carries `prepare_retry: <n>: <the git line>`. The wait
  goes through `holdReason`, the same path as a pause, so it holds no unit and blocks no
  monitoring. After the window the job fails, with a reason and a `failure.txt` naming the
  retries.
- **Nothing else is retried.** Exit 128 without those words (a ref that does not exist) and
  every other exit code (a build that fails) still fail at once. Only the failed attempt's own part
  of the log is read, from the runner's `==== <id> prepare started` line, so an earlier attempt's
  git line never makes a later, different failure look transient. A pilot or a command block
  that fails on the network is the job's own business, as before.
- **The runner admits no job after a start until git answers.** `gitReachable()` runs `git
  ls-remote --exit-code origin refs/heads/pc-jobs` in the queue's clone, at most every 20 s
  (`GIT_GATE_EVERY_MS`), until it succeeds once. It is asked only when the schedule would start
  a job. Until then, the jobs the schedule picked are listed as `queued` with the reason
  "waiting for git to reach the remote". Jobs already running (adopted after a restart) are
  monitored as always. Past `GIT_GATE_MAX_MS` (10 minutes from the start), jobs are admitted
  anyway: a check that cannot pass never stalls the lab, and their prepares still retry.
  Without a clone of the queue yet, there is nothing to ask, and the gate is open.

**Tests** (`web/test/lab-runner.test.ts`, `D391:`). The classifier fires on exit 128 only and
not on a missing ref. A prepare failing twice with the boot message is retried at 15 s and
30 s, then the job runs to `done`. One failing for good is failed after 10 minutes, having
started 6 to 10 times. A missing ref is failed at once with one start, and so is a retry that hits a missing ref after a
boot failure. A restarted runner whose
`ls-remote` fails starts nothing, then starts the job 20 s after git answers; one that never
answers admits it at 10 minutes.

**Rejected.**

- *`After=network-online.target` on the service.* User units cannot order against system targets
  reliably, and what failed was git reading its credentials, which a network target does not
  promise.
- *A fixed sleep at start.* It either waits too long on every start or not long enough on a slow
  boot.
- *Retrying every failed prepare.* A failing build or a bad ref would cost 10 minutes of the
  queue, every time.
- *Letting a failed dependency unblock `after:`.* It would change what `after:` means for every
  job (D365). The fix belongs where the failure was wrong in the first place.
