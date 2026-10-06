## D385 — The coach helper reviews every human game the bridge finishes, by itself, at low priority, only while the lab runner leaves room; through `/review`'s own code path, never twice

*Branch `c/auto-review`.* Amends D353.

**2026-10-04**

**Context.** The post-game review (D353) ran only when ForgeCoach asked for it
(`POST /review`), and it takes minutes. The player wants it waiting when they
open the review screen. The same PC runs the lab runner (D337), whose jobs
must not be slowed by it, and its reviews must follow the live analysis's
knowledge rule (D348): never the opponent's real list.

**Decision.** `tools/auto-review.mjs`, owned by the coach helper beside its
review runner:

- **How it learns a game ended: it polls `var/games/`** every 15 s. The bridge
  writes every seat's log there (`MtgTable`: `var/games/<gameId>/frames.jsonl`,
  one per game, M38), and a log that holds an `over` is a finished game. Only
  a person's game ids are looked at — D369's `human-(ws|console)-<seed>` and
  `match-m<13 digits>`, each with `-g<n>` — and a log is taken only when its
  header's `transport` is `ws` or `console`, `hello_ok` puts a non-AI player
  in the viewing seat and only AIs elsewhere, and its `over` names a winner or
  a reason (`human_collect.py`'s test, D369). The gate's, the smoke runs', the
  lab's and the cube lab's games have other ids or other directories;
  spectating writes `var/spectate/`; a scripted seat under transport `auto`,
  an AI-vs-AI recording, a crash's null `over` (M46) and a game in progress
  fail the test. What the header cannot tell apart is a scripted client
  driving the `ws` seat under the default `human-ws-<seed>` id: its log looks
  exactly like a person's, and is reviewed as one. A plain log's last 64 KB
  must hold `"over"` before the whole of it is parsed. Every log judged is
  remembered in the queue file (`seen`: its path, size and mtime, and the
  verdict), so a restart reads only the logs that changed, and a scan reads
  at most 4 whole logs before it yields the event loop, newest first, the rest
  on its next turn (an 8 MB log is about 95 ms to judge: a backlog must not
  stall the helper that `play.sh` is polling for `/health`). Only logs written
  after the queue was first made count, so turning it on reviews no history.
- **It goes through the runner's own `post`** with no knowledge fields: the
  same validation, `gameLog` path rules, header seat and D348 guard as a
  request, and the report lands in the runner's list — `GET /review/<id>`, and
  `GET /review` with its `gameId` — marked `"auto": true`. With no pool the
  report's `knowledge.opponentModel` is `basic-lands`, which docs/game-review.md
  already says a screen must flag.
- **Low priority, one worker, the lab first.** One automatic review at a time,
  newest game first; only when the review runner has nothing running or
  waiting (so it never takes a queue slot a request needs), and only when the
  lab runner's `status.json` (statusjson.ts, schema 1, found where
  `tools/runner/cli.ts` puts its state: `<lab>/runner/var/runner/`, else this
  checkout's `var/runner/`) says it is idle (`state` "idle" or no `running`
  job), or below its core budget (`host.coresTotal − host.coresUsed ≥ 1`; the
  review's `--jobs` is then at most the free cores), or the runner is not
  running (no file, or a `heartbeat` — else `updated`, else the file's mtime —
  over 2 minutes old: it writes one every 10 s tick). A `running` job with
  `cores: null` is one the runner shows but does not run (the PC session's
  own unit: "not run by the runner"); its width is unknown and `coresUsed`
  counts it as 0, so it closes the gate. The spawn is prefixed
  with `nice -n 19` and `ionice -c 3 -t`, each only where a probe of it runs
  (`-t`: run anyway where the class cannot be set); without `nice` the runner
  calls `os.setPriority`. Every JVM `coach-grade.sh` starts inherits both. A
  review that started stays running if the lab gets busy later: at niceness 19
  it only takes idle cycles.
- **A request preempts it.** A `POST /review` while an automatic review runs
  stops that review (its process group), drops it from the list (it is not a
  failure) and hands it back to the queue without spending an attempt, which
  runs it again later unless the request reviewed the same game.
- **Never twice; crash-safe.** The queue is
  `var/coach-grade/auto-review/queue.json`: written to a temporary file,
  fsynced, the old file renamed to `.bak`, the new one renamed into place,
  the directory fsynced where it can be opened; read from the file, else the
  `.bak`, else a fresh queue (a file that is not a queue is moved aside, never
  trusted). A `var/` it cannot write turns the automatic review off for the
  session, logged once, and `/health` says `"autoReview": 0`; the helper
  keeps running. Each game's key is `gameId|seed|startedAt` (D369's), so a
  reused id is a new game — and because a replayed seed (`play.sh --seed 42`
  again) truncates and rewrites the same `frames.jsonl`, the log is judged
  again just before its review starts and must still carry the item's key;
  otherwise the item is `skipped` ("log replaced") and the new game, once
  finished, is queued as its own. `attempts` counts only crashes: a review
  stopped by a request or by the helper shutting down (its `stop()` puts the
  running item back to `pending` on disk at once) gives its attempt back; a
  `running` item found at load — the helper died under it — is `pending`
  again (a review is not resumable, D353), and `failed` the third time. Before
  an item is queued and again before it starts, any existing review of the
  same log — queued, running or done in the runner's list, asked for or
  automatic (a failed one does not count), or a `report.json` on disk naming
  the log, newer than it and not every decision an error — makes it
  `skipped`, so a lost queue file cannot cause a second review either; after
  a skip the next item is tried in the same tick. A finished review is not
  retried.
