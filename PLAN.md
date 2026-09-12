# mtg-table — plan

Source of truth: [`docs/research/05-architecture-synthesis.md`](docs/research/05-architecture-synthesis.md)
§9. That document is the spec; this file is its schedule, kept up to date as
milestones land.

Eight milestones, each with **one runnable command and a deliverable you can look
at**. Total estimate ~13 evenings, first browser game at evening 7.

| | Milestone | Effort | Status |
|---|---|---|---|
| M0 | The engine runs our code | 1 evening | **done** |
| M1 | Record a game and scrub through it in the browser | 2 evenings | **done** — hardened, all six follow-ups closed |
| M2 | A full game against the AI, in the terminal | 2 evenings | **done** — two review passes closed; M3 closed four of its eight follow-ups |
| M3 | The same game, in a browser tab | 2 evenings | **done** — a review pass and a fix pass, all 21 findings closed; eleven follow-ups open, none blocking M4 |
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

**Status: done** — the hardening pass landed and all six of its follow-ups are
closed (evidence: [`docs/evidence/m1-record.md`](docs/evidence/m1-record.md),
[`m1-web.md`](docs/evidence/m1-web.md),
[`m1-hardening.md`](docs/evidence/m1-hardening.md),
[`m1-followups.md`](docs/evidence/m1-followups.md)).
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

**Hardening pass, 2026-09-11 (what M1 shipped without, and then got).** Two audits
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

### M1 follow-ups — all six closed, 2026-09-11

Raised by the hardening verifier, done during M2, each verified by mutation.
Evidence: [`docs/evidence/m1-followups.md`](docs/evidence/m1-followups.md) (the
per-item measurements and diffs) plus
[`m2-console.md`](docs/evidence/m2-console.md) §5 and the review pass below.
**Nothing on this list is outstanding**; what M1 left genuinely open is the
engine evidence for the ask kinds, which is on the M2 follow-ups list.

- **closed** — `tools/check-redaction.mjs`: an opponent's library dumped as full
  cards now **fails** by default, with `--opponent-library-ok` as the explicit
  escape. Proved by mutating a fixture: exit 1 without the flag, exit 0 with it.
- **closed** — `tools/check-redaction.mjs` asserts per-kind `answer` shapes
  (`ANSWER_RULES`), including the two kinds with no null default. It now also
  asserts per-kind **`ask`** shapes and their declared nullability.
- **closed** — `tools/check-all.sh` step 6: the fresh re-record is normalised
  (`t`, `startedAt`, `gameId`) and diffed against `fixtures/games/g1.jsonl`.
- **closed** — the redacted stub's `zone` is non-null: `Snap.card()` falls back
  to the caller's hint and then to `"unknown"`.
- **closed** — `web/test/render.test.tsx` mounts `<Board/>` over every fixture
  under vitest, and `npm test` runs it after the node suite.
- **closed** — `fixtures/synthetic/sample-handwritten.jsonl` is regenerated from
  `tools/make-sample-fixture.mjs` with all eleven ask kinds, the five-key stub,
  `token` / `alt` / `library.cards`, and a session header carrying `transport`.

### M2 review pass, 2026-09-11 (what the reviewer found, and what closed it)

Ten findings against the first M2 build. Three majors and seven minors; the wire
changes are `docs/protocol.md`'s **M1–M7** amendment rows.

- **`notice` was an ungated string path.** `message(message, title)` wrote both
  arguments verbatim and `PlayerControllerHuman.notifyOfValue` passes
  `CardView.get(sa.getHostCard()).toString()` as the title, so five recordings
  carried `{"title":"Thriving Isle (49)"}` while card 49 was a hidden stub in the
  opponent's hand. `Snap.sweepText` now gates both strings, `WireGuiGame` caches
  the frame's concealed-id set on the game thread, and `check-redaction.mjs`
  **fails** on a hit (protocol §6).
- **`over` was emitted only from `finishGame`/`afterGameEnd`**, which Forge does
  not reliably call after a concede: two of four identical console runs wrote no
  `over` at all and still exited 0. The outcome capture is now the emitter, and
  the console quit path exits **2** when there is still no `over` (protocol §7).
- **Nine of the eleven ask kinds had never been dispatched by Forge.** The answer
  marshalling moved to `mtgtable.Ask` (no Forge types) and
  `mtgtable.AskSelfTest` drives every kind from real JSON in `bridge/build.sh`;
  two probe decks reach two of the nine for real —
  `decks/trample-probe.dck` → `assign_damage`, `decks/scry-probe.dck` →
  `input.focusCard` — and are committed as fixtures.
- Plus: gate 0 now covers a null `ZoneType` on the M2 card entry points;
  `NullTransport` delivers its null through `onAnswer` so its log has answers
  rather than looking like a wedge; `Transport.Inbound`'s thread contract says
  what the asserts actually enforce; three ask fields agree at both ends; and the
  run summary prints the game-thread / EDT split of every focus push.

### M2 verification pass, 2026-09-11 (an independent replay of the evidence)

A verifier rebuilt from scratch, ran six games and re-derived every number.
Nothing under `~/.forge` or `~/forge` changed; the gate passed; the redaction
audit found no leak. Seven findings, two of which were real defects and five of
which were the docs and the gate lagging the code. All closed:

- **major — `GameLog.close()` self-deadlocked against its own appender thread.**
  `close()` was `synchronized` and held the monitor across `thread.join(30s)`,
  while `drain()` needed that same monitor after every written line, so a line in
  flight meant the join **always** timed out and the file was truncated at
  whatever the appender had flushed (measured: `n=1 → close() = 30,000 ms`;
  `n=20000 → 12,089 of 20,001 lines`). It fired in 2 of the verifier's 6 real
  games — `total wall` exceeding `game wall` by exactly 30 s — and every
  `frames = N log line(s)` printed after it was wrong. The counter is an
  `AtomicLong`, the appender takes no lock, the join is outside the monitor, and
  a join that still times out **throws**. `mtgtable.GameLogSelfTest` (new, in
  `bridge/build.sh`) asserts close in under a second and exactly `N+1` lines;
  re-introducing either half of the defect makes it exit 1.
- **major — the protocol's clickability rule was falsified by M2's own
  recordings.** Closed as amendment **M8**; see `docs/protocol.md` §4/§4.1/§4.2,
  report 10 §0.0 item 6 and §18.3, `web/src/render/Board.tsx`, and the test in
  `web/test/human-seat.test.ts` that pins it to the corpus (328 of 345
  `clickCard` acts fall outside `input.selectable.cardIds`).
- **minor — `onResync()` disarmed the pre-input act guard** (the fix, and the
  test M3 owes it, are under M3 below).
- **minor — the "no thread of ours is named `Game*`" assert covered 2 of 7
  names.** All seven are constants now, `HeadlessGuiBase`'s static block checks
  the whole set against the stronger `mtg-table-` prefix, and
  `tools/lint-bridge.sh` **rule 6** greps every `new Thread(` under `bridge/src`
  for a name that resolves to one — which catches a thread that no run
  constructs.
- **minor — the gate never ran the console or auto transports.**
  `tools/check-all.sh` has two new steps: the documented console smoke (exit 0,
  exactly one `over`, `over` last) and one `--transport auto --seed 11` game (a
  seed no fixture uses; zero UNIMPL, zero emit errors). Both logs go through
  `check-redaction.mjs`, which now downgrades its two "this file proves nothing"
  assertions to **warnings** when every `state` in the file is `turn: 0` — the
  documented console command concedes before a card is dealt, so the repo's own
  gate used to reject the artifact the repo's own docs told you to make.
- **minor — two emitter defects.** A frame emitted before `openView` went on the
  wire with `seq: 0` (amendment **M9**): `GameLog` numbers and holds it until the
  session header instead. And `assignGenericAmount`'s fallback arm wrote
  `String.valueOf(t)` as an option label — unreachable today, but the exact shape
  of the leak amendment M1 closed — so it writes the class name, like its sibling
  in `assignCombatDamage`.
- **minor (no code) — the size of the unevidenced surface, stated where a reader
  will see it.** `docs/evidence/m2-console.md` §8 now says: across eleven
  recordings the engine has dispatched **three** of the eleven ask kinds.

## M2 — A full game against the AI, in the terminal

**Status: done**, with eight follow-ups open below and none of them blocking M3
(evidence: [`docs/evidence/m2-console.md`](docs/evidence/m2-console.md) — §11 is
the current status — plus the review pass and the independent verification pass
above).
**Effort: 2 evenings.**

**Command**

```bash
./bridge/run.sh mtgtable.MtgTable --transport console --seed 42
```

Type `?` at the prompt for the command list; `README.md`'s *Playing the console
game* is the same table in prose. The other two transports are the same seat
without a human in it — `--transport auto` plays a minimal legal game by itself
(D16) and `--transport null` answers every ask with `null` so the game runs on
Forge's own documented defaults. All three are in `tools/check-all.sh`.

**Deliverable.** The user beats (or loses to) the Forge AI with their own deck,
without a browser.

**What the evidence actually shows** (`docs/evidence/m2-console.md`, plus the two
passes below):

- **Games finish.** Four complete games to a terminal `over` in the first pass
  and more since, with **zero `UNIMPL`**, zero emit errors and zero dropped
  events. **22 of the 37** members have fired in a real game; the other 15 are
  implemented and never reached by a W/U deck at `setGamesPerMatch(1)`.
- **Redaction survives a human seat**, which is the first time it was tested at
  all: across the five committed human-seat fixtures there are **3,164 opponent
  hand cards** (1,638 in the three `human-auto-*` alone) and **every single one
  is the five-key stub** — `{controller, hidden, id, owner, zone}`, no other key
  set occurs. `check-redaction.mjs` passes all five. The review pass then closed
  the one string path that was not gated (`notice`).
- **Five committed fixtures now carry the frames an AI-vs-AI recording cannot
  produce** — `input`, `ask`, `answer`, `notice`, `over`, and a `transport` key
  in the session header: `human-auto-{42,7,2026}.jsonl` plus the two probe-deck
  recordings `human-trample-7.jsonl` (the `assign_damage` ask) and
  `human-scry-7.jsonl` (`input.focusCard`).
- **The gate runs the seat.** `tools/check-all.sh` was twelve steps and green at
  the end of M2 (it is **thirteen** now that M3 added the ws step), three of them
  fresh human-seat games (null, the scripted console smoke, and `auto` at a seed
  no fixture uses), each asserted to end in exactly one `over` as its last frame,
  each log put through `check-redaction.mjs`. Every JVM step is under a
  `timeout`.
