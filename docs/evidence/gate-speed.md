## Gate speed — `tools/check-all.sh` in parallel (2026-09-28, D160–D166)

The gate-speed lane, worked in the worktree `/home/justin-a/code/mtg-table-t2s`
on branch `gate-speed`, from `main` at `4408283` (the narrator). The ask: the
gate in well under half its time with every assertion intact, a `GATE_JOBS`
knob, a log per step and a timing table, the order that matters kept as
dependencies, three parallel runs back to back and one at `GATE_JOBS=8` with
every flake reported, and two open PLAN.md notes closed (10g never asserted its
games were played; a `| head` under `pipefail` once cost step 6 its message).
The decisions are **D160–D166**, numbered in the lane's reserved range and
renumbered at merge.

Everything here ran on the user's desktop — AMD Ryzen 7 9700X (8 cores, 16
threads), 30 GB, OpenJDK 21 JRE, Forge 2.0.14 (`3c0a7c38…8e5dd9`) — **while
other worktrees ran their own gates and headless Chromium beside it**: the
1-minute load average was 4–18 across these runs, never idle. Each run below
says its load. Nothing was changed under `bridge/` or `web/`.

| | |
|---|---|
| **The parallel gate, `GATE_JOBS=4`, from a deleted `bridge/out`** | **253.4 s, 253.5 s, 253.6 s** back to back, exit 0 all three, load 9–16 (§2) |
| `GATE_JOBS=8` | **151.0 s**, exit 0, load 14–19 (§2) |
| The serial gate, the old script on the same tree | **921 s**, exit 0, load 8.0 at the start, 3.7 at the end (§6) |
| The serial gate, `GATE_JOBS=1` | **933 s**, exit 0, load 3.7, 7.3 at most (§6) |
| The final run (`var/check-all-gate-speed.log`) | **274.4 s**, exit 0, `GATE_JOBS=4` (the default), `WSPORT=8790`, from a deleted `bridge/out`, load **5.76** at the start, 18.02 at most, 12.29 at the end — other lanes' gates and test suites started beside it (§2) |
| Flakes in 6 parallel runs (5 green + the final) | **none** — and a Forge achievements file that a lone JVM's exit leaves empty (serial gates too) costs a printed stack trace, asserted on by nothing (§3.2) |
| Findings | a preferences fingerprint that failed any fresh checkout's first ten-games row (D164, §3.1); a latent pipefail false negative in two UNIMPL checks (D163, §4) |

---

### 1. What was built

- **`tools/check-all.sh` is a job table and a scheduler** (D160). Each step is a
  function run in a subshell of its own (`set -e`, its step number for `die`,
  stdout and stderr to `var/check-all/<run>/<job>.log`); a job starts when every
  job it depends on has passed, in a fixed priority order, while fewer than
  `GATE_JOBS` are running. 46 jobs in parallel mode: 6b is three, 9c is fourteen
  rows and a report, step 10 is seven, step 11 two, step 13 three.
- **`GATE_JOBS`** defaults to `min(4, nproc/4)`, at least 1 — 4 here.
  `GATE_JOBS=1` runs the jobs in the serial order with each one's output
  streamed to the console as well as its log (§6).
- **Step 10's seven servers** listen on `WSPORT+0` .. `WSPORT+6` when
  `GATE_JOBS > 1` (D162).
- **Step 13 in parallel** is `npm run build`, `npm run test:render` (vitest) and
  `npm run test:node` (`node --test`, the only reader of `MTGTABLE_WS_LOGS`),
  and only the last waits for step 10 (D162).
- **`tools/ten-games.sh --jobs N`** (deck-smoke's pattern), plus `--run-row N`
  and `--report`, the gate's per-row entry points (D160).
- **The console** (D161): a line as each job starts and ends, then the table
  (`timing.txt`), and `gate.log`, every job's log in the serial order.
- **A failure** stops new jobs, TERMs every running job's process tree (only
  processes this gate started), prints the failed job's log tail and the table,
  and always a `check-all FAILED at step N` line (§7).
