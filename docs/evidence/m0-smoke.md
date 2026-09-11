# M0 evidence — the engine runs our code

Recorded 2026-09-11 on Ubuntu, OpenJDK 21.0.12 **JRE only** (no `javac` binary),
against the installed Forge 2.0.14 fat jar. Nothing here is inferred; every line
below was produced by a run on this machine.

## The one command

```bash
./tools/check-forge.sh && ./bridge/build.sh && ./bridge/run.sh mtgtable.Smoke 2>&1 | tee var/smoke.log
```

Exit status 0. Full transcript: `var/smoke.log` (gitignored).

## Gate: the jar carries everything we link

```
forge jar: /home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar
3c0a7c385b9207e593fe149255e00d1cd7e556809f138568d07e3828b78e5dd9  forge-gui-desktop-2.0.14-jar-with-dependencies.jar
forge jar OK
```

All eight asserted classes present: `IGuiGame`, `IGuiBase`, `AbstractGuiGame`,
`HostedMatch`, `GameEventForwarder`, `MyRandom`,
`org.eclipse.jetty.util.ajax.JSON`, `WebSocketServerProtocolHandler`.

Negative tests, both exit 1:

```
$ FORGE_JAR=/nonexistent.jar ./tools/check-forge.sh   -> FORGE_JAR not found: /nonexistent.jar
$ FORGE_JAR=.../gdx-particle-editor.jar ./tools/check-forge.sh
                                                      -> MISSING CLASS: forge.gui.interfaces.IGuiGame
```

## Build

```
compiling 3 file(s) -> /home/justin-a/code/mtg-table/bridge/out
build OK
```

`java -m jdk.compiler/com.sun.tools.javac.Main`, no `--release`, `-Xlint:all`
clean (zero warnings). Emitted class-file **major version 65** (Java 21), which
is what runs it. The Forge jar is major 61 (Java 17), so bridge *source* stays
Java 17 compatible.

## Where Forge decided to put its files

The first four lines of the run, printed straight out of `ForgeConstants` after
`GuiBase.setInterface(new HeadlessGuiBase(...))`:

```
ASSETS_DIR    = /home/justin-a/code/mtg-table/forge-home/
PROFILE_FILE  = /home/justin-a/code/mtg-table/forge-home/forge.profile.properties
RES_DIR       = /home/justin-a/code/mtg-table/forge-home/res/
USER_DIR      = /home/justin-a/code/mtg-table/var/forge/
CACHE_DIR     = /home/justin-a/code/mtg-table/var/cache/
DECKS_DIR     = /home/justin-a/code/mtg-table/var/forge/decks/constructed/
LOG_FILE      = /home/justin-a/code/mtg-table/var/forge/forge.log
headless      = true      DISPLAY = null
```

`Smoke` asserts each of these starts with the repo root and aborts if not, so a
missing `forge.profile.properties` is a loud failure rather than a silent write
into `~/.forge`. `FModel.initialize` then created **29 directories** under
`var/forge` and `var/cache` — the 24 `PROFILE_DIRS` plus roots.

## Boot, database, deck

```
FModel.initialize took 1925 ms
Read cards: 33617 archived files (25 parts)      <- res/cardsfolder/cardsfolder.zip
Read cards: 836 files (8 parts)                  <- token scripts
cards in DB = 95126 printings, 33137 unique
deck from file = Pacho SHIELD (Marvel Super Heroes) (40 cards, 28 distinct)
deck sets = {MSC=10, MSH=30}
deck cards Forge would drop = none (all 28 distinct names have a working card script)
```

`FModel.initialize` across six runs: **1925–2079 ms** (report 02 measured 2033).
Printing count **95126** matches report 02 exactly. Deck is **40 cards**, as expected.

`deck sets = {MSC=10, MSH=30}` independently confirms report 03's finding: the ten
`.dck` lines written without a `|MSH` suffix all resolve to **MSC** (Marvel Super
Heroes Commander), so the deck really does span two sets and the art resolver
must handle both.

## Match result

One AI-vs-AI game, the user's deck on both seats:

```
game took 3731 ms
RESULT: winner = AI-Two, reason = AllOpponentsLost
RESULT: AI-One has lost because life total reached 0
RESULT: AI-Two has won because all opponents have lost
RESULT: player turns = 24 (round 12)
RESULT: Match Result: AI-One: 0 AI-Two: 1
RESULT: Game Outcome: Turn 12
total wall time = 5781 ms
```

Six runs, all exit 0:

| log | `FModel.initialize` | game | total wall | player turns | SVar warnings |
|---|---|---|---|---|---|
| `var/smoke.log` (final) | 1925 ms | 3731 ms | 5781 ms | 24 | 1 |
| earlier run             | 2037 ms | 1532 ms | 3693 ms | 17 | 0 |
| `var/smoke-run1.log`    | 2079 ms | 3495 ms | 5697 ms | 18 | 0 |
| `var/smoke-run2.log`    | 1983 ms | 3155 ms | 5261 ms | 16 | 0 |
| `var/smoke-run3.log`    | 1963 ms | 2649 ms | 4736 ms | 19 | 1 |
| `var/smoke-run4.log`    | 1998 ms | 1997 ms | 4117 ms | 15 | 3 |

