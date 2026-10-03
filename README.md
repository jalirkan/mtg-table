# mtg-table

A local, single-player browser client for *Magic: The Gathering*. It runs the
open-source [Forge](https://github.com/Card-Forge/forge) engine headless in a JVM
on your own machine as the rules engine and the AI opponent, and puts a
TypeScript/React board in a browser tab in front of it. The two halves talk JSON
over a WebSocket bound to `127.0.0.1`. Nothing leaves the machine except card-art
lookups to Scryfall (and, if you build the optional card library, its downloads
of Scryfall's card data and images). The visual model is [endstep.cc](https://endstep.cc) — a
clean web board where you click cards instead of reading a Java Swing table — but
none of its code; the engine underneath is Forge, unmodified, used exactly the way
Forge's own network client uses it.

The design principle is that the browser contains **no rules logic at all**. Forge
already knows which cards are targetable, which buttons are enabled, whether mana
can be paid and what the AI is doing; the bridge serialises that into a redacted
snapshot and the client renders it. A button is enabled if and only if the engine
said so, and it wears the engine's own label. A card click is **judged by the
engine, not by the board**: `state.input.selectable` is the explicit selection
set and the board outlines it, but every click is sent and Forge decides
(amendment M8 — for most of your own main phase that set is empty, and gating on
it means you cannot play a land). The client never predicts legality, never
guesses, and never decides anything. That keeps the whole class of "the board threw the engine's
answer away" bugs out of the project, and it is why the wire protocol
([`docs/protocol.md`](docs/protocol.md)) is the real specification of this
repository — the Java emitter and the TypeScript reducer are both written against
it.

## How this is built

The code in this repository — the Java bridge, the TypeScript client, the tools
and the tests — was written with Claude, Anthropic's AI model, working in Claude
Code under the owner's direction and review. The owner decides what is built and
settles every open question (PLAN.md's *Only the user can decide*); each piece of
work is a lane on a branch of its own, read by an independent reviewing session
before it merges, and nothing reaches `main` without the full gate green
(**D201**). Pushes, releases and anything public are the owner's. The conventions
those sessions work to are `CLAUDE.md` and its per-directory companions
(`bridge/`, `web/`, `web/src/arena/`, `tools/`), which double as a map of the code
for a human reader.

## What you may not add

Contributions are welcome inside these lines. Each is a decision with its reasons
in `DECISIONS.md`, and a change that crosses one will not be merged.

- **Only CC0 assets, each with a written provenance** (**D54**): a model, clip or
  texture enters through `tools/assets-manifest.json` — its URL, bytes, sha256,
  date and the licence badge as it read that day — and nothing comes from Mixamo
  or is generated from card art.
- **The personal tier is never committed** (**D201**, **D190**; PLAN.md's *Tier 3
  — a note, not a plan*): a likeness model of a Marvel character (Tier 3), or
  anything else that is personal-only, stays local and gitignored, under
  `/personal/`, its provenance in its own folder (`docs/guides/personal-tier.md`).
  *(Corrected 2026-09-28, when the personal tier merged: this said such a file is
  recorded in the manifest as `committable: false`, which D190 rejected — the
  manifest is the committed CC0 library's.)*
- **No proxy of Scryfall** (**D90**, **D92**): the card library's image route
  exists only in the Vite dev server and never fetches; anything at scale is
  Scryfall's bulk file, through `tools/card-library/scryfall.ts`, the one door.
- **No card images in the repository**: card art is looked up and cached locally
  (`web/public/art.json` and `var/cards/` are gitignored), and the committed
  `fixtures/cards/` slice is data without images (**D90**).
- **No rules logic in the client**: no mana-payability prediction, no targeting
  validation, no phase-stop logic — Forge decides and the browser renders
  (*NON-GOALS*, below).
- **No engine snapshots** (**D109**–**D111**): only a tagged official Forge
  release may become the engine, pinned by its sha256 — never the daily build,
  and never a hand-written or overlaid card script to bring a set in early.
- **No code from `witchesofthehill/manabrew`** (**D11**): it is
  AGPL-3.0-or-later, and lifting any of it would relicense this project.

## NON-GOALS

These are not "later". They are decisions, and they are what keeps this project
finishable. Anything on this list is a closed question, not a backlog item.

- **No multiplayer.** One human seat, one AI seat, one JVM, one browser tab. No
  lobby, no matchmaking, no spectators, no second human. *Lifted in part on
  2026-10-01 by **D280**, on the owner's approval:* `ws://127.0.0.1:8642/observe`
  is a read-only copy of the seat's own frames for any number of local followers
  (ForgeCoach), which can never act, answer or hold the seat (amendment M50).
  Still a no: a second seat, a second human, a lobby, and any view the seat
  itself is not shown.
- **No deck builder.** Decks are `.dck` files you already have. Editing them is
  Forge's job, or a text editor's.
- **No card-library package.** Nothing published, nothing the engine, the bridge
  or the board depends on: the board's card art is still a generated `art.json`
  for the decks in play. *Lifted in part on 2026-09-27 by **D90**, on the user's
  request:* a local card index (`tools/card-library/` — SQLite + FTS5 over
  Scryfall's bulk file, and an image cache, all under `var/cards/`) and a card
  browser at `#cards` now exist as **tools**. What is still a no: a package, a
  route outside the Vite dev server, any proxy of Scryfall, and any deck editing.
- **No accounts, no auth, no sessions, no users.** The socket binds loopback and
  trusts whatever connects — except a web page from an origin it was not told
  about (**D281**): a browser's upgrade to `/ws` or `/observe` must carry an
  `Origin` on `config.json`'s `wsAllowedOrigins` (loopback on any port and
  `https://jalirkan.github.io` by default), or it is refused 403, so a page you
  happen to have open cannot take the seat. That is the security model.
  *Lifted in part on 2026-10-01 by **D287**, on the owner's approval:* LAN play
  (`./scripts/play.sh --lan`, amendment M51) puts a per-run pairing token in front
  of every request from another machine. It is a shared secret in a URL, not an
  account, and still a no: users, logins, sessions that outlive a run.
- **No packaging, no installer, no Docker, no release artifact.** You run it from
  the checkout with the commands below. Forge stays where you installed it.
- **No delta protocol.** Every `state` frame is a full coalesced snapshot. Deltas
  are a documented future server-side change, not a v1 feature.
- **Localhost only.** No deployment, no remote access, no tunnel, no TLS.
  *Lifted in part on 2026-10-01 by **D287**–**D289**, on the owner's approval:*
  `./scripts/play.sh --lan` binds every interface so a phone on the same home
  network can play, behind a pairing token, serving ForgeCoach's static site on
  the socket's port — and, since **D292**, the coach helper on its own port
  behind the same token. Still a no: anything beyond the local network, a tunnel, TLS,
  and a LAN bind that is not asked for by that flag.
- **No rules logic in the client.** No mana-payability prediction, no targeting
  validation, no phase-stop logic, no legality checks. If the browser has to
  compute a rules answer, the design is wrong.
- **No modification of Forge, and no fork of it.** Forge is a dependency on disk.
  We never write inside `~/forge` or `~/.forge`.

## Prerequisites

| What | Version | Where |
|---|---|---|
| Forge | **2.0.14**, and only that build: jar sha256 `3c0a7c38…8e5dd9` (below). A newer Forge only as an official release, on the day's checklist (D109, D110) | `~/forge`, with the fat jar `forge-gui-desktop-2.0.14-jar-with-dependencies.jar` and the `res/` tree beside it |
| Java | 21 **JRE** is enough | no JDK needed — the JRE ships `jdk.compiler`, so `java -m jdk.compiler/com.sun.tools.javac.Main` compiles and `java -m jdk.jdeps/com.sun.tools.javap.Main` inspects |
| Node | 24 | Node 24 runs `.ts` files directly via type stripping, so `tools/fetch-art.ts` and `tools/card-library/` need no build step; `tools/card-library/` also uses Node's built-in `node:sqlite` (FTS5), so it needs no npm package either |

No Maven, no Gradle, no source build of Forge, no downloads beyond npm for `web/`.
There is no Maven coordinate for Forge anywhere — do not go looking for one.

The Forge jar is never copied into this repo. Its path lives in `config.json`
(`forgeJar`) and can be overridden with the `FORGE_JAR` environment variable;
every script reads it from there.

Forge's profile is redirected into `var/` by `forge-home/forge.profile.properties`
so that running mtg-table cannot touch the decks and preferences in `~/.forge`.
`forge-home/res` is a symlink to `~/forge/res`.

### Getting the engine

mtg-table does not build or ship Forge, and on your machine it downloads none
(CI fetches the same pinned build for itself — *The engine in CI* below, **D202**).
It runs on **your own install of Forge 2.0.14** — Forge's `.tar.bz2` distribution, extracted as-is (here into
`~/forge`) — and it is built, gated and recorded against exactly one build of it:

| | |
|---|---|
| file | `forge-gui-desktop-2.0.14-jar-with-dependencies.jar`, with Forge's `res/` directory beside it |
| bytes | 39,383,858 |
| sha256 | `3c0a7c385b9207e593fe149255e00d1cd7e556809f138568d07e3828b78e5dd9` |
| manifest | `Implementation-Version: 2.0.14-SNAPSHOT-08.08` (`build.txt`: 2026-08-08 22:49:26) |

1. Point `config.json`'s `forgeJar` at that jar (or export `FORGE_JAR`). `res/`
   must sit beside it: `tools/make-forge-home.sh` derives `forge-home/res` from the
   jar's directory.
2. `./tools/check-forge.sh` — asserts the classes and members the bridge links and
   prints the jar's sha256. **It must print the one above.** Every frame log's
   session header records it as `forgeJarSha256`, and all 19 committed recordings
   under `fixtures/games/` name this build; a different hash is a different engine,
   whatever its file is called.
3. `./tools/make-forge-home.sh` (once, and again after changing `forgeJar`), then
   `./bridge/build.sh` — or `./scripts/play.sh`, which runs `check-forge.sh` and
   `bridge/build.sh` itself before it starts a game.

**Which Forge, and when it changes** (DECISIONS.md **D109**, **D110**). The engine
moves only to an **official, tagged Forge release** — never to Forge's rolling
`daily-snapshots` build, even when a daily already has the cards you want — and
one engine at a time. A new release is unpacked beside the old one, under the
repo's gitignored `var/forge-engine/<version>/`, and **never over `~/forge`**,
which stays untouched as the rollback. The version string is not how you tell a
release from a daily (2.0.14's own reads `-SNAPSHOT-08.08`); where the archive
came from is, and `node tools/audit-deck.mjs <deck>` tells you whether that engine
actually has your cards. Nothing here writes card scripts to bring a set in early
(**D111**).

**Reality Fracture is the case in point.** Forge 2.0.14 predates the set, so the
user's pool (`decks/fra-rw-aggro.dck`, under *Decks* below) audits 19 of 50
copies present and 31 missing — it does not play today, by decision. Forge's daily
build of 2026-09-27 has every card, and it was measured
([`docs/evidence/engine-upgrade.md`](docs/evidence/engine-upgrade.md)); nothing
was switched. The day an official release ships the set, the switch is the
checklist in [`docs/research/14-engine-upgrade.md`](docs/research/14-engine-upgrade.md)
§0: fix the bridge's next-game race first, pin the release by sha256, audit the
decks against it, diff its seam against the saved one
(`./tools/javap-seam-diff.sh`), apply the saved bridge port
(`docs/research/patches/`) only if the seam moved the way the daily's did, run
the gate, then play. Re-recording a committed fixture is a separate decision.

## Running it

All commands are run from the repository root.

```bash
./tools/check-forge.sh        # assert the jar and every class we depend on; print its sha256
./tools/make-forge-home.sh    # idempotent: symlink res, write the profile properties,
                              # install the corrected A.I.M. Scientists card script (D14)
```

**Before you commit, run the one command that runs everything:**

```bash
./tools/check-all.sh                 # GATE_JOBS=min(4, nproc/4) steps at once: ~4 minutes
GATE_JOBS=1 ./tools/check-all.sh     # the serial gate, one step after another: ~15 minutes
GATE_JOBS=8 WSPORT=8750 ./tools/check-all.sh   # more at once; step 10 on 8750..8757
```

**It runs its steps concurrently** (D129–D135). Every step is a job with its
own log under `var/check-all/<run>/`, and `GATE_JOBS` of them run at once —
four on a 16-thread machine — each JVM a process of its own with its own game
ids, `var/` paths, **Forge home** and, for step 10's eight servers, its own port
(`WSPORT`..`WSPORT+7`). The Forge home is what makes the `var/` paths honest:
every job boots Forge in `var/check-all/<run>/<job>/` (and every ten-games row in
`var/ten-games/home-<seed>/`) — its own `userDir`, `cacheDir` and `config.json`,
built by `tools/config.sh`'s `forge_home_make` — where every JVM used to share
`var/forge/` and write the same achievements files. The order that matters is
kept as dependencies: lint, its self-test and build first; step 6 after the recording it
compares; the fourteen ten-games rows (`tools/ten-games.sh --run-row N`) before
their report; the `node --test` half of
`npm test` after the step-10 logs it replays; the redaction sweep and the
narrator after every recorder. The console prints a line as each job starts and
ends, then a **timing table** (every job's start, end, seconds, status and the
load average), and `var/check-all/<run>/gate.log` is the whole log in the serial
order. Only the last 20 runs are kept there (`GATE_KEEP_RUNS`; a run is ~4 MB with
its jobs' Forge homes), the oldest pruned as the gate starts. A failure stops everything this gate started, prints the failed job's log
tail and the table, and exits 1; nothing is ever retried. `GATE_JOBS=1` is the
serial gate: the steps in the old order, each job's log streamed as it runs —
the old log's lines, except that `die`'s stderr now arrives on stdout and 10g
adds a "was played" line per game — and the timing table after `check-all OK`.

Thirteen numbered steps and twelve lettered sub-steps (**2b**, **6b**, 9b, 9c,
**9d**, **9e**, 10f, **10g**, **12b**, **12c**, **12d** and **12e** — 9d and 10g added
by M6, 9e by match setup, 12b and 12c by the 2026-09-27 hardening pass, 6b by
spectating, 12d by the narrator, 2b and 12e by the guards lane), stopping at
the first failure: `check-forge.sh` → `lint-bridge.sh` (the banned-accessor
grep over `bridge/src` and `tools/**/*.java`, D182, the three game-thread hops
among it, D181) → **2b**, `lint-bridge-selftest.sh` (every rule of the lint
fires on a planted snippet, and a rule with no case fails, D180) →
`bridge/build.sh` (javac plus seven self-tests) → `Smoke` → a `RecordMatch`
re-record into `var/` → **a value-level drift check** of that recording against
`fixtures/games/g1.jsonl` (`tools/wire-drift.mjs`: the same non-state frames,
event stream, phase walk and final board, every board cut at a turn, phase or
outcome event, and the stack wherever both caught the same items — where a flush
cuts the event stream is wall-clock, so byte for byte is `STRICT_G1=1`, **D113**;
the ids inside a `stats` event compared as a set, **D121**) → **6b**, spectating:
seed 5 recorded by `./scripts/spectate.sh --no-serve` paced from seat 0 and at
engine speed from seat 1, which `tools/same-game.mjs` must call the same game
(amendment **M47**) → **three fresh human-seat games** (`--transport
null`, the scripted `--transport console` smoke, and `--transport auto --seed
11`, each asserted to end in exactly one `over` as its last frame, plus the
advisory **9b** that re-records seed 42 and compares it against
`fixtures/games/human-auto-42.jsonl` as an order-insensitive multiset, and
**9c**, M5's exit criterion — `tools/ten-games.sh`, ten consecutive games across
six decks plus match setup's four rows (your deck against `decks/doom-legion.dck`
under each AI profile), the single most expensive thing in the file, which
`SKIP_TEN=1` turns off, **9d**, M6's `sideboard` ask, which needs a session that
survives game 1, and **9e**, one Reckless game against the villain deck with the
profile read back from the in-game AI, every Forge preferences file
fingerprinted, and a bogus profile refused before the engine boots) → **seven
fresh `--transport ws` servers** (the two `ws-smoke` variants, a whole game
through `tools/ws-auto-play.mjs`, that client again with `--refuse-first-ask`,
which drops the socket on the first `ask` frame so `ReplyPool.cancelAll()` runs
with a game thread genuinely parked, `ws-smoke --concede-before-input`, which
concedes from the handshake handler before the engine has asked this seat
anything — amendment M11's exception path — **10f**, `ws-auto-play --probe`,
the only thing anywhere that sends the `clickAbility` **act** from a client
rather than answering an ability menu by index, and **10g**, M6's own command:
three games back to back over one socket, with the five comfort acts each
asserted by the **effect** it had on the next `state`, and each game's end held
open 2 s so an instant `newGame` is always queued behind Forge finishing the
game, **D114**) →
`check-redaction.mjs` over the committed fixtures (games *and* synthetic) *and*
every fresh recording → `check-redaction-selftest.mjs`, which asserts the
checker still rejects every one-defect probe in `fixtures/negative/redaction/`
and passes its clean controls →
**12b**, the workshop's generated `catalog.json` against what the decks, the
corpus and `cues.json` make → **12c**, `tools/check-engine-crash.sh`, which
builds an engine crash on purpose (a card script the 2.0.14 jar cannot build, in
a scratch Forge home under `var/crash-probe/`) and asserts that `MtgTable` and
`RecordMatch` both fail with the cause and end their frame logs in an error
`notice` and a null `over` that never names the card (**D115**, about
8 s) → **12d**, `tools/narrate-selftest.mjs`, the frame-log narrator over every
fixture and every log the run recorded, with hard rule 8 held by ids and by the
decks' card names (**D123**, about a second) → **12e**, `node tools/build-deck.ts
--check`, every AI deck against its spec through the local card index (**D183**;
it needs `var/cards/cards.sqlite` and fails without it, `SKIP_DECKS=1` skips it)
→ `npm run build && npm test` in
`web/` — `npm run build`, `vitest run` and `node --test` as three jobs in
parallel mode, the last waiting for step 10. **At `GATE_JOBS=4`, about four
minutes** from a deleted `bridge/out` (239.0 s and 240.5 s on `102fb1f`), about
two and a half at `GATE_JOBS=8` (151.2 s on `6b35054`) and about fifteen serially
(907.4 s on `f6bad35`), of which 9c's fourteen games are about six;
`SKIP_TEN=1` saves 9c. Every earlier timing is
[`docs/evidence/gate-history.md`](docs/evidence/gate-history.md). Every JVM step runs
under a `timeout` (`GAME_TIMEOUT`, default 300 s) so a wedged game thread fails
the gate instead of hanging it. If it is green, the Java emitter, the TypeScript
reducer and the committed fixtures still agree.

Then, per milestone (see [`PLAN.md`](PLAN.md)):

```bash
# M0 — the engine runs our code
./bridge/build.sh
./bridge/run.sh mtgtable.Smoke

# M1 — record an AI-vs-AI game, then scrub through it in the browser with no JVM
./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --seed 42 \
    --out fixtures/games/g1.jsonl
# --deck2 gives the seats DIFFERENT decks, which is the only way a name-based
# redaction test can tell a leak from a coincidence (docs/protocol.md 8.3).
./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck \
    --deck2 decks/morph-probe.dck --seed 99 --out fixtures/games/disjoint.jsonl
# and the one deck that runs a continuous MayLookAt static, so that `library.cards`
# (docs/protocol.md 3.4) is proved by content and not only by an empty array.
./bridge/run.sh mtgtable.RecordMatch --deck decks/future-sight-probe.dck \
    --deck2 decks/morph-probe.dck --seed 42 --out fixtures/games/future-sight.jsonl
# and the villains' own game (D220): the Doom Legion's seat, against Pacho's deck,
# at the seed a census of 440 chose for the most of the deck face up and on the table
./bridge/run.sh mtgtable.RecordMatch --deck decks/doom-legion.dck \
    --deck2 decks/pacho-shield.dck --seed 248 --out fixtures/games/villain-doom-248.jsonl
npm --prefix web run dev:replay                  # opens /?replay=games/g1.jsonl
# any other fixture is a query param: ?replay=games/morph.jsonl,
# ?replay=synthetic/sample-handwritten.jsonl, ?replay=negative/render-crash.jsonl
node tools/check-redaction.mjs fixtures/games/*.jsonl fixtures/synthetic/*.jsonl
npm --prefix web test && npm --prefix web run build
# D123 — read any frame log back as a turn-by-turn story ("Reading a game back" below)
node tools/narrate.mjs fixtures/games/g1.jsonl              # --turn 3, --summary, --seat, --json
# D124–D128 — the same story in the browser, in step with the replay (npm --prefix web run dev)
#   http://127.0.0.1:5173/?replay=games/g1.jsonl#story     (☰ story in any replay's bar)

# M2 — a full game against the AI, in the terminal (--transport null|auto|console)
./bridge/run.sh mtgtable.MtgTable --transport console --seed 42
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 11   # the seat, automated
./bridge/run.sh mtgtable.MtgTable --transport null --seed 42   # every ask -> null

# M3/M6 — the same game in a browser tab; this is the one command you type
./scripts/play.sh             # check-forge -> build -> the JVM -> /health -> vite --open
#   M6: a bare run is THREE games back to back (--games 3) and lingers after the
#   last `over` (--keep-open) for as long as the browser stays connected, which
#   is the window the board's New Game row needs.  Pass your own --games to
#   override, --no-keep-open to turn the linger off.
./scripts/play.sh --seed 42 --no-open --port 8652
./scripts/play.sh -- --games 1          # one game (your --games wins)
#   --port/--web-port override config.json's wsPort/webPort; --no-open skips the
#   browser; everything after `--` goes to mtgtable.MtgTable untouched.
#   Ctrl-C stops both halves.
./scripts/play.sh --engine-only         # ONLY the engine, for ForgeCoach (D285): no vite, no browser
#   prints "Engine ready on ws://127.0.0.1:8642/ws — open https://jalirkan.github.io/ForgeCoach/
#   and click Play"; same match flags and defaults; Ctrl-C stops it
./scripts/play.sh --engine-only --lan   # ...and play from a PHONE on the same Wi-Fi (M51, D287-D289)
#   binds 0.0.0.0 behind a fresh pairing token, serves ForgeCoach's site on the ws
#   port (downloaded into var/forgecoach/, cached a day; --refresh-site, or
#   --site-dir <a ForgeCoach build>), prints http://<LAN IP>:8642/?token=<T> for
#   every address (and a QR code if qrencode is installed).  For a HOME network:
#   the token is the only lock.
#   Every mode also starts the COACH HELPER (D292) when `claude` is on PATH:
#   "Coach: Claude Code on this PC (no API key needed) — http://127.0.0.1:8643"
#   ("Coaching without an API key" below); --no-coach skips it.

# Match setup — WHAT you play against (amendment M44; "Choosing decks and the AI"
#   below has the whole story).  A bare ./scripts/play.sh is your deck against
#   decks/doom-legion.dck under the Default profile.
./scripts/play.sh --ai-profile Reckless              # one of Forge's four AI profiles
./scripts/play.sh --mirror --ai-profile Cautious     # the AI plays a copy of your deck
./scripts/play.sh --ai-deck decks/masters-of-evil.dck   # B/R villain aggro (D116)
./scripts/play.sh --ai-deck decks/hulk-family.dck       # R/G gamma stompy (D116)
./scripts/play.sh --ai-deck decks/wakanda.dck           # G/W go-wide (D116)
./bridge/run.sh mtgtable.MtgTable --transport console --seed 42 \
    --ai-deck decks/doom-legion.dck --ai-profile Reckless   # the same flags, on the bridge
node tools/check-deck.mjs decks/doom-legion.dck --scryfall  # is every card really in the engine?
node tools/build-deck.ts --check                     # every AI deck is written from decks/specs/
./tools/deck-smoke.sh                                # 5 games per AI deck, the AI piloting it; NOT in the gate
#   A profile is not a difficulty (D107).  Only play.sh reads config.json's
#   "match" block; the bridge and the gate never do (D106).

# M3 — the socket by itself, without a browser
./bridge/run.sh mtgtable.MtgTable --transport ws --port 8642 --seed 42 --keep-open
#   ws://127.0.0.1:8642/ws   the frames        (one client at a time; a second is
#                                               refused with close code 4001)
#   ws://127.0.0.1:8642/observe   a read-only copy of the seat's frames, any number
#                                 (M50: catch-up on connect, then every frame; what
#                                 an observer sends is ignored — ForgeCoach's live mode)
#   http://127.0.0.1:8642/health   200 "ok" once the game is ready, 503 "starting"
#                                  before it — what scripts/play.sh polls
#   A browser page may open either socket only from an Origin on config.json's
#   wsAllowedOrigins (loopback on any port, https://jalirkan.github.io); others
#   get 403.  Node tools send no Origin and are always let in (D281).
node tools/ws-smoke.mjs --port 8642                      # connect -> resync -> concede
node tools/ws-smoke.mjs --port 8642 --disconnect-mid-ask # drop, reconnect, finish
node tools/ws-auto-play.mjs --port 8642 --log var/ws-auto.jsonl   # a whole game
node tools/ws-auto-play.mjs --port 8642 --refuse-first-ask  # drop the socket ON an `ask`
node tools/ws-smoke.mjs --port 8642 --concede-before-input  # concede before the first input
node tools/check-redaction.mjs var/ws-auto.jsonl         # a CLIENT log (M17)
# the board in ws mode, if you started the bridge yourself:
#   http://127.0.0.1:5173/?ws=1        (&port=<n> for a bridge that is not on 8642)

# M4 — card art for the deck in play (run once; cached in web/public/art.json,
#      which is gitignored.  Without it the board draws generated text frames.)
node tools/fetch-art.ts

# D90 — the local card library and the card browser (#cards).  The build fetches
#      Scryfall's ~24 MB bulk file and the MSH/MSC prints into var/cards/ (under
#      ten seconds); the second line caches the images of every card in decks/.
#      Then open the DEV server's #cards (the route does not exist in a build).
#      "Card library and browser" below has the rest (D90-D94).
node tools/card-library/build.ts
node tools/card-library/images.ts --all-decks
npm --prefix web run dev            # then http://127.0.0.1:5173/#cards

# M5 — the exit criterion, as a command: ten consecutive games across six decks,
#      each asserted for `over`, zero UNIMPL, one-kind ask ceiling, the typed
#      acts a row exists to prove, and check-redaction.mjs.  ~270 s.  Match setup
#      added rows 11-14: your deck against the villain deck (decks/doom-legion.dck,
#      named once in tools/villain-deck.sh; VILLAIN_DECK=<path> overrides) under
#      each AI profile, with the profile's values read back from the in-game AI
#      and every Forge preferences file fingerprinted before and after.  They
#      prove the profile REACHES the engine, not that it changes the play.
./tools/ten-games.sh
./tools/ten-games.sh --games 3     # the first three rows, for a quick look
./tools/ten-games.sh --seed 13     # one row: your deck vs the villain, Reckless

# The 2026-09-27 hardening pass — two self-checks, both in the gate.
./tools/check-engine-crash.sh      # D115, check-all's 12c, ~8 s: a card the engine
                                   # cannot build, in a scratch Forge home under
                                   # var/crash-probe/, must fail MtgTable AND
                                   # RecordMatch with the cause and end each frame
                                   # log in an error notice and a null `over`
node tools/wire-drift.mjs fixtures/games/g1.jsonl var/check-all-record.jsonl   # step 6 (D113)

# M5 — the probe runs behind it, one at a time.  --probe is a POLICY flag on the
#      automated seat (it picks a card in a library search, takes getInteger's
#      "Other...", spends floating mana and sends clickAbility); --mana-lost-prompt
#      turns on one Forge preference, in memory, and is the only way the `confirm`
#      ask kind is reachable at all.  --deck2 is load-bearing: leaving it off
#      changes what the engine asks.
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --seed 7 \
    --game-id human-search-7 --deck decks/search-probe.dck --deck2 decks/morph-probe.dck
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --mana-lost-prompt --seed 7 \
    --game-id human-amount-7 --deck decks/amount-probe.dck --deck2 decks/morph-probe.dck
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --seed 7 \
    --game-id human-number-7 --deck decks/number-probe.dck --deck2 decks/morph-probe.dck
node tools/ws-auto-play.mjs --port 8642 --probe   # the same policy over the socket

# M7 — the ARENA: the same frame stream, rendered as a 3D cinematic
npm --prefix web run dev:arena     # opens /?replay=games/g1.jsonl#arena — no JVM
./scripts/play.sh --arena          # a LIVE game, in 3D (add --no-arena to force 2D)
#   `V` switches renderer mid-game over the same socket; `K` skips every
#   animation; `#arena` / `?view=arena` is the whole of the difference.
#   Escape hatches: ?arena=off renders the 2D board even at #arena, ?dpr=0.75
#   pins the render resolution, ?stats=1 / ?grid=1 / ?glinfo=1 are the debug flags.
npm --prefix web run build && npm --prefix web run preview -- --port 5182 &
node tools/arena-bench.mjs         # report 09 §9.4's frame-time measurement:
#   headless Chromium + SwiftShader against the PRODUCTION build on 5182.
#   --url overrides it, --settle separates a cold table from the steady state.
#   Deliberately NOT in check-all.sh: it wants a dist, a preview server and a
#   browser, so a performance regression does not turn the gate red.

# M7 Tier 2 — figures, terrain, auras and the stack, in the same arena
node tools/arena-bench.mjs --index 316 --gpu gl   # Tier 2's bench frame (g1 @316, 11
#   figures) on the machine's real GPU; drop --gpu for SwiftShader, add --bloom /
#   --no-bloom / --reduced-motion / --dpr 1, and --settle 4000 for a warm table
#   ?bloom=0 / ?bloom=1 on any arena URL sets where bloom starts (default: on)
node tools/build-figures.mjs --src var/assets/figures   # rebuild web/public/models/
#   figures.glb + web/src/arena/figures/models.json from the FIVE CC0 downloads
#   named in tools/assets-manifest.json (slice 4 added the Universal Base
#   Characters), each verified by bytes and sha256 first (--verify-only checks
#   them and stops; see "Arena mode" below)

# M7 Tier 2, slice 2 — the camera views (keys in the arena, replay or live)
#   1 table · 2 your shoulder · 3 opponent's shoulder · 4 side-on · 5 low
#   6 or 0 the auto director · O spectator mode (3, 4 and the director only when
#   no seat is live; spectator is on by itself in a replay and when a game ends)

# D137 — the COMIC look is the arena's default: ink, three cel bands, halftone, a
#      contact shadow and a stage ("The comic look" below).  ?look=holo on any arena
#      or workshop URL restores the hologram; ?ink=none ?halftone=0 ?key=world
#      ?stage=felt ?shadow=0 turn one part off; the workshop's toolbar switches all.
#      The ink rides bloom (D146): bloom off, no line (?ink=always to force it).

# The comic motion lane (D147-D155) — impact stars and their lettering, ink
#   splats, halftone dots, speed lines, the hologram-to-ink summon, impact shakes,
#   and every cue "on twos".  Two switches on any arena or workshop URL, and two
#   checkboxes in the cue strip / the workshop's queue bar:
#   ?fx=classic   the film exactly as it was before the lane (default: comic)
#   ?twos=0       smooth motion (default: on twos; always off under reduced motion)

# D250-D252 — SOUND CUES: an arrival, an attack, a hit, a death, a spell
#   resolving, the outcome, and four S.H.I.E.L.D. cards' own.  MUTED until you
#   turn it on: M in the arena, or the cue strip's "sound" checkbox (the workshop's
#   Cues panel has its own).  Kept in this browser; "Sound" below.
node tools/build-sounds.mjs --firefox   # rebuild the eleven clips (needs chromium; not in the gate)

# D102 — THE WORKSHOP: one card on a pedestal, drawn by the arena's own renderer —
#      its figure, props, clips and cues, tunable live in this browser.  No JVM,
#      no socket.  W in the 3D arena opens it too; "The workshop" below.
npm --prefix web run dev            # then http://127.0.0.1:5173/#workshop
#   /?card=coulson#workshop           opens on a card (a name or part of one;
#                                     ?card= goes in the QUERY, not the hash)
node tools/build-workshop-catalog.ts    # decks + fixtures/games -> its card list
```

Everything above runs today. As of **M4** the board those frames feed is a real
Magic table — card art, tapped cards rotated 90°, two player rails, a phase
strip, a stack panel, targeting and combat arrows, and a keyboard — and as of
**M5** nothing on it dead-ends: floating mana is spendable, the board-shaped
questions are answered on the board, every zone can be opened and read, and the
declared attackers and blockers are a strip of their own.

### Continuous integration

`.github/workflows/checks.yml` runs on every push to `main` and every pull
request: **the half of the gate that needs no running engine**, in three jobs
side by side on GitHub's `ubuntu-latest`.

| job | what it runs |
|---|---|
| `web` | `npm ci`, `npm --prefix web run build`, `npm --prefix web test` — Node 24. Hermetic as it is locally: `MTGTABLE_WS_LOGS` is unset, so the ws-log suite replays the committed fixtures, and there is no `web/public/art.json`, so every reader of it falls back to the empty index, as in a fresh checkout. Nothing calls Scryfall. |
| `bridge` | `tools/lint-bridge-selftest.sh` and `tools/lint-bridge.sh` (no engine needed), then the pinned engine (below), `tools/check-forge.sh` and `./bridge/build.sh` — javac and its seven self-tests, on Temurin 21 |
| `redaction` | `check-redaction.mjs` over `fixtures/games/` and `fixtures/synthetic/`, `check-redaction-selftest.mjs`, `narrate-selftest.mjs`, `wire-drift-selftest.mjs` and `build-workshop-catalog.ts --check` — plain Node, no npm install |

**The engine in CI.** CI is the one place anything downloads Forge, and it
downloads only what you would: the `forge-installer-2.0.14.tar.bz2` asset
(301,832,993 bytes) of Forge's **tagged `forge-2.0.14` release** — the
distribution `~/forge` was unpacked from, never the `daily-snapshots` build
(D109, D110). The job checks the archive against the sha256 GitHub publishes for
it, extracts **the jar alone**, fails unless the jar's sha256 is the pin in
*Getting the engine* above (`3c0a7c38…8e5dd9`, 39,383,858 bytes), and points
`FORGE_JAR` at it (hard rule 9; `config.json` is not edited). Only that jar is
kept, in the Actions cache under a key naming the asset and both digests — never
in git and never as an artifact. `res/` is not extracted and
`tools/make-forge-home.sh` is not run: none of the seven self-tests boots an engine
or reads `res/`.

**What stays local.** `./tools/check-all.sh` — Smoke, the recordings and the
drift check against them, the fourteen ten-games rows, 9d and 9e, the seven
WebSocket servers, the engine-crash probe, and every check over what those
produce — is still the command you run before committing; CI plays no game and
starts no server. So are `tools/arena-bench.mjs` (a built `dist`, a preview
server and a headless Chromium), `tools/fetch-art.ts` and the card library's
real build (both Scryfall). A green CI run is a subset of a green gate, never a
substitute for it.

### Decks

Every deck the engine plays is a Forge `.dck` file, loaded with
`DeckSerializer.fromFile` and never written (hard rule 4); a `.txt` beside one is
the same list as typed, for people and the card library. `node tools/audit-deck.mjs <deck.dck>…` says, card by card,
whether the configured engine will actually play one — **ok**, **missing** (Forge
would drop it from the library without a word) or **broken** (it would take the
game down) — from a throwaway Forge home under `var/audit-deck/`; it needs a built
`bridge/out` and is not part of the gate.

| deck | what it is | on Forge 2.0.14 |
|---|---|---|
| `decks/pacho-shield.dck` (+ `.txt` as typed) | **the deck in play**: the user's W/U S.H.I.E.L.D. deck, 40 cards, MSH + MSC | plays; D14 corrects one card |
| `decks/doom-legion.dck` | **the AI's deck** (match setup, D108): *Doom Legion*, 40 blue-black Marvel villains, MSH + MSC — what a bare `./scripts/play.sh` seats against you (*Choosing decks and the AI*, below). Its committed recording is `fixtures/games/villain-doom-248.jsonl` (D220), and every creature it names reads as itself in the arena (*Villain identity*, below) | plays |
| `decks/masters-of-evil.dck`, `decks/hulk-family.dck`, `decks/wakanda.dck` | **three more AI decks** (more-villains, D116): black-red villain aggro, red-green gamma stompy and green-white go-wide, 40 cards each, MSH + MSC, every one written from `decks/specs/<deck>.json` by `tools/build-deck.ts` (Doom Legion's too). `--ai-deck` seats one; `config.json`'s default is still Doom Legion. Each has a committed recording — `fixtures/games/villain-masters-of-evil-33.jsonl`, `villain-hulk-family-261.jsonl`, `villain-wakanda-232.jsonl` (D230) — and every creature they name reads as itself in the arena (*More villain identity*, below) | play; `tools/deck-smoke.sh` plays each (not in the gate) |
| `decks/fra-rw-aggro.dck` (+ `.txt`) | **the user's Reality Fracture pool** from the set's pre-release: red-white legends aggro, 40 main + 10 sideboard, copied from the user's own list | **does not play yet** — 19 ok, 31 missing, 0 broken. Waits for an official Forge release (D109) |
| `docs/drafts/decks/fra-gb-leftovers.dck` | a **draft** FRA opponent for the AI: the green-black "leftovers" deck the user's own notes propose, finished to 40 with basics only (D112). Deliberately **not** in `decks/` until the user accepts it (`docs/drafts/README.md`) | does not play yet — 20 ok, 20 missing |
| `decks/*-probe.dck` | nine probe decks: seven in the table below, plus `morph-probe` and `future-sight-probe` (*Repo layout*) | all play; each has a committed recording |

Both FRA decks build **completely** — 50 of 50 and 40 of 40, every card Forge's
own script — on Forge's `2.0.15-SNAPSHOT-09.27` daily build, which was measured
and not adopted. On the day an official release ships the set:

```bash
FORGE_JAR=<release jar> node tools/audit-deck.mjs \
    decks/fra-rw-aggro.dck docs/drafts/decks/fra-gb-leftovers.dck   # expect 90 ok
# then, once the engine is switched (report 14 §0):
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 7 \
    --deck decks/fra-rw-aggro.dck --ai-deck docs/drafts/decks/fra-gb-leftovers.dck
./scripts/play.sh --deck decks/fra-rw-aggro.dck --ai-deck docs/drafts/decks/fra-gb-leftovers.dck
```

(`--ai-deck` is match setup's spelling of `--deck2`; either works on both.) Until
that day `node tools/check-deck.mjs decks/fra-rw-aggro.dck` fails, by design, and
so does any `check-deck.mjs decks/*.dck` — `decks/README.md` says why.

**The probe decks.** Seven throwaway forty-card decks whose only job is to make
Forge do something `decks/pacho-shield.dck` never makes it do — usually ask a
question, and once (`yield-probe`) repeat an ability. They are how an
ask kind stops being "implemented against a spec" and becomes "recorded from the
engine", and each one has a committed fixture to show for it:

| deck | the card | what it forces |
|---|---|---|
| `decks/trample-probe.dck` | 22 Garruk's Companion (trample) | `assign_damage` — a trampler through a blocker (M2) |
| `decks/scry-probe.dck` | 16 Opt | `input.focusCard` — not an ask at all (M2) |
| `decks/search-probe.dck` | 20 Rampant Growth | `choose_entities` **with a `delayedReveal`** — the engine handing over cards out of a hidden zone |
| `decks/amount-probe.dck` | 20 Manamorphose | `assign_amount`, in its **colour-keyed** form, and (with `--mana-lost-prompt`) `confirm` |
| `decks/number-probe.dck` | 16 Volcano Hellion | `text`, through `getInteger`'s *"Other…"* option |
| `decks/sideboard-probe.dck` | 22 Garruk's Companion + a sideboard | `sideboard` — **fires since M6**, between the two games of a `--games 2` match (`fixtures/games/human-sideboard-7.jsonl`) |
| `decks/yield-probe.dck` | 22 Thallid (a mandatory upkeep trigger) | not an ask: **a repeating ability**, so the same `stack[].yieldKey` returns to the top of the stack every turn. It is what turned auto-yield's *behaviour* from a measured number into a gate assertion (`fixtures/games/human-yield-13.jsonl`, gate step 10g) |

Two of the eleven ask kinds have no recording and never will in this
configuration: `options` has **no call site anywhere** in the Forge 2.0.14 jar,
and `manipulate_list` has exactly one, gated on a preference this project sets to
`false` because turning it on ships your whole library to the client. Both are
documented ceilings rather than open gaps
([`docs/evidence/m5-probes.md`](docs/evidence/m5-probes.md)).

### Playing in the browser

```bash
./scripts/play.sh                 # this is the whole command
```

It runs `tools/check-forge.sh`, builds the bridge, starts it on the ws port in
the background with its output in `var/play/server.log`, polls
`GET /health` until the game exists, and then starts vite and opens

```
http://127.0.0.1:5173/?ws=1
```

Ctrl-C stops both halves. So does the bridge, when it is finished: since **M6** a
bare run is **three games back to back** (`--games 3`) and the socket stays up
after the last `over` (`--keep-open`) **for as long as this browser stays
connected** — which is the window in which the board's **New Game** row still has
a session to act in. (It was a flat 30 s at first, fuse and all, and that was a
defect: the row appears at `over`, so the one control M6 exists for had half a
minute to live. It now ends when the tab does — 30 s is only the cap for a
session nobody ever connected to.) Press it and the JVM keeps going instead of
exiting; `HostedMatch.continueMatch()` deals the next game
of the match and `restartMatch()` starts a fresh one, each with its own
`hello_ok`, its own `gameId` and its own `var/games/<gameId>/frames.jsonl`.

`--seed 42` makes the shuffle reproducible, `--port` / `--web-port` move either
half, `--no-open` skips the browser, `--no-keep-open` closes the socket the moment
the match ends, and everything after `--` is handed to `mtgtable.MtgTable`
untouched — including a `--games` of your own, which wins. `--deck`,
`--ai-deck`, `--mirror` and `--ai-profile` choose what you play against:
*Choosing decks and the AI*, below.

**Playing from ForgeCoach instead: `./scripts/play.sh --engine-only`** (**D285**).
[ForgeCoach](https://jalirkan.github.io/ForgeCoach/) is where the owner plays
ordinary games, connecting from the browser to the bridge's seat socket
`ws://127.0.0.1:<wsPort>/ws` (its origin is on `wsAllowedOrigins`, **D281**). That
needs the engine and nothing else, so `--engine-only` runs steps 1–4 above —
`check-forge`, the build, the bridge in the background, `/health` — skips vite and
the browser, prints `Engine ready on ws://127.0.0.1:8642/ws — open
https://jalirkan.github.io/ForgeCoach/ and click Play`, and waits. It takes the
same match flags (`--deck`, `--ai-deck`, `--ai-profile`, `--mirror`, `--seed`,
`--games`, `--port`) and the same defaults (three games, `--keep-open`, so ForgeCoach's
New game and Next game have a session to act in). Ctrl-C (or the match ending and
the linger window closing) stops the JVM and exits 0. **Close every mtg-table board
tab first**: the first `/ws` client takes the seat and a second is refused 4001.

**Playing from a phone: `./scripts/play.sh --engine-only --lan`** (**D287**–**D289**,
amendment M51). An https page may not open `ws://` to another machine's address
(mixed content; only localhost is exempt), so the phone cannot use the github.io
page against the desktop. In LAN mode the bridge serves ForgeCoach itself, over
plain http on the socket's port, and the phone opens one URL — the page then talks
to the socket on the same origin. `--lan` implies `--engine-only` and:

- binds `0.0.0.0` instead of `127.0.0.1`, behind a **pairing token** made fresh on
  every run (128 random bits). Every request from another machine — the page, its
  files, `/health`, `/ws`, `/observe` — without it is refused 403. This machine
  needs no token, so the desktop's browser, github.io's ForgeCoach included, works
  exactly as before;
- downloads ForgeCoach's built site
  (`https://jalirkan.github.io/ForgeCoach/forgecoach-site.zip`) into
  `var/forgecoach/`, again when the copy is over a day old or you pass
  `--refresh-site`, and uses the cached copy when offline (with neither it says so
  and stops). `--site-dir <path>` serves a local ForgeCoach build instead (one
  built with `vite build --base ./`);
- prints `http://<this machine's LAN IP>:<wsPort>/?token=<T>` for every network
  address, the best guess first, and a QR code of it if `qrencode` is installed.
  Open it on the phone (same Wi-Fi) and click Play.

**The token is the only lock, and there is no TLS.** Anyone on the same network
who sees the URL — or can read the network's traffic — can take the seat. Use it
on a home network you trust, and stop it (Ctrl-C) when you are done; the next run
has a new token. The idle limit below still applies: an hour with no `/ws` client
ends the session.

**Coaching without an API key** (**D292**). ForgeCoach's coach can use the
Claude Code CLI already logged in on this machine instead of an API key. `./scripts/play.sh` — every mode,
`--engine-only` and `--lan` included — starts `tools/coach-helper.mjs` beside the
engine whenever the `claude` command is on your PATH, and says so in one line:

```
Coach: Claude Code on this PC (no API key needed) — http://127.0.0.1:8643
Coach: claude CLI not found — ForgeCoach will ask for an API key or offer Copy prompt
```

ForgeCoach finds the helper at `http://127.0.0.1:8643` (`config.json`'s
`coachPort`), sends it the coaching prompt it would have sent the API, and the
helper runs `claude -p` (headless Claude Code) and streams the answer back. What
that means for you:

- **Set-up is Claude Code itself**: install it and run `claude` once in a terminal
  to log in. The coach then uses your Claude subscription's usage, exactly as
  typing the question into Claude Code would. Without it ForgeCoach asks for an
  API key or offers *Copy prompt*, as before.
- **Claude gets nothing to act with**: every tool off, no MCP servers, no
  session saved, an empty temporary folder as its working directory, one turn.
  It reads the prompt and answers; it cannot open a file or run a command.
- **One question at a time.** A second question waits up to five seconds for the
  first to finish or be cancelled; closing or moving on in ForgeCoach cancels the
  question, and the `claude` process is stopped.
- **Who may call it** is who may open the engine's socket: pages from
  `wsAllowedOrigins` (loopback and `https://jalirkan.github.io`), anything on this
  machine with no `Origin`, and — under `--lan` — the phone's page, with the same
  pairing token the engine uses. The helper's log is `var/play/coach.log`.
- `--no-coach` skips it; it stops with the engine. Run it on its own with
  `node tools/coach-helper.mjs` (`tools/README.md` has the commands and a
  `curl` to try it).

Your browser may ask once whether ForgeCoach may reach devices on your local
network: that is the github.io page calling `127.0.0.1`, and it is this helper.

**A game you play has no clock** (**D286**). `--transport ws` and `console` put no
wall-clock limit on a game, so thinking for an hour is fine; `--transport null` and
`auto` keep their 900 s, and `--game-timeout <sec>` sets either (`0` is none). The
one limit a `ws` session keeps is for nobody being there: it ends after **3600 s
with no `/ws` client connected** (`--idle-timeout <sec>`, `0` is off), so a bridge
you started and never opened does not run for ever. A client that is connected
never starts that clock, however long it sits; a read-only `/observe` follower does
not count as one.

**The page.** One line of chrome across the top — the seat, the socket's state
(`open` / `reconnecting` / `refused`) and its URL, the frames in and out, the
Scryfall credit, and two buttons: **Resync** (ask the bridge to re-send the state
and the current input) and **Reconnect** (drop the socket and open a new one).
Everything under it is the board, and the board never scrolls sideways at
1600 × 900 or at 1280 × 720.

```
+--------------+----------------------------------------+--------------+
| mtg-table  ·  seat: Human  ·  open  ·  in 1368 / out 236             |
+--------------+----------------------------------------+--------------+
| FORGE AI     | forge ai · lands      (tapped = 90 deg)| ROUND 9      |
| life 14      | forge ai · permanents                  | turn 18      |
| lib 26  h 1  |                                        | - - - - - -  |
|              | graveyard · exile     THE STACK (2)    | Upkeep       |
| YOU          |                                        | Draw         |
| life 20      | human · permanents                     | > MAIN 1   o |
| lib 22  h 3  | human · lands                          |   Attackers o|
| - - - - - -  |                                        |   Blockers  o|
| DECISION     |     your hand, fanned                  |   MAIN 2    o|
| [Auto][Undo] |                                        |   End step   |
+--------------+----------------------------------------+--------------+
```

- **The left rail** is both seats and then your decision panel: life, poison,
  counters, the zone counts (`▤` library, `✋` hand, `⚰` graveyard, `◇` exile) and
  the mana pool as coloured pips. **On your own rail a pip with mana under it is
  a button** — click it to spend one floating mana of that colour (below). Under
  them the panel names the step, prints
  Forge's own prompt **verbatim**, and carries the engine's two buttons, Concede,
  and a line of help when the engine wants a *card* click rather than a button.
  While a selection is open it also prints **`chosen k of min..max`** — the
  clicks you have sent since this prompt, not a count the engine published, and
  never enforced: Forge is the judge of every click.
- **The table** is five rows and a hand: the opponent's permanents and lands,
  a middle strip with both graveyards, exile and the stack panel, then your
  permanents, your lands, and your hand fanned along the bottom. Cards are real
  Scryfall images; a card with no art (a token, or a deck you have not fetched art
  for) draws a generated frame with its name, its mana pips, its type line and its
  P/T, and it is clicked exactly the same way. **Each strip's caption opens that
  zone** at a readable size (below), and during combat a **band strip** across the
  bottom of the middle lists the declared attackers and blockers.
- **Tapped is rotated 90°**, summoning sickness is a tint, counters and damage are
  badges, an Aura or Equipment is drawn attached to what it is on, and a card the
  engine has named in `selectable` gets a gold outline and a corner caret.
- **The right rail** is the turn readout and the thirteen steps of the turn, with
  the current one lit — blue on your turn, orange on the opponent's. The two dot
  columns are phase stops, and **since M6 they are live**: they render from
  `players[].phaseStops` on the wire, a click sends `act: setPhaseStop` and the
  engine answers with the next `state`. The browser still remembers nothing —
  a client that remembered its own stops would be putting rules logic in the
  browser. Replaying a recording made before M6 draws Forge's own defaults,
  disabled, and says so in the legend. Phase stops are **reseeded for each game**
  of a match (D38), so a stop set in game 1 has to be set again in game 2.
- **Arrows** are drawn over the whole table: dashed purple from a spell on the
  stack to what it targets, solid red from an attacker to what it is attacking,
  dotted green from a blocker to what it blocks. They are decoration — every one
  of those facts is also written down, on the tile, in the stack panel and in the
  log drawer — so nothing is lost if you cannot tell the colours apart.

**Clicking.** Click **any** card, not only a highlighted one. `selectable` is the
engine's *explicit* selection set and it is empty for most of your own main
phase; Forge judges every click, and one it does not want comes back as a
`Not selectable` toast (amendment M8). Player names are clickable too, for
targeting and attacking. **The two buttons wear the engine's own labels** — OK is
`Play`, `Keep`, `Auto` or `OK` depending on what Forge is asking, and Cancel is
`Undo (2)` or `End Turn` when it says so.

**Spending floating mana.** Tapping a land puts mana in your pool, and the pool
is not spent for you on an ordinary cast — Forge auto-pays from it only when the
cost is mandatory. So each coloured pip on **your** rail that has mana under it
is a button: click it, or press `W` `U` `B` `R` `G` `C`, to spend one. This is
the one thing M4's board genuinely could not do, and it is the whole of the
difference between "the engine is waiting" and "the game is stuck". The usual way
to pay a cost is still the engine's own **`Auto`** button (that is what Forge
writes on OK during a mana payment) plus clicking lands; the pips are for the
mana already floating. A pip pressed when nothing is being paid is a *meaningless
act*, which the bridge drops on the floor by design — the board neither hangs nor
invents a local rule about when a pip may be pressed, because the only signal on
the wire for "a payment is in progress" is the text of a button label, and this
client does not read engine prose to decide what a control means.

**Opening a zone.** Every graveyard, exile and command strip's caption is a
button: click `human · graveyard 2 ⤢` and a panel lists that zone as full-size
cards. So does the library count on a rail, which shows the revealed slice and
says `n shown of count` rather than drawing card backs for cards it was never
sent. A hand can only be opened at your own seat, ever. And when Forge itself
asks you to look somewhere — `input.openZones`, which is a **view hint and
reveals nothing** — the panel opens by itself and closes again when the hint
goes away. `Esc` closes a panel, unless a question is open, in which case
answering the question comes first.

**Combat.** Once attackers are declared, a strip along the bottom of the middle
row lists each band as the engine reports it: the attacker, what it is attacking,
and the blockers on it, each as a real card. It is the same three facts the red
and green arrows draw, written down — and it is read from `combat.bands` only,
so it never claims a band Forge has not declared. It floats over the graveyard
and exile strips while it is tall; the captions stay clickable through it, which
is how you reach a card it covers.

**Comfort — and every one of these is a Forge feature, rendered.** M6 added no
rule to the browser. Each control below reads a typed field off the wire and
sends an act; the next `state` is what says it happened, and the page remembers
nothing between frames.

- **Phase stops** are the two dot columns on the right rail, described above:
  they draw `players[].phaseStops` and a click is `act: setPhaseStop`. They are
  **reseeded for every game** of a match, so a stop set in game 1 is gone in
  game 2 — that is Forge's map being rebuilt, not the page forgetting.
- **Pass-To** is a row in the decision panel and three keys: **End of turn**
  (`E`), **My next turn** (`T`), **Before my turn** (`B`). They are *three*
  engine mechanisms behind one act (`yieldTo`) — an auto-pass until end of turn,
  and two per-(player, phase) markers — and while one is running the phase strip
  draws it from `state.yield` and the engine's own **Cancel** button stops it.
  There is no "cancel the yield" act: Forge's `InputLockUI` puts the label on
  Cancel, and pressing Cancel is the cancel.
- **Auto-yield** is a pair of buttons on each stack item, `Y` and `N` for the one
  on top: **Always yes / Always no** for an optional trigger, **Auto-yield /
  Never** for an ability that simply resolves. Pressing one is
  `act: setYield {yieldKey, mode}`; Forge's own auto-yield store is what answers
  from then on, and `stack[].yielded` is what the chip reports. Press the same
  button again to clear it. The `yieldKey` is an opaque handle the bridge mints
  (`y3`) and the page never displays it, because Forge's real key is a card name
  plus its rules text. One thing worth knowing: the store is **scoped to
  abilities**, so a yield set on a creature *spell* is remembered and never
  consulted.
- **Undo** is `Ctrl+Z` or the Undo button, and it is the engine's undo:
  **mana abilities only**, cleared at every phase change and whenever priority
  leaves you. The button is enabled from `state.undo.can` and carries the depth
  (`Undo (2)`) because Forge's own Cancel button often carries the same number —
  two controls, one question, and they agree because both read the engine.
- **New Game** appears when the game is over: **New game** continues the match
  (`HostedMatch.continueMatch()`) and **Restart match** starts a fresh one
  (`restartMatch()`), both in the same JVM with the same card database. The board
  drops everything it knew and rebuilds from a new `hello_ok` with a new
  `gameId`; the bar then says `Game 2 of 3` and the new game writes its own
  `var/games/<gameId>/frames.jsonl`. Both buttons go quiet, with the reason
  written out, if the socket is not `open`.
- **The floating-mana warning is on by default.** Passing priority with mana in
  your pool that would be lost asks you to confirm first — Forge's
  `UI_MANA_LOST_PROMPT`, set **in memory only** (nothing is ever written to your
  Forge profile). `./scripts/play.sh -- --no-mana-lost-prompt` turns it off for a
  session. It is also the only way Forge asks a `confirm` at all in an ordinary
  game.

**The keyboard.** Press **`H`** (or `?`) for this list in the page itself — it is
rendered from the same table the handler reads, so it cannot list a key that does
nothing.

| key | what it does | works from |
|---|---|---|
| `Space` | press the **focused** button — `input.buttons.focus` says which, and its label is the engine's (`OK` / `Auto` / `Keep`…) | **now** |
| `Esc` | close an overlay; otherwise answer an open question with "no answer"; otherwise press Cancel | **now** |
| `Ctrl+Q` | concede — twice, like the button | **now** |
| `Z` | zoom the card under the pointer | **now** |
| `S` | show or hide the stack panel | **now** |
| `C` | emphasise the combat arrows | **now** |
| `L` | open or close the log drawer | **now** |
| `H` / `?` | this list | **now** |
| `W` `U` `B` `R` `G` `C` | spend one floating mana of that colour, while the pool holds it | **now** |
| `A` | auto-pay a mana cost — **press `Space` instead**: it is the engine's own OK button, labelled `Auto` | — |
| `P` | pass priority — a no-op unless the engine is asking for one, which is what makes it safer than `Space` | **now** |
| `Ctrl+Z` | undo the last mana ability | **now** |
| `E` | pass priority until end of turn | **now** |
| `T` | pass to your next turn | **now** |
| `B` | pass to just before your turn | **now** |
| `Ctrl+A` | attack with everything | **now** |
| `Y` / `N` | auto-yield: always yes / always no | **now** |

**Every row works today** — M6 turned the last seven on, and the milestone
column in the in-page overlay is now provenance rather than a warning. (`A` is
the exception and always was: there is no `autoPay` act, because Forge writes
`Auto` on `InputPayMana`'s own OK button, so `Space` is the binding.) A key whose
act the engine cannot use at that moment flashes and says so in the decision
panel, rather than doing nothing quietly.
Where Forge has its own binding for one of these, the overlay prints it in the
third column, and the four places we deliberately differ say so there too.

The six mana letters are a special case, and the rule is worth knowing: **a
letter spends only while that colour is actually floating.** With an empty pool
`C` is still "emphasise the combat arrows" and `B` is still M6's pass-to, so
nothing you already use is taken away; with mana in the pool the letter spends it
and says so. A letter pressed with no mana behind it tells you *"no floating mana
of that colour — tap a land first"* rather than doing nothing.

Three rules the keyboard follows, because getting them wrong is worse than having
no keyboard at all: **a focused button keeps `Space` for itself** (the browser is
already going to press it, and sending `buttonOk` as well would answer the engine
twice) **and keeps nothing else**; **a text field keeps everything**; and `Esc`
has a strict precedence — an overlay first, then an open question, then the
engine's Cancel button. Every key is inert while the socket is not `open`, and on
a replay the board plans no action at all.

**Questions.** Forge asks two sorts of question, and they are answered in two
different places.

- **If every option is something the board is already drawing** — a card with a
  tile, a player with a rail — the question is answered **on the board**. The
  candidates get a purple outline with a `?` caret (deliberately not the gold
  `selectable` outline: they are different states), clicking one chooses it and
  turns it green with a `✓`, and the decision panel lists the same candidates
  with the engine's own labels, a running count, and **Answer / Default / Cancel
  / Reset**. Combat damage is assigned this way too: the number boxes appear on
  the blockers themselves, with the defending player keeping its row in the
  panel. Nothing is covered up, so you can see the board you are deciding about.
- **Otherwise a dialog takes over**: a scrim over the board, focus moved into it
  and handed back where it came from when it closes, `Tab` cycling inside it, and
  the board's own clicks inert until you answer. That is where a colour choice, a
  cost choice, an ability menu, a number, and every *reveal* goes — a library
  search or a "these are the cards" acknowledgement is not a choice made on the
  board, and the cards it hands you have no tile to point at, so the dialog draws
  them as real cards instead.

The rule is one sentence — **a question is answered on the board if and only if
*every* option is already drawn there** — and one option that is not sends the
whole question to the dialog, because a picker that can express four of five
options is exactly the dead end M5 exists to remove.

Either way, `Esc` answers with "no answer", which is always legal — the bridge
substitutes Forge's own documented default. Every kind can also be answered in
one click with that default; `order`, `choose_list` and `manipulate_list`
deliberately offer no cancel, because Forge dereferences their result. One
subtlety worth knowing: for a question that wants **a number**, the default is
*cancel* rather than an empty box — Forge re-asks until the number is in a range
it never tells the client, so an empty answer would be the same question forever.
**There is no timeout while you
are connected** — the ws ask timeout is 0, the same as the console's, and it is
your connection rather than a clock that bounds it, so no countdown bar is drawn.
A bar appears only if a question genuinely carries a deadline.

**Concede** is always visible and takes two clicks: the first arms it
(*Concede — click again to confirm*), the second sends it. After `over` it
disarms and disables itself.

**If the socket drops** — a vite hot reload, a laptop sleep, a restarted
bridge — the page reconnects by itself: backoff 250 ms, 500, 1 s, 2 s, 4 s, then
5 s, up to twelve attempts, and it sends `resync` on every reconnect, so the
board comes back with the full state, the current input and any question still
outstanding. **The game is still there** — your seat is not given up and the
bridge keeps playing.

Two details worth knowing, because they are the difference between "nothing was
lost" and "something was decided for me":

- **A question that was on screen when the socket died is answered by the
  engine's own default.** Dropping the connection unparks the game thread
  (`cancelAll()`), and Forge takes the documented default for that kind — the
  same value a deliberate "no answer" would have given (`docs/protocol.md` §5.4).
  It cannot be taken back.
  A question the engine asks *after* the drop is different: it waits (up to two
  minutes) and is handed to you when you come back.
- **Clicks made while the bar does not say `open` are dropped, not queued.**
  Nothing is replayed at you later; click again once it is open.

Three cases the automatic reconnect will not fix:

- **`refused`** — the bar says so and stops retrying. Only **one client at a
  time** is allowed (the server sends one notice and closes with code 4001), so
  you have a second tab open on the same bridge. Close it and press
  **Reconnect**.
- **The bridge exited.** It plays the match it was asked for — three games by
  default — and quits once the linger window after the last `over` closes; there
  is nothing to reconnect to. Run `./scripts/play.sh` again. (Pressing **New
  Game** inside that window keeps the same JVM and the same socket.)
- **A red banner naming a frame.** That is protocol drift, not a network
  problem: the reducer stopped rather than render something it does not
  understand. `var/play/server.log` and the frame log are what to read.

Your browser game is logged exactly like a console one, to
`var/games/<gameId>/frames.jsonl` — copy it under `fixtures/` and
`?replay=<that path>` scrubs back through it with no JVM running.

**Replay mode** is the same board, read-only. `npm --prefix web run dev:replay`
opens `?replay=games/g1.jsonl`; any other fixture is a query parameter
(`?replay=games/morph.jsonl`, `?replay=synthetic/sample-handwritten.jsonl`).
A scrubber above the board steps frame by frame, forwards and backwards, and
everything the live board draws is drawn here — art, rotations, counters, the
rails, the phase strip, the stack panel, the arrows — with an amber **Read-only**
pill and **every** affordance `disabled`. That is not a styling choice: a replay
has no transport to answer with, and the whole of the difference between a seat
and a replay is one prop (`<Board actions={…}/>` — `null` means read-only), which
the test suite asserts over every frame of every committed recording. Scrubbing
backwards is a real fold from the start of the file, not an undo stack, so the
log drawer's entry count falls as you scrub back.

`?replay=games/morph.jsonl` is the one to open to see the generated text frame,
which is what a missing image looks like — **if `art.json` has no entries for
it**. Since match setup, `tools/fetch-art.ts` fetches every `decks/*.dck`,
`morph-probe.dck` included, so after a full run that deck has art too; `node
tools/fetch-art.ts --deck decks/pacho-shield.dck` writes an `art.json` without
it, and a token is always drawn as the text frame.

### Choosing decks and the AI

**Match setup** (2026-09-27, protocol amendment M44) chooses what you play
against: your deck, the AI's deck, and which of Forge's AI profiles the AI plays
under. A bare `./scripts/play.sh` seats your `decks/pacho-shield.dck` against
**`decks/doom-legion.dck`** — *Doom Legion*, 40 blue-black Marvel villains from
the same two sets as your deck — under the `Default` profile, for three games.

```bash
./scripts/play.sh                                   # you vs Doom Legion, Default, three games
./scripts/play.sh --ai-profile Reckless             # the same match under another profile
./scripts/play.sh --mirror                          # the AI plays a copy of your deck
./scripts/play.sh --ai-deck decks/masters-of-evil.dck   # the Masters of Evil: B/R villain aggro
./scripts/play.sh --ai-deck decks/hulk-family.dck       # the Hulk family: R/G gamma stompy
./scripts/play.sh --ai-deck decks/wakanda.dck           # Wakanda: G/W go-wide
./scripts/play.sh --ai-deck decks/morph-probe.dck   # any Forge .dck, on either seat
./scripts/play.sh --deck decks/doom-legion.dck --ai-deck decks/pacho-shield.dck   # you play the villains
./scripts/play.sh -- --games 1                      # one game instead of three
```

| flag | on `scripts/play.sh` | on `mtgtable.MtgTable` | chooses |
|---|---|---|---|
| `--deck <path>` | default `config.json`'s `match.deck`, else its top-level `deck` | default `config.json`'s top-level `deck` | your deck |
| `--ai-deck <path>` (`--deck2` is the same flag) | default `match.aiDeck`, shipped as `decks/doom-legion.dck` | default: **a mirror of your deck** | the AI's deck. On the bridge, `--deck2` and `--ai-deck` naming two different files is an error |
| `--mirror` | the AI plays a copy of your deck, whatever `match.aiDeck` says | — (leave `--ai-deck` out) | a mirror match |
| `--ai-profile <name>` | default `match.aiProfile`, else `Default` | default `Default` | one of the `.ai` files in `forge-home/res/ai/`: `Default`, `Cautious`, `Reckless` or `Experimental`, in any case. Any other name is refused before the engine starts, with the list |
| `--games <n>` | after `--`; default `match.games`, else 3 | default 1 | how many games the match is |

A flag beats `config.json`, and a flag typed after `--` (which goes to
`mtgtable.MtgTable` untouched) beats both. `play.sh` prints the match it is about
to start in its `== match` block; the bridge prints `deck (ai)` and
`ai profile` among its first lines, and says `(a mirror: no --ai-deck)` when that
is what it is doing.

**`config.json`'s `match` block holds your defaults:**

```json
"match": {
  "deck": "decks/pacho-shield.dck",
  "aiDeck": "decks/doom-legion.dck",
  "aiProfile": "Default",
  "games": 3
}
```

`"aiDeck": null` makes a bare run a mirror. **Only `scripts/play.sh` reads this
block** (D106). `./bridge/run.sh mtgtable.MtgTable`, `tools/ten-games.sh` and
`tools/check-all.sh` never do: with no `--ai-deck` the bridge plays a mirror
under `Default`, and the gate passes every deck and profile it means on its own
command lines. Editing the block to try Reckless therefore never changes what the
gate plays.

**What the board shows.** Each seat's rail names its deck, and the AI's rail its
profile — `Deck: Doom Legion (Marvel Super Heroes villains) · AI profile:
Reckless` — read from `hello_ok.match`. The AI's deck reaches the browser as its
**name and card count and nothing else**, never its path or its list (D105): the
name is what a player says across a real table, and the list is hidden
information (hard rule 8). The name is the `.dck` file's own `Name=`, so a deck
named after a card announces that card. A recording made before match setup has
no `match`, and its rails draw no deck line. The arena's seat plates print the
same two facts from the same reader, `seatMatchOf`, on the life row: the deck
name, ellipsised to what the row has left (the whole name in its tooltip), then
the AI's profile — `♥ 20  Doom Legion (Marvel Su…  AI (Reckless)`. They ride
that row rather than lines of their own because a plate is four one-line rows,
so the opponent's plate never grows out of the top band and over the
opponent's duelist (the hardening pass, rebased onto match setup; a long
`--ai-name` is ellipsised the same way).

**A profile is not a difficulty.** Forge has no difficulty setting; each profile
is 121 heuristic values (report 11 §9), and the four differ like this:

| profile | `PLAY_AGGRO` | `CHANCE_TO_ATTACK_INTO_TRADE` | values that differ from `Default` |
|---|---|---|---|
| `Default` | false | 0 | — |
| `Cautious` | false | 0 | 37 |
| `Reckless` | true | 100 | 52 |
| `Experimental` | false | 0 | 33 |

What that changes at the table is situational. The automated seat attacks with
everything, every turn, so it rarely leaves a blocker up, and in same-seed pairs
against it Cautious and Reckless were **not measurably different**. Against a seat
that does leave untapped creatures, the first choice at which the two games
parted was a **trade** in 6 of 10 pairs: Reckless attacked or blocked into it,
and Cautious held back (`docs/evidence/match-setup.md` §P, where
`tools/first-divergence.mjs` reads a pair by its first differing choice). Pick
one to experiment with, not as a dial. What the gate does check is that the
profile you name is the one the in-game AI reads (`tools/ten-games.sh` rows
11–14, one per profile, and `check-all.sh` step 9e), and that no Forge
preferences file changes: the call the bridge used to seat the AI with could
save one (D107).

**The decks.** [`decks/README.md`](decks/README.md) lists every deck, and says
what Doom Legion is and how it plays; D108 is why it is built the way it is. Any
Forge `.dck` works on either seat. Before you trust a new one:

```bash
node tools/check-deck.mjs decks/<new>.dck --scryfall   # every card in the engine? Limited-legal? as printed?
node tools/fetch-art.ts                                # art for every deck in decks/ -> web/public/art.json
```

Until `fetch-art.ts` has run, a new deck's cards draw as generated text frames,
which is a supported state. In the arena the villains stand on the archetype
bodies — only Aerial Doombot, which is in your deck too, has an identity row —
until rows are written for them (PLAN.md, *Match setup*).

### Arena mode — the same game, in 3D

**M7, Tier 1, and all four slices of Tier 2.** The arena is a **second renderer
for the same frame stream**, not a second app: the socket, the reducer and the
frame log are untouched and `#arena` is the whole of the difference. Tier 1
(below) is the table, the cards and the choreography; **Tier 2** (further below)
stands a figure at every creature, lays the lands out as terrain, gives every
spell on the stack a form and lets you watch a creature die; **the camera** has
five views, a spectator mode and a director of its own (*Camera views*, below);
since **slice 3** every card in the deck reads as itself — Wasp small and
winged, Fury in a black coat, the Air Force a swarm, the Helicarrier a carrier
overhead (*Tier 2, slice 3 — every card reads as itself*, below); and since
**slice 4** every humanoid card is a proportioned person in a painted costume,
and each seat has a full duelist figure — a S.H.I.E.L.D. director on your side, a
villain on the opponent's (*Tier 2, slice 4 — people in costumes, and a duelist
at each end*, below). **Since Lane LOOK** (2026-09-28) all of it is drawn in the
**comic look** — ink, flat cel bands, halftone and a contact shadow on a
mid-value stage — and a seat's own figures face the opponent (*The comic look*,
below).

```bash
npm --prefix web run dev:arena                # a recorded game as a cinematic
./scripts/play.sh --arena                     # a LIVE game in the arena
```

**Three ways in, and they are the same page.** `#arena` (what the **V** key
writes, and what `play.sh --arena` appends to the URL it prints), `#/arena`, or
`?view=arena` (what `npm run dev:arena` opens). There is no router and nothing is
persisted: the fragment *is* the state. Any replay URL takes it —
`?replay=games/g3.jsonl#arena` — which is also how you point the cinematic at a
fixture other than the default `g1`, because `vite` takes no positional file
argument.

Press **V** to switch between the board and the arena at any moment — mid-game,
mid-combat, mid-question — without dropping a frame or touching the socket. Cards
are textured planes on a 3D table, the transitions in `state.events` play as
animations, and the S.H.I.E.L.D. deck's own cards have cues of their own
(`web/src/arena/cues/cues.json`): the Helicarrier flies in and hovers for the
rest of the game, Quake's trigger sends a shockwave across the table, Peggy
Carter attacking alone wears a shield.

**Watching is the replay corpus, and it needs no JVM.** `fixtures/games/`
holds eighteen recorded games — the M1 AI-vs-AI duels and the later human-seat
sessions — and every one of them plays as a cinematic with nothing running but
`vite`:

```bash
npm --prefix web run dev                      # then edit the URL:
#   /?replay=games/g1.jsonl#arena             an AI-vs-AI duel, as an episode
#   /?replay=games/g3.jsonl#arena             another seed
#   /?replay=games/morph.jsonl#arena          the probe deck: every card is the
#                                             generated text frame when art.json
#                                             has none for it (fetch-art --deck)
```

The scrubber above the canvas is the board's own: step forward and back, jump,
change speed. Scrubbing **backwards** is a fold from the start of the file, not
an undo stack, and the arena handles it the same way it handles a `resync` or a
new game — it flushes every animation and snaps to the frame's own resting pose,
because a cue is only ever a transient offset on top of it. A replay is read-only
in the arena exactly as it is on the board, and for the same reason and by the
same mechanism: there is no transport to answer with, so `onAct` is `null` and
every button, card and control is inert. That is one prop, not two code paths.

**Keys.** There is **one keymap** for both renderers (`web/src/keys.ts`), so
**`?` or `H`** lists all twenty-seven rows in the arena as well — the same table
the handler reads. The ones that are the arena's own:

| key | what it does |
|---|---|
| **V** | switch renderer: 2D board ↔ 3D arena, the same game and the same socket |
| **K** | **skip every animation on screen.** It is `apply(t = 1)` then `end()`, so the table lands on exactly what the engine described. Nothing can be missed by pressing it — and the camera goes home with it |
| **1 2 3 4 5** | a camera view: table, your shoulder, the opponent's shoulder, side-on, low. Pressing the view you are on drops your own drag of it |
| **6** or **0** | the auto director (spectating only) |
| **O** | spectator mode on / off — on by itself in a replay and when your game ends, never while your seat is live |
| **W** | open **the workshop** (*The workshop*, below) — one card on a pedestal. `V` there comes back to the arena; a replay resumes at its frame. On the 2D board `W` still spends floating white mana, and otherwise says to press `V` first |
| **M** | **sound on / off** — muted until you turn it on; the choice is kept in this browser, and the cue strip's **sound** checkbox is the same switch (*Sound*, below). On the 2D board it says to press `V` |
| **I** | **inspect the card under the pointer** (else the last one you clicked): the workshop opens on it in its **inspect** view — its figure in its signature pose in front of its card's painting, dressed in your own model where the personal tier has one, in the look the table is in. The **⌕ inspect** chip beside the art credit does the same by click. The workshop's **▣ arena** link comes back to the same frame. Face up and with a figure only: a face-down or hidden card is never inspected, and the chip and the key say so without naming it (D241) |
| **N** | **the caption** on / off — the story's moment for the frame on screen, in a strip over the table's right edge (*The caption*, below). **On by default in a replay and while spectating, off at a live seat**; the choice is kept per context in this browser. In the arena `N` is always the caption's (the arena has no auto-yield control); on a live 2D board it is still Forge's always-no, and on a replay board it says to press `V` (D256) |

On the 2D board the camera keys do nothing and say so ("the board has no camera;
press V"). They never answer the engine, so they work behind an open question
too, but a focused text field keeps its digits.

Everything else is unchanged and works in 3D: **SPACE** presses the button the
engine focused, **ESC** is Cancel (or closes an overlay, or answers an open
question with `null`), **CTRL+Q** concedes with a confirm, **Z** zooms, **P**
passes priority, **E / T / B** pass to the end of the turn / your next turn /
just before it, **Y / N** always-yes and always-no, **CTRL+Z** undoes a mana
ability, **CTRL+A** is alpha strike, and **W U B R G C** spend floating mana.

**Cue controls.** A small strip in the arena's own DOM layer carries **⏸ / ▶**, **step batch**
(play the earliest queued batch to its end), **skip cue** (snap the one that is
playing and pull the rest forward), **skip all** (the **K** key), and a
**speed** selector — 0.5×, 1×, 2×, 4×. The animation clock is separate from the
replay clock, so pausing cues does not pause the frame log. The status at the
strip's end (*idle*, or *12 steps · 4155 ms*) is a fixed width, so the strip and
the camera switcher beside it keep one row while cues play; below 1,400 px wide
the word *speed* folds into the selector's tooltip and the status shows the
seconds of film left (*4.2 s*), which keeps that row at 1,280 px (D265). Cues never delay a
question: while the engine is waiting on you, long cues are compressed and the
queue says so. Beside **bloom** are the comic motion lane's two switches, **comic
FX** and **on twos** (*The comic motion lane*, below), then **sound**, and after
them **caption** (the **N** key).

**The engine's prompt**, at the top left beside its buttons, is at most two lines
(D267), so the chrome never grows over the far side of the table. It takes the
bar's width before it wraps, so almost every prompt is whole; one that is still
longer — a targeting trigger that quotes its card's whole ability, at 1,280 px —
ends in *…*: point at it and it opens in place (it is also its own tooltip).
Beside it, a key that did nothing says why (press **I** with no card under the
pointer, and the hint says so), and the engine's last notice (*Your turn*) sits
at the end; neither ever pushes the bar onto a second line — each is at most two
lines, cut if it must be and whole in its tooltip. The art credit under the cue
strip keeps its closing words (*© Wizards of the Coast · Unofficial Fan
Content*) whole; when the row is short, the list of artists gives way, and the
**⌕ inspect** chip beside it shrinks to its key first.

**Sound** (D250–D252). The arena is **silent until you turn sound on** — tick
**sound** in the cue strip or press **M** (either is the click a browser needs
before a page may make a sound); the choice is kept in this browser, and with it
on a later visit the first click or key press starts the sound again. Each sound
is part of a cue, so it plays with the film and stops with it: **skip all** (K),
**skip cue**, a pause, a scrub, a `resync` and a new game cut every sound that is
ringing, and nothing plays for a cue that was skipped. The default sounds are a
card arriving, an attack, a hit, a death, a spell resolving and the outcome (a
win or a loss from your seat); four S.H.I.E.L.D. cards have their own — Nick
Fury's attack is his radio call, Helicarrier Strike's beam a laser, Quake's
Seismic Takedown a rumble, Wasp's trigger a sting. **A face-down or hidden card
makes only its event's default sound**, never its own, because a card's own
sound would say which card it is. At most eight sounds ring at once; a ninth is
dropped. Under `prefers-reduced-motion` the arena stays silent unless you turned
sound on yourself — then you hear it. The eleven clips are this repository's own,
synthesised by `node tools/build-sounds.mjs` (Ogg Opus, 39.5 kB in all); the
workshop's **Cues** panel has a **sound** checkbox of its own for the pedestal.
A cue row in `cues.json` names a clip with `"sound"` (one of `enter`, `lunge`,
`hit`, `death`, `resolve`, `victory`, `defeat`, `comms`, `laser`, `rumble`,
`sting`, or `none`), moves it with `"soundAt"` (0–1 of the cue) and scales it with
`"soundGain"` (0–1.5).

**The caption** (D255, D256). While you watch — a replay, or two AIs playing
through `./scripts/spectate.sh` — a strip over the table's right edge, between
the two seat plates, says what just happened in words: **the story's moments for
the frame on screen** (`#story`'s sentences, from the one narrator,
`web/src/story/narrate.ts`), the one or two before them dimmed above, each turn's
lines under its own marker (*Turn 14 · AI-Seat1 (AI)*, your turns in blue and the
other seat's in orange). It hides on a frame nothing happened in (a phase moving
on), and a busy combat shows its first three lines and *+N more*. Card names are
the narrator's — an unseen card is *"a card"*, a face-down one *"a face-down
card"* — and a clamped line's whole sentence is its tooltip. At a **live seat** it
is off by default (you are playing, not reading); **N** or the checkbox turns it
on, and it tells your game as the frames arrive, the same sentences `#story` and
`tools/narrate.mjs` would print for them. The story's **☰ story** link and its
**▣ arena** link keep the same frame both ways, so the strip and the story's
highlighted moment are one moment. Pictures and the measurements of where it
sits: [`docs/evidence/arena-story-caption.md`](docs/evidence/arena-story-caption.md).

**Reduced motion.** With `prefers-reduced-motion: reduce` the arena drops every
camera move and every shake outright (a camera view you pick is a cut), and plays
what is left at **30% of its duration** — not zero. That distinction is deliberate and was a bug once: several
cues are the only channel for a *fact* (the damage number, the counter pip, the
life delta), so deleting them removes information rather than motion.

**The seat is the same seat.** A click on a card is the same `act: clickCard` the
board sends, the prompt and the two buttons are the engine's own words rendered
verbatim, and every one of M5's twelve question modals is the same component,
mounted over the canvas. Each seat's **life total, poison, hand / library /
graveyard / exile counts and floating mana** sit on a plate at its own edge of
the frame, drawn with the *same components* the 2D rail uses — so the two
renderers cannot disagree about a number, and pressing **V** mid-game shows the
same totals on the board. Since match setup the plate also names the seat's
deck, and the AI's plate its profile, from the rail's own reader of
`hello_ok.match`.

Two escape hatches, because WebGL can fail for reasons a player cannot see:
`?arena=off` renders the 2D board even at `#arena` and says why, and `?dpr=0.75`
pins the render resolution — which also switches the automatic ladder below off,
because a pin is the player's answer and it should not be argued with.

**The resolution looks after itself, and this is what it is worth.** The scene is
**fill-rate** bound — 40 draw calls and 80 triangles in a production build, so
there is nothing to win by drawing fewer things and everything to win by drawing
fewer pixels. So the arena watches its own frame intervals and gives back a rung
of resolution when too many of them arrive late, which is the one number that
matters here. Under a software rasteriser (SwiftShader, an explicit lower bound
and **not** the machine you will run this on), at 1920×993 on a device ratio of
1:

| | p50 | p95 | max | verdict |
|---|---:|---:|---:|---|
| pinned `?dpr=1` (what shipped before the ladder worked) | 19.4–20.3 ms | **22.4–23.6 ms** | 37–39 ms | fails the ≤ 20 ms gate |
| **default, no pin** — the ladder settles on render dpr 0.75 | 8.6–9.0 ms | **13.5–14.2 ms** | 29–31 ms | passes |
| pinned `?dpr=0.75` | 12.0–12.2 ms | 14.0–14.2 ms | 30–32 ms | passes |

The **first** render of each card's Scryfall texture costs an upload — 1–3 frames
over 50 ms in the half second after a scrub, and none after it, at *every*
resolution including a pinned one — which is a hitch when a card first appears
and not a frame rate. `tools/arena-bench.mjs` is how all of that was measured,
`--settle` is the flag that separates the cold table from the steady state, and
`docs/evidence/m7-arena.md` §5 and §W.3 have the runs — including the honest
caveat that a software rasteriser is a lower bound and nobody has measured this
on the machine you are reading it on.

#### Camera views — five views, a spectator mode and a director

**M7 Tier 2, slice 2** (evidence in
[`docs/evidence/m7-tier2-slice2.md`](docs/evidence/m7-tier2-slice2.md);
decisions **D69–D71** and **D74**). The camera has five named views, picked with
**1**–**5** or from the switcher that sits in the cue strip's row (below 1,840 px
wide it shows only the keys):

| key | view | what you see | at your seat |
|---|---|---|---|
| **1** | Table | the whole table from above — both battlefields, both hands, the stack. Tier 1's rest pose | yes |
| **2** | Shoulder | over your shoulder: your hand large in the foreground, your land and creature ranks above it, the opponent across the table | yes |
| **3** | Opp. shoulder | the same shot from their side — their cards in the foreground, their hand as card backs | spectating only |
| **4** | Side-on | from the graveyard end at figure height: the two battle lines face each other across the frame | spectating only |
| **5** | Low | a three-quarter angle from your corner, looking up the table at the figures | yes |

**Whichever view you choose is the camera's home**, so a cue's swoop (an attack,
a big hit) leaves from it and comes back to it. Changing view is a short glide —
0.65 s at a seat, 1.4 s when spectating — and a hard cut under
`prefers-reduced-motion`. Drag to orbit as before: each view remembers where you
dragged it, and pressing the key of the view you are already on puts it back.
Your choice is remembered in this browser; a view you cannot use at a seat shows
the table there and comes back in the next replay.

**Why two of the five are for spectating.** At a live seat the camera must keep
your hand on screen *and* must not let the hand cover your own land and creature
rows — the view you choose stays up the whole game, so that is a property of the
view, not of a move. From the opponent's shoulder your hand is at the top of the
frame facing away, and side-on it is edge-on at the frame's edge, so those two are
greyed while you are playing and say why. (A strip of hand cards drawn over the
canvas would have made them usable, and was rejected: it would be a second card
renderer and a second place to click the same card.)

**Spectator mode** (**O**) widens the orbit to the whole way round, slows the
camera's own moves and lets every view in. It is **on by itself in a replay and
the moment your live game ends**, and never on while your seat is live.

**The director** (**6** or **0**, spectating only) cuts between the views on the
game's own events: combat side-on, a spell from its caster's shoulder, a strike
from the target's side, a new turn and the outcome from the table. It holds every
shot at least 2.4 s, will not go back to a view it left within 4.8 s (combat and
the outcome may), and drops a beat it has held for 1.6 s. It reads player ids and
public controllers, never a card name, and it never fights you: for 5 s after you
stop dragging, nothing cuts. While it directs, the switcher outlines **6** and marks
the view it is on with a dashed border (the **6** button's tooltip names it), so
the row keeps its width whatever the shot.

#### Spectate — watch two AIs play your deck (`./scripts/spectate.sh`)

**Spectating** (evidence in [`docs/evidence/spectate.md`](docs/evidence/spectate.md);
protocol amendment **M47**; decisions **D118–D122**). One command seats two Forge
AIs — your deck against another, each on a Forge AI profile of its own — and opens
the arena on the game **while it is being played**, so you can watch how an AI
plays your cards against someone else's, with every cue animating it:

```bash
./scripts/spectate.sh                                   # your deck vs config.json's match.aiDeck, random seed
./scripts/spectate.sh --seed 7                          # a game you can watch again
./scripts/spectate.sh --ai-deck decks/morph-probe.dck --ai-profile Reckless
./scripts/spectate.sh --profile Cautious --ai-profile Experimental   # both AIs' profiles
./scripts/spectate.sh --seed 7 --seat 1                 # the SAME game from the other chair
./scripts/spectate.sh --no-follow                       # record it first (~7 s), then replay it
./scripts/spectate.sh --pace 1000                       # slower: 1 s after every frame that does something
./scripts/spectate.sh --2d --no-open                    # the 2D board; print the URL, no browser
./scripts/spectate.sh --story                           # the STORY page instead: the game told as it is played
```

It checks the jar, builds the bridge, starts the recorder in the background and
opens `http://127.0.0.1:5173/?replay=spectate/<name>.jsonl&follow=1#arena`. The
page says *waiting for the recorder* for the ten seconds the engine takes to boot,
then plays each frame 0.6 s after the recorder writes it, keeping the recorder's
own rhythm (a page that opens late, or is reloaded mid-game, jumps to the live edge;
the scrubber still has everything before it). The
decision strip's place says what you are watching —
`WATCHING Pacho SHIELD (Default) · seen from here vs Doom Legion (Reckless) ·
● following` — and the seat plates carry each deck and each AI's profile. When the
game ends the page stops following, says *recording finished* (or *recording
lost*, with no dot, if the file is re-recorded under the same name while you
watch), and the replay bar
above the canvas works as on any replay: scrub back to a turn, step it, slow it
down. Ctrl-C in the terminal stops the recorder and the server.

**Why it is paced.** Two AIs finish a whole game in about three seconds of engine
time, so the recorder is slowed down on purpose: after every frame in which
something happened it waits `--pace` milliseconds (600 by default), and a quarter
of that after a frame that only moved the phase strip, so a game takes about two
minutes. The pace changes nothing about the game — a paced and an unpaced recording
of one seed are the same frames. In follow mode the replay bar's speed scales the
recorder's pace; it only matters after you pause, because the page cannot play a
frame before the engine has written it.

**Whose eyes.** A recording is one seat's view, exactly as that seat sees the game:
from `--seat 0` (the default) your deck's hand is face up and the other hand is
card backs, as at a real table. `--seat 1` records from the other chair. **The same
seed is the same game from either side** (measured with `tools/same-game.mjs`,
which compares everything both chairs can see): record both and switch between the
two tabs to see what each AI was holding. Nothing shows both hands at once, on
purpose (hard rule 8).

**Watching well.** Spectator mode is on by itself (nobody sits at this table).
**6** (or **0**) hands the camera to the auto director, which cuts to the combat,
the caster, the target; **1**–**5** are the fixed views; **K** skips the animation
on screen; **V** is the 2D board and back.

**Reading along — `--story`.** `./scripts/spectate.sh --story` opens
`/?replay=spectate/<name>.jsonl&follow=1#story` instead of the arena: the same
game, followed the same way (**● following** in the bar, 0.6 s behind the
recorder), told in words as it is played — *"AI-Seat1 casts Hour of Defeat
targeting Ant-Man, Reformed Rogue. AI-Seat0's Ant-Man, Reformed Rogue dies."* —
one section per turn, the moment on screen highlighted, the per-seat totals at the
head, and the card each moment names beside it. While the game is still being
recorded the story shows only what the page has played, so the summary is the
game so far and never names the winner early (**S** shows what has arrived
beyond it, dimmed). **▣ arena** (or **V**) switches to the 3D table at the same
frame and the replay bar's **☰ story** comes back; if you had paused, you come
back where you paused, and if you were watching live, you rejoin the live edge
(D128). Any replay has the same link — `?replay=games/g1.jsonl#story` — and
*Reading a game back* below is the whole of it.

| flag | what | default |
|---|---|---|
| `--deck <path>` | seat 0's deck | `config.json` `match.deck` |
| `--ai-deck <path>` (`--deck2`) | seat 1's deck; `--mirror` plays seat 0's | `config.json` `match.aiDeck` (`decks/doom-legion.dck`) |
| `--profile <name>` | seat 0's Forge AI profile | `Default` |
| `--ai-profile <name>` (`--profile2`) | seat 1's Forge AI profile | `config.json` `match.aiProfile` |
| `--seed <n>` | the shuffle | random, printed |
| `--seat 0\|1` | whose view | `0` |
| `--pace <ms>` | the recorder's pace in follow mode | `600` (`0` = engine speed) |
| `--no-follow` | record first, then replay | follow |
| `--2d` / `--story` | open the 2D board / the story page (`#story`) instead of the arena | the arena |
| `--no-open` / `--no-serve` | no browser / no dev server (print the URL for one you run) | opened |
| `--web-port <n>`, `--name <name>`, `--no-build` | vite's port, the file's name, skip the build | `config.json` `webPort` |

The recordings go to `var/spectate/` (gitignored) beside the recorder's own output
(`<name>.log`), each checked by `tools/check-redaction.mjs` as soon as it is
finished. They are served **only by the dev server**, at `/spectate/<name>.jsonl`,
so any of them replays later from `npm --prefix web run dev` with
`/?replay=spectate/<name>.jsonl#arena`. The profiles are Forge's four `.ai` files
(`Default`, `Cautious`, `Reckless`, `Experimental`) — sets of heuristics, not a
difficulty (**D107**). The recorder underneath is `mtgtable.RecordMatch`, which
also takes `--profile`, `--ai-profile`, `--match` and `--pace` directly.

#### Tier 2 — the creatures, the land and the spells, manifested

**M7 Tier 2, slices 1 and 2** (evenings T0–T8 of
[`docs/research/13-arena-tier2-plan.md`](docs/research/13-arena-tier2-plan.md);
evidence in [`docs/evidence/m7-tier2.md`](docs/evidence/m7-tier2.md) and
[`docs/evidence/m7-tier2-slice2.md`](docs/evidence/m7-tier2-slice2.md)) put
things *on* the table. It is still the same renderer over the same frame stream,
and it still decides nothing — every figure, tile and form below is a pure
function of the frame on screen, and only the transitions between frames are
animated (**D56**):

- **A figure at every creature.** Each creature on the battlefield gets a small
  low-poly figure standing at the front edge of its card — facing outward, yours
  toward you and the opponent's away from you, until an attack turns one to face
  what it attacks (**D81**, **D82**; which way they should rest is PLAN.md's
  question 13) —
  since slice 4 a proportioned **person** for every humanoid card — a man or a
  woman, painted in the card's costume (**D95**, **D97**; slices 1–3 stood them
  in three small chibi bodies, which are kept as a fallback) — a flying robot for
  the Doombot and the Robot token, a bee-like insect for the two ants — drawn as a
  **hologram**: unlit, rimmed in the card's colour identity, with a
  bright edge (**D53**). The card stays exactly where it was and is still the thing
  you read and click; a figure carries no name and cannot take a click. A tapped
  creature kneels rather than lying down with its card, an attacker holds its
  lean for the whole of combat, a summoning-sick one is translucent, and a
  blocker stands where `state.combat` says it blocks. A creature with no figure —
  a face-down one, a probe-deck beast — stands on a
  glowing **disc** sized by its power and toughness, and every figure has one at
  its feet. No two figures overlap, and when a battlefield row wraps onto a
  second line, the back row's figures stand on their own cards (**D65**, **D66**).
- **A creature that dies is seen dying** (**D64**). It stays where it stood — or
  steps one pace forward out of the row that closes up behind it — takes the
  blow, and falls, fading as its death animation ends. Nothing is remembered but
  its last pose: skip, scrub or start a new game and it is gone with the
  animation.
- **Animations are the cues you already have.** The attack lunge, the damage hit,
  a summon, a counter's grow are played by the same cues as Tier 1's, scrubbed
  frame-exactly from the cue clock, so **pause, speed, step, skip and reduced
  motion work on the figures too** (**D57**). Figures breathe only while something
  else is animating, so an idle table still renders nothing (**D58**).
- **Auras and equipment on the figure.** Quantum Reduction shrinks its host to
  0.45× and keeps it shrunk through any skip or scrub; since slice 3 Super Suit
  is an armour shell round its host, the Spy Kit three gadget glints at its hands
  and Robotics Mastery circuit traces over its body (**D80**); any other aura or
  equipment draws a halo at the figure's feet in its own colour (metallic for an
  equipment).
- **Lands are terrain.** Every land sits on a rounded slab under its card —
  plateau for Plains, animated water for Islands, two-tone for the Thriving
  lands, a tinted slab for anything else — and a tapped land's slab dims
  (**D59**).
- **Mana goes to the caster.** Tapping a land sends a mote of light from its
  slab to its controller's casting spot above their land row (**D60**). It never
  claims which land paid for which spell, because the engine never says.
- **The stack, manifested.** A spell on the stack is a form at its caster's
  casting spot — a dart for an instant, a sigil for a sorcery, a ring for an
  enchantment, a shard for an artifact, and **a translucent copy of the creature
  itself** for a creature spell, which becomes the real figure when it resolves.
  A tether runs to whatever it targets, and on resolution the form strikes along
  it (**D63**). With a spell on the stack during combat, the battlefield's
  figures freeze and grey out — the spell's own form does not.
- **The duelists** — since slice 4 a full figure per seat (**D99**), one beside
  your hand and one at the table's right beside the opponent's creatures, facing
  each other across the table: they raise a hand when their seat casts, flinch red
  when it takes damage, and at the end the winner raises an arm and the loser
  kneels (*Tier 2, slice 4*, below). Slice 1 drew two flat silhouette busts
  (**D62**); a checkout without `figures.glb` still does, where the duelists
  stand.
- **Bloom** — a soft glow on the holographic rims and the effects — is **on by
  default**, because it costs about 0.7 ms a frame on this machine's GeForce GTX
  1080 (**D61**). Untick it in the cue strip, or start with `?bloom=0`. On a
  machine too slow for it the arena turns it off by itself once the resolution
  ladder is at its floor, and says so in the console.

**What it cost at slice 1**, at the most crowded table in the corpus that has models on it
(`g1.jsonl` from transport index 316: eleven figures, seventeen land slabs, two
busts), measured with `tools/arena-bench.mjs --index 316` (slice 4's counts, with
the bodies and both duelists, are in its section below; the bench itself was not
re-run after slice 1):

| | draw calls | p95 frame | verdict |
|---|---:|---:|---|
| GeForce GTX 1080 (`--gpu gl`), bloom off / on | 64–66 / — | **0.4 ms / 1.1 ms** | passes |
| SwiftShader (the lower bound), bloom off, governor at its 0.6 floor | 64–66 | **16.2–17.2 ms** | passes the ≤ 20 ms gate |
| SwiftShader, bloom on | — | 82.3 ms | fails until the governor switches bloom off |

Two caveats that are not rounded off: the GTX 1080 numbers are headless Chromium
reaching the GPU through ANGLE, not a desktop browser window, and nobody has
measured an integrated GPU; and with bloom on the renderer only counts the
composer's final pass, so draw calls are read with it off. The full tables, the
cold-start numbers and the live game are in the evidence.

**Where the figures come from.** Five free packs, all **CC0** (public domain),
and nothing else: Quaternius's *Universal Base Characters* [Standard] (since
slice 4 the man and the woman every humanoid card stands in, **D95**), Kenney's
*Mini Characters* 1.0 (slices 1–3's agent, hero and scientist — three chibi
bodies of one kit on one rig, kept as the fallback), Quaternius's *Robot Enemy
Flying* and *Bee Enemy* (both via Poly Pizza), and — for **animation only** —
Quaternius's *Universal Animation Library* [Standard]. The Universal Base
Characters are on the animation library's own rig, so **every** clip the man and
the woman play is the library's, retargeted by the build; the chibis keep
Kenney's own clips with the library's recoil (`Hit_Chest`) and death (`Death01`)
retargeted in, because the library's idle, punch, landing and crouch face-plant
on a head-heavy chibi (**D68**). **No model or clip is from Mixamo and none was
generated from card art** (**D54**).
`tools/assets-manifest.json` is the written provenance of each — page and
download URL, byte count, sha256, the download date and the licence badge
**verbatim as it read that day** — and [`NOTICE`](NOTICE) §7 is the attribution.
`tools/build-figures.mjs` turns the five downloads into **one** file,
`web/public/models/figures.glb` (**373,236 bytes** since slice 4: the man and the
woman at 1,400 triangles each, the three chibis, the drone and the bee — 8,573
triangles, 63 clips, no textures, meshopt-compressed; 143,920 bytes before), and writes
`web/src/arena/figures/models.json` from what it measured, including the built
file's own byte count and sha256; that JSON is generated, so do not edit it by
hand. The arena loads the library from `web/public/models/` and nowhere else — no
CDN, no Draco decoder from gstatic.

**Rebuilding `figures.glb`**, e.g. after changing a clip mapping in
`tools/assets-manifest.json`:

```bash
npm --prefix web install                          # @gltf-transform/cli is a web/ dev dependency
mkdir -p var/assets/figures
#   download the five files named in tools/assets-manifest.json ("downloadUrl";
#   the Universal Animation Library's and the Universal Base Characters' pages are
#   name-your-own-price itch.io pages, and "_download" says which button -- the
#   free [Standard] zip, never the paid [Source] one) into var/assets/figures/,
#   exactly as downloaded -- do NOT unzip anything
node tools/build-figures.mjs --verify-only        # bytes + sha256 of every source
node tools/build-figures.mjs --src var/assets/figures
#   refuses a source whose bytes or sha256 differ (and prints its URL), reads the
#   members it needs out of the verified zips, prints every step's size, asserts
#   one primitive per model, the humanoid rigs (the bodies' joint list against the
#   animation library's), no texture, and the manifest's budget (450 KiB and
#   30,000 triangles, D161), and
#   rewrites web/src/arena/figures/models.json;
#   --no-manifest leaves models.json alone; --clip-source experiment builds the
#   all-retargeted comparison
```

Two builds from the same sources are byte-identical, and `web/test/figures.test.ts`
fails when the `figures.glb` on disk is not the file `models.json` records.
**Without `figures.glb` at all** — a checkout that has lost it; it is committed today — the
arena still plays everything: each creature draws its disc, the console says `no
model library … every creature draws its disc` once, and the hash check is
skipped. Whether the built file should stay committed is an open decision
(PLAN.md, *Only the user can decide*, question 11).

**Iterating on a cue.** There is no `?cue=<id>` loop route — report 09 §10.7 asks
for one and it is not built — and no `?cues=<url>` override either, because §2.1
rule 1 says in as many words that the arena *never calls `fetch`*, and a cue file
pulled over the network is a fetch. What exists instead is a **dev-only handle**,
and it is more general than either: in `npm run dev`, `window.__mtgArena` carries
the live `queue`, `stage`, `pool`, `rigs`, `director`, `gl`, `scene` and
`camera` — and, since Tier 2, `figures` (the poses of the frame on screen),
`figureRigs`, `discs`, `tiles` / `tileField`, `motes` / `forms` /
`castingField`, `overlays`, `frozen`, `busts` / `bustField`, since slice 4
`duelists` (each seat's pose: stand point, facing, look, stance) and
`duelistData` (the validated `duelists.json`), and the current `state`. (A production build carries **none** of that; `?glinfo=1` adds one
function, `info()`, returning `gl.info`'s six counters, which is what
`tools/arena-bench.mjs` reads and all it reads.) The cue clock is virtual and
injected, so a cue can be frozen at any point of its arc:

```js
const q = window.__mtgArena.queue
q.setPaused(true)          // stop the animation clock (the frame log keeps playing)
q.advance(220)             // …and step it 220 ms by hand: a tap, a third of the way in
q.seen                     // Map of event kind -> how many cues it has produced
window.__mtgArena.stage.offsets      // what is displaced from layout(state) right now
window.__mtgArena.director.stats     // camera moves taken / dropped / retired
window.__mtgArena.stage.clips        // Tier 2: the clip each figure is playing, its t and weight
window.__mtgArena.figures            // Tier 2: who stands where, which model, which stance, which rung
window.__mtgArena.tileField.counts() // Tier 2: land slabs drawn, per kind
window.__mtgArena.discs.counts()     // slice 2: discs, back-row discs, and dying bodies drawn;
                                     // slice 3: prop instances and the prop kinds drawn
window.__mtgArena.bustField.counts() // slice 4: { busts, duelists } — a seat draws one or the other
window.__mtgArena.duelists           // slice 4: each seat's stance — ready, won or lost
```

`advance()` moves the clock whether or not the queue is paused, which is also the
only way to photograph the middle of a cue in an environment whose animation
frames do not fire. It is `import.meta.env.DEV`-only and is dropped from the
production bundle entirely.

#### Tier 2, slice 3 — every card reads as itself

**M7 Tier 2, slice 3** (evenings T9–T12 of report 13, plus per-card identity;
evidence in [`docs/evidence/m7-tier2-slice3.md`](docs/evidence/m7-tier2-slice3.md);
decisions **D75–D89**). After slice 2 the verdict was *"everything still looks very
generic"* — and it was: every card was one of five bodies in a colour. Slice 3
answers it without a model per card. **What makes a card read as itself is data**
— its size, whether it flies, its colour, what it carries or wears, whether it is
one body or several — and every piece of that data is drawn from a small kit of
shared props that any card may name. *(The table is as slice 3 drew them; since
slice 4 each humanoid below is a proportioned person in its costume, and the next
section's table says what each one wears.)*

| card | what you see at the table |
|---|---|
| Wasp, Shrinking Savior | half a hero's height, gold, hovering, four pale-blue wings |
| Ant-Man, Reformed Rogue | red, in a glass helmet with antennae; attacking alone he shrinks to a bright speck |
| Ant-Man's Air Force | a ring of five small bees, not one insect |
| Giant-Sized Flying Ant | nearly twice any other insect's height, flying side-on, a rider on its back |
| Aerial Doombot | Doom green, a red laser eye and a red band round its head, twin thrusters with a lit exhaust |
| Nick Fury, Spymaster | a slate figure in a long black coat, a black eyepatch with a strap |
| Agent Phil Coulson | a navy suit, a shirt and tie, a gold badge on his chest and a bigger one on his back |
| Quake, Agent of S.H.I.E.L.D. | teal, both fists glowing |
| Peggy Carter, Secret Agent | a red hat and a round red-white-and-blue shield |
| Agent 13, Sharon Carter | indigo, a silver pistol at her hip with a lit muzzle |
| Agents of S.H.I.E.L.D. | a squad of three in steel blue, side by side |
| S.H.I.E.L.D. Helicarrier | an actual carrier silhouette flying over its card, crewed or not |
| Bold Biochemist / A.I.M. Scientists | at a lab bench; the Biochemist in a white lab coat, A.I.M. in yellow under a bucket hood |
| Super Suit · Spy Kit · Robotics Mastery | worn by their host: an armour shell, gadget glints, circuit traces |

The per-card beats moved **onto the body** too: Agent 13's muzzle flashes come from
her pistol's tip, the Doombot's laser from its eye, Peggy's shield bubble and
Ant-Man's speck ride down the lane with them, and an attacker turns to face what it
attacks while it does. **All of it is a pose** — a function of the frame on screen,
so it survives skip, scrub and a `resync` — and **a face-down or hidden creature
gets none of it**: it stays the anonymous disc, with no props, no hover and no
swarm, whatever its name would have been.

Two things to know when you watch. **Your own figures face you**, so you see their
fronts (Coulson's badge, Fury's patch, the Doombot's eye) and the opponent's backs
(Fury's coat, the Doombot's thrusters, Coulson's back emblem); every card is built
to read from both sides, and whether figures should rest facing the other seat
instead is PLAN.md's question 13 — one line to change, and your call after a game.
And the small looks — Robotics Mastery's traces, Agent 13's muzzle — are small from
the table view; the shoulder views (**2**, **5**) show them properly.

**It costs** one draw call per prop KIND on the table, never one per figure: at
`g1.jsonl`@355, bloom off, the table is 78 draw calls and 27,906 triangles against
the Tier 2 budget of 90 and 30,000, and an idle table still renders nothing. No
asset was added — every prop is built in code, and the two that are not primitives
(the ant's rider, the Agents' followers) are the existing CC0 bodies frozen in a
pose — so `figures.glb`, the asset manifest and NOTICE's figure list are unchanged.

**Giving a card its identity — a data edit, not code.** The identity table is
`web/src/arena/figures/traits.json`, next to `figures.json` (which says only which
BODY a card stands in) and `cues/cues.json` (which says how its events play):

1. **Add a row under `cards`**, keyed by the card's name **exactly as the wire
   spells it** (a token is `"Soldier Token"`, not `"Soldier"`). Every key is
   optional and checked by `figures/validate.ts`'s `validateTraits`:

   | key | what it does | legal values |
   |---|---|---|
   | `scale` | size against the body's normal height | 0.2–4 (the width clamp still fits it to its slot) |
   | `hover` | world units above its stand point | 0–2 |
   | `idle` | `hover` bobs gently while anything is animating; `static` stands still | `hover`, `static` |
   | `tint` / `accent` | the body's colour / the props' colour | `#rrggbb` |
   | `shade` | darker or brighter than its tint (villains are 0.78) | 0.3–1.5 |
   | `turn` + `turnedRatio` | fly side-on (degrees), and the turned width over height, which the test measures | −180–180; 0.1–4 |
   | `props` | what it carries or wears — see the kit below | a list, no repeats |
   | `swarm` + `formation` | several bodies: `ring` (a turning ring of small members) or `squad` (followers in a wedge) | 0–8, whole |
   | `silhouette` | draw a flying `carrier` over the card instead of a body | `carrier` or `null` |
   | `shrink` | the size Ant-Man's attack cue shrinks him to (the cue reads it; the pose never does) | 0.05–1 |
   | `costume` | **slice 4**: what the body WEARS — a colour per slot (`skin`, `hair`, `top`, `shirt`, `legs`, `shoes`, `gloves`, `belt`), merged slot by slot down the ladder; slots nobody names are filled from the top (see *Tier 2, slice 4*) | `#rrggbb`, or `tint` for the figure's own tint |
   | `body` | **slice 4**: `human` (the proportioned body, the default) or `chibi` (slices 1–3's Kenney body, kept as a fallback — no row uses it) | `human`, `chibi` |

   Keys starting with `_` are notes; write one saying where the look comes from.
2. **The kit** is `figures/props.ts`'s closed list: `wings`, `helmet`, `hood`,
   `jetpack`, `exhaust`, `laserEye`, `visor`, `pistol`, `muzzle`, `coat`,
   `eyepatch`, `badge`, `tie`, `gauntlets`, `shield`, `hat`, `rider`, `labBench`
   — and since Lane BODIES `coatTails`, `cape` and `sidearm`, and since villain
   identity `mask` (D221).
   **`props` replaces, it does not add**: a row that names `props` lists every one
   it wants, including any its subtype rung would have given it. The glowing ones
   (`exhaust`, `laserEye`, `gauntlets`, `badge`, `muzzle`) burn softly at rest and
   flare whenever one of the card's cues plays an attack, a summon, a channel or a
   grow on it — a cue drives them by asking for a clip or a glow, and there is no
   second switch.
3. **For every card of a type**, add a `subtype:<word>` rung under `archetypes`
   instead — only the words the figure ladder knows: `robot`, `insect`, `vehicle`,
   `scientist`, `spy`, `hero`, `soldier`, `villain`, `human`. The ladder is
   default → every matching rung, least specific first → the card's own row; the
   most specific value wins.
4. **Run `npm --prefix web test`.** `traits.test.ts` fails on any validation error
   (a bad row is also dropped at runtime, so the game never breaks on one), prints
   the census — which card got which rungs and props over every recorded game —
   and, for a card in `decks/pacho-shield.dck` or `decks/doom-legion.dck` (and the
   Doom Legion's two tokens), rasterises its props through the table camera from
   **both** seats: each must show at least 48 pixels.
5. **Look at it**: `npm --prefix web run dev:arena`, `?replay=games/<file>.jsonl#arena`,
   scrubbed to a frame where the card is on the battlefield, at 1× from views **1**
   and **4**, on your side and the opponent's.

**A new prop kind is code**, and it is shared: a name in `PROP_KINDS` and a
`PROP_KIT` entry with its anchors per body in `figures/props.ts`, a `LOOKS` entry
and a `buildKindGeometry` case (at most 1,200 triangles, asserted) in
`scene/props.ts` — after which any row may name it. What is never allowed is a
model used by exactly one card: that is Tier 3 (*per-card models*), which is not
started, and a model that looks like a Marvel character would stay on your own
machine and out of this repository (PLAN.md, *Tier 3 — a note, not a plan*).

#### Tier 2, slice 4 — people in costumes, and a duelist at each end

**M7 Tier 2, slice 4** (report 13's **T13**, plus the bodies and the costumes;
evidence in [`docs/evidence/m7-tier2-slice4.md`](docs/evidence/m7-tier2-slice4.md);
decisions **D95–D101**). After slice 3 the verdict was *"the game looks generally
improved. The avatars are still pretty generic."* Two things were generic. The
creature figures were small chibi toys whose only identity was one colour and
what they carried. The two duelists at the table's ends were blank silhouettes.
Slice 4 changed both, and it is still a hologram, still one shader, and still a
pure function of the frame on screen.

**Every humanoid card is a person in a costume.** There are two proportioned
bodies, a man and a woman, from Quaternius's CC0 *Universal Base Characters*.
They are on the same rig as the animation library, so every animation is the
library's own: an idle, a punch, a landing, a recoil, a fall, a spell, a pistol
aimed two-handed, a radio call, and a kneel when tapped. The head is drawn a
little large (×1.3), the heroic-miniature way, so a hat or a helmet has somewhere
to sit. Each body is painted in eight regions (skin, hair, top, shirt, legs,
shoes, gloves, belt) from its card's costume:

| card | body | wears | carries |
|---|---|---|---|
| Peggy Carter, Secret Agent | woman | a blue jacket over a white shirt, navy below, brown hair | a red hat, a round shield |
| Agent Phil Coulson | man | a navy suit and a white shirt | a gold badge on his chest and back, a tie |
| Nick Fury, Spymaster | man | black | a long black coat, an eyepatch |
| Quake, Agent of S.H.I.E.L.D. | woman | black, with teal gloves and belt | glowing gauntlets |
| Agent 13, Sharon Carter | woman | indigo, a silver belt, blonde hair | a silver pistol in her hand, a lit muzzle |
| Agents of S.H.I.E.L.D. | three men | grey suits, the leader's white shirt in front | — a squad of three |
| Bold Biochemist | man | a white coat over pale green | a long lab coat, a lab bench |
| A.I.M. Scientists | man | yellow, black gloves and boots | a bucket hood, a lab bench |
| Wasp, Shrinking Savior | woman, half size, hovering | gold, with a black chest panel and legs | four wings |
| Ant-Man, Reformed Rogue | man | red, a black chest panel, silver gloves and belt | a glass helmet |
| Soldier and Hero tokens | man / woman | tactical grey with black gloves / pale gold with blue legs | — |

The hologram still rims every figure in its card's colour, and the drone, the bee
and the Helicarrier's carrier are unchanged in kind. Skin is one neutral tone for
every card, on purpose: a costume is identity, and a complexion is not.

**A duelist at each side of the table.** Your seat is a S.H.I.E.L.D. **director**
in a navy suit and a long coat trimmed in gold, with a gold badge on his chest and
its emblem on his back. He stands just left of your hand, and you see him
three-quarters from behind. The opponent's seat is an armoured **villain** in
iron, with a green cloak and an iron great helm. He stands at the table's right,
beside the opponent's creatures, three-quarters toward you. A duelist is a
*seat*, never a player: the name on the HUD plate is the only name. They face
each other across the table, and:

- raise a hand toward the table when their seat casts a spell;
- flinch and flush red when their seat takes damage or loses life;
- at the end of the game, the winner raises an arm and the loser kneels, head
  bowed and greyed — and they hold it through a skip, a scrub or a reconnect,
  because it is read from the game's result, not remembered.

**Why not one at each END of the table?** From every view you can play in, the
far end of the table sits under the arena's own top bar, so a figure there would
be invisible from the table view. The opponent's duelist therefore stands at the
right-hand side, where every playable view sees it. If you want it moved, that is
PLAN.md's slice-4 follow-up 2. From the side-on view (**4**) your own duelist is
out of frame. The camera never moves to show either one: they are decoration and
may leave the frame. Without `figures.glb` each seat draws the flat silhouette
bust slice 1 had, standing where its duelist would.

**Changing a duelist is a data edit.** Edit `web/src/arena/figures/duelists.json`,
which `figures/duelists.ts`'s `validateDuelists` checks. `duelists.test.ts` fails
on any error, and at runtime a bad look sends its seat back to the bust.

1. **`seats`** names the look each seat wears (`you`, `opp`).
2. **A look** under `looks` has `body` (a ladder of library bodies; the first one
   present wins), `scale` (1.2–2.2 × a creature's height), `tint` and `seatMix`
   (how much of the seat's own colour goes into the edge), `costume` (the same
   eight slots as a card), `props` (kit kinds, each worn in a costume slot,
   optionally stretched by a `scale` within 0.4–1.8), and `trim` / `shade` (the
   slots a prop's bright and dark parts wear).
3. **`gestures`** says which of the body's clips play each gesture (`cast`,
   `flinch`, `win`, `lose`), where a stance rests (`hold`), a lean, and which
   joints to aim (`aim` is how the winner's arm points straight up).

Then run `npm --prefix web test` and look at `g1.jsonl` 372 → 373 (the end) and
354 → 355 (a cast) in `npm --prefix web run dev:arena`.

**Dressing a card is a data edit too.** Add `costume` to the card's row in
`traits.json` (slot → `#rrggbb` or `tint`). It merges slot by slot over the
card's subtype rung: spy is a dark suit and a white shirt, hero is blue below
with a gold belt, soldier is tactical grey, and scientist is a white lab coat
over grey. Any slot nobody names is filled in: the shirt follows the top, the
legs are the top darkened, the gloves are the skin, the belt is the legs
darkened, and skin, hair and shoes have neutral defaults. So a card with no
costume at all wears a bodysuit of its own colour. `traits.test.ts` reads every
deck card's costume back off the figure and fails if one slips. To stand a card
in the woman's or the man's body, give it a row in `figures.json` with
`"model": "hero"` or `"model": "agent"`. A face-down card still wears nothing: it
is the anonymous disc.

**It costs**, at `g1.jsonl`@355 with bloom off, 79 draw calls, 27,416 triangles
and 12 shader programs, against the Tier 2 budget of 90 / 30,000 / 14. The two
duelists are one draw call each and add no shader, an idle table still renders
nothing, and `figures.glb` is now 373,236 bytes. Every number is headless
Chromium on this machine's GTX 1080. Nobody has measured a desktop browser or an
integrated GPU, and nobody has played slice 4 yet.

**Two things you may notice.** In a live game the duelists' flinch mostly does
not play when *you* take damage: Forge is waiting on you, and the arena snaps
animations to keep the prompt responsive (PLAN.md question 12). Replays show the
flinch. And every humanoid has a "superhero" build — broad-shouldered, Coulson
included — because the free pack has only those proportions.

#### The comic motion lane — stars, lettering, splats, dots, speed lines, on twos

**Report 15's Lane MOTION** (`docs/research/15-art-direction.md` §5, §9.2;
decisions **D147–D155**; evidence in [`docs/evidence/motion.md`](docs/evidence/motion.md)).
The cues speak a comic's motion vocabulary — graphic shapes, not soft light:

- an **impact star** on every struck body, lettered **POW** when the blow is
  lethal; a star at a block's contact and on a strike's target. **A star never
  hides the body it is on** (**D154**): an attacker's own word sits beside its
  head, clear of its hat, shield and patch, and a hit lands on the struck body's
  edge with its face still in view — both toward the middle of the screen, from
  every camera view;
- **lettering** from a closed list of five — POW, BLAM, KRAK, ZZAK, WHOOSH — which
  the deck's headline cards use for their own beats (Agent 13's shots are BLAM,
  Quake's takedown KRAK, Wasp's sting and the Doombot's laser ZZAK, the
  Helicarrier's descent and the Air Force's sweep WHOOSH, Fury's, Peggy's and a
  lone Agent's charge POW);
- an **ink splat** under every creature that dies on the battlefield — black ink
  with a paper rim and a gloss (**D155**), so it reads as ink on the hologram's
  dark felt and on a light stage alike;
- a **halftone** flash behind a struck player's life, and Coulson's badge rings as
  dot bursts;
- **speed lines** on every dash — two bands streaming past the body, one each
  side, and never across its card (a card moves with its figure's lunge, so the
  lines once lay over the art like scratches; since the merge with the comic look
  they keep to a lane that holds the body and its card from whatever camera is
  looking);
- **the hologram inks in**: an arriving creature is a hologram that resolves into
  ink over its summon — to HALF ink, because an arrival is summoning-sick and the
  comic look draws a sick figure half hologram; the next snapshot that says it can
  act paints it whole. A creature that dies drains back to hologram as it falls,
  then greys and fades. (Under `?look=holo` both are invisible by construction —
  the hologram already is the not-yet-real treatment.)
- a small **camera jolt** on a strike, a death and a lethal blow — never while the
  engine waits on you, never within five seconds of your own drag, never under
  reduced motion, and never a move: the camera stays where you put it;
- and everything **on twos** — each cue stepped to twelve drawings a second, the
  comic's stepped motion.

**Both are switches**, and *off* is honest: with **comic FX** off (`?fx=classic`)
the cues play exactly the film they played before the lane — measured op for op
over every committed recording, and `motion.test.ts` pins that film's digest (with
on twos off too: on twos steps the timing, not the vocabulary) — so the checkbox
is an A/B. **On twos** is its own
checkbox (`?twos=0`) and is always off under `prefers-reduced-motion`, which also
drops every speed line, every jolt and the summon's ramp.

**Giving a card a word is a data edit.** In `web/src/arena/cues/cues.json` a card's
row takes `burst` (`none`, `star`, `pow`, `blam`, `krak`, `zzak`, `whoosh`),
`burstColour`, `streaks` (0–2), `streakColour`, `splat` and `dots` (0–2) and
`inkFrom` (where the summon starts); `cues/validate.ts` refuses anything else. The
rule the file lives by holds: a word lands on the body the event names — the
attacker's own flourish beside it at the top of its dash, the target the stack named for a
spell, the defender the attack band named for a laser — never on a card the
renderer guessed was involved. Try it in the workshop first: every beat plays from
the pedestal's existing rehearsals, and its queue bar carries the same two
checkboxes.

#### Bodies — resting poses, hair, faces, coats that drape, and the art's own colours

**Report 15's Lane BODIES** (decisions **D156–D165**; evidence in
[`docs/evidence/bodies.md`](docs/evidence/bodies.md)). After slice 4 the verdict
on the figures was *"dull and bare"* beside the card art. This lane adds detail
where the camera looks, with no model per card: every person stands in a pose of
its own, has hair and a face, wears a coat that bends with it, and a card with no
hand-written look takes its colours from its own painting. It all shows in either
look (`holo` or `comic`), and all of it is data.

| card | rests | hair | also |
|---|---|---|---|
| Nick Fury, Spymaster | arms folded | bald, as his card draws him | an eyepatch over the eye it hides; a coat to below the knee whose skirt drapes from his hips |
| Peggy Carter, Secret Agent | at the ready, pistol low, shield arm raised across her front | waves under the hat | a sidearm in her right hand |
| Agent Phil Coulson | hands clasped above the belt, elbows out | parted | — |
| Quake, Agent of S.H.I.E.L.D. | braced, both palms forward, head up | a near-black swept bob with cool lit locks | — |
| Agent 13, Sharon Carter | the pistol at the high ready, barrel up beside her face | a bun | — |
| Bold Biochemist, A.I.M. Scientists | bent over the bench, from the waist | parted / under the hood | the lab coat leans with him and hangs open |
| Ant-Man, Wasp, the Hero token | hands on hips | parted / a bob / long | — |
| Agents of S.H.I.E.L.D., the Soldier token | at ease, hands behind the back | parted / close-cropped | — |
| the duelists | — | — | the director's long coat and the villain's green cloak, lined so they read from both sides |

**Every one is a pose.** A tapped figure still kneels, an attacker still lunges,
and a skip, a scrub or a reconnect lands on the same pose — a figure that arrives
already tapped or attacking included, which lands in that stance with its resting
pose put away (a blend of the two, fixed when the lanes were merged). A face sets its jaw —
brows down, teeth set — while its figure kneels, attacks or blocks, and relaxes
when it stands again (**D165**). A face-down card is still the anonymous disc: no
pose, no hair, no face, no colours.

**Changing one is a data edit** in `web/src/arena/figures/traits.json`, and the
workshop's tuning panel has a row for each key:

- `rest`: `stand`, `folded`, `ready`, `aim`, `highReady`, `akimbo`, `clasped`,
  `braced`, `working` or `atEase` (`figures/rests.ts` is what each one is);
- `hair`: `parted`, `long`, `crop`, `bob`, `waves`, `bun` or `none` — absent
  means the body's own;
- `face`: `on`, `patched` (the eye under an eyepatch left out) or `none`;
- `palette`: `art` (the default) or `off`.

**The coat drapes.** Its skirt hangs from the hips: each front panel follows its
leg about a third of the way and each side panel about a fifth, and the lower
half of each falls back toward straight down — so a kneeling or lunging figure's
coat opens and folds without a panel flying out or lying flat (**D162**). It is
cut to the body it is on — close round the hips, to just below the knee, open
down the front — so the legs and the pose show under it (**D163**). Its yoke,
over the shoulders, narrows to meet the coat's body, so there is no step at the
chest and no gap at the shoulder blades.

**The art's colours.** For every card face up, the page can read the card image
it already downloaded, once, when the browser is idle, and find its main colours.
They sit **under** every hand-written row: a card that has a row keeps it, and a
card that has none — a new set's — gets its painting's vivid colour for its
accent and body tint, its land tile and its aura, but never its clothes (a
painting's main colour is usually its background). Nothing is saved or sent.
**It is drawn in the arena and in the workshop since the lanes were merged**
(**D164**): the Giant-Sized Flying Ant, which has no colour of its own in
`traits.json`, is its painting's brown rather than its mana's blue, and Wasp's
aura its painting's salmon. The workshop's tuning panel shows each card's swatches
and the tint and accent the pedestal draws with them, and its `palette` row turns
the rung off for a card (**D160**). Tokens have no art entry, so they never get an
art colour, and a card drawn face down never has its art looked at.

**What was not done.** The brief's plan for hair used the free Universal Base
Characters pack's other hairstyles. Downloading it again needs your approval, so
two of the hairstyles are the pack's own (already in the library) and four are
drawn procedurally until then (PLAN.md's lane BODIES follow-up 2).

**It costs** six or seven draw calls and about 1,950 triangles on a busy table
(see `docs/evidence/bodies.md` §9 for this pass's own measurement), inside the
Tier 2 budget of 90 calls and 30,000 triangles with only the look lane's own two
calls of room left. The board's own code is unchanged, and an idle table still
renders nothing.

#### The workshop — one card on a pedestal (`#workshop`)

A card viewer for the identity work. Pick a card and you see it exactly as the
arena draws it: its figure, props, disc and card. You can make it act, tune its
data live, and measure whether it reads from the table. It is **the arena's own
renderer** pointed at one card on a synthetic board: `CardPlane`, `FigureLayer`,
the prop kit, `CueRunner` and the cue engine. So what you see is what a game would
show, and no workshop code decides how anything looks (**D102**, **D104**). It
needs no JVM and opens no socket.
[`docs/evidence/workshop.md`](docs/evidence/workshop.md) is what was measured.

```bash
npm --prefix web run dev          # then http://127.0.0.1:5173/#workshop  (or /?view=workshop)
#   /#workshop?card=coulson       open on a card — a name or part of one (the query
#   /?view=workshop&card=peggy    spelling works too; the hash wins, and the page
#                                 keeps #workshop?card=… in step with the list)
#   W in the 3D arena (replay or live), ⚒ workshop in the top bar, or View in 3D
#   in #cards' detail panel opens it; ▣ arena, ▤ board or V goes back, a replay at
#   the frame you left it on; ≡ card text opens the card in #cards
node tools/build-workshop-catalog.ts          # regenerate its card list after a deck, a
node tools/build-workshop-catalog.ts --check  # recording or a card's own cues.json entry
                                              # changes (a test fails until you do)
```

Opening it from a live game is safe. The game is kept, because the socket belongs
to the page, and nothing you do in the workshop reaches the engine. While the
engine is waiting on you, the workshop's header says so. The board and the arena
are unmounted while the workshop is open, so their keys cannot press OK behind
your back. Without `web/public/art.json` (`node tools/fetch-art.ts`) the list has
no thumbnails and the cards on the pedestal are text frames, as on the board.
Without `web/public/models/figures.glb` every creature is its disc.

**Left: the card list.** It holds:

- every card of every deck in `decks/` (41 across the ten);
- the 5 tokens the recorded games have seen;
- 11 generic archetypes: a robot, an insect, a scientist, a spy, a hero, a
  soldier, a villain and a vehicle, then a white creature, a blue creature and
  any other creature;
- two concealed shapes: a face-down creature and a hidden (redacted) card.

Search by name, type or deck. Each row's chip says where its look comes from:
**per-card** (its own row in `traits.json` or `figures.json`), **subtype**,
**colour**, **default** or **concealed**. Hovering the row lists the rungs.
`Giant Growth` has never been seen face up in a recording, so it is shown as a
generic card of no type. The card you last looked at is remembered in this
browser.

**Middle: the pedestal.** The card and its figure on the arena's table, drawn by
the arena. Above it:

- **1× close** (drag to orbit), **table distance** and **whole table** (view 1
  itself). *Table distance* makes the figure exactly as big as it is in the table
  view at 1600 × 900, the size you will actually see it at.
- **both seats**: your copy on the left and the opponent's on the right, from the
  same angle. You see the opponent's figure from behind, as you will in a game.
- **faces its player / faces the other seat**: PLAN.md's question 13, previewed.
  The arena itself is unchanged.
- a **target dummy** for attacks, blocks and spells to aim at, and **bloom**
  (single view only).

The caption gives the body's height **as drawn** in the table view. Below the
pedestal is the cue engine's own control bar: play/pause, step, +50 ms, skip cue,
skip all, speed and reduced motion. *Back to rest* puts the card back when the
film ends; **rest** does it now.

**Right: actions, tuning and a number.**

- **Clips.** Every animation the body has, each played on its own, with no
  lunge and no flash. A card's alias is used: Agent 13's `attack` is her
  `pistolDraw`. The **stances** are here too: ready, tapped (it kneels), summoning
  sick (translucent), attacking and blocking. The Air Force's clips are marked,
  because its swarm is procedural and the rig they move is never drawn.
- **Cues.** Everything the card can go through on the table, up to 24 events
  chosen by what the card is: enters, attacks alone or with another, blocks,
  takes damage or lethal damage, dies, is exiled or sacrificed, taps, gets or
  loses a counter, is cast, resolves, fizzles, attaches, is crewed, and so on.
  ▶ plays one through the real cue engine. Beside each event:
  - which `cues.json` rung answered (the card's own entry, an archetype's or the
    default), the cue, its length and the clip it plays;
  - when the card's own, less specific entry outranked a more specific default
    (a fizzled Helicarrier Strike used to strike; since the reconciliation it
    carries its own fizzle, and so do Pym Particles and Depower);
  - any selector of the card's own entry that no event reaches.

  Hover a ▶ for what the workshop invented. What a spell targets, what a blocker
  blocks and who crews are the engine's to say, so here the answer is the dummy,
  the other copy, an Aura's host or a Soldier token.
- **Tuning.** The card's `traits.json` row as fields: `scale`, `hover`, `idle`,
  `tint`, `accent`, `shade`, `turn` + `turnedRatio`, `swarm` + `formation`,
  `silhouette`, `shrink`, a checkbox per prop kind, the **body** (`human`, or the
  `chibi` fallback — it says so when the body has none) and the **costume**
  (Tier 2 slice 4): a row per slot — skin, hair, top, shirt, legs, shoes, gloves,
  belt — with a colour picker, a *tint* toggle, the value the data gives and
  where it came from (*this card*, *inherited* down the ladder, or *filled* from
  the top). The swatch is the colour the body is drawn in. A drone, an insect or a
  disc wears no costume, and the panel says so. Edits apply at once.
- **Cue params.** The `params` of each of the card's own `cues.json` selectors,
  as JSON.
- **Legibility.** For each prop, how many pixels it gets on screen from the
  table view, on your seat and the opponent's, standing and kneeling. It shows
  red under 48, `traits.test.ts`'s bar, and measures what that test measures,
  pixel for pixel. A one-sided detail (a tie, a laser eye, an exhaust, an
  eyepatch) is red from one side on purpose: its partner carries the card there.
- **Keys.**

| key | what it does |
|---|---|
| **SPACE** | pause / resume the cue clock |
| **.** | step: play the queued batch to its end |
| **,** | advance a paused clock by 50 ms |
| **K** | skip everything playing |
| **[** / **]** | slower / faster |
| **B** | both seats on / off |
| **F** | facing: its own player / the other seat |
| **T** | camera: close → table distance → whole table |
| **R** | reduced motion on / off |
| **↑** / **↓** | previous / next card in the list |
| **V** | back to the arena |

**Your edits stay in this browser.** Tuning and cue params are overrides kept in
this browser's `localStorage`. They never touch the repo, and the game never sees
them: the arena and the board keep drawing the committed files. Each override
goes through the arena's own validator first. A value the arena would refuse is
refused here too, with the validator's message, and the card falls back to the
look it would have in a game (**D103**). *OVERRIDDEN in this browser* at the top
of a box means an override is live; **reset** drops it.

**From a tuned look to a committed one.** This is *Giving a card its identity*,
above, with the workshop as the place you look:

1. Tune the card until it reads at **table distance** with **both seats** on.
   Check **Legibility**: every identity prop should reach 48 or more on both
   seats.
2. Press **copy as traits.json row**. The clipboard gets `"<card name>": { … }`
   in the file's own style: the committed row with your edits folded in, its keys
   in their order and its `_note` and `_costume` kept. The button is disabled while the validator
   refuses the row. With no clipboard, the text appears in a box under the
   button.
3. In `web/src/arena/figures/traits.json`, replace the card's row under `cards`
   with it. For a card with no row yet, add it there; the copy already uses the
   name as the wire spells it. Write a `_note` saying where the look comes from.
4. Run `npm --prefix web test`. `traits.test.ts` validates the file, prints the
   census and rasterises every deck card's props from both seats.
5. Back in the workshop, press **reset**. Until you do, this browser keeps drawing
   the override over the file. Right after the paste they are the same, but a
   later change to the row would stay hidden here.
6. Look at the card in a real game frame: `npm --prefix web run dev:arena`,
   scrubbed to a frame where the card is on the battlefield, in views **1** and
   **4**.

Cue params work the same way. **Copy as cues.json entry** gives the card's whole
`cues.json` entry with only your params changed. Its notes are kept, and so are
`presence` (its hover) and `station` (a console or a cocoon), because a paste
replaces the whole entry. Replace the entry under `cards` in
`web/src/arena/cues/cues.json` and run the tests. `cues-exhaustive.test.ts`
validates the file, and `replay-cues.test.ts` sweeps the recorded games.

The panel cannot change a card's `cue` or `ms`, add a selector, or edit the
archetype rungs of either file or `figures.json` (which body a card stands in, an
attachment's look, a land's tile). Those are edits to the files. A concealed card
has no tuning at all, because it is anonymous by rule.

**What it is not.** It is not a game: there is no act, no answer, no socket, and
nothing the engine ever sees. It does not edit the repo: it writes nothing but
this browser's storage. It shows what the arena draws, rules included:

- a face-down creature is the anonymous disc with no props;
- a hidden card is a back with no figure;
- a creature that dies is seen dying;
- an attacker turns to face what it attacks.

Camera cues (the Helicarrier's fly-in) are not played, because the pedestal's
camera is yours. Bloom is single-view only. The duelists are not on the pedestal:
they stand for a seat, not a card (**D99**).

#### The comic look — ink, three bands and a stage (Lane LOOK, D137–D146)

The figures were a glow in a colour beside card art drawn in ink, and the user
chose the art's **style** for them (report 15, `docs/research/15-art-direction.md`;
**D137**). Every figure, dying body, duelist and painted prop is now:

- the costume palette **painted** — saturated, black lifted to a deep blue with
  blue highlights — in **three flat bands** from one key light that belongs to the
  lens, upper left (**D138**), the core shadow cooled and screened with
  **halftone** dots, a **specular dot** on the lit band, and the card's own colour
  as a **rim** on the shadow side;
- **inked**: a line wherever the depth buffer bends ON a figure — every figure,
  prop and crease, the carrier — and never on a card, a tile or the table; drawn
  inside bloom's own pass, so it costs no draw call, and only while bloom is on
  (**D139**, **D146**). A glow burns through it;
- **grounded** by a dark contact shadow that leans away from the light (**D140**);
- standing on a **stage** of mid value instead of the dark felt, each half in the
  colour of the cards that seat has shown, with a night skyline round the table
  and a burst of action lines at the centre during combat (**D141**).

What is not yet real stays a **hologram** (**D142**): a face-down creature's
anonymous disc and a creature spell standing on the stack — and a
summoning-sick creature is **half** one until it can act. And **your figures
face the opponent** now (**D143**, PLAN question 13): from the table view you see
their backs and the opponent's fronts.

| URL flag | what it does |
|---|---|
| `?look=holo` | the hologram, exactly as before (the felt, no ink, no shadow) |
| `?ink=none` | no ink line |
| `?ink=always` | the ink even with bloom off (a composer for it alone — a measurement switch) |
| `?halftone=0` | no halftone dots |
| `?key=world` | the key light fixed to the table instead of the lens |
| `?stage=felt` | the dark felt under the comic figures |
| `?shadow=0` | no contact shadows |

The workshop's toolbar has the same switches — *holo · comic*, and *ink (with
bloom), halftone, shadow, stage, world key* — for an A/B on one card. It opens
on **1× front**, the figure's identifying side; **1× from your seat** is what the
arena shows you (a figure's back, since D143), and *both seats* shows your copy
from behind and the opponent's from the front. Unticking **bloom** (the cue
strip's checkbox) takes the ink with it; so does the arena's resolution governor
at its lowest rung, on a slow machine — tick bloom to bring both back. What was measured —
draw calls, triangles, programs, frame times on the GTX 1080 and SwiftShader —
is `docs/evidence/look.md`.

#### The status layer — keywords, a bar, pips and a turn-order bar (D210–D212)

Watching a game reads like a turn-based RPG: every creature carries a small
**status strip** over its head, the way Final Fantasy XIII shows a unit's buffs.

- **Its keywords, as icons** — the evergreen fourteen each have a glyph of their
  own (flying, haste, vigilance, first strike, double strike, lifelink,
  deathtouch, trample, hexproof, indestructible, menace, reach, defender, flash);
  anything else is one "…" icon. The engine sends them (amendment **M49**, a
  card's `keywords`), so a keyword an anthem grants is there and one an effect
  took away is not.
- **A bar of what is left of its toughness** — toughness minus the damage marked
  on it this turn, green to amber to red, the damaged part in dark red. It is a
  picture of two numbers and says nothing about death: an indestructible
  creature can stand at an empty bar (**D211**).
- **A pip per counter** (green +1/+1, red −1/−1, gold anything else) and **a mark
  per attachment** (a halo for an Aura, a hammer for an Equipment).

The strip faces you from every camera view at the same size (an icon is 16 px),
rides its creature through a lunge and stays upright when it kneels. **A
face-down creature and a card you may not see have none** — not an icon, not a
bar. The whole table's strips are one draw call (**D212**). On the 2D board the
same icons sit in a row under each card's P/T, with the keyword's name on hover,
and the bar along the tile's bottom edge.

The arena's left edge carries the **turn-order bar**: the eleven phases of a turn
in order, the active one lit in the colour of whoever's turn it is, and your
stops as two pips per phase (left: your turn, right: the opponent's) — the same
stops the board's phase strip shows, and a click sends the same act.

Recordings made before M49 (every committed fixture but `villain-doom-248`, the
corpus's first M49 recording) have no keywords: their strips show the bar, pips
and marks only. The workshop's **status strip**
rehearsal shows the icons on any creature — with a sample of keywords, which its
fiction line says is the workshop's — so their size and placement can be judged
on the pedestal. What was measured is `docs/evidence/status-layer.md`.

#### Villain identity — the Doom Legion reads as itself (D220–D222)

The deck a bare `./scripts/play.sh` seats against you — `decks/doom-legion.dck`,
Doctor Doom, HYDRA, three Kangs and Loki — has a committed recording of its own
and an identity for every creature it names. Before, a villain was a bare body in
its colour and a black Human Villain (Crossbones, Baron Strucker, Madame Hydra)
was a glow disc.

| card | what you see at the table |
|---|---|
| Doctor Doom | an iron mask under a green hood, a green cloak and tunic over iron armour, a gold belt, hands on his hips; he arrives with a green beam to each place a Doombot appears |
| Doombot (his token) | a steel drone with a green eye, close to the table; its eye fires at whoever it attacks |
| Doom's Servo-Guards · A.I.M. Bot · Aerial Doombot | a dark sentry drone with a red eye · a flying yellow drone with wings · (unchanged) Doom green with thrusters |
| Agents of HYDRA · HYDRA Troopers | a hooded squad of three in HYDRA green and yellow · one hooded green trooper, pistol up beside his head, who opens fire |
| Baron Strucker, HYDRA Overlord | bald, in a black uniform under a long HYDRA-green greatcoat, at ease |
| Loki, God of Mischief | green and gold, a green cloak, long black hair, sorcery lit in both hands |
| Kang the Conqueror · Kang, Temporal Tyrant | a blue mask under a purple helm: hovering, wrist blasters lit and firing · standing, cloaked in purple, arms folded |
| Pharaoh Rama-Tut | a gold headdress, a gold collar over white linen, a royal-blue cloak, arms crossed |
| Unliving Legionnaire | a thing of the night: a corpse-pale face under a wine-black hood, violet and crimson, hovering on magenta wings, arms folded |
| Madame Hydra, Reanimated | her long green hair, a charcoal catsuit and cloak, as her card paints her |
| Crossbones, Malicious Mercenary | a white skull mask on a balaclava, the biggest man on the villains' side, in warm charcoal fatigues and a brawler's guard; his trigger rings from his feet |
| Villain Token | a hooded henchman in black |

Two pieces joined the shared kit for it, each worn by five cards or more: the
**`mask`**, a faceplate in the figure's tint, and the **`cowl`**, a hairstyle
that is a hood to the shoulders. Everything else is the kit the S.H.I.E.L.D.
deck already wears — a villain's cloak is Doom's and Loki's, Strucker's greatcoat
is Fury's coat in another colour. A face-down or hidden villain gets none of it,
exactly as before.

**See it**: `npm --prefix web run dev`, then `#workshop` — the list shows the
Doom Legion second, and typing *doom legion* in its search lists all 27 — or the
villains' own game in the arena at its last turn, thirteen villains on the table:
`/?replay=games/villain-doom-248.jsonl#arena`, scrubbed to frame 388. The game
itself is `node tools/narrate.mjs fixtures/games/villain-doom-248.jsonl`: Doom's
Plan pays off the turn he arrives with his Doombots, and the villains win on turn
24. What was measured — the census that chose the seed, every corpus count that
moved, three defects the new recording found and this change fixed, and the
crowded table's draw calls (its last turns put 49 cards on the table, over the
bench's lines before any villain is dressed — D222) — is
`docs/evidence/villain-identity.md`.

#### More villain identity — the Masters of Evil, the Hulk family and Wakanda (D230–D233)

The three other AI decks (`--ai-deck decks/masters-of-evil.dck`,
`decks/hulk-family.dck`, `decks/wakanda.dck`) each have a committed recording
now, chosen by census over 300 seeds, and every creature they name reads as
itself. Before, their creatures were bare bodies in a colour — or glow discs,
where no rung claimed a green or red Human.

| deck | what you see at the table |
|---|---|
| **Masters of Evil** | the team as a squad: Zemo's purple hood, mask and cloak in front, two figures in shadow behind him; MACH-1 flying on thrusters, a gunmetal helm with red lenses; Yellowjacket small and winged under Ant-Man's antennae helmet in yellow; Songbird on pink sound wings; Moonstone flying with the moonstone's light in her hands; Radioactive Man glowing green; Volcanic Villain molten, flames for hair; Titania big, red-haired, in blue; Atlas a maroon giant; Whirlwind masked and helmed on his own cyclone; Klaw's sound at his hands (he aims it to attack); White Widow in white with goggles; Fixer in red goggles at a bench of gadgets; Tiger Shark in orange under a purple finned hood; Whiplash a dark suit under a teal hood, whips lit at both hands; Boomerang's silver faceguard in a dark hood; the Common Crook long-haired in rust-orange |
| **Hulk family** | three Hulks, barefoot, the biggest people on the table, each his own — green in torn purple, a deeper green in maroon-brown, a bright green with a shaggy mane in indigo; Red Hulk red; two Abominations, grey-olive and dark green; Gamma Grotesque a hunched teal monster in black; She-Hulk green in a purple suit and in her white and purple; Wolverine short, in yellow and blue, claws glinting; Brawn green in a dark vest over white; Hulkling yellow-green and blond in lavender, a fist raised; Hercules bare-chested in green trunks; Hellcat in the yellow catsuit; the Knight of Wundagore a lion's face under his mane; Rick Jones in a red jacket; Gallant Citizen an astronaut in white; Birds of Paradise a flock of three small grey fliers |
| **Wakanda** | four Black Panthers in the black suit under the panther's mask — claws lit, violet with kinetic energy, cloaked as the king at the head of his army; Shuri as the Panther, with gold at her belt, and in her lab with violet gauntlets; the Dora Milaje and both Okoyes shaven, in red and gold, each with a vibranium **spear**; the Shield Guard with his blanket-shield and spear; T'Chaka white-haired in a royal cloak; Nakia in red and gold with her ring blades lit; Storm flying in white, lightning in her hands; the Drone Flock a white drone with wings; the Warriors a squad in indigo |

One new kind joined the shared kit, the **spear** (five Wakandan cards wear it),
and it was admitted with its draw call measured on Wakanda's crowded table and
paid for there by a kind the table already draws (T'Chaka's cloak). Everything
else is the kit the other decks already wear — a mask and cowl are Doom's, the
wings Wasp's, the helmet Ant-Man's, the gauntlets Quake's. Only a transformed body
paints its skin (a Hulk's green, a lava body, a radioactive glow); every person
keeps the one skin tone — whether a person's tone should follow its card is the
owner's question 31 in PLAN.md. A face-down or hidden card gets none of it. The
fix pass (D232) re-dressed nine of these after reading them side by side at the
table's distance, where the Hulks had been one green body told apart by size.

The crowded tables cost triangles: the Masters of Evil's and Wakanda's last
turns are over report 13 §8.2's 30,000 dressed (the Masters' over it bare, too),
and that is accepted with its numbers (D233) rather than met —
`traits.test.ts` holds the part identity adds, so it cannot grow unrecorded.
Wakanda's table places 25 lands on its last turns, and every one is drawn (the
terrain's cap is 32 since D230).

**See it**: `npm --prefix web run dev`, then `#workshop` — type a deck's name in
its search — or a game in the arena: `/?replay=games/villain-wakanda-232.jsonl#arena`
(scrub to frame 527, 48 cards and 25 lands on the table),
`/?replay=games/villain-masters-of-evil-33.jsonl#arena` (frame 371) or
`/?replay=games/villain-hulk-family-261.jsonl#arena` (frame 427). What was
measured — the census, every corpus count that moved, five things the new tables
showed, and the draw calls and triangles each deck's busiest frame costs — is
`docs/evidence/more-villain-identity.md`.

### Card library and browser — `#cards`

A local, offline-searchable index of every Magic card, and a page to browse it:
search by name, type line or rules text, filter by set, colour, type and deck, and
open a card for its cost, rules text, flavour, P/T, prints, artist, legalities and
which of your decks it is in. It is a **tool beside the game**, not part of it —
the engine, the bridge and the board do not use it, and the board still draws
from `web/public/art.json` — and it exists on the user's request of 2026-09-27,
which lifted the card-library line of the NON-GOALS above only in part (**D90**).
Report 03 §4 is its spec, [`tools/card-library/README.md`](tools/card-library/README.md)
the library's manual and [`docs/evidence/card-library.md`](docs/evidence/card-library.md)
what was measured.

```bash
# 1. Build the index (once, and again whenever you want Scryfall's latest data).
#    Downloads Scryfall's oracle_cards bulk file (~24 MB gzipped, skipped when the
#    current one is already on disk), every MSH and MSC print (8 search pages at
#    2 per second) and the two set icons, then indexes them into
#    var/cards/cards.sqlite (~55 MB).  Under ten seconds on a first build.
node tools/card-library/build.ts
node tools/card-library/build.ts --offline      # re-index what is already in var/cards/

# 2. Cache card images (optional).  The build fetches NO image.
node tools/card-library/images.ts --all-decks    # every card in decks/: 41 images, ~3.8 MB
node tools/card-library/images.ts --deck decks/pacho-shield.dck --size normal
node tools/card-library/images.ts --all-prints --size normal   # prints the size, then STOPS
#   (add --yes to fetch every MSH + MSC print: 1,338 images, ~104 MiB)

# 3. Browse.  The route exists only in the Vite DEV server.
npm --prefix web run dev                          # then http://127.0.0.1:5173/#cards
#   /#cards?q=agent&set=msh                      the URL is the page's state:
#   /#cards?q=creature&set=msh,msc&color=W       q, set, color (W U B R G, C, M),
#   /#cards?deck=decks/pacho-shield.dck          type, deck and open=<scryfallId>
#   `▦ cards` in the board's top bar opens it; the back link returns to the board,
#   the arena or the workshop you came from, a replay at the frame you left it on

# The same index from a terminal, as JSON on stdout:
node tools/card-library/query.ts name "Peggy Carter, Secret Agent"
node tools/card-library/query.ts search shrink --set msc --limit 10
node tools/card-library/query.ts resolve decks/pacho-shield.dck
```

**Keys:** `/` focuses the search; the arrows, `Home` and `End` move over the grid
as it is actually laid out; `Enter` opens the selected card; `Esc` closes it. The
browser has its own keymap table (`web/src/cards/keys.ts`), because the board's
`?` overlay must list every row of the board's.

**View in 3D.** An open card's detail panel has **⚒ View in 3D**, which opens it
in the workshop (`#workshop?card=<its exact name>`, above) — live for a card the
workshop can show: a creature or a Vehicle from `decks/` or the recorded games'
tokens, or another of their cards with its own `cues.json` entry. For anything
else it is greyed, and its tooltip says why: the workshop lists the card but has
nothing of its own to show (Opt), or does not list it at all. The workshop's
**≡ card text** comes back here (**D102**).

**Where the pictures come from.** A tile tries the image cache first, served by
the dev server from `var/cards/images/`; on a miss the route answers 404 — it
**never fetches** — and the page loads the image from `cards.scryfall.io` itself,
as the board does; with neither it draws a text frame, never a broken image
(**D92**). So a card from your decks shows from disk, and anything else is
hot-linked until you cache it. The cache is keyed by Scryfall id, size and side,
never by name (**D93**). The browser draws its cards with its own renderer,
`CardView`, not the board's `CardTile` (**D94**).

**Scryfall's terms, as the library honours them** (NOTICE §2 is the long form):

- **Headers.** Every API request carries `config.json`'s `scryfallUserAgent` and
  `Accept: application/json`, through one client (`tools/card-library/scryfall.ts`).
  **The committed User-Agent names this project's contact**
  (`github.com/jalirkan/mtg-table`); a fork should put its own in `config.json`.
- **Rate limits.** At most 2 requests a second on `/cards/search`, `/named`,
  `/random` and `/collection`, 10 elsewhere; a 429 closes the API for its
  `Retry-After`. Every run prints the rate it actually achieved, per bucket.
- **Bulk data for anything at scale**: the whole card pool is one download, the
  set icons are downloaded rather than hotlinked, and a search never touches the
  network — typing in `#cards` sends Scryfall nothing.
- **Images are shown whole** — the full card, never cropped, stretched or
  recoloured — **with `Illus. <artist>` under every one**, the copyright line in
  the detail panel, and the Scryfall and Fan Content credit in the page's top
  bar. Nothing is paywalled, proxied or republished: everything downloaded stays
  in the gitignored `var/cards/`, and the only Scryfall data in git is the
  field-reduced test slice in `fixtures/cards/` (whether even that is committed is
  PLAN.md question 15).

What it is **not**: a package, a deck builder (the detail's *copy .dck line*
button gives you a line to paste; nothing writes a deck), a production route (a
`vite preview` or a built `dist/` shows the browser's empty state), or a rules
engine (legalities are Scryfall's data, displayed). Its four test suites —
`cards-lib`, `cards-api`, `cards-ui` and `cards-render` — run offline inside
`npm --prefix web test` over `fixtures/cards/`; the real build needs the network
and is not in `check-all.sh`.

### Playing the console game

`--transport console` is a real seat against the Forge AI with no browser. It
prints the board, the current prompt with the engine's own button labels, and
any question with its options numbered, then reads one line from stdin. `?`
prints the help; the whole vocabulary is:

| you type | it does |
|---|---|
| `<id>` or `c <id>` | click that card. The `selectable` line lists the ids the engine explicitly named, but **any** id is sent — Forge judges the click, and a rejected one comes back as `notice: Not selectable` |
| `p <id>` | click that player (targeting, attacking) |
| `a <card> <ab>` | activate an ability by id |
| `ok` | press OK — **its label is the engine's**, so it is `Auto` during mana payment |
| `no`, `x`, `cancel` | press Cancel — likewise `Undo (2)` or `End Turn` when the engine says so |
| *(empty line)* | OK when OK is enabled, Cancel otherwise |
| `m W\|U\|B\|R\|G\|C` | spend one floating mana |
| `u` / `undo` | undo the last mana ability (Forge undoes mana abilities, not spells) |
| `pass` | pass priority |
| `!` | alpha strike — attack with everything |
| `next` / `new` | **M6**, and only after `over`: play the next game of the match (`HostedMatch.continueMatch()`) or start a fresh one (`restartMatch()`) in the same JVM. A new game means a new `gameId`, a new frame log and a new session header |
| `s` / `i` | reprint the last board / the last prompt |
| `q` / `concede` | concede and exit |
| `?` | the help above |

While a question is outstanding **every** line answers it, and the question
itself prints the spellings it accepts (`0,2`, an empty line for none, and so
on). A lone `.` answers "no answer", which is always legal: the bridge
substitutes Forge's own documented default. There is no timeout — the console
waits as long as you do.

Redaction is visible in the terminal: your hand is listed by name, the AI's is
`??` lines with ids and nothing else. Every session writes the same frame log a
browser would have consumed, to `var/games/<gameId>/frames.jsonl` — copy one
under `fixtures/` (the only tree the dev server mounts) and
`?replay=<that path>` scrubs through the game you just played.

`bridge/build.sh` compiles with the JRE's compiler module and **never** passes
`--release` (there is no `ct.sym` in a JRE image). `bridge/run.sh` launches with
`env -u DISPLAY`, `-Djava.awt.headless=true`,
`-Dio.netty.tryReflectionSetAccessible=true`, `-Dfile.encoding=UTF-8` and
`-Dsentry.uncaught.handler.enabled=false`. That last flag is load-bearing during
development: Sentry installs an uncaught-exception handler that turns a startup
crash into a silent `exit 1`.

Every session writes a frame log to `var/games/<gameId>/frames.jsonl`. It is
per-seat — it contains exactly what that player was allowed to see — so it is safe
to paste into a bug report, and it is the same stream the client consumed. A bug
is a file, not a story.

### Reading a game back — `tools/narrate.mjs`

A frame log is a file, not a story — so there is a tool that tells the story. It
turns any per-seat log, an AI-vs-AI recording or a game you just played, into a
turn-by-turn account for watching how the AI plays:

```bash
node tools/narrate.mjs fixtures/games/g1.jsonl               # the whole game
node tools/narrate.mjs fixtures/games/g1.jsonl --turn 14     # one turn (--turn 1-3 a range;
                                                             # 0 is "before the game")
node tools/narrate.mjs fixtures/games/g1.jsonl --summary     # per-seat totals, who won, how
node tools/narrate.mjs fixtures/games/g1.jsonl --seat        # whose view the log is
node tools/narrate.mjs fixtures/games/g1.jsonl --json        # the facts, for other tools
node tools/narrate.mjs var/games/<gameId>/frames.jsonl       # the game you just played
node tools/narrate.mjs var/spectate/<name>.jsonl             # a game you watched (spectate.sh)
```

```
Turn 13 · Doom (AI)
  draw    Draws a card.
  main 1  Plays Island. Casts Hour of Defeat ({3}{B}, instant) targeting Ant-Man, Reformed Rogue.
          Human's Ant-Man, Reformed Rogue dies. Surveils 1: keeps it on top.
  combat  Attacks with Aerial Doombot (4/4) and Agents of HYDRA (1/1). Human does not block. Human
          takes 5 damage (Aerial Doombot 4, Agents of HYDRA 1); life 9 → 4.
```

One heading per turn, one line per step in which something happened — draws,
land plays, spells with their cost and type as the log spells them, abilities
with their text, attacks and blocks, damage with the life it leaves, deaths,
counters, tokens, cards turned face up — and nothing for passing priority or
tapping mana. Before turn 1 it says who mulliganed and who went first; the last
line says who won and **how** (a life total, poison, an empty library, a
concede). `--summary` is a table per seat: turns, mulligans, lands, spells,
abilities, creatures lost, damage dealt, life at the end.

**It tells you only what the log's seat saw.** An opponent's card you never saw
is *"a card"*, a face-down one *"a face-down card"*, and a name is read from the
frame the event happened in or the one before it — never remembered — so a card
that goes back into hiding is anonymous again (D123, protocol invariant 10). Your
own face-down cards are named, because the log names them for you. A client's
log (`ws-auto-play.mjs --log`) works too: frames re-delivered on a reconnect are
skipped, so nothing is told twice. So does a spectated recording
(`./scripts/spectate.sh`, D118): both seats are AIs there, and the opening line
names each seat's deck and Forge profile.

It is plain Node — no dependencies, no engine, no build step: the narrator itself
is `web/src/story/narrate.ts` (D124), which `tools/narrate.mjs` imports as it is
(Node 24 runs TypeScript by type stripping) and the `#story` page runs too — and
`node tools/narrate-selftest.mjs` is its gate (about a second; `check-all.sh`
runs it as step **12d**): every fixture narrated, the hidden-information rules
held by ids and by the decks' card names with six negative controls, a client log
with re-deliveries (held against the bridge's own log both ways: nothing told
twice, nothing it holds dropped), and two committed golden files, `fixtures/narrate/g1-turns-1-3.txt`
and `fixtures/narrate/g1-summary.txt`, compared byte for byte. **When you change
the narration on purpose, regenerate them with `node tools/narrate-selftest.mjs
--write-golden`** and read the diff before committing — the page prints the same
sentences, so look at it too. `docs/evidence/narrate.md` has a whole villain game
told this way.

#### The story page — `#story`

The same story in the browser, beside the replay (**D124–D128**; evidence in
[`docs/evidence/story.md`](docs/evidence/story.md)). Any replay's bar has a
**☰ story** link; or open it directly:

```bash
npm --prefix web run dev
# http://127.0.0.1:5173/?replay=games/g1.jsonl#story
# http://127.0.0.1:5173/?replay=spectate/<name>.jsonl#story     (a game you watched)
./scripts/spectate.sh --story                                    # a game being played
```

The column is the story, one section per turn (your seat's turns in blue, the
other seat's in orange, and the words say whose), one line per moment with the
step in the margin — the CLI's text, sentence for sentence. **The moment on screen
is highlighted** and kept in view as the replay plays; what comes after it is
dimmed (**S** hides it instead — the default while a game is being recorded, so
nothing is spoiled). At the head, a card with the `--summary` table and who won
and how; under it, the frame on screen — the turn and step, each seat's life and
cards in hand and library — and the Scryfall image of each face-up card the moment
names (hover or focus another moment to see its cards). **Click a moment** and the
replay goes there.

| key | what |
|---|---|
| **Space** | play / pause the replay |
| **←** / **→** | the moment before / the next moment |
| **↑** / **↓** | back to this turn's start (then the turn before) / the next turn |
| **,** / **.** | one frame back / forward |
| **Home** / **End** | the start of the log / the end of what has arrived |
| **F** | keep the moment on screen in view (on / off) |
| **S** | what comes after the cursor: dimmed / hidden |
| **V** / **B** | the 3D arena / the 2D board, at this frame |

The replay bar above it is the replay's own — the arena, the board and the story
move one cursor, so **▣ arena** comes back at the frame the story was on, and
**☰ story** at the frame the arena was on — and the arena's **caption** strip (**N**)
tells the story's moments for that frame at the table (D255). It tells only what the log's seat saw,
like the CLI: an unseen card is *"a card"*, a face-down one *"a face-down card"*,
and `web/test/story-render.test.tsx` renders the page over every fixture to hold
it to that. With no `?replay=`, `#story` says it needs a recorded game (a live
seat's story is PLAN.md's follow-up).

### The cube lab — two AIs draft your cube (D293–D296)

For designing a two-player cube: `tools/cubelab.sh` has two Forge AIs draft a
cube markdown (Grid or Winston), builds each a 40-card deck from what it
drafted, plays the two decks a best of three, and reports which colour pairs,
themes and cards win — with every pick and the cards on offer kept as data.
Everything runs on this machine; nothing the game uses changes. One command,
then the report:

```bash
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 40 --jobs 4 --record 3
tools/cubelab.sh report var/cubelab/runs/synergy-cube-180-grid-1    # open its report.html
```

Overnight (resumable — the same line again skips the drafts already done):

```bash
tools/cubelab.sh run cubes/synergy-cube-180.md --drafts 1000 --jobs 4 --out var/cubelab/runs/overnight \
    && tools/cubelab.sh report var/cubelab/runs/overnight
```

`tools/cubelab.sh check <cube.md>` first, to see every card resolve;
`--record M` keeps M games as frame logs under the run's `frames/`, which
ForgeCoach opens with **Load file**. [`docs/guides/cube-lab.md`](docs/guides/cube-lab.md)
is the manual — the cube format, the ratings file you can edit, how the AIs
draft and build, every flag and weight, the JSONL.

## Repo layout

Everything listed exists on `main` today: M0–M7 (the arena's Tier 1 and all four
of Tier 2's slices) and every lane since, each committed.

```
mtg-table/
  LICENSE                    GPL-3.0-or-later, whole repo
  NOTICE                     Forge (GPLv3), Scryfall, WotC Fan Content Policy, Marvel
  README.md                  this file; NON-GOALS above
  PLAN.md                    the milestones and every lane since; *Open now* indexes
                             every open follow-up and the owner-only questions
  DECISIONS.md               every load-bearing decision, dated, with the
                             alternatives rejected; numbers are final and gaps
                             allowed (D200)
  CLAUDE.md                  working conventions for Claude sessions in this repo; the
                             rest are in bridge/, web/, web/src/arena/ and tools/
                             CLAUDE.md, each loaded under its directory
  .gitignore
  config.json                { forgeJar, forgeHome, deck, manaLostPrompt, match: {deck,
                             aiDeck, aiProfile, games}, wsPort, wsAllowedOrigins,
                             webPort, scryfallUserAgent }. `match` is read by
                             scripts/play.sh and scripts/spectate.sh only (D106,
                             D122); wsAllowedOrigins by the ws bridge (D281)

  cubes/*.md                 Justin's two 180-card two-player cube designs (D293), as
                             he wrote them; cubes/*.ratings.tsv the cube lab's pick
                             ratings beside each (tools/cubelab.sh ratings init, edit
                             freely)

  decks/README.md            what every deck here is, and tools/check-deck.mjs
  decks/pacho-shield.dck     the deck (40 cards, MSH + MSC), plus .txt as typed
  decks/doom-legion.dck      match setup: the AI's deck, 40 U/B Marvel villains (MSH +
                             MSC). What a bare ./scripts/play.sh seats against you
  decks/masters-of-evil.dck  more-villains (D116): three more AI decks, 40 cards each,
  decks/hulk-family.dck      MSH + MSC: B/R villain aggro, R/G gamma stompy, G/W
  decks/wakanda.dck          go-wide. --ai-deck picks one; config.json's default is
                             still Doom Legion
  decks/specs/*.json         each AI deck's list with a reason per card; the .dck is
                             written from it by tools/build-deck.ts, never typed
  decks/morph-probe.dck      throwaway: 18 Mountain + 22 morph creatures. It exists so
                             one fixture exercises the face-down redaction gate, which
                             pacho-shield.dck cannot (it has no morph card)
  decks/future-sight-probe.dck  throwaway: 22 Island + 18 Future Sight. It exists so one
                             fixture has a NON-EMPTY library.cards -- no card in either
                             deck above runs a continuous MayLookAt static
  decks/trample-probe.dck    throwaway, M2: the only deck that makes Forge dispatch the
                             assign_damage ask (one trampler, two blockers)
  decks/scry-probe.dck       throwaway, M2: forces input.focusCard, which no AI-vs-AI
                             recording produces
  decks/search-probe.dck     throwaway, M5: 20 Rampant Growth. Forces choose_entities
                             WITH a delayedReveal -- a library search, i.e. the engine
                             handing the client cards out of a hidden zone
  decks/amount-probe.dck     throwaway, M5: 20 Manamorphose. Forces assign_amount in its
                             colour-keyed form, and (with --mana-lost-prompt) the only
                             confirm ask a human seat can reach
  decks/number-probe.dck     throwaway, M5: 16 Volcano Hellion. Forces the text ask,
                             through getInteger's "Other..." option
  decks/sideboard-probe.dck  throwaway, M5: a deck with a sideboard. The sideboard ask
                             fires between the two games of a --games 2 match, since
                             M6's session survives `over` (protocol amendment M38)
  decks/yield-probe.dck      throwaway, M6 fix: 22 Thallid. Not an ask -- a MANDATORY
                             upkeep trigger, so the same yieldKey is back on top of the
                             stack every turn, which is the only way to assert that the
                             engine READS the auto-yield store rather than that the
                             bridge wrote it (gate step 10g, --require-yield-repeat)
  decks/fra-rw-aggro.dck     the user's Reality Fracture (FRA) pool, 40 + 10 sideboard,
                             plus .txt. Does NOT play on Forge 2.0.14 (19 ok, 31 missing);
                             it waits for an official Forge release (D109)

  docs/
    protocol.md              the living spec of the wire protocol and the frame log
    guides/java-for-typescript-people.md   the Java the bridge actually uses
    research/*.md            the fourteen reports this plan rests on (12 and 13 are
                             Tier 2's: the asset landscape, and the plan; 14 is the
                             engine: why Forge stays 2.0.14, and the day's checklist)
    research/patches/        the bridge port to Forge's 2.0.15-SNAPSHOT-09.27 daily
                             build and the javap seam diff it answers to. A PATCH, not
                             applied: it compiles only against that engine (D109)
    drafts/                  prepared, never loaded: decks/fra-gb-leftovers.dck, the
                             draft FRA opponent (D112), and a README saying so
    evidence/*.md            what was actually run, with real numbers
    ideas/arena-mode.md      M7: the tiers, the per-card cue table, the constraints
    licences are in NOTICE; Tier 2's asset provenance is tools/assets-manifest.json

  bridge/                    the only Java. Hosts the engine, redacts, serialises, serves /ws.
    build.sh  run.sh
    src/mtgtable/            Bootstrap Config HeadlessGuiBase Json JsonSelfTest Snap
                             GameLog GameLogSelfTest OverRaceSelfTest RecordMatch Smoke
                             WireGuiGame ReplyPool Transport MtgTable Ask AskSelfTest
                             ActGuard ActGuardSelfTest (D136: when undo/useMana may run)
                             NullTransport AutoTransport ConsoleTransport
                             WsTransport (M3: netty, ws://127.0.0.1:<port>/ws,
                             GET /health, one client, cancelAll on disconnect;
                             M50: /observe, the Origin allowlist)
                             WsObserveSelfTest (M50: observers and Origin, live)
                             (M51: --lan's token gate and --site-dir's static site,
                             in WsTransport) WsLanSelfTest (M51, live)
    out/                     gitignored

  web/                       the SPA. A pure function of the frame stream.
    index.html vite.config.ts tsconfig.json package.json
    src/
      protocol.ts            hand-written types, mirrors docs/protocol.md
      reduce.ts              (GameState, Frame) => GameState — pure, no DOM, no IO
      art.ts                 art.json lookup + generated text-card fallback
      main.tsx  styles.css
      keys.ts                (M4) ONE keymap table + two pure functions; the handler
                             and the `?` overlay both read it, so they cannot drift.
                             M7 added two rows (V, K) rather than a second keyboard;
                             D102 one more (W, the workshop, from the arena)
      useView.ts             (M7) #arena / #/arena / ?view=arena, with no router;
                             (D90) #cards / ?view=cards, the card browser;
                             (D102) #workshop / ?view=workshop, the workshop
      transport/transport.ts interface Transport { onFrame(cb); send(f) }
      transport/replay.ts    LogReplayTransport (fetch a .jsonl; play/step/scrub)
      transport/ws.ts        WebSocketTransport (M3: reconnect + resync)
      mana.css               (M5) a FILTERED extract of mana-font's stylesheet: the
                             package's two @font-face blocks replaced by one woff2, so
                             the build carries 1 font and not 9 (D32)
      render/                Board.tsx describe.ts ErrorBoundary.tsx ReplayControls.tsx
                             AskModal.tsx (M3)
                             M4: CardTile.tsx (THE card renderer -- every card in every
                             zone goes through it) ZoneRow.tsx HandFan.tsx PlayerRail.tsx
                             PhaseStrip.tsx StackPanel.tsx DecisionPanel.tsx LogDrawer.tsx
                             Mana.tsx CardZoom.tsx HotkeysOverlay.tsx ArrowsOverlay.tsx
                             and four pure modules `node --test` can import without a
                             DOM: labels.ts resolve.ts arrows.ts rects.ts useKeyboard.ts
                             M5: AskPicker.tsx (a question answered on the board)
                             ZoneBrowser.tsx CombatBands.tsx, and three more pure
                             modules: picker.ts (IS this question board-shaped?)
                             zones.ts (which zones may be browsed, by whom)
                             pool.ts (the mana pip -> useMana act mapping)
      arena/                 (M7) THE SECOND RENDERER. Lazily imported, so none of it
                             is in the 2D entry chunk. Arena.tsx (the <Canvas>, the
                             keyboard, the cue strip) DecisionLayer.tsx (the seat: the
                             engine's prompt and its two buttons, the per-seat HUD
                             plates, the ask modals over the canvas, and since slice 2
                             the camera switcher) and four pure
                             modules `node --test` imports with no three and no DOM:
                             layout.ts (THE resting pose -- the only thing that knows a
                             coordinate) camera.ts (the seven camera rules as numbers;
                             since slice 2 also the five views as poses, the seat
                             rule, and the director as a pure function)
                             colour.ts perf.ts (the dpr governor's ladder)
      arena/cues/            (M7) the cue engine, and it is data + arithmetic:
                             cues.json (28 cards + 7 archetypes) defaults.ts (every one
                             of the 25 event kinds) registry.ts (cue id -> arithmetic
                             over t in [0,1]) resolve.ts (the per-card -> archetype ->
                             default ladder) queue.ts stage.ts types.ts archetype.ts
                             validate.ts intake.ts. No three, no React, no timers
      arena/figures/         (Tier 2) the manifestation stage, pure like cues/: no
                             three, no React, no clock. figures.json (card name /
                             subtype / archetype -> model, tint, scale, clip aliases,
                             land tiles) models.json (GENERATED by
                             tools/build-figures.mjs -- never edit by hand) types.ts
                             resolve.ts (the figure ladder) pose.ts (figurePose: THE
                             pose of every creature) clips.ts (CLIP_FOR, the clip
                             arbitration, the rest stances) tiles.ts attach.ts
                             casting.ts (motes, spell forms, the combat freeze)
                             duelists.ts validate.ts; and (slice 3) traits.json
                             (THE per-card identity table: scale, hover, tint,
                             props, swarm, silhouette) traits.ts (its ladder)
                             props.ts (the closed prop kit, as data: kinds,
                             anchors per body, swarm layout); and (slice 4)
                             duelists.json (WHO stands for each seat: the look,
                             the costume, the gestures) — duelists.ts is its
                             validator and the duelists' pure poses and stand
                             points — and props.ts's COSTUME_SLOTS
      arena/scene/           (M7) the three half. CardPlane.tsx is THE card renderer of
                             the arena, the way CardTile.tsx is the board's;
                             CueRunner.tsx is the ONE useFrame; effects.ts is a fixed
                             pool of 45 meshes (26 at Tier 1, 38 with the 12 mana
                             motes, 45 with slice 3's per-card beats);
                             useCardTexture.ts, textFrame.ts,
                             cardMaterial.ts, geometry.ts (one quad for every card),
                             HitProxy.tsx, Table.tsx, rigs.ts, SceneStage.ts.
                             Tier 2: FigureLayer.tsx (THE figure renderer: one
                             <Figure> per pose, no useFrame of its own; since slice 2
                             also the DepartureField, the dying bodies) figureRigs.ts
                             models.ts (GLTFLoader + meshopt from web/public/models/,
                             the disc fallback) holoMaterial.ts (the one figure
                             shader) discs.ts tiles.ts casting.ts overlays.ts
                             busts.ts (each one InstancedMesh-based) colourCache.ts
                             and Post.tsx (the bloom pass, lazily imported); and
                             (slice 3) props.ts (the prop field: one InstancedMesh
                             per prop KIND, bound from DiscField.bind); and (slice 4)
                             DuelistLayer.tsx (the two duelists: one skinned mesh
                             each, props baked in, bound from BustField.bind) —
                             holoMaterial.ts now also paints the costume palette
    test/                    art.test.ts fixtures.test.ts reduce.test.ts synthetic.test.ts
                             human-seat.test.ts (the M2 corpus: ask/answer pairing, the
                             M8 clickability rule), ws.test.ts (the M3 transport:
                             reconnect, resync, a dropped act), ws-log.test.ts (a
                             recorded socket session folded through the real reducer;
                             its corpus is MTGTABLE_WS_LOGS, which check-all sets to
                             the logs step 10 just produced, and the committed fixtures
                             otherwise), ask-modal.test.tsx, and render.test.tsx, which mounts
                             <Board/> over every fixture. `npm test` is `node --test`
                             THEN `vitest run` -- Node's type stripping does not
                             transform JSX, so the render test needs vitest (a dev
                             dependency; a checkout with no node_modules fails the gate
                             with a message saying exactly that), plus (M4)
                             keys.test.ts and arrows.test.ts -- both pure, the second
                             building arrows for all 2,473 committed `state` frames;
                             and (M5) picker.test.ts (the board-shaped rule over every
                             ask in the corpus, printing the picker/modal census on
                             every run), zones.test.ts (no panel can show another
                             seat's hand), pool.test.ts, board-m5.test.tsx and
                             hooks-order.test.ts (a SOURCE SCAN: no React hook below a
                             component's early return -- the repo has no DOM test
                             environment and cannot catch a hook-count change; as of M7
                             it walks all 27 .tsx under render/ and arena/, 65
                             components, not just Board.tsx -- and since D90 cards/
                             too: 33 files and 86 components; since D102 workshop/
                             too: 35 files and 100 components in all);
                             and (M7) layout.test.ts (the resting pose over the whole
                             corpus, including hard rule 8's 3D half: every concealed
                             card is placed as a BACK) colour.test.ts
                             replay-cues.test.ts (every committed recording through the
                             real reducer and the real queue against a NullStage, with
                             the per-kind and per-card cue census printed each run)
                             cues-exhaustive.test.ts (the ladder is total; the cue file
                             is valid) camera.test.ts liveness.test.ts (the arena
                             imports no transport and decides nothing) perf.test.ts
                             and arena-hud.test.tsx (the life plates, over every frame);
                             and (Tier 2) figures.test.ts figure-pose.test.ts
                             clips.test.ts tiles.test.ts attach.test.ts stack.test.ts
                             -- every one a sweep of the whole corpus with no GPU --
                             and (slice 3) traits.test.ts (the identity census, and
                             every deck card's props rasterised from BOTH seats by
                             prop-raster.ts, a software rasteriser over the real
                             figures.glb) and facing.test.ts (one front, both seats);
                             and (slice 4) duelists.test.ts (the duelists' data, poses,
                             gestures and lanes over the corpus);
                             and (D90) cards-lib.test.ts (the library, offline: a fake
                             Scryfall on a fake clock) cards-api.test.ts (the dev route
                             on a real loopback socket over an index built from
                             fixtures/cards/) cards-ui.test.ts (the browser's pure half
                             and its import boundaries) and cards-render.test.tsx
                             (the page mounted over canned route answers);
                             and (D102) workshop.test.ts (the catalog against the
                             decks and the corpus, every rehearsal of every card
                             through the real queue, the overrides through the
                             validators, the meter against prop-raster.ts, and the
                             workshop's liveness and coupling list)
    src/cards/               (D90) THE CARD BROWSER, #cards. Lazily imported; public
                             card data, not a game. CardBrowser.tsx CardDetail.tsx
                             CardView.tsx (its own card renderer -- never CardTile,
                             D94) Pips.tsx; pure: search.ts decks.ts keys.ts text.ts
                             model.ts api.ts; devApi.ts is the DEV-SERVER-ONLY route
                             (vite.config.ts configureServer) over var/cards/ (D92)
    src/workshop/            (D102) THE WORKSHOP, #workshop: one card on a pedestal,
                             drawn by the arena's own scene. Lazily imported; edits
                             nothing under arena/ and names every arena export it
                             uses in Workshop.tsx's header. Workshop.tsx Pedestal.tsx;
                             legibility.ts (the meter, three); pure: synthetic.ts
                             (THE builder of its boards, D104) catalog.ts
                             catalogBuild.ts cueRows.ts clipCue.ts facing.ts
                             framing.ts tuning.ts (the overrides, D103) validated.ts
                             data.ts keys.ts; catalog.json is GENERATED by
                             tools/build-workshop-catalog.ts -- never edit by hand
    src/story/               (D124-D128) THE STORY PAGE, #story, and THE NARRATOR:
                             narrate.ts (the one narration -- tools/narrate.mjs is
                             its shell; erasable TypeScript, no import at all),
                             page.ts (the cursor's landmarks, the sentence cutter),
                             keys.ts, Story.tsx (lazy; handed frames and a cursor,
                             imports no transport)
    public/art.json          generated, gitignored
    public/models/figures.glb  (Tier 2) BUILT by tools/build-figures.mjs from five CC0
                             packs: 373,236 bytes since slice 4, recorded in
                             models.json and checked by figures.test.ts. Whether it
                             is committed is open; without it every creature draws
                             its disc and each duelist its bust
    t0-spike.html            (Tier 2) T0's go/no-go page; not part of the app

  tools/
    config.sh                sourced by the other scripts; reads config.json / $FORGE_JAR;
                             forge_home_make: a gate job's or a ten-games row's own Forge home
    check-forge.sh           assert jar + every class we depend on; print sha256
    make-forge-home.sh       symlink, profile properties, custom-card overlay
    README.md                every script here in one table: what it does, in the gate?,
                             needs the engine?
    lint-bridge.sh           grep lint over bridge/src and tools/**/*.java: the banned
                             accessors (hard rule 8), GamePlayerUtil.createAiPlayer outside
                             Bootstrap.java, the three game-thread hops (D181, D182)
    lint-bridge-selftest.sh  every lint rule fires on a planted snippet (D180; step 2b)
    villain-deck.sh          SOURCED by ten-games.sh and check-all.sh: the one name of
                             the villain deck the gate plays (VILLAIN_DECK overrides)
    check-deck.mjs           match setup: is every card of a .dck really in the engine?
                             static (scripts, editions), engine (Smoke), --scryfall
    build-deck.ts            more-villains: decks/specs/<deck>.json -> decks/<deck>.dck
                             through the card library; --check, --pool <colours>
    deck-smoke.sh            more-villains: 5 --transport auto games per AI deck;
                             over, redaction, the AI casts and attacks. NOT in the gate
    check-all.sh             the pre-commit gate; runs everything above, GATE_JOBS
                             jobs at a time (D129), a log per job and a timing table
                             under var/check-all/<run>/
    check-redaction.mjs      assert a recorded log leaks nothing (docs/protocol.md 9)
    check-redaction-selftest.mjs  run the checker over fixtures/negative/redaction/ and
                             assert every one-defect probe is REJECTED
    wire-drift.mjs           step 6 (D113): is a fresh seed-42 recording the same wire
                             as fixtures/games/g1.jsonl -- non-state frames, event
                             stream, phase walk, final board, the boards cut at a
                             turn/phase/outcome event, the stack; --strict is byte
                             for byte
    wire-drift-selftest.mjs  step 6 runs it first: re-partitions accepted, drifts rejected
    check-engine-crash.sh    step 12c (D115): an engine crash in a scratch Forge home
                             under var/crash-probe/ must fail the run and end the log
                             in an error notice and a null `over`
    make-sample-fixture.mjs  writes fixtures/synthetic/sample-handwritten.jsonl
    make-negative-fixtures.mjs  writes fixtures/negative/redaction/ from a real recording
    ws-smoke.mjs             M3: the two socket doorstep tests — connect/resync/concede,
                             and drop-mid-ask/reconnect/finish
    ws-auto-play.mjs         M3: a whole game over the socket with AutoTransport's own
                             dumb-human policy; --log writes a CLIENT frame log.
                             --refuse-first-ask drops the socket on the first `ask`
                             FRAME (the only cancelAll() coverage with a game
                             thread actually parked), reconnects and finishes.
                             --probe (M5) mirrors AutoTransport's probe policy line for
                             line, and is the only client that sends clickAbility
    ten-games.sh             M5's exit criterion as a command (--jobs N: N rows at a
                             time; --run-row N / --report: the gate's per-row jobs and
                             its summary, D129): ten --transport auto
                             games at seeds 1..10 alternating pacho-shield and the probe
                             decks, each asserted for `over`, zero UNIMPL (the summary
                             AND a raw grep), emit errors = 0, an ask-kind ceiling, the
                             typed acts the row exists to prove AND their effect, and
                             check-redaction.mjs.  check-all.sh runs it as step 9c.
                             Match setup added rows 11-14: your deck vs the villain
                             deck under each of the four AI profiles
    arena-bench.mjs          M7: report 09 §9.4's frame-time measurement -- headless
                             Chromium + SwiftShader against a PRODUCTION build served by
                             `vite preview`. Deliberately NOT in check-all.sh. Tier 2
                             added --index/--figures, --bloom/--no-bloom,
                             --reduced-motion, --dpr and --gpu gl (the real GPU)
    build-figures.mjs        Tier 2: five CC0 downloads, each verified by bytes and
                             sha256 -> web/public/models/figures.glb +
                             web/src/arena/figures/models.json (gltf-transform: prune
                             dedup, one plain material, a skin-aware join, the UAL's
                             hit and die retargeted onto the chibis in three; since
                             slice 4 the proportioned bodies' hair grafted on, a
                             costume slot per vertex, the head x1.3, every clip
                             retargeted by world-space delta, meshopt decimation to
                             the manifest's triangles; then weld unlit resample
                             merge meshopt and the assertions). Run by hand, not in
                             the gate
    assets-manifest.json     Tier 2: where every model came from -- URL, bytes, sha256,
                             date, and the CC0 licence badge verbatim on the day
    fixture-multiset-diff.mjs  the advisory 9b drift check: re-record a seed and compare
                             it to its committed fixture as a multiset, `seq` stripped
                             (a key an amendment added, absent from the committed side,
                             is ignored on the fresh side and said so)
    first-divergence.mjs     match setup: two same-seed games -> the first event that
                             differs, and whether the seat or the AI chose it (how
                             an AI-profile A/B is read; not in the gate)
    narrate.mjs              (D123) any frame log -> a turn-by-turn story for a
                             beginner; --turn N|A-B, --summary, --seat, --json.
                             Names only what the log's seat saw, never remembered.
                             A shell over web/src/story/narrate.ts (D124)
    story-shot.mjs           (D125) a picture of the #story page and what was on it,
                             headless Chromium over CDP against a dev server you run
                             (--frame, --keys, --click, --follow-for); not in the gate
    narrate-selftest.mjs     its gate, check-all's 12d: every fixture and every log
                             the gate records, hard rule 8 by ids and by deck names,
                             six negative controls, a client log's re-deliveries,
                             and fixtures/narrate/'s goldens (--write-golden)
    fetch-art.ts             every decks/*.dck -> web/public/art.json
    build-workshop-catalog.ts  (D104) decks/*.dck + fixtures/games/*.jsonl ->
                             web/src/workshop/catalog.json, the workshop's card
                             facts; --check exits 1 if it would change
    audit-deck.mjs           per card of a .dck: ok / missing / broken on the configured
                             engine (or FORGE_JAR=, or --overlay), from a throwaway Forge
                             home under var/audit-deck/. Read-only; needs bridge/out;
                             not in the gate. audit-deck/AuditDeck.java is its helper
    javap-seam-diff.sh       <old.jar> <new.jar>: the Forge API bridge/src links,
                             diffed class by class (99 classes). Read-only
    undo-race-repro.sh       D136: the undo race held open every run, guarded (refused
                             "Not now") and with the guard off (the write under a held
                             engine thread), 13 checks, ~15 s; not in the gate
    cubelab.sh               the cube lab (D293-D296): check / ratings init / run /
                             report; docs/guides/cube-lab.md is the manual. Gate 12g
    cubelab/                 its TypeScript (cube, ratings, weights, pick, draft,
                             deck, lab, engine, run, report, cli) and CubeLab.java,
                             the engine half (facts; a match worker), linted with the
                             bridge; web/test/cubelab.test.ts tests the rest
    card-library/            (D90) the local card index: build.ts (Scryfall's bulk
                             file + the MSH/MSC prints -> var/cards/cards.sqlite,
                             SQLite + FTS5, D91) images.ts (the image cache, D93)
                             query.ts (the read side and a JSON CLI) scryfall.ts
                             (the one door to Scryfall: headers, pacing, 429s)
                             deck.ts store.ts db.ts model.ts config.ts
                             make-fixture.ts; README.md is how to use it

  fixtures/
    games/*.jsonl            committed recordings. ENGINE-PRODUCED ONLY — this directory
                             is the Java-to-TypeScript drift contract and
                             web/test/fixtures.test.ts globs exactly it.
                             AI-vs-AI (RecordMatch, no seat): g1/g2/g3 are
                             pacho-shield.dck at seeds 42/7/2026; morph.jsonl is
                             morph-probe.dck (the only fixture with a face-down card);
                             disjoint.jsonl and future-sight.jsonl are the two-deck
                             recordings, and future-sight.jsonl is the only one whose
                             library.cards is ever non-empty.
                             HUMAN-SEAT (M2, MtgTable --transport auto, so the only ones
                             carrying input/ask/answer/notice/over frames and a
                             `transport` session-header key): human-auto-42/-7/-2026,
                             plus human-trample-7 (the assign_damage ask) and
                             human-scry-7 (input.focusCard).
                             M5 added four more, each one an ask kind that had never
                             been recorded from the engine: human-search-7
                             (choose_entities + delayedReveal), human-amount-7
                             (assign_amount, and confirm under --mana-lost-prompt),
                             human-number-7 (text) and human-ability-42 (ability_menu
                             plus 7 clickAbility ACTS).  A --probe recording says so in
                             its session header (policy/prefs, amendment M31)
    synthetic/*.jsonl        hand-built logs for shapes an AI-vs-AI game never emits: an
                             input whose focusCard is not in the snapshot, all ELEVEN ask
                             kinds with their answers, a face-down card in three
                             positions, surveil/phased/foretold. Kept apart because a
                             file written from the same reading of docs/protocol.md as
                             protocol.ts cannot detect drift -- but held to the same
                             check-redaction standard as an engine recording
    negative/*.jsonl         logs that must FAIL: an unknown frame type, a v mismatch,
                             and one the reducer accepts but the renderer cannot draw
                             (load it with ?replay=negative/render-crash.jsonl to see
                             the error boundary do its job)
    negative/redaction/      the CHECKER's negative controls: a clean slice of g1 plus
                             nine copies with exactly one defect each. A checker that
                             cannot fail proves nothing about the emitter it watches
    cards/                   (D90) the card library's offline test slice: Scryfall
                             lines REDUCED to the fields the library reads, cut by
                             tools/card-library/make-fixture.ts; no images
    narrate/                 (D123) the narrator's two golden files: g1's turns 1-3
                             and g1's --summary, byte for byte. Regenerated only by
                             node tools/narrate-selftest.mjs --write-golden

  forge-home/
    res -> ~/forge/res       symlink, gitignored
    forge.profile.properties generated by make-forge-home.sh (absolute paths), gitignored
    custom-cards/            committed card-script overrides, copied into
                             var/forge/custom/cards/ by make-forge-home.sh (D14)

  var/                       gitignored: Forge's redirected profile, logs, frame logs;
                             (D90) var/cards/ -- the card index, the bulk file, the set
                             syncs and icons, and the image cache
                             images/<scryfallId>/<size>[.back].<ext> (D93)
  scripts/play.sh            M3/M6: check-forge -> build -> the ws bridge -> /health ->
                             vite.  Defaults to --games 3 --keep-open (M6);
                             --engine-only (D285) stops after /health, for ForgeCoach;
                             --lan (D287-D289) for ForgeCoach on a phone; starts the
                             coach helper beside the engine (D292; --no-coach)
  scripts/spectate.sh        spectating (D118–D122): two AIs recorded by RecordMatch,
                             paced, into var/spectate/, followed live in the arena
```

## The documents

| File | What it is |
|---|---|
| [`docs/protocol.md`](docs/protocol.md) | **The wire spec.** The Java emitter and the TypeScript reducer are both written against it. Change it first. Its *Amendments* list at the top says what changed and why. |
| [`PLAN.md`](PLAN.md) | The milestones M0..M7 and every lane since, the deferred list, and the questions only the user can settle; *Open now*, at the top, indexes every open follow-up and question. |
| [`DECISIONS.md`](DECISIONS.md) | Every load-bearing decision, dated, with the alternatives that were rejected. A decision's number is final and gaps are allowed (**D200**); the most recent are **D200–D202**. |
| [`CLAUDE.md`](CLAUDE.md) | Working conventions: the hard rules, the environment, the gate and the policies (commits, decision numbers); `bridge/`, `web/`, `web/src/arena/` and `tools/` each have a `CLAUDE.md` of their own for the conventions of that code. |
| [`docs/guides/java-for-typescript-people.md`](docs/guides/java-for-typescript-people.md) | The Java this repo actually uses, explained from TypeScript — plus the `javap`-first workflow, the enum/nullability traps the wire format depends on, and (chapter 9) a map of `WireGuiGame.java` with one ask and one act followed through the threads. |
| [`docs/research/05-architecture-synthesis.md`](docs/research/05-architecture-synthesis.md) | The architecture spec the whole plan rests on. |
| [`docs/research/03-scryfall-card-library.md`](docs/research/03-scryfall-card-library.md) | Scryfall's API, images and terms, the Forge name mapping, and §4 — the spec the card library was built to (D90–D94). |
| [`tools/card-library/README.md`](tools/card-library/README.md) | The card library's manual: the build, the image cache, the query CLI, what is on disk under `var/cards/`, Scryfall's terms as code, and what is not done. |
| [`docs/research/06-hidden-information-audit.md`](docs/research/06-hidden-information-audit.md) | Every reveal path in Forge, its wire channel, and its leak signature. The basis of hard rule 8. |
| [`docs/research/07-wireguigame-spec.md`](docs/research/07-wireguigame-spec.md) | The M2 implementation spec: 37 members, the thread model, the eleven ask kinds. |
| [`docs/research/08-deck-card-coverage.md`](docs/research/08-deck-card-coverage.md) | Does Forge implement this deck's 28 cards faithfully? (One does not — see D14.) |
| [`docs/research/10-board-ui-spec.md`](docs/research/10-board-ui-spec.md) | The M4 board: component tree, layout, card tiles, arrows, the three evenings. (One number in §2.2 is 23 px out against the built board — PLAN's M4 follow-up 2.) |
| [`docs/research/11-engine-comfort-features.md`](docs/research/11-engine-comfort-features.md) | M6: phase stops, pass-to, auto-yield, auto-pay, undo, concede, new game — all as engine features, not client state machines. |
| [`docs/research/09-arena-tier1-plan.md`](docs/research/09-arena-tier1-plan.md) | M7 Tier 1: the arena's spec — the offset model, the cue table, the camera, the performance budget. |
| [`docs/research/12-arena-tier2-assets.md`](docs/research/12-arena-tier2-assets.md) | M7 Tier 2's asset landscape: which packs are really CC0, what is inside the files, the gltf-transform pipeline, and the two drei traps. |
| [`docs/research/13-arena-tier2-plan.md`](docs/research/13-arena-tier2-plan.md) | M7 Tier 2's plan, written against the Tier 1 code: the manifestation stage, the pose-versus-cue rule, the clip lane, the evenings T0–T14. |
| [`docs/research/14-engine-upgrade.md`](docs/research/14-engine-upgrade.md) | Engine and sets: why mtg-table stays on Forge 2.0.14 until an official release ships Reality Fracture (a card-script overlay on 2.0.14 fails the deck; a port to the daily build was ruled out by the user), the bridge and gate defects the two spikes found, and §0, the checklist for the day. [`docs/evidence/engine-upgrade.md`](docs/evidence/engine-upgrade.md) is what was measured; report 08 §9 is the FRA deck card by card. |
| [`docs/research/15-art-direction.md`](docs/research/15-art-direction.md) | Art direction: why the figures read "dull and bare" beside the card art, the comic look (cel bands, ink, halftone, a contact shadow, a stage) and the spike that measured it, the motion and geometry vocabularies, an art-derived palette, Tier 3's measured feasibility, and §9's three lanes. Lane LOOK built §9.1 (**D137–D146**), Lane MOTION §9.2 (**D147–D155**) and Lane BODIES §9.3 (**D156–D165**); [`docs/evidence/look.md`](docs/evidence/look.md), [`docs/evidence/motion.md`](docs/evidence/motion.md) and [`docs/evidence/bodies.md`](docs/evidence/bodies.md) are what was measured. |
| [`docs/evidence/`](docs/evidence) | What was actually run, with real numbers — `m4-board.md` is the board: measured geometry, the live games, the arrows, the keyboard, and the gate run that closed M4. M5 is three files: `m5-probes.md` (the probe decks, which ask kinds the engine can actually reach, and the two unreachability proofs), `m5-board.md` (the board half: the picker rule with its census, the mana pips, the zone browsers, the band strip) and `m5-fixes.md` (two verification passes, thirteen findings, each with its reproduction). M6 is two: `m6-engine.md` (the session that outlives `over`, the five acts with the state each changed, the `sideboard` recording, the gate's new 9d and 10g) and `m6-board.md` (the dots going live, Pass-To, auto-yield, Undo, New Game, `Space` following the engine's focus). M7 is `m7-arena.md` (Tier 1) and `m7-tier2.md` (Tier 2's first slice: the figure census, the clip lane, the terrain, the auras, the stack, the bench on SwiftShader and on the GTX 1080, the live game), then `m7-tier2-slice2.md` (the humanoids, the death, the camera views), `m7-tier2-slice3.md` (per-card identity) and `m7-tier2-slice4.md` (the proportioned bodies, the costumes and the duelists). `card-library.md` is the card library and the `#cards` browser: the real build, the measured request rates, the images, the queries and their latency, the search false negatives the review found and their fix. `workshop.md` is the workshop: what it is made of, the tests (every rehearsal of every card through the real queue, the meter against `prop-raster.ts` pixel for pixel), the drawn heights, the build, the screenshots, the fix pass and the rebase onto slice 4. `engine-upgrade.md` is the engine question: the overlay and snapshot spikes, the three deck audits, the saved port's checks and the draft opponent's games. `hardening.md` is the 2026-09-27 small-defect pass: step 6 under load (the loaded re-recordings and why neither the byte diff nor the multiset survives them), the `newGame` race and its forced reproduction, the engine crash, and the four smaller fixes, each with its negative control. `narrate.md` is the frame-log narrator: what it reads and why the events and not only the snapshots, the golden files, a whole villain game told as a story, the hidden-information checks and their five negative controls, and the client logs. `story.md` is the `#story` page: the CLI's byte-identity across the move to one module, the page's corpus sweep and its control, the screenshots (g1 mid-game, a spectated game followed live), the cursor across views, and the build. `look.md` is Lane LOOK, the comic look: the merge onto `f6bad35`, the verification pass, the draw-call census, the frame times on the GTX 1080 and SwiftShader against the hologram, every identity prop read under the ink from both seats, the stage's tones and the pictures. `motion.md` is Lane MOTION, the comic motion: the merge onto LOOK's tip, the lane's A/B (comic FX off is the old film, op for op), the stars kept off the bodies, the speed lines beside them, frame times and pictures. `bodies.md` is Lane BODIES: resting poses, hair, faces, draped coats and the art's palette — the merge onto MOTION's tip first (the tapped mount, each palette gate removed in turn, the face and the identity raster on LOOK's seats, the bench and the `g1`@355 census), then the lane's three fix passes. |

## Licence

GPL-3.0-or-later, the whole repository, from the first commit. The Java bridge
implements Forge interfaces on the same classpath in the same JVM, which makes it
unambiguously a derivative work of Forge. See [`LICENSE`](LICENSE) and
[`NOTICE`](NOTICE).

mtg-table is unofficial Fan Content permitted under the Wizards of the Coast Fan
Content Policy. Not approved, endorsed, or affiliated with Wizards. Portions of
the materials used are property of Wizards of the Coast. (C) Wizards of the Coast
LLC.
