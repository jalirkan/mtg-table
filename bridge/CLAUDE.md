# bridge/CLAUDE.md — the Java bridge's conventions

These load when you work under `bridge/`, on top of the root `CLAUDE.md`, whose
eleven hard rules are mostly the bridge's own (1–3, 5, 6, 8, 10 and 11). If Java
is new to you, `docs/guides/java-for-typescript-people.md` is the primer, and its
chapter 9 is a map of `WireGuiGame.java`, the biggest file here. The same map
sits in a comment block at the top of that file, right after the licence, and
that header is the authoritative copy: a change that moves a section or a member
it names fixes its line numbers in the same commit, then the guide's table.

Three sets of the bridge's rules live in other files, because each is one rule
with two ends: `web/CLAUDE.md`'s M6 conventions 2, 3 and 5 (the reset hook in
`WireGuiGame.openView`, the ask's one-frame redaction window, and `ActGuard` in
front of `undo` and `useMana` with the `refreshState()` hop), the root's
*Spectating* (the recorder's pacing, `hello_ok.match` only when asked) and
*Match setup* (every AI seat through `Bootstrap.createAiPlayer`), and
`tools/CLAUDE.md`, the gate that plays the bridge.

## `Snap.java` — the serialiser

Three conventions the lint cannot check, stated in a comment block at the top
of `Snap.java` (`docs/guides/java-for-typescript-people.md`): **enums go on
the wire via `.name()`, never `toString()`** (`forge.card.CardRarity`
overrides `toString()`); **nullable integers use `JsonOut.nInt`, never
`n(String,long)`**; and **every `CardStateView`-derived key is written in both
branches of the null-state check**, so the renderer never tests for key
absence.

## The socket, the end of a game, and the console seat

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

**A human seat has no wall clock** (**D286**). `--transport ws` and `console` put no
limit on a game; `null` and `auto` keep 900 s, and `--game-timeout <sec>` overrides
either (0 is none). What a `ws` session keeps instead is `--idle-timeout` (default
3600 s, 0 off): no `/ws` client connected for that long ends it, because the engine
parks on `input` with no deadline and nothing else would. `/observe` never counts as
a client. Keep any new wait on the seat under the same rule as the ask timeout: no
deadline while a client is connected.

**`/observe` is a read-only copy of the seat, and never the seat** (D280–D282,
amendment **M50**). Any number of followers on the same port; an observer is
caught up from the transport's cache (`hello_ok`, the last `state`,
this game's `over` or else its last `input`, every outstanding `ask`) and then
handed every string `push()` is handed — the seat's bytes, `seq` and redaction —
under the one `fanout` monitor, so neither a gap nor a duplicate. **Nothing an
observer does may reach the seat**: its messages are released unread, and
`connected()`, the ask timeout, the 4001 refusal, `onResync`, `onDisconnect`,
`ReplyPool.reopen`, `awaitNextGame` and the frame log count `/ws` only — a
change that lets an observer into any of them reopens the hazard the path exists
to close. Writes to it are bounded (8 MB unflushed, then it is dropped, D282),
because `push()` runs on the game thread. **Both paths check `Origin`** before
the handshake (D281): none is allowed (every Node tool sends none), otherwise
`config.json`'s `wsAllowedOrigins` (default loopback on any port and
`https://jalirkan.github.io`), else 403. A new client that is a browser page
must be served from an allowed origin; a new tool needs nothing.

**A LAN server is the token's, and loopback is never asked for it** (D287–D289,
amendment **M51**). `--lan` binds `0.0.0.0` and mints a 128-bit pairing token per
run; `LanGate`, first in the pipeline and present only then, refuses 403 any
request from a non-loopback peer without it — `?token=` on `/ws` and `/observe`,
`?token=` or the `mtgtable_token` cookie elsewhere (the cookie never opens a
socket) — compared through SHA-256 and `MessageDigest.isEqual`, and never
logged. `Door` then also admits `Origin: http://<Host>`, **for a non-loopback
peer only** (on loopback that is DNS rebinding). `--site-dir` adds `Site`, which
serves a built ForgeCoach at `/` — `GET`/`HEAD`, no listing, `.gz` as
`application/octet-stream` with no `Content-Encoding`, and a path checked as text,
as a normalised path and as a real path before a byte is read. With neither flag
the pipeline, the bind and every answer are M50's. A change to what a phone can
reach goes through `LanGate`; a change to what the site can reach goes through
`WsTransport.sitePath` and the real-path check, and `WsLanSelfTest` holds both.

