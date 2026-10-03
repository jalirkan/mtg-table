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

## Where the rules live

This file holds what every task needs: the hard rules, the environment, how to
build and run, the gate in one paragraph, and the policies. Everything else
lives beside the code it governs, in a nested `CLAUDE.md` that Claude Code loads
when it works under that directory — so read the one for the directory you are
changing, and the others when a change crosses into them.

| File | What it holds |
|---|---|
| [`bridge/CLAUDE.md`](bridge/CLAUDE.md) | The Java bridge: `Snap.java`'s three conventions, the socket's rules, its observers and LAN play, the end of a game, `/health`, the console seat's vocabulary, the build's seven self-tests, and reading Forge's source as prose. |
| [`web/CLAUDE.md`](web/CLAUDE.md) | The TypeScript client: the test suites, the board's conventions (M4, M5 and M6 — M6's also bind the bridge's acts, its reset hook and `ActGuard`), the workshop and the story page. |
| [`web/src/arena/CLAUDE.md`](web/src/arena/CLAUDE.md) | The 3D arena: M7, Tier 2 and its slices (camera views, per-card identity, bodies and duelists), Lanes LOOK, MOTION and BODIES, the status layer (D210–D212), the personal tier's loader (D194–D198), and villain identity (D220–D222, D230–D233). |
| [`tools/CLAUDE.md`](tools/CLAUDE.md) | The gate step by step, adding a job, CI, the redaction checker's flags, the narrator, the card library with the `#cards` browser, and the personal tier's pipeline (`tools/personal/`, D190–D198). |
| [`tools/README.md`](tools/README.md) | Every script under `tools/` — what it is for, whether the gate runs it, whether it needs the engine — and *Commands, by task*: every command *Build and run* below does not keep. |

Each rule is written once. `web/test/claude-md.test.ts` fails on a rule — a line
that opens bold or numbered, or a bold span of 20 or more characters anywhere —
that appears in two of these files, on one that vanished from them, on one
missing from `docs/claude-md-rules.txt`, the manifest it keeps, and on a link or
`#anchor` that does not resolve; change a rule on purpose by regenerating the
manifest, as that test's header says.

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
   run is not one, which is what *silently* means. **The lint counts them**
   (**D181**): every `invokeInGameThread` under `bridge/src` and `tools/` must
   carry `// ALLOW hop: D<n> <method>` on its line — `<method>` the one it sits
   in, `D<n>` a heading in `DECISIONS.md` — and the set must be exactly the
   lint's `HOP_ALLOW` (these three), so a fourth fails the build until its
   argument, its tag and that list are written. `ThreadUtil.invokeInGameThread`
   is the only public way onto the `Game` pool (javap); reflection onto it is
   banned outright.
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
   **A personal model is a statement about what a card is, too** (**D190**): it
   is chosen by card name only where `figurePose` already places a named figure,
   and never for a face-down or redacted card, which stays the anonymous disc.
   `web/src/arena/personal.ts`'s one lookup enforces that, and a corpus sweep
   with a hostile overlay holds it (**D195**; `web/src/arena/CLAUDE.md`'s *The
   personal tier*).
9. **Every script must run from `/home/justin-a/code/mtg-table` as its working
   directory** and must read the jar path from
   `/home/justin-a/code/mtg-table/config.json` or the `FORGE_JAR` env var. **Never
   hardcode the jar path in Java.**
