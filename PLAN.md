# mtg-table — plan

Source of truth: [`docs/research/05-architecture-synthesis.md`](docs/research/05-architecture-synthesis.md)
§9. That document is the spec; this file is its schedule, kept up to date as
milestones land.

Eight milestones, each with **one runnable command and a deliverable you can look
at**. Total estimate ~13 evenings, first browser game at evening 7.

| | Milestone | Effort | Status |
|---|---|---|---|
| M0 | The engine runs our code | 1 evening | **done** |
| M1 | Record a game and scrub through it in the browser | 2 evenings | **done, pending hardening** |
| M2 | A full game against the AI, in the terminal | 2 evenings | not started |
| M3 | The same game, in a browser tab | 2 evenings | not started |
| M4 | A board that looks like Magic | 3 evenings | not started |
| M5 | Nothing dead-ends | 3 evenings | not started |
| M6 | Comfort | 2 evenings | not started |
| M7 | Arena mode: the game as a cinematic | open-ended (Tier 1: weeks) | not started |

---

## M0 — The engine runs our code

**Status: done** (evidence: [`docs/evidence/m0-smoke.md`](docs/evidence/m0-smoke.md)).
**Effort: 1 evening.**

**Command**

```bash
./tools/check-forge.sh && ./bridge/build.sh && ./bridge/run.sh mtgtable.Smoke
```

**Deliverable.** The first commit. In under 10 seconds the run prints the
`FModel.initialize` timing (measured ~2,033 ms), `cards in DB = 95126`,
`deck = … (40 cards)` and an AI-vs-AI match result — with `~/.forge` and `~/forge`
provably untouched (`sha1sum` the trees before and after, specifically
`~/.forge/decks/constructed/`).

Files: `LICENSE`, `NOTICE`, `README.md` with its NON-GOALS list, `.gitignore`,
`PLAN.md`, `DECISIONS.md`, `CLAUDE.md`, `docs/protocol.md`, `config.json`,
`tools/check-forge.sh`, `tools/make-forge-home.sh`, `forge-home/`,
`bridge/build.sh`, `bridge/run.sh`, `bridge/src/mtgtable/HeadlessGuiBase.java`,
`bridge/src/mtgtable/Smoke.java`.

**Watch for.** `GuiBase.setInterface(...)` must be the first Forge call in the
process. `isGuiThread()` must be the named-thread check. Record whether
`Match.prepareAllZones` emits any `revealUnsupported` complaint for an MSH/MSC
card.

**Resolved 2026-09-11.** The `SVar 'Any' not found in ability, fallback to Card
(Quantum Reduction)` warning — which also fires for Helicarrier Strike, the
deck's other `K:Teamwork:2` card — is **benign and informational, not a finding**.
The string `"Any"` is a hard-coded sentinel inside `CostTeamwork`, not in any card
file, so no override can remove it; the computed amount is 0 either way and all
three rules paths skip it. `Smoke` / `RecordMatch` classify it as `svar-fallback`
at **informational** level and a non-zero count is not a failure
(`docs/research/08-deck-card-coverage.md` §3).

Also resolved here: the bootstrap now sets `FPref.UI_SELECT_FROM_CARD_DISPLAYS`
to `"false"` (**D13**) and `make-forge-home.sh` installs the corrected
A.I.M. Scientists card script (**D14**), which `Smoke` verifies by printing the
loaded card's keywords.

## M1 — Record a game and scrub through it in the browser

**Status: done, pending hardening** (evidence:
[`docs/evidence/m1-record.md`](docs/evidence/m1-record.md),
[`m1-web.md`](docs/evidence/m1-web.md),
[`m1-hardening.md`](docs/evidence/m1-hardening.md)).
**Effort: 2 evenings.**

**Command**

```bash
./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --seed 42 \
    --out fixtures/games/g1.jsonl
npm --prefix web run dev:replay            # opens /?replay=games/g1.jsonl
./tools/check-all.sh                       # the gate: lint, build, smoke, re-record, redaction, web tests
```

