# M3 follow-ups 5 and 7 — evidence

Dated 2026-09-11. Two of the eleven items under **"M3 follow-ups — open"** in
`PLAN.md`, both of them pure tooling: no change to `bridge/` and none to `web/`.
Everything below is a measurement, a control or a command line.

| # | `PLAN.md` follow-up | Status |
|---|---|---|
| 5 | *"Amendment M11's exception path has never been observed. … A gate step that concedes from the `open` handler before any `input` would close it."* | **done** (§1) — `tools/ws-smoke.mjs --concede-before-input`, asserted as step **10e** of `tools/check-all.sh`. Observed 9 times out of 9 attempts. |
| 7 | *"Fixture drift has no gate step, deliberately. … The sound shape is order-insensitive: the multiset of frames with `seq` stripped. Nobody has written it."* | **done** (§2) — `tools/fixture-multiset-diff.mjs`, wired as the **advisory 9b** of `tools/check-all.sh`. |

Files changed: `tools/ws-smoke.mjs`, `tools/check-all.sh`, and the new
`tools/fixture-multiset-diff.mjs`. `bridge/` and `web/` untouched.

Green gate, three times: `./tools/check-all.sh` → `check-all OK`, exit 0, at
**3 m 22 s**, **3 m 19 s** and **3 m 30 s** (`var/verify/m3f/check-all-2.log`,
`check-all-3.log`, `check-all-4.log`).

---

## 1. Follow-up 5 — amendment M11's exception path, measured

### 1.1 What had to be true to reach it

`docs/protocol.md` amendment **M11** says `over` follows the `state` that carries
`gameOver` on every path where Forge published an outcome, **and names one path
where it does not**: a concede *before the engine has asked this seat for
anything*. `applyAct`'s pre-`inputSeen` guard
(`WireGuiGame.java`, `if (!ready || !inputSeen)`) ends the session without
entering Forge's game-over at all, so there is no outcome to snapshot and no
thread on which building one would be legal — the act is dispatched on the EDT.
`over` then carries `{winner: null, reason: null, matchOver: true}`, nothing
precedes it, and the bridge prints `OVER WITHOUT A gameOver STATE` on stderr.

Two constraints make that a narrow window rather than a free choice:

* **You may not send too early.** Amendment **M20** drops any c2s frame that
  arrives before the session exists, *in silence* — answering it would put an
  s2c frame ahead of `hello_ok`. A concede written from the `open` handler
  proper is therefore thrown away, and the test would hang rather than measure.
* **You may not arrive too late.** `GET /health` answers `ok` only once
  `openView` has emitted `hello_ok` (amendment **M15**), which is the *start* of
  the window, and `check-all`'s health poll sleeps a second at a time.

So the mode connects on a retry loop *before* the session exists — the case
`WsTransport` handles by name (`WS CONNECT before the session exists -- no
resend`) and which nothing else in the gate reaches — sends nothing until
`hello_ok`, and then writes the concede from inside the frame handler,
synchronously, on the same turn of the event loop.

### 1.2 The window, measured

A probe that connected early and timed the first engine frames against
`hello_ok` (seed 13, `var/verify/m3f/probe-win.server.log`):

```
state  +150 ms after hello_ok
INPUT  +153 ms after hello_ok  prompt=""
INPUT  +153 ms after hello_ok  prompt="Forge AI is going first.\nHuman, you are going 2nd..."
```

Against that, `hello_ok` → concede measured **0–3 ms** across every run below;
the gate's own run printed `concede written 1 ms after hello_ok`. The margin is
roughly **50×**, which is why this is a test and not a coin flip — and why
`ws-smoke` distinguishes "the window was missed" from "the bridge is wrong" in
its failure text.

### 1.3 What the bridge did

```
$ node tools/ws-smoke.mjs --port 8643 --timeout 120 --concede-before-input
ws-smoke: concede from the handshake handler, before any input, at ws://127.0.0.1:8643/ws
  open     (before GET /health says `ok`, which is the point)
  s2c  hello_ok
  c2s  act concede
  s2c  over    winner=null reason=null matchOver=true
  concede written 1 ms after hello_ok, with 0 state/input/ask frame(s) in front of it
ws-smoke OK: a concede written from the `hello_ok` handler, before any input, ended the
session with `over {winner: null, reason: null, matchOver: true}` and no `state` in front
of it (amendment M11)
```

