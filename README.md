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

Thirteen numbered steps and five lettered sub-steps (9b, 9c, **9d**, 10f and
**10g** — the last of each pair added by M6), stopping at the first
failure: `check-forge.sh` →
`lint-bridge.sh` (the banned-accessor grep over `bridge/src`) →
`bridge/build.sh` (javac plus three self-tests) → `Smoke` → a `RecordMatch`
re-record into `var/` → **a value-level drift diff** of that recording against
`fixtures/games/g1.jsonl` → **three fresh human-seat games** (`--transport
null`, the scripted `--transport console` smoke, and `--transport auto --seed
11`, each asserted to end in exactly one `over` as its last frame, plus the
advisory **9b** that re-records seed 42 and compares it against
`fixtures/games/human-auto-42.jsonl` as an order-insensitive multiset, and
**9c**, M5's exit criterion — `tools/ten-games.sh`, ten consecutive games across
six decks, the single most expensive thing in the file, which `SKIP_TEN=1`
turns off, and **9d**, M6's `sideboard` ask, which needs a session that survives
game 1) → **seven
fresh `--transport ws` servers** (the two `ws-smoke` variants, a whole game
through `tools/ws-auto-play.mjs`, that client again with `--refuse-first-ask`,
which drops the socket on the first `ask` frame so `ReplyPool.cancelAll()` runs
with a game thread genuinely parked, `ws-smoke --concede-before-input`, which
concedes from the handshake handler before the engine has asked this seat
anything — amendment M11's exception path — **10f**, `ws-auto-play --probe`,
the only thing anywhere that sends the `clickAbility` **act** from a client
rather than answering an ability menu by index, and **10g**, M6's own command:
three games back to back over one socket, with the five comfort acts each
asserted by the **effect** it had on the next `state`) →
`check-redaction.mjs` over the committed fixtures (games *and* synthetic) *and*
every fresh recording → `check-redaction-selftest.mjs`, which asserts the
checker still rejects fourteen one-defect probes → `npm run build && npm test` in
`web/`. **About eleven and a half minutes** from a deleted `bridge/out` (682 s
and 706 s on two clean M6 runs; it was 8 m 52 s before M6 added 9d and 10g), of
which 9c's ten games are 265–269 s and the seven ws servers most of
the rest; `SKIP_TEN=1` brings it back to roughly six. Every JVM step runs
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
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 11   # the seat, automated
./bridge/run.sh mtgtable.MtgTable --transport null --seed 42   # every ask -> null

# M3/M6 — the same game in a browser tab; this is the one command you type
./scripts/play.sh             # check-forge -> build -> the JVM -> /health -> vite --open
#   M6: a bare run is THREE games back to back (--games 3) and lingers after the
#   last `over` (--keep-open) for as long as the browser stays connected, which
#   is the window the board's New Game row needs.  Pass your own --games to
#   override, --no-keep-open to turn the linger off.
./scripts/play.sh --seed 42 --no-open --port 8643
./scripts/play.sh -- --games 1          # one game (your --games wins)
#   --port/--web-port override config.json's wsPort/webPort; --no-open skips the
#   browser; everything after `--` goes to mtgtable.MtgTable untouched.
#   Ctrl-C stops both halves.

# M3 — the socket by itself, without a browser
./bridge/run.sh mtgtable.MtgTable --transport ws --port 8642 --seed 42 --keep-open
#   ws://127.0.0.1:8642/ws   the frames        (one client at a time; a second is
#                                               refused with close code 4001)
#   http://127.0.0.1:8642/health   200 "ok" once the game is ready, 503 "starting"
#                                  before it — what scripts/play.sh polls
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

# M5 — the exit criterion, as a command: ten consecutive games across six decks,
#      each asserted for `over`, zero UNIMPL, one-kind ask ceiling, the typed
#      acts a row exists to prove, and check-redaction.mjs.  ~270 s.
./tools/ten-games.sh
./tools/ten-games.sh --games 3     # the first three rows, for a quick look

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
```

Everything above runs today. As of **M4** the board those frames feed is a real
Magic table — card art, tapped cards rotated 90°, two player rails, a phase
strip, a stack panel, targeting and combat arrows, and a keyboard — and as of
**M5** nothing on it dead-ends: floating mana is spendable, the board-shaped
questions are answered on the board, every zone can be opened and read, and the
declared attackers and blockers are a strip of their own.

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
untouched — including a `--games` of your own, which wins.

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

`?replay=games/morph.jsonl` is the one to open if you have not run
`tools/fetch-art.ts`: that deck has no art entries at all, so every card on the
board is the generated text frame, which is what a missing image looks like.

### Arena mode — the same game, in 3D

**M7, Tier 1.** The arena is a **second renderer for the same frame stream**, not
a second app: the socket, the reducer and the frame log are untouched and
`#arena` is the whole of the difference.

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
rest of the game, Quake's tap sends a shockwave across the table, Peggy Carter
attacking alone wears a shield.

