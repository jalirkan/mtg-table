# CLAUDE.md — working conventions for this repo

Read this before touching anything. Then read
[`docs/research/05-architecture-synthesis.md`](docs/research/05-architecture-synthesis.md)
**in full** — it is the spec, not background reading.

mtg-table is a local browser client for Magic: The Gathering. It runs the
open-source Forge engine (GPLv3, Java) headless as rules engine and AI opponent,
with a TypeScript/React front-end talking JSON over a loopback WebSocket. The
architecture is fixed. The user is a hobbyist learning Magic; the deck in play is
`decks/pacho-shield.dck` (40 cards, Marvel Super Heroes / MSH + MSC). The user's
Reality Fracture pool, `decks/fra-rw-aggro.dck`, is prepared and **does not play
on the engine we run** — it waits for an official Forge release that ships the set
(**D109**; see *Environment*). Do not try to make it play early.

---

## The eleven hard rules

Every one of these has a verified failure behind it. Do not relitigate them in
code; if you think one is wrong, say so in prose first.

1. **`GuiBase.setInterface(new HeadlessGuiBase(...))` is the FIRST Forge call in
   any process.** `ForgeConstants`' static initializer calls
   `GuiBase.getInterface().getAssetsDir()`. **Never touch `forge.GuiDesktop`** —
   its static init throws `HeadlessException`.
2. **`IGuiBase.isGuiThread()` must be
   `"mtg-table-EDT".equals(Thread.currentThread().getName())`,** backed by a
   single-thread executor whose thread carries that name. A constant `true` throws
   `IllegalStateException` at the mulligan, from
   `FThreads.assertExecutedByEdt`.
3. **The Forge view graph (`GameView` / `PlayerView` / `CardView`, `Tracker`) is
   walked ONLY on the game thread** (`forge.util.ThreadUtil.isGameThread()`).
   Snapshots are built on the game thread via a hand-registered
   `forge.gui.control.GameEventForwarder` / `handleGameEvents` — **never** in
   `updateCards` / `updateZones`, which arrive on the EDT. Off-thread walks
   corrupt the `Tracker` *silently*.
   **`isGameThread()` is not the whole rule.** It is a bare
   `getName().startsWith("Game")` and `ThreadUtil.invokeInGameThread` is a
   **cached pool** named `Game`, so anything hopped onto it runs on a *second*
   `Game-n` worker while `Game-0` runs the match — and passes the assert. Three
   places in the bridge make that hop, and each one carries a written exclusion
   argument: `captureOutcome` (only at game end), `asyncAbilityMenu`
   (**D22**'s `inputGen` stamp, sound because it is only reached from inside a
   live input) and `refreshState` (**D39**: the stamp *plus* a positive
   "the engine is parked" predicate, because its four acts can arrive at any
   time). **A fourth hop needs a fourth argument, in `DECISIONS.md`** — a green
   run is not one, which is what *silently* means.
4. **Never call `FModel.getDecks()`** or anything reaching
   `DeckStorage.adjustFileLocation` — it renames a `.dck` to its `Name=` metadata,
   moves it up a directory, and deletes unparseable ones. Load decks with
   `forge.deck.io.DeckSerializer.fromFile`. `tools/lint-bridge.sh` (rule 10) bans
   `getDecks(` under `bridge/src`.
5. **Do not call `Game.setNoGUIUser()`** — it exists in the 2.0.15 source checkout
   but is absent from the 2.0.14 jar. **Do not import gson** — absent from the
   jar. JSON parsing: `org.eclipse.jetty.util.ajax.JSON` (bundled; numbers arrive
   as `Long`, arrays as `Object[]`). JSON writing: our own small `StringBuilder`
   writer in `Json.java`. **Both bans outlive the version that motivated them:**
   the `2.0.15-SNAPSHOT-09.27` daily build carries `setNoGUIUser()` and 212 gson
   classes (report 14's spike B), and the lint still rejects both on any engine,
   because nothing here needs either and the bridge must keep compiling against the
   pinned jar, which is 2.0.14 today.
6. **Run the JVM with exactly:**
   ```bash
   env -u DISPLAY java -Xmx4096m -Djava.awt.headless=true \
       -Dio.netty.tryReflectionSetAccessible=true -Dfile.encoding=UTF-8 \
       -Dsentry.uncaught.handler.enabled=false \
       -cp "bridge/out:$FORGE_JAR"
   ```
   The sentry flag is **load-bearing**: without it, startup crashes become a
   silent `exit 1`.
7. **Licence is GPL-3.0-or-later for the whole repo.** Copy **no** code from
   `witchesofthehill/manabrew` (AGPL-3.0-or-later) — lifting any of it relicenses
   this project. Copying from Forge itself is fine (same licence), but confirm it
   compiles against the pinned jar first — 2.0.14 today (*Environment*), not the
   2.0.15 source checkout and not a daily build.
8. **Hidden information: exactly one card-serialisation function,** and exactly
   one function that puts an engine *string* on the wire. Three gates, in order:
   the caller's own `zoneHint` (never `cv.getZone()`, which is fail-open when
   null), `CardView.canBeShownTo(viewer)`, then
   `CardView.canFaceDownBeShownTo(viewer)` — the second predicate is not optional,
   because `canBeShownTo` returns `true` unconditionally for `Battlefield` and
   `Stack`, face-down cards included.
   - A redacted card carries **exactly five keys**, `{id, zone, owner, controller,
     hidden:true}`, and nothing else. That is the **only** concealed shape.
   - A face-down card whose identity is concealed is **not** a separate shape: it
     takes the full branch, and its *face* is what is missing — Forge's own
     face-down characteristic gives `name: ""`, `setCode: "???"` and (outside
     `battlefield`/`stack`) `types: ""` with null P/T — plus `alt: null`. The
     eleven-key `faceDownHidden` object M1 invented is **superseded** (amendment
     P3): `protocol.ts` still reads one, no emitter writes one, and
     `tools/check-redaction.mjs` fails any file that carries one.
   - `getAlternateState()` appears in the bridge **once**, inside the `alt` block,
     under `isFaceDown() && canFaceDownBeShownTo(viewer)`.
   - **A library carries `count` plus only the cards `canBeShownTo` allows** (a
     continuous may-look static such as Future Sight) — never a stub.
   - Every card inside an `ask` or `input` body goes through the same function,
     and every option **label** through the same gate. The label is the leak that
     will actually happen.
   Forge does no server-side redaction, so the default failure mode is shipping
   the opponent's hand. `docs/protocol.md` §3.3 and
   `docs/research/06-hidden-information-audit.md` are the long form.
9. **Every script must run from `/home/justin-a/code/mtg-table` as its working
   directory** and must read the jar path from
   `/home/justin-a/code/mtg-table/config.json` or the `FORGE_JAR` env var. **Never
   hardcode the jar path in Java.**
10. **The lints are part of the build.** `tools/lint-bridge.sh` runs from
    `bridge/build.sh` and fails it. It greps `bridge/src` for, and rejects:
    `getDecks(`, `setNoGUIUser`, `com.google.gson`, `getAlternateState` (outside
    the one `alt` block in `Snap.java`), `getBackup`, `getLeftSplitState`,
    `getRightSplitState`, `getOracleName`, `getCloner`, `getMergedCards`,
    `mayView`, `mayFlip`, `mayLookAtAllCards`, `canBeShownToAny`, `getGameLog`
    (allowed only in `Smoke.java`, which emits no protocol — see the ALLOW note
    at that rule's call site in `tools/lint-bridge.sh`),
    `GameView.getDeck`, `GameView.getGame`, `targetDescription(`,
    `stackDescription(`, `outcomeStrings(`, `matchSummary(`, and
    **`GamePlayerUtil.createAiPlayer` anywhere but `Bootstrap.java`** (match
    setup: the two-argument overload passes an empty `profileOverride`, whose
    branch calls `ForgePreferences.save()`; the method reference and a static
    wildcard import of `GamePlayerUtil` are banned for the same reason). It also rejects the
    identifier **`CardView` in any `bridge/src/mtgtable/*.java` other than
    `Snap.java`** — that is how "one serialisation function" becomes mechanical.
    A file that legitimately needs it goes in the lint's ALLOW list (section 5 of
    `tools/lint-bridge.sh`, the `allow_cardview` case) **with a one-line
    justification**. The list is **three entries and is meant to stay short** —
    adding a fourth is a decision, not a formality:
    - `Snap.java` — THE serialiser. This is the point.
    - `RecordMatch.java` — its `SpectatorGui` implements `IGuiGame`, whose own
      signatures take `CardView`; every body is a logged no-op returning a
      documented default and none of them reads a field off the card.
    - `WireGuiGame.java` (**added in M2**) — the same exemption for the same
      reason, over all 37 members: `showPromptMessage`, `setCard`,
      `setSelectables`, `assignCombatDamage`, `manipulateCardList`,
      `getAbilityToPlay` and the rest take `CardView` in their Forge signatures.
      A push reads `getId()` and nothing else (report 07 R1), and **every** card
      and **every** option label that reaches the wire goes through
      `Snap.card` / `Snap.label` — the same single gate the zone walk uses.

    **M3 added no fourth entry**, and that is worth noticing: `WsTransport` is a
    netty server that never names a `CardView` — it moves strings the emitter has
    already gated. A transport that needed the type would be a transport that had
    grown a second serialiser.

    **M6 added a second budgeted call: lint rule 4b,
    `StackItemView.getKey()` — allowed exactly once**, on the tagged
    `// ALLOW getKey:` line in `WireGuiGame.rawYieldKey()`. That key is
    `CardView.toString() + ": " + the ability's text`, i.e. a card name, its id
    and its rules text, so the wire carries an opaque **bridge-minted handle**
    (`"y3"`) instead and `act: setYield` resolves it back (**D42**, amendment
    **M36**). The rule derives its receivers from every identifier *declared*
    `StackItemView` under `bridge/src` rather than matching the variable name —
    it matched `si.` once, and `top.getKey()` sailed through — so renaming the
    variable cannot turn it off. `tools/check-redaction.mjs` is the other half:
    a log whose `yieldKey` contains a space or a `(` fails.

    Three conventions the lint cannot check, stated in a comment block at the top
    of `Snap.java` (`docs/guides/java-for-typescript-people.md`): **enums go on
    the wire via `.name()`, never `toString()`** (`forge.card.CardRarity`
    overrides `toString()`); **nullable integers use `JsonOut.nInt`, never
    `n(String,long)`**; and **every `CardStateView`-derived key is written in both
    branches of the null-state check**, so the renderer never tests for key
    absence.


    **Threads.** `ThreadUtil.isGameThread()` is a bare
    `getName().startsWith("Game")`, so a thread of ours that drifted into that
    prefix would be allowed to walk the view graph. Two mechanical guards, and
    both must stay complete: `HeadlessGuiBase` asserts at class-init that **every
    one of the eight thread names we create** starts with `mtg-table-`
    (`EDT_NAME`, `BG_NAME`, `GameLog.THREAD_NAME`, `Transport.IO_THREAD_NAME`,
    `ReplyPool.WATCHDOG_THREAD_NAME`, `AutoTransport.WATCHDOG_THREAD_NAME`,
    `ConsoleTransport.QUIT_THREAD_NAME`, `WsTransport.WS_THREAD_NAME` (**M3** —
    netty's event loop, `mtg-table-ws`; its factory is `this::newEventLoopThread`
    rather than `Executors.defaultThreadFactory()`, which the lint also bans) —
    all compile-time constants, so naming them there loads no class and rule 1 is
    untouched), and **`tools/lint-bridge.sh` section 6** greps
    every `new Thread(` under `bridge/src` for a name on the same line that
    resolves to such a constant. The lint is the half that catches a thread no run
    happens to construct; put the name on the `new Thread(` line (hand it a method
    reference rather than an inline lambda) or the lint fails.

11. **The bootstrap sets three things before the first game, in every process,
    and the ordering around `FModel.initialize` is load-bearing.** One
    `Bootstrap.java`; `Smoke` and `RecordMatch` both call it. In order:
    - **asserted before** `initialize`: `FPref.LOAD_CARD_SCRIPTS_LAZILY` is
      `"false"` (its default) — **D14**'s overlay depends on the eager load
      order;
    - **set before** `initialize`:
      `setPref(FPref.ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE, "true")` —
      `FModel`'s `StaticData` supplier reads it as a constructor argument and
      memoizes (`FModel.java:83-90`), so setting it afterwards does nothing.
      Without it, `StaticData.loadCustomCards()` marks **D14**'s script custom
      and `DeckFormat.java:449` rejects `decks/pacho-shield.dck` outright. It
      relaxes conformance for *every* custom card, which is only acceptable while
      `forge-home/custom-cards/` holds exactly one file (see **D14**) — and
      **D111** keeps it at one: **no hand-written card script, and no copy of a
      newer Forge's scripts, goes there to bring a new set in early**. A card the
      pinned engine lacks is absent until an official release ships it;
    - **set immediately after** `initialize`:
      `setPref(FPref.UI_SELECT_FROM_CARD_DISPLAYS, "false")` — in memory,
      **never `save()`**. Decision **D13**: with the pref on, a scry 1 ships the
      player's whole library into `manipulateCardList`, and library searches
      route to a board-click input for cards the client was never sent.

## Environment

- Ubuntu. **OpenJDK 21 JRE only — there is no `javac` binary.**
  - compile: `java -m jdk.compiler/com.sun.tools.javac.Main`
  - inspect: `java -m jdk.jdeps/com.sun.tools.javap.Main`
  - **Never pass `--release`** — a JRE image has no `ct.sym`. Plain output is Java
    21 bytecode and runs fine.
- No Maven, no Gradle. **Do not install them.** There is no Maven coordinate for
  Forge anywhere; `forge:forge-game:2.0.14` will never resolve.
- Node v24.20.0, npm 11. Node 24 runs `.ts` files directly via type stripping, so
  `tools/fetch-art.ts` needs no build step.
- No sudo.
- **The engine: Forge 2.0.14 at `/home/justin-a/forge`, and only that.** Fat jar
  `forge-gui-desktop-2.0.14-jar-with-dependencies.jar`, **39,383,858 bytes, sha256
  `3c0a7c385b9207e593fe149255e00d1cd7e556809f138568d07e3828b78e5dd9`**, manifest
  `Implementation-Version: 2.0.14-SNAPSHOT-08.08`, `build.txt`
  `2026-08-08 22:49:26`; resources `/home/justin-a/forge/res`, beside the jar,
  which is where `tools/make-forge-home.sh` derives them from.
  - **How it was obtained:** it is the user's own install, Forge's `.tar.bz2`
    distribution extracted as-is. This repo never downloads, copies or commits an
    engine (D2; `*.jar` is gitignored).
  - **How it is pinned:** `config.json`'s `forgeJar` names it by absolute path
    (`FORGE_JAR` in the environment wins, hard rule 9). `./tools/check-forge.sh`
    prints its sha256 — **it must print the one above** — and every recording's
    session header carries it as `forgeJarSha256` (all 18 committed
    `fixtures/games/` recordings name this build). Nothing asserts the hash yet;
    report 14 §5.2 is the specified, unbuilt mechanism for the day.
  - **What may replace it (D109, D110):** only an asset of a **tagged official
    Forge release**, one engine at a time, unpacked under the repo's gitignored
    `var/forge-engine/<version>/` — never Forge's rolling `daily-snapshots` build,
    and never over `~/forge`. A daily build may be *measured* through `FORGE_JAR=`
    in a throwaway location; it is never named in `config.json` and nothing is
    merged against it. The version string does not tell the two apart — 2.0.14's
    own reads `-SNAPSHOT-08.08` and `BuildInfo.isDevelopmentVersion()` is true on
    it — so where the archive came from does, and `tools/audit-deck.mjs` says
    whether the set actually loads. The switch is report 14 §0's checklist, and
    it starts only when the user says the release is here.
  - **`~/forge` and `~/.forge` stay untouched, always** — before a switch, after
    it, and as its rollback (*Never write outside this repo*).
  - **Reality Fracture (FRA) is not in this engine.** Its edition file lists 43
    of the set's 461 entries; the user's deck audits **19 ok, 31 missing, 0
    broken** (copies, main + sideboard), and Forge would drop the 31 silently.
    That is expected, not a bug to fix: no overlay, no hand-written script
    (**D111**), no snapshot port. `docs/research/14-engine-upgrade.md` is the
    decision and the plan; `docs/research/patches/` holds the saved bridge port to
    the `2.0.15-SNAPSHOT-09.27` daily build and the seam diff it answers to — a
    patch that compiles only against that engine and is **never applied early**.

