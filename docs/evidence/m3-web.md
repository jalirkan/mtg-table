# M3 evidence — the board is a client

What was actually run, on 2026-09-11, with real numbers. The **web half** of
milestone M3 of [`PLAN.md`](../../PLAN.md): `web/` swaps `LogReplayTransport` for
a WebSocket, the text board grows clicks, and the eleven ask kinds grow a form.
The Java half (`WsTransport`, `--transport ws`, `/health`) is the other builder's
and is evidenced separately; everything below ran against it.

Jar: `forge-gui-desktop-2.0.14-jar-with-dependencies.jar`, sha256
`3c0a7c385b9207e593fe149255e00d1cd7e556809f138568d07e3828b78e5dd9`,
`BuildInfo.getVersionString()` = `2.0.14-SNAPSHOT-08.08` (from the session
headers of the runs below).

---

## 0. What shipped

| File | Lines | What it is |
|---|---:|---|
| `web/src/transport/ws.ts` | 620 | `WebSocketTransport`: the §1 envelope, the client-side `seq`, reconnect with backoff, `resync` on reconnect, `ping`→`pong`, the red-banner path for drift, and an injectable socket so `node --test` can drive the whole state machine |
| `web/src/render/AskModal.tsx` | 1124 | all **eleven** ask kinds as a form, answering with ask-local indices; `defaultDraft` / `answerFromDraft` / `defaultAnswer` / `toggleChoice` are pure and exported, so the tests drive the same functions the buttons call |
| `web/src/render/Board.tsx` | 1283 | **edited**: `actions`, clickable cards and player names, the two engine buttons wired, an always-visible Concede, a toast strip, the §4.2 stall banner |
| `web/src/main.tsx` | 540 | **edited**: the mode switch (`?replay=` → replay, otherwise ws), the connection bar, Space/Escape, the page-scoped socket |
| `web/src/styles.css` | +300 | the M3 affordances |
| `tools/ws-auto-play.mjs` | 629 | the scripted socket seat — `AutoTransport`'s policy spoken over a socket, no dependencies |
| `scripts/play.sh` | 177 | check-forge → build → bridge → `/health` → vite, Ctrl-C stops both |
| `web/test/ws.test.ts` | 422 | 14 tests: the transport state machine against a stub socket |
| `web/test/ws-log.test.ts` | 297 | a recorded ws session replayed through `reduce()`; **every ask answered exactly once** |
| `web/test/ask-modal.test.tsx` | 271 | 20 tests: all eleven kinds mounted, each answerable with its default |

---

## 1. A full game over the socket, scripted (deliverable 4 + 7)

```
$ ./bridge/run.sh mtgtable.MtgTable --transport ws --port 8642 --seed 42 \
      --game-id m3-web-42 &
WS LISTENING ws://127.0.0.1:8642/ws
WS HEALTH    http://127.0.0.1:8642/health

$ curl -i http://127.0.0.1:8642/health
HTTP/1.1 200 OK
content-type: text/plain; charset=us-ascii
content-length: 2
ok

$ node tools/ws-auto-play.mjs --port 8642 --timeout 300 --log var/ws-auto-42.jsonl
[ws-auto      1ms] connecting to ws://127.0.0.1:8642/ws (timeout 300s)
[ws-auto     25ms] open
[ws-auto     27ms] HELLO game=m3-web-42 seat=0 seed=42 forge=2.0.14-SNAPSHOT-08.08 players=Human vs Forge AI
[ws-auto    178ms] ACT  buttonOk  <- "Human, you have won the coin toss.\n\nWould you like to play or draw?"
[ws-auto    739ms] ACT  clickCard {"cardId":38}  <- "Priority: Human\nTurn: 1 (Human)\nPhase: Main phase, precombat\nStack: Empty"
[ws-auto    899ms] ACT  clickCard {"cardId":35}  <- "…Main phase, precombat…"
[ws-auto    900ms] NOTE warn "Not selectable" "card 35 cannot be selected now"
…
[ws-auto  34960ms] ANSW order a7 = {"ordered":[0],"remember":false}  <- "Select order for replacement effects"
[ws-auto  34963ms] ANSW choose_list a8 = [0]  <- "Choose a color"
[ws-auto  36445ms] OVER winner=1 reason=AllOpponentsLost matchOver=true
[ws-auto] frames in 1368, out 236 · states 230 · inputs 976 · acts 226 · asks 8 answered 8 ·
          notices 152 · ask kinds choose_list,order · 36.4s
[ws-auto] OVER — exit 0
$ echo $?
0
```

The server's own summary for the same session:

```
finished       = true
winner         = Forge AI, reason = AllOpponentsLost
player turns   = 22 (round 11)
frames         = 228 state, 1603 log line(s) including the session header
ask kinds      = [choose_list, order]
UNIMPL members = none
emit errors    = 0
ws connections = 1 accepted, 0 refused (one client at a time)
ws frames      = 1368 written, 4 emitted with nobody connected, 236 read
game wall time = 43544 ms
MTGTABLE OK
```

`var/ws-auto-42.jsonl` is 2.7 MB, 1,605 lines: a §8.1 session header built from
`hello_ok` (`transport: "ws"`, `seed: 42`, `seat: 0`, `decks: []` — a client is
never told the deck paths, and inventing entries would put a shape on disk no
bridge produced), then 1,604 frames with `dir`, both directions.

**Failure paths.** `node tools/ws-auto-play.mjs --port 8699 --timeout 5` against
nothing at all:

```
[ws-auto     17ms] FAIL socket closed (1006) before `over`
[ws-auto] FAILED: socket closed (1006) before `over`
$ echo $?
6
```

**Amendment M8, re-measured on a socket session.** Of the 86 `clickCard` acts in
`var/ws-auto-42.jsonl`, **78 name an id that is absent from the preceding
`input.selectable.cardIds`** — the same 78/86 the protocol's M8 row measured on
`human-auto-42.jsonl`, because it is the same policy at the same seed, now spoken
over a socket. 5 of them came back as `notice{level:"warn", title:"Not
selectable"}`. A board that gated the click on `selectable` could not play a
land.

---

## 2. Three turns in Chrome, by clicking (deliverable 7)

`./bridge/run.sh mtgtable.MtgTable --transport ws --port 8642 --seed 42 --game-id
m3-browser` plus `npm --prefix web run dev`, driven through the Claude browser
tools at `http://127.0.0.1:5173/?ws=1`. Every line below is a real mouse click on
the rendered board unless it says otherwise.

| # | What was clicked | What the engine did |
|---|---|---|
| 1 | the OK button, labelled **`Play`** | won the coin toss → chose to play; hands dealt. Opponent hand renders as **7 card backs**, mine by name |
| 2 | **Space** (synthetic `keydown`, see below) at the `Keep` / `Mulligan` prompt | kept the hand; turn 1 began |
| 3 | `Island #38` in hand — **`selectable` was `{cardIds: [], mode: "none"}`** | land played; Battlefield (0) → (1). At turn 3 the same click produced the log line `land Island #37, Human` |
| 4 | `Pym Particles #6` (a `{U}` sorcery) | accepted, nothing happened: no legal target on an empty board. Forge's answer, rendered as-is |
| 5 | the OK button (`OK`) | Main 1 → Main 2 (pass priority) |
| 6 | the Cancel button, labelled **`End Turn`** | turn 1 ended |
| 7 | OK ×5 through the AI's turn 2 | the AI played a Plains and cast `S.H.I.E.L.D. Spy Kit`, both visible on its battlefield |
| 8 | `Island #37` (turn 3), `Island #35` (turn 5), `Island #36` (turn 7) | three more land drops, each with an empty `selectable` |
| 9 | `A.I.M. Scientists #2` (turn 7, 4 Islands untapped) | **nothing at all — no frame came back.** See §5; this is a bridge-side gap, not a board one |
| 10 | at turn 11's Cleanup: `Web Up #27` | `selectable (cards): 8 ids, choose 1–1`, **both buttons disabled**, and the board's §4.2 hint on screen: *"OK is disabled and cards are selectable: the engine wants a card click, not a button."* The card went to my graveyard |
| 11 | `Aerial Doombot #25` (turn 13, `{U}`) | prompt became `Aerial Doombot - Creature 1 / 1` / `Pay Mana Cost: {U}` and **the OK button's label became `Auto`** — `InputPayMana`'s own label, rendered verbatim (report 11 §0.1) |
| 12 | the OK button (`Auto`) | Island #38 tapped; the creature went on the stack: `stack #33 Aerial Doombot - Creature 1 / 1 — from Aerial Doombot #25, controlled by Human · resolves next` |
| 13 | the OK button (`OK`) | it resolved: `zone #25 stack → battlefield (player 0)`, `resolved #25`, and the card is on my battlefield as `1/1 summoning sick` |
| 14 | the opponent's **name** in its panel | `act: clickPlayer 1` on the wire; Forge accepted it and nothing else happened (no targeting was open) |
| 15 | **Escape** (a real key press) at my turn 13 main phase | `act: buttonCancel` → the `End Turn` label's action: turn 13 → turn 14 |
| 16 | `Concede`, then `Concede — click again to confirm` | `over {winner: 1, reason: "AllOpponentsLost"}`, the board drew **Game over. Winner: Forge AI**, the socket closed and the client did **not** try to reconnect |