- **10g asserts each game was played** (D165, §5); **no `| head` / `| tail`** in
  a judged pipeline (D163, §4); **the preferences fingerprint is of files**
  (D164, §3.1).

The dependencies, in the header of `tools/check-all.sh` and in CLAUDE.md's gate
paragraph: everything after check-forge → lint → build; step 6 after step 5;
6b's comparison after its two recordings; 9c's report after its rows; the rows
and 9e after Smoke; `node --test` after 10a, 10b, 10c, 10d, 10f and 10g; step
11's fresh half and 12d after every recorder (fifteen jobs).

### 2. The parallel runs

Each from a deleted `bridge/out`, back to back, `./var/gs-series.sh` (the lane's
own driver, not committed): `var/check-all-gate-speed-{p1,p2,p3,j8}.log`, each
with its `var/check-all/<run>/` directory. The first trial run (`bridge/out`
kept) is listed for completeness.

| run | `GATE_JOBS` | `WSPORT` | wall | exit | jobs' seconds summed | load (1 min) start / max / end |
|---|---|---|---|---|---|---|
| trial | 4 | 8750 | 255.3 s | 0 | 989.3 s | 3.58 / 9.06 / 7.88 |
| **p1** | 4 | 8750 | **253.4 s** | 0 | 988.9 s | 12.36 / 13.01 / 9.08 |
| **p2** | 4 | 8750 | **253.5 s** | 0 | 978.4 s | 9.08 / 11.88 / 10.72 |
| **p3** | 4 | 8750 | **253.6 s** | 0 | 986.5 s | 10.72 / 15.78 / 14.53 |
| **j8** | 8 | 8770 | **151.0 s** | 0 | 1,079.1 s | 14.53 / 18.58 / 13.60 |
| **final** | 4 | 8790 | **274.4 s** | 0 | 1,061.8 s | 5.76 / 18.02 / 12.29 |

**The makespan is the pool's.** The jobs' seconds sum to ~985 s at four slots,
and 985 / 4 ≈ 246 s — the three runs landed within 0.2 s of each other at 253.
The games are wall-clock bound far more than CPU bound (AutoTransport's pacing,
Forge's 250 ms re-pushes, 10g's 2 s holds): the same jobs summed to 1,079 s at
eight slots, only 9 % more, and **at `GATE_JOBS=8` the makespan is 10g's own
~139 s plus `node --test`'s 7 s** — 10g is the critical path there, and nothing
the scheduler can do moves it.

Per job, the seconds are stable across runs (p1 / p2 / p3 / j8): 10g
134.6 / 133.8 / 133.7 / 139.1; vitest 63.3 / 57.4 / 55.2 / 74.1; 9d 51.6 / 48.6 /
49.3 / 56.6; 9e 45.4 / 45.1 / 45.6 / 47.6; the ten-games rows 18–35 s each;
10c/10d/10f 33–44; 7 33–36; 9b 32–36; 9 24–26; everything else under 16 s.