**Deliverable.** Two AI seats play to completion and write the frame log; the
browser then shows a text board — turn/round, phase, both life totals, each zone
as a list, hands as backs, library counts, the stack, combat bands — with
prev / next / play / speed.

This is the keystone. It builds `Json`, `Snap`, redaction, `GameLog`,
`protocol.ts`, `reduce.ts`, the `Transport` interface and the entire board
renderer **with no socket, no blocking input and no possible deadlock**, and it
leaves committed fixtures so every later front-end evening runs without a JVM.

Also ships here: a redaction test that feeds `g1.jsonl` to a checker asserting no
opponent hand card ever carries a `name`.

**Added 2026-09-11.** Every `state` frame also carries `events`
(`docs/protocol.md` §3.6): the engine events the snapshot reflects, as id-only
objects. The text board lists them; they exist for M7. The redaction checker also
asserts no `name` key appears under `events`.

**Hardening pass, 2026-09-11 (what "pending hardening" means).** Two audits
landed after M1 was first recorded — `docs/research/06-hidden-information-audit.md`
and `07-wireguigame-spec.md`, plus `08`, `10` and `11` — and the M1 review found a
second, ungated string path to the wire. The protocol amendments are applied
(`docs/protocol.md` → "Amendments"); the M1 work items are:

- the five-key redacted stub (`owner` added), `library: {count, cards}`, `Card.alt`
  and `Card.token` in `Snap.java`, `protocol.ts` and the checker;
- `tools/lint-bridge.sh` (the banned-accessor grep, wired into `bridge/build.sh`)
  and `tools/check-all.sh` (the one command to run before committing);
- `tools/check-redaction.mjs` grows report 06 §9's assertions A1–A11, including
  **name-before-reveal** — a full opponent-owned card in a hidden zone is a
  failure unless that id was revealed earlier through a public zone, an `ask`
  body, `input.focusCard` or `library.cards`;
- fixtures `g1`/`g2`/`g3` re-recorded at seeds 42 / 7 / 2026 after the `Snap`
  change, with the web tests green on the regenerated files.

**Second round, same day (the hardening review).** Four more items, all of them
"the test does not test what it says":

- `check-redaction.mjs` was silently downgrading the **absence** of every field
  this pass added to a warning, so five reverted amendments passed the gate. The
  tolerance is now behind `--pre-amendment`, which nothing uses, and the checker
  has a negative-control corpus of its own — `fixtures/negative/redaction/`, one
  defect per file, asserted by `tools/check-redaction-selftest.mjs` as step 7 of
  `check-all.sh`.
- `fixtures/synthetic/sample-handwritten.jsonl` was still pre-amendment *and* was
  the only artifact carrying `input` / `ask` / `answer` frames, so P6 and P7 had
  no coverage at all. Regenerated with all **eleven** ask kinds, their answers,
  and the `input` fields P7 added — and `check-all.sh` now runs the checker over
  `fixtures/synthetic/` too.
- `library.cards` was `[]` in every recording, because neither deck runs a
  continuous `MayLookAt` static. `decks/future-sight-probe.dck` and
  `fixtures/games/future-sight.jsonl` are the engine evidence for P2, and the web
  suite now asserts the corpus still contains content rather than only a shape.
- the `faceDownHidden` shape retired by P3 was still specified as live in
  `docs/protocol.md` §3.3, §8.5 and §9, in `CLAUDE.md` rule 8 and in report 05's
  amendment note, while no emitter had produced one for hours.

What remains engine-unevidenced (`surveil` / `phased` / `foretold`, a face-down
card outside play, and every `ask`/`input` shape) is named as M2-E1…M2-E6 in
`docs/evidence/m1-hardening.md` §2.2 — an AI-vs-AI recording has no seat to
produce them, so they belong to M2, not to M1.

M1 is **not** reopened by any of this: the deliverable (record → scrub in the
browser) works. The hardening is what makes the redaction claim testable rather than
coincidental, and it is cheaper now than after M3 freezes the reducer.

### M1 follow-ups (minor, from the hardening verifier, 2026-09-11)

