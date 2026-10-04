## D382 — Rollout labels: a dataset position played out K times by Forge Default on both seats from the viewer's redacted view, the opponent's hidden cards dealt from the pool; `coach-grade.sh rollout` labels, `rollout_labels.py` plans and packs for `--soft-labels`

*Branch `c/rollout-labels`. Written as D379, then D380; main took D379 (decision files),
D380 and D381 first, so it is D382 (`tools/decisions.mjs next`). It builds the producer D364 left open (item 10), on D334's grader and D348's pool knowledge.*

**2026-10-04**

**Context.** D364 gave `train_eval.py` a `--soft-labels F.npz` hook (`game`, `rows_to_end`,
`p`, `k`) with no producer. A D305 row's label is one game's result (+1 / −1), and that is
the noisiest thing about it. The lab's games are Forge Default against Forge Default. So
the mean result of K Default-vs-Default games played on from the row's own state estimates
the same quantity, with about 1/K of the variance. The estimate is up to the rebuild's
fidelity and the dealt hidden cards.

**Decision.** The producer has three parts. Every constant is a flag default written here,
not a rule that decides anything: the labels change targets, never a gate.

- **`tools/coach-grade.sh rollout`** (`mtgtable.grade.Rollout`, `CoachGrade rollout`). For
  each moment it does four things:
  - rebuilds the state frame the row names (by its `seq`) with D334's `Rebuild`, from the
    viewer's redacted log;
  - deals the hidden cards with `SearchPolicy.playout`'s determinizer. The viewer's
    library comes from their own deck list (the log header's path). The opponent's hand,
    library and unknown face-down cards come from the **pool**: the cube's list minus the
    viewer's deck, drafted pool and every public card (D348). The opponent's real hidden
    cards are never read: the log does not carry them (hard rule 8);
  - plays the copy to the end of the game, or 40 turns (scored a draw), with Forge's
    Default AI on both seats and **nothing forced**. The new
    `SearchPolicy.forgeCand()` only hands the viewer priority, as a priority candidate
    does; the search's own candidates and behaviour are unchanged;
  - writes the viewer's mean result, `p = (wins + draws / 2) / k`, with its Wilson
    interval, every playout's value, the rebuild's fidelity notes, the first error's
    stack frames, and the time.
- **Seeds and keys.** Round r plays on `GradeMath.roundSeed(seed, key, r)`, for the deal
  and the engine stream both. The key is `<game key>#<state frame>`: encode.py's
  `game_key`, which survives D370's archive. So a label does not move when the dataset is
  rebuilt or a log is moved.
- **Knowledge is pool mode only, stricter than the live guard.** A moment naming
  `oppDeck`, or `oppDeckPublic` with any reason, is refused, as is one with no pool. The
  pool then passes `HiddenPool.checkLive`, which refuses the opponent's own deck file and
  any pool under 80 cards. `--opp-deck` on the command line refuses the whole run.
- **Resume.** A run resumes by moment id, across every shard file and a changed `--jobs`
  (`--done`, written by coach-grade.sh).
- **`tools/ml/rollout_labels.py plan`** picks the training rows:
  - stratified by the game's queue folder (`normal/<cube>`, `bridge/<a>+<b>`) and turn
    bucket (1–2, 3–4, 5–6, 7–9, 10+);
  - every stratum gets `--floor` 50 rows first, the rest in proportion;
  - at most `--per-game` 2 rows a game;
  - from the train split only, since val and test score against outcomes;
  - each row mapped to its state frame by re-encoding its game with the dataset's own
    schema, with `--jobs` processes. The plan is identical for any `--jobs`;
  - rows whose state has a stack, or that sit in a combat damage step, are not planned.
    The rebuild restores a stack only for a target decision (D334), and a damage step's
    Combat is not rebuilt; Forge then throws in every playout (measured). Those rows keep
    their outcome label;
  - the draw is `--oversample` 1.4 × n, with n kept, in a seeded random order, so any
    prefix (a night's block) is a random subsample of the plan;
  - a game the archive recompressed to `.zst` gets a verified gzip copy under the work
    folder, because Java reads gzip only (D370). The queue's folders are never written.
- **A state rebuilt inside the beginning-of-combat step** gets the empty `Combat` Forge
  makes as that step begins (`Rollout.ensureCombat`, a fidelity note). Without it the next
  step throws: 6 of the 24 measured positions did.
- **`pack`** writes the `.npz` that `read_soft_labels` reads: int64 `game`, `rows_to_end`
  and `k`, and float64 `p`, sorted.
  - A line is kept when its status is `ok` and `k ≥ --min-k`.
  - A line whose `gameKey` is not the dataset's `game_key` at that index is refused (a
    dataset rebuilt since the plan).
  - A sidecar `<out>.json` records what made the labels: D382, HEAD, whether the
    producer's code was dirty, the jar's sha256, the seeds, each results file's sha256 and
    the dataset's schema id. This is D341's question for a derived file.
- **`summary`** prints the cost and the statuses as one JSON line, for the runner's
  `metrics:`.
- **Holds.** `tools/lab/archive-holds.json` holds nights 1–3 on the hot disk until the
  labelling jobs (J076–J080) are done (D378). The hold guards only a cold-archive run
  whose code has it: J070 (nights 1–2 to the cold tier) is pinned to 061af76, whose holds
  file predates this one. So a later J070 must be re-pinned at or after this decision's
  merge, or list J076–J080 in its `after:`.

**Reproducible for a fixed seed.**
- `coach-grade.sh rollout-selftest` labels a committed lab position twice on one seed. It
  requires the same result for every playout, one by one, and refuses an opponent list
  (public or not) and a missing pool. It passed here (9 checks, ~25 s).
- `GradeSelfTest` (in `bridge/build.sh`, so CI's bridge job) holds the label arithmetic,
  the key, the 32 distinct round seeds and the frame lookup by `seq`.
- `tools/ml/tests/test_rollout_labels.py` (12h; CI's standard-library half skips its numpy
  cases) holds that:
  - the plan is the same for one seed and for any `--jobs`, and differs for another seed;
  - every moment is the dataset row's own decision state, with an empty stack and outside
    a damage step;
  - the pool is the cube's;
  - the packed file is accepted by `train_eval.read_soft_labels`;
  - a rebuilt dataset is refused;
  - an archived game gets a byte-identical gzip copy.
- **The one limit:** Forge's own AI gives up a decision after 1 s inside a rollout
  (D311), so under heavy load two runs on one seed can still differ. The self-test runs on
  a quiet engine.

**Measured** (this container: 4 shared cores, the pinned 2.0.14 jar fetched as CI fetches
it, never committed).

- **The engine smoke** (`rollout-selftest`; the committed lab recording, a turn-3 row, one
  JVM): 4 playouts in 7.6 s (1.9 s each), the same results on the same seed, and the
  refusals. 9 checks.
- **The committed fixture** (`fixtures/cubelab/recorded`: two games of the Synergy cube,
  with no deck file, so the viewer's library is basics): 8 positions over turns 1–11,
  K = 8, one JVM on a quiet machine.
  - 8 of 8 labelled;
  - 11.0 s a position (median 10.3, p90 16.8), 1.28 s a playout (median);
  - 94 s with the engine's boot.
- **A six-draft Vintage-cube run recorded here** (the decks known, as on the PC): 24 planned
  positions, K = 8, 3 JVMs on 4 shared cores (load 2–6).
  - 24 of 24 labelled. Before `ensureCombat` it was 18: the 6 beginning-of-combat rows
    threw;
  - 19.9 s a position (median 11.9, p90 31.5), 1.49 s a playout (median);
  - by turn bucket: 1–2 20.1 s, 3–4 11.1, 5–6 12.4, 7–9 12.5, 10+ 25.4. Early positions
    play the longest games;
  - 1 playout error in 192;
  - mean p 0.66, mean |p − outcome| 0.34.
- **Run twice on one seed** (before and after the rebase onto D370, on 3 loaded JVMs): the
  18 positions both runs labelled gave identical results, playout by playout, all 144.
- **Coverage.** Of that run's 1,971 rows, 70.9% are playable, 15.4% have a stack and 13.7%
  are in a damage step. Hence `--oversample` 1.4.

**Also fixed here: `WireLog` read no gzip at all since D370.** The zstd sniff reads four
bytes, and the gzip test still asked for `got == 2`. Every `.jsonl.gz` was parsed as
text, which breaks `coach-grade.sh` grade, batch, review, the rollouts and the D354 gate
builders that read a lab recording through it. The fix is `got >= 2`. `GradeSelfTest` now
reads a gzip log, and with the old line it throws and `bridge/build.sh` fails (negative
control run).

**For the PC.** J050 measured 2.65 s per full-game playout per JVM on the 9700X. At K = 8,
that is about 22 s a position on each of 7 JVMs, about 1,150 positions an hour, and about
10,000 a night (about 8.7 h). 50,000 rows is therefore five nightly blocks, J076–J080, each
the next 10,000 lines of one plan. K = 8 cuts a row's label variance by 8 against the
outcome's (a standard deviation of at most 0.18 against 0.5). K = 4 would halve the nights.

**Rejected.**
- Playing out every option and taking the best (the grader's `grade`). That labels the
  value of best play, not of the position as the data's own policy plays it, and costs
  about 5× more.
- A horizon rollout scored by the leaf evaluator. The label would then carry the model
  being trained.
- Reading the opponent's real deck from the lab's drafts.jsonl. That is the cheat D312 and
  D348 forbid, even though a lab game's lists are on disk.
- Restoring archived recordings into the queue folders (D370's `restore`). That doubles
  the hot disk; a copy under the job's own folder is read-only for the queue.
- A rebuilt combat for the damage steps. It is not small, and those rows keep their
  outcome labels.

**Not done.**
- The rollouts on the PC (the job draft is in the PR, not posted).
- Whether soft labels help: that is a `train_eval.py --soft-labels` run against the same
  test pairs, after the labels exist.
- A stack rebuild for priority rows.
