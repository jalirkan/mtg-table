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
| `build-workshop-catalog.ts` | Writes `web/src/workshop/catalog.json` from `decks/`, `fixtures/games/` and `cues.json`, and — for a deck card no recording showed face up — the engine's own card script (`forge-scripts.ts`, D196); `--check` diffs it byte for byte (with no engine resources, the engine facts are the committed file's). | step 12b (`--check`); CI | no (reads `forge-home/res` when it is there) |
| `check-engine-crash.sh` | A card the engine cannot build, planted in a scratch Forge home, must fail `MtgTable` and `RecordMatch` with an error `notice` and a null `over` (D115). | step 12c | boots Forge |
| `narrate-selftest.mjs` | The narrator's gate: every fixture and every fresh log told as a story with hard rule 8 held, six negative controls, the goldens (D123). | step 12d; CI | no |
| `narrate.mjs` | A frame log as a turn-by-turn story (`--turn`, `--summary`, `--seat`, `--json`); a shell over `web/src/story/narrate.ts`. | no (its self-test is 12d) | no |
| `coach-helper.mjs` | **The coach helper** (D292): a loopback HTTP service on `coachPort` (8643) that ForgeCoach's coach calls instead of the Claude API — `GET /health`, `POST /coach` — answered by the logged-in Claude Code CLI (`claude -p`, every tool off), streamed back as NDJSON; `--lan` binds 0.0.0.0 behind the bridge's pairing token. `scripts/play.sh` starts it when `claude` is on PATH. Its header is the contract. | no (its self-test is 12f) | no (the `claude` CLI) |
| `match-launcher.mjs` | **The match launcher** (D303, M53): the coach helper's `GET`/`POST /match` — two decklists from ForgeCoach checked (names, counts, profile, the engine's card scripts, the AI policy of D333), written as `var/match/<id>/you.dck` and `ai.dck`, and `play.sh` signalled to restart the engine on them. Imported by `coach-helper.mjs`; `docs/match-launcher.md` is the contract. | no (its self-test is 12f) | no (`play.sh` restarts the engine) |
| `match-launcher-selftest.mjs` | The match launcher end to end: the real `play.sh --engine-only` against a FAKE engine (`MTGTABLE_TEST_FAKE_ENGINE`), the `.dck` files, the restart's argv, the dropped seat, bad input, Origin, a failed start restoring the previous match, never two engines, `--lan` keeping its token, the card index over a built zip (D303); ~25 s, no Forge, no claude. | step 12f; CI | no |
| `coach-helper-selftest.mjs` | The coach helper's contract against a FAKE `claude` put first on its PATH: `/health`, the stream-json → NDJSON translation and its one terminal line, the CLI's flags, the Origin and LAN-token rules, the private-network preflight, the 512 KB limit, one question at a time with the rest queued, superseded by key or dropped when their client leaves (D325), a disconnect killing the child's process group (D292); ~7 s, no real CLI, no network. | step 12f; CI | no |
| `ml/encode.py` | **The ML dataset** (D305): frame logs (`.jsonl`, `.jsonl.gz`, seat and AI-vs-AI) → one row per decision state (the viewer has priority in a main phase or combat step), a fixed-size vector for a cube's closed card pool, labelled with the eventual winner from the viewer's side; `--features-json` writes the layout. The opponent's hand and both libraries are counts only. `ml/README.md` is the manual. | no (its tests are 12h) | no |
| `ml/dataset.py` | A directory of frame logs → int16 `.npz` shards split train/val/test by DECK PAIR (`--group-by match`, the default since D317; `--group-by game` keeps the two chairs of one game together), `features.json`, `games.jsonl`, `stats.json`. Needs numpy. | no (12h) | no |
| `ml/baseline_eval.py` | Logistic regression in numpy on a dataset against a prior and a life-difference model, accuracy, log-loss and Brier per turn bucket. | no (12h) | no |
| `ml/train_mlp.py` | A small MLP evaluator (win head + turns-to-end head); torch optional — without it, a note and exit 0. | no (12h smoke when torch is there) | no |
| `ml/train_eval.py` | **The position evaluator** (D316): P(the viewer wins) through pooled per-card embeddings, numpy (torch optional), early stopping, `--grid --time-budget`, `--cv K`, split by deck pair (`--split-by pair|game|holdout:REGEX`, D317), calibration and D305's baselines, a verdict line, and the JSON export the Java side loads. | no (12h) | no |
| `ml/evalnet.py` | The evaluator's network, its numpy forward/backward and the export format (`formatVersion` 1). | no (12h) | no |
| `ml/eval_golden.py` | Writes `fixtures/eval/`: a small model and Python's rows, features and P(win) for every committed recording, which `mtgtable.eval.EvalSelfTest` holds Java to. | no (its output: build) | no |
| `ml/eval-live-check.sh` | Plays games and compares the evaluator's live encoding (`GamePosition`) with `Snap.state`'s at every decision of both chairs; redeals the hidden zones, which must change nothing; times the live call with `--model`. | no | boots Forge |
| `ml/matchup_data.py` | **The matchup record** (D324): cube lab run folders (or a queue root) → one JSON line per decisive game, both played decks, the play side, the winner, the cubes and each bridge card's source cube; each game once; the overlap report; card features from the lab's cached engine facts. Standard library. | no (12h) | no |
| `ml/matchup.py` | **The matchup model** (D324, D342–D343): P(deck A beats deck B) over every cube's cards at once — M0 (pooled Bradley-Terry, one power per card, a feature prior, widths by the Laplace evidence with one game per draft, else cross-validation grouped by draft), M1 (+ per-cube deviations), M2 (+ embeddings, torch) — against coin, plain BT and the per-cube shrunk win rates, on held-out drafts and held-out cubes; `power.tsv` (the posterior SD `sdPost`; AI-limited cards unrated), the de-biased balance number, `balance.json`, `report.md`. `design` (with `ml/matchup_design.py`) proposes a candidate cube, marked unverified, and prints its pre-registered verification job. Needs numpy. | no (12h) | no |
| `ml/matchup_verify.py` | **`design`'s verification** (D344): the group-sequential test of a candidate cube against the original on the same fresh seeds (`test`, exit 3 = continue), and its operating characteristics (`sim`). Needs numpy. | no (12h) | no |
| `ml/matchup_sim.py` | A simulated world with known card powers, fitted by the model's own code: 95% coverage of `sdPost` against the old bootstrap SD, and the de-biased balance against the truth (D342). Needs numpy. | no (12h, small) | no |
| `ml/reserved.py` | The AI ladder's dev/confirm decks, keyed by card multiset; `matchup_data.py` and `dataset.py` drop every game played with one (D340). Standard library. | no (12h) | no |
| `ml/record-pairs.sh` | AI-vs-AI games of deck pairs × seeds × seats through `RecordMatch --match`, each worker in its own Forge home, resumable. | no | boots Forge |
| `ml/tests/` | The ML tests (`python3 -m unittest discover -s tools/ml/tests`): every committed recording encoded with its hidden zones scrambled and nothing changed, labels, determinism, the schema golden, the split; a cube-lab run folder read with `--run-dir` (D315). | step 12h; CI (the standard-library half) | no |
| `build-deck.ts` | Writes every AI deck's `.dck` from `decks/specs/*.json`; `--check` fails when one differs (D116); `--pool RG` lists castable cards. Needs `var/cards/cards.sqlite`. | step 12e (`--check`, D183); not CI | no |
| `check-deck.mjs` | Will the engine play this `.dck`, card for card? A static pass over Forge's scripts, then `Smoke` on the deck (`--no-engine` skips it), then `--scryfall`. | no | boots Forge (unless `--no-engine`) |
| `deck-smoke.sh` | Five games per AI deck with the AI piloting it; asserts it casts and attacks (D116, D117). | no | boots Forge |
| `audit-deck.mjs` | Per card of a `.dck`: ok / missing / broken on the configured engine, in a throwaway home under `var/audit-deck/`; fails if a preferences file changes (D182). Needs `bridge/out`. | no | boots Forge |
| `audit-deck/AuditDeck.java` | `audit-deck.mjs`'s Java half, compiled on demand into the throwaway home. Scanned by `lint-bridge.sh`. | no (linted at step 2) | boots Forge |
| `cubelab.sh` | **The cube lab** (D293–D297): `check` a cube markdown against the engine's card database, `ratings init` its editable ratings from Forge's draft ranks, `run` N two-player drafts (Grid or Winston, both drafters AI) with deckbuilding and a best of three per draft (`--games 0`: draft and build only, D318) on `--jobs` worker JVMs (each its own Forge home, a watchdog per game; resumable; `--record M` frame logs for ForgeCoach; `--record-all` / `--record-every N` every game the workers play, both chairs, gzipped under `<out>/games/` for the ML dataset, D315), and `report` a run folder as one self-contained HTML page, a Markdown summary and ForgeCoach's `meta.json` (`meta`, D297); `evolve` (D299–D300) runs generations of drafts on a cube and swaps dead or dominating cards for seed-pool cards under the cube's constraints, writing each next version of the cube document, a changelog and an HTML page; `learn` fits card values and pair synergy from run folders into a ratings TSV and a synergy TSV (D301), `selfplay` iterates self-play → learn → a learned-vs-baseline head-to-head with Wilson intervals (D302); `run --bridge a,b` drafts from a pool mixed from two or more cubes (D322) and `queue plan|run` a night of normal and bridge drafts over every cube, resumable, each seed once (D323). `docs/guides/cube-lab.md` is the manual. | step 12g (two drafts, one game each) | boots Forge (`report`, `meta` and `learn` do not) |
| `cubelab/*.ts` | The lab's TypeScript: `cube.ts` (the markdown), `cards.ts`, `ratings.ts`, `weights.ts`, `pick.ts`, `draft.ts` (Grid, Winston), `deck.ts`, `lab.ts`, `engine.ts` (the facts call, the worker pool and its watchdog), `run.ts`, `report.ts`, `cli.ts`; `evolve.ts` (the evolve loop's stats, tests, discovery and confirmation, constraints and swap choice, pure), `evolve-stats.ts` (its p-values, Benjamini–Hochberg, Holm, design effect and sample sizes, D331), `evolve-sim.ts` (the loop's statistics on a simulated cube; `node tools/cubelab/evolve-sim.ts` prints D331's table), `evolve-report.ts`, `evolve-run.ts` and `cubedoc.ts` (a cube document written back); the learning loop (D301–D302): `learn.ts` (the logistic model), `pairs.ts` (the synergy TSV), `selfplay.ts` (the head-to-head draft, deck quality), `learncmd.ts` (`learn`, `selfplay`); `bridge.ts` (bridge drafts: a pool mixed from cubes per seed, D322) and `queue.ts` (the overnight mix of normal and bridge drafts, D323). Tested by `web/test/cubelab.test.ts`, `web/test/cubelab-evolve.test.ts`, `web/test/cubelab-evolve-sim.test.ts`, `web/test/cubelab-learn.test.ts` and `web/test/cubelab-bridge.test.ts`. | step 13 (`cubelab.test.ts`, `cubelab-evolve.test.ts`, `cubelab-evolve-sim.test.ts`, `cubelab-learn.test.ts`); CI | no |
| `cubelab/CubeLab.java` | The lab's engine half: `facts` (each card in Forge's database, its best-ranked printing's draft score, the AI hints) and `play` (a worker: a match per stdin line, one-game Matches with the play alternating, Forge's builder for comparison). Compiled on demand into `var/cubelab/classes/`. Scanned by `lint-bridge.sh`. | step 12g; linted at step 2 | boots Forge |
| `ai-bench.sh` | Forge AI against Forge AI on fixed decks (D309): `play --pairs <file> --a <cfg> --b <cfg>` runs `--jobs` JVMs, each with a Forge home of its own under `var/ai-bench/<run>/`, one JSON line per game, each deal played from both sides by default (`--mirror`, D318; `--no-mirror` for the old seeds); `report` prints win rates with Wilson 95% intervals, A's score against the known 50% by deal, game times, AI-timeout counts and the outlet policy's counters (D310); `paired --control … --treatment …` matches two runs deal by deal (same `--pairs`/`--seed`/`--games`) and prints the treatment's win rate, the discordant deals with McNemar's exact p, seconds per game and the search's fallback rates (D312); `--selftest` checks the statistics, eleven outlet-policy board scenarios (three of them controls) and the search's plumbing — determinization independent of the hidden split, the copier's sideboard failure and its workaround, a copier error falling back to Forge (~20 s). A seat config is `<Profile>[+sim\|+hybrid][+outlets\|+shadow][+search[:k=v,…]]`. Needs `bridge/out`. | no | boots Forge |
| `ai-bench/AiBench.java` | `ai-bench.sh`'s Java half, compiled on demand into `var/ai-bench/classes/`; `pairs-cube.txt`, `pairs-sac.txt` and `decks/` are its fixed deck pairs; `pairs-dev.txt`, `pairs-confirm.txt` and `decks/sets/` are the AI ladder's generated dev and confirm sets (D318). Scanned by `lint-bridge.sh`. | no (linted at step 2) | boots Forge |
| `ai-ladder.sh` | **The AI ladder** (D318–D321): named AI configs (`ai-ladder/players.json`, an AI kind plus its parameters; stock Forge profiles are the anchors, forge-default fixed at 1500) rated against each other from ai-bench games on mirrored deals. `run --hours H --jobs J` spends a time budget on new and uncertain players, close pairs and a share against the anchors; `sprt A B --elo0 0 --elo1 20` plays until a sequential test decides; `tune <base> --param k=v1,v2` races a config's parameters by successive halving and registers the winner under a new name; `league --hours H` is the self-play loop (promotion only on SPRT and a non-inferiority test against forge-default); `ratings`, `report` (an HTML page and `ladder.json`, schema 1); `decksets` (the dev/confirm deck sets from cube-lab drafts, no games), `check` (a pilot's data checks), `experiments` (the committed log, `docs/evidence/experiments.jsonl`). `tune` plays `ai-bench/pairs-dev.txt`, everything else `pairs-confirm.txt`. Results append to `var/ai-ladder/results/<host>.jsonl`. `docs/guides/ai-ladder.md` is the manual. | no (its unit tests are step 13) | boots Forge (`list`, `ratings`, `report` do not) |
| `ai-ladder/*.ts` | The ladder's TypeScript: `kinds.ts` (AI kinds, their parameters, the ai-bench seat config each becomes), `registry.ts`, `results.ts` (the append-only log), `rating.ts` (Bradley-Terry, Hessian and bootstrap intervals), `sprt.ts`, `schedule.ts`, `tune.ts`, `league.ts`, `decksets.ts`, `experiments.ts`, `bench.ts` (batches of AiBench JVMs on a worker pool), `session.ts`, `report.ts`, `cli.ts`. Tested by `web/test/ai-ladder.test.ts`. | step 13 (`ai-ladder.test.ts`); CI | no |
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
./tools/ai-bench.sh --selftest             # D309/D310: statistics + outlet-policy scenarios (~15 s)
./tools/ai-bench.sh play --pairs tools/ai-bench/pairs-cube.txt --a Experimental --b Default \
    --games 20 --jobs 3 --run exp-vs-default   # AI vs AI, win rate with a 95% CI; NOT in the gate