Server stderr, in order:

```
WS CONNECT /127.0.0.1:… (connection #1)
WS CONNECT before the session exists -- no resend; hello_ok + state + input follow from openView
WS LISTENING ws://127.0.0.1:8643/ws
CONCEDE BEFORE START: ending the session
OVER WITHOUT A gameOver STATE: the game ended before Forge published an outcome (protocol amendment M11)
```

Server summary:

```
finished       = true
frames         = 0 state, 4 log line(s) including the session header
members fired  = 2 of 37 [updateCurrentPlayer, openView]
ws connections = 1 accepted, 0 refused (one client at a time)
ws frames      = 2 written, 0 emitted with nobody connected, 1 read, 0 read before the session existed (amendment M20)
game wall time = 95 ms
MTGTABLE OK
```

`members fired = 2 of 37` is the sharpest statement of the property: neither
`showPromptMessage` nor `updateButtons` ever ran, so the engine had not asked
this seat for anything, which is precisely the condition `inputSeen` records.

The whole frame log, four lines (`var/games/check-all-ws-m11/frames.jsonl`):

```jsonc
{"v":1,"kind":"session","gameId":"check-all-ws-m11","startedAt":"…","seed":13,…}
{"v":1,"seq":1,"t":…,"dir":"s2c","type":"hello_ok","body":{…}}
{"v":1,"seq":1,"t":…,"dir":"c2s","type":"act","body":{"action":"concede"}}
{"v":1,"seq":2,"t":…,"dir":"s2c","type":"over","body":{"winner":null,"reason":null,"matchOver":true}}
```

**The bridge behaves exactly as M11 documents.** Nothing under `bridge/` was
changed, and nothing needed to be.

### 1.4 Repeatability, and the negative control

| run | seed | result |
|---|---|---|
| `probe-cbi` (hand-written probe) | 13 | `winner null`, `OVER WITHOUT A gameOver STATE`, 0 states |
| `probe-cbi2` (`ws-smoke`) | 13 | same |
| `probe-cbi-r1/r2/r3` | 14 / 15 / 16 | same, three for three |
| `check-all` step 10e, four gate runs | 13 | same |

Nine attempts, nine observations of the branch, at four seeds.

The **negative control** is the same mode run *late* — server started, six
seconds of sleep, then connect — so the engine has long since armed `inputSeen`
(`var/verify/m3f/probe-late.server.log`):

```
  s2c  over    winner=1 reason="AllOpponentsLost" matchOver=true
ws-smoke FAILED: amendment M11 says a concede before the first input ends with winner: null;
this `over` carried winner: 1 — which is the ordinary path, so the concede reached Forge
after all
rc=1        # and `grep -c 'OVER WITHOUT A gameOver STATE'` on the server log = 0
```

So the assertion is not vacuous: it distinguishes M11's branch from the ordinary
one, and it is the ordinary one that 10a and 10b have always taken
(`winner=1 reason=AllOpponentsLost`).

### 1.5 What step 10e asserts

`ws-smoke` asserts the **client's** half: no `state`/`input`/`ask` in front of
the concede, `winner: null`, `reason: null`, `matchOver: true`, and zero `state`
frames received at all. `check-all` asserts the **server's** half:

* `OVER WITHOUT A gameOver STATE` on stderr — *the* assertion of this step;
* `CONCEDE BEFORE START: ending the session`, i.e. the pre-`inputSeen` guard;
* no `"gameOver":{` anywhere in the frame log;
* `, 0 read before the session existed` — this is the only step that connects
  inside amendment M20's window on purpose, so it doubles as M20's live check
  that a well-behaved client sends nothing there;
* the ordinary ws assertions: server exit 0, `MTGTABLE OK`, exactly one `over`,
  `over` last, `WS LISTENING`.

**`check-redaction.mjs` is deliberately not run on this log**, and that is the
one wrinkle worth writing down. The checker treats *"no state frames at all"* as
a failure, and its two "this file proves nothing" assertions are downgraded to
warnings only for a `preGameOnly` session, which it defines as
`stats.state > 0 && stats.maxTurn === 0` — a four-line session has
`stats.state === 0` and fails all three. That verdict is correct on its own
terms: a file with no `state` in it proves nothing about redaction. So the step
asserts the stronger thing directly — *the only s2c frames are `hello_ok` and
`over`*, therefore not one card was serialised — and falls back to
`check-redaction.mjs` in the branch where the game thread does land a turn-0
snapshot before the session closes (never observed in seven runs; the counter in
the summary shows the snapshot being *built* and dropped by the already-closed
log). Widening the checker's `preGameOnly` to include "no state frames, and the
session is four lines long" would be a reasonable follow-up for whoever owns
`tools/check-redaction.mjs`; it is not something this pass should do silently.