The session on disk (`var/games/m3-browser/frames.jsonl`, 506 lines, 1.0 MB):

```
types  {"hello_ok":1,"state":128,"input":258,"act":61,"notice":56,"over":1}
acts   {"buttonOk":44,"clickCard":10,"buttonCancel":5,"clickPlayer":1,"concede":1}
```

and the ten card clicks, with the M8 answer beside each:

```
t1  MAIN1   clickCard 38 (OUTSIDE selectable)
t1  MAIN1   clickCard 6  (OUTSIDE selectable)
t3  MAIN1   clickCard 37 (OUTSIDE selectable)
t5  MAIN1   clickCard 35 (OUTSIDE selectable)
t5  MAIN1   clickCard 6  (OUTSIDE selectable)
t7  MAIN1   clickCard 36 (OUTSIDE selectable)
t7  MAIN1   clickCard 2  (OUTSIDE selectable)   ×2   <- §5
t11 CLEANUP clickCard 27 (in selectable)             <- the discard
t13 MAIN1   clickCard 25 (OUTSIDE selectable)        <- the creature
```

**9 of 10 clicks named a card the engine had not listed**, and they are the ones
that played the game. The one inside `selectable` is the discard — the explicit
selection set doing its actual job.

**A reconnect happened for free.** A Vite hot reload mid-game dropped the socket
and the client reopened it: `ws connections = 2 accepted, 0 refused`, and the
board came back with the full state and the current input (§2.4) at turn 1 with
the game intact. A second, deliberate reconnect happened in §3 when the whole
JVM was replaced under a running page.

### Keyboard

`Escape` → `buttonCancel` was verified with a **real** key press (step 15).
`Space` → `buttonOk` was verified with a **synthetic** `KeyboardEvent`, because
this browser driver delivers its Space as `{key: "", code: ""}` — recorded here
rather than glossed, since it is the one interaction below that a person has not
performed by hand. The handler is the same one in both cases and it fired: `out`
went 0 → 1 and the mulligan prompt was answered.

That synthetic press is also what found the **first of two real bugs** (§4).

---

## 3. An `ask` answered in the browser (deliverable 3)

Forge dispatched no ask in the game above. Seed 13 does, on the first
`Thriving Isle` drop, so a second session was run for it
(`--seed 13 --game-id m3-ask2`) — the running page reconnected to the new JVM by
itself, showing the new game's mulligan prompt with no reload.

The board drew this, with the board's own clicks inert behind it:

```
ORDER  a1 · timeout 0 ms                    THE GAME THREAD IS BLOCKED ON THIS
Select order for replacement effects
Apply first (the answer, in this order)
  [0] Thriving Isle (9) - Thriving Isle enters tapped.            ↑ ↓ ✕
Source (what is left behind)
  [1] Thriving Isle (9) - As Thriving Isle enters, choose a color other than blue.  →
  ☐ remember this decision
[Answer] [Default] [Reset]   1 in the destination · min/max constrain what is LEFT in source: -1/-1
This kind has no usable null (§5.3): Forge dereferences the result, so "Default"
sends the documented default order instead of a cancel.
```

`timeout 0 ms` is the ws transport's infinite ask timeout while a client is
connected (**D15 extended**: liveness, not a clock). While it was up:

```
card button disabled   : true
player button disabled : true
OK button disabled     : true
Concede disabled       : false      <- §9 invariant 6
```

and clicking a card sent nothing (`out` unchanged). The Input panel said why:
*"a question is outstanding — answer it above; the buttons belong to the input
the engine pushed before it blocked."*

**Answered by clicking.** `Default` on the `order` → `{"ordered":[0],"remember":false}`;
then the `choose_list` that follows — four options of `kind: "color"`, `min = max = 1` —
answered `[3]` after clicking `white` rather than the pre-selected `black`. Both
are ask-local indices, and the bridge's own log of that session agrees:

```
asks    order:a1, choose_list:a2
answers a1={"remember":false,"ordered":[0]}, a2=[3]
types   {"hello_ok":1,"state":16,"input":24,"act":6,"notice":5,"ask":2,"answer":2,"over":1}
```

An earlier run of the same ask, before the fixes in §4, is where both bugs came
from.

---

## 4. Two bugs the browser found, and the tests that keep them fixed