**Two end-of-game rules from the 2026-09-27 hardening pass.** **An `act: newGame`
sent the instant `over` arrives is QUEUED** (**D114**, amendment **M45**): `over`
goes out at the outcome, while Forge is still finishing the game and has yet to
queue its own `finishGame()` for this GUI on the EDT; the act waits for that
game's `GameEventGameFinished` (seen by `WireGuiGame.FinishWatcher`, registered
last on that game's bus) and then runs as before. A cache or a hook that needs
"the previous game is really over" belongs behind that release, not behind
`over`. **And an exception out of Forge's game loop fails the run** (**D115**,
amendment **M46**): `MtgTable` installs `EngineCrash` as the default
uncaught-exception handler (it chains to whatever printed traces before), and a
`Game-n` thread dying with `forge.game.Match.startGame` on its stack ends the
game with an error `notice` in the bridge's own words — never the engine's
message, which names a card — and a null `over`, then exits 1 with the cause.
`RecordMatch` writes the same two frames. `bridge/run.sh` honours
`MTG_TABLE_CONFIG`, which is how `tools/check-engine-crash.sh` points a run at a
scratch Forge home — and how `tools/check-all.sh` gives every job, and
`tools/ten-games.sh` every row, a Forge home of its own (`tools/config.sh`'s
`forge_home_make`, whose config carries `repoRoot` so `var/games/` and every
repo-relative path stay where they were; D129, amended at merge).

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

## The build's self-tests

`bridge/build.sh` runs **seven** self-tests after javac (the seventh,
`mtgtable.WsLanSelfTest`, is amendment **M51**'s: real `WsTransport`s on free
ports, a phone played from 127.0.0.1 by swapping the transport's loopback
predicate — the token on every path, the cookie never on a socket, content types,
every traversal spelling and a symlink out of the root, and `http://<Host>` as an
Origin for a remote peer and never a loopback one; the sixth,
`mtgtable.WsObserveSelfTest`, is amendment **M50**'s: a real `WsTransport` on a
free port, raw-socket clients choosing their own `Origin` — 403s, an observer
that is never the seat, sends that reach nothing, a byte-for-byte catch-up, and
an observer that never reads dropped at the bound while `push()` keeps
returning; the fifth,
`mtgtable.ActGuardSelfTest`, is **D136**'s guard: each of its eight conditions
refuses on its own, the thread-state reading holds on real threads, and — since
polish-1 — the WIRING holds: `WireGuiGame.engineFacts` is `ActGuard.facts` over
its `GuardFeeds`, one read apiece, and the self-test drives `facts` with a fake
`ActGuard.Feeds`, so a condition fed a constant or another condition's feed
flips a verdict; eleven such mis-wirings, one at a time, each fail it):
`mtgtable.JsonSelfTest` (the JSON writer and, since amendment M52, `Snap.block`
— the `blockers` event's entry, where Forge's unblocked-attacker sentinel, the
attacker as its own blocker, must come out as `[]`; D290),
`mtgtable.AskSelfTest` (the ask path's answer marshalling — index 0 is the
defending player, a wrong-length `manipulate_list` answer is the identity order,
and so on), `mtgtable.GameLogSelfTest` (the frame log's close path: close in
under a second, exactly `N+1` lines on disk) and, since match setup's second fix
commit, `mtgtable.OverRaceSelfTest` (`over` stays the TERMINAL frame while
another thread is emitting: it parks an `input`, and then an act, on the log's
monitor behind `over` so the losing interleaving happens every run, then races
300 rounds with no help). The committed recordings carry nine of
the eleven ask kinds, and the other two (`options`, `manipulate_list`) are
**D35**'s ceilings, so for those two `AskSelfTest` is the only check that runs at
all; and the `GameLog` defect
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
