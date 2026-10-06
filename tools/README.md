# tools/ — every script, in one table

Run every one of these from the repo root (CLAUDE.md hard rule 9); each reads the
engine jar from `config.json`'s `forgeJar` or `$FORGE_JAR`, never from a
hard-coded path. The header comment of each file is its manual; this page only
says what each one is for, whether `./tools/check-all.sh` (the gate) runs it,
and whether it needs the Forge engine.

**In the gate?** names the gate step (`check-all.sh`'s own numbering), **CI**
means `.github/workflows/checks.yml` runs it too, and **no** means you run it by
hand. **Needs the engine?** is *boots Forge* for a script that starts a JVM that
loads the engine (the jar plus `res/`), *jar* for one that only compiles or reads
class files against it (javac, javap), and *no* for one that needs neither.

| script | what it does | in the gate? | needs the engine? |
|---|---|---|---|
| `check-all.sh` | **The gate.** Every step below that says so, as jobs, `GATE_JOBS` at a time (D129); `GATE_JOBS=1` is the serial gate. Logs and a timing table under `var/check-all/<run>/`. | it *is* the gate | boots Forge |
| `check-forge.sh` | Asserts the jar is there and carries the eight classes the bridge links; prints its sha256. | step 1; CI | jar |
| `lint-bridge.sh` | The grep lint over `bridge/src` and `tools/**/*.java` (hard rule 10): banned accessors, the one serialiser, thread names, the three game-thread hops (D181, D182). `--list-rules`, `--root <dir>`. | step 2; `bridge/build.sh`; CI | no |
| `lint-bridge-selftest.sh` | The lint's negative controls: every rule it declares must fire on a snippet planted in a scratch copy under `var/lint-selftest/`, and a rule with no case fails (D180). | step 2b; `bridge/build.sh` (`--quiet`); CI | no |
| `config.sh` | Sourced, never run: sets `REPO_ROOT`, exports `FORGE_JAR`, and `forge_home_make` builds a job's own Forge home under `var/`. | sourced by the gate and most scripts | no |
| `make-forge-home.sh` | Builds the checkout's default `forge-home/`: `res/` symlinked beside the jar, the profile properties, D14's one-card overlay. Idempotent; run once per checkout. | no (the gate builds a home per job) | no |
| `villain-deck.sh` | Sourced, never run: `$VILLAIN`, the one deck the gate seats the AI behind (`VILLAIN_DECK` overrides). | sourced by 6b, 9c, 9e | no |
| `wire-drift.mjs` | Is a fresh AI-vs-AI recording the same wire as `fixtures/games/g1.jsonl`? Six questions a re-partition of the event stream cannot move (D113); `--strict` is byte for byte. | step 6 | no |
| `wire-drift-selftest.mjs` | Step 6's controls: the comparison must reject fifteen drifts and accept a reordered `stats` event (D121), a fresh file's M49 `keywords` over a committed file that predates them (D210), and a fresh file's M52 unblocked attackers (`blockerIds: []`) over a committed file that spells them as themselves (D290). | step 6; CI | no |
| `same-game.mjs` | Are two recordings of one seed the same game, from either seat? | step 6b | no |
| `fixture-multiset-diff.mjs` | Two frame logs compared as a multiset with `seq` stripped: content drift without frame-order noise. | step 9b (advisory) | no |
| `ten-games.sh` | M5's exit criterion and match setup's rows 11–14: fourteen `--transport auto` games, eight-plus assertions each. `--jobs N`, `--seed N`, `--games N`. | step 9c | boots Forge |
| `ws-smoke.mjs` | The M3 doorstep test against a running `--transport ws` server: connect, resync, concede — plus `--disconnect-mid-ask`, `--concede-before-input` and `--hold <s>` (connect early, sit idle, then concede: D286's idle limit, D291). Node 22 and 24 alike. | steps 10a, 10b, 10e, 10h | no (the server it talks to does) |
| `ws-auto-play.mjs` | A scripted seat over the socket: a whole game, `--refuse-first-ask`, `--probe`, `--games 3 --comfort`, `--observe-at-ask` (an observer joining while the seat holds an `ask` open must be caught up on it, D291). | steps 10c, 10d, 10f, 10g | no (the server does) |
| `ws-observe.mjs` | A follower on `/observe` (M50) that writes every frame it is sent (`--until over\|close`), and `--check`: its stream is the bridge log's s2c frames from its admission on, byte for byte, behind exactly the catch-up the transport promises (D291). | steps 10c, 10h | no (the server does) |
| `check-redaction.mjs` | The hidden-information checker over frame logs (hard rule 8; report 06). Never `--pre-amendment`, never `--opponent-library-ok`. | step 11 and every recording step; CI | no |
| `check-redaction-selftest.mjs` | The checker's negative controls: every one-defect probe in `fixtures/negative/redaction/` must be rejected. | step 12; CI | no |
| `check-seat-pair.mjs` | A table of two's two seat logs read against each other (D402, M59): no name only one seat ever held reaches any string of the other's log before that seat legitimately saw the card, no card of one seat's in full in the other's hand, one game and two seats. | step 10i | no |
| `check-seat-pair-selftest.mjs` | Its controls on a synthetic pair: a hidden name in a notice, a label or a prompt, a card in full in the other's hand, two games, the same seat twice -- each must fail; a name of the viewer's own deck, inside a longer public name, a token's, or after the card was seen -- each must pass. | step 12; CI | no |
| `ws-two-humans.mjs` | A table of two end to end (D402, D403): starts `MtgTable --humans 2 --transport ws` with tokens it mints, plays two scripted clients on the table port (`--scenario concede` -- the door, a reconnect by token, a 4002 takeover, a concede; `claim` -- an absent player pauses the game, then the claim; `timeout` -- the decision clock), then audits both seat logs. | step 10i | boots Forge |
| `requarantine.mjs` | D371: re-checks a queue night's quarantined recordings with the current checker (`check`: per failure kind, how many now pass; moves nothing), puts back only those that now pass every check (`restore`, a manifest per move, `failed.txt` kept as `failed.before-restore.txt`, the still-failing ones' new messages in `recheck.jsonl`), and reverses it (`undo --manifest`). `requarantine-selftest.mjs` is its test. | step 12; CI (the self-test) | no |
| `build-workshop-catalog.ts` | Writes `web/src/workshop/catalog.json` from `decks/`, `fixtures/games/` and `cues.json`, and — for a deck card no recording showed face up — the engine's own card script (`forge-scripts.ts`, D196); `--check` diffs it byte for byte (with no engine resources, the engine facts are the committed file's). | step 12b (`--check`); CI | no (reads `forge-home/res` when it is there) |
| `check-engine-crash.sh` | A card the engine cannot build, planted in a scratch Forge home, must fail `MtgTable` and `RecordMatch` with an error `notice` and a null `over` (D115). | step 12c | boots Forge |
| `narrate-selftest.mjs` | The narrator's gate: every fixture and every fresh log told as a story with hard rule 8 held, six negative controls, the goldens (D123). | step 12d; CI | no |
| `narrate.mjs` | A frame log as a turn-by-turn story (`--turn`, `--summary`, `--seat`, `--json`); a shell over `web/src/story/narrate.ts`. | no (its self-test is 12d) | no |
| `coach-helper.mjs` | **The coach helper** (D292): a loopback HTTP service on `coachPort` (8643) that ForgeCoach's coach calls instead of the Claude API — `GET /health`, `POST /coach`, and `POST /vision` (D362: the same question with photos, for ForgeCoach's photo-to-pool) — answered by the logged-in Claude Code CLI (`claude -p`, every tool off), streamed back as NDJSON; `--lan` binds 0.0.0.0 behind the bridge's pairing token. `scripts/play.sh` starts it when `claude` is on PATH. Its header is the contract. | no (its self-test is 12f) | no (the `claude` CLI) |
| `review-runner.mjs` | **The post-game review runner** (D353): the coach helper's `POST /review`, `GET /review[/<id>]` — a game the engine wrote (`var/games/<gameId>/frames.jsonl`, nothing else) reviewed by `coach-grade.sh review`, one at a time with a queue; the cube pool and the AI picks the player saw go to files of the review's own, there is no field for the AI's deck. A `frames.jsonl.gz` is read when there is no `frames.jsonl`; reports on disk are listed again after a restart (D385). Imported by `coach-helper.mjs` (`--no-review`, `--review-jobs N`); `docs/game-review.md` is the contract. | no (its self-test is 12f) | no (`coach-grade.sh` boots Forge) |
| `review-runner-selftest.mjs` | `/review` against a FAKE `coach-grade.sh`: validation, traversal by symlink, the seat, the queue and 429, the stages, the report, failure and timeout, the argv, the helper route (D353); ~10 s. | step 12f; CI | no |
| `auto-review.mjs` | **The automatic review** (D385): every human game the bridge finishes in `var/games/` (`human-(ws\|console)-<seed>`, `match-m<13 digits>`, a person's seat against the AI, an `over` with a winner or a reason) reviewed through the review runner's own `post` without a request — one at a time, newest first, under `nice -n 19` / `ionice -c 3 -t`, only while the lab runner's `status.json` says idle or below its core budget (a stale heartbeat is no runner), never while the review runner has work, preempted by a request. Its queue is `var/coach-grade/auto-review/queue.json` (rename-written, a `.bak`, resumed after a restart, every judged log remembered so a restart rereads nothing unchanged; a game never twice). `config.json` `coach.autoReview` (default true) or `--no-auto-review`; `/health` `autoReview`, `autoReviewQueue`. Imported by `coach-helper.mjs`. | no (its self-test is 12f) | no (`coach-grade.sh` boots Forge) |
| `auto-review-selftest.mjs` | The automatic review over scratch games and a scratch runner `status.json`, the real review runner driving a FAKE `coach-grade.sh`: which games, the lab gate (none, stale, idle, below budget, busy, torn), the low-priority prefix, newest first and one at a time, `"auto": true` in `GET /review`, a `.jsonl.gz` log (and GradeSelfTest's Java gzip check still there), dedupe across ticks, restarts, a request and a report on disk (a failed one not counting), preemption (its process group dead) and a clean stop without a spent attempt, a replayed seed's rewritten log skipped, the scan remembered across restarts and sliced, a `cores: null` lab job, the runner's status field names, an unwritable `var/`, the switch, the queue file torn / foreign / resumed (D385); ~10 s. | step 12f; CI | no |
| `eval-runner.mjs` | **The win chance** (D361): the coach helper's `POST /eval` — the learned evaluator's P(the viewing seat wins) for one state ForgeCoach shows (the state as that seat received it, plus the game's earlier events), answered by `ml/eval_serve.py` in one child process with a model on this machine (`--eval-model`, default `var/ml/models/night-1-eval.json` when it exists, in this checkout or else the lab clone `$MTGTABLE_LAB_ROOT` / `../lab/mtg-table` (D369); `--no-eval`, `--eval-python`, `--eval-schema`, `--eval-cube`). `/health` says `"eval": 1` only once the model loaded and passed its schema checks. D368: an ensemble (`--eval-model a,b,c`, a directory, a manifest; the default prefers `var/ml/models/night-1-ensemble.json`, here or in the lab clone) answers `sd` and `n`, `"explain": true` adds attributions, and `/health` says `evalEnsemble` and `evalExplain`. Imported by `coach-helper.mjs`; its header is the contract. | no (its self-test is 12f) | no (Python with numpy) |
| `eval-runner-selftest.mjs` | `/eval` against a FAKE `eval_serve.py` (validation, readiness, a refused, a dead and a mute evaluator, the route's 405/413/Origin, `--no-eval`), then — where `python3` has numpy — the real one with `fixtures/eval/model.json`: two recordings' decision rows sent as ForgeCoach sends them must return the golden feature hashes and P(win) to 1e-9; a tampered schema and `--eval-schema` refused (D361); ~5 s. | step 12f; CI | no |
| `draft-room.mjs` | **The draft room** (D400): two people grid-draft a cube from their own browsers. The Grid rules ported from ForgeCoach's `draft.ts` / `cubelab/rng.ts` (held to `fixtures/draft-room/grid-golden.json`), the rooms (`var/draft-room/rooms.json`, token digests only, restart-safe, 24 h idle expiry), and the room listener on `roomPort` (8644): `GET /room/<id>`, an SSE stream, `join`, `pick`, every route behind the seat's `X-Room-Token` (never loopback alone), plus ForgeCoach's site. Rooms are made through the coach helper's `POST /room` (`--draft-room`). `docs/draft-room.md` is the contract. | no (its self-test is 12f) | no |
| `match-launcher.mjs` | **The match launcher** (D303, M53): the coach helper's `GET`/`POST /match` — two decklists from ForgeCoach checked (names, counts, profile, the engine's card scripts, the AI policy of D333), written as `var/match/<id>/you.dck` and `ai.dck`, and `play.sh` signalled to restart the engine on them. Imported by `coach-helper.mjs`; `docs/match-launcher.md` is the contract. | no (its self-test is 12f) | no (`play.sh` restarts the engine) |
| `match-launcher-selftest.mjs` | The match launcher end to end: the real `play.sh --engine-only` against a FAKE engine (`MTGTABLE_TEST_FAKE_ENGINE`), the `.dck` files, the restart's argv, the dropped seat, bad input, Origin, a failed start restoring the previous match, never two engines, `--lan` keeping its token, the card index over a built zip (D303); ~25 s, no Forge, no claude. | step 12f; CI | no |
| `decisions.mjs` | **The decision index** (D379): D1–D378 in `DECISIONS.md` (frozen) and one file per decision from D379 on, `docs/decisions/D<nnn>-<slug>.md`. `list` prints both as one index, `next` the next free number above the highest in either, `check` exits 1 on a number used twice, a file whose name and heading disagree, a malformed heading, a missing date line or a stray file; `has D<n>`. No dependencies. | no | no |
| `decisions-selftest.mjs` | `decisions.mjs` over scratch trees in the OS temp directory: a clean tree of both sources (`list`, `next`, `has`), and every defect `check` exists for, each failing it by name; then the checkout itself (D379); well under a second. | CI | no |
| `draft-room-selftest.mjs` | The draft room (D400): the Grid rules against ForgeCoach's golden draft (`fixtures/draft-room/grid-golden.json`) and `cubelab/rng.ts`; then the real helper and room listener with two simulated players through a full 18-grid draft (wrong turns, stale views, illegal lines, missing or wrong tokens from loopback, foreign Origins, a reconnect, the seed's replay), a restart, expiry, the limits, the site's traversal cases and the CLI; ~3 s, no network. | step 12f; CI | no |
| `coach-helper-selftest.mjs` | The coach helper's contract against a FAKE `claude` put first on its PATH: `/health`, the stream-json → NDJSON translation and its one terminal line, the CLI's flags, the Origin and LAN-token rules, the private-network preflight, the 512 KB limit, one question at a time with the rest queued, superseded by key or dropped when their client leaves (D325), `/vision`'s images as one stream-json message on stdin and its limits (D362), a disconnect killing the child's process group (D292); ~7 s, no real CLI, no network. | step 12f; CI | no |
| `ml/encode.py` | **The ML dataset** (D305): frame logs (`.jsonl`, `.jsonl.gz`, seat and AI-vs-AI) → one row per decision state (the viewer has priority in a main phase or combat step), a fixed-size vector for a cube's closed card pool, labelled with the eventual winner from the viewer's side; `--features-json` writes the layout. The opponent's hand and both libraries are counts only. `ml/README.md` is the manual. | no (its tests are 12h) | no |
| `ml/dataset.py` | A directory of frame logs (or `--queue-root` with `--cube`) → int16 `.npz` shards split train/val/test by DECK PAIR (`--group-by match`, the default since D317; `--group-by game` keeps the two chairs of one game together), `features.json`, `games.jsonl`, `stats.json`; the owner's own games (`var/ml/human/`, `--human DIR`) go to a `human` split that `train_eval.py --eval-human` scores apart (D347); `--schema r17` writes the outside exam's reduced end-of-half-turn rows (D359). Needs numpy. | no (12h) | no |
| `ml/rollout_labels.py` | **Rollout labels** (D382) for `train_eval.py --soft-labels`. `plan` picks a stratified, seeded sample of a dataset's training rows: at most `--per-game` a game, no stack and no combat damage step, each mapped to its state frame and its cube's pool. `pack` turns `coach-grade.sh rollout`'s lines into the `.npz` (`game`, `rows_to_end`, `p`, `k`) and refuses a dataset rebuilt since the plan. `summary` prints cost and statuses as one JSON line. `pool` writes a cube's list; `first-row` gives a decision row's seq for the smokes. Needs numpy (plan, pack). | no (12h) | no (the rollouts themselves boot Forge) |
| `ml/policy_data.py` | **The policy dataset** (D347): the AI seats' decision records (`dir:"ai"` lines a recorded lab or bench game carries, amendment M55) → per decision the state's features, the legal options, the choice, the policy that chose and the search's per-option values; `.npz` + row-aligned `.jsonl`, split by deck pair; D340's reserved decks and seeds dropped, D341's `ver` per game, `--searched-only`, the owner's games (`var/ml/human/`, `--human`) tagged `source: human` and kept out of training. Needs numpy (`--jsonl-only`: no). | no (12h) | no |
| `ml/baseline_eval.py` | Logistic regression in numpy on a dataset against a prior and a life-difference model, accuracy, log-loss and Brier per turn bucket. | no (12h) | no |
| `ml/train_mlp.py` | A small MLP evaluator (win head + turns-to-end head); torch optional — without it, a note and exit 0. | no (12h smoke when torch is there) | no |
| `ml/train_eval.py` | **The position evaluator** (D316): P(the viewer wins) through pooled per-card embeddings, numpy (torch optional), early stopping, `--grid --time-budget`, `--search sha`, `--curve`, `--train-fraction`, `--fast` (D364), `--cv K`, split by deck pair (`--split-by pair|game|holdout:REGEX`, D317), calibration and D305's baselines, a verdict line, and the JSON export the Java side loads. | no (12h) | no |
| `ml/evalnet.py` | The evaluator's network, its numpy forward/backward and the export format (`formatVersion` 1). | no (12h) | no |
| `ml/attribution.py` | **Why the win chance** (D368): exact integrated gradients of the evaluator's logit against a fixed baseline (the training mean board, no card named), grouped into buckets a player reads ("your board", "their life", "your Glorybringer"); numpy. Used by `eval_serve.py`'s `explain`. | no (12h) | no |
| `ml/eval_search.py` | **The evaluator's search and learning curve** (D364): `train_eval.py --search sha` (successive halving over GRID's space, every rung's configurations trained the same epochs, survivors resumed, finalists to early stopping, `--configs` or planned from `--time-budget`, forked `--jobs`) and `--curve` (one configuration on nested shares of the training pairs, test log-loss with intervals over pairs). | no (12h) | no |
| `ml/split_audit.py` | Proves a (multi-night) dataset's split does not leak (D364): every deck pair, draft folder and deck name in one split; with `--reference`, an older dataset's games all present and in their old splits. PASS / FAIL. | no (12h) | no |
| `ml/eval_compare.py` | Two evaluators on the same held-out pairs (D364): log-loss, Brier, ECE and the paired difference with intervals over pairs, on all test pairs, the reference dataset's (gate 1's) and the new ones; optionally gate 1's turn-end positions; refuses a model that trained on a test pair. | no (12h) | no |
| `ml/bench_epoch.py` | Times a training epoch of the evaluator on synthetic rows of night 1's shape (D364): float64 and `--fast`, one process or several at once. | no | no |
| `ml/eval_serve.py` | **The evaluator served** (D361): one position → P(win), as JSON lines for `eval-runner.mjs`; encode.py's own `TurnTally` + `encode_state` and evalnet.py's forward pass, nothing ported. An ensemble of one schema's models (`--model a,b,c`, a directory or a manifest) answers their mean, `sd` and `n`, and `explain` adds `attribution.py`'s buckets (D368). Refuses a model whose schema id is not what encode.py computes from its vocabulary, `--expect-schema`/`--cube` mismatches and live-unsafe features. `--log FILE` prints a game's decision rows' P(win). Needs numpy. | no (12h, 12f) | no |
| `ml/human_collect.py` | **The human test set** (D369): every finished game a person played against the AI (`var/games/<gameId>/frames.jsonl` with play.sh's ids, `transport` ws/console, a human seat against an AI) copied byte for byte into `var/ml/human/`, keyed by game id + seed + start time, with `manifest.json` (date, deck and cube, the AI's deck name, profile and policy, result); `--from DIR` for logs saved elsewhere, `--status` for the one line. `scripts/play.sh` runs it at start, when the engine sleeps and at exit (`--no-human-collect`). Standard library. | no (12h) | no |
| `ml/human_eval.py` | **The evaluator on human games** (D369): a model or several (their mean P is `eval`) on `var/ml/human/`'s decision rows against prior, life and core fitted on the model's training split; log-loss, Brier, ECE, reliability, by turn bucket, intervals over games; *DESCRIPTIVE ONLY* under 30 games; prints the pre-registered first check (`FIRST_CHECK`). Models and datasets are looked up here, then in the lab clone. Needs numpy. | no (12h) | no |
| `ml/eval_golden.py` | Writes `fixtures/eval/`: a small model and Python's rows, features and P(win) for every committed recording, which `mtgtable.eval.EvalSelfTest` holds Java to. | no (its output: build) | no |
| `ml/eval-live-check.sh` | Plays games and compares the evaluator's live encoding (`GamePosition`) with `Snap.state`'s at every decision of both chairs; redeals the hidden zones, which must change nothing; times the live call with `--model`. | no | boots Forge |
| `ml/r17.py` | **The reduced schema `r17`** of the outside exam (D359): only what our recordings and 17Lands' replays both record at the end of a half-turn (turn, play/draw, life, hand sizes, each battlefield's vocabulary cards and counts); `dataset.py --schema r17` writes its rows. Standard library. | no (12h) | no |
| `ml/ext17l.py` | **17Lands' Powered Cube replays → r17 rows** (D359): `fetch` (resumed, size-checked; the published files only, never the API), `rows` (streamed, final half-turn dropped, vocabulary-share filter, user and mirror perspectives, a hashed dev/test half). Data by 17Lands, CC BY 4.0 (NOTICE §8). Needs numpy for `rows`. | no (12h) | no |
| `ml/outside_exam.py` | **The outside exam** (D359): the r17 evaluator against prior, life, board and core fitted on our data only, on 17Lands' held-out half; log-loss, Brier, accuracy, ECE by turn bucket, intervals over games, the transfer gap, and the verdict against the pre-registered `EXAM_RULE`. Needs numpy. | no (12h) | no |
| `ml/matchup_data.py` | **The matchup record** (D324): cube lab run folders (or a queue root) → one JSON line per decisive game, both played decks, the play side, the winner, the cubes and each bridge card's source cube; each game once; the overlap report; card features from the lab's cached engine facts. Standard library. | no (12h) | no |
| `ml/matchup.py` | **The matchup model** (D324, D342–D343): P(deck A beats deck B) over every cube's cards at once — M0 (pooled Bradley-Terry, one power per card, a feature prior, widths by the Laplace evidence with one game per draft, else cross-validation grouped by draft), M1 (+ per-cube deviations), M2 (+ embeddings, torch) — against coin, plain BT and the per-cube shrunk win rates, on held-out drafts and held-out cubes; `power.tsv` (the posterior SD `sdPost`; AI-limited cards unrated), the de-biased balance number, `balance.json`, `report.md`. `design` (with `ml/matchup_design.py`) proposes a candidate cube, marked unverified, and prints its pre-registered verification job. Needs numpy. | no (12h) | no |
| `ml/matchup_verify.py` | **`design`'s verification** (D344): the group-sequential test of a candidate cube against the original on the same fresh seeds (`test`, exit 3 = continue), and its operating characteristics (`sim`). Needs numpy. | no (12h) | no |
| `ml/matchup_sim.py` | A simulated world with known card powers, fitted by the model's own code: 95% coverage of `sdPost` against the old bootstrap SD, and the de-biased balance against the truth (D342). Needs numpy. | no (12h, small) | no |
| `ml/regret_rank.py` | **Gate 2 read over every option** (D395): J050's truth tables and the hand and evaluator rankers' tables (`gate_regret_grade.py`'s answers, nothing re-ranked) → per decision the pairwise ordering accuracy (all pairs and the truth's confident pairs), Spearman and Kendall against the truth, eval − hand with a paired bootstrap; the discordant-only sign test; the truth's noise (playouts per option, SE, indistinguishable pairs, reliability); by stratum and option count; the pre-registered `RANK_RULE` (a within-decision edge, or the leaf track stays stopped). Standard library. | no (12h) | no |
| `ml/cards17l.py` | **The lab's card strengths against human results** (D396): `fetch` 17Lands' Powered Cube game data (CC BY 4.0, NOTICE §8; the published files only), `stats` (per card GP / GIH / OH / GNS games and wins, two halves by draft; a cut file read to its last whole row), `compare` (the Vintage cube's cards by front-face name: Spearman of M0 power and the meta win rate against GIH WR, GP WR, OH WR and IWD with bootstrap intervals, the human split-half ceiling, the biggest disagreements, colour groups and cheap creatures as z(lab) − z(human)), `metrics`; the pre-registered `CARDS_RULE`. Standard library. | no (12h) | no |
| `ml/search_errors.py` | **Where the search AI loses** (D367): decision records (D347), gate 2's truth tables and hand rankers (D354), review reports (D353) and the ladder's results (D318) → regret by kind, turn, phase, cube and policy; the search against Forge judged by the truth; the search's own noise per decision; card hotspots; loss forensics (the largest fall in win chance and the decision there). `report.md` and CSV (Parquet with pyarrow) tables under `var/analysis/<name>/`, deterministic. Standard library (`--model`: numpy). | no (12h) | no |
| `ml/reserved.py` | The AI ladder's dev/confirm decks, keyed by card multiset; `matchup_data.py` and `dataset.py` drop every game played with one (D340). Standard library. | no (12h) | no |
| `ml/record-pairs.sh` | AI-vs-AI games of deck pairs × seeds × seats through `RecordMatch --match`, each worker in its own Forge home, resumable. | no | boots Forge |
| `ml/tests/` | The ML tests (`python3 -m unittest discover -s tools/ml/tests`): every committed recording encoded with its hidden zones scrambled and nothing changed, labels, determinism, the schema golden, the split; a cube-lab run folder read with `--run-dir` (D315). | step 12h; CI (the standard-library half) | no |
| `lab/warehouse.py` | **The lab warehouse** (D363): `ingest` reads what the queue root, the run folders, the ladder's `sprt.jsonl`, `docs/evidence/experiments.jsonl` and `var/ml/`'s reports added since the last run (complete lines only; a truncated or replaced file is reset) into zstd Parquet tables under `var/warehouse/` (`drafts`, `games`, `decks`, `deck_cards`, `picks` partitioned by source and night; `cards`, `cube_cards`, `runs`, `versions`, `nights`, `sprt`, `experiments`, `gate_reports`, `ml_reports`, `matchup_power`), `sql` writes `var/warehouse/lab.duckdb` holding only views over them, `verify` counts every table against the JSONL. Needs pyarrow and duckdb; `notebooks/*.py` are its starter notebooks. `docs/guides/lab-warehouse.md` is the manual. | no (CI runs its tests) | no |
| `lab/tests/` | The warehouse's tests (`python3 -m unittest discover -s tools/lab/tests`): exact row counts against the fixtures' JSONL, appends, truncation and replacement resets, a killed ingest, checkpoints, explore flags, the views, every notebook run on the fixture warehouse; the standard-library half runs without duckdb and pyarrow. | CI | no |
| `build-deck.ts` | Writes every AI deck's `.dck` from `decks/specs/*.json`; `--check` fails when one differs (D116); `--pool RG` lists castable cards. Needs `var/cards/cards.sqlite`. | step 12e (`--check`, D183); not CI | no |
| `check-deck.mjs` | Will the engine play this `.dck`, card for card? A static pass over Forge's scripts, then `Smoke` on the deck (`--no-engine` skips it), then `--scryfall`. | no | boots Forge (unless `--no-engine`) |
| `deck-smoke.sh` | Five games per AI deck with the AI piloting it; asserts it casts and attacks (D116, D117). | no | boots Forge |
| `audit-deck.mjs` | Per card of a `.dck`: ok / missing / broken on the configured engine, in a throwaway home under `var/audit-deck/`; fails if a preferences file changes (D182). Needs `bridge/out`. | no | boots Forge |
| `audit-deck/AuditDeck.java` | `audit-deck.mjs`'s Java half, compiled on demand into the throwaway home. Scanned by `lint-bridge.sh`. | no (linted at step 2) | boots Forge |
| `cubelab.sh` | **The cube lab** (D293–D297): `check` a cube markdown against the engine's card database, `ratings init` its editable ratings from Forge's draft ranks, `run` N two-player drafts (Grid or Winston, both drafters AI) with deckbuilding and a best of three per draft (`--games 0`: draft and build only, D318) on `--jobs` worker JVMs (each its own Forge home, a watchdog per game; resumable; `--record M` frame logs for ForgeCoach; `--record-all` / `--record-every N` every game the workers play, both chairs, gzipped under `<out>/games/` for the ML dataset, D315), and `report` a run folder as one self-contained HTML page, a Markdown summary and ForgeCoach's `meta.json` (`meta`, D297); `evolve` (D299–D300) runs generations of drafts on a cube and swaps dead or dominating cards for seed-pool cards under the cube's constraints, writing each next version of the cube document, a changelog and an HTML page; `learn` fits card values and pair synergy from run folders into a ratings TSV and a synergy TSV (D301), `selfplay` iterates self-play → learn → a learned-vs-baseline head-to-head with Wilson intervals (D302); `run --bridge a,b` drafts from a pool mixed from two or more cubes (D322) and `queue plan|run` a night of normal and bridge drafts over every cube, resumable, each seed once (D323; `--profile-mix` draws each drafter's AI per draft, off by default, D375); `--play-explore` plays a seeded share of the drafts with random legal moves and close-call coins, tagged so win rates leave them out (D358). `docs/guides/cube-lab.md` is the manual. | step 12g (two drafts, one game each) | boots Forge (`report`, `meta` and `learn` do not) |
| `cubelab/*.ts` | The lab's TypeScript: `cube.ts` (the markdown), `cards.ts`, `ratings.ts`, `weights.ts`, `pick.ts`, `draft.ts` (Grid, Winston), `deck.ts`, `lab.ts`, `engine.ts` (the facts call, the worker pool and its watchdog), `run.ts`, `report.ts`, `cli.ts`; `evolve.ts` (the evolve loop's stats, tests, discovery and confirmation, constraints and swap choice, pure), `evolve-stats.ts` (its p-values, Benjamini–Hochberg, Holm, design effect and sample sizes, D331), `colour-null.ts` (dominant-win's colour-adjusted null and its test, D377), `evolve-sim.ts` (the loop's statistics on a simulated cube; `node tools/cubelab/evolve-sim.ts` prints D331's table), `evolve-report.ts`, `evolve-run.ts` and `cubedoc.ts` (a cube document written back), `explore.ts` (`evolve --explore`: the deckbuilder's seeded exploration of low-rated cards and its weighted comparison, D356) and `explore-health.ts` (an evolve folder's exploration numbers as flat JSON, for the lab runner's checks); `raise.ts` and `raisecmd.ts` (`ratings apply --rule explore-eb`: the low-rated cards exploration found holding their own, raised by a shrunk, capped rule, D360) and `ratings-verify.ts` (the A/B that verifies a raise, as flat JSON and a per-card table, D360); `calibrate.ts` (two run folders with nothing changed but their seeds: card, colour and pair win-rate dispersion against the binomial, each batch's design effect, evolve's discovery on each and its candidates in the other, the D376 load stamps, and D377's colour-null false candidates per batch and per discovery-sized slice); the learning loop (D301–D302): `learn.ts` (the logistic model), `pairs.ts` (the synergy TSV), `selfplay.ts` (the head-to-head draft, deck quality), `learncmd.ts` (`learn`, `selfplay`); `bridge.ts` (bridge drafts: a pool mixed from cubes per seed, D322) and `queue.ts` (the overnight mix of normal and bridge drafts, D323). Tested by `web/test/cubelab.test.ts`, `web/test/cubelab-evolve.test.ts`, `web/test/cubelab-evolve-sim.test.ts`, `web/test/cubelab-learn.test.ts`, `web/test/cubelab-bridge.test.ts`, `web/test/cubelab-explore.test.ts`, `web/test/cubelab-ratings-raise.test.ts`, `web/test/cubelab-calibrate.test.ts` and `web/test/cubelab-colour-null.test.ts`. | step 13 (`cubelab.test.ts`, `cubelab-evolve.test.ts`, `cubelab-evolve-sim.test.ts`, `cubelab-learn.test.ts`, `cubelab-explore.test.ts`, `cubelab-ratings-raise.test.ts`, `cubelab-colour-null.test.ts`); CI | no |
| `cubelab/meta-regen-summary.mjs` | A folder of ForgeCoach `meta.json` files summed up (drafts, games, lands played, picked-but-never-built cards, keys outside the cube): one JSON line for a pc-jobs job's metrics, `--md` for its summary (D380). | no | no |
| `cubelab/CubeLab.java` | The lab's engine half: `facts` (each card in Forge's database, its best-ranked printing's draft score, the AI hints) and `play` (a worker: a match per stdin line, one-game Matches with the play alternating, Forge's builder for comparison). Compiled on demand into `var/cubelab/classes/`. Scanned by `lint-bridge.sh`. | step 12g; linted at step 2 | boots Forge |
| `ai-bench.sh` | Forge AI against Forge AI on fixed decks (D309): `play --pairs <file> --a <cfg> --b <cfg>` runs `--jobs` JVMs, each with a Forge home of its own under `var/ai-bench/<run>/`, one JSON line per game, each deal played from both sides by default (`--mirror`, D318; `--no-mirror` for the old seeds); `play` resumes: run it again and it skips every game a shard file of the run already holds, after cutting off a torn last line, and one `play` holds a run folder at a time (D337); under the lab runner each JVM reads the pool control file (`LAB_CONTROL`) before a game; `report` prints win rates with Wilson 95% intervals, A's score against the known 50% by deal, game times, AI-timeout counts and the outlet policy's counters (D310); `paired --control … --treatment …` matches two runs deal by deal (same `--pairs`/`--seed`/`--games`) and prints the treatment's win rate, the discordant deals with McNemar's exact p, seconds per game and the search's fallback rates (D312); `--selftest` checks the statistics, eleven outlet-policy board scenarios (three of them controls) and the search's plumbing — determinization independent of the hidden split, the copier's sideboard failure and its workaround, a copier error falling back to Forge (~20 s). A seat config is `<Profile>[+sim\|+hybrid][+outlets\|+shadow][+search[:k=v,…]]`. `play --record-all` / `--record-every N` (D347) also writes each recorded game's two seats' frame logs, gzipped, with each seat's decision records and a version stamp, into `<run>/games/` (`--record-dir`). Needs `bridge/out`. | no | boots Forge |
| `ai-bench/AiBench.java` | `ai-bench.sh`'s Java half, compiled on demand into `var/ai-bench/classes/`; `pairs-cube.txt`, `pairs-sac.txt` and `decks/` are its fixed deck pairs; `pairs-dev.txt`, `pairs-confirm.txt` and `decks/sets/` are the AI ladder's generated dev and confirm sets (D318). Scanned by `lint-bridge.sh`. | no (linted at step 2) | boots Forge |
| `ai-ladder.sh` | **The AI ladder** (D318–D321): named AI configs (`ai-ladder/players.json`, an AI kind plus its parameters; stock Forge profiles are the anchors, forge-default fixed at 1500) rated against each other from ai-bench games on mirrored deals. `run --hours H --jobs J` spends a time budget on new and uncertain players, close pairs and a share against the anchors; `sprt A B --elo0 0 --elo1 20` plays until a sequential test decides; `tune <base> --param k=v1,v2` races a config's parameters by successive halving and registers the winner under a new name; `league --hours H` is the self-play loop (promotion only on SPRT and a non-inferiority test against forge-default); `ratings`, `report` (an HTML page and `ladder.json`, schema 1); `decksets` (the dev/confirm deck sets from cube-lab drafts, no games), `check` (a pilot's data checks), `experiments` (the committed log, `docs/evidence/experiments.jsonl`). `tune` plays `ai-bench/pairs-dev.txt`, everything else `pairs-confirm.txt`. Results append to `var/ai-ladder/results/<host>.jsonl`. `docs/guides/ai-ladder.md` is the manual. | no (its unit tests are step 13) | boots Forge (`list`, `ratings`, `report` do not) |
| `ai-ladder/*.ts` | The ladder's TypeScript: `kinds.ts` (AI kinds, their parameters, the ai-bench seat config each becomes), `registry.ts`, `results.ts` (the append-only log), `rating.ts` (Bradley-Terry, Hessian and bootstrap intervals), `sprt.ts`, `schedule.ts`, `tune.ts`, `league.ts`, `decksets.ts`, `experiments.ts`, `bench.ts` (batches of AiBench JVMs on a worker pool), `session.ts`, `report.ts`, `cli.ts`. Tested by `web/test/ai-ladder.test.ts`. | step 13 (`ai-ladder.test.ts`); CI | no |
| `runner.sh` | **The lab runner** (D337): a systemd user service (`forgecoach-runner.service`, not Claude) that runs the `pc-jobs` queue on Justin's PC. It checks each job's refs out in its own clones under `~/code/lab/`, runs `## Pilot`, evaluates its `check:` lines mechanically, sizes `{workers}` from the pilot's measured peak JVM size, runs `## Commands` with `abort:` lines evaluated every minute, and pushes STATUS, outputs, `status.json`, `HEARTBEAT.md` and the decision ledger (D366) to `pc-results`, plus a numbers-only `status.json`, the sanitised `ladder.json` and `warehouse.json`, and the decision ledger's allowlisted `ledger.json` (D387) to ForgeCoach's public `lab-status`. Every step is a transient unit in `forgecoach-lab.slice` with a memory budget; under memory pressure it drops workers or pauses through the pool control file, and stops a job past the hard line. `install`, `status`, `pause`, `resume`, `stop`, `logs`, `once`, `plan` (the dry run), `approve`, `check` (a job file, linted: D397), `lint` (`runner/lint.ts`, many files), `dry-run` (`runner/dryrun.ts`: the pilot and each commands block cut short, over an overlay of the real `var/`) and `metrics` (an extractor). `docs/guides/lab-runner.md` is the manual; `runner/PC-JOBS-README.md` is the pc-jobs README text. | no (its unit tests are step 13) | no (its jobs do) |
| `runner/*.ts` | The runner's TypeScript: `expr.ts` (the `check:` language, no eval), `jobfile.ts`, `schedule.ts` (STATUS files and the queue's rules), `sizing.ts` (the budget, workers and the units), `backoff.ts` (pressure decisions), `metrics.ts` (the extractors and progress), `statusjson.ts` (status.json and the public allowlist: ids, opted-in titles, numbers), `ladder.ts` (the public ladder.json's allowlist), `ledger.ts` (the decision ledger, D366: `LEDGER.md` / `ledger.jsonl` on `pc-results` and FOLLOW-UP READY messages), `ledgerpublic.ts` (the public `ledger.json`'s allowlist, D387), `warehouse.ts` (the public `warehouse.json`'s allowlist, D363), `control.ts` (the pool control file the cube lab, ai-bench and the ladder read), `lock.ts` (the daemon's pid lock, which counts only a live runner), `sys.ts` (systemd, /proc and git behind one interface), `runner.ts` (the loop), `cli.ts`. `runner/jobs/` holds worked example job files. Tested in `web/test/lab-runner.test.ts`. | no (step 13) | no |
| `coach-grade.sh` | **The engine analysis of a decision** (D334–D336): live (`analyse`, `serve`: a few seconds, for the coach to explain) or for the coach bench's regret tables (`grade`, `batch`). A decision of a recorded game (`--log`, `--frame`, `--mode live\|review`, `--type spell\|attack\|block\|target`) rebuilt from the viewer's redacted view with Forge's `GameState` loader, the hidden cards drawn from `--opp-deck` (or a plausible deck from `--opp-pool`) minus what was seen, never the real ones; every legal option played out by Forge Default on both seats (the search AI's own rollout, `SearchPolicy.playout`) on common random numbers with racing; per option a win rate and a regret (best minus it) with intervals, plus the rebuild's fidelity warnings. `grade` (one decision), `batch --moments M.jsonl --out O.jsonl [--jobs K]` (ForgeCoach's `bench:coach -- moments` lines, resumable, a Forge home per JVM under `var/coach-grade/<run>/`), `analyse --log F --type T [--frame N] [--budget-ms 3000]` and `serve` (one booted engine, JSON requests on stdin, one answer line each — D336's interface), `selftest` (the engine smoke: rebuild, CRN, a 10-playout grade), `fit-scale` (D349: the leaf -> P(win) scale refitted on recorded games, no game played), `review --log F --seat N` (D353, `docs/game-review.md`: every graded-type decision of the seat triaged at the live settings, the ones most likely to matter graded again to the end of the game on parallel JVMs, one JSON report with each decision's table, the player's choice, the best, and a mistake / close-call verdict from the regret interval; the live modes' hidden-information guard). `rollout --moments M.jsonl --out O.jsonl [--jobs K] [--k 32]` (D382: rollout labels — each dataset position played out K times by Forge Default on both seats with nothing forced, pool knowledge only, an opponent list refused; `tools/ml/rollout_labels.py` plans the positions and packs the labels) and `rollout-selftest` (one fixture position labelled twice on one seed, the same results playout by playout, and the refusals). The live modes refuse the opponent's real deck list unless it is marked public with a reason, and default to pool mode (D348; `HiddenPool`). Java half: `bridge/src/mtgtable/grade/` (`CoachGrade`, `Grader`, `Rollout`, `Rebuild`, `HiddenPool`, `Racer`, `GradeMath`, `WireLog`). Needs `bridge/out`. | no (its arithmetic: `GradeSelfTest` in `bridge/build.sh`) | boots Forge |
| `javap-seam-diff.sh` | The bridge's Forge API diffed between two jars, class by class — for the day an official release lands (D109, D110). | no | jar |
| `undo-race-repro.sh` | The undo race, held open, guarded and not (D136); about fifteen seconds. | no (10g holds the same window) | boots Forge |
| `first-divergence.mjs` | Where do two games of one seed stop being the same game, and whose choice was it? | no | no |
| `fetch-art.ts` | Every `decks/*.dck` → `web/public/art.json` from Scryfall. | no | no (network) |
| `card-library/build.ts` | The local card index, `var/cards/cards.sqlite`, from Scryfall's bulk file (`--offline` re-indexes what is on disk). `tools/card-library/README.md` is its manual (D90–D93). | no | no (network) |
| `card-library/images.ts` | Prefetches card images into `var/cards/images/`. | no | no (network) |
| `card-library/query.ts` | The index's read side: a module the dev server imports and a JSON CLI (`name`, `search`, `resolve`, …). No network. | no | no |
| `card-library/make-fixture.ts` | Cuts the committed test slice `fixtures/cards/` out of `var/cards/`. | no | no |
| `make-negative-fixtures.mjs` | Regenerates `fixtures/negative/redaction/`, the checker's one-defect probes. | no (its output is step 12's) | no |
| `make-sample-fixture.mjs` | Regenerates `fixtures/synthetic/sample-handwritten.jsonl`. | no | no |
| `arena-bench.mjs` | The arena's frame times in headless Chromium over a production build (report 09 §9.4; `--gpu gl` for the real GPU), and the frame's draw calls and triangles against their lines (§8.2's 30,000; `--personal` adds the personal tier's, D197). Since the GPU pass (D270) also a `RENDERED` line over the frames the arena drew, `--speed`, `--json <file>` and `--cpu-profile <file>`; since its fix pass `--vsync`, Chromium's own pacing, where a real GPU's max is read (D273: unthrottled, it is the WebGL command buffer draining). | no | no (a browser) |
| `profile-top.mjs` | The top self-time functions of a `.cpuprofile` (`arena-bench.mjs --cpu-profile`), a production build's minified names mapped back through `web/dist`'s source maps to the original file, line and identifier (the GPU pass, D270). | no | no |
| `anchor-gc-probe.ts` | What the effect pool's anchor resolver allocates, counted by the garbage collector (GPU-pass follow-up 12, D275): GC events per 5M calls for every anchor kind through `SceneStage.positionOf` and the allocating `anchorPosition`, and per 2M `EffectPool.bind`s of a turn banner and a life number, each case in a fresh Node process; `--src <tree>/web/src` measures another tree (a `git archive` of the base), `--in-process`, `--json`. Since D275's fix pass also `set` and `direct` cases (twelve sets of kinds × three pairs of an `above` height and a `beside` offset, `--height`, `--dx`, `--no-sets`) and `bind`/`bindmemo` over every kind at once — the pool's path with and without the resolver's cost. | no | no |
| `anchor-gc-direct.ts` | The anchor resolver in the compiled state that boxed a fractional height (D275's fix pass): the verifier's probe as the fix was chosen by, kept verbatim because two more imports changed the state it reaches; `ONLY`, `H`, `DX` in the environment. `anchor-gc-probe.ts`'s `direct` cases spawn it. | no | no |
| `story-shot.mjs` | A picture of the `#story` page — or of `#arena`, with the caption strip's lines read off the DOM (D255) — headless, against a dev server you run. | no | no (a browser) |
| `build-figures.mjs` | Rebuilds `web/public/models/figures.glb` and `models.json` from the CC0 downloads under `var/assets/figures/`, each verified against `tools/assets-manifest.json` first (D54, D67). | no | no |
| `build-sounds.mjs` | **The sound cues' clips** (D250–D252): synthesises the eleven clips (sine partials, seeded noise, envelopes — no sample, no card art), encodes them to Ogg Opus with headless Chromium's WebCodecs `AudioEncoder`, writes the Ogg container itself, and checks every file decodes in Chromium to its source's length (`--firefox` in Firefox too); `web/public/audio/*.ogg` and `var/sounds/build.json`. Two builds are byte-identical; update `assets-manifest.json`'s `procedural.soundClips` after a change (`sound.test.ts` fails until you do). | no | no (a browser) |
| `sound-probe.mjs` | What a headless browser can say about the arena's sound against a DEV server you run: no context before a gesture, `M` builds it, then the sounds each stepped batch asked for and played, the cuts (`K`, a scrub, mute) and a reload with the choice stored — counters from `window.__mtgArena.audio`. | no | no (a browser) |
| `personal/import.mjs` | **The personal tier** (D190): copies a model the user downloaded into the gitignored `personal/models/<slug>/`, unpacks it into `source/`, drafts `SOURCE.txt`, and writes `inspect.json` — meshes, skins, the rest pose (T or A, from the bind matrices), control meshes, unskinned meshes, game-asset names. `docs/guides/personal-tier.md` is the manual. | no | no |
| `personal/prepare.mjs` | Makes it a figure our clips drive (D191, D194): strips the rig's control shapes, rebuilds the skeleton on our 22 joints (the joints and the vertices read in one pose, `--joints`), turns an A-pose to T, skins what had no skin, decimates to `--budget` (welding a part the simplifier stops on), bakes our clip set in, runs the paint step (since D240 ONE skinned primitive under ONE material — several paints packed into one atlas of at most 2048 px, a repeating paint laid out over the UV tiles it spans — so a dressed figure is one draw call; the packing in `manifest.json`'s `paint.atlas`), exposes a paint too dark to read unlit (`--exposure`, D198), meshopt last. Writes only `model.glb` and `manifest.json` in the slug's folder. | no | no |
| `personal/relief.mjs` | **The relief cache** (D225): a depth map of every card's painting for the workshop's inspect view (D226) — `--all` (every card in `web/public/art.json` and every personal model's card) or `--card "<name>"`; the card's `normal` image from the card library's cache, else fetched once through its `ScryfallClient` (≤ 10 a second, kept in `personal/relief/source/`); Depth Anything V2 Small on the art box by `personal/relief_depth.py` in the likeness venv's Python (`--likeness`, offline, every cache pinned); `personal/relief/<scryfall id>.png` (8-bit RGB: red the front layer's depth, green the back layer's, near = 255, blue the front's keep mask — D227, D228), `<scryfall id>.back.jpg` (the back layer's colour: the subjects filled by the background across each silhouette, mirrored and blurred) and `index.json` with the recipe (version 3). Idempotent (`--force`; a changed recipe makes a map stale); the model ~30 ms a card on the GTX 1080 or ~0.11–0.14 s on the CPU, the back layer (numpy and scipy) ~0.09 s either way — 158 cards in 40.6 s, 32.89 MiB. Card-art-derived: gitignored, never committed. | no (`web/test/relief.test.ts` runs the Python step on synthetic images when `MTG_TABLE_LIKENESS` names a venv; `check-all.sh` prints whether they ran) | no (the venv) |
| `personal/check.mjs` | Plays our clip set (idle, attack, hit, die, kneel) on a prepared model by the build's world-space-delta retarget, and judges the rig map against the `agent` body — weight on every core joint, sides, the feet's facing, the branches (D192), and each spine, arm and leg link's direction, proportion and flesh, and the chain ends at attack t = 0.5 (D193) — with a joint-coverage table and a limb table; renders previews through headless Chromium (`--no-preview`), whose profile stays in the slug's folder and is read and deleted, and whose net log must show no connection, byte, DNS query or cache entry beyond 127.0.0.1. Its closing line lists what was judged. Since D194 it also holds the clips baked into `model.glb` to the retarget, and writes `check.json` (the verdict and the model's sha256) — what the dev server reads before it loads a model. | no (`web/test/personal-tier.test.ts` runs the whole pipeline on a figure of boxes, `--no-preview`) | no (a browser) |

`ml/README.md` is the ML dataset's manual (D305): how frames flow from the cube
lab to a trained evaluator, the feature layout, hidden information, the split,
hardware, and what the cube lab should record. Three files here are not scripts: `assets-manifest.json` (every CC0 asset's
URL, bytes, sha256 and licence badge, read by `build-figures.mjs`; D54 — and
every asset this repository draws itself, the status glyphs and the sound clips,
under `procedural`),
`card-library/README.md` (the card library's manual) and `CLAUDE.md` (the
conventions for working here: the gate step by step, CI, the checker's flags,
the narrator and the card library). The other `card-library/*.ts` files —
`config.ts`, `db.ts`, `deck.ts`, `model.ts`, `scryfall.ts` and `store.ts` — are
modules the scripts above import: `scryfall.ts` is the one door to Scryfall and
`store.ts` the image cache's paths (`tools/CLAUDE.md`, *Card library*). So are
`personal/lib.mjs` (the slug, the manifest schema, the rig map, the inspection,
the cloak's height rule, `judgeBody`, `judgeLimbs`, the net-log reader and the
preview profile's reader) and
`personal/retarget.mjs` (the build's retarget as a function, proven against
the build's own clips), `personal/relief_depth.py` (the relief's depth step,
Python, run by `relief.mjs` alone), and `forge-scripts.ts` (Forge's `cardsfolder.zip` read
by hand — a card's script by its name — for `build-workshop-catalog.ts`, D196). The two commands a player runs, `scripts/play.sh` and
`scripts/spectate.sh`, live in `scripts/` — `play.sh --engine-only` (D285) is the
bridge alone, for a client that is not the board (ForgeCoach); 6b runs
`spectate.sh --no-serve`. Neither is in the gate or linted: the lint reads
`*.java`, and the gate has no shell-syntax step.

## Commands, by task

The root `CLAUDE.md` keeps the ten commands a newcomer types most; these are the
rest, moved here from its *Build and run* on 2026-09-28 (the docs block) as they
stood, run from the repo root like everything else. Each script's own header is
still its manual.

### The bridge, the recorders, the checkers and the deck tools

```bash
./tools/check-all.sh                        # THE pre-commit gate; runs everything below, GATE_JOBS
                                            # (min(4, nproc/4)) at a time; a log per job and a timing
                                            # table under var/check-all/<run>/ (D129, D130); the last
                                            # GATE_KEEP_RUNS (20) runs are kept
GATE_JOBS=1 ./tools/check-all.sh            # the serial gate: the old order and lines (not bytes), then the table
./tools/check-forge.sh                      # gate: asserts the jar + 8 classes, prints sha256
./tools/make-forge-home.sh                  # symlink res, profile properties, custom-card overlay
./tools/lint-bridge.sh                      # the banned-accessor grep (hard rule 10), bridge/src + tools/
./tools/lint-bridge-selftest.sh             # D180: every lint rule fires on a planted snippet (step 2b)
node tools/decisions.mjs next               # D379: the next free decision number (list, check; CI runs check)
./bridge/build.sh                           # javac via the jdk.compiler module; runs the lint
./bridge/run.sh mtgtable.Smoke              # M0
./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --seed 42 \
    --out fixtures/games/g1.jsonl           # M1
node tools/check-redaction.mjs fixtures/games/*.jsonl fixtures/synthetic/*.jsonl
node tools/check-redaction-selftest.mjs      # the checker's own negative controls
node tools/narrate.mjs fixtures/games/g1.jsonl   # D123: a frame log as a turn-by-turn story
                                            # (--turn N|A-B, --summary, --seat, --json)
node tools/narrate-selftest.mjs             # its gate, check-all's 12d (--write-golden
                                            # regenerates fixtures/narrate/)
npm --prefix web run dev                    # then /?replay=games/g1.jsonl#story — THE STORY
                                            # PAGE (D124–D128): the same narrator, in step
                                            # with the replay (☰ story in the replay bar)
./scripts/spectate.sh --story               # two AIs, followed live on #story
node tools/story-shot.mjs --url '<page>' --frame 208 --out var/story/story-g1.png
                                            # a picture of #story, headless (not in the gate)
./bridge/run.sh mtgtable.MtgTable --transport console --seed 42   # M2: PLAY A GAME
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 11      # the seat, automated
./bridge/run.sh mtgtable.MtgTable --transport null --seed 42      # every ask -> null
printf "\n\n\n\nq\n" | ./bridge/run.sh mtgtable.MtgTable --transport console \
    --seed 42                               # the scripted smoke; check-all runs it
npm --prefix web run dev:replay             # opens /?replay=games/g1.jsonl
npm --prefix web test && npm --prefix web run build   # `test` = node --test THEN vitest
node tools/fetch-art.ts                     # every decks/*.dck -> web/public/art.json (M4 needs it)
node tools/card-library/build.ts            # D90: Scryfall bulk + MSH/MSC -> var/cards/cards.sqlite
node tools/card-library/images.ts --all-decks   # D90: cache every decks/ card's image
npm --prefix web run dev                    # then /#cards — the card browser (dev server ONLY)
./tools/ten-games.sh                        # M5's exit criterion + match setup's rows 11-14; check-all's 9c
./tools/ten-games.sh --jobs 4               # D129: four rows at a time (~2 minutes instead of ~6)
./tools/ten-games.sh --games 3              # the first three rows, for a quick look
./tools/ten-games.sh --seed 13              # match setup: one row, you vs decks/doom-legion.dck, Reckless
./bridge/run.sh mtgtable.MtgTable --transport console --seed 42 \
    --ai-deck decks/doom-legion.dck --ai-profile Reckless   # match setup: the AI's deck + Forge profile
node tools/check-deck.mjs decks/doom-legion.dck --scryfall   # match setup: is every card in the engine?
./tools/check-engine-crash.sh               # D115: a card the engine cannot build fails the run
                                            # (~8 s, a scratch Forge home under var/; check-all's 12c)
node tools/wire-drift.mjs fixtures/games/g1.jsonl var/check-all-record.jsonl   # step 6 (D113)
node tools/build-deck.ts                    # D116: every AI deck's .dck, written from decks/specs/*.json
node tools/build-deck.ts --check            # D116: exit 1 if a .dck is not its spec's (--pool RG: the pool)
                                            # gate step 12e since D183; needs var/cards/cards.sqlite
./tools/deck-smoke.sh                       # D116/D117: 5 games per AI deck, the AI piloting it; NOT in the gate
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --mana-lost-prompt \
    --seed 7 --game-id human-amount-7 \
    --deck decks/amount-probe.dck --deck2 decks/morph-probe.dck   # M5: a probe run
node tools/audit-deck.mjs decks/pacho-shield.dck   # per card: ok / missing / broken on the
                                            # configured engine; read-only, a throwaway home
                                            # under var/audit-deck/; needs bridge/out. Not in
                                            # check-all. decks/fra-rw-aggro.dck: 19/31/0, exit 1
./tools/javap-seam-diff.sh <old.jar> <new.jar>     # the bridge's Forge API, diffed (read-only)
./tools/coach-grade.sh selftest            # D334: the grader's engine smoke (rebuild, CRN, 10 playouts; ~30 s)
./tools/coach-grade.sh grade --log fixtures/games/human-trample-7.jsonl --frame 941 --type attack \
    --opp-deck decks/morph-probe.dck --playouts 200          # one decision, every option to game end
./tools/coach-grade.sh batch --moments var/coach-grade/m.jsonl --out var/coach-grade/g.jsonl --jobs 6
./tools/coach-grade.sh rollout-selftest  # D382: one position labelled twice on one seed, the refusals (~30 s)
python3 tools/ml/rollout_labels.py plan --data DATA --n 50000 --out var/ml/rollout/moments.jsonl   # D382
./tools/coach-grade.sh rollout --moments var/ml/rollout/moments.jsonl --out var/ml/rollout/labels.jsonl --jobs 7 --k 8
./tools/coach-grade.sh analyse --log var/games/<id>/frames.jsonl --type attack \
    --opp-pool <cube list> --opp-known "Name; Name"          # D336, ~3 s; pool mode (D348): the cube list ("1 Name" lines) minus
                                            # your deck, pool and every public card, the AI picks you saw first.
                                            # A live mode REFUSES --opp-deck (the AI's real list) unless both lists
                                            # are shared: --opp-deck-public "<reason>" (D348)
echo '{"id":"1","log":"…","type":"spell","oppPool":"…","budgetMs":3000}' | ./tools/coach-grade.sh serve   # D336
./tools/coach-grade.sh review --log var/games/<id>/frames.jsonl --seat 0 --opp-pool <cube list> \
    [--jobs 7 --triage-s 15 --deep-s 150 --deep-k 6]   # D353: the post-game review -> var/coach-grade/review/<run>/report.json
./tools/coach-grade.sh fit-scale --logs var/cubelab/runs   # D349: refit the leaf -> P(win) scale on recorded
                                            # games (no game played); writes var/coach-grade/leaf-scale.json,
                                            # which analyse / serve / review then use -- never a non-positive
                                            # scale or one fitted on fewer than --min-games 10 games (exit 3, D353)
./tools/ai-bench.sh --selftest             # D309/D310: statistics + outlet-policy scenarios (~15 s)
./tools/ai-bench.sh play --pairs tools/ai-bench/pairs-cube.txt --a Experimental --b Default \
    --games 20 --jobs 3 --run exp-vs-default   # AI vs AI, win rate with a 95% CI; NOT in the gate
./tools/ai-bench.sh report var/ai-bench/<run>/*.jsonl [--by-pair]
./tools/ai-bench.sh paired --control var/ai-bench/<c>/shard-*.jsonl --treatment var/ai-bench/<t>/shard-*.jsonl   # D312
./tools/ai-ladder.sh list                    # D318: the AI ladder's players, and which this checkout can play
./tools/ai-ladder.sh run --hours 8 --jobs 7  # rate them overnight (docs/guides/ai-ladder.md); NOT in the gate
./tools/ai-ladder.sh sprt policy-outlet forge-default --elo0 0 --elo1 20 --jobs 7
./tools/ai-ladder.sh report                  # var/ai-ladder/report.html + ladder.json (schema 1)
./tools/runner.sh install                   # D337: the lab runner as a user service (then: sudo loginctl enable-linger $USER, once)
./tools/runner.sh status                    # what the runner runs, the queue, the machine; also pause | resume | stop | logs [-f]
./tools/runner.sh plan J005                 # the dry run: the scripts and systemd-run lines a job would get
./tools/runner.sh hold | release            # D401: admit no new lab job while this shell lives / give it back (running jobs carry on)
./scripts/play.sh --engine-only --lan --draft-room --pause-lab   # D400 + D401: draft with a friend on the Wi-Fi, the lab held
./tools/runner.sh check jobs/J005-x.md      # a job file: its steps, its checks (--metrics m.json evaluates them)
./tools/ai-ladder.sh check                   # a pilot's data checks (mirrors, draws, errors, load)
./tools/ai-ladder.sh decksets --per-cube 10                # regenerate the dev/confirm deck sets (no games; reserved seeds 900000000+, D340)
./tools/undo-race-repro.sh                  # D136: the undo race, held open, guarded and not (~15 s)
./scripts/spectate.sh                       # SPECTATE: two AIs, your deck vs match.aiDeck, followed in the arena
./scripts/spectate.sh --seed 7 --seat 1     # the same game from the other chair (M47)
./scripts/spectate.sh --no-serve --no-follow --seed 7   # record + redaction-check only, print the URL
./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --ai-deck decks/doom-legion.dck \
    --profile Default --ai-profile Reckless --seed 7 --seat 0 --pace 600 \
    --out var/spectate/x.jsonl              # what spectate.sh runs (--profile/--ai-profile imply --match)
node tools/same-game.mjs a.jsonl b.jsonl    # are two recordings of one seed the same game (either seat)?
```

### `./scripts/play.sh`'s flags

A bare `./scripts/play.sh` plays three games against `config.json`'s
`match.aiDeck` and lingers while the browser is connected (the root
`CLAUDE.md`'s *Build and run* says why).

```bash
./scripts/play.sh                                   # THREE games vs decks/doom-legion.dck, a random seed
./scripts/play.sh --seed 42                         # a reproducible shuffle
./scripts/play.sh --mirror --ai-profile Cautious    # match setup: the AI's deck and Forge profile
./scripts/play.sh --ai-search [--ai-search-ms 3000]  # D314: the AI seat with the outlet policy and the search (opt-in)
./scripts/play.sh --ai-deck decks/masters-of-evil.dck   # D116: B/R villain aggro
./scripts/play.sh --ai-deck decks/hulk-family.dck       # D116: R/G gamma stompy
./scripts/play.sh --ai-deck decks/wakanda.dck           # D116: G/W go-wide
./scripts/play.sh --port 8652 --web-port 5174       # beside a running one (it shares the first one's coach helper)
./scripts/play.sh --no-open --no-keep-open          # no browser; exit the moment the match ends
./scripts/play.sh --engine-only                     # D285: ONLY the engine, for ForgeCoach (no vite, no browser);
                                                    # prints "Engine ready on ws://127.0.0.1:8642/ws — open
                                                    # https://jalirkan.github.io/ForgeCoach/ and click Play";
                                                    # the match flags and defaults are the same; Ctrl-C stops it
./scripts/play.sh --engine-only --seed 42 --games 1 # a reproducible single game for the coach
                                                    # every mode also starts the COACH HELPER (D292) when `claude`
                                                    # is on PATH and prints "Coach: Claude Code on this PC (no API key
                                                    # needed) — http://127.0.0.1:8643"; log var/play/coach.log
./scripts/play.sh --engine-only --no-coach          # D292: no coach helper ("Coach: off (--no-coach) — …"), so no match launcher
                                                    # D303: the helper also serves POST /match (ForgeCoach's Play this
                                                    # match) and starts without `claude` too; "Match launcher: …" line
./scripts/play.sh --engine-only --no-match          # D303: the coach helper without /match
./scripts/play.sh --coach-port 8653                 # the coach helper on another port
./scripts/play.sh --engine-only --lan               # M51/D287-D289: ForgeCoach from a PHONE on the same Wi-Fi --
                                                    # binds 0.0.0.0 behind a fresh pairing token, serves ForgeCoach's
                                                    # site (var/forgecoach/, cached a day) on the ws port, prints
                                                    # http://<LAN IP>:8642/?token=<T> (+ a QR code with qrencode);
                                                    # for a home network: the token is the only lock
./scripts/play.sh --lan --refresh-site              # re-download ForgeCoach's site zip first
./scripts/play.sh --lan --site-dir ../ForgeCoach/dist   # serve a local ForgeCoach build (vite build --base ./)
./scripts/play.sh -- --games 1                      # one game (your --games wins)
./scripts/play.sh -- --game-timeout 7200            # D286: a wall clock on the game (a human seat has none; 0 = none)
./scripts/play.sh -- --idle-timeout 600             # D286: end a ws session after 600 s with no client (default 3600; 0 = off)
./scripts/play.sh -- --ai-name "Doom"               # everything after -- goes to MtgTable
```

### A table of two (D402, D403, amendment M59)

```bash
./bridge/run.sh mtgtable.MtgTable --humans 2 --transport auto --seed 7      # two automated seats, a whole game
node tools/check-seat-pair.mjs var/games/friend-auto-7-seat0/frames.jsonl var/games/friend-auto-7-seat1/frames.jsonl
node tools/ws-two-humans.mjs --scenario concede     # the bridge, two scripted clients on the table port (also claim, timeout)
./bridge/run.sh mtgtable.MtgTable --humans 2 --transport ws --deck <a.dck> --deck2 <b.dck> \
    --seats-file <seats.json> [--table-port 8646] [--lan] [--decision-timeout 180] [--seat-grace 120]
```

### The coach helper (D292)

```bash
node tools/coach-helper.mjs                         # http://127.0.0.1:8643 (config.json coachPort; --port N; --queue-max N, D325)
COACH_HELPER_TOKEN=<T> node tools/coach-helper.mjs --lan --ws-port 8642   # 0.0.0.0, the bridge's token (--token <T> too)
node tools/coach-helper-selftest.mjs                # its self-test, a fake claude (gate 12f, CI)
node tools/draft-room-selftest.mjs                  # D400: the draft room, end to end (gate 12f, CI)
node tools/coach-helper.mjs --eval-model var/ml/models/night-1-eval.json   # D361: /eval, the win chance (that path is the default when it exists)
node tools/eval-runner-selftest.mjs                 # /eval's self-test (gate 12f, CI)
node tools/coach-helper.mjs --no-auto-review        # D385: no automatic review after each game (config.json coach.autoReview: false does the same)
node tools/auto-review-selftest.mjs                 # the automatic review's self-test (gate 12f, CI)
python3 tools/ml/eval_serve.py --model var/ml/models/night-1-eval.json --log var/games/<id>/frames.jsonl   # a game's P(win), by hand
python3 tools/ml/human_collect.py                   # D369: finished games from var/games/ into var/ml/human/ (play.sh does it); --from DIR, --status
python3 tools/ml/human_eval.py                      # D369: the evaluator on the human games, beside prior/life/core; the first check
curl -s http://127.0.0.1:8643/health                # {"ok":true,"helper":1,"claude":"…","models":["opus","sonnet","haiku"]}
curl -sN http://127.0.0.1:8643/coach -H 'Content-Type: application/json' \
    --data '{"system":"You are a terse Magic coach.","user":"Land before attacking?","model":"haiku"}'
                                                    # NDJSON: {"type":"text",…} … then {"type":"done",…} or {"type":"error",…}
curl -s http://127.0.0.1:8643/match                 # D303: the running match, names and counts
curl -s http://127.0.0.1:8643/match -H 'Content-Type: application/json' --data @match.json
                                                    # restarts the engine on two decks (docs/match-launcher.md)
node tools/match-launcher-selftest.mjs              # its self-test, a fake engine under play.sh (gate 12f, CI)
```

### The cube lab (D293–D297)

```bash
tools/cubelab.sh check cubes/synergy-cube-180.md            # every card in Forge's DB? RemAIDeck and unranked cards
tools/cubelab.sh ratings init cubes/synergy-cube-180.md     # cubes/synergy-cube-180.ratings.tsv (--force to redo)
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 40 --games 3 --jobs 4 --seed 1 --record 3
tools/cubelab.sh run cubes/modern-era-cube-180.md --format winston --drafts 20 --jobs 4
tools/cubelab.sh report var/cubelab/runs/synergy-cube-180-grid-1   # report.html, report.md, summary.json, meta.json
tools/cubelab.sh meta var/cubelab/runs/synergy-cube-180-grid-1 --cube cubes/synergy-cube-180.md   # meta.json alone (ForgeCoach, D297)
tools/cubelab.sh learn var/cubelab/runs/synergy-cube-180-grid-1 --cube cubes/synergy-cube-180.md --out var/cubelab/learned/synergy.ratings.tsv   # D301
tools/cubelab.sh ratings apply cubes/omega-cube-180.md --from <evolve-dir|changelog.md> --rule explore-eb --out cubes/omega-cube-180.ratings-raised.tsv   # D360
tools/cubelab.sh selfplay cubes/synergy-cube-180.md --iterations 2 --drafts-per-iter 30 --h2h 40 --games 1 --deck-synergy on --jobs 2   # D302
tools/cubelab.sh run --bridge pauper,modern-era --drafts 40 --games 1 --jobs 4      # D322: a pool mixed from two cubes
tools/cubelab.sh queue plan --night 1 --drafts 25000 --jobs 7                       # D323: the night's mix, printed
python3 tools/ml/matchup.py train var/cubelab/queue --out var/ml/matchup --holdout-cubes all   # D324
python3 tools/lab/warehouse.py ingest && duckdb var/warehouse/lab.duckdb   # D363: the lab warehouse, incremental; then SQL
# overnight, resumable (the same --out skips the drafts already done):
tools/cubelab.sh run cubes/synergy-cube-180.md --drafts 1000 --jobs 4 --out var/cubelab/runs/overnight \
    && tools/cubelab.sh report var/cubelab/runs/overnight
# weights: --weights <file.json> or --weight synergy=0 (repeatable); --builder forge plays Forge's decks;
# --profiles Default,Reckless; --game-timeout 300; --ratings <tsv>
CUBELAB_GOLDEN_WRITE=1 node --test web/test/cubelab.test.ts  # regenerate the report golden, then read the diff
tools/cubelab.sh evolve cubes/omega-cube-180.md --pool cubes/omega-seed-pool.tsv --generations 2 --drafts-per-gen 30 \
    --jobs 2 --out var/cubelab/evolve/omega-1      # D299-D300: index.html, changelog.md, the next cube; resumable
```

A recorded game (`<out>/frames/draft-<seed>-g1.jsonl`) opens in ForgeCoach with
**Load file**.

### The arena, the workshop and their assets

```bash
npm --prefix web run dev:arena       # vite --open "/?replay=games/g1.jsonl#arena"
                                     # another fixture is a URL edit, not an argument
./scripts/play.sh --arena            # the live game, in 3D (--no-arena forces 2D)
node tools/arena-bench.mjs           # report 09 §9.4's frame times; NOT in check-all
node tools/arena-bench.mjs --index 316 --gpu gl   # Tier 2's bench frame, on the real GPU
node tools/arena-bench.mjs --index 316 --gpu gl --no-bloom --json var/b.json --cpu-profile var/b.cpuprofile
node tools/profile-top.mjs var/b.cpuprofile        # the GPU pass: its top ten, named via the source maps
node tools/anchor-gc-probe.ts                     # D275: GC events per 5M anchor resolves, per kind (--src for a base tree)
ONLY=card,above H=0.55 node tools/anchor-gc-direct.ts .   # D275's fix pass: one set of kinds, the state that boxed
node tools/arena-bench.mjs --index 316 --gpu gl --vsync   # D273: a real GPU's max, at a browser's pacing
node tools/build-figures.mjs --src var/assets/figures   # Tier 2: rebuild figures.glb
                                     # + models.json from the CC0 downloads (by hand)
node tools/build-sounds.mjs --firefox   # D252: rebuild the eleven sound clips (by hand)
node tools/sound-probe.mjs --vite 5173  # D250: count the arena's sounds per batch (a dev server)
npm --prefix web run dev             # then /#workshop — THE WORKSHOP: one card on a
                                     # pedestal with the arena's own renderer (W in
                                     # the arena; #workshop?card=<name>; View in 3D
                                     # in #cards); docs/evidence/workshop.md
node tools/build-workshop-catalog.ts # decks + fixtures/games + cues.json's names
                                     # -> workshop/catalog.json
node tools/personal/relief.mjs --all # the relief cache (D225): every card's depth map
                                     # for the workshop's inspect view -> personal/relief/
                                     # (gitignored; --card "<name>", --force, --device cpu,
                                     # --likeness <venv root>; the dev server serves it)
```