- **`docs/protocol.md` needed no new shape for M2** — every body emitted already
  conformed to §2.2/§3/§4/§5. The nine amendments **M1–M9** it did gain are
  corrections the two review passes forced, not M2 discovering the spec was
  short.

Five decisions the build made are now written down: **D15** (the ask timeout is
a transport policy: infinite for the console, 30 s for `auto`/`null`), **D16**
(`AutoTransport` is the automated human and `NullTransport` overrides only its
answer half), **D17** (acts hop to the virtual EDT, answers arrive on
`mtg-table-io`, both asserted), **D18** (`isLibgdxPort()` stays `false`, so the
input path is the primary path) and **D19** (phase stops live in `WireGuiGame`'s
own map, seeded from the prefs and never saved).

`WireGuiGame` with all **37** abstract members present behind `Transport`, plus
`ReplyPool` and `ConsoleTransport`. This de-risks the whole threading model —
virtual EDT, latch-blocking vs value-returning calls, answering from a third
thread — with no WebSocket and no DOM. Every unimplemented member logs
`UNIMPL <name>` and returns a safe default rather than throwing, so a game
degrades instead of dead-ending and the log says which of the 37 actually fire for
a W/U deck.

### M2 follow-ups — four closed by M3, one partly, two open, one standing (2026-09-11)

M2 is **done**, not perfect. Everything below was carried from the builders' and
the verifiers' own "problems" notes; none of it blocked M3, and each line says
who should pick it up. Nothing here is a known leak — the redaction gate is
closed and tested — they are gaps in *evidence* and two small decisions left
standing. **M3 closed items 1, 5, 6 and 8**, moved the live half of item 2 onto
the M3 follow-ups list below, and left 3, 4 and 7 exactly where they were.

| # | what it was | status after M3 |
|---|---|---|
| 1 | the last `state` before `over` | **closed** — the emitter flushes it; amendment **M11** names the one path that cannot |
| 2 | ask kinds with no engine evidence | **partly** — was seven, now **six**; `ability_menu` and `assign_damage` are in the corpus |
| 3 | gate 0's `"unknown"` arm never observed | **open**, unchanged |
| 4 | M9's pre-header path is self-test-only | **open**, unchanged |
| 5 | the `transport` header key optional or mandatory | **closed** — it stays optional (**D26**) |
| 6 | report 07 §10 step 3 is wrong | **closed** — corrected in place, 2026-09-11 |
| 7 | `emitOver`'s wait loop was kept, not deleted | **standing** — still a decision, still kept |
| 8 | two transport tests belong to M3 | **closed** — `tools/ws-smoke.mjs` and check-all step 10 |

1. **closed — the last `state` before `over`.** Amendment
   **M4** says `over` is emitted "after the `state` that carries it", but today
   the emitter reaches `over` through `captureOutcome()` rather than through a
   final `flushState`, so `over` can arrive with no `gameOver` snapshot in front
   of it. The committed `fixtures/games/human-auto-42.jsonl` has 1,611 lines /
   227 `state` frames; today's build produces 1,610 / 226, and the missing one is
   exactly that final snapshot. It was proved to **predate** the verification
   pass (the same seed on a build with that pass's three `WireGuiGame` edits
   reverted produces the same 1,610). Either emit the final `state`
   unconditionally or soften M4's wording — and then re-record. See
   `docs/evidence/m2-console.md` §10.4.
   **Closed in M3, and the answer was both halves** (`docs/evidence/m3-ws.md`
   §6.1): `captureOutcome` now emits that final snapshot itself, on the game
   thread, when nothing else has — M4 as written — and amendment **M11** softens
   M4 for the one path where it provably cannot, a concede *before* the engine
   has asked this seat for anything, which `applyAct`'s pre-`inputSeen` guard
   ends on the EDT with no Forge outcome to snapshot. There `over` is
   `{winner: null, reason: null, matchOver: true}` with no `gameOver` `state` in
   front of it and the bridge prints `OVER WITHOUT A gameOver STATE` on stderr.
   **A client must not require the preceding snapshot**; the board's reducer
   never did, and its banner now says *"No result — the session ended before the
   engine published an outcome"* rather than "Draw." for that shape. The five
   human fixtures were re-recorded with the final snapshot present.