**Spectator mode is the replay corpus, and it needs no JVM.** `fixtures/games/`
holds eighteen recorded games — the M1 AI-vs-AI duels and the later human-seat
sessions — and every one of them plays as a cinematic with nothing running but
`vite`:

```bash
npm --prefix web run dev                      # then edit the URL:
#   /?replay=games/g1.jsonl#arena             an AI-vs-AI duel, as an episode
#   /?replay=games/g3.jsonl#arena             another seed
#   /?replay=games/morph.jsonl#arena          the deck with no art — every card
#                                             is the generated text frame
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
**`?` or `H`** lists all twenty rows in the arena as well — the same table the
handler reads. The two that are the arena's own:

| key | what it does |
|---|---|
| **V** | switch renderer: 2D board ↔ 3D arena, the same game and the same socket |
| **K** | **skip every animation on screen.** It is `apply(t = 1)` then `end()`, so the table lands on exactly what the engine described. Nothing can be missed by pressing it |

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
replay clock, so pausing cues does not pause the frame log. Cues never delay a
question: while the engine is waiting on you, long cues are compressed and the
queue says so.

**Reduced motion.** With `prefers-reduced-motion: reduce` the arena drops every
camera move and every shake outright, and plays what is left at **30% of its
duration** — not zero. That distinction is deliberate and was a bug once: several
cues are the only channel for a *fact* (the damage number, the counter pip, the
life delta), so deleting them removes information rather than motion.

**The seat is the same seat.** A click on a card is the same `act: clickCard` the
board sends, the prompt and the two buttons are the engine's own words rendered
verbatim, and every one of M5's twelve question modals is the same component,
mounted over the canvas. Each seat's **life total, poison, hand / library /
graveyard / exile counts and floating mana** sit on a plate at its own edge of
the frame, drawn with the *same components* the 2D rail uses — so the two
renderers cannot disagree about a number, and pressing **V** mid-game shows the
same totals on the board.

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

**Iterating on a cue.** There is no `?cue=<id>` loop route — report 09 §10.7 asks
for one and it is not built — and no `?cues=<url>` override either, because §2.1
rule 1 says in as many words that the arena *never calls `fetch`*, and a cue file
pulled over the network is a fetch. What exists instead is a **dev-only handle**,
and it is more general than either: in `npm run dev`, `window.__mtgArena` carries
the live `queue`, `stage`, `pool`, `rigs`, `director`, `gl`, `scene` and
`camera`. (A production build carries **none** of that; `?glinfo=1` adds one
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
```

`advance()` moves the clock whether or not the queue is paused, which is also the
only way to photograph the middle of a cue in an environment whose animation
frames do not fire. It is `import.meta.env.DEV`-only and is dropped from the
production bundle entirely.

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

## Repo layout

Everything listed exists today (M0-M7, arena Tier 1); `Tier 2+` marks what a
later pass would add.

