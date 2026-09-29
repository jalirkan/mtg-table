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
| `wire-drift-selftest.mjs` | Step 6's controls: the comparison must reject fourteen drifts and accept a reordered `stats` event (D121) and a fresh file's M49 `keywords` over a committed file that predates them (D210). | step 6; CI | no |
| `same-game.mjs` | Are two recordings of one seed the same game, from either seat? | step 6b | no |
| `fixture-multiset-diff.mjs` | Two frame logs compared as a multiset with `seq` stripped: content drift without frame-order noise. | step 9b (advisory) | no |
| `ten-games.sh` | M5's exit criterion and match setup's rows 11–14: fourteen `--transport auto` games, eight-plus assertions each. `--jobs N`, `--seed N`, `--games N`. | step 9c | boots Forge |
| `ws-smoke.mjs` | The M3 doorstep test against a running `--transport ws` server: connect, resync, concede — plus `--disconnect-mid-ask` and `--concede-before-input`. | steps 10a, 10b, 10e | no (the server it talks to does) |
| `ws-auto-play.mjs` | A scripted seat over the socket: a whole game, `--refuse-first-ask`, `--probe`, `--games 3 --comfort`. | steps 10c, 10d, 10f, 10g | no (the server does) |
| `check-redaction.mjs` | The hidden-information checker over frame logs (hard rule 8; report 06). Never `--pre-amendment`, never `--opponent-library-ok`. | step 11 and every recording step; CI | no |
| `check-redaction-selftest.mjs` | The checker's negative controls: every one-defect probe in `fixtures/negative/redaction/` must be rejected. | step 12; CI | no |
| `build-workshop-catalog.ts` | Writes `web/src/workshop/catalog.json` from `decks/`, `fixtures/games/` and `cues.json`, and — for a deck card no recording showed face up — the engine's own card script (`forge-scripts.ts`, D196); `--check` diffs it byte for byte (with no engine resources, the engine facts are the committed file's). | step 12b (`--check`); CI | no (reads `forge-home/res` when it is there) |
| `check-engine-crash.sh` | A card the engine cannot build, planted in a scratch Forge home, must fail `MtgTable` and `RecordMatch` with an error `notice` and a null `over` (D115). | step 12c | boots Forge |
| `narrate-selftest.mjs` | The narrator's gate: every fixture and every fresh log told as a story with hard rule 8 held, six negative controls, the goldens (D123). | step 12d; CI | no |
| `narrate.mjs` | A frame log as a turn-by-turn story (`--turn`, `--summary`, `--seat`, `--json`); a shell over `web/src/story/narrate.ts`. | no (its self-test is 12d) | no |
| `build-deck.ts` | Writes every AI deck's `.dck` from `decks/specs/*.json`; `--check` fails when one differs (D116); `--pool RG` lists castable cards. Needs `var/cards/cards.sqlite`. | step 12e (`--check`, D183); not CI | no |
| `check-deck.mjs` | Will the engine play this `.dck`, card for card? A static pass over Forge's scripts, then `Smoke` on the deck (`--no-engine` skips it), then `--scryfall`. | no | boots Forge (unless `--no-engine`) |
| `deck-smoke.sh` | Five games per AI deck with the AI piloting it; asserts it casts and attacks (D116, D117). | no | boots Forge |
| `audit-deck.mjs` | Per card of a `.dck`: ok / missing / broken on the configured engine, in a throwaway home under `var/audit-deck/`; fails if a preferences file changes (D182). Needs `bridge/out`. | no | boots Forge |
| `audit-deck/AuditDeck.java` | `audit-deck.mjs`'s Java half, compiled on demand into the throwaway home. Scanned by `lint-bridge.sh`. | no (linted at step 2) | boots Forge |
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
| `arena-bench.mjs` | The arena's frame times in headless Chromium over a production build (report 09 §9.4; `--gpu gl` for the real GPU), and the frame's draw calls and triangles against their lines (§8.2's 30,000; `--personal` adds the personal tier's, D197). | no | no (a browser) |
| `story-shot.mjs` | A picture of the `#story` page, headless, against a dev server you run. | no | no (a browser) |
| `build-figures.mjs` | Rebuilds `web/public/models/figures.glb` and `models.json` from the CC0 downloads under `var/assets/figures/`, each verified against `tools/assets-manifest.json` first (D54, D67). | no | no |
| `personal/import.mjs` | **The personal tier** (D190): copies a model the user downloaded into the gitignored `personal/models/<slug>/`, unpacks it into `source/`, drafts `SOURCE.txt`, and writes `inspect.json` — meshes, skins, the rest pose (T or A, from the bind matrices), control meshes, unskinned meshes, game-asset names. `docs/guides/personal-tier.md` is the manual. | no | no |
| `personal/prepare.mjs` | Makes it a figure our clips drive (D191, D194): strips the rig's control shapes, rebuilds the skeleton on our 22 joints (the joints and the vertices read in one pose, `--joints`), turns an A-pose to T, skins what had no skin, decimates to `--budget` (welding a part the simplifier stops on), bakes our clip set in, runs the paint step (one primitive per base colour, an atlas where the UVs allow), exposes a paint too dark to read unlit (`--exposure`, D198), meshopt last. Writes only `model.glb` and `manifest.json` in the slug's folder. | no | no |
| `personal/check.mjs` | Plays our clip set (idle, attack, hit, die, kneel) on a prepared model by the build's world-space-delta retarget, and judges the rig map against the `agent` body — weight on every core joint, sides, the feet's facing, the branches (D192), and each spine, arm and leg link's direction, proportion and flesh, and the chain ends at attack t = 0.5 (D193) — with a joint-coverage table and a limb table; renders previews through headless Chromium (`--no-preview`), whose profile stays in the slug's folder and is read and deleted, and whose net log must show no connection, byte, DNS query or cache entry beyond 127.0.0.1. Its closing line lists what was judged. Since D194 it also holds the clips baked into `model.glb` to the retarget, and writes `check.json` (the verdict and the model's sha256) — what the dev server reads before it loads a model. | no (`web/test/personal-tier.test.ts` runs the whole pipeline on a figure of boxes, `--no-preview`) | no (a browser) |

Three files here are not scripts: `assets-manifest.json` (every CC0 asset's
URL, bytes, sha256 and licence badge, read by `build-figures.mjs`; D54),
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
the build's own clips), and `forge-scripts.ts` (Forge's `cardsfolder.zip` read
by hand — a card's script by its name — for `build-workshop-catalog.ts`, D196). The two commands a player runs, `scripts/play.sh` and
`scripts/spectate.sh`, live in `scripts/`; 6b runs `spectate.sh --no-serve`.

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
./scripts/play.sh --ai-deck decks/masters-of-evil.dck   # D116: B/R villain aggro
./scripts/play.sh --ai-deck decks/hulk-family.dck       # D116: R/G gamma stompy
./scripts/play.sh --ai-deck decks/wakanda.dck           # D116: G/W go-wide
./scripts/play.sh --port 8643 --web-port 5174       # beside a running one
./scripts/play.sh --no-open --no-keep-open          # no browser; exit the moment the match ends
./scripts/play.sh -- --games 1                      # one game (your --games wins)
./scripts/play.sh -- --ai-name "Doom"               # everything after -- goes to MtgTable
```

### The arena, the workshop and their assets

```bash
npm --prefix web run dev:arena       # vite --open "/?replay=games/g1.jsonl#arena"
                                     # another fixture is a URL edit, not an argument
./scripts/play.sh --arena            # the live game, in 3D (--no-arena forces 2D)
node tools/arena-bench.mjs           # report 09 §9.4's frame times; NOT in check-all
node tools/arena-bench.mjs --index 316 --gpu gl   # Tier 2's bench frame, on the real GPU
node tools/build-figures.mjs --src var/assets/figures   # Tier 2: rebuild figures.glb
                                     # + models.json from the CC0 downloads (by hand)
npm --prefix web run dev             # then /#workshop — THE WORKSHOP: one card on a
                                     # pedestal with the arena's own renderer (W in
                                     # the arena; #workshop?card=<name>; View in 3D
                                     # in #cards); docs/evidence/workshop.md
node tools/build-workshop-catalog.ts # decks + fixtures/games + cues.json's names
                                     # -> workshop/catalog.json
```
