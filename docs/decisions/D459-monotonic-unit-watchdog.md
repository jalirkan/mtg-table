## D459 — The cube lab's worker watchdog runs on a monotonic clock, and an atlas unit's limit is `--unit-timeout` minutes (30)

*Branch `pc/cubelab-watchdog-monotonic`. `node tools/decisions.mjs next` gave D457 on 2026-10-22,
which PR #174 (`pc/ledger-followups`) holds; D458 is left for the atlas lane working beside this one
(`pc/atlas-random-seat-failed-casts`), so this is D459.*

Amends **D451** (the move atlas) in one respect, its unit's time limit; and the pool every lab command
shares (`tools/cubelab/engine.ts` `runPool`, D293) in one, the clock its watchdog reads.

**2026-10-22**

**Context.** J148's summary (*The two problems*, (b)): seven of the atlas's eleven failure records were
"no answer in 7960 s (hung)" on d1-random-0/25/50/75, and none was a hang. `runPool` stamped each match
`Date.now()` when it handed it over and killed the worker once `Date.now()` was past that stamp plus the
deadline. On 2026-10-20 and 10-21 the PC booted with the wall clock 4 h behind (Windows writes local time
to the RTC) and NTP set it right a minute or two later; every worker running at that moment was 4 h
"old" at the next 2-s tick and was killed — 4 workers at the 10-20 boot, 3 at the 10-21 one. The retries
took 275–352 s. Separately, the deadline itself was absurd for a unit: the pool derives it from the
game timeout, `games × (gameTimeoutSec + 40) + 120`, and an atlas unit's game timeout is
`1800 + k × chunk × 120` so that the Java side never cuts a unit short — 7,960 s for these units, over
two hours before a genuinely stuck one would have been let go.

**Decision.**

1. **Every duration in `tools/cubelab` that decides to kill, retry or time out is read from a monotonic
   clock.** `engine.ts` exports `monotonicMs()` (`performance.now()`), and the pool's watchdog stamps
   and compares with it. The Java side already was (`System.nanoTime()` throughout `CubeLab.java` and
   `Atlas.java`'s branch deadline). The other `Date.now()` uses under `tools/cubelab` were classified
   and stay: every one is a timestamp or a duration that is only reported — the facts lookup's
   seconds (`engine.ts`), the games/h and branch games/h lines and `ms` fields (`atlas.ts`,
   `censusplay.ts`, `run.ts`), the draft and build `ms` (`lab.ts`, `drafters.ts`, `selfplay.ts`,
   `shapes.ts`, `llmdraft.ts`, `humanpicks.ts`), the replay's `ms` (`censusreplay.ts`), the redaction
   check's `ms` (`censusplay.ts`) and the watch's `startedMs`/`endedMs` (`watch.ts`, reported in
   `match.json`). A jump can make one of those numbers wrong; none of them can stop a game.
   `spawnSync`'s own `timeout` (the facts JVM, the redaction check) is libuv's, which is monotonic.
2. **A job may carry its own watchdog limit, `deadlineSec`** (seconds of monotonic time). Without it the
   pool's limit is the old formula, unchanged (`matchDeadlineMs`), so `run`, `census-play`, `watch` and
   the rest behave exactly as before apart from the clock. The Java side never reads the field.
3. **The atlas sets it from `--unit-timeout <minutes>`, default 30** (`UNIT_TIMEOUT_MIN_DEFAULT`), on
   phase B's units only. The number is J148's own: of the 488 units that finished (the J143–J148 folder,
   `phaseB/units.jsonl`, the unit's in-JVM `ms`), the median took 115 s, the 90th percentile 358 s, the
   99th 777 s and the longest 976 s — d6's 150-branch random unit, where the Spellbinder pay loop lives,
   on a machine that ran 3 to 7 workers and swapped. The 15 minutes first proposed would have killed that
   honest unit; 30 minutes is nearly twice it, and a unit that really is stuck is let go after half an
   hour instead of 2 h 13 min. A unit holds up to `--options` (8) × `--chunk` (25) branch games; at
   J148's mean of 2.28 s a random branch that is 7.6 minutes, and the limit allows 9 s a branch at
   the largest unit (the 976-s unit ran at 6.5 s a branch). A larger `--chunk` or a slower machine wants a larger `--unit-timeout`; the plan records
   the value (`unitTimeoutMin`) but a resumed atlas may change it, since it changes no result. The unit's
   own game timeout (`gameTimeoutSec`) is unchanged: the Java side still never cuts a unit short, and
   the pool's 30 minutes now always comes first.

**Tests.** `web/test/cubelab-watchdog.test.ts` runs the real `runPool` with a fake `java` first on PATH
that speaks the worker protocol (no engine): Date.now() jumped 4 h forward while a unit plays, and the
unit's answer after the pool's first tick is taken as a result — with `monotonicMs` put back on
`Date.now()` the same test fails with "no answer in 60 s (hung)"; a worker that never answers is killed
at its 1-s deadline; and `matchDeadlineMs` gives 7,960 s for J148's units without `deadlineSec`.
`web/test/cubelab-atlas.test.ts` holds a unit's `deadlineSec` to `--unit-timeout`.

**Not changed, and a follow-up.** The lab runner's step timeout (`tools/runner/runner.ts`, `monitor`:
`now - r.unitStartedAt > job.timeoutSec * 1000`, with `sys.now()` = `Date.now()`) has the same exposure:
J143's 9 h wall timeout fired after about 5 h of real time. It is not this file's — it lives in the
runner, its start is persisted across runner restarts (a monotonic clock does not survive a reboot), and
the fix wants its own decision.

**Rejected.** *Keep `Date.now()` and ignore jumps larger than an hour*: a heuristic that a slower jump
still beats, where the monotonic clock is the right instrument and costs nothing. *15 minutes*: it would
have killed J148's longest honest unit (976 s). *Scale the limit with the unit's branch count*: closer
to the truth, but the request was a number of minutes a person can read and set, and a flat 30 covers
the largest unit at nearly four times J148's mean branch time.
