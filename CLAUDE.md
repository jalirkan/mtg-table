# CLAUDE.md — working conventions for this repo

Read this before touching anything. Then read
[`docs/research/05-architecture-synthesis.md`](docs/research/05-architecture-synthesis.md)
**in full** — it is the spec, not background reading.

mtg-table is a local browser client for Magic: The Gathering. It runs the
open-source Forge engine (GPLv3, Java) headless as rules engine and AI opponent,
with a TypeScript/React front-end talking JSON over a loopback WebSocket. The
architecture is fixed. The user is a hobbyist learning Magic; the deck in play is
`decks/pacho-shield.dck` (40 cards, Marvel Super Heroes / MSH + MSC).

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
4. **Never call `FModel.getDecks()`** or anything reaching
   `DeckStorage.adjustFileLocation` — it renames a `.dck` to its `Name=` metadata,
   moves it up a directory, and deletes unparseable ones. Load decks with
   `forge.deck.io.DeckSerializer.fromFile`. `tools/lint-bridge.sh` (rule 10) bans
   `getDecks(` under `bridge/src`.
5. **Do not call `Game.setNoGUIUser()`** — it exists in the 2.0.15 source checkout
   but is absent from the 2.0.14 jar. **Do not import gson** — absent from the
   jar. JSON parsing: `org.eclipse.jetty.util.ajax.JSON` (bundled; numbers arrive
   as `Long`, arrays as `Object[]`). JSON writing: our own small `StringBuilder`
   writer in `Json.java`.
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
   compiles against the 2.0.14 jar first.
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
    `stackDescription(`, `outcomeStrings(`, `matchSummary(`. It also rejects the
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
      `forge-home/custom-cards/` holds exactly one file (see **D14**);
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
- Forge 2.0.14 at `/home/justin-a/forge`; fat jar
  `forge-gui-desktop-2.0.14-jar-with-dependencies.jar` (39,383,858 bytes);
  resources `/home/justin-a/forge/res`.

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
node tools/fetch-art.ts                     # deck -> web/public/art.json (M4 needs it)
./tools/ten-games.sh                        # M5's exit criterion; check-all runs it as 9c
./tools/ten-games.sh --games 3              # the first three rows, for a quick look
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --mana-lost-prompt \
    --seed 7 --game-id human-amount-7 \
    --deck decks/amount-probe.dck --deck2 decks/morph-probe.dck   # M5: a probe run
```

**`./scripts/play.sh` is the M3 command** — check-forge → `bridge/build.sh` → the
ws bridge in the background (`var/play/server.log`) → poll `GET /health` → vite,
with the board at `http://127.0.0.1:<webPort>/?ws=1`. Ctrl-C stops both halves:
vite is exec'd directly (`env -C web web/node_modules/.bin/vite`) so the pid the
script holds is the server and not an `npm` wrapper that leaves it reparented.

```bash
./scripts/play.sh                                   # config.json's ports, a random seed
./scripts/play.sh --seed 42                         # a reproducible shuffle
./scripts/play.sh --port 8643 --web-port 5174       # beside a running one
./scripts/play.sh --no-open --keep-open --game-id x # no browser; linger 30 s after `over`
./scripts/play.sh -- --ai-name "Doom"               # everything after -- goes to MtgTable
```

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
none is; what ends a wait is `onDisconnect()` → `ReplyPool.cancelAll()`, after
which the pool is reopened so the next ask parks and is re-delivered on reconnect
(**D24**, amendment M19). And **one client at a time**: a second socket gets one
`notice` and close code **4001**, the client treats any code ≥ 4000 as terminal
(**D25**, amendment M13). A `resync` re-delivers the cached `hello_ok` / `state` /
outstanding ask **verbatim** — same `seq`, same `t` — and re-emits the `input`
for real through `onResync()` (**D27**, amendments M10/M16), so a client log's
`seq` series is neither contiguous nor monotonic and needs
`check-redaction.mjs --client-log`.

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

`bridge/build.sh` runs **three** self-tests after javac: `mtgtable.JsonSelfTest`,
`mtgtable.AskSelfTest` (the ask path's answer marshalling — index 0 is the
defending player, a wrong-length `manipulate_list` answer is the identity order,
and so on) and `mtgtable.GameLogSelfTest` (the frame log's close path: close in
under a second, exactly `N+1` lines on disk). Forge has dispatched **three** of
the eleven ask kinds across every recording ever made here, so for the other
eight `AskSelfTest` is the only check that runs at all; and the `GameLog` defect
it now guards — a `close()` that self-deadlocked against its own appender,
burned 30 s and returned a truncated file — was invisible in a green run.