./tools/ai-bench.sh report var/ai-bench/<run>/*.jsonl [--by-pair]
./tools/ai-bench.sh paired --control var/ai-bench/<c>/shard-*.jsonl --treatment var/ai-bench/<t>/shard-*.jsonl   # D312
./tools/ai-ladder.sh list                    # D318: the AI ladder's players, and which this checkout can play
./tools/ai-ladder.sh run --hours 8 --jobs 7  # rate them overnight (docs/guides/ai-ladder.md); NOT in the gate
./tools/ai-ladder.sh sprt policy-outlet forge-default --elo0 0 --elo1 20 --jobs 7
./tools/ai-ladder.sh report                  # var/ai-ladder/report.html + ladder.json (schema 1)
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

### The coach helper (D292)

```bash
node tools/coach-helper.mjs                         # http://127.0.0.1:8643 (config.json coachPort; --port N; --queue-max N, D325)
COACH_HELPER_TOKEN=<T> node tools/coach-helper.mjs --lan --ws-port 8642   # 0.0.0.0, the bridge's token (--token <T> too)
node tools/coach-helper-selftest.mjs                # its self-test, a fake claude (gate 12f, CI)
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
tools/cubelab.sh selfplay cubes/synergy-cube-180.md --iterations 2 --drafts-per-iter 30 --h2h 40 --games 1 --deck-synergy on --jobs 2   # D302
tools/cubelab.sh run --bridge pauper,modern-era --drafts 40 --games 1 --jobs 4      # D322: a pool mixed from two cubes
tools/cubelab.sh queue plan --night 1 --drafts 25000 --jobs 7                       # D323: the night's mix, printed
python3 tools/ml/matchup.py train var/cubelab/queue --out var/ml/matchup --holdout-cubes all   # D324
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
