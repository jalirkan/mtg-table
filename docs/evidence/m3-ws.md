# M3 evidence — the Java half: the seat on a loopback WebSocket

What was actually run, on 2026-09-11, with real numbers. Milestone M3 of
[`PLAN.md`](../../PLAN.md) — the bridge half. The browser half
(`web/src/transport/ws.ts`, `scripts/play.sh`, `tools/ws-auto-play.mjs`) is the
other agent's, and the two meet at the contracts listed in §1.

Jar: `forge-gui-desktop-2.0.14-jar-with-dependencies.jar`,
sha256 `3c0a7c385b9207e593fe149255e00d1cd7e5568…`,
`BuildInfo.getVersionString()` = `2.0.14-SNAPSHOT-08.08`. The netty bundled in
that jar is **4.1.115** and carries
`io.netty.handler.codec.http.websocketx` — verified by unzipping the class
files, not assumed.

---

## 0. What shipped

| File | What it is |
|---|---|
| `bridge/src/mtgtable/WsTransport.java` | **new, 784 lines.** The netty server: `ServerBootstrap` on 127.0.0.1, the six-handler pipeline, `GET /health`, one client at a time, connect/resync re-delivery, `cancelAll()` on disconnect, the liveness-shaped ask timeout, `--keep-open`'s drain. |
| `bridge/src/mtgtable/MtgTable.java` | **edited**: `--transport ws`, `--port`, `--keep-open`, the `WS LISTENING` / `WS HEALTH` lines, and three `ws …` rows in the run summary. |
| `bridge/src/mtgtable/WireGuiGame.java` | **edited, four places**: the final `gameOver` state before `over` (M2 follow-up 1), the post-`over` emit gate, and `emit` holding the log monitor across its push so wire order matches `seq` order. |
| `bridge/src/mtgtable/ReplyPool.java` | **edited**: `reopen()`, so a reconnect can be asked again after a disconnect latched the pool closed; and the watchdog no longer dies with that latch. |
| `bridge/src/mtgtable/Transport.java` | **edited (comments only)**: the `Inbound` contract now names its third caller. |
| `bridge/src/mtgtable/HeadlessGuiBase.java` | **edited**: the class-init thread-name assert covers the netty event loop, which is the **eighth** name. |
| `tools/ws-smoke.mjs` | **new.** The M3 doorstep test in two variants — `connect → resync → concede`, and `--disconnect-mid-ask`. |
| `tools/check-all.sh` | **edited**: step 10, three fresh ws servers. |
| `docs/protocol.md` | **edited**: amendments **M10–M13** (§2). |
| `fixtures/games/human-*.jsonl` | **re-recorded**, all five (§7). |

`tools/lint-bridge.sh` needed **no** change: `WsTransport` names no `CardView`
(it never sees a view at all — everything it touches is already a JSON string),
and its one `new Thread(` carries `WS_THREAD_NAME` on the same line, which is
what section 6 of the lint greps for.

---

## 1. The contracts, and where each one is satisfied

The two halves of M3 were built against a fixed list. This is the bridge side of
it, line by line.

| Contract | Where | Verified by |
|---|---|---|
| (a) `--transport ws [--port] [--seed] [--deck]`, one game, the same summary, exit 0 after `over`; `--keep-open` holds the process 30 s; `GET /health` → `200 ok` | `MtgTable.transport()`, `WsTransport.start()`, `WsTransport.Health` | §3, §4 |
| (b) on connect: `hello_ok`, then a full `state`, then the current `input`; `resync` re-sends the last two; `ping` → `pong` | `WsTransport.handshake()` → `resend(ch, true)`; `onText` | §4.1, §4.3 |
| (c) ask timeout 0 while connected, `cancelAll()` on disconnect, reconnect resumes, one client at a time, a second connection refused with a close code and a notice | `askTimeoutMs`, `WsHandler.channelInactive`, `ReplyPool.reopen`, `WsHandler.refuse` | §4.2, §4.4 |
| `transport: "ws"` in the session header | `MtgTable.sessionHeader` (unchanged — it already wrote `a.transport`) | §7.2 |
| `Transport.Inbound` runs on a thread that is neither a game thread nor `mtg-table-EDT` | netty's event loop, named `mtg-table-ws` | §5 |

---

## 2. The protocol amendments M3 forced

Four rows, dated 2026-09-11, at the top of `docs/protocol.md`'s Amendments list.
None bumps `v`; none changes a byte of any M1 or M2 recording.

- **M10 — `seq` is per *session*, not per connection.** A re-delivered frame keeps
  the `seq` and `t` it was born with and is **not** logged twice. So a client
  connecting mid-game legitimately sees its first `state` at `seq: 340`, a
  mid-stream `resync` legitimately re-sends a *lower* `seq` than the frame before
  it, and §2.1's "one `hello_ok` per game" still holds exactly — one is
  *generated*, a reconnecting client is handed a copy. It also reserves
  **`seq: 0`** for the two frames that belong to no session stream: the `pong`,
  and the single `notice` a refused connection gets. (Amendment M9 had just
  banned `seq: 0` for session frames; this does not reopen that — it names the
  one thing the number now means.)
- **M11 — M4 softened.** `over` follows the `state` carrying `gameOver` on every
  path where Forge published an outcome, and the emitter now *guarantees* that
  rather than hoping the event forwarder had something to flush. The exception is
  a concede **before the engine has asked this seat for anything**: there is no
  outcome to snapshot and the act is on the EDT, where building one is illegal.
  `over` there is `{winner: null, reason: null, matchOver: true}` with no
  `gameOver` state in front of it, and the bridge says
  `OVER WITHOUT A gameOver STATE` on stderr.
- **M12 — `over` is terminal for the file, enforced.** See §6.2: this was a real
  defect the socket found.
- **M13 — `GET /health`, the `WS LISTENING` line, and close code 4001.**

---

## 3. Build, lint, boot