2. **partly closed — six of the eleven ask kinds still have no engine evidence**
   (was seven; **`ability_menu` closed it in M3's review pass**). The committed corpus now
   contains **four** — `choose_list`, `order`, `assign_damage` and `ability_menu`
   — and a fifth, `choose_entities`, fired in an uncommitted console session
   (`m2-console.md` §3.2). `assign_damage` no longer needs
   `decks/trample-probe.dck` to appear: the primary deck reaches it at seed 42
   now that a multi-ability card can be cast at all. `confirm`, `options`,
   `text`, `assign_amount`, `manipulate_list` and `sideboard` are implemented
   against report 07 §7, unit-tested by `mtgtable.AskSelfTest`, and shape-pinned
   by `ASK_SHAPES` plus the hand-written fixture — **none of which can prove the
   emitter**. Two of them are reveal surfaces and are already scheduled as M5's
   first move (the probe decks).
3. **Gate 0's `"unknown"` arm has never been observed at runtime.** `unzoned
   cards = 0` in every game run so far, so the null-`ZoneType` branch of
   `Snap`'s concealment gate is reasoned and reviewed, not measured. Reaching it
   needs an LKI view / `getCardForUi` / a `chooseCardsPile` header, and no
   committed deck produces one.
4. **Amendment M9's pre-header path is self-test-only.** `GameLogSelfTest`
   covers it deterministically, but no real run has emitted a frame before
   `openView`: `printf "q\n" | … --transport console` still delivers the concede
   after the seat exists. The bounded buffer and the empty-file-plus-stderr
   behaviour have no engine evidence.
5. **closed — the `transport` session-header key stays optional, deliberately.**
   `RecordMatch`
   does not write it, so an absent key means "an engine recording with no seat"
   and the six AI-vs-AI fixtures did not have to be regenerated. The cost is that
   the checker's A12 rule is conditional: a `null` answer to `order` or
   `choose_list` is a **warning** when the header says `transport: "null"` and a
   failure otherwise. Making the key mandatory means regenerating every fixture;
   that is the decision, and it is cheapest to take before M3 adds `"ws"`.
   **Taken in M3** (`docs/evidence/m3-ws.md` §7.2, now **D26**): it stays
   optional, `RecordMatch` stays untouched, and the six AI-vs-AI fixtures keep
   their bytes. A ws session's header says `transport: "ws"` like any other seat
   log, so nothing about M3 needed the key to be mandatory, and the price —
   regenerating six fixtures on a non-deterministic emitter to sharpen a rule
   that already catches its case — got worse with `ws`, not better.
6. **closed — `docs/research/07-wireguigame-spec.md` §10 step 3 was wrong.**
   It prescribed a null transport that answers only asks and
   expects a finished game; measured, that parks at the coin toss after five
   frames, because with `isLibgdxPort() == false` the seat is driven by the input
   path (D18). `NullTransport` therefore extends `AutoTransport`. The step now
   says so, in place, with a dated correction note, so the next reader does not
   rebuild the same dead end.
7. **standing — `emitOver`'s wait loop was kept, not deleted.** The verification
   pass considered removing it and did not; it is redundant with the outcome capture
   in the common path but still the thing that makes `finishGame` idempotent
   under a concede. Left as-is, named here so it is a decision rather than an
   oversight.
8. **closed — two transport tests belonged to M3, not here** — the
   `connect → resync → concede` case and a scripted `--transport ws` step in
   `check-all.sh`. **Both landed**: `tools/ws-smoke.mjs` (and its
   `--disconnect-mid-ask` variant) and check-all's step 10, which now runs
   **four** fresh ws servers (10a-10d).

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

**Status: done** — a review pass and a fix pass, all 21 findings closed, with
eleven follow-ups open below and none of them blocking M4 (evidence:
[`docs/evidence/m3-ws.md`](docs/evidence/m3-ws.md) — §14 is the current status —
and [`docs/evidence/m3-web.md`](docs/evidence/m3-web.md) §12, plus the two passes
below).
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

**What the evidence actually shows** (`docs/evidence/m3-ws.md` for the socket,
`m3-web.md` for the board, plus the two passes below):

- **`./scripts/play.sh` is the whole command.** check-forge → `bridge/build.sh` →
  the bridge in the background (`var/play/server.log`) → poll `GET /health` until
  it answers `200 ok` → vite, opening **`http://127.0.0.1:5173/?ws=1`**. Ctrl-C
  stops both halves, and so does the bridge exiting on its own after `over`.
  `/health` is the **session's** readiness, not the port's (**D21**): 503
  `starting` for the ~1.2 s between `bind` and `openView`, 200 after.
- **A game is played in a browser by clicking.** Real mouse clicks in Chrome
  carried a session from the coin toss to `over`: land drops, a creature cast
  through Forge's own `Pay Mana Cost` prompt with the OK button relabelled
  `Auto`, a discard chosen from `selectable`, a multi-ability card played through
  the `ability_menu` modal, `Escape` = Cancel (the `End Turn` label), Space = OK,
  and a two-click Concede that ended it (`m3-web.md` §2, §3, §10, §11).
  **9 of 10 card clicks in that session named an id the engine had not listed** —
  amendment **M8**, and the reason a board that gated clicks on `selectable`
  could not play a land.
- **A whole game unattended over the socket.** `tools/ws-auto-play.mjs` at seed
  42: 1,368 frames in, 236 out, 230 `state`, 226 acts, 8 asks all answered,
  36.4 s, exit 0; server side 22 player turns, 1,603 log lines, **zero
  `UNIMPL`**, zero emit errors, one `over` and `over` last. The gate runs the
  same client at seed 13 every time (step 10c): 1,318 frames, 183 acts, 3 asks,
  15 turns. The redaction gate runs on those socket recordings — **833 opponent
  hand cards in the gate's, every one the five-key stub**, engine strings swept,
  nothing joinable to a concealed card — and on the **client's** log too, in
  `--client-log` mode (amendment **M17**).
- **The socket's five behaviours are each measured** (`m3-ws.md` §4): connect →
  `resync` → concede; disconnect mid-decision → reconnect → the game is still
  there; `ping`/`pong`; a second client refused with one `notice` and close code
  **4001**; garbage in answered with a `notice` rather than a dropped socket.
- **The gate is thirteen steps** and step 10 runs **four** fresh ws servers on
  port 8643 (10a `ws-smoke`, 10b `ws-smoke --disconnect-mid-ask`, 10c a whole
  game through `ws-auto-play`, 10d `ws-auto-play --refuse-first-ask`, the only
  thing in the repo that exercises `ReplyPool.cancelAll()` with a game thread
  genuinely parked). Every JVM step is under `GAME_TIMEOUT`. Re-run for the
  documentation pass on 2026-09-11: **exit 0, 163.2 s**
  (`var/check-all-doc-pass.log`; `docs/evidence/m3-ws.md` §14).
- **The protocol grew twelve rows and no new `v`.** M10–M13 while the socket was
  written, M14–M19 in the review pass, M20–M21 in the fix pass. Only **M14** (the
  asynchronous `ability_menu`) changes what a recording contains; every M1/M2
  recording is still valid, and the five human-seat fixtures were re-recorded for
  M14 and M11.

**Three things the M2 verification pass left on M3's doorstep — all closed.**

1. **A transport test for connect → `resync` → `concede`,** asserting no
   exception and an `over` frame. `resync` is a first-class client frame
   (`docs/protocol.md` §2.4) and a browser that autoconnects will send one before
   Forge has asked this seat for anything; `WireGuiGame.onResync` used to arm
   `inputSeen` and disarm the guard that keeps a concede out of
   `Match.prepareAllZones`, where removing a player mid-iteration throws inside
   Forge's own setup. The guard is fixed (`engineInput` vs `mutateInput`); the
   test is what keeps it fixed.
2. **The board sends a click for any card, not only a selectable one**
   (amendment **M8**). `selectable` is the *explicit* selection set and is empty
   for the whole of your main phase — 78 of 86 `clickCard` acts in
   `human-auto-42.jsonl` name an id outside it. Forge judges the click; a
   rejected one comes back as `notice{title:"Not selectable"}`.
3. **`--transport ws` belongs in `tools/check-all.sh`** the way `null`,
   `console` and `auto` now are: a scripted session under the same
   `GAME_TIMEOUT`, exactly one `over`, `over` last, and its log through
   `check-redaction.mjs`.

**How the three were closed.** (1) `tools/ws-smoke.mjs` is that test — connect →
`resync` → concede, no exception, one `over`, `over` last — and it is gate step
**10a**; the guard it protects is measured in `m3-ws.md` §4.1. (2) The board
sends `act: clickCard` for **any** card and never gates on `selectable`: 78 of 86
clicks in the scripted socket game and 9 of 10 in the hand-played browser game
name an id outside it, and `web/test/ws-log.test.ts` pins the property to the
corpus. (3) Step 10 runs four fresh ws servers, each with those four assertions,
plus the **client** log through `check-redaction.mjs` in its own `--client-log`
mode (amendment **M17**).

**Three more that M2 handed over with the socket — all closed.**

4. **`WsTransport` owes an `askTimeoutMs` of its own** (**D15**). The console
   answers `0` — wait forever, because a human is thinking — and `auto`/`null`
   answer 30 s so a test fails fast. A socket is neither: the right cap is tied
   to the connection's liveness, not to a clock, and `cancelAll()` on disconnect
   is what unblocks the parked game threads. Deciding this by copying either
   existing value is the bug.
5. **It writes `transport: "ws"` into the session header** (amendment **M3**,
   §8.1), which is also the moment to settle M2 follow-up 5 — whether the key
   becomes mandatory and every fixture is regenerated.
6. **`Transport.Inbound`'s contract is the comment M3 is written against.** Not
   "called on `mtg-table-io`" but "never a game thread and never the EDT",
   asserted at the top of `onAct` and `onAnswer` (**D17**). Netty's event-loop
   thread satisfies it; a handler that hops to its own executor must still
   satisfy it.

**How those three were closed.** (4) **D24**: the ws ask timeout is **0 —
infinite — while a client is connected**, with a finite 120 s
`NO_CLIENT_ASK_TIMEOUT_MS` fallback only while nobody is on the socket, and
`cancelAll()` on disconnect as the thing that actually unblocks a parked game
thread. Neither existing value was copied; D15's "liveness, not a clock" is the
rule, and the ask is **re-delivered** on reconnect rather than spent on a §5.4
default (amendment **M19**). (5) `transport: "ws"` is in every ws session header,
and M2 follow-up 5 is settled the other way: the key **stays optional**
(**D26**). (6) `WsTransport` is the first transport with **no reader thread of
its own** — inbound frames are parsed and dispatched straight from netty's event
loop, named `mtg-table-ws`, which is neither a game thread nor the EDT, so every
`Transport.Inbound` assert stayed armed through every run (`m3-ws.md` §5). The
name is the eighth entry in `HeadlessGuiBase`'s static thread-name assert.

### M3 review pass — 2026-09-11, all findings closed

An independent verifier ran the gate, played the socket with three scripted
clients and one hand-written raw client, played a real game in Chrome, and read
the logs. Eleven findings; every one is closed, and each one that changed the
wire is in `docs/protocol.md`'s **M3 review pass** amendment table (M14–M19).

**The three that mattered.**

1. **A card with two or more playable abilities could not be played from any
   client, and the click was a silent no-op** — no `state`, no `input`, not even
   a `notice`. `getAbilityToPlay` is reached from inside a click, i.e. on the
   virtual EDT, where R2 forbids blocking, so it returned `null` while
   `selectCard` still returned `true`. The menu is now **asynchronous**
   (amendment **M14**): a normal `ability_menu` ask that no game thread is parked
   on, applied afterwards through `IGameController.selectAbility`. The kind had
   never been dispatched by the engine in any recording; re-recording the seat
   corpus produced **7** of them in `human-auto-42.jsonl` alone, each answered,
   each followed by Forge's own `Pay Mana Cost` prompt — and, because the policy
   can now cast a creature at all, the primary deck reaches **`assign_damage`**
   for the first time. That closes M2 follow-up 2 for two of its seven kinds.
2. **`GET /health` answered 200 about 1.2 s before `hello_ok` existed**, and a
   client that connected in that window got `input`, `notice`, `notice`,
   `hello_ok` — §2.1 inverted, and a readiness signal `scripts/play.sh` trusts
   that was not true. Amendment **M15**: 503 `starting` until the session exists,
   no resend to a socket that beats it, and `WS LISTENING` printed after
   `startMatch`.
3. **`npm --prefix web test` was not hermetic.** `web/test/ws-log.test.ts` globbed
   `var/` and asserted two properties of `ws-auto-play`'s *policy* as if they were
   properties of the protocol, so three leftover scratch directories turned a
   green suite red with nothing in the repo changed. The corpus is now given to it
   in `MTGTABLE_WS_LOGS` (check-all sets it to the logs step 10 just produced) and
   the committed fixtures otherwise; the answer-order rule is a **subsequence**,
   so an ask cancelled by `cancelAll()` at a disconnect is legal; and the M8 click
   assertion runs only on a dumb-human-policy transcript.

**The eight smaller ones.** `ReplyPool.cancelAll()` no longer latches the seat
shut after a socket drop, so an ask raised while nobody is connected parks up to
`NO_CLIENT_ASK_TIMEOUT_MS` and is re-delivered on reconnect instead of spending
the player's decision on a §5.4 default (amendment **M19**, measured). A client
`resync` is written to the frame log (**M16**). `Transport.Inbound.onResync`
asserts its two threads like its three siblings. `check-redaction.mjs` grew a
`--client-log` mode, auto-detected from a new `recordedBy` header key (**M17**),
and check-all now runs it over the client log it just wrote. Inbound websocket
frames are aggregated and size-capped explicitly, and a dropped frame comes back
as a `notice` instead of silence (**M18**). `scripts/play.sh` execs vite directly,
so Ctrl-C stops both halves instead of leaving a reparented dev server listening.
Every clickable card carries an `aria-label` naming the card rather than the act.
These four documents were brought up to date.

**One finding was stale rather than wrong.** The verifier reported that cards are
`<li>`s with no button role and are absent from the accessibility tree; in the
working tree they are real `<button>`s (`CardButton`), and `read_page
filter=interactive` on a live board lists all fourteen of them by id. What was
missing was the accessible *name* — the `title` explaining the act shadowed the
card — and that is what the `aria-label` fixes.

### M3 fix pass — 2026-09-11, a second verification, all ten findings closed

A second independent verifier re-ran the gate from a wiped `bridge/out`, drove
the socket on three seeds nobody had used, raced a client at a booting server,
sampled the live thread list, and played in Chrome. Three majors, seven minors,
all closed. The full write-ups are `docs/evidence/m3-ws.md` §13 and
`docs/evidence/m3-web.md` §11; the wire-level rows are amendments **M20** and
**M21**, and the two new decisions are **D22** and **D23** (which corrects D21's
scope).

**The three majors, and the shape they share:** two of them were *sentences this
repo had already written as guarantees* while the code kept only part of them.

1. **The pre-`hello_ok` window was open from the inbound side.** M15 closed the
   connect path and §2.1 claimed "both halves"; a c2s frame that *arrived* in the
   window was still answered, ahead of the handshake — `act` → `notice@1` then
   `hello_ok@2`, `resync` → `input@1` then `hello_ok@2`, the second being byte
   for byte the inversion M15's own row quotes as the bug. Reachable from this
   repo's own documented commands (both socket clients send `resync` from their
   `open` handler); only the `/health` poll in check-all and `play.sh` hid it.
   Now every inbound frame is dropped with **no reply** while no session exists
   (**M20**, **D23**), `resend()` carries the same guard, and the run summary
   counts the drops.