10. **The lints are part of the build.** `tools/lint-bridge.sh` runs from
    `bridge/build.sh` and fails it. It greps every `*.java` under `bridge/src`
    **and `tools/`** (**D182** — `tools/audit-deck/AuditDeck.java` boots the same
    engine, and called the banned two-argument `createAiPlayer` while nothing
    looked there). **`./tools/lint-bridge.sh --list-rules` is the list of what it
    rejects**, one id per rule, and each rule's reason is written beside its
    declaring line in the lint itself; this file does not copy the list, because
    a copy drifts. The rules come in the lint's own sections, each with a failure
    behind it:
    - **1. what destroys the user's data** — `FModel.getDecks()` renames and
      deletes `.dck` files (hard rule 4), and the two-argument
      `GamePlayerUtil.createAiPlayer` passes an empty `profileOverride`, whose
      branch calls `ForgePreferences.save()` (match setup, **D107**): every AI
      seat goes through `Bootstrap.createAiPlayer`, the only file allowed the
      Forge call, and the method reference and a static wildcard import of
      `GamePlayerUtil` are banned for the same reason;
    - **2. what the pinned jar lacks** (hard rule 5);
    - **3. the hidden-information accessors** — each returns the real card
      behind a face-down one, splices a hidden card's name into a string, or is a
      fail-open predicate, and none consults a gate (hard rule 8; report 06). Two
      of them, `getDeck(` and `getGame(` on a `GameView`, matched text no call
      contains until 2026-09-28 and were dead (**D180**); they now find their
      receivers by type. `getGameLog` is allowed in `Smoke.java` alone, which
      emits no protocol;
    - **4 and 4b. the two calls allowed exactly once** (`getAlternateState`, in
      hard rule 8; `StackItemView.getKey()`, below);
    - **5. `CardView` outside the serialiser** (below);
    - **6 and 7. threads and game-thread hops** (below, and hard rule 3).

    Every exemption is a repo-relative PATH, never a file name. The lint
    rejects the identifier **`CardView` in any scanned file other than
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

    **Every rule is proven to FIRE, on every build** (**D180**, the guards
    lane). A rule is one `ban <id> …`, `ban_except <id> <path> …` or `rule <id>
    <check>` line, and fails only through `lint_fail`, which prints `LINT FAIL
    [<id>]`; `--list-rules` names them. `tools/lint-bridge-selftest.sh` reads
    that list, plants a snippet per case in a scratch copy of both trees under
    `var/lint-selftest/`, and requires the lint to fail with **that rule's id and
    no other** — at least one case per rule, and PASS controls that must stay
    quiet, in about a second. **A rule with no
    case fails it**, so a new rule is a line in the lint AND a case in the
    self-test, in the same change. `bridge/build.sh` runs it before the lint
    (`--quiet`), the gate runs it as step **2b**, and CI's `bridge` job runs it.
    `tools/README.md` is every script under `tools/` in one table.

    `Snap.java`'s three conventions the lint cannot check are
    `bridge/CLAUDE.md`'s first section.

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
    distribution extracted as-is. Locally this repo never downloads, copies or
    commits an engine (D2; `*.jar` is gitignored). **The one exception is CI**
    (**D202**): its `bridge` job fetches this same build from Forge's tagged
    `forge-2.0.14` release, checks it against the pin and caches the jar alone —
    `tools/CLAUDE.md`'s *CI runs the gate's engine-free half*.
  - **How it is pinned:** `config.json`'s `forgeJar` names it by absolute path
    (`FORGE_JAR` in the environment wins, hard rule 9). `./tools/check-forge.sh`
    prints its sha256 — **it must print the one above** — and every recording's
    session header carries it as `forgeJarSha256` (all 22 committed
    `fixtures/games/` recordings name this build). CI's `bridge` job asserts the
    hash on every run (`sha256sum -c`, **D202**); nothing asserts it locally yet,
    and report 14 §5.2 is the specified, unbuilt local mechanism.
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

The ten commands a newcomer types most:

```bash
./tools/make-forge-home.sh                  # once per checkout: Forge's res/, the profile, D14's overlay
./tools/check-forge.sh                      # the engine is the pinned one; run it first when anything is strange
./bridge/build.sh                           # the lint and its self-test, javac, the seven self-tests
./scripts/play.sh                           # PLAY: the bridge and the board in your browser (--arena for 3D)
./bridge/run.sh mtgtable.MtgTable --transport console --seed 42   # play in the terminal
./scripts/spectate.sh                       # watch two AIs play, followed in the arena (--story for #story)
npm --prefix web run dev                    # the dev server: /?replay=games/g1.jsonl, #cards, #workshop, #story
npm --prefix web test && npm --prefix web run build   # `test` = node --test THEN vitest
node tools/narrate.mjs fixtures/games/g1.jsonl        # a frame log, told turn by turn
./tools/check-all.sh                        # THE gate, before you say you are done (GATE_JOBS=1 is serial)
```