`check-forge.sh` is the gate for everything below it. Run it first when something
behaves strangely. **`check-all.sh` is what you run before saying you are done**,
and it is **thirteen numbered steps** (plus **three** lettered sub-steps — 9b, 9c
and 10f — so the numbering and every reference to "10d" stayed correct when they
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
the five probe decks, eight assertions each — see that file's own header — and
the single most expensive thing in the gate; `SKIP_TEN=1` skips it, and skipping
it means the exit criterion did NOT run) →
**six fresh `--transport ws` servers** — the `ws-smoke` doorstep test (10a), its
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
none of them unresolvable). Each of the six is asserted for exactly one `over`,
`over` last, and its log through `check-redaction.mjs` — including the CLIENT
log, which is a different shape on purpose. Then `check-redaction.mjs` over the
committed fixtures (`games/` **and** `synthetic/`) *and* every fresh recording →
`check-redaction-selftest.mjs` → `npm run build && npm test`. It exits non-zero
on the first failure and takes **about nine minutes from a deleted `bridge/out`**
(8 m 52–57 s measured over four green runs), of which **9c's ten games are
267–269 s**; `SKIP_TEN=1` brings it back to roughly four. **Pass `WSPORT=<n>` if
8643 is busy** — step 10 starts six servers on it, one after another.
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
   web/src` is how you check it.
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
4. **One keymap table.** `web/src/keys.ts` is the 16 rows plus two pure functions
   (`bindingFor`, `planKey`); the handler and the `?`/`H` overlay both read it,
   and a test asserts every chord in `KEYMAP` appears in the overlay's markup.
   Adding a key is a row, never a new branch in a handler. Two rules live in
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
verbatim**. The board draws no phase-stop state of its own either — the dots are
Forge's documented defaults, disabled, until `players[].phaseStops` ships in M6
(**D31**).

`npm --prefix web test` is now **377 `node --test`** (372 pass, 0 fail, **5
skipped** — the ws-log suite skips what `MTGTABLE_WS_LOGS` does not name, so a
standalone run reports 373/373 and the gate reports 377) **+ 55 vitest**;
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

To regenerate the list of abstract members still to implement:

```bash
jp(){ java -m jdk.jdeps/com.sun.tools.javap.Main -cp "$FORGE_JAR" "$1" \
      | grep ';' | sed -E 's/^\s+//;s/.*\b([a-zA-Z0-9_]+)\(.*/\1/' | sort -u; }
comm -23 <(jp forge.gui.interfaces.IGuiGame) <(jp forge.gamemodes.match.AbstractGuiGame)
```

That diff yields **36 and misses one**: `AbstractGuiGame` declares its own
`protected abstract void updateCurrentPlayer(PlayerView)`, which is not on
`IGuiGame` at all. **There are 37 members and the class will not compile without
it** (`docs/research/07-wireguigame-spec.md` §0.1). Check the class directly:

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
| `docs/research/03-scryfall-card-library.md` | Scryfall, art resolution, the MSH/MSC split. |
| `docs/research/04-prior-art-and-licensing.md` | Prior art, GPL/AGPL analysis, Fan Content Policy. |
| `docs/research/06-hidden-information-audit.md` | **Every reveal path in Forge**, its wire channel, its leak signature; the basis of hard rule 8 and of `tools/check-redaction.mjs`'s assertions. |
| `docs/research/07-wireguigame-spec.md` | **The M2 spec.** 37 abstract members, the five threads, the eleven ask kinds, the null defaults. |
| `docs/research/08-deck-card-coverage.md` | Card-by-card fidelity for the deck in play; D13 and D14 come from it. |
| `docs/research/09-arena-tier1-plan.md` | M7 tier 1. |
| `docs/research/10-board-ui-spec.md` | **The M4 board.** Component tree, layout tokens, card tiles, arrows, wireframes. |
| `docs/research/11-engine-comfort-features.md` | **M6.** Phase stops, pass-to, auto-yield, auto-pay, undo, concede, new game — every one an engine feature, rendered. Read it with PLAN.md's *"What M5 hands to M6"*, which says what is already on the wire. |
| `docs/guides/java-for-typescript-people.md` | The Java this repo uses, from a TypeScript starting point: the `javap`-first workflow, enums on the wire, nullability, the thread asserts. |
| `docs/evidence/*.md` | What was actually run, with real numbers. |
| `PLAN.md` | The eight milestones M0..M7, the deferred list, and the open questions only the user can settle. |
| `DECISIONS.md` | The thirty-six load-bearing decisions, dated, with rejected alternatives (D15–D19 are M2's, D20–D27 M3's, D28–D31 M4's, **D32–D36 M5's**; **D21's scope is corrected by D23**, and **D29's "overridden rather than forked" clause by D32**). D24 the ws ask timeout, D25 one client at a time, D26 the `transport` header key, D27 resync semantics; D28 the three Scryfall image variants and the text frame under them, D29 `mana-font`, D30 arrows and the rect registry, D31 the read-only phase strip; D32 the `mana.css` fork (3,532,778 B of faces nothing fetched), D33 the board-picker rule, D34 the mana pips as the `useMana` control, D35 the two unreachable ask kinds and the probe flag, D36 the band strip as an overlay. |
| `README.md` | What it is, how to run it, and the **NON-GOALS** list. |

Cite these rather than re-deriving their findings. If you contradict one, add a
new dated entry to `DECISIONS.md` — do not silently edit an old one.

## Scope

`README.md`'s NON-GOALS section is binding: no multiplayer, no deck builder, no
card-library package, no accounts, no packaging, no delta protocol, localhost
only, **no rules logic in the client**. The research reports describe a much
larger system than we are building. Anything not on the straight line from
`IGuiGame` to a DOM node is an issue, not a file.

Forge already knows what is legal. The browser renders answers; it never computes
them. No mana-payability prediction, no targeting validation, no phase-stop logic.

## Subagents

When spawning subagents in this repo, **default them to Opus** — that is the
user's standing preference for conserving credits here.