---

## 2. Follow-up 7 — `tools/fixture-multiset-diff.mjs`

### 2.1 The shape the follow-up asked for

`docs/evidence/m3-ws.md` §13.5 measured all five human-seat fixtures as stable
in *content* and none of them reliably stable in *byte order* — `human-auto-42`
re-recorded with 0, then 8, then 8 differing lines, always the same three frames
(one `state` from the game thread against two `input`s from the EDT) reordered.
Its conclusion: a byte-level drift step would be flaky, and *"what would be sound
is an order-insensitive comparison — the multiset of frames with `seq` stripped
… that is the shape any future attempt should take."*

That is this tool.

```
node tools/fixture-multiset-diff.mjs <a.jsonl> <b.jsonl>
        [--only-dir s2c|c2s] [--strip key]... [--sort-keys] [--limit 12] [--quiet]
```

* Per-run values replaced at any depth before comparing: **`seq`, `t`,
  `startedAt`, `gameId`** — the same four `check-all`'s step-6 normaliser
  removes, and nothing else. `forgeJarSha256`, the deck sha256s, `seed`,
  `transport` and every value inside every card stay exactly as the emitter
  wrote them: those *are* the wire.
* **Key order inside an object stays significant** by default (`--sort-keys`
  relaxes it). `Snap.java` writes a fixed key order and hard rule 10 makes that a
  promise; a comparison that sorted keys would stop being able to see it break.
* Output: a per-type table always, then each surplus frame with its count on
  both sides, its first line number, an 8-char digest, and — when a frame on one
  side pairs with a near-twin on the other — **the first differing character,
  windowed**. A 5 kB `state` frame that differs in one card's power is otherwise
  indistinguishable in any excerpt short enough to print.
* Exit **0** identical, **1** any difference, **2** bad usage.

### 2.2 Controls

| control | expected | got |
|---|---|---|
| a file against itself | identical, rc 0 | `MULTISET IDENTICAL: 1588 frame(s)` |
| the same file with its lines **shuffled** (`shuf`) | identical, rc 0 | `MULTISET IDENTICAL: 1588 frame(s)` — this is the order-insensitivity claim, tested |
| one line deleted (`awk 'NR!=200'`) | rc 1, one frame short | `- 1x input [9d7f4dee] … (A×26, B×25)` |
| one card's `power` changed `3`→`9`, 2.6 kB deep in a `state` | rc 1, and *shown* | see below |
| two different fixtures (`human-auto-7` vs `human-auto-2026`) | rc 1, large | `1051` / `674` frame instances, 332 / 289 distinct |

The mutated-value control is the one worth printing in full, because it is the
kind of drift a shape checker cannot see:

```
  - 1x state  [395ebf3a]  first at var/games/drift-probe-42/frames.jsonl:147  (A×1, B×0)
      pairs with [7745c53a]; first difference at character 2623:
        A: …es":"Creature - Human Scientist Villain","power":"3","toughness":"3","loyalty":null,…
        B: …es":"Creature - Human Scientist Villain","power":"9","toughness":"3","loyalty":null,…
```

### 2.3 The real measurement: seven re-recordings of `human-auto-42`