Not blocking. Do them in M2 alongside the bridge work, or whenever convenient.

- `tools/check-redaction.mjs`: an opponent's library dumped as full cards is only a
  warning; make it fail by default with an explicit `--opponent-library-ok` escape
  for recordings that exercise a look-at-opponent's-library effect. Add the seat
  check to the web P2 test.
- `tools/check-redaction.mjs`: assert per-kind `answer` shapes; at minimum fail
  when an `order` or `choose_list` answer is `null` (the two kinds with no null
  default).
- `tools/check-all.sh`: after the fresh re-record, normalise (drop `t`,
  `startedAt`, `gameId`) and diff it against `fixtures/games/g1.jsonl`, failing
  with "Snap.java changed the wire: re-record fixtures" so value-level drift
  cannot leave the committed corpus stale while the pipeline stays green.
- Redacted stub `zone` nullability disagrees across ends (protocol.md tolerates
  null; protocol.ts and the checker say string). Pick one; the simplest is a
  non-null `"unknown"` fallback in `Snap.card()`'s hidden branch.
- No component-level render test: Node's type stripping does not transform JSX,
  so `npm test` never mounts `Board.tsx`. Add vitest with one render smoke test
  per fixture, or note the gap in `check-all.sh`'s header.
- `fixtures/synthetic/sample-handwritten.jsonl` and `tools/make-sample-fixture.mjs`
  are still pre-amendment (four-key stubs, no `token`/`alt`/`library.cards`);
  regenerate or delete.

## M2 — A full game against the AI, in the terminal

**Status: not started.**
**Effort: 2 evenings.**

**Command**

```bash
./bridge/run.sh mtgtable.MtgTable --transport console
```

**Deliverable.** The user beats (or loses to) the Forge AI with their own deck,
without a browser.

`WireGuiGame` with all **37** abstract members present behind `Transport`, plus
`ReplyPool` and `ConsoleTransport`. This de-risks the whole threading model —
virtual EDT, latch-blocking vs value-returning calls, answering from a third
thread — with no WebSocket and no DOM. Every unimplemented member logs
`UNIMPL <name>` and returns a safe default rather than throwing, so a game
degrades instead of dead-ending and the log says which of the 37 actually fire for
a W/U deck.

**Five findings from `docs/research/07-wireguigame-spec.md` that change how this
evening is spent.** Read that document before writing a line; it is the M2
implementation spec.

1. **There is a 37th abstract member.** `AbstractGuiGame` declares
   `protected abstract void updateCurrentPlayer(PlayerView)` — it is not on
   `IGuiGame`, so the name-level diff that produced "36" missed it, and **the
   class will not compile without it**. Note the `protected`.
2. **Build the `input` path first; the `ask` path is secondary.** With
   `isLibgdxPort() == false`, almost every yes/no goes through `InputConfirm`
   (prompt + buttons) rather than `IGuiGame.confirm` — every direct
   `getGui().confirm(...)` call site is guarded by `if (getGui().isLibgdxPort())`.
   A console client that implements only the blocking calls will sit at a prompt
   it never receives. This is the single biggest scheduling fact in the spec.
3. **`handleGameEvents` can fire off the game thread.** Our forwarder is an
   `InputQueue` observer, and `InputQueue.updateObservers()` is reached from
   `removeInput`/`clearInputs` via `InputSyncronizedBase.stop()`, which runs on
   whatever thread delivered the click. Walking `CardView` there corrupts the
   `Tracker` silently. So: **guard on `ThreadUtil.isGameThread()` and buffer the
   batch when it is false**; the next game-thread flush ships it. Log the deferred
   count — a non-zero value confirms the finding and is expected, not a bug.
4. **`openZones` / `tempShowZones` are not questions**, and they arrive on the
   **EDT**, where blocking stalls every prompt. Answer them locally, echo the
   argument, and push `input.openZones` (`docs/protocol.md` §4.3). The
   `open_zones` ask kind is gone; eleven kinds remain.