Every other command — the recorders, the checkers, the deck and card tools, the
arena's bench and its asset build, `play.sh`'s and `spectate.sh`'s flags — is in
[`tools/README.md`](tools/README.md)'s *Commands, by task*, beside the table of
every script under `tools/`.

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
are what any card added to an AI deck must meet. **D116 added a fifth** — no card
whose print carries a flavour name, because the wire then names it by that — and
three more AI decks (`masters-of-evil`, `hulk-family`, `wakanda`), and **every AI
deck is written from `decks/specs/<deck>.json` by `tools/build-deck.ts`, never
typed** (`web/test/deck-specs.test.ts` fails on a hand edit or a spec-less AI
deck). `tools/deck-smoke.sh` plays each, and is **not** in the gate; its spell
count is a rate, `min(8, AI turns − 3)`, because against the automated seat the
AI wins in five to eleven of its turns (eight or fewer in 35 of 40 games) and
casts about one spell a turn (D117).
`config.json`'s `match.aiDeck` is still Doom Legion, and so is the gate's.

**Spectating (amendment M47, D118–D122) watches two AIs play.**
`./scripts/spectate.sh` (and `--story`, which opens `#story` instead of the
arena — D128) runs `mtgtable.RecordMatch` with BOTH seats AI —
`--deck`/`--profile` is seat 0, `--ai-deck`/`--ai-profile` seat 1, the profile
tied to the DECK and never to `--seat` — into
`var/spectate/<deckA>-vs-<deckB>-<seed>[-seat1].jsonl`, and opens
`/?replay=spectate/<name>.jsonl&follow=1#arena` while it records. These rules hold
it together. **It is one seat's eyes** (`--seat 0|1`): the other hand is the
five-key stub, and there is no omniscient viewer — that would be a new redaction
mode. **The recorder is paced** (`--pace`, 600 ms by default, a quarter after a
frame that only moved the phase strip), because an AI-vs-AI game is over in about
three seconds; the dwell sleeps on the game thread **before** the boundary flush,
never after it (the forwarder's 500 ms clock is stamped before `handleGameEvents`),
and an unpaced run executes none of it — a paced and an unpaced recording of one
seed are the same frames. **Follow mode is a transport**: `transport/follow.ts`
polls the dev route and `LogReplayTransport.append()`s; the transport plays each
frame 600 ms after the recorder wrote it (`FOLLOW_LIVE_DELAY_MS` — the lag cannot
grow), keeps the recorder's gaps from the cursor after a pause, and jumps a page
that joins late to the live edge; the arena gets one word (`follow` prop:
`following` / `stalled` / `finished` / `lost`) and never polls (`liveness.test.ts`).
**A 416 is `lost`** (polish-1): the followed file was re-recorded, the follower
has stopped for good, and the app bar's chip, `#story` and the arena's watching
line say *recording lost*, with no live dot. The arena has had the word since
polish-1's follow-up 2, applied at the art-direction lanes' merge onto
`a08c15f`: `main.tsx` hands it `followWord` as it is (`arenaFollowOf`, which
mapped `lost` to no word, is gone), and `spectate.test.ts` holds `ArenaFollow`
to `FollowWord`'s four words.
**`var/spectate/` is served by the dev server alone** (`web/src/spectate/devRoute.ts`,
mounted in `configureServer` only — D92's rule): complete lines only, `?from=<byte>`
for the tail, 404 for "not yet", 416 for "re-recorded", never a fetch.
**`hello_ok.match` only when asked** (`--match` or a profile flag): a bare
`RecordMatch` is byte-for-byte what it was, which step 6 needs; `yourProfile`
is the viewing seat's own profile and only an AI viewer may carry it. And the
identity-hash lesson (**D121**): the order of the ids inside a `stats` event
follows HotSpot's identity hashes and moved when this branch added `println`s
before `FModel.initialize` — step 6 compares them as a set (inside
`tools/wire-drift.mjs`'s normalisation since the rebase onto the hardening pass,
both modes, with a selftest case each way), and anything that compares
recordings must too (`tools/same-game.mjs` does).

**M7 adds `--arena`, and it is one URL fragment.** The arena is a second
*renderer* over the same frame stream, so the bridge, the socket, the reducer and
the frame log are untouched and `#arena` is the whole of the difference
(`npm --prefix web run dev:arena` for a replay, `./scripts/play.sh --arena` live;
the arena's bench, its asset build and the workshop's catalog are in
`tools/README.md`).

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

## The gate

**The gate, in one paragraph.** `./tools/check-all.sh` is what you run before
saying you are done: every check the repo has — the lint and its self-test, the
build, the recordings and the drift checks, the ten-games rows, the eight socket
servers, redaction, the selftests, the deck check and the web build and tests —
as **52 jobs**, `GATE_JOBS` at a time (default `min(4, nproc/4)`, four on this
desktop), each after the jobs it depends on; `GATE_JOBS=1` is the serial gate,
the same checks as 36 jobs one after another (D291 added the 49th and 33rd, 10h,
about 25 s of job time, D292 the 50th and 34th, 12f, about 7 s, D296 the
51st and 35th, 12g, the cube lab's smoke run, about 30 s, and D305 the 52nd and
36th, 12h, about 30 s, to the timings below). From a deleted `bridge/out` it
takes about **four minutes** at `GATE_JOBS=4` (239.0 s and 240.5 s on
`102fb1f`; 259.2 s on the docs block's `502ad9d`, whose code is `102fb1f`'s),
about **two and a half** at `GATE_JOBS=8` (151.2 s on `6b35054`) and
about **fifteen** serially (907.4 s on `f6bad35`). `102fb1f`, `6b35054` and
`f6bad35` carry their runs in their own commit messages; the docs block's run
is in `1d08248`'s. Every run leaves a log per job, `gate.log` and a timing table
under `var/check-all/<run>/`, and only the last `GATE_KEEP_RUNS` runs (default
20) are kept. What each step checks is `tools/CLAUDE.md`; every earlier timing
is `docs/evidence/gate-history.md`.

## Never write outside this repo

Write only under `/home/justin-a/code/mtg-table`. **Never write, move or rename
anything under `/home/justin-a/forge` or `/home/justin-a/.forge`** — that is the
user's real Forge install and their real decks. Forge's profile is redirected into
`var/` by `forge-home/forge.profile.properties` (absolute `userDir` and
`cacheDir`); `forge-home/res` is a symlink to `/home/justin-a/forge/res`.

`FModel.initialize` creates Forge's whole profile tree (decks, quest, gauntlet,
preferences, the picture cache). It must create it in `var/`.
When in doubt, `sha1sum` the `~/.forge/decks/constructed/` tree before and after a
run.

The same holds for a **newer Forge**: it is never unpacked over `~/forge` or
upgraded in place. An engine being evaluated lives in the session scratchpad or a
throwaway home under `var/` (as `tools/audit-deck.mjs` builds under
`var/audit-deck/`); an adopted official release lives under
`var/forge-engine/<version>/` (**D110**). Before and after the first run on any
engine other than `~/forge`'s, `sha1sum` the `~/forge` jar (it must stay
`3c0a7c38…8e5dd9`) and the `~/.forge/decks/constructed/` tree.