Command (the fixture's own): `mtgtable.MtgTable --transport auto --seed 42`.

| run | frames | multiset (all) | multiset (`--only-dir s2c`) |
|---|---|---|---|
| `drift-probe-42` | 1588 | identical | identical |
| `check-all` 9b, run 1 | 1588 | identical | identical |
| `check-all` 9b, run 2 | **1587** | **differs: 1 frame** | **identical** |
| `drift-run3` | 1588 | identical | identical |
| `drift-run4` | 1588 | identical | identical |
| `check-all` 9b, run 3 | **1587** | **differs: the same 1 frame** | **identical** |
| `check-all` 9b, run 4 | 1588 | identical | identical |

The single difference, in full:

```
  frames by type      A       B   delta
  act               215     214      -1        (every other type: delta 0)

  1 frame instance(s) in A only, over 1 distinct frame(s):
  - 1x act  [78cbcd3e]  first at fixtures/games/human-auto-42.jsonl:11  (A×46, B×45)
      {"v":1,"seq":"<per-run>","t":"<per-run>","dir":"c2s","type":"act","body":{"action":"buttonCancel"}}

  every differing frame (1) is dir=c2s — the seat's own acts and answers. That is a POLICY
  difference (what the client did), not a wire difference: nothing the emitter wrote changed.
```

In stream order the fixture has **two** consecutive `buttonCancel` acts against
one prompt at line 1316–1317 where the fresh run sent **one**. That is
`AutoTransport`'s policy (`out of ideas, OK is disabled → Cancel`) meeting
Forge's `awaitNextInput()`, which re-pushes the same prompt every 250 ms while
it thinks: **how many acts land on one prompt is wall-clock**. It is the same
instability §13.5 measured on `human-trample-7`'s two extra `input` frames, seen
from the client side, and it can subtract as well as add.

**The emitter's half — 1357 `dir: "s2c"` frames plus the session header — was
identical in all seven runs, including the two whose totals differed.** That is the result that matters: the wire has not
drifted, and now there is a check that can say so without being flaky about
frame order. It is also why the tool grew `--only-dir`, and why the gate runs the
s2c-only comparison as its second question when the full one differs.

### 2.4 How it is wired: step 9b, advisory

`check-all.sh` gains **9b** (an unnumbered sub-step of step 9, so the gate is
still thirteen numbered steps): re-record seed 42 with `--transport auto`,
compare against `fixtures/games/human-auto-42.jsonl`, and print one of three
things.

* identical → `OK: fixtures/games/human-auto-42.jsonl re-records to the same
  multiset of frames (order ignored)`;
* differs, but `--only-dir s2c` is identical → a loud advisory saying **the wire
  did not change** and naming the wall-clock cause;
* differs in `dir: "s2c"` → a loud advisory saying it reaches the emitter's own
  output, which is the finding the check exists to produce.

None of the three is an exit code. `DRIFT_FATAL=1` makes an advisory fatal for
someone who wants that; `SKIP_DRIFT=1` skips the ~31 s re-recording. A crash in
the re-recording is *also* advisory, because step 9 already proves a fresh
`--transport auto` game finishes (at seed 11) and a second copy of that
assertion is not worth a red gate.

Two of the four gate runs in this pass took the middle branch: the advisory
fired for real, loudly, and the gate still exited 0 — which is the behaviour
being claimed here, observed rather than asserted.

---

## 3. Cost

| | before | after |
|---|---|---|
| `check-all.sh` wall time | ~2–4 min (CLAUDE.md) | **3 m 19–30 s** green, measured three times |
| ws servers in step 10 | four | **five** |
| JVM games in the gate | seven | **nine** (9b's re-record, 10e's server) |
| new dependencies | — | none |

`GAME_TIMEOUT` covers both new JVM steps: 9b runs under `jvm()`, and 10e's
server is started by `ws_start` under the same `timeout --kill-after=15s`.

---

## 4. Commands, for reproduction

```bash
# follow-up 5, on its own
./bridge/run.sh mtgtable.MtgTable --transport ws --seed 13 --port 8644 --keep-open &
node tools/ws-smoke.mjs --port 8644 --concede-before-input     # connect early; do NOT wait for /health

# follow-up 7, on its own
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 42 --game-id drift-42
node tools/fixture-multiset-diff.mjs fixtures/games/human-auto-42.jsonl \
     var/games/drift-42/frames.jsonl
node tools/fixture-multiset-diff.mjs fixtures/games/human-auto-42.jsonl \
     var/games/drift-42/frames.jsonl --only-dir s2c    # just the wire

# both, in the gate
./tools/check-all.sh                     # 9b is advisory; 10e is not
SKIP_DRIFT=1 ./tools/check-all.sh        # without the 31 s re-recording
DRIFT_FATAL=1 ./tools/check-all.sh       # with 9b as a hard check
```

Raw logs from this pass are under `var/verify/m3f/` (gate runs
`check-all-1.log`, `check-all-2.log`; probes `probe-win`, `probe-cbi*`,
`probe-late`, `drift-run3/4`).