- **Reports outlive a restart.** The review runner's new `restore()` lists the
  newest finished reports on disk (`var/coach-grade/review/r*/report.json`, not
  one whose every decision is an error) again at the helper's start, so a
  `GET /review/<id>` keeps answering; an automatic review's folder holds an
  `auto` file, so it keeps its `"auto": true`.
- **gzip.** `gameLog` takes `frames.jsonl.gz` when there is no
  `frames.jsonl`, and the header seat is read through the gzip (a two-byte
  magic sniff, as `WireLog` does since #73); a zstd archive (D370) is not read.
  The Java side is GradeSelfTest's "WireLog reads a gzip log".
- **The switch**: `config.json` `"coach": {"autoReview": true}` (the default;
  `false` turns it off; anything else stops the helper at start) and the
  helper's `--no-auto-review`. `play.sh` passes `--no-auto-review` under a
  self-test's fake engine (as D369's collector is skipped there), and the
  helper self-tests run with it off. `/health` gains `"autoReview": 1|0` (0
  wherever `"review"` is 0) and, with 1, `"autoReviewQueue": {"pending",
  "running", "gate": "open"|"review-busy"|"lab-busy"}` — only those three
  words (the bridge not being built when it last looked reads
  `review-busy`).

**Versions.** New `/health` keys and a new `"auto"` key on a review are
additions, which an older ForgeCoach ignores (tools/CLAUDE.md's coach-helper
rule 5, D325; D381 read it the same way), so `helper` and the review report's `v` stay 1. D341's lab version
hashes `bridge/src`, `tools/cubelab` and `forge-home`; nothing here touches
them, so no lab folder changes version.

**Held by** `tools/auto-review-selftest.mjs` (gate 12f, CI's redaction job):
over scratch games and a scratch runner `status.json`, the real review runner
driving a fake `coach-grade.sh` — which games are taken, the lab gate in each
state, the prefix and the spawn under it, `--jobs` narrowed, newest first, one
at a time, `"auto": true` in both GETs and after `restore()`, a `.jsonl.gz`
log and its seat, dedupe across ticks, a restart, a request and a lost queue
file, a failed request not counting, preemption (its process group dead) and
the rerun without a spent attempt, a clean stop three sessions running, a
replayed seed's log skipped and the next item started in the same tick, the
scan remembered (a second start reads nothing unchanged) and sliced, a
`cores: null` job, the runner's status writer still naming the fields the gate
reads, `/health`'s three words, an unwritable `var/`, the switch, the queue
file torn, foreign and resumed, and the helper's `/health`. `coach-helper-selftest.mjs` checks `"autoReview": 0`
with the switch off.

**Rejected.**

- *A hook at the game's end in the bridge or `play.sh`.* The bridge knows
  nothing of the helper, and `play.sh` sees the engine's exit, not a game's
  end (a match is three games in one JVM). A new channel for something the
  log already says.
- *`fs.watch`.* Recursive watching is uneven across platforms and file
  systems, and a game ends once a few minutes: a 15 s poll of one directory,
  with logs read only when they change, costs nothing.
- *Guessing the cube for a pool* (D369's `guess_cube`). It would be a second
  copy of that logic, and a guess at what the player knew; ForgeCoach, which
  has the pool, can ask for a pooled review of the same game.
- *Its own runner or a second queue slot.* Two reviews at once would compete
  with each other and with the lab; one worker behind the request queue keeps
  `/review`'s "one at a time".
- *Waiting for the lab to be wholly idle.* The runner's jobs rarely fill the
  core budget, and a review at niceness 19 on the cores left over is what the
  budget is for.