```
mtg-table/
  LICENSE                    GPL-3.0-or-later, whole repo
  NOTICE                     Forge (GPLv3), Scryfall, WotC Fan Content Policy, Marvel
  README.md                  this file; NON-GOALS above
  PLAN.md                    the eight milestones M0..M7, deferred list, open questions
  DECISIONS.md               the fifty-two load-bearing decisions, dated
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

  docs/
    protocol.md              the living spec of the wire protocol and the frame log
    guides/java-for-typescript-people.md   the Java the bridge actually uses
    research/*.md            the eleven reports this plan rests on
    evidence/*.md            what was actually run, with real numbers
    ideas/arena-mode.md      M7: the tiers, the per-card cue table, the constraints

  bridge/                    the only Java. Hosts the engine, redacts, serialises, serves /ws.
    build.sh  run.sh
    src/mtgtable/            Bootstrap Config HeadlessGuiBase Json JsonSelfTest Snap
                             GameLog GameLogSelfTest RecordMatch Smoke
                             WireGuiGame ReplyPool Transport MtgTable Ask AskSelfTest
                             NullTransport AutoTransport ConsoleTransport
                             WsTransport (M3: netty, ws://127.0.0.1:<port>/ws,
                             GET /health, one client, cancelAll on disconnect)
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
                             M7 added two rows (V, K) rather than a second keyboard
      useView.ts             (M7) #arena / #/arena / ?view=arena, with no router
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
                             plates, the ask modals over the canvas) and four pure
                             modules `node --test` imports with no three and no DOM:
                             layout.ts (THE resting pose -- the only thing that knows a
                             coordinate) camera.ts (the seven camera rules as numbers)
                             colour.ts perf.ts (the dpr governor's ladder)
      arena/cues/            (M7) the cue engine, and it is data + arithmetic:
                             cues.json (28 cards + 7 archetypes) defaults.ts (every one
                             of the 25 event kinds) registry.ts (cue id -> arithmetic
                             over t in [0,1]) resolve.ts (the per-card -> archetype ->
                             default ladder) queue.ts stage.ts types.ts archetype.ts
                             validate.ts intake.ts. No three, no React, no timers
      arena/scene/           (M7) the three half. CardPlane.tsx is THE card renderer of
                             the arena, the way CardTile.tsx is the board's;
                             CueRunner.tsx is the ONE useFrame; effects.ts is a fixed
                             pool of 26 meshes; useCardTexture.ts, textFrame.ts,
                             cardMaterial.ts, geometry.ts (one quad for every card),
                             HitProxy.tsx, Table.tsx, rigs.ts, SceneStage.ts
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
                             components, not just Board.tsx);
                             and (M7) layout.test.ts (the resting pose over the whole
                             corpus, including hard rule 8's 3D half: every concealed
                             card is placed as a BACK) colour.test.ts
                             replay-cues.test.ts (every committed recording through the
                             real reducer and the real queue against a NullStage, with
                             the per-kind and per-card cue census printed each run)
                             cues-exhaustive.test.ts (the ladder is total; the cue file
                             is valid) camera.test.ts liveness.test.ts (the arena
                             imports no transport and decides nothing) perf.test.ts
                             and arena-hud.test.tsx (the life plates, over every frame)
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
    ws-smoke.mjs             M3: the two socket doorstep tests — connect/resync/concede,
                             and drop-mid-ask/reconnect/finish
    ws-auto-play.mjs         M3: a whole game over the socket with AutoTransport's own
                             dumb-human policy; --log writes a CLIENT frame log.
                             --refuse-first-ask drops the socket on the first `ask`
                             FRAME (the only cancelAll() coverage with a game
                             thread actually parked), reconnects and finishes.
                             --probe (M5) mirrors AutoTransport's probe policy line for
                             line, and is the only client that sends clickAbility
    ten-games.sh             M5's exit criterion as a command: ten --transport auto
                             games at seeds 1..10 alternating pacho-shield and the probe
                             decks, each asserted for `over`, zero UNIMPL (the summary
                             AND a raw grep), emit errors = 0, an ask-kind ceiling, the
                             typed acts the row exists to prove AND their effect, and
                             check-redaction.mjs.  check-all.sh runs it as step 9c
    arena-bench.mjs          M7: report 09 §9.4's frame-time measurement -- headless
                             Chromium + SwiftShader against a PRODUCTION build served by
                             `vite preview`. Deliberately NOT in check-all.sh
    fixture-multiset-diff.mjs  the advisory 9b drift check: re-record a seed and compare
                             it to its committed fixture as a multiset, `seq` stripped
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

  forge-home/
    res -> ~/forge/res       symlink, gitignored
    forge.profile.properties generated by make-forge-home.sh (absolute paths), gitignored
    custom-cards/            committed card-script overrides, copied into
                             var/forge/custom/cards/ by make-forge-home.sh (D14)

  var/                       gitignored: Forge's redirected profile, logs, frame logs
  scripts/play.sh            M3/M6: check-forge -> build -> the ws bridge -> /health ->
                             vite.  Defaults to --games 3 --keep-open (M6)
```

## The documents