**1. An answered ask stayed on screen forever.** `reduce()` clears `state.ask`
when it folds the `answer` frame — which a *replay* does, because a log carries
both directions (§8.2). A live client's answer goes out on the socket and never
comes back, and **no server frame ever says "that question is closed"**: the game
thread simply unparks and the next `state` arrives. So the modal stayed up over a
board that had already moved on, with the engine waiting for nothing.

Fix: `WebSocketTransport.send()` folds its own c2s frames through `reduce()`, so
a live session behaves exactly like a replay of its own log. Pinned by
`web/test/ws.test.ts`: *"answering an ask clears it locally — nothing the server
sends ever will"*.

**2. `max === 1` was a checkbox, not a radio button.** "Choose a color" is
`min = max = 1`, so the form opens with option 0 already chosen — and the literal
reading of the bound disabled every *other* option, leaving no way to pick white
without first finding the deselect. Fix: `toggleChoice(chosen, id, max)`, which
replaces the choice when `max === 1` and refuses the extra click above that. The
engine's number is still obeyed exactly; pinned by `web/test/ask-modal.test.tsx`.

A third, smaller one: the Space handler threw on any event whose target has no
`tagName` (a `window`- or `document`-dispatched key), because `target?.tagName.toLowerCase()`
guards only the null target. That is why the synthetic press in §2 did nothing
the first time.

---

## 5. What the browser could NOT do, and why it is not a board defect

**A card with two or more playable abilities cannot be played by clicking it.**
`A.I.M. Scientists` (`{3}{U}`, and `K:TypeCycling:Basic:2` — so *cast* and
*basic landcycling {2}*, both affordable with four untapped Islands) was clicked
twice at turn 7 with the stack empty and priority held. Both clicks reached the
bridge (`c2s seq 25`, `seq 26`) and **zero frames came back**; no
`notice{title:"Not selectable"}`, because `selectCard` returned `true`.

The path: `WireGuiGame.onAct` dispatches `applyAct` with
`FThreads.invokeInEdtNowOrLater` (`WireGuiGame.java:1970`), so `selectCard` runs
on `mtg-table-EDT`; Forge's `InputPassPriority` calls
`PlayerControllerHuman.getAbilityToPlay`; and `WireGuiGame.getAbilityToPlay`
(`:1469`) answers locally **only** when `abilities.size() == 1`, otherwise
returning `null` because it is not on the game thread and **must not block there**
(report 07 R2 — a value-returning method that parks the EDT stalls every prompt
in the game with no error). So the `ability_menu` ask never reaches the wire, and
the click is a silent no-op.

That is consistent with every measurement in the repo: `ability_menu` has been
dispatched **zero** times in any recording, and §3.2's amendment M5 says
`getAbilityToPlay` "fires only as the one-ability shortcut". It is a **bridge**
gap, not a board one — the board sent the right act — and it is the one thing
standing between a browser seat and cards with cycling, equip, flashback or any
second activation. Cards with a single playable ability cast normally: `Aerial
Doombot` did, in step 11 above.