5. **Three rules, written down before anything else** (spec §2.5): a push method
   may touch only `getId()` on a view; only the game thread may block (every
   value-returning override opens with
   `if (!ThreadUtil.isGameThread()) return <local default>;`); and **no thread we
   create may be named `Game*`**, because `ThreadUtil.isGameThread()` is a bare
   `getName().startsWith("Game")`.

Two shapes that will otherwise be written wrong: `OrderResult` is
`(List<T> ordered, boolean rememberDecision)` and `order` must **never** return
`null`; and ask options are addressed by **ask-local index**, because Forge's `T`
is frequently a colour, an integer or a cost rather than a view object
(`docs/protocol.md` §5.1).

## M3 — The same game, in a browser tab

**Status: not started.**
**Effort: 2 evenings.**

**Command**

```bash
./scripts/play.sh
```

**Deliverable.** Play the S.H.I.E.L.D. deck against the AI to a win or a loss in
Chrome, clicking card names in lists and text buttons. Ugly, complete, and the
protocol is now proven against every question the engine actually asks. **This is
the "it works" moment**; everything after is polish.

`WsTransport` (netty `HttpServerCodec` → `HttpObjectAggregator(1MB)` →
`ChunkedWriteHandler` → `WebSocketServerProtocolHandler("/ws")`), `hello_ok`,
reconnect via `resync`, `cancelAll()` on disconnect, per-ask timeout. `web/` swaps
`ReplayTransport` for `WsTransport` — **the board component is unchanged**. Every
session is logged and replayable.

**Gate before this ships — now closed.** The `DelayedReveal` / `tempShowZones` /
`openZones` enumeration is
[`docs/research/06-hidden-information-audit.md`](docs/research/06-hidden-information-audit.md)
§2: twelve reveal paths, each with its wire channel and its leak signature, plus
the exhaustive grep of the three `mayLook` sets that is the complete
dynamic-reveal surface. What is left is *implementation*, and it must be in place
before a human seat exists:

- every card inside an `ask` or `input` body goes through the one serialising
  function, and **every option label** through the same gate (`"???"` when
  concealed) — the label, not the card object, is the leak that will actually
  happen;
- `input.focusCard` carries the serialised card, because `setCard` is pushed with
  cards that are not in the snapshot;
- the redaction checker runs on a recorded M3 session, not only on the M1
  fixtures;
- `docs/protocol.md` §10's planned M6 fields are already specified — add them
  while the reducer is still soft, or pay for it in M6.

`input.prompt` can still name a card the viewer may not see (Forge builds those
strings, we do not): the checker **warns** on it, and it is accepted residual
risk, documented in report 06 §10 (residual risk 3).

## M4 — A board that looks like Magic

**Status: not started.**
**Effort: 3 evenings.**

**Command**

```bash
node tools/fetch-art.ts && ./scripts/play.sh
```

**Deliverable.** A screenshot the user would show someone. Real layout: opponent
permanents row, middle table, own permanents, hand at the bottom, left rail (life,
zone counts, decision panel), right rail (phase strip). Real card images, tap =
90° rotate, summoning-sick tint, `input.selectable` outlines on clickable cards.
A missing image renders a generated text card frame and never blocks a click.

Spec: [`docs/research/10-board-ui-spec.md`](docs/research/10-board-ui-spec.md)
(component tree, layout tokens, wireframes at 1600×900 and 1280×720, the arrow
geometry, the three evenings). Write the components against the **post-hardening**
wire from the start rather than retrofitting: **one** concealed shape (the
five-key stub) plus a face-down card that is an ordinary `Card` with `name: ""`
and `alt: null` — report 10 §0.0's "three card shapes, not two" was superseded by
amendment P3 the same day — `Card.token`, `Card.alt`, `library.cards`,
`input.focusCard`, and a `card` on every ask option (`docs/protocol.md`
§3.2–§3.4, §4, §5.1).

## M5 — Nothing dead-ends

**Status: not started.**
**Effort: 3 evenings.**

**Command**

```bash
./scripts/play.sh   # ten consecutive games
grep UNIMPL var/*.log
```