```
$ ./bridge/build.sh
bridge lint OK (20 file(s))
compiling 20 file(s) -> /home/justin-a/code/mtg-table/bridge/out
JsonSelfTest: 38 check(s), 0 failure(s)
AskSelfTest: 62 check(s), 0 failure(s)
GameLogSelfTest: 35 check(s), 0 failure(s)
build OK
```

Clean under `-Xlint:all` — no warnings, and none suppressed except the two
`@SuppressWarnings("unchecked")` casts every Jetty-parsed map in this repo needs.

The server binds inside `transport.start()`, which `MtgTable` calls **before**
`HostedMatch.startMatch`, so the readiness line and `/health` both mean "the
bridge is up", not "the port is open":

```
$ ./bridge/run.sh mtgtable.MtgTable --transport ws --seed 13 --port 8643
…
FModel.initialize took 1963 ms
WS LISTENING ws://127.0.0.1:8643/ws
WS HEALTH    http://127.0.0.1:8643/health

$ curl -s -i http://127.0.0.1:8643/health
HTTP/1.1 200 OK
content-type: text/plain; charset=us-ascii
content-length: 2
connection: close

ok
```

`/health` answered **4 s** after the process was launched, on a warm page cache.
`scripts/play.sh` can poll it every second and be inside the first `FModel`
initialisation.

---

## 4. The five things a socket adds, each one measured

### 4.1 Connect → resync → concede (M3 doorstep test 1)

```
$ node tools/ws-smoke.mjs --port 8643
ws-smoke: connect → resync → concede, at ws://127.0.0.1:8643/ws
  open
  s2c  hello_ok
  s2c  state
  s2c  input
  c2s  resync
  s2c  state   (after resync)
  s2c  input   (after resync)
  c2s  act concede
  s2c  over    winner=1 reason="AllOpponentsLost"
ws-smoke OK: connect → resync → concede reached `over` with no exception
```

This is PLAN.md's first hand-over item. `resync` is a first-class client frame,
a browser that autoconnects sends one before Forge has asked this seat for
anything, and `WireGuiGame.onResync` used to arm `inputSeen` — which disarmed the
guard that keeps a concede out of `Match.prepareAllZones`, where removing a
player mid-iteration throws inside Forge's own setup. The guard was fixed in M2;
**this is the test that keeps it fixed**, and it is now step 10a of the gate.

### 4.2 Disconnect mid-decision, reconnect, and the game is still there

```
$ node tools/ws-smoke.mjs --port 8644 --disconnect-mid-ask
  open
  s2c  hello_ok
  s2c  input  (OK = "Keep")
  drop the socket
  reconnect
  s2c  hello_ok  (again, after the reconnect)
  s2c  state
  s2c  input
  c2s  act concede
  s2c  over    winner=1 reason="AllOpponentsLost"
ws-smoke OK: dropped the socket at a live `input`, reconnected, and the game
             still reached `over`
```

Server side, the same run:

```
WS CONNECT /127.0.0.1:37018 (connection #1)
WS DISCONNECT /127.0.0.1:37018 -- cancelling 0 pending ask(s)
WS CONNECT /127.0.0.1:57576 (connection #2)
WS DISCONNECT /127.0.0.1:57576 -- cancelling 0 pending ask(s)
```

and the frame log ends exactly as §8.4 says it must:

```
session  -        state  seq=2     input  seq=5
hello_ok seq=1    input  seq=3     input  seq=6
                  input  seq=4     act    seq=1 (c2s)
                                   state  seq=7   gameOver={"winner":1,"reason":"AllOpponentsLost","matchOver":true}
                                   over   seq=8
```

**The decision D15 had left open.** The console waits forever because a human is
thinking; `auto` and `null` wait 30 s so a test fails fast. A socket is neither,
and copying either number is the bug the PLAN warned about. What bounds a socket
ask is **whether the peer is still there**: `askTimeoutMs` returns `0` (forever)
while a client is connected, and `channelInactive` calls
`Inbound.onDisconnect()` → `ReplyPool.cancelAll()`, which is what actually
unparks a game thread. With **no** client connected there is nothing to be live,
so the fallback is a finite `NO_CLIENT_ASK_TIMEOUT_MS = 120_000`, and the game
degrades to protocol §5.4's documented defaults rather than parking a game thread
against a socket nobody is on the other end of.

`cancelAll()` latches the pool closed on purpose (a game that is winding down must
not park again), which made reconnect-resumes a second problem, not the same one:
`ReplyPool.reopen()` lifts the latch, and **`WsTransport`'s handshake is the only
caller.** Asks cancelled while the socket was down stay cancelled — those game
threads have already taken their default and cannot be un-defaulted.

### 4.3 Keepalive

A client `ping` is answered with a `pong` carrying `seq: 0` (amendment M10):

```
pong frames: [{"v":1,"seq":0,"t":1789170816305,"type":"pong","body":{}}]
```

### 4.4 One client at a time

A second connection to a server that already has one:

```
B saw:   [{"v":1,"seq":0,"t":…,"type":"notice",
           "body":{"level":"error","title":"Connection refused",
                   "text":"another client is already connected to this game"}}]
B close: {"code":4001,"reason":"another client is already connected to this game"}
A still open? true
```

**4001, not 1008 or a silent close**: an application close code (≥ 4000) is what
lets `web/src/transport/ws.ts` tell "the server said no" from "the network
broke", and stop reconnecting instead of hammering a server that already
answered. The primary client is untouched — it never learns the refusal happened.

### 4.5 Garbage in

A frame that is not JSON, and a frame with an unknown `type`, are both dropped
with one stderr line each; the socket stays open and the game continues:

```
A still open after garbage? true
```

This is protocol §2.2's tolerance rule applied to the frame layer: the server
must never crash on what a client sends, and the netty thread is precisely the
thread that is allowed to be wrong without wedging a game thread.

---

## 5. Threads