## Build and run

```bash
./tools/check-all.sh                        # THE pre-commit gate; chains everything below
./tools/check-forge.sh                      # gate: asserts the jar + 8 classes, prints sha256
./tools/make-forge-home.sh                  # symlink res, profile properties, custom-card overlay
./tools/lint-bridge.sh                      # the banned-accessor grep (hard rule 10)
./bridge/build.sh                           # javac via the jdk.compiler module; runs the lint
./bridge/run.sh mtgtable.Smoke              # M0
./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --seed 42 \
    --out fixtures/games/g1.jsonl           # M1
node tools/check-redaction.mjs fixtures/games/*.jsonl fixtures/synthetic/*.jsonl
node tools/check-redaction-selftest.mjs      # the checker's own negative controls
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
./tools/ten-games.sh --games 3              # the first three rows, for a quick look
./tools/ten-games.sh --seed 13              # match setup: one row, you vs decks/doom-legion.dck, Reckless
./bridge/run.sh mtgtable.MtgTable --transport console --seed 42 \
    --ai-deck decks/doom-legion.dck --ai-profile Reckless   # match setup: the AI's deck + Forge profile
node tools/check-deck.mjs decks/doom-legion.dck --scryfall   # match setup: is every card in the engine?
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --mana-lost-prompt \
    --seed 7 --game-id human-amount-7 \
    --deck decks/amount-probe.dck --deck2 decks/morph-probe.dck   # M5: a probe run
node tools/audit-deck.mjs decks/pacho-shield.dck   # per card: ok / missing / broken on the
                                            # configured engine; read-only, a throwaway home
                                            # under var/audit-deck/; needs bridge/out. Not in
                                            # check-all. decks/fra-rw-aggro.dck: 19/31/0, exit 1
./tools/javap-seam-diff.sh <old.jar> <new.jar>     # the bridge's Forge API, diffed (read-only)
```

**`./scripts/play.sh` is the M3 command and M6's headline one** — check-forge →
`bridge/build.sh` → the ws bridge in the background (`var/play/server.log`) → poll
`GET /health` → vite, with the board at `http://127.0.0.1:<webPort>/?ws=1`. Ctrl-C
stops both halves: vite is exec'd directly
(`env -C web web/node_modules/.bin/vite`) so the pid the script holds is the
server and not an `npm` wrapper that leaves it reparented.

**M6 changed two defaults and PLAN.md §M6's one-line command is why.** A bare
`./scripts/play.sh` now passes **`--games 3`** (unless you gave a `--games` of
your own) and **`--keep-open`** (unless you pass `--no-keep-open`). Both are
needed for the board's New Game row to have a session to act in: without
`--games` the JVM stops after game 1, and without `--keep-open` it closes the
socket the instant the LAST `over` lands — which is the moment the row appears.
The linger lasts **as long as the browser is connected** — it is the window the
New Game row lives in — and returns the moment the client disconnects, so a
scripted client pays nothing for it. `KEEP_OPEN_MS` = 30 s is only the cap for a
session nobody ever attached to.

```bash
./scripts/play.sh                                   # THREE games vs decks/doom-legion.dck, a random seed
./scripts/play.sh --seed 42                         # a reproducible shuffle
./scripts/play.sh --mirror --ai-profile Cautious    # match setup: the AI's deck and Forge profile
./scripts/play.sh --port 8643 --web-port 5174       # beside a running one
./scripts/play.sh --no-open --no-keep-open          # no browser; exit the moment the match ends
./scripts/play.sh -- --games 1                      # one game (your --games wins)
./scripts/play.sh -- --ai-name "Doom"               # everything after -- goes to MtgTable
```

**Match setup (amendment M44, D105–D108) chose what the seat plays against.**
`--ai-deck <path>` (the same flag as `--deck2`; two different values is an
error) gives the AI a deck of its own, and `--ai-profile
<Default|Cautious|Reckless|Experimental>` picks one of the `.ai` files in
`forge-home/res/ai/`, case-insensitively, **validated before
`FModel.initialize`** — a bogus name exits in about a second with the list. Both
work on `mtgtable.MtgTable` and on `scripts/play.sh`, which also takes `--deck`
and `--mirror`. **Two defaults, on purpose (D106):** `config.json`'s `match`
block (`deck`, `aiDeck` = `decks/doom-legion.dck`, `aiProfile`, `games`) is read
by `play.sh` **and nothing else**, so a bare `play.sh` plays the Doom Legion while
a bare `MtgTable` — and every gate step — plays a mirror under `Default`; the
gate passes every deck and profile it means on its own command lines, and the
villain deck it plays is named once, in `tools/villain-deck.sh`. **Every AI seat
in every process goes through `Bootstrap.createAiPlayer(name, avatar, profile)`**,
never `GamePlayerUtil.createAiPlayer` directly (lint rule, hard rule 10): the
two-argument overload passes an empty `profileOverride`, and that branch can call
`ForgePreferences.save()` (D107). **A profile is not a difficulty** — 121
heuristic values whose effect is situational; against the automated seat Cautious
and Reckless were not measurably different (`docs/evidence/match-setup.md` §P) —
so never describe one as harder or easier. `hello_ok.match` names the AI's deck
by its `Name=` and card count **only**, never a path, hash or list (D105);
`seatMatchOf()` in `web/src/protocol.ts` is its one reader, and the board's rails
and the arena's seat plates print it. `decks/README.md` is every deck; D108 is
why Doom Legion is built the way it is, and its four rules (a Forge script, no
`AI:RemoveDeck:All`, the AI casts it, the redaction gate passes with no flags)
are what any card added to an AI deck must meet.

**M7 adds `--arena`, and it is one URL fragment.** The arena is a second
*renderer* over the same frame stream, so the bridge, the socket, the reducer and
the frame log are untouched and `#arena` is the whole of the difference:

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