Every game ran to a real win (`AllOpponentsLost`, life to 0) in 1.5–3.7 s; neither
seat ever drew or timed out.

Note `player turns` vs the log's `Turn 12`: the `PhaseHandler` counts **player**
turns and Forge's log line counts **rounds**. Report 04 flagged this; it is
confirmed here (24 player turns = round 12). The wire protocol emits both.

## The two warnings the synthesis asked about

### 1. Unsupported cards — **none**, and the stderr grep the task proposed cannot answer this

`Match.prepareAllZones` calls `Deck.getValid()`, drops every card with
`CardRules.isUnsupported()`, and hands the dropped list to
`GameAction.revealUnsupported` (`forge-game/.../Match.java:303,343,355-357`).
Both ends of that call are silent:

- `PlayerControllerAi.revealUnsupported` is an **empty method** whose entire body
  is the comment *"Ai won't understand that anyway"*
  (`forge-ai/.../PlayerControllerAi.java:1410-1412`);
- `PlayerControllerHuman.revealUnsupported` opens a `getChoices` **dialog**
  (`forge-gui/.../PlayerControllerHuman.java:2590-2596`), it does not print.

So an AI-vs-AI run emits no text at all, and grepping stderr for a complaint
would report a **false** clean bill of health. `Smoke.auditDeck` therefore applies
the same `CardRules.isUnsupported()` predicate itself, over the deck's card pool,
without mutating it (`getValid()` removes cards from the pool in place).

Result: **0 of 28 distinct names are unsupported.** All 40 cards of
`decks/pacho-shield.dck` have working Forge card scripts.

### 2. `SVar 'Any' not found in ability` — **still present, and it is two cards, not one**

Emitted by `System.err.printf` at
`forge-game/src/main/java/forge/game/ability/AbilityUtils.java:407`. It fires only
when the card's ability is actually built, i.e. when the card is **cast**, so it
is non-deterministic across games: 0 hits in four runs, 1 in one, 3 in another.
Verbatim, from `var/smoke-run3.log` and `var/smoke-run4.log`:

```
SVar 'Any' not found in ability, fallback to Card (Quantum Reduction). Ability is (Quantum Reduction)
SVar 'Any' not found in ability, fallback to Card (Helicarrier Strike). Ability is (Helicarrier Strike deals 2 damage to target attacking or blocking creature. If this spell was cast using teamwork, it deals 4 damage to that creature instead.)
```

The synthesis predicted **Quantum Reduction**. **Helicarrier Strike** is new and is
also in this deck. Both are cosmetic (Forge falls back to the host card), but M1's
recorder should keep watching them, because a wrong fallback target would show up
as a wrong damage number on the board.

## Forge's own files are provably untouched

Before the first run:

```bash
find ~/.forge/decks ~/forge/res/editions -type f -print0 | sort -z | xargs -0 sha1sum > var/before.sha1
ls -la --time-style=full-iso ~/.forge > var/before.dotforge-ls.txt
```

After six runs:

```
$ diff -u var/before.sha1 var/after.sha1        -> no output (679 files identical)
$ sha1sum -c var/before.sha1                    -> 0 files changed
$ diff -u var/before.dotforge-ls.txt var/after.dotforge-ls.txt
                                                -> no output (same names, sizes, mtimes)
$ find ~/.forge ~/forge -newermt '2026-09-11 11:58:00'
                                                -> no output
```

The last check is the sharpest one: our first JVM run started at ~12:05, and
**nothing anywhere under `~/.forge` or `~/forge` has an mtime later than 11:57:00**.

Caveat, recorded for honesty: the user's own Forge desktop app (PID 150492,
started 11:56:42, plain `java -jar forge-gui-desktop-...jar`) was running
throughout. Everything under `~/.forge` with a recent mtime — `decks/`,
`preferences/server.preferences`, `preferences/forge.preferences`,
`preferences/window.xml`, `forge.log` — was written by **that** process between
11:56:42 and 11:57:00, before any of our runs. That app is also what renamed
`~/.forge/decks/constructed/Pacho SHIELD.dck` to
`~/.forge/decks/Pacho SHIELD (Marvel Super Heroes).dck`: Forge's own
`DeckStorage.adjustFileLocation` doing exactly what report 02 §4.3 documented.
It is a live demonstration of why `bridge/build.sh` refuses to compile any source
that mentions `FModel.getDecks()`.

## What this establishes for M1

- `GuiBase.setInterface` first, then `FModel.initialize(null, null)`: works.
- The named `mtg-table-EDT` executor is installed and `isGuiThread()` is real,
  but **no EDT assertion was exercised** — an AI-vs-AI game has no human seat and
  never blocks for input. `HeadlessGuiBase`'s threading is written to spec and
  compiles, and stays unproven until M2 puts a human seat behind it.
- `DeckSerializer.fromFile` loads the deck and renames nothing.
- `game.setNoGUIUser()` is **not** called — it does not exist in the 2.0.14 jar.
- `TokenDb.getUniqueTokens()` returns **null** in 2.0.14 and `getAllTokens()`
  returns an empty list (the per-edition map is lazy), so neither is a usable
  token count. The `Read cards: 836 files` line is.