`forge.util.ThreadUtil.isGameThread()` is a bare `getName().startsWith("Game")`,
so every thread this repo creates is named from a constant. M3 adds the **eighth**:

| Thread | Where the name lives |
|---|---|
| `mtg-table-ws` | `WsTransport.WS_THREAD_NAME`, handed to `NioEventLoopGroup` as a `ThreadFactory` |

Netty's own `DefaultThreadFactory` would have called it `nioEventLoopGroup-2-1`.
That is harmless *today* — it does not start with `Game` — and it is exactly the
kind of name this repo refuses to depend on, so the factory is ours.
`HeadlessGuiBase`'s class-init assert now covers all eight names and
`tools/lint-bridge.sh` section 6 finds the constant on the `new Thread(` line.

**The `Inbound` contract needed no change and no exception.** It says "any thread
that is neither a game thread nor the EDT", asserted at the top of `onAct`,
`onAnswer` and `onDisconnect`. The netty event loop is both of those things not,
so `WsTransport` dispatches straight from it: it has **no reader thread of its
own**, which makes it the first transport to satisfy the contract as written
rather than by being `mtg-table-io`. Every assert stayed armed through every run
in this document; none of them fired.

One event loop, one thread: inbound frames, outbound writes and the accept path
are all serialised onto it, which is why `resend()` can read the cached frames
and write them without a lock.

---

## 6. Three emitter defects this work closed

### 6.1 The last `state` before `over` (M2 follow-up 1 — closed)

PLAN.md's first M2 follow-up: amendment M4 says `over` is emitted "after the
`state` that carries it", and the emitter did not guarantee it.
`captureOutcome()` set `overBody` and called `forwarder.flush()`, which ships
whatever the forwarder happens to be holding — on a concede, routinely nothing.

Fixed where the fix is legal: `captureOutcome` has already hopped to a game
thread, so it now calls `flushState(List.of())` itself when no `gameOver`
snapshot has gone out. Measured, re-recording each committed fixture at its own
seed:

| fixture | committed lines / `state` | re-recorded lines / `state` |
|---|---|---|
| `human-auto-42` | 1611 / 227 | **1611 / 227** |
| `human-auto-7` | 1214 / 165 | **1214 / 165** |
| `human-auto-2026` | 926 / 133 | **927 / 134** |
| `human-scry-7` | 984 / 155 | **985 / 156** |
| `human-trample-7` | 1153 / 169 | **1154 / 170** |

The three that gained a frame gained exactly one, and the normalised diff says
what it is:

```
$ diff <(norm human-auto-2026.jsonl) <(norm var/games/human-auto-2026/frames.jsonl)
926c926,927
< {"seq":779,"type":"over","body":{"winner":1,…}}
---
> {"seq":779,"type":"state","body":{…,"gameOver":{"winner":1,"reason":"AllOpponentsLost",…}}}
> {"seq":780,"type":"over","body":{"winner":1,…}}
```

`human-auto-42` and `human-auto-7` already had it: the forwarder happened to be
holding a batch on those two runs, which is the definition of a behaviour you
cannot rely on.

**One path is left, and M4 is softened rather than met (amendment M11):** a
concede that arrives *before* the engine has asked this seat for anything is
handled by `applyAct`'s pre-`inputSeen` guard, which ends the session without
reaching Forge's game-over. There is no outcome to snapshot and the act is
running on the EDT, where `Snap.over` may not be called at all. `over` there
carries `{winner: null, reason: null, matchOver: true}`, and the bridge now says
so on stderr instead of leaving a reader to infer it from a missing frame.

### 6.2 A frame after `over` (amendment M12)

The first full concede over a socket produced this tail:

```
s2c input seq=8    s2c over seq=9    s2c input seq=10
```

Forge keeps pushing after the game ends — the wind-down calls `afterGameEnd`,
which calls `updateButtons` and `showPromptMessage` — and in-process that race
had always been won by `MtgTable`'s `transport.close()`. Over a socket it was
not, and both the wire and `frames.jsonl` got an empty `input` **after** the
frame §8.4 calls terminal, which is also the frame `tools/check-all.sh` asserts
is `tail -1`.

`WireGuiGame.emit` now drops every s2c frame once `over` has been emitted (the
`over` itself excepted) and `logC2s` drops every c2s line, each with a stderr
note. The invariant is structural now instead of a race the gate was winning.

### 6.3 One more, found by reading: wire order vs `seq` order