**The final run** (`var/check-all-gate-speed.log`, run
`20260928-120214-2955621`, 12:02–12:06) was meant to be the idle-box number, and
the box did not stay idle: it started at a load average of 5.76 and other
worktrees' gates and test suites climbed it to 18 within a minute. It took
**274.4 s** (the driver's own clock: 275 s), exit 0, its 46 jobs summing to
1,061.8 s — 7 % more job-seconds than p1, under the heavier load, and the same
shape: 10g 137.6 s from t = 6.6 s, vitest 76.3 s, 9d 53.8 s, the fourteen rows
18–35 s each, `node --test` the last job to start (265.3 s) and `npm run build`
the last to end. No run of this lane had the box to itself, so **the idle-box
figure is not measured**; the four-slot runs at load 6–18 are 253–274 s, against
the brief's 420 s.

p2's table, as the console printed it:

```text
== check-all timing: GATE_JOBS=4, WSPORT=8750, run 20260928-081047-2593672 ==
step  job               start      end  seconds  status  load(1m) at end
1     01-forge            0.0      6.3      6.3  ok      11.88
2     02-lint             6.3      6.4      0.0  ok      11.88
3     03-build            6.4      8.1      1.7  ok      11.09
4     04-smoke            9.3     25.0     15.7  ok      11.25
5     05-record          10.0     20.0      9.9  ok      11.88
6     06-drift           20.0     27.7      7.6  ok      11.25
6     06b-paced          98.9    109.4     10.5  ok      7.61
6     06b-seat1         104.7    113.8      9.0  ok      7.72
6     06b-check         113.8    114.0      0.1  ok      7.72
7     07-null            79.3    112.8     33.4  ok      7.61
8     08-console        233.6    236.8      3.1  ok      8.47
9     09-auto           112.8    137.3     24.5  ok      5.87
9     09b-drift         109.4    142.0     32.5  ok      6.85
9     09c-row01         137.3    168.5     31.2  ok      10.26
9     09c-row02         142.0    161.0     18.9  ok      9.96
9     09c-row03         142.0    165.1     23.1  ok      10.28
9     09c-row04         159.1    187.4     28.2  ok      8.43
9     09c-row05         161.0    194.0     32.9  ok      7.95
9     09c-row06         165.1    196.3     31.1  ok      7.95
9     09c-row07         168.5    194.8     26.3  ok      7.95
9     09c-row08         187.4    217.8     30.3  ok      7.85
9     09c-row09         194.0    227.0     33.0  ok      8.14
9     09c-row10         194.8    223.6     28.7  ok      8.14
9     09c-row11         196.3    220.2     23.9  ok      7.46
9     09c-row12         217.8    243.6     25.8  ok      8.96
9     09c-row13         220.2    246.9     26.6  ok      8.96
9     09c-row14         223.6    249.4     25.8  ok      11.13
9     09c-report        249.4    249.5      0.1  ok      11.13
9     09d-sideboard      25.0     73.7     48.6  ok      7.41
9     09e-match         114.0    159.1     45.1  ok      9.96
10    10a-smoke         227.0    230.6      3.5  ok      8.77
10    10b-drop           73.7     79.3      5.5  ok      6.81
10    10c-auto           27.7     60.6     32.9  ok      8.33
10    10d-refuse         60.6     98.9     38.2  ok      5.34
10    10e-m11           230.6    233.6      3.0  ok      8.47
10    10f-probe          65.8    104.7     38.9  ok      6.36
10    10g-three           8.1    142.0    133.8  ok      6.85
11    11-fixtures         8.1     10.0      1.8  ok      11.09
11    11-fresh          243.6    243.9      0.2  ok      8.96
12    12-selftest         8.1      9.3      1.1  ok      11.09
12    12b-catalog         8.1      8.3      0.1  ok      11.09
12    12c-crash         236.8    243.1      6.2  ok      8.96
12    12d-narrate       243.9    245.1      1.1  ok      8.96
13    13a-build         243.1    253.5     10.4  ok      10.72
13    13b-render          8.3     65.7     57.4  ok      8.30
13    13c-node          245.1    253.1      8.0  ok      10.72
wall 253.5 s for 46 jobs whose seconds sum to 978.4 s; load average (1 min) 9.08 at the start, 11.88 at most, 10.72 at the end
```

Every run's web counts were the ones spectating and the narrator recorded inside
the gate: **903 / 895 pass / 0 fail / 8 skipped** `node --test` (13c) and **98**
vitest in 7 files (13b); the lane touches nothing under `web/`.

**`tools/ten-games.sh --jobs 4` standalone** (after D164, below): fourteen rows
in **112 s** wall (1 m 52 s; 5 m 32 s of user CPU), every row `ok`, against
370–385 s serially in the gate's recent history.

### 3. Flakes and findings under load

**No job failed in any of the six parallel runs** (the trial, p1–p3, j8 and the
final run) — not step 6's value-level diff (D113), not 10e's ~150 ms
concede-before-input window (it ran at t ≈ 230 s at load 6–9 in the four-slot
runs, and at t ≈ 123 s at load 14–16 at eight), not 10g's queued `newGame`
(D114), not 12c's "prompt" bound (45 s; its runs took 5–7 s). Nothing was
retried (D166).

#### 3.1 Finding — a fresh checkout failed ten-games' first row (fixed, D164)

The first `./tools/ten-games.sh --jobs 4` in this worktree — a new checkout,
with no `var/forge/` — failed rows 1–4, every one on assertion 10:

```text
7d6
< var/forge/preferences: absent
ten-games FAILED: seed 1 CHANGED a Forge preferences file -- a run must never save prefs ...
```

`FModel.initialize` creates `var/forge/preferences/`, EMPTY, on a checkout's
first engine boot. No preferences file was written; the fingerprint printed
`absent` before and nothing after. This is not a concurrency defect — a serial
`ten-games.sh` on a fresh checkout fails its row 1 the same way — and the gate
had hidden it only because its steps 4–9 always boot the engine first. Fixed at
its cause: a directory with no file prints `<dir>: no files` whether it exists
or not, in `ten-games.sh` and 9e's `ms_prefs` alike. Checked both ways with the
function itself: absent and empty print the same line; a file in the directory
changes it.

#### 3.2 Observed — an empty Forge achievements file, and the stack trace it costs (benign; NOT a concurrency defect; not fixed)

In the `GATE_JOBS=8` run one row's server log (`var/ten-games/ten-1.log`), and in
the final run four JVM logs (`var/check-all-m2.log`, `var/check-all-ws-smoke.log`,
`var/check-all-match.log` and `var/ten-games/ten-5.log`), carry, among their
summary lines:

```text
[Fatal Error] constructed.xml:1:1: Premature end of file.
org.xml.sax.SAXParseException; systemId: file:/home/justin-a/code/mtg-table-t2s/var/forge/achievements/constructed.xml; lineNumber: 1; columnNumber: 1; Premature end of file.
```

(Those are the only two runs counted: a step's JVM log keeps its name from run to
run, so each run overwrote the one before it, and the job logs under
`var/check-all/<run>/` hold the step's own lines, not its JVM's.)

**What it is.** When a human seat's game ends, Forge updates its constructed
achievements (`AchievementCollection.updateAll`, the collection built lazily by
`FModel`): `load()` parses `var/forge/achievements/constructed.xml`, and
`save()` writes it back through `XmlUtil.saveDocument` — a truncate, then a
write. The file was EMPTY, the parse threw, and `load()` catches `Exception` and
only prints (`javap -c` on the 2.0.14 jar: its exception table covers the whole
parse with `FileNotFoundException` and `Exception` handlers that call
`printStackTrace`).

**Who empties it: a JVM on its own, serial gates included.** At the end of the
final run the file was 0 bytes with an mtime 267.4 s into the run — row 14's JVM
exiting, when the only jobs still running were `node --test` and `npm run build`,
so no other JVM was there to race. And another worktree's gate, running `main`'s
SERIAL script beside this lane's final run, left its own file at 0 bytes 90 ms
after its ten-games seed-5 server log's last line. The empty file is what a JVM
leaves when it exits between the truncate and the write; concurrency changes only
which later JVM reads it. A lone `--transport null` game over a valid file (a
probe, `var/gs-achv-probe.log`) printed nothing and did not rewrite the file: the
save runs only on the games that change an achievement, which is why so few JVMs
print the trace.

**What it costs.** A stack trace in a JVM log. No gate assertion reads a JVM log
for `Exception`, and every step and row that printed it passed. What it can lose
is Forge's achievement counters in the checkout's own scratch Forge home
(`var/forge/`, gitignored): an emptied file is read as an empty collection and
saved back as one. It is not fixed, and it is PLAN.md's gate-speed follow-up 1 —
the fix belongs to the bridge's exit path (let the game thread's save finish
before the JVM exits), which this lane does not touch, not to the gate.