**Deliverable / exit criterion.** Ten consecutive games with **zero `UNIMPL`
lines** and no state where the board is stuck waiting on something the browser
cannot express.

Every `ask` kind gets real UI: mana payment (tap lands plus the engine's own Auto
button, which runs `ComputerUtilMana.payManaCost` inside `InputPayMana`),
targeting from `selectable` min/max, attacker and blocker declaration,
`assign_damage`, and modals for `choose_list` / `choose_entities` / `order` /
`assign_amount`; click-to-open graveyard and exile browsers; SVG targeting arrows
from `stack[].targetCardIds` and `combat.bands`.

## M6 — Comfort

**Status: not started.**
**Effort: 2 evenings.**

**Command**

```bash
./scripts/play.sh   # three games back to back, one command typed
```

**Deliverable.** New Game without restarting the JVM (`HostedMatch.restartMatch`),
Undo, Concede, phase stops, Pass-To, always-yes/no, keyboard shortcuts mirroring
Forge's own `SHORTCUT_*` keycodes, mana-font pips, error toasts.

**Every one of these is an engine feature rendered, not a client state machine.**

**Corrections from [`docs/research/11-engine-comfort-features.md`](docs/research/11-engine-comfort-features.md)
— read it before planning the two evenings.**

- **Half of M6 needs no new wire, and evening 1 ships it.** `InputPassPriority`
  already labels the *Cancel* button `Undo (n)` or `End Turn`; `InputPayMana`
  labels the *OK* button `Auto`; `InputLockUI` labels Cancel while a yield runs.
  `docs/protocol.md` §4 already requires us to render `buttons.*.label` verbatim
  and send `buttonOk` / `buttonCancel`. **So Undo, End Turn, Auto Pay and
  cancel-a-yield are on the wire as of M3** — M6's job is to stop hiding them.
  **There is no `autoPay` act and no `endTurn` act**; inventing one is the
  "board threw the engine's answer away" failure.
- **Phase stops are answered from `WireGuiGame`'s own map**, not from `FPref` and
  not from `YieldController`. `PlayerControllerHuman.isUiSetToSkipPhase` consults
  `YieldController` **only** `if (isRemoteClient())`, and we are not one — that
  map is dead code for us. Forge's desktop holds the state in the GUI object,
  seeds it once per match from `FPref.PHASES_HUMAN` / `PHASES_AI`, and never
  calls `save()`. Do exactly that. The polarity is **stop**, not skip, which is
  what `act: setPhaseStop {stop}` already says.
- **`YieldController` is `forge.gamemodes.match`**, not `forge.gui.control`.
- **A `yieldKey` is a card name.** `StackItemView.getKey()` is
  `CardView.toString() + ": " + …`. Ship an opaque **bridge-minted handle** in
  `stack[].yieldKey` and never render it (`docs/protocol.md` §10.1).
- **Undo undoes mana abilities, not spells**, and the stack is cleared on every
  phase change. Do not build UI that promises more. `GameSnapshot` is a different,
  experimental mechanism and is never wired to `undoLastAction`.
- **"Pass to" is three engine features** (end of turn, the per-(player, phase)
  marker, let-the-stack-resolve) behind one call, `sendYieldUpdate(YieldUpdate)`,
  and all three are cancelled by the same `buttonCancel`. One `act: yieldTo {kind…}`
  covers the set.
- **`endCurrentGame()` empties `getHumanControllers()`** and replaces every
  `PlayerView`. Every cached id, the `ReplyPool`, the phase-stop map and the frame
  log are rebuilt from `openView`, and a **new `hello_ok`** tells the client to
  drop its card map (`docs/protocol.md` §2.1).
- **Space and Escape are not Forge shortcuts.** Space activates the *focused*
  button — `updateButtons(..., focus1)` decides which — so bind it to
  `input.buttons.focus` (`docs/protocol.md` §10.2), not to "OK".
- **There is no "hold priority" in Forge.** Do not render a toggle with no engine
  behind it.

## M7 — Arena mode: the game as a cinematic

**Status: not started. Scheduled after M6.**
**Effort: open-ended; Tier 1 is a few weeks of evenings.**