`emit()` did `seq = log.s2c(...)` and `transport.push(...)` as two statements. It
is reached from four threads, so two of them could take `seq` 5 and 6 and then
push in the order 6, 5 — invisible in the frame log (`GameLog` writes in `seq`
order) and visible on a socket, where it is a client applying an older snapshot
over a newer one. The push is now inside the same monitor `GameLog.s2c` uses
(one reentrant acquisition; every `push` implementation is non-blocking by
`Transport`'s own contract, which is what makes it safe to hold). No recording
was observed with an inversion; this is a hole closed, not a bug reproduced.

---

## 7. The fixtures

### 7.1 Re-recorded, all five

```
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 42   --game-id human-auto-42
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 7    --game-id human-auto-7
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 2026 --game-id human-auto-2026
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 7 --game-id human-scry-7 \
    --deck decks/scry-probe.dck    --deck2 decks/morph-probe.dck
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 7 --game-id human-trample-7 \
    --deck decks/trample-probe.dck --deck2 decks/morph-probe.dck
```

**`--deck2 decks/morph-probe.dck` is load-bearing on the last two and
`docs/evidence/m2-console.md` §7 does not say so.** It names only the human
seat's probe deck, and re-recording `human-trample-7` against itself produced a
game with **no `assign_damage` ask at all** — six consecutive tries, 1109–1115
lines each, `askkinds = -`. The committed fixture's opponent holds Ainok Tracker,
Battering Craghorn and Ashcloud Phoenix, which is the morph probe: the trample
ask fires when a trampler is blocked, and `assignCombatDamage` is only asked of
the GUI for a trampler or a double block. With the right `--deck2` it came back
on the first try. The scry fixture is the same story for `input.focusCard`.

After re-recording, all five carry what they were recorded for:

| fixture | lines | `ask` kinds | `input.focusCard` frames |
|---|---|---|---|
| `human-auto-42` | 1611 | `choose_list`, `order` | 0 |
| `human-auto-7` | 1214 | `order`, `choose_list` | 0 |
| `human-auto-2026` | 927 | `choose_list`, `order` | 0 |
| `human-scry-7` | 985 | `choose_list` | **24** |
| `human-trample-7` | 1154 | **`assign_damage`**, `choose_list` | 0 |

`check-redaction.mjs` passes all five, `npm --prefix web test` passes 246 + 36
tests against them, and `<Board/>` renders every frame of every one.

**`--transport auto` is not deterministic and the corpus should not be read as
if it were.** Same seed, same jar, a different game: `human-trample-7`'s
normalised diff against its predecessor is 193 lines because the AI played
differently, and `human-auto-42`'s three-line diff is a `state` that moved behind
two `input` frames — the thread interleaving §8.7 already warns about. Only
`fixtures/games/g1.jsonl` (the AI-vs-AI `RecordMatch` recording) is byte-stable
enough for the gate's value-level drift diff, and that step is unchanged and
still green.

### 7.2 M2 follow-up 5 — the `transport` header key stays **optional**

The decision, taken here because M3 is the milestone that adds `"ws"` to its
domain and PLAN.md says it is cheapest to take now:

> **`transport` remains optional. The six AI-vs-AI fixtures are NOT regenerated.**

The key means "a seat played this log, and this is the client that played it".
`RecordMatch` has no seat, writes no key, and an absent key is therefore
*information* — it says "AI-vs-AI recording" — rather than a gap. Making it
mandatory would buy one thing: `check-redaction.mjs`'s A12 rule could fail
instead of warn on a `null` answer to `order` or `choose_list` without having to
special-case `transport: "null"`. The price is regenerating six fixtures that no
other pressure is asking anyone to touch, on an emitter that is
non-deterministic (§7.1), to sharpen a rule that already catches the case it
exists for via the header it already has.

That trade gets worse with `ws`, not better: a ws session's header says
`transport: "ws"` like any other seat log, so nothing about M3 needs the key to
be mandatory. It stays optional; `RecordMatch` stays untouched; the six AI-vs-AI
fixtures keep their bytes. Revisit it when something other than tidiness wants
it.

---

## 8. A whole game, unattended, over the socket

`tools/ws-auto-play.mjs` (the browser agent's file — the same dumb-human policy
as `AutoTransport`, spoken over the wire) against a fresh server. This is step
10c of the gate, so the run below is reproducible by typing
`./tools/check-all.sh`:

```
[ws-auto     22ms] open
[ws-auto     54ms] HELLO game=check-all-ws-auto seat=0 seed=13
                         forge=2.0.14-SNAPSHOT-08.08 players=Human vs Forge AI
[ws-auto    334ms] ACT  buttonOk  <- "Forge AI is going first.…Do you want to keep your hand?"
[ws-auto   1026ms] ANSW order a1 = {"ordered":[0],"remember":false}
                        <- "Select order for replacement effects"
[ws-auto   1033ms] ANSW choose_list a2 = [0]  <- "Choose a color"
[ws-auto   1178ms] NOTE warn "Not selectable" "card 33 cannot be selected now"
…
[ws-auto  29437ms] OVER winner=1 reason=AllOpponentsLost matchOver=true
[ws-auto] OVER — exit 0
```

Note the `Not selectable` notice at 1,178 ms: that is amendment **M8** working
over a socket. The client clicked a card that was not in
`input.selectable.cardIds` — as 78 of 86 clicks in `human-auto-42.jsonl` do —
and **Forge judged it**, which is the whole point of M8 and the second of
PLAN.md's hand-over items.

Server side:

```
finished       = true
winner         = Forge AI, reason = AllOpponentsLost
player turns   = 15 (round 8)
frames         = 175 state, 1316 log line(s) including the session header
ask kinds      = [order, choose_list]
UNIMPL members = none
members fired  = 19 of 37
REVEAL count   = 0
events dropped = 0
unzoned cards  = 0
emit errors    = 0
ws connections = 1 accepted, 0 refused (one client at a time)
ws frames      = 1129 written, 0 emitted with nobody connected, 189 read
game wall time = 29304 ms
MTGTABLE OK
```

A 15-turn game, 1,316 log lines, **zero** `UNIMPL`, **zero** emit errors, exactly
one `over` and `over` last, with the `gameOver` snapshot in front of it, and
**19 of the 37** members fired (M2's corpus reached 22 across every game it
recorded; this one game reaches 19, `finishGame` among them). The seat log
through the redaction gate:

```
PASS  var/games/check-all-ws-auto/frames.jsonl
      frames=1315 (state=175, other=1140)  bytes=1656371  events=526
      cards checked=3649  redacted=826  face-down=0  stack cards=27
      opponent-hand cards=826  viewer-hand named=780
      engine strings=48, concealed=0, none joinable to a card concealed in the same frame
      A6 ever-revealed ids=27  library cards revealed=0  alt blocks=0  tokens=0  asks=3
      A12 answers=3 (kinds: choose_list, order), unanswered asks=0
      notices=111 (both strings swept and scanned)  over frames=1
```

**826 opponent hand cards, every one of them the five-key stub.** The redaction
gate now runs on a recording made over a socket, which is the third bullet of
M3's "gate before this ships" list in PLAN.md.

`0 emitted with nobody connected` here because the client connects within a
second of `/health` answering. An earlier ad-hoc run of the same game, where the
server sat idle for a minute first, reported `4 emitted with nobody connected` —
and that is the line worth reading. The server binds before `startMatch`, so the
handshake and the first couple of frames can be produced before a client arrives.
They are in the log, they are not on the wire, and the client is caught up by the
cached re-delivery the moment it connects, which is the whole of contract (b).

---

## 9. `tools/check-all.sh` — now thirteen steps, and green

Step 10 is new and runs **three fresh ws servers**, each on port 8643 (not
`config.json`'s 8642, so the gate does not fight `scripts/play.sh` for a port):

| | client | asserts |
|---|---|---|
| 10a | `ws-smoke.mjs` | connect → resync → concede, no exception, one `over`, `over` last, log through `check-redaction.mjs` |
| 10b | `ws-smoke.mjs --disconnect-mid-ask` | the cancelAll test, then reconnect and finish; same four assertions |
| 10c | `ws-auto-play.mjs` | a whole game; same four, plus `UNIMPL members = none` and `emit errors = 0` |

Every server is started under the same `GAME_TIMEOUT` as the other JVM steps,
with `--keep-open` (which costs nothing: it returns the instant the client
disconnects, which all three do as soon as they have their `over`), waited for
with `wait` so the server's own exit code and `MTGTABLE OK` are part of the
assertion, and killed by an `EXIT` trap on any failure path. Readiness is
`GET /health`, polled with `node` — `curl` is not a dependency of this gate and
must not become one.

**10c skips loudly if `tools/ws-auto-play.mjs` is absent** rather than failing:
the file belongs to the browser agent, the bridge half of M3 is testable without
it, and a gate that goes red because another agent has not landed yet teaches
everyone to ignore the gate. It landed before this run, so 10c ran for real.

```
$ ./tools/check-all.sh
=== 1. check-forge.sh …            === 8. MtgTable --transport console …
=== 2. lint-bridge.sh …            === 9. MtgTable --transport auto --seed 11 …
=== 3. bridge/build.sh …           === 10. MtgTable --transport ws …   <- new
=== 4. Smoke …                     === 11. check-redaction.mjs …
=== 5. RecordMatch …               === 12. check-redaction-selftest.mjs …
=== 6. value-level drift …         === 13. web -- npm run build && npm test
=== 7. MtgTable --transport null …
…
check-all OK
```

Step 6 — the value-level drift diff of a fresh `RecordMatch` against
`fixtures/games/g1.jsonl` — is still byte-identical after the three
`WireGuiGame` edits, which is the check that the emitter changes in §6 touched
only the human-seat path. Step 13 runs 248 `node --test` assertions and 36
`vitest` ones, all green against the re-recorded fixtures.

---

## 10. What is not proven

1. **No browser has connected to this server.** Everything above is `node`
   clients. `web/src/transport/ws.ts` is written against the same contracts and
   `tools/ws-auto-play.mjs` speaks the same frames, but "Chrome renders a game"
   is the other half of M3 and it is not evidence this document can produce.
2. **`NO_CLIENT_ASK_TIMEOUT_MS` has never fired.** Every `ask` in every run here
   was answered by a connected client, so the 120 s no-client fallback is
   reasoned and reviewed, not measured. Reaching it needs an engine that asks a
   blocking question while nobody is on the socket, which the input path makes
   rare: Forge parks on its own `InputQueue`, not on our reply pool, for
   everything a mulligan or a priority pass needs.
3. **`cancelAll()` has never cancelled a *pending* ask.** Both disconnect runs
   logged `cancelling 0 pending ask(s)`: the socket was dropped at an `input`,
   because for these decks an `ask` window is a few milliseconds wide and the
   test cannot reliably land inside one. The path is one line and is shared with
   `ConsoleTransport`'s EOF, which M2 did exercise — but the specific sequence
   "drop the socket while a game thread is parked on `ReplyPool.await`" has no
   run behind it.
4. **Two clients racing the handshake.** The refusal is decided on the event
   loop, which serialises it, so the race is closed by construction rather than
   by a test; nothing has tried to open two sockets in the same millisecond.
5. **The 1 MB `HttpObjectAggregator` cap.** No request has come close, and the
   cap only bounds the *handshake* — websocket frames are not aggregated by it.
   A `state` frame in the game above was up to ~30 kB and the biggest committed
   fixture line is larger still; if a frame ever needs a cap it is
   `WebSocketServerProtocolHandler`'s own `maxFrameSize`, which is left at
   netty's default.
6. **Nothing under `~/.forge` or `~/forge` changed** — asserted the way
   `CLAUDE.md` says to, before and after the whole of this document's work
   (§11).

---

## 11. The user's Forge install is untouched

```
$ find ~/.forge ~/forge -newermt '2026-09-11 19:30'
(nothing)

$ sha1sum $(find ~/.forge -type f) | sha1sum
a1896e316dae5f23f80ad8f7950f0a663cebea31  -
```

The `find` is the proof and the digest is the record: **no file under either tree
has an mtime later than the start of this session**, so nothing in it was
written, and the digest above is what a later session should get back. (A
before-digest would have been better and was not taken; the mtime check is what
was actually run, and it is the check `CLAUDE.md` asks for.) Nothing under the
user's real Forge home has been written, moved or renamed —
including `~/.forge/decks/Pacho SHIELD (Marvel Super Heroes).dck`, the file hard
rule 4 exists for. Forge's profile is redirected into `var/` by
`forge-home/forge.profile.properties`, and every path `WsTransport` touches is a
socket.

---

## 12. The review pass — 2026-09-11, what changed after this document was written

An independent verifier ran the gate, drove the socket with three scripted
clients and a hand-written raw one, played in Chrome, and found eleven things.
Every one is closed; the six that changed the wire or the server are amendments
**M14–M19** in `docs/protocol.md`. What a reader of §1–§11 above must now read
differently:

| §  | What this document says | What is true after the review pass |
|---|---|---|
| 2, 5 | `GET /health` answers `200 ok` from the moment of bind, and that is what `scripts/play.sh` polls. | **503 `starting` until `hello_ok` exists**, 200 after (**M15**). The bind is ~1.2 s early, and a client that connected in that window was sent `input@1`, `notice@2`, `notice@3`, `hello_ok@4` — §2.1 inverted. A socket that still gets in during the window is now handed nothing; `openView`'s own three frames reach it in order. `WS LISTENING` is printed after `startMatch`. Measured on this build: one poll at `503 starting`, the next at `200 ok`. |
| 5.4 | `cancelAll()` on disconnect unparks every game thread. | It still does — and it **no longer latches the seat shut** (**M19**). Measured: a client that refused ask `a1` (`order`, `timeoutMs: 0`) and dropped the socket saw `a2` (`choose_list`) raised 7 ms later with **`timeoutMs: 120000`** — `NO_CLIENT_ASK_TIMEOUT_MS`, which was unreachable before — park for 9 s, and be answered by the reconnecting client. `var/games/fix-gap2-13/frames.jsonl`: 3 asks, `a1` unanswered (§5.4 at the drop), `a2` and `a3` answered. |
| 8 | "the whole frame stream, both directions, is written to `var/games/<id>/frames.jsonl`". | True now (**M16**): a client `resync` is a `c2s` line, including the implicit one a (re)connect performs. Before, a resync-driven `input` appeared with no cause. A frame the socket re-delivers verbatim is still *not* re-logged, and §8.2 says so. |
| — | The pipeline is `HttpServerCodec → HttpObjectAggregator(1 MB) → ChunkedWriteHandler → Health → WebSocketServerProtocolHandler("/ws") → WsHandler`. | A `WebSocketFrameAggregator(1 MB)` sits after the protocol handler and the protocol handler's own frame size is stated rather than inherited from netty's 64 KB default (**M18**). Every dropped inbound frame now answers with an out-of-band `notice`, so a client whose frames are being discarded is told. |
| — | `getAbilityToPlay` returns `null` off the game thread; `ability_menu` has never been dispatched. | That `null` made a card with two or more abilities **unplayable from any client, silently**. The menu is asynchronous now (**M14**) and the kind has engine evidence: 7 asks in `fixtures/games/human-auto-42.jsonl`, 1 in the browser session below, each answered, each followed by Forge's own `Pay Mana Cost` prompt. |

Two more, neither on the wire: `Transport.Inbound.onResync` now asserts its two
threads like its three siblings (it emits a frame, and it was the only one of the
four with nothing to catch a caller on the game thread or the EDT), and
`tools/check-redaction.mjs` grew a `--client-log` mode — auto-detected from the
new `recordedBy` header key (**M17**) — so that running the repo's own checker
over the repo's own documented `--log` output no longer exits non-zero on five
`gap or reorder` lines with every content assertion passing. `tools/check-all.sh`
runs that combination now.

---

## 13. The fix pass — 2026-09-11, after a second verification

A second independent verifier ran the gate from a wiped `bridge/out`, drove the
socket on three unused seeds, raced a client at a booting server, sampled
`/proc/<pid>/task/*/comm` on a live game, played in Chrome, and returned three
majors and seven minors. All ten are closed here. Two of the majors are **rules
this repo had written down as guarantees and was not keeping**, which is the
class of defect that costs the most later, because the next reader builds on the
sentence rather than on the code.

### 13.1 The pre-`hello_ok` window was open from the inbound side (major) — M20 / D23

M15 closed the connect path and §2.1 duly claimed the window was closed "from
both ends". It was not. M15 suppressed only the connect-time `resend`; a c2s
frame that **arrived** in the window was still dispatched, and its answer went
out ahead of the handshake. Reproduced twice from scratch, retrying the connect
every 20 ms against a booting server (`var/verify/m3fix-race.mjs`, kept):

| c2s frame sent in the window | before | after |
|---|---|---|
| `act clickCard` | `notice@seq1` ("Not yet"), then `hello_ok@seq2` | `hello_ok@seq1`, `state@seq2`, `input@seq3`; the act is dropped, `WS PRE-SESSION c2s frame dropped (a text frame)` on stderr |
| `resync` | `input@seq1`, then `hello_ok@seq2` — byte for byte the inversion M15's own row quotes as the bug | identical to the row above |

Both probes now pass 7/7 checks each, including "no session frame carries a
`seq` below `hello_ok`'s", and the frame log agrees: line 1 (after the header)
is `hello_ok seq=1`, line 2 is `state seq=2`. Both sessions still reach `over`
and the server still exits 0 with `MTGTABLE OK`. The summary line gained a
fourth number:

```
ws frames      = 6 written, 0 emitted with nobody connected, 1 read, 1 read before the session existed (amendment M20)
```

The fix is `WsHandler.admitted()` — every inbound frame, text or binary, is
dropped with **no reply** while `lastHello == null` — plus the same guard at the
top of `resend()`, so the invariant does not depend on `handshake()` being its
only caller. No reply, because the reply *is* the bug: M18's `dropped()` notice
would itself be a pre-handshake frame, and the `act` row above is exactly that
notice. Nothing is lost: `openView`'s `hello_ok` + `state` + `input` reach the
channel in order, which is all a `resync` in the window could ask for.

It was reachable from this repo's own documented commands — `tools/ws-smoke.mjs`
and `tools/ws-auto-play.mjs` both send `resync` from their `open` handler — and
only the `/health` poll inside `tools/check-all.sh` and `scripts/play.sh` kept
the gate from ever seeing it.

### 13.2 The asynchronous `ability_menu` walked the view graph with nothing enforcing exclusion (major) — D22

M14 hands the menu body to `ThreadUtil.invokeInGameThread` and the javadoc said
the walk was safe because "the real game thread is parked inside
`InputSyncronizedBase.showAndWait`". True at submit time; nothing checked it at
run time. The pool is
`Executors.newCachedThreadPool(new WorkerThreadFactory("Game"))` and `Game-0` is
running the match, so the body is built on a **second** `Game-n` thread — the
verifier sampled `/proc/<pid>/task/*/comm` once a second for 12 s of a
`--transport auto --seed 23` game (17 `ability_menu` asks) and saw `Game-0` and
`Game-1` both live throughout. Hard rule 3's mechanical check
(`getName().startsWith("Game")`) passes for both, so the property it protects had
nothing enforcing it on a per-click path.

The fix is an input generation (`WireGuiGame.inputGen`, bumped in
`mutateInput`): the menu is stamped with the generation of the input it was
raised for, and `emitAbilityMenu` returns **before touching a view** if the
generation moved (and drops the finished frame if it moves during the build).
It is sound rather than lucky because of Forge's own order:
`InputSyncronizedBase.stop()` runs `onStop()` → `InputPassPriority.onStop` →
`PlayerControllerHuman.clearActionableCards` → `IGuiGame.clearWeaklySelectable`
— one of our `engineInput` calls, and therefore a generation bump — **before**
`cdlDone.countDown()` frees the game thread. Full reasoning, and the rejected
alternatives, in **D22**.

Cost, measured: re-recording all five committed human-seat fixtures with the
check in place produces **zero** `ABILITY MENU STALE` lines and the same seven
`ability_menu` asks in `human-auto-42` (six in `human-auto-7`). The check has
never fired outside a deliberate double click.

### 13.3 An ask could park forever with no peer (minor)

`WireGuiGame.ask` reads `transport.askTimeoutMs(kind)`, then serialises the whole
ask body, then parks — and a disconnect inside that gap left a 0 (infinite)
deadline with `cancelAll()` already run against an empty pool. Never observed;
found by reading. `WsTransport.ask` now **recomputes the deadline at the point of
parking** (`pool.await(askId, connected() ? timeoutMs : NO_CLIENT_ASK_TIMEOUT_MS)`)
and says so on stderr when the two differ. The `timeoutMs` already on the wire is
left alone: it is what the client was told, and a frame is not rewritten after it
is sent.

### 13.4 `cancelAll()` with a real pending ask is now in the gate (minor) — step 10d

Both committed disconnect tests printed `cancelling **0** pending ask(s)`:
`ws-smoke --disconnect-mid-ask` settles for "an `ask` **or** an `input` with OK
enabled", and in every deck here the input comes first. So the defect M19 was
written for had no coverage at all.

`tools/ws-auto-play.mjs --refuse-first-ask` drops the socket on the first `ask`
**frame** and reconnects (`--reconnect-after`, default 5 s). It lives there and
not in `ws-smoke` because reaching an ask at all needs a client that can play a
game — every ask in these decks is downstream of an act — and a second copy of
the policy in `ws-smoke` would be a policy that can drift from
`AutoTransport`'s. `tools/check-all.sh` step 10d runs it as a fourth ws server
and asserts the server's own line.

Measured at the gate's seed 13 (`var/games/check-all-ws-refuse/frames.jsonl`,
one file):

```
WS DISCONNECT /127.0.0.1:… -- cancelling 1 pending ask(s)
a1  order        timeoutMs 0        cancelled at the drop; NO `answer` line (§5.4)
a2  choose_list  timeoutMs 120000   raised 7 ms later, with nobody connected
                                    re-delivered verbatim to the reconnecting client and answered
a3  choose_list  timeoutMs 0
```

no `ASK TIMEOUT` line, `emit errors = 0`, exactly one `over`, `over` last,
`check-redaction.mjs` PASS on both the bridge log and the client's. That is
**M19's row, reproduced by a committed tool** — the thing the verifier correctly
said no committed tool could do. The client log is deliberately kept out of
`MTGTABLE_WS_LOGS`: `ws-log.test.ts` requires every ask in a *client* log to
carry an answer, and this client refuses one on purpose.

**The 120 s cap itself is still never reached.** Whether the disconnected window
catches an ask at all is a property of the seed — at seed 13 it does, at seed 17
the next ask is raised after the reconnect and carries `timeoutMs: 0` — so step
10d *reports* that half instead of asserting it, and the M19 row now says so.
`NO_CLIENT_ASK_TIMEOUT_MS` is a deadline that has been set and never hit.

### 13.5 Fixture drift, measured properly (minor)

The verifier measured four of five human fixtures re-recording byte-identically
after normalisation and only `human-trample-7` differing, and concluded the
corpus was mostly deterministic. Re-recording all five on this build, twice for
`human-auto-42`, gives a different and more useful picture:

| fixture | fresh lines | fixture lines | normalised diff lines | what differs |
|---|---|---|---|---|
| `human-auto-7` | 1304 | 1304 | 0 | — |
| `human-auto-2026` | 927 | 927 | 0 | — |
| `human-scry-7` | 985 | 985 | 0 | — |
| `human-auto-42` | 1588 | 1588 | **0, then 8, then 8** over three runs | the `seq` assignment of **the same three frames** at the mulligan — one `state` from the game thread against two `input`s from the EDT. The multiset of frames with `seq` removed is **identical** (checked). |
| `human-trample-7` | 1154 | 1156 | 431 | **two `input` frames**, and nothing else: every other frame type matches exactly (state 170, act 160, notice 106, ask 6, answer 6, over 1). Forge's `awaitNextInput()` re-pushes the same prompt every 250 ms while it thinks, so the count of identical re-pushes is wall-clock. The probe property survives: 1 `assign_damage`. |

So: **all five are stable in content; none of them is reliably stable in byte
order**, and `human-auto-42` is not the stable one the earlier measurement made
it look — it happened to match on that run. This is §8.7's documented thread
interleaving, not drift.

The consequence for the gate is the opposite of the obvious one: a byte-level
normalised drift diff over the human fixtures would be **flaky** (measured: 2 of
3 runs of `human-auto-42` differ), so it is not added as a check-all step. What
*would* be sound is an order-insensitive comparison — the multiset of frames with
`seq` stripped, which is identical for `human-auto-42` and differs for
`human-trample-7` only by two known re-pushes — and that is the shape any future
attempt should take. The re-record harness used here is kept at
`var/verify/m3fix-rerecord.sh`. The AI-vs-AI `g1.jsonl` diff in step 6 is
unaffected: it has no seat, no EDT pushes and no `awaitNextInput`, and it has
been byte-identical every time.

### 13.6 Doc drift inside the code (minor)

`oob()`'s javadoc still said "there are exactly two" seq-0 frames after M18 added
a third, twelve lines above its own caller. It names all three now, and the
fourth case — a frame dropped before the session exists, which gets **no** reply
— with the amendment numbers.

### 13.7 The gate, after all of it

`rm -rf bridge/out && ./tools/check-all.sh` — thirteen steps, now with a fourth
ws server in step 10. Green. The numbers are in §9 above; the only structural
change is 10d.

---

## 14. Status — 2026-09-11, after the documentation pass

No code changed in this pass: `PLAN.md`, `README.md`, `DECISIONS.md`,
`CLAUDE.md`, `docs/research/07-wireguigame-spec.md` and the two M3 evidence files
are the whole diff. The gate was run **once**, at the start of the pass, over
exactly the `bridge/`, `web/`, `tools/`, `scripts/` and `fixtures/` tree these
documents describe — none of which this pass touched, and none of which
`check-all.sh` reads from a `.md` file.

```
$ ./tools/check-all.sh
…
check-all OK
WALL 163.23 s
EXIT=0
```

**Exit 0, 163.2 s (2 m 43 s), thirteen steps.** Full output:
`var/check-all-doc-pass.log`.

### 14.1 What step 10 measured this time (seed 13, port 8643)

| | client | result |
|---|---|---|
| 10a | `ws-smoke.mjs` | `hello_ok → state → input`, `c2s resync`, state + input again, `act concede`, `over winner=1 AllOpponentsLost`. `PASS var/games/check-all-ws-smoke/frames.jsonl` — 12 frames, 14 opponent-hand cards, all stubs |
| 10b | `ws-smoke.mjs --disconnect-mid-ask` | dropped at a live `input`, reconnected, `hello_ok` again, reached `over`. `PASS …/check-all-ws-drop/frames.jsonl` — 11 frames |
| 10c | `ws-auto-play.mjs` | a whole 15-turn game: 1,318 frames (176 `state`), 183 acts, 3 asks all answered, `UNIMPL members = none`, `ws connections = 1 accepted, 0 refused`, `0 read before the session existed` (M20). **833 opponent-hand cards, every one the five-key stub.** The client log passes too, in `--client-log` mode (M17), with its 2 verbatim re-deliveries named as M10 rather than as drops |
| 10d | `ws-auto-play.mjs --refuse-first-ask` | dropped the socket **on the first `ask` frame**: `WS DISCONNECT /127.0.0.1:39936 -- cancelling 1 pending ask(s)` (`var/check-all-ws-refuse.log:40`), reconnected, finished the game. `OK: an ask raised while nobody was connected carried timeoutMs=120000 (NO_CLIENT_ASK_TIMEOUT_MS, M19)`. The recording keeps 1 unanswered ask, which is `cancelAll()` doing its job and is a documented warning rather than a failure |

### 14.2 §10 "What is not proven", re-read

| § | claim | status now |
|---|---|---|
| 10.1 | no browser has connected to this server | **closed** — the web half played real browser sessions against it three times (`m3-web.md` §2, §3, §11); the last one ended by conceding in Chrome |
| 10.2 | `NO_CLIENT_ASK_TIMEOUT_MS` has never fired | **still open.** Step 10d proves the cap reaches the *wire* (`"timeoutMs":120000`); whether a no-client window catches an `ask` is seed-dependent, so the gate reports it rather than asserting it. PLAN.md M3 follow-up 1 |
| 10.3 | `cancelAll()` has never cancelled a *pending* ask | **closed** — step 10d, quoted above, and the gate now `die`s if that line is missing |
| 10.4 | two clients racing the handshake | **unchanged** — still closed by construction (the refusal is decided on the event loop, which serialises it), not by a test. **D25** |
| 10.5 | the 1 MB `HttpObjectAggregator` cap | **unchanged** — it bounds the handshake only; `maxFrameSize` is still netty's default while a `state` frame runs to ~30 kB |
| 10.6 | nothing under `~/.forge` or `~/forge` changed | **re-checked after this gate run.** `find ~/.forge ~/forge -newermt '2026-09-11 22:55'` → nothing, and `sha1sum $(find ~/.forge -type f) \| sha1sum` is still `a1896e316dae5f23f80ad8f7950f0a663cebea31` — byte for byte the digest §11 recorded |

### 14.3 Where the open items live now

The socket half's remaining gaps are items **1, 2, 5, 6, 7, 8 and 10** of
**PLAN.md → M3 → M3 follow-ups**, which is the single list to read; the decisions
this document argued for are now written down as **D24** (the ask timeout is the
connection's liveness), **D25** (one client at a time, 4001), **D26** (the
`transport` header key stays optional) and **D27** (resync semantics), alongside
**D20–D23** from the two verification passes.

### 14.4 One sentence in §4.2 predates amendment M19

§4.2's closing paragraph says `ReplyPool.reopen()` lifts the latch and
"**`WsTransport`'s handshake is the only caller**". That was true when it was
written and is not true now: the review pass moved the lift into
`WsHandler.channelInactive`, immediately after `onDisconnect()`, precisely so an
ask raised *while nobody is connected* parks (up to
`NO_CLIENT_ASK_TIMEOUT_MS`) and is re-delivered on reconnect instead of resolving
to its §5.4 default the instant it is raised — amendment **M19**, and the
handshake's own `reopen()` is now belt and braces. The rest of the paragraph
still holds, and it is the half a player feels: **an ask that was outstanding at
the moment of the drop is cancelled and takes Forge's documented default, and
that cannot be undone.** The text above is left as it was recorded; this is the
correction.