## Commits, branches and merges

**Claude commits on branches and merges to `main` when the full gate is green;
the user owns pushes beyond that, releases and anything public** (**D201**, the
owner's wording of 2026-09-28, replacing *The user commits*). The standing rules
that go with it:

- **A branch per lane, in a worktree of its own** (`git worktree add
  ../mtg-table-<x> -b <lane>`); the main checkout is touched only to add one.
- **A skeptic before a merge**: an independent review of the lane's diff and its
  evidence, whose findings are fixed or written down as follow-ups before `main`
  moves.
- **The full gate on every merge**: `./tools/check-all.sh`, green, from a deleted
  `bridge/out`, on the merged tree, its line in the merge commit's message. A
  green CI run is a subset of that, never a substitute.
- **Never push a lane.** Pushing, tags, releases, pull requests and anything
  public or shared are the user's.
- **Never touch `~/forge` or `~/.forge`** (*Never write outside this repo*,
  above).
- **The personal tier is never committed**: Tier 3's likeness models and anything
  else that is personal-only stay local and gitignored, under `/personal/`, each
  model's provenance in its own folder (`SOURCE.txt`, `manifest.json`); see
  **D190** and `docs/guides/personal-tier.md`, and `tools/CLAUDE.md`'s *The
  personal tier* for its conventions. *(Corrected 2026-09-28, when the personal tier
  merged: this bullet said such assets are recorded in
  `tools/assets-manifest.json` as `committable: false`. D190 rejected that —
  that manifest is the committed CC0 library's provenance, and an entry in it
  would publish the fact of the file.)*

## Decision numbers

**A decision's number is final** (**D200**). A lane reserves a block of numbers
before it starts (the docs block's was D200–D204), writes its decisions inside it and
keeps those numbers when it merges, whatever landed first; an unused number stays
unused. Gaps between blocks are allowed, so a number says nothing about how many
decisions there are, and **no document states a total** — point at
`DECISIONS.md` and name the most recent block instead. The notes on older entries
that say a decision was *written as* another number and renumbered at a merge
are history from before this rule, and stay.

## Where the docs live

| File | What it is |
|---|---|
| `docs/protocol.md` | **The living wire spec.** The emitter and the reducer are both written against it — change it *first*, then both ends; read its **Amendments** list before assuming a shape. |
| `docs/research/05-architecture-synthesis.md` | **The spec.** Read in full before any design work. |
| `docs/research/01-forge-engine-seam.md` | The `IGuiGame` / `AbstractGuiGame` seam. |
| `docs/research/02-forge-build-and-headless.md` | Build and the **verified headless boot recipe (§4)**. |
| `docs/research/03-scryfall-card-library.md` | Scryfall, art resolution, the MSH/MSC split; §4 is **the spec the card library was built to** (D90). |
| `tools/card-library/README.md` | **The card library's manual** (D90): the build, the image cache, the query CLI, Scryfall's terms as code; `docs/evidence/card-library.md` is what was measured. |
| `docs/research/04-prior-art-and-licensing.md` | Prior art, GPL/AGPL analysis, Fan Content Policy. |
| `docs/research/06-hidden-information-audit.md` | **Every reveal path in Forge**, its wire channel and its leak signature — the basis of hard rule 8 and of `tools/check-redaction.mjs`. |
| `docs/research/07-wireguigame-spec.md` | **The M2 spec.** 37 abstract members, the five threads, the eleven ask kinds, the null defaults. |
| `docs/research/08-deck-card-coverage.md` | Card-by-card fidelity for the deck in play (D13 and D14 come from it; §9 is the FRA deck). |
| `docs/research/09-arena-tier1-plan.md` | **The arena's spec (M7 Tier 1).** Read in full before touching `web/src/arena/`. |
| `docs/research/10-board-ui-spec.md` | **The M4 board.** Component tree, layout tokens, card tiles, arrows, wireframes. |
| `docs/research/11-engine-comfort-features.md` | **M6.** Phase stops, pass-to, auto-yield, auto-pay, undo, concede, new game — every one an engine feature, rendered. |
| `docs/research/12-arena-tier2-assets.md` | **Tier 2's asset landscape.** Which packs are really CC0, Mixamo's terms, the card-art question, the gltf-transform pipeline and the two drei traps. |
| `docs/research/13-arena-tier2-plan.md` | **Tier 2's spec, the manifestation stage.** Read in full before touching `web/src/arena/figures/`. |
| `docs/research/14-engine-upgrade.md` | **Why Forge stays 2.0.14** (D109–D112), and §0, the checklist for the day an official release ships Reality Fracture. |
| `docs/research/15-art-direction.md` | **Art direction**: the comic look, motion and bodies, and §9's three lanes. Read §9 before touching the figure or prop material, `Post.tsx`, the effects, `cues/`, `figures/` or `scene/props.ts`. |
| `docs/guides/java-for-typescript-people.md` | The Java this repo uses, from a TypeScript starting point; chapter 9 maps `WireGuiGame.java` and follows one ask and one act through the threads. |
| `docs/guides/cube-lab.md` | **The cube lab's manual** (D293–D297): `tools/cubelab.sh` drafts a two-player cube with two Forge AIs, builds their decks and plays them, and reports win rates by pair, theme and card; every flag and weight, the JSONL; and `evolve` (D299–D300), which swaps a cube's cards from a seed pool generation by generation where the evidence passes a threshold. A tool beside the game, never read by it. |
| `docs/guides/personal-tier.md` | **The personal tier's manual** (D190–D198): the never-publish rule, the folder, the slug, the manifest, the three commands, `bones.json`, the Sketchfab click-through, the loader — how a model reaches the arena and the workshop from the dev server — and the relief cache (D225–D228: a depth map of every card's painting, in two layers, for the workshop's inspect view); `docs/evidence/personal-tier.md` is Doctor Doom and the seven others run through it, `docs/evidence/relief-window.md` the relief. |
| `docs/evidence/*.md` | What was actually run, with real numbers — a file per milestone or lane; `gate-history.md` and `test-count-history.md` are the gate's timings and the web suite's counts over time. |
| `PLAN.md` | The milestones and every lane since, each with its status, evidence and follow-ups; *Open now*, at the top, indexes every open follow-up and the questions only the owner can settle. |
| `DECISIONS.md` | Every load-bearing decision, dated, with the alternatives rejected — see `DECISIONS.md`; the most recent blocks are the anchor resolver's D275, the GPU pass's D270–D273, the play-distance audit's D265–D267, the portrait standee's D260–D264, the arena caption's D255–D256, the sound cues' D250–D252, the arena polish's D240–D241, more villain identity's D230–D233, the relief window's D225–D228, villain identity's D220–D222, the status layer's D210–D212, the docs block's D200–D202 and the personal tier's D190–D198 (a lane keeps the numbers it reserved, D200). |
| `README.md` | What it is, how to run it, and the **NON-GOALS** list. |

Cite these rather than re-deriving their findings. If you contradict one, add a
new dated entry to `DECISIONS.md` — do not silently edit an old one.

## Scope

`README.md`'s NON-GOALS section is binding: no multiplayer, no deck builder, no
card-library package, no accounts, no packaging, no delta protocol, localhost
only, **no rules logic in the client**. (**D90** lifted the card-library line in
part: a local index under `tools/card-library/` and the `#cards` browser exist as
dev-server tools — still no package, no production route, no proxy of Scryfall,
and nothing the engine, the bridge or the board depends on. **D287**–**D289**
lifted the localhost line in part: `play.sh --lan` binds every interface behind a
per-run pairing token for a phone on the home network, and nothing else leaves
loopback but the coach helper beside it under the same token (**D292**); `bridge/CLAUDE.md` has the rule.) The research reports describe a much
larger system than we are building. Anything not on the straight line from
`IGuiGame` to a DOM node is an issue, not a file.

Forge already knows what is legal. The browser renders answers; it never computes
them. No mana-payability prediction, no targeting validation, no phase-stop logic.

## Subagents

When spawning subagents in this repo, **default them to Opus** — that is the
user's standing preference for conserving credits here.