**Command**

```bash
npm run dev:arena -- fixtures/games/g1.jsonl   # first: a recorded AI-vs-AI game as a cinematic
./scripts/play.sh --arena                       # later: the live game
```

**Deliverable.** A second renderer for the same frame stream, in Three.js via
react-three-fiber inside the existing Vite app: the board as a 3D table, cards as
textured planes, and the transitions in `state.events` played as animations —
cast, enters, attack, block, damage, death, life change — with a choreographed
camera. Tier 1 needs no art assets beyond the Scryfall images we already fetch.
Tier 2 adds duelist avatars and stylised creature manifestations keyed by creature
type and colour. Per-card animation cues draw on the cards' source material (these
are Marvel characters with famous powers), kept as data files, never in the rules.
Design notes, tiers, constraints and the source-material approach:
[`docs/ideas/arena-mode.md`](docs/ideas/arena-mode.md).

**Hard rule.** The arena is a *renderer*. It never decides anything; it plays back
what the engine said. Rules stay in Forge.

---

## Deferred — explicitly out of scope until M6 ships

Not cancelled, not scheduled. Revisit only after M6 lands.

- A second deck, a deck picker, and an AI profile / difficulty selector. (Now
  specified, if it ever comes forward: there is no "difficulty" in Forge, only
  four profile files — `res/ai/{Default,Cautious,Reckless,Experimental}.ai` — and
  a picker sets one string, passed as `profileOverride` to
  `GamePlayerUtil.createAiPlayer`, because the no-override branch **saves**
  `FPref.UI_CURRENT_AI_PROFILE`. `docs/research/11-engine-comfort-features.md` §9.)
- The SQLite (`node:sqlite`) + FTS5 card library, the `oracle_cards` bulk stream,
  a local image cache and an `/api/images` proxy. Report 03 is the spec when we
  want it. (Note for then: the bulk field is **`jsonl_download_uri`**, gzipped
  JSONL; `download_uri` no longer exists.)
- A deck builder.
- `state_patch` / RFC 7386 merge-patch deltas.
- Multiplayer. Accounts. Packaging.
- Engine-level seeded replay (byte-identical re-runs).
- Bug-report zips.

Everything on the README's **NON-GOALS** list is a harder no than this: those are
decisions, not deferrals.

---

## Only the user can decide

From synthesis §13. The plan below assumes a default for each; a different answer
changes the plan, so raise it rather than quietly re-deciding.

| # | Question | **Default this plan assumes** |
|---|---|---|
| 1 | Licence: GPL-3.0-or-later, or AGPL-3.0-or-later so manabrew's `forge-harness` could be forked? | **GPL-3.0-or-later, and no manabrew code.** |
| 2 | Is the +2-evening M1 recorder worth it, or go straight for the browser seat (first game at evening 5, but no replay, no fixtures, JVM-coupled UI work)? | **Keep the M1 recorder.** |
| 3 | React or vanilla TS for `web/`? | **React, with plain hooks.** |
| 4 | Should anything ever rewrite `~/.forge/decks/constructed/Pacho SHIELD.dck` in place to add the missing `\|MSC` suffixes? | **Never rewrite it. Write a copy.** |
| 5 | Card images hot-linked from `cards.scryfall.io`, or proxied through our own origin with a 302 (the way Endstep does)? | **Hot-link in v1.** |
| 6 | Install a JDK? Not needed for this plan, but it would bring `jar`, `jshell`, a debugger and Maven. Unpack Temurin 21 into `tools/jdk/` (no sudo) or `apt install openjdk-21-jdk` (sudo)? | **No JDK. The JRE's `jdk.compiler` / `jdk.jdeps` modules suffice.** |
| 7 | GitHub: public repo or private? Affects whether NOTICE and the Fan Content disclaimer must be publication-quality on day one. | Undecided — **NOTICE is written to publication quality anyway**, so either answer works. |
| 8 | Is losing to the Forge AI acceptable in v1, or does the AI profile / difficulty picker come forward from the deferred list? | **AI difficulty stays deferred.** |
