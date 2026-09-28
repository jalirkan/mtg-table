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
| `wire-drift-selftest.mjs` | Step 6's controls: the comparison must reject thirteen drifts and accept a reordered `stats` event (D121). | step 6; CI | no |
| `same-game.mjs` | Are two recordings of one seed the same game, from either seat? | step 6b | no |
| `fixture-multiset-diff.mjs` | Two frame logs compared as a multiset with `seq` stripped: content drift without frame-order noise. | step 9b (advisory) | no |
| `ten-games.sh` | M5's exit criterion and match setup's rows 11–14: fourteen `--transport auto` games, eight-plus assertions each. `--jobs N`, `--seed N`, `--games N`. | step 9c | boots Forge |
| `ws-smoke.mjs` | The M3 doorstep test against a running `--transport ws` server: connect, resync, concede — plus `--disconnect-mid-ask` and `--concede-before-input`. | steps 10a, 10b, 10e | no (the server it talks to does) |
| `ws-auto-play.mjs` | A scripted seat over the socket: a whole game, `--refuse-first-ask`, `--probe`, `--games 3 --comfort`. | steps 10c, 10d, 10f, 10g | no (the server does) |
| `check-redaction.mjs` | The hidden-information checker over frame logs (hard rule 8; report 06). Never `--pre-amendment`, never `--opponent-library-ok`. | step 11 and every recording step; CI | no |
| `check-redaction-selftest.mjs` | The checker's negative controls: every one-defect probe in `fixtures/negative/redaction/` must be rejected. | step 12; CI | no |
| `build-workshop-catalog.ts` | Writes `web/src/workshop/catalog.json` from `decks/`, `fixtures/games/` and `cues.json`; `--check` diffs it byte for byte. | step 12b (`--check`); CI | no |
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
| `arena-bench.mjs` | The arena's frame times in headless Chromium over a production build (report 09 §9.4; `--gpu gl` for the real GPU). | no | no (a browser) |
| `story-shot.mjs` | A picture of the `#story` page, headless, against a dev server you run. | no | no (a browser) |
| `build-figures.mjs` | Rebuilds `web/public/models/figures.glb` and `models.json` from the CC0 downloads under `var/assets/figures/`, each verified against `tools/assets-manifest.json` first (D54, D67). | no | no |

Two files here are data, not scripts: `assets-manifest.json` (every CC0 asset's
URL, bytes, sha256 and licence badge, read by `build-figures.mjs`; D54) and
`card-library/README.md`. The other `card-library/*.ts` files are modules the
scripts above import. The two commands a player runs, `scripts/play.sh` and
`scripts/spectate.sh`, live in `scripts/`; 6b runs `spectate.sh --no-serve`.
