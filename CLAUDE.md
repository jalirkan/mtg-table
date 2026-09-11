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
    A file that legitimately needs it (e.g. `RecordMatch`'s `IGuiGame` no-op stubs
    take `CardView` parameters) goes in the lint's ALLOW list **with a one-line
    justification**.

    Three conventions the lint cannot check, stated in a comment block at the top
    of `Snap.java` (`docs/guides/java-for-typescript-people.md`): **enums go on
    the wire via `.name()`, never `toString()`** (`forge.card.CardRarity`
    overrides `toString()`); **nullable integers use `JsonOut.nInt`, never
    `n(String,long)`**; and **every `CardStateView`-derived key is written in both
    branches of the null-state check**, so the renderer never tests for key
    absence. `HeadlessGuiBase` asserts at class-init that no thread name we create
    starts with `Game`, because `ThreadUtil.isGameThread()` is a bare
    `getName().startsWith("Game")`.

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
npm --prefix web run dev:replay             # opens /?replay=games/g1.jsonl
npm --prefix web test && npm --prefix web run build
node tools/fetch-art.ts                     # deck -> web/public/art.json (M4 needs it)
```

Not written yet — these are what the milestone delivers, do not cite them as
existing: `./bridge/run.sh mtgtable.MtgTable --transport console` (**M2+**) and
`./scripts/play.sh` (**M3+**: check-forge → build → JVM → `vite dev --open`).

`check-forge.sh` is the gate for everything below it. Run it first when something
behaves strangely. **`check-all.sh` is what you run before saying you are done**:
lint → build → `Smoke` → a fresh `RecordMatch` into `var/` → `check-redaction.mjs`
over the committed fixtures (`games/` **and** `synthetic/`) *and* that recording
→ `check-redaction-selftest.mjs` → `npm run build && npm test`. It exits non-zero
on the first failure.

**Never pass `--pre-amendment` to `check-redaction.mjs`.** It downgrades a
missing `owner` / `token` / `alt` / `library.cards` to a warning, and those four
absences are exactly what the gate exists to catch. It is there to read a log
recorded before 2026-09-11, and nothing in the repo is one.

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
| `docs/research/11-engine-comfort-features.md` | **M6.** Phase stops, pass-to, auto-yield, auto-pay, undo, concede, new game — every one an engine feature, rendered. |
| `docs/guides/java-for-typescript-people.md` | The Java this repo uses, from a TypeScript starting point: the `javap`-first workflow, enums on the wire, nullability, the thread asserts. |
| `docs/evidence/*.md` | What was actually run, with real numbers. |
| `PLAN.md` | The eight milestones M0..M7, the deferred list, and the open questions only the user can settle. |
| `DECISIONS.md` | The fourteen load-bearing decisions, dated, with rejected alternatives. |
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