**Also not covered here:** nine of the eleven ask kinds have still never been
dispatched by Forge in this repo, so their forms are proved by
`fixtures/synthetic/sample-handwritten.jsonl` and `web/test/ask-modal.test.tsx`
only (the same standing `mtgtable.AskSelfTest` has on the Java side). The stall
banner (§4.2's "OK disabled, nothing selectable, no ask") never appeared in
either session — which is the good outcome, and means it is rendered from the
tests alone.

---

## 6. The tests

```
$ npm --prefix web run build
tsc --noEmit && vite build
✓ 36 modules transformed.
dist/assets/index-7SGBdxDd.css    8.46 kB │ gzip:  2.30 kB
dist/assets/index-DHGU_S9c.js   206.11 kB │ gzip: 64.15 kB
✓ built in 355ms                                     # zero TS errors

$ npm --prefix web test
# node --test test/*.test.ts
ℹ tests 253
ℹ pass 253
ℹ fail 0
# vitest run
✓ test/ask-modal.test.tsx (20 tests)
✓ test/render.test.tsx   (17 tests)
Tests  37 passed (37)
```

New since M2: **14 node tests** for the transport, **20 vitest tests** for the ask
form, and a pair of node tests per seat recording the log test finds (17 on this
machine, 2 in a clean checkout that has only the committed fixtures).

**`web/test/ws-log.test.ts`** replays whatever ws session it can find — preferring
`var/ws-auto-*.jsonl`, then a `transport: "ws"` log under `var/games/` that has
reached its `over`, then the committed `fixtures/games/human-*.jsonl` — and says
which one it got, so a run that proved less is visible rather than silent:

```
# ws-log: var/ws-auto-42.jsonl — tools/ws-auto-play.mjs --log
# var/ws-auto-42.jsonl: 1604 frames · 226 acts · 8 asks (choose_list,order) ·
#                       5 "Not selectable" notices · winner 1
# var/ws-auto-42.jsonl: 78/86 clickCard acts name an id OUTSIDE input.selectable (M8)
# var/games/m3-web-42/frames.jsonl: 1602 frames · 226 acts · 8 asks …
# ws-log: skipped var/games/ws-boot/frames.jsonl (no `over` yet — a session in progress)
```

It asserts, per session: every ask answered **exactly once** and in ask order, no
`askId` issued twice, no answer for an ask that was never asked, exactly one
`over` and it is the last frame, and at least one `act` (a seat recording with no
acts in it is not a seat recording).

---

## 7. `scripts/play.sh`

```bash
./scripts/play.sh                 # config.json's deck and ports, a random seed
./scripts/play.sh --seed 42       # a reproducible shuffle
./scripts/play.sh --port 8643     # a second bridge beside a running one
./scripts/play.sh --no-open       # do not launch a browser
```

check-forge → `bridge/build.sh` → the bridge in the background (`var/play/server.log`)
→ poll `GET /health` (120 × 0.5 s; a cold `FModel.initialize` is ~2 s and the
whole boot ~8 s) → `npm --prefix web run dev -- --open "/?ws=1"`. The URL it opens
is **`http://127.0.0.1:5173/?ws=1`**, and `--port` appends `&port=N`. Ctrl-C stops
both halves, and so does the bridge exiting on its own: it plays one game and
exits 0 after `over`, and the script notices and stops vite with it.

The two servers in this document were started by hand rather than by `play.sh`,
because the evidence needed the bridge and the browser to be restarted
independently; the script's own steps (check-forge, build, background JVM,
`/health` poll, vite) are each exercised above in the same order.

---

## 8. The URL map

| URL | What it does |
|---|---|
| `http://127.0.0.1:5173/?ws=1` | the live seat (**the default with no query at all**) |
| `http://127.0.0.1:5173/?ws=1&port=8643` | the live seat against another bridge |
| `http://127.0.0.1:5173/?replay=games/g1.jsonl` | the M1 replay, unchanged — `npm run dev:replay` |
| `http://127.0.0.1:5173/?replay=synthetic/sample-handwritten.jsonl` | the eleven ask kinds, read-only |

The default changed in M3: a bare `/` now tries to play a game. `?replay=` always
wins, and a replay passes no `actions`, so every affordance renders exactly as it
did in M1/M2 and is inert — `web/test/render.test.tsx` still asserts the ask block
says **Read-only** over the whole fixture corpus.

---

## 9. The four amendments the protocol grew during this session