| File | What it is |
|---|---|
| [`docs/protocol.md`](docs/protocol.md) | **The wire spec.** The Java emitter and the TypeScript reducer are both written against it. Change it first. Its *Amendments* list at the top says what changed and why. |
| [`PLAN.md`](PLAN.md) | Eight milestones M0..M7, the deferred list, and the open questions only the user can settle. |
| [`DECISIONS.md`](DECISIONS.md) | Forty-five load-bearing decisions, dated, each with the alternatives that were rejected. D15-D19 are M2's: ask timeouts, the automated seat, the two inbound threads, isLibgdxPort, phase stops. D20-D27 are M3's: the asynchronous ability menu, /health as the session's readiness, the socket's ask timeout, one client at a time, resync semantics. D28-D31 are M4's: the three Scryfall image variants over a generated text frame, mana-font, the arrows and their rect registry, and the read-only phase strip. D32-D36 are M5's: the mana-font fork, which questions are answered on the board, the mana pips as the `useMana` control, the two unreachable ask kinds as documented ceilings with the probe policy behind a flag, and the combat-band strip as an overlay. D37-D45 are M6's: the phase strip going live (and no "hold priority", because Forge has no such feature), phase stops reseeded per game, when the refresh hop may walk Forge's view graph, the wait for New Game obeying the socket rather than a wall clock, the `{own, opp}` phase-stop shape, the opaque `yieldKey` handle, the floating-mana prompt on by default, one `hello_ok` and one frame log per game, and `Space` following `input.buttons.focus`. |
| [`CLAUDE.md`](CLAUDE.md) | Working conventions: the hard rules, the environment, the lints. |
| [`docs/guides/java-for-typescript-people.md`](docs/guides/java-for-typescript-people.md) | The Java this repo actually uses, explained from TypeScript — plus the `javap`-first workflow and the enum/nullability traps the wire format depends on. |
| [`docs/research/05-architecture-synthesis.md`](docs/research/05-architecture-synthesis.md) | The architecture spec the whole plan rests on. |
| [`docs/research/06-hidden-information-audit.md`](docs/research/06-hidden-information-audit.md) | Every reveal path in Forge, its wire channel, and its leak signature. The basis of hard rule 8. |
| [`docs/research/07-wireguigame-spec.md`](docs/research/07-wireguigame-spec.md) | The M2 implementation spec: 37 members, the thread model, the eleven ask kinds. |
| [`docs/research/08-deck-card-coverage.md`](docs/research/08-deck-card-coverage.md) | Does Forge implement this deck's 28 cards faithfully? (One does not — see D14.) |
| [`docs/research/10-board-ui-spec.md`](docs/research/10-board-ui-spec.md) | The M4 board: component tree, layout, card tiles, arrows, the three evenings. (One number in §2.2 is 23 px out against the built board — PLAN's M4 follow-up 2.) |
| [`docs/research/11-engine-comfort-features.md`](docs/research/11-engine-comfort-features.md) | M6: phase stops, pass-to, auto-yield, auto-pay, undo, concede, new game — all as engine features, not client state machines. |
| [`docs/evidence/`](docs/evidence) | What was actually run, with real numbers — `m4-board.md` is the board: measured geometry, the live games, the arrows, the keyboard, and the gate run that closed M4. M5 is three files: `m5-probes.md` (the probe decks, which ask kinds the engine can actually reach, and the two unreachability proofs), `m5-board.md` (the board half: the picker rule with its census, the mana pips, the zone browsers, the band strip) and `m5-fixes.md` (two verification passes, thirteen findings, each with its reproduction). M6 is two: `m6-engine.md` (the session that outlives `over`, the five acts with the state each changed, the `sideboard` recording, the gate's new 9d and 10g) and `m6-board.md` (the dots going live, Pass-To, auto-yield, Undo, New Game, `Space` following the engine's focus). |

## Licence

GPL-3.0-or-later, the whole repository, from the first commit. The Java bridge
implements Forge interfaces on the same classpath in the same JVM, which makes it
unambiguously a derivative work of Forge. See [`LICENSE`](LICENSE) and
[`NOTICE`](NOTICE).

mtg-table is unofficial Fan Content permitted under the Wizards of the Coast Fan
Content Policy. Not approved, endorsed, or affiliated with Wizards. Portions of
the materials used are property of Wizards of the Coast. (C) Wizards of the Coast
LLC.