### 4. `pipefail` and early readers (D163)

`grep -nE '\| *(head|tail)' tools/check-all.sh tools/ten-games.sh` now matches
three comment lines and nothing else. What changed:

| where | was | now |
|---|---|---|
| 9e, ten-games (assertion 3) | `if grep -n UNIMPL log \| grep -qv '…none$'` | two `grep -c` counts compared |
| ten-games' failure path | `grep -o … \| sort -u \| head -5` | `… \| sed -n '1,5p'` (reads all its input) |
| ten-games' sweep | `grep … \| grep -v … \| head -3` | `… \| sed -n '1,3p'` |
| 9e, ten-games' `deck_name`, `ai_prop` | `sed -n 's/^KEY=//p' f \| head -1` | `sed -n '/^KEY=/{s///p;q}' f` |
| every "`over` last" check | `[ "$(tail -1 f \| grep -c over)" = 1 ]` | `last_is_over f`: `$(tail -n 1 f)` and a pattern |
| step 8 | `printf '\n\n\n\nq\n' \| jvm …` | `jvm … <<< $'\n\n\n\nq'` (the same bytes) |

**The latent one is a false negative**, measured on a log of one
`UNIMPL members = none` line and 20,000 `UNIMPL` lines, under `set -euo
pipefail`:

```text
old pattern: MISSED (pipeline status 141 0)
new pattern: DETECTED
old pattern, 1 line: DETECTED
```

`grep -q` exits at its first line; the first `grep`, still writing once its
output passed the pipe buffer, took SIGPIPE; `pipefail` made the whole test
141 — false — so the `die` never ran. The more UNIMPL lines a log had, the surer
the old check was to miss them. The `tail -1 f | grep -c` form was never at risk
(`grep -c` reads everything), and was replaced so the grep over both files has
nothing left to explain.

### 5. 10g: each game played (D165)

Every 10g in these runs printed, for its three games, a `state` count and the
highest turn: `check-all-ws-3g` 117–118 state frames up to turn 13,
`check-all-ws-3g-g2` 167–168 up to turn 16, `check-all-ws-3g-g3` 258 up to turn
22. The check's own program, run on two hand-made logs: a game with one `state`
at turn 0 fails (`1 state frame(s), none past turn 0 -- the game was never
played`), and a game with none fails (`no \`state\` frame at all`).

### 6. `GATE_JOBS=1` is the serial gate

Back to back, each from a deleted `bridge/out` at `WSPORT=8780`
(`var/gs-serial.sh`, the lane's own driver, not committed): first `main`'s
script at `4408283`, run from a temporary copy (`tools/zz-check-all-baseline.sh`,
deleted afterwards), then this tree's at `GATE_JOBS=1`.

| run | wall | exit | 9c (fourteen games) | load (1 min) start / end | log |
|---|---|---|---|---|---|
| `main`'s serial script | **921 s** | 0 | 369 s | 8.01 / 3.71 | `var/check-all-gate-speed-old.log` |
| `GATE_JOBS=1` | **933 s** | 0 | 381 s (`09c-ten` 380.6 s) | 3.71 / 3.73 (7.27 at most) | `var/check-all-gate-speed-s1.log` |

The twelve seconds are within the serial gate's own spread (9c alone moved 12 s
between the two). `GATE_JOBS=1`'s table sums its thirty jobs to 933.0 s against
933.1 s of wall: the runner itself costs nothing measurable.

**The log is the old log.** Each console log from its second line to
`check-all OK`, with `tools/ws-auto-play.mjs`'s per-act trace lines dropped (the
client's timing chatter, `[ws-auto  NNNms] ACT …`, different on every run) and
every run of digits turned into `#`: 2,405 lines against 2,392, and the only
differences are

- 9b's advisory block — the multiset diff of a seed-42 re-recording, whose
  count of `Waiting for Forge AI...` re-pushes is wall-clock (below), 16 lines
  shorter in the second run; and
