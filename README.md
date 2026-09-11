# mtg-table

A local, single-player browser client for *Magic: The Gathering*. It runs the
open-source [Forge](https://github.com/Card-Forge/forge) engine headless in a JVM
on your own machine as the rules engine and the AI opponent, and puts a
TypeScript/React board in a browser tab in front of it. The two halves talk JSON
over a WebSocket bound to `127.0.0.1`. Nothing leaves the machine except card-art
lookups to Scryfall. The visual model is [endstep.cc](https://endstep.cc) — a
clean web board where you click cards instead of reading a Java Swing table — but
none of its code; the engine underneath is Forge, unmodified, used exactly the way
Forge's own network client uses it.

The design principle is that the browser contains **no rules logic at all**. Forge
already knows which cards are targetable, which buttons are enabled, whether mana
can be paid and what the AI is doing; the bridge serialises that into a redacted
snapshot and the client renders it. A card is clickable if and only if the engine
put its id in `state.input.selectable`; a button is enabled if and only if the
engine said so. The client never predicts legality, never guesses, and never
decides anything. That keeps the whole class of "the board threw the engine's
answer away" bugs out of the project, and it is why the wire protocol
([`docs/protocol.md`](docs/protocol.md)) is the real specification of this
repository — the Java emitter and the TypeScript reducer are both written against
it.

## NON-GOALS

These are not "later". They are decisions, and they are what keeps this project
finishable. Anything on this list is a closed question, not a backlog item.

- **No multiplayer.** One human seat, one AI seat, one JVM, one browser tab. No
  lobby, no matchmaking, no spectators, no second human.
- **No deck builder.** Decks are `.dck` files you already have. Editing them is
  Forge's job, or a text editor's.
- **No card-library package.** No SQLite, no FTS5, no bulk Scryfall dump, no card
  search, no card browser. v1's entire card library is a generated `art.json` for
  the one deck in play.
- **No accounts, no auth, no sessions, no users.** The socket binds loopback and
  trusts whatever connects. That is the security model.
- **No packaging, no installer, no Docker, no release artifact.** You run it from
  the checkout with the commands below. Forge stays where you installed it.
- **No delta protocol.** Every `state` frame is a full coalesced snapshot. Deltas
  are a documented future server-side change, not a v1 feature.
- **Localhost only.** No deployment, no remote access, no tunnel, no TLS.
- **No rules logic in the client.** No mana-payability prediction, no targeting
  validation, no phase-stop logic, no legality checks. If the browser has to
  compute a rules answer, the design is wrong.
- **No modification of Forge, and no fork of it.** Forge is a dependency on disk.
  We never write inside `~/forge` or `~/.forge`.

## Prerequisites

| What | Version | Where |
|---|---|---|
| Forge | 2.0.14 | `~/forge`, with the fat jar `forge-gui-desktop-2.0.14-jar-with-dependencies.jar` and the `res/` tree |
| Java | 21 **JRE** is enough | no JDK needed — the JRE ships `jdk.compiler`, so `java -m jdk.compiler/com.sun.tools.javac.Main` compiles and `java -m jdk.jdeps/com.sun.tools.javap.Main` inspects |
| Node | 24 | Node 24 runs `.ts` files directly via type stripping, so `tools/fetch-art.ts` needs no build step |

No Maven, no Gradle, no source build of Forge, no downloads beyond npm for `web/`.
There is no Maven coordinate for Forge anywhere — do not go looking for one.

The Forge jar is never copied into this repo. Its path lives in `config.json`
(`forgeJar`) and can be overridden with the `FORGE_JAR` environment variable;
every script reads it from there.

Forge's profile is redirected into `var/` by `forge-home/forge.profile.properties`
so that running mtg-table cannot touch the decks and preferences in `~/.forge`.
`forge-home/res` is a symlink to `~/forge/res`.

## Running it

All commands are run from the repository root.

```bash
./tools/check-forge.sh        # assert the jar and every class we depend on; print its sha256
./tools/make-forge-home.sh    # idempotent: symlink res, write the profile properties,
                              # install the corrected A.I.M. Scientists card script (D14)
```

**Before you commit, run the one command that runs everything:**

```bash
./tools/check-all.sh
```

Twelve steps, stopping at the first failure: `check-forge.sh` →
`lint-bridge.sh` (the banned-accessor grep over `bridge/src`) →
`bridge/build.sh` (javac plus three self-tests) → `Smoke` → a `RecordMatch`
re-record into `var/` → **a value-level drift diff** of that recording against
`fixtures/games/g1.jsonl` → **three fresh human-seat games** (`--transport
null`, the scripted `--transport console` smoke, and `--transport auto --seed
11`, each asserted to end in exactly one `over` as its last frame) →
`check-redaction.mjs` over the committed fixtures (games *and* synthetic) *and*
all four fresh recordings → `check-redaction-selftest.mjs`, which asserts the
checker still rejects twelve one-defect probes → `npm run build && npm test` in
`web/`. Two to five minutes, most of it the four games; every JVM step runs
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
npm --prefix web run dev:replay                  # opens /?replay=games/g1.jsonl
# any other fixture is a query param: ?replay=games/morph.jsonl,
# ?replay=synthetic/sample-handwritten.jsonl, ?replay=negative/render-crash.jsonl
node tools/check-redaction.mjs fixtures/games/*.jsonl fixtures/synthetic/*.jsonl
npm --prefix web test && npm --prefix web run build

# M2 — a full game against the AI, in the terminal (--transport null|auto|console)
./bridge/run.sh mtgtable.MtgTable --transport console --seed 42

# M3+ — the same game in a browser tab; this is the one command you type
./scripts/play.sh             # check-forge -> build -> boot the JVM -> vite dev --open

# M4+ — card art for the deck in play (once; cached in web/public/art.json)
node tools/fetch-art.ts
```

The `M3+` / `M4+` commands name programs and scripts that **do not exist yet** —
they are what those milestones deliver. Everything above them runs today,
`mtgtable.MtgTable` included.

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

## Repo layout

Only files that exist today are listed without a marker; `M2+` / `M3+` / `M4+`
mark what a later milestone adds.

```
mtg-table/
  LICENSE                    GPL-3.0-or-later, whole repo
  NOTICE                     Forge (GPLv3), Scryfall, WotC Fan Content Policy, Marvel
  README.md                  this file; NON-GOALS above
  PLAN.md                    the eight milestones M0..M7, deferred list, open questions
  DECISIONS.md               the nineteen load-bearing decisions, dated
  CLAUDE.md                  working conventions for Claude sessions in this repo
  .gitignore
  config.json                { forgeJar, forgeHome, deck, wsPort, webPort, scryfallUserAgent }

  decks/pacho-shield.dck     the deck (40 cards, MSH + MSC), plus .txt as typed
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

  docs/
    protocol.md              the living spec of the wire protocol and the frame log
    guides/java-for-typescript-people.md   the Java the bridge actually uses
    research/*.md            the eleven reports this plan rests on
    evidence/*.md            what was actually run, with real numbers
    ideas/arena-mode.md      M7

  bridge/                    the only Java. Hosts the engine, redacts, serialises, serves /ws.
    build.sh  run.sh
    src/mtgtable/            Bootstrap Config HeadlessGuiBase Json JsonSelfTest Snap
                             GameLog GameLogSelfTest RecordMatch Smoke
                             WireGuiGame ReplyPool Transport MtgTable Ask AskSelfTest
                             NullTransport AutoTransport ConsoleTransport
                             M3+: WsTransport
    out/                     gitignored

  web/                       the SPA. A pure function of the frame stream.
    index.html vite.config.ts tsconfig.json package.json
    src/
      protocol.ts            hand-written types, mirrors docs/protocol.md
      reduce.ts              (GameState, Frame) => GameState — pure, no DOM, no IO
      art.ts                 art.json lookup + generated text-card fallback
      main.tsx  styles.css
      transport/transport.ts interface Transport { onFrame(cb); send(f) }
      transport/replay.ts    LogReplayTransport (fetch a .jsonl; play/step/scrub)
      transport/ws.ts        M3+: WebSocketTransport
      render/                Board.tsx describe.ts ErrorBoundary.tsx ReplayControls.tsx
                             M4+: Zone.tsx CardTile.tsx Stack.tsx AskModal.tsx PhaseStrip.tsx
    test/                    art.test.ts fixtures.test.ts reduce.test.ts synthetic.test.ts
                             human-seat.test.ts (the M2 corpus: ask/answer pairing, the
                             M8 clickability rule) and render.test.tsx, which mounts
                             <Board/> over every fixture. `npm test` is `node --test`
                             THEN `vitest run` -- Node's type stripping does not
                             transform JSX, so the render test needs vitest (a dev
                             dependency; a checkout with no node_modules fails the gate
                             with a message saying exactly that)
    public/art.json          generated, gitignored

  tools/
    config.sh                sourced by the other scripts; reads config.json / $FORGE_JAR
    check-forge.sh           assert jar + every class we depend on; print sha256
    make-forge-home.sh       symlink, profile properties, custom-card overlay
    lint-bridge.sh           grep lint over bridge/src: the banned accessors (hard rule 8)
    check-all.sh             the pre-commit gate; chains everything above
    check-redaction.mjs      assert a recorded log leaks nothing (docs/protocol.md 9)
    check-redaction-selftest.mjs  run the checker over fixtures/negative/redaction/ and
                             assert every one-defect probe is REJECTED
    make-sample-fixture.mjs  writes fixtures/synthetic/sample-handwritten.jsonl
    make-negative-fixtures.mjs  writes fixtures/negative/redaction/ from a real recording
    fetch-art.ts             deck -> web/public/art.json

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
                             human-scry-7 (input.focusCard)
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

  forge-home/
    res -> ~/forge/res       symlink, gitignored
    forge.profile.properties generated by make-forge-home.sh (absolute paths), gitignored
    custom-cards/            committed card-script overrides, copied into
                             var/forge/custom/cards/ by make-forge-home.sh (D14)

  var/                       gitignored: Forge's redirected profile, logs, frame logs
  scripts/play.sh            M3+
```

## The documents

| File | What it is |
|---|---|
| [`docs/protocol.md`](docs/protocol.md) | **The wire spec.** The Java emitter and the TypeScript reducer are both written against it. Change it first. Its *Amendments* list at the top says what changed and why. |
| [`PLAN.md`](PLAN.md) | Eight milestones M0..M7, the deferred list, and the open questions only the user can settle. |
| [`DECISIONS.md`](DECISIONS.md) | Nineteen load-bearing decisions, dated, each with the alternatives that were rejected. D15-D19 are M2's: ask timeouts, the automated seat, the two inbound threads, isLibgdxPort, phase stops. |
| [`CLAUDE.md`](CLAUDE.md) | Working conventions: the hard rules, the environment, the lints. |
| [`docs/guides/java-for-typescript-people.md`](docs/guides/java-for-typescript-people.md) | The Java this repo actually uses, explained from TypeScript — plus the `javap`-first workflow and the enum/nullability traps the wire format depends on. |
| [`docs/research/05-architecture-synthesis.md`](docs/research/05-architecture-synthesis.md) | The architecture spec the whole plan rests on. |
| [`docs/research/06-hidden-information-audit.md`](docs/research/06-hidden-information-audit.md) | Every reveal path in Forge, its wire channel, and its leak signature. The basis of hard rule 8. |
| [`docs/research/07-wireguigame-spec.md`](docs/research/07-wireguigame-spec.md) | The M2 implementation spec: 37 members, the thread model, the eleven ask kinds. |
| [`docs/research/08-deck-card-coverage.md`](docs/research/08-deck-card-coverage.md) | Does Forge implement this deck's 28 cards faithfully? (One does not — see D14.) |
| [`docs/research/10-board-ui-spec.md`](docs/research/10-board-ui-spec.md) | The M4 board: component tree, layout, card tiles, arrows, the three evenings. |
| [`docs/research/11-engine-comfort-features.md`](docs/research/11-engine-comfort-features.md) | M6: phase stops, pass-to, auto-yield, auto-pay, undo, concede, new game — all as engine features, not client state machines. |
| [`docs/evidence/`](docs/evidence) | What was actually run, with real numbers. |

## Licence

GPL-3.0-or-later, the whole repository, from the first commit. The Java bridge
implements Forge interfaces on the same classpath in the same JVM, which makes it
unambiguously a derivative work of Forge. See [`LICENSE`](LICENSE) and
[`NOTICE`](NOTICE).

mtg-table is unofficial Fan Content permitted under the Wizards of the Coast Fan
Content Policy. Not approved, endorsed, or affiliated with Wizards. Portions of
the materials used are property of Wizards of the Coast. (C) Wizards of the Coast
LLC.