`docs/protocol.md` gained **M10–M13** while this half was being written (the
socket half's, not mine). Each was checked against this client:

| # | What it says | This client |
|---|---|---|
| **M10** | `seq` is per **session**, not per connection: a reconnecting client is handed the cached `hello_ok` / `state` **verbatim**, same `seq`, so its first frame may be `seq: 340` and a mid-stream `resync` may hand back a *lower* `seq` than the frame before it. `pong` and a refusal `notice` carry `seq: 0`. | Nothing here treats `seq` as a sequence to validate: `reduce()` reads `v`, `type` and `body`, and the client's own counter (the one `ws.test.ts` pins as monotonic from 1) is the **c2s** direction, which is untouched by any of this. A gap renders nothing and warns nothing. |
| **M11** | `over` can arrive with **no `gameOver` `state` in front of it**, carrying `{winner: null, reason: null}`, when a concede lands before the seat was asked for anything. | `reduce()` never required the snapshot (`gameOver` is set by either frame, whichever comes first). The board's banner did print **"Draw."** for that shape, which reports a result nobody played for; it now says *"No result — the session ended before the engine published an outcome"* when `winner` **and** `reason` are both null, and still says "Draw." for a real one. |
| **M12** | `over` is terminal: every s2c frame after it is dropped by the emitter. | The transport stops reconnecting once `state.gameOver` is set, so a server that exits after `over` leaves the board on the final position rather than in a retry loop. Observed in §2 step 16: status went to `closed` and stayed there. |
| **M13** | `GET /health` → `200 ok` on the same port; a second client is closed with code **4001**. | `scripts/play.sh` polls exactly that endpoint and waits for the body `ok`. `ws.ts` treats **any** close code ≥ 4000 as the server saying no — status `refused`, no automatic retry, a toast, and a manual **Reconnect** button — which is the rule 4001 was chosen to trigger. Pinned by `ws.test.ts`: *"a ≥4000 close code is the server refusing a second client — terminal"*. |

---

## 10. The review pass — 2026-09-11

Six amendments later (**M14–M19**), three of them visible from this half:

| # | What it says | This client |
|---|---|---|
| **M14** | An `ability_menu` is usually asked with **no game thread parked on it**, because Forge asks `getAbilityToPlay` from inside a click. Before this, clicking a card with two or more playable abilities was a **silent no-op** — no `state`, no `input`, not even a `notice`. | Nothing in the client had to change: it is an ordinary `ask` frame with an ordinary `answer`. Driven end to end in Chrome at seed 42 — clicking **A.I.M. Scientists #2** at Main 2 opened the modal with both options (`[0] A.I.M. Scientists - Creature 3 / 3`, `[1] Basic landcycling {2} (…)`, both `can play`), answering `1` put Forge's own `Pay Mana Cost: {2}` prompt on the board with `focus #2`, tapping Island #38 tapped it, and Cancel returned to priority with no dead end. `var/games/fix-browser-42/frames.jsonl`: one `ask`, one `answer` `{"askId":"a1","value":1}`, one `over`, `over` last, `check-redaction` PASS. |
| **M14** (the modal's wording) | The client cannot tell a blocking ask from an asynchronous one, and must not claim it can. | The modal's banner said **"the game thread is blocked on this"**, which is now false for most `ability_menu`s. It says **"the engine is waiting for this"**, which is true of every ask. `ask-modal.test.tsx` and `render.test.tsx` pin the new string. |
| **M15** | `GET /health` is 503 `starting` until the session exists. | `scripts/play.sh` already waited for the body `ok` and therefore needed no change — but it is now waiting for something true. The board itself is unaffected: it connects when the user opens the page, and a socket that lands in the window is handed `hello_ok` + `state` + `input` in order. |

**Accessibility.** The verifier reported that cards are `<li>`s with no button
role and are absent from the accessibility tree. That was stale: they are real
`<button>`s (`CardButton`), and `read_page filter=interactive` on the live board
lists all fourteen of them. What was genuinely missing was the accessible
**name** — the `title` explaining the act shadowed the card — so every clickable
card, player name and engine button now carries an `aria-label`: `"A.I.M.
Scientists {3}{U} — card 2"`, `"card back — card 69"` for a concealed one,
`"Human — player 0"`, and the engine's own word (`Play`, `Keep`, `End Turn`) for
the two input buttons. Verified in Chrome: the interactive tree reads
`button "Play"`, `button "Forge AI — player 1"`, `button "Quantum Reduction
{1}{U} — card 5"` where it used to read `button "act: clickPlayer 1"`.

**`scripts/play.sh` stops both halves.** It did not: `$!` was the `npm` wrapper
and the vite it spawned was reparented and kept listening (measured by the
verifier: pid 476167, PPID 2432, still on 127.0.0.1:5173 after the bridge had
gone). It execs `web/node_modules/.bin/vite` directly now, so the pid the script
holds is the server. Measured after this change: the browser session above ended
with the bridge printing `MTGTABLE OK` and **nothing listening on 5173 or 8642**.

---

## 11. The fix pass — 2026-09-11, the browser half

A second verifier played a real Chrome game (16 mouse clicks, seed 42, game-id
`verify-browser-42`) and reported three client defects. All three are closed.

### 11.1 The red "wedged game thread" banner fired on ordinary turns (major) — M21

`docs/protocol.md` §4.2 stated the diagnostic as four clauses — OK disabled,
`selectable` empty, no outstanding `ask`, game not over — and the board rendered
exactly that. **Those four clauses are also the ordinary state of not holding
priority**, and the banner fired twice inside the first two turns of the live
game: at turn 1 upkeep under Forge's own `Waiting for Forge AI…`, and under
`Yielding until end of turn. You may cancel this yield to take an action.`

The rule gains two qualifiers (**M21**), and the client implements them in two
places on purpose:

* `web/src/render/wedge.ts` — `wedgeSuspected(state)`, the four clauses **plus
  "this seat holds priority"** (`board.priority === hello.you`). Pure, so it can
  be tested without a DOM;
* `Board.tsx`'s `WedgeBanner` — **plus "no s2c frame for 2.5 s"**, a timer keyed
  on `state.framesApplied`, and nothing at all in a replay, where there is no
  thread to be wedged.

Measured over the five committed human-seat recordings
(`web/test/wedge.test.ts`, which is now part of `npm test`):

| recording | frames flagged by the old four-clause rule | flagged with the priority clause | worst gap to the next frame after a flagged frame |
|---|---|---|---|
| `human-auto-42` | 334 | 311 | 121 ms |
| `human-auto-7` | 359 | 351 | 121 ms |
| `human-trample-7` | 273 | 257 | 121 ms |
| `human-auto-2026` | 120 | 119 | 121 ms |
| `human-scry-7` | 103 | 98 | 121 ms |

The priority clause removes 5–7%; **the timer removes the rest**, and the reason
the timer is safe is in the last column: Forge's own `awaitNextInput()` re-pushes
the prompt every 250 ms while it thinks, so in a real game the stream is never
quiet for 2.5 s unless something has stopped. The test asserts exactly that — if
a future emitter ever leaves a seat flagged and silent for the banner's window,
it goes red.

Neither qualifier can hide a real wedge: a wedge persists (so it outlasts any
timer) and happens on your own priority (so it satisfies the first clause).

**And it was re-played in the browser, not only against the corpus.**
`./scripts/play.sh --no-open --keep-open --seed 42 --game-id m3fix-browser-42`,
four turns clicked through in the pane, then a two-click concede
(`var/games/m3fix-browser-42/frames.jsonl`, 104 lines, one `over`, `over` last,
`check-redaction.mjs` PASS, `MTGTABLE OK`, `emit errors = 0`):

* the **old** rule was true on **16** of the session's 54 `input` frames,
  including both of the prompts the verifier reported — `Waiting for Forge AI…`
  (turn 1 upkeep) and `Yielding until end of turn.` — so the red banner would
  have fired sixteen times in four turns;
* twelve of those held priority, and **the largest gap to the next s2c frame at
  any of them was 1 ms** (the largest anywhere in the session, 4 ms);
* sampling the live DOM every 250 ms across the whole session — mulligan, two
  main phases, an AI turn, a cleanup discard, the concede — found
  `document.querySelectorAll('.banner--error').length === 0` at **every** sample.

The other half of §4.2 still renders, and was seen doing it: at the cleanup
discard (`OK` disabled, `Cancel` disabled, **8** selectable ids) the board showed
the blue hint *"OK is disabled and cards are selectable: the engine wants a card
click, not a button"* and no error banner — which is the distinction the two
halves of §4.2 exist to draw. Clicking a battlefield card there came back as
Forge's own `notice{"Not selectable","card 47 cannot be selected now"}`
(amendment M8), and clicking a hand card completed the discard and moved the game
to turn 4.

### 11.2 Space could not be pressed by a driver (minor)

`main.tsx` matched `event.key === ' ' || event.key === 'Spacebar'`. The verifier
installed a keydown recorder in the live page and found this browser driver
delivers Space as `{key: "", code: "", keyCode: 0}` while Escape arrives
correctly as `{key: "Escape"}` — so Escape = Cancel was verified for real (c2s
seq 6, `buttonCancel`) and Space genuinely could not be. The condition now also
accepts `event.code === 'Space'`, which is the physical-key spelling every driver
and remapped layout agrees on, and which makes the binding testable.

Verified in the live page: dispatching exactly what the driver delivers —
`new KeyboardEvent('keydown', {key: '', code: 'Space'})` on `window`, which
matched **nothing** before this change — put `act: buttonOk` on the wire
(`var/games/m3fix-browser-42/frames.jsonl`, c2s `seq: 4`) and advanced the game
from `Main phase, precombat` to `Main phase, postcombat`. Escape was re-checked
the same way and still sends `buttonCancel` (c2s `seq: 5`).

### 11.3 Concede stayed armed after `over` (minor)

The two-click Concede button kept its armed state across the end of the game, so
a finished board offered "Concede — click again to confirm" over its own
`Game over. Winner: Forge AI` banner — a second irreversible-looking click on a
game that no longer exists. `ConcedeButton` now takes `gameOver` and renders
disarmed and `disabled` once the game is over, with a title that says why. §9
invariant 6 ("reachable from every UI state") is unchanged for every state where
there is still something to concede.

Verified in the same browser session: the first click armed it
(`"Concede — click again to confirm"`, `disabled: false`), the second sent the
act, and once `Game over. Winner: Forge AI. AllOpponentsLost` rendered the button
read `"Concede"`, `disabled: true`, `title: "the game is over; there is nothing
left to concede"`. `scripts/play.sh` then stopped both halves by itself —
`ss -ltn` shows nothing on 5173 or 8642 afterwards and no JVM is left running.

---

## 12. Status — 2026-09-11, after the documentation pass

No code changed in this pass — the diff is `PLAN.md`, `README.md`,
`DECISIONS.md`, `CLAUDE.md`, `docs/research/07-wireguigame-spec.md` and the two
M3 evidence files — and the gate was run **once**, at the start of it, over the
same `web/` tree these documents describe.
`./tools/check-all.sh` → **exit 0, 163.2 s, thirteen steps**
(`var/check-all-doc-pass.log`).

### 12.1 Step 13, the web half of the gate

```
> tsc --noEmit && vite build
✓ 37 modules transformed.
dist/assets/index-7SGBdxDd.css    8.46 kB │ gzip:  2.30 kB
dist/assets/index-CugXvVez.js   207.03 kB │ gzip: 64.36 kB
✓ built in 356ms                      # zero TS errors

> node --test test/*.test.ts && vitest run
ℹ tests 253   ℹ pass 249   ℹ fail 0   ℹ skipped 4     (2.4 s)
✓ test/ask-modal.test.tsx (20 tests)
✓ test/render.test.tsx   (17 tests)
Tests  37 passed (37)                                  (6.4 s)
```

The four skips are `ws-log.test.ts`'s M8 click assertion, skipped **with a
reason** on each of the four *bridge-side* logs — `# not a dumb-human-policy
transcript — M8 is a property of that policy, not of the wire`. It ran, and
passed, on the one log that is strict: the client's own `--log`, which carries
`recordedBy: "client"`. That gate is the review pass's fix: the assertion used to
run on whatever was lying in `var/`.

**The corpus was handed to the suite rather than found by it** — the
non-hermeticity the review pass closed. This run's `MTGTABLE_WS_LOGS` was the
four logs step 10 had just produced:

```
# ws-log: var/ws-auto-13.jsonl — MTGTABLE_WS_LOGS — the client's own --log
# ws-log: var/games/check-all-ws-auto/frames.jsonl — the bridge's own frame log
# ws-log: var/games/check-all-ws-smoke/frames.jsonl
# ws-log: var/games/check-all-ws-drop/frames.jsonl
# ws-log: var/games/check-all-ws-refuse/frames.jsonl
# var/ws-auto-13.jsonl: 1317 frames · 183 acts · 3 asks (choose_list,order) ·
#                       4 "Not selectable" notices · winner 1
# var/ws-auto-13.jsonl: 55/63 clickCard acts name an id OUTSIDE input.selectable (M8)
# var/games/check-all-ws-refuse/frames.jsonl: 1 ask(s) with no `answer` line —
#   legitimate only as ReplyPool.cancelAll() at a disconnect (§5.4)
```

**55 of 63 card clicks outside `selectable`** at seed 13, against 78 of 86 at
seed 42: amendment M8 is a property of the game, not of one recording.

### 12.2 What the board still owes, and where the list lives

Read **PLAN.md → M3 → M3 follow-ups**; items **3, 4, 6, 9** and **11** are this
half's. In short:

- **Space = OK is proved by a synthetic `KeyboardEvent`.** The handler now
  matches `event.code === 'Space'` as well as `key`, and dispatching exactly what
  the driver delivers puts `act: buttonOk` on the wire (§11.2) — but no human
  finger has pressed the space bar in a real session. Escape was a real key press.
- **Six of the eleven ask kinds are rendered only from the hand-written
  fixture.** `AskModal.tsx` implements all eleven and `ask-modal.test.tsx` mounts
  all eleven; Forge has dispatched `choose_list`, `order`, `assign_damage` and
  `ability_menu`. The other six are M5's probe-deck work, and a form proved by a
  fixture we wrote ourselves cannot prove the emitter.
- **The asynchronous `ability_menu` is not re-delivered by `resync`** (it never
  enters `ReplyPool`), so a client that loses the modal clicks the card again;
  and an answer sent long after the engine moved on is still forwarded to
  `selectAbility`. Documented in **D20**, shrunk by **D22**, not eliminated.
- **Two shapes are handled but have never been rendered live**: an `over` with no
  `gameOver` `state` in front of it (**M11** — `grep -rl 'OVER WITHOUT A gameOver
  STATE' var/` finds nothing on this machine, so the board's *"No result"* banner
  is proved by tests only), and a `seq` that arrives lower than its predecessor
  after a mid-stream `resync` (**M10** — the reducer ignores `seq` entirely, which
  is why it does not care).
- **The §4.2 wedge banner has never fired on a real wedge.** After **M21** it
  needs six clauses including "no s2c frame for 2.5 s"; `web/test/wedge.test.ts`
  proves it is quiet over the corpus (the old four-clause rule was true on
  103–359 frames per recording, with a worst next-frame gap of 121 ms). Quiet is
  the correct outcome and it is also the reason nobody has seen the red state in
  anger.