- 10g's three new lines, `OK: check-all-ws-3g… was played: N state frames, up
  to turn T` (**D165**).

Then `GATE_JOBS=1` prints the timing table after `check-all OK`. One stream
changed and is PLAN.md's follow-up 5: each job runs under `2>&1 | tee`, so the
serial console carries `die`'s stderr on stdout — the bytes are the same.

**9b's advisory fired in every run, serial and parallel alike.** It is the
known noise the step's own NOTE describes, and it was there before this lane:
the same "reaches dir=s2c" advisory is in other worktrees' serial gate logs of
the same morning. `state` frames were identical in number every time; the
difference is `input` re-pushes of `Waiting for Forge AI...` and the seat's
acts on them, and it grows with the load a run is under:

| run | `input` | `act` | `state` |
|---|---|---|---|
| `main`'s serial script | −2 | 0 | 0 |
| `GATE_JOBS=1` | +2 | +1 | 0 |
| trial (4) | +2 | +1 | 0 |
| p1 (4) | +14 | +4 | 0 |
| p2 (4) | +2 | +1 | 0 |
| p3 (4) | +8 | +2 | 0 |
| j8 (8) | +12 | +3 | 0 |

9b is advisory by design (M3 follow-up 7) and stays so; `DRIFT_FATAL=1` would
have failed every one of these runs, serial ones included.

### 7. The failure path

Two injected failures, both on this tree, both leaving no process behind
(`ps -eo pid,args | grep mtg-table-t2s` empty afterwards):

- **Parallel, a job capped while three others run** (`GAME_TIMEOUT=8
  GATE_JOBS=4 WSPORT=8760`): 10g's server hit its 8 s cap; the client failed;
  the job failed at 14.5 s. The console printed `FAILED 10g-three`, the last 60
  lines of `10g-three.log` (ending in its own `check-all FAILED at step 10:
  tools/ws-auto-play.mjs --games 3 --comfort did not finish against
  127.0.0.1:8766`), the table — `04-smoke`, `05-record` and `13b-render`
  `killed`; steps 1–3 and three cheap checks `ok`; 36 jobs `not run` — and
  exited 1.
- **Serial, a job that dies without a message** (`GATE_JOBS=1`, with a directory
  where step 5's recording goes, so its `rm -f` fails under `set -e`): the
  console printed `rm: cannot remove 'var/check-all-record.jsonl': Is a
  directory`, then `check-all FAILED at step 5: job 05-record exited 1 without a
  message (log: …/05-record.log)` — the line D113's silent 141 never got — the
  table, and exited 1.

### 8. `~/forge` and `~/.forge`

Before: listings taken at 06:54 (before this lane's worktree existed — every
file directly under `~/forge` with its size and mtime, and the sha1 of every file
under `~/.forge`), at 08:08 (the jar's sha256) and again at 12:00, just before the
final run. After the final run (12:07), each was taken again the same way:

- `~/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar`: sha256
  **`3c0a7c385b9207e593fe149255e00d1cd7e556809f138568d07e3828b78e5dd9`**,
  unchanged;
- the 26 entries directly under `~/forge`: identical names, sizes and mtimes to
  both listings; `find ~/forge -newer` the 06:54 listing: nothing;
- the 7 files under `~/.forge`: identical sha1s to both listings (its
  `decks/constructed/` is empty, as it was); `find ~/.forge -newer` the 06:54
  listing: nothing.

**`~/forge` and `~/.forge` are unchanged.** Every Forge home this lane's runs
used is under the worktree: `var/forge/` (the gate's JVMs), `var/crash-probe/`
(12c's scratch home).

### 9. Commands

```bash
./tools/check-all.sh                              # GATE_JOBS = min(4, nproc/4)
GATE_JOBS=1 ./tools/check-all.sh                  # the serial gate
GATE_JOBS=8 WSPORT=8770 ./tools/check-all.sh      # step 10 on 8770..8776
./tools/ten-games.sh --jobs 4                     # fourteen rows, four at a time
./tools/ten-games.sh --run-row 13                 # one row, numbered 13/14 (the gate's job)
./tools/ten-games.sh --report                     # the blocks, the sweep and the summary
cat var/check-all/<run>/timing.txt                # a run's table
less var/check-all/<run>/gate.log                 # a run's whole log, in the serial order
```