`V` switches renderer mid-game over the same socket without dropping a frame and
`K` skips every animation on screen. **Since Tier 2's slice 2** `1`–`5` pick a
camera view (table, shoulder, opponent's shoulder, side-on, low), `6` or `0` the
auto director and `O` spectator mode — 3, 4 and the director only when no seat is
live — and the switcher beside the cue strip does the same by click. The escape hatches are `?arena=off` (render
the 2D board even at `#arena` — WebGL can fail for a reason the player cannot
see) and `?dpr=<n>` (pin the render resolution, which also turns the automatic
ladder off); `?stats=1`, `?grid=1` and `?glinfo=1` are the debug flags, and
`window.__mtgArena` is the dev-only handle the cue-tuning loop uses
(`import.meta.env.DEV` only — a production build carries none of it).

The socket on its own, with no browser:

```bash
./bridge/run.sh mtgtable.MtgTable --transport ws --port 8642 --seed 42 --keep-open
node tools/ws-smoke.mjs --port 8642                      # connect → resync → concede
node tools/ws-smoke.mjs --port 8642 --disconnect-mid-ask # drop mid-ask, reconnect, finish
node tools/ws-smoke.mjs --port 8642 --concede-before-input   # M11's exception path
node tools/ws-auto-play.mjs --port 8642 --log var/ws-auto.jsonl   # a whole game
node tools/ws-auto-play.mjs --port 8642 --refuse-first-ask        # drop ON an `ask`
node tools/check-redaction.mjs var/ws-auto.jsonl         # a CLIENT log (amendment M17)
```

**The socket's own two rules.** The ask timeout over ws is **0 — infinite —
while a client is connected**, and `NO_CLIENT_ASK_TIMEOUT_MS` (120 s) only while
none is; **and as of the M6 verification fix the two post-`over` waits obey the
same rule** — `MtgTable.awaitNextGame` waits for `act: newGame` with **no
deadline while a client is connected**, falls back to 30 s while nobody is, and
returns immediately once a client that *was* connected leaves, so a scripted
client still pays nothing. Before that they were a flat 30 s wall clock that
fired under a connected browser, which closed the socket out from under the
board's own **New Game** row — the milestone's headline flow, dead-ended by its
own linger; what ends a wait is `onDisconnect()` → `ReplyPool.cancelAll()`, after
which the pool is reopened so the next ask parks and is re-delivered on reconnect
(**D24**, amendment M19). And **one client at a time**: a second socket gets one
`notice` and close code **4001**, the client treats any code ≥ 4000 as terminal
(**D25**, amendment M13). A `resync` re-delivers the cached `hello_ok` / `state` /
outstanding ask **verbatim** — same `seq`, same `t` — and re-emits the `input`
for real through `onResync()` (**D27**, amendments M10/M16), so a client log's
`seq` series is neither contiguous nor monotonic and needs
`check-redaction.mjs --client-log`. **The `input` half is conditional as of
amendment M42**: it is emitted only once the engine has pushed one for this game
(`inputSeen`), so a connect or a `resync` before the first prompt is `hello_ok` +
`state` and then silence — the same flag that makes `applyAct` answer
`notice{title:"Not yet"}`, so the wire can no longer say "the engine is asking
you something" while every act is being dropped. A client may read its first
`input` as that guard lifting.

**`GET /health` is the session's readiness, not the port's** (amendment M15): 503
`starting` until `openView` has emitted `hello_ok`, 200 `ok` after. Poll it before
you connect — the port is listening about a second earlier, and a client that
connects in that window is deliberately sent nothing until the real handshake,
**and anything it sends in that window is dropped with no reply** (amendment M20
/ D23: an answer to it would be an s2c frame ahead of `hello_ok`, which is the
inversion the rule exists to prevent). The run summary prints how many.

**Playing the console game.** `--transport console` is a real seat: it prints the
board, the `input` prompt with the engine's own button labels, and any `ask` with
its numbered options, then reads one line. Type `?` for the full list; the whole
vocabulary is

| line | what it does |
|---|---|
| `<id>` or `c <id>` | click that card (`selectable` lists the ids the engine named; a click on any other id is still sent — amendment **M8** — and comes back as `notice{title:"Not selectable"}`) |
| `p <id>` | click that player |
| `a <card> <ab>` | activate an ability by id |
| `ok` / `no`, `x`, `cancel` | press OK / Cancel — **the label is the engine's**, so OK is sometimes `Auto` and Cancel is sometimes `Undo (2)` |
| *(empty line)* | OK when OK is enabled, Cancel otherwise |
| `m W\|U\|B\|R\|G\|C` | spend one floating mana |
| `u` / `undo` | undo the last mana ability |
| `pass` | pass priority |
| `!` | alpha strike (attack with everything) |
| `next` / `new` | **M6**, only after `over`: `act: newGame {mode}` — `continue` (`HostedMatch.continueMatch()`, the next game of the match) or `restart` (`restartMatch()`). A new `gameId`, a new `hello_ok` and a new frame log follow (**D44**) |
| `s` / `i` | reprint the last `state` / `input` |
| `q` / `concede` | concede and exit |
| `?` | this help |

While an `ask` is outstanding **every** line answers it, and the ask itself
prints the spellings it accepts. `.` answers `null`, which is always legal: the
bridge substitutes Forge's documented default (`docs/protocol.md` §5.4). The
console's ask timeout is **0 — infinite** (D15): a human at a terminal is allowed
to think.

`npm --prefix web test` runs **two** suites: `node --test test/*.test.ts` and
then `vitest run`, which is the only one that mounts `<Board/>` (Node's type
stripping does not transform JSX). `vitest` is a dev dependency, so a checkout
with no `web/node_modules` fails `check-all.sh` at its web step with a message
saying exactly that.

`bridge/build.sh` runs **four** self-tests after javac: `mtgtable.JsonSelfTest`,
`mtgtable.AskSelfTest` (the ask path's answer marshalling — index 0 is the
defending player, a wrong-length `manipulate_list` answer is the identity order,
and so on), `mtgtable.GameLogSelfTest` (the frame log's close path: close in
under a second, exactly `N+1` lines on disk) and, since match setup's second fix
commit, `mtgtable.OverRaceSelfTest` (`over` stays the TERMINAL frame while
another thread is emitting: it parks an `input`, and then an act, on the log's
monitor behind `over` so the losing interleaving happens every run, then races
300 rounds with no help). Forge has dispatched **three** of
the eleven ask kinds across every recording ever made here, so for the other
eight `AskSelfTest` is the only check that runs at all; and the `GameLog` defect
it now guards — a `close()` that self-deadlocked against its own appender,
burned 30 s and returned a truncated file — was invisible in a green run. So was
`OverRaceSelfTest`'s: `WireGuiGame.emit` and `logC2s` checked `overEmitted`
*outside* the monitor that numbers a frame, and at a load average of 20–60 an
`input` (or an act) was numbered one past `over` — step 10a, 10b or 10g failing
on "the last frame … is not `over`" in three gate runs. The flag is now
re-checked under that monitor (and the ask path's numbering too), and the
invariant is **once `overEmitted` is set, only `over` is emitted** — `emitOver`
sets the flag and may wait up to a second for the outcome before it numbers
`over`, so a frame that arrives in that window is dropped too; a frame that
loses the race is counted as the summary's `late frames` line and named on
stderr, and a dropped `gameOver` `state` does not count as sent, so `OVER
WITHOUT A gameOver STATE` still fires. **The ask's push is not covered**: an ask
is numbered under the monitor but pushed later by `Transport.ask`, so `over` can
still reach the socket ahead of it (PLAN.md, slice 4's follow-up 13(d), open;
the self-test has no ask case, because `ask` asserts a game thread). With the
re-check removed the self-test fails all 11 of its checks; with it, twenty back-to-back 10b sessions at a load average of up to 43
all passed, and one of them caught the race live (`late frames = 1`, the log
still ending in `over`; `docs/evidence/match-setup.md` §R.3). It loads `WireGuiGame`, so it installs the headless GUI first (hard
rule 1), runs under hard rule 6's flags and borrows `HeadlessGuiBase`'s own
`mtg-table-bg` threads rather than naming a ninth.

`check-forge.sh` is the gate for everything below it. Run it first when something
behaves strangely. **`check-all.sh` is what you run before saying you are done**,
and it is **thirteen numbered steps** (plus **six** lettered sub-steps — 9b, 9c,
**9d**, **9e**, 10f and **10g**; 9d and 10g added by **M6**, 9e by **match
setup** — so the numbering and every reference to "10d" stayed correct when they
were added): lint
→ build → `Smoke` → a fresh `RecordMatch` into `var/` → the value-level drift diff
→ three fresh `MtgTable` sessions (`--transport null`, the scripted
`--transport console` smoke, and `--transport auto --seed 11`) → **9b**, the
ADVISORY fixture-drift check (`tools/fixture-multiset-diff.mjs`: re-record seed 42
and compare it against `fixtures/games/human-auto-42.jsonl` as a multiset with
`seq` stripped, because the fixtures are stable in content and not in frame order;
never an exit code unless you pass `DRIFT_FATAL=1`, skipped by `SKIP_DRIFT=1`) →
**9c**, **M5's exit criterion** (`tools/ten-games.sh`: ten consecutive
`--transport auto` games at seeds 1..10 alternating `decks/pacho-shield.dck` and
the five probe decks, eight assertions each plus **M6's 6b**, which requires
every seat recording of the run to carry the comfort block — see that file's own
header — and the single most expensive thing in the gate; `SKIP_TEN=1` skips it,
and skipping it means the exit criterion did NOT run; **match setup added rows
11–14**, your deck against `decks/doom-legion.dck` — named once, in
`tools/villain-deck.sh`, which 9e sources too — under each of the four AI
profiles, each asserting the profile's values read back from the in-game AI and
no Forge preferences file touched; they prove the profile reaches the engine, not
that it changes the play, `docs/evidence/match-setup.md` §P) → **9d** (**M6**), the
**`sideboard` ask**, which needs a session that survives `over`
(`--probe --games 2` on `decks/sideboard-probe.dck`: the ask fires between the
two games and is answered with a legal, main-sized, non-identity deck) → **9e**
(**match setup**, amendment **M44**), one game of your deck against the villain
deck under `--ai-profile Reckless` — `over`, zero UNIMPL, redaction,
`hello_ok.match` equal field for field to one rebuilt from the two `.dck` files,
the profile's values read back from the in-game AI, **no Forge preferences file
touched** (`~/.forge/preferences/` and `var/forge/preferences/` fingerprinted
before and after), and `--ai-profile NoSuchProfile` refused before
`FModel.initialize`; it runs even under `SKIP_TEN=1` →
**seven fresh `--transport ws` servers** — the `ws-smoke` doorstep test (10a), its
`--disconnect-mid-ask` variant (10b), a whole game through
`tools/ws-auto-play.mjs` (10c), that same client with `--refuse-first-ask` (10d),
which drops the socket on the first `ask` FRAME and is the only thing in the repo
that exercises `ReplyPool.cancelAll()` with a game thread actually parked (the
gate asserts the server's own `cancelling 1 pending ask(s)` line), and
`ws-smoke --concede-before-input` (**10e**), which concedes from inside the
`hello_ok` handler before the engine has asked this seat anything and is the only
thing that reaches amendment **M11**'s `over`-with-no-`gameOver`-`state` branch,
asserting `OVER WITHOUT A gameOver STATE` and `CONCEDE BEFORE START` on the
server's stderr and deliberately NOT running `check-redaction.mjs`, because a
four-line session has no `state` frame and the checker calls that a failure (see
PLAN's M4 follow-up 8), and **10f** (M5), `ws-auto-play --probe` at seed 42,
which is the only thing anywhere that sends the `clickAbility` **act** from a
client rather than answering an `ability_menu` by index (asserted `>= 1`, and
none of them unresolvable), and **10g** (**M6**), the milestone's own command:
**three games back to back over one socket** (`--games 3 --comfort`), which is
the only step where a session outlives an `over`, exercises both
`HostedMatch.continueMatch()` and `restartMatch()`, and asserts M6's five typed
acts by the **effect** each had on the next `state` (`passPriority` is a count
and the step says so). **It plays `decks/yield-probe.dck`** — 22 Thallids, one
mandatory upkeep trigger each — and passes `--require-yield-repeat`, which is
what turned auto-yield's *behavioural* half from a printed number into an
assertion: the same `yieldKey` comes back to the top of the stack every turn,
and after `yielded:"yes"` the engine must raise **no** `input` carrying
`buttons.ok.enabled` while it is there (`chooseSpellAbilityToPlay` returns null
without raising an `InputPassPriority` at all). Measured at seed 13:
`repeats=4`, `promptsWhileOnTop=0`. Each of the seven is asserted for exactly one `over`,
`over` last, and its log through `check-redaction.mjs` — including the CLIENT
log, which is a different shape on purpose. Then `check-redaction.mjs` over the
committed fixtures (`games/` **and** `synthetic/`) *and* every fresh recording →
`check-redaction-selftest.mjs` → `npm run build && npm test`. It exits non-zero
on the first failure and takes **about eleven and a half minutes from a deleted
`bridge/out`** (682 s and 706 s on two clean M6 runs, then 711 s, 712 s and
711 s on three more after the verification fixes — the last is M6's
documentation pass, `var/check-all-m6-docs.log` at `WSPORT=8666`, which did not
delete `bridge/out` first and landed in the same band because `build.sh`
recompiles every source anyway; 10g's new deck plays faster and its new
assertion costs nothing; it was 8 m 52–57 s before M6 added 9d and 10g), of
which **9c's ten games are 265–269 s**. Tier 2's documentation pass ran it once
more, in the `tier2-slice1` worktree at `WSPORT=8661` without deleting
`bridge/out`: **727 s**, exit 0 (`var/check-all-t2-docs.log`), on a desktop that
was not idle; Tier 2 added no step. Slice 2's fix pass ran it from a deleted
`bridge/out` in the `tier2-slice2` worktree at `WSPORT=8662`: **731 s**, exit 0;
its second fix pass the same way at `WSPORT=8665`: **729 s**, exit 0
(`var/check-all-t2-fix2.log`); and its documentation pass at `WSPORT=8666`,
without deleting `bridge/out`: **727 s**, exit 0 (`var/check-all-t2s2-docs.log`).
Slice 2 added no step. Slice 3's fix pass ran it from a deleted `bridge/out` in
the `tier2-slice3` worktree at `WSPORT=8666`: **731 s**, exit 0; its second fix
pass the same way at `WSPORT=8665`: **729 s**, exit 0; and its documentation pass
at `WSPORT=8666`, without deleting `bridge/out`: **726 s**, exit 0
(`var/check-all-t2s3-docs.log`). Slice 3 added no step either. **Slice 4 added no step, and its documentation
pass did not get a green run**: three runs at `WSPORT=8666` without deleting
`bridge/out` failed at step 6 (63 s and 56 s, exit 141, at a load average of
42–73) and at step 10b (622 s, exit 1). All three were timing in the bridge,
not the slice (PLAN.md's slice-4 follow-up 13): one extra `state` frame in the
byte-strict seed-42 diff, and an `input` emitted after `over` when a concede
races the mulligan prompt. Logs: `var/check-all-t2s4-docs-run{1,2,3}.log`. **Rebased
onto the card library** (`754f504`, 2026-09-27, which added no step), the merged
tree ran it twice at `WSPORT=8665` without deleting `bridge/out`, before the
rebase commit: the first run failed at step **10g** (750 s, exit 1) — the
three-game session's third game, the `restartMatch()`, sent `over` 2 ms after
its `hello_ok` with no `state` (`OVER WITHOUT A gameOver STATE`), and
`check-redaction.mjs` failed that four-frame log (timing in the bridge again;
`bridge/` is untouched by both sides; `var/check-all-t2s4-rebase-pre1*.log`);
the second passed, **849 s**, exit 0, 9c's ten games 311 s, on a desktop at a
load average of 15–25 (`var/check-all-t2s4-rebase-pre2.log`). **The workshop,
rebased onto slice 4 and reconciled** (2026-09-27, the `mtg-table-t2e` worktree;
it added no step), ran it from a deleted `bridge/out` at `WSPORT=8680`: **888 s**,
exit 0, 9c's ten games 317 s, at a load average of 17–23
(`var/check-all-workshop-reconcile.log`).
**Match setup
added five games** (9c's rows 11–14 and 9e, about 125 s) and the gate grew to
match: on its branch, off `0368a90`, **874 s**, exit 0, from a deleted
`bridge/out` at `WSPORT=8671` (`var/check-all-match-setup.log`), then **1,141 s**
and **1,143 s**, exit 0, the same way after its review fix pass and its
documentation pass (`var/check-all-msfix.log`, `var/check-all-ms-docs.log`) — all
three on a desktop that was not idle. **Rebased onto `23e26b3`** with its second
fix commit (`OverRaceSelfTest` among it), it ran twice from a deleted
`bridge/out` at `WSPORT=8670`: **1,106 s** and then **970 s**, exit 0 both times,
9c's fourteen games 466 s and 408 s, at a load average of 17–29 falling to 4 —
the second is the committed tree (`var/check-all-ms-rebase.log`,
`docs/evidence/match-setup.md` §R.3). **Rebased onto the workshop** (`bf0392b`)
with the verifier's four findings fixed, it ran from a deleted `bridge/out` at
`WSPORT=8680`: **897 s**, exit 0, 9c's fourteen games 370 s, at a load
average of 11–19 (`var/check-all-match-setup-final.log`, evidence §R.4).
`SKIP_TEN=1`
brings it back to roughly six. **Pass `WSPORT=<n>` if 8643 is busy** — step 10 starts
**seven** servers on it, one after another.
**Every JVM step runs under `timeout`** (`GAME_TIMEOUT`, default 300 s,
overridable in the environment): a gate whose failure mode is "hangs until
someone notices" cannot catch the one defect class M2's threading work is most
exposed to.

**`npm --prefix web test` is hermetic, and it is kept that way by
`MTGTABLE_WS_LOGS`.** `web/test/ws-log.test.ts` replays whatever that variable
names — check-all sets it to the four logs step 10 just produced — and falls back
to the committed `fixtures/games/human-*.jsonl` when it is unset. It must never
go back to globbing `var/`: it did, and three leftover scratch directories were
enough to turn a green suite red with nothing in the repo changed (282 pass / 3
fail with them present, 279 / 0 with them moved aside). A test whose result
depends on what is lying around in `var/` is not a test.

**Never pass `--pre-amendment` to `check-redaction.mjs`.** It downgrades a
missing `owner` / `token` / `alt` / `library.cards` to a warning, and those four
absences are exactly what the gate exists to catch. It is there to read a log
recorded before 2026-09-11, and nothing in the repo is one.

**`--client-log` is different and is safe to pass** (amendment M17): it relaxes
the `seq` continuity rule, and nothing else, for a log a *client* wrote
(`tools/ws-auto-play.mjs --log`), where a verbatim re-delivery and a forward gap
are amendment M10 rather than a dropped frame. It is auto-detected from the
header's `recordedBy:"client"`, so you rarely have to type it; every content
assertion is unchanged either way, and a bridge log under `var/games/` keeps the
hard monotonic rule.

**And never pass `--opponent-library-ok`,** which gets the identical treatment:
it downgrades "a seat other than the viewer has full cards in `library.cards`" —
the single largest hidden-information surface in the game — from a failure to a
warning. The shape is legitimately reachable (Opposition Agent, Bribery, Gonti)
and **nothing in the repo passes it**, so the day a recording needs it is the day
someone types it on the command line and says why in the commit message.

## The web client — the conventions M4 added

The board is now a real Magic table (`docs/research/10-board-ui-spec.md` is its
spec, `docs/evidence/m4-board.md` what was measured). Six conventions hold it
together, and each is a defect that was actually hit.

1. **Nothing under `web/src/render/` may import CSS at module level.** There is
   exactly one stylesheet import in the app — `web/src/styles.css` from
   `main.tsx` — plus `mana-font/css/mana.css` immediately before it. The render
   tests run under `node --test` (type stripping, no bundler) and under vitest's
   **`node`** environment, and neither can load a stylesheet; a component that
   imports its own CSS breaks both suites at import time, before a single
   assertion runs. Per-component CSS modules are allowed *in principle* and are
   not used for that reason. The `mana-font` import is first because a later
   `@font-face` wins and `styles.css` overrides it to the woff2 (**D29**).
2. **`CardTile` is THE card renderer.** Every card in every zone — battlefield,
   hand, graveyard, exile, stack, the revealed slice of a library, the decision
   panel's thumbnail, the zoom, an `ask`'s options, the board picker, the zone
   browser, the combat bands — goes through it, and it is imported by exactly
   **ten** files and by nothing else: `ZoneRow`, `HandFan`, `PlayerRail`,
   `StackPanel`, `DecisionPanel`, `CardZoom` (M4) and `AskModal`, `AskPicker`,
   `ZoneBrowser`, `CombatBands` (**M5**). `Board.tsx` imports the file too but
   takes only its `Clicks` **type**, which is why it is not on the list. This is
   the renderer's half of hard rule 8: a new surface that draws its own card
   markup is how a name for a `hidden: true` id gets back on screen, and it is
   exactly what the per-frame `data-card-name` check in
   `web/test/render.test.tsx` would stop catching. Keep the list closed — adding
   an eleventh importer is a decision, and `grep -rl "from './CardTile.tsx'"
   web/src` is how you check it. **M7's arena has its own single card renderer,
   `arena/scene/CardPlane.tsx`** — the same rule for a different renderer, and
   without the `data-card-name` backstop; see the M7 conventions below. **The card
   browser (`#cards`) draws library cards with `cards/CardView.tsx`** and never
   imports `CardTile` (**D94**, *Card library* below) — public card data, not a
   game, so it is not an eleventh importer. **The workshop (`#workshop`) draws its
   card LIST's thumbnails with one `<img>` of its own** (`workshop/Workshop.tsx`),
   exempt for the same reason: the list is deck cards, tokens and archetypes whose
   facts come only from face-up sightings, a concealed entry never looks its art
   up and draws a back, and its pedestal draws every card through the arena's
   `CardPlane`. `workshop.test.ts` holds it at one `imageUrl(` with every
   `lookupArt(` guarded by `concealed === null`.
3. **The rect registry (`web/src/render/rects.ts`) is namespaced and
   set-valued.** Keys are `c:<cardId>` / `p:<playerId>` / `s:<stackId>` because
   **the id spaces collide** — 40 frames in the committed corpus have a
   `stack[].id` that is also a battlefield `Card.id`. One key maps to a **Set** of
   elements and a `null` ref callback removes nothing, because the same card can
   be mounted more than once and the copy that unmounts must not delete the key
   the row tile registered (it did, and every arrow touching that card vanished).
   There is **one** `ResizeObserver`, on the board root; measurement happens in
   the post-render sweep and never inside render; the sweep bumps a version only
   when a rect actually moved. Use the isomorphic layout-effect shim already in
   that file, or `renderToStaticMarkup` starts printing SSR warnings.
4. **One keymap table.** `web/src/keys.ts` is the **24** rows (18 at M4; M7 added
   `V` and `K`, Tier 2's slice 2 the three camera rows, the workshop `W`) plus two pure
   functions (`bindingFor`, `planKey`); the handler and the `?`/`H` overlay both read it,
   and a test asserts every chord in `KEYMAP` appears in the overlay's markup.
   Adding a key is a row, never a new branch in a handler. Its dispatchers are
   `Board.tsx`, `Arena.tsx` and — for `W` (`openWorkshop`) alone — `main.tsx`,
   which owns the view and takes the key in the capture phase only while the arena
   is really mounted (never under `?arena=off`, where `W` is the board's floating
   white mana). A page with no board has a table of its own: the card browser's
   `cards/keys.ts` and the workshop's `workshop/keys.ts`, each row carrying its
   action. Two rules live in
   `planKey` and are tested there: **a focused button keeps `Space` and nothing
   else** (the browser will already activate it; sending `buttonOk` too answers
   the engine twice — and M3's handler dropped the *whole* keyboard for a focused
   button, so clicking a card turned `Escape` off), and `Esc` goes overlay → open
   `ask` (answer `null`, §5.4) → the engine's Cancel button, in that order.
5. **Arrows are decoration and never the only channel** (**D30**). The overlay is
   `aria-hidden`, `focusable="false"`, `pointer-events: none`, and every fact it
   draws is also text somewhere: the stack panel's target chips, the tile's
   `→ defender` / `blocks …` notes, the log drawer's band list. Three cues —
   curvature, colour **and** dash pattern — so colour alone never carries it.
6. **Keep the testable half pure.** `labels.ts`, `resolve.ts`, `arrows.ts` and
   `keys.ts` contain no JSX, no React and no DOM types, which is why `node --test`
   can import them and why `arrows.test.ts` can build arrows for all 2,473
   committed `state` frames without a browser. Put geometry, label composition and
   id resolution there, not in a component.

And two rules that did not change and are easy to lose in a restyle: **never gate
a click on `selectable`** (amendment M8), and **render `buttons.*.label`
verbatim**. The board still draws no phase-stop state of its own — but **the dots
are live as of M6** (**D37**, superseding D31): they render from
`players[].phaseStops` and from nothing else, a click is
`act: setPhaseStop {phase, turn, stop}`, and the next `state` says what happened.
A stream *without* the field — every recording made before 2026-09-12 — still
draws Forge's documented defaults, disabled, with the legend saying so;
`phaseStopsOf` is the one place the two cases are told apart. There is **no
"hold priority" control**: Forge has no such feature, so D31's disabled toggle
was removed rather than enabled.

`npm --prefix web test` is **870 `node --test` + 94 vitest (6 files)** standalone
as of **match setup rebased onto the workshop** (`bf0392b`, 2026-09-27: its seven
`reduce-match` cases, its liveness clause for the arena's plates and one
`arena-hud` case on top of the workshop's tree), and was **862 + 93 (6 files)**
with **the workshop rebased onto Tier 2's fourth slice and reconciled**
(2026-09-27, from `npm ci`: its `workshop` suite, 43, two `keys` cases and two
`cards-render` cases on top of slice 4's tree; **872 / 864 pass / 0 fail / 8 skipped** plus 93 vitest inside `check-all.sh`, `var/check-all-workshop-reconcile.log`),
**825 + 92 (6 files)** as of **match setup rebased onto `23e26b3`** (its seven
`reduce-match` cases, 711 + 79 on its own branch, plus its fix commit's liveness
clause for the arena's plates and one `arena-hud` case), **817
+ 91 (6 files)** as of **M7 Tier 2's fourth slice rebased onto the card library**
(the two sides add — slice 4's twenty new `node --test` cases, its `duelists`
suite among them, and D90's 93 plus 12 vitest), **837 + 91** with the workshop on
the card library alone (its `workshop` suite then 38), **797 + 91 (6 files)** as of
**the card library (D90, 2026-09-27)** — its four suites `cards-lib` (49),
`cards-api` (15), `cards-ui` (29) and the vitest `cards-render` (12) — **724 + 79
(5 files)** as of **M7 Tier 2's fourth slice** before the rebase, and
**704 + 79 (5 files)** as of **M7 Tier 2's third slice** after its second fix pass (698 after its first,
690 before that, 655 after the second slice, 610 + 79 after the first slice,
534 + 79 at M7 Tier 1, 456 + 75 at M6), and **880 / 872 pass / 0 fail / 8
skipped** plus 94 vitest inside `check-all.sh` as of match setup rebased onto the
workshop (`var/check-all-match-setup-final.log`), **835 / 827** as of its first
rebase and fix commit (`var/check-all-ms-rebase.log`; 721 / 713 on its own
branch), **827 / 819** after
slice 4's rebase (`var/check-all-t2s4-rebase-pre2.log`) — the first in-gate
count since slice 3's **714 / 706**, because neither side read one: slice 4's
documentation pass's gate runs stopped before the web step, and D90's predicted
807 / 799 was not measured inside the gate (708 / 700 after slice 3's first fix pass, 665 / 657
after slice 2, 662 / 654 before slice 2's second fix pass, 620 / 612 after
Tier 2's first slice, 544 / 536 at Tier 1), where `MTGTABLE_WS_LOGS` names the four logs step 10 just
produced and the ws-log suite skips the candidates it does not name. M7's eight
suites (`layout`, `colour`, `replay-cues`, `cues-exhaustive`, `camera`,
`liveness`, `perf`, plus the vitest `arena-hud`) and Tier 2's nine (`figures`,
`figure-pose`, `clips`, `tiles`, `attach`, `stack`, slice 3's `traits` and
`facing`, and slice 4's `duelists`) are in the same glob and need
no GPU and no DOM — which is what report 09 §2.4's `[NO three]` annotations
bought, and report 13 §10 bought again for `figures/`.
`render.test.tsx` renders every frame of every fixture **twice**, once as a
replay and once as a seat, which is what makes the read-only assertion and the
hidden-information assertions per-frame rather than per-suite.

## The conventions M5 added

Six more, and like M4's each one is a defect that was actually hit.

1. **A question is answered on the board iff EVERY one of its options is already
   drawn there** (**D33**). The decision is `web/src/render/picker.ts`, pure and
   corpus-tested; one option outside the board sends the whole ask to the modal.
   `drawnEntities()` is written against **what `Board.tsx` mounts**, never
   against `resolve.findCard` — the snapshot contains another seat's hand as
   five-key stubs and an unrevealed library, and a rule written against it would
   offer a click on a card the player cannot see, which is hard rule 8 arriving
   through the picker. **If you add or remove a surface that mounts cards, update
   `drawnEntities` in the same change**; `web/test/picker.test.ts` prints the
   picker/modal census every run and fails if either column is empty. The picker
   **marshals nothing**: the answer is built by `AskModal`'s own
   `answerFromDraft`, so the two surfaces cannot disagree.
2. **Nothing new may be an in-flow child of `.table__middle`** (**D36**). Its
   `grid-template-rows` is `1fr 1fr` — one row per seat — and a third child lands
   in an implicit **auto** row that is sized to its content *before* the `1fr`
   rows get anything: at 1600 × 900 both zone rows measured **0 px**, the strips'
   tiles overflowed, and the two caption buttons overlapped by 9 px — leaving
   **4 px** of the opponent's zone control hittable. `.stackpanel` and `.bands` are
   absolute; so is the next one. The z-index budget in that box is **a tile = its
   own `--i`, `.bands` = 55, the `.zonerow__label` buttons = 60**, and the order
   matters: the captions must stay clickable *through* an overlay, because the
   zone browser is the escape hatch for the cards it covers.
3. **No React hook below a component's early return.** `Board` has
   `if (board === null) return …`; a `useMemo` under it shipped, threw *"Rendered
   more hooks than during the previous render"* on the first real frame, and the
   **whole suite stayed green** — `render.test.tsx` mounts each frame fresh with
   `renderToStaticMarkup` and can never see a hook count change between renders.
   `web/test/hooks-order.test.ts` is a **source scan** (negative-controlled: put
   a `useMemo` back below the guard and it goes red) and it is all the repo has —
   there is no eslint and no DOM test environment.
4. **Never decide what a control *does* by matching an engine string** (§Scope,
   amendment **M30**). Render `buttons.*.label` verbatim; never branch on it. The
   mana pips are live whenever the pool is non-empty precisely because the only
   alternative was matching the word `Auto` to detect a mana payment. When the
   client needs to know a *state*, the answer is a typed field on the wire, not a
   regex over prose.
5. **The probe policy is a flag, and a recording says which one it ran under.**
   `--probe` (`AutoTransport`'s four decisions taken the other way) and
   `--mana-lost-prompt` (`FPref.UI_MANA_LOST_PROMPT`, **in memory, never
   `save()`**) are what make the four new ask kinds reachable; the **default** is
   what M5's exit criterion and every M2/M3 fixture measure, and 9b's multiset
   diff is the standing proof that the default did not move. Both appear in the
   session header as `policy` / `prefs` (**M31**). **Do not re-record a committed
   fixture with `--probe`** unless you mean to change what it is evidence of.
   `tools/ws-auto-play.mjs` mirrors the policy line for line, on purpose.
6. **A typed act earns its gate in `tools/ten-games.sh`'s sixth `ROWS` field —
   with its EFFECT, not just its count.** `useMana` had no end-to-end guard
   anywhere while `check-all.sh` step 10f said in as many words that it was
   "asserted elsewhere"; elsewhere was `ten-games.sh`, which did not contain the
   string. A count alone would still pass if the client sent the act and the
   bridge dropped it, so seed 4 also asserts the seat's `manaPool` shrinks across
   it. The other assertion worth knowing about is the **ask-kind ceiling** (no
   more than 150 asks of one kind in one game): an ask loop is the one wedge
   every other assertion is blind to, and one shipped.

## The conventions M6 added

Six, and the thesis under all of them is one sentence: **every comfort feature is
an engine feature rendered, never a client state machine.** A control that
remembers something the engine did not tell it is the defect, not the feature.

1. **Every M6 field is OPTIONAL on the wire, and there is exactly one reader per
   field.** `phaseStopsOf`, `yieldOf`, `undoOf`, `buttonFocus` and `stackYield`
   in `web/src/protocol.ts` are where "the key is absent" becomes "this recording
   predates M6", and a component must not test for the key itself — fourteen
   committed fixtures were recorded before 2026-09-12 and `render.test.tsx`
   replays all of them, twice each. The same rule on the emitter side is
   all-or-nothing: `tools/check-redaction.mjs` **fails** a file that carries
   *some* comfort keys and not others (*"M6's comfort block is HALF PRESENT"*),
   because "absent is fine" once made a bridge that stopped writing
   `players[].phaseStops` pass over every fixture.
2. **A `hello_ok` whose `gameId` changed is a RESET, not an update** (**D44**,
   amendment **M38**). The reducer drops board, input, ask, game-over, log,
   events, notices and `lastAct`, keeps the session, and bumps the game number; a
   `hello_ok` with the *same* id is a `resync` re-delivery and keeps everything.
   On the bridge, `WireGuiGame.openView` is the **one** reset hook — every cache
   keyed by a Forge id is rebuilt there, because `endCurrentGame()` has replaced
   every `PlayerView`. **A new cache goes in that method or it is a stale one.**
3. **Two narrow relaxations of the hidden-information gate, and both are
   negative-controlled.** An `ask` may justify the `state` **immediately** before
   it and nothing further back (`WireGuiGame.ask()` deliberately flushes that
   snapshot one frame ahead — report 06 W4), and a `reveal: true` `choose_list`
   is its own delayed reveal; `reveal: true` on **any other kind** is a failure,
   so the flag cannot switch amendment P12's option-card audit off. If you widen
   either one, add the control in the same change —
   `fixtures/negative/redaction/` and `check-redaction-selftest.mjs` are the
   pattern, and PLAN.md's M6 follow-up 8 is a standing request for a second
   reader of both.
4. **A typed act earns its gate step by its EFFECT** (M5 convention 6, extended).
   Step **10g** asserts `setPhaseStop`, `yieldTo`, `setYield` and `undo` by the
   `state` each one changed, and names `passPriority` as a **count** because that
   is all it can be. A *behavioural* claim needs an engine that can repeat itself:
   auto-yield went from a printed number to an assertion only when
   `decks/yield-probe.dck` put the same `yieldKey` back on top of the stack every
   turn (`--require-yield-repeat`).
5. **The four acts that produce no game event are pushed by `refreshState()`, and
   that hop is guarded twice** (**D39**, hard rule 3). D22's `inputGen` stamp
   **and** a positive "the engine is parked" predicate; a skipped refresh is
   counted and printed. `useMana` is deliberately **not** a fifth caller — the
   board marks the pool provisional instead.
6. **No control for a feature Forge does not have.** D31's "hold priority" toggle
   was **removed, not enabled** (**D37**): `YieldController.setDisableAutoYields`
   is a different feature and is not on the wire. The same rule retires
   `autoPay` and `endTurn` — those arrive as the engine's own *labels* on OK and
   Cancel, rendered verbatim, and inventing an act for them throws the engine's
   answer away.

## The conventions M7 added — the arena

Six, and the thesis under all of them is the same one sentence as the milestone:
**the arena is a RENDERER.** It is a second renderer over the same frame stream —
`web/src/arena/`, lazily imported, sharing `reduce.ts`, `protocol.ts`, the
transports, `art.ts`, `keys.ts` and M5's `<AskModal>` with the 2D board. Read
[`docs/research/09-arena-tier1-plan.md`](docs/research/09-arena-tier1-plan.md) in
full before touching it; `docs/evidence/m7-arena.md` is what was measured.

1. **It decides nothing, and that is mechanical.** No file under
   `web/src/arena/` imports a transport; `reduce.ts` is imported **as a type
   only**; `DecisionLayer` imports nothing from `cues/` or `scene/` and branches
   on **no engine string**; `camera.ts`, `layout.ts`, `colour.ts` and everything
   in `cues/` import no renderer, no three, no React and start **no timer**.
   `web/test/liveness.test.ts` is a source scan that asserts every clause of
   that, and it is the file to extend when the arena grows a module. The two
   board rules hold here unchanged and for the same reasons: **never gate a click
   on `selectable`** (`HitProxy` has no such prop to gate on) and **render
   `buttons.*.label` verbatim**.
2. **`CardPlane` is THE card renderer of the arena**, exactly as `CardTile` is
   the board's (M4 convention 2), and for the identical reason: it is the
   renderer's half of hard rule 8. Every card in every zone goes through it —
   battlefield, hand, piles, the stack, attachments — and `layout.ts` sets
   `Placement.back` for a redacted stub **and** for any face-down card *before*
   `CardPlane` asks `art.json` for a face. `web/test/layout.test.ts` asserts
   `isHidden(card) ⇒ placement.back` over **84,418 placements in 3,679 frames**
   of the committed corpus. A second surface that draws its own quad is how a
   concealed name gets on screen, and a canvas has no `data-card-name` for
   `render.test.tsx` to catch it with. `CardBack.tsx` is deliberately a *texture
   hook*, not a second renderer.
3. **`layout(state)` is authoritative; a cue only ever adds an offset that decays
   to identity** (**D50**). `finalTransform = layout(state)[id] ⊕ offsets[id]`.
   `layout.ts` is pure — no three, no React, no time — and is the **only** thing
   in the arena that knows a coordinate; a cue that wants a card to *stay*
   somewhere adds a `presence` rule to the resting pose instead (the Helicarrier
   hovers that way, which is why it survives `skip all`). This is what makes
   skip, scrub-backwards, `resync` and a new `gameId` one call —
   `flushAndSnap()` — with no rewind path. `replay-cues.test.ts` asserts the
   offset map is **empty** after every one of the corpus's 3,293 batches. **Do
   not animate the scene graph directly**; that is the defect this prevents.
4. **Cues are DATA, and the table is exhaustive by type.**
   `cues/cues.json` (**D51**) is the whole per-card and archetype table;
   `cues/defaults.ts` is a `Record<EventKind, CueSpec>`, so a new event kind on
   the wire **will not compile** until it has a default. The ladder is per-card →
   archetype → default and a bad entry is dropped by `validate.ts`, never the
   file. The rule the file lives by: **a cue keys off an event that is about THAT
   card.** §3.6's `counters` event carries no *source*, so "Coulson gave this
   counter" is not on the wire; the engine never says which card caused another
   card's tap, so Quake's ring is centred on **her own**. Inventing either link
   is rules logic in a renderer.
5. **One `useFrame`, one geometry, and no allocation in the hot path.**
   `scene/CueRunner.tsx` is THE frame loop (begin frame → tick → write offsets →
   bind effects); `scene/geometry.ts` is one `PlaneGeometry` for every card in
   the game; `scene/effects.ts` is a **fixed pool of meshes** — 26 at Tier 1,
   38 with Tier 2's twelve mana-mote slots (**D60**), **45** since slice 3's
   per-card beats (**D79**). Three
   allocations hid in that loop behind a header claiming there were none — a
   `bind` closure, a `new Set()` plus a sorted key array, and a compose pair —
   and `web/test/cues-exhaustive.test.ts` now checks the pooled compose
   field-for-field against the naive one rather than taking the claim on trust.
   `frameloop` is `demand` while the queue is idle and nothing bobs, so an idle
   table costs nothing — and two things follow from that which each shipped
   broken (**D72**): **the cue clock does not run while the queue is idle** (the
   first frame after a parked loop is a batch's `t = 0`, never the idle gap played
   as film, and a late frame mid-cue adds at most `MAX_TICK_MS`), and **`<Canvas
   frameloop>` is `CueRunner`'s ref, never a literal** — fiber re-applies the prop
   on every render, so a literal `demand` froze a running batch on every hint.
   **And the ref's setter is React state** (the workshop's reconciliation,
   2026-09-27): `<Canvas>` also re-renders on its own — a resize — with the
   props of `Arena`'s last render, so a plain `useRef` froze a batch resized
   mid-play and kept an idle table drawing after one (measured, `g1`@100). Every
   write re-renders `Arena` once; `liveness.test.ts`'s frameloop clause holds all
   four parts.
6. **The DOM layer over the canvas is `pointer-events: none`, so every widget in
   it must opt back in.** `.arena__layer` lets the `<canvas>` keep every click
   the DOM does not want — and `pointer-events` inherits, so a widget with no
   `auto` rule of its own is **completely inert**. That shipped: the ask modals
   and the `?`/`H` overlay were dead at every button's own centre.
   `web/test/liveness.test.ts` parses the layer's JSX block, requires its table
   of widget classes to **cover every component mounted there**, and requires
   each class to carry a `pointer-events: auto` rule — so the next widget added
   to that layer cannot ship inert.

Two more things worth knowing before you change anything here. **The arena chunk
must stay lazy** (**D49**): `lazy(() => import('./arena/Arena.tsx'))` is the only
way in, nothing under `arena/` may be imported statically from the 2D path, and
`npm run build`'s own output is the check — the 2D entry chunk is 85.62 kB gzip
at Tier 1, 85.72 kB after Tier 2's first slice, 86.47 kB with the card browser
and 87.36 kB with the workshop, and none of it is `three`. **Since the workshop
the arena's scene is a chunk two lazy pages share** — `three`, fiber, drei and
`arena/scene/`, named `arena-scene-*.js` by `vite.config.ts`'s `chunkFileNames`
(339.87 kB gzip) — with `Arena-*.js` (8.92 kB) and `Workshop-*.js` (24.07 kB) on
top; the one stylesheet carries the workshop's rules (+1.36 kB gzip). And
**`tools/arena-bench.mjs` is not in the gate**, on purpose: it wants a built
`dist`, a `vite preview` server and a headless Chromium. Every performance number
in `docs/evidence/m7-arena.md` is from **SwiftShader**, a software rasteriser and
an explicit lower bound (Tier 2 found a headless path to the real GPU — see its
conventions below), and a frame *rate* read from a Claude browser pane is not a
measurement at all (`requestAnimationFrame` fires 0 times there).

## The conventions M7 Tier 2 added — the manifestation stage

Six, and the thesis under all of them extends M7's: **the arena is still a
renderer, and a manifestation is a pose.** Tier 2 put things *on* the table — a
figure at every creature, auras on the figure, lands as terrain, mana motes, the
stack as spell forms, two duelists (silhouette busts until slice 4), bloom — and
every one of them is a pure function of the frame on screen except the transitions. Read
[`docs/research/13-arena-tier2-plan.md`](docs/research/13-arena-tier2-plan.md)
in full before touching `web/src/arena/figures/` or the Tier 2 files under
`scene/`; [`docs/research/12-arena-tier2-assets.md`](docs/research/12-arena-tier2-assets.md)
is the asset landscape and `docs/evidence/m7-tier2.md` is what was measured.
**D53–D63** are the decisions, the user's nine among them; slice 2 (T8,
`docs/evidence/m7-tier2-slice2.md`) added **D64–D68** and **D73** for the figures
and **D72** for the cue clock under them, and its camera rules are the next
section's; slice 3 (T9–T12, `docs/evidence/m7-tier2-slice3.md`) added
**D75–D81**, its second verification pass **D82–D87** and its documentation pass
**D88–D89**, and its per-card identity rules are the section after that; slice 4
(T13 and the proportioned bodies, `docs/evidence/m7-tier2-slice4.md`) added
**D95–D101** (**D90–D94** are `main`'s card library, which landed on
`main` first), and its body, costume and duelist rules are the last Tier 2 section.

1. **If the snapshot says it, it is a POSE; if only the event says it, it is a
   CUE** (**D56**). A creature's figure, its stance (tapped kneels, it does not
   turn with its card; `sick` is translucent; blocking comes from
   `state.combat`, never the `blockers` event), an aura on its host, a land's
   tile and its tapped dimming, the standing mana pool, a spell form at its
   caster's anchor, a tether to its target, the combat freeze — all poses,
   correct after `skip all`, a backwards scrub, a `resync` and a new `gameId`
   with no history. Summon, lunge, hit, the snap-on, the ripple, a mote's
   flight, the strike, the fizzle — cues, which decay to identity. Build a thing
   on the wrong side and it is either invisible after a skip or stuck on screen.
   **The defect this prevents is a renderer that remembers.** A death is the one
   place that line was argued twice (**D64**, superseding D56's clause): the
   snapshot that carries it has already removed the living figure, so the body is
   a transient of its own — `FigureLayer`'s `DepartureField`, built at commit from
   the PREVIOUS frame's pose (one frame of look-behind, like **D63**), drawn from
   that snapshot until the card's own death cue has ended, decided once by
   `CueQueue.deathPending` through `figures/clips.ts`'s `stepDeparture`, and
   stepped out of the rank that closed up behind it (`departureStand`). **Its fate
   is the queue's, not the clip lane's**: slice 2 first drew it only while the `die`
   REQUEST was on the stage, and every death blinked for up to 1.3 s while the
   batch's damage cues played — `clips.test.ts` now walks the queue's timeline over
   all 17 corpus deaths. It also depends on `Arena.tsx`'s intake being a
   **`useLayoutEffect`** (the canvas is a second React root with its own scheduler;
   a liveness clause holds it). `attach.test.ts`, `tiles.test.ts` and
   `stack.test.ts` sweep the corpus for the pose half.
2. **`figurePose` is THE pose and `FigureLayer` is THE figure renderer** — the
   same rule as `CardPlane` (M7 convention 2), and the renderer's half of hard
   rule 8 in a new shape, because choosing a mesh is a statement about what a
   card is. `figures/pose.ts`'s `figurePose(layout(state), combat, data)` is
   pure, and `figures/` imports no three, no React, no DOM and starts no timer
   (`liveness.test.ts`). **`layout.ts` is still the only module that knows a
   coordinate** — `standPointOf`, `FIGURE_STANDOFF`, `FIGURE_MAX_WIDTH`, the
   `casting` anchor, `DEPARTURE_STEP` and `ON_CARD_DISC_ORDER` all live there.
   **The width clamp is strict for every archetype** (**D65**: no floor, no
   overflowing drone — slice 1's drone numbers were the build's mismeasurement),
   and **a wrapped rank's back row stands ON its own card** (**D66**), its disc in
   the disc field's second pass, after the cards, because a transparent disc that
   writes no depth is painted over by any card drawn after it. A figure is placed only for a card whose
   `Placement.back` is `false`; a **face-down creature is always the anonymous
   disc** (`figure-pose.test.ts` asserts it over 1,138 corpus instances); a
   redacted permanent gets no figure at all. A figure **carries no name** (no
   label above it, ever), **takes no click** (`raycast` is cleared on every
   clone, so `HitProxy` stays the only thing the raycaster sees), and nothing
   gates on `selectable`. `replay-cues.test.ts`'s redaction net covers model ids
   and clip names, because `"helicarrier"` in an op log is a name by another
   spelling. The other pose layers — `discs.ts`, `tiles.ts`, `casting.ts`,
   `overlays.ts`, `busts.ts` — are each an `InstancedMesh` field, bound **only**
   from `CueRunner`'s frame loop (a liveness clause). The duelists are not
   creatures and not `FigureLayer`'s: `scene/DuelistLayer.tsx` is THEIR one
   renderer, bound only through `BustField.bind` (slice 4, below).
3. **The clip lane is scrubbed, never ticked** (**D57**). The cue's `t` becomes
   `action.time = t × duration`, then `mixer.update(0)`; a zero delta is a
   scrub in `three@0.186.0`, so pause, speed, step, skip, the live budgets and
   reduced motion hold for skinned animation with no second clock.
   `liveness.test.ts` asserts **every `mixer.update` under `web/src/arena/` is the
   literal `0`**, that only `scene/CueRunner.tsx`, `scene/FigureLayer.tsx` and
   (since slice 4) `scene/DuelistLayer.tsx` call one, and that only the frame loop
   writes `action.time` — negative-controlled.
   **Never use drei's `useAnimations`**: it is a `useFrame` per creature with a
   wall clock. Clips arbitrate through **one** function, `clipBeats`, that both
   `SceneStage` and `NullStage` call (a test double that drifts from the real
   stage is worth nothing — it hid a defect once); a request with the same `key`
   replaces its own; `stage.clips` is empty after every batch; under
   `prefers-reduced-motion` no clip is written. A clip is keyed by **cue id**
   (`figures/clips.ts`'s `CLIP_FOR`) and a per-card variant is `params.clip` —
   **never a new cue id**. A missing clip removes only what the model would have
   added; root motion is refused at build time.
4. **Only CC0 assets, each with a written provenance — no Mixamo, and nothing
   from card art** (**D54**, user decisions 3 and 4). `tools/assets-manifest.json`
   is hand-written: URL, bytes, sha256, date, and the licence badge **verbatim on
   the day**, because the badge is the only evidence that survives the page
   changing. `web/src/arena/figures/models.json` is **generated** by
   `tools/build-figures.mjs` — never edit it by hand. Models load from
   `web/public/models/` through three's own `GLTFLoader` + `MeshoptDecoder` and
   from nowhere else: **never drei's `useGLTF`**, whose DRACO decoder defaults to
   `https://www.gstatic.com/…`. Liveness holds that as an **allow-list**, not a
   hostname denylist (Tier 2 follow-up 8, closed in slice 2): no string literal
   under `web/src/arena/` may carry a URL scheme unless `URL_ALLOW` names it with a
   reason (today only the Scryfall credit link), and in the arena's JSON only
   provenance keys may. The negative controls live in the test. A missing
   `figures.glb` is a **supported state**: every creature draws its disc and
   every duelist its bust. Three
   pipeline traps, each measured: **`meshopt` is the last step** (a `prune` after
   it undid the compression); **`prune --keep-attributes true` after `unlit`**
   (the default strips `NORMAL`, and the fresnel shader then draws every figure
   solid black in a file that still validates); and the skinned join is the
   script's own, because `gltf-transform join` skips skins. Since slice 2 the
   build **verifies every source's bytes and sha256** against the manifest before
   it builds, the library carries **no texture** (**D67**), and `figures.test.ts`
   fails when the committed `figures.glb` is not the file `models.json` records.
   **Since slice 4** every humanoid card stands in a proportioned body on the
   Universal Animation Library's own 65-joint rig, and every clip it plays is the
   library's, retargeted by the build (**D95**); the three chibi fallbacks keep
   Kenney's one 7-joint rig and **D68**'s clip set. The build also resolves the
   meshoptimizer nested under `@gltf-transform/cli` to decimate the bodies
   (**D96**), so pin that CLI before you trust a rebuild's bytes. **The Tier 3 seam:**
   a per-card entry in `figures.json` may choose a model and alias a clip; it may
   not introduce a model used by exactly one card.
5. **The scene stays unlit, and an idle table still renders nothing** (**D53**,
   **D58**). No lights, no shadow maps, and the cards are never lit; figures use
   `scene/holoMaterial.ts` — one program for every figure and both duelists, a
   view-space fresnel, `#include <colorspace_fragment>`, a costume palette since
   slice 4 (below), and nothing that reads a clock. Figures
   breathe **only while the queue is awake**. The hot path still allocates
   nothing: colours go through `scene/colourCache.ts`'s `parsedColour`, never a
   per-frame `Color.set('#…')`; anchors are pooled. The budgets are separate on
   purpose: the effect pool is **fixed at 45** (glow 8, ring 8, beam 5,
   particles 3, text 6, plate 3, mote 12 — 26 at Tier 1, 38 with the motes, 45
   since slice 3's T11 beats, **D79**; at most
   `MAX_LIVE_EFFECTS = 8` blended transients and `MAX_LIVE_MOTES = 12` motes
   live at once), pose overlays have their own
   `MAX_POSE_OVERLAYS = 12`, and at most `MAX_FIGURES = 12` creatures carry a
   model (the rest draw discs). Anything that parks a mesh invisible must
   **`prime()`** it at mount — three compiles a program the first frame an
   object is drawn, and under bloom that compile landed mid-game as a 52–62 ms
   frame. **The "allocates nothing" claim is a liveness clause now**, not a
   header comment: it reads the bodies the frame loop reaches through the disc
   field (`DiscField.bind`, `DepartureField.bind` and its helpers,
   `CueQueue.deathPending`, the lane functions) and rejects every allocating
   construct a grep can see — `new`, array and object literals, spreads,
   closures, template strings, `for…of` and `.values()` iterators — with the
   junk lines that must be caught spliced into every body as it runs. Extend its
   body list when the frame loop grows.
6. **Bloom is the one post pass, and it is lazy** (**D61**). `scene/Post.tsx` is
   imported only when bloom is first on (its own `Post` chunk); a liveness clause
   keeps it lazy and the only pass. `BLOOM_DEFAULT` lives in `arena/perf.ts`, not
   beside the component, so reading the default never loads `postprocessing`.
   `?bloom=0|1` sets where it starts, the cue strip carries the checkbox, and the
   DPR governor's rung below its floor turns it off on a machine still late at
   0.6. **With bloom on, `gl.info.render` counts one call** (the composer's last
   pass) — read draw calls with it off.

Two more things worth knowing. **Every performance number must say what drew
it.** T7 found that headless Chromium reaches this machine's GTX 1080 through
ANGLE (`tools/arena-bench.mjs --gpu gl`, and the report prints WebGL's unmasked
renderer); SwiftShader is still the default and the lower bound, and neither is
a headed browser on the user's desktop or an integrated GPU. The bench frame is
**`g1.jsonl` at transport index 316** (`--index 316`, 11 modelled figures) —
**not** `human-sideboard-7`, whose 21-creature frame is all probe-deck beasts on
discs. And **headless Chromium parks on `frameloop='demand'` exactly as the
browser pane does**: `queue.advance(ms)` moves the virtual clock without asking
for a repaint, so every mid-cue reading in the evidence was taken by pumping
fiber's own `advance()` — imported from the app's **pre-bundled** instance
(`/node_modules/.vite/deps/@react-three_fiber.js`; a second copy has its own root
registry and advances nothing) — a few frames after each `queue.advance()`.
(Slice 2's refinement: headless Chromium, unlike the pane, **does** run
`requestAnimationFrame`, so a camera move or a batch that keeps the loop awake
plays out with no pump at all — the camera track needed none. It is only a
*paused* queue stepped by hand that needs the pump. When counting what was drawn,
hook `gl.render`; a separate rAF sampler runs out of order with fiber's own
callback and reports a phantom one-frame gap.)

## The conventions Tier 2's slice 2 added — the camera views

Five, and the thesis is the arena's own sentence applied to the lens: **a camera
view is a POSE and the director is a PURE FUNCTION** — the camera decides what
you look at, never what happened. Slice 2 (T8) built five named views, spectator
mode and an auto director; **D69–D71** and **D74** are the decisions,
`docs/evidence/m7-tier2-slice2.md` is what was measured, and report 09 §8's seven
camera rules still hold under all of it.

1. **A view is a row of data in `camera.ts`'s `VIEWS`, and `camera.ts` is still
   pure.** Each `ViewSpec` is a position and a target (`orbitFromPose` gives the
   orbit), a key and a `seatSafe` literal — no three, no React, no DOM, no
   storage and no clock of its own (the cue engine only as a type), which a
   liveness clause asserts. **The chosen view is `CameraDirector.home`**, so a
   cue's swoop is an excursion from it that comes back to it — the camera's
   version of **D50**'s offset that decays to identity; there is no second
   "rest pose". Only `scene/CueRunner.tsx` calls `director.tick`, `applyView` or
   `request` (liveness). A view change is an ease (650 ms at a seat, 1,400 ms for
   a spectator) and a **cut** under reduced motion. Add a view as a row, with its
   `seatSafe`, and let `camera.test.ts` recompute the flag.
2. **A view is usable at a live seat iff `keepsSeat`** (**D69**) — inside
   `ORBIT_CLAMPS`, the hand and battlefield anchors framed (§8 rule 6's
   `framesSeat`), **and no point of the seat's own land and creature rank lines
   covered by a seven-card hand fan** (`ranksUncovered`, the verification pass's
   addition: rule 6 alone had let the fan cover most of the land rank) — at every
   aspect in `LIVE_ASPECTS`, against `layout.ts`'s own geometry. `seatSafe` is a
   literal so the switcher needs no anchors to grey a button, and the test
   recomputes it, so it cannot drift. **A view that fails is spectator-only —
   never "allowed with a DOM hand strip"**, which would be a second card renderer
   beside `CardPlane` (M7 convention 2) and a second place to click the same
   card. **Spectator mode** is on by itself in a replay and from the moment a live
   game ends, never while a seat is live.
3. **The auto director is `directShot(beats, shot, now)` and `beatsOf(events,
   lookup)`, both pure** (**D70**). A beat reads player ids, a card's public
   `controller` and the previous frame's `stack[].target*Ids` — **never a name**
   (hard rule 8's renderer half) — and the director is fed the same batch the
   queue is, at the same moment. Its three numbers live in `DIRECTOR`: a 2.4 s
   minimum shot, a 4.8 s cooldown that **combat and the outcome are exempt from**
   (never from the minimum shot), and a 1.6 s held beat. Cuts are cuts, never
   eases, and nothing cuts within 5 s of the user's last drag.
   `camera.test.ts` runs the director over every batch of all 19 committed
   recordings at two paces and asserts both numbers on every cut (596 cuts; the
   evidence re-ran it with both at 0 and it found 632 short shots and 309
   cooldown violations, so the assertion has teeth — re-run that control when a
   number moves).
4. **Rule 5 is about a live SEAT, `change` is the user's only under their hand,
   and the choice lives in this browser** (**D71**). The camera applies "do not
   move while the engine waits on the human" only in live mode — a replay's
   recorded `input` is history. `OrbitControls`' `change` counts as the user's
   only between `start` and `end` plus `USER_TAIL_MS` (1.5 s) of damping tail,
   because its first update after a programmatic move fires a stale `change`.
   The choice persists under `localStorage` `mtg-table.arena.camera` — **every
   access in `Arena.tsx`, inside `try`** (liveness), the table when nothing valid
   is stored — and a stored spectator-only view shows the table at a live seat.
5. **The camera keys are keymap rows, and on the board they are `inert`**
   (**D74**, M4 convention 4). `1`–`5`, `6`/`0` and `O` are three of `keys.ts`'s
   24 rows; `keys.ts` may not import `arena/` (**D49**), so it spells the ids as
   `CAMERA_KEYS` and `keys.test.ts` holds the two maps together. On the board each
   plans an `inert` whose reason names `V` — never a `view`, which `Board.tsx`'s
   silent `default:` would swallow.

Two things the camera track changed that a reviewer should know are deliberate:
**`reset()` and `K` snap the camera home** (a scrub used to abandon it mid-swoop),
and because rule 5 now waits for a live seat, **camera cues play in replays of
human games** where they used to be dropped on every frame whose recorded OK was
enabled.

## The conventions Tier 2's slice 3 added — per-card identity

Six, and the thesis is one sentence: **a card reads as ITSELF through data, and
every piece of that data is a pose.** The user's verdict on slice 2 was
"everything still looks very generic" — five bodies in a colour — and slice 3
(T9–T12) answered it without a model per card. **D75–D81** are the decisions
(**D82–D87** its second verification pass's, **D88–D89** written up by its
documentation pass), `docs/evidence/m7-tier2-slice3.md` is what was measured,
PLAN.md's *Slice 3* has the status and the fourteen follow-ups, and README's *Tier
2, slice 3 — every card reads as itself* is how to give a card its identity.

1. **Identity is `figures/traits.json`, validated like `cues.json`** (**D75**).
   `figures.json` says which BODY a card stands in; `traits.json` says what makes
   it that card — `scale`, `hover`, `idle`, `tint`, `accent`, `shade`, `turn` +
   `turnedRatio`, `props`, `swarm` + `formation`, `silhouette`, `shrink`. The
   ladder is default ⊕ subtype rungs (least specific first) ⊕ the card's row;
   `props` is replaced, never appended. A bad row is dropped and the ladder falls
   through; `traits.test.ts` fails on any error and prints the census (which card
   got which rungs and props over 3,679 board frames) every run, and its "task
   list" reads each deck card's identity back off the census — extend it when you
   add a row.
2. **A prop is a SHARED KIND from `figures/props.ts`'s closed kit, procedural and
   instanced — one draw call per kind on the table, never per figure.** Eighteen
   nameable kinds (the second verification pass added `visor`) and three derived
   ones (`squad`, `swarmBee`, `carrier`), each with a blend, a colour role
   (`accent` / `tint` / a fixed hex) and anchors per body family (since slice 4
   the table is in the last section below; at slice 3 it was: the three Kenney
   bodies share one 7-joint rig); a kind may have more than one anchor (the
   badge's chest and back). Every kind is open to every row (Bold Biochemist's lab
   coat is Fury's `coat`). **Size is identity, and so is the side it is on**: a
   figure is 45–75 px tall in the table view at 1600 × 1000 (the chibis; slice 4's
   proportioned bodies stand their full height, 60–100 px), and **the opponent's
   figures show that view their BACKS** (D81) — both verification passes found
   props judged only on the viewer's own figures. `traits.test.ts` now rasterises
   every deck card's props through the table camera on BOTH seats, standing and
   kneeling, with the real `figures.glb` and the real `PropField`
   (`web/test/prop-raster.ts`, **D83**): every identity prop ≥ 48 px on both
   seats, except a documented ONE-SIDED detail (`tie`, `laserEye`, `exhaust`, and
   since slice 4 `eyepatch`, **D98**)
   whose partner carries the card on the other side. Extend that list only with a
   reason; judge a new prop at 1× from views 1 and 4 as well. A new kind needs a
   `LOOKS` entry, a `buildKindGeometry` case (≤ 1,200 triangles, asserted) and an
   anchor; nothing is ever a model used by exactly one card (report 13 §12).
   **Several bodies are still one pose** (**D88**): a `swarm` is instances of ONE
   derived kind round the card's one rig — the Air Force's five procedural bees
   round an insect rig that is kept for the clip lane and never drawn, the Agents'
   followers baked once from the library and riding the leader's root — clamped
   as a whole formation (`swarmSpan`, D65 strict). Never a figure per member: the
   engine names one card, so the cue layer gets one body.
3. **The prop field rides the one frame loop** (**D78**). `scene/props.ts`'s
   `PropField` is built, installed and committed only by `FigureLayer` (once per
   snapshot, after the rigs and the departing bodies), bound only from
   `DiscField.bind`, and its frame-loop body is in liveness's allocation scan. A
   dying figure keeps its props (`DepartureField.bodies()`), and the field follows
   `prefers-reduced-motion` live. **Hard rule 8:** an anonymous figure gets no
   prop, no hover, no swarm, no silhouette and no trait rung (asserted over 1,179
   corpus instances); a prop carries a kind and a colour, never a name, and takes
   no click.
4. **ONE definition of a figure's front** (**D81**). Figure space faces **+Z**
   (`layout.ts`'s `FIGURE_FRONT_Z`); `seatFacingY` is which way a seat's figures
   stand; `figurePointInto` / `figureAnchorOf` are the only resolution of a beat's
   `fwd` / `side` (right = front × up). A cue that lands a beat ON a prop derives
   its anchor from the prop's own point (Agent 13's muzzle flash from
   `PISTOL_MUZZLE`). `facing.test.ts` resolves every front-anchored beat against
   its prop for both seats. **Your figures face YOU** — measured, deliberately not
   changed, and PLAN.md's question 13: turning them is one line in `seatFacingY`
   and everything else follows. **An attacker FACES its defender while it
   attacks** whichever way it rests (**D82**): the offset's **`dRotY`** is the
   figure's own vocabulary (a card ignores it, as a figure ignores `dRotZ`), and a
   cue gets the angle from `Stage.yawTo` — `layout.ts`'s answer, never a yaw of
   its own — times its lunge envelope, so it decays to 0. Every consumer of a
   figure's facing adds it: the rig, the prop field's root props and the `figure`
   anchor.
5. **A beat is drawn on the BODY, and every cue param is closed** (**D79**). The
   `figure` anchor is resolved only by `scene/effects.ts`'s `#figurePoint` (the
   camera can never be handed one); `cues/validate.ts`'s `PARAM_SPECS` is the
   whole param vocabulary — an unknown name, an out-of-range value or an event
   fact (`beamTo`, `strikeCard`, …) is an error. Add a param as a row there, with
   its range, and to `cues-exhaustive.test.ts`'s all-params-on sweep. **An aim is
   the stack's, or nothing** (**D89**): Quake's shockwave keys off her trigger
   RESOLVING and reaches a target only when the previous frame's stack names one
   (4 of 13 in the corpus); pairing the batch's `tap` events to her would close the
   gap and is the heuristic that stays declined — the engine never says which card
   caused a tap. An unaimed beat plays on its own card and the census says so.
6. **Overhead and beside things cover nothing from the table view, and nothing
   goes under the HUD** (**D77**, **D80**, **D85**). Your carrier flies over your
   rank at `SILHOUETTE_ALTITUDE` (2.05), 1.5 long; the OPPONENT's over the table's
   centre line, low and a fifth smaller (`silhouettePlacementOf`) — over their
   rank it was either under the arena's chrome or over their figures. The chrome
   is `layout.ts`'s `HUD_TOP_PX` (128 CSS px over the canvas top, fixed), a
   keep-out band `figure-pose.test.ts` holds every carrier out of at every live
   aspect. A station (Strategic Intervention's console, Web Up's cocoon) stands
   figure-sized at its own slot's stand point. `figure-pose.test.ts` and
   `attach.test.ts` project every carrier, station and figure through the table
   view's camera and assert a cover under 5% (negative-controlled). The attachment
   looks (`shell`, `glints`, `circuit`) are per-name rows in `figures.json` — if a
   test lays data over the committed file, it proves the pipeline and not the game.
   **An attachment's card lies UNDER its host** (`ATTACH_DY` −0.002, **D86**), so
   the click order is the drawing order: `attach.test.ts` raycasts `HitProxy`'s
   planes from the three seat-safe views and every host-centre click hits the host.
   Never "route" a click to a host instead — that is gating on `selectable`.

## Card library — the conventions D90–D94 added

Six, and the thesis is one sentence: **public card data, a tool beside the game,
and nothing the game depends on.** On the user's request of 2026-09-27 README's
card-library NON-GOAL was lifted *in part* (**D90**): a local index of every card
(`tools/card-library/`) and a browser for it (`#cards`, `web/src/cards/`) exist as
dev-server tools. Report 03 §4 is the spec, `tools/card-library/README.md` the
manual, `docs/evidence/card-library.md` what was measured, and PLAN.md's *The card
library and the card browser* the status and twelve follow-ups. Hard rule 8 is the
engine wire's and does not govern public card data — but the web client's own
conventions all still hold, and the list below is where they bite.

1. **It is a tool, not a package, and the game never reads it** (**D90**,
   **D91**). No `package.json`, no npm dependency: `node:sqlite` with FTS5, `fetch`,
   `node:zlib` and type stripping, run from the repo root (hard rule 9). Everything
   it writes is under the gitignored `var/cards/`; the only Scryfall data in git is
   `fixtures/cards/`, **reduced to the fields the library reads** and regenerated
   by `make-fixture.ts`, never hand-edited (whether it is committed at all is
   PLAN.md question 15). The engine, the bridge, the board and the arena do not
   import it, and the board still draws from `art.json` — a board that needed the
   library would need a dev-only route to render a game.
2. **One door to Scryfall.** `tools/card-library/scryfall.ts`'s `ScryfallClient`
   is the only thing in the library that makes a request: `config.json`'s
   `scryfallUserAgent` plus `Accept: application/json` on every API call, 2 req/s
   on `/cards/search|named|random|collection` and 10 elsewhere, a 429 honoured for
   its `Retry-After`, and a request log every run prints as measured rates. A new
   call goes through it, never through a bare `fetch`. Anything at scale is the
   bulk file; set icons are downloaded, never hotlinked; `query.ts` has **no
   network in it**, so a search never reaches Scryfall. The committed User-Agent
   still carries a placeholder contact (question 16) and the tools say so on every
   run that talks to Scryfall.
3. **A build writes a fresh file** (**D91**): `cards.sqlite.building`, then
   `rename()`, with a `content_sha256` in `meta`. Never edit the index in place and
   never migrate it — a schema change is a rebuild (`build.ts --offline`). Two
   builds from the same data must carry the same digest; that is the idempotence
   check.
4. **The route is dev-only, and it never fetches** (**D92**). `/cards/api/*` and
   `/cards/img/*` are mounted in `vite.config.ts`'s `configureServer` and nowhere
   else — not `vite preview`, not the build (`cards-ui.test.ts` asserts it). An
   image miss is a **404**; the page then hot-links the CDN URL itself, and with
   neither draws a text frame. A route that fetched on a miss would be a Scryfall
   proxy, which is what the terms warn against and what D90 kept out. `devApi.ts`
   is Node-only — no browser module imports it — and loads `query.ts` with a
   runtime `import()`, so a missing or half-built index is a **state**, never a
   crash. **Every filter goes into the SQL before the scan cap**
   (`CardLibrary.search`'s `sets`, `oracleIds`, `colorsAny`): filtering after the
   1,000-hit cap made `creature` over MSH + MSC answer 1 card and `creature` in the
   deck 0, and `cards-api` holds the fix with an injected cap (negative-controlled:
   with the filters taken back out of the SQL, three of its tests fail). A new
   filter goes into the library first, and the page tests `approximate` before
   `total === 0`.
5. **The image cache is keyed by Scryfall id + size + face** (**D93**).
   `store.ts`'s `imagePathFor` is THE path — `var/cards/images/<id>/<size>[.back].<ext>`
   — and throws on anything that is not a UUID; `model.ts`'s `imageSides` is THE
   multi-face rule (top-level `image_uris` first, the faces only when it is
   absent; faces-first is a negative control that fails three tests). Never key
   an image by name. `.part` then `rename()`, never fetched twice. The browser
   shows **whole card images only** (`normal`, never `art_crop`), never cropped,
   stretched or filtered, with `Illus. <artist>` under **every** image, the
   copyright line in the detail, and a credit bar that wraps rather than clips.
6. **`CardView` is the browser's card renderer, and it is not `CardTile`**
   (**D94**). Nothing under `cards/` imports `render/CardTile.tsx` (its importer
   list stays closed at ten), anything from `render/` or `arena/`, or a stylesheet,
   and from `workshop/` only `links.ts` (the detail panel's *View in 3D*, **D102**:
   it imports nothing but the generated `catalog.json`); `Board.tsx`,
   `CardTile.tsx` and `Arena.tsx` never reach into `cards/`; `main.tsx` reaches the
   browser only through `lazy()` — all asserted by `cards-ui.test.ts` (and the
   `links.ts` half by `workshop.test.ts`).
   The browser keeps the client's rules **per surface**: its own keymap table
   (`cards/keys.ts` — `web/src/keys.ts` is the board's and the arena's, and
   `keys.test.ts` would demand its chords in the board's `?` overlay), its rules
   appended to `styles.css`, its logic in pure `.ts` for `node --test`, and its
   components in `hooks-order.test.ts`'s scan. **`#cards` unmounts the mode app**
   rather than hiding it, because a hidden board's `window` keydown listeners would
   press OK or Cancel in a live game from under the browser; the socket is
   page-scoped, a replay resumes at its frame (`replayCursors`), and the back link
   returns to the view you came from — the board, the arena or the workshop.

What stays a no, from D90: a package, a production route, any proxy of Scryfall,
any deck editing (the *copy .dck line* button copies; nothing writes a deck, and
it writes `|SET` only for MSH and MSC, the two sets whose code is checked against
Forge's), and any rules logic — legalities are Scryfall's data, displayed. The real
build needs the network and is **not** in `check-all.sh`; the four suites
(`cards-lib` 49, `cards-api` 15, `cards-ui` 29, the vitest `cards-render` 12) run
offline inside `npm --prefix web test` over `fixtures/cards/`.

## The conventions Tier 2's slice 4 added — bodies, costumes and duelists

Five, and the thesis is one sentence: **a person is a costume painted on a shared
body, and a duelist is a seat's pose.** The user's verdict on slice 3 was *"the
avatars are still pretty generic"*. Slice 4 answered it with two proportioned CC0
bodies, a costume palette and a full duelist per seat — no model per card, no
texture, no second program. **D95–D101** are the decisions (**D90–D94** are
`main`'s card library, which landed on `main` first),
`docs/evidence/m7-tier2-slice4.md` is what was measured, PLAN.md's *Slice 4* has
the status and the follow-ups, and README's *Tier 2, slice 4 — people in
costumes, and a duelist at each end* is how to dress a card and change a
duelist.

1. **A costume is a SLOT per vertex and a PALETTE per figure, written at
   COMMIT** (**D97**). The slot is a per-vertex attribute: the build writes
   `_REGION`, and `scene/models.ts` renames it once, at load, to
   `costumeRegion`. The palette is a **per-material uniform array**,
   `uCostume[8]` plus `uCostumeOn`, on each figure's own `HoloMaterial`. Every
   figure is a `SkinnedMesh` clone with its own material instance, all built
   from one source, so all of them share **one program**. The costume is **not**
   a vertex colour, **not** a texture (**D67**) and **not** an instance
   attribute — nothing here is instanced — so do not add one.
   `figures/props.ts`'s `COSTUME_SLOTS` order (`skin`, `hair`, `top`, `shirt`,
   `legs`, `shoes`, `gloves`, `belt`) **is the contract**: the build imports it,
   the shader indexes by it, and `traits.test.ts` holds the two together — never
   reorder it without a rebuild.

   **Only `holoMaterial.ts`'s `applyCostume` writes a costume colour**, and only
   at commit (`FigureLayer`'s and `DuelistLayer`'s layout effects, keyed so the
   strings are parsed once a game). A liveness clause forbids any `applyCostume`
   or `uCostume` write in `CueRunner.tsx`, `DiscField.bind`, `DepartureField.bind`
   or `PropField.bind`, negative-controlled, and the shader reads no clock. What
   the frame loop MAY write is a number: `uDrain`, a dying body's fade toward
   `uDrainTo`, which reaches every slot.

   The data is `traits.json`'s `costume`, merged slot by slot down the ladder;
   `figures/pose.ts`'s `costumeOf` is the one place a missing slot is filled.
   Skin is one tone for every card on purpose — a costume is identity data, a
   complexion is not. **Hard rule 8**: an anonymous figure wears nothing
   (asserted over 1,179 corpus instances), exactly as it carries no prop.
2. **A body belongs to a FAMILY, and every prop kind is fitted per family**
   (**D95**, **D98**). `familyOf` reads a humanoid's family off the manifest's
   rig (`ubc`, `kenney-mini`), so a new body on either rig needs no code; the
   drone and the insect are named by id. Each `PROP_KIT` kind carries
   anchors per family, in that family's figure space — one unit tall, feet at
   y = 0, facing +Z (**D81**) — and a family with no row draws nothing of that
   kind. `root` (the whole figure, lunge included) and `stand` (the stand point,
   ignoring the cue offset) are open to every family.

   | family | models | rig | joints the kit anchors to |
   |---|---|---|---|
   | **`human`** — the default | `agent` (the man), `hero` (the woman); `scientist` is `agent`'s node | `ubc`: the animation library's own 65-joint Unreal-named rig | `Head`, `spine_03`, `hand_l`, `hand_r`, `lowerarm_l` |
   | **`humanoid`** — the chibi fallback | `agent-chibi`, `hero-chibi`, `scientist-chibi` | `kenney-mini`, 7 joints | `head`, `torso`, `arm-left`, `arm-right` |
   | **`drone`** | `drone` | its own | `Head`, `Eye` |
   | **`insect`** | `insect` | its own | `Head`, `Head3` |

   The `human` anchors are written in the body's **bind (T-)pose** against the
   landmarks `figures/props.ts` prints — unless `PropAnchor.pose` names a clip
   and a phase. That is how Agent 13's pistol sits in her hand in her aim, and
   how `PISTOL_MUZZLE` stays on it for the cue's flash (`facing.test.ts`). Only
   `human` and `humanoid` wear a costume (`wearsCostume`). A new kind needs an
   anchor for `human` at least, and is judged by the raster test from both seats
   like every other (slice 3 convention 2); a one-sided detail has a named
   partner.
3. **The library is rebuilt by measurement, and the chibi is a FLAG** (**D95**,
   **D96**, **D98**). The per-model triangle targets live in
   `tools/assets-manifest.json` (a body 1,400, the drone 1,900, the bee 1,700),
   chosen against `g1`@355, not a guess. A body is simplified WITH its costume
   slots, and the shirt and belt are locked. The clips are retargeted by
   **world-space delta** over the 22 joints the manifest names, never by copying
   local rotations (the rigs' rest orientations differ). A clip written
   `ual:A+B` is composed: A's legs and hips (their turn removed) under B's upper
   body — the tapped kneel. Every clone starts at its **idle's first frame**
   (`instantiateFigure`'s `pose: 'rest'`); `PropField` asks for `pose: 'bind'`
   because its anchors are written in it. So **a humanoid model must have an
   `idle`**, or its bind pose shows whenever a clip's weight ramps (PLAN.md's
   slice-4 follow-up 8). `"body": "chibi"` in `traits.json` stands a card in
   `<model>-chibi`; `figures.test.ts` requires every `-chibi` model to be the
   fallback of a body the ladder reaches, so a fallback cannot rot unnoticed.
   The headroom is thin — 27 kB under 400 kB, ~2,600 triangles at `g1`@355 — so
   a new body or clip is measured against both before it is committed.
4. **A duelist is a SEAT's pose, and its gestures are cues** (**D99**,
   **D101**). `figures/duelists.json` is the data, validated like `cues.json`
   (unknown keys are errors; a bad look drops its seat to the bust), and
   `figures/duelists.ts` is pure (no three, React, DOM or clock). **A seat, never
   a player**: nothing reads `PlayerState.name`, a pose carries a seat, an id,
   colours and numbers (asserted over every board frame), and a duelist takes no
   click (`raycast` cleared). **The stance is a pose from `board.gameOver`
   alone** (`ready`, `won`, `lost`), so skip, scrub, `resync` and a new `gameId`
   need no history.

   **A gesture is a `gesture` PARAM on an existing cue, never a new cue id**
   (`cast`, `flinch`, `outcome`, `none`; `cues/validate.ts` knows it). It plays
   on the clip lane at **`duelistLane(player)` = −1,000,000 − player**, a
   reserved id no card can have. A cue's `end()` releases only its own request
   (`Stage.clipOf`, OPTIONAL), so the decay assertion covers the duelists with no
   line of its own. `queue.ts`'s rules 5b (an absorbed `cast` hands its gesture
   to the arrival) and 8 (one flinch per player per batch) are the queue's
   vocabulary, and `gesturePending` is its one indexed query, which `stanceEntry`
   uses so the end does not blink.

   **`scene/DuelistLayer.tsx` is THE duelist renderer**: one `SkinnedMesh` per
   seat with its props **baked** into the mesh (never instanced — the prop field
   stays `FigureLayer`'s, **D78**), built and disposed in **one layout effect**
   (a split cleanup once brought the busts back mid-game). `DuelistField.bind`
   is reached **only** through `BustField.bind`, which `CueRunner` calls once a
   frame; it calls `mixer.update(0)` and aims bones after it. Breathing reads the
   queue's virtual clock (`queue.now`), so an idle table still renders nothing.
   Liveness holds all of it and scans the bind bodies for allocation.
5. **Where a duelist stands is MEASURED against the camera, and the camera never
   moves for it** (**D100**). `duelistStand` takes `layout.ts`'s anchors
   (`playerAnchorFor('you')`, `anchorsFor('opp').creatures`) plus four offsets
   declared in `figures/duelists.ts` — **the one coordinate outside
   `layout.ts`** (Tier 2 convention 2), pure and held by `camera.test.ts`;
   moving the offsets into `layout.ts` changes nothing else (PLAN.md's slice-4
   follow-up 19). The duelists are **never** in the camera solver's required
   set: no view, clamp or solver rule may change to frame them. `camera.ts`'s
   three pure checks — `keepOutTop` (the chrome band), `clearOfHand` (a body's
   hull against every card of a seven-card fan) and `visibleShare` — are
   asserted at every seat-safe view and live aspect, with slice 1's bust anchors
   as the negative controls. **Anything placed at the far end of the table is
   under the chrome** from every seat-safe view; measure a stand point with
   these three before you move one. `visibleShare` does not yet model the player
   plates (PLAN.md's slice-4 follow-up 3).

## Workshop — the conventions D102–D104 added

Five, and the thesis is one sentence: **the workshop is the arena pointed at one
card: it draws with the arena's code and decides nothing the arena would not.**
`#workshop` (`web/src/workshop/`) is the card viewer the user asked for on
2026-09-27, to see the figures and how they act. It is a page that builds its own
boards and has no transport. README's *Arena mode → The workshop* is how to use
it, `docs/evidence/workshop.md` is what was measured, and PLAN.md's *The
workshop* has the status, **the rebase-onto-slice-4 checklist and how it went**,
and the follow-ups (seven closed by the reconciliation, five new). **D102–D104
are numbered after slice 4's D95–D101**, which this branch was rebased onto
(`23e26b3`); the `match-setup` branch numbered its own D102–D105 too, landed
second, and renumbered them **D105–D108**. The workshop and `#cards` link to each other: *View in
3D* in the browser's detail panel, *card text* in the workshop's header.

1. **Downstream of the arena, and the coupling is a list** (**D102**). Nothing
   under `arena/` imports `workshop/`, and the workshop's code edits nothing under
   `arena/` (the reconciliation's two arena fixes — `Arena.tsx`'s state-backed
   `loopRef`, three fizzle rows in `cues.json` — were the arena's desk, each held
   by an arena-side test). **Every arena export it uses is named in `Workshop.tsx`'s header
   comment**, and `workshop.test.ts` fails on an import the list does not name:
   add the name there, with what it is for, in the same change. Something the
   workshop needs from the arena is an arena change, made on the arena's desk,
   never a workshop-local copy of arena logic. There are three exceptions, each
   where the arena keeps the logic out of the workshop's reach, and each says so
   in its header:
   - `validated.ts` is `Arena.tsx`'s `useFigureData` / `useCueData` as pure
     functions;
   - `clipCue.ts` is the registry's `playClip` discipline for one clip;
   - `legibility.ts` is `test/prop-raster.ts`'s rasteriser for the browser (a
     page cannot read `node:fs`). A test holds it equal pixel for pixel, so when
     `prop-raster.ts` changes, `legibility.ts` follows. Slice 4's per-family head
     (the skin and hair slots, `HUMAN_HEAD_FROM`) was the first such change, and
     it followed on the reconciliation.
2. **Every board is a synthetic FRAME from `synthetic.ts`** (**D104**). It is the
   only module that makes a `ClientState`, and the only one that imports the
   reducer as a value. Nothing poses a rig, places a card or chooses a mesh by
   hand. The pedestal hands the folded state to `layout`, `figurePose`,
   `FigureLayer`, `CardPlane` and `CueRunner`, so hard rule 8's renderer half —
   the anonymous disc, the stub with no figure, the back — holds on the pedestal
   because it is the arena's code. A new rehearsal copies an event shape the
   corpus shows Forge sending. What only the engine could choose (aim, what a
   blocker blocks, who crews) carries a `fiction` line that the panel shows.
   `catalog.json` is **generated**: after a deck, a fixture or a deck card's own
   `cues.json` entry changes, run `node tools/build-workshop-catalog.ts` (a test
   fails until you do), and never edit it by hand. The cue names are read for
   `threeD` — what the workshop can show of a card, the card browser's *View in
   3D* — because the browser may import no arena.
3. **The frame loop is the arena's** (**D102**). `CueRunner` is THE loop on the
   pedestal too. The workshop's one `useFrame` is `Pedestal.tsx`'s renderer at
   priority 1, after `CueRunner`, and it allocates nothing. The page carries no
   `fetch`, no socket, no timer and no URL except the Scryfall credit; every
   `mixer.update` is `0`; there is no `useAnimations` and no `useGLTF`. A clip on
   its own is `workshop.clip` in a **copy** of `REGISTRY`, never an entry in
   `REGISTRY` itself. There is no `HitProxy` and no `onAct`, so the pedestal takes
   no click, and `PedestalDirector` drops camera cues. The pedestal's `<Canvas
   frameloop>` is backed by React state: a fiber-initiated re-render (a resize)
   re-applied a stale mode and froze a batch. The arena had the same defect
   (measured on the reconciliation) and has the same fix — its `loopRef`'s setter
   is a state setter (M7 convention 5). **The duelists are not on the pedestal**:
   they are a seat's, not a card's (**D99**), so `CueRunner` is handed no busts
   and no `DuelistLayer` is mounted (a test holds both).
4. **Tuning leaves the browser only by the clipboard** (**D103**). Overrides live
   in `localStorage` under `mtg-table.workshop.overrides`, with every access in
   `try`. Only the workshop reads them, and they pass the arena's own validators:
   `validated.ts` is `Arena.tsx`'s order. **Never add a path that writes
   `traits.json` or `cues.json` from the page, and never let the arena or the
   board read that key**, because a tuned look in a game is a renderer that
   remembers. The copy buttons print the **committed** text with the edit folded
   in: every key in order, comments, `presence` and `station` kept. They are
   disabled while the validator names the card, and `workshop.test.ts` holds the
   copies to the committed text byte for byte — `cues.json` one value per line,
   `traits.json` as slice 4 re-wrote it, `JSON.stringify(…, null, 2)`. A new
   trait key needs a row in `Workshop.tsx`'s `TuningPanel`, whose field list is
   written out; slice 4's `costume` (a row per `COSTUME_SLOTS` slot) and `body`
   were the first, and `workshop.test.ts` now fails when `validate.ts`'s
   `TRAIT_KEYS` names a key the panel does not write.
5. **A page of its own, by `#cards`'s rules** (**D94**, **D102**):
   - lazy, through `lazy(() => import('./workshop/Workshop.tsx'))` (**D49**); the
     scene chunk it shares with the arena is `arena-scene-*.js`, named by
     `vite.config.ts`;
   - the mode app is unmounted under it;
   - its keys are its own table, `workshop/keys.ts`, whose rows carry their
     actions, with no `case '<key>'` in `Workshop.tsx`. `W` is its one row in
     `web/src/keys.ts`, dispatched by `main.tsx` only while the arena is really
     mounted;
   - its CSS is appended to `styles.css`;
   - its logic is pure `.ts`: only `Workshop.tsx`, `Pedestal.tsx`,
     `legibility.ts` and `data.ts` may import three or React;
   - its components are in `hooks-order.test.ts`'s scan.

   The list's thumbnail is its one card image outside `CardPlane` (M4 convention
   2's exemption), and a concealed entry never looks its art up.

   Its URL is `#workshop?card=<name>` — read by `links.ts`'s `cardFromLocation`,
   the hash's query first as `#cards` reads its own, and written back as the list
   moves. **`links.ts` is the one workshop module another page imports**:
   `cards/CardDetail.tsx`'s *View in 3D* (live for a creature, a Vehicle, or a
   card with its own `cues.json` entry; greyed with the reason otherwise), and it
   imports only `catalog.json` and a type — so keep it that way, or the card
   browser's chunk starts carrying the workshop.

The tests are `web/test/workshop.test.ts`: 43 cases inside `npm --prefix web test`,
so inside `check-all.sh` too. Its liveness half (`workshopFiles()`) scans every
`.ts` / `.tsx` **directly under** `web/src/workshop/`, and skips subdirectories.
Keep the directory flat, or extend the scan in the same change. The screenshot
driver's handle, `window.__mtgWorkshop` (the queue, `select`, the options, the
camera mode, fiber's store), exists only under `import.meta.env.DEV`, as
`__mtgArena` does.

## Treat forge-src as prose

A Forge **2.0.15-SNAPSHOT** source checkout may be available in the session
scratchpad. It is **slightly ahead of the 2.0.14 jar we compile against**. Read it
for shape and intent; **never copy-paste from it**, and **confirm every signature
with `javap` against the jar before using it**:

```bash
java -m jdk.jdeps/com.sun.tools.javap.Main -cp "$FORGE_JAR" forge.gui.interfaces.IGuiGame
```

Known drift: `Game.setNoGUIUser()` (2.0.15 only), gson (a 2.0.15 dependency,
absent from the jar), `forge.view.Main sim` (cannot run headless in 2.0.14). The
jar's manifest actually reads `2.0.14-SNAPSHOT-08.08`, so it is closer to master
than its version suggests — `GameEventForwarder`, `DeltaSyncManager` and
`IGuiGame.handleGameEvents` are all present. `IGuiBase` and `IGuiGame` are
byte-identical across both versions, which is why this seam is a safe place to
stand.

**That last sentence was true of the source checkout of 2026-09-11, and is no
longer true of `IGuiGame` in Forge's later daily builds.** Measured with `javap`
against the `2.0.15-SNAPSHOT-09.27` daily jar (report 14, spike B): `IGuiBase`,
`HostedMatch`, `GameEventForwarder`, `GameView`, `PlayerView`, `StackItemView` and
all 26 mapped `GameEvent*` classes are still byte-identical, and `CardView` lost
only getters `Snap` does not read. But `IGuiGame`'s abstract set fell from 37 to
28 (`tempShowZones` / `hideZones` / `restoreOldZones` / `updateSingleCard`
deleted, `openZones` a default with a new signature, nineteen update, mana-pool
and overlay members turned into defaults; no abstract member added), and
`IGameController.passPriority()` is gone. The bridge does not compile against that
jar unchanged; the port is saved as a patch in `docs/research/patches/` and is not
applied (**D109**). Against any jar other than the pinned one, **run
`./tools/javap-seam-diff.sh <pinned.jar> <other.jar>` before believing either
paragraph**.

To regenerate the list of abstract members still to implement:

```bash
jp(){ java -m jdk.jdeps/com.sun.tools.javap.Main -cp "$FORGE_JAR" "$1" \
      | grep ';' | sed -E 's/^\s+//;s/.*\b([a-zA-Z0-9_]+)\(.*/\1/' | sort -u; }
comm -23 <(jp forge.gui.interfaces.IGuiGame) <(jp forge.gamemodes.match.AbstractGuiGame)
```

That diff yields **36 and misses one**: `AbstractGuiGame` declares its own
`protected abstract void updateCurrentPlayer(PlayerView)`, which is not on
`IGuiGame` at all. **There are 37 members and the class will not compile without
it** (`docs/research/07-wireguigame-spec.md` §0.1) — on 2.0.14; the same recipe
gives 27 + 1 = 28 on the 09-27 daily build. Check the class directly:

```bash
java -m jdk.jdeps/com.sun.tools.javap.Main -cp "$FORGE_JAR" \
    forge.gamemodes.match.AbstractGuiGame | grep abstract
```

## Never write outside this repo

Write only under `/home/justin-a/code/mtg-table`. **Never write, move or rename
anything under `/home/justin-a/forge` or `/home/justin-a/.forge`** — that is the
user's real Forge install and their real decks. Forge's profile is redirected into
`var/` by `forge-home/forge.profile.properties` (absolute `userDir` and
`cacheDir`); `forge-home/res` is a symlink to `/home/justin-a/forge/res`.

`FModel.initialize` creates 24 profile directories. It must create them in `var/`.
When in doubt, `sha1sum` the `~/.forge/decks/constructed/` tree before and after a
run.

The same holds for a **newer Forge**: it is never unpacked over `~/forge` or
upgraded in place. An engine being evaluated lives in the session scratchpad or a
throwaway home under `var/` (as `tools/audit-deck.mjs` builds under
`var/audit-deck/`); an adopted official release lives under
`var/forge-engine/<version>/` (**D110**). Before and after the first run on any
engine other than `~/forge`'s, `sha1sum` the `~/forge` jar (it must stay
`3c0a7c38…8e5dd9`) and the `~/.forge/decks/constructed/` tree.

## The user commits

**Do not run `git commit`, `git add`, or `git push`.** The user commits their own
work. Leave changes in the working tree and say what you changed.

## Where the docs live

| File | What it is |
|---|---|
| `docs/protocol.md` | **The living wire spec.** The Java emitter and the TS reducer are both written against it — change it *first*, then both ends. Read its **Amendments** list before assuming a shape. |
| `docs/research/05-architecture-synthesis.md` | **The spec.** Read in full before any design work. |
| `docs/research/01-forge-engine-seam.md` | The `IGuiGame` / `AbstractGuiGame` seam. |
| `docs/research/02-forge-build-and-headless.md` | Build and the **verified headless boot recipe (§4)**. |
| `docs/research/03-scryfall-card-library.md` | Scryfall, art resolution, the MSH/MSC split — and §4, **the spec the card library was built to** (D90): endpoints, headers, rate limits, the bulk format, the multi-face rule, the index and the image cache. |
| `tools/card-library/README.md` | **The card library (D90)**: the build, the image cache, the query CLI, what is on disk under `var/cards/`, Scryfall's terms as code, and what is not done. `docs/evidence/card-library.md` is what was measured, the card browser (`#cards`, `web/src/cards/`) included. |
| `docs/research/04-prior-art-and-licensing.md` | Prior art, GPL/AGPL analysis, Fan Content Policy. |
| `docs/research/06-hidden-information-audit.md` | **Every reveal path in Forge**, its wire channel, its leak signature; the basis of hard rule 8 and of `tools/check-redaction.mjs`'s assertions. |
| `docs/research/07-wireguigame-spec.md` | **The M2 spec.** 37 abstract members, the five threads, the eleven ask kinds, the null defaults. |
| `docs/research/08-deck-card-coverage.md` | Card-by-card fidelity for the deck in play; D13 and D14 come from it. |
| `docs/research/09-arena-tier1-plan.md` | **M7 Tier 1 — the spec for the arena.** Dependencies and the React 18/19 fork, the scene graph, the texture pipeline, the offset model, the event→cue table, the camera rules, the performance budget and the six evenings E1–E6. Read in full before touching `web/src/arena/`. |
| `docs/research/12-arena-tier2-assets.md` | **M7 Tier 2 — the asset landscape.** Which packs are really CC0 (and Quaternius's 2026-08-28 relicensing), measured GLB internals, Mixamo's terms, image-to-3D and the card-art question, the gltf-transform pipeline, and the two drei traps (`useAnimations`, `useGLTF`'s gstatic Draco). |
| `docs/research/13-arena-tier2-plan.md` | **M7 Tier 2 — the spec for the manifestation stage**, written against the Tier 1 code: the five invariants, the corpus measurements, `figurePose`, the pose-versus-cue rule, the clip lane, auras, lands, the stack, duelists, the budget, the asset pipeline, the tests and the evenings T0–T14. Read in full before touching `web/src/arena/figures/`. |
| `docs/research/14-engine-upgrade.md` | **Engine and sets — why Forge stays 2.0.14 and what happens the day an official release ships Reality Fracture.** The two spikes judged (a card-script overlay on 2.0.14: fails; a port to the `2.0.15-SNAPSHOT-09.27` daily build: excluded by the user), the defects they found in the bridge and the gate, and §0, **the checklist for the day**. Decisions **D109–D112**; `docs/evidence/engine-upgrade.md` is what was measured, report 08 §9 is the FRA deck card by card, `docs/research/patches/` holds the saved bridge port and its seam diff (never applied early), and `docs/drafts/` holds the draft FRA opponent (never loaded). PLAN.md's *Engine and sets* has the status, the day's checklist in short, the follow-ups and questions 18–22. |
| `docs/research/10-board-ui-spec.md` | **The M4 board.** Component tree, layout tokens, card tiles, arrows, wireframes. |
| `docs/research/11-engine-comfort-features.md` | **M6.** Phase stops, pass-to, auto-yield, auto-pay, undo, concede, new game — every one an engine feature, rendered. Read it with PLAN.md's *"What M5 hands to M6"*, which says what is already on the wire. |
| `docs/guides/java-for-typescript-people.md` | The Java this repo uses, from a TypeScript starting point: the `javap`-first workflow, enums on the wire, nullability, the thread asserts. |
| `docs/evidence/*.md` | What was actually run, with real numbers. |
| `PLAN.md` | The eight milestones M0..M7 — M7 Tier 1 is done, and **Tier 2 is complete**: its first slice (T0–T7), its second (T8 and the camera views), its third (T9–T12, per-card identity) and its fourth (proportioned bodies in painted costumes, T13's duelists and T14; built, verified once and documented on branch `tier2-slice4`, rebased onto `main`'s `754f504` on 2026-09-27, with nineteen follow-ups and *Tier 2 is complete — what is left*): *M7 Tier 2* has the four slices' status and evidence, slice 1's nineteen follow-ups (six closed by slice 2, one by slice 3), slice 2's ten (two closed by slice 3), slice 3's fourteen, the T13–T14 hand-over and *Tier 3 — a note, not a plan* (likeness models would be personal-only: local, gitignored, never committed) — plus the deferred list and the open questions only the user can settle (two new with slice 3: question 13, should your figures face the other seat?, and question 14, is likeness — Tier 3 — part of the end goal at all?). Off the plan, *The card library and the card browser* (**D90–D94**, 2026-09-27) has that tool's status, commands and twelve follow-ups, and questions 15–17 are its: commit `fixtures/cards/`?, the `scryfallUserAgent` contact, and every MSH + MSC image. Beside it, *The workshop* (**D102–D104**, 2026-09-27) has the card viewer's status, commands, its rebase onto slice 4 and its follow-ups. *Match setup* (**D105–D108**, 2026-09-27, a deferred item brought forward), just above *Deferred*, has the AI's own deck and profile: status, commands and follow-ups. |
| `DECISIONS.md` | The **one hundred and twelve** load-bearing decisions, dated, with rejected alternatives. **D102–D104**, 2026-09-27, are the workshop, numbered after Tier 2 slice 4's D95–D101: **D102** a lazy page outside `arena/` that reaches the arena through a listed set of exports and unmounts the mode app (reconciled onto slice 4 the same day: the costume row, `#cards` linked both ways through `workshop/links.ts`, and the arena's state-backed `loopRef`); **D103** tuning overrides in this browser's `localStorage`, through the arena's validators, leaving only as a copy of the committed text; **D104** synthetic frames from one pure builder, card facts from the corpus, the engine's choices labelled. **D105–D108**, 2026-09-27, are match setup's, numbered after the workshop's: **D105** the AI deck's NAME is public on the wire — `hello_ok.match.aiDeck` is `{name, cards}`, never a path, hash or list, negative-controlled by `fixtures/negative/redaction/m44-*`; **D106** only `scripts/play.sh` reads `config.json`'s `match` block, so the bridge and the gate never play what the player last chose; **D107** the AI's profile is always an explicit `profileOverride`, named from the `.ai` files, through one seam (`Bootstrap.createAiPlayer`), and it is not a difficulty; **D108** the AI's own deck is Doom Legion, and a card stays in it only if the AI casts it and the redaction gate passes. **D109–D112**, 2026-09-27, are the engine and sets, numbered on the `engine-upgrade` branch after match setup's (the `hardening` branch also numbers from D109; whichever lands second renumbers): **D109** the engine stays Forge 2.0.14 until an OFFICIAL Forge release ships Reality Fracture — no daily snapshot, no merged port, no card-script overlay; **D110** the engine pin: official releases only, one engine at a time, identified by its bytes and sha256, never installed over `~/forge`; **D111** no hand-written card scripts and no overlay of a newer engine's scripts; **D112** the FRA AI opponent is the user's own green-black "leftovers" list, finished with basics only, a draft until the user accepts it. (**D95–D101**, 2026-09-27, are M7 Tier 2 slice 4's: **D95** the humanoid bodies are Quaternius's *Universal Base Characters* on the animation library's own rig, every clip the library's, the chibis kept as fallbacks — superseding **D73**, and **D68** for those bodies; **D96** 1,400 triangles a body, the drone 1,900 and the bee 1,700, simplified with the costume slots by the CLI's own meshoptimizer; **D97** the hologram paints a costume — a slot per vertex, a palette per figure written at commit, still one program; **D98** the chibi as a `body` flag, props fitted per body family, the eyepatch one-sided; **D99** the duelists as full figures — a seat, not a player; a director and a villain; props baked — superseding **D62**; **D100** where they stand, the opponent's at the table's right because the far end is under the chrome; **D101** their gestures as a `gesture` param on reserved clip-lane ids, with suppression rules 5b and 8; **D90–D94**, 2026-09-27, are the local card library and the `#cards` browser: **D90** README's card-library NON-GOAL lifted in part, the dev-only route, the field-reduced fixture; **D91** `node:sqlite` + FTS5 with no npm dependency and a fresh file per build; **D92** the same-origin route in the Vite dev server, which never fetches; **D93** the image cache keyed by Scryfall id + size + face; **D94** `CardView` apart from `CardTile`, its own keymap, and `#cards` unmounting the mode app; D15–D19 are M2's, D20–D27 M3's, D28–D31 M4's, D32–D36 M5's, **D37–D45 M6's**, **D46–D52 M7's**, **D53–D89 M7 Tier 2's** — slice 3's documentation pass's first: **D88** several bodies are one pose — a swarm is instances of one kind round one rig (the Air Force's hidden insect rig, so a dying Air Force is not seen dying), a squad's followers baked once — **D89** Quake keyed off her trigger's resolution and aimed only by the stack, the tap-pairing heuristic declined; then its second verification pass's: **D82** an attacker faces its defender (`dRotY`, `Stage.yawTo`), **D83** identity read from BOTH seats as a rasterised number (the badge's back emblem, the pistol at the hip, the `visor`, Fury's black coat and patch), **D84** the Agents as a wedge and "three heads side by side", **D85** the opponent's carrier over the centre line and the HUD as a keep-out band, **D86** an attachment under its host so clicks follow the drawing, **D87** four quiet beats made to read; then slice 3's own: **D75** identity as data (`traits.json`) and a shared kit of procedural props, one draw call per kind, **D76** the giant ant flown side-on so D65 stays strict, **D77** a Vehicle as a carrier silhouette overhead, crewed or not, flying high enough to cover no figure from the table view, **D78** the prop field bound through `DiscField.bind`, committed per snapshot, riding the dying bodies too, **D79** T11's beats on the body (the `figure` anchor), the closed param table and suppression rule 7, **D80** T12's looks as poses with the deck's three attachment rows committed and the stations in their own rank slot, **D81** one definition of a figure's front, and your figures facing you as the user's call; then slice 2's: **D73** the hero (`character-female-b`) and scientist (`character-male-e`) bodies, chosen by silhouette because the hologram keeps only geometry, **D74** the camera keys as three keymap rows, `inert` on the board (both written up by slice 2's documentation pass), **D72** the cue clock runs only while there is film and `<Canvas frameloop>` is the runner's ref (the second verification pass; both defects Tier 1's), **D64** a creature that dies is seen dying, its body drawn from the snapshot until its death cue ends, decided by the queue (supersedes D56's clause), **D65** the width clamp strict for every archetype (`FIGURE_MIN_FIT` and the drone's overflow retired), **D66** a wrapped rank's back row stands on its own card and its disc draws after the cards, **D67** a library with no texture and a build that verifies its sources and records its output, **D68** one humanoid clip set with the UAL's `hit` and `die` retargeted in, **D69** five camera views, the two that lose the hand spectator-only, and a seat view that must keep its own ranks uncovered, **D70** the auto director's three numbers with combat and the outcome exempt from the cooldown, **D71** rule 5 only at a live seat, `change` counted only under the user's hand, and the stored view; then slice 1's — **D53** stylised CC0 figures under one unlit holographic material, **D54** CC0-only with a written provenance, no Mixamo, no models from card art, **D55** where a figure stands and the width clamp, **D56** pose versus cue, **D57** the clip lane scrubbed by `action.time` with a zero-delta mixer, **D58** breathing only while something animates, **D59** the land slabs, **D60** the mana motes and the seventh `Effect` kind (which supersedes report 09 §12.1's six and the 26-mesh pool), **D61** bloom on by default with a governor rung below the floor, **D62** the silhouette busts, **D63** the strike's one frame of look-behind; and before them — **D47** the React-18 3D line (fiber 8 / drei 9; the app does NOT move to React 19), **D48** the exact version pins with no caret and the named trip-wire, **D49** the arena as one lazily-imported chunk (the 2D entry chunk pays 1.63 kB gzip and no `three`), **D50** `layout(state)` authoritative with cues as offsets that decay to identity, **D51** one validated cue data file keyed by card name with a three-rung ladder, **D52** the Scryfall `normal` texture plus one shared rounded-corner alpha map; **D46 came out of M7's verification pass** — a counter type on the wire is Forge's *display* name (`+1/+1`), the doc was wrong rather than the bridge, and the key is an opaque string (amendment **M43**) — D40 from its verification pass, D41–D45 written up with the milestone: **D41** the `{own, opp}` phase-stop shape and the turn-keyed act, **D42** the opaque `yieldKey` handle, **D43** the mana-lost prompt on by default (in memory), **D44** one `hello_ok` and one frame log per game, **D45** `Space` follows `input.buttons.focus`; **D21's scope is corrected by D23**, **D29's "overridden rather than forked" clause by D32**, and **D31's read-only phase strip by D37**). D37 the live phase strip (and no "hold priority"), D38 phase stops reseeded per GAME rather than per match, D39 the exclusion argument for M6's `refreshState()` hop, **D40 the post-`over` waits obey the socket's timeout rule (unbounded while a client is connected) and the New Game row goes quiet when the socket does**. D24 the ws ask timeout, D25 one client at a time, D26 the `transport` header key, D27 resync semantics; D28 the three Scryfall image variants and the text frame under them, D29 `mana-font`, D30 arrows and the rect registry, D31 the read-only phase strip; D32 the `mana.css` fork (3,532,778 B of faces nothing fetched), D33 the board-picker rule, D34 the mana pips as the `useMana` control, D35 the two unreachable ask kinds and the probe flag, D36 the band strip as an overlay. |
| `README.md` | What it is, how to run it, and the **NON-GOALS** list. |

Cite these rather than re-deriving their findings. If you contradict one, add a
new dated entry to `DECISIONS.md` — do not silently edit an old one.

## Scope

`README.md`'s NON-GOALS section is binding: no multiplayer, no deck builder, no
card-library package, no accounts, no packaging, no delta protocol, localhost
only, **no rules logic in the client**. (**D90** lifted the card-library line in
part: a local index under `tools/card-library/` and the `#cards` browser exist as
dev-server tools — still no package, no production route, no proxy of Scryfall,
and nothing the engine, the bridge or the board depends on.) The research reports describe a much
larger system than we are building. Anything not on the straight line from
`IGuiGame` to a DOM node is an issue, not a file.

Forge already knows what is legal. The browser renders answers; it never computes
them. No mana-payability prediction, no targeting validation, no phase-stop logic.

## Subagents

When spawning subagents in this repo, **default them to Opus** — that is the
user's standing preference for conserving credits here.