2. **The asynchronous `ability_menu` built its body on a second `Game-n` thread
   with nothing enforcing exclusion** — the javadoc's claim that the game thread
   is parked was true at submit time and unchecked at run time, on a per-click
   path, with silent `Tracker` corruption as the failure mode. The menu is now
   stamped with the input generation it was raised for and abandoned without
   walking anything if that generation moved (**D22**); it fires on none of the
   five re-recorded fixtures.
3. **§4.2's red "wedged game thread" banner fired on ordinary play** — twice in
   the first two turns of a real browser game, because its four clauses are also
   the ordinary state of not holding priority. It needs six (**M21**): and this
   seat holds priority, and no frame has arrived for 2.5 s. Measured over the
   corpus in `web/test/wedge.test.ts`: the old rule is true on 103–359 frames per
   recording and the worst gap to the next frame after any of them is **121 ms**,
   because Forge re-pushes every 250 ms while it thinks.

**The seven minors.** `ReplyPool.cancelAll()` with a genuinely parked ask is now in
the gate as step **10d** (`tools/ws-auto-play.mjs --refuse-first-ask`, asserting
the server's `cancelling 1 pending ask(s)`), which also makes M19's
`timeoutMs: 120000` measurement reproducible at seed 13 — the cap itself has
still never *fired*, and both the protocol row and the gate now say so.
`WsTransport.ask` recomputes its deadline at the point of parking, closing a
read-found race where a disconnect during body serialisation could park a thread
with no peer and no clock. `oob()`'s javadoc names all three seq-0 frames.
Space also matches `event.code === 'Space'`, so the binding is testable by a
driver that sets `code`. Concede disarms and disables itself after `over`.
Fixture drift was re-measured and the earlier reading corrected: **all five human
fixtures are stable in content and none is reliably stable in byte order** —
`human-auto-42` re-recorded identically once and differed twice in three runs, by
the `seq` assignment of the same three frames (identical multiset), and
`human-trample-7` differs by two of Forge's own `awaitNextInput` re-pushes and
nothing else. A byte-level drift step over these files would therefore be flaky
and is **not** added; an order-insensitive one is the shape a future attempt
should take (§13.5).

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

### M3 follow-ups — open, 2026-09-11

M3 is **done**, not perfect. Every line below is carried verbatim from the two
builders' and the two verifiers' own "problems" notes, and none of it blocks M4.
Nothing here is a known leak: the redaction gate now runs over a socket
recording and a client log as well as the fixtures. They are gaps in *evidence*,
two races that are shrunk rather than eliminated, and a handful of decisions
worth re-reading when their assumptions change.

1. **`NO_CLIENT_ASK_TIMEOUT_MS` (120 s) has never fired.** Step 10d now shows the
   cap being *set* on the wire (`timeoutMs: 120000`, seed 13, 7 ms after a drop),
   which is the half M19 cites; whether a disconnected window actually catches an
   `ask` is **seed-dependent** — at seed 17 the next ask arrives after the
   reconnect with `timeoutMs: 0` — so the gate reports that half instead of
   asserting it. If a deck or seed change stops producing it the gate stays green
   and only the `note:` line changes. The cap firing, and the §5.4 default it
   would spend, are still unmeasured.
2. **D22 shrinks the `ability_menu` race; it does not mathematically eliminate
   it.** A generation could still move between the check and the first field
   read. The argument that this is safe rests on Forge's `stop()` ordering
   (`onStop()` → `clearWeaklySelectable` → our `engineInput` bump, all before
   `cdlDone.countDown()`), which is read from the **2.0.15** forge-src as prose
   and is not a signature `javap` can confirm against the 2.0.14 jar. D22 says so
   rather than claiming the race is gone. If M5 makes asynchronous asks common,
   this is the first thing to revisit.
3. **The asynchronous `ability_menu` is not re-delivered by `resync`, and a stale
   answer is applied blind.** It never enters `ReplyPool`, so `WsTransport.resend`
   does not know about it; it self-heals, because Forge's input is still the one
   that asked and the client clicks the card again (protocol §5.3, **D20**). And
   if the player answers one long after the engine moved on,
   `applyAsyncAbilityMenu` still calls `IGameController.selectAbility` — Forge's
   own input has moved, so the call lands on an input that no longer wants it. A
   second outstanding-ask registry on the `Transport` interface for one kind was
   judged too much for M3; that judgement is what M5 should re-take.
4. **Six of the eleven ask kinds still have no engine evidence** — `confirm`,
   `options`, `text`, `assign_amount`, `manipulate_list`, `sideboard`. They are
   implemented against report 07 §7, unit-tested by `mtgtable.AskSelfTest`,
   shape-pinned by `ASK_SHAPES`, rendered by `AskModal.tsx` and mounted by
   `web/test/ask-modal.test.tsx` — **none of which can prove the emitter**. This
   is M2 follow-up 2, now one kind shorter, and **M5's first move** is the two
   probe decks for the two that are reveal surfaces.
5. **Amendment M11's exception path has never been observed.** `over` with no
   `gameOver` `state` in front of it needs a concede *before* the engine has asked
   this seat for anything; `grep -rl 'OVER WITHOUT A gameOver STATE' var/` finds
   **nothing** across every run on disk, because `ws-smoke`'s concede lands after
   the first `input` (it ends `winner=1 reason=AllOpponentsLost`). The client
   handles the shape and a test pins the banner, but the emitter's branch is
   reasoned, not measured. A gate step that concedes from the `open` handler
   before any `input` would close it.
6. **Amendment M10's `seq: 0` reservation is true by construction, not by an
   assertion.** On the bridge it holds because one private helper
   (`WsTransport.oob`) is the only thing that writes `"seq":0`, and it has three
   callers — `pong`, the refusal `notice`, the dropped-frame `notice`; nothing
   checks that a fourth is not added. On the client `seq` is type-checked and
   otherwise ignored. The same amendment makes the cached frames' re-delivery
   **verbatim** (same `seq`, same `t`, no new log line; the `input` half is a real
   re-emission and the client's `resync` *is* logged — **D27**, amendment M16), so
   a mid-stream `resync` hands back a `seq` *lower* than the frame before it and a
   client connecting mid-game sees a forward gap. Neither is a dropped frame; only
   `check-redaction.mjs --client-log` (M17) knows the difference, and it knows it
   from a header key rather than from the frames. Every gate run says so out loud:
   *"a CLIENT log's series is neither contiguous … nor monotonic … In a
   server-side `var/games/` log the same shape IS a dropped frame."*
7. **Fixture drift has no gate step, deliberately.** All five human-seat fixtures
   are stable in *content* and none is reliably stable in *byte order* — measured
   at 2 of 3 runs differing for `human-auto-42`, by the `seq` assignment of the
   same three frames. A byte-level normalised diff would therefore be flaky. The
   sound shape is **order-insensitive**: the multiset of frames with `seq`
   stripped. Nobody has written it; the harness used for the measurement is kept
   at `var/verify/m3fix-rerecord.sh` (`m3-ws.md` §13.5).
8. **`--refuse-first-ask` lives in `tools/ws-auto-play.mjs`, not `ws-smoke.mjs`.**
   The fix text said otherwise. Reaching an `ask` at all needs a client that can
   play a game, and a second copy of the dumb-human policy in `ws-smoke` could
   drift from `AutoTransport`'s — the one thing `ws-auto-play`'s own header says
   must not happen. `ws-smoke.mjs` is unchanged; the gate's step 10d runs
   `ws-auto-play`. Named here so it is a decision and not a discrepancy.
9. **Space = OK is proved by a synthetic `KeyboardEvent`, not by a finger.** The
   browser driver used for the evidence delivers Space as
   `{key: "", code: "", keyCode: 0}`, so the handler now also matches
   `event.code === 'Space'` and the binding was verified by dispatching exactly
   what the driver delivers. Escape = Cancel *was* a real key press. One human
   press of the space bar closes this.
10. **Two socket properties are closed by construction rather than by a test.**
    The second-client refusal is decided on netty's event loop, which serialises
    it, and nothing has tried to open two sockets in the same millisecond; and the
    1 MB `HttpObjectAggregator` bounds only the **handshake** — websocket frames
    are not aggregated by it, and `WebSocketServerProtocolHandler`'s own
    `maxFrameSize` is left at netty's default while a `state` frame already runs
    to ~30 kB.
11. **Two M2 follow-ups are untouched and still open here**: gate 0's `"unknown"`
    (null-`ZoneType`) arm has never been observed at runtime, and amendment M9's
    pre-header buffer is still self-test-only. Both need an engine shape no
    committed deck produces.

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

**What M3 hands to M4: the board is already interactive, so M4 is layout and
art.** Nothing on this list needs to be built again, and re-deriving any of it is
how a rule that took two verification passes to get right gets lost:

- **The affordances exist.** Cards and player names are real `<button>`s with an
  `aria-label` naming the card (the `title` carries the act), the two engine
  buttons are wired to `buttonOk` / `buttonCancel`, Concede is a two-click button
  reachable from every state, `Space` / `Escape` are bound, and `AskModal.tsx`
  renders **all eleven** ask kinds. M4 restyles these; it does not re-invent them.
- **The `actions` prop is the seam.** `<Board actions={…}/>` is `null` in replay
  mode and non-null in ws mode, which is the whole of the difference between the
  two — `web/test/render.test.tsx` asserts the replay board still renders
  **Read-only** over the fixture corpus, and that assertion must survive M4.
- **Never gate a click on `selectable`** (amendment **M8**). Outline what the
  engine named; send the click for anything the player presses. 78 of 86 acts in
  the scripted game and 9 of 10 in the hand-played one are outside the set.
- **Render `buttons.*.label` verbatim.** `Auto`, `Undo (2)`, `End Turn` and
  `Play` are Forge's own strings, and half of M6 is already on the wire because
  of them (report 11). A relabelled button throws the engine's answer away.
- **The stall banner's rule is `web/src/render/wedge.ts`,** six clauses after
  amendment **M21** (including "this seat holds priority" and "no s2c frame for
  2.5 s"). Import it; do not re-derive it from §4.2's prose.
- **Art is already fetched.** `node tools/fetch-art.ts` exists and writes
  `web/public/art.json` (gitignored, ~28 cards, Scryfall URLs plus `artist` and
  `copyright` for the credit line); `web/src/art.ts` and `useArt()` already read
  it and the board already reports its misses. What M4 adds is the *image* on the
  card tile and the fallback text frame — hot-linked, per open question 5.
- **Two shapes the layout must not assume away**: an `over` with no `gameOver`
  `state` in front of it (**M11**), and a `seq` that can arrive lower than the
  frame before it after a `resync` (**M10**). The reducer already tolerates both;
  a component that counts frames or trusts `seq` for ordering would not.

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

**Start with two probe decks, before any UI.** The committed corpus contains
**three** of the eleven ask kinds — `choose_list`, `order` and `assign_damage`,
the last only because `decks/trample-probe.dck` was built to force it — plus
`choose_entities` in an uncommitted console session
(`docs/evidence/m2-console.md` §3.2, §8, §11). The two worth forcing next are the
largest *reveal* surfaces, where being wrong is a leak and not a dead end: a deck
that forces `choose_entities` **with a `delayedReveal`** (a library search) and
one that forces `manipulate_list`. Same move as `trample-probe` and `scry-probe`:
a deck, a recording committed as a fixture, and the checker run over it. Until
then those two kinds are evidenced by `AskSelfTest` and a fixture we wrote
ourselves, which cannot prove the *emitter* is right.

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
